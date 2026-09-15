// role: [工程师]+[AI]
// 党委工作台 Tab：支部监控台账（P1 党委后台，2026-09-02）
// 党委见全院：各支部运行概览（支部名/支书/成员规模/在册党员/滞留/发展阶段/组织生活台账/近期活动/进入支部）
// C⑤（2026-09-10 支书裁定）：支部级明细单一源=本台账（治理总览只留全院级汇总数字）。
// 数源：mockDB.branches（支部实例）+ PEOPLE（成员档案，已挂 branchId）+ ctx.activities（工作台已加载）

import { mockDB } from '../../../core/domain.js?v=20260915d';
import { liveMembers, PersonStore } from '../../../services/person.js?v=20260915d';
// C⑤（2026-09-10 支书裁定）：治理总览不再呈支部明细 → 支部党员数/滞留收归本台账，
// 复用 services/roster.js getRosterStats（与治理总览上卷、会议「应到名单」同口径）。
import { getRosterStats } from '../../../services/roster.js?v=20260915d';
// 数据域接线收口（2026-09-03）：支部成员名单经 services/person.js 获取（原直连 mock PEOPLE）
// 实时视图（非快照）：成员增删即时可见——见 services/person.js liveMembers 说明
const PEOPLE = liveMembers();
import { getCommitteeName } from '../../../services/branch.js?v=20260915d';
import { getPersonName } from '../../../services/person.js?v=20260915d';
// P2（2026-09-10）：监控卡补「支书任期」只读行——复用 appointment.js 任期档案（起止/现任）
import { listAppointments } from '../../../services/appointment.js?v=20260915d';
// 支部监控卡「进入支部」→ 复用党委既有支部入口（modules/branch-demo-nav.js）：
// 只读监控视图（演示形态；本地回环主机放行，本地示例 / API 会话同口径只读），不授予党支部内部事务权限。
import { bindBranchDemoButtons } from '../../../modules/branch-demo-nav.js?v=20260915d';

const STAGE_ORDER = ['正式党员', '预备党员', '发展对象', '积极分子'];

