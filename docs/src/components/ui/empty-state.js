// role: [工程师]+[AI]
// empty-state.js — 「内容未就绪」单一源：空态 + 加载骨架（2026-10-18 立 · 2026-10-28 三形态 · 2026-11-03 加骨架）
//
// 职责：只允许「一句话 + 可选一个动作」；不铺插图、不写长说明、不并列多个动作。
// 三种形态（`variant`）：
//   · `inline` —— 行内一句（列表行 / 表格单元格 / 提示条内）；
//   · `panel`  —— 居中块（卡片 / 页签主体），缺省值，兼容既有调用；
//   · `table`  —— 表格空行（`colspan` 由调用方给，`<tr class="is-empty">` 由本件产出）。
// 统一口径：文案 ≤30 字、至多一个动作、文案由调用方传入（本件不内置任何安慰语）。
//
// 加载骨架（批次 530 · B-518-2）：页面首帧 / 页签内的「加载中」一律由本件
//   `skeletonHtml` / `renderSkeleton` 产出（`.skeleton-block` ＋ `.skeleton-line`，
//   加载文案进 `.visually-hidden[role=status]`），不得再手写 `bg-gray-100 animate-pulse` 堆叠。
// 单一源关系：
//   · 样式 = docs/src/styles.css 的 .empty-state / .empty-state--inline / .empty-state__text /
//     .empty-state__action / .skeleton-block / .skeleton-line 段；
//   · 文案转义 = core/base/utils.js 的 escHtml；
//   · 数据表空态：list-filter 的 table 模式与 relation-matrix 一律调 `variant: 'table'`，不再手写空行。
//   · 页签切换骨架（3 条卡形 + spinner）仍以 components/shell/tab-bar.js::tabContentSkeletonHtml 为准，
//     本件只承担「页 / 页签首帧的线条占位」。
import { escHtml as esc } from '../../core/base/utils.js?v=20261103b';

/**
 * 生成空态 HTML。
 * 支持两种调用形态（后者为 2026-10-28 起的推荐写法）：
 *   emptyStateHtml('暂无记录', { variant: 'inline' })
 *   emptyStateHtml({ variant: 'panel', text: '请先登录后使用', actionHtml })
 * @param {string|Object} messageOrOptions 一句话说明，或选项对象（含 `text`）
 * @param {Object} [maybeOpts]
 * @param {string} [maybeOpts.text] 一句话说明（对象形态必填）
 * @param {'inline'|'panel'|'table'} [maybeOpts.variant] 形态，缺省 `panel`
 * @param {string} [maybeOpts.actionHtml] 可选的动作插槽（HTML，调用方负责按钮语义族；至多一个）
 * @param {string} [maybeOpts.className] 附加类（panel / inline 生效）
 * @param {number} [maybeOpts.colspan] 表格空行的列数（table 形态；缺省 1）
 * @returns {string} 空态 HTML
 */
export function emptyStateHtml(messageOrOptions, maybeOpts = {}) {
  const opts = typeof messageOrOptions === 'string'
    ? { ...maybeOpts, text: messageOrOptions }
    : { ...(messageOrOptions || {}) };
  const text = String(opts.text == null ? '' : opts.text);
  const variant = opts.variant || 'panel';
  const actionHtml = opts.actionHtml || '';
  const className = opts.className ? ' ' + esc(opts.className) : '';

  if (variant === 'table') {
    const span = Number(opts.colspan) > 0 ? Number(opts.colspan) : 1;
    return `<tr class="is-empty"><td colspan="${span}" class="is-empty"><span class="empty-state__text">${esc(text)}</span>${actionHtml ? ` <span class="empty-state__action">${actionHtml}</span>` : ''}</td></tr>`;
  }
  if (variant === 'inline') {
    return `<p class="empty-state empty-state--inline${className}"><span class="empty-state__text">${esc(text)}</span>${actionHtml ? ` <span class="empty-state__action">${actionHtml}</span>` : ''}</p>`;
  }
  return `<div class="empty-state${className}">
    <p class="empty-state__text">${esc(text)}</p>
    ${actionHtml ? `<div class="empty-state__action">${actionHtml}</div>` : ''}
  </div>`;
}

/**
 * 渲染空态到容器。
 * @param {HTMLElement} container 挂载容器
 * @param {string|Object} messageOrOptions 一句话说明，或选项对象
 * @param {Object} [opts] 同 emptyStateHtml
 * @returns {string} 已写入的 HTML
 */
