// role: [工程师]+[AI]
// 参考资料板块 — 网站群展示 + 官方文件（党内法规位阶排序）+ 支部文件（支委写入/全员下载）

import { icon } from '../core/icons.js?v=20260908c';
import { getBasePath } from '../core/utils.js?v=20260908c';
import { getAdapter, getDataSource, getAuthToken, getApiBaseUrl } from '../core/data-adapter.js?v=20260908c';
import { AuthStore } from '../services/auth.js?v=20260908c';
import { loadActivities } from '../services/activity.js?v=20260908c';
import { PEOPLE } from '../mock/people.js?v=20260908c';
// 立项⑧（E 批）：支部文件增强——制度文本（版本化 + 现行/停用态 + 网页读正文）纯逻辑服务
import {
  isInstitutionManager, saveDoc, publishNewVersion, setDocStatus,
  buildDocVersionsView, renderDocBody,
} from '../services/branch-doc.js?v=20260908c';

const SITE_GROUPS = [
  {
    title: 'GSM1921-SOP 系统迭代',
    desc: 'SOP 引擎版本记录与更新日志',
    url: 'https://github.com/GSM1921-SOP',
    cat: 'system',
    icon: 'github',
  },
  {
    title: '光华管理学院官网',
    desc: '学院动态、通知公告、学术资源',
    url: 'https://www.gsm.pku.edu.cn/',
    cat: 'external',
    icon: 'globe',
  },
  {
    title: '北京大学党委组织部',
    desc: '发展党员流程、组织生活指导',
    url: 'https://zzb.pku.edu.cn/',
    cat: 'external',
    icon: 'shield',
  },
  {
    title: '共产党员网',
    desc: '党建知识库、学习材料、政策法规',
    url: 'https://www.12371.cn/',
    cat: 'external',
    icon: 'flag',
  },
  {
    title: '学习强国',
    desc: '时政新闻、理论文章、视频课程',
    url: 'https://www.xuexi.cn/',
    cat: 'tools',
    icon: 'book',
  },
  {
    title: '北大邮箱系统',
    desc: '支部公邮登录入口',
    url: 'https://mail.pku.edu.cn/',
    cat: 'tools',
    icon: 'mail',
  },
];

// 官方文件（党内法规位阶排序：党章 → 条例 → 细则）
const OFFICIAL_DOCS = [
  {
    id: 'official-01',
    title: '中国共产党章程',
    cat: 'party-doc',
    desc: '党的根本大法，全体党员必须遵守的行为准则',
    url: 'https://www.12371.cn/special/zggcdzc/zggcdzcqw/',
  },
  {
    id: 'official-02',
    title: '支部工作条例（试行）',
    cat: 'party-doc',
    desc: '党支部工作的基本遵循',
    url: 'https://www.12371.cn/2018/11/25/ARTI1543146320637564.shtml',
  },
  {
    id: 'official-03',
    title: '高校基层组织工作条例',
    cat: 'party-doc',
    desc: '高校党的基层组织设置和运行规范',
    url: 'https://www.12371.cn/2021/04/22/ARTI1619086314385347.shtml',
  },
  {
    id: 'official-04',
    title: '党员教育管理工作条例',
    cat: 'party-doc',
    desc: '党员教育管理的制度化规范文件',
    url: 'https://www.12371.cn/2019/05/21/ARTI1558449177626771.shtml',
  },
  {
    id: 'official-05',
    title: '发展党员工作细则',
    cat: 'party-doc',
    desc: '发展党员各环节程序性规范',
    url: 'https://www.12371.cn/2026/05/18/ARTI1779102179030620.shtml',
  },
];

function _iconSVG(name) {
  if (name === 'github') return icon('github', { fill: 'currentColor', stroke: 'none', className: 'w-4 h-4' });
  return icon(name, { className: 'w-4 h-4' }) || icon('globe', { className: 'w-4 h-4' });
}

function _formatIcon(format) {
  const map = {
    pdf: '<span class="ref-file-badge pdf">PDF</span>',
    md: '<span class="ref-file-badge md">MD</span>',
    doc: '<span class="ref-file-badge docx">DOC</span>',
    docx: '<span class="ref-file-badge docx">DOCX</span>',
    xls: '<span class="ref-file-badge xlsx">XLS</span>',
    xlsx: '<span class="ref-file-badge xlsx">XLSX</span>',
    png: '<span class="ref-file-badge img">IMG</span>',
    jpg: '<span class="ref-file-badge img">IMG</span>',
    jpeg: '<span class="ref-file-badge img">IMG</span>',
  };
  return map[format] || `<span class="ref-file-badge">${(format || 'FILE').toUpperCase()}</span>`;
}

function _formatSize(bytes) {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function _extFromName(fileName) {
  const m = /\.([a-zA-Z0-9]+)$/.exec(fileName || '');
  return m ? m[1].toLowerCase() : '';
}

// HTML 转义（支部文件为用户输入，防注入）
function _esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function _readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsDataURL(file);
  });
}

/** 归档来源标签（2026-09-01 代码审查 P3）：已归档支部文件显示「经 XX 会议讨论通过」，留痕完整 */
function _discussionLabel(d) {
  if (!d || d.status === 'draft' || !d.discussionActivityId) return '';
  try {
    const act = loadActivities().find((a) => a.id === d.discussionActivityId);
    return act && act.title ? ` · 经《${act.title}》讨论通过` : '';
  } catch (_) { return ''; }
}

