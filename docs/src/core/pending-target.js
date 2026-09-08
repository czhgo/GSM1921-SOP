// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  core/pending-target.js — 跨 tab 轻量定位状态（D2 裁决批二 2026-09-08 书记特批）
//  用途：概况只读摘要的「去处理 →」/ 概况直达条 → 目标 tab 的对应页并定位目标项。
//  机制：
//   - 设置方（概况 tab / 其它只读入口）切 tab 前写入 PendingTarget.set({ tab, kind, id })；
//   - 目标 tab（如待办 todo）renderContent 渲染完成后经 PendingTarget.consume() 读取：
//       · 命中 → 展开对应项（如待答复汇报详情 rep-inbox-detail-<id>）并滚动到视口；
//       · 未命中/无目标 → 回退落在该页顶部（不做定位动作）。
//   - consume 一次性消费（取后即清）：防下次重渲染重复定位/残留高亮。
//  纯 ESM 叶子模块（零依赖、无 DOM）：node 直导可测。
// ════════════════════════════════════════════════════════════════

let _pending = null;

export const PendingTarget = {
  /**
   * 写入定位目标（切 tab 前调用；覆盖旧目标）
   * @param {{ tab:string, kind:string, id?:string }|null} target
   *   tab  — 目标 tab id（如 'todo'）；kind — 目标类型（如 'report'）；id — 目标项 id（可省略=落页顶）
   */
  set(target) {
    _pending = target && target.tab ? { tab: target.tab, kind: target.kind || '', id: target.id || null } : null;
  },

  /** 读取但不消费（排查用；一般用 consume） */
  peek() {
    return _pending;
  },

  /** 消费：取当前目标并清空。返回 { tab, kind, id } 或 null */
  consume() {
    const t = _pending;
    _pending = null;
    return t;
  },

  /** 清空（不消费） */
  clear() {
    _pending = null;
  },
};