export function renderEmptyState(container, messageOrOptions, opts = {}) {
  const html = emptyStateHtml(messageOrOptions, opts);
  if (container) container.innerHTML = html;
  return html;
}

/** 骨架行宽循环（自上而下收窄，读起来像「正在排版的正文」） */
const SKELETON_WIDTHS = ['w-full', 'w-5/6', 'w-2/3'];

/** 骨架形态清单（F-15）：`card` 为既有默认；`list` / `table` 让占位与真实载体同构。 */
export const SKELETON_VARIANTS = ['card', 'list', 'table'];

/** 行式骨架：左短条（序号 / 头像位）＋ 主条 ＋ 右短条（动作位） */
function _listRowsHtml(count, lineClass) {
  const row = `<div class="flex items-center gap-3">
      <div class="skeleton-line ${lineClass} w-8 animate-pulse"></div>
      <div class="skeleton-line ${lineClass} flex-1 animate-pulse"></div>
      <div class="skeleton-line ${lineClass} w-16 animate-pulse"></div>
    </div>`;
  return Array.from({ length: count }, () => row).join('');
}

/** 表格式骨架：一行表头（短格）＋ N 行等宽格 */
function _tableRowsHtml(count, lineClass) {
  const cell = `<div class="skeleton-line ${lineClass} flex-1 animate-pulse"></div>`;
  const headCell = `<div class="skeleton-line ${lineClass} w-16 animate-pulse"></div>`;
  return `<div class="flex items-center gap-3">${headCell.repeat(4)}</div>`
    + Array.from({ length: count }, () => `<div class="flex items-center gap-3">${cell.repeat(4)}</div>`).join('');
}

/**
 * 生成加载骨架 HTML（`.skeleton-block` ＋ N 条 `.skeleton-line`）。
 * 骨架整块 `aria-hidden`（只占位、不承载信息），加载文案由相邻 `.visually-hidden[role=status]` 承担：
 * 屏幕阅读器读「正在加载…」，视觉用户看骨架——两者不再互相冒充。
 * @param {number} [lines] 行数（≥1，缺省 3）
 * @param {Object} [opts]
 * @param {string} [opts.lineClass] 行尺寸类（如 `h-9` / `h-6 w-40`；缺省 `h-4`）
 * @param {string[]} [opts.widths] 行宽类循环（缺省 full / 5-6 / 2-3；`card` 形态生效）
 * @param {'card'|'list'|'table'} [opts.variant] 形态：缺省 `card`＝既有线条占位；
 *   `list`＝列表行（左短条 / 主条 / 右短条）；`table`＝表头 ＋ N 行等宽格
 * @param {string} [opts.className] 骨架块附加类（如 `space-y-6` 之外的布局修饰）
 * @param {string} [opts.ariaText] 加载文案（缺省「正在加载…」；传 `''` 表示由外层已有 role=status 承担）
 * @returns {string}
 */
export function skeletonHtml(lines = 3, opts = {}) {
  const count = Math.max(1, Number(lines) || 1);
  const lineClass = opts.lineClass || 'h-4';
  const widths = Array.isArray(opts.widths) && opts.widths.length ? opts.widths : SKELETON_WIDTHS;
  const className = opts.className ? ' ' + esc(opts.className) : '';
  const variant = SKELETON_VARIANTS.includes(opts.variant) ? opts.variant : 'card';
  const rows = variant === 'list'
    ? `<div class="flex flex-col gap-2">${_listRowsHtml(count, lineClass)}</div>`
    : (variant === 'table'
      ? `<div class="flex flex-col gap-2">${_tableRowsHtml(count, lineClass)}</div>`
      : Array.from({ length: count }, (_, i) =>
        `<div class="skeleton-line ${lineClass} ${widths[i % widths.length]} animate-pulse"></div>`).join(''));
  const status = opts.ariaText === ''
    ? ''
    : `<p class="visually-hidden" role="status">${esc(opts.ariaText || '正在加载…')}</p>`;
  return `<div class="skeleton-block${className}" aria-hidden="true">${rows}</div>${status}`;
}

/**
 * 把加载骨架写入容器（容器自身的 `aria-busy` 由调用方在渲染完成后撤掉）。
 * @param {HTMLElement} container 挂载容器
 * @param {number} [lines] 行数
 * @param {Object} [opts] 同 skeletonHtml
 * @returns {string} 已写入的 HTML
 */
export function renderSkeleton(container, lines = 3, opts = {}) {
  const html = skeletonHtml(lines, opts);
  if (container) container.innerHTML = html;
  return html;
}
