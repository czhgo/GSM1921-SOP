// role: [工程师]+[AI]
// ui-preflight-context.test.mjs — UI 前置卡「热层指针 + 温层清单」守卫（2026-10-18 立 · 2026-11-03 批次 530 改准）
//
// 来源：Spec「工作台视觉语言」Task 8 → Spec「clarify-claude-constitution-layers」Task 3/4。
// 病灶①（2026-10-18）：前置卡只写在 spec 里，热层与文档都没有，AI 下次改界面仍从零起。
// 病灶②（2026-11-03）：热层内嵌 10 问过拟合（「主按钮实底还是淡底」并不重要），占用每次会话预算；
//   真正该按任务读的检查没有温层落点。
// 裁定：热层 `CLAUDE.md H40.2` 只留「何时读 / 去哪读 / 答不出怎么办」三行指针；
//   分组检查在温层 `content/05_ai_coding/UI_REVIEW_CHECKLIST.md`，每组必须带 DS 节 / SD 编号与「何时读」。
//
// 判据：
//   P1 CLAUDE.md H40.2 只留指针：含 UI_REVIEW_CHECKLIST、DS_03、DS_06 与「答不出」触发；
//   P2 温层清单存在且 8 组标题齐备、每组带依据（≥8 处 DS_0 引用）、含「何时读」；
//   P3 两处互相指向（CLAUDE → 清单 + DESIGN_SYSTEM §0；DESIGN_SYSTEM §0 → CLAUDE H40.2 + 清单）；
//   P4 非空转：抽取出的两节正文长度达标（防「标题在、内容空」恒真）。
//
// 运行：node --test server/test/ui-preflight-context.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CLAUDE = join(ROOT, 'CLAUDE.md');
const DESIGN = join(ROOT, 'content', '04_web_design', 'design-system', 'DESIGN_SYSTEM.md');
const CHECKLIST = join(ROOT, 'content', '05_ai_coding', 'UI_REVIEW_CHECKLIST.md');

/** 温层清单的 8 组任务标题（与 spec / 清单同一组） */
const GROUPS = ['版式 / 密度', '排版 / 字号', '颜色 / 对比', '交互 / 无障碍', '文案 / 空态', '响应式', '动效', '数据展示'];

/** 取 `startMarker` 之后、`endMarker` 之前的正文（找不到时返回空串） */
function sliceBetween(src, startMarker, endMarker) {
  const start = src.indexOf(startMarker);
  if (start < 0) return '';
  const end = src.indexOf(endMarker, start + startMarker.length);
  return end < 0 ? src.slice(start) : src.slice(start, end);
}

test('P1 CLAUDE.md H40.2 只留触发与指针（不内嵌 10 问）', () => {
  const src = readFileSync(CLAUDE, 'utf8');
  assert.ok(src.includes('### H40.2 UI 变更前置卡'), 'CLAUDE.md 缺「### H40.2 UI 变更前置卡」标题');
  const section = sliceBetween(src, '### H40.2 UI 变更前置卡', '### H40.3');
  assert.ok(section.length > 80, 'CLAUDE.md H40.2 正文过短（标题在、指针未落地）');
  assert.ok(section.includes('UI_REVIEW_CHECKLIST'), 'H40.2 未指向温层 UI_REVIEW_CHECKLIST');
  assert.ok(section.includes('DS_03'), 'H40.2 未指向 DS_03（组件）');
  assert.ok(section.includes('DS_06'), 'H40.2 未指向 DS_06（布局与密度）');
  assert.ok(section.includes('答不出'), 'H40.2 缺「答不出怎么办」触发');
  assert.ok(section.includes('不动笔'), 'H40.2 缺「证据补齐前不动笔」硬约束');
  assert.ok(!section.includes('实底还是淡底'), 'H40.2 仍内嵌 10 问细节（应迁温层清单）');
});

test('P2 温层清单：8 组齐备、每组带 DS 依据与「何时读」', () => {
  assert.ok(existsSync(CHECKLIST), '缺 content/05_ai_coding/UI_REVIEW_CHECKLIST.md');
  const src = readFileSync(CHECKLIST, 'utf8');
  assert.match(src, /^type:\s*guide/m, '清单 frontmatter 缺 `type: guide`');
  assert.match(src, /^last_updated:\s*"?\d{4}-\d{2}-\d{2}"?/m, '清单 frontmatter 缺 `last_updated`');
  assert.match(src, /^status:\s*active/m, '清单 frontmatter 缺 `status: active`');

  const missing = GROUPS.filter((g) => !src.includes(g));
  assert.deepEqual(missing, [], `清单缺任务组：${missing.join(' / ')}（8 组必须齐备）`);
  const headings = (src.match(/^##\s*[①-⑧]/gm) || []).length;
  assert.equal(headings, 8, `清单二级标题只解析到 ${headings} 组（应为 8 组）`);

  const dsRefs = (src.match(/DS_0\d/g) || []).length;
  assert.ok(dsRefs >= 8, `清单只出现 ${dsRefs} 处 DS_0x 引用（下限 8）：每组必须带 DS 节 / SD 编号`);
  assert.ok(src.includes('何时读'), '清单缺「何时读」列');
  assert.ok(src.includes('判据'), '清单缺「判据」列');
  assert.ok(src.includes('SD-'), '清单缺 SD 编号引用');
  assert.ok(src.includes('本文件是温层'), '清单顶部缺「温层：改对应任务时读」定位句');
});

test('P3 两处互相指向（单一源关系可追溯）', () => {
  const claude = readFileSync(CLAUDE, 'utf8');
  const design = readFileSync(DESIGN, 'utf8');
  assert.ok(claude.includes('content/05_ai_coding/UI_REVIEW_CHECKLIST.md'),
    'CLAUDE.md H40.2 未指向 `content/05_ai_coding/UI_REVIEW_CHECKLIST.md`');
  assert.ok(claude.includes('content/04_web_design/design-system/DESIGN_SYSTEM.md §0'),
    'CLAUDE.md 未指向 DESIGN_SYSTEM.md §0（外包入口）');
  assert.ok(design.includes('CLAUDE.md H40.2'), 'DESIGN_SYSTEM §0 未指向 CLAUDE.md H40.2（热层入口）');
  assert.ok(design.includes('UI_REVIEW_CHECKLIST'), 'DESIGN_SYSTEM §0 未指向温层 UI_REVIEW_CHECKLIST');
});

test('P4 非空转：抽取出的两节正文均可达标', () => {
  const claudeSection = sliceBetween(readFileSync(CLAUDE, 'utf8'), '### H40.2 UI 变更前置卡', '### H40.3');
  const checklist = readFileSync(CHECKLIST, 'utf8');
  assert.ok(claudeSection.length > 80 && checklist.length > 1500,
    `抽取口径失效（CLAUDE ${claudeSection.length} 字 / 清单 ${checklist.length} 字）：守卫会恒真`);
});
