---
title: "系统角色权限矩阵（代码键级权威）"
type: governance
role: "[工程师]+[AI]"
last_updated: "2026-09-05"
status: active
related_files: [ROLE_CLASSIFICATION.md, docs/src/core/constants.js]
---

# 系统角色权限矩阵（代码键级权威）

> **定位：** 本文件为**系统运行角色**（登录态/权限键/赋权链）的键级权威——角色键全表对齐 `docs/src/core/constants.js` 的 `ROLE_KEYS`/`ROLE_LEGACY_KEYS`，权限矩阵与赋权链对齐 `docs/src/services/auth.js` 的 `ROLE_PERMISSIONS`/`PROJECT_PERMISSIONS`/`AUTHORIZE_CHAIN`（`AuthStore.canDo`）。
> **文件角色分类体系**（[用户]/[工程师]/[AI] 标记）见 [ROLE_CLASSIFICATION.md](./ROLE_CLASSIFICATION.md)，两者为不同维度、勿混读。
> **双轨约定**：[COMMISSIONER_DUTY_FRAMEWORK.md](./COMMISSIONER_DUTY_FRAMEWORK.md) §C 为**逐操作位视图**（上传/确认/监督/备案），本文件为**权限键级视图**——详见 §9f 说明。
>
> **2026-09-05 迁出说明**：本节原为 ROLE_CLASSIFICATION.md §九（名实错位修复——文件角色分类与系统权限矩阵同住一文件），现拆为独立文件。数据流设计与界面实现路径见 [DATA_FLOW.md](../04_web_design/data/DATA_FLOW.md)。

> **待办派生语义**：具体活动/专班任务不与支委身份静态绑定；谁做什么 = 由该具体的人在该活动/专班承担的角色（组织者/执行者/组长）派生其待办并广播。本节矩阵是待办派生规则集，非静态全能授权；标注 `--` 表示仅因身份不会收到该键待办（除非其为该活动承担者）。

## 9a0. 角色键全表（代码层单一事实源，T-304 Q3 权限收敛 2026-08-29）

> **本表为角色键的权威清单**：对齐 `docs/src/core/constants.js` 的 `ROLE_KEYS`/`ROLE_LEGACY_KEYS`（10 业务键 + 3 遗留键 = 13 键全表），并登记 `constants.js` 角色→页面映射（ROLE_PAGE_MAP，2026-09 自 auth.js 迁入常量层，勿再引用 auth.js 内副本）与能力注册表 `requiredRoles` 的对应关系。新增角色键必须同步本表与 constants.js 两处。

| 角色键 | 中文标签 | 类型 | 工作台页面 | 能力 requiredRoles |
|---|---|---|---|---|
| `secretary` | 党支部书记 | 常设 | `workspace/secretary.html` | `secretary-workspace` |
| `deputy-secretary` | 党支部副书记 | 常设 | `workspace/secretary.html`（与书记同页） | `secretary-workspace` |
| `org-commissioner` | 组织委员 | 常设 | `workspace/org.html` | `org-workspace` |
| `prop-commissioner` | 宣传委员 | 常设 | `workspace/prop.html` | `prop-workspace` |
| `disc-commissioner` | 纪检委员 | 常设 | `workspace/disc.html` | `disc-workspace` |
| `leader` | 党小组组长 | 常设 | `workspace/leader.html` | `leader-workspace` |
| `participant` | 普通参与者 | 常设 | `workspace/visitor.html` | `visitor-workspace` |
| `party-staff` | 党委组织员 | 组织级 | `workspace/party-committee.html` | `party-committee-workspace` |
| `organizer` | 组织者（项目角色） | 项目 | 无独立页面（归入首页/工作台视图） | — |
| `deep` | 深度参与者（项目角色） | 项目 | 无独立页面 | — |
| `commissioner` | 条条委员（遗留键） | 遗留 | — | — |
| `initiator` | 发起人（遗留键） | 遗留 | — | — |
| `all` | 全体相关（兜底键） | 遗留 | — | — |

**语义约定**：
- **访客非角色**：未登录即访客（无角色键），`visitor` 仅为参与者工作台页面的 tab 前缀/待办聚合键，勿与「访客（未登录）」混淆。
- **`COMMISSIONER_ROLES` 两处语义区分**：constants.js 版指条条委员（三委员，不含书记/副书记，业务判定用）；auth.js 版指授权语义（含书记/副书记，赋权候选人排除支委用）。勿混用。
- **组织级角色（`party-staff`，2026-09-02 P1 党委后台增补）**：党委组织员/党务老师——院系党委组织级角色，监控全院各支部、管理支部实例，**不属于任一支部、不参与支部内部活动闭环**；因此不落入 §9b（支部常设 6 角色）与 §9c（项目角色）矩阵——矩阵为支部业务角色视图。其能力模块为 `party-committee-workspace`（工作台 `party-committee.html`）。
- **遗留键**仅保留兼容兜底，不参与权限判定；新功能不得新增遗留键。

