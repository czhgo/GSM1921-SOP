// role: [工程师]+[AI]
// 组织委员工作台 Tab：人才库 = 发展观察（D9 裁决批二 2026-09-08 书记裁定收敛）
// 原「全量成员档案平铺 + 点击展开考察记录汇总」双视图与「成员名册」重复 → 收敛为发展观察视角：
//   · 不再平铺全量成员档案——成员档案维护（新增/编辑/删除/阶段/在册/滞留报送确权）=「成员名册」唯一全量写位；
//   · 本页 = 按发展阶段分组的只读发展观察卡（每人：姓名/阶段徽标/考察摘要 N 条/思想汇报已归档 N/发展提示）；
//   · 发展提示按 member-confirmation（待书记确认/已确认阶段变更留痕）+ thought-report + inspection 数据推算；
//   · 读侧数据不动写（无任何保存/报送控件）；「发展数据」页维持管线推进（不重复建设）。
// 保留「人才库=发展观察、名册=档案维护」页内注释与引导文案。

import { loadInspectionRecords } from '../../../services/inspection.js?v=20260907b';
import { loadThoughtReports } from '../../../services/thought-report.js?v=20260907b';
import { PersonStore } from '../../../services/person.js?v=20260907b';
// 数据域接线收口（2026-09-03）：支部成员名单经 services/person.js 获取（原直连 mock PEOPLE）
import { getResidenceOf, RESIDENCE } from '../../../services/roster.js?v=20260903c';
import { listPendingConfirmations, lastApprovedStageChange } from '../../../services/member-confirmation.js?v=20260907b';
import { escHtml as esc } from '../../../core/utils.js?v=20260903c';

// 发展阶段顺序（发展流程正向：入党申请人 → 积极分子 → 发展对象 → 预备党员 → 正式党员）
const STAGE_ORDER = ['积极分子', '发展对象', '预备党员', '正式党员'];

// 发展阶段徽标配色（仅展示）
const STAGE_BADGE = {
  '积极分子': 'bg-cyan-50 text-cyan-700 border border-cyan-100',
  '发展对象': 'bg-amber-50 text-amber-700 border border-amber-100',
  '预备党员': 'bg-blue-50 text-blue-700 border border-blue-100',
  '正式党员': 'bg-green-50 text-green-700 border border-green-100',
};
const STAGE_DOT = {
  '积极分子': '#06B6D4',
  '发展对象': '#F59E0B',
  '预备党员': '#3B82F6',
  '正式党员': '#10B981',
};

/** 缺省发展阶段（档案未标注阶段的人员归此组，置于末位） */
const STAGE_OTHER = '未标注';

// ── S1–S4 滞留党员：行内「滞留」徽标（在校不展示，减少噪音；详情/名册可查备注与留痕）──
function _residenceChipHtml(p) {
  const rs = getResidenceOf(p);
  if (rs.residenceStatus !== RESIDENCE.DETAINED) return '';
  return `<span class="text-[11px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100" title="${esc(rs.residenceNote || '滞留：组织关系保留、应到剔除、通知照发')}">滞留</span>`;
}

/** 文本截断（发展观察摘要行用） */
function _truncate(text, len) {
  const s = String(text || '').trim();
  return s.length > len ? s.slice(0, len) + '…' : s;
}

