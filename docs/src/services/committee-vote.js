// role: [工程师]+[AI]
// committee-vote.js — 线上支委会表态服务
// 数据源：mockDB.agendaVotes（本地）或 /api/v1/agenda-votes（API 模式）
// 闭环：委员异步表态（同意/异议/附言）→ 书记汇总 → 截止锁定（votesLocked 写入活动）
import { mockDB } from '../core/domain.js?v=20260901g';
import { persist, getAdapter, getAuthToken, getApiBaseUrl, getDataSource } from '../core/data-adapter.js?v=20260901g';
import { AuthStore } from './auth.js?v=20260901g';
import { NoticeStore } from './notice.js?v=20260901g';
import { PEOPLE } from '../mock/index.js?v=20260901g';

// 支委角色集合（与 auth.js COMMISSIONER_ROLES / server COMMITTEE_IDS 口径一致）
const COMMITTEE_ROLES = new Set(['secretary', 'deputy-secretary', 'org-commissioner', 'prop-commissioner', 'disc-commissioner']);
// 支委总数（通知文案「已有 N/M 位委员表态」的分母）
const COMMITTEE_TOTAL = PEOPLE.filter((p) => COMMITTEE_ROLES.has(p.role)).length;

// 通知书记表态进度（委员提交后触发，统计 fetchVotes 去重 personId 数；失败不阻断主流程）
async function notifySecretaryProgress(activityId) {
  try {
    const votes = await fetchVotes(activityId);
    const n = new Set(votes.map((v) => v.personId)).size;
    NoticeStore.add({
      title: '线上支委会表态更新',
      content: `「线上支委会」已有 ${n}/${COMMITTEE_TOTAL} 位委员表态`,
      priority: 'normal',
      targetUrl: 'workspace/secretary.html',
    });
  } catch (e) {
    console.warn('[committee-vote] 表态进度通知发送失败：', e);
  }
}

// 提醒书记记录决议（截止后触发；失败不阻断主流程）
function remindRecordDecision() {
  try {
    NoticeStore.add({
      title: '线上支委会表决截止',
      content: '支委会议程已截止，请记录决议',
      priority: 'normal',
      targetUrl: 'workspace/secretary.html',
    });
  } catch (e) {
    console.warn('[committee-vote] 记录决议提醒发送失败：', e);
  }
}

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
    const row = await getAdapter().agendaVotes.create({ activityId, agendaItemId, position, note });
    // 通知闭环：委员表态成功后提醒书记查看汇总（人数 = 该活动已表态 distinct 委员数）
    await notifySecretaryProgress(activityId);
    return row;
  }
  // mock 模式：adapter 幂等 upsert + 落盘（personId 取当前登录用户，见 AuthStore.getCurrentUser）
  const row = await getAdapter().agendaVotes.create({
    activityId, agendaItemId, position, note, personId: currentPersonId(),
  });
  persist();
  // mock 模式同发书记汇总提醒（UI 反馈一致）
  await notifySecretaryProgress(activityId);
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
    const act = await r.json();
    // 通知闭环：截止成功后提醒书记记录决议
    if (act.votesLocked) remindRecordDecision();
    return act;
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
  // mock 模式同发记录决议提醒
  if (act?.votesLocked) remindRecordDecision();
  return act || { id: activityId };
}
