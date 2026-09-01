// role: [工程师]+[AI]
// committee-vote.js — 线上支委会表态服务
// 数据源：mockDB.agendaVotes（本地）或 /api/v1/agenda-votes（API 模式）
// 闭环：委员异步表态（同意/异议/附言）→ 书记汇总 → 截止锁定（votesLocked 写入活动）
import { mockDB } from '../core/domain.js?v=20260901f';
import { persist, getAdapter, getAuthToken, getApiBaseUrl, getDataSource } from '../core/data-adapter.js?v=20260901f';
import { AuthStore } from './auth.js?v=20260901f';

/** 当前登录用户 personId（mock 模式表态归属；无登录态回退 null） */
function currentPersonId() {
  return AuthStore.getCurrentUser()?.personId || null;
}

/** 查询活动的表态列表（全量可见；API 模式走 REST，mock 模式读本地） */
export async function fetchVotes(activityId) {
  const adapter = getAdapter();
  if (getDataSource() === 'api' && getAuthToken()) {
    const r = await fetch(`${getApiBaseUrl()}/api/v1/agenda-votes?activityId=${activityId}`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
    if (r.ok) return r.json();
  }
  return (mockDB.agendaVotes || []).filter((v) => v.activityId === activityId);
}

/** 提交/覆盖表态（同人同议题幂等：mock 本地 upsert + persist()；API 提交 201/覆盖 200） */
export async function submitVote({ activityId, agendaItemId, position, note = '' }) {
  const adapter = getAdapter();
  if (getDataSource() === 'api' && getAuthToken()) {
    const r = await fetch(`${getApiBaseUrl()}/api/v1/agenda-votes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify({ activityId, agendaItemId, position, note }),
    });
    if (!r.ok) throw new Error((await r.json()).error || '表态提交失败');
    return r.json();
  }
  // mock 模式：本地 upsert + 持久化（personId 取当前登录用户，见 AuthStore.getCurrentUser）
  const personId = currentPersonId();
  const list = mockDB.agendaVotes || (mockDB.agendaVotes = []);
  const existing = list.find((v) => v.activityId === activityId && v.agendaItemId === agendaItemId && v.personId === personId);
  const row = existing
    ? { ...existing, position, note, updatedAt: new Date().toISOString() }
    : { id: `av-${Date.now()}`, activityId, agendaItemId, personId, position, note, createdAt: new Date().toISOString(), updatedAt: null };
  if (existing) Object.assign(existing, row); else list.push(row);
  persist();
  return row;
}

/** 书记截止表态（置 votesLocked / voteDeadline；mock 本地写活动 + persist()） */
export async function lockVotes({ activityId, votesLocked, voteDeadline }) {
  const adapter = getAdapter();
  if (getDataSource() === 'api' && getAuthToken()) {
    const r = await fetch(`${getApiBaseUrl()}/api/v1/agenda-votes/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify({ activityId, votesLocked, voteDeadline }),
    });
    if (!r.ok) throw new Error((await r.json()).error || '截止操作失败');
    return r.json();
  }
  const activities = mockDB.activities || [];
  const act = activities.find((a) => a.id === activityId);
  if (act) {
    if (typeof votesLocked === 'boolean') act.votesLocked = votesLocked;
    if (voteDeadline) act.voteDeadline = voteDeadline;
  }
  persist();
  return act || { id: activityId };
}
