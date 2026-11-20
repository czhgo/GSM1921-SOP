// role: [工程师]+[AI]
// server/test/todo-derive-instrument-guard.test.mjs — 客户端派生兜底仪表（2026-11-21 批次 589 · B-500-7b-2）
//
// 判据：
//   ① 默认路径（服务端 ok）不得调用 7 类业务 builder：`collectRealtimeGroups` 的 ok 分支以
//      `skipActionKeys: SERVER_OWNED_ACTION_KEYS` 声明，不得直连 builder；
//   ② 兜底计数 `_deriveFallbackCount += 1` 只允许出现一次，且必须在 ok 分支 return 之后（失败 / mock 路径）；
//   ③ 只读仪表 `window.__TODO_DERIVE_FALLBACK__` 必须暴露；7 类对账必须保持全绿（服务端 `UNSUPPORTED_GROUP_KEYS` 为空）；
//   ④ 反例自证：把自增挪到 ok 分支 / 清空 skipActionKeys，判据必须报红。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const SHELL = join(ROOT, 'docs', 'src', 'components', 'record', 'todo-tab-shell.js');
const GROUPS = join(ROOT, 'server', 'routes', 'todo-groups.js');
const SRC = readFileSync(SHELL, 'utf8');

/** 返回判据问题清单（守卫与反例共用同一判据）。 */
export function instrumentProblems(src) {
  const problems = [];
  const okAt = src.indexOf("if (server.status === 'ok')");
  const okReturnAt = src.indexOf('return { groups: _dedupeByGroupKey([...withDisplay', okAt);
  const bumpAt = src.indexOf('_deriveFallbackCount += 1');
  const bumpCount = (src.match(/_deriveFallbackCount \+= 1/g) || []).length;
  if (okAt < 0) problems.push('缺少「服务端 ok」分支');
  if (okReturnAt < 0) problems.push('缺少 ok 分支 return（默认路径应只取服务端组）');
  if (!/skipActionKeys: SERVER_OWNED_ACTION_KEYS/.test(src)) problems.push('ok 分支未声明 skipActionKeys');
  if (bumpCount !== 1) problems.push(`兜底自增出现 ${bumpCount} 次（只允许 1 次）`);
  if (bumpAt < 0 || okReturnAt < 0 || bumpAt < okReturnAt) problems.push('兜底自增不在 ok 分支之后（默认路径被计入）');
  if (!/window\.__TODO_DERIVE_FALLBACK__/.test(src)) problems.push('未暴露 window.__TODO_DERIVE_FALLBACK__');
  return problems;
}

test('① 默认路径不调用 7 类 builder；兜底自增只在失败 / mock 路径', () => {
  assert.deepEqual(instrumentProblems(SRC), [], `派生仪表判据不符：\n  ${instrumentProblems(SRC).join('\n  ')}`);
});

test('② 7 类对账保持全绿：服务端 UNSUPPORTED_GROUP_KEYS 必须为空', () => {
  const server = readFileSync(GROUPS, 'utf8');
  assert.match(server, /const UNSUPPORTED_GROUP_KEYS = \[\s*\];/,
    '服务端仍有未支持的 7 类键：B-500-7b-2 的「7 类对账 8/8」不成立');
});

test('③ 反例自证：把自增挪进 ok 分支 / 去掉 skipActionKeys 必须判红', () => {
  const moved = SRC.replace(
    'const decorated = (server.groups || []).map(_decorateServerGroup);',
    '_deriveFallbackCount += 1;\n    const decorated = (server.groups || []).map(_decorateServerGroup);',
  );
  assert.notEqual(moved, SRC, '反例构造失败：未插入 ok 分支自增');
  assert.ok(instrumentProblems(moved).some((p) => p.includes('兜底自增')), 'ok 分支自增未被判出');

  const noSkip = SRC.replace('skipActionKeys: SERVER_OWNED_ACTION_KEYS', '');
  assert.ok(instrumentProblems(noSkip).some((p) => p.includes('skipActionKeys')), '缺少 skipActionKeys 未被判出');
});
