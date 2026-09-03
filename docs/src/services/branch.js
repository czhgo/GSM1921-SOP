// role: [工程师]+[AI]
// services/branch.js — 支部服务（P1 党委后台，2026-09-02）
// 支部边界收敛点（防漂移）：人→支部归属、支部配置档案读取（header 软编码/主题/启停模块）
// 单一数据源：mockDB.branches（首启 seed 自 mock/branches.js BRANCHES）

import { mockDB } from '../core/domain.js?v=20260903a';
import { getPersonById } from './person.js?v=20260903a';
import { PARTY_COMMITTEE } from '../mock/branches.js?v=20260903a';
import { getAdapter, persist } from '../core/data-adapter.js?v=20260903a';
import { listCapabilities } from '../core/registry.js?v=20260903a';

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

/** 核心 tab id 集合（供配置 UI 展示「固定」与隐藏校验） */
export function getCoreTabIds(tabs) {
  return _splitTabs(tabs).core.map(t => t.id);
}

/** 保存支部工作流模块配置（书记操作；防御核心 tab 不可隐藏——传入 tabs 元数据供校验；modules=null=恢复默认全开） */
export async function updateBranchModules(branchId, modules, tabs = []) {
  let payload;
  if (modules === null) {
    payload = null; // 恢复默认：config.modules = null（全开 + 注册顺序）
  } else {
    const coreIds = new Set(getCoreTabIds(tabs));
    const sanitize = (v) => [...new Set((v || []).map(String).filter(x => x && x.length <= 80))];
    const hiddenTabIds = sanitize(modules?.hiddenTabIds).filter(id => !coreIds.has(id)); // 核心不可隐藏
    const tabOrder = sanitize(modules?.tabOrder).filter(id => !coreIds.has(id));        // 核心不参与排序
    payload = { hiddenTabIds, tabOrder };
  }
  const next = await getAdapter().branches.updateConfig(branchId, payload);
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
