// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  config-clean.js — 支部 config（modules/blocks）净化唯一实现（P1a 单向权威，2026-09-03）
//  消费方（两端共用同一实现，防漂移）：
//    docs/src/services/branch.js（前端写路径：party-config 配置 UI / 书记操作）
//    server/routes/resources.js（PATCH /branches/:id/config）
//  语义采用 server 严格口径：id 只收非空字符串（不强制转串）、长度 ≤80、去重保序、限长截断。
//  本文件为纯 ESM、零依赖（不 import 任何 ?v= 模块），浏览器与 node 双端可加载。
// ════════════════════════════════════════════════════════════════

const MAX_ID_LEN = 80;
const MODULES_LIMIT = 200;
const BLOCKS_LIMIT = 50;

/** 净化 id 数组：只收非空字符串、去重保序、长度 ≤80、最多保留 limit 项 */
export function cleanIdList(v, limit) {
  if (!Array.isArray(v)) return [];
  return [...new Set(v)].filter((x) => typeof x === 'string' && x && x.length <= MAX_ID_LEN).slice(0, limit);
}

/**
 * 净化 config.modules（{ hiddenTabIds, tabOrder }；均按 MODULES_LIMIT 截断）
 * @param {Object|null} modules
 * @param {{ coreIds?: Set<string> }} [opts] coreIds 非空时排除核心 tab（前端用；server 无能力清单，传空）
 */
export function sanitizeConfigModules(modules, { coreIds = new Set() } = {}) {
  if (modules === null) return null;
  return {
    hiddenTabIds: cleanIdList(modules?.hiddenTabIds, MODULES_LIMIT).filter((id) => !coreIds.has(id)),
    tabOrder: cleanIdList(modules?.tabOrder, MODULES_LIMIT).filter((id) => !coreIds.has(id)),
  };
}

/**
 * 净化 config.blocks（{ outputBlocks?, workflowBlocks? }；null=恢复默认）
 * 只保留调用方提供的子段；每子段 id 按 BLOCKS_LIMIT 截断。
 */
export function sanitizeConfigBlocks(blocks) {
  if (blocks === null) return null;
  const out = {};
  if (blocks.outputBlocks) {
    out.outputBlocks = {
      hiddenBlockIds: cleanIdList(blocks.outputBlocks.hiddenBlockIds, BLOCKS_LIMIT),
      blockOrder: cleanIdList(blocks.outputBlocks.blockOrder, BLOCKS_LIMIT),
    };
  }
  if (blocks.workflowBlocks) {
    out.workflowBlocks = { hiddenBlockIds: cleanIdList(blocks.workflowBlocks.hiddenBlockIds, BLOCKS_LIMIT) };
  }
  return out;
}
