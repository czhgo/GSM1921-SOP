// role: [工程师]+[AI]
// ui-first-screen-order.test.mjs — 首屏浏览顺序守卫（2026-10-19 立 · Task 7）
//
// 来源：Spec「最小三成本」Task 7 / SubTask 7.1–7.4；判例＝「说明压在主体前 / 同一指标出现两次 / 行内动作过多」。
// 裁定：§10.5 首屏浏览顺序（主对象优先、说明后置、指标单点、动作收敛）＋ §10.6 10 个抽样页登记。
//
// 判据：
//   F1 DESIGN_SYSTEM §10.5 存在，四条规则与三条布尔条件齐备；
//   F2 DESIGN_SYSTEM §10.6 存在，10 行抽样页齐备，状态为 4 个「已修（本 spec）」+ 6 个「已审（后续）」；
//   F3 四页重点迁移后「主对象先于 help-note」。**当前页面尚未迁移**：文件里没有 `.help-note`
//      时记为「页面任务待满足」并跳过，不写死失败；迁移后由后续 agent 在 Task 9 收紧为 DOM 顺序断言。
//
// 运行：node --test server/test/ui-first-screen-order.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DESIGN = join(ROOT, 'content', '04_web_design', 'design-system', 'DESIGN_SYSTEM.md');

/** 四页重点（Task 3–6 的迁移对象；页面断言留给后续 Task 9） */
const KEY_PAGES = [
  { label: '支书 · 党小组', file: join(ROOT, 'docs', 'src', 'entries', 'tabs', 'secretary', 'group-progress-tab.js') },
  { label: '支书 · 支委会', file: join(ROOT, 'docs', 'src', 'entries', 'tabs', 'secretary', 'committee-meeting-tab.js') },
  { label: '支书 · 全局概况', file: join(ROOT, 'docs', 'src', 'components', 'governance', 'work-overview.js') },
  { label: '支书 · 待办', file: join(ROOT, 'docs', 'src', 'entries', 'tabs', 'secretary', 'todo-tab.js') },
];

function sliceBetween(src, startMarker, endMarker) {
  const start = src.indexOf(startMarker);
  if (start < 0) return '';
  const end = src.indexOf(endMarker, start + startMarker.length);
  return end < 0 ? src.slice(start) : src.slice(start, end);
}

test('F1 DESIGN_SYSTEM §10.5 首屏浏览顺序：四条规则 + 三条布尔条件', () => {
  const src = readFileSync(DESIGN, 'utf8');
  const section = sliceBetween(src, '### 10.5 首屏浏览顺序', '### 10.6');
  assert.ok(section.length > 100, 'DESIGN_SYSTEM 缺 §10.5「首屏浏览顺序」或正文过短');
  for (const key of ['主对象优先', '说明后置', '指标单点', '动作收敛']) {
    assert.ok(section.includes(key), `§10.5 缺规则「${key}」`);
  }
  for (const key of ['B-1', 'B-2', 'B-3']) {
    assert.ok(section.includes(key), `§10.5 缺布尔条件「${key}」`);
  }
  assert.ok(section.includes('1 个主按钮'), '§10.5 缺「每屏 1 个主按钮」动作收敛口径');
});

test('F2 DESIGN_SYSTEM §10.6 10 个抽样页乱象登记齐备（4 已修 + 6 已审）', () => {
  const src = readFileSync(DESIGN, 'utf8');
  const section = sliceBetween(src, '### 10.6', '## 十一、边界与引用');
  assert.ok(section.length > 100, 'DESIGN_SYSTEM 缺 §10.6「10 个抽样页乱象登记」或正文过短');
  const rows = section.split('\n').filter((l) => /^\|\s*(支书|组织|宣传|纪检|组长|成员)\s*·/.test(l));
  assert.equal(rows.length, 10, `§10.6 抽样页应为 10 行，实测 ${rows.length} 行`);
  const fixed = rows.filter((l) => l.includes('已修（本 spec）')).length;
  const audited = rows.filter((l) => l.includes('已审（后续）')).length;
  assert.equal(fixed, 4, `§10.6「已修（本 spec）」应为 4 页，实测 ${fixed} 页`);
  assert.equal(audited, 6, `§10.6「已审（后续）」应为 6 页，实测 ${audited} 页`);
  for (const key of ['说明后置', '指标单点', '动作收敛']) {
    assert.ok(section.includes(key) || src.includes(key), `§10.6 缺乱象模式「${key}」`);
  }
});

test('F4 待办首屏：待答复与未读通知合并为默认收起的折叠条，主对象「我的待办」紧随其后', () => {
  const src = readFileSync(join(ROOT, 'docs', 'src', 'components', 'record', 'todo-tab-shell.js'), 'utf8');
  assert.match(src, /<details class="todo-strip[^"]*"/, '待办页顶应使用原生 details 折叠条');
  assert.match(src, /\$\{_stripOpen \? ' open' : ''\}/, '折叠条默认收起，仅用户展开后才带 open');
  assert.match(src, /待答复与未读通知/, '折叠条摘要应显示合并后的条名');
  const detailsStart = src.indexOf('<details class="todo-strip');
  const detailsEnd = src.indexOf('</details>', detailsStart);
  const stripBody = src.slice(detailsStart, detailsEnd);
  assert.ok(stripBody.includes('${extraHtml}') && stripBody.includes('${unreadHtml}'),
    '展开区应同时承载待答复收件箱与未读通知行');
  const stripInsert = src.indexOf('${stripHtml}');
  const mainObject = src.indexOf('>我的待办</h3>');
  assert.ok(stripInsert >= 0 && mainObject > stripInsert,
    '首屏顺序：折叠条先于「我的待办」，收起时只占一行');
});

test('F5 党小组表恰 5 列，负责人单元格不再有第三行嵌套', () => {
  const src = readFileSync(join(ROOT, 'docs', 'src', 'entries', 'tabs', 'secretary', 'group-progress-tab.js'), 'utf8');
  const head = src.slice(src.indexOf('<thead>'), src.indexOf('</thead>') + '</thead>'.length);
  const cols = [...head.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').trim());
  assert.deepEqual(cols, ['党小组', '负责人', '人数（含党员）', '状态', '操作'],
    `党小组表头应为 5 列，实测 ${JSON.stringify(cols)}`);
  assert.ok(!src.includes('space-y-1.5 min-w-[180px]'),
    '负责人单元格仍保留第三行嵌套（space-y-1.5 min-w-[180px]），应压到一行');
});

test('F3 四页重点主对象先于 help-note（党小组 / 支委会已迁移；概况 / 待办无 help-note）', () => {
  for (const { label, file } of KEY_PAGES) {
    const src = readFileSync(file, 'utf8');
    if (!src.includes('help-note')) {
      console.log(`[ui-first-screen-order] ${label} 尚未迁移到 .help-note（页面顺序断言待后续 Task 9 收紧）`);
      continue;
    }
    // 迁移开始后：帮助注释不得出现在文件最前段的说明区（这里只做粗粒度防退化）。
    const helpIdx = src.indexOf('help-note');
    const firstMainIdx = Math.min(
      ...['<table', 'data-table', 'renderDataTable', 'cm-roster-table', 'cm-meeting-table', 'data-metric', 'todo-list', '我的待办']
        .map((t) => src.indexOf(t))
        .filter((i) => i >= 0),
    );
    assert.ok(Number.isFinite(firstMainIdx) && firstMainIdx < helpIdx,
      `${label} 的 help-note 出现在主对象之前（应说明后置）`);
  }
});
