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
// U3（2026-09-07）「卡片先占位不弹跳」：治理总览两级渐进——首帧先渲染「顶部+全委统计条」，
//   支部概览卡列表先等高骨架占位（#pc-branch-cards），下一帧填充真实卡网格（避免整块弹出支部卡）。

import { mockDB } from '../../../core/domain.js?v=20260903c';
import { PersonStore, getPersonName } from '../../../services/person.js?v=20260907b';
import { getRosterStats, RESIDENCE_KEY } from '../../../services/roster.js?v=20260903c';
import { getCommitteeName } from '../../../services/branch.js?v=20260903c';
import { escHtml as esc } from '../../../core/utils.js?v=20260903c';
import { tokenOf } from '../../../core/version-token.js?v=20260907b'; // P0 域写版本戳（spec §二.4）
import { PREVIEW_KEY } from '../../../services/org-base-data-preview.js?v=20260903c'; // 基础数据预览 raw 源
import { memoizeRender } from '../../../components/memoize-render.js?v=20260907b'; // P2 渲染守卫（spec §四.1）
import { bindBranchDemoButtons } from '../../../modules/branch-demo-nav.js?v=20260903c';

/** 支部概览卡等高骨架（网格占位，防「支部卡列表整块弹出」；styles.css 禁改不碰） */
function _branchCardsSkeleton() {
  const card = `
    <div class="rounded-lg border border-gray-200 bg-white p-4" style="min-height:216px;">
      <div class="h-5 w-28 rounded bg-gray-100 animate-pulse mb-3"></div>
      <div class="h-3 w-40 rounded bg-gray-100 animate-pulse mb-4"></div>
      <div class="grid grid-cols-3 gap-3 mb-3">
        <div class="h-14 rounded-lg bg-gray-100 animate-pulse"></div>
        <div class="h-14 rounded-lg bg-gray-100 animate-pulse"></div>
        <div class="h-14 rounded-lg bg-gray-100 animate-pulse"></div>
      </div>
      <div class="h-8 rounded-lg bg-gray-100 animate-pulse"></div>
    </div>`;
  return `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">${card}${card}</div>`;
}

// ── P2 渲染守卫 key（2026-09-07 · spec §四.1）─────────────────────
// 支部统计/展示的数据版本 = member token（PersonStore.getMembers / getRosterStats 口径）
//   + 滞留覆盖/基础数据预览 raw 源（roster/预览写口不在 bump 链 → raw 内容兜底）
//   + activity token + activities.length（支部近期动态摘要 / 活动计数）
//   + 支部行指纹 id:名称:类型:状态（支部配置写口无 token → 行指纹兜底）
//   + notices.length（全院通知计数）。命中 → 整卡保留（跳过统计/拼装/rAF 二次填充）。
function _rawStorage(key) {
  try { return typeof localStorage === 'undefined' ? '' : (localStorage.getItem(key) || ''); } catch (_) { return ''; }
}
function _branchFingerprint(branches) {
  return (branches || []).map(b =>
    `${b.id}:${b.config?.headerTitle || b.name || ''}:${b.type || ''}:${b.status || ''}`
  ).join('~');
}
function _governanceMemoKey(activities, branches, noticeCount) {
  return [
    `member=${tokenOf('member')}|${_rawStorage(RESIDENCE_KEY)}|${_rawStorage(PREVIEW_KEY)}`,
    `activity=${tokenOf('activity')}+${(activities || []).length}`,
    `notice=${noticeCount || 0}`,
    `branch=${_branchFingerprint(branches)}`,
  ].join('|');
}

export function renderContent(ctx) {
  const el = document.getElementById('party-committee-tab-content');
  if (!el) return;

  const activities = ctx?.activities || mockDB.activities || [];
  const branches = (mockDB.branches || []).filter(b => b && b.id);
  const noticeCount = (mockDB.notices || []).length;

  // P2 渲染守卫：统计/支部数据版本未变且现 DOM 为上次真实产物 → 整卡保留
  // （跳过逐支部实时统计 / HTML 拼装 / rAF 二次填充；现有骨架+填充流程保留为重建路径）。
  memoizeRender(el, _governanceMemoKey(activities, branches, noticeCount), () => {
    _renderGovernance(el, activities, branches, noticeCount);
  }, { marker: '[data-ws-memo="governance"]' });
}

/**
 * 治理总览整卡重建（渲染守卫未命中时执行；产物含 data-ws-memo="governance" 标记，
 * 防同内容容器跨 tab 复用时的 memoKey 残留误命中）。U3 渐进两段式：统计条 + 支部卡
 * 骨架占位 → rAF 填充真实卡网格（宿主被切 tab 重建则跳过）。
 */
function _renderGovernance(el, activities, branches, noticeCount) {
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

  // U3：首帧 = 统计条（登录落点首见信息）+ 支部卡骨架占位；第二帧 = 真实支部卡网格
  el.innerHTML = `
    <div class="space-y-5" data-ws-memo="governance">
      <!-- 顶部：院系党组织 + 全委统计条 -->
      <div class="rounded-lg border border-gray-200 bg-white p-4">
        <div class="flex items-center justify-between">
          <div class="min-w-0">
            <p class="text-xs text-gray-400">院系党组织 · 治理总览</p>
            <p class="font-title-cn text-lg font-bold text-gray-800 truncate">${esc(getCommitteeName())}</p>
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

      <!-- 支部概览卡列表（先骨架占位，rAF 后填充真实卡网格 → 「进入支部（演示）」） -->
      <div id="pc-branch-cards">${_branchCardsSkeleton()}</div>

      <p class="text-xs text-gray-400">党委组织：${esc(getCommitteeName())} · 支部 ${branches.length} 个 · 在册成员合计 ${totals.members} 人</p>
    </div>
  `;

  const cardsHtml = rows.map(r => `
    <div class="rounded-lg border border-gray-200 bg-white p-4 flex flex-col" data-branch-card="${esc(r.id)}">
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
          title="打开该支部书记工作台（演示视图）">进入支部（演示）</button>
      </div>
    </div>`).join('');

  // U3：支部卡 rAF 渐进填充（宿主被切 tab 重建则跳过）；「进入支部（演示）」绑定随卡渲染
  requestAnimationFrame(() => {
    const host = document.getElementById('pc-branch-cards');
    if (!host || !host.isConnected) return;
    host.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">${cardsHtml}</div>`;
    // 「进入支部（演示）」：经 modules/branch-demo-nav.js 统一放行校验（本地开发 + 非 API 登录）
    bindBranchDemoButtons(el);
  });
}
