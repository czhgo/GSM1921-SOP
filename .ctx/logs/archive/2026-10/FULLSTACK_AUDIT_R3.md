---
title: 全栈专项审查 R3：数据流真值 / 权限一致性 / 并发幂等 / 计算口径 / 可观测性 / 学号主键迁移
type: audit
role: [工程师]+[AI]
last_updated: 2026-10-20
status: final
round: 3
---

# 全栈专项审查 R3

> **审计时点（重要）**：本报告写入时，工作区存在**未提交的学号主键迁移中间态**（`git status` 显示 `server/db.js`、`server/routes/auth.js`、`docs/src/data/mock/**`、`docs/src/data/legacy-person-ids.js`、`server/migrations/legacy-person-ids.js` 等 20 项改动）。因此本报告把「迁移批本身」也作为审查对象；下文引用的行号均以审计时点的工作区为准。
>
> **实测证据**：
> - `node --test server/test/db-migration.test.mjs`：**5/6 通过，M3 红**，`ReferenceError: isLegacyPersonId is not defined at server/db.js:474`（有存量数据的库启动即失败）。
> - `node --test server/test/activity-delete.test.mjs`：**2/2 通过**（`p13` 登录别名可用，说明 `server/routes/auth.js` 的 import 已补齐）。
> - 迁移日志：`[db] v7 人员主键迁移：total=0 mapped=0 rate=1`（空库）；`[db] schema v7（本次应用 7 项）`。
>
> 审计方式：只读静态审查 + 单文件测试抽查；未改业务代码、未提交、未移动 `.ctx` 顶层文件。

## 一、结论摘要

- **P0 两条**：① v7 迁移在存量库上因缺少 import 直接抛错，服务无法启动；② 「行级读投影 + 集合级整表快照」会让普通成员在保存待办/思想汇报时**整表删掉同支部其他人的记录**。
- **P1 十六条**：集中在「服务端写门覆盖面不足」「逐人已读与服务端 read 白名单脱节」「行级读 + 整表写」「fire-and-forget 同步却先报成功」「迁移只覆盖服务端 JSON，不覆盖本地缓存/URL/复合主键」「baseline 仍建 `p_pc`」。
- **口径重复仍有 3 处**：逾期数（两处 inline 比较）、成员数（服务端 branchSummary 与前端 roster/getMembers）、专班在办状态集（prop 看板手写）。
- **可观测性**：写失败绝大多数只有 `console.warn`，用户侧只剩「未保存成功，请稍后重试」（不带 403/409/428 原因）；服务端没有写审计日志。

## 二、问题总表

