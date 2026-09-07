// role: [工程师]+[AI]
// 纪检委员工作台 Tab：待办（T-279 M3 拆分；T-304 代码减负 2026-08-30：骨架并入 todo-tab-shell）
// 真实闭环：考勤/考察待确认数量由业务数据实时计算，确认后数量自动下降。
// 2026-09-07 IA-C1 Task4：待办主列改为 9 业务域折组（共享壳渲染）；实时队列
// （考勤待确认/考察待确认）作为 buildRealtimeGroups 并入「考勤纪律/考察」域展示。

import { showToast } from '../../../core/utils.js?v=20260903c';
import { TodoSourceType, TodoCategory, TodoActionType, seedTodos, REALTIME_GROUP_DOMAIN } from '../../../services/todo.js?v=20260906j';
import { createTodoTab } from '../../../components/todo-tab-shell.js?v=20260906j';
import { loadActiveAttendanceRecords } from '../../../services/attendance.js?v=20260903c';
import { AttendanceStatus } from '../../../core/domain.js?v=20260903c';
import { loadActiveInspectionRecords } from '../../../services/inspection.js?v=20260903c';
import { getPersonName } from '../../../services/person.js?v=20260903c';

// ── 纪检实时聚合组（2026-08-07 闭环化） ────────────────────────
// 真实闭环：考勤/考察待确认数量由业务数据实时计算，确认后数量自动下降，
// 不再依赖过期种子待办（种子来源与销项动作不匹配，无法闭环）。
// IA-C1 Task4：持久化待办由壳 getDomainsWithGroups 按域聚合；本函数只返回
// 「不落库」实时队列组，壳 mergeRealtimeDomains 并入「考勤纪律/考察」域（同 groupKey 去重）。
function _buildDiscRealtimeGroups() {
  seedTodos(); // 补种子 + 动态聚合（T232 闭环化）
  const dynamic = [];
  // 动态组1：考勤待确认（T-304 第5轮 · 源头审校+异常驱动：出勤/已补上传方已审校自动确认，
  // 纪检只处理异常=缺勤/请假未确认；仅活跃活动，归档活动退出工作区）
  const pendingAtt = loadActiveAttendanceRecords().filter(r => !r.recordedBy && r.status !== AttendanceStatus.PRESENT && r.status !== AttendanceStatus.MADE_UP);
  if (pendingAtt.length > 0) {
    dynamic.push({
      groupKey: 'disc-commissioner:attendance-confirm',
      actionKey: 'attendance-confirm',
      // IA-C1 Task2：实时组标注业务域（考勤纪律；供 T4 域折组）
      domain: REALTIME_GROUP_DOMAIN['attendance-confirm'],
      title: '考勤待确认',
      category: TodoCategory.REVIEW,
      actionType: TodoActionType.REVIEW,
      flow: '考勤上传 → 纪检确认 → 考勤总表',
      deadline: null,
      count: pendingAtt.length,
      items: pendingAtt.map(r => ({ id: r.id, title: `确认考勤：${getPersonName(r.personId)}`, sourceType: TodoSourceType.ACTIVITY, sourceId: r.activityId })),
    });
  }
  // 动态组2：考察待确认（status 非 confirmed；仅活跃活动，专班类保留）
  const pendingInsp = loadActiveInspectionRecords().filter(r => r.status !== 'confirmed');
  if (pendingInsp.length > 0) {
    dynamic.push({
      groupKey: 'disc-commissioner:inspection-confirm',
      actionKey: 'inspection-confirm',
      // IA-C1 Task2：实时组标注业务域（考察；供 T4 域折组）
      domain: REALTIME_GROUP_DOMAIN['inspection-confirm'],
      title: '考察待确认',
      category: TodoCategory.REVIEW,
      actionType: TodoActionType.REVIEW,
      flow: '纪检录入考察 → 纪检确认 → 组织建档',
      deadline: null,
      count: pendingInsp.length,
      items: pendingInsp.map(r => ({ id: r.id, title: `确认考察：${getPersonName(r.personId)}`, sourceType: TodoSourceType.ACTIVITY, sourceId: r.activityId ? `insp_${r.id}` : null })),
    });
  }
  return dynamic;
}

function _handleTodoAction(todo) {
  // 2026-08-07 闭环化：聚合对象优先按 actionKey 跳转（区分同 actionType 的业务域），普通明细按 actionType 兜底
  // 无生产者残留键清理（IA-C1 Task5 登记 2026-09-06）：review-submit/review-confirm/submit/confirm 旧键
  // 均无派生器移除（纪检台现派生=实时考勤/考察待确认组 + handoff-material-shortage 补课回执，
  // 均带 actionKey；actionType 兜底仅余 review 供 signup-review 未直跳等边界）——未知键落 else「请处理」。
  const jump = {
    'attendance-confirm': { tab: 'attendance', label: '考勤管理' },
    'inspection-confirm': { tab: 'inspection', label: '考察管理' },
    'handoff-material-shortage': { tab: 'makeup', label: '补课制度' },
    review:   { tab: 'review', label: '活动监督复盘' },
  };
  const target = jump[todo.actionKey] || jump[todo.actionType];
  if (target) {
    const btn = document.querySelector(`.disc-tab-btn[data-disc-tab="${target.tab}"]`);
    if (btn) btn.click();
    showToast('info', `已跳转到${target.label}，请处理：${todo.title}`);
  } else {
    showToast('info', `请处理：${todo.title}`);
  }
}

export const { renderContent } = createTodoTab({
  containerId: 'disc-tab-content',
  prefix: 'disc',
  role: 'disc-commissioner',
  onAction: _handleTodoAction,
  // IA-C1 Task4：纪检实时队列（考勤/考察待确认）并入对应域折组
  buildRealtimeGroups: _buildDiscRealtimeGroups,
  emptyHint: '或直接点击"去审核/去确认"等按钮处理',
});
