// role: [工程师]+[AI]
// core/theme.js — 深色模式手动三态切换（T231 书记决策 2026-08-07）
// 三态：light（浅色）/ dark（深色）/ system（跟随系统，默认）
// 实现：localStorage['workflowos_theme'] 存偏好；<html> 上 .theme-dark class 驱动全部深色 CSS；
//       CSS 侧深色规则统一改为 html.theme-dark 前缀（替代 @media prefers-color-scheme）。
// 防闪烁：各 HTML <head> 内联一段同步脚本（见 HTML），CSS 加载前即设好 class。
//
// 2026-09-09（设置中心批1）：外观偏好「按登录人隔离」键空间适配层——
//   · 登录用户读写 person 键空间 gsm1921-pref-<personId>-{theme,font-size,accent-role}；
//   · 访客回落既有全局键（workflowos_theme / workflowos_font_size / workflowos_accent_role）；
//   · 读优先 person 键：无则回落全局键并「写一次」迁移到 person 键；
//   · 页面壳加载时 syncAppearanceForActiveUser() 把当前登录人偏好材料化回全局键，
//     供冻结读取点（theme-init.js 首帧 / bootstrap.js 字号 / constants.js resolveAccentRole）
//     与下一页面首帧取用——外观仍即时全局生效，只是存储键随人。主题算法与 CSS 变量体系不变。

import { readLoginSnapshot } from './login-snapshot.js?v=20260909e';

const THEME_KEY = 'workflowos_theme';        // 主题（历史全局键；访客回落 / theme-init 首帧读取）
const FONT_KEY = 'workflowos_font_size';     // 字号（历史全局键；bootstrap.js 启动读取）
const ACCENT_KEY = 'workflowos_accent_role'; // 强调色（历史全局键；constants.js resolveAccentRole 读取）
const PREF_PREFIX = 'gsm1921-pref-';         // person 键空间前缀（设置中心批1，2026-09-09）
const PREF_THEME = '-theme';
const PREF_FONT = '-font-size';
const PREF_ACCENT = '-accent-role';

/** 当前登录人 personId（零依赖轻量读快照；未登录 → null = 访客回落全局键） */
function getActivePersonId() {
  try {
    const snap = readLoginSnapshot();
    return snap && snap.personId ? snap.personId : null;
  } catch {
    return null;
  }
}

function _readGlobal(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function _writeGlobal(key, value) {
  try { localStorage.setItem(key, value); } catch { /* 忽略 */ }
}

/**
 * 偏好读取：person 键优先；登录用户无 person 键 → 回落全局键并写一次（迁移）；
 * 访客直接读全局键。
 * @param {string} globalKey
 * @param {string} suffix  person 键后缀
 */
function getPref(globalKey, suffix) {
  const personId = getActivePersonId();
  if (!personId) return _readGlobal(globalKey);
  const personKey = PREF_PREFIX + personId + suffix;
  try {
    let v = localStorage.getItem(personKey);
    if (v == null) {
      v = localStorage.getItem(globalKey);
      if (v != null) localStorage.setItem(personKey, v); // 读优先 person、无则回落全局并写一次
    }
    return v;
  } catch {
    return _readGlobal(globalKey);
  }
}

/**
 * 偏好写入：登录用户写 person 键 + 材料化全局键（既有全局读取点即时可取，
 * 且下一页面 theme-init 首帧读到正确值）；访客仅写全局键。
 */
function setPref(globalKey, suffix, value) {
  _writeGlobal(globalKey, value);
  const personId = getActivePersonId();
  if (personId) {
    try { localStorage.setItem(PREF_PREFIX + personId + suffix, value); } catch { /* 忽略 */ }
  }
}

/** 系统当前是否深色（含手动覆盖判定，与 CSS 保持同源） */
function _systemPrefersDark() {
  return typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** 读取偏好：'light' | 'dark' | 'system'（非法值回退 system） */
export function getThemePreference() {
  const v = getPref(THEME_KEY, PREF_THEME);
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
}

/** 计算最终是否深色（结合偏好 + 系统状态） */
function isDarkTheme() {
  const pref = getThemePreference();
  return pref === 'dark' || (pref === 'system' && _systemPrefersDark());
}

/** 应用当前主题：给 <html> 加/去 .theme-dark，并同步 color-scheme（表单控件原生深色） */
function applyTheme() {
  if (typeof document === 'undefined') return;
  const dark = isDarkTheme();
  document.documentElement.classList.toggle('theme-dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}

/** 设置偏好并立即应用 */
export function setThemePreference(mode) {
  if (!['light', 'dark', 'system'].includes(mode)) mode = 'system';
  setPref(THEME_KEY, PREF_THEME, mode);
  applyTheme();
  document.dispatchEvent(new CustomEvent('theme-changed', { detail: { mode } }));
}

/** 初始化：应用一次 + 监听系统深色变化（仅 system 模式需要实时跟随） */
export function initTheme() {
  applyTheme();
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (getThemePreference() === 'system') applyTheme();
    };
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange);
    } else if (typeof mq.addListener === 'function') { // 旧 WebKit
      mq.addListener(onChange);
    }
  }
}

