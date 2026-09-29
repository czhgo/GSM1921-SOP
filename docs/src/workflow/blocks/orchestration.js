// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  workflow/blocks/orchestration.js — **工作流块编排内核**（G3-3 / §四 P10 · 2026-09-28 批次 239）
// ════════════════════════════════════════════════════════════════
// **地位**：L4「拖拽编排」此前只有**远期愿景**（`ARCHITECTURE_EVOLUTION §8.2` 把 L4 记为「远期愿景」），
//   落地却卡在一个具体缺口上：**「把若干块排成一段编排」这件事没有可复用的内核**——组合校验、依赖闭包、
//   稳定排序、编译成既有模板形状，全是画布将来才要现写的逻辑。本文件把这层抽成**纯函数内核**，
//   使 L4 的「可编排性」不再依赖那套还没做的画布 UI（画布＝内核之上的编辑器形态）。
//
// **三条不变式**（承 `ARCHITECTURE_EVOLUTION §8.5`「不做第二套引擎」与 `WORKFLOW_BLOCK_CONTRACT` v1.1）：
//   ① **只用契约已有字段**：`blockId` / `depends` / `conflictsWith` / `stages` / `outputs` / `events` / `scope`；
//   ② **校验复用单一源**：块级 = `manifests.js::validateBlockManifest`；组合级 = `core/base/module-compose.js::resolveConflicts`
//      ⇒ 本文件**不重写任何一条校验**（改写即两套判据、必然失同步）；
//   ③ **产物是数据不是代码**：`compilePlan` 只产出**既有 definition 形状**的数据（含 `sopScenarioId` 供既有
//      `WorkflowEngine` 消费），**不含函数、不执行写入**；某块若没有既有模板，如实记为 `warning`（不是错误）。
//
// 纯 ESM、零依赖（浏览器 / Node 双端可加载）；守卫 = `server/test/block-orchestration.test.mjs::O1–O5`。

import { BLOCK_MANIFESTS, validateBlockManifest } from './manifests.js?v=20260930b';
import { resolveConflicts } from '../../core/base/module-compose.js?v=20260930b';

/**
 * 按作用域取可编排的块（L4 原则：**可拖范围仍受角色 / 作用域约束**，界面上不是所有块都能拖）。
 * @param {string} scopeId 作用域标识（如 `workspace:secretary`）
 * @param {Array<Object>} manifests 块清单（缺省＝全量）
 * @returns {Array<Object>} 该作用域内的块（保持清单原序）
 */
export function blocksForScope(scopeId, manifests = BLOCK_MANIFESTS) {
  return (Array.isArray(manifests) ? manifests : []).filter(
    (m) => Array.isArray(m?.scope) && m.scope.includes(scopeId)
  );
}

/**
 * 编排一段块序列：**校验（复用单一源）→ 稳定拓扑排序 → 归并产出与事件**。
 * 「稳定」的含义：`depends` 必须排在依赖方之前；**其余保持调用方给出的顺序**（画布上的相对次序不被打乱）。
 * 错误**累积返回、不抛**（与 `validateBlockManifest` 同风格，便于界面上一次列全）。
 * @param {string[]} blockIds 编排里的块 id 序列（画布拖入顺序）
 * @param {Array<Object>} manifests 块清单（缺省＝全量）
 * @returns {{ok:boolean, errors:string[], plan:Object|null}}
 */
