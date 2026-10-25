// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  组织委员工作台 Tab：成员流动（2026-09-28 批次 220 · R10 从「成员名册」拆出的独立 tab）
// ════════════════════════════════════════════════════════════════
//  拆分判据（一 tab 一问：「混装 ⇒ 拆独立 tab 或折叠」；原 MODULE_UI_DESIGN.md §四 规划稿已清出，出处见 .ctx/logs/archive/2026-09-DECISION_LOG.md）：
//   · 「成员名册」答「支部在册成员有谁、档案状态如何」；  本 tab 答「成员怎么变（流入 / 流出）」——
//     原二者同装「成员名册」tab，属两个语义域混装。拆后：名册只留在册名单与档案编辑；
//     本 tab 承原「成员流动」面板全部功能（登记流入 / 登记流出 / 对账行 / 台账表 / 撤销），内部逻辑原样搬移。
//   · 「成员名册」行内「移出」按钮**仍在名册 tab**（那是名册自己的行操作，原样保留）；移出即登记流出，
//     其台账留痕 / 撤销在本 tab（原提示句「可随时在『成员流动』台账撤销纠正」指向此）。
//  口径（沿用原「成员流动」面板，2026-09-14 批次 25 支书裁定）：登记即生效；台账只增不删，
//   登错由「撤销」留痕（revokedAt/revokedBy）+ 回滚在册状态。
//  硬规范：台账筛选/分页统一走检索引擎 components/ui/list-filter.js（关键词：姓名/学号/经手人；
//   方向分面：流入/流出；筛选行禁 chip）；选人硬规范：登记流出一律用 PersonPicker（禁 select 罗列人名）；
//   登记者角色门 = canRegisterFlow（组织委员 + 支书/副支书）。
// ════════════════════════════════════════════════════════════════

import { DEFAULT_BRANCH_ID, DEVELOP_STAGES } from '../../../core/domain/constants.js?v=20261025a';
import { AuthStore, currentUserId } from '../../../services/core/auth.js?v=20261025a';
import { getBranchIdOfPerson } from '../../../services/branch/branch.js?v=20261025a';
import { getPersonName } from '../../../services/member/person.js?v=20261025a';
// 党小组常态清单唯一来源（活组、按 seq 升序；新增/改名/解散后随渲染即时可见）——登记流入的「党小组」选项
import { groupOptions } from '../../../services/member/party-group.js?v=20261025a';
import { showToast, escHtml as esc, getBasePath, todayLocal } from '../../../core/base/utils.js?v=20261025a';
import { getAuthToken, getApiBaseUrl } from '../../../data/data-adapter.js?v=20261025a';
import { openModal, closeModal } from '../../../components/ui/modal.js?v=20261025a';
// 统一检索引擎（表格统一化批次 A）：台账表接入关键词 + 分面（≤8 行引擎自动不渲染检索条）
import { renderFilteredList } from '../../../components/ui/list-filter.js?v=20261025a';
import { renderTabHeader, renderCardHeader } from '../../../components/shell/page-frame.js?v=20261025a';
// 成员流入/流出登记服务层（2026-09-14 批次 25 支书裁定）：登记即生效 + 台账 + 对账 + 撤销
import {
  loadMemberFlows, reconcile, registerIntake, registerIntakeBatch,
  registerOutflow, revokeFlow, canRegisterFlow,
} from '../../../services/member/member-flow.js?v=20261025a';
// 选人规范：凡选择具体人一律 PersonPicker（禁 select 罗列人名）——登记流出选人
import { PersonPicker } from '../../../components/governance/pickers.js?v=20261025a';
// 自定义圆角下拉增强（select.input-flat.text-xs → cs-trigger；与全局 observer 幂等）
import { enhanceSelects } from '../../../components/ui/custom-select.js?v=20261025a';

// 模块级 ctx 缓存：登记/撤销后整页刷新复用首次渲染的 accent
let _ctx = null;

/** 登记流出弹窗的 PersonPicker 实例（提交/取消时销毁，防浮层泄漏） */
let _outflowPicker = null;

