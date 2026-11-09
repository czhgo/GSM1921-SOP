// role: [工程师]+[AI]
// ui-first-screen-order.test.mjs — 首屏浏览顺序守卫（2026-10-19 立 · Task 7）
//
// 来源：Spec「最小三成本」Task 7 / SubTask 7.1–7.4；判例＝「说明压在主体前 / 同一指标出现两次 / 行内动作过多」。
// 裁定：§10.5 首屏浏览顺序（主对象优先、说明后置、指标单点、动作收敛）＋ §10.6 10 个抽样页登记。
//
// 判据：
//   F1 DESIGN_SYSTEM §10.5 存在，四条规则与三条布尔条件齐备；
//   F2 DESIGN_SYSTEM §10.6 存在，10 行抽样页齐备，状态为 4 个「已修（本 spec）」+ 6 个「已审（后续）」；
//   F3 四页重点迁移后「主对象先于 help-note」。**当前页面尚未迁移**：文件里没有 `.help-note`
//      时记为「页面任务待满足」并跳过，不写死失败；迁移后由后续 agent 在 Task 9 收紧为 DOM 顺序断言。
//   F6 注册页签集合 ≡ TAB_BLOCK_BASELINE 键集合（双向相等；新增 / 删除页签未登记即红）；
//   F7 块数 > TAB_BLOCK_LIMIT 的页签必须有非空 reason；
//   F8 反例：合成 blocks=5 无 reason 判红、合成注册页签缺基线判红；
//   F9 非空转：基线规模 ≥45、每条含数值 blocks 与 reason 字段；
//   F10 活动详情「对象头 + 事项轴」（2026-11-10 批次 540 波次 4）：主对象与主 CTA 先于参与段、
//       段落顺序 参与 → 议程 → 收口 → 管理动作、源码级顶层块 ≤6、写口宿主与既有调用不因重排丢失、
//       基本信息 390 单列（`grid-cols-1 sm:grid-cols-2`）、日期只在对象头出现一次。
//
// 运行：node --test server/test/ui-first-screen-order.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TAB_BLOCK_BASELINE, TAB_BLOCK_LIMIT, TAB_BLOCK_TOTAL_BASELINE } from './style-baseline.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DESIGN = join(ROOT, 'content', '04_web_design', 'design-system', 'DS_05_MAP_AND_REFERENCE.md');
const DESIGN_CASES = join(ROOT, 'content', '04_web_design', 'design-system', 'CASES.md');

/** 四页重点（Task 3–6 的迁移对象；页面断言留给后续 Task 9） */
const KEY_PAGES = [
  { label: '支书 · 党小组', file: join(ROOT, 'docs', 'src', 'entries', 'tabs', 'secretary', 'group-progress-tab.js') },
  { label: '支书 · 支委会', file: join(ROOT, 'docs', 'src', 'entries', 'tabs', 'secretary', 'committee-meeting-tab.js') },
  { label: '支书 · 全局概况', file: join(ROOT, 'docs', 'src', 'components', 'governance', 'work-overview.js') },
  { label: '支书 · 待办', file: join(ROOT, 'docs', 'src', 'entries', 'tabs', 'secretary', 'todo-tab.js') },
];

function sliceBetween(src, startMarker, endMarker) {
  const start = src.indexOf(startMarker);
  if (start < 0) return '';
  const end = src.indexOf(endMarker, start + startMarker.length);
  return end < 0 ? src.slice(start) : src.slice(start, end);
}

test('F1 DESIGN_SYSTEM §10.5 首屏浏览顺序：四条规则 + 三条布尔条件', () => {
  const src = readFileSync(DESIGN, 'utf8');
  const section = sliceBetween(src, '### 10.5 首屏浏览顺序', '### 10.6');
  assert.ok(section.length > 100, 'DESIGN_SYSTEM 缺 §10.5「首屏浏览顺序」或正文过短');
  for (const key of ['主对象优先', '说明后置', '指标单点', '动作收敛']) {
    assert.ok(section.includes(key), `§10.5 缺规则「${key}」`);
  }
  for (const key of ['B-1', 'B-2', 'B-3']) {
    assert.ok(section.includes(key), `§10.5 缺布尔条件「${key}」`);
  }
  assert.ok(section.includes('1 个主按钮'), '§10.5 缺「每屏 1 个主按钮」动作收敛口径');
});

