// role: [工程师]+[AI]
// server/test/audit-write-version-guard.test.mjs — 审计驱动的单行 PATCH 必须带 If-Match（2026-11-18 · 批次 565）
// ════════════════════════════════════════════════════════════════
// 为什么要这层守卫：
//   · 批次 564 给通用资源 PATCH 加了乐观锁：缺 `If-Match` 返回 428、戳不符返回 409
//     （`server/routes/resources/index.js::_assertRowVersion`）。
//   · 审计驱动 `scripts/audit/checks-crud.mjs` 的 C2 往返仍发裸 PATCH ⇒ 每次 `audit-tabs --all`
//     把正常 CRUD 往返记成 P0（实测 23 条：todos 21 / partyGroups 1 / notices 1，全 428）。
//   · 本守卫把「审计脚本内的 PATCH 必须带版本头」钉成静态判据：允许统一助手 `patchRow` 自带
//     `If-Match`；任何不经助手、也不带头的裸调用判红。
// 判据（单一源 = `server/scripts/audit/**/*.mjs` 源码）：
//   V1 审计脚本内每个 `method: 'PATCH'` 字面量所在调用必须自带 `If-Match`（且至少解析到 1 处，防空转）
//   V2 接线：`checks-crud.mjs` 的单行 PATCH 经 `patchRow`，版本头取该行 `updatedAt`、缺省兜底 `*`
//   V3 反例自证：内存源码里的裸 PATCH 必须被判红，带 `If-Match` 的调用 / 经助手的调用判绿
// 运行：`cd server; node --test test/audit-write-version-guard.test.mjs`
// ════════════════════════════════════════════════════════════════
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const AUDIT_DIR = join(ROOT, 'server', 'scripts', 'audit');

/** 递归列出审计驱动源码（只 `.mjs`；排序保证报错信息稳定） */
function auditFiles(dir = AUDIT_DIR) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...auditFiles(full));
    else if (name.endsWith('.mjs')) out.push(full);
  }
  return out;
}

/**
 * 纯函数：返回「被判红」的裸 PATCH 调用清单 `{ index, line, snippet }`。
 * 判据：`method: 'PATCH'` 字面量所在的 `httpRequest(...)` 调用表达式内必须出现 `If-Match`。
 * 找不到包住该字面量的调用（例如改用别的请求函数）同样判红——版本头无从证明。
 * 注释里的说明文字（本文件 / 助手 JSDoc）不算调用：扫描前先剥块注释与行注释。
 */
export function findUnversionedPatchCalls(src) {
  const text = String(src)
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (line, head) => head + ' '.repeat(line.length - head.length));
  const problems = [];
  const re = /method\s*:\s*(['"])patch\1/gi;
  for (const match of text.matchAll(re)) {
    const index = match.index;
    const callStart = text.lastIndexOf('httpRequest(', index);
    let call = null;
    if (callStart !== -1) {
      let depth = 0;
      let end = -1;
      for (let i = callStart + 'httpRequest'.length; i < text.length; i += 1) {
        const ch = text[i];
        if (ch === '(') depth += 1;
        else if (ch === ')') {
          depth -= 1;
          if (depth === 0) { end = i; break; }
        }
      }
      if (end > index) call = text.slice(callStart, end + 1);
    }
    if (!call || !/If-Match/.test(call)) {
      problems.push({
        index,
        line: text.slice(0, index).split('\n').length,
        snippet: (call || text.slice(index, index + 120)).replace(/\s+/g, ' ').slice(0, 160),
      });
    }
  }
  return problems;
}

test('V1 审计脚本的 PATCH 字面量所在调用必须带 If-Match（裸调用判红）', () => {
  const files = auditFiles();
  assert.ok(files.length >= 10, `审计目录只解析到 ${files.length} 个 .mjs（基线 10）：扫描面被写坏`);

  const offenders = [];
  let patchLiterals = 0;
  let versioned = 0;
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    const literalCount = (src.match(/method\s*:\s*(['"])patch\1/gi) || []).length;
    const problems = findUnversionedPatchCalls(src);
    patchLiterals += literalCount;
    versioned += literalCount - problems.length;
    const rel = file.slice(ROOT.length + 1).replace(/\\/g, '/');
    for (const p of problems) offenders.push(`${rel}:${p.line} → ${p.snippet}`);
  }
  assert.deepEqual(offenders, [],
    `以下单行 PATCH 未带 If-Match（批次 564 起服务端返回 428，会把正常往返记成 P0）：\n  ${offenders.join('\n  ')}\n` +
    '  处置：改走 `scripts/audit/checks-crud.mjs::patchRow`（或同形态助手，自带 If-Match）。');
  assert.ok(patchLiterals >= 1, '审计驱动里未解析到任何 PATCH 字面量（助手被删 / 解析口径写坏）：V1 会恒真');
  assert.equal(versioned, patchLiterals, `PATCH 字面量 ${patchLiterals} 处，其中带 If-Match ${versioned} 处`);
});

test('V2 接线：checks-crud 的单行 PATCH 经 patchRow，版本头取该行 updatedAt、缺省兜底 *', () => {
  const src = readFileSync(join(AUDIT_DIR, 'checks-crud.mjs'), 'utf8');
  assert.match(src, /async function patchRow\(/, 'checks-crud.mjs 缺 patchRow 统一助手');
  assert.match(src, /headers: \{ 'If-Match': version \? String\(version\) : '\*' \}/,
    'patchRow 未把行版本写成 If-Match（缺省须兜底 *）');
  assert.match(src, /updatedAt/, 'patchRow 未取该行 updatedAt 作版本');
  assert.match(src, /await patchRow\(ctx, patchPath, recipe\.patch/,
    'C2 往返的 PATCH 调用点未改走 patchRow');
  assert.deepEqual(findUnversionedPatchCalls(src), [], 'checks-crud.mjs 仍残留裸 PATCH 调用');
});

test('V3 反例自证：裸 PATCH 判红，带 If-Match / 经助手的调用判绿', () => {
  const bare = "await httpRequest(base, '/api/v1/todos/1', { method: 'PATCH', token, body });";
  assert.equal(findUnversionedPatchCalls(bare).length, 1, '裸 PATCH 未被判出 ⇒ V1 判据恒真');
  const doubleQuoted = 'await httpRequest(base, path, { method: "PATCH", token, body });';
  assert.equal(findUnversionedPatchCalls(doubleQuoted).length, 1, '双引号形态的裸 PATCH 未被判出');

  const versioned = "await httpRequest(base, path, { method: 'PATCH', token, headers: { 'If-Match': updatedAt } });";
  assert.deepEqual(findUnversionedPatchCalls(versioned), [], '带 If-Match 的调用被误判 ⇒ 判据过严');
  const viaHelper = 'await patchRow(ctx, path, body, { token, updatedAt });';
  assert.deepEqual(findUnversionedPatchCalls(viaHelper), [], '经统一助手的调用被误判 ⇒ 判据过严');
});
