# 收口现行十项专项（批次 500）Spec

## Why

支书要求「全局考虑，一推到底，不要分批」：不再把 B-499-1…10 拆成多轮，而是在一个 spec 内完成功能修正、数据真值、测试分层、审查与收口。

本 spec 同时修正两条口径：

1. 内部汇报受众以支书原话为准：**支委层＋当事人＋该工作组组织者＋汇报人所在党小组组长**；汇报要尽可能由**组织者汇总工作组、党小组组长汇总党小组**。
2. mock 不得削足适履：mock / seed / adapter 必须呈现真实 API 结构，结构以 API 与数据模型为准。

## Sample-diff（本轮学习）

- **ai_assumption**：十项专项可以按“一个专项一批”逐轮推进，每批只报本批读数。
- **human_intent**：十项要在一轮内全局收口，专项之间共享的判据、测试与文档必须一起改；不要用分批掩盖跨专项依赖。
- **divergence_type**：scope_narrowing（把全局收口缩成单专项批次）。
- **generalization（Boolean）**：IF 用户明确要求「不要分批」THEN 一个 spec 覆盖全部在办专项，批次只作为提交单位，不作为交付单位。
- **evidence**：支书 2026-10-21「请全局考虑，一推到底！不要分批！」；CLAUDE.md 乙部 B-499-1…10。

- **ai_assumption**：daily test 精简可以靠删测试或放宽守卫。
- **human_intent**：抓主要矛盾与关键 probe，重活移到 precommit，覆盖不能丢。
- **divergence_type**：priority_inversion（把“跑得快”置于“安全覆盖”之上）。
- **generalization（Boolean）**：IF 测试移出 daily THEN 必须移入 precommit/weekly 并给出覆盖来源；不得静默删除。
- **evidence**：支书答复「约 4 分钟，重活移 precommit」。

## What Changes

- **B-499-3 跨角色派生待办**：待办生成端按「到人」归属收敛，`visitor` 聚合键不再写成跨角色行；通知已读销项只销本人/本角色；同一次 flush 不再因他人行 403 把成功提示打成失败。
- **B-499-2 汇报受众与汇总**：受众改为支委层＋当事人＋工作组组织者＋党小组组长；新增按工作组 / 按党小组的只读汇总面，复用既有收件箱组件。
- **B-499-4 mock↔API 结构真值**：建立可重跑的全集合结构对照，修 mock/seed/adapter；客户端投影字段进白名单并写理由。
- **B-499-5 daily test 分层**：daily 收敛到约 4 分钟；page-sweep / form-loop 全量 / 纯视觉审计移入 precommit；新增分层登记与预算守卫。
- **B-499-6 第五轮脏乱繁审查**：功能改造完成后三路并行只读审查；共识项本轮直接修，分歧列待裁定。
- **B-499-7 IA 剩余项**：收口 R3-08/11/12/14/15/17/18/21/25/27/29、F10 与三条链接/状态真值；账实对齐。
- **B-499-8 数据生命周期（安全模式）**：seed 行漂移检测与「只修既有 seed id」幂等修复；cleanup 默认 dry-run，只清孤儿附件与旧备份；备份清单与演示库重建脚本。
- **B-499-9 任命事务化**：任命与支委配置改为服务端单事务语义端点；前端一次调用；失败不留半写。
- **B-499-10 宽表卡式化**：关系矩阵族、纪检考勤汇总、成员流动台账在 ≤640px 提供堆叠卡片；补静态与 390px 真机守卫。
- **B-499-1 跨组活动余项**：补一条跨组活动创建 / 协调的聚焦 probe，清理残留文档漂移后关闭该专项。

## Impact

