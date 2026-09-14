// role: [工程师]+[AI]
// committee-vote.js — 线上支委会表态服务
// 数据源：mockDB.agendaVotes（本地）或 /api/v1/agenda-votes（API 模式）
// 闭环：委员异步表态（同意/异议/附言）→ 支书汇总 → 截止锁定（votesLocked 写入活动）
import { mockDB } from '../core/domain.js?v=20260914o';
import { persist, getAdapter, getAuthToken, getApiBaseUrl, getDataSource } from '../core/data-adapter.js?v=20260914o';
import { AuthStore } from './auth.js?v=20260914o';
import { NoticeStore } from './notice.js?v=20260914o';
import { resolveVoterIds } from './vote-config.js?v=20260914o';

// 支委总数（通知文案「已有 N/M 位委员表态」的分母）
// 单一源化（2026-09-02）：改引权威名单 vote-config.js resolveVoterIds('committee')
// ——people.js role + AuthStore.isCommissioner、排除 u_*（auth.js COMMISSIONER_ROLES 为角色底层源），
// 不再本地按角色/成员自算，消除与 vote-config 的失同步。
// 2026-09-06 附录⑩ B批：改为惰性求值（首用缓存）——resolveVoterIds 内部访问 AuthStore，
//   顶层立即执行会在模块环初始化期（auth→taskforce→workforce→committee-vote）命中
//   「AuthStore before initialization」；运行期首次调用时 AuthStore 已就绪。
let _committeeTotalCache;
function committeeTotal() {
  if (_committeeTotalCache === undefined) {
    _committeeTotalCache = resolveVoterIds('committee').length;
  }
  return _committeeTotalCache;
}

// 通知去重（2026-09-02）：submitVote 幂等 upsert 下改票/多议题/重提会重复触发
// notifySecretaryProgress——以活动为粒度缓存「已通知的 distinct 表态人数」，仅当人数
// 突破上次已通知值（N > 上次）才新增一条通知；同人改票/多议题导致 N 不涨时不再打扰
// 支书。缓存随活动数量增长（支委会活动量级小），简单 Map 即可，可接受。
const notifiedCountByActivity = new Map(); // activityId -> 已通知表态人数

// 通知支书表态进度（委员提交后触发，统计 fetchVotes 去重 personId 数；失败不阻断主流程）
async function notifySecretaryProgress(activityId) {
  try {
    const votes = await fetchVotes(activityId);
    // 仅计参与记录（含 personId；无记名 tally 行无 personId，须剔除，否则人数虚增）
    const n = new Set(votes.filter((v) => v && v.personId).map((v) => v.personId)).size;
    const notified = notifiedCountByActivity.get(activityId) || 0;
    if (n > notified) {
      // R-22（2026-09-13）：系统派生通知改由服务端生成（表决进度计数由服务端读表态复算）
      NoticeStore.addSystem('committee-vote-progress', activityId, { voted: n, total: committeeTotal() });
      notifiedCountByActivity.set(activityId, n);
    }
  } catch (e) {
    console.warn('[committee-vote] 表态进度通知发送失败：', e);
  }
}

// 提醒支支书录决议（截止后触发；失败不阻断主流程）
// actionRoles: ['secretary'] —— 复用 notice.js 既有门控（resolveNoticeUrl），
// 仅支书可由此通知直达工作台，其余角色不跳转。targetUrl 带 activityId 定位参数，
// 直达该活动 inspector（2026-09-05 补全，见 notice.js archiveBySource 活动号匹配）。
function remindRecordDecision(activityId) {
  try {
    // R-22（2026-09-13）：系统派生通知改由服务端生成；activityId 作为落点锚点由服务端派生
    NoticeStore.addSystem('committee-vote-locked', activityId);
  } catch (e) {
    console.warn('[committee-vote] 记录决议提醒发送失败：', e);
  }
}

/** 当前登录用户 personId（mock 模式表态归属；无登录态回退 null） */
function currentPersonId() {
  return AuthStore.getCurrentUser()?.personId || null;
}

