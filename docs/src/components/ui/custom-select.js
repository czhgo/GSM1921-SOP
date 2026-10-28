// ════════════════════════════════════════════════════════════════
//  custom-select.js — 自定义圆角下拉（S2）
//  设计原则（DESIGN_SYSTEM §一 最小三成本 / §4.3 Select 统一规则）：
//    - 视觉层：自定义触发器 + 圆角菜单，完全对齐 input-flat 体系
//    - 值载体：保留原生 <select> 的 DOM（视觉隐藏），使现有代码的
//      sel.value / sel.options / innerHTML 填充 / addEventListener('change')
//      全部继续工作，零侵入迁移
//    - 菜单每次展开时从 select.options 实时重建，动态填充即时生效
//  用法：渲染完 DOM 后调用 enhanceSelects(container)
//  ── 大数据量 / 无限增长三条用法（2026-10-24 批次 508）────────────────
//   ① 搜索：<select data-cs-search="true">（强制出现搜索框；选项数 >10 时仍自动出现）
//   ② 近期优先：<select data-cs-priority="recent"> + <option data-recent="true">
//      命中项置顶并加「近期」分组标题（原生 option 顺序不变）
//   ③ 分批渲染：<select data-cs-limit="20"> 首屏只渲染 20 项，底部「显示更多（剩余 M 项）」
//      按钮每点一次再追加 20 项；搜索时对全量选项匹配，不受分批限制
//   三项能力只影响增强菜单的呈现，隐藏的原生 select 仍是唯一值载体（value / change 语义零变化），
//   enhanceSelects 依 data-cs-enhanced 保持幂等。
// ════════════════════════════════════════════════════════════════

import { emptyStateHtml } from './empty-state.js?v=20261028b';

const ICON_CHEVRON =
  '<svg class="cs-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';

// 内嵌搜索（支书指令 2026-08-06）：选项数量超过阈值时，菜单顶部自动出现搜索框。
// 适用所有「随时间增长、查找困难」的下拉（活动/专班/人员等），一次改造全站受益。
const ICON_SEARCH =
  '<svg class="cs-search-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
const SEARCH_THRESHOLD = 10; // 选项数超过此值自动内嵌搜索

// ── 全局浮层互斥（支书指令 2026-08-06）：任何下拉/色板浮层打开时，先自动收起其他已打开的浮层 ──
if (!window.__popoverClosers) window.__popoverClosers = new Set();
window.__closeOtherPopovers = (keep) => {
  window.__popoverClosers.forEach((fn) => { if (fn !== keep) fn(); });
};

function _escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let _csSeq = 0;

/** 菜单内当前可聚焦（未禁用、未被搜索过滤）的选项 */
function _enabledOptions(menu) {
  return Array.from(menu.querySelectorAll('.cs-option')).filter((el) => (
    !el.classList.contains('is-disabled') && el.style.display !== 'none'
  ));
}

/** 选中一个选项：写回原生 select → 触发 change → 同步触发器 → 关闭并回焦 */
function _selectOption(item, sel, trigger, wrapper, menu) {
  if (!item || item.classList.contains('is-disabled')) return;
  sel.value = item.dataset.value;
  sel.dispatchEvent(new Event('change', { bubbles: true }));
  _syncTrigger(trigger, sel);
  _closeMenu(wrapper, menu, trigger);
  trigger.focus();
}

function _syncTrigger(trigger, sel) {
  const opt = sel.options[sel.selectedIndex];
  const label = opt ? opt.textContent : sel.value;
  const valueEl = trigger.querySelector('.cs-value');
  if (valueEl) {
    valueEl.textContent = label || '请选择';
    valueEl.style.color = label ? '' : 'var(--neutral-500)';
  }
}

/** 禁用态同步（2026-10-20 界面细化）：原生 select 被程序置 disabled 时，
 *  触发器若仍可点会给出「能点但没反应」的错觉；disabled + aria-disabled 同步给读屏与样式。 */
