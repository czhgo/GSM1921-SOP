// role: [工程师]+[AI]
// entries/tabs/secretary/calendar-tab.js — 支书工作台·活动管理 tab（懒加载模块）
// 2026-08-07 自 ws-secretary-entry.js 拆分：统计条 + 活动日历 + 写入活动悬浮表单 + 活动查询。
// D4 裁决批二（2026-09-08）：「考勤概况」独立卡移除 → 考勤作为活动字段入「活动查询」行内只读摘要。

import { getAppState, setState } from '../../../core/base/state.js?v=20261102b';
import { showToast, escHtml as esc, todayLocal, describeWriteError } from '../../../core/base/utils.js?v=20261102b';
import { renderDisclosure } from '../../../components/ui/disclosure.js?v=20261102b';
import { populateMonthSelector, renderCalendarByActivities } from '../../../components/record/calendar.js?v=20261102b';
import { renderInspectorFromState, _draftMaterialCount } from '../../../components/record/inspector.js?v=20261102b';
// 2026-11-01 批次 524（#7）：待办深链消费（PendingTarget）+ 复用既有活动锚点定位
import { PendingTarget } from '../../../core/session/pending-target.js?v=20261102b';
import { focusActivityAnchor } from '../../../components/ui/detail-anchor.js?v=20261102b';
// Task 6：支书「活动管理」内的条目走 locate——同页 inspector 预览 + 「打开完整页」。
import { objectDetailHref } from '../../../core/domain/object-route.js?v=20261102b';
import { computeSecretaryStats } from '../../../services/core/roles.js?v=20261102b';
import { PersonPicker } from '../../../components/governance/pickers.js?v=20261102b';
import { renderWorkgroupPermissionEditor, readWorkgroupPermissionEditor } from '../../../components/governance/workgroup-permissions.js?v=20261102b';
import { openModal, closeModal, confirmNudge, confirmWriteWithoutGrant } from '../../../components/ui/modal.js?v=20261102b';
// 批次 524（F · 输入单一源）：布局中立的控件积木（只出控件本体，不套 label / 外边距）
import { textInput, selectInput } from '../../../components/ui/forms.js?v=20261102b';
import { DecisionTreeState, renderWorkflowPanel, writeActivityWithSOP } from '../../../services/activity/decision-tree.js?v=20261102b';
import { loadActivities, listBrandProposals } from '../../../services/activity/activity.js?v=20261102b';
import { icon } from '../../../core/base/icons.js?v=20261102b';
import { liveMembers, PersonStore, getPersonName } from '../../../services/member/person.js?v=20261102b';
// 数据域接线收口（2026-09-03）：支部成员名单经 services/member/person.js 获取（原直连 mock PEOPLE）
// 实时视图（非快照）：成员增删即时可见——见 services/member/person.js liveMembers 说明
import { emptyStateHtml } from '../../../components/ui/empty-state.js?v=20261102b';
const PEOPLE = liveMembers();
import { NoticeStore } from '../../../services/governance/notice.js?v=20261102b';
import { BranchService } from '../../../services/core/runtime.js?v=20261102b';
import { DEFAULT_BRANCH_ID, ACTIVITY_CLASSIFICATION, classifyActivityType, normalizeActivityType, dotDarkVars, SCENARIO_WRITE_IDS, SCENARIO_LABELS, ROLE_LABELS, PROJECT_ROLES, ACTIVITY_SCOPES, isBranchLevelScenario } from '../../../core/domain/constants.js?v=20261102b';
// 责任党小组清单唯一来源（2026-10-21 批次 499：活动必须落到唯一责任党小组）
import { loadPartyGroups } from '../../../services/member/party-group.js?v=20261102b';
// R1-A 点⑤（2026-09-09）：强调色渲染统一 person-aware 动态解析（替代模块级 resolveAccentRole 快照）
import { getAppliedAccentColors } from '../../../core/boot/theme.js?v=20261102b';
import { collectAgendaRows, buildAgendaCandidates, AGENDA_CANDIDATE_GROUPS } from './agenda-form.js?v=20261102b';
import { defaultVoteConfig, isDecisionScenario, resolveVoterIds, resolveParticipantIds, isAnonymousForced } from '../../../services/activity/vote-config.js?v=20261102b';
import { AuthStore } from '../../../services/core/auth.js?v=20261102b';
import { getBranchIdOfPerson, getBranchById, getBranchOutputBlocks, applyWorkflowBlockPolicy, getWorkflowBlockFieldPolicy, getWorkflowBlockParticipantPolicy } from '../../../services/branch/branch.js?v=20261102b';
import { generateId } from '../../../core/base/id.js?v=20261102b';
import { validateAgendaStructure } from '../../../services/activity/agenda-relations.js?v=20261102b';
// 支部文件读侧收敛点（2026-09-10）：会前草案下拉经 branch-doc 服务读取（按归属支部过滤，跨支部不可见）
import { listDocs as listBranchDocs, isAgendaDraftDoc } from '../../../services/branch/branch-doc.js?v=20261102b';
// L3 S4（2026-09-03）：主题党日工作流块 manifest 驱动试点（入口守卫 + 表单元数据单一源）
import { BLOCK_MANIFESTS, THEME_PARTY_DAY_MANIFEST, THREE_MEETINGS_MANIFESTS } from '../../../workflow/blocks/manifests.js?v=20261102b';
// B1（2026-09-12）：党委下钻支部的演示只读视图判定（单一源 = services/core/branch-demo-nav.js）
import { isReadonlyBranchDrilldown } from '../../../services/core/branch-demo-nav.js?v=20261102b';
import { renderTabHeader, renderCardHeader } from '../../../components/shell/page-frame.js?v=20261102b';
// 2026-10-25 IA 62→45：本页**只承担活动生命周期**——原「活动查询」折叠区（`renderQueryView`）与
//   「党小组活动」独立卡已删：关键词 / 类别 / 品牌 / 党小组活动统一为日历工具栏的筛选控件（同一屏、一次点击）；
//   项目赋权整卡（`mountActivityProjectAuth`）已移出——专班赋权回组织台「专班管理」，活动赋权在活动详情
//   （工作组组织者 / 深度参与者编辑器），本页不再同时承担「生命周期」与「权限分配」。

// 生效强调色 hex（R1-A 点⑤：登录人强调色=person 键覆盖，禁止模块加载期快照写死——
// 一律渲染时经 getAppliedAccentColors 动态解析，改色后随重渲染/刷新生效，与 --app-accent 同源）
function _accentHex() {
  return getAppliedAccentColors('secretary').accent;
}

// ── 责任党小组与跨组招募（2026-10-21 批次 499 · 支书补充口径）───────────────
// 跨组只是参与/招募范围，活动仍须落到唯一责任党小组；组织者一般本组，
// 跨党小组深度参与者由组织委员协调。判据与服务端 activityCreationDeny /
// validAssignments 同口径——本处只做表单呈现与提交前软提示，不另立规则。
function _currentBranchId() {
  const me = AuthStore.getCurrentUser();
  return me?.branchId || getBranchIdOfPerson(me?.personId) || DEFAULT_BRANCH_ID;
}

/** 本支部活组（显示顺序＝组序） */
function _branchPartyGroups() {
  const branchId = _currentBranchId();
  return loadPartyGroups()
    .filter((g) => g.status === 'active' && (g.branchId || DEFAULT_BRANCH_ID) === branchId)
    .sort((a, b) => (Number(a.seq) || 0) - (Number(b.seq) || 0));
}

/** 本支部组织委员（跨组深参的默认协调人） */
function _orgCommissionerId() {
  const branchId = _currentBranchId();
  return PEOPLE.find((p) => p.role === 'org-commissioner' && (p.branchId || DEFAULT_BRANCH_ID) === branchId)?.id || '';
}

/** 当前表单里已选的责任组 */
function _selectedHostGroup() {
  const id = wp.hostGroupId || '';
  return _branchPartyGroups().find((g) => g.id === id) || null;
}

/** 赋权名单里跨党小组的深度参与者 / 组织者（用于提交前软提示与留痕） */
function _pendingAuthCrossGroup() {
  const group = _selectedHostGroup();
  if (!group) return { deep: [], organizers: [] };
  const deep = [];
  const organizers = [];
  for (const item of (wp.pendingAuth || [])) {
    const person = PersonStore.getById(item.personId) || PEOPLE.find((p) => p.id === item.personId);
    if (!person?.partyGroup || person.partyGroup === group.name) continue;
    if (item.role === 'deep') deep.push(person);
    if (item.role === 'organizer') organizers.push(person);
  }
  return { deep, organizers };
}

function _renderOrganizingScopeSection(scenarioId) {
  const groups = _branchPartyGroups();
  let html = `<div class="mb-3 card rounded-xl p-4" id="wp-organizing-scope">`;
  html += `<p class="text-xs font-medium text-gray-700 mb-1.5">组织落点</p>`;
  if (isBranchLevelScenario(scenarioId)) {
    html += `<p class="text-xs text-gray-600 leading-5">支部级法定会议：由支委会 / 党员大会 / 党课统一组织，<b>不指定承办党小组</b>。</p>`;
    html += `</div>`;
    return html;
  }
  html += `<label for="wp-host-group" class="text-xs text-gray-500 mb-1.5 block font-medium">承办党小组 <span class="text-red-600">*</span></label>`;
  html += selectInput({
    id: 'wp-host-group',
    options: [{ value: '', label: '请选择承办党小组' }, ...groups.map((g) => ({ value: g.id, label: g.name }))],
    value: wp.hostGroupId || '',
    className: 'w-full',
    attrs: 'aria-describedby="wp-host-group-hint"',
  });
  html += `<p id="wp-host-group-hint" class="text-xs text-gray-500 mt-1">跨组只影响招募范围；活动始终落到该承办党小组。</p>`;
  html += `<label class="flex items-start gap-2 text-xs text-gray-700 mt-2.5"><input type="checkbox" id="wp-cross-recruit" class="checkbox-accent mt-0.5"${wp.crossRecruit ? ' checked' : ''}><span>需从其他党小组招募深度参与者<span class="text-gray-500">（由组织委员协调）</span></span></label>`;
  const coordinatorId = _orgCommissionerId();
  html += `<p class="text-xs text-gray-500 mt-1">协调人：${coordinatorId ? esc(getPersonName(coordinatorId) || coordinatorId) + '（组织委员）' : '本支部未配置组织委员，暂不能跨组招募'}</p>`;
  const cross = _pendingAuthCrossGroup();
  const exceptionReason = wp.organizerExceptionReason || '';
  html += `<div class="mt-2.5${cross.organizers.length ? '' : ' hidden'}" id="wp-organizer-exception-slot">`;
  html += `<label for="wp-organizer-exception" class="text-xs text-gray-500 mb-1 block font-medium">组织者跨组说明 <span class="text-red-600">*</span></label>`;
  html += textInput({
    id: 'wp-organizer-exception',
    value: exceptionReason,
    placeholder: '组织者一般由承办党小组承担，请说明本次由他组同志承担的原因',
    className: 'w-full',
  });
  html += `<p class="text-xs text-amber-700 mt-1">组织者一般由本组承担；确需他组同志时，说明将随活动留存（不阻断）。</p>`;
  html += `</div>`;
  html += `<p id="wp-cross-deep-note" class="text-xs text-amber-700 mt-2${cross.deep.length ? '' : ' hidden'}">${cross.deep.length ? `已在名单中的跨组深参：${cross.deep.map((p) => esc(p.name || p.id)).join('、')}——提交后由组织台「跨组招募待协调」跟进。` : ''}</p>`;
  html += `</div>`;
  return html;
}

/** 责任组 / 跨组招募与赋权名单联动（不重绘整个面板，避免丢已填内容） */
function _syncOrganizingScopeUI(container) {
  const hostSelect = container.querySelector('#wp-host-group');
  if (hostSelect) wp.hostGroupId = hostSelect.value || '';
  const recruit = container.querySelector('#wp-cross-recruit');
  if (recruit) wp.crossRecruit = !!recruit.checked;
  const cross = _pendingAuthCrossGroup();
  // 名单里出现跨组深参 ⇒ 自动标记跨组招募（不自动勾选会被服务端拒绝，属假成功）
  if (cross.deep.length && recruit && !recruit.checked) {
    recruit.checked = true;
    wp.crossRecruit = true;
    showToast('warn', '已标记跨组招募：跨党小组深度参与者由组织委员协调');
  }
  const slot = container.querySelector('#wp-organizer-exception-slot');
  if (slot) slot.classList.toggle('hidden', cross.organizers.length === 0);
  const deepNote = container.querySelector('#wp-cross-deep-note');
  if (deepNote) {
    deepNote.classList.toggle('hidden', cross.deep.length === 0);
    deepNote.textContent = cross.deep.length
      ? `已在名单中的跨组深参：${cross.deep.map((p) => p.name || p.id).join('、')}——提交后由组织台「跨组招募待协调」跟进。`
      : '';
  }
}

// L3 S4：主题党日块 id 由 manifest 单一源派生（2026-09-03 去重收口，勿再手写字符串）
const THEME_DAY_BLOCK_ID = THEME_PARTY_DAY_MANIFEST.blockId;
// L3 铺开（2026-09-28 批次 248）：三会一课四场景各有块（blockId ＝ 场景 id）；
//   入口守卫＝支部停用某块 ⇒ 该场景的模板按钮消失（与主题党日块同判据）。
const THREE_MEETING_BLOCK_IDS = new Set(THREE_MEETINGS_MANIFESTS.map((m) => m.blockId));
function _myBranchBlocks() {
  try {
    const me = AuthStore.getCurrentUser();
    return getBranchOutputBlocks(getBranchIdOfPerson(me?.personId));
  } catch { return null; }
}
/** 当前支部可用工作流块 id 集（manifest 目录 − config.blocks.workflowBlocks 隐藏） */
function _enabledWorkflowBlocks() {
  return new Set(applyWorkflowBlockPolicy(BLOCK_MANIFESTS.map(m => m.blockId), _myBranchBlocks()));
}
/** 主题党日块输入字段元数据（表单条目声明；无块/无字段回退硬编码等价项） */
function _themeField(fieldId) {
  return THEME_PARTY_DAY_MANIFEST?.inputs?.fields?.find(f => f.fieldId === fieldId) || null;
}

