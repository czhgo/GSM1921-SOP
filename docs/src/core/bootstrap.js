// role: [工程师]+[AI]
// bootstrap.js — 页面初始化统一入口（重构版）
// 变化: 去掉 ViewModeStore/CrossPageState/setActiveRole，改为基于 getCurrentUser() 的登录检查
// 第3轮 Task 9: dev 参数读取改用 CrossPageState.getParam（统一入口）

import { renderSidebar } from '../components/sidebar.js';
import { renderHeader } from '../components/header.js';
import { AuthStore } from '../services/auth.js';
import { getAccentColors } from './constants.js';
import { CrossPageState } from './cross-page-state.js';

// ════════════════════════════════════════════════════════════════
// 安全最佳实践：开发绕过白名单（security-best-practices Skill 指导）
// ════════════════════════════════════════════════════════════════
// ?dev=ROLE 是本地开发便捷绕过登录的机制，生产环境必须拒绝。
// 防护两层：(1) hostname 必须是本地回环；(2) ROLE 必须在白名单内。
const DEV_HOSTNAME_WHITELIST = new Set(['localhost', '127.0.0.1', '::1']);
const DEV_ROLE_WHITELIST = new Set([
  'secretary', 'deputy-secretary',
  'org-commissioner', 'prop-commissioner', 'disc-commissioner',
  'leader', 'participant',
]);

/**
 * 页面初始化统一入口（重构版）
 *
 * @param {Object} opts
 * @param {string} opts.module          — 模块名：'workspace' | 'party' | 'dashboard' | 'members' | 'archive' | 'search' | 'feedback'
 * @param {string} [opts.accentRole]    — 强调色角色键名（省略则不获取 accent 三件套）
 * @param {number[]} [opts.accentAlpha] — 自定义透明度 [bgAlpha, borderAlpha]
 *
 * @returns {{
 *   user: { userId: string, role: string } | null,
 *   accent: string|undefined,
 *   accentRgba: string|undefined,
 *   accentBorder: string|undefined
 * }}
 */
export function bootstrapPage({ module, accentRole, accentAlpha }) {
  // 登录检查
  const user = AuthStore.getCurrentUser();
  if (!user) {
    // 开发绕过：?dev=ROLE 仅在本地 hostname + 白名单角色时生效
    const devRole = CrossPageState.getParam('dev');
    const isLocalHost = DEV_HOSTNAME_WHITELIST.has(window.location.hostname);
    if (devRole && isLocalHost && DEV_ROLE_WHITELIST.has(devRole)) {
      AuthStore.devLogin(devRole);
      window.location.reload();
      return { user: null };
    }
    const base = window.location.pathname.includes('/workspace/') || window.location.pathname.includes('/party/')
      ? '../' : './';
    window.location.href = base + 'login.html';
    return { user: null };
  }

  // 渲染侧边栏 + 顶栏
  renderSidebar(module);
  renderHeader(module);

  // 强调色
  let accent, accentRgba, accentBorder;
  if (accentRole) {
    if (accentAlpha) {
      ({ accent, accentRgba, accentBorder } = getAccentColors(accentRole, accentAlpha[0], accentAlpha[1]));
    } else {
      ({ accent, accentRgba, accentBorder } = getAccentColors(accentRole));
    }
  }

  return { user, accent, accentRgba, accentBorder };
}
