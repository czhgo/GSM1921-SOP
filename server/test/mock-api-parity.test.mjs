// role: [工程师]+[AI]
// server/test/mock-api-parity.test.mjs — 「两形态读数一致」守卫（2026-09-26 本批新增）
// ════════════════════════════════════════════════════════════════
// 立据（支书两条指令）：①「我认为我们有一些模拟数据在 server 中！体现一定可以体现出我们真实使用的功能和问题！」
//   ②「先补 todos 种子」。⇒ 本批补 `todos` 种子后，必须有一道**常驻防线**替住：
//   「mock 形态（前端静态种子）的读数」与「api 形态（服务端表）的读数」**对指定表集合逐值一致**。
//
// 体例照姊妹件：`roster.test.mjs`（两形态对照：起 `:memory:` 服务 → `seedDatabase` → 真登录 →
//   `setDataSource('api')` → `init()`，再把同一批读数与 mock 形态逐值对照）；`mock-integrity.test.mjs`
//   （语料自洽）。**判据自成一档**：本文件比的是「同一张表在两种形态下读出来的行是否逐值相同」。
//
// ⚠ 为什么**必须**同时打「服务端 HTTP」这一路（否则本守卫会假绿）：
//   `data-adapter.js::init()` 对**空表**有 `SEED_FALLBACK` 空表回退——若服务端没播种某表，前端会把
//   **同一份静态语料**塞回缓存 ⇒ 「api 形态缓存读数 ≡ mock 形态读数」**照样成立**（两侧同源）。
//   即：只看前端缓存，**「服务端有没有播种」这件事根本判不出来**。故本守卫主判据打在**服务端表**上
//   （`GET /api/v1/<res>` 的原始行），前端缓存那一路只作旁证（证「两形态读数一致」）。
//
// 表集合（**覆盖本批补 / 改的表 ＋ 已知易漂的表**）：
//   · `todos`（本批补种；也是唯一曾被 `SEED_FALLBACK` 掩盖缺口的表）· `notices`（种子计数曾疑 12 vs 13）
//   · `attendances`（本批改 8 月生成段 `_ALL_PERSON_IDS`：剔除党委组织员 p_pc）
//   · `inspections`（id 序列跳过 insp-17）· `makeupTasks`（本批改 `attendanceRecordId`：att-sep-1 → att900）
//   ⚠ 未再扩张到「服务端逐字复刻、无 mock 具名导出可比」的表（weekly_reports / prop_tasks / handoffs /
//     各申诉队列等：它们的语料在 UI 文件内私有或纯服务端常量，本守卫**没有**一侧可比对 ⇒ 强行纳入会假绿）。
//
// 非空转判据（防守恒真）：
//   ① **抽取面下限**：表集合规模 ≥ 5、逐表读数 > 0、比对行数合计 ≥ 200；
//   ② **逐表断言为真**：每表都有确定行数（非「空 == 空」）；
//   ③ **比较器自检**：对同一语料人为改一个字段 ⇒ 比较器必须判出差异（否则比较口径写坏，全表恒绿）。
//
// 运行：`node --test test/mock-api-parity.test.mjs`（server 目录；需 `DISABLE_PASSWORD_CHECK=1` 或带口令）。
// ⚠ 对 docs/src 的相对 import 必须带与源码一致的 `?v=` query（模块缓存键一致性，同 attendance-batch / roster）。
import { test, after } from 'node:test';
import assert from 'node:assert/strict';

// ── localStorage / sessionStorage 内存桩（成员档案读链惰性访问需要；照 roster.test 同款）──
function makeStorage(init = {}) {
  const m = new Map(Object.entries(init).map(([k, v]) => [String(k), String(v)]));
  return {
    getItem: (k) => (m.has(String(k)) ? m.get(String(k)) : null),
    setItem: (k, v) => m.set(String(k), String(v)),
    removeItem: (k) => { m.delete(String(k)); },
    clear: () => { m.clear(); },
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  };
}
globalThis.localStorage = makeStorage();

