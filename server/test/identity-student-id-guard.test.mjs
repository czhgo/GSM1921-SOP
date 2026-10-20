// server/test/identity-student-id-guard.test.mjs — 人员主键 = 学号/工号（BREAKING 迁移守卫）
//
// 口径（2026-10-20 支书裁定）：
//   · 学号即唯一人员 id；教工/党委用工号。界面与数据都不再保留 p* 人员 id。
//   · mock 种子 / server 种子 / 反馈 JSON 里不得出现 'p<数字>' 人员 id。
//   · 业务代码不得引用 LEGACY_PERSON_ID_MAP（仅迁移文件与适配器迁移路径可用）。
//   · users.id 必须等于 studentId；旧 p* 只可作登录别名，会话一律存学号。
//
// 运行：`node --test server/test/identity-student-id-guard.test.mjs`（纯 node，无浏览器）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { initDb, migratePersonIdsToStudentNumbers } from '../db.js';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
import { PEOPLE } from '../../docs/src/data/mock/people.js?v=20261020e';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PERSON_ID_LITERAL = /['"]p(?:_pc|\d+)['"]/g;

function walkFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walkFiles(full, out);
    else if (/\.(?:js|mjs|json)$/.test(name)) out.push(full);
  }
  return out;
}

const rel = (full) => path.relative(ROOT, full).replace(/\\/g, '/');

test('G1 mock 种子 / server 种子 / 反馈 JSON 不得出现 p* 人员 id', () => {
  const files = [
    ...walkFiles(path.join(ROOT, 'docs/src/data/mock')),
    path.join(ROOT, 'docs/src/data/workgroup-seed-sync.js'),
    path.join(ROOT, 'server/seed.js'),
    path.join(ROOT, 'server/seed-baseline.js'),
    path.join(ROOT, 'docs/data/issues.json'),
  ];
  const hits = [];
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    for (const match of src.matchAll(PERSON_ID_LITERAL)) hits.push(`${rel(file)}: ${match[0]}`);
  }
  assert.deepEqual(hits, [], `仍残留 p* 人员 id：\n${hits.join('\n')}`);
});

test('G2 业务代码不得引用 LEGACY_PERSON_ID_MAP（仅迁移文件）', () => {
  const allowed = new Set([
    'server/migrations/legacy-person-ids.js',
    'docs/src/data/legacy-person-ids.js',
  ]);
  const files = [
    ...walkFiles(path.join(ROOT, 'docs/src')),
    ...walkFiles(path.join(ROOT, 'server/services')),
    ...walkFiles(path.join(ROOT, 'server/routes')),
    path.join(ROOT, 'server/seed.js'),
    path.join(ROOT, 'server/seed-baseline.js'),
    path.join(ROOT, 'server/app.js'),
    path.join(ROOT, 'server/db.js'),
  ];
  const hits = [];
  for (const file of files) {
    const key = rel(file);
    if (allowed.has(key) || key.startsWith('server/test/')) continue;
    const src = readFileSync(file, 'utf8');
    if (/LEGACY_PERSON_ID_MAP/.test(src)) hits.push(key);
  }
  assert.deepEqual(hits, [], `业务代码引用了 LEGACY_PERSON_ID_MAP：\n${hits.join('\n')}`);
});

