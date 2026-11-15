// Party committee branch directory: create and select; maintenance is in branch-config.html.

import { mockDB } from '../../../core/domain/domain.js?v=20261110b';
// 数据域接线收口（2026-09-03）：支部成员名单经 services/member/person.js 获取（原直连 mock PEOPLE）；
// 每次渲染现读（members 覆盖层即时吃到），不缓存在模块顶层
import { PersonStore } from '../../../services/member/person.js?v=20261110b';
import { createBranch } from '../../../services/branch/branch.js?v=20261110b';
import { getRosterStats } from '../../../services/member/roster.js?v=20261110b';
import { showToast, escHtml as esc, getBasePath } from '../../../core/base/utils.js?v=20261110b';
// T3：运维健康读数失败时按既有单一源翻译成一句人话（`workbench-revision-contract` 钉住上一行 import 形态，故单列一行）
import { describeWriteError } from '../../../core/base/utils.js?v=20261110b';
import { bindBranchReadOnlyButtons } from '../../../services/core/branch-readonly-nav.js?v=20261110b';
import { renderSectionHeader, renderTabHeader } from '../../../components/shell/page-frame.js?v=20261110b';
import { DEFAULT_BRANCH_ID } from '../../../core/domain/constants.js?v=20261110b';
import { getAdapter, getDataSource } from '../../../data/data-adapter.js?v=20261110b';
// A05（2026-10-20 IA 修复批次）：「支部动态」撤页后，其「待批复数量列 + 支部筛选」并入本页。
//   数据与筛选件一律复用既有单一源（review-request 服务 + branch-filter 共用件），不另写一份。
import { listReviewRequests } from '../../../services/governance/review-request.js?v=20261110b';
import { renderBranchFilter, getBranchFilter } from '../../../components/governance/branch-filter.js?v=20261110b';