function _syncDisabled(trigger, sel) {
  const disabled = !!sel.disabled;
  trigger.disabled = disabled;
  if (disabled) trigger.setAttribute('aria-disabled', 'true');
  else trigger.removeAttribute('aria-disabled');
}

/**
 * 下拉菜单智能定位（支书指令 2026-08-06）：不再一律向下展开，
 * 按触发器在视口中的实际位置决定向下/向上，并限制高度避免溢出视口。
 * 定位策略（2026-08-08 修复）：改用 position:absolute 相对 .cs-select 容器定位。
 *   根因：.view-section 的恒等 transform:translateY(0) 会创建 containing block，
 *   使 position:fixed 相对 section 而非视口，菜单被定位到视口外（浏览器实测：菜单 top=1186 > 视口 900）。
 *   而 .cs-select 自身是 position:relative，absolute 菜单天然相对它定位，不受 transform 祖先影响。
 */
function _positionMenu(wrapper, menu, trigger) {
  const wrapRect = wrapper.getBoundingClientRect(); // 相对视口（含滚动偏移）
  const trigRect = trigger.getBoundingClientRect();
  const viewH = window.innerHeight;
  const viewW = window.innerWidth;
  const GAP = 4;
  const MAX_H = 240;

  // 宽度测量前先解除 .cs-menu 的 min-width:100% —— 该百分比相对 wrapper 解析时也可能
  // 影响「最宽选项」测量（回归 bug，浏览器验证 2026-08-07 发现）。
  // 内联 min-width:0 覆盖样式表规则；下方最终将 min-width 与 width 一并显式设为计算值。
  menu.style.minWidth = '0';

  // 菜单实际渲染高度（CSS max-height 240 封顶）
  const menuH = Math.min(menu.offsetHeight || MAX_H, MAX_H);
  const spaceBelow = viewH - trigRect.bottom;
  const spaceAbove = trigRect.top;
  let openUp;
  if (spaceBelow >= menuH + GAP) {
    openUp = false; // 下方足够 → 正常向下
  } else if (spaceAbove >= menuH + GAP) {
    openUp = true; // 下方不足且上方足够 → 向上翻转
  } else {
    openUp = spaceAbove > spaceBelow; // 两侧都不足 → 取空间大的一侧
  }

  const avail = (openUp ? spaceAbove : spaceBelow) - GAP;
  // 保持 absolute（相对 .cs-select 定位祖先），不再改 fixed
  menu.style.position = 'absolute';
  menu.style.maxHeight = Math.max(96, Math.min(MAX_H, avail)) + 'px';
  // 宽度：取「触发器宽度」与「最宽选项内容」的较大者（选项 white-space:nowrap，
  // scrollWidth 即真实内容宽；+8 补 .cs-menu 的 4px×2 水平 padding，避免横向滚动条）
  let widest = trigRect.width;
  menu.querySelectorAll('.cs-option, .cs-empty').forEach((el) => {
    widest = Math.max(widest, el.scrollWidth);
  });
  const width = Math.min(Math.max(trigRect.width, widest + 8), viewW - 8);
  menu.style.width = width + 'px';
  menu.style.minWidth = width + 'px';
  // 水平对齐触发器（相对 wrapper 的偏移）
  const maxLeft = Math.max(0, wrapRect.width - width);
  menu.style.left = Math.min(Math.max(0, trigRect.left - wrapRect.left), maxLeft) + 'px';
  if (openUp) {
    menu.style.top = 'auto';
    // 菜单底缘 = 触发器上缘上方 GAP（相对 wrapper）
    menu.style.bottom = (wrapRect.bottom - trigRect.top + GAP) + 'px';
  } else {
    menu.style.bottom = 'auto';
    // 菜单顶缘 = 触发器下缘下方 GAP（相对 wrapper）
    menu.style.top = (trigRect.bottom - wrapRect.top + GAP) + 'px';
  }
  wrapper.classList.toggle('cs-open-up', openUp);
}

