// role: [工程师]+[AI]
// services/preferences.js — 个人偏好读写（设置中心批2，书记 2026-09-09 批准设计 v3）
// ─────────────────────────────────────────────────────────────
// 键空间沿用批1（core/theme.js 适配约定）：gsm1921-pref-<personId>-…；本模块新增：
//   tab 顺序键  gsm1921-pref-<personId>-tab-order-<workspaceKey>
//   （workspaceKey = 工作台能力 scope，如 'workspace:secretary'；恢复默认 = 删该键）
// 语义：
//   · 个人顺序仅作用于业务 tab；核心组（tab.groupLabel==='工作台'，与 services/branch.js
//     getCoreTabIds/_splitTabs 同义判定——书记 2026-08-10 裁定全员必有）保持注册相对顺序置前，
//     不可被个人隐藏或排序；默认声明序即核心置前，故无偏好时零 diff。
//   · 无个人偏好 / 偏好与默认等效 → resolveTabOrder 原样返回（默认无 diff）。
//   · 按 personId + workspaceKey 一次解析缓存（_orderMemo），避免逐帧重复读 localStorage；
//     写入/清键同步失效缓存（顺序解析稳定，见 perf-render-guard/perf-todo-agg-cache 关注点）。
// 零依赖纯模块（不 import 任何浏览器模块）：resolveTabOrder/coreTabIdsOf/sameIdOrder 等纯函数
// 可被 server/test/preferences.test.mjs 在 node 直接导入；存储函数对 localStorage 全程守卫
// （node 无 localStorage 时安全返回；测试可注入 stub 测持久化往返）。

const PREF_PREFIX = 'gsm1921-pref-'; // person 键空间前缀（沿用批1 theme.js 约定）
const CORE_GROUP_LABEL = '工作台';   // 核心组判定（与 branch.js getCoreTabIds 同义，勿另写规则）

/** tab 顺序存储键：gsm1921-pref-<personId>-tab-order-<workspaceKey> */
export function tabOrderStorageKey(personId, workspaceKey) {
  return `${PREF_PREFIX}${personId}-tab-order-${workspaceKey}`;
}

/** 数组等值（逐元素；非数组按引用比较） */
export function sameIdOrder(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return a === b;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** 清理：去重 + 只留字符串（防御脏存储 / 重复拖拽写入） */
function cleanIds(list) {
  const out = [];
  if (!Array.isArray(list)) return out;
  for (const x of list) {
    if (typeof x === 'string' && !out.includes(x)) out.push(x);
  }
  return out;
}

/** 核心 tab id（groupLabel='工作台'；供设置 UI 行锁定与测试断言） */
export function coreTabIdsOf(tabs) {
  if (!Array.isArray(tabs)) return [];
  return tabs.filter(t => t && t.groupLabel === CORE_GROUP_LABEL).map(t => t.id);
}

/**
 * 纯函数：按个人 tab 顺序重排工作台 tab（无偏好/空偏好 → 原样返回）。
 * @param {Array} tabs  当前工作台有效 tab（通常已过支部策略 applyTabPolicy；核心组在内）
 * @param {string[]|null} personalOrder 该人已存业务 tab 顺序（不含核心；null/[]=未调整）
 * @returns {Array} 排序后的 tab 数组；与默认等效时返回原数组（调用方可按对象同一性判断未变）
 * 规则（镜像 services/branch.js applyTabPolicyPure）：核心组保持注册相对序置前；
 * 业务组按个人序排序；未列入个人序的 tab（新注册/策略新增/过期快照缺项）保持默认相对位置置于尾。
 * 过期快照自愈：若个人序仅缺失默认序尾部若干项（效果等同默认）→ 原样返回默认观感。
 */
export function resolveTabOrder(tabs, personalOrder) {
  if (!Array.isArray(tabs) || tabs.length === 0) return tabs;
  if (!Array.isArray(personalOrder) || personalOrder.length === 0) return tabs;
  const core = [];
  const business = [];
  for (const t of tabs) {
    (t && t.groupLabel === CORE_GROUP_LABEL ? core : business).push(t);
  }
  if (business.length === 0) return tabs;
  const businessIds = business.map(t => t.id);
  const order = cleanIds(personalOrder);
  if (order.length === 0) return tabs;
  const rank = new Map();
  for (let i = 0; i < order.length; i++) {
    const id = order[i];
    if (businessIds.includes(id) && !rank.has(id)) rank.set(id, i);
  }
  const known = business.filter(t => rank.has(t.id)).sort((a, b) => rank.get(a.id) - rank.get(b.id));
  const unknown = business.filter(t => !rank.has(t.id));
  const nextIds = known.concat(unknown).map(t => t.id);
  if (sameIdOrder(nextIds, businessIds)) return tabs; // 效果等同默认 → 原样（含过期快照自愈）
  return core.concat(known).concat(unknown);
}

// ── localStorage 读写（全程守卫：node 无 localStorage 时安全 no-op）──
function _rawGet(key) {
  try { return typeof localStorage === 'undefined' ? null : localStorage.getItem(key); }
  catch { return null; }
}
function _rawSet(key, value) {
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(key, value); } catch { /* 忽略 */ }
}
function _rawRemove(key) {
  try { if (typeof localStorage !== 'undefined') localStorage.removeItem(key); } catch { /* 忽略 */ }
}
function _parseOrder(raw) {
  if (raw == null) return null;
  try {
    const ids = cleanIds(JSON.parse(raw));
    return ids.length ? ids : null;
  } catch { return null; }
}

