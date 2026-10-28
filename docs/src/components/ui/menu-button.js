// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  menu-button.js — 菜单的唯一实现（button + aria-haspopup/expanded/controls）
// ════════════════════════════════════════════════════════════════
//  契约（`.trae/specs/consolidate-ia-terms-and-components` · Task 3）：
//   · 菜单＝`button` ＋ `aria-haspopup` ＋ `aria-expanded` ＋ `aria-controls`；
//   · 菜单容器 `role="menu"`，菜单项 `role="menuitem"`；
//   · Esc 关闭并把焦点归还给触发按钮；点击外部关闭；
//   · 折叠状态由 `aria-expanded` **静态回读**（菜单不是阅读型折叠，故不进 `<details>`）。
import { escHtml } from '../../core/base/utils.js?v=20261028a';

/** 每个根节点只挂一次文档级关闭监听（容器跨重渲染复用） */
const _bound = new WeakSet();

/**
 * 渲染一个菜单按钮。
 * @param {Object} opts
 * @param {string} opts.id              按钮 id（菜单 id 为 `${id}-menu`）
 * @param {string} opts.label           按钮内容（文本或已转义的图标标记）
 * @param {string} opts.itemsHtml       菜单项 HTML（每项应为 `role="menuitem"`）
 * @param {string} [opts.className]     根容器附加类（如 `todo-more`）
 * @param {string} [opts.buttonClassName] 按钮类（默认 `btn-outline btn-sm menu-button__btn`）
 * @param {string} [opts.menuClassName] 菜单容器附加类（如 `todo-more__menu`）
 * @returns {string}
 */
export function renderMenuButton({
  id,
  label,
  itemsHtml,
  className = '',
  buttonClassName = 'btn-outline btn-sm menu-button__btn',
  menuClassName = '',
}) {
  const mid = String(id || '').trim();
  if (!mid) throw new Error('[menu-button] 需要稳定的 id（决定 DOM 钩子）');
  const menuId = `${mid}-menu`;
  return `
    <div class="menu-button${className ? ` ${className}` : ''}" data-menu-button>
      <button type="button" id="${escHtml(mid)}" class="${escHtml(buttonClassName)}" aria-haspopup="menu" aria-expanded="false" aria-controls="${escHtml(menuId)}">${label}</button>
      <div class="${menuClassName ? `${escHtml(menuClassName)} ` : ''}menu-button__menu" id="${escHtml(menuId)}" role="menu" hidden>${itemsHtml}</div>
    </div>`;
}

/** 取本根节点内所有菜单容器（不含嵌套菜单容器里的） */
function _menusOf(root) {
  return Array.from(root.querySelectorAll('.menu-button__menu'));
}

/** 关闭本根节点内全部菜单；`except` 指定的一个保持原样 */
function _closeMenus(root, except = null) {
  for (const menu of _menusOf(root)) {
    if (menu === except) continue;
    menu.hidden = true;
    const btn = menu.closest('[data-menu-button]')?.querySelector('[aria-haspopup="menu"]');
    btn?.setAttribute('aria-expanded', 'false');
  }
}

/**
 * 绑定菜单交互（点击展开 / 点击外部关闭 / Esc 关闭并归还焦点 / 方向键在菜单项间移动）。
 * 幂等：同一根节点重复调用不会重复挂监听。
 */
export function bindMenuButtons(root = document) {
  if (!root || _bound.has(root)) return;
  _bound.add(root);

  root.addEventListener('click', (event) => {
    const btn = event.target.closest?.('[data-menu-button] > [aria-haspopup="menu"]');
    if (btn && root.contains(btn)) {
      event.stopPropagation();
      const menu = btn.closest('[data-menu-button]')?.querySelector('.menu-button__menu');
      if (!menu) return;
      const willOpen = menu.hidden;
      _closeMenus(root);
      if (willOpen) {
        menu.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
        menu.querySelector('[role="menuitem"]:not([disabled])')?.focus?.();
      }
      return;
    }
    const item = event.target.closest?.('[role="menuitem"]');
    if (item && root.contains(item)) {
      // 菜单项被点：先收起（动作本身由调用方的委托处理）
      _closeMenus(root);
    }
  });

  root.addEventListener('keydown', (event) => {
    const btn = event.target.closest?.('[data-menu-button] > [aria-haspopup="menu"]');
    const openMenu = btn?.closest('[data-menu-button]')?.querySelector('.menu-button__menu');
    if (btn && (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      openMenu.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      openMenu.querySelector('[role="menuitem"]:not([disabled])')?.focus?.();
      return;
    }
    if (event.key !== 'Escape') {
      const inMenu = event.target.closest?.('.menu-button__menu');
      if (inMenu && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        const items = Array.from(inMenu.querySelectorAll('[role="menuitem"]:not([disabled])'));
        if (!items.length) return;
        event.preventDefault();
        const at = items.indexOf(document.activeElement);
        const next = event.key === 'Home' ? 0
          : event.key === 'End' ? items.length - 1
            : event.key === 'ArrowDown' ? (at + 1) % items.length
              : (at - 1 + items.length) % items.length;
        items[next]?.focus?.();
      }
      return;
    }
    // Esc：收起并把焦点归还给触发按钮
    const menu = event.target.closest?.('.menu-button__menu');
    if (!menu || menu.hidden) return;
    event.preventDefault();
    const owner = menu.closest('[data-menu-button]')?.querySelector('[aria-haspopup="menu"]');
    _closeMenus(root);
    owner?.focus?.();
  });

  // 点击外部关闭（文档级，按根节点只挂一次）
  document.addEventListener('click', (event) => {
    if (!document.contains(root)) return;
    if (event.target.closest?.('[data-menu-button]')) return;
    _closeMenus(root);
  });
}
