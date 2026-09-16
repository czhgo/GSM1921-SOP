// role: [工程师]+[AI]
// 组织委员工作台 Tab：人才库 = 发展观察（D9 裁决批二 2026-09-08 支书裁定收敛）
// 原「全量成员档案平铺 + 点击展开考察记录汇总」双视图与「成员名册」重复 → 收敛为发展观察视角：
//   · 不再平铺全量成员档案——成员档案维护（新增/编辑/删除/阶段/在册/滞留报送成员变更确认）=「成员名册」唯一全量写位；
//   · 本页 = 按发展阶段分组的只读发展观察卡（每人：姓名/阶段徽标/考察摘要 N 条/思想汇报已归档 N/发展提示）；
//   · 发展提示按 member-confirmation（待支书确认/已确认阶段变更留痕）+ thought-report + inspection 数据推算；
//   · 读侧数据不动写（无任何保存/报送控件）；「发展数据」页维持管线推进（不重复建设）。
// 保留「人才库=发展观察、名册=档案维护」页内注释与引导文案。

import { loadInspectionRecords } from '../../../services/inspection.js?v=20260916a';
import { loadThoughtReports } from '../../../services/thought-report.js?v=20260916a';
import { PersonStore, getPersonName } from '../../../services/person.js?v=20260916a';
// 数据域接线收口（2026-09-03）：支部成员名单经 services/person.js 获取（原直连 mock PEOPLE）
import { getResidenceOf } from '../../../services/roster.js?v=20260916a';
// Q-21-3 收敛（2026-09-13）：在册状态枚举单一源 = core/constants.js（原经 roster.js 转出）
import { RESIDENCE } from '../../../core/constants.js?v=20260916a';
// B5（2026-09-12）：搜索 + 阶段/党小组筛选已统一接入 components/list-filter.js（分面枚举由引擎 auto 派生）
import { listPendingConfirmations, lastApprovedStageChange } from '../../../services/member-confirmation.js?v=20260916a';
import { escHtml as esc, flashHighlight, getBasePath } from '../../../core/utils.js?v=20260916a';
// 统一检索引擎（2026-09-13 表格统一化批次 A）：成员卡列表接入关键词 + 分面（替代原手写三控件显隐过滤）
import { renderFilteredList, personKeyword, personFacets, roleLabelOf } from '../../../components/list-filter.js?v=20260916a';

// 发展阶段顺序（发展流程正向：入党申请人 → 积极分子 → 发展对象 → 预备党员 → 正式党员）
const STAGE_ORDER = ['积极分子', '发展对象', '预备党员', '正式党员'];

// 发展阶段徽标配色（仅展示）
const STAGE_BADGE = {
  '积极分子': 'bg-cyan-50 text-cyan-700 border border-cyan-100',
  '发展对象': 'bg-amber-50 text-amber-700 border border-amber-100',
  '预备党员': 'bg-blue-50 text-blue-700 border border-blue-100',
  '正式党员': 'bg-green-50 text-green-700 border border-green-100',
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
 *  1. 有待支书确认的阶段/在册变更 → 「{…}变更待支书确认（from → to）」
 *  2. 发展中（非正式党员）且无考察记录 → 「尚无考察记录，发展材料待积累」
 *  3. 发展中且无思想汇报归档 → 「尚未归档思想汇报」
 *  4. 预备党员：最后一次经成员变更确认进入预备党员阶段满一年 → 「预备期已满（起算日满一年），可启动转正流程」；
 *     满 9 个月未满一年 → 「预备期将满（起算日），可筹备转正申请」
 */
function _devTip(person, counts, ctx) {
  const mc = ctx.pendingByPerson.get(person.id);
  if (mc) {
    return {
      cls: 'bg-amber-50 text-amber-700 border border-amber-100',
      text: `${mc.action === 'residence' ? '在册状态' : '发展阶段'}变更待支书确认（${mc.from || ''} → ${mc.to || ''}）`,
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
        return { cls: 'bg-green-50 text-green-700 border border-green-100', text: `预备期已满（${String(ch.at).slice(0, 10)} 起满一年），可启动转正流程`, jump: true };
      }
      if (months >= 9) {
        return { cls: 'bg-green-50 text-green-700 border border-green-100', text: `预备期将满（${String(ch.at).slice(0, 10)} 起），可筹备转正申请`, jump: true };
      }
    }
  }
  return null;
}

