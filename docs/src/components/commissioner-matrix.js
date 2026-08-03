import { ROLE_LABELS } from '../core/constants.js';
import { getBasePath } from '../core/utils.js';
import { icon } from '../core/icons.js';

const COMMISSIONER_DATA = [
  {
    role: 'org-commissioner',
    name: '组织委员',
    color: '#0EA5E9',
    colorBg: 'rgba(14,165,233,0.06)',
    colorBorder: 'rgba(14,165,233,0.15)',
    icon: icon('users', { strokeWidth: 1.8, className: 'w-5 h-5' }),
    workspace: {
      title: '专班建设',
      desc: '招募统筹·定人定责定岗',
      items: ['考察上传与确认', '专班创建与招募管理', '人才库（考察表汇总提炼）'],
      page: 'workspace/org.html',
    },
    party: {
      title: '发展党员全流程',
      desc: '考察/催缴/归档',
      items: ['发展党员追踪看板', '材料催缴提醒'],
      page: 'workspace/org.html',
    },
  },
  {
    role: 'prop-commissioner',
    name: '宣传委员',
    color: '#2563EB',
    colorBg: 'rgba(37,99,235,0.06)',
    colorBorder: 'rgba(37,99,235,0.15)',
    icon: icon('megaphone', { strokeWidth: 1.8, className: 'w-5 h-5' }),
    workspace: {
      title: '项目视图',
      desc: '宣传材料/周报',
      items: ['宣传任务接收与执行', '项目看板', '专班工作量统计'],
      page: 'workspace/prop.html',
    },
    party: {
      title: '宣传档案合规建设',
      desc: '模板/制度',
      items: ['档案归档管理', '材料标准制定', '模板库维护', '周报报送'],
      page: 'workspace/prop.html',
    },
  },
  {
    role: 'disc-commissioner',
    name: '纪检委员',
    color: '#C2410C',
    colorBg: 'rgba(194,65,12,0.06)',
    colorBorder: 'rgba(194,65,12,0.15)',
    icon: icon('scale', { strokeWidth: 1.8, className: 'w-5 h-5' }),
    workspace: {
      title: '考勤·考察·监督',
      desc: '考勤管理·考察管理·活动监督复盘',
      items: ['考勤总表管理', '考察总表管理', '活动流程监督', '复盘审核与批注'],
      page: 'workspace/disc.html',
    },
    party: {
      title: '补课制度/公邮管理',
      desc: '补课跟踪·公邮查收',
      items: ['补课任务跟踪', '补课完成确认', '公邮查收提醒', '查收历史记录'],
      page: 'workspace/disc.html',
    },
  },
];

export function renderCommissionerMatrix(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const base = getBasePath();

  container.innerHTML = `
    <div class="mb-6">
      <h3 class="font-title-cn text-lg font-bold text-gray-800 mb-2">三委员工作台职责矩阵</h3>
      <p class="text-sm text-gray-500 mb-4">三位委员的工作台职责一览。点击卡片可跳转至对应工作页面。</p>
    </div>

    <div class="space-y-4">
      ${COMMISSIONER_DATA.map(c => `
        <div class="card rounded-2xl overflow-hidden border" style="border-color:${c.colorBorder};">
          <div class="px-5 py-3 flex items-center gap-3" style="background:${c.colorBg};border-bottom:1px solid ${c.colorBorder};">
            <span style="color:${c.color}">${c.icon}</span>
            <span class="font-title-cn text-sm font-bold" style="color:${c.color}">${c.name}</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            ${['workspace', 'party'].map(domain => {
              const d = c[domain];
              return `
                <a href="${base + d.page}" class="block p-5 hover:bg-gray-50/50 transition-colors group" style="text-decoration:none;">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background:${c.color};"></span>
                    <span class="font-title-cn text-sm font-semibold text-gray-700 group-hover:text-gray-900">${d.title}</span>
                  </div>
                  <p class="text-xs text-gray-400 mb-3">${d.desc}</p>
                  <ul class="space-y-1.5">
                    ${d.items.map(item => `
                      <li class="flex items-center gap-2 text-xs text-gray-600">
                        <span class="w-1 h-1 rounded-full flex-shrink-0" style="background:${c.color};"></span>
                        ${item}
                      </li>
                    `).join('')}
                  </ul>
                  <div class="mt-3 text-xs text-gray-400 group-hover:text-blue-500 transition-colors flex items-center gap-1">
                    ${icon('arrowRight', { className: 'w-3 h-3' })}
                    进入工作台
                  </div>
                </a>
              `;
            }).join('')}
          </div>
        </div>
      `).join('')}
    </div>

    <div class="mt-4 p-3 rounded-lg bg-gray-100 border border-gray-100">
      <p class="text-xs text-gray-500">
        <strong>核心规则</strong>：组织委员是唯一专班管理节点；纪检委员不组建专班（权责分离）；宣传委员不可自行招募宣传专班，赋权操作统一归口组织委员。
        考勤数据同源——组织委员的活动出勤数据直接使用纪检委员维护的考勤系统。
      </p>
    </div>
  `;
}
