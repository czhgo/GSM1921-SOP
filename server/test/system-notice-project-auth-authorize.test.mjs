// role: [工程师]+[AI]
// 2026-10-02 批次 338（`SOP-G-1` 授权口径收口 · 支书裁「甲」）：`project-auth-granted` 的 `authorize` 判据定向件。
// **病灶**：旧判据只看「支委层 ＋ 对象存在」⇒ 前端放行、服务端 **403 静默丢弃**。
// **本件给的是正面证据**：① 支委层（原面不变）· ② **组长**（甲案新增）· ③ **该场现任组织者本人**（甲案新增，
//   形状同 `docs/src/components/governance/organizer-transfer.js::organizerOf`）· ④ 无关成员/非组织者的项目角色行
//   （`deep`）**仍拒**（证「没有放宽到人人可发」）· ⑤ 对象不存在一律拒。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SYSTEM_NOTICE_KINDS } from '../system-notice-kinds.js';
// R-23 余项（2026-10-06 批次 422 · `D-803`③）：服务端**人员名册读口**（D 组的端口单测）
import { applyRosterNames } from '../person-roster.js';

/** 最小 db 桩：只实现 `prepare().get()`，返回与真库同形的 `{ data: JSON }`（`rowOf` 会 JSON 解包） */
const dbStub = (rows) => ({
  prepare(sql) {
    const table = /FROM (\w+)/.exec(sql)[1];
    return { get: (id) => (rows[table] && rows[table][id] ? { data: JSON.stringify(rows[table][id]) } : undefined) };
  },
});
const AUTH = (actor, sourceId, rows) => SYSTEM_NOTICE_KINDS['project-auth-granted'].authorize({ actor, sourceId, db: dbStub(rows) });
const ACT = (extra = {}) => ({ activities: { 'act-1': { id: 'act-1', ...extra } } });
const TF = (extra = {}) => ({ taskforces: { 'tf-1': { id: 'tf-1', ...extra } } });

test('A1 支委层放行（原授权面不变）', () => {
  for (const role of ['secretary', 'deputy-secretary', 'org-commissioner', 'prop-commissioner', 'disc-commissioner']) {
    assert.equal(AUTH({ id: 'p10', role }, 'act-1', ACT()), true, role);
  }
});

test('A2 党小组组长放行（甲案新增 · role key `leader`）', () => {
  assert.equal(AUTH({ id: 'p20', role: 'leader' }, 'act-1', ACT()), true);
  assert.equal(AUTH({ id: 'p20', role: 'leader' }, 'tf-1', TF()), true);
});

test('A3 该场现任组织者本人放行（甲案新增 · 活动侧 assignments）', () => {
  assert.equal(AUTH({ id: 'p30', role: 'participant' }, 'act-1',
    ACT({ assignments: [{ personId: 'p30', role: 'organizer' }, { personId: 'p31', role: 'deep' }] })), true);
});

test('A4 该场现任组织者本人放行（甲案新增 · 专班侧 members）', () => {
  assert.equal(AUTH({ id: 'p30', role: 'participant' }, 'tf-1',
    TF({ members: [{ personId: 'p30', role: 'organizer' }] })), true);
});

test('A5 无关成员仍拒（**不得**放宽到「人人可发」）', () => {
  assert.equal(AUTH({ id: 'p40', role: 'participant' }, 'act-1',
    ACT({ assignments: [{ personId: 'p30', role: 'organizer' }] })), false);
});

test('A6 非组织者的项目角色行（`deep`）不放行', () => {
  assert.equal(AUTH({ id: 'p41', role: 'participant' }, 'act-1',
    ACT({ assignments: [{ personId: 'p41', role: 'deep' }] })), false);
});

test('A7 来源对象不存在一律拒（三档皆然）', () => {
  assert.equal(AUTH({ id: 'p10', role: 'secretary' }, 'act-9', {}), false);
  assert.equal(AUTH({ id: 'p20', role: 'leader' }, 'act-9', {}), false);
  assert.equal(AUTH({ id: 'p30', role: 'participant' }, 'act-9', {}), false);
});

