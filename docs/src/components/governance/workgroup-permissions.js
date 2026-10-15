import { WORKGROUP_PERMISSION_TEMPLATES } from '../../services/core/auth.js?v=20261016a';

const LABELS = {
  'activity.edit': '编辑活动',
  'activity.signup.manage': '管理报名',
  'activity.attendance.record': '登记考勤',
  'workgroup.members.manage': '调整工作组成员',
  'task.manage': '管理工作任务',
  'task.complete': '完成分配任务',
  'output.submit': '提交工作产出',
  'activity.view': '查看活动',
};

/** Render editable suggested permission templates for a workgroup assignment form. */
export function renderWorkgroupPermissionEditor(prefix) {
  return `<details data-wg-permission-editor="${prefix}" class="mt-2 rounded border border-gray-200 px-3 py-2">
    <summary class="cursor-pointer text-xs font-medium text-gray-600">调整建议操作权限</summary>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
      ${Object.entries(WORKGROUP_PERMISSION_TEMPLATES).map(([role, keys]) => `<fieldset class="min-w-0">
        <legend class="text-xs text-gray-500 mb-1">${role === 'organizer' ? '组织者' : '深度参与者'}模板</legend>
        ${keys.map((key) => `<label class="flex items-center gap-2 py-0.5 text-xs text-gray-600">
          <input type="checkbox" data-wg-permission="${prefix}" data-wg-role="${role}" value="${key}" checked>
          <span>${LABELS[key] || key}</span>
        </label>`).join('')}
      </fieldset>`).join('')}
    </div>
    <p class="text-xs text-gray-500 mt-2">工作组身份与系统权限分开保存；此处权限只作用于所选工作组。</p>
  </details>`;
}

export function readWorkgroupPermissionEditor(root, prefix, { includeDefaults = false } = {}) {
  if (!root || typeof root.querySelector !== 'function') return {};
  const editor = root.querySelector(`details[data-wg-permission-editor="${prefix}"]`);
  if (!includeDefaults && !editor?.open) return {};
  return Object.fromEntries(Object.keys(WORKGROUP_PERMISSION_TEMPLATES).map((role) => [role,
    [...root.querySelectorAll(`[data-wg-permission="${prefix}"][data-wg-role="${role}"]:checked`)].map((input) => input.value),
  ]));
}
