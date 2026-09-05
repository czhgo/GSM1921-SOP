// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  module-compose.js — 模块组合声明契约 v0（P3d，2026-09-05）
// ════════════════════════════════════════════════════════════════
// 纯 ESM、零依赖，浏览器 / Node 双端可加载（不 import 任何其它模块）。
// 职责：组合清单（能力/工作流块）可选元数据 depends / conflictsWith 的纯校验：
//   - depends：本模块依赖的其他模块 id —— 引用必须 ∈ 组合 id 集合；不允许成环（DFS）
//   - conflictsWith：与本模块互斥的模块 id —— 同一组合不得同含互斥双方；引用必须存在
// 收集式（不抛错）返回三类问题：missingRefs（引用缺失）/ mutual（互斥同含）/ cycles（depends 成环）。
// 契约权威源：content/04_web_design/evolution/WORKFLOW_BLOCK_CONTRACT.md「组合声明（P3d v0）」
// v0 边界：前端纯校验（模块加载自检 + 单测）；不进 server 端 config/路由校验（服务端组合校验后续版本接入）。
// 语义：台内 tab 为固定组合（见 core/registry.js 顶部注释）；模块/块级组合声明由本文件校验。

/**
 * 收集式组合体检（不抛错，一次返回全部问题）
 * @param {Array<{id: string, depends?: string[], conflictsWith?: string[]}>} items - 组合清单
 * @returns {{missingRefs: string[], mutual: Array<[string,string]>, cycles: string[][]}}
 *   missingRefs：depends/conflictsWith 引用了组合 id 集合之外的 id，形如 'a -> x'（a 引用缺失的 x）
 *   mutual：conflictsWith 双方同现于本组合的互斥对，按 id 排序规范化并去重，如 [['a','b']]
 *   cycles：depends 闭环路径（首尾同 id），DFS 检出、最小轮转规范化去重，如 [['a','b','a']]
 */
export function resolveConflicts(items) {
  const result = { missingRefs: [], mutual: [], cycles: [] };
  if (!Array.isArray(items)) return result;

  const list = items.filter((it) => it && typeof it.id === 'string' && it.id.length > 0);
  const ids = new Set(list.map((it) => it.id));

  // ── ① 引用存在性：depends / conflictsWith 的每个引用都必须 ∈ id 集合 ──
  for (const it of list) {
    const deps = Array.isArray(it.depends) ? it.depends : [];
    const confl = Array.isArray(it.conflictsWith) ? it.conflictsWith : [];
    for (const ref of [...deps, ...confl]) {
      if (typeof ref !== 'string' || ref.length === 0 || !ids.has(ref)) {
        result.missingRefs.push(`${it.id} -> ${ref}`);
      }
    }
  }

  // ── ② 互斥同含：conflictsWith 双方不得同含于本组合（同现于 items）──
  const mutualSeen = new Set();
  for (const it of list) {
    const confl = Array.isArray(it.conflictsWith) ? it.conflictsWith : [];
    for (const y of confl) {
      if (!ids.has(y)) continue; // 缺失引用已在 ① 记账
      const pair = [it.id, y].sort();
      const key = pair.join('\u0000');
      if (!mutualSeen.has(key)) {
        mutualSeen.add(key);
        result.mutual.push([pair[0], pair[1]]);
      }
    }
  }

  // ── ③ depends 禁环：DFS 三色标记（0 未访问 / 1 灰在栈 / 2 黑收尾），收集全部环路径 ──
  const adj = new Map();
  for (const it of list) {
    const deps = Array.isArray(it.depends) ? it.depends : [];
    adj.set(it.id, deps.filter((d) => ids.has(d)));
  }
  const color = new Map();
  const stack = [];
  const cycleSeen = new Set();

  const dfs = (nodeId) => {
    color.set(nodeId, 1);
    stack.push(nodeId);
    for (const next of adj.get(nodeId) || []) {
      const c = color.get(next) || 0;
      if (c === 0) {
        dfs(next);
      } else if (c === 1) {
        // 回边：栈上 next..当前节点 构成一个环
        const from = stack.indexOf(next);
        const canon = canonCycle([...stack.slice(from), next]);
        const key = canon.join('->');
        if (!cycleSeen.has(key)) {
          cycleSeen.add(key);
          result.cycles.push(canon);
        }
      }
      // c === 2：跨子树已完成边，非环
    }
    stack.pop();
    color.set(nodeId, 2);
  };

  for (const id of list.map((it) => it.id)) {
    if ((color.get(id) || 0) === 0) dfs(id);
  }

  return result;
}

/** 环路径规范化：取去掉尾部后的最小轮转为基准，再闭合成 首…尾 同 id 的环 */
function canonCycle(cyclePath) {
  const body = cyclePath.slice(0, -1);
  let best = body;
  for (let r = 1; r < body.length; r++) {
    const rot = body.slice(r).concat(body.slice(0, r));
    if (rot.join('\u0000') < best.join('\u0000')) best = rot;
  }
  return [...best, best[0]];
}

/**
 * 组合声明守卫：任一问题（引用缺失 / 互斥同含 / depends 成环）即抛错；全部干净返回 true。
 * 错误信息含：缺失引用（引用方 -> 缺失 id）、互斥双方 id、环路径。
 * @param {Array<{id: string, depends?: string[], conflictsWith?: string[]}>} items
 * @returns {true}
 * @throws {Error} 组合声明不合规（带问题明细）
 */
export function assertComposeValid(items) {
  const { missingRefs, mutual, cycles } = resolveConflicts(items);
  const details = [];
  if (missingRefs.length > 0) details.push(`引用缺失：${missingRefs.join('；')}`);
  if (mutual.length > 0) details.push(`互斥同含：${mutual.map(([a, b]) => `${a} × ${b}`).join('；')}`);
  if (cycles.length > 0) details.push(`depends 成环：${cycles.map((c) => c.join(' → ')).join('；')}`);
  if (details.length > 0) throw new Error(`模块组合声明不合规（${details.join('；')}）`);
  return true;
}
