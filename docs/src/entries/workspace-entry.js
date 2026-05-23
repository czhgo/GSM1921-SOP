import { CrossPageState } from '../core/cross-page-state.js';
import { renderSidebar } from '../components/sidebar.js';
import { renderHeader } from '../components/header.js';
import { AuthStore, ViewModeStore } from '../services/auth.js';
import { getBasePath, showToast } from '../core/utils.js';
import { openFormModal, openModal, closeModal } from '../components/modal.js';

const ROLE_TO_PAGE = {
  secretary: 'secretary.html',
  leader: 'leader.html',
  organizer: 'organizer.html',
  deep: 'deep.html',
  'org-commissioner': 'org.html',
  'prop-commissioner': 'prop.html',
  'disc-commissioner': 'disc.html',
  visitor: 'visitor.html',
};

function _resolvePage(filename) {
  return getBasePath() + 'workspace/' + filename;
}

const ROLE_META = [
  { role: 'secretary', label: '党支部书记', desc: '日历·写入·赋权·数据后台', color: '#CE1126', file: 'secretary.html' },
  { role: 'leader', label: '党小组组长', desc: '活动写入·考勤上传·考察上传', color: '#3B82F6', file: 'leader.html' },
  { role: 'organizer', label: '组织者', desc: '分工记录·复盘提交·考察查看', color: '#8B5CF6', file: 'organizer.html' },
  { role: 'deep', label: '深度参与者', desc: '任务状态更新', color: '#6366F1', file: 'deep.html' },
  { role: 'org-commissioner', label: '组织委员', desc: '专班管理·追踪看板', color: '#3B82F6', file: 'org.html' },
  { role: 'prop-commissioner', label: '宣传委员', desc: '活动与专班·工作量·多维表格', color: '#10B981', file: 'prop.html' },
  { role: 'disc-commissioner', label: '纪检委员', desc: '考勤·考察·监督复盘', color: '#D97706', file: 'disc.html' },
  { role: 'visitor', label: '成员只读', desc: '活动动态·专班进展·考勤概况', color: '#6B7280', file: 'visitor.html' },
];

renderSidebar('workspace');
renderHeader('workspace');

const savedState = CrossPageState.load();
const role = savedState?.selectedRole || AuthStore.getActiveRole();
// 首次进入时设置站位（stance=视图角色）
if (savedState?.stance) {
  AuthStore.setPrimaryRole(savedState.stance);
}
if (role) {
  AuthStore.setActiveRole('workspace', role);
}

if (role && ROLE_TO_PAGE[role]) {
  window.location.replace(_resolvePage(ROLE_TO_PAGE[role]));
} else {
  _showRoleSelector();
}

function _showRoleSelector() {
  const main = document.getElementById('workspace-main');
  if (!main) return;

  main.innerHTML = `
    <div class="max-w-2xl mx-auto py-12 px-4">
      <div class="text-center mb-8">
        <h2 class="font-title-cn text-xl font-bold text-gray-800 mb-2">党建工作台</h2>
        <p class="text-sm text-gray-500">请选择您的角色以进入对应工作页面</p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        ${ROLE_META.map(r => `
          <a href="${_resolvePage(r.file)}" class="block p-4 rounded-xl border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group" style="text-decoration:none;">
            <div class="flex items-center gap-3 mb-1">
              <div class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:${r.color};"></div>
              <span class="font-title-cn text-sm font-semibold text-gray-800 group-hover:text-gray-900">${r.label}</span>
            </div>
            <p class="text-xs text-gray-500 ml-5">${r.desc}</p>
          </a>
        `).join('')}
      </div>
      <p class="text-xs text-gray-400 text-center mt-6">您也可以通过侧边栏的"党建工作台"按钮选择角色</p>
    </div>
  `;
}

// ════════════════════════════════════════════════════════════════
//  浮窗模式：将内联表单替换为浮窗交互
// ════════════════════════════════════════════════════════════════

