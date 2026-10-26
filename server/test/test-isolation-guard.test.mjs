// server/test/test-isolation-guard.test.mjs — 测试残留隔离守卫（2026-10-26 Task 6）
// ════════════════════════════════════════════════════════════════
// 为什么要这层守卫：
//   · 真机 / API 测试若直连 `:3000` 的运行库（`server/data.db`），只在用例末尾自清 ⇒
//     失败或中断即留残留（`act-b31-*` / `att-b31-*` / `mk-b31-*` / 测试议题 ……）。
//   · 本守卫把「测试数据面」钉成四类（`memory / tmp / external-read / external-write`）：
//       I1 每个测试文件都必须解析出合法 fixtureClass（显式字段 → 层缺省）；
//       I2 external-write 必须「临时库」或「finally 清理证据」——纯函数审计，含故障注入；
//       I3 连 `:3000` 的测试必须标 external-*，且测试源码不得指向 `server/data.db`；
//       I4 可运行检查：自托管临时库登录只写临时库，运行库 sessions / uploads 不增长。
//   判据不放宽：新增测试若把数据写进运行库，I2/I3/I4 任一即红。
// 运行：`node --test test/test-isolation-guard.test.mjs`（纯 node，不需要外部 :3000）
// ════════════════════════════════════════════════════════════════
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';
import { createApp } from '../app.js';
import { seedBaseline } from '../seed-baseline.js';
import {
  FIXTURE_CLASSES, fixtureClassOf, filesByFixtureClass,
} from '../test-tier-registry.mjs';

const TEST_DIR = import.meta.dirname;
const ROOT = join(TEST_DIR, '..', '..');
const RUNTIME_DB = join(ROOT, 'server', 'data.db');
const UPLOAD_DIR = join(ROOT, 'server', 'uploads');

const diskFiles = () => readdirSync(TEST_DIR).filter((f) => /\.test\.(js|mjs)$/.test(f)).sort();
const read = (file) => readFileSync(join(TEST_DIR, file), 'utf8');

/** 去掉整行注释后的代码面（注释里可以写「原版曾连 server/data.db」这类说明，不算回潮） */
const codeOf = (source) => source
  .split(/\r?\n/)
  .filter((line) => {
    const text = line.trim();
    return !text.startsWith('//') && !text.startsWith('*') && !text.startsWith('/*');
  })
  .join('\n');

