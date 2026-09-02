// role: [工程师]+[AI]
// 组织委员工作台 Tab：人才库（T-279 M3 拆分，照 M2 样板）
// 人员信息汇总提炼，输出人才画像；点击人员展开考察记录汇总。

import { loadInspectionRecords } from '../../../services/inspection.js?v=20260901y';
import { loadActivities } from '../../../services/activity.js?v=20260901y';
import { PEOPLE, getPersonById } from '../../../mock/index.js?v=20260901y';
import { renderQueryView } from '../../../components/query-view.js?v=20260901y';
import { badgeHtml } from '../../../components/badge.js?v=20260901y';
import { icon } from '../../../core/icons.js?v=20260901y';

// 发展阶段颜色映射（单一模块级；收敛 2026-09-02：原 query/detail 两函数内各有一份同值副本）
const STAGE_COLOR = {
  '正式党员': 'bg-green-100 text-green-700',
  '预备党员': 'bg-blue-100 text-blue-700',
  '发展对象': 'bg-amber-100 text-amber-700',
  '积极分子': 'bg-cyan-100 text-cyan-700',
};

export function renderContent(ctx) {
  const container = document.getElementById('org-tab-content');
  if (!container) return;

  const people = [...PEOPLE];
  const allInspections = loadInspectionRecords();

  // 提取筛选选项
  const stageOptions = [...new Set(people.map(p => p.developStage).filter(Boolean))].map(s => ({ value: s, label: s }));
  const groupOptions = [...new Set(people.map(p => p.partyGroup).filter(Boolean))].map(g => ({ value: g, label: g }));

  container.innerHTML = `
    <div class="card rounded-xl p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">人才库</h3>
        <span class="text-xs text-gray-400">${people.length} 人</span>
      </div>
      <div class="text-xs text-gray-500 mb-4">人员信息汇总提炼，输出人才画像</div>
      <div id="org-talent-query"></div>
    </div>
    <div id="org-talent-detail" class="hidden card rounded-xl p-5 mt-3"></div>
  `;

  const queryContainer = document.getElementById('org-talent-query');
  if (!queryContainer) return;

  // 构建查询数据（附加考察记录数）
  const queryData = people.map(p => ({
    ...p,
    inspCount: allInspections.filter(r => r.personId === p.id).length,
  }));

  // 发展阶段颜色映射（query 视图）
  renderQueryView(queryContainer, {
    searchPlaceholder: '搜索姓名...',
    searchKey: 'name',
    filters: [
      { key: 'developStage', label: '发展阶段', options: stageOptions },
      { key: 'partyGroup', label: '党小组', options: groupOptions },
    ],
    data: queryData,
    renderRow: (p) => {
      const colorCls = STAGE_COLOR[p.developStage] || 'bg-gray-100 text-gray-500';
      return `
        <div class="flex items-center justify-between p-3 rounded-xl bg-white cursor-pointer talent-person-card hover:bg-gray-50 transition-colors" data-person-id="${p.id}">
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-gray-800">${p.name}</div>
            <div class="text-xs text-gray-500 mt-0.5">${p.partyGroup || ''}${p.role && p.role !== 'participant' ? ' · ' + p.role : ''}</div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs px-1.5 py-0.5 rounded-full ${colorCls}">${p.developStage || ''}</span>
            ${p.inspCount > 0 ? badgeHtml(`考察 ${p.inspCount}`, 'info') : ''}
          </div>
        </div>
      `;
    },
    emptyMessage: '无匹配人员',
    accentColor: ctx.accent,
    sortKey: 'name',
    sortDir: 'asc',
  });

  // 点击人员展开考察记录汇总
  queryContainer.addEventListener('click', (e) => {
    const card = e.target.closest('.talent-person-card');
    if (!card) return;
    const personId = card.dataset.personId;
    _renderTalentDetail(personId);
  });
}

