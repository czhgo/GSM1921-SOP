// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  组织委员工作台 Tab：成员名册（立项⑥ B波，2026-09-06；C 批成员变更确认复核接线）
// ════════════════════════════════════════════════════════════════
//  支书口径：名册全面网页化——网页上直接 新增/编辑 成员、改 分组/发展阶段/在册滞留、
//  移出（历史记录经支书确认转「已转出」，不删不匿名）。操作双形态持久（A波 PersonStore 写口已就绪：
//  saveMember/removeMember，mock 持久 / api users 落库——本 Tab 只消费、不重复实现）。
//
//  C 批（R4-1/R4-2/R4-3，支书裁定，2026-09-06）：
//   · 发展阶段 / 在册滞留 = 组织委员发起 → 支书确认生效（双层留痕、可退回）——
//     提交经 member-confirmation.submitMemberChange，生效前行格显示「待确认」；
//     C①-补（2026-09-10）：阶段变更时同源写入 gsm1921-dev-stage-overrides，
//     恢复组织台发展节点提醒派生；
//   · 「移出」（2026-09-14 批次 25 起）= member-flow.js::registerOutflow（登记即生效）：
//     单人即登记流出（软标记移出 + 账号停用 + 记台账 + 留痕），原考勤/考察历史保留、可撤销；
//     旧「有历史 → 报支书确认（转「已转出」）」分支随流出登记即生效一并移除。
//
//  2026-09-13（支书 grill-me 面谈定案「模态内分流」）：
//   行内不再就地编辑；行内「编辑」统一打开成员档案编辑模态 components/person-edit-modal.js——
//   模态内按写路径分组：姓名/学号/党小组（档案属性）直改即时生效；发展阶段/在册状态/在册备注
//   （制度变更）报支书确认后生效，逐行小标区分「立即生效」/「报支书确认」。本 Tab 仅保留入口
//   与「待确认」可见性（listPendingConfirmations）。
//
//  2026-09-14（批次 25，支书裁定「成员流动」复式台账）：
//   本 Tab 新增「成员流动」面板（名册卡之后）——流入/流出登记（登记即生效）、对账行、台账表、撤销。
//   名册行内「移出」改接 member-flow.js::registerOutflow（单人即登记流出：软标记移出 + 账号停用 +
//   记台账 + 留痕），旧的「已报送支书确认」分支已随流出登记即生效而移除。
//   硬规范：台账筛选/分页统一走检索引擎 components/list-filter.js（关键词：姓名/学号/经手人；
//   方向分面：流入/流出；筛选行禁 chip）；登记流出选人用 PersonPicker（禁 select 罗列人名）；
//   登记/撤销角色门 = canRegisterFlow（组织委员 + 支书/副支书）。
//
//  本 Tab 职责边界（与「人才库」talent-tab 分工，避免重复建设）：
//   · 人才库 = 成员浏览 + 考察记录画像 + 成员状态详情维护（保持现状，不动）；
//   · 成员名册 = 名单管理主位：新增成员、经模态编辑档案、移出（成员变更确认复核链路）。
//     两处编辑同一数据链（PersonStore + roster 覆盖层），
//     任一改动即被应到口径（纪检考勤/支书复核卡）与对方界面读到。
//  数据/枚举单一源：PersonStore.getMembers（含 members 持久覆盖层 + 预览叠加）；
//    党小组 = services/party-group.js::groupOptions()（活组，按 seq 升序；运行时为准，禁写死组名）；
//    发展阶段 = org-base-data-preview 的 DEVELOP_STAGE_OPTIONS（由静态种子派生，禁造新枚举）；
//    在册状态 = core/constants.js.RESIDENCE（单一源）。
//  在册滞留写链（与纪检/支书复核同源，防覆盖层与档案互相遮蔽）：
//    支书确认生效时先 roster.saveResidenceChange（RESIDENCE_KEY 覆盖 + 留痕）→ 再 saveMember 镜像进档案。
// ════════════════════════════════════════════════════════════════

import { PersonStore, getPersonName } from '../../../services/person.js?v=20260921p';
import { getRosterStats, getResidenceOf } from '../../../services/roster.js?v=20260921p';
import { listPendingConfirmations } from '../../../services/member-confirmation.js?v=20260921p';
import { DEVELOP_STAGE_OPTIONS } from '../../../services/org-base-data-preview.js?v=20260921p';
// 党小组常态清单唯一来源（活组、按 seq 升序；新增/改名/解散后随渲染即时可见）
import { groupOptions } from '../../../services/party-group.js?v=20260921p';
import { AuthStore } from '../../../services/auth.js?v=20260921p';
// Q-21-3 收敛（2026-09-13）：在册状态枚举单一源 = core/constants.js（原经 roster.js 转出）
import { ROLE_LABELS, RESIDENCE } from '../../../core/constants.js?v=20260921p';
import { showToast, escHtml as esc, getBasePath } from '../../../core/utils.js?v=20260921p';
import { openModal, closeModal, openFormModal } from '../../../components/modal.js?v=20260921p';
// 统一成员档案编辑模态（成员名册行内「编辑」入口；模态内按字段分流：档案属性立即生效 / 制度变更报支书确认）
import { openPersonEditModal } from '../../../components/person-edit-modal.js?v=20260921p';
// 纯逻辑（可单测）：新增表单校验
import { validateMemberForm } from '../../../services/roster-ui-logic.js?v=20260921p';
// 统一检索引擎（2026-09-13 表格统一化批次 A）：名册列表接入关键词 + 分面（≤8 行引擎自动不渲染检索条）
import { renderFilteredList, personKeyword, personFacets, roleLabelOf } from '../../../components/list-filter.js?v=20260921p';
// 成员流入/流出登记服务层（2026-09-14 批次 25 支书裁定）：登记即生效 + 台账 + 对账 + 撤销
import {
  loadMemberFlows, reconcile, registerIntake, registerIntakeBatch,
  registerOutflow, revokeFlow, canRegisterFlow,
} from '../../../services/member-flow.js?v=20260921p';
// 选人规范：凡选择具体人一律 PersonPicker（禁 select 罗列人名）——登记流出选人
import { PersonPicker } from '../../../components/person-picker.js?v=20260921p';
// 支部归属解析（当前操作人 → 支部 id）：台账/对账/登记同支部口径
import { getBranchIdOfPerson } from '../../../services/branch.js?v=20260921p';
// 自定义圆角下拉增强（select.input-flat.text-xs → cs-trigger；与全局 observer 幂等）
import { enhanceSelects } from '../../../components/custom-select.js?v=20260921p';

