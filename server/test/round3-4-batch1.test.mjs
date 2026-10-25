// role: [工程师]+[AI]
// round3-4-batch1.test.mjs — Round 3/4 修复 batch 1 壳 / 日历 / 杂项守卫（S 类）
//
// 覆盖：R3-U01 页签右侧动作移出滚动容器 · R3-U03 页签错误卡 + 重试 · R3-D05 激活页签滚入视口
//      R3-F02 通知条目键盘守卫 / 铃铛未读数 · R3-U07 材料四类恒显示 + 步骤条单调
//      R3-U08「今天」聚合错误态 · R3-F09 卡点前置 · R3-F10 活动行动作换行
//      R4-F07 + R3-F03/B01 日历空态 / 图例 / 键盘 · R4-D07 DATA_MODEL 校准
// 运行：node --test server/test/round3-4-batch1.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const TAB_BAR = read('docs/src/components/shell/tab-bar.js');
const HEADER = read('docs/src/components/shell/header.js');
const MATERIALS = read('docs/src/entries/pages/activity-materials-entry.js');
const TODAY = read('docs/src/entries/tabs/today/today-tab.js');
const MEMBERS = read('docs/src/entries/tabs/leader/members-tab.js');
const ACTIVITIES = read('docs/src/entries/tabs/visitor/activities-tab.js');
const CALENDAR = read('docs/src/components/record/calendar.js');
const DATA_MODEL = read('content/04_web_design/data/DATA_MODEL.md');

test('R3-U01 页签右侧动作（发布招募）在滚动容器之外', () => {
  assert.match(TAB_BAR, /class="ws-tab-shell"[^>]*style="display:flex;align-items:center;gap:8px;"/, 'tab 外壳应为 flex 布局');
  assert.match(TAB_BAR, /class="ws-tab-scroll [^"]*flex-1 min-w-0"/, '滚动容器应为 flex-1 min-w-0');
  assert.match(TAB_BAR, /const extraSlot = extraRightHtml \? `<div class="ws-tab-extra shrink-0">\$\{extraRightHtml\}<\/div>`/,
    '右侧动作应独立为 .ws-tab-extra');
  const htmlStart = TAB_BAR.indexOf('const html = `<div class="ws-tab-shell"');
  const scrollStart = TAB_BAR.indexOf('class="ws-tab-scroll', htmlStart);
  const scrollEnd = TAB_BAR.indexOf('</div></div>', scrollStart);
  const extraIdx = TAB_BAR.indexOf('${extraSlot}', htmlStart);
  assert.ok(scrollStart >= 0 && extraIdx > scrollEnd,
    'extraHtml 必须渲染在 .ws-tab-scroll 闭合之后，不能藏进页签滚动容器');
  assert.ok(!TAB_BAR.slice(scrollStart, extraIdx).includes('extraSlot'),
    '滚动容器内不得再拼 extraSlot');
  assert.match(TAB_BAR, /data-tab-scroll-dir="-1"|data-tab-scroll-dir="1"/, '左右滚动箭头应保留');
});

