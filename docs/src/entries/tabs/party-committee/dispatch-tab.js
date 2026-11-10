// Party dispatch reuses the notice domain; this page separates composing from sent history,
// and (批次 537 波次 1) adds a committee-public notice subview backed by /committee/notices.
import { mockDB } from '../../../core/domain/domain.js?v=20261110b';
import { AuthStore } from '../../../services/core/auth.js?v=20261110b';
import { NoticeStore } from '../../../services/governance/notice.js?v=20261110b';
import { textField, textareaField, selectField } from '../../../components/ui/forms.js?v=20261110b';
import { showToast, escHtml as esc } from '../../../core/base/utils.js?v=20261110b';
import { renderBranchFilter, filterByBranch } from '../../../components/governance/branch-filter.js?v=20261110b';
import { renderSectionHeader, renderTabHeader } from '../../../components/shell/page-frame.js?v=20261110b';
import { emptyStateHtml, skeletonHtml } from '../../../components/ui/empty-state.js?v=20261110b';
import { badgeHtml } from '../../../components/ui/badges.js?v=20261110b';
import { getAdapter } from '../../../data/data-adapter.js?v=20261110b';

const BRANCH_FILTER_STATE = 'pc-dispatch';
const VIEW_COMPOSE = 'compose';
const VIEW_HISTORY = 'history';
const VIEW_PUBLIC = 'public';
const PUBLIC_VIEWS = [VIEW_COMPOSE, VIEW_HISTORY, VIEW_PUBLIC];
// 发布范围选项与 content-tab 的 DOC_PUBLISH_OPTIONS 同词（登录可见 / 公开），不新造标签。
const PUBLIC_NOTICE_SCOPE_OPTIONS = [
  { value: 'login', label: '登录可见' },
  { value: 'public', label: '公开' },
];
// 2026-10-24 批次 508：`view` 是**工作台壳的既有协议参数**（`view=activities` 一类旧导航落点），
//   壳在导航时会消费并清掉它 ⇒ 本页原来的 `location.search.get('view')` 永远读不到，恒落「撰写」。
//   现改为：① 读壳透传的 `ctx.navTarget.view`（布尔，仅表示旧导航落点，不是本页视图名）；
//   ② 本页视图名深链统一用 `subview`（壳不清该参数，由承载页自行消费）；
//   两者都没有 ⇒ 默认「撰写」，不再保留永远读不到的 `location.search?view=` 分支。
let dispatchView = null;
let draft = null;
// 公开通知子视图的模块级状态（列表来自服务端语义端点，不写 localStorage）。
const publicState = { rows: [], loading: false, error: '', loaded: false };
let publicDraft = null;

/** 首帧视图（只消费一次；之后由页内切换/`subview` 记忆决定） */
function _initialView(ctx) {
  const navView = ctx?.navTarget?.view;
  const fromCtx = typeof navView === 'string' ? navView : '';
  const fromQuery = new URLSearchParams(window.location.search).get('subview') || '';
  const wanted = fromCtx || fromQuery;
  return PUBLIC_VIEWS.includes(wanted) ? wanted : VIEW_COMPOSE;
}

function setDispatchView(view) {
  dispatchView = PUBLIC_VIEWS.includes(view) ? view : VIEW_COMPOSE;
  const url = new URL(window.location.href);
  // 2026-10-24 批次 508：写回与读取侧同名（`subview`）——写 `view` 会被壳清掉、下次进页读不到
  url.searchParams.set('subview', dispatchView);
  window.history.replaceState({}, '', url);
}

function readDraft(el) {
  const title = el?.querySelector('#dispatch-title');
  if (!title) return draft;
  const branches = [...el.querySelectorAll('input[name="dispatch-branch"]')];
  return {
    branchIds: branches.filter((box) => box.checked).map((box) => box.value),
    pri: el.querySelector('input[name="dispatch-pri"]:checked')?.value || 'normal',
    title: title.value || '',
    content: el.querySelector('#dispatch-content')?.value || '',
  };
}

