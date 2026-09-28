// role: [工程师]+[AI]
// entries/settings-entry.js — 设置中心页（批1骨架，支书 2026-09-09 批准设计 v3）
// 左分组栏依据当前登录角色显隐（本批即生效）：
//   访客                    → 仅「外观」
//   支书 / 副支书             → 个人设置(外观/我的工作台) + 支部治理(支部信息与向导/工作台默认顺序/支部制度参数)
//   纪检(dis)/组织(org)/组长  → 个人设置 + 支部治理(域参数·纪检/组织/组长)
//   宣传(prop)/成员(participant等) → 个人设置（无支部治理分组）
//   党委(party-staff)        → 个人设置 + 支部治理(快捷块说明)
// 右内容区随左栏选中切换：外观（批1）/ 我的工作台（批2）/ 支部治理（批3：支部信息与向导 + 工作台默认顺序，
// 副书同权 2026-09-09 支书批；批4：支部制度参数只读卡 + 域参数三卡）已功能开放；仅党委台
// 「支部治理·快捷块说明」仍建设中（分组结构可见性即角色化验收点）。
// 登录态：非纯静态——readLoginSnapshot() + 动态 import auth（同 sidebar.js 模式）。

import { renderSidebar } from '../components/shell/sidebar.js?v=20260928h';
import { renderHeader } from '../components/shell/header.js?v=20260928h';
import { readLoginSnapshot } from '../core/login-snapshot.js?v=20260928h';
import { ROLE_LABELS, ROLE_PAGE_MAP, getAccentColors } from '../core/constants.js?v=20260928h';
import { resolveAppliedAccentRole } from '../core/theme.js?v=20260928h';
import { appearanceControlsHTML, bindAppearanceControls } from '../components/shell/appearance-controls.js?v=20260928h';
import { icon } from '../core/icons.js?v=20260928h';
import { badgeHtml } from '../components/ui/badges.js?v=20260928h';
import { escHtml as esc } from '../core/utils.js?v=20260928h';
import { getCapabilities } from '../core/registry.js?v=20260928h';
import {
  coreTabIdsOf, sameIdOrder, applyPersonalTabOrder, readPersonalTabOrder,
  savePersonalTabOrder, resetPersonalTabOrder,
} from '../services/core/preferences.js?v=20260928h';
// 批4（2026-09-09 支书批「域参数」）：制度默认单一源 = policy-defaults（设置页展示「制度默认」行与域参数默认值）
import { POLICY_DEFAULTS, ACTIVITY_APPROVAL_MODES, ACTIVITY_APPROVAL_MODE_LABELS } from '../core/policy-defaults.js?v=20260928h';
// 数据层初始化（2026-09-09 冒烟修复，同 wizard/search 独立页模式）：设置页治理区（支部信息/默认顺序/
// 制度参数/域参数）与「我的工作台」需读支部配置——注册适配器并恢复本地 mock 数据（或 API 模式 init），
// 否则整页加载后 mockDB 恒空 → 治理区误显「未找到您所属支部」且写口（保存默认顺序/域参数）不可达。
import { BranchService } from '../services/core/runtime.js?v=20260928h';
import { hydrateDataSource } from '../core/data-adapter.js?v=20260928h';
import { ApiAdapter } from '../core/api-adapter.js?v=20260928h';

// 2026-09-09 支部归属显式化/审计内核：变更记录展示与回滚按钮需要操作者姓名、单键回滚白名单
import { getPersonName } from '../services/member/person.js?v=20260928h';
import { CONFIG_ROLLBACK_KEYS } from '../core/config-clean.js?v=20260928h';
// 2026-09-23 支书批「判别依据可感」：「当前形态 · 归属判定」卡的数据源 = branch.getAffiliationShape
// （数据源/判定段/支部 id 单一源，判定逻辑不在此复制第二遍）
import { getAffiliationShape } from '../services/branch/branch.js?v=20260928h';

// 支部治理区归属缺失统一文案（2026-09-09 支书批「未绑定支部」口径：支部语境一律 getBoundBranch 判定，
// 不再回退示例支部 br-b1；由党委在『支部管理』中确认归属后才可见本支部治理内容）
const GOV_NO_BRANCH_TEXT = '未找到您所属支部——请先由党委在『支部管理』中确认归属。';

// ── 数据层按需加载（同 sidebar staticShell 模式：确已登录才动态 import auth）──
let _authModule = null;
function loadAuth() {
  if (!_authModule) _authModule = import('../services/core/auth.js?v=20260928h');
  return _authModule;
}

// ═══════════════ 左分组模型（角色 × 分组显隐矩阵）═══════════════
const WORKSPACE_ROLES = new Set(Object.keys(ROLE_PAGE_MAP.workspace)); // 有工作台页面 → 显示「我的工作台」

const SECRETARY_GOV = [
  { id: 'branch-info-wizard', label: '支部信息与向导' },
  { id: 'branch-default-tab-order', label: '工作台默认顺序' },
  { id: 'branch-policy-params', label: '支部制度参数' },
  { id: 'branch-config-history', label: '配置变更记录' },
];
// 支部治理分组按角色（键=常设角色；未列出角色 = 无该分组）
const GOVERNANCE_BY_ROLE = {
  'secretary': SECRETARY_GOV,
  'deputy-secretary': SECRETARY_GOV,
  'disc-commissioner': [{ id: 'domain-disc', label: '纪检职责参数' }],
  'org-commissioner': [{ id: 'domain-org', label: '组织职责参数' }],
  leader: [{ id: 'domain-leader', label: '组长职责参数' }],
  'party-staff': [{ id: 'party-staff-shortcut', label: '支部治理 · 快捷块说明' }],
};

/** 构建左分组栏：个人设置（外观/我的工作台）+ 支部治理（按角色） */
function buildGroups(role) {
  const personal = [{ id: 'appearance', label: '外观' }];
  if (WORKSPACE_ROLES.has(role)) personal.push({ id: 'my-workspace', label: '我的工作台' });
  const groups = [{ caption: '个人设置', items: personal }];
  const gov = GOVERNANCE_BY_ROLE[role];
  if (gov && gov.length) groups.push({ caption: '支部治理', items: gov });
  return groups;
}

