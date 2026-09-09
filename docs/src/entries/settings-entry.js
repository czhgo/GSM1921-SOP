// role: [工程师]+[AI]
// entries/settings-entry.js — 设置中心页（批1骨架，书记 2026-09-09 批准设计 v3）
// 左分组栏依据当前登录角色显隐（本批即生效）：
//   访客                    → 仅「外观」
//   书记 / 副书记             → 个人设置(外观/我的工作台) + 支部治理(支部信息与向导/工作台默认顺序/支部制度参数)
//   纪检(dis)/组织(org)/组长  → 个人设置 + 支部治理(域参数·纪检/组织/组长)
//   宣传(prop)/成员(participant等) → 个人设置（无支部治理分组）
//   党委(party-staff)        → 个人设置 + 支部治理(快捷块说明)
// 右内容区随左栏选中切换：外观（批1）/ 我的工作台（批2）/ 支部治理（批3：支部信息与向导 +
// 工作台默认顺序；副书同权 2026-09-09 书记批）已功能开放；其余区显示「建设中·随后续批次开放」占位
// （分组结构可见性即角色化验收点，功能随批 3/4 开放）。
// 登录态：非纯静态——readLoginSnapshot() + 动态 import auth（同 sidebar.js 模式）。

import { renderSidebar } from '../components/sidebar.js?v=20260909e';
import { renderHeader } from '../components/header.js?v=20260909e';
import { readLoginSnapshot } from '../core/login-snapshot.js?v=20260909e';
import { ROLE_LABELS, ROLE_PAGE_MAP, getAccentColors } from '../core/constants.js?v=20260909e';
import { resolveAppliedAccentRole } from '../core/theme.js?v=20260909e';
import { appearanceControlsHTML, bindAppearanceControls } from '../components/appearance-controls.js?v=20260909e';
import { icon } from '../core/icons.js?v=20260909e';
import { escHtml as esc } from '../core/utils.js?v=20260909e';
import { getCapabilities } from '../core/registry.js?v=20260909e';
import {
  coreTabIdsOf, sameIdOrder, applyPersonalTabOrder, readPersonalTabOrder,
  savePersonalTabOrder, resetPersonalTabOrder,
} from '../services/preferences.js?v=20260909e';
// 批4（2026-09-09 书记批「域参数」）：制度默认单一源 = policy-defaults（设置页展示「制度默认」行与域参数默认值）
import { POLICY_DEFAULTS } from '../core/policy-defaults.js?v=20260909e';
// 数据层初始化（2026-09-09 冒烟修复，同 wizard/search 独立页模式）：设置页治理区（支部信息/默认顺序/
// 制度参数/域参数）与「我的工作台」需读支部配置——注册适配器并恢复本地 mock 数据（或 API 模式 init），
// 否则整页加载后 mockDB 恒空 → 治理区误显「未找到您所属支部」且写口（保存默认顺序/域参数）不可达。
import { BranchService } from '../services/runtime.js?v=20260909e';
import { registerApiAdapter, setDataSource, init as dataInit } from '../core/data-adapter.js?v=20260909e';
import { ApiAdapter } from '../core/api-adapter.js?v=20260909e';

// 2026-09-09 支部归属显式化/审计内核：变更记录展示与回滚按钮需要操作者姓名、单键回滚白名单
import { getPersonName } from '../services/person.js?v=20260909e';
import { CONFIG_ROLLBACK_KEYS } from '../core/config-clean.js?v=20260909e';

// 支部治理区归属缺失统一文案（2026-09-09 书记批「未绑定支部」口径：支部语境一律 getBoundBranch 判定，
// 不再回退示例支部 br-b1；由党委在『支部管理』中确认归属后才可见本支部治理内容）
const GOV_NO_BRANCH_TEXT = '未找到您所属支部——请先由党委在『支部管理』中确认归属。';

// ── 数据层按需加载（同 sidebar staticShell 模式：确已登录才动态 import auth）──
let _authModule = null;
function loadAuth() {
  if (!_authModule) _authModule = import('../services/auth.js?v=20260909e');
  return _authModule;
}

// ═══════════════ 左分组模型（角色 × 分组显隐矩阵）═══════════════
const WORKSPACE_ROLES = new Set(Object.keys(ROLE_PAGE_MAP.workspace)); // 有工作台页面 → 显示「我的工作台」

