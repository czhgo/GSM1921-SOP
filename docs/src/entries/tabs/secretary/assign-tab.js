// role: [工程师]+[AI]
// entries/tabs/secretary/assign-tab.js — 赋权「三情景」分块渲染模块（**2026-09-25 起不再注册为 tab**）
// 2026-08-07 自 ws-secretary-entry.js 拆分：常设赋权（设党小组组长）+ 项目赋权（organizer/deep）。
//
// 内容已按对象归位（2026-09-25 支书裁「全按对象归位」）＋ 2026-09-27 批次 213 按母本补齐非本位入口：
//   · 情景①（设党小组组长 / 支委身份）⇒ **本位入口**＝支书台（2026-09-27 支委会迁移批按支书裁定拆落点）：
//     ①a 组长指派（组层）：宿主 `#gp-leader-assign-host`（「党小组与活动」tab「党小组清单」卡内），
//        import `mountLeaderAssign`；
//     ①b 支委身份配置（**支部层**）：宿主 `#cm-commissioner-host`（**支书台「支委会」tab 的「机构构成」段**，
//        由 committee-meeting-tab.js 提供），import `mountCommissionerAssign`——同一写口与 ID 不变，仅落点迁移
//   · 情景②（活动项目赋权）⇒ **本位入口**＝组长台「活动管理」内联（`entries/tabs/leader/write-tab.js`）
//     ＋ **支书台「党小组与活动」** 同项入口（`group-progress-tab.js` import `mountActivityProjectAuth`）
//   · 情景③（专班赋权）⇒ **本位入口**＝组织委员台「专班管理」
//     （`entries/tabs/org/taskforce-tab.js:240` import `mountTaskforceProjectAuth`）
//     ＋ **支书台「党小组与活动」** 同项入口（同上 `mountActivityProjectAuth` 一并挂载）
// 母本口径（`content/02_institution/COMMISSIONER_DUTY_FRAMEWORK.md` §D.1.1 赋权入口表；`.ctx/ACTIVE_RULINGS.md`
//   「一、角色与分工」`D-434`/`D-614`）：「**支书在三个情景里都可介入**」——②③ 均写「支书亦可 / 支书台『赋权管理』
//   同项入口」⇒ 支书台是**统一入口**（不是唯一入口）。2026-09-25「按对象归位」只搬了「本位落点」、③ 的支书台
//   同项入口一度漏挂（`secretary/todo-tab.js::expandAssignPanelForTodo` 对 `scope==='taskforce'` 找的
//   `#tf-auth-panel` 在支书台并不存在 ⇒ 曾是死分支）⇒ 本批按母本补回（`mountActivityProjectAuth` 一并渲染情景③）。
// ⚠ **情景① 无「非本位入口」**（母本只写「赋权者＝支书 / 副支书」，未写「他人亦可」）⇒ `assign-leader` nudge
//   在现形态下**不可达**（操作人恒为本位）——**如实标注、不假装可达**，见 `_isAuthHomeRole` 注释。
// 故本文件**不再注册为 tab**：`capabilities/secretary-workspace.js` 已删 `assign` 行、
//   `?tab=assign` 已删（不做兼容映射）。本文件**仅余上述三处的分块渲染**（三个 mount* 导出 + 其私有实现）。
// **权限判定一字未改**（列表/表单渲染之外，写口仍走 `AuthStore.authorize` / `services/branch/appointment.js`）。
// 制度口径（各情景「本位＝谁」与 2 处折叠说明）已搬入 `docs/help.html` 定点（`#card-copy-assign-*`），
//   界面只留一行 + 深链（DESIGN_SYSTEM §4.18 C7：制度原文不进界面）。

import { showToast, getBasePath, escHtml as esc } from '../../../core/base/utils.js?v=20261001h';
import { AuthStore } from '../../../services/core/auth.js?v=20261001h';
import { liveMembers, PersonStore } from '../../../services/member/person.js?v=20261001h';
// 数据域接线收口（2026-09-03）：支部成员名单经 services/member/person.js 获取（原直连 mock PEOPLE）
// 实时视图（非快照）：成员增删即时可见——见 services/member/person.js liveMembers 说明
const PEOPLE = liveMembers();
import { getPersonById, getPersonName } from '../../../services/member/person.js?v=20261001h';
// 党小组常态清单唯一来源（活组、按 seq 升序；新增/改名/解散后随渲染即时可见）——禁再手写组名数组
import { groupOptions } from '../../../services/member/party-group.js?v=20261001h';
import { TaskForceRecordStore } from '../../../services/activity/taskforce.js?v=20261001h';
import { PersonPicker } from '../../../components/governance/pickers.js?v=20261001h';
// 本位 nudge 单一源（2026-09-27：赋权三情景各自本位不同——非本位操作人写库前弹确认）
import { confirmNudge } from '../../../components/ui/modal.js?v=20261001h';
import { ROLE_LABELS, PROJECT_ROLES, BRANCH_COMMISSIONER_ASSIGNABLE_ROLES } from '../../../core/domain/constants.js?v=20261001h';
// 2026-09-23 支书裁定（情景①）：支委身份配置写口单一源 = services/branch/appointment.js
//（本 tab 只做表单/列表渲染，不直接改 mockDB；白名单与写门判据同源 core/domain/constants.js）
import { appointBranchCommissioner, revokeBranchCommissioner, listBranchCommissioners } from '../../../services/branch/appointment.js?v=20261001h';
// R1-A 点⑤（2026-09-09）：强调色渲染统一 person-aware 动态解析（替代模块级 resolveAccentRole 快照）
import { getAppliedAccentColors } from '../../../core/boot/theme.js?v=20261001h';
import { loadActivities } from '../../../services/activity/activity.js?v=20261001h';
import { badgeHtml } from '../../../components/ui/badges.js?v=20261001h';
import { TodoStore } from '../../../services/governance/todo.js?v=20261001h';
// 统一检索引擎（2026-09-13 表格统一化批次 A）：赋权记录列表（第一列是人）接入关键词 + 分面
import { renderFilteredList, personKeyword, personFacets, roleLabelOf } from '../../../components/ui/list-filter.js?v=20261001h';

