// role: [工程师]+[AI]
// ui-home-hero.test.mjs — 首页「抬头式」品牌块守卫（2026-10-19 · 支书裁定恢复）
//
// 背景：批次 480（661928088）删除了首页 `<img party_emblem.png>` + `<h2>示例支部名</h2>`；
//       2026-10-19 支书明确要求恢复，且不得写死示例支部名。
//
// 判据：
//   E1 index.html 在 #dashboard-stats 之前有 #dashboard-hero 抬头块（党徽 + 标题）；
//      2026-10-28 支书裁定（DESIGN_SYSTEM §4.25 规则 4「首页 hero 豁免」）：**保留 hero**，
//      48px 党徽 ＋ 居中标题**仅限**「未登录 / 访客态」或「首屏无待办（个人待办为 0）」；
//      登录且有待办时 hero 降为辅助信息（组织名由顶栏 H1 承担，hero 不作第一重音）。
//      ⚠ 后者是**运行时状态判据**（取决于登录态与待办数），静态守卫机检不了「此刻是不是第一重音」，
//      故本件只钉住**静态壳里的 hero 结构**（允许存在、位置在统计卡之前）；运行时那半落人检
//      （`docs/src/entries/pages/main-entry.js` 的 hero 显隐），不在本件假装覆盖。
//      **2026-10-20 支书裁定：删除副标题**（「组织生活与工作台账」只是标题复述），故 E1 反向断言其不存在；
//   E2 抬头标题用专属 id（#dashboard-hero-title），main-entry.js 不按区块标题选择器覆写；
//   E3 main-entry.js 引入 getHeaderTitle，并按 user 分支设置标题；
//   E4 index.html 不出现硬编码示例支部名「光华管理学院本科生党支部」；
//   E5 非空转自检：上述正则对正样本命中、对负样本不命中（防止空转假绿）；
//   E7 首页统计卡：图标 ＋ 数字 ＋ 标签 + 统一 min-height（390 等高），不阴影不上浮；
//   E8 hero 特例（2026-10-31 支书补充，DS_05 §10.5.1 白名单）：
//      首页 #dashboard-hero **恒为居中整幅**（48px 党徽 ＋ 居中标题），
//      原「登录且有待办 ⇒ data-hero=muted / 24px 左对齐」降级已移除 ⇒ 断言带反例。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const INDEX = join(ROOT, 'docs', 'index.html');
const MAIN_ENTRY = join(ROOT, 'docs', 'src', 'entries', 'pages', 'main-entry.js');
const GALLERY = join(ROOT, 'docs', 'src', 'components', 'dashboard', 'gallery.js');
const STATS = join(ROOT, 'docs', 'src', 'components', 'dashboard', 'stats.js');
const CSS = join(ROOT, 'docs', 'src', 'styles.css');
const DS5 = join(ROOT, 'content', '04_web_design', 'design-system', 'DS_05_MAP_AND_REFERENCE.md');

const indexHtml = readFileSync(INDEX, 'utf8');
const mainSource = readFileSync(MAIN_ENTRY, 'utf8');
const gallerySource = readFileSync(GALLERY, 'utf8');
const statsSource = readFileSync(STATS, 'utf8');
const cssSource = readFileSync(CSS, 'utf8');
const ds5Source = readFileSync(DS5, 'utf8');

// ── 正则：页面结构 ──
const HERO_BLOCK_RE = /<div\b[^>]*\bid="dashboard-hero"[^>]*>([\s\S]*?)<\/div>/;
const EMBLEM_RE = /<img\b[^>]*\bsrc="\.\/assets\/images\/party_emblem\.png"[^>]*\balt="党徽"[^>]*>/;
const HERO_TITLE_RE = /<h2\b[^>]*\bid="dashboard-hero-title"[^>]*>/;
const HERO_SUBTITLE_RE = /<p\b[^>]*\bid="dashboard-hero-subtitle"[^>]*>/;

