// role: [工程师]+[AI]
// services/review-request.js — 支部上报审批（P3 党委后台，2026-09-02）
// 闭环：支部书记上报（发展党员关键节点 develop-node / 重要活动报备 activity-report）
//       → 党委逐项审批（approve/reject + 意见）→ 支部侧可见结果。
// 模式：adapter CRUD 实时写 server（API 模式）+ 本地 mockDB 同步（刷新不丢）。

import { mockDB } from '../core/domain.js?v=20260903a';
import { getAdapter, persist } from '../core/data-adapter.js?v=20260903a';

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
  return next;
}

/** 列表（党委看全院；支部看本支部） */
export function listReviewRequests({ branchId, status } = {}) {
  return (mockDB.reviewRequests || [])
    .filter(r => (!branchId || r.branchId === branchId) && (!status || r.status === status))
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}