/** 公开通知草稿回读（切换子视图前保存，避免未保存输入随重绘丢失） */
function readPublicDraft(el) {
  const titleEl = el?.querySelector('#public-notice-title');
  if (!titleEl) return publicDraft;
  return {
    title: titleEl.value || '',
    content: el.querySelector('#public-notice-content')?.value || '',
    pri: el.querySelector('input[name="public-notice-pri"]:checked')?.value || 'normal',
    publishScope: el.querySelector('#public-notice-scope')?.value || 'login',
    expires: el.querySelector('#public-notice-expires')?.value || '',
  };
}

function noticesAdapter() {
  try {
    return getAdapter()?.committeeContent?.notices || null;
  } catch (_) {
    return null;
  }
}

export function renderContent(ctx) {
  const host = document.getElementById('party-committee-tab-content');
  if (!host) return;
  host.dataset.currentTab = 'dispatch';
  // 2026-10-24 批次 508：首帧视图只消费一次（后续重渲染沿用页内当前视图，不被 URL 回拉）
  if (dispatchView == null) dispatchView = _initialView(ctx);
  const actor = AuthStore.getCurrentUser();
  if (!actor) return;
  draft = readDraft(host) || draft || {
    branchIds: [],
    pri: 'normal', title: '', content: '',
  };
  paint(host);
  // 批次 539（F-5）：公开通知计数首屏不再恒 0——先按本地已有通知初始化，再后台向服务端对齐；
  //   已在公开子视图时沿用既有刷新（带骨架 / 失败重试），其余子视图只更新计数徽标，不打断正在填写的内容。
  if (!publicState.loaded && !publicState.loading) {
    if (dispatchView === VIEW_PUBLIC) refreshPublic(host);
    else syncPublicCount(host);
  }
}

/** 公开通知计数：服务端已回包以回包为准；首帧按本地通知镜像（党委下发）初始化 */
function publicCount() {
  if (publicState.loaded) return publicState.rows.length;
  return (mockDB.notices || []).filter((notice) => notice.source === 'committee').length;
}

function paint(host) {
  const historyCount = (mockDB.notices || []).filter((notice) => notice.source === 'committee').length;
  const publicTotal = publicCount();
  host.innerHTML = `
    ${renderTabHeader({ title: '下发通知', description: '通知送达所选支部的支委层；收件人在通知铃铛中查看。公开通知另行发布到公共门厅。' })}
    <div class="page-section-stack">
      <div class="subtabs" role="tablist" aria-label="通知工作区">
        <button id="pc-dispatch-tab-compose" type="button" class="subtab" data-dispatch-view="compose" role="tab" aria-controls="pc-dispatch-panel" aria-selected="${dispatchView === 'compose'}" tabindex="${dispatchView === 'compose' ? '0' : '-1'}">撰写</button>
        <button id="pc-dispatch-tab-history" type="button" class="subtab" data-dispatch-view="history" role="tab" aria-controls="pc-dispatch-panel" aria-selected="${dispatchView === 'history'}" tabindex="${dispatchView === 'history' ? '0' : '-1'}">已发送 <span class="ml-1 tabular-nums">${historyCount}</span></button>
        <button id="pc-dispatch-tab-public" type="button" class="subtab" data-dispatch-view="public" role="tab" aria-controls="pc-dispatch-panel" aria-selected="${dispatchView === 'public'}" tabindex="${dispatchView === 'public' ? '0' : '-1'}">公开通知 <span class="ml-1 tabular-nums" data-public-count>${publicTotal}</span></button>
      </div>
      <section id="pc-dispatch-panel" role="tabpanel" aria-labelledby="${dispatchView === 'compose' ? 'pc-dispatch-tab-compose' : dispatchView === 'history' ? 'pc-dispatch-tab-history' : 'pc-dispatch-tab-public'}" tabindex="0">
        ${dispatchView === 'compose' ? composeHtml(draft) : dispatchView === 'history' ? historyHtml() : publicHtml()}
      </section>
    </div>`;

  const dispatchTabs = [...host.querySelectorAll('[data-dispatch-view]')];
  dispatchTabs.forEach((button, index) => {
    button.addEventListener('click', () => {
      draft = readDraft(host) || draft;
      publicDraft = readPublicDraft(host) || publicDraft;
      setDispatchView(button.dataset.dispatchView);
      renderContent();
    });
    button.addEventListener('keydown', (event) => {
      const nextIndex = event.key === 'ArrowRight' ? (index + 1) % dispatchTabs.length
        : event.key === 'ArrowLeft' ? (index + dispatchTabs.length - 1) % dispatchTabs.length
          : event.key === 'Home' ? 0 : event.key === 'End' ? dispatchTabs.length - 1 : -1;
      if (nextIndex < 0) return;
      event.preventDefault();
      const nextView = dispatchTabs[nextIndex].dataset.dispatchView;
      dispatchTabs[nextIndex].click();
      host.querySelector(`[data-dispatch-view="${nextView}"]`)?.focus();
    });
  });

  if (dispatchView === VIEW_COMPOSE) bindComposer(host);
  else if (dispatchView === VIEW_HISTORY) {
    renderBranchFilter(host.querySelector('#pc-dispatch-branch-filter'), {
      stateKey: BRANCH_FILTER_STATE,
      onChange: () => renderContent(),
    });
  } else bindPublic(host);
}

