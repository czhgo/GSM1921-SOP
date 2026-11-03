// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/write-policy-matrix.test.mjs —— 写入口权限矩阵守卫
//
//  为什么是「完全相等」：
//   · 审计 C1 改成查矩阵后，矩阵一旦漏登记写口，页面越权就会被静默放过；
//     反之矩阵多写一行，也会让审计对不存在的端点报 pass。两种都必须判红。
//   · 因此本守卫以 **Express 运行期路由表** 为真值，与 `WRITE_POLICY_MATRIX` 的
//     method+path 集合做双向相等断言；不手写第二份路由清单。
//
//  纯 node：只 `createApp({ dbPath: ':memory:' })` 读路由栈，不连 3000、不发请求。
// ════════════════════════════════════════════════════════════════

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import {
  WRITE_POLICY_MATRIX,
  WRITE_POLICY_STATUSES,
  matrixFor,
} from '../security/write-policy-matrix.mjs';

const WRITE_METHODS = new Set(['post', 'patch', 'delete', 'put']);
const ROUTE_KEYS = new Set();
let app;

/** Express 4 router 挂载前缀：`^\/api\/v1\/?(?=\/|$)` → `/api/v1` */
function prefixOf(layer) {
  const source = layer.regexp?.source || '';
  const matched = /^\^(.*?)\\\/\?\(\?=\\\/\|\$\)$/.exec(source);
  if (!matched) return null;
  return matched[1].replace(/\\\//g, '/') || '';
}

/** 递归遍历 router stack，收集全部写路由（含参数路径） */
function collectWriteRoutes(stack, prefix = '', out = []) {
  for (const layer of stack) {
    if (layer.route) {
      const path = `${prefix}${layer.route.path === '/' ? '' : layer.route.path}`;
      for (const [method, enabled] of Object.entries(layer.route.methods)) {
        if (enabled && WRITE_METHODS.has(method)) out.push(`${method.toUpperCase()} ${path}`);
      }
      continue;
    }
    const subStack = Array.isArray(layer.handle?.stack) ? layer.handle.stack : null;
    if (!subStack) continue;
    const subPrefix = prefixOf(layer);
    assert.notEqual(subPrefix, null, `无法解析 router 挂载前缀：${layer.name} ${layer.regexp?.source}`);
    collectWriteRoutes(subStack, prefix + subPrefix, out);
  }
  return out;
}

/** 路由集合比较：返回未登记（missing）与矩阵多余（extra）两组键 */
function compareRouteSets(actualKeys, matrixKeys) {
  const actual = new Set(actualKeys);
  const matrix = new Set(matrixKeys);
  return {
    missing: [...actual].filter((key) => !matrix.has(key)).sort(),
    extra: [...matrix].filter((key) => !actual.has(key)).sort(),
  };
}

function keyOf(row) {
  return `${String(row.method).toUpperCase()} ${row.path}`;
}

before(() => {
  app = createApp({ dbPath: ':memory:' });
  const routes = collectWriteRoutes(app._router.stack);
  for (const key of routes) ROUTE_KEYS.add(key);
});

after(() => {
  try { app?.locals?.db?.close(); } catch (_) { /* 内存库关闭失败不影响断言 */ }
});

test('矩阵与 Express 运行期写路由完全相等（不漏登记、不多登记）', () => {
  const matrixKeys = WRITE_POLICY_MATRIX.map(keyOf);
  const diff = compareRouteSets([...ROUTE_KEYS], matrixKeys);
  assert.deepEqual(
    diff,
    { missing: [], extra: [] },
    `写入口权限矩阵与路由表不一致：未登记=${diff.missing.join(', ') || '无'}；矩阵多余=${diff.extra.join(', ') || '无'}`,
  );
  // 同一 method+path 只允许一行（否则 matrixFor 命中结果取决于数组顺序）
  assert.equal(new Set(matrixKeys).size, matrixKeys.length, '矩阵存在重复的 method+path 行');
});

test('每行字段齐全、status 合法；known-risk 必须带 reason / impact / riskRef', () => {
  const required = ['method', 'path', 'resource', 'middleware', 'roleGate', 'ownership', 'fieldLocks', 'evidence', 'status'];
  for (const row of WRITE_POLICY_MATRIX) {
    for (const field of required) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(row, field) && row[field] !== undefined && row[field] !== null && row[field] !== '',
        `${keyOf(row)} 缺字段 ${field}`,
      );
    }
    assert.ok(WRITE_METHODS.has(String(row.method).toLowerCase()), `${keyOf(row)} 的 method 不是写方法`);
    assert.ok(String(row.path).startsWith('/api/'), `${keyOf(row)} 的 path 不是 /api/ 前缀`);
    assert.ok(WRITE_POLICY_STATUSES.includes(row.status), `${keyOf(row)} 的 status 非法：${row.status}`);
    assert.ok(Array.isArray(row.fieldLocks), `${keyOf(row)} 的 fieldLocks 必须是数组`);
    assert.equal(typeof row.middleware, 'string');
    assert.equal(typeof row.roleGate, 'string');
    assert.equal(typeof row.evidence, 'string');
    if (row.status === 'known-risk') {
      assert.ok(row.reason, `${keyOf(row)} 为 known-risk 但缺 reason`);
      assert.ok(row.impact, `${keyOf(row)} 为 known-risk 但缺 impact`);
      assert.ok(row.riskRef, `${keyOf(row)} 为 known-risk 但缺 riskRef`);
    }
  }
});

test('matrixFor 精确命中；未知写口返回 undefined', () => {
  for (const row of WRITE_POLICY_MATRIX) {
    const hit = matrixFor(row.method.toLowerCase(), row.path);
    assert.equal(hit, row, `${keyOf(row)} 未被 matrixFor 精确命中`);
  }
  assert.equal(matrixFor('POST', '/api/v1/__not_registered__'), undefined);
  assert.equal(matrixFor('GET', '/api/v1/todos'), undefined, '读口不应命中写口矩阵');
});

test('反例自证：未登记路由 / 删除矩阵行都会判红（不改生产代码）', () => {
  const matrixKeys = WRITE_POLICY_MATRIX.map(keyOf);

  // ① 临时构造一个未登记写路由 ⇒ missing 必须命中
  const fabricatedActual = [...ROUTE_KEYS, 'POST /api/v1/__unregistered_write__'];
  const missingDiff = compareRouteSets(fabricatedActual, matrixKeys);
  assert.deepEqual(missingDiff.missing, ['POST /api/v1/__unregistered_write__']);
  assert.deepEqual(missingDiff.extra, []);

  // ② 临时从矩阵克隆中删掉一行 ⇒ 该行会落到 missing（只改克隆，不改生产矩阵）
  const removed = WRITE_POLICY_MATRIX[0];
  const clonedMatrix = matrixKeys.filter((key) => key !== keyOf(removed));
  const deletedDiff = compareRouteSets([...ROUTE_KEYS], clonedMatrix);
  assert.deepEqual(deletedDiff.missing, [keyOf(removed)]);
  assert.deepEqual(deletedDiff.extra, []);
});