/** 连外部 `:3000` 的固定 BASE（真连接；`127.0.0.1:3000` 仅出现在 stub 数据里的不算） */
const EXTERNAL_BASE_RE = /const\s+BASE\s*=\s*['"`]http:\/\/(?:localhost|127\.0\.0\.1):3000/;

/**
 * external-write 的安全证据（纯函数，供故障注入自检）：
 *   · 临时库：`mkdtempSync(` / `tmpdir()` / `dbPath: ':memory:'` / `dbPath: join(...) temp`；
 *   · 或 `t.after(` / `finally` 里出现删库/删文件/DELETE 清理。
 */
export function externalWriteSafe(source) {
  const code = codeOf(source);
  const tempDb = /mkdtempSync\(|tmpdir\(\)|dbPath:\s*':memory:'|dbPath:\s*join\([^)]*(?:temp|tmp)/.test(code);
  const cleaned = /(?:t\.after\(|finally\s*\{)[\s\S]{0,600}?(?:rmSync|unlinkSync|DELETE )/.test(code);
  return tempDb || cleaned;
}

const runtimeSessionCount = () => {
  if (!existsSync(RUNTIME_DB)) return null;
  const db = new Database(RUNTIME_DB, { readonly: true });
  try { return db.prepare('SELECT COUNT(*) c FROM sessions').get().c; } finally { db.close(); }
};

const uploadFiles = () => (existsSync(UPLOAD_DIR)
  ? readdirSync(UPLOAD_DIR, { recursive: true }).map(String).sort()
  : []);

test('I1 每个测试文件都登记 fixtureClass，四类取值合法', () => {
  const files = diskFiles();
  assert.ok(files.length >= 250, `只扫到 ${files.length} 个测试文件（下限 250）：发现口径失效`);
  const unknown = files.filter((f) => !FIXTURE_CLASSES.includes(fixtureClassOf(f)));
  assert.deepEqual(unknown, [], `以下测试解析不出合法 fixtureClass（${FIXTURE_CLASSES.join(' / ')}）：\n  ${unknown.join('\n  ')}`);
  assert.equal(FIXTURE_CLASSES.length, 4, 'fixtureClass 必须恰为四类');

  // 非空转：两大数据面的规模下限
  assert.ok(filesByFixtureClass('memory').length >= 190, `memory 类只解析到 ${filesByFixtureClass('memory').length} 个（下限 190）`);
  assert.ok(filesByFixtureClass('tmp').length >= 30, `tmp 类只解析到 ${filesByFixtureClass('tmp').length} 个（下限 30）`);

  // 本轮已确认的显式归类
  assert.equal(fixtureClassOf('b3-1-makeup-writeback.test.mjs'), 'tmp', 'b3-1 必须标 tmp（自托管临时库）');
  assert.equal(fixtureClassOf('click-cost.test.mjs'), 'external-read', 'click-cost 必须标 external-read');
  assert.equal(fixtureClassOf('mock-integrity.test.mjs'), 'external-read', 'mock-integrity 必须标 external-read');
});

test('I2 external-write 必须有临时库或 finally 清理证据（含故障注入）', () => {
  const externalWrite = filesByFixtureClass('external-write');
  const unsafe = externalWrite.filter((f) => !externalWriteSafe(read(f)));
  assert.deepEqual(unsafe, [], `以下 external-write 测试既不用临时库、也没有 finally 清理证据：\n  ${unsafe.join('\n  ')}`);

  // 故障注入：坏样本必须判不安全、好样本必须判安全（证明审计不是恒真 / 恒假）
  const bad = [
    "const BASE = 'http://localhost" + ":3000';",
    "await fetch(BASE + '/api/v1/activities', { method: 'POST', body: '{}' });",
    'const browser = await chromium.launch();',
  ].join('\n');
  assert.equal(externalWriteSafe(bad), false, '直连 :3000 写运行库的样本必须判不安全');
  const good = [
    "const dir = mkdtempSync(join(tmpdir(), 'gsm-x-'));",
    "const app = createApp({ dbPath: join(dir, 'data.db') });",
    't.after(() => rmSync(dir, { recursive: true, force: true }));',
  ].join('\n');
  assert.equal(externalWriteSafe(good), true, '临时库 + t.after 清理的样本必须判安全');
});

test('I3 连 :3000 的测试必须标 external-*；测试源码不得指向 server/data.db', () => {
  // 本守卫自身只做静态审计 / 临时库检查，不是被测对象（其断言文案含被测字面量）
  const files = diskFiles().filter((f) => f !== 'test-isolation-guard.test.mjs');
  const external = files.filter((f) => EXTERNAL_BASE_RE.test(codeOf(read(f))));
  assert.ok(external.length >= 2, `只解析到 ${external.length} 个连 :3000 的测试（下限 2）：检测口径失效`);
  const mislabeled = external.filter((f) => !['external-read', 'external-write'].includes(fixtureClassOf(f)));
  assert.deepEqual(mislabeled, [], `以下测试连 :3000 却未标 external-*：\n  ${mislabeled.join('\n  ')}`);

  const leakage = files.filter((f) => /server[\\/]data\.db/.test(codeOf(read(f))));
  assert.deepEqual(leakage, [], `以下测试源码指向运行库 server/data.db（应改临时库 / :memory:）：\n  ${leakage.join('\n  ')}`);

  // b3-1：自托管临时库的静态证据（本轮核心改动）
  const b31 = codeOf(read('b3-1-makeup-writeback.test.mjs'));
  assert.match(b31, /mkdtempSync\(/, 'b3-1 必须 mkdtemp 临时目录');
  assert.match(b31, /createApp\(\{ dbPath \}\)/, 'b3-1 必须把 dbPath 传给 createApp');
  assert.match(b31, /listen\(0\)/, 'b3-1 必须 listen(0) 自托管');
  assert.match(b31, /t\.after\(/, 'b3-1 清理必须放 t.after（失败也执行）');
  assert.doesNotMatch(b31, EXTERNAL_BASE_RE, 'b3-1 不得再连外部 :3000');
});

test('I4 可运行检查：自托管临时库登录只写临时库，运行库 sessions / uploads 不增长', async () => {
  const beforeSessions = runtimeSessionCount();
  const beforeUploads = uploadFiles();
  assert.ok(beforeSessions !== null, `运行库不存在，无法做「不增长」检查：${RUNTIME_DB}`);

  const dir = mkdtempSync(join(tmpdir(), 'gsm-isolation-'));
  const app = createApp({ dbPath: join(dir, 'data.db') });
  const server = app.listen(0);
  try {
    seedBaseline(app.locals.db);
    // 最小夹具：仅登录所需的一名支书（字段与 mock/people.js 同形；不依赖 mock 种子模块）
    const person = { id: '2300010001', name: '储子禾', studentId: '2300010001', partyGroup: '第一党小组', developStage: '正式党员', role: 'secretary', branchId: 'br-b1' };
    app.locals.db.prepare('INSERT OR IGNORE INTO users (id, data) VALUES (?, ?)')
      .run(person.id, JSON.stringify(person));
    const base = `http://127.0.0.1:${server.address().port}`;
    const res = await fetch(`${base}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId: '2300010001', password: process.env.LOGIN_PASSWORD || '123456' }),
    });
    assert.equal(res.status, 200, `临时库登录应成功（HTTP ${res.status}）`);

    const tempSessions = app.locals.db.prepare('SELECT COUNT(*) c FROM sessions').get().c;
    assert.ok(tempSessions >= 1, '登录必须写进临时库（否则「只写临时库」断言恒真）');
    assert.equal(runtimeSessionCount(), beforeSessions, '自托管测试不得向运行库新增 sessions');
    assert.deepEqual(uploadFiles(), beforeUploads, '自托管测试不得在运行库 uploads 新增文件');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    try { app.locals.db.close(); } catch { /* 已关闭 */ }
    rmSync(dir, { recursive: true, force: true });
  }
});
