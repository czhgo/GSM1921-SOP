// role: [工程师]+[AI]
// ui-phase2-urgent.test.mjs — Phase 2 急救四项 + 首页活动风采真图位守卫（2026-10-19）
//
// 判据来源：`.trae/specs/phase2-home-and-urgent-fixes/spec.md`。
// 本文件只做静态回归：防止「已修的四项」被后续批次悄悄改回旧形态。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/** 取出某个选择器后紧跟的 `{ ... }` 规则块（只取第一处） */
function ruleBlock(css, selector) {
  const idx = css.indexOf(selector);
  assert.notEqual(idx, -1, `缺选择器：${selector}`);
  const open = css.indexOf('{', idx);
  const close = css.indexOf('}', open);
  assert.ok(open !== -1 && close !== -1, `选择器无规则块：${selector}`);
  return css.slice(open + 1, close);
}

test('U1 日历小字：紧凑活动标签与任务标签均 ≥ 11px', () => {
  const css = read('docs/src/styles.css');
  const compact = ruleBlock(css, '.cal-cell-compact .cal-activity-tag');
  const task = ruleBlock(css, '.cal-task-tag');
  assert.match(compact, /font-size:\s*0\.6875rem/, '紧凑日历标签应为 11px（0.6875rem）');
  assert.match(task, /font-size:\s*0\.6875rem/, '日历任务标签应为 11px（0.6875rem）');
  assert.doesNotMatch(compact, /font-size:\s*0\.625rem/, '紧凑日历标签不得回落到 10px');
});

