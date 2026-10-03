// ════════════════════════════════════════════════════════════════
//  server/test/activity-block-gate.test.mjs —— **运行时面：支部停用某块 ⇒ 服务端硬执行**（2026-09-29 批次 274 新增）
//
//  验契约 §8.1（`D-685` / `D-679`）三步：ⓐ 场景→块 映射**从单一源派生**（同名，唯一别名 `theme-party-day`）
//  ⓑ 活动 **POST** 与 **PATCH（改类型/场景时）** 两处断言 ⇒ 命中「该支部停用该块」⇒ **403 ＋ 可懂原因**
//  ⓒ **默认零影响**（支部未设 `hiddenBlockIds` ⇒ 全块启用 ⇒ 既有行为一字不变）
//
//  G1 默认零影响：未停用 ⇒ POST 活动 **201**
//  G2 显式停用 ⇒ POST 该场景 **403**，且**原因可懂**（含场景名与「已停用」字样，**不是**通用的活动写门文案）
//  G3 停用是**按块**的：同一支部的另一场景**不受影响** ⇒ 201
//  G4 **PATCH 改类型**进入已停用块 ⇒ **403**（口径明列的第二个调用点）
//  G5 **别名生效**：停用 `theme-party-day` ⇒ 场景 `theme-party`（主题党日）被拒（验证 `BLOCK_ID_ALIASES` 被运行时门读到）
//  G6 **反例锁死**：`hiddenBlockIds = []` ⇒ 恢复 201（证明判据不是「有 config 就拒」的恒真件）
// ════════════════════════════════════════════════════════════════
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIO_WRITE_IDS, SCENARIO_LABELS, BRANCH_COMMISSION_ROLES } from '../../docs/src/core/domain/constants.js?v=20261003e';
const { createApp } = await import('../app.js');
const { seedBaseline } = await import('../seed-baseline.js');

let server, BASE, db, token;
// 三会一课四子会 id 与各自中文名（**从单一源实读**，不手写）
const SUB_IDS = SCENARIO_WRITE_IDS['three-meetings'];
const A_ID = SUB_IDS[0], A_LABEL = SCENARIO_LABELS[A_ID];
const B_ID = SUB_IDS[1], B_LABEL = SCENARIO_LABELS[B_ID];
const PARTY_LABEL = SCENARIO_LABELS['theme-party'];   // 主题党日（别名块 theme-party-day）

const api = async (method, path, { body, tok } = {}) => {
  const r = await fetch(BASE + path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...((tok || token) ? { Authorization: `Bearer ${tok || token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json = null; try { json = JSON.parse(text); } catch { /* 非 JSON */ }
  return { status: r.status, json, text };
};

/** 直接改库里的支部配置（本测试要验的是**运行时门**，不是配置写入链） */
function setHiddenBlocks(ids) {
  const row = db.prepare('SELECT data FROM branches WHERE id = ?').get('br-b1');
  const b = JSON.parse(row.data);
  b.config = b.config || {};
  b.config.blocks = b.config.blocks || {};
  b.config.blocks.workflowBlocks = ids === null ? undefined : { hiddenBlockIds: ids };
  db.prepare('UPDATE branches SET data = ? WHERE id = ?').run(JSON.stringify(b), 'br-b1');
}

/** 造一条最小活动（字段够写门判定即可） */
let seq = 0;
const postActivity = (type) => api('POST', '/api/v1/activities', { body: {
  id: `act-blockgate-${++seq}`, name: `运行时面测试 ${seq}`, type, date: '2026-09-28',
} });

before(async () => {
  process.env.IAAA_MOCK = '1';
  const app = createApp(':memory:');
  db = app.locals.db;
  seedBaseline(db);
  // 一名支委层账号（活动写门要求支委层或组长；角色集**从单一源实读**，不手写）
  const role = BRANCH_COMMISSION_ROLES[0];
  db.prepare('INSERT OR REPLACE INTO users (id, data) VALUES (?, ?)').run('u-gate', JSON.stringify(
    { id: 'u-gate', name: '测试支委', studentId: 'gate-001', role, branchId: 'br-b1' }));
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  BASE = `http://127.0.0.1:${server.address().port}`;
  token = (await api('POST', '/api/v1/auth/login', { body: { personId: 'u-gate', password: process.env.LOGIN_PASSWORD || '123456' } })).json?.token;
  assert.ok(token, '测试支委应能登录');
});
after(() => server && server.close());

test('G1 默认零影响：支部未配置停用 ⇒ 活动照常可写（201）', async () => {
  setHiddenBlocks(null);                       // 清掉停用配置
  const r = await postActivity(A_LABEL);
  assert.equal(r.status, 201, `默认应放行，实测 ${r.status} ${r.text.slice(0, 160)}`);
});

test(`G2 停用「${SCENARIO_LABELS[SUB_IDS[0]]}」块 ⇒ 直连 API 写入被拒（403 ＋ 可懂原因）`, async () => {
  setHiddenBlocks([A_ID]);
  const r = await postActivity(A_LABEL);
  assert.equal(r.status, 403, `停用后应 403，实测 ${r.status} ${r.text.slice(0, 160)}`);
  assert.match(r.json.error, /停用/, '原因应说明「被停用」');
  assert.ok(r.json.error.includes(A_LABEL), `原因应点名场景「${A_LABEL}」，实测：${r.json.error}`);
  assert.ok(!/仅限支委层/.test(r.json.error), '不应复用通用活动写门文案（那会让人误以为是权限问题）');
});

test('G3 停用是**按块**的：同一支部其它场景不受影响', async () => {
  setHiddenBlocks([A_ID]);                     // 只停 A
  const r = await postActivity(B_LABEL);
  assert.equal(r.status, 201, `未停用的场景应放行，实测 ${r.status} ${r.text.slice(0, 160)}`);
});

test('G4 PATCH 把活动**改成**已停用块的场景 ⇒ 403（口径明列的第二处）', async () => {
  setHiddenBlocks([A_ID]);
  const created = await postActivity(B_LABEL);               // 先以未停用场景建
  assert.equal(created.status, 201);
  const id = created.json.id;
  const r = await api('PATCH', `/api/v1/activities/${id}`, { body: { type: A_LABEL } });
  assert.equal(r.status, 403, `改成停用场景应 403，实测 ${r.status} ${r.text.slice(0, 160)}`);
  assert.match(r.json.error, /停用/);
});

test('G5 别名生效：停用块 id `theme-party-day` ⇒ 场景「主题党日」被拒', async () => {
  setHiddenBlocks(['theme-party-day']);        // ⚠ 块 id ≠ 场景 id（别名表来自 manifests.js 单一源）
  const r = await postActivity(PARTY_LABEL);
  assert.equal(r.status, 403, `别名块停用后应 403，实测 ${r.status} ${r.text.slice(0, 160)}——`
    + '若放行，说明运行时门没读到 BLOCK_ID_ALIASES（守卫认、运行时不认）');
});

test('G6 反例锁死：hiddenBlockIds 为空数组 ⇒ 恢复可写（判据非恒真）', async () => {
  setHiddenBlocks([]);
  const r = await postActivity(A_LABEL);
  assert.equal(r.status, 201, `空停用清单应放行，实测 ${r.status} ${r.text.slice(0, 160)}`);
});
