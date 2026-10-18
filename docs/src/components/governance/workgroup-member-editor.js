import { PersonPicker } from './pickers.js?v=20261018d';
import { getAdapter } from '../../data/data-adapter.js?v=20261018d';
import { getPersonById } from '../../services/member/person.js?v=20261018d';
import { WORKGROUP_PERMISSION_LABELS, WORKGROUP_ROLE_LABELS, workgroupPermissionTemplates } from '../../core/domain/workgroup-policy.js?v=20261018d';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const permissionName = (key) => WORKGROUP_PERMISSION_LABELS[key] || key;

function renderMemberRow(member, grant, kind, canEdit) {
  const personId = String(member.personId || '');
  const name = member.name || getPersonById(personId)?.name || personId;
  const role = member.role === 'organizer' ? 'organizer' : 'deep';
  const templates = workgroupPermissionTemplates(kind);
  const activeKeys = new Set(Array.isArray(grant?.permissionKeys) ? grant.permissionKeys : []);
  const permissionSummary = activeKeys.size ? `已授予 ${activeKeys.size} 项` : '尚未授予操作权限';
  const kindPermissionKeys = [...new Set(Object.values(templates).flat())];
  const permissionControls = canEdit
    ? `<div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 pt-3">
        ${kindPermissionKeys.map((key) => `<label class="flex min-w-0 items-start gap-2 py-1 text-xs leading-5 text-gray-700">
          <input type="checkbox" data-wg-permission value="${esc(key)}"${activeKeys.has(key) ? ' checked' : ''}>
          <span>${esc(permissionName(key))}</span>
        </label>`).join('')}
      </div>
      <label class="block mt-2 text-xs text-gray-600">授权说明（选填）
        <input class="input-flat mt-1 w-full text-xs" data-wg-reason maxlength="200" value="${esc(grant?.reason || '')}" placeholder="说明这项工作需要的操作">
      </label>
      <div class="mt-2 flex flex-wrap gap-2">
        <button type="button" class="btn-ghost text-xs px-2 py-1" data-wg-apply-template>套用${WORKGROUP_ROLE_LABELS[role]}建议</button>
        <button type="button" class="btn-ghost text-xs px-2 py-1 text-red-700" data-wg-remove>移出工作组</button>
      </div>`
    : `<p class="mt-2 text-xs text-gray-600">${activeKeys.size ? [...activeKeys].map(permissionName).map(esc).join('、') : '未授予操作权限'}</p>`;

  if (!canEdit) {
    return `<article class="rounded-lg border border-gray-200 bg-white px-3 py-2" aria-label="${esc(name)}的工作组身份">
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span class="font-medium text-gray-800">${esc(name)}</span>
        <span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">${WORKGROUP_ROLE_LABELS[role]}</span>
        <span class="ml-auto text-xs text-gray-500">只读</span>
      </div>
      ${permissionControls}
    </article>`;
  }

  return `<details class="rounded-lg border border-gray-200 bg-white px-3 py-2" data-wg-member="${esc(personId)}" data-template-key="${esc(grant?.templateKey || '')}">
    <summary class="flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
      <span class="font-medium text-gray-800">${esc(name)}</span>
      <span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">${WORKGROUP_ROLE_LABELS[role]}</span>
      <span class="ml-auto text-xs text-gray-500">${permissionSummary} · 展开管理</span>
    </summary>
    <div class="mt-3 border-t border-gray-100 pt-2">
      ${canEdit ? `<label class="block max-w-xs text-xs text-gray-600">工作组分工
        <select class="input-flat mt-1 w-full text-sm" data-member-role aria-label="${esc(name)}的工作组分工">
          ${Object.entries(WORKGROUP_ROLE_LABELS).map(([key, label]) => `<option value="${key}"${role === key ? ' selected' : ''}>${label}</option>`).join('')}
        </select>
      </label>` : ''}
      ${canEdit ? `<fieldset class="mt-3">
        <legend class="text-xs font-medium text-gray-700">独立操作授权</legend>
        ${permissionControls}
        <p class="mt-2 text-xs text-gray-500">工作组成员身份本身不会授予系统权限；勾选项将随本次保存一并生效。</p>
      </fieldset>` : ''}
    </div>
  </details>`;
}

function renderParticipantList(participants) {
  return `<section class="mt-5 border-t border-gray-100 pt-4" aria-labelledby="wg-general-participants-title">
    <h4 id="wg-general-participants-title" class="text-sm font-semibold text-gray-800">一般参与者（已通过报名）· ${participants.length}</h4>
    <p class="mt-1 text-xs text-gray-500">报名关系独立记录，不属于工作组角色；主题党日有效报名默认选择线下参加。</p>
    ${participants.length
      ? `<ul class="mt-2 flex flex-wrap gap-2">${participants.map((row) => `<li class="rounded-lg bg-gray-50 px-2.5 py-1 text-xs text-gray-700">${esc(row.name || getPersonById(row.personId)?.name || row.personId)}</li>`).join('')}</ul>`
      : '<p class="mt-2 text-xs text-gray-500">暂无已通过报名</p>'}
  </section>`;
}

