// role: [工程师]+[AI]
// committee-activity.js — 党委活动在支部侧的「采用 / 同步 / 强调通知」
// 服务端单一源：server/routes/resources/semantic-routes.js
//   POST /api/v1/activities/:id/adopt          （目标支部支书 / 副支书，幂等）
//   POST /api/v1/activities/:id/sync-source    （副本所属支部支书 / 副支书，只覆盖内容字段）
//   POST /api/v1/activities/:id/emphasis-notice（副本所属支部支书 / 副支书，24 小时限频）
// 本模块只做「前端判据 + fetch 组装」，判据与写口仍以服务端复算为准（放行不被 UI 绕过）。
import { mockDB } from '../../core/domain/domain.js?v=20261108c';
import { SECRETARY_AND_DEPUTY_ROLES, COMMITTEE_OWNER_ID, EMPHASIS_NOTICE_WINDOW_MS } from '../../core/domain/constants.js?v=20261108c';
import { getApiBaseUrl, getAuthToken, getDataSource } from '../../data/data-adapter.js?v=20261108c';

/** 语义端点请求超时（毫秒） */
const REQUEST_TIMEOUT_MS = 10000;
/** 非 api 数据源统一返回（采用 / 同步 / 强调都依赖服务端事务与唯一索引） */
const API_REQUIRED = { ok: false, reason: '该功能需服务端模式' };
/** 可采用的原件状态（与 server ADOPTABLE_SOURCE_STATUSES 同口径） */
const ADOPTABLE_STATUSES = ['published', 'ongoing'];
/** 强调通知的系统通知类型（与 server EMPHASIS_NOTICE_KIND 同口径） */
const EMPHASIS_NOTICE_KIND = 'activity-emphasis';

/** 是不是党委活动（显式 ownerScope，或归属党委伪支部） */
export function isCommitteeActivity(a) {
  return !!a && (a.ownerScope === 'committee' || a.branchId === COMMITTEE_OWNER_ID);
}

/** 是不是党委活动副本（`sourceActivityId` 非空） */
export function isCommitteeCopy(a) {
  return !!a && !!a.sourceActivityId;
}

/** 党委活动的目标支部是否命中某支部（`['all']` 或显式包含） */
export function targetsBranch(a, branchId) {
  if (!a || !branchId) return false;
  const raw = a.targetBranchIds;
  const targets = Array.isArray(raw) ? raw.map(String) : (raw ? [String(raw)] : []);
  return targets.length > 0 && (targets.includes('all') || targets.includes(String(branchId)));
}

/** 本支部对某党委原件的副本（同表不同 ownerScope；`sourceActivityId + branchId` 唯一） */
export function copyForBranch(sourceId, branchId) {
  if (!sourceId || !branchId) return null;
  return (mockDB.activities || []).find((row) => row
    && String(row.sourceActivityId || '') === String(sourceId)
    && String(row.branchId || '') === String(branchId)) || null;
}

/**
 * 当前账号能否采用该党委活动。
 * 判据：角色 ∈ 支书 / 副支书、用户支部命中目标支部、原件 published|ongoing、本支部尚无副本。
 * @param {{role?:string, branchId?:string}|null} user
 * @param {Object} activity
 */
export function canAdopt(user, activity) {
  if (!user || !activity) return false;
  if (!SECRETARY_AND_DEPUTY_ROLES.includes(user.role)) return false;
  if (!isCommitteeActivity(activity)) return false;
  if (activity.archived === true) return false;
  if (!ADOPTABLE_STATUSES.includes(activity.status)) return false;
  const branchId = user.branchId || '';
  if (!branchId || !targetsBranch(activity, branchId)) return false;
  return !copyForBranch(activity.id, branchId);
}

/** 当前账号能否维护该副本（同步 / 强调通知）：本支部支书或副支书 */
export function canManageCopy(user, copy) {
  if (!user || !isCommitteeCopy(copy)) return false;
  if (!SECRETARY_AND_DEPUTY_ROLES.includes(user.role)) return false;
  return !!user.branchId && String(copy.branchId || '') === String(user.branchId);
}

/** 副本对应的党委原件（找不到 → null） */
export function sourceOf(copy) {
  const sourceId = copy && copy.sourceActivityId;
  if (!sourceId) return null;
  return (mockDB.activities || []).find((row) => row && String(row.id) === String(sourceId)) || null;
}

/** 副本内容版本是否落后于党委原件 */
export function isSourceOutdated(copy) {
  const source = sourceOf(copy);
  if (!source) return false;
  return Number(copy.sourceVersion) < Number(source.contentVersion);
}

/** 统一 POST（Bearer token；超时 408；非 api 数据源直接拒绝） */
async function _post(path, body) {
  if (getDataSource() !== 'api' || !getAuthToken()) return API_REQUIRED;
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;
  try {
    const res = await fetch(`${getApiBaseUrl()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify(body || {}),
      signal: controller ? controller.signal : undefined,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, status: res.status, data, error: (data && data.error) || `请求失败（HTTP ${res.status}）` };
    }
    return { ok: true, status: res.status, data };
  } catch (e) {
    if (e && e.name === 'AbortError') return { ok: false, status: 408, error: '请求超时，请稍后重试' };
    return { ok: false, status: 0, error: (e && e.message) || '网络异常，请稍后重试' };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * 采用党委活动到本支部（幂等：重复采用返回同一副本）。
 * @param {string} id 党委活动 id
 * @returns {Promise<{ok:boolean, status?:number, data?:Object, error?:string, reason?:string}>}
 */
export function adoptActivity(id) {
  return _post(`/api/v1/activities/${encodeURIComponent(id)}/adopt`);
}

/**
 * 手动同步副本内容（只覆盖内容字段，执行字段保留；已最新时 `data.synced === false`）。
 * @param {string} id 副本活动 id
 */
export function syncFromSource(id) {
  return _post(`/api/v1/activities/${encodeURIComponent(id)}/sync-source`);
}

/**
 * 发送强调通知（受众＝本支部全体党员；24 小时内同一活动最多一条，命中返回 429 + retryAfterMs）。
 * @param {string} id 副本活动 id
 * @param {{title?:string, content?:string}} [payload] 留空由服务端写默认标题 / 正文
 */
export function sendEmphasisNotice(id, { title = '', content = '' } = {}) {
  return _post(`/api/v1/activities/${encodeURIComponent(id)}/emphasis-notice`, { title, content });
}

/** 通知的「发送时刻」：优先 `at`，历史行回落 `publishDate` / `createdAt`（与 server 同口径） */
function _noticeTime(notice) {
  for (const key of ['at', 'publishDate', 'createdAt']) {
    const ts = notice && notice[key] ? Date.parse(notice[key]) : NaN;
    if (Number.isFinite(ts)) return ts;
  }
  return NaN;
}

/** 该副本最近一条强调通知的发送时刻（毫秒；无 → 0） */
export function lastEmphasisAt(copyId) {
  if (!copyId) return 0;
  let max = 0;
  for (const row of (mockDB.notices || [])) {
    if (!row || String(row.sourceId || '') !== String(copyId)) continue;
    if (row.systemKind !== EMPHASIS_NOTICE_KIND) continue;
    const ts = _noticeTime(row);
    if (Number.isFinite(ts) && ts > max) max = ts;
  }
  return max;
}

/** 强调通知剩余冷却（毫秒；0＝可发送） */
export function emphasisCooldownMs(copyId, now = Date.now()) {
  const last = lastEmphasisAt(copyId);
  if (!last) return 0;
  return Math.max(0, last + EMPHASIS_NOTICE_WINDOW_MS - now);
}
