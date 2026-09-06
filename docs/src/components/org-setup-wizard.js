// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  components/org-setup-wizard.js — 换组织向导共享渲染器（阶段一，2026-09-06 书记 R1–R4）
// ════════════════════════════════════════════════════════════════
// 定位：5 步引导式「支部配置」升级版——吸收合并原党委台 party-config（裸开关清单）：
//   ① 组织信息（支部名/页眉名/自述/主题预设）  ② 模块/块组合（原 party-config 主体原样搬入）
//   ③ 角色分工（workforce 模块负责人归属）     ④ 术语制度指引 + 换壳工作单（md 下载）
//   ⑤ 验证与重置（roster stats / ?reset=1 / npm test）+ 完成报告（摘要/下载/重走）
// 挂载点：party-config-tab 内容区 + wizard.html 独立页共用；样式沿用 card/input-flat/chip 体系。
// 权限双轨（书记 R4）：party-staff = 任意支部（canSwitchBranch）；本支部现任书记 = 固定本支部；
//   其它角色/非现任 → 无权限卡。写口全走 branch 服务既有校验语义（config 写口 = party-staff/现任书记）。
// 留痕：每次保存即时写入 branch.config.configChangeHistory（by/at/what/from/to，见 services/branch.js）。
// 草稿：localStorage `wizard-draft-<branchId>`（当前步 + 每步完成标记 + 完成态），中断可续走。
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../core/domain.js?v=20260903c';
import { getCapabilities } from '../core/registry.js?v=20260903c';
import { OUTPUT_BLOCK_DEFS, BRANCH_COMMISSION_ROLES, ROLE_LABELS, getAccentColors } from '../core/constants.js?v=20260903c';
// 副作用：注册支委层工作台能力（配置目录=其 tab 清单，单一源）
import '../modules/capabilities/secretary-workspace.js?v=20260903c';
import { BLOCK_MANIFESTS } from '../workflow/blocks/manifests.js?v=20260903c';
import { escHtml as esc, showToast, downloadBlob } from '../core/utils.js?v=20260903c';
import { WORK_MAP_MODULES } from '../core/work-map.js?v=20260903c';
import {
  getBranchById, getBranchOrg, getBranchTabPolicy, getCoreTabIds,
  getBranchOutputBlocks, getOutputBlockPolicy, getWorkflowBlockPolicy,
  updateBranchModules, getBranchWorkforce, updateBranchWorkforce, updateBranchOrg,
  applyConfigCopy,
} from '../services/branch.js?v=20260903c';
import { buildConfigPackage, applyConfigPackage } from '../services/org-config-package.js?v=20260903c';
import {
  buildPreviewTemplate, sanitizePreview, applyPreview, clearPreview, getPreviewState,
  PREVIEW_KIND, PREVIEW_VERSION,
} from '../services/org-base-data-preview.js?v=20260903c';
import { getRosterStats } from '../services/roster.js?v=20260903c';
import { buildOrgWizardReport } from '../services/org-wizard-report.js?v=20260903c';
import { getPersonName } from '../services/person.js?v=20260903c';

// ── 步骤元信息（书记已批口径）────────────────────────────────────
export const WIZARD_STEPS = [
  { id: 1, label: '组织信息' },
  { id: 2, label: '模块/块组合' },
  { id: 3, label: '角色分工' },
  { id: 4, label: '术语制度指引+工作单' },
  { id: 5, label: '验证与重置' },
];

// ── 主题预设（仅「可调令牌」= 角色识别层强调色 --app-accent 三件套，COLOR_SYSTEM §2.3.2/§2.8）──
// 党建红 party-red（#CE1126）与党徽金 party-gold（#FFD700）为固定合规底线 → 不提供任何预设/更改；
// 预设取既有角色识别色系（accent 色相），id 与 core/config-clean THEME_PRESET_IDS 白名单一致。
export const THEME_PRESETS = [
  { id: 'red',   name: '党建红调', accentRole: 'secretary',        note: '角色识别层红（贴近固定党建红，最稳）' },
  { id: 'green', name: '翠绿',     accentRole: 'leader',           note: '执行层翠绿系' },
  { id: 'sky',   name: '天蓝',     accentRole: 'org-commissioner', note: '组织线天蓝系' },
  { id: 'blue',  name: '海蓝',     accentRole: 'prop-commissioner', note: '宣传线海蓝系' },
];

// 固定令牌展示（只读说明，不作为可选预设）
const FIXED_THEME_TOKENS = [
  { name: '党建红 party-red', hex: '#CE1126' },
  { name: '党徽金 party-gold', hex: '#FFD700' },
];

/** 取预设定义（id 缺省回退首个=红调） */
function _presetOf(id) {
  return THEME_PRESETS.find(p => p.id === id) || THEME_PRESETS[0];
}

/** 预设三件套（渲染/运行时写 CSS 变量用） */
function _presetAccent(presetId) {
  const p = _presetOf(presetId);
  return { ...getAccentColors(p.accentRole), preset: p };
}

/**
 * 应用主题预设：运行时写 :root CSS 变量（仅可调令牌集 = --app-accent 三件套）；
 * 固定令牌（--party-red/--party-gold 等品牌统一层/状态层/中性层）不动。
 * @param {string} presetId
 */
export function applyThemePreset(presetId) {
  if (typeof document === 'undefined') return;
  const { accent, accentRgba, accentBorder } = _presetAccent(presetId);
  const root = document.documentElement;
  root.style.setProperty('--app-accent', accent);
  root.style.setProperty('--app-accent-bg', accentRgba);
  root.style.setProperty('--app-accent-border', accentBorder);
}

