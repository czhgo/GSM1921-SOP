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
  assert.match(overview, /renderWorkOverview/, '支书概况须走六台共享三层骨架');
});

test('书记概况统一三层：结论带 / 条线表 / 待我处理，不再保留三卡', async () => {
  const shell = await read('../../docs/src/entries/tabs/secretary/overview-tab.js');
  assert.match(shell, /renderWorkOverview/);
  const source = await read('../../docs/src/components/governance/work-overview.js');
  assert.match(source, /data-wo-layer="summary"/);
  assert.match(source, /data-wo-layer="lines"/);
  assert.match(source, /data-wo-layer="actions"/);
  assert.doesNotMatch(source, /<h4[^>]*>\s*汇报\s*<\/h4>/, '不再保留独立「汇报」卡');
  assert.doesNotMatch(source, /dutyCardHtml/, '职责卡不再占一张卡');
  assert.match(source, /SecretaryTodoDeriver\.computeAggregates\(\)/, '实时派生组须并入待我处理');
  assert.match(source, /getSecretaryPendingReports\(\)/, '待答复须与支书答复收件箱同源');
  assert.match(source, /待办、待答复汇报|待我处理/, '待办与待答复仍须可见');
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

test('组织委员专班页只提供专班工作组与报名总表；活动进展迁至活动日历', async () => {
  const source = await read('../../docs/src/entries/tabs/org/taskforce-tab.js');
  // 2026-10-20 第三轮 IA 判例④：页签名「专班管理」由 D-442 锁定，但页内不得再出现「活动工作组」
  //   （活动属于「活动日历」页；活动进度 / 材料 / 收尾一并迁出）。
  assert.match(source, /data-view="workgroups"[^>]*>专班工作组/);
  assert.match(source, /data-view="matrix"[^>]*>报名总表/);
  assert.doesNotMatch(source, /data-view="activities"/, '专班页不得再注册活动视图');
  assert.doesNotMatch(source, /活动工作组/, '专班页不得再出现「活动工作组」');
  assert.doesNotMatch(source, /track-complete-btn/, '活动收尾按钮必须随活动迁出专班页');
  // 新承载面：活动日历页内的本台「活动进展」分段（组件单一源）
  const wrapper = await read('../../docs/src/entries/tabs/org/activity-calendar-tab.js');
  assert.match(wrapper, /renderSharedCalendar/, '活动日历页仍复用共享只读日历');
  assert.match(wrapper, /renderActivityProgress/, '活动日历页须挂本台「活动进展」分段');
  const progress = await read('../../docs/src/components/governance/activity-progress.js');
  assert.match(progress, />活动进展</);
  assert.match(progress, /organizingScope/, '活动进展须按承办范围展示');
  assert.match(progress, /标记完成/, '活动收尾只能写「标记完成」');
  assert.doesNotMatch(progress, /已归档/, '不得再声称「已归档」（归档仍走材料 / 考勤闸门）');
  assert.doesNotMatch(progress, /确认完成/);
  assert.match(source, /const inspectionHtml = tfSubs\.inspection\.length \? ins\.shellHtml : ''/);
  assert.match(source, /if \(tfSubs\.inspection\.length\) \{[\s\S]*?renderFilteredList\(mount\.querySelector\('#tf-sub-host-inspection'\)/);
  assert.match(source, /const closedOutputCount = outputs\.filter/);
  assert.match(source, /全部任务与产出闭合后，才可以结束工作组/);
  assert.match(source, /btn-dissolve-tf[\s\S]*?closureReady/);
});

test('组织委员专班详情只保留共享工作组成员与授权编辑器；页底承接「项目赋权 · 专班」', async () => {
  const source = await read('../../docs/src/entries/tabs/org/taskforce-tab.js');
  assert.match(source, /renderWorkgroupMemberEditor/);
  assert.match(source, /bindWorkgroupMemberEditor/);
  // 2026-10-25 IA 62→45：支书台「活动管理」的项目赋权整卡已移出，**本位承接**专班赋权
  //   （实现单一源仍是 assign-tab.js::mountTaskforceProjectAuth，不复制表单）。原「不得出现」断言按新事实反转。
  assert.match(source, /mountTaskforceProjectAuth/, '专班管理须承接「项目赋权 · 专班」（本位）');
  assert.match(source, /id="tf-auth-host"/, '须有赋权宿主');
  assert.doesNotMatch(source, /btn-save-tf-roles/);
  assert.match(source, /btn-transfer-tf-org/, '组织者转交保留为单独的窄操作');
  assert.match(source, /renderWorkgroupPermissionEditor\('taskforce-create'/, '创建专班时仍可初始分配成员权限');
});

test('已结束专班的成员与授权历史只读，待办联动写入完成后才刷新', async () => {
  const org = await read('../../docs/src/entries/tabs/org/taskforce-tab.js');
  const detail = await read('../../docs/src/entries/pages/activity-entry.js');
  // Phase 0 已把「终态」收敛为 domain.js 单一源（TASKFORCE_TERMINAL_STATUSES / isTaskforceTerminalStatus）；
  // 断言接受枚举等价实现，但仍要求「终态判定」只认这一单一源（内联三值列表为等价兜底）。
  const TERMINAL_CLOSED = /(?:isTaskforceTerminalStatus\(\w+\.status\)|TASKFORCE_TERMINAL_STATUSES\.includes\(\w+\.status\)|\[\s*'completed',\s*'archived',\s*'dissolved'\s*\]\.includes\(\w+\.status\))/;
  assert.match(org, /import \{[^}]*isTaskforceTerminalStatus[^}]*\} from '\.\.\/\.\.\/\.\.\/core\/domain\/domain\.js/, '终态判定须来自 domain.js 单一源');
  assert.match(org, new RegExp(`const isClosedHistory = ${TERMINAL_CLOSED.source}`));
  assert.match(org, /const canEdit = !isClosedHistory/);
  assert.match(org, /_canTransfer && !isClosedHistory/);
  assert.match(org, /await settleWrites\(\)[\s\S]*?window\.location\.reload\(\)/, '待办快照必须落库后再刷新');
  assert.match(detail, /import \{[^}]*isTaskforceTerminalStatus[^}]*\} from '\.\.\/\.\.\/core\/domain\/domain\.js/, '终态判定须来自 domain.js 单一源');
  assert.match(detail, new RegExp(`const isClosedTaskforce = ${TERMINAL_CLOSED.source}`));
  assert.match(detail, /canManageMembers = !!workgroup && !isClosedTaskforce/);
  assert.match(detail, /isClosedTaskforce \? '<p[^>]*>工作组已结束，成员与授权记录只读保留。<\/p>'/);
});

test('党委支部筛选只纳入明确归属当前支部的记录，支部管理转义支部配置文本', async () => {
  const filter = await read('../../docs/src/components/governance/branch-filter.js');
  const branches = await read('../../docs/src/entries/tabs/party-committee/branches-tab.js');
  assert.match(filter, /String\(r\.branchId \|\| DEFAULT_BRANCH_ID\) === fid/);
  assert.match(branches, /esc\(b\.config\?\.headerTitle \|\| b\.name\)/);
  assert.match(branches, /import \{ showToast, escHtml as esc, getBasePath \}/);
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

test('党委支部管理只显示支部汇总，不展示个人身份和活动明细', async () => {
  const branches = await read('../../docs/src/entries/tabs/party-committee/branches-tab.js');
  assert.match(branches, /const summaryOnly = apiMode && !selectedBranchId/);
  assert.match(branches, /const summary = b\.summary \|\| \{\}/);
  assert.match(branches, /summary\.memberCount/);
  assert.doesNotMatch(branches, /getPersonName|submittedBy|memberPhone/);
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
  // 锚点只锁函数名（形参随展示层演进，2026-10-23 批次 506 去掉了 statusColor）；
  //   判据仍是「人数取 _tfAssignsOf(t)」——它只含组织者与深度参与者。
  const cardStart = source.search(/function _renderTfCard\(t[,)]/);
  assert.ok(cardStart >= 0, '未找到 _renderTfCard（函数被改名 ⇒ 本判据需重新对齐）');
  assert.match(source.slice(cardStart, cardStart + 200), /const filled = _tfAssignsOf\(t\)\.length/);
});

test('共享概况把支书实时派生组并入待办，待答复与答复收件箱同源', async () => {
  const source = await read('../../docs/src/components/governance/work-overview.js');
  assert.match(source, /SecretaryTodoDeriver\.computeAggregates\(\)/);
  assert.match(source, /const seen = new Set\(ctx\.todoGroups\.map/, '实时组须按 groupKey 去重后并入');
  assert.match(source, /realtime\.filter\(\(group\) => !seen\.has\(group\.groupKey\)\)/);
  assert.match(source, /IssueStore\.getSecretaryPendingReports\(\)/);
  assert.match(source, /待答复/);
});

test('党委支部筛选与支部目录转义支部配置文本，避免存储型 XSS', async () => {
  const filter = await read('../../docs/src/components/governance/branch-filter.js');
  const branches = await read('../../docs/src/entries/tabs/party-committee/branches-tab.js');
  assert.match(filter, /import\s*\{\s*escHtml\s*\}\s*from/);
  assert.match(filter, /value="\$\{escHtml\(b\.id\)\}"/);
  assert.match(filter, />\$\{escHtml\(_label\(b\)\)\}<\/option>/);
  assert.match(branches, /import\s*\{[^}]*escHtml as esc[^}]*\}\s*from/);
  assert.match(branches, /\$\{esc\(b\.config\?\.headerTitle \|\| b\.name\)\}/);
  assert.match(branches, /data-branch-card="\$\{esc\(bid\)\}"/);
});

test('工作组结束入口不再保留绕过任务与产出闭合校验的直接归档按钮', async () => {
  const org = await read('../../docs/src/entries/tabs/org/taskforce-tab.js');
  const prop = await read('../../docs/src/entries/tabs/prop/kanban-tab.js');
  const taskforceService = await read('../../docs/src/services/activity/taskforce.js');
  assert.doesNotMatch(org, /tf-archive-btn|updateStatus\(tf\.id, 'archived'\)/);
  assert.doesNotMatch(prop, /tf-complete-btn|updateStatus\(tfId, 'archived'\)/);
  // Phase 0 起「直接状态流转」单一源 = domain.js::TASKFORCE_DIRECT_TRANSITIONS（updateStatus 只读该表）；
  // 断言改为校验单一源的语义：仅 recruiting → active，其余状态一律无直接流转（抓「乱加状态流转」的回归）。
  const domain = await read('../../docs/src/core/domain/domain.js');
  assert.match(taskforceService, /updateStatus\(id, newStatus\) \{[\s\S]*?TASKFORCE_DIRECT_TRANSITIONS\[tf\.status\]/,
    'updateStatus 必须走 domain.js 的直接流转表');
  const transitionBlock = domain.match(/export const TASKFORCE_DIRECT_TRANSITIONS = Object\.freeze\(\{([\s\S]*?)\n\}\);/)?.[1] || '';
  assert.ok(transitionBlock, '未找到专班直接流转单一源 TASKFORCE_DIRECT_TRANSITIONS');
  const directEdges = [...transitionBlock.matchAll(/\[TaskforceStatus\.([A-Z_]+)\]: Object\.freeze\(\[([^\]]*)\]\)/g)]
    .filter(([, , to]) => to.trim())
    .map(([, from, to]) => `${from}->${to.replace(/TaskforceStatus\./g, '').trim()}`);
  assert.deepEqual(directEdges, ['RECRUITING->ACTIVE'], '普通状态流转只允许 recruiting → active');
  assert.match(transitionBlock, /\[TaskforceStatus\.ACTIVE\]: Object\.freeze\(\[\]\)/,
    '运行中工作组不得经 updateStatus 绕过语义收尾');
  assert.match(taskforceService, /if \(TASKFORCE_TERMINAL_STATUSES\.includes\(updated\.status\) && updated\.status !== current\.status\) \{[\s\S]*?COMMITTEE_DISSOLUTION_WRITE[\s\S]*?if \(!approvedDissolution\) return null;/,
    '通用 store 更新同样需拦截终态（仅解散写口放行）');
});

test('专班招募创建走工作组语义 API，原始快照只承载后续可编辑字段', async () => {
  const tab = await read('../../docs/src/entries/tabs/org/taskforce-tab.js');
  const service = await read('../../docs/src/services/activity/taskforce.js');
  assert.match(tab, /const created = await TaskForceRecordStore\.create\(record\)/);
  assert.match(service, /async create\(record\)[\s\S]*?getAdapter\(\)\.taskforces\.create\(payload\)/);
});

test('API 形态活动与专班创建走语义写口并合并服务端返回行', async () => {
  const mock = await read('../../docs/src/services/core/mock.js');
  const activityCreate = mock.slice(
    mock.indexOf('export async function createActivity'),
    mock.indexOf('\nexport function listActivities'),
  );
  assert.match(activityCreate, /typeof window !== 'undefined' && getDataSource\(\) === 'api'/,
    '活动创建必须区分 API 形态');
  assert.match(activityCreate, /getAdapter\(\)\.activities\.create\(data\)/,
    'API 形态活动创建须走活动语义 API，以同步建立活动工作组');
  assert.match(activityCreate, /mockDB\.activities = \[\.\.\.mockDB\.activities\.filter\(\(row\) => row\.id !== created\.id\), created\]/,
    '本地按 id 去重合并服务端返回行（含 workgroupId/createdBy/branchId）');
  const activityApiBranch = activityCreate.slice(
    activityCreate.indexOf("typeof window !== 'undefined' && getDataSource() === 'api'"),
    activityCreate.indexOf('return _withDelay'),
  );
  assert.doesNotMatch(activityApiBranch, /\bsaveDB\(\)|\bpersist\(\)/,
    'API 分支新增活动不得再靠整库快照写穿；mock 分支保持原行为');

  // mock.js 没有 createTaskforce：专班创建的语义入口是 TaskForceRecordStore.create
  // （services/activity/taskforce.js）。此处守住该入口同样不得用快照新增。
  const service = await read('../../docs/src/services/activity/taskforce.js');
  const taskforceCreate = service.slice(
    service.indexOf('async create(record)'),
    service.indexOf('\n  update(id, patch'),
  );
  assert.match(taskforceCreate, /getAdapter\(\)\.taskforces\.create\(payload\)/);
  assert.match(taskforceCreate, /mockDB\.taskforces = \[\.\.\.mockDB\.taskforces\.filter\(\(row\) => row\.id !== created\.id\), created\]/,
    '本地按 id 去重合并服务端返回行（含 workgroupId/createdBy/branchId）');
  assert.doesNotMatch(taskforceCreate, /\bsaveDB\(\)|\bpersist\(\)/,
    '新增专班不得再靠整库快照写穿');
});


test('支委会批准收尾后统一工作组主记录同步为已结束', async () => {
  const service = await read('../../docs/src/services/activity/taskforce.js');
  const start = service.indexOf('applyCommitteeDecision(tfId');
  const end = service.indexOf('\n  /**', start);
  const method = service.slice(start, end);
  assert.match(method, /decision === 'approved'/);
  assert.match(method, /mockDB\.workgroups = mockDB\.workgroups\.map/);
  assert.match(method, /patch\.status\s*=\s*TaskforceStatus\.DISSOLVED/, '批准解散须经 TaskforceStatus 枚举单一源落终态');
});

test('工作组成员不再自动出现在纪检考察清单中', async () => {
  const disc = await read('../../docs/src/entries/tabs/disc/inspection-tab.js');
  assert.doesNotMatch(disc, /TaskForceRecordStore|_buildTaskforceRosterHTML/);
  assert.doesNotMatch(disc, /专班名单区（组织→纪检 自动同步/);
  const org = await read('../../docs/src/entries/tabs/org/inspection-tab.js');
  // 2026-10-20 第二轮界面细化：表单下与列表上原为同一条规则的两句话，现只留卡片脚注一处；
  //   断言改按保留句（语义不变：仍须声明「仅明确要求的专班才录入」）。
  assert.match(org, /仅为制度、议程或事项明确要求的专班录入考察/);
  assert.match(org, /工作组成员名单不会自动生成考察名单/);
});

test('宣传看板只承接在办项目，归档统一落档案归档页', async () => {
  // A07（2026-10-20 IA 修复批次）：看板撤归档桶，归档动作统一落 ?tab=archive（单一源仍在 archive-tab）。
  const source = await read('../../docs/src/entries/tabs/prop/kanban-tab.js');
  assert.match(source, /import\s*\{\s*isActivityArchived\s*\}\s*from\s*'\.\.\/\.\.\/\.\.\/core\/domain\/constants\.js\?v=\d{8}[a-z]'/);
  assert.doesNotMatch(source, /activities\.filter\(a => a\.status === 'completed'\)/, '不得再把 status=completed 当作已归档集合');
  assert.match(source, /activities\.filter\(a => !isActivityArchived\(a\)\)/);
  assert.doesNotMatch(source, /已归档 \(\$\{/, '看板不再保留已归档桶');
  assert.doesNotMatch(source, /待归档 \(\$\{/, '看板不再保留待归档桶');
  assert.match(source, /\?tab=archive/, '归档出口统一落档案归档页签');
  assert.match(source, /去档案归档/);
  assert.doesNotMatch(source, /已完成并归档/);
  assert.match(source, /已标记结束，待档案归档/);
});

test('成员台组织者上传位以 scope=organizer 投影，个人考勤与考察记录在页首', async () => {
  const att = await read('../../docs/src/entries/tabs/visitor/attendance-tab.js');
  assert.match(att, /m\.renderContent\(ctx, _orgAttHost, \{ scope: 'organizer' \}\)/);
  assert.ok(att.indexOf('id="visitor-att-mine"') < att.indexOf('id="visitor-org-att-host"'), '本人出勤率在组织者上传位之前');
  assert.ok(att.indexOf('id="visitor-att-list"') < att.indexOf('id="visitor-org-att-host"'), '本人考勤明细 / 补课入口在组织者上传位之前');
  assert.match(att, /myOrgActs\.length \? `/, '没有组织者身份时不渲染上传位');

  const insp = await read('../../docs/src/entries/tabs/visitor/inspection-tab.js');
  assert.match(insp, /m\.renderContent\(ctx, _orgInspHost, \{ scope: 'organizer' \}\)/);
  assert.ok(insp.indexOf('我的考察记录') < insp.indexOf('id="visitor-org-insp-host"'), '本人考察记录在组织者上传位之前');
  assert.ok(insp.indexOf('id="visitor-insp-list"') < insp.indexOf('id="visitor-org-insp-host"'), '本人考察明细在组织者上传位之前');
  assert.match(insp, /myOrgActs\.length \? `/, '没有组织者身份时不渲染上传位');
});

test('组长台考勤/考察页的组织者投影只保留本人上传面，不渲染全组/全支部明细', async () => {
  const att = await read('../../docs/src/entries/tabs/leader/attendance-tab.js');
  assert.match(att, /export function renderContent\(ctx, host, opts = \{\}\)/);
  assert.match(att, /const isOrganizerScope = opts\.scope === 'organizer'/);
  assert.match(att, /const actorId = isOrganizerScope \? \(AuthStore\.getCurrentUser\(\)\?\.personId \|\| ''\) : leaderId/);
  assert.match(att, /getOrganizedActivities\(actorId\)/);
  assert.match(att, /if \(!isOrganizerScope\) \{\s*renderFilteredList\(container\.querySelector\('#att-list-host'\)/, '投影分支不渲染本组考勤明细');
  assert.match(att, /\$\{!isOrganizerScope && myGroupMakeupTasks\.length > 0 \?/, '投影分支不渲染本组补课名单');

  const insp = await read('../../docs/src/entries/tabs/leader/inspection-tab.js');
  assert.match(insp, /export function renderContent\(ctx, host, opts = \{\}\)/);
  assert.match(insp, /const isOrganizerScope = opts\.scope === 'organizer'/);
  assert.match(insp, /const actorId = isOrganizerScope \? \(AuthStore\.getCurrentUser\(\)\?\.personId \|\| ''\) : leaderId/);
  assert.match(insp, /getOrganizedActivities\(actorId\)/);
  assert.match(insp, /isTaskforceOrganizer\(actorId, tf\.id\)/, '专班来源只保留本人负责/被授权');
  assert.match(insp, /if \(!isOrganizerScope\) \{\s*renderFilteredList\(container\.querySelector\('#insp-list-host'\)/, '投影分支不渲染全支部考察明细');
});

test('宣传任务页提供登记表单并写入 propTasks', async () => {
  const source = await read('../../docs/src/entries/tabs/prop/tasks-tab.js');
  assert.match(source, /登记宣传任务/);
  assert.match(source, /id="prop-task-type"/);
  assert.match(source, /id="prop-task-summary"/);
  assert.match(source, /id="prop-task-activity"/);
  assert.match(source, /mockDB\.propTasks\.push/);
  assert.match(source, /generateId\('pt'\)/);
  assert.match(source, /todayLocal\(\)/);
  assert.match(source, /activityId/);
});

// 2026-10-25 Task 5（IA 62→45）：五台「我的处置」页签已删、并入待办「我经办的反馈」区。
// 期望值按新事实改准：不再有 my-dispatch 注册；承接页 todo 必须存在，且 issue-dispatch-view 由 todo-tab-shell 挂载。
test('五台不再注册「我的处置」；承接页待办存在且复用 issue-dispatch-view（不再有第二套列表）', async () => {
  const files = [
    'org-workspace.js',
    'prop-workspace.js',
    'disc-workspace.js',
    'leader-workspace.js',
    'visitor-workspace.js',
  ];
  for (const file of files) {
    const source = await read(`../../docs/src/capabilities/${file}`);
    const ids = source.split(/\r?\n/)
      .map((line) => line.trimStart())
      .filter((line) => line.startsWith('{ id: '))
      .map((line) => /id: '([^']+)'/.exec(line)?.[1]);
    assert.ok(!ids.includes('my-dispatch'), `${file} 仍注册已撤页签 my-dispatch（应并入待办「我经办的反馈」）`);
    assert.ok(ids.includes('todo'), `${file} 缺待办承接页 todo`);
  }
  const shell = await read('../../docs/src/components/record/todo-tab-shell.js');
  assert.match(shell, /issue-dispatch-view/, '待办壳须复用 issue-dispatch-view（我经办的反馈区）');
  assert.match(shell, /filter === 'dispatch'/, '旧深链 ?filter=dispatch 须滚到该区');
  const dispatch = await read('../../docs/src/components/feedback/issue-dispatch-view.js');
  assert.match(dispatch, /opts\.embedded \? '' : renderTabHeader/, '内嵌形态不得再渲染第二张页头');
});

test('知情查看分层：一级只「活动工作组 / 专班工作组」；其他党小组走独立区（三处无同层混排）', async () => {
  // 2026-10-25 Task 5：支书台页签删除（→ 全局概况页内卡）、组长台页签删除（→ 组员进展独立区）、
  //   成员台「专班动态」删除（→ 项目分工「专班」区）。
  const secretary = await read('../../docs/src/capabilities/secretary-workspace.js');
  assert.doesNotMatch(secretary, /id: 'tf-view'/, '支书台能力注册不再含 tf-view 页签');
  const secretaryOverview = await read('../../docs/src/entries/tabs/secretary/overview-tab.js');
  assert.match(secretaryOverview, /renderInsightView/, '知情查看卡须复用 insight-view');
  assert.match(secretaryOverview, /views: \['workgroup', 'taskforce'\]/, '支书知情卡仍只两段');
  assert.match(secretaryOverview, /embedded: true/, '页内卡形态（不重复页头）');

  const insight = await read('../../docs/src/components/record/insight-view.js');
  assert.match(insight, /SEG_LABEL = \{ workgroup: '活动工作组', taskforce: '专班工作组' \}/,
    '一级分段标签只能是「活动工作组 / 专班工作组」');
  assert.match(insight, /SEG_TYPES = \['workgroup', 'taskforce'\]/, '分段集合不得再含 group（组织单元）');
  assert.match(insight, /opts\.groupSection/, '其他党小组须为独立区（groupSection）');

  const leader = await read('../../docs/src/capabilities/leader-workspace.js');
  assert.doesNotMatch(leader, /id: 'tf-view'/, '组长台能力注册不再含 tf-view 页签');
  const leaderMembers = await read('../../docs/src/entries/tabs/leader/members-tab.js');
  assert.match(leaderMembers, /renderOtherGroupsView/, '其他党小组独立区须复用 other-groups-view');

  const visitor = await read('../../docs/src/capabilities/visitor-workspace.js');
  assert.doesNotMatch(visitor, /id: 'tf-view'/, '成员台能力注册不再含 tf-view 页签');
  const visitorProjects = await read('../../docs/src/entries/tabs/visitor/projects-tab.js');
  assert.match(visitorProjects, /renderTaskforceView/, '项目分工「专班」区须复用 taskforce-view');
  assert.match(visitorProjects, /key: 'tf', label: '专班'/, '项目分工须有「专班」子视图');

  const orgRegistry = await read('../../docs/src/capabilities/org-workspace.js');
  assert.doesNotMatch(orgRegistry, /id: 'tf-view'/, '组织台能力注册不再含 tf-view');
  const orgTaskforce = await read('../../docs/src/entries/tabs/org/taskforce-tab.js');
  assert.match(orgTaskforce, /只看我参与的/, '原知情查看集合由「只看我参与的」筛选承接');
});

test('党委待批复完整队列由支部上报页承担（治理总览已撤）', async () => {
  // A06：治理总览撤页后，不再有「前 5 条预览 + 查看全部」两段式；完整队列只在 review 页。
  const registry = await read('../../docs/src/capabilities/party-committee-workspace.js');
  assert.doesNotMatch(registry, /\{ id: 'governance-overview'/, '能力注册不再含治理总览');
  const review = await read('../../docs/src/entries/tabs/party-committee/review-tab.js');
  assert.match(review, /data-review-view="pending"/, '支部上报页保留待批复队列');
  assert.match(review, /待批复 <span class="ml-1 tabular-nums">\$\{pending\.length\}<\/span>/, '待批复计数按完整队列渲染');
  assert.doesNotMatch(review, /PENDING_PREVIEW_LIMIT|slice\(0, 5\)/, '完整队列不在前端截断');
});

test('支部管理待批复计数带 branchId 深链，按 secretaryId 恢复组织提醒', async () => {
  // A05：原「支部动态」撤页后，待批复计数列 + 深链并入「支部管理」。
  const branches = await read('../../docs/src/entries/tabs/party-committee/branches-tab.js');
  assert.match(branches, /\?tab=review&amp;branchId=\$\{encodeURIComponent\(bid\)\}/);

  assert.match(branches, /const missingSecretary = isActive && !b\.secretaryId/);
  assert.doesNotMatch(branches, /!summaryOnly && !b\.secretaryId/, '组织提醒不再被 summaryOnly 抑制');
  assert.match(branches, /待任命支书/);
});

test('反馈管理只留反馈：列表与合并目标排除 kind=report', async () => {
  const source = await read('../../docs/src/entries/tabs/secretary/feedback-tab.js');
  assert.match(source, /!i\.hidden && !i\.mergedInto && i\.kind !== 'report'/, '反馈列表须排除工作汇报');
  assert.match(source, /const mergeTargets = IssueStore\.getAll\(\)\.filter\(i => i\.id !== issueId && !i\.hidden && !i\.mergedInto && i\.kind !== 'report'\)/, '合并目标同样不得混入工作汇报');
  assert.match(source, /无匹配反馈/);
  // 2026-10-24 Task 4.2：卡头 H3 不再逐字复述页签名「反馈管理」，改由 renderCardHeader 渲染「反馈列表」。
  //   本用例仍守「反馈页存在卡片标题」这一覆盖面，只改期望值。
  assert.match(source, /title: '反馈列表'/);
});

test('工作概况汇报区只读：无提交入口，唯一动作跳待办「我经办的反馈」', async () => {
  const source = await read('../../docs/src/components/governance/work-overview.js');
  assert.match(source, /getReportRequestsFor\(personId\)/);
  assert.doesNotMatch(source, /wo-req-submit|data-report-submit|请填写汇报内容|renderFilteredList/, '概况不得保留汇报行内提交/校验载体');
  assert.match(source, /data-wo-go-dispatch/, '汇报摘要须给出唯一动作按钮');
  // 2026-10-25 Task 5：原「我的处置」页签已并入待办「我经办的反馈」区 ⇒ 落点改为待办 + 滚到该区。
  assert.match(source, /data-\$\{prefix\}-tab="todo"/, '唯一动作须跳「待办」');
  assert.match(source, /ws-dispatch-section/, '落点须滚到「我经办的反馈」区');
});

test('今天页汇报行落到待办「待答复」，不再指向反馈/我的处置', async () => {
  const source = await read('../../docs/src/entries/tabs/today/today-tab.js');
  assert.match(source, /attrs: `data-go="todo" data-report-id="\$\{esc\(i\.id\)\}"/, '汇报行目标须为待办并带定位 id');
  assert.match(source, /PendingTarget\.set\(id \? \{ tab: 'todo', kind: 'report', id \}/, '汇报行须写待办「待答复」定位目标');
  assert.doesNotMatch(source, /my-dispatch/, '今天页不再把汇报行指向「我的处置」');
  assert.doesNotMatch(source, /onNav\('feedback'\)/, '今天页不再把汇报行指向反馈管理');
  assert.match(source, /onNav\(btn\.dataset\.todayAll === 'todo' \? 'todo' : 'activities'\)/, '「今天有会 · 全部」保持 activities');
  assert.match(source, /it\.deadline > today\) continue/, '今天页只列今日到期与逾期事项');
});

test('纯展示列表行只用分隔线，整卡可点的交互卡片仍保留外框', async () => {
  // 2026-10-18 Task 26：列表条目收敛为「分组间 hairline 分隔线」，不再逐行一圈完整边框。
  // 判定口径：
  //  · 纯展示行 = <div> 上出现 `border border-gray-100/200` 完整框，且不属于交互卡片；
  //  · 交互卡片 = 含 kanban-card，或 role="button"/cursor-pointer 且为整卡圆角容器；
  //  · 通知下拉条目是整条可点的行（决议第 4 条），显式豁免外框要求。
  // 基线只降不升：当前命中数已清零，后续新增完整框或删掉交互卡边框都会失败。
  const rowFiles = [
    '../../docs/src/components/shell/header.js',
    '../../docs/src/components/governance/notice-view.js',
    '../../docs/src/components/record/todo-list.js',
    '../../docs/src/components/feedback/issue-dispatch-view.js',
    '../../docs/src/components/feedback/issue-list.js',
    '../../docs/src/entries/tabs/org/roster-tab.js',
    '../../docs/src/components/ui/list-filter.js',
  ];
  const FULL_BORDER = /\bborder\s+border-gray-(?:100|200)\b/;
  const HAS_BORDER = /(?:^|\s)border(?:\s|$)/;
  const isInteractiveCard = (tag, cls) => {
    if (/\bkanban-card\b/.test(cls)) return true;
    if (/\bnotif-dropdown-item\b/.test(cls)) return false;
    if (/\brole="button"/.test(tag) && /\brounded-(?:xl|lg)\b/.test(cls)) return true;
    return /\bcursor-pointer\b/.test(cls) && /\brounded-xl\b/.test(cls);
  };

  const violations = [];
  const missingCardBorder = [];
  for (const rel of rowFiles) {
    const source = await read(rel);
    for (const match of source.matchAll(/<div\b[^>]*>/g)) {
      const tag = match[0];
      const cls = /class="([^"]*)"/.exec(tag)?.[1] || '';
      const card = isInteractiveCard(tag, cls);
      if (!card && FULL_BORDER.test(cls)) {
        violations.push(`${rel.replace('../../docs/src/', '')}: ${tag.slice(0, 100).replace(/\s+/g, ' ')}`);
      }
      if (card && !HAS_BORDER.test(cls)) {
        missingCardBorder.push(`${rel.replace('../../docs/src/', '')}: ${tag.slice(0, 100).replace(/\s+/g, ' ')}`);
      }
    }
  }

  // 当前命中数 = 0；基线 0（只降不升）。
  const FULL_BORDER_BASELINE = 0;
  const CARD_BORDER_BASELINE = 0;
  assert.ok(violations.length <= FULL_BORDER_BASELINE,
    `纯展示行仍带完整边框 ${violations.length} 处（基线 ${FULL_BORDER_BASELINE}）：\n${violations.join('\n')}`);
  assert.ok(missingCardBorder.length <= CARD_BORDER_BASELINE,
    `交互卡片缺少边框 ${missingCardBorder.length} 处（基线 ${CARD_BORDER_BASELINE}）：\n${missingCardBorder.join('\n')}`);
});

test('侧栏导航图标语义唯一：消息=mail、意见反馈=message，同一导航数组不得复用图标', async () => {
  const source = await read('../../docs/src/components/shell/sidebar.js');
  const start = source.indexOf('function getNavItems()');
  const end = source.indexOf('function getFooterItems()');
  assert.ok(start >= 0 && end > start, '未找到 sidebar 导航数组');
  const navBlock = source.slice(start, end);
  // 期望更新（Task 3 · 2026-10-25）：入口从「我的私信」升级为「消息」中心（公告 / 系统 / 私信同列）；
  //   图标语义不变（信封 mail），module 与 href 也不变。
  assert.match(navBlock, /label: '消息'[^}]*icon: icon\('mail'/, '「消息」须使用信封图标 mail');
  assert.match(navBlock, /label: '意见反馈'[^}]*icon: icon\('message'/, '「意见反馈」须保留对话气泡图标 message');
  const icons = [...navBlock.matchAll(/icon\('([A-Za-z]+)'/g)].map((m) => m[1]);
  assert.ok(icons.length >= 5, `导航图标抽取过少（${icons.length}），守卫可能空转`);
  assert.equal(new Set(icons).size, icons.length, `同一导航数组内出现重复图标：${icons.join(', ')}`);
});
