// role: [工程师]+[AI]
// committee-vote.js — 线上支委会表态服务
// 数据源：mockDB.agendaVotes（本地）或 /api/v1/agenda-votes（API 模式）
// 闭环：委员异步表态（同意/异议/附言）→ 书记汇总 → 截止锁定（votesLocked 写入活动）
import { mockDB } from '../core/domain.js?v=20260901g';
import { persist, getAdapter, getAuthToken, getApiBaseUrl, getDataSource } from '../core/data-adapter.js?v=20260901g';
import { AuthStore } from './auth.js?v=20260901g';

/** 当前登录用户 personId（mock 模式表态归属；无登录态回退 null） */
function currentPersonId() {
  return AuthStore.getCurrentUser()?.personId || null;
}

/** 查询活动的表态列表（全量可见；API 模式走 REST，mock 模式读本地） */
export async function fetchVotes(activityId) {
  if (getDataSource() === 'api' && getAuthToken()) {
    const r = await fetch(`${getApiBaseUrl()}/api/v1/agenda-votes?activityId=${activityId}`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
    if (r.ok) return r.json();
    // API 拉取失败降级本地缓存（服务器瞬时不可达不阻断 UI）
    console.warn('[committee-vote] 获取表态失败，使用本地缓存', r.status);
  }
  return (mockDB.agendaVotes || []).filter((v) => v.activityId === activityId);
}

/** 提交/覆盖表态（同人同议题幂等：adapter 统一处理 upsert；API 提交 201/覆盖 200） */
export async function submitVote({ activityId, agendaItemId, position, note = '' }) {
  if (getDataSource() === 'api' && getAuthToken()) {
    // API 模式：adapter 直写服务器（POST /api/v1/agenda-votes，personId 由服务端取 JWT）
    return getAdapter().agendaVotes.create({ activityId, agendaItemId, position, note });
  }
  // mock 模式：adapter 幂等 upsert + 落盘（personId 取当前登录用户，见 AuthStore.getCurrentUser）
  const row = await getAdapter().agendaVotes.create({
    activityId, agendaItemId, position, note, personId: currentPersonId(),
  });
  persist();
  return row;
}

/** 书记截止表态（置 votesLocked / voteDeadline；mock 本地写活动 + persist()） */
export async function lockVotes({ activityId, votesLocked, voteDeadline }) {
  if (getDataSource() === 'api' && getAuthToken()) {
    // 保持 fetch /lock：adapter 未提供 lock 方法（截止为专用端点，属可接受）
    const r = await fetch(`${getApiBaseUrl()}/api/v1/agenda-votes/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify({ activityId, votesLocked, voteDeadline }),
    });
    if (!r.ok) throw new Error((await r.json()).error || '截止操作失败');
    return r.json();
  }
  // mock 分支角色校验（与 server requireRole(secretary) 三端一致：截止仅书记可操作）
  const me = AuthStore.getCurrentUser();
  if (!me || me.role !== 'secretary') throw new Error('仅书记可截止表态');
  const activities = mockDB.activities || [];
  const act = activities.find((a) => a.id === activityId);
  if (act) {
    // 截止不可逆（与 server/routes/committee.js 对齐）：仅置 true，传 false 不落库
    if (votesLocked === true) act.votesLocked = true;
    if (voteDeadline) act.voteDeadline = voteDeadline;
  }
  persist();
  return act || { id: activityId };
}
