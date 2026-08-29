// role: [工程师]+[AI]
// 参考资料板块 — 网站群展示 + 官方文件（党内法规位阶排序）+ 支部文件（支委写入/全员下载）

import { icon } from '../core/icons.js?v=20260829o';
import { getAdapter, getDataSource, getAuthToken, getApiBaseUrl } from '../core/data-adapter.js?v=20260829o';
import { AuthStore } from '../services/auth.js?v=20260829o';

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

export class ReferencesModule {
  static _currentCat = 'all';
  static _searchTerm = '';
  static _branchDocs = [];
  static _currentUser = null;
  static _isCommissioner = false;

  static init() {
    ReferencesModule._bindCategoryTabs();
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
  }

  static async _loadBranchDocs() {
    try {
      ReferencesModule._branchDocs = await getAdapter().branchDocs.list();
    } catch (e) {
      console.warn('[references] 支部文件加载失败：', e);
      ReferencesModule._branchDocs = [];
    }
  }

  static _bindCategoryTabs() {
    const container = document.getElementById('ref-category-tabs');
    if (!container) return;
    container.querySelectorAll('.ref-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.ref-cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        ReferencesModule._currentCat = btn.dataset.cat;
        ReferencesModule.render();
      });
    });
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
    if (ReferencesModule._currentCat !== 'all') {
      sites = sites.filter(s => s.cat === ReferencesModule._currentCat);
    }
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
    if (ReferencesModule._currentCat !== 'all') {
      docs = docs.filter(d => d.cat === ReferencesModule._currentCat);
    }
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

  static _renderBranchDocs() {
    const list = document.getElementById('ref-branch-docs-list');
    const empty = document.getElementById('ref-branch-docs-empty');
    const loginHint = document.getElementById('ref-branch-docs-login-hint');
    const addBtn = document.getElementById('ref-branch-doc-add-btn');
    if (!list) return;

    // 保持匿名可访：支部文件需登录后可见（书记 2026-08-18 裁决）
    if (!ReferencesModule._currentUser) {
      list.innerHTML = '';
      if (empty) empty.classList.add('hidden');
      if (loginHint) loginHint.classList.remove('hidden');
      if (addBtn) addBtn.classList.add('hidden');
      return;
    }
    if (loginHint) loginHint.classList.add('hidden');
    if (addBtn) addBtn.classList.toggle('hidden', !ReferencesModule._isCommissioner);

    let docs = ReferencesModule._branchDocs;
    if (ReferencesModule._currentCat !== 'all') {
      docs = docs.filter(d => (d.cat || 'party-doc') === ReferencesModule._currentCat);
    }
    if (ReferencesModule._searchTerm) {
      const q = ReferencesModule._searchTerm;
      docs = docs.filter(d =>
        (d.title || '').toLowerCase().includes(q) ||
        (d.desc || '').toLowerCase().includes(q) ||
        (d.fileName || '').toLowerCase().includes(q)
      );
    }
    // 支部文件排序：uploadedAt 倒序（最新在前）
    docs = [...docs].sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''));

    if (docs.length === 0) {
      list.innerHTML = '';
      if (empty) empty.classList.remove('hidden');
      return;
    }
    if (empty) empty.classList.add('hidden');

    list.innerHTML = docs.map(d => {
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
              <span class="ref-doc-meta">${_esc(d.desc || d.fileName || '')}</span>
            </div>
          </div>
          <div class="ref-doc-right">
            ${_formatSize(d.fileSize) ? `<span class="ref-doc-size">${_formatSize(d.fileSize)}</span>` : ''}
            <a class="ref-download-btn" href="${href}" ${downloadAttr} ${fileTarget}>${icon('download', { className: 'w-3.5 h-3.5' })}下载</a>
            ${actions}
          </div>
        </div>
      `;
    }).join('');

    list.querySelectorAll('.ref-doc-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.dataset.id;
        if (btn.dataset.action === 'edit') ReferencesModule._openEditor(id);
        else ReferencesModule._deleteDoc(id);
      });
    });
  }

  // ── 写入 / 修改 / 删除 ──

  static _openEditor(docId) {
    const editing = docId ? ReferencesModule._branchDocs.find(d => d.id === docId) : null;

    const existing = document.getElementById('ref-branch-doc-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'ref-branch-doc-modal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;';

    const card = document.createElement('div');
    card.style.cssText = 'background:var(--surface-card);border-radius:14px;padding:0;max-width:440px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,0.18);max-height:86vh;display:flex;flex-direction:column;';

    card.innerHTML = `
      <div class="px-5 pt-4 pb-3 flex items-center justify-between" style="border-bottom:1px solid var(--neutral-200);">
        <h3 class="font-title-cn text-sm font-semibold" style="color:var(--neutral-800);">${editing ? '修改支部文件' : '写入支部文件'}</h3>
        <button id="ref-modal-close" type="button" style="color:var(--neutral-400);font-size:1rem;line-height:1;background:none;border:none;cursor:pointer;">&times;</button>
      </div>
      <div class="px-5 py-4 space-y-3.5 overflow-y-auto">
        <div>
          <label class="text-xs font-medium mb-1.5 block" style="color:var(--neutral-500);">标题 <span style="color:#EF4444;">*</span></label>
          <input id="ref-modal-title" class="input-flat text-xs w-full" placeholder="如：积极分子考察表模板" value="${editing ? _esc(editing.title || '') : ''}" />
        </div>
        <div>
          <label class="text-xs font-medium mb-1.5 block" style="color:var(--neutral-500);">描述</label>
          <textarea id="ref-modal-desc" class="input-flat text-xs w-full" rows="2" placeholder="可选：文件用途 / 说明">${editing ? _esc(editing.desc || '') : ''}</textarea>
        </div>
        <div>
          <label class="text-xs font-medium mb-1.5 block" style="color:var(--neutral-500);">${editing ? '替换文件（可选，不选则保留原文件）' : '选择文件 <span style="color:#EF4444;">*</span>'}</label>
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

    card.querySelector('#ref-modal-confirm').addEventListener('click', async () => {
      const title = card.querySelector('#ref-modal-title').value.trim();
      const desc = card.querySelector('#ref-modal-desc').value.trim();
      const fileInput = card.querySelector('#ref-modal-file');
      const file = fileInput.files && fileInput.files[0];

      if (!title) { showStatus('error', '请填写标题'); return; }
      if (!editing && !file) { showStatus('error', '请选择要上传的文件'); return; }

      const confirmBtn = card.querySelector('#ref-modal-confirm');
      confirmBtn.disabled = true;
      try {
        await ReferencesModule._saveDoc({ docId, title, desc, file });
        closeModal();
      } catch (e) {
        confirmBtn.disabled = false;
        showStatus('error', e.message || '操作失败');
      }
    });
  }

  static async _saveDoc({ docId, title, desc, file }) {
    let fileMeta = {};
    if (file) fileMeta = await ReferencesModule._uploadFile(file);

    if (docId) {
      const patch = { title, desc: desc || '' };
      if (fileMeta.filePath || fileMeta.fileData) {
        patch.fileName = fileMeta.fileName;
        patch.fileSize = fileMeta.fileSize;
        patch.format = fileMeta.format;
        patch.filePath = fileMeta.filePath || null;
        patch.fileData = fileMeta.fileData || null;
      }
      const updated = await getAdapter().branchDocs.update(docId, patch);
      ReferencesModule._branchDocs = ReferencesModule._branchDocs.map(d => d.id === docId ? updated : d);
    } else {
      const data = {
        title,
        desc: desc || '',
        cat: 'party-doc',
        fileName: fileMeta.fileName,
        fileSize: fileMeta.fileSize,
        format: fileMeta.format,
        filePath: fileMeta.filePath || null,
        fileData: fileMeta.fileData || null,
        uploadedBy: ReferencesModule._currentUser ? ReferencesModule._currentUser.personId : null,
        uploadedAt: new Date().toISOString(),
      };
      const created = await getAdapter().branchDocs.create(data);
      ReferencesModule._branchDocs = [...ReferencesModule._branchDocs, created];
    }
    ReferencesModule.render();
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
