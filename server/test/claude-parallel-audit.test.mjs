// server/test/claude-parallel-audit.test.mjs — 多代理独立审查协议（H21）守卫（C1–C7）
//
// 病灶：H21「多代理独立审查协议」与详版手册 `PARALLEL_SKILL_AUDIT.md` 是 2026-10-19 才立的
//   制度性内容（协议八条 / 判例 / 四轮路线图）。这类**纯文档规则**没有代码路径可依，
//   后续批次很容易在改 CLAUDE.md 或整理 05 目录时把它改回「单 agent 审查」、或删掉判例与路线图，
//   而现有测试全绿——文档回潮无人拦。
//
// 判据（七个主题，各自独立断言）：
//   C1 H21 存在且位于 H30 之前，正文非空转（行数下限）
//   C2 H20.2 保留「多视角审查前置」入口（指向 H21）
//   C3 H21 协议八条关键词齐备（独立审查 / 证据 / 汇总 / 裁定 / 落 spec / 复盘）
//   C4 H21 判例与四轮路线图齐备（三路 lens / 六项共识 / 五项分歧 / 支书四项裁定 / 逐轮启动）
//   C5 详版手册九章齐备，且含 skill / 证据 / 决策记录 / 未选方案
//   C6 05 索引已登记 PARALLEL_SKILL_AUDIT.md，且 read_strategy 为 on-demand
//   C7 本守卫已登记进 server/package.json 的 test:daily（防守卫孤儿化，S16 同源）
//
// 运行：`node --test test/claude-parallel-audit.test.mjs`（cwd = server；纯 node，无浏览器 / 无服务依赖）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const CLAUDE = join(ROOT, 'CLAUDE.md');
const MANUAL = join(ROOT, 'content', '05_ai_coding', 'PARALLEL_SKILL_AUDIT.md');
const INDEX = join(ROOT, 'content', '05_ai_coding', 'README.md');
const PKG = join(ROOT, 'server', 'package.json');

const read = (f) => readFileSync(f, 'utf8');

/** 取 H21 正文（从 `## H21.` 到 `## H30.`） */
function h21Of(src) {
  const h21Start = src.indexOf('## H21.');
  const h30Start = src.indexOf('## H30.');
  assert.ok(h21Start >= 0, 'CLAUDE.md 缺少 `## H21.` 标题：多代理独立审查协议被删或改号');
  assert.ok(h30Start >= 0, 'CLAUDE.md 缺少 `## H30.` 标题：一改具改原则被删或改号，H21 定位失参照');
  return src.slice(h21Start, h30Start);
}

// ─────────────────────────────────────────────────────────────────────────────
// C1 H21 存在且位于 H30 之前
// ─────────────────────────────────────────────────────────────────────────────
test('C1 H21 存在且位于 H30 之前（正文非空转）', () => {
  const src = read(CLAUDE);
  const h21Start = src.indexOf('## H21.');
  const h30Start = src.indexOf('## H30.');
  assert.ok(h21Start >= 0, 'CLAUDE.md 缺少 `## H21.`——多代理独立审查协议被删除或改号');
  assert.ok(h30Start >= 0, 'CLAUDE.md 缺少 `## H30.`——一改具改原则被删除或改号');
  assert.ok(h21Start < h30Start,
    `H21 必须排在 H30 之前（实测 H21@${h21Start} / H30@${h30Start}）：热层协议顺序被改动`);

  const h21 = src.slice(h21Start, h30Start);
  const lines = h21.split(/\r?\n/).filter((l) => l.trim() !== '').length;
  assert.ok(lines >= 25,
    `H21 正文只有 ${lines} 行非空内容（下限 25）：协议很可能被删成一句空壳，判例与路线图已丢失`);
});

// ─────────────────────────────────────────────────────────────────────────────
// C2 H20.2 有 H21 前置入口
// ─────────────────────────────────────────────────────────────────────────────
test('C2 H20.2 有 H21 前置入口（多视角审查前置）', () => {
  const src = read(CLAUDE);
  const start = src.indexOf('### H20.2');
  const end = src.indexOf('### H20.3');
  assert.ok(start >= 0, 'CLAUDE.md 缺少 `### H20.2`——执行流程被删除或改号');
  assert.ok(end >= 0, 'CLAUDE.md 缺少 `### H20.3`——无法界定 H20.2 段落范围');
  const section = src.slice(start, end);
  assert.ok(section.includes('多视角审查前置'),
    'H20.2 缺少「多视角审查前置」入口句：执行流程不再把多视角审查作为前置，H21 变成无人入口的死规则');
  assert.ok(section.includes('H21'),
    'H20.2 的「多视角审查前置」未指向 H21：入口存在但规则指针丢失');
});

