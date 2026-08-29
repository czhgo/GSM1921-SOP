---
title: "部署落地总览——从开发到正式上线的四条路径（含计算中心对接全案）"
type: design
role: "[工程师]+[AI]"
created: 2026-08-19
last_updated: "2026-08-29"
status: active
related_files: [docs/src/core/data-adapter.js, docs/src/core/api-adapter.js, docs/src/services/runtime.js, docs/src/config/deploy.js, docs/src/core/bootstrap.js, server/server.js, server/app.js, server/db.js, server/routes/auth.js, server/routes/resources.js, server/routes/uploads.js]
---

# 部署落地总览——从开发到正式上线的四条路径

> **定位**：系统的「落地视图」——把四条部署路径（静态托管 / Node 自托管 / 计算中心对接 / 微信小程序）放在一张图上，回答「当前处于什么阶段、下一步做什么、各自的前置条件是什么」。本文件为部署与对接的唯一权威源，含计算中心对接全案（系统概述、对接需求、前置条件、文档清单、对接步骤、AI 本地部署）。
> **受众**：技术对接为主（给计算中心的技术清单 + 给未来接手开发者的操作入口），兼顾决策路线。
> **关联**：DEPLOYMENT_AUTH_MODEL.md（部署形态/登录态/门控的统一模型）、WECHAT_INTEGRATION.md（小程序设计方案，本文件 §四 的细目）、DATA_FLOW.md §4.4（DataAdapter 数据抽象）。
> **合并说明**：2026-08-24 原 SCHOOL_IT_DEPLOYMENT.md（计算中心对接准备文档）内容并入本文件 §三，消除文档清单重复，原文件删除。

---

## 一、四条落地路径总览

| 路径 | 形态 | 数据 | 前置条件 | 当前就绪度 | 适用场景 |
|------|------|------|---------|-----------|---------|
| A 静态托管 | GitHub Pages 直接部署 `docs/` | mock（localStorage + 内存缓存，刷新丢失） | 无 | ✅ 完全就绪 | 开发调试 / 演示 / 公开门面（about.html 是公开页） |
| B Node 自托管 | `server/`（Express + better-sqlite3）同源托管 `docs/` 与 `/api/v1` | SQLite 单文件持久化 | Node 18+，`npm install` | ✅ 完全就绪（16 测试全绿） | 本地 / 校内服务器正式使用 |
| C 计算中心对接 | 学校提供后端（数据库 + API 服务器） | 计算中心数据库 | 前置条件见 §3.3 | 🔶 准备阶段（代码已就绪，待对接） | 正式上线目标形态 |
| D 微信小程序 | WebView 套壳（短期）→ Taro 跨端重写（长期） | 与网页共用后端 | 企业主体 / 服务类目 / 域名备案 / 后端上线 | 🔶 规划阶段（无代码） | 移动端微信内协同 |

**路径关系**：A → B 是「数据从 mock 到持久化」的升级；B → C 是「自托管到学校托管」的迁移（前端数据层切换 api 即可，UI 零改动）；D 依赖 B/C 先落地（小程序必须共用已上线的后端）。

---

## 二、代码就绪度盘点

### 2.1 已就绪

| 层 | 事实 |
|----|------|
| 前端模块化 | `docs/src/` ESM 分层（entries/components/core/services/workflow/modules/mock），8 根 HTML + 6 工作台 |
| 数据抽象 | `data-adapter.js` mock/api 双模式，`setDataSource('mock'/'api', { apiBaseUrl, authToken })` 动态切换；`runtime.js` 默认 mock，`bootstrap.js` 检测到 token 自动切 api、服务器不可达静默回退 mock |
| API 适配器 | `api-adapter.js` P1 已实现：25 服务端资源 `list()`（供 init 拉全量）+ `snapshot()` 全量写穿 + 8s 超时兜底；路由表见文件头（25 资源 + auth/login/logout + snapshot + uploads + health/bootstrap） |
| 后端服务 | `server/` Express + better-sqlite3：**26 资源表**（id + data JSON 通用结构，含 branch_docs）+ sessions/attachments；routes：auth（login/logout/me）、resources（CRUD + bootstrap + snapshot 写穿）、uploads（jpg/png/pdf/docx/xlsx ≤10MB）、report（§六）；`npm test` 单测 24 用例全绿（含上报接口 8 例） |
| 邮件双通道（§五） | `server/services/mailer.js`（nodemailer 通用 SMTP，env 注入不落库，失败重试 3 次 + 静默降级）+ `services/mailer-hooks.js` 接入通知发布/待办提醒/反馈汇报触发点；成员档案 email 字段预留，补充后通道自动生效 |
| 数据上报（§六） | `server/routes/report.js` + `services/reporting.js`：`GET /api/v1/report/:domain`（JSON 拉取）/ `/report/export`（CSV+BOM 人工导入）/ `POST /report/trigger`（手动推送）+ 每日 03:00 定时批量上报 + 每 10 分钟会议提醒扫描 |
| 部署形态区分 | `docs/src/config/deploy.js` `DEPLOY_MODE: 'static' | 'server'`（构建时注入）；侧边栏「关于」显隐按此区分（静态托管显示 / 有后端隐藏） |
| 登录门控 | 四层模型已落地（DEPLOYMENT_AUTH_MODEL.md §四）：L1 页面 / L2 功能写入 / L3 身份组件 / L4 下载 |

