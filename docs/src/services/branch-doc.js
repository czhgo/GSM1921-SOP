// role: [工程师]+[AI]
// branch-doc.js — 支部文件增强服务（E 批立项⑧：制度文本 = 支部文件的一种用途）
// 能力：版本化（上传新版=旧版归档可查）、现行/停用态、网页内读正文（安全 md→html 渲染）。
// 纯 ESM、无 DOM：正文渲染/版本迁移/状态迁移/权限判定等纯逻辑在此，DOM 与文件上传由
// modules/references.js 负责（references.js 同款 adapter 调法：getAdapter().branchDocs）。
//   - mock 形态：create/update/list → 整库 localStorage 持久（沿用既有持久键）
//   - api 形态：读侧兼容（缺省字段视为普通文件）；写增强（新字段/版本语义落 server 表）登记二期
// 纪律：新建「制度文本」条目仅支书（含副支书）可操作；普通文件写权限维持现状（支委可写，
// 由 UI 现状门控，本服务对 doc 类不做额外收紧）。不触碰 content / 禁改清单。

import { getAdapter } from '../core/data-adapter.js?v=20260921m';
// 支部归属判定收敛点（读侧隔离用；设计 §2.5「一个支部一片存储空间、按 branchId 分区、跨支部不可见」）
import { getBoundBranch } from './branch.js?v=20260921m';

/** 制度文本管理角色（支书/副支书）——与既有写权限门一致做法：UI 与 service 双重校验 */
export const INSTITUTION_MANAGER_ROLES = ['secretary', 'deputy-secretary'];

/** 判断角色是否为制度文本管理者（支书含副支书） */
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
 * 当前登录人 personId（登录快照；node/未登录/异常 → null）。
 * 与 branch.js._actorId / auth LOGIN_KEY 同键（跨模块约定，避免 import auth 循环依赖）。
 */
function _currentPersonId() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem('gsm1921-login-user');
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d.personId || d.userId || d.id || null;
  } catch (_) { return null; }
}

/**
 * 生效支部 id：以 getBoundBranch 判定有效归属支部（无归属/党委级 party-staff → null）。
 * null = 无支部语境（未登录 / party-staff / 档案缺 branchId）→ 读侧保持既有行为不过滤。
 */
function _boundBranchId(personId) {
  return getBoundBranch(personId)?.id || null;
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
 * @param {string} [opts.role]     操作人角色（新建 institution 仅支书，service 双重校验）
 * @param {boolean} [opts.asDraft] 仅制度文本：true = 落为**草案态**（待支委会审议，**不是现行版**）；
 *   缺省 false = 现状（建即现行版），见文件末「制度链」段
 * @returns {Promise<{ok:boolean, doc?:Object, reason?:string}>}
 */
export async function saveDoc(opts = {}) {
  const { id, purpose, title = '', desc = '', bodyText, note = '', by, role, asDraft = false } = opts;
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
      // 新建制度文本（仅支书/副支书）：缺省 = 现行版 v1（网页发布即权威）；
      // asDraft = 制度草案（status:'draft'，待支委会审议——未审议通过前不是现行版），见文件末「制度链」段
      if (!isInstitutionManager(role)) {
        return { ok: false, reason: '制度文本仅限支书（含副支书）发布' };
      }
      const now = new Date().toISOString();
      // 写侧归属标注（最小守卫，不改 schema）：落当前归属支部 id；无归属/党委语境不写（读侧按 br-b1 兼容）
      const instBranchId = _boundBranchId(by);
      const created = await getAdapter().branchDocs.create({
        purpose: 'institution',
        status: asDraft ? INSTITUTION_DRAFT : 'current', // 草案（待支委会审议）/ 现行
        version: 1,                  // v1（草案通过后仍为 v1：审议通过即发布）
        title: title || '未命名制度',
        desc: desc || '',
        bodyText: bodyText || '',
        versions: [],                // 历史版本链（不含自身；自身即当前记录）
        fileName: opts.fileName || null,
        cat: 'institution',
        uploadedBy: by || null,
        uploadedAt: now,
        ...(instBranchId ? { branchId: instBranchId } : {}),
        // 当前版本发布元数据（listVersions 合并视图用；v1 即创建动作）
        versionBy: by || null,
        versionAt: now,
        versionNote: note || '',
      });
      return { ok: true, doc: created };
    }
    // 新建普通文件：维持既有文件语义（status draft=会前草案，资料查询现状不变）
    const docBranchId = _boundBranchId(by);
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
      ...(docBranchId ? { branchId: docBranchId } : {}),
    });
    return { ok: true, doc: created };
  } catch (e) {
    return { ok: false, reason: (e && e.message) ? e.message : '保存失败' };
  }
}

