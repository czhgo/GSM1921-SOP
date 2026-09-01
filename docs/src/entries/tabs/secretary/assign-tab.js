// role: [工程师]+[AI]
// entries/tabs/secretary/assign-tab.js — 书记工作台·赋权管理 tab（懒加载模块）
// 2026-08-07 自 ws-secretary-entry.js 拆分：常设赋权（设党小组组长）+ 项目赋权（organizer/deep）。

import { showToast } from '../../../core/utils.js?v=20260901f';
import { AuthStore } from '../../../services/auth.js?v=20260901f';
import { getPersonById, PEOPLE } from '../../../mock/index.js?v=20260901f';
import { TaskForceRecordStore } from '../../../services/taskforce.js?v=20260901f';
import { PersonPicker } from '../../../components/person-picker.js?v=20260901f';
import { ROLE_LABELS, getAccentColors, resolveAccentRole } from '../../../core/constants.js?v=20260901f';
import { loadActivities } from '../../../services/activity.js?v=20260901f';
import { badgeHtml } from '../../../components/badge.js?v=20260901f';
import { TodoStore } from '../../../services/todo.js?v=20260901f';

const accent = getAccentColors(resolveAccentRole('secretary')).accent;

const ASSIGN_TAB_HTML = `
  <div class="card rounded-2xl p-6 mb-6">
    <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-4">常设赋权</h3>
    <p class="text-xs text-gray-500 mb-3">设党小组组长——角色指派靠口头/群聊，系统内设+记录可追溯</p>
    <button id="ws-sec-assign-btn" class="btn-accent-soft text-xs px-3 py-1.5">设党小组组长</button>
    <div id="assign-area"></div>
    <div class="border-t border-gray-100 mt-6 pt-4">
      <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">当前党小组组长</h4>
      <div id="assign-leaders-list"></div>
    </div>
  </div>
  <div class="card rounded-2xl p-6">
    <h3 class="font-title-cn text-base font-semibold text-gray-800 mb-4">项目赋权</h3>
    <p class="text-xs text-gray-500 mb-4">为同志赋权项目角色（组织者/深度参与者），赋权后该同志在对应活动/专班中拥有相应权限。</p>
    <div id="project-auth-panel"></div>
  </div>
`;

/** 渲染赋权管理 tab（常设赋权 + 项目赋权，书记 2026-08-02 迁入） */
export function renderContent() {
  const tc = document.getElementById('secretary-tab-content');
  if (!tc) return;
  if (tc.dataset.currentTab !== 'assign') {
    tc.innerHTML = ASSIGN_TAB_HTML;
    tc.dataset.currentTab = 'assign';
    const assignArea = document.getElementById('assign-area');
    document.getElementById('ws-sec-assign-btn')?.addEventListener('click', () => {
      toggleAuthPanel(assignArea);
    });
    renderProjectAuthPanel();
  }
  renderAssignLeaders();
  renderProjectAuthRecords();
}