// ── 草稿（localStorage，按支部一份）─────────────────────────────
const DRAFT_PREFIX = 'wizard-draft-';
function _draftKey(branchId) { return DRAFT_PREFIX + branchId; }
function _readDraft(branchId) {
  try {
    const raw = localStorage.getItem(_draftKey(branchId));
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}
function _writeDraft(branchId, data) {
  try { localStorage.setItem(_draftKey(branchId), JSON.stringify({ ...data, updatedAt: new Date().toISOString() })); } catch (_) { /* 存储不可用静默 */ }
}
function _clearDraft(branchId) {
  try { localStorage.removeItem(_draftKey(branchId)); } catch (_) { /* 忽略 */ }
}

// ── 支部业务 tab 目录（同 party-config 原 _branchTabs）───────────
function _branchTabs() {
  const cap = getCapabilities({ scope: 'workspace:secretary' }).find(c => c.id === 'secretary-workspace');
  return cap && typeof cap.tabs === 'function' ? cap.tabs() : [];
}

/** 由角色键取显示名（workforce owner 文本；到人位取姓名） */
function _ownerLabel(assign) {
  if (!assign) return '未分工';
  if (assign.ownerType === 'person') return getPersonName(assign.ownerId) || assign.ownerId;
  return ROLE_LABELS[assign.ownerId] || assign.ownerId;
}

/** 工作流块供应来源标签（搬自 party-config） */
const PROV_LABEL = { 'institution-common': '通用制度', 'branch-custom': '支部自创' };

/**
 * 挂载换组织向导
 * @param {HTMLElement} host 内容容器（party-config 内容区 / wizard.html 主体）
 * @param {Object} opts
 * @param {{ personId: string, role: string }} opts.actor 当前登录用户
 * @param {boolean} [opts.canSwitchBranch] 是否可在支部间切换（party-staff）
 * @param {string} [opts.branchId] 初始目标支部（canSwitch=false 时必填 = 现任书记自己的支部）
 * @param {boolean} [opts.embed] 是否内嵌到既有工作台 tab（party-config；true 时头部用卡片紧凑样式）
 */
export function mountOrgSetupWizard(host, opts) {
  if (!host || host.dataset.wzBound === '1') return;
  host.dataset.wzBound = '1';
  const actor = opts.actor || {};
  const S = {
    host,
    actor,
    canSwitch: !!opts.canSwitchBranch,
    embed: !!opts.embed,
    branchId: null,   // 初始化见下
    view: 'wizard',   // 'wizard' | 'complete' | 'denied'
    step: 1,
    done: {},
    dirty: { 1: false, 2: false, 3: false },
    // 步骤编辑态（步骤内交互即时更新；保存/换支部后重读）
    modHidden: null,    // Set 业务 tab id
    modOrder: null,
    bHidden: null,     // Set output block id
    wbHidden: null,    // Set workflow block id
    wfSnapshot: null,  // 展开 workforce（保存时全量写回）
    // 阶段二（2026-09-06）：「复制配置到支部…」小面板展开态 + 多选目标集
    copyOpen: false,
    copySel: new Set(),
    // 阶段三·目标1（2026-09-06）：成员基础数据预览面板展开态 + 导入草稿（净化后待确认应用）
    baseOpen: false,
    baseDraft: null,  // { people, stats, dropped } | null
  };

  // 权限初始化：party-staff 可切支部；其余必须落在「本支部现任书记」且仅本支部
  if (actor.role === 'party-staff') {
    const branches = mockDB.branches || [];
    const wanted = opts.branchId && branches.some(b => b.id === opts.branchId) ? opts.branchId : (branches[0] && branches[0].id);
    _enterBranch(S, wanted || null);
  } else {
    const branchId = opts.branchId || null;
    const branch = branchId ? getBranchById(branchId) : null;
    if (!branch || !branch.secretaryId || branch.secretaryId !== actor.personId) {
      S.view = 'denied';
    } else {
      _enterBranch(S, branchId);
    }
  }

  _render(S);

  // 容器级事件委托（挂载一次；DOM 由 _render 全量重建，委托不受影响）
  host.addEventListener('click', (e) => _onClick(S, e));
  host.addEventListener('change', (e) => _onChange(S, e));
}

/** 进入某支部：读草稿恢复进度 + 应用其主题预设 */
function _enterBranch(S, branchId) {
  S.branchId = branchId;
  const draft = branchId ? _readDraft(branchId) : null;
  S.view = 'wizard';
  S.step = draft && draft.step ? draft.step : 1;
  S.done = draft && draft.done ? { ...draft.done } : {};
  S.dirty = { 1: false, 2: false, 3: false };
  S.modHidden = S.modOrder = S.bHidden = S.wbHidden = S.wfSnapshot = null;
  S.copyOpen = false;
  S.copySel = new Set();
  S.baseOpen = false;
  S.baseDraft = null;
  if (branchId) applyThemePreset(getBranchOrg(branchId).themePreset || 'red');
}

/** 持久化进度草稿 */
function _persistDraft(S) {
  if (!S.branchId) return;
  const draft = { branchId: S.branchId, step: S.step, done: { ...S.done } };
  if (S.view === 'complete') draft.completed = true;
  _writeDraft(S.branchId, draft);
}

/** 重读服务端数据 → 重置当前步编辑态（保存成功/换支部后） */
function _refreshStepState(S) {
  S.modHidden = S.modOrder = S.bHidden = S.wbHidden = S.wfSnapshot = null;
  S.dirty = { 1: false, 2: false, 3: false };
}

// ═══ 渲染 ═══
function _render(S) {
  const { host } = S;
  const branch = S.branchId ? getBranchById(S.branchId) : null;
  const isStaff = S.actor.role === 'party-staff';

  if (S.view === 'denied') {
    host.innerHTML = _deniedHtml(S);
    return;
  }
  if (!branch) {
    host.innerHTML = `<div class="rounded-xl border border-gray-200 bg-white p-6 text-center">
      <p class="text-sm text-gray-500">暂无支部可配置——请先由党委在「支部管理」中创建支部。</p></div>`;
    return;
  }
  const org = getBranchOrg(branch.id);
  host.innerHTML = `
    ${_headHtml(S, branch, org, isStaff)}
    ${_stepperHtml(S)}
    <div class="space-y-4">
      ${S.view === 'complete' ? _completeHtml(S, branch, org, isStaff) : _stepBodyHtml(S, branch, org, isStaff)}
      ${S.view === 'wizard' ? _footerHtml(S, isStaff) : ''}
    </div>`;
  // workforce 行回填（select 初始值由当前快照决定；value 可能为 person 位保留项）
  const wfMap = _workforceValueMap(S);
  host.querySelectorAll('[data-wz-wf-sel]').forEach((sel) => {
    const v = wfMap[sel.getAttribute('data-module')];
    if (v) sel.value = v;
  });
}

/** 展开 workforce → { moduleId: 'role:x' | 'person:y' }（回填 select） */
function _workforceValueMap(S) {
  const snapshot = S.wfSnapshot || getBranchWorkforce(S.branchId);
  S.wfSnapshot = snapshot;
  const map = {};
  for (const m of WORK_MAP_MODULES) {
    const a = snapshot[m.id] || { ownerType: 'role', ownerId: m.defaultOwner };
    map[m.id] = `${a.ownerType}:${a.ownerId}`;
  }
  return map;
}

function _deniedHtml(S) {
  const isStaff = S.actor.role === 'party-staff';
  const branch = S.branchId ? getBranchById(S.branchId) : null;
  const reason = !S.branchId || !branch
    ? '目标支部不存在'
    : (isStaff ? '' : (branch.secretaryId && branch.secretaryId !== S.actor.personId
      ? '仅本支部现任书记可配置该支部'
      : ''));
  return `<div class="rounded-xl border border-gray-200 bg-white p-6 max-w-xl">
    <p class="font-title-cn text-sm font-bold text-gray-800">无配置权限</p>
    <p class="text-xs text-gray-500 mt-1">换组织向导的配置权限：党委组织员（party-staff）可配置任意支部；现任书记仅可配置自己的支部（config 写口校验同 branch 服务既有语义）。</p>
    <p class="text-xs text-amber-600 mt-2">${esc(reason || '当前账号无支部配置权限')}</p>
    <p class="text-xs text-gray-400 mt-3">如需使用向导：以党委组织员账号（演示：9000000001 / 123456）或本支部现任书记账号登录。</p>
  </div>`;
}

/** 头部卡：说明 + 目标支部（party-staff 可选；现任书记固定） */
function _headHtml(S, branch, org, isStaff) {
  const branches = (mockDB.branches || []).filter(b => b.id && b.id !== 'pc-gsm');
  const options = branches.map(b =>
    `<option value="${esc(b.id)}" ${b.id === S.branchId ? 'selected' : ''}>${esc(b.name)}</option>`).join('');
  const picker = S.canSwitch
    ? `<div class="flex items-center gap-2">
        <label for="wz-branch-select" class="text-xs text-gray-500 shrink-0">目标支部</label>
        <select id="wz-branch-select" class="input-flat w-full max-w-xs">${options}</select>
        <span class="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 shrink-0">党委 · 任意支部</span>
      </div>`
    : `<div class="flex items-center gap-2">
        <span class="text-xs text-gray-500 shrink-0">目标支部</span>
        <span class="text-xs font-medium text-gray-800">${esc(branch.name)}</span>
        <span class="text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100 shrink-0">现任书记 · 限本支部</span>
      </div>`;
  return `
    <div class="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p class="font-title-cn text-base font-bold text-gray-800">换组织向导</p>
          <p class="text-xs text-gray-400">5 步引导式支部配置（吸收合并原「支部配置」）；部署期/调整期使用，改动即时生效并留痕</p>
        </div>
        ${S.embed ? `<a href="../wizard.html?branch=${esc(S.branchId)}" class="text-[11px] text-blue-600 hover:text-blue-800 shrink-0" title="在新页面打开向导（独立 URL 直达）">独立页直达 ↗</a>` : ''}
      </div>
      ${picker}
      ${_toolbarHtml(S, isStaff)}
    </div>`;
}

// ── 配置工具条（阶段二 2026-09-06：JSON 覆盖件导出/导入 + 复制配置到支部；
//     阶段三·目标1 2026-09-06：成员基础数据预览）──────────────────────
function _toolbarHtml(S, isStaff) {
  const branches = (mockDB.branches || []).filter(b => b.id && b.id !== 'pc-gsm');
  const subtle = 'text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors';
  const row = `
    <div class="flex flex-wrap items-center gap-2 pt-2.5 mt-2.5 border-t border-gray-100">
      <span class="text-[11px] text-gray-400 shrink-0">配置工具</span>
      <button type="button" data-wz-act="export-pkg" class="${subtle}">导出 JSON 配置包</button>
      <button type="button" data-wz-act="import-pkg" class="${subtle}">导入 JSON 配置包</button>
      ${isStaff ? `<button type="button" data-wz-act="toggle-copy" class="${subtle}">${S.copyOpen ? '收起' : ''}复制配置到支部…</button>` : ''}
      <input type="file" id="wz-pkg-file" accept=".json,application/json" class="hidden" data-wz-file="pkg">
    </div>`;
  const panel = isStaff && S.copyOpen ? _copyPanelHtml(S, branches) : '';
  const baseRow = `
    <div class="flex flex-wrap items-center gap-2 pt-2.5 mt-2.5 border-t border-gray-100">
      <span class="text-[11px] text-gray-400 shrink-0">数据预览</span>
      <button type="button" data-wz-act="toggle-base" class="${subtle}">${S.baseOpen ? '收起' : ''}成员名册预览…</button>
    </div>`;
  const basePanel = S.baseOpen ? _basePanelHtml(S) : '';
  return row + panel + baseRow + basePanel;
}

/** 成员名册数据预览面板（阶段三·目标1）：下载模板 / 导入预览 / 清除回种子 + 应用前统计卡 */
function _basePanelHtml(S) {
  const st = getPreviewState();
  const subtle = 'text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors';
  const n = st.rows.length;
  return `
    <div class="rounded-lg border border-blue-100 bg-blue-50/40 p-3 mt-2.5 space-y-2">
      <p class="text-xs font-semibold text-gray-700">成员基础数据预览 <span class="text-[10px] font-normal text-gray-400">（本地预览：仅覆盖姓名/党小组归属/发展阶段/在校·滞留，不写 mockDB / 种子持久）</span></p>
      <p class="text-[11px] text-gray-500">下载「成员名单模板」→ 按真实名册改 JSON → 「导入名单(JSON)预览」：应到数字 / 党员分布即时可见变化（⑤ 验证与重置、纪检考勤等应到口径同源）；「清除预览」一键回种子。</p>
      <p class="text-[11px] text-amber-600">注意：业务历史（活动/考勤/议程/专班等）仍关联演示成员，正式换数据请按「换壳工作单」落仓库文件。</p>
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" data-wz-act="download-base-template" class="${subtle}">下载成员名单模板</button>
        <button type="button" data-wz-act="import-base" class="${subtle}">导入名单(JSON)预览</button>
        <button type="button" data-wz-act="clear-base" ${st.active ? '' : 'disabled'} class="${subtle} ${st.active ? '' : 'opacity-40 cursor-not-allowed'}">清除预览</button>
        <span class="text-[11px] text-gray-400">${st.active ? `当前已应用（${n} 条成员行叠加生效）` : '当前为种子初始读数'}</span>
      </div>
      ${st.active ? `
      <div class="rounded-lg border border-green-200 bg-green-50/60 px-3 py-2 text-[11px] text-gray-600">
        <p><b class="text-green-700">预览已生效</b>：成员名册 / 应到名单 / 发展阶段分布按导入名单读数——到 ⑤「验证与重置」可核对支部党员大会应到现值（纪检考勤等消费点同源）。</p>
      </div>` : ''}
      ${S.baseDraft ? _baseDraftHtml(S, S.baseDraft) : ''}
      <input type="file" id="wz-base-file" accept=".json,application/json" class="hidden" data-wz-file="base">
    </div>`;
}

/** 预览统计单格（label + 主读数 + 副注） */
function _baseStatBox(label, main, sub) {
  return `<div class="rounded-lg border border-blue-100 bg-white p-2.5">
    <p class="text-[11px] text-gray-400">${esc(label)}</p>
    <p class="text-base font-bold text-gray-800 leading-tight">${main}</p>
    ${sub ? `<p class="text-[10px] text-gray-400 mt-0.5">${esc(sub)}</p>` : ''}
  </div>`;
}

/** 导入草稿（净化通过、未应用）统计卡：在册 N / 滞留 K / 支部大会应到 / 各党小组应到 */
function _baseDraftHtml(S, draft) {
  const s = draft.stats;
  const groupParts = Object.entries(s.perGroup).map(([g, v]) =>
    `<span class="whitespace-nowrap">${esc(g)} <b class="text-gray-800">${v.expected}</b><span class="text-[10px] text-gray-400"> / 在册 ${v.partyTotal}</span></span>`).join(' · ');
  return `
    <div class="rounded-lg border border-green-200 bg-white p-3 space-y-2">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-xs font-semibold text-gray-700">导入预览 · 应用前读数</p>
        <span class="text-[11px] text-gray-400">有效 ${draft.people.length} 条${draft.dropped ? ` · 已忽略非法/白名单外 ${draft.dropped} 条` : ''}</span>
      </div>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-2">
        ${_baseStatBox('在册党员（应到基数）', `${s.partyTotal}<span class="text-xs font-normal text-gray-400"> 人</span>`, `正式 ${s.official} + 预备 ${s.probationary}`)}
        ${_baseStatBox('滞留党员（剔除）', `${s.detained}<span class="text-xs font-normal text-gray-400"> 人</span>`, '组织关系保留、通知照发')}
        ${_baseStatBox('支部党员大会应到', `<span class="text-red-600">${s.expected}</span><span class="text-xs font-normal text-gray-400"> 人</span>`, `= 党员 ${s.partyTotal} − 滞留 ${s.detained}`)}
        ${_baseStatBox('各党小组会应到', groupParts || '—', '组内党员 − 组内滞留')}
      </div>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-[11px] text-gray-500">确认应用后：成员名册 / 应到名单 / 发展阶段分布按上表变化（本地预览，可「清除预览」回种子）；「放弃」不写入。</p>
        <div class="flex gap-2">
          <button type="button" data-wz-act="discard-base" class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white transition-colors">放弃</button>
          <button type="button" data-wz-act="apply-base" class="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90" style="background:#C8102E;">确认应用</button>
        </div>
      </div>
    </div>`;
}

/** 复制配置到支部小面板（源=当前选中支部；目标=多选其余支部；仅 party-staff 渲染） */
function _copyPanelHtml(S, branches) {
  const sourceName = esc((getBranchById(S.branchId) || {}).name || S.branchId);
  const targets = branches.filter(b => b.id !== S.branchId);
  const rows = targets.length
    ? targets.map(b => `
      <label class="flex items-center gap-2 py-1 px-1 rounded cursor-pointer hover:bg-white">
        <input type="checkbox" data-wz-copy-target value="${esc(b.id)}" ${S.copySel.has(b.id) ? 'checked' : ''} class="shrink-0">
        <span class="text-xs text-gray-700 min-w-0 truncate">${esc(b.name)}<span class="text-[10px] text-gray-400">（${esc(b.id)}）</span></span>
      </label>`).join('')
    : '<p class="text-[11px] text-gray-400 py-1">暂无其它支部可复制——请先由党委在「支部管理」中创建支部。</p>';
  return `
    <div class="rounded-lg border border-blue-100 bg-blue-50/40 p-3 mt-2.5 space-y-2">
      <p class="text-xs font-semibold text-gray-700">复制配置到支部…</p>
      <p class="text-[11px] text-gray-500">源：<b class="text-gray-700">${sourceName}</b>；将模块/块组合、角色分工与组织档案（页眉/自述/主题预设）复制给勾选的目标支部，逐目标留痕 <code class="text-[10px] bg-white px-1 py-0.5 rounded border border-blue-100">config-copied</code>。</p>
      <div class="rounded-lg bg-white border border-blue-100 px-2 py-1 max-h-44 overflow-y-auto">${rows}</div>
      <div class="flex items-center justify-end gap-2">
        <button type="button" data-wz-act="toggle-copy" class="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-white transition-colors">取消</button>
        <button type="button" data-wz-act="do-copy" ${S.copySel.size ? '' : 'disabled'} class="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90 ${S.copySel.size ? '' : 'opacity-40 cursor-not-allowed'}" style="background:#C8102E;">确认复制（已选 ${S.copySel.size}）</button>
      </div>
    </div>`;
}

/** 步骤条：done=✓ 可回跳；当前步高亮（theme 色） */
function _stepperHtml(S) {
  const { accent, accentRgba, accentBorder } = _presetAccent(getBranchOrg(S.branchId).themePreset || 'red');
  const maxReached = Math.max(1, ...Object.keys(S.done).map(Number), S.step);
  const items = WIZARD_STEPS.map((st) => {
    const isDone = !!S.done[st.id];
    const isCur = S.step === st.id;
    const clickable = isDone || st.id <= maxReached;
    const badge = isDone
      ? '<span class="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white shrink-0" style="background:#16A34A;">✓</span>'
      : `<span class="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 ${isCur ? 'text-white' : 'text-gray-400 bg-gray-100'}" style="${isCur ? `background:${accent};` : ''}">${st.id}</span>`;
    return `<button type="button" data-wz-step="${st.id}" ${clickable && !isCur ? '' : 'disabled'}
      class="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${isCur ? 'font-semibold' : ''} ${clickable && !isCur ? 'hover:bg-gray-100 text-gray-600' : ''} ${!clickable ? 'opacity-45 cursor-not-allowed' : ''}"
      style="${isCur ? `background:${accentRgba};color:${accent};border:1px solid ${accentBorder};` : ''}">${badge}${esc(st.label)}</button>`;
  }).join('');
  return `<div class="flex flex-wrap gap-2">${items}</div>`;
}

// 步骤 body
function _stepBodyHtml(S, branch, org, isStaff) {
  switch (S.step) {
    case 1: return _step1Html(S, branch, org, isStaff);
    case 2: return _step2Html(S, branch);
    case 3: return _step3Html(S, branch);
    case 4: return _step4Html(S, branch);
    case 5: return _step5Html(S, branch, org);
    default: return '';
  }
}

// ── ① 组织信息 ──
function _step1Html(S, branch, org, isStaff) {
  const canEditName = isStaff;
  const preset = _presetOf(org.themePreset || 'red');
  const presetCards = THEME_PRESETS.map((p) => {
    const { accent, accentRgba, accentBorder } = _presetAccent(p.id);
    const on = preset.id === p.id;
    return `<label class="flex items-start gap-2 rounded-xl border p-3 cursor-pointer transition-all ${on ? '' : 'border-gray-200 hover:border-gray-300'}" style="${on ? `background:${accentRgba};border-color:${accentBorder};` : ''}">
      <input type="radio" name="wz-theme" value="${p.id}" data-wz-act="preset" class="mt-0.5" ${on ? 'checked' : ''}>
      <span class="min-w-0">
        <span class="flex items-center gap-1.5">
          <span class="w-4 h-4 rounded-full shrink-0" style="background:${accent};box-shadow:inset 0 0 0 1px rgba(0,0,0,0.08);"></span>
          <span class="text-xs font-semibold text-gray-700">${esc(p.name)}</span>
        </span>
        <span class="block text-[11px] text-gray-400 mt-0.5">${esc(p.note)}</span>
      </span>
    </label>`;
  }).join('');
  const fixedChips = FIXED_THEME_TOKENS.map((t) =>
    `<span class="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-500">
      <span class="w-3 h-3 rounded-full" style="background:${t.hex};"></span>${esc(t.name)}<span class="text-[10px] text-gray-400">固定</span></span>`).join('');
  return `
    <div class="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div class="flex items-center justify-between">
        <p class="text-xs font-bold text-gray-700">① 组织信息</p>
        <span class="text-[11px] text-gray-400">保存即写入支部档案并留痕（即时生效）</span>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label class="flex flex-col gap-1 text-xs text-gray-500">
          支部名称（官方名）${canEditName ? '' : '<span class="text-[10px] text-amber-600">党委管理，书记只读</span>'}
          <input id="wz-org-name" type="text" value="${esc(org.name)}" placeholder="支部官方名" ${canEditName ? '' : 'disabled'}
            class="input-flat w-full ${canEditName ? '' : 'bg-gray-50 text-gray-400'}">
        </label>
        <label class="flex flex-col gap-1 text-xs text-gray-500">
          页眉显示名（header 品牌软编码，两者可改）
          <input id="wz-org-header" type="text" value="${esc(org.headerTitle)}" placeholder="工作台/页眉显示名" class="input-flat w-full">
        </label>
      </div>
      <label class="flex flex-col gap-1 text-xs text-gray-500">
        支部自述 / 口号（可选；步骤④工作单摘要内展示）
        <textarea id="wz-org-desc" rows="2" placeholder="例：以高质量党建引领人才培养的样板支部……" class="input-flat w-full">${esc(org.desc)}</textarea>
      </label>
      <div>
        <p class="text-xs font-semibold text-gray-600 mb-1.5">主题预设 <span class="text-[10px] font-normal text-gray-400">（仅可调令牌=强调色 --app-accent 三件套；固定红/金不可提供更改）</span></p>
        <div class="flex flex-wrap items-center gap-1.5 mb-2">${fixedChips}</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">${presetCards}</div>
      </div>
      <div class="flex justify-end pt-1">
        <button type="button" data-wz-act="save-step" data-step="1" class="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90" style="background:#C8102E;">保存本步（即时生效）</button>
      </div>
    </div>`;
}

// ── ② 模块/块组合（原 party-config 主体原样搬入）──
function _step2Html(S, branch) {
  const rawTabs = _branchTabs();
  const coreIds = new Set(getCoreTabIds(rawTabs));
  const coreTabs = rawTabs.filter(t => coreIds.has(t.id));
  const businessTabs = rawTabs.filter(t => !coreIds.has(t.id));
  const policy = getBranchTabPolicy(S.branchId);
  const hidden = S.modHidden || new Set(policy.hidden);
  S.modHidden = hidden;
  const order = policy.order || businessTabs.map(t => t.id);
  S.modOrder = order;
  const bPolicy = getOutputBlockPolicy(getBranchOutputBlocks(S.branchId));
  const bHidden = S.bHidden || new Set(bPolicy.hidden);
  S.bHidden = bHidden;
  const wPolicy = getWorkflowBlockPolicy(getBranchOutputBlocks(S.branchId));
  const wbHidden = S.wbHidden || new Set(wPolicy.hidden);
  S.wbHidden = wbHidden;
  const { accent, accentRgba, accentBorder } = _presetAccent(getBranchOrg(S.branchId).themePreset || 'red');
  const chipStyle = (on) => on
    ? `background:${accentRgba};border-color:${accentBorder};color:${accent};`
    : 'border:1px solid var(--neutral-200);color:var(--neutral-500);background:var(--neutral-100);';
  const chip = (attr, id, label, on) =>
    `<button type="button" data-wz-chip="${attr}" data-id="${esc(id)}" class="text-xs px-3 py-1.5 rounded-lg border transition-all ${on ? '' : 'opacity-45'}" style="${chipStyle(on)}">${esc(label)}</button>`;
  const chipOn = (attr, set) => !set.has(attr);
  return `
    <div class="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div class="flex items-center justify-between">
        <p class="text-xs font-bold text-gray-700">② 模块 / 块组合</p>
        <span class="text-[11px] text-gray-400">对支部工作台成员「下次进入」生效；点击开关 → 保存本步</span>
      </div>
      <div>
        <p class="text-xs font-bold text-gray-600 mb-1.5">业务模块 <span class="text-[10px] font-normal text-gray-400">（书记工作台 tab；核心组固定不可关）</span></p>
        <div class="flex flex-wrap gap-2 mb-1">${coreTabs.map(t => `<span class="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-500">${esc(t.label)}<span class="text-[10px] text-gray-400">固定</span></span>`).join('')}</div>
        <div class="flex flex-wrap gap-2 mt-2">${businessTabs.map(t => chip('module', t.id, t.label, !hidden.has(t.id))).join('')}</div>
      </div>
      <div>
        <p class="text-xs font-bold text-gray-600 mb-1.5">活动产出块 <span class="text-[10px] font-normal text-gray-400">（活动详情「添加记录」按钮集）</span></p>
        <div class="flex flex-wrap gap-2">${OUTPUT_BLOCK_DEFS.map(d => chip('block', d.id, d.label, !bHidden.has(d.id))).join('')}</div>
      </div>
      <div>
        <p class="text-xs font-bold text-gray-600 mb-1.5">工作流块 <span class="text-[10px] font-normal text-gray-400">（整条 SOP 入口，L3 愿景；目录源 workflow/blocks）</span></p>
        <div class="flex flex-wrap gap-2">${BLOCK_MANIFESTS.map(m => chip('wblock', m.blockId, m.name + ' · ' + (PROV_LABEL[m.provenance] || m.provenance || ''), !wbHidden.has(m.blockId))).join('')}</div>
      </div>
      <div class="flex gap-2 justify-end pt-2 border-t border-gray-100">
        <button type="button" data-wz-act="reset-modules" class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">恢复默认（全开）</button>
        <button type="button" data-wz-act="save-step" data-step="2" class="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90" style="background:#C8102E;">保存本步</button>
      </div>
    </div>`;
}

// ── ③ 角色分工 ──
function _step3Html(S, branch) {
  const snapshot = S.wfSnapshot || getBranchWorkforce(S.branchId);
  S.wfSnapshot = snapshot;
  const roleOptions = BRANCH_COMMISSION_ROLES.map((r) =>
    `<option value="role:${r}">${esc(ROLE_LABELS[r] || r)}</option>`).join('');
  const rows = WORK_MAP_MODULES.map((m) => {
    const assign = snapshot[m.id] || { ownerType: 'role', ownerId: m.defaultOwner };
    const val = `${assign.ownerType}:${assign.ownerId}`;
    // 当前为「到人位」时附一项保留显示（最小实现：候选为支委角色位，到人位可保留原值/改回角色）
    const personOpt = assign.ownerType === 'person'
      ? `<option value="person:${esc(assign.ownerId)}" selected>到人：${esc(getPersonName(assign.ownerId) || assign.ownerId)}（保留现指定）</option>` : '';
    const sub = m.sub && m.sub.length ? `<span class="text-[10px] text-gray-400">（${esc(m.sub.join('·'))}）</span>` : '';
    return `<div class="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2 items-center py-1.5 border-b border-gray-50 last:border-0">
      <div class="min-w-0">
        <p class="text-xs font-medium text-gray-700 truncate">${esc(m.name)}${sub}</p>
        <p class="text-[10px] text-gray-400 truncate">${esc(m.desc || '')}</p>
      </div>
      <select data-wz-wf-sel data-module="${esc(m.id)}" class="input-flat text-xs min-w-[180px]">
        ${personOpt}
        <optgroup label="支委角色（负责人）">${roleOptions}</optgroup>
      </select>
    </div>`;
  }).join('');
  // 回填选中（value 编码 type:id；含 person 保留项时直接匹配）
  // 用 JS 在渲染后同步 select.value（防 value 不在 options 时无效）
  return `
    <div class="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div class="flex items-center justify-between">
        <p class="text-xs font-bold text-gray-700">③ 角色分工</p>
        <span class="text-[11px] text-gray-400">模块负责人归属 → config.workforce（保留既有数据结构）</span>
      </div>
      <p class="text-[11px] text-gray-400">部署期/换壳期直接写库即时生效并留痕；日常分工调整请走书记台「支部分工」的支委会议题流程（M2）。</p>
      <div class="rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2">${rows}</div>
      <div class="flex gap-2 justify-end pt-1 border-t border-gray-100">
        <button type="button" data-wz-act="reset-workforce" class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">恢复默认分工</button>
        <button type="button" data-wz-act="save-step" data-step="3" class="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90" style="background:#C8102E;">保存本步</button>
      </div>
    </div>`;
}

// ── ④ 术语/制度/数据指引 + 换壳工作单 ──
function _step4Html(S, branch) {
  const guide = [
    ['演示数据与人员档案', 'docs/src/mock/（people.js 成员档案 / accounts.js 账号 / branches.js 支部种子 / activities.js 等活动示例）'],
    ['系统常量', 'docs/src/core/constants.js（角色/文案/活动类型/产出块目录）'],
    ['角色权限', 'content/02_institution/SYSTEM_ROLE_PERMISSION.md（矩阵单一源；代码侧 auth.js ROLE_PERMISSIONS 同步）'],
    ['术语/使用策略', 'content/03_doc_system/USAGE_POLICY.md + docs/src/core/policy-defaults.js'],
    ['制度 SOP', 'content/02_institution/sop/（书记/组织/宣传/纪检/组长指南）'],
    ['配色系统', 'content/04_web_design/design-system/COLOR_SYSTEM.md + docs/src/styles.css（:root 固定令牌不可改）'],
    ['支部默认策略', 'docs/src/core/policy-defaults.js（branch-default 可按制度调；institutional 勿改）'],
  ].map(([t, d]) =>
    `<div class="flex items-start gap-2 py-1.5 border-b border-gray-50 last:border-0">
      <span class="text-xs font-semibold text-gray-700 shrink-0 w-28">${esc(t)}</span>
      <span class="text-[11px] text-gray-500">${esc(d)}</span>
    </div>`).join('');
  return `
    <div class="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div class="flex items-center justify-between">
        <p class="text-xs font-bold text-gray-700">④ 术语 / 制度 / 数据指引 + 换壳工作单</p>
        <span class="text-[11px] text-gray-400">本步只读：仓库文件内容不在此在线修改，出「工作单」指引人工替换</span>
      </div>
      <p class="text-[11px] text-gray-400">以下「替换入口总表」要点 = 换壳时需要人工改的仓库文件（在线可改的已在①②③即时写入支部 config）：</p>
      <div class="rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-1">${guide}</div>
      <div class="rounded-xl border border-dashed border-red-200 bg-red-50/40 p-3.5">
        <p class="text-xs font-semibold text-gray-700">生成「换壳工作单」（Markdown 下载）</p>
        <p class="text-[11px] text-gray-500 mt-1">汇总：已完成配置摘要（①②③现读数）+ 待手动替换文件清单 + 验证点（应到口径 / ?reset=1 / npm test）。</p>
        <button type="button" data-wz-act="download-report" class="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90" style="background:#C8102E;">生成并下载工作单</button>
      </div>
    </div>`;
}

// ── ⑤ 验证与重置 ──
function _step5Html(S, branch, org) {
  const stats = getRosterStats({ type: '支部党员大会' });
  const doneList = WIZARD_STEPS.map((st) =>
    `<span class="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border ${S.done[st.id] ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-400'}">${S.done[st.id] ? '✓' : '○'} ${st.id}.${esc(st.label)}</span>`).join('');
  return `
    <div class="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <p class="text-xs font-bold text-gray-700">⑤ 验证与重置</p>
      <div class="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
        <p class="text-xs font-semibold text-gray-700">应到名单口径核对（现读数）</p>
        <p class="text-[11px] text-gray-500 mt-1">支部党员大会/党课等应到 = 在册党员（正式 + 预备）非滞留；滞留剔除。</p>
        <p class="text-xs text-gray-700 mt-2">在册党员 <b class="text-gray-900">${stats.partyTotal}</b> 人 − 滞留剔除 <b class="text-gray-900">${stats.detainedParty}</b> 人 = 应到 <b class="text-red-600">${stats.expected}</b> 人</p>
        <p class="text-[10px] text-gray-400 mt-1">口径配置：docs/src/core/policy-defaults.js attendance.roster（换数据后回本页复查读数）</p>
      </div>
      <div class="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
        <p class="text-xs font-semibold text-gray-700">演示重置 ?reset=1</p>
        <p class="text-[11px] text-gray-500 mt-1">浏览器演示：在任意页面 URL 末尾加 <code class="text-[10px] bg-white px-1 py-0.5 rounded border border-amber-200">?reset=1</code> 访问，一键清除本域全部演示存储并回到种子初始态（含本向导配置）——仅 mock 演示模式，生产数据不受影响。</p>
      </div>
      <div class="rounded-xl border border-gray-200 bg-gray-50/60 p-3">
        <p class="text-xs font-semibold text-gray-700">回归验证</p>
        <p class="text-[11px] text-gray-500 mt-1">改仓库文件（②清单）后：<code class="text-[10px] bg-white px-1 py-0.5 rounded border border-gray-200">cd server && npm test</code>（node --test）确认全绿再交付。</p>
      </div>
      <div>
        <p class="text-xs font-semibold text-gray-600 mb-1.5">步骤完成情况（存档于 localStorage 草稿，可续走）</p>
        <div class="flex flex-wrap gap-1.5">${doneList}</div>
      </div>
    </div>`;
}

// ── 完成报告页 ──
function _completeHtml(S, branch, org) {
  const preset = _presetOf(org.themePreset || 'red');
  const stats = getRosterStats({ type: '支部党员大会' });
  // 摘要 chips（无 emoji：色点 + 文字徽标）——「换壳结果」一眼可读
  const rep = _collectReportInput(S);
  const mod = rep.modulesSummary || {};
  const blk = rep.blocksSummary || {};
  const hiddenMod = (mod.hiddenLabels || []).length;
  const outHidden = (blk.outputHiddenLabels || []).length;
  const wbHidden = (blk.wbHiddenLabels || []).length;
  const chipDot = (bad) => bad ? '#EF4444' : '#16A34A';
  const chip = (dot, text) =>
    `<span class="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-gray-600"><span class="w-1.5 h-1.5 rounded-full shrink-0" style="background:${dot};"></span>${text}</span>`;
  const summaryChips = [
    chip(chipDot(hiddenMod), `业务模块启用 ${mod.visibleCount ?? mod.total ?? 0}/${mod.total ?? 0}${hiddenMod ? ` · 停用 ${hiddenMod}` : ''}`),
    chip(chipDot(outHidden), outHidden ? `产出块停用 ${outHidden}` : '活动产出块全开'),
    chip(chipDot(wbHidden), wbHidden ? `工作流块停用 ${wbHidden}` : '工作流块全开'),
    chip(chipDot(false), `主题预设 ${esc(preset.name)}`),
  ].join('');
  return `
    <div class="rounded-xl border border-green-200 bg-green-50/40 p-4 space-y-3">
      <div class="flex items-center gap-2">
        <p class="font-title-cn text-base font-bold text-gray-800">完成 · ${esc(branch.name)}</p>
        <span class="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700">配置已生效</span>
      </div>
      <p class="text-xs text-gray-500">以下改动已即时写入支部 config 并留痕（可查 config.configChangeHistory）；未写入仓库文件的项见下载的工作单。</p>
      <div class="flex flex-wrap gap-1.5">${summaryChips}</div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
        <div class="rounded-lg bg-white border border-green-100 p-2.5">
          <p class="text-gray-400 text-[11px] mb-0.5">页眉显示名</p>
          <p class="font-medium text-gray-800">${esc(org.headerTitle)}</p>
        </div>
        <div class="rounded-lg bg-white border border-green-100 p-2.5">
          <p class="text-gray-400 text-[11px] mb-0.5">主题预设（可调强调色）</p>
          <p class="font-medium text-gray-800">${esc(preset.name)}</p>
        </div>
        <div class="rounded-lg bg-white border border-green-100 p-2.5">
          <p class="text-gray-400 text-[11px] mb-0.5">支部自述</p>
          <p class="text-gray-700 truncate">${esc(org.desc || '（未填写）')}</p>
        </div>
        <div class="rounded-lg bg-white border border-green-100 p-2.5">
          <p class="text-gray-400 text-[11px] mb-0.5">应到名单（支部党员大会现读数）</p>
          <p class="font-medium text-gray-800">应到 ${stats.expected} 人（在册 ${stats.partyTotal} − 滞留 ${stats.detainedParty}）</p>
        </div>
      </div>
      <div class="flex flex-wrap gap-2 pt-1">
        <button type="button" data-wz-act="download-report" class="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90" style="background:#C8102E;">下载换壳工作单</button>
        <button type="button" data-wz-act="goto-verify" class="px-3 py-1.5 rounded-lg text-xs border border-gray-200 text-gray-600 hover:bg-white transition-colors">去验证 / 重置（⑤）</button>
        <button type="button" data-wz-act="restart" class="px-3 py-1.5 rounded-lg text-xs border border-gray-200 text-gray-500 hover:bg-white transition-colors">重走向导</button>
      </div>
    </div>`;
}

// ── 页脚（上一步 / 下一步 / 完成）──
function _footerHtml(S, isStaff) {
  const last = S.step === 5;
  const nextLabel = last ? '完成向导' : '下一步';
  return `
    <div class="flex items-center justify-between">
      <button type="button" data-wz-act="prev" ${S.step > 1 ? '' : 'disabled'} class="px-3 py-1.5 rounded-lg text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors ${S.step <= 1 ? 'opacity-40 cursor-not-allowed' : ''}">← 上一步</button>
      <button type="button" data-wz-act="next" class="px-4 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity hover:opacity-90" style="background:#C8102E;">${nextLabel}</button>
    </div>`;
}

// ═══ 事件 ═══
function _onClick(S, e) {
  const el = e.target && e.target.closest ? e.target.closest('[data-wz-act],[data-wz-step],[data-wz-chip]') : null;
  if (!el) return;
  // 步骤条跳转（已完成步可点击回看；完成报告页点步骤条回到向导视图）
  if (el.hasAttribute('data-wz-step')) {
    const target = Number(el.getAttribute('data-wz-step'));
    const maxReached = Math.max(1, ...Object.keys(S.done).map(Number), S.step);
    if (target >= 1 && target <= 5 && target <= maxReached && target !== S.step) {
      if (S.view === 'complete') S.view = 'wizard';
      _goStep(S, target);
    }
    return;
  }
  // chips（模块/块开关：只更新本地状态并重绘样式，保存走「保存本步」）
  if (el.hasAttribute('data-wz-chip')) {
    const kind = el.getAttribute('data-wz-chip');
    const id = el.getAttribute('data-id');
    const set = kind === 'module' ? S.modHidden : (kind === 'block' ? S.bHidden : S.wbHidden);
    if (!set) return;
    if (set.has(id)) set.delete(id); else set.add(id);
    S.dirty[2] = true;
    _paintChips(S);
    return;
  }
  const act = el.getAttribute('data-wz-act');
  if (!act) return;
  switch (act) {
    case 'prev':
      if (S.step > 1) { _goStep(S, S.step - 1); }
      break;
    case 'next':
      _onNext(S);
      break;
    case 'save-step':
      _saveStep(S, Number(el.getAttribute('data-step')));
      break;
    case 'reset-modules':
      _resetModules(S);
      break;
    case 'reset-workforce':
      _resetWorkforce(S);
      break;
    case 'download-report':
      _downloadReport(S);
      break;
    case 'restart':
      if (S.branchId) _clearDraft(S.branchId);
      S.done = {}; S.step = 1; S.view = 'wizard'; _refreshStepState(S);
      _persistDraft(S);
      _render(S);
      showToast('success', '已重走向导（草稿已清除）');
      break;
    case 'goto-verify':
      S.view = 'wizard'; S.step = 5; _persistDraft(S); _render(S);
      break;
    case 'export-pkg':
      _exportPkg(S);
      break;
    case 'import-pkg': {
      const fi = S.host.querySelector('#wz-pkg-file');
      if (fi) fi.click(); // 触发隐藏 file input（用户手势链内）
      break;
    }
    case 'toggle-copy':
      S.copyOpen = !S.copyOpen;
      _render(S);
      break;
    case 'do-copy':
      _doCopy(S);
      break;
    // 阶段三·目标1：成员基础数据预览（面板展开 / 下载模板 / 清除 / 导入草稿应用·放弃）
    case 'toggle-base':
      S.baseOpen = !S.baseOpen;
      if (!S.baseOpen) S.baseDraft = null;
      _render(S);
      break;
    case 'download-base-template':
      _downloadBaseTemplate(S);
      break;
    case 'import-base': {
      const fi = S.host.querySelector('#wz-base-file');
      if (fi) fi.click(); // 触发隐藏 file input（用户手势链内）
      break;
    }
    case 'clear-base':
      _clearBasePreview(S);
      break;
    case 'discard-base':
      S.baseDraft = null;
      _render(S);
      break;
    case 'apply-base':
      _applyBaseDraft(S);
      break;
    default:
      break;
  }
}

function _onChange(S, e) {
  const t = e.target;
  if (!t) return;
  if (t.id === 'wz-branch-select') {
    const v = t.value;
    if (v && v !== S.branchId) {
      _enterBranch(S, v);
      _refreshStepState(S);
      _render(S);
    }
    return;
  }
  // 「复制配置到支部」目标多选：更新 S.copySel + 确认按钮可用态（不整页重绘）
  if (t.hasAttribute('data-wz-copy-target')) {
    if (t.checked) S.copySel.add(t.value); else S.copySel.delete(t.value);
    const btn = S.host.querySelector('[data-wz-act="do-copy"]');
    if (btn) {
      btn.disabled = !S.copySel.size;
      btn.classList.toggle('opacity-40', !S.copySel.size);
      btn.classList.toggle('cursor-not-allowed', !S.copySel.size);
      btn.textContent = `确认复制（已选 ${S.copySel.size}）`;
    }
    return;
  }
  // 导入 file input 选中：pkg = 配置包 / base = 成员名单模板 → 读取 JSON → 处理 → toast + 重渲染
  if (t.hasAttribute('data-wz-file')) {
    const kind = t.getAttribute('data-wz-file');
    const file = t.files && t.files[0];
    t.value = ''; // 置空以允许再次选择同一文件
    if (file) {
      if (kind === 'base') _importBaseFile(S, file);
      else _importPkgFile(S, file);
    }
    return;
  }
  if (t.name === 'wz-theme') {
    // 主题预设：本地选中即时预览（写 :root）；随「保存本步」落库
    applyThemePreset(t.value);
    S.dirty[1] = true;
    const cards = S.host.querySelectorAll('label input[name="wz-theme"]');
    cards.forEach((r) => {
      const card = r.closest('label');
      const on = r.checked;
      const p = _presetOf(r.value);
      const { accent, accentRgba, accentBorder } = _presetAccent(p.id);
      card.style.cssText = on ? `background:${accentRgba};border-color:${accentBorder};` : '';
      card.classList.toggle('border-gray-200', !on);
      card.classList.toggle('hover:border-gray-300', !on);
    });
    return;
  }
  if (t.hasAttribute('data-wz-wf-sel')) {
    S.dirty[3] = true;
    return;
  }
  // 步骤①文本输入（name/header/desc）→ dirty
  const id = t.id;
  if (id === 'wz-org-name' || id === 'wz-org-header' || id === 'wz-org-desc') S.dirty[1] = true;
}

/** 切换步骤（1..5）；下一步前若有脏自动保存当前可写步 */
function _goStep(S, target) {
  if (target === S.step) return;
  S.step = target;
  _persistDraft(S);
  _render(S);
}

async function _onNext(S) {
  // 可写步脏 → 先保存（即时生效语义；保存失败不前进）
  if (S.dirty[S.step] && (S.step === 1 || S.step === 2 || S.step === 3)) {
    const ok = await _saveStep(S, S.step);
    if (!ok) return;
  }
  if (S.step < 5) {
    S.done[S.step] = true;
    S.step += 1;
    _persistDraft(S);
    _render(S);
    return;
  }
  // step5 → 完成
  S.done[5] = true;
  S.view = 'complete';
  _persistDraft(S);
  _render(S);
}

/** 保存指定步骤（1/2/3）；成功标 done 并清脏 */
async function _saveStep(S, step) {
  try {
    let ok = false;
    if (step === 1) ok = await _saveOrg(S);
    else if (step === 2) ok = await _saveModules(S);
    else if (step === 3) ok = await _saveWorkforce(S);
    if (!ok) return false;
    S.done[step] = true;
    S.dirty[step] = false;
    if (step === 2 || step === 3) _refreshStepState(S);
    _persistDraft(S);
    _render(S);
    showToast('success', '已保存并即时生效（已留痕）');
    return true;
  } catch (err) {
    console.error('[wizard] 保存失败', err);
    showToast('error', `保存失败：${(err && err.message) || err}`);
    return false;
  }
}

// ── ① 保存组织信息 ──
async function _saveOrg(S) {
  const isStaff = S.actor.role === 'party-staff';
  const org = getBranchOrg(S.branchId);
  const nameVal = S.host.querySelector('#wz-org-name');
  const headerVal = S.host.querySelector('#wz-org-header');
  const descVal = S.host.querySelector('#wz-org-desc');
  const presetVal = S.host.querySelector('input[name="wz-theme"]:checked');
  if (!headerVal || !descVal || !presetVal) return false;
  const patch = {};
  // 顶层 name 治理字段：仅 party-staff 可改（通用 branches PATCH 门）；现任书记只读
  if (isStaff && nameVal) {
    const name = nameVal.value.trim();
    if (name && name !== org.name) patch.name = name;
  }
  const header = headerVal.value.trim();
  if (!header) { showToast('info', '页眉显示名不能为空'); return false; }
  if (header !== org.headerTitle && !(patch.name && header === patch.name)) patch.headerTitle = header;
  const desc = descVal.value.trim();
  if (desc !== org.desc) patch.desc = desc;
  const preset = presetVal.value;
  if (preset !== (org.themePreset || 'red')) patch.themePreset = preset;
  await updateBranchOrg(S.branchId, patch, { by: S.actor.personId });
  // 主题立即生效（即使无变更也保持预览与存档一致）
  applyThemePreset(getBranchOrg(S.branchId).themePreset || 'red');
  return true;
}

// ── ② 保存模块/块 ──
async function _saveModules(S) {
  const rawTabs = _branchTabs();
  const blockPayload = {
    outputBlocks: { hiddenBlockIds: [...(S.bHidden || [])], blockOrder: [] },
    workflowBlocks: { hiddenBlockIds: [...(S.wbHidden || [])] },
  };
  await updateBranchModules(S.branchId, { hiddenTabIds: [...(S.modHidden || [])], tabOrder: [...(S.modOrder || [])] }, rawTabs, blockPayload);
  return true;
}

async function _resetModules(S) {
  if (!window.confirm('确认恢复默认（业务模块/产出块/工作流块全开 + 注册顺序）？')) return;
  try {
    const rawTabs = _branchTabs();
    await updateBranchModules(S.branchId, null, rawTabs, null);
    _refreshStepState(S);
    S.done[2] = true;
    _persistDraft(S);
    _render(S);
    showToast('success', '已恢复默认（全开、注册顺序）');
  } catch (err) {
    console.error('[wizard] 恢复默认失败', err);
    showToast('error', `恢复默认失败：${(err && err.message) || err}`);
  }
}

// ── ③ 保存角色分工 ──
async function _saveWorkforce(S) {
  const rows = [];
  S.host.querySelectorAll('[data-wz-wf-sel]').forEach((sel) => {
    const moduleId = sel.getAttribute('data-module');
    const val = sel.value || '';
    if (!moduleId || !val) return;
    const i = val.indexOf(':');
    const ownerType = val.slice(0, i);
    const ownerId = val.slice(i + 1);
    if ((ownerType === 'role' || ownerType === 'person') && ownerId) {
      rows.push([moduleId, { ownerType, ownerId }]);
    }
  });
  // 全量快照写回（保留既有数据结构 config.workforce = {moduleId: {ownerType, ownerId}}）
  const workforce = Object.fromEntries(rows);
  await updateBranchWorkforce(S.branchId, workforce);
  return true;
}

async function _resetWorkforce(S) {
  if (!window.confirm('确认恢复默认分工（按 SOP 缺省负责人）？')) return;
  try {
    await updateBranchWorkforce(S.branchId, null);
    _refreshStepState(S);
    S.done[3] = true;
    _persistDraft(S);
    _render(S);
    showToast('success', '已恢复默认分工');
  } catch (err) {
    console.error('[wizard] 恢复默认分工失败', err);
    showToast('error', `恢复失败：${(err && err.message) || err}`);
  }
}

// ── 收集报告输入（现读数）──────────────────────────────
function _collectReportInput(S) {
  const branch = getBranchById(S.branchId);
  const org = getBranchOrg(S.branchId);
  const preset = _presetOf(org.themePreset || 'red');
  const { accent } = _presetAccent(preset.id);
  const rawTabs = _branchTabs();
  const coreIds = new Set(getCoreTabIds(rawTabs));
  const businessTabs = rawTabs.filter(t => !coreIds.has(t.id));
  const policy = getBranchTabPolicy(S.branchId);
  const hidden = policy.hidden;
  const hiddenLabels = businessTabs.filter(t => hidden.has(t.id)).map(t => t.label);
  const modulesCfg = branch?.config?.modules;
  const bPolicy = getOutputBlockPolicy(getBranchOutputBlocks(S.branchId));
  const outputHidden = OUTPUT_BLOCK_DEFS.filter(d => bPolicy.hidden.has(d.id)).map(d => d.label);
  const wPolicy = getWorkflowBlockPolicy(getBranchOutputBlocks(S.branchId));
  const wbHiddenLabels = BLOCK_MANIFESTS.filter(m => wPolicy.hidden.has(m.blockId)).map(m => m.name);
  const snapshot = getBranchWorkforce(S.branchId);
  const workforce = WORK_MAP_MODULES.map((m) => ({ module: m.name, owner: _ownerLabel(snapshot[m.id]) }));
  const stats = getRosterStats({ type: '支部党员大会' });
  return {
    branchInfo: { ...org, secretaryName: branch?.secretaryId ? (getPersonName(branch.secretaryId) || '') : '' },
    theme: { presetId: preset.id, name: preset.name, accentHex: accent },
    modulesSummary: {
      total: businessTabs.length,
      visibleCount: businessTabs.length - hiddenLabels.length,
      hiddenLabels,
      orderChanged: !!(modulesCfg && Array.isArray(modulesCfg.tabOrder) && modulesCfg.tabOrder.length),
    },
    blocksSummary: { outputTotal: OUTPUT_BLOCK_DEFS.length, outputHiddenLabels: outputHidden, wbHiddenLabels },
    workforce,
    rosterStats: stats,
  };
}

/** 下载换壳工作单（Markdown Blob） */
function _downloadReport(S) {
  const branch = getBranchById(S.branchId);
  if (!branch) return;
  const md = buildOrgWizardReport(_collectReportInput(S));
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  downloadBlob(`换壳工作单-${branch.name}.md`, blob);
  showToast('success', '换壳工作单已下载（Markdown）');
}

// ── 配置包导出 / 导入 / 复制到支部（阶段二 2026-09-06）────────────
const FIELD_LABELS = {
  headerTitle: '页眉显示名', themePreset: '主题预设', desc: '支部自述',
  modules: '模块组合', blocks: '块组合', workforce: '角色分工',
};
/** 字段列表 → 中文摘要（toast 用） */
function _fieldsLabel(fields) {
  const list = (Array.isArray(fields) ? fields : []).map(f => FIELD_LABELS[f] || f);
  return list.length ? list.join('、') : '无';
}

/** 导出 JSON 配置包（Blob 下载 <branchId>-org-config.json） */
function _exportPkg(S) {
  try {
    const pkg = buildConfigPackage({ branchId: S.branchId, by: S.actor.personId || undefined });
    const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json;charset=utf-8' });
    downloadBlob(`${S.branchId}-org-config.json`, blob);
    showToast('success', '配置包已导出（JSON，可下载留档或在本地预览应用）');
  } catch (err) {
    console.error('[wizard] 导出配置包失败', err);
    showToast('error', `导出失败：${(err && err.message) || err}`);
  }
}

/** 导入 JSON 配置包：读取文件 → apply（净化+留痕+写库）→ toast 摘要 + 重渲染 */
function _importPkgFile(S, file) {
  const reader = new FileReader();
  reader.onerror = () => showToast('error', '读取配置文件失败');
  reader.onload = async () => {
    try {
      const pkg = JSON.parse(String(reader.result || ''));
      const res = await applyConfigPackage(pkg, { branchId: S.branchId, by: S.actor.personId || undefined });
      if (!res.ok) {
        showToast('error', `导入失败：${res.reason || '未知原因'}`);
        return;
      }
      if (res.unchanged) {
        showToast('info', '配置包与当前配置一致，无变更');
        return;
      }
      _refreshStepState(S);
      applyThemePreset(getBranchOrg(S.branchId).themePreset || 'red'); // 主题随导入即时生效
      _persistDraft(S);
      _render(S);
      showToast('success', `已应用配置包：${_fieldsLabel(res.updatedFields)}（已留痕）`);
    } catch (err) {
      console.error('[wizard] 导入配置包失败', err);
      showToast('error', `导入失败：${(err && err.message) || err}`);
    }
  };
  reader.readAsText(file);
}

/** 「复制配置到支部…」确认：批量复制 → toast 汇总 + 重渲染 */
async function _doCopy(S) {
  const ids = [...S.copySel];
  if (!ids.length) return;
  try {
    const results = await applyConfigCopy(S.branchId, ids, { by: S.actor.personId || undefined });
    const okNames = [];
    const failMsgs = [];
    for (const r of results) {
      const b = getBranchById(r.targetId);
      const label = b ? b.name : r.targetId;
      if (r.ok) {
        okNames.push(r.fields.length ? `${label}（${_fieldsLabel(r.fields)}）` : label);
      } else {
        failMsgs.push(`${label}：${r.reason || '复制失败'}`);
      }
    }
    S.copyOpen = false;
    S.copySel = new Set();
    _refreshStepState(S);
    applyThemePreset(getBranchOrg(S.branchId).themePreset || 'red');
    _persistDraft(S);
    _render(S);
    const okPart = okNames.length ? `已复制到 ${okNames.length} 个支部：${okNames.join('、')}` : '';
    const failPart = failMsgs.length ? `；未生效 ${failMsgs.join('；')}` : '';
    showToast(okNames.length ? 'success' : 'error', (okPart + failPart) || '未执行复制');
  } catch (err) {
    console.error('[wizard] 复制配置失败', err);
    showToast('error', `复制失败：${(err && err.message) || err}`);
  }
}

// ── 阶段三·目标1：成员基础数据预览（下载模板 / 导入净化 / 清除 / 应用）──────────
/** 下载「成员名单模板」JSON（本支部成员名册，可按真实名册改后导入预览） */
function _downloadBaseTemplate(S) {
  try {
    const tpl = buildPreviewTemplate();
    if (!tpl.people || !tpl.people.length) {
      showToast('info', '当前无预置成员名册可导出（演示成员种子见 docs/src/mock/people.js）');
      return;
    }
    const blob = new Blob([JSON.stringify(tpl, null, 2)], { type: 'application/json;charset=utf-8' });
    downloadBlob(`${S.branchId || 'branch'}-成员名册模板.json`, blob);
    showToast('success', `成员名单模板已下载（${tpl.people.length} 名，JSON 可编辑）`);
  } catch (err) {
    console.error('[wizard] 下载成员名单模板失败', err);
    showToast('error', `下载失败：${(err && err.message) || err}`);
  }
}

/** 导入成员名单文件：包级门槛（kind/version）→ 净化 → 存草稿展示统计卡（确认应用/放弃） */
function _importBaseFile(S, file) {
  const reader = new FileReader();
  reader.onerror = () => showToast('error', '读取名单文件失败');
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result || ''));
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('文件不是 JSON 对象');
      if (data.kind !== undefined && data.kind !== PREVIEW_KIND) {
        throw new Error(`不是成员名单模板（kind=${String(data.kind)}，应为 ${PREVIEW_KIND}）`);
      }
      if (data.version !== undefined && data.version !== PREVIEW_VERSION) {
        throw new Error(`模板版本不支持（${String(data.version)}，当前 ${PREVIEW_VERSION}）`);
      }
      const res = sanitizePreview(data);
      if (!res.valid) {
        showToast('error', res.reason || '名单净化未通过');
        return;
      }
      S.baseDraft = { people: res.people, stats: res.stats, dropped: res.dropped };
      _render(S);
      const note = res.dropped ? `（已忽略非法/白名单外 ${res.dropped} 条）` : '';
      showToast('success', `已读取 ${res.people.length} 条有效成员${note}，请核对统计后确认应用`);
    } catch (err) {
      console.error('[wizard] 导入成员名单失败', err);
      showToast('error', `导入失败：${(err && err.message) || err}`);
    }
  };
  reader.readAsText(file);
}

