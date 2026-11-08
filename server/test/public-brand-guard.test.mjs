// role: [工程师]+[AI]
// public-brand-guard.test.mjs — 未登录公共门厅品牌与分流守卫（2026-11-08 批次 536 · Task 7）
//
// 由来：spec `add-committee-activities-and-public-portal`「未登录公共门厅」＋ D-858 决策 10
//   （门厅品牌＝「光华管理学院党建平台」+ 党徽）。未登录首页不再进入支部工作台，
//   也不得暴露任何具体支部名。
//
// 判据（静态读源码；不连服务、不开浏览器）：
//   P1 平台品牌「光华管理学院党建平台」出现在 index.html / login.html / branch.js；
//   P2 index.html 有 #view-public-portal（aria-labelledby → #public-portal-title）与登录入口，
//      且 #view-dashboard 仍在（登录态结构不删），门厅位于其后；
//   P3 main-entry.js 按登录态分流：if (user) → initDashboard；else → initPublicPortal；
//      loadWorkspaceData 只在 initDashboard 内（未登录不请求工作台数据）；
//   P4 未登录品牌不落到具体支部：branch.js 段⑤返回平台品牌；首页 / 登录页 / main-entry 不含演示支部名，
//      首页也不含 br-b1；演示支部名从 mock 种子派生（不在本文件另写第二份字面量）；
//   P5 门厅客户端只走 /api/public/*：不带 Authorization、不读 token、8 秒超时、下载地址走白名单前缀；
//   P6 非空转：分流正则与「演示支部名」扫描对植入样本能判出正 / 负例。
//
// 运行：`node --test server/test/public-brand-guard.test.mjs`（纯 node）
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const INDEX = join(ROOT, 'docs', 'index.html');
const LOGIN = join(ROOT, 'docs', 'login.html');
const MAIN_ENTRY = join(ROOT, 'docs', 'src', 'entries', 'pages', 'main-entry.js');
const BRANCH = join(ROOT, 'docs', 'src', 'services', 'branch', 'branch.js');
const CLIENT = join(ROOT, 'docs', 'src', 'data', 'public-portal-client.js');
const MOCK_BRANCHES = join(ROOT, 'docs', 'src', 'data', 'mock', 'branches.js');

const read = (file) => readFileSync(file, 'utf8');
const PLATFORM_BRAND = '光华管理学院党建平台';

/** 未登录 / 已登录分流（与 main-entry.js 同一形态；P6 用它做正负例自检） */
const SPLIT_RE = /if\s*\(user\)\s*\{\s*initDashboard\(\);\s*\}\s*else\s*\{\s*initPublicPortal\(\);/;

/** 从 mock 种子派生演示支部名（`name: '…', // 支部档案名`）——避免守卫里再写一份字面量 */
function demoBranchNameOf(source) {
  const m = /^\s*name:\s*'([^']+)',\s*\/\/\s*支部档案名/m.exec(source);
  return m ? m[1] : '';
}

const indexHtml = read(INDEX);
const loginHtml = read(LOGIN);
const mainSource = read(MAIN_ENTRY);
const branchSource = read(BRANCH);
const clientSource = read(CLIENT);
const mockBranchesSource = read(MOCK_BRANCHES);
const demoBranchName = demoBranchNameOf(mockBranchesSource);

test('P1 平台品牌出现在首页 / 登录页 / 顶栏品牌判定源', () => {
  assert.ok(indexHtml.includes(PLATFORM_BRAND), `index.html 缺平台品牌「${PLATFORM_BRAND}」`);
  assert.ok(loginHtml.includes(PLATFORM_BRAND), `login.html 缺平台品牌「${PLATFORM_BRAND}」`);
  assert.ok(branchSource.includes(PLATFORM_BRAND), `branch.js 缺平台品牌「${PLATFORM_BRAND}」`);
  assert.doesNotMatch(loginHtml, /党支部管理系统/, '登录页抬头不得再回退旧中性文案「党支部管理系统」');
  assert.match(indexHtml, /<title>光华管理学院党建平台 — GSM1921-SOP<\/title>/, '首页 <title> 应为平台品牌 + 产品名');
});

test('P2 首页有公共门厅容器与登录入口，工作台结构保留且排在其后', () => {
  assert.match(
    indexHtml,
    /<section\b[^>]*id="view-public-portal"[^>]*aria-labelledby="public-portal-title"/,
    '#view-public-portal 须是带可访问名称的 section',
  );
  assert.match(indexHtml, /id="public-portal-title"[^>]*>\s*光华管理学院党建平台\s*</, '门厅标题须为平台品牌');
  assert.match(indexHtml, /id="public-portal-login"/, '门厅缺登录入口');
  for (const id of ['public-portal-notices', 'public-portal-activities', 'public-portal-documents']) {
    assert.match(indexHtml, new RegExp(`id="${id}"`), `门厅缺区块容器 #${id}`);
  }
  assert.match(indexHtml, /id="public-portal-notices" class="[^"]*"[^>]*aria-busy="true"/,
    '门厅区块须带 aria-busy（加载完成后由 JS 撤）');
  assert.match(indexHtml, /id="view-dashboard"/, '不得删除 #view-dashboard（登录态工作台结构）');
  assert.ok(
    indexHtml.indexOf('id="view-dashboard"') < indexHtml.indexOf('id="view-public-portal"'),
    '#view-public-portal 应位于 #view-dashboard 之后',
  );
});

