// role: [工程师]+[AI]
// 党委工作台 Tab：支部管理（P1 党委后台，2026-09-02）
// 支部不预设名字：党委创建/改名支部实例；config.headerTitle 随名软编码（header 随支部更换）
// 立项⑥ B波（2026-09-06）：空支部「整表导入/替换名册」入口——下载名册模板(JSON) → 导入净化 →
//   统计卡预览 → 确认 → PersonStore.replaceBranchMembers 落库（mock/api 双形态由服务保证），
//   导入后成员/应到统计即时可见（读链自动）；仅空支部可整表替换（非空支部提示逐人编辑，不提供动作）。

import { mockDB } from '../../../core/domain.js?v=20260903c';
// 数据域接线收口（2026-09-03）：支部成员名单经 services/person.js 获取（原直连 mock PEOPLE）；
// 每次渲染现读（members 覆盖层即时吃到），不缓存在模块顶层
import { PersonStore, getPersonName } from '../../../services/person.js?v=20260907b';
import { createBranch, renameBranch, getCommitteeName } from '../../../services/branch.js?v=20260903c';
import { appointSecretary, listAppointments } from '../../../services/appointment.js?v=20260906f';
import { getRosterStats } from '../../../services/roster.js?v=20260903c';
// 立项⑥ B波：空支部名册导入服务（模板/净化/统计；确认落库直接走 PersonStore.replaceBranchMembers）
import { buildBranchRosterTemplate, sanitizeBranchRoster } from '../../../services/branch-roster-import.js?v=20260906b';
import { showToast, escHtml as esc, downloadBlob } from '../../../core/utils.js?v=20260903c';

// HTML 转义统一走 core/utils.js escHtml（2026-09-03 去重收口）

// ── 空支部名册导入面板状态（renderContent 重渲染保态：展开/草稿不因折叠与列表刷新丢失）──
let _rosterOpenBranch = null;    // 展开导入面板的支部 id（null = 全部收起）
const _rosterDrafts = new Map(); // branchId → { people, stats, dropped, fileName }（净化通过、未落库）
let _rosterInputBranch = null;   // 触发「选择名册文件」的支部 id（共享 file input 需要）

/** 操作人（审计预留 by；与 services/branch.js 同键跨模块约定，不 import auth 防循环依赖） */
function _actorId() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem('gsm1921-login-user');
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d.personId || d.userId || d.id || null;
  } catch (_) { return null; }
}