/**
 * 上传新版：仅支书/副支书，且条目为制度文本且现行（status=current）。
 * 现条目（v{n}）归档入 versions（status:'superseded'，含版本号/标题/正文/说明/操作人/时间），
 * 条目更新为 v{n+1}、status:'current'，versions 保留累计历史。
 * @param {Object} opts { id, title?, bodyText, note?, by, role }
 * @returns {Promise<{ok:boolean, doc?:Object, reason?:string}>}
 */
export async function publishNewVersion(opts = {}) {
  const { id, title, bodyText, note = '', by, role } = opts;
  try {
    if (!isInstitutionManager(role)) {
      return { ok: false, reason: '上传新版仅限支书（含副支书）操作' };
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
 * 停用 / 重新启用：仅支书/副支书且制度文本；历史版本列表（versions）不改。
 * current→disabled 停用；disabled→current 重新启用。
 * @param {Object} opts { id, status:'current'|'disabled', by, role }
 * @returns {Promise<{ok:boolean, doc?:Object, changed?:boolean, reason?:string}>}
 */
export async function setDocStatus(opts = {}) {
  const { id, status, by, role } = opts;
  try {
    if (!isInstitutionManager(role)) {
      return { ok: false, reason: '停用/重新启用仅限支书（含副支书）操作' };
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
 * 支部隔离（读侧，设计 §2.5：一个支部一片存储空间、按 branchId 分区、跨支部不可见）：
 *   按当前归属支部（getBoundBranch）过滤；无归属/党委语境（未登录 / party-staff / 档案缺 branchId）
 *   → 保持既有行为（不过滤，可见全部）；老数据无 branchId 视为 br-b1（与 branch.js `withinBranch` 同口径）。
 * @param {Object} [filter]
 * @param {boolean} [filter.onlyInstitution] 只看制度文本
 * @param {string} [filter.status] 状态过滤（current/disabled；doc 类可为 draft/archived）
 * @param {string|null} [filter.personId] 归属判定人（缺省 = 登录快照；显式 null = 无支部语境不过滤）
 * @returns {Promise<Object[]>}
 */
export async function listDocs(filter = {}) {
  const { onlyInstitution = false, status, personId } = filter;
  const rows = await getAdapter().branchDocs.list();
  const actorId = personId !== undefined ? personId : _currentPersonId();
  const boundBranchId = _boundBranchId(actorId); // null = 无归属/党委语境 → 不过滤
  let list = rows.filter((d) => {
    const purpose = _purposeOf(d);
    if (onlyInstitution && purpose !== 'institution') return false;
    // 顶层不驻留 superseded（该值只出现在 versions 历史中；防御脏数据）
    if (purpose === 'institution' && d.status === 'superseded') return false;
    if (status && d.status !== status) return false;
    // 支部隔离：仅已归属者过滤；老数据无 branchId 归 br-b1（惰性维度迁移兼容）
    if (boundBranchId && (d.branchId || 'br-b1') !== boundBranchId) return false;
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

// ═══════════════ 制度链：草案 → 支委会审议 → 通过（现行版）/ 未通过（退回起草人修改）═══════════════
// 2026-09-21 批次 129（`SOP-B-25` 第 ① 项 + `SOP-B-26`，依 `D-341` / `D-342` / `D-343`）。
// 母本 `content/02_institution/sop/常见工作场景快速指南.md:294`-`:313`「制度建设」：
//   快速流程「起草初稿 → 本组试点 → 征求意见 → 修改完善 → **支委会审议** → 修改或通过（未通过则返回修改）
//   → **决定是否报送党员大会** → 监督落实」；承载方式「制度草案以『支部文件』形式起草与归档；
//   审议与表决在相应会议的议程上进行」＋ `:310`「是否报送支部党员大会表决，**在审议时确定**」
//   （决策机制表 `支委与党小组定人定责定岗说明.md:231` 同款）。
// 本链的环节名（**制度自己的说法，勿套专班链的词**）：
//   ① **制度草案**（`status:'draft'`，不是现行版，可改）→ ② **支委会审议**（既有会议议程「讨论文件」项）
//   → ③ 通过且**不报送党员大会** ⇒ **现行版**（`current`）；通过且**报送党员大会** ⇒ **待党员大会表决**
//     （`pending-party-meeting`，仍不是现行版）→ **支部党员大会表决通过** ⇒ 现行版；
//     未通过 ⇒ **退回起草人修改**（仍为草案 ＋ 退回意见，改后可重新提交审议）。
// 「是否报送党员大会」＝**一个标记**（不是「重要 / 其余」两档），由支委会审议时勾，
//   **门控的是「能否当场成为现行版」这条路**（不报送＝支委会通过即发布；报送＝还要走党员大会那一关）。
// 落点：**全部复用既有机制，未新开页面、未新建表**——草案＝支部文件；审议与表决＝既有活动 ＋ 议程
//   「讨论文件」项（`agenda-follow-up.js::recordAgendaResult` 的对应分支只做 IO，判据与状态迁移在本文件）。
// ⚠ 未做（如实）：**「制度内容 → 对应委员」的派单判据母本与代码都没有**（`SOP-B-25` 第 ② 项）⇒
//   本批**不自创映射**（自造一份＝替支书写制度内容）；制度文本的写权沿用既有 `INSTITUTION_MANAGER_ROLES`
//   （支书 / 副支书，**未放宽**），要按条条职责派单须支书先给定映射表。

/** 制度状态①：草案（未经支委会审议，不是现行版；可改、可重新提交审议） */
export const INSTITUTION_DRAFT = 'draft';
/** 制度状态③-报送：支委会已审议通过并决定报送党员大会 ⇒ 待支部党员大会表决（仍不是现行版） */
export const INSTITUTION_PENDING_PARTY_MEETING = 'pending-party-meeting';
/** 审议未通过的缺省退回意见（UI 与服务层同源；调用方传了 note 就用 note） */
export const INSTITUTION_REJECT_NOTE = '支委会审议未通过，退回起草人修改';

/** 会议类型判据（按活动 type 名称判，与既有活动类型字面同源）：支委会审议 / 支部党员大会表决 */
const COMMITTEE_MEETING_RE = /支委/;
const PARTY_MEETING_RE = /党员大会/;

/** 该支部文件是否制度文本（对外只读判据；本文件其余处沿用 `_purposeOf`） */
export function isInstitutionDoc(doc) {
  return _purposeOf(doc) === 'institution';
}

/**
 * 「会前草案」下拉与「拟上会」清单的**同一判据**（两处 UI 共用，勿各写一份）：
 *   普通文件草案（既有口径：无 status 或 status==='draft'）＋
 *   在链上、尚未成为现行版的制度（草案＝待支委会审议；待党员大会表决＝支委会已通过、待党员大会表决）。
 */
export function isAgendaDraftDoc(doc) {
  if (!doc) return false;
  if (!doc.status || doc.status === 'draft') return true;
  return isInstitutionDoc(doc) && doc.status === INSTITUTION_PENDING_PARTY_MEETING;
}

/** 该制度当前该上哪种会（null ＝ 不在制度链上：非制度 / 已是现行版 / 已停用） */
export function institutionMeetingStage(doc) {
  if (!isInstitutionDoc(doc)) return null;
  if (doc.status === INSTITUTION_DRAFT) return 'committee';
  if (doc.status === INSTITUTION_PENDING_PARTY_MEETING) return 'party-meeting';
  return null;
}

/** 议程项引用的制度是否处于**草案态**（＝该议程项是「支委会审议制度草案」，记录结果时须定是否报送党员大会） */
export function isInstitutionDraftAgendaItem(agendaItem, branchDocs = []) {
  const id = agendaItem && agendaItem.branchDocId;
  if (!id) return false;
  const doc = (Array.isArray(branchDocs) ? branchDocs : []).find((d) => d && d.id === id);
  return isInstitutionDoc(doc) && doc.status === INSTITUTION_DRAFT;
}

/**
 * 议程项结果 → 制度状态迁移（**纯函数**；由 `services/agenda-follow-up.js::recordAgendaResult` 的
 * 「讨论文件」分支调用，IO 仍由那边做，本文件只给判据与补丁）。
 * 只对**在链上**的制度且**会议类型与所处环节相符**时生效：草案只认支委会审议、待表决只认支部党员大会表决
 * ——会议类型不符则不动（防从别的会上把制度推成现行版；这一支如实登记为边界）。
 * @param {Object} p
 * @param {Object} p.doc 制度条目（现状）
 * @param {string} p.meetingType 承载议程的会议类型（议程项结果就记在这场会上）
 * @param {'passed'|'rejected'|'partial'} p.decision 本次记录的议程结果
 * @param {boolean} [p.reportToPartyMeeting] 支委会审议时的勾选：是否报送党员大会表决
 * @param {string} [p.note] 记录说明/审议意见（未通过时作退回意见）
 * @param {string} [p.by] 记录人 personId
 * @param {string} [p.at] 记录时间（缺省＝当下）
 * @param {string} [p.activityId] / @param {string} [p.agendaItemId] 留痕回指
 * @returns {{ok:boolean, reason?:string, patch?:Object}}
 */
export function applyInstitutionAgendaResult({
  doc, meetingType, decision, reportToPartyMeeting = false,
  note = '', by = null, at = null, activityId = null, agendaItemId = null,
} = {}) {
  const stage = institutionMeetingStage(doc);
  if (!stage) return { ok: false, reason: 'not-on-institution-chain' };
  const type = String(meetingType || '');
  if (stage === 'committee' && !COMMITTEE_MEETING_RE.test(type)) return { ok: false, reason: 'meeting-mismatch' };
  if (stage === 'party-meeting' && !PARTY_MEETING_RE.test(type)) return { ok: false, reason: 'meeting-mismatch' };
  const stamp = at || new Date().toISOString();
  const trail = {
    reviewActivityId: activityId || null,
    reviewAgendaItemId: agendaItemId || null,
    reviewedBy: by || null,
    reviewedAt: stamp,
    updatedAt: stamp,
  };
  if (decision === 'rejected') {
    // 回流支路（`SOP-B-26` ②）：未通过 ⇒ 退回起草人修改——仍为草案＋退回意见，可改后重新提交审议
    return {
      ok: true,
      patch: {
        ...trail,
        status: INSTITUTION_DRAFT,
        reviewResult: 'rejected',
        reviewNote: String(note || '').trim() || INSTITUTION_REJECT_NOTE,
      },
    };
  }
  if (decision !== 'passed') return { ok: false, reason: 'bad-decision' };
  if (stage === 'committee' && reportToPartyMeeting === true) {
    // 报送党员大会 ⇒ 不当场发布，转「待党员大会表决」（消费者＝支部党员大会议程；见 `isAgendaDraftDoc`）
    return {
      ok: true,
      patch: {
        ...trail,
        status: INSTITUTION_PENDING_PARTY_MEETING,
        reviewResult: 'passed',
        reportToPartyMeeting: true,
        reviewNote: '',
      },
    };
  }
  // 不报送（支委会通过即发布）或 党员大会表决通过 ⇒ 成为现行版（版本号不动：草案通过即 v1）
  return {
    ok: true,
    patch: {
      ...trail,
      status: 'current',
      reviewResult: 'passed',
      ...(stage === 'committee' ? { reportToPartyMeeting: false } : {}),
      reviewNote: '',
      versionBy: by || null,
      versionAt: stamp,
      versionNote: String(note || '').trim(),
    },
  };
}

/**
 * 修改**制度草案**（起草人修改后重新提交审议；**不升版本号**，版本语义唯一入口仍是「上传新版」）。
 * 仅草案态可改；现行 / 停用仍走 `publishNewVersion` / `setDocStatus`。
 * @param {Object} opts { id, title?, desc?, bodyText?, note?, by, role } ＋ 可选替换附件
 *   （fileName/fileSize/format/filePath/fileData，形态同 saveDoc 的普通文件编辑支）
 * @returns {Promise<{ok:boolean, doc?:Object, reason?:string}>}
 */
export async function updateInstitutionDraft(opts = {}) {
  const { id, title, desc, bodyText, note, by, role } = opts;
  try {
    if (!isInstitutionManager(role)) return { ok: false, reason: '制度文本仅限支书（含副支书）操作' };
    const cur = await _getDoc(id);
    if (!cur) return { ok: false, reason: '支部文件不存在或已删除' };
    if (!isInstitutionDoc(cur)) return { ok: false, reason: '仅制度文本支持本操作' };
    if (cur.status !== INSTITUTION_DRAFT) {
      return { ok: false, reason: '仅草案态制度可修改（现行版请用「上传新版」）' };
    }
    const now = new Date().toISOString();
    const patch = { updatedAt: now, revisedBy: by || null, revisedAt: now };
    if (title !== undefined && String(title).trim()) patch.title = String(title).trim();
    if (desc !== undefined) patch.desc = String(desc || '');
    if (bodyText !== undefined) patch.bodyText = String(bodyText);
    if (note !== undefined) patch.reviseNote = String(note || '');
    if (opts.fileName && (opts.filePath || opts.fileData)) {
      patch.fileName = opts.fileName;
      if (opts.fileSize !== undefined) patch.fileSize = opts.fileSize;
      if (opts.format) patch.format = opts.format;
      patch.filePath = opts.filePath || null;
      patch.fileData = opts.fileData || null;
    }
    const updated = await getAdapter().branchDocs.update(id, patch);
    return { ok: true, doc: updated };
  } catch (e) {
    return { ok: false, reason: (e && e.message) ? e.message : '修改草案失败' };
  }
}
