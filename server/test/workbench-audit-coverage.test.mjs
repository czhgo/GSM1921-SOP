// role: [工程师]+[AI]
// 工作台审阅覆盖率守卫（2026-10-18 脏专项）
// 目的：结构索引不能替代审阅；67 个角色页签必须都有审阅记录、结论与证据。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const LEDGER = join(ROOT, '.ctx', 'WORKBENCH_67_TAB_AUDIT_DRAFT.md');
const text = readFileSync(LEDGER, 'utf8');
const NOTIFICATION_TAB = readFileSync(join(ROOT, 'docs', 'src', 'entries', 'tabs', 'secretary', 'notification-tab.js'), 'utf8');
// 2026-10-18 Task 17 回修面：支书台党小组 / 活动管理 / 今天（共享 today 只读核对）
const GROUP_PROGRESS_TAB = readFileSync(join(ROOT, 'docs', 'src', 'entries', 'tabs', 'secretary', 'group-progress-tab.js'), 'utf8');
const CALENDAR_TAB = readFileSync(join(ROOT, 'docs', 'src', 'entries', 'tabs', 'secretary', 'calendar-tab.js'), 'utf8');
const TODAY_TAB = readFileSync(join(ROOT, 'docs', 'src', 'entries', 'tabs', 'today', 'today-tab.js'), 'utf8');
const HELP = readFileSync(join(ROOT, 'docs', 'help.html'), 'utf8');
const README = readFileSync(join(ROOT, 'README-server.md'), 'utf8');

function count(pattern) {
  return (text.match(pattern) || []).length;
}

function recordCount(role) {
  const escaped = role.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const bold = new RegExp(`角色与页签\\*\\*：${escaped} · `, 'g');
  const plain = new RegExp(`角色与页签：${escaped} · `, 'g');
  return count(bold) + count(plain);
}

test('脏专项覆盖率：七个工作台角色页签数量与 67 口径一致', () => {
  assert.equal(recordCount('支书/副支书'), 12, '支书/副支书应有 12 条审阅记录');
  assert.equal(recordCount('组织委员'), 11, '组织委员应有 11 条审阅记录');
  assert.equal(recordCount('宣传委员'), 9, '宣传委员应有 9 条审阅记录');
  assert.equal(recordCount('纪检委员'), 9, '纪检委员应有 9 条审阅记录');
  assert.equal(recordCount('党小组组长'), 10, '党小组组长应有 10 条审阅记录');
  assert.equal(recordCount('普通成员'), 11, '普通成员应有 11 条审阅记录');
  assert.equal(count(/角色与页签\*\*：党委组织员 \/ /g), 5, '党委组织员应有 5 条审阅记录');
});

test('脏专项覆盖率：每条记录都有结论与证据', () => {
  assert.ok(count(/\*\*结论\*\*/g) + count(/结论：/g) >= 67, '结论条目不少于 67');
  assert.ok(count(/\*\*证据\*\*/g) + count(/证据：/g) >= 67, '证据条目不少于 67');
  assert.match(text, /合格/, '结论口径包含合格');
  assert.match(text, /需修/, '结论口径包含需修');
  assert.match(text, /阻塞/, '结论口径包含阻塞');
});

test('脏专项覆盖率：覆盖状态表列出七个工作台与 67 总数', () => {
  for (const role of ['支书', '组织委员', '宣传委员', '纪检委员', '党小组组长', '普通成员', '党委组织员']) {
    assert.ok(text.includes(`| ${role} |`), `覆盖状态表应包含 ${role}`);
  }
  assert.match(text, /12 \| 已深审/, '支书 12 已深审');
  assert.match(text, /11 \| 已深审/, '组织/成员 11 已深审');
  assert.match(text, /9 \| 已深审/, '宣传/纪检 9 已深审');
  assert.match(text, /10 \| 已深审/, '组长 10 已深审');
  assert.match(text, /5 \| 已深审/, '党委 5 已深审');
});

