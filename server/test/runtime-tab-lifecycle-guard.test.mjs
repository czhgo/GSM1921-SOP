// role: [工程师]+[AI]
// runtime-tab-lifecycle-guard.test.mjs — Tab 运行时正确性守卫（2026-10-25 Task 1）
//
// 判据来源：`.trae/specs/restore-visual-hierarchy-and-runtime/spec.md`
//   「Requirement: Tab 渲染生命周期」「Requirement: 绑定幂等」＋ checklist「运行时正确性」节。
//
// 覆盖 5 条根因（逐条非空转）：
//   R1 renderCtx 取最新 state（不是建栏时一次性常量）——含「切月 → 切走 → 切回」行为用例；
//   R2 `_safeRender` / `_renderCurrentTab` 共用同一生命周期（seq / 去重 / 清 marker / await）；
//   R3 陈旧写回先恢复快照、失败落错误卡（行为用例：render 抛错 ⇒ 容器出现错误卡）；
//   R4 loading 占位 8s 超时恢复（行为用例：promise 永不落定 ⇒ 解除灰化 + 「加载超时」）；
//   R5 绑定标记不挂持久容器（改挂被重建元素自身 / 事件委托）。
//
// 运行：cd server; node --test test/runtime-tab-lifecycle-guard.test.mjs
// 故障注入（人工验证非空转）：把 workspace-shell 的 `renderCtx: () => _renderCtx(getAppState())`
//   改回 `renderCtx: _renderCtx(state)` → R1 静态断言 + 行为用例同时转红；把
//   `delete el.dataset.currentTab` 删掉 → R2 转红；把 `TAB_LOADING_TIMEOUT_MS` 改为 0/删掉 → R4 转红。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  renderTabBar, mountTabFailure, TAB_LOADING_TIMEOUT_MS,
} from '../../docs/src/components/shell/tab-bar.js?v=20261031a';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const SHELL = read('docs/src/components/shell/workspace-shell.js');
const TAB_BAR = read('docs/src/components/shell/tab-bar.js');
const CALENDAR_TAB = read('docs/src/entries/tabs/secretary/calendar-tab.js');
const ACTIVITIES_TAB = read('docs/src/entries/tabs/visitor/activities-tab.js');
const TALENT_TAB = read('docs/src/entries/tabs/org/talent-tab.js');
const SECRETARY_ENTRY = read('docs/src/entries/workspace/ws-secretary-entry.js');
const OVERVIEW_TAB = read('docs/src/entries/tabs/secretary/overview-tab.js');
const CALENDAR_ENGINE = read('docs/src/components/record/calendar.js');
// Task 2（2026-10-26）关键性能：延迟可配 / 单次 loadDB / 首屏不阻塞 / hover 与观察器
const MOCK_SERVICE = read('docs/src/services/core/mock.js');
const MOCK_ADAPTER = read('docs/src/data/mock-adapter.js');
const BOOTSTRAP = read('docs/src/core/boot/bootstrap.js');
const CROSS_PAGE = read('docs/src/core/session/cross-page-state.js');

/** 最小 DOM 桩：tab-bar 的渲染链在 node 侧只用到 getElementById / querySelector。 */
function stubDocument(el = null) {
  globalThis.document = { getElementById: () => el, querySelector: () => null };
}

/** 内容容器桩（足够跑 _beginTabLoading / _endTabLoading / 错误卡）。 */
function fakeContentEl() {
  const el = {
    dataset: {},
    innerHTML: '',
    style: {},
    classList: { add() {}, remove() {} },
    querySelector: () => null,
    querySelectorAll: () => [],
    previousElementSibling: null,
    setAttribute() {},
  };
  return el;
}

// ── R1 renderCtx 最新态 ─────────────────────────────────────────────