export async function renderContent() {
  const el = document.getElementById('party-committee-tab-content');
  if (!el) return;
  const branches = mockDB.branches || [];
  const members = PersonStore.getMembers(); // 现读档案（种子 + members 覆盖层），导入落库后即时吃到

  el.innerHTML = `
    <div class="space-y-4">
      <div class="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between">
        <div>
          <p class="font-title-cn text-base font-bold text-gray-800">支部实例</p>
          <p class="text-xs text-gray-400 mt-0.5">支部不预设名字——由党委按实际情况创建/改名（硕博等支部随时可加）</p>
        </div>
        <button id="branch-add-toggle" class="text-xs px-3 py-1.5 rounded-lg text-white font-medium" style="background:#C8102E;">+ 新建支部</button>
      </div>
      <div id="branch-form-wrap" class="hidden rounded-xl border border-gray-200 bg-white p-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label class="text-xs text-gray-500 block mb-1" for="branch-name-input">支部名称（如 光华管理学院本科第二党支部）</label>
            <input id="branch-name-input" type="text" class="input-flat w-full" placeholder="支部全称" />
          </div>
          <div>
            <label class="text-xs text-gray-500 block mb-1" for="branch-type-input">类型（可选，自由文本）</label>
            <input id="branch-type-input" type="text" class="input-flat w-full" placeholder="如 硕士/博士/本科生" />
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <button id="branch-form-cancel" class="text-xs px-3 py-1.5 rounded-lg text-gray-500 border border-gray-200">取消</button>
          <button id="branch-form-submit" class="text-xs px-3 py-1.5 rounded-lg text-white font-medium" style="background:#C8102E;">创建支部</button>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${branches.map(b => {
          const bid = b.id;
          const inBranch = members.filter(p => p.branchId === bid);
          const rStats = getRosterStats({ branchId: bid });
          const isEmpty = inBranch.length === 0;
          return `
          <div class="rounded-xl border border-gray-200 bg-white p-4" data-branch-card="${esc(bid)}">
            <div class="flex items-start justify-between mb-2">
              <div class="min-w-0">
                <p class="font-title-cn text-base font-bold text-gray-800 truncate">${esc(b.config?.headerTitle || b.name)}</p>
                <p class="text-xs text-gray-400 mt-0.5">${esc(b.type || '支部')} · 现任书记：${esc(b.secretaryId ? getPersonName(b.secretaryId) : '（待任命）')}</p>
                ${isEmpty
                  ? '<p class="text-[11px] text-amber-600 mt-1">空支部 · 成员 0 名——可整表导入成员名册（导入后成员/应到统计即时可见）</p>'
                  : `<p class="text-[11px] text-gray-400 mt-1">成员 ${inBranch.length} 名 · 在册党员 ${rStats.partyTotal} · 支部党员大会应到 ${rStats.expected} 人</p>`}
              </div>
              <span class="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 shrink-0">运行中</span>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button class="branch-rename-toggle text-xs px-2.5 py-1 rounded-lg text-gray-500 border border-gray-200 hover:border-red-300 hover:text-red-600">改名</button>
              <button class="branch-appoint-toggle text-xs px-2.5 py-1 rounded-lg text-gray-500 border border-gray-200 hover:border-red-300 hover:text-red-600">任命书记</button>
              ${isEmpty
                ? `<button type="button" class="text-xs px-2.5 py-1 rounded-lg text-white font-medium" style="background:#C8102E;" data-branch-roster-act="toggle" data-branch-id="${esc(bid)}">导入成员名册</button>`
                : `<span class="text-[11px] text-gray-400">已有成员/历史：不可整表替换，成员调整请逐人编辑（成员档案）</span>`}
            </div>
            <div class="branch-rename-row hidden mt-2 flex gap-2">
              <input class="branch-rename-input input-flat w-full" value="${esc(b.config?.headerTitle || b.name)}" placeholder="支部全称" />
              <button class="branch-rename-save text-xs px-3 py-1.5 rounded-lg text-white font-medium shrink-0" style="background:#C8102E;">保存</button>
            </div>
            <div class="branch-appoint-row hidden mt-2 space-y-2">
              <select class="branch-appoint-select input-flat w-full">
                <option value="">— 选择本支部成员为新任书记 —</option>
                ${members.filter(p => p.branchId === bid && p.role !== 'party-staff').map(p =>
                  `<option value="${esc(p.id)}" ${p.id === b.secretaryId ? 'disabled' : ''}>${esc(p.name)}（${esc(p.developStage || '')}）${p.id === b.secretaryId ? '·现任' : ''}</option>`).join('')}
              </select>
              <div class="flex items-center justify-between gap-2">
                <input class="branch-appoint-note input-flat w-full" placeholder="任命说明（可选，如 换届选举 2026-09）" />
                <button class="branch-appoint-save text-xs px-3 py-1.5 rounded-lg text-white font-medium shrink-0" style="background:#C8102E;">确认任命</button>
              </div>
            </div>
            ${(() => { const h = listAppointments(bid); return h.length ? `
            <div class="mt-2 pt-2 border-t border-gray-100">
              <p class="text-xs text-gray-400 mb-1">任期档案</p>
              ${h.slice(0, 3).map(r => `
                <p class="text-xs text-gray-500 leading-5">${esc(getPersonName(r.secretaryId))} · ${String(r.from || '').slice(0, 10)}${r.to ? ' → ' + String(r.to).slice(0, 10) : ' · 现任'}${r.note ? ' · ' + esc(r.note) : ''}</p>`).join('')}
            </div>` : ''; })()}
            ${isEmpty ? _rosterPanelHtml(b) : ''}
          </div>`;
        }).join('')}
      </div>
      <p class="text-xs text-gray-400">党委组织：${esc(getCommitteeName())} · 支部 ${branches.length} 个 · 名册导入仅对空支部开放</p>
      <input type="file" id="branch-roster-file" accept=".json,application/json" class="hidden" aria-label="选择成员名册 JSON 文件">
    </div>
  `;

  // 新建表单开关
  const toggle = el.querySelector('#branch-add-toggle');
  const formWrap = el.querySelector('#branch-form-wrap');
  toggle?.addEventListener('click', () => formWrap?.classList.toggle('hidden'));
  el.querySelector('#branch-form-cancel')?.addEventListener('click', () => formWrap?.classList.add('hidden'));

  // 创建支部（立项⑤ 阶段A：写口升级为 createBranch 空模板双形态——建出的支部为空：
  // config 默认全开、业务域为空、席位空缺待任命；返回 { ok, branch?, reason? }）
  el.querySelector('#branch-form-submit')?.addEventListener('click', async () => {
    const name = el.querySelector('#branch-name-input')?.value.trim();
    const type = el.querySelector('#branch-type-input')?.value.trim();
    if (!name) { showToast('error', '请填写支部名称'); return; }
    const res = await createBranch({ name, type });
    if (!res || !res.ok) {
      showToast('error', `创建失败：${(res && res.reason) || '未知原因'}`);
      return;
    }
    showToast('success', `支部「${name}」已创建（空支部：业务为空，可「导入成员名册」整表落库或在「支部配置」向导填入组织信息/模块/分工）`);
    renderContent();
  });

  // 改名（toggle 行 + 保存）
  el.querySelectorAll('[data-branch-card]').forEach(card => {
    const branchId = card.dataset.branchCard;
    card.querySelector('.branch-rename-toggle')?.addEventListener('click', () => {
      card.querySelector('.branch-rename-row')?.classList.toggle('hidden');
    });
    card.querySelector('.branch-rename-save')?.addEventListener('click', async () => {
      const name = card.querySelector('.branch-rename-input')?.value.trim();
      if (!name) { showToast('error', '支部名称不能为空'); return; }
      await renameBranch(branchId, name);
      showToast('success', '支部名称已更新（header 已随配置更换）');
      renderContent();
    });
    // 任命书记（P2：toggle 展开 → 选成员 → 确认任命）
    card.querySelector('.branch-appoint-toggle')?.addEventListener('click', () => {
      card.querySelector('.branch-appoint-row')?.classList.toggle('hidden');
    });
    card.querySelector('.branch-appoint-save')?.addEventListener('click', async () => {
      const personId = card.querySelector('.branch-appoint-select')?.value;
      if (!personId) { showToast('error', '请选择新任书记'); return; }
      const note = card.querySelector('.branch-appoint-note')?.value.trim() || '';
      const name = card.querySelector('.branch-appoint-select')?.selectedOptions?.[0]?.textContent || personId;
      await appointSecretary({ branchId, personId, note });
      showToast('success', `已任命 ${name.split('（')[0]} 为支部书记（原书记已降回成员，任期档案已记录）`);
      renderContent();
    });
  });

  // 立项⑦ B波：支部卡「进入支部（演示）」→ 支部层工作台（branch 上下文；本地开发/非 API 登录才放行）
  bindBranchDemoButtons(el);

  // 名册导入（容器级委托：面板/草稿为动态区，重挂前先摘旧监听防叠加）
  _bindRosterDelegation(el);
}

