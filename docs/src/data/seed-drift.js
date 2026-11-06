// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  docs/src/data/seed-drift.js — 种子行漂移检测与安全修复（B-499-8 Task 4）
// ════════════════════════════════════════════════════════════════
// 本文件是**纯函数模块**：无 IO、无 localStorage / SQLite / 网络依赖，浏览器与 Node 共用。
//
// 安全模式（支书口径：绝不自动删业务记录）：
//   · 只把 `seedOwnedFields` 当作种子负责的比较面；`runtimeFields` 与未登记字段一律保留；
//   · 只更新**既有 seed id 行**——不插入缺失种子，不删除 orphan（种子已下线但行还在）；
//   · 用户自建行（id 不匹配 `entry.idPattern`）完全不参与。
//
// 三分类：
//   · stale   ：既有 seed id 行与当前种子行在 seedOwnedFields 上不一致（含字段缺失/多出）；
//   · orphan  ：id 形态像种子、但当前种子集中已没有该行；
//   · missing ：种子集中有、库/缓存里没有（只报告，不补）。
// ════════════════════════════════════════════════════════════════

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

/** 值比较口径：对象键序不敏感（日期/数组/嵌套对象均按 JSON 结构比较） */
function sameValue(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (typeof a !== 'object') return false;
  return stableStringify(a) === stableStringify(b);
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function requireEntry(entry) {
  if (!entry || typeof entry !== 'object') throw new Error('seed-drift：缺少 manifest entry');
  if (typeof entry.idPattern !== 'string' || !entry.idPattern) throw new Error('seed-drift：entry.idPattern 非法');
  if (!Array.isArray(entry.seedOwnedFields) || entry.seedOwnedFields.length === 0) {
    throw new Error('seed-drift：entry.seedOwnedFields 不得为空');
  }
  return new RegExp(entry.idPattern);
}

/** 单行在 seedOwnedFields 上的差异（空数组＝一致） */
export function diffSeedOwnedFields(row, seedRow, entry) {
  const fields = [];
  for (const field of entry.seedOwnedFields) {
    const inSeed = hasOwn(seedRow, field);
    const inRow = hasOwn(row, field);
    if (inSeed !== inRow) {
      fields.push({ field, expected: inSeed ? seedRow[field] : undefined, actual: inRow ? row[field] : undefined });
      continue;
    }
    if (inSeed && !sameValue(row[field], seedRow[field])) {
      fields.push({ field, expected: seedRow[field], actual: row[field] });
    }
  }
  return fields;
}

/**
 * 检测漂移（不修改输入）。
 * @param {{rows:Array<Object>, seedRows:Array<Object>, entry:Object}} input
 * @returns {{stale:Array<{id:string,fields:Array}>, orphan:string[], missing:string[], counts:{stale:number,orphan:number,missing:number}}}
 */
export function detectSeedDrift({ rows = [], seedRows = [], entry } = {}) {
  const pattern = requireEntry(entry);
  const seedById = new Map(seedRows.filter(Boolean).map((row) => [String(row.id), row]));
  const rowById = new Map(rows.filter(Boolean).map((row) => [String(row.id), row]));
  const stale = [];
  const orphan = [];

  for (const row of rows) {
    if (!row || !pattern.test(String(row.id))) continue;
    const seedRow = seedById.get(String(row.id));
    if (!seedRow) {
      orphan.push(String(row.id));
      continue;
    }
    const fields = diffSeedOwnedFields(row, seedRow, entry);
    if (fields.length) stale.push({ id: String(row.id), fields });
  }

  const missing = [...seedById.keys()].filter((id) => !rowById.has(id));
  return {
    stale,
    orphan,
    missing,
    counts: { stale: stale.length, orphan: orphan.length, missing: missing.length },
  };
}

/**
 * 生成安全修复结果：只更新既有 seed id 的 seedOwnedFields。
 * · 种子行有、行没有的 seedOwned 字段 ⇒ 补上；
 * · 行有、种子行没有的 seedOwned 字段 ⇒ 移除（该字段归种子管）；
 * · 其余字段（runtimeFields / 未登记字段 / 用户自建行 / orphan）原样保留；
 * · 不插入缺失种子，不删除任何行。
 * @returns {{rows:Array<Object>, updated:number, unchanged:number, updates:Array<{id:string,data:Object,fields:string[]}>, orphan:string[], missing:string[]}}
 */
export function planSeedRepair({ rows = [], seedRows = [], entry } = {}) {
  const pattern = requireEntry(entry);
  const seedById = new Map(seedRows.filter(Boolean).map((row) => [String(row.id), row]));
  const out = [];
  const updates = [];
  let unchanged = 0;
  const orphan = [];
  const presentSeedIds = new Set();

  for (const row of rows) {
    if (!row || !pattern.test(String(row.id))) {
      out.push(row);
      continue;
    }
    const seedRow = seedById.get(String(row.id));
    if (!seedRow) {
      orphan.push(String(row.id));
      out.push(row);
      continue;
    }
    presentSeedIds.add(String(row.id));
    const next = { ...row };
    const changedFields = [];
    for (const field of entry.seedOwnedFields) {
      if (hasOwn(seedRow, field)) {
        if (!hasOwn(next, field) || !sameValue(next[field], seedRow[field])) {
          next[field] = seedRow[field];
          changedFields.push(field);
        }
      } else if (hasOwn(next, field)) {
        delete next[field];
        changedFields.push(field);
      }
    }
    out.push(next);
    if (changedFields.length) updates.push({ id: String(row.id), data: next, fields: changedFields });
    else unchanged += 1;
  }

  const missing = [...seedById.keys()].filter((id) => !presentSeedIds.has(id));
  return { rows: out, updated: updates.length, unchanged, updates, orphan, missing };
}
