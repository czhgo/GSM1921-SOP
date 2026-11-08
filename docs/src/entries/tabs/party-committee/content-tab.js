// role: [工程师]+[AI]
// entries/tabs/party-committee/content-tab.js — 党委工作台「院级内容」（2026-11-08 批次 536 · spec Task 8）
//
// 一个页签、两个子视图：
//   · 活动：党委自有活动（ownerScope='committee'）的列表 / 撰写 / 编辑 / 公开范围 / 下发 / 取消 / 归档；
//   · 资料：院级资料（branch_docs 中 ownerScope='committee'）的列表 / 上传 / 编辑 / 发布范围 / 撤下。
// 为什么合并进一个页签：两类内容都属于「党委自有内容 + 发布面」的同一治理对象，分开注册会让党委台
//   页签 3 → 5，首屏密度与导航重复插标同时上升；合并后各自的列表与编辑入口仍独立。
//
// 数据源：api-adapter 的 `committeeContent` 组（服务端 server/routes/resources/semantic-routes.js）。
//   写口权限门 = requireRole(PARTY_STAFF_ROLE)，归属 / 版本 / 发布留痕由服务端维护，本页不传。
// 子视图协议：`?subview=activities|docs`（与 dispatch-tab 同协议；工作台壳不清该参数）。
// 输入控件只经 components/ui/forms.js（具名导出）；目标支部复选框沿用 dispatch-tab 的既有写法。

import { mockDB } from '../../../core/domain/domain.js?v=20261108a';
import { ACTIVITY_SUBTYPES } from '../../../core/domain/constants.js?v=20261108a';
import { getAdapter, getDataSource, getApiBaseUrl, getAuthToken } from '../../../data/data-adapter.js?v=20261108a';
import { textField, textareaField, selectField, dateField, fileField } from '../../../components/ui/forms.js?v=20261108a';
import { emptyStateHtml, skeletonHtml } from '../../../components/ui/empty-state.js?v=20261108a';
import { badgeHtml } from '../../../components/ui/badges.js?v=20261108a';
import { renderTabHeader, renderCardHeader } from '../../../components/shell/page-frame.js?v=20261108a';
import { confirmDanger } from '../../../components/ui/modal.js?v=20261108a';
import { showToast, escHtml as esc, smoothScroll } from '../../../core/base/utils.js?v=20261108a';

const HOST_ID = 'party-committee-tab-content';
const VIEW_ACTIVITIES = 'activities';
const VIEW_DOCS = 'docs';

const STATUS_META = {
  draft: { label: '草稿', variant: 'neutral' },
  'pending-approval': { label: '待批', variant: 'warning' },
  published: { label: '已发布', variant: 'success' },
  ongoing: { label: '进行中', variant: 'info' },
  completed: { label: '已结束', variant: 'neutral' },
  cancelled: { label: '已取消', variant: 'danger' },
};

const PUBLISH_LABELS = { branch: '支部内部', login: '登录可见', public: '公开' };
const ACTIVITY_PUBLISH_OPTIONS = [
  { value: 'branch', label: '支部内部' },
  { value: 'login', label: '登录可见' },
  { value: 'public', label: '公开' },
];
// 院级资料只允许登录可见 / 公开（服务端同口径：不按支部发布）。
const DOC_PUBLISH_OPTIONS = [
  { value: 'login', label: '登录可见' },
  { value: 'public', label: '公开' },
];
const DOC_ACCEPT = '.jpg,.jpeg,.png,.pdf,.doc,.docx,.xlsx,.mp4';

// 模块级状态：子视图、数据、加载 / 错误、编辑对象与草稿。
// 草稿只活在本次页内（切换子视图时从 DOM 回读），不写 localStorage。
const state = {
  subview: null,
  activities: [],
  documents: [],
  branches: [],
  loading: false,
  error: '',
  editingActivityId: '',
  editingDocId: '',
  activityDraft: null,
  docDraft: null,
};

function contentAdapter() {
  try {
    return getAdapter()?.committeeContent || null;
  } catch (_) {
    return null;
  }
}

function writeErrorMessage(error) {
  return (error && error.message) ? error.message : '操作失败';
}

function toLocalInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatSize(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function formatDay(value) {
  return String(value || '').slice(0, 10) || '—';
}

/** 首帧子视图（只消费一次；之后由页内切换 / `subview` 记忆决定） */
function initialSubview(ctx) {
  const navView = ctx?.navTarget?.view;
  const fromCtx = typeof navView === 'string' ? navView : '';
  let fromQuery = '';
  try {
    fromQuery = new URLSearchParams(window.location.search).get('subview') || '';
  } catch (_) { /* 非浏览器环境忽略 */ }
  return (fromCtx || fromQuery) === VIEW_DOCS ? VIEW_DOCS : VIEW_ACTIVITIES;
}

function setSubview(view) {
  state.subview = view === VIEW_DOCS ? VIEW_DOCS : VIEW_ACTIVITIES;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('subview', state.subview);
    window.history.replaceState({}, '', url);
  } catch (_) { /* 非浏览器环境忽略 */ }
}

function branchName(branchId) {
  const branch = (state.branches || []).find((item) => item && item.id === branchId);
  return branch?.config?.headerTitle || branch?.name || branchId;
}

function targetBranchLabel(targetBranchIds) {
  const ids = Array.isArray(targetBranchIds) ? targetBranchIds : [];
  if (!ids.length) return '未设目标支部';
  if (ids.includes('all')) return '全部支部';
  return ids.map(branchName).join('、');
}

function activityStatusMeta(row) {
  if (row?.archived === true) return { label: '已归档', variant: 'neutral' };
  return STATUS_META[row?.status] || { label: row?.status || '未知', variant: 'neutral' };
}

// ════════════════════════════════════════════════════════════════
//  渲染入口
// ════════════════════════════════════════════════════════════════

export function renderContent(ctx = {}) {
  const host = document.getElementById(HOST_ID);
  if (!host) return;
  host.dataset.currentTab = 'gov-content';
  if (state.subview == null) state.subview = initialSubview(ctx);
  paint(host);
  // 每次进入页签都重拉：党委内容会被「下发 / 采用 / 撤下」等动作从别处改变，缓存会显示旧状态。
  if (!state.loading) refresh(host);
}

async function refresh(host) {
  state.loading = true;
  state.error = '';
  paint(host);
  try {
    const group = contentAdapter();
    if (!group) throw new Error('院级内容需接入服务端后使用');
    const branchTask = (async () => {
      try {
        const list = await getAdapter().branches.list();
        return Array.isArray(list) ? list : [];
      } catch (_) {
        return mockDB.branches || [];
      }
    })();
    const [activities, documents, branches] = await Promise.all([
      group.activities.list(),
      group.documents.list(),
      branchTask,
    ]);
    state.activities = Array.isArray(activities) ? activities : [];
    state.documents = Array.isArray(documents) ? documents : [];
    state.branches = Array.isArray(branches) && branches.length ? branches : (mockDB.branches || []);
  } catch (error) {
    state.error = writeErrorMessage(error);
    showToast('error', `院级内容加载失败：${state.error}`);
  } finally {
    state.loading = false;
    paint(host);
  }
}

function paint(host) {
  const isActivities = state.subview === VIEW_ACTIVITIES;
  host.innerHTML = `
    ${renderTabHeader({ title: '院级内容', description: '党委活动与院级资料；活动可下发支部书记采用。' })}
    <div class="page-section-stack">
      <div class="subtabs" role="tablist" aria-label="院级内容视图">
        <button id="pc-content-tab-activities" type="button" class="subtab" data-content-view="activities" role="tab" aria-controls="pc-content-panel" aria-selected="${isActivities}" tabindex="${isActivities ? '0' : '-1'}">活动 <span class="ml-1 tabular-nums">${state.activities.length}</span></button>
        <button id="pc-content-tab-docs" type="button" class="subtab" data-content-view="docs" role="tab" aria-controls="pc-content-panel" aria-selected="${!isActivities}" tabindex="${isActivities ? '-1' : '0'}">资料 <span class="ml-1 tabular-nums">${state.documents.length}</span></button>
      </div>
      <section id="pc-content-panel" role="tabpanel" aria-labelledby="${isActivities ? 'pc-content-tab-activities' : 'pc-content-tab-docs'}" tabindex="0">
        ${panelHtml()}
      </section>
    </div>`;

  bindSubtabs(host);
  host.querySelector('[data-content-retry]')?.addEventListener('click', () => refresh(host));
  if (isActivities) bindActivities(host);
  else bindDocs(host);
}

