/**
 * 详情面板锚定（全局 UX 反思批次，2026-09-13）
 *
 * 背景（真实用户反馈）：「党小组组长的活动查询，点击活动后，部分详情居然出现在最下方」——
 * 根因是一类**系统性模板问题**：多个页面把「共用的单一详情容器」固定写在**列表末尾**，
 * 点击列表中任意一条（尤其第一条）后，详情渲染在整张列表之后，用户必须向下滚动数百到两千像素
 * 才能看到；首屏毫无变化，还会被误认为「点了没反应」。
 *
 * 统一判据（与项目 M 系列「触点即落点」一致）：
 *  1) 详情必须**紧贴触发条目**出现（`insertAdjacentElement('afterend')`），而非固定在列表末尾；
 *  2) 出现后必须**滚动到可视区**（`scrollIntoView({ block:'nearest' })`，尽量少滚动、不跳动）；
 *  3) 同一容器可被多个触发器复用——每次打开时移动位置即可，无需为每行复制 DOM。
 *
 * 用法：
 *   import { anchorDetailToTrigger } from './detail-anchor.js?v=...';
 *   anchorDetailToTrigger(detailEl, triggerEl);          // 紧贴触发条目 + 滚入视野
 *   anchorDetailToTrigger(detailEl, triggerEl, { block: 'center', smooth: true });
 */

/**
 * 仅把已在 DOM 中的详情/展开区滚入视野（**视图切换类**与**行内已锚定类**使用）：
 *  - 视图切换类：列表整体被详情替换（如反馈管理、公共反馈页），详情 DOM 位置固定在列表上方，
 *    点击靠下的条目后用户需**反向向上**寻找 → 滚过去即可；
 *  - 行内已锚定类：详情已紧贴触发条目，但展开高度超出视口（如成员台复盘）→ 补一次滚动。
 * @param {HTMLElement} el 目标容器
 * @param {{ block?: string, smooth?: boolean, offset?: number }} [opts]
 */
export function scrollDetailIntoView(el, opts = {}) {
  if (!el) return false;
  const { block = 'start', smooth = false, offset = 0 } = opts;
  const doScroll = () => {
    try {
      el.scrollIntoView({ block, inline: 'nearest', behavior: smooth ? 'smooth' : 'auto' });
      if (offset) window.scrollBy({ top: offset, behavior: smooth ? 'smooth' : 'auto' });
    } catch (_) {
      el.scrollIntoView();
    }
  };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(doScroll);
  else doScroll();
  return true;
}

/**
 * 把共用详情容器移动到触发条目之后并确保其可见。
 * @param {HTMLElement} detailEl 详情容器（通常是列表末尾的单例面板）
 * @param {HTMLElement} triggerEl 触发条目（被点击的卡片/行）
 * @param {{ block?: 'nearest'|'start'|'center'|'end', smooth?: boolean, offset?: number }} [opts]
 * @returns {boolean} 是否完成锚定（容器或触发器缺失时返回 false，调用方照旧渲染即可）
 */
export function anchorDetailToTrigger(detailEl, triggerEl, opts = {}) {
  if (!detailEl || !triggerEl) return false;
  const { block = 'nearest', smooth = false, offset = 0 } = opts;
  // ① 紧贴触发条目：同一父容器内插到其后（跨父容器时降级为「插到触发器后面」的可行位置）
  if (triggerEl.parentElement) {
    triggerEl.insertAdjacentElement('afterend', detailEl);
  }
  detailEl.classList.remove('hidden');
  // ② 滚入视野：requestAnimationFrame 保证渲染完成后再测量（首帧高度常为 0）
  const doScroll = () => {
    try {
      detailEl.scrollIntoView({ block, inline: 'nearest', behavior: smooth ? 'smooth' : 'auto' });
      if (offset) window.scrollBy({ top: offset, behavior: smooth ? 'smooth' : 'auto' });
    } catch (_) {
      detailEl.scrollIntoView(); // 老浏览器兜底
    }
  };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(doScroll);
  else doScroll();
  return true;
}
