// role: [工程师]+[AI]
// core/theme.js — 深色模式手动三态切换（T231 书记决策 2026-08-07）
// 三态：light（浅色）/ dark（深色）/ system（跟随系统，默认）
// 实现：localStorage['workflowos_theme'] 存偏好；<html> 上 .theme-dark class 驱动全部深色 CSS；
//       CSS 侧深色规则统一改为 html.theme-dark 前缀（替代 @media prefers-color-scheme）。
// 防闪烁：各 HTML <head> 内联一段同步脚本（见 HTML），CSS 加载前即设好 class。

const THEME_KEY = 'workflowos_theme';

/** 系统当前是否深色（含手动覆盖判定，与 CSS 保持同源） */
function _systemPrefersDark() {
  return typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** 读取偏好：'light' | 'dark' | 'system'（非法值回退 system） */
export function getThemePreference() {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
  } catch {
    return 'system';
  }
}

/** 计算最终是否深色（结合偏好 + 系统状态） */
export function isDarkTheme() {
  const pref = getThemePreference();
  return pref === 'dark' || (pref === 'system' && _systemPrefersDark());
}

/** 应用当前主题：给 <html> 加/去 .theme-dark，并同步 color-scheme（表单控件原生深色） */
export function applyTheme() {
  if (typeof document === 'undefined') return;
  const dark = isDarkTheme();
  document.documentElement.classList.toggle('theme-dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}

/** 设置偏好并立即应用 */
export function setThemePreference(mode) {
  if (!['light', 'dark', 'system'].includes(mode)) mode = 'system';
  try {
    localStorage.setItem(THEME_KEY, mode);
  } catch { /* 忽略 */ }
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
