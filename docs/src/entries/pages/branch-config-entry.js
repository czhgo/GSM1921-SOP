// Party-only per-branch configuration. The selected branch remains explicit in the URL.
import { mockDB } from '../../core/domain/domain.js?v=20261018f';
import { AuthStore } from '../../services/core/auth.js?v=20261018f';
import { BranchService } from '../../services/core/runtime.js?v=20261018f';
import { getPersonName } from '../../services/member/person.js?v=20261018f';
import { getBranchById, renameBranch, setBranchActive } from '../../services/branch/branch.js?v=20261018f';
import { appointSecretary, listAppointments } from '../../services/branch/appointment.js?v=20261018f';
import { ApiAdapter } from '../../data/api-adapter.js?v=20261018f';
import { hydrateDataSource } from '../../data/data-adapter.js?v=20261018f';
import { mountPartyConfig } from '../tabs/party-committee/party-config-tab.js?v=20261018f';
import { renderSidebar } from '../../components/shell/sidebar.js?v=20261018f';
import { renderHeader } from '../../components/shell/header.js?v=20261018f';
import { mountBranchRosterImport } from '../../components/governance/branch-roster-import-panel.js?v=20261018f';
import { PersonPicker } from '../../components/governance/person-picker.js?v=20261018f';
import { escHtml as esc, showToast, getBasePath } from '../../core/base/utils.js?v=20261018f';
import { renderSectionHeader } from '../../components/shell/page-frame.js?v=20261018f';

renderSidebar('workspace');
renderHeader('workspace');

const branchId = new URLSearchParams(window.location.search).get('branchId') || '';
const actor = AuthStore.getCurrentUser();
const scope = document.getElementById('branch-config-scope');
const message = document.getElementById('branch-config-message');
const controls = document.getElementById('branch-config-controls');
const rosterHost = document.getElementById('branch-config-roster');
const wizardHost = document.getElementById('branch-config-sections');
let secretaryPicker = null;

function showMessage(text, isError = false) {
  if (!message) return;
  message.textContent = text;
  message.className = `mb-4 text-sm ${isError ? 'text-red-700' : 'text-gray-600'}`;
  message.setAttribute('role', isError ? 'alert' : 'status');
}