test('支书通知页：使命收窄为发布 + 台账，不把催读写成页面职责', () => {
  // 页面导语：明确发布动作 + 已发布台账，并说明阅读状态不在本页
  assert.match(NOTIFICATION_TAB, /发布动作 \+ 已发布台账/);
  assert.match(NOTIFICATION_TAB, /阅读状态在通知铃铛与通知详情中体现/);
  // 只允许「不做 / 不提供按人催读」这类否定表述
  const tabResidual = NOTIFICATION_TAB.replace(/不做按人催读/g, '').replace(/不提供按人催读/g, '');
  assert.ok(!tabResidual.includes('催读'), 'notification-tab.js 不得把催读写成页面职责（仅允许否定表述）');
  assert.ok(/不做按人催读|不提供按人催读/.test(NOTIFICATION_TAB), 'notification-tab.js 应明确不做按人催读');

  // help.html 支书台「通知发布」行
  const helpRow = [...HELP.matchAll(/<tr><td>通知发布<\/td>[\s\S]*?<\/tr>/g)]
    .map(m => m[0])
    .find(row => row.includes('「我的职责」段'));
  assert.ok(helpRow, 'help.html 应有支书台「通知发布」行');
  for (const word of ['发布通知与站内信', '查看', '编辑', '删除']) {
    assert.ok(helpRow.includes(word), `help.html 通知发布行应含「${word}」`);
  }
  assert.ok(!helpRow.includes('催读'), 'help.html 通知发布行不得把催读写成职责');

  // README-server.md §3.2.1 notification 行
  const readmeRow = README.split(/\r?\n/).find(line => /^\| 7 \| `notification` \/ 通知发布 \|/.test(line));
  assert.ok(readmeRow, 'README-server.md §3.2.1 应有 notification 行');
  for (const word of ['发布通知与站内信', '查看 / 编辑 / 删除已发布通知']) {
    assert.ok(readmeRow.includes(word), `README notification 行应含「${word}」`);
  }
  assert.ok(!readmeRow.includes('催读'), 'README notification 行不得把催读写成职责');
});

test('台账：支书 notification 结论为合格，结项读数同步', () => {
  const start = text.indexOf('## 7. notification / 通知发布');
  const end = text.indexOf('## 8. report-up / 上报党委');
  assert.ok(start > -1 && end > start, '台账应保留 notification 单页记录');
  const section = text.slice(start, end);
  assert.match(section, /- \*\*结论\*\*：\*\*合格\*\*/);
  assert.match(section, /发布动作 \+ 已发布台账/);
  assert.match(section, /催读不在本页/);
  assert.match(section, /另立专项/);

  assert.match(text, /\| 支书 \| 12 \| 已深审（合格 6 \/ 需修 6 \/ 阻塞 0）/);
  assert.match(text, /\| 合格 \| 6 \| todo、overview、committee-meeting、notification、report-up、tf-view \|/);
  assert.match(text, /\| 阻塞 \| 0 \| — \|/);

  assert.match(text, /\| 宣传委员 \| 9 \| 已深审（合格 6 \/ 需修 3 \/ 阻塞 0）/);
  assert.match(text, /\| 普通成员 \| 11 \| 已深审（合格 6 \/ 需修 5 \/ 阻塞 0）/);

  const closing = text.slice(text.indexOf('## 2026-10-18 脏专项结项读数'));
  assert.match(closing, /结论分布为合格 29、需修 38、阻塞 0/, '结项读数应与逐台小计一致（29 + 38 + 0 = 67）');
  const blockingLine = closing.split(/\r?\n/).find(line => line.includes('阻塞清单'));
  assert.ok(blockingLine, '结项读数应有阻塞清单');
  assert.match(blockingLine, /已清零/, '阻塞清单应写明已清零');
  for (const item of ['宣传 tasks', '宣传 kanban', '成员 attendance', '成员 inspection']) {
    assert.ok(blockingLine.includes(item), `阻塞清单应保留已修项「${item}」`);
  }
});