// 生效强调色 hex（R1-A 点⑤：登录人强调色=person 键覆盖，禁止模块加载期快照写死——
// 一律渲染时经 getAppliedAccentColors 动态解析，改色后随重渲染/刷新生效，与 --app-accent 同源）
function _accentHex() {
  return getAppliedAccentColors('secretary').accent;
}

// ── 本位 nudge 的「本位」判据（2026-09-27 · 逐情景给，不一刀切）──────────────────────────
// 母本口径（`.ctx/ACTIVE_RULINGS.md`「一、角色与分工」`D-434` / `D-614`；CDF §D.1.1）：「赋权共三个情景」——
//   ① 常设赋权（党小组组长 / 支委身份；赋权者＝支书 / 副支书〔副书同权〕）
//   ② 活动项目赋权（本位＝党小组组长，支书亦可）
//   ③ 专班赋权（本位＝组织委员，支书亦可）
// **本位操作人不弹、零打扰**（判据只此一处，三个写口共用）。
// ⚠ **可达性（2026-09-27 批次 213 实读，如实标注）**：
//   · ① `assign-leader`：入口只在支书台（操作人＝支书 / 副支书＝本位）⇒ **现形态下不可达**——母本无「非本位亦可」，
//     不擅自开口子；保留为「日后若开口子」的守卫，不假装它是活的。
//   · ② `assign-activity`：本位＝组长（其入口在组长台 `write-tab.js`），支书台即非本位入口 ⇒ **可达**（会弹）。
//   · ③ `assign-taskforce`：组织委员台＝本位（不弹）、支书台＝非本位（本批补回，见 `mountActivityProjectAuth`）⇒ **可达**。
function _isAuthHomeRole(key) {
  const r = AuthStore.getCurrentUser()?.role;
  if (key === 'taskforce') return r === 'org-commissioner';
  if (key === 'activity') return r === 'leader' || r === 'deputy-leader';
  return r === 'secretary' || r === 'deputy-secretary'; // 情景①（常设赋权·standing）
}

// 2026-09-23（支书裁定·裁定乙，逐字）：「赋权主要是3个情景，一是赋权给党小组组长/支委（也就是最初的
//   人员配置只有党委给支书配置，剩下的身份由书记来配置）；二是活动（支书/党小组组长）做项目赋权；
//   三是专班（支书/组织委员）做专班赋权」；2026-09-25 支书再裁「**全按对象归位**」⇒
//   情景①a 落「党小组与活动」（组层）、①b 落「支委会」（支部层）、情景② 落「党小组与活动」、情景③ 落组织委员台「专班管理」；
//   搬入 `docs/help.html` 定点（C7），界面各留一行 + 深链。**权限判定不变**（写口仍是既有服务层）。

/** 情景①a 分块（设党小组组长）——落点＝支书台「党小组与活动」tab 的「党小组清单」卡内（**组层**，与「组 / 组长」同区）。
 *  2026-09-27 批次 215：原「组长指派与支委身份」一块按组织层级**拆为两块**（支委身份＝支部层，见下）——
 *  判据＝母本 `content/02_institution/COMMISSIONER_DUTY_FRAMEWORK.md` §A「组织关系上，支委会领导党小组」。 */
const LEADER_ASSIGN_HTML = `
  <div class="border-t border-gray-100 mt-4 pt-3.5">
    <div class="flex items-center justify-between mb-1">
      <h4 class="font-title-cn text-sm font-bold text-gray-700">组长指派</h4>
      <button id="ws-sec-assign-btn" class="btn-accent-soft text-xs px-3 py-1.5" style="--acc-text-dark:color-mix(in srgb, var(--app-accent) 55%, #fff)">设党小组组长</button>
    </div>
    <p class="text-[11px] text-gray-500 mb-2.5">设党小组组长（组长身份由成员档案派生，可改派、可撤销）。<a href="./help.html#card-copy-assign-leader" class="text-sky-600 hover:underline" title="见帮助：设党小组组长与支委身份（本位 / 身份边界 / 可改派可撤销）">见帮助 · 常设赋权</a></p>
    <div id="assign-area"></div>
    <div id="assign-leaders-list" class="mt-3"></div>
  </div>`;

/** 情景①b 分块（支委身份配置）——落点＝支书台「支委会」tab 的**机构构成段**（2026-09-27 支书裁定
 *  「支委配置归支委会」，由「党小组与活动」迁入；宿主由 committee-meeting-tab.js 提供）。**卡壳由落点提供**
 *  （宿主 `#cm-commissioner-host` 所在的机构构成卡自带卡壳，故本块只出卡内容，不另包纯包裹 div——
 *  同 `#gp-activity-auth-host` 既有形态）。 */
const COMMISSIONER_ASSIGN_HTML = `
    <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-1">支委身份配置（组织 / 宣传 / 纪检委员）</h4>
    <p class="text-xs text-gray-500 mb-1">选本支部在册成员 → 选身份 → 保存，可改派、可撤销。</p>
    <div id="bc-assign-area"></div>`;

