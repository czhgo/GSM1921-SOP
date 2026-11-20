// role: [工程师]+[AI]
// server/test/deputy-policy.test.mjs — 副支书操作权（2026-11-20 批次 579 · 支书裁定）
//
// 判据：
//   ① 角色键 / 同页映射：secretary 与 deputy-secretary 同页；未登记的新 `=== 'secretary'` 判红；
//   ② 三档语义：full 全允许 / standard 全不允许 / custom 逐项；
//   ③ 服务端读参数与通用写口收紧：notices / activities 只收紧 deputy，secretary 不变；
//   ④ 主责不转移：本文件只测操作权，不改任务 / 提醒归属（由既有 secretary-overview 测试覆盖）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import {
  ROLE_KEYS, ROLE_PAGE_MAP, SECRETARY_AND_DEPUTY_ROLES,
} from '../../docs/src/core/domain/constants.js';
import {
  normalizeDeputyPolicy, secretaryActionAllowed, DEPUTY_ACTIONS,
} from '../../docs/src/core/domain/deputy-capability.js';
import {
  deputyPolicyOf, deputyActionAllowed, deputyResourceDeny, requireSecretaryAction,
} from '../routes/resources/deputy-policy.js';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = join(ROOT, 'docs', 'src');

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith('.js')) out.push(full);
  }
  return out;
}

/** 存量基线：文件 → `=== 'secretary'` 命中数（只减不增；新增文件命中即红）。 */
const SECRETARY_LITERAL_BASELINE = Object.freeze({
  'docs/src/core/domain/deputy-capability.js': 1,
  'docs/src/core/domain/constants.js': 1,
  'docs/src/components/governance/org-setup-wizard.js': 1,
  'docs/src/entries/pages/party-committee-meeting-entry.js': 1,
  'docs/src/services/branch/branch.js': 2,
  'docs/src/components/record/inspector.js': 2,
  'docs/src/data/mock/branches.js': 1,
  'docs/src/services/activity/decision-tree.js': 1,
  'docs/src/services/activity/activity.js': 1,
  'docs/src/entries/tabs/secretary/work-map-tab.js': 1,
  'docs/src/entries/tabs/secretary/todo-tab.js': 1,
  'docs/src/entries/tabs/secretary/committee-meeting-tab.js': 1,
  'docs/src/entries/tabs/secretary/assign-tab.js': 2,
  'docs/src/entries/tabs/secretary/feedback-tab.js': 1,
  'docs/src/entries/tabs/leader/write-tab.js': 1,
});

function scanSecretaryLiterals() {
  const out = {};
  for (const file of walk(SRC)) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    const n = (readFileSync(file, 'utf8').match(/===\s*'secretary'/g) || []).length;
    if (n) out[rel] = n;
  }
  return out;
}

test('① 正副职角色键 / 同页映射 / 未登记 secretary 字面量即红', () => {
  assert.ok(ROLE_KEYS.includes('secretary') && ROLE_KEYS.includes('deputy-secretary'), 'ROLE_KEYS 必须同时含正副职');
  assert.deepEqual([...SECRETARY_AND_DEPUTY_ROLES], ['secretary', 'deputy-secretary']);
  assert.equal(ROLE_PAGE_MAP.workspace['secretary'], ROLE_PAGE_MAP.workspace['deputy-secretary'],
    '正副职必须同页');

  const actual = scanSecretaryLiterals();
  const fresh = Object.entries(actual)
    .filter(([file]) => SECRETARY_LITERAL_BASELINE[file] === undefined)
    .map(([file, n]) => `${file}（${n} 处，未登记）`);
  assert.deepEqual(fresh, [], `新增了未登记的 \`=== 'secretary'\`（应改用 SECRETARY_AND_DEPUTY_ROLES 或 deputy-capability）：\n  ${fresh.join('\n  ')}`);

  const grew = Object.entries(actual)
    .filter(([file, n]) => n > (SECRETARY_LITERAL_BASELINE[file] ?? 0))
    .map(([file, n]) => `${file}（${SECRETARY_LITERAL_BASELINE[file]} → ${n}）`);
  assert.deepEqual(grew, [], `secretary 字面量上涨（基线只减不增）：\n  ${grew.join('\n  ')}`);

  const shrank = Object.entries(SECRETARY_LITERAL_BASELINE)
    .filter(([file, n]) => (actual[file] ?? 0) < n)
    .map(([file, n]) => `${file}（${actual[file] ?? 0} < 基线 ${n}）`);
  assert.deepEqual(shrank, [], `secretary 字面量已减少：请同批下调基线（只减不增）：\n  ${shrank.join('\n  ')}`);
});

