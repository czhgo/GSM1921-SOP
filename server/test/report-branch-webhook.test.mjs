import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initDb } from '../db.js';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
import * as reporting from '../services/reporting.js';

test('定时上报逐支部使用独立接收端，payload 只含该支部数据', async () => {
  assert.equal(typeof reporting.pushConfiguredBranchReports, 'function', '应提供逐支部推送入口');
  const db = initDb(':memory:');
  const previousConfig = process.env.REPORT_WEBHOOKS_JSON;
  const previousGlobalUrl = process.env.REPORT_WEBHOOK_URL;
  const previousGlobalToken = process.env.REPORT_TOKEN;
  const originalFetch = globalThis.fetch;
  const requests = [];
  try {
    process.env.REPORT_WEBHOOKS_JSON = JSON.stringify({
      'br-one': { url: 'https://one.example.test/report', token: 'one-secret' },
      'br-two': { url: 'https://two.example.test/report', token: 'two-secret' },
    });
    delete process.env.REPORT_WEBHOOK_URL;
    delete process.env.REPORT_TOKEN;
    db.prepare('INSERT INTO branches (id, data) VALUES (?, ?)').run('br-one', JSON.stringify({ id: 'br-one', status: 'active' }));
    db.prepare('INSERT INTO branches (id, data) VALUES (?, ?)').run('br-two', JSON.stringify({ id: 'br-two', status: 'active' }));
    db.prepare('INSERT INTO users (id, data) VALUES (?, ?)').run('p-one', JSON.stringify({ id: 'p-one', name: '一支部成员', studentId: '1', partyGroup: '一组', role: 'participant', branchId: 'br-one' }));
    db.prepare('INSERT INTO users (id, data) VALUES (?, ?)').run('p-two', JSON.stringify({ id: 'p-two', name: '二支部成员', studentId: '2', partyGroup: '二组', role: 'participant', branchId: 'br-two' }));
    db.prepare('INSERT INTO activities (id, data) VALUES (?, ?)').run('act-one', JSON.stringify({ id: 'act-one', title: '一支部活动', type: '主题党日', date: '2026-10-01', status: 'completed', branchId: 'br-one' }));
    db.prepare('INSERT INTO activities (id, data) VALUES (?, ?)').run('act-two', JSON.stringify({ id: 'act-two', title: '二支部活动', type: '主题党日', date: '2026-10-02', status: 'completed', branchId: 'br-two' }));
    globalThis.fetch = async (url, options) => {
      requests.push({ url: String(url), headers: options.headers, payload: JSON.parse(options.body) });
      return new Response(null, { status: 204 });
    };

    const results = await reporting.pushConfiguredBranchReports(db, { from: '2026-10-01', to: '2026-10-31' });
    assert.deepEqual(results.map((item) => item.branchId).sort(), ['br-one', 'br-two']);
    assert.equal(requests.length, 2);
    const one = requests.find((request) => request.url.includes('one.example.test'));
    const two = requests.find((request) => request.url.includes('two.example.test'));
    assert.equal(one.headers.Authorization, 'Bearer one-secret');
    assert.equal(two.headers.Authorization, 'Bearer two-secret');
    assert.deepEqual(one.payload.domains.member.map((row) => row.name), ['一支部成员']);
    assert.deepEqual(two.payload.domains.member.map((row) => row.name), ['二支部成员']);
    assert.deepEqual(one.payload.domains.activity.map((row) => row.id), ['act-one']);
    assert.deepEqual(two.payload.domains.activity.map((row) => row.id), ['act-two']);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousConfig === undefined) delete process.env.REPORT_WEBHOOKS_JSON;
    else process.env.REPORT_WEBHOOKS_JSON = previousConfig;
    if (previousGlobalUrl === undefined) delete process.env.REPORT_WEBHOOK_URL;
    else process.env.REPORT_WEBHOOK_URL = previousGlobalUrl;
    if (previousGlobalToken === undefined) delete process.env.REPORT_TOKEN;
    else process.env.REPORT_TOKEN = previousGlobalToken;
    db.close();
  }
});

test('党委手动触发必须选择一个支部，并投递到该支部专属接收端', async () => {
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  const server = app.listen(0);
  const previousConfig = process.env.REPORT_WEBHOOKS_JSON;
  const previousGlobalUrl = process.env.REPORT_WEBHOOK_URL;
  const previousGlobalToken = process.env.REPORT_TOKEN;
  const originalFetch = globalThis.fetch;
  let outbound = null;
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const login = await fetch(`${base}/api/v1/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId: 'p_pc', password: '123456' }),
    });
    assert.equal(login.status, 200);
    const token = (await login.json()).token;
    process.env.REPORT_WEBHOOKS_JSON = JSON.stringify({ 'br-b1': { url: 'https://branch-one.example.test/report', token: 'branch-one-token' } });
    delete process.env.REPORT_WEBHOOK_URL;
    delete process.env.REPORT_TOKEN;
    globalThis.fetch = async (url, options) => {
      if (String(url).startsWith(base)) return originalFetch(url, options);
      outbound = { url: String(url), headers: options.headers, payload: JSON.parse(options.body) };
      return new Response(null, { status: 204 });
    };

    const headers = { Authorization: `Bearer ${token}` };
    const missingBranch = await fetch(`${base}/api/v1/report/trigger`, { method: 'POST', headers });
    assert.equal(missingBranch.status, 400);
    const selected = await fetch(`${base}/api/v1/report/trigger?branchId=br-b1&from=2026-10-01&to=2026-10-31`, {
      method: 'POST', headers,
    });
    assert.equal(selected.status, 200);
    assert.equal(outbound.url, 'https://branch-one.example.test/report');
    assert.equal(outbound.headers.Authorization, 'Bearer branch-one-token');
    assert.ok(outbound.payload.domains.member.every((row) => !row.branchId || row.branchId === 'br-b1'));
    assert.ok(outbound.payload.domains.activity.every((row) => !row.branchId || row.branchId === 'br-b1'));
  } finally {
    globalThis.fetch = originalFetch;
    if (previousConfig === undefined) delete process.env.REPORT_WEBHOOKS_JSON;
    else process.env.REPORT_WEBHOOKS_JSON = previousConfig;
    if (previousGlobalUrl === undefined) delete process.env.REPORT_WEBHOOK_URL;
    else process.env.REPORT_WEBHOOK_URL = previousGlobalUrl;
    if (previousGlobalToken === undefined) delete process.env.REPORT_TOKEN;
    else process.env.REPORT_TOKEN = previousGlobalToken;
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
});
