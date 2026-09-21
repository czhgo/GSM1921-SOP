// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  dashboard/taskforce-list.js — 首页专班列表（方案 B 入口拆分，2026-08-29）
//  自 main-entry.js 迁出：_renderTaskforceList + TF_STATUS_BADGE。
//  职责单一：活跃/招募中专班列表（前 5 条，进度条 + 状态徽章）。
// ════════════════════════════════════════════════════════════════

import { getPersonName } from '../../services/person.js?v=20260922a';

const TF_STATUS_BADGE = {
  recruiting: { text: '招募中', cls: 'bg-orange-100 text-orange-700' },
  active:     { text: '运行中', cls: 'bg-green-100 text-green-700' },
  completed:  { text: '已完结', cls: 'bg-gray-100 text-gray-600' },
  draft:      { text: '草稿', cls: 'bg-gray-100 text-gray-600' },
};

/** 状态徽章（C3 2026-09-12：状态由截止日派生——招募中但已过截止日显示「报名已截止」，与报名入口可达性一致） */
function tfBadge(status, deadline) {
  if (status === 'recruiting' && deadline && deadline < new Date().toISOString().slice(0, 10)) {
    return { text: '报名已截止', cls: 'bg-gray-100 text-gray-600' };
  }
  return TF_STATUS_BADGE[status] || TF_STATUS_BADGE.draft;
}

/** 渲染首页专班列表（活跃/招募中，前 5 条，新者在前） */
export function renderTaskforceList(taskforces) {
  const container = document.getElementById('dashboard-taskforce-list');
  if (!container) return;

  // T223 排序统一：专班按 createdAt 降序（新者在前）
  const active = taskforces
    .filter(t => t.status === 'active' || t.status === 'recruiting')
    .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const display = active.slice(0, 5);

  if (display.length === 0) {
    // 过拟合修正（2026-09-13）：专班＝本支部自创工作方法，首页不为其保留常驻空卡
    //（原空态「暂无活跃专班」恒占位）。无活跃专班 → **整卡不出**（含标题与「查看全部」）。
    document.getElementById('dashboard-taskforce-card')?.classList.add('hidden');
    container.innerHTML = '';
    return;
  }
  document.getElementById('dashboard-taskforce-card')?.classList.remove('hidden');

  container.innerHTML = display.map(r => {
    const badge = tfBadge(r.status, r.deadline);
    const filled = r.members.filter(m => m.personId).length;
    const pct = r.capacity > 0 ? Math.round((filled / r.capacity) * 100) : 0;
    const barColor = pct >= 80 ? 'var(--accent-emerald)' : pct >= 50 ? 'var(--accent-gold)' : 'var(--primary-400)';

    return `
      <div class="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 hover:shadow-sm rounded-lg px-2 -mx-2 transition-all duration-200 group"
           data-tf-id="${r.id}"
           title="${r.name} — ${r.task}">
        <span class="px-1.5 py-0.5 text-xs font-medium rounded-full ${badge.cls} flex-shrink-0 mt-0.5">${badge.text}</span>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-800 truncate group-hover:text-blue-700 transition-colors">${r.name}</p>
          <p class="text-xs text-gray-500 mt-0.5 line-clamp-1">${r.task}</p>
          <div class="flex items-center gap-2 mt-1.5">
            <div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full rounded-full" style="width:${pct}%;background:${barColor};transition:width 0.3s;"></div>
            </div>
            <span class="text-xs text-gray-500 whitespace-nowrap">${filled}/${r.capacity}</span>
          </div>
        </div>
        <div class="text-right whitespace-nowrap flex-shrink-0">
          <p class="text-xs text-gray-500">发起: ${getPersonName(r.initiator)}</p>
          ${r.deadline ? `<p class="text-xs text-gray-500">截止 ${r.deadline}</p>` : ''}
        </div>
      </div>
    `;
  }).join('');
}
