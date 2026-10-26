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
import { PEOPLE } from '../../docs/src/data/mock/people.js?v=20261026a';
import { createApp } from '../app.js';
import { detectDemoSeedRows, demoGateDecision, enforceProductionDemoGate } from '../demo-data-guard.js';
import { repairSeedRowsIfNeeded, readSeedMeta, writeSeedMeta } from '../seed-repair.js';
import { loadSeedRowsForTable } from '../seed-rows.js';

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
  const custom = { id: 'br-b1', name: '我自己的支部名', type: 'x', config: { headerTitle: 'HH' }, secretaryId: '2400012345', status: 'active' };
  db2.prepare('INSERT INTO branches (id, data) VALUES (?, ?)').run(custom.id, JSON.stringify(custom));
  const staff = { id: '9000000001', name: '真名党务老师', studentId: '1234567890', role: 'party-staff', branchId: null };
  db2.prepare('INSERT INTO users (id, data) VALUES (?, ?)').run(staff.id, JSON.stringify(staff));
  const r = seedBaseline(db2);
  assert.deepEqual(r, { branch: false, partyStaff: false }, '已有支部与账号 ⇒ 一项都不补');
  assert.equal(rows(db2, 'branches')[0].name, '我自己的支部名', '**不覆盖**已有支部（改名/配置必须保留）');
  assert.equal(rows(db2, 'users')[0].name, '真名党务老师', '**不覆盖**已有党委账号');
  db.close(); db2.close();
});

// ════════════════════════════════════════════════════════════════
//  B5–B7 正式数据轨道（spec restore-capsule-and-harden-data-truth · Task 7）
// ════════════════════════════════════════════════════════════════

/** 读 `/src/config/deploy.js` 注入值（bool） */
async function injectedSeedFallback() {
  const app = createApp({ dbPath: ':memory:' });
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const text = await (await fetch(`${base}/src/config/deploy.js`)).text();
    const match = /export const SEED_FALLBACK = (true|false);/.exec(text);
    assert.ok(match, `注入串应含 SEED_FALLBACK：${text.slice(0, 120)}`);
    return match[1] === 'true';
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
    app.locals.db.close();
  }
}

