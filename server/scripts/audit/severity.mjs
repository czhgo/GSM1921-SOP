// role: [工程师]+[AI]
// audit/severity.mjs — 页签审计严重度判定表（单一源）
// 口径见 `.trae/documents/2026-11-02-tab-audit-asset.md` §3.4：
//   P0 页签打不开 / pageerror / 必然失败的动作 / 数据对不上
//   P1 违反已立规范（块数、筛选条、输入装饰、标题层级、section 命名、重复卡头、多筛选条…）
//   P2 性能超预算、空态启发式、文案 / 间距 / 可读性建议
// ⚠ 本文件只放**判定表**；新增检查项须同批登记（未登记默认 P2，只进报告）。

export const SEVERITY = { P0: 'P0', P1: 'P1', P2: 'P2' };

/** 规则 → 严重度。键与 checks-front.mjs / checks-*.mjs 的 `rule` 字段一致；未登记默认 P2。 */
const RULE_SEVERITY = {
  // 页签自身（编排层）
  F0: SEVERITY.P0,
  // F 前端（计划 §3.3）
  F1: SEVERITY.P1,
  F2: SEVERITY.P1,
  F3: SEVERITY.P1,
  F4: SEVERITY.P1,
  F5: SEVERITY.P1,
  F6: SEVERITY.P2,
  F7: SEVERITY.P1,
  // F8 默认 P0（pageerror / 4xx）；checks-front 对「仅 console.error」按 P1 覆盖（2026-11-02 分级）
  F8: SEVERITY.P0,
  // D 数据（并行 agent：checks-data.mjs）
  D0: SEVERITY.P0,
  D1: SEVERITY.P1,
  D2: SEVERITY.P0,
  D3: SEVERITY.P1,
  D4: SEVERITY.P2,
  // C CRUD（并行 agent：checks-crud.mjs）
  C0: SEVERITY.P0,
  C1: SEVERITY.P1,
  C2: SEVERITY.P0,
  C3: SEVERITY.P0,
  C4: SEVERITY.P1,
  // E 运算（并行 agent：checks-economy.mjs）
  E0: SEVERITY.P2,
  E1: SEVERITY.P2,
  E2: SEVERITY.P2,
  // M 信息经济（并行 agent：checks-economy.mjs）
  M0: SEVERITY.P2,
  // M1 默认 P1：>4 块且未登记理由；已登记理由时 checks-economy 以 exception 覆盖（不计违规）
  M1: SEVERITY.P1,
  M2: SEVERITY.P1,
  M3: SEVERITY.P1,
};

/**
 * 规则严重度。支持 `F1` / `F1.blocks` 两种写法（带点号时取首段）。
 * @param {string} rule
 * @returns {'P0'|'P1'|'P2'}
 */
export function severityOf(rule) {
  const head = String(rule || '').split('.')[0];
  return RULE_SEVERITY[head] || SEVERITY.P2;
}