/** 情景② 分块（活动侧项目赋权）——落点＝支书台「党小组与活动」tab（跟活动走）
 *  2026-09-30 批次 303：① 卡壳改**与全站卡同族**（原 `rounded-lg border-gray-100 bg-gray-50/40` 是嵌在
 *  card 里的**第二层灰底**，支书裁「视觉上格格不入」）；② 术语统称「**项目**」——「活动和专班是并列的」
 *  ⇒ 标题写「项目赋权 · 活动」，不再写「活动项目」这类并提。 */
const ACTIVITY_AUTH_HTML = `
  <div class="card rounded-xl p-4">
    <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-1">项目赋权 · 活动（组织者 / 深度参与者）</h4>
    <p class="text-[11px] text-gray-500 mb-3">为某一场活动给同志赋项目角色（组织者 / 深度参与者）；新建活动可在「写入活动」表单里一并赋权。<a href="./help.html#card-copy-assign-activity" class="text-sky-600 hover:underline" title="见帮助：项目赋权 · 活动（本位 / 赋权口径）">见帮助 · 活动赋权</a></p>
    <div id="project-auth-panel"></div>
  </div>`;

/** 情景③ 分块（专班侧项目赋权）——本位落点＝组织委员台「专班管理」；支书台「党小组与活动」为同项入口（母本 §D.1.1） */
const TF_AUTH_HTML = `
  <div class="card rounded-xl p-4">
    <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-1">项目赋权 · 专班（组织者 / 深度参与者）</h4>
    <p class="text-[11px] text-gray-500 mb-3">为某一个专班给同志赋项目角色（组织者 / 深度参与者）。<a href="./help.html#card-copy-assign-taskforce" class="text-sky-600 hover:underline" title="见帮助：项目赋权 · 专班（本位 / 赋权口径）">见帮助 · 专班赋权</a></p>
    <div id="tf-auth-panel"></div>
  </div>`;

/** 情景①a 挂载（支书台「党小组与活动」tab 调用；宿主＝「党小组清单」卡内）：组长指派 */
export function mountLeaderAssign(host) {
  if (!host) return;
  host.innerHTML = LEADER_ASSIGN_HTML;
  const assignArea = document.getElementById('assign-area');
  const btn = document.getElementById('ws-sec-assign-btn');
  btn?.addEventListener('click', () => toggleAuthPanel(assignArea));
  // 面板展开态随模块自持：重渲染时按当前态对齐按钮文案并重建面板（避免「文案/面板」不同步）
  if (authPanel.open && assignArea) { if (btn) btn.textContent = '收起面板'; renderAuthPanel(assignArea); }
  renderAssignLeaders();
}

/** 情景①b 挂载（支书台「支委会」tab 调用；宿主＝「机构构成」段内 `#cm-commissioner-host`）：
 *  支委身份配置（组织 / 宣传 / 纪检委员）——支部班子配置，可改派、可撤销。 */
export function mountCommissionerAssign(host) {
  if (!host) return;
  host.innerHTML = COMMISSIONER_ASSIGN_HTML;
  renderCommissionerAssign();
}

/** 情景② ＋ 情景③ 挂载（支书台「党小组与活动」tab 调用）——
 *  支书台＝赋权「统一入口」（母本 CDF §D.1.1 / `D-434`：「支书在三个情景里都可介入」）：本台同时挂情景②
 *  （活动项目赋权）与情景③（专班赋权，支书亦可）；情景③ 在此台属**非本位操作** ⇒ 写入前弹本位 nudge。 */
export function mountActivityProjectAuth(host) {
  if (!host) return;
  host.innerHTML = ACTIVITY_AUTH_HTML + TF_AUTH_HTML;
  _renderAuthBlock(PROJECT_AUTH_BLOCKS.find(c => c.key === 'activity'));
  _renderAuthBlock(PROJECT_AUTH_BLOCKS.find(c => c.key === 'taskforce'));
}

/** 情景③ 挂载（组织委员台「专班管理」调用；本台即本位 ⇒ 操作人不弹 nudge） */
export function mountTaskforceProjectAuth(host) {
  if (!host) return;
  host.innerHTML = TF_AUTH_HTML;
  _renderAuthBlock(PROJECT_AUTH_BLOCKS.find(c => c.key === 'taskforce'));
}

