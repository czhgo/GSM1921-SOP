// role: [工程师]+[AI]
// 党委工作台 Tab：支部监控台账（P1 党委后台，2026-09-02）
// 党委见全院：各支部运行概览（成员规模/发展阶段/组织生活台账/现任书记/近期活动）
// 数源：mockDB.branches（支部实例）+ PEOPLE（成员档案，已挂 branchId）+ ctx.activities（工作台已加载）

import { mockDB } from '../../../core/domain.js?v=20260903c';
import { PersonStore } from '../../../services/person.js?v=20260903c';
// 数据域接线收口（2026-09-03）：支部成员名单经 services/person.js 获取（原直连 mock PEOPLE）
const PEOPLE = PersonStore.getMembers();
import { PARTY_COMMITTEE } from '../../../mock/branches.js?v=20260903c';
import { getPersonName } from '../../../services/person.js?v=20260903c';

const STAGE_ORDER = ['正式党员', '预备党员', '发展对象', '积极分子'];

export async function renderContent(ctx) {
  const el = document.getElementById('party-committee-tab-content');
  if (!el) return;
  const activities = ctx?.activities || mockDB.activities || [];
  const branches = mockDB.branches || [];

  const cards = branches.map(b => {
    const members = PEOPLE.filter(p => p.branchId === b.id);
    const stageCounts = {};
    members.forEach(p => { stageCounts[p.developStage] = (stageCounts[p.developStage] || 0) + 1; });
    const stageRows = STAGE_ORDER.map(s => ({ s, n: stageCounts[s] || 0 })).filter(r => r.n > 0);
    const typeCounts = {};
    activities.forEach(a => { if (a.branchId === undefined || (a.branchId || 'br-b1') === b.id) { typeCounts[a.type] = (typeCounts[a.type] || 0) + 1; } });
    const recent = activities.filter(a => (a.branchId || 'br-b1') === b.id).sort((x, y) => (y.date || '').localeCompare(x.date || '')).slice(0, 5);
    const secretaryName = b.secretaryId ? getPersonName(b.secretaryId) : '（待任命）';
    return { b, members: members.length, stageRows, typeCounts, recent, secretaryName };
  });

  el.innerHTML = `
    <div class="space-y-5">
      <div class="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between">
        <div>
          <p class="text-xs text-gray-400">院系党组织</p>
          <p class="font-title-cn text-lg font-bold text-gray-800">${PARTY_COMMITTEE.name}</p>
        </div>
        <div class="text-right">
          <p class="text-2xl font-bold text-red-600">${branches.length}</p>
          <p class="text-xs text-gray-400">支部实例</p>
        </div>
      </div>
      ${cards.map(({ b, members, stageRows, typeCounts, recent, secretaryName }) => `
        <div class="rounded-xl border border-gray-200 bg-white p-4">
          <div class="flex items-center justify-between mb-3">
            <div>
              <p class="font-title-cn text-base font-bold text-gray-800">${b.config?.headerTitle || b.name}</p>
              <p class="text-xs text-gray-400 mt-0.5">${b.type || '支部'} · 现任书记：${secretaryName}</p>
            </div>
            <span class="text-xs px-2 py-0.5 rounded-full ${b.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}">${b.status === 'active' ? '运行中' : b.status}</span>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div class="rounded-lg bg-gray-50 p-3">
              <p class="text-xs text-gray-400">成员规模</p>
              <p class="text-xl font-bold text-gray-800 mt-1">${members}<span class="text-xs font-normal text-gray-400"> 人</span></p>
            </div>
            <div class="rounded-lg bg-gray-50 p-3 col-span-1">
              <p class="text-xs text-gray-400">发展阶段分布</p>
              <p class="text-xs text-gray-600 mt-1.5 leading-5">${stageRows.map(r => `${r.s} ${r.n}`).join(' · ') || '—'}</p>
            </div>
            <div class="rounded-lg bg-gray-50 p-3">
              <p class="text-xs text-gray-400">思想汇报</p>
              <p class="text-xl font-bold text-gray-800 mt-1">${(mockDB.thoughtReports || []).filter(t => !t.branchId || t.branchId === b.id).length}</p>
            </div>
            <div class="rounded-lg bg-gray-50 p-3">
              <p class="text-xs text-gray-400">组织生活类型</p>
              <p class="text-xs text-gray-600 mt-1.5 leading-5">${Object.entries(typeCounts).map(([t, n]) => `${t} ${n}`).join(' · ') || '—'}</p>
            </div>
          </div>
          ${recent.length ? `
          <div>
            <p class="text-xs text-gray-400 mb-1.5">近期活动</p>
            <div class="flex flex-wrap gap-2">
              ${recent.map(a => `<span class="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded px-2 py-1">${a.date?.slice(5) || ''} ${a.title}</span>`).join('')}
            </div>
          </div>` : ''}
        </div>`).join('')}
    </div>
  `;
}