// ── 表态数据聚合助手（2026-09-12 支书裁定「正式表决无记名」）──────────────────
// 无记名活动的 GET 列表含两类行（双形态同构，见 server/routes/committee.js：
//   · 参与记录 {personId, votedAt, ballotMode:'anonymous'}（无 position/note —— 逐人选项不落库）
//   · 计数行   {tally:{选项:次数}, ballotMode:'anonymous'}（逐人选项不可回溯）
// 记名活动仍为逐人 {personId, position, note}（历史数据同形）——下述助手对两形态通用：
//   有 tally 行 → 计票取 tally；否则由逐人 position 现算（记名/历史兼容）。

/** 计数行判定（无记名 tally 行；记名逐人行无 tally 字段） */
export function isTallyRow(v) {
  return !!v && !!v.tally && typeof v.tally === 'object';
}

/** 参与记录（含 personId 的行；计数行无 personId 被剔除） */
export function ballotsOf(votes) {
  return (votes || []).filter((v) => v && v.personId);
}

/** 某议程项的参与人 id 列表（去重；无记名/记名通用，供人数核验与催办） */
export function presentIdsForItem(votes, agendaItemId) {
  return [...new Set(ballotsOf(votes).filter((v) => v.agendaItemId === agendaItemId).map((v) => v.personId))];
}

/** 某议程项的选项计数（无记名读 tally 行；记名由逐人 position 现算）→ { 选项: 次数 } */
export function tallyForItem(votes, agendaItemId) {
  const rows = (votes || []).filter((v) => v && v.agendaItemId === agendaItemId);
  const tallyRow = rows.find(isTallyRow);
  if (tallyRow) return { ...tallyRow.tally };
  const count = {};
  for (const v of rows) {
    if (v.personId && v.position) count[v.position] = (count[v.position] || 0) + 1;
  }
  return count;
}

/** 整个活动的选项计数（多议程项合计；无记名合计各 tally 行，记名由逐人 position 现算） */
export function tallyOf(votes) {
  const count = {};
  const tallyRows = (votes || []).filter(isTallyRow);
  if (tallyRows.length > 0) {
    for (const r of tallyRows) {
      for (const [k, n] of Object.entries(r.tally || {})) {
        count[k] = (count[k] || 0) + (Number(n) || 0);
      }
    }
    return count;
  }
  for (const v of ballotsOf(votes)) {
    if (v.position) count[v.position] = (count[v.position] || 0) + 1;
  }
  return count;
}

/** 活动的已表态人数（去重参与记录数） */
export function votedCountOf(votes) {
  return new Set(ballotsOf(votes).map((v) => v.personId)).size;
}

