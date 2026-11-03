// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/data-contract.test.mjs —— 领域契约机检（2026-11-02 批次 527 · Wave 2）
// ════════════════════════════════════════════════════════════════
// 契约单一源 = `server/data/domain-contract.mjs`（表清单再取自 `server/db.js`）。
// 判据（对应计划 §三 Wave 2「data-contract.test.mjs」四条）：
//   ① 每个资源表在契约中有条目（34 资源 + 7 语义 + 6 工作组 = 47，无缺无幽灵）；
//   ② 每个 `required` 字段在 seed/mock 至少一处出现（本文件取 `seedDatabase` 后的真实落库行）；
//   ③ 枚举只来自契约（落库行的枚举取值必须 ∈ 契约 `enums`，且枚举声明本身非空 / 无重复）；
//   ④ 反例：删字段 / 改枚举 / 多字段必须判红（`validateEntityRows` 自检，防恒真）。
// 非空转：必填检查次数与枚举检查次数均有下限；反例使用同一校验器。
// 运行：`cd server; node --test test/data-contract.test.mjs`（纯 node，秒级）。
// ════════════════════════════════════════════════════════════════
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
import {
  RESOURCE_TABLES, SEMANTIC_TABLES, WORKGROUP_TABLES,
  DOMAIN_CONTRACT, ENTITY_BY_TABLE, ENTITY_BY_NAME,
  aliasMemberChangeRow, validateEntityRows,
} from '../data/domain-contract.mjs';

let app;
let db;
const rowsOf = (table) => db.prepare(`SELECT data FROM ${table}`).all().map((row) => JSON.parse(row.data));

before(async () => {
  app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  db = app.locals.db;
});

after(async () => {
  await new Promise((resolve) => app.close ? app.close(resolve) : resolve());
});

const ALL_TABLES = [...RESOURCE_TABLES, ...SEMANTIC_TABLES, ...WORKGROUP_TABLES];
const SEEDED = () => DOMAIN_CONTRACT.filter((entry) => !entry.deprecated && entry.seedCount > 0);

// ── ① 资源表覆盖 ────────────────────────────────────────────────
test('C1 契约覆盖 34 资源表 + 7 语义表 + 6 工作组表（双向相等，无缺无幽灵）', () => {
  assert.equal(RESOURCE_TABLES.length, 34, `db.js RESOURCE_TABLES 应为 34（实测 ${RESOURCE_TABLES.length}）`);
  assert.equal(SEMANTIC_TABLES.length, 7, `db.js SEMANTIC_TABLES 应为 7（实测 ${SEMANTIC_TABLES.length}）`);
  assert.equal(WORKGROUP_TABLES.length, 6, `db.js WORKGROUP_TABLES 应为 6（实测 ${WORKGROUP_TABLES.length}）`);
  assert.equal(new Set(ALL_TABLES).size, 47, '三张清单并集应为 47 表');

  const contractTables = new Set(DOMAIN_CONTRACT.map((entry) => entry.table));
  for (const table of ALL_TABLES) {
    const entry = ENTITY_BY_TABLE[table];
    assert.ok(entry, `资源表 ${table} 在契约中没有条目`);
    for (const key of ['entity', 'table', 'mockCollection', 'required', 'enums', 'seedCount', 'aliases']) {
      assert.ok(Object.hasOwn(entry, key), `${table} 契约缺字段 ${key}`);
    }
    assert.ok(Array.isArray(entry.required), `${table}.required 必须是数组`);
    assert.ok(entry.enums && typeof entry.enums === 'object', `${table}.enums 必须是对象`);
    assert.equal(typeof entry.seedCount, 'number', `${table}.seedCount 必须是数字`);
    assert.ok(Array.isArray(entry.aliases), `${table}.aliases 必须是数组`);
  }
  for (const entry of DOMAIN_CONTRACT) {
    assert.ok(ALL_TABLES.includes(entry.table), `${entry.table} 不在 db.js 三张清单内（幽灵表）`);
  }
  assert.equal(contractTables.size, ALL_TABLES.length, '契约表数应与 db.js 三张清单并集相等');
  assert.equal(new Set(DOMAIN_CONTRACT.map((entry) => entry.entity)).size, DOMAIN_CONTRACT.length,
    'entity 名不得重复（按名索引会静默覆盖）');
  // 资源表各有且仅有一条契约
  for (const table of RESOURCE_TABLES) {
    assert.equal(DOMAIN_CONTRACT.filter((entry) => entry.table === table).length, 1, `${table} 契约条目重复`);
  }
});