// ── 人才库详情：考察记录汇总 ──
function _renderTalentDetail(personId) {
  const panel = document.getElementById('org-talent-detail');
  if (!panel) return;

  const person = getPersonById(personId);
  if (!person) return;

  const allInspections = loadInspectionRecords();
  const personInspections = allInspections.filter(r => r.personId === personId);
  // 2026-08-08 人才库展示增强：活动来源考察记录显示活动名（专班来源用 sourceName）
  const actTitleById = new Map(loadActivities().map(a => [a.id, a.title]));

  const colorCls = STAGE_COLOR[person.developStage] || 'bg-gray-100 text-gray-500';

  // 角色标签映射（2026-09-02 书记裁决：统一 T1 全称，与 core/constants.js ROLE_LABELS 对齐）
  const roleLabel = {
    'secretary': '党支部书记', 'deputy-secretary': '党支部副书记',
    'org-commissioner': '组织委员', 'prop-commissioner': '宣传委员',
    'disc-commissioner': '纪检委员', 'leader': '党小组组长',
    'participant': '', 'organizer': '组织者',
  };

  // 考察来源类型标签
  const sourceTagColor = { 'activity': 'bg-blue-50 text-blue-600', 'taskforce': 'bg-green-50 text-green-600' };
  const sourceTagLabel = { 'activity': '活动', 'taskforce': '专班' };
  const inspStatusColor = { 'confirmed': 'bg-green-100 text-green-700', 'pending': 'bg-orange-100 text-orange-700' };

  panel.classList.remove('hidden');
  panel.innerHTML = `
    <div class="flex items-start justify-between mb-3">
      <div>
        <h3 class="font-title-cn text-base font-semibold text-gray-800">${person.name}</h3>
        <div class="flex items-center gap-2 mt-1">
          <span class="text-xs px-1.5 py-0.5 rounded-full ${colorCls}">${person.developStage || ''}</span>
          <span class="text-xs text-gray-500">${person.partyGroup || ''}</span>
          ${roleLabel[person.role] ? badgeHtml(roleLabel[person.role], 'info') : ''}
        </div>
      </div>
      <button id="talent-detail-close" class="text-gray-400 hover:text-gray-600 transition-colors" style="cursor:pointer;">${icon('close', { stroke: '#6B7280', className: 'w-3.5 h-3.5' })}</button>
    </div>
    <div class="mt-3">
      <h5 class="font-title-cn text-xs font-bold text-gray-600 mb-2">考察记录汇总 (${personInspections.length})</h5>
      ${personInspections.length === 0
        ? '<p class="text-xs text-gray-400 pl-2">暂无考察记录</p>'
        : `<div class="space-y-2">
          ${personInspections.map(r => `
            <div class="p-2.5 rounded-lg bg-white border border-gray-50">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs font-medium text-gray-700">${r.sourceName || (r.activityId ? actTitleById.get(r.activityId) : null) || r.role || '-'}</span>
                <div class="flex items-center gap-1.5">
                  ${r.sourceType ? `<span class="text-xs px-1.5 py-0.5 rounded-full ${sourceTagColor[r.sourceType] || 'bg-gray-50 text-gray-500'}">${sourceTagLabel[r.sourceType] || r.sourceType}</span>` : ''}
                  <span class="text-xs px-1.5 py-0.5 rounded-full ${inspStatusColor[r.status] || 'bg-gray-100 text-gray-500'}">${r.status === 'confirmed' ? '已确认' : '待确认'}</span>
                </div>
              </div>
              <p class="text-[12px] text-gray-500">${r.role || '-'}</p>
              ${r.recordedAt ? `<p class="text-xs text-gray-400 mt-0.5">记录时间：${r.recordedAt.slice(0, 10)}</p>` : ''}
            </div>
          `).join('')}
        </div>`
      }
    </div>
  `;

  // 关闭详情
  panel.querySelector('#talent-detail-close')?.addEventListener('click', () => {
    panel.classList.add('hidden');
  });
}
