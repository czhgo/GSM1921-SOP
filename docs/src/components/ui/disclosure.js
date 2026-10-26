// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  disclosure.js — 阅读型折叠的唯一实现（原生 <details> / <summary>）
// ════════════════════════════════════════════════════════════════
//  契约（`.trae/specs/consolidate-ia-terms-and-components` · Task 3）：
//   · 阅读型折叠一律用原生 `<details>/<summary>`——折叠状态由 `open` 属性**静态回读**，
//     不再用 `.hidden` 表达，也不再自造 `_xxxOpen` 模块变量与手写 chevron；
//   · `summary` 内**只放文本 / span / 计数**，不得出现 `h1..h6` 或 `role=heading`；
//   · 分区标题是 `details` 的**兄弟节点**（默认 h3），`summary` 用 `aria-labelledby` 关联它，
//     读屏播报的是标题而不是空的「展开」二字；
//   · chevron 只在 `styles.css` 的全局 `summary::before` 定义一处。
//
//  命名约定（保留既有 DOM id，e2e 依赖）：传入 `id` 后——
//    · 标题：`${id}-title`
//    · `<details>`：`${id}`
//    · `<summary>`：`${id}-toggle`   ← 与 `#archive-weekly-toggle` / `#roster-sp-toggle` 等旧 id 同名
//    · 受控区：`${id}-body`
import { escHtml } from '../../core/base/utils.js?v=20261026b';

/** `toggle` 钩子只对每个根节点挂一次（容器跨重渲染复用，避免监听累积） */
const _bound = new WeakSet();

/**
 * 渲染一个阅读型折叠区。
 * @param {Object} opts
 * @param {string} opts.id      折叠区命名基（决定 title / details / summary / body 的 id）
 * @param {string} opts.title   分区标题（渲染为兄弟 `<h3>`，不进 summary）
 * @param {string} [opts.meta]  标题旁的计数 / 次要说明（纯文本，自动转义）
 * @param {boolean} [opts.open] 初始是否展开（决定 `open` 属性，可静态回读）
 * @param {string} [opts.bodyHtml] 受控区 HTML
 * @param {number} [opts.level] 标题层级（2–6，默认 3；页面 H2 之下用 H3）
 * @returns {string}
 */
export function renderDisclosure({ id, title, meta = '', open = false, bodyHtml = '', level = 3 }) {
  const did = String(id || '').trim();
  if (!did) throw new Error('[disclosure] 需要稳定的 id（决定 DOM 钩子）');
  const h = Math.min(6, Math.max(2, Number(level) || 3));
  const titleId = `${did}-title`;
  const metaHtml = meta === '' || meta === null || meta === undefined
    ? ''
    : `<span class="disclosure__meta tabular-nums">${escHtml(String(meta))}</span>`;
  return `
    <div class="disclosure-host">
      <h${h} class="disclosure__title" id="${escHtml(titleId)}">${escHtml(title)}${metaHtml}</h${h}>
      <details class="disclosure" id="${escHtml(did)}"${open ? ' open' : ''}>
        <summary class="disclosure__summary" id="${escHtml(`${did}-toggle`)}" aria-labelledby="${escHtml(titleId)}"></summary>
        <div class="disclosure__body" id="${escHtml(`${did}-body`)}">${bodyHtml}</div>
      </details>
    </div>`;
}

/**
 * 折叠区 `toggle` 事件钩子：在根节点上派发 `disclosure:toggle`（`detail = { id, open }`），
 * 供懒挂载 / 埋点等消费；`toggle` 不冒泡，故用捕获阶段监听。
 */
export function bindDisclosures(root = document) {
  if (!root || _bound.has(root)) return;
  _bound.add(root);
  root.addEventListener('toggle', (event) => {
    const details = event.target;
    if (!details || details.tagName !== 'DETAILS') return;
    if (!details.classList || !details.classList.contains('disclosure')) return;
    root.dispatchEvent(new CustomEvent('disclosure:toggle', {
      bubbles: true,
      detail: { id: details.id || '', open: !!details.open },
    }));
  }, true);
}