test('U2 日历标签字色压深到 72%，不再用 60%', () => {
  const src = read('docs/src/components/record/calendar.js');
  assert.match(src, /const _tagText = \(c\) => `color:color-mix\(in srgb, \$\{c\.text\} 72%, #000\);`/,
    'calendar.js 应以 _tagText 统一输出 72% 压深字色');
  assert.doesNotMatch(src, /60%, #000/, '日历标签不得回落到 60% 压深（浅底 3.73:1）');
});

test('U3 个人考勤空态：数值为「—」且标签写明「本月无记录」', () => {
  const src = read('docs/src/components/dashboard/stats.js');
  assert.match(src, /本月无记录/, '个人考勤为 0 时须写明「本月无记录」');
  assert.match(src, /value:\s*myTotal > 0(?: && myRate !== null)? \? `\$\{myPresent\}\/\$\{myTotal\}` : '—'/,
    '空态数值应保持「—」，不得改成 0 或空白');
});

test('U4 卡片 hover：默认不变色，只有 card--interactive 才给主题色边框', () => {
  const css = read('docs/src/styles.css');
  const base = ruleBlock(css, '.card:hover');
  const interactive = ruleBlock(css, '.card--interactive:hover');
  assert.doesNotMatch(base, /primary-300/, '默认 .card:hover 不得再出现主题色边框');
  assert.match(interactive, /primary-300/, '.card--interactive:hover 应保留可点反馈');
  const stats = read('docs/src/components/dashboard/stats.js');
  assert.match(stats, /card--interactive/, '首页个人考勤卡应显式声明 card--interactive');
});

test('U5 选人面板：向上展开有顶栏安全线；弹窗内不再叠第二层黑遮罩', () => {
  const js = read('docs/src/components/governance/person-picker.js');
  assert.match(js, /const topSafe = headerEl/, '向上展开应计算顶栏安全线');
  assert.match(js, /top = Math\.max\(topSafe, rect\.top - GAP - panelH\)/, '向上展开的 top 不得越过顶栏安全线');
  assert.match(js, /closest\('\[role="dialog"\]'\)/, '应识别「在弹窗内打开」');
  assert.match(js, /person-picker-overlay--passive/, '弹窗内应使用透明点击捕获层');
  const css = read('docs/src/components/person-picker.css');
  assert.match(ruleBlock(css, '.person-picker-overlay--passive'), /background:\s*transparent/,
    '透明点击捕获层应无底色');
});

test('U6 活动风采：真图位、无渐变、无蓝 hover、无整卡上浮', () => {
  const src = read('docs/src/components/dashboard/gallery.js');
  assert.doesNotMatch(src, /GALLERY_TYPE_GRADIENTS|linear-gradient/, '活动风采不得再用类型渐变冒充图片');
  assert.doesNotMatch(src, /text-blue-700|hover:-translate-y-1|hover:shadow-lg/, '活动风采不得再用蓝 hover 与整卡上浮');
  assert.match(src, /data-gallery-img/, '活动风采应输出真图位');
  assert.match(src, /mockDB\.imageRecords/, '真图应复用 imageRecords，不新造数据源');
  assert.match(src, /暂无活动照片/, '无图时应显示中性占位');
  const html = read('docs/index.html');
  const galleryTag = (html.match(/<div[^>]*id="dashboard-gallery-card"[^>]*>/) || [''])[0];
  assert.match(galleryTag, /card--static/, '活动风采外卡应为展示卡（card--static）');
});

test('U7 活动风采卡可键盘触发', () => {
  const src = read('docs/src/entries/pages/main-entry.js');
  assert.match(src, /role="button"/, '活动风采卡应声明 role="button"');
  assert.match(src, /addEventListener\('keydown'/, '活动风采卡应绑定键盘 Enter / Space');
});

// ── 第二批：页标题 / 零值 / 数字对齐 ─────────────────────────────

const OVERVIEW = 'docs/src/components/governance/work-overview.js';
const TODO_SHELL = 'docs/src/components/record/todo-tab-shell.js';
const COMMITTEE = 'docs/src/entries/tabs/secretary/committee-meeting-tab.js';
const GROUP = 'docs/src/entries/tabs/secretary/group-progress-tab.js';
const INDEX = 'docs/index.html';
const FOUR_PAGES = [OVERVIEW, TODO_SHELL, COMMITTEE, INDEX];

test('U8 页标题层级：四页重点各一个 H2，卡头 H3，首页抬头块按裁定恢复', () => {
  const frame = read('docs/src/components/shell/page-frame.js');
  assert.match(frame, /export function renderTabHeader/, 'page-frame 应提供 renderTabHeader');
  assert.match(frame, /<h2 class="page-frame__title">/, 'renderTabHeader 应输出 H2');

  const overview = read(OVERVIEW);
  // 2026-10-19 结构收口：概况标题参数化（默认「工作概况」，支书台显式「全局概况」），
  // work-overview 只负责按 title 渲染 H2；支书台在 overview-tab 传值。
  assert.match(overview, /renderTabHeader\(\{ title \}\)/, '概况 H2 应由 work-overview 参数化渲染');
  assert.match(read('docs/src/entries/tabs/secretary/overview-tab.js'), /title: '全局概况'/, '支书台概况应显式传「全局概况」');
  // 2026-10-20 界面细化：原「条线」是内部管理词，支书裁定改为「工作分工」。
  assert.match(overview, /<h3 class="section-head__title">工作分工<\/h3>/, '工作分工须为 H3');
  assert.match(overview, /<h3 class="section-head__title">待我处理<\/h3>/, '待我处理须为 H3');
  assert.doesNotMatch(overview, /<h4[^>]*section-head__title/, '分区标题不得再用 H4');

  const todo = read(TODO_SHELL);
  // 2026-10-19 结构收口：待办页标题由页签承担，不再在内容区重复 H2。
  assert.doesNotMatch(todo, /renderTabHeader\(\{ title: '待办' \}\)/, '待办不再重复页签同名 H2');
  assert.match(todo, /role="heading" aria-level="3"/, '折叠条标题应有 H3 语义（summary 内用 ARIA heading）');

  const cm = read(COMMITTEE);
  assert.match(cm, /renderTabHeader\(\{[\s\S]*?title: '支委会'/, '支委会 H2 应走统一组件');
  assert.doesNotMatch(cm, /<h2 class="font-title-cn/, '支委会不得再手写第二套 H2');

  // 2026-10-19 支书裁定：首页恢复抬头式品牌块（党徽 + 工作台标题），标题文案由 JS 按登录态写入。
  const html = read(INDEX);
  assert.doesNotMatch(html, /光华管理学院本科生党支部/, '首页不得出现硬编码示例支部名');
  assert.match(html, /id="dashboard-hero-title"/, '首页抬头标题须走专属 id');
  assert.doesNotMatch(html, /<h3/, '首页区块标题应升为 H2，不再保留 H3');
  assert.equal((html.match(/<h2/g) || []).length, 5, '首页应有 4 个区块 H2 + 1 个抬头 H2');

  const gallery = read('docs/src/components/dashboard/gallery.js');
  assert.match(gallery, /<h3 class="gallery-card__title">/, '风采卡标题应为 H3');
});

test('U9 零值口径：真实的 0 显示为 0；不得出现 0/0', () => {
  const src = read(OVERVIEW);
  assert.doesNotMatch(src, /row\.active \|\| '—'/, '在办 0 不得再用「—」代替');
  assert.match(src, /\$\{row\.active\}<\/td>/, '在办应直接输出数值（含 0）');
  assert.match(src, /text-gray-400 tabular-nums">0</, '逾期 0 应显示弱化数字 0');
  for (const file of FOUR_PAGES) {
    assert.doesNotMatch(read(file), /0\/0/, `${file} 不得出现 0/0`);
  }
});

test('U10 数字对齐与状态列去重：scope / is-numeric / is-redundant 齐备', () => {
  const table = read('docs/src/components/ui/data-table.js');
  assert.match(table, /<th scope="col"/, '表头应补 scope="col"');

  const css = read('docs/src/styles.css');
  assert.match(css, /\.data-table \.is-numeric\s*\{[^}]*text-align:\s*right/, '数字列应右对齐');
  assert.match(css, /\.data-table \.is-numeric\s*\{[^}]*font-variant-numeric:\s*tabular-nums/, '数字列应等宽');
  assert.match(css, /\.data-table \.is-redundant\s*\{[^}]*display:\s*none/, '冗余列应可隐藏');

  assert.match(read(COMMITTEE), /showStatus = roster\.some/, '支委会应计算状态列是否冗余');
  assert.match(read(GROUP), /showStatus = entities\.some/, '党小组应计算状态列是否冗余');
});

test('U11 DESIGN_SYSTEM 写入标题层级与零值口径', () => {
  const ds = read('content/04_web_design/design-system/DESIGN_SYSTEM.md');
  assert.match(ds, /### 4\.25 标题层级与文档大纲/, '应新增 §4.25 标题层级');
  assert.match(ds, /### 4\.26 零值与空行/, '应新增 §4.26 零值口径');
  assert.match(ds, /H1 只在顶栏出现一次/, '标题规则应写明 H1 唯一');
  assert.match(ds, /0 是事实就显示 0/, '零值规则应写明 0 是事实');
});

test('U12 卡片边界：跨组进展拆成并列四卡，不套外包卡', () => {
  const src = read(GROUP);
  const start = src.indexOf('function _progressSectionHtml');
  assert.ok(start >= 0, '未找到 _progressSectionHtml');
  const end = src.indexOf('\n}', start);
  const body = src.slice(start, end);
  assert.match(body, /<section class="space-y-4" data-gp-progress>/, '跨组进展应为无卡分区');
  assert.doesNotMatch(body, /class="card rounded-xl p-4 card--static"/, '跨组进展不得再套外包卡（卡中卡）');
  const order = ['_groupSwitchHtml', '_memberProgressCardHtml', '_reviewStatusCardHtml', '_activityAttendanceCardHtml'];
  const positions = order.map((fn) => body.indexOf(fn));
  assert.ok(positions.every((p) => p >= 0), `四张并列卡缺一：${order.join(' / ')}`);
  assert.deepEqual([...positions].sort((a, b) => a - b), positions,
    '阅读顺序应为：选择党小组 → 组员汇报 → 活动复盘 → 活动与考勤');

  const ds = read('content/04_web_design/design-system/DESIGN_SYSTEM.md');
  assert.match(ds, /#### 卡片边界判据/, 'DESIGN_SYSTEM 应写入卡片边界判据');
  assert.match(ds, /卡中卡/, '应明文禁止卡中卡');
});
