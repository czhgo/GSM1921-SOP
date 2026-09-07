﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿// role: [工程师]+[AI]
// components/sidebar.js — 共享侧边栏（角色单页制 v2）
// 2026-07-29: 角色单页制重构——合并党建/党务为"工作台"单入口
// - 移除 '党务管理' / '人员管理' 独立入口
// - '党建工作台' → '工作台'（角色自适应跳转）
// - 帮助/关于移入主导航区

import { getBasePath } from '../core/utils.js?v=20260903c';
import { icon } from '../core/icons.js?v=20260903c';
import { ACCENT_COLORS, ACCENT_PALETTE, resolveAccentRole } from '../core/constants.js?v=20260903c';
import { getThemePreference, setThemePreference, initTheme } from '../core/theme.js?v=20260903c';
import { readLoginSnapshot } from '../core/login-snapshot.js?v=20260903c';
import { DEPLOY_MODE } from '../config/deploy.js?v=20260903c';

// ── 数据层按需加载（静态页隔离，2026-08-12）──
// about/help 等纯静态文档页以 staticShell 渲染侧边栏：不预加载 auth 数据链
// （auth→runtime→mock→domain 全量约 50 模块）。但登录态感知——已登录用户
// （从 app 页跳转过来）需看到完整壳（工作台入口/退出登录/身份主题色），
// 通过 readLoginSnapshot() 轻量读快照判断，确已登录才动态加载 auth 完善壳。
// 动态 import 沿用与原静态 import 相同的版本号 → 与全站其他引用共享同一模块实例。
let AuthStore = null;
let _authModule = null;
function loadAuth() {
  if (!_authModule) _authModule = import('../services/auth.js?v=20260903c');
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
  return items;
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
      ${icon(item.module === 'help' ? 'book' : 'info', { stroke: 'var(--neutral-400)' })}
      <span>${item.label}</span>
    </a>
  `).join('');

  // 主题色：当前生效强调色（个性化覆盖优先；色板 hex 优先——金主题色色块显示亮金 #FFD700）
  const effAccentKey = resolveAccentRole(role);
  const effAccentHex = ACCENT_PALETTE.find(c => c.key === effAccentKey)?.hex || ACCENT_COLORS[effAccentKey]?.hex || '#B91C1C';
  const effAccentLabel = ACCENT_PALETTE.find(c => c.key === effAccentKey)?.label || '红';

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
      <div class="sidebar-font-size-toggle">
        <span style="font-size:0.65rem;color:var(--neutral-400);">字号</span>
        <button id="font-size-medium" class="font-size-btn ${_currentFontSize() === 'medium' ? 'active' : ''}" title="中号字体">中</button>
        <button id="font-size-large" class="font-size-btn ${_currentFontSize() === 'large' ? 'active' : ''}" title="大号字体">大</button>
      </div>
      <div class="sidebar-theme-toggle" title="主题设置">
        <span style="font-size:0.65rem;color:var(--neutral-400);">主题</span>
        <button id="theme-light" class="theme-btn ${_currentTheme() === 'light' ? 'active' : ''}" title="浅色模式">${icon('sun', { className: 'w-3 h-3' })}</button>
        <button id="theme-system" class="theme-btn ${_currentTheme() === 'system' ? 'active' : ''}" title="跟随系统">${icon('monitor', { className: 'w-3 h-3' })}</button>
        <button id="theme-dark" class="theme-btn ${_currentTheme() === 'dark' ? 'active' : ''}" title="深色模式">${icon('moon', { className: 'w-3 h-3' })}</button>
        <button id="sidebar-accent-swatch" class="accent-swatch ml-auto" style="background:${effAccentHex}" data-label="主题：${effAccentLabel}" title="主题：${effAccentLabel}（点击更换）"></button>
      </div>
      ${authEntryHTML}
    </div>
  `;

  if (user) _bindLogout(sidebar);
  _bindFontSizeToggle(sidebar);
  _bindThemeToggle(sidebar);
  _bindAccentToggle(sidebar);
}

function _currentTheme() {
  return getThemePreference();
}

function _bindThemeToggle(sidebar) {
  // 初始化一次（含 matchMedia 监听）；渲染 sidebar 时再强制应用，保证当前态一致
  initTheme();
  const btns = {
    light: sidebar.querySelector('#theme-light'),
    system: sidebar.querySelector('#theme-system'),
    dark: sidebar.querySelector('#theme-dark'),
  };
  if (!btns.light || !btns.system || !btns.dark) return;

  const apply = (mode) => {
    setThemePreference(mode);
    Object.entries(btns).forEach(([key, el]) => {
      el.classList.toggle('active', key === mode);
    });
  };

  btns.light.addEventListener('click', () => apply('light'));
  btns.system.addEventListener('click', () => apply('system'));
  btns.dark.addEventListener('click', () => apply('dark'));
}

function _bindLogout(sidebar) {
  const btn = sidebar.querySelector('#sidebar-logout');
  if (!btn) return;
  btn.addEventListener('click', () => {
    AuthStore.logout();
    window.location.href = getBasePath() + 'login.html';
  });
}

function _currentFontSize() {
  return localStorage.getItem('workflowos_font_size') || 'medium';
}

function _bindFontSizeToggle(sidebar) {
  const btnMedium = sidebar.querySelector('#font-size-medium');
  const btnLarge = sidebar.querySelector('#font-size-large');
  if (!btnMedium || !btnLarge) return;

  const apply = (size) => {
    localStorage.setItem('workflowos_font_size', size);
    if (size === 'large') {
      document.documentElement.classList.add('font-size-large');
    } else {
      document.documentElement.classList.remove('font-size-large');
    }
    btnMedium.classList.toggle('active', size === 'medium');
    btnLarge.classList.toggle('active', size === 'large');
  };

  btnMedium.addEventListener('click', () => apply('medium'));
  btnLarge.addEventListener('click', () => apply('large'));
}

// ── 主题色切换（书记指令 2026-08-06：侧边栏设置，全站强调色个性化）──
function _currentAccentKey() {
  // 访客壳/静态页：AuthStore 未加载 → 默认角色强调色
  if (!AuthStore) return resolveAccentRole('');
  const user = AuthStore.getCurrentUser();
  const role = user ? AuthStore.getUserRole(user.personId) : '';
  return resolveAccentRole(role);
}

function _bindAccentToggle(sidebar) {
  const swatch = sidebar.querySelector('#sidebar-accent-swatch');
  if (!swatch) return;
  swatch.addEventListener('click', (e) => {
    e.stopPropagation();
    _toggleAccentPalette(swatch);
  });
}

function _toggleAccentPalette(swatch) {
  const existing = document.getElementById('accent-palette-popover');
  if (existing) { existing.remove(); return; }

  const currentKey = _currentAccentKey();
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

  // 定位（fixed，基于 swatch 位置，避免被侧边栏 overflow 裁剪）：
  // 默认向下展开；下方空间不足时向上翻转（与下拉菜单同一套智能定位逻辑）
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

  // 选择 → 写入 localStorage + 刷新全站生效
  popover.querySelectorAll('.accent-swatch-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      localStorage.setItem('workflowos_accent_role', btn.dataset.key);
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
