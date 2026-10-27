# 恢复分组胶囊与后端数据真相 Spec

## Why

两件事同时暴露了同一类问题：**声明存在 ≠ 实际生效**。

1. 分组胶囊在批次 512 只修了“可见性”，却把 8–9 月的**主题色 soft 底 + 3px 直角 + 600 字重**换成了中性灰 999px 胶囊。支书记忆中的“主题色小胶囊、没那么圆角”是准确的；当前实现偏离了准绳。
2. 后端数据主链路虽然以服务端为权威，但边界没有封死：登录仍先查本地账号层；api 形态下活动/考勤/考察/通知/报名/待办仍会回退 mock 种子，部分路径还会 `persist()` 把演示数据写进服务器；快照只覆盖 25 个域，其余域的本机写入可能“假成功”；种子缺 `branchId`、缺唯一约束、字段未登记，测试残留污染运行库。

本批目标分两层：**功能完善是初步目标（数据必须真的走 server、种子必须自洽）**；**功能好用是更高目标（浏览器只留美观偏好，业务读写可解释、可恢复、可切换正式轨道）**。

## What Changes

- **BREAKING**：分组胶囊恢复 8–9 月视觉语义——主题色 soft 底、主题 soft 深字、3px 直角、600 字重、0.5px 字距；保留批次 512 的“全宽可见 + 高度 ≥24px + 形状对比 ≥1.5:1”。为 `.tab-group-label` 立 SD-3（999px 胶囊）与 SD-36（非强调色）的明文例外。
- **BREAKING**：缓存边界改为“**美观本地 + 业务读缓存 + 写必服务端 ack**”。浏览器只允许长期保存主题/字号/强调色/页签顺序等纯展示偏好；业务读缓存必须带集合版本；任何业务写不得以本地 `persist()` 成功作为成功。
- **BREAKING**：api 形态禁止 mock 回退——`loadActivities / loadAttendanceRecords / loadInspectionRecords / NoticeStore.init / SignupStore.init / seedTodos` 在 api 形态不得返回或写入演示种子；空库必须显示空态，不得显示演示数据。
- **BREAKING**：登录改为服务端优先——有 server 时先 `POST /api/v1/auth/login`，成功才写本地登录态；本地账号层只用于静态托管或显式开发模式；后端失败必须可见，不得跳工作台。
- **BREAKING**：生产形态默认关闭前端演示回退；`APP_ENV=production` 未显式给 `SEED_FALLBACK` 时注入 `false`；生产库含演示种子行时默认拒绝启动，需 `ALLOW_DEMO_DATA=1` 才放行。
- **BREAKING**：演示数据窗口统一为 **2026-08-01–2026-11-30**；7 月及更早业务内容重排到 8–10 月，11 月补 2–3 场计划中活动；保留每种关键状态样本；旧库备份后用 `rebuild-demo` 重建，不逐表按日期 DELETE。
- **BREAKING**：测试残留与测试套件分层处理——保留 268 个自动化测试文件；清理运行库中的 `act-b31-* / att-b31-* / mk-b31-* / act-ce46b61e / todo_seed_7 / 测试通知 / 测试议题 / sessions / 孤儿 uploads`；`b3-1` 改为临时库；新增 `test:clean` 与外部写测试守卫。
- schema v12：补齐种子 `branchId`、唯一索引、`todos.branch_id` 维护、`contributions` 形状、考察人员 ∈ 工作组校验；清理死表/半死表。
- 新增 `DATA_SEED_CONTRACT`（必须种子 / 可派生 / 可交叉验证 / 展示专用）与 6–10 条 AI 可机检断言。
- 恢复脚本化、正式数据导入 dry-run、只读演练模式；文档与守卫同步。

## Impact

- Affected specs：`DESIGN_SYSTEM`（SD-3、SD-36、§12.3、新增 SD-47/SD-48）、`DATA_MODEL`（字段表、schema v12、种子契约指针）、`PRODUCT_IA`（缓存/数据形态说明）、`TERMINOLOGY`（新增「业务读缓存 / 写确认 / 演示窗口」）、`CASES`（新增胶囊与数据真相判例）。
- Affected code：
  - 胶囊：`docs/src/styles.css`、`docs/src/components/shell/tab-bar.js`、`server/test/ui-contrast-guard.test.mjs`、`server/test/ui-control-system-guard.test.mjs`
  - 缓存与登录：`docs/src/entries/pages/login-entry.js`、`docs/src/services/core/auth.js`、`accounts.js`、`docs/src/data/data-adapter.js`、`pending-writes.js`
  - mock 回退：`docs/src/services/activity/{activity,attendance,inspection,signup}.js`、`docs/src/services/governance/{notice,todo}.js`
  - schema/种子：`server/db.js`、`server/seed.js`、`server/seed-manifest.js`、`docs/src/data/mock/*.js`、`docs/src/data/derive.js`
  - 测试隔离：`server/test/form-loop-sweep.test.mjs` 的 `b3-1` 段、`server/scripts/cleanup.mjs`、`server/package.json`、`server/test-tier-registry.mjs`
  - 生产轨道：`server/app.js`、`server/server.js`、`docs/src/config/deploy.js`、`server/scripts/{rebuild-demo,backup,restore,import-branch}.mjs`
  - 守卫：`ui-contrast-guard`、`ui-control-system-guard`、`localstorage-key-guard`、`db-integrity-guard`、`seed-drift`、新增 `seed-contract-guard`、`test-isolation-guard`（新增 ≤2 个）

