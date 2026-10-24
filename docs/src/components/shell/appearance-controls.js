// role: [工程师]+[AI]
// components/shell/appearance-controls.js — 外观控件（字号/主题三态/主题色七选一）
// 2026-09-09（设置中心批1）：原「侧边栏底部外观控件」迁入设置页外观区。
// 控件 render+bind 抽成可复用函数供 settings-entry 使用（避免复制粘贴逻辑）；
// 功能键位语义与迁移前一致：字号/主题即时生效，主题色选择后整页刷新生效（全站统一刷新机制）。
// 读写统一走 core/boot/theme.js 偏好适配层（R1-A：登录人 person 键空间 / 访客全局键，互不污染），
// 生效主题色 = resolveAppliedAccentRole（person-aware：覆盖仅取当前作用域键，绝不跨空间回落），
// 由 settings 页调用方传入 accentFallbackRole（当前常设角色，访客 ''）计算。
//
// 2026-10-23 批次 505（spec `redesign-theme-palette-and-density` Task 5）：
//   · 主题色选择器恰 7 项（金/红/橙/绿/青/蓝/紫）；天蓝 / 雾紫 / 亮蓝退场，不再出现；
//   · 每项两张小样：「浅底 + 深字」= softBg 底 + softText 字（softBorder 描边）、
//     「实底 + 字」= strongBg 底 + strongInk 字；取色一律 getAccentColors(主题键, 当前亮暗)，
//     本文件不出现任何主题色 hex，也不把亮色 accent token 内联写到 <html>；
//   · 选中态用该主题 soft 三件套，未选中保持中性；亮/暗切换只重绘小样（改用 dark 一套 token）；
//   · 旧偏好 sky / light-blue → blue、deep → purple（与 constants.js 回落表同口径），
//     设置页给出轻提示（role="status"，不阻断操作；不写浏览器存储）。

import { icon } from '../../core/base/icons.js?v=20261024d';
import { ACCENT_PALETTE, getAccentColors } from '../../core/domain/constants.js?v=20261024d';
import {
  getFontSizePreference,
  setFontSizePreference,
  getThemePreference,
  setThemePreference,
  getAccentRolePreference,
  setAccentRolePreference,
  resolveAppliedAccentRole,
} from '../../core/boot/theme.js?v=20261024d';

// ── 按钮态样式（与迁移前侧边栏一致；gray 系类随 html.theme-dark 自动翻转）──
const _base = 'btn-tab px-2.5 py-1 text-xs ';
// 选中态由 `.btn-tab.active` 提供（同色系浅底 ＋ 主题色字，深色经 `html.theme-dark` 派生）
const _on = 'active';
const _off = '';

