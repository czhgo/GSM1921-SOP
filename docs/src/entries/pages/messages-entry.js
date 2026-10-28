// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  entries/pages/messages-entry.js — 「消息」中心（Task 3 · 2026-10-25）
//
//  唯一列表：公告 / 系统通知 / 私信同列在一条时间流里，只以来源徽标区分。
//  状态机（逐人）：未读 → 已读 → 已归档（用户归档可恢复；系统归档不可恢复）。
//  · 全部＝未归档（未读＋已读）；已读＝已读且未归档；已归档＝本人或系统已归档。
//  · 读口单一源 = NoticeStore.listMessages；未读计数单一源 = NoticeStore.countUnread。
//  · 可见性单一源 = canReadNotice（经 NoticeStore.list 受众门），本页不另写规则。
// ════════════════════════════════════════════════════════════════
import { renderSidebar } from '../../components/shell/sidebar.js?v=20261028e';
import { renderHeader } from '../../components/shell/header.js?v=20261028e';
import {
  NoticeStore, sendDirectMessage, canSendDirectMessage, kindOf,
} from '../../services/governance/notice.js?v=20261028e';
import { AuthStore } from '../../services/core/auth.js?v=20261028e';
import { showToast, escHtml as esc, getBasePath } from '../../core/base/utils.js?v=20261028e';
import { badgeHtml } from '../../components/ui/badges.js?v=20261028e';
import { pagerHtml } from '../../components/ui/pager.js?v=20261028e';
import { PersonPicker } from '../../components/governance/pickers.js?v=20261028e';
// S1（2026-09-12 通知详情页同款）：必须先完成数据 hydrate（loadDB / API init）再取数
import { hydrateDataSource, notifyDataLoaded } from '../../data/data-adapter.js?v=20261028e';
import { ApiAdapter } from '../../data/api-adapter.js?v=20261028e';
import { BranchService } from '../../services/core/runtime.js?v=20261028e';

renderSidebar('messages');
renderHeader('messages');

const rootEl = document.getElementById('messages-root');
const PAGE_SIZE = 20;

// ── URL 参数（?filter= / ?source= / ?open=）────────────────────────
const params = new URLSearchParams(window.location.search);
const BOXES = ['all', 'unread', 'read', 'archived'];
const SOURCES = ['all', 'announcement', 'system', 'message'];
const _boxParam = params.get('filter');
const _sourceParam = params.get('source');
const _openParam = params.get('open');
let _box = BOXES.includes(_boxParam) ? _boxParam : 'all';
let _source = SOURCES.includes(_sourceParam) ? _sourceParam : 'all';
let _page = 1;
let _q = '';
/** 「写私信」面板是否展开 ＋ 选人器实例 */
let _composerOpen = false;
let _picker = null;

// `?open=` 是深链：直接进统一详情页（列表页不再各自解释对象落点）。
if (_openParam) {
  window.location.replace(`${getBasePath()}notice.html?id=${encodeURIComponent(_openParam)}`);
}

/** hydrate：API 会话走 data-adapter init（服务端权威）；否则本地 loadDB（与 notice-entry 同款）。 */
async function _hydrateData() {
  try {
    const r = await hydrateDataSource({ apiAdapter: ApiAdapter, loadMock: () => BranchService.loadDB() });
    if (!r.ok) return;
  } catch (e) {
    console.warn('[messages-entry] 数据加载异常（仍尝试内存兜底）', e);
  } finally {
    try { notifyDataLoaded(); } catch (_) { /* 静默 */ }
  }
}

const BOX_FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'unread', label: '未读' },
  { id: 'read', label: '已读' },
  { id: 'archived', label: '已归档' },
];
const SOURCE_FILTERS = [
  { id: 'all', label: '全部来源' },
  { id: 'announcement', label: '公告' },
  { id: 'system', label: '系统' },
  { id: 'message', label: '私信' },
];
const KIND_BADGE = {
  announcement: ['公告', 'info'],
  system: ['系统', 'brand'],
  message: ['私信', 'neutral'],
};

const _fmtTime = (n) => String(n.createdAt || n.publishDate || '').slice(0, 16).replace('T', ' ');