// ── ② required 字段在 seed / mock 至少一处出现 ──────────────────
test('C2 每个 required 字段在播种后的真实行（seed/mock 同源）中至少出现一次；种子计数与落库一致', () => {
  const problems = [];
  let requiredChecks = 0;
  let fieldHits = 0;

  for (const entry of DOMAIN_CONTRACT) {
    if (entry.deprecated) continue;
    const rows = rowsOf(entry.table);
    if (entry.seedCount > 0) {
      assert.ok(rows.length > 0, `${entry.table}：契约 seedCount=${entry.seedCount} 但落库为空（种子未接上）`);
      assert.equal(rows.length, entry.seedCount,
        `${entry.table}：落库 ${rows.length} 行 ≠ 契约 seedCount ${entry.seedCount}（功能/种子改了、契约未改）`);
    }
    for (const field of entry.required) {
      requiredChecks += 1;
      const hit = rows.some((row) => row && Object.hasOwn(row, field));
      if (hit) fieldHits += 1;
      else problems.push(`${entry.entity}(${entry.table}).${field}：required 字段在 ${rows.length} 行中一次都没出现`);
    }
    // 有 required 却零种子的表必须显式说明（防止「契约写必填、实际生产不出」）
    if (entry.required.length > 0 && entry.seedCount === 0) {
      problems.push(`${entry.entity}(${entry.table})：required 非空但 seedCount=0（无同源样本，判据不可达）`);
    }
  }

  assert.ok(requiredChecks >= 100, `必填检查次数 ${requiredChecks} < 100（抽取面过小）`);
  assert.equal(fieldHits, requiredChecks, `required 字段未全部命中：\n  ${problems.join('\n  ')}`);
  assert.deepEqual(problems, []);
});

// ── ③ 枚举只来自契约 ────────────────────────────────────────────
test('C3 枚举只来自契约：落库取值 ∈ 契约 enums；声明非空、无重复、与行内实际类型一致', () => {
  const problems = [];
  let observed = 0;

  for (const entry of DOMAIN_CONTRACT) {
    for (const [field, allowed] of Object.entries(entry.enums || {})) {
      assert.ok(Array.isArray(allowed) && allowed.length > 0, `${entry.table}.${field} 枚举声明为空`);
      assert.equal(new Set(allowed).size, allowed.length, `${entry.table}.${field} 枚举有重复值`);
    }
    if (entry.deprecated) continue;
    const rows = rowsOf(entry.table);
    for (const row of rows) {
      for (const [field, allowed] of Object.entries(entry.enums || {})) {
        if (!row || !Object.hasOwn(row, field)) continue;
        const value = row[field];
        if (value === undefined || value === null) continue;
        observed += 1;
        if (!allowed.includes(value)) {
          problems.push(`${entry.entity}(${entry.table}).${row.id}.${field}=${JSON.stringify(value)} ∉ [${allowed.join(', ')}]`);
        }
      }
    }
  }

  assert.ok(observed >= 50, `枚举取值检查次数 ${observed} < 50（抽取面过小，守卫近空转）`);
  assert.deepEqual(problems.slice(0, 30), [], `枚举取值未登记进契约（首因：新增状态值未改契约）：\n  ${problems.slice(0, 30).join('\n  ')}`);
});