test('B5 生产默认关闭前端演示回退：未显式 SEED_FALLBACK ⇒ 注入 false；非生产/显式值保持既有语义', async () => {
  const saved = {
    APP_ENV: process.env.APP_ENV, NODE_ENV: process.env.NODE_ENV, SEED_FALLBACK: process.env.SEED_FALLBACK,
  };
  try {
    delete process.env.APP_ENV; delete process.env.NODE_ENV; delete process.env.SEED_FALLBACK;
    assert.equal(await injectedSeedFallback(), true, '非生产 + 未设 ⇒ true（既有行为不变）');

    process.env.APP_ENV = 'production';
    assert.equal(await injectedSeedFallback(), false, '生产 + 未设 ⇒ 必须注入 false');

    process.env.SEED_FALLBACK = '1';
    assert.equal(await injectedSeedFallback(), true, '生产 + 显式 1 ⇒ 尊重显式值');
    process.env.SEED_FALLBACK = '0';
    assert.equal(await injectedSeedFallback(), false, '生产 + 显式 0 ⇒ false');
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});

test('B6 生产启动闸门：空库基线不误伤；含演示种子行默认拒启，ALLOW_DEMO_DATA=1 才放行', async () => {
  const demoIds = new Set(PEOPLE.filter((p) => p.branchId).map((p) => String(p.id)));
  const clean = initDb(':memory:');
  seedBaseline(clean);
  assert.equal(detectDemoSeedRows(clean, { demoUserIds: demoIds }).demo, false, '空库基线（1 支部 + 1 party-staff）不得被判为演示库');
  // 第三判据：即便演示行被手工删净，seed_meta.mode=demo 仍应判为演示库（包无关、防「标记还在却放行」）
  writeSeedMeta(clean, 'mode', 'demo');
  const modeOnly = detectDemoSeedRows(clean, { demoUserIds: demoIds });
  assert.equal(modeOnly.demoUsers.length, 0);
  assert.equal(modeOnly.seedActivities.length, 0);
  assert.equal(modeOnly.seedMode, 'demo');
  assert.equal(modeOnly.demo, true, 'seed_meta.mode=demo ⇒ 演示库');
  clean.close();

  const dirty = initDb(':memory:');
  seedBaseline(dirty);
  const demoPerson = PEOPLE.find((p) => p.branchId);
  dirty.prepare('INSERT OR REPLACE INTO users (id, data) VALUES (?, ?)').run(demoPerson.id, JSON.stringify(demoPerson));
  dirty.prepare('INSERT OR REPLACE INTO activities (id, data) VALUES (?, ?)')
    .run('act-1', JSON.stringify({ id: 'act-1', title: '演示活动', date: '2026-08-07', type: '党小组会' }));
  const found = detectDemoSeedRows(dirty, { demoUserIds: demoIds });
  assert.deepEqual(found.demoUsers, [demoPerson.id], 'users 演示账号按 PEOPLE 支部成员识别');
  assert.deepEqual(found.seedActivities, ['act-1'], 'activities 演示种子 id 按 act-<短数字> 识别');
  assert.equal(found.demo, true);

  assert.equal(demoGateDecision({ production: true, allowDemoData: false, ...found }).reason, 'demo-detected');
  assert.equal(demoGateDecision({ production: true, allowDemoData: true, ...found }).blocked, false, 'ALLOW_DEMO_DATA=1 ⇒ 放行');
  assert.equal(demoGateDecision({ production: false, allowDemoData: false, ...found }).blocked, false, '非生产形态不拦（本地演示/测试）');

  // 执行器：生产 + 演示行 + 未放行 ⇒ exit(1)；日志可读
  const logs = [];
  const exits = [];
  const log = { log: (m) => logs.push(['log', m]), warn: (m) => logs.push(['warn', m]), error: (m) => logs.push(['error', m]) };
  const blocked = await enforceProductionDemoGate(dirty, {
    env: { APP_ENV: 'production' }, log, exit: (code) => exits.push(code),
  });
  assert.equal(blocked.blocked, true);
  assert.deepEqual(exits, [1], '生产形态含演示种子 ⇒ 必须退出码 1');
  assert.ok(logs.some(([level, msg]) => level === 'error' && /启动被拒/.test(msg)), '拒绝日志须可读');

  // ALLOW_DEMO_DATA=1：不 exit，但必须明确警告
  logs.length = 0; exits.length = 0;
  const allowed = await enforceProductionDemoGate(dirty, {
    env: { APP_ENV: 'production', ALLOW_DEMO_DATA: '1' }, log, exit: (code) => exits.push(code),
  });
  assert.equal(allowed.blocked, false);
  assert.deepEqual(exits, []);
  assert.ok(logs.some(([level, msg]) => level === 'warn' && /ALLOW_DEMO_DATA=1/.test(msg)), '放行时须留下警告');
  dirty.close();
});

test('B7 seed-repair 在 baseline / 生产形态不修复演示 seed id，且 seed_meta 只读', async () => {
  const db = initDb(':memory:');
  try {
    const seeds = await loadSeedRowsForTable('activities');
    const seed = seeds[0];
    db.prepare('INSERT INTO activities (id, data) VALUES (?, ?)').run(seed.id, JSON.stringify({ ...seed, visibility: 'drifted-visibility' }));
    writeSeedMeta(db, 'seed_version', 'old-version');
    writeSeedMeta(db, 'mode', 'baseline');

    const before = db.prepare('SELECT data FROM activities WHERE id = ?').get(seed.id).data;
    const baselineRun = await repairSeedRowsIfNeeded(db, 'new-version');
    assert.equal(baselineRun.skipped, true);
    assert.equal(baselineRun.reason, 'baseline-mode');
    assert.equal(db.prepare('SELECT data FROM activities WHERE id = ?').get(seed.id).data, before, 'baseline 形态不得改写演示种子行');
    assert.equal(readSeedMeta(db, 'seed_version'), 'old-version', '跳过时 seed_meta 只读（不得写回版本）');

    db.prepare("DELETE FROM seed_meta WHERE key = 'mode'").run();
    const prodRun = await repairSeedRowsIfNeeded(db, 'new-version', { production: true });
    assert.equal(prodRun.skipped, true);
    assert.equal(prodRun.reason, 'production');
    assert.equal(db.prepare('SELECT data FROM activities WHERE id = ?').get(seed.id).data, before, '生产形态不得改写演示种子行');
    assert.equal(readSeedMeta(db, 'seed_version'), 'old-version', '生产形态同样只读 seed_meta');
  } finally {
    db.close();
  }
});