// 模块级 ctx 缓存：行内保存/删除/新增后整页刷新复用首次渲染的 accent
let _ctx = null;

/** 登记流出弹窗的 PersonPicker 实例（提交/取消时销毁，防浮层泄漏） */
let _outflowPicker = null;

/** 发展阶段展示排序（仅排序用，值仍出自 DEVELOP_STAGE_OPTIONS，不新增枚举） */
const STAGE_ORDER = ['正式党员', '预备党员', '发展对象', '积极分子'];

/** 支部层成员（党委组织员 p_pc 组织级角色不属于支部，不参与名册管理） */
function _branchMembers() {
  return PersonStore.getMembers().filter(p => p.branchId !== null && p.branchId !== undefined);
}

/** 操作人（审计/留痕 updatedBy；组织委员位兜底 p11，同 talent-tab 口径） */
function _actorId() {
  return AuthStore.getCurrentUser()?.personId || 'p11';
}

/** 操作人角色（成员流动登记权限门 canRegisterFlow 入参） */
function _actorRole() {
  return AuthStore.getCurrentUser()?.role || null;
}

/** 当前操作人所属支部 id（台账/对账/登记同支部口径；无档案兜底 br-b1，与数据层缺省一致） */
function _branchId() {
  return getBranchIdOfPerson(_actorId());
}

/** 待支书确认索引（一致性刷新：渲染/移出共用同一来源 listPendingConfirmations）
 *  · out 集为**存量兼容**（Q-23-6，批次 29 复核保留）：移出改「登记即生效」（批次 26）后不再产生
 *    transferOut pending，但旧版落库请求经 localStorage 跨刷新仍会出现在队列里，
 *    故保留行内「移出待确认」小标与上方汇总计数，与 member-confirmation 的存量分支同源。 */
function _pendingMap() {
  const pends = listPendingConfirmations();
  return {
    stage: new Set(pends.filter(r => r.action === 'developStage').map(r => r.personId)),
    res: new Set(pends.filter(r => r.action === 'residence').map(r => r.personId)),
    out: new Set(pends.filter(r => r.action === 'transferOut').map(r => r.personId)),
    list: pends,
  };
}

// ════════════════════════════════════════════════════════════════
//  渲染入口
// ════════════════════════════════════════════════════════════════

