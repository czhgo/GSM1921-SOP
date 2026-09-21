// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  components/person-edit-modal.js — 统一成员档案编辑模态
// ════════════════════════════════════════════════════════════════
//  立项依据（支书 2026-09-13 裁定）：
//   「第一列是人」的表格很多，每张表只显示每个人的**字段子集**；可操作一律走本模态——
//     上区 = 该人**完整档案**（只读，逐字段标注归属）；下区 = 本处可改字段；
//     `focusFields` 命中的行用主题色浅底高亮（让操作者看清「本表负责哪些字段」）。
//
//  防张冠李戴（关键）：每次打开都按 opts.personId 现取 `PersonStore.getById(personId)`——
//     **绝不**采信调用方传入的成员对象 / 行数据，模态永远显示档案真相。
//
//  基座复用：遮罩 / Esc / 点击遮罩关闭 / 关闭按钮 一律复用 components/modal.js 的 openModal
//    （不另造模态体系）；基座未提供的「焦点管理」由本模块在基座之上补齐：
//      · 打开时聚焦第一个可编辑输入
//      · 关闭时把焦点归还触发元素（经 MutationObserver 观测遮罩移除，覆盖 Esc/遮罩/按钮三条关闭路径）
//
//  ════════════════════════════════════════════════════════════════
//  模态内「按字段分流」（支书 2026-09-13 grill-me 面谈定案）：
//    同一模态里两类字段各走各的写路径，界面显式分组 + 逐行小标区分——
//      · 立即生效组（档案资料）name / studentId / partyGroup：
//        组织委员维护的档案属性，直改 `PersonStore.saveMember`，保存后即时写入档案；
//      · 报支书确认组（制度变更）developStage / residenceStatus / residenceNote：
//        走制度链 `submitMemberChange(...)` 提交申请 → 支书确认才生效，生效前保持现值。
//    保存流程：先算差异 → 直改字段先保存（失败则报错且不关闭）→ 再逐条报送确认
//      （任一条失败只报告，不影响已成功的直改）→ 汇总「已保存 N 项 · 已报送支书确认 M 项」→
//      回调 onSaved → 关闭。仅「在册备注」变化而状态未变时不发起确认（submitMemberChange 要求
//      to ≠ from），明确提示随在册状态变更一并报送，不静默丢弃。
// ════════════════════════════════════════════════════════════════

import { openModal, closeModal } from './modal.js?v=20260921m';
import { PersonStore } from '../services/person.js?v=20260921m';
import { getBranchById } from '../services/branch.js?v=20260921m';
// Q-21-3 收敛（2026-09-13）：在册状态枚举单一源 = core/constants.js（原经 org-base-data-preview 转出）
import { ROLE_LABELS, DEVELOP_STAGES, RESIDENCE } from '../core/constants.js?v=20260921m';
import { submitMemberChange } from '../services/member-confirmation.js?v=20260921m';
import { AuthStore } from '../services/auth.js?v=20260921m';
import { showToast, escHtml as esc, getBasePath } from '../core/utils.js?v=20260921m';

/** 模态 id（openModal / closeModal 定位键） */
const MODAL_ID = 'person-edit-modal';

/** 在册状态取值（单一源 = core/constants.js 的 RESIDENCE；勿另写「在校/滞留」字面量） */
const RESIDENCE_OPTIONS = [RESIDENCE.CAMPUS, RESIDENCE.DETAINED];

/**
 * 字段归属标签（让操作者一眼知道该字段由谁维护；与 services/person.js 写口字段分组同源）：
 *   档案资料 = name/studentId/partyGroup（名册档案属性，组织委员 profile）
 *   支部治理 = developStage（负责人把关的语义端点）
 *   治理字段 = role/branchId（任命链字段，不在本处修改）
 *   在册管理 = residenceStatus/residenceNote/residenceHistory
 */
const FIELD_OWNER = {
  name: '档案资料',
  studentId: '档案资料',
  enrollYear: '档案资料',
  partyGroup: '档案资料',
  developStage: '支部治理',
  role: '治理字段',
  branchId: '治理字段',
  residenceStatus: '在册管理',
  residenceNote: '在册管理',
  residenceHistory: '在册管理',
};