// ② 表单条目轴（契约 §8.2，2026-09-29 批次 275）：当前模板 → 工作流块 id → 字段策略。
//   · 块 id 来源：主题党日 = THEME_DAY_BLOCK_ID；三会一课 = 场景 id（blockId ≡ scenarioId）。
//     其它模板（专班招募 / 表决类等）**无块** ⇒ 策略不生效、面板维持原样（默认零影响）。
//   · 支部可配面只开两类：hiddenFieldIds（字段启停）/ requiredOverrides（必填覆盖）。
function _currentBlockId() {
  if (wp.selections.L1 === 'theme-day') return THEME_DAY_BLOCK_ID;
  const sid = wp.selections._scenarioId || wp.getScenarioId?.();
  return (sid && THREE_MEETING_BLOCK_IDS.has(sid)) ? sid : null;
}
/** 当前模板对应块的字段策略（无块 ⇒ 全开 / 无覆盖） */
function _currentFieldPolicy() {
  const blockId = _currentBlockId();
  if (!blockId) return { hidden: new Set(), requiredOverrides: {} };
  return getWorkflowBlockFieldPolicy(blockId, _myBranchBlocks());
}
/** 当前块某字段的 manifest 声明（无块 / 未声明 ⇒ null） */
function _currentBlockField(fieldId) {
  const blockId = _currentBlockId();
  if (!blockId) return null;
  const m = BLOCK_MANIFESTS.find(b => b.blockId === blockId);
  return m?.inputs?.fields?.find(f => f.fieldId === fieldId) || null;
}

// ③ 参与人范围轴（契约 §8.3，2026-09-29 批次 275）：某块「生效的名单解析模式」＝
//   支部覆盖 ?? manifest 声明（缺省 ⇒ manifest；两者皆无 ⇒ {}＝角色全集口径、默认零影响）。
//   ⚠ 组织者/深度参与者是**项目绑定岗位**（支书「人是人，岗位是岗位」）——不外溢成 tab 或档案角色。
function _effectiveParticipantPolicy(blockId) {
  if (!blockId) return {};
  const declared = BLOCK_MANIFESTS.find(b => b.blockId === blockId)?.participants || {};
  const override = getWorkflowBlockParticipantPolicy(blockId, _myBranchBlocks());
  return { mode: override.mode ?? declared.mode, orgMode: override.orgMode ?? declared.orgMode };
}

// 成员发展阶段（议程「待讨论名单」类型：与 people.js developStage 口径一致）
// S-2（2026-09-09 支书批）：发展议程曾只留「转为预备党员 / 转为正式党员」两个目标；
// 2026-09-20 批次 103 支书裁定「开门」（B-27 / D-388 落地）——补「发展对象」目标档，
// 使「推荐为发展对象须支委会讨论」有议程位；该裁定**覆盖 S-2「只留两个目标」中
// 「不含发展对象」这一部分**，其余（两档设置精神）不变。裁定 `D-521`。
// 「从什么」由系统按所选对象各自当前阶段自动取（界面不再让人选 fromStage）。
const AGENDA_TARGET_STAGES = ['发展对象', '预备党员', '正式党员'];

// 议程类型 chips（2026-09-01 支书裁决：类型不互斥，一条议程可多类型；按自增列表思路写入）
// 「待讨论名单」替代原「成员变更」：多选人员 + 名单统一阶段转换（支书 2026-09-01 裁决）
const AGENDA_KIND_CHIPS = [
  { kind: 'discussion-file', label: '讨论文件' },
  { kind: 'attendee-list', label: '待讨论名单' },
  { kind: 'brand-designation', label: '品牌认定' }, // 2026-09-21 批次 132：品牌认定＝提案 → 支委会通过后确定
];

/** 议程行 HTML（议题步骤与业务类型分别表达；讨论/表决关系用稳定 agenda id 连接） */
function _agendaRowHTML({ id = '', item = '', host = '', kinds = [], branchDocId = '', toStage = '', brandActivityId = '', agendaStep = '', discussionAgendaItemId = '' } = {}) {
  const kindOn = (k) => (kinds.includes(k) ? ' wp-agenda-kind-on' : '');
  const docVisible = kinds.includes('discussion-file') ? '' : ' hidden';
  const memberVisible = kinds.includes('attendee-list') ? '' : ' hidden';
  const agendaId = esc(id || generateId('ag'));
  const stepOptions = [['', '普通议题'], ['discussion', '讨论项'], ['vote', '表决项']]
    .map(([value, label]) => ({ value, label }));
  const targetOptions = ['', ...AGENDA_TARGET_STAGES]
    .map((s) => ({ value: s, label: s ? `转为${s}` : '选择目标阶段' }));
  return `
    <div class="wp-agenda-row border border-gray-100 rounded-lg p-2 space-y-1.5 bg-white" data-agenda-id="${agendaId}"${brandActivityId ? ` data-brand-activity-id="${esc(brandActivityId)}"` : ''}>
      <div class="flex items-center gap-2">
        ${textInput({ value: item, placeholder: '议题，如：讨论关于 N 名发展对象转为预备党员', className: 'wp-agenda-item w-full' })}
        ${textInput({ value: host, placeholder: '主持人', className: 'wp-agenda-host w-24' })}
        <button type="button" data-action="agenda-remove" class="btn-outline btn-icon shrink-0" aria-label="删除该条议程" title="删除该条">✕</button>
      </div>
      <div class="flex flex-wrap items-center gap-1.5">
        <label class="text-xs text-gray-500 shrink-0" for="${agendaId}-step">步骤</label>
        ${selectInput({ id: `${agendaId}-step`, options: stepOptions, value: agendaStep, ariaLabel: '议程步骤', className: 'wp-agenda-step' })}
        <div class="wp-agenda-discussion-slot flex items-center gap-1.5${agendaStep === 'vote' ? '' : ' hidden'}">
          <label class="text-xs text-gray-500 shrink-0" for="${agendaId}-discussion">对应讨论项</label>
          ${selectInput({ id: `${agendaId}-discussion`, ariaLabel: '表决项对应的讨论项', className: 'wp-agenda-discussion-ref', attrs: `data-selected="${esc(discussionAgendaItemId)}"` })}
        </div>
        <span class="text-xs text-gray-500 shrink-0">类型</span>
        ${AGENDA_KIND_CHIPS.map((c) => `
          <button type="button" data-kind="${c.kind}" class="btn-tab wp-agenda-kind text-xs px-3 py-1.5 rounded-lg text-gray-600 transition-colors${kindOn(c.kind)}">${c.label}</button>
        `).join('')}
      </div>
      <div class="wp-agenda-doc-slot${docVisible}">
        ${selectInput({ options: [{ value: '', label: '加载会前草案…' }], className: 'wp-agenda-doc w-full' })}
        ${emptyStateHtml({ text: '暂无会前草案', variant: 'inline', className: 'wp-agenda-doc-hint mt-1 hidden', actionHtml: '<a href="search.html" target="_blank" class="text-accent">去资料查询写入 →</a>' })}
      </div>
      <div class="wp-agenda-member-slot flex items-center gap-2${memberVisible}">
        ${selectInput({ options: targetOptions, value: toStage || '', className: 'wp-agenda-to w-32 shrink-0' })}
        <div class="wp-agenda-person-slot flex-1"></div>
      </div>
    </div>`;
}

// 各 Tab 内容骨架模板（复用原 HTML 静态容器结构，由 render 函数按需注入）
// 2026-10-25 IA 62→45（单屏纵向一致 + 生命周期单一职责）：
//   · 「活动查询」折叠区与「党小组活动」独立卡已删 —— 关键词 / 类别 / 品牌 / 党小组活动改为**日历工具栏**的
//     四个筛选控件（同一行、同形 `.input-flat`），活动列表即日历（点日期看当日、点条目进详情）；
//   · 「+ 新建党小组活动」保留在日历卡头（写口单一源仍是写入浮窗，且预置 direction='bottom-up'）；
//   · 项目赋权整卡移出（专班赋权回组织台「专班管理」；活动赋权在活动详情）。
const CALENDAR_TAB_HTML = `
  ${renderTabHeader({
    title: '活动管理',
    description: '全支部活动日历：筛选、写入与台账。',
    // 批次 525（#2）：月/周/日/列表视图切换移出筛选条，与页头同一行（页头右侧）。
    actions: '<div id="cal-view-switcher"></div>',
  })}
  <!-- 统计条（紧凑文本概览） -->
  <div id="secretary-stats" class="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-500 mb-4 py-2 border-b border-gray-100"></div>
  <!-- 活动日历（2026-08-05：「写入活动」并入日历卡片头部，删除原独立活动写入卡片） -->
  <div class="card rounded-xl p-5 mb-4">
    <!-- 2026-10-01 批次 317（支书 V-3「功能钮提台顶栏全局固定位」）：原在本行的「写入活动」按钮
         已提到顶栏（ws-secretary-entry.js 经 header.js 的 mountHeaderCta 挂载）；
         id ws-sec-write-btn 一字未改 ⇒ 台账 / 守卫 / 真机选择器零改签。
         ⚠ 本块是模板字面量：注释里**不得出现反引号**（会截断模板串，批次 317 现场踩过）。 -->
    ${renderCardHeader({
      title: '活动日历',
      actions: '<button type="button" id="cal-new-group-activity" class="btn-accent-soft">+ 新建党小组活动</button>',
    })}
    <div id="calendar-view-section" class="grid grid-cols-1 lg:grid-cols-5 gap-4">
      <div class="lg:col-span-3">
        <!-- P3 四段（批次 525 · #2 定版两行）：第 1 行＝月份＋搜索，第 2 行＝3 分面＋清除；
             视图切换（月/周/日/列表）已移出筛选条，挂在页头右侧。 -->
        <div class="lf-bar mb-3">
          <div class="lf-bar__row" data-seg="scope">
            ${selectInput({ id: 'month-selector', className: 'lf-select', attrs: 'style="min-width:120px;"' })}
          </div>
          <div class="lf-bar__row" data-seg="search">
            ${textInput({ id: 'cal-kw', placeholder: '搜索活动名称…', ariaLabel: '搜索活动名称', className: 'lf-kw' })}
          </div>
          <div class="lf-bar__row" data-seg="facet" data-break-before="1">
            ${selectInput({ id: 'cal-cat', ariaLabel: '活动类别筛选', className: 'lf-select' })}
            ${selectInput({
              id: 'cal-brand',
              options: [{ value: '', label: '品牌：全部' }, { value: '1', label: '只看品牌' }],
              ariaLabel: '品牌筛选',
              className: 'lf-select',
            })}
            ${selectInput({
              id: 'cal-scope',
              options: [{ value: '', label: '范围：全部活动' }, { value: 'bottom-up', label: '党小组活动' }],
              ariaLabel: '活动范围筛选',
              className: 'lf-select',
            })}
          </div>
          <div class="lf-bar__row" data-seg="reset">
            <button type="button" id="cal-filter-clear" class="btn-tab lf-btn">清除</button>
          </div>
        </div>
        <p id="cal-filter-note" class="text-xs text-gray-500 mb-2"></p>
        <div id="cal-main-grid"></div>
        <div id="calendar-legend" class="mt-3"></div>
      </div>
      <div id="inspector-container" class="lg:col-span-2 rounded-xl bg-gray-50/50 border border-gray-100 p-3">
        <div id="inspector-default" class="text-sm text-gray-500 text-center py-8">未选择日期</div>
        <div id="inspector-content" class="hidden">
          <h4 id="inspector-date-title" class="text-sm font-bold text-gray-800 mb-3"></h4>
          <div id="inspector-cards"></div>
        </div>
      </div>
    </div>
    <p class="text-xs text-gray-500 mt-3">活动赋权在活动详情、专班赋权在组织台。</p>
  </div>
`;

/** 渲染活动管理 tab：统计条 + 筛选工具栏 + 日历 + 写入浮窗（增量刷新，写入面板防重渲染） */
export function renderContent(state) {
  const tc = document.getElementById('secretary-tab-content');
  // 2026-10-25 Task 1.3：容器缺失不再静默 return——抛出后由 tab-bar 的渲染生命周期落可见错误卡（含重试）。
  if (!tc) throw new Error('[calendar-tab] 缺少内容容器 #secretary-tab-content');
  if (tc.dataset.currentTab !== 'calendar') {
    tc.innerHTML = CALENDAR_TAB_HTML;
    tc.dataset.currentTab = 'calendar';
  }

  // 2026-11-01 批次 524（#7）：待办跳转深链——只消费属于本页签的目标；非本页目标保持原样，
  //   避免误清其它页签的待处理目标（PendingTarget 为一次性消费）。
  const pending = PendingTarget.peek();
  const navTarget = pending && pending.tab === 'calendar' ? PendingTarget.consume() : null;
  const navActId = navTarget && navTarget.kind === 'activity' ? navTarget.id : null;
  // 深链目标优先当作「选中活动」，使月份选择器先切到该活动所在月（与 URL selectedActivityId 同口径）
  const view = (navActId && state && !state.selectedActivityId)
    ? { ...state, selectedActivityId: navActId }
    : state;

  const activities = view.activities || [];
  renderSecretaryStats(activities);
  renderCalendarFilterOptions();

  // 2026-10-25 IA 62→45：筛选（关键词 / 类别 / 品牌 / 党小组活动）在**同一屏工具栏**上完成，
  //   过滤结果直接驱动日历与右栏详情（原「活动查询」折叠区已删，不再有第二套列表）。
  const displayActivities = filterActivities(activities);
  const filteredState = { ...view, activities: displayActivities };
  // 月份一致性：以月份选择器为准（含"默认跟随当前月"规则），避免与 state.displayMonth 分叉
  // URL 直达（首页跳转落点 2026-08-08）：携带 selectedActivityId 时优先定位该活动所在月
  const targetAct = view.selectedActivityId
    ? activities.find(a => a.id === view.selectedActivityId)
    : null;
  const targetMonth = targetAct?.date?.slice(0, 7) || view.displayMonth || undefined;
  const displayMonth = populateMonthSelector(displayActivities, targetMonth);
  renderCalendarByActivities(filteredState, displayMonth);
  renderInspectorFromState(filteredState); _decorateInspectorActivityLinks();
  bindMonthSelector();
  bindCalendarFilters();
  bindGroupActivityNew();

  const noteEl = document.getElementById('cal-filter-note');
  if (noteEl) {
    const on = _activeFilterCount();
    noteEl.textContent = on
      ? `筛选后 ${displayActivities.length} / ${activities.length} 场`
      : '';
  }

  // 2026-11-01 批次 524（#7）：深链定位——目标活动卡片渲染后滚动 + 高亮（复用既有锚点手法）；
  //   目标在折叠/隐藏区或当前筛选外时，不硬造动画，只提示「已到页但未找到」。
  if (navActId) {
    let attempts = 0;
    const locate = () => {
      if (focusActivityAnchor(tc, navActId)) return;
      if (attempts++ < 20) setTimeout(locate, 150);
      else showToast('info', '已到活动管理；当前筛选或月份中未找到该活动');
    };
    setTimeout(locate, 150);
  }

  // 写入活动 → 悬浮表单（T-217 §3：原内联 #write-form-area 迁移至 modal）
  // 2026-10-01 批次 317（支书 V-3）：按钮**已移出本 tab** ⇒ 其绑定与「党委下钻只读 ⇒ 不挂入口」
  //   的门**同批移出**（挂载点＝`ws-secretary-entry.js`，用的仍是服务层同一份 `isReadonlyBranchDrilldown()`，
  //   且 `openWriteModal()` 内的写口门照旧兜底 ⇒ 单一源不变、只换落点）。
}

