import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('周期归档界面按期次日期混合排序并显示冻结规则标签', async () => {
  const source = await read('../../docs/src/entries/tabs/prop/weekly-tab.js');
  assert.match(source, /compareArchivePeriodDesc/);
  assert.match(source, /archivePolicySnapshot\?\.periodLabel/);
  assert.match(source, /archivePolicySnapshot\?\.periodRange/);
  const archive = await read('../../docs/src/entries/tabs/prop/archive-tab.js');
  assert.ok(/周期归档/.test(archive), 'archive view identifies periodic reporting as part of the archive capability');
  const overview = await read('../../docs/src/entries/tabs/secretary/overview-tab.js');
  assert.ok(/archivePolicySnapshot\?\.periodLabel/.test(overview), 'review queue displays the frozen period label');
});

test('书记概况以待处理为主、将异常另区呈现并消除重复计数', async () => {
  const source = await read('../../docs/src/entries/tabs/secretary/overview-tab.js');
  const dutyCard = source.indexOf("${dutyCardHtml('secretary')}");
  const queueHost = source.indexOf('id="ov-subview-body"');
  assert.ok(dutyCard > queueHost, '责任安排退到实际待处理内容之后');
  assert.match(source, /待决定与确认/);
  assert.match(source, /异常与督办/);
  assert.match(source, /attendance\.absentCount \+ attendance\.makeupPending/);
  assert.match(source, /异常按问题\/提醒条目计数/);
  const overviewService = await read('../../docs/src/services/governance/secretary-overview.js');
  assert.match(overviewService, /const absentCount = absentPersonIds\.length/);
  assert.match(overviewService, /absentCount,/);
  assert.doesNotMatch(source, /data-subview=/, '默认页不再在按维度与按人两个主视图之间切换');
  assert.match(source, /按责任线查看在办概况/, '责任线信息作为主队列下方的按需展开内容');
  assert.ok(source.indexOf('书记工作队列') < source.indexOf('查看工作概况指标'), '队列先于辅助指标');
  assert.doesNotMatch(source, /label: '待处理', value: pendingItems/);
  assert.doesNotMatch(source, /label: '异常', value: anomalyTotal/);
  assert.doesNotMatch(source, /催办\/直达入口/);
  assert.match(source, /待办、待答复汇报、文件确认和周期归档审核/);
});

test('党委支部配置按分区导航只显示当前配置面板', async () => {
  const page = await read('../../docs/branch-config.html');
  const entry = await read('../../docs/src/entries/pages/branch-config-entry.js');
  assert.match(page, /id="branch-config-nav"/);
  assert.match(page, /data-config-panel="organization"/);
  assert.match(page, /data-config-panel="roster"/);
  assert.match(page, /data-config-panel="capabilities"/);
  assert.match(page, /data-config-panel="deployment"/);
  assert.match(entry, /panel\.hidden = panel\.dataset\.configPanel !== key/);
  assert.match(entry, /navigationMode: 'sections'/);
});

