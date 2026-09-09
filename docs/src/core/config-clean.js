// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  config-clean.js — 支部 config（modules/blocks）净化唯一实现（P1a 单向权威，2026-09-03）
//  消费方（两端共用同一实现，防漂移）：
//    docs/src/services/branch.js（前端写路径：party-config 配置 UI / 书记操作）
//    server/routes/resources.js（PATCH /branches/:id/config）
//  语义采用 server 严格口径：id 只收非空字符串（不强制转串）、长度 ≤80、去重保序、限长截断。
//  本文件为纯 ESM（仅依赖 work-map / policy-defaults 两个纯数据模块），浏览器与 node 双端可加载。
// ════════════════════════════════════════════════════════════════
import { WORK_MAP_IDS } from './work-map.js?v=20260909e';
// 批4（2026-09-09 书记批「域参数」）：policyOverrides 白名单/复位/注入原语取自 policy-defaults
// （单源：覆盖白名单 POLICY_OVERRIDABLE 只定义于 policy-defaults，本文件为其唯一净化消费方）
import {
  POLICY_OVERRIDABLE,
  resetPolicyDefaults,
  applyPolicyOverrides,
} from './policy-defaults.js?v=20260909e';

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
 * 净化 config.workforce（L4 支部分工；null=恢复默认缺省分工）
 * 只保留 WORK_MAP_IDS 内的模块键；每项 { ownerType∈{role,person}, ownerId: 非空字符串 ≤80 }。
 * 语义校验（ownerId 是否真实角色/成员）由 service/UI 层负责，此处只做形状防脏注入。
 */
