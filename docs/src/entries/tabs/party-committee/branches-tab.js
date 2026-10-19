// Party committee branch directory: create and select; maintenance is in branch-config.html.

import { mockDB } from '../../../core/domain/domain.js?v=20261018s';
// 数据域接线收口（2026-09-03）：支部成员名单经 services/member/person.js 获取（原直连 mock PEOPLE）；
// 每次渲染现读（members 覆盖层即时吃到），不缓存在模块顶层
import { PersonStore } from '../../../services/member/person.js?v=20261018s';
import { createBranch } from '../../../services/branch/branch.js?v=20261018s';
import { getRosterStats } from '../../../services/member/roster.js?v=20261018s';
import { showToast, escHtml as esc, getBasePath } from '../../../core/base/utils.js?v=20261018s';
import { bindBranchReadOnlyButtons } from '../../../services/core/branch-readonly-nav.js?v=20261018s';
import { renderSectionHeader } from '../../../components/shell/page-frame.js?v=20261018s';
import { ROLE_LABELS } from '../../../core/domain/constants.js?v=20261018s';
import { getApiBaseUrl, getAuthToken, getDataSource } from '../../../data/data-adapter.js?v=20261018s';

const rosterLoadAttempts = new Set();
const rosterLoadPromises = new Map();

/**
 * 党委台未选支部时，服务端 `/api/v1/users` 默认不回支部成员；
 * 行内名册按需以 `?branchId=` 读取一次并并入 PersonStore 的 api 读链缓存。
 * mock 形态（或该支部成员已在缓存）直接返回，由 PersonStore.getMembers() 供数。
 * 并发点击共用同一个在途 Promise，避免第二次点击在数据未到时先插入空名册。
 */
function ensureBranchMembersLoaded(branchId) {
  if (getDataSource() !== 'api' || rosterLoadAttempts.has(branchId)) return Promise.resolve();
  if (rosterLoadPromises.has(branchId)) return rosterLoadPromises.get(branchId);
  if (PersonStore.getMembers().some((person) => (person.branchId || 'br-b1') === branchId)) {
    rosterLoadAttempts.add(branchId);
    return Promise.resolve();
  }
  const token = getAuthToken();
  if (!token) return Promise.resolve();
  const load = (async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/v1/users?branchId=${encodeURIComponent(branchId)}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const list = await response.json();
      const byId = new Map((mockDB.users || []).map((person) => [person.id, person]));
      for (const person of Array.isArray(list) ? list : []) {
        if (person?.id) byId.set(person.id, person);
      }
      mockDB.users = Array.from(byId.values());
    } catch (_) {
      // 读取失败时名册回落空态，不阻断支部目录其余操作
    }
  })().finally(() => {
    rosterLoadPromises.delete(branchId);
    rosterLoadAttempts.add(branchId);
  });
  rosterLoadPromises.set(branchId, load);
  return load;
}

function renderBranchRosterRows(branchId) {
  const people = PersonStore.getMembers()
    .filter((person) => (person.branchId || 'br-b1') === branchId)
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN'));
  const rows = people.map((person) => {
    const profileUrl = `${getBasePath()}person.html?id=${encodeURIComponent(person.id)}`;
    const stage = person.developStage || ROLE_LABELS[person.role] || '阶段未标注';
    return `<tr><td><a class="font-medium text-blue-700 underline underline-offset-2" href="${profileUrl}">${esc(person.name || '未命名成员')}</a></td><td>${esc(person.partyGroup || '未分组')}</td><td>${esc(stage)}</td><td><a class="whitespace-nowrap text-sm text-blue-700 underline underline-offset-2" href="${profileUrl}">查看档案</a></td></tr>`;
  }).join('');
  return `<div class="max-h-80 overflow-y-auto rounded-lg border border-gray-200">
    <table class="data-table">
      <caption class="visually-hidden">支部在册成员名册，包含党小组、发展阶段和档案入口</caption>
      <thead><tr><th scope="col">姓名</th><th scope="col">党小组</th><th scope="col">发展阶段</th><th scope="col">档案</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4" class="py-6 text-center text-sm text-gray-600">暂无在册成员</td></tr>'}</tbody>
    </table>
  </div>`;
}