### 2.2 待做

| 项 | 说明 | 阻塞点 |
|----|------|--------|
| api-adapter 资源级 CRUD（P2） | 当前写穿走全量 snapshot，资源级 create/update/delete 为 P2 | 无（工作量问题，不阻塞部署） |
| 北大 IAAA 单点登录 | 登录落点的最终目标，门控触发条件已预留（见 §3.7） | 依赖计算中心对接推进 |
| AI 本地部署 | 计算中心 GPU 上的推理服务（见 §3.6） | 依赖计算中心资源 |

---

## 三、路径 C：计算中心对接（准备阶段）

> 本部分为计算中心对接全案（2026-08-24 并入原 SCHOOL_IT_DEPLOYMENT.md 全部内容）。

### 3.1 系统概述（对接对象）

光华管理学院本科生党支部管理引擎（GSM1921-SOP）是一套面向学生党支部的综合性管理工具，核心功能包括：

- **党建活动管理**：创建、赋权、分工、考勤、考察建档、人才库维护
- **党员发展路径**：从入党申请人到正式党员的全流程追踪
- **通知系统**：程序被动通知 + 支书/支委主动通知，`actionRequired` 驱动交互
- **意见反馈**：GitHub Issue 风格的反馈追踪（提交→审核→合并）
- **数据可视化**：关系网络图、时间轴、日历、归档库

**当前状态**（2026-08-19 更新）：前端功能完整 + `server/` 后端全栈已实现（Express + better-sqlite3，26 资源表 + 认证 + 附件上传，16 测试全绿）。数据层为 mock/api 双模式——本地默认 mock，对接计算中心时切 api 即可，UI 零改动。整体处于**对接准备阶段**。

### 3.2 对接需求

#### 3.2.1 后端服务需求

| 功能模块 | 需要的后端能力 | 数据结构 | 优先级 |
|---------|--------------|---------|-------|
| 用户认证 | 登录/注销/会话管理 | `users` 表（studentId, name, role, partyStatus） | P0 |
| 活动管理 | CRUD + 状态流转 | `activities` 表（见 DATA_MODEL.md） | P0 |
| 考勤考察 | 提交+查询+更新 | `attendance` + `evaluations` 表 | P0 |
| 通知系统 | 创建+推送+标记已读 | `notices` 表（actionRequired, source, visibility） | P1 |
| 意见反馈 | 提交+审核+评论+状态流转 | `issues` 表（GitHub Issue 风格） | P1 |
| 专班管理 | CRUD + 招募+赋权 | `taskforces` 表 | P2 |
| 归档库 | 查询+按月分页 | `activities` 表的 completed/archived 子集 | P2 |

#### 3.2.2 数据持久化需求

- **存储方式**：关系型数据库（PostgreSQL 推荐）或学校计算中心提供的数据库服务
- **数据量预估**：初期 <1000 条记录，年增长 <500 条
- **备份策略**：每日自动备份 + 书记手动导出能力

#### 3.2.3 API 设计要求

当前 `services/runtime.js` 已预留 mock/api 切换点。T-142 阶段2已实现 DataAdapter 抽象层，对接后只需：

```javascript
// runtime.js 中调用：
setDataSource('api', {
  apiBaseUrl: 'https://<计算中心提供的域名>/api/v1',
  authToken: '<JWT Token>',
});
```

UI 层零改动，通过 `getAdapter()` 访问数据自动走 API 适配器。DataAdapter 架构详见 DATA_FLOW.md §4.4。