function panelHtml() {
  if (state.error) {
    return `<div class="card p-5" role="alert">
      <p class="text-sm text-gray-700">加载失败：${esc(state.error)}</p>
      <div class="mt-3"><button type="button" class="btn-outline btn-sm" data-content-retry>重试</button></div>
    </div>`;
  }
  if (state.loading) {
    return `<div class="card p-5">${skeletonHtml(4, { variant: 'list', ariaText: '正在加载院级内容…' })}</div>`;
  }
  return state.subview === VIEW_ACTIVITIES ? activitiesHtml() : docsHtml();
}

function bindSubtabs(host) {
  const tabs = [...host.querySelectorAll('[data-content-view]')];
  tabs.forEach((button, index) => {
    button.addEventListener('click', () => {
      saveDraftsFromDom(host);
      setSubview(button.dataset.contentView);
      paint(host);
    });
    button.addEventListener('keydown', (event) => {
      const nextIndex = event.key === 'ArrowRight' ? (index + 1) % tabs.length
        : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
          : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
      if (nextIndex < 0) return;
      event.preventDefault();
      const nextView = tabs[nextIndex].dataset.contentView;
      tabs[nextIndex].click();
      host.querySelector(`[data-content-view="${nextView}"]`)?.focus();
    });
  });
}

/** 切换子视图前回读草稿（避免未保存输入随重绘丢失） */
function saveDraftsFromDom(host) {
  if (state.subview === VIEW_ACTIVITIES && host.querySelector('#pc-activity-title')) {
    state.activityDraft = readActivityForm(host);
  }
  if (state.subview === VIEW_DOCS && host.querySelector('#pc-doc-title')) {
    state.docDraft = readDocForm(host);
  }
}

// ════════════════════════════════════════════════════════════════
//  活动子视图
// ════════════════════════════════════════════════════════════════

function activitiesHtml() {
  const rows = state.activities;
  return `
    <div class="space-y-4">
      <div class="card p-5">
        ${renderCardHeader({ title: '党委活动', titleId: 'pc-content-activity-list', meta: `${rows.length} 条` })}
        ${rows.length
          ? `<div class="divide-y divide-gray-200 border-y border-gray-200">${rows.map(activityRowHtml).join('')}</div>`
          : emptyStateHtml({ variant: 'inline', text: '暂无党委活动 · 下一步：在下方撰写第一条' })}
      </div>
      ${activityFormHtml()}
    </div>`;
}

function activityRowHtml(row) {
  const status = activityStatusMeta(row);
  const scope = PUBLISH_LABELS[row.publishScope || 'branch'] || row.publishScope;
  const title = row.title || '未命名活动';
  return `
    <div class="py-3" data-activity-row="${esc(row.id)}">
      <div class="flex flex-wrap items-start gap-x-3 gap-y-2">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h4 class="text-sm font-semibold text-gray-900">${esc(title)}</h4>
            ${badgeHtml(status.label, status.variant)}
            ${badgeHtml(scope, row.publishScope === 'public' ? 'brand' : 'neutral')}
            <span class="text-sm text-gray-500 tabular-nums">v${Number(row.contentVersion) || 1}</span>
          </div>
          <p class="mt-1 text-sm text-gray-600">${esc(row.date || '未定日期')} · ${esc(targetBranchLabel(row.targetBranchIds))}</p>
        </div>
        <div class="card-head__actions" role="group" aria-label="「${esc(title)}」的操作">
          <button type="button" class="btn-outline btn-sm" data-activity-act="edit" data-id="${esc(row.id)}">编辑</button>
          <button type="button" class="btn-outline btn-sm" data-activity-act="dispatch" data-id="${esc(row.id)}">下发</button>
          <button type="button" class="btn-outline btn-sm" data-activity-act="publish" data-id="${esc(row.id)}">公开设置</button>
          ${row.publishScope === 'public'
            ? `<button type="button" class="btn-outline btn-sm" data-activity-act="unpublish" data-id="${esc(row.id)}">撤下公开</button>`
            : ''}
          <button type="button" class="btn-danger btn-sm" data-activity-act="cancel" data-id="${esc(row.id)}" ${row.status === 'cancelled' ? 'disabled' : ''}>取消</button>
          <button type="button" class="btn-outline btn-sm" data-activity-act="archive" data-id="${esc(row.id)}" ${row.archived === true ? 'disabled' : ''}>归档</button>
        </div>
      </div>
    </div>`;
}