export function renderContent(ctx) {
  const container = document.getElementById('org-tab-content');
  if (!container) return;

  // B5（2026-09-12）：统一统计范围 = 本支部在册成员（branchId 非空，不含党委组织员等非本支部人员），
  // 与「成员名册」_branchMembers 同口径（旧实现直取 PersonStore.getMembers 多算 1 人）。
  const people = PersonStore.getMembers().filter(p => p.branchId !== null && p.branchId !== undefined);
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

  // 行序按发展阶段（未标注置末位）——原「按阶段分组」的视觉分组由分面「发展阶段」承担
  const stageRank = (p) => {
    const i = STAGE_ORDER.indexOf(p.developStage);
    return i === -1 ? STAGE_ORDER.length : i;
  };
  const rows = [...people].sort((a, b) => stageRank(a) - stageRank(b));

  // 发展提示一次性推算（顶部统计条「提示计数」与卡片共用，避免重复计算）
  const tipByPerson = new Map();
  for (const p of people) tipByPerson.set(p.id, _devTip(p, { insp: inspCount, thought: thoughtCount }, { pendingByPerson }));
  const tipCount = [...tipByPerson.values()].filter(Boolean).length;

  // 统一检索引擎行渲染（关键词 + 分面；≤8 行引擎自动不渲染检索条）
  const rowHtml = (p) => {
        const badgeCls = STAGE_BADGE[p.developStage] || 'bg-gray-50 text-gray-500 border border-gray-100';
        // 深色适配（R-11）：bg-cyan-50 无深色分支（styles.css 未覆盖），补内联深色三件套
        const badgeDark = p.developStage === '积极分子' ? ' --acc-bg-dark:rgba(6,182,212,0.16);--acc-text-dark:#67E8F9;--acc-border-dark:rgba(6,182,212,0.35);' : '';
        const last = lastInsp[p.id];
        const tip = tipByPerson.get(p.id);
        // 姓名 → 成员档案独立页（同标签页；人名现取 getPersonName）
        const archiveHref = `${getBasePath()}person.html?id=${encodeURIComponent(p.id)}`;
        // 实体条目可点（2026-09-12 支书裁定）：成员卡 = 成员实体 → 点击 1 跳直达「成员名册」并高亮该成员
        //（复用既有深链 workspace/org.html?tab=roster&highlight=<personId>，与 development-tab「去名册发起变更」同源）
        // 2026-09-13：卡内姓名改为真实 <a>（档案页）——HTML 不允许 <a> 嵌套，故整卡跳转改由下方事件委托承担
        return `
          <div class="p-3 rounded-xl bg-white border border-gray-50 hover:border-gray-100 transition-colors">
            <div class="talent-card block cursor-pointer" data-roster-jump="${esc(p.id)}" title="查看成员档案（成员名册）">
              <div class="flex items-center gap-2 flex-wrap">
                <a href="${archiveHref}" class="text-sm font-semibold text-gray-800 hover:underline hover:text-sky-700 transition-colors" title="查看完整档案">${esc(getPersonName(p.id))}</a>
                <span class="text-[11px] px-1.5 py-0.5 rounded-full ${badgeCls}" style="${badgeDark}">${esc(p.developStage || STAGE_OTHER)}</span>
                ${p.partyGroup ? `<span class="text-[11px] text-gray-500">${esc(p.partyGroup)}</span>` : ''}
                ${_residenceChipHtml(p)}
              </div>
              ${last ? `
                <div class="text-[11px] text-gray-500 mt-1 truncate" title="${esc(last.content || '')}${last.recordedAt ? '（' + esc(String(last.recordedAt).slice(0, 10)) + '）' : ''}">
                  最近考察：${esc(_truncate(last.content || last.role || '', 28))}${last.recordedAt ? `（${esc(String(last.recordedAt).slice(0, 10))}）` : ''}
                </div>` : ''}
              ${tip && !tip.jump ? `<div class="mt-1.5 text-[11px] px-2 py-1 rounded-md border ${tip.cls}">${esc(tip.text)}</div>` : ''}
            </div>
            ${tip && tip.jump
              ? `<button type="button" class="talent-dev-jump mt-1.5 text-[11px] px-2 py-1 rounded-md border w-full text-left ${tip.cls} hover:opacity-90 transition-opacity" data-person-id="${p.id}" style="cursor:pointer;">${esc(tip.text)} · 去发展数据 →</button>`
              : ''}
          </div>`;
  };

  container.innerHTML = `
    <div class="card rounded-xl p-5">
      <div class="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">人才库</h3>
        <div class="flex items-center flex-wrap justify-end gap-x-3 gap-y-0.5 text-xs text-gray-500">
          <span title="统计范围：本支部在册成员（不含党委组织员等非本支部人员），与「成员名册」同口径">成员 <span class="tabular-nums font-medium text-gray-700">${people.length}</span> 人<sup class="ml-0.5 text-gray-400">†</sup></span>
          <span>考察摘要 <span class="tabular-nums font-medium text-gray-700">${inspections.filter(r => r && r.personId).length}</span> 条</span>
          <span>思想汇报已归档 <span class="tabular-nums font-medium text-gray-700">${thoughts.filter(t => t && t.personId).length}</span> 篇</span>
          <span>发展提示 <span class="tabular-nums font-medium ${tipCount > 0 ? 'text-amber-700' : 'text-gray-700'}">${tipCount}</span> 人</span>
        </div>
      </div>
      <p class="text-[11px] text-gray-400 mb-1">† 口径：本支部在册成员（不含党委组织员等非本支部人员）；「发展数据」仅统计尚在发展阶段的成员（不含正式党员）。</p>
      <div class="text-[11px] text-gray-500 leading-relaxed bg-gray-50 rounded-lg p-2.5 mb-2">
        人才库 = <b>发展观察</b>（只读画像，按发展阶段分组）——发展提示数据驱动推算（逐人考察 / 思想汇报明细见「发展数据」）。
        成员档案维护（新增 / 编辑 / 阶段 / 在册 / 滞留报送成员变更确认）= 「成员名册」（唯一全量写位）；
        发展推进与阶段变更 = 「发展数据」；思想汇报初阅 = 「思想汇报」；本页读侧数据不动写。
      </div>
      <div id="talent-list"></div>
    </div>`;

  // 统一检索引擎：关键词（姓名/学号）+ 分面（党小组/发展阶段/角色/在册）——≤8 行引擎自动不渲染检索条
  renderFilteredList(container.querySelector('#talent-list'), {
    stateKey: 'org-talent-table',
    rows,
    keyword: personKeyword(),
    facets: personFacets({ roleLabel: roleLabelOf }),
    countUnit: '人',
    listClass: 'grid grid-cols-1 md:grid-cols-2 gap-2',
    emptyMessage: '暂无成员档案',
    rowHtml,
  });

  // 「转正提示」→ 切「发展数据」tab 并定位该成员卡片（T-279 development-tab 定位）
  // 事件委托（容器持久）：引擎筛选重渲染后行内按钮仍可点；dataset 守卫防重复绑定
  if (!container.dataset.talentJumpBound) {
    container.dataset.talentJumpBound = '1';
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.talent-dev-jump');
      if (btn) {
        const pid = btn.dataset.personId;
        const tabBtn = document.querySelector('.org-tab-btn[data-org-tab="development"]');
        if (!tabBtn) return;
        tabBtn.click();
        let attempts = 0;
        const tryLocate = () => {
          const card = document.querySelector(`[data-dev-person-id="${pid}"]`);
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            flashHighlight(card);
          } else if (attempts < 20) { attempts++; setTimeout(tryLocate, 200); }
        };
        setTimeout(tryLocate, 100);
        return;
      }
      // 成员卡整体深链名册（原 <a> 直链）：卡内真实链接（姓名 → 档案页）优先，不与其抢跳
      if (e.target.closest('a')) return;
      const card = e.target.closest('.talent-card');
      if (card && card.dataset.rosterJump) {
        window.location.href = getBasePath() + 'workspace/org.html?tab=roster&highlight=' + encodeURIComponent(card.dataset.rosterJump);
      }
    });
  }
}