test('A8 无 actor 一律拒（防未登录）', () => {
  assert.equal(AUTH(null, 'act-1', ACT()), false);
});

// ── `R-23`②（2026-10-05 批次 390）：展示值**按表复算** ──────────────────────────────────
//   病灶：`def.build` 缺省时统一包装会把**客户端 payload 整包展开**成模板变量 ⇒ 任一获授权的 actor 直调 API
//   即可让通知正文显示**任意**活动名 / 周次 / 材料名（`R-22` 的「按表复算」此前只落在 6 个 kind 上）。
//   本件把 8 个 kind 的**对象字段**钉住：伪造的 display 值**不得**出现在产物里；表内值**必须**在。
//   ⚠ 边界（如实）：**人名仍沿用 payload**（服务端无人员名册，口径同 `organizer-transferred`）⇒
//     本件只断言**对象字段**，不断言人名——那一半不是本批射程。
const BUILD = (kind, sourceId, rows, payload, actor) => SYSTEM_NOTICE_KINDS[kind].build({ db: dbStub(rows), sourceId, payload, actor });
const TEXT = (notice) => `${notice.title || ''}\n${notice.content || ''}`;
const ACT_TITLE_KINDS = ['attendance-confirmed', 'activity-agenda-updated', 'workforce-proposal-created'];

test('B1 活动名按表复算：伪造 payload.activityTitle 不得出现（3 个活动类 kind）', () => {
  const rows = { activities: { 'act-1': { id: 'act-1', title: '表内活动名' } } };
  for (const kind of ACT_TITLE_KINDS) {
    const t = TEXT(BUILD(kind, 'act-1', rows, { activityTitle: '伪造活动名' }));
    assert.ok(t.includes('表内活动名'), `${kind} 应含表内活动名：${t}`);
    assert.ok(!t.includes('伪造活动名'), `${kind} 不得含伪造活动名：${t}`);
  }
});

test('B2 活动已创建广播：表内 title/date/location 覆盖伪造值', () => {
  const rows = { activities: { 'act-1': { id: 'act-1', title: '表内活动名', date: '2026-10-09', location: '理科五号楼' } } };
  const t = TEXT(BUILD('activity-created-broadcast', 'act-1', rows,
    { activityTitle: '伪造活动', date: '1970-01-01', location: '伪造地点' }));
  assert.ok(t.includes('表内活动名') && t.includes('2026-10-09') && t.includes('理科五号楼'), t);
  assert.ok(!t.includes('伪造活动') && !t.includes('1970-01-01') && !t.includes('伪造地点'), t);
});

test('B3 专班议案：表内 title 覆盖伪造值；date 落 `publishDate`（该模板不把 date 写进正文）', () => {
  const rows = { activities: { 'act-1': { id: 'act-1', title: '线上支委会', date: '2026-10-10' } } };
  const n = BUILD('taskforce-vote-requested', 'act-1', rows, { activityTitle: '伪造活动', date: '1970-01-01' });
  const t = TEXT(n);
  assert.ok(t.includes('线上支委会'), t);
  assert.ok(!t.includes('伪造活动'), t);
  assert.equal(n.publishDate, '2026-10-10', `publishDate 应取表内日期，实为 ${n.publishDate}`);
});

test('B4 成员变更：fromStage/toStage 按表复算', () => {
  const rows = { member_change_requests: { 'r-1': { id: 'r-1', fromStage: '积极分子', toStage: '发展对象' } } };
  const t = TEXT(BUILD('member-change-approved', 'r-1', rows, { fromStage: '伪造甲', toStage: '伪造乙' }));
  assert.ok(t.includes('积极分子') && t.includes('发展对象'), t);
  assert.ok(!t.includes('伪造甲') && !t.includes('伪造乙'), t);
});

test('B5 材料外发：refLabel/receiverRole 按表复算', () => {
  const rows = { external_dispatches: { 'd-1': { id: 'd-1', refLabel: '表内材料名', receiverRole: '党委组织员' } } };
  const t = TEXT(BUILD('external-dispatch-created', 'd-1', rows, { refLabel: '伪造材料', receiverRole: '伪造角色' }));
  assert.ok(t.includes('表内材料名') && t.includes('党委组织员'), t);
  assert.ok(!t.includes('伪造材料') && !t.includes('伪造角色'), t);
});

