---
title: "学校计算中心对接准备文档"
type: design
role: "[工程师]+[AI]"
created: 2026-07-28
last_updated: 2026-07-31
status: draft
author: AI起草，书记审定
related_files: [docs/src/services/runtime.js, docs/src/services/issues.js, docs/src/services/auth.js, docs/src/core/data-loader.js, docs/src/core/data-adapter.js, docs/src/core/mock-adapter.js, docs/src/core/api-adapter.js]
---

# 学校计算中心对接准备文档

> 本文档详述系统对接学校计算中心所需的准备工作，以及需要提供给学校计算中心的文档清单。

## 一、系统概述

光华管理学院本科生党支部管理引擎（GSM1921-SOP）是一套面向学生党支部的综合性管理工具，核心功能包括：

- **党建活动管理**：创建、赋权、分工、考勤、考察建档、人才库维护
- **党员发展路径**：从入党申请人到正式党员的全流程追踪
- **通知系统**：程序被动通知 + 支书/支委主动通知，`actionRequired` 驱动交互
- **意见反馈**：GitHub Issue 风格的反馈追踪（提交→审核→合并）
- **数据可视化**：关系网络图、时间轴、日历、归档库

**当前状态**：前端功能完整，数据层为纯 mock（localStorage + 内存缓存），刷新后丢失。

## 二、系统对接需求

### 2.1 后端服务需求

| 功能模块 | 需要的后端能力 | 数据结构 | 优先级 |
|---------|--------------|---------|-------|
| 用户认证 | 登录/注销/会话管理 | `users` 表（studentId, name, role, partyStatus） | P0 |
| 活动管理 | CRUD + 状态流转 | `activities` 表（见 DATA_ARCHITECTURE.md） | P0 |
| 考勤考察 | 提交+查询+更新 | `attendance` + `evaluations` 表 | P0 |
| 通知系统 | 创建+推送+标记已读 | `notices` 表（actionRequired, source, visibility） | P1 |
| 意见反馈 | 提交+审核+评论+状态流转 | `issues` 表（GitHub Issue 风格） | P1 |
| 专班管理 | CRUD + 招募+赋权 | `taskforces` 表 | P2 |
| 归档库 | 查询+按月分页 | `activities` 表的 completed/archived 子集 | P2 |

### 2.2 数据持久化需求

- **存储方式**：关系型数据库（PostgreSQL 推荐）或学校计算中心提供的数据库服务
- **数据量预估**：初期 <1000 条记录，年增长 <500 条
- **备份策略**：每日自动备份 + 书记手动导出能力

### 2.3 API 设计要求

当前 `services/runtime.js` 已预留 mock/api 切换点。T-142 阶段2已实现 DataAdapter 抽象层，对接后只需：

```javascript
// runtime.js 中调用：
setDataSource('api', {
  apiBaseUrl: 'https://<计算中心提供的域名>/api/v1',
  authToken: '<JWT Token>',
});
```

UI 层零改动，通过 `getAdapter()` 访问数据自动走 API 适配器。

DataAdapter 架构详见 DATA_ARCHITECTURE.md §4.4。

API 需满足以下规范：
- RESTful 风格
- JSON 响应格式
- JWT 会话认证
- 分页查询支持（`?page=1&per_page=20`）
- 月份分组查询支持（`?month=2026-07`）
- 完整路由设计见 DATA_ARCHITECTURE.md §4.4.5

### 2.4 信息安全与可见性

系统采用多级可见性设计：

| 可见性层级 | 适用场景 | 过滤逻辑 |
|-----------|---------|---------|
| 全员公开 | 一般通知、活动公告 | 无过滤 |
| 仅党员 | 党内事务讨论 | `partyStatus IN ('正式党员','预备党员')` |
| 仅支委 | 支委会议、考察建档 | `role IN ('secretary','vice-secretary','org-commissioner','disc-commissioner','prop-commissioner')` |
| 指定人（私发） | 工作私信 | `targetPersonIds` 字段 |

后端需实现基于 `partyStatus` 和 `role` 的访问控制。

## 三、AI 本地部署需求

### 3.1 需求场景

| 功能 | AI 用途 | 模型要求 | 频率 |
|------|---------|---------|------|
| 经验提炼 | 从活动总结/考察记录中提炼可复用模式 | 中等推理能力（GPT-4 级别） | 低频（月度） |
| 通知智能路由 | 根据通知内容自动判定 `actionRequired` | 轻量分类模型 | 中频（每日） |
| 活动建议 | 根据历史数据推荐活动安排 | 轻量推荐模型 | 低频（月度） |

### 3.2 部署要求

- **模型**：1 个中等推理模型（7B-13B 参数）+ 1 个轻量分类模型
- **推理方式**：API 调用（HTTP POST），不需要实时流式
- **数据安全**：所有输入数据不外传，模型本地推理
- **成本预估**：学校计算中心 GPU 资源即可满足

### 3.3 接入方式

```
AI_API_BASE_URL = 'https://<计算中心提供的域名>/ai/v1'
// 调用方式：
// POST /ai/v1/completions  { prompt, max_tokens, temperature }
```

## 四、需要提供给学校计算中心的文档清单

| 文档 | 位置 | 内容 |
|------|------|------|
| 数据架构设计 | `content/04_web_design/DATA_ARCHITECTURE.md` | 全部数据模型定义、字段规格、DataAdapter 接口规范、API 路由设计 |
| API 适配器实现 | `docs/src/core/api-adapter.js` | REST API 完整路由映射（28 个端点），学校计算中心按此实现后端 |
| Mock 适配器实现 | `docs/src/core/mock-adapter.js` | DataAdapter 的 mock 实现，供参考数据结构和业务逻辑 |
| 数据访问抽象层 | `docs/src/core/data-adapter.js` | 统一切换机制（setDataSource），学校计算中心无需修改 |
| 运行时插槽 | `docs/src/services/runtime.js` | 初始化入口，注册适配器实例 |
| 认证流程说明 | `docs/src/services/auth.js` | 登录/注销/会话管理逻辑 |
| 可见性规则说明 | 本文档 §2.4 | 多级可见性的过滤逻辑 |
| AI 接入需求 | 本文档 §3 | AI 本地部署的场景和模型要求 |
| 前端页面清单 | `docs/` 目录 | 所有 HTML 页面及其功能说明 |

## 五、对接步骤建议

1. **第一步**：学校计算中心提供后端 API 环境（数据库 + API 服务器）
2. **第二步**：认证模块对接（用户表 + 登录 API）
3. **第三步**：核心数据模块对接（活动 + 考勤 + 考察）
4. **第四步**：通知 + 反馈模块对接
5. **第五步**：AI 本地部署环境搭建
6. **第六步**：全功能联调测试

> **注意**：每一步对接前，需要书记与学校计算中心确认技术规范和数据安全协议。