/** 清除预览（回种子）：二次确认后移除预览键并重渲染 */
function _clearBasePreview(S) {
  const st = getPreviewState();
  if (!st.active) return;
  if (!window.confirm('确认清除成员基础数据预览？成员读数将回到演示种子（业务历史数据不受影响）。')) return;
  clearPreview();
  S.baseDraft = null;
  _render(S);
  showToast('success', '已清除预览，成员读数回到种子初始');
}

/** 确认应用导入草稿：写预览键 → 成员读数即时叠加（⑤/纪检考勤同源），可再清除回种子 */
function _applyBaseDraft(S) {
  const draft = S.baseDraft;
  if (!draft || !draft.people || !draft.people.length) return;
  const res = applyPreview(draft.people);
  if (!res.ok) {
    showToast('error', res.reason || '应用失败');
    return;
  }
  S.baseDraft = null;
  _render(S);
  showToast('success', '已应用成员基础数据预览（应到数字/党员分布即时生效，可清除回种子）');
}

/** 局部重绘 chips（保住 DOM 与滚动，不重建整步） */
function _paintChips(S) {
  const { accent, accentRgba, accentBorder } = _presetAccent(getBranchOrg(S.branchId).themePreset || 'red');
  const chipOn = (attr) => {
    const set = attr === 'module' ? S.modHidden : (attr === 'block' ? S.bHidden : S.wbHidden);
    return (id) => !set.has(id);
  };
  S.host.querySelectorAll('[data-wz-chip]').forEach((btn) => {
    const attr = btn.getAttribute('data-wz-chip');
    const on = chipOn(attr)(btn.getAttribute('data-id'));
    btn.className = `text-xs px-3 py-1.5 rounded-lg border transition-all ${on ? '' : 'opacity-45'}`;
    btn.style.cssText = on
      ? `background:${accentRgba};border-color:${accentBorder};color:${accent};`
      : 'border:1px solid var(--neutral-200);color:var(--neutral-500);background:var(--neutral-100);';
  });
}
