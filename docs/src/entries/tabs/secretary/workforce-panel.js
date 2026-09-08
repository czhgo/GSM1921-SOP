// role: [工程师]+[AI]
// entries/tabs/secretary/workforce-panel.js — 支部分工调整工具（L4 M2，2026-09-03 / 补齐 2026-09-05）
// 挂载在「支部分工」tab 底部（仅书记/副书记可见）：
//   ① 发起分工调整：多行（模块 → 新负责人）＋说明/日期 → 「存草稿」或「直接发起支委会议题表决」；
//   ② 草稿（书记台暂存 localStorage 'gsm1921-workforce-draft'，每支部一份）可载入编辑/删除；
//   ③ 议题列表：实时显示票决判定（应到超过 2/3 且无反对=通过，附录⑩ S2 R2-3）徽标与统计——
//      已通过=可采纳；未达出席门槛/有反对=采纳禁用（去表决再议）。
// 表决 UI 复用既有 agenda-votes 资产；本面板不重复实现投票。

import { escHtml as esc, showToast } from '../../../core/utils.js?v=20260908c';
import { WORK_MAP_MODULES } from '../../../core/work-map.js?v=20260908c';
import { BRANCH_COMMISSION_ROLES, ROLE_LABELS } from '../../../core/constants.js?v=20260908c';
import { PersonStore } from '../../../services/person.js?v=20260908c';
import {
  createWorkforceProposalActivity, listWorkforceProposals, adoptWorkforceProposal,
  getWorkforceVoteOutcome, ownerDisplay,
} from '../../../services/workforce.js?v=20260908c';
import { getBranchWorkforce } from '../../../services/branch.js?v=20260908c';

const DRAFT_KEY = 'gsm1921-workforce-draft';

function _today() {
  return new Date().toISOString().slice(0, 10);
}

// ── 草稿暂存（书记台本地，每支部一份）─────────────────────────────
function _readDraftMap() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_) { return {}; }
}
function _saveDraftMap(map) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(map)); } catch (_) { /* 存储不可用静默 */ }
}
function loadDraft(branchId) {
  const m = _readDraftMap();
  return m && m[branchId] ? m[branchId] : null;
}
function persistDraft(branchId, draft) {
  const m = _readDraftMap();
  m[branchId] = { ...draft, updatedAt: new Date().toISOString() };
  _saveDraftMap(m);
}
function removeDraft(branchId) {
  const m = _readDraftMap();
  if (m && m[branchId]) { delete m[branchId]; _saveDraftMap(m); }
}

/** 负责人候选下拉（支委角色 + 支部成员；value 编码 type:id） */
function _ownerOptionsHtml() {
  const roles = BRANCH_COMMISSION_ROLES.map((r) =>
    `<option value="role:${r}">${esc(ROLE_LABELS[r] || r)}</option>`).join('');
  const members = PersonStore.getMembers()
    .map((p) => `<option value="person:${p.id}">${esc((p.name || p.id))}（${esc(ROLE_LABELS[p.role] || p.role || '成员')}）</option>`)
    .join('');
  return `
    <optgroup label="支委角色">${roles}</optgroup>
    <optgroup label="具体成员（到人）">${members}</optgroup>`;
}

/** 单行（模块 → 新负责人），行可删；moduleId/ownerVal 用于回填（草稿载入） */
function _rowHtml(branchId, workforce, moduleId, ownerVal) {
  const moduleOpts = WORK_MAP_MODULES.map((m) => {
    const cur = ownerDisplay(workforce[m.id]);
    return `<option value="${m.id}" ${moduleId === m.id ? 'selected' : ''}>${esc(m.name)}（现：${esc(cur)}）</option>`;
  }).join('');
  return `
    <div class="wf-row flex items-center gap-2">
      <select class="wf-module rounded-lg border border-gray-200 px-2 py-1.5 text-xs bg-white min-w-[200px]">${moduleOpts}</select>
      <select class="wf-owner rounded-lg border border-gray-200 px-2 py-1.5 text-xs bg-white min-w-[160px]"><option value="">新负责人…</option>${_ownerOptionsHtml()}</select>
      <button type="button" class="wf-row-del px-2 py-1 rounded-lg text-xs text-gray-400 hover:text-red-600 hover:bg-red-50" title="删除此行">删除</button>
    </div>`;
}
// ownerVal 回填：在 _fillRow 中以 JS 赋值（避免模板注入）
function _fillRowOwner(rowEl, ownerVal) {
  if (!rowEl || !ownerVal) return;
  const sel = rowEl.querySelector('.wf-owner');
  if (sel) sel.value = ownerVal;
}