function composeHtml(state) {
  const branches = mockDB.branches || [];
  const selected = new Set(state.branchIds || []);
  return `
    <div class="card page-section page-section--form p-5">
      ${renderSectionHeader({ titleId: 'dispatch-compose-title', title: '撰写一条党委通知', description: '通知送达所选支部的支委层；收件人在通知铃铛中查看。', level: 3 })}
      <fieldset id="dispatch-branches" class="mt-4">
        <legend class="text-sm font-medium text-gray-800">目标支部 <span class="text-red-700">*</span></legend>
        <div class="mt-2 flex flex-wrap gap-x-5 gap-y-2">
          <label class="inline-flex items-center gap-2 py-1 text-sm text-gray-700"><input type="checkbox" data-dispatch-all ${selected.size === branches.length && branches.length ? 'checked' : ''}>全部支部</label>
          ${branches.map((branch) => `<label class="inline-flex items-center gap-2 py-1 text-sm text-gray-700"><input type="checkbox" name="dispatch-branch" value="${esc(branch.id)}" ${selected.has(branch.id) ? 'checked' : ''}>${esc(branch.config?.headerTitle || branch.name)}</label>`).join('')}
        </div>
        <p class="mt-1 text-xs text-gray-500">默认不选；请主动勾选目标支部后再发送。</p>
      </fieldset>
      <div class="mt-4 space-y-3">
        ${textField({ id: 'dispatch-title', label: '标题', required: true, value: state.title, placeholder: '通知主题', autocomplete: 'off', compact: false })}
        ${textareaField({ id: 'dispatch-content', label: '正文', required: true, value: state.content, rows: 5, placeholder: '写清工作要求、对象和完成时限。' })}
      </div>
      <fieldset class="mt-4">
        <legend class="text-sm font-medium text-gray-800">优先级</legend>
        <div class="mt-2 flex flex-wrap gap-x-5 gap-y-2">
          <label class="inline-flex items-center gap-2 py-1 text-sm text-gray-700"><input type="radio" name="dispatch-pri" value="normal" ${state.pri !== 'urgent' ? 'checked' : ''}>重要（常规）</label>
          <label class="inline-flex items-center gap-2 py-1 text-sm text-gray-700"><input type="radio" name="dispatch-pri" value="urgent" ${state.pri === 'urgent' ? 'checked' : ''}>紧急（需立即办理）</label>
        </div>
      </fieldset>
      <div class="mt-5 flex justify-end border-t border-gray-200 pt-4">
        <button id="dispatch-submit" type="button" class="btn-accent px-4 py-2 text-sm font-medium">下发通知</button>
      </div>
    </div>`;
}

