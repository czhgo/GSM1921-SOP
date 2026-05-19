import { CrossPageState } from '../core/cross-page-state.js';
import { renderSidebar } from '../components/sidebar.js';
import { renderHeader } from '../components/header.js';
import { AuthStore, ViewModeStore } from '../services/auth.js';
import { getBasePath } from '../core/utils.js';

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
  { role: 'visitor', label: '参与者只读', desc: '活动动态·专班进展·考勤概况', color: '#6B7280', file: 'visitor.html' },
];

renderSidebar('workspace');
renderHeader('workspace');

const savedState = CrossPageState.load();
const role = savedState?.selectedRole || AuthStore.getActiveRole();

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