function _rowHtml(n) {
  const [label, variant] = KIND_BADGE[kindOf(n)] || KIND_BADGE.announcement;
  const unread = !n.read && !n.ownOutbound;
  const who = n.kind === 'message' && n.counterpartName
    ? `<span class="text-gray-500">· ${esc(n.counterpartName)}</span>`
    : '';
  const archived = n.archivedForViewer;
  const systemArchived = n.archived === true;
  const action = !archived
    ? `<button type="button" class="btn-outline flex-shrink-0" data-msg-archive="${esc(n.id)}">归档</button>`
    : (systemArchived
      ? '<span class="text-xs text-gray-500 flex-shrink-0">系统归档</span>'
      : `<button type="button" class="btn-outline flex-shrink-0" data-msg-restore="${esc(n.id)}">恢复</button>`);
  return `
    <div class="flex items-start gap-3 py-3 px-4 rounded-xl bg-white hover:bg-[var(--surface-hover)] transition-colors" data-msg-row="${esc(n.id)}">
      <a class="min-w-0 flex-1" href="${getBasePath()}notice.html?id=${encodeURIComponent(n.id)}">
        <div class="flex items-center gap-2 mb-0.5 min-w-0">
          ${badgeHtml(label, variant)}
          <span class="text-sm font-medium text-gray-800 truncate">${esc(n.title || '（无标题）')}</span>
          ${unread ? '<span class="w-2 h-2 rounded-full flex-shrink-0" style="background:var(--party-red);" title="未读"></span>' : ''}
        </div>
        <p class="text-xs text-gray-500 truncate">${esc(n.content || '（无正文）')}</p>
        <p class="text-xs text-gray-500 mt-1">${esc(_fmtTime(n))} ${who}</p>
      </a>
      ${action}
    </div>`;
}

