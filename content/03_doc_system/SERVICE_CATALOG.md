---
title: "统一服务目录"
type: governance
role: "[工程师]+[AI]"
last_updated: "2026-09-05"
version: "4.0"
status: active
related_files: [docs/src/services/auth.js, docs/src/services/runtime.js, docs/src/core/data-adapter.js, content/04_web_design/data/DATA_MODEL.md, content/04_web_design/data/DATA_FLOW.md, content/02_institution/COMMISSIONER_DUTY_FRAMEWORK.md, content/02_institution/SYSTEM_ROLE_PERMISSION.md]
---

# 统一服务目录（Service Catalog）

> **定位：** 本文件汇总系统所有服务功能及其角色权限映射，作为功能盘点和权限设计的统一参考。
>
> **受众：** [工程师]+[AI] — 工程师决策参考 + AI 自主读取作为实施上下文。
>
> 引用流程：[USAGE_POLICY.md §一](./USAGE_POLICY.md)（术语与使用规范，含 2026-09-03 书记裁定）→ [DATA_MODEL.md](../04_web_design/data/DATA_MODEL.md)（数据模型）→ [COMMISSIONER_DUTY_FRAMEWORK.md](../02_institution/COMMISSIONER_DUTY_FRAMEWORK.md)（支委系统）→ [系统角色权限矩阵](../02_institution/SYSTEM_ROLE_PERMISSION.md)（SYSTEM_ROLE_PERMISSION.md）
>
> **阅读约定**：本目录只盘点「有哪些服务、由哪些代码实现、谁有权限」。服务间数据流与依赖见 [DATA_FLOW.md §1.3](../04_web_design/data/DATA_FLOW.md)；页面路由与入口映射见 [ARCHITECTURE.md §五](./ARCHITECTURE.md)；权限矩阵权威源为 [系统角色权限矩阵 §9b](../02_institution/SYSTEM_ROLE_PERMISSION.md)。

---

## 一、服务清单

> 文件路径均相对于 `docs/src/`（`server/routes/` 后端路由单独标注）。
>
> **范围声明**：本表为**主要服务索引**（非全量枚举，随系统演进补充）——**全量以 [`docs/src/services/`](../../docs/src/services/)（前端）与 [`server/routes/`](../../server/routes/)（后端）目录实际文件为准**。
>
> 关联制度缩写：CF=[COMMISSIONER_DUTY_FRAMEWORK.md](../02_institution/COMMISSIONER_DUTY_FRAMEWORK.md)、DA=[DATA_MODEL.md](../04_web_design/data/DATA_MODEL.md)（数据模型；数据流见 DATA_FLOW.md）、FLAT=[FLAT_ORGANIZATION_DESIGN.md](../02_institution/FLAT_ORGANIZATION_DESIGN.md)、RC=[SYSTEM_ROLE_PERMISSION.md](../02_institution/SYSTEM_ROLE_PERMISSION.md)（系统角色权限矩阵，9a0~9g）、PC=[PARTY_COMMITTEE_DESIGN.md](../04_web_design/evolution/PARTY_COMMITTEE_DESIGN.md)（党委后台 P1-P3）；其余为 [sop/](../02_institution/sop/) 制度指南。