// ─────────────────────────────────────────────────────────────────────────────
// C3 协议关键词齐备
// ─────────────────────────────────────────────────────────────────────────────
test('C3 H21 协议关键词齐备（独立审查 / 证据 / 汇总 / 裁定 / 落 spec / 复盘）', () => {
  const h21 = h21Of(read(CLAUDE));
  const required = [
    ['每个代理只加载一个 skill', '独立审查：每个代理只加载一个 skill'],
    ['不读其他代理报告', '独立性：不读其他代理报告'],
    ['file:line', '证据：每条发现必须带 file:line'],
    ['共识 / 分歧 / 待裁定', '汇总三分类：共识 / 分歧 / 待裁定'],
    ['AskUserQuestion', '人类裁定：用 AskUserQuestion 给互斥选项'],
    ['不得替支书决定', '裁定权归属：不得替支书决定'],
    ['sample-diff-learning', '复盘：按 sample-diff-learning 记录假设与意图差异'],
    ['spec.md', '落 spec：spec.md'],
    ['tasks.md', '落 spec：tasks.md'],
    ['checklist.md', '落 spec：checklist.md'],
  ];
  for (const [needle, desc] of required) {
    assert.ok(h21.includes(needle),
      `H21 缺少关键词「${needle}」（${desc}）：协议被削减或改回单 agent 审查`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// C4 判例与四轮路线图齐备
// ─────────────────────────────────────────────────────────────────────────────
test('C4 判例与四轮路线图齐备（三路 lens / 共识分歧裁定 / 逐轮启动）', () => {
  const h21 = h21Of(read(CLAUDE));
  const required = [
    ['web-design-guidelines', '判例 lens：web-design-guidelines'],
    ['design-with-taste', '判例 lens：design-with-taste'],
    ['frontend-design', '判例 lens：frontend-design'],
    ['6 项共识', '判例结论：6 项共识'],
    ['5 项分歧', '判例结论：5 项分歧'],
    ['支书四项裁定', '判例结论：支书四项裁定'],
    ['Round 1 脏乱繁复审计', '四轮路线图：Round 1'],
    ['Round 2 最小三成本', '四轮路线图：Round 2'],
    ['Round 3 功能与美观', '四轮路线图：Round 3'],
    ['Round 4 全栈数据结构设计', '四轮路线图：Round 4'],
    ['逐轮启动', '启动纪律：逐轮启动'],
    ['不得同时开四轮', '启动纪律：不得同时开四轮'],
  ];
  for (const [needle, desc] of required) {
    assert.ok(h21.includes(needle),
      `H21 缺少「${needle}」（${desc}）：判例或四轮路线图被删，协议失去经验依据与推进路径`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// C5 详版手册章节齐备
// ─────────────────────────────────────────────────────────────────────────────
test('C5 详版手册九章齐备（PARALLEL_SKILL_AUDIT.md）', () => {
  const manual = read(MANUAL);
  const chapters = [
    '## 1. 适用与边界',
    '## 2. 一轮审查的 7 步',
    '## 3. 子代理提示词模板',
    '## 4. 输出 schema',
    '## 5. 主代理汇总模板',
    '## 6. 人类裁定与决策记录',
    '## 7. 反模式清单',
    '## 8. 判例：2026-10-19',
    '## 9. 四轮路线图',
  ];
  for (const ch of chapters) {
    assert.ok(manual.includes(ch),
      `详版手册缺少章节「${ch}」：H21 的执行层操作说明被删或改号`);
  }
  const keywords = [
    ['skill', '每个代理一个 skill 的独立性约束'],
    ['证据', '证据校验'],
    ['决策记录', '人类裁定与决策记录'],
    ['未选方案', '未选方案不得静默丢弃'],
  ];
  for (const [needle, desc] of keywords) {
    assert.ok(manual.includes(needle),
      `详版手册缺少关键词「${needle}」（${desc}）：关键机制被删减`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// C6 05 索引已登记
// ─────────────────────────────────────────────────────────────────────────────
test('C6 05 索引已登记 PARALLEL_SKILL_AUDIT.md 且为 on-demand', () => {
  const index = read(INDEX);
  const line = index.split(/\r?\n/).find((l) => l.includes('PARALLEL_SKILL_AUDIT.md'));
  assert.ok(line,
    'content/05_ai_coding/README.md 未登记 PARALLEL_SKILL_AUDIT.md：详版手册成为索引外的孤文件');
  assert.ok(line.includes('on-demand'),
    `05 索引中的 PARALLEL_SKILL_AUDIT.md 行未标 on-demand（实为：${line.trim()}）：按需读取策略丢失`);
});

// ─────────────────────────────────────────────────────────────────────────────
// C7 守卫已登记 test:daily
// ─────────────────────────────────────────────────────────────────────────────
test('C7 守卫已登记 test:daily', () => {
  const pkg = JSON.parse(read(PKG));
  const daily = pkg.scripts?.['test:daily'] ?? '';
  assert.ok(daily.includes('test/claude-parallel-audit.test.mjs'),
    'server/package.json 的 test:daily 未登记 test/claude-parallel-audit.test.mjs：守卫孤儿化，从不自动运行');
});
