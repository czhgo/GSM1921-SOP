// role: [工程师]+[AI]
// work-overview-layers.test.mjs — 六台「工作概况」三层骨架守卫（2026-10-18 · Task 7）
//
// 来源：Spec「工作台密度与组件重组」Task 7 / DESIGN_SYSTEM §4.20.7-4.21。
// 病灶：六台概况各自堆卡，独立「汇报」卡与待办、待我处理重复；条线对比散落在卡片里。
// 本守卫只判**结构与单一源**：
//   W1 work-overview.js 三层标记齐备（结论带 / 条线表 / 待我处理）；
//   W2 不再出现独立「汇报」卡标题；
//   W3 六个 overview-tab 都调用共享 renderWorkOverview；
//   W4 六个角色键配置与「在办 / 逾期 / 待我处理 / 待答复」四数齐备；在办为 muted 脚注级；
//   W5 条线表列固定为「条线 / 负责人 / 在办 / 逾期 / 最近卡点 / 动作」；
//   W6 复用模块与既有下钻仍在（list-row / data-table / empty-state / 文件确认 / 去我的处置）；
//   W7 390px 条线表横滑与首列 sticky 由 styles.css 单一源提供；
//   W8 结论带四项是可聚焦 button，逾期/待我处理筛选与 3 条上限可用；卡头无重复计数，卡式行 data-label 齐备。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const OVERVIEW = read('docs/src/components/governance/work-overview.js');
const STYLES = read('docs/src/styles.css');

test('W1 三层骨架：结论带 / 条线表 / 待我处理标记齐备', () => {
  for (const layer of ['summary', 'lines', 'actions']) {
    assert.match(OVERVIEW, new RegExp(`data-wo-layer="${layer}"`), `work-overview.js 缺 data-wo-layer="${layer}"`);
  }
  assert.match(OVERVIEW, />条线<\/h4>/, '第二层须有「条线」表标题');
  assert.match(OVERVIEW, />待我处理<\/h4>/, '第三层须有「待我处理」标题');
});

test('W2 删除独立「汇报」卡：不再出现 <h4>汇报</h4>', () => {
  assert.doesNotMatch(OVERVIEW, /<h4[^>]*>\s*汇报\s*<\/h4>/, '不得保留独立「汇报」卡标题');
  assert.doesNotMatch(OVERVIEW, /dutyCardHtml/, '职责卡不再占一张卡');
});

test('W3 六个 overview-tab 都走共享 renderWorkOverview', () => {
  const files = [
    'secretary', 'org', 'prop', 'disc', 'leader', 'visitor',
  ].map((role) => `docs/src/entries/tabs/${role}/overview-tab.js`);
  for (const file of files) {
    const src = read(file);
    assert.match(src, /renderWorkOverview/, `${file} 未调用共享入口`);
  }
});

test('W4 六个角色键与四数齐备', () => {
  for (const role of [
    'secretary', 'org-commissioner', 'prop-commissioner', 'disc-commissioner', 'leader', 'visitor',
  ]) {
    const key = /^[a-z]/.test(role) && role.includes('-') ? `'${role}'` : role;
    assert.ok(OVERVIEW.includes(`${key}: {`), `ROLE_OVERVIEW_CONFIG 缺角色键 ${role}`);
  }
  for (const label of ['在办', '逾期（全口径）', '待我处理', '待答复']) {
    assert.ok(OVERVIEW.includes(`'${label}'`), `四数缺「${label}」`);
  }
  assert.match(OVERVIEW, /const _MAX_INLINE = 3/, '待我处理上限须为 3 且只有一份');
  assert.match(OVERVIEW, /lineOf\(item\)/, '每台配置须声明 lineOf(...)');
  // 在办 = 存量指标，降为脚注级；逾期才占主数值档。
  assert.match(OVERVIEW, /key: 'active', label: '在办'[^\n]*muted: true/, '在办须标记 muted');
  assert.match(OVERVIEW, /metric-band__value--muted/, '在办须输出 muted 数值档');
  assert.match(STYLES, /\.metric-band__value--muted\s*\{[^}]*font-size:\s*1\.125rem/, '在办 muted 档须为 18px');
  assert.match(STYLES, /\.metric-band__value--muted\s*\{[^}]*color:\s*var\(--neutral-500\)/, '在办 muted 档须为 neutral-500');
});