// ── ④ 反例：删字段 / 改枚举 / 多字段必须判红 ────────────────────
test('C4 反例：删 required / 改枚举 / 多字段必须判红（同一校验器，防恒真）', () => {
  const entry = ENTITY_BY_NAME.activities;
  const base = rowsOf('activities').slice(0, 1);
  assert.equal(base.length, 1, '反例基线：活动至少 1 行');
  assert.deepEqual(validateEntityRows(entry, base, { strictFields: true }), [], '基线行不应报错');

  // 删字段
  const { title: _drop, ...withoutTitle } = base[0];
  const missing = validateEntityRows(entry, [withoutTitle]);
  assert.ok(missing.some((p) => p.kind === 'missing' && p.field === 'title'), '删 required 字段未判红');

  // 改枚举
  const badEnum = validateEntityRows(entry, [{ ...base[0], type: '不存在的活动类型' }]);
  assert.ok(badEnum.some((p) => p.kind === 'enum' && p.field === 'type'), '改枚举值未判红');

  // 多字段
  const extra = validateEntityRows(entry, [{ ...base[0], ghostField: 'x' }], { strictFields: true });
  assert.ok(extra.some((p) => p.kind === 'unknown' && p.field === 'ghostField'), '多字段未判红');

  // 非空转：真实落库行必须全部通过同一校验器
  const all = rowsOf('activities');
  assert.deepEqual(validateEntityRows(entry, all), [], '真实活动行不应违反契约');
});

// ── ⑤ 成员变更读时别名（不双写）─────────────────────────────────
test('C5 成员变更统一形状：canonical required 含 fromStage/toStage/action；member_confirmations 读时别名可映射且不改入参', () => {
  const canonical = ENTITY_BY_NAME.memberChangeRequests;
  for (const field of ['fromStage', 'toStage', 'action']) {
    assert.ok(canonical.required.includes(field), `memberChangeRequests.required 缺 ${field}`);
  }
  assert.ok(canonical.aliases.includes('member_confirmations'), 'memberChangeRequests.aliases 未登记 member_confirmations');
  const aliasEntry = ENTITY_BY_TABLE.member_confirmations;
  assert.ok(aliasEntry, 'member_confirmations 契约条目缺失');
  for (const field of ['from', 'to', 'action']) {
    assert.ok(aliasEntry.required.includes(field), `member_confirmations.required 缺 ${field}`);
  }

  const row = { id: 'mc-x', kind: 'change', action: 'developStage', personId: 'p1', from: '发展对象', to: '预备党员', status: 'pending' };
  const frozen = JSON.stringify(row);
  const aliased = aliasMemberChangeRow(row);
  assert.equal(JSON.stringify(row), frozen, '读时别名不得修改入参（不双写）');
  assert.equal(aliased.fromStage, '发展对象');
  assert.equal(aliased.toStage, '预备党员');
  assert.equal(aliased.action, 'developStage');
  assert.equal(aliased.from, '发展对象', '原字段保留（只增不改形）');
});

// ── ⑥ deprecated 只登记、不删表 / 不删路由 ──────────────────────
test('C6 issue_reveals 标 deprecated + 停写注释；仍留在 db.js 清单（不删表 / 不删路由）', () => {
  const entry = ENTITY_BY_TABLE.issue_reveals;
  assert.ok(entry, 'issue_reveals 契约条目缺失（应保留只读兼容条目）');
  assert.equal(entry.deprecated, true, 'issue_reveals 必须标 deprecated: true');
  assert.match(String(entry.notes || ''), /停写|只读兼容/, 'issue_reveals 必须写明「停写，保留只读兼容」');
  assert.ok(RESOURCE_TABLES.includes('issue_reveals'), 'RESOURCE_TABLES 不得删除 issue_reveals（server AGENTS 禁删）');
  assert.equal(entry.seedCount, 0, 'issue_reveals 不应再有种子');
});