- Affected specs：`round5-dirty-audit-and-truth-baseline`（本 spec 吸收其 Task 1/4/5/6/7）、`audit-round3-modals-and-ia`（本轮并入 IA 余项，旧 spec 仅作历史）、`report-parent-and-issue-projection`（受众口径再次修正）、`assign-cross-group-activity-to-party-group`（B-499-1 余项）。
- Affected code：`docs/src/services/governance/{todo,notice,issues}.js`、`docs/src/core/domain/issue-visibility.js`、`docs/src/components/record/report-inbox.js`、`docs/src/components/governance/{issue-dispatch-view,work-overview}.js`、`docs/src/components/ui/{relation-matrix,data-table}.js`、`docs/src/data/{mock-adapter,api-adapter,data-adapter}.js`、`docs/src/data/seed-manifest.js`（新增）、`docs/src/services/branch/appointment.js`、`server/routes/resources/*`、`server/routes/member.js`、`server/db.js`、`server/seed.js`、`server/scripts/{backup,cleanup,rebuild-demo}.mjs`、`server/test/**`。
- Affected docs：`SECRETARY_DIRECTIVES.md`、`DATA_MODEL.md`、`DESIGN_SYSTEM.md`、`PARALLEL_SKILL_AUDIT.md`、`TEST_AND_VERIFICATION.md`、`README-server.md`、`CLAUDE.md`、`.ctx/ENGINEERING_ASSESSMENT.md`。

## ADDED Requirements

### Requirement: 跨角色派生待办安全

待办生成 SHALL 按「到人」归属；任何页面不得为其他角色 / 其他成员生成可写入的待办行。

#### Scenario: 访客派生
- **WHEN** 普通成员打开访客台 / 待办页
- **THEN** 派生出的通知、活动、专班待办均带本人 `personId`；不得生成 `role:'visitor'` 且无 `personId` 的行

#### Scenario: 种子待办
- **WHEN** 普通成员或组长在 API 形态加载
- **THEN** 客户端不得补入其他角色的种子待办；服务端已有种子行保持只读

#### Scenario: 通知销项
- **WHEN** 任一角色点开通知标记已读
- **THEN** 只销本人或本角色的通知待办，不得改动其他角色 / 其他人的待办

#### Scenario: 成功提示
- **WHEN** 同一次 flush 中一行待办被服务端拒绝
- **THEN** 不得把同批合法写入的成功提示打成「未保存成功」；拒绝原因可见且可定位

### Requirement: 汇报受众与组织汇总

内部汇报 SHALL 按组织关系可见与汇总，同时保证支委层知情权。

#### Scenario: 支委层
- **WHEN** 查看者为支书 / 副支书 / 组织 / 宣传 / 纪检委员
- **THEN** 可读本支部全部内部汇报

#### Scenario: 工作组组织者
- **WHEN** 查看者为该汇报所挂活动 / 专班的组织者
- **THEN** 可读该工作组下全部汇报，并在活动 / 专班上下文看到本组汇总

#### Scenario: 党小组组长
- **WHEN** 查看者为汇报人所在党小组的组长
- **THEN** 可读本组成员提交的汇报，并在组长台看到本组汇总

#### Scenario: 当事人与无关成员
- **WHEN** 查看者为汇报人 / 被请求人 / 被指派人
- **THEN** 可读该条；既非支委层、也非上述角色者，列表与直连接口均读不到

### Requirement: mock 与 API 结构同构

mock / seed / adapter SHALL 以服务端 API 与数据模型为准，不得为演示数据削弱 API。

#### Scenario: 全集合对照
- **WHEN** 运行结构对照
- **THEN** 每个有种子源的表逐字段比对字段集合与类型，输出多出 / 缺失 / 类型不符

#### Scenario: 白名单
- **WHEN** 客户端确有投影字段（如按人的 `read`）
- **THEN** 进入白名单并写理由；白名单外的漂移即失败

### Requirement: seed 行漂移与生命周期（安全模式）

既有 seed 行 SHALL 可检测、可幂等修复；清理 SHALL 默认只读。

#### Scenario: 旧库升级
- **WHEN** 既有库中的 seed 行落后于当前 `SEED_*`
- **THEN** 只更新既有 seed id 的种子自有字段，保留运行时字段；不新增、不删除用户数据

#### Scenario: 清理
- **WHEN** 运行 cleanup
- **THEN** 默认 dry-run，只报告孤儿附件、悬空附件与过期备份；`--apply` 也只删确认项，不自动删业务记录

