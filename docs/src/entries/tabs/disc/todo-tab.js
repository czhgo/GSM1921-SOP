// role: [工程师]+[AI]
// 纪检委员工作台 Tab：待办（T-279 M3 拆分；T-304 代码减负 2026-08-30：骨架并入 todo-tab-shell）
// 真实闭环：考勤/考察待确认数量由业务数据实时计算，确认后数量自动下降。

import { showToast } from '../../../core/utils.js?v=20260901y';
import { TodoStore, TodoSourceType, TodoCategory, TodoActionType, seedTodos } from '../../../services/todo.js?v=20260901y';
import { createTodoTab } from '../../../components/todo-tab-shell.js?v=20260901y';
import { loadActiveAttendanceRecords } from '../../../services/attendance.js?v=20260901y';
import { AttendanceStatus } from '../../../core/domain.js?v=20260901y';
import { loadActiveInspectionRecords } from '../../../services/inspection.js?v=20260901y';
import { getPersonName } from '../../../mock/index.js?v=20260901y';

// ── 纪检聚合构建（2026-08-07 闭环化） ────────────────────────
// 真实闭环：考勤/考察待确认数量由业务数据实时计算，确认后数量自动下降，
// 不再依赖过期种子待办（种子来源与销项动作不匹配，无法闭环）。
function _buildDiscAggregates() {
  const todoGroups = TodoStore.getGroupedByAction('disc-commissioner');
  const dynamic = [];
  // 动态组1：考勤待确认（T-304 第5轮 · 源头审校+异常驱动：出勤/已补上传方已审校自动确认，
  // 纪检只处理异常=缺勤/请假未确认；仅活跃活动，归档活动退出工作区）
  const pendingAtt = loadActiveAttendanceRecords().filter(r => !r.recordedBy && r.status !== AttendanceStatus.PRESENT && r.status !== AttendanceStatus.MADE_UP);
  if (pendingAtt.length > 0) {
    dynamic.push({
      groupKey: 'disc-commissioner:attendance-confirm',
      actionKey: 'attendance-confirm',
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
      title: '考察待确认',
      category: TodoCategory.REVIEW,
      actionType: TodoActionType.REVIEW,
      flow: '纪检录入考察 → 纪检确认 → 组织建档',
      deadline: null,
      count: pendingInsp.length,
      items: pendingInsp.map(r => ({ id: r.id, title: `确认考察：${getPersonName(r.personId)}`, sourceType: TodoSourceType.ACTIVITY, sourceId: r.activityId ? `insp_${r.id}` : null })),
    });
  }
  // 合并：同 groupKey 时并集（TodoStore 派生组 + 动态组），取最早截止
  const map = new Map();
  for (const g of [...todoGroups, ...dynamic]) {
    if (!map.has(g.groupKey)) { map.set(g.groupKey, g); continue; }
    const cur = map.get(g.groupKey);
    cur.items = [...(cur.items || []), ...(g.items || [])];
    cur.count = cur.items.length;
    if (g.deadline && (!cur.deadline || g.deadline < cur.deadline)) cur.deadline = g.deadline;
  }
  return [...map.values()];
}

/** 纪检聚合统计（总数 = 聚合卡数量之和；过期 = 明细有截止且已过期的条目） */
function _buildDiscStats(aggregates) {
  const today = new Date().toISOString().slice(0, 10);
  const total = aggregates.reduce((s, g) => s + g.count, 0);
  let expired = 0;
  for (const g of aggregates) {
    for (const it of g.items || []) {
      if (it.deadline && it.deadline < today && it.status !== 'completed') expired++;
    }
  }
  return { _total: total, _expired: expired };
}

function _handleTodoAction(todo) {
  // 2026-08-07 闭环化：聚合对象优先按 actionKey 跳转（区分同 actionType 的业务域），普通明细按 actionType 兜底
  const jump = {
    'attendance-confirm': { tab: 'attendance', label: '考勤管理' },
    'inspection-confirm': { tab: 'inspection', label: '考察管理' },
    'review-submit':      { tab: 'review', label: '活动监督复盘' },
    'review-confirm':     { tab: 'review', label: '活动监督复盘' },
    'handoff-material-shortage': { tab: 'makeup', label: '补课制度' },
    review:   { tab: 'review', label: '活动监督复盘' },
    submit:   { tab: 'attendance', label: '考勤管理' },
    confirm:  { tab: 'inspection', label: '考察管理' },
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
  buildAggregates: () => { seedTodos(); return _buildDiscAggregates(); }, // 补种子 + 动态聚合（T232 闭环化）
  buildStats: _buildDiscStats,
  emptyHint: '或直接点击"去审核/去确认"等按钮处理',
});
