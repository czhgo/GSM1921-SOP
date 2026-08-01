// ════════════════════════════════════════════════════════════════
//  custom-select.js — 自定义圆角下拉（S2）
//  设计原则（DESIGN_SYSTEM §一 最小三成本 / §4.3 Select 统一规则）：
//    - 视觉层：自定义触发器 + 圆角菜单，完全对齐 input-flat 体系
//    - 值载体：保留原生 <select> 的 DOM（视觉隐藏），使现有代码的
//      sel.value / sel.options / innerHTML 填充 / addEventListener('change')
//      全部继续工作，零侵入迁移
//    - 菜单每次展开时从 select.options 实时重建，动态填充即时生效
//  用法：渲染完 DOM 后调用 enhanceSelects(container)
// ════════════════════════════════════════════════════════════════

const ICON_CHEVRON =
  '<svg class="cs-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';

function _escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function _syncTrigger(trigger, sel) {
  const opt = sel.options[sel.selectedIndex];
  const label = opt ? opt.textContent : sel.value;
  const valueEl = trigger.querySelector('.cs-value');
  if (valueEl) {
    valueEl.textContent = label || '请选择';
    valueEl.style.color = label ? '' : 'var(--neutral-400)';
  }
}

function _openMenu(wrapper, menu, trigger, sel) {
  // 每次展开从 select.options 重建，保证动态填充即时生效
  menu.innerHTML = '';
  const frag = document.createDocumentFragment();
  Array.from(sel.options).forEach((opt) => {
    const item = document.createElement('div');
    item.className = 'cs-option';
    item.dataset.value = opt.value;
    item.textContent = opt.textContent;
    item.setAttribute('role', 'option');
    if (opt.disabled) item.classList.add('is-disabled');
    if (opt.selected) item.classList.add('is-selected');
    frag.appendChild(item);
  });
  menu.appendChild(frag);

  menu.classList.remove('hidden');
  trigger.setAttribute('aria-expanded', 'true');
  wrapper.classList.add('is-open');
  // 滚到选中项
  const active = menu.querySelector('.is-selected');
  if (active) active.scrollIntoView({ block: 'nearest' });
}

function _closeMenu(wrapper, menu, trigger) {
  menu.classList.add('hidden');
  trigger.setAttribute('aria-expanded', 'false');
  wrapper.classList.remove('is-open');
}

function enhanceSelect(sel) {
  if (sel.dataset.csEnhanced) return;
  sel.dataset.csEnhanced = '1';

  const origClass = sel.className;
  // 原生 select 视觉隐藏（保留 DOM、原 class 与全部语义；追加 cs-native）
  sel.className = (origClass + ' cs-native').replace(/\s+/g, ' ').trim();
  sel.tabIndex = -1;

  // 布局容器：仅继承布局类（外边距/宽度/弹性），排除视觉类（input-flat/padding/文字/圆角/字体等）
  const layoutCls = origClass
    .split(/\s+/)
    .filter(c => c && (
      /^m[tblrxy]?-/.test(c) ||       // margin 系
      /^w-/.test(c) ||                 // 宽度
      /^min-w-/.test(c) || /^max-w-/.test(c) ||
      /^flex/.test(c) ||               // flex 系
      /^self-/.test(c) ||              // 对齐
      /^shrink/.test(c) || /^grow/.test(c) ||
      /^grid/.test(c) || /^col-/.test(c) || /^lg:col-/.test(c)
    ))
    .join(' ');
  const wrapper = document.createElement('div');
  wrapper.className = 'cs-select ' + layoutCls;
  wrapper.setAttribute('data-for', sel.id || '');

  // 触发器：继承原 select 的视觉类（input-flat/text-*/字体等），排除布局类
  //（margin/width/flex 已由 wrapper 承担，避免双重 margin 与宽度冲突）
  const triggerCls = origClass
    .split(/\s+/)
    .filter(c => c && (
      /^input-flat/.test(c) ||
      /^text-/.test(c) ||
      /^font-/.test(c) ||
      /^leading-/.test(c) ||
      /^tracking-/.test(c) ||
      /^placeholder-/.test(c) ||
      /^rounded/.test(c) ||
      /^cursor-/.test(c)
    ))
    .join(' ');
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'cs-trigger ' + triggerCls;
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.innerHTML = `<span class="cs-value"></span>${ICON_CHEVRON}`;
  _syncTrigger(trigger, sel);

  const menu = document.createElement('div');
  menu.className = 'cs-menu hidden';
  menu.setAttribute('role', 'listbox');

  // 替换原 select 在 DOM 中的位置
  sel.parentNode.insertBefore(wrapper, sel);
  wrapper.appendChild(sel);
  wrapper.appendChild(trigger);
  wrapper.appendChild(menu);

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    if (sel.disabled) return;
    const isOpen = !menu.classList.contains('hidden');
    if (isOpen) {
      _closeMenu(wrapper, menu, trigger);
    } else {
      _openMenu(wrapper, menu, trigger, sel);
    }
  });

  menu.addEventListener('click', (e) => {
    const item = e.target.closest('.cs-option');
    if (!item || item.classList.contains('is-disabled')) return;
    sel.value = item.dataset.value;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    _syncTrigger(trigger, sel);
    _closeMenu(wrapper, menu, trigger);
    trigger.focus();
  });

  // 点击外部关闭
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) _closeMenu(wrapper, menu, trigger);
  });

  // Esc 关闭
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      _closeMenu(wrapper, menu, trigger);
      e.stopPropagation();
    }
  });

  // 外部程序性更新 select.value 时同步触发器文案（响应动态填充后的选中）
  const observer = new MutationObserver(() => _syncTrigger(trigger, sel));
  observer.observe(sel, { attributes: true, attributeFilter: ['value'], childList: true, subtree: true });
}

/**
 * 对容器内所有 .input-flat select 增强为自定义圆角下拉。
 * @param {ParentNode} [root] 容器，默认 document
 */
export function enhanceSelects(root = document) {
  root.querySelectorAll('select.input-flat:not([data-cs-enhanced])').forEach(enhanceSelect);
}

export default enhanceSelects;
