# 通知闭环、数据真相与工作台视觉重构 Spec

## Why

支书 2026-10-24 提出 8 条问题，三方独立审查（前端 / 后端 / 运算逻辑）取证后确认：
通知点击落点被 `targetModule:'workspace'` 兜底成工作台首页，通知全貌页 `notice.html` 在主路径上被 `direct` 分支绕过；支委会页签自带第二套「待召开」状态机，历史会议已考勤、已复盘、议程已 `passed` 仍显示待召开；归档动作在归档完成后才派生一条无法销项的待办；工作关系表把 14 项固定目录塞进 5 列表格并强制分两页，第 5 列全为「—」；页签分组名在 ≤1280px 被整体隐藏，且支书台「知情查看」组名与组内页签名逐字相同；知情查看调用方写死 `views:['taskforce']`，活动工作组不可见；mock 种子 35 条活动状态逐行手写、复盘 `overdue` 是布尔快照、归档记录与活动归档两套状态、通知正文抄活动日期。

更根本的是消息域：同一条用户对象「消息」被拆成公告、系统通知、私信三种投递源，四个承载面（`notice.html`、`messages.html`、`archive.html?tab=notice`、铃铛下拉），三套已读语义，两套归档语义。支书裁定采用 **A 统一消息中心**：一个列表、一个全貌、一套逐人状态机。

## What Changes

- **BREAKING**：通知与私信合并为「消息」对象，`kind = announcement | system | message`；公告/系统通知必须有 `targetType + targetId`（公告可无对象，显式 `kind='announcement'`）。
- **BREAKING**：`messages.html` 升级为「消息中心」列表（全部 / 未读 / 已读 / 已归档 × 来源筛选）；`notice.html` 升级为统一「消息详情」（三种布局）；`archive.html?tab=notice` 退役并重定向到消息中心「已归档」。
- **BREAKING**：逐人状态机 `未读 → 已读 → 已归档`；归档分「用户归档」（`archivedBy[]`，可恢复）与「系统归档」（`archived`，随活动归档/过期）；已读不等于回执。
- 点击消息一律先落全貌页；删除 `direct` 直跳与 `resolveNoticeUrl` 页面级兜底。
- 活动 `status` 不再由种子逐行写死，改由 `deriveActivityStatus(activity, facts, now)` 现算；支委会页签删除 `meetingStatus()` 第二套状态机。
- **BREAKING**：`mock/` 种子只保留基础事实；状态、计数、待办、通知有效期、归档状态、工作组镜像全部由派生器在 hydrate 时生成（幂等）。
- 工作关系表改为主从两栏（左模块清单、右责任详情），删空列、删表前读法、取消 14 项分页。
- 页签分组名恢复为可见小胶囊（非按钮、非强调色），分组命名与分组轴重新裁定为「总览 / 我的职责 / 协作与知情 / 制度与答复」。
- 卡内标题收敛为单一源：一个 tab 一个 H2，卡头统一 H3 组件；说明后置；同口径指标只出现一次。
- 知情查看新增「工作组」段（活动工作组只读），并保留专班段。

## Impact

- Affected specs：消息与深链（`notice-deeplink-guard`、`notice-audience`、`notice-message`）、活动状态（`state-enum-guard`）、mock 数据契约（`mock-api-parity-*`、`seed-drift`）、页签分组（`doc-consistency` S3）、卡片与控件（`ui-control-system-guard`、`ui-redundancy-guard`）。
- Affected code：
  - 消息：`docs/src/services/governance/notice.js`、`docs/src/core/domain/system-notice-templates.js`、`docs/src/components/shell/header.js`、`docs/src/components/shell/sidebar.js`、`docs/src/components/governance/notice-view.js`、`docs/src/entries/pages/notice-entry.js`、`docs/src/entries/pages/messages-entry.js`、`docs/src/entries/pages/archive-entry.js`、`docs/src/entries/tabs/secretary/notification-tab.js`
  - 状态与派生：`docs/src/entries/tabs/secretary/committee-meeting-tab.js`、`docs/src/components/record/inspector.js`、`docs/src/services/governance/todo.js`、`docs/src/services/core/mock.js`
  - 数据：`docs/src/data/mock/**`、`docs/src/data/seed-manifest.js`、`server/seed.js`、`server/routes/resources/index.js`、`server/routes/system-notices.js`
  - 视觉：`docs/src/entries/tabs/secretary/work-map-tab.js`、`docs/src/components/shell/tab-bar.js`、`docs/src/components/shell/page-frame.js`、`docs/src/styles.css`、`docs/src/capabilities/*-workspace.js`
  - 知情查看：`docs/src/components/record/insight-view.js`、新增 `docs/src/components/record/workgroup-view.js`
  - 守卫：`server/test/notice-deeplink-guard.test.mjs`、`notice-audience.test.mjs`、`notice-message.test.mjs`、`state-enum-guard.test.mjs`、`mock-api-parity-structure.test.mjs`、`ui-control-system-guard.test.mjs`、`docs-governance-guard.test.mjs`

