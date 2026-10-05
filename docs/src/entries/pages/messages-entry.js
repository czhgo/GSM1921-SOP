// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  entries/pages/messages-entry.js — 「我的私信」页（站内信收件箱）
//  2026-10-03 批次 353 · 支书 `D-748`（站内信余三项之①「收件箱页」；支书取「独立页」形态）。
//
//  口径（全部复用服务层单一源，本文件不另写规则）：
//   · **可见性**：仅发件人与收件人（`canReadNotice` ⑥，批次 348 立）⇒ 取数走 `listMyMessages()`；
//   · **发送权**：支委层 ∪ 党小组组长（`canSendDirectMessage`，批次 353 立）⇒ 「写私信」按钮按它显隐；
//   · **回复线程**：`replyToMessage()` 生成「我 → 对方」的新私信并带 `replyTo` ⇒ 一来一往成线。
//  ⚠ 与通知（公告）分列：本页**只**显示 `noticeType:'message'`，不含支部公告/系统派生通知。
// ════════════════════════════════════════════════════════════════
import { renderSidebar } from '../../components/shell/sidebar.js?v=20261005e';
import { renderHeader } from '../../components/shell/header.js?v=20261005e';
import {
  listMyMessages, sendDirectMessage, replyToMessage, canSendDirectMessage, NoticeStore,
} from '../../services/governance/notice.js?v=20261005e';
import { AuthStore } from '../../services/core/auth.js?v=20261005e';
import { getPersonName } from '../../services/member/person.js?v=20261005e';
import { showToast, escHtml as esc, getBasePath } from '../../core/base/utils.js?v=20261005e';
import { badgeHtml } from '../../components/ui/badges.js?v=20261005e';
import { PersonPicker } from '../../components/governance/pickers.js?v=20261005e';
// S1（2026-09-12 通知详情页同款）：必须先完成数据 hydrate（loadDB / API init）再取数
import { hydrateDataSource, notifyDataLoaded } from '../../data/data-adapter.js?v=20261005e';
import { ApiAdapter } from '../../data/api-adapter.js?v=20261005e';
import { BranchService } from '../../services/core/runtime.js?v=20261005e';

renderSidebar('messages');
renderHeader('messages');

const rootEl = document.getElementById('messages-root');

/** 筛选档（本页自持，重渲染后仍保持） */
let _filter = 'all';           // all | in | out | unread
/** 展开中的私信 id（点条目展开正文＋回复） */
let _expandedId = null;
/** 「写私信」面板是否展开 ＋ 选人器实例 */
let _composerOpen = false;
let _picker = null;

const FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'in', label: '收到' },
  { id: 'out', label: '发出' },
  { id: 'unread', label: '未读' },
];

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

const _fmtTime = (n) => String(n.createdAt || n.publishDate || '').slice(0, 16).replace('T', ' ');

function _messageRowHtml(m) {
  const inbound = m.direction === 'in';
  const who = getPersonName(m.counterpartId) || m.counterpartId || '—';
  const open = _expandedId === m.id;
  const unreadDot = (inbound && !m.read) ? '<span class="w-2 h-2 rounded-full bg-red-500 inline-block" title="未读"></span>' : '';
  const replyBadge = m.replyTo ? '<span class="text-[11px] text-gray-400">回复</span>' : '';
  return `
    <div class="rounded-xl border border-gray-100 bg-white" data-msg-id="${esc(m.id)}">
      <button type="button" class="btn-ghost msg-toggle w-full text-left p-3 flex items-start justify-between gap-3" style="cursor:pointer;">
        <div class="min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            ${inbound ? badgeHtml('收到', 'info') : badgeHtml('发出', 'brand')}
            <span class="text-sm font-medium text-gray-800 truncate">${esc(m.title || '（无标题）')}</span>
            ${unreadDot}${replyBadge}
          </div>
          <p class="text-xs text-gray-500 truncate">${inbound ? '来自' : '发给'} ${esc(who)} · ${esc(_fmtTime(m))}</p>
        </div>
        <span class="text-xs text-gray-400 flex-shrink-0">${open ? '收起' : '展开'}</span>
      </button>
      ${open ? `
      <div class="px-3 pb-3">
        <div class="rounded-lg bg-gray-50 p-2.5 text-xs text-gray-700 whitespace-pre-line mb-2">${esc(m.content || '（无正文）')}</div>
        <div class="flex items-end gap-2">
          <textarea class="msg-reply-input input-flat text-xs w-full" rows="2" maxlength="2000" placeholder="回复 ${esc(who)}（回信只你与对方可见）"></textarea>
          <button type="button" class="msg-reply-btn btn-accent text-xs px-3 py-1.5 flex-shrink-0" data-msg-id="${esc(m.id)}" style="cursor:pointer;">回复</button>
        </div>
      </div>` : ''}
    </div>`;
}

