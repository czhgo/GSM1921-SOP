// role: [工程师]+[AI]
// branch-doc.js — 支部文件增强服务（E 批立项⑧：制度文本 = 支部文件的一种用途）
// 能力：版本化（上传新版=旧版归档可查）、现行/停用态、网页内读正文（安全 md→html 渲染）。
// 纯 ESM、无 DOM：正文渲染/版本迁移/状态迁移/权限判定等纯逻辑在此，DOM 与文件上传由
// modules/references.js 负责（references.js 同款 adapter 调法：getAdapter().branchDocs）。
//   - mock 形态：create/update/list → 整库 localStorage 持久（沿用既有持久键）
//   - api 形态：读侧兼容（缺省字段视为普通文件）；写增强（新字段/版本语义落 server 表）登记二期
// 纪律：新建「制度文本」条目仅书记（含副书记）可操作；普通文件写权限维持现状（支委可写，
// 由 UI 现状门控，本服务对 doc 类不做额外收紧）。不触碰 content / 禁改清单。

import { getAdapter } from '../core/data-adapter.js?v=20260909e';

/** 制度文本管理角色（书记/副书记）——与既有写权限门一致做法：UI 与 service 双重校验 */
export const INSTITUTION_MANAGER_ROLES = ['secretary', 'deputy-secretary'];

/** 判断角色是否为制度文本管理者（书记含副书记） */
export function isInstitutionManager(role) {
  return INSTITUTION_MANAGER_ROLES.includes(role);
}

/** 用途归一：旧数据（无 purpose）视为普通文件（doc），全兼容 */
function _purposeOf(doc) {
  return doc && doc.purpose === 'institution' ? 'institution' : 'doc';
}

async function _getDoc(id) {
  const list = await getAdapter().branchDocs.list();
  return list.find((d) => d.id === id) || null;
}

/**
 * 写入支部文件（新建 / 编辑普通文件）
 * @param {Object} opts
 * @param {string} [opts.id]       存在 = 编辑（仅普通文件；制度文本编辑请走 publishNewVersion）
 * @param {'doc'|'institution'} [opts.purpose] 用途：普通文件 / 制度文本（旧数据缺省=doc）
 * @param {string} opts.title      标题
 * @param {string} [opts.desc]     描述
 * @param {string} [opts.bodyText] 网页正文（制度类推荐：文本/Markdown）
 * @param {string} [opts.note]     版本说明（可选）
 * @param {string} [opts.fileName] 附件文件名（doc 新建沿用 UI 必填校验现状；institution 可不上传附件）
 * @param {string} [opts.by]       操作人 personId
 * @param {string} [opts.role]     操作人角色（新建 institution 仅书记，service 双重校验）
 * @returns {Promise<{ok:boolean, doc?:Object, reason?:string}>}
 */