## ADDED Requirements

### Requirement: 消息对象模型
系统 SHALL 用单一「消息」对象承载公告、系统通知、私信，字段至少含 `kind`、`audience/audiencePersons`、`targetType/targetId`、`reads[]`、`archivedBy[]`、`archived`（系统归档）、`expireDate`；私信额外含 `replyTo` 以成线程。

#### Scenario: 一条消息只有一个身份
- **WHEN** 任意入口读取同一条消息
- **THEN** 标题、正文、受众、对象坐标、已读与归档状态来自同一行，不存在第二份副本

#### Scenario: 私信属于消息而非另一类对象
- **WHEN** 用户在消息中心查看私信
- **THEN** 它与公告、系统通知同列在同一时间流，仅以来源徽标区分；回复产生同一线程的新消息

### Requirement: 消息中心（唯一列表）
系统 SHALL 把 `messages.html` 升级为「消息中心」：单一时间流，支持 `全部 / 未读 / 已读 / 已归档` 与来源（公告 / 系统 / 私信）筛选，支持分页、搜索、行内归档/恢复；不得再存在第二个通知列表页。

#### Scenario: 未读与全部
- **WHEN** 用户有 15 条未读、40 条历史消息
- **THEN** 「未读」筛出 15 条；「全部」＝全部未归档（未读＋已读），已归档（用户归档 / 系统归档 / 过期）只在「已归档」档；角标数与「未读」计数同源

#### Scenario: 归档与恢复
- **WHEN** 用户对某条消息点「归档」
- **THEN** 它从默认列表移入「已归档」，可一键恢复；不影响其他收件人

#### Scenario: 系统归档
- **WHEN** 关联活动被归档或消息过期
- **THEN** 消息自动进入「已归档」（`archived=true`），用户不可恢复，但正文与对象卡仍可查看

### Requirement: 消息详情（唯一全貌）
系统 SHALL 把 `notice.html` 升级为统一详情页，按 `kind` 渲染三种布局：公告（正文 + 发布人 + 受众）、系统通知（正文 + 对象卡 + 唯一动作）、私信（会话线程 + 回复框）；所有入口点击 SHALL 先落此页。

#### Scenario: 点击系统通知
- **WHEN** 用户点击 «会议通知»
- **THEN** 进入 `notice.html?id=`，看到正文、会议对象卡、唯一动作「去会议」；不再跳工作台首页

#### Scenario: 公告
- **WHEN** 用户打开一条公告
- **THEN** 显示正文、发布人、受众范围，不渲染对象卡

#### Scenario: 私信
- **WHEN** 用户点击私信条目
- **THEN** 进入同一详情页的会话布局，能看到往来线程并直接回复

### Requirement: 已读与回执分离
系统 SHALL 把「已读」定义为看过（进入详情即已读），把「回执」定义为业务确认（收到 / 线上参加）；回执区不得因已读而隐藏。

#### Scenario: 会议通知的线上参加
- **WHEN** 用户从铃铛进入未读会议通知并填写线上参加
- **THEN** 仍可见「确认收到 / 线上参加」表单；提交后消息标记已读且回执落库，两者互不替代

### Requirement: 消息入口收口
系统 SHALL 只保留三个入口：顶栏铃铛（未读列表，全量可滚动，不再裁到 10 条）、侧栏「消息」（未读角标）、首页通知卡「查看更多」；三者均指向消息中心或详情页。

#### Scenario: 铃铛
- **WHEN** 未读 15 条
- **THEN** 铃铛下拉可滚动查看全部 15 条，每行点击进入详情；底部「查看全部」进入消息中心「未读」

### Requirement: 通知→待办唯一表达
系统 SHALL 只为需要动作的消息派生一条待办，去重键 `sourceType + sourceId + action`；待办深链回消息详情；消息本身不复制「已处理」。

#### Scenario: 连续催办
- **WHEN** 组长对同一聚合组连续两次催办
- **THEN** 通知 +2，但「阅读通知」待办只有一条

### Requirement: 活动状态单一派生
系统 SHALL 用唯一函数从「日期 + 表决状态 + 考勤/复盘事实 + 归档事实」派生会议状态；`待召开` 只表示「日期未到且未锁定」。

#### Scenario: 历史支委会
- **WHEN** 打开支书台「支委会」页签
- **THEN** 已考勤且已复盘的历史会议显示「已召开」或「已归档」，不再出现「待召开」

#### Scenario: 尚未开始的会议
- **WHEN** 活动日期晚于今天且未锁定表决
- **THEN** 显示「待召开」，且不生成任何「会后」派生项

### Requirement: 归档单一事实
系统 SHALL 以活动归档动作为唯一事实；`archiveRecords.status` 与 `activities.archived` 同源同事务；归档动作幂等，且负责销项「待归档」待办。

#### Scenario: 归档活动
- **WHEN** 宣传委员完成某活动归档
- **THEN** 活动移入归档库、对应消息系统归档、待归档待办销项；不新增任何待办

