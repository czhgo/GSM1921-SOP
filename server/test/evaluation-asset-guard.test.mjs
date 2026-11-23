// role: [工程师]+[AI]
// server/test/evaluation-asset-guard.test.mjs — 评分即资产（2026-11-20 批次 584）
//
// 判据（`CLAUDE.md H80` 第 6 条、`ENGINEERING_ASSESSMENT §5.2` 评价资产索引）：
//   ① `EA §二` 的 2.1–2.6 每节必须含「下一改进项」，且带可验收落点（路径或 `B-` / `L-` / `Q-` 台账 ID）；
//   ② `EA §5.2` 必须有「评价资产索引」表，且六维各占一行（防止只写结论、不留资产）；
//   ③ `CLAUDE.md H20.5` 合并门槛必须两段（本机门 / 外部门），不得退回单一门槛；
//   ④ 反例自证：删掉任一节的改进项指针，①必须判红。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DAILY_FILE_BUDGET, GUARDS_FILE_BUDGET, GUARDS_TEST_BUDGET } from '../test-tier-registry.mjs';

const ROOT = join(import.meta.dirname, '..', '..');
const EA = readFileSync(join(ROOT, '.ctx', 'ENGINEERING_ASSESSMENT.md'), 'utf8');
const CLAUDE = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8');
const DIMENSIONS = ['2.1', '2.2', '2.3', '2.4', '2.5', '2.6'];

/** 取 §二 中某个维度的小节正文（到下一个 `### ` 或 `## ` 为止）。 */
export function sectionOf(md, dim) {
  const start = md.search(new RegExp(`^### ${dim.replace('.', '\\.')} `, 'm'));
  if (start < 0) return '';
  const rest = md.slice(start + 4);
  const next = rest.search(/^##+ /m);
  return next < 0 ? rest : rest.slice(0, next);
}

/** 返回缺少「下一改进项」或缺少可验收落点的维度列表。 */
export function missingPointers(md) {
  const missing = [];
  for (const dim of DIMENSIONS) {
    const body = sectionOf(md, dim);
    if (!body.includes('下一改进项')) { missing.push(dim); continue; }
    const tail = body.slice(body.indexOf('下一改进项'));
    const hasLanding = /`[^`]*\/[^`]*`|`(?:B|L|Q)-[0-9][^`]*`|`D-\d+`/.test(tail);
    if (!hasLanding) missing.push(dim);
  }
  return missing;
}

test('① §二 2.1–2.6 每节都有「下一改进项」并带可验收落点', () => {
  assert.deepEqual(missingPointers(EA), [],
    `缺「下一改进项」（须带路径或 B-/L-/Q- 台账 ID）：${missingPointers(EA).join(' / ')}`);
});

test('② §5.2 评价资产索引覆盖六维', () => {
  assert.match(EA, /评价资产索引/, '§5.2 必须保留「评价资产索引」表');
  const start = EA.indexOf('评价资产索引');
  const table = EA.slice(start, EA.indexOf('### 5.3', start));
  const rows = table.split('\n').filter((line) => line.startsWith('|') && !/^\|\s*(维度|---)/.test(line));
  assert.ok(rows.length >= 6, `评价资产索引至少 6 行（六维），当前 ${rows.length} 行`);
  for (const name of ['业务与数据', '安全与权限', '最小三成本', '测试与发布', '架构与可维护性', '运行、部署']) {
    assert.ok(table.includes(name), `评价资产索引缺维度行：${name}`);
  }
});

test('③ CLAUDE H20.5 合并门槛为两段（本机门 / 外部门）', () => {
  const start = CLAUDE.indexOf('### H20.5');
  const body = CLAUDE.slice(start, CLAUDE.indexOf('## H21', start));
  assert.match(body, /本机门/, 'H20.5 必须保留「本机门」');
  assert.match(body, /外部门/, 'H20.5 必须保留「外部门」');
});

test('③b H80-6 要求 commit body 写「资产命中」（批次 589 机检）', () => {
  const start = CLAUDE.indexOf('## H80');
  const body = CLAUDE.slice(start, CLAUDE.indexOf('# 冷层', start));
  assert.match(body, /资产命中/, 'H80-6 必须写明 commit body 的「资产命中：」要求');
  assert.match(body, /check-batch-commits/, 'H80-6 必须指向 check-batch-commits 机检');
});

test('④ 反例自证：删掉 2.4 的改进项指针，①必须判红', () => {
  const broken = EA.replace(/(### 2\.4[^\n]*\n(?:.|\n)*?)\*\*下一改进项\*\*[^\n]*\n/, '$1');
  assert.notEqual(broken, EA, '反例构造失败：未删除 2.4 的改进项行');
  assert.ok(missingPointers(broken).includes('2.4'), '删掉指针后 must 判红 2.4');
});

/**
 * ⑤ EA 的测试读数必须等于 `test-tier-registry.mjs` 的登记值。
 * 病灶（批次 603 实见）：§2.5 / §5.2 写 guards 129 文件 / 902 断言，registry 实为 81 / 898；
 *   守卫 ⑫ 只校六维元组，测试读数漂移完全没被拦住 ⇒ 「评分即资产」的证据链自己先失真。
 * 判据：EA 中每一处 `guards **N 文件 / M 断言**` 的 N / M，与每一处 `daily **N 文件` 的 N，
 *   必须等于 registry 常量；§2.5 与 §5.2 至少各出现一次（防只改一处）。
 * 反例自证：喂入 129 / 902 的假文本，必须报出 mismatch。
 */
export function readingMismatches(md, expect = {
  dailyFiles: DAILY_FILE_BUDGET,
  guardsFiles: GUARDS_FILE_BUDGET,
  guardsTests: GUARDS_TEST_BUDGET,
}) {
  const out = [];
  const daily = [...md.matchAll(/daily \*\*(\d+) 文件/g)].map((m) => Number(m[1]));
  const guards = [...md.matchAll(/guards \*\*(\d+) 文件 \/ (\d+) 断言\*\*/g)]
    .map((m) => [Number(m[1]), Number(m[2])]);
  if (!daily.length) out.push('EA 缺 `daily **N 文件` 读数');
  if (guards.length < 2) out.push(`EA 的 guards 读数只出现 ${guards.length} 处（要求 §2.5 与 §5.2 各一处）`);
  for (const n of daily) if (n !== expect.dailyFiles) out.push(`daily 文件 ${n} ≠ registry ${expect.dailyFiles}`);
  for (const [n, m] of guards) {
    if (n !== expect.guardsFiles) out.push(`guards 文件 ${n} ≠ registry ${expect.guardsFiles}`);
    if (m !== expect.guardsTests) out.push(`guards 断言 ${m} ≠ registry ${expect.guardsTests}`);
  }
  return out;
}

test('⑤ EA 测试读数 ≡ test-tier-registry（防评分台账自身漂移）', () => {
  assert.deepEqual(readingMismatches(EA), [], `EA 测试读数与 registry 不一致：\n  ${readingMismatches(EA).join('\n  ')}`);
  // 反例自证：旧漂移值必须判红
  const broken = EA.replace(/guards \*\*\d+ 文件 \/ \d+ 断言\*\*/g, 'guards **129 文件 / 902 断言**');
  assert.notEqual(broken, EA, '反例构造失败：未替换 guards 读数');
  assert.ok(readingMismatches(broken).length > 0, '反例未判红：129 / 902 未被识别为漂移');
});
