// role: [工程师]+[AI]
// services/branch.js — 支部服务（P1 党委后台，2026-09-02）
// 支部边界收敛点（防漂移）：人→支部归属、支部配置档案读取（header 软编码/主题/启停模块）
// 单一数据源：mockDB.branches（首启 seed 自 mock/branches.js BRANCHES）

import { mockDB } from '../core/domain.js?v=20260908d';
import { getPersonById } from './person.js?v=20260908d';
import { PARTY_COMMITTEE } from '../mock/branches.js?v=20260908d';
import { getAdapter, persist, getDataSource } from '../core/data-adapter.js?v=20260908d';
import { listCapabilities } from '../core/registry.js?v=20260908d';
// P1a 单向权威（2026-09-03）：config 净化唯一实现 = core/config-clean.js（server PATCH /branches/:id/config 同源）
import { sanitizeConfigBlocks, sanitizeConfigModules, sanitizeConfigWorkforce, sanitizeConfigOrg, sanitizeConfigPolicyOverrides, applyBranchPolicyOverrides } from '../core/config-clean.js?v=20260908d';
// L4（2026-09-03）：支部工作地图模块目录单一源 = core/work-map.js（11 模块/缺省分工/快照展开）
import { expandWorkforce } from '../core/work-map.js?v=20260908d';
// 批4（2026-09-09 书记批「域参数」）：policyOverrides 顶层节白名单（覆盖写口校验用）
import { POLICY_OVERRIDE_SECTIONS } from '../core/policy-defaults.js?v=20260908d';

export function getBranchById(branchId) {
  return (mockDB.branches || []).find(b => b.id === branchId) || null;
}

// ── 工作流模块配置 L2（2026-09-03 书记裁定：支部自治/书记操作/清单+画布并用/tab 级/核心固定）──
// config.modules = { hiddenTabIds: string[], tabOrder: string[] }；null = 默认全开（兼容现有演示）。
// 核心组 tab（groupLabel==='工作台'：待办/概况等，书记 2026-08-10 裁定全员必有）固定显示、
// 不可隐藏、不参与排序；业务组（党建/反馈/对接党委…）可隐藏、可按画布顺序调整。

/** 支部可勾选的工作流能力目录（派生自能力注册表 workspace:* 能力 + 其 tab 元数据；画布/清单数据源） */
export function listBranchModuleCatalog() {
  const { items } = listCapabilities({});
  return items
    .filter(cap => Array.isArray(cap.scope) && cap.scope.some(s => String(s).startsWith('workspace:')))
    .map(cap => ({
      capId: cap.id,
      name: cap.name,
      tabs: (typeof cap.tabs === 'function' ? cap.tabs() : [])
        .map(t => ({ id: t.id, label: t.label, groupLabel: t.groupLabel })),
    }));
}

/** 由 config.modules 解析策略：{ hidden:Set(tabId), order:string[]|null }（null order=沿用注册顺序） */
export function getTabPolicy(modules) {
  return {
    hidden: new Set(Array.isArray(modules?.hiddenTabIds) ? modules.hiddenTabIds : []),
    order: Array.isArray(modules?.tabOrder) && modules.tabOrder.length ? [...modules.tabOrder] : null,
  };
}

/** 支部工作流模块策略（读 mockDB.branches；纯判定见 getTabPolicy） */
export function getBranchTabPolicy(branchId) {
  return getTabPolicy(getBranchById(branchId)?.config?.modules);
}

/** tab 分类：核心组（groupLabel='工作台'）固定；业务组可配置 */
function _splitTabs(tabs) {
  const core = tabs.filter(t => t.groupLabel === '工作台');
  const coreIds = new Set(core.map(t => t.id));
  const business = tabs.filter(t => !coreIds.has(t.id));
  return { core, business };
}

/**
 * 纯函数：按 config.modules 过滤/排序工作台 tab（不读全局状态，便于单测与复用）
 * 核心组保持注册顺序置于前；业务组过滤 hidden 后按 tabOrder 排序（新注册 tab 若不在 order → 尾部）。
 */
export function applyTabPolicyPure(tabs, modules) {
  const { hidden, order } = getTabPolicy(modules);
  const { core, business } = _splitTabs(tabs);
  const visible = business.filter(t => !hidden.has(t.id));
  if (order && order.length) {
    const idxMap = new Map(order.map((id, i) => [id, i]));
    visible.sort((a, b) => {
      const ia = idxMap.has(a.id) ? idxMap.get(a.id) : Infinity;
      const ib = idxMap.has(b.id) ? idxMap.get(b.id) : Infinity;
      return ia - ib;
    });
  }
  return [...core, ...visible];
}

/**
 * 按支部策略过滤/排序工作台 tab（渲染侧收敛点：workspace-shell 构建 tab bar 前调用一次）
 */
export function applyTabPolicy(tabs, branchId) {
  return applyTabPolicyPure(tabs, getBranchById(branchId)?.config?.modules);
}

// ── 活动产出块策略（块画布 v0，2026-09-03）────────────────────────────────────
// config.blocks = { outputBlocks: { hiddenBlockIds, blockOrder } }；null=默认全开。
// 目录单一源：core/constants OUTPUT_BLOCK_DEFS（attendance/inspection/publicity/materials）。

/** 解析产出块策略：{ hidden:Set, order:string[]|null }（纯） */
export function getOutputBlockPolicy(blocks) {
  const cfg = blocks?.outputBlocks;
  return {
    hidden: new Set(Array.isArray(cfg?.hiddenBlockIds) ? cfg.hiddenBlockIds : []),
    order: Array.isArray(cfg?.blockOrder) && cfg.blockOrder.length ? [...cfg.blockOrder] : null,
  };
}

