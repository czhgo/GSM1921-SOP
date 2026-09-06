// role: [工程师]+[AI]
// services/branch.js — 支部服务（P1 党委后台，2026-09-02）
// 支部边界收敛点（防漂移）：人→支部归属、支部配置档案读取（header 软编码/主题/启停模块）
// 单一数据源：mockDB.branches（首启 seed 自 mock/branches.js BRANCHES）

import { mockDB } from '../core/domain.js?v=20260903c';
import { getPersonById } from './person.js?v=20260903c';
import { PARTY_COMMITTEE } from '../mock/branches.js?v=20260903c';
import { getAdapter, persist } from '../core/data-adapter.js?v=20260903c';
import { listCapabilities } from '../core/registry.js?v=20260903c';
// P1a 单向权威（2026-09-03）：config 净化唯一实现 = core/config-clean.js（server PATCH /branches/:id/config 同源）
import { sanitizeConfigBlocks, sanitizeConfigModules, sanitizeConfigWorkforce, sanitizeConfigOrg } from '../core/config-clean.js?v=20260903c';
// L4（2026-09-03）：支部工作地图模块目录单一源 = core/work-map.js（11 模块/缺省分工/快照展开）
import { expandWorkforce } from '../core/work-map.js?v=20260903c';

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

/** 保存支部产出块配置（书记操作；blocks=null=恢复默认） */
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
 * 保存支部工作流配置（书记操作）：
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

/** 保存支部分工（书记操作/议题通过后落库；workforce=null 恢复缺省分工） */
export async function updateBranchWorkforce(branchId, workforce) {
  const payload = workforce === null
    ? { workforce: null }
    : { workforce: sanitizeConfigWorkforce(workforce) };
  return _saveBranchConfig(branchId, payload);
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
/** 党委创建支部（支部不预设名字——名称/类型由党委录入） */
export async function createBranch({ name, type }) {
  const branch = await getAdapter().branches.create({ name: String(name || '').trim(), type: String(type || '').trim() });
  // API 模式 adapter.create 只 POST server——本地 mockDB 同步（mock 模式已改本地，防重复）
  if (!(mockDB.branches || []).some(b => b.id === branch.id)) {
    mockDB.branches = [...mockDB.branches, branch];
  }
  persist();
  return branch;
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
// 权限轨（沿用既有校验语义）：
//   · name（顶层治理字段）→ adapter.branches.update（server 端 = 通用 branches PATCH，仅 party-staff）；
//     mock 模式无门控、UI 层已按角色禁用（现任书记不可改官方支部名）。
//   · headerTitle/desc/themePreset（config 域）→ adapter.updateConfig（server 端 = PATCH /branches/:id/config，
//     party-staff / 本支部现任书记均可写；换组织向导的书记独立 URL 即走此轨）。
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