/** 活动与专班共用成员编辑框架；业务类型决定可见成员来源和授权集合。 */
export function renderWorkgroupMemberEditor({
  workgroupId, kind, canEdit = false, members = [], grants = [], participants = [], legacyRows = [],
}) {
  const activity = kind === 'activity';
  const title = activity ? '活动工作组成员' : '专班工作组成员';
  const activeMembers = (Array.isArray(members) ? members : []).filter((row) => row?.personId && ['organizer', 'deep'].includes(row.role));
  const activeGrants = new Map((Array.isArray(grants) ? grants : [])
    .filter((row) => row?.status === 'active').map((row) => [String(row.personId), row]));
  return `<section class="mt-6" data-workgroup-member-editor="${esc(workgroupId)}" data-workgroup-kind="${activity ? 'activity' : 'taskforce'}" aria-labelledby="wg-editor-title-${esc(workgroupId)}">
    <div class="flex flex-wrap items-end justify-between gap-2 border-b border-gray-100 pb-2">
      <div><h3 id="wg-editor-title-${esc(workgroupId)}" class="text-sm font-semibold text-gray-800">${title}（${activeMembers.length}）</h3>
      <p class="mt-1 text-xs text-gray-500">组织者与深度参与者是工作组分工；操作授权单独选择。</p></div>
    </div>
    <div class="mt-3 space-y-2" data-wg-member-list>
      ${activeMembers.length
        ? activeMembers.map((row) => renderMemberRow(row, activeGrants.get(String(row.personId)), activity ? 'activity' : 'taskforce', canEdit)).join('')
        : '<p class="rounded-lg bg-gray-50 px-3 py-3 text-sm text-gray-500">暂无工作组成员</p>'}
      ${legacyRows.length ? `<details class="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2">
        <summary class="cursor-pointer text-xs font-medium text-amber-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700">历史普通参与记录待核（${legacyRows.length}）</summary>
        <p class="mt-1 text-xs text-amber-900">${activity ? '旧成员镜像保留查看，核实后再纳入活动名单。' : '专班不设一般参与者；旧记录保留待核，不计入工作组成员。'}</p>
        <ul class="mt-1 text-xs text-gray-700">${legacyRows.map((row) => `<li>${esc(row.name || getPersonById(row.personId)?.name || row.personId)}</li>`).join('')}</ul>
      </details>` : ''}
    </div>
    ${activity ? renderParticipantList(participants) : '<p class="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500">专班不设一般参与者报名、应到名单或考勤；组织者/深度参与者入组申请由组织台受理，工作执行按登记任务与产出记录。</p>'}
    ${canEdit ? `<div class="mt-4 border-t border-gray-100 pt-4">
      <h4 class="text-xs font-semibold text-gray-800">加入成员</h4>
      <p class="mt-1 text-xs text-gray-500">新成员初始不带操作授权；需要时在成员详情中明确勾选。</p>
      <div class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div class="min-w-0 flex-1" data-wg-person-picker></div>
        <button type="button" class="btn-outline min-h-10 px-3 text-sm" data-wg-add>加入选中成员</button>
      </div>
      <div class="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" class="btn-accent min-h-10 px-4 text-sm" data-wg-save>保存成员和权限</button>
        <span class="text-xs text-gray-500" data-wg-status aria-live="polite"></span>
      </div>
    </div>` : '<p class="mt-3 text-xs text-gray-500">当前为只读视图。</p>'}
  </section>`;
}