/** 渲染当前党小组组长列表（数字一致性审计 2026-08-07：主源 = PEOPLE 预设 + 审计快照运行时授予，与 renderAuthRecords 同源） */
function renderAssignLeaders() {
  const listEl = document.getElementById('assign-leaders-list');
  if (!listEl) return;
  const presetLeaders = PEOPLE.filter(p => p.role === 'leader');
  const granted = AuthStore.getAuthorizations().filter(r => r.role === 'leader' && r.action !== 'revoke');
  const grantedById = {};
  granted.forEach(g => { grantedById[g.targetPersonId] = g; }); // 按人去重（后写覆盖）

  const rows = [];
  presetLeaders.forEach(p => rows.push({ person: p, record: null, preset: true, name: getPersonName(p.id) || p.name || p.id }));
  Object.values(grantedById).forEach(g => {
    const person = getPersonById(g.targetPersonId);
    // 已预设组长不重复列出（与 renderAuthRecords 一致）
    if (!person || person.role !== 'leader') {
      rows.push({
        person: person || { id: g.targetPersonId, name: g.targetPersonId },
        record: g,
        preset: false,
        name: getPersonName(g.targetPersonId) || (person && person.name) || g.targetPersonId,
      });
    }
  });

  // 统一检索引擎（按人；≤8 行引擎自动不渲染检索条）
  renderFilteredList(listEl, {
    stateKey: 'secretary-assign-leaders',
    rows,
    keyword: personKeyword(),
    facets: personFacets({ roleLabel: roleLabelOf }),
    countUnit: '人',
    listClass: 'space-y-1',
    emptyMessage: '暂无党小组组长记录',
    rowHtml: ({ person, record, preset, name }) => {
      const personName = name;
      const groupName = record ? (record.scopeRef || '未指定') : (person.partyGroup || '未指定');
      return `
      <div class="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-white transition-colors group">
        <div class="accent-avatar w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold">${personName.charAt(0)}</div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-sm font-medium text-gray-700">${personName}</span>
            ${badgeHtml('党小组组长', 'danger')}
            ${preset ? '<span class="text-xs text-gray-500" title="预设＝该组长身份出厂即随成员档案、非本次系统内赋权；系统内赋权的组长列在「设党小组组长」面板内并带「撤销」">预设</span>' : ''}
          </div>
          <p class="text-xs text-gray-500 mt-0.5">${groupName}${record ? ' · ' + record.authorizedAt : ''}</p>
        </div>
      </div>
    `;
    },
  });
}

// ── 项目角色赋权（organizer/deep，2026-08-02 自 members.html 迁入支书工作台） ──
// 2026-09-23（裁定乙）：按「情景② 活动 / 情景③ 专班」**分两块**——两者本位不同（活动＝党小组组长、
//   专班＝组织委员），故各配一套表单；同一套写法由 `_renderAuthBlock(cfg)` 承载（不复制两遍模板）。
//   选人规范 §2.2：被赋权人选择用 PersonPicker（姓名/学号搜索）。
// 2026-09-30 批次 303：角色清单收敛到 `core/domain/constants.js::PROJECT_ROLES`（单一源，写入表单同用）；
//   台账术语统称「**项目**」（活动 ∪ 专班，「活动和专班是并列的」⇒ 不再写「活动项目」）。

/** 两块（情景② / 情景③）的钩子 id 与数据源；`key==='activity'` 沿用既有 id（外部深链/台账按它取） */
const PROJECT_AUTH_BLOCKS = [
  {
    key: 'activity', label: '活动',
    panelId: 'project-auth-panel',
    pickerId: 'project-auth-picker-container',
    selectId: 'project-id-select',
    roleName: 'project-role',
    btnId: 'confirm-project-auth-btn',
    recordsId: 'project-auth-records-list',
    recordsStateKey: 'secretary-project-auth-records',
  },
  {
    key: 'taskforce', label: '专班',
    panelId: 'tf-auth-panel',
    pickerId: 'tf-auth-picker-container',
    selectId: 'tf-project-select',
    roleName: 'tf-role',
    btnId: 'confirm-tf-auth-btn',
    recordsId: 'tf-auth-records-list',
    recordsStateKey: 'secretary-tf-auth-records',
  },
];

/** PersonPicker 实例（每块一个；destroy 后重建，避免全局刷新丢失输入） */
const _authPickers = { activity: null, taskforce: null };

/** 项目下拉选项：活动＝date 降序；专班＝createdAt 降序（T223 新者在前） */
function _projectOptionsOf(key) {
  if (key === 'taskforce') {
    return TaskForceRecordStore.getAll()
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .map(tf => `<option value="${tf.id}" data-type="taskforce">${tf.name}</option>`).join('');
  }
  return [...loadActivities()]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .map(a => `<option value="${a.id}" data-type="activity">${a.title}（${a.date}）</option>`).join('');
}

