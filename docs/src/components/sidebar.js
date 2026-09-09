﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿// role: [工程师]+[AI]
// components/sidebar.js — 共享侧边栏（角色单页制 v2）
// 2026-07-29: 角色单页制重构——合并党建/党务为"工作台"单入口
// - 移除 '党务管理' / '人员管理' 独立入口
// - '党建工作台' → '工作台'（角色自适应跳转）
// - 帮助/关于移入主导航区
// 2026-09-09（设置中心批1）：footer 增「设置」入口（→ settings.html）；
// 原 footer 三块外观控件（字号/主题三态/强调色）迁往设置页外观区（components/appearance-controls.js，
// 键位语义不变）；外观偏好读写改走 core/theme.js 键空间适配层（登录人 person 键 / 访客全局键）。
// 模块顶层调用 syncAppearanceForActiveUser()：每页壳加载即把当前登录人 person 偏好应用到 DOM
// （R1-A 2026-09-09 书记裁决：不写全局键、person 无键=出厂默认不继承；冻结读取点
// theme-init.js 首帧 / bootstrap.js 字号 / constants.js resolveAccentRole 保持全局键语义不改）。

import { getBasePath } from '../core/utils.js?v=20260909e';
import { icon } from '../core/icons.js?v=20260909e';
import { syncAppearanceForActiveUser } from '../core/theme.js?v=20260909e';
import { readLoginSnapshot } from '../core/login-snapshot.js?v=20260909e';
import { DEPLOY_MODE } from '../config/deploy.js?v=20260909e';

// 外观键空间适配：页面壳加载即执行（全站每页均渲染 sidebar，天然覆盖公共页/工作台）
syncAppearanceForActiveUser();

// ── 数据层按需加载（静态页隔离，2026-08-12）──
// about/help 等纯静态文档页以 staticShell 渲染侧边栏：不预加载 auth 数据链
// （auth→runtime→mock→domain 全量约 50 模块）。但登录态感知——已登录用户
// （从 app 页跳转过来）需看到完整壳（工作台入口/退出登录/身份主题色），
// 通过 readLoginSnapshot() 轻量读快照判断，确已登录才动态加载 auth 完善壳。
// 动态 import 沿用与原静态 import 相同的版本号 → 与全站其他引用共享同一模块实例。
let AuthStore = null;
let _authModule = null;
function loadAuth() {
  if (!_authModule) _authModule = import('../services/auth.js?v=20260909e');
  return _authModule;
}

// ── 党委视图全局导航收敛（书记立项⑦ A波，2026-09-06）────────────
// 产品口径：party-staff（党委组织员/党务老师）视图 = 全局治理面，不含支部运行功能入口
// （首页/资料查询/意见反馈/归档库等支部数据浏览页）；仅保留治理/必要项——「工作台」按
// ROLE_PAGE_MAP 直达 party-committee.html 党委工作台。判定依据：party-staff 登录直达
// 党委工作台（login-entry），首页 dashboard 无其治理内容（均为支部运行区块），非落点必需。
// 支部层各角色（书记/副书记/三委员/组长/成员）导航行为不变。
const PARTY_STAFF_HIDDEN_NAV = new Set(['dashboard', 'search', 'feedback', 'archive']);

function getNavItems() {
  const base = getBasePath();
  return [
    { module: 'dashboard', label: '首页', href: base + 'index.html', icon: icon('home') },
    { module: 'workspace', label: '工作台', icon: icon('calendar') },
    { module: 'search', label: '资料查询', href: base + 'search.html', icon: icon('search') },
    { module: 'feedback', label: '意见反馈', href: base + 'feedback.html', icon: icon('message') },
    { module: 'archive', label: '归档库', href: base + 'archive.html', icon: icon('archive') },
  ];
}

function getFooterItems() {
  const base = getBasePath();
  const items = [
    { module: 'help', label: '帮助', href: base + 'help.html', icon: icon('book') },
  ];
  // 「关于」仅在静态托管（GitHub Pages）显示——有后端（内部工具）无公开门面
  // 依据 content/04_web_design/deploy/AUTHENTICATION_MODEL.md §三
  if (DEPLOY_MODE === 'static') {
    items.push({ module: 'about', label: '关于', href: base + 'about.html', icon: icon('info') });
  }
  // 「设置」入口（设置中心批1，2026-09-09）：全形态可见——访客进设置页仅外观，登录人按角色分组
  items.push({ module: 'settings', label: '设置', href: base + 'settings.html', icon: icon('gear') });
  return items;
}

// footer 图标按模块取（stroke 随 footer 弱化色；设置=齿轮）
function _footerIcon(module) {
  const name = module === 'help' ? 'book' : module === 'settings' ? 'gear' : 'info';
  return icon(name, { stroke: 'var(--neutral-400)' });
}

