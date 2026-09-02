// role: [工程师]+[AI]
// 组织委员工作台 Tab：发展数据（T-279 M3 拆分，照 M2 样板）
// 从入党积极分子到正式党员的完整发展路径数据（管线概览 + 阶段筛选 + 推进）。

import { loadInspectionRecords } from '../../../services/inspection.js?v=20260901h';
import { loadThoughtReports, listThoughtReportsByPerson } from '../../../services/thought-report.js?v=20260901h';
import { PEOPLE } from '../../../mock/index.js?v=20260901h';
import { badgeHtml } from '../../../components/badge.js?v=20260901h';
import { showToast } from '../../../core/utils.js?v=20260901h';

// ════════════════════════════════════════════════════════════════
//  发展党员追踪 — Mock 数据（模块私有，随模块自持）
// ════════════════════════════════════════════════════════════════

const STAGE_ORDER = ['积极分子', '发展对象', '预备党员', '正式党员'];

const STAGE_COLOR = {
  '积极分子':   { bg: 'bg-cyan-100', text: 'text-cyan-700', dot: '#06B6D4' },
  '发展对象':   { bg: 'bg-amber-100', text: 'text-amber-700', dot: '#F59E0B' },
  '预备党员':   { bg: 'bg-blue-100', text: 'text-blue-700', dot: '#3B82F6' },
  '正式党员':   { bg: 'bg-green-100', text: 'text-green-700', dot: '#10B981' },
};

// 发展党员追踪 — 数据源：PEOPLE（唯一人员数据源）+ 考察记录 + 推进覆盖档案
// 2026-08-01 重构：废弃硬编码名单（原 6 条模拟字段），从 PEOPLE 派生所有非正式党员
// （积极分子/发展对象/预备党员），与人员库全系统同源一致。
const DEV_STAGE_OVERRIDES_KEY = 'gsm1921-dev-stage-overrides';

function _loadDevOverrides() {
  try { return JSON.parse(localStorage.getItem(DEV_STAGE_OVERRIDES_KEY) || '{}'); } catch { return {}; }
}

function _saveDevOverrides(overrides) {
  try { localStorage.setItem(DEV_STAGE_OVERRIDES_KEY, JSON.stringify(overrides)); } catch {}
}

/** 从唯一人员数据源派生发展党员候选人列表 */
function _buildCandidates() {
  const overrides = _loadDevOverrides();
  const allInspections = loadInspectionRecords();
  const allReports = loadThoughtReports();
  return PEOPLE
    .filter(p => p.developStage && p.developStage !== '正式党员')
    .map(p => {
      const ov = overrides[p.id] || {};
      const inspCount = allInspections.filter(r => r.personId === p.id).length;
      const reportCount = allReports.filter(r => r.personId === p.id).length;
      return {
        id: `dc_${p.id}`,
        personId: p.id,
        name: p.name,
        partyGroup: p.partyGroup || '',
        stage: ov.stage || p.developStage,
        entryDate: ov.entryDate || '2026-01-01',
        inspCount,
        reportCount,
        note: ov.note || (inspCount > 0 ? `已参与 ${inspCount} 次考察记录` : '培养考察中'),
      };
    });
}