// ═══════════════ 设置中心批1：字号 / 强调色偏好（与主题同键空间适配）═══════════
// 原「侧边栏外观控件」直接读写全局键（sidebar.js 内联）；迁移到设置页后统一走本层，
// 使三块外观（主题/字号/强调色）一并获得「按登录人隔离」语义。

/** 读取字号偏好：'large' | 'medium' */
export function getFontSizePreference() {
  const v = getPref(FONT_KEY, PREF_FONT);
  return v === 'large' ? 'large' : 'medium';
}

function applyFontSize(size) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('font-size-large', size === 'large');
}

/** 设置字号偏好并立即应用（<html>.font-size-large，styles.css 档位规则驱动） */
export function setFontSizePreference(size) {
  const s = size === 'large' ? 'large' : 'medium';
  setPref(FONT_KEY, PREF_FONT, s);
  applyFontSize(s);
}

/** 读取强调色覆盖角色键（null = 未设置 → 消费方按角色默认回落） */
export function getAccentRolePreference() {
  return getPref(ACCENT_KEY, PREF_ACCENT) || null;
}

/**
 * 设置强调色覆盖角色键并材料化全局键。
 * 生效方式沿用原机制：由消费方 location.reload() 后经 constants resolveAccentRole / bootstrap 全站刷新。
 */
export function setAccentRolePreference(roleKey) {
  setPref(ACCENT_KEY, PREF_ACCENT, roleKey);
}

/**
 * 外观键空间适配（设置中心批1）：页面壳加载时调用一次——
 *   · 登录用户：把 person 偏好读入（无则从全局键迁移写一次），并材料化回全局键，
 *     使冻结读取点（theme-init.js 首帧 / bootstrap.js 字号 / constants.js resolveAccentRole）取到本人偏好；
 *   · 访客：零写入，继续回落既有全局键；
 *   随后即时应用主题 class 与字号 class（保持对 <html> 的即时生效语义）。
 * 由 components/sidebar.js 模块顶层调用（全站每页都经 sidebar 渲染，天然覆盖所有页面）。
 */
export function syncAppearanceForActiveUser() {
  if (typeof document === 'undefined') return;
  const personId = getActivePersonId();
  if (personId) {
    // 读 person（无则回落全局并写一次迁移）→ 材料化回全局键
    _writeGlobal(THEME_KEY, getThemePreference());
    _writeGlobal(FONT_KEY, getFontSizePreference());
    const accent = getAccentRolePreference();
    if (accent) _writeGlobal(ACCENT_KEY, accent);
  }
  applyTheme();
  applyFontSize(getFontSizePreference());
}
