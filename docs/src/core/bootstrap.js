﻿// role: [工程师]+[AI]
// bootstrap.js — 页面初始化统一入口（重构版）
// 变化: 去掉 ViewModeStore/CrossPageState/setActiveRole，改为基于 getCurrentUser() 的登录检查
// 第3轮 Task 9: dev 参数读取改用 CrossPageState.getParam（统一入口）
// 2026-07-30: 改为 async，统一预加载所有 Service（IssueStore/MilestoneStore），消除跨页面数据不同步

import { renderSidebar } from '../components/sidebar.js?v=20260808k';
import { renderHeader } from '../components/header.js?v=20260808k';
import { AuthStore } from '../services/auth.js?v=20260808k';
import { IssueStore } from '../services/issues.js?v=20260808k';
import { MilestoneStore } from '../services/milestones.js?v=20260808k';
import { getAccentColors, resolveAccentRole } from './constants.js?v=20260808k';
import { CrossPageState } from './cross-page-state.js?v=20260808k';
import { getBasePath } from './utils.js?v=20260808k';
import { enhanceSelects } from '../components/custom-select.js?v=20260808k';
import { registerApiAdapter, setDataSource, init } from './data-adapter.js?v=20260808k';
import { ApiAdapter } from './api-adapter.js?v=20260808k';

// ════════════════════════════════════════════════════════════════
// S2 自定义圆角下拉：全局自动增强（MutationObserver 防抖扫描）
// 任何时刻动态渲染出的 .input-flat select 都会被增强为自定义圆角下拉，
// 无需在各渲染点逐处调用（组件内 data-cs-enhanced 标记防重）。
// ════════════════════════════════════════════════════════════════
let _csScanTimer = null;
function _scheduleEnhance() {
  if (_csScanTimer) return;
  _csScanTimer = setTimeout(() => {
    _csScanTimer = null;
    enhanceSelects(document);
  }, 60);
}
if (typeof MutationObserver !== 'undefined' && document.body) {
  new MutationObserver(_scheduleEnhance).observe(document.body, { childList: true, subtree: true });
} else if (document.body) {
  _scheduleEnhance();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _scheduleEnhance);
} else {
  _scheduleEnhance();
}

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
 * 2026-07-30 起改为 async：在登录检查通过后，统一预加载所有 Service（IssueStore/MilestoneStore），
 * 消除跨页面数据不同步问题（如书记工作台 issue 列表为空）。
 *
 * @param {Object} opts
 * @param {string} opts.module          — 模块名：'workspace' | 'dashboard' | 'members' | 'archive' | 'search' | 'feedback'
 * @param {string} [opts.accentRole]    — 强调色角色键名（省略则不获取 accent 三件套）
 * @param {number[]} [opts.accentAlpha] — 自定义透明度 [bgAlpha, borderAlpha]
 *
 * @returns {Promise<{
 *   user: { personId: string, role: string } | null,
 *   accent: string|undefined,
 *   accentRgba: string|undefined,
 *   accentBorder: string|undefined
 * }>}
 */