test('F2 DESIGN_SYSTEM §10.6 10 个抽样页乱象登记齐备（4 已修 + 6 已审）', () => {
  const src = readFileSync(DESIGN_CASES, 'utf8');
  const related = readFileSync(DESIGN, 'utf8');
  const section = sliceBetween(src, '### 10.6', '## 迁移登记 C');
  assert.ok(section.length > 100, 'DESIGN_SYSTEM 缺 §10.6「10 个抽样页乱象登记」或正文过短');
  const rows = section.split('\n').filter((l) => /^\|\s*(支书|组织|宣传|纪检|组长|成员)\s*·/.test(l));
  assert.equal(rows.length, 10, `§10.6 抽样页应为 10 行，实测 ${rows.length} 行`);
  const fixed = rows.filter((l) => l.includes('已修（本 spec）')).length;
  const audited = rows.filter((l) => l.includes('已审（后续）')).length;
  assert.equal(fixed, 4, `§10.6「已修（本 spec）」应为 4 页，实测 ${fixed} 页`);
  assert.equal(audited, 6, `§10.6「已审（后续）」应为 6 页，实测 ${audited} 页`);
  for (const key of ['说明后置', '指标单点', '动作收敛']) {
    assert.ok(section.includes(key) || related.includes(key), `§10.6 缺乱象模式「${key}」`);
  }
});

test('F4 待办首屏：折叠条默认展开露 2 条待答复；未读通知二级折叠；「我的待办」紧随其后', () => {
  const src = readFileSync(join(ROOT, 'docs', 'src', 'components', 'record', 'todo-tab-shell.js'), 'utf8');
  const inbox = readFileSync(join(ROOT, 'docs', 'src', 'components', 'record', 'report-inbox.js'), 'utf8');
  assert.match(src, /<details class="todo-strip[^"]*"/, '待办页顶应使用原生 details 折叠条');
  assert.match(src, /let _stripOpen = true;/, '折叠条默认展开');
  assert.match(src, /\$\{_stripOpen \? ' open' : ''\}/, '用户折叠后重建仍保留折叠态');
  assert.match(src, /待答复与未读通知/, '折叠条摘要应显示合并后的条名');
  // 未读通知：二级 details，默认不 open，摘要带条数
  const unreadFn = sliceBetween(src, 'function _unreadRowsHtml', 'function _todoStripHtml');
  assert.match(unreadFn, /<details[^>]*class="todo-strip__section[^"]*"/, '未读通知应为二级折叠');
  assert.doesNotMatch(unreadFn, /<details[^>]*\bopen\b/, '未读通知二级折叠默认收起');
  assert.match(unreadFn, /未读通知\s*<span[^>]*>\$\{notices\.length\}/, '未读折叠摘要应显示「未读通知 N」');
  // 待答复：embedded 默认只露 2 条，其余经「查看全部待答复」展开
  assert.match(inbox, /embeddedLimit\s*=\s*2/, 'embedded 模式默认限制 2 条待答复');
  assert.match(inbox, /sorted\.slice\(0, limit\)|rows\.slice\(0, payload\.limit\)/, 'embedded 模式只渲染前 limit 条');
  assert.match(inbox, /查看全部待答复/, '其余待答复经「查看全部待答复」展开');
  // 2026-10-25 Task 3：卡片类移到外层容器，`<details>` 只保留 `.todo-strip`（标题已移出 summary）
  const detailsStart = src.indexOf('<details class="todo-strip"');
  const detailsEnd = src.indexOf('</details>', detailsStart);
  const stripBody = src.slice(detailsStart, detailsEnd);
  assert.ok(stripBody.includes('${extraHtml}') && stripBody.includes('${unreadHtml}'),
    '展开区应同时承载待答复收件箱与未读通知行');
  const stripInsert = src.indexOf('${stripHtml}');
  const mainObject = src.indexOf('>我的待办</h3>');
  assert.ok(stripInsert >= 0 && mainObject > stripInsert,
    '首屏顺序：折叠条先于「我的待办」');
});