test('G3 前端 legacy 映射只允许 data-adapter / mock-adapter 迁移路径引用', () => {
  const files = walkFiles(path.join(ROOT, 'docs/src'));
  const allowed = new Set(['docs/src/data/data-adapter.js', 'docs/src/data/mock-adapter.js']);
  const hits = files
    .filter((file) => !allowed.has(rel(file)))
    .filter((file) => !rel(file).endsWith('docs/src/data/legacy-person-ids.js'))
    .filter((file) => /from\s+['"][^'"]*legacy-person-ids\.js/.test(readFileSync(file, 'utf8')))
    .map(rel);
  assert.deepEqual(hits, [], `legacy 映射被迁移路径之外引用：\n${hits.join('\n')}`);
});

test('G4 PEOPLE 的 id 必须等于 studentId（学号/工号即主键）', () => {
  const bad = PEOPLE.filter((p) => String(p.id) !== String(p.studentId));
  assert.deepEqual(bad.map((p) => `${p.id}≠${p.studentId}`), [], '存在 id 与 studentId 不一致的人员');
});

test('G5 播种库 users.id = studentId；v7 幂等（全为学号时 mapped=0）', async () => {
  const app = createApp({ dbPath: ':memory:' });
  try {
    await seedDatabase(app.locals.db);
    const users = app.locals.db.prepare('SELECT id, data FROM users').all().map((r) => ({ id: r.id, ...JSON.parse(r.data) }));
    const bad = users.filter((u) => String(u.id) !== String(u.studentId));
    assert.deepEqual(bad.map((u) => `${u.id}≠${u.studentId}`), [], 'users.id 必须等于 studentId');

    const report = migratePersonIdsToStudentNumbers(app.locals.db);
    assert.equal(report.mapped, 0, '已是学号 ⇒ 不得再映射');
    assert.equal(report.total, 0, '已是学号 ⇒ 无旧 id 命中');
    assert.equal(report.rate, 1);
  } finally {
    app.locals.db.close();
  }
});

test('G6 旧 p* 只作登录别名：会话与返回用户一律存学号，users 表不落 p*', async () => {
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const r = await fetch(`${base}/api/v1/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId: 'p13', password: '123456' }),
    });
    assert.equal(r.status, 200, '旧 p13 应可作登录别名');
    const data = await r.json();
    assert.equal(data.user.id, '2300010001', '登录后返回的用户 id 必须是学号');
    const session = app.locals.db.prepare('SELECT person_id FROM sessions WHERE token = ?').get(data.token);
    assert.equal(session.person_id, '2300010001', '会话必须存学号');
    assert.equal(app.locals.db.prepare('SELECT COUNT(*) c FROM users WHERE id LIKE ?').get('p%').c, 0,
      'users 表不得落 p* 主键');
  } finally {
    server.close();
    app.locals.db.close();
  }
});

test('G7 v7 迁移把旧库里的 users / 引用 / 会话一并换成学号', () => {
  const db = initDb(':memory:');
  try {
    db.prepare('INSERT INTO users (id, data) VALUES (?, ?)').run('p13', JSON.stringify({
      id: 'p13', name: '储子禾', studentId: '2300010001', role: 'secretary', branchId: 'br-b1',
    }));
    db.prepare('INSERT INTO activities (id, data) VALUES (?, ?)').run('act-x', JSON.stringify({
      id: 'act-x', organizer: 'p13', assignments: [{ personId: 'p13', role: 'organizer' }],
      voteConfig: { voterIds: ['p13'] },
    }));
    db.prepare("INSERT INTO sessions (token, person_id, created_at) VALUES ('t1', 'p13', '2026-10-20')").run();
    db.prepare("INSERT INTO attachments (id, filename, path, size, uploaded_by, uploaded_at) VALUES ('a1','f','p',1,'p13','2026-10-20')").run();
    db.prepare('INSERT INTO issue_unread (id, data) VALUES (?, ?)').run('p13:issue-002', JSON.stringify({
      id: 'p13:issue-002', assigneeId: 'p13', issueId: 'issue-002',
    }));

    const report = migratePersonIdsToStudentNumbers(db);
    assert.ok(report.total > 0 && report.mapped === report.total && report.unmapped.length === 0,
      `应全部映射：${JSON.stringify(report)}`);
    assert.equal(report.rate, 1);

    assert.equal(db.prepare('SELECT id FROM users').get().id, '2300010001');
    assert.equal(JSON.parse(db.prepare('SELECT data FROM activities').get().data).organizer, '2300010001');
    assert.equal(db.prepare('SELECT person_id FROM sessions').get().person_id, '2300010001');
    assert.equal(db.prepare('SELECT uploaded_by FROM attachments').get().uploaded_by, '2300010001');
    const unread = db.prepare('SELECT id, data FROM issue_unread').get();
    assert.equal(unread.id, '2300010001:issue-002');
    assert.equal(JSON.parse(unread.data).assigneeId, '2300010001');

    // 不可映射 ⇒ 抛错且不留部分写入
    db.prepare('INSERT INTO users (id, data) VALUES (?, ?)').run('p99', JSON.stringify({ id: 'p99', name: '未知', studentId: '2026999999' }));
    assert.throws(() => migratePersonIdsToStudentNumbers(db), /无法映射/);
    assert.equal(db.prepare('SELECT COUNT(*) c FROM users WHERE id = ?').get('p99').c, 1, '失败必须回滚（p99 保留）');
  } finally {
    db.close();
  }
});