test('W5 条线表列固定：条线 / 负责人 / 在办 / 逾期 / 最近卡点 / 动作', () => {
  for (const label of ['条线', '负责人', '在办', '逾期', '最近卡点', '动作']) {
    assert.ok(OVERVIEW.includes(`label: '${label}'`), `条线表缺列「${label}」`);
  }
  assert.match(OVERVIEW, /tableHeadHtml\(LINE_COLUMNS\)/, '表头须由 data-table 的 tableHeadHtml 生成');
  assert.match(OVERVIEW, /class="data-table wo-lines-table"/, '条线表须使用 .data-table');
});

test('W6 复用模块与既有下钻仍在', () => {
  assert.match(OVERVIEW, /listRowHtml/, '待我处理须用 list-row');
  assert.match(OVERVIEW, /listGroupHtml/, '待我处理须用 list-group');
  assert.match(OVERVIEW, /emptyStateHtml/, '空态须用 empty-state');
  assert.match(OVERVIEW, /confirmExternalDispatch/, '文件外发确认须保留');
  assert.match(OVERVIEW, /data-wo-go-dispatch/, '汇报动作须保留「去我的处置」');
  assert.match(OVERVIEW, /data-\$\{prefix\}-tab="my-dispatch"/, '「去我的处置」须切本台 my-dispatch');
  assert.match(OVERVIEW, /_woDetail = \{ kind: 'activity'/, '活动只读详情下钻须保留');
  assert.match(OVERVIEW, /_woDetail = \{ kind: 'taskforce'/, '专班只读详情下钻须保留');
  assert.match(OVERVIEW, /data-wo-jump="todo"/, '待办组定位须保留');
  assert.match(OVERVIEW, /filterActivitiesForViewer/, '活动可见性过滤须保留');
});

test('W7 390px：条线表横滑 + 首列 sticky', () => {
  assert.match(STYLES, /\.wo-lines-scroll\s*\{[^}]*overflow-x:\s*auto/, '条线表容器须横向滚动');
  assert.match(STYLES, /\.wo-lines-table\s*\{[^}]*min-width:/, '条线表须有最小宽度以触发横滑');
  assert.match(STYLES, /\.wo-lines-table td:first-child\s*\{[^}]*position:\s*sticky/, '首列须 sticky');
});

test('W8 结论带四项可交互：button / data-metric / aria-pressed / 筛选状态', () => {
  assert.match(OVERVIEW, /<button type="button" class="metric-band__item/, '结论带四项须渲染为 button.metric-band__item');
  assert.match(OVERVIEW, /data-metric="\$\{esc\(metric\.key\)\}"/, '每个指标须带 data-metric');
  assert.match(OVERVIEW, /aria-pressed="\$\{active \? 'true' : 'false'\}"/, '每个指标须带 aria-pressed');
  for (const key of ['overdue', 'actions', 'active', 'fourth']) {
    assert.ok(OVERVIEW.includes(`key: '${key}'`), `指标缺 data-metric 键「${key}」`);
  }
  assert.match(OVERVIEW, /let _metricFilter = null/, '须有 _metricFilter 状态');
  assert.match(OVERVIEW, /_metricFilter === 'overdue'/, '逾期点击须切换筛选');
  assert.match(OVERVIEW, /actionItems\.filter\(\(item\) => item\.overdue\)/, '逾期筛选须按 item.overdue 过滤');
  assert.match(OVERVIEW, /visibleActions\.slice\(0, _MAX_INLINE\)/, '待我处理须按新上限截取');
  assert.match(OVERVIEW, /row\.gap \|\| row\.overdue > 0/, '条线动作只对缺口或逾期行显示');
  // 指标单点：结论带已有计数，卡头不得再重复。
  assert.doesNotMatch(OVERVIEW, /section-head__count/, '「待我处理」卡头不得重复计数');
  // 条线表窄屏卡式行：表声明 data-responsive，每个 td 带 data-label。
  assert.match(OVERVIEW, /data-responsive="cards"/, '条线表须声明卡式行');
  for (const label of ['条线', '负责人', '在办', '逾期', '最近卡点', '动作']) {
    assert.ok(OVERVIEW.includes(`data-label="${label}"`), `条线表 td 缺 data-label="${label}"`);
  }
});