// ── 活动管理 tab 子模块 ──────────────────────────────────

/** 类别下拉（大类 + 子类合并为单层选项，值带前缀：`三会一课/||子类`） */
const CAL_CATEGORY_PREFIX = { '三会一课': '三会一课/', '主题党日': '主题党日/' };

/** 渲染类别下拉（只在骨架内一次；选项由活动类型单一源派生，不手写类型清单） */
function renderCalendarFilterOptions() {
  const el = document.getElementById('cal-cat');
  if (!el || el.dataset.built === '1') return;
  el.dataset.built = '1';
  const groups = [
    { label: '三会一课', items: ACTIVITY_CLASSIFICATION['three-meetings'].subtypes },
    { label: '主题党日', items: ACTIVITY_CLASSIFICATION['theme-party'].carriers },
  ];
  el.innerHTML = '<option value="">活动类别：全部</option>'
    + groups.map((g) => `<optgroup label="${esc(g.label)}">${g.items.map((s) => `<option value="${esc(CAL_CATEGORY_PREFIX[g.label] + s)}">${esc(s)}</option>`).join('')}</optgroup>`).join('');
}

/** 当前是否有筛选（用于页内计数说明） */
function _activeFilterCount() {
  return ['cal-kw', 'cal-cat', 'cal-brand', 'cal-scope']
    .filter((id) => (document.getElementById(id)?.value || '').trim()).length;
}

/** 按工具栏筛选活动（关键词 = 标题；类别 = 大类或子类；品牌 = isBrand；范围 = bottom-up） */
function filterActivities(activities) {
  const kw = (document.getElementById('cal-kw')?.value || '').trim().toLowerCase();
  const cat = document.getElementById('cal-cat')?.value || '';
  const brandOn = (document.getElementById('cal-brand')?.value || '') === '1';
  const scope = document.getElementById('cal-scope')?.value || '';
  return (activities || []).filter((a) => {
    if (!a) return false;
    if (kw && !String(a.title || '').toLowerCase().includes(kw)) return false;
    if (brandOn && !a.isBrand) return false;
    // 党小组活动判据单一源＝活动 direction==='bottom-up'（原独立列表同一判据）
    if (scope === 'bottom-up' && a.direction !== 'bottom-up') return false;
    if (cat) {
      const [groupLabel, sub] = cat.includes('/') ? cat.split('/') : [cat, ''];
      if (groupLabel === '三会一课') {
        if (sub) return a.type === sub;
        return classifyActivityType(a.type) === 'three-meetings';
      }
      if (groupLabel === '主题党日') {
        if (sub) return (a.carriers || []).includes(sub);
        return classifyActivityType(a.type) === 'theme-party';
      }
    }
    return true;
  });
}

/** 日历筛选控件事件（2026-10-25 Task 1.5：绑定标记挂在**控件自身**，不挂持久容器
 *  `#secretary-tab-content`——骨架被重建后新控件仍会重新绑定；离开再回来筛选照常生效）。 */
function bindCalendarFilters() {
  const rerender = () => renderContent(getAppState());
  ['cal-kw'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el || el.dataset.bound === '1') return;
    el.dataset.bound = '1';
    el.addEventListener('input', rerender);
  });
  ['cal-cat', 'cal-brand', 'cal-scope'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el || el.dataset.bound === '1') return;
    el.dataset.bound = '1';
    el.addEventListener('change', rerender);
  });
  const clear = document.getElementById('cal-filter-clear');
  if (clear && clear.dataset.bound !== '1') {
    clear.dataset.bound = '1';
    clear.addEventListener('click', () => {
      ['cal-kw', 'cal-cat', 'cal-brand', 'cal-scope'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      rerender();
    });
  }
}

/** 统计条：紧凑文本概览（圆点+数字+标签） */
function renderSecretaryStats(activities) {
  const stats = computeSecretaryStats(activities);
  const statsEl = document.getElementById('secretary-stats');
  if (!statsEl) return;
  const items = [
    { label: '待赋权活动', value: stats.pendingAuth, color: _accentHex() },
    { label: '活跃活动', value: stats.activeEvents, color: _accentHex() },
    { label: '本月活动', value: stats.monthEvents, color: _accentHex() },
  ];
  statsEl.innerHTML = items.map(s => `
    <span class="inline-flex items-center gap-1.5">
      <span class="inline-block w-1.5 h-1.5 rounded-full" style="${dotDarkVars(s.color)}background:${s.color};"></span>
      <span class="font-semibold text-gray-700">${s.value}</span>
      <span>${s.label}</span>
    </span>
  `).join('');
}

/** 月份选择器事件绑定（防重复） */
function bindMonthSelector() {
  const sel = document.getElementById('month-selector');
  if (sel && !sel.dataset.bound) {
    sel.dataset.bound = '1';
    sel.addEventListener('change', e => setState({ displayMonth: e.target.value }));
  }
}

// ── 党小组活动（2026-10-25 IA 62→45：由独立卡改为日历筛选 `cal-scope=bottom-up`）──
// 判据单一源仍是活动 `direction==='bottom-up'`（未引入第二判据）；原只读列表由日历承载。

/** 「+ 新建党小组活动」入口（绑定一次，防重复；复用既有「写入活动」浮窗，**预置 direction='bottom-up'**） */
function bindGroupActivityNew() {
  const btn = document.getElementById('cal-new-group-activity');
  if (!btn || btn.dataset.bound) return;
  btn.dataset.bound = '1';
  btn.addEventListener('click', () => openWriteModal('', { direction: 'bottom-up' }));
}

// ════════════════════════════════════════════════════════════════
//  活动写入面板（2 步：模板选择 → 表单填写）
//  2026-07-30 重新设计：取消原 5 步决策树，改为更直观的 2 步式
// ════════════════════════════════════════════════════════════════

/** 决策树状态（已迁移至 services/activity/decision-tree.js，仅复用 selections/step 字段）*/
const wp = new DecisionTreeState('secretary');

/**
 * 活动模板配置（2 步式 Step 1 使用）
 * 两类：三会一课（党建红）/ 主题党日（党建金）
 */
const WRITE_TEMPLATES = [
  {
    category: 'three-meetings',
    categoryLabel: '三会一课',
    color: '#CE1126',
    bg: 'rgba(206,17,38,0.08)',
    border: 'rgba(206,17,38,0.25)',
    // P2b（2026-09-03）：四子会写入选项目录 = SCENARIO_WRITE_IDS/LABELS 派生（与决策树同源，勿手写）
    subtypes: SCENARIO_WRITE_IDS['three-meetings'].filter((scenarioId) => scenarioId !== 'party-group-meeting').map((scenarioId) => ({
      value: scenarioId, label: SCENARIO_LABELS[scenarioId], scenarioId,
    })),
  },
  {
    category: 'theme-day',
    categoryLabel: '主题党日',
    color: '#FFD700',
    bg: 'rgba(255,215,0,0.12)',
    border: 'rgba(255,215,0,0.35)',
    scenarioId: 'theme-party',
    // 主题党日无固定子分类，采用正交维度（Step 2 表单中呈现：共建性质/是否外出/活动载体）
    subtypes: [],
  },
];

// ── 写入活动悬浮表单（T-217 §3 全悬浮化） ──────────────────
const WRITE_MODAL_ID = 'write-activity';

/** 定位当前悬浮面板内的写入面板容器（悬浮已关闭时返回 null） */
function _getWritePanelContainer() {
  return document.getElementById(`modal-overlay-${WRITE_MODAL_ID}`)?.querySelector('.modal-body') || null;
}

/** 定位悬浮页脚（动作常驻区；R3-10） */
function _getWriteFooter() {
  return document.getElementById(`modal-overlay-${WRITE_MODAL_ID}`)?.querySelector('[data-modal-footer]') || null;
}

/** 页脚动作：取消 + 提交（Step 1 只有取消；提交按钮只在 Step 2 出现） */
function _writeFooterHtml() {
  const cancel = `<button type="button" data-action="wp-cancel" class="btn-outline text-sm px-4 py-1.5">取消</button>`;
  if (wp.step === 1) return cancel;
  const submit = `<button type="button" data-action="wp-submit" class="btn-accent text-sm px-4 py-1.5 font-medium${wp.submitting ? ' opacity-50 cursor-not-allowed' : ''}">${wp.submitting ? '写入中…' : '创建活动'}</button>`;
  return cancel + submit;
}

/** 重渲染后同步页脚（步骤切换 / 提交态变化都走这里，动作不随 body 滚动） */
function _syncWriteFooter() {
  const footer = _getWriteFooter();
  if (footer) footer.innerHTML = _writeFooterHtml();
}

/** 取消 = 放弃本次编辑：清待提交赋权名单 / 选人器 / 议程行选人器（R3-02） */
function _resetWriteState() {
  wp.reset(); // 含 pendingAuth
  // 2026-10-21 批次 499：责任组 / 跨组招募 / 组织者例外说明同属临时编辑态
  wp.hostGroupId = '';
  wp.crossRecruit = false;
  wp.organizerExceptionReason = '';
  if (wp.personPicker) { try { wp.personPicker.destroy(); } catch (_) { /* 已销毁则忽略 */ } wp.personPicker = null; }
  (wp.agendaPickers || []).forEach(({ picker }) => { try { picker.destroy(); } catch (_) { /* 忽略 */ } });
  wp.agendaPickers = [];
}

/** 品牌名下拉数据源：当前 state 内全部活动（写入面板仅在 tab 渲染后打开，state 已就绪） */
function _getBrandList() {
  return getAppState()?.activities || [];
}

/** 打开「写入活动」悬浮表单：Step1 选模板 → Step2 填表单（含正交维度），重新打开回到 Step1 */
/** 「写入活动」浮窗的**单一开窗口**（2026-10-01 批次 317：按钮提到顶栏后，由顶栏 CTA 与
 *  `group-progress-tab.js::openActivityWriteEntry` 共同消费；**表单唯一定义处仍是本文件**）。
 *  ⚠ 只转调 `openWriteModal()` ——**党委下钻只读门在那个函数里**，故本出口天然受同一门约束。 */
export function openActivityWriteForm() { openWriteModal(); }

function openWriteModal(prefillDate = '', opts = {}) {
  // B1（2026-09-12）提交处显式拒绝兜底：党委下钻只读视图不得打开写入表单
  if (isReadonlyBranchDrilldown()) {
    showToast('error', '党委视角（只读）：不可写入活动（写操作按角色权限拒绝）');
    return;
  }
  openModal({
    id: WRITE_MODAL_ID,
    title: '写入活动',
    width: '720px',
    accentColor: _accentHex(),
    // R3-10：取消 / 提交固定在页脚（sticky），长表单滚到任何位置都能点
    footerHtml: _writeFooterHtml(),
    // R3-02：Esc / 遮罩 / × / 取消四条关闭路径统一「放弃本次编辑」——清 pendingAuth 与选人器
    onCancel: _resetWriteState,
    onMount: (panel) => {
      // 打开即重置：上次取消后若还有残留（旧版本状态 / 异常关闭），从这里兜底
      _resetWriteState();
      // 右栏「新建活动（带日期）」入口把日期带进来；顶栏常规入口传空串 ⇒ 表单仍默认今天。
      wp.prefillDate = prefillDate || '';
      // 2026-10-25 IA 62→45：「+ 新建党小组活动」预置发起方向（原独立列表的新建按钮同一诉求）。
      wp.prefillDirection = opts.direction || '';
      // 页脚动作委托绑定（页脚内容随步骤重渲染，委托不会累积监听）
      panel.querySelector('[data-modal-footer]')?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action]');
        if (btn) handleWritePanelAction({ currentTarget: btn });
      });
      renderWritePanel(panel.querySelector('.modal-body'));
    },
  });
}

// 右栏空日「新建活动（带日期）」→ 本页唯一写入浮窗（事件由 inspector 共享件派发，
// 避免共享件反向 import 支书台模块形成环）。
document.addEventListener('inspector:new-activity', (e) => openWriteModal(e.detail?.date || ''));

/** 写入表单内「项目赋权」待提交名单（`wp.pendingAuth`）的 chips 渲染 —— 2026-09-30 批次 303 内嵌赋权。
 *  名单只暂存，**写入活动成功后才逐条落库**（见 `handleWritePanelAction` 的 wp-submit 分支）。
 *  ⚠ 删除按钮**就地绑定**（chips 每次都重建），不走容器级委托——容器可能被重复 bind，委托会累积重复监听。 */
function _renderPendingAuth(container) {
  const host = container.querySelector('#wp-auth-list');
  if (!host) return;
  const list = wp.pendingAuth || [];
  host.innerHTML = list.length
    ? `<div class="flex flex-wrap gap-1.5">${list.map((x, i) => `
        <span class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
          ${esc(getPersonName(x.personId) || x.personId)} · ${esc(ROLE_LABELS[x.role] || x.role)}
          <button type="button" data-wp-auth-del="${i}" class="btn-outline btn-icon text-gray-400 hover:text-red-600" aria-label="从名单移除">✕</button>
        </span>`).join('')}</div>`
    : '';
  host.querySelectorAll('[data-wp-auth-del]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = Number(btn.dataset.wpAuthDel);
      if (Number.isInteger(i)) {
        (wp.pendingAuth || []).splice(i, 1);
        _renderPendingAuth(container);
        _syncOrganizingScopeUI(container);
      }
    });
  });
  _syncOrganizingScopeUI(container);
}

/** 主渲染入口（2 步：模板选择 → 表单填写）*/
function renderWritePanel(container) {
  let html = '';

  // 面包屑（替代原 5 步指示器）
  const step1Active = wp.step === 1;
  html += `<div class="flex items-center gap-2 mb-5 text-xs">`;
  html += `<span class="${step1Active ? 'text-accent font-semibold' : 'text-gray-500'}">① 选模板</span>`;
  html += `<span class="text-gray-500">›</span>`;
  html += `<span class="${!step1Active ? 'text-accent font-semibold' : 'text-gray-500'}">② 填表单</span>`;
  html += `</div>`;

  // 当前步骤内容
  if (wp.step === 1) {
    html += renderTemplateStep();
  } else {
    html += renderFormStep();
  }

  // 返回按钮（step 2 时显示，返回 step 1 重选模板）
  if (wp.step > 1) {
    html += `<button data-action="wp-back" class="btn-outline btn-sm mt-4 flex items-center gap-1">`;
    html += icon('chevronLeft', { className: 'w-3 h-3' });
    html += `返回选模板</button>`;
  }

  // 清理上次会话遗留的议程行 PersonPicker（防 DOM 泄漏；重渲染前销毁）
  (wp.agendaPickers || []).forEach(({ picker }) => { try { picker.destroy(); } catch (_) {} });
  wp.agendaPickers = [];

  container.innerHTML = html;
  // 步骤切换后同步页脚：Step 1 只有「取消」，Step 2 才出现「创建活动」（动作不随 body 滚动）
  _syncWriteFooter();
  bindWritePanelEvents(container);
}