export async function saveDoc(opts = {}) {
  const { id, purpose, title = '', desc = '', bodyText, note = '', by, role } = opts;
  const docPurpose = purpose === 'institution' ? 'institution' : 'doc';
  try {
    if (id) {
      // 编辑既有条目：普通文件保留现状能力（title/desc/可选替换附件）
      const cur = await _getDoc(id);
      if (!cur) return { ok: false, reason: '支部文件不存在或已删除' };
      if (_purposeOf(cur) === 'institution') {
        // 制度文本不做普通编辑：正文/标题迭代一律走「上传新版」（版本语义唯一入口）
        return { ok: false, reason: '制度文本请使用「上传新版」维护版本' };
      }
      const patch = { title, desc: desc || '' };
      const hasNewFile = opts.fileName && (opts.filePath || opts.fileData);
      if (hasNewFile) {
        patch.fileName = opts.fileName;
        if (opts.fileSize !== undefined) patch.fileSize = opts.fileSize;
        if (opts.format) patch.format = opts.format;
        patch.filePath = opts.filePath || null;
        patch.fileData = opts.fileData || null;
      }
      const updated = await getAdapter().branchDocs.update(id, patch);
      return { ok: true, doc: updated };
    }
    if (docPurpose === 'institution') {
      // 新建制度文本 = 现行版 v1（网页发布即权威；仅书记/副书记）
      if (!isInstitutionManager(role)) {
        return { ok: false, reason: '制度文本仅限书记（含副书记）发布' };
      }
      const now = new Date().toISOString();
      const created = await getAdapter().branchDocs.create({
        purpose: 'institution',
        status: 'current',           // 现行
        version: 1,                  // 现行版 v1
        title: title || '未命名制度',
        desc: desc || '',
        bodyText: bodyText || '',
        versions: [],                // 历史版本链（不含自身；自身即当前记录）
        fileName: opts.fileName || null,
        cat: 'institution',
        uploadedBy: by || null,
        uploadedAt: now,
        // 当前版本发布元数据（listVersions 合并视图用；v1 即创建动作）
        versionBy: by || null,
        versionAt: now,
        versionNote: note || '',
      });
      return { ok: true, doc: created };
    }
    // 新建普通文件：维持既有文件语义（status draft=会前草案，资料查询现状不变）
    const created = await getAdapter().branchDocs.create({
      purpose: 'doc',
      title,
      desc: desc || '',
      cat: 'party-doc',
      status: 'draft',
      fileName: opts.fileName || null,
      fileSize: opts.fileSize,
      format: opts.format,
      filePath: opts.filePath || null,
      fileData: opts.fileData || null,
      uploadedBy: by || null,
    });
    return { ok: true, doc: created };
  } catch (e) {
    return { ok: false, reason: (e && e.message) ? e.message : '保存失败' };
  }
}

/**
 * 上传新版：仅书记/副书记，且条目为制度文本且现行（status=current）。
 * 现条目（v{n}）归档入 versions（status:'superseded'，含版本号/标题/正文/说明/操作人/时间），
 * 条目更新为 v{n+1}、status:'current'，versions 保留累计历史。
 * @param {Object} opts { id, title?, bodyText, note?, by, role }
 * @returns {Promise<{ok:boolean, doc?:Object, reason?:string}>}
 */
export async function publishNewVersion(opts = {}) {
  const { id, title, bodyText, note = '', by, role } = opts;
  try {
    if (!isInstitutionManager(role)) {
      return { ok: false, reason: '上传新版仅限书记（含副书记）操作' };
    }
    const cur = await _getDoc(id);
    if (!cur) return { ok: false, reason: '支部文件不存在或已删除' };
    if (_purposeOf(cur) !== 'institution') {
      return { ok: false, reason: '仅制度文本支持发布新版本' };
    }
    if (cur.status !== 'current') {
      return {
        ok: false,
        reason: cur.status === 'disabled'
          ? '制度已停用，请先「重新启用」再发布新版'
          : '仅现行制度可发布新版本',
      };
    }
    const now = new Date().toISOString();
    // 归档旧版：入历史（保留该版自身的发布说明/操作人/时间）
    const historyEntry = {
      version: cur.version || 1,
      title: cur.title || '',
      bodyText: cur.bodyText || '',
      status: 'superseded',
      note: cur.versionNote || '',
      by: cur.versionBy || cur.uploadedBy || '',
      at: cur.versionAt || cur.uploadedAt || now,
    };
    const next = {
      title: (title !== undefined && String(title).trim()) ? String(title).trim() : cur.title,
      bodyText: bodyText === undefined ? cur.bodyText : String(bodyText),
      version: (cur.version || 1) + 1,
      status: 'current',
      versions: [...(Array.isArray(cur.versions) ? cur.versions : []), historyEntry],
      versionNote: note || '',
      versionBy: by || '',
      versionAt: now,
      updatedAt: now,
    };
    const updated = await getAdapter().branchDocs.update(id, next);
    return { ok: true, doc: updated };
  } catch (e) {
    return { ok: false, reason: (e && e.message) ? e.message : '发布新版失败' };
  }
}

