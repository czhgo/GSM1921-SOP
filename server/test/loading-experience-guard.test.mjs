// role: [工程师]+[AI]
// loading-experience-guard.test.mjs — 加载体验守卫（2026-10-27 · refine-ui-three-lenses 阶段三 Task 10）
//
// 判据来源：`.trae/specs/refine-ui-three-lenses/spec.md`「Requirement: 加载守卫」＋ checklist
//   「页签切换超过 120ms 出现 skeleton + “正在加载”／新内容 150–200ms 交叉淡入／总等待 ≤1s／
//    不再整块 opacity 压暗 + 插加载行硬替换／页面跳转有顶部进度条或内容 skeleton／
//    prefers-reduced-motion 只淡入 80ms 无位移、skeleton 与文案保留」。
//
// 判据（L1–L7，逐条给理由）：
//   L1 骨架：`tabContentSkeletonHtml` 默认文案「正在加载…」+ 3 条卡形行 + spinner +
//      `data-ws-tab-loading-bar`（既有 tab 用它判断「我的骨架还在」）；
//   L2 延迟：骨架只在超过 120ms 后出现（快速渲染不闪骨架，不得同步硬替换）；
//   L3 交叉淡入：旧内容淡出 120ms，新内容淡入 180ms + 8px 位移（150–200ms 区间）；
//   L4 总等待：动效编排预算常量 = 1000ms（数据等待仍由 8s 超时错误卡兜底）；
//   L5 无「整块压暗 + 硬替换」：零 `opacity = '0.45'`、零加载文本行插入；
//   L6 reduced-motion：`@media (prefers-reduced-motion: reduce)` 只淡入 80ms、无位移，
//      骨架 / 文案保留；JS 侧同一分支；
//   L7 页面跳转：顶部 2px 品牌色进度条 + 离开淡出；落地首屏骨架仍由 workspace-shell 复用同一函数。
//
// 故障注入（机检，见「故障注入」用例）：删掉骨架行 / 把延迟改 0 / 恢复 `opacity = '0.45'`
//   + 插加载行 / 删 reduced-motion 分支 ⇒ `loadingExperienceProblems()` 必须逐条判出。
//
// 运行：cd server; node --test test/loading-experience-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  renderTabBar, tabContentSkeletonHtml,
  TAB_LOADING_SKELETON_DELAY_MS, TAB_CONTENT_FADE_OUT_MS, TAB_CONTENT_FADE_IN_MS,
  TAB_CONTENT_FADE_IN_REDUCED_MS, TAB_LOADING_SKELETON_MAX_MS,
} from '../../docs/src/components/shell/tab-bar.js?v=20261028d';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const TAB_BAR = read('docs/src/components/shell/tab-bar.js');
const LOADING_CSS = read('docs/src/components/shell/tab-loading.css');
const SHELL = read('docs/src/components/shell/workspace-shell.js');

/** 取以 needle 开头的块的内部文本（大括号配对；与 motion-guard 同口径） */
function blockAfter(css, needle) {
  const i = css.indexOf(needle);
  if (i < 0) return '';
  const start = css.indexOf('{', i);
  if (start < 0) return '';
  let depth = 0;
  for (let p = start; p < css.length; p += 1) {
    if (css[p] === '{') depth += 1;
    else if (css[p] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(start + 1, p);
    }
  }
  return '';
}

/**
 * 纯函数判据（供真实源码与故障注入样本共用，防「正则写坏后恒绿」）。
 * @returns {string[]} problems（空数组＝通过）
 */
