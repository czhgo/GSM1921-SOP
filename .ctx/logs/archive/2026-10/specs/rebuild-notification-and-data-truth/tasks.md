# Tasks

> 边界：本批是**结构修复**，不是换皮。顺序不可倒：先把「事实」立住，再修「落点」，最后做「视觉」。
> 并行边界：Task 1（数据）与 Task 4（视觉）文件不重叠，可并行；Task 2/3 依赖 Task 1 的派生函数；Task 5 依赖 Task 1 的工作组镜像；Task 6 最后。

- [x] Task 1: mock 事实化（只存事实，其余派生）
  - [x] SubTask 1.1 产出「事实 / 派生」矩阵（写进 `content/04_web_design/data/DATA_MODEL.md`）：逐字段标注 `fact` / `derived` / `snapshot`，派生项写清输入与函数名。
  - [x] SubTask 1.2 重写 `docs/src/data/mock/**`：删除 `activities.status/archived`、`activityReviews.progress/overdue`、`inspection` 批量改写、`taskforces.status`、`notices.expireDate`、`archiveRecords.status/activityName`、考勤行内 `studentId/developStage/partyGroup` 快照；只留身份、组织、活动基础字段、任务完成、参会、表决、确认动作、报名。
  - [x] SubTask 1.3 新增派生器（单文件、纯函数优先）：`deriveActivityStatus(activity, facts, now)`（待召开 / 进行中 / 已召开 / 已归档）、`deriveReviewProgress`、`deriveTaskforceStatus`、`deriveArchiveState`、`deriveNoticeExpiry`、`deriveWorkgroupMirror`；hydrate 时一次性重建派生集合，**幂等**。
  - [x] SubTask 1.4 同步 `seed-manifest.js`（派生字段移入 `runtimeFields`）、`server/seed.js` 与基线（`seed-baseline` / `seed-drift` / `mock-api-parity-*`），保证 mock 与 API 同构。
  - [x] SubTask 1.5 举证「改一条事实，全站跟随」：改活动日期（过去→未来）后，活动状态、复盘超期、归档缺口、相关待办同一次刷新全部变；把结果写进执行日志。

- [x] Task 2: 状态、归档、待办单一源
  - [x] SubTask 2.1 删除 `committee-meeting-tab.js` 的 `meetingStatus()` 四态，改用 Task 1 的 `deriveActivityStatus`；「应到」优先读冻结名单（`attendanceRosters`），无冻结时回落现算并在行内标注「实时」。
  - [x] SubTask 2.2 归档单一事实：`activities.archived` 与 `archiveRecords` 同事务/同派生；归档动作幂等；已归档活动的通知一并归档（`archiveBySource` 接入 `BranchService.archiveActivity` 与服务端 `/activities/:id/archive`）。
  - [x] SubTask 2.3 归档待办改阶段：由「活动结束 → 待归档」生成、归档动作销项；删除归档完成后新增待办的路径；历史滞留条目一次性作废并登记。
  - [x] SubTask 2.4 待办幂等键：`sourceType + sourceId + action` 唯一；`NoticeTodoDeriver` 与催办路径复用；连续催办只增通知、不增待办。

- [x] Task 3: 统一消息中心（列表 + 全貌 + 逐人状态）
  - [x] SubTask 3.1 消息对象模型：`kind`（`announcement` | `system` | `message`）、`targetType/targetId`、`reads[]`、`archivedBy[]`（用户归档，可恢复）、`archived`（系统归档）、`expireDate`；私信沿用 `replyTo` 成线程；给出 `kindOf()` 迁移函数（`noticeType==='message'` → message；系统事件 → system；其余 → announcement）。
  - [x] SubTask 3.2 消息中心列表：`messages.html` 升级为「消息」，单一时间流 + `全部 / 未读 / 已读 / 已归档` × 来源（公告 / 系统 / 私信）筛选 + 搜索 + 分页 + 行内归档/恢复；侧栏改名「消息」并挂未读角标。
  - [x] SubTask 3.3 统一详情：`notice.html` 升级为「消息详情」，按 `kind` 渲染公告 / 系统（对象卡 + 唯一动作）/ 私信（线程 + 回复）；所有入口统一 `notice.html?id=`，删除 header / 首页 / 待办的 `direct` 直跳与 `resolveNoticeUrl` 页面级兜底。
  - [x] SubTask 3.4 已读与回执分离：进入详情即已读；「确认收到 / 线上参加」作为业务回执独立渲染、不因已读隐藏；导航前不再预写已读。
  - [x] SubTask 3.5 入口收口：铃铛下拉全量可滚动（取消 10 条裁剪）、底部「查看全部」进消息中心未读；首页通知卡「查看更多」同指；补「全部已读」入口或删除无调用方的 `markAllRead`。
  - [x] SubTask 3.6 归档页退役：删除 `archive.html?tab=notice`，`?tab=notice` 重定向到 `messages.html?filter=archived`；归档页只留活动、专班；相关守卫与文档同步。
  - [x] SubTask 3.7 发布与数据迁移：发布表单强制「关联对象 / 公告」；`meetingActivityId` 并入坐标；种子与系统通知模板逐条补 `kind` 与坐标，无对象标 `announcement`；服务端 `notices` 投影补 `archivedBy`。

