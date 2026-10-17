import { WORKGROUP_PERMISSION_LABELS, WORKGROUP_PERMISSION_TEMPLATES_BY_KIND, WORKGROUP_ROLE_LABELS } from '../../core/domain/workgroup-policy.js?v=20261017g';

/** Render editable suggested permission templates for a workgroup assignment form. */
export function renderWorkgroupPermissionEditor(prefix, kind = 'activity') {
  const templates = WORKGROUP_PERMISSION_TEMPLATES_BY_KIND[kind] || WORKGROUP_PERMISSION_TEMPLATES_BY_KIND.activity;
  return `<details data-wg-permission-editor="${prefix}" class="mt-2 rounded border border-gray-200 px-3 py-2">
    <summary class="cursor-pointer text-xs font-medium text-gray-600">调整建议操作权限</summary>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
      ${Object.entries(templates).map(([role, keys]) => `<fieldset class="min-w-0">
        <legend class="text-xs text-gray-500 mb-1">${WORKGROUP_ROLE_LABELS[role]}模板</legend>
        ${keys.map((key) => `<label class="flex items-center gap-2 py-0.5 text-xs text-gray-600">
          <input type="checkbox" data-wg-permission="${prefix}" data-wg-role="${role}" value="${key}" checked>
          <span>${WORKGROUP_PERMISSION_LABELS[key] || key}</span>
        </label>`).join('')}
      </fieldset>`).join('')}
    </div>
    <p class="text-xs text-gray-500 mt-2">工作组身份与系统权限分开保存；此处权限只作用于所选工作组。</p>
  </details>`;
}

export function readWorkgroupPermissionEditor(root, prefix, { includeDefaults = false, kind = 'activity' } = {}) {
  if (!root || typeof root.querySelector !== 'function') return {};
  const editor = root.querySelector(`details[data-wg-permission-editor="${prefix}"]`);
  if (!includeDefaults && !editor?.open) return {};
  const templates = WORKGROUP_PERMISSION_TEMPLATES_BY_KIND[kind] || WORKGROUP_PERMISSION_TEMPLATES_BY_KIND.activity;
  return Object.fromEntries(Object.keys(templates).map((role) => [role,
    [...root.querySelectorAll(`[data-wg-permission="${prefix}"][data-wg-role="${role}"]:checked`)].map((input) => input.value),
  ]));
}
