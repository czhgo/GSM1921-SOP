// server/seed.js — 从前端 mock 纯数据模块导入种子
import { DEFAULT_BRANCH_ID } from '../docs/src/core/domain/constants.js';
import { readFileSync } from 'node:fs';
import { replaceCollection } from './db.js';
// Task 1（2026-10-25）：种子只写事实；派生字段统一由 mock/derive.js 补回，API 与 mock 同源。
import { applyDerivedFacts } from '../docs/src/data/mock/derive.js';

/**
 * 反馈域基线种子（R-24，2026-09-13 支书裁定「分形态各接各的源」）：
 * 服务端 issues 表原先**无种子** → API 形态下支书台「反馈管理」恒 0 条，
 * 而当时公开反馈页走本地 docs/data/issues.json 有 4 条 → 同域两口径（公开入口已由 D-824 关闭）。
 * 现以 issues.json 为**内容单一源**播种；匿名记录对外脱敏（当前列表须登录并按支部过滤）：
 *   ⚠ **本函数的「行为」未变、也不该变**——demo 种子**本就没有真实提交人**，故不写 `_realPersonId`
 *   **不算旧口径的遗留**：API 服务端正式写入时**会**记真身（`POST /issues` 按登录会话落 `_realPersonId`）；
 *   因而没有任何角色可通过系统读取种子项的匿名真实提交人。
 *   · submittedBy 一律 '匿名'、anonymous=true、participants=[]（常规支部内读口不出现提交人；`_realPersonId` 仅 API 实际提交写入）；
 *   · 不写 tokenHash（仅判重/限频用，种子无此需求）；
 *   · 保留处置类字段（assignee/assigneeRole/dispatchHistory/comments/reactions）用于演示指派与处置链路；
 *   · 支部归属 branchId（每个组织独立 issue 空间，2026-09-15 支书裁定）：取 issues.json 所载；
 *     存量缺省按部署默认支部 'br-b1'（与前端 services/governance/issues.js 写入口径 getBranchIdOfPerson 同源）。
 */
export function seedIssues() {
  let raw;
  try {
    raw = JSON.parse(readFileSync(new URL('../docs/data/issues.json', import.meta.url), 'utf8'));
  } catch {
    return [];
  }
  return (raw.issues || []).map((r) => {
    // 批次 47-Q（2026-09-16，支书裁定「加过滤 + 种进同源」）：**内部汇报不脱敏**。
    // 本文件同时承载两类：匿名反馈（无 kind）与内部汇报（kind:'report'）。
    //   匿名反馈按 D-824 仅在支部内读取（出口脱敏；真实提交人只保存在 API 服务端受保护字段中、无系统揭名入口）；
    //   该匿名口径对**内部汇报不成立**：
    //   内部汇报按设计就是**带名**的（submittedBy/assignee/participants 指向真人），
    //   支书台「汇报收件箱」与成员台「我发起的汇报」全靠这些字段成立。
    //   若照旧一律脱敏，api 形态会把这些字段抹掉 ⇒ 两形态不一致（mock 直读原文件带名、api 全匿名）
    //   ⇒ 守卫绿而支书在真实演示里看不到汇报（典型的假绿）。故按 kind 分流。
    if (r.kind === 'report') return { ...r, branchId: r.branchId || DEFAULT_BRANCH_ID };
    const { tokenHash: _t, participants: _p, submittedBy: _s, ...rest } = r;
    return { ...rest, branchId: r.branchId || DEFAULT_BRANCH_ID, submittedBy: '匿名', anonymous: true, participants: [] };
  });
}

/**
 * 批次里程碑基线种子（2026-09-23 批次 163）：**内容单一源 = `docs/data/milestones.json`**
 * （照 `seedIssues()` 的写法：读同一份静态文件，不在服务端另造一份清单）。
 * 由来：`MilestoneStore.loadAll()` 原先只 `fetch('./data/milestones.json')`（纯浏览器侧），
 *   服务端无表 ⇒ api 形态下里程碑与静态文件**各说各话**（前端缓存一份、无服务端对源）。
 *   现服务端建表（`db.js::SEMANTIC_TABLES`）并以本文件为唯一内容源播种，前端 api 形态改拉
 *   `GET /api/v1/milestones` ⇒ 两形态同内容。
 * ⚠ 只读域：本表只由播种写入，前端无写口（里程碑的维护仍走静态文件 + 重新部署）。
 */