API 需满足以下规范：
- RESTful 风格
- JSON 响应格式
- JWT 会话认证
- 分页查询支持（`?page=1&per_page=20`）
- 月份分组查询支持（`?month=2026-07`）
- 完整路由设计见 DATA_FLOW.md §4.4.5

#### 3.2.4 信息安全与可见性

系统采用多级可见性设计：

| 可见性层级 | 适用场景 | 过滤逻辑 |
|-----------|---------|---------|
| 全员公开 | 一般通知、活动公告 | 无过滤 |
| 仅党员 | 党内事务讨论 | `partyStatus IN ('正式党员','预备党员')` |
| 仅支委 | 支委会议、考察建档 | `role IN ('secretary','vice-secretary','org-commissioner','disc-commissioner','prop-commissioner')` |
| 指定人（私发） | 工作私信 | `targetPersonIds` 字段 |

后端需实现基于 `partyStatus` 和 `role` 的访问控制。

### 3.3 前置条件

| 项 | 说明 | 责任方 |
|----|------|--------|
| 域名 + ICP 备案 | 正式上线必需的 Web 入口 | 书记 / 计算中心 |
| 数据库 | PostgreSQL 或计算中心提供的数据库服务 | 计算中心 |
| API 服务器 | 按 api-adapter.js 路由表实现（RESTful + JWT + JSON） | 计算中心 |
| HTTPS | JWT token 传输必需 | 计算中心 |

### 3.4 提供给计算中心的文档清单

| 文档 | 位置 | 内容 |
|------|------|------|
| 数据架构设计 | `content/04_web_design/data/DATA_MODEL.md` + `content/04_web_design/data/DATA_FLOW.md` | 全部数据模型定义、字段规格、DataAdapter 接口规范、API 路由设计 |
| API 适配器实现 | `docs/src/core/api-adapter.js` | REST API 完整路由映射（25 资源分组 + 服务端点 auth/login/logout、snapshot、uploads、health、bootstrap，见 api-adapter.js 头部路由表），学校计算中心按此实现后端 |
| 后端参考实现 | `server/` | Express + better-sqlite3 全栈：db.js 26 资源表结构、routes/resources.js CRUD 语义、auth.js 认证、uploads.js 附件上传——计算中心可对照实现或直接迁移 |
| Mock 适配器实现 | `docs/src/core/mock-adapter.js` | DataAdapter 的 mock 实现，供参考数据结构和业务逻辑 |
| 数据访问抽象层 | `docs/src/core/data-adapter.js` | 统一切换机制（setDataSource），学校计算中心无需修改 |
| 运行时插槽 | `docs/src/services/runtime.js` | 初始化入口，注册适配器实例 |
| 认证流程说明 | `docs/src/services/auth.js` + `content/04_web_design/deploy/DEPLOYMENT_AUTH_MODEL.md` | 登录/注销/会话管理逻辑 + 5 场景部署认证模型 + 登录门控四层 |
| 可见性规则说明 | 本文件 §3.2.4 | 多级可见性的过滤逻辑 |
| AI 接入需求 | 本文件 §3.6 | AI 本地部署的场景和模型要求 |
| 前端页面清单 | `docs/` 目录 | 所有 HTML 页面及其功能说明 |

### 3.5 对接步骤

1. **第一步**：学校计算中心提供后端 API 环境（数据库 + API 服务器 + HTTPS 域名）
2. **第二步**：认证模块对接（用户表 + 登录 API）——前端本地 `login.html` 已实现完整登录链路（账号密码 → `POST /api/v1/auth/login` → JWT token → 切换 api 数据源，含 E2E 验证），对接时把账号校验替换为计算中心用户体系，最终目标为北大 IAAA 单点登录（门控触发条件已预留，见 §3.7）
3. **第三步**：核心数据模块对接（活动 + 考勤 + 考察）
4. **第四步**：通知 + 反馈模块对接
5. **第五步**：AI 本地部署环境搭建（见 §3.6）
6. **第六步**：全功能联调测试（`server/test/` 16 用例作为回归基线）

> **注意**：每一步对接前，需要与学校计算中心确认技术规范和数据安全协议。

### 3.6 AI 本地部署需求

#### 3.6.1 需求场景