const SECRETARY_GOV = [
  { id: 'branch-info-wizard', label: '支部信息与向导' },
  { id: 'branch-default-tab-order', label: '工作台默认顺序' },
  { id: 'branch-policy-params', label: '支部制度参数' },
];
// 支部治理分组按角色（键=常设角色；未列出角色 = 无该分组）
const GOVERNANCE_BY_ROLE = {
  'secretary': SECRETARY_GOV,
  'deputy-secretary': SECRETARY_GOV,
  'disc-commissioner': [{ id: 'domain-disc', label: '域参数 · 纪检' }],
  'org-commissioner': [{ id: 'domain-org', label: '域参数 · 组织' }],
  leader: [{ id: 'domain-leader', label: '域参数 · 组长' }],
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
    desc: '支部档案信息查看与「更换组织向导」入口（同源 embed 复用 org-setup-wizard，不改写其逻辑）。',
    note: '书记 / 副书记（副书同权）在本页进入组织配置向导。',
  },
  'branch-default-tab-order': {
    title: '工作台默认顺序', batch: '批 3', badge: '',
    desc: '由书记 / 副书记设定支部工作台默认标签顺序；核心功能组只读带锁，个人覆盖在「我的工作台」中调整。',
    note: '保存后全体成员下一刷新按新默认；恢复默认 = 系统默认（全开 + 注册序）。',
  },
  'branch-policy-params': {
    title: '支部制度参数', batch: '批 4', badge: '',
    desc: '支部级制度参数（票决门槛 / 应到口径 / 会议类型等）制度默认只读展示；参数不在设置页直改（改须书记/党委裁决后在系统层变更）。域参数（L2）在各域负责人卡中可调。',
    note: '制度刚性锁定展示 + 域参数按角色分发。',
  },
  'domain-disc': {
    title: '域参数 · 纪检', batch: '批 4', badge: '',
    desc: '纪检域参数（考察确认超期天数）——纪检委员可调，纪检台超期判定/书记台考察提醒随参数生效。',
    note: '参数卡片编辑 + 恢复默认。',
  },
  'domain-org': {
    title: '域参数 · 组织', batch: '批 4', badge: '',
    desc: '组织域参数（学期末滞留集中复核窗口）——组织委员可调，书记待办提醒窗口与文案随参数生效。',
    note: '参数卡片编辑 + 恢复默认。',
  },
  'domain-leader': {
    title: '域参数 · 组长', batch: '批 4', badge: '',
    desc: '组长域参数（学期组员进展自动归集提醒开关）——组长可调，组长台开学周提醒随参数生效。',
    note: '开关编辑 + 恢复默认。',
  },
  'party-staff-shortcut': {
    title: '支部治理 · 快捷块说明', batch: '批 3/4', badge: '建设中',
    desc: '党委组织员视角：跨支部治理的快捷块说明（支部治理面集中监控入口说明）。',
    note: '规划：随支部治理迁移批次补充快捷块内容。',
  },
};

// ═══════════════ 渲染 =═══════════════
let _currentRole = '';
let _currentSectionId = 'appearance';

function renderGroups(container) {
  const groups = buildGroups(_currentRole);
  container.innerHTML = groups.map(g => `
    <div class="settings-group">
      <div class="settings-group-caption">${g.caption}</div>
      <div class="flex flex-col gap-1">
        ${g.items.map(it => `
          <button type="button" class="settings-group-item ${it.id === _currentSectionId ? 'active' : ''}" data-section="${it.id}">
            <span>${it.label}</span>
            ${SECTION_META[it.id]?.badge ? `<span class="settings-mini-badge">建设中</span>` : ''}
          </button>
        `).join('')}
      </div>
    </div>
  `).join('');
  container.querySelectorAll('.settings-group-item').forEach(btn => {
    btn.addEventListener('click', () => {
      _currentSectionId = btn.dataset.section;
      renderGroups(container);
      renderPanel(document.getElementById('settings-panel'));
    });
  });
}