### Requirement: 卡片构成单一源
系统 SHALL 提供唯一卡头组件（`h3` + 右侧计数/动作），一个 tab 只允许一个 H2；说明文字位于主体之后；同一口径指标全屏只出现一次。

#### Scenario: 成员名册
- **WHEN** 打开「成员名册」
- **THEN** 页面只有一个 H2「成员名册」，卡头为带范围信息的 H3，不出现逐字重复

### Requirement: 页签分组可见且可区分
系统 SHALL 在每个分组（含首组）前渲染小胶囊组名；胶囊不得使用主题强调色、不得响应 hover、不得进入 tab 序列；≤1280px 至少保留组间分隔。

#### Scenario: 支书台页签
- **WHEN** 1440px 打开支书台
- **THEN** 依次可见「总览 / 我的职责 / 协作与知情 / 制度与答复」四枚小胶囊；「协作与知情」组内含「支部分工」「知情查看」，组名与页签名不逐字相同

### Requirement: 知情查看覆盖活动工作组
系统 SHALL 在知情查看提供「工作组」段，只读展示本支部 `kind='activity'` 的工作组（名称、所属活动、负责人、成员数、状态）；专班段保留。

#### Scenario: 支书查看知情范围
- **WHEN** 打开「知情查看」
- **THEN** 可在「工作组 / 专班」两段间切换；工作组条目只读，点击进入活动详情

### Requirement: mock 只存事实
系统 SHALL 只把基础事实写入 `docs/src/data/mock/**`：人员身份、支部、党小组、活动基础字段、任务完成、参会记录、表决票、确认动作、报名。状态、计数、待办、消息有效期、归档状态、工作组镜像 SHALL 由派生器生成。

#### Scenario: 改变一条事实
- **WHEN** 把某活动日期从过去改到未来
- **THEN** 活动状态、复盘超期、归档缺口、相关待办与消息可见性在同一刷新内全部跟随

#### Scenario: 种子清洁度
- **WHEN** 守卫扫描 `mock/activities.js`
- **THEN** 不存在 `status`、`archived`、`overdue`、`progress` 等派生字段；如保留演示快照必须登记白名单并写理由

## MODIFIED Requirements

### Requirement: 通知发布
发布表单 SHALL 强制二选一「关联对象」或「公告」；`meetingActivityId` 必须并入 `targetType/targetId`；不得再写 `targetModule:'workspace'` 默认。

### Requirement: 通知受众
`audience` / `audiencePersons` / `actionRoles` 的可见性判定保持单一源；消息中心列表、详情、角标三处必须复用同一 `canReadNotice` 投影。

### Requirement: 页签分组轴
分组名 SHALL 全台统一为四组「总览 / 我的职责 / 协作与知情 / 制度与答复」；`doc-consistency::S3` 的分组名断言同步更新。

### Requirement: 工作关系视图
支书台「支部分工 · 责任关系」SHALL 改为主从两栏：左列 14 个模块（模块名 + 责任人），右列选中模块的责任角色、责任说明、停用/启用操作；取消分页与空「操作」列。

### Requirement: 守卫口径
`notice-deeplink-guard` SHALL 断言「公告/系统通知必须带坐标」「所有入口先经详情页」「不存在 direct 直跳」；`notice-audience` / `notice-message` SHALL 覆盖「归档按人」「已读不等于回执」；`state-enum-guard` SHALL 覆盖活动与消息状态；`mock-api-parity-structure` SHALL 增加「mock 不得含派生字段」的反向断言。

## REMOVED Requirements

### Requirement: `archive.html?tab=notice`
**Reason**：消息有了唯一列表与「已归档」筛选，归档页再保留通知 tab 就是第二套入口。
**Migration**：`archive.html?tab=notice` 301/前端重定向到 `messages.html?filter=archived`；归档页只保留活动、专班两栏。

### Requirement: `resolveNoticeUrl` 的页面级兜底与 `direct` 直跳
**Reason**：这是「点击通知跳工作台」的直接成因，且绕过全貌页。
**Migration**：所有入口统一 `notice.html?id=`；对象跳转由详情页内的唯一动作承担。

### Requirement: `meetingStatus()` 第二套会议状态机
**Reason**：与 `deriveActivityLifecycleStatus` 冲突，导致同一活动两种状态。
**Migration**：支委会页签改用统一派生函数，删除本地四态。

### Requirement: 归档后派生「归档材料」待办
**Reason**：归档完成后生成，活动已离开待归档列表，无法销项。
**Migration**：待归档待办改由「活动结束 → 待归档」生成，归档动作销项；历史滞留条目一次性作废。

### Requirement: `notices` 的全局已读 / 全局归档语义
**Reason**：广播消息的全局 `read` 会让一人已读等于全员已读；全局 `archived` 让系统归档无法与用户归档区分。
**Migration**：已读沿用逐人 `reads[]`；新增逐人 `archivedBy[]`；全局 `archived` 只表示系统归档，保留不回退。
