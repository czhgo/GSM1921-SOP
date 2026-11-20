// role: [工程师]+[AI]
// work-overview-layers.test.mjs — 六台「工作概况」三层骨架守卫（2026-10-18 · Task 7）
//
// 来源：Spec「工作台密度与组件重组」Task 7 / DESIGN_SYSTEM §4.20.7-4.21。
// 病灶：六台概况各自堆卡，独立「汇报」卡与待办、待我处理重复；条线对比散落在卡片里。
// 本守卫只判**结构与单一源**：
//   W1 work-overview.js 三层标记齐备（结论带 / 工作分工表 / 待我处理）；
//   W2 不再出现独立「汇报」卡标题；
//   W3 六个 overview-tab 都调用共享 renderWorkOverview；
//   W4 六个角色键配置与「在办 / 逾期 / 待我处理 / 待答复」四数齐备；四数同为数字卡（无 muted 脚注档）；
//   W5 工作分工表列固定为「工作分工 / 负责人 / 在办 / 逾期 / 待处理 / 动作」；
//      （2026-10-20 界面细化：原「条线 / 最近卡点」是内部管理词，支书裁定改业务词；表头与 aria-label 同批。）
//   W6 复用模块与既有下钻仍在（list-row / data-table / empty-state / 文件确认 / 去我的处置）；
//   W7 390px 条线表横滑与首列 sticky 由 styles.css 单一源提供；
//   W8 结论带四项是可聚焦数字卡（button / a），筛选与滚动两种控件仍区分；逾期筛选与 3 条上限可用；卡头无重复计数，卡式行 data-label 齐备。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const OVERVIEW = read('docs/src/components/governance/work-overview.js');
const STYLES = read('docs/src/styles.css');

test('W1 三层骨架：结论带 / 工作分工表 / 待我处理标记齐备', () => {
  for (const layer of ['summary', 'lines', 'actions']) {
    assert.match(OVERVIEW, new RegExp(`data-wo-layer="${layer}"`), `work-overview.js 缺 data-wo-layer="${layer}"`);
  }
  // 2026-10-25 Task 4（同屏纵向一致）：分区头改走单一源 renderCardHeader（其 H3 由 G10 核对），
  //   断言从「字面 <h3>工作分工</h3>」改为「调用 renderCardHeader 且标题正确」——覆盖面等价。
  assert.match(OVERVIEW, /renderCardHeader\(\{ title: '工作分工' \}\)/, '第二层须有「工作分工」表标题（renderCardHeader 的 H3）');
  // 2026-10-20 判例④：标题走 ACTIONS_TITLE 常量（值仍为「待我处理」），避免结论带再写一遍同词。
  assert.match(OVERVIEW, /const ACTIONS_TITLE = '待我处理'/, '第三层标题常量须为「待我处理」');
  assert.match(OVERVIEW, /renderCardHeader\(\{ title: ACTIONS_TITLE \}\)/, '第三层须渲染 ACTIONS_TITLE 标题');
});

test('W2 删除独立「汇报」卡：不再出现 <h4>汇报</h4>', () => {
  assert.doesNotMatch(OVERVIEW, /<h4[^>]*>\s*汇报\s*<\/h4>/, '不得保留独立「汇报」卡标题');
  assert.doesNotMatch(OVERVIEW, /dutyCardHtml/, '职责卡不再占一张卡');
});

test('W3 六个 overview-tab 都走共享 renderWorkOverview', () => {
  const files = [
    'secretary', 'org', 'prop', 'disc', 'leader', 'visitor',
  ].map((role) => `docs/src/entries/tabs/${role}/overview-tab.js`);
  for (const file of files) {
    const src = read(file);
    assert.match(src, /renderWorkOverview/, `${file} 未调用共享入口`);
  }
});