| 编号 | 主题 | 文件:行号 | 现象 | 根因 | 影响 | 建议 | 优先级 |
|---|---|---|---|---|---|---|---|
| F-01 | 迁移阻断 | `server/db.js:474`、`:476`、`:488`、`:511` | 存量库执行 v7 时抛 `ReferenceError: isLegacyPersonId is not defined`；`db-migration.test.mjs::M3` 实测红 | `migratePersonIdsToStudentNumbers()` 使用 `isLegacyPersonId` / `mapPersonId`，但 `db.js` 顶部与尾部均未 import `server/migrations/legacy-person-ids.js`（空库因无行可扫而侥幸通过） | 任何有 `users` 行的旧库升级即启动失败；M1/M2 绿造成「迁移可用」的假象 | 在 `db.js` 增加静态 import；补「有 1 行 users 的旧库」用例作为 M3 的强断言 | **P0** |
| F-02 | 数据流真值/丢数据 | `docs/src/data/data-adapter.js:539-567`；`server/routes/resources/index.js:150-168`；`server/routes/resources/branch-scope.js:310-317` | 普通成员（participant/leader）保存一条待办或提交一篇思想汇报后，快照把 `todos` / `thoughtReports` 整集合替换为其本地缓存子集 | `init()` 对 `todos`（`_canReadTodoRow`）与 `thoughtReports`（`canReadThoughtReport`）做**行级读投影**；但 `persist()` 仍按**集合级**上传整表；`mergeScopedSnapshotWrites` 只保留**其他支部**行，`_retainUngatedSnapshotRows` 只保护有写门的集合；两者都不保护「同支部、被读投影过滤掉的行」 | 一次保存即删除同支部其他成员的个人待办/思想汇报（版本号 +1，其他人刷新后也看不到）；属于静默丢数据 | 方案 A：这两域改为语义端点写口（推荐）；方案 B：服务端对 `todos`/`thoughtReports` 快照按 `personId` 做「保留未见行」合并；方案 C：普通成员不参与这两集合的整表快照 | **P0** |
| F-03 | 权限一致性/已读 | `server/routes/resources/gates.js:359-364`；`docs/src/services/governance/notice.js:617-622` | 普通成员点开通知后 `reads[]` 已写入本地，但快照被 403 拒绝；刷新后恢复未读 | 前端已按 R2-49 改成逐人 `reads: personId[]`；服务端 `_snapshotNoticeWriteDeny` 只白名单 `changed.every(key => key === 'read')`，仍按旧的全局 `read` 判 | 全体非支委成员「已读」实际不落库；`markAllRead` 同样失败，用户只看到「未保存成功」 | 服务端白名单改为 `['read','reads']`，并对 `reads` 做「只允许追加本人、不得删除他人」的差量校验 | **P1** |
| F-04 | 权限一致性/可点但 403 | `server/routes/resources/index.js:127-136`；`server/routes/resources/workgroup-routes.js:343-376`；`docs/src/services/activity/attendance.js:42-46` | 组长在组长台保存本组考勤时，服务端返回 403「不能删除该考勤记录」 | 组长非支委，`GET /attendances` 只返回其本组行；`saveAttendanceRecords` 仍把整个 `mockDB.attendances` 快照上传；`snapshotScopeDeny` 对「库里存在、payload 缺失」的每一行调用 `attendanceWriteDeny`，他组行必然拒绝 | 组长无法保存考勤（本组也不行），除非该支部只有他组数据 | 组长/成员快照按「本场次」合并，或考勤写入改走 `POST/PATCH /attendances` 语义端点并只提交变更行 | **P1** |
| F-05 | 权限一致性/写门覆盖 | `server/routes/resources/gates.js:28-40`、`:80-82`；`server/routes/resources/index.js:231`、`:366`、`:563` | 任一登录成员可 `PATCH`/`DELETE` 同支部的 `thoughtReports`、`tasks`、`todos`、`makeupTasks`、`archiveRecords`、`experienceDeposits`、`propTasks`、`externalDispatches`、`activityReviews`、`taskforceReviews`、`periodicArchives` 等 | `RESOURCE_WRITE_GATE` 只覆盖 branches/appointmentRecords/users/reviewRequests/notices/partyGroups/memberFlows（+ 运行时 inspections），其余资源 `writeAuth` 仅 `requireAuth`，`_assertResourceWrite` 无门即放行 | 前端隐藏的删除/改档入口可被直连 API 调用；如普通成员可删他人思想汇报、改复盘批注、删归档记录 | 为所有可写资源补「资源级写门 + 行级归属/角色判据」；未定口径的资源先 deny-by-default（只读） | **P1** |
| F-06 | 权限一致性/越权读 | `server/routes/resources/index.js:211-217`；`docs/src/services/governance/notice.js:672-696` | `GET /api/v1/notices` 对支部账号返回**全部**支部通知，包括 `noticeType:'message'` 私信与 `audiencePersons` 定向通知正文 | 资源读口只做支部过滤，没有复用 `canReadNotice` 的受众判定；前端 `NoticeStore.list()` 才按受众过滤 | 任一支部成员可在 DevTools/直连 API 读到别人的私信与定向通知；与「私信仅收发双方可见」的制度口径冲突 | 服务端读口按 `canReadNotice` 同一判据逐行投影；私信只返回 `fromPersonId===actor.id` 或 `audiencePersons` 命中行 | **P1** |
| F-07 | 权限一致性/越权读 | `server/routes/resources/index.js:1092-1099`；`server/seed.js:27-37` | `GET /api/v1/issues` 对支部所有成员返回全部反馈，含 `kind:'report'` 内部汇报（带真实提交人/指派）与 `hidden:true` 行 | 读口只按 `branchId` 过滤，未按 `kind` / `hidden` / `assignee` 做投影；`sanitizeIssue` 只剥匿名真身 | 普通成员可读到本应只给支书/被指派人的内部汇报与隐藏事项 | 支部内也按 `IssueStore` 的前端可见性规则在服务端投影（内部汇报仅支书/指定人；hidden 仅处置人） | **P1** |
| F-08 | 数据流真值/刷新复活 | `server/routes/resources/index.js:157-175`；`docs/src/services/member/person.js:333-336`；`docs/src/services/member/roster.js:111-116` | 组织委员移出成员后本地缓存即时消失，但刷新/重新 `init()` 后该成员重新出现在名册与应到名单 | `POST /members/:id/transfer-out` 只打 `transferOut:true` 软标记；`GET /users` 与 `resourceRowsForActor` 不按该标记过滤；`PersonStore._baseMemberRecords()` 在 API 形态直接返回 `mockDB.users`，`getEffectiveMembers` 也不过滤 | 移出无效（成员反复复活），应到人数/考勤分母偏大；`branch-readonly-entry.js:48` 单独过滤，进一步证明口径分裂 | 服务端 `users` 读口（或名册投影）统一剔除 `transferOut===true`；历史引用仍按姓名索引解析；前端只消费同一投影 | **P1** |
| F-09 | 数据流真值/假成功 | `docs/src/services/governance/handoff.js:34-45`、`:132-134`；`docs/src/services/member/member-confirmation.js:148-158`、`:316-317`；`docs/src/services/activity/attendance.js:312-323`；`docs/src/services/core/auth.js:872-892` | 交接发起/确认、成员变更入队/决策、出勤/考察申诉、授权审计：本地写入后立刻 `showToast('success')`；服务端语义端点失败只 `console.warn`，未登记 `trackWrite` | 这些语义域**不进快照 payload**，但同步调用是 fire-and-forget；`showToast` 只等待 `pending-writes` 登记过的 promise | 「提示成功但未持久化」：刷新后交接/申诉/确认队列/审计留痕消失（尤其断网、403、409 时） | 把语义端点调用包成 `trackWrite(promise)` 并在成功提示前 `await settleWrites()`；失败文案区分 403/409/网络 | **P1** |
| F-10 | 数据流真值/双写一半 | `docs/src/services/branch/appointment.js:56-63` | `appointSecretary` 先成功更新 `branches.secretaryId` 与任期记录，再 `users.update(role)`；后者异常被 `catch` 吞掉并只改本地缓存 | 角色双链（users.role / person.role）更新失败被当作可忽略；事务边界跨三次 HTTP 写 | 服务端出现「支部已换支书、users.role 仍旧」的半写状态；登录后的工作台权限与任命档案不一致 | 角色更新失败必须回滚/报错（或改为服务端单事务语义端点 `POST /branches/:id/appoint`）；前端不得在部分失败时提示成功 | **P1** |
| F-11 | 权限一致性/跨支部 | `server/routes/resources/workgroup-routes.js:36`、`:186-196`、`:431-437` | `party-staff` 无支部归属时 `ownBranch(actor)` 回落 `br-b1`；党委账号可创建/管理 `br-b1` 的工作组，且 `canManageWorkgroup` 把党委当 br-b1 | `ownBranch` 使用 `actor?.branchId || 'br-b1'`，与本批已修的「显式 null 不回落」口径相反 | 党委在未选支部时可对 br-b1 产生写操作；跨支部治理边界被默认支部吞掉 | `ownBranch` 对 `party-staff` / `branchId===null` 返回 null；所有 workgroup 写口要求显式 `branchId` 并校验 | **P1** |
| F-12 | 迁移风险/本地缓存 | `docs/src/data/mock-adapter.js:34`、`:300-327`；`docs/src/core/domain/domain.js:19` | 旧浏览器缓存 `workflowos_branch_db_v1` 中的 `p*` 记录不会被改写；`SEED_DATA_VERSION` 仍为 `2026-10-07`，不会触发整库失效 | `mock-adapter` 只 import 了 `legacy-person-ids.js`，未调用 `mapPersonId/mapLegacyIdInString`；`loadDB` 原样恢复并 `_mergeNewSeedRecords()` 合并新学号种子 | 老访客本地库出现「p* 旧记录 + 学号新种子」并存：姓名解析不到、引用断链、重复人员；mock/静态演示形态首屏数据错乱 | 在 `loadDB` 恢复后对整库做一次递归迁移（含对象键与复合 id），迁移后写回并 bump `SEED_DATA_VERSION`；或明确丢弃旧库并提示 | **P1** |
| F-13 | 迁移风险/新库 | `server/seed-baseline.js:54-65`；`server/server.js:41-42` | 空库启动时 `seedBaseline()` 仍创建 `id:'p_pc'`、`studentId:'9000000001'` 的党委账号 | baseline 未随「id=学号」口径更新；而 `user_version` 已在空库时升到 7，后续不会再迁移 | 新部署永久存在一个 `p_pc` 主键；`auth.js` 登录别名把 `p_pc` 映射到 `9000000001` 后查不到行 → 党委账号无法登录（叠加 F-01 时更早失败） | 把 baseline id 改为 `studentId`（或 `BASELINE_PARTY_STAFF_ID`），并补「空库 baseline 后 id===studentId」测试 | **P1** |
| F-14 | 迁移风险/删除防护 | `docs/src/services/member/person.js:737-742` | 整支部名单替换时 `if (u.id === 'p_pc') continue` 已无法保护迁移后的党委账号 | 防护按旧 id 硬编码；迁移后党委账号 id 为 `9000000001`，且 `branchId:null` 会因 `(u.branchId || 'br-b1')` 被算进 br-b1 的 old 列表 | `_apiReplaceBranchMembers('br-b1')` 会删除党委账号；党委台随即不可登录 | 改为按 `role === 'party-staff'` 跳过，禁止用 id 字面量做系统内建防护 | **P1** |
| F-15 | 迁移风险/覆盖面 | `server/db.js:495-504`、`:466-574` | v7 的 `transform()` 只递归对象 **value**，不处理 **key**；只处理 string，不处理 number | 迁移按「值精确等于旧 id」与「row.id 复合串」改写；`agenda[].personStages` 是 `{p6:'发展对象'}` 这种**对象键**；`audiencePersons` 历史上出现过数字；`p_<uuid>` 不匹配 `isLegacyPersonId` | 迁移后议程逐人阶段查不到（`personStages[personId]` 空）、数字受众失效、旧 IAAA 代理键残留 | 增加 `transformKeys`（仅对已知人员键名的对象做键改写）、数字 id 归一、`p_<uuid>` 识别与失败清单；补迁移前后逐域对照断言 | **P1** |
| F-16 | 写口形态/可点但 403 | `docs/src/services/core/mock.js:262-289`；`docs/src/services/core/runtime.js:49`；`docs/src/entries/tabs/prop/archive-tab.js:224-232` | 宣传委员在「档案归档」点「归档活动」：本地 `archiveActivity` 只改 mockDB，随后快照被服务端 `activityOperationAllowed` 拒绝（非支书且无工作组授权） | `BranchService = mockService`，`archiveActivity` 没有像 `createActivity`/`deleteActivity` 那样在 API 形态改走 `/activities/:id/archive`；快照口的活动写门只认支书/副支书/工作组授权 | 宣传台核心动作 403；用户看到「未保存成功」但不知为何 | `archiveActivity`/`updateActivity` 在 API 形态改走语义端点；或把 `activity.archive` 权限明确授予宣传委员并同步前端显隐 | **P1** |
| F-17 | 数据流真值/伪 assignee | `docs/src/services/governance/issues.js:1164-1173`；`server/routes/resources/semantic-routes.js:129-137` | `IssueNotify.markSecretaryReviewPending()` 以 `assigneeId='secretary-review'` 写服务端；`POST /issue-unread` 要求 `users` 表存在该 id，返回 400；`getSecretaryReviewUnread()` 恒 0 | 前端用「伪人员 id」承载支书待终审未读，服务端按真实 users 行校验；mock 形态本机键可存，api 形态不可 | 支书台「待终审」红点/未读在 API 模式永远不出现；刷新后本地标记也丢 | 为「角色级未读」建立合法键（如 `role:secretary`）并让两端同源；或改为服务端按 `resultPending` 现算 | **P1** |
| F-18 | 并发/迁移主键冲突 | `server/db.js:554-565` | v7 直接 `UPDATE users SET id=新学号 WHERE id=旧p*`；若库中已存在同一学号行（IAAA 提前建号/人工导入），触发 `UNIQUE constraint failed`，整库迁移回滚 | 迁移只检查「无法映射」，没有检查「目标主键已存在」与合并策略；`issue_unread`、`workgroup_members` 等复合主键同样可能撞 | 混合库升级失败；若未来加 `INSERT OR REPLACE` 兜底则会静默覆盖新行（更危险） | 迁移前做「目标 id 冲突清单」：同人则合并（保留新行、补齐引用），不同人则拒绝启动并给出可操作清单 | **P1** |
| F-19 | 并发/丢本地写 | `docs/src/data/data-adapter.js:737-753`、`:598-606` | 同集合 409 时 `_recoverFromConflict` 直接重拉服务端数据覆盖本地集合，只弹「已被他人更新，已为你刷新」 | 冲突恢复没有「把本地未提交改动 rebase 到新基线」的机制；`_commitBase` 直接采用服务端 | 用户刚填的表单/刚改的行在冲突后**静默消失**（只剩一条提示），需要重做 | 冲突时保留本地 diff（按 id 逐行三方合并）或明确弹「你的修改未提交，是否保留副本」；至少把冲突集合的本地差异写入本地备份 | **P2** |
| F-20 | 并发/幂等 | `docs/src/data/api-adapter.js:210-233`；`docs/src/data/data-adapter.js:580-607` | 快照请求无幂等键；8s 超时/切页重试时，若首次请求已被服务端执行，第二次带旧 `_versions` 会得到 409 | `POST /snapshot` 以「整表替换 + 版本 +1」实现，没有 requestId/幂等表；超时无法判断是否已落库 | 用户看到「冲突/失败」但数据其实已保存；或重复保存触发无意义冲突与整页刷新 | 引入 `X-Idempotency-Key`（前端每次 flush 生成 UUID，服务端短期去重并回放响应） | **P2** |
| F-21 | 并发/幂等 | `server/routes/resources/workgroup-routes.js:714-741`、`:763-795`、`:831-865` | 重复点击/超时重试会生成多条 `active` 工作组成员授权、多条同名任务/产出 | `POST /grants` 每次 `randomUUID` 新建；`POST /tasks`、`/outputs` 也只在客户端自带 id 时 409 | 同一人出现多条并存授权（撤销不干净）、任务/产出重复计数 | grants 按 `(workgroupId, personId, templateKey, permissionKeys)` upsert；tasks/outputs 接受客户端幂等键或按 `(workgroupId,title)` 去重 | **P2** |
| F-22 | 计算口径/重复实现 | `docs/src/services/governance/secretary-overview.js:174-178`；`docs/src/services/governance/today-summary.js:189-216`；`docs/src/services/governance/todo.js:601-620` | 同一「逾期待办数」在三处实现：两处 `deadline < today/dateKey` inline，一处 `isTodoExpired` | R2-48 只统一了「在办」判据，未把逾期判据全部收敛；`isTodoExpired` 还处理 completed/in_progress/expired 态 | 同一待办在不同页面可同时算「逾期」与「不逾期」（如 `in_progress`、无 deadline、边界当天） | 全部改调 `isTodoExpired`；补「三处同输入同输出」等价测试 | **P2** |
| F-23 | 计算口径/重复实现 | `server/routes/resources/branch-scope.js:18-42`；`docs/src/entries/tabs/party-committee/branches-tab.js:140-142`；`docs/src/services/member/roster.js:111-116` | 党委支部目录的「成员」列：API 无支部筛选时用服务端 `summary.memberCount`（按 users 行数），选中支部时用 `PersonStore.getMembers().filter(branch)`；「在册党员」另走 `getRosterStats` | 三套口径各自实现：服务端不过滤 transferOut/role，前端 roster 按 `developStage`+滞留，branches-tab 又混用 | 同一支部在不同筛选状态下人数跳变；移出成员仍计入 server/roster 计数 | 服务端提供唯一的 `branchSummary`（含 memberCount/partyMemberCount/expectedCount），前端只渲染不再本地算 | **P2** |
| F-24 | 计算口径/重复实现 | `docs/src/entries/tabs/prop/kanban-tab.js:33-34`；`docs/src/core/domain/domain.js:108-111` | 宣传看板把 `draft/pending_review/recruiting` 都算「待办专班」，把 `active` 单列；与 canonical `TASKFORCE_ACTIVE_STATUSES = recruiting/active` 不同 | 展示分组手写状态数组，未引用 `TASKFORCE_ACTIVE_STATUSES`/`isTaskforceActiveStatus` | 「在办专班数」在宣传台与支书概况/党委目录不一致；草稿虚增 | 分组显示可以保留，但「在办」计数必须引用 canonical 判据 | **P2** |
| F-25 | 权限一致性/越权读 | `server/routes/leader-progress.js:31-58` | 任一登录成员可传任意 `personIds`（同支部）查询他人的在办/超期/缺勤/考察待确认/汇报态 | 端点只 `requireAuth` + 支部校验，没有「仅组长查本组」或「本人查本人」判据；前端只在组长台调用 | 普通成员可枚举同支部成员的纪律与考察摘要 | 写门按 `actor.role==='leader'` 限定本组，普通成员只允许 `personIds=[self]` | **P2** |
| F-26 | 权限一致性/跨人写 | `server/routes/resources/semantic-routes.js:106-137` | 任一登录成员可 `POST /issue-unread` 给任意 `assigneeId` 写未读/已读；`GET /issue-unread` 可查任意人 | 端点注释自认「服务端只落不判定」；`requireAuth` 之外无判据 | 可清掉别人的红点、给别人塞未读；治理通知的「已读事实」不可信 | 写口校验 `assigneeId===actor.id`（派发场景由服务端在 issue 处置链内写），读口只返回本人（或支书终审位） | **P2** |
| F-27 | 可观测性/失败提示 | `docs/src/core/base/utils.js:87-98`、`:50-70` | 写失败统一显示「未保存成功，请稍后重试」，不显示服务端 403 原因/409 冲突集合/428 版本过旧 | `showToast` 的失败分支没有调用已有的 `describeWriteError(err)`；`_lastError` 被丢弃 | 用户无法区分「没权限」「被别人改了」「页面过期」，只能重复点击 | 失败分支改用 `describeWriteError(_lastError)`，并保留 `status` 供埋点；409 明确提示「先刷新」 | **P2** |
| F-28 | 可观测性/静默降级 | `docs/src/data/data-adapter.js:308-316` | 侧域（experienceDeposits/signups/reviews/...）拉取失败时回退本地备份继续渲染，仅 `console.warn` | 侧域失败被设计为「不阻断 init」，但没有页面级提示或数据新鲜度标记 | 用户把陈旧本地数据当服务器数据继续写；若随后保存，可能以旧值覆盖（部分受 409 保护） | 在页面壳层显示「部分数据未能从服务器加载」；写口在侧域未就绪时禁用并说明原因 | **P2** |
| F-29 | 可观测性/静默失败 | `server/routes/resources/index.js:358-360` | 邮件双通道 `afterResourceWrite(...).catch(() => {})` 完全吞异常，无日志 | 设计为 fire-and-forget，但连 `console.warn` 都没有 | 邮件长期失败无人发现；通知「已发送」不可核对 | 至少 `console.warn` + 结构化计数；失败落 `mail_failures` 或 system notice 供管理员查看 | **P3** |
| F-30 | 判据残留/false green | `server/routes/setup.js:54`；`deploy/package.mjs:75` | `demoAccounts` 与「发布包不得含演示姓名」均以 `/^p\d+$/` 判定名册；迁移后该正则永远不命中 | 判据写死旧 id 形态；迁移后学号是纯数字 | setup 面板「演示账号残留」恒 0（漏检）；发布包名单断言取不到姓名，变成空断言（假绿） | 判据改为「seed/people 的 id 集合」或 `studentId` 名单；迁移完成后删除旧形态正则 | **P2** |
| F-31 | 迁移风险/不可逆 | `server/db.js:558-567` | v7 在同一事务内直接改 `users` 主键与全库 JSON，无自动备份、无 dry-run、无回滚脚本 | 迁移机制只保证事务原子性，不保证「可恢复」；`deploy/backup.mjs` 未与迁移联动 | 迁移逻辑一旦有误（如 F-15/F-18），只能靠外部备份恢复；首次上线风险高 | 迁移前自动 `VACUUM INTO` 快照并打印路径；提供 `--dry-run` 输出映射/冲突/影响行数 | **P2** |
| F-32 | 文档真值 | `README-server.md:47`、`:97`；`server/seed-baseline.js:15` 注释 | 文档仍写「id 为 p1…p50、p_pc」「p_pc：role party-staff」 | 迁移批未同步文档 | 运维按文档排查会找错主键；新人误以为 p* 仍是权威 | 迁移完成后统一改为「id=学号/工号」，保留「旧 p* 仅迁移别名」一句 | **P3** |
| F-33 | 迁移风险/误改自由文本 | `server/db.js:495-504` | `transform()` 对所有字符串做「整值等于旧 id 就替换」，包括备注/正文/标题等自由文本 | 迁移无法区分「引用字段」与「内容字段」；注释声称自由文本不动，但只对复合串成立 | 恰好等于 `p1`/`p13` 的正文/备注被改写（概率低，但属于不可逆内容篡改） | 改为按字段白名单迁移（personId/organizer/...）；自由文本只做 `mapLegacyIdInString` 且记录 diff 供复核 | **P3** |