| 服务 | 服务文件 | 入口页面 | 核心操作 | 关联制度 |
|------|---------|---------|---------|---------|
| 活动管理 | `services/runtime.js`（BranchService 插槽）+ `services/decision-tree.js` + `services/activity.js`（读） | `workspace/secretary.html`、`workspace/leader.html` | 创建/编辑/发布/归档/品牌标签；决策树式创建引导（三会一课 / 主题党日，含共建性质、是否外出、活动载体三正交维度） | CF §审批 §一 |
| 专班管理 | `services/taskforce.js` | `workspace/org.html` | 创建/招募（赋权）/运行跟踪/解散/工作量汇总 | CF §A.4/§A.6/§A.7 + CF §审批 §二 |
| 分工记录 | `core/data-adapter.js`（assignments 主源）+ `services/auth.js`（syncProjectRoles） | 工作台分工闭环（leader/secretary） | 指派分工/跟踪完成度/标记完成/逾期检测/提交参与角色确认 | DA §2.6（AssignmentRecord）+ FLAT |
| 考察记录 | `services/inspection.js` | `workspace/disc.html` | 上传/修改/确认录入总表/类别标签/超期提醒/单一活动或人员查询 | CF §C.1a + DA §2.5.1（InspectionRecord） |
| 考勤管理 | `services/attendance.js` | `workspace/disc.html` | 上传/修改/确认+录入总表/总表修改/超期提醒/单一活动或人员查询 | CF §C.1a + CF §审批 §四 |
| 补课管理 | `services/makeup.js` | `workspace/disc.html` | 自动生成补课任务/标记完成+回写考勤/导出统计 | [纪检委员工作流程指南](../02_institution/sop/纪检委员工作流程指南.md) |
| 复盘服务 | `services/review.js` | `workspace/disc.html` | 提交复盘/批注/打回/确认/超期提醒（未提交 → 已上传 → 批注中 → 确认/打回） | CF §审批 §五 + CF §C.1a |
| 发展党员 | `core/domain.js`（developStage 四阶段）+ `core/data-adapter.js`（持久化） | `workspace/org.html` | 查看候选人列表/修改阶段状态/上传更新材料/标记缺失并提醒（思想汇报已数字化并实现：`services/thought-report.js` 提交即入库即归档，组织委员查看/调用——2026-08-30 书记决策） | [组织委员工作流程指南](../02_institution/sop/组织委员工作流程指南.md) + CF §C.1b |
| 档案宣传 | `core/data-adapter.js`（imageRecords 聚合）+ `modules/references.js` | `workspace/prop.html` | 档案归档/材料标准/模板管理/周报报送/图片上传与标注/接收考勤备案 | [宣传委员工作流程指南](../02_institution/sop/宣传委员工作流程指南.md) + CF §C.1b |
| 人员管理 | `services/person.js` | 各工作台（人才库/人员选择） | 人员查询/名称解析/档案展示 | — |
| 待办服务 | `services/todo.js` | 各工作台 | 待办派生/标记完成/按分类展开收起（幂等去重） | — |
| 书记总览 | `services/secretary-overview.js` | `workspace/secretary.html` | 全局统计/总览待办派生 | — |
| 认证服务 | `services/auth.js`（AuthStore） | `login.html`（全站共用） | 登录态管理/赋权记录 CRUD/角色-页面映射（ROLE_PAGE_MAP） | — |
| 权限服务 | `services/auth.js`（canDo + ROLE_PERMISSIONS）+ `services/roles.js` | 全站共用（侧边栏身份视图） | 统一角色选择/权限判定/角色赋权共享 | RC §9a0/9b/9e |
| 通知服务 | `services/notice.js` | `index.html`、各工作台 | 发布/阅读/删除/审批流程关键节点触发 | — |
| 反馈服务 | `services/issues.js` + `services/milestones.js` | `feedback.html` | 成员提交/书记全权流转（GitHub Issue 风格：列表/详情/新建） | — |
| 归档检索 | `core/data-adapter.js`（只读聚合） | `archive.html`、`search.html` | 归档库（列表+画册视图）/全量资料查询 | — |
| 会议议程编辑 | `services/agenda-editing.js` | 活动详情（三会一课议程编辑） | 议程结构化事项的纯数据处理：保持业务字段不被 UI 编辑覆盖 | — |
| 会议议程会后衔接 | `services/agenda-follow-up.js` | 活动详情（会后） | 记录「通过/不通过」→ 派生文件/成员变更动作；支部党员大会做出席/赞成过半数硬校验 | — |
| 线上支委会表态 | `services/committee-vote.js` | 活动详情（表决区块） | 委员异步表态（同意/异议/附言）→ 书记汇总 → 截止锁定（votesLocked 写入活动） | — |
| 支部服务 | `services/branch.js` | `workspace/party-committee.html` | 支部边界收敛点：人→支部归属、支部配置档案（header/主题/启停模块/工作地图/产出块策略） | PC（P1 支部实例） |
| 书记任命 | `services/appointment.js` | `workspace/party-committee.html` | 任命 + 任期记录闭环（现任记录封口 → 新建现任；换届档案可查），双方 users.role 同步 | PC（P2 书记任命） |
| 支部上报审批 | `services/review-request.js` | `workspace/party-committee.html`（党委审批侧） | 支部书记上报（发展党员关键节点/重要活动报备）→ 党委逐项审批（approve/reject + 意见）→ 支部侧可见结果 | PC（P3 上报审批） |
| 报名登记 | `services/signup.js` | 活动/专班详情（报名区块） | 统一报名渠道：participant 报名即加入；organizer/deep 报名 + 发起人审核（pending → 通过/拒绝） | — |
| 外发确认 | `services/external-dispatch.js` | 各工作台（任务/材料外发） | 发送方标记「已通过微信发送给 XX」→ 接收方工作台「确认收到」→ 可审计闭环（谁/何时/发给谁/何时确认） | — |
| 三委数据交接 | `services/handoff.js` | disc/prop/org 工作台 | 交接生成 → 自动为接收方派生待办 → 确认 → 待办销项 + 状态落库（双向可追溯） | CF §E.2（数据交接协议） |
| 思想汇报 | `services/thought-report.js` | `workspace/visitor.html`（提交）、`workspace/org.html`（查看/调用） | 提交即入库即归档：按 personId 算法自动归集至个人档案，无人工归档环节 | [组织委员工作流程指南](../02_institution/sop/组织委员工作流程指南.md) |
| 全员可见性矩阵 | `services/visibility.js` | 全站共用（数据维度投影） | 「谁看谁」可见性投影（L0 个人 / L1 条线 / L2 全局）；看 ≠ 做，不授予操作权 | RC §9b + P-011（SECRETARY_DIRECTIVES） |
| 表决配置 | `services/vote-config.js` | 活动创建（表决配置区块） | voteConfig 解析与场景默认：deliberative（交流式）/ formal（正式表决）参数化（optionSet/quorumCheck/voterScope） | — |
| 支部分工提议 | `services/workforce.js` | `workspace/secretary.html`（支部分工）、各工作台概况（履职卡） | 改派提议（可会前草稿）→ 生成支委会议题 → 支委经表决 UI 表态（门槛：应到 2/3 且无异议，2026-09-05）→ 书记采纳生效 → 合并 config.workforce 落库 → 各工作台概况「支部安排·我的分工」履职卡可见 | BRANCH_WORK_MAP.md（L4 M2 闭环） |
| Mock 服务层 | `services/mock.js` | （数据基础设施） | Mock 持久化/种子引擎（saveDB/loadDB/seed 同步收敛至 core/mock-adapter.js） | — |
| 线上表决 API | `server/routes/committee.js` | `/api/v1/agenda-votes`（API） | 异步表态提交/汇总/截止锁定服务端（voteConfig 校验；角色名单单一源 constants.js） | 与前端 committee-vote 配套 |
| 成员变更审批 API | `server/routes/member.js` | `/api/v1/member-change-requests`（API） | 成员变更申请 → 组织委员审批 → 全体支委广播 → 书记确认 → 更新 developStage | [组织委员工作流程指南](../02_institution/sop/组织委员工作流程指南.md) |
| 数据上报 API | `server/routes/report.js` | `/api/v1/report`（API） | 四域（member/activity/attendance/study）JSON 拉取 / CSV 导出 / 触发推送 | DEPLOYMENT_GUIDE.md（数据上报对接） |