test('W4 六个角色键与四数齐备（四数同为数字卡）', () => {
  for (const role of [
    'secretary', 'org-commissioner', 'prop-commissioner', 'disc-commissioner', 'leader', 'visitor',
  ]) {
    const key = /^[a-z]/.test(role) && role.includes('-') ? `'${role}'` : role;
    assert.ok(OVERVIEW.includes(`${key}: {`), `ROLE_OVERVIEW_CONFIG 缺角色键 ${role}`);
  }
  for (const label of ['在办', '逾期', '待我处理', '待答复']) {
    assert.ok(OVERVIEW.includes(`'${label}'`), `四数缺「${label}」`);
  }
  // 2026-11-03 批次 530（B-520-3）：上限数字收口到 constants.js::DASHBOARD_LIMITS，
  //   本件只允许引用常量（判据仍是「上限为 3 且只有一份」）。
  assert.match(OVERVIEW, /const _MAX_INLINE = DASHBOARD_LIMITS\.overviewInlineActions/,
    '待我处理上限须引用 DASHBOARD_LIMITS.overviewInlineActions（不得回写字面量）');
  assert.match(read('docs/src/core/domain/constants.js'), /overviewInlineActions:\s*3\b/,
    'DASHBOARD_LIMITS.overviewInlineActions 须为 3（上限单一源）');
  assert.match(OVERVIEW, /lineOf\(item\)/, '每台配置须声明 lineOf(...)');
  // 2026-10-28「四个数统一为卡片数字」：原「在办 = 存量指标，降为 muted 脚注级（muted: true / 16px /
  //   neutral-500）」的判据随实现改到卡面结构——四数同级、同为数字卡。原三条 muted 断言按下列映射保留：
  //   ① 在办仍是滚动类指标（原 kind 语义）→ 断言 key/kind 同行且 kind 为 scroll；
  //   ② 原「须标记 muted」「须输出 --muted 数值档」→ 改为否定断言（防 muted 脚注档回潮）；
  //   ③ 原 muted 档 16px / neutral-500 的 CSS 判据 → 改判逾期 warning 文字档（见本节末两条）。
  assert.match(OVERVIEW, /key: 'active', label: '在办'[^\n]*kind: 'scroll'/, '在办须为滚动类指标（kind: scroll）');
  assert.doesNotMatch(OVERVIEW, /muted: true/, '四数同级数字卡：在办不得回潮 muted 脚注级');
  assert.doesNotMatch(OVERVIEW, /metric-band__value--muted/, '四数同级数字卡：不得回潮 muted 数值档');
  assert.doesNotMatch(STYLES, /\.metric-band__value--muted\s*\{/, 'styles.css 不得保留 muted 数值档（四数同级）');
  // 四数落点＝卡网格：父级 .metric-band--cards，两条渲染分支（筛选 / 滚动）都取同一套卡面类。
  assert.match(OVERVIEW, /<section class="metric-band metric-band--interactive metric-band--cards(?: metric-band--cards--content)?"/,
    '结论带须为四列卡网格 .metric-band--cards');
  assert.match(OVERVIEW, /<button type="button" class="card card--interactive stat-card metric-band__item metric-band__item--filter/,
    '筛选类指标须渲染为数字卡（.card + .stat-card + .metric-band__item）');
  assert.match(OVERVIEW, /<a class="card card--interactive stat-card metric-band__item metric-band__item--link"/,
    '滚动类指标须渲染为数字卡（.card + .stat-card + .metric-band__item）');
  // 卡内由「图标块在左 ＋ .stat-card__body（数值/标签在右两行）」组成（2026-10-29 P2）：
  //   上一轮误把「卡片数字」执行成去图标的纯文字卡，后一版又执行成竖排三段；本判据改准为
  //   横排 ＋ body 包裹（判据只增不减：图标 / 数值 / 标签 / 顺序 / 无 hex 全部保留）。
  const cardBlock = /const summaryHtml = config\.metrics\.map\(\(metric\) => \{[\s\S]*?\}\)\.join\(''\);/.exec(OVERVIEW);
  assert.ok(cardBlock, '未找到结论带卡片渲染块（config.metrics.map）');
  const bodyHtml = /const body = `<span class="stat-icon-tint"[\s\S]*?<div class="stat-card__body">[\s\S]*?<p class="stat-card__value[\s\S]*?<\/p>[\s\S]*?<p class="stat-card__label">\$\{esc\(metric\.label\)\}<\/p>[\s\S]*?<\/div>`/.exec(cardBlock[0]);
  assert.ok(bodyHtml, '卡内 body 须由「图标 .stat-icon-tint ＋ .stat-card__body（.stat-card__value / .stat-card__label）」组成');
  assert.equal(bodyHtml[0].match(/<span/g).length, 1, '卡内图标只允许一个 span（数值/标签是 <p>，不得回潮三段 span）');
  assert.equal(bodyHtml[0].match(/<p/g).length, 2, '卡内数值与标签各一个 <p>（两行在右）');
  assert.ok(bodyHtml[0].indexOf('stat-card__value') < bodyHtml[0].indexOf('stat-card__label'),
    '数值须在标签之上（右侧纵向两行：数值 → 标签）');
  assert.match(cardBlock[0], /--tint:\$\{color\}/, '图标浅底须由 --tint 派生（既有语义色）');
  assert.doesNotMatch(cardBlock[0], /#(?:[0-9a-f]{3,8})\b/i, '指标卡不得写硬编码 hex（颜色只取语义 token）');
  // 逾期：warning 文字档（非 error 色）——随数字组改名到 .stat-card__value--warning。
  assert.match(OVERVIEW, /warning: true/, '逾期指标须标记 warning');
  assert.match(OVERVIEW, /stat-card__value--warning/, '逾期 > 0 须输出 warning 数值档');
  assert.match(STYLES, /\.stat-card__value--warning\s*\{[^}]*color:\s*var\(--status-warning-text\)/, '逾期数值须为 warning 文字档');
  assert.doesNotMatch(STYLES, /\.stat-card__value--warning\s*\{[^}]*--status-(?:error|danger)/, '逾期数值不得用 error 色');
});

test('W5 工作分工表列固定：工作分工 / 负责人 / 在办 / 逾期 / 待处理（R3-29 动作列并入待处理）', () => {
  for (const label of ['工作分工', '负责人', '在办', '逾期', '待处理']) {
    assert.ok(OVERVIEW.includes(`label: '${label}'`), `工作分工表缺列「${label}」`);
  }
  assert.ok(!OVERVIEW.includes("label: '动作'"), 'R3-29：独立「动作」列已删除（并入「待处理」）');
  assert.match(OVERVIEW, /tableHeadHtml\(LINE_COLUMNS\)/, '表头须由 data-table 的 tableHeadHtml 生成');
  // 2026-10-26 Task 3.4：条线表加 table-layout:fixed 定列宽档（余量不再被末列吃掉），故类串多一个
  //   `data-table--fixed`；仍是 .data-table 一套，覆盖面向「工作分工表」本体不变。
  assert.match(OVERVIEW, /class="data-table data-table--fixed wo-lines-table"/,
    '工作分工表须使用 .data-table（并挂定列宽档 .data-table--fixed）');
});

test('W6 复用模块与既有下钻仍在', () => {
  assert.match(OVERVIEW, /listRowHtml/, '待我处理须用 list-row');
  assert.match(OVERVIEW, /listGroupHtml/, '待我处理须用 list-group');
  assert.match(OVERVIEW, /emptyStateHtml/, '空态须用 empty-state');
  assert.match(OVERVIEW, /confirmExternalDispatch/, '文件外发确认须保留');
  assert.match(OVERVIEW, /data-wo-go-dispatch/, '汇报动作须保留「去待办处理」');
  // 2026-11-10 批次 540 波次 5：切页签改走统一导航（`goToWorkspaceTab`），不再按 prefix 点按钮；
  //   本断言只改期望机制，「汇报动作须切本台待办」这一覆盖面不变。
  assert.match(OVERVIEW, /goToWorkspaceTab/, '切页签须经统一导航 goToWorkspaceTab');
  assert.doesNotMatch(OVERVIEW, /data-\$\{prefix\}-tab=/, '不得再按 prefix 手写页签选择器（改走 data-ws-tab-btn）');
  assert.match(OVERVIEW, /_woDetail = \{ kind: 'activity'/, '活动只读详情下钻须保留');
  assert.match(OVERVIEW, /_woDetail = \{ kind: 'taskforce'/, '专班只读详情下钻须保留');
  assert.match(OVERVIEW, /data-wo-jump="todo"/, '待办组定位须保留');
  assert.match(OVERVIEW, /filterActivitiesForViewer/, '活动可见性过滤须保留');
});

test('W7 390px：条线表横滑 + 首列 sticky', () => {
  assert.match(STYLES, /\.wo-lines-scroll\s*\{[^}]*overflow-x:\s*auto/, '条线表容器须横向滚动');
  assert.match(STYLES, /\.wo-lines-table\s*\{[^}]*min-width:/, '条线表须有最小宽度以触发横滑');
  assert.match(STYLES, /\.wo-lines-table td:first-child\s*\{[^}]*position:\s*sticky/, '首列须 sticky');
});

test('W8 结论带两种控件（数字卡形态）：筛选卡（aria-pressed）/ 滚动卡（锚点）；两段与动作列收敛', () => {
  // 2026-10-20 R3-07：筛选类＝可切换控件，滚动类＝页内链接，不再让同款控件干两种事。
  // 2026-10-28 卡片化：两者同取数字卡外观（.card + .stat-card + .metric-band__item），控件语义不变。
  assert.match(OVERVIEW, /<button type="button" class="card card--interactive stat-card metric-band__item metric-band__item--filter/, '筛选类指标须渲染为可切换数字卡按钮');
  assert.match(OVERVIEW, /data-metric="\$\{esc\(metric\.key\)\}" data-metric-kind="filter"/, '筛选类须带 data-metric-kind="filter"');
  assert.match(OVERVIEW, /aria-pressed="\$\{active \? 'true' : 'false'\}"/, '筛选卡须带 aria-pressed');
  assert.match(OVERVIEW, /<a class="card card--interactive stat-card metric-band__item metric-band__item--link" href="\$\{esc\(docAnchorHref\(metric\.href \|\| '#wo-lines'\)\)\}"/, '滚动类指标须为页内链接（#wo-lines / #wo-actions，经 docAnchorHref 归一）');
  assert.match(OVERVIEW, /data-metric-kind="scroll"/, '滚动类须带 data-metric-kind="scroll"');
  // 可点 / 不可点的边界：四数一律是 button / a（原生可聚焦 + .card--interactive），不得退化为纯 span 展示卡；
  //   筛选（可切换，aria-pressed）与滚动（只定位，带 › 线索）的区分仍在。
  assert.doesNotMatch(OVERVIEW, /<span class="[^"]*\bmetric-band__item\b/, '指标不得退化为不可点的纯 span 载体');
  assert.match(OVERVIEW, /<span class="metric-band__jump" aria-hidden="true">›<\/span>/, '滚动卡须保留 › 定位线索');
  for (const key of ['overdue', 'actions', 'active', 'fourth']) {
    assert.ok(OVERVIEW.includes(`key: '${key}'`), `指标缺 data-metric 键「${key}」`);
  }
  assert.match(OVERVIEW, /let _metricFilter = null/, '须有 _metricFilter 状态');
  assert.match(OVERVIEW, /_metricFilter === 'overdue'/, '逾期点击须切换筛选');
  assert.match(OVERVIEW, /actionItems\.filter\(\(item\) => item\.overdue\)/, '逾期筛选须按 item.overdue 过滤');
  assert.match(OVERVIEW, /visibleActions\.slice\(0, _MAX_INLINE\)/, '待我处理须按新上限截取');
  assert.match(OVERVIEW, /row\.gap \|\| row\.overdue > 0/, '条线动作只对缺口或逾期行显示');
  // 动作列：无动作时留空（不再铺「—」）；R3-29 动作并入「待处理」，独立列不再出现。
  assert.doesNotMatch(OVERVIEW, /if \(!\(row\.gap \|\| row\.overdue > 0\)\) return '—'/, '动作列不得回潮「—」占位');
  assert.doesNotMatch(OVERVIEW, /data-label="动作"/, 'R3-29：td 不得再带 data-label="动作"（列数 6→5）');
  assert.match(OVERVIEW, /function _pendingCellHtml\(row\)/, '「待处理」格须统一承载缺口与行内动作');
  assert.doesNotMatch(OVERVIEW, /section-head__count|section-head__meta/, '卡头不得重复计数 / 同义说明');
  // 两段：待我处理 + 我已处理（默认折叠的 details）。
  // 2026-10-25 Task 3（组件契约）：折叠仍用原生 details，但标题移出 summary（兄弟 H3 + aria-labelledby），
  //   卡片容器改为 section，故断言从「details 带 card 类」改为「section 卡 + details + 兄弟 H3」。
  assert.match(OVERVIEW, /data-wo-layer="done"/, '须有「我已处理」段');
  assert.match(OVERVIEW, /<details class="disclosure" id="wo-done">/, '「我已处理」须为默认折叠的 details');
  // 2026-10-25 Task 4：标题仍为 details 的兄弟 H3，但改由 renderCardHeader 以 titleId 生成
  //   （H3 由 G10 核对）；断言改为「卡头调用带 titleId」，覆盖「兄弟标题 + aria-labelledby」不变。
  assert.match(OVERVIEW, /renderCardHeader\(\{ title: '我已处理', titleId: 'wo-done-title'/, '「我已处理」标题须为 details 的兄弟 H3');
  assert.match(OVERVIEW, /<summary[^>]*aria-labelledby="wo-done-title"/, 'summary 须用 aria-labelledby 关联标题');
  assert.match(OVERVIEW, /我已处理/, '「我已处理」标题须在位');
  // 条线表窄屏卡式行：表声明 data-responsive，每个 td 带 data-label。
  assert.match(OVERVIEW, /data-responsive="cards"/, '条线表须声明卡式行');
  for (const label of ['工作分工', '负责人', '在办', '逾期', '待处理']) {
    assert.ok(OVERVIEW.includes(`data-label="${label}"`), `工作分工表 td 缺 data-label="${label}"`);
  }
});

// ── 2026-11-10 批次 540 波次 5：跳转落点与功能色 ────────────────────────────
// 病灶：条线动作各按 `data-<prefix>-tab` 点按钮，改页签名即静默失效；「去活动管理 / 去待办」只落页顶；
//   缺口按钮与行内动作都取主题色，5 行条线表里出现 3 处以上主题色文字，注意力被摊平。
test('W9 跳转统一：动作只经 goToWorkspaceTab，条线声明目标项，缺 id 在源页提示未定位', () => {
  assert.match(OVERVIEW, /import \{ goToWorkspaceTab, showMissingItemNotice \}/,
    '须从 workspace-nav 引入统一导航与缺项提示');
  assert.match(OVERVIEW, /function _switchTo\(role, tab, target\)/, '须有统一出口 _switchTo');
  assert.match(OVERVIEW, /if \(target && target\.kind && !target\.id\) \{\s*\n\s*showMissingItemNotice\(\);/,
    '项级动作缺 id 须在本页提示「未定位到具体条目」，不得静默跳页顶');
  assert.match(OVERVIEW, /target: typeof line\.targetOf === 'function' \? line\.targetOf\(ctx\) : null/,
    '条线须声明 targetOf，把「去活动管理 / 去待办」落到具体行 / 组');
  // 去活动管理（组织条线）与去待办（宣传 / 纪检条线）都必须带目标项
  assert.match(OVERVIEW, /key: 'org'[\s\S]{0,1200}targetOf/, '组织条线（去活动管理）缺目标项');
  assert.match(OVERVIEW, /key: 'prop'[\s\S]{0,600}targetOf/, '宣传条线（去待办）缺目标项');
  // 待赋权：direct 直达活动详情（赋权位在详情页），走对象详情路由单一源
  assert.match(OVERVIEW, /gapAction: 'auth'/, '待赋权缺口须标记 gapAction=auth');
  assert.match(OVERVIEW, /function _openActivityDetailForAuth\(target\)/, '须有「待赋权直达活动详情」出口');
  assert.match(OVERVIEW, /objectDetailHref\('activity', id, \{ entry: 'workspace-aggregate' \}\)/,
    '活动详情 href 须经 objectDetailHref（不得手拼 activity.html?id=）');
  assert.doesNotMatch(OVERVIEW, /activity\.html\?id=/, '不得手拼活动详情 URL');
  // 待我处理：待办组带 group 目标、汇报带 report 目标（落在具体行）
  assert.match(OVERVIEW, /target: \{ kind: 'group', id: group\.groupKey \|\| '' \}/, '待办行须带聚合组目标');
  assert.match(OVERVIEW, /target: \{ kind: 'report', id: report\.id \|\| '' \}/, '汇报行须带汇报目标');
});

test('W10 功能色：缺口 / 超期 / 缺勤取 status 文字档，纯计数 neutral-600，条线表无主题色文字', () => {
  // 纯计数：METRIC_TONE.normal 取 --neutral-600（不是状态色）
  assert.match(OVERVIEW, /normal: 'var\(--neutral-600\)'/, '纯计数须取 --neutral-600');
  assert.match(OVERVIEW, /key: 'active', label: '在办'[^\n]*color: METRIC_TONE\.normal/, '在办指标须取纯计数色');
  // 缺口文字：超期 / 逾期 / 缺勤 / 滞留取 warning，其余取 info，且只取 -text 档
  assert.match(OVERVIEW, /function _gapTextHtml\(gap\)/, '缺口文字须有统一取色函数');
  assert.match(OVERVIEW, /\/超期\|逾期\|缺勤\|滞留\//, '超期 / 逾期 / 缺勤 / 滞留须单列 warning 档');
  assert.match(OVERVIEW, /color:var\(--status-\$\{tone\}-text\)/, '缺口文字只取 --status-*-text（填充档不承担文字）');
  // 条线表：在办计数 neutral-600；表格里不再有 text-accent 文字（主题色只留给「待我处理」主行动）
  assert.match(OVERVIEW, /data-label="在办"><span style="color:var\(--neutral-600\)">/, '在办计数须取 --neutral-600');
  const lineBlock = /const tableRows = lineRows\.map\(\(row\) => \{[\s\S]*?\}\)\.join\(''\);/.exec(OVERVIEW);
  assert.ok(lineBlock, '未找到条线表渲染块');
  assert.doesNotMatch(lineBlock[0], /text-accent/, '条线表行内不得再用主题色文字（5 行内 ≥3 处即判红）');
  const cellBlock = /function _gapCellHtml\(row\) \{[\s\S]*?\n\}/.exec(OVERVIEW);
  assert.ok(cellBlock, '未找到待处理格渲染函数');
  assert.doesNotMatch(cellBlock[0], /text-accent/, '缺口入口不得再用主题色文字');
  // 「待我处理」主行动仍保留主题色（动作 / 导航 / 选中态用主题色）
  assert.match(OVERVIEW, /class="btn-outline btn-sm text-accent flex-shrink-0"/, '待我处理主行动须保留主题色');
});