// ── 立项⑧（E 批）制度文本展示小工具 ──────────────────────────

/** 用途归一：旧数据（无 purpose）视为普通文件（doc） */
function _isInstitutionDoc(d) {
  return !!d && d.purpose === 'institution';
}

/** ISO 时间 → 本地 'YYYY-MM-DD HH:mm' */
function _fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 16);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 发布人 personId → 姓名（种子外人员回退 id） */
function _personName(personId) {
  if (!personId) return '';
  const p = PEOPLE.find((x) => x.id === personId);
  return p ? p.name : String(personId);
}

/** 制度状态徽标：现行（绿）/ 已停用（灰）——沿用既有 ref-file-badge 盒型，颜色就地指定 */
function _institutionBadge(d) {
  const current = d.status === 'current';
  return current
    ? '<span class="ref-file-badge" style="background-color:#D1FAE5;color:#047857;">现行</span>'
    : '<span class="ref-file-badge" style="background-color:#F3F4F6;color:#6B7280;">停用</span>';
}

/** 制度类左侧「制度」标（36×24 盒型，绿/灰对应现行/停用） */
function _institutionTypeBadge(d) {
  const current = d.status === 'current';
  return `<span class="ref-file-badge" style="background-color:${current ? '#D1FAE5' : '#F3F4F6'};color:${current ? '#047857' : '#6B7280'};">制度</span>`;
}

export class ReferencesModule {
  static _searchTerm = '';
  static _branchDocs = [];
  static _currentUser = null;
  static _isCommissioner = false;
  /** 制度文本管理者（书记/副书记）：制度类条目发布/停用/上传新版仅其可操作 */
  static _isInstitutionManager = false;
  /** 「只看制度」过滤开关（默认全部） */
  static _onlyInstitution = false;

  static init() {
    ReferencesModule._onlyInstitution = false;
    ReferencesModule._bindSearch();
    ReferencesModule._bindBranchDocAdd();
    ReferencesModule._loadAuth();
    ReferencesModule._loadBranchDocs().then(() => ReferencesModule.render());
  }

  static _loadAuth() {
    ReferencesModule._currentUser = AuthStore.getCurrentUser();
    ReferencesModule._isCommissioner = ReferencesModule._currentUser
      ? AuthStore.isCommissioner(ReferencesModule._currentUser.role)
      : false;
    ReferencesModule._isInstitutionManager = ReferencesModule._currentUser
      ? isInstitutionManager(ReferencesModule._currentUser.role)
      : false;
  }

  static async _loadBranchDocs() {
    try {
      ReferencesModule._branchDocs = await getAdapter().branchDocs.list();
    } catch (e) {
      console.warn('[references] 支部文件加载失败：', e);
      ReferencesModule._branchDocs = [];
    }
  }

  static _bindSearch() {
    const input = document.getElementById('ref-search-input');
    if (!input) return;
    input.addEventListener('input', () => {
      ReferencesModule._searchTerm = input.value.trim().toLowerCase();
      ReferencesModule.render();
    });
  }

  static _bindBranchDocAdd() {
    const btn = document.getElementById('ref-branch-doc-add-btn');
    if (btn) btn.addEventListener('click', () => ReferencesModule._openEditor());
  }

  static render() {
    ReferencesModule._renderSites();
    ReferencesModule._renderOfficialDocs();
    ReferencesModule._renderBranchDocs();
  }

  static _renderSites() {
    const grid = document.getElementById('ref-sites-grid');
    if (!grid) return;

    let sites = SITE_GROUPS;
    if (ReferencesModule._searchTerm) {
      const q = ReferencesModule._searchTerm;
      sites = sites.filter(s => s.title.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q));
    }