// ── 空支部名册导入面板（仅空支部渲染；模板行 = 现有成员档案，确认 = replaceBranchMembers 落库）──

/** 导入面板 HTML（展开态由 _rosterOpenBranch 决定；草稿统计卡随重渲染保态） */
function _rosterPanelHtml(b) {
  const bid = b.id;
  return `
    <div class="branch-roster-row ${_rosterOpenBranch === bid ? '' : 'hidden'} mt-2 rounded-lg border border-blue-100 bg-blue-50/40 p-3 space-y-2">
      <p class="text-xs font-semibold text-gray-700">导入成员名册（整支部替换 · 一次落库）</p>
      <p class="text-[11px] text-gray-500">仅空支部可整体替换：下载「成员名册模板(JSON)」→ 保留要迁入本支部的成员行、删去其余 → 「选择名册文件」导入：净化后先核对下方统计卡，确认后一次落库——成员/应到统计即时更新。有成员/历史的支部不可整表替换，成员调整由本支部组织委员在「成员名册」逐人维护。</p>
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" class="text-xs px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors" data-branch-roster-act="download" data-branch-id="${esc(bid)}">下载名册模板</button>
        <button type="button" class="text-xs px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors" data-branch-roster-act="pick" data-branch-id="${esc(bid)}">选择名册文件(JSON)…</button>
        <span class="text-[11px] text-gray-400">${_rosterDrafts.has(bid) ? `已载入草稿（${esc(_rosterDrafts.get(bid).fileName || '')}）` : '未选择文件'}</span>
      </div>
      ${_rosterDraftHtml(bid)}
    </div>`;
}