---

## 二、角色-服务权限矩阵

> **权威源**：[系统角色权限矩阵 §9b/§9c](../02_institution/SYSTEM_ROLE_PERMISSION.md)（操作粒度权限矩阵）。本表为该权威源在服务粒度上的切面视图，冲突时以权威源为准。
> 行：服务；列：9 个角色。单元格：M=管理权限 / R=只读 / Self=仅自身 / —=无权限。党支部副书记与党支书同权，共享书记工作台（`workspace/secretary.html`）。

| 服务 | 党支书 | 副书记 | 组织委员 | 宣传委员 | 纪检委员 | 党小组组长 | 组织者 | 深度参与者 | 普通成员 |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 活动管理 | M | M | R | R | R | M | M* | Self | R |
| 专班管理 | M | M | M | R | R | R | R | R | — |
| 分工记录 | M | M | R | R | R | M | M | Self | — |
| 考察记录 | M | M | R | R | M | M† | M† | Self | Self |
| 考勤管理 | M | M | R | R | M | M† | M† | R | Self |
| 补课管理 | M | M | R | — | M | R | R | Self | Self |
| 复盘 | M | M | — | — | M | R | R | — | — |
| 发展党员 | M | M | M | R | R | — | — | — | — |
| 档案宣传 | M | M | M‡ | M | R | — | — | — | — |
| 待办 | M | M | M | M | M | M | Self | Self | Self |
| 人员 | M | M | M | R | R | R | — | — | — |
| 书记总览 | M | M | — | — | — | — | — | — | — |
| 认证服务 | M | M | M | R | R | M | Self | Self | Self |
| 权限服务 | M | M | M | M | M | M | R | R | R |
| 通知服务 | M | M | M | M | M | R | R | R | R |
| 反馈服务 | M | M | R | — | — | 提交 | 提交 | 提交 | 提交 |
| 归档检索 | R | R | R | R | R | R | R | R | R |

**注释**：

- **\*** 组织者对活动管理的 M 权限仅限被赋权的活动范围内（不能独立创建活动，只能在承包活动内做分工记录闭环）。
- **†** 党小组组长 / 组织者对考勤、考察的 M 权限仅限"上传 / 修改党小组活动表单"；总表的确认 + 录入 + 修改权归纪检委员。
- **‡** 组织委员对档案宣传的 M 权限仅限"制度文件引用增删"，档案归档 / 材料标准 / 模板管理归宣传委员。

---

## 三、权威源与配套文档

- **服务间数据流与依赖**：[DATA_FLOW.md §1.3](../04_web_design/data/DATA_FLOW.md) — 端到端数据流交织图（活动上下文链 + 副产物聚合 + 赋权 → 工作台 → 入档），含挂靠 / 聚合双语义
- **权限矩阵权威源**：[系统角色权限矩阵](../02_institution/SYSTEM_ROLE_PERMISSION.md)（SYSTEM_ROLE_PERMISSION.md）— 角色 × 操作矩阵（§9b/§9c）+ 赋权链 §9e + 权限名语义 §9f
- **页面路由与入口映射**：[ARCHITECTURE.md §五](./ARCHITECTURE.md) — 仓库结构（10 根 HTML + workspace/ 7 工作台 + 入口 JS）
- **支委系统设计**：[COMMISSIONER_DUTY_FRAMEWORK.md](../02_institution/COMMISSIONER_DUTY_FRAMEWORK.md) — 专班生命周期 + §C 权限矩阵 + §审批流程规范
- **数据模型与数据流**：[DATA_MODEL.md](../04_web_design/data/DATA_MODEL.md)（静态模型）+ [DATA_FLOW.md](../04_web_design/data/DATA_FLOW.md)（动态数据流）