/** 距今天的月份数（近似满期提示用；dateStr 非法返回 0） */
function _monthsSince(dateStr, now = new Date()) {
  const d = new Date(String(dateStr || '').slice(0, 10) + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return 0;
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
}

/**
 * 发展提示（按 member-confirmation / thought-report / inspection 数据推算；无依据返回 null）
 * 规则（全部可解释、不造假）：
 *  1. 有待书记确认的阶段/在册变更 → 「{…}变更待书记确认（from → to）」
 *  2. 发展中（非正式党员）且无考察记录 → 「尚无考察记录，发展材料待积累」
 *  3. 发展中且无思想汇报归档 → 「尚未归档思想汇报」
 *  4. 预备党员：最后一次经确权确认进入预备党员阶段满一年 → 「预备期已满（起算日满一年），可启动转正流程」；
 *     满 9 个月未满一年 → 「预备期将满（起算日），可筹备转正申请」
 */
function _devTip(person, counts, ctx) {
  const mc = ctx.pendingByPerson.get(person.id);
  if (mc) {
    return {
      cls: 'bg-amber-50 text-amber-700 border border-amber-100',
      text: `${mc.action === 'residence' ? '在册状态' : '发展阶段'}变更待书记确认（${mc.from || ''} → ${mc.to || ''}）`,
    };
  }
  const inspCount = counts.insp[person.id] || 0;
  const thoughtCount = counts.thought[person.id] || 0;
  if (person.developStage && person.developStage !== '正式党员') {
    if (inspCount === 0) return { cls: 'bg-gray-50 text-gray-500', text: '尚无考察记录，发展材料待积累' };
    if (thoughtCount === 0) return { cls: 'bg-gray-50 text-gray-500', text: '尚未归档思想汇报' };
  }
  if (person.developStage === '预备党员') {
    const ch = lastApprovedStageChange(person.id);
    if (ch && ch.at) {
      const months = _monthsSince(ch.at);
      if (months >= 12) {
        return { cls: 'bg-green-50 text-green-700 border border-green-100', text: `预备期已满（${String(ch.at).slice(0, 10)} 起满一年），可启动转正流程` };
      }
      if (months >= 9) {
        return { cls: 'bg-green-50 text-green-600 border border-green-100', text: `预备期将满（${String(ch.at).slice(0, 10)} 起），可筹备转正申请` };
      }
    }
  }
  return null;
}

export function renderContent(ctx) {
  const container = document.getElementById('org-tab-content');
  if (!container) return;

  const people = PersonStore.getMembers();
  const inspections = loadInspectionRecords();
  const thoughts = loadThoughtReports();
  const pendings = listPendingConfirmations();

  // 一次性分组（每人查表 O(1)）
  const inspCount = {};
  const lastInsp = {};
  for (const r of inspections) {
    if (!r || !r.personId) continue;
    inspCount[r.personId] = (inspCount[r.personId] || 0) + 1;
    const prev = lastInsp[r.personId];
    if (!prev || String(r.recordedAt || '').localeCompare(String(prev.recordedAt || '')) > 0) lastInsp[r.personId] = r;
  }
  const thoughtCount = {};
  for (const t of thoughts) {
    if (t && t.personId) thoughtCount[t.personId] = (thoughtCount[t.personId] || 0) + 1;
  }
  const pendingByPerson = new Map(pendings.filter(r => r && (r.action === 'developStage' || r.action === 'residence')).map(r => [r.personId, r]));

  // 按发展阶段分组（未标注置末位）
  const byStage = new Map(STAGE_ORDER.map(s => [s, []]));
  byStage.set(STAGE_OTHER, []);
  for (const p of people) {
    const key = STAGE_ORDER.includes(p.developStage) ? p.developStage : STAGE_OTHER;
    byStage.get(key).push(p);
  }

  const stageGroupsHtml = [...STAGE_ORDER, STAGE_OTHER]
    .filter(s => (byStage.get(s) || []).length > 0)
    .map(s => {
      const members = byStage.get(s);
      const dot = STAGE_DOT[s] || '#94A3B8';
      const cardsHtml = members.map(p => {
        const badgeCls = STAGE_BADGE[p.developStage] || 'bg-gray-50 text-gray-500 border border-gray-100';
        const last = lastInsp[p.id];
        const tip = _devTip(p, { insp: inspCount, thought: thoughtCount }, { pendingByPerson });
        return `
          <div class="p-3 rounded-xl bg-white border border-gray-50 hover:border-gray-100 transition-colors">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-sm font-semibold text-gray-800">${esc(p.name)}</span>
              <span class="text-[11px] px-1.5 py-0.5 rounded-full ${badgeCls}">${esc(p.developStage || s)}</span>
              ${p.partyGroup ? `<span class="text-[11px] text-gray-400">${esc(p.partyGroup)}</span>` : ''}
              ${_residenceChipHtml(p)}
            </div>
            <div class="mt-1.5 flex items-center flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
              <span>考察摘要 <span class="tabular-nums font-medium text-gray-700">${inspCount[p.id] || 0}</span> 条</span>
              <span>思想汇报已归档 <span class="tabular-nums font-medium text-gray-700">${thoughtCount[p.id] || 0}</span> 篇</span>
            </div>
            ${last ? `
              <div class="text-[11px] text-gray-400 mt-1 truncate" title="${esc(last.content || '')}${last.recordedAt ? '（' + esc(String(last.recordedAt).slice(0, 10)) + '）' : ''}">
                最近考察：${esc(_truncate(last.content || last.role || '', 28))}${last.recordedAt ? `（${esc(String(last.recordedAt).slice(0, 10))}）` : ''}
              </div>` : ''}
            ${tip ? `<div class="mt-1.5 text-[11px] px-2 py-1 rounded-md border ${tip.cls}">${esc(tip.text)}</div>` : ''}
          </div>`;
      }).join('');
      return `
        <div class="mt-4">
          <div class="flex items-center gap-2 mb-2">
            <span class="inline-block w-2 h-2 rounded-full flex-shrink-0" style="background:${dot};"></span>
            <span class="text-xs font-bold text-gray-700">${esc(s)}</span>
            <span class="text-xs text-gray-400 tabular-nums">${members.length} 人</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">${cardsHtml}</div>
        </div>`;
    }).join('');

  container.innerHTML = `
    <div class="card rounded-xl p-5">
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">人才库</h3>
        <span class="text-xs text-gray-400">${people.length} 人</span>
      </div>
      <div class="text-[11px] text-gray-400 leading-relaxed bg-gray-50 rounded-lg p-2.5 mb-1">
        人才库 = <b>发展观察</b>（只读画像，按发展阶段分组）——考察摘要 / 思想汇报归档 / 发展提示数据驱动推算。
        成员档案维护（新增 / 编辑 / 阶段 / 在册 / 滞留报送确权）= 「成员名册」（唯一全量写位）；
        发展推进与阶段变更 = 「发展数据」；思想汇报初阅 = 「思想汇报」；本页读侧数据不动写。
      </div>
      ${stageGroupsHtml || '<p class="text-xs text-gray-400 text-center py-8">暂无成员档案</p>'}
    </div>`;
}