export function renderContent(ctx) {
  _ctx = ctx || _ctx;
  const container = document.getElementById('org-tab-content');
  if (!container) return;

  const members = _branchMembers();
  const stats = getRosterStats({ type: '支部党员大会' }); // 支部三会+党课统一口径
  // 组统计以活组清单（groupOptions）为准；未分组 = 档案 partyGroup 为空（不属任何党小组）
  const groupStats = groupOptions().map(g => ({ g, s: getRosterStats({ type: '党小组会', groupId: g }) }));
  const ungroupedCount = members.filter(p => !p.partyGroup).length;
  const pend = _pendingMap();
  const canRegister = canRegisterFlow(_actorRole());
  const pendParts = [];
  if (pend.stage.size) pendParts.push(`阶段变更 ×${pend.stage.size}`);
  if (pend.res.size) pendParts.push(`在册状态 ×${pend.res.size}`);
  if (pend.out.size) pendParts.push(`移出 ×${pend.out.size}`);

  container.innerHTML = `
    <div class="space-y-4">
      <div class="card rounded-xl p-5">
        <div class="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div class="flex items-center gap-3">
            <h3 class="font-title-cn text-base font-semibold text-gray-800">成员名册</h3>
            <span class="text-xs text-gray-500" title="统计范围：本支部在册成员（branchId 非空），不含党委组织员等非本支部人员">${members.length} 人 · 本支部在册</span>
          </div>
          <div class="flex items-center gap-2">
            <button id="roster-add-btn" type="button" class="text-xs px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors whitespace-nowrap" style="cursor:pointer;">＋ 新增成员</button>
          </div>
        </div>
        <p class="text-xs text-gray-500 mb-3">成员名册逐人「新增 / 编辑 / 移出」：点行内「编辑」打开档案编辑模态——姓名 / 学号 / 党小组立即生效，发展阶段 / 在册状态变更报支书确认后生效。</p>
        <div class="flex items-center gap-x-4 gap-y-1 flex-wrap text-xs">
          <span class="px-2 py-1 rounded-full bg-gray-50 border border-gray-100"><span class="font-medium text-gray-700">支部应到 ${stats.expected} 人</span><span class="text-gray-500">＝在册党员 ${stats.partyTotal} − 滞留剔除 ${stats.detainedParty}</span></span>
          ${groupStats.map(x => `<span class="text-gray-500">${esc(x.g)}应到 <span class="text-gray-700 font-medium">${x.s.expected}</span><span class="text-gray-500">/${x.s.partyTotal}</span></span>`).join('')}
          <span class="text-gray-500">未分组 <span class="text-gray-700 font-medium">${ungroupedCount}</span> 人</span>
          <!-- 就近深链（2026-09-17 支书已裁）：滞留的学期末集中复核窗口就是本域可调参数，就地给去设置该分区的入口 -->
          <a href="${getBasePath()}settings.html#domain-org" class="text-gray-500 hover:text-gray-700 underline transition-colors">滞留集中复核窗口 → 组织职责参数（设置）</a>
        </div>
        ${pendParts.length ? `
        <div class="flex items-center gap-1.5 flex-wrap mt-2">
          <span class="text-[11px] text-gray-500">待支书确认：</span>
          ${pendParts.map(t => `<span class="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">${t}</span>`).join('')}
          <span class="text-[11px] text-gray-500">确认或退回在支书「待办」页处理</span>
        </div>` : ''}
      </div>

      <div class="card rounded-xl p-4 overflow-x-auto" id="roster-list-card">
        ${_listHeaderHtml()}
        <div id="roster-list-host"></div>
      </div>
      <p class="text-[11px] text-gray-500 px-1">移出即登记流出：名册移出、账号停用，原考勤与考察历史保留；可随时在「成员流动」台账撤销纠正。</p>

      ${_flowCardHtml(canRegister)}
    </div>
  `;

  container.querySelector('#roster-add-btn')?.addEventListener('click', _openAddForm);
  // 统一检索引擎：关键词（姓名/学号）+ 分面（党小组/发展阶段/角色/在册）
  const host = container.querySelector('#roster-list-host');
  renderFilteredList(host, {
    stateKey: 'org-roster-table',
    rows: members,
    keyword: personKeyword(),
    facets: personFacets({ roleLabel: roleLabelOf }),
    countUnit: '人',
    listClass: 'space-y-1',
    emptyMessage: members.length ? '无匹配成员' : '名册暂无成员，点右上角「新增成员」录入',
    rowHtml: (p) => _rowHtml(p, _pendingMap()),
  });
  _bindList(host);

  // ── 成员流动面板：登记按钮 + 台账（引擎渲染）+ 撤销（对账行/台账内容由 _renderFlowBody 局部渲染）──
  container.querySelector('#flow-intake-btn')?.addEventListener('click', _openIntakeModal);
  container.querySelector('#flow-outflow-btn')?.addEventListener('click', _openOutflowModal);
  // 撤销：事件委托（台账随引擎筛选/翻页重绘，委托挂在卡片容器上仍有效）
  container.querySelector('#flow-card')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.flow-revoke');
    if (btn) _askRevoke(btn.dataset.flowId);
  });
  _renderFlowBody(); // 先渲染引擎（其分面 select 随后统一走 enhanceSelects 圆角增强）
  enhanceSelects(container);
}

/** 名单列头（行内容由统一检索引擎渲染；窄屏 <768px 列头隐藏、行内 6 列 grid 退化为单列卡片） */
function _listHeaderHtml() {
  const COL = 'minmax(120px,1.6fr) 132px 132px 96px minmax(140px,2fr) 168px';
  return `
    <div class="hidden md:grid text-[11px] text-gray-500 pb-2 border-b border-gray-100" style="grid-template-columns:${COL};gap:8px;align-items:center;">
      <span>姓名</span><span>党小组</span><span>发展阶段</span><span>在册状态</span><span>滞留备注</span><span class="text-right">操作</span>
    </div>`;
}

/** 「待确认」小标（阶段/在册 pending 时显示；行内对应格下方） */
function _pendingPill(text, title) {
  return `<span class="inline-flex text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 whitespace-nowrap" title="${esc(title)}">${text}</span>`;
}

