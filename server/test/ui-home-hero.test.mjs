// role: [工程师]+[AI]
// ui-home-hero.test.mjs — 首页「抬头式」品牌块守卫（2026-10-19 · 支书裁定恢复）
//
// 背景：批次 480（661928088）删除了首页 `<img party_emblem.png>` + `<h2>示例支部名</h2>`；
//       2026-10-19 支书明确要求恢复，且不得写死示例支部名。
//
// 判据：
//   E1 index.html 在 #dashboard-stats 之前有 #dashboard-hero 抬头块（党徽 + 标题）；
//      **2026-10-20 支书裁定：删除副标题**（「组织生活与工作台账」只是标题复述），故 E1 反向断言其不存在；
//   E2 抬头标题用专属 id（#dashboard-hero-title），main-entry.js 不按区块标题选择器覆写；
//   E3 main-entry.js 引入 getHeaderTitle，并按 user 分支设置标题；
//   E4 index.html 不出现硬编码示例支部名「光华管理学院本科生党支部」；
//   E5 非空转自检：上述正则对正样本命中、对负样本不命中（防止空转假绿）。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const INDEX = join(ROOT, 'docs', 'index.html');
const MAIN_ENTRY = join(ROOT, 'docs', 'src', 'entries', 'pages', 'main-entry.js');

const indexHtml = readFileSync(INDEX, 'utf8');
const mainSource = readFileSync(MAIN_ENTRY, 'utf8');

// ── 正则：页面结构 ──
const HERO_BLOCK_RE = /<div\b[^>]*\bid="dashboard-hero"[^>]*>([\s\S]*?)<\/div>/;
const EMBLEM_RE = /<img\b[^>]*\bsrc="\.\/assets\/images\/party_emblem\.png"[^>]*\balt="党徽"[^>]*>/;
const HERO_TITLE_RE = /<h2\b[^>]*\bid="dashboard-hero-title"[^>]*>/;
const HERO_SUBTITLE_RE = /<p\b[^>]*\bid="dashboard-hero-subtitle"[^>]*>/;

// ── 正则：main-entry.js 接线 ──
const IMPORT_RE = /import\s*\{[^}]*\bgetHeaderTitle\b[^}]*\}\s*from\s*['"]\.\.\/\.\.\/services\/branch\/branch\.js\?v=\d{8}[a-z]['"]/;
const TITLE_CALL_RE = /heroTitleEl\.textContent\s*=\s*user\s*\?\s*getHeaderTitle\(user\.personId\)\s*:\s*getHeaderTitle\(\)/;
const OLD_SELECTOR_RE = /querySelector\(\s*['"]#view-dashboard h2\.font-title-cn['"]\s*\)/;

test('E1 首页抬头块：党徽 + 标题，位于统计卡之前；副标题已裁删', () => {
  const hero = indexHtml.match(HERO_BLOCK_RE);
  assert.ok(hero, 'index.html 缺 #dashboard-hero 抬头块');
  const block = hero[0];
  assert.match(block, EMBLEM_RE, '抬头块缺党徽 img（./assets/images/party_emblem.png，alt=党徽）');
  assert.match(block, HERO_TITLE_RE, '抬头块缺 #dashboard-hero-title');
  assert.doesNotMatch(block, HERO_SUBTITLE_RE,
    '抬头块不得再渲染 #dashboard-hero-subtitle（2026-10-20 支书裁定：职责/口号副标题全删）');
  assert.ok(
    indexHtml.indexOf('id="dashboard-hero"') < indexHtml.indexOf('id="dashboard-stats"'),
    '#dashboard-hero 必须位于 #dashboard-stats 之前',
  );
});

test('E2 标题走专属 id，不用区块标题选择器误伤其他 H2', () => {
  assert.match(mainSource, /getElementById\(\s*['"]dashboard-hero-title['"]\s*\)/, 'main-entry.js 应按 #dashboard-hero-title 取标题节点');
  assert.doesNotMatch(mainSource, OLD_SELECTOR_RE, 'main-entry.js 不得再用 #view-dashboard h2.font-title-cn 选择器');
});

test('E3 main-entry.js 引入 getHeaderTitle 并按 user 分支设置标题', () => {
  assert.match(mainSource, IMPORT_RE, 'main-entry.js 未从 services/branch/branch.js 引入 getHeaderTitle');
  assert.match(
    mainSource,
    TITLE_CALL_RE,
    'main-entry.js 未按 `user ? getHeaderTitle(user.personId) : getHeaderTitle()` 设置抬头标题',
  );
});

test('E4 首页不硬编码示例支部名', () => {
  assert.ok(!indexHtml.includes('光华管理学院本科生党支部'), 'index.html 不得写死示例支部名');
});

test('E5 非空转自检：正则正样本命中、负样本不命中', () => {
  const posHtml = '<div class="text-center mb-6" id="dashboard-hero">'
    + '<img src="./assets/images/party_emblem.png" alt="党徽" class="mx-auto mb-3">'
    + '<h2 id="dashboard-hero-title" class="font-title-cn">党支部工作台</h2>'
    + '</div>';
  assert.match(posHtml, HERO_BLOCK_RE);
  assert.match(posHtml, EMBLEM_RE);
  assert.match(posHtml, HERO_TITLE_RE);
  assert.doesNotMatch(posHtml, HERO_SUBTITLE_RE);
  assert.doesNotMatch('<div id="dashboard-stats"></div>', HERO_BLOCK_RE);
  assert.doesNotMatch('<img src="./assets/images/other.png" alt="党徽">', EMBLEM_RE);
  assert.doesNotMatch('<h2 class="font-title-cn">重要通知</h2>', HERO_TITLE_RE);
  assert.match('<p id="dashboard-hero-subtitle" class="text-sm">x</p>', HERO_SUBTITLE_RE,
    '副标题正则须能识别回潮元素（反向断言依赖它）');

  const posImport = "import { getHeaderTitle } from '../../services/branch/branch.js?v=20261023c';";
  const negImport = "import { getHeaderTitle } from '../../services/branch/branch.js';";
  assert.match(posImport, IMPORT_RE);
  assert.doesNotMatch(negImport, IMPORT_RE);

  const posCall = 'heroTitleEl.textContent = user ? getHeaderTitle(user.personId) : getHeaderTitle();';
  const negCall = 'heroTitleEl.textContent = getHeaderTitle();';
  assert.match(posCall, TITLE_CALL_RE);
  assert.doesNotMatch(negCall, TITLE_CALL_RE);

  assert.match("document.querySelector('#view-dashboard h2.font-title-cn')", OLD_SELECTOR_RE);
  assert.doesNotMatch("document.getElementById('dashboard-hero-title')", OLD_SELECTOR_RE);
});
