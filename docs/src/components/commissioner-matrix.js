import { ROLE_LABELS } from '../core/constants.js';
import { getBasePath } from '../core/utils.js';

const COMMISSIONER_DATA = [
  {
    role: 'org-commissioner',
    name: '组织委员',
    person: '侯嘉嵘',
    color: '#CE1126',
    colorBg: 'rgba(206,17,38,0.06)',
    colorBorder: 'rgba(206,17,38,0.15)',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',
    workspace: {
      title: '专班建设',
      desc: '招募统筹·定人定责定岗',
      items: ['专班创建与招募管理', '赋权面板操作', '工作量跟踪与记账', '专班解散与汇总报告'],
      page: 'workspace/org.html',
    },
    party: {
      title: '党员发展全流程',
      desc: '考察/催缴/归档',
      items: ['发展党员追踪看板', '材料催缴提醒', '思想汇报归档', '合规文件管理'],
      page: 'party/org.html',
    },
  },
  {
    role: 'prop-commissioner',
    name: '宣传委员',
    person: '闫鑫岳',
    color: '#10B981',
    colorBg: 'rgba(16,185,129,0.06)',
    colorBorder: 'rgba(16,185,129,0.15)',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>',
    workspace: {
      title: '活动与专班视图',
      desc: '宣传材料/周报',
      items: ['活动宣传看板', '专班工作量视图', '多维表格视图', '宣传材料管理'],
      page: 'workspace/prop.html',
    },
    party: {
      title: '宣传档案合规建设',
      desc: '模板/制度',
      items: ['档案归档管理', '材料标准制定', '模板库维护', '周报报送'],
      page: 'party/prop.html',
    },
  },
  {
    role: 'disc-commissioner',
    name: '纪检委员',
    person: '韩思宁',
    color: '#D97706',
    colorBg: 'rgba(217,119,6,0.06)',
    colorBorder: 'rgba(217,119,6,0.15)',
    icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
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
      page: 'party/disc.html',
    },
  },
];

const DOMAIN_META = {
  workspace: {
    label: '党建工作台',
    subtitle: '创新探索·面向未来',
    accent: '#CE1126',
    accentBg: 'rgba(206,17,38,0.04)',
    accentBorder: 'rgba(206,17,38,0.12)',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
  },
  party: {
    label: '党务管理',
    subtitle: '合规运行·面向存量',
    accent: '#7A0010',
    accentBg: 'rgba(122,0,16,0.04)',
    accentBorder: 'rgba(122,0,16,0.12)',
    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  },
};

export function renderCommissionerMatrix(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const base = getBasePath();

  container.innerHTML = `
    <div class="mb-6">
      <div class="flex items-center gap-3 mb-2">
        <h3 class="font-title-cn text-lg font-bold text-gray-800">三委员双域职责矩阵</h3>
      </div>
      <p class="text-sm text-gray-500 mb-4">同一位委员，在党建工作台和党务管理中承担不同职责。点击卡片可跳转至对应工作页面。</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      ${Object.entries(DOMAIN_META).map(([key, meta]) => `
        <div class="card rounded-2xl p-4 border-l-4" style="border-left-color:${meta.accent};background:${meta.accentBg};">
          <div class="flex items-center gap-2 mb-1">
            <span style="color:${meta.accent}">${meta.icon}</span>
            <span class="font-title-cn text-sm font-bold" style="color:${meta.accent}">${meta.label}</span>
          </div>
          <span class="text-xs text-gray-500">${meta.subtitle}</span>
        </div>
      `).join('')}
    </div>

    <div class="space-y-4">
      ${COMMISSIONER_DATA.map(c => `
        <div class="card rounded-2xl overflow-hidden border" style="border-color:${c.colorBorder};">
          <div class="px-5 py-3 flex items-center gap-3" style="background:${c.colorBg};border-bottom:1px solid ${c.colorBorder};">
            <span style="color:${c.color}">${c.icon}</span>
            <span class="font-title-cn text-sm font-bold" style="color:${c.color}">${c.name}</span>
            <span class="text-xs text-gray-400">${c.person}</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            ${['workspace', 'party'].map(domain => {
              const d = c[domain];
              const meta = DOMAIN_META[domain];
              return `
                <a href="${base + d.page}" class="block p-5 hover:bg-gray-50/50 transition-colors group" style="text-decoration:none;">
                  <div class="flex items-center gap-2 mb-2">
                    <span style="color:${meta.accent}">${meta.icon}</span>
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
                  <div class="mt-3 text-[10px] text-gray-400 group-hover:text-blue-500 transition-colors flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                    进入${meta.label}
                  </div>
                </a>
              `;
            }).join('')}
          </div>
        </div>
      `).join('')}
    </div>

    <div class="mt-4 p-3 rounded-lg bg-gray-50 border border-gray-100">
      <p class="text-xs text-gray-500">
        <strong>核心规则</strong>：组织委员是唯一专班管理节点；纪检委员不生长专班（内控隔离）；宣传委员不可自行招募宣传专班，赋权操作统一归口组织委员。
        考勤数据同源——组织委员的活动出勤数据直接使用纪检委员维护的考勤系统。
      </p>
    </div>
  `;
}