/** 名单行（只读展示；编辑统一走成员档案模态，pending 显示「待确认」小标） */
function _rowHtml(p, pend) {
  const rs = getResidenceOf(p);
  const detained = rs.residenceStatus === RESIDENCE.DETAINED;
  const roleLabel = p.role && p.role !== 'participant' ? (ROLE_LABELS[p.role] || p.role) : '';
  const stagePend = pend.stage.has(p.id);
  const resPend = pend.res.has(p.id);
  const outPend = pend.out.has(p.id);
  return `
    <div class="roster-row grid grid-cols-1 gap-1.5 py-2 border-b border-gray-50 last:border-b-0 md:gap-2 md:items-center md:[grid-template-columns:minmax(120px,1.6fr)_132px_132px_96px_minmax(140px,2fr)_168px]" data-person-id="${esc(p.id)}">
      <div class="min-w-0">
        <div class="text-sm font-medium text-gray-800 flex items-center gap-1.5 min-w-0">
          <span class="truncate">${esc(getPersonName(p.id))}</span>
          ${detained ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 flex-shrink-0" title="${esc(rs.residenceNote || '滞留：组织关系保留、应到剔除、通知照发')}">滞留</span>` : ''}
        </div>
        ${roleLabel ? `<div class="text-[10px] text-gray-500 truncate">${esc(roleLabel)}</div>` : ''}
      </div>
      <div class="text-xs text-gray-800 truncate">${p.partyGroup ? esc(p.partyGroup) : '<span class="text-gray-400">未分组</span>'}</div>
      <div class="flex flex-col gap-0.5 min-w-0">
        <span class="text-xs text-gray-800 truncate">${esc(p.developStage || '待定')}</span>
        ${stagePend ? _pendingPill('阶段变更·待确认', '已报送支书确认，生效前保持现值；在支书「待办」页确认或退回') : ''}
      </div>
      <div class="flex flex-col gap-0.5 min-w-0">
        <span class="text-xs truncate ${detained ? 'text-amber-700' : 'text-gray-800'}">${esc(rs.residenceStatus)}</span>
        ${resPend ? _pendingPill('在册状态·待确认', '已报送支书确认，生效前保持现值；在支书「待办」页确认或退回') : ''}
      </div>
      <div class="text-xs text-gray-600 truncate" title="${esc(rs.residenceNote || '')}">${esc(rs.residenceNote || '—')}</div>
      <div class="flex items-center justify-end gap-1.5">
        <button type="button" class="roster-edit text-xs px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors whitespace-nowrap" data-person-id="${esc(p.id)}" style="cursor:pointer;">编辑</button>
        <a href="${getBasePath()}person.html?id=${encodeURIComponent(p.id)}" class="text-xs px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors whitespace-nowrap" style="text-decoration:none;">档案</a>
        <button type="button" class="roster-del text-xs px-2.5 py-1 rounded-lg ${outPend ? 'bg-gray-50 text-gray-500 border border-gray-100' : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'} transition-colors whitespace-nowrap" data-person-id="${esc(p.id)}" title="${outPend ? '已报送支书确认移出，处理完成前不可重复发起' : ''}" ${outPend ? 'disabled' : ''} style="cursor:${outPend ? 'not-allowed' : 'pointer'};">${outPend ? '移出待确认' : '移出'}</button>
      </div>
    </div>`;
}

/** 发展阶段选项按党建习惯排序（正式→预备→发展对象→积极分子；值集仍=种子派生） */
function _orderedStages() {
  return [...DEVELOP_STAGE_OPTIONS].sort((a, b) => {
    const ia = STAGE_ORDER.indexOf(a);
    const ib = STAGE_ORDER.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
}

/** 绑定名单卡交互（事件委托，随引擎筛选重渲染仍有效）：行内「编辑」→ 档案模态 / 「移出」→ 二次确认 */
function _bindList(root) {
  root.addEventListener('click', (e) => {
    const edit = e.target.closest('.roster-edit');
    if (edit) { _openEdit(edit.dataset.personId); return; }
    const del = e.target.closest('.roster-del');
    if (del) _askRemove(del.dataset.personId);
  });
}

/**
 * 行内「编辑」→ 统一成员档案编辑模态（防张冠李戴：模态按 personId 现取档案真相）。
 * 模态内按字段分流：姓名 / 学号 / 党小组立即生效；发展阶段 / 在册状态 / 在册备注报支书确认。
 * onSaved 重新渲染本表（回现值 + 刷新「待确认」小标）。
 */
function _openEdit(personId) {
  openPersonEditModal({
    personId,
    focusFields: ['name', 'studentId', 'partyGroup', 'developStage', 'residenceStatus', 'residenceNote'],
    sourceLabel: '成员名册',
    onSaved: () => renderContent(_ctx),
  });
}

// ════════════════════════════════════════════════════════════════
//  新增成员（openFormModal；姓名必填，党小组/阶段/在册状态选单枚举与数据一致）
// ════════════════════════════════════════════════════════════════

function _openAddForm() {
  const emptyOpt = { value: '', label: '—' };
  openFormModal({
    id: 'roster-add-member',
    title: '新增成员',
    accentColor: _ctx?.accent || '#3B82F6',
    fields: [
      { key: 'name', label: '姓名', type: 'text', required: true, placeholder: '成员姓名（必填）' },
      { key: 'studentId', label: '学号', type: 'text', placeholder: '学号（推荐填写；全站唯一，不可与既有成员重复）' },
      { key: 'enrollYear', label: '届别', type: 'text', placeholder: '入学年份 / 届别（如 2026，推荐填写）' },
      { key: 'partyGroup', label: '党小组', type: 'select',
        options: [emptyOpt, ...groupOptions().map(g => ({ value: g, label: g }))] },
      { key: 'developStage', label: '发展阶段', type: 'select',
        options: [emptyOpt, ..._orderedStages().map(s => ({ value: s, label: s }))] },
      { key: 'residenceStatus', label: '在册状态', type: 'select',
        options: [{ value: RESIDENCE.CAMPUS, label: '在校' }, { value: RESIDENCE.DETAINED, label: '滞留' }] },
      { key: 'residenceNote', label: '滞留备注', type: 'textarea', placeholder: '仅「滞留」时填写：原因 / 起止（如 2026-09 起赴外校交换一学期）' },
    ],
    submitLabel: '新增并加入名册',
    onSubmit: (values) => {
      // 学号唯一性：传入既有成员学号清单（非空学号与既有重复 → 拒绝）
      const existingStudentIds = _branchMembers().map(p => p.studentId).filter(Boolean);
      const v = validateMemberForm(values, { existingStudentIds });
      if (!v.ok) { showToast('error', v.message); return false; } // 校验失败：浮窗保持打开
      _addMember(v.value);
      return true;
    },
  });
}

async function _addMember(val) {
  const actorId = _actorId();
  const payload = {
    name: val.name,
    studentId: val.studentId,
    enrollYear: val.enrollYear,
    partyGroup: val.partyGroup,
    developStage: val.developStage,
    residenceStatus: val.residenceStatus,
    residenceNote: val.residenceNote,
  };
  // 新成员直接录入「滞留」→ 档案自带首条留痕（from 在校 → to 滞留），支书复核卡可查
  if (payload.residenceStatus === RESIDENCE.DETAINED) {
    const entry = { from: RESIDENCE.CAMPUS, to: RESIDENCE.DETAINED, updatedBy: actorId, updatedAt: new Date().toISOString() };
    if (payload.residenceNote) entry.note = payload.residenceNote;
    payload.residenceHistory = [entry];
  }
  const r = await PersonStore.saveMember(payload, { by: actorId });
  if (r.ok) {
    showToast('success', `已新增成员「${(r.member && r.member.name) || val.name}」，名册与应到名单即时生效`);
    renderContent(_ctx);
  } else {
    showToast('error', r.reason || '新增失败，请重试');
  }
}

// ════════════════════════════════════════════════════════════════
//  移出名册（二次确认 → registerOutflow：登记即生效，软标记保留历史 + 账号停用 + 记台账）
// ════════════════════════════════════════════════════════════════

function _askRemove(personId) {
  const member = PersonStore.getMembers().find(m => m.id === personId);
  const name = (member && member.name) || personId;
  openModal({
    id: 'roster-del-confirm',
    title: '登记流出（移出名册）',
    accentColor: '#EF4444',
    bodyHtml: `
      <p class="text-sm text-gray-700 mb-2">确认将「${esc(name)}」移出成员名册？</p>
      <p class="text-xs text-gray-500 mb-4">登记即生效：该成员移出名册、账号停用，不再出现在成员名单与应到统计中。原考勤与考察历史保留（不删不匿名），可在「成员流动」台账中查看并撤销纠正。</p>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button type="button" data-roster-del-cancel class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors" style="cursor:pointer;">取消</button>
        <button type="button" data-roster-del-ok class="text-xs px-3 py-1.5 rounded-lg text-white hover:opacity-90 transition-opacity" style="background:#EF4444;cursor:pointer;">确认登记流出</button>
      </div>`,
    onMount: (panel) => {
      panel.querySelector('[data-roster-del-cancel]')?.addEventListener('click', () => closeModal('roster-del-confirm'));
      panel.querySelector('[data-roster-del-ok]')?.addEventListener('click', () => {
        closeModal('roster-del-confirm');
        _doRemove(personId, name);
      });
    },
  });
}

async function _doRemove(personId, name) {
  const r = await registerOutflow({
    personIds: [personId],
    by: _actorId(),
    role: _actorRole(),
    branchId: _branchId(),
  });
  if (r.movedCount > 0) {
    showToast('success', `已登记流出「${name}」并记入台账（原考勤与考察历史保留，账号停用）`);
    renderContent(_ctx);
  } else {
    const reason = (r.skipped && r.skipped[0] && r.skipped[0].reason) || r.reason || '移出失败，请重试';
    showToast('error', reason);
  }
}

// ════════════════════════════════════════════════════════════════
//  成员流动面板（流入/流出登记 + 对账 + 台账；2026-09-14 批次 25）
// ════════════════════════════════════════════════════════════════
//  口径：登记即生效；台账只增不删，登错由「撤销」留痕（revokedAt/revokedBy）+ 回滚在册状态。
//  筛选/分页统一走检索引擎（关键词：姓名/学号/经手人；方向分面：流入/流出；筛选行禁 chip）；
//  选人硬规范：登记流出/撤销一律用 PersonPicker（禁 select 罗列人名）。
// ════════════════════════════════════════════════════════════════

/** 「成员流动」卡片骨架（对账行 + 台账表由 _renderFlowBody 局部填充；台账筛选/翻页由统一检索引擎提供） */
function _flowCardHtml(canRegister) {
  return `
    <div class="card rounded-xl p-4" id="flow-card">
      <div class="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div class="flex items-center gap-3">
          <h3 class="font-title-cn text-base font-semibold text-gray-800">成员流动</h3>
          <span class="text-xs text-gray-500">流入 / 流出登记与对账台账</span>
        </div>
        ${canRegister ? `
        <div class="flex items-center gap-2">
          <button id="flow-intake-btn" type="button" class="text-xs px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors whitespace-nowrap" style="cursor:pointer;">＋ 登记流入</button>
          <button id="flow-outflow-btn" type="button" class="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors whitespace-nowrap" style="cursor:pointer;">登记流出</button>
        </div>` : `
        <span class="text-[11px] text-gray-500">流入 / 流出登记仅限组织委员与支书/副支书；此处只读查看台账</span>`}
      </div>
      <div id="flow-reconcile-host" class="mb-3"></div>
      <div class="overflow-x-auto" id="flow-table-host"></div>
    </div>`;
}

/** 台账数据（同支部；筛选/分页由统一检索引擎处理，新→旧由数据层排序保证） */
function _flowRows() {
  return loadMemberFlows({ branchId: _branchId() });
}

/** 局部渲染：对账行 + 台账表（台账表交统一检索引擎：姓名/学号/经手人关键词 + 方向分面 + 分页） */
function _renderFlowBody() {
  const recHost = document.getElementById('flow-reconcile-host');
  const tableHost = document.getElementById('flow-table-host');
  if (!recHost || !tableHost) return;
  const r = reconcile({ branchId: _branchId() });
  recHost.innerHTML = `
    <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      <span class="text-gray-500">期初在册 <span class="text-gray-700 font-medium">${r.openingCount}</span></span>
      <span class="text-gray-300">·</span>
      <span class="text-gray-500">流入 <span class="text-sky-700 font-medium">${r.inCount}</span></span>
      <span class="text-gray-300">·</span>
      <span class="text-gray-500">流出 <span class="text-red-700 font-medium">${r.outCount}</span></span>
      <span class="text-gray-300">·</span>
      <span class="text-gray-500">当前在册 <span class="text-gray-700 font-medium">${r.currentCount}</span></span>
      ${r.balanced ? '' : '<span class="text-gray-500">台账流水与在册人数暂不一致，请核对下方记录与撤销留痕</span>'}
    </div>`;
  const flows = _flowRows();
  renderFilteredList(tableHost, {
    stateKey: 'org-member-flow-table',
    rows: flows,
    keyword: {
      keys: ['name', 'studentId', 'by'],
      placeholder: '搜索姓名 / 学号 / 经手人…',
      get: (f, k) => (k === 'by' ? (getPersonName(f.by) || f.by) : f[k]),
    },
    facets: [{ key: 'direction', label: '方向', options: [{ value: 'in', label: '流入' }, { value: 'out', label: '流出' }] }],
    countUnit: '条',
    table: {
      headHtml: '<tr><th>类型</th><th>姓名</th><th>学号</th><th>届别</th><th>日期</th><th>经手人</th><th>备注</th><th>操作</th></tr>',
      colSpan: 8,
    },
    emptyMessage: flows.length ? '无匹配台账记录' : '台账暂无记录，点上方「登记流入 / 登记流出」录入',
    rowHtml: (f) => _flowRowHtml(f),
  });
}

/** 台账单行（已撤销行中性灰显示「已撤销」并保留在表中留痕） */
function _flowRowHtml(f) {
  const revoked = !!f.revokedAt;
  const inDir = f.direction === 'in';
  const tdc = revoked ? 'text-gray-400' : 'text-gray-700';
  const operator = f.by ? (getPersonName(f.by) || f.by) : '—';
  return `
    <tr>
      <td class="${revoked ? 'text-gray-400' : (inDir ? 'text-sky-700' : 'text-red-700')}">${inDir ? '流入' : '流出'}</td>
      <td class="${tdc}">${esc(f.name || '—')}</td>
      <td class="${tdc}">${esc(f.studentId || '—')}</td>
      <td class="${tdc}">${esc(f.enrollYear || '—')}</td>
      <td class="${tdc}">${esc(f.date || '—')}</td>
      <td class="${tdc}">${esc(operator)}</td>
      <td class="${tdc}" title="${esc(f.note || '')}">${esc(f.note || '—')}</td>
      <td>${revoked
        ? `<span class="text-gray-400" title="已于 ${esc(String(f.revokedAt).slice(0, 10))} 撤销">已撤销</span>`
        : `<button type="button" class="flow-revoke text-xs px-2.5 py-1 rounded-lg bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors whitespace-nowrap" data-flow-id="${esc(f.id)}" style="cursor:pointer;">撤销</button>`}</td>
    </tr>`;
}

/** 未登记人员清单（skipped 逐条提示原因） */
function _skippedHtml(skipped) {
  if (!skipped || !skipped.length) return '';
  return `<ul style="margin:2px 0 0;padding-left:18px;">${skipped
    .map(s => `<li>${esc(getPersonName(s.personId) || s.personId)}：${esc(s.reason || '未登记')}</li>`)
    .join('')}</ul>`;
}

// ── 登记流入（单人 / 粘贴多行 二选一）──────────────────────────

function _openIntakeModal() {
  const accent = _ctx?.accent || '#3B82F6';
  const groupOpts = ['<option value="">未分组</option>', ...groupOptions().map(g => `<option value="${esc(g)}">${esc(g)}</option>`)].join('');
  const inputStyle = '--acc-text-dark:#CBD5E1;color:#374151;';
  const labelStyle = 'display:block;font-weight:500;color:#374151;margin-bottom:4px;';
  const MODE_ON = 'text-xs px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200';
  const MODE_OFF = 'text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50';
  openModal({
    id: 'flow-intake',
    title: '登记流入',
    accentColor: accent,
    // 浮窗页脚「设置」入口（2026-09-21 批次 138）：本浮窗管的是成员在册 / 流动，与设置里组织委员
    // 那一域的职责参数（学期末滞留集中复核窗口）同域，就地给一条去该分区的入口（modal.js 单一源）。
    settingsLink: { href: `${getBasePath()}settings.html#domain-org`, text: '组织职责参数（学期末滞留集中复核窗口）→ 设置' },
    bodyHtml: `
      <div class="flex items-center gap-2 mb-4">
        <button type="button" data-intake-mode="single" class="${MODE_ON}" style="cursor:pointer;">单人登记</button>
        <button type="button" data-intake-mode="batch" class="${MODE_OFF}" style="cursor:pointer;">粘贴多行</button>
      </div>
      <div data-intake-pane="single">
        <div style="margin-bottom:14px;">
          <label class="text-body-sm" style="${labelStyle}">姓名 <span style="color:#EF4444;">*</span></label>
          <input data-intake="name" type="text" class="input-flat-sm w-full" placeholder="成员姓名（必填）" style="${inputStyle}">
        </div>
        <div style="margin-bottom:14px;">
          <label class="text-body-sm" style="${labelStyle}">学号 <span style="color:#EF4444;">*</span></label>
          <input data-intake="studentId" type="text" class="input-flat-sm w-full" placeholder="学号（账号由此派生，必填）" style="${inputStyle}">
        </div>
        <div style="margin-bottom:14px;">
          <label class="text-body-sm" style="${labelStyle}">届别</label>
          <input data-intake="enrollYear" type="text" class="input-flat-sm w-full" placeholder="入学年份 / 届别（如 2026）" style="${inputStyle}">
        </div>
        <div style="margin-bottom:14px;">
          <label class="text-body-sm" style="${labelStyle}">党小组</label>
          <select data-intake="partyGroup" class="input-flat w-full">${groupOpts}</select>
        </div>
      </div>
      <div data-intake-pane="batch" class="hidden">
        <label class="text-body-sm" style="${labelStyle}">粘贴多行</label>
        <textarea data-intake="text" rows="6" class="input-flat w-full" placeholder="一行一人：姓名、学号、届别、党小组（Tab 或逗号分隔）" style="${inputStyle}resize:vertical;"></textarea>
      </div>
      <div data-intake-errors class="hidden mt-3 text-xs text-red-700"></div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;">
        <button type="button" data-intake-cancel class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors" style="cursor:pointer;">取消</button>
        <button type="button" data-intake-submit class="text-sm px-4 py-[7px] rounded-lg text-white transition-colors hover:opacity-90 font-medium" style="background:${accent};cursor:pointer;">登记</button>
      </div>`,
    onMount: (panel) => {
      const errEl = panel.querySelector('[data-intake-errors]');
      const showErrors = (html) => { errEl.innerHTML = html; errEl.classList.toggle('hidden', !html); };
      // 分段切换：单人 / 粘贴多行
      let mode = 'single';
      const setMode = (m) => {
        mode = m;
        panel.querySelectorAll('[data-intake-mode]').forEach((b) => {
          b.className = b.dataset.intakeMode === m ? MODE_ON : MODE_OFF;
        });
        panel.querySelector('[data-intake-pane="single"]').classList.toggle('hidden', m !== 'single');
        panel.querySelector('[data-intake-pane="batch"]').classList.toggle('hidden', m !== 'batch');
      };
      panel.querySelectorAll('[data-intake-mode]').forEach((b) => {
        b.addEventListener('click', () => setMode(b.dataset.intakeMode));
      });
      panel.querySelector('[data-intake-cancel]')?.addEventListener('click', () => closeModal('flow-intake'));
      panel.querySelector('[data-intake-submit]')?.addEventListener('click', async () => {
        const by = _actorId();
        const role = _actorRole();
        const branchId = _branchId();
        if (mode === 'single') {
          const val = (k) => panel.querySelector(`[data-intake="${k}"]`).value;
          const r = await registerIntake({
            name: val('name'), studentId: val('studentId'),
            enrollYear: val('enrollYear'), partyGroup: val('partyGroup'),
            by, role, branchId,
          });
          if (r.ok) {
            showToast('success', `已登记流入「${(r.person && r.person.name) || val('name')}」，自动建号并记入台账`);
            closeModal('flow-intake');
            renderContent(_ctx); // 名册 + 组统计 + 未分组 + 台账 + 对账行联动刷新
          } else {
            showErrors(`<p>${esc(r.reason || '登记失败，请检查后重试')}</p>`);
          }
          return;
        }
        const r = await registerIntakeBatch({ text: panel.querySelector('[data-intake="text"]').value, by, role, branchId });
        if (!r.created.length) {
          showErrors(`<p>${esc(r.reason || '未登记任何成员，请检查填写格式')}</p>`);
          return;
        }
        if (r.errors.length) {
          // 有错误行：弹窗内回显行号与原因，成功行照常入库（浮窗保持打开）
          showErrors(`<p class="mb-1">以下行未登记：</p><ul style="margin:0;padding-left:18px;">${r.errors
            .map(e => `<li>第 ${e.line} 行：${esc(e.reason)}</li>`)
            .join('')}</ul>`);
          showToast('info', `已登记流入 ${r.created.length} 人；${r.errors.length} 行未登记，详见弹窗提示`);
          renderContent(_ctx);
        } else {
          showToast('success', `已登记流入 ${r.created.length} 人，并记入台账`);
          closeModal('flow-intake');
          renderContent(_ctx);
        }
      });
      enhanceSelects(panel);
    },
  });
}