- [x] Task 4: 工作台视觉与卡内构成（含 50 批前经验）
  - [x] SubTask 4.1 页签分组小胶囊：恢复可见胶囊（12px、中性底、无 hover、`role="presentation"`、不进入 tab 序列）；分组名统一为「总览 / 我的职责 / 协作与知情 / 制度与答复」，消除「知情查看」组名＝页签名；≤1280px 只隐藏文字、保留分隔。
  - [x] SubTask 4.2 卡头单一源：抽 `renderCardHeader({title, meta, actions})`；一个 tab 只一个 H2；卡头 H3 必须带范围信息；删除 6 处 H2=H3 逐字重复（名册 / 人才库 / 宣传任务 / 成员流动 / 反馈管理 / 本组活动）。
  - [x] SubTask 4.3 卡内构成规则落地：说明后置、同口径指标只出现一次、主对象先于解释；左右分布＝标题左、计数/动作右；正文与长文本居左，短元信息可右对齐；11px 正文/元信息清零（支书待办 13 处、组织名册 8 处）。
  - [x] SubTask 4.4 工作关系表改主从两栏：左列 14 个模块（模块名 + 责任人），右列责任角色、责任说明、停用/启用操作；删「操作」空列、删「每行读法」、取消分页；顶栏说明只留一句。
  - [x] SubTask 4.5 工作台壳一致：六台与党委台统一页头结构（H2 一处、删除重复「← 返回主页」），把党委台批次 464 的做法推广。

- [x] Task 5: 知情查看补齐活动工作组
  - [x] SubTask 5.1 新增 `components/record/workgroup-view.js`：只读列表（工作组名 / 所属活动 / 负责人 / 成员数 / 状态），点击进活动详情；空态一句状态 + 一个下一步。
  - [x] SubTask 5.2 `insight-view.js` 段集合扩展为 `workgroup | taskforce | group`，删除「活动一览」在本页的重复：支书/组织/宣传/纪检/成员 用 `workgroup + taskforce`，组长加 `group`。
  - [x] SubTask 5.3 深链兼容：`highlightWorkgroupId` / 既有 `activityId` 映射到工作组段；定位失败给可见提示。

- [x] Task 6: 守卫、判例与验证
  - [x] SubTask 6.1 守卫以**扩展**为主，新增 ≤2：`notice-deeplink-guard` 加「公告/系统必须有坐标」「所有入口先经详情页」「无 direct 直跳」；`notice-audience` / `notice-message` 加「归档按人」「已读≠回执」；`state-enum-guard` 扩到活动/消息；`mock-api-parity-structure` 加「mock 不得含派生字段」；`ui-control-system-guard` 加卡头单一源与小胶囊；`docs-governance-guard` 加「一 tab 一 H2」。
  - [x] SubTask 6.2 规范与判例：`DESIGN_SYSTEM` 增「卡内构成」「页签分组胶囊」判据；`CASES.md` 增 SD-33…（通知落点、状态双链、归档倒序、主从两栏）；`REVIEW_QUESTION_SET` 若出现新缺陷类型则加编号。
  - [x] SubTask 6.3 sample-diff：把本轮 8 条反馈 → 规则，逐条写「样本 / 根因 / 规则 / 守卫」四列，落执行日志与判例库。
  - [x] SubTask 6.4 验证三通道：定向（相关守卫）→ `npm run test:daily` → `SWEEP_SHARD=all`；版本戳 bump；中文提交（不 push）。

# Task Dependencies

- Task 2/3/5 依赖 Task 1 的派生函数与事实化种子；Task 1 未完成前不得改状态判定。
- Task 4 与 Task 1 文件不重叠，可并行；但 Task 4.1 的分组改名要与 `doc-consistency::S3` 同批改，避免中间态红。
- Task 5 依赖 Task 1 的工作组镜像；Task 6 最后写，避免断言重复。
- 每完成一个 Task 必须跑一次对应定向守卫；任何 Task 不得以「全量最后一起跑」代替定向。