function renderPanel(panel) {
  const meta = SECTION_META[_currentSectionId] || SECTION_META['appearance'];
  if (_currentSectionId === 'appearance') {
    const loggedIn = !!_currentRole;
    const scopeNote = loggedIn
      ? '外观偏好随当前账号保存，切换登录人互不影响；未登录访客的外观保存在本浏览器。'
      : '当前为访客浏览：外观偏好保存在本浏览器；登录后外观将随账号独立保存。';
    panel.innerHTML = `
      <div class="settings-card">
        <div class="settings-card-head">
          <h2 class="settings-card-title">外观</h2>
          <span class="settings-badge settings-badge-live">即时生效</span>
        </div>
        <p class="settings-card-desc">字号、明暗主题与强调色的个人偏好设置 —— 保存后全站即时生效。</p>
        <div id="appearance-controls-host" class="mt-2"></div>
      </div>
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

  // 批4（2026-09-09 书记批「域参数」）：支部制度参数（L3 锁定展示）+ 域参数三卡（L2 按角色可调）
  if (_currentSectionId === 'branch-policy-params' || _currentSectionId === 'domain-disc'
    || _currentSectionId === 'domain-org' || _currentSectionId === 'domain-leader') {
    renderPolicySection(panel, _currentSectionId);
    return;
  }

  panel.innerHTML = `
    <div class="settings-card">
      <div class="settings-card-head">
        <h2 class="settings-card-title">${meta.title}</h2>
        ${meta.badge ? `<span class="settings-badge">${meta.badge}</span>` : ''}
      </div>
      <p class="settings-card-desc">${meta.desc}</p>
      <div class="settings-note">
        <span class="settings-note-dot"></span>
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
  await import(`../modules/capabilities/${stem}-workspace.js?v=20260909e`);
  const cap = getCapabilities({ scope }).find(c => c.id === `${stem}-workspace`);
  const rawTabs = cap && typeof cap.tabs === 'function' ? cap.tabs() : [];
  if (!rawTabs.length) return null;
  const { applyTabPolicy, getBranchIdOfPerson } = await import('../services/branch.js?v=20260909e');
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
      ? `<span class="myws-tag myws-tag-locked">${icon('lock', { className: 'icon-base w-3 h-3' })} 核心固定</span>`
      : (isMine
        ? '<span class="myws-tag myws-tag-mine">我的调整</span>'
        : '<span class="myws-tag myws-tag-default">默认</span>');
    const acts = locked ? '' : `
      <button type="button" class="myws-act" data-myws="move" data-id="${id}" data-dir="-1" title="上移" aria-label="上移 ${tab.label || id}" ${i === 0 ? 'disabled' : ''}>${icon('chevronUp', { className: 'icon-base w-4 h-4' })}</button>
      <button type="button" class="myws-act" data-myws="move" data-id="${id}" data-dir="1" title="下移" aria-label="下移 ${tab.label || id}" ${i === biz.length - 1 ? 'disabled' : ''}>${icon('chevronDown', { className: 'icon-base w-4 h-4' })}</button>
      ${isMine ? `<button type="button" class="myws-act" data-myws="restore-row" data-id="${id}" title="恢复该行默认位置" aria-label="恢复 ${tab.label || id} 默认位置">${icon('undo', { className: 'icon-base w-4 h-4' })}</button>` : ''}`;
    return `
      <li class="myws-row${locked ? ' is-locked' : ''}" draggable="${!locked}" data-id="${id}" data-locked="${locked ? '1' : '0'}">
        <span class="myws-grip" title="${locked ? '核心固定，不可拖动' : '拖拽排序'}">${icon('grip', { className: 'icon-base w-4 h-4' })}</span>
        <span class="myws-name">${tab.label || id}</span>
        <span class="myws-chip">${tab.groupLabel || '页签'}</span>
        <span class="myws-badges">${statusTag}</span>
        <span class="myws-acts">${acts}</span>
      </li>`;
  }).join('');
  return `
    <div class="settings-card">
      <div class="settings-card-head">
        <h2 class="settings-card-title">我的工作台</h2>
        <span class="myws-top-actions">
          <button type="button" class="myws-btn-ghost" data-myws="reset-all" title="恢复全部默认（清除本账号顺序调整）" ${hasPref ? '' : 'disabled'}>${icon('undo', { className: 'icon-base w-[13px] h-[13px]' })}恢复全部默认</button>
        </span>
      </div>
      <p class="settings-card-desc">${label}工作台页签顺序 · 拖拽或按钮调整，即时保存（仅对当前账号生效）。</p>
      <ul class="myws-list" data-myws-list="1">${rows}</ul>
      <p class="myws-status" data-myws-status aria-live="polite"></p>
      <div class="myws-hint">${hint}</div>
    </div>`;
}