/** 归属小标签（灰色 chip，仅供识别，不是可点击控件） */
function ownerTag(field) {
  const label = FIELD_OWNER[field] || '档案资料';
  return `<span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 border border-gray-100 flex-shrink-0">${esc(label)}</span>`;
}

/** 完整档案行（只读）：字段名 + 值 + 归属标签；highlight=true → 主题色浅底高亮 */
function archiveRow({ label, valueHtml, field, highlight }) {
  return `<div class="flex items-center gap-2 px-3 py-2 border-b border-gray-50 last:border-b-0${highlight ? ' sel-accent-on' : ''}">
      <span class="text-xs text-gray-500 w-24 flex-shrink-0">${esc(label)}</span>
      <span class="text-xs text-gray-800 flex-1 min-w-0">${valueHtml}</span>
      ${ownerTag(field)}
    </div>`;
}

/** 发展阶段下拉（当前值不在枚举内时保留为「原值」选项，避免打开即产生伪变更） */
function stageOptions(current) {
  const extra = current && !DEVELOP_STAGES.includes(current) ? [current] : [];
  return [...extra, ...DEVELOP_STAGES]
    .map(v => `<option value="${esc(v)}"${v === current ? ' selected' : ''}>${esc(v)}${extra.includes(v) ? '（原值）' : ''}</option>`)
    .join('');
}

