// role: [工程师]+[AI]
// core/boot/tab-loader.js — 工作台页签模块的加载唯一入口（2026-10-29）
//
// 为什么存在：
//   能力表原先直接写 `import('../entries/tabs/…')`。动态 import 的失败有两种性质，
//   但错误对象本身不区分它们：
//     · 模块加载 / 解析失败（404、语法错误）——**不可自愈**：同一个 URL 的模块图不会重新解析，
//       「重试」必然再次失败；
//     · 模块内的渲染期异常——可能是一次瞬时数据问题，重试有意义。
//   本加载器只做一件事：加载失败时把模块规格挂到错误对象（`err.__moduleSpec`），
//   tab-bar 据此先自动重新载入一次（同会话一次），再失败则给「重新载入」按钮，
//   避免给用户一个永远无效的「重试」按钮。
// 规格符一律写成「相对能力表」的形态（如 `../entries/tabs/secretary/todo-tab.js?v=…`）。
// 但 `import()` 的相对解析基准是**包含该调用的模块**——本文件在 `core/boot/`，
// 直接 `import(spec)` 会解析到 `core/entries/…`（404）。故显式以能力表目录为基准：
// `core/boot/` → `../../capabilities/`。
const CAPABILITY_BASE = new URL('../../capabilities/', import.meta.url);

export async function loadTabModule(spec) {
  const url = new URL(spec, CAPABILITY_BASE).href;
  try {
    return await import(url);
  } catch (err) {
    try {
      if (err && typeof err === 'object') err.__moduleSpec = spec;
    } catch (_) { /* 某些宿主错误对象不可扩展：仍原样抛出 */ }
    throw err;
  }
}
