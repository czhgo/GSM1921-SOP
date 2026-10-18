// 党委所选支部只读视图：页面身份不切换到支部工作台。
import { renderSidebar } from '../../components/shell/sidebar.js?v=20261018e';
import { renderHeader } from '../../components/shell/header.js?v=20261018e';
import { AuthStore } from '../../services/core/auth.js?v=20261018e';
import { BranchService } from '../../services/core/runtime.js?v=20261018e';
import { PersonStore, getPersonName } from '../../services/member/person.js?v=20261018e';
import { getBranchById } from '../../services/branch/branch.js?v=20261018e';
import { ApiAdapter } from '../../data/api-adapter.js?v=20261018e';
import { hydrateDataSource } from '../../data/data-adapter.js?v=20261018e';
import { getBasePath, escHtml as esc } from '../../core/base/utils.js?v=20261018e';
import { ROLE_LABELS } from '../../core/domain/constants.js?v=20261018e';
import { renderPageHeader } from '../../components/shell/page-frame.js?v=20261018e';

renderSidebar('workspace');
renderHeader('workspace');

const host = document.getElementById('branch-readonly-content');
const actor = AuthStore.getCurrentUser();
const branchId = new URLSearchParams(window.location.search).get('branchId') || '';
const PAGE_SIZE = 25;

function message(title, body, role = 'status') {
  if (!host) return;
  host.setAttribute('aria-busy', 'false');
  host.innerHTML = `<section class="max-w-2xl rounded-xl border border-gray-200 bg-white p-6" role="${role}">
    <h1 class="font-title-cn text-lg font-bold text-gray-900">${esc(title)}</h1>
    <p class="mt-2 text-sm leading-6 text-gray-600">${esc(body)}</p>
    <a class="btn-outline mt-4 inline-flex px-3 py-2 text-sm" href="${getBasePath()}workspace/party-committee.html">返回党委工作台</a>
  </section>`;
}

