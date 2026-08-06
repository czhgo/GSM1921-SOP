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

// 内嵌搜索（书记指令 2026-08-06）：选项数量超过阈值时，菜单顶部自动出现搜索框。
// 适用所有「随时间增长、查找困难」的下拉（活动/专班/人员等），一次改造全站受益。
const ICON_SEARCH =
  '<svg class="cs-search-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
const SEARCH_THRESHOLD = 10; // 选项数超过此值自动内嵌搜索

// ── 全局浮层互斥（书记指令 2026-08-06）：任何下拉/色板浮层打开时，先自动收起其他已打开的浮层 ──
if (!window.__popoverClosers) window.__popoverClosers = new Set();
window.__closeOtherPopovers = (keep) => {
  window.__popoverClosers.forEach((fn) => { if (fn !== keep) fn(); });
};

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

/**
 * 下拉菜单智能定位（书记指令 2026-08-06）：不再一律向下展开，
 * 按触发器在视口中的实际位置决定向下/向上，并限制高度避免溢出视口。
 * 采用 position:fixed 逐次计算，可脱离滚动容器裁剪（如模态框内靠底部的下拉）。
 */
function _positionMenu(wrapper, menu, trigger) {
  const rect = trigger.getBoundingClientRect();
  const viewH = window.innerHeight;
  const viewW = window.innerWidth;
  const GAP = 4;
  const MAX_H = 240;

  // 宽度测量前先解除 .cs-menu 的 min-width:100% —— position:fixed 下该百分比解析为视口宽，
  // 会把 .cs-option 撑成视口宽，污染「最宽选项」测量（回归 bug，浏览器验证 2026-08-07 发现）。
  // 内联 min-width:0 覆盖样式表规则；下方最终将 min-width 与 width 一并显式设为计算值。
  menu.style.minWidth = '0';

  // 菜单实际渲染高度（CSS max-height 240 封顶）
  const menuH = Math.min(menu.offsetHeight || MAX_H, MAX_H);
  const spaceBelow = viewH - rect.bottom;
  const spaceAbove = rect.top;
  let openUp;
  if (spaceBelow >= menuH + GAP) {
    openUp = false; // 下方足够 → 正常向下
  } else if (spaceAbove >= menuH + GAP) {
    openUp = true; // 下方不足且上方足够 → 向上翻转
  } else {
    openUp = spaceAbove > spaceBelow; // 两侧都不足 → 取空间大的一侧
  }

  const avail = (openUp ? spaceAbove : spaceBelow) - GAP;
  menu.style.position = 'fixed';
  menu.style.maxHeight = Math.max(96, Math.min(MAX_H, avail)) + 'px';
  // 宽度：取「触发器宽度」与「最宽选项内容」的较大者（选项 white-space:nowrap，
  // scrollWidth 即真实内容宽；+8 补 .cs-menu 的 4px×2 水平 padding，避免横向滚动条）
  let widest = rect.width;
  menu.querySelectorAll('.cs-option, .cs-empty').forEach((el) => {
    widest = Math.max(widest, el.scrollWidth);
  });
  const width = Math.min(Math.max(rect.width, widest + 8), viewW - 8);
  menu.style.width = width + 'px';
  menu.style.minWidth = width + 'px';
  const maxLeft = Math.max(4, viewW - width - 4);
  menu.style.left = Math.min(Math.max(4, rect.left), maxLeft) + 'px';
  if (openUp) {
    menu.style.top = 'auto';
    menu.style.bottom = (viewH - rect.top + GAP) + 'px';
  } else {
    menu.style.bottom = 'auto';
    menu.style.top = (rect.bottom + GAP) + 'px';
  }
  wrapper.classList.toggle('cs-open-up', openUp);
}

function _openMenu(wrapper, menu, trigger, sel) {
  // 每次展开从 select.options 重建，保证动态填充即时生效
  menu.innerHTML = '';
  const frag = document.createDocumentFragment();

  // 选项数超阈值 → 菜单顶部内嵌搜索框
  const needsSearch = sel.options.length > SEARCH_THRESHOLD;
  if (needsSearch) {
    const search = document.createElement('div');
    search.className = 'cs-search';
    search.innerHTML = `${ICON_SEARCH}<input type="text" class="cs-search-input" placeholder="搜索…" aria-label="搜索选项">`;
    frag.appendChild(search);
  }

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

  // 浮层互斥：打开前自动收起其他已打开的下拉/色板
  if (!wrapper._csCloser) wrapper._csCloser = () => _closeMenu(wrapper, menu, trigger);
  window.__closeOtherPopovers(wrapper._csCloser);
  window.__popoverClosers.add(wrapper._csCloser);

  // 智能定位 + 打开期间跟随滚动/缩放重定位
  _positionMenu(wrapper, menu, trigger);
  const reposition = () => {
    if (menu.classList.contains('hidden')) return;
    _positionMenu(wrapper, menu, trigger);
  };
  wrapper._csReposition = reposition;
  window.addEventListener('scroll', reposition, true);
  window.addEventListener('resize', reposition);

  if (needsSearch) {
    const searchInput = menu.querySelector('.cs-search-input');
    searchInput.focus();
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      let visible = 0;
      menu.querySelectorAll('.cs-option').forEach(opt => {
        const hit = opt.textContent.toLowerCase().includes(q);
        opt.style.display = hit ? '' : 'none';
        if (hit) visible++;
      });
      const empty = menu.querySelector('.cs-empty');
      if (visible === 0) {
        if (!empty) {
          const placeholder = document.createElement('div');
          placeholder.className = 'cs-empty';
          placeholder.textContent = '无匹配项';
          menu.appendChild(placeholder);
        }
      } else if (empty) {
        empty.remove();
      }
    });
    // 键盘：Enter 选择首个可见项；Esc 先清空再关闭
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const first = menu.querySelector('.cs-option:not([style*="display: none"])');
        if (first) first.click();
      } else if (e.key === 'Escape') {
        if (searchInput.value) {
          searchInput.value = '';
          searchInput.dispatchEvent(new Event('input'));
        } else {
          _closeMenu(wrapper, menu, trigger);
        }
        e.stopPropagation();
      }
    });
  }

  // 菜单内滚到选中项（仅滚动菜单自身，避免带动页面/容器滚动）
  const active = menu.querySelector('.is-selected');
  if (active) {
    menu.scrollTop = Math.max(0, active.offsetTop - menu.clientHeight / 2 + active.clientHeight / 2);
  }
}

function _closeMenu(wrapper, menu, trigger) {
  // 从全局浮层互斥注册表中注销
  if (wrapper._csCloser) window.__popoverClosers.delete(wrapper._csCloser);
  // 移除滚动/缩放重定位监听
  if (wrapper._csReposition) {
    window.removeEventListener('scroll', wrapper._csReposition, true);
    window.removeEventListener('resize', wrapper._csReposition);
    delete wrapper._csReposition;
  }
  // 重置搜索过滤（下次展开时干净重建）
  const searchInput = menu.querySelector('.cs-search-input');
  if (searchInput) searchInput.value = '';
  menu.querySelectorAll('.cs-option').forEach(opt => { opt.style.display = ''; });
  menu.querySelector('.cs-empty')?.remove();
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