function render() {
  if (!rootEl) return;
  const me = AuthStore.getCurrentUser() || {};
  if (!me.role) {
    rootEl.innerHTML = `
      <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-2">我的私信</h3>
      <p class="text-sm text-gray-500">站内信需登录后查看。请先 <a href="${getBasePath()}login.html" class="text-sky-700 hover:underline">登录</a>。</p>`;
    return;
  }

  const all = listMyMessages();
  const unreadIn = all.filter((m) => m.direction === 'in' && !m.read).length;
  const rows = all.filter((m) => {
    if (_filter === 'in') return m.direction === 'in';
    if (_filter === 'out') return m.direction === 'out';
    if (_filter === 'unread') return m.direction === 'in' && !m.read;
    return true;
  });
  const canSend = canSendDirectMessage(me.role);

  rootEl.innerHTML = `
    <div class="flex items-center justify-between gap-2 mb-1.5">
      <div class="flex items-center gap-2">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">我的私信</h3>
        <span class="text-xs px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">共 ${all.length} 条${unreadIn ? ` · 未读 ${unreadIn}` : ''}</span>
      </div>
      ${canSend ? `<button id="msg-compose-btn" class="btn-accent-soft text-xs px-3 py-2" style="cursor:pointer;">写私信</button>` : ''}
    </div>
    <p class="text-xs text-gray-500 mb-3">站内信是<b>点对点</b>的：只有你与对方能看到，不进支部公告；回复即在原信下接成一线。${canSend ? '' : '（写私信限支委层与党小组组长）'}</p>

    ${_composerOpen && canSend ? `
    <div class="rounded-lg border border-gray-200 bg-white p-3 mb-4" id="msg-composer">
      <p class="text-xs text-gray-500 mb-2">收件人（可多选）</p>
      <div id="msg-composer-host"></div>
      <input id="msg-compose-title" class="input-flat text-xs w-full mt-2" maxlength="80" placeholder="标题" />
      <textarea id="msg-compose-content" class="input-flat text-xs w-full mt-2" rows="4" maxlength="2000" placeholder="正文"></textarea>
      <div class="flex justify-end gap-2 mt-2">
        <button type="button" id="msg-compose-cancel" class="btn-outline text-xs px-3 py-1.5" style="cursor:pointer;">取消</button>
        <button type="button" id="msg-compose-send" class="btn-accent text-xs px-3 py-1.5" style="cursor:pointer;">发送</button>
      </div>
    </div>` : ''}

    <div class="flex items-center gap-1.5 mb-3" id="msg-filters">
      ${FILTERS.map((f) => `<button type="button" class="btn-tab chip-option msg-filter ${_filter === f.id ? 'chip-accent-on' : ''}" data-filter="${f.id}">${f.label}${f.id === 'unread' && unreadIn ? ` ${unreadIn}` : ''}</button>`).join('')}
    </div>

    <div class="space-y-2" id="msg-list">
      ${rows.length ? rows.map(_messageRowHtml).join('') : `<p class="text-xs text-gray-400 py-6 text-center">${all.length ? '当前筛选下没有私信' : '还没有私信——收到或发出后会在这里成线'}</p>`}
    </div>`;

  // 选人器（每次重渲染重建；destroy 防叠加）
  _picker?.destroy();
  _picker = null;
  const host = document.getElementById('msg-composer-host');
  if (host) {
    _picker = new PersonPicker({ mode: 'multi', placeholder: '搜索姓名或学号选择收件人' });
    _picker.render(host);
  }
}

