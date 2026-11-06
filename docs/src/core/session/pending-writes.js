// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  core.pending-writes.js — 「这次动作真的存下去了吗」的单一等待点
//  光华管理学院本科生党支部 SOP 引擎 v10.0
//  依赖：无（**叶子模块**，禁止 import 任何业务模块 —— 防循环）
// ════════════════════════════════════════════════════════════════
//
// 不变式
//
//   凡「后台落库」一律 `trackWrite(promise)` 登记；成功提示在渲染前先
//   `await settleWrites()` —— 全部落库真正落地才报成功，任一失败则改报失败。
//   登记点放在**持久化层与外部写链**（而非各业务调用点），故**新增写口天然受约束**。
//   判据放在「用户看到『成功』的那一刻」，与写口数量解耦。
//
// 动作作用域（2026-10-23 批次 · R11 P0-03）
//
//   全局等待有一个固有缺陷：A 动作失败会改判同时完成的 B 动作。故新增「动作作用域」：
//     const scope = beginWriteScope();      // 动作开始
//     await service.doThing();              // 期间的写（persist/scheduleSnapshot）自动归属该 scope
//     await showToast('success', '已保存', { scope });   // 只等本动作的写
//   未显式传 scope 的 `trackWrite` 在存在活动作用域时归属该作用域；全局 `_pending`
//   仍保留全部在途写的兜底视图（`settleWrites` / `hasPendingWrites()` 行为不变）。
//   失败按作用域保存：`settleScope` 只取走本作用域的错误，互不污染，且**幂等**
//   （第二次调用不再抛）。`peekLastError()` 可在不清空的前提下查看全局兜底错误。
//
// 纪律
//   · 本文件是叶子模块：只登记 promise，不在此引入任何依赖。
//   · 失败只报一次、且必须报出来：`settleWrites()` / `settleScope()` 会把失败抛给等待方
//     （成功提示据此改报失败），不允许静默吞掉（对照 R-77「判据之间不得互相冒充」的同一精神：
//     失败的证据不得被成功吞没）。
// ════════════════════════════════════════════════════════════════

/** 在途的后台落库（元素为「永不 reject」的包装 promise，避免产生 unhandledrejection） */
const _pending = new Set();

/** 最近一次**未归入任何作用域**的后台落库失败（由 `settleWrites()` 取走并清空 ⇒ 失败只报一次） */
let _lastError = null;

/** 当前活动作用域（LIFO 嵌套：内层作用域结束即回落到外层） */
let _activeScope = null;

let _scopeSeq = 0;

// ════════════════════════════════════════════════════════════════
//  失败 outbox（Task 3 · 2026-10-26）
// ════════════════════════════════════════════════════════════════
//  口径（spec「断网写入」）：写失败**不得**报成功；失败进入本机持久队列并显示「未同步」，
//  恢复网络后可重试或放弃。本段仍是叶子模块：只碰 localStorage / DOM 事件，不引任何业务模块。
//  · 默认存**元数据**（集合名 / 错误码 / 文案 / 时间 / 次数）；
//  · 2026-11-02 批次 527 · Wave 3：条目可带 `payload`（集合名 + 行数据 + `_versions`）——
//    换页/刷新后内存快照被服务端权威值覆盖，仅靠「重新 flush 脏集合」已无可重试的数据；
//    带 payload 的条目由重试钩子直接重发。**旧条目（无 payload）仍按旧逻辑**（只重新 flush 脏集合）；
//  · `retryOutbox()` 把条目（含 payload）交给 `data-adapter.js` 注册的重试钩子；
//  · `discardOutbox()` 只移除队列条目（放弃同步），不改业务数据。
const OUTBOX_KEY = 'gsm1921-pending-writes-outbox';
const OUTBOX_MAX = 20;
/** payload 只保留「可重试的最近一次失败」；超出即退回仅元数据（防撑爆 localStorage） */
const OUTBOX_PAYLOAD_MAX_BYTES = 512 * 1024;

/** 本机持久队列的内存视图（首次访问时从 localStorage 载入） */
let _outbox = null;

/** `retryOutbox()` 的实际重试动作（由 data-adapter 注册；本模块不 import 业务层） */
let _outboxRetryHandler = null;

function _outboxStorage() {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (_) { return null; }
}

function _loadOutbox() {
  if (Array.isArray(_outbox)) return _outbox;
  const storage = _outboxStorage();
  if (!storage) { _outbox = []; return _outbox; }
  try {
    const parsed = JSON.parse(storage.getItem(OUTBOX_KEY) || '[]');
    _outbox = Array.isArray(parsed) ? parsed.filter((e) => e && typeof e === 'object') : [];
  } catch (_) { _outbox = []; }
  return _outbox;
}