/**
 * 停用 / 重新启用：仅书记/副书记且制度文本；历史版本列表（versions）不改。
 * current→disabled 停用；disabled→current 重新启用。
 * @param {Object} opts { id, status:'current'|'disabled', by, role }
 * @returns {Promise<{ok:boolean, doc?:Object, changed?:boolean, reason?:string}>}
 */
export async function setDocStatus(opts = {}) {
  const { id, status, by, role } = opts;
  try {
    if (!isInstitutionManager(role)) {
      return { ok: false, reason: '停用/重新启用仅限书记（含副书记）操作' };
    }
    if (status !== 'current' && status !== 'disabled') {
      return { ok: false, reason: '非法状态：仅支持 current（现行）/ disabled（停用）' };
    }
    const cur = await _getDoc(id);
    if (!cur) return { ok: false, reason: '支部文件不存在或已删除' };
    if (_purposeOf(cur) !== 'institution') {
      return { ok: false, reason: '仅制度文本可停用/重新启用' };
    }
    if (cur.status === status) return { ok: true, doc: cur, changed: false };
    const updated = await getAdapter().branchDocs.update(id, {
      status,
      updatedAt: new Date().toISOString(),
    });
    return { ok: true, doc: updated, changed: true };
  } catch (e) {
    return { ok: false, reason: (e && e.message) ? e.message : '操作失败' };
  }
}

/**
 * 读支部文件列表（含 versions 累计历史），按 updatedAt/uploadedAt 倒序。
 * 旧数据（无 purpose/versions）视为普通文件，完全兼容不报错。
 * @param {Object} [filter]
 * @param {boolean} [filter.onlyInstitution] 只看制度文本
 * @param {string} [filter.status] 状态过滤（current/disabled；doc 类可为 draft/archived）
 * @returns {Promise<Object[]>}
 */
export async function listDocs(filter = {}) {
  const { onlyInstitution = false, status } = filter;
  const rows = await getAdapter().branchDocs.list();
  let list = rows.filter((d) => {
    const purpose = _purposeOf(d);
    if (onlyInstitution && purpose !== 'institution') return false;
    // 顶层不驻留 superseded（该值只出现在 versions 历史中；防御脏数据）
    if (purpose === 'institution' && d.status === 'superseded') return false;
    if (status && d.status !== status) return false;
    return true;
  });
  return list.sort((a, b) =>
    String(b.updatedAt || b.uploadedAt || '').localeCompare(String(a.updatedAt || a.uploadedAt || '')));
}

/**
 * 单条目只读版本视图（条目自身 + versions 历史合并，按版本号升序；含 by/at/note 全量）。
 * @param {Object} doc 已读出的支部文件条目
 * @returns {Array<{version:number, title:string, bodyText:string, status:string, note:string, by:string, at:string}>}
 */
export function buildDocVersionsView(doc) {
  if (!doc) return [];
  const history = Array.isArray(doc.versions) ? doc.versions.map((h) => ({ ...h })) : [];
  const currentView = {
    version: doc.version || 1,
    title: doc.title || '',
    bodyText: doc.bodyText || '',
    status: _purposeOf(doc) === 'institution'
      ? (doc.status === 'disabled' ? 'disabled' : 'current')
      : (doc.status || 'current'),
    note: doc.versionNote || '',
    by: doc.versionBy || doc.uploadedBy || '',
    at: doc.versionAt || doc.uploadedAt || '',
  };
  return [...history, currentView].sort((a, b) => (a.version || 0) - (b.version || 0));
}

/**
 * 版本列表（含发布说明/操作人/时间），按版本号升序返回只读视图。
 * @param {string} id
 * @returns {Promise<Array<{version:number, title:string, bodyText:string, status:string, note:string, by:string, at:string}>>}
 */
export async function listVersions(id) {
  const doc = await _getDoc(id);
  return buildDocVersionsView(doc);
}