/** 统计单格（label + 主读数 + 副注）——风格与换组织向导预览卡一致 */
function _rosterStatBox(label, main, sub) {
  return `<div class="rounded-lg border border-blue-100 bg-white p-2.5">
    <p class="text-[11px] text-gray-400">${esc(label)}</p>
    <p class="text-base font-bold text-gray-800 leading-tight">${main}</p>
    ${sub ? `<p class="text-[10px] text-gray-400 mt-0.5">${esc(sub)}</p>` : ''}
  </div>`;
}

/** 导入草稿（净化通过、未落库）统计卡：在册/正式预备/滞留/支部大会应到/各党小组应到 */
function _rosterDraftHtml(branchId) {
  const d = _rosterDrafts.get(branchId);
  if (!d) return '';
  const s = d.stats;
  const groupParts = Object.entries(s.perGroup || {}).map(([g, v]) =>
    `<span class="whitespace-nowrap">${esc(g)} <b class="text-gray-800">${v.expected}</b><span class="text-[10px] text-gray-400"> / 在册 ${v.partyTotal}</span></span>`).join(' · ');
  return `
    <div class="rounded-lg border border-green-200 bg-white p-3 space-y-2">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-xs font-semibold text-gray-700">导入预览 · 确认前统计</p>
        <span class="text-[11px] text-gray-400">${esc(d.fileName || '名册文件')} · 有效 ${d.people.length} 条${d.dropped ? ` · 已忽略 ${d.dropped} 条（不在现有成员档案/姓名为空）` : ''}</span>
      </div>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-2">
        ${_rosterStatBox('在册党员（应到基数）', `${s.partyTotal}<span class="text-xs font-normal text-gray-400"> 人</span>`, `正式 ${s.official} + 预备 ${s.probationary}`)}
        ${_rosterStatBox('滞留党员（剔除）', `${s.detained}<span class="text-xs font-normal text-gray-400"> 人</span>`, '组织关系保留、通知照发')}
        ${_rosterStatBox('支部党员大会应到', `<span class="text-red-600">${s.expected}</span><span class="text-xs font-normal text-gray-400"> 人</span>`, `= 党员 ${s.partyTotal} − 滞留 ${s.detained}`)}
        ${_rosterStatBox('各党小组会应到', groupParts || '—', '组内党员 − 组内滞留')}
      </div>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-[11px] text-gray-500">确认导入后：上述成员整体成为本支部成员（原属支部相应减员），成员名册与应到统计即时落库；「放弃」不写入。</p>
        <div class="flex gap-2">
          <button type="button" class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white transition-colors" data-branch-roster-act="discard" data-branch-id="${esc(branchId)}">放弃</button>
          <button type="button" class="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90" style="background:#C8102E;" data-branch-roster-act="confirm" data-branch-id="${esc(branchId)}">确认导入落库</button>
        </div>
      </div>
    </div>`;
}

/** 容器级委托监听（重挂前先摘，避免 renderContent 多次调用叠加 handler） */
function _bindRosterDelegation(el) {
  el.removeEventListener('click', _onRosterClick);
  el.removeEventListener('change', _onRosterFileChange);
  el.addEventListener('click', _onRosterClick);
  el.addEventListener('change', _onRosterFileChange);
}

function _onRosterClick(e) {
  const btn = e.target && e.target.closest ? e.target.closest('[data-branch-roster-act]') : null;
  if (!btn) return;
  const act = btn.getAttribute('data-branch-roster-act');
  const branchId = btn.getAttribute('data-branch-id');
  if (!branchId) return;
  if (act === 'toggle') {
    _rosterOpenBranch = _rosterOpenBranch === branchId ? null : branchId;
    renderContent();
  } else if (act === 'download') {
    _downloadRosterTemplate(branchId);
  } else if (act === 'pick') {
    _rosterInputBranch = branchId;
    const fi = document.getElementById('branch-roster-file');
    if (fi) fi.click();
  } else if (act === 'discard') {
    _rosterDrafts.delete(branchId);
    renderContent();
  } else if (act === 'confirm') {
    _confirmRosterImport(branchId);
  }
}