function _btnCls(active) {
  return _base + (active ? _on : _off);
}
/** 选中态同步（只切类：浅底/深字/深色提亮由 `.btn-tab.active` 与 CSS 主题 token 承担） */
function _applyBtnState(btn, active) {
  btn.className = _btnCls(active);
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

// ── 主题色（7 项）预览 ─────────────────────────────────────────────
// 已删除色相的旧偏好 → 保留主题（与 constants.js ACCENT_KEY_ALIASES 同口径）。
const LEGACY_ACCENT_FALLBACK = { sky: 'blue', 'light-blue': 'blue', deep: 'purple' };
const LEGACY_ACCENT_LABEL = { sky: '天蓝', 'light-blue': '亮蓝', deep: '雾紫' };

/** 当前实际亮/暗：<html>.theme-dark 由 theme.js 同步（不在此重复推导 system 偏好） */
function _themeMode() {
  return document.documentElement.classList.contains('theme-dark') ? 'dark' : 'light';
}

/** 选项底色：选中 = 该主题 soft 三件套；未选中 = 中性表面（颜色不是唯一信息，文字标签始终可见） */
function _optionColors(t, selected) {
  return selected
    ? { background: t.softBg, borderColor: t.softBorder, color: t.softText }
    : { background: 'var(--surface-card)', borderColor: 'var(--neutral-200)', color: 'var(--neutral-700)' };
}

/** 小样取色：soft = 浅底 + 深字（softBorder 描边）；strong = 实底 + 字 */
function _sampleColors(t, kind) {
  return kind === 'soft'
    ? { background: t.softBg, color: t.softText, borderColor: t.softBorder }
    : { background: t.strongBg, color: t.strongInk, borderColor: t.strongBg };
}

/** 颜色对象 → 内联 style 串（首帧渲染用；重绘走 _applyColors，口径同一份） */
function _styleAttr(colors) {
  return `background:${colors.background};border-color:${colors.borderColor};color:${colors.color}`;
}

/** 把颜色写到元素（渲染与亮/暗重绘共用同一份取色口径） */
function _applyColors(el, colors) {
  el.style.background = colors.background;
  el.style.borderColor = colors.borderColor;
  el.style.color = colors.color;
}

/** 重绘 7 项小样（挂载时 + 亮/暗切换后；取色全部来自主题表当前模式） */
function _paintAccentPreviews(root) {
  if (!root) return;
  const mode = _themeMode();
  root.querySelectorAll('[data-accent-key]').forEach(el => {
    const t = getAccentColors(el.dataset.accentKey, mode);
    const sample = el.dataset.accentSample;
    if (sample) {
      _applyColors(el, _sampleColors(t, sample));
      return;
    }
    const selected = el.getAttribute('aria-pressed') === 'true';
    _applyColors(el, _optionColors(t, selected));
  });
}

/** 旧主题偏好的轻提示（不写浏览器存储：未重选前每次进入设置页都可见，重选后自然消失） */
function _legacyAccentNotice() {
  let raw = '';
  try { raw = getAccentRolePreference() || ''; } catch { raw = ''; }
  const targetKey = LEGACY_ACCENT_FALLBACK[raw];
  if (!targetKey) return '';
  const from = LEGACY_ACCENT_LABEL[raw] || raw;
  const to = ACCENT_PALETTE.find(c => c.key === targetKey)?.label || targetKey;
  return `<p class="mt-1 text-xs text-gray-500" role="status">旧主题「${from}」已合并为「${to}」，当前按「${to}」显示；可在上方重新选择。</p>`;
}

/** 当前生效主题色（7 项之一；旧键经 resolveAppliedAccentRole 归一） */
function _effectiveAccent(fallbackRole) {
  const key = resolveAppliedAccentRole(fallbackRole || '');
  const entry = ACCENT_PALETTE.find(c => c.key === key);
  return { key, label: entry?.label || '金（默认）' };
}

/** 单个主题项：文字标签 ＋「浅底 + 深字」「实底 + 字」两张小样 */
function _accentOptionHTML(entry, currentKey, mode) {
  const selected = entry.key === currentKey;
  const t = getAccentColors(entry.key, mode);
  return `
    <button type="button" class="flex flex-col items-start gap-1 rounded-lg border border-neutral-200 px-2 py-1 text-left min-w-[104px]" data-accent-key="${entry.key}" aria-pressed="${selected ? 'true' : 'false'}" title="主题：${entry.label}" style="${_styleAttr(_optionColors(t, selected))}">
      <span class="flex items-center gap-1 text-xs font-medium">
        <span>${entry.label}</span>
        ${selected ? icon('check', { className: 'w-3 h-3', extra: ' aria-hidden="true"' }) : ''}
      </span>
      <span class="flex items-center gap-1" aria-hidden="true">
        <span class="inline-flex items-center justify-center rounded border min-w-[32px] h-5 px-1 text-[11px] leading-5" data-accent-key="${entry.key}" data-accent-sample="soft" style="${_styleAttr(_sampleColors(t, 'soft'))}">Aa</span>
        <span class="inline-flex items-center justify-center rounded border min-w-[32px] h-5 px-1 text-[11px] leading-5" data-accent-key="${entry.key}" data-accent-sample="strong" style="${_styleAttr(_sampleColors(t, 'strong'))}">Aa</span>
      </span>
    </button>`;
}

/** 控件区 HTML（容器 #settings-appearance-controls） */
export function appearanceControlsHTML(opts = {}) {
  const { accentFallbackRole = '', scopeNote = '' } = opts;
  const font = getFontSizePreference();
  const theme = getThemePreference();
  const accent = _effectiveAccent(accentFallbackRole);
  const mode = _themeMode();
  const accentOptions = ACCENT_PALETTE.map(c => _accentOptionHTML(c, accent.key, mode)).join('');

  const fontBtns = FONT_OPTIONS.map(o => `
    <button type="button" class="btn-tab ${_btnCls(font === o.value)}" data-font-size="${o.value}" title="${o.title}">${o.label}</button>
  `).join('');

  const themeBtns = THEME_OPTIONS.map(o => `
    <button type="button" class="btn-tab ${_btnCls(theme === o.value)}" data-theme-mode="${o.value}" title="${o.title}">${icon(o.icon, { className: 'w-3.5 h-3.5' })}</button>
  `).join('');

  return `
    <div class="appearance-section" id="settings-appearance-controls">
      <div class="appearance-row">
        <div class="appearance-row-label">字号</div>
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
            ${fontBtns}
          </div>
          <span class="text-xs text-gray-500">系统默认中号 · 大号放大一档阅读</span>
        </div>
      </div>
      <div class="appearance-row">
        <div class="appearance-row-label">主题</div>
        <div class="flex items-center gap-2">
          <div class="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1">
            ${themeBtns}
          </div>
          <span class="text-xs text-gray-500">浅色 / 跟随系统 / 深色</span>
        </div>
      </div>
      <div class="appearance-row">
        <div class="appearance-row-label">主题色</div>
        <div class="flex flex-col gap-1 min-w-0">
          <div class="flex flex-wrap items-center gap-2" role="group" aria-label="主题色（7 种）">${accentOptions}</div>
          <span class="text-xs text-gray-500">全站按钮/标签/选中态的主题颜色 · 当前：${accent.label}</span>
          <span class="text-xs text-gray-500">每项左侧＝浅底＋深字，右侧＝实底＋字；切换亮/暗后小样同步。</span>
          ${_legacyAccentNotice()}
        </div>
      </div>
      ${scopeNote ? `<div class="appearance-note">${scopeNote}</div>` : ''}
    </div>
  `;
}

/** 绑定字号/主题/主题色控件事件（挂载后调用一次） */
export function bindAppearanceControls(hostEl) {
  if (!hostEl) return;

  // 小样首绘（挂载即按当前亮/暗取主题表颜色）
  _paintAccentPreviews(hostEl);

  // 字号
  hostEl.querySelectorAll('[data-font-size]').forEach(btn => {
    btn.addEventListener('click', () => {
      setFontSizePreference(btn.dataset.fontSize);
      hostEl.querySelectorAll('[data-font-size]').forEach(b => {
        _applyBtnState(b, b.dataset.fontSize === btn.dataset.fontSize);
      });
    });
  });

  // 主题三态：立即生效，并让 7 项小样随亮/暗重绘
  hostEl.querySelectorAll('[data-theme-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      setThemePreference(btn.dataset.themeMode);
      hostEl.querySelectorAll('[data-theme-mode]').forEach(b => {
        _applyBtnState(b, b.dataset.themeMode === btn.dataset.themeMode);
      });
      _paintAccentPreviews(hostEl);
    });
  });

  // 主题色（选择 → 写入偏好 → 整页刷新全站生效，沿用迁移前机制）
  hostEl.querySelectorAll('[data-accent-key]:not([data-accent-sample])').forEach(btn => {
    btn.addEventListener('click', () => {
      setAccentRolePreference(btn.dataset.accentKey);
      window.location.reload();
    });
  });
}