function render() {
  if (!rootEl) return;
  // 搜索框重渲染后恢复焦点与光标（否则每键入一个字都会跳出输入框）
  const restoreSearch = document.activeElement?.id === 'msg-search';
  const me = AuthStore.getCurrentUser() || {};
  if (!me.role) {
    rootEl.innerHTML = `
      <h2 class="font-title-cn text-xl font-bold text-gray-800 mb-2">消息</h2>
      <p class="text-sm text-gray-500">消息需登录后查看。请先 <a href="${getBasePath()}login.html" class="text-accent">登录</a>。</p>`;
    return;
  }

  const unread = NoticeStore.countUnread(me.personId || null);
  const list = NoticeStore.listMessages({
    viewerId: me.personId || null,
    box: _box,
    source: _source,
    q: _q,
    page: _page,
    pageSize: PAGE_SIZE,
  });
  const canSend = canSendDirectMessage(me.role);

  const boxFiltersHtml = BOX_FILTERS.map((f) => {
    const count = f.id === 'unread' && unread ? ` ${unread}` : '';
    return `<button type="button" class="btn-tab chip-option msg-filter ${_box === f.id ? 'chip-accent-on' : ''}" data-filter="${f.id}">${f.label}${count}</button>`;
  }).join('');
  const sourceFiltersHtml = SOURCE_FILTERS.map((f) => (
    `<button type="button" class="btn-tab chip-option msg-source ${_source === f.id ? 'chip-accent-on' : ''}" data-source="${f.id}">${f.label}</button>`
  )).join('');

  const empty = !list.total
    ? (_box === 'all' && _source === 'all' && !_q
      ? emptyStateHtml({ variant: 'panel', text: `还没有消息${canSend ? '——收到或发出后会在这里成线' : ''}` })
      : emptyStateHtml({ variant: 'panel', text: '当前筛选下没有消息', actionHtml: `<a href="${getBasePath()}messages.html" class="text-accent">查看全部</a>` }))
    : '';

  rootEl.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
      <div class="flex items-center gap-2">
        <h2 class="font-title-cn text-xl font-bold text-gray-800">消息</h2>
        <span class="text-xs px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">共 ${list.total} 条${unread ? ` · 未读 ${unread}` : ''}</span>
      </div>
      <div class="flex items-center gap-2">
        ${unread ? '<button type="button" id="msg-mark-all" class="btn-outline">全部已读</button>' : ''}
        ${canSend ? '<button type="button" id="msg-compose-btn" class="btn-accent-soft" style="cursor:pointer;">写私信</button>' : ''}
      </div>
    </div>
    <p class="text-xs text-gray-500 mb-3">公告、系统通知与私信按时间同列；点开即详见，私信在详情页接成会话。</p>

    ${_composerOpen && canSend ? `
    <div class="rounded-lg border border-gray-200 bg-white p-3 mb-4" id="msg-composer">
      <p class="text-xs text-gray-500 mb-2">收件人（可多选）</p>
      <div id="msg-composer-host"></div>
      <input id="msg-compose-title" class="input-flat text-xs w-full mt-2" maxlength="80" placeholder="标题" />
      <textarea id="msg-compose-content" class="input-flat text-xs w-full mt-2" rows="4" maxlength="2000" placeholder="正文"></textarea>
      <div class="flex justify-end gap-2 mt-2">
        <button type="button" id="msg-compose-cancel" class="btn-outline" style="cursor:pointer;">取消</button>
        <button type="button" id="msg-compose-send" class="btn-accent" style="cursor:pointer;">发送</button>
      </div>
    </div>` : ''}

    <div class="flex flex-wrap items-center gap-2 mb-2" id="msg-filters">${boxFiltersHtml}</div>
    <div class="flex flex-wrap items-center gap-2 mb-3">
      ${sourceFiltersHtml}
      <input id="msg-search" type="search" class="input-flat text-xs lf-kw ml-auto" style="max-width:220px;" placeholder="搜索标题 / 正文 / 对方姓名" value="${esc(_q)}" />
    </div>

    <div class="space-y-2" id="msg-list">
      ${empty}
      ${list.items.map(_rowHtml).join('')}
    </div>
    ${pagerHtml({ page: list.page, pages: list.pages, total: list.total, unit: '条' })}`;

  // 选人器（每次重渲染重建；destroy 防叠加）
  _picker?.destroy();
  _picker = null;
  const host = document.getElementById('msg-composer-host');
  if (host) {
    _picker = new PersonPicker({ mode: 'multi', placeholder: '搜索姓名或学号选择收件人' });
    _picker.render(host);
  }
  // 搜索框重渲染后恢复焦点与光标（否则每键入一个字都会跳出输入框）
  if (restoreSearch) {
    const input = document.getElementById('msg-search');
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }
}

/** 按筛选状态重渲染，并把页面状态同步到 URL（可分享 / 刷新保持） */
function _renderWithUrl() {
  const next = new URLSearchParams(window.location.search);
  if (_box === 'all') next.delete('filter'); else next.set('filter', _box);
  if (_source === 'all') next.delete('source'); else next.set('source', _source);
  next.delete('open');
  const qs = next.toString();
  const url = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
  window.history.replaceState(null, '', url);
  render();
}

rootEl?.addEventListener('click', async (e) => {
  const filterBtn = e.target.closest('.msg-filter');
  if (filterBtn) { _box = filterBtn.dataset.filter; _page = 1; _renderWithUrl(); return; }

  const sourceBtn = e.target.closest('.msg-source');
  if (sourceBtn) { _source = sourceBtn.dataset.source; _page = 1; _renderWithUrl(); return; }

  const pageBtn = e.target.closest('[data-lf-page]');
  if (pageBtn) {
    if (pageBtn.disabled) return;
    _page = Number(pageBtn.dataset.lfPage) || 1;
    render();
    return;
  }

  const archiveBtn = e.target.closest('[data-msg-archive]');
  if (archiveBtn) {
    const ok = NoticeStore.archiveForViewer(archiveBtn.dataset.msgArchive, true);
    if (!ok) { showToast('error', '归档失败：该消息已被系统归档或不存在'); return; }
    showToast('success', '已归档，可在「已归档」中恢复');
    try { notifyDataLoaded(); } catch (_) { /* 静默 */ }
    render();
    return;
  }

  const restoreBtn = e.target.closest('[data-msg-restore]');
  if (restoreBtn) {
    const ok = NoticeStore.restoreForViewer(restoreBtn.dataset.msgRestore);
    if (!ok) { showToast('error', '恢复失败：系统归档的消息不可恢复'); return; }
    showToast('success', '已恢复到「全部」');
    try { notifyDataLoaded(); } catch (_) { /* 静默 */ }
    render();
    return;
  }

  const markAllBtn = e.target.closest('#msg-mark-all');
  if (markAllBtn) {
    NoticeStore.markAllRead(AuthStore.getCurrentUser()?.personId || null);
    try { notifyDataLoaded(); } catch (_) { /* 静默 */ }
    render();
    return;
  }

  const composeBtn = e.target.closest('#msg-compose-btn');
  if (composeBtn) { _composerOpen = true; render(); return; }

  const cancelBtn = e.target.closest('#msg-compose-cancel');
  if (cancelBtn) { _composerOpen = false; render(); return; }

  const sendBtn = e.target.closest('#msg-compose-send');
  if (sendBtn) {
    const title = (document.getElementById('msg-compose-title')?.value || '').trim();
    const content = (document.getElementById('msg-compose-content')?.value || '').trim();
    const to = _picker?.getSelected() || [];
    // 校验次序＝标题 → 正文 → 收件人：**前两支不依赖选人器**（真机流可逐支验到）。
    if (!title) { showToast('error', '请填写标题'); document.getElementById('msg-compose-title')?.focus(); return; }
    if (!content) { showToast('error', '请填写正文'); document.getElementById('msg-compose-content')?.focus(); return; }
    if (!to.length) { showToast('error', '请选择收件人'); return; }
    const sent = sendDirectMessage({ title, content, toPersonIds: to });
    if (!sent) { showToast('error', '私信未发出（发送权＝全体登录成员）'); return; }
    showToast('success', `私信已发送给 ${sent} 人（仅你与对方可见）`);
    _composerOpen = false;
    _box = 'all';
    _source = 'message';
    try { notifyDataLoaded(); } catch (_) { /* 静默 */ }
    _renderWithUrl();
    return;
  }
});

rootEl?.addEventListener('input', (e) => {
  const input = e.target.closest('#msg-search');
  if (!input) return;
  _q = input.value;
  _page = 1;
  render();
});

(async () => {
  await _hydrateData();
  render();
})();