function _saveOutbox(list) {
  _outbox = Array.isArray(list) ? list : [];
  const storage = _outboxStorage();
  if (storage) {
    try { storage.setItem(OUTBOX_KEY, JSON.stringify(_outbox)); } catch (_) { /* 存储不可用：内存队列仍可读 */ }
  }
  if (typeof document !== 'undefined' && typeof document.dispatchEvent === 'function') {
    try {
      document.dispatchEvent(new CustomEvent('gsm1921:pending-writes-changed', {
        detail: { count: _outbox.length, collections: _outbox.flatMap((e) => e.collections || []) },
      }));
    } catch (_) { /* 事件派发失败不影响主流程 */ }
  }
}

/**
 * 归一 payload：`{ collections, rows, _versions }`。
 * 不合法 / 序列化超限 ⇒ 返回 null（退回仅元数据，行为与旧条目一致）。
 * @param {{collections?:string[], rows?:Object, _versions?:Object}|null|undefined} payload
 */
function _normalizePayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const rows = payload.rows;
  if (!rows || typeof rows !== 'object' || Array.isArray(rows)) return null;
  const collections = [...new Set((Array.isArray(payload.collections) ? payload.collections : Object.keys(rows))
    .filter(Boolean).map(String))].sort();
  if (!collections.length) return null;
  const versions = (payload._versions && typeof payload._versions === 'object' && !Array.isArray(payload._versions))
    ? payload._versions : {};
  const normalized = { collections, rows, _versions: versions };
  try {
    if (JSON.stringify(normalized).length > OUTBOX_PAYLOAD_MAX_BYTES) return null;
  } catch (_) { return null; }
  return normalized;
}

/**
 * 登记一次写失败到持久 outbox（同集合组合去重：次数 +1、刷新时间与原因）。
 * @param {{collections?: string[], message?: string, status?: number, kind?: string,
 *          payload?: {collections?:string[], rows?:Object, _versions?:Object}}} [failure]
 * @returns {Object|null} 入库条目
 */
export function recordOutboxFailure(failure = {}) {
  const collections = [...new Set((Array.isArray(failure.collections) ? failure.collections : []).filter(Boolean))].sort();
  const message = String(failure.message || '写入未确认').trim();
  const status = Number(failure.status) || 0;
  const payload = _normalizePayload(failure.payload);
  const entry = {
    id: collections.length ? collections.join(',') : 'w-unspecified',
    collections,
    message,
    status,
    kind: String(failure.kind || 'snapshot'),
    at: new Date().toISOString(),
    attempts: 1,
  };
  if (payload) entry.payload = payload;
  const list = _loadOutbox();
  const existing = list.find((e) => e && e.id === entry.id);
  if (existing) {
    existing.attempts = (Number(existing.attempts) || 0) + 1;
    existing.message = entry.message;
    existing.status = entry.status;
    existing.at = entry.at;
    // 新 payload 覆盖旧 payload；本次无 payload 时保留旧 payload（旧数据仍可重试）
    if (payload) existing.payload = payload;
    _saveOutbox([...list]);
    return existing;
  }
  const next = [...list, entry].slice(-OUTBOX_MAX);
  _saveOutbox(next);
  return entry;
}

/** 读队列（返回副本，调用方可安全遍历） */
export function listOutbox() {
  return _loadOutbox().map((e) => {
    const copy = { ...e, collections: [...(e.collections || [])] };
    if (e && e.payload) copy.payload = { ...e.payload, collections: [...(e.payload.collections || [])] };
    return copy;
  });
}

/** 队列条数（供角标 / 守卫断言） */
export function outboxCount() {
  return _loadOutbox().length;
}

/** 清掉与给定集合有交集的失败条目（flush 成功后调用；不传集合 ⇒ 清空） */
export function clearOutbox(collections) {
  const names = Array.isArray(collections) ? new Set(collections.filter(Boolean)) : null;
  if (!names) { _saveOutbox([]); return; }
  const next = _loadOutbox().filter((e) => !(e && Array.isArray(e.collections) && e.collections.some((c) => names.has(c))));
  if (next.length !== _loadOutbox().length) _saveOutbox(next);
}

/** 放弃一条（按 id）；返回是否移除 */
export function discardOutbox(id) {
  const list = _loadOutbox();
  const next = list.filter((e) => !e || e.id !== id);
  if (next.length === list.length) return false;
  _saveOutbox(next);
  return true;
}

/** 注册重试钩子（`data-adapter.js` 初始化时注册；只保留一个） */
export function registerOutboxRetry(fn) {
  _outboxRetryHandler = typeof fn === 'function' ? fn : null;
}

/**
 * 重试队列：调用注册钩子（重新 flush 仍脏的集合）。
 * · 没有钩子 / 没有条目 ⇒ 明确返回失败原因，不假装成功；
 * · 钩子成功 ⇒ 清空本队列（该钩子内部已按集合清）；失败 ⇒ 条目保留、次数 +1。
 * @returns {Promise<{ok:boolean, count:number, reason?:string}>}
 */