// 就近深链（2026-09-17 支书已裁「只做就近深链」）：工作台里「本域参数 → 设置」按 #<分区 id> 直接落在
// 对应分区（不落设置首页）。哈希不是本角色本次可见的分区（含非法/手输）一律回落「外观」——本函数只决定
// 初始选中区，不改分区清单、不改各区分发条件（发牌仍由 buildGroups 单一源决定）。
function initialSectionFromHash(role) {
  let id = '';
  try { id = decodeURIComponent(String(location.hash || '').replace(/^#/, '')); } catch { id = ''; }
  if (!id) return 'appearance';
  return buildGroups(role).some(g => g.items.some(it => it.id === id)) ? id : 'appearance';
}

// 各区元数据（占位文案写明所属批次与功能口径，避免"空白页面"）
const SECTION_META = {
  'appearance': { title: '外观', batch: '', badge: '', desc: '', html: null },
  'my-workspace': {
    title: '我的工作台', batch: '批 2', badge: '',
    desc: '个人工作台标签顺序：默认沿用工作台默认顺序；个人调整仅作用于当前账号。核心组「工作台」页签（今天/待办/工作概况等）固定、不可隐藏或排序。',
    note: '拖拽或上移/下移调整顺序，可逐行或一键恢复默认；调整即时保存。',
  },
  'branch-info-wizard': {
    title: '支部信息与向导', batch: '批 3', badge: '',
    desc: '支部档案信息查看与「更换组织向导」入口（在本页直接打开组织配置向导）。',
    note: '支书 / 副支书（副书同权）在本页进入组织配置向导。',
  },
  'branch-default-tab-order': {
    title: '工作台默认顺序', batch: '批 3', badge: '',
    desc: '由支书 / 副支书设定支部工作台默认标签顺序；核心功能组只读带锁，个人覆盖在「我的工作台」中调整。',
    note: '保存后全体成员下一刷新按新默认；恢复默认即回到系统默认（全部开启 + 系统默认排序）。',
  },
  'branch-policy-params': {
    title: '支部制度参数', batch: '批 4', badge: '',
    desc: '支部级制度参数（票决门槛 / 应到名单核对 / 会议考勤类型与不考勤的会议类型 / 考勤记录人 / 请假缺席标因）制度默认只读展示；参数不在设置页直改（改须支书/党委裁决后在系统层变更）。职责参数由各域负责人在专用卡片中调整。',
    note: '制度刚性锁定展示 + 职责参数按角色分发。',
  },
  'branch-config-history': {
    title: '配置变更记录', batch: '', badge: '',
    desc: '支部配置每次保存自动记账（谁 / 何时 / 改了哪一项 / 前后值 / 依据）；单键改动可回滚，回滚本身再记一条。',
    note: '只读列表（最新在前，展示最近 50 条；历史保留最近 100 条）；回滚仅限单键变更。',
  },
  'domain-disc': {
    title: '纪检职责参数', batch: '批 4', badge: '',
    desc: '纪检职责参数（考察超期 / 考勤与复盘时限 / 补课范围与时限）——纪检委员可调，纪检台与支书台提醒、判定随参数生效。',
    note: '参数卡片编辑 + 恢复默认。',
  },
  'domain-org': {
    title: '组织职责参数', batch: '批 4', badge: '',
    desc: '组织职责参数（学期末滞留复核窗口 / 思想汇报篇幅字数）——组织委员可调，支书待办窗口与提交页字数提示随参数生效。',
    note: '参数卡片编辑 + 恢复默认。',
  },
  'domain-leader': {
    title: '组长职责参数', batch: '批 4', badge: '',
    desc: '组长职责参数（学期组员进展自动归集提醒开关）——组长可调，组长台开学周提醒随参数生效。',
    note: '开关编辑 + 恢复默认。',
  },
  'party-staff-shortcut': {
    title: '支部治理 · 快捷块说明', batch: '批 3/4', badge: '建设中',
    desc: '党委组织员视角：跨支部治理的快捷块说明（支部治理面集中监控入口说明）。',
    note: '规划：随支部治理迁移批次补充快捷块内容。',
  },
};

// ═══════════════ 当前形态 · 归属判定（2026-09-23 支书批「判别依据可感」）═══════════════
// 支书原话：「我并不理解 有的地方显示成 示例组织，有的光华管理学院本科生党支部。这个判别依据/判别代码能
// 不能做得更加可感一点。因为我无法测试 api 模式！」→ 本卡把「顶栏那个组织名从哪来」摊开：
//   当前数据源（api/mock）+ 依据（sessionStorage 有无 API token，只判有/无、不显示原文）/
//   归属判定命中的段（1–5，业务语言 + 顶栏最终组织名）/ 所属支部 id / 登录人与角色 / 代码版本戳。
// 数据与判定单一源 = branch.getAffiliationShape（不复制判定）。
// 落点：挂在「外观」区（唯一全角色+访客都可见的分区）——不新增左栏分区，因分区数被
// S14 文档一致性锁定为 10（README-server.md / help.html §5.4 同源），故未登录也能自查形态。
/** 活动代码版本戳（取页面脚本的 ?v=；CODE_VERSION 未导出，故取能读到的那个） */
function _activeCodeStamp() {
  try {
    for (const s of document.querySelectorAll('script[src]')) {
      const m = /[?&]v=([\w.-]+)/.exec(s.getAttribute('src') || '');
      if (m) return m[1];
    }
  } catch (_) { /* 忽略 */ }
  return '未知';
}

/** 「当前形态 · 归属判定」卡（体例照既有卡；判定/数据源全部取自 getAffiliationShape） */
function shapeCardHtml() {
  const { personId, role } = _session;
  const shape = getAffiliationShape(personId || undefined);
  const isApi = shape.source === 'api';
  const who = personId
    ? `${getPersonName(personId) || '（档案缺姓名）'}（${personId}）· ${ROLE_LABELS[role] || role || '角色未知'}`
    : '未登录（访客）';
  const rows = [
    ['当前数据源',
      `${isApi ? 'api（已连服务器）' : 'mock（本地演示）'}`
      + `<div class="text-[11px] text-gray-500 mt-0.5">依据：sessionStorage 中<b>${shape.tokenPresent ? '有' : '无'}</b> API 登录 token（只判有/无，不显示内容）</div>`],
    ['归属判定',
      `命中第 ${shape.segment} 段 —— ${esc(shape.segmentLabel)}`
      + `<div class="text-[11px] text-gray-500 mt-0.5">顶栏最终组织名：${esc(shape.title)}</div>`],
    ['所属支部 id', shape.branchId ? esc(shape.branchId) : '无（未解析到有效归属支部）'],
    ['当前登录人 / 角色', esc(who)],
    ['代码版本戳', `?v=${esc(_activeCodeStamp())}`],
  ].map(([k, v]) => `<div class="kv-row"><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('');
  return `
    <div class="card rounded-xl p-5 mt-4">
      <div class="flex items-center gap-2.5 mb-2">
        <h2 class="font-title-cn text-base font-bold text-gray-800">当前形态 · 归属判定</h2>
        ${badgeHtml('自查', 'neutral')}
      </div>
      <p class="text-[13px] leading-relaxed text-gray-500 mb-4">「顶栏那个组织名从哪来」在这里摊开：数据源与依据、命中的归属段、所属支部、当前登录人与角色、代码版本戳，无需调试器即可自查。</p>
      <dl class="kv-list">${rows}</dl>
      <div class="hint-box mt-3.5">
        <span class="hint-dot"></span>
        「示例组织（未登录）」＝未登录/查无档案的第 5 段中性占位；「未绑定支部」＝已登录但档案无有效归属的第 4 段中性占位；两者都不代表真实支部名。
      </div>
    </div>`;
}

// ═══════════════ 渲染 =═══════════════
let _currentRole = '';
let _currentSectionId = 'appearance';

function renderGroups(container) {
  const groups = buildGroups(_currentRole);
  container.innerHTML = groups.map(g => `
    <div class="flex flex-col gap-1.5">
      <div class="mx-1 text-[11px] font-bold tracking-wide text-gray-500">${g.caption}</div>
      <div class="flex flex-col gap-0.5">
        ${g.items.map(it => `
          <button type="button" class="settings-group-item ${it.id === _currentSectionId ? 'active' : ''}" data-section="${it.id}">
            <span>${it.label}</span>
            ${SECTION_META[it.id]?.badge ? badgeHtml('建设中', 'neutral') : ''}
          </button>
        `).join('')}
      </div>
    </div>
  `).join('') + `
    <p class="mx-1 text-[11px] leading-relaxed text-gray-500">分区随登录身份显示——你只会看到与本人身份相关的区。</p>
    ${location.hash ? '<a href="#" id="settings-back-link" class="mx-1 text-xs text-[var(--app-accent)] underline">← 返回上一页</a>' : ''}`;
  container.querySelectorAll('.settings-group-item').forEach(btn => {
    btn.addEventListener('click', () => {
      _currentSectionId = btn.dataset.section;
      renderGroups(container);
      renderPanel(document.getElementById('settings-panel'));
    });
  });
  // 就近深链进来自带「返回上一页」（随左栏组一起渲染，位置在固定页眉之下、必定可点）
  const back = container.querySelector('#settings-back-link');
  if (back) back.addEventListener('click', (e) => { e.preventDefault(); history.back(); });
}

function renderPanel(panel) {
  const meta = SECTION_META[_currentSectionId] || SECTION_META['appearance'];
  if (_currentSectionId === 'appearance') {
    const loggedIn = !!_currentRole;
    const scopeNote = loggedIn
      ? '外观偏好随当前账号保存，切换登录人互不影响；未登录访客的外观保存在本浏览器。'
      : '当前为访客浏览：外观偏好保存在本浏览器；登录后外观将随账号独立保存。';
    panel.innerHTML = `
      <div class="card rounded-xl p-5">
        <div class="flex items-center gap-2.5 mb-2">
          <h2 class="font-title-cn text-base font-bold text-gray-800">外观</h2>
          ${badgeHtml('即时生效', 'success')}
        </div>
        <p class="text-[13px] leading-relaxed text-gray-500 mb-4">字号、明暗主题与强调色的个人偏好设置 —— 保存后全站即时生效。</p>
        <div id="appearance-controls-host" class="mt-2"></div>
      </div>
      ${shapeCardHtml()}
    `;
    const host = panel.querySelector('#appearance-controls-host');
    host.innerHTML = appearanceControlsHTML({ accentFallbackRole: _currentRole, scopeNote });
    bindAppearanceControls(host);
    return;
  }

  if (_currentSectionId === 'my-workspace') {
    renderMyWorkspacePanel(panel);
    return;
  }

  if (_currentSectionId === 'branch-info-wizard' || _currentSectionId === 'branch-default-tab-order'
    || _currentSectionId === 'branch-config-history') {
    renderBranchGovSection(panel, _currentSectionId);
    return;
  }

  // 批4（2026-09-09 支书批「域参数」）：支部制度参数（L3 锁定展示）+ 域参数三卡（L2 按角色可调）
  if (_currentSectionId === 'branch-policy-params' || _currentSectionId === 'domain-disc'
    || _currentSectionId === 'domain-org' || _currentSectionId === 'domain-leader') {
    renderPolicySection(panel, _currentSectionId);
    return;
  }

  panel.innerHTML = `
    <div class="card rounded-xl p-5">
      <div class="flex items-center gap-2.5 mb-2">
        <h2 class="font-title-cn text-base font-bold text-gray-800">${meta.title}</h2>
        ${meta.badge ? badgeHtml(meta.badge, 'neutral') : ''}
      </div>
      <p class="text-[13px] leading-relaxed text-gray-500 mb-4">${meta.desc}</p>
      <div class="hint-box">
        <span class="hint-dot"></span>
        建设中 · 随后续批次开放。${meta.note}
      </div>
    </div>
  `;
}

// ═══════════════ 我的工作台（批2）：个人 tab 顺序 ═══════════════
// 数据链：capability 注册表（当前角色工作台 tab）→ 支部策略（与 workspace-shell 同口径）→
//       preferences.applyPersonalTabOrder（个人顺序仅作用业务组；核心组置前锁定、不参与排序）。
let _session = { role: '', personId: '' }; // init 时填充（当前登录人）
let _mywsModel = null;                     // 当前渲染模型（行操作/拖拽回调读取最新值）
let _mywsLoadSeq = 0;

function _workspaceStemOf(role) {
  const page = (ROLE_PAGE_MAP.workspace || {})[role];
  return page ? page.replace(/\.html$/, '') : '';
}

async function buildMyWorkspaceModel(role, personId) {
  const stem = _workspaceStemOf(role);
  if (!stem) return null;
  const scope = `workspace:${stem}`;
  // 能力模块副作用导入即注册（同 ws-*-entry 模式）；branch.js 数据链较重，随用随载
  await import(`../modules/capabilities/${stem}-workspace.js?v=20260928h`);
  const cap = getCapabilities({ scope }).find(c => c.id === `${stem}-workspace`);
  const rawTabs = cap && typeof cap.tabs === 'function' ? cap.tabs() : [];
  if (!rawTabs.length) return null;
  const { applyTabPolicy, getBranchIdOfPerson } = await import('../services/branch/branch.js?v=20260928h');
  // 支部策略口径与 workspace-shell 一致：支部层工作台应用 config.modules；党委台不受支部配置影响
  let base = rawTabs;
  if (scope !== 'workspace:party-committee' && role !== 'party-staff') {
    base = applyTabPolicy(rawTabs, getBranchIdOfPerson(personId));
  }
  const coreIds = new Set(coreTabIdsOf(base));
  const effective = applyPersonalTabOrder(base, personId, scope);
  return { scope, role, personId, base, coreIds, effective };
}

function _businessOf(model) {
  return model.effective.filter(t => !model.coreIds.has(t.id));
}

function _defaultBizIds(model) {
  return model.base.filter(t => !model.coreIds.has(t.id)).map(t => t.id);
}

function mywsCardHtml(model) {
  const { role, effective, coreIds } = model;
  const label = ROLE_LABELS[role] || role;
  const biz = _businessOf(model);
  const curIdx = new Map(biz.map((t, i) => [t.id, i]));
  const defBizIds = _defaultBizIds(model);
  const defIdx = new Map(defBizIds.map((id, i) => [id, i]));
  const hasPref = readPersonalTabOrder(model.personId, model.scope) != null;
  const coreNames = effective.filter(t => coreIds.has(t.id)).map(t => t.label).filter(Boolean);
  const hint = coreNames.length
    ? `提示：排序与恢复默认仅对当前账号（${label}）生效，不影响支部默认顺序与他人。核心固定页签「${coreNames.join(' / ')}」为全员必有，不可拖动、隐藏或排序；新页签由支部统一配置后出现，默认排于业务页签之后。`
    : `提示：排序与恢复默认仅对当前账号（${label}）生效，不影响支部默认顺序与他人；新页签由支部统一配置后出现，默认排于末尾。`;
  const rows = effective.map(tab => {
    const id = tab.id;
    const locked = coreIds.has(id);
    const i = curIdx.get(id);
    const isMine = !locked && i !== undefined && i !== defIdx.get(id);
    const statusTag = locked
      ? badgeHtml(`${icon('lock', { className: 'icon-base w-3 h-3' })} 核心固定`, 'neutral', { extraClass: 'gap-1' })
      : (isMine
        ? badgeHtml('我的调整', 'warning')
        : badgeHtml('默认', 'success'));
    const actCls = 'btn-action px-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-30';
    const acts = locked ? '' : `
      <button type="button" class="${actCls}" data-myws="move" data-id="${id}" data-dir="-1" title="上移" aria-label="上移 ${tab.label || id}" ${i === 0 ? 'disabled' : ''}>${icon('chevronUp', { className: 'icon-base w-4 h-4' })}</button>
      <button type="button" class="${actCls}" data-myws="move" data-id="${id}" data-dir="1" title="下移" aria-label="下移 ${tab.label || id}" ${i === biz.length - 1 ? 'disabled' : ''}>${icon('chevronDown', { className: 'icon-base w-4 h-4' })}</button>
      ${isMine ? `<button type="button" class="${actCls}" data-myws="restore-row" data-id="${id}" title="恢复该行默认位置" aria-label="恢复 ${tab.label || id} 默认位置">${icon('undo', { className: 'icon-base w-4 h-4' })}</button>` : ''}`;
    const gripCls = locked
      ? 'shrink-0 flex items-center text-gray-300 cursor-not-allowed'
      : 'shrink-0 flex items-center text-gray-400 cursor-grab active:cursor-grabbing touch-none';
    return `
      <li class="myws-row${locked ? ' is-locked' : ''}" draggable="${!locked}" data-id="${id}" data-locked="${locked ? '1' : '0'}">
        <span class="${gripCls}" title="${locked ? '核心固定，不可拖动' : '拖拽排序'}">${icon('grip', { className: 'icon-base w-4 h-4' })}</span>
        <span class="flex-1 min-w-0 text-[13px] font-semibold text-gray-800 leading-snug">${tab.label || id}</span>
        ${badgeHtml(tab.groupLabel || '页签', 'neutral')}
        <span class="flex items-center gap-1.5 shrink-0">${statusTag}</span>
        <span class="flex items-center gap-0.5 shrink-0">${acts}</span>
      </li>`;
  }).join('');
  return `
    <div class="card rounded-xl p-5">
      <div class="flex items-center gap-2.5 mb-2">
        <h2 class="font-title-cn text-base font-bold text-gray-800">我的工作台</h2>
        <span class="ml-auto flex items-center gap-2">
          <button type="button" class="btn-accent-soft text-xs px-3 py-1.5 disabled:opacity-45" style="--acc-text-dark:color-mix(in srgb, var(--app-accent) 55%, #fff)" data-myws="reset-all" title="恢复全部默认（清除本账号顺序调整）" ${hasPref ? '' : 'disabled'}>${icon('undo', { className: 'icon-base w-[13px] h-[13px]' })}恢复全部默认</button>
        </span>
      </div>
      <p class="text-[13px] leading-relaxed text-gray-500 mb-4">${label}工作台页签顺序 · 拖拽或按钮调整，即时保存（仅对当前账号生效）。</p>
      <ul class="myws-list" data-myws-list="1">${rows}</ul>
      <p class="status-line" data-myws-status aria-live="polite"></p>
      <div class="hint-box mt-3.5">${hint}</div>
    </div>`;
}

function mywsEmptyHtml(text) {
  return `<div class="card rounded-xl p-5"><h2 class="font-title-cn text-base font-bold text-gray-800">我的工作台</h2><p class="text-[13px] leading-relaxed text-gray-500 mt-2 mb-0">${text}</p></div>`;
}

function showMywsStatus(panel, msg, isErr = false) {
  const el = panel.querySelector('[data-myws-status]');
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('is-err', isErr);
  clearTimeout(el._mywsT);
  el._mywsT = setTimeout(() => { el.textContent = ''; }, 2600);
}

function commitMywsOrder(model, bizIds, savedMsg) {
  const saved = savePersonalTabOrder(model.personId, model.scope, bizIds, _defaultBizIds(model));
  refreshMyWorkspace(saved ? savedMsg : '已恢复为工作台默认顺序');
}

function bindMyWorkspace(panel, model) {
  _mywsModel = model;
  // 委托点击只绑一次（refresh 会整体替换 panel 内容但 panel 元素持久）
  if (!panel._mywsBound) {
    panel._mywsBound = true;
    panel.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-myws]');
      if (!btn) return;
      const m = _mywsModel;
      if (!m) return;
      const act = btn.dataset.myws;
      if (act === 'reset-all') {
        resetPersonalTabOrder(m.personId, m.scope);
        refreshMyWorkspace('已恢复为工作台默认顺序');
        return;
      }
      const cur = _businessOf(m).map(t => t.id);
      const id = btn.dataset.id;
      if (act === 'move') {
        const i = cur.indexOf(id);
        const j = i + (parseInt(btn.dataset.dir, 10) || 0);
        if (i < 0 || j < 0 || j >= cur.length) return;
        [cur[i], cur[j]] = [cur[j], cur[i]];
        commitMywsOrder(m, cur, '页签顺序已保存（仅对您生效）');
        return;
      }
      if (act === 'restore-row') {
        const i = cur.indexOf(id);
        if (i < 0) return;
        cur.splice(i, 1);
        const di = _defaultBizIds(m).indexOf(id);
        const before = di < 0 ? 0 : _defaultBizIds(m).slice(0, di).filter(x => cur.includes(x)).length;
        cur.splice(before, 0, id);
        commitMywsOrder(m, cur, '已将该页签恢复默认位置');
      }
    });
  }
  const list = panel.querySelector('[data-myws-list]');
  if (!list) return;
  // 行内拖拽换序（HTML5 drag；核心行 locked 不可拖/不可作为落点）
  let dragRow = null;
  const finishDrag = () => {
    if (!dragRow) return;
    dragRow.classList.remove('dragging');
    const ids = Array.from(list.querySelectorAll('.myws-row'))
      .filter(r => r.dataset.locked !== '1')
      .map(r => r.dataset.id);
    dragRow = null;
    const cur = _businessOf(_mywsModel).map(t => t.id);
    if (sameIdOrder(ids, cur)) return; // 无实际变动（丢弃到列表外等）
    commitMywsOrder(_mywsModel, ids, '页签顺序已保存（仅对您生效）');
  };
  list.addEventListener('dragstart', (e) => {
    const row = e.target.closest('.myws-row');
    if (!row || row.dataset.locked === '1') return;
    dragRow = row;
    row.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', row.dataset.id); } catch { /* 忽略 */ }
  });
  list.addEventListener('dragover', (e) => {
    if (!dragRow) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const over = e.target.closest('.myws-row');
    if (!over || over === dragRow || over.dataset.locked === '1') return;
    const r = over.getBoundingClientRect();
    const before = e.clientY < r.top + r.height / 2;
    if (before) list.insertBefore(dragRow, over);
    else list.insertBefore(dragRow, over.nextSibling);
  });
  list.addEventListener('drop', (e) => { if (!dragRow) return; e.preventDefault(); finishDrag(); });
  list.addEventListener('dragend', finishDrag);
}

async function refreshMyWorkspace(msg) {
  const panel = document.getElementById('settings-panel');
  const { role, personId } = _session;
  if (_currentSectionId !== 'my-workspace' || !panel || !personId) return;
  try {
    const model = await buildMyWorkspaceModel(role, personId);
    if (_currentSectionId !== 'my-workspace') return;
    if (!model) { panel.innerHTML = mywsEmptyHtml('未能读取该工作台页签清单。'); return; }
    panel.innerHTML = mywsCardHtml(model);
    bindMyWorkspace(panel, model);
    if (msg) showMywsStatus(panel, msg);
  } catch (e) {
    console.warn('[settings] 我的工作台刷新失败', e);
    if (_currentSectionId === 'my-workspace') panel.innerHTML = mywsEmptyHtml('加载失败，请刷新页面重试。');
  }
}

async function renderMyWorkspacePanel(panel) {
  const { role, personId } = _session;
  if (!role || !personId || !WORKSPACE_ROLES.has(role)) {
    panel.innerHTML = mywsEmptyHtml('工作台角色登录后可用（访客视图不含本区块）。');
    return;
  }
  const seq = ++_mywsLoadSeq;
  panel.innerHTML = mywsEmptyHtml('加载工作台页签清单…');
  try {
    const model = await buildMyWorkspaceModel(role, personId);
    if (seq !== _mywsLoadSeq || _currentSectionId !== 'my-workspace') return; // 已切区块/重复加载
    if (!model) { panel.innerHTML = mywsEmptyHtml('未能读取该工作台页签清单。'); return; }
    panel.innerHTML = mywsCardHtml(model);
    bindMyWorkspace(panel, model);
  } catch (e) {
    console.warn('[settings] 我的工作台加载失败', e);
    if (seq === _mywsLoadSeq) panel.innerHTML = mywsEmptyHtml('加载失败，请刷新页面重试。');
  }
}

// ═══════════════ 支部治理（批3）：支部信息与向导 + 工作台默认顺序 ═══════════════
// 可见角色 = SECRETARY_GOV（支书/副支书）；副书同权（2026-09-09 支书批）：config 写权同现任支书。
// 数据链：当前人 → 有效归属支部（branch.getBoundBranch，2026-09-09 归属显式化——不再 getBranchIdOfPerson
//       回退示例支部；无归属 → 统一「未找到您所属支部」提示卡）→ config 各读/写口。
let _govSeq = 0;      // 支部治理区异步加载序号（切区块防串写）
let _govBranchId = ''; // 当前登录人所属支部（info/order/history/wizard 共用；访问前解析）
let _bwsModel = null;  // 工作台默认顺序当前渲染模型（行操作/拖拽读取最新 pending）

const GOV_ROLES = new Set(['secretary', 'deputy-secretary']); // 支部治理分组可见角色（与 buildGroups 同源）

function govEmptyHtml(text) {
  return `<div class="card rounded-xl p-5"><h2 class="font-title-cn text-base font-bold text-gray-800">支部治理</h2><p class="text-[13px] leading-relaxed text-gray-500 mt-2 mb-0">${text}</p></div>`;
}

/** 区块分发：支部信息与向导 / 工作台默认顺序 */
async function renderBranchGovSection(panel, sectionId) {
  const seq = ++_govSeq;
  const { role, personId } = _session;
  if (!role || !personId || !GOV_ROLES.has(role)) {
    panel.innerHTML = govEmptyHtml('支书 / 副支书登录后可用（其它角色无支部治理分组）。');
    return;
  }
  panel.innerHTML = govEmptyHtml('加载支部配置…');
  try {
    const br = await import('../services/branch/branch.js?v=20260928h');
    const branch = br.getBoundBranch(personId);
    if (!branch) {
      panel.innerHTML = govEmptyHtml(GOV_NO_BRANCH_TEXT);
      return;
    }
    if (seq !== _govSeq) return; // 已切区块
    _govBranchId = branch.id;
    if (sectionId === 'branch-info-wizard') {
      if (_currentSectionId !== 'branch-info-wizard') return;
      renderBranchInfoCard(panel, br, branch);
    } else if (_currentSectionId === 'branch-config-history') {
      if (_currentSectionId !== 'branch-config-history') return;
      renderConfigHistorySection(panel, br, branch);
    } else if (_currentSectionId === 'branch-default-tab-order') {
      // 2026-09-09 冒烟修复：先注册支书工作台能力模块（buildBranchOrderModel 读注册表取 tab 清单；
      // 设置页独立加载，不先经 workspace-shell/我的工作台则能力未注册 → 误显「未能读取…页签清单」）
      await import('../modules/capabilities/secretary-workspace.js?v=20260928h');
      if (seq !== _govSeq) return;
      const model = buildBranchOrderModel(br, branch);
      if (!model) { panel.innerHTML = govEmptyHtml('未能读取该支部工作台页签清单。'); return; }
      _bwsModel = model;
      panel.innerHTML = branchOrderCardHtml(model);
      bindBranchOrderDnD(panel);
      bindBranchGovDelegates(panel);
    }
  } catch (e) {
    console.warn('[settings] 支部治理加载失败', e);
    if (seq === _govSeq) panel.innerHTML = govEmptyHtml('加载失败，请刷新页面重试。');
  }
}

// ── 支部信息与向导（info）──────────────────────────────────────────
function renderBranchInfoCard(panel, br, branch) {
  const org = br.getBranchOrg(branch.id);
  const kv = [
    ['支部名称', org.name || '—'],
    ['类别', org.type || '—'],
    ['页眉显示名', org.headerTitle || org.name || '—'],
    ['支部自述', org.desc || '—'],
  ].map(([k, v]) => `<div class="kv-row"><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('');
  panel.innerHTML = `
    <div class="card rounded-xl p-5">
      <div class="flex items-center gap-2.5 mb-2">
        <h2 class="font-title-cn text-base font-bold text-gray-800">支部信息与向导</h2>
        ${badgeHtml('档案 · 只读展示', 'neutral')}
      </div>
      <p class="text-[13px] leading-relaxed text-gray-500 mb-4">支部基础档案只读展示（名称等治理字段归党委管理）；需要调整支部信息 / 模块组合 / 分工 / 术语时，打开换组织向导 —— 每步保存即时生效并记录变更。</p>
      <dl class="kv-list">${kv}</dl>
      <div class="hint-box mt-3.5">
        <b>改名 / 改自述，去哪改</b>：官方名与类别归党委（党委台「支部管理」）；页眉名、自述、主题与模块组合在本页「打开换组织向导」内改。
      </div>
    </div>
    <div class="card rounded-xl p-4 mt-4 flex flex-col sm:flex-row sm:items-center gap-3.5 border-l-[3px] border-l-[var(--party-red)]">
      <span class="w-[42px] h-[42px] shrink-0 flex items-center justify-center rounded-xl bg-[var(--app-accent-bg)] text-[var(--app-accent)]">${icon('flag', { className: 'icon-base w-5 h-5' })}</span>
      <div class="flex-1 min-w-0">
        <b class="block text-sm text-gray-800 leading-snug">换组织向导（支部信息 / 模块组合 / 分工 / 术语）</b>
        <span class="block mt-1 text-xs leading-relaxed text-gray-500">把支部配置收进 4 步引导：填写支部信息 → 组合模块 → 定分工 → 校准术语。支书 / 副支书（副书同权）限本支部；党委组织员可切任意支部。</span>
      </div>
      <button type="button" class="btn-accent text-sm px-4 py-[7px] shrink-0" data-gov="wizard-open">打开换组织向导（内嵌）</button>
    </div>`;
  bindBranchGovDelegates(panel);
}

/** 打开换组织向导（内嵌，同源 embed：branch-config-tab 原宿主逻辑等价落地） */
async function openWizardEmbed(panel) {
  const { role, personId } = _session;
  const seq = ++_govSeq;
  panel.innerHTML = `
    <div class="flex items-center gap-3 flex-wrap mb-3">
      <button type="button" class="btn-action btn-action-gray" data-gov="wizard-close">${icon('arrowLeft', { className: 'icon-base w-3.5 h-3.5' })} 返回支部信息</button>
      <span class="text-xs text-gray-500">换组织向导 · 内嵌（同源组件；改动即时生效并记录变更）</span>
    </div>
    <div id="settings-wizard-host"></div>`;
  const host = panel.querySelector('#settings-wizard-host');
  try {
    const { mountOrgSetupWizard } = await import('../components/governance/org-setup-wizard.js?v=20260928h');
    if (seq !== _govSeq || !host) return;
    mountOrgSetupWizard(host, { actor: { personId, role }, branchId: _govBranchId, embed: true });
  } catch (e) {
    console.warn('[settings] 换组织向导加载失败', e);
    if (host) host.innerHTML = '<p class="text-sm text-gray-500">换组织向导加载失败，请刷新页面重试。</p>';
  }
}

// ═══════════════ 配置变更记录（2026-09-09 审计内核 B3：支部治理新增只读列表 + 单键回滚）═══════════
// 数据源 = branch.config.configChangeHistory（{by,at,what,from,to,why?}；上限 100，见 config-clean 共享常量）。
// 展示：人 / 时间（格式化）/ 键（what 标签）/ 前后值摘要 / 依据 why；what ∈ CONFIG_ROLLBACK_KEYS 的
// 单键变更可「回滚此更改」（支书/副支书副书同权；party-staff 在党委台治理，本设置页无此路径）。
const CONFIG_HISTORY_LABELS = {
  modules: '工作台模块', blocks: '产出块', workforce: '支部分工', policyOverrides: '职责参数',
  headerTitle: '页眉显示名', desc: '支部自述', themePreset: '主题',
  name: '支部名', 'branch-created': '创建支部', 'config-copied': '复制配置',
  'config-overwrite': '配置覆盖', 'config-package-import': '导入配置包',
  rollback: '回滚',
};

/** 历史值摘要（null/undefined=默认；字符串截断；数组/对象 JSON 压缩） */
function _cfgBrief(v) {
  if (v === null || v === undefined) return '默认';
  if (typeof v === 'string') return v.length > 60 ? `${v.slice(0, 60)}…` : v;
  if (Array.isArray(v)) return `[${v.join('、')}]`;
  if (typeof v === 'object') {
    try {
      const s = JSON.stringify(v);
      return s.length > 80 ? `${s.slice(0, 80)}…` : s;
    } catch (_) { return '[对象]'; }
  }
  return String(v);
}

/** ISO 时间本地格式化（YYYY-MM-DD HH:mm；非法输入原样返回） */
function _cfgFmtAt(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(+d)) return iso || '';
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  } catch (_) { return iso || ''; }
}

/** 单条留痕行（记录块 + 可回滚按钮；what 属聚合/回滚/非追踪键 → 不提供回滚） */
function _cfgHistoryRowHtml(h) {
  const whatLabel = CONFIG_HISTORY_LABELS[h.what] || h.what || '—';
  const who = (h.by && getPersonName(h.by)) || '—';
  const when = _cfgFmtAt(h.at);
  const rollbackable = CONFIG_ROLLBACK_KEYS.includes(h.what);
  const isRollback = h.what === 'rollback';
  const brief = isRollback
    ? `回滚前：${esc(_cfgBrief(h.from))}　→　恢复为：${esc(_cfgBrief(h.to))}`
    : `从：${esc(_cfgBrief(h.from))}　→　到：${esc(_cfgBrief(h.to))}`;
  const whyHtml = h.why ? `<div class="mt-0.5"><span class="text-[11px] text-gray-500">依据/出处：</span><span class="text-[11px] text-[var(--app-accent)]">${esc(h.why)}</span></div>` : '';
  return `
    <li class="flex items-start gap-2.5 p-3 border border-[var(--neutral-200)] rounded-xl bg-[var(--surface-card)]">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5 flex-wrap">
          ${badgeHtml(esc(whatLabel), 'neutral')}
          ${isRollback ? badgeHtml('已回滚', 'warning') : ''}
          <span class="text-[11px] font-medium text-gray-700">${esc(who)}</span>
          <span class="text-[11px] text-gray-500">${esc(when)}</span>
        </div>
        <div class="text-[12px] text-gray-600 mt-1 break-all">${brief}</div>
        ${whyHtml}
      </div>
      ${rollbackable ? `<button type="button" class="btn-accent text-xs px-3 py-1.5 shrink-0" data-gov="rollback" data-at="${esc(h.at)}" title="将该项恢复到本次变更前的值并记录变更">回滚此更改</button>` : ''}
    </li>`;
}

/** 渲染「配置变更记录」卡（只读列表；最新在前，展示最近 50 条；0 条给空态） */
function renderConfigHistorySection(panel, br, branch, statusMsg) {
  const { role } = _session;
  const roleLabel = role === 'deputy-secretary' ? '副支书' : '支书';
  const history = Array.isArray(branch.config && branch.config.configChangeHistory)
    ? branch.config.configChangeHistory
    : [];
  const rowsHtml = history.length
    ? [...history].slice(-50).reverse().map(_cfgHistoryRowHtml).join('')
    : '<p class="text-[13px] text-gray-500 py-2 px-0.5">暂无配置变更记录</p>';
  panel.innerHTML = `
    <div class="card rounded-xl p-5">
      <div class="flex items-center gap-2.5 mb-2">
        <h2 class="font-title-cn text-base font-bold text-gray-800">配置变更记录</h2>
        ${badgeHtml(`${esc(roleLabel)} · 本支部 · 审计`, 'neutral')}
      </div>
      <p class="text-[13px] leading-relaxed text-gray-500 mb-4">每次保存自动记账（谁 / 何时 / 改了哪一项 / 前后值 / 依据）；单键改动可回滚，回滚本身再记一条。</p>
      <ul class="flex flex-col gap-2 mt-3 p-0 list-none">${rowsHtml}</ul>
      <p class="status-line" data-cfg-hist-status aria-live="polite"></p>
    </div>`;
  bindBranchGovDelegates(panel);
  if (statusMsg) showCfgHistStatus(panel, statusMsg);
}

function showCfgHistStatus(panel, msg, isErr = false) {
  const el = panel.querySelector('[data-cfg-hist-status]');
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('is-err', isErr);
  clearTimeout(el._cfghT);
  el._cfghT = setTimeout(() => { el.textContent = ''; }, 3600);
}

/** 回滚此更改（confirm 确认 → rollbackBranchConfig → 重绘并提示「已回滚并留痕」） */
async function runConfigHistoryRollback(panel, entryAt) {
  const { role, personId } = _session;
  if (!personId || !GOV_ROLES.has(role)) return;
  if (!window.confirm('确认回滚此条配置更改？系统将把该项恢复到本次变更前的值，并追加一条回滚记录（回滚本身可查不可再回滚）。')) return;
  const seq = ++_govSeq;
  try {
    const br = await import('../services/branch/branch.js?v=20260928h');
    const res = await br.rollbackBranchConfig(_govBranchId, { by: personId, targetEntryAt: entryAt });
    if (!res.ok) {
      if (_currentSectionId === 'branch-config-history' && seq === _govSeq) showCfgHistStatus(panel, res.reason || '回滚失败。', true);
      return;
    }
    if (_currentSectionId !== 'branch-config-history' || seq !== _govSeq) return;
    const branch = br.getBranchById(_govBranchId);
    if (!branch) { panel.innerHTML = govEmptyHtml(GOV_NO_BRANCH_TEXT); return; }
    renderConfigHistorySection(panel, br, branch, '已回滚并记录变更');
  } catch (e) {
    console.warn('[settings] 配置回滚失败', e);
    if (_currentSectionId === 'branch-config-history' && seq === _govSeq) showCfgHistStatus(panel, '回滚失败，请刷新页面重试。', true);
  }
}

// ── 工作台默认顺序（branch-default-tab-order）────────────────────────
/**
 * 构建顺序编辑模型（纯本地构造；保存/恢复后由本函数基于服务最新 config 重建）
 * 有效 tab = applyTabPolicyPure（同 workspace-shell 支部策略口径）；核心组锁定置前不参与排序。
 */
function buildBranchOrderModel(br, branch) {
  // 能力目录 = 支书工作台 tab（支书/副支书共台；同 org-setup-wizard _branchTabs / workspace-shell）
  const cap = getCapabilities({ scope: 'workspace:secretary' }).find(c => c.id === 'secretary-workspace');
  const rawTabs = cap && typeof cap.tabs === 'function' ? cap.tabs() : [];
  if (!rawTabs.length) return null;
  const modules = branch.config?.modules ?? null;
  const effective = br.applyTabPolicyPure(rawTabs, modules);
  const coreIds = new Set(coreTabIdsOf(rawTabs));
  const coreRows = effective.filter(t => coreIds.has(t.id));
  const bizRows = effective.filter(t => !coreIds.has(t.id));
  const bizIds = bizRows.map(t => t.id);
  return {
    branchId: branch.id,
    rawTabs,
    modules,
    coreIds,
    coreRows,
    bizRows,
    bizIds,
    savedDisplay: [...bizIds], // 加载/上次保存时的有效业务顺序（徽标与 dirty 基准）
    baseBizIds: rawTabs.filter(t => !coreIds.has(t.id)).map(t => t.id), // 注册序业务清单（系统默认）
  };
}

/** 行徽标：核心锁定 / 相对当前支部默认顺序 默认 or 调整中 */
function bwsRowBadgeHtml(model, tab, i) {
  if (model.coreIds.has(tab.id)) {
    return badgeHtml(`${icon('lock', { className: 'icon-base w-3 h-3' })} 核心固定`, 'neutral', { extraClass: 'gap-1' });
  }
  const savedIdx = model.savedDisplay.indexOf(tab.id);
  const moved = savedIdx !== i;
  return moved
    ? badgeHtml('调整中', 'warning')
    : badgeHtml('默认', 'success');
}

function branchOrderCardHtml(model) {
  const { role } = _session;
  const roleLabel = role === 'deputy-secretary' ? '副支书' : '支书';
  const coreNames = model.coreRows.map(t => t.label).filter(Boolean);
  const coreHint = coreNames.length
    ? `核心页签「${coreNames.join(' / ')}」为支部固定项，全员始终保留，锁定置前、不可拖动或排序。`
    : '';
  // 业务行按 pending 顺序（bizIds）渲染；核心行（locked）始终置前
  const bizById = new Map(model.bizRows.map(t => [t.id, t]));
  const bizDisplay = model.bizIds.map(id => bizById.get(id)).filter(Boolean);
  const rows = [...model.coreRows, ...bizDisplay].map((tab) => {
    const id = tab.id;
    const locked = model.coreIds.has(id);
    const bizIdx = locked ? -1 : model.bizIds.indexOf(id);
    const bizLen = model.bizIds.length;
    const acts = locked ? '' : `
      <button type="button" class="btn-action px-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-30" data-bws="move" data-id="${id}" data-dir="-1" title="上移" aria-label="上移 ${tab.label || id}" ${bizIdx === 0 ? 'disabled' : ''}>${icon('chevronUp', { className: 'icon-base w-4 h-4' })}</button>
      <button type="button" class="btn-action px-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-30" data-bws="move" data-id="${id}" data-dir="1" title="下移" aria-label="下移 ${tab.label || id}" ${bizIdx === bizLen - 1 ? 'disabled' : ''}>${icon('chevronDown', { className: 'icon-base w-4 h-4' })}</button>`;
    const gripCls = locked
      ? 'shrink-0 flex items-center text-gray-300 cursor-not-allowed'
      : 'shrink-0 flex items-center text-gray-400 cursor-grab active:cursor-grabbing touch-none';
    return `
      <li class="myws-row${locked ? ' is-locked' : ''}" draggable="${!locked}" data-id="${id}" data-locked="${locked ? '1' : '0'}">
        <span class="${gripCls}" title="${locked ? '核心固定，不可拖动' : '拖拽排序'}">${icon('grip', { className: 'icon-base w-4 h-4' })}</span>
        <span class="flex-1 min-w-0 text-[13px] font-semibold text-gray-800 leading-snug">${esc(tab.label || id)}</span>
        ${badgeHtml(esc(tab.groupLabel || '页签'), 'neutral')}
        <span class="flex items-center gap-1.5 shrink-0">${bwsRowBadgeHtml(model, tab, bizIdx)}</span>
        <span class="flex items-center gap-0.5 shrink-0">${acts}</span>
      </li>`;
  }).join('');
  const modulesNull = !model.modules;
  const dirty = !sameIdOrder(model.bizIds, model.savedDisplay);
  return `
    <div class="card rounded-xl p-5">
      <div class="flex items-center gap-2.5 mb-2">
        <h2 class="font-title-cn text-base font-bold text-gray-800">工作台默认顺序</h2>
        <span class="ml-auto flex items-center gap-2">
          <button type="button" class="btn-accent-soft text-xs px-3 py-1.5 disabled:opacity-45" style="--acc-text-dark:color-mix(in srgb, var(--app-accent) 55%, #fff)" data-bws="reset-all" title="恢复系统默认顺序（默认全开 + 注册序）" ${modulesNull ? 'disabled' : ''}>${icon('undo', { className: 'icon-base w-[13px] h-[13px]' })}恢复默认</button>
          <button type="button" class="btn-accent text-xs px-3 py-1.5" data-bws="save" title="保存为支部默认顺序" ${dirty ? '' : 'disabled'}>保存</button>
        </span>
      </div>
      <p class="text-[13px] leading-relaxed text-gray-500 mb-4">${roleLabel}设定支部工作台默认页签顺序 —— 保存后<strong>全体成员下一刷新按新默认</strong>；成员仍可在「个人设置 → 我的工作台」做个人调整。</p>
      <div class="hint-box mb-3">${icon('bell', { className: 'icon-base w-3.5 h-3.5 mt-0.5 text-gray-400' })}<span>影响全体成员：此处变更写入支部默认配置，全员工作台随之生效；行徽标「默认」表示与当前支部默认一致，「调整中」表示有未保存的位置调整。</span></div>
      <ul class="myws-list" data-bws-list="1">${rows}</ul>
      <p class="status-line" data-bws-status aria-live="polite"></p>
      ${coreHint ? `<div class="hint-box mt-3.5">${coreHint}</div>` : ''}
    </div>`;
}

function showBwsStatus(panel, msg, isErr = false) {
  const el = panel.querySelector('[data-bws-status]');
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('is-err', isErr);
  clearTimeout(el._bwsT);
  el._bwsT = setTimeout(() => { el.textContent = ''; }, 3200);
}

/** 保存当前 pending 顺序为支部默认（与系统默认等效 → 归一为 modules=null） */
async function saveBranchOrder(panel) {
  const m = _bwsModel;
  if (!m) return;
  const cur = [...m.bizIds];
  const hidden = Array.isArray(m.modules?.hiddenTabIds) ? m.modules.hiddenTabIds : [];
  const canNull = !hidden.length && sameIdOrder(cur, m.baseBizIds);
  try {
    const br = await import('../services/branch/branch.js?v=20260928h');
    await br.updateBranchModules(m.branchId, canNull ? null : { hiddenTabIds: hidden, tabOrder: cur }, m.rawTabs);
    await refreshBranchOrder(panel, canNull
      ? '已恢复系统默认顺序 —— 全体成员下一刷新按默认全开 · 注册顺序。'
      : '支部默认顺序已保存 —— 全体成员下一刷新按新默认生效。');
  } catch (e) {
    console.warn('[settings] 默认顺序保存失败', e);
    showBwsStatus(panel, '保存失败，请刷新后重试。', true);
  }
}

/** 恢复默认：modules 置 null（= 默认全开 + 全内置注册序，同系统默认语义） */
async function resetBranchOrder(panel) {
  const m = _bwsModel;
  if (!m) return;
  try {
    const br = await import('../services/branch/branch.js?v=20260928h');
    await br.updateBranchModules(m.branchId, null, m.rawTabs);
    await refreshBranchOrder(panel, '已恢复系统默认顺序 —— 全体成员下一刷新按默认全开 · 注册顺序。');
  } catch (e) {
    console.warn('[settings] 恢复默认失败', e);
    showBwsStatus(panel, '恢复失败，请刷新后重试。', true);
  }
}

/** 重读服务最新 config 并重绘顺序卡（保存/恢复默认后调用） */
async function refreshBranchOrder(panel, msg) {
  const seq = ++_govSeq;
  try {
    const br = await import('../services/branch/branch.js?v=20260928h');
    const branch = br.getBranchById(_govBranchId);
    if (!branch || seq !== _govSeq) return;
    const model = buildBranchOrderModel(br, branch);
    if (!model) return;
    _bwsModel = model;
    panel.innerHTML = branchOrderCardHtml(model);
    bindBranchOrderDnD(panel);
    if (msg) showBwsStatus(panel, msg);
  } catch (e) {
    console.warn('[settings] 默认顺序刷新失败', e);
  }
}

/** 顺序编辑重绘（本地 pending 已变，未落库） */
function paintBranchOrderCard(panel, msg) {
  const m = _bwsModel;
  if (!m) return;
  panel.innerHTML = branchOrderCardHtml(m);
  bindBranchOrderDnD(panel);
  if (msg) showBwsStatus(panel, msg);
}

/** 支部治理区面板级委托（wizard 开/关 + 配置回滚 + bws 按钮；绑定一次，DOM 重绘不失效） */
function bindBranchGovDelegates(panel) {
  if (panel._govBound) return;
  panel._govBound = true;
  panel.addEventListener('click', (e) => {
    const openBtn = e.target.closest('[data-gov="wizard-open"]');
    if (openBtn) { openWizardEmbed(panel); return; }
    if (e.target.closest('[data-gov="wizard-close"]')) {
      renderBranchGovSection(panel, 'branch-info-wizard');
      return;
    }
    const rbBtn = e.target.closest('[data-gov="rollback"]');
    if (rbBtn) { runConfigHistoryRollback(panel, rbBtn.dataset.at); return; }
    const btn = e.target.closest('button[data-bws]');
    if (!btn) return;
    const m = _bwsModel;
    if (!m) return;
    const act = btn.dataset.bws;
    if (act === 'move') {
      const cur = m.bizIds;
      const i = cur.indexOf(btn.dataset.id);
      const j = i + (parseInt(btn.dataset.dir, 10) || 0);
      if (i < 0 || j < 0 || j >= cur.length) return;
      [cur[i], cur[j]] = [cur[j], cur[i]];
      paintBranchOrderCard(panel, '有未保存的顺序调整 —— 点击「保存」后全体成员下一刷新按新默认。');
      return;
    }
    if (act === 'save') { saveBranchOrder(panel); return; }
    if (act === 'reset-all') { resetBranchOrder(panel); }
  });
}

/** 行内拖拽换序（HTML5 drag；核心行 locked 不可拖/不可作落点；仅更新 pending，不自动落库） */
function bindBranchOrderDnD(panel) {
  const list = panel.querySelector('[data-bws-list]');
  if (!list) return;
  let dragRow = null;
  const finishDrag = () => {
    if (!dragRow) return;
    dragRow.classList.remove('dragging');
    const ids = Array.from(list.querySelectorAll('.myws-row'))
      .filter(r => r.dataset.locked !== '1')
      .map(r => r.dataset.id);
    dragRow = null;
    const m = _bwsModel;
    if (!m || sameIdOrder(ids, m.bizIds)) return; // 无实际变动（丢弃到列表外等）
    m.bizIds = ids;
    paintBranchOrderCard(panel, '有未保存的顺序调整 —— 点击「保存」后全体成员下一刷新按新默认。');
  };
  list.addEventListener('dragstart', (e) => {
    const row = e.target.closest('.myws-row');
    if (!row || row.dataset.locked === '1') return;
    dragRow = row;
    row.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', row.dataset.id); } catch { /* 忽略 */ }
  });
  list.addEventListener('dragover', (e) => {
    if (!dragRow) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const over = e.target.closest('.myws-row');
    if (!over || over === dragRow || over.dataset.locked === '1') return;
    const r = over.getBoundingClientRect();
    const before = e.clientY < r.top + r.height / 2;
    if (before) list.insertBefore(dragRow, over);
    else list.insertBefore(dragRow, over.nextSibling);
  });
  list.addEventListener('drop', (e) => { if (!dragRow) return; e.preventDefault(); finishDrag(); });
  list.addEventListener('dragend', (e) => { if (e.target.closest('.myws-row')) finishDrag(); });
}

// ═══════════════ 批4 支部制度参数 + 域参数（policy 收编接线，2026-09-09 支书批）═══════════════
// 分层：支部制度参数（L3）= 制度默认只读锁定展示（票决门槛/应到口径/会议考勤类型/记录人/标因），
//   改须支书/党委裁决（本设置页不开放直改）；域参数（L2）= 纪检/组织/组长各自可见可调自己域，
//   保存走 branch.savePolicyOverrides（白名单净化 + 角色守卫：支书/副/party-staff 全量、域负责人本域）。
// 数据链：制度默认与输入默认值 = POLICY_DEFAULTS（工厂值，本页不注入覆盖 → 展示「制度默认」）；
//   当前生效覆盖 = branch.config.policyOverrides；保存后写入 config（留痕同 configChangeHistory）。
const DOMAIN_CARD_META = {
  'domain-disc': { role: 'disc-commissioner', roleLabel: '纪检委员', sections: ['inspection', 'attendance', 'review', 'makeup'], sectionLabel: '纪检域' },
  'domain-org': { role: 'org-commissioner', roleLabel: '组织委员', sections: ['memberConfirmation', 'thoughtReport'], sectionLabel: '组织域' },
  'domain-leader': { role: 'leader', roleLabel: '党小组组长', sections: ['leader'], sectionLabel: '组长域' },
};
const LOCKED_POLICY_ROLES = new Set(['secretary', 'deputy-secretary']); // 制度锁定展示 = 支书/副视角

function policyEmptyHtml(title, text) {
  return `<div class="card rounded-xl p-5"><h2 class="font-title-cn text-base font-bold text-gray-800">${title}</h2><p class="text-[13px] leading-relaxed text-gray-500 mt-2 mb-0">${text}</p></div>`;
}

/** 统一入口：支部制度参数（支书/副）/ 域参数卡（域负责人）——可见角色不匹配给提示 */
async function renderPolicySection(panel, sectionId) {
  const seq = ++_govSeq;
  const { role, personId } = _session;
  if (!role || !personId) {
    panel.innerHTML = policyEmptyHtml(SECTION_META[sectionId]?.title || '设置', '登录后可用。');
    return;
  }
  if (sectionId === 'branch-policy-params') {
    if (!LOCKED_POLICY_ROLES.has(role)) {
      panel.innerHTML = policyEmptyHtml('支部制度参数', '支书 / 副支书（副书同权）可查看本区块；其它角色无此分组。');
      return;
    }
  } else {
    const meta = DOMAIN_CARD_META[sectionId];
    if (!meta || role !== meta.role) {
      panel.innerHTML = policyEmptyHtml(SECTION_META[sectionId]?.title || '职责参数', '仅该域负责人登录后可见可调（可管则见）。');
      return;
    }
  }
  panel.innerHTML = policyEmptyHtml(SECTION_META[sectionId]?.title || '设置', '加载支部配置…');
  try {
    const br = await import('../services/branch/branch.js?v=20260928h');
    // 2026-09-09 归属显式化：支部语境用 getBoundBranch（无归属 → 统一提示，不兜底示例支部）
    const branch = br.getBoundBranch(personId);
    if (!branch) {
      panel.innerHTML = policyEmptyHtml('支部治理', GOV_NO_BRANCH_TEXT);
      return;
    }
    if (seq !== _govSeq || _currentSectionId !== sectionId) return; // 已切区块
    _govBranchId = branch.id;
    if (sectionId === 'branch-policy-params') {
      panel.innerHTML = branchPolicySectionHtml(branch);
    } else {
      const meta = DOMAIN_CARD_META[sectionId];
      panel.innerHTML = domainCardHtml(meta, branch, POLICY_DEFAULTS);
    }
    bindPolicyPanel(panel);
  } catch (e) {
    console.warn('[settings] 支部制度/域参数加载失败', e);
    if (seq === _govSeq) panel.innerHTML = policyEmptyHtml('支部治理', '加载失败，请刷新页面重试。');
  }
}

// ── 支部制度参数（L3 锁定展示 · 支书/副视角）──────────────────────────
function _quorumLabel() {
  const t = POLICY_DEFAULTS.workforce.voteThreshold;
  const strict = Math.round(t.quorum * 100);
  return `应到会人数严格超过 ${strict}%（出席/应到 > ${t.quorum === 2 / 3 ? '2/3' : strict + '%'}），且无反对（异议/反对均否决；弃权计出席不计赞否）`;
}

function _rosterLabel() {
  const r = POLICY_DEFAULTS.attendance.roster;
  const stages = (r.partyStages || []).join(' + ');
  return `${stages}（组织关系在册）· ${r.excludeDetained ? '剔除滞留党员' : '含滞留党员'}；党课列席（积极分子/发展对象）不计应到`;
}

function _recorderLabel() {
  const m = POLICY_DEFAULTS.attendance.recorderByType || {};
  const parts = Object.entries(m).map(([type, roles]) => {
    const names = roles.map(rc => ({ secretary: '支书', 'deputy-secretary': '副支书', 'disc-commissioner': '纪检', leader: '组长' }[rc] || rc)).join('/');
    return `${type}→${names}`;
  });
  return parts.join('；') + '（组织者位活动：记录人=该活动组织者）';
}

/** 不考勤的会议类型（2026-09-21 批次 132 · 支书口径一「三会，支委会规模小可以不考勤」） */
function _noAttendanceLabel() {
  const list = POLICY_DEFAULTS.attendance.noAttendanceTypes || [];
  return list.length === 0 ? '无' : `${list.join(' / ')}（规模小，不设考勤）`;
}

function branchPolicyLockedCardHtml(branch) {
  const meetingChips = (POLICY_DEFAULTS.attendance.meetingTypes || []).map(t =>
    `<span class="tint-pill" style="--tint:var(--app-accent)">${esc(t)}</span>`).join('');
  const reasonChips = (POLICY_DEFAULTS.attendance.reasons || []).map(r =>
    `<span class="tint-pill" style="--tint:var(--neutral-500)">${esc(r.label)}</span>`).join('');
  const rows = [
    ['票决通过门槛', _quorumLabel()],
    ['会议应到名单核对', _rosterLabel()],
    ['会议考勤类型', `<span class="flex flex-wrap gap-1.5 pt-0.5">${meetingChips}</span>`],
    ['不考勤的会议类型', _noAttendanceLabel()],
    ['考勤记录人', _recorderLabel()],
    ['请假/缺席标因', `<span class="flex flex-wrap gap-1.5 pt-0.5">${reasonChips}</span>`],
  ].map(([k, v]) => `<div class="kv-row"><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('');
  return `
    <div class="card rounded-xl p-5">
      <div class="flex items-center gap-2.5 mb-2">
        <h2 class="font-title-cn text-base font-bold text-gray-800">支部制度参数</h2>
        ${badgeHtml('制度默认 · 只读', 'neutral')}
      </div>
      <p class="text-[13px] leading-relaxed text-gray-500 mb-4">下面五组的当前取值集中摆出，供核对；本卡不放控件，改它们要走制度裁决与放行程序（见下）。</p>
      <dl class="kv-list">${rows}</dl>
      <div class="hint-box mt-3.5">
        <b>为什么只读</b>：这五组是全支部一致的口径，改动牵动票决、应到与考勤判定，故不随支部各自调整。
      </div>
      <div class="hint-box mt-3.5">
        <b>要改，去哪改（放行程序）</b>：① 支书出裁决与依据 → ② 由工程侧登记进可覆盖白名单并改消费点 → ③ 随版本部署生效。本页不提供入口，各支部也不各改一套。参见 <a href="./help.html#card-admin-settings-sections" class="text-sky-600 hover:underline">帮助 · 设置中心分区一览</a>。
      </div>
      <div class="hint-box mt-3.5">
        <b>本区可直改：「活动批准门」</b>：支部自选开关，支书 / 副支书在本区直接调。
      </div>
      <div class="hint-box mt-3.5">
        <b>时限类 / 篇幅字数类 / 补课范围：现已可调</b>（2026-09-27 起）——在左栏「纪检职责参数」「组织职责参数」卡里改，不在本卡。
      </div>
    </div>`;
}

// ── 活动批准门卡（支部制度参数 · 支书可调；2026-09-22 批次 150 · 支书裁定）──────
// 支书裁定（2026-09-22，逐字）：「把它做成一个可开关的支部制度参数（默认关），想要这道门的支部自己打开。」
// 落法（判据）：**落进真正可改的那一层**——config.policyOverrides（白名单 = POLICY_OVERRIDABLE 的
//   activityApproval.mode，归支书域 ⇒ 支书/副支书/party-staff 可改），写口走 branch.savePolicyOverrides；
//   本卡与同区「支部制度参数」只读卡并列展示（那张卡的「制度刚性锁定」口径不变，本项是**支部自选开关**）。
// 三件（2026-09-22 依母本推；支书未答）：写入即待批 / 支书批准（可改支委会）/
//   批准后才发布、不批准则终止。
function branchPolicySectionHtml(branch) {
  return branchPolicyLockedCardHtml(branch) + activityApprovalCardHtml(branch, POLICY_DEFAULTS);
}

function activityApprovalCardHtml(branch, P) {
  // 2026-09-26 批次 206：「支书」原先写死（副支书登录亦显示「支书」，文案与实现不符）⇒ 按既有单一源
  //   （同 renderBranchInfoCard / renderConfigHistorySection / branchOrderCardHtml 的 roleLabel 体例）渲染真实角色
  const { role } = _session;
  const roleLabel = role === 'deputy-secretary' ? '副支书' : '支书';
  const po = _overridesOf(branch);
  const def = (P.activityApproval && P.activityApproval.mode) || 'off';
  const cur = ACTIVITY_APPROVAL_MODES.includes(po.activityApproval?.mode) ? po.activityApproval.mode : def;
  const hasOverride = !!po.activityApproval;
  const opts = ACTIVITY_APPROVAL_MODES.map(m =>
    `<option value="${m}" ${m === cur ? 'selected' : ''}>${esc(ACTIVITY_APPROVAL_MODE_LABELS[m] || m)}</option>`).join('');
  return `
    <div class="card rounded-xl p-5">
      <div class="flex items-center gap-2.5 mb-2">
        <h2 class="font-title-cn text-base font-bold text-gray-800">活动批准门</h2>
        ${badgeHtml(`${esc(roleLabel)} · 本支部可调`, 'info')}
      </div>
      <p class="text-[13px] leading-relaxed text-gray-500 mb-4">办活动要不要先过一道批准门。<b>默认关闭</b>：关闭时活动写入与现在完全一样（写入即照常推进）；开启后写入即落「待批」，批准前不推进、批准后才发布、不批准则终止。档位可定「${esc(ACTIVITY_APPROVAL_MODE_LABELS.secretary)}」或「${esc(ACTIVITY_APPROVAL_MODE_LABELS['branch-committee'])}」。</p>
      <div class="kv-row">
        <dt>批准门档位</dt>
        <dd>
          <select id="pol-approval-mode" class="input-flat text-xs w-56">${opts}</select>
          <div class="text-[11px] text-gray-500 mt-1">制度默认＝关闭；出处：母本《常见工作场景快速指南》共建活动八步流程第 3 步（线下由支书把关：须经同意后方可推进，不批准则终止）。当前${hasOverride ? '已按本支部调整值生效' : '为制度默认（关闭）'}。</div>
        </dd>
      </div>
      <div class="pt-3 border-t border-gray-100 flex items-center gap-2">
        <button type="button" class="btn-accent text-xs px-3 py-1.5" data-approval-save>保存</button>
        <button type="button" class="btn-accent-soft text-xs px-3 py-1.5 disabled:opacity-45" style="--acc-text-dark:color-mix(in srgb, var(--app-accent) 55%, #fff)" data-approval-reset ${hasOverride ? '' : 'disabled'}>恢复默认</button>
      </div>
      <p class="status-line" data-pol-status aria-live="polite"></p>
    </div>`;
}

/** 保存 / 恢复默认活动批准门（走 branch.savePolicyOverrides；写后重绘本区并给状态） */
async function runActivityApprovalAction(panel, action) {
  const { role, personId } = _session;
  if (!personId) return;
  const sel = panel.querySelector('#pol-approval-mode');
  const mode = sel ? sel.value : 'off';
  if (action === 'save' && !ACTIVITY_APPROVAL_MODES.includes(mode)) {
    showPolicyStatus(panel, '档位取值非法。', true);
    return;
  }
  const patch = action === 'reset' ? { activityApproval: null } : { activityApproval: { mode } };
  const seq = ++_govSeq;
  try {
    const br = await import('../services/branch/branch.js?v=20260928h');
    const res = await br.savePolicyOverrides(_govBranchId, patch, { actor: { personId, role } });
    if (!res.ok) {
      if (_currentSectionId === 'branch-policy-params') showPolicyStatus(panel, res.reason || '保存失败（无权限或参数非法）。', true);
      return;
    }
    if (_currentSectionId !== 'branch-policy-params' || seq !== _govSeq) return;
    const branch = br.getBranchById(_govBranchId);
    panel.innerHTML = branchPolicySectionHtml(branch);
    bindPolicyPanel(panel);
    showPolicyStatus(panel, action === 'reset'
      ? '已恢复制度默认（关闭）——活动写入回到原样。'
      : (res.changed ? '已保存 —— 全站判定随参数生效（成员工作台下次加载即用）。' : '档位与当前一致，无需保存。'));
  } catch (e) {
    console.warn('[settings] 活动批准门保存失败', e);
    if (_currentSectionId === 'branch-policy-params') showPolicyStatus(panel, '保存失败，请刷新后重试。', true);
  }
}

// ── 域参数卡（L2 编辑 · 纪检/组织/组长各自可见）───────────────────────
function _overridesOf(branch) {
  const po = branch?.config?.policyOverrides;
  return (po && typeof po === 'object' && !Array.isArray(po)) ? po : {};
}

function domainCardHtml(meta, branch, P) {
  const po = _overridesOf(branch);
  const hasOverride = meta.sections.some((s) => !!po[s]);
  const statusHtml = `<p class="status-line" data-pol-status aria-live="polite"></p>`;
  const curState = `当前${hasOverride ? '已按本支部调整值生效' : '与制度默认一致'}。`;
  if (meta.role === 'disc-commissioner') {
    const def = P.inspection.overdueDays;
    const cur = (Number.isInteger(po.inspection?.overdueDays) ? po.inspection.overdueDays : def);
    const ad = P.attendance; const rd = P.review; const mk = P.makeup;
    const numIn = (sec, leaf, dflt) => (Number.isInteger(po[sec]?.[leaf]) ? po[sec][leaf] : dflt);
    const cEntry = numIn('attendance', 'entryRemindDays', ad.entryRemindDays);
    const cSum = numIn('attendance', 'summaryDeadlineDays', ad.summaryDeadlineDays);
    const cLow = numIn('attendance', 'lowRateHint', ad.lowRateHint);
    const cRev = numIn('review', 'overdueDays', rd.overdueDays);
    const cRevD = numIn('review', 'deadlineDays', rd.deadlineDays);
    const cMkD = numIn('makeup', 'deadlineDays', mk.deadlineDays);
    const mkAsm = typeof po.makeup?.branchAssembly === 'boolean' ? po.makeup.branchAssembly : mk.branchAssembly;
    const mkCls = typeof po.makeup?.partyClass === 'boolean' ? po.makeup.partyClass : mk.partyClass;
    const numField = (id, v, min, max, pre, post) => `
            <label class="flex items-center gap-2">
              <span class="text-xs text-gray-600">${pre}</span>
              <input type="number" id="${id}" class="input-flat text-xs w-20 text-center" min="${min}" max="${max}" value="${v}" inputmode="numeric">
              <span class="text-xs text-gray-600">${post}</span>
            </label>`;
    const row = (label, field, hint) => `
        <div class="kv-row">
          <dt>${label}</dt>
          <dd>${field}
            <div class="text-[11px] text-gray-500 mt-1">${hint}</div>
          </dd>
        </div>`;
    return `
      <div class="card rounded-xl p-5">
        <div class="flex items-center gap-2.5 mb-2">
          <h2 class="font-title-cn text-base font-bold text-gray-800">纪检职责参数</h2>
          ${badgeHtml(`${esc(meta.roleLabel)} 可调`, 'info')}
        </div>
        <p class="text-[13px] leading-relaxed text-gray-500 mb-4">考察超期、考勤与复盘时限、补课范围与时限。保存后：纪检台判定、支书台提醒与补课判据同源生效。</p>
        <div class="space-y-3">
          ${row('考察确认超期', numField('pol-inp-disc-days', cur, 1, 90, '超过', '天未确认判超期'), `范围 1–90 天；默认 ${def} 天。${curState}`)}
          ${row('考勤录入提醒', numField('pol-disc-entry-remind', cEntry, 1, 30, '活动结束超过', '天未录入判提醒'), `范围 1–30 天；默认 ${ad.entryRemindDays} 天（母本 24h）。`)}
          ${row('考勤汇总期限', numField('pol-disc-summary-days', cSum, 1, 30, '截止 = 活动日 +', '天'), `范围 1–30 天；默认 ${ad.summaryDeadlineDays} 天（母本 48h）。`)}
          ${row('出勤率提示线', numField('pol-disc-low-rate', cLow, 0, 100, '低于', '% 仅提示本人'), `范围 0–100；默认 ${ad.lowRateHint}%。只提示、不触发处置。`)}
          ${row('复盘提醒', numField('pol-disc-review-remind', cRev, 1, 90, '活动结束超过', '天未交复盘判提醒'), `范围 1–90 天；默认 ${rd.overdueDays} 天。`)}
          ${row('复盘提交期限', numField('pol-disc-review-deadline', cRevD, 1, 90, '截止 = 活动日 +', '天'), `范围 1–90 天；默认 ${rd.deadlineDays} 天。`)}
          <div class="kv-row">
            <dt>补课范围</dt>
            <dd>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="pol-disc-makeup-assembly" class="w-4 h-4 accent-[var(--app-accent)]" ${mkAsm ? 'checked' : ''}>
                <span class="text-xs text-gray-700">支部党员大会须补课</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer mt-1">
                <input type="checkbox" id="pol-disc-makeup-class" class="w-4 h-4 accent-[var(--app-accent)]" ${mkCls ? 'checked' : ''}>
                <span class="text-xs text-gray-700">党课须补课</span>
              </label>
              <div class="text-[11px] text-gray-500 mt-1">制度硬要求类型；单场活动仍只能加不能减。</div>
            </dd>
          </div>
          ${row('补课时限', numField('pol-disc-makeup-deadline', cMkD, 1, 30, '活动后', '天内闭环'), `范围 1–30 天；默认 ${mk.deadlineDays} 天（T+7）。`)}
        </div>
        <div class="pt-3 border-t border-gray-100 flex items-center gap-2">
          <button type="button" class="btn-accent text-xs px-3 py-1.5" data-pol-save="domain-disc">保存</button>
          <button type="button" class="btn-accent-soft text-xs px-3 py-1.5 disabled:opacity-45" style="--acc-text-dark:color-mix(in srgb, var(--app-accent) 55%, #fff)" data-pol-reset="domain-disc" ${hasOverride ? '' : 'disabled'}>恢复默认</button>
        </div>
        ${statusHtml}
      </div>`;
  }
  if (meta.role === 'org-commissioner') {
    const def = P.memberConfirmation.semesterDetainedWindows;
    const cur = Array.isArray(po.memberConfirmation?.semesterDetainedWindows) && po.memberConfirmation.semesterDetainedWindows.length
      ? po.memberConfirmation.semesterDetainedWindows : def;
    const win = (idx) => cur[idx] || [6, 15, 7, 15];
    const w1 = win(0); const w2 = win(1);
    const pad = (v) => String(v).padStart(2, '0');
    const winLabel = (w, cross) => `${pad(w[0])}-${pad(w[1])} ～ ${cross ? '次年 ' : ''}${pad(w[2])}-${pad(w[3])}`;
    const num = (v, id) => `<input type="number" id="${id}" class="input-flat text-xs w-16 text-center" min="1" max="31" value="${v}" inputmode="numeric">`;
    const cHint = (Number.isInteger(po.thoughtReport?.wordHint) ? po.thoughtReport.wordHint : P.thoughtReport.wordHint);
    const cSoft = (Number.isInteger(po.thoughtReport?.wordSoftMin) ? po.thoughtReport.wordSoftMin : P.thoughtReport.wordSoftMin);
    return `
      <div class="card rounded-xl p-5">
        <div class="flex items-center gap-2.5 mb-2">
          <h2 class="font-title-cn text-base font-bold text-gray-800">组织职责参数</h2>
          ${badgeHtml(`${esc(meta.roleLabel)} 可调`, 'info')}
        </div>
        <p class="text-[13px] leading-relaxed text-gray-500 mb-4">学期末滞留集中复核窗口、思想汇报篇幅建议与警告审阅线。保存后：支书台提醒窗口与提交页字数提示同源生效。</p>
        <div class="space-y-3">
          <div class="kv-row">
            <dt>区间 1</dt>
            <dd class="flex items-center gap-1.5 flex-wrap">
              ${num(w1[0], 'pol-org-1-sm')}<span class="text-xs text-gray-500">月</span>${num(w1[1], 'pol-org-1-sd')}<span class="text-xs text-gray-500">日 ～</span>
              ${num(w1[2], 'pol-org-1-em')}<span class="text-xs text-gray-500">月</span>${num(w1[3], 'pol-org-1-ed')}<span class="text-xs text-gray-500">日</span>
              <span class="text-[11px] text-gray-500">默认 ${winLabel(def[0] || w1, false)}</span>
            </dd>
          </div>
          <div class="kv-row">
            <dt>区间 2</dt>
            <dd class="flex items-center gap-1.5 flex-wrap">
              ${num(w2[0], 'pol-org-2-sm')}<span class="text-xs text-gray-500">月</span>${num(w2[1], 'pol-org-2-sd')}<span class="text-xs text-gray-500">日 ～</span>
              ${num(w2[2], 'pol-org-2-em')}<span class="text-xs text-gray-500">月（次年）</span>${num(w2[3], 'pol-org-2-ed')}<span class="text-xs text-gray-500">日</span>
              <span class="text-[11px] text-gray-500">默认 ${winLabel(def[1] || w2, true)}（止月小于起月 = 跨年）</span>
            </dd>
          </div>
          <div class="kv-row">
            <dt>思想汇报建议篇幅</dt>
            <dd>
              <label class="flex items-center gap-2">
                <span class="text-xs text-gray-600">建议</span>
                <input type="number" id="pol-org-word-hint" class="input-flat text-xs w-24 text-center" min="100" max="10000" value="${cHint}" inputmode="numeric">
                <span class="text-xs text-gray-600">字以上</span>
              </label>
              <div class="text-[11px] text-gray-500 mt-1">范围 100–10000；默认 ${P.thoughtReport.wordHint} 字。只写在提示文案里。</div>
            </dd>
          </div>
          <div class="kv-row">
            <dt>警告审阅线</dt>
            <dd>
              <label class="flex items-center gap-2">
                <span class="text-xs text-gray-600">少于</span>
                <input type="number" id="pol-org-word-soft" class="input-flat text-xs w-24 text-center" min="100" max="10000" value="${cSoft}" inputmode="numeric">
                <span class="text-xs text-gray-600">字触发警告审阅</span>
              </label>
              <div class="text-[11px] text-gray-500 mt-1">范围 100–10000；默认 ${P.thoughtReport.wordSoftMin} 字。提醒只给提交人本人，不影响提交。</div>
            </dd>
          </div>
        </div>
        <div class="text-[11px] text-gray-500 mt-1">月 1–12、日 1–31；共两段窗口。${curState}</div>
        <div class="pt-3 border-t border-gray-100 flex items-center gap-2">
          <button type="button" class="btn-accent text-xs px-3 py-1.5" data-pol-save="domain-org">保存</button>
          <button type="button" class="btn-accent-soft text-xs px-3 py-1.5 disabled:opacity-45" style="--acc-text-dark:color-mix(in srgb, var(--app-accent) 55%, #fff)" data-pol-reset="domain-org" ${hasOverride ? '' : 'disabled'}>恢复默认</button>
        </div>
        ${statusHtml}
      </div>`;
  }
  // leader
  const defOn = !!P.leader.semesterReportReminder?.enabled;
  const curOn = typeof po.leader?.semesterReportReminder?.enabled === 'boolean' ? po.leader.semesterReportReminder.enabled : defOn;
  return `
    <div class="card rounded-xl p-5">
      <div class="flex items-center gap-2.5 mb-2">
        <h2 class="font-title-cn text-base font-bold text-gray-800">组长职责参数</h2>
        ${badgeHtml(`${esc(meta.roleLabel)} 可调`, 'info')}
      </div>
      <p class="text-[13px] leading-relaxed text-gray-500 mb-4">学期组员进展自动归集提醒：每学期开学周（3 月 / 9 月首周）在组长工作台提醒一次「逐人归集本组组员进展」。频率固定学期制。</p>
      <div class="kv-row">
        <dt>学期提醒</dt>
        <dd>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" id="pol-leader-enabled" class="w-4 h-4 accent-[var(--app-accent)]" ${curOn ? 'checked' : ''}>
            <span class="text-xs text-gray-700">开启「学期组员进展归集提醒」（默认开）</span>
          </label>
          <div class="text-[11px] text-gray-500 mt-1">频率：每学期（3 月 / 9 月开学首周提醒一次；首次查看后本学期不再重复弹）。当前${hasOverride ? '已按本支部调整值生效' : '与制度默认一致（开启）'}。</div>
        </dd>
      </div>
      <div class="pt-3 border-t border-gray-100 flex items-center gap-2">
        <button type="button" class="btn-accent text-xs px-3 py-1.5" data-pol-save="domain-leader">保存</button>
        <button type="button" class="btn-accent-soft text-xs px-3 py-1.5 disabled:opacity-45" style="--acc-text-dark:color-mix(in srgb, var(--app-accent) 55%, #fff)" data-pol-reset="domain-leader" ${hasOverride ? '' : 'disabled'}>恢复默认</button>
      </div>
      ${statusHtml}
    </div>`;
}

function showPolicyStatus(panel, msg, isErr = false) {
  const el = panel.querySelector('[data-pol-status]');
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('is-err', isErr);
  clearTimeout(el._polT);
  el._polT = setTimeout(() => { el.textContent = ''; }, 3600);
}

/** 读域卡当前输入 → 保存 patch（多节；非法输入给出提示并返回 null） */
function _readDomainPatch(meta, panel) {
  const readInt = (id) => {
    const el = panel.querySelector('#' + id);
    const v = el ? parseInt(el.value, 10) : NaN;
    return v;
  };
  const intField = (id, min, max, label) => {
    const v = readInt(id);
    if (!Number.isInteger(v) || v < min || v > max) {
      showPolicyStatus(panel, `${label}请输入 ${min}–${max} 之间的整数。`, true);
      return null;
    }
    return v;
  };
  if (meta.role === 'disc-commissioner') {
    const days = intField('pol-inp-disc-days', 1, 90, '考察确认超期');
    if (days === null) return null;
    const entry = intField('pol-disc-entry-remind', 1, 30, '考勤录入提醒');
    const summary = intField('pol-disc-summary-days', 1, 30, '考勤汇总期限');
    const low = intField('pol-disc-low-rate', 0, 100, '出勤率提示线');
    const rRev = intField('pol-disc-review-remind', 1, 90, '复盘提醒');
    const rDead = intField('pol-disc-review-deadline', 1, 90, '复盘提交期限');
    const mkDead = intField('pol-disc-makeup-deadline', 1, 30, '补课时限');
    if ([entry, summary, low, rRev, rDead, mkDead].some((v) => v === null)) return null;
    const asm = panel.querySelector('#pol-disc-makeup-assembly');
    const cls = panel.querySelector('#pol-disc-makeup-class');
    return {
      inspection: { overdueDays: days },
      attendance: { entryRemindDays: entry, summaryDeadlineDays: summary, lowRateHint: low },
      review: { overdueDays: rRev, deadlineDays: rDead },
      makeup: { branchAssembly: !!asm && asm.checked, partyClass: !!cls && cls.checked, deadlineDays: mkDead },
    };
  }
  if (meta.role === 'org-commissioner') {
    const read = (id) => {
      const el = panel.querySelector('#' + id);
      const v = el ? parseInt(el.value, 10) : NaN;
      return Number.isInteger(v) ? v : NaN;
    };
    const names = [['pol-org-1-sm', 'pol-org-1-sd', 'pol-org-1-em', 'pol-org-1-ed'], ['pol-org-2-sm', 'pol-org-2-sd', 'pol-org-2-em', 'pol-org-2-ed']];
    const windows = names.map(ids => ids.map(read));
    for (const [sm, sd, em, ed] of windows) {
      if (!(sm >= 1 && sm <= 12 && em >= 1 && em <= 12 && sd >= 1 && sd <= 31 && ed >= 1 && ed <= 31)) {
        showPolicyStatus(panel, '窗口请填合法月日：月 1–12、日 1–31。', true);
        return null;
      }
    }
    const hint = read('pol-org-word-hint');
    const soft = read('pol-org-word-soft');
    if (!(hint >= 100 && hint <= 10000)) { showPolicyStatus(panel, '建议篇幅请输入 100–10000 之间的整数。', true); return null; }
    if (!(soft >= 100 && soft <= 10000)) { showPolicyStatus(panel, '警告审阅线请输入 100–10000 之间的整数。', true); return null; }
    return {
      memberConfirmation: { semesterDetainedWindows: windows },
      thoughtReport: { wordHint: hint, wordSoftMin: soft },
    };
  }
  const el = panel.querySelector('#pol-leader-enabled');
  return { leader: { semesterReportReminder: { enabled: !!el && el.checked } } };
}

/** 统一动作：保存 / 恢复默认（走 branch.savePolicyOverrides；完成后重绘本卡并给状态） */
async function runPolicyAction(panel, cardId, action) {
  const meta = DOMAIN_CARD_META[cardId];
  const { role, personId } = _session;
  if (!meta || !personId) return;
  const patch = action === 'reset'
    ? Object.fromEntries(meta.sections.map((s) => [s, null]))
    : _readDomainPatch(meta, panel);
  if (action === 'save' && !patch) return; // 输入非法已提示
  const seq = ++_govSeq;
  try {
    const br = await import('../services/branch/branch.js?v=20260928h');
    const res = await br.savePolicyOverrides(_govBranchId, patch, { actor: { personId, role } });
    if (!res.ok) {
      if (_currentSectionId === cardId) showPolicyStatus(panel, res.reason || '保存失败（无权限或参数非法）。', true);
      return;
    }
    if (_currentSectionId !== cardId || seq !== _govSeq) return;
    // 重绘本卡（刷新「恢复默认」可用态），再给状态文案
    const branch = br.getBranchById(_govBranchId);
    panel.innerHTML = domainCardHtml(meta, branch, POLICY_DEFAULTS);
    bindPolicyPanel(panel);
    showPolicyStatus(panel, action === 'reset'
      ? '已恢复该域默认 —— 全站判定回到制度默认值。'
      : (res.changed ? '已保存 —— 全站判定随参数生效（成员工作台下次加载即用）。' : '数值与当前一致，无需保存。'));
  } catch (e) {
    console.warn('[settings] 域参数保存失败', e);
    if (_currentSectionId === cardId) showPolicyStatus(panel, '保存失败，请刷新后重试。', true);
  }
}

/** 域参数卡/制度卡的面板级委托（保存/恢复默认；面板持久，绑定一次） */
function bindPolicyPanel(panel) {
  if (panel._polBound) return;
  panel._polBound = true;
  panel.addEventListener('click', (e) => {
    const saveBtn = e.target.closest('button[data-pol-save]');
    if (saveBtn) { runPolicyAction(panel, saveBtn.dataset.polSave, 'save'); return; }
    const resetBtn = e.target.closest('button[data-pol-reset]');
    if (resetBtn) { runPolicyAction(panel, resetBtn.dataset.polReset, 'reset'); return; }
    // 活动批准门（2026-09-22 批次 150）：本区独有的两枚按钮（与域参数卡的 data-pol-* 分开）
    const aprSave = e.target.closest('button[data-approval-save]');
    if (aprSave) { runActivityApprovalAction(panel, 'save'); return; }
    const aprReset = e.target.closest('button[data-approval-reset]');
    if (aprReset) { runActivityApprovalAction(panel, 'reset'); }
  });
}

function renderHeaderArea(subEl) {
  const label = _currentRole ? (ROLE_LABELS[_currentRole] || _currentRole) : '访客';
  subEl.innerHTML = `当前身份：<strong>${label}</strong> · 个人与支部设置集中在此页`;
}

async function init() {
  // 登录态感知（同 sidebar staticShell 模式）：轻量读快照，确已登录才加载 auth 取常设角色
  let role = '';
  if (readLoginSnapshot()) {
    try {
      const { AuthStore } = await loadAuth();
      const user = AuthStore.getCurrentUser();
      role = user ? AuthStore.getUserRole(user.personId) : '';
      _session = { role: role || '', personId: user ? (user.personId || user.id || '') : '' };
    } catch (e) {
      console.warn('[settings] auth 加载失败，降级为访客视图', e);
    }
  }
  _currentRole = role || '';

  // 强调色三件套变量注入本页（appearance 控件激活态/选中态跟随当前人强调色；
  // 静态页不跑 bootstrap，此处按 bootstrap.js 同口径设置 --app-accent —— R1-A：
  // 生效强调色 = resolveAppliedAccentRole（登录 person 覆盖 / 访客全局覆盖，绝不跨空间回落，
  // 无覆盖=角色默认），替代只读全局键的 constants resolveAccentRole 调用）
  const { accent, accentRgba, accentBorder } = getAccentColors(resolveAppliedAccentRole(_currentRole));
  const root = document.documentElement;
  root.style.setProperty('--app-accent', accent);
  root.style.setProperty('--app-accent-bg', accentRgba);
  root.style.setProperty('--app-accent-border', accentBorder);

  renderHeaderArea(document.getElementById('settings-sub'));
  // 就近深链：起始分区由 #<分区 id> 决定（非法/无权回落「外观」），见 initialSectionFromHash
  _currentSectionId = initialSectionFromHash(_currentRole);
  renderGroups(document.getElementById('settings-groups'));
  renderPanel(document.getElementById('settings-panel'));

  renderSidebar('settings', { staticShell: true });
  renderHeader('settings', { staticShell: true });
}

// 数据层初始化（P0-2 2026-09-23 收敛）：判定唯一源＝core/data-adapter.js::hydrateDataSource——
// 有 token 走 api、**失败即失败**（「无法连接服务器」错误态 + 重试，不再静默回退可写 mock＝静默丢单）；
// 无 token 走本地 mock（同 search/wizard 独立页口径——BranchService.loadDB 含 reset/init 触发链与 init 态种子过滤）。
try {
  await hydrateDataSource({
    apiAdapter: ApiAdapter,
    loadMock: () => { try { BranchService.loadDB(); } catch (e) { console.warn('[settings] mock 数据加载失败', e); } },
  });
} catch (e) {
  console.warn('[settings] 数据层初始化异常', e);
}

init();