/** 收集表单行 → 改派清单数组 */
function _collectRows(formWrap) {
  const rows = [];
  formWrap.querySelectorAll('.wf-row').forEach((rowEl) => {
    const moduleId = rowEl.querySelector('.wf-module')?.value;
    const ownerVal = rowEl.querySelector('.wf-owner')?.value || '';
    if (!moduleId || !ownerVal) return;
    const [ownerType, ownerId] = ownerVal.split(':');
    rows.push({ moduleId, to: { ownerType, ownerId } });
  });
  return rows;
}

/** 议题卡徽标 + 统计（非已生效议题实时判定） */
function _outcomeHtml(outcome) {
  if (!outcome) return '';
  const { status, tally, needed } = outcome;
  const sum = `${tally.voted}/${needed} 表态 · 应到 ${tally.total} · 异议 ${tally.object}`;
  if (status === 'passed') {
    return `<span class="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">已通过·可采纳</span>
      <p class="text-[11px] text-gray-400 mt-1">${sum}</p>`;
  }
  if (status === 'failed') {
    return `<span class="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700">未通过·有异议</span>
      <p class="text-[11px] text-gray-400 mt-1">${sum}</p>`;
  }
  return `<span class="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">待足额（差 ${needed - tally.voted} 票）</span>
    <p class="text-[11px] text-gray-400 mt-1">${sum}</p>`;
}

/** 议题列表卡（adoptable=通过判定实时；已生效=只读） */
function _proposalCards(proposals, outcomesByAct) {
  if (!proposals.length) {
    return `<p class="text-xs text-gray-400">暂无分工调整议题——发起后将在此跟踪表决与采纳。</p>`;
  }
  return proposals.map((a) => {
    const adopted = !!a.extras.adoptedAt;
    const outcome = adopted ? null : (outcomesByAct[a.id] || null);
    const adoptable = !adopted && outcome && outcome.status === 'passed';
    const lines = (a.extras.proposal || []).map((c) => {
      const m = WORK_MAP_MODULES.find((x) => x.id === c.moduleId);
      return `<span class="text-xs px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-100">${esc(m ? m.name : c.moduleId)} → ${esc(ownerDisplay(c.to))}</span>`;
    });
    const statusChip = adopted
      ? '<span class="shrink-0 text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">已生效</span>'
      : _outcomeHtml(outcome);
    return `
      <div class="rounded-xl border ${adopted ? 'border-green-200 bg-green-50/40' : 'border-gray-200 bg-white'} p-3 flex items-center gap-3">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <p class="font-title-cn text-sm font-bold text-gray-800 truncate">${esc(a.title)}</p>
            ${statusChip}
          </div>
          <p class="text-[11px] text-gray-400 mt-0.5">${esc(a.date || '')} · 表决入口：本次支委会活动（交流式表态）</p>
          <div class="flex flex-wrap gap-1.5 mt-1.5">${lines.join('')}</div>
        </div>
        <div class="shrink-0 flex flex-col gap-1.5 items-end">
          <a href="secretary.html?activityId=${a.id}" class="px-2.5 py-1 rounded-lg text-xs border border-gray-200 text-gray-600 hover:bg-gray-50">去表决</a>
          ${!adopted ? (adoptable
            ? `<button type="button" class="wf-adopt px-2.5 py-1 rounded-lg text-xs font-medium text-white bg-red-600 hover:bg-red-700" data-id="${a.id}">采纳生效</button>`
            : `<button type="button" class="wf-adopt-disabled px-2.5 py-1 rounded-lg text-xs text-gray-400 border border-gray-200 cursor-not-allowed" data-id="${a.id}" title="票决通过（应到超过 2/3 出席且无反对）后方可采纳">采纳生效</button>`) : ''}
        </div>
      </div>`;
  }).join('');
}

