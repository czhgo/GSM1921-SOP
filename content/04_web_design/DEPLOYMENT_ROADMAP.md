---
title: "部署落地总览——从开发到正式上线的四条路径"
type: design
role: "[工程师]+[AI]"
created: 2026-08-19
last_updated: "2026-08-22"
status: active
related_files: [docs/src/core/data-adapter.js, docs/src/core/api-adapter.js, docs/src/services/runtime.js, docs/src/config/deploy.js, docs/src/core/bootstrap.js, server/server.js, server/app.js, server/db.js, server/routes/auth.js, server/routes/resources.js, server/routes/uploads.js]
---

# 部署落地总览——从开发到正式上线的四条路径

> **定位**：系统的「落地视图」——把四条部署路径（静态托管 / Node 自托管 / 计算中心对接 / 微信小程序）放在一张图上，回答「当前处于什么阶段、下一步做什么、各自的前置条件是什么」。
> **受众**：技术对接为主（给计算中心的技术清单 + 给未来接手开发者的操作入口），兼顾决策路线。
> **关联**：SCHOOL_IT_DEPLOYMENT.md（计算中心准备清单，本文件 §三 的细目）、DEPLOYMENT_AUTH_MODEL.md（部署形态/登录态/门控的统一模型）、WECHAT_INTEGRATION.md（小程序设计方案，本文件 §四 的细目）、DATA_ARCHITECTURE.md §4.4（DataAdapter 数据抽象）。

---

## 一、四条落地路径总览

| 路径 | 形态 | 数据 | 前置条件 | 当前就绪度 | 适用场景 |
|------|------|------|---------|-----------|---------|
| A 静态托管 | GitHub Pages 直接部署 `docs/` | mock（localStorage + 内存缓存，刷新丢失） | 无 | ✅ 完全就绪 | 开发调试 / 演示 / 公开门面（about.html 是公开页） |
| B Node 自托管 | `server/`（Express + better-sqlite3）同源托管 `docs/` 与 `/api/v1` | SQLite 单文件持久化 | Node 18+，`npm install` | ✅ 完全就绪（16 测试全绿） | 本地 / 校内服务器正式使用 |
| C 计算中心对接 | 学校提供后端（数据库 + API 服务器） | 计算中心数据库 | 前置条件见 §三 | 🔶 准备阶段（代码已就绪，待对接） | 正式上线目标形态 |
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
| 后端服务 | `server/` Express + better-sqlite3：**26 资源表**（id + data JSON 通用结构，含 branch_docs）+ sessions/attachments；routes：auth（login/logout/me）、resources（CRUD + bootstrap + snapshot 写穿）、uploads（jpg/png/pdf/docx/xlsx ≤10MB）；`npm test` 16 用例全绿（含 Playwright E2E 登录链路） |
| 部署形态区分 | `docs/src/config/deploy.js` `DEPLOY_MODE: 'static' | 'server'`（构建时注入）；侧边栏「关于」显隐按此区分（静态托管显示 / 有后端隐藏） |
| 登录门控 | 四层模型已落地（DEPLOYMENT_AUTH_MODEL.md §四）：L1 页面 / L2 功能写入 / L3 身份组件 / L4 下载 |

### 2.2 待做

| 项 | 说明 | 阻塞点 |
|----|------|--------|
| api-adapter 资源级 CRUD（P2） | 当前写穿走全量 snapshot，资源级 create/update/delete 为 P2 | 无（工作量问题，不阻塞部署） |
| 北大 IAAA 单点登录 | 登录落点的最终目标，门控触发条件已预留 | 依赖计算中心对接推进 |
| AI 本地部署 | 计算中心 GPU 上的推理服务（见 SCHOOL_IT_DEPLOYMENT.md §三） | 依赖计算中心资源 |

---

## 三、路径 C：计算中心对接（准备阶段）

### 3.1 前置条件

| 项 | 说明 | 责任方 |
|----|------|--------|
| 域名 + ICP 备案 | 正式上线必需的 Web 入口 | 书记 / 计算中心 |
| 数据库 | PostgreSQL 或计算中心提供的数据库服务 | 计算中心 |
| API 服务器 | 按 api-adapter.js 路由表实现（RESTful + JWT + JSON） | 计算中心 |
| HTTPS | JWT token 传输必需 | 计算中心 |

### 3.2 提供给计算中心的文档清单（当前代码版）

| 文档 | 位置 | 内容 |
|------|------|------|
| 数据架构设计 | [DATA_ARCHITECTURE.md](DATA_ARCHITECTURE.md) | 数据模型、字段规格、DataAdapter 接口规范、API 路由设计（§4.4） |
| API 路由表 | [api-adapter.js](../../docs/src/core/api-adapter.js) 头部 | 25 资源路径与方法 + 服务端点（health/bootstrap/snapshot/uploads/auth） |
| 后端参考实现 | `server/` | db.js 26 表结构、routes/resources.js CRUD 语义、auth.js 认证、uploads.js 附件 |
| 数据访问抽象层 | [data-adapter.js](../../docs/src/core/data-adapter.js) | `setDataSource` 切换机制，学校侧无需修改前端 |
| 认证与登录语义 | [auth.js](../../docs/src/services/auth.js) + [DEPLOYMENT_AUTH_MODEL.md](DEPLOYMENT_AUTH_MODEL.md) | 登录/token 语义、5 场景模型、登录门控四层 |
| 可见性规则 | [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) 原则 9 | 基于 partyStatus/role 的多级过滤逻辑 |

### 3.3 对接六步

1. **环境准备**：计算中心提供 API 环境（数据库 + API 服务器 + HTTPS 域名）
2. **认证对接**：本地 `login.html` 账号体系替换为计算中心账号体系（目标为北大 IAAA 单点登录，见 3.4）；前端 `setDataSource('api', { apiBaseUrl: 'https://<域名>/api/v1', authToken })` 即可切换
3. **核心数据模块**：活动 / 考勤 / 考察（P0 优先）
4. **通知 + 反馈模块**（P1）
5. **AI 本地部署**（若有，见 SCHOOL_IT_DEPLOYMENT.md §三）
6. **全功能联调测试**（16 测试用例作为回归基线）

> 每一步对接前，需与学校计算中心确认技术规范和数据安全协议。

### 3.4 北大 IAAA 单点登录（后续目标）

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

## 五、部署决策矩阵

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
| 计算中心响应周期 | 对接进度依赖学校侧 | 准备清单前置（§3.2） |
| AI 本地部署 GPU | 路径 C 的可选项 | 计算中心资源评估 |
| 数据安全 | JWT 传输 + 多级可见性 | 已实现四层门控 + Bearer 认证 |

---

## 七、关联文档索引

| 文档 | 角色 |
|------|------|
| [DATA_ARCHITECTURE.md](DATA_ARCHITECTURE.md) §4.4 | DataAdapter 数据抽象（mock/api）权威源 |
| [SCHOOL_IT_DEPLOYMENT.md](SCHOOL_IT_DEPLOYMENT.md) | 计算中心对接准备清单（本文件 §三 细目） |
| [DEPLOYMENT_AUTH_MODEL.md](DEPLOYMENT_AUTH_MODEL.md) | 部署形态 / 登录态 / 门控统一模型 |
| [WECHAT_INTEGRATION.md](WECHAT_INTEGRATION.md) | 小程序设计方案（本文件 §四 细目） |
| [server/README.md](../../server/README.md) | 后端安装 / 启动 / 测试 / 部署对接说明 |
