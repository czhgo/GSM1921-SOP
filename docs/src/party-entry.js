// role: [人机]
// party-entry.js — 党务管理独立入口
import { getAppState, setState } from './state.js';
import { PartyModule } from './party.js';
import { CrossPageState } from './cross-page-state.js';
import { renderSidebar } from './components/sidebar.js';
import { renderHeader } from './components/header.js';

renderSidebar('party');
renderHeader('party');

const savedState = CrossPageState.load();
const roleToTab = {
  'org-commissioner': 'organizer',
  'prop-commissioner': 'publicity',
  'disc-commissioner': 'inspector',
  'secretary': 'secretary',
};

if (savedState.selectedRole && roleToTab[savedState.selectedRole]) {
  const tab = document.querySelector(`.commissioner-tab[data-commissioner="${roleToTab[savedState.selectedRole]}"]`);
  if (tab) {
    document.querySelectorAll('.commissioner-tab[data-commissioner]').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.commissioner-panel').forEach(p => p.classList.add('hidden'));
    const target = document.getElementById(`panel-${tab.dataset.commissioner}`);
    if (target) target.classList.remove('hidden');
  }
}

document.addEventListener('sidebar:role-select', (e) => {
  const { role, mode } = e.detail;
  const tab = roleToTab[role];
  if (tab) {
    document.querySelectorAll('.commissioner-tab[data-commissioner]').forEach(t => t.classList.remove('active'));
    const target = document.querySelector(`.commissioner-tab[data-commissioner="${tab}"]`);
    if (target) target.classList.add('active');
    document.querySelectorAll('.commissioner-panel').forEach(p => p.classList.add('hidden'));
    const panel = document.getElementById(`panel-${tab}`);
    if (panel) panel.classList.remove('hidden');
    PartyModule.loadAll();
    PartyModule.renderCommissionerPanel();
  }
  CrossPageState.save({ selectedRole: role, activeModule: 'party' });
});

document.addEventListener('sidebar:role-restore', (e) => {
  const { role, mode } = e.detail;
  if (e.detail.module !== 'party') return;
  const tab = roleToTab[role];
  if (tab) {
    document.querySelectorAll('.commissioner-tab[data-commissioner]').forEach(t => t.classList.remove('active'));
    const target = document.querySelector(`.commissioner-tab[data-commissioner="${tab}"]`);
    if (target) target.classList.add('active');
    document.querySelectorAll('.commissioner-panel').forEach(p => p.classList.add('hidden'));
    const panel = document.getElementById(`panel-${tab}`);
    if (panel) panel.classList.remove('hidden');
  }
});

document.addEventListener('view:mode-change', (e) => {
  if (e.detail.module === 'party') {
    PartyModule.renderCommissionerPanel();
  }
});

document.querySelectorAll('.commissioner-tab[data-commissioner]').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.commissioner-tab[data-commissioner]').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.commissioner-panel').forEach(p => p.classList.add('hidden'));
    const target = document.getElementById(`panel-${tab.dataset.commissioner}`);
    if (target) target.classList.remove('hidden');
    PartyModule.renderCommissionerPanel();
  });
});

document.querySelectorAll('.commissioner-tab[data-subtab]').forEach(tab => {
  tab.addEventListener('click', () => {
    const parent = tab.closest('.commissioner-panel');
    if (!parent) return;
    parent.querySelectorAll('.commissioner-tab[data-subtab]').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    parent.querySelectorAll('.commissioner-subtab-content').forEach(c => c.classList.remove('active'));
    const target = parent.querySelector(`[data-subtab-content="${tab.dataset.subtab}"]`);
    if (target) target.classList.add('active');
  });
});

document.getElementById('btn-party-refresh')?.addEventListener('click', () => {
  PartyModule.refresh();
});

document.querySelectorAll('.sec-proxy-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sec-proxy-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const proxy = btn.dataset.proxy;
    const label = btn.textContent;
    const current = document.getElementById('sec-proxy-current');
    if (current) current.textContent = `当前：${label}视角`;
    if (proxy !== 'self') {
      CrossPageState.navigateTo('./workspace.html', { selectedRole: proxy, activeModule: 'workspace' });
    }
  });
});

document.getElementById('btn-batch-remind')?.addEventListener('click', () => {
  const msg = document.getElementById('batch-op-msg');
  if (msg) { msg.textContent = '已发送催缴提醒'; msg.classList.remove('hidden'); setTimeout(() => msg.classList.add('hidden'), 3000); }
});

document.getElementById('btn-batch-archive')?.addEventListener('click', () => {
  const msg = document.getElementById('batch-op-msg');
  if (msg) { msg.textContent = '已标记历史活动为待归档'; msg.classList.remove('hidden'); setTimeout(() => msg.classList.add('hidden'), 3000); }
});

document.getElementById('btn-batch-export')?.addEventListener('click', () => {
  const msg = document.getElementById('batch-op-msg');
  if (msg) { msg.textContent = '已导出 CSV 文件'; msg.classList.remove('hidden'); setTimeout(() => msg.classList.add('hidden'), 3000); }
});

PartyModule.renderCommissionerPanel();