/** 读支部产出块配置（null=全开） */
export function getBranchOutputBlocks(branchId) {
  return getBranchById(branchId)?.config?.blocks ?? null;
}

/** 按支部产出块策略过滤/排序块 id 列表（纯：传 defIds + config.blocks） */
export function applyOutputBlockPolicy(defIds, blocks) {
  const { hidden, order } = getOutputBlockPolicy(blocks);
  const visible = defIds.filter(id => !hidden.has(id));
  if (order && order.length) {
    const idx = new Map(order.map((id, i) => [id, i]));
    visible.sort((a, b) => {
      const ia = idx.has(a) ? idx.get(a) : Infinity;
      const ib = idx.has(b) ? idx.get(b) : Infinity;
      return ia - ib;
    });
  }
  return visible;
}

// ── 工作流块策略（L3 S3，2026-09-03 书记裁定：config.blocks 增 workflowBlocks）──────
// config.blocks.workflowBlocks = { hiddenBlockIds: string[] }；null/缺省=全开。
// 目录单一源：workflow/blocks/manifests.js BLOCK_MANIFESTS（主题党日/专班等整条 SOP 入口块）。

/** 解析工作流块策略：{ hidden:Set }（纯） */
export function getWorkflowBlockPolicy(blocks) {
  const cfg = blocks?.workflowBlocks;
  return {
    hidden: new Set(Array.isArray(cfg?.hiddenBlockIds) ? cfg.hiddenBlockIds : []),
  };
}

/** 按支部工作流块策略过滤块 id 列表（纯：传 defIds + config.blocks） */
export function applyWorkflowBlockPolicy(defIds, blocks) {
  const { hidden } = getWorkflowBlockPolicy(blocks);
  return defIds.filter(id => !hidden.has(id));
}

/** 产出块配置净化（outputBlocks/workflowBlocks；null=恢复默认）——单一实现 = core/config-clean.js sanitizeConfigBlocks（2026-09-03 P1a 收口，勿另写） */
function _sanitizeBlocks(blocks) {
  return sanitizeConfigBlocks(blocks);
}

/** 保存支部产出块配置（书记/副书记操作，副书同权 2026-09-09 书记批；blocks=null=恢复默认） */
export async function updateBranchBlocks(branchId, blocks) {
  return updateBranchModules(branchId, undefined, [], blocks);
}

/** 核心 tab id 集合（供配置 UI 展示「固定」与隐藏校验） */
export function getCoreTabIds(tabs) {
  return _splitTabs(tabs).core.map(t => t.id);
}

// ── 配置变更留痕（2026-09-06 换组织向导书记 R4：即时生效 + 留痕，低频可回滚）─────────
// config.configChangeHistory: Array<{ by, at, what, from?, to? }>——谁/何时/改了什么配置键。
// 现有审计风格对照：roster.saveResidenceChange.residenceHistory（{from,to,updatedBy,updatedAt}）
// 与 auth 赋权快照（authorizedBy/authorizedAt）——本域取 {by,at,what,from,to}（任务口径）。
// 操作者取登录快照 personId：与 services/auth.js LOGIN_KEY 同键（跨模块约定，避免 import auth 循环依赖）。
function _actorId() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem('gsm1921-login-user');
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d.personId || d.userId || d.id || null;
  } catch (_) { return null; }
}