/** 渲染当前党小组组长列表（数字一致性审计 2026-08-07：主源 = PEOPLE 预设 + 审计快照运行时授予，与 renderAuthRecords 同源） */
function renderAssignLeaders() {
  const listEl = document.getElementById('assign-leaders-list');
  if (!listEl) return;
  const presetLeaders = PEOPLE.filter(p => p.role === 'leader');
  const granted = AuthStore.getAuthorizations().filter(r => r.role === 'leader' && r.action !== 'revoke');
  const grantedById = {};
  granted.forEach(g => { grantedById[g.targetPersonId] = g; }); // 按人去重（后写覆盖）

  const rows = [];
  presetLeaders.forEach(p => rows.push({ person: p, record: null, preset: true }));
  Object.values(grantedById).forEach(g => {
    const person = getPersonById(g.targetPersonId);
    // 已预设组长不重复列出（与 renderAuthRecords 一致）
    if (!person || person.role !== 'leader') {
      rows.push({ person: person || { id: g.targetPersonId, name: g.targetPersonId }, record: g, preset: false });
    }
  });

  if (rows.length === 0) {
    listEl.innerHTML = '<p class="text-xs text-gray-400 text-center py-4">暂无党小组组长记录</p>';
    return;
  }
  listEl.innerHTML = rows.map(({ person, record, preset }) => {
    const personName = person.name || person.id;
    const groupName = record ? (record.scopeRef || '未指定') : (person.partyGroup || '未指定');
    return `
      <div class="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-white transition-colors group" data-record-id="${record ? record.id : ''}">
        <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold" style="background:var(--app-accent-bg,rgba(185,28,28,0.1));color:var(--app-accent,#B91C1C);">${personName.charAt(0)}</div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-sm font-medium text-gray-700">${personName}</span>
            ${badgeHtml('党小组组长', 'danger')}
            ${preset ? '<span class="text-xs text-gray-400">预设</span>' : ''}
          </div>
          <p class="text-xs text-gray-400 mt-0.5">${groupName}${record ? ' · ' + record.authorizedAt : ''}</p>
        </div>
      </div>
    `;
  }).join('');
}

// ── 项目角色赋权（organizer/deep，2026-08-02 自 members.html 迁入书记工作台） ──
/** 项目赋权 PersonPicker 实例（选人规范 §2.2：选择具体人一律用 PersonPicker，可搜索） */
let _projectAuthPicker = null;

