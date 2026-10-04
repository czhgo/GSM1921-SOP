// role: [工程师]+[AI]
// 支书工作台 Tab：支委会（2026-09-20 批次 105 · D-526 建「支委会会议」入口；2026-09-27 支委会迁移批
//   改名「支委会」并按「一 tab 一问」分步：① 机构构成（支委会由谁组成）→ ② 支委会会议（议事入口））。
//   判据（支书 2026-09-27 裁定，逐字）：「支委会吧。因为支部大会选举支委，然后支委会讨论分工！」
//   ⇒ 「支委会由谁组成」归本 tab；原落支书台「党小组与活动」的支委身份配置（情景①b）按组织层级
//   （母本 content/02_institution/COMMISSIONER_DUTY_FRAMEWORK.md §A.3「支委会领导党小组」）迁入本 tab。
//   ② 只做**入口**（页签体例照既有 *-workspace.js 的 lazy render）：真正的开会链路在独立页
//   docs/party-committee-meeting.html（选线上召开 → 提取议程 → 委员表态 → 汇总截止 → 查阅讨论结果）。
//   不在本 tab 内平铺列表/表格：支委会场次会随年份增长，避免第二套分页口径（见 D-522「入口＝支书台新增会议页」）。
import { mockDB } from '../../../core/domain/domain.js?v=20261004h';
// 机构构成（支委身份配置）实现单一源＝assign-tab.js::mountCommissionerAssign——本 tab 只给落点宿主，
//   不新造第二套视觉/表单（同 group-progress-tab.js 的既有形态：宿主自带卡壳，填入方只出卡内容）。
import { mountCommissionerAssign } from './assign-tab.js?v=20261004h';

/** 支委会场次统计（type='支委会' 或 scenarioId='branch-committee'；线上＝voteConfig.mode==='async'）
 *  口径（2026-09-27 · R3）：**面向进行时、非累计存量**（判据＝DESIGN_SYSTEM.md:55 §一 原则11
 *  「工作界面不得出现『已完成 N / 总数』式无差异存量统计」）——只给「未截止（线上召开中，待支书
 *  汇总截止）」与「待记录结论（已有带编号议程但尚未记录结果）」，不再报「累计场次 / 其中线上召开」。 */
function countMeetings() {
  const all = (mockDB.activities || []).filter((a) => a && (a.type === '支委会' || a.scenarioId === 'branch-committee'));
  const online = all.filter((a) => a.voteConfig && a.voteConfig.mode === 'async');
  const open = online.filter((a) => a.votesLocked !== true);
  // 已有带编号议程、但仍有未记录结果者 —— 需支书记录讨论结果（面向进行时）
  const pendingResult = all.filter((a) => {
    const items = (a.agenda || []).filter((x) => x && x.id);
    return items.length > 0 && items.some((x) => !x.result);
  });
  return { open: open.length, pendingResult: pendingResult.length };
}

export function renderContent() {
  const tc = document.getElementById('secretary-tab-content');
  if (!tc) return;
  const { open, pendingResult } = countMeetings();
  tc.dataset.currentTab = 'committee-meeting';
  tc.innerHTML = `
    <div class="space-y-4">
      <div class="rounded-lg border border-gray-200 bg-white p-4">
        <p class="font-title-cn text-base font-bold text-gray-800">支委会 · 机构构成</p>
        <p class="text-xs text-gray-500 mt-1.5 leading-relaxed">
          支书 / 副支书身份由党委配置；组织委员、宣传委员、纪检委员在此授予或改派、可撤销。
        </p>
        <div id="cm-commissioner-host" class="mt-3"></div>
      </div>
      <div class="rounded-lg border border-gray-200 bg-white p-4">
        <p class="font-title-cn text-base font-bold text-gray-800">支委会会议</p>
        <p class="text-xs text-gray-500 mt-1.5 leading-relaxed">
          选一场支委会标为线上召开 → 从既有来源提取议程 → 支委在线表态 → 汇总并截止 → 留存、查阅讨论结果。
        </p>
        <div class="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-gray-600 mt-3">
          <span>未截止（线上召开中）<strong>${open}</strong></span>
          <span>待记录结论 <strong>${pendingResult}</strong></span>
        </div>
        <div class="mt-3">
          <a href="./party-committee-meeting.html" class="btn-accent inline-flex items-center gap-1 text-xs px-3 py-1.5 font-medium" style="text-decoration:none;">打开支委会会议页 →</a>
        </div>
      </div>
    </div>`;
  mountCommissionerAssign(tc.querySelector('#cm-commissioner-host'));
}
