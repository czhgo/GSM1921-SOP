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

test('T5 键盘起点：激活页签只改 scrollLeft，不用元素级滚动定位', () => {
  // 2026-10-27 Task 2（阶段一）：activate 里的元素级滚动会把浏览器「顺序焦点导航起点」
  //   挪到页签上，刷新后首次 Tab 不再落「跳到主要内容」。判据＝无该调用 + 明确改 scrollLeft。
  assert.doesNotMatch(TAB_BAR, /\.scrollIntoView\s*\(/, 'tab-bar 不得再用 scrollIntoView 定位激活页签');
  assert.match(TAB_BAR, /scroller\.scrollLeft/, '激活页签可见须改为调整滚动容器的 scrollLeft');
  assert.match(TAB_BAR, /bRect\.left < sRect\.left \+ pad/, '缺少左侧越界计算');
  assert.match(TAB_BAR, /bRect\.right > sRect\.right - pad/, '缺少右侧越界计算');
});

test('T4 不改 tab 尺寸 / 选中态 / 顺序', () => {
  // 页签按钮模板保持原尺寸档（shrink-0 min-h-9 px-4 py-2 text-xs）。
  assert.match(TAB_BAR, /shrink-0 min-h-9 px-4 py-2 text-xs font-medium rounded-lg transition-colors/,
    '页签按钮尺寸/样式模板被改动');
  // `.btn-tab` 已是 32px / 13px 档（2026-10-23 Task 6：页签与 .btn-ghost 同属紧凑档，
  //  高度 = 4+4 padding + 22 line-height + 2 边框 = 32，不再用 min-height 撑高）。
  const btnTab = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map((m) => ({ selector: m[1], body: m[2] }))
    .find(({ selector, body }) => selector.split(',').map((s) => s.trim()).includes('.btn-tab')
      && /padding:\s*4px\s+8px/.test(body) && /line-height:\s*22px/.test(body));
  assert.ok(btnTab, '未找到 .btn-tab 的 32px 尺寸档（padding 4px 8px + line-height 22px）');
  assert.match(btnTab.body, /font-size:\s*13px\s*!important/, '.btn-tab 字号应保持 13px');
  assert.doesNotMatch(btnTab.body, /min-height/, '.btn-tab 不得再用 min-height 撑高');
  // tab 按钮本身不应新增尺寸工具类（滚动箭头不是 tab）。
  const tabBtnLine = TAB_BAR.split('\n').find((line) => line.includes('tab-btn${activeClass}')) || '';
  assert.ok(tabBtnLine, '未找到页签按钮模板');
  assert.doesNotMatch(tabBtnLine, /\b(h-10|h-11|h-12|py-3|text-sm)\b/, '页签按钮被加了新的尺寸工具类');
});

test('T6 页签条分层（2026-10-27 Task 6.1）：组名行独立在上、页签行只放页签与箭头', () => {
  const htmlStart = TAB_BAR.indexOf('const html = `<div class="ws-tab-shell"');
  assert.ok(htmlStart >= 0, '未找到 tab-bar 的 shell 模板');
  const html = TAB_BAR.slice(htmlStart);
  const groupsIdx = html.indexOf('${groupsHtml}');
  const rowIdx = html.indexOf('class="ws-tab-row"');
  assert.ok(groupsIdx >= 0 && rowIdx > groupsIdx, '组名行（${groupsHtml}）须位于页签行（.ws-tab-row）之前');
  // 组名仍是 role=presentation 非按钮：组名行模板内不得出现 <button>。
  assert.doesNotMatch(html.slice(groupsIdx, rowIdx), /<button/, '组名行内不得渲染按钮');
  assert.match(TAB_BAR, /class="ws-tab-groups" role="presentation"><span class="tab-group-label" role="presentation"/,
    '组名行须为 role=presentation 容器，组名为非按钮文本');
  // 箭头与页签同处页签行（共轴），不再压住组名行。
  assert.match(html, /class="ws-tab-row">[\s\S]*ws-tab-arrow--left[\s\S]*ws-tab-scroll[\s\S]*ws-tab-arrow--right/,
    '左右箭头须与页签同处 .ws-tab-row');
  // 右侧动作随组名行移出页签行（DOM 仍在滚动容器闭合之后）。
  assert.ok(html.indexOf('${extraSlot}') > html.indexOf('</div></div>'),
    '右侧动作须留在页签滚动容器之外');
  // 溢出时给「还有 N 个」按钮，与箭头共用滚动逻辑。
  assert.match(TAB_BAR, /data-tab-more/, '缺少「还有 N 个」溢出提示');
  assert.match(TAB_BAR, /more\.hidden = rest === 0/, '「还有 N 个」应随剩余页签数量显隐');
  assert.match(TAB_BAR, /more\?\.addEventListener\('click'/, '「还有 N 个」点击应滚动页签条');
});

test('T7 分层样式（2026-10-27 Task 6.2）：组名行与页签行分列、1440 放开宽度、组名不隐藏', () => {
  assert.match(CSS, /\.ws-tab-shell\s*\{[^}]*flex-wrap:\s*wrap/, '.ws-tab-shell 须允许两行');
  assert.match(CSS, /\.ws-tab-groups\s*\{[^}]*margin-right:\s*auto/, '组名行须与右侧动作分列两端');
  assert.match(CSS, /\.ws-tab-row\s*\{[^}]*display:\s*flex[^}]*position:\s*relative/,
    '.ws-tab-row 须为定位 flex 行（箭头以它为定位基准）');
  assert.match(CSS, /\.ws-tab-row\s*\{[^}]*flex:\s*1 0 100%/, '.ws-tab-row 须独占一行');
  assert.match(CSS, /@media \(min-width: 1281px\) \{[\s\S]*?\.ws-tab-scroll \{ padding-right: 0; \}/,
    '1440 须放开到容器可用宽度（不再给覆盖式箭头留 40px）');
  // 组名全宽可见：任何断点都不得用 display:none / visibility:hidden 隐藏组名。
  assert.doesNotMatch(CSS, /\.tab-group-label[^{}]*\{[^}]*display:\s*none/, '组名不得用 display:none 隐藏');
  assert.doesNotMatch(CSS, /\.tab-group-label[^{}]*\{[^}]*visibility:\s*hidden/, '组名不得用 visibility:hidden 隐藏');
});