test('B6 宣传周报：week/weekRange 按表复算（人名见 E1/E4：源行有 `submittedBy` 才按名册复算）', () => {
  const rows = { weekly_reports: { 'w-1': { id: 'w-1', week: '第 41 周', weekRange: '2026-10-05 ~ 10-11', submittedBy: 'p1' } } };
  const t = TEXT(BUILD('weekly-report-submitted', 'w-1', rows, { week: '伪造周次', weekRange: '伪造区间', submitterName: '张三' }));
  assert.ok(t.includes('第 41 周') && t.includes('2026-10-05 ~ 10-11'), t);
  assert.ok(!t.includes('伪造周次') && !t.includes('伪造区间'), t);
  // 本夹具**未给 `users` 表** ⇒ 名册查无 p1 ⇒ 沿用 payload（批次 426 口径：先按源行补 `submitterId`、再走名册；
  //   「源行有 `submittedBy` 且名册查得到」的正例见 E1，「源行无 `submittedBy`」的反例见 E4）。
  assert.ok(t.includes('张三'), `名册查无 ⇒ 沿用 payload（不空名）：${t}`);
});

test('B7 非空转：11 个 kind 都真有 `build`（防判据被写成恒真）', () => {
  const kinds = [...ACT_TITLE_KINDS, 'activity-created-broadcast', 'taskforce-vote-requested',
    'member-change-approved', 'external-dispatch-created', 'weekly-report-submitted',
    'project-auth-granted', 'review-request-submitted', 'review-request-decided'];
  assert.equal(kinds.length, 11);
  for (const k of kinds) assert.equal(typeof SYSTEM_NOTICE_KINDS[k].build, 'function', `${k} 缺 build`);
});

// ── `R-23`② 余项（2026-10-05 批次 391）：支部上报 / 赋权三 kind ─────────────────────────────
//   这三条的展示值原由**前端纯函数**算好塞进 payload；本批把「支部名 / 事项摘要」下沉到零依赖叶子
//   `docs/src/core/domain/review-request-labels.js`（前端同引一处），服务端据此**按表复算**。
//   ⚠ 边界（如实）：**姓名 / 角色标签 / 落点**仍沿用 payload——服务端无人员名册，且「进谁的台」取决于被赋权人身份。
test('B8 支部上报：支部名 / 事项摘要按表复算（伪造不得出现）', () => {
  const rows = {
    review_requests: { 'rq-1': { id: 'rq-1', branchId: 'br-b1', type: 'develop-node', title: '表内事项', status: 'pending' } },
    branches: { 'br-b1': { id: 'br-b1', name: '表内支部名', config: { headerTitle: '表内支部抬头' } } },
  };
  const t = TEXT(BUILD('review-request-submitted', 'rq-1', rows,
    { branchLabel: '伪造支部', subject: '伪造摘要', submitterName: '李四' }));
  assert.ok(t.includes('表内支部抬头'), `抬头优先：${t}`);
  assert.ok(t.includes('发展节点') && t.includes('表内事项') && t.includes('rq-1'), t);
  assert.ok(!t.includes('伪造支部') && !t.includes('伪造摘要'), t);
  assert.ok(t.includes('李四'), `姓名沿用 payload（如实边界）：${t}`);
});

test('B9 上报结论：approved 由 review_requests.status 复算（不采信 payload 自述）', () => {
  const rows = {
    review_requests: { 'rq-1': { id: 'rq-1', branchId: 'br-b1', type: 'activity-report', title: '表内事项', status: 'rejected', decisionNote: '请补充安全预案' } },
    branches: { 'br-b1': { id: 'br-b1', name: '表内支部名' } },
  };
  const t = TEXT(BUILD('review-request-decided', 'rq-1', rows,
    { approved: true, branchLabel: '伪造支部', subject: '伪造摘要', decisionNote: '伪造意见' }));
  assert.ok(t.includes('驳回'), `应据 status='rejected' 判「驳回」：${t}`);
  assert.ok(!t.includes('批准'), t);
  assert.ok(t.includes('请补充安全预案'), `意见按表复算：${t}`);
  assert.ok(!t.includes('伪造意见') && !t.includes('伪造摘要') && !t.includes('伪造支部'), t);
});

