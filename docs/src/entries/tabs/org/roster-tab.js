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
//   · 「移出」= submitTransferOut：无历史直接移出；仅安全引用（未开始分工/未生效报名/未读广播）
//     自动解除后移出；有历史 → 报支书确认（转「已转出」标注 + 移出），行显示「移出待确认」。
//
//  2026-09-13（支书 grill-me 面谈定案「模态内分流」）：
//   行内不再就地编辑；行内「编辑」统一打开成员档案编辑模态 components/person-edit-modal.js——
//   模态内按写路径分组：姓名/学号/党小组（档案属性）直改即时生效；发展阶段/在册状态/在册备注
//   （制度变更）报支书确认后生效，逐行小标区分「立即生效」/「报支书确认」。本 Tab 仅保留入口
//   与「待确认」可见性（listPendingConfirmations）。
//
//  本 Tab 职责边界（与「人才库」talent-tab 分工，避免重复建设）：
//   · 人才库 = 成员浏览 + 考察记录画像 + 成员状态详情维护（保持现状，不动）；
//   · 成员名册 = 名单管理主位：新增成员、经模态编辑档案、移出（成员变更确认复核链路）。
//     两处编辑同一数据链（PersonStore + roster 覆盖层），
//     任一改动即被应到口径（纪检考勤/支书复核卡）与对方界面读到。
//  数据/枚举单一源：PersonStore.getMembers（含 members 持久覆盖层 + 预览叠加）；
//    党小组/发展阶段枚举 = org-base-data-preview 的 PARTY_GROUP_OPTIONS / DEVELOP_STAGE_OPTIONS
//    （由静态种子派生，禁造新枚举）；在册状态 = roster.RESIDENCE。
//  在册滞留写链（与纪检/支书复核同源，防覆盖层与档案互相遮蔽）：
//    支书确认生效时先 roster.saveResidenceChange（RESIDENCE_KEY 覆盖 + 留痕）→ 再 saveMember 镜像进档案。
// ════════════════════════════════════════════════════════════════

import { PersonStore, getPersonName } from '../../../services/person.js?v=20260913f';
import { getRosterStats, getResidenceOf, RESIDENCE } from '../../../services/roster.js?v=20260913f';
import { submitTransferOut, listPendingConfirmations } from '../../../services/member-confirmation.js?v=20260913f';
import { PARTY_GROUP_OPTIONS, DEVELOP_STAGE_OPTIONS } from '../../../services/org-base-data-preview.js?v=20260913f';
import { AuthStore } from '../../../services/auth.js?v=20260913f';
import { ROLE_LABELS } from '../../../core/constants.js?v=20260913f';
import { showToast, escHtml as esc, getBasePath } from '../../../core/utils.js?v=20260913f';
import { openModal, closeModal, openFormModal } from '../../../components/modal.js?v=20260913f';
// 统一成员档案编辑模态（成员名册行内「编辑」入口；模态内按字段分流：档案属性立即生效 / 制度变更报支书确认）
import { openPersonEditModal } from '../../../components/person-edit-modal.js?v=20260913f';
// 纯逻辑（可单测）：新增表单校验
import { validateMemberForm } from '../../../services/roster-ui-logic.js?v=20260913f';
// 统一检索引擎（2026-09-13 表格统一化批次 A）：名册列表接入关键词 + 分面（≤8 行引擎自动不渲染检索条）
import { renderFilteredList, personKeyword, personFacets, roleLabelOf } from '../../../components/list-filter.js?v=20260913f';

// 模块级 ctx 缓存：行内保存/删除/新增后整页刷新复用首次渲染的 accent
let _ctx = null;

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

/** 待支书确认索引（一致性刷新：渲染/移出共用同一来源 listPendingConfirmations） */
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
  const groupStats = PARTY_GROUP_OPTIONS.map(g => ({ g, s: getRosterStats({ type: '党小组会', groupId: g }) }));
  const pend = _pendingMap();
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
      <p class="text-[11px] text-gray-500 px-1">移出：未开始的分工/报名/通知自动解除；已开始或历史经支书确认后转「已转出」保留。</p>
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
      <div class="text-xs text-gray-800 truncate">${esc(p.partyGroup || '—')}</div>
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
      { key: 'partyGroup', label: '党小组', type: 'select',
        options: [emptyOpt, ...PARTY_GROUP_OPTIONS.map(g => ({ value: g, label: g }))] },
      { key: 'developStage', label: '发展阶段', type: 'select',
        options: [emptyOpt, ..._orderedStages().map(s => ({ value: s, label: s }))] },
      { key: 'residenceStatus', label: '在册状态', type: 'select',
        options: [{ value: RESIDENCE.CAMPUS, label: '在校' }, { value: RESIDENCE.DETAINED, label: '滞留' }] },
      { key: 'residenceNote', label: '滞留备注', type: 'textarea', placeholder: '仅「滞留」时填写：原因 / 起止（如 2026-09 起赴外校交换一学期）' },
    ],
    submitLabel: '新增并加入名册',
    onSubmit: (values) => {
      const v = validateMemberForm(values);
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
//  移出名册（二次确认 → submitTransferOut 引用清单化：安全引用自动解除 / 历史报支书确认）
// ════════════════════════════════════════════════════════════════

function _askRemove(personId) {
  const member = PersonStore.getMembers().find(m => m.id === personId);
  const name = (member && member.name) || personId;
  openModal({
    id: 'roster-del-confirm',
    title: '移出名册',
    accentColor: '#EF4444',
    bodyHtml: `
      <p class="text-sm text-gray-700 mb-2">确认将「${esc(name)}」移出成员名册？</p>
      <p class="text-xs text-gray-500 mb-4">系统将先检查引用：未开始的活动分工 / 未生效的报名 / 未读的广播接收将自动解除后移出；考勤、考察等已开始或历史记录将报送支书确认（转「已转出」标注，原记录保留、不删不匿名）。移出后该成员不再出现在成员名单 / 应到统计中。</p>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button type="button" data-roster-del-cancel class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors" style="cursor:pointer;">取消</button>
        <button type="button" data-roster-del-ok class="text-xs px-3 py-1.5 rounded-lg text-white hover:opacity-90 transition-opacity" style="background:#EF4444;cursor:pointer;">确认移出</button>
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
  const actorId = _actorId();
  const r = await submitTransferOut({ personId, by: actorId, note: '' });
  if (r.ok) {
    if (r.direct) {
      showToast('success', r.clearedSafe > 0
        ? `已将「${name}」移出名册（自动解除安全引用 ${r.clearedSafe} 项）`
        : `已将「${name}」移出名册（名单与应到统计即时更新）`);
    } else {
      showToast('info', `「${name}」存在历史记录，已报送支书确认（确认后转「已转出」并移出）`);
    }
    renderContent(_ctx);
  } else {
    showToast('error', r.reason || '移出失败，请重试');
  }
}