function activityFormHtml() {
  const editing = Boolean(state.editingActivityId);
  const draft = state.activityDraft || {};
  const targets = Array.isArray(draft.targetBranchIds) ? draft.targetBranchIds : [];
  const allChecked = targets.includes('all');
  const selected = new Set(targets);
  const branches = state.branches || [];
  const headActions = editing
    ? '<button type="button" class="btn-outline btn-sm" data-activity-form="cancel-edit">取消编辑</button>'
    : '';
  return `
    <div class="card p-5" id="pc-content-activity-form-card">
      ${renderCardHeader({ title: editing ? '编辑党委活动' : '撰写党委活动', titleId: 'pc-content-activity-form', actions: headActions })}
      <div id="pc-content-activity-form">
        ${textField({ id: 'pc-activity-title', label: '标题', required: true, value: draft.title || '', placeholder: '活动主题', autocomplete: 'off' })}
        <div class="grid gap-3 sm:grid-cols-2">
          ${selectField({ id: 'pc-activity-type', label: '类型', options: ACTIVITY_SUBTYPES.map((type) => ({ value: type, label: type })), value: draft.type || ACTIVITY_SUBTYPES[0] })}
          ${dateField({ id: 'pc-activity-date', label: '日期', value: draft.date || '' })}
        </div>
        ${textField({ id: 'pc-activity-location', label: '地点', value: draft.location || '', placeholder: '线下地点或线上会议方式' })}
        ${textareaField({ id: 'pc-activity-description', label: '描述', value: draft.description || '', rows: 3, placeholder: '活动内容与工作要求' })}
        ${textareaField({ id: 'pc-activity-summary', label: '公开摘要', value: draft.publicSummary || '', rows: 2, hint: '公开可见时必填；不得写入成员个人数据' })}
        <fieldset class="mt-1">
          <legend class="text-sm font-medium text-gray-800">目标支部 <span class="text-red-700">*</span></legend>
          <div class="mt-2 flex flex-wrap gap-x-5 gap-y-2">
            <label class="inline-flex items-center gap-2 py-1 text-sm text-gray-700"><input type="checkbox" data-target-all ${allChecked ? 'checked' : ''}>全部支部</label>
            ${branches.map((branch) => `<label class="inline-flex items-center gap-2 py-1 text-sm text-gray-700"><input type="checkbox" data-target-branch value="${esc(branch.id)}" ${selected.has(branch.id) ? 'checked' : ''}>${esc(branch.config?.headerTitle || branch.name || branch.id)}</label>`).join('')}
          </div>
        </fieldset>
        <div class="grid gap-3 sm:grid-cols-2 mt-1">
          ${selectField({ id: 'pc-activity-scope', label: '公开范围', options: ACTIVITY_PUBLISH_OPTIONS, value: draft.publishScope || 'branch' })}
          ${textField({ id: 'pc-activity-expires', label: '公开到期时间', type: 'datetime-local', value: toLocalInputValue(draft.publishExpiresAt), hint: '选择「公开」时必填，须晚于当前时间' })}
        </div>
        <div class="mt-4 flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-4">
          ${editing ? '<button type="button" class="btn-outline btn-sm" data-activity-form="cancel-edit">取消编辑</button>' : ''}
          <button type="button" class="btn-outline btn-sm" data-activity-form="save-dispatch">保存并下发</button>
          <button type="button" class="btn-accent btn-sm" data-activity-form="save">保存</button>
        </div>
      </div>
    </div>`;
}