    grid.innerHTML = sites.map(s => `
      <a href="${s.url}" target="_blank" rel="noopener noreferrer" class="ref-site-card">
        <div class="ref-site-icon">${_iconSVG(s.icon)}</div>
        <div class="ref-site-info">
          <span class="ref-site-title">${s.title}</span>
          <span class="ref-site-desc">${s.desc}</span>
        </div>
      </a>
    `).join('');
  }

  static _renderOfficialDocs() {
    const list = document.getElementById('ref-docs-list');
    const empty = document.getElementById('ref-docs-empty');
    const count = document.getElementById('ref-result-count');
    if (!list) return;

    let docs = OFFICIAL_DOCS;
    if (ReferencesModule._searchTerm) {
      const q = ReferencesModule._searchTerm;
      docs = docs.filter(d => d.title.toLowerCase().includes(q) || d.desc.toLowerCase().includes(q));
    }

    if (count) count.textContent = `共 ${docs.length} 项`;

    if (docs.length === 0) {
      list.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');

    list.innerHTML = docs.map(d => `
      <div class="ref-doc-item">
        <div class="ref-doc-left">
          <div class="ref-doc-info">
            <span class="ref-doc-title">${d.title}</span>
            <span class="ref-doc-meta">${d.desc}</span>
          </div>
        </div>
        <div class="ref-doc-right">
          <a class="ref-download-btn" href="${d.url}" target="_blank" rel="noopener noreferrer">查看官方原文</a>
        </div>
      </div>
    `).join('');
  }

  // ═══════════════ 支部文件列表（普通文件 + 制度文本，立项⑧）═══════════════

  static _renderBranchDocs() {
    const list = document.getElementById('ref-branch-docs-list');
    const empty = document.getElementById('ref-branch-docs-empty');
    const loginHint = document.getElementById('ref-branch-docs-login-hint');
    const addBtn = document.getElementById('ref-branch-doc-add-btn');
    if (!list) return;

    ReferencesModule._ensureBranchFilterToolbar();

    // 保持匿名可访：支部文件需登录后可见（书记 2026-08-18 裁决）；
    // 匿名提示附「去登录」入口（书记 2026-09-07 U1 批准；静态文案位在 search.html，此处 JS 补链）
    if (!ReferencesModule._currentUser) {
      list.innerHTML = '';
      ReferencesModule._setBranchFilterVisible(false);
      if (empty) empty.classList.add('hidden');
      if (loginHint) {
        loginHint.innerHTML = `登录后查看支部文件 <a href="${getBasePath()}login.html" class="px-3 py-1.5 rounded-lg text-xs font-medium text-white hover:opacity-90" style="background:#C8102E;text-decoration:none;">去登录</a>`;
        loginHint.classList.remove('hidden');
      }
      if (addBtn) addBtn.classList.add('hidden');
      return;
    }
    ReferencesModule._setBranchFilterVisible(true);
    ReferencesModule._syncFilterToggle();
    if (loginHint) loginHint.classList.add('hidden');
    if (addBtn) addBtn.classList.toggle('hidden', !ReferencesModule._isCommissioner);

    let docs = ReferencesModule._branchDocs.map((doc) => ({
      ...doc,
      status: doc.status || 'archived',
    }));
    if (!ReferencesModule._isCommissioner) {
      // 成员可见：制度文本（现行/已停用均全员可读）+ 已归档普通文件（现状不变）；
      // 会前草案（status=draft）维持现状仅支委可见
      docs = docs.filter((doc) => _isInstitutionDoc(doc) || doc.status === 'archived');
    }
    if (ReferencesModule._onlyInstitution) {
      docs = docs.filter((doc) => _isInstitutionDoc(doc));
    }
    if (ReferencesModule._searchTerm) {
      const q = ReferencesModule._searchTerm;
      docs = docs.filter(d =>
        (d.title || '').toLowerCase().includes(q) ||
        (d.desc || '').toLowerCase().includes(q) ||
        (d.fileName || '').toLowerCase().includes(q) ||
        (d.bodyText || '').toLowerCase().includes(q)
      );
    }
    // 支部文件排序：updatedAt/uploadedAt 倒序（最新在前）
    docs = [...docs].sort((a, b) =>
      String(b.updatedAt || b.uploadedAt || '').localeCompare(String(a.updatedAt || a.uploadedAt || '')));

    if (docs.length === 0) {
      list.innerHTML = '';
      if (empty) {
        empty.textContent = ReferencesModule._onlyInstitution
          ? (ReferencesModule._isInstitutionManager
            ? '暂无制度文本——可在「写入文件」中选择「制度文本」发布（书记/副书记）'
            : '暂无制度文本')
          : '暂无支部文件';
        empty.classList.remove('hidden');
      }
      return;
    }
    if (empty) empty.classList.add('hidden');

    list.innerHTML = docs.map(d =>
      _isInstitutionDoc(d)
        ? ReferencesModule._renderInstitutionRow(d)
        : ReferencesModule._renderDocRow(d)
    ).join('');

    ReferencesModule._bindBranchDocList(list);
  }

  /** 普通文件行（维持现状模板：类型徽标 + 标题/元信息 + 下载 + 支委修改/删除） */
  static _renderDocRow(d) {
    const href = d.filePath || d.fileData || '#';
    const downloadable = href && href !== '#';
    const downloadAttr = downloadable ? `download="${_esc(d.fileName || d.title || '文件')}"` : '';
    const fileTarget = d.filePath ? 'target="_blank" rel="noopener noreferrer"' : '';
    const actions = ReferencesModule._isCommissioner ? `
      <button type="button" class="ref-doc-action-btn" data-action="edit" data-id="${_esc(d.id)}">修改</button>
      <button type="button" class="ref-doc-action-btn ref-doc-action-danger" data-action="delete" data-id="${_esc(d.id)}">删除</button>
    ` : '';
    return `
      <div class="ref-doc-item" data-id="${_esc(d.id)}">
        <div class="ref-doc-left">
          ${_formatIcon(d.format || _extFromName(d.fileName))}
          <div class="ref-doc-info">
            <span class="ref-doc-title">${_esc(d.title || d.fileName || '未命名文件')}</span>
            <span class="ref-doc-meta">${_esc(d.status === 'draft' ? '会前草案' : '已归档')}${_discussionLabel(d)}${d.desc || d.fileName ? ' · ' + _esc(d.desc || d.fileName || '') : ''}</span>
          </div>
        </div>
        <div class="ref-doc-right">
          ${_formatSize(d.fileSize) ? `<span class="ref-doc-size">${_formatSize(d.fileSize)}</span>` : ''}
          <a class="ref-download-btn" href="${href}" ${downloadAttr} ${fileTarget}>${icon('download', { className: 'w-3.5 h-3.5' })}下载</a>
          ${actions}
        </div>
      </div>
    `;
  }

  /** 制度文本行：制度徽标 + 现行/停用态 + 网页内读正文 + 历史版本折叠 + 书记操作（上传新版/停用/重新启用） */
  static _renderInstitutionRow(d) {
    const uid = String(d.id).replace(/[^\w-]/g, '_');
    const href = d.filePath || d.fileData || '#';
    const downloadable = href && href !== '#';
    const downloadAttr = downloadable ? `download="${_esc(d.fileName || '附件')}"` : '';
    const fileTarget = d.filePath ? 'target="_blank" rel="noopener noreferrer"' : '';
    const isCurrent = d.status === 'current';
    const versionNo = d.version || 1;
    const histCount = Array.isArray(d.versions) ? d.versions.length : 0;

    let actions = '';
    if (ReferencesModule._isInstitutionManager) {
      if (isCurrent) {
        actions += `<button type="button" class="ref-doc-action-btn" data-action="publish-version" data-id="${_esc(d.id)}">上传新版</button>`;
        actions += `<button type="button" class="ref-doc-action-btn" data-action="disable" data-id="${_esc(d.id)}">停用</button>`;
      } else {
        actions += `<button type="button" class="ref-doc-action-btn" data-action="enable" data-id="${_esc(d.id)}">重新启用</button>`;
      }
    }

    const metaParts = [];
    metaParts.push(isCurrent ? `制度文本 · 现行版 v${versionNo}` : `制度文本 · 已停用（最近版本 v${versionNo}）`);
    if (d.desc) metaParts.push(_esc(d.desc));
    const updTime = _fmtDateTime(d.updatedAt || d.uploadedAt);
    if (updTime) metaParts.push(`更新于 ${updTime}`);
    const pubName = _personName(d.versionBy || d.uploadedBy);
    if (pubName) metaParts.push(`${pubName} 发布`);

    const readPanel = ReferencesModule._renderInstitutionReadPanel(d, isCurrent);
    const histPanel = ReferencesModule._renderInstitutionHistoryPanel(d, isCurrent);

    return `
      <div class="ref-doc-item" data-id="${_esc(d.id)}" style="display:flex;flex-direction:column;align-items:stretch;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0;">
          <div class="ref-doc-left">
            ${_institutionTypeBadge(d)}
            <div class="ref-doc-info">
              <span style="display:inline-flex;align-items:center;flex-wrap:wrap;gap:6px;">
                <span class="ref-doc-title">${_esc(d.title || '未命名制度')}</span>
                ${_institutionBadge(d)}
              </span>
              <span class="ref-doc-meta">${metaParts.join(' · ')}</span>
            </div>
          </div>
          <div class="ref-doc-right">
            ${_formatSize(d.fileSize) ? `<span class="ref-doc-size">${_formatSize(d.fileSize)}</span>` : ''}
            ${downloadable
              ? `<a class="ref-download-btn" href="${href}" ${downloadAttr} ${fileTarget}>${icon('download', { className: 'w-3.5 h-3.5' })}下载附件</a>`
              : ''}
            ${actions}
          </div>
        </div>
        <div style="display:flex;gap:6px;margin-top:6px;">
          <button type="button" class="ref-doc-action-btn" data-toggle-panel="ref-read-${uid}" data-label-close="阅读正文" data-label-open="收起正文">阅读正文</button>
          ${histCount > 0
            ? `<button type="button" class="ref-doc-action-btn" data-toggle-panel="ref-hist-${uid}" data-label-close="历史版本 (${histCount})" data-label-open="收起历史">历史版本 (${histCount})</button>`
            : ''}
        </div>
        <div id="ref-read-${uid}" class="hidden" style="margin-top:10px;padding-top:10px;border-top:1px solid var(--neutral-100);">
          ${readPanel}
        </div>
        ${histCount > 0 ? `<div id="ref-hist-${uid}" class="hidden" style="margin-top:10px;padding-top:10px;border-top:1px solid var(--neutral-100);">${histPanel}</div>` : ''}
      </div>
    `;
  }

  /** 网页内读现行版正文（renderDocBody 安全渲染；无正文时纯文本降级提示） */
  static _renderInstitutionReadPanel(d, isCurrent) {
    const bodyHtml = d.bodyText ? renderDocBody(d.bodyText) : '';
    const parts = [];
    if (!isCurrent) {
      parts.push('<p style="font-size:0.7rem;color:#B45309;margin:0 0 8px;">该制度当前已停用，以下为最近版本正文（仅供查阅）。</p>');
    }
    if (bodyHtml) {
      parts.push(`<div style="font-size:0.8125rem;line-height:1.8;color:var(--neutral-700);word-break:break-word;">${bodyHtml}</div>`);
    } else {
      parts.push('<p style="font-size:0.75rem;color:var(--neutral-400);margin:0;">本制度暂未录入网页正文，请查看附件（若有）或线下文本。</p>');
    }
    return parts.join('');
  }

  /** 历史版本折叠列表（版本号/时间/发布人/说明/可展开看正文；含现行版本身） */
  static _renderInstitutionHistoryPanel(d) {
    const versions = buildDocVersionsView(d); // 升序：v1 … vN（只读视图，含 by/at/note）
    const statusText = (v) => {
      if (v.status === 'superseded') return '历史归档';
      if (v.status === 'disabled') return '已停用';
      return '现行';
    };
    return versions.map((v) => {
      const isTop = v.version === (d.version || 1);
      const meta = [
        `<b style="color:var(--neutral-800);">v${v.version}</b>`,
        `<span style="color:${statusText(v) === '现行' ? '#047857' : 'var(--neutral-400)'};">${statusText(v)}</span>`,
        v.at ? _fmtDateTime(v.at) : '',
        v.by ? `${_personName(v.by)} 发布` : '',
        v.title && v.title !== d.title ? `《${_esc(v.title)}》` : '',
      ].filter(Boolean).join(' · ');
      const note = v.note ? `<div style="font-size:0.7rem;color:var(--neutral-500);margin-top:2px;">版本说明：${_esc(v.note)}</div>` : '';
      const bodyHtml = v.bodyText ? renderDocBody(v.bodyText) : '';
      const body = bodyHtml
        ? `<details style="margin-top:6px;"><summary style="cursor:pointer;font-size:0.7rem;color:var(--primary-700);">查看 v${v.version} 正文</summary>
            <div style="font-size:0.8125rem;line-height:1.8;color:var(--neutral-700);word-break:break-word;margin-top:6px;padding:8px;background:var(--neutral-50);border-radius:var(--radius-sm);">${bodyHtml}</div>
          </details>`
        : '';
      return `
        <div style="padding:8px 0;${isTop ? '' : 'border-bottom:1px solid var(--neutral-100);'}">
          <div style="font-size:0.72rem;color:var(--neutral-500);line-height:1.6;">${meta}</div>
          ${note}
          ${body}
        </div>`;
    }).join('');
  }

  /** 列表事件绑定：普通文件修改/删除 + 制度（上传新版/停用/重新启用）+ 正文/历史面板切换 */
  static _bindBranchDocList(list) {
    list.querySelectorAll('.ref-doc-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        if (action === 'edit') ReferencesModule._openEditor(id);
        else if (action === 'delete') ReferencesModule._deleteDoc(id);
        else if (action === 'publish-version') ReferencesModule._openPublishModal(id);
        else if (action === 'disable') ReferencesModule._setInstitutionStatus(id, 'disabled');
        else if (action === 'enable') ReferencesModule._setInstitutionStatus(id, 'current');
      });
    });
    list.querySelectorAll('[data-toggle-panel]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const panel = document.getElementById(btn.dataset.togglePanel);
        if (!panel) return;
        const closed = panel.classList.toggle('hidden');
        btn.textContent = closed ? btn.dataset.labelClose : btn.dataset.labelOpen;
      });
    });
  }

  /** 「只看制度」过滤工具栏（惰性建一次；仅登录后显示） */
  static _ensureBranchFilterToolbar() {
    const list = document.getElementById('ref-branch-docs-list');
    if (!list || document.getElementById('ref-branch-doc-filter')) return;
    const bar = document.createElement('div');
    bar.id = 'ref-branch-doc-filter';
    bar.style.cssText = 'display:none;align-items:center;justify-content:space-between;margin-bottom:10px;';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'ref-filter-institution';
    btn.className = 'ref-doc-action-btn';
    btn.textContent = '只看制度';
    btn.title = '筛选支部文件中的制度文本';
    btn.addEventListener('click', () => {
      ReferencesModule._onlyInstitution = !ReferencesModule._onlyInstitution;
      ReferencesModule._syncFilterToggle();
      ReferencesModule.render();
    });
    bar.appendChild(btn);
    list.insertAdjacentElement('beforebegin', bar);
  }

  static _setBranchFilterVisible(show) {
    const bar = document.getElementById('ref-branch-doc-filter');
    if (bar) bar.style.display = show ? 'flex' : 'none';
  }

  static _syncFilterToggle() {
    const btn = document.getElementById('ref-filter-institution');
    if (!btn) return;
    const on = ReferencesModule._onlyInstitution;
    btn.style.background = on ? 'var(--primary-50)' : '';
    btn.style.color = on ? 'var(--primary-700)' : '';
    btn.style.borderColor = on ? 'var(--primary-300)' : '';
  }

  // ── 写入 / 修改 / 删除（制度文本经 services/branch-doc.js 纯逻辑；附件上传仍在本模块）──

  static _openEditor(docId) {
    const editing = docId ? ReferencesModule._branchDocs.find(d => d.id === docId) : null;

    const existing = document.getElementById('ref-branch-doc-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'ref-branch-doc-modal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';

    const card = document.createElement('div');
    card.style.cssText = 'background:var(--surface-card);border-radius:14px;padding:0;max-width:480px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,0.18);max-height:88vh;display:flex;flex-direction:column;';

    // 用途：仅新增时可选（制度文本仅书记/副书记可见该选项）；编辑普通文件维持现状，不含转制度入口
    const purposeOptions = ['doc'].concat(ReferencesModule._isInstitutionManager ? ['institution'] : []);
    const purposeSelectHtml = editing ? '' : `
      <div>
        <label class="text-xs font-medium mb-1.5 block" style="color:var(--neutral-500);" for="ref-modal-purpose">用途</label>
        <select id="ref-modal-purpose" class="input-flat w-full">
          ${purposeOptions.map((p) => `<option value="${p}">${p === 'institution' ? '制度文本' : '普通文件'}</option>`).join('')}
        </select>
      </div>
    `;
    // 制度文本区：正文 textarea + 简单指引 + 版本说明（保存即现行版 v1）
    const instBoxHtml = editing ? '' : `
      <div id="ref-modal-inst-box" class="hidden space-y-3.5">
        <div>
          <label class="text-xs font-medium mb-1.5 block" style="color:var(--neutral-500);" for="ref-modal-body">正文（文本 / Markdown）</label>
          <textarea id="ref-modal-body" class="input-flat w-full" rows="10"
            placeholder="输入制度正文。支持简单 Markdown：# 标题、**加粗**、- 列表、1. 列表、行内 code、代码块"></textarea>
          <p class="text-xs mt-1.5" style="color:var(--neutral-400);">保存后即为「制度 · 现行版 v1」；之后再改正文请用列表上的「上传新版」，旧版自动归档可查。</p>
        </div>
        <div>
          <label class="text-xs font-medium mb-1.5 block" style="color:var(--neutral-500);" for="ref-modal-note">版本说明（可选）</label>
          <input id="ref-modal-note" class="input-flat w-full" placeholder="如：本制度经支委会审议，自发布之日起施行" />
        </div>
      </div>
    `;

    card.innerHTML = `
      <div class="px-5 pt-4 pb-3 flex items-center justify-between" style="border-bottom:1px solid var(--neutral-200);">
        <h3 class="font-title-cn text-sm font-semibold" style="color:var(--neutral-800);">${editing ? '修改支部文件' : '写入支部文件'}</h3>
        <button id="ref-modal-close" type="button" aria-label="关闭写入支部文件窗口" style="color:var(--neutral-400);font-size:1rem;line-height:1;background:none;border:none;cursor:pointer;">&times;</button>
      </div>
      <div class="px-5 py-4 space-y-3.5 overflow-y-auto">
        ${purposeSelectHtml}
        <div>
          <label class="text-xs font-medium mb-1.5 block" style="color:var(--neutral-500);">标题 <span style="color:#EF4444;">*</span></label>
          <input id="ref-modal-title" class="input-flat w-full" placeholder="如：积极分子考察表模板 / 支部例会制度" value="${editing ? _esc(editing.title || '') : ''}" />
        </div>
        <div>
          <label class="text-xs font-medium mb-1.5 block" style="color:var(--neutral-500);" for="ref-modal-desc">描述</label>
          <textarea id="ref-modal-desc" class="input-flat w-full" rows="2" placeholder="可选：文件用途 / 说明">${editing ? _esc(editing.desc || '') : ''}</textarea>
        </div>
        ${instBoxHtml}
        <div>
          <label class="text-xs font-medium mb-1.5 block" style="color:var(--neutral-500);" id="ref-modal-file-label">${editing ? '替换文件（可选，不选则保留原文件）' : '选择文件 <span style="color:#EF4444;">*</span>'}</label>
          <input id="ref-modal-file" type="file" accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx"
            class="block w-full text-xs file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-600 file:text-xs hover:file:bg-blue-100 transition-colors cursor-pointer" style="color:var(--neutral-600);" />
        </div>
        <div id="ref-modal-status" class="hidden text-xs rounded-lg px-3 py-2"></div>
      </div>
      <div class="flex justify-end gap-2 px-5 py-3" style="border-top:1px solid var(--neutral-200);">
        <button id="ref-modal-cancel" type="button" class="text-xs px-3 py-1.5 rounded-lg transition-colors" style="color:var(--neutral-500);">取消</button>
        <button id="ref-modal-confirm" type="button" class="text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="background:var(--primary-700);">${editing ? '保存' : '写入'}</button>
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    const closeModal = () => overlay.remove();
    card.querySelector('#ref-modal-close').addEventListener('click', closeModal);
    card.querySelector('#ref-modal-cancel').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    const statusEl = card.querySelector('#ref-modal-status');
    const showStatus = (type, msg) => {
      statusEl.classList.remove('hidden');
      statusEl.textContent = msg;
      statusEl.style.background = type === 'error' ? 'var(--primary-50)' : '#ECFDF5';
      statusEl.style.color = type === 'error' ? 'var(--primary-700)' : '#047857';
    };

    // 用途切换：制度文本 ⇄ 普通文件的正文区/文件要求联动
    const purposeSel = card.querySelector('#ref-modal-purpose');
    const instBox = card.querySelector('#ref-modal-inst-box');
    const fileLabel = card.querySelector('#ref-modal-file-label');
    if (purposeSel && instBox) {
      const syncPurpose = () => {
        const inst = purposeSel.value === 'institution';
        instBox.classList.toggle('hidden', !inst);
        fileLabel.innerHTML = inst
          ? '附件（可选；正文与附件可并存，正文优先网页阅读）'
          : '选择文件 <span style="color:#EF4444;">*</span>';
      };
      purposeSel.addEventListener('change', syncPurpose);
    }

    card.querySelector('#ref-modal-confirm').addEventListener('click', async () => {
      const purpose = purposeSel ? purposeSel.value : 'doc';
      const title = card.querySelector('#ref-modal-title').value.trim();
      const desc = card.querySelector('#ref-modal-desc').value.trim();
      const bodyTextEl = card.querySelector('#ref-modal-body');
      const bodyText = bodyTextEl ? bodyTextEl.value : '';
      const noteEl = card.querySelector('#ref-modal-note');
      const note = noteEl ? noteEl.value.trim() : '';
      const fileInput = card.querySelector('#ref-modal-file');
      const file = fileInput.files && fileInput.files[0];

      if (!title) { showStatus('error', '请填写标题'); return; }
      if (!editing) {
        if (purpose === 'institution') {
          if (!bodyText.trim() && !file) { showStatus('error', '请填写制度正文（文本/Markdown），或上传附件'); return; }
        } else if (!file) {
          showStatus('error', '请选择要上传的文件');
          return;
        }
      }

      const confirmBtn = card.querySelector('#ref-modal-confirm');
      confirmBtn.disabled = true;
      try {
        await ReferencesModule._saveDoc({ docId, purpose, title, desc, bodyText, note, file });
        closeModal();
      } catch (e) {
        confirmBtn.disabled = false;
        showStatus('error', e.message || '操作失败');
      }
    });
  }

  /** 保存统一走 services/branch-doc.js saveDoc（含用途/状态/版本语义 + 书记权限校验） */
  static async _saveDoc({ docId, purpose = 'doc', title, desc, bodyText = '', note = '', file }) {
    const by = ReferencesModule._currentUser ? ReferencesModule._currentUser.personId : null;
    const role = ReferencesModule._currentUser ? ReferencesModule._currentUser.role : null;
    let fileMeta = {};
    if (file) fileMeta = await ReferencesModule._uploadFile(file);

    const opts = { id: docId || undefined, purpose, title, desc, bodyText, note, by, role };
    if (file) {
      opts.fileName = fileMeta.fileName;
      opts.fileSize = fileMeta.fileSize;
      opts.format = fileMeta.format;
      opts.filePath = fileMeta.filePath || null;
      opts.fileData = fileMeta.fileData || null;
    }
    const res = await saveDoc(opts);
    if (!res.ok || !res.doc) throw new Error(res.reason || '保存失败');
    ReferencesModule._branchDocs = docId
      ? ReferencesModule._branchDocs.map((d) => (d.id === docId ? res.doc : d))
      : [...ReferencesModule._branchDocs, res.doc];
    ReferencesModule.render();
  }

  /** 上传新版（仅书记/副书记入口）：正文表单预填现行版 → publishNewVersion */
  static _openPublishModal(docId) {
    const doc = ReferencesModule._branchDocs.find((d) => d.id === docId);
    if (!doc || !_isInstitutionDoc(doc)) return;

    const existing = document.getElementById('ref-branch-doc-publish-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'ref-branch-doc-publish-modal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';

    const card = document.createElement('div');
    card.style.cssText = 'background:var(--surface-card);border-radius:14px;padding:0;max-width:560px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,0.18);max-height:88vh;display:flex;flex-direction:column;';

    card.innerHTML = `
      <div class="px-5 pt-4 pb-3 flex items-center justify-between" style="border-bottom:1px solid var(--neutral-200);">
        <h3 class="font-title-cn text-sm font-semibold" style="color:var(--neutral-800);">上传新版（制度文本）</h3>
        <button id="ref-pub-close" type="button" aria-label="关闭上传新版窗口" style="color:var(--neutral-400);font-size:1rem;line-height:1;background:none;border:none;cursor:pointer;">&times;</button>
      </div>
      <div class="px-5 py-4 space-y-3.5 overflow-y-auto">
        <div>
          <label class="text-xs font-medium mb-1.5 block" style="color:var(--neutral-500);">标题 <span style="color:#EF4444;">*</span></label>
          <input id="ref-pub-title" class="input-flat w-full" value="${_esc(doc.title || '')}" />
        </div>
        <div>
          <label class="text-xs font-medium mb-1.5 block" style="color:var(--neutral-500);" for="ref-pub-body">正文（文本 / Markdown，已预填现行版）</label>
          <textarea id="ref-pub-body" class="input-flat w-full" rows="12" style="font-family:inherit;">${_esc(doc.bodyText || '')}</textarea>
        </div>
        <div>
          <label class="text-xs font-medium mb-1.5 block" style="color:var(--neutral-500);" for="ref-pub-note">版本说明（可选）</label>
          <input id="ref-pub-note" class="input-flat w-full" placeholder="如：根据 2026-09 支委会意见修订第三条" />
        </div>
        <p class="text-xs" style="color:var(--neutral-400);">保存后：当前「现行版 v${doc.version || 1}」自动归档为历史版本（成员仍可展开查阅），正文更新为「现行版 v${(doc.version || 1) + 1}」。</p>
        <div id="ref-pub-status" class="hidden text-xs rounded-lg px-3 py-2"></div>
      </div>
      <div class="flex justify-end gap-2 px-5 py-3" style="border-top:1px solid var(--neutral-200);">
        <button id="ref-pub-cancel" type="button" class="text-xs px-3 py-1.5 rounded-lg transition-colors" style="color:var(--neutral-500);">取消</button>
        <button id="ref-pub-confirm" type="button" class="text-xs px-3 py-1.5 rounded-lg text-white transition-colors hover:opacity-90" style="background:var(--primary-700);">发布新版</button>
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    const closeModal = () => overlay.remove();
    card.querySelector('#ref-pub-close').addEventListener('click', closeModal);
    card.querySelector('#ref-pub-cancel').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    const statusEl = card.querySelector('#ref-pub-status');
    const showStatus = (type, msg) => {
      statusEl.classList.remove('hidden');
      statusEl.textContent = msg;
      statusEl.style.background = type === 'error' ? 'var(--primary-50)' : '#ECFDF5';
      statusEl.style.color = type === 'error' ? 'var(--primary-700)' : '#047857';
    };

    card.querySelector('#ref-pub-confirm').addEventListener('click', async () => {
      const title = card.querySelector('#ref-pub-title').value.trim();
      const bodyText = card.querySelector('#ref-pub-body').value;
      const note = card.querySelector('#ref-pub-note').value.trim();
      if (!title) { showStatus('error', '请填写标题'); return; }
      if (!bodyText.trim() && !doc.fileName) { showStatus('error', '请填写新版正文（当前制度无附件可依附）'); return; }

      const by = ReferencesModule._currentUser ? ReferencesModule._currentUser.personId : null;
      const role = ReferencesModule._currentUser ? ReferencesModule._currentUser.role : null;
      const confirmBtn = card.querySelector('#ref-pub-confirm');
      confirmBtn.disabled = true;
      try {
        const res = await publishNewVersion({ id: docId, title, bodyText, note, by, role });
        if (!res.ok || !res.doc) throw new Error(res.reason || '发布失败');
        ReferencesModule._branchDocs = ReferencesModule._branchDocs.map((d) => (d.id === docId ? res.doc : d));
        ReferencesModule.render();
        closeModal();
      } catch (e) {
        confirmBtn.disabled = false;
        showStatus('error', e.message || '操作失败');
      }
    });
  }

  /** 停用 / 重新启用（仅书记/副书记入口） */
  static async _setInstitutionStatus(id, status) {
    const doc = ReferencesModule._branchDocs.find((d) => d.id === id);
    if (!doc || !_isInstitutionDoc(doc)) return;
    const name = doc.title || '未命名制度';
    const confirmed = status === 'disabled'
      ? window.confirm(`停用制度《${name}》？\n\n停用后列表不再标注「现行」，历史版本仍可查阅；可随时重新启用。`)
      : window.confirm(`重新启用制度《${name}》？\n\n启用后该制度恢复为「现行」，全体成员可读。`);
    if (!confirmed) return;

    const by = ReferencesModule._currentUser ? ReferencesModule._currentUser.personId : null;
    const role = ReferencesModule._currentUser ? ReferencesModule._currentUser.role : null;
    try {
      const res = await setDocStatus({ id, status, by, role });
      if (!res.ok || !res.doc) { window.alert(res.reason || '操作失败'); return; }
      ReferencesModule._branchDocs = ReferencesModule._branchDocs.map((d) => (d.id === id ? res.doc : d));
      ReferencesModule.render();
    } catch (e) {
      console.warn('[references] 制度停用/启用失败：', e);
      window.alert(e.message || '操作失败');
    }
  }

  static async _uploadFile(file) {
    if (getDataSource() === 'api') {
      const token = getAuthToken();
      const baseUrl = getApiBaseUrl();
      const fd = new FormData();
      fd.append('file', file);
      const resp = await fetch(`${baseUrl}/api/v1/uploads`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || `上传失败(${resp.status})`);
      }
      const meta = await resp.json();
      return {
        fileName: meta.filename || file.name,
        fileSize: meta.size || file.size,
        format: _extFromName(meta.filename || file.name),
        filePath: meta.path,
        fileData: null,
      };
    }
    // mock 模式：base64 dataURL 持久化
    const dataUrl = await _readFileAsDataURL(file);
    return {
      fileName: file.name,
      fileSize: file.size,
      format: _extFromName(file.name),
      filePath: null,
      fileData: dataUrl,
    };
  }

  static async _deleteDoc(id) {
    const doc = ReferencesModule._branchDocs.find(d => d.id === id);
    if (!doc) return;
    // 制度文本不提供删除（有版本链留痕）：结束效力走「停用」，历史版本始终可查
    if (_isInstitutionDoc(doc)) {
      window.alert('制度文本不支持删除：请使用「停用」结束其效力，历史版本仍可查阅。');
      return;
    }
    if (!window.confirm(`确定删除支部文件「${doc.title || doc.fileName}」吗？删除后不可恢复。`)) return;
    try {
      await getAdapter().branchDocs.delete(id);
      ReferencesModule._branchDocs = ReferencesModule._branchDocs.filter(d => d.id !== id);
      ReferencesModule.render();
    } catch (e) {
      console.warn('[references] 删除支部文件失败：', e);
      window.alert(e.message || '删除失败');
    }
  }
}