test('B10 赋权通知：项目名按表复算（活动 title / 专班 name）', () => {
  const byAct = TEXT(BUILD('project-auth-granted', 'act-1',
    { activities: { 'act-1': { id: 'act-1', title: '表内活动名' } } }, { projectName: '伪造项目名', roleLabel: '组织者' }));
  assert.ok(byAct.includes('表内活动名') && !byAct.includes('伪造项目名'), byAct);
  const byTf = TEXT(BUILD('project-auth-granted', 'tf-1',
    { taskforces: { 'tf-1': { id: 'tf-1', name: '表内专班名' } } }, { projectName: '伪造项目名' }));
  assert.ok(byTf.includes('表内专班名') && !byTf.includes('伪造项目名'), byTf);
});

// ── 补录#1（2026-10-05 批次 407 · 支书圈「新建通知 kind」）：业务记录作废已裁决 ─────────────────
//   病灶：业务记录「作废（软）」裁决（`SoftVoid.confirmVoid/rejectVoid`）此前**不发派生知会** ⇒
//   **申请人（非支委）收不到裁决结果**（待办作废有 `todo-void-decided`，记录作废无对应 kind）。
//   本件钉死：① 授权＝支委层 ∧ `payload.resource` 在 `RESOURCE_TABLES` 内 ∧ 该行存在；
//             ② 受众＝**申请人本人**（按记录行 `voided/voidRejected.byPersonId` 复算，**到人定向**、不发广播）。
const RAUTH = (actor, resource, sourceId, rows) =>
  SYSTEM_NOTICE_KINDS['record-void-decided'].authorize({ actor, payload: { resource }, sourceId, db: dbStub(rows) });

test('C1 记录作废裁决：支委层 + 已知资源 + 行存在 ⇒ 放行；非支委 / 未知资源 / 行不存在 ⇒ 拒', () => {
  const rows = { makeup_tasks: { 'mk-1': { id: 'mk-1' } } };
  assert.equal(RAUTH({ id: 'p11', role: 'org-commissioner' }, 'makeupTasks', 'mk-1', rows), true, '支委层放行');
  assert.equal(RAUTH({ id: 'p7', role: 'participant' }, 'makeupTasks', 'mk-1', rows), false, '非支委层拒');
  assert.equal(RAUTH({ id: 'p11', role: 'org-commissioner' }, 'nopeResource', 'mk-1', rows), false, '未知资源拒（不采信客户端自造名）');
  assert.equal(RAUTH({ id: 'p11', role: 'org-commissioner' }, 'makeupTasks', 'mk-9', rows), false, '行不存在拒');
  assert.equal(RAUTH(null, 'makeupTasks', 'mk-1', rows), false, '无 actor 拒（防未登录）');
});

test('C2 记录作废裁决（确认）：受众＝申请人本人（按记录行复算，到人定向、不广播）', () => {
  const rows = { makeup_tasks: { 'mk-1': { id: 'mk-1', voided: { byPersonId: 'p20' } } } };
  const notice = SYSTEM_NOTICE_KINDS['record-void-decided'].build({
    db: dbStub(rows), sourceId: 'mk-1',
    payload: { resource: 'makeupTasks', label: '补课任务 · 表内活动名', decision: 'confirmed', reason: '长期未补' },
  });
  assert.deepEqual(notice.audiencePersons, ['p20'], '受众＝申请人（到人）');
  assert.equal(notice.audience, undefined, '不发角色广播');
  const t = TEXT(notice);
  assert.ok(t.includes('补课任务 · 表内活动名') && t.includes('长期未补'), t);
  assert.ok(!t.includes('驳回'), `confirmed 分支不得出现「驳回」：${t}`);
});