/** 读该人在该工作台的 tab 顺序偏好（null = 无偏好/默认） */
export function readPersonalTabOrder(personId, workspaceKey) {
  if (!personId || !workspaceKey) return null;
  return _parseOrder(_rawGet(tabOrderStorageKey(personId, workspaceKey)));
}

/** 写该人在该工作台的 tab 顺序偏好（空列表 → 等同清键；同步解析缓存） */
export function writePersonalTabOrder(personId, workspaceKey, tabIds) {
  if (!personId || !workspaceKey) return;
  const ids = cleanIds(tabIds);
  if (ids.length) {
    _rawSet(tabOrderStorageKey(personId, workspaceKey), JSON.stringify(ids));
    _orderMemo.set(_memoKey(personId, workspaceKey), ids);
  } else {
    clearPersonalTabOrder(personId, workspaceKey);
  }
}

/** 恢复默认 = 删除该人该工作台 tab 顺序键（并失效解析缓存） */
export function clearPersonalTabOrder(personId, workspaceKey) {
  if (!personId || !workspaceKey) return;
  _rawRemove(tabOrderStorageKey(personId, workspaceKey));
  _orderMemo.delete(_memoKey(personId, workspaceKey));
}

// ── 解析缓存（personId+workspace）与组合入口 ──
const _orderMemo = new Map();
function _memoKey(personId, workspaceKey) { return `${personId}|${workspaceKey}`; }
function _cachedOrder(personId, workspaceKey) {
  const k = _memoKey(personId, workspaceKey);
  if (!_orderMemo.has(k)) _orderMemo.set(k, readPersonalTabOrder(personId, workspaceKey));
  return _orderMemo.get(k);
}

/**
 * 组合入口：读该人偏好（缓存）后按序重排 tabs。
 * 消费点 = components/workspace-shell.js（tab 栏构建前调用一次；无偏好 → 原样零 diff）。
 * @param {Array} tabs  已过支部策略的工作台 tab
 * @param {string} personId 当前登录人 id
 * @param {string} workspaceKey 工作台能力 scope（如 'workspace:secretary'）
 */
export function applyPersonalTabOrder(tabs, personId, workspaceKey) {
  if (!personId || !workspaceKey) return tabs;
  return resolveTabOrder(tabs, _cachedOrder(personId, workspaceKey));
}

/**
 * 保存该人该工作台业务 tab 顺序（设置中心「我的工作台」行内调整即存）。
 * 与默认一致 → 自动清键（回到「默认」徽标态）；不一致 → 写键。
 * @param {string[]} tabIds 当前有效业务 tab 完整顺序（不含核心组）
 * @param {string[]} [defaultOrderIds] 默认业务 tab 顺序（等默认时自动收口清键）
 * @returns {boolean} 是否实际保存了调整（false = 恢复为默认态）
 */
export function savePersonalTabOrder(personId, workspaceKey, tabIds, defaultOrderIds = null) {
  const ids = cleanIds(tabIds);
  const defs = cleanIds(defaultOrderIds);
  if (defs.length && sameIdOrder(ids, defs)) {
    clearPersonalTabOrder(personId, workspaceKey);
    return false;
  }
  if (!ids.length) {
    clearPersonalTabOrder(personId, workspaceKey);
    return false;
  }
  writePersonalTabOrder(personId, workspaceKey, ids);
  _orderMemo.set(_memoKey(personId, workspaceKey), ids);
  return true;
}

/** 恢复全部默认：删键（供设置页顶栏按钮 / 测试） */
export function resetPersonalTabOrder(personId, workspaceKey) {
  clearPersonalTabOrder(personId, workspaceKey);
}