test('P3 main-entry 按登录态分流，未登录不调用 loadWorkspaceData', () => {
  assert.match(mainSource, SPLIT_RE,
    'main-entry.js 应为 `if (user) { initDashboard(); } else { initPublicPortal(); }` 分流');
  assert.equal((mainSource.match(/\bloadWorkspaceData\s*\(/g) || []).length, 1,
    'loadWorkspaceData 只允许一处调用（包在 initDashboard 内）');
  const initDashboardStart = mainSource.indexOf('function initDashboard');
  const loadWorkspaceStart = mainSource.indexOf('loadWorkspaceData(');
  assert.ok(initDashboardStart >= 0, 'main-entry.js 缺 initDashboard');
  assert.ok(loadWorkspaceStart > initDashboardStart,
    'loadWorkspaceData 必须在 initDashboard 内部（未登录分支不得触达）');
  assert.match(mainSource, /function initPublicPortal\s*\(/, 'main-entry.js 缺 initPublicPortal');
  assert.match(mainSource, /loadPublicPortal\(\)/, '门厅分流须调用 loadPublicPortal');
  assert.match(mainSource, /getElementById\('view-public-portal'\)/, 'initPublicPortal 须切到 #view-public-portal');
  assert.match(mainSource, /getElementById\('view-dashboard'\)[\s\S]{0,120}classList\.add\('hidden'\)/,
    '未登录须给 #view-dashboard 加 hidden');
});

test('P4 未登录品牌不落到具体支部名', () => {
  assert.ok(demoBranchName, '无法从 mock 种子解析演示支部名（派生口径失效）');
  assert.match(branchSource, new RegExp(`const PLATFORM_BRAND_TITLE = '${PLATFORM_BRAND}';`),
    'branch.js 须以常量承载平台品牌');
  assert.match(branchSource, /return \{ title: PLATFORM_BRAND_TITLE, segment: 5 \};/,
    '未登录 / 查无档案段（段⑤）须返回平台品牌');
  assert.doesNotMatch(branchSource, /GUEST_HEADER_PLACEHOLDER/, '未登录品牌不得再复用支部显示名占位');
  for (const [label, source] of [
    ['docs/index.html', indexHtml],
    ['docs/login.html', loginHtml],
    ['main-entry.js', mainSource],
    ['branch.js', branchSource],
  ]) {
    assert.ok(!source.includes(demoBranchName), `${label} 不得出现具体支部名「${demoBranchName}」`);
  }
  assert.ok(!indexHtml.includes('br-b1'), '首页静态壳不得出现支部 id「br-b1」');
});

test('P5 门厅客户端只走匿名 /api/public/*（无鉴权头、8 秒超时）', () => {
  // 只核「代码」不核注释：注释里的「不带 Authorization」是说明，不是实现
  const clientCode = clientSource
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').map((line) => line.replace(/\/\/.*$/, '')).join('\n');
  for (const path of ['/api/public/portal', '/api/public/notices/', '/api/public/activities/', '/api/public/documents/']) {
    assert.ok(clientCode.includes(path), `public-portal-client.js 缺公共端点 ${path}`);
  }
  assert.match(clientCode, /\/api\/public\/documents\/\$\{[^}]*\}\/download/,
    '下载地址须拼 `/api/public/documents/<id>/download`');
  assert.doesNotMatch(clientCode, /Authorization/, '门厅客户端不得带 Authorization');
  assert.doesNotMatch(clientCode, /sessionStorage|localStorage/, '门厅客户端不得读 token / 本地存储');
  assert.match(clientSource, /REQUEST_TIMEOUT_MS = 8000/, '门厅请求须有 8 秒超时');
});

test('P6 非空转：分流正则与演示支部名扫描能判出正 / 负例', () => {
  assert.match('if (user) { initDashboard(); } else { initPublicPortal(); }', SPLIT_RE);
  assert.doesNotMatch('if (user) { initDashboard(); }', SPLIT_RE, '缺 else 分支不得被判为已分流');
  assert.doesNotMatch('initDashboard(); initPublicPortal();', SPLIT_RE, '无登录态判断不得被判为已分流');
  assert.ok(mockBranchesSource.includes(demoBranchName), '演示支部名派生应能在种子源里命中');
  assert.ok(`<h1>${demoBranchName}</h1>`.includes(demoBranchName), '支部名扫描应能命中植入样本');
});