/** 配置键等值比较（undefined/null 归一；对象按 JSON 序） */
function _sameConfigVal(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/** 统一写配置（modules/blocks/workforce 共用：adapter 落库 + mock 同步 + persist） */
async function _saveBranchConfig(branchId, payload) {
  const cur = getBranchById(branchId);
  const prev = cur?.config || {};
  const at = new Date().toISOString();
  const by = _actorId();
  const history = Array.isArray(prev.configChangeHistory) ? [...prev.configChangeHistory] : [];
  // 留痕：payload 各配置键相对旧值有实质变化才追加（重复保存不产生冗余条目）
  for (const [key, to] of Object.entries(payload)) {
    if (key === 'configChangeHistory') continue;
    const from = prev[key] ?? null;
    const next = to ?? null;
    if (!_sameConfigVal(from, next)) history.push({ by, at, what: key, from, to: next });
  }
  const withHistory = { ...payload, configChangeHistory: history };
  const next = await getAdapter().branches.updateConfig(branchId, withHistory);
  const idx = (mockDB.branches || []).findIndex(b => b.id === branchId);
  if (idx >= 0) {
    mockDB.branches = [...mockDB.branches.slice(0, idx), next, ...mockDB.branches.slice(idx + 1)];
  } else if (next) {
    mockDB.branches = [...mockDB.branches, next];
  }
  persist();
  return next;
}

/**
 * 保存支部工作流配置（支部书记/副书记操作——config 写权 = party-staff / 本支部现任书记或
 * 副书记（同支部），2026-09-09 副书同权书记批；server PATCH /branches/:id/config 同口径门控）：
 *   modules —— config.modules：模块/业务 tab 配置（null=恢复默认全开；undefined=不改）；
 *   blocks  —— config.blocks：活动产出块配置（null=恢复默认；undefined=不改）
 * tabs 仅用于防御核心 tab 不可隐藏。
 */
export async function updateBranchModules(branchId, modules, tabs = [], blocks) {
  const payload = {};
  if (modules !== undefined) {
    if (modules === null) {
      payload.modules = null;
    } else {
      // 核心 tab 不可隐藏/不参与排序（配置 UI 只读展示）；限长与严格字符串口径见 core/config-clean.js
      const coreIds = new Set(getCoreTabIds(tabs));
      payload.modules = sanitizeConfigModules(modules, { coreIds });
    }
  }
  if (blocks !== undefined) payload.blocks = _sanitizeBlocks(blocks);
  return _saveBranchConfig(branchId, payload);
}

// ── L4 支部分工（workforce）───────────────────────────────────
// config.workforce = { [moduleId]: { ownerType:'role'|'person', ownerId } }；null=缺省分工。
// 模块目录单一源 = core/work-map.js（WORK_MAP_MODULES 11 项）；分工调整走支委会议题（M2）。

/** 读取支部分工快照（纯）：config.workforce 覆盖 + 未覆盖模块按缺省主责（expandWorkforce 兜底） */
export function getBranchWorkforce(branchId) {
  const branch = getBranchById(branchId);
  return expandWorkforce(branch?.config?.workforce);
}

/** 保存支部分工（书记/副书记操作，副书同权 2026-09-09 书记批/议题通过后落库；workforce=null 恢复缺省分工） */
export async function updateBranchWorkforce(branchId, workforce) {
  const payload = workforce === null
    ? { workforce: null }
    : { workforce: sanitizeConfigWorkforce(workforce) };
  return _saveBranchConfig(branchId, payload);
}

// ── 批4 域参数 policyOverrides（2026-09-09 书记批「域参数」L2 下放；config 独立域）────────
// config.policyOverrides = { 节: { 叶: 值 } }（节/叶白名单单一源 = policy-defaults POLICY_OVERRIDABLE；
// 净化唯一实现 = core/config-clean.js sanitizeConfigPolicyOverrides，与 server PATCH /branches/:id/config 同源）。
// 角色守卫（批3 副书同权谓词同口径扩展）：
//   · party-staff / 本支部现任书记 / 本支部副书记 → 全量 policyOverrides；
//   · 本支部域负责人（纪检=inspection · 组织=memberConfirmation · 组长=leader）→ 仅自己域节（含 null=恢复该域默认）。
// 消费点：设置中心「支部治理 · 域参数」卡（L2）保存/恢复默认；读侧注入 = applyEffectivePolicyDefaultsForPerson。

/** 域负责人角色 → 可管域节（纪检/组织/组长；其余角色无域节 = 不可管任何域参数） */
export const POLICY_SECTION_BY_DOMAIN_ROLE = {
  'disc-commissioner': 'inspection',
  'org-commissioner': 'memberConfirmation',
  leader: 'leader',
};

/** 操作者角色解析（actor.role 优先；缺省回退档案角色） */
function _actorRoleOf(actor) {
  const role = (actor && actor.role) || (actor && actor.personId ? (getPersonById(actor.personId) || {}).role : '') || '';
  return role;
}

/**
 * 纯判定：某人能否管理 policyOverrides（批4；供 UI 可见性与写口共用，勿在别处另写规则）。
 * @param {{ personId: string, role?: string }} actor
 * @param {string} branchId
 * @returns {{ ok: boolean, scope: 'all'|string|null, reason?: string }}
 *   scope='all'=书记/副书记/party-staff 全量；scope=域节=仅该域；null=无权
 */
export function canManagePolicyOverrides(actor, branchId) {
  const personId = actor && actor.personId;
  const branch = getBranchById(branchId);
  if (!personId || !branch) return { ok: false, scope: null, reason: '目标支部不存在或未登录' };
  const role = _actorRoleOf(actor);
  if (role === 'party-staff') return { ok: true, scope: 'all' };
  if (role === 'secretary') {
    if (branch.secretaryId && branch.secretaryId === personId) return { ok: true, scope: 'all' };
    return { ok: false, scope: null, reason: '仅本支部现任书记/副书记或党委组织员可改全量域参数' };
  }
  if (role === 'deputy-secretary') {
    if (getBranchIdOfPerson(personId) === branch.id) return { ok: true, scope: 'all' };
    return { ok: false, scope: null, reason: '仅本支部现任书记/副书记或党委组织员可改全量域参数' };
  }
  const own = POLICY_SECTION_BY_DOMAIN_ROLE[role];
  if (own && getBranchIdOfPerson(personId) === branch.id) return { ok: true, scope: own };
  return { ok: false, scope: null, reason: '无该域参数管理权' };
}

/**
 * 保存域参数覆盖（批4 写口；overrides = { 节: 值 | null }——节值 null=恢复该域默认（删除该节覆盖）；
 * 书记/副书记/party-staff 可全量；域负责人自动收窄到自己的域节；净化走 sanitizeConfigPolicyOverrides，
 * 非法值/未知键丢弃不写坏；留痕与 modules/blocks/workforce 同 config.configChangeHistory）。
 * @returns {Promise<{ ok: boolean, changed: boolean, reason?: string }>}
 */
export async function savePolicyOverrides(branchId, overrides, opts = {}) {
  const branch = getBranchById(branchId);
  if (!branch) return { ok: false, changed: false, reason: '目标支部不存在' };
  const actor = (opts && opts.actor) || {};
  const perm = canManagePolicyOverrides(actor, branchId);
  if (!perm.ok) return { ok: false, changed: false, reason: perm.reason || '无权限' };
  if (overrides === null || overrides === undefined) overrides = {};
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
    return { ok: false, changed: false, reason: 'policyOverrides 须为对象（节 → 值/null）' };
  }
  // 与既有覆盖合并：节=null → 删该节（恢复该域默认）；节=对象 → 净化后整节替换
  const prevPo = (branch.config && typeof branch.config.policyOverrides === 'object' && !Array.isArray(branch.config.policyOverrides))
    ? JSON.parse(JSON.stringify(branch.config.policyOverrides))
    : {};
  const nextPo = { ...prevPo };
  let changed = false;
  for (const sec of Object.keys(overrides)) {
    if (!POLICY_OVERRIDE_SECTIONS.includes(sec)) continue; // 未知节忽略（白名单外）
    if (perm.scope !== 'all' && sec !== perm.scope) continue; // 域负责人不可改他人域节
    if (overrides[sec] === null) {
      if (Object.prototype.hasOwnProperty.call(nextPo, sec)) { delete nextPo[sec]; changed = true; }
      continue;
    }
    const clean = sanitizeConfigPolicyOverrides({ [sec]: overrides[sec] });
    if (!clean || !clean[sec]) continue; // 全非法/空 → 该节不写
    if (!_sameConfigVal(nextPo[sec], clean[sec])) {
      nextPo[sec] = clean[sec];
      changed = true;
    }
  }
  if (!changed) return { ok: true, changed: false };
  const payload = Object.keys(nextPo).length ? { policyOverrides: nextPo } : { policyOverrides: null };
  await _saveBranchConfig(branchId, payload);
  return { ok: true, changed: true };
}