/** Step 1 · 选模板（一屏卡片选择）*/
function renderTemplateStep() {
  let html = `<div>`;
  html += `<p class="font-title-cn text-sm font-bold text-gray-700 mb-3">选择活动模板</p>`;
  html += `<div class="grid grid-cols-1 md:grid-cols-2 gap-3">`;

  // L3 S4 入口守卫：支部停用工作流块 → 模板卡 / 模板按钮消失（manifest 目录 − workflowBlocks 隐藏）
  const enabledBlocks = _enabledWorkflowBlocks();
  const themeBlockOn = enabledBlocks.has(THEME_DAY_BLOCK_ID);
  // 无对应块的场景不受管辖（`_scenarioBlockOn` 对目录外场景恒 true ⇒ 新块未铺开时行为不变）
  const _scenarioBlockOn = (scenarioId) => !THREE_MEETING_BLOCK_IDS.has(scenarioId) || enabledBlocks.has(scenarioId);
  const visibleTemplates = WRITE_TEMPLATES.filter(tpl => tpl.category !== 'theme-day' || themeBlockOn);
  visibleTemplates.forEach(tpl => {
    const isUnique = tpl.subtypes.length === 0; // 主题党日：无子类型=唯一选项 → 整卡可点（点击热区=全卡）
    // 2026-09-03 支书澄清：仍须【点击】进入，只是点击热区扩至整卡（不必精准命中文字按钮）——
    // 绝不是 hover 自动进入。卡内按钮区域直接点击走按钮；其余区域点击由 data-tpl-click 委托触发。
    html += `<div class="rounded-xl border border-gray-200 overflow-hidden transition-colors hover:border-gray-300" data-tpl-click="${isUnique ? '1' : ''}" style="${isUnique ? 'cursor:pointer;' : ''}" title="${isUnique ? `选择${tpl.categoryLabel}` : ''}">`;
    // 类别标题色块
    html += `<div class="px-3 py-2" style="background:${tpl.bg};border-bottom:1px solid ${tpl.border};">`;
    html += `<span class="text-sm font-semibold" style="color:${tpl.color};">${tpl.categoryLabel}</span>`;
    html += `</div>`;
    // 子类型按钮列表
    html += `<div class="p-2 space-y-1">`;
    if (isUnique) {
      // 主题党日无固定子类型，直接选择模板（正交维度在 Step 2 表单中填写）
      // 点击由 bindWritePanelEvents 委托（整卡 data-tpl-click；按钮自身 data-action 不受影响）
      const isSelected = wp.selections.L1 === tpl.category;
      html += `<button data-action="select-template" data-category="${tpl.category}" data-subtype="" data-scenario-id="${tpl.scenarioId || 'theme-party'}" data-activity-type="" data-color="${tpl.color}" class="btn-tab w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${isSelected ? 'sel-accent-on' : 'text-gray-700 hover:bg-[var(--surface-hover)]'}">`;
      html += `选择${tpl.categoryLabel}`;
      html += `</button>`;
    } else {
      const onSubs = tpl.subtypes.filter(sub => _scenarioBlockOn(sub.scenarioId));
      if (!onSubs.length) {
        html += `<p class="px-3 py-2 text-xs text-gray-500">本类目下的工作流块均已由支部配置停用。</p>`;
      }
      onSubs.forEach(sub => {
        const isSelected = wp.selections.L1 === tpl.category && wp.selections.L1Sub === sub.value;
        html += `<button data-action="select-template" data-category="${tpl.category}" data-subtype="${sub.value}" data-scenario-id="${sub.scenarioId}" data-activity-type="${sub.activityType || ''}" data-color="${tpl.color}" class="btn-tab w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${isSelected ? 'sel-accent-on' : 'text-gray-700 hover:bg-[var(--surface-hover)]'}">`;
        html += sub.label;
        html += `</button>`;
      });
    }
    html += `</div>`;
    html += `</div>`;
  });

  html += `</div>`;
  html += `</div>`;
  // 停用提示：主题党日块 ＋ 三会一课各场景块（同一条提示句，避免新增小字号档）
  const offBlockNames = [];
  if (!themeBlockOn) offBlockNames.push(THEME_PARTY_DAY_MANIFEST.name);
  (WRITE_TEMPLATES.find(t => t.category === 'three-meetings')?.subtypes || [])
    .forEach(sub => { if (!_scenarioBlockOn(sub.scenarioId)) offBlockNames.push(`${sub.label}块`); });
  if (offBlockNames.length) {
    html += `<p class="mt-3 text-xs text-gray-500">工作流块「${offBlockNames.join('」「')}」已由支部配置停用——党委台「支部配置 · 工作流块」可恢复。</p>`;
  }
  return html;
}

/** Step 2 · 填表单（一屏完成）*/
function renderFormStep() {
  // 找到当前选中模板
  const tpl = WRITE_TEMPLATES.find(t => t.category === wp.selections.L1);
  if (!tpl) {
    // 未选模板时回退到 Step 1
    wp.step = 1;
    return renderTemplateStep();
  }
  // 三会一课需选子类；主题党日无固定子类
  const sub = tpl.subtypes.find(s => s.value === wp.selections.L1Sub);
  if (tpl.subtypes.length > 0 && !sub) {
    wp.step = 1;
    return renderTemplateStep();
  }

  const scenarioTitle = wp.getScenarioTitle();
  const scenarioId = wp.selections._scenarioId || wp.getScenarioId?.() || '';
  const today = todayLocal();

  let html = `<div>`;
  // 已选模板提示
  html += `<div class="mb-4 px-3 py-2 rounded-lg" style="background:${tpl.bg};border:1px solid ${tpl.border};">`;
  html += `<p class="text-xs font-medium" style="color:${tpl.color};">已选模板：${tpl.categoryLabel}${sub ? ' · ' + sub.label : ''}</p>`;
  if (scenarioTitle) {
    html += `<p class="text-[12px] text-gray-500 mt-0.5">场景：${scenarioTitle}（写入后自动生成后续待办）</p>`;
  }
  // SOP-B-18 乙档（2026-09-21 批次 137）：本组活动一律先报备——随表单出现、**不设门槛**（未报备仍可写入）。
  html += `</div><div class="mb-3 px-3 py-2 rounded-lg border border-amber-200 bg-amber-50/60 text-xs text-gray-700 leading-5"><b class="text-gray-800">本组活动一律先报备</b>——把活动方案发到支委扩大群（有意见在群里交流），<b>报备通过后方才写入活动</b>。</div>`;
  // ② 表单条目轴（契约 §8.2，2026-09-29 批次 275）：本屏字段策略——无块 = 全开/无覆盖
  //   ⇒ 逐字渲染与既有完全一致（默认零影响）；只在支部显式配置后隐藏/改必填。
  const fp = _currentFieldPolicy();
  const fReq = (fid, dflt) => (Object.prototype.hasOwnProperty.call(fp.requiredOverrides, fid) ? !!fp.requiredOverrides[fid] : dflt);
  const fHidden = (fid) => fp.hidden.has(fid);

  // 标题（必填）—— L3 S4：主题党日 title 字段 label/required/hint 以 manifest 声明为单一源（其余模板维持原样）
  const titleField = tpl.category === 'theme-day' ? _themeField('title') : null;
  const titleLabel = titleField?.label || '活动名称';
  const titleRequired = fReq('title', titleField ? !!titleField.required : true);
  const titleHint = titleField?.hint || '';
  if (!fHidden('title')) {
    html += `<div class="mb-3">`;
    html += `<label for="wp-title" class="text-xs text-gray-500 mb-1.5 block font-medium">${titleLabel} ${titleRequired ? '<span class="text-red-600">*</span>' : ''}</label>`;
    html += textInput({ id: 'wp-title', placeholder: titleLabel, className: 'w-full' });
    if (titleHint) html += `<p class="text-xs text-gray-500 mt-1">${titleHint}</p>`;
    html += `</div>`;
  }

  // 日期 + 时间（② §8.2：日期原由 Step2 直渲 ⇒ 现改走 manifest 读取；label/required/hint 缺省等价原硬编码）
  const dateField = _currentBlockField('date');
  const dateLabel = dateField?.label || '日期';
  const dateRequired = fReq('date', true);
  const showDate = !fHidden('date');
  const showTime = !fHidden('time');
  if (showDate || showTime) {
    html += (showDate && showTime) ? `<div class="modal-form-grid mb-3">` : `<div class="mb-3">`;
    if (showDate) {
      html += `<div>`;
      html += `<label for="wp-date" class="text-xs text-gray-500 mb-1.5 block font-medium">${dateLabel} ${dateRequired ? '<span class="text-red-600">*</span>' : '<span class="text-gray-500">（选填）</span>'}</label>`;
      html += textInput({ id: 'wp-date', type: 'date', value: wp.prefillDate || today, className: 'w-full' });
      html += `</div>`;
    }
    if (showTime) {
      html += `<div>`;
      html += `<label for="wp-time" class="text-xs text-gray-500 mb-1.5 block font-medium">时间 <span class="text-gray-500">（选填）</span></label>`;
      html += textInput({ id: 'wp-time', placeholder: '如 14:00-16:00', className: 'w-full' });
      html += `</div>`;
    }
    html += `</div>`;
  }

  // 地点（必填）
  if (!fHidden('location')) {
    const locRequired = fReq('location', true);
    html += `<div class="mb-3">`;
    html += `<label for="wp-location" class="text-xs text-gray-500 mb-1.5 block font-medium">地点 ${locRequired ? '<span class="text-red-600">*</span>' : '<span class="text-gray-500">（选填）</span>'}</label>`;
    html += textInput({ id: 'wp-location', placeholder: '活动地点', className: 'w-full' });
    html += `</div>`;
  }

  // 主题党日正交维度（共建性质 / 是否外出 / 活动载体）
  if (tpl.category === 'theme-day') {
    html += renderThemeDayDimensions();
  }

  // 组织落点（2026-10-21 批次 499）：非支部级会议必须选责任党小组；跨组招募需组织委员协调
  html += _renderOrganizingScopeSection(scenarioId);

  // 主持人（默认当前用户）
  if (!fHidden('host')) {
    html += `<div class="mb-3">`;
    html += `<label for="wp-host" class="text-xs text-gray-500 mb-1.5 block font-medium">主持人 <span class="text-gray-500">（选填）</span></label>`;
    html += textInput({ id: 'wp-host', placeholder: '默认为当前用户', className: 'w-full' });
    html += `</div>`;
  }

  // 会议形式（2026-09-02 线上异步表决泛化 A 期：仅决策类场景——支委会/支部党员大会；
  // 默认线下开会保持现状；选「线上异步表决」后展开参与范围配置，见 renderVoteConfigSection）
  // 写侧约束（2026-09-02，T-2026-09-006）：本写入面板仅在支书/副支书工作台（secretary.html）
  // 呈现——组长等其它角色工作台写活动无表决配置入口，voteConfig 只能由支书/副支书配置。
  if (isDecisionScenario(scenarioId)) {
    html += renderVoteConfigSection(scenarioId);
  }

  // 会议议程（T-283：三会一课专用；逐条议题 + 可选主持人，行内编辑最少点击）
  // 2026-09-21 批次 127（SOP-B-33 取乙档）：上面加**一个统一入口**「从拟上会清单勾选」——先归集一张清单，勾谁上会（不按来源各做导入口）
  if (tpl.category === 'three-meetings') {
    html += `<div class="mb-3 card rounded-xl p-4">`;
    html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">会议议程 <span class="text-gray-500">（选填；类型可多选）</span></label>`;
    html += `<button type="button" data-action="agenda-candidates-toggle" class="btn-outline mb-2 text-xs px-3 py-1.5">从拟上会清单勾选</button>`;
    html += `<div id="wp-agenda-candidates" class="hidden mb-2 rounded-lg border border-gray-100 bg-gray-50/60 p-2.5"></div>`;
    html += `<div id="wp-agenda-list" class="space-y-2">`;
    // 初始 1 行空议程（HTML 内嵌，减少首条输入点击；添加/删除由 bindWritePanelEvents 事件处理）
    html += _agendaRowHTML();
    html += `</div>`;
    html += `<div class="flex flex-wrap gap-2">
      <button type="button" data-action="agenda-add" class="btn-outline text-xs px-3 py-1.5">+ 添加议题</button>
      <button type="button" data-action="agenda-add-vote-pair" class="btn-outline text-xs px-3 py-1.5">+ 添加讨论＋表决事项</button>
    </div>`;
    html += `<p class="text-xs text-gray-500 mt-1.5">先讨论后表决时分成两条；表态和最终结果记录在表决项。</p>`;
    html += `</div>`;
  }

  // 品牌族名称（2026-08-07 支书原始意图：看是否延续旧品牌 / 创建新品牌）
  // 2026-09-19（SOP-B-24② / D-340）：品牌字段放宽到任何活动——原「仅主题党日适用」的类型闸门已废
  // 2026-09-21 批次 132（支书口径二「品牌认定＝支委/党小组组长提案 → 支委会通过后确定」）：
  //   本处只填**品牌族名称**（认定后延续 / 补录用，见 DATA_MODEL `brandName`），**不再由写入即置 `isBrand`**
  //   ——品牌认定只能由支委会议程项「记录结果 · 通过」产生（`services/activity/activity.js::applyBrandDesignationResult`）。
  const brandNames = [...new Set((_getBrandList() || []).map(a => a.brandName).filter(Boolean))];
  html += `<div class="mb-3">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">品牌族名称 <span class="text-gray-500">（选填；品牌认定由支委会审议通过后确定，此处只填名称）</span></label>`;
  html += `<div class="flex gap-2">`;
  html += `<button type="button" data-wp-brand="none" class="btn-tab wp-brand-chip wp-brand-on text-xs px-3 py-1.5">非品牌</button>`;
  html += `<button type="button" data-wp-brand="inherit" class="btn-tab wp-brand-chip text-xs px-3 py-1.5">延续已有品牌</button>`;
  html += `<button type="button" data-wp-brand="create" class="btn-tab wp-brand-chip text-xs px-3 py-1.5">创建新品牌</button>`;
  html += `</div>`;
  html += `<div id="wp-brand-inherit" class="hidden mt-2">`;
  html += selectInput({ id: 'wp-brand-select', options: brandNames.map(n => ({ value: n, label: n })), className: 'w-full' });
  html += `</div>`;
  html += `<div id="wp-brand-create" class="hidden mt-2">`;
  html += textInput({ id: 'wp-brand-input', placeholder: '品牌名称，如：人生回望录', className: 'w-full' });
  html += `</div>`;
  html += `</div>`;

  // 备注
  if (!fHidden('desc')) {
    html += `<div class="mb-3">`;
    html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">备注 <span class="text-gray-500">（选填）</span></label>`;
    html += `<textarea id="wp-desc" rows="2" class="input-flat w-full" placeholder="活动内容/目标等"></textarea>`;
    html += `</div>`;
  }

  // 参与人选择（选填，多选，2026-08-05 与「发布专班招募」表单对齐）
  html += `<div class="mb-3">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">参与人 <span class="text-gray-500">（选填，可多选）</span></label>`;
  html += `<div id="wp-participants-slot"></div>`;
  html += `</div>`;

  // 项目赋权（组织者 / 深度参与者）——2026-09-30 批次 303 支书裁定：
  //   「**在写入的时候直接就可以进行赋权了**，也就是 这个信息应该是**内嵌在 活动/专班 字段中的**！
  //    **单独把赋权拎出来未必高效**！」⇒ 写入活动时即可赋项目角色（写入后逐条落 `AuthStore.authorize`，
  //   与独立赋权块**同一写口**；不新造第二套赋权机制）。
  html += `<div class="mb-3">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">项目赋权 <span class="text-gray-500">（选填：组织者 / 深度参与者）</span></label>`;
  html += `<div class="flex flex-wrap items-center gap-2">`;
  html += `<div class="flex-1 min-w-[200px]" id="wp-auth-slot"></div>`;
  html += `<div class="flex items-center gap-3 shrink-0">`;
  html += PROJECT_ROLES.map(r => `<label class="flex items-center gap-2 text-xs whitespace-nowrap"><input type="radio" name="wp-auth-role" value="${r}" class="radio-accent"><span>${ROLE_LABELS[r] || r}</span></label>`).join('');
  html += `</div>`;
  html += `<button type="button" data-action="wp-auth-add" class="btn-outline text-xs px-3 py-1.5 shrink-0">+ 加入名单</button>`;
  html += `</div>`;
  html += `<div id="wp-auth-list" class="mt-2"></div>`;
  // 2026-10-21 批次 499：组织者候选默认限责任党小组；关闭后才显示全部成员（跨组深参由此入口招募）。
  html += `<label class="flex items-start gap-2 text-xs text-gray-600 mt-2"><input type="checkbox" id="wp-auth-same-group" class="checkbox-accent mt-0.5" checked><span>只显示承办党小组成员<span class="text-gray-500">（关闭后显示全部成员；组织者一般本组，跨组深参须由组织委员协调）</span></span></label>`;
  html += renderWorkgroupPermissionEditor('secretary-activity');
  html += `</div>`;

  // 自动发布通知（选填，2026-08-05 支书裁决「表单内预拟通知·只跑一次」）
  // 2026-10-25 Task 3：阅读型折叠统一为原生 details（本文件不再出现第二种折叠原语）
  const noticeBodyHtml = `
    <div>
      <label class="text-xs text-gray-500 mb-1.5 block font-medium">通知标题</label>
      ${textInput({ id: 'wp-notice-title', placeholder: '默认使用活动名称', className: 'w-full' })}
    </div>
    <div>
      <label class="text-xs text-gray-500 mb-1.5 block font-medium">通知内容</label>
      <textarea id="wp-notice-content" rows="3" class="input-flat w-full" placeholder="如：本周五 14:00 在光华1号楼101报告厅举行暑期实践总结分享，请全体成员准时参加。"></textarea>
    </div>`;
  html += `<div class="mb-4">${renderDisclosure({
    id: 'wp-notice',
    title: '自动发布通知（选填）',
    meta: '创建活动后立即通知全体成员',
    open: false,
    level: 4,
    bodyHtml: `<div class="space-y-3">${noticeBodyHtml}</div>`,
  })}</div>`;

  // 高级选项（折叠）
  const advancedBodyHtml = `
    <div>
      <label class="text-xs text-gray-500 mb-1.5 block font-medium">发起方向</label>
      ${selectInput({
        id: 'wp-direction',
        options: [{ value: '', label: '不指定' }, { value: 'top-down', label: '自上而下' }, { value: 'bottom-up', label: '自下而上' }],
        value: wp.prefillDirection || '',
        className: 'w-full',
      })}
    </div>
    <div>
      <label class="text-xs text-gray-500 mb-1.5 block font-medium">时长</label>
      ${selectInput({
        id: 'wp-duration',
        options: [{ value: '', label: '不指定' }, { value: 'short', label: '短期' }, { value: 'long', label: '长期' }],
        className: 'w-full',
      })}
    </div>`;
  html += `<div class="mb-4">${renderDisclosure({
    id: 'wp-advanced',
    title: '高级选项',
    meta: '发起方向 / 时长',
    open: false,
    level: 4,
    bodyHtml: `<div class="modal-form-grid">${advancedBodyHtml}</div>`,
  })}</div>`;

  // 动作行统一在浮窗页脚（R3-10）：body 只留表单，不再随内容滚出视口
  html += `</div>`;
  return html;
}