export async function renderSidebar(activeModule, opts = {}) {
  const sidebar = document.getElementById('app-sidebar');
  if (!sidebar) return;

  const staticShell = !!opts.staticShell;

  // 登录态感知壳：静态页轻量读快照（零依赖）——已登录才动态加载 auth 完善壳；
  // app 模式按需加载 auth 后按当前用户渲染（模块缓存后即时）
  if (staticShell) {
    if (readLoginSnapshot()) {
      try {
        ({ AuthStore } = await loadAuth());
      } catch (e) {
        console.warn('[sidebar] auth 加载失败，降级为访客壳', e);
      }
    }
  } else {
    try {
      ({ AuthStore } = await loadAuth());
    } catch (e) {
      console.warn('[sidebar] auth 加载失败，降级为访客壳', e);
    }
  }
  const user = AuthStore ? AuthStore.getCurrentUser() : null;
  // 使用常设角色（非 effective role）决定导航结构
  const role = user ? AuthStore.getUserRole(user.personId) : '';

  // party-staff（党委视图）隐藏支部运行导航项（PARTY_STAFF_HIDDEN_NAV）；
  // 其余角色 / 访客不过滤，导航行为与既往完全一致
  const navItems = getNavItems().filter(item => !(role === 'party-staff' && PARTY_STAFF_HIDDEN_NAV.has(item.module)));
  const navHTML = navItems.map(item => {
    // 工作台：根据角色自动跳转对应页面
    let href = item.href;
    if (item.module === 'workspace') {
      const pages = user ? AuthStore.getAccessibleWorkspacePages(user.personId) : [];
      if (pages.length === 0) return '';
      const standingPage = AuthStore.getPageForRole('workspace', role);
      if (!standingPage) return '';
      href = getBasePath() + 'workspace/' + standingPage;
      // 2026-09-03 清理余毒：多身份"选择进入身份"弹窗冗余——项目角色(组织者/深参与)
      // 内容已归首页「我的角色」区块，身份切换走 header 下拉；sidebar 工作台一律直达常设工作台。
      // （原 data-workspace-popover 触发 + workspace-popover.js 已删除）
    }

    return `
      <a href="${href}" class="module-tab ${item.module === activeModule ? 'active' : ''}" data-module="${item.module}">
        ${item.icon}
        <span class="font-title-cn">${item.label}</span>
      </a>
    `;
  }).join('');

  const footerItems = getFooterItems();
  const footerHTML = footerItems.map(item => `
    <a href="${item.href}" data-module="${item.module}" style="display:flex;align-items:center;gap:6px;padding:4px 8px;font-size:0.7rem;color:var(--neutral-400);text-decoration:none;border:none;">
      ${_footerIcon(item.module)}
      <span>${item.label}</span>
    </a>
  `).join('');

  // 登录态对偶入口（书记 2026-09-07 U1 批准）：已登录=「退出登录」；访客/未登录=「登录」→ login.html
  // （同位同样式同 hover；图标为 logout 镜像 → 「进入」感，不新增图标字典项）
  const authEntryHTML = user ? `
      <button id="sidebar-logout" style="display:flex;align-items:center;gap:6px;padding:4px 8px;font-size:0.7rem;color:var(--neutral-400);cursor:pointer;border:none;background:none;">
        ${icon('logout', { stroke: 'var(--neutral-400)' })}
        <span>退出登录</span>
      </button>` : `
      <a href="${getBasePath()}login.html" id="sidebar-login" style="display:flex;align-items:center;gap:6px;padding:4px 8px;font-size:0.7rem;color:var(--neutral-400);cursor:pointer;border:none;background:none;text-decoration:none;">
        <span style="display:inline-block;transform:scaleX(-1);">${icon('logout', { stroke: 'var(--neutral-400)' })}</span>
        <span>登录</span>
      </a>`;

  sidebar.innerHTML = `
    <nav class="sidebar-nav">
      <div class="flex flex-col gap-2 mb-2">${navHTML}</div>
    </nav>
    <div class="sidebar-footer">
      <div class="flex flex-col gap-0.5 mb-2">${footerHTML}</div>
      ${authEntryHTML}
    </div>
  `;

  if (user) _bindLogout(sidebar);
}

// 外观控件（字号/主题三态/强调色）已迁往设置页外观区：
// components/appearance-controls.js（render+bind 复用，2026-09-09 设置中心批1）

function _bindLogout(sidebar) {
  const btn = sidebar.querySelector('#sidebar-logout');
  if (!btn) return;
  btn.addEventListener('click', () => {
    AuthStore.logout();
    window.location.href = getBasePath() + 'login.html';
  });
}
