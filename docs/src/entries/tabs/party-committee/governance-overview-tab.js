// role: [工程师]+[AI]
// 党委工作台 Tab：治理总览（立项⑦ B波，2026-09-06）
// 党委「治理总览」= 治理面首页 / 登录落点（置首 tab，先总览再进监控/支部管理/审批/下发/配置）。
// C⑤（2026-09-10 支书裁定）：本页只呈「全院级汇总数字」（支部数/在册成员合计/在册党员/滞留/全院通知），
//   支部级明细（支部名/支书/成员数/党员数/滞留/近期活动/进入支部）全部收归「支部监控台账」一处，
//   避免同源字段两处呈现、用户自判权威源；内容仅剩汇总数字 → 合并进页首内联统计条，不设支部卡、不留空壳卡。
// 数据口径（服务层统计，勿直读裸 seed）：
//   · 支部实例 = mockDB.branches（branch.js 读写同一数据源；loadDB 后为实时实例）
//   · 在册成员合计 = PersonStore.getMembers() 按 branchId 过滤后逐支部求和（含 members 覆盖层/预览，实时统计）
//   · 在册党员 / 滞留 = services/roster.js getRosterStats 逐支部上卷为全院合计（与会议「应到名单」同口径：
//     党员=正式/预备，滞留=组织关系保留但人不在校、应到剔除；含组织委员运行期覆盖）
//   · 全院通知 = mockDB.notices 计数
// 消费方：party-committee-workspace.js tabs 清单首项；ws-party-committee-entry defaultTab。

import { mockDB } from '../../../core/domain.js?v=20260915g';
import { PersonStore } from '../../../services/person.js?v=20260915g';
import { getRosterStats, RESIDENCE_KEY } from '../../../services/roster.js?v=20260915g';
import { getCommitteeName } from '../../../services/branch.js?v=20260915g';
import { escHtml as esc } from '../../../core/utils.js?v=20260915g';
import { tokenOf } from '../../../core/version-token.js?v=20260915g'; // P0 域写版本戳（spec §二.4）
import { PREVIEW_KEY } from '../../../services/org-base-data-preview.js?v=20260915g'; // 基础数据预览 raw 源
import { memoizeRender } from '../../../components/memoize-render.js?v=20260915g'; // P2 渲染守卫（spec §四.1）

// ── P2 渲染守卫 key（2026-09-07 · spec §四.1）─────────────────────
// 全院汇总数字的数据版本 = member token（PersonStore.getMembers / getRosterStats 口径）
//   + 滞留覆盖/基础数据预览 raw 源（roster/预览写口不在 bump 链 → raw 内容兜底）
//   + 支部行指纹 id:名称:类型:状态（支部配置/增删写口无 token → 行指纹兜底）
//   + notices.length（全院通知计数）。命中 → 整卡保留（跳过统计/拼装）。
function _rawStorage(key) {
  try { return typeof localStorage === 'undefined' ? '' : (localStorage.getItem(key) || ''); } catch (_) { return ''; }
}
function _branchFingerprint(branches) {
  return (branches || []).map(b =>
    `${b.id}:${b.config?.headerTitle || b.name || ''}:${b.type || ''}:${b.status || ''}`
  ).join('~');
}
function _governanceMemoKey(branches, noticeCount) {
  return [
    `member=${tokenOf('member')}|${_rawStorage(RESIDENCE_KEY)}|${_rawStorage(PREVIEW_KEY)}`,
    `notice=${noticeCount || 0}`,
    `branch=${_branchFingerprint(branches)}`,
  ].join('|');
}

export function renderContent(ctx) {
  const el = document.getElementById('party-committee-tab-content');
  if (!el) return;

  const branches = (mockDB.branches || []).filter(b => b && b.id);
  const noticeCount = (mockDB.notices || []).length;

  // P2 渲染守卫：全院汇总数字版本未变且现 DOM 为上次真实产物 → 整卡保留（跳过逐支部统计 / HTML 拼装）。
  memoizeRender(el, _governanceMemoKey(branches, noticeCount), () => {
    _renderGovernance(el, branches, noticeCount);
  }, { marker: '[data-ws-memo="governance"]' });
}

/**
 * 治理总览整卡重建（渲染守卫未命中时执行；产物含 data-ws-memo="governance" 标记，
 * 防同内容容器跨 tab 复用时的 memoKey 残留误命中）。
 * C⑤：仅院系党组织 + 全院级汇总数字 → 页首内联统计条（同活动管理内联条风格），
 * 支部级明细一律不在此呈现（收归「支部监控台账」）。
 */
function _renderGovernance(el, branches, noticeCount) {
  // ── 全院级汇总（逐支部实时统计后上卷；成员/党员增删改后即时刷新）──
  const totals = branches.reduce((acc, b) => {
    const roster = getRosterStats({ branchId: b.id });
    return {
      members: acc.members + PersonStore.getMembers().filter(p => p.branchId === b.id).length,
      party: acc.party + roster.partyTotal,      // 在册党员（正式+预备）
      detained: acc.detained + roster.detainedParty, // 滞留党员（应到口径剔除）
    };
  }, { members: 0, party: 0, detained: 0 });

  el.innerHTML = `
    <div class="space-y-4" data-ws-memo="governance">
      <!-- 页首内联统计条：院系党组织 + 全院级汇总数字（支部级明细统一见「支部监控台账」） -->
      <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-500 py-2 border-b border-gray-100">
        <span class="inline-flex items-center gap-1.5">
          <span class="font-title-cn text-sm font-bold text-gray-700">${esc(getCommitteeName())}</span>
          <span>· 治理总览</span>
        </span>
        <span class="inline-flex items-center gap-1.5" title="全院支部实例数">
          <span class="font-semibold text-gray-700 tabular-nums">${branches.length}</span>
          <span>支部数（个）</span>
        </span>
        <span class="inline-flex items-center gap-1.5" title="全院在册成员合计（PersonStore 实时统计）">
          <span class="font-semibold text-gray-700 tabular-nums">${totals.members}</span>
          <span>在册成员合计（人）</span>
        </span>
        <span class="inline-flex items-center gap-1.5" title="全院在册党员（正式+预备，同会议应到名单）">
          <span class="font-semibold text-gray-700 tabular-nums">${totals.party}</span>
          <span>在册党员（正式+预备）（人）</span>
        </span>
        <span class="inline-flex items-center gap-1.5" title="全院滞留党员（组织关系保留、人不在校，应到剔除）">
          <span class="font-semibold text-gray-700 tabular-nums">${totals.detained}</span>
          <span>滞留党员（应到剔除）（人）</span>
        </span>
        <span class="inline-flex items-center gap-1.5" title="全院通知条数">
          <span class="font-semibold text-gray-700 tabular-nums">${noticeCount}</span>
          <span>全院通知（条）</span>
        </span>
      </div>
      <p class="text-xs text-gray-500">
        <button type="button" id="gov-monitor-jump" class="text-blue-700 hover:text-blue-900 underline decoration-dotted" style="cursor:pointer;">支部级明细统一见「支部监控台账」→</button>
      </p>
    </div>
  `;

  // B8①（2026-09-12）：原文案为纯文本「支部级明细见…」无下钻入口 → 该行改为可点，跳「支部监控台账」
  el.querySelector('#gov-monitor-jump')?.addEventListener('click', () => {
    document.querySelector('.party-committee-tab-btn[data-party-committee-tab="monitor"]')?.click();
  });
}