test('R1 壳必须传函数给 tab-bar（renderCtx 不是一次性常量）', () => {
  assert.ok(SHELL.length > 5000, 'workspace-shell 读取失败（守卫口径失效）');
  assert.match(SHELL, /renderCtx: \(\) => _renderCtx\(getAppState\(\)\)/,
    '渲染上下文必须是函数（每次点击取最新 state），不得建栏时快照');
  assert.doesNotMatch(SHELL, /renderCtx: _renderCtx\(state\)/,
    '不得回退到「建栏时一次性求值」的冻结渲染上下文');
  assert.match(TAB_BAR, /typeof renderCtx === 'function' \? renderCtx\(\) : renderCtx/,
    'tab-bar 必须在渲染时解析函数型 renderCtx');
});

test('R1 行为：切月 → 切走 → 切回，三个 tab 都拿到最新 state', async () => {
  stubDocument(null);
  const seen = [];
  let month = '2026-08';
  const tabs = [
    { id: 'calendar', label: '活动管理', render: (ctx) => { seen.push(['calendar', ctx.month]); return Promise.resolve(); } },
    { id: 'overview', label: '全局概况', render: (ctx) => { seen.push(['overview', ctx.month]); return Promise.resolve(); } },
  ];
  const bar = renderTabBar({
    prefix: 'rg',
    tabs,
    accentColor: {},
    defaultTab: 'calendar',
    renderCtx: () => ({ month }),
  });
  await bar.activate('calendar');
  month = '2026-09';                       // 切月 = setState 后 state 已更新
  await bar.activate('overview');          // 切走
  await bar.activate('calendar');          // 切回
  assert.deepEqual(
    seen.filter(([id]) => id === 'calendar').map(([, m]) => m),
    ['2026-08', '2026-09'],
    '切回时必须按最新月份渲染（不得复现旧快照）',
  );
});

// ── R2 统一渲染生命周期 ─────────────────────────────────────────────

