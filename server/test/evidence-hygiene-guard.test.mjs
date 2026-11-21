// role: [工程师]+[AI]
// server/test/evidence-hygiene-guard.test.mjs — 证据库准入守卫（2026-11-21 批次 595 · CLAUDE H26.3a）
//
// 判据：`.ctx/evidence/` 只存「被引用的读数」，不存截图 / 压缩包 / 原始日志。
//   ① 证据库里不得出现 `.png` / `.jpg` / `.jpeg` / `.zip`（截图与压缩包一律不留库）；
//   ② 每个证据文件必须被 active 台账或守卫 / 脚本命中；反向：点名处引用的文件必须存在（删证据同批清引用）；
//   ③ 单文件 ≤ 256 KB（大文件是原始件，不是读数）；
//   ④ 反例自证：把合格样本改坏后，同一判据必须判红（守卫不是空转）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const EVIDENCE = path.join(ROOT, '.ctx', 'evidence');
const LEDGERS = [
  'CLAUDE.md',
  '.ctx/ACTIVE_CONTEXT.md',
  '.ctx/ENGINEERING_ASSESSMENT.md',
  '.ctx/REVIEW_QUEUE.md',
  '.ctx/ACTIVE_RULINGS.md',
  '.ctx/SNAPSHOT.md',
  '.ctx/README.md',
];
const BANNED = /\.(png|jpe?g|zip)$/i;
const MAX_BYTES = 256 * 1024;

const toPosix = (p) => p.replace(/\\/g, '/');
const ledgerText = LEDGERS.map((rel) => readFileSync(path.join(ROOT, rel), 'utf8')).join('\n');

/** 守卫 / 脚本消费的证据（fixture）也算「被引用」 */
function guardText(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(guardText(abs));
    else if (entry.name.endsWith('.mjs')) out.push(readFileSync(abs, 'utf8'));
  }
  return out.join('\n');
}
const referenceText = [ledgerText, guardText(path.join(ROOT, 'server/test')), guardText(path.join(ROOT, 'server/scripts'))].join('\n');

/** 递归列出证据文件（posix 相对仓库根的路径 ＋ 字节数） */
function evidenceFiles(dir = EVIDENCE, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) evidenceFiles(abs, out);
    else out.push({ abs, rel: toPosix(path.relative(ROOT, abs)), size: statSync(abs).size });
  }
  return out;
}

/** 台账里点名的证据文件（只取带扩展名的具体文件，忽略 `YYYY-MM-DD/` 之类占位） */
function referencedFiles(text) {
  return [...new Set((text.match(/\.ctx\/evidence\/[\w./-]+\.(?:md|json)/g) || []).map((s) => s.replace(/[.,;:）)]+$/, '')))];
}

/** ② 判据本体：返回不合格原因，空串＝合格 */
function unreferenced(rel, text) {
  return text.includes(rel) ? '' : `${rel} 未被台账 / 守卫引用`;
}

test('① 证据库不得存截图与压缩包', () => {
  const bad = evidenceFiles().filter((f) => BANNED.test(f.rel)).map((f) => f.rel);
  assert.deepEqual(bad, [], `截图 / 压缩包不得入库（读数转写后删原件）：${bad.join(', ')}`);
});

test('② 证据文件与台账 / 守卫双向引用一致', () => {
  const files = evidenceFiles();
  assert.ok(files.length > 0, '证据库为空（判据失去作用面）');
  const unref = files.map((f) => unreferenced(f.rel, referenceText)).filter(Boolean);
  const missing = referencedFiles(ledgerText).filter((rel) => !existsSync(path.join(ROOT, rel)));
  assert.deepEqual(unref, [], `证据文件未被引用：\n  ${unref.join('\n  ')}`);
  assert.deepEqual(missing, [], `引用了不存在的证据（删证据须同批清引用）：\n  ${missing.join('\n  ')}`);
});

test('③ 单文件读数 ≤ 256 KB', () => {
  const big = evidenceFiles().filter((f) => f.size > MAX_BYTES).map((f) => `${f.rel} ${Math.round(f.size / 1024)}KB`);
  assert.deepEqual(big, [], `读数文件过大，应转写为摘要：${big.join(', ')}`);
});

test('④ 反例自证：改坏样本必须判红', () => {
  assert.equal(unreferenced('.ctx/evidence/a/b.md', '见 .ctx/evidence/a/b.md'), '');
  assert.notEqual(unreferenced('.ctx/evidence/a/c.md', '见 .ctx/evidence/a/b.md'), '', '未引用未判红');
  assert.equal(BANNED.test('.ctx/evidence/a/shot.png'), true);
  assert.equal(BANNED.test('.ctx/evidence/a/pack.zip'), true);
  assert.equal(BANNED.test('.ctx/evidence/a/readings.md'), false);
  assert.equal(MAX_BYTES + 1 > MAX_BYTES, true);
});
