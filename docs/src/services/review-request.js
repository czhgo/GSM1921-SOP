// role: [工程师]+[AI]
// services/review-request.js — 支部上报审批（P3 党委后台，2026-09-02）
// 闭环：支部书记上报（发展党员关键节点 develop-node / 重要活动报备 activity-report）
//       → 党委逐项审批（approve/reject + 意见）→ 支部侧可见结果。
// 模式：adapter CRUD 实时写 server（API 模式）+ 本地 mockDB 同步（刷新不丢）。
// 通知闭环（2026-09-10，依据 COMMISSIONER_DUTY_FRAMEWORK §八「提交/通过/驳回均触发通知」）：
//   提交 → 定向通知党委（party-staff）；批准/驳回 → 回传通知发起书记（带结论/意见）。
//   复用 NoticeStore 既有链路（站内信优先，辅以邮件）；文案带事项类型/标题/编号，可回溯定位该上报。

import { mockDB } from '../core/domain.js?v=20260912h';
import { getAdapter, persist } from '../core/data-adapter.js?v=20260912h';
import { NoticeStore } from './notice.js?v=20260912h';
import { getPersonName } from './person.js?v=20260912h';

const TYPE_LABEL = { 'develop-node': '发展节点', 'activity-report': '活动报备' };

/** 支部显示名（通知定位用） */
function _branchLabel(branchId) {
  const b = (mockDB.branches || []).find(x => x.id === branchId);
  return (b && (b.config?.headerTitle || b.name)) || branchId || '本支部';
}

/** 上报事项摘要（含类型/标题/编号，供通知回溯定位） */
function _subject(row) {
  return `${TYPE_LABEL[row.type] || '上报'}「${row.title || '未命名'}」（编号 ${row.id}）`;
}

/** 提交上报 → 定向通知党委（审批人） */
function _notifySubmit(row) {
  try {
    NoticeStore.add({
      title: '支部上报待批复',
      content: `${_branchLabel(row.branchId)} 提交${_subject(row)}，由 ${getPersonName(row.submittedBy) || row.submittedBy || '支部'} 发起，请党委审批。`,
      priority: 'normal',
      // A① 对象级深链（2026-09-10）：直达党委「上报审批」tab 并定位该条上报（data-rq-card 锚点）
      targetUrl: `workspace/party-committee.html?tab=review&highlight=${row.id}`,
      actionRoles: ['party-staff'],
      read: false,
    });
  } catch (e) { console.warn('[review-request] 上报通知失败（不影响上报）：', e); }
}

/** 审批结论 → 回传通知发起书记（带结论/意见） */
function _notifyDecision(row) {
  const approved = row.status === 'approved';
  try {
    NoticeStore.add({
      title: approved ? '上报已获党委批准' : '上报被党委驳回',
      content: `${_branchLabel(row.branchId)} 的${_subject(row)}已${approved ? '批准' : '驳回'}${approved ? '' : '，请按党委意见整改后重新上报'}${row.decisionNote ? `。党委意见：${row.decisionNote}` : '。'}`,
      priority: 'normal',
      // A① 对象级深链（2026-09-10）：直达书记「上报党委」tab 并定位该条上报（data-rq-id 锚点）
      targetUrl: `workspace/secretary.html?tab=report-up&highlight=${row.id}`,
      actionRoles: ['secretary', 'deputy-secretary'],
      read: false,
    });
  } catch (e) { console.warn('[review-request] 审批通知失败（不影响审批）：', e); }
}

/** 支部上报（书记/组织委员视角） */
export async function submitReviewRequest({ branchId, type, title, content, submittedBy }) {
  const row = await getAdapter().reviewRequests.create({
    branchId,
    type: type === 'develop-node' ? 'develop-node' : 'activity-report',
    title: String(title || '').trim(),
    content: String(content || '').trim(),
    submittedBy,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });
  if (!(mockDB.reviewRequests || []).some(r => r.id === row.id)) {
    mockDB.reviewRequests = [...(mockDB.reviewRequests || []), row];
  }
  persist();
  _notifySubmit(row); // 节点①：提交 → 定向通知党委
  return row;
}

/** 党委审批（approve/reject + 意见） */
export async function decideReviewRequest({ id, decision, decidedBy, decisionNote = '' }) {
  if (!['approved', 'rejected'].includes(decision)) throw new Error('非法审批结论');
  const next = await getAdapter().reviewRequests.update(id, {
    status: decision,
    decidedBy,
    decidedAt: new Date().toISOString(),
    decisionNote: String(decisionNote || '').trim(),
  });
  const idx = (mockDB.reviewRequests || []).findIndex(r => r.id === id);
  if (idx >= 0) {
    mockDB.reviewRequests = [...mockDB.reviewRequests.slice(0, idx), next, ...mockDB.reviewRequests.slice(idx + 1)];
  }
  persist();
  _notifyDecision(next); // 节点②③：批准/驳回 → 回传通知发起书记（带结论/意见）
  return next;
}

/** 列表（党委看全院；支部看本支部） */
export function listReviewRequests({ branchId, status } = {}) {
  return (mockDB.reviewRequests || [])
    .filter(r => (!branchId || r.branchId === branchId) && (!status || r.status === status))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}
