import { CrossPageState } from '../core/cross-page-state.js';
import { renderSidebar } from '../components/sidebar.js';
import { renderHeader } from '../components/header.js';
import { AuthStore } from '../services/auth.js';
import { getBasePath } from '../core/utils.js';

const ROLE_TO_PAGE = {
  secretary: 'secretary.html',
  'org-commissioner': 'org.html',
  'prop-commissioner': 'prop.html',
  'disc-commissioner': 'disc.html',
};

function _resolvePage(filename) {
  return getBasePath() + 'party/' + filename;
}

const ROLE_META = [
  { role: 'secretary', label: '党支部书记', desc: '全局聚合·批量操作·意见反馈', color: '#CE1126', file: 'secretary.html' },
  { role: 'org-commissioner', label: '组织委员', desc: '追踪看板·材料催缴·思想汇报·合规文件', color: '#3B82F6', file: 'org.html' },
  { role: 'prop-commissioner', label: '宣传委员', desc: '档案归档·材料标准·周报报送', color: '#10B981', file: 'prop.html' },
  { role: 'disc-commissioner', label: '纪检委员', desc: '补课制度·公邮管理', color: '#D97706', file: 'disc.html' },
];

renderSidebar('party');
renderHeader('party');

const savedState = CrossPageState.load();
const role = savedState?.selectedRole || AuthStore.getActiveRole();

if (role && ROLE_TO_PAGE[role]) {
  window.location.replace(_resolvePage(ROLE_TO_PAGE[role]));
} else {
  _showRoleSelector();
}

function _showRoleSelector() {
  const main = document.getElementById('party-main');
  if (!main) return;

  main.innerHTML = `
    <div class="max-w-2xl mx-auto py-12 px-4">
      <div class="text-center mb-8">
        <h2 class="font-title-cn text-xl font-bold text-gray-800 mb-2">党务管理</h2>
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
      <p class="text-xs text-gray-400 text-center mt-6">您也可以通过侧边栏的"党务管理"按钮选择角色</p>
    </div>
  `;
}
