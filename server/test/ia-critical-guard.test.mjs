// role: [工程师]+[AI]
// ia-critical-guard.test.mjs — H21.3 批判性 IA 审查常设化守卫（2026-10-19）
//
// 立此守卫的原因：
//   支书指出「入口太多、界面太多、链接还有问题」，并要求把「该不该存在 / 指向对不对」
//   纳入 parallel subagent 审查的常设内涵。若不落机检，下一轮很容易又只审「好不好看」。
//
// 判据：
//   I1 四件落盘：IA 矩阵 / 批判性审计 / 链接真值 / H21.3 协议；
//   I2 协议含三问、数据适配功能、5 条 Boolean 规则；
//   I3 CLAUDE 含 H21.3 三问与 mock 可删改；
//   I4 矩阵非空转：tabs ≥ 60、links ≥ 30；
//   I5 审计报告覆盖六路编号；链接真值覆盖材料闭环与至少 10 条。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const has = (p) => existsSync(join(ROOT, p));

test('I1 四件落盘：IA 矩阵 / 批判性审计 / 链接真值 / H21.3 协议', () => {
  for (const p of [
    '.ctx/logs/archive/2026-10/IA_INVENTORY.md',
    '.ctx/logs/archive/2026-10/AUDIT_IA_CRITICAL.md',
    '.ctx/logs/archive/2026-10/IA_LINK_TRUTH.md',
    'content/05_ai_coding/PARALLEL_SKILL_AUDIT.md',
  ]) assert.ok(has(p), `缺少 ${p}`);
});

test('I2 协议含三问 / 数据适配功能 / 5 条 Boolean 规则', () => {
  const p = read('content/05_ai_coding/PARALLEL_SKILL_AUDIT.md');
  assert.match(p, /## 11\. 批判性 IA 审查（H21\.3/, '缺少 §11 H21.3 章节');
  for (const q of ['这个 tab 是否必须存在', '这张卡是否改变一个决策', '这枚链接是否指向']) {
    assert.ok(p.includes(q), `缺少三问之一：${q}`);
  }
  assert.match(p, /数据适配功能/, '缺少「数据适配功能」原则');
  assert.match(p, /mock 数据只是验证辅助/, '缺少「mock 可删改」口径');
  for (let i = 1; i <= 5; i++) {
    assert.match(p, new RegExp(`AP-IA-0${i}`), `缺少 learned rule AP-IA-0${i}`);
  }
});

test('I3 CLAUDE 含 H21.3 三问与 mock 可删改', () => {
  const c = read('CLAUDE.md');
  assert.match(c, /H21\.3 批判性 IA 审查/, 'CLAUDE 缺少 H21.3');
  for (const q of ['这个 tab 是否必须存在', '这张卡是否改变一个决策', '这枚链接是否指向']) {
    assert.ok(c.includes(q), `CLAUDE 缺少三问之一：${q}`);
  }
  assert.match(c, /mock 可删改/, 'CLAUDE 缺少「mock 可删改」');
  assert.match(c, /数据适配功能/, 'CLAUDE 缺少「数据适配功能」');
});

test('I4 矩阵非空转：tabs ≥ 60、links ≥ 30', () => {
  const m = read('.ctx/logs/archive/2026-10/IA_INVENTORY.md');
  const tabs = Number((/tab 数\s*\|\s*(\d+)/.exec(m) || [])[1] || 0);
  const links = Number((/链接数[^|\n]*\|\s*(\d+)/.exec(m) || [])[1] || 0);
  assert.ok(tabs >= 60, `矩阵 tabs=${tabs} < 60，扫描面异常`);
  assert.ok(links >= 30, `矩阵 links=${links} < 30，扫描面异常`);
});

test('I5 审计报告覆盖六路编号；链接真值覆盖材料闭环与至少 10 条', () => {
  const a = read('.ctx/logs/archive/2026-10/AUDIT_IA_CRITICAL.md');
  for (const id of ['IA-A01', 'IA-B01', 'IA-C01', 'IA-D01', 'IA-E01', 'IA-F01']) {
    assert.ok(a.includes(id), `审计报告缺少 ${id}`);
  }
  const l = read('.ctx/logs/archive/2026-10/IA_LINK_TRUTH.md');
  assert.match(l, /材料闭环页：逐角色落点/, '链接真值缺少材料闭环逐角色表');
  const ids = new Set((l.match(/IA-C\d{2}|C\d{2}/g) || []).map((x) => x.replace('IA-', '')));
  assert.ok(ids.size >= 10, `链接真值覆盖 ${ids.size} 条 < 10`);
});