// ── 正则：main-entry.js 接线 ──
const IMPORT_RE = /import\s*\{[^}]*\bgetHeaderTitle\b[^}]*\}\s*from\s*['"]\.\.\/\.\.\/services\/branch\/branch\.js\?v=\d{8}[a-z]['"]/;
const TITLE_CALL_RE = /heroTitleEl\.textContent\s*=\s*user\s*\?\s*getHeaderTitle\(user\.personId\)\s*:\s*getHeaderTitle\(\)/;
const OLD_SELECTOR_RE = /querySelector\(\s*['"]#view-dashboard h2\.font-title-cn['"]\s*\)/;

// ── 正则：hero 特例（E8）──
const BASE_EMBLEM_RE = /\.dashboard-hero__emblem\s*\{[^}]*width:\s*48px[^}]*height:\s*48px[^}]*\}/;
const HERO_CENTERED_RE = /<div\b[^>]*class="[^"]*\btext-center\b[^"]*"[^>]*\bid="dashboard-hero"/;
const MUTED_BLOCK_RE = /#dashboard-hero\[data-hero="muted"\]\s*\{[^}]*text-align:\s*start[^}]*\}/;
const HERO_MUTED_STATE_RE = /(?:data-hero|dataset\.hero)\s*=\s*[^;\n]*['"]muted['"]/;

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

  const posImport = "import { getHeaderTitle } from '../../services/branch/branch.js?v=20261102b';";
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

test('E6 首页活动风采：一张照片都没有时不出 16:9 大图位，只留一行空态 +（有权限时）上传入口', () => {
  // 2026-10-27 Task 6.4：全无照片 → 一行「暂无活动照片」；不再铺 6 张空图位。
  assert.match(gallerySource, /if \(!display\.some\(a => _imageByActivityId\.has\(a\.id\)\)\)/,
    '缺少「入选活动一张照片都没有」的分支');
  assert.match(gallerySource, /data-gallery-empty/, '空态容器缺少可断言标记');
  assert.match(gallerySource, /暂无活动照片/, '空态文案缺失');
  // 上传入口只在有写权时出现（照片写口＝宣传台档案归档，仅宣传委员）。
  assert.match(gallerySource, /_photoUploadHref\(\)[\s\S]{0,220}role !== 'prop-commissioner'/,
    '上传入口须按权限（宣传委员）判定');
  // 空态分支内不得再出现图位容器（gallery-grid / 16:9 封面）。
  const emptyStart = gallerySource.indexOf('data-gallery-empty');
  const gridStart = gallerySource.indexOf("container.innerHTML = '<div class=\"gallery-grid\">'");
  assert.ok(emptyStart > 0 && gridStart > emptyStart, '未能定位空态分支与图位分支的先后关系');
  assert.doesNotMatch(gallerySource.slice(emptyStart, gridStart), /gallery-grid|gallery-card__cover/,
    '空态分支不得再铺 16:9 图位');
});

test('E7 首页统计卡：图标在左＋数值/标签在右、栅格等高（无 min-height），不阴影不上浮', () => {
  // 2026-10-29 P2：数字组统一为「图标块在左 ＋ .stat-card__body（数值/标签在右两行）」；
  //   卡片不自带尺寸，四张等高交给 #dashboard-stats 的 .stat-grid（align-items: stretch）。
  // 2026-11-01（回线上口径，卡高目标 ≤80px）：骨架 / 正式两处模板**必须** `p-4`（16px 全边），
  //   不得再退回 `px-4 py-3`；卡内只留「数值 / 标签」两行，第三行 `.stat-card__note` 判红。
  const CARD_P4_RE = /class="card rounded-xl p-4 stat-card/g;
  assert.equal((statsSource.match(CARD_P4_RE) || []).length, 2,
    '统计卡（骨架 / 正式两处）都必须用 `card rounded-xl p-4 stat-card`');
  assert.doesNotMatch(statsSource, /px-4 py-3/, '统计卡不得回退 `px-4 py-3`（上下 12px 会把卡撑高）');
  assert.doesNotMatch(statsSource, /stat-card__note/,
    'stats.js 不得出现 stat-card__note（第三行会把四张卡一起撑高；空态用数值位「—」表达）');
  // 反例：回退写法 / 第三行说明必须被同一口径识别。
  const badPadding = '<div class="card rounded-xl px-4 py-3 stat-card">';
  assert.equal((badPadding.match(CARD_P4_RE) || []).length, 0, '反例失效：px-4 py-3 未被 p-4 判据排除');
  const badNote = '<p class="text-xs stat-card__note" style="color:var(--neutral-500);">本月无记录</p>';
  assert.match(badNote, /stat-card__note/, '反例失效：note 未被识别（判据会恒绿）');
  assert.match(statsSource, /class="stat-icon-tint"[^>]*--tint:\$\{s\.color\}/,
    '统计卡须有图标块，浅底由 --tint 取既有语义色派生');
  assert.match(statsSource, /stat-icon-tint[\s\S]{0,400}stat-card__body[\s\S]{0,400}stat-card__value[\s\S]{0,400}stat-card__label/,
    '统计卡结构须为「图标在左 ＋ .stat-card__body（数值/标签）」');
  assert.match(statsSource, /<p class="stat-card__value"/, '统计卡数值须用 .stat-card__value');
  assert.match(statsSource, /<p class="stat-card__label">/, '统计卡标签须用 .stat-card__label');
  assert.match(statsSource, /class="stat-card__unit"/, '单位须与数值同行（.stat-card__unit）');
  assert.match(cssSource, /\.stat-icon-tint\s*\{[^}]*width:\s*40px[^}]*height:\s*40px/,
    'styles.css：图标块须为 40×40');
  assert.match(cssSource, /\.stat-icon-tint\s*\{[^}]*background:\s*color-mix\(in srgb,\s*var\(--tint[^;]*12%/,
    'styles.css：图标浅底须由 --tint 12% 派生（不写 hex）');
  assert.match(statsSource, /label: '个人考勤'/, '考勤卡标签须为短标签（原「个人考勤（本月无记录）」会折行撑高）');
  assert.match(statsSource, /value: [\s\S]{0,80}?:\s*'—'/, '无记录须由数值位的「—」表达（不另加文字）');
  assert.doesNotMatch(statsSource, /本月无记录/, '不得再渲染「本月无记录」第三行');
  // 组件不自带尺寸：竖排与 min-height 一并退场；等高由栅格 stretch 保证。
  assert.match(cssSource, /\.stat-card\s*\{[^}]*align-items:\s*center/, '统计卡须横排（图标在左）');
  assert.doesNotMatch(cssSource, /\.stat-card\s*\{[^}]*flex-direction:\s*column/, '统计卡不得再竖排三段');
  assert.doesNotMatch(cssSource, /\.stat-card\s*\{[^}]*min-height/, '统计卡不得写死 min-height');
  assert.doesNotMatch(cssSource, /\.stat-card\s*\{[^}]*padding-block/,
    '.stat-card 不得再写 padding-block（与调用点 p-4 叠加会把卡撑高）');
  assert.match(cssSource, /\.stat-grid,\s*\.metric-band--cards\s*\{[^}]*align-items:\s*stretch/,
    'styles.css 须提供 .stat-grid（align-items: stretch）');
  assert.match(cssSource, /\.stat-grid,\s*\.metric-band--cards\s*\{[^}]*grid-auto-rows:\s*1fr/,
    'styles.css：两列时上下两行须等高（grid-auto-rows: 1fr）');
  assert.match(cssSource, /@media \(max-width: 1024px\)\s*\{[\s\S]{0,200}\.stat-grid,[\s\S]{0,120}repeat\(2,/,
    '≤1024 时统计卡须降为两列');
  assert.match(indexHtml, /id="dashboard-stats" class="stat-grid/, '首页统计容器须为 .stat-grid（列数交给栅格）');
  assert.doesNotMatch(statsSource, /hover:shadow|hover:-translate-[xy]-/, '统计卡不得以 hover 阴影 / 上浮作反馈');
});

test('E8 hero 特例：首页恒为居中整幅（DS_05 §10.5.1 白名单），不得回退左对齐降级', () => {
  // 白名单落点：DS_05 §10.5.1「首页 hero 特例」——支书认可的「党徽 ＋ 支部名居中」整幅抬头。
  assert.match(ds5Source, /### 10\.5\.1 首页 hero 特例/, 'DS_05 缺 §10.5.1 首页 hero 特例白名单');
  assert.match(ds5Source, /恒为居中整幅/, 'DS_05 白名单须写明 hero 恒为居中整幅');
  assert.match(ds5Source, /不得出现 24px 降级|不得出现 24px/, 'DS_05 白名单须写明不得 24px 降级');

  // 静态壳：居中 + 48px 党徽。
  assert.match(indexHtml, HERO_CENTERED_RE, '#dashboard-hero 必须保留 text-center（居中版式）');
  assert.match(cssSource, BASE_EMBLEM_RE, 'styles.css 缺少党徽 48px');
  assert.doesNotMatch(indexHtml, /<img\b[^>]*party_emblem[^>]*style="[^"]*width:\s*24px/,
    '党徽尺寸不得用行内 24px 压过居中整幅');

  // 降级已移除：CSS / main-entry 均不得再出现 muted 左对齐。
  assert.doesNotMatch(cssSource, /#dashboard-hero\[data-hero="muted"\]/, 'styles.css 不得再保留 muted 降级规则');
  assert.doesNotMatch(mainSource, HERO_MUTED_STATE_RE, 'main-entry.js 不得再写 data-hero="muted"');
  assert.doesNotMatch(mainSource, /TodoStore\.getByRole\(user\.role\)/, 'hero 版式不得再按待办数切换');

  // 非空转反例：左对齐块 / 写死 muted 必须被同一口径识别。
  assert.match('#dashboard-hero[data-hero="muted"] { text-align: start; margin-bottom: 4px; }', MUTED_BLOCK_RE);
  assert.match('heroEl.dataset.hero = user && todoCount > 0 ? \'muted\' : \'full\';', HERO_MUTED_STATE_RE);
  assert.doesNotMatch('<div class="text-center mb-6" id="dashboard-stats">', HERO_CENTERED_RE);
  assert.doesNotMatch('.dashboard-hero__emblem { width: 24px; height: 24px; }', BASE_EMBLEM_RE);
});