/** 单条议程是否已表态（按人） */
export function hasVoted(votes, personId, agendaItemId) {
  if (!personId) return false;
  return ballotsOf(votes).some((v) => v.personId === personId && v.agendaItemId === agendaItemId);
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

/**
 * 查询活动的表态列表（fail-hard：API 失败直接抛错，不降级本地缓存）。
 * 供硬校验等「必须真值」场景使用（如议程记录通过的出席/赞成门禁——
 * 降级缓存会使门禁失真）；mock 模式同 fetchVotes（本地即真源）。
 */
export async function fetchVotesStrict(activityId) {
  if (getDataSource() === 'api' && getAuthToken()) {
    const r = await fetch(`${getApiBaseUrl()}/api/v1/agenda-votes?activityId=${activityId}`, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
    if (!r.ok) throw new Error(`获取表态失败（HTTP ${r.status}）`);
    return r.json();
  }
  return (mockDB.agendaVotes || []).filter((v) => v.activityId === activityId);
}

/**
 * 提交/覆盖表态（同人同议题幂等：adapter 统一处理 upsert；API 提交 201/覆盖 200）。
 * 计票方式由活动 voteConfig 决定（server/mock 同源判定）：记名 named 逐人选项落库（改票覆盖）；
 * 无记名 anonymous 只落参与记录 + tally（不可改票，重复提交幂等返回原参与记录）。
 */
export async function submitVote({ activityId, agendaItemId, position, note = '' }) {
  if (getDataSource() === 'api' && getAuthToken()) {
    // API 模式：adapter 直写服务器（POST /api/v1/agenda-votes，personId 由服务端取 JWT）
    const row = await getAdapter().agendaVotes.create({ activityId, agendaItemId, position, note });
    // 通知闭环：委员表态成功后提醒支书查看汇总（人数 = 该活动已表态 distinct 委员数）
    await notifySecretaryProgress(activityId);
    return row;
  }
  // mock 模式：adapter 幂等 upsert + 落盘（personId 取当前登录用户，见 AuthStore.getCurrentUser）
  // 应到名单校验（dogfood 权限专项 2026-09-13 实证缺口：mock 侧此前无名单校验，非应到人可表态；
  //   API 端点由 server/routes/committee.js 校验）——名单源 = 活动 voteConfig.voterIds，
  //   缺省回退 resolveVoterIds(voterScope||'committee')（与 vote-config 单一源一致）
  const voterId = currentPersonId();
  const voteAct = (mockDB.activities || []).find((a) => a.id === activityId);
  const listedIds = voteAct && voteAct.voteConfig ? voteAct.voteConfig.voterIds : null;
  const eligibleIds = (Array.isArray(listedIds) && listedIds.length)
    ? listedIds
    : resolveVoterIds((voteAct && voteAct.voteConfig && voteAct.voteConfig.voterScope) || 'committee');
  if (eligibleIds.length && !eligibleIds.includes(voterId)) {
    throw new Error('你不在本次表决的应到名单内，无法表态');
  }
  const row = await getAdapter().agendaVotes.create({
    activityId, agendaItemId, position, note, personId: voterId,
  });
  persist();
  // mock 模式同发支书汇总提醒（UI 反馈一致）
  await notifySecretaryProgress(activityId);
  return row;
}

/** 支书截止表态（置 votesLocked / voteDeadline；mock 本地写活动 + persist()） */
export async function lockVotes({ activityId, votesLocked, voteDeadline }) {
  if (getDataSource() === 'api' && getAuthToken()) {
    // 截止提醒迁移守卫：仅「先前未锁」的新锁才 remind（本地快照即提交前状态；
    // 本地已锁 = 重复截止，跳过 remind 避免重复通知）
    const wasLocked = (mockDB.activities || []).find((a) => a.id === activityId)?.votesLocked === true;
    // 保持 fetch /lock：adapter 未提供 lock 方法（截止为专用端点，属可接受）
    const r = await fetch(`${getApiBaseUrl()}/api/v1/agenda-votes/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify({ activityId, votesLocked, voteDeadline }),
    });
    if (!r.ok) throw new Error((await r.json()).error || '截止操作失败');
    const act = await r.json();
    // 通知闭环：截止成功后提醒支支书录决议（仅新锁触发）
    if (act.votesLocked && !wasLocked) remindRecordDecision(act.id);
    return act;
  }
  // mock 分支角色校验（dogfood 权限专项 2026-09-13）：副书同权（2026-09-11 支书裁定）——
  // 副支书与支书共用支书台，截止表态应同权；此前 mock 侧硬判 role!=='secretary'，
  // 与 server requireRole(支书+副支书) 不一致（三端一致）。
  const me = AuthStore.getCurrentUser();
  if (!me || !['secretary', 'deputy-secretary'].includes(me.role)) throw new Error('仅支书/副支书可截止表态');
  const activities = mockDB.activities || [];
  const act = activities.find((a) => a.id === activityId);
  // 截止提醒迁移守卫：锁前记录本地状态，仅「先前未锁」的新锁才 remind
  const wasLocked = act?.votesLocked === true;
  if (act) {
    // 截止不可逆（与 server/routes/committee.js 对齐）：仅置 true，传 false 不落库
    if (votesLocked === true) act.votesLocked = true;
    if (voteDeadline) act.voteDeadline = voteDeadline;
  }
  persist();
  // mock 模式同发记录决议提醒（仅新锁触发）
  if (act?.votesLocked && !wasLocked) remindRecordDecision(act.id);
  return act || { id: activityId };
}
