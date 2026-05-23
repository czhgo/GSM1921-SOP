// role: [人机]
// ════════════════════════════════════════════════════════════════
//  bootstrap.js — 页面初始化统一入口
// ════════════════════════════════════════════════════════════════

import { renderSidebar } from '../components/sidebar.js';
import { renderHeader } from '../components/header.js';
import { CrossPageState } from './cross-page-state.js';
import { ViewModeStore, AuthStore } from '../services/auth.js';
import { getAccentColors } from './constants.js';

/**
 * 页面初始化统一入口
 *
 * 将 18 个 entry 中重复的 renderSidebar → renderHeader → CrossPageState →
 * AuthStore → ViewModeStore → getAccentColors 序列收敛为一处。
 *
 * @param {Object} opts
 * @param {string} opts.module          — 模块名：'workspace' | 'party' | 'dashboard' | 'archive' | 'search' | 'feedback'
 * @param {string} [opts.defaultRole]   — 默认角色键名（无角色系统时省略）
 * @param {string} [opts.viewMode]      — 视图模式：'manage' | 'participant-observe' | 'auto'
 *                                        'auto' 时根据 URL 参数判断（仅 ws-disc-commissioner 使用）
 * @param {string} [opts.accentRole]    — 强调色角色键名（省略则不获取 accent 三件套）
 * @param {number[]} [opts.accentAlpha] — 自定义透明度 [bgAlpha, borderAlpha]（仅 party-secretary 使用）
 *
 * @returns {{
 *   savedState: Object,
 *   accent: string|undefined,
 *   accentRgba: string|undefined,
 *   accentBorder: string|undefined,
 *   viewMode: string|undefined
 * }}
 */
export function bootstrapPage({ module, defaultRole, viewMode, accentRole, accentAlpha }) {
  // 1. 骨架渲染
  renderSidebar(module);
  renderHeader(module);

  // 2. 无角色系统的页面（archive/search/feedback）到此结束
  if (!defaultRole) {
    return { savedState: {}, viewMode: undefined, accent: undefined, accentRgba: undefined, accentBorder: undefined };
  }

  // 3. 跨页状态恢复
  const savedState = CrossPageState.load();

  // 4. 角色设定
  AuthStore.setActiveRole(module, savedState.selectedRole || defaultRole);
  if (savedState.stance) {
    AuthStore.setPrimaryRole(savedState.stance);
  }

  // 5. 视图模式
  let resolvedViewMode = viewMode;
  if (viewMode === 'auto') {
    // 仅 ws-disc-commissioner 使用：根据 URL 参数判断
    const urlParams = CrossPageState.getURLParams();
    const fromHomepage = !!urlParams.activityId || urlParams.mode === 'readonly';
    resolvedViewMode = fromHomepage ? 'participant-observe' : 'manage';
  }
  if (resolvedViewMode && resolvedViewMode !== 'auto') {
    ViewModeStore.setMode(module, resolvedViewMode);
  }

  // 6. 强调色
  let accent, accentRgba, accentBorder;
  if (accentRole) {
    if (accentAlpha) {
      ({ accent, accentRgba, accentBorder } = getAccentColors(accentRole, accentAlpha[0], accentAlpha[1]));
    } else {
      ({ accent, accentRgba, accentBorder } = getAccentColors(accentRole));
    }
  }

  return { savedState, viewMode: resolvedViewMode, accent, accentRgba, accentBorder };
}