export function loadingExperienceProblems({ tabBar = '', css = '', shell = '' } = {}) {
  const problems = [];
  const need = (ok, msg) => { if (!ok) problems.push(msg); };

  // L1 骨架：文案 + 3 条卡形 + spinner + 既有标记
  need(/export function tabContentSkeletonHtml\(text = '正在加载…'\)/.test(tabBar),
    '骨架默认文案必须是「正在加载…」');
  need((tabBar.match(/ws-tab-skeleton-row(?![-\w])/g) || []).length >= 3,
    '骨架必须至少 3 条卡形行（与目标布局近似）');
  need(/data-ws-tab-loading-bar/.test(tabBar),
    '骨架必须保留 data-ws-tab-loading-bar（既有 tab 用它判断「我的骨架还在」）');
  need(/ws-tab-skeleton-spinner/.test(tabBar), '骨架必须含加载指示（spinner）');
  need(/role="status"/.test(tabBar) && /aria-live="polite"/.test(tabBar),
    '骨架必须是可访问的加载状态（role=status + aria-live=polite）');

  // L2 120ms 延迟：空容器立即铺；已有内容先用定时器
  need(new RegExp(`TAB_LOADING_SKELETON_DELAY_MS = ${TAB_LOADING_SKELETON_DELAY_MS}\\b`).test(tabBar),
    `骨架延迟必须是 ${TAB_LOADING_SKELETON_DELAY_MS}ms`);
  need(TAB_LOADING_SKELETON_DELAY_MS === 120, '骨架延迟必须恰为 120ms');
  need(/if \(!el\.innerHTML\.trim\(\)\)/.test(tabBar),
    '必须分支：空容器（首帧）立即铺骨架，已有内容（切页签）延迟铺');
  need(/_skeletonDelayTimer = _setTimer\([\s\S]{0,600}?TAB_LOADING_SKELETON_DELAY_MS\)/.test(tabBar),
    '切页签的骨架必须由 120ms 定时器触发（不得同步硬替换旧内容）');
  need(/el\.classList\.add\('is-leaving'\)/.test(tabBar), '超过 120ms 后必须先让旧内容淡出');

  // L3 淡出 120ms / 淡入 180ms + 8px
  need(TAB_CONTENT_FADE_OUT_MS === 120, '旧内容淡出必须 120ms');
  need(TAB_CONTENT_FADE_IN_MS === 180, '新内容淡入必须 180ms（150–200ms 区间）');
  need(/transition:\s*opacity 120ms/.test(css), 'CSS：旧内容淡出必须 120ms');
  need(/animation:\s*wsTabEnter 180ms/.test(css), 'CSS：新内容淡入必须 180ms');
  need(/translateY\(8px\)/.test(css), 'CSS：新内容淡入必须带 8px 位移');
  need(/_playContentEnter\(el\)/.test(tabBar), '渲染收尾必须播放入场（新内容淡入）');
  need(/if \(wasLoading\) _playContentEnter\(el\)/.test(tabBar),
    '后台状态刷新不得重放入场动画（只在本次确实进入过占位时淡入）');

  // L4 编排预算 ≤1s
  need(TAB_LOADING_SKELETON_MAX_MS === 1000, '动效编排预算必须恰为 1000ms');
  need(new RegExp(`TAB_LOADING_SKELETON_MAX_MS = ${TAB_LOADING_SKELETON_MAX_MS}\\b`).test(tabBar),
    '预算常量必须落到源码');
  need(/data-settled/.test(tabBar) && /data-settled/.test(css),
    '到 1s 后骨架应收敛为静态（data-settled，停止无限脉冲）');

  // L5 无整块压暗 / 无加载文本行 / 无硬替换
  need(!/opacity\s*=\s*'0\.45'/.test(tabBar), '不得恢复整块 opacity = 0.45 压暗');
  need(!/TAB_LOADING_BAR_HTML/.test(tabBar), '不得再插入顶部「加载中」文本行');
  need(!/insertAdjacentHTML\(\s*'afterbegin'/.test(tabBar), '不得往内容里前置插入加载行');
  need(/classList\.remove\('is-leaving'\)/.test(tabBar), '收尾必须摘掉淡出态（防残留半透明）');

  // L6 reduced-motion：只淡入 80ms、无位移；骨架 / 文案保留
  const reduce = blockAfter(css, '@media (prefers-reduced-motion: reduce)');
  need(!!reduce, 'CSS 缺 prefers-reduced-motion 分支');
  need(/transition-duration:\s*80ms\s*!important/.test(reduce), 'reduced-motion：淡出/过渡必须压到 80ms');
  need(/animation-duration:\s*80ms\s*!important/.test(reduce), 'reduced-motion：淡入必须压到 80ms');
  need(/wsTabEnterReduced/.test(reduce), 'reduced-motion：淡入必须改用无位移的关键帧');
  const reducedKf = blockAfter(css, '@keyframes wsTabEnterReduced');
  need(!!reducedKf && !/translateY/.test(reducedKf), 'reduced-motion 的关键帧不得有位移');
  need(/\.ws-tab-skeleton-row,?[\s\S]{0,120}?animation:\s*none/.test(reduce),
    'reduced-motion：骨架脉冲应关闭（骨架 / 文案仍保留）');
  need(TAB_CONTENT_FADE_IN_REDUCED_MS === 80, 'JS：reduced-motion 淡入必须 80ms');
  need(/_prefersReducedMotion\(\)/.test(tabBar), 'JS 必须有 reduced-motion 分支');

  // L7 页面跳转：顶部 2px 品牌色进度条 + 落地首屏骨架
  const bar = blockAfter(css, '.ws-route-progress {');
  need(!!bar && /height:\s*2px/.test(bar), '进度条必须高 2px');
  need(!!bar && /background:\s*var\(--app-accent/.test(bar), '进度条必须用品牌色 var(--app-accent)');
  need(/installNavigationProgress/.test(tabBar), '必须安装页面跳转进度条');
  need(/addEventListener\('pagehide', _showRouteProgress\)/.test(tabBar),
    'JS 主动跳转（location.href=）至少要在离开前显示进度条');
  need(/ROUTE_LEAVE_MS = 120/.test(tabBar), '离开前淡出必须 120ms');
  need(/tabContentSkeletonHtml\(\)/.test(shell), '落地首屏骨架必须复用 tabContentSkeletonHtml()');

  return problems;
}

test('L1–L7 真实源码通过全部加载体验判据', () => {
  const problems = loadingExperienceProblems({ tabBar: TAB_BAR, css: LOADING_CSS, shell: SHELL });
  assert.deepEqual(problems, [], `加载体验判据未通过：\n  ${problems.join('\n  ')}`);
  // 非空转：扫描面必须有规模
  assert.ok(TAB_BAR.length > 5000 && LOADING_CSS.length > 500,
    'tab-bar.js / tab-loading.css 读取失败（守卫口径失效）');
});

test('骨架 HTML：3 条卡形 + 「正在加载…」+ 既有 data 标记', () => {
  const html = tabContentSkeletonHtml();
  assert.match(html, /正在加载…/, '骨架应含「正在加载…」');
  assert.match(html, /data-ws-tab-loading-bar/, '骨架应保留 data-ws-tab-loading-bar');
  assert.equal((html.match(/ws-tab-skeleton-row(?![-\w])/g) || []).length, 3, '骨架应恰为 3 条卡形行');
  assert.match(html, /min-height:320px/, '骨架应有固定 min-height（防 0 高弹跳）');
  const custom = tabContentSkeletonHtml('正在载入');
  assert.match(custom, /正在载入/, '骨架文案应可替换');
});

test('L2 行为：快速渲染（<120ms）不闪骨架，直接淡入', async () => {
  const el = fakeContentEl('<p>旧内容</p>');
  withDocument(el);
  try {
    const bar = renderTabBar({
      prefix: 'le',
      tabs: [
        { id: 'a', label: 'A', render: () => { el.innerHTML = '<p>旧内容</p>'; return Promise.resolve(); } },
        { id: 'b', label: 'B', render: () => { el.innerHTML = '<p>新内容</p>'; return Promise.resolve(); } },
      ],
      accentColor: {},
      defaultTab: 'a',
    });
    await bar.activate('b');
    assert.doesNotMatch(el.innerHTML, /data-ws-tab-loading-bar/, '快速渲染不得出现骨架（避免闪烁）');
    assert.equal(el.dataset.wsTabLoading, undefined, '完成后必须清掉占位标记');
    assert.ok(el.classList.contains('is-entering'), '新内容应播放淡入');
    assert.doesNotMatch(el.style.opacity || '', /0\.45/, '不得整块压暗');
  } finally {
    restoreDocument();
  }
});

test('L2 行为：慢渲染（>120ms）出现骨架，完成后骨架移除并淡入', async () => {
  const el = fakeContentEl('<p>旧内容</p>');
  withDocument(el);
  try {
    let release = null;
    const gate = new Promise((resolve) => { release = resolve; });
    const bar = renderTabBar({
      prefix: 'lslow',
      tabs: [
        { id: 'a', label: 'A', render: () => { el.innerHTML = '<p>旧内容</p>'; return Promise.resolve(); } },
        {
          id: 'b',
          label: 'B',
          render: () => gate.then(() => { el.innerHTML = '<p>慢内容</p>'; }),
        },
      ],
      accentColor: {},
      defaultTab: 'a',
    });
    const pending = bar.activate('b');
    await wait(200);
    assert.ok(el.classList.contains('is-leaving'), '120ms 后旧内容应先淡出（此时尚未换骨架）');
    assert.doesNotMatch(el.innerHTML, /data-ws-tab-loading-bar/, '120ms 时不应立刻硬替换成骨架');
    await wait(140);
    assert.match(el.innerHTML, /data-ws-tab-loading-bar/, '超过 120ms + 淡出时长后应铺骨架');
    assert.match(el.innerHTML, /正在加载…/, '骨架应带「正在加载…」文案');
    release();
    await pending;
    assert.doesNotMatch(el.innerHTML, /data-ws-tab-loading-bar/, '完成后骨架必须移除');
    assert.match(el.innerHTML, /慢内容/, '完成后应显示新内容');
    assert.ok(el.classList.contains('is-entering'), '新内容应播放淡入');
    assert.equal(el.style.pointerEvents, '', '完成后必须恢复可点');
  } finally {
    restoreDocument();
  }
});

test('故障注入：删骨架 / 延迟归零 / 恢复压暗硬替换 / 删 reduced-motion ⇒ 逐条判红', () => {
  const base = { tabBar: TAB_BAR, css: LOADING_CSS, shell: SHELL };
  assert.deepEqual(loadingExperienceProblems(base), [], '基线源码应通过（否则注入判据无意义）');

  // ① 删掉骨架行
  const noSkeleton = { ...base, tabBar: TAB_BAR.replace(/ws-tab-skeleton-row/g, 'ws-tab-placeholder') };
  assert.ok(loadingExperienceProblems(noSkeleton).some((p) => p.includes('3 条卡形行')),
    '删掉骨架后必须判红');

  // ② 延迟改成 0（同步硬替换）
  const noDelay = { ...base, tabBar: TAB_BAR.replace(/TAB_LOADING_SKELETON_DELAY_MS = 120/, 'TAB_LOADING_SKELETON_DELAY_MS = 0') };
  assert.ok(loadingExperienceProblems(noDelay).some((p) => p.includes('120ms')),
    '取消 120ms 延迟后必须判红');

  // ③ 恢复「整块 opacity 压暗 + 插加载行硬替换」
  const dimmed = {
    ...base,
    tabBar: `${TAB_BAR}\nconst TAB_LOADING_BAR_HTML = '加载中…';\nfunction _legacyDim(el) { el.style.opacity = '0.45'; el.insertAdjacentHTML('afterbegin', TAB_LOADING_BAR_HTML); }`,
  };
  const dimProblems = loadingExperienceProblems(dimmed);
  assert.ok(dimProblems.some((p) => p.includes('0.45')), '恢复整块压暗必须判红');
  assert.ok(dimProblems.some((p) => p.includes('加载中')), '恢复插入加载行必须判红');

  // ④ 删掉 reduced-motion 分支
  const noReduce = { ...base, css: LOADING_CSS.replace(/@media \(prefers-reduced-motion: reduce\)/, '@media print') };
  const reduceProblems = loadingExperienceProblems(noReduce);
  assert.ok(reduceProblems.some((p) => p.includes('prefers-reduced-motion')), '删掉 reduced-motion 分支必须判红');
  assert.ok(reduceProblems.some((p) => p.includes('80ms')), '缺 80ms 淡入必须判红');
});

test('L7 页面跳转：进度条安装幂等，且在 node 环境静默跳过', async () => {
  const { installNavigationProgress } = await import('../../docs/src/components/shell/tab-bar.js?v=20261028d');
  assert.equal(typeof installNavigationProgress, 'function', '必须导出 installNavigationProgress');
  assert.doesNotThrow(() => installNavigationProgress(), 'node 环境（无 document/window）不得抛错');
  assert.match(LOADING_CSS, /\.ws-route-progress\[data-active='1'\]/, '进度条应有激活态');
});

// ── 测试桩 ─────────────────────────────────────────────────────────

function fakeContentEl(html = '') {
  const classes = new Set();
  return {
    dataset: {},
    style: {},
    innerHTML: html,
    classList: {
      add: (...names) => names.forEach((n) => classes.add(n)),
      remove: (...names) => names.forEach((n) => classes.delete(n)),
      contains: (n) => classes.has(n),
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    previousElementSibling: null,
    setAttribute() {},
    removeAttribute() {},
    get offsetWidth() { return 1; },
  };
}

let _prevDocument;
function withDocument(el) {
  _prevDocument = globalThis.document;
  globalThis.document = {
    getElementById: () => el,
    querySelector: () => null,
    querySelectorAll: () => [],
  };
}
function restoreDocument() {
  if (_prevDocument === undefined) delete globalThis.document;
  else globalThis.document = _prevDocument;
}

function wait(ms) {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}