export async function renderContent(ctx) {
  const el = document.getElementById('party-committee-tab-content');
  if (!el) return;
  const activities = ctx?.activities || mockDB.activities || [];
  const branches = mockDB.branches || [];

  const cards = branches.map(b => {
    const members = PEOPLE.filter(p => p.branchId === b.id);
    // 在册党员 / 滞留（应到口径剔除）：与治理总览上卷同源（roster getRosterStats）
    const roster = getRosterStats({ branchId: b.id });
    const stageCounts = {};
    members.forEach(p => { stageCounts[p.developStage] = (stageCounts[p.developStage] || 0) + 1; });
    const stageRows = STAGE_ORDER.map(s => ({ s, n: stageCounts[s] || 0 })).filter(r => r.n > 0);
    const typeCounts = {};
    activities.forEach(a => { if (a.branchId === undefined || (a.branchId || 'br-b1') === b.id) { typeCounts[a.type] = (typeCounts[a.type] || 0) + 1; } });
    const recent = activities.filter(a => (a.branchId || 'br-b1') === b.id).sort((x, y) => (y.date || '').localeCompare(x.date || '')).slice(0, 5);
    const secretaryName = b.secretaryId ? getPersonName(b.secretaryId) : '（待任命）';
    // 支书任期行（只读）：复用 listAppointments（倒序，现任在前）——现任（to null）=「至今（现任）」，
    // 无在任记录时回退最近一条历史，全无 → 暂无任期记录（起止 = from → to）。
    const appts = listAppointments(b.id);
    const term = appts.find(a => !a.to) || appts[0] || null;
    const termText = term
      ? `支书任期：${String(term.from || '').slice(0, 10) || '—'}${term.to ? ` → ${String(term.to).slice(0, 10)}` : ' · 至今（现任）'}`
      : '支书任期：（暂无任期记录）';
    return {
      b, members: members.length, stageRows, typeCounts, recent, secretaryName, termText,
      partyTotal: roster.partyTotal,   // 在册党员（正式+预备）
      detained: roster.detainedParty,  // 滞留党员（应到剔除）
    };
  });

  el.innerHTML = `
    <div class="space-y-5">
      <div class="card rounded-xl p-4 flex items-center justify-between">
        <div>
          <p class="text-xs text-gray-500">院系党组织</p>
          <p class="font-title-cn text-lg font-bold text-gray-800">${getCommitteeName()}</p>
        </div>
        <div class="text-right">
          <p class="text-2xl font-bold text-red-600">${branches.length}</p>
          <p class="text-xs text-gray-500">支部实例</p>
        </div>
      </div>
      ${cards.map(({ b, members, partyTotal, detained, stageRows, typeCounts, recent, secretaryName, termText }) => `
        <div class="card rounded-xl p-4">
          <div class="flex items-center justify-between mb-3">
            <div>
              <p class="font-title-cn text-base font-bold text-gray-800">${b.config?.headerTitle || b.name}</p>
              <p class="text-xs text-gray-500 mt-0.5">${b.type || '支部'} · 现任支书：${secretaryName}</p>
              <p class="text-xs text-gray-500 mt-0.5">${termText}</p>
            </div>
            <span class="text-xs px-2 py-0.5 rounded-full ${b.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}">${b.status === 'active' ? '运行中' : b.status}</span>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <div class="rounded-lg bg-gray-50 p-3">
              <p class="text-xs text-gray-500">成员规模</p>
              <p class="text-xl font-bold text-gray-800 mt-1">${members}<span class="text-xs font-normal text-gray-500"> 人</span></p>
            </div>
            <div class="rounded-lg bg-gray-50 p-3">
              <p class="text-xs text-gray-500">在册党员（正式+预备）</p>
              <p class="text-xl font-bold text-gray-800 mt-1">${partyTotal}<span class="text-xs font-normal text-gray-500"> 人</span></p>
            </div>
            <div class="rounded-lg bg-gray-50 p-3">
              <p class="text-xs text-gray-500">滞留党员（应到剔除）</p>
              <p class="text-xl font-bold text-gray-800 mt-1">${detained}<span class="text-xs font-normal text-gray-500"> 人</span></p>
            </div>
            <div class="rounded-lg bg-gray-50 p-3 col-span-1">
              <p class="text-xs text-gray-500">发展阶段分布</p>
              <p class="text-xs text-gray-600 mt-1.5 leading-5">${stageRows.map(r => `${r.s} ${r.n}`).join(' · ') || '—'}</p>
            </div>
            <div class="rounded-lg bg-gray-50 p-3">
              <p class="text-xs text-gray-500">思想汇报</p>
              <p class="text-xl font-bold text-gray-800 mt-1">${(mockDB.thoughtReports || []).filter(t => !t.branchId || t.branchId === b.id).length}</p>
            </div>
            <div class="rounded-lg bg-gray-50 p-3">
              <p class="text-xs text-gray-500">组织生活类型</p>
              <p class="text-xs text-gray-600 mt-1.5 leading-5">${Object.entries(typeCounts).map(([t, n]) => `${t} ${n}`).join(' · ') || '—'}</p>
            </div>
          </div>
          ${recent.length ? `
          <div>
            <p class="text-xs text-gray-500 mb-2">近期活动</p>
            <div class="flex flex-wrap gap-2">
              ${recent.map(a => `<a href="../activity.html?id=${encodeURIComponent(a.id || '')}" class="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded px-2 py-1 hover:bg-gray-100 transition-colors" style="text-decoration:none;" title="查看活动详情（只读）">${a.date?.slice(5) || ''} ${a.title}</a>`).join('')}
            </div>
          </div>` : ''}
          <div class="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
            <p class="text-xs text-gray-500">监控只读视图 · 不授予支部内部事务权限</p>
            <button type="button" class="branch-demo-enter btn-accent text-xs px-3 py-1.5 rounded-lg font-medium shrink-0" data-branch-id="${b.id}"
              title="打开该支部监控只读视图（演示形态，只读；不授予支部内部事务权限）">进入支部</button>
          </div>
        </div>`).join('')}
    </div>
  `;
  bindBranchDemoButtons(el);
}
