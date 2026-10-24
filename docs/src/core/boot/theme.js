// role: [工程师]+[AI]
// core/boot/theme.js — 深色模式手动三态切换（T231 支书决策 2026-08-07）
// 三态：light（浅色）/ dark（深色）/ system（跟随系统，默认）
// 实现：localStorage['workflowos_theme'] 存偏好；<html> 上 .theme-dark class 驱动全部深色 CSS；
//       CSS 侧深色规则统一改为 html.theme-dark 前缀（替代 @media prefers-color-scheme）。
// 防闪烁：各 HTML <head> 内联一段同步脚本（见 HTML），CSS 加载前即设好 class。
//
// 2026-09-09（设置中心 R1-A 裁决，支书）：外观偏好「按登录人彻底隔离」键空间适配层——
//   · 登录用户外观读写只走 person 键空间 gsm1921-pref-<personId>-{theme,font-size,accent-role}，
//     绝不回落/写迁移全局键：person 无键 = 未设置 → 出厂默认（主题=跟随系统默认档、字号=中、
//     强调色=null → 消费方按角色默认 resolveAccentRole(role) 语义，首登=出厂默认+角色配色）；
//   · 全局键（workflowos_theme / workflowos_font_size / workflowos_accent_role）只服务未登录访客，
//     访客读写与历史行为完全一致；登录用户的行为绝不写入/读取访客键空间；
//   · syncAppearanceForActiveUser()（sidebar 模块顶层 + DOMContentLoaded 后二次，见下）把
//     当前登录人 person 偏好应用到 DOM（主题/字号 <html> class、accent → 16 个主题色原始变量），
//     不经过全局键；冻结读取点（theme-init.js 首帧 / bootstrap.js 字号 / constants.js
//     resolveAccentRole / init-reset）保持只读全局键（服务访客与首帧兜底）不改——
//     登录人页面在冻结读取点取到的是全局键残留/默认 → 首帧小闪烁为已接受局限（5c 前记录，不变），
//     DOMContentLoaded 二次 sync 以本人 person 值作最终覆盖。主题算法与 CSS 变量体系不变。

import { readLoginSnapshot } from '../session/login-snapshot.js?v=20261024d';
// 主题色 DOM 生效（person 覆盖 → 8 token × 亮/暗 原始变量）与解析复用 constants 纯静态表；constants 零依赖，无环
import { getAccentColors, normalizeAccentKey } from '../domain/constants.js?v=20261024d';

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
 * 偏好读取（R1-A：按登录态分区，互不污染）：
 *   · 登录用户 → 只读 person 键；person 无键 = null（未设置 → 调用方按出厂默认档回退；
 *     绝不回落读全局键、绝不「写一次」迁移——新账号首登不继承上一登录者外观）；
 *   · 访客 → 读全局键（行为不变）。
 * @param {string} globalKey
 * @param {string} suffix  person 键后缀
 */
function getPref(globalKey, suffix) {
  const personId = getActivePersonId();
  if (!personId) return _readGlobal(globalKey);
  try {
    return localStorage.getItem(PREF_PREFIX + personId + suffix);
  } catch {
    return null;
  }
}

/**
 * 偏好写入（R1-A）：登录用户只写 person 键（绝不材料化全局键）；访客只写全局键。
 */
function setPref(globalKey, suffix, value) {
  const personId = getActivePersonId();
  if (!personId) {
    _writeGlobal(globalKey, value);
    return;
  }
  try { localStorage.setItem(PREF_PREFIX + personId + suffix, value); } catch { /* 忽略 */ }
}