| 功能 | AI 用途 | 模型要求 | 频率 |
|------|---------|---------|------|
| 经验提炼 | 从活动总结/考察记录中提炼可复用模式 | 中等推理能力（GPT-4 级别） | 低频（月度） |
| 通知智能路由 | 根据通知内容自动判定 `actionRequired` | 轻量分类模型 | 中频（每日） |
| 活动建议 | 根据历史数据推荐活动安排 | 轻量推荐模型 | 低频（月度） |

#### 3.6.2 部署要求

- **模型**：1 个中等推理模型（7B-13B 参数）+ 1 个轻量分类模型
- **推理方式**：API 调用（HTTP POST），不需要实时流式
- **数据安全**：所有输入数据不外传，模型本地推理
- **成本预估**：学校计算中心 GPU 资源即可满足

#### 3.6.3 接入方式

```
AI_API_BASE_URL = 'https://<计算中心提供的域名>/ai/v1'
// 调用方式：
// POST /ai/v1/completions  { prompt, max_tokens, temperature }
```

### 3.7 北大 IAAA 单点登录（后续目标）

登录门控四层已预留 IAAA 为登录落点的最终目标（DEPLOYMENT_AUTH_MODEL.md §四）：工作台（L1）与写入操作（L2）的跳转目标由本地 `login.html` 替换为 IAAA 网页。**接入前不改变门控触发条件**——IAAA 只是换登录落点，门控模型不变。

---

## 四、路径 D：微信小程序落地规划

> 设计细目见 [WECHAT_INTEGRATION.md](WECHAT_INTEGRATION.md)（文件流分类 / 宣传墙+档案 / 过程性汇报集成）。

### 4.1 路径决策

| 路径 | 改动 | 体验 | 前置条件 | 结论 |
|------|------|------|---------|------|
| A WebView 套壳 | 极小（现有网页套壳） | 一般 | 企业主体 + 域名备案 | 短期可行 |
| B Taro 跨端重写 | 20+ 页面全重写 | 最佳 | 后端上线 + 数据层切 api | 中期主选 |
| C 原生小程序 | 双份维护 | 最佳 | — | 不推荐 |

### 4.2 前置条件

1. 企业主体注册 + 微信小程序服务类目
2. 后端上线 + HTTPS + ICP 备案
3. 数据层切 api 模式（`DataAdapter` 双模式已就绪，见 §二）

### 4.3 数据层共用方案

网页与小程序共用同一后端（`server/` 或计算中心）：`external-dispatch.js`「已发/已收」外发确认闭环模型同构，可低成本迁移为过程性批复的「已批复」状态（WECHAT_INTEGRATION.md §5.2 共享数据层）。前端仅需在小程序侧实现同一 `DataAdapter` 接口。

### 4.4 里程碑

- **短期（现状）**：网页端发送方登记制 + 宣传墙/档案浏览功能 + 外发确认闭环（原则 13）
- **中期**：后端部署 + 数据层切 api → WebView 套壳快速上线验证
- **长期**：Taro 跨端重写 → 微信订阅消息原生批复 → 微信内全流程协同

---

## 五、邮箱发送接入（通用 SMTP）

> **定位**：本系统与学校邮件系统之间的发送通道（2026-08-29 书记大尺度更新新增）。本系统只做「发送」，邮箱由学校/支部提供 SMTP 服务。**读者对象：计算中心对接人**——本节自包含，不需要本项目任何上下文。
> **前置依赖**：路径 B（Node 自托管）已上线，或与路径 C 同步规划。

### 5.1 目的与覆盖场景

系统在站内通知/待办/反馈/会议之外，**同时通过邮件触达成员**（站内 + 邮件双通道，不漏人）。共四个场景：

| 场景 | 触发点 | 收件人 |
|------|--------|--------|
| ① 通知发布 | 书记/副书记在「通知发布」发布通知 | 通知受众（全体/党小组/指定角色） |
| ② 待办提醒 | 任何新待办生成（审批/报名/考察/交接） | 待办责任人 |
| ③ 反馈/汇报 | 意见反馈提交、一键汇报发出 | 汇报对象（书记/纪检等） |
| ④ 会议提醒 | 三会一课/主题党日活动（开始前 N 小时） | 活动参与人 |

### 5.2 依赖与前置条件（计算中心需提供）

