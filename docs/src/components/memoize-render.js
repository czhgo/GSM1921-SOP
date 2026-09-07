// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  components/memoize-render.js — P2 渲染守卫共享 helper（2026-09-07）
//  依据：.trae/specs/2026-09-07-perf/spec.md §四（P2 渲染守卫：读多写少聚合整卡，
//       数据未变时跳过整链重算与整卡 HTML/DOM 重建；行为差异零、状态安全）。
//  适用：today / todo-tab-shell / governance-overview / calendar 等「整卡读多写少
//       聚合视图」——每次动作触发无关 setState/切月/切视图而数据未变时，整卡全量
//       重建纯属浪费（折叠/选中/草稿等状态还随 DOM 重建被重置）。
//  用法：memoizeRender(container, key, buildFn, opts)
//   - 命中（container.dataset.memoKey === key 且 container 有内容 firstElementChild 存在
//     ——且若提供 opts.marker，须在当前内容中仍能找到该标记元素）→ 返回 false：
//     调用方不得再写 container，现 DOM 原样保留 —— 用户折叠/选中/草稿等交互状态不丢、
//     旧事件绑定仍在；onAfterRender 异步面板 / rAF 二次填充 / extraTopHtml 也不再重跑。
//   - 未命中 → 执行 buildFn（调用方在其中整卡重建，产物须含 marker 对应元素），
//     记 memoKey，返回 true。
//  ⚠️ 契约（由调用方保证，勿违反）：
//   - key 必须覆盖影响本卡内容的一切版本：数据 token 复合键（tokenOf(各源) + 各源数组
//     length 指纹，含禁改 adapter 直写路径的长度兜底）+ 域指纹 + 日期 + 视图参数
//     （月份/范围/视图模式）+ 本卡自持交互状态（如待办选中项）——「命中跳过」才安全。
//   - opts.marker 用于「内容容器被其它渲染方整体替换 innerHTML 而 dataset 残留」的
//     共享容器（同工作台多 tab 复用同一内容容器）场景：标记随本卡内容写入、随异方
//     替换而消失 → 标记缺失即强制重建，杜绝「切回本 tab 却错留上一 tab 内容」。
//   - 对含 rAF 分层 / 异步 after 面板的容器：命中跳过时面板/填充不重跑，其内容随
//     「数据键未变」而保持正确——由调用方按上述 key 覆盖规则保证。
//  纯 ESM 叶子模块（零依赖、无 DOM 顶导）：node 直导可测（server/test/perf-render-guard）。
// ════════════════════════════════════════════════════════════════

/**
 * 渲染守卫：键未变且现 DOM 为上次真实产物 → 跳过重建（返回 false）；否则重建并记键（返回 true）
 * @param {HTMLElement|Object} container — 内容容器（可 node 桩：dataset/firstElementChild/innerHTML）
 * @param {string} key — 覆盖内容一切版本的复合键（见头注契约）
 * @param {() => void} buildFn — 整卡重建（未命中时执行；产物须含 marker 元素）
 * @param {{marker?: string}} [opts] — marker：本卡内容的标识选择器（防共享容器跨 tab 误命中）
 * @returns {boolean} false=命中跳过（现 DOM 保留）；true=已重建
 */
export function memoizeRender(container, key, buildFn, opts) {
  const markerSel = (opts && opts.marker) || null;
  const hasContent = !!(container && container.firstElementChild);
  const keyHit = !!(container && container.dataset && container.dataset.memoKey === key);
  let markerHit = true;
  if (markerSel && hasContent) {
    markerHit = typeof container.querySelector === 'function'
      && !!container.querySelector(markerSel);
  }
  if (keyHit && hasContent && markerHit) return false; // 命中：跳过重建（现 DOM 保留）

  if (container && container.dataset) container.dataset.memoKey = key;
  buildFn();
  return true; // 已重建（内容现与 key 一致）
}
