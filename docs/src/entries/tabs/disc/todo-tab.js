// role: [工程师]+[AI]
// 纪检委员工作台 Tab：待办（T-279 M3 拆分；T-304 代码减负 2026-08-30：骨架并入 todo-tab-shell）
// 真实闭环：考勤/考察待确认数量由业务数据实时计算，确认后数量自动下降。
// 2026-09-07 IA-C1 Task4：待办主列改为 9 业务域折组（共享壳渲染）；实时队列
// （考勤待确认/考察待确认）作为 buildRealtimeGroups 并入「考勤纪律/考察」域展示。
// 2026-09-08 REVIEW_QUEUE 裁决批一（D6 纪检折组行仅提示+跳转）：考勤/考察待确认行尾按钮
// 文案由 components/record/todo-list.js actionLabels 收敛为「去考勤管理/去考察管理」（跳管理页队列，
// 确认唯一位=考勤管理/考察管理页），补课回执交接行=「去补课制度」跳转——本文件无逻辑改动。

import { showToast } from '../../../core/base/utils.js?v=20261109a';
import { seedTodos } from '../../../services/governance/todo.js?v=20261109a';
import { createTodoTab } from '../../../components/record/todo-tab-shell.js?v=20261109a';
// 2026-11-01 批次 524（#7）：主行动落点由动作表声明，页签切换走统一导航（删写死 workspace URL）
import { resolveTodoAction } from '../../../core/domain/todo-actions.js?v=20261109a';
import { goToWorkspaceTab } from '../../../core/session/workspace-nav.js?v=20261109a';
import { loadActivities } from '../../../services/activity/activity.js?v=20261109a';
import { loadAttendanceRecords } from '../../../services/activity/attendance.js?v=20261109a';
import { loadInspectionRecords } from '../../../services/activity/inspection.js?v=20261109a';
import { PersonStore } from '../../../services/member/person.js?v=20261109a';
// 「考勤 / 考察待确认」判据单一源（批次 539：服务端派生；mock / 失败兜底同源复用）
import { deriveAttendanceConfirmGroup, deriveInspectionConfirmGroup } from '../../../core/domain/todo-derive.js?v=20261109a';

// ── 纪检实时聚合组（2026-08-07 闭环化） ────────────────────────
// 真实闭环：考勤/考察待确认数量由业务数据实时计算，确认后数量自动下降，
// 不再依赖过期种子待办（种子来源与销项动作不匹配，无法闭环）。
// IA-C1 Task4：持久化待办由壳 getDomainsWithGroups 按域聚合；本函数只返回
// 「不落库」实时队列组，壳 mergeRealtimeDomains 并入「考勤纪律/考察」域（同 groupKey 去重）。
// 2026-11-09 批次 539：判据收进 `core/domain/todo-derive.js`（服务端同源）；本台只做展示。
function _buildDiscRealtimeGroups(_ctx, opts) {
  seedTodos(); // 补种子 + 动态聚合（T232 闭环化）
  const skip = opts && opts.skipActionKeys instanceof Set ? opts.skipActionKeys : null;
  const skipKey = (k) => !!(skip && skip.has(k));
  const activities = loadActivities();
  const persons = PersonStore.getAll();
  const dynamic = [];
  if (!skipKey('attendance-confirm')) {
    const group = deriveAttendanceConfirmGroup({ activities, attendanceRecords: loadAttendanceRecords(), persons });
    if (group) dynamic.push(group);
  }
  if (!skipKey('inspection-confirm')) {
    const group = deriveInspectionConfirmGroup({ activities, inspectionRecords: loadInspectionRecords(), persons });
    if (group) dynamic.push(group);
  }
  return dynamic;
}

function _handleTodoAction(todo) {
  // 2026-08-07 闭环化：聚合对象优先按 actionKey 跳转（区分同 actionType 的业务域），普通明细按 actionType 兜底。
  // 2026-11-01 批次 524（#7）：落点表迁到 core/domain/todo-actions.js；考勤/考察待确认改为
  //   同页切页签 + PendingTarget 深链（不再写死 workspace/disc.html?tab=… 整页跳转）。
  const action = resolveTodoAction(todo, 'disc-commissioner');
  if (!action || !action.tab) {
    showToast('info', `请处理：${todo.title}`);
    return;
  }
  const first = Array.isArray(todo.items) ? todo.items[0] : null;
  const targetId = (first && (first.id || first.activityId)) || todo.id || null;
  const go = () => {
    const ok = goToWorkspaceTab(action.tab, { kind: action.kind, id: targetId });
    showToast('info', ok ? `已跳转，请处理：${todo.title}` : `请处理：${todo.title}`);
  };
  if (action.segment) {
    // 先置一级分段再切 tab（分段由 attendance-tab 模块级记忆，见其 focusSegment 导出）
    import('../../../entries/tabs/disc/attendance-tab.js?v=20261109a')
      .then(m => { m.focusSegment(action.segment); go(); })
      .catch(go);
  } else {
    go();
  }
}

export const { renderContent } = createTodoTab({
  containerId: 'disc-tab-content',
  prefix: 'disc',
  role: 'disc-commissioner',
  onAction: _handleTodoAction,
  // IA-C1 Task4：纪检实时队列（考勤/考察待确认）并入对应域折组
  buildRealtimeGroups: _buildDiscRealtimeGroups,
  emptyHint: '暂无待办',
});