function _renderAuthBlock(cfg) {
  const container = document.getElementById(cfg.panelId);
  if (!container) return;

  container.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
      <div>
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">选择被赋权人</label>
        <div id="${cfg.pickerId}"></div>
      </div>
      <div>
        <label class="text-xs text-gray-500 mb-1.5 block font-medium" for="${cfg.selectId}">选择${cfg.label}</label>
        <select id="${cfg.selectId}" class="input-flat w-full">
          ${_projectOptionsOf(cfg.key)}
        </select>
      </div>
      <div>
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">选择项目角色</label>
        <div class="flex gap-4 pt-1.5">
          ${PROJECT_ROLES.map(r => `
            <label class="flex items-center gap-2 text-xs">
              <input type="radio" name="${cfg.roleName}" value="${r}" class="radio-accent">
              <span>${ROLE_LABELS[r] || r}</span>
            </label>
          `).join('')}
        </div>
      </div>
    </div>
    <button id="${cfg.btnId}" type="button" class="btn-accent text-sm px-4 py-[7px]">
      确认赋权
    </button>
    <div class="mt-4 pt-3.5 border-t border-gray-100">
      <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-2">已赋权记录 · ${cfg.label}</h4>
      <div id="${cfg.recordsId}"></div>
    </div>
  `;

  // 选人规范 §2.2：被赋权人选择用 PersonPicker（姓名/学号搜索），替换原 select 罗列人名
  // 候选被赋权人：排除支委（支委为常设角色，无需被赋权项目角色）
  _authPickers[cfg.key]?.destroy();
  _authPickers[cfg.key] = new PersonPicker({
    mode: 'single',
    placeholder: '搜索姓名或学号选择被赋权人',
    filter: p => !AuthStore.isCommissioner(p.role),
    accentColor: _accentHex(),
    onSelect: () => {},
  });
  _authPickers[cfg.key].render(document.getElementById(cfg.pickerId));

  bindConfirmProjectAuth(cfg);
  renderProjectAuthRecords(cfg);
}

/** 确认项目赋权（organizer/deep）——两块共用同一套写法，仅钩子与项目源不同 */
function bindConfirmProjectAuth(cfg) {
  const btn = document.getElementById(cfg.btnId);
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const personId = (_authPickers[cfg.key]?.getSelected() || [])[0] || '';
    const projectId = document.getElementById(cfg.selectId)?.value;
    const role = document.querySelector(`input[name="${cfg.roleName}"]:checked`)?.value;

    if (!personId) { showToast('error', '请选择被赋权人'); return; }
    if (!projectId) { showToast('error', '请选择项目'); return; }
    if (!role) { showToast('error', '请选择角色'); return; }

    // 本位 nudge（2026-09-27 支书裁定「两处都加」· 单一源 `components/ui/modal.js::confirmNudge`）：
    //   情景② 活动项目赋权本位＝党小组组长、情景③ 专班赋权本位＝组织委员（判据 `_isAuthHomeRole`）⇒ 操作人
    //   不是本位时，**写库前**弹一次确认（必须点按钮才能关；「取消」＝放弃本次赋权）。本位操作人不弹、零打扰。
    if (!_isAuthHomeRole(cfg.key)) {
      const _projLabel = document.getElementById(cfg.selectId)?.selectedOptions?.[0]?.textContent?.trim() || '';
      const _homeOk = await confirmNudge({
        nudgeKey: cfg.key === 'taskforce' ? 'assign-taskforce' : 'assign-activity',
        context: _projLabel,
      });
      if (!_homeOk) return;
    }

    const result = await AuthStore.authorize(
      AuthStore.getCurrentUser()?.personId,
      personId,
      role,
      { projectId }
    );

    if (result.ok) {
      showToast('success', '项目角色赋权成功');
      renderProjectAuthRecords(cfg);
    } else if (result.id) {
      showToast('warn', '该同志在此项目已有相同角色赋权');
    } else {
      showToast('error', '赋权失败，您可能无权赋权该角色');
    }
  });
}

/** 渲染本块项目角色赋权记录（organizer/deep + 撤销）；按 scopeRef 归属活动 / 专班分流 */
function renderProjectAuthRecords(cfg) {
  const listEl = document.getElementById(cfg.recordsId);
  if (!listEl) return;

  const tfById = new Map(TaskForceRecordStore.getAll().map(t => [t.id, t]));
  const records = AuthStore.getAuthorizations().filter(r => {
    if (!['organizer', 'deep'].includes(r.role) || !r.scopeRef) return false;
    return cfg.key === 'taskforce' ? tfById.has(r.scopeRef) : !tfById.has(r.scopeRef);
  });

  // 统一检索引擎（按人：被赋权人姓名；≤8 行引擎自动不渲染检索条）
  const rows = records.map(r => {
    const project = loadActivities().find(a => a.id === r.scopeRef) || tfById.get(r.scopeRef);
    return {
      ...r,
      name: getPersonName(r.targetPersonId) || r.targetPersonId,
      _personName: getPersonName(r.targetPersonId) || r.targetPersonId,
      _projectName: project ? (project.title || project.name) : r.scopeRef,
      _roleLabel: ROLE_LABELS[r.role] || r.role,
    };
  });
  renderFilteredList(listEl, {
    stateKey: cfg.recordsStateKey,
    rows,
    keyword: personKeyword(),
    facets: personFacets({ roleLabel: roleLabelOf }),
    countUnit: '人',
    listClass: 'space-y-0',
    emptyMessage: `暂无${cfg.label}项目角色赋权记录`,
    rowHtml: (r) => `
      <div class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
        <div>
          <a href="${getBasePath()}person.html?id=${encodeURIComponent(r.targetPersonId)}" class="text-sm font-medium text-gray-700 hover:underline hover:text-sky-700 transition-colors" title="查看完整档案">${esc(r._personName)}</a>
          <span class="text-xs text-gray-500 ml-2">${r._projectName}</span>
          <span class="badge ml-2" style="--acc-bg-dark:rgba(248,113,113,0.16);--acc-text-dark:#F87171;--acc-border-dark:rgba(248,113,113,0.35);background:var(--primary-100);color:var(--primary-800);">${r._roleLabel}</span>
          <span class="text-xs text-gray-500 ml-2">${r.authorizedAt || ''}</span>
        </div>
        <button type="button" class="btn-ghost revoke-project-auth text-xs" data-record-id="${r.id}">撤销</button>
      </div>
    `,
  });

  // 撤销事件委托（引擎筛选重渲染后仍可点）；dataset 守卫防重复绑定
  if (!listEl.dataset.revokeBound) {
    listEl.dataset.revokeBound = '1';
    listEl.addEventListener('click', async (e) => {
      const btn = e.target.closest('.revoke-project-auth');
      if (!btn) return;
      if (await AuthStore.revokeAuthorization(btn.dataset.recordId)) {
        showToast('success', '已撤销赋权');
        renderProjectAuthRecords(cfg);
      }
    });
  }
}

// ════════════════════════════════════════════════════════════════
//  常设赋权面板
//  功能：设党小组组长 — 选择人员 → 选择党小组 → 确认赋权
//  当前党小组组长列表（只读）
// ════════════════════════════════════════════════════════════════

/** 赋权面板状态 */
const authPanel = {
  open: false,
  selectedPersonId: null,
  selectedGroup: null,
  personPicker: null,
};

/** 切换赋权面板展开/收起 */
function toggleAuthPanel(assignArea) {
  authPanel.open = !authPanel.open;
  const btn = document.getElementById('ws-sec-assign-btn');
  if (authPanel.open) {
    if (btn) btn.textContent = '收起面板';
    renderAuthPanel(assignArea);
  } else {
    if (btn) btn.textContent = '设党小组组长';
    const panel = document.getElementById('auth-panel-container');
    if (panel) panel.remove();
    if (authPanel.personPicker) {
      authPanel.personPicker.destroy();
      authPanel.personPicker = null;
    }
  }
}

/** 渲染常设赋权面板 */
function renderAuthPanel(assignArea) {
  const oldPanel = document.getElementById('auth-panel-container');
  if (oldPanel) oldPanel.remove();

  const panel = document.createElement('div');
  panel.id = 'auth-panel-container';
  panel.className = 'rounded-xl p-6 mt-4 bg-white';

  let html = '';

  // 1. 人员选择
  html += `<div class="mb-4">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">选择同志 <span class="text-red-600">*</span></label>`;
  html += `<div id="auth-person-picker-slot"></div>`;
  html += `</div>`;

  // 2. 党小组选择（组清单渲染时现取 groupOptions()，新增/改名的组立刻可见；此处属表单字段选择，保留 chip 形态）
  const partyGroups = groupOptions();
  html += `<div class="mb-5">`;
  html += `<label class="text-xs text-gray-500 mb-1.5 block font-medium">指定为党小组组长 <span class="text-red-600">*</span></label>`;
  html += `<div class="flex gap-2">`;
  partyGroups.forEach(group => {
    const isSelected = authPanel.selectedGroup === group;
    const cls = `chip-option text-sm px-4 py-2 rounded-lg ${isSelected ? 'chip-accent-on font-medium' : ''}`;
    html += `<button data-auth-action="select-group" data-value="${group}" class="btn-tab ${cls}"${isSelected ? ' style="--acc-text-dark:color-mix(in srgb, var(--app-accent) 55%, #fff)"' : ''}>${group}</button>`;
  });
  html += `</div>`;
  html += `</div>`;

  // 3. 确认按钮
  html += `<button data-auth-action="confirm" class="btn-accent text-sm px-4 py-[7px] font-medium">确认设为党小组组长</button>`;

  // ── 分隔线 ──
  html += `<div class="border-t border-gray-100 mt-6 pt-4">`;
  html += `<h4 class="font-title-cn text-sm font-bold text-gray-700 mb-3">当前党小组组长</h4>`;
  html += `<div id="auth-records-list"></div>`;
  html += `</div>`;

  panel.innerHTML = html;
  assignArea.appendChild(panel);

  // 初始化 PersonPicker
  const pickerSlot = document.getElementById('auth-person-picker-slot');
  if (pickerSlot) {
    if (authPanel.personPicker) authPanel.personPicker.destroy();
    authPanel.personPicker = new PersonPicker({
      mode: 'single',
      placeholder: '选择同志',
      accentColor: _accentHex(),
      onSelect: (ids) => {
        authPanel.selectedPersonId = ids[0] || null;
      },
    });
    if (authPanel.selectedPersonId) {
      authPanel.personPicker.setSelected([authPanel.selectedPersonId]);
    }
    authPanel.personPicker.render(pickerSlot);
  }

  // 绑定事件
  panel.querySelectorAll('[data-auth-action]').forEach(el => {
    el.addEventListener('click', handleAuthAction);
  });

  renderAuthRecords();
}