/** 主题党日正交维度字段组（共建性质 / 是否外出 / 活动载体多选） */
function renderThemeDayDimensions() {
  const dims = wp.config?.THEME_PARTY_DIMENSIONS;
  if (!dims) return '';
  let html = `<div class="mb-3 card rounded-xl p-4">`;

  // 维度1 共建性质
  html += `<div class="mb-2.5">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">共建性质</label>`;
  html += `<div class="flex gap-2">`;
  dims.isJoint.forEach(opt => {
    html += `<button type="button" data-wp-dim data-wp-group="isJoint" data-wp-dim-value="${opt.value}" data-wp-multi="false" class="btn-tab wp-dim-chip text-xs px-3 py-1.5">${opt.label}</button>`;
  });
  html += `</div>`;
  html += `</div>`;

  // 维度2 是否外出
  html += `<div class="mb-2.5">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">是否外出</label>`;
  html += `<div class="flex gap-2">`;
  dims.isOutdoor.forEach(opt => {
    html += `<button type="button" data-wp-dim data-wp-group="isOutdoor" data-wp-dim-value="${opt.value}" data-wp-multi="false" class="btn-tab wp-dim-chip text-xs px-3 py-1.5">${opt.label}</button>`;
  });
  html += `</div>`;
  html += `</div>`;

  // 维度3 活动载体（多选）
  html += `<div>`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">活动载体 <span class="text-gray-500">（可多选）</span></label>`;
  html += `<div class="flex flex-wrap gap-2">`;
  dims.carriers.forEach(opt => {
    html += `<button type="button" data-wp-dim data-wp-group="carriers" data-wp-dim-value="${opt.value}" data-wp-multi="true" class="btn-tab wp-dim-chip text-xs px-3 py-1.5">${opt.label}</button>`;
  });
  html += `</div>`;
  html += `</div>`;

  html += `</div>`;
  return html;
}

/** 会议形式配置区（2026-09-02 线上异步表决泛化 A 期：仅决策类场景调用）
 *  参与范围按场景预填：支委会固定「支委」只读文案；支部党员大会可切换
 *  正式党员（默认）/ 正式党员+预备党员；人数经 resolveVoterIds 实时解析。
 *  计票方式（2026-09-12 支书裁定「正式表决无记名 + 匿名模式可选」）：
 *    正式表决（optionSet formal——发展党员/转正等）按制度强制无记名，UI 只读不可改；
 *    事务性表决（支委会 deliberative）默认记名，发起人可选无记名。
 *  配置区默认隐藏，选「线上异步表决」后展开（事件见 bindWritePanelEvents）。
 */
function renderVoteConfigSection(scenarioId) {
  // ③ §8.3：应到名单＝按「生效名单解析模式」解析；创建时指派层为空（组织者/深度参与者在该活动创建后才指派）
  //   ⇒ 与既有 `resolveVoterIds` **逐字一致**（默认零影响）。
  const countOf = (scope) => resolveParticipantIds(scope, _effectiveParticipantPolicy(scenarioId), []).length;
  const forcedAnonymous = isAnonymousForced(defaultVoteConfig(scenarioId)?.optionSet);
  let html = `<div class="mb-3 card rounded-xl p-4">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">会议形式</label>`;
  html += `<div class="flex gap-4 pt-0.5">`;
  html += `<label class="flex items-center gap-2 text-xs cursor-pointer">`;
  html += `<input type="radio" name="wp-meeting-form" value="onsite" class="radio-accent" checked>线下开会`;
  html += `</label>`;
  html += `<label class="flex items-center gap-2 text-xs cursor-pointer">`;
  html += `<input type="radio" name="wp-meeting-form" value="async" class="radio-accent">线上异步表决`;
  html += `</label>`;
  html += `</div>`;
  // 线上异步表决配置区（默认隐藏；「线上异步表决」选中时展开）
  html += `<div id="wp-vote-config" class="hidden mt-2.5 pt-2.5 border-t border-gray-100">`;
  if (scenarioId === 'branch-committee') {
    // 支委会：参与范围固定支委（只读文案，无选择项）
    html += `<p class="text-xs text-gray-600">参与范围：支委（${countOf('committee')} 人）</p>`;
    html += `<p class="text-xs text-gray-500 mt-1">名单按现时「在校/滞留」状态自动剔除滞留支委；创建时固化快照</p>`;
  } else if (scenarioId === 'branch-party-meeting') {
    html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">参与范围</label>`;
    html += `<div class="flex gap-4 pt-0.5">`;
    html += `<label class="flex items-center gap-2 text-xs cursor-pointer">`;
    html += `<input type="radio" name="wp-vote-scope" value="formal-only" class="radio-accent" checked>正式党员（${countOf('formal-only')} 人）`;
    html += `</label>`;
    html += `<label class="flex items-center gap-2 text-xs cursor-pointer">`;
    html += `<input type="radio" name="wp-vote-scope" value="formal-plus-prep" class="radio-accent">正式党员 + 预备党员（${countOf('formal-plus-prep')} 人）`;
    html += `</label>`;
    html += `</div>`;
    html += `<p class="text-xs text-gray-500 mt-2">表决选项：赞成 / 反对 / 弃权 + 可附言</p>`;
  }
  // 计票方式
  html += `<div class="mt-2.5">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">计票方式</label>`;
  if (forcedAnonymous) {
    // 制度强制无记名（发展党员/转正等正式表决）：只读锁定，不可改
    html += `<input type="hidden" name="wp-ballot-mode" value="anonymous">`;
    html += `<p class="text-xs text-gray-600">无记名投票（制度强制，不可更改）</p>`;
    html += `<p class="text-xs text-gray-500 mt-1">正式表决按《中国共产党发展党员工作细则》采取无记名投票方式表决；仅记参与情况与汇总票数，不记录个人选项</p>`;
  } else {
    html += `<div class="flex gap-4 pt-0.5">`;
    html += `<label class="flex items-center gap-2 text-xs cursor-pointer">`;
    html += `<input type="radio" name="wp-ballot-mode" value="named" class="radio-accent" checked>记名（逐人可见）`;
    html += `</label>`;
    html += `<label class="flex items-center gap-2 text-xs cursor-pointer">`;
    html += `<input type="radio" name="wp-ballot-mode" value="anonymous" class="radio-accent">无记名（只计汇总）`;
    html += `</label>`;
    html += `</div>`;
    html += `<p class="text-xs text-gray-500 mt-1">无记名仅计汇总票数；同场表决口径统一</p>`;
  }
  html += `</div>`;
  html += `</div>`;
  html += `</div>`;
  return html;
}

/** 添加一条议程输入行；议程 id 在编辑期间稳定，供讨论/表决关系回指。 */
function _addAgendaRow(container, item = '', host = '', kinds = [], branchDocId = '', toStage = '', personIds = [], brandActivityId = '', step = {}) {
  const list = container.querySelector('#wp-agenda-list');
  if (!list) return null;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = _agendaRowHTML({ id: step.id || generateId('ag'), item, host, kinds, branchDocId, toStage, brandActivityId,
    agendaStep: step.agendaStep || '', discussionAgendaItemId: step.discussionAgendaItemId || '' });
  const row = wrapper.firstElementChild;
  list.appendChild(row);
  // 行内动作（「删除该条」）直绑：`bindWritePanelEvents` 只在渲染那一轮绑**既有**元素，
  // 动态新增的行若不自绑，✕ 就是死按钮（2026-09-21 批次 127 真机实测：点 ✕ 行数 2 → 2 不变）
  row.querySelectorAll('[data-action]').forEach(el => el.addEventListener('click', handleWritePanelAction));
  if (branchDocId) row.dataset.docId = branchDocId; if (brandActivityId) row.dataset.brandActivityId = brandActivityId; _hydrateDraftDocs(row);
  _bindRowKindChips(row);
  _initRowPersonPicker(row, personIds);
  _refreshAgendaRelationControls(list);
  return row;
}

/** 表决项只可关联前面已出现的讨论项；议题文字变更时同步下拉选项。 */
function _refreshAgendaRelationControls(list) {
  if (!list) return;
  const earlierDiscussions = [];
  for (const row of list.querySelectorAll('.wp-agenda-row')) {
    const step = row.querySelector('.wp-agenda-step')?.value || '';
    const slot = row.querySelector('.wp-agenda-discussion-slot');
    const select = row.querySelector('.wp-agenda-discussion-ref');
    if (slot) slot.classList.toggle('hidden', step !== 'vote');
    if (select) {
      const previous = step === 'vote'
        ? (select.options.length ? select.value : (select.dataset.selected || ''))
        : '';
      select.replaceChildren();
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = earlierDiscussions.length ? '选择对应讨论项' : '请先添加前面的讨论项';
      select.appendChild(placeholder);
      for (const discussion of earlierDiscussions) {
        const option = document.createElement('option');
        option.value = discussion.id;
        option.textContent = discussion.label;
        option.selected = discussion.id === previous;
        select.appendChild(option);
      }
      select.disabled = step === 'vote' && earlierDiscussions.length === 0;
      if (!earlierDiscussions.some((discussion) => discussion.id === previous)) select.value = '';
      select.dataset.selected = select.value;
    }
    if (step === 'discussion') {
      const id = row.dataset.agendaId || '';
      const title = row.querySelector('.wp-agenda-item')?.value?.trim() || '';
      earlierDiscussions.push({ id, label: `${earlierDiscussions.length + 1}. ${title || '（尚未填写讨论事项）'}` });
    }
  }
}