/**
 * 增强菜单可见性同步（2026-10-24 批次 508）——搜索过滤 / 分批渲染的统一收口：
 *  - 无搜索词：只显示前 shownCount 项（shownCount=全部时为全量）；
 *  - 有搜索词：对**全量**选项匹配（不受分批限制），命中的都显示；
 *  - 分组标题在其后没有可见选项时隐藏（避免出现孤立标题）；
 *  - 「显示更多」仅在未搜索且仍有剩余时出现；空态沿用 .cs-empty，文案「没有匹配项」。
 * 只改增强菜单内节点的 display，不触碰原生 select（值载体）与任何颜色。
 * @param {HTMLElement} menu 菜单容器
 * @param {HTMLElement[]} options 全量 .cs-option 节点（菜单内顺序）
 * @param {number} shownCount 当前已展开的项数
 * @param {HTMLElement|null} moreBtn 「显示更多」按钮
 */
function _syncCsVisibility(menu, options, shownCount, moreBtn) {
  const q = (menu.querySelector('.cs-search-input')?.value || '').trim().toLowerCase();
  let visible = 0;
  options.forEach((el, i) => {
    const hit = !q || el.textContent.toLowerCase().includes(q);
    const within = !!q || i < shownCount;
    const show = hit && within;
    el.style.display = show ? '' : 'none';
    if (show) visible++;
  });
  menu.querySelectorAll('.cs-group-label').forEach((label) => {
    let hasVisible = false;
    for (let n = label.nextElementSibling; n; n = n.nextElementSibling) {
      if (n.classList.contains('cs-group-label')) break;
      if (n.classList.contains('cs-option') && n.style.display !== 'none') { hasVisible = true; break; }
    }
    label.style.display = hasVisible ? '' : 'none';
  });
  if (options.length > 0) {
    let empty = menu.querySelector('.cs-empty');
    if (visible === 0) {
      if (!empty) {
        empty = document.createElement('div');
        empty.className = 'cs-empty';
        menu.appendChild(empty);
      }
      empty.innerHTML = emptyStateHtml({ text: '没有匹配项', variant: 'inline' });
    } else if (empty) {
      empty.remove();
    }
  }
  if (moreBtn) {
    const remain = options.length - shownCount;
    const showMore = !q && remain > 0;
    moreBtn.style.display = showMore ? '' : 'none';
    if (showMore) moreBtn.textContent = `显示更多（剩余 ${remain} 项）`;
  }
}