/**
 * 读侧有效默认注入（批4 便捷入口）：当前人所属支部 config.policyOverrides 注入 POLICY_DEFAULTS。
 * 调用时机 = 数据加载完成路径（services/mock.js loadDB mock/api 两形态均调用）——跨支部切换/每次
 * loadDB 先复位出厂默认再覆盖（幂等）；未登录/档案缺 branchId → 兜底 'br-b1'（同 getBranchIdOfPerson）。
 * @param {string} [personId] 当前登录人（缺省 = 按登录快照兜底 br-b1）
 */
export function applyEffectivePolicyDefaultsForPerson(personId) {
  const bid = getBranchIdOfPerson(personId);
  return applyBranchPolicyOverrides(getBranchById(bid));
}

/**
 * 人 → 所属支部 id（书记 2026-09-02 决策：党员严格单支部）
 * 无档案/党委级（party-staff，branchId null）→ 兜底 br-b1（当前唯一支部，兼容现有演示）
 */
export function getBranchIdOfPerson(personId) {
  if (!personId) return 'br-b1';
  const person = getPersonById(personId);
  return person?.branchId || 'br-b1';
}

/**
 * header 品牌软编码（config.headerTitle → branch.name → 兜底全称）
 * 支部名随支部配置更换显示——不硬编码"光华管理学院本科生党支部"
 */
export function getHeaderTitle(personId) {
  // 党委级角色：header 显示院系党委名（不属于任一支部）
  if (personId) {
    const person = getPersonById(personId);
    if (person?.role === 'party-staff') return PARTY_COMMITTEE.name;
  }
  const branch = getBranchById(getBranchIdOfPerson(personId));
  return branch?.config?.headerTitle || branch?.name || '光华管理学院本科生党支部';
}

/**
 * 党委机构名（2026-09-03 数据域接线收口：党委台 UI 原直连 mock/branches PARTY_COMMITTEE）
 * 机构信息单一源（接入真实党委机构配置时替换本实现，UI 零改动）
 */
export function getCommitteeName() {
  return PARTY_COMMITTEE?.name || '光华管理学院党委';
}

/**
 * 支部内资源隔离过滤（收敛点，防各 tab 手写过滤漂移）：
 * 按当前人所属支部过滤行；老数据无 branchId 视为 br-b1（惰性维度迁移兼容）。
 * 单支部时代恒等（全部 br-b1）；党委创建新支部并挂入跨支部数据后自然生效。
 */
export function withinBranch(rows, personId) {
  const bid = getBranchIdOfPerson(personId);
  return rows.filter(r => (r.branchId || 'br-b1') === bid);
}

// ── 党委支部管理写操作（P1；adapter CRUD 实时写 + 本地 mockDB 同步，刷新不丢）────────
// 立项⑤ 阶段A（2026-09-06）：支部创建收敛为「空组织模板 / 复制现有」双形态（EMPTY_BRANCH_TEMPLATE +
// createBranch mode），原「党委随手建支部」同一写口升级；?reset=1 仍回演示种子、不混（阶段 B 分层语义）。
// 域名分区事实（2026-09-06 核查登记）：业务域（activities/attendance/taskforces/notices/thought-reports 等）
// 当前为「单支部全域、非 branch 分区」（种子无 branchId 键），people 全员挂 br-b1（党委组织员 null）。
// 因此「空支部业务为空」落实为：新建动作只写 branches 集合，记录本身不产生业务引用（验收 1/2 可达）；
// 全域 branch 分区属 spec 风险段登记缺口，不在本立项重架构——新建支部先用于配置/模板，业务数据待分区能力落地。

/** 新建支部名长度上限（与 core/config-clean.js ORG_MAX.name 对齐） */
const NEW_BRANCH_NAME_MAX = 80;