/** 事件委托：筛选 / 展开 / 回复 / 写私信（宿主随整页 innerHTML 重建，无监听堆积） */
rootEl?.addEventListener('click', async (e) => {
  const filterBtn = e.target.closest('.msg-filter');
  if (filterBtn) { _filter = filterBtn.dataset.filter; render(); return; }

  const composeBtn = e.target.closest('#msg-compose-btn');
  if (composeBtn) { _composerOpen = true; render(); return; }

  const cancelBtn = e.target.closest('#msg-compose-cancel');
  if (cancelBtn) { _composerOpen = false; render(); return; }

  const sendBtn = e.target.closest('#msg-compose-send');
  if (sendBtn) {
    const title = (document.getElementById('msg-compose-title')?.value || '').trim();
    const content = (document.getElementById('msg-compose-content')?.value || '').trim();
    const to = _picker?.getSelected() || [];
    // 校验次序＝标题 → 正文 → 收件人：**前两支不依赖选人器**（真机流可在不触选人器的前提下
    // 逐支验到——见 `form-loop-registry` 的 `messages-compose-validate`）。
    if (!title) { showToast('error', '请填写标题'); document.getElementById('msg-compose-title')?.focus(); return; }
    if (!content) { showToast('error', '请填写正文'); document.getElementById('msg-compose-content')?.focus(); return; }
    if (!to.length) { showToast('error', '请选择收件人'); return; }
    const sent = sendDirectMessage({ title, content, toPersonIds: to });
    if (!sent) { showToast('error', '私信未发出（发送权＝支委层 / 党小组组长）'); return; }
    showToast('success', `私信已发送给 ${sent} 人（仅你与对方可见）`);
    _composerOpen = false;
    try { notifyDataLoaded(); } catch (_) { /* 静默 */ }
    render();
    return;
  }

  const replyBtn = e.target.closest('.msg-reply-btn');
  if (replyBtn) {
    const id = replyBtn.dataset.msgId;
    const input = replyBtn.closest('div.rounded-xl')?.querySelector('.msg-reply-input');
    const content = (input?.value || '').trim();
    // 与「写私信」的正文校验**同一文案同一口径**（正文必填；不另立第二处校验点）
    if (!content) { showToast('error', '请填写正文'); input?.focus(); return; }
    const sent = replyToMessage(id, { content });
    if (!sent) { showToast('error', '回复未发出（原信不存在或对方缺失）'); return; }
    showToast('success', '回复已发出（仅你与对方可见）');
    _expandedId = null;
    try { notifyDataLoaded(); } catch (_) { /* 静默 */ }
    render();
    return;
  }

  const toggle = e.target.closest('.msg-toggle');
  if (toggle) {
    const card = toggle.closest('[data-msg-id]');
    const id = card?.dataset.msgId;
    if (!id) return;
    const wasOpen = _expandedId === id;
    _expandedId = wasOpen ? null : id;
    // 展开收件私信即视为已读（沿用既有全局 read 语义；做事即销待办由 markRead 内部负责）
    if (!wasOpen) {
      const m = listMyMessages().find((x) => x.id === id);
      if (m && m.direction === 'in' && !m.read) {
        try { NoticeStore.markRead(id); notifyDataLoaded(); } catch (err) { console.warn('[messages] 标记已读失败', err); }
      }
    }
    render();
  }
});

(async () => {
  await _hydrateData();
  render();
})();