function readActivityForm(host) {
  const value = (selector) => host.querySelector(selector)?.value?.trim() || '';
  const allBox = host.querySelector('[data-target-all]');
  const branchIds = [...host.querySelectorAll('[data-target-branch]')]
    .filter((box) => box.checked).map((box) => box.value);
  const expiresRaw = value('#pc-activity-expires');
  let expiresIso = '';
  if (expiresRaw) {
    const ts = Date.parse(expiresRaw);
    if (Number.isFinite(ts)) expiresIso = new Date(ts).toISOString();
  }
  return {
    title: value('#pc-activity-title'),
    type: value('#pc-activity-type') || ACTIVITY_SUBTYPES[0],
    date: value('#pc-activity-date'),
    location: value('#pc-activity-location'),
    description: value('#pc-activity-description'),
    publicSummary: value('#pc-activity-summary'),
    targetBranchIds: allBox?.checked ? ['all'] : branchIds,
    publishScope: value('#pc-activity-scope') || 'branch',
    publishExpiresAt: expiresIso,
    publishExpiresAtRaw: expiresRaw,
  };
}

function validateActivity(draft) {
  if (!draft.title) return '请填写活动标题';
  if (!draft.targetBranchIds.length) return '请选择至少一个目标支部';
  if (draft.publishScope === 'public') {
    if (!draft.publicSummary) return '公开可见须填写公开摘要';
    if (!draft.publishExpiresAtRaw) return '公开可见须设置公开到期时间';
    const ts = Date.parse(draft.publishExpiresAtRaw);
    if (!Number.isFinite(ts) || ts <= Date.now()) return '公开到期时间须晚于当前时间';
  }
  return '';
}

function findActivity(id) {
  return state.activities.find((row) => row && String(row.id) === String(id)) || null;
}

function bindActivities(host) {
  const allBox = host.querySelector('[data-target-all]');
  const branchBoxes = [...host.querySelectorAll('[data-target-branch]')];
  allBox?.addEventListener('change', () => {
    branchBoxes.forEach((box) => { box.checked = allBox.checked; });
  });
  branchBoxes.forEach((box) => box.addEventListener('change', () => {
    if (allBox) allBox.checked = branchBoxes.length > 0 && branchBoxes.every((item) => item.checked);
  }));

  host.querySelectorAll('[data-activity-act]').forEach((button) => {
    button.addEventListener('click', () => handleActivityAction(button, host));
  });
  host.querySelectorAll('[data-activity-form]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.activityForm;
      if (action === 'cancel-edit') {
        state.editingActivityId = '';
        state.activityDraft = null;
        paint(host);
        return;
      }
      saveActivity(host, { dispatchAfter: action === 'save-dispatch' });
    });
  });
}

function loadActivityForEdit(row, host, { focusPublication = false } = {}) {
  state.editingActivityId = String(row.id);
  state.activityDraft = { ...row };
  paint(host);
  const card = host.querySelector('#pc-content-activity-form-card');
  if (focusPublication) {
    host.querySelector('#pc-activity-scope')?.focus();
    smoothScroll(card, { block: 'start' });
  } else {
    smoothScroll(card, { block: 'start' });
    host.querySelector('#pc-activity-title')?.focus();
  }
}

async function handleActivityAction(button, host) {
  const row = findActivity(button.dataset.id);
  if (!row) return;
  const action = button.dataset.activityAct;
  if (action === 'edit') { loadActivityForEdit(row, host); return; }
  if (action === 'publish') { loadActivityForEdit(row, host, { focusPublication: true }); return; }
  if (action === 'dispatch') { await dispatchActivity(row, host); return; }
  if (action === 'unpublish') { await unpublishActivity(row, host); return; }
  if (action === 'cancel') { await cancelActivity(row, host); return; }
  if (action === 'archive') { await archiveActivity(row, host); return; }
}

