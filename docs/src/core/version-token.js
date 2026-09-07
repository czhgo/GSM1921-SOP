// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  core/version-token.js — 域写版本戳（P0 提速批·缓存失效闭环，2026-09-07）
//  依据：.trae/specs/2026-09-07-perf/spec.md §二.3（域聚合双键：写版本戳 + 长度指纹）
//  用途：给各业务域（attendance/activity/inspection/activityReview/…）分配单调递增
//        写版本戳；聚合入口（书记 8 组/全局概况/决议逾期/todo-tab 组合）以
//        「tokenOf(各源) + 各源数组 length」为复合键做记忆化——未写 → 命中复用，
//        写口 bumpToken → 键变 → 重算。
//  语义：
//   - bumpToken(key) 在**可改的源写口**（services/*.js 实际写 mockDB 处）调用；
//   - tokenOf(key) 供聚合入口计算复合键（单调不减；resetAllTokens 后归零）；
//   - resetAllTokens() 在整体重置/loadDB/overlay 导入入口调用（mock-adapter 禁改 →
//     由 services/mock.js loadDB 等可改入口代为调用）。
//  纯 ESM 叶子模块：零依赖，保证任意调用方（无论宿主 ?v= 后缀差异）import 到
//  同一模块实例 —— Map 状态全局共享，跨模块实例缓存失效一致。
// ════════════════════════════════════════════════════════════════

/** 内部域写版本表：key → 写次数（单调递增；resetAllTokens 清空归零） */
const _tokens = new Map();

/** 写版本戳 +1（源写口在成功写入 mockDB 后调用；key 命名见 spec §二.3） */
export function bumpToken(key) {
  const k = String(key);
  _tokens.set(k, (_tokens.get(k) || 0) + 1);
  return _tokens.get(k);
}

/** 读取某域写版本戳（无写入记录 → 0） */
export function tokenOf(key) {
  return _tokens.get(String(key)) || 0;
}

/** 清空全部写版本戳（整体重置/loadDB/overlay 导入后调用：全域版本归零 → 缓存自然失效重算） */
export function resetAllTokens() {
  _tokens.clear();
}