## 三、迁移覆盖清单（v7：p* → 学号）

### 3.1 已覆盖（代码层，审计确认）

- `users.id` 主键 + `users.data.id`：`server/db.js:508-520`。
- 各 JSON 表的**行主键**复合串（`wgm-…-p13`、`p11:issue-002`、`wgg-…-p5`）：`server/db.js:482-493`、`:525-537`。
- JSON 行内的**值**（`personId` / `organizer` / `assignee` / `recordedBy` / `confirmedBy` / `returnedBy` / `createdBy` / `submittedBy` / `audiencePersons[]` / `reads[]` / `voterIds[]` / `personIds[]` / `_realPersonId` / `targetPersonId` / `authorizedBy` / `secretaryId` 等）：`server/db.js:495-504`（递归 value）。
- 关系表 `sessions.person_id`、`attachments.uploaded_by`：`server/db.js:539-552`。
- 前端登录别名与会话读时映射：`server/routes/auth.js:23-48`、`:112-115`；`docs/src/services/core/auth.js:368-380`、`:460-480`。

### 3.2 未覆盖 Top 10（按风险排序）

| # | 未覆盖项 | 位置/证据 | 风险 |
|---|---|---|---|
| 1 | **对象键** `agenda[].personStages`（`{p6:'发展对象'}`） | `server/db.js:495-504` 只递归 value；`docs/src/entries/tabs/secretary/agenda-form.js:58-63` | 迁移后逐人阶段查不到，议程「逐人结果」与晋级链路取不到 fromStage |
| 2 | **数字型人员 id**（历史 `audiencePersons` 出现数字、`reads` 可能混入数字） | `transform` 只处理 `typeof value==='string'`；历史日志见 `2026-09` 决策记录 `audiencePersons:17` | 数字受众/已读不迁移，定向通知失效或误广播 |
| 3 | **`p_<uuid>` 旧 IAAA 代理键** | `legacy-person-ids.js:67-69` 只识别 `p\d+`/`p_pc`；`server/routes/iaaa.js:164-167` 已改为学号，但旧库可能残留 | 旧代理键既不迁移也不进 unmapped 清单，静默违反「id=学号」 |
| 4 | **URL/深链中的旧 id**：`person.html?id=p13`、`thought-report.html?personId=p13`、`/leader/member-progress?personIds=p1,p2` | `docs/src/entries/pages/person-entry.js:72`；`docs/src/entries/pages/thought-report-entry.js:91`；`server/routes/leader-progress.js:37-40` | 书签/通知深链迁移后 404 或空档案；无 alias 解析 |
| 5 | **API 路径参数**：`/members/:id/*`、`/workgroups/:id/members/:personId` | `server/routes/member.js` 各 `:id`；`server/routes/resources/workgroup-routes.js:669-675` | 旧客户端/脚本仍用 p* 调用 → 404；无兼容层 |
| 6 | **本地整库** `workflowos_branch_db_v1` | `docs/src/data/mock-adapter.js:34`（只 import 未调用）、`:300-327` | 老缓存 p* 与新种子学号并存；mock/静态演示数据错乱 |
| 7 | **本地会话/账号键** `gsm1921-login-user`、`gsm1921-session-snap`、`gsm1921-accounts`、`gsm1921-members-overlay` | `auth.js` 已做读时映射，但 `mock-adapter` 未迁移持久化；`accounts.js:21`；`person.js:238` | 换标签/清 session 后回退到 p* 账号；名册覆盖层 upsert 主键错位 |
| 8 | **按人键空间** `gsm1921-pref-<personId>-*`（主题/字号/强调色/tab 顺序/学期提醒） | `docs/src/core/boot/theme.js:28`；`docs/src/services/core/preferences.js:21-24`；`docs/src/entries/tabs/today/today-tab.js:488` | 用户偏好全部丢失（迁移后按学号查不到旧键），需重新设置 |
| 9 | **本地队列/缓存** `gsm1921-issue-unread-<assigneeId>`、`gsm1921-attendance-appeals`、`gsm1921-inspection-appeals`、`gsm1921-member-confirmations`、`sop_org_os_auth_audit`、`gsm1921-issue-cache-v3`、`gsm1921-issue-drafts` | `issues.js:1099`；`attendance.js:305`；`inspection.js:403`；`member-confirmation.js:48`；`auth.js:319` | mock 形态下申诉/确认队列/审计留痕在人员 id 变化后成为孤儿；清缓存即丢 |
| 10 | **新库 baseline 与系统内建防护** `p_pc` | `server/seed-baseline.js:58`；`docs/src/services/member/person.js:740` | 新库永久生成 p_pc；整支部名单替换会删党委账号（见 F-13/F-14） |