async function saveActivity(host, { dispatchAfter = false } = {}) {
  const group = contentAdapter();
  if (!group) { showToast('error', '院级内容需接入服务端后使用'); return; }
  const draft = readActivityForm(host);
  const invalid = validateActivity(draft);
  if (invalid) { showToast('error', invalid); return; }
  const payload = {
    title: draft.title,
    type: draft.type,
    date: draft.date,
    location: draft.location,
    description: draft.description,
    publicSummary: draft.publicSummary,
    targetBranchIds: draft.targetBranchIds,
    publishScope: draft.publishScope,
    publishExpiresAt: draft.publishExpiresAt || null,
  };
  const editingId = state.editingActivityId;
  try {
    const saved = editingId
      ? await group.activities.update(editingId, payload)
      : await group.activities.create({ ...payload, status: 'published' });
    const activityId = saved?.id || editingId;
    state.editingActivityId = '';
    state.activityDraft = null;
    showToast('success', editingId ? '已保存修改' : '已创建党委活动');
    await refresh(host);
    if (dispatchAfter && activityId) await dispatchActivity({ id: activityId, title: payload.title }, host);
  } catch (error) {
    showToast('error', writeErrorMessage(error));
  }
}

async function dispatchActivity(row, host) {
  const group = contentAdapter();
  if (!group) return;
  const confirmed = await confirmDanger({
    id: 'committee-activity-dispatch',
    title: `下发「${row.title || '未命名活动'}」`,
    bodyHtml: '<p class="text-sm text-gray-700">把该活动下发到目标支部：每个支部收到一条「党委活动」通知，由支书 / 副支书查看并决定是否采用。<br>同版本重复下发不会重复通知；修改内容后再次下发会新增一条。</p>',
    confirmLabel: '下发',
  });
  if (!confirmed) return;
  try {
    const result = await group.activities.dispatch(row.id, {});
    showToast('success', `已下发：新建 ${Number(result?.created) || 0} 条，跳过 ${Number(result?.skipped) || 0} 条`);
    await refresh(host);
  } catch (error) {
    showToast('error', writeErrorMessage(error));
  }
}

async function unpublishActivity(row, host) {
  const group = contentAdapter();
  if (!group) return;
  try {
    await group.activities.updatePublication(row.id, { publishScope: 'login' });
    showToast('success', '已撤下公开，改为登录可见');
    await refresh(host);
  } catch (error) {
    showToast('error', writeErrorMessage(error));
  }
}

async function cancelActivity(row, host) {
  const group = contentAdapter();
  if (!group) return;
  const confirmed = await confirmDanger({
    id: 'committee-activity-cancel',
    title: `取消「${row.title || '未命名活动'}」`,
    bodyHtml: '<p class="text-sm text-gray-700">把该党委活动置为「已取消」。<br>影响：本页状态更新；已下发的支部通知与支部副本保持不变。<br>可恢复：不可撤销，需要时重新创建。</p>',
    confirmLabel: '取消活动',
  });
  if (!confirmed) return;
  try {
    await group.activities.cancel(row.id);
    showToast('success', '已取消该活动');
    await refresh(host);
  } catch (error) {
    showToast('error', writeErrorMessage(error));
  }
}

async function archiveActivity(row, host) {
  const group = contentAdapter();
  if (!group) return;
  const confirmed = await confirmDanger({
    id: 'committee-activity-archive',
    title: `归档「${row.title || '未命名活动'}」`,
    bodyHtml: '<p class="text-sm text-gray-700">把该党委活动归档。<br>影响：本页状态标为「已归档」；已下发的支部通知与支部副本保持不变。<br>可恢复：归档标记不可撤销，内容仍可查阅。</p>',
    confirmLabel: '归档',
  });
  if (!confirmed) return;
  try {
    await group.activities.archive(row.id);
    showToast('success', '已归档该活动');
    await refresh(host);
  } catch (error) {
    showToast('error', writeErrorMessage(error));
  }
}

// ════════════════════════════════════════════════════════════════
//  资料子视图
// ════════════════════════════════════════════════════════════════

function docsHtml() {
  const rows = state.documents;
  return `
    <div class="space-y-4">
      <div class="card p-5">
        ${renderCardHeader({ title: '院级资料', titleId: 'pc-content-doc-list', meta: `${rows.length} 条` })}
        ${rows.length
          ? `<div class="divide-y divide-gray-200 border-y border-gray-200">${rows.map(docRowHtml).join('')}</div>`
          : emptyStateHtml({ variant: 'inline', text: '暂无院级资料 · 下一步：在下方上传第一份文件' })}
      </div>
      ${docFormHtml()}
    </div>`;
}