test('② 三档语义：full / standard / custom 与非法值回落', () => {
  for (const action of DEPUTY_ACTIONS) {
    assert.equal(secretaryActionAllowed({ role: 'secretary', action }), true, `支书恒允许：${action}`);
    assert.equal(secretaryActionAllowed({ role: 'deputy-secretary', action, policy: { mode: 'full' } }), true, `full 允许：${action}`);
    assert.equal(secretaryActionAllowed({ role: 'deputy-secretary', action, policy: { mode: 'standard' } }), false, `standard 拒绝：${action}`);
    assert.equal(secretaryActionAllowed({ role: 'participant', action, policy: { mode: 'full' } }), false, `其他角色恒拒绝：${action}`);
  }
  assert.equal(secretaryActionAllowed({
    role: 'deputy-secretary', action: 'activityEdit',
    policy: { mode: 'custom', allow: { activityEdit: true, branchNotice: false } },
  }), true, 'custom 逐项：开启项允许');
  assert.equal(secretaryActionAllowed({
    role: 'deputy-secretary', action: 'branchNotice',
    policy: { mode: 'custom', allow: { activityEdit: true, branchNotice: false } },
  }), false, 'custom 逐项：关闭项拒绝');
  assert.equal(normalizeDeputyPolicy({ mode: 'bad', allow: { activityEdit: 'yes' } }).mode, 'full', '非法 mode 回落 full');
  assert.equal(normalizeDeputyPolicy(null).mode, 'full', '缺省 full');
});

function fakeDb(branchRow) {
  return {
    prepare: () => ({ get: () => (branchRow ? { data: JSON.stringify(branchRow) } : undefined) }),
  };
}

test('③ 服务端读参数与通用写口：只收紧 deputy，secretary 不变', () => {
  const branch = { id: 'br-b1', config: { policyOverrides: { role: { deputySecretary: { mode: 'standard' } } } } };
  const db = fakeDb(branch);
  assert.equal(deputyPolicyOf(db, 'br-b1').mode, 'standard', '读参数 = standard');
  assert.equal(deputyActionAllowed(db, { role: 'secretary', branchId: 'br-b1' }, 'activityEdit'), true, 'secretary 不受参数影响');
  assert.equal(deputyActionAllowed(db, { role: 'deputy-secretary', branchId: 'br-b1' }, 'activityEdit'), false, 'deputy standard 被拒');

  const denyActivity = deputyResourceDeny(db, { role: 'deputy-secretary', branchId: 'br-b1' }, 'activities', 'patch', {});
  assert.match(denyActivity || '', /主责在支书/, '活动编辑应返回主责提示');
  const denyNotice = deputyResourceDeny(db, { role: 'deputy-secretary', branchId: 'br-b1' }, 'notices', 'post', { audience: ['all'] });
  assert.match(denyNotice || '', /主责在支书/, '全支部通知应返回主责提示');
  assert.equal(deputyResourceDeny(db, { role: 'deputy-secretary', branchId: 'br-b1' }, 'notices', 'post', { targetType: 'activity', targetId: 'act-1' }), null,
    '本场活动通知不受 branchNotice 参数限制');
  assert.equal(deputyResourceDeny(db, { role: 'secretary', branchId: 'br-b1' }, 'activities', 'patch', {}), null, 'secretary 不受影响');

  const mw = requireSecretaryAction(db, 'rosterStage');
  const run = (actor) => new Promise((resolve) => {
    const res = { code: 0, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
    mw({ actor }, res, () => resolve({ next: true, code: 0 }));
    setTimeout(() => resolve({ next: false, code: res.code, body: res.body }), 0);
  });
  return (async () => {
    assert.equal((await run({ role: 'secretary', branchId: 'br-b1' })).next, true, 'secretary 中间件放行');
    assert.equal((await run({ role: 'deputy-secretary', branchId: 'br-b1' })).code, 403, 'deputy standard 中间件 403');
    assert.equal((await run({ role: 'org-commissioner', branchId: 'br-b1' })).code, 403, '其他角色 403');
  })();
});