### 3.3 其他应覆盖但当前未覆盖

- `notices.targetUrl` 内嵌的人员深链（如 `person.html?id=p*`）：`transform` 不吃 URL 语义，字符串内嵌 id 不会改写。
- `branches.config.configChangeHistory[].by` / `workforce.ownerId`：值会迁移（exact string），但**历史留痕是否应改写**需明确口径（建议保留原 id 并附 `migratedFrom`，不要篡改审计原文）。
- `workgroup_members.id` / `issue_unread.id`：v7 已处理，但**客户端 mockDB 缓存**中的同一复合 id 未迁移（与 #6 同因）。
- `users.data.studentId` 为空的历史行：v7 会判 `users.id≠studentId` 并抛错（`db.js:513-515`），而正确行为应是「用映射后的 id 回填 studentId」；需在迁移前做数据修复。
- `collection_versions` 无人员字段（无需迁移），但迁移后所有客户端本地 `_versions` 基线会全部过期 → 首轮写入 409；需在迁移公告中提示「刷新后重试」。

## 四、测试盲区清单（`npm run test:daily` 未覆盖）

| # | 盲区 | 现状证据 | 可能漏掉的缺陷 |
|---|---|---|---|
| T1 | **v7 存量库迁移** | `db-migration.test.mjs::M3` 当前红；无「有 users 行 + p* 引用」的真实升级用例 | F-01、F-15、F-18、F-31；本次实测已暴露 |
| T2 | **非支委成员对行级过滤集合的快照写** | `multi-user-write.test.mjs` 只用支书/组织委员（全量读），`pushAndPersist` 直接改 mockDB | F-02（普通成员写待办/思想汇报整表覆盖） |
| T3 | **API 形态逐人已读** | `notice-audience.test.mjs::N11/N12` 只跑 mock 形态 `NoticeStore.markRead`，不断言 `/snapshot` 写门 | F-03（`reads` 被 403） |
| T4 | **组长保存考勤** | 无「leader 登录 → 保存本组考勤 → 200」的 API 用例；`attendance-batch` 是纯函数 | F-04（组长 403） |
| T5 | **本地缓存迁移** | 无测试覆盖 `workflowos_branch_db_v1` / `gsm1921-pref-*` / `gsm1921-issue-unread-*` 的旧 id 迁移 | F-12 及迁移清单 #6-#9 |
| T6 | **移出成员读链** | 无「transferOut 后重新 init/GET /users 不应出现在名册/应到」用例 | F-08（刷新复活） |
| T7 | **通知/反馈受众边界** | 无「普通成员 GET /notices 不应拿到私信」「GET /issues 不应拿到内部汇报」用例 | F-06、F-07 |
| T8 | **fire-and-forget 失败路径** | 无故障注入（如语义端点 500/离线）后「成功提示不得出现」的测试 | F-09、F-10、F-17 |
| T9 | **party-staff 支部归属** | 无「党委未选支部时不得写 br-b1 工作组」用例 | F-11 |
| T10 | **未设门资源通用 CRUD** | 无「普通成员 PATCH/DELETE thoughtReports/tasks/todos 应 403」用例 | F-05 |
| T11 | **重复提交/幂等** | 无 grants/tasks/outputs 双击/重试用例；无 snapshot 超时重试用例 | F-20、F-21 |
| T12 | **口径等价** | 无「secretary-overview.overdueCount == today-summary.overdue == TodoStore 域 expiredCount」等价断言 | F-22、F-23、F-24 |
| T13 | **越权读** | 无普通成员调用 `/leader/member-progress`、`/issue-unread?assigneeId=他人` 的 403 用例 | F-25、F-26 |
| T14 | **迁移后判据残留** | 无「setup.demoAccounts / package.mjs 名单断言在学号形态下仍有效」用例 | F-30 |
| T15 | **失败提示可读性** | 无「403/409/428 时 toast 文案应包含原因」用例 | F-27 |

