// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  services/org-config-package.js — 支部配置 JSON 覆盖件（立项④阶段二，2026-09-06 书记裁范围）
// ════════════════════════════════════════════════════════════════
// 定位：把支部「当前配置现状」导出为一份可下载/可再导入的 JSON 覆盖件（kind 'gsm1921-org-config'），
//  供开源用户跨实例搬运「换壳」配置；导入 = 本地预览应用（同浏览器会话内写回本支部）。
// 包结构（build 输出 / apply 输入同一形状）：
//   { kind, version:1, branchId, exportedAt, by?, org:{headerTitle,desc,themePreset},
//     config:{modules,blocks,workforce} }
//   org/config 各域保持 branch 服务既有存储结构；config.modules/blocks/workforce 为 null 即「默认」。
// 净化唯一实现 = core/config-clean.js（与 branch 服务 / server resources.js 同源，防漂移）：
//   apply 逐域 sanitize → 非法 id/白名单外预设值丢弃，不写坏目标。
// 落地写口 = services/branch.js applyBranchConfig（一次覆盖多域 + 一条聚合留痕
//   what:'config-package-import'、from 记录包来源）——浏览器 / Node 双端可载、可单测。
// ════════════════════════════════════════════════════════════════

import { getBranchById, getBranchOrg, applyBranchConfig } from './branch.js?v=20260908c';
import { sanitizeConfigOrg } from '../core/config-clean.js?v=20260908c';

/** 覆盖件类型标识（apply 校验门槛，防误导入异类 JSON） */
export const PACKAGE_KIND = 'gsm1921-org-config';
/** 覆盖件结构版本（当前 1；未来字段演进时 bump 并做迁移） */
export const PACKAGE_VERSION = 1;

/**
 * 导出支部配置覆盖件（纯函数：读 branch 服务/domain 现状，无 DOM/无写库）
 * @param {{ branchId: string, by?: string }} opts
 * @returns {Object} 覆盖件对象（JSON.stringify 后 Blob 下载，文件名 `<branchId>-org-config.json`）
 */
export function buildConfigPackage({ branchId, by } = {}) {
  const branch = getBranchById(branchId);
  if (!branch) throw new Error(`支部不存在：${branchId}`);
  const org = getBranchOrg(branchId);
  const cfg = branch.config || {};
  // config 三域「既有结构」原样导出；缺省（undefined/null）= 默认全开/默认分工 → 包内以 null 表达
  const modules = cfg.modules === undefined ? null : cfg.modules;
  const blocks = cfg.blocks === undefined ? null : cfg.blocks;
  const workforce = cfg.workforce === undefined ? null : cfg.workforce;
  return {
    kind: PACKAGE_KIND,
    version: PACKAGE_VERSION,
    branchId,
    exportedAt: new Date().toISOString(),
    by: by || null,
    org: {
      headerTitle: org.headerTitle || '',
      desc: org.desc || '',
      themePreset: org.themePreset ?? null,
    },
    config: { modules, blocks, workforce },
  };
}

/**
 * 应用支部配置覆盖件（导入：本地预览应用）
 * 流程：逐域 sanitize（config-clean 净化；非法值丢弃、缺字段不动）→ 走 branch 服务写口
 *   applyBranchConfig（含 configChangeHistory 留痕，what:'config-package-import'，from 记录包来源）→
 *   返回 { updatedFields, unchanged, ok }。
 * 安全：kind/version 不符抛错（前端捕获 toast）；目标支部不存在抛错；
 *   org/config 缺字段 = 对应域不动（不抛、不写坏）。
 * @param {Object} pkg 覆盖件（buildConfigPackage 输出形状）
 * @param {{ branchId?: string, by?: string }} [opts] branchId 缺省用包内 branchId
 */
export async function applyConfigPackage(pkg, { branchId, by } = {}) {
  if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) {
    throw new Error('配置包无效：不是 JSON 对象');
  }
  if (pkg.kind !== PACKAGE_KIND) {
    throw new Error(`配置包无效：kind=${String(pkg.kind)} 与 ${PACKAGE_KIND} 不符`);
  }
  if (pkg.version !== undefined && pkg.version !== PACKAGE_VERSION) {
    throw new Error(`配置包版本不支持：${String(pkg.version)}（当前 ${PACKAGE_VERSION}）`);
  }
  const targetId = branchId || pkg.branchId;
  if (!targetId) throw new Error('配置包缺少目标支部（branchId）');
  if (!getBranchById(targetId)) throw new Error(`目标支部不存在：${targetId}`);

  const domains = {};
  // org 域：sanitizeConfigOrg 只返回「提供了且净化后合法」的键（非法 themePreset / 空 headerTitle 自动丢弃）
  const orgClean = sanitizeConfigOrg(pkg.org);
  if (Object.keys(orgClean).length) domains.org = orgClean;
  // config 域：显式提供的键才处理（null=恢复默认；缺省=不改）
  if (pkg.config && typeof pkg.config === 'object' && !Array.isArray(pkg.config)) {
    if (Object.prototype.hasOwnProperty.call(pkg.config, 'modules')) domains.modules = pkg.config.modules;
    if (Object.prototype.hasOwnProperty.call(pkg.config, 'blocks')) domains.blocks = pkg.config.blocks;
    if (Object.prototype.hasOwnProperty.call(pkg.config, 'workforce')) domains.workforce = pkg.config.workforce;
  }
  if (!Object.keys(domains).length) {
    return { ok: true, unchanged: true, updatedFields: [] }; // 空覆盖件：无变更
  }
  const from = pkg.branchId ? `branch:${pkg.branchId}` : 'external';
  const res = await applyBranchConfig(targetId, domains, { by, what: 'config-package-import', from });
  return { ok: res.ok !== false, unchanged: !res.changed, updatedFields: res.updatedFields || [] };
}