// ── 登记流出（PersonPicker 多选 + 流出日期 + 备注）──────────────

function _closeOutflow() {
  if (_outflowPicker) { _outflowPicker.destroy(); _outflowPicker = null; }
  closeModal('flow-outflow');
}

function _openOutflowModal() {
  _outflowPicker?.destroy();
  _outflowPicker = null;
  const accent = _ctx?.accent || '#3B82F6';
  const branchId = _branchId();
  const today = new Date().toISOString().slice(0, 10);
  const inputStyle = '--acc-text-dark:#CBD5E1;color:#374151;';
  const labelStyle = 'display:block;font-weight:500;color:#374151;margin-bottom:4px;';
  openModal({
    id: 'flow-outflow',
    title: '登记流出',
    accentColor: accent,
    bodyHtml: `
      <p class="text-xs text-gray-500 mb-2">选择流出人员（可多选）。登记即生效：名册移出、账号停用，原考勤与考察历史保留。</p>
      <div id="flow-outflow-picker" class="mb-3"></div>
      <div style="margin-bottom:14px;">
        <label class="text-body-sm" style="${labelStyle}">流出日期</label>
        <input data-outflow="date" type="date" class="input-flat w-full" value="${today}" style="${inputStyle}">
      </div>
      <div style="margin-bottom:14px;">
        <label class="text-body-sm" style="${labelStyle}">备注</label>
        <input data-outflow="note" type="text" class="input-flat-sm w-full" placeholder="去向 / 原因（如 毕业转出）" style="${inputStyle}">
      </div>
      <div data-outflow-errors class="hidden mt-3 text-xs text-red-700"></div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px;">
        <button type="button" data-outflow-cancel class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors" style="cursor:pointer;">取消</button>
        <button type="button" data-outflow-submit class="text-sm px-4 py-[7px] rounded-lg text-white transition-colors hover:opacity-90 font-medium" style="background:${accent};cursor:pointer;">登记流出</button>
      </div>`,
    onMount: (panel) => {
      const errEl = panel.querySelector('[data-outflow-errors]');
      const showErr = (html) => { errEl.innerHTML = html; errEl.classList.toggle('hidden', !html); };
      // 选人硬规范：PersonPicker 多选（禁 select 罗列人名）；候选 = 本支部在册成员
      _outflowPicker = new PersonPicker({
        mode: 'multi',
        placeholder: '选择流出人员（可多选）',
        accentColor: accent,
        filter: (p) => (p.branchId || 'br-b1') === branchId,
        onSelect: () => {},
      });
      _outflowPicker.render(panel.querySelector('#flow-outflow-picker'));
      panel.querySelector('[data-outflow-cancel]')?.addEventListener('click', _closeOutflow);
      panel.querySelector('[data-outflow-submit]')?.addEventListener('click', async () => {
        const ids = _outflowPicker ? _outflowPicker.getSelected() : [];
        if (!ids.length) { showErr('<p>请至少选择一名流出人员</p>'); return; }
        const date = panel.querySelector('[data-outflow="date"]').value;
        const note = panel.querySelector('[data-outflow="note"]').value;
        const r = await registerOutflow({ personIds: ids, date, note, by: _actorId(), role: _actorRole(), branchId });
        if (!r.movedCount) {
          showErr(`<p>${esc(r.reason || '未登记任何流出，请检查所选人员')}</p>${_skippedHtml(r.skipped)}`);
          return;
        }
        if (r.skipped && r.skipped.length) {
          showErr(`<p class="mb-1">以下人员未登记：</p>${_skippedHtml(r.skipped)}`);
          showToast('info', `已登记流出 ${r.movedCount} 人；${r.skipped.length} 人未登记，详见弹窗提示`);
          renderContent(_ctx);
        } else {
          showToast('success', `已登记流出 ${r.movedCount} 人（原考勤与考察历史保留，账号停用）`);
          _closeOutflow();
          renderContent(_ctx);
        }
      });
    },
  });
}