test('F5 党小组主从双栏：左栏组列表 + 右栏活动台账（日期 / 活动 / 复盘状态 / 应到·实到）', () => {
  const src = readFileSync(join(ROOT, 'docs', 'src', 'entries', 'tabs', 'secretary', 'group-progress-tab.js'), 'utf8');
  // 主从双栏骨架：左栏组列表 + 右栏组详情（2026-11-01 Task 4）
  assert.match(src, /lg:grid-cols-\[320px_minmax\(0,1fr\)\]/, '党小组页应为主从双栏栅格（左 320 / 右自适应）');
  assert.match(src, /function _groupRailHtml/, '缺左栏组列表');
  assert.match(src, /function _groupDetailHtml/, '缺右栏组详情');
  assert.ok(!src.includes('_manageCardHtml'), '不得回退到独立「党小组清单」卡');
  assert.ok(!src.includes('>选择党小组<'), '不得回退到「选择党小组」独立卡');
  // 活动台账列（合并原复盘状态 + 活动与考勤）；2026-11-10 批次 540 起列声明由 `LEDGER_COLUMNS`
  //   交给 `renderDataTable`（表头 / colgroup 由组件产出），判据改为读列声明本身。
  const colsBlock = /const LEDGER_COLUMNS = \[([\s\S]*?)\];/.exec(src)?.[1] || '';
  const cols = [...colsBlock.matchAll(/label:\s*'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(cols, ['日期', '活动', '复盘状态', '应到 · 实到'],
    `活动台账表头应为 4 列，实测 ${JSON.stringify(cols)}`);
  assert.ok(!src.includes('space-y-1.5 min-w-[180px]'),
    '负责人单元格仍保留第三行嵌套（space-y-1.5 min-w-[180px]），应压到一行');
});

test('F3 四页重点主对象先于 help-note（党小组 / 支委会已迁移；概况 / 待办无 help-note）', () => {
  for (const { label, file } of KEY_PAGES) {
    const src = readFileSync(file, 'utf8');
    if (!src.includes('help-note')) {
      console.log(`[ui-first-screen-order] ${label} 尚未迁移到 .help-note（页面顺序断言待后续 Task 9 收紧）`);
      continue;
    }
    // 迁移开始后：帮助注释不得出现在文件最前段的说明区（这里只做粗粒度防退化）。
    const helpIdx = src.indexOf('help-note');
    const firstMainIdx = Math.min(
      ...['<table', 'data-table', 'renderDataTable', 'cm-roster-table', 'cm-meeting-table', 'data-metric', 'todo-list', '我的待办']
        .map((t) => src.indexOf(t))
        .filter((i) => i >= 0),
    );
    assert.ok(Number.isFinite(firstMainIdx) && firstMainIdx < helpIdx,
      `${label} 的 help-note 出现在主对象之前（应说明后置）`);
  }
});

// ── 页签密度基线（2026-11-01 · spec consolidate-tab-density-and-filter-bars Task 1）──
// 清单数据源：`.ctx/evidence/2026-11-01/tab-inventory.json`（45 条），基线落在 style-baseline.mjs。
// 口径：从 7 份能力注册文件抽「id + label」声明，与 TAB_BLOCK_BASELINE 键集合双向比对；
//   块数 > 4 的页签必须写明原因（登记例外），其余条目 reason 可为空串。
const CAPABILITY_FILES = [
  ['secretary', 'secretary-workspace.js'],
  ['org', 'org-workspace.js'],
  ['prop', 'prop-workspace.js'],
  ['disc', 'disc-workspace.js'],
  ['leader', 'leader-workspace.js'],
  ['visitor', 'visitor-workspace.js'],
  ['party-committee', 'party-committee-workspace.js'],
];

/** 抽取注册页签（与 `catalog-sync` 的 tabLabelsOf 同口径：只认 `{ id: '…', label: '…' }` 行） */
function parseRegisteredTabs(files = CAPABILITY_FILES) {
  const rows = [];
  for (const [role, name] of files) {
    const src = readFileSync(join(ROOT, 'docs', 'src', 'capabilities', name), 'utf8');
    const re = /\{\s*id:\s*'([^']+)',\s*label:\s*'([^']+)'/g;
    let m;
    while ((m = re.exec(src))) {
      rows.push({ role, tab: m[1], label: m[2], key: `${role}.${m[1]}` });
    }
  }
  return rows;
}

/** 双向差集：注册页签缺基线 / 基线缺注册页签（接受字符串键或 { key } 对象） */
function diffTabKeys(registered, baseline = TAB_BLOCK_BASELINE) {
  const reg = new Set((registered || []).map((r) => (typeof r === 'string' ? r : r.key)));
  const base = new Set(Object.keys(baseline || {}));
  return {
    missingFromBaseline: [...reg].filter((k) => !base.has(k)).sort(),
    missingFromRegistry: [...base].filter((k) => !reg.has(k)).sort(),
  };
}

/** 超限但未写原因的页签键（blocks > limit 且 reason 为空/空白） */
function oversizeWithoutReason(baseline = TAB_BLOCK_BASELINE, limit = TAB_BLOCK_LIMIT) {
  return Object.entries(baseline || {})
    .filter(([, v]) => Number(v?.blocks) > limit)
    .filter(([, v]) => !String(v?.reason || '').trim())
    .map(([k]) => k)
    .sort();
}

test('F6 注册页签集合 ≡ TAB_BLOCK_BASELINE（45 条 · 双向相等）', () => {
  const registered = parseRegisteredTabs();
  assert.ok(registered.length >= TAB_BLOCK_TOTAL_BASELINE,
    `注册页签只解析到 ${registered.length} 条（下限 ${TAB_BLOCK_TOTAL_BASELINE}）：注册解析被写坏，本条会恒真`);
  const { missingFromBaseline, missingFromRegistry } = diffTabKeys(registered);
  assert.deepEqual(missingFromBaseline, [],
    `注册表有、TAB_BLOCK_BASELINE 未登记的页签（新增页签须同批登记块数）：${missingFromBaseline.join(' / ')}`);
  assert.deepEqual(missingFromRegistry, [],
    `TAB_BLOCK_BASELINE 有、注册表已无的页签（删除页签须同批删基线）：${missingFromRegistry.join(' / ')}`);
});

test('F7 块数 > 4 的页签必须有非空 reason（登记例外，不得静默超限）', () => {
  const violations = oversizeWithoutReason();
  assert.deepEqual(violations, [], `以下页签 > ${TAB_BLOCK_LIMIT} 块却未写原因：${violations.join(' / ')}`);
  const oversize = Object.entries(TAB_BLOCK_BASELINE).filter(([, v]) => Number(v.blocks) > TAB_BLOCK_LIMIT);
  assert.ok(oversize.length > 0, '非空转：当前应确有 >4 块页签，超限筛选逻辑不得退化为恒空');
});

test('F8 反例：合成 blocks=5 无 reason 判红；合成注册页签缺基线判红', () => {
  assert.deepEqual(oversizeWithoutReason({ 'x.y': { blocks: 5, reason: '' } }), ['x.y'],
    '合成 blocks=5 且 reason 为空必须判红');
  assert.deepEqual(oversizeWithoutReason({ 'x.y': { blocks: 5, reason: '登记理由' } }), [],
    '已写原因的超限条目不得误伤');
  assert.deepEqual(oversizeWithoutReason({ 'x.y': { blocks: 4, reason: '' } }), [],
    '未超限条目不得误伤');
  const diff = diffTabKeys([{ key: 'secretary.unknown-tab' }], TAB_BLOCK_BASELINE);
  assert.deepEqual(diff.missingFromBaseline, ['secretary.unknown-tab'],
    '合成注册页签缺基线必须判红');
});

test('F9 基线非空转：规模 ≥45、每条含数值 blocks 与 reason 字段', () => {
  const entries = Object.entries(TAB_BLOCK_BASELINE);
  assert.ok(entries.length >= TAB_BLOCK_TOTAL_BASELINE,
    `TAB_BLOCK_BASELINE 只有 ${entries.length} 条（下限 ${TAB_BLOCK_TOTAL_BASELINE}）`);
  for (const [key, value] of entries) {
    assert.match(key, /^[a-z-]+\.[a-z-]+$/, `基线键应为 role.tab：${key}`);
    assert.equal(typeof value?.blocks, 'number', `${key} 缺数值 blocks`);
    assert.ok(Number.isInteger(value.blocks) && value.blocks >= 1, `${key} 的 blocks 应为正整数`);
    assert.ok(Object.hasOwn(value, 'reason'), `${key} 缺 reason 字段（未超限可为空串）`);
  }
});

// ── F10 活动详情「对象头 + 事项轴」（2026-11-10 批次 540 波次 4 · A 方案）──
// 判例：原详情页把报名 / 名单 / 应到 / 品牌 / 复盘要求 / 转交 / 强调 / 关报名 / 议程 / 汇报 / 分工
//   并列成 14 个顶层块，首屏看不到主对象与主操作。本守卫钉住重排后的**结构契约**：
//   段落顺序、写口宿主、390 单列、日期单点；真实读数（顶层块 / 截图）进
//   `.ctx/evidence/2026-11-10/activity-detail/`。
test('F10 活动详情：对象头 + 事项轴，写口宿主与首屏块数守住', () => {
  const src = readFileSync(join(ROOT, 'docs', 'src', 'entries', 'pages', 'activity-entry.js'), 'utf8');
  const start = src.indexOf('<!-- ① 对象头（批次 540 波次 4 · A 方案）');
  assert.ok(start > 0, '未找到活动详情对象头注释：重排结构被写坏的征兆');
  const end = src.indexOf('\n  `;', start);
  assert.ok(end > start, '未找到活动详情模板终点');
  const tpl = src.slice(start, end);
  assert.ok(tpl.length > 2000, `活动详情模板抽取为空（${tpl.length} 字符），守卫会恒真`);

  // 1) 主对象优先：标题 H2 与主 CTA 都先于「参与」段
  const participation = tpl.indexOf('activity-participation-title');
  assert.ok(participation > 0, '缺「参与」段');
  const h2 = tpl.indexOf('font-title-cn');
  const cta = tpl.indexOf('${_nextStepRowHtml(');
  assert.ok(h2 > 0 && h2 < participation, '活动标题须在「参与」段之前（主对象优先）');
  assert.ok(cta > 0 && cta < participation, '主 CTA（报名 / 材料）须在对象头内、先于「参与」段（首屏可见）');

  // 2) 段落顺序：参与 → 议程 → 收口 → 管理动作（说明后置、动作收敛）
  const seq = ['activity-participation-title', 'activity-agenda-title', 'activity-closure-title', '${manageSectionHtml}']
    .map((key) => tpl.indexOf(key));
  assert.ok(seq.every((i) => i >= 0),
    `段落被删：缺 ${['参与', '议程', '收口', '管理动作'][seq.findIndex((i) => i < 0)]}`);
  assert.deepEqual([...seq].sort((a, b) => a - b), seq,
    '段落顺序应为 参与 → 议程 → 收口 → 管理动作（管理项不得插回主路径）');
  assert.equal((src.match(/<details id="activity-manage-section"/g) || []).length, 1,
    '页尾「管理动作」折叠块应恰有一个 details');

  // 3) 源码级顶层块 ≤6（对象头 / 参与 / 议程 / 收口 / 管理动作；原为 14）
  const topLevel = [...tpl.matchAll(/^ {4}<(section|div|details)\b/gm)].map((m) => m[1]);
  assert.ok(topLevel.length <= 6, `顶层块 ${topLevel.length} 个（上限 6）：${topLevel.join(' / ')}`);

  // 4) 收口四步：材料 · 考勤 · 复盘 · 归档
  for (const step of ['材料', '考勤', '复盘', '归档']) {
    assert.ok(src.includes(`label: '${step}'`), `收口 stepper 缺「${step}」步`);
  }

  // 5) 写口宿主与既有调用不得因重排丢失
  for (const id of ['activity-signup-section', 'signup-close-btn', 'committee-emphasis-btn',
    'work-assignments-host', 'workgroup-reports-summary', 'activity-manage-section']) {
    assert.ok(src.includes(id), `重排后丢了宿主 / 钩子 #${id}`);
  }
  for (const call of ['renderSignupSection(', 'renderSignupList(', 'renderWorkgroupMemberEditor(',
    'bindSignupEvents(', 'bindWorkgroupMemberEditor(', '_bindWorkAssignments(', '_closureStepperHtml(']) {
    assert.ok(src.includes(call), `重排后丢了既有调用 ${call}`);
  }

  // 6) 390 单列：基本信息走 grid-cols-1 sm:grid-cols-2，不得残留裸两列
  assert.match(tpl, /grid grid-cols-1 gap-3 sm:grid-cols-2/, '基本信息应为 grid-cols-1 sm:grid-cols-2（390 单列）');
  assert.ok(!/class="grid grid-cols-2 /.test(tpl), '不得残留 390 强制两列的裸 grid-cols-2');

  // 7) 日期单点：模板内只出现一次
  assert.equal((tpl.match(/\$\{act\.date/g) || []).length, 1, '日期在详情模板中出现多次（应只在对象头一次）');
});

