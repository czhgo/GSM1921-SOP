// role: [工程师]+[AI]
// 组织委员工作台 Tab：发展数据（T-279 M3 拆分，照 M2 样板）
// 从入党积极分子到正式党员的完整发展路径数据（管线概览 + 阶段筛选 + 只读追踪）。
// C①（2026-09-10 支书裁定）：本页为只读追踪视图，不承载任何写操作——「推进至X」直写已移除，
//   发展阶段变更一律经「成员名册 → 发起变更」（submitMemberChange）→ 支书确认后生效
//   （符合 S4 R4-1「看≠做」与唯一写位）。每张卡提供「去名册发起变更」深链（?tab=roster&highlight=）。

import { loadInspectionRecords } from '../../../services/inspection.js?v=20260917c';
// IA-C3 收敛只读展开 2026-09-06：思想汇报只读展开移除，仅留「已归档 N 篇」计数（计数沿用既有读口
// loadThoughtReports 派生 reportCount；详细查看仍去 组织台「思想汇报」tab / 成员档案）。
import { loadThoughtReports } from '../../../services/thought-report.js?v=20260917c';
import { liveMembers, PersonStore, getPersonName } from '../../../services/person.js?v=20260917c';
// S-1（2026-09-09 支书批）：成员发展档案「来源会议」溯源（只读）——从活动议程（待讨论名单）派生
import { loadActivities } from '../../../services/activity.js?v=20260917c';
// C①-补（2026-09-10）：进入当前阶段日期与「发展节点提醒」同源读口（既有覆盖存储，非新模型）
import { loadDevStageOverrides } from '../../../services/member-confirmation.js?v=20260917c';
// 数据域接线收口（2026-09-03）：支部成员名单经 services/person.js 获取（原直连 mock PEOPLE）
// 实时视图（非快照）：成员增删即时可见——见 services/person.js liveMembers 说明
const PEOPLE = liveMembers();
import { badgeHtml } from '../../../components/badges.js?v=20260917c';
import { getBasePath } from '../../../core/utils.js?v=20260917c';
// 统一检索引擎（2026-09-13 表格统一化批次 A）：候选人列表接入关键词 + 分面（≤8 行引擎自动不渲染检索条）
import { renderFilteredList, personKeyword, personFacets, roleLabelOf } from '../../../components/list-filter.js?v=20260917c';

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

// 发展党员追踪 — 数据源：PEOPLE（唯一人员数据源）+ 考察记录（只读派生）
// 2026-08-01 重构：废弃硬编码名单（原 6 条模拟字段），从 PEOPLE 派生所有非正式党员
// （积极分子/发展对象/预备党员），与人员库全系统同源一致。
// C①（2026-09-10 支书裁定）：原「推进覆盖档案」localStorage 直写（gsm1921-dev-stage-overrides）已移除——
//   阶段唯一来源 = 人员库 developStage（名册发起变更 → 支书确认 → PersonStore.saveMember 落档）。

function _isAgendaKind(a, k) {
  return (Array.isArray(a.kinds) && a.kinds.includes(k)) || a.kind === k;
}

/**
 * 成员「来源会议」溯源（S-1，只读展示）：取含该成员的发展议程（待讨论名单/成员变更）且已出结果的最新一条。
 * 结果口径：有 personResults → 取该人 passed；否则按整条 result（passed=通过）。无来源 → null。
 * @param {string} personId
 * @returns {{title:string, date:string, result:string}|null}
 */
function _sourceMeetingOf(personId) {
  const acts = loadActivities() || [];
  let best = null;
  for (const act of acts) {
    for (const a of act.agenda || []) {
      if (!(_isAgendaKind(a, 'attendee-list') || _isAgendaKind(a, 'member-change'))) continue;
      const ids = Array.isArray(a.personIds) ? a.personIds : (a.personId ? [a.personId] : []);
      if (!ids.includes(personId)) continue;
      if (!a.result && !a.recordedAt) continue; // 仅展示已出结果的议程
      const key = `${act.date || ''}|${a.recordedAt || ''}`;
      if (best && key <= best.key) continue;
      const pr = Array.isArray(a.personResults) ? a.personResults.find(r => r.personId === personId) : null;
      const passed = pr ? pr.passed === true : a.result === 'passed';
      best = {
        key,
        title: act.title || '会议',
        date: act.date || '',
        result: passed ? '通过' : '未通过',
      };
    }
  }
  return best ? { title: best.title, date: best.date, result: best.result } : null;
}

