// role: [工程师]+[AI]
// 参与者工作台 Tab：考勤概况（T-279 M3 拆分，照 M2 样板）
// 本月活动出勤一览（参与者视角：支部成员对自己的活动出勤有查询视图）。

import { loadActiveAttendanceRecords } from '../../../services/attendance.js?v=20260827c';

export function renderContent(ctx) {
  const tc = document.getElementById('visitor-tab-content');
  if (!tc) return;
  const activities = ctx.activities || [];
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthActs = activities.filter(a => (a.date || '').startsWith(thisMonth) && !a.archived);
  tc.innerHTML = `
    <div class="flex flex-wrap gap-2 mb-3">
      <input type="text" id="visitor-att-search" class="input-flat text-xs flex-1 min-w-[140px]" placeholder="搜索活动名称...">
    </div>
    <div id="visitor-att-list"></div>
  `;

  function renderList() {
    const listEl = document.getElementById('visitor-att-list');
    if (!listEl) return;
    const q = (document.getElementById('visitor-att-search')?.value || '').trim().toLowerCase();
    const filtered = q ? monthActs.filter(a => (a.title || '').toLowerCase().includes(q)) : monthActs;
    listEl.innerHTML = `
      <div class="space-y-2">
        ${filtered.length === 0 ? '<p class="text-xs text-gray-400 text-center py-6">无匹配考勤数据</p>' :
          filtered.map(act => {
            const records = loadActiveAttendanceRecords().filter(r => r.activityId === act.id);
            // 出勤口径统一（2026-08-07）：已补（made_up）计入出勤，与书记概况出勤率一致
            const present = records.filter(r => r.status === 'present' || r.status === 'made_up').length;
            const total = records.length;
            const rate = total > 0 ? Math.round((present / total) * 100) : 0;
            const rateColor = rate >= 90 ? 'text-green-600' : rate >= 70 ? 'text-amber-600' : 'text-red-600';
            return `
              <div class="flex items-center justify-between p-3 rounded-lg bg-white">
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-800">${act.title}</p>
                  <p class="text-xs text-gray-400">${act.date}</p>
                </div>
                <div class="text-xs font-medium ${rateColor}">出勤 ${present}/${total} · ${rate}%</div>
              </div>
            `;
          }).join('')}
      </div>
    `;
  }

  document.getElementById('visitor-att-search')?.addEventListener('input', renderList);
  renderList();
}