/**
 * 空组织模板（立项⑤ 阶段A）：结构 = 支部记录骨架、业务为空。
 * 语义：
 *   - name = 占位名「新支部（待配置）」（名待填；创建时未显式给名则沿用，向导步骤①可改）。
 *   - headerTitle 空 → header 回退 branch.name（占位名）展示；desc 空、themePreset null（默认红调）。
 *   - config.modules/blocks null = 默认全开（同 br-b1）；config.workforce null = 缺省分工（expandWorkforce 兜底）。
 *   - secretaryId null = 席位空缺待党委任命。
 *   - 不引用演示成员 id（p1…）与任何业务域（people/activities/attendance/agenda/taskforces/notices/
 *     thought-reports 等）——域内引用为空，按换壳工作单逐项填入。
 */
export const EMPTY_BRANCH_TEMPLATE = Object.freeze({
  name: '新支部（待配置）',
  type: '',                       // 类别标签（自由文本，待党委录入；br-b1 例='本科生'）
  config: Object.freeze({
    headerTitle: '',
    accent: null,                 // null=默认党建红
    modules: null,                // null=工作流模块默认全开（同 br-b1 语义）
    blocks: null,                 // null=产出块/工作流块默认全开
    workforce: null,              // null=缺省分工
    desc: '',
    themePreset: null,            // null=默认红调（THEME_PRESET_IDS 外）
    fileSpaceIsolated: true,
  }),
  secretaryId: null,              // 席位空缺待任命
  status: 'active',
});

/** 空支部创建名校验（与 server POST /branches 同规则；缺省键 → 模板占位名，显式空/超长 → 拒绝） */
function _validateNewBranchName(name) {
  if (name === undefined || name === null) return { ok: true, value: EMPTY_BRANCH_TEMPLATE.name };
  const t = String(name).trim();
  if (!t) return { ok: false, reason: '支部名不能为空' };
  if (t.length > NEW_BRANCH_NAME_MAX) return { ok: false, reason: `支部名过长（不超过 ${NEW_BRANCH_NAME_MAX} 字）` };
  return { ok: true, value: t };
}

/** 新支部 id（br-<8hex>；浏览器/node 双端可用——不依赖 crypto.randomUUID） */
function _newBranchId() {
  const rand = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(16).slice(2, 10);
  return `br-${rand}`;
}

function _cloneOrNull(v) {
  return v === undefined || v === null ? null : JSON.parse(JSON.stringify(v));
}

/**
 * 纯构造：新支部记录（空模板初始化 / 以源支部为模板复制）。零副作用，mock 本地直写与
 * server POST /branches（内联同语义）双形态共用此口径——双形态一致性由
 * server/test/empty-template.test.mjs ⑤ 断言守护。
 * @param {Object} opts
 * @param {string} [opts.id] 缺省时自生成 br-*
 * @param {string} [opts.name] 支部名（缺省=模板占位名；显式空/超长 → throw {reason}）
 * @param {'empty'|'copy'} [opts.mode='empty'] 空模板初始化 / 复制现有
 * @param {Object|null} [opts.sourceBranch] mode='copy' 的源支部记录（缺省 → throw {reason}）
 * @param {string} [opts.by] 操作者 personId（留痕）
 * @param {string} [opts.type] 类别标签（仅 empty 模式透传；copy 取源 type）
 * @param {string} [opts.now] 时间（测试可注入）
 */
export function buildNewBranchRecord({ id, name, mode = 'empty', sourceBranch = null, by = null, type = '', now } = {}) {
  const isCopy = mode === 'copy';
  const nameRes = _validateNewBranchName(name);
  if (!nameRes.ok) throw Object.assign(new Error(nameRes.reason), { reason: nameRes.reason, code: 'BRANCH_NAME_INVALID' });
  if (isCopy && !sourceBranch) throw Object.assign(new Error('源支部不存在'), { reason: '源支部不存在', code: 'SOURCE_BRANCH_MISSING' });
  const finalName = nameRes.value;
  const at = now || new Date().toISOString();
  const srcCfg = isCopy ? (sourceBranch.config || {}) : null;
  // 复制语义（与「复制配置到支部」applyConfigCopy 面向既有支部不同——本动作=以源支部为模板建新支部）：
  // config 域 modules/blocks/workforce 深拷贝（源缺省 → null 默认全开/缺省分工）；
  // org 档案域复制 desc/themePreset；headerTitle 取新支部名（保持 name→headerTitle 同步不变式，
  // 与 renameBranch/updateBranchOrg 一致，避免创建即「页眉≠名」错位）；secretaryId 不带走（席位待任命）。
  const config = {
    headerTitle: isCopy ? finalName : '',
    accent: null,
    modules: isCopy ? _cloneOrNull(srcCfg.modules) : null,
    blocks: isCopy ? _cloneOrNull(srcCfg.blocks) : null,
    workforce: isCopy ? _cloneOrNull(srcCfg.workforce) : null,
    desc: isCopy ? (srcCfg.desc ?? '') : '',
    themePreset: isCopy ? (srcCfg.themePreset ?? null) : null,
    fileSpaceIsolated: isCopy ? (srcCfg.fileSpaceIsolated ?? true) : true,
    // 建支部留痕（与 config 各域写同一 configChangeHistory 数组，{by,at,what,from,to} 审计口径）
    configChangeHistory: [{
      by: by ?? null,
      at,
      what: 'branch-created',
      from: isCopy ? `branch:${sourceBranch.id}` : 'empty-template',
      to: null,
    }],
  };
  const record = {
    name: finalName,
    type: isCopy ? (sourceBranch.type || '') : String(type || '').trim(),
    config,
    secretaryId: null,
    status: 'active',
    createdAt: at,
  };
  record.id = id || _newBranchId();
  return record;
}