function bindConfigSectionNavigation() {
  const panels = [...document.querySelectorAll('[data-config-panel]')];
  const buttons = [...document.querySelectorAll('[data-config-nav]')];
  const select = document.getElementById('branch-config-section-select');
  const activate = (section) => {
    const key = panels.some((panel) => panel.dataset.configPanel === section) ? section : 'organization';
    panels.forEach((panel) => { panel.hidden = panel.dataset.configPanel !== key; });
    buttons.forEach((button) => {
      if (button.dataset.configNav === key) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    if (select) select.value = key;
  };
  buttons.forEach((button) => button.addEventListener('click', () => activate(button.dataset.configNav)));
  select?.addEventListener('change', () => activate(select.value));
  const requested = new URLSearchParams(window.location.search).get('section');
  activate(requested || 'organization');
}

function renderControls() {
  const branch = getBranchById(branchId);
  if (!branch || !controls) return;
  secretaryPicker?.destroy();
  secretaryPicker = null;
  const appointments = listAppointments(branchId);
  const currentSecretary = branch.secretaryId ? getPersonName(branch.secretaryId) : '待任命';
  scope.textContent = `党委 · 当前支部：${branch.config?.headerTitle || branch.name || branchId}`;
  const wizardLink = document.getElementById('branch-config-wizard-link');
  if (wizardLink) wizardLink.href = `${getBasePath()}wizard.html?branch=${encodeURIComponent(branchId)}`;

  controls.innerHTML = `
    <div class="card p-5">
    <div class="mb-4">
      ${renderSectionHeader({
        title: '组织与任期',
        description: `当前支书：${currentSecretary} · 支部状态：${branch.status === 'inactive' ? '已停用' : '运行中'}`,
        level: 2,
      })}
    </div>
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.75fr)]">
      <section aria-labelledby="branch-admin-heading">
        <h3 id="branch-admin-heading" class="font-title-cn text-sm font-bold text-gray-900">支部信息与任命</h3>
        <div class="mt-4 max-w-xl">
          <label for="branch-name-edit" class="block text-sm font-medium text-gray-800">支部名称</label>
          <div class="mt-2 flex flex-wrap gap-2"><input id="branch-name-edit" class="input-flat min-w-0 flex-1" value="${esc(branch.config?.headerTitle || branch.name || '')}" autocomplete="organization" /><button type="button" id="branch-name-save" class="btn-outline px-3 py-2 text-sm">保存名称</button></div>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          <button type="button" id="branch-status-action" class="btn-outline px-3 py-2 text-sm">${branch.status === 'inactive' ? '恢复支部' : '停用支部'}</button>
          <a class="btn-outline inline-flex items-center px-3 py-2 text-sm" href="${getBasePath()}workspace/branch-readonly.html?branchId=${encodeURIComponent(branchId)}">查看支部只读视图</a>
        </div>
        <div class="mt-5 max-w-xl">
          <label class="block text-sm font-medium text-gray-800">任命支书</label>
          <div id="branch-secretary-picker" class="mt-2"></div>
          <div class="mt-2 flex flex-wrap gap-2">
            <button type="button" id="branch-secretary-save" class="btn-accent px-3 py-2 text-sm font-medium">确认任命</button>
          </div>
          <label for="branch-appointment-note" class="mt-2 block text-xs text-gray-600">任命说明（可选）</label>
          <input id="branch-appointment-note" class="input-flat mt-1 w-full" placeholder="如换届选举及日期">
        </div>
      </section>
      <section aria-labelledby="branch-terms-heading">
        <h3 id="branch-terms-heading" class="font-title-cn text-sm font-bold text-gray-900">支书任期记录</h3>
        ${appointments.length ? `<ol class="mt-2 divide-y divide-gray-200 border-y border-gray-200">
          ${appointments.slice(0, 5).map((record) => `<li class="py-2 text-sm text-gray-700"><span class="font-medium">${esc(getPersonName(record.secretaryId) || record.secretaryId)}</span><span class="ml-2 text-xs text-gray-500">${esc(String(record.from || '').slice(0, 10))}${record.to ? ` 至 ${esc(String(record.to).slice(0, 10))}` : ' 至今'}</span>${record.note ? `<p class="mt-1 text-xs text-gray-500">${esc(record.note)}</p>` : ''}</li>`).join('')}
        </ol>` : '<p class="mt-2 border-y border-gray-200 py-3 text-sm text-gray-500">暂无任期记录。</p>'}
      </section>
    </div>
    </div>`;

  secretaryPicker = new PersonPicker({
    mode: 'single',
    placeholder: '搜索本支部成员姓名或学号',
    filter: (person) => person.branchId === branchId && person.role !== 'party-staff',
    initialIds: branch.secretaryId ? [branch.secretaryId] : [],
  });
  secretaryPicker.render(controls.querySelector('#branch-secretary-picker'));

  mountBranchRosterImport(rosterHost, { branchId, onChange: renderControls });

  controls.querySelector('#branch-name-save')?.addEventListener('click', async () => {
    const name = controls.querySelector('#branch-name-edit')?.value.trim();
    if (!name) return showToast('error', '支部名称不能为空');
    if (name === (branch.config?.headerTitle || branch.name)) return showToast('info', '支部名称没有变化');
    try {
      await renameBranch(branchId, name);
      showToast('success', '支部名称已更新');
      renderControls();
    } catch (error) {
      showToast('error', `名称更新失败：${error?.message || error}`);
    }
  });

  controls.querySelector('#branch-status-action')?.addEventListener('click', async () => {
    const active = branch.status === 'inactive';
    if (!active && !window.confirm(`确认软停用「${branch.config?.headerTitle || branch.name}」？历史与名册保留，可恢复。`)) return;
    try {
      await setBranchActive(branchId, active);
      showToast('success', active ? '支部已恢复' : '支部已停用');
      renderControls();
    } catch (error) {
      showToast('error', `状态更新失败：${error?.message || error}`);
    }
  });
  controls.querySelector('#branch-secretary-save')?.addEventListener('click', async () => {
    const personId = (secretaryPicker?.getSelected() || [])[0] || '';
    if (!personId) { showToast('error', '请选择新任支书'); return; }
    if (personId === branch.secretaryId) { showToast('info', '所选成员已经是现任支书'); return; }
    const name = getPersonName(personId) || personId;
    if (!window.confirm(`确认任命 ${name} 为「${branch.config?.headerTitle || branch.name}」支书？现任支书将降回成员。`)) return;
    try {
      await appointSecretary({ branchId, personId, note: controls.querySelector('#branch-appointment-note')?.value.trim() || '' });
      showToast('success', `已任命 ${name}，任期记录已更新`);
      renderControls();
    } catch (error) {
      showToast('error', `任命失败：${error?.message || error}`);
    }
  });
}

async function init() {
  if (!actor) return showMessage('请先登录党委组织员账号。', true);
  if (actor.role !== 'party-staff') return showMessage('此页面仅供党委组织员管理支部配置。', true);
  if (!branchId) return showMessage('请从党委支部目录选择支部后进入配置。', true);
  showMessage('正在读取所选支部…');
  const ready = await hydrateDataSource({ apiAdapter: ApiAdapter, loadMock: () => BranchService.loadDB() });
  if (!ready?.ok) return showMessage('支部数据无法加载，请检查服务连接后重试。', true);
  const branch = getBranchById(branchId);
  if (!branch) return showMessage('支部不存在或当前账号无权读取。', true);

  renderControls();
  mountPartyConfig({
    wizardHost,
    deployHost: document.getElementById('branch-config-deploy'),
    branchId,
    navigationMode: 'sections',
    canSwitchBranch: false,
  });
  bindConfigSectionNavigation();
  showMessage('按设置领域直接定位；首次建支或逐项核对时，可切换到引导模式。');
}

void init().catch((error) => {
  console.warn('[branch-config] initialization failed', error);
  showMessage('支部配置无法加载，请刷新页面重试。', true);
});