import { emptyStateHtml } from '../../../components/ui/empty-state.js?v=20261110b';
const BRANCH_FILTER_STATE = 'pc-branches';

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
  if (PersonStore.getMembers().some((person) => (person.branchId || DEFAULT_BRANCH_ID) === branchId)) {
    rosterLoadAttempts.add(branchId);
    return Promise.resolve();
  }
  const load = (async () => {
    try {
      // W1（批次 343 · D-744 D 档）：通用资源端点不得直连 fetch ⇒ 走适配器同一读链
      const list = await getAdapter().users.list({ branchId });
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
    .filter((person) => (person.branchId || DEFAULT_BRANCH_ID) === branchId)
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN'));
  const rows = people.map((person) => {
    const profileUrl = `${getBasePath()}person.html?id=${encodeURIComponent(person.id)}`;
    // A01：阶段空值不再用角色名冒充（角色 ≠ 发展阶段）；给出明确补录责任人 / 入口。
    const stage = person.developStage || '未登记（组织委员可在名册补）';
    return `<tr><td data-label="姓名"><a class="font-medium text-accent" href="${profileUrl}">${esc(person.name || '未命名成员')}</a></td><td data-label="党小组">${esc(person.partyGroup || '未分组')}</td><td data-label="发展阶段">${esc(stage)}</td><td data-label="档案"><a class="whitespace-nowrap text-sm text-accent" href="${profileUrl}">查看档案</a></td></tr>`;
  }).join('');
  return `<div class="max-h-80 overflow-y-auto rounded-lg border border-gray-200">
    <table class="data-table" data-responsive="cards">
      <caption class="visually-hidden">支部在册成员名册，包含党小组、发展阶段和档案入口</caption>
      <thead><tr><th scope="col">姓名</th><th scope="col">党小组</th><th scope="col">发展阶段</th><th scope="col">档案</th></tr></thead>
      <tbody>${rows || emptyStateHtml({ variant: 'table', text: '暂无在册成员', colspan: 4 })}</tbody>
    </table>
  </div>`;
}

function branchRosterRow(branchId) {
  const row = document.createElement('tr');
  row.className = 'branch-roster-row';
  row.id = `branch-roster-${branchId}`;
  row.dataset.branchRosterFor = branchId;
  row.innerHTML = `<td colspan="10" class="bg-gray-50 p-3">${renderBranchRosterRows(branchId)}</td>`;
  return row;
}

/**
 * 运维健康读数（T3 · 六维补齐 M1「坏了能查」）。
 * 数据只经 `api-adapter` 门面（`H32`）：浅检查 / 深检查 / 最小指标集三读口。
 * 深检查失败时服务端回 503，门面抛出的错误带 `.body`（含降级项），据此展示原因而不是只说「加载失败」。
 */
const OPS_CHECK_LABELS = {
  'db-read': '数据库可读',
  'schema-version': '迁移版本',
  'backup-dir-writable': '备份目录可写',
};

function formatHealthTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('zh-CN', { hour12: false });
}

/** 检查 id → 人话（未知 id 原样显示，不隐藏异常） */
function checkLabel(id) {
  return OPS_CHECK_LABELS[id] || id || '未知检查项';
}

function healthRow(label, ok, note = '') {
  const tone = ok ? 'text-green-700' : 'text-amber-800';
  return `<li class="flex items-start gap-2 py-1"><span class="${tone}">${ok ? '正常' : '异常'}</span>`
    + `<span class="text-gray-700">${esc(label)}</span>`
    + `${note ? `<span class="text-gray-500">${esc(note)}</span>` : ''}</li>`;
}

async function renderOpsHealth(host) {
  if (!host) return;
  if (getDataSource() !== 'api') {
    host.innerHTML = '<p class="text-sm text-gray-600">运维健康读数仅在服务端形态可用；当前使用演示数据。</p>';
    return;
  }
  host.innerHTML = '<p class="text-sm text-gray-600">正在读取健康状态…</p>';
  const adapter = getAdapter();
  const [shallowRes, deepRes, metricsRes] = await Promise.allSettled([
    adapter.opsHealth.shallow(),
    adapter.opsHealth.deep(),
    adapter.opsHealth.metrics(),
  ]);
  const shallow = shallowRes.status === 'fulfilled' ? shallowRes.value : null;
  // 503 也带完整读数（`{ok:false,status:'degraded',checks}`），从错误体里取回
  const deep = deepRes.status === 'fulfilled' ? deepRes.value : (deepRes.reason?.body || null);
  const metrics = metricsRes.status === 'fulfilled' ? metricsRes.value : null;
  if (!deep && !metrics) {
    const reason = deepRes.status === 'rejected' ? describeWriteError(deepRes.reason) : '服务暂不可用';
    host.innerHTML = `<p class="text-sm text-red-700" role="alert">读取失败：${esc(reason)}</p>`;
    return;
  }

  const deepOk = !!deep?.ok;
  const checks = Array.isArray(deep?.checks) ? deep.checks : [];
  const lastBackupAt = metrics?.lastBackupAt || deep?.lastBackupAt || '';
  const requests = metrics?.requests || null;
  host.innerHTML = `
    <p class="text-sm font-semibold ${deepOk ? 'text-green-700' : 'text-amber-800'}">
      ${deepOk ? '当前运行正常' : '当前存在异常（同一故障 30 分钟内只提醒一次）'}</p>
    <ul class="mt-2 text-sm">
      ${healthRow('浅检查 · 进程与依赖', shallow?.ok === true, shallow ? '' : '未取到')}
      ${checks.map((check) => healthRow(
        checkLabel(check.id),
        !!check.ok,
        check.id === 'schema-version' && deep?.schemaVersion ? `v${deep.schemaVersion}` : (check.ok ? '' : (check.error || '')),
      )).join('')}
      <li class="flex items-start gap-2 py-1"><span class="${lastBackupAt ? 'text-gray-700' : 'text-amber-800'}">${lastBackupAt ? '最近备份' : '尚无备份'}</span>
        <span class="text-gray-500">${esc(lastBackupAt ? formatHealthTime(lastBackupAt) : '按部署清单执行一次备份后这里会有时间')}</span></li>
    </ul>
    ${requests ? `<p class="mt-2 text-body-sm text-gray-600">本次启动以来 API 请求 ${requests.total} 次 · 5xx ${requests.serverErrors} 次 · 平均 ${requests.avgDurationMs} ms</p>` : ''}`;
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
  // 支部筛选共用件（stateKey=pc-branches）：API 模式选择随 URL 走，mock 模式随模块自持。
  const selectedBranchId = getBranchFilter(BRANCH_FILTER_STATE);
  const summaryOnly = apiMode && !selectedBranchId;
  const allBranches = mockDB.branches || [];
  const branches = selectedBranchId
    ? allBranches.filter((branch) => branch.id === selectedBranchId)
    : allBranches;
  const members = PersonStore.getMembers(); // 现读档案（种子 + members 覆盖层），导入落库后即时吃到
  // A05：待批复计数与「支部上报」页同口径（listReviewRequests status='pending'），按 branchId 计数。
  const pendingRequests = listReviewRequests({ status: 'pending' });

  el.innerHTML = `
    ${renderTabHeader({ title: '支部管理', description: '全院支部目录、运行状态与维护入口。' })}
    <div class="page-section-stack">
      <section class="card p-5" aria-label="支部目录">
      ${renderSectionHeader({
        title: '支部目录',
        description: `${branches.length} 个支部`,
        actions: '<button id="branch-add-toggle" type="button" class="btn-accent px-3 py-2 text-sm font-medium" aria-expanded="false" aria-controls="branch-form-wrap">新建支部</button>',
        level: 3,
      })}
      <div id="pc-branches-branch-filter" class="mb-4 mt-4"></div>
      <div id="branch-form-wrap" role="group" class="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4" aria-label="新建支部" hidden>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div><label class="mb-1 block text-xs text-gray-600" for="branch-name-input">支部名称</label><input id="branch-name-input" type="text" class="input-flat w-full" placeholder="支部全称" /></div>
          <div><label class="mb-1 block text-xs text-gray-600" for="branch-type-input">类型（可选）</label><input id="branch-type-input" type="text" class="input-flat w-full" placeholder="如本科生、硕士生" /></div>
        </div>
        <div class="mt-3 flex justify-end gap-2"><button id="branch-form-cancel" type="button" class="btn-outline px-3 py-2 text-sm">取消</button><button id="branch-form-submit" type="button" class="btn-accent px-3 py-2 text-sm font-medium">创建支部</button></div>
      </div>
      ${branches.length ? `<div class="pc-table-scroll pc-table-scroll--branches mt-4"><table class="data-table data-table--compare" data-responsive="cards">
        <caption class="visually-hidden">支部目录：按支部比较运行状态、在册人数和维护入口</caption>
        <thead><tr><th scope="col">支部</th><th scope="col">状态</th><th scope="col">成员</th><th scope="col">在册党员</th><th scope="col">活动</th><th scope="col">专班</th><th scope="col">通知</th><th scope="col">待批复</th><th scope="col">组织提醒</th><th scope="col">操作</th></tr></thead><tbody>
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
          // A05：待批复数量列（与旧「支部动态」同口径：pending 按 branchId 计数，链接带支部筛选）。
          const pendingCount = pendingRequests.filter((request) => request.branchId === bid).length;
          const pendingCell = pendingCount
            ? `<a class="font-semibold text-amber-800 hover:text-accent" href="${getBasePath()}workspace/party-committee.html?tab=review&amp;branchId=${encodeURIComponent(bid)}" title="查看该支部待批复上报">${pendingCount} 项</a>`
            : '<span class="text-gray-500">0 项</span>';
          // 2026-10-18 繁专项（Top 8）：组织提醒按目录行 `secretaryId` 判断（服务端目录投影已补该字段），
          //   不再被 `summaryOnly` 抑制；口径＝运行中且未任命支书（A06 治理总览撤页后，原「组织待补」只此一处）。
          const missingSecretary = isActive && !b.secretaryId;
          return `<tr data-branch-card="${esc(bid)}">
            <td data-label="支部"><div class="font-semibold text-gray-900">${esc(b.config?.headerTitle || b.name)}</div><div class="mt-0.5 text-xs text-gray-500">${esc(b.type || '支部')}</div></td>
            <td data-label="状态"><span class="text-sm ${isActive ? 'text-green-700' : 'text-gray-500'}">${isActive ? '运行中' : '已停用'}</span></td>
            <td data-label="成员" class="tabular-nums">${memberCount}${memberCount === '—' ? '' : ' 人'}</td><td data-label="在册党员" class="tabular-nums">${partyCount}${partyCount === '—' ? '' : ' 人'}</td>
            <td data-label="活动" class="tabular-nums">${activityText}</td><td data-label="专班" class="tabular-nums">${taskforceText}</td><td data-label="通知" class="tabular-nums">${noticeText}</td>
            <td data-label="待批复" class="tabular-nums">${pendingCell}</td>
            <td data-label="组织提醒">${missingSecretary ? '<span class="text-sm text-amber-800">待任命支书</span>' : '<span class="text-sm text-gray-500">—</span>'}</td>
            <td data-label="操作"><div class="flex flex-wrap gap-2"><button type="button" class="btn-outline whitespace-nowrap px-3 py-2 text-sm" data-branch-roster-toggle data-branch-id="${esc(bid)}" aria-expanded="false" aria-controls="branch-roster-${esc(bid)}">名册</button><a class="btn-accent inline-flex whitespace-nowrap px-3 py-2 text-sm font-medium" href="${configureUrl}">支部设置</a><button type="button" class="btn-outline branch-readonly-enter whitespace-nowrap px-3 py-2 text-sm" data-branch-id="${esc(bid)}">查看该支部</button></div></td>
          </tr>`;
        }).join('')}
        </tbody></table></div>` : `<p class="mt-4 py-8 text-sm text-gray-600" role="status">尚无支部。创建支部后，再进入其配置页完成组织设置。</p>`}
      </section>
      <section class="card p-5" aria-label="运维健康">
        ${renderSectionHeader({
          title: '运维健康',
          description: '服务进程、数据库与备份目录的当前状态；异常时向支书发站内通知与邮件。',
          actions: '<button id="pc-ops-health-refresh" type="button" class="btn-outline px-3 py-2 text-sm">重新检查</button>',
          level: 3,
        })}
        <div id="pc-ops-health-body" class="mt-3" role="status" aria-live="polite"></div>
      </section>
    </div>`;

  // 支部筛选（A05 自「支部动态」迁入）：选中后只出该支部的目录行；变更即重渲本页。
  renderBranchFilter(el.querySelector('#pc-branches-branch-filter'), {
    stateKey: BRANCH_FILTER_STATE,
    tabId: 'branches', // API 模式整页跳转后仍留在本页（登录缺省 tab 已是 review）
    onChange: () => renderContent(),
  });

  // 新建表单开关（2026-10-25 Task 3：`aria-expanded` + `hidden` 属性，不再用 `.hidden`）
  const toggle = el.querySelector('#branch-add-toggle');
  const formWrap = el.querySelector('#branch-form-wrap');
  toggle?.addEventListener('click', () => {
    if (!formWrap) return;
    formWrap.hidden = !formWrap.hidden;
    toggle.setAttribute('aria-expanded', String(!formWrap.hidden));
  });
  el.querySelector('#branch-form-cancel')?.addEventListener('click', () => {
    if (!formWrap) return;
    formWrap.hidden = true;
    toggle?.setAttribute('aria-expanded', 'false');
  });

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

  // 运维健康读数（T3）：进页自动读一次；「重新检查」重读（不重渲整页，保留目录滚动位置）。
  const healthBody = el.querySelector('#pc-ops-health-body');
  void renderOpsHealth(healthBody);
  el.querySelector('#pc-ops-health-refresh')?.addEventListener('click', () => { void renderOpsHealth(healthBody); });

  // 从目录打开独立党委只读支部视图；支书工作台不再承担跨角色下钻。
  bindBranchReadOnlyButtons(el);
}