/**
 * 挂载分工调整工具（hostEl 为「支部分工」tab 底部容器）
 * @param {string} branchId
 * @param {HTMLElement} hostEl
 */
export async function mountWorkforcePanel(branchId, hostEl) {
  const header = document.createElement('div');
  header.className = 'flex items-center gap-2 mb-2 mt-4';
  header.innerHTML = `
    <p class="font-title-cn text-sm font-bold text-gray-800">分工调整（走支委会议题）</p>
    <button type="button" id="wf-open" class="ml-auto px-3 py-1 rounded-lg text-xs font-medium text-white bg-red-600 hover:bg-red-700">＋ 发起调整</button>`;
  const body = document.createElement('div');
  body.id = 'workforce-panel-body';
  // 发起表单区独立于议题列表容器：renderBody 重建列表时不触碰表单 DOM——
  // 保态修复（最小操作成本，疑点见 MODULARIZATION_ASSESSMENT §8.7，2026-09-05）
  const formZone = document.createElement('div');
  formZone.id = 'wf-form-zone';
  hostEl.appendChild(header);
  hostEl.appendChild(formZone);
  hostEl.appendChild(body);

  const workforce = getBranchWorkforce(branchId);

  /** 渲染表单区（rows 可回填：草稿载入） */
  function renderForm(wrap) {
    const draft = loadDraft(branchId);
    const draftRows = draft && Array.isArray(draft.rows) ? draft.rows : [];
    const date = (draft && draft.date) || _today();
    const note = (draft && draft.note) || '';
    wrap.innerHTML = `
      <div class="rounded-xl border border-dashed border-red-200 bg-red-50/40 p-3.5 flex flex-col gap-2.5">
        <div class="flex items-center gap-2">
          <p class="font-title-cn text-sm font-bold text-gray-800">发起支部分工调整</p>
          <span class="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700">需经支委会议题表决后生效</span>
        </div>
        ${draft ? `<div class="flex items-center gap-2 text-[11px] text-gray-500 bg-white/70 rounded-lg px-2.5 py-1.5">
            <span>有草稿（${new Date(draft.updatedAt || Date.now()).toLocaleString('zh-CN', { hour12: false }).slice(0, 16)} 保存）：</span>
            <button type="button" id="wf-load-draft" class="px-2 py-0.5 rounded-md text-red-600 border border-red-200 hover:bg-red-50">载入编辑</button>
            <button type="button" id="wf-del-draft" class="px-2 py-0.5 rounded-md text-gray-400 hover:text-red-600">删除草稿</button>
          </div>` : ''}
        <div id="wf-rows" class="flex flex-col gap-2">
          ${draftRows.length ? '' : '<div class="wf-empty-note text-[11px] text-gray-400">至少一行（模块 → 新负责人）</div>'}
        </div>
        <button type="button" id="wf-add-row" class="self-start text-[11px] px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">＋ 加一行</button>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <label class="flex flex-col gap-1 text-xs text-gray-500">支委会日期
            <input id="wf-date" type="date" value="${esc(date)}" class="rounded-lg border border-gray-200 px-2 py-1.5 text-xs bg-white">
          </label>
          <label class="flex flex-col gap-1 text-xs text-gray-500">议题说明（理由）
            <input id="wf-note" type="text" value="${esc(note)}" placeholder="如：发展工作由副书记统筹" class="rounded-lg border border-gray-200 px-2 py-1.5 text-xs bg-white">
          </label>
        </div>
        <div class="flex justify-end gap-2">
          <button type="button" id="wf-save-draft" class="px-3 py-1.5 rounded-lg text-xs border border-gray-200 text-gray-500 hover:bg-gray-100">存草稿</button>
          <button type="button" id="wf-cancel" class="px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100">收起</button>
          <button type="button" id="wf-submit" class="px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-red-600 hover:bg-red-700">直接发起支委会议题</button>
        </div>
      </div>`;

    // 行管理与回填
    const rowsBox = wrap.querySelector('#wf-rows');
    const addRow = (moduleId, ownerVal) => {
      const el = document.createElement('div');
      el.innerHTML = _rowHtml(branchId, workforce, moduleId || '', ownerVal || '');
      const row = el.firstElementChild;
      row.querySelector('.wf-row-del').addEventListener('click', () => { row.remove(); });
      rowsBox.appendChild(row);
      if (ownerVal) _fillRowOwner(row, ownerVal);
      const emptyNote = rowsBox.querySelector('.wf-empty-note');
      if (emptyNote) emptyNote.remove();
    };
    // 初始行：无草稿给 1 空行；有草稿给出行数（载入编辑即回填）
    if (!draftRows.length) { addRow(); }
    else { draftRows.forEach((r) => addRow(r.moduleId, `${r.to.ownerType}:${r.to.ownerId}`)); }

    wrap.querySelector('#wf-add-row').addEventListener('click', () => addRow());
    wrap.querySelector('#wf-cancel').addEventListener('click', () => wrap.classList.add('hidden'));
    wrap.querySelector('#wf-del-draft').addEventListener('click', () => { removeDraft(branchId); renderForm(wrap); });
    wrap.querySelector('#wf-load-draft').addEventListener('click', () => { /* 行已按草稿回填，仅提示 */ showToast('已载入草稿，可编辑后提交', 'info'); });
    wrap.querySelector('#wf-save-draft').addEventListener('click', () => {
      const rows = _collectRows(wrap);
      if (!rows.length) { showToast('请至少填写一行（模块与新负责人）', 'warn'); return; }
      persistDraft(branchId, { rows, note: wrap.querySelector('#wf-note').value.trim(), date: wrap.querySelector('#wf-date').value || _today() });
      showToast('草稿已保存', 'success');
      renderBody();
    });
    wrap.querySelector('#wf-submit').addEventListener('click', async () => {
      const rows = _collectRows(wrap);
      if (!rows.length) { showToast('请至少填写一行（模块与新负责人）', 'warn'); return; }
      const note = wrap.querySelector('#wf-note').value.trim();
      const date = wrap.querySelector('#wf-date').value || _today();
      try {
        await createWorkforceProposalActivity(branchId, rows, note, date);
        showToast('已发起支委会议题，等待表决');
        removeDraft(branchId);
        formZone.innerHTML = ''; // 发起成功后重置表单（下次展开为全新表单）
        renderBody();
      } catch (e) {
        console.error('[workforce] 发起失败', e);
        showToast(`发起失败：${e.message || e}`, 'error');
      }
    });
  }

  async function renderBody() {
    // 发起表单（默认收起）＋ 议题列表（实时票决判定）
    const proposals = await listWorkforceProposals(branchId);
    // 对未生效议题并行求票决判定：Promise.allSettled 并发，单条失败 console.warn 不阻断其余卡片；
    // 理由：多议题时缩短书记等待（最小操作成本，MODULARIZATION_ASSESSMENT §8.7）
    const pending = proposals.filter((a) => !(a.extras && a.extras.adoptedAt));
    const outcomesByAct = {};
    const settled = await Promise.allSettled(pending.map((a) => getWorkforceVoteOutcome(a.id)));
    settled.forEach((r, i) => {
      if (r.status === 'fulfilled') outcomesByAct[pending[i].id] = r.value;
      else console.warn('[workforce] 判定失败（不影响列表）', pending[i].id, r.reason);
    });
    body.innerHTML = `<div class="flex flex-col gap-2">${_proposalCards(proposals, outcomesByAct)}</div>`;
    // 采纳（仅通过态按钮带 wf-adopt 类）——列表重建不影响已展开的表单区（formZone 独立）
    body.querySelectorAll('.wf-adopt').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!window.confirm('确认按支委会表决结果采纳该分工调整？')) return;
        try {
          await adoptWorkforceProposal(branchId, btn.dataset.id);
          showToast('分工已生效');
          renderBody();
        } catch (e) {
          console.error('[workforce] 采纳失败', e);
          showToast(`采纳失败：${e.message || e}`, 'error');
        }
      });
    });
  }
  // 「＋ 发起调整」：表单区为空则首次渲染（含草稿回填）；否则仅展开/收起已存在表单（保态）
  header.querySelector('#wf-open').addEventListener('click', () => {
    if (!formZone.innerHTML.trim()) { renderForm(formZone); return; }
    formZone.classList.toggle('hidden');
  });

  await renderBody();
}