test('支书台 Task 17 回修：党小组标题去重 + 活动卡完整页出口 + 待处理汇报落点', () => {
  // ① group-progress：展开区内层不再重复「跨组进展」；汇报卡名实相符
  assert.match(GROUP_PROGRESS_TAB, />选择党小组</, '组切换卡标题须为「选择党小组」');
  assert.match(GROUP_PROGRESS_TAB, />组员汇报（待答复）</, '汇报卡须按内容命名为「组员汇报（待答复）」');
  assert.ok(!GROUP_PROGRESS_TAB.includes('>组员进展摘要<'), '不得再出现名不副实的「组员进展摘要」');
  assert.ok(!GROUP_PROGRESS_TAB.includes('>跨组进展</h4>'), '展开区内不得重复折叠壳的「跨组进展」标题');

  // ② calendar：右栏活动卡补完整页出口（复用 activity.html?id=，与左栏同落点）
  assert.match(CALENDAR_TAB, /_decorateInspectorActivityLinks\(\)/, '右栏渲染后须补详情链接');
  assert.match(CALENDAR_TAB, /data-sec-activity-open/, '详情链接须有稳定标记');
  assert.match(CALENDAR_TAB, /activity\.html\?id=/, '详情链接须落活动完整页');

  // ③ today：待处理汇报行统一落 todo「待答复」（共享 today 已改；本台只核残留）
  assert.match(TODAY_TAB, /data-go="todo" data-report-id=/, '汇报行须落 todo');
  assert.match(TODAY_TAB, /PendingTarget\.set\(/, '汇报行须经 PendingTarget 一次性定位「待答复」');
  assert.ok(!TODAY_TAB.includes('data-go="my-dispatch"'), '托支书的汇报行不得再指 my-dispatch / feedback');
});

test('宣传/纪检台 Task 15：条线缺口有动作、归档单一源、实时组与状态动作一致', () => {
  const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

  // ① 宣传 / 纪检概况：条线缺口行升级为去对应职责页签的按钮（不再只有数字）
  const propOverview = read('docs/src/entries/tabs/prop/overview-tab.js');
  assert.match(propOverview, /_bindLineGapActions/, '宣传概况须绑定缺口动作');
  assert.match(propOverview, /data-prop-tab="\$\{target\.tab\}"/, '待归档缺口须落档案归档页签');
  const discOverview = read('docs/src/entries/tabs/disc/overview-tab.js');
  assert.match(discOverview, /_bindLineGapActions/, '纪检概况须绑定缺口动作');
  assert.match(discOverview, /补课待完成[\s\S]{0,160}makeup/, '补课缺口须落考勤管理·补课分段');
  assert.match(discOverview, /考察超期[\s\S]{0,160}inspection/, '考察超期须落考察管理页签');

  // ② 宣传归档：活动归档判据只认 isActivityArchived，不再看 status==='completed'
  const propArchive = read('docs/src/entries/tabs/prop/archive-tab.js');
  assert.match(propArchive, /getArchiveGapActivities\(\)\.filter\(isActivityArchived\)/);
  assert.match(propArchive, /getEndedUnarchivedActivities\(\)\.filter\(a => !isActivityArchived\(a\)\)/);
  assert.doesNotMatch(propArchive, /status\s*===\s*'completed'/, '宣传归档页不得用活动状态判断已归档');

  // ③ 纪检待办：实时组排除已打回记录，分组计数与过滤后集合同源
  const discTodo = read('docs/src/entries/tabs/disc/todo-tab.js');
  assert.match(discTodo, /!r\.recordedBy && !r\.returnedBy[\s\S]{0,120}AttendanceStatus\.PRESENT/, '考勤实时组须排除已打回');
  assert.match(discTodo, /r\.status !== 'confirmed' && !r\.returnedBy/, '考察实时组须排除已打回');
  assert.match(discTodo, /count: pendingAtt\.length/, '考勤实时组计数须同步');
  assert.match(discTodo, /count: pendingInsp\.length/, '考察实时组计数须同步');

  // ④ 纪检复盘：待批注只出「批注」；已批注（批注中）才出「打回/确认」
  const discReview = read('docs/src/entries/tabs/disc/review-tab.js');
  const uploadedBlock = discReview.slice(
    discReview.indexOf('ReviewStatus.UPLOADED ?'), discReview.indexOf('ReviewStatus.ANNOTATING ?'));
  assert.match(uploadedBlock, /btn-disc-annotate/, '待批注须有批注按钮');
  assert.doesNotMatch(uploadedBlock, /btn-disc-confirm|btn-disc-reject/, '待批注不得显示打回/确认');
  const annotatingBlock = discReview.slice(
    discReview.indexOf('ReviewStatus.ANNOTATING ?'), discReview.indexOf('ReviewStatus.NOT_SUBMITTED ?'));
  assert.match(annotatingBlock, /btn-disc-reject/, '已批注须有打回');
  assert.match(annotatingBlock, /btn-disc-confirm/, '已批注须有确认');

  // ⑤ 纪检考察：已确认行只出「打回」不出「确认」；督办行动作落到同一份明细列表
  const discInspection = read('docs/src/entries/tabs/disc/inspection-tab.js');
  assert.match(
    discInspection,
    /i\.status === 'confirmed'[\s\S]{0,260}已确认[\s\S]{0,260}btn-disc-return-insp[\s\S]{0,120}: `<button[\s\S]{0,120}btn-disc-confirm-insp/,
    '已确认行只出打回；确认只在非已确认分支',
  );
  assert.match(discInspection, /insp-sup-goto/, '督办清单须有去确认入口');
  assert.match(discInspection, /data-insp-person-id=/, '明细行须可被督办入口定位');
  assert.match(discInspection, /function _bindSupervisionGoto/, '督办入口须绑定到明细列表');
});

test('组长/成员台 Task 16：写入口径、考察范围、组员进度与专班详情分层', () => {
  const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

  // ① 组长 write：页签标题与 h3 一致；列表分可写 / 只读；roleEditable=false 关闭子记录写口
  const write = read('docs/src/entries/tabs/leader/write-tab.js');
  assert.ok(!write.includes('>活动写入</h3>'), 'h3 不得再写「活动写入」');
  assert.match(write, /<h3[^>]*>本组活动<\/h3>/, 'h3 须与页签名一致为「本组活动」');
  assert.match(write, /id="leader-activity-readonly-list"/, '须单列「可见活动（只读）」');
  assert.match(write, /可见活动（只读）/, '只读分组须明示');
  assert.match(write, /const effectiveReadOnly = readOnly \|\| !roleEditable;/, '未授权活动须进入只读分支');
  assert.match(write, /effectiveReadOnly\s*\?\s*''\s*:\s*`<td class="text-center whitespace-nowrap">/, '只读活动不得渲染子记录删除/添加动作');
  assert.match(write, /#leader-activity-lists/, '可写与只读两组须共用事件委托宿主');

  // ② 组长 inspection：说明改准；明细按本组活动收窄；organizer 投影分支保留
  const insp = read('docs/src/entries/tabs/leader/inspection-tab.js');
  assert.match(insp, /本组活动的考察上传/, '页头说明须收窄为「本组活动的考察上传」');
  assert.match(insp, /groupActivityIds\.has\(r\.activityId\)/, '明细须按本组活动 id 收窄');
  assert.match(insp, /本组活动考察明细/, '明细区须有本组范围标题');
  assert.match(insp, /if \(!isOrganizerScope\) \{\s*renderFilteredList\(container\.querySelector\('#insp-list-host'\)/, 'organizer 投影分支不得渲染全量明细');

  // ③ 组长 members：进度前置；逐人指标为带表头的紧凑表
  const members = read('docs/src/entries/tabs/leader/members-tab.js');
  assert.ok(members.indexOf('id="leader-progress-list"') < members.indexOf('${reportInboxHtml}'), '进度须排在组员汇报之前');
  assert.ok(members.indexOf('id="leader-progress-list"') < members.indexOf('id="leader-blockers-list"'), '进度须排在卡点之前');
  assert.match(members, /table:\s*\{[\s\S]{0,400}<th>姓名<\/th>[\s\S]{0,200}<th>考勤<\/th>[\s\S]{0,200}<th>考察<\/th>[\s\S]{0,200}<th>汇报<\/th>[\s\S]{0,200}<th>阶段<\/th>/, '逐人指标须为有表头的紧凑表');

  // ④ 成员 activities：唯一主切换；日历内层移除「列表」并降级
  const acts = read('docs/src/entries/tabs/visitor/activities-tab.js');
  assert.match(acts, /_demoteCalendarToolbar/, '日历内层工具条须降级');
  assert.match(acts, /querySelector\('\[data-view="list"\]'\)\?\.remove\(\)/, '日历视图内不得出现第二个「列表」');
  assert.match(acts, /visitor-cal-granularity-label/, '日历粒度工具条须有次级标识');

  // ⑤ 成员 tf-view：页头不再写「只读」；产出登记移到详情下部独立区
  const tf = read('docs/src/entries/tabs/visitor/tf-view-tab.js');
  assert.ok(!tf.includes('（只读）'), '页头文案不得再写「（只读）」');
  assert.match(tf, /我的产出登记/, '写表单须有独立「我的产出登记」区');
  assert.match(tf, /panel\.appendChild\(section\)/, '产出登记须移到详情下部');
  assert.match(tf, /id = 'tfv-output-section'/, '写表单须有独立分区标识');

  // ⑥ 组长/成员 my-dispatch：我提交/参与段前移；提交与已读逻辑不变
  const leaderDispatch = read('docs/src/entries/tabs/leader/my-dispatch-tab.js');
  const visitorDispatch = read('docs/src/entries/tabs/visitor/my-dispatch-tab.js');
  assert.match(leaderDispatch, /myIssuesFirst: true/, '组长台须声明我提交/参与段前置');
  assert.match(visitorDispatch, /myIssuesFirst: true/, '成员台须声明我提交/参与段前置');
  const view = read('docs/src/components/feedback/issue-dispatch-view.js');
  assert.match(view, /opts\.myIssuesFirst[\s\S]{0,120}\[myIssuesHtml, reqHtml, myReportsHtml, assignedHtml\]/, '段序须把我提交/参与放第一段');
  assert.match(view, /unread\.forEach\(id => IssueNotify\.markRead\(userId, id\)\);/, '已读逻辑不得改动');
});
