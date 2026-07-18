// role: [工程师]+[AI]
// members-entry.js — 人员管理页面入口
// 第3轮 Task 6: 新增项目角色赋权面板（organizer/deep）

import { bootstrapPage } from '../core/bootstrap.js';
import { AuthStore } from '../services/auth.js';
import { PEOPLE } from '../mock/people.js';
import { getPersonById } from '../mock/index.js';
import { ACTIVITIES } from '../mock/activities.js';
import { MOCK_TASKFORCES } from '../mock/taskforces.js';
import { ROLE_LABELS } from '../core/constants.js';
import { showToast } from '../core/utils.js';

const { user } = bootstrapPage({ module: 'members' });

if (!user || !AuthStore.isCommissioner(user.role)) {
  window.location.href = './index.html';
} else {
  _renderMembers();
  _renderProjectAuthPanel();
  _renderAuthRecords();
}

// ── 支部成员列表 + 常设角色赋权（设为/取消组长） ───────────
function _renderMembers() {
  const container = document.getElementById('members-list');
  if (!container) return;

  const records = AuthStore.getAuthorizations();
  const leaderIds = records.filter(r => r.role === 'leader').map(r => r.targetPersonId);

  container.innerHTML = PEOPLE.map(p => {
    const isLeader = leaderIds.includes(p.id);
    const isCommissioner = AuthStore.isCommissioner(p.role);
    const roleLabel = ROLE_LABELS[p.role] || p.role;

    return `
      <div class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
        <div>
          <span class="font-medium text-sm text-gray-800">${p.name}</span>
          <span class="text-xs text-gray-400 ml-2">${p.studentId}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs px-2 py-0.5 rounded" style="background:#F3F4F6;color:#6B7280;">${roleLabel}</span>
          ${isCommissioner ? '' : `
            <button type="button" class="text-xs px-2 py-0.5 rounded ${isLeader ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}"
              data-action="${isLeader ? 'revoke' : 'authorize'}" data-user="${p.id}">
              ${isLeader ? '取消组长' : '设为组长'}
            </button>
          `}
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const targetPersonId = btn.dataset.user;

      if (action === 'authorize') {
        const result = AuthStore.authorize(user.personId, targetPersonId, 'leader');
        showToast(result.ok ? 'success' : 'error', result.ok ? '已设为组长' : '赋权失败');
      } else if (action === 'revoke') {
        const record = records.find(r => r.targetPersonId === targetPersonId && r.role === 'leader');
        if (record) {
          const ok = AuthStore.revokeAuthorization(record.id);
          showToast(ok ? 'success' : 'error', ok ? '已取消组长' : '操作失败');
        }
      }

      _renderMembers();
      _renderProjectAuthPanel();
      _renderAuthRecords();
    });
  });
}

// ── 项目角色赋权面板 ─────────────────────────────
function _renderProjectAuthPanel() {
  const container = document.getElementById('project-auth-panel');
  if (!container) return;

  const projectRoles = ['organizer', 'deep'];

  // 人员选项（排除支委，支委不需要被赋权项目角色）
  const candidatePeople = PEOPLE.filter(p => !AuthStore.isCommissioner(p.role));

  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div>
        <label class="text-xs text-gray-500 mb-1 block">选择被赋权人</label>
        <select id="project-auth-person" class="input-flat text-xs w-full">
          <option value="">— 请选择 —</option>
          ${candidatePeople.map(p => `<option value="${p.id}">${p.name}（${p.studentId}）</option>`).join('')}
        </select>
      </div>

      <div>
        <label class="text-xs text-gray-500 mb-1 block">选择项目类型</label>
        <select id="project-type-select" class="input-flat text-xs w-full">
          <option value="activity">活动</option>
          <option value="taskforce">专班</option>
        </select>
      </div>

      <div>
        <label class="text-xs text-gray-500 mb-1 block">选择项目</label>
        <select id="project-id-select" class="input-flat text-xs w-full">
          ${ACTIVITIES.map(a => `<option value="${a.id}" data-type="activity">${a.title}（${a.date}）</option>`).join('')}
        </select>
      </div>

      <div>
        <label class="text-xs text-gray-500 mb-1 block">选择角色</label>
        <div class="flex gap-3 pt-1">
          ${projectRoles.map(r => `
            <label class="flex items-center gap-2 text-sm">
              <input type="radio" name="project-role" value="${r}" class="project-role-radio">
              <span>${ROLE_LABELS[r] || r}</span>
            </label>
          `).join('')}
        </div>
      </div>
    </div>

    <button id="confirm-project-auth-btn" type="button" class="text-sm px-4 py-2 rounded-lg bg-red-700 text-white hover:bg-red-800 transition-colors">
      确认赋权
    </button>

    <div class="mt-6">
      <h4 class="text-xs font-medium text-gray-600 mb-2">已赋权记录</h4>
      <div id="project-auth-records-list"></div>
    </div>
  `;

  _bindProjectTypeSwitch();
  _bindConfirmProjectAuth();
  _renderProjectAuthRecords();
}

// 绑定项目类型切换
function _bindProjectTypeSwitch() {
  const typeSelect = document.getElementById('project-type-select');
  const idSelect = document.getElementById('project-id-select');
  if (!typeSelect || !idSelect) return;

  typeSelect.addEventListener('change', () => {
    const type = typeSelect.value;
    if (type === 'activity') {
      idSelect.innerHTML = ACTIVITIES.map(a => `<option value="${a.id}" data-type="activity">${a.title}（${a.date}）</option>`).join('');
    } else {
      idSelect.innerHTML = MOCK_TASKFORCES.map(tf => `<option value="${tf.id}" data-type="taskforce">${tf.name}</option>`).join('');
    }
  });
}

// 绑定确认赋权
function _bindConfirmProjectAuth() {
  const btn = document.getElementById('confirm-project-auth-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const personId = document.getElementById('project-auth-person')?.value;
    const projectId = document.getElementById('project-id-select')?.value;
    const role = document.querySelector('input[name="project-role"]:checked')?.value;

    if (!personId) {
      showToast('error', '请选择被赋权人');
      return;
    }
    if (!projectId) {
      showToast('error', '请选择项目');
      return;
    }
    if (!role) {
      showToast('error', '请选择角色');
      return;
    }

    const result = AuthStore.authorize(
      user.personId,
      personId,
      role,
      { projectId }
    );

    if (result.ok) {
      showToast('success', '项目角色赋权成功');
      _renderProjectAuthRecords();
      _renderAuthRecords();
    } else if (result.id) {
      showToast('warn', '该同志在此项目已有相同角色赋权');
    } else {
      showToast('error', '赋权失败，您可能无权赋权该角色');
    }
  });
}

// 渲染项目角色赋权记录
function _renderProjectAuthRecords() {
  const listEl = document.getElementById('project-auth-records-list');
  if (!listEl) return;

  const records = AuthStore.getAuthorizations().filter(r =>
    ['organizer', 'deep'].includes(r.role) &&
    r.scopeRef
  );

  if (records.length === 0) {
    listEl.innerHTML = '<p class="text-xs text-gray-400">暂无项目角色赋权记录</p>';
    return;
  }

  listEl.innerHTML = records.map(r => {
    const person = getPersonById(r.targetPersonId);
    const project = ACTIVITIES.find(a => a.id === r.scopeRef) || MOCK_TASKFORCES.find(t => t.id === r.scopeRef);
    const projectName = project ? (project.title || project.name) : r.scopeRef;
    const roleLabel = ROLE_LABELS[r.role] || r.role;
    const personName = person?.name || r.targetPersonId;
    return `
      <div class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
        <div>
          <span class="text-sm font-medium text-gray-700">${personName}</span>
          <span class="text-xs text-gray-500 ml-2">${projectName}</span>
          <span class="text-xs px-1.5 py-0.5 rounded ml-2" style="background:#FEE2E2;color:#9B0000;">${roleLabel}</span>
          <span class="text-xs text-gray-400 ml-2">${r.authorizedAt || ''}</span>
        </div>
        <button type="button" class="revoke-project-auth text-xs text-red-500 hover:text-red-700" data-record-id="${r.id}">撤销</button>
      </div>
    `;
  }).join('');

  listEl.querySelectorAll('.revoke-project-auth').forEach(btn => {
    btn.addEventListener('click', () => {
      const recordId = btn.dataset.recordId;
      if (AuthStore.revokeAuthorization(recordId)) {
        showToast('success', '已撤销赋权');
        _renderProjectAuthRecords();
        _renderAuthRecords();
      }
    });
  });
}

// ── 全部赋权记录 ─────────────────────────────────
function _renderAuthRecords() {
  const container = document.getElementById('auth-records-list');
  if (!container) return;

  const records = AuthStore.getAuthorizations();

  if (records.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-400">暂无赋权记录</p>';
    return;
  }

  container.innerHTML = records.map(r => {
    const person = getPersonById(r.targetPersonId);
    const authorizer = getPersonById(r.authorizedBy);
    const roleLabel = ROLE_LABELS[r.role] || r.role;

    return `
      <div class="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
        <div>
          <span class="font-medium text-sm text-gray-800">${person?.name || r.targetPersonId}</span>
          <span class="text-xs text-gray-400 ml-2">被设为 ${roleLabel}</span>
          <span class="text-xs text-gray-400 ml-2">由 ${authorizer?.name || r.authorizedBy} 赋权</span>
          <span class="text-xs text-gray-400 ml-2">${r.authorizedAt}</span>
        </div>
      </div>
    `;
  }).join('');
}