/** 在册状态下拉（缺省值 = 在校） */
function residenceOptions(current) {
  const cur = RESIDENCE_OPTIONS.includes(current) ? current : RESIDENCE.CAMPUS;
  return RESIDENCE_OPTIONS
    .map(v => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(v)}</option>`)
    .join('');
}

/** 「立即生效」小标（档案属性直改；浅底语义类，非可点击控件） */
const TAG_INSTANT = '<span class="text-[10px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-100 whitespace-nowrap flex-shrink-0">立即生效</span>';
/** 「报支书确认」小标（制度链；与名册「待确认」小标同源语义） */
const TAG_CONFIRM = '<span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 whitespace-nowrap flex-shrink-0">报支书确认</span>';

/** 字段分组容器：标题 + 说明 + 若干字段行（让操作者一眼看清该组走哪条写路径） */
function groupBox({ title, desc, rows }) {
  return `<div class="rounded-xl border border-gray-100 p-3 mb-3">
      <div class="mb-1.5">
        <h5 class="text-xs font-semibold text-gray-700">${esc(title)}</h5>
        <p class="text-[11px] text-gray-500 mt-0.5">${esc(desc)}</p>
      </div>
      ${rows}
    </div>`;
}

/** 可改字段行（标签 + input-flat 控件 + 右侧写路径小标） */
function formRow(label, controlHtml, { required = false, tag = '' } = {}) {
  return `<div class="flex items-start gap-2 py-1.5">
      <label class="text-xs text-gray-500 w-24 flex-shrink-0 pt-2">${esc(label)}${required ? ' <span class="text-gray-400">*</span>' : ''}</label>
      <div class="flex-1 min-w-0">${controlHtml}</div>
      <div class="flex-shrink-0 pt-1.5">${tag}</div>
    </div>`;
}

/** 今日日期键 'YYYY-MM-DD'（阶段推进「进入当前阶段日期」默认值；submitMemberChange 缺省亦为今日） */
function _todayKey() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * 打开成员档案编辑模态
 * @param {Object} opts
 * @param {string} opts.personId        — 目标成员 id（唯一权威键）
 * @param {string[]} [opts.focusFields] — 当前表负责的字段名（仅用于高亮，不改变可改范围）
 * @param {string} [opts.sourceLabel]   — 来源表名（模态顶部显示「来源：<sourceLabel>」）
 * @param {Function} [opts.onSaved]     — 保存成功回调 (member) => void
 */
export function openPersonEditModal(opts = {}) {
  const personId = opts.personId;
  // ① 每次都现取档案真相（防张冠李戴：不得使用调用方传入的成员对象 / 行数据）
  const member = PersonStore.getById(personId);
  if (!member) {
    showToast('error', '成员不存在或已移出');
    return;
  }

  const focusFields = Array.isArray(opts.focusFields) ? opts.focusFields : [];
  const hits = (f) => focusFields.includes(f);
  const branch = getBranchById(member.branchId);
  const branchLabel = branch?.name || member.branchId || '—';
  const isDetained = member.residenceStatus === RESIDENCE.DETAINED;
  const history = Array.isArray(member.residenceHistory) ? member.residenceHistory : [];

  // ② 上区「完整档案」（只读）：逐字段 + 归属标签；focusFields 命中 → 主题色浅底高亮
  const residenceStatusHtml = isDetained
    ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium text-amber-700 bg-amber-50">${esc(RESIDENCE.DETAINED)}</span>`
    : `<span class="text-gray-800">${esc(member.residenceStatus || RESIDENCE.CAMPUS)}</span>`;

  const archiveRows = [
    archiveRow({ label: '姓名', valueHtml: esc(member.name || '—'), field: 'name', highlight: hits('name') }),
    archiveRow({ label: '学号', valueHtml: esc(member.studentId || '—'), field: 'studentId', highlight: hits('studentId') }),
    archiveRow({ label: '届别', valueHtml: esc(member.enrollYear || '—'), field: 'enrollYear', highlight: hits('enrollYear') }),
    archiveRow({ label: '党小组', valueHtml: esc(member.partyGroup || '—'), field: 'partyGroup', highlight: hits('partyGroup') }),
    archiveRow({ label: '发展阶段', valueHtml: esc(member.developStage || '—'), field: 'developStage', highlight: hits('developStage') }),
    archiveRow({ label: '角色', valueHtml: esc(ROLE_LABELS[member.role] || member.role || '—'), field: 'role', highlight: hits('role') }),
    archiveRow({ label: '所属支部', valueHtml: esc(branchLabel), field: 'branchId', highlight: hits('branchId') }),
    archiveRow({ label: '在册状态', valueHtml: residenceStatusHtml, field: 'residenceStatus', highlight: hits('residenceStatus') }),
    archiveRow({ label: '在册备注', valueHtml: esc(member.residenceNote || '—'), field: 'residenceNote', highlight: hits('residenceNote') }),
    archiveRow({ label: '在册变更留痕', valueHtml: `<span class="text-gray-800">${history.length} 条</span>`, field: 'residenceHistory', highlight: hits('residenceHistory') }),
  ].join('');

  // ③ 下区「可改字段」（按写路径分两组：档案属性立即生效 / 制度变更报支书确认）
  const formHtml = `
    <form id="${MODAL_ID}-form">
      ${groupBox({
        title: '档案资料 · 立即生效',
        desc: '组织委员维护的成员档案属性，保存后即时写入档案。',
        rows: [
          formRow('姓名', `<input data-field="name" type="text" class="input-flat text-xs w-full" value="${esc(member.name || '')}" placeholder="成员姓名" />`, { required: true, tag: TAG_INSTANT }),
          formRow('学号', `<input data-field="studentId" type="text" class="input-flat text-xs w-full" value="${esc(member.studentId || '')}" placeholder="学号（可空）" />`, { tag: TAG_INSTANT }),
          formRow('党小组', `<input data-field="partyGroup" type="text" class="input-flat text-xs w-full" value="${esc(member.partyGroup || '')}" placeholder="党小组归属（可空）" />`, { tag: TAG_INSTANT }),
        ].join(''),
      })}
      ${groupBox({
        title: '制度变更 · 报支书确认',
        desc: '提交后由支书确认才生效，确认前保持现值，成员名册显示「待确认」。',
        rows: [
          formRow('发展阶段', `<select data-field="developStage" class="input-flat text-xs w-full">${stageOptions(member.developStage)}</select>`, { tag: TAG_CONFIRM }),
          formRow('在册状态', `<select data-field="residenceStatus" class="input-flat text-xs w-full">${residenceOptions(member.residenceStatus)}</select>`, { tag: TAG_CONFIRM }),
          formRow('在册备注', `<textarea data-field="residenceNote" rows="3" class="input-flat text-xs w-full" placeholder="在册变更原因 / 起止等（可空；随在册状态变更一并报确认）">${esc(member.residenceNote || '')}</textarea>`, { tag: TAG_CONFIRM }),
        ].join(''),
      })}
      <div class="mt-3 pt-3 border-t border-gray-50">
        <div class="flex items-center gap-2 text-xs">
          <span class="text-gray-500 w-24 flex-shrink-0">角色</span>
          <span class="text-gray-800 flex-1 min-w-0">${esc(ROLE_LABELS[member.role] || member.role || '—')}</span>
        </div>
        <div class="flex items-center gap-2 text-xs mt-1">
          <span class="text-gray-500 w-24 flex-shrink-0">所属支部</span>
          <span class="text-gray-800 flex-1 min-w-0">${esc(branchLabel)}</span>
        </div>
        <p class="text-[11px] text-gray-400 mt-1.5 ml-0">治理字段（角色 / 所属支部），不在本处修改</p>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button type="button" data-modal-cancel="${MODAL_ID}" class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">取消</button>
        <button type="submit" class="btn-accent text-xs px-4 py-2 rounded-lg">保存</button>
      </div>
    </form>`;

  const sourceLine = opts.sourceLabel
    ? `<div class="text-[11px] text-gray-500 mb-3">来源：${esc(opts.sourceLabel)}</div>`
    : '';

  const bodyHtml = `
    ${sourceLine}
    <h4 class="text-xs font-semibold text-gray-700 mb-2">完整档案（只读）</h4>
    <div class="rounded-xl border border-gray-100 overflow-hidden mb-5">${archiveRows}</div>
    <h4 class="text-xs font-semibold text-gray-700 mb-2">可改字段</h4>
    ${formHtml}
  `;

  // ④ 焦点归还载体：记录触发元素（打开前）
  const trigger = document.activeElement;

  // 顶部标题行次要入口：跳成员档案独立页（同标签页；供本模态未覆盖的完整档案 / 在册留痕 / 关联概览查阅）
  const archiveHref = `${getBasePath()}person.html?id=${encodeURIComponent(personId)}`;

  const panel = openModal({
    id: MODAL_ID,
    title: `成员档案 · ${esc(member.name || personId)} <a href="${archiveHref}" class="text-xs font-normal text-gray-500 hover:text-gray-700 ml-2 whitespace-nowrap">查看完整档案 →</a>`,
    bodyHtml,
    width: '560px',
    onMount: (panelEl) => {
      const cancelBtn = panelEl.querySelector(`[data-modal-cancel="${MODAL_ID}"]`);
      cancelBtn?.addEventListener('click', () => closeModal(MODAL_ID));
      panelEl.querySelector(`#${MODAL_ID}-form`)?.addEventListener('submit', onSubmit);
      // 打开时聚焦第一个可编辑输入
      panelEl.querySelector('[data-field]')?.focus();
    },
  });

  // 关闭后焦点归还触发元素（MutationObserver 覆盖 Esc / 遮罩点击 / 关闭按钮三条路径）
  const overlay = panel?.parentElement;
  if (overlay && typeof MutationObserver !== 'undefined') {
    const mo = new MutationObserver(() => {
      if (overlay.isConnected) return;
      mo.disconnect();
      if (trigger && trigger.isConnected && typeof trigger.focus === 'function') {
        try { trigger.focus(); } catch (_) { /* 触发元素不可聚焦时忽略 */ }
      }
    });
    mo.observe(document.body, { childList: true });
  }

  /**
   * 保存：先算差异 → 直改字段先保存 → 再逐条报送支书确认 → 汇总 → 关闭。
   * 失败（直改保存失败）不关闭，便于修正；报送确认失败只报告，不影响已成功的直改。
   * @param {SubmitEvent} e
   */
  async function onSubmit(e) {
    e.preventDefault();
    const panelEl = panel;
    const btn = panelEl?.querySelector(`#${MODAL_ID}-form button[type="submit"]`);
    const read = (f) => panelEl?.querySelector(`[data-field="${f}"]`)?.value ?? '';

    const next = {
      name: String(read('name')).trim(),
      studentId: String(read('studentId')).trim(),
      partyGroup: String(read('partyGroup')).trim(),
      developStage: read('developStage'),
      residenceStatus: read('residenceStatus'),
      residenceNote: String(read('residenceNote')).trim(),
    };
    if (!next.name) {
      showToast('error', '成员姓名不能为空');
      return;
    }

    // 与档案真值逐字段比对 → 只提交有变更的字段（在册状态缺失 ≡ 在校，避免伪变更）
    const truthOf = (f) => (f === 'residenceStatus' && !member.residenceStatus ? RESIDENCE.CAMPUS : (member[f] ?? ''));
    const patch = {};
    for (const f of Object.keys(next)) {
      if (String(next[f]) !== String(truthOf(f))) patch[f] = next[f];
    }
    if (Object.keys(patch).length === 0) {
      showToast('info', '没有需要保存的变更');
      closeModal(MODAL_ID);
      return;
    }

    // 按写路径分组：档案资料立即生效 / 制度变更报支书确认
    const INSTANT_FIELDS = ['name', 'studentId', 'partyGroup'];
    const instantPatch = {};
    for (const f of INSTANT_FIELDS) if (f in patch) instantPatch[f] = patch[f];
    const stageChanged = 'developStage' in patch;
    const resStatusChanged = 'residenceStatus' in patch;
    const noteOnly = 'residenceNote' in patch && !resStatusChanged; // 状态未动、仅备注变化

    if (btn) btn.disabled = true;

    // ① 立即生效组：档案属性直改（失败不关闭，便于修正后重试）
    let savedMember = member;
    let savedCount = 0;
    if (Object.keys(instantPatch).length) {
      let r;
      try {
        r = await PersonStore.saveMember({ id: member.id, ...instantPatch });
      } catch (err) {
        r = { ok: false, reason: err?.message || '保存失败' };
      }
      if (!r || !r.ok) {
        if (btn) btn.disabled = false;
        showToast('error', r?.reason || '保存失败');
        return;
      }
      savedMember = r.member || { ...member, ...instantPatch };
      savedCount = Object.keys(instantPatch).length;
    }

    // ② 报支书确认组：逐条提交制度链（任一条失败只报告，不影响已成功的直改）
    const by = AuthStore.getCurrentUser()?.personId;
    let submitted = 0;
    const errors = [];
    if (stageChanged) {
      const r = submitMemberChange({
        personId: member.id, kind: 'developStage', to: patch.developStage,
        by, entryDate: _todayKey(),
      });
      if (r.ok) submitted += 1; else errors.push(r.reason || '发展阶段变更报送失败');
    }
    if (resStatusChanged) {
      // 在册备注随在册状态变更一并提交（在校不留滞留备注，与名册口径一致）
      const r = submitMemberChange({
        personId: member.id, kind: 'residence', to: patch.residenceStatus,
        note: patch.residenceStatus === RESIDENCE.DETAINED ? next.residenceNote : '', by,
      });
      if (r.ok) submitted += 1; else errors.push(r.reason || '在册状态变更报送失败');
    }

    if (btn) btn.disabled = false;

    if (noteOnly) {
      // submitMemberChange 要求 to ≠ from → 备注无法单独发起变更：明确提示，不静默丢弃
      showToast('warn', '在册备注需随在册状态变更一并报确认，请先调整状态或联系支书');
    }
    if (errors.length) showToast('error', errors.join('；'));

    if (savedCount + submitted === 0) return; // 无实际落档（仅备注变化 / 报送失败）：保留模态便于修正

    showToast('success', `已保存 ${savedCount} 项 · 已报送支书确认 ${submitted} 项`);
    if (typeof opts.onSaved === 'function') {
      try { opts.onSaved(savedMember); } catch (err) { console.warn('[person-edit-modal] onSaved 回调异常：', err); }
    }
    closeModal(MODAL_ID);
  }
}