| 项 | 说明 | 示例 |
|----|------|------|
| SMTP 服务器地址 | 学校统一邮件系统的发送服务器 | `smtp.pku.edu.cn` |
| SMTP 端口 | 465（SSL）或 587（STARTTLS） | `465` |
| 发件账号 + 密码/授权码 | 支部专用发件邮箱（如 `gsm1921@xxx.edu.cn`） | — |
| 发件人显示名 | 邮件中显示的发送者名称 | 「光华管理学院本科生党支部」 |
| 出站白名单（若学校有） | 本系统服务器 IP 加入邮件系统允许发送白名单 | — |

> 若学校暂无 SMTP 开放，可先用任意标准 SMTP 服务（腾讯企邮/阿里企业邮等）联调，参数不变、切换只改配置。

### 5.3 技术方案

- 后端新增邮件发送模块（Node `nodemailer`），配置经**环境变量**注入（不写进代码/仓库）：
  ```
  SMTP_HOST=smtp.xxx.edu.cn
  SMTP_PORT=465
  SMTP_USER=gsm1921@xxx.edu.cn
  SMTP_PASS=******
  SMTP_FROM=光华管理学院本科生党支部 <gsm1921@xxx.edu.cn>
  SMTP_TLS=true            # 465 用 SSL / 587 用 STARTTLS
  MAIL_ENABLED=true        # false 时仅站内通知，邮件通道静默关闭
  ```
- 发送策略：
  - **站内优先、邮件并行**：站内通知照常入库，邮件发送异步进行，**邮件失败不影响站内功能**（降级不阻断）。
  - **失败重试**：每条邮件最多重试 3 次（间隔 1min/5min/30min），最终失败记入发送日志（可查）。
  - **去重**：同一收件人同一内容的批量邮件合并为一封；通知类按人合并。
- 邮件正文 = 站内内容快照 + 系统入口链接（登录后直达对应页面）；纯文本 + 简洁 HTML 双版本。
- 隐私：收件人邮箱从系统内成员档案读取（字段预留）；凭据与邮件日志**只存服务端**，不外发。

### 5.4 计算中心 Checklist（验收标准）

- [ ] 提供 SMTP 服务器地址/端口/账号/授权码/发件人显示名（§5.2 表）
- [ ] 配置 5.3 环境变量后重启服务，`MAIL_ENABLED=true`
- [ ] 验证：书记发布一条通知 → 目标收件人邮箱收到邮件（正文含通知内容 + 直达链接）
- [ ] 验证：触发一条待办（如报名审批）→ 责任人收到提醒邮件
- [ ] 验证：SMTP 账号错误时系统**不崩溃**（站内通知仍正常，日志记录发送失败）
- [ ] 确认出站白名单（若有）已加入本系统服务器 IP

---

## 六、智慧党建 / 党校系统协同（上报为主）

> **定位**：本系统产生的支部数据（党员/活动/考勤/学习）**按日批量上报**至学校智慧党建平台 / 党校系统，供平台收录与统计（2026-08-29 书记大尺度更新新增）。**读者对象：计算中心对接人**——本节自包含。
> **边界**：本期为**单向上报**（本系统 → 平台）；双向同步（平台 → 本系统）预留接口边界，见 §6.7。

### 6.1 协同架构

```
┌─────────────┐  每日批量/手动   ┌──────────────────┐
│  本系统 server  │ ──────────────> │ 智慧党建/党校系统  │
│  /api/v1/report │   数据上报      │  （学校侧接收端）   │
└─────────────┘                 └──────────────────┘
        │ 上报内容：党员信息 / 活动记录 / 考勤记录 / 学习记录
        │ 格式：JSON（UTF-8）或 CSV；频率：每日凌晨批量 + 支持手动触发
```

### 6.2 数据域清单（四类，字段定义）

| 数据域 | 关键字段 | 说明 |
|--------|---------|------|
| 党员信息 | 姓名、学号/工号、党小组、入党日期、联系方式（可选） | 全量成员档案；**联系方式字段脱敏可配**（默认不报手机号） |
| 活动记录 | 活动名称、类型（三会一课/主题党日/党课/参访等）、日期、地点、主题、组织者、参与人数 | 已完成/进行中活动 |
| 考勤记录 | 活动 ID/名称、成员、出勤状态（出勤/缺勤/请假/已补）、记录人、确认状态 | 纪检确认后的最终数据 |
| 学习记录 | 学习内容、成员、完成状态、完成时间（含补课完成） | 补课任务完成即归入 |

### 6.3 上报接口协议（与计算中心/平台侧约定）