/** 处理常设赋权面板操作 */
function handleAuthAction(e) {
  const btn = e.currentTarget;
  const action = btn.dataset.authAction;

  switch (action) {
    case 'select-group': {
      authPanel.selectedGroup = btn.dataset.value;
      break;
    }
    case 'confirm': {
      handleConfirmLeader();
      return;
    }
    default:
      return;
  }

  const assignArea = document.getElementById('assign-area');
  if (assignArea) renderAuthPanel(assignArea);
}

/** 确认设为党小组组长 */
async function handleConfirmLeader() {
  if (!authPanel.selectedPersonId) {
    showToast('error', '请选择同志');
    return;
  }
  if (!authPanel.selectedGroup) {
    showToast('error', '请选择党小组');
    return;
  }

  // 本位 nudge（2026-09-27 · 情景① 常设赋权本位＝支书 / 副支书〔副书同权〕）⇒ 非本位操作人写库前弹确认。
  if (!_isAuthHomeRole('standing')) {
    const _homeOk = await confirmNudge({ nudgeKey: 'assign-leader', context: getPersonName(authPanel.selectedPersonId) || '' });
    if (!_homeOk) return;
  }

  // 调用 AuthStore，role='leader', scope='group', scopeRef=党小组名
  const result = await AuthStore.authorize(
    AuthStore.getCurrentUser()?.personId,
    authPanel.selectedPersonId,
    'leader',
    { projectId: authPanel.selectedGroup },
  );

  if (result.ok) {
    const person = getPersonById(authPanel.selectedPersonId);
    const personName = person ? person.name : authPanel.selectedPersonId;
    showToast('success', `已将 ${personName} 设为 ${authPanel.selectedGroup} 组长`);

    // 做事即销待办：常设赋权完成 → 销支书「设置党小组组长」待办（按 scope=leader 匹配）
    TodoStore.getAll()
      .filter(t => t.role === 'secretary' && t.actionData?.scope === 'leader' && t.status !== 'completed')
      .forEach(t => TodoStore.complete(t.id));

    authPanel.selectedPersonId = null;
    authPanel.selectedGroup = null;

    const assignArea = document.getElementById('assign-area');
    if (assignArea) renderAuthPanel(assignArea);
  } else {
    if (result.id) {
      showToast('warn', '该同志已是该党小组组长');
    } else {
      showToast('error', '设置失败，请检查参数');
    }
  }
}

