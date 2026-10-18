// role: [工程师]+[AI]
// ui-preflight-context.test.mjs — UI 前置卡「两处同源」守卫（2026-10-18 立 · Task 8）
//
// 来源：Spec「工作台视觉语言」Task 8 / SubTask 8.3；判例＝「改界面前不答 10 问，凭手感加色块 / 加边框」。
// 病灶：前置卡只写在 spec 里，热层（CLAUDE.md）与文档（DESIGN_SYSTEM §0）都没有，AI 下次改界面仍从零起。
// 裁定：两处必须各有一张**文字同源**的 10 问卡；缺一即红。
//
// 判据：
//   P1 CLAUDE.md 含 `### H40.2 UI 变更前置卡` 标题，且该节内 10 问关键词齐备；
//   P2 DESIGN_SYSTEM.md §0（零、读本文件指南）内同一组 10 问关键词齐备；
//   P3 两处互相指向（CLAUDE → DESIGN_SYSTEM §0；DESIGN_SYSTEM → CLAUDE.md H40.2）；
//   P4 非空转自检：抽取出的两节正文长度必须达标（防「标题在、内容空」恒真）。
//
// 运行：node --test server/test/ui-preflight-context.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CLAUDE = join(ROOT, 'CLAUDE.md');
const DESIGN = join(ROOT, 'content', '04_web_design', 'design-system', 'DESIGN_SYSTEM.md');

/** 10 问的关键词（与 spec / 两处文档同一组；逐条取自 10 问原文） */
const QUESTION_KEYWORDS = [
  '唯一的主动作',
  '行动 / 状态 / 身份 / 结构',
  '实底还是淡底',
  '导航 / 动作 / 选择 / 展示 / 主从',
  '焦点可见',
  '1 主 + 1 次',
  '规定字号档',
  '空态、加载、错误',
  '1440 与 390',
  '删掉一半装饰',
];

/** 取 `startMarker` 之后、`endMarker` 之前的正文（找不到时返回空串） */
function sliceBetween(src, startMarker, endMarker) {
  const start = src.indexOf(startMarker);
  if (start < 0) return '';
  const end = src.indexOf(endMarker, start + startMarker.length);
  return end < 0 ? src.slice(start) : src.slice(start, end);
}

test('P1 CLAUDE.md H40.2 含 UI 变更前置卡与 10 问关键词', () => {
  const src = readFileSync(CLAUDE, 'utf8');
  assert.ok(src.includes('### H40.2 UI 变更前置卡'), 'CLAUDE.md 缺「### H40.2 UI 变更前置卡」标题');
  const section = sliceBetween(src, '### H40.2 UI 变更前置卡', '### H40.1');
  assert.ok(section.length > 200, 'CLAUDE.md H40.2 正文过短（标题在、10 问未落地）');
  const missing = QUESTION_KEYWORDS.filter((k) => !section.includes(k));
  assert.deepEqual(missing, [],
    `CLAUDE.md H40.2 缺 10 问关键词：${missing.join(' / ')}（与 DESIGN_SYSTEM §0 必须同源）`);
  assert.ok(section.includes('答不出第 1/2/4 问不得动笔'), 'H40.2 缺「答不出第 1/2/4 问不得动笔」硬约束');
});

test('P2 DESIGN_SYSTEM §0 含同一组 10 问关键词', () => {
  const src = readFileSync(DESIGN, 'utf8');
  const section = sliceBetween(src, '## 零、读本文件指南', '## 一、设计哲学');
  assert.ok(section.length > 200, 'DESIGN_SYSTEM §0 正文过短（标题在、10 问未落地）');
  assert.ok(section.includes('UI 变更前置卡'), 'DESIGN_SYSTEM §0 缺「UI 变更前置卡」标题');
  const missing = QUESTION_KEYWORDS.filter((k) => !section.includes(k));
  assert.deepEqual(missing, [],
    `DESIGN_SYSTEM §0 缺 10 问关键词：${missing.join(' / ')}（与 CLAUDE.md H40.2 必须同源）`);
  assert.ok(section.includes('答不出第 1/2/4 问不得动笔'), '§0 缺「答不出第 1/2/4 问不得动笔」硬约束');
});

test('P3 两处互相指向（单一源关系可追溯）', () => {
  const claude = readFileSync(CLAUDE, 'utf8');
  const design = readFileSync(DESIGN, 'utf8');
  assert.ok(claude.includes('content/04_web_design/design-system/DESIGN_SYSTEM.md §0'),
    'CLAUDE.md H40.2 未指向 DESIGN_SYSTEM.md §0');
  assert.ok(design.includes('CLAUDE.md H40.2'), 'DESIGN_SYSTEM §0 未指向 CLAUDE.md H40.2');
});

test('P4 非空转：两节正文均可抽取且互不为空', () => {
  const claudeSection = sliceBetween(readFileSync(CLAUDE, 'utf8'), '### H40.2 UI 变更前置卡', '### H40.1');
  const designSection = sliceBetween(readFileSync(DESIGN, 'utf8'), '## 零、读本文件指南', '## 一、设计哲学');
  assert.ok(claudeSection.length > 200 && designSection.length > 200,
    `抽取口径失效（CLAUDE ${claudeSection.length} 字 / DESIGN ${designSection.length} 字）：守卫会恒真`);
});