export function renderContent(ctx) {
  const container = document.getElementById('org-tab-content');
  if (!container) return;

  // 当前筛选状态（与单体一致：每次进入 tab 重置为 'all'）
  let _devFilter = 'all';

  function render() {
    const candidates = _buildCandidates();
    const filtered = _devFilter === 'all'
      ? candidates
      : candidates.filter(c => c.stage === _devFilter);

    // 阶段统计
    const stageCounts = {};
    for (const s of STAGE_ORDER) {
      stageCounts[s] = candidates.filter(c => c.stage === s).length;
    }

    // 管线概览条
    const pipelineHtml = STAGE_ORDER.map((s, idx) => {
      const sc = STAGE_COLOR[s];
      const count = stageCounts[s];
      const arrow = idx < STAGE_ORDER.length - 1
        ? `<span class="text-gray-300 mx-0.5">→</span>`
        : '';
      return `<span class="inline-flex items-center gap-1"><span style="width:8px;height:8px;border-radius:50%;background:${sc.dot};display:inline-block;"></span><span class="text-[12px] text-gray-600">${s}</span><span class="text-xs font-bold" style="color:${sc.dot};">${count}</span></span>${arrow}`;
    }).join('');

    // 筛选按钮
    const filterBtns = [
      { value: 'all', label: '全部' },
      ...STAGE_ORDER.map(s => ({ value: s, label: s })),
    ].map(f => {
      const isActive = _devFilter === f.value;
      const activeCls = isActive
        ? 'bg-sky-50 text-sky-700 border-sky-200'
        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50';
      return `<button class="dev-filter-btn text-[12px] px-2.5 py-1 rounded-full border transition-colors ${activeCls}" data-filter="${f.value}">${f.label}</button>`;
    }).join('');

    // 候选人卡片
    const cardsHtml = filtered.length === 0
      ? '<p class="text-xs text-gray-400 text-center py-8">当前筛选无候选人</p>'
      : filtered.map(c => {
          const sc = STAGE_COLOR[c.stage];
          const stageIdx = STAGE_ORDER.indexOf(c.stage);
          const isLast = stageIdx === STAGE_ORDER.length - 1;
          const nextStage = isLast ? null : STAGE_ORDER[stageIdx + 1];
          const advanceBtn = !isLast
            ? `<button class="dev-advance-btn text-xs px-3 py-1.5 rounded-lg bg-sky-50 text-sky-600 border border-sky-200 hover:bg-sky-100 transition-colors" data-candidate-id="${c.id}" data-next-stage="${nextStage}">推进至${nextStage}</button>`
            : `<span class="text-xs px-2.5 py-1 rounded-md bg-green-50 text-green-600 border border-green-200">已转正</span>`;

          // 进度条（当前阶段高亮）
          const progressDots = STAGE_ORDER.map((s, i) => {
            const dotColor = i <= stageIdx ? sc.dot : '#E5E7EB';
            const isCurrent = i === stageIdx;
            return `<span style="--acc-dot-dark:${i <= stageIdx ? sc.dot : '#334155'};width:${isCurrent ? '10px' : '6px'};height:${isCurrent ? '10px' : '6px'};border-radius:50%;background:${dotColor};display:inline-block;transition:all 0.2s;"></span>`;
          }).join('<span style="--acc-bg-dark:#334155;width:12px;height:1.5px;background:#E5E7EB;display:inline-block;vertical-align:middle;"></span>');

          return `
            <div class="p-4 rounded-xl bg-white border border-gray-50 hover:shadow-sm transition-shadow">
              <div class="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div class="text-sm font-semibold text-gray-800">${c.name}</div>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="text-xs px-1.5 py-0.5 rounded-full ${sc.bg} ${sc.text} font-medium">${c.stage}</span>
                    ${c.partyGroup ? `<span class="text-xs text-gray-400">${c.partyGroup}</span>` : ''}
                    <span class="text-xs text-gray-400">进入当前阶段：${c.entryDate}</span>
                    ${c.inspCount > 0 ? badgeHtml(`考察 ${c.inspCount}`, 'info') : ''}
                    ${c.reportCount > 0
                      ? `<button class="dev-reports-btn text-xs px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-colors" data-person-id="${c.personId}" data-name="${c.name}">思想汇报 ${c.reportCount}</button>`
                      : ''}
                  </div>
                </div>
                ${advanceBtn}
              </div>
              <div class="flex items-center gap-0.5 mb-2">${progressDots}</div>
              <div class="text-[12px] text-gray-500">${c.note || ''}</div>
              ${c.reportCount > 0 ? `<div class="mt-2 hidden dev-reports-panel" data-person-id="${c.personId}"></div>` : ''}
            </div>`;
        }).join('');

    container.innerHTML = `
      <div class="card rounded-xl p-5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-title-cn text-base font-semibold text-gray-800">发展数据</h3>
          <span class="text-xs text-gray-400">${candidates.length} 人</span>
        </div>
        <div class="text-xs text-gray-500 mb-4">从入党积极分子到正式党员的完整发展路径数据</div>
        <!-- 管线概览 -->
        <div class="flex items-center flex-wrap gap-1 mb-4 p-3 rounded-lg bg-gray-50">
          ${pipelineHtml}
        </div>
        <!-- 筛选栏 -->
        <div class="flex flex-wrap gap-1.5 mb-4">
          ${filterBtns}
        </div>
        <!-- 候选人列表 -->
        <div class="space-y-3">
          ${cardsHtml}
        </div>
      </div>
    `;

    // 绑定筛选事件
    container.querySelectorAll('.dev-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _devFilter = btn.dataset.filter;
        render();
      });
    });

    // 绑定推进事件
    container.querySelectorAll('.dev-advance-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const candidateId = btn.dataset.candidateId;
        const nextStage = btn.dataset.nextStage;
        const candidate = _buildCandidates().find(c => c.id === candidateId);
        if (!candidate) return;
        const confirmed = window.confirm(`确认将「${candidate.name}」从${candidate.stage}推进至${nextStage}？`);
        if (!confirmed) return;
        // 推进结果写入覆盖档案（人员库静态阶段 + 推进档案动态阶段 = 当前显示阶段）
        const overrides = _loadDevOverrides();
        overrides[candidate.personId] = {
          stage: nextStage,
          entryDate: new Date().toISOString().slice(0, 10),
          note: `已推进至${nextStage}`,
        };
        _saveDevOverrides(overrides);
        showToast('success', `「${candidate.name}」已推进至${nextStage}`);
        render();
      });
    });
    // 绑定思想汇报查看（算法归档调用侧：展开该候选人的思想汇报记录）
    container.querySelectorAll('.dev-reports-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const personId = btn.dataset.personId;
        const panel = container.querySelector(`.dev-reports-panel[data-person-id="${personId}"]`);
        if (!panel) return;
        if (!panel.classList.contains('hidden')) { panel.classList.add('hidden'); return; }
        const reports = listThoughtReportsByPerson(personId);
        panel.innerHTML = reports.length === 0
          ? '<p class="text-xs text-gray-400 text-center py-3">暂无思想汇报</p>'
          : `<div class="space-y-2 py-2">${reports.map(r => `
              <div class="p-2.5 rounded-lg bg-indigo-50/50 border border-indigo-100">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-medium text-indigo-700">${r.title || '思想汇报'}</span>
                  <span class="text-[11px] text-gray-400">${(r.submittedAt || '').slice(0, 10)}</span>
                </div>
                <p class="text-[12px] text-gray-600 whitespace-pre-wrap">${r.content || ''}</p>
              </div>`).join('')}</div>`;
        panel.classList.remove('hidden');
      });
    });
  }

  render();
}
