// role: [工程师]+[AI]
// server/test/roster-filter-guard.test.mjs — 成员名册筛选形态守卫（2026-10-20 第三轮 IA 判例⑤）
//
// 判例：名册是「按人找、按组核对」的表格页，不是标签浏览页。原 4 组分面 chip（党小组 / 发展阶段 /
//   角色 / 在册，约 20 枚按钮）把第一名成员推下 390px 首屏 ⇒ 收回「搜索 + 三个下拉」：
//     搜索（姓名 / 学号）· 党小组 · 发展阶段 · 在册状态；
//   角色属低频维度，不进主行（在个人档案看）。
//
// 本守卫只判**结构与形态**（node-only，静态扫描）：
//   R1 名册恰声明三个下拉维度（顺序与键集固定），且仍用统一引擎的 `personKeyword()`；
//   R2 名册不得再出现 `facetStyle: 'chip'` / 页内自写 `.chip-option`（4 组 chip 回潮即红）；
//   R3 引擎契约仍在：dropdown 输出 `.lf-select`（进而由 custom-select 增强），chip 才输出 `.chip-option`；
//   R4 390px 单列规则在 styles.css 单一源；
//   R5 本守卫登记在 `test:daily`（否则改名/移动后无人再跑）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const ROSTER = read('docs/src/entries/tabs/org/roster-tab.js');
const ENGINE = read('docs/src/components/ui/list-filter.js');
const STYLES = read('docs/src/styles.css');
const PKG = read('server/package.json');

test('R1 名册首屏：1 个搜索 + 恰 3 个下拉（党小组 / 发展阶段 / 在册状态）', () => {
  const keys = /const ROSTER_FACET_KEYS = \[([^\]]*)\]/.exec(ROSTER);
  assert.ok(keys, '名册须声明 ROSTER_FACET_KEYS（三个下拉维度的单一源）');
  const list = [...keys[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(list, ['partyGroup', 'developStage', 'residenceStatus'],
    `名册主行应恰为三个下拉（党小组 / 发展阶段 / 在册状态），实测 ${JSON.stringify(list)}`);
  assert.match(ROSTER, /facets:\s*ROSTER_FACETS/, '名册须使用 ROSTER_FACETS（不得直接铺全 4 维）');
  // 在册状态用固定两项 + getResidenceOf：保证「全部在校」时第三个下拉仍在，且与行内显示同源。
  assert.match(ROSTER, /label: '在册状态'/, '在册状态下拉须有固定标签');
  assert.match(ROSTER, /get:\s*\(person\) => getResidenceOf\(person\)\.residenceStatus \|\| RESIDENCE\.CAMPUS/,
    '在册状态下拉须读 getResidenceOf（覆盖层同源）');
  assert.match(ROSTER, /keyword:\s*personKeyword\(\)/, '名册须保留姓名 / 学号搜索框');
  // 引擎契约：dropdown 形态输出 .lf-select；关键词输出 .lf-kw（1 搜索 + 3 下拉的 DOM 落点）
  assert.match(ENGINE, /class="input-flat text-xs lf-select"/, '引擎 dropdown 形态须渲染 .lf-select');
  assert.match(ENGINE, /class="input-flat text-xs lf-kw"/, '引擎关键词须渲染 .lf-kw');
  assert.match(ENGINE, /facetStyle \|\| 'dropdown'/, '引擎默认形态必须仍是 dropdown（名册不再 opt-in chip）');
});

test('R2 不得回潮 4 组 chip：名册不得 opt-in chip / 自写胶囊', () => {
  assert.doesNotMatch(ROSTER, /facetStyle:\s*'chip'/, '名册不得再出现 facetStyle: chip');
  assert.doesNotMatch(ROSTER, /chip-option/, '名册不得自写 .chip-option（筛选行胶囊只许引擎按 opt-in 渲染）');
  // 「角色」退出主行：直接调用 personFacets 时不得再传 roleLabel（即不得铺满 4 维）
  assert.doesNotMatch(ROSTER, /personFacets\(\{[^}]*roleLabel/, '名册主行不得再包含角色维度');
});

test('R3 引擎两形态契约仍在（避免「删了 chip」时把 dropdown 一起删掉）', () => {
  assert.match(ENGINE, /if \(facetStyle === 'chip'\)/, '引擎须保留 chip 分支（其它表单多选仍复用）');
  assert.match(ENGINE, /<select id="\$\{uid\}-f-\$\{esc\(f\.key\)\}"/, '引擎须仍为每个分面渲染原生 select');
  assert.match(ENGINE, /\.filter\(f => f\.options\.length > 1\)/, '取值 ≤1 种的维度须自动隐藏（空维度不占位）');
});

test('R4 390px 单列：由通用筛选行规则覆盖（不再保留名册专用第二套）', () => {
  // 2026-10-29 P3：原 `#roster-list-host .lf-bar` 特例已删除——窄屏「控件整行折行、铺满宽度」
  //   改由 `.lf-bar__row` 通用规则承担，名册与其它筛选面共用一套。
  assert.match(STYLES, /\.lf-bar__row\s*\{[^}]*flex-wrap:\s*wrap/, '筛选行须声明可折行');
  assert.match(STYLES, /@media \(max-width: 640px\) \{[\s\S]{0,1000}\.lf-bar__row > \.lf-kw[\s\S]{0,500}flex: 1 1 100%/, '窄屏控件须整行折行、铺满宽度');
  assert.match(STYLES, /\.lf-bar__row > \.cs-select \.cs-trigger \{ width: 100%; \}/, '增强下拉触发器须占满单列宽度');
  assert.ok(!/#roster-list-host \.lf-bar/.test(STYLES), '不得保留名册专用特例（避免第二套窄屏规则）');
});

test('R5 守卫登记在 test:daily', () => {
  assert.match(PKG, /test:daily[^\n]*roster-filter-guard\.test\.mjs/, 'test:daily 须登记 roster-filter-guard.test.mjs');
});

test('R6 R3-17：待确认摘要不重复、pill title 只写「待支书确认」', () => {
  assert.doesNotMatch(ROSTER, /等待支书确认/, '「待支书确认：」已在前，尾部不得再说一遍「等待支书确认」');
  assert.match(ROSTER, /_pendingPill\('阶段变更·待确认', '待支书确认'\)/, '阶段 pill title 须压成「待支书确认」');
  assert.match(ROSTER, /_pendingPill\('在册状态·待确认', '待支书确认'\)/, '在册 pill title 须压成「待支书确认」');
  assert.doesNotMatch(ROSTER, /已报送支书确认，生效前保持现值/, 'pill 不得再讲 40 字路由说明');
});

test('R7 R3-18：新增成员不写「推荐填写」，占位符只给例子', () => {
  assert.doesNotMatch(ROSTER, /推荐填写/, '学号 / 届别不得再写「推荐填写」');
  assert.doesNotMatch(ROSTER, /仅「滞留」时填写/, '占位符不得写填写规则');
  assert.match(ROSTER, /placeholder: '如 2400012345'/, '学号占位符须只给例子');
  assert.match(ROSTER, /placeholder: '如 2026'/, '届别占位符须只给例子');
  // 2026-10-28 硬编码审计：示例日期改由「本学期」表达（写死 2026-09 会随时间过期），判据面不变
  assert.match(ROSTER, /placeholder: '如：本学期起赴外校交换一学期'/, '滞留备注占位符须只给例子');
});