/**
 * 党委创建支部（立项⑤ 阶段A 双形态；支部管理「+ 新建支部」与向导「新建支部…」共用同一写口）：
 * @param {Object} opts
 * @param {'empty'|'copy'} [opts.mode='empty'] empty=空组织模板初始化；copy=复制现有支部配置为模板
 * @param {string} [opts.sourceId] mode='copy' 源支部 id（不存在 → {ok:false, reason:'源支部不存在'}）
 * @param {string} [opts.name] 支部名（缺省=占位名「新支部（待配置）」；显式空/超长 → {ok:false, reason}）
 * @param {string} [opts.type] 类别标签（empty 模式透传，兼容原支部管理表单）
 * @param {string} [opts.by] 操作者 personId（留痕 by）
 * @param {string} [opts.actorRole] 操作者角色（提供时校验须为 party-staff——UI/测试双保险；
 *   mock 模式本无角色门控，入参校验与 server POST /branches 门控同口径，防绕过）
 * @returns {Promise<{ok:boolean, branch?:Object, reason?:string}>}
 */
export async function createBranch({ mode = 'empty', sourceId, name, type, by, actorRole } = {}) {
  if (actorRole && actorRole !== 'party-staff') {
    return { ok: false, reason: '无权限：仅党委组织员/党务老师可创建支部' };
  }
  const m = mode === 'copy' ? 'copy' : 'empty';
  const nameRes = _validateNewBranchName(name);
  if (!nameRes.ok) return { ok: false, reason: nameRes.reason };
  const sourceBranch = m === 'copy' ? getBranchById(sourceId) : null;
  if (m === 'copy' && !sourceBranch) return { ok: false, reason: '源支部不存在' };
  try {
    let record;
    if (getDataSource() === 'api') {
      // API 模式：语义请求交服务端构造（server POST /branches 同源逻辑 + party-staff 门控净化），
      // 以服务端返回为权威（防两端漂移；mock 模式本地同口径构造见下）。
      const created = await getAdapter().branches.create({
        mode: m,
        ...(m === 'copy' ? { sourceId } : {}),
        name: nameRes.value,
        ...(m === 'empty' && type ? { type: String(type).trim() } : {}),
      });
      if (!created || created.ok === false) {
        return { ok: false, reason: (created && created.reason) || '服务端拒绝创建支部' };
      }
      record = created.branch || created;
    } else {
      // mock 模式：本地纯构造直写 mockDB + persist（语义对齐 mock-adapter branches.create 骨架，
      // 但保留完整 config——mock-adapter create 会按简版骨架重造 config，丢 org/blocks/workforce 细域）
      record = buildNewBranchRecord({ name: nameRes.value, mode: m, sourceBranch, type, by });
    }
    // 本地 mockDB 同步（API 模式 adapter 只 POST server；mock 模式已写入，防重复）
    if (!(mockDB.branches || []).some(b => b.id === record.id)) {
      mockDB.branches = [...mockDB.branches, record];
    }
    persist();
    return { ok: true, branch: record };
  } catch (err) {
    console.error('[branch] 创建支部失败', err);
    return { ok: false, reason: (err && (err.reason || err.message)) || '创建支部失败' };
  }
}

/** 党委改支部名（同步 config.headerTitle——header 软编码随之变化） */
export async function renameBranch(id, name) {
  const next = await getAdapter().branches.update(id, { name: String(name || '').trim() });
  const idx = (mockDB.branches || []).findIndex(b => b.id === id);
  if (idx >= 0) {
    mockDB.branches = [...mockDB.branches.slice(0, idx), next, ...mockDB.branches.slice(idx + 1)];
  }
  persist();
  return next;
}

