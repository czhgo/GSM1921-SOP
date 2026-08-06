// role: [工程师]+[AI]
// components/sidebar.js — 共享侧边栏（角色单页制 v2）
// 2026-07-29: 角色单页制重构——合并党建/党务为"工作台"单入口
// - 移除 '党务管理' / '人员管理' 独立入口
// - '党建工作台' → '工作台'（角色自适应跳转）
// - 帮助/关于移入主导航区

import { AuthStore } from '../services/auth.js';
import { getBasePath } from '../core/utils.js';
import { icon } from '../core/icons.js';
import { ACCENT_COLORS, ACCENT_PALETTE, resolveAccentRole } from '../core/constants.js';
import { bindWorkspacePopover } from './workspace-popover.js';

// 记录当前 activeModule，供 view-role-change 事件触发 re-render 使用
let _lastActiveModule = null;

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
  return [
    { module: 'help', label: '帮助', href: base + 'help.html', icon: icon('book') },
    { module: 'about', label: '关于', href: base + 'about.html', icon: icon('info') },
  ];
}

export function renderSidebar(activeModule) {
  _lastActiveModule = activeModule;
  const sidebar = document.getElementById('app-sidebar');
  if (!sidebar) return;

  const user = AuthStore.getCurrentUser();
  // 使用常设角色（非 effective role）决定导航结构
  const role = user ? AuthStore.getUserRole(user.personId) : '';

  const navItems = getNavItems();
  const navHTML = navItems.map(item => {
    // 工作台：根据角色自动跳转对应页面
    let href = item.href;
    let extraAttrs = '';
    if (item.module === 'workspace') {
      const pages = user ? AuthStore.getAccessibleWorkspacePages(user.personId) : [];
      if (pages.length === 0) return '';
      const standingPage = AuthStore.getPageForRole('workspace', role);
      if (!standingPage) return '';
      href = getBasePath() + 'workspace/' + standingPage;
      // 多身份时加 popover 标记
      if (pages.length > 1) {
        extraAttrs = ' data-workspace-popover="1"';
      }
    }

    return `
      <a href="${href}" class="module-tab ${item.module === activeModule ? 'active' : ''}" data-module="${item.module}"${extraAttrs}>
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

  // 主题色：当前生效强调色（个性化覆盖优先）
  const effAccentKey = resolveAccentRole(role);
  const effAccentHex = ACCENT_COLORS[effAccentKey]?.hex || '#B91C1C';

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
      <div class="sidebar-accent-toggle">
        <span style="font-size:0.65rem;color:var(--neutral-400);">主题色</span>
        <button id="sidebar-accent-swatch" class="accent-swatch" style="background:${effAccentHex}" title="主题色（全站强调色）"></button>
      </div>
      <button id="sidebar-logout" style="display:flex;align-items:center;gap:6px;padding:4px 8px;font-size:0.7rem;color:var(--neutral-400);cursor:pointer;border:none;background:none;">
        ${icon('logout', { stroke: 'var(--neutral-400)' })}
        <span>退出登录</span>
      </button>
    </div>
  `;

  _bindLogout(sidebar);
  _bindFontSizeToggle(sidebar);
  _bindAccentToggle(sidebar);
  bindWorkspacePopover(sidebar);
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
    <div class="accent-palette-title">主题色 · 全站强调色</div>
    <div class="accent-palette-grid">
      ${ACCENT_PALETTE.map(c => `
        <button type="button" class="accent-swatch-opt ${c.key === currentKey ? 'active' : ''}" data-key="${c.key}" title="${c.label}" style="background:${c.hex}"></button>
      `).join('')}
    </div>
    <div class="accent-palette-names">
      ${ACCENT_PALETTE.map(c => `<span class="${c.key === currentKey ? 'active' : ''}" data-name-for="${c.key}">${c.label}</span>`).join('')}
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

// ── 订阅 view-role-change 事件，重新渲染链接（不 reload） ───
document.addEventListener('view-role-change', () => {
  if (_lastActiveModule !== null) {
    renderSidebar(_lastActiveModule);
  }
});