// ── 撤销台账一笔（二次确认 → revokeFlow 留痕 + 回滚在册状态）────

function _askRevoke(flowId) {
  const flow = loadMemberFlows({ branchId: _branchId() }).find(f => f.id === flowId);
  if (!flow) { showToast('error', '台账记录不存在'); return; }
  const inDir = flow.direction === 'in';
  const who = flow.name || flow.personId;
  openModal({
    id: 'flow-revoke-confirm',
    title: '撤销台账记录',
    accentColor: '#EF4444',
    bodyHtml: `
      <p class="text-sm text-gray-700 mb-2">确认撤销「${esc(who)}」的这条${inDir ? '流入' : '流出'}记录？</p>
      <p class="text-xs text-gray-500 mb-4">撤销保留台账留痕（该行标注「已撤销」），并回滚成员在册状态与账号：${inDir
        ? '撤销流入 → 该成员移出名册、账号停用'
        : '撤销流出 → 该成员恢复在册、账号恢复'}。</p>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button type="button" data-flow-revoke-cancel class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors" style="cursor:pointer;">取消</button>
        <button type="button" data-flow-revoke-ok class="text-xs px-3 py-1.5 rounded-lg text-white hover:opacity-90 transition-opacity" style="background:#EF4444;cursor:pointer;">确认撤销</button>
      </div>`,
    onMount: (panel) => {
      panel.querySelector('[data-flow-revoke-cancel]')?.addEventListener('click', () => closeModal('flow-revoke-confirm'));
      panel.querySelector('[data-flow-revoke-ok]')?.addEventListener('click', async () => {
        closeModal('flow-revoke-confirm');
        const r = await revokeFlow({ flowId, by: _actorId(), role: _actorRole() });
        if (r.ok) {
          showToast('success', '已撤销该台账记录，成员在册状态与账号已回滚');
          renderContent(_ctx);
        } else {
          showToast('error', r.reason || '撤销失败，请重试');
        }
      });
    },
  });
}