## ADDED Requirements

### Requirement: 分组胶囊恢复 8–9 月视觉语义
系统 SHALL 让 `.tab-group-label` 使用主题色 soft 底与主题 soft 深字、3px 直角、600 字重、0.5px 字距；保留全宽可见、高度 ≥24px、形状对比 ≥1.5:1；不得使用 `color-mix()` / `rgba(主题色)` 生成主题色。

#### Scenario: 支书台 1440
- **WHEN** 打开支书台
- **THEN** 分组名是主题色底、深主题字、3px 直角的小胶囊，不是中性灰 999px 胶囊

#### Scenario: 暗色主题
- **WHEN** 切换暗色主题
- **THEN** 胶囊取暗色 soft 三件套，文字对比 ≥4.5:1，形状仍可辨

#### Scenario: 390 手机
- **WHEN** 在 390px 打开
- **THEN** 组名仍可见，只缩小内边距，页签条可横向滑动

### Requirement: 浏览器缓存边界
系统 SHALL 只把纯展示偏好长期保存在浏览器；业务读缓存 SHALL 带集合版本；业务写 SHALL 以服务端 2xx 为成功，禁止本地-only 成功。

#### Scenario: 清缓存后业务仍在
- **WHEN** 用户清空 localStorage 后重新登录
- **THEN** 业务数据从服务端恢复；只有主题/字号/强调色/页签顺序回默认

#### Scenario: 断网写入
- **WHEN** 断网后保存通知/考勤
- **THEN** 不得提示“保存成功”；进入 outbox 并明确显示“未同步”，恢复网络后可重试或放弃

### Requirement: api 形态禁止 mock 回退
系统 SHALL 在 `getDataSource()==='api'` 时禁止服务层返回演示种子；空库显示空态；`SEED_FALLBACK` 只允许在 mock/显式演示模式生效。

#### Scenario: 生产空库
- **WHEN** 生产形态空库启动并访问六个工作台
- **THEN** `activities/attendances/inspections/notices/signups/todos` 计数保持 0，页面不出现种子 id

#### Scenario: 演示形态
- **WHEN** mock 形态或显式 `SEED_FALLBACK=1`
- **THEN** 演示数据可见，但不得写入服务器

### Requirement: 登录服务端优先
系统 SHALL 在有 server 时先请求 `/api/v1/auth/login`；成功后才写本地登录态；本地账号层只允许静态托管或显式开发模式。

#### Scenario: 真实账号登录
- **WHEN** 使用者输入服务端存在的真实账号
- **THEN** 登录成功并进入 `{source:'api', hasToken:true}`

#### Scenario: 后端失败
- **WHEN** 后端拒绝或不可达
- **THEN** 显示错误并停留在登录页，不跳工作台

### Requirement: 写入成功必须可证
系统 SHALL 让每次业务写至少满足一项：服务端行存在、快照请求被观察到、语义端点 2xx；目标集合不在快照覆盖内时必须走语义端点或明确失败。

#### Scenario: 非快照域写入
- **WHEN** 修改 `committeeBroadcasts / agendaVotes / memberChangeRequests` 的标注
- **THEN** 清缓存重登后标注仍在

#### Scenario: 快照缺版本
- **WHEN** 快照 payload 含集合但缺 `_versions`
- **THEN** 服务端 428，前端显示失败并重拉，不静默成功

### Requirement: 种子契约
系统 SHALL 建立 `DATA_SEED_CONTRACT`，把字段分为必须种子、可派生、可交叉验证、展示专用四类，并用可机检断言守住。

#### Scenario: 支部归属
- **WHEN** 播种活动/考勤/考察/归档/宣传/交接
- **THEN** 每行都有有效 `branchId`，且与所属支部一致

#### Scenario: 唯一性
- **WHEN** 重复写入同一 `(activityId, personId)` 考勤
- **THEN** 数据库唯一索引拒绝，而不是只在 JS 层查重