test('C3 记录作废裁决（驳回）：受众＝原申请人（`voidRejected.byPersonId`）；无申请人 ⇒ 不设受众', () => {
  const rows = { makeup_tasks: { 'mk-1': { id: 'mk-1', voidRejected: { byPersonId: 'p21', note: '证据不足' } } } };
  const notice = SYSTEM_NOTICE_KINDS['record-void-decided'].build({
    db: dbStub(rows), sourceId: 'mk-1',
    payload: { resource: 'makeupTasks', label: 'L', decision: 'rejected', reason: '证据不足' },
  });
  assert.deepEqual(notice.audiencePersons, ['p21']);
  assert.ok(TEXT(notice).includes('驳回'), TEXT(notice));
  const blank = SYSTEM_NOTICE_KINDS['record-void-decided'].build({
    db: dbStub({ makeup_tasks: { 'mk-2': { id: 'mk-2' } } }), sourceId: 'mk-2',
    payload: { resource: 'makeupTasks', label: 'L', decision: 'confirmed' },
  });
  assert.equal(blank.audiencePersons, undefined, '无申请人 ⇒ 不设受众（不广播给任何人）');
});

// ─────────────────────────────────────────────────────────────────────────────
// D 组：服务端**人员名册读口**（`R-23` 余项 · 2026-10-06 批次 422 · `D-803`③）
//   来源：通知里的**人名**此前无条件沿用客户端 payload（服务端无名册读口）⇒ 可在通知里写别人的名字。
//   判据＝① payload 同时带 `<x>Id` 与 `<x>Name` 者，`<x>Name` 以**名册在册者**为准（正例）；
//           ② 名册**查无此人** ⇒ 沿用 payload（不产生空名 · 反例）；③ 非人名 id **天然不误伤**；
//           ④ payload **不带配对 id** 者仍沿用 payload —— **如实登记为余项**（见 D4）。
test('D1 人名按名册复算：payload 伪造 senderName 被在册名覆盖（external-dispatch-created）', () => {
  const rows = {
    users: { p3: { id: 'p3', name: '在册真名' } },
    external_dispatches: { 'ed-1': { id: 'ed-1', senderId: 'p3', refLabel: '表内材料', receiverRole: '宣传委员' } },
  };
  const t = TEXT(BUILD('external-dispatch-created', 'ed-1', rows,
    { senderId: 'p3', senderName: '伪造名', refLabel: '伪造材料', receiverRole: '伪造角色' }));
  assert.ok(t.includes('在册真名'), `人名未按名册复算（R-23 余项未堵）：${t}`);
  assert.ok(!t.includes('伪造名'), `伪造人名不得出现：${t}`);
});

test('D2 反例：名册查无此人 ⇒ 沿用 payload（不得产出空名）', () => {
  const rows = { users: {}, external_dispatches: { 'ed-2': { id: 'ed-2', refLabel: '材料', receiverRole: '宣传委员' } } };
  const t = TEXT(BUILD('external-dispatch-created', 'ed-2', rows, { senderId: 'p-none', senderName: '未知发送人' }));
  assert.ok(t.includes('未知发送人'), `查无此人时沿用 payload（不空名）：${t}`);
});

test('D3 端口：`applyRosterNames` 只覆写「名册查得到」的 `<x>Id` —— 非人名 id 不误伤', () => {
  const db = dbStub({ users: { p3: { id: 'p3', name: '在册真名' } } });
  const vars = applyRosterNames(db, {
    personId: 'p3', personName: '伪造',
    activityId: 'act-9', activityName: '活动名', sourceId: 'act-9',
  });
  assert.equal(vars.personName, '在册真名', '在册者 ⇒ 覆盖');
  assert.equal(vars.activityName, '活动名', '`activityId` 不在 `users` 表 ⇒ 不得覆写 `activityName`');
});