export function seedMilestones() {
  let raw;
  try {
    raw = JSON.parse(readFileSync(new URL('../docs/data/milestones.json', import.meta.url), 'utf8'));
  } catch {
    return [];
  }
  return (raw.milestones || []).filter((m) => m && m.id);
}

export async function seedDatabase(db) {
  const [peopleMod, activitiesMod, noticesMod, taskforcesMod, seedMod, branchesMod, partyGroupsMod, workgroupSyncMod] = await Promise.all([
    import('../docs/src/data/mock/people.js'),
    import('../docs/src/data/mock/activities.js'),
    import('../docs/src/data/mock/notices.js'),
    import('../docs/src/data/mock/taskforces.js'),
    import('../docs/src/data/mock/seed.js'),
    import('../docs/src/data/mock/branches.js'),
    import('../docs/src/data/mock/party-groups.js'),
    import('../docs/src/data/workgroup-seed-sync.js'),
  ]);

  // 2026-10-18：活动/专班 → 工作组/成员的既有映射，在播种阶段一并落库。
  // 原迁移 v3 在 seed 之前执行（新库此时活动/专班为空）⇒ 播种后工作组缺失；
  // 这里用同一迁移函数（单一源）补齐，并追加演示成员产出授权种子。
  const workgroupSeed = {
    // 2026-10-21 批次 499：种子活动补齐组织落点 + 模型必填装载默认（单一源 workgroup-seed-sync.js），
    // 使 API 首启数据与真实写入结构一致；mock 形态走同一函数。
    activities: workgroupSyncMod.normalizeSeedActivitySeedRows(activitiesMod.ACTIVITIES),
    taskforces: taskforcesMod.MOCK_TASKFORCES.map((row) => ({ ...row })),
    workgroups: [], workgroupMembers: [], workgroupGrants: [],
  };
  // Task 1：专班状态是派生态；先补回 canonical 状态，工作组镜像才能按同一枚举建组。
  applyDerivedFacts(workgroupSeed, { people: peopleMod.PEOPLE });
  workgroupSyncMod.ensureLegacySourceWorkgroups(workgroupSeed);
  workgroupSyncMod.ensureDemoWorkgroupGrants(workgroupSeed);
  const replaceWorkgroupTable = (table, rows) => {
    db.exec(`DELETE FROM ${table}`);
    const stmt = db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`);
    for (const row of rows) stmt.run(row.id, JSON.stringify(row));
  };
  replaceWorkgroupTable('workgroups', workgroupSeed.workgroups);
  replaceWorkgroupTable('workgroup_members', workgroupSeed.workgroupMembers);
  replaceWorkgroupTable('workgroup_grants', workgroupSeed.workgroupGrants);

  replaceCollection(db, 'users', peopleMod.PEOPLE);
  replaceCollection(db, 'branches', branchesMod.BRANCHES);
  replaceCollection(db, 'activities', workgroupSeed.activities);
  replaceCollection(db, 'notices', noticesMod.MOCK_NOTICES);
  replaceCollection(db, 'taskforces', workgroupSeed.taskforces);
  replaceCollection(db, 'tasks', seedMod.SEED_TASKS);
  replaceCollection(db, 'assignments', seedMod.SEED_ASSIGNMENTS);
  // T-209 全栈同步：档案归档/报名记录补种（与 mock-adapter.js _seedInitialData 对齐），
  // 保证 API 模式首启时宣传档案区与报名渠道有基线数据
  replaceCollection(db, 'archive_records', seedMod.SEED_ARCHIVE_RECORDS);
  replaceCollection(db, 'signups', seedMod.SEED_SIGNUPS);
  // R-24：反馈域基线（与支部内反馈入口同源；匿名记录对常规读口脱敏）。
  // 注：issues 是**语义端点域**（仅语义端点读写、不进快照写穿；匿名真身 `_realPersonId` 由写口落，
  //   任何系统揭名请求均被拒绝），但表本身在 db.js RESOURCE_TABLES 内，
  //   故与其它集合同走 replaceCollection 落库。
  replaceCollection(db, 'issues', seedIssues());
  // 批次 47-P（2026-09-16，支书「允许改种子」裁定）：支部上报审批基线。
  // 与 mock 态**同源**（`docs/src/data/mock/seed.js::SEED_REVIEW_REQUESTS`，经 mock-adapter._seedInitialData 注入）
  // ⇒ 两形态一致；补它的直接动因：党委台「驳回」只在 pending 行渲染，而本表原无种子
  // ⇒ api 形态下支书在党委台点不到该动作（批 47-M 实测入口计数 0）。
  replaceCollection(db, 'review_requests', seedMod.SEED_REVIEW_REQUESTS);
  // 批次 47-Y（2026-09-16，承 R-78 口径）：补课任务基线。
  // 与 mock 态**同源**（`docs/src/data/mock/seed.js::SEED_MAKEUP_TASKS`，经 mock-adapter._seedInitialData 注入）
  // ⇒ 两形态一致；补它的直接动因：成员台「考勤概况 · 去补课」入口只在「本人 pending 补课任务」存在时渲染，
  //   而该表原无种子（`data-adapter.js` 原注「由纪检操作生成，空属合理」）⇒ api 形态下该入口恒不存在。
  //   本条任务＝`att900`（2400012349 · act-31 · 缺勤 · 已确认）的派生结果（详见该常量注释；
  //   `attendanceRecordId` 原误写 `att-sep-1`，2026-09-26 已按真实 id 改准为 `att900`）。
  replaceCollection(db, 'makeup_tasks', seedMod.SEED_MAKEUP_TASKS);
  // 2026-09-14 批次 25：党小组一等实体种子（br-b1 现有三组；组长由成员档案派生不落本表）
  replaceCollection(db, 'party_groups', partyGroupsMod.PARTY_GROUPS);
  // 2026-09-14 批次 25：成员流动台账（member_flows）种子为空数组（运行时业务过程数据，
  // 无演示历史）→ 不灌库；服务端表由 db.js RESOURCE_TABLES 建表，写入走快照/CRUD 通道。
  //
  // 2026-09-23 批次 163：批次里程碑（milestones）**语义端点域**首启播种——
  //   内容单一源 = docs/data/milestones.json（与前端 mock 形态读的静态文件同一份）。
  //   语义端点域的表由 db.js 的 SEMANTIC_TABLES 建（独立于 RESOURCE_TABLES），
  //   replaceCollection 的白名单已同源放开（见 db.js），故与 issues 同法落库。
  replaceCollection(db, 'milestones', seedMilestones());

  // ════════════════════════════════════════════════════════════════
  //  批次 189（2026-09-25）：补「只有结构、没有数据」的表（支书逐字裁定）
  // ════════════════════════════════════════════════════════════════
  // 由来（支书逐字）：「我认为 db 中应当把**数据不全**，光有结构说明 mock 的数据是不足的！
  //   必须要补上，我们才能够更好地测试！」
  // 口径（三条，逐表见下方注释与 `SEED_*` 常量头注）：
  //   ① 有**权威内容源**的（`docs/src/data/mock/**` 的具名导出）⇒ **一律从该源播种**，不在服务端另造第二份清单
  //      ⇒ mock / api 两形态同内容（与 `seedIssues()`／`seedMilestones()` 同一纪律）。
  //   ② 服务端**写入形状**已由语义端点 / 服务层固化的（交接 / 变更确认 / 申诉 / 未读 / 审计 / 任期 / 外发）
  //      ⇒ 按该形状造**最小演示行**（每表 1–2 行，不为凑数造量）。
  //   ③ 引用一律取自既有实体（`users` 的 personId / `branches` 的 branchId / `activities` 的 id）
  //      ⇒ **零孤立引用**（与 `mock-integrity` M1 同判据：跨表引用必须落在真实行上）。
  // ⚠ 幂等：`replaceCollection` = `DELETE FROM t` + 整表 `INSERT`（与上文既有 14 个集合同法）⇒
  //   同一库重复播种**只覆盖、不叠加**；本表新增行同此，无重复 key。
  // ⚠ 语义端点域（handoffs / member_confirmations / *_appeals / issue_unread / auth_audit）在
  //   `db.js::SEMANTIC_TABLES`：`replaceCollection` 的白名单已同源放开（见 db.js），它们**不进快照写穿**，
  //   故首启播种后由 `init()` 逐域拉取填充缓存（与 agendaVotes 同一取法）。
  const [attendanceMod, inspectionMod, reviewMod, thoughtReportMod] = await Promise.all([
    import('../docs/src/data/mock/attendance.js'),
    import('../docs/src/data/mock/inspection.js'),
    import('../docs/src/data/mock/review.js'),
    import('../docs/src/data/mock/thought-reports.js'),
  ]);
  // 考勤（内容单一源 = `data/mock/attendance.js::ATTENDANCE_RECORDS`：att1…att43 显式段 + att44… 8 月生成段 + att900）
  replaceCollection(db, 'attendances', attendanceMod.ATTENDANCE_RECORDS);
  // 考察（内容单一源 = `data/mock/inspection.js::INSPECTION_RECORDS`）
  replaceCollection(db, 'inspections', inspectionMod.INSPECTION_RECORDS);
  // v12：考察对象必须是父工作组成员。用考察事实补工作组成员（不新增人员/活动），
  //   与 `seed-rows.js` 的派生种子同源；补完只需重写成员表（授权表未变）。
  if (workgroupSyncMod.ensureInspectionWorkgroupMembers(workgroupSeed, inspectionMod.INSPECTION_RECORDS)) {
    replaceWorkgroupTable('workgroup_members', workgroupSeed.workgroupMembers);
  }
  // 活动复盘 / 专班复盘（内容单一源 = `data/mock/review.js` 的两个具名导出）
  replaceCollection(db, 'activity_reviews', reviewMod.REVIEW_RECORDS);
  replaceCollection(db, 'taskforce_reviews', reviewMod.TASKFORCE_REVIEW_RECORDS);
  // 思想汇报（内容单一源 = `data/mock/thought-reports.js::THOUGHT_REPORTS`；含 tr-5「已打回」过渡态样本）
  replaceCollection(db, 'thought_reports', thoughtReportMod.THOUGHT_REPORTS);
  // 宣传周报 / 宣传任务（**2026-09-28 批次 234 去冗余**）：**内容单一源 = `docs/src/data/mock/prop.js`**——
  //   原先这两个常量在宣传台 tab 内为**私有**（未导出、不可 import），本文件按之**逐字复刻**了一份
  //   ⇒ 两份字面量、须人工同步（该复刻块的原注释即写明「如后续把该常量导出，请改为 import 同源（勿留两份）」）。
  //   现该常量已收进单一源模块：UI 侧（`prop/weekly-tab.js` / `prop/tasks-tab.js`）与本节**同源 import 同一份**——
  //   UI 侧作 mockDB 空表兜底注入，本节作 api 形态首启播种 ⇒ 两形态同内容、且再无第二份可漂移。
  const [{ PERIODIC_ARCHIVES_SEED, PROP_TASKS_SEED }, auxSeed] = await Promise.all([import('../docs/src/data/mock/prop.js'), import('../docs/src/data/mock/auxiliary.js')]);
  replaceCollection(db, 'periodic_archive_submissions', PERIODIC_ARCHIVES_SEED);
  replaceCollection(db, 'prop_tasks', PROP_TASKS_SEED);
  // 文件流外发确认（形状 = `services/activity/external-dispatch.js::addExternalDispatch`；1 条待确认 + 1 条已确认）
  replaceCollection(db, 'external_dispatches', auxSeed.SEED_EXTERNAL_DISPATCHES);
  // 三委数据交接（形状 = `routes/resources.js` 的 `POST /handoffs`；from/to 由 type 经 HANDOFF_TYPES 派生）
  replaceCollection(db, 'handoffs', auxSeed.SEED_HANDOFFS);
  // 名册成员变更确认队列（形状 = `POST /member-confirmations`；待支书确认 1 条）
  replaceCollection(db, 'member_confirmations', auxSeed.SEED_MEMBER_CONFIRMATIONS);
  // 出勤 / 考察申诉队列（形状 = `POST /attendance-appeals` / `POST /inspection-appeals`；各 1 条 pending）
  replaceCollection(db, 'attendance_appeals', auxSeed.SEED_ATTENDANCE_APPEALS);
  replaceCollection(db, 'inspection_appeals', auxSeed.SEED_INSPECTION_APPEALS);
  // 意见反馈「逐人未读标记」（形状 = `POST /issue-unread`：id = `${assigneeId}:${issueId}`）
  replaceCollection(db, 'issue_unread', auxSeed.SEED_ISSUE_UNREAD);
  // 授权审计留痕（形状 = `POST /auth-audit`；记 br-b1 首任支书的任命，与 branches.secretaryId 自洽）
  replaceCollection(db, 'auth_audit', auxSeed.SEED_AUTH_AUDIT);
  // 支书任期记录（形状 = `appointmentRecords` 通用 CRUD；现任一条、`to: null`，与 branches.secretaryId 自洽）
  replaceCollection(db, 'appointment_records', auxSeed.SEED_APPOINTMENT_RECORDS);

  // ════════════════════════════════════════════════════════════════
  //  2026-11-02 批次 527（数据契约 Wave 2）：补「契约有、种子无」的 4 张表
  // ════════════════════════════════════════════════════════════════
  //  · image_records：2 条绑定既有已收录活动 ⇒ 首页「活动风采」不再恒空；
  //  · member_change_requests：roster / transfer 各 1 条 ⇒ 成员确认页不再恒空；
  //  · workgroup_tasks / workgroup_outputs：tf-002 工作组 2 任务 1 产出 ⇒ 首页/专班页有真实读数。
  // 全部与 mock 形态同源（`docs/src/data/mock/auxiliary.js`），不另造第二份清单。
  replaceCollection(db, 'image_records', auxSeed.SEED_IMAGE_RECORDS);
  replaceCollection(db, 'member_change_requests', auxSeed.SEED_MEMBER_CHANGE_REQUESTS);
  replaceWorkgroupTable('workgroup_tasks', auxSeed.SEED_WORKGROUP_TASKS);
  replaceWorkgroupTable('workgroup_outputs', auxSeed.SEED_WORKGROUP_OUTPUTS);

  // ════════════════════════════════════════════════════════════════
  //  批次 195+（2026-09-26）：待办（todos）基线种子（**补已知缺口**）
  // ════════════════════════════════════════════════════════════════
  // 口径判定（先实读三处再动手：`services/governance/todo.js` 的 `SEED_TODOS` · `routes/resources.js` 的 todos 写口 ·
  //   `routes/leader-progress.js` 的 todos 读口径）：`todos` 在本系统里**两种性质并存**，故按纪律①播种——
  //   · **运行时派生**是常态：通知（`NoticeTodoDeriver`）/ 活动·专班生命周期（`LifecycleTodoDeriver`）/
  //     成员台参与（`VisitorTodoDeriver`）都在业务动作**发生时**派生待办——这些**不落种子**，由演示过程自然产生；
  //   · 但另有一小批**独立台账型种子**：`docs/src/services/governance/todo.js::SEED_TODOS`（1 条：宣传委员
  //     「提交红色徒步·香山行新闻稿」；R2-33 已删除「设置第三党小组组长」假待办——2400012348 早已是第三组组长；
  //     该条已挂 `sourceId: act-37`，活动归档可自动销项）——由前端 `seedTodos()`（各工作台入口调用）与
  //     `data-adapter.js::init()` 的 `SEED_FALLBACK` 空表回退**两处**注入，属既有演示基线。
  // 处方：**从 `SEED_TODOS` 同源播种**（与 mock 形态逐值一致；前端 seedTodos() 读的正是同一常量），
  //   **不在服务端另造第二份清单**（与 `seedIssues()`／`seedMilestones()` 同一纪律）。
  // 直接动因：本文件原先**未播种 `todos`** ⇒ api 形态首启「待办」恒空，全靠前端空表回退兜底；
  //   而那回退分支（`data-adapter.js::init()`）曾引爆**静默丢写竞态**（批次 197 已修：基线捕获提前到任何
  //   `await` 之前）。补种后该分支**不再被走到**（附带收益；`SEED_FALLBACK`/`DISABLE_SEED`/生产默认不播种
  //   三条开关语义**一字未改**）。
  // 幂等：`replaceCollection` = `DELETE FROM todos` + 整表 `INSERT` ⇒ 重复播种只覆盖、不叠加。
  const { SEED_TODOS } = await import('../docs/src/services/governance/todo.js?v=20260924a');
  // v11（批次 504）：`todos.branch_id` 是普通列，`replaceCollection` 只写 id/data ⇒ 种子也须显式归属，
  //   否则 API 形态按支部读待办会空。缺省归属沿用部署默认支部（与消息/活动种子同口径）。
  // v12：`todos.branch_id` 已是生成列（json_extract(data,'$.branchId')），只写 data 即可。
  replaceCollection(db, 'todos', SEED_TODOS.map((row) => ({ ...row, branchId: row.branchId || DEFAULT_BRANCH_ID })));

  // ════════════════════════════════════════════════════════════════
  //  Task 1（2026-10-25）：事实 → 派生（与 mock hydrate 同一个 applyDerivedFacts）
  // ════════════════════════════════════════════════════════════════
  // 种子文件只写事实（日期 / 确认动作 / 归档指向 / 参会 / 报名）；下列派生字段在落库后统一补回，
  // 保证 API 形态与 mock 形态读到的形状一致：
  //   activities.status · activityReviews.progress/overdue · inspections.status ·
  //   taskforces.status · archiveRecords.activityName/status · notices.expireDate ·
  //   attendances.studentId/developStage/partyGroup
  const DERIVED_TABLES = [
    ['activities', 'activities'],
    ['activity_reviews', 'activityReviews'],
    ['inspections', 'inspections'],
    ['taskforces', 'taskforces'],
    ['archive_records', 'archiveRecords'],
    ['notices', 'notices'],
    ['attendances', 'attendances'],
  ];
  const derivedRows = {};
  for (const [table, key] of DERIVED_TABLES) {
    derivedRows[key] = db.prepare(`SELECT data FROM ${table}`).all().map((row) => JSON.parse(row.data));
  }
  if (applyDerivedFacts(derivedRows, { people: peopleMod.PEOPLE })) {
    for (const [table, key] of DERIVED_TABLES) {
      const update = db.prepare(`UPDATE ${table} SET data = ? WHERE id = ?`);
      for (const row of derivedRows[key]) update.run(JSON.stringify(row), row.id);
    }
  }
}

// ════════════════════════════════════════════════════════════════
//  批次 189 的服务端种子常量（**置文件末**：上文 `seedDatabase` 内语句与上方的行号零漂移）
// ════════════════════════════════════════════════════════════════
// ⚠ 置尾理由与 `db.js` / `server/routes/resources/` 同款：上文有大量 `文件:行号` 取证引用
//   （`doc-line-ref.test.mjs` 逐条核 `README-server.md` 的引用）⇒ 新增一律追加在文件尾部。
// 2026-09-28 批次 234：原在此的两个「逐字复刻」常量（宣传周报 `SEED_WEEKLY_REPORTS` / 宣传任务 `SEED_PROP_TASKS`）
//   **已删** —— 二者与 `docs/src/data/mock/prop.js` 字面量完全重复，现改由该单一源同源 import（见 `seedDatabase()` 内）。

// ── R10（2026-10-23，C14）：8 个「仅服务端种子」常量已迁至内容单一源
//    `docs/src/data/mock/auxiliary.js`；此处再导出，保持既有 import（`server/seed-rows.js` 与测试）不变。
//    播种取值见 `seedDatabase()` 内的 `auxSeed` 动态 import。──
export {
  SEED_EXTERNAL_DISPATCHES, SEED_HANDOFFS, SEED_MEMBER_CONFIRMATIONS,
  SEED_ATTENDANCE_APPEALS, SEED_INSPECTION_APPEALS, SEED_ISSUE_UNREAD,
  SEED_AUTH_AUDIT, SEED_APPOINTMENT_RECORDS,
} from '../docs/src/data/mock/auxiliary.js';