## 9a. 活动写入门禁

> **来源：**[USAGE_POLICY.md](../03_doc_system/USAGE_POLICY.md) §1.3 — 术语权威源。

**写入门禁**：仅党支部书记、党支部副书记、党小组组长持有 `create_activity` 权限，可直接创建/修改活动数据（见 §9b 矩阵）；宣传委员、纪检委员不持有该权限，通过审核、确认、备案等流程间接参与。专班创建走 `initiate_taskforce`/`authorize_taskforce` 通道（组织委员持有，见 §9b）。

## 9b. 常设角色权限矩阵（6 角色 × 16 操作）

> 本矩阵对齐 `auth.js` 的 ROLE_PERMISSIONS。`Y` 表示有此权限；`--` 表示无此权限；`Y(限定语)` 表示有此权限但限定于特定语义。

| 角色 | view_all | create_activity | assign_task | modify_assignment | mark_complete | fill_review | record_attendance | summarize_inspection | record_inspection | manage_taskforce | initiate_taskforce | authorize_taskforce | authorize | assign_project_role | archive | manage_members |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 党支部书记 | Y | Y | Y | Y | Y | Y | -- | -- | Y(审阅) | Y | Y | Y | Y | -- | Y | Y |
| 党支部副书记 | Y | Y | Y | Y | Y | Y | -- | -- | Y(审阅) | Y | Y | Y | Y | -- | Y | Y |
| 组织委员 | Y | -- | -- | -- | -- | -- | -- | -- | Y(建档)（专班负责人上传位待身份编码） | Y | Y | Y | -- | -- | Y | -- |
| 宣传委员 | Y | -- | -- | -- | -- | -- | -- | -- | -- | Y | Y | -- | -- | -- | Y | -- |
| 纪检委员 | Y | -- | -- | -- | -- | --（纪检为该活动组织者时承担复盘（监督自己）；非组织者时收监督组织者复盘的审批待办） | Y | Y | Y(监督/只读+督办)（查看台账与督办待办，不上传不建档） | Y | Y* | -- | -- | -- | -- | -- |
| 党小组组长 | Y | Y | Y | Y | Y | Y | --（党小组活动考勤上传=该活动组织者 Y(考勤上传·追加提交)（组织者按活动身份；改/删走纪检确认流程），组长非组织者=本组监督位） | -- | Y(导入)（组长若为该活动组织者按组织者程序上传；非组织者时组长=监督位（督促该活动组织者上传）） | -- | -- | -- | -- | Y | Y(配合·本组活动组织者上下文交档) | -- |

\* 纪检委员的 initiate_taskforce：原则上可以，但业务上一般不使用。

> 附（2026-09-05 A1 落代码）：`dispatch_line`（条线下发）已授予组织/宣传/纪检三委员（auth.js `ROLE_PERMISSIONS`，canDo 可判定）；因交互流消费侧未建，不入上表 16 操作列——见 §9f 映射行与变更历史。

## 9c. 项目角色权限矩阵（2 角色 × 7 操作）

> 本矩阵对齐 `auth.js` 的 PROJECT_PERMISSIONS。项目角色仅在 `canDo(userId, action, {projectId})` 上下文中生效。

| 角色 | view_project | assign_task | modify_assignment | mark_complete | fill_review | record_inspection | assign_project_role |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 组织者 | Y | Y | Y | Y | Y | Y(导入) | Y |
| 深度参与者 | Y | -- | -- | Y | -- | -- | -- |

## 9d. 默认角色权限（1 角色 × 2 操作）

| 角色 | view_public | record_inspection |
|------|:---:|:---:|
| 普通参与者 | Y | --（本人素材走活动参与记录，2026-09-05 收敛） |

## 9e. 赋权链（AUTHORIZE_CHAIN）

> 本表对齐 `auth.js` 的 AUTHORIZE_CHAIN + AUTHORIZE_CHAIN 关联的权限名。

| 授权人 | 可赋权角色 | 权限名 |
|--------|-----------|--------|
| 党支部书记/党支部副书记 | 党小组组长（常设） | `authorize` |
| 党支部书记/党支部副书记 + 组织委员 | 组织者/深度参与者（专班） | `authorize_taskforce` |
| 党小组组长 | 组织者/深度参与者（项目） | `assign_project_role` |
| 组织者 | 深度参与者（项目） | `assign_project_role` |

