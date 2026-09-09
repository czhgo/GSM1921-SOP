// role: [工程师]+[AI]
// entries/settings-entry.js — 设置中心页（批1骨架，书记 2026-09-09 批准设计 v3）
// 左分组栏依据当前登录角色显隐（本批即生效）：
//   访客                    → 仅「外观」
//   书记 / 副书记             → 个人设置(外观/我的工作台) + 支部治理(支部信息与向导/工作台默认顺序/支部制度参数)
//   纪检(dis)/组织(org)/组长  → 个人设置 + 支部治理(域参数·纪检/组织/组长)
//   宣传(prop)/成员(participant等) → 个人设置（无支部治理分组）
//   党委(party-staff)        → 个人设置 + 支部治理(快捷块说明)
// 右内容区随左栏选中切换：本批仅「外观」区功能完整（外观控件 render+bind 复用
// components/appearance-controls.js）；其余区显示「建设中·随后续批次开放」占位
// （分组结构可见性即角色化验收点，功能随批 2/3/4 开放）。
// 登录态：非纯静态——readLoginSnapshot() + 动态 import auth（同 sidebar.js 模式）。

import { renderSidebar } from '../components/sidebar.js?v=20260908d';
import { renderHeader } from '../components/header.js?v=20260908d';
import { readLoginSnapshot } from '../core/login-snapshot.js?v=20260908d';
import { ROLE_LABELS, ROLE_PAGE_MAP, resolveAccentRole, getAccentColors } from '../core/constants.js?v=20260908d';
import { appearanceControlsHTML, bindAppearanceControls } from '../components/appearance-controls.js?v=20260908d';
import { icon } from '../core/icons.js?v=20260908d';
import { getCapabilities } from '../core/registry.js?v=20260908d';
import {
  coreTabIdsOf, sameIdOrder, applyPersonalTabOrder, readPersonalTabOrder,
  savePersonalTabOrder, resetPersonalTabOrder,
} from '../services/preferences.js?v=20260908d';

// ── 数据层按需加载（同 sidebar staticShell 模式：确已登录才动态 import auth）──
let _authModule = null;
function loadAuth() {
  if (!_authModule) _authModule = import('../services/auth.js?v=20260908d');
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
    title: '支部信息与向导', batch: '批 3', badge: '建设中',
    desc: '支部档案信息查看与「更换组织向导」入口（同源 embed 复用 org-setup-wizard，不改写其逻辑）。',
    note: '规划：支部书记 / 副书记在此进入组织配置向导。',
  },
  'branch-default-tab-order': {
    title: '工作台默认顺序', batch: '批 3', badge: '建设中',
    desc: '由书记 / 副书记设定支部工作台默认标签顺序；核心功能组只读带锁，个人覆盖在「我的工作台」中调整。',
    note: '规划：拖拽排序 + 恢复默认（置空 = 系统默认顺序）。',
  },
  'branch-policy-params': {
    title: '支部制度参数', batch: '批 4', badge: '建设中',
    desc: '支部级制度参数（票决门槛 / 应到口径 / 会议类型等）制度默认只读展示，与支部制度单一源对齐。',
    note: '规划：只读展示 + 制度来源标注。',
  },
  'domain-disc': {
    title: '域参数 · 纪检', batch: '批 4', badge: '建设中',
    desc: '纪检域参数（如考察/材料超期判定天数）——纪检委员可见可调，全站判定随参数生效。',
    note: '规划：参数卡片编辑 + 生效范围说明。',
  },
  'domain-org': {
    title: '域参数 · 组织', batch: '批 4', badge: '建设中',
    desc: '组织域参数（如发展党员学期滞留窗口等）——组织委员可见可调，全站流程随参数生效。',
    note: '规划：参数卡片编辑 + 生效范围说明。',
  },
  'domain-leader': {
    title: '域参数 · 组长', batch: '批 4', badge: '建设中',
    desc: '组长域参数（如学期报告提醒开关与学期制口径）——组长可见可调，组长工作台随参数生效。',
    note: '规划：参数卡片编辑 + 生效范围说明。',
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
  await import(`../modules/capabilities/${stem}-workspace.js?v=20260908d`);
  const cap = getCapabilities({ scope }).find(c => c.id === `${stem}-workspace`);
  const rawTabs = cap && typeof cap.tabs === 'function' ? cap.tabs() : [];
  if (!rawTabs.length) return null;
  const { applyTabPolicy, getBranchIdOfPerson } = await import('../services/branch.js?v=20260908d');
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
  // 静态页不跑 bootstrap，此处按 bootstrap.js 同口径设置 --app-accent）
  const { accent, accentRgba, accentBorder } = getAccentColors(resolveAccentRole(_currentRole));
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

init();