test('组织委员工作组页提供专班、活动工作组和报名总表的互斥视图', async () => {
  const source = await read('../../docs/src/entries/tabs/org/taskforce-tab.js');
  assert.match(source, /data-view="workgroups"[^>]*>专班工作组/);
  assert.match(source, /data-view="activities"[^>]*>活动工作组/);
  assert.match(source, /data-view="matrix"[^>]*>报名总表/);
  assert.match(source, /organizingScope/);
  assert.match(source, /const inspectionHtml = tfSubs\.inspection\.length \? ins\.shellHtml : ''/);
  assert.match(source, /if \(tfSubs\.inspection\.length\) \{[\s\S]*?renderFilteredList\(mount\.querySelector\('#tf-sub-host-inspection'\)/);
  assert.match(source, /const closedOutputCount = outputs\.filter/);
  assert.match(source, /全部任务与产出闭合后，才可以结束工作组/);
  assert.match(source, /btn-dissolve-tf[\s\S]*?closureReady/);
});

test('组织委员专班详情只保留共享工作组成员与授权编辑器', async () => {
  const source = await read('../../docs/src/entries/tabs/org/taskforce-tab.js');
  assert.match(source, /renderWorkgroupMemberEditor/);
  assert.match(source, /bindWorkgroupMemberEditor/);
  assert.doesNotMatch(source, /mountTaskforceProjectAuth/);
  assert.doesNotMatch(source, /btn-save-tf-roles/);
  assert.match(source, /btn-transfer-tf-org/, '组织者转交保留为单独的窄操作');
  assert.match(source, /renderWorkgroupPermissionEditor\('taskforce-create'/, '创建专班时仍可初始分配成员权限');
});

test('已结束专班的成员与授权历史只读，待办联动写入完成后才刷新', async () => {
  const org = await read('../../docs/src/entries/tabs/org/taskforce-tab.js');
  const detail = await read('../../docs/src/entries/pages/activity-entry.js');
  assert.match(org, /const isClosedHistory = \['completed', 'archived', 'dissolved'\]\.includes\(tf\.status\)/);
  assert.match(org, /const canEdit = !isClosedHistory/);
  assert.match(org, /_canTransfer && !isClosedHistory/);
  assert.match(org, /await settleWrites\(\)[\s\S]*?window\.location\.reload\(\)/, '待办快照必须落库后再刷新');
  assert.match(detail, /const isClosedTaskforce = \['completed', 'archived', 'dissolved'\]\.includes\(tf\.status\)/);
  assert.match(detail, /canManageMembers = !!workgroup && !isClosedTaskforce/);
  assert.match(detail, /isClosedTaskforce \? '<p[^>]*>工作组已结束，成员与授权记录只读保留。<\/p>'/);
});

test('党委支部筛选只纳入明确归属当前支部的记录，监控卡转义任期动态文本', async () => {
  const filter = await read('../../docs/src/components/governance/branch-filter.js');
  const monitor = await read('../../docs/src/entries/tabs/party-committee/monitor-tab.js');
  assert.match(filter, /String\(r\.branchId \|\| 'br-b1'\) === fid/);
  assert.match(monitor, /\(activity\.branchId \|\| 'br-b1'\) === branch\.id/);
  assert.match(monitor, /escHtml as esc/);
});

test('党委选中支部后整页数据请求都带同一支部范围，未选择时不出现“全部明细”入口', async () => {
  const filter = await read('../../docs/src/components/governance/branch-filter.js');
  const adapter = await read('../../docs/src/data/api-adapter.js');
  assert.match(filter, /url\.searchParams\.set\('branchId',/);
  assert.match(filter, /window\.location\.assign\(url\.toString\(\)\)/);
  assert.match(filter, /选择支部查看明细/);
  assert.match(filter, /apiMode \? '选择支部查看明细' : `全部支部（\$\{branches\.length\}）`/);
  assert.match(adapter, /function _withSelectedBranch\(path\)/);
  assert.match(adapter, /_request\(_withSelectedBranch\(path\)/);
});

test('党委全院概览只显示支部汇总，监控页不展示个人身份和活动明细', async () => {
  const overview = await read('../../docs/src/entries/tabs/party-committee/governance-overview-tab.js');
  const monitor = await read('../../docs/src/entries/tabs/party-committee/monitor-tab.js');
  assert.match(overview, /buildPartyOverviewModel/);
  assert.match(overview, /model\.pending/);
  assert.match(overview, /model\.exceptions/);
  assert.doesNotMatch(overview, /getPersonName|partyCount|memberPhone/);
  assert.match(monitor, /branch\.summary\?\.memberCount/);
  assert.match(monitor, /apiMode && branch\.summary\?\.memberCount == null/);
  assert.doesNotMatch(monitor, /getPersonName|submittedBy/);
});

test('党委未选支部时支部管理只显示目录与汇总，选中后才开放该支部配置操作', async () => {
  const branches = await read('../../docs/src/entries/tabs/party-committee/branches-tab.js');
  assert.match(branches, /const summaryOnly = apiMode && !selectedBranchId/);
  assert.match(branches, /summary\.memberCount/);
  assert.match(branches, /branch-config\.html\?branchId=/);
  assert.match(branches, /summaryOnly \? null/);
  assert.match(branches, /summaryOnly \? \(summary\.memberCount/);
});

test('支部附件下载继承党委工作台所选支部，服务端下载不因缺少范围而误伤', async () => {
  const adapter = await read('../../docs/src/data/api-adapter.js');
  const inspector = await read('../../docs/src/components/record/inspector.js');
  const archive = await read('../../docs/src/entries/tabs/prop/archive-tab.js');
  const references = await read('../../docs/src/components/sections/references.js');
  assert.match(adapter, /export function withSelectedBranchScope\(path\)/);
  assert.match(inspector, /withSelectedBranchScope\(rec\.filePath\)/);
  assert.match(archive, /withSelectedBranchScope\(record\.filePath\)/);
  assert.match(archive, /withSelectedBranchScope\(filePath\)/);
  assert.match(references, /withSelectedBranchScope\(d\.filePath\)/);
});

test('专班卡片人数只汇总组织者与深度参与者，不读历史普通参与人', async () => {
  const source = await read('../../docs/src/entries/tabs/org/taskforce-tab.js');
  const cardStart = source.indexOf('function _renderTfCard(t, statusLabel, statusColor) {');
  assert.ok(cardStart >= 0);
  assert.match(source.slice(cardStart, cardStart + 120), /const filled = _tfAssignsOf\(t\)\.length/);
});

test('书记概况把待办实时组纳入主队列，并分列确认审核与催办入口', async () => {
  const source = await read('../../docs/src/entries/tabs/secretary/overview-tab.js');
  assert.match(source, /SecretaryTodoDeriver\.computeAggregates\(\)/);
  assert.match(source, /const queueTodoGroups = \[\.\.\.todoGroups, \.\.\.realtimeTodoGroups\]/);
  assert.match(source, /queueTodoGroups\.map\(\(group\)/);
  assert.match(source, /IssueStore\.getSecretaryPendingReports\(\)/);
  assert.match(source, /待答复汇报/);
  assert.match(source, /待决定与确认/);
  assert.match(source, /异常与督办/);
  assert.doesNotMatch(source, /pendingQueueHtml[\s\S]*?催办\/直达入口/);
});

test('党委支部筛选与监控台转义支部配置及动态文本，避免存储型 XSS', async () => {
  const filter = await read('../../docs/src/components/governance/branch-filter.js');
  const monitor = await read('../../docs/src/entries/tabs/party-committee/monitor-tab.js');
  assert.match(filter, /import\s*\{\s*escHtml\s*\}\s*from/);
  assert.match(filter, /value="\$\{escHtml\(b\.id\)\}"/);
  assert.match(filter, />\$\{escHtml\(_label\(b\)\)\}<\/option>/);
  assert.match(monitor, /import\s*\{[^}]*escHtml as esc[^}]*\}\s*from/);
  assert.match(monitor, /\$\{esc\(branch\.config\?\.headerTitle \|\| branch\.name \|\| branch\.id\)\}/);
  assert.match(monitor, /data-branch-id="\$\{esc\(branch\.id\)\}"/);
});

test('工作组结束入口不再保留绕过任务与产出闭合校验的直接归档按钮', async () => {
  const org = await read('../../docs/src/entries/tabs/org/taskforce-tab.js');
  const prop = await read('../../docs/src/entries/tabs/prop/kanban-tab.js');
  const taskforceService = await read('../../docs/src/services/activity/taskforce.js');
  assert.doesNotMatch(org, /tf-archive-btn|updateStatus\(tf\.id, 'archived'\)/);
  assert.doesNotMatch(prop, /tf-complete-btn|updateStatus\(tfId, 'archived'\)/);
  const transitionBlock = taskforceService.match(/const validTransitions = \{([\s\S]*?)\n    \};/)?.[1] || '';
  assert.match(transitionBlock, /recruiting:\s*\['active'\]/, 'ordinary flow can only start a recruiting group');
  assert.match(transitionBlock, /active:\s*\[\]/, 'running groups cannot bypass semantic close through updateStatus');
  const activeTransition = transitionBlock.match(/active:\s*\[([^\]]*)\]/)?.[1] || '';
  assert.doesNotMatch(activeTransition, /archived|dissolved/);
  assert.match(taskforceService, /update\(id, patch,[\s\S]*?status[\s\S]*?dissolved/, 'generic store updates also guard terminal transitions in mock mode');
});

test('专班招募创建走工作组语义 API，原始快照只承载后续可编辑字段', async () => {
  const tab = await read('../../docs/src/entries/tabs/org/taskforce-tab.js');
  const service = await read('../../docs/src/services/activity/taskforce.js');
  assert.match(tab, /const created = await TaskForceRecordStore\.create\(record\)/);
  assert.match(service, /async create\(record\)[\s\S]*?getAdapter\(\)\.taskforces\.create\(payload\)/);
});

test('支委会批准收尾后统一工作组主记录同步为已结束', async () => {
  const service = await read('../../docs/src/services/activity/taskforce.js');
  const start = service.indexOf('applyCommitteeDecision(tfId');
  const end = service.indexOf('\n  /**', start);
  const method = service.slice(start, end);
  assert.match(method, /decision === 'approved'/);
  assert.match(method, /mockDB\.workgroups = mockDB\.workgroups\.map/);
  assert.match(method, /status:\s*'dissolved'/);
});

test('工作组成员不再自动出现在纪检考察清单中', async () => {
  const disc = await read('../../docs/src/entries/tabs/disc/inspection-tab.js');
  assert.doesNotMatch(disc, /TaskForceRecordStore|_buildTaskforceRosterHTML/);
  assert.doesNotMatch(disc, /专班名单区（组织→纪检 自动同步/);
  const org = await read('../../docs/src/entries/tabs/org/inspection-tab.js');
  assert.match(org, /仅制度、议程或具体事项明确要求时录入/);
  assert.match(org, /工作组成员名单不会自动生成考察名单/);
});
