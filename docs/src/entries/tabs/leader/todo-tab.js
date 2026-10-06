// role: [工程师]+[AI]
// 组长工作台 Tab：待办（T-279 M2 拆分；T-304 代码减负 2026-08-30：骨架并入 todo-tab-shell）
// 最小三成本原则落地：进入即见首条详情，减一次点击。

import { showToast } from '../../../core/base/utils.js?v=20261006a';
import { createTodoTab } from '../../../components/record/todo-tab-shell.js?v=20261006a';
import { tryDirectJump } from '../../../components/record/todo-jump.js?v=20261006a';
import { mockDB } from '../../../core/domain/domain.js?v=20261006a';
import { AuthStore } from '../../../services/core/auth.js?v=20261006a';
import { getBranchIdOfPerson, getBranchWorkforce } from '../../../services/branch/branch.js?v=20261006a';
import { buildModuleCycleRemindGroup } from '../../../services/governance/todo.js?v=20261006a';

/**
 * 本台实时组（不落库）：**模块周期提醒**（2026-10-06 批次 423 · `R-29⑤` · `D-804`）
 * 口径：本台主体（登录角色键 ＋ 本人 personId）名下、**有制度固定周期**的支部分工模块
 *   （`core/domain/work-map.js::WORK_MAP_MODULES[].cycle`），**本期未见对应活动** ⇒ 出组卡。
 *   **纯读**：不落库、不改数据、不派任务（与组织台「半年考察提醒」同体例）。
 * 分工快照取法照 `components/governance/workforce-duty-card.js`（同一口径，勿另写）。
 */
function _buildLeaderRealtimeGroups() {
  const me = AuthStore.getCurrentUser && AuthStore.getCurrentUser();
  if (!me) return [];
  const personId = me.personId || me.id;
  const branchId = personId ? getBranchIdOfPerson(personId) : null;
  const snapshot = branchId ? getBranchWorkforce(branchId) : null;
  const group = buildModuleCycleRemindGroup({
    activities: [...(mockDB.activities || [])],
    subjectIds: [me.role, personId].filter(Boolean),
    snapshot,
  });
  return group ? [group] : [];
}

function _handleTodoAction(todo, ctx) {
  // 直达跳转（通知阅读 T-234 F1 / 报名审核 T-233）已收敛于 components/record/todo-jump.js（2026-09-04）
  if (tryDirectJump(todo)) return;
  // 根据 actionType 跳转到对应 tab
  // 无生产者残留键清理（IA-C1 Task5 登记 2026-09-06）：actionKey 级 attendance-upload/review-submit
  // 与 actionType submit（考勤上传）旧键均无派生器（组长赋权=activity-authorize、报名审核=signup-review
  // 走 tryDirectJump 优先直达），仅余 authorize/review 兜底——未知键落下方 else「请处理」提示。
  const tabMap = {
    authorize: 'write',
    review: 'review',
  };
  const targetTab = tabMap[todo.actionType];
  if (targetTab) {
    // 激活对应 tab
    const btn = document.querySelector(`.leader-tab-btn[data-leader-tab="${targetTab}"]`);
    if (btn) btn.click();
    // T-190 赋权待办兜底：直达活动详情内联编辑（≤2 跳）
    // 2026-08-24 T-280-B1 实测修复：① 聚合对象无 sourceId（getGroupedByAction 聚合不含该字段），
    // 须从 items[0] 取；② 目标 tab 为懒加载动态 import 渲染异步 + 渲染中间态元素可能被重建，
    // 以「详情面板打开」为完成条件轮询重试点击
    const authSrcId = todo.sourceId || (todo.items && todo.items[0] && todo.items[0].sourceId);
    if (todo.actionType === 'authorize' && authSrcId) {
      let tries = 0;
      const timer = setInterval(() => {
        const actItem = document.querySelector(`.leader-act-item[data-act-id="${authSrcId}"]`);
        const panel = document.getElementById('leader-act-detail');
        if (panel && !panel.classList.contains('hidden')) { clearInterval(timer); return; } // 详情已打开
        if (actItem) actItem.click();
        if (++tries > 40) clearInterval(timer); // 4s 超时（懒加载渲染 + 重建窗口）
      }, 100);
    }
    const tabLabel = { write: '活动写入', review: '复盘状态' }[targetTab] || '';
    showToast('info', `已跳转到${tabLabel}，请处理：${todo.title}`);
  } else {
    showToast('info', `请处理：${todo.title}`);
  }
}

export const { renderContent } = createTodoTab({
  containerId: 'leader-tab-content',
  prefix: 'leader',
  role: 'leader',
  onAction: _handleTodoAction,
  // 模块周期提醒实时组（`R-29⑤` · `D-804`；纯读、不落库）
  buildRealtimeGroups: _buildLeaderRealtimeGroups,
});