export function composePlan(blockIds, manifests = BLOCK_MANIFESTS) {
  const errors = [];
  const all = Array.isArray(manifests) ? manifests : [];
  const byId = new Map(all.map((m) => [m.blockId, m]));

  const ids = Array.isArray(blockIds) ? blockIds.map((x) => String(x)) : [];
  if (ids.length === 0) errors.push('编排为空：至少要有 1 个块');
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length) errors.push(`同一块不得重复拖入：${[...new Set(dup)].join('、')}`);

  const picked = [];
  for (const id of ids) {
    const m = byId.get(id);
    if (!m) { errors.push(`未知块 id：${id}（不在块清单内）`); continue; }
    picked.push(m);
  }
  if (errors.length) return { ok: false, errors, plan: null };

  // ① 块级契约（单一源）
  for (const m of picked) {
    const res = validateBlockManifest(m);
    if (!res.ok) errors.push(`块 ${m.blockId} 契约不合规：${res.errors.join('；')}`);
  }
  // ② 组合级体检（单一源；**这就是「depends 闭包必须在同一编排内」与「互斥不得同含」的判据**）
  const { missingRefs, mutual, cycles } = resolveConflicts(picked);
  if (missingRefs.length) {
    errors.push(`依赖闭包不完整（引用了本次编排之外的块）：${missingRefs.join('；')}`
      + `——处置：把被依赖的块一并拖入，或去掉该依赖`);
  }
  if (mutual.length) errors.push(`互斥块同含：${mutual.map(([a, b]) => `${a} × ${b}`).join('；')}`);
  if (cycles.length) errors.push(`depends 成环：${cycles.map((c) => c.join(' → ')).join('；')}`);
  if (errors.length) return { ok: false, errors, plan: null };

  // ③ 稳定拓扑排序（只把「被依赖者」前移；同层保持调用方顺序）
  const order = [];
  const seen = new Set();
  const visit = (id, stack) => {
    if (seen.has(id)) return;
    if (stack.has(id)) return; // 环已在上一步报出，这里防御性返回
    stack.add(id);
    const m = byId.get(id);
    for (const dep of Array.isArray(m?.depends) ? m.depends : []) visit(dep, stack);
    stack.delete(id);
    if (!seen.has(id)) { seen.add(id); order.push(id); }
  };
  for (const id of ids) visit(id, new Set());

  const merged = {
    blockIds: order,
    blocks: order.map((id) => byId.get(id)),
    entities: [...new Set(order.flatMap((id) => byId.get(id)?.outputs?.entities || []))],
    outputBlocks: [...new Set(order.flatMap((id) => byId.get(id)?.outputs?.outputBlocks || []))],
    emits: [...new Set(order.flatMap((id) => byId.get(id)?.events?.emits || []))],
    listens: [...new Set(order.flatMap((id) => byId.get(id)?.events?.listens || []))],
    initiatorRoles: [...new Set(order.flatMap((id) => byId.get(id)?.validation?.initiatorRoles || []))],
    stages: order.flatMap((id) => (byId.get(id)?.stages || []).map((s) => ({ blockId: id, ...s }))),
  };
  return { ok: true, errors: [], plan: merged };
}

/**
 * 把编排产物**编译为既有 definition 形状的数据**（不做第二套引擎、不执行任何写入）。
 * @param {Object} plan `composePlan` 的 `plan`
 * @param {{definitionsById?: Object}} [opts] 既有模板表（键＝块 id；缺省＝空 ⇒ 全部记为 warning）
 * @returns {{ok:boolean, errors:string[], warnings:string[], definitionPlan:Object|null}}
 *   `definitionPlan` 是**纯数据**：`{ blockIds, templateIds, sopScenarioIds, stages, entities, outputBlocks, emits }`
 */
export function compilePlan(plan, { definitionsById = {} } = {}) {
  const errors = [];
  const warnings = [];
  if (!plan || !Array.isArray(plan.blockIds) || plan.blockIds.length === 0) {
    return { ok: false, errors: ['plan 为空或形状不对（应由 composePlan 产出）'], warnings, definitionPlan: null };
  }
  const table = definitionsById && typeof definitionsById === 'object' ? definitionsById : {};
  const templateIds = [];
  const sopScenarioIds = [];
  for (const id of plan.blockIds) {
    const def = table[id];
    if (!def || typeof def.id !== 'string') {
      templateIds.push(null);
      sopScenarioIds.push(null);
      warnings.push(`块 ${id} 无既有 definition 模板 ⇒ 只作声明，无可编译模板（不是错误）`);
      continue;
    }
    templateIds.push(def.id);
    sopScenarioIds.push(def.sopScenarioId || null);
  }
  const definitionPlan = {
    blockIds: [...plan.blockIds],
    templateIds,
    sopScenarioIds,
    stages: plan.stages.map((s) => ({ blockId: s.blockId, id: s.id, kind: s.kind, outputs: [...(s.outputs || [])] })),
    entities: [...plan.entities],
    outputBlocks: [...plan.outputBlocks],
    emits: [...plan.emits],
  };
  // 不变式③ 自证：产物必须是**纯数据**（不含函数）——防「编排产物悄悄变成可执行体」
  const hasFn = (v, path = '') => {
    if (typeof v === 'function') return path || '(root)';
    if (Array.isArray(v)) return v.map((x, i) => hasFn(x, `${path}[${i}]`)).find(Boolean) || '';
    if (v && typeof v === 'object') {
      return Object.entries(v).map(([k, x]) => hasFn(x, path ? `${path}.${k}` : k)).find(Boolean) || '';
    }
    return '';
  };
  const where = hasFn(definitionPlan);
  if (where) errors.push(`编排产物含函数（${where}）——产物必须只是数据，执行归既有引擎`);

  return { ok: errors.length === 0, errors, warnings, definitionPlan: errors.length ? null : definitionPlan };
}

/** 块清单规模（供守卫做非空转断言；避免守卫各自 import manifests 再手数） */
export function blockCount(manifests = BLOCK_MANIFESTS) {
  return (Array.isArray(manifests) ? manifests : []).length;
}