/** 渲染当前党小组组长列表（主源 = PEOPLE 预设 role:'leader' + 审计快照运行时授予） */
function renderAuthRecords() {
  const listEl = document.getElementById('auth-records-list');
  if (!listEl) return;

  // 常设组长主源 = PEOPLE role:'leader'（预设）；运行时授予 = 审计快照 role:'leader'
  const presetLeaders = PEOPLE.filter(p => p.role === 'leader');
  const granted = AuthStore.getAuthorizations().filter(r => r.role === 'leader' && r.action !== 'revoke');
  const grantedById = {};
  granted.forEach(g => { grantedById[g.targetPersonId] = g; });
  const grantedUnique = Object.values(grantedById); // 按人去重（grant→revoke→grant 周期后取最新一条）

  const rows = [];
  presetLeaders.forEach(p => {
    rows.push({ person: p, record: null, name: getPersonName(p.id) || p.name || p.id });
  });
  grantedUnique.forEach(g => {
    const person = getPersonById(g.targetPersonId);
    if (!person || person.role !== 'leader') {
      rows.push({
        person: person || { id: g.targetPersonId, name: g.targetPersonId },
        record: g,
        name: getPersonName(g.targetPersonId) || (person && person.name) || g.targetPersonId,
      });
    }
  });

  // 统一检索引擎（按人；≤8 行引擎自动不渲染检索条）
  renderFilteredList(listEl, {
    stateKey: 'secretary-assign-leaders-panel',
    rows,
    keyword: personKeyword(),
    facets: personFacets({ roleLabel: roleLabelOf }),
    countUnit: '人',
    listClass: 'space-y-1',
    emptyMessage: '暂无党小组组长记录',
    rowHtml: ({ person, record, name }) => {
      const personName = name;
      const groupName = record ? (record.scopeRef || '未指定') : (person.partyGroup || '未指定');
      const revokeBtn = record
        ? `<button type="button" data-auth-action="revoke" data-record-id="${record.id}" class="btn-ghost text-xs ml-2 flex-shrink-0 px-3 py-1.5">撤销</button>`
        : '<span class="text-xs text-gray-500 ml-2 flex-shrink-0">预设</span>';

      return `
      <div class="flex items-center justify-between py-2.5 px-3 rounded-lg bg-white transition-colors group">
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <div class="accent-avatar w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold">
            ${personName.charAt(0)}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <a href="${getBasePath()}person.html?id=${encodeURIComponent(person.id)}" class="text-sm font-medium text-gray-700 hover:underline hover:text-sky-700 transition-colors" title="查看完整档案">${esc(personName)}</a>
              ${badgeHtml('党小组组长', 'danger')}
            </div>
            <p class="text-xs text-gray-500 mt-0.5">${groupName}${record ? ' · ' + (record.authorizedAt || '') : ''}</p>
          </div>
        </div>
        ${revokeBtn}
      </div>
    `;
    },
  });

  // 撤销事件委托（引擎筛选重渲染后仍可点）；dataset 守卫防重复绑定
  if (!listEl.dataset.revokeBound) {
    listEl.dataset.revokeBound = '1';
    listEl.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-auth-action="revoke"]');
      if (!btn) return;
      const recordId = btn.dataset.recordId;
      if (await AuthStore.revokeAuthorization(recordId)) {
        showToast('success', '已撤销党小组组长');
        renderAuthRecords();
      } else {
        showToast('error', '撤销失败');
      }
    });
  }
}

// ════════════════════════════════════════════════════════════════
//  情景① · 支委身份配置（2026-09-23 支书裁定：「最初只有党委给支书配置，其余身份由支书配置」；副书同权）
//  · 写口单一源＝services/branch/appointment.js（appointBranchCommissioner / revokeBranchCommissioner /
//    listBranchCommissioners）——本处只渲染表单与清单，**不直接改 mockDB**；
//  · 可授予身份白名单单一源＝core/domain/constants.js::BRANCH_COMMISSIONER_ASSIGNABLE_ROLES（组织 / 宣传 / 纪检委员）；
//    支书本人与副支书的身份归党委（`D-585`）⇒ 既不进白名单、也不进候选人名单。
// ════════════════════════════════════════════════════════════════

/** 本支部 id（登录人归属；缺省 br-b1，与全仓同口径） */
function _myBranchId() {
  const me = getPersonById(AuthStore.getCurrentUser()?.personId);
  return (me && me.branchId) || 'br-b1';
}

/** 支委身份配置的 PersonPicker 实例与当前选中人（重渲染时 destroy 后重建，避免全局刷新丢输入） */
let _bcPicker = null;
let _bcSelectedPersonId = null;