function bindComposer(host) {
  const allBox = host.querySelector('[data-dispatch-all]');
  const branchBoxes = [...host.querySelectorAll('input[name="dispatch-branch"]')];
  const updateAll = () => {
    if (allBox) allBox.checked = branchBoxes.length > 0 && branchBoxes.every((box) => box.checked);
    draft = readDraft(host);
  };
  allBox?.addEventListener('change', () => {
    branchBoxes.forEach((box) => { box.checked = allBox.checked; });
    updateAll();
  });
  branchBoxes.forEach((box) => box.addEventListener('change', updateAll));
  host.querySelector('#dispatch-title')?.addEventListener('input', () => { draft = readDraft(host); });
  host.querySelector('#dispatch-content')?.addEventListener('input', () => { draft = readDraft(host); });
  host.querySelectorAll('input[name="dispatch-pri"]').forEach((radio) => radio.addEventListener('change', () => { draft = readDraft(host); }));

  host.querySelector('#dispatch-submit')?.addEventListener('click', async (event) => {
    const state = readDraft(host);
    const title = state?.title.trim();
    const content = state?.content.trim();
    const branchIds = state?.branchIds || [];
    if (!branchIds.length) { showToast('error', '请选择至少一个目标支部'); return; }
    if (!title || !content) { showToast('error', '请填写标题与正文'); return; }

    // 批次 539（F-5）：逐支部等 addSystem 回包，按结果提示——回包前不得宣称「已下发」。
    //   addSystem 在 mock 形态同步返回对象、API 形态返回 Promise（失败 null），统一 await。
    const submitBtn = event.currentTarget;
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '下发中…'; }
    const results = await Promise.all(branchIds.map((branchId) => {
      const branch = (mockDB.branches || []).find((item) => item.id === branchId);
      return Promise.resolve()
        .then(() => NoticeStore.addSystem('committee-dispatch', branchId, {
          title,
          content,
          priority: state.pri,
          branchName: branch?.config?.headerTitle || branch?.name || branchId,
        }))
        .catch(() => null);
    }));
    const failedIds = branchIds.filter((_, index) => !results[index]);
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = '下发通知'; }

    if (!failedIds.length) {
      showToast('success', `已下发至 ${branchIds.length} 个支部的支委层`);
      draft = { branchIds: [], pri: 'normal', title: '', content: '' };
      setDispatchView('history');
      renderContent();
      return;
    }
    // 有失败：不改口成成功；保留失败支部供重试，成功的支部不再重复勾选。
    draft = { ...state, branchIds: failedIds };
    if (failedIds.length === branchIds.length) {
      showToast('error', `下发失败：${failedIds.length} 个支部未送达，请重试`);
    } else {
      showToast('error', `已送达 ${branchIds.length - failedIds.length} 个支部；${failedIds.length} 个失败，请重试`);
    }
    renderContent();
  });
}

function historyHtml() {
  const rows = filterByBranch((mockDB.notices || [])
    .filter((notice) => notice.source === 'committee')
    .slice()
    .sort((a, b) => String(b.publishDate || '').localeCompare(String(a.publishDate || ''))), BRANCH_FILTER_STATE);
  return `
    <section id="dispatch-history" aria-label="党委通知发送记录" class="card p-5">
      ${renderSectionHeader({ title: '发送记录', level: 3 })}
      <div id="pc-dispatch-branch-filter" class="mb-3 mt-4"></div>
      ${rows.length ? `<ol class="divide-y divide-gray-200 border-y border-gray-200">
        ${rows.map((notice) => `
          <li class="py-4">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span class="text-xs font-medium ${notice.priority === 'urgent' ? 'text-amber-800' : 'text-blue-800'}">${notice.priority === 'urgent' ? '紧急' : '重要'}</span>
              <span class="text-xs text-gray-600">${esc(notice.branchName || notice.branchId || '支部')}</span>
              <time class="ml-auto text-xs tabular-nums text-gray-500">${esc(notice.publishDate || '')}</time>
            </div>
            <h3 class="mt-1 text-sm font-semibold text-gray-900">${esc(notice.title || '无标题')}</h3>
            <p class="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-700">${esc(notice.content || '')}</p>
          </li>`).join('')}
      </ol>` : emptyStateHtml({ variant: 'inline', text: '当前筛选下没有已发送通知' })}
    </section>`;
}

// ════════════════════════════════════════════════════════════════
//  公开通知子视图（批次 537 波次 1）：撰写 ＋ 已发布列表（含撤下）
//  写口 = api-adapter::committeeContent.notices（服务端 committee-notices.js，仅 party-staff）。
// ════════════════════════════════════════════════════════════════