/** 绑定单个议程行的类型 chips（多选不互斥；选中展开对应字段区） */
function _bindRowKindChips(row) {
  if (!row) return;
  row.querySelectorAll('.wp-agenda-kind').forEach(chip => {
    if (chip.dataset.bound) return;
    chip.dataset.bound = '1';
    chip.addEventListener('click', () => {
      chip.classList.toggle('wp-agenda-kind-on');
      if (chip.dataset.kind === 'discussion-file') row.querySelector('.wp-agenda-doc-slot')?.classList.toggle('hidden');
      if (chip.dataset.kind === 'attendee-list') row.querySelector('.wp-agenda-member-slot')?.classList.toggle('hidden');
    });
  });
}

/** 初始化议程行的待讨论名单多选（PersonPicker multi；实例挂 wp.agendaPickers 供收集读取；initialIds＝清单勾入时的预选） */
function _initRowPersonPicker(row, initialIds = []) {
  const slot = row.querySelector('.wp-agenda-person-slot');
  if (!slot || slot.dataset.bound) return;
  slot.dataset.bound = '1';
  const picker = new PersonPicker({
    mode: 'multi',
    placeholder: '选择待讨论名单（可多选）',
    accentColor: _accentHex(),
    stageBatch: true,
    initialIds: Array.isArray(initialIds) ? initialIds : [],
    onSelect: () => {},
  });
  picker.render(slot);
  wp.agendaPickers.push({ row, picker });
}

/** 填充议程行「会前草案」下拉（判据＝`branch-doc.js::isAgendaDraftDoc`：普通文件草案 ＋ 制度链上尚未成为现行版的两种态；异步，空态引导去资料查询写入） */
async function _hydrateDraftDocs(row) {
  const select = row?.querySelector('.wp-agenda-doc');
  if (!select) return;
  const hint = row.querySelector('.wp-agenda-doc-hint');
  try {
    // 经 branch-doc 服务读（按当前归属支部过滤；党委/无归属不过滤）——勿直读 adapter 全量
    const docs = await listBranchDocs();
    const drafts = docs.filter(isAgendaDraftDoc);
    select.innerHTML = `<option value="">${drafts.length ? '选择会前草案…' : '暂无会前草案'}</option>`
      + drafts.map(d => `<option value="${d.id}"${d.id === row.dataset.docId ? ' selected' : ''}>${d.title || d.fileName || '未命名草案'}</option>`).join('');
    if (hint) hint.classList.toggle('hidden', drafts.length > 0);
  } catch (e) {
    console.warn('[calendar] 会前草案加载失败：', e);
    select.innerHTML = '<option value="">草案加载失败</option>';
  }
}

function bindWritePanelEvents(container) {
  container.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', handleWritePanelAction);
  });
  // 折叠项（2026-10-25 Task 3）：通知 / 高级选项改原生 details，开合由浏览器承担，无需再绑脚本。
  // 会议议程初始行（T-283：三会一课模板默认 1 行空议程，减少首条输入点击）
  // 置于最前：避免后续参与人选择器（PersonPicker）初始化异常导致议程行被跳过
  const agendaList = container.querySelector('#wp-agenda-list');
  if (agendaList && agendaList.children.length === 0) _addAgendaRow(container);
  if (agendaList) {
    if (!agendaList.dataset.relationEventsBound) {
      agendaList.dataset.relationEventsBound = '1';
      agendaList.addEventListener('change', (event) => {
        if (event.target.matches('.wp-agenda-step, .wp-agenda-discussion-ref')) _refreshAgendaRelationControls(agendaList);
      });
      agendaList.addEventListener('input', (event) => {
        if (event.target.matches('.wp-agenda-item')) _refreshAgendaRelationControls(agendaList);
      });
    }
    agendaList.querySelectorAll('.wp-agenda-row').forEach((row) => {
      _hydrateDraftDocs(row);
      _initRowPersonPicker(row);
    });
    _refreshAgendaRelationControls(agendaList);
  }
  // 议程类型 chips（2026-09-01：多选不互斥；初始行绑定，新增行在 _addAgendaRow 内绑定）
  container.querySelectorAll('.wp-agenda-row').forEach((row) => _bindRowKindChips(row));
  // 主题党日模板：整卡可点（2026-09-03 支书澄清——点击热区=全卡，仍须点击进入；绝非 hover 自动进入）。
  // 卡内按钮区域直接点击走按钮自身（data-action）；其余区域（如标题色块）点击由本委托触发选择。
  container.querySelectorAll('[data-tpl-click="1"]').forEach((card) => {
    if (card.dataset.bound) return;
    card.dataset.bound = '1';
    card.addEventListener('click', (e) => {
      const btn = card.querySelector('[data-action="select-template"]');
      if (!btn) return;
      if (e.target.closest('button')) return; // 已由按钮自身处理，避免双击触发
      btn.click();
    });
  });
  // 参与人选择（PersonPicker 多选 + 按阶段批量；重渲染时保留已选，销毁旧实例防泄漏）
  // 2026-09-01：三会一课不强制积极分子参加但鼓励列席——阶段批量选择提供「积极分子」快捷项
  const participantsSlot = container.querySelector('#wp-participants-slot');
  if (participantsSlot) {
    const prevSelected = wp.personPicker ? wp.personPicker.getSelected() : [];
    if (wp.personPicker) wp.personPicker.destroy();
    wp.personPicker = new PersonPicker({
      mode: 'multi',
      placeholder: '选择参与人（选填，可多选）',
      accentColor: _accentHex(),
      initialIds: prevSelected,
      stageBatch: true,
      onSelect: () => {},
    });
    wp.personPicker.render(participantsSlot);
  }
  // 项目赋权（内嵌）：被赋权人选择器（单选）＋ 名单 chips 回显 ＋「加入名单」/「移除」
  const authSlot = container.querySelector('#wp-auth-slot');
  const buildAuthPicker = () => {
    if (!authSlot) return;
    if (wp.authPicker) wp.authPicker.destroy();
    const sameGroupOnly = container.querySelector('#wp-auth-same-group')?.checked !== false;
    const group = _selectedHostGroup();
    const filter = sameGroupOnly && group
      ? (person) => (person?.partyGroup || '') === group.name
      : null;
    wp.authPicker = new PersonPicker({
      mode: 'single',
      placeholder: sameGroupOnly && group ? `搜索${group.name}成员` : '搜索姓名或学号选择被赋权人',
      accentColor: _accentHex(),
      filter,
      onSelect: () => {},
    });
    wp.authPicker.render(authSlot);
  };
  buildAuthPicker();
  container.querySelector('#wp-auth-same-group')?.addEventListener('change', buildAuthPicker);
  _renderPendingAuth(container);
  container.querySelector('[data-action="wp-auth-add"]')?.addEventListener('click', () => {
    const personId = (wp.authPicker?.getSelected() || [])[0] || '';
    const role = container.querySelector('input[name="wp-auth-role"]:checked')?.value;
    if (!personId) { showToast('error', '请选择被赋权人'); return; }
    if (!role) { showToast('error', '请选择项目角色'); return; }
    wp.pendingAuth = wp.pendingAuth || [];
    if (wp.pendingAuth.some(x => x.personId === personId && x.role === role)) {
      showToast('warn', '该同志在此角色已在名单中'); return;
    }
    wp.pendingAuth.push({ personId, role });
    showToast('success', `已加入名单：${getPersonName(personId) || personId} · ${ROLE_LABELS[role] || role}`);
    _renderPendingAuth(container);
    _syncOrganizingScopeUI(container);
  });
  // 组织落点（2026-10-21 批次 499）：责任组 / 跨组招募 / 组织者跨组说明
  container.querySelector('#wp-host-group')?.addEventListener('change', () => {
    _syncOrganizingScopeUI(container);
    buildAuthPicker();
  });
  container.querySelector('#wp-cross-recruit')?.addEventListener('change', () => _syncOrganizingScopeUI(container));
  container.querySelector('#wp-organizer-exception')?.addEventListener('input', (e) => {
    wp.organizerExceptionReason = e.target.value;
  });
  // 主题党日正交维度按钮（单选组互斥 / 载体多选）
  container.querySelectorAll('[data-wp-dim]').forEach(el => {
    el.addEventListener('click', () => {
      const group = el.dataset.wpGroup;
      const multi = el.dataset.wpMulti === 'true';
      if (multi) {
        el.classList.toggle('wp-dim-on');
      } else {
        container.querySelectorAll(`[data-wp-group="${group}"]`).forEach(o => o.classList.remove('wp-dim-on'));
        el.classList.add('wp-dim-on');
      }
    });
  });
  // 品牌选择（T229：非品牌 / 延续已有品牌 / 创建新品牌）
  container.querySelectorAll('[data-wp-brand]').forEach(el => {
    el.addEventListener('click', () => {
      container.querySelectorAll('[data-wp-brand]').forEach(o => o.classList.remove('wp-brand-on'));
      el.classList.add('wp-brand-on');
      const mode = el.dataset.wpBrand;
      container.querySelector('#wp-brand-inherit')?.classList.toggle('hidden', mode !== 'inherit');
      container.querySelector('#wp-brand-create')?.classList.toggle('hidden', mode !== 'create');
    });
  });
  // 会议形式（2026-09-02 泛化：决策类场景选「线上异步表决」展开参与范围配置区）
  // I1：组级事件委托——handler 内统一查询组内选中态决定 toggle，不依赖单个 radio 的
  // change 分发顺序（切换时被取消选中与被选中的 radio 都会触发 change，旧逐 radio 实现结果相反）
  const voteConfigArea = container.querySelector('#wp-vote-config');
  if (voteConfigArea && !container.dataset.meetingFormBound) {
    container.dataset.meetingFormBound = '1';
    container.addEventListener('change', (e) => {
      if (e.target?.name !== 'wp-meeting-form') return;
      const isAsync = container.querySelector('input[name="wp-meeting-form"]:checked')?.value === 'async';
      voteConfigArea.classList.toggle('hidden', !isAsync);
    });
  }
}

function handleWritePanelAction(e) {
  const btn = e.currentTarget;
  const action = btn.dataset.action;

  switch (action) {
    case 'select-template': {
      // 2 步式：选择模板后直接进入 Step 2（表单填写）
      wp.selections.L1 = btn.dataset.category;
      wp.selections.L1Sub = btn.dataset.subtype;
      // 兼容旧字段：L2 = 'meeting'（三会一课）/ activityType（主题党日）
      wp.selections.L2 = btn.dataset.activityType || 'meeting';
      // 携带模板色（用于 Step 2 提示条）
      wp.selections._tplColor = btn.dataset.color || '';
      wp.selections._scenarioId = btn.dataset.scenarioId || '';
      wp.step = 2;
      break;
    }

    case 'wp-back': {
      // Step 2 → Step 1（重选模板）
      wp.step = 1;
      // 保留 L1/L1Sub 以便 Step 1 显示选中态
      break;
    }

    case 'wp-cancel': {
      // 取消写入 = 放弃本次编辑：清掉待提交赋权名单 / 选人器后再关窗（R3-02）
      _resetWriteState();
      closeModal(WRITE_MODAL_ID);
      return;
    }

    case 'agenda-add': {
      _addAgendaRow(_getWritePanelContainer());
      return; // 不重渲染面板
    }

    case 'agenda-add-vote-pair': {
      const container = _getWritePanelContainer();
      const discussion = _addAgendaRow(container, '', '', [], '', '', [], '', { agendaStep: 'discussion' });
      if (!discussion) return;
      _addAgendaRow(container, '', '', [], '', '', [], '', {
        agendaStep: 'vote', discussionAgendaItemId: discussion.dataset.agendaId,
      });
      showToast('info', '已添加一组讨论项和表决项，请分别填写议题内容');
      return;
    }

    case 'agenda-remove': {
      const list = btn.closest('#wp-agenda-list');
      const row = btn.closest('.wp-agenda-row');
      if (row) {
        if (list && list.children.length > 1) row.remove();
        else row.querySelectorAll('input, select').forEach(i => { i.value = ''; });
        _refreshAgendaRelationControls(list);
      }
      return;
    }

    case 'wp-submit': {
      handleSubmitActivity();
      return; // 不重新渲染面板
    }

    default:
      return;
  }

  // 重新渲染悬浮面板（T-217 §3：容器改为从悬浮内部定位）
  const container = _getWritePanelContainer();
  if (container) renderWritePanel(container);
}

// ── 写入活动逻辑 ──────────────────────────────────────────────

/** 提交按钮就地切换提交态（保态 2026-09-08：不再整面板重建——进行中/失败均保留已填内容与已选，
 *  仅按钮文案/禁用态切换；仅提交成功才 wp.reset() 重置面板（见 handleSubmitActivity 成功分支）） */
function _setWriteSubmitBtn(submitting) {
  const btn = _getWriteFooter()?.querySelector('[data-action="wp-submit"]');
  if (!btn) return;
  btn.textContent = submitting ? '写入中…' : '创建活动';
  btn.classList.toggle('opacity-50', submitting);
  btn.classList.toggle('cursor-not-allowed', submitting);
  btn.disabled = !!submitting;
}

