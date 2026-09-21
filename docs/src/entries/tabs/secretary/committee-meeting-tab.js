// role: [工程师]+[AI]
// 支书工作台 Tab：支委会会议（线上召开入口，批次 105 / D-526）
// 本 tab 只做**入口**（页签体例照既有 *-workspace.js 的 lazy render）：真正的开会链路
// 在独立页 docs/party-committee-meeting.html（选线上召开 → 提取议程 → 委员表态 → 汇总截止 → 查阅讨论结果）。
// 不在本 tab 内平铺列表/表格：支委会场次会随年份增长，避免第二套分页口径（见 D-522「入口＝支书台新增会议页」）。
import { mockDB } from '../../../core/domain.js?v=20260921n';

/** 支委会场次统计（type='支委会' 或 scenarioId='branch-committee'；线上＝voteConfig.mode==='async'） */
function countMeetings() {
  const all = (mockDB.activities || []).filter((a) => a && (a.type === '支委会' || a.scenarioId === 'branch-committee'));
  const online = all.filter((a) => a.voteConfig && a.voteConfig.mode === 'async');
  const open = online.filter((a) => a.votesLocked !== true);
  return { total: all.length, online: online.length, open: open.length };
}

export function renderContent() {
  const tc = document.getElementById('secretary-tab-content');
  if (!tc) return;
  const { total, online, open } = countMeetings();
  tc.dataset.currentTab = 'committee-meeting';
  tc.innerHTML = `
    <div class="space-y-4">
      <div class="rounded-lg border border-gray-200 bg-white p-4">
        <p class="font-title-cn text-base font-bold text-gray-800">支委会会议（线上召开）</p>
        <p class="text-xs text-gray-500 mt-1.5 leading-relaxed">
          选一场支委会标为线上召开 → 从既有来源提取议程 → 支委在线表态 → 汇总并截止 → 留存、查阅讨论结果。
        </p>
        <div class="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-gray-600 mt-3">
          <span>支委会场次 <strong>${total}</strong></span>
          <span>其中线上召开 <strong>${online}</strong></span>
          <span>未截止 <strong>${open}</strong></span>
        </div>
        <div class="mt-3">
          <a href="../party-committee-meeting.html" class="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg text-white font-medium" style="background:#C8102E;text-decoration:none;">打开支委会会议页 →</a>
        </div>
      </div>
    </div>`;
}
