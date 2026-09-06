// role: [工程师]+[AI]
// 党委工作台 Tab：治理总览（立项⑦ B波，2026-09-06）
// 党委「治理总览」= 治理面首页 / 登录落点（置首 tab，先总览再进监控/支部管理/审批/下发/配置）。
// 内容：顶部全委统计条（支部数/在册成员/在册党员/滞留/全院通知）+ 支部概览卡列表
//      （支部名/当前成员数/在册党员/滞留/近期动态摘要）+ 支部卡「进入支部（演示）」动作。
// 数据口径（服务层统计，勿直读裸 seed）：
//   · 支部实例 = mockDB.branches（branch.js 读写同一数据源；loadDB 后为实时实例，非 mock/branches.js 种子直连）
//   · 当前成员数 = PersonStore.getMembers() 按 branchId 过滤（含 members 覆盖层/预览，实时统计）
//   · 在册党员 / 滞留 = services/roster.js getRosterStats（与会议「应到名单」同口径：
//     党员=正式/预备，滞留=组织关系保留但人不在校、应到剔除；含组织委员运行期覆盖）
//   · 近期动态摘要 = ctx.activities（工作台已加载活动台账）按支部归属取最近活动 + 全院通知计数
// 消费方：party-committee-workspace.js tabs 清单首项；ws-party-committee-entry defaultTab。

import { mockDB } from '../../../core/domain.js?v=20260903c';
import { PersonStore, getPersonName } from '../../../services/person.js?v=20260903c';
import { getRosterStats } from '../../../services/roster.js?v=20260903c';
import { getCommitteeName } from '../../../services/branch.js?v=20260903c';
import { escHtml as esc } from '../../../core/utils.js?v=20260903c';
import { bindBranchDemoButtons } from '../../../modules/branch-demo-nav.js?v=20260903c';