function mywsEmptyHtml(text) {
  return `<div class="settings-card"><h2 class="settings-card-title">我的工作台</h2><p class="settings-card-desc">${text}</p></div>`;
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
// 可见角色 = SECRETARY_GOV（书记/副书记）；副书同权（2026-09-09 书记批）：config 写权同现任书记。
// 数据链：当前人 → 有效归属支部（branch.getBoundBranch，2026-09-09 归属显式化——不再 getBranchIdOfPerson
//       回退示例支部；无归属 → 统一「未找到您所属支部」提示卡）→ config 各读/写口。
let _govSeq = 0;      // 支部治理区异步加载序号（切区块防串写）
let _govBranchId = ''; // 当前登录人所属支部（info/order/history/wizard 共用；访问前解析）
let _bwsModel = null;  // 工作台默认顺序当前渲染模型（行操作/拖拽读取最新 pending）

const GOV_ROLES = new Set(['secretary', 'deputy-secretary']); // 支部治理分组可见角色（与 buildGroups 同源）

function govEmptyHtml(text) {
  return `<div class="settings-card"><h2 class="settings-card-title">支部治理</h2><p class="settings-card-desc">${text}</p></div>`;
}

/** 区块分发：支部信息与向导 / 工作台默认顺序 */
async function renderBranchGovSection(panel, sectionId) {
  const seq = ++_govSeq;
  const { role, personId } = _session;
  if (!role || !personId || !GOV_ROLES.has(role)) {
    panel.innerHTML = govEmptyHtml('支部书记 / 副书记登录后可用（其它角色无支部治理分组）。');
    return;
  }
  panel.innerHTML = govEmptyHtml('加载支部配置…');
  try {
    const br = await import('../services/branch.js?v=20260909e');
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
    } else if (_currentSectionId === 'branch-default-tab-order') {
      // 2026-09-09 冒烟修复：先注册书记工作台能力模块（buildBranchOrderModel 读注册表取 tab 清单；
      // 设置页独立加载，不先经 workspace-shell/我的工作台则能力未注册 → 误显「未能读取…页签清单」）
      await import('../modules/capabilities/secretary-workspace.js?v=20260909e');
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
  const { role } = _session;
  const org = br.getBranchOrg(branch.id);
  const roleLabel = role === 'deputy-secretary' ? '党支部副书记' : '党支部书记';
  const kv = [
    ['支部名称', org.name || '—'],
    ['类别', org.type || '—'],
    ['页眉显示名', org.headerTitle || org.name || '—'],
    ['支部自述', org.desc || '—'],
  ].map(([k, v]) => `<div class="settings-kv-row"><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('');
  panel.innerHTML = `
    <div class="settings-card">
      <div class="settings-card-head">
        <h2 class="settings-card-title">支部信息与向导</h2>
        <span class="settings-badge">${roleLabel} · 本支部</span>
      </div>
      <p class="settings-card-desc">支部基础档案只读展示（名称等治理字段归党委管理）；需要调整支部信息 / 模块组合 / 分工 / 术语时，打开换组织向导 —— 每步保存即时生效并留痕。</p>
      <dl class="settings-kv">${kv}</dl>
    </div>
    <div class="gov-wizard-card">
      <span class="gov-wizard-ic">${icon('flag', { className: 'icon-base w-5 h-5' })}</span>
      <div class="gov-wizard-t">
        <b>换组织向导（支部信息 / 模块组合 / 分工 / 术语）</b>
        <span>把支部配置收进 4 步引导：填写支部信息 → 组合模块 → 定分工 → 校准术语。书记 / 副书记（副书同权）限本支部；党委组织员可切任意支部。</span>
      </div>
      <button type="button" class="bws-btn-primary" data-gov="wizard-open">打开换组织向导（内嵌）</button>
    </div>`;
  bindBranchGovDelegates(panel);
}

/** 打开换组织向导（内嵌，同源 embed：branch-config-tab 原宿主逻辑等价落地） */
async function openWizardEmbed(panel) {
  const { role, personId } = _session;
  const seq = ++_govSeq;
  panel.innerHTML = `
    <div class="gov-wizard-bar">
      <button type="button" class="gov-wizard-back" data-gov="wizard-close">${icon('arrowLeft', { className: 'icon-base w-3.5 h-3.5' })} 返回支部信息</button>
      <span class="gov-wizard-tip">换组织向导 · 内嵌（同源组件；改动即时生效并留痕）</span>
    </div>
    <div id="settings-wizard-host"></div>`;
  const host = panel.querySelector('#settings-wizard-host');
  try {
    const { mountOrgSetupWizard } = await import('../components/org-setup-wizard.js?v=20260909e');
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
// 单键变更可「回滚此更改」（书记/副书记副书同权；party-staff 在党委台治理，本设置页无此路径）。
const CONFIG_HISTORY_LABELS = {
  modules: '工作台模块', blocks: '产出块', workforce: '支部分工', policyOverrides: '域参数',
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
  const whyHtml = h.why ? `<div style="margin-top:2px;"><span class="text-[11px] text-gray-400">依据/出处：</span><span class="text-[11px]" style="color:var(--app-accent,#B91C1C);">${esc(h.why)}</span></div>` : '';
  return `
    <li class="cfg-hist-row" style="display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border:1px solid var(--neutral-200,#E5E7EB);border-radius:10px;background:#fff;">
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
          <span class="cfg-hist-key" style="font-size:11px;font-weight:600;padding:1px 8px;border-radius:9999px;color:var(--app-accent,#B91C1C);background:var(--app-accent-bg,rgba(185,28,28,0.08));">${esc(whatLabel)}</span>
          ${isRollback ? '<span style="font-size:10px;padding:1px 6px;border-radius:9999px;background:#FEF3C7;color:#92400E;">已回滚</span>' : ''}
          <span class="text-[11px] font-medium text-gray-700">${esc(who)}</span>
          <span class="text-[11px] text-gray-400">${esc(when)}</span>
        </div>
        <div class="text-[12px] text-gray-600" style="margin-top:4px;word-break:break-all;">${brief}</div>
        ${whyHtml}
      </div>
      ${rollbackable ? `<button type="button" class="bws-btn-primary bws-btn-primary-sm" data-gov="rollback" data-at="${esc(h.at)}" title="将该键恢复到本次变更前的值并留痕" style="flex-shrink:0;">回滚此更改</button>` : ''}
    </li>`;
}

/** 渲染「配置变更记录」卡（只读列表；最新在前，展示最近 50 条；0 条给空态） */
function renderConfigHistorySection(panel, br, branch, statusMsg) {
  const { role } = _session;
  const roleLabel = role === 'deputy-secretary' ? '副书记' : '书记';
  const history = Array.isArray(branch.config && branch.config.configChangeHistory)
    ? branch.config.configChangeHistory
    : [];
  const rowsHtml = history.length
    ? [...history].slice(-50).reverse().map(_cfgHistoryRowHtml).join('')
    : '<p class="text-sm" style="color:var(--neutral-400,#9CA3AF);padding:8px 2px;">暂无配置变更记录</p>';
  panel.innerHTML = `
    <div class="settings-card">
      <div class="settings-card-head">
        <h2 class="settings-card-title">配置变更记录</h2>
        <span class="settings-badge">${esc(roleLabel)} · 本支部 · 审计</span>
      </div>
      <p class="settings-card-desc">支部配置（工作台模块 / 产出块 / 分工 / 组织档案 / 域参数等）每次保存自动留痕：操作人、时间、变更键、前后值摘要与依据（why）。单键变更可由书记 / 副书记（副书同权）回滚，回滚本身再留一痕；历史保留最近 100 条。</p>
      <ul class="cfg-hist-list" style="display:flex;flex-direction:column;gap:8px;margin-top:12px;padding:0;list-style:none;">${rowsHtml}</ul>
      <p class="myws-status" data-cfg-hist-status aria-live="polite"></p>
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
  if (!window.confirm('确认回滚此条配置更改？系统将把该配置键恢复到本次变更前的值，并追加一条回滚留痕（回滚本身可查不可再回滚）。')) return;
  const seq = ++_govSeq;
  try {
    const br = await import('../services/branch.js?v=20260909e');
    const res = await br.rollbackBranchConfig(_govBranchId, { by: personId, targetEntryAt: entryAt });
    if (!res.ok) {
      if (_currentSectionId === 'branch-config-history' && seq === _govSeq) showCfgHistStatus(panel, res.reason || '回滚失败。', true);
      return;
    }
    if (_currentSectionId !== 'branch-config-history' || seq !== _govSeq) return;
    const branch = br.getBranchById(_govBranchId);
    if (!branch) { panel.innerHTML = govEmptyHtml(GOV_NO_BRANCH_TEXT); return; }
    renderConfigHistorySection(panel, br, branch, '已回滚并留痕');
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
  // 能力目录 = 书记工作台 tab（书记/副书记共台；同 org-setup-wizard _branchTabs / workspace-shell）
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
    return `<span class="myws-tag myws-tag-locked">${icon('lock', { className: 'icon-base w-3 h-3' })} 核心固定</span>`;
  }
  const savedIdx = model.savedDisplay.indexOf(tab.id);
  const moved = savedIdx !== i;
  return moved
    ? '<span class="myws-tag myws-tag-mine">调整中</span>'
    : '<span class="myws-tag myws-tag-default">默认</span>';
}

function branchOrderCardHtml(model) {
  const { role } = _session;
  const roleLabel = role === 'deputy-secretary' ? '副书记' : '书记';
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
      <button type="button" class="myws-act" data-bws="move" data-id="${id}" data-dir="-1" title="上移" aria-label="上移 ${tab.label || id}" ${bizIdx === 0 ? 'disabled' : ''}>${icon('chevronUp', { className: 'icon-base w-4 h-4' })}</button>
      <button type="button" class="myws-act" data-bws="move" data-id="${id}" data-dir="1" title="下移" aria-label="下移 ${tab.label || id}" ${bizIdx === bizLen - 1 ? 'disabled' : ''}>${icon('chevronDown', { className: 'icon-base w-4 h-4' })}</button>`;
    return `
      <li class="myws-row${locked ? ' is-locked' : ''}" draggable="${!locked}" data-id="${id}" data-locked="${locked ? '1' : '0'}">
        <span class="myws-grip" title="${locked ? '核心固定，不可拖动' : '拖拽排序'}">${icon('grip', { className: 'icon-base w-4 h-4' })}</span>
        <span class="myws-name">${esc(tab.label || id)}</span>
        <span class="myws-chip">${esc(tab.groupLabel || '页签')}</span>
        <span class="myws-badges">${bwsRowBadgeHtml(model, tab, bizIdx)}</span>
        <span class="myws-acts">${acts}</span>
      </li>`;
  }).join('');
  const modulesNull = !model.modules;
  const dirty = !sameIdOrder(model.bizIds, model.savedDisplay);
  return `
    <div class="settings-card">
      <div class="settings-card-head">
        <h2 class="settings-card-title">工作台默认顺序</h2>
        <span class="myws-top-actions">
          <button type="button" class="myws-btn-ghost" data-bws="reset-all" title="恢复系统默认顺序（默认全开 + 注册序）" ${modulesNull ? 'disabled' : ''}>${icon('undo', { className: 'icon-base w-[13px] h-[13px]' })}恢复默认</button>
          <button type="button" class="bws-btn-primary bws-btn-primary-sm" data-bws="save" title="保存为支部默认顺序" ${dirty ? '' : 'disabled'}>保存</button>
        </span>
      </div>
      <p class="settings-card-desc">${roleLabel}设定支部工作台默认页签顺序 —— 保存后<strong>全体成员下一刷新按新默认</strong>；成员仍可在「个人设置 → 我的工作台」做个人调整。</p>
      <div class="bws-callout">${icon('bell', { className: 'icon-base w-3.5 h-3.5 myws-tag' })}<span>影响全体成员：此处变更写入支部默认配置（config.modules），全员工作台随之生效；行徽标「默认」= 与当前支部默认一致，「调整中」= 有未保存的位置调整。</span></div>
      <ul class="myws-list" data-bws-list="1">${rows}</ul>
      <p class="myws-status" data-bws-status aria-live="polite"></p>
      ${coreHint ? `<div class="myws-hint">${coreHint}</div>` : ''}
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
    const br = await import('../services/branch.js?v=20260909e');
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
    const br = await import('../services/branch.js?v=20260909e');
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
    const br = await import('../services/branch.js?v=20260909e');
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

// ═══════════════ 批4 支部制度参数 + 域参数（policy 收编接线，2026-09-09 书记批）═══════════════
// 分层：支部制度参数（L3）= 制度默认只读锁定展示（票决门槛/应到口径/会议考勤类型/记录人/标因），
//   改须书记/党委裁决（本设置页不开放直改）；域参数（L2）= 纪检/组织/组长各自可见可调自己域，
//   保存走 branch.savePolicyOverrides（白名单净化 + 角色守卫：书记/副/party-staff 全量、域负责人本域）。
// 数据链：制度默认与输入默认值 = POLICY_DEFAULTS（工厂值，本页不注入覆盖 → 展示「制度默认」）；
//   当前生效覆盖 = branch.config.policyOverrides；保存后写入 config（留痕同 configChangeHistory）。
const DOMAIN_CARD_META = {
  'domain-disc': { role: 'disc-commissioner', roleLabel: '纪检委员', section: 'inspection', sectionLabel: '纪检域' },
  'domain-org': { role: 'org-commissioner', roleLabel: '组织委员', section: 'memberConfirmation', sectionLabel: '组织域' },
  'domain-leader': { role: 'leader', roleLabel: '党小组组长', section: 'leader', sectionLabel: '组长域' },
};
const LOCKED_POLICY_ROLES = new Set(['secretary', 'deputy-secretary']); // 制度锁定展示 = 书记/副视角

function policyEmptyHtml(title, text) {
  return `<div class="settings-card"><h2 class="settings-card-title">${title}</h2><p class="settings-card-desc">${text}</p></div>`;
}

/** 统一入口：支部制度参数（书记/副）/ 域参数卡（域负责人）——可见角色不匹配给提示 */
async function renderPolicySection(panel, sectionId) {
  const seq = ++_govSeq;
  const { role, personId } = _session;
  if (!role || !personId) {
    panel.innerHTML = policyEmptyHtml(SECTION_META[sectionId]?.title || '设置', '登录后可用。');
    return;
  }
  if (sectionId === 'branch-policy-params') {
    if (!LOCKED_POLICY_ROLES.has(role)) {
      panel.innerHTML = policyEmptyHtml('支部制度参数', '支部书记 / 副书记（副书同权）可查看本区块；其它角色无此分组。');
      return;
    }
  } else {
    const meta = DOMAIN_CARD_META[sectionId];
    if (!meta || role !== meta.role) {
      panel.innerHTML = policyEmptyHtml(SECTION_META[sectionId]?.title || '域参数', '仅该域负责人登录后可见可调（可管则见）。');
      return;
    }
  }
  panel.innerHTML = policyEmptyHtml(SECTION_META[sectionId]?.title || '设置', '加载支部配置…');
  try {
    const br = await import('../services/branch.js?v=20260909e');
    // 2026-09-09 归属显式化：支部语境用 getBoundBranch（无归属 → 统一提示，不兜底示例支部）
    const branch = br.getBoundBranch(personId);
    if (!branch) {
      panel.innerHTML = policyEmptyHtml('支部治理', GOV_NO_BRANCH_TEXT);
      return;
    }
    if (seq !== _govSeq || _currentSectionId !== sectionId) return; // 已切区块
    _govBranchId = branch.id;
    if (sectionId === 'branch-policy-params') {
      panel.innerHTML = branchPolicyLockedCardHtml(branch);
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

// ── 支部制度参数（L3 锁定展示 · 书记/副视角）──────────────────────────
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
    const names = roles.map(rc => ({ secretary: '书记', 'deputy-secretary': '副书记', 'disc-commissioner': '纪检', leader: '组长' }[rc] || rc)).join('/');
    return `${type}→${names}`;
  });
  return parts.join('；') + '（主题党日等组织者位活动：记录人=该活动组织者）';
}

function branchPolicyLockedCardHtml(branch) {
  const { role } = _session;
  const roleLabel = role === 'deputy-secretary' ? '副书记' : '书记';
  const meetingChips = (POLICY_DEFAULTS.attendance.meetingTypes || []).map(t =>
    `<span class="text-[11px] px-1.5 py-0.5 rounded-full bg-[var(--app-accent-bg)] text-[var(--app-accent)] border border-[var(--app-accent-border)] whitespace-nowrap">${esc(t)}</span>`).join('');
  const reasonChips = (POLICY_DEFAULTS.attendance.reasons || []).map(r =>
    `<span class="text-[11px] px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-600 border border-gray-200 whitespace-nowrap">${esc(r.label)}</span>`).join('');
  const rows = [
    ['票决通过门槛', _quorumLabel()],
    ['会议应到口径', _rosterLabel()],
    ['会议考勤类型', `<span class="flex flex-wrap gap-1.5 pt-0.5">${meetingChips}</span>`],
    ['考勤记录人', _recorderLabel()],
    ['请假/缺席标因', `<span class="flex flex-wrap gap-1.5 pt-0.5">${reasonChips}</span>`],
  ].map(([k, v]) => `<div class="settings-kv-row"><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('');
  return `
    <div class="settings-card">
      <div class="settings-card-head">
        <h2 class="settings-card-title">支部制度参数</h2>
        <span class="settings-badge">${esc(roleLabel)} · 本支部</span>
      </div>
      <p class="settings-card-desc">支部级制度参数的「制度默认」集中展示（数据单一源 = policy-defaults）。本页不开放直改：制度刚性锁定，如需按支部调整须书记/党委裁决后在系统层变更。</p>
      <dl class="settings-kv">${rows}</dl>
      <div class="settings-note" style="margin-top:14px;">
        <span class="settings-note-dot"></span>
        制度刚性锁定 · 改须党委/书记裁决。上方展示值即当前支部现行口径（含开源部署调整面，均不在本页直改）。
      </div>
      <div class="myws-hint">
        <b>支部制度可调参数：暂无。</b>当前 policy 覆盖白名单（POLICY_OVERRIDABLE）内均为「域参数（L2）」，归纪检 / 组织 / 组长各自在左栏「域参数」卡中调整；制度项若后续被书记/党委裁决放开为支部可调，将在本区出现并登记白名单——后续按裁决扩展。
      </div>
    </div>`;
}

// ── 域参数卡（L2 编辑 · 纪检/组织/组长各自可见）───────────────────────
function _overridesOf(branch) {
  const po = branch?.config?.policyOverrides;
  return (po && typeof po === 'object' && !Array.isArray(po)) ? po : {};
}

function domainCardHtml(meta, branch, P) {
  const po = _overridesOf(branch);
  const hasOverride = !!po[meta.section];
  const statusHtml = `<p class="myws-status" data-pol-status aria-live="polite"></p>`;
  if (meta.section === 'inspection') {
    const def = P.inspection.overdueDays;
    const cur = (Number.isInteger(po.inspection?.overdueDays) ? po.inspection.overdueDays : def);
    return `
      <div class="settings-card">
        <div class="settings-card-head">
          <h2 class="settings-card-title">域参数 · 纪检</h2>
          <span class="settings-badge">${esc(meta.roleLabel)} 可调</span>
        </div>
        <p class="settings-card-desc">考察记录「超期未确认」判定天数。保存后：纪检台「考察总表」超期提醒与文案、书记台「考察超期未确认」提醒 deadline 同源生效。</p>
        <div class="settings-kv-row">
          <dt>考察确认超期</dt>
          <dd>
            <label class="flex items-center gap-2">
              <span class="text-xs text-gray-600">超过</span>
              <input type="number" id="pol-inp-disc-days" class="input-flat text-xs w-20 text-center" min="1" max="90" value="${cur}" inputmode="numeric">
              <span class="text-xs text-gray-600">天未确认判超期</span>
            </label>
            <div class="text-[11px] text-gray-400 mt-1">范围 1–90 天；默认 ${def} 天（制度默认）。当前${hasOverride ? '已按本支部覆盖值生效' : '= 制度默认'}。</div>
          </dd>
        </div>
        <div class="pt-3 border-t border-gray-100 flex items-center gap-2">
          <button type="button" class="bws-btn-primary bws-btn-primary-sm" data-pol-save="domain-disc">保存</button>
          <button type="button" class="myws-btn-ghost" data-pol-reset="domain-disc" ${hasOverride ? '' : 'disabled'}>恢复默认</button>
        </div>
        ${statusHtml}
      </div>`;
  }
  if (meta.section === 'memberConfirmation') {
    const def = P.memberConfirmation.semesterDetainedWindows;
    const cur = Array.isArray(po.memberConfirmation?.semesterDetainedWindows) && po.memberConfirmation.semesterDetainedWindows.length
      ? po.memberConfirmation.semesterDetainedWindows : def;
    const win = (idx) => cur[idx] || [6, 15, 7, 15];
    const w1 = win(0); const w2 = win(1);
    const pad = (v) => String(v).padStart(2, '0');
    const winLabel = (w, cross) => `${pad(w[0])}-${pad(w[1])} ～ ${cross ? '次年 ' : ''}${pad(w[2])}-${pad(w[3])}`;
    const num = (v, id) => `<input type="number" id="${id}" class="input-flat text-xs w-16 text-center" min="1" max="31" value="${v}" inputmode="numeric">`;
    return `
      <div class="settings-card">
        <div class="settings-card-head">
          <h2 class="settings-card-title">域参数 · 组织</h2>
          <span class="settings-badge">${esc(meta.roleLabel)} 可调</span>
        </div>
        <p class="settings-card-desc">学期末滞留集中复核提醒窗口（每年两段：每学期末集中复核在册滞留）。保存后：书记台「学期末滞留集中复核」提醒窗口与文案同源生效。</p>
        <div class="space-y-3">
          <div class="settings-kv-row">
            <dt>区间 1</dt>
            <dd class="flex items-center gap-1.5 flex-wrap">
              ${num(w1[0], 'pol-org-1-sm')}<span class="text-xs text-gray-400">月</span>${num(w1[1], 'pol-org-1-sd')}<span class="text-xs text-gray-400">日 ～</span>
              ${num(w1[2], 'pol-org-1-em')}<span class="text-xs text-gray-400">月</span>${num(w1[3], 'pol-org-1-ed')}<span class="text-xs text-gray-400">日</span>
              <span class="text-[11px] text-gray-400">默认 ${winLabel(def[0] || w1, false)}</span>
            </dd>
          </div>
          <div class="settings-kv-row">
            <dt>区间 2</dt>
            <dd class="flex items-center gap-1.5 flex-wrap">
              ${num(w2[0], 'pol-org-2-sm')}<span class="text-xs text-gray-400">月</span>${num(w2[1], 'pol-org-2-sd')}<span class="text-xs text-gray-400">日 ～</span>
              ${num(w2[2], 'pol-org-2-em')}<span class="text-xs text-gray-400">月（次年）</span>${num(w2[3], 'pol-org-2-ed')}<span class="text-xs text-gray-400">日</span>
              <span class="text-[11px] text-gray-400">默认 ${winLabel(def[1] || w2, true)}（止月小于起月 = 跨年）</span>
            </dd>
          </div>
        </div>
        <div class="text-[11px] text-gray-400 mt-1">月 1–12、日 1–31；共两段窗口。当前${hasOverride ? '已按本支部覆盖值生效' : '= 制度默认'}。</div>
        <div class="pt-3 border-t border-gray-100 flex items-center gap-2">
          <button type="button" class="bws-btn-primary bws-btn-primary-sm" data-pol-save="domain-org">保存</button>
          <button type="button" class="myws-btn-ghost" data-pol-reset="domain-org" ${hasOverride ? '' : 'disabled'}>恢复默认</button>
        </div>
        ${statusHtml}
      </div>`;
  }
  // leader
  const defOn = !!P.leader.semesterReportReminder?.enabled;
  const curOn = typeof po.leader?.semesterReportReminder?.enabled === 'boolean' ? po.leader.semesterReportReminder.enabled : defOn;
  return `
    <div class="settings-card">
      <div class="settings-card-head">
        <h2 class="settings-card-title">域参数 · 组长</h2>
        <span class="settings-badge">${esc(meta.roleLabel)} 可调</span>
      </div>
      <p class="settings-card-desc">学期组员进展自动归集提醒：每学期开学周（3 月 / 9 月首周）在组长工作台提醒一次「逐人归集本组组员进展」。频率固定学期制。</p>
      <div class="settings-kv-row">
        <dt>学期提醒</dt>
        <dd>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" id="pol-leader-enabled" class="w-4 h-4 accent-[var(--app-accent,#B91C1C)]" ${curOn ? 'checked' : ''}>
            <span class="text-xs text-gray-700">开启「学期组员进展归集提醒」（默认开）</span>
          </label>
          <div class="text-[11px] text-gray-400 mt-1">频率：每学期（3 月 / 9 月开学首周提醒一次；首次查看后本学期不再重复弹）。当前${hasOverride ? '已按本支部覆盖值生效' : '= 制度默认（开）'}。</div>
        </dd>
      </div>
      <div class="pt-3 border-t border-gray-100 flex items-center gap-2">
        <button type="button" class="bws-btn-primary bws-btn-primary-sm" data-pol-save="domain-leader">保存</button>
        <button type="button" class="myws-btn-ghost" data-pol-reset="domain-leader" ${hasOverride ? '' : 'disabled'}>恢复默认</button>
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

/** 读域卡当前输入 → 保存 patch（非法输入给出提示并返回 null） */
function _readDomainPatch(meta, panel) {
  if (meta.section === 'inspection') {
    const el = panel.querySelector('#pol-inp-disc-days');
    const days = el ? parseInt(el.value, 10) : NaN;
    if (!Number.isInteger(days) || days < 1 || days > 90) {
      showPolicyStatus(panel, '请输入 1–90 之间的整数天数。', true);
      return null;
    }
    return { inspection: { overdueDays: days } };
  }
  if (meta.section === 'memberConfirmation') {
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
    return { memberConfirmation: { semesterDetainedWindows: windows } };
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
    ? { [meta.section]: null }
    : _readDomainPatch(meta, panel);
  if (action === 'save' && !patch) return; // 输入非法已提示
  const seq = ++_govSeq;
  try {
    const br = await import('../services/branch.js?v=20260909e');
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
    if (resetBtn) { runPolicyAction(panel, resetBtn.dataset.polReset, 'reset'); }
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
  renderGroups(document.getElementById('settings-groups'));
  renderPanel(document.getElementById('settings-panel'));

  renderSidebar('settings', { staticShell: true });
  renderHeader('settings', { staticShell: true });
}

// 数据层初始化（2026-09-09 冒烟修复）：已登录且有 token 时切 API 数据源；否则恢复本地 mock
// （同 search/wizard 独立页口径——BranchService.loadDB 含 reset/init 触发链与 init 态种子过滤）。
registerApiAdapter(ApiAdapter);
const _savedToken = (() => { try { return sessionStorage.getItem('gsm1921-api-token'); } catch { return null; } })();
if (_savedToken) {
  setDataSource('api', { apiBaseUrl: '', authToken: _savedToken });
  try {
    await dataInit();
  } catch (e) {
    console.warn('[settings] API 数据加载失败，回退本地 mock', e);
    setDataSource('mock');
  }
} else {
  try {
    BranchService.loadDB();
  } catch (e) {
    console.warn('[settings] mock 数据加载失败', e);
  }
}

init();