export async function retryOutbox() {
  const entries = listOutbox().filter((e) => e && e.kind !== 'local-only'); // 本机域无服务端可重试
  if (!entries.length) return { ok: true, count: 0, reason: 'empty' };
  if (!_outboxRetryHandler) return { ok: false, count: entries.length, reason: 'no-retry-handler' };
  try {
    // 带 payload 的条目由钩子直接重发（重载后内存里已没有那份脏数据）；旧条目仍走「重新 flush」。
    await _outboxRetryHandler(entries);
    const remaining = listOutbox().filter((e) => e && e.kind !== 'local-only');
    if (remaining.length) return { ok: false, count: remaining.length, reason: 'still-unsynced' };
    return { ok: true, count: entries.length };
  } catch (e) {
    const message = e && e.message ? e.message : '重试失败';
    for (const entry of entries) recordOutboxFailure({ collections: entry.collections, message, status: e && e.status, kind: entry.kind });
    return { ok: false, count: entries.length, reason: message };
  }
}

/**
 * 开一个「动作作用域」：本动作期间的写归属它，成功/失败只按它判定。
 * @returns {{ id: number, pending: Set<Promise<boolean>>, error: any, consumed: boolean, parent: any }}
 */
export function beginWriteScope() {
  const scope = {
    id: ++_scopeSeq,
    pending: new Set(),
    error: null,
    consumed: false,
    parent: _activeScope,
  };
  _activeScope = scope;
  return scope;
}

/**
 * 关闭作用域（恢复外层）。作用域非当前活动作用域时为空操作 —— 幂等。
 * @param {any} scope — `beginWriteScope()` 的返回值
 */
export function endWriteScope(scope) {
  if (!scope) return;
  if (_activeScope === scope) _activeScope = scope.parent;
}

/**
 * 登记一条后台落库，返回可 await 的原 promise。
 * 调用方可以什么都不做（不 await 也不会产生 unhandledrejection）；
 * 真正决定「要不要等」的是 `showToast` 侧的统一等待。
 * @param {Promise<any>|any} promise — 后台落库（如快照写穿 / 外部写链）
 * @param {any} [scope] — 动作作用域（缺省＝当前活动作用域；再缺省＝全局兜底）
 * @returns {Promise<any>} 原 promise（调用方可自行 await 并捕获）
 */
export function trackWrite(promise, scope) {
  const target = scope || _activeScope;
  const raw = Promise.resolve(promise);
  const entry = raw.then(
    () => true,
    (e) => {
      // 有作用域 ⇒ 只记在该作用域（不污染同时完成的其它动作）；无作用域 ⇒ 全局兜底
      if (target) { if (!target.error) target.error = e; }
      else if (!_lastError) _lastError = e;
      return false;
    },
  );
  _pending.add(entry);
  if (target) target.pending.add(entry);
  entry.then(() => {
    _pending.delete(entry);
    if (target) target.pending.delete(entry);
  });
  return raw;
}

/**
 * 是否还有在途的后台落库（供 UI 决定要不要先给一个「保存中」的过渡态）。
 * @param {any} [scope] — 传作用域时只判该作用域
 */
export function hasPendingWrites(scope) {
  return scope ? scope.pending.size > 0 : _pending.size > 0;
}

/** 查看全局兜底失败（不清空；配套 `settleWrites()` 的「取走即清空」） */
export function peekLastError() {
  return _lastError;
}

/**
 * 等待全部在途后台落库落地（全局兜底；不带作用域的既有调用点行为不变）。
 * · 全部成功 → 正常返回（调用方可以安全地报「成功」）。
 * · 任一**未归入作用域**的失败 → 抛出（调用方必须改报失败，不得静默）。
 * · 等待期间又有新登记（长链操作逐条落库）→ 继续等，直到结算干净（上限 100 轮防御）。
 */
export async function settleWrites() {
  let guard = 0;
  while (_pending.size && guard++ < 100) {
    await Promise.all([..._pending]);
  }
  const err = _lastError;
  _lastError = null;
  if (err) throw err;
}

/**
 * 等待本作用域的在途写并取走它的失败（幂等：第二次调用不再抛）。
 * 只影响该作用域 —— A 动作失败不会改判同时完成的 B 动作。
 * @param {any} scope — `beginWriteScope()` 的返回值
 */
export async function settleScope(scope) {
  if (!scope) return settleWrites();
  let guard = 0;
  while (scope.pending.size && guard++ < 100) {
    await Promise.all([...scope.pending]);
  }
  endWriteScope(scope);
  if (scope.error && !scope.consumed) {
    scope.consumed = true;
    const err = scope.error;
    scope.error = null;
    throw err;
  }
}