// ── 换组织向导 · 支部组织档案写口（2026-09-06 书记 R3/R4：向导吸收合并 party-config）────────
// org = { name?, headerTitle?, desc?, themePreset? }（undefined=不改；净化唯一实现 = config-clean sanitizeConfigOrg）。
// 权限轨（沿用既有校验语义；2026-09-09 书记批副书同权——本支部现任书记/副书记均视同支部层配置权）：
//   · name（顶层治理字段）→ adapter.branches.update（server 端 = 通用 branches PATCH，仅 party-staff）；
//     mock 模式无门控、UI 层已按角色禁用（书记/副书记均不可改官方支部名）。
//   · headerTitle/desc/themePreset（config 域）→ adapter.updateConfig（server 端 = PATCH /branches/:id/config，
//     party-staff / 本支部现任书记或副书记（同支部）均可写；设置中心支部治理与向导即走此轨）。
// 留痕：与 modules/blocks/workforce 同一 config.configChangeHistory 数组（{by,at,what,from?,to?}）。
export async function updateBranchOrg(branchId, org = {}, opts = {}) {
  const cur = getBranchById(branchId);
  if (!cur) return null;
  const clean = sanitizeConfigOrg(org);
  const prev = cur.config || {};
  const by = (opts && opts.by) || _actorId() || null;
  const at = new Date().toISOString();
  const history = Array.isArray(prev.configChangeHistory) ? [...prev.configChangeHistory] : [];
  const topPatch = {};
  const cfgPatch = {};
  let dirty = false;

  if (clean.name !== undefined && clean.name !== cur.name) {
    topPatch.name = clean.name;
    cfgPatch.headerTitle = clean.name; // 顶层改名 → headerTitle 同步（与 renameBranch/mock-adapter 语义一致）
    history.push({ by, at, what: 'name', from: cur.name ?? null, to: clean.name });
    dirty = true;
  }
  if (clean.headerTitle !== undefined && !topPatch.name && clean.headerTitle !== (prev.headerTitle ?? '')) {
    cfgPatch.headerTitle = clean.headerTitle;
    history.push({ by, at, what: 'headerTitle', from: prev.headerTitle ?? null, to: clean.headerTitle });
    dirty = true;
  }
  if (clean.desc !== undefined && clean.desc !== (prev.desc ?? '')) {
    cfgPatch.desc = clean.desc;
    history.push({ by, at, what: 'desc', from: prev.desc ?? null, to: clean.desc });
    dirty = true;
  }
  if (clean.themePreset !== undefined && clean.themePreset !== (prev.themePreset ?? null)) {
    cfgPatch.themePreset = clean.themePreset;
    history.push({ by, at, what: 'themePreset', from: prev.themePreset ?? null, to: clean.themePreset });
    dirty = true;
  }
  if (!dirty) return cur; // 无实质变化：不写、不留痕

  const nextConfig = { ...prev, ...cfgPatch, configChangeHistory: history };
  // 含顶层 name → 通用 branches PATCH（party-staff）；仅 config 域 → PATCH /branches/:id/config（书记/党委均可）
  const next = Object.keys(topPatch).length
    ? await getAdapter().branches.update(branchId, { ...topPatch, config: nextConfig })
    : await getAdapter().branches.updateConfig(branchId, nextConfig);
  const idx = (mockDB.branches || []).findIndex(b => b.id === branchId);
  if (idx >= 0) {
    mockDB.branches = [...mockDB.branches.slice(0, idx), next, ...mockDB.branches.slice(idx + 1)];
  } else if (next) {
    mockDB.branches = [...mockDB.branches, next];
  }
  persist();
  return next;
}

/** 支部主题预设 id（null=默认红调；换组织向导步骤①/运行时写 CSS 变量用） */
export function getBranchThemePreset(branchId) {
  return getBranchById(branchId)?.config?.themePreset ?? null;
}

// ── 配置覆盖写（2026-09-06 立项④阶段二：JSON 配置包导入 / 复制配置到支部 共用落地）────────
// domains = { org?: { headerTitle?, desc?, themePreset? }, modules?, blocks?, workforce? }
//   域显式提供才处理；null = 该域恢复默认（与 updateBranchModules 等 null 语义一致）；缺省 = 不改。
//   逐域净化唯一实现 = core/config-clean.js（sanitizeConfigOrg/sanitizeConfigModules/
//   sanitizeConfigBlocks/sanitizeConfigWorkforce）——非法 id / 白名单外值丢弃，不写坏。
//   一次调用 = 一次 adapter 写 + 一条聚合留痕 { by, at, what, from, to: fields }
//   （批量/覆盖类操作一操作一痕可读；逐 key 明细可从 config 现读核对）。
/** 支部配置域覆盖写（内部落地：applyConfigCopy / org-config-package.applyConfigPackage 共用） */
export async function applyBranchConfig(branchId, domains = {}, opts = {}) {
  const cur = getBranchById(branchId);
  if (!cur) return { branchId, ok: false, reason: '目标支部不存在', changed: false, updatedFields: [] };
  const by = (opts && opts.by) || _actorId() || null;
  const at = new Date().toISOString();
  const prev = cur.config || {};
  const history = Array.isArray(prev.configChangeHistory) ? [...prev.configChangeHistory] : [];
  const patch = {};
  const fields = [];

  // org 域（headerTitle/desc/themePreset；desc 允许清空为 ''，其余空串丢弃——sanitizeConfigOrg 口径）
  if (domains && domains.org && typeof domains.org === 'object' && !Array.isArray(domains.org)) {
    const clean = sanitizeConfigOrg(domains.org);
    for (const key of ['headerTitle', 'desc', 'themePreset']) {
      if (clean[key] === undefined) continue;
      const old = key === 'desc' ? (prev.desc ?? '') : (prev[key] ?? null);
      const next = key === 'desc' ? (clean[key] ?? '') : (clean[key] ?? null);
      if (!_sameConfigVal(old, next)) { patch[key] = clean[key]; fields.push(key); }
    }
  }
  if (domains && Object.prototype.hasOwnProperty.call(domains, 'modules')) {
    const next = sanitizeConfigModules(domains.modules === undefined ? null : domains.modules);
    const old = prev.modules ?? null;
    if (!_sameConfigVal(old, next)) { patch.modules = next; fields.push('modules'); }
  }
  if (domains && Object.prototype.hasOwnProperty.call(domains, 'blocks')) {
    const next = sanitizeConfigBlocks(domains.blocks === undefined ? null : domains.blocks);
    const old = prev.blocks ?? null;
    if (!_sameConfigVal(old, next)) { patch.blocks = next; fields.push('blocks'); }
  }
  if (domains && Object.prototype.hasOwnProperty.call(domains, 'workforce')) {
    const next = sanitizeConfigWorkforce(domains.workforce === undefined ? null : domains.workforce);
    const old = prev.workforce ?? null;
    if (!_sameConfigVal(old, next)) { patch.workforce = next; fields.push('workforce'); }
  }
  if (!fields.length) return { branchId, ok: true, changed: false, updatedFields: [] }; // 与现状一致：不写不留痕

  const what = (opts && opts.what) || 'config-overwrite';
  const from = (opts && opts.from) || null;
  history.push({ by, at, what, from, to: [...fields] });
  const nextConfig = { ...prev, ...patch, configChangeHistory: history };
  const next = await getAdapter().branches.updateConfig(branchId, nextConfig);
  const idx = (mockDB.branches || []).findIndex(b => b.id === branchId);
  if (idx >= 0) {
    mockDB.branches = [...mockDB.branches.slice(0, idx), next, ...mockDB.branches.slice(idx + 1)];
  } else if (next) {
    mockDB.branches = [...mockDB.branches, next];
  }
  persist();
  return { branchId, ok: true, changed: true, updatedFields: fields };
}