function docRowHtml(row) {
  const scope = PUBLISH_LABELS[row.publishScope || 'login'] || row.publishScope;
  const title = row.title || '未命名资料';
  const meta = [String(row.format || '').toUpperCase(), formatSize(row.fileSize)].filter(Boolean).join(' · ');
  return `
    <div class="py-3" data-doc-row="${esc(row.id)}">
      <div class="flex flex-wrap items-start gap-x-3 gap-y-2">
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-center gap-2">
            <h4 class="text-sm font-semibold text-gray-900">${esc(title)}</h4>
            ${badgeHtml(scope, row.publishScope === 'public' ? 'brand' : 'neutral')}
            <span class="text-sm text-gray-500">${esc(meta || '无文件信息')}</span>
          </div>
          <p class="mt-1 text-sm text-gray-600">${esc(row.summary || '无摘要')}</p>
          <p class="mt-1 text-sm text-gray-500">有效期：${esc(formatDay(row.publishExpiresAt))} · 上传：${esc(formatDay(row.uploadedAt))}</p>
        </div>
        <div class="card-head__actions" role="group" aria-label="「${esc(title)}」的操作">
          <button type="button" class="btn-outline btn-sm" data-doc-act="edit" data-id="${esc(row.id)}">编辑</button>
          <button type="button" class="btn-danger btn-sm" data-doc-act="withdraw" data-id="${esc(row.id)}" ${(row.publishScope || 'login') !== 'public' ? 'disabled' : ''}>撤下</button>
        </div>
      </div>
    </div>`;
}

function docFormHtml() {
  const editing = Boolean(state.editingDocId);
  const draft = state.docDraft || {};
  const headActions = editing
    ? '<button type="button" class="btn-outline btn-sm" data-doc-form="cancel-edit">取消编辑</button>'
    : '';
  return `
    <div class="card p-5" id="pc-content-doc-form-card">
      ${renderCardHeader({ title: editing ? '编辑院级资料' : '上传院级资料', titleId: 'pc-content-doc-form', actions: headActions })}
      <div id="pc-content-doc-form">
        ${textField({ id: 'pc-doc-title', label: '标题', required: true, value: draft.title || '', placeholder: '资料名称', autocomplete: 'off' })}
        ${textareaField({ id: 'pc-doc-summary', label: '摘要', value: draft.summary || '', rows: 2, hint: '公开可见时必填；不得写入成员个人数据' })}
        ${textareaField({ id: 'pc-doc-body', label: '正文', value: draft.bodyText || '', rows: 4, placeholder: '资料说明或正文' })}
        ${fileField({ id: 'pc-doc-file', label: '文件', accept: DOC_ACCEPT, required: !editing, hint: editing ? '不选则保留原文件' : '支持 jpg / png / pdf / doc / docx / xlsx / mp4，单个不超过 10MB' })}
        <div class="grid gap-3 sm:grid-cols-2">
          ${selectField({ id: 'pc-doc-scope', label: '发布范围', options: DOC_PUBLISH_OPTIONS, value: draft.publishScope === 'public' ? 'public' : 'login' })}
          ${textField({ id: 'pc-doc-expires', label: '有效期', type: 'datetime-local', value: toLocalInputValue(draft.publishExpiresAt), hint: '选择「公开」时必填，须晚于当前时间' })}
        </div>
        <div class="mt-4 flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-4">
          ${editing ? '<button type="button" class="btn-outline btn-sm" data-doc-form="cancel-edit">取消编辑</button>' : ''}
          <button type="button" class="btn-accent btn-sm" data-doc-form="save">${editing ? '保存' : '上传并保存'}</button>
        </div>
      </div>
    </div>`;
}

function readDocForm(host) {
  const value = (selector) => host.querySelector(selector)?.value?.trim() || '';
  const expiresRaw = value('#pc-doc-expires');
  let expiresIso = '';
  if (expiresRaw) {
    const ts = Date.parse(expiresRaw);
    if (Number.isFinite(ts)) expiresIso = new Date(ts).toISOString();
  }
  return {
    title: value('#pc-doc-title'),
    summary: value('#pc-doc-summary'),
    bodyText: value('#pc-doc-body'),
    publishScope: value('#pc-doc-scope') || 'login',
    publishExpiresAt: expiresIso,
    publishExpiresAtRaw: expiresRaw,
  };
}