## 五、建议修复顺序

1. **先修 P0 阻断**：`server/db.js` 补 legacy map import；用「有 users 行的旧库」跑 M3；修好前不要在任何存量库上启动 v7。
2. **再修数据丢失**：`todos` / `thoughtReports` 改为语义端点（或服务端按 person 保留未见行）；同时修组长考勤（F-04）与通知 `reads`（F-03）。
3. **权限收口**：未设门资源 deny-by-default；`GET /notices` / `GET /issues` 按前端同一受众判据投影；`party-staff` 的 `ownBranch` 去回落；`transferOut` 读口统一过滤。
4. **迁移收尾**：补对象键/数字 id/`p_<uuid>`/URL/本地缓存；修 baseline `p_pc` 与 `person.js` 防护；迁移前自动备份 + dry-run + 冲突清单。
5. **最后补测试**：优先 T1-T5（迁移与两条数据丢失链路），再补 T6-T10 的权限/失败路径；把本次实测的 `db-migration` M3 红作为迁移批的准入红线。

---

**审计边界**：本报告只读审查，未修改任何业务代码；未执行 `npm run test:daily` 全量（避免与正在进行的迁移批互相干扰），只抽查了 `db-migration`、`activity-delete` 两件并如实记录读数。迁移批完成后建议按本报告 F-01/F-02/F-03/F-04 重跑一次并更新本文件状态。