#### Scenario: 考察人员
- **WHEN** 写入考察记录
- **THEN** `personId` 必须是父工作组成员；否则拒绝并给出可读原因

### Requirement: schema v12 数据一致性
系统 SHALL 用 v12 迁移补齐唯一索引与 `todos.branch_id` 维护；统一 `contributions` 为对象数组；清理 `issue_reveals` 与 `committee_broadcasts` 的死表/半死表状态。

#### Scenario: todos 支部下推
- **WHEN** 按支部查询待办
- **THEN** `todos.branch_id` 与 JSON 内 `branchId` 一致，查询命中索引

#### Scenario: 影子表比对
- **WHEN** 重建 `taskforce_contributions`
- **THEN** 不再出现 `$."0"` 字符键，字符串 contributions 被规范为 `{desc, by, at}`

### Requirement: 四个月演示窗口
系统 SHALL 把演示窗口统一为 `2026-08-01–2026-11-30`；每月至少有一场活动；11 月活动为 `draft/published` 计划态；保留每种关键状态至少一条样本。

#### Scenario: 月份覆盖
- **WHEN** 打开日历 8/9/10/11 月
- **THEN** 每个月都有活动；11 月不出现已完成考勤/复盘

#### Scenario: 状态覆盖
- **WHEN** 查看复盘、考勤、专班、宣传
- **THEN** 复盘五态、考勤 present/leave/absent/made_up、专班 active/completed/dissolved 至少各一条

### Requirement: 测试残留与测试套件分层
系统 SHALL 保留自动化测试套件；清理运行库测试残留；外部写测试必须使用临时库或在 `finally` 清理；新增 `test:clean` 与 `test:full:safe`。

#### Scenario: 失败也不留残留
- **WHEN** `b3-1` 用例中途失败
- **THEN** 临时库/上传文件仍被清理，`server/data.db` 无测试行

#### Scenario: 残留清扫
- **WHEN** 运行 `npm run test:clean`
- **THEN** `act-b31-* / att-b31-* / mk-b31-* / todo_seed_7 / 测试通知 / 测试议题 / sessions / 孤儿 uploads` 被清理，真实业务行不动

### Requirement: 正式数据轨道
系统 SHALL 提供“生产默认无演示数据 + 空库基线 + 导入 dry-run + 恢复脚本 + 只读演练”的切换路径。

#### Scenario: 生产启动
- **WHEN** `APP_ENV=production` 且未设 `SEED_FALLBACK`
- **THEN** 前端演示回退为 false；库内含演示种子时启动拒绝，除非 `ALLOW_DEMO_DATA=1`

#### Scenario: 只读演练
- **WHEN** 用生产库副本启动只读演练
- **THEN** 所有写口返回 403/只读提示，页面仍可完整浏览

## MODIFIED Requirements

### Requirement: 分组胶囊
`.tab-group-label` 从“中性 999px 胶囊”改为“主题 soft 底 + 3px 直角 + 600 字重”；高度仍 ≥24px，全宽可见，形状对比由描边承担。

### Requirement: 缓存
`workflowos_branch_db_v1` 在 api 形态降级为只读缓存，不再作为权威；业务读缓存必须带集合版本；纯展示偏好键保留。

### Requirement: 登录
登录从“本地账号层前置”改为“服务端优先”；本地账号层保留为静态/开发模式兼容。

### Requirement: 种子
活动/考勤/考察/归档/宣传/外发/交接/确认/审计种子补齐 `branchId`；`todos.branch_id` 自动维护；`contributions` 统一对象。

### Requirement: 守卫口径
`ui-contrast-guard` 改为断言主题 soft token + 对比度；`ui-control-system-guard` 断言 3px 与主题底；新增 `seed-contract-guard` 与 `test-isolation-guard`；`localstorage-key-guard` 增加四类归档。

## REMOVED Requirements

### Requirement: 分组胶囊中性灰 999px
**Reason**：偏离 8–9 月准绳，支书明确“主题色、小胶囊、没那么圆角”。
**Migration**：改用 `--app-accent-soft-*` + 3px；保留可见性与 24px。

### Requirement: api 形态空表回退演示种子
**Reason**：演示数据会出现在真实界面，并可能被 `persist()` 写进服务器。
**Migration**：api 形态返回空态；演示只在 mock/显式 `SEED_FALLBACK`。

### Requirement: 本地 `persist()` 成功即业务成功
**Reason**：非快照域不会发请求，形成假保存。
**Migration**：写成功必须可证（服务端行/快照请求/语义端点 2xx）。

### Requirement: 按日期 DELETE 旧演示数据
**Reason**：会破坏跨期实体与状态样本，且运行库已有测试残留。
**Migration**：重排种子 + `rebuild-demo` 重建替换；旧库先备份。