function publicHtml() {
  const state = publicDraft || {};
  return `
    <div class="space-y-4">
      <section class="card p-5" aria-label="党委公开通知列表">
        ${renderSectionHeader({ title: '已发布公开通知', level: 3 })}
        <p class="mt-1 text-sm text-gray-600">「公开」范围会进入未登录公共门厅，到期自动下线；「登录可见」只对登录成员展示。</p>
        <div class="mt-3">${publicListHtml()}</div>
      </section>
      <div class="card page-section page-section--form p-5">
        ${renderSectionHeader({ titleId: 'public-notice-compose-title', title: '撰写一条党委公开通知', description: '归属、受众与发布时间由服务端固定；公开范围须设置未来有效期。', level: 3 })}
        <div class="mt-4 space-y-3">
          ${textField({ id: 'public-notice-title', label: '标题', required: true, value: state.title || '', placeholder: '通知主题', autocomplete: 'off' })}
          ${textareaField({ id: 'public-notice-content', label: '正文', required: true, value: state.content || '', rows: 5, placeholder: '写清通知事项、对象和时限。' })}
        </div>
        <fieldset class="mt-4">
          <legend class="text-sm font-medium text-gray-800">优先级</legend>
          <div class="mt-2 flex flex-wrap gap-x-5 gap-y-2">
            <label class="inline-flex items-center gap-2 py-1 text-sm text-gray-700"><input type="radio" name="public-notice-pri" value="normal" ${state.pri !== 'urgent' ? 'checked' : ''}>重要（常规）</label>
            <label class="inline-flex items-center gap-2 py-1 text-sm text-gray-700"><input type="radio" name="public-notice-pri" value="urgent" ${state.pri === 'urgent' ? 'checked' : ''}>紧急（需立即办理）</label>
          </div>
        </fieldset>
        <div class="mt-1 grid gap-3 sm:grid-cols-2">
          ${selectField({ id: 'public-notice-scope', label: '发布范围', options: PUBLIC_NOTICE_SCOPE_OPTIONS, value: state.publishScope === 'public' ? 'public' : 'login' })}
          ${textField({ id: 'public-notice-expires', label: '公开到期时间', type: 'datetime-local', value: state.expires || '', hint: '选择「公开」时必填，须晚于当前时间' })}
        </div>
        <div class="mt-5 flex justify-end border-t border-gray-200 pt-4">
          <button id="public-notice-submit" type="button" class="btn-accent px-4 py-2 text-sm font-medium">发布</button>
        </div>
      </div>
    </div>`;
}

function publicListHtml() {
  // 加载骨架单一源（empty-state.js::skeletonHtml）；空态与错误态一律 emptyStateHtml
  if (publicState.loading) return skeletonHtml(3, { variant: 'list', ariaText: '正在加载公开通知…' });
  if (publicState.error) {
    return emptyStateHtml({
      variant: 'panel',
      text: `公开通知加载失败：${publicState.error}`,
      actionHtml: '<button type="button" class="btn-outline btn-sm" data-public-retry>重试</button>',
    });
  }
  if (!publicState.rows.length) {
    return emptyStateHtml({ variant: 'panel', text: '暂无公开通知 · 下一步：在下方撰写第一条' });
  }
  return `<div class="divide-y divide-gray-200 border-y border-gray-200">${publicState.rows.map(publicNoticeRowHtml).join('')}</div>`;
}

function publicNoticeRowHtml(row) {
  const isPublic = (row.publishScope || 'login') === 'public';
  const title = row.title || '无标题';
  return `
    <div class="py-3" data-public-id="${esc(row.id)}">
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span class="text-body-sm font-medium ${row.priority === 'urgent' ? 'text-amber-800' : 'text-blue-800'}">${row.priority === 'urgent' ? '紧急' : '重要'}</span>
        ${badgeHtml(isPublic ? '公开' : '登录可见', isPublic ? 'brand' : 'neutral')}
        <time class="text-body-sm tabular-nums text-gray-500">${esc(row.publishDate || '')}</time>
        ${isPublic ? `<button type="button" class="btn-outline btn-sm ml-auto" data-public-withdraw="${esc(row.id)}">撤下公开</button>` : ''}
      </div>
      <h3 class="mt-1 text-sm font-semibold text-gray-900">${esc(title)}</h3>
      <p class="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-700">${esc(row.content || '')}</p>
      ${isPublic && row.publishExpiresAt ? `<p class="mt-1 text-body-sm text-gray-500">公开到期：${esc(String(row.publishExpiresAt).slice(0, 10))}</p>` : ''}
    </div>`;
}