test('R2 _renderCurrentTab 走 tab-bar 同一生命周期（清 marker / seq / 去重 / await）', () => {
  assert.ok(TAB_BAR.length > 5000, 'tab-bar 读取失败（守卫口径失效）');
  assert.match(SHELL, /return _tabBar\.renderCurrent\(_renderCtx\(state\)\)/,
    '状态刷新必须复用 tab-bar 的 renderCurrent（同一套生命周期）');
  assert.doesNotMatch(SHELL, /tab\.render\(/,
    'workspace-shell 不得再直调 tab.render（会绕过 seq / 清 marker / 陈旧纠正）');
  // 2026-10-26 Task 2.4：renderCurrent 内新增 `_backgroundRender` 开关（状态驱动刷新不铺占位），
  //   委托关系不变——窗口从 160 放宽到 400，断言目标仍是「必须委托 _safeRender」。
  assert.match(TAB_BAR, /function renderCurrent\(ctx\) \{[\s\S]{0,400}?return _safeRender\(tab, ctx\)/,
    'renderCurrent 必须委托 _safeRender');
  assert.match(TAB_BAR, /delete el\.dataset\.currentTab/, '渲染前必须清 dataset.currentTab（守卫型 tab 才会重建骨架）');
  assert.match(TAB_BAR, /const seq = \+\+_renderSeq/, '必须有渲染序号');
  assert.match(TAB_BAR, /_renderInFlight\.set\(tab\.id, p\)/, '必须有 in-flight 去重');
  assert.match(TAB_BAR, /await|Promise\.resolve\(rendered\)\.then/, '必须等待 Promise（不得只 catch 不等待）');
});

test('R2 activate 返回 Promise，壳可等待首次渲染完成', () => {
  assert.match(TAB_BAR, /return _safeRender\(tab, ctx\);/, 'activate 必须返回渲染 Promise');
  assert.match(SHELL, /_firstRender = _tabBar\.activate\(_tabBar\.activeTab\)/,
    '壳应接住首次渲染 Promise');
  assert.match(SHELL, /get firstRender\(\) \{ return _firstRender; \}/, '壳应暴露 firstRender 供等待');
});

// ── R3 陈旧写回 / 失败可见 ──────────────────────────────────────────

test('R3 陈旧写回先恢复上一快照，失败落错误卡（不留半截 DOM）', () => {
  assert.match(TAB_BAR, /_lastGoodSnapshot = cur\.innerHTML/, '成功渲染后应保存完好快照');
  assert.match(TAB_BAR, /_restoreLastGood\(\);\s*\n\s*_rerenderCurrent\(\);/, '陈旧 / 失败分支应先恢复快照再纠正当前 tab');
  assert.match(TAB_BAR, /message: '这个页签暂时没加载出来'/, '失败必须落可见错误卡');
  assert.match(TAB_BAR, /onRetry: \(\) => \{[\s\S]{0,200}?_safeRender\(tab\);/, '错误卡必须带重试');
});

test('R3 行为：render 抛错时容器出现错误卡（不是空白 / 静默）', async () => {
  const el = fakeContentEl();
  stubDocument(el);
  const bar = renderTabBar({
    prefix: 're',
    tabs: [{ id: 'boom', label: '坏页签', render: () => { throw new Error('boom'); } }],
    accentColor: {},
    defaultTab: 'boom',
  });
  await bar.activate('boom');
  assert.match(el.innerHTML, /data-ws-tab-error/, '失败后应渲染统一错误卡');
  assert.match(el.innerHTML, /重试/, '错误卡应带重试按钮');
});

// ── R4 loading 超时 ────────────────────────────────────────────────

test('R4 loading 占位有 ≤8s 超时，超时停止动画并解除灰化', () => {
  assert.ok(TAB_LOADING_TIMEOUT_MS > 0 && TAB_LOADING_TIMEOUT_MS <= 8000,
    `占位超时必须 >0 且 ≤8s（实际 ${TAB_LOADING_TIMEOUT_MS}）`);
  assert.match(TAB_BAR, /_armLoadingTimeout\(el\)/, '占位启动必须挂超时');
  assert.match(TAB_BAR, /el\.innerHTML = tabErrorCardHtml\('加载超时'\)/, '超时必须给可见「加载超时」');
  assert.match(TAB_BAR, /_endTabLoading\(\);[\s\S]{0,120}?tabErrorCardHtml\('加载超时'\)/,
    '超时须先解除灰化 / pointer-events:none（停动画）再显示提示');
  assert.match(TAB_BAR, /el\.dataset\.wsTabLoading !== '1'\) return;/, '超时回调需防已正常收尾后的误触发');
});

test('R4 行为：渲染 promise 永不落定时超时移除占位并恢复可点', async () => {
  const el = fakeContentEl();
  stubDocument(el);
  const realSetTimeout = globalThis.setTimeout;
  let fire = null;
  globalThis.setTimeout = (fn, ms) => {
    if (ms === TAB_LOADING_TIMEOUT_MS) { fire = fn; return 1; }
    return realSetTimeout(fn, ms);
  };
  try {
    const bar = renderTabBar({
      prefix: 'rt',
      tabs: [{ id: 'slow', label: '慢页签', render: () => new Promise(() => {}) }],
      accentColor: {},
      defaultTab: 'slow',
    });
    bar.activate('slow');
    assert.equal(el.dataset.wsTabLoading, '1', '渲染启动后应进入占位态');
    assert.ok(typeof fire === 'function', '占位必须挂上超时回调');
    fire();
    assert.equal(el.dataset.wsTabLoading, undefined, '超时后必须清占位标记（不再永久灰化）');
    assert.equal(el.style.pointerEvents, '', '超时后必须恢复可点');
    assert.match(el.innerHTML, /加载超时/, '超时后应显示「加载超时」');
    assert.doesNotMatch(el.innerHTML, /animate-(pulse|spin)/, '超时后不得继续无限动画');
  } finally {
    globalThis.setTimeout = realSetTimeout;
  }
});

// ── R5 绑定幂等 ────────────────────────────────────────────────────

test('R5 绑定标记不挂持久容器：改挂被重建元素自身 / 事件委托', () => {
  assert.ok(CALENDAR_TAB.length > 5000 && ACTIVITIES_TAB.length > 3000 && TALENT_TAB.length > 3000,
    '三个页签文件读取失败（守卫口径失效）');
  // 活动管理筛选：逐控件 dataset.bound（控件随骨架重建 ⇒ 新控件会重新绑定）
  assert.doesNotMatch(CALENDAR_TAB, /dataset\.calFiltersBound/, '不得再挂持久容器绑定标记 calFiltersBound');
  assert.match(CALENDAR_TAB, /el\.dataset\.bound = '1'/, '筛选控件应逐控件标记');
  assert.match(CALENDAR_TAB, /const clear = document\.getElementById\('cal-filter-clear'\)/,
    '清除按钮也应逐控件绑定（离开再回来仍生效）');
  // 成员台活动动态：委托挂到每次新建的 #visitor-act-view
  assert.doesNotMatch(ACTIVITIES_TAB, /dataset\.organizerEntryBound/, '不得再挂持久容器绑定标记 organizerEntryBound');
  assert.match(ACTIVITIES_TAB, /const actView = tc\.querySelector\('#visitor-act-view'\)/, '委托应挂视图宿主');
  // 组织台人才库：委托挂到每次新建的 #talent-list
  assert.doesNotMatch(TALENT_TAB, /dataset\.talentJumpBound/, '不得再挂持久容器绑定标记 talentJumpBound');
  assert.match(TALENT_TAB, /const talentList = container\.querySelector\('#talent-list'\)/, '委托应挂列表宿主');
});

// ── 静默早退 / 无 catch 的 import ──────────────────────────────────

test('R6 页内 import / 节点缺失均有可见失败态（错误卡 + 重试或 toast）', () => {
  assert.match(SECRETARY_ENTRY, /import\('\.\.\/\.\.\/entries\/tabs\/secretary\/calendar-tab\.js\?v=\d{8}[a-z]'\)[\s\S]{0,300}?\.catch\(/,
    '「写入活动」动态 import 必须接住失败');
  assert.match(SECRETARY_ENTRY, /「写入活动」面板加载失败，请重试/, '失败须给可见提示');
  assert.match(OVERVIEW_TAB, /import\('\.\.\/\.\.\/\.\.\/components\/record\/insight-view\.js\?v=\d{8}[a-z]'\)[\s\S]{0,600}?\.catch\(/,
    '知情查看卡 import 必须接住失败');
  assert.match(OVERVIEW_TAB, /mountTabFailure\(body, \{ message: '知情查看卡加载失败，重试'/,
    '知情报卡失败须原位错误卡 + 重试');
  assert.match(CALENDAR_ENGINE, /if \(!grid\) \{[\s\S]{0,400}?mountTabFailure\(host, \{/,
    '日历节点缺失须落错误卡');
  assert.match(CALENDAR_ENGINE, /showToast\('error', '日历加载失败，请重试'\)/, '宿主不可用须退 toast');
  assert.match(CALENDAR_TAB, /throw new Error\('\[calendar-tab\] 缺少内容容器/, '内容容器缺失不得静默 return');
  assert.match(OVERVIEW_TAB, /throw new Error\('\[overview-tab\] 缺少内容容器/, '概况容器缺失不得静默 return');
  assert.match(TAB_BAR, /export function mountTabFailure/, '页内失败态应有单一源');
});

// ── 回退页签提示 ────────────────────────────────────────────────────

test('R7 回退首个可见页签时必须给可见说明（不得点 A 亮 B 无提示）', () => {
  assert.match(TAB_BAR, /_fallbackNotices/, '回退提示应去重（同一请求只提示一次）');
  assert.match(TAB_BAR, /showToast\('info', `「\$\{from\}」不在本角色的可见页签，已回到「\$\{to\}」`\)/,
    '回退必须 toast 说明去向');
});

// ════════════════════════════════════════════════════════════════
//  Task 2（2026-10-26）：关键性能 —— 首屏 / 鼠标卡帧
//  判据来源：spec「Requirement: 关键性能预算」＋ tasks.md SubTask 2.1–2.4。
//  故障注入（人工验证非空转）：把 mock 延迟改回写死 600 → P1 转红；删 loadDB 幂等锁 →
//  P2 转红；把 bootstrap 的 Service 预加载改回 `await Promise.all` → P3 转红；
//  把 hover 浮窗改回「先 innerHTML 后 getBoundingClientRect」→ P4 转红。
// ════════════════════════════════════════════════════════════════

test('P1 600ms 不再写死：默认 ≤120ms，可由 window.__MOCK_DELAY_MS / MOCK_DELAY_MS 覆盖', async () => {
  assert.doesNotMatch(MOCK_SERVICE, /MOCK_DELAY_MS\s*=\s*600/, 'services/core/mock.js 不得再写死 600ms');
  assert.match(MOCK_SERVICE, /mockDelayMs\(\)/, 'services 侧延迟必须取同一可配置源');
  assert.match(MOCK_ADAPTER, /export function mockDelayMs\(\)/, '延迟解析必须是单一导出源');
  assert.match(MOCK_ADAPTER, /__MOCK_DELAY_MS/, '浏览器侧必须可用 window.__MOCK_DELAY_MS 覆盖');
  assert.match(MOCK_ADAPTER, /MOCK_DELAY_MS/, 'node 侧必须可用环境变量覆盖');
  const def = Number((/const DEFAULT_MOCK_DELAY_MS = (\d+)/.exec(MOCK_ADAPTER) || [])[1]);
  assert.ok(Number.isFinite(def) && def <= 120, `默认延迟必须 ≤120ms（实际 ${def}）`);
  assert.match(MOCK_ADAPTER, /function _withDelay\(fn, delayMs = mockDelayMs\(\)\)/,
    '所有 mock 写口/读口的延迟必须走可配置源');

  // 行为：覆盖优先级 + 默认值（不依赖浏览器）
  const { mockDelayMs } = await import('../../docs/src/data/mock-adapter.js?v=20261031a');
  const envKey = 'MOCK_DELAY_MS';
  const oldEnv = process.env[envKey];
  try {
    delete globalThis.window;
    delete process.env[envKey];
    assert.equal(mockDelayMs(), def, '无覆盖时取默认值');
    process.env[envKey] = '600';
    assert.equal(mockDelayMs(), 600, '环境变量可显式恢复 600ms（测试/慢网演示）');
    globalThis.window = { __MOCK_DELAY_MS: 0 };
    assert.equal(mockDelayMs(), 0, 'window.__MOCK_DELAY_MS 优先（0 = 不延迟）');
  } finally {
    delete globalThis.window;
    if (oldEnv === undefined) delete process.env[envKey]; else process.env[envKey] = oldEnv;
  }
});

test('P2 双 loadDB 收敛为一次：mock-adapter 页面级幂等锁（重复调用直接返回）', () => {
  assert.match(MOCK_ADAPTER, /let _loadDbDone = false/, '必须有页面级加载锁');
  assert.match(MOCK_ADAPTER, /if \(_loadDbDone && mockDB\._loaded === true\) return false;/,
    '已加载完成时重复调用必须直接复用（返回 false 表示未重跑）');
  assert.match(MOCK_ADAPTER, /_loadDbDone = true;/, '首次加载完成后置锁');
  assert.match(MOCK_SERVICE, /if \(MockAdapter\.loadDB\(\) === false\) return;/,
    'services/core/mock.js 必须跳过重复调用的收尾（版本戳重置 / 策略注入）');
  // 工作台壳与 data-loader 两处调用点保留（header 需要先有 branches），由锁合并为一次真实加载
  assert.match(SHELL, /BranchService\.loadDB\(\)/, '壳仍需在 bootstrapPage 前恢复 branches（header 标题）');
  assert.match(read('docs/src/data/data-loader.js'),
    /if \(typeof BranchService\.loadDB === 'function'\) BranchService\.loadDB\(\)/,
    'data-loader Step1 保持单一入口（由锁复用）');
});

test('P3 首屏不阻塞：IssueStore/MilestoneStore 只发起不 await；版本过期才 reload', () => {
  assert.doesNotMatch(BOOTSTRAP, /await Promise\.all\(\[\s*IssueStore\.loadAll\(\)/,
    '不得再串行 await 反馈/里程碑后再进 tab 壳（会推迟页签栏与首屏内容）');
  assert.match(BOOTSTRAP, /Promise\.all\(\[\s*IssueStore\.loadAll\(\),\s*MilestoneStore\.loadAll\(\),\s*\]\)\.catch/,
    '两者应并行发起并各自接住失败（不阻塞壳）');
  assert.doesNotMatch(BOOTSTRAP, /bumpDataVersion/, '版本自检不得再用 +1 递增（永远差一版 → 每次会话双载）');
  assert.match(CROSS_PAGE, /raw === null \|\| raw === ''/, '首次访问只记基线，不得 reload');
  assert.match(CROSS_PAGE, /localStorage\.setItem\(DATA_VERSION_KEY, String\(CODE_VERSION\)\)/,
    '版本不一致时写回当前 CODE_VERSION（reload 后即相等）');
});

test('P4 hover 浮窗先读后写 + 阴影降档；全局扫描器只看新增节点', () => {
  const start = CALENDAR_ENGINE.indexOf('function _showHoverPopover');
  assert.ok(start > 0, '未找到 hover 浮窗实现（守卫口径失效）');
  const body = CALENDAR_ENGINE.slice(start, start + 3000);
  const measure = body.indexOf('getBoundingClientRect');
  const write = body.indexOf('_hoverPopover.innerHTML');
  assert.ok(measure > 0 && write > 0, '浮窗必须同时有测量与写入');
  assert.ok(measure < write, '必须先 getBoundingClientRect 再写 innerHTML（避免写后读布局的强制回流）');
  assert.match(body, /box-shadow:0 4px 12px rgba\(0,0,0,0\.10\)/, '浮窗阴影须降一档（面积 24→12、模糊 8→4）');

  assert.match(BOOTSTRAP, /for \(const n of m\.addedNodes\) _scheduleEnhance\(n\)/,
    'MutationObserver 只处理新增节点，不得每次 DOM 变更全文档扫描');
  assert.doesNotMatch(BOOTSTRAP, /new MutationObserver\(_scheduleEnhance\)/,
    '不得回退到「任何变更 → 全文档扫描」的旧写法');
  // 全文档扫描只允许保留「首次一次」（静态 HTML 的既有 select）；增量收尾函数里不得再全文档扫描。
  const flushStart = BOOTSTRAP.indexOf('function _flushEnhance');
  assert.ok(flushStart > 0, '缺少增量扫描收尾函数');
  const flushBody = BOOTSTRAP.slice(flushStart, flushStart + 900);
  assert.doesNotMatch(flushBody, /enhanceSelects\(document\)/,
    '增量扫描不得每次全文档 querySelectorAll（只看新增子树）');
  assert.equal((BOOTSTRAP.match(/enhanceSelects\(document\)/g) || []).length, 2,
    '全文档扫描只保留首帧那一次（readyState 两分支各一处），不得进入变更回调链');
  assert.match(BOOTSTRAP, /root\.querySelector\('select\.input-flat:not\(\[data-cs-enhanced\]\)'\)/,
    '只扫描新增子树且跳过无 select 的根');
});

test('P5 状态驱动刷新不阻塞 hover：后台渲染不铺占位 / 不置灰', () => {
  assert.match(TAB_BAR, /let _backgroundRender = false/, '必须有「后台刷新」开关');
  assert.match(TAB_BAR, /if \(!_backgroundRender\) _beginTabLoading\(\);/,
    '后台数据到达时不得 pointer-events:none / 压暗 / 插 loading 行（会打断 hover）');
  assert.match(TAB_BAR, /_backgroundRender = true;/, 'renderCurrent 必须标记后台刷新');
});