function branchRosterRow(branchId) {
  const row = document.createElement('tr');
  row.className = 'branch-roster-row';
  row.dataset.branchRosterFor = branchId;
  row.innerHTML = `<td colspan="9" class="bg-gray-50 p-3">${renderBranchRosterRows(branchId)}</td>`;
  return row;
}

async function toggleBranchRoster(button) {
  const branchRow = button.closest('[data-branch-card]');
  const branchId = button.dataset.branchId;
  if (!branchRow || !branchId) return;
  const openRow = branchRow.nextElementSibling;
  if (openRow && openRow.classList.contains('branch-roster-row')) {
    openRow.remove();
    button.setAttribute('aria-expanded', 'false');
    return;
  }
  button.setAttribute('aria-expanded', 'true');
  await ensureBranchMembersLoaded(branchId);
  // 等待期间 tab 可能已重渲染（原行脱离文档）或已被另一次点击展开
  if (!branchRow.isConnected) return;
  if (branchRow.nextElementSibling?.classList.contains('branch-roster-row')) return;
  branchRow.insertAdjacentElement('afterend', branchRosterRow(branchId));
}

export async function renderContent() {
  const el = document.getElementById('party-committee-tab-content');
  if (!el) return;
  el.dataset.currentTab = 'branches'; // 跨 tab 共享容器约定（同 today/group-progress/insight-view 体例）：登记当前 tab，防 party-config 守卫读到陈旧标记而残留
  const apiMode = document.documentElement.dataset.dataSource === 'api';
  const selectedBranchId = new URLSearchParams(window.location.search).get('branchId') || '';
  const summaryOnly = apiMode && !selectedBranchId;
  const allBranches = mockDB.branches || [];
  const branches = apiMode && selectedBranchId
    ? allBranches.filter((branch) => branch.id === selectedBranchId)
    : allBranches;
  const members = PersonStore.getMembers(); // 现读档案（种子 + members 覆盖层），导入落库后即时吃到

  el.innerHTML = `
    <div class="page-section-stack">
      <section class="card p-5" aria-label="支部目录">
      ${renderSectionHeader({
        title: '支部目录',
        description: `${branches.length} 个支部`,
        actions: '<button id="branch-add-toggle" type="button" class="btn-accent px-3 py-2 text-sm font-medium">新建支部</button>',
      })}
      <section id="branch-form-wrap" class="mt-4 hidden rounded-lg border border-gray-200 bg-gray-50 p-4" aria-label="新建支部">
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div><label class="mb-1 block text-xs text-gray-600" for="branch-name-input">支部名称</label><input id="branch-name-input" type="text" class="input-flat w-full" placeholder="支部全称" /></div>
          <div><label class="mb-1 block text-xs text-gray-600" for="branch-type-input">类型（可选）</label><input id="branch-type-input" type="text" class="input-flat w-full" placeholder="如本科生、硕士生" /></div>
        </div>
        <div class="mt-3 flex justify-end gap-2"><button id="branch-form-cancel" type="button" class="btn-outline px-3 py-2 text-sm">取消</button><button id="branch-form-submit" type="button" class="btn-accent px-3 py-2 text-sm font-medium">创建支部</button></div>
      </section>
      ${branches.length ? `<div class="pc-table-scroll pc-table-scroll--branches mt-4"><table class="data-table data-table--compare">
        <caption class="visually-hidden">支部目录：按支部比较运行状态、在册人数和维护入口</caption>
        <thead><tr><th scope="col">支部</th><th scope="col">状态</th><th scope="col">成员</th><th scope="col">在册党员</th><th scope="col">活动</th><th scope="col">专班</th><th scope="col">通知</th><th scope="col">组织提醒</th><th scope="col">操作</th></tr></thead><tbody>
        ${branches.map((b) => {
          const bid = b.id;
          const isActive = (b.status || 'active') === 'active';
          const configureUrl = `${getBasePath()}branch-config.html?branchId=${encodeURIComponent(bid)}`;
          const summary = b.summary || {};
          const inBranch = summaryOnly ? null : members.filter((person) => person.branchId === bid);
          const memberCount = summaryOnly ? (summary.memberCount ?? '—') : inBranch.length;
          const partyCount = summaryOnly ? (summary.partyMemberCount ?? '—') : getRosterStats({ branchId: bid }).partyTotal;
          const activeActivities = summary.activeActivityCount ?? null;
          const totalActivities = summary.activityCount ?? null;
          const activeTaskforces = summary.activeTaskforceCount ?? null;
          const totalTaskforces = summary.taskforceCount ?? null;
          const activityText = activeActivities === null || totalActivities === null ? '—' : `${activeActivities} / ${totalActivities}`;
          const taskforceText = activeTaskforces === null || totalTaskforces === null ? '—' : `${activeTaskforces} / ${totalTaskforces}`;
          const noticeText = summary.noticeCount ?? '—';
          // 2026-10-18 繁专项（Top 8）：组织提醒按目录行 `secretaryId` 判断（服务端目录投影已补该字段），
          //   不再被 `summaryOnly` 抑制；口径与治理总览一致＝运行中且未任命支书。
          const missingSecretary = isActive && !b.secretaryId;
          return `<tr data-branch-card="${esc(bid)}">
            <td><div class="font-semibold text-gray-900">${esc(b.config?.headerTitle || b.name)}</div><div class="mt-0.5 text-xs text-gray-500">${esc(b.type || '支部')}</div></td>
            <td><span class="text-sm ${isActive ? 'text-green-700' : 'text-gray-500'}">${isActive ? '运行中' : '已停用'}</span></td>
            <td class="tabular-nums">${memberCount}${memberCount === '—' ? '' : ' 人'}</td><td class="tabular-nums">${partyCount}${partyCount === '—' ? '' : ' 人'}</td>
            <td class="tabular-nums">${activityText}</td><td class="tabular-nums">${taskforceText}</td><td class="tabular-nums">${noticeText}</td>
            <td>${missingSecretary ? '<span class="text-sm text-amber-800">待任命支书</span>' : '<span class="text-sm text-gray-500">—</span>'}</td>
            <td><div class="flex flex-wrap gap-2"><button type="button" class="btn-outline whitespace-nowrap px-3 py-2 text-sm" data-branch-roster-toggle data-branch-id="${esc(bid)}" aria-expanded="false">名册</button><a class="btn-accent inline-flex whitespace-nowrap px-3 py-2 text-sm font-medium" href="${configureUrl}">支部设置</a><button type="button" class="btn-outline branch-readonly-enter whitespace-nowrap px-3 py-2 text-sm" data-branch-id="${esc(bid)}">查看该支部</button></div></td>
          </tr>`;
        }).join('')}
        </tbody></table></div>` : `<p class="mt-4 py-8 text-sm text-gray-600" role="status">尚无支部。创建支部后，再进入其配置页完成组织设置。</p>`}
      </section>
    </div>`;

  // 新建表单开关
  const toggle = el.querySelector('#branch-add-toggle');
  const formWrap = el.querySelector('#branch-form-wrap');
  toggle?.addEventListener('click', () => formWrap?.classList.toggle('hidden'));
  el.querySelector('#branch-form-cancel')?.addEventListener('click', () => formWrap?.classList.add('hidden'));

  // 创建支部（立项⑤ 阶段A：写口升级为 createBranch 空模板双形态——建出的支部为空：
  // config 默认全开、业务域为空、席位空缺待任命；返回 { ok, branch?, reason? }）
  el.querySelector('#branch-form-submit')?.addEventListener('click', async () => {
    const name = el.querySelector('#branch-name-input')?.value.trim();
    const type = el.querySelector('#branch-type-input')?.value.trim();
    if (!name) { showToast('error', '请填写支部名称'); return; }
    const res = await createBranch({ name, type });
    if (!res || !res.ok) {
      showToast('error', `创建失败：${(res && res.reason) || '未知原因'}`);
      return;
    }
    showToast('success', `支部「${name}」已创建。请从目录进入支部设置，继续补充组织信息和成员名册。`);
    renderContent();
  });

  // 行内名册：容器委托绑定一次（容器不随 tab 重渲染销毁），避免 renderContent 后按钮失联。
  if (!el.dataset.branchRosterBound) {
    el.dataset.branchRosterBound = '1';
    el.addEventListener('click', (event) => {
      const button = event.target.closest?.('[data-branch-roster-toggle]');
      if (button) void toggleBranchRoster(button);
    });
  }

  // 从目录打开独立党委只读支部视图；支书工作台不再承担跨角色下钻。
  bindBranchReadOnlyButtons(el);
}