/** 后台对齐公开通知计数（不抢占当前子视图）：回包后只改徽标，不整页重绘、不打断填写 */
async function syncPublicCount(host) {
  const group = noticesAdapter();
  if (!group) return;
  publicState.loading = true;
  try {
    const rows = await group.list();
    publicState.rows = Array.isArray(rows) ? rows : [];
    publicState.loaded = true;
    publicState.error = '';
  } catch (error) {
    // 计数失败不覆盖已显示的内容；公开子视图自身仍按 refreshPublic 的错误态重试
    publicState.error = (error && error.message) ? error.message : '加载失败';
  } finally {
    publicState.loading = false;
    const badge = host.querySelector('[data-public-count]');
    if (badge) badge.textContent = String(publicCount());
  }
}

async function refreshPublic(host) {
  const group = noticesAdapter();
  publicState.loading = true;
  publicState.error = '';
  paint(host);
  if (!group) {
    publicState.loading = false;
    publicState.error = '需接入服务端后使用';
    paint(host);
    return;
  }
  try {
    const rows = await group.list();
    publicState.rows = Array.isArray(rows) ? rows : [];
    publicState.loaded = true;
  } catch (error) {
    publicState.error = (error && error.message) ? error.message : '加载失败';
    showToast('error', `公开通知加载失败：${publicState.error}`);
  } finally {
    publicState.loading = false;
    paint(host);
  }
}

function bindPublic(host) {
  ['#public-notice-title', '#public-notice-content', '#public-notice-expires'].forEach((selector) => {
    host.querySelector(selector)?.addEventListener('input', () => { publicDraft = readPublicDraft(host); });
  });
  host.querySelector('#public-notice-scope')?.addEventListener('change', () => { publicDraft = readPublicDraft(host); });
  host.querySelectorAll('input[name="public-notice-pri"]').forEach((radio) => {
    radio.addEventListener('change', () => { publicDraft = readPublicDraft(host); });
  });
  host.querySelector('[data-public-retry]')?.addEventListener('click', () => refreshPublic(host));
  host.querySelector('#public-notice-submit')?.addEventListener('click', () => submitPublicNotice(host));
  host.querySelectorAll('[data-public-withdraw]').forEach((button) => {
    button.addEventListener('click', () => withdrawPublicNotice(button.dataset.publicWithdraw, host));
  });
}

async function submitPublicNotice(host) {
  const group = noticesAdapter();
  if (!group) { showToast('error', '公开通知需接入服务端后使用'); return; }
  const state = readPublicDraft(host) || {};
  const title = String(state.title || '').trim();
  const content = String(state.content || '').trim();
  if (!title || !content) { showToast('error', '请填写标题与正文'); return; }
  const publishScope = state.publishScope === 'public' ? 'public' : 'login';
  let publishExpiresAt = null;
  if (publishScope === 'public') {
    const ts = state.expires ? Date.parse(state.expires) : NaN;
    if (!Number.isFinite(ts)) { showToast('error', '公开可见须设置到期时间'); return; }
    if (ts <= Date.now()) { showToast('error', '公开到期时间须晚于当前时间'); return; }
    publishExpiresAt = new Date(ts).toISOString();
  }
  try {
    await group.create({ title, content, priority: state.pri === 'urgent' ? 'urgent' : 'normal', publishScope, publishExpiresAt });
    showToast('success', publishScope === 'public' ? '已发布到公共门厅' : '已发布（登录可见）');
    publicDraft = null;
    await refreshPublic(host);
  } catch (error) {
    showToast('error', (error && error.message) ? error.message : '发布失败');
  }
}

async function withdrawPublicNotice(id, host) {
  const group = noticesAdapter();
  if (!group) return;
  try {
    await group.withdraw(id);
    showToast('success', '已撤下公开，改为登录可见');
    await refreshPublic(host);
  } catch (error) {
    showToast('error', (error && error.message) ? error.message : '撤下失败');
  }
}