function validateDoc(draft, file, editing) {
  if (!draft.title) return '请填写资料标题';
  if (!editing && !file) return '请选择要上传的文件';
  if (draft.publishScope === 'public') {
    if (!draft.summary) return '公开可见须填写摘要';
    if (!draft.publishExpiresAtRaw) return '公开可见须设置有效期';
    const ts = Date.parse(draft.publishExpiresAtRaw);
    if (!Number.isFinite(ts) || ts <= Date.now()) return '有效期须晚于当前时间';
  }
  return '';
}

function findDocument(id) {
  return state.documents.find((row) => row && String(row.id) === String(id)) || null;
}

function bindDocs(host) {
  host.querySelectorAll('[data-doc-act]').forEach((button) => {
    button.addEventListener('click', () => handleDocAction(button, host));
  });
  host.querySelectorAll('[data-doc-form]').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.docForm;
      if (action === 'cancel-edit') {
        state.editingDocId = '';
        state.docDraft = null;
        paint(host);
        return;
      }
      saveDocument(host);
    });
  });
}

function loadDocForEdit(row, host) {
  state.editingDocId = String(row.id);
  state.docDraft = { ...row };
  paint(host);
  smoothScroll(host.querySelector('#pc-content-doc-form-card'), { block: 'start' });
  host.querySelector('#pc-doc-title')?.focus();
}

async function handleDocAction(button, host) {
  const row = findDocument(button.dataset.id);
  if (!row) return;
  if (button.dataset.docAct === 'edit') { loadDocForEdit(row, host); return; }
  if (button.dataset.docAct === 'withdraw') { await withdrawDocument(row, host); }
}

/** 文件本体先落 POST /api/v1/uploads，再把返回的元数据随资料行写入。 */
async function uploadDocumentFile(file) {
  if (getDataSource() !== 'api') throw new Error('院级资料上传需在服务端形态使用');
  const token = getAuthToken();
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(`${getApiBaseUrl()}/api/v1/uploads`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!response.ok) {
    let message = `上传失败(${response.status})`;
    try {
      const body = await response.json();
      if (body && body.error) message = body.error;
    } catch (_) { /* 非 JSON 响应保留状态码文案 */ }
    throw new Error(message);
  }
  const meta = await response.json();
  const fileName = meta?.filename || file.name;
  const ext = /\.([a-zA-Z0-9]+)$/.exec(fileName || '');
  return {
    fileName,
    fileSize: Number(meta?.size) || file.size,
    format: ext ? ext[1].toLowerCase() : '',
    filePath: meta?.path || '',
  };
}

async function saveDocument(host) {
  const group = contentAdapter();
  if (!group) { showToast('error', '院级内容需接入服务端后使用'); return; }
  const draft = readDocForm(host);
  const file = host.querySelector('#pc-doc-file')?.files?.[0] || null;
  const editingId = state.editingDocId;
  const invalid = validateDoc(draft, file, Boolean(editingId));
  if (invalid) { showToast('error', invalid); return; }
  const payload = {
    title: draft.title,
    summary: draft.summary,
    bodyText: draft.bodyText,
    publishScope: draft.publishScope,
    publishExpiresAt: draft.publishExpiresAt || null,
  };
  try {
    if (editingId) {
      if (file) Object.assign(payload, await uploadDocumentFile(file));
      await group.documents.update(editingId, payload);
      showToast('success', '已保存修改');
    } else {
      Object.assign(payload, await uploadDocumentFile(file));
      await group.documents.create(payload);
      showToast('success', '已上传院级资料');
    }
    state.editingDocId = '';
    state.docDraft = null;
    await refresh(host);
  } catch (error) {
    showToast('error', writeErrorMessage(error));
  }
}

async function withdrawDocument(row, host) {
  const group = contentAdapter();
  if (!group) return;
  try {
    await group.documents.withdraw(row.id);
    showToast('success', '已撤下公开，改为登录可见');
    await refresh(host);
  } catch (error) {
    showToast('error', writeErrorMessage(error));
  }
}