export async function bootstrapPage({ module, accentRole, accentAlpha }) {
  // 代码数据版本自检（2026-08-01 引入，配合 cross-page-state 的 CODE_VERSION）：
  // 旧 tab 持有旧 ES 模块时自动刷新一次加载新模块。必须放在最顶部（API 恢复/init 之前），
  // 否则部署后首次访问会 init 两遍（旧模块 + reload 后新模块各 10 个 fetch，P1 审查 M6）。
  if (CrossPageState.isStaleCodeVersion()) {
    CrossPageState.bumpDataVersion();
    window.location.reload();
    return { user: null };
  }

  // 恢复 API 数据源：已登录且存在 token 时切换到后端（认证由 api-adapter 读取 authToken）
  // registerApiAdapter 幂等（重复注册仅覆盖同一实例），与 runtime.js 的注册不冲突
  registerApiAdapter(ApiAdapter);
  const savedToken = sessionStorage.getItem('gsm1921-api-token');
  if (savedToken) {
    setDataSource('api', { apiBaseUrl: '', authToken: savedToken });
    try {
      await init(); // 从后端拉取全量数据填充 mockDB（读路径）
    } catch (e) {
      console.warn('[bootstrap] API 数据加载失败，回退本地 mock 模式', e);
      setDataSource('mock'); // 服务器不可达→完整回退本地模式，后续流程照常走 loadDB
    }
  }

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
    const base = window.location.pathname.includes('/workspace/')
      ? '../' : './';
    window.location.href = base + 'login.html';
    return { user: null };
  }

  // 字体二档调节：读取 localStorage 偏好并应用
  const savedFontSize = localStorage.getItem('workflowos_font_size') || 'medium';
  if (savedFontSize === 'large') {
    document.documentElement.classList.add('font-size-large');
  }

  // 页面身份校验（书记 2026-08-07 指令：右上角"身份"必须与当前工作台页面匹配）
  // 根因：header 直接读登录快照 user.role，未与当前页面做任何校验；同一服务器下跳转
  // workspace 时会出现"身份标签与页面错位"。修复：计算该用户"允许访问的工作台页面集合"
  // （登录快照角色页面 + 内存判定角色页面），当前页面不在集合内时自动跳转到身份对应页面。
  if (module === 'workspace' && user) {
    const currentPage = window.location.pathname.split('/').pop();
    const allowedPages = new Set();
    // 1. 登录快照身份对应工作台（header 身份标签同源：右上角显示什么身份，就该落在什么工作台）
    const snapPage = AuthStore.getPageForRole('workspace', user.role);
    if (snapPage) allowedPages.add(snapPage);
    // 2. 内存判定角色对应工作台（赋权记录优先于 mock：如登录后被赋权为党小组组长，
    //    允许其合法访问组长工作台——header 切换工作台下拉的 1b 项同款场景）
    const memPage = AuthStore.getPageForRole('workspace', AuthStore.getUserRole(user.personId));
    if (memPage) allowedPages.add(memPage);

    if (!allowedPages.has(currentPage)) {
      // 跳转目标：以登录快照身份为准（与身份标签一致）；缺失时回退内存判定角色页面
      const target = snapPage || memPage || 'visitor.html';
      // 基于当前 pathname 计算目标目录，避免依赖 <base> 的解析差异
      const dir = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
      window.location.href = dir + target;
      return { user: null };
    }
  }

  // 渲染侧边栏 + 顶栏
  renderSidebar(module);
  renderHeader(module);

  // 强调色（主题色个性化：resolveAccentRole 优先读侧边栏「主题色」设置）
  let accent, accentRgba, accentBorder;
  if (accentRole) {
    const effRole = resolveAccentRole(accentRole);
    if (accentAlpha) {
      ({ accent, accentRgba, accentBorder } = getAccentColors(effRole, accentAlpha[0], accentAlpha[1]));
    } else {
      ({ accent, accentRgba, accentBorder } = getAccentColors(effRole));
    }
    // 全局主题色变量（--app-accent 三件套）：cs-menu 选中项 / chips 选中态等
    // 「统一主题色渲染」跟随当前用户主题色（书记 2026-08-08 三审定稿，弃用金实底）
    const root = document.documentElement;
    root.style.setProperty('--app-accent', accent);
    root.style.setProperty('--app-accent-bg', accentRgba);
    root.style.setProperty('--app-accent-border', accentBorder);
  }

  // 统一预加载所有 Service（并行，不阻塞渲染但保证后续同步调用有数据）
  // 修复跨页面数据不同步：之前 ws-secretary-entry 同步调用 IssueStore.getAll() 拿到空数组
  try {
    await Promise.all([
      IssueStore.loadAll(),
      MilestoneStore.loadAll(),
    ]);
  } catch (e) {
    console.warn('[bootstrap] Service 预加载失败：', e);
  }

  return { user, accent, accentRgba, accentBorder };
}
