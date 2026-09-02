---
title: "院系党委后台——支部多实例两级治理设计定案"
type: design
role: "[工程师]+[AI]+[书记]"
created: 2026-09-02
last_updated: "2026-09-02"
status: approved-by-secretary
related_files: [docs/src/core/domain.js, docs/src/mock/people.js, docs/src/mock/accounts.js, server/seed.js, server/db.js, docs/src/core/data-adapter.js, docs/src/core/constants.js, docs/src/services/auth.js, docs/src/modules/capabilities/]
---

# 院系党委后台——支部多实例两级治理设计定案

> 定位：光华管理学院党委（**院系级**，非全校）→ 动态支部多实例的两级治理架构。书记 2026-09-02 逐段批准（Part 1 架构 / Part 2 分期）。

## 1. 目标与边界

- **目标**：现单支部系统横向扩展为「学院党委（组织级）+ 动态支部（实例级）」两级；党委赋权给党支书、监控全院若干支部。
- **边界**：
  - 部署 = **同一套两级**（一个 server：党委登录见全院，支部成员只见本支部）。
  - 支部**不预设名字**：本科生党支部是当前实例；硕博等支部由党委在系统内创建/改名。
  - 党员**严格单支部**归属（跨支部走调转流程，v1 不做调转界面）。
  - 书记 = **职务动态绑定**（党委任命谁，谁即书记工作台），不再是固定演示账号。
- **非目标（YAGNI）**：支部级独立子域名/租户、跨支部数据互通、党员多归属。

## 2. 组织模型

```
学院党委（组织级 party-committee，新增）
 ├── 支部实例 br-b1（本科生党支部——现数据迁移入此）
 ├── 支部实例 br-xx（硕博等，党委创建，动态命名/类型可选）
 └── …
```

- 新表 `branches`：`id`（br-*）、`name`（党委命名）、`type`（可选类别标签，不预设枚举则留自由文本）、`secretaryId`（现任书记 personId，P2 后由任命驱动）、`createdAt`、`status`。
- 现有 users/members/activities/notices/taskforces/attendance… 全部数据域加 `branchId`。

### 2.5 支部配置档案（开源通用性 · 2026-09-02 书记补充）

不同支部特点不同（本科/硕博），系统作为开源通用体，**支部 = 从已注册能力单元中排列组合出自己的工作流**。机制复用既有能力注册表（modules/capabilities/* 自注册 + scenario 引擎），不新造核心单体。

每个支部实例挂 `config`（branches.config JSON）：
- `headerTitle`：支部名（header 标题**软编码**，随支部更换显示，不硬编码"光华本科生党支部"）
- `accent`：支部主题色（可选，默认党建红不变）
- `enabledModules: [capability/scenario id 列表]`：该支部启用的功能模块与 SOP 场景（从已注册能力池勾选）——支部 profile 决定其工作台 tab 组成与可用工作流；默认 profile = 现 46 功能全开（兼容现有演示）
- `fileSpaceIsolated: true`：**支部文件（branchDocs）与附件一个支部一个独立存储空间**——存储/查询按 branchId 分区，跨支部不可见（P1 落地）
- 党委可在支部管理里调整 config（换 header/主题/启停模块）——支部是"配置驱动的实例"而非"同构复制品"

工作流匹配：支部内 decision-tree/sop-scenarios 消费自身 config.enabledModules 的子集（如硕博支部不需要"本科积极分子考察节奏"的 scenario 则不启用），场景引擎已注册式可配，仅需支部级过滤。

## 3. 两级角色与可见范围

| 级 | 角色 | 范围 | 核心能力 |
|---|---|---|---|
| 党委 | 党委组织员 / 党务老师（新 `party-staff`） | 全院全部支部 | P1 监控台账 + 支部管理；P2 书记任命；P3 审批+下发 |
| 支部 | 现有七类（书记/副书记/三委员/组长/成员） | 本支部 | 现有 46 功能不变 |

- 支部内书记身份 = `branches.secretaryId` 指向的人（P2 任命流程维护）；系统对"书记工作台"的访问判定从"固定 u_sec"改为"本人是某支部现任书记"。
- 公共页/搜索/首页按 branchId 隔离（党委不占支部流量）。

## 4. 数据模型变更（横向扩展）

1. `branches` 表（见 §2）。
2. users（accounts/people）与全数据域加 `branchId`；mock 种子两级化（新增党委演示账号 + 现有支部挂 br-b1）。
3. server：seed 两级导入（`branches` + 各域带 branchId）；快照/resource 表加 `branchId` 过滤；auth 判定两级。
4. 前端：党委工作台（新 capability `party-committee-workspace`）；数据请求/快照按当前用户 org 范围过滤；支部数据隔离在 services 层收敛（勿散落各 tab）。

## 5. 功能分期

- **P1 支部多实例 + 党委监控台账**：branch 落地 + 现数据迁移 br-b1；党委账号与工作台；监控台账（各支部成员规模/三会一课/主题党日/发展党员进度/思想汇报/书记任期状态）+ 支部列表管理（创建/改名）；数据隔离生效。验收：党委登录见全院两视图、支部登录只见本支部；现有 89 测试全绿 + 新增两级相关测试。
- **P2 书记任命与任期**：党委任命/撤换书记 → 书记工作台动态绑定被任命人；任期记录（改选换届档案）。验收：任命某成员后其登录即书记台、原书记降回成员/副书记；任期历史可查。
- **P3 党委指导审批 + 下发通知**：党委对支部关键事项审批（范围待 P2 后定：优先发展党员相关节点/重要活动报备）；党委下发通知/提醒 → 支部全员可见。验收：双向通道闭环。

## 6. 演示与基线

- mock 升级 "1 党委 + 1 支部（br-b1）"：新增党委演示账号，现有支部演示数据/功能完全保留。
- 测试基线 89 保持全绿；新增党委功能各自 E2E。
- 版本串纪律照旧（每期 bump）。

## 7. 风险与原则

- **最大改动面**：全数据域加 branchId（触及 46 功能的数据读写）——P1 只做"维度落地 + 隔离生效"，功能行为不变。
- **书记机制变化影响演示/测试**：P2 前保持 u_sec 可访问书记台（任命绑定与固定账号并存过渡，P2 切换）。
- 隔离在 services 层收敛，勿在各 tab 手写过滤（防漂移）。
- 新能力注册式（modules/capabilities/ 新增 party-committee-workspace），勿增核心单体。

## 8. 验收（P1 里程碑）

1. 党委登录 → 支部列表 + 任一支部监控台账可见；支部成员登录 → 本支部数据可见、他支部不可见（浏览器实测）。
2. 创建新支部 br-test → 可在台账管理；其数据独立。
3. 全量 89 测试全绿 + 新增（多支部隔离 / 党委台账 / 支部创建）E2E。
