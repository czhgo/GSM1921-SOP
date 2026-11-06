---
title: "前端实现层索引（docs/）"
type: index
role: "[工程师]+[AI]"
last_updated: 2026-10-24
status: active
---

# 前端实现层索引（docs/）

> 目录定位见 [DOC_MAP.md §五 目录作用表](../content/03_doc_system/DOC_MAP.md#五目录作用表2026-10-24-立)。

## 作用

本目录是**前端应用层与静态页入口**，回答「页面在哪、工作台怎么装配、共享模块与维护脚本在哪」。它是 `content/` 设计规范与 `server/` 后端的**实现子本**，本身不产生规范。

## 不负责什么

- **不写视觉规范**——色彩、排版、组件、点击落点一律去 [DESIGN_SYSTEM.md](../content/04_web_design/design-system/DESIGN_SYSTEM.md)，本目录只消费令牌。
- 不写数据模型与部署决策——去 `content/04_web_design/data/`、`content/04_web_design/deploy/`。
- 不写业务制度与权限口径——去 `content/02_institution/`。
- 不放测试与守卫——归 `server/test/`；不放真机证据——归 `.ctx/evidence/`。

## 文件清单

| 文件 | 一句话作用 | 权威源？（是/指针） |
|------|-----------|-------------------|
| `src/` | 应用层代码：`core/`（base / domain / boot / session）、`data/`（adapter 与演示数据）、`services/`（core / member / activity / governance / branch）、`components/`（ui / shell / sections / feedback / record / governance / dashboard）、`capabilities/`、`entries/`（pages / workspace / tabs）、`workflow/`、`config/deploy.js`、`styles.css` | 子本 → [ARCHITECTURE.md §十一](../content/03_doc_system/ARCHITECTURE.md)、[DESIGN_SYSTEM.md](../content/04_web_design/design-system/DESIGN_SYSTEM.md)、[DATA_MODEL.md](../content/04_web_design/data/DATA_MODEL.md) |
| `workspace/` | 七个角色工作台壳页面：支书 / 组织 / 宣传 / 纪检 / 党小组组长 / 成员 / 党委（另含 `branch-readonly.html` 支部只读视图壳） | 指针 → 各台薄壳 `src/entries/workspace/ws-*-entry.js`；页签清单见 `src/capabilities/*-workspace.js` |
| 根页 `index.html` / `login.html` | 首页与登录页；登录后按身份直达对应工作台「今天」 | 指针 → `src/entries/pages/main-entry.js` / `login-entry.js` |
| 根页 `help.html` / `settings.html` | 帮助手册 / 设置中心（外观、我的工作台、支部治理） | 指针 → `src/entries/pages/help-entry.js` / `settings-entry.js` |
| 根页 `search.html` / `feedback.html` / `archive.html` / `messages.html` | 资料查询 / 意见反馈 / 归档库 / 消息 | 指针 → 同名 `src/entries/pages/*-entry.js` |
| 根页 `activity.html` / `activity-materials.html` / `taskforce.html` / `notice.html` | 活动详情 / 活动材料 / 专班详情 / 通知 | 指针 → 同名 `src/entries/pages/*-entry.js` |
| 根页 `person.html` / `thought-report.html` / `party-committee-meeting.html` | 成员档案 / 思想汇报长文阅读 / 支委会会议页 | 指针 → 同名 `src/entries/pages/*-entry.js` |
| 根页 `wizard.html` / `branch-config.html` | 支部配置分步向导 / 支部配置页 | 指针 → `src/entries/pages/wizard-entry.js` / `branch-config-entry.js` |
| `scripts/bump-version.mjs` | 全站 `?v=` 版本戳同步（改前端文件后统一 bump，防浏览器缓存分裂） | 指针 → `docs/scripts/version-next.mjs`（判据单一源） |
| `scripts/release.mjs` | 语义化发版：默认预演，`--apply` 才写 CHANGELOG、同步 `server/package.json` 版本并打 tag | 指针 → `CHANGELOG.md` 与 `version-next.mjs` |
| `scripts/version-next.mjs` | 版本号推导与 CHANGELOG 解析的纯函数件（供 bump / release 与守卫共用） | **是**——版本判据的唯一实现源（守卫独立复算） |
| `scripts/gen-function-mermaid.mjs` | 从功能目录生成根 README 顶部功能地图标记块（`--write`），完整四章打印到 stdout | 指针 → `src/core/domain/function-catalog.js` / `mermaid-sources.js` |

> **构建说明**：本仓是原生 ESM、**无打包器 / 无构建步骤**。`docs/scripts/` 只做版本戳、发版与功能地图生成；真正的校验守卫在 `server/test/`（如 `version-stamp` / `catalog-sync` / `link-integrity`）。

## 权威源与派生

- **本目录是子本**：视觉、组件、点击落点以 [DESIGN_SYSTEM.md](../content/04_web_design/design-system/DESIGN_SYSTEM.md) 为唯一权威；数据字段与流向以 [DATA_MODEL.md](../content/04_web_design/data/DATA_MODEL.md) 为准；角色与权限以 [SYSTEM_ROLE_PERMISSION.md](../content/02_institution/SYSTEM_ROLE_PERMISSION.md) 为准；服务目录与架构分层以 [ARCHITECTURE.md §十一](../content/03_doc_system/ARCHITECTURE.md) 为准。
- **单一源组件**：检索、翻页、人 × 项目矩阵、知情查看、选人域等共享件以根 README「单一源组件」清单登记，其他页面只能复用，不得另写一版。
- **派生关系**：`src/core/domain/function-catalog.js` 派生根 README 功能地图；`src/styles.css` 消费色彩令牌，不得硬编码 hex。

## 知识流向

`content/02_institution/` 的制度与权限 + `content/04_web_design/` 的设计与数据规范 → 在本目录实现为页面、组件与服务 → `server/` 提供同源数据与权限门 → `server/test/` 的守卫验证实现与规范一致；实测发现的偏差记入 `.ctx/`，结论再回写 `content/`，**不在本目录新立规则**。

## 是否保留原始材料

- **保留**：源代码与静态页本身是交付物。
- **不保留**：运行数据（`data.db` / `uploads/`）、测试产物（`.browsers/`）、截图与读数不入本目录——证据在 `.ctx/evidence/`，发布包排除规则见 [`deploy/package.mjs`](../deploy/package.mjs)。

## 维护触发器

- 新增、删除或重命名根页、工作台壳或 `src/` 子目录；
- 新增页面入口 / 能力声明 / 共享组件，或单一源组件换位；
- 视觉、数据、权限、部署任一权威源路径变更；
- `docs/scripts/` 增加、删除或改变参数/行为。