function _openMenu(wrapper, menu, trigger, sel) {
  // 每次展开从 select.options 重建，保证动态填充即时生效
  menu.innerHTML = '';
  const frag = document.createDocumentFragment();

  // 2026-10-24 批次 508：大数据量开关（只作用于增强菜单呈现，原生 select 的值载体地位不变）
  //  - data-cs-search="true"：强制显示搜索框（选项数超阈值时仍自动显示）
  //  - data-cs-priority="recent"：<option data-recent="true"> 置顶并加「近期」分组
  //  - data-cs-limit="N"：首屏只显示 N 项，底部「显示更多」逐批追加
  const needsSearch = sel.dataset.csSearch === 'true' || sel.options.length > SEARCH_THRESHOLD;
  const limit = Math.max(0, parseInt(sel.dataset.csLimit || '0', 10) || 0);
  const recentFirst = sel.dataset.csPriority === 'recent';
  if (needsSearch) {
    const search = document.createElement('div');
    search.className = 'cs-search';
    search.innerHTML = `${ICON_SEARCH}<input type="text" class="cs-search-input" placeholder="搜索…" aria-label="搜索选项">`;
    frag.appendChild(search);
  }

  // 选项与分组标题渲染（2026-09-13 修复）：原 `Array.from(sel.options)` 会**拉平** options，
  //   optgroup 的分组标题被丢弃 → 支部分工面板的「工作程序·规范 / 工作方法·支部自选」「不开展」
  //   等分组在增强下拉里完全不可见（数据层有分组、渲染层丢分组）。改为遍历 sel.children：
  //   OPTGROUP → 渲染不可选的分组标题行（.cs-group-label），OPTION → 渲染选项。
  const appendOption = (opt, parent, groupDisabled = false) => {
    const item = document.createElement('div');
    item.className = 'cs-option';
    item.dataset.value = opt.value;
    item.textContent = opt.textContent;
    item.setAttribute('role', 'option');
    // R5A-03：选项必须可编程聚焦，方向键才能把焦点移进 listbox。
    item.tabIndex = -1;
    if (opt.disabled || groupDisabled) {
      item.classList.add('is-disabled');
      item.setAttribute('aria-disabled', 'true');
    }
    if (opt.selected) {
      item.classList.add('is-selected');
      item.setAttribute('aria-selected', 'true');
    }
    optionEls.push(item);
    parent.appendChild(item);
  };
  // 2026-10-24 批次 508：记录菜单内全部选项节点（分批渲染 / 搜索都基于它，原生顺序不改）
  const optionEls = [];
  // 「近期」置顶：仅重排增强菜单的呈现顺序，原生 select 的 option 顺序与值完全不动
  const recentSet = new Set(
    recentFirst ? Array.from(sel.options).filter((opt) => opt.dataset && opt.dataset.recent === 'true') : []
  );
  if (recentSet.size > 0) {
    const recentHead = document.createElement('div');
    recentHead.className = 'cs-group-label';
    recentHead.textContent = '近期';
    recentHead.setAttribute('role', 'presentation');
    frag.appendChild(recentHead);
    Array.from(sel.options).forEach((opt) => {
      if (!recentSet.has(opt)) return;
      // 原属禁用 optgroup 的「近期」项仍保持禁用（状态语义不因置顶而丢失）
      const parentGroup = opt.parentElement && opt.parentElement.tagName === 'OPTGROUP' ? opt.parentElement : null;
      appendOption(opt, frag, !!(parentGroup && parentGroup.disabled));
    });
  }
  const childNodes = Array.from(sel.children || []);
  if (childNodes.some((n) => n.tagName === 'OPTGROUP')) {
    childNodes.forEach((node) => {
      if (node.tagName === 'OPTGROUP') {
        // 已置顶的「近期」项不再重复渲染；整组都属近期时也不落空标题
        const groupOpts = Array.from(node.children).filter((o) => !recentSet.has(o));
        if (groupOpts.length === 0) return;
        const head = document.createElement('div');
        head.className = 'cs-group-label';
        // 分组禁用须同时落到标题与子项（2026-10-20）：只灰标题而子项可点，状态就不一致。
        if (node.disabled) {
          head.classList.add('is-disabled');
          head.setAttribute('aria-disabled', 'true');
        }
        head.textContent = node.label || '';
        head.setAttribute('role', 'presentation');
        frag.appendChild(head);
        groupOpts.forEach((o) => appendOption(o, frag, !!node.disabled));
      } else if (node.tagName === 'OPTION') {
        if (recentSet.has(node)) return;
        appendOption(node, frag);
      }
    });
  } else {
    Array.from(sel.options).forEach((opt) => { if (!recentSet.has(opt)) appendOption(opt, frag); });
  }
  // 0 选项时菜单原本是一片空白，用户会以为没加载出来（C-05）；这里给明确空态。
  if (sel.options.length === 0) {
    const placeholder = document.createElement('div');
    placeholder.className = 'cs-empty';
    placeholder.textContent = '暂无可选项';
    frag.appendChild(placeholder);
  }
  menu.appendChild(frag);

  // 2026-10-24 批次 508：分批渲染——首屏只显示前 N 项，底部按钮逐批追加。
  // 已选项若在首批之外，自动展开到它所在批次，避免「打开菜单看不到当前值」。
  let shownCount = limit > 0 ? Math.min(limit, optionEls.length) : optionEls.length;
  if (limit > 0) {
    const selectedIndex = optionEls.findIndex((el) => el.classList.contains('is-selected'));
    if (selectedIndex >= shownCount) shownCount = selectedIndex + 1;
  }
  let moreBtn = null;
  if (limit > 0 && optionEls.length > limit) {
    moreBtn = document.createElement('button');
    moreBtn.type = 'button';
    moreBtn.dataset.csMore = '1';
    // 复用既有文字类，不引入新色值（颜色一律走 token/类）
    moreBtn.className = 'w-full text-xs text-gray-600 py-2';
    moreBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      shownCount = Math.min(optionEls.length, shownCount + limit);
      _syncCsVisibility(menu, optionEls, shownCount, moreBtn);
    });
    menu.appendChild(moreBtn);
  }
  _syncCsVisibility(menu, optionEls, shownCount, moreBtn);

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
    // 2026-10-24 批次 508：搜索与分批渲染统一交给 _syncCsVisibility（搜索对全量选项生效，
    //   不清空已展开批次；空态文案固定「没有匹配项」）。
    searchInput.addEventListener('input', () => {
      _syncCsVisibility(menu, optionEls, shownCount, moreBtn);
    });
    // 键盘：Enter 选择首个可见项；Esc 先清空再关闭；↑/↓ 把焦点移入选项
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const first = _enabledOptions(menu)[0];
        if (first) _selectOption(first, sel, trigger, wrapper, menu);
      } else if (e.key === 'Escape') {
        if (searchInput.value) {
          searchInput.value = '';
          searchInput.dispatchEvent(new Event('input'));
        } else {
          _closeMenu(wrapper, menu, trigger, { restoreFocus: true });
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

  // R5A-03：打开即把焦点移入 listbox（有搜索框时焦点先落搜索，↓ 再进选项）。
  if (needsSearch) {
    menu.querySelector('.cs-search-input')?.focus();
  } else {
    const target = menu.querySelector('.cs-option.is-selected:not(.is-disabled)')
      || _enabledOptions(menu)[0]
      || menu;
    target.focus();
  }
}

function _closeMenu(wrapper, menu, trigger, { restoreFocus = false } = {}) {
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
  // R5A-03：键盘关闭（Esc）后把焦点归还触发器；点击外部关闭不抢焦点。
  if (restoreFocus) trigger.focus();
}

function enhanceSelect(sel) {
  if (sel.dataset.csEnhanced) return;
  sel.dataset.csEnhanced = '1';

  const origClass = sel.className;
  // 原生 select 视觉隐藏（保留 DOM、原 class 与全部语义；追加 cs-native）
  sel.className = (origClass + ' cs-native').replace(/\s+/g, ' ').trim();
  sel.tabIndex = -1;
  // R5A-03：原生 select 只是值载体，读屏不应再遇到第二个 1px combobox。
  sel.setAttribute('aria-hidden', 'true');

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
  // 2026-09-14 批次 27 裁定「控件档位唯一 34px / 12px」：不再补 h-8（32px）。
  // 原 h-8 使触发器 32px、相邻 input-flat.text-xs 34px，同排底部错位 2px 且 12px 字在 32px 内容区被压。
  // 现由 .cs-trigger.input-flat.text-xs 的 padding 8px 12px + 行高 16px + 边框 2px 自然得 34px，与输入框严格同高。
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  // R5A-03：触发器需要稳定 id 与字段标签（`label[for]` 指向原生 select，
  // 不建立 aria-labelledby 时可访问名只剩当前值，读屏听不到字段名）。
  trigger.id = `${sel.id || `cs-select-${++_csSeq}`}-trigger`;
  trigger.setAttribute('role', 'combobox');
  const labelledBy = Array.from(sel.labels || []).map((label, i) => {
    if (!label.id) label.id = `${trigger.id}-label-${i}`;
    return label.id;
  });
  labelledBy.push(trigger.id);
  trigger.setAttribute('aria-labelledby', labelledBy.join(' '));
  trigger.innerHTML = `<span class="cs-value"></span>${ICON_CHEVRON}`;
  _syncTrigger(trigger, sel);
  _syncDisabled(trigger, sel);

  const menu = document.createElement('div');
  menu.className = 'cs-menu hidden';
  menu.id = `${trigger.id}-menu`;
  menu.setAttribute('role', 'listbox');
  menu.setAttribute('aria-labelledby', trigger.id);
  menu.tabIndex = -1;
  trigger.setAttribute('aria-controls', menu.id);

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
    if (!item) return;
    _selectOption(item, sel, trigger, wrapper, menu);
  });

  // R5A-03：listbox 键盘导航（焦点在选项上时）。Home/End 跳首末，Enter/Space 选择，Esc 关闭并回焦。
  menu.addEventListener('keydown', (e) => {
    const items = _enabledOptions(menu);
    const current = e.target.closest?.('.cs-option') || null;
    const index = current ? items.indexOf(current) : -1;
    const moveTo = (next) => {
      if (!items.length) return;
      e.preventDefault();
      // 2026-10-24 批次 508：分批渲染时允许从最后一个可见项 ↓ 落到「显示更多」按钮，
      // 键盘用户同样能逐批展开（按钮本身对 Enter/Space 有原生激活）。
      if (next > items.length - 1) {
        const more = menu.querySelector('[data-cs-more]');
        if (more && more.style.display !== 'none') { more.focus(); return; }
      }
      items[Math.max(0, Math.min(items.length - 1, next))]?.focus();
    };
    switch (e.key) {
      case 'ArrowDown': moveTo(index + 1); break;
      case 'ArrowUp': moveTo(index < 0 ? items.length - 1 : index - 1); break;
      case 'Home': moveTo(0); break;
      case 'End': moveTo(items.length - 1); break;
      case 'Enter':
      case ' ':
        if (current) {
          e.preventDefault();
          _selectOption(current, sel, trigger, wrapper, menu);
        }
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        _closeMenu(wrapper, menu, trigger, { restoreFocus: true });
        break;
      case 'Tab':
        _closeMenu(wrapper, menu, trigger);
        break;
      default:
        break;
    }
  });

  // 点击 `label[for=<select id>]` 时浏览器会聚焦被隐藏的原生 select：把焦点转给可见触发器。
  sel.addEventListener('focus', () => trigger.focus());

  // 点击外部关闭
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) _closeMenu(wrapper, menu, trigger);
  });

  // Esc 关闭（焦点在触发器时）；↑/↓ 直接打开并聚焦首/末项
  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      _closeMenu(wrapper, menu, trigger);
      e.stopPropagation();
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (sel.disabled) return;
      if (menu.classList.contains('hidden')) _openMenu(wrapper, menu, trigger, sel);
      const items = _enabledOptions(menu);
      const target = e.key === 'ArrowDown' ? items[0] : items[items.length - 1];
      target?.focus();
    }
  });

  // 外部程序性更新 select.value 时同步触发器文案（响应动态填充后的选中）；
  // disabled 也一并跟随（表单常按权限/前置条件启用或禁用控件）。
  const observer = new MutationObserver(() => {
    _syncTrigger(trigger, sel);
    _syncDisabled(trigger, sel);
  });
  observer.observe(sel, { attributes: true, attributeFilter: ['value', 'disabled'], childList: true, subtree: true });
}

/**
 * 对容器内所有 .input-flat select 增强为自定义圆角下拉。
 * @param {ParentNode} [root] 容器，默认 document
 */
export function enhanceSelects(root = document) {
  root.querySelectorAll('select.input-flat:not([data-cs-enhanced])').forEach(enhanceSelect);
}

export default enhanceSelects;
