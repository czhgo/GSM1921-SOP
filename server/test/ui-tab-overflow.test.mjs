// role: [工程师]+[AI]
// ui-tab-overflow.test.mjs — 页签溢出可发现守卫（2026-10-19 · Spec Task 2）
//
// 口径：
//   · `.ws-tab-scroll` 外包 `.ws-tab-shell`，左右各一个箭头（可滚时才显示）；
//   · 点击滚动 240px、behavior:smooth；窗口 resize 重算；
//   · 不改 tab 尺寸 / 选中态 / 顺序 / 分组（页签按钮模板与 `.btn-tab` 尺寸档保持原样）。
// 运行：node --test server/test/ui-tab-overflow.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');

const TAB_BAR = readFileSync(join(ROOT, 'docs', 'src', 'components', 'shell', 'tab-bar.js'), 'utf8');
const CSS = readFileSync(join(ROOT, 'docs', 'src', 'styles.css'), 'utf8');

test('T1 左右箭头与定位壳：tab-bar 输出 .ws-tab-shell / .ws-tab-arrow', () => {
  assert.match(TAB_BAR, /class="ws-tab-shell"/, '缺少 .ws-tab-shell 定位容器');
  assert.match(TAB_BAR, /ws-tab-arrow--left/, '缺少左箭头');
  assert.match(TAB_BAR, /ws-tab-arrow--right/, '缺少右箭头');
  assert.match(TAB_BAR, /aria-label="向左滚动页签"/, '左箭头缺少可访问名称');
  assert.match(TAB_BAR, /aria-label="向右滚动页签"/, '右箭头缺少可访问名称');
});

test('T2 滚动行为：240px 平滑滚动 + scroll/resize 重算', () => {
  assert.match(TAB_BAR, /const STEP = 240;/, '滚动步长应为 240px');
  assert.match(TAB_BAR, /scrollBy\(\{ left: -STEP, behavior: 'smooth' \}\)/, '左箭头应平滑左滚');
  assert.match(TAB_BAR, /scrollBy\(\{ left: STEP, behavior: 'smooth' \}\)/, '右箭头应平滑右滚');
  assert.match(TAB_BAR, /addEventListener\('scroll', sync/, '缺少滚动位置监听');
  assert.match(TAB_BAR, /addEventListener\('resize', onResize\)/, '缺少窗口 resize 重算');
  assert.match(TAB_BAR, /scrollWidth - scroller\.clientWidth/, '缺少可滚判定（scrollWidth - clientWidth）');
  assert.match(TAB_BAR, /left\.hidden = !canScroll \|\| atStart/, '左箭头可见性未随滚动位置更新');
  assert.match(TAB_BAR, /right\.hidden = !canScroll \|\| atEnd/, '右箭头可见性未随滚动位置更新');
});

test('T3 样式：定位壳 / 箭头 / 右侧渐隐', () => {
  assert.match(CSS, /\.ws-tab-shell\s*\{[^}]*position:\s*relative/, '.ws-tab-shell 缺少 position:relative');
  assert.match(CSS, /\.ws-tab-arrow\s*\{[^}]*position:\s*absolute[^}]*top:\s*50%[^}]*transform:\s*translateY\(-50%\)/,
    '.ws-tab-arrow 缺少绝对定位与垂直居中');
  assert.match(CSS, /\.ws-tab-arrow--left\s*\{\s*left:\s*0/, '缺少左箭头定位');
  assert.match(CSS, /\.ws-tab-arrow--right\s*\{\s*right:\s*0/, '缺少右箭头定位');
  assert.match(CSS, /\.ws-tab-arrow\[hidden\]\s*\{\s*display:\s*none/, '箭头 hidden 时应隐藏');
  assert.match(CSS, /\.ws-tab-shell::after\s*\{/, '缺少右侧渐隐伪元素');
  assert.match(CSS, /data-scrollable[^{]*data-scroll-end[^{]*::after|data-scrollable\]:not\(\[data-scroll-end\]\)::after/,
    '渐隐未受可滚 / 末端状态控制');
});

test('T4 不改 tab 尺寸 / 选中态 / 顺序', () => {
  // 页签按钮模板保持原尺寸档（shrink-0 min-h-9 px-4 py-2 text-xs）。
  assert.match(TAB_BAR, /shrink-0 min-h-9 px-4 py-2 text-xs font-medium rounded-lg transition-colors/,
    '页签按钮尺寸/样式模板被改动');
  // `.btn-tab` 仍是 30px / 13px 档（页签豁免，不属于动作按钮）。
  const btnTab = [...CSS.matchAll(/\.btn-tab\s*\{([^}]*)\}/g)]
    .map((m) => m[1])
    .find((body) => /min-height:\s*30px\s*!important/.test(body));
  assert.ok(btnTab, '未找到 .btn-tab 的 30px 尺寸档');
  assert.match(btnTab, /font-size:\s*13px\s*!important/, '.btn-tab 字号应保持 13px');
  // tab 按钮本身不应新增尺寸工具类（滚动箭头不是 tab）。
  const tabBtnLine = TAB_BAR.split('\n').find((line) => line.includes('tab-btn${activeClass}')) || '';
  assert.ok(tabBtnLine, '未找到页签按钮模板');
  assert.doesNotMatch(tabBtnLine, /\b(h-10|h-11|h-12|py-3|text-sm)\b/, '页签按钮被加了新的尺寸工具类');
});