// ═══════════════ 网页正文安全渲染（Markdown 子集）═══════════════
// 安全原则：先整体 HTML 转义、再按子集替换；全程不产出任何属性/href/事件，
// <script>/on*/javascript: 等在转义后仅为普通文本，绝不执行。不引入第三方依赖。

/** 正文渲染长度上限（字） */
export const BODY_MAX_LEN = 20000;

/** HTML 转义（与 references.js 既有 _esc 同语义，纯函数内自持） */
function _esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * 将制度正文（文本 / Markdown 子集）安全渲染为 HTML 字符串。
 * 支持子集：#/##/### 标题、**加粗**、- 无序列表、1. 有序列表、`行内代码`、
 * ``` 代码块、段落（空行分隔）；不支持的写法一律按纯文本输出（不解释为链接/标签）。
 * @param {string} mdText 正文原文；非 string 返回 ''
 * @returns {string} 渲染后的 HTML（安全：先整体转义，禁止 raw HTML 执行）
 */
export function renderDocBody(mdText) {
  if (typeof mdText !== 'string') return '';
  // 去除占位符风险字符（\u0000 仅内部占位用）与 \r，统一 \n
  let src = mdText.replace(/\u0000/g, '').replace(/\r\n?/g, '\n');
  const truncated = src.length > BODY_MAX_LEN;
  if (truncated) src = src.slice(0, BODY_MAX_LEN);
  // ① 整体 HTML 转义：任何原始标签（<script>、on*=…）都不再具有可执行形态
  const esc = _esc(src);
  const html = [];
  const saved = []; // 行内代码占位（防 ** 等误伤代码内容）
  const stash = (h) => { saved.push(h); return `\u0000${saved.length - 1}\u0000`; };
  const inline = (s) => {
    let out = s.replace(/`([^`\n]+)`/g, (m, c) => stash(`<code>${c}</code>`));
    out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    return out.replace(/\u0000(\d+)\u0000/g, (m, i) => saved[Number(i)]);
  };
  const lines = esc.split('\n');
  let codeMode = false; // 代码块内：原样输出（已转义），不做行内解释
  let listTag = null;   // 'ul' | 'ol' | null
  const para = [];
  const closeList = () => { if (listTag) { html.push(`</${listTag}>`); listTag = null; } };
  const flushPara = () => {
    if (para.length) { html.push(`<p>${inline(para.join(' '))}</p>`); para.length = 0; }
  };
  const pushList = (tag, li) => {
    flushPara();
    if (listTag !== tag) { closeList(); html.push(`<${tag}>`); listTag = tag; }
    html.push(`<li>${inline(li)}</li>`);
  };
  for (const line of lines) {
    if (codeMode) {
      const t = line.trim();
      if (t === '```') { codeMode = false; html.push('</code></pre>'); }
      else html.push(line, '\n'); // 代码块内容逐字保留（已整体转义）
      continue;
    }
    const t = line.trim();
    if (t === '```') {
      // 进入代码块（先收拢前序段落/列表）
      flushPara(); closeList();
      codeMode = true;
      html.push('<pre><code>');
      continue;
    }
    if (t === '') { flushPara(); closeList(); continue; }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) { closeList(); flushPara(); const lv = heading[1].length; html.push(`<h${lv}>${inline(heading[2])}</h${lv}>`); continue; }
    const ulItem = /^[-*]\s+(.*)$/.exec(line);
    if (ulItem) { pushList('ul', ulItem[1]); continue; }
    const olItem = /^\d+\.\s+(.*)$/.exec(line);
    if (olItem) { pushList('ol', olItem[1]); continue; }
    // 普通段落行（连续行并入同一段，软换行以空格衔接）
    flushPara();
    para.push(line);
  }
  flushPara();
  closeList();
  if (codeMode) html.push('</code></pre>'); // 未闭合围栏容错兜底
  let out = html.join('');
  if (truncated) out += '<p style="color:#B45309;font-size:0.75rem;margin-top:0.5rem;">（正文过长，仅显示前 20000 字）</p>';
  return out;
}
