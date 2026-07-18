// role: [工程师]+[AI]
// party-cross-nav.js — 党务管理跨支委导航栏
// 设计: 书记/副书记可查看所有支委页面（编辑模式）
//       其他支委可查看其他支委页面（只读模式）
// 详见: T-2026-07-006 第5轮·四·A2 决策

import { AuthStore } from '../services/auth.js';
import { getBasePath, showToast } from '../core/utils.js';
import { getAccentColors } from '../core/constants.js';
import { icon } from '../core/icons.js';

// party 页面配置：role → { page, label }
// 颜色不再硬编码，统一走 getAccentColors(role) 取色（spec §7.3.2 一改具改）
const PARTY_PAGES = {
  'secretary':         { page: 'secretary.html', label: '党支书' },
  'deputy-secretary':  { page: 'secretary.html', label: '副书记' },
  'org-commissioner':  { page: 'org.html',        label: '组织委员' },
  'prop-commissioner': { page: 'prop.html',       label: '宣传委员' },
  'disc-commissioner': { page: 'disc.html',       label: '纪检委员' },
};

// 支委顺序（Tab 栏从左到右）
const COMMISSIONER_ORDER = [
  'secretary',         // 含副书记（同页面）
  'org-commissioner',
  'prop-commissioner',
  'disc-commissioner',
];

/**
 * 渲染跨支委导航栏
 * @param {string} currentPageRole - 当前页面所属的支委角色
 * @param {HTMLElement} mountEl - 挂载点
 */
export function renderPartyCrossNav(currentPageRole, mountEl) {
  if (!mountEl) return;

  const user = AuthStore.getCurrentUser();
  if (!user) return;

  const userRole = AuthStore.getUserRole(user.personId);
  const viewRole = AuthStore.getViewRole();
  const effectiveRole = viewRole || userRole;

  // 非支委角色不渲染跨支委导航
  const isCommissioner = ['secretary', 'deputy-secretary', 'org-commissioner', 'prop-commissioner', 'disc-commissioner'].includes(userRole);
  if (!isCommissioner) {
    mountEl.innerHTML = '';
    return;
  }

  // 当前编辑角色：用户实际角色或只读视角
  // 当前页面角色：currentPageRole（如 'secretary'、'org-commissioner' 等）
  // 是否只读：当前页面角色 vs 用户实际角色（书记/副书记特殊处理）
  const isSecretaryOrDeputy = (userRole === 'secretary' || userRole === 'deputy-secretary');
  const isEditingThisPage = isSecretaryOrDeputy
    ? (currentPageRole === 'secretary')  // 书记/副书记在 secretary.html 是编辑模式
    : (userRole === currentPageRole);

  // 书记/副书记在 secretary.html 显示一个合并 Tab（书记+副书记）
  // 其他支委 Tab 单独显示

  const tabs = COMMISSIONER_ORDER.map(role => {
    const cfg = PARTY_PAGES[role];
    if (!cfg) return null;

    // 当前用户角色对应的 Tab
    let isActive = false;
    let isReadOnly = false;

    if (role === 'secretary') {
      // secretary Tab 同时代表书记+副书记
      if (isSecretaryOrDeputy) {
        isActive = (currentPageRole === 'secretary');
        isReadOnly = false;
      } else {
        // 其他支委查看 secretary 页面
        isActive = (currentPageRole === 'secretary');
        isReadOnly = true;
      }
    } else {
      if (userRole === role) {
        isActive = (currentPageRole === role);
        isReadOnly = false;
      } else {
        isActive = (currentPageRole === role);
        isReadOnly = true;
      }
    }

    return { role, ...cfg, isActive, isReadOnly };
  }).filter(Boolean);

  // 渲染 Tab 栏
  let html = '<div class="party-cross-nav flex items-center gap-1.5 mb-4 pb-3 border-b border-gray-100 flex-wrap">';

  // 只读模式提示（显示当前查看的页面名称，让用户明确知道在看谁的页面）
  if (!isEditingThisPage) {
    const currentPageLabel = PARTY_PAGES[currentPageRole]?.label || '';
    html += `<span class="font-stheiti text-[10px] px-2 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 mr-2 inline-flex items-center gap-1">${icon('eye', { size: 10 })} 只读查看 · ${currentPageLabel}</span>`;
  }

  tabs.forEach(tab => {
    const activeCls = tab.isActive ? 'tab-btn-active' : '';
    const baseCls = 'party-nav-btn px-3 py-1.5 text-xs font-medium rounded-lg transition-colors font-stheiti';
    // 颜色统一从 getAccentColors 派生（spec §7.3.2 一改具改）
    const accent = getAccentColors(tab.role).accent;
    const style = tab.isActive
      ? `--tab-accent:${accent};--tab-accent-bg:${accent}1A;--tab-accent-border:${accent}40;`
      : 'color:#6B7280;background:rgba(156,163,175,0.06);border:1px solid rgba(156,163,175,0.20);';

    const readonlyMark = tab.isReadOnly ? ` <span class="inline-flex items-center opacity-70">${icon('eye', { size: 10 })}</span>` : '';
    html += `<button class="${baseCls} ${activeCls}" data-target-role="${tab.role}" style="${style}">${tab.label}${readonlyMark}</button>`;
  });

  html += '</div>';

  mountEl.innerHTML = html;

  // 绑定点击事件
  mountEl.querySelectorAll('.party-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetRole = btn.dataset.targetRole;
      if (!targetRole) return;

      const cfg = PARTY_PAGES[targetRole];
      if (!cfg) return;

      // 如果点击的是当前激活 Tab，不跳转
      if (targetRole === currentPageRole) return;

      // 切换只读视角
      if (targetRole === 'secretary') {
        // 书记/副书记访问 secretary 页面：清除只读视角（编辑模式）
        // 其他支委访问 secretary 页面：设置只读视角为 secretary
        if (userRole === 'secretary' || userRole === 'deputy-secretary') {
          AuthStore.clearView();
        } else {
          AuthStore.switchView('secretary');
        }
      } else {
        // 书记/副书记访问其他支委页面：清除只读视角（编辑模式）
        // 其他支委访问非自己支委页面：设置只读视角
        if (userRole === targetRole) {
          AuthStore.clearView();
        } else if (isSecretaryOrDeputy) {
          // 书记/副书记对所有 party 页面都是编辑模式
          AuthStore.clearView();
        } else {
          AuthStore.switchView(targetRole);
        }
      }

      // 判断跳转后的模式（只读/编辑）
      const willBeReadOnly = !isSecretaryOrDeputy && userRole !== targetRole;

      // 跳转反馈
      const msg = willBeReadOnly
        ? `正在以只读模式查看「」页面`
        : `正在跳转到「」页面`;
      showToast('info', msg);

      // 延迟跳转，让用户看到 toast
      setTimeout(() => {
        window.location.href = getBasePath() + 'party/' + cfg.page;
      }, 200);
    });
  });
}
