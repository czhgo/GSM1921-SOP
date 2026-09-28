# 变更日志（Changelog）

> 本仓遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 的体例与[语义化版本](https://semver.org/lang/zh-CN/)的编号。
> **记什么**：只记「**对使用者 / 换壳部署者可见的变更**」（新增能力、行为变更、修复、移除、安全）。
> **不记什么**：批次的执行过程与逐批沿革——那是 `.ctx/logs/YYYY-MM-EXECUTION_LOG.md` 的职责（见 `CLAUDE.md` `R-84` / `R-86` / `R-89`：**决议进决策日志、过程进执行日志、台账备注只写现状**）。
> **本文件的起点**：**首次语义化发版（`0.1.0`）**。此前的沿革不在本文件补记（无 tag 可回溯 ⇒ 补记即编造），一律指向 `.ctx/logs/**`。
> **怎么发版**：`node docs/scripts/release.mjs`（默认**预演**，只打印推导结果与动作清单；加 `--apply` 才落盘并打 tag）。判据常驻 = `server/test/version-stamp.test.mjs::S7`。

## [Unreleased]

### Added

- （暂无）

## [0.1.0] - 2026-09-28

> 首次语义化发版：把「制度即代码」的党支部内部系统盘点到一处。下列条目均可回溯到 `.ctx/logs/**` 的对应批次。

### Added

- **制度即代码的骨架**：`content/` 存制度母本（战略 / 制度 / 文档体系 / 网页设计 / AI 编码纪律），`docs/` 为同源可运行前端（多页应用 + 原生 ESM，无构建步骤），`server/` 为 Express + SQLite 一体化后端（同源托管 `/api/v1` 与静态资源）。
- **两种部署形态一套代码**：`server`（有后端、可登录、数据落库）与 `static`（纯静态托管）由 `docs/src/config/deploy.js::DEPLOY_MODE` 一处切换；**静态/无 API 会话形态 = 只读演示**（`DEMO_READONLY`，写操作显式失败并提示「需要连接服务器」，不再把数据写进浏览器本地）。
- **模板型交付（换壳）**：根 README 的「30 分钟换壳指南」＋换组织向导（`wizard.html`）＋演示数据一键重置（`?reset=1`）；示例组织（50 人支部）可整体替换。
- **配置即组合**：`config.modules` / `config.blocks` / `config.workforce` 控制工作台与产出块的启停、排序、分工；配置写入有审计留痕与单键回滚。
- **语义端点域**：三委数据交接 / 成员变更确认队列 / 批次里程碑 / 申诉队列 / 反馈未读标记 / 授权审计留痕六组端点**服务端为权威**（不再依赖浏览器本地存储）。
- **可观测与可核**：`GET /api/v1/snapshot/versions` 集合版本基线 + 快照写穿乐观锁（同集合双写 409）；前端低频远端变更探测（多标签 `BroadcastChannel` 唤醒、跨设备按周期）。
- **运维三件**：版本化数据库迁移（`PRAGMA user_version` + 有序 `MIGRATIONS`）、`db.backup()` 在线备份与恢复演练、启动自检（库内演示账号计数）。
- **守卫生态（本仓的“测试即制度”）**：`server/test/` 常驻守卫覆盖文档口径、台账一致性、版本戳、单一源、链接、权限门、数据同源、无障碍/美学存量、真机页面普查与表单闭环等；`npm run test:daily` 为日常档，`npm run test:precommit` 含两个真机普查。

### Changed

- **服务端按内聚切分**：`server/routes/resources.js`（1301 行单文件）→ `server/routes/resources/` 六件（装配 / 写门 / 批准门 / 快照版本协议 / 表访问原语 / 语义端点）；逐字搬迁、口径零改写。
- **前端物理目录分层**：`services/` → `core`·`member`·`activity`·`governance`·`branch` 5 域；`components/` → `ui`·`shell`·`feedback`·`record`·`governance`·`dashboard` 6 域；`entries/` → `pages`·`workspace`·`tabs` 3 类。
- **数据单一源**：mock 与 server 不再各存一份种子（`docs/src/mock/prop.js` 收口）；`server/seed.js` 从 `docs/src/mock/**` 同源播种。
- **台账备注列预算化**：`.ctx/TIMESTAMPS.md` 备注列只写「现状 / 边界 / 为什么」，逐批沿革迁入 `.ctx/logs/**`；预算只降不升（`R-89` + `timestamps-note-guard`）。

### Fixed

- 修正若干「前端判据与服务端判据不一致」与「假绿」形态：快照乐观锁缺版本集合、`SEED_FALLBACK` 掩盖「服务端到底播没播」、动态 import 漏版本戳导致浏览器模块实例分裂（注册表读空）等。

### Security

- 读口收紧：资源表默认**要求登录**，仅「有明确裁定公开」的 `issues` 留白名单；通知发布/管理、党小组管理、成员流动登记、支部文件等写口按角色门收严；匿名反馈**出口脱敏**（真身仅党委核查出口单点可见）。

<!-- 沿革指针：0.1.0 之前的逐批沿革见 .ctx/logs/2026-08-EXECUTION_LOG.md 与 .ctx/logs/2026-09-EXECUTION_LOG.md。 -->
