// ════════════════════════════════════════════════════════════════
//  server/test/seed-baseline.test.mjs —— **最小组织基线**守卫（2026-09-29 批次 270 新增）
//
//  验的是三件事（**支书 2026-09-29 三条**：
//   ①「部署先行把党委功能设置好，以及一个既存的支部 光华管理学院本科生党支部」
//   ②成员入站走 IAAA（本测试不涉）
//   ③「目前所有的名单都不要部署上去」）：
//
//  B1 **生产空库能自举**：空库跑 `seedBaseline` ⇒ `branches` 恰 1 行（`br-b1`、
//     「光华管理学院本科生党支部」、`secretaryId: null` 支书席位空缺）＋ `users` 恰 1 行
//     （`role === 'party-staff'`、`branchId === null`）；**其余业务表全空**。
//  B2 **零名单**：跑完基线后，库里**不含**演示名册里的任何自然人（`PEOPLE` 中 `branchId` 非空者一个都不在库）。
//  B3 **幂等 + 不覆盖**：连跑两次计数不变；库里**已有**支部 / 已有党委账号时，**一律不动**。
//  B4 **非空转（反例锁死）**：源名册确实有 ≥50 名支部成员（否则 B2 会因为「源为空」而恒真）；
//     并实测「往 users 塞一名演示成员后 B2 判据必须报红」。
// ════════════════════════════════════════════════════════════════
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initDb } from '../db.js';
import { seedBaseline } from '../seed-baseline.js';
import { PEOPLE } from '../../docs/src/data/mock/people.js?v=20261004i';

const rows = (db, t) => db.prepare(`SELECT data FROM ${t}`).all().map((r) => JSON.parse(r.data));
const count = (db, t) => db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;

test('B1 生产空库能自举：支部 1 个（br-b1 · 光华管理学院本科生党支部）＋ 党委账号 1 名，其余全空', () => {
  const real = initDb(':memory:');   // 与线上同建表路径（45 张物理表）
  seedBaseline(real);

  // ① 支部恰 1 行，且是既存的那个（id 必须 br-b1——全仓有「缺省支部」兜底）
  assert.equal(count(real, 'branches'), 1, '支部应恰 1 行');
  const b = rows(real, 'branches')[0];
  assert.equal(b.id, 'br-b1', '支部 id 必须是 br-b1（多处缺省兜底指向它）');
  assert.equal(b.name, '光华管理学院本科生党支部', '支部名 = 支书点名的既存支部');
  assert.equal(b.secretaryId, null, '支书席位空缺待任命（一把手层归党委，D-585）');
  assert.equal(b.config.modules, null, 'config 取空组织模板口径：modules null = 默认全开');
  assert.equal(b.config.workforce, null, 'workforce null = 缺省分工（不引用任何成员 id）');

  // ② 党委账号恰 1 名，且是组织级（不属于任何支部）
  assert.equal(count(real, 'users'), 1, '账号应恰 1 名（只有党委）');
  const u = rows(real, 'users')[0];
  assert.equal(u.role, 'party-staff', '必须是党委组织员角色，否则没人能建支部（POST /branches 的门）');
  assert.equal(u.branchId, null, '组织级：不属于任一支部');
  assert.equal(real.prepare("SELECT COUNT(*) c FROM sqlite_master WHERE type='table'").get().c >= 44, true,
    '物理表应齐（≥44：34 资源 + 7 语义 + 2 关系 + collection_versions；2026-10-02 批次 342 删 `compliance_references` ⇒ 45 → 44）');

  // ③ **其余业务表全空**（本系统的核心约束：部署不带名单）
  const skip = new Set(['branches', 'users', 'collection_versions', 'sessions', 'attachments']);
  const tables = real.prepare("SELECT name FROM sqlite_master WHERE type='table'").all()
    .map((r) => r.name).filter((n) => !skip.has(n) && !n.startsWith('sqlite_'));
  const nonEmpty = tables.filter((t) => count(real, t) > 0);
  assert.deepEqual(nonEmpty, [], `基线后除 branches/users 外不应有非空表，实测非空：${nonEmpty.join(', ')}`);
  real.close();
});

test('B2 零名单：库内不含任何演示名册里的**支部成员**；B4 非空转：源名册确有 ≥50 人', () => {
  const roster = PEOPLE.filter((p) => p.branchId);      // 支部成员（排除 party-staff 的组织级账号）
  assert.ok(roster.length >= 50, `源名册支部成员应 ≥50（实测 ${roster.length}）——否则 B2 会因「源为空」而恒真`);

  const db = initDb(':memory:');
  seedBaseline(db);
  const ids = new Set(rows(db, 'users').map((u) => u.id));
  const leaked = roster.filter((p) => ids.has(p.id)).map((p) => p.id);
  assert.deepEqual(leaked, [], `库内不得出现演示名册成员，实测泄露：${leaked.join(', ')}`);

  // B4 反例锁死：**人为塞一名演示成员** ⇒ 同一判据必须报红（证明它不是恒真）
  const victim = roster[0];
  db.prepare('INSERT OR REPLACE INTO users (id, data) VALUES (?, ?)').run(victim.id, JSON.stringify(victim));
  const ids2 = new Set(rows(db, 'users').map((u) => u.id));
  assert.equal(roster.some((p) => ids2.has(p.id)), true,
    '反例：塞入演示成员后判据必须报红（否则 B2 判据恒真、等于没检）');
  db.close();
});

test('B3 幂等 + 不覆盖：连跑两次不变；已有支部 / 已有党委账号时一律不动', () => {
  const db = initDb(':memory:');
  const first = seedBaseline(db);
  assert.deepEqual(first, { branch: true, partyStaff: true }, '空库首跑两项都应补');
  const second = seedBaseline(db);
  assert.deepEqual(second, { branch: false, partyStaff: false }, '二跑应什么都不做（幂等）');
  assert.equal(count(db, 'branches'), 1, '幂等：支部仍 1 行');
  assert.equal(count(db, 'users'), 1, '幂等：账号仍 1 名');

  // 已有数据时**不覆盖**：换一个已存在的支部 + 已存在的党委账号 ⇒ 调用前后逐值不变
  const db2 = initDb(':memory:');
  const custom = { id: 'br-b1', name: '我自己的支部名', type: 'x', config: { headerTitle: 'HH' }, secretaryId: 'p1', status: 'active' };
  db2.prepare('INSERT INTO branches (id, data) VALUES (?, ?)').run(custom.id, JSON.stringify(custom));
  const staff = { id: 'p_pc', name: '真名党务老师', studentId: '1234567890', role: 'party-staff', branchId: null };
  db2.prepare('INSERT INTO users (id, data) VALUES (?, ?)').run(staff.id, JSON.stringify(staff));
  const r = seedBaseline(db2);
  assert.deepEqual(r, { branch: false, partyStaff: false }, '已有支部与账号 ⇒ 一项都不补');
  assert.equal(rows(db2, 'branches')[0].name, '我自己的支部名', '**不覆盖**已有支部（改名/配置必须保留）');
  assert.equal(rows(db2, 'users')[0].name, '真名党务老师', '**不覆盖**已有党委账号');
  db.close(); db2.close();
});