async function handleSubmitActivity() {
  if (wp.submitting) return; // 提交进行中防重复点击（2026-09-08 保态：按钮就地禁用，无整面板重建）
  const dateEl = document.getElementById('wp-date');
  const locationEl = document.getElementById('wp-location');
  const titleEl = document.getElementById('wp-title');
  const descEl = document.getElementById('wp-desc');
  const timeEl = document.getElementById('wp-time');
  const hostEl = document.getElementById('wp-host');
  const directionEl = document.getElementById('wp-direction');
  const durationEl = document.getElementById('wp-duration');

  const date = dateEl?.value?.trim();
  const location = locationEl?.value?.trim();
  const title = titleEl?.value?.trim();
  const desc = descEl?.value?.trim();
  const time = timeEl?.value?.trim() || '';
  const host = hostEl?.value?.trim() || '';
  const direction = directionEl?.value || '';
  const duration = durationEl?.value || '';

  // 参与人（多选；须在 wp.submitting 触发重渲染前读取）
  const participants = wp.personPicker ? wp.personPicker.getSelected() : [];

  // 会议议程（T-283：三会一课逐条议题 + 主持人；2026-09-01：类型 chips 多选 + 待讨论名单多选，collectAgendaRows 规范化）
  const agenda = [];
  {
    const formArea = _getWritePanelContainer();
    if (formArea) {
      const rows = [...formArea.querySelectorAll('.wp-agenda-row')];
      const incompleteStep = rows.find((row) => {
        const step = row.querySelector('.wp-agenda-step')?.value || '';
        return step && !row.querySelector('.wp-agenda-item')?.value?.trim();
      });
      if (incompleteStep) {
        showToast('error', `${incompleteStep.querySelector('.wp-agenda-step')?.selectedOptions?.[0]?.textContent || '议程项'}请填写议题内容`);
        incompleteStep.querySelector('.wp-agenda-item')?.focus();
        return;
      }
      agenda.push(...collectAgendaRows(rows.map(row => {
        const kinds = [...row.querySelectorAll('.wp-agenda-kind.wp-agenda-kind-on')].map(c => c.dataset.kind);
        const pickerEntry = (wp.agendaPickers || []).find(entry => entry.row === row);
        const personIds = pickerEntry ? pickerEntry.picker.getSelected() : [];
        // S-2：逐人当前阶段快照（界面不再让人选「从什么」，由系统按各对象现值推导）
        const personStages = {};
        if (kinds.includes('attendee-list')) {
          for (const pid of personIds) {
            const stage = PersonStore.getById(pid)?.developStage;
            if (stage) personStages[pid] = stage;
          }
        }
        return {
          id: row.dataset.agendaId || '',
          item: row.querySelector('.wp-agenda-item')?.value || '',
          host: row.querySelector('.wp-agenda-host')?.value || '',
          agendaStep: row.querySelector('.wp-agenda-step')?.value || '',
          discussionAgendaItemId: row.querySelector('.wp-agenda-discussion-ref')?.value || '',
          kinds,
          branchDocId: row.querySelector('.wp-agenda-doc')?.value || '', brandActivityId: row.dataset.brandActivityId || '',
          personIds,
          personStages,
          toStage: row.querySelector('.wp-agenda-to')?.value || '',
        };
      })));
    }
  }
  const agendaStructure = validateAgendaStructure(agenda);
  if (!agendaStructure.ok) {
    showToast('error', agendaStructure.error);
    return;
  }
  // S-2 校验：待讨论名单须选目标阶段（否则无法派生成员变更申请）
  if (agenda.some(a => Array.isArray(a.personIds) && a.personIds.length > 0 && !a.toStage)) {
    showToast('error', '待讨论名单请选择目标阶段（转为发展对象 / 转为预备党员 / 转为正式党员）');
    return;
  }

  // 预拟通知（选填，2026-08-05 支书裁决「表单内预拟通知·只跑一次」）
  const noticeTitle = document.getElementById('wp-notice-title')?.value?.trim();
  const noticeContent = document.getElementById('wp-notice-content')?.value?.trim();

  // 主题党日正交维度（共建性质 / 是否外出 / 活动载体多选）
  let dimIsJoint = '';
  let dimIsOutdoor = '';
  let dimCarriers = [];
  if (wp.selections.L1 === 'theme-day') {
    const formArea = _getWritePanelContainer();
    if (formArea) {
      const picked = [...formArea.querySelectorAll('[data-wp-dim].wp-dim-on')];
      dimIsJoint = picked.find(o => o.dataset.wpGroup === 'isJoint')?.dataset.wpDimValue || '';
      dimIsOutdoor = picked.find(o => o.dataset.wpGroup === 'isOutdoor')?.dataset.wpDimValue || '';
      dimCarriers = picked.filter(o => o.dataset.wpGroup === 'carriers').map(o => o.dataset.wpDimValue);
    }
  }

  // 品牌（T229：非品牌 / 延续已有品牌 / 创建新品牌）
  let brandMode = 'none';
  let brandName = '';
  {
    const formArea = _getWritePanelContainer();
    const on = formArea?.querySelector('[data-wp-brand].wp-brand-on');
    if (on) {
      brandMode = on.dataset.wpBrand;
      if (brandMode === 'inherit') brandName = document.getElementById('wp-brand-select')?.value || '';
      if (brandMode === 'create') brandName = document.getElementById('wp-brand-input')?.value?.trim() || '';
    }
  }

  // 校验必填项（② §8.2：被支部隐藏的字段不校验；必填以 requiredOverrides 覆盖为准，缺省等价原硬编码）
  const sfp = _currentFieldPolicy();
  const sReq = (fid, dflt) => (Object.prototype.hasOwnProperty.call(sfp.requiredOverrides, fid) ? !!sfp.requiredOverrides[fid] : dflt);
  if (!sfp.hidden.has('title') && sReq('title', true) && !title) { showToast('error', '请填写活动名称'); titleEl?.focus(); return; }
  if (!sfp.hidden.has('date') && sReq('date', true) && !date) { showToast('error', '请选择日期'); dateEl?.focus(); return; }
  if (!sfp.hidden.has('location') && sReq('location', true) && !location) { showToast('error', '请填写活动地点'); locationEl?.focus(); return; }

  const scenarioId = wp.selections._scenarioId || wp.getScenarioId?.();
  if (!scenarioId) { showToast('error', '场景信息缺失，请重新选择模板'); return; }

  // 组织落点（2026-10-21 批次 499）：跨组只是参与/招募范围，活动必须有唯一责任党小组；
  //   支部级法定会议（支委会 / 党员大会 / 党课）单列 branch，不塞党小组。
  const branchLevel = isBranchLevelScenario(scenarioId);
  let hostGroupId = '';
  let hostGroupName = '';
  if (!branchLevel) {
    const hostSelect = document.getElementById('wp-host-group');
    hostGroupId = hostSelect?.value || wp.hostGroupId || '';
    const group = _branchPartyGroups().find((g) => g.id === hostGroupId);
    if (!group) { showToast('error', '请选择承办党小组'); hostSelect?.focus(); return; }
    hostGroupName = group.name;
    wp.hostGroupId = hostGroupId;
  }
  const crossRecruit = !branchLevel && !!document.getElementById('wp-cross-recruit')?.checked;
  wp.crossRecruit = crossRecruit;
  const crossAuth = _pendingAuthCrossGroup();
  if (crossAuth.deep.length && !crossRecruit) {
    showToast('error', '名单中有跨党小组深度参与者：请标记「跨组招募」，由组织委员协调');
    return;
  }
  if (crossRecruit && !_orgCommissionerId()) {
    showToast('error', '本支部未配置组织委员，暂不能跨组招募深度参与者');
    return;
  }
  const organizerExceptionReason = (document.getElementById('wp-organizer-exception')?.value
    || wp.organizerExceptionReason || '').trim();
  if (crossAuth.organizers.length) {
    // 组织者一般由责任党小组承担；他组同志属例外——软提示不阻断，但须留说明。
    const ok = await confirmNudge({
      nudgeKey: 'activity-write',
      who: '承办党小组',
      verb: '承担组织者',
      why: '组织者一般由本组承担，跨组承担属例外；确认后将随活动留存说明。',
      context: title,
    });
    if (!ok) { document.getElementById('wp-organizer-exception')?.focus(); return; }
    if (!organizerExceptionReason) {
      showToast('error', '请填写组织者跨组说明（将随活动留存）');
      document.getElementById('wp-organizer-exception')?.focus();
      return;
    }
  }

  // 会议形式（2026-09-02 线上异步表决泛化：决策类场景选「线上异步表决」→ 写入 voteConfig，
  // 参与范围按用户选择解析固化应到名单 voterIds；线下开会不写 voteConfig）
  // ②批（2026-09-06）：resolveVoterIds 已按现时居住状态剔滞留（roster 口径）→ 此处生成的
  //   voterIds = 应到名单快照；已创建活动（历史快照）不回改
  const voteFormArea = _getWritePanelContainer();
  const meetingForm = voteFormArea?.querySelector('input[name="wp-meeting-form"]:checked')?.value || 'onsite';
  let voteConfig = null;
  if (meetingForm === 'async') {
    const vc = defaultVoteConfig(scenarioId);
    if (vc) {
      const voterScope = voteFormArea?.querySelector('input[name="wp-vote-scope"]:checked')?.value || vc.voterScope;
      const picked = voteFormArea?.querySelector('input[name="wp-ballot-mode"]:checked')?.value;
      // 计票方式（2026-09-12 支书裁定）：正式表决制度强制无记名——UI 只读且此处兜底拦截；
      // 事务性表决默认记名，发起人可选无记名（口径同场统一，固化写入活动 voteConfig）。
      if (isAnonymousForced(vc.optionSet) && picked === 'named') {
        showToast('error', '正式表决须采用无记名投票，不可改为记名');
        return;
      }
      const ballotMode = isAnonymousForced(vc.optionSet)
        ? 'anonymous'
        : ((picked === 'anonymous' || picked === 'named') ? picked : vc.ballotMode);
      // ③ §8.3：应到名单快照按「生效名单解析模式」解析（创建时指派层为空 ⇒ 等同既有角色全集口径）
      voteConfig = { ...vc, ballotMode, voterScope, voterIds: resolveParticipantIds(voterScope, _effectiveParticipantPolicy(scenarioId), []) };
    }
  }

  // 本位 nudge（2026-09-23 支书裁定 · 单一源 `components/ui/modal.js::confirmNudge`）：
  //   **活动由党小组组长写入**（母本《党小组组长工作手册》「创建活动仅限支书、副支书和党小组组长」＋
  //   《常见工作场景快速指南》「活动由党小组组长写入——写入时同时指定该次活动的组织者」）⇒ 本台登录人
  //   （支书 / 副支书）写入属**例外代办** ⇒ **提交前**弹一次确认（点「仍由我继续」才继续写入）。
  //   ⚠ 位置在**全部校验之后、真正写链之前**：校验不通过仍即时报错、不弹（既有真机闭环普查不变）。
  //   ⚠ 弹窗**必须点按钮才能关**（不点遮罩 / 不按 Esc / 不自动超时）；「取消」＝放弃本次写入
  //     （浮窗与已填内容保留，便于改由组长写入）。
  const _writeRole = AuthStore.getCurrentUser()?.role;
  // 未赋权判据（2026-10-01 批次 326 · 支书裁定 `SOP-G-2-①` ＝ 乙）：内嵌赋权名单为空 ⇒ 本场未指定组织者
  //   （＝尚未完成赋权），偏离母本「写入活动时同时指定该次活动的组织者」⇒ **提交前软提示一次**、
  //   **可继续提交**。⚠ 若写入人不是本位（另有「本位」nudge），把本段**折进那一窗**（`noGrant`），
  //   避免同一次提交连弹两个窗。
  const _noGrant = !(wp.pendingAuth || []).length;
  if (_writeRole !== 'leader' && _writeRole !== 'deputy-leader') {
    const _homeOk = await confirmNudge({
      nudgeKey: 'activity-write', context: title,
      noGrant: _noGrant ? { subject: '活动', context: title } : null,
    });
    if (!_homeOk) return;
  } else if (_noGrant) {
    const _grantOk = await confirmWriteWithoutGrant({ subject: '活动', context: title });
    if (!_grantOk) return;
  }

  wp.submitting = true;
  _setWriteSubmitBtn(true); // 保态 2026-09-08：就地禁用提交按钮，不再 renderWritePanel 整面板重建（保留已填内容）

  try {
    const activityData = {
      title,
      // 活动类型写入权威子类中文名（ACTIVITY_SUBTYPES 成员）——normalizeActivityType 兜底，
      // 避免写入 '大类·子类' 形式（2026-09-13 口径收敛）
      type: normalizeActivityType(
        wp.selections.L1 === 'three-meetings'
          ? (wp.config?.L1Sub?.['three-meetings']?.find(o => o.value === wp.selections.L1Sub)?.label
            || SCENARIO_LABELS[scenarioId] || '三会一课')
          : '主题党日',
      ),
      subtype: wp.selections.L1Sub || '',
      status: 'draft',
      visibility: 'branch',
      date,
      targetDate: date,
      time,
      location,
      description: desc || '',
      host: host || '',
      scenarioId,
      domain: 'activity',
      executor: 'secretary',
      supervisor: null,
      // 2026-09-13 dogfood 同类彻查：创建人审计取真实登录成员（原写死占位 ID 'u_sec'）
      createdBy: AuthStore.getCurrentUser()?.personId || null,
      branchId: AuthStore.getCurrentUser()?.branchId || getBranchIdOfPerson(AuthStore.getCurrentUser()?.personId),
      // 2026-10-21 批次 502：组织落点只有两档（支部级 / 承办党小组）；「跨组」只由招募范围表达。
      organizingScope: branchLevel ? ACTIVITY_SCOPES.BRANCH : ACTIVITY_SCOPES.PARTY_GROUP,
      hostGroupId: branchLevel ? null : hostGroupId,
      hostGroup: branchLevel ? '' : hostGroupName,
      recruitmentScope: crossRecruit ? 'cross-group' : 'group',
      ...(crossRecruit ? { crossGroupCoordinatorId: _orgCommissionerId() } : {}),
      ...(organizerExceptionReason ? { organizerExceptionReason } : {}),
      // 2 步式元数据（替代旧 _dt_L3/L4）
      _dt_L1: wp.selections.L1,
      _dt_L1Sub: wp.selections.L1Sub || '',
      _dt_L2: wp.selections.L2 || '',
      _dt_direction: direction,
      _dt_duration: duration,
      // 主题党日正交维度（业务首类字段，见 DATA_ARCHITECTURE.md §2.1.2）
      isJoint: dimIsJoint,
      isOutdoor: dimIsOutdoor,
      carriers: dimCarriers,
      // 品牌族名称（延续旧品牌 / 创建新品牌）——2026-09-21 批次 132：**只记名称、不置 isBrand**
      // （品牌认定＝提案 → 支委会通过后确定；写入即认定属「点一下直接认定」的后门，本批收掉）
      brandName: brandMode !== 'none' ? brandName : '',
      // 参与人（内联赋权：非空则 createActivity 不再派生组长赋权待办）
      assignments: participants.map(pid => ({ personId: pid, role: 'participant' })),
      // 会议议程（T-283：三会一课）
      agenda,
    };
    if (voteConfig) activityData.voteConfig = voteConfig;
    // 2026-09-06 点验修复③：取 create 返回值拿刚创建的活动 id（预拟通知绑定 targetType/targetId）
    const { activity, taskCount } = await writeActivityWithSOP(activityData, scenarioId, date);
    showToast('success', `活动写入成功，已生成 ${taskCount} 项后续待办`);

    // 3.5 项目赋权（内嵌写入，批次 303）：活动创建成功后逐条落库——写口与独立赋权块同源
    const _pendingAuth = wp.pendingAuth || [];
    if (_pendingAuth.length && activity?.id) {
      let _okCount = 0;
      const _permissionRoot = document.querySelector('#modal-overlay-write-activity .modal-body');
      const permissionKeysByRole = readWorkgroupPermissionEditor(_permissionRoot, 'secretary-activity', { includeDefaults: true });
      for (const _a of _pendingAuth) {
        const _r = await AuthStore.authorize(AuthStore.getCurrentUser()?.personId, _a.personId, _a.role, {
          projectId: activity.id, permissionKeys: permissionKeysByRole[_a.role],
        });
        if (_r?.ok) _okCount += 1;
      }
      if (_okCount) showToast('success', `已随活动写入项目赋权 ${_okCount} 条`);
      wp.pendingAuth = [];
    }

    // 4. 渲染工作流可视化面板
    const definitionId = wp.mapToDefinitionId();
    renderWorkflowPanel('secretary-workflow', 'secretary-write', definitionId, title);

    // 5. 预拟通知「只跑一次」（2026-08-05）：仅在表单填写了标题时发布一条通知，单次调用不重复发。
    // R-22（2026-09-13）：系统派生通知改由服务端生成（kind 注册表复算授权 + 落点；标题/正文为发布人所填）
    if (noticeTitle) {
      NoticeStore.addSystem('activity-notice-draft', activity.id, {
        title: noticeTitle,
        content: noticeContent,
        expireDate: date,
        activityTitle: title,
      });
      showToast('success', '已自动发布通知');
    }

    // 6. 重置面板状态
    wp.reset();

    // 7. 清理参与人选择器（防 DOM 泄漏）
    if (wp.personPicker) { wp.personPicker.destroy(); wp.personPicker = null; }

    // 8. 刷新活动列表（反馈闭环：创建后立即可见）
    // 2026-08-27 T-283 修复：setState 触发链在本场景偶发不刷新日历（实测需手动切 tab 才可见），
    // 加 renderContent 直接兜底重渲染——创建成功即见成果，无需用户二次操作。
    try {
      const activities = await BranchService.listActivities();
      setState({ activities });
    } catch (_) { /* 列表刷新失败不影响写入结果*/ }
    try {
      renderContent(getAppState());
    } catch (e) { console.warn('[T283] 创建后兜底渲染失败', e); }

    // 9. 成功后关闭悬浮（T-217 §3 全悬浮化）
    closeModal(WRITE_MODAL_ID);

  } catch (err) {
    console.error('[WritePanel] 写入失败', err);
    showToast('error', describeWriteError(err));
    wp.submitting = false;
    // 失败：保留悬浮与已填内容（保态 2026-09-08：仅提交成功才重置面板），就地恢复提交按钮
    _setWriteSubmitBtn(false);
  }
}