/** 渲染支委身份配置块（表单 + 本支部现任支委身份清单） */
function renderCommissionerAssign() {
  const host = document.getElementById('bc-assign-area');
  if (!host) return;
  const bid = _myBranchId();
  host.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
      <div>
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">选择本支部在册成员 <span class="text-red-600">*</span></label>
        <div id="bc-picker-slot"></div>
      </div>
      <div>
        <label class="text-xs text-gray-500 mb-1.5 block font-medium">要授予的支委身份 <span class="text-red-600">*</span></label>
        <div class="flex gap-3 pt-1 flex-wrap">
          ${BRANCH_COMMISSIONER_ASSIGNABLE_ROLES.map((r) => `
            <label class="flex items-center gap-2 text-xs">
              <input type="radio" name="bc-role" value="${r}" class="radio-accent">
              <span>${ROLE_LABELS[r] || r}</span>
            </label>`).join('')}
        </div>
        <p class="text-[11px] text-gray-500 mt-1">支书 / 副支书身份由党委配置，不在本表</p>
      </div>
    </div>
    <button id="bc-assign-confirm" type="button" class="btn-accent text-sm px-4 py-[7px]">确认授予 / 改派</button>
    <div class="border-t border-gray-100 mt-5 pt-4">
      <h4 class="font-title-cn text-sm font-bold text-gray-700 mb-2">当前支委身份（本支部）</h4>
      <div id="bc-assign-list"></div>
    </div>
  `;

  // 候选＝本支部在册成员；排除支书 / 副支书（一把手层身份由党委配置，不在此处改）
  _bcPicker?.destroy();
  _bcPicker = new PersonPicker({
    mode: 'single',
    placeholder: '搜索姓名或学号选择同志',
    filter: (p) => (p.branchId || 'br-b1') === bid && p.role !== 'secretary' && p.role !== 'deputy-secretary',
    accentColor: _accentHex(),
    onSelect: (ids) => { _bcSelectedPersonId = ids[0] || null; },
  });
  if (_bcSelectedPersonId) _bcPicker.setSelected([_bcSelectedPersonId]);
  _bcPicker.render(document.getElementById('bc-picker-slot'));

  document.getElementById('bc-assign-confirm')?.addEventListener('click', async () => {
    const personId = (_bcPicker?.getSelected() || [])[0] || '';
    const role = document.querySelector('input[name="bc-role"]:checked')?.value || '';
    if (!personId) { showToast('error', '请选择本支部在册成员'); return; }
    if (!role) { showToast('error', '请选择要授予的支委身份'); return; }
    // 本位 nudge（2026-09-27 · 情景① 常设赋权本位＝支书 / 副支书）⇒ 非本位操作人写库前弹确认。
    if (!_isAuthHomeRole('standing')) {
      const _homeOk = await confirmNudge({ nudgeKey: 'assign-leader', context: getPersonName(personId) || '' });
      if (!_homeOk) return;
    }
    const res = await appointBranchCommissioner({ branchId: bid, personId, role });
    if (!res || !res.ok) { showToast('error', `配置失败：${(res && res.reason) || '未知原因'}`); return; }
    showToast('success', `已将 ${getPersonName(personId)} 配置为${ROLE_LABELS[role] || role}（可改派 / 可撤销）`);
    _bcSelectedPersonId = null;
    renderCommissionerAssign();
  });

  renderCommissionerList(bid);
}

/** 渲染本支部现任支委身份清单（现值单一源＝成员档案 role；撤销经写口服务层） */
function renderCommissionerList(bid) {
  const listEl = document.getElementById('bc-assign-list');
  if (!listEl) return;
  const rows = listBranchCommissioners(bid).map((r) => {
    const name = r.name || getPersonName(r.personId);
    return { ...r, name, _roleLabel: r.roleLabel, _since: r.record ? (r.record.authorizedAt || '') : '' };
  });
  renderFilteredList(listEl, {
    stateKey: 'secretary-assign-commissioners',
    rows,
    keyword: personKeyword(),
    facets: personFacets({ roleLabel: roleLabelOf }),
    countUnit: '人',
    listClass: 'space-y-1',
    emptyMessage: '本支部暂无组织 / 宣传 / 纪检委员记录',
    rowHtml: (r) => `
      <div class="flex items-center justify-between py-2.5 px-3 rounded-lg bg-white transition-colors group">
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <div class="accent-avatar w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold">${esc(r.name).charAt(0)}</div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <a href="${getBasePath()}person.html?id=${encodeURIComponent(r.personId)}" class="text-sm font-medium text-gray-700 hover:underline hover:text-sky-700 transition-colors" title="查看完整档案">${esc(r.name)}</a>
              ${badgeHtml(r._roleLabel, 'danger')}
            </div>
            ${r._since ? `<p class="text-xs text-gray-500 mt-0.5">赋权于 ${esc(r._since)}</p>` : ''}
          </div>
        </div>
        <button type="button" class="btn-ghost bc-revoke text-xs ml-2 flex-shrink-0 px-3 py-1.5" data-person-id="${esc(r.personId)}" data-role="${esc(r.role)}">撤销</button>
      </div>
    `,
  });

  // 撤销事件委托（引擎筛选重渲染后仍可点）；dataset 守卫防重复绑定
  if (!listEl.dataset.revokeBound) {
    listEl.dataset.revokeBound = '1';
    listEl.addEventListener('click', async (e) => {
      const btn = e.target.closest('.bc-revoke');
      if (!btn) return;
      const res = await revokeBranchCommissioner({ branchId: _myBranchId(), personId: btn.dataset.personId, role: btn.dataset.role });
      if (res && res.ok) {
        showToast('success', '已撤销该支委身份（回落普通参与者）');
        renderCommissionerAssign();
      } else {
        showToast('error', `撤销失败：${(res && res.reason) || '未知原因'}`);
      }
    });
  }
}
