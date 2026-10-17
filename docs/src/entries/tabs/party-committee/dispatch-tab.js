// Party dispatch reuses the notice domain; this page separates composing from sent history.
import { mockDB } from '../../../core/domain/domain.js?v=20261018a';
import { AuthStore } from '../../../services/core/auth.js?v=20261018a';
import { NoticeStore } from '../../../services/governance/notice.js?v=20261018a';
import { textField, textareaField } from '../../../components/ui/forms.js?v=20261018a';
import { showToast, escHtml as esc } from '../../../core/base/utils.js?v=20261018a';
import { renderBranchFilter, filterByBranch } from '../../../components/governance/branch-filter.js?v=20261018a';

const BRANCH_FILTER_STATE = 'pc-dispatch';
let dispatchView = 'compose';
let draft = null;

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

export function renderContent() {
  const host = document.getElementById('party-committee-tab-content');
  if (!host) return;
  host.dataset.currentTab = 'dispatch';
  const actor = AuthStore.getCurrentUser();
  if (!actor) return;
  draft = readDraft(host) || draft || {
    branchIds: (mockDB.branches || []).map((branch) => branch.id),
    pri: 'normal', title: '', content: '',
  };

  host.innerHTML = `
    <div class="party-page">
      <header class="party-page__header">
        <div class="party-page__heading">
        <p class="text-xs font-medium text-gray-500">党委 · 支委层收件</p>
        <h2 class="mt-1 font-title-cn text-xl font-bold text-gray-900">下发通知</h2>
        <p class="mt-1 text-sm text-gray-600">通知送达所选支部的支委层；收件人在通知铃铛中查看。</p>
        </div>
      </header>
      <div class="flex gap-1 border-b border-gray-200" role="tablist" aria-label="通知工作区">
        <button id="pc-dispatch-tab-compose" type="button" class="px-3 py-2 text-sm ${dispatchView === 'compose' ? 'border-b-2 border-red-700 font-semibold text-gray-900' : 'text-gray-600'}" data-dispatch-view="compose" role="tab" aria-controls="pc-dispatch-panel" aria-selected="${dispatchView === 'compose'}" tabindex="${dispatchView === 'compose' ? '0' : '-1'}">撰写</button>
        <button id="pc-dispatch-tab-history" type="button" class="px-3 py-2 text-sm ${dispatchView === 'history' ? 'border-b-2 border-red-700 font-semibold text-gray-900' : 'text-gray-600'}" data-dispatch-view="history" role="tab" aria-controls="pc-dispatch-panel" aria-selected="${dispatchView === 'history'}" tabindex="${dispatchView === 'history' ? '0' : '-1'}">已发送 <span class="ml-1 tabular-nums">${(mockDB.notices || []).filter((notice) => notice.source === 'committee').length}</span></button>
      </div>
      <section id="pc-dispatch-panel" role="tabpanel" aria-labelledby="${dispatchView === 'compose' ? 'pc-dispatch-tab-compose' : 'pc-dispatch-tab-history'}" tabindex="0">
        ${dispatchView === 'compose' ? composeHtml(draft) : historyHtml()}
      </section>
    </div>`;

  const dispatchTabs = [...host.querySelectorAll('[data-dispatch-view]')];
  dispatchTabs.forEach((button, index) => {
    button.addEventListener('click', () => {
      draft = readDraft(host) || draft;
      dispatchView = button.dataset.dispatchView === 'history' ? 'history' : 'compose';
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

  if (dispatchView === 'compose') bindComposer(host, draft);
  else renderBranchFilter(host.querySelector('#pc-dispatch-branch-filter'), {
    stateKey: BRANCH_FILTER_STATE,
    onChange: () => renderContent(),
  });
}

function composeHtml(state) {
  const branches = mockDB.branches || [];
  const selected = new Set(state.branchIds || []);
  return `
    <section aria-labelledby="dispatch-compose-title" class="card layout-shell layout-shell--form p-5">
      <h3 id="dispatch-compose-title" class="font-title-cn text-base font-bold text-gray-900">撰写一条党委通知</h3>
      <fieldset class="mt-4">
        <legend class="text-sm font-medium text-gray-800">目标支部 <span class="text-red-700">*</span></legend>
        <div class="mt-2 flex flex-wrap gap-x-5 gap-y-2">
          <label class="inline-flex items-center gap-2 py-1 text-sm text-gray-700"><input type="checkbox" data-dispatch-all ${selected.size === branches.length && branches.length ? 'checked' : ''}>全部支部</label>
          ${branches.map((branch) => `<label class="inline-flex items-center gap-2 py-1 text-sm text-gray-700"><input type="checkbox" name="dispatch-branch" value="${esc(branch.id)}" ${selected.has(branch.id) ? 'checked' : ''}>${esc(branch.config?.headerTitle || branch.name)}</label>`).join('')}
        </div>
        <p class="mt-1 text-xs text-gray-500">发送前请核对收件支部。</p>
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
    </section>`;
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

  host.querySelector('#dispatch-submit')?.addEventListener('click', () => {
    const state = readDraft(host);
    const title = state?.title.trim();
    const content = state?.content.trim();
    const branchIds = state?.branchIds || [];
    if (!branchIds.length) { showToast('error', '请选择至少一个目标支部'); return; }
    if (!title || !content) { showToast('error', '请填写标题与正文'); return; }
    branchIds.forEach((branchId) => {
      const branch = (mockDB.branches || []).find((item) => item.id === branchId);
      NoticeStore.addSystem('committee-dispatch', branchId, {
        title,
        content,
        priority: state.pri,
        branchName: branch?.config?.headerTitle || branch?.name || branchId,
      });
    });
    showToast('success', `已下发至 ${branchIds.length} 个支部的支委层`);
    draft = { branchIds: [], pri: 'normal', title: '', content: '' };
    renderContent();
  });
}

function historyHtml() {
  const rows = filterByBranch((mockDB.notices || [])
    .filter((notice) => notice.source === 'committee')
    .slice()
    .sort((a, b) => String(b.publishDate || '').localeCompare(String(a.publishDate || ''))), BRANCH_FILTER_STATE);
  return `
    <section aria-label="党委通知发送记录" class="card p-5">
      <div id="pc-dispatch-branch-filter" class="mb-3"></div>
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
      </ol>` : `<p class="border-y border-gray-200 py-8 text-sm text-gray-600" role="status">当前筛选下没有已发送通知。</p>`}
    </section>`;
}
