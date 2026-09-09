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
    title: '我的工作台', batch: '批 2', badge: '建设中',
    desc: '个人工作台标签顺序：默认沿用支部默认顺序，个人调整仅作用于本人；核心功能组不可隐藏（锁定只读）。',
    note: '规划交互：拖拽 / 上移下移调整顺序，一键恢复默认。',
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
