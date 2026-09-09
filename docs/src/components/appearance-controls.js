// role: [工程师]+[AI]
// components/appearance-controls.js — 外观控件（字号/主题三态/强调色）
// 2026-09-09（设置中心批1）：原「侧边栏底部外观控件」迁入设置页外观区。
// 控件 render+bind 抽成可复用函数供 settings-entry 使用（避免复制粘贴逻辑）；
// 功能键位语义与迁移前一致：字号/主题即时生效，强调色选择后整页刷新生效（全站统一刷新机制）。
// 读写统一走 core/theme.js 偏好适配层（登录人 person 键空间 / 访客全局键回落），
// 由 settings 页调用方传入 accentFallbackRole（当前常设角色，访客 ''）计算生效强调色。

import { icon } from '../core/icons.js?v=20260908d';
import { ACCENT_COLORS, ACCENT_PALETTE, resolveAccentRole } from '../core/constants.js?v=20260908d';
import {
  getFontSizePreference,
  setFontSizePreference,
  getThemePreference,
  setThemePreference,
  setAccentRolePreference,
} from '../core/theme.js?v=20260908d';

// ── 按钮态样式（与迁移前侧边栏一致；gray 系类随 html.theme-dark 自动翻转）──
const _base = 'px-2.5 py-1 rounded-lg text-xs font-medium border transition-all duration-200 ';
const _on = 'bg-[var(--app-accent-bg)] border-[var(--app-accent)] text-[var(--app-accent)]';
const _off = 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50';

function _btnCls(active) {
  return _base + (active ? _on : _off);
}

// ── 字号二档 ──
const FONT_OPTIONS = [
  { value: 'medium', label: '中', title: '中号字体' },
  { value: 'large', label: '大', title: '大号字体' },
];

// ── 主题三态 ──
const THEME_OPTIONS = [
  { value: 'light', icon: 'sun', title: '浅色模式' },
  { value: 'system', icon: 'monitor', title: '跟随系统' },
  { value: 'dark', icon: 'moon', title: '深色模式' },
];

/** 当前生效强调色信息（存储覆盖优先，未设置回落传入角色默认） */
function _effectiveAccent(fallbackRole) {
  const key = resolveAccentRole(fallbackRole || '');
  const paletteEntry = ACCENT_PALETTE.find(c => c.key === key);
  const hex = paletteEntry?.hex || ACCENT_COLORS[key]?.hex || '#B91C1C';
  const label = paletteEntry?.label || '红';
  return { key, hex, label };
}

/** 控件区 HTML（容器 #settings-appearance-controls；悬停/弹层类复用 styles.css .accent-*） */
export function appearanceControlsHTML(opts = {}) {
  const { accentFallbackRole = '', scopeNote = '' } = opts;
  const font = getFontSizePreference();
  const theme = getThemePreference();
  const accent = _effectiveAccent(accentFallbackRole);

  const fontBtns = FONT_OPTIONS.map(o => `
    <button type="button" class="${_btnCls(font === o.value)}" data-font-size="${o.value}" title="${o.title}">${o.label}</button>
  `).join('');

  const themeBtns = THEME_OPTIONS.map(o => `
    <button type="button" class="${_btnCls(theme === o.value)}" data-theme-mode="${o.value}" title="${o.title}">${icon(o.icon, { className: 'w-3.5 h-3.5' })}</button>
  `).join('');

  return `
    <div class="appearance-section" id="settings-appearance-controls">
      <div class="appearance-row">
        <div class="appearance-row-label">字号</div>
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
            ${fontBtns}
          </div>
          <span class="text-xs text-gray-400">系统默认中号 · 大号放大一档阅读</span>
        </div>
      </div>
      <div class="appearance-row">
        <div class="appearance-row-label">主题</div>
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
            ${themeBtns}
          </div>
          <span class="text-xs text-gray-400">浅色 / 跟随系统 / 深色</span>
        </div>
      </div>
      <div class="appearance-row">
        <div class="appearance-row-label">强调色</div>
        <div class="flex items-center gap-2">
          <button type="button" id="appearance-accent-swatch" class="accent-swatch" style="width:24px;height:24px;background:${accent.hex}" data-current-role="${accentFallbackRole || ''}" data-label="主题：${accent.label}" title="主题：${accent.label}（点击更换）"></button>
          <span class="text-xs text-gray-400">全站按钮/标签/选中态的强调颜色 · 当前：${accent.label}</span>
        </div>
      </div>
      ${scopeNote ? `<div class="appearance-note">${scopeNote}</div>` : ''}
    </div>
  `;
}

