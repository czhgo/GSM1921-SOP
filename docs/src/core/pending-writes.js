// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  core.pending-writes.js — 「这次动作真的存下去了吗」的单一等待点
//  光华管理学院本科生党支部 SOP 引擎 v10.0
//  依赖：无（**叶子模块**，禁止 import 任何业务模块 —— 防循环）
// ════════════════════════════════════════════════════════════════
//
// 由来（2026-09-17 批次 49，支书裁定「全站统一」）
//
//   病灶：全站成功提示原有一类结构性偏差 —— **先弹「成功」，落库在后台跑**。
//   实测（批次 49 全站清点）：`showToast('success', …)` 共 175 处，其中约 113 处属此类。
//   根因只有一条：持久化汇聚点 `core/data-adapter.js::persist()` 是**同步 void 函数**
//   （api 形态下它只 `setTimeout` 排一次 800ms 防抖快照），**调用方无法 await**，
//   而快照失败只 `console.warn` —— 用户端零反馈。
//   后果：提交后立刻关页/刷新，可能「提示成功、其实没存上」，且用户无从察觉。
//
// 机制（一处收口，不逐站点改）
//
//   凡「后台落库」一律 `trackWrite(promise)` 登记；成功提示在渲染前先
//   `await settleWrites()` —— 全部落库真正落地才报成功，任一失败则改报失败。
//   登记点放在**持久化层与外部写链**（而非各业务调用点），故**新增写口天然受约束**，
//   不会因为「忘了加 await」而复发（对照批 47「同一病灶只修一处＝没修完」：这里不是修
//   113 处，而是把 113 处都变成同一个判断）。
//
//   为什么不是「把 113 处调用点逐个改成 await」：那样每次新增写口都要人记得加 await，
//   且服务层函数要集体改成 async（波及所有同步消费返回值的调用点）。本机制把判据放在
//   **用户看到「成功」的那一刻**，与写口数量解耦。
//
// 纪律
//   · 本文件是叶子模块：只登记 promise，不在此引入任何依赖。
//   · 失败只报一次、且必须报出来：`settleWrites()` 会把失败抛给等待方（成功提示据此改报失败），
//     不允许静默吞掉（对照 R-77「判据之间不得互相冒充」的同一精神：失败的证据不得被成功吞没）。
// ════════════════════════════════════════════════════════════════

/** 在途的后台落库（元素为「永不 reject」的包装 promise，避免产生 unhandledrejection） */
const _pending = new Set();

/** 最近一次后台落库失败的原因（由 `settleWrites()` 取走并清空 ⇒ 失败只报一次） */
let _lastError = null;

/**
 * 登记一条后台落库，返回可 await 的原 promise。
 * 调用方可以什么都不做（不 await 也不会产生 unhandledrejection）；
 * 真正决定「要不要等」的是 `showToast` 侧的统一等待。
 * @param {Promise<any>|any} promise — 后台落库（如快照写穿 / 外部写链）
 * @returns {Promise<any>} 原 promise（调用方可自行 await 并捕获）
 */
export function trackWrite(promise) {
  const raw = Promise.resolve(promise);
  const entry = raw.then(
    () => true,
    (e) => {
      if (!_lastError) _lastError = e;
      return false;
    },
  );
  _pending.add(entry);
  entry.then(() => { _pending.delete(entry); });
  return raw;
}

/** 是否还有在途的后台落库（供 UI 决定要不要先给一个「保存中」的过渡态） */
export function hasPendingWrites() {
  return _pending.size > 0;
}

/**
 * 等待全部在途后台落库落地。
 * · 全部成功 → 正常返回（调用方可以安全地报「成功」）。
 * · 任一失败 → 抛出（调用方必须改报失败，不得静默）。
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
