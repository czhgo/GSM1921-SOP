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
  assert.match(src, /value:\s*myTotal > 0 \? `\$\{myPresent\}\/\$\{myTotal\}` : '—'/,
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
