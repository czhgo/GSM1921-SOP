// role: [工程师]+[AI]
// round1-remediation-guard.test.mjs — Round 1 修复批（U-04 / U-05 / U-09 / U-23 / U-35）常驻守卫
//
// 立此守卫的原因（2026-10-19）：
//   本轮修的是「结构层已拆完、交互层没闭环」的五处缺口。若不落机检，下一批很容易把它们改回去：
//     · U-04 申诉 / 待确认行打回回退成 `window.prompt`；会议 label 丢 `for`；
//     · U-05 招募浮窗回退成手写 overlay（丢 dialog 语义）；视图钮丢 `aria-pressed`；
//     · U-09 空态出口按钮被删（空态又成死胡同）；
//     · U-23 材料闭环页 / 入口 / 三步任一被删；
//     · U-35 组长台「我的任务」承载面被删或改回另一份数据源。
// 口径：只做**结构层静态断言**（S 类，不 import playwright）；真机复核见执行日志。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

test('R1 U-04 纪检考勤：无 window.prompt · 会议 label 关联 · 视图 aria-pressed', () => {
  const src = read('docs/src/entries/tabs/disc/attendance-tab.js');
  assert.ok(!/window\.prompt\s*\(/.test(src), '考勤页不得再使用 window.prompt（打回说明走项目内浮窗）');
  assert.match(src, /_openReturnNoteModal\(/, '缺少打回说明浮窗单一源 _openReturnNoteModal');
  assert.match(src, /\bopenModal\(\{/, '打回说明须走 components/ui/modal.js::openModal');
  assert.match(src, /for="disc-meet-activity"/, '会议活动 label 须与 select 通过 for/id 关联');
  assert.match(src, /id="disc-meet-activity"/, '会议活动 select 缺少 id（label 无法关联）');
  assert.match(src, /data-att-view="process" aria-pressed=/, '「确认与录入」视图钮须带 aria-pressed');
  assert.match(src, /data-att-view="data" aria-pressed=/, '「数据查看」视图钮须带 aria-pressed');
});

test('R2 U-05 专班管理：招募浮窗走通用 modal · 视图 aria-pressed · 折叠 aria-expanded', () => {
  const src = read('docs/src/entries/tabs/org/taskforce-tab.js');
  assert.match(src, /id: 'recruit-form-modal'/, '招募浮窗应走 openModal 且 id=recruit-form-modal');
  assert.match(src, /closeModal\('recruit-form-modal'\)/, '关闭应走 closeModal（统一注销 Esc / 还原 inert）');
  assert.ok(!/recruit-form-overlay/.test(src), '手写 overlay 应已撤除（回退即丢 dialog 语义）');
  // 2026-10-20 第三轮 IA 判例④：活动工作组已迁回组织台「活动日历」页，专班页只剩两个视图。
  for (const view of ['workgroups', 'matrix']) {
    assert.match(src, new RegExp(`data-view="${view}" aria-pressed=`), `视图钮「${view}」缺少初始 aria-pressed`);
  }
  assert.doesNotMatch(src, /data-view="activities"/, '专班页不得回潮「活动工作组」视图（活动已迁至活动日历页）');
  assert.match(src, /setAttribute\('aria-pressed', on \? 'true' : 'false'\)/, '视图切换未同步 aria-pressed');
  // 2026-10-21 R3-27：招募通知由「展开器」改为紧凑勾选（勾选即展开，与活动表单同款）。
  assert.match(src, /id="rf-notice-check"[^>]*type="checkbox"/, '「同时发布通知」须为紧凑勾选框');
  assert.match(src, /noticeCheck\?\.addEventListener\('change'/, '勾选状态须控制通知字段显隐');
  assert.match(src, /id="rf-notice-body"/, '通知字段容器须保留');
  // 焦点接管必须落在正文首个字段，而不是右上角 ×（2026-10-19 真机复核修正）
  const modal = read('docs/src/components/ui/modal.js');
  assert.match(modal, /const body = panel\.querySelector\('\.modal-body'\)/,
    'modal.js 焦点接管须把选择器限定在 .modal-body 内');
  assert.match(modal, /body\.querySelector\(_FOCUSABLE\)/, 'modal.js 未在正文内取首个可聚焦元素');
});

test('R3 U-09 项目分工空态：两个出口 + aria-pressed + 无 transition-all', () => {
  const proj = read('docs/src/entries/tabs/visitor/projects-tab.js');
  assert.match(proj, /emptyActionHtml:[\s\S]{0,200}?data-proj-subview="mine"/, '「我的任务」空态缺少「去看我的分工」出口');
  assert.match(proj, /emptyActionHtml:[\s\S]{0,260}?data-proj-subview="\$\{[^}]*'all'[^}]*\}"/, '「我的分工」空态缺少「浏览全局分工」出口');
  assert.match(proj, /aria-pressed="\$\{_projSubView === t\.key\}"/, '子视图钮缺少 aria-pressed');
  assert.ok(!/transition-all/.test(proj), '项目分工子视图钮不得再用 transition-all（应改具体属性）');
  const lf = read('docs/src/components/ui/list-filter.js');
  assert.match(lf, /emptyStateHtml\(config\.emptyMessage, \{ actionHtml: config\.emptyActionHtml \}\)/,
    'list-filter 非表格空态须走 empty-state 并支持 emptyActionHtml');
});

test('R4 U-23 活动材料闭环：页面 / 入口 / 三步 / 复用既有写口', () => {
  assert.ok(existsSync(join(ROOT, 'docs/activity-materials.html')), '缺少 docs/activity-materials.html');
  const entry = read('docs/src/entries/pages/activity-materials-entry.js');
  assert.match(entry, /hydrateDataSource\(/, '材料闭环页须走 P0-2 数据源装配');
  assert.match(entry, /BranchService\.archiveActivity\(/, '提交归档须复用 BranchService.archiveActivity（单一写口）');
  assert.match(entry, /loadAttendanceRecords\(/, '材料清单须复用既有考勤读取');
  assert.match(entry, /loadActivityReviews\(/, '材料清单须复用既有复盘读取');
  assert.match(entry, /mockDB\.imageRecords/, '宣传材料须复用既有 imageRecords');
  assert.match(entry, /① 材料清单/, '缺少第①步「材料清单」');
  assert.match(entry, /② 核对材料/, '缺少第②步「核对材料」');
  assert.match(entry, /③ 提交归档/, '缺少第③步「提交归档」');
  // 入口：活动详情 + 支书台 + 组织台
  assert.match(read('docs/src/entries/pages/activity-entry.js'), /activity-materials\.html\?id=/, '活动详情缺少材料闭环入口');
  assert.match(read('docs/src/entries/tabs/secretary/todo-tab.js'), /activity-materials\.html\?id=/, '支书台待归档区缺少材料闭环入口');
  // 2026-10-20 第三轮 IA 判例④：活动工作组迁到组织台「活动日历」页，材料闭环入口随迁（承接组件＝activity-progress.js）。
  const orgCalendar = read('docs/src/entries/tabs/org/activity-calendar-tab.js');
  assert.match(orgCalendar, /renderActivityProgress\(/, '组织台活动日历页未挂载「活动进展」分段');
  const orgProgress = read('docs/src/components/governance/activity-progress.js');
  assert.match(orgProgress, /activity-materials\.html\?id=/, '组织台活动区缺少材料闭环入口');
  assert.doesNotMatch(orgProgress, /archiveActivity\(/, '组织台活动区不得另造归档写口（归档仍走材料闭环页单一写口）');
  // 台账：页面清单与快照
  assert.match(read('README-server.md'), /docs\/activity-materials\.html/, 'README-server §3.1 未登记材料闭环页');
  assert.match(read('.ctx/SNAPSHOT.md'), /activity-materials\.html/, 'SNAPSHOT 未登记材料闭环页');
});

test('R5 U-35 组长台「我的任务」：承载面 + 复用单一口径 + 已接线', () => {
  const section = read('docs/src/entries/tabs/leader/my-tasks-section.js');
  assert.match(section, /listMyProjectTasks\(/, '我的任务须复用 listMyProjectTasks');
  assert.match(section, /completeMyProjectTask\(/, '勾掉须复用 completeMyProjectTask');
  assert.match(section, /export function myTasksSectionHtml/, '缺少 myTasksSectionHtml 导出');
  assert.match(section, /export function bindMyTasksSection/, '缺少 bindMyTasksSection 导出');
  assert.match(section, /暂无我的任务/, '缺少空态文案「暂无我的任务」');
  assert.match(section, /与「待办」页的待办聚合口径不同/, '缺少与待办聚合的口径区分说明');
  const write = read('docs/src/entries/tabs/leader/write-tab.js');
  assert.match(write, /myTasksSectionHtml\(/, '组长台「本组活动」未挂载我的任务区块');
  assert.match(write, /bindMyTasksSection\(/, '我的任务勾掉未接线');
});