/** 渲染项目赋权表单（首次进入 tab 时构建，避免全局刷新丢失输入） */
function renderProjectAuthPanel() {
  const container = document.getElementById('project-auth-panel');
  if (!container) return;

  const projectRoles = ['organizer', 'deep'];
  // 候选被赋权人：排除支委（支委为常设角色，无需被赋权项目角色）

  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div>
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">选择被赋权人</label>
        <div id="project-auth-picker-container"></div>
      </div>
      <div>
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">选择项目类型</label>
        <select id="project-type-select" class="input-flat text-xs w-full">
          <option value="activity">活动</option>
          <option value="taskforce">专班</option>
        </select>
      </div>
      <div>
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">选择项目</label>
        <select id="project-id-select" class="input-flat text-xs w-full">
          ${[...loadActivities()].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(a => `<option value="${a.id}" data-type="activity">${a.title}（${a.date}）</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">选择角色</label>
        <div class="flex gap-3 pt-1">
          ${projectRoles.map(r => `
            <label class="flex items-center gap-2 text-xs">
              <input type="radio" name="project-role" value="${r}" class="radio-accent">
              <span>${ROLE_LABELS[r] || r}</span>
            </label>
          `).join('')}
        </div>
      </div>
    </div>
    <button id="confirm-project-auth-btn" type="button" class="btn-accent text-sm px-4 py-[7px]">
      确认赋权
    </button>
    <div class="mt-6">
      <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-2">已赋权记录</h4>
      <div id="project-auth-records-list"></div>
    </div>
  `;

  // 选人规范 §2.2：被赋权人选择用 PersonPicker（姓名/学号搜索），替换原 select 罗列人名
  _projectAuthPicker?.destroy();
  const pickerContainer = document.getElementById('project-auth-picker-container');
  _projectAuthPicker = new PersonPicker({
    mode: 'single',
    placeholder: '搜索姓名或学号选择被赋权人',
    filter: p => !AuthStore.isCommissioner(p.role),
    accentColor: accent,
    onSelect: () => {},
  });
  _projectAuthPicker.render(pickerContainer);

  bindProjectTypeSwitch();
  bindConfirmProjectAuth();
  renderProjectAuthRecords();
}

/** 项目类型切换：活动/专班联动项目下拉 */
function bindProjectTypeSwitch() {
  const typeSelect = document.getElementById('project-type-select');
  const idSelect = document.getElementById('project-id-select');
  if (!typeSelect || !idSelect) return;

  typeSelect.addEventListener('change', () => {
    const type = typeSelect.value;
    if (type === 'activity') {
      idSelect.innerHTML = [...loadActivities()].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(a => `<option value="${a.id}" data-type="activity">${a.title}（${a.date}）</option>`).join('');
    } else {
      // T223 专班新者在前（createdAt 降序）
      idSelect.innerHTML = TaskForceRecordStore.getAll()
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
        .map(tf => `<option value="${tf.id}" data-type="taskforce">${tf.name}</option>`).join('');
    }
  });
}

/** 确认项目赋权（organizer/deep） */
function bindConfirmProjectAuth() {
  const btn = document.getElementById('confirm-project-auth-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const personId = (_projectAuthPicker?.getSelected() || [])[0] || '';
    const projectId = document.getElementById('project-id-select')?.value;
    const role = document.querySelector('input[name="project-role"]:checked')?.value;

    if (!personId) { showToast('error', '请选择被赋权人'); return; }
    if (!projectId) { showToast('error', '请选择项目'); return; }
    if (!role) { showToast('error', '请选择角色'); return; }

    const result = await AuthStore.authorize(
      AuthStore.getCurrentUser()?.personId,
      personId,
      role,
      { projectId }
    );

    if (result.ok) {
      showToast('success', '项目角色赋权成功');
      renderProjectAuthRecords();
    } else if (result.id) {
      showToast('warn', '该同志在此项目已有相同角色赋权');
    } else {
      showToast('error', '赋权失败，您可能无权赋权该角色');
    }
  });
}

/** 渲染项目角色赋权记录（organizer/deep + 撤销） */
function renderProjectAuthRecords() {
  const listEl = document.getElementById('project-auth-records-list');
  if (!listEl) return;

  const records = AuthStore.getAuthorizations().filter(r =>
    ['organizer', 'deep'].includes(r.role) && r.scopeRef
  );

  if (records.length === 0) {
    listEl.innerHTML = '<p class="text-xs text-gray-400">暂无项目角色赋权记录</p>';
    return;
  }

  listEl.innerHTML = records.map(r => {
    const person = getPersonById(r.targetPersonId);
    const project = loadActivities().find(a => a.id === r.scopeRef) || TaskForceRecordStore.getAll().find(t => t.id === r.scopeRef);
    const projectName = project ? (project.title || project.name) : r.scopeRef;
    const roleLabel = ROLE_LABELS[r.role] || r.role;
    const personName = person?.name || r.targetPersonId;
    return `
      <div class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
        <div>
          <span class="text-sm font-medium text-gray-700">${personName}</span>
          <span class="text-xs text-gray-500 ml-2">${projectName}</span>
          <span class="badge ml-2" style="--acc-bg-dark:rgba(248,113,113,0.16);--acc-text-dark:#F87171;--acc-border-dark:rgba(248,113,113,0.35);background:#FEE2E2;color:#9B0000;">${roleLabel}</span>
          <span class="text-xs text-gray-400 ml-2">${r.authorizedAt || ''}</span>
        </div>
        <button type="button" class="revoke-project-auth text-xs text-gray-400 hover:text-red-600" data-record-id="${r.id}">撤销</button>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('.revoke-project-auth').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (await AuthStore.revokeAuthorization(btn.dataset.recordId)) {
        showToast('success', '已撤销赋权');
        renderProjectAuthRecords();
      }
    });
  });
}

// ════════════════════════════════════════════════════════════════
//  常设赋权面板
//  功能：设党小组组长 — 选择人员 → 选择党小组 → 确认赋权
//  当前党小组组长列表（只读）
// ════════════════════════════════════════════════════════════════

/** 赋权面板状态 */
const authPanel = {
  open: false,
  selectedPersonId: null,
  selectedGroup: null,
  personPicker: null,
};

/** 党小组列表 */
const PARTY_GROUPS = ['第一党小组', '第二党小组', '第三党小组'];

/** 切换赋权面板展开/收起 */
function toggleAuthPanel(assignArea) {
  authPanel.open = !authPanel.open;
  const btn = document.getElementById('ws-sec-assign-btn');
  if (authPanel.open) {
    if (btn) btn.textContent = '收起面板';
    renderAuthPanel(assignArea);
  } else {
    if (btn) btn.textContent = '设党小组组长';
    const panel = document.getElementById('auth-panel-container');
    if (panel) panel.remove();
    if (authPanel.personPicker) {
      authPanel.personPicker.destroy();
      authPanel.personPicker = null;
    }
  }
}

/** 渲染常设赋权面板 */
function renderAuthPanel(assignArea) {
  const oldPanel = document.getElementById('auth-panel-container');
  if (oldPanel) oldPanel.remove();

  const panel = document.createElement('div');
  panel.id = 'auth-panel-container';
  panel.className = 'rounded-xl p-6 mt-4 bg-white';

  let html = '';

  // 1. 人员选择
  html += `<div class="mb-4">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">选择同志 <span class="text-red-500">*</span></label>`;
  html += `<div id="auth-person-picker-slot"></div>`;
  html += `</div>`;

  // 2. 党小组选择
  html += `<div class="mb-5">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">指定为党小组组长 <span class="text-red-500">*</span></label>`;
  html += `<div class="flex gap-2">`;
  PARTY_GROUPS.forEach(group => {
    const isSelected = authPanel.selectedGroup === group;
    const cls = `chip-option text-sm px-4 py-2 rounded-lg ${isSelected ? 'chip-accent-on font-medium' : ''}`;
    html += `<button data-auth-action="select-group" data-value="${group}" class="${cls}">${group}</button>`;
  });
  html += `</div>`;
  html += `</div>`;

  // 3. 确认按钮
  html += `<button data-auth-action="confirm" class="btn-accent text-sm px-4 py-[7px] font-medium">确认设为党小组组长</button>`;

  // ── 分隔线 ──
  html += `<div class="border-t border-gray-100 mt-6 pt-4">`;
  html += `<h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">当前党小组组长</h4>`;
  html += `<div id="auth-records-list"></div>`;
  html += `</div>`;

  panel.innerHTML = html;
  assignArea.appendChild(panel);

  // 初始化 PersonPicker
  const pickerSlot = document.getElementById('auth-person-picker-slot');
  if (pickerSlot) {
    if (authPanel.personPicker) authPanel.personPicker.destroy();
    authPanel.personPicker = new PersonPicker({
      mode: 'single',
      placeholder: '选择同志',
      accentColor: accent,
      onSelect: (ids) => {
        authPanel.selectedPersonId = ids[0] || null;
      },
    });
    if (authPanel.selectedPersonId) {
      authPanel.personPicker.setSelected([authPanel.selectedPersonId]);
    }
    authPanel.personPicker.render(pickerSlot);
  }

  // 绑定事件
  panel.querySelectorAll('[data-auth-action]').forEach(el => {
    el.addEventListener('click', handleAuthAction);
  });

  renderAuthRecords();
}

/** 处理常设赋权面板操作 */
function handleAuthAction(e) {
  const btn = e.currentTarget;
  const action = btn.dataset.authAction;

  switch (action) {
    case 'select-group': {
      authPanel.selectedGroup = btn.dataset.value;
      break;
    }
    case 'confirm': {
      handleConfirmLeader();
      return;
    }
    default:
      return;
  }

  const assignArea = document.getElementById('assign-area');
  if (assignArea) renderAuthPanel(assignArea);
}

/** 确认设为党小组组长 */
async function handleConfirmLeader() {
  if (!authPanel.selectedPersonId) {
    showToast('error', '请选择同志');
    return;
  }
  if (!authPanel.selectedGroup) {
    showToast('error', '请选择党小组');
    return;
  }

  // 调用 AuthStore，role='leader', scope='group', scopeRef=党小组名
  const result = await AuthStore.authorize(
    AuthStore.getCurrentUser()?.personId,
    authPanel.selectedPersonId,
    'leader',
    { projectId: authPanel.selectedGroup },
  );

  if (result.ok) {
    const person = getPersonById(authPanel.selectedPersonId);
    const personName = person ? person.name : authPanel.selectedPersonId;
    showToast('success', `已将 ${personName} 设为 ${authPanel.selectedGroup} 组长`);

    // 做事即销待办：常设赋权完成 → 销书记「设置党小组组长」待办（按 scope=leader 匹配）
    TodoStore.getAll()
      .filter(t => t.role === 'secretary' && t.actionData?.scope === 'leader' && t.status !== 'completed')
      .forEach(t => TodoStore.complete(t.id));

    authPanel.selectedPersonId = null;
    authPanel.selectedGroup = null;

    const assignArea = document.getElementById('assign-area');
    if (assignArea) renderAuthPanel(assignArea);
  } else {
    if (result.id) {
      showToast('warn', '该同志已是该党小组组长');
    } else {
      showToast('error', '设置失败，请检查参数');
    }
  }
}

/** 渲染当前党小组组长列表（主源 = PEOPLE 预设 role:'leader' + 审计快照运行时授予） */
function renderAuthRecords() {
  const listEl = document.getElementById('auth-records-list');
  if (!listEl) return;

  // 常设组长主源 = PEOPLE role:'leader'（预设）；运行时授予 = 审计快照 role:'leader'
  const presetLeaders = PEOPLE.filter(p => p.role === 'leader');
  const granted = AuthStore.getAuthorizations().filter(r => r.role === 'leader' && r.action !== 'revoke');
  const grantedById = {};
  granted.forEach(g => { grantedById[g.targetPersonId] = g; });
  const grantedUnique = Object.values(grantedById); // 按人去重（grant→revoke→grant 周期后取最新一条）

  const rows = [];
  presetLeaders.forEach(p => {
    rows.push({ person: p, record: null });
  });
  grantedUnique.forEach(g => {
    const person = getPersonById(g.targetPersonId);
    if (!person || person.role !== 'leader') {
      rows.push({ person: person || { id: g.targetPersonId, name: g.targetPersonId }, record: g });
    }
  });

  if (rows.length === 0) {
    listEl.innerHTML = `<p class="text-xs text-gray-400 text-center py-4">暂无党小组组长记录</p>`;
    return;
  }

  listEl.innerHTML = rows.map(({ person, record }) => {
    const personName = person.name || person.targetPersonId;
    const groupName = record ? (record.scopeRef || '未指定') : (person.partyGroup || '未指定');
    const revokeBtn = record
      ? `<button type="button" data-auth-action="revoke" data-record-id="${record.id}" class="text-xs text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 ml-2 flex-shrink-0 px-3 py-1.5 rounded-lg hover:bg-red-50">撤销</button>`
      : '<span class="text-xs text-gray-300 ml-2 flex-shrink-0">预设</span>';

    return `
      <div class="flex items-center justify-between py-2.5 px-3 rounded-lg bg-white transition-colors group">
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <div class="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold" style="background:var(--app-accent-bg,rgba(185,28,28,0.1));color:var(--app-accent,#B91C1C);">
            ${personName.charAt(0)}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-medium text-gray-700">${personName}</span>
              ${badgeHtml('党小组组长', 'danger')}
            </div>
            <p class="text-xs text-gray-400 mt-0.5">${groupName}${record ? ' · ' + (record.authorizedAt || '') : ''}</p>
          </div>
        </div>
        ${revokeBtn}
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('[data-auth-action="revoke"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const recordId = btn.dataset.recordId;
      if (await AuthStore.revokeAuthorization(recordId)) {
        showToast('success', '已撤销党小组组长');
        renderAuthRecords();
      } else {
        showToast('error', '撤销失败');
      }
    });
  });
}