#### Scenario: 演示库重建
- **WHEN** 运行 rebuild-demo
- **THEN** 生产环境拒绝 demo；输出库带 `seed_meta(mode, seed_version)`；不得触碰生产库、附件与备份目录

### Requirement: 测试分层与预算

daily SHALL 只保留关键 probe，重活移入 precommit / weekly。

#### Scenario: 预算
- **WHEN** 运行 `test:daily`
- **THEN** 墙钟时间 ≤ 约 4 分钟；文件与断言数不高于登记预算

#### Scenario: 移出不丢覆盖
- **WHEN** 任一文件移出 daily
- **THEN** 登记移入层与覆盖来源；不得静默删除

### Requirement: 第五轮脏乱繁审查

审查 SHALL 在功能改造完成后按 H21 执行：三路 lens、各一 skill、不互读。

#### Scenario: 汇总与修复
- **WHEN** 三路报告完成
- **THEN** 主代理输出共识 / 分歧 / 待裁定；共识项本轮直接修，分歧列待裁定；报告归档 `.ctx/logs/archive/2026-10/`

### Requirement: IA 剩余项与链接真值

R3 未闭环项 SHALL 在本轮收口；链接落点与页签映射必须真实可达。

#### Scenario: 共享件
- **WHEN** 查看「我的处置」
- **THEN** 顶层为两段、非四段；渲染时不得整批标已读；令牌说明移入 help

#### Scenario: 文案
- **WHEN** 检查 R3-15/17/18/21/27/12
- **THEN** 对应冗余文案零命中，并纳入既有文案守卫

#### Scenario: 链接
- **WHEN** 打开 `activity.html?activityId=x`、思想汇报「完整记录」、组长待办 `review`
- **THEN** 均落到真实对象 / 真实页签，不得死映射或落到错误列表

### Requirement: 任命事务化

任命与支委配置 SHALL 在服务端单事务内完成。

#### Scenario: 支书任命
- **WHEN** 党委任命 / 撤换支书
- **THEN** 支部 `secretaryId`、双方 `users.role`、任期记录封口与新建在同一事务；任一步失败整体回滚

#### Scenario: 并发
- **WHEN** 两个会话同时任命且携带同一 `expectedSecretaryId`
- **THEN** 一个成功、一个 409；库内每支部至多一条未封口任期记录

#### Scenario: 支委配置
- **WHEN** 支书 / 副支书配置或撤销支委身份
- **THEN** `users.role` 与 `auth_audit` 同事务写入；审计失败不得留下无审计的角色变更

### Requirement: 宽表窄屏承载

宽表 SHALL 在 ≤640px 提供堆叠卡片或表内滚动，页面主体不得横向溢出。

#### Scenario: 关系矩阵
- **WHEN** 390px 查看考勤矩阵 / 考察总表 / 专班报名 / 支部分工 / 表态汇总
- **THEN** 按人 / 按项目显示堆叠卡片；保留转置、分页、`—`、状态与下钻

#### Scenario: 固定宽表
- **WHEN** 390px 查看纪检考勤汇总、成员流动台账
- **THEN** 每条记录显示带字段标签的卡片，操作按钮不丢

## MODIFIED Requirements

### Requirement: 内部汇报可见面（批次 498 / round5）

由「支书层＋当事人」改为「支委层＋当事人＋该工作组组织者＋汇报人所在党小组组长」；前端与服务端继续共用同一判据。

### Requirement: 工作台承载与文案

「我的处置」四段收为两段；条线表动作列并入「待处理」；浮窗设置链统一短文案；窄屏表格与矩阵按 §4.20 的响应式形态处理，并同步修正设计系统中已漂移的条目。

## REMOVED Requirements

### Requirement: 客户端替其他角色派生待办

**Reason**：与服务端行级写门冲突，导致合法写入被连带 403。
**Migration**：待办生成端补 `personId`、种子按当前角色过滤、销项按本人/本角色收敛；历史 `visitor` 无主行只读忽略。

### Requirement: 以 mock 现状反推 API

**Reason**：会导致结构漂移与演示数据绑架真实模型。
**Migration**：以 API / 数据模型为权威修 mock 与 seed；保留字段进白名单并写理由。