/** 绑定字号/主题/强调色控件事件（挂载后调用一次） */
export function bindAppearanceControls(hostEl) {
  if (!hostEl) return;

  // 字号
  hostEl.querySelectorAll('[data-font-size]').forEach(btn => {
    btn.addEventListener('click', () => {
      setFontSizePreference(btn.dataset.fontSize);
      hostEl.querySelectorAll('[data-font-size]').forEach(b => {
        b.className = _btnCls(b.dataset.fontSize === btn.dataset.fontSize);
      });
    });
  });

  // 主题三态
  hostEl.querySelectorAll('[data-theme-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      setThemePreference(btn.dataset.themeMode);
      hostEl.querySelectorAll('[data-theme-mode]').forEach(b => {
        b.className = _btnCls(b.dataset.themeMode === btn.dataset.themeMode);
      });
    });
  });

  // 强调色（选择 → 写入偏好 → 整页刷新全站生效，沿用迁移前机制）
  const swatch = hostEl.querySelector('#appearance-accent-swatch');
  if (swatch) {
    swatch.addEventListener('click', (e) => {
      e.stopPropagation();
      _toggleAccentPalette(swatch);
    });
  }
}

// ── 强调色选色板（自 sidebar.js 原实现迁入；浮层互斥/智能定位/外点关闭语义不变）──
function _toggleAccentPalette(swatch) {
  const existing = document.getElementById('accent-palette-popover');
  if (existing) { existing.remove(); return; }

  const currentKey = resolveAccentRole(swatch.dataset.currentRole || '');
  const popover = document.createElement('div');
  popover.id = 'accent-palette-popover';
  popover.className = 'accent-palette';
  popover.innerHTML = `
    <div class="accent-palette-title">点击色块更换主题</div>
    <div class="accent-palette-grid">
      ${ACCENT_PALETTE.map(c => `
        <button type="button" class="accent-swatch-opt ${c.key === currentKey ? 'active' : ''}" data-key="${c.key}" data-label="主题：${c.label}" title="主题：${c.label}" style="background:${c.hex}"></button>
      `).join('')}
    </div>
  `;
  document.body.appendChild(popover);

  // 浮层互斥：打开前自动收起其他已打开的浮层（如自定义下拉菜单）；注册本色板的关闭器
  if (window.__closeOtherPopovers) window.__closeOtherPopovers();
  let outsideHandler = null;
  const closer = () => {
    if (outsideHandler) { document.removeEventListener('click', outsideHandler); outsideHandler = null; }
    popover.remove();
    if (window.__popoverClosers) window.__popoverClosers.delete(closer);
  };
  if (window.__popoverClosers) window.__popoverClosers.add(closer);

  // 定位（fixed，基于 swatch 位置，避免被容器 overflow 裁剪）：默认向下展开；下方空间不足向上翻转
  const rect = swatch.getBoundingClientRect();
  const w = popover.offsetWidth;
  const h = popover.offsetHeight;
  const vh = window.innerHeight;
  const maxLeft = Math.max(8, window.innerWidth - w - 8);
  popover.style.left = Math.min(Math.max(8, rect.left), maxLeft) + 'px';
  if (rect.bottom + 6 + h > vh - 8) {
    popover.style.top = 'auto';
    popover.style.bottom = Math.max(8, vh - rect.top + 6) + 'px';
  } else {
    popover.style.top = (rect.bottom + 6) + 'px';
    popover.style.bottom = 'auto';
  }

  // 选择 → 写入偏好（登录人 person 键 / 访客全局键）→ 整页刷新全站生效
  popover.querySelectorAll('.accent-swatch-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      setAccentRolePreference(btn.dataset.key);
      window.location.reload();
    });
  });

  // 点击外部关闭
  setTimeout(() => {
    outsideHandler = (ev) => {
      if (!popover.contains(ev.target) && ev.target !== swatch) closer();
    };
    document.addEventListener('click', outsideHandler);
  }, 0);
}