## 9f. 权限名语义说明

| 权限名 | 语义 |
|--------|------|
| `view_all` | 查看所有活动（含考勤、考察） |
| `view_project` | 查看被赋权的项目（活动/专班） |
| `view_public` | 查看公开信息 |
| `create_activity` | 创建新活动 |
| `assign_task` | 分配任务给成员 |
| `modify_assignment` | 修改分工记录 |
| `mark_complete` | 标记任务完成 |
| `fill_review` | 填写活动复盘 |
| `record_attendance` | 记录考勤 |
| `summarize_inspection` | 汇总纪检检查记录 |
| `record_inspection` | 记录/导入/建档考察记录（按角色细分：导入/建档/汇总/自己的/审阅） |
| `manage_taskforce` | 修改/解散专班本身（非"作为组织者操作"） |
| `initiate_taskforce` | 创建新专班 |
| `authorize_taskforce` | 赋权专班成员（organizer/deep） |
| `authorize` | 赋权常设角色 leader |
| `assign_project_role` | 赋权项目角色 organizer/deep |
| `archive` | 归档操作 |
| `manage_members` | 管理成员（设为/取消组长） |
| `dispatch_line` | 条线下发（组织线/宣传线/纪检线职能任务下发，授予对应支委；与 `assign_task` 分两类；键级 2026-09-05 入集，交互流消费侧待建） |

> 另设「条线下发」（组织线/宣传线/纪检线职能任务下发，授予对应支委；与 `assign_task`（书记/副书记/组长派执行）分两类）。**键已入集（2026-09-05 A1 落代码）**：`dispatch_line` 授予组织/宣传/纪检三委员（auth.js `ROLE_PERMISSIONS`，canDo 可判定）；交互流（下发→上报→审核）消费侧待建，见本表 `dispatch_line` 行。

> **双轨约定（2026-09-05）**：[COMMISSIONER_DUTY_FRAMEWORK.md](./COMMISSIONER_DUTY_FRAMEWORK.md) §C = **逐操作位视图**（上传/确认/监督/备案等支部运行操作位，用户侧理解「谁在哪个环节做什么」）；本文件 = **权限键级视图**（角色键/权限键/矩阵/赋权链，代码侧判定依据）。两轨互补、以本文件键级为准。操作位 ↔ 权限键的完整映射属后续编码——「条线下发」键已入集（见上注 `dispatch_line`）；其余操作位位限定（建档/监督/导入/自己的/配合等）依赖写层业务守卫而非裸键，不硬凑缺键。

## 9g. 权限矩阵标记说明

- **Y** 表示有此权限（完整权限）
- **--** 表示无此权限
- **Y(审阅)** 表示仅能查看（不能编辑/记录）
- **Y(建档)** 表示仅限建立档案（基于已有记录建档，不能记录原始数据）
- **Y(汇总)** 表示仅限汇总分析（基于已有记录汇总，不能记录原始数据）
- **Y(导入)** 表示仅限从其他来源导入（不能直接记录原始数据）
- **Y\*** 表示原则上有此权限，但业务上一般不使用

## 变更历史

- **2026-09-05**：自 ROLE_CLASSIFICATION.md §九 迁出为独立文件（名实分离修复——该文件回归纯文件角色分类，本文件承担系统运行角色权限矩阵的键级权威）。迁出时同步修复：9a0 补 `party-staff`（党委组织员，组织级）行，真实对齐 constants.js `ROLE_KEYS`/`ROLE_LABELS`/`ROLE_PAGE_MAP`；9a0 登记表述改指 constants.js `ROLE_PAGE_MAP`（2026-09 已自 auth.js 迁入常量层）；9a 引用纠错（USAGE_POLICY §1.2.5 → §1.3）；9f 增补双轨约定（CF §C 逐操作位视图 ↔ 本文件键级视图）。
- **2026-09-05（A1 批1 落代码）**：`dispatch_line`（条线下发）键入集——授予组织/宣传/纪检三委员（auth.js `ROLE_PERMISSIONS`，canDo 可判定），9f 增映射行、9b 附注说明；交互流消费侧待建、不入 16 操作列（不硬凑列原则）。
- 前身沿革：本节原为 ROLE_CLASSIFICATION.md §九（PERMISSION_MATRIX.md → MANAGEMENT_MODE.md → ROLE_CLASSIFICATION §九，2026-07-08 迁入；2026-07-12 §九 重写 9a~9g；2026-08-29 增 9a0），历史记录见 ROLE_CLASSIFICATION.md §八 变更历史。