/**
 * 复制配置到支部（2026-09-06 立项④阶段二：党委台向导工具条「复制配置到支部…」落地点）
 * 语义：把源支部 config 的 modules/blocks/workforce（保留既有结构）复制给每个目标；
 *   includeOrg=true 时连同 org 档案域（headerTitle/desc/themePreset）一并复制。
 *   源 config 缺省（undefined/null）即「默认全开/默认分工」→ 目标相应域恢复默认（与源一致）。
 * 留痕：逐 target 追加一条 { by, at, what:'config-copied', from:`branch:${sourceId}`, to: fields }。
 * 净化：复用 config-clean sanitize（主题预设白名单外回退——非法值丢弃、themePreset:null 清除回默认红调）。
 * 返回：Array<{ targetId, ok, fields: string[], reason? }>；非法/不存在返回 reason（不 throw）。
 */
export async function applyConfigCopy(sourceId, targetIds, opts = {}) {
  const by = (opts && opts.by) || _actorId() || null;
  const includeOrg = !(opts && opts.includeOrg === false);
  const ids = [...new Set((Array.isArray(targetIds) ? targetIds : []).map(String).filter(Boolean))];
  const source = getBranchById(sourceId);
  if (!source) {
    return ids.map(targetId => ({ targetId, ok: false, fields: [], reason: '源支部不存在' }));
  }
  const srcCfg = source.config || {};
  const results = [];
  for (const targetId of ids) {
    if (targetId === sourceId) {
      results.push({ targetId, ok: false, fields: [], reason: '目标与源为同一支部' });
      continue;
    }
    if (!getBranchById(targetId)) {
      results.push({ targetId, ok: false, fields: [], reason: '目标支部不存在' });
      continue;
    }
    const domains = {
      modules: srcCfg.modules === undefined ? null : srcCfg.modules,
      blocks: srcCfg.blocks === undefined ? null : srcCfg.blocks,
      workforce: srcCfg.workforce === undefined ? null : srcCfg.workforce,
    };
    if (includeOrg) {
      domains.org = {
        headerTitle: srcCfg.headerTitle || source.name || '',
        desc: srcCfg.desc ?? '',
        themePreset: srcCfg.themePreset ?? null,
      };
    }
    const res = await applyBranchConfig(targetId, domains, { by, what: 'config-copied', from: `branch:${sourceId}` });
    results.push({
      targetId,
      ok: res.ok && !res.reason,
      fields: res.updatedFields || [],
      ...(res.reason ? { reason: res.reason } : {}),
    });
  }
  return results;
}

/** 支部组织档案读取（name/headerTitle/desc/themePreset 收口，UI 勿逐键直连 config） */
export function getBranchOrg(branchId) {
  const b = getBranchById(branchId);
  return {
    id: b?.id || null,
    name: b?.name || '',
    type: b?.type || '',
    secretaryId: b?.secretaryId || null,
    headerTitle: b?.config?.headerTitle || b?.name || '',
    desc: b?.config?.desc || '',
    themePreset: b?.config?.themePreset ?? null,
  };
}

// ── 立项⑤ 阶段A · 空模板/空支部引用审计分层（2026-09-06）──────────────
// 空模板与「空模板初始化」产出的支部记录应满足：不含业务域键、不含演示成员 id（p1…）、
// 席位空缺（无 secretaryId 任命）。纯校验函数供测试/审计断言使用（mock-integrity 演示侧不动）。

/** 空支部记录不应携带的业务域键（全域单支部演示下新建支部不产生业务引用；含即异常） */
const EMPTY_BRANCH_FORBIDDEN_DOMAIN_KEYS = [
  'people', 'members', 'memberIds', 'activities', 'attendances', 'inspections',
  'agenda', 'agendaVotes', 'taskforces', 'notices', 'todos', 'assignments',
  'makeupTasks', 'thoughtReports', 'reviews', 'archiveRecords', 'signups',
];

/**
 * 引用审计（纯）：空模板/新建空支部记录不得引用演示业务数据。
 * @param {Object} branch 待审计支部记录（空模板常量或 createBranch 产物）
 * @returns {string|null} null=通过；否则返回问题描述
 */
export function auditEmptyBranchRecord(branch) {
  if (!branch || typeof branch !== 'object' || Array.isArray(branch)) return '记录非对象';
  const present = EMPTY_BRANCH_FORBIDDEN_DOMAIN_KEYS.filter(k => branch[k] !== undefined && branch[k] !== null && branch[k] !== '');
  if (present.length) return `含业务域键：${present.join('、')}`;
  // 不含演示成员 id（p1…）；留痕 by 允许党委组织员（p_pc 等非 p<数字>）审计人
  if (/\bp\d+\b/.test(JSON.stringify(branch))) return '含演示成员 id 引用（p1…）';
  if (branch.secretaryId) return '含 secretaryId（席位应空缺待任命）';
  return null;
}
