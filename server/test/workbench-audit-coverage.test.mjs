// role: [工程师]+[AI]
// 工作台审阅覆盖率守卫（2026-10-18 脏专项）
// 目的：结构索引不能替代审阅；67 个角色页签必须都有审阅记录、结论与证据。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const LEDGER = join(ROOT, '.ctx', 'WORKBENCH_67_TAB_AUDIT_DRAFT.md');
const text = readFileSync(LEDGER, 'utf8');

function count(pattern) {
  return (text.match(pattern) || []).length;
}

function recordCount(role) {
  const escaped = role.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const bold = new RegExp(`角色与页签\\*\\*：${escaped} · `, 'g');
  const plain = new RegExp(`角色与页签：${escaped} · `, 'g');
  return count(bold) + count(plain);
}

test('脏专项覆盖率：七个工作台角色页签数量与 67 口径一致', () => {
  assert.equal(recordCount('支书/副支书'), 12, '支书/副支书应有 12 条审阅记录');
  assert.equal(recordCount('组织委员'), 11, '组织委员应有 11 条审阅记录');
  assert.equal(recordCount('宣传委员'), 9, '宣传委员应有 9 条审阅记录');
  assert.equal(recordCount('纪检委员'), 9, '纪检委员应有 9 条审阅记录');
  assert.equal(recordCount('党小组组长'), 10, '党小组组长应有 10 条审阅记录');
  assert.equal(recordCount('普通成员'), 11, '普通成员应有 11 条审阅记录');
  assert.equal(count(/角色与页签\*\*：党委组织员 \/ /g), 5, '党委组织员应有 5 条审阅记录');
});

test('脏专项覆盖率：每条记录都有结论与证据', () => {
  assert.ok(count(/\*\*结论\*\*/g) + count(/结论：/g) >= 67, '结论条目不少于 67');
  assert.ok(count(/\*\*证据\*\*/g) + count(/证据：/g) >= 67, '证据条目不少于 67');
  assert.match(text, /合格/, '结论口径包含合格');
  assert.match(text, /需修/, '结论口径包含需修');
  assert.match(text, /阻塞/, '结论口径包含阻塞');
});

test('脏专项覆盖率：覆盖状态表列出七个工作台与 67 总数', () => {
  for (const role of ['支书', '组织委员', '宣传委员', '纪检委员', '党小组组长', '普通成员', '党委组织员']) {
    assert.ok(text.includes(`| ${role} |`), `覆盖状态表应包含 ${role}`);
  }
  assert.match(text, /12 \| 已深审/, '支书 12 已深审');
  assert.match(text, /11 \| 已深审/, '组织/成员 11 已深审');
  assert.match(text, /9 \| 已深审/, '宣传/纪检 9 已深审');
  assert.match(text, /10 \| 已深审/, '组长 10 已深审');
  assert.match(text, /5 \| 已深审/, '党委 5 已深审');
});