test('R3-U03 页签模块加载/渲染失败落统一错误卡，可重试', () => {
  assert.match(TAB_BAR, /这个页签暂时没加载出来/);
  assert.match(TAB_BAR, /data-ws-tab-error/);
  assert.match(TAB_BAR, /data-ws-tab-retry>重试<\/button>/);
  // 2026-10-25 Task 1.2（统一渲染生命周期）：错误卡函数不再接收过时刻的 ctx——
  //   重试时由 `_resolveCtx()` 取最新 state，故签名收窄为 `(tab)`；判据仍是「统一错误卡函数」。
  assert.match(TAB_BAR, /function _renderTabError\(tab\)/, '错误卡应封装为统一渲染函数');
  assert.match(TAB_BAR, /_renderInFlight\.delete\(tab\.id\)/, '重试前应清掉失败缓存');
  // 同上：重试重新走 `_safeRender(tab)`（ctx 由渲染入口统一解析，避免重试沿用旧快照）。
  assert.match(TAB_BAR, /_safeRender\(tab\);/, '重试应重新走 _safeRender');
  // 同上：reject 分支改为 `Promise.resolve(rendered).then(ok, (e) => { … finish(false) })`
  //   （去掉了私有 `done()` 包装，但「失败 → 错误卡」语义不变）。
  assert.match(TAB_BAR, /Promise\.resolve\(rendered\)\.then\(\(\) => \{[\s\S]{0,900}?\}, \(e\) => \{/,
    'Promise reject 分支应进错误态');
  assert.match(TAB_BAR, /finish\(false\)/, 'reject / throw 分支应落到失败收尾');
});

test('R3-D05 激活页签滚入视口（尊重减少动效偏好）', () => {
  assert.match(TAB_BAR, /scrollIntoView\(\{[\s\S]*?inline: 'nearest'[\s\S]*?block: 'nearest'[\s\S]*?prefers-reduced-motion: reduce/,
    'activate() 应把激活页签滚到最近可见位置');
});

test('R3-F02 通知条目键盘守卫与铃铛未读数可读', () => {
  assert.match(HEADER, /if \(ev\.target\.closest\('button,a,input,textarea,select'\)\) return;/,
    '通知条目 keydown 应先排除内嵌控件');
  assert.match(HEADER, /通知，\$\{unread\} 条未读/, '铃铛 aria-label 应动态拼未读数');
  assert.match(HEADER, /badge\.id = 'notif-badge'/, '视觉角标应保留');
});

test('R3-U07 四类材料行恒显示，步骤条单调', () => {
  assert.ok((MATERIALS.match(/_materialRowHtml\(/g) || []).length >= 4, '四类材料行应恒显示');
  assert.doesNotMatch(MATERIALS, /hasAnyMaterial\s*\?/, '不得再用 hasAnyMaterial 整块替换材料行');
  assert.match(MATERIALS, /const doneFlags = archived \? \[true, true, true\] : \[hasAnyMaterial, coreReady, false\]/,
    '已归档应三步全 done；否则只标记前两步完成');
  assert.match(MATERIALS, /const currentIdx = doneFlags\.indexOf\(false\)/,
    'current 应取第一个未完成项（全部完成时 indexOf 为 -1）');
  assert.match(MATERIALS, /归档后仍可在宣传台补交材料|仍要归档/, '缺材料仍可归档的软口径应保留');
});

test('R3-U08「今天」聚合失败显示错误态而非空态', () => {
  assert.match(TODAY, /今天的汇总暂时读取失败/);
  assert.match(TODAY, /data-today-retry>重试<\/button>/);
  assert.match(TODAY, /summaryError = true/, 'catch 应标记错误态');
  assert.match(TODAY, /delete container\.dataset\.memoKey/, '重试应清掉 memo 键后重算');
  assert.doesNotMatch(TODAY, /buildTodaySummary 失败，已渲染空态/, 'catch 不得再伪装成空态');
});

test('R3-F09 组长台卡点卡前置，无卡点一行绿提示', () => {
  const htmlStart = MEMBERS.indexOf('container.innerHTML = `');
  const htmlEnd = MEMBERS.indexOf('// 统一检索引擎（逐人进度表');
  const block = MEMBERS.slice(htmlStart, htmlEnd);
  assert.ok(block.indexOf('>卡点<') >= 0 && block.indexOf('>卡点<') < block.indexOf('>进度<'),
    '卡点卡应排在进度表之前');
  assert.match(MEMBERS, /本组无卡点/);
});

test('R3-F10 活动行动作容器允许窄屏换行，标题区保持 min-w-0', () => {
  assert.match(ACTIVITIES, /class="flex flex-wrap justify-end items-center gap-1\.5"/);
  assert.match(ACTIVITIES, /class="flex flex-wrap justify-end items-center gap-1\.5 flex-shrink-0"/);
  assert.match(ACTIVITIES, /class="flex flex-wrap items-center gap-3 p-3/, '行动作应允许换到第二行');
  assert.match(ACTIVITIES, /flex-1 min-w-0/, '标题区应保持 min-w-0');
});

test('R4-F07 + R3-F03/B01 日历为空态/图例兜底，活动与日期格键盘可达', () => {
  assert.match(CALENDAR, /empty\.id = 'cal-main-empty'/, '渲染器应兜底创建 #cal-main-empty');
  assert.match(CALENDAR, /items\.id = 'legend-items'/, '渲染器应兜底创建 #legend-items');
  assert.match(CALENDAR, /cal-activity-item[^\n]*tabindex="0" role="button" aria-label="查看活动：/,
    '活动条目应可聚焦并带可访问名称');
  assert.match(CALENDAR, /data-date="\$\{k\}" tabindex="0" role="gridcell"/, '日期格应可聚焦且语义为 gridcell');
  assert.match(CALENDAR, /function _bindDateCellKeys/);
  assert.match(CALENDAR, /item\.click\(\)/, '键盘 Enter/Space 应复用 click 跳转路径');
  assert.match(CALENDAR, /_bindDateCellKeys\(grid\)/);
});

test('R4-D07 DATA_MODEL 校准：41 字段 / 6 工作组域 + _seedVersion / personId / 状态优先级', () => {
  assert.match(DATA_MODEL, /实际序列化的 41 个字段/);
  assert.doesNotMatch(DATA_MODEL, /实际序列化的 35 个字段/);
  for (const field of [
    'workgroups', 'workgroupMembers', 'workgroupGrants',
    'workgroupTasks', 'workgroupOutputs', 'attendanceRosters', '_seedVersion',
  ]) {
    assert.ok(DATA_MODEL.includes('`' + field + '`'), `字段清单缺 ${field}`);
  }
  assert.ok(DATA_MODEL.includes("'draft'\\|'pending-approval'\\|'published'"),
    '活动 status 应补 pending-approval');
  assert.ok(DATA_MODEL.includes("'low'\\|'normal'\\|'urgent'"), '活动 priority 应含 low');
  assert.doesNotMatch(DATA_MODEL, /代码中仍使用 `userId`/, '人员标识口径应为 personId');
  assert.ok(DATA_MODEL.includes('参会成员人员 ID（统一命名 personId）'));
});