test('D4 余项**已收口**（2026-10-06 批次 426）：`member-change-approved` 的 payload 不带 `personId` 也按**源行** `personId` 复算', () => {
  // 批次 422 时这里记的是「payload 无配对 id ⇒ 名册无从复算（余项）」；批次 426 改为**按源行派生 id**：
  //   源行 `member_change_requests.personId` 补进 vars ⇒ `applyRosterNames` 按名册复算 `personName`。
  const rows = {
    users: { p7: { id: 'p7', name: '在册真名' } },
    member_change_requests: { 'mc-1': { id: 'mc-1', personId: 'p7', fromStage: '积极分子', toStage: '发展对象' } },
  };
  const t = TEXT(BUILD('member-change-approved', 'mc-1', rows, { personName: 'payload 名' }));
  assert.ok(t.includes('在册真名'), `须按源行 personId 走名册复算：${t}`);
  assert.ok(!t.includes('payload 名'), `伪造 payload 名不得出现：${t}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// E 组（2026-10-06 批次 426）：`R-23` 余项**收口**——「payload 不带配对 id」者改
//   **按源行派生配对 id**，再走 `applyRosterNames` 按名册复算人名。
//   ⚠ 仍沿用 payload 的（如实登记）：`project-auth-granted` 的 `roleLabel`（角色标签，服务端未建
//     「角色标签 → 中文」表）与 `targetPage`（落点，取决于被赋权人身份）。
test('E1 `weekly-report-submitted`：源行 `submittedBy` ⇒ 按名册复算 `submitterName`', () => {
  const rows = {
    users: { p11: { id: 'p11', name: '宣传委员真名' } },
    weekly_reports: { 'wr-1': { id: 'wr-1', submittedBy: 'p11', week: '第十周', weekRange: '10.01–10.07' } },
  };
  const t = TEXT(BUILD('weekly-report-submitted', 'wr-1', rows, { submitterName: '伪造报送人', week: '伪造周' }));
  assert.ok(t.includes('宣传委员真名'), `报送人未按名册复算：${t}`);
  assert.ok(!t.includes('伪造报送人'), `伪造报送人不得出现：${t}`);
  assert.ok(t.includes('第十周'), '周次仍按表复算（批次 390 口径未动）');
});

test('E2 `review-request-submitted`：源行 `submittedBy` ⇒ 按名册复算 `submitterName`', () => {
  const rows = {
    users: { p13: { id: 'p13', name: '支书真名' } },
    branches: { 'br-b1': { id: 'br-b1', name: '演示支部' } },
    review_requests: { 'rr-1': { id: 'rr-1', submittedBy: 'p13', branchId: 'br-b1', type: 'report', title: '半年小结' } },
  };
  const t = TEXT(BUILD('review-request-submitted', 'rr-1', rows, { submitterName: '伪造发起人' }));
  assert.ok(t.includes('支书真名'), `发起人未按名册复算：${t}`);
  assert.ok(!t.includes('伪造发起人'), `伪造发起人不得出现：${t}`);
});

test('E3 `project-auth-granted`：授权人＝服务端 `actor` ⇒ 按名册复算 `authorizerName`', () => {
  const rows = {
    users: { p13: { id: 'p13', name: '支书真名' } },
    activities: { 'act-1': { id: 'act-1', title: '表内活动' } },
  };
  const t = TEXT(BUILD('project-auth-granted', 'act-1', rows,
    { authorizerName: '伪造授权人', projectName: '伪造活动', roleLabel: '组织者', targetPage: './workspace/leader.html' },
    { id: 'p13', role: 'secretary' }));
  assert.ok(t.includes('支书真名'), `授权人未按名册复算（须取自 ctx.actor.id）：${t}`);
  assert.ok(!t.includes('伪造授权人'), `伪造授权人不得出现：${t}`);
  assert.ok(t.includes('表内活动'), '项目名仍按表复算（批次 391 口径未动）');
  // ⚠ 如实：以下两项**仍沿用 payload**（余项）
  assert.ok(t.includes('组织者'), '如实：角色标签仍沿用 payload（服务端未建「角色标签 → 中文」表）');
});

test('E4 反例：源行无人字段 ⇒ 仍沿用 payload（不得产出空名）', () => {
  const rows = { users: { p11: { id: 'p11', name: '在册真名' } }, weekly_reports: { 'wr-2': { id: 'wr-2', week: '第十一周' } } };
  const t = TEXT(BUILD('weekly-report-submitted', 'wr-2', rows, { submitterName: '报表未记报送人时的 payload 名' }));
  assert.ok(t.includes('报表未记报送人时的 payload 名'), `源行无 submittedBy ⇒ 沿用 payload（不空名）：${t}`);
});


