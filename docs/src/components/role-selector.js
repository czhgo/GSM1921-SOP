// role: [人机]
// components/role-selector.js — 角色选择面板
// 点击侧边栏"党建工作台"/"党务管理"时弹出，替代直接跳转
// D-12 决策：按角色拆分，侧边栏不变

import { CrossPageState } from '../core/cross-page-state.js';
import { getBasePath } from '../core/utils.js';

const MODULE_META = {
  workspace: {
    title: '党建工作台',
    subtitle: '选择身份视图',
    accent: 'var(--primary-700)',
    roles: [
      { role: 'secretary', label: '党支部书记', desc: '组织统筹·赋权管理·全局决策', page: 'workspace/secretary.html', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>' },
      { role: 'org-commissioner', label: '组织委员', desc: '专班建设·招募统筹·定人定责定岗', page: 'workspace/org.html', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>' },
      { role: 'prop-commissioner', label: '宣传委员', desc: '活动与专班视图·宣传材料·周报', page: 'workspace/prop.html', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>' },
      { role: 'disc-commissioner', label: '纪检委员', desc: '考勤管理·考察管理·活动监督复盘', page: 'workspace/disc.html', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' },
      { role: 'leader', label: '党小组组长', desc: '活动写入·考勤上传·考察上传', page: 'workspace/leader.html', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>' },
      { role: 'organizer', label: '组织者', desc: '分工记录·复盘提交·考察查看', page: 'workspace/organizer.html', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>' },
      { role: 'deep', label: '深度参与者', desc: '承担具体分工·任务状态更新', page: 'workspace/deep.html', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/></svg>' },
    ],
  },
  party: {
    title: '党务管理',
    subtitle: '选择要查看的身份视图',
    accent: 'var(--primary-700)',
    roles: [
      { role: 'secretary', label: '党支部书记', desc: '批量操作·意见反馈·全局统筹', page: 'party/secretary.html', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>' },
      { role: 'org-commissioner', label: '组织委员', desc: '追踪看板·材料催缴·思想汇报·合规文件', page: 'party/org.html', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>' },
      { role: 'prop-commissioner', label: '宣传委员', desc: '活动日历·档案归档·材料标准·周报报送', page: 'party/prop.html', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>' },
      { role: 'disc-commissioner', label: '纪检委员', desc: '补课制度·公邮管理', page: 'party/disc.html', icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' },
    ],
  },
};

let _panelEl = null;

function _ensurePanel() {
  if (_panelEl) return _panelEl;

  _panelEl = document.createElement('div');
  _panelEl.id = 'role-selector-panel';
  _panelEl.style.cssText = 'position:fixed;inset:0;z-index:200;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);';
  document.body.appendChild(_panelEl);
  return _panelEl;
}

export function showRoleSelector(module) {
  const meta = MODULE_META[module];
  if (!meta) return;

  const panel = _ensurePanel();

  const base = getBasePath();
  const cardsHTML = meta.roles.map(r => `
    <button class="role-selector-card" data-role="${r.role}" data-page="${base + r.page}"
            style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:12px;border:1.5px solid #E5E7EB;background:white;cursor:pointer;transition:all 0.15s;text-align:left;width:100%;"
            onmouseover="this.style.borderColor='${meta.accent}';this.style.boxShadow='0 4px 12px rgba(122,0,16,0.1)';this.style.transform='translateY(-1px)'"
            onmouseout="this.style.borderColor='#E5E7EB';this.style.boxShadow='none';this.style.transform='none'">
      <div style="width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:linear-gradient(135deg,${meta.accent}15,${meta.accent}08);color:${meta.accent};">
        ${r.icon}
      </div>
      <div style="flex:1;min-width:0;">
        <p style="font-size:0.875rem;font-weight:600;color:#1F2937;margin:0;line-height:1.3;">${r.label}</p>
        <p style="font-size:0.75rem;color:#6B7280;margin:2px 0 0;line-height:1.4;">${r.desc}</p>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><polyline points="9 18 15 12 9 6"/></svg>
    </button>
  `).join('');

  panel.innerHTML = `
    <div style="background:white;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.15);max-width:420px;width:calc(100% - 32px);max-height:80vh;overflow:hidden;display:flex;flex-direction:column;">
      <div style="padding:20px 24px 16px;border-bottom:1px solid #F3F4F6;">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div>
            <h3 style="font-size:1.125rem;font-weight:700;color:#1F2937;margin:0;">${meta.title}</h3>
            <p style="font-size:0.8rem;color:#6B7280;margin:4px 0 0;">${meta.subtitle}</p>
          </div>
          <button id="role-selector-close" style="width:32px;height:32px;border-radius:8px;border:none;background:#F3F4F6;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.15s;" onmouseover="this.style.background='#E5E7EB'" onmouseout="this.style.background='#F3F4F6'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      <div style="padding:16px 24px 24px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;">
        ${cardsHTML}
      </div>
    </div>
  `;

  panel.style.display = 'flex';

  panel.querySelector('#role-selector-close').addEventListener('click', () => {
    panel.style.display = 'none';
  });

  panel.addEventListener('click', (e) => {
    if (e.target === panel) panel.style.display = 'none';
  });

  panel.querySelectorAll('.role-selector-card').forEach(card => {
    card.addEventListener('click', () => {
      const role = card.dataset.role;
      const page = card.dataset.page;
      panel.style.display = 'none';
      // 首次进入时站位=视图（选择身份视图即同时设定站位）
      CrossPageState.save({
        selectedRole: role,
        activeModule: module,
        stance: role,
      });
      CrossPageState.navigateTo(page, { selectedRole: role, activeModule: module, stance: role });
    });
  });

  const escHandler = (e) => {
    if (e.key === 'Escape') {
      panel.style.display = 'none';
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

export function interceptSidebarNavigation() {
  document.querySelectorAll('.module-tab[data-module="workspace"], .module-tab[data-module="party"]').forEach(tab => {
    const href = tab.getAttribute('href');
    if (!href) return;

    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const module = tab.dataset.module;
      showRoleSelector(module);
    });
  });
}