export function sanitizeConfigWorkforce(workforce) {
  if (workforce === null) return null;
  if (!workforce || typeof workforce !== 'object' || Array.isArray(workforce)) return {};
  const idSet = new Set(WORK_MAP_IDS);
  const out = {};
  for (const [moduleId, assign] of Object.entries(workforce)) {
    if (!idSet.has(moduleId)) continue;
    const ownerType = assign?.ownerType;
    const ownerId = assign?.ownerId;
    if ((ownerType === 'role' || ownerType === 'person') &&
        typeof ownerId === 'string' && ownerId && ownerId.length <= MAX_ID_LEN) {
      out[moduleId] = { ownerType, ownerId };
    }
  }
  return out;
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

// ── 换组织向导 · 支部组织档案字段（2026-09-06 书记 R4：可改即改 + 固定令牌不改）─────────
// config.headerTitle（页眉显示名）/ config.desc（支部自述）/ config.themePreset（主题预设 id）。
// 主题预设只提供「可调令牌」（角色识别层强调色 --app-accent 三件套）的 3-4 档；
// 党建红 party-red 与党徽金 party-gold 为固定合规底线，不提供更改——预设 id 白名单即此口径的代码面。
export const THEME_PRESET_IDS = ['red', 'green', 'sky', 'blue'];

const ORG_MAX = { name: 80, headerTitle: 120, desc: 500 };

/**
 * 净化支部组织档案写片（向导步骤①；单一实现 = 本文件，前端 branch.js / server resources.js 共用）
 * 仅返回「调用方提供了且净化后合法」的键：name/headerTitle/desc/themePreset。
 * 语义：
 *   - name/headerTitle：trim 非空、按上限截断；空串 → 不返回（不改，页眉名不允许清空）。
 *   - desc：trim 后按上限截断；空串 → ''（可清空自述）。
 *   - themePreset：白名单 THEME_PRESET_IDS 内 → 返回；null → null（清除预设回默认红调）；其它 → 忽略。
 * @param {Object|null} org 前端 UI 传入的写片
 */
export function sanitizeConfigOrg(org) {
  if (!org || typeof org !== 'object' || Array.isArray(org)) return {};
  const out = {};
  if (Object.prototype.hasOwnProperty.call(org, 'name')) {
    const t = String(org.name ?? '').trim();
    if (t) out.name = t.slice(0, ORG_MAX.name);
  }
  if (Object.prototype.hasOwnProperty.call(org, 'headerTitle')) {
    const t = String(org.headerTitle ?? '').trim();
    if (t) out.headerTitle = t.slice(0, ORG_MAX.headerTitle);
  }
  if (Object.prototype.hasOwnProperty.call(org, 'desc')) {
    out.desc = String(org.desc ?? '').trim().slice(0, ORG_MAX.desc);
  }
  if (Object.prototype.hasOwnProperty.call(org, 'themePreset')) {
    const v = org.themePreset;
    if (v === null) out.themePreset = null;
    else if (THEME_PRESET_IDS.includes(v)) out.themePreset = v;
  }
  return out;
}

// ── 批4 域参数 policyOverrides（2026-09-09 书记批：config 独立域；白名单=policy-defaults POLICY_OVERRIDABLE）──
// 语义：
//   · policyOverrides = { 节: { 叶: 值 } }——节/叶白名单单一源 = POLICY_OVERRIDABLE（path 行走），
//     institutional（制度裁决固定）键不在表内 → 写不进来。
//   · 值校验：int=整数且钳 [min,max]（防负数/超长天数）；boolean=严格布尔；windows=窗口数组
//     （每窗 [起月,起日,止月,止日]，月 1..12、日 1..31，至多保留前 2 窗、去重）。
//   · 非法值/未知键一律丢弃（不写坏）；null/undefined 入参 → null（= 无 overrides / 整体恢复默认）。
//   · 前端 branch.js savePolicyOverrides 与 server PATCH /branches/:id/config 共用本净化实现（防漂移）。

function _cleanPolicyValue(spec, raw) {
  if (spec.type === 'int') {
    if (!Number.isInteger(raw)) return undefined;
    return Math.min(Math.max(raw, spec.min), spec.max);
  }
  if (spec.type === 'boolean') return typeof raw === 'boolean' ? raw : undefined;
  if (spec.type === 'windows') {
    if (!Array.isArray(raw)) return undefined;
    const seen = new Set();
    const out = [];
    for (const w of raw) {
      if (!Array.isArray(w) || w.length !== 4 || out.length >= 2) continue;
      const [sm, sd, em, ed] = w;
      if (!(Number.isInteger(sm) && Number.isInteger(sd) && Number.isInteger(em) && Number.isInteger(ed))) continue;
      if (sm < 1 || sm > 12 || em < 1 || em > 12 || sd < 1 || sd > 31 || ed < 1 || ed > 31) continue;
      const key = `${sm}-${sd}-${em}-${ed}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push([sm, sd, em, ed]);
    }
    return out.length ? out : undefined;
  }
  return undefined;
}

/**
 * 净化 config.policyOverrides（键白名单 + 值类型校验 + 数值范围钳制唯一实现）。
 * @param {Object|null} policyOverrides
 * @returns {Object|null} null=无 overrides（删除语义）；对象=仅白名单合法键；空对象=全非法
 */
export function sanitizeConfigPolicyOverrides(policyOverrides) {
  if (policyOverrides === null || policyOverrides === undefined) return null;
  if (!policyOverrides || typeof policyOverrides !== 'object' || Array.isArray(policyOverrides)) return {};
  const out = {};
  for (const spec of POLICY_OVERRIDABLE) {
    const [s0, s1, s2] = spec.path;
    const holder = policyOverrides[s0];
    if (!holder || typeof holder !== 'object' || Array.isArray(holder)) continue;
    const raw = s2 === undefined
      ? holder[s1]
      : (holder[s1] && typeof holder[s1] === 'object' && !Array.isArray(holder[s1]) ? holder[s1][s2] : undefined);
    if (raw === undefined) continue;
    const v = _cleanPolicyValue(spec, raw);
    if (v === undefined) continue;
    if (!out[s0] || typeof out[s0] !== 'object') out[s0] = {};
    if (s2 === undefined) {
      out[s0][s1] = v;
    } else {
      if (!out[s0][s1] || typeof out[s0][s1] !== 'object') out[s0][s1] = {};
      out[s0][s1][s2] = v;
    }
  }
  return out;
}

/**
 * 读侧有效默认注入（批4）：先复位出厂默认，再按目标支部 config.policyOverrides（白名单净化后）
 * 就地覆盖进 POLICY_DEFAULTS —— 无 overrides = 保持默认（零 diff）；先复位再覆盖保证跨支部
 * 重复调用不残留上一支部值（幂等）。纯函数入参（branch 记录），可在 node 侧直接单测。
 * @param {Object|null} branch 支部记录（取 branch.config.policyOverrides）
 * @returns {boolean} 是否实际应用了覆盖
 */
export function applyBranchPolicyOverrides(branch) {
  resetPolicyDefaults();
  if (!branch || !branch.config) return false;
  const clean = sanitizeConfigPolicyOverrides(branch.config.policyOverrides);
  if (clean && Object.keys(clean).length) {
    applyPolicyOverrides(clean);
    return true;
  }
  return false;
}