/** 下载「空支部成员名册模板」JSON（行内容复用 org-base-data-preview buildPreviewTemplate） */
function _downloadRosterTemplate(branchId) {
  try {
    const tpl = buildBranchRosterTemplate();
    if (!tpl.people || !tpl.people.length) {
      showToast('info', '当前成员档案为空，无成员可导出为名册模板');
      return;
    }
    const blob = new Blob([JSON.stringify(tpl, null, 2)], { type: 'application/json;charset=utf-8' });
    downloadBlob(`${branchId}-成员名册模板.json`, blob);
    showToast('success', `成员名册模板已下载（${tpl.people.length} 行现有成员：保留迁入本支部的行、删去其余后导入）`);
  } catch (err) {
    console.error('[branches] 下载成员名册模板失败', err);
    showToast('error', `下载失败：${(err && err.message) || err}`);
  }
}

function _onRosterFileChange(e) {
  const input = e.target;
  if (!input || input.id !== 'branch-roster-file') return;
  const file = input.files && input.files[0];
  input.value = ''; // 清空选择 → 同一文件可再次导入（草稿在未落库前可重复替换）
  const branchId = _rosterInputBranch;
  _rosterInputBranch = null;
  if (!file || !branchId) return;
  _readRosterFile(file, branchId);
}

/** 读文件 → 包级门槛（JSON 解析/kind/version）→ sanitizeBranchRoster 净化 → 存草稿并展示统计卡 */
function _readRosterFile(file, branchId) {
  const reader = new FileReader();
  reader.onerror = () => showToast('error', '读取名册文件失败，请重试');
  reader.onload = () => {
    let data;
    try {
      data = JSON.parse(String(reader.result || ''));
    } catch (_) {
      showToast('error', '名册文件解析失败：不是有效的 JSON（应为「下载名册模板」得到的文件，或 { people:[…] } 结构）');
      return;
    }
    const res = sanitizeBranchRoster(data);
    if (!res.valid) {
      showToast('error', res.reason || '名单净化未通过');
      return;
    }
    _rosterDrafts.set(branchId, {
      people: res.people, stats: res.stats, dropped: res.dropped, fileName: file.name,
    });
    renderContent();
    const note = res.dropped ? `，已忽略 ${res.dropped} 条（不在现有成员档案/姓名为空）` : '';
    showToast('success', `已读取 ${res.people.length} 条有效成员${note}——请核对统计卡后确认导入`);
  };
  reader.readAsText(file);
}

/** 确认导入落库：仅空支部（UI 产品门槛）→ PersonStore.replaceBranchMembers（双形态）→ 统计即时可见 */
async function _confirmRosterImport(branchId) {
  const draft = _rosterDrafts.get(branchId);
  if (!draft || !draft.people || !draft.people.length) return;
  const branch = (mockDB.branches || []).find(x => x.id === branchId);
  const label = branch?.config?.headerTitle || branch?.name || branchId;
  // 产品门槛（书记口径：仅空支部可整体替换）——导入后该支部已有成员 → 不提供二次整表覆盖
  if (PersonStore.getMembers().some(p => p.branchId === branchId)) {
    _rosterDrafts.delete(branchId);
    showToast('error', '该支部已有成员，不再提供整表替换——成员调整请逐人编辑（成员档案）');
    renderContent();
    return;
  }
  const res = await PersonStore.replaceBranchMembers(draft.people, { branchId, by: _actorId() });
  if (!res || !res.ok) {
    showToast('error', `导入未落库：${(res && res.reason) || '未知原因'}`);
    return;
  }
  const after = getRosterStats({ branchId }); // mock 读链即时吃到覆盖层
  _rosterDrafts.delete(branchId);
  _rosterOpenBranch = null;
  showToast('success', `已导入 ${res.count} 名成员到「${label}」——在册党员 ${after.partyTotal} · 支部党员大会应到 ${after.expected} 人（统计已即时更新）`);
  renderContent();
}