/** 操作人（审计/留痕 updatedBy；P1-11：失效会话 → null，禁止回落组织委员 p11） */
function _actorId() {
  return currentUserId();
}

/** 写口取操作人：无登录人 → 提示重新登录并拒绝写入 */
function _requireActor() {
  const id = _actorId();
  if (!id) showToast('error', '登录态已失效，请重新登录');
  return id;
}

/** 操作人角色（成员流动登记权限门 canRegisterFlow 入参） */
function _actorRole() {
  return AuthStore.getCurrentUser()?.role || null;
}

/** 当前操作人所属支部 id（台账/对账/登记同支部口径；无档案兜底 br-b1，与数据层缺省一致） */
function _branchId() {
  return getBranchIdOfPerson(_actorId());
}

// ════════════════════════════════════════════════════════════════
//  渲染入口
// ════════════════════════════════════════════════════════════════

export function renderContent(ctx) {
  _ctx = ctx || _ctx;
  // 2026-09-29 批次 281：容器由**调用方**给 —— 本组件现同时挂在**组织台与支书台**两处
  //   （支书/副支书**本来就有登记权**〔`MEMBER_FLOWS` / `MEMBER_FLOW_ROLES`〕，但身份门把他们
  //   从组织台弹回支书台 ⇒ 此前**进不去这页**）；缺省回落组织台容器 ⇒ 既有调用**零影响**。
  //   容器 id 由 `components/shell/tab-bar.js` 按 `${prefix}-tab-content` 派生。
  const container = ctx?.container || document.getElementById('org-tab-content');
  if (!container) return;
  const canRegister = canRegisterFlow(_actorRole());

  container.innerHTML = `
    ${renderTabHeader({ title: '成员流动', description: '流入 / 流出登记与对账台账。' })}
    <div class="space-y-4">
      ${_iaaaPendingCardHtml()}
      ${_flowCardHtml(canRegister)}
    </div>
  `;

  // ── 待确认入站（IAAA 自助建号 → 选支部 → 支部确认；批次 278）──
  container.querySelector('#iaaa-pending-card')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.iaaa-approve, .iaaa-reject');
    if (!btn) return;
    _decideIaaaPending(btn.dataset.person, btn.classList.contains('iaaa-approve') ? 'approve' : 'reject');
  });
  _loadIaaaPending();

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
      ${renderCardHeader({
        title: '流动台账',
        meta: '流入 / 流出',
        actions: canRegister ? `
          <button id="flow-intake-btn" type="button" class="btn-accent-soft text-xs px-3 py-1.5 whitespace-nowrap" style="cursor:pointer;">＋ 登记流入</button>
          <button id="flow-outflow-btn" type="button" class="btn-danger text-xs px-3 py-1.5 whitespace-nowrap" style="cursor:pointer;">登记流出</button>` : '<span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">只读</span>',
      })}
      <div id="flow-reconcile-host" class="mb-3"></div>
      <div class="overflow-x-auto" id="flow-table-host"></div>
    </div>`;
}

// ════════════════════════════════════════════════════════════════
//  待确认入站（2026-09-29 批次 278）——IAAA 入站链的**界面闭环**
//  链：统一身份认证认人 → 无号自动建号（`branchId: null`）→ 本人选支部（写 `joinIntent`）
//      → **支部确认**（本卡：确认入站 / 驳回）→ 落 `branchId` 后该人方可进工作台。
//  契约单一源＝`server/routes/iaaa.js`（守卫 `iaaa-onboarding` T1–T8 ＋ 真机 `iaaa-ui-onboarding`）。
//  ⚠ 只读 / 只写**服务端**：本地演示形态无 token ⇒ 直接说明「需接入统一身份认证后方有」。
// ════════════════════════════════════════════════════════════════

/** 「待确认入站」卡片骨架（条目由 `_loadIaaaPending` 填充） */
function _iaaaPendingCardHtml() {
  return `
    <div class="card rounded-xl p-4" id="iaaa-pending-card">
      ${renderCardHeader({ title: '待确认入站', meta: '统一身份认证新建且已选本支部的申请' })}
      <div id="iaaa-pending-host"></div>
    </div>`;
}

/** 载入待确认清单（非确认人 403 ⇒ 中性说明；无 token ⇒ 本地演示说明） */
async function _loadIaaaPending() {
  const host = document.getElementById('iaaa-pending-host');
  if (!host) return;
  const token = getAuthToken();
  if (!token) { host.innerHTML = '<p class="text-xs text-gray-500">本地浏览形态无入站申请；接入统一身份认证后在此确认。</p>'; return; }
  host.innerHTML = '<p class="text-xs text-gray-500">正在加载…</p>';
  try {
    const r = await fetch(`${getApiBaseUrl()}/api/v1/auth/iaaa/pending`, { headers: { Authorization: `Bearer ${token}` } });
    if (r.status === 403) { host.innerHTML = '<p class="text-xs text-gray-500">仅支书 / 副支书 / 组织委员可确认入站。</p>'; return; }
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const rows = await r.json();
    if (!Array.isArray(rows) || !rows.length) { host.innerHTML = '<p class="text-xs text-gray-500">暂无待确认的入站申请。</p>'; return; }
    host.innerHTML = `<div class="space-y-2">${rows.map((u) => `
      <div class="flex items-center justify-between flex-wrap gap-2 text-xs border border-gray-200 rounded-lg px-3 py-2">
        <span class="text-gray-700">${esc(u.name)} <span class="text-gray-500">${esc(u.studentId || '')}</span></span>
        <span class="flex items-center gap-2">
          <button type="button" class="btn-accent-soft iaaa-approve text-xs px-3 py-1.5" data-person="${esc(u.personId)}" style="cursor:pointer;">确认入站</button>
          <button type="button" class="btn-danger iaaa-reject text-xs px-3 py-1.5" data-person="${esc(u.personId)}" style="cursor:pointer;">驳回</button>
        </span>
      </div>`).join('')}</div>`;
  } catch (e) {
    host.innerHTML = `<p class="text-xs text-red-600">待确认清单加载失败：${esc(e && e.message ? e.message : '')}</p>`;
  }
}

/** 确认 / 驳回（服务端留痕走既有 `auth_audit`；成功后刷新清单） */
async function _decideIaaaPending(personId, verb) {
  const token = getAuthToken();
  if (!token) return;
  try {
    const r = await fetch(`${getApiBaseUrl()}/api/v1/auth/iaaa/pending/${encodeURIComponent(personId)}/${verb}`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    });
    const j = await r.json().catch(() => null);
    if (!r.ok) throw new Error((j && j.error) || ('HTTP ' + r.status));
    showToast('success', verb === 'approve' ? '已确认入站' : '已驳回');
    _loadIaaaPending();
  } catch (e) {
    showToast('error', '处理失败：' + (e && e.message ? e.message : ''));
  }
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
  // R7-08：学号 / 届别 / 备注是登记快照（无改写入口）——空值标注快照语义，整列全空则不渲染该列。
  const SNAPSHOT_TITLE = '登记时未采集（登记快照）';
  const colHasValue = (key) => flows.some((f) => String(f[key] == null ? '' : f[key]).trim());
  const showCols = {
    studentId: colHasValue('studentId'),
    enrollYear: colHasValue('enrollYear'),
    note: colHasValue('note'),
  };
  const heads = ['<th>类型</th>', '<th>姓名</th>',
    showCols.studentId ? '<th>学号</th>' : '', showCols.enrollYear ? '<th>届别</th>' : '',
    '<th>日期</th>', '<th>经手人</th>', showCols.note ? '<th>备注</th>' : '', '<th>操作</th>'].filter(Boolean).join('');
  renderFilteredList(tableHost, {
    stateKey: 'org-member-flow-table',
    rows: flows,
    keyword: {
      keys: ['name', 'studentId', 'by'],
      placeholder: '搜索姓名 / 学号 / 经手人…',
      get: (f, k) => (k === 'by' ? (getPersonName(f.by) || f.by) : f[k]),
    },
    facets: [{ key: 'direction', label: '方向', options: [{ value: 'in', label: '流入' }, { value: 'out', label: '流出' }] }],
    facetStyle: 'chip',
    countUnit: '条',
    table: {
      headHtml: `<tr>${heads}</tr>`,
      colSpan: 5 + [showCols.studentId, showCols.enrollYear, showCols.note].filter(Boolean).length,
      responsive: true,
    },
    emptyMessage: flows.length ? '无匹配台账记录' : '暂无台账记录（撤销后重新登记是唯一更正路径）',
    rowHtml: (f) => _flowRowHtml(f, showCols, SNAPSHOT_TITLE),
  });
}

/** 台账单行（已撤销行中性灰显示「已撤销」并保留在表中留痕） */
function _flowRowHtml(f, showCols, snapshotTitle) {
  const revoked = !!f.revokedAt;
  const inDir = f.direction === 'in';
  const tdc = revoked ? 'text-gray-400' : 'text-gray-700';
  const operator = f.by ? (getPersonName(f.by) || f.by) : '—';
  return `
    <tr>
      <td class="${revoked ? 'text-gray-400' : (inDir ? 'text-sky-700' : 'text-red-700')}" data-label="类型">${inDir ? '流入' : '流出'}</td>
      <td class="${tdc}" data-label="姓名">${esc(f.name || '—')}</td>
      ${showCols.studentId ? `<td class="${tdc}" data-label="学号"${f.studentId ? '' : ` title="${snapshotTitle}"`}>${esc(f.studentId || '—')}</td>` : ''}
      ${showCols.enrollYear ? `<td class="${tdc}" data-label="届别"${f.enrollYear ? '' : ` title="${snapshotTitle}"`}>${esc(f.enrollYear || '—')}</td>` : ''}
      <td class="${tdc}" data-label="日期">${esc(f.date || '—')}</td>
      <td class="${tdc}" data-label="经手人">${esc(operator)}</td>
      ${showCols.note ? `<td class="${tdc}" data-label="备注" title="${esc(f.note || snapshotTitle)}">${esc(f.note || '—')}</td>` : ''}
      <td data-label="操作">${revoked
        ? `<span class="text-gray-400" title="已于 ${esc(String(f.revokedAt).slice(0, 10))} 撤销">已撤销</span>`
        : `<button type="button" class="flow-revoke btn-action btn-action-gray" data-flow-id="${esc(f.id)}" style="cursor:pointer;">撤销</button>`}</td>
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
  const accent = _ctx?.accent || 'var(--accent-blue)';
  const groupOpts = ['<option value="">未分组</option>', ...groupOptions().map(g => `<option value="${esc(g)}">${esc(g)}</option>`)].join('');
  // A01：发展阶段必选（枚举单一源 = core/domain/constants.js::DEVELOP_STAGES）——
  //   空阶段会让成员静默落在应到 / 表决名单之外，故在登记表单即收口。
  const stageOpts = ['<option value="">请选择发展阶段</option>', ...DEVELOP_STAGES.map(s => `<option value="${esc(s)}">${esc(s)}</option>`)].join('');
  const inputStyle = 'color:var(--neutral-700);';
  const labelStyle = 'display:block;font-weight:500;color:var(--neutral-700);margin-bottom:4px;';
  const MODE_ON = 'btn-tab active text-xs px-3 py-1.5';
  const MODE_OFF = 'btn-tab text-xs px-3 py-1.5';
  openModal({
    id: 'flow-intake',
    title: '登记流入',
    accentColor: accent,
    // 浮窗页脚「设置」入口（2026-09-21 批次 138）：本浮窗管的是成员在册 / 流动，与设置里组织委员
    // 那一域的职责参数（学期末滞留集中复核窗口）同域，就地给一条去该分区的入口（modal.js 单一源）。
    settingsLink: { href: `${getBasePath()}settings.html#domain-org`, text: '制度参数 →' },
    bodyHtml: `
      <div class="flex items-center gap-2 mb-4">
        <button type="button" data-intake-mode="single" class="btn-tab ${MODE_ON}" style="cursor:pointer;">单人登记</button>
        <button type="button" data-intake-mode="batch" class="btn-tab ${MODE_OFF}" style="cursor:pointer;">粘贴多行</button>
      </div>
      <div data-intake-pane="single">
        <div style="margin-bottom:14px;">
          <label for="flow-intake-name" class="text-body-sm" style="${labelStyle}">姓名 <span style="color:var(--functional-error);">*</span></label>
          <input id="flow-intake-name" data-intake="name" type="text" class="input-flat-sm w-full" placeholder="成员姓名（必填）" style="${inputStyle}">
        </div>
        <div style="margin-bottom:14px;">
          <label for="flow-intake-student-id" class="text-body-sm" style="${labelStyle}">学号 <span style="color:var(--functional-error);">*</span></label>
          <input id="flow-intake-student-id" data-intake="studentId" type="text" class="input-flat-sm w-full" placeholder="学号（账号由此派生，必填）" style="${inputStyle}">
        </div>
        <div style="margin-bottom:14px;">
          <label for="flow-intake-enroll-year" class="text-body-sm" style="${labelStyle}">届别</label>
          <input id="flow-intake-enroll-year" data-intake="enrollYear" type="text" class="input-flat-sm w-full" placeholder="入学年份 / 届别（如 2026）" style="${inputStyle}">
        </div>
        <div style="margin-bottom:14px;">
          <label for="flow-intake-party-group" class="text-body-sm" style="${labelStyle}">党小组</label>
          <select id="flow-intake-party-group" data-intake="partyGroup" class="input-flat w-full">${groupOpts}</select>
        </div>
        <div style="margin-bottom:14px;">
          <label for="flow-intake-develop-stage" class="text-body-sm" style="${labelStyle}">发展阶段 <span style="color:var(--functional-error);">*</span></label>
          <select id="flow-intake-develop-stage" data-intake="developStage" required aria-required="true" class="input-flat w-full">${stageOpts}</select>
        </div>
        <div style="margin-bottom:14px;">
          <label for="flow-intake-note" class="text-body-sm" style="${labelStyle}">备注（选填）</label>
          <input id="flow-intake-note" data-intake="note" type="text" class="input-flat-sm w-full" placeholder="如：转入原因 / 原支部" style="${inputStyle}">
        </div>
      </div>
      <div data-intake-pane="batch" class="hidden">
        <label for="flow-intake-text" class="text-body-sm" style="${labelStyle}">粘贴多行</label>
        <textarea id="flow-intake-text" data-intake="text" rows="6" class="input-flat w-full" placeholder="一行一人：姓名、学号、届别、党小组、备注、发展阶段（Tab 或逗号分隔；第 6 列发展阶段必填）" style="${inputStyle}resize:vertical;"></textarea>
      </div>
      <div data-intake-errors class="hidden mt-3 text-xs text-red-700"></div>`,
    // 动作固定在 sticky footer（R3-10）
    footerHtml: `
      <button type="button" data-intake-cancel class="btn-outline text-sm px-4 py-1.5" style="cursor:pointer;">取消</button>
      <button type="button" data-intake-submit class="btn-accent text-sm px-4 py-1.5 font-medium">登记</button>`,
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
        const by = _requireActor();
        if (!by) return;
        const role = _actorRole();
        const branchId = _branchId();
        if (mode === 'single') {
          const val = (k) => panel.querySelector(`[data-intake="${k}"]`).value;
          const r = await registerIntake({
            name: val('name'), studentId: val('studentId'),
            enrollYear: val('enrollYear'), partyGroup: val('partyGroup'),
            developStage: val('developStage'), note: val('note'),
            by, role, branchId,
          });
          if (r.ok) {
            showToast('success', `已登记流入「${(r.person && r.person.name) || val('name')}」，自动建号并记入台账`);
            closeModal('flow-intake');
            renderContent(_ctx); // 台账 + 对账行联动刷新
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
  const accent = _ctx?.accent || 'var(--accent-blue)';
  const branchId = _branchId();
  const today = todayLocal();
  const inputStyle = 'color:var(--neutral-700);';
  const labelStyle = 'display:block;font-weight:500;color:var(--neutral-700);margin-bottom:4px;';
  openModal({
    id: 'flow-outflow',
    title: '登记流出',
    accentColor: accent,
    bodyHtml: `
      <p class="text-xs text-gray-500 mb-2">选择流出人员（可多选）。移出后账号停用，原考勤与考察历史保留。</p>
      <div id="flow-outflow-picker" class="mb-3"></div>
      <div style="margin-bottom:14px;">
        <label class="text-body-sm" style="${labelStyle}">流出日期</label>
        <input data-outflow="date" type="date" class="input-flat w-full" value="${today}" style="${inputStyle}">
      </div>
      <div style="margin-bottom:14px;">
        <label class="text-body-sm" style="${labelStyle}">备注</label>
        <input data-outflow="note" type="text" class="input-flat-sm w-full" placeholder="去向 / 原因（如 毕业转出）" style="${inputStyle}">
      </div>
      <div data-outflow-errors class="hidden mt-3 text-xs text-red-700"></div>`,
    // 动作固定在 sticky footer（R3-10）；取消 / Esc / 遮罩都销毁选人器
    footerHtml: `
      <button type="button" data-outflow-cancel class="btn-outline text-sm px-4 py-1.5" style="cursor:pointer;">取消</button>
      <button type="button" data-outflow-submit class="btn-accent text-sm px-4 py-1.5 font-medium">登记流出</button>`,
    onCancel: () => { if (_outflowPicker) { _outflowPicker.destroy(); _outflowPicker = null; } },
    onMount: (panel) => {
      const errEl = panel.querySelector('[data-outflow-errors]');
      const showErr = (html) => { errEl.innerHTML = html; errEl.classList.toggle('hidden', !html); };
      // 选人硬规范：PersonPicker 多选（禁 select 罗列人名）；候选 = 本支部在册成员
      _outflowPicker = new PersonPicker({
        mode: 'multi',
        placeholder: '选择流出人员（可多选）',
        accentColor: accent,
        filter: (p) => (p.branchId || DEFAULT_BRANCH_ID) === branchId,
        onSelect: () => {},
      });
      _outflowPicker.render(panel.querySelector('#flow-outflow-picker'));
      panel.querySelector('[data-outflow-cancel]')?.addEventListener('click', _closeOutflow);
      panel.querySelector('[data-outflow-submit]')?.addEventListener('click', async () => {
        const ids = _outflowPicker ? _outflowPicker.getSelected() : [];
        if (!ids.length) { showErr('<p>请至少选择一名流出人员</p>'); return; }
        const date = panel.querySelector('[data-outflow="date"]').value;
        const note = panel.querySelector('[data-outflow="note"]').value;
        const by = _requireActor();
        if (!by) return;
        const r = await registerOutflow({ personIds: ids, date, note, by, role: _actorRole(), branchId });
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
    accentColor: 'var(--functional-error)',
    bodyHtml: `
      <p class="text-sm text-gray-700 mb-2">确认撤销「${esc(who)}」的这条${inDir ? '流入' : '流出'}记录？</p>
      <p class="text-xs text-gray-500 mb-4">撤销保留台账留痕（该行标注「已撤销」），并回滚成员在册状态与账号：${inDir
        ? '撤销流入 → 该成员移出名册、账号停用'
        : '撤销流出 → 该成员恢复在册、账号恢复'}。</p>`,
    // 动作固定在 sticky footer（R3-10）
    footerHtml: `
      <button type="button" data-flow-revoke-cancel class="btn-outline text-sm px-4 py-1.5" style="cursor:pointer;">取消</button>
      <button type="button" data-flow-revoke-ok class="btn-danger-solid text-sm px-4 py-1.5">确认撤销</button>`,
    onMount: (panel) => {
      panel.querySelector('[data-flow-revoke-cancel]')?.addEventListener('click', () => closeModal('flow-revoke-confirm'));
      panel.querySelector('[data-flow-revoke-ok]')?.addEventListener('click', async () => {
        closeModal('flow-revoke-confirm');
        const by = _requireActor();
        if (!by) return;
        const r = await revokeFlow({ flowId, by, role: _actorRole() });
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