/** 从唯一人员数据源派生发展党员候选人列表（只读：阶段取人员库 developStage，不做任何写） */
function _buildCandidates() {
  const allInspections = loadInspectionRecords();
  const allReports = loadThoughtReports();
  return PEOPLE
    .filter(p => p.developStage && p.developStage !== '正式党员')
    .map(p => {
      const inspCount = allInspections.filter(r => r.personId === p.id).length;
      const reportCount = allReports.filter(r => r.personId === p.id).length;
      return {
        id: `dc_${p.id}`,
        personId: p.id,
        name: getPersonName(p.id),
        partyGroup: p.partyGroup || '',
        stage: p.developStage,
        // personFacets 取值字段（分面 auto 派生；字段缺失的维度不占位）
        developStage: p.developStage,
        role: p.role || '',
        // C③（2026-09-10 支书裁定）：无真实日期则**不显示**该行，禁止兜底假日期（原 `|| '2026-01-01'`）
        entryDate: (loadDevStageOverrides()[p.id] || {}).entryDate || null,
        inspCount,
        reportCount,
        meeting: _sourceMeetingOf(p.id),
        note: inspCount > 0 ? `已参与 ${inspCount} 次考察记录` : '培养考察中',
      };
    });
}

export function renderContent(ctx) {
  const container = document.getElementById('org-tab-content');
  if (!container) return;

  function render() {
    const candidates = _buildCandidates();

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
        ? `<span class="text-gray-500 mx-0.5">→</span>`
        : '';
      return `<span class="inline-flex items-center gap-1"><span style="width:8px;height:8px;border-radius:50%;background:${sc.dot};display:inline-block;"></span><span class="text-[12px] text-gray-600">${s}</span><span class="text-xs font-bold" style="--acc-text-dark:${sc.dot};color:color-mix(in srgb, ${sc.dot} 60%, #000);">${count}</span></span>${arrow}`;
    }).join('');

    // 候选人卡片（统一检索引擎：关键词 + 分面；行数 ≤8 时引擎自动不渲染检索条）
    const rowHtml = (c) => {
          const sc = STAGE_COLOR[c.stage];
          const stageIdx = STAGE_ORDER.indexOf(c.stage);
          const isLast = stageIdx === STAGE_ORDER.length - 1;
          const nextStage = isLast ? null : STAGE_ORDER[stageIdx + 1];
          // 姓名 → 成员档案独立页（同标签页；人名现取 getPersonName，不用记录内快照）
          const archiveHref = `${getBasePath()}person.html?id=${encodeURIComponent(c.personId)}`;
          // C① 只读化（2026-09-10 支书裁定）：移除直写「推进至X」，改为名册深链——阶段变更经名册发起、支书确认。
          const actionHtml = !isLast
            ? `<a class="dev-goto-roster-btn text-xs px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors whitespace-nowrap" href="./workspace/org.html?tab=roster&highlight=${encodeURIComponent(c.personId)}" title="发展阶段变更需在成员名册发起，经支书确认后生效（下一节点：${nextStage}）" style="text-decoration:none;">去名册发起变更 →</a>`
            : `<span class="text-xs px-2.5 py-1 rounded-md bg-green-50 text-green-700 border border-green-200">已转正</span>`;

          // 进度条（当前阶段高亮）
          const progressDots = STAGE_ORDER.map((s, i) => {
            const dotColor = i <= stageIdx ? sc.dot : '#E5E7EB';
            const isCurrent = i === stageIdx;
            return `<span style="--acc-dot-dark:${i <= stageIdx ? sc.dot : '#334155'};width:${isCurrent ? '10px' : '6px'};height:${isCurrent ? '10px' : '6px'};border-radius:50%;background:${dotColor};display:inline-block;transition:all 0.2s;"></span>`;
          }).join('<span style="--acc-bg-dark:#334155;width:12px;height:1.5px;background:#E5E7EB;display:inline-block;vertical-align:middle;"></span>');

          return `
            <div class="p-4 rounded-lg bg-white border border-gray-50 hover:shadow-sm transition-shadow" data-dev-person-id="${c.personId}">
              <div class="flex items-start justify-between gap-3 mb-2">
                <div>
                  <div class="text-sm font-semibold text-gray-800"><a href="${archiveHref}" class="hover:underline hover:text-sky-700 transition-colors" title="查看完整档案">${c.name}</a></div>
                  <div class="flex items-center flex-wrap gap-2 mt-1">
                    <span class="text-xs px-1.5 py-0.5 rounded-full ${sc.bg} ${sc.text} font-medium">${c.stage}</span>
                    ${c.partyGroup ? `<span class="text-xs text-gray-500">${c.partyGroup}</span>` : ''}
                    ${c.entryDate ? `<span class="text-xs text-gray-600">进入当前阶段：${c.entryDate}</span>` : ''}
                    ${c.meeting ? `<span class="text-xs px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100" title="来源会议（只读）">来源会议：${c.meeting.title}${c.meeting.date ? `（${c.meeting.date}）` : ''} · ${c.meeting.result}</span>` : ''}
                    ${c.inspCount > 0 ? badgeHtml(`考察 ${c.inspCount}`, 'info') : ''}
                    ${c.reportCount > 0
                      // IA-C3 收敛只读展开 2026-09-06：原「思想汇报」可展开只读内容改为计数文本（无展开交互）
                      ? `<span class="text-xs px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100" title="思想汇报已归档 ${c.reportCount} 篇">思想汇报已归档 ${c.reportCount} 篇</span>`
                      : ''}
                  </div>
                </div>
                ${actionHtml}
              </div>
              <div class="flex items-center gap-0.5 mb-2">${progressDots}</div>
              <div class="text-[12px] text-gray-500">${c.note || ''}</div>
            </div>`;
        };

    container.innerHTML = `
      <div class="card rounded-xl p-5">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-title-cn text-base font-semibold text-gray-800">发展数据</h3>
          <span class="text-xs text-gray-500" title="统计范围：本支部在册成员中尚在发展阶段的成员（积极分子/发展对象/预备党员），不含正式党员">${candidates.length} 人 · 发展中（不含正式党员）</span>
        </div>
        <p class="text-[11px] text-gray-500 mb-3">本页为只读追踪视图（发展阶段 / 进度 / 来源会议）。发展阶段变更请在「成员名册」发起、支书确认后生效——点卡片右侧「去名册发起变更」直达该成员。</p>
        <!-- 管线概览 -->
        <div class="flex items-center flex-wrap gap-1 mb-4 p-3 rounded-lg bg-gray-50">
          ${pipelineHtml}
        </div>
        <!-- 候选人列表（统一检索引擎；≤8 行不渲染检索条） -->
        <div id="org-dev-list"></div>
      </div>
    `;

    renderFilteredList(document.getElementById('org-dev-list'), {
      stateKey: 'org-development-table',
      rows: candidates,
      keyword: personKeyword(),
      facets: personFacets({ roleLabel: roleLabelOf }),
      countUnit: '人',
      listClass: 'space-y-3',
      emptyMessage: '无匹配候选人',
      rowHtml,
    });

    // C①（2026-09-10 支书裁定）：原「推进至X」直写事件（.dev-advance-btn → localStorage 覆盖档案）已移除，
    //   阶段变更唯一入口 = 名册卡片「去名册发起变更」深链（?tab=roster&highlight=<personId>）→ submitMemberChange → 支书确认。
    // IA-C3 收敛只读展开 2026-09-06：原「思想汇报」展开（.dev-reports-btn/.dev-reports-panel）
    // 渲染与切换代码已随上方计数文本改造移除——思想汇报详细查看去 组织台「思想汇报」tab / 成员档案。
  }

  render();
}