async function render() {
  if (!host) return;
  if (!actor) return message('请先登录', '党委支部只读视图需要党委组织员登录。', 'alert');
  if (actor.role !== 'party-staff') return message('无权访问', '该只读视图仅供党委组织员使用。', 'alert');
  if (!branchId) return message('尚未选择支部', '请从党委支部台账选择一个支部后查看。', 'alert');

  host.innerHTML = '<p class="py-12 text-center text-sm text-gray-500" role="status">正在读取所选支部…</p>';
  host.setAttribute('aria-busy', 'true');
  const ready = await hydrateDataSource({ apiAdapter: ApiAdapter, loadMock: () => BranchService.loadDB() });
  if (!ready?.ok) return message('支部信息暂时无法加载', '请检查服务连接后重试。', 'alert');

  const branch = getBranchById(branchId);
  if (!branch) return message('支部不存在', '所选支部不存在或当前账号无权读取该支部。', 'alert');
  let activities = [];
  try { activities = await BranchService.listActivities(); } catch (_) { /* 页面保留名册与支部状态 */ }
  const rows = PersonStore.getMembers()
    .filter((person) => person.branchId === branchId && person.role !== 'party-staff' && person.transferOut !== true)
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN'));
  const branchActivities = (activities || [])
    .filter((activity) => (activity.branchId || 'br-b1') === branchId)
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  const branchName = branch.config?.headerTitle || branch.name || branchId;
  const secretaryName = branch.secretaryId ? getPersonName(branch.secretaryId) : '待任命';

  host.setAttribute('aria-busy', 'false');
  host.innerHTML = `
    <div class="page-frame page-frame--wide" data-branch-readonly="${esc(branchId)}">
      ${renderPageHeader({
        title: branchName,
        actions: `<a class="btn-outline inline-flex shrink-0 px-3 py-2 text-sm" href="${getBasePath()}workspace/party-committee.html?tab=monitor">返回支部台账</a>`,
      })}

      <section id="branch-overview" class="card p-5" aria-labelledby="branch-state-heading">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-xs text-gray-500">${esc(branch.type || '支部')} · 支书：${esc(secretaryName)}</p>
            <h2 id="branch-state-heading" class="mt-1 font-title-cn text-base font-bold text-gray-900">支部概况</h2>
          </div>
        </div>
        <dl class="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-gray-200 pt-4 sm:grid-cols-3">
          <div><dt class="text-xs text-gray-500">状态</dt><dd class="mt-1 text-sm font-medium text-gray-800">${branch.status === 'inactive' ? '已停用' : '运行中'}</dd></div>
          <div><dt class="text-xs text-gray-500">成员</dt><dd class="mt-1 text-sm font-medium tabular-nums text-gray-800">${rows.length} 人</dd></div>
          <div><dt class="text-xs text-gray-500">近期活动</dt><dd class="mt-1 text-sm font-medium tabular-nums text-gray-800">${branchActivities.length} 项</dd></div>
        </dl>
      </section>

      <nav class="branch-readonly-nav" aria-label="支部只读视图目录">
        <a href="#branch-overview">概况</a><a href="#branch-roster">名册</a><a href="#branch-activities">活动</a>
      </nav>

      <section id="branch-roster" class="card p-5" aria-labelledby="branch-members-heading">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <div><h2 id="branch-members-heading" class="font-title-cn text-base font-bold text-gray-900">成员名册</h2></div>
          <span id="branch-member-count" class="text-sm tabular-nums text-gray-600">${rows.length} 人</span>
        </div>
        <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(15rem,1fr)_minmax(10rem,0.45fr)_minmax(10rem,0.45fr)]">
          <div><label for="branch-member-search" class="mb-1 block text-sm font-medium text-gray-700">搜索姓名或党小组</label><input id="branch-member-search" class="input-flat w-full" type="search" autocomplete="off" placeholder="输入姓名或党小组"></div>
          <div><label for="branch-member-group-filter" class="mb-1 block text-sm font-medium text-gray-700">党小组</label><select id="branch-member-group-filter" class="input-flat w-full"><option value="">全部党小组</option>${[...new Set(rows.map((person) => person.partyGroup || '未分组'))].sort((a, b) => a.localeCompare(b, 'zh-CN')).map((group) => `<option value="${esc(group)}">${esc(group)}</option>`).join('')}</select></div>
          <div><label for="branch-member-stage-filter" class="mb-1 block text-sm font-medium text-gray-700">发展阶段</label><select id="branch-member-stage-filter" class="input-flat w-full"><option value="">全部阶段</option>${[...new Set(rows.map((person) => person.developStage || ROLE_LABELS[person.role] || '阶段未标注'))].sort((a, b) => a.localeCompare(b, 'zh-CN')).map((stage) => `<option value="${esc(stage)}">${esc(stage)}</option>`).join('')}</select></div>
        </div>
        <div class="pc-table-scroll pc-table-scroll--members mt-4 rounded-lg border border-gray-200">
          <table class="data-table">
            <caption class="visually-hidden">${esc(branchName)}成员名册，包含党小组、发展阶段和只读档案入口</caption>
            <thead><tr><th scope="col">姓名</th><th scope="col">党小组</th><th scope="col">发展阶段</th><th scope="col">档案</th></tr></thead>
            <tbody id="branch-member-rows"></tbody>
          </table>
        </div>
        <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p id="branch-member-pagination" class="text-sm text-gray-600" role="status" aria-live="polite"></p>
          <div class="flex gap-2"><button id="branch-member-prev" type="button" class="btn-outline px-3 py-2 text-sm">上一页</button><button id="branch-member-next" type="button" class="btn-outline px-3 py-2 text-sm">下一页</button></div>
        </div>
      </section>

      <section id="branch-activities" class="card p-5" aria-labelledby="branch-activity-heading">
        <div class="flex flex-wrap items-baseline justify-between gap-2"><div><h2 id="branch-activity-heading" class="font-title-cn text-base font-bold text-gray-900">活动动态</h2></div><span class="text-sm text-gray-600">${branchActivities.length} 项</span></div>
        ${branchActivities.length ? `<ol class="mt-4 divide-y divide-gray-200 border-y border-gray-200">
          ${branchActivities.slice(0, 10).map((activity) => `<li class="grid grid-cols-[6rem_minmax(0,1fr)_auto] items-baseline gap-3 py-3">
            <time class="text-sm tabular-nums text-gray-500">${esc(String(activity.date || '未定').slice(0, 10))}</time><span class="min-w-0 text-sm font-medium text-gray-800">${esc(activity.title || '未命名活动')}</span><span class="text-sm text-gray-500">${esc(activity.status || '未标注状态')}</span>
          </li>`).join('')}
        </ol>` : '<p class="mt-4 border-y border-gray-200 py-5 text-sm text-gray-500" role="status">暂无活动记录。</p>'}
      </section>
    </div>`;

  let rosterPage = 1;
  const searchInput = host.querySelector('#branch-member-search');
  const groupFilter = host.querySelector('#branch-member-group-filter');
  const stageFilter = host.querySelector('#branch-member-stage-filter');
  const renderRoster = () => {
    const query = String(searchInput?.value || '').trim().toLocaleLowerCase('zh-CN');
    const group = groupFilter?.value || '';
    const stage = stageFilter?.value || '';
    const filtered = rows.filter((person) => {
      const personGroup = person.partyGroup || '未分组';
      const personStage = person.developStage || ROLE_LABELS[person.role] || '阶段未标注';
      const searchable = `${person.name || ''} ${personGroup}`.toLocaleLowerCase('zh-CN');
      return (!query || searchable.includes(query)) && (!group || personGroup === group) && (!stage || personStage === stage);
    });
    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    rosterPage = Math.min(rosterPage, pageCount);
    const first = (rosterPage - 1) * PAGE_SIZE;
    const pageRows = filtered.slice(first, first + PAGE_SIZE);
    const tableRows = pageRows.map((person) => {
      const personStage = person.developStage || ROLE_LABELS[person.role] || '阶段未标注';
      const profileUrl = `${getBasePath()}person.html?id=${encodeURIComponent(person.id)}&branchId=${encodeURIComponent(branchId)}`;
      return `<tr><td><a class="font-medium text-blue-700 underline underline-offset-2" href="${profileUrl}">${esc(person.name || '未命名成员')}</a></td><td>${esc(person.partyGroup || '未分组')}</td><td>${esc(personStage)}</td><td><a class="whitespace-nowrap text-sm text-blue-700 underline underline-offset-2" href="${profileUrl}">查看档案</a></td></tr>`;
    }).join('');
    host.querySelector('#branch-member-rows').innerHTML = tableRows || `<tr><td colspan="4" class="py-8 text-center text-sm text-gray-600">${rows.length ? '没有符合当前搜索和筛选条件的成员。' : '暂无在册成员。'}</td></tr>`;
    host.querySelector('#branch-member-pagination').textContent = filtered.length
      ? `显示 ${first + 1}–${Math.min(first + PAGE_SIZE, filtered.length)} 人，共 ${filtered.length} 人`
      : `共 ${filtered.length} 人`;
    host.querySelector('#branch-member-prev').disabled = rosterPage <= 1;
    host.querySelector('#branch-member-next').disabled = rosterPage >= pageCount;
    host.querySelector('#branch-member-count').textContent = `${filtered.length} / ${rows.length} 人`;
  };
  searchInput?.addEventListener('input', () => { rosterPage = 1; renderRoster(); });
  groupFilter?.addEventListener('change', () => { rosterPage = 1; renderRoster(); });
  stageFilter?.addEventListener('change', () => { rosterPage = 1; renderRoster(); });
  host.querySelector('#branch-member-prev')?.addEventListener('click', () => { rosterPage -= 1; renderRoster(); });
  host.querySelector('#branch-member-next')?.addEventListener('click', () => { rosterPage += 1; renderRoster(); });
  renderRoster();
}

void render().catch((error) => {
  console.warn('[branch-readonly] load failed', error);
  message('支部信息暂时无法加载', '请检查服务连接后重试。', 'alert');
});