- **上报出口**（本系统提供，供平台拉取或人工导出）：
  - `GET /api/v1/report/:domain?from=YYYY-MM-DD&to=YYYY-MM-DD` → 返回该时段 JSON 数据
  - `GET /api/v1/report/export?domain=activity&from=...&to=...` → 返回 CSV 文件（人工导入用）
- **推送模式**（若平台提供接收端）：本系统定时任务 POST 至平台指定 URL，格式 JSON，鉴权用平台下发的 Token（`REPORT_WEBHOOK_URL` / `REPORT_TOKEN` 环境变量）。
- 两模式任选其一，按平台能力决定；**字段与格式以平台侧需求为准**，本系统出口可按平台字段映射表适配。

### 6.4 同步频率与可靠性

- 默认**每日凌晨 03:00 批量上报**（可配），另支持**手动触发**（界面按钮 / 接口调用）。
- 失败重试 3 次；连续失败发管理员通知（站内 + 邮件，若邮件通道已启用）。
- 上报仅发送**已确认/已归档**数据（源头审校 + 异常驱动原则：草稿/待确认数据不外发）。

### 6.5 计算中心 Checklist（验收标准）

- [ ] 与平台侧确认：上报模式（拉取 or 推送）、接收地址/Token、字段映射表
- [ ] 配置 `REPORT_WEBHOOK_URL` / `REPORT_TOKEN`（推送模式）或开放 `GET /api/v1/report/*`（拉取模式）
- [ ] 验证：手动触发一次上报 → 平台收到对应时段数据（党员/活动/考勤/学习四域）
- [ ] 验证：`from/to` 时段过滤正确；`from` 缺省时默认近 7 天
- [ ] 验证：平台接收失败时本系统重试 3 次并产生管理员告警（不静默丢数据）
- [ ] 确认隐私口径：党员联系方式是否上报、如何脱敏

### 6.6 与现有模块的对应（开发/维护者速查）

| 上报数据域 | 数据来源（本系统） |
|-----------|-------------------|
| 党员信息 | `mock/people` / 服务端 members 表 |
| 活动记录 | `services/activity.js`（activities 资源） |
| 考勤记录 | `services/attendance.js`（attendances 资源，取 `status: confirmed` 或已自动确认） |
| 学习记录 | `services/makeup.js`（makeupTasks 完成态） |

### 6.7 后续扩展（预留边界，本期不做）

- 平台 → 本系统：组织关系、党校培训/结业记录回写（双向同步）；入口：`/api/v1/sync/inbound` 预留。
- 实时事件推送（当前为批量）：待平台侧接口成熟后增量。

---

## 七、部署决策矩阵

| 场景 | 路径 |
|------|------|
| 开发调试 / 单机演示 | A（`docs/` 静态）或 B（`server/` 本地） |
| 公开门面 / 开源展示 | A（GitHub Pages，about.html 为公开叙事页） |
| 支部正式使用（数据持久化） | B（自托管）→ C（计算中心托管） |
| 移动端微信内协同 | D（小程序，中期，依赖 B/C 上线） |

**判定口诀**：要演示走 A，要持久化走 B，要学校托管走 C，要微信协同走 D——D 必须站在 B/C 之上。

---

## 六、风险与依赖

| 风险 | 影响 | 缓解 |
|------|------|------|
| 域名备案周期 | 阻塞 C/D 上线 | 提前启动备案流程 |
| 小程序企业主体 | 个人主体无法申请部分服务类目 | 注册企业主体或用学校主体（待确认） |
| 计算中心响应周期 | 对接进度依赖学校侧 | 准备清单前置（§3.4） |
| AI 本地部署 GPU | 路径 C 的可选项 | 计算中心资源评估 |
| 数据安全 | JWT 传输 + 多级可见性 | 已实现四层门控 + Bearer 认证 |

---

## 九、关联文档索引

| 文档 | 角色 |
|------|------|
| [DATA_FLOW.md](../data/DATA_FLOW.md) §4.4 | DataAdapter 数据抽象（mock/api）权威源 |
| [DEPLOYMENT_AUTH_MODEL.md](DEPLOYMENT_AUTH_MODEL.md) | 部署形态 / 登录态 / 门控统一模型 |
| [WECHAT_INTEGRATION.md](WECHAT_INTEGRATION.md) | 小程序设计方案（本文件 §四 细目） |
| [server/README.md](../../../server/README.md) | 后端安装 / 启动 / 测试 / 部署对接说明 |