// ── 写入表单议程行的「已附材料 N 件」同款提示（SOP-B-13 第 4 项 · D-305 / D-490）───────────────
// 与活动详情页（components/record/inspector.js::_agendaTypeBadges）同款：同一口径函数 `_draftMaterialCount`、
// 同一文案与 `title`；**只展示、不拦写入、不提供第二个材料库入口**（材料本体仍归那份草案）。
// ⚠ **位置：追加在本文件末尾**——在文件中段插入会整体位移既有的 `文件:行号` 引用
// （同 2026-09-21 批次 121「置于文件末尾」的处置）。
// 绑定走 `#wp-agenda-list` 的事件委托：`change` 覆盖「选中会前草案」；`click` 覆盖「删除议程」那处
// 只清空 select.value、不发 change 的复位路径。
function _agendaDocMaterialEl(select) {
  const row = select?.closest?.('.wp-agenda-row');
  if (!row) return null;
  let el = row.querySelector('.wp-agenda-doc-material');
  if (!el) {
    el = document.createElement('p');
    el.className = 'wp-agenda-doc-material text-xs text-gray-500 mt-1 hidden';
    el.title = '过程材料（试点意见 / 征求意见 / 修改说明）随草案归档，本处只作数量提示';
    el.textContent = '已附材料 0 件';
    (row.querySelector('.wp-agenda-doc-hint') || select).insertAdjacentElement('afterend', el);
  }
  return el;
}

async function _syncAgendaDocMaterial(select) {
  const el = _agendaDocMaterialEl(select);
  if (!el) return;
  if (!select.value) { el.classList.add('hidden'); return; }
  try {
    // 经 branch-doc 服务读（与下拉同源；按 id 取单份，同 inspector.js 的单条解析口径）
    const doc = (await listBranchDocs()).find((d) => d.id === select.value);
    if (!doc) { el.classList.add('hidden'); return; }
    el.textContent = `已附材料 ${_draftMaterialCount(doc)} 件`;
    el.classList.remove('hidden');
  } catch (e) {
    console.warn('[calendar] 已附材料提示计算失败：', e);
    el.classList.add('hidden');
  }
}

function _syncAllAgendaDocMaterials() {
  document.querySelectorAll('#wp-agenda-list .wp-agenda-doc').forEach((s) => { _syncAgendaDocMaterial(s); });
}
document.addEventListener('change', (e) => { if (e.target?.closest?.('#wp-agenda-list')) _syncAllAgendaDocMaterials(); });
document.addEventListener('click', (e) => { if (e.target?.closest?.('#wp-agenda-list')) _syncAllAgendaDocMaterials(); });

// ════════════════════════════════════════════════════════════════
//  「拟上会」清单（2026-09-21 批次 127 · `SOP-B-33` 取（乙）档 · `D-411` 建议档）
// ════════════════════════════════════════════════════════════════
// 归集单一源 = `agenda-form.js::buildAgendaCandidates`（纯函数）；本处只做 IO 与呈现。
// 落点＝**议程编辑的既有面**（写入活动的「会议议程」区）——不新开页面、不按来源各做导入口；
// 勾中的事项**直接成为议程行**（item / kinds / 引用字段按类目给定，与会前草案下拉同一判据）。
// ⚠ 本段置于文件末尾（紧邻既有的两处 `document` 级监听）：**不改动上文任何行的行号**——
//   `README-server.md:587` 与本文件的 `文件:行号` 引用按 R-87 守卫逐条核，位移会指错地方。

/** 拉取四类来源（各取既有出口；任一类失败只少一类、不阻断表单）。三个源按需动态载入（避免为一段 UI 撑大本页静态依赖图） */
async function _loadAgendaCandidateSources() {
  const out = { taskforceProposals: [], issues: [], draftDocs: [], members: [], stageEntries: {} };
  const [{ TaskForceRecordStore }, { IssueStore }, { loadStageEntryDates }] = await Promise.all([
    import('../../../services/activity/taskforce.js?v=20261102b'),
    import('../../../services/governance/issues.js?v=20261102b'),
    import('../../../services/member/member-confirmation.js?v=20261102b'),
  ]);
  try { out.taskforceProposals = TaskForceRecordStore.listCommitteeRequests(); }
  catch (e) { console.warn('[calendar] 专班待议加载失败：', e); }
  try {
    await IssueStore.loadAll();
    out.issues = IssueStore.getAll().filter(i => i.status === 'open' && !i.hidden && !i.mergedInto);
  } catch (e) { console.warn('[calendar] 意见反馈加载失败：', e); }
  try {
    const docs = await listBranchDocs();
    out.draftDocs = docs.filter(isAgendaDraftDoc); // 同一判据（含制度草案 / 待党员大会表决，2026-09-21 批次 129）
  } catch (e) { console.warn('[calendar] 制度草案加载失败：', e); }
  try { out.members = PersonStore.getMembers(); }
  catch (e) { console.warn('[calendar] 成员档案读取失败：', e); }
  try { out.stageEntries = loadStageEntryDates(); }
  catch (e) { console.warn('[calendar] 发展推进档案读取失败：', e); }
  try { out.brandProposals = listBrandProposals().map(bp => ({ ...bp, proposal: { ...bp.proposal, proposedByName: bp.proposal && bp.proposal.by ? (PersonStore.getById(bp.proposal.by)?.name || '') : '' } })); }
  catch (e) { console.warn('[calendar] 品牌认定提案加载失败：', e); }
  return out;
}

/** 清单行（checkbox 上带齐议程行所需入参，勾选后不再二次查表） */
function _agendaCandidateRowHtml(c) {
  return `
    <label class="flex items-start gap-2 p-2 rounded-lg hover:bg-white cursor-pointer">
      <input type="checkbox" class="wp-cand-check mt-0.5" data-ref-id="${esc(c.refId)}"
        data-item="${esc(c.item)}" data-host="${esc(c.host)}"
        data-kinds="${esc((c.kinds || []).join(','))}" data-branch-doc-id="${esc(c.branchDocId || '')}"
        data-brand-activity-id="${esc(c.brandActivityId || '')}"
        data-to-stage="${esc(c.toStage || '')}" data-person-ids="${esc((c.personIds || []).join(','))}">
      <span class="flex-1 min-w-0">
        <span class="block text-xs font-medium text-gray-700">${esc(c.text)}</span>
        <span class="block text-xs text-gray-500 mt-0.5">${esc(c.meta)}</span>
      </span>
    </label>`;
}

/** 清单主体（按类目分组；**整张清单为空 → 一行空态、不报错**） */
function _agendaCandidatesHtml(rows) {
  if (!rows.length) {
    return emptyStateHtml({ text: "暂无可上会事项", variant: 'inline' });
  }
  let html = '';
  for (const g of AGENDA_CANDIDATE_GROUPS) {
    const list = rows.filter(r => r.group === g.key);
    if (!list.length) continue;
    html += `<div class="mb-1.5">`;
    html += `<p class="text-xs font-medium text-gray-600 px-1">${esc(g.label)} · ${list.length}<span class="text-gray-500 font-normal ml-1.5">${esc(g.hint)}</span></p>`;
    html += list.map(_agendaCandidateRowHtml).join('');
    html += `</div>`;
  }
  html += `<div class="pt-1.5 mt-1 border-t border-gray-100 flex items-center gap-2">`;
  html += `<button type="button" data-action="agenda-candidates-add" class="text-xs px-3 py-1.5 rounded-lg btn-accent text-white font-medium">加入本场议程</button>`;
  html += `<span class="text-xs text-gray-500">勾选后可一次加入多条（加入后即成为议程行，可再逐条改写）</span>`;
  html += `</div>`;
  return html;
}

/** 异步归集并填充清单（只跑一次；点击一律走文件末尾那处 document 级委托） */
async function _hydrateAgendaCandidates(host) {
  if (!host || host.dataset.bound) return;
  host.dataset.bound = '1';
  host.innerHTML = '<p class="text-xs text-gray-500 px-1 py-1">正在归集…</p>';
  const rows = buildAgendaCandidates(await _loadAgendaCandidateSources());
  host.innerHTML = _agendaCandidatesHtml(rows);
}

/** 清单内点击（document 级委托，见文件末尾）：展开/收起清单 + 勾选后一次加入本场议程 */
function _onAgendaCandidatesClick(e) {
  const toggle = e.target.closest('[data-action="agenda-candidates-toggle"]');
  if (toggle) {
    const host = _getWritePanelContainer()?.querySelector('#wp-agenda-candidates');
    if (host) {
      const willShow = host.classList.contains('hidden');
      host.classList.toggle('hidden', !willShow);
      if (willShow) _hydrateAgendaCandidates(host); // 首次展开才拉数据（异步归集）
    }
    return;
  }
  const btn = e.target.closest('[data-action="agenda-candidates-add"]');
  if (!btn) return;
  const host = btn.closest('#wp-agenda-candidates');
  const container = _getWritePanelContainer();
  if (!host || !container) return;
  const picked = [...host.querySelectorAll('.wp-cand-check:checked')];
  if (!picked.length) { showToast('info', '请先勾选要加入议程的事项'); return; }
  for (const cb of picked) {
    const kinds = String(cb.dataset.kinds || '').split(',').map(s => s.trim()).filter(Boolean);
    const personIds = String(cb.dataset.personIds || '').split(',').map(s => s.trim()).filter(Boolean);
    _addAgendaRow(container, cb.dataset.item || '', cb.dataset.host || '', kinds,
      cb.dataset.branchDocId || '', cb.dataset.toStage || '', personIds, cb.dataset.brandActivityId || '');
  }
  picked.forEach(cb => { cb.checked = false; }); // 已加入 → 取消勾选（可继续勾别的）
  showToast('success', `已加入 ${picked.length} 条议程`);
}
// document 级委托（与上文两处 `#wp-agenda-list` 监听同法）：展开按钮在清单宿主之外、
// 清单内容又是异步填入 ⇒ 只能在 document 上委托（宿主/面板重渲染都不影响）。
document.addEventListener('click', (e) => {
  if (e.target?.closest?.('[data-action="agenda-candidates-toggle"]') || e.target?.closest?.('#wp-agenda-candidates')) {
    _onAgendaCandidatesClick(e);
  }
});

// ════════════════════════════════════════════════════════════════
//  右栏活动卡 → 活动完整页出口（2026-10-18 脏专项 Task 17）
// ════════════════════════════════════════════════════════════════
// 口径：共享 inspector 的右栏活动卡点击只落本页详情/摘要，缺「完整页」出口 ⇒ 渲染后逐卡补一枚
//   「查看活动详情」深链（复用既有 `activity.html?id=`，与左栏活动条目 / 活动查询同落点）。
// ⚠ 不改共享 `components/record/inspector.js`（六台共用）：本函数只做**本台渲染后的装饰**，
//   列表卡与详情态都保证有出口；链接点击用 capture 截住，避免被卡片自身的「进详情」处理器吞掉。
function _decorateInspectorActivityLinks() {
  const host = document.getElementById('inspector-cards');
  if (!host) return;
  if (!host.dataset.secDetailLinkGuard) {
    host.dataset.secDetailLinkGuard = '1';
    host.addEventListener('click', (e) => {
      if (e.target.closest('[data-sec-activity-open]')) e.stopPropagation();
    }, true);
  }
  const linkOf = (actId) => {
    const href = objectDetailHref('activity', actId, { entry: 'owner-workspace' });
    if (!href) return null;
    const a = document.createElement('a');
    a.href = `./${href}`;
    a.className = 'inline-block mt-1 text-xs text-accent transition-colors hover:bg-[var(--app-accent-tint)]';
    a.dataset.secActivityOpen = '1';
    a.textContent = '打开完整页 →';
    a.title = '打开活动详情完整页';
    return a;
  };
  host.querySelectorAll('[data-act-id]').forEach((card) => {
    const actId = card.dataset.actId;
    if (!actId || card.querySelector('[data-sec-activity-open]')) return;
    // 共享 inspector 已按「当日清单 + 就地动作」渲染完整出口（查看详情 / 写纪要 / 考勤），
    // 不再叠加第二枚同义链接。
    if (card.querySelector('[data-inspector-actions]')) return;
    const link = linkOf(actId);
    if (link) card.appendChild(link);
  });
  // 详情态：共享详情面板已带支书专属深链；若整块仍无出口（口径变更 / 非支书身份），补在标题之后。
  if (!document.querySelector('#inspector-content a[href*="activity.html"]')) {
    const st = getAppState() || {};
    if (st.viewMode === 'detail' && st.selectedActivityId) {
      const link = linkOf(st.selectedActivityId);
      if (link) document.getElementById('inspector-date-title')?.insertAdjacentElement('afterend', link);
    }
  }
}