function _bindModalTriggers() {
  // 1. 创建活动按钮 → openFormModal
  const createBtn = document.getElementById('gen-schedule-cal-btn');
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      openFormModal({
        id: 'create-activity',
        title: '创建活动',
        accentColor: '#CE1126',
        submitLabel: '写入活动',
        fields: [
          { key: 't0', label: '目标活动日期 (T-0)', type: 'date', required: true },
          { key: 'location', label: '活动地点', type: 'text', required: true, placeholder: '如：光华1号楼203会议室' },
          { key: 'scenario', label: '组织场景', type: 'select', required: true, options: [
            { value: 'theme-party', label: '主题党日' },
            { value: 'party-group-meeting', label: '党小组会' },
            { value: 'branch-meeting', label: '支部党员大会' },
            { value: 'branch-committee', label: '支委会' },
            { value: 'party-lecture', label: '党课' },
          ] },
          { key: 'name', label: '活动名称', type: 'text', required: true, placeholder: '例：学习二十大精神主题参访' },
          { key: 'type', label: '活动形式', type: 'select', required: true, options: [
            { value: 'learning', label: '学习' },
            { value: 'meeting', label: '会议' },
            { value: 'visit', label: '参访' },
            { value: 'discussion', label: '座谈' },
            { value: 'joint', label: '共建' },
          ] },
          { key: 'duration', label: '时长', type: 'select', required: true, options: [
            { value: 'short', label: '短期' },
            { value: 'long', label: '长期' },
          ] },
          { key: 'direction', label: '发起方向', type: 'select', required: true, options: [
            { value: 'top-down', label: '自上而下' },
            { value: 'bottom-up', label: '自下而上' },
          ] },
          { key: 'organizer', label: '组织者', type: 'text', placeholder: '姓名(选填)' },
          { key: 'deep', label: '深度参与者', type: 'text', placeholder: '姓名(选填)' },
        ],
        onSubmit: (values) => {
          showToast('success', '活动创建成功');
        },
      });
    });
  }

  // 2. 发布招募按钮 → openFormModal
  const publishBtn = document.getElementById('btn-publish-tf');
  if (publishBtn) {
    publishBtn.addEventListener('click', () => {
      openFormModal({
        id: 'publish-tf',
        title: '发布专班招募',
        accentColor: '#CE1126',
        fields: [
          { key: 'name', label: '专班名称', type: 'text', required: true, placeholder: '如：宣传联络专班' },
          { key: 'capacity', label: '容纳人数', type: 'text', placeholder: '默认3人' },
          { key: 'initiator', label: '发起人', type: 'text', placeholder: '如：组织委员' },
          { key: 'deadline', label: '截止日期', type: 'date' },
          { key: 'task', label: '专班任务', type: 'textarea', placeholder: '说明专班的工作目标与产出' },
        ],
        onSubmit: (values) => {
          showToast('success', '专班发布成功');
        },
      });
    });
  }

  // 3. 招募宣传专班按钮 → openFormModal（赋权管理）
  const assignBtn = document.getElementById('open-assign-panel-btn');
  if (assignBtn) {
    assignBtn.addEventListener('click', () => {
      openFormModal({
        id: 'assign-auth',
        title: '赋权管理',
        accentColor: '#10B981',
        submitLabel: '确认赋权',
        fields: [
          { key: 'name', label: '同志姓名', type: 'text', required: true, placeholder: '输入姓名' },
          { key: 'role', label: '赋予角色', type: 'select', required: true, options: [
            { value: 'organizer', label: '组织者' },
            { value: 'deep', label: '深度参与者' },
          ] },
          { key: 'activity', label: '关联活动', type: 'text', placeholder: '活动名称（选填）' },
        ],
        onSubmit: (values) => {
          showToast('success', '赋权成功');
        },
      });
    });
  }

  // 4. 支委身份选择 → openModal（角色选择按钮，非表单）
  // 通过自定义事件触发，其他组件可 dispatch event 来打开
  document.addEventListener('open-commissioner-modal', () => {
    openModal({
      id: 'commissioner-select',
      title: '选择支委身份',
      width: '380px',
      accentColor: '#D97706',
      bodyHtml: `
        <p style="font-size:13px;color:#6B7280;margin:0 0 16px;">请选择你要切换到的支委角色。</p>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <button data-comm-role="org-commissioner" style="display:flex;align-items:center;gap:12px;width:100%;padding:12px 16px;border:1px solid #E5E7EB;border-radius:10px;background:white;cursor:pointer;text-align:left;transition:all 0.15s;" onmouseover="this.style.background='#F9FAFB';this.style.borderColor='#D1D5DB'" onmouseout="this.style.background='white';this.style.borderColor='#E5E7EB'">
            <div style="width:36px;height:36px;border-radius:8px;background:rgba(206,17,38,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#CE1126" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            </div>
            <div><div style="font-size:14px;font-weight:600;color:#1F2937;">组织委员</div><div style="font-size:12px;color:#9CA3AF;">人的管理 · 发展党员追踪</div></div>
          </button>
          <button data-comm-role="prop-commissioner" style="display:flex;align-items:center;gap:12px;width:100%;padding:12px 16px;border:1px solid #E5E7EB;border-radius:10px;background:white;cursor:pointer;text-align:left;transition:all 0.15s;" onmouseover="this.style.background='#F9FAFB';this.style.borderColor='#D1D5DB'" onmouseout="this.style.background='white';this.style.borderColor='#E5E7EB'">
            <div style="width:36px;height:36px;border-radius:8px;background:rgba(16,185,129,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
            </div>
            <div><div style="font-size:14px;font-weight:600;color:#1F2937;">宣传委员</div><div style="font-size:12px;color:#9CA3AF;">事件管理 · 活动档案统筹</div></div>
          </button>
          <button data-comm-role="disc-commissioner" style="display:flex;align-items:center;gap:12px;width:100%;padding:12px 16px;border:1px solid #E5E7EB;border-radius:10px;background:white;cursor:pointer;text-align:left;transition:all 0.15s;" onmouseover="this.style.background='#F9FAFB';this.style.borderColor='#D1D5DB'" onmouseout="this.style.background='white';this.style.borderColor='#E5E7EB'">
            <div style="width:36px;height:36px;border-radius:8px;background:rgba(217,119,6,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <div><div style="font-size:14px;font-weight:600;color:#1F2937;">纪检委员</div><div style="font-size:12px;color:#9CA3AF;">事人双重 · 考勤考察监督复盘</div></div>
          </button>
        </div>
      `,
      onMount: (panel) => {
        panel.querySelectorAll('[data-comm-role]').forEach(btn => {
          btn.addEventListener('click', () => {
            const selectedRole = btn.dataset.commRole;
            closeModal('commissioner-select');
            if (ROLE_TO_PAGE[selectedRole]) {
              window.location.replace(_resolvePage(ROLE_TO_PAGE[selectedRole]));
            }
          });
        });
      },
    });
  });
}

// 绑定浮窗触发器（DOM 已就绪，module script 默认 defer）
_bindModalTriggers();