/** Mount editor interactions into its rendered section. On error, the draft remains intact. */
export function bindWorkgroupMemberEditor(root, { onSaved } = {}) {
  const host = typeof root?.matches === 'function' && root.matches('[data-workgroup-member-editor]')
    ? root : root?.querySelector?.('[data-workgroup-member-editor]');
  if (!host) return null;
  const workgroupId = host.dataset.workgroupMemberEditor;
  const kind = host.dataset.workgroupKind;
  const canEdit = !!host.querySelector('[data-wg-save]');
  if (!canEdit) return { destroy() {} };

  const existingMembers = [...host.querySelectorAll('[data-wg-member]')].map((row) => ({
    personId: row.dataset.wgMember,
    name: row.querySelector('summary .font-medium')?.textContent || '',
    role: row.querySelector('[data-member-role]')?.value || (row.querySelector('summary .rounded-full')?.textContent === WORKGROUP_ROLE_LABELS.organizer ? 'organizer' : 'deep'),
    templateKey: row.dataset.templateKey || null,
    permissionKeys: [...row.querySelectorAll('[data-wg-permission]:checked')].map((input) => input.value),
    reason: row.querySelector('[data-wg-reason]')?.value || '',
  }));
  const memberMap = new Map(existingMembers.map((row) => [row.personId, row]));
  const pickerHost = host.querySelector('[data-wg-person-picker]');
  const picker = new PersonPicker({ mode: 'multi', placeholder: '搜索并选择本支部成员' });
  picker.render(pickerHost);
  const status = host.querySelector('[data-wg-status]');

  host.addEventListener('click', async (event) => {
    const templateButton = event.target.closest('[data-wg-apply-template]');
    if (templateButton) {
      const row = templateButton.closest('[data-wg-member]');
      const role = row?.querySelector('[data-member-role]')?.value || existingMembers.find((item) => item.personId === row?.dataset.wgMember)?.role || 'deep';
      const templates = workgroupPermissionTemplates(kind);
      const templateKeys = new Set(templates[role] || []);
      row?.querySelectorAll('[data-wg-permission]').forEach((input) => { input.checked = templateKeys.has(input.value); });
      if (row) row.dataset.templateKey = role;
      return;
    }
    const removeButton = event.target.closest('[data-wg-remove]');
    if (removeButton) {
      const row = removeButton.closest('[data-wg-member]');
      if (row) { memberMap.delete(row.dataset.wgMember); row.remove(); }
      return;
    }
    if (event.target.closest('[data-wg-add]')) {
      // Keep unsaved role/permission edits when the member picker causes a list redraw.
      host.querySelectorAll('[data-wg-member]').forEach((row) => {
        const prior = memberMap.get(row.dataset.wgMember) || {};
        memberMap.set(row.dataset.wgMember, {
          ...prior,
          role: row.querySelector('[data-member-role]')?.value || prior.role || 'deep',
          templateKey: row.dataset.templateKey || null,
          permissionKeys: [...row.querySelectorAll('[data-wg-permission]:checked')].map((input) => input.value),
          reason: row.querySelector('[data-wg-reason]')?.value || '',
        });
      });
      const selected = picker.getSelected();
      const names = picker.getSelectedNames();
      selected.forEach((personId, index) => {
        if (!memberMap.has(String(personId))) memberMap.set(String(personId), {
          personId: String(personId), name: names[index] || getPersonById(personId)?.name || String(personId), role: 'deep',
          templateKey: null, permissionKeys: [], reason: '',
        });
      });
        const list = host.querySelector('[data-wg-member-list]');
      if (list) {
        const legacy = [...list.children].find((child) => child.querySelector?.('summary')?.textContent?.includes('历史普通参与记录待核'));
        list.innerHTML = [...memberMap.values()].map((row) => {
          const grant = { status: 'active', permissionKeys: row.permissionKeys, templateKey: row.templateKey, reason: row.reason };
          return renderMemberRow(row, grant, kind, true);
        }).join('') || '<p class="rounded-lg bg-gray-50 px-3 py-3 text-sm text-gray-500">暂无工作组成员</p>';
        if (legacy) list.append(legacy);
      }
      picker.clearSelection();
      return;
    }
    if (!event.target.closest('[data-wg-save]')) return;

    // Read the current DOM as the draft source so failed saves never discard edits.
    const desired = [...host.querySelectorAll('[data-wg-member]')].map((row) => {
      const personId = row.dataset.wgMember;
      const prior = memberMap.get(personId) || {};
      const role = row.querySelector('[data-member-role]')?.value || prior.role || 'deep';
      return {
        personId, role,
        templateKey: row.dataset.templateKey || null,
        permissionKeys: [...row.querySelectorAll('[data-wg-permission]:checked')].map((input) => input.value),
        reason: row.querySelector('[data-wg-reason]')?.value || '',
      };
    });
    const button = host.querySelector('[data-wg-save]');
    button.disabled = true;
    status.textContent = '正在保存…';
    try {
      await getAdapter().workgroups.members.saveAll(workgroupId, { members: desired });
      status.textContent = '成员和权限已保存。';
      if (typeof onSaved === 'function') await onSaved();
    } catch (error) {
      status.textContent = error?.message ? `保存失败：${error.message}` : '保存失败；当前编辑内容已保留，请重试。';
      button.disabled = false;
    }
  });

  host.addEventListener('change', (event) => {
    const row = event.target.closest('[data-wg-member]');
    if (!row || !event.target.matches('[data-member-role]')) return;
    // 角色变更不会自动改动显式授权，模板按钮需由操作者主动应用。
    row.dataset.templateKey = '';
  });

  return { destroy() { picker.destroy(); } };
}
