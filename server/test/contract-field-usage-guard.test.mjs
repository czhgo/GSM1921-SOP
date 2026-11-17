// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/contract-field-usage-guard.test.mjs — 前端字段读取 ≡ 数据契约（批次 562 · Task 4）
// ════════════════════════════════════════════════════════════════
// 为什么：2026-11-17 审计发现两类真实漂移 —— `taskforce.startDate` / `todos.assigneeId`
//   在契约里**根本不存在**，前端读到的恒是 `undefined`（专班周期显示「? ~ ?」、人员引用守卫漏判）。
// 判据：① 契约登记字段与枚举必须与写口实写值同源；② 已修的漂移读取不得回潮。
// 只做静态断言：不启服务、不读真实库。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENTITY_BY_NAME } from '../data/domain-contract.mjs';

const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SRC_DIR = join(REPO_ROOT, 'docs', 'src');

/** 某实体在契约里登记的全部字段（fields ∪ required ∪ optional ∪ enums 键） */
function contractFieldsOf(entity) {
  const entry = ENTITY_BY_NAME[entity];
  assert.ok(entry, `契约缺少实体 ${entity}`);
  return new Set([
    ...(entry.fields || []), ...(entry.required || []), ...(entry.optional || []), ...Object.keys(entry.enums || {}),
  ]);
}

/** 递归列出 docs/src 下的 .js 源文件 */
function listSourceFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) out.push(...listSourceFiles(abs));
    else if (entry.endsWith('.js')) out.push(abs);
  }
  return out;
}

/** 在所有前端源文件里找正则命中，返回 `file:line` 清单 */
function findInSources(pattern) {
  const hits = [];
  for (const file of listSourceFiles(SRC_DIR)) {
    const text = readFileSync(file, 'utf8');
    const rel = relative(REPO_ROOT, file).replace(/\\/g, '/');
    for (const match of text.matchAll(pattern)) {
      hits.push(`${rel}:${text.slice(0, match.index).split('\n').length}`);
    }
  }
  return hits;
}

test('契约字段：本守卫覆盖的实体都有字段清单', () => {
  for (const entity of ['taskforces', 'todos', 'activities', 'branches', 'workgroupMembers', 'users']) {
    assert.ok(contractFieldsOf(entity).size > 0, `${entity} 未登记任何字段`);
  }
});

test('契约字段：已修漂移不得回退', () => {
  // taskforces 只有 deadline / createdAt；startDate / endDate 是曾经的幽灵字段
  const taskforce = contractFieldsOf('taskforces');
  assert.ok(taskforce.has('deadline') && taskforce.has('createdAt'));
  assert.ok(!taskforce.has('startDate') && !taskforce.has('endDate'), 'taskforces 不得登记 startDate / endDate');
  // todos 到人字段是 personId；assigneeId 属 assignments / workgroupTasks 域
  const todos = contractFieldsOf('todos');
  assert.ok(todos.has('personId'));
  assert.ok(!todos.has('assigneeId'), 'todos 不得登记 assigneeId（人员字段是 personId）');
});

test('契约枚举：与写口实写同源', () => {
  const branch = ENTITY_BY_NAME.branches;
  assert.ok(branch.enums.status.includes('inactive'), 'branches.status 必须含 inactive（写口实写值）');
  const member = ENTITY_BY_NAME.workgroupMembers;
  assert.ok(member.enums.status.includes('removed'), 'workgroupMembers.status 必须含 removed（写口实写值）');
});

test('前端不得读取契约外字段：专班周期漂移', () => {
  const hits = findInSources(/\.(startDate|endDate)\b/g);
  assert.deepEqual(hits, [], `专班日期字段应为 deadline / createdAt：\n${hits.join('\n')}`);
});

test('人员引用守卫：todos 行必须登记 personId，不得登记 assigneeId', () => {
  const source = readFileSync(join(SRC_DIR, 'services', 'member', 'person.js'), 'utf8');
  const row = source.split('\n').find((line) => line.includes("['todos'"));
  assert.ok(row, 'person.js 未登记 todos 引用行');
  assert.ok(row.includes('personId'), 'todos 引用字段必须是 personId');
  assert.ok(!row.includes('assigneeId'), 'todos 引用字段不得是 assigneeId');
});

test('成员变更确认：时间读取兼容 createdAt / at 双字段', () => {
  const source = readFileSync(join(SRC_DIR, 'components', 'governance', 'member-change-panel.js'), 'utf8');
  assert.ok(/createdAt\s*\?\?\s*r?\.?at/.test(source), '读时间必须 `createdAt ?? at`，兼容历史行');
});