/** person 键空间读写目标键解析（纯函数，测试与日志核对用） */
export function personPrefKey(personId, suffix) {
  return PREF_PREFIX + personId + suffix;
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
  if (typeof document !== 'undefined') {
    document.dispatchEvent(new CustomEvent('theme-changed', { detail: { mode } }));
  }
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
 * 设置强调色覆盖角色键（R1-A）：登录用户写 person 键、访客写全局键；绝不写对方键空间。
 * 生效方式沿用原机制：由消费方 location.reload() 后经页面 accent 应用（settings-entry /
 * sync DOMContentLoaded 二次）刷新。
 */
export function setAccentRolePreference(roleKey) {
  setPref(ACCENT_KEY, PREF_ACCENT, roleKey);
}

/**
 * 当前作用域生效主题键解析（R1-A person-aware 版；替代消费方对 constants
 * resolveAccentRole 的直接调用——resolveAccentRole 只读全局键、仅服务访客/冻结读取点）：
 *   · 登录用户：person 覆盖键 → 归一后取 7 主题之一（旧角色键 / 已删除色相走 ACCENT_KEY_ALIASES）；
 *   · 访客：全局键 → 同上；
 *   · 无覆盖 / 非法 → 默认金色（gold，2026-10-23 批次 505 起主题键与角色键解耦）。
 * @param {string} roleFallback 页面默认角色键（保留以兼容调用方；默认值不再取角色色）
 * @returns {string} 生效的主题键（7 项之一）
 */
export function resolveAppliedAccentRole(roleFallback) {
  const override = getAccentRolePreference();
  return override ? normalizeAccentKey(override) : 'gold';
}

// ── 主题色注入（批次 505；批次 508 增补 strongHover）────────────────
// 9 个 token × 亮/暗 = 18 个**原始变量**：--app-accent-base-light / -soft-bg-light / -soft-border-light /
// -soft-text-light / -strong-bg-light / -strong-ink-light / -strong-hover-light / -hover-bg-light / -active-bg-light（-dark 同理）。
// styles.css 的别名负责「亮/暗选边」（:root 指 *-light，html.theme-dark 指 *-dark），
// ⇒ 切换日夜**不需要**重新注入；消费方只读别名（--app-accent / --app-accent-soft-bg / …）。
const ACCENT_TOKEN_SUFFIXES = ['base', 'soft-bg', 'soft-border', 'soft-text', 'strong-bg', 'strong-ink', 'strong-hover', 'hover-bg', 'active-bg'];

/**
 * 主题键 → 18 个原始变量的键值对（纯函数，供注入与测试核对）
 * @param {string} key 主题键 / 角色键 / 旧键
 * @returns {Record<string,string>} CSS 变量名 → hex
 */
export function accentThemeTokenVars(key) {
  const themeKey = normalizeAccentKey(key);
  const light = getAccentColors(themeKey, 'light');
  const dark = getAccentColors(themeKey, 'dark');
  const lightTokens = [light.base, light.softBg, light.softBorder, light.softText, light.strongBg, light.strongInk, light.strongHover, light.hoverBg, light.activeBg];
  const darkTokens = [dark.base, dark.softBg, dark.softBorder, dark.softText, dark.strongBg, dark.strongInk, dark.strongHover, dark.hoverBg, dark.activeBg];
  const out = {};
  ACCENT_TOKEN_SUFFIXES.forEach((suffix, i) => {
    out[`--app-accent-${suffix}-light`] = lightTokens[i];
    out[`--app-accent-${suffix}-dark`] = darkTokens[i];
  });
  return out;
}

/**
 * 把当前主题的 18 个原始变量写到指定元素（幂等；亮/暗切换不再重注入）
 * @param {HTMLElement} el — 通常为 document.documentElement
 * @param {string} key — 主题键 / 角色键 / 旧键
 */
export function applyAccentThemeTokens(el, key) {
  if (!el || !el.style) return;
  const vars = accentThemeTokenVars(key);
  for (const [name, value] of Object.entries(vars)) el.style.setProperty(name, value);
}

/**
 * 当前作用域生效主题色（8 token + 兼容别名的平面对象，R1-A 点⑤ 统一口径）：
 * 渲染时动态解析——内部 = getAccentColors(resolveAppliedAccentRole(roleFallback))。
 * 消费方（组件/模块渲染取色）一律用本函数替代「模块加载期快照 + 写死 hex」。
 * @param {string} roleFallback 页面默认角色键（访客/无覆盖时回落；非法回落串交由 getAccentColors 兜底）
 * @param {number} [bgAlpha] — 历史参数，显式 token 后不再生效（保留签名兼容）
 * @param {number} [borderAlpha] — 历史参数，同上
 * @returns {ReturnType<typeof getAccentColors>}
 */
export function getAppliedAccentColors(roleFallback, bgAlpha = 0.1, borderAlpha = 0.3) {
  return getAccentColors(resolveAppliedAccentRole(roleFallback), 'light');
}

/** 登录用户主题色 → 16 个原始变量：无覆盖/非法也写默认金色（避免支部主题预设残留覆盖） */
function applyPersonAccent() {
  if (typeof document === 'undefined' || !document.documentElement) return;
  if (!getActivePersonId()) return; // 访客：accent 变量由页面既有 resolveAccentRole 路径负责
  applyAccentThemeTokens(document.documentElement, resolveAppliedAccentRole());
}

let _resyncScheduled = false;

/**
 * 外观键空间适配（R1-A）：页面壳加载时调用——
 *   · 登录用户：person 键 → 应用到 DOM（主题/字号 <html> class、person 强调色覆盖 → --app-accent
 *     变量），不经过全局键；person 无键 = 出厂默认（主题=跟随系统默认档、字号=中、强调色=角色默认，
 *     由页面既有角色默认逻辑负责），绝不写全局键、绝不写 person 键（首登零写入）；
 *   · 访客：按既有全局键应用到 DOM（行为不变，无任何写入）；
 *   冻结读取点（theme-init 首帧 / bootstrap 字号 / constants resolveAccentRole）只读全局键，在
 *   ES module（defer 语义）加载序列中会以全局键值再次应用 —— 而 module 顶层 await（bootstrapPage
 *   等）完成前 DOMContentLoaded 不会触发，故注册 DOMContentLoaded 二次 sync：以本人 person 值作
 *   最终覆盖（避免 bootstrap 以全局残留覆盖登录人 class/变量；首帧小闪烁为已接受局限，不变）。
 * 由 components/shell/sidebar.js 模块顶层调用（全站每页都经 sidebar 渲染，天然覆盖所有页面）。
 */
export function syncAppearanceForActiveUser() {
  if (typeof document === 'undefined') return;
  applyTheme();
  applyFontSize(getFontSizePreference());
  applyPersonAccent();
  // module（defer）执行时 readyState 已 interactive；只要 DCL 未触发即注册二次（幂等单次）
  if (document.readyState !== 'complete' && !_resyncScheduled) {
    _resyncScheduled = true;
    document.addEventListener('DOMContentLoaded', () => {
      _resyncScheduled = false;
      syncAppearanceForActiveUser();
    });
  }
}