export async function renderContent(ctx) {
  const el = document.getElementById('party-committee-tab-content');
  if (!el) return;

  const activities = ctx?.activities || mockDB.activities || [];
  const branches = (mockDB.branches || []).filter(b => b && b.id);
  const noticeCount = (mockDB.notices || []).length;

  // ── 支部维度实时统计（每次渲染现算 → 成员/党员增删改后即时刷新）──
  const rows = branches.map(b => {
    const bid = b.id;
    const roster = getRosterStats({ branchId: bid });
    const branchActs = activities
      .filter(a => (a.branchId || 'br-b1') === bid && a.status !== 'cancelled')
      .sort((x, y) => String(y.date || '').localeCompare(String(x.date || '')));
    return {
      id: bid,
      name: b.config?.headerTitle || b.name || bid,
      type: b.type || '支部',
      status: b.status,
      secretaryName: b.secretaryId ? getPersonName(b.secretaryId) : '（待任命）',
      memberCount: PersonStore.getMembers().filter(p => p.branchId === bid).length,
      partyTotal: roster.partyTotal,        // 在册党员（正式+预备）
      detained: roster.detainedParty,       // 滞留党员（应到口径剔除）
      activityCount: branchActs.length,
      recent: branchActs.slice(0, 3),
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      members: acc.members + r.memberCount,
      party: acc.party + r.partyTotal,
      detained: acc.detained + r.detained,
      activities: acc.activities + r.activityCount,
    }),
    { members: 0, party: 0, detained: 0, activities: 0 }
  );

  el.innerHTML = `
    <div class="space-y-5">
      <!-- 顶部：院系党组织 + 全委统计条 -->
      <div class="rounded-xl border border-gray-200 bg-white p-4">
        <div class="flex items-center justify-between">
          <div class="min-w-0">
            <p class="text-xs text-gray-400">院系党组织 · 治理总览</p>
            <p class="font-title-cn text-lg font-bold text-gray-800 truncate">${esc(getCommitteeName())}</p>
            <p class="text-xs text-gray-400 mt-0.5">支部治理首页 — 支部概览 / 成员规模 / 近期动态（登录落点，先总览再进各业务 tab）</p>
          </div>
          <div class="text-right shrink-0">
            <p class="text-2xl font-bold text-red-600">${branches.length}</p>
            <p class="text-xs text-gray-400">支部实例</p>
          </div>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <div class="rounded-lg bg-gray-50 p-3">
            <p class="text-xs text-gray-400">在册成员合计</p>
            <p class="text-xl font-bold text-gray-800 mt-1">${totals.members}<span class="text-xs font-normal text-gray-400"> 人</span></p>
          </div>
          <div class="rounded-lg bg-gray-50 p-3">
            <p class="text-xs text-gray-400">在册党员（正式+预备）</p>
            <p class="text-xl font-bold text-gray-800 mt-1">${totals.party}<span class="text-xs font-normal text-gray-400"> 人</span></p>
          </div>
          <div class="rounded-lg bg-gray-50 p-3">
            <p class="text-xs text-gray-400">滞留党员（应到剔除）</p>
            <p class="text-xl font-bold text-gray-800 mt-1">${totals.detained}<span class="text-xs font-normal text-gray-400"> 人</span></p>
          </div>
          <div class="rounded-lg bg-gray-50 p-3">
            <p class="text-xs text-gray-400">全院通知</p>
            <p class="text-xl font-bold text-gray-800 mt-1">${noticeCount}<span class="text-xs font-normal text-gray-400"> 条</span></p>
          </div>
        </div>
      </div>

      <!-- 支部概览卡列表（支部列表 → 「进入支部（演示）」） -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${rows.map(r => `
          <div class="rounded-xl border border-gray-200 bg-white p-4 flex flex-col" data-branch-card="${esc(r.id)}">
            <div class="flex items-start justify-between gap-2 mb-2">
              <div class="min-w-0">
                <p class="font-title-cn text-base font-bold text-gray-800 truncate">${esc(r.name)}</p>
                <p class="text-xs text-gray-400 mt-0.5">${esc(r.type)} · 现任书记：${esc(r.secretaryName)}</p>
              </div>
              <span class="text-xs px-2 py-0.5 rounded-full shrink-0 ${r.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}">${r.status === 'active' ? '运行中' : esc(r.status)}</span>
            </div>
            <div class="grid grid-cols-3 gap-3 mb-3">
              <div class="rounded-lg bg-gray-50 p-2.5">
                <p class="text-xs text-gray-400">当前成员</p>
                <p class="text-lg font-bold text-gray-800 mt-0.5">${r.memberCount}<span class="text-xs font-normal text-gray-400"> 人</span></p>
              </div>
              <div class="rounded-lg bg-gray-50 p-2.5">
                <p class="text-xs text-gray-400">在册党员</p>
                <p class="text-lg font-bold text-gray-800 mt-0.5">${r.partyTotal}<span class="text-xs font-normal text-gray-400"> 人</span></p>
              </div>
              <div class="rounded-lg bg-gray-50 p-2.5">
                <p class="text-xs text-gray-400">滞留</p>
                <p class="text-lg font-bold text-gray-800 mt-0.5">${r.detained}<span class="text-xs font-normal text-gray-400"> 人</span></p>
              </div>
            </div>
            <div class="mb-3">
              <p class="text-xs text-gray-400 mb-1.5">近期动态（最近组织生活 ${r.activityCount} 场）</p>
              ${r.recent.length ? `
                <div class="flex flex-col gap-1">
                  ${r.recent.map(a => `<span class="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded px-2 py-1">${esc(a.date?.slice(5) || '')} ${esc(a.title)}</span>`).join('')}
                </div>` : `<p class="text-xs text-gray-400">暂无组织生活记录</p>`}
            </div>
            <div class="mt-auto flex items-center justify-between gap-2 pt-1 border-t border-gray-100">
              <p class="text-xs text-gray-400">支部 ${esc(r.type)} · 组织生活共 ${r.activityCount} 场</p>
              <button type="button" class="branch-demo-enter text-xs px-3 py-1.5 rounded-lg text-white font-medium shrink-0" data-branch-id="${esc(r.id)}"
                title="以分支上下文打开该支部书记工作台（演示视图；本地开发 + 非真实后端登录可用）">进入支部（演示）</button>
            </div>
          </div>`).join('')}
      </div>

      <p class="text-xs text-gray-400">党委组织：${esc(getCommitteeName())} · 支部 ${branches.length} 个 · 在册成员合计 ${totals.members} 人（通知计数为全院全域——业务数据域尚未按支部实例分区）</p>
    </div>
  `;

  // 「进入支部（演示）」：经 modules/branch-demo-nav.js 统一放行校验（本地开发 + 非 API 登录）
  bindBranchDemoButtons(el);
}