import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
import { mockDB } from '../../docs/src/core/domain/domain.js?v=20261001e';
import { getRuntimeMode, init, setDataSource } from '../../docs/src/data/data-adapter.js?v=20261001e';
// ── mock 形态语料（单一源；服务端 seed.js 亦从这些具名导出播种 ⇒ 两侧本应逐值相同）──
import { MOCK_NOTICES } from '../../docs/src/data/mock/notices.js?v=20261001e';
import { ATTENDANCE_RECORDS } from '../../docs/src/data/mock/attendance.js?v=20261001e';
import { INSPECTION_RECORDS } from '../../docs/src/data/mock/inspection.js?v=20261001e';
import { SEED_MAKEUP_TASKS } from '../../docs/src/data/mock/seed.js?v=20261001e';
// `SEED_TODOS` 不在 `mock/**`（它是服务层常量，前端 seedTodos() 读的正是它）——服务端 seed.js 同源 import
import { SEED_TODOS } from '../../docs/src/services/governance/todo.js?v=20261001e';

// ════════════════════════════════════════════════════════════════
//  B 类现场（api 形态）：内存服务 + 真登录取 token + init() 把服务端全量灌进 mockDB 缓存
// ════════════════════════════════════════════════════════════════
const _app = createApp({ dbPath: ':memory:' });
await seedDatabase(_app.locals.db);
const _server = _app.listen(0);
const _base = `http://127.0.0.1:${_server.address().port}`;
// 登录：带口令（`123456`）⇒ 无论 DISABLE_PASSWORD_CHECK 是否置位都可登
const _loginRes = await fetch(`${_base}/api/v1/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ personId: 'p13', password: '123456' }),
});
assert.equal(_loginRes.status, 200, 'B 类现场：真登录须 200');
const { token: _token } = await _loginRes.json();
globalThis.sessionStorage = makeStorage({ 'gsm1921-api-token': _token });
setDataSource('api', { apiBaseUrl: _base, authToken: _token });
await init();

after(async () => {
  _server.closeAllConnections?.();
  await new Promise((r) => _server.close(r));
});

/** 服务端表原始行（`GET /api/v1/<res>`，API 单一权威；不经过前端任何回退/合并） */
async function serverRows(resource) {
  const r = await fetch(`${_base}/api/v1/${resource}`, { headers: { Authorization: `Bearer ${_token}` } });
  assert.equal(r.status, 200, `GET /api/v1/${resource} 应 200（实测 ${r.status}）`);
  return r.json();
}

/** 归一（比较用）：按 id 升序 + 逐行 JSON 深拷贝（消除行序 / 引用共享，使差异纯为「值不同」） */
function normalize(rows) {
  return [...rows]
    .map((r) => JSON.parse(JSON.stringify(r)))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

/** 比较器：返回两份归一行的差异清单（自检用；空数组＝一致） */
function diffOf(a, b) {
  const out = [];
  if (a.length !== b.length) out.push(`行数不等：${a.length} vs ${b.length}`);
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i], y = b[i];
    if (!x || !y) { out.push(`第 ${i} 行缺失`); continue; }
    const fields = new Set([...Object.keys(x), ...Object.keys(y)]);
    for (const f of fields) if (JSON.stringify(x[f]) !== JSON.stringify(y[f])) out.push(`${x.id ?? i}.${f}: ${JSON.stringify(x[f])} ≠ ${JSON.stringify(y[f])}`);
  }
  return out;
}

/**
 * 表集合：`key`=mockDB 缓存键（init 灌入）· `resource`=API 资源名 · `source`=mock 形态语料
 * @type {Array<{key:string, resource:string, source:Array, label:string, min:number}>}
 */
const TABLES = [
  { key: 'todos', resource: 'todos', source: SEED_TODOS, label: '待办（本批补种）', min: 2 },
  { key: 'notices', resource: 'notices', source: MOCK_NOTICES, label: '通知（种子计数曾疑 12 vs 13）', min: 12 },
  { key: 'attendances', resource: 'attendances', source: ATTENDANCE_RECORDS, label: '考勤（本批改 8 月 _ALL_PERSON_IDS）', min: 150 },
  { key: 'inspections', resource: 'inspections', source: INSPECTION_RECORDS, label: '考察（id 跳过 insp-17）', min: 42 },
  { key: 'makeupTasks', resource: 'makeupTasks', source: SEED_MAKEUP_TASKS, label: '补课任务（本批改 attendanceRecordId）', min: 1 },
];

// ── S0 形态：本文件用例必须跑在 api 形态上 ──
test('S0 形态：api 形态 + 有会话 token（前端缓存来自服务端，不是本地静态种子）', () => {
  const mode = getRuntimeMode();
  assert.equal(mode.source, 'api', `本文件必须在 api 形态下跑（实测 ${JSON.stringify(mode)}）`);
  assert.equal(mode.hasToken, true, 'api 形态应存在会话 token');
});

// ── P1 主判据：服务端表 ≡ mock 语料（逐值）——**这一路不受前端 SEED_FALLBACK 影响** ──
test('P1 服务端表 ≡ mock 语料（逐表逐值）：GET 原始行与静态语料完全一致（＝服务端确已按同源播种）', async () => {
  const problems = [];
  for (const t of TABLES) {
    const rows = await serverRows(t.resource);
    const d = diffOf(normalize(rows), normalize(t.source));
    if (d.length) problems.push(`[${t.label}] ${t.resource}：\n      ${d.slice(0, 8).join('\n      ')}`);
    if (rows.length === 0) problems.push(`[${t.label}] ${t.resource}：服务端表为空（＝该表未播种，靠前端回退顶不上）`);
  }
  assert.deepEqual(problems, [],
    `服务端表与 mock 语料不一致（首因：server/seed.js 未按同源播种）：\n  ${problems.join('\n  ')}`);
});

// ── P2 旁证：api 形态缓存读数 ≡ mock 语料读数（两形态「读数」一致）──
test('P2 两形态读数一致：init() 后 mockDB 缓存（api 形态）与 mock 形态语料逐值相同', () => {
  const problems = [];
  for (const t of TABLES) {
    const cached = mockDB[t.key];
    assert.ok(Array.isArray(cached), `init() 后 mockDB.${t.key} 应为数组（适配器组名/键名与 init 拉取对齐）`);
    const d = diffOf(normalize(cached), normalize(t.source));
    if (d.length) problems.push(`[${t.label}] mockDB.${t.key}：\n      ${d.slice(0, 8).join('\n      ')}`);
  }
  assert.deepEqual(problems, [], `两形态读数不一致：\n  ${problems.join('\n  ')}`);
});

// ── P3 非空转：抽取面下限 ＋ 逐表断言为真 ＋ 比较器自检 ──
test('P3 非空转：表集合 ≥5、逐表读数 > 0、比对行数 ≥200，且比较器能判出人为差异', () => {
  assert.ok(TABLES.length >= 5, `表集合只剩 ${TABLES.length} 张（下限 5）`);
  let total = 0;
  for (const t of TABLES) {
    assert.ok(Array.isArray(t.source) && t.source.length > 0, `${t.key}：mock 语料为空（断言会「空 == 空」恒真）`);
    assert.ok(t.source.length >= t.min, `${t.key}：mock 语料 ${t.source.length} 行 < 预期下限 ${t.min}（抽取口径被改坏？）`);
    total += t.source.length;
  }
  assert.ok(total >= 200, `比对行数合计 ${total} < 200（抽取面过小，守卫近乎空转）`);

  // 比较器自检：人为改一处 ⇒ 必须判出差异（防「比较器恒返回空」把 P1/P2 写成恒真）
  const base = normalize(TABLES[0].source);
  const tampered = base.map((r, i) => (i === 0 ? { ...r, title: (r.title || '') + '［改］' } : r));
  assert.ok(diffOf(base, tampered).length > 0, '比较器未能判出人为差异——P1/P2 会恒真，必须修比较口径');
  // 反例：增一行 / 减一行也必须判出
  assert.ok(diffOf(base, base.slice(1)).length > 0, '比较器未判出行数差异');
  assert.ok(diffOf(base, [...base, { id: 'zzz-extra' }]).length > 0, '比较器未判出多行差异');
});
