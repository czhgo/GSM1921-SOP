---
title: "院系党委后台——支部多实例两级治理设计定案"
type: design
role: "[工程师]+[AI]"
created: 2026-09-02
last_updated: "2026-09-09"
status: approved-by-secretary
related_files: [docs/src/core/domain.js, docs/src/mock/people.js, docs/src/mock/accounts.js, server/seed.js, server/db.js, docs/src/core/data-adapter.js, docs/src/core/constants.js, docs/src/services/auth.js, docs/src/modules/capabilities/]
---

# 院系党委后台——支部多实例两级治理设计定案

> **性质：设计图与方向选择说明**（为什么这样做、选了什么方向）。
> 执行路线图（怎么一步步落地）另置过程 spec（`.trae/specs/`，**用后即删**）；落地过程台账在 `.ctx/logs/`。本文档为常驻设计记录，**不承载执行步骤、测试清单与过程台账**。

> 定位：光华管理学院党委（**院系级**，非全校）→ 动态支部多实例的两级治理架构。书记 2026-09-02 逐段批准（Part 1 架构 / Part 2 分期），P3 范围与形态 2026-09-03 裁定。
>
> **落地状态（P1~P3 代码/测试已入仓）**：党委台 tabs 在 `docs/src/entries/tabs/party-committee/`——monitor-tab.js（P1 支部监控台账）、branches-tab.js（P1 支部管理 + P2 书记任命；任命链 `docs/src/services/appointment.js`）、party-config-tab.js（§2.5 支部配置收拢：config.modules/blocks 启停）、review-tab.js（P3 上报审批）、dispatch-tab.js（P3 下发通知）；测试：`server/test/party-committee.test.mjs`（P1+P2 E2E）、`server/test/party-committee-review.test.mjs`、`server/test/party-committee-dispatch.test.mjs`（P3 双向通道）。

## 0. 方向选择说明（书记 2026-09-02 逐项决策记录）

| 决策点 | 选项 | 书记裁定 |
|---|---|---|
| 接入范围 | 真实接入学院党委 / 通用模板 / 只读监控 | **真实接入学院党委**（院系级非全校；硕博等支部**不预设名字**，由党委动态创建） |
| 党委核心职责 | 监控/任命/审批/下发 | **四项全选**（v1 完整双向治理闭环） |
| 部署形态 | 同套两级 / 两套独立 / 同套预留拆分 | **同一套两级**（一个 server，党委见全院、支部见本支部） |
| 党员归属 | 严格单支部 / 允许多支部 | **严格单支部** |
| 书记机制 | 职务动态绑定 / 先台账后绑定 | **职务动态绑定**（任命谁谁即书记工作台） |
| 架构路径 | A 原地横向扩展 / B 党委独立系统 / C 支部模板参数化 | **A 原地横向扩展**（复用全部支部功能、党员数据零迁移；B 被否因要同套，C 过重 YAGNI） |
| 支部差异 | 同构复制 / **配置驱动实例** | **配置驱动实例**：支部从已注册能力模块中排列组合自己的工作流（见 §2.5）；支部文件 branchDocs 一支部一存储空间 |
| 品牌 | 硬编码单支部名 / **header 软编码** | **header 软编码**（支部名/主题随支部配置更换） |
| P3 上报审批范围（2026-09-03） | 细粒度节点 / 仅活动报备 / **发展节点+活动报备** | **发展节点+活动报备**：「发展节点」泛化（确定积极分子/发展对象、接收预备、转正等一节点一报），不细分字段；重要活动走「活动报备」 |
| P3 下发承载（2026-09-03） | 新建「下发箱」领域 / **复用通知** | **复用通知**：通知实体加 `audience:'committee'` + `branchId` 受众过滤与「党委下发」来源徽标——送达=目标支部**支委层**，普通党员/党委组织员（非支委）不打扰；支部不可在自发通知管理区删改上级下发 |
| P3 入口落点（2026-09-03） | — | 支部侧=书记工作台新 tab「上报党委」；党委侧=独立 tab「上报审批」与「下发通知」——上报/下发两向入口分离，互不混淆 |
| L2 工作流模块配置权（2026-09-03） | 党委代配 / **支部自治（书记操作）** | **支部自治**：config 工作流模块由**本支部现任书记**在书记工作台「工作台配置」操作（清单 chips 启停 + 画布拖拽排序），党委不代配（党委只管建支部/任命/审批/下发） |
| L2 配置粒度与策略（2026-09-03） | — | 最小单位=**工作台 tab**（能力为分组容器）；**默认全开**（config.modules=null，46 功能兼容）；**核心组固定**（待办/概况等 groupLabel='工作台' 不可关）；服务端 PATCH /branches/:id/config 仅本支部现任书记/party-staff，白名单收 **config.modules / config.blocks / config.workforce 三组**（blocks 含 workflowBlocks.hiddenBlockIds，见 [WORKFLOW_BLOCK_CONTRACT.md §七 S3](WORKFLOW_BLOCK_CONTRACT.md)；workforce 见 [BRANCH_WORK_MAP.md M0](BRANCH_WORK_MAP.md)；治理字段不可经此改） |

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
- 核心数据域挂 `branchId`（users/people/activities/taskforces 等）；**落地口径**：存量数据迁入 br-b1，老数据缺省视为 br-b1（惰性维度迁移，不逐行回填）；支部内隔离一律收敛于 `services/branch.js`（`getBranchIdOfPerson`/`withinBranch`），各 tab 不手写过滤（防漂移）。

### 2.5 支部配置档案（开源通用性 · 2026-09-02 书记补充）

> **2026-09-09 审定定稿**：modules 维护权/操作位随批3/批4 收口（副书同权 2026-09-09；操作位迁「设置 → 支部治理」+ 换组织向导内嵌），档案清单补 workforce/blocks/org 档案(desc/themePreset)/policyOverrides 与 configChangeHistory 留痕语义——颗粒度分层与变更流总述见新增 §2.6。

不同支部特点不同（本科/硕博），系统作为开源通用体，**支部 = 从已注册能力单元中排列组合出自己的工作流**。机制复用既有能力注册表（modules/capabilities/* 自注册 + scenario 引擎），不新造核心单体。

每个支部实例挂 `config`（branches.config JSON）：
- `headerTitle`：支部名（header 标题**软编码**，随支部更换显示，不硬编码"光华本科生党支部"）
- `accent`：支部主题色（可选，默认党建红不变）
- `desc` / `themePreset`：支部自述（可选）与主题预设 id（null=默认红调）——组织档案域（净化/白名单见 `config-clean.js` `sanitizeConfigOrg`，写口=换组织向导步骤①）
- `modules`（L2，2026-09-03 定案）：工作流模块配置 `{ hiddenTabIds: string[], tabOrder: string[] }`，**null=默认全开**（46 功能兼容）。最小单位=工作台 tab；核心组（groupLabel='工作台'：待办/概况等）固定不可关、不参与排序。**维护权=本支部现任书记/副书记同权（2026-09-09 书记批·副书同权）**——操作位=**设置（侧边栏右下）→ 支部治理**（「工作台默认顺序」卡直存；「支部信息与向导」卡内嵌换组织向导②模块/块组合，chips 启停）；原「书记工作台 · 工作台配置」tab 表述随批3 迁移废止；党委不代配。
- `blocks`：活动产出块 / 工作流块显隐（`outputBlocks` / `workflowBlocks`，null=全开；2026-09-03 定案）——与 modules 同维护权/操作位（向导②内改），目录源 = constants `OUTPUT_BLOCK_DEFS` / `BLOCK_MANIFESTS`
- `workforce`：模块分工归属 `{ [moduleId]: { ownerType:'role'|'person', ownerId } }`（null=缺省分工，SOP 责任人列；目录源 = work-map）——**日常调整走支委会议题（M2）表决通过后落库；换壳/部署期可向导③直写**（见 [BRANCH_WORK_MAP.md](BRANCH_WORK_MAP.md)）
- `policyOverrides`（L2 域参数，2026-09-09 书记批）：白名单覆盖 `POLICY_OVERRIDABLE`（纪检超期 / 组织滞留复核窗 / 组长学期提醒三键）——域负责人仅本域、书记/副/party-staff 全量，读侧注入全站判定随参数生效
- `configChangeHistory`：config 写留痕（`{by,at,what,from?,to?}`，逐键 diff 追加、空变化不冗余）——modules/blocks/workforce/org 档案/policyOverrides/建支部/配置导入复制全部写口共用（随 2026-09-09 审计内核收口，详见 §2.6 变更流）
- `fileSpaceIsolated: true`：**支部文件（branchDocs）与附件一个支部一个独立存储空间**——存储/查询按 branchId 分区，跨支部不可见（P1 落地）
- 支部配置的**治理字段**（name/type/secretaryId/status）由党委管理（改名/任期），与书记/副书记可写的 config 各域分离（服务端白名单）：`PATCH /branches/:id/config` 只收 modules/blocks/workforce/org 档案/policyOverrides，治理字段仅通用 branches PATCH（party-staff，见 §2.6 旁路行）。

工作流匹配：支部内 decision-tree/sop-scenarios 消费自身 config.modules 显隐后的工作流集合（如硕博支部不需要的模块由书记在本支部配置中停用），场景引擎已注册式可配，仅需支部级过滤。

> **远期形态**：config 的"清单/画布组合"将演进为「工作流块拖拽编排」（支部把已注册的工作流块拖进画布 → 自动写回 modules 与场景清单）——见 [ARCHITECTURE_EVOLUTION.md](ARCHITECTURE_EVOLUTION.md) §八（开源项目目标）。数据模型不变，块即注册表中的能力+元数据。

### 2.6 配置颗粒度与变更流分层（2026-09-09 起草 · ⚠️ DRAFT 待书记审定）

> **一句话**：支部 config 档案语义单一权威 = 什么能改、谁能改、改在哪留痕，按颗粒度分六层 + 党委治理字段旁路；「改得到」与「改不动」的分界由源码层固化（policy-defaults `kind` / `POLICY_OVERRIDABLE` / config-clean 白名单 / server 守卫），UI 层不写第二套规则。设置中心分层注释同口径（`settings-entry.js` 批4 注释：「支部制度参数（L3）= 制度默认只读锁定展示……域参数（L2）= 各域负责人可见可调自己域」）。

#### 分层矩阵（写权与留痕 · 自个人到制度逐层刚性递增）

| 层 | 内容 / 键 | 写权（谁 · 操作位） | 生效 / 留痕 | 变更通道 |
|---|---|---|---|---|
| ① 个人偏好层 | 外观（字号/主题/强调色）、「我的工作台」tab 顺序 | 本人（设置左栏「个人设置」即见即改） | 即时生效；仅存本机 `gsm1921-pref-<personId>-…`（localStorage，theme 同键空间约定）——**无留痕**（见不对称明示） | 设置页直存（preferences.js / appearance-controls.js）；恢复默认=删键 |
| ② 支部 config · 组织档案层 | `headerTitle` / `desc` / `themePreset`（config 域） | 现任书记/副书记（本支部 · 副书同权 2026-09-09）或 party-staff；**顶层 `name` 治理字段仅 party-staff**（书记/副不可改官方名；改名同步 headerTitle） | 保存即生效；追加 configChangeHistory | 换组织向导①（设置 → 支部治理 → 支部信息与向导 内嵌，或 wizard.html 独立页） |
| ③ 支部 config · modules/blocks | `modules`（tab 默认序/显隐）、`blocks`（产出块/工作流块显隐） | 现任书记/副书记（本支部 · 副书同权）或 party-staff；**核心组固定**不可关、不参与排序 | 保存即生效（成员下次进入工作台生效）；留痕 | 设置 → 支部治理「工作台默认顺序」卡直存 / 换组织向导② chips；null=默认全开 |
| ④ 支部 config · workforce | `workforce`（模块分工归属） | 现任书记/副书记（本支部 · 副书同权）或 party-staff | 落库即生效；留痕 | **日常** = 书记台「支部分工」**支委会议题（M2）表决通过后落库**；**换壳/部署** = 向导③直写 |
| ⑤ 域参数层 L2 | `config.policyOverrides`（白名单 `POLICY_OVERRIDABLE` 三键：纪检超期 `inspection.overdueDays` / 组织滞留复核窗 `memberConfirmation.semesterDetainedWindows` / 组长学期提醒 `leader.semesterReportReminder.enabled`） | 域负责人**仅本域**（纪检/组织/组长，设置左栏「域参数」卡）；书记/副书记/party-staff **全量** | 保存即生效（读侧注入 `applyEffectivePolicyDefaultsForPerson` 覆盖 `POLICY_DEFAULTS`，全站判定随参数走）；留痕 | 设置 → 支部治理「域参数 · 纪检/组织/组长」卡；值 = 覆盖、null = 恢复该域默认 |
| ⑥ 制度刚性层 L3 | 制度默认（展示位）锁定的五组：票决门槛 / 应到口径 / 会议考勤类型 / 记录人 / 标因 | **只读展示**（书记/副视角，设置 → 支部治理「支部制度参数」卡）——无在线写权 | 不产生 config 变更 | 改须党委/书记裁决后**源码层变更**（policy-defaults.js 字面量及消费点）；放开为支部可调须走「放行程序」 |
| 旁路 · 党委治理字段 | branches 顶层 `name` / `type` / `secretaryId` / `status` | **仅 party-staff**（党委台支部管理/任命/建支部）——书记/副不可经设置改 | 不入 config 域；顶层改名经 org 写口记一条 history（what=name），secretaryId 走任命链 | 党委台「支部管理 / 书记任命」；建支部 = 空模板/复制（向导「新建支部…」与党委台同口，仅 party-staff） |

> 代码守卫同口径：server `PATCH /branches/:id/config`（fullRights = party-staff / 本支部现任书记 / 本支部副书记；域负责人仅本域 policyOverrides）与前端 `services/branch.js`（updateBranchModules / updateBranchBlocks / updateBranchWorkforce / updateBranchOrg / savePolicyOverrides / canManagePolicyOverrides）同一语义——两侧不写第二套规则。

#### 词条收口（从展示到覆盖，逐层收窄）

- **制度默认（展示位）**：policy-defaults 各键在设置页「支部制度参数」卡的只读展示值（书记/副视角）——「现行口径」的展示层，数据单一源 = policy-defaults（含域参数默认行）。
- **`branch-default`（kind）**：源码默认档位 = **按支部制度可调整**的默认（开源部署换壳面）——**不自动进设置**（当前形态 = 换壳工作单指引源码改）；要「进设置可调」须另行书记裁决并登记白名单（见放行程序）。
- **`institutional`（kind）**：**制度裁决固定**项（记录人 / 标因 / 上传位例外等）——不因支部而异，**改须党委/书记裁决**后源码层变更。
- **域参数（L2）**：`branch-default` 中**登记 `POLICY_OVERRIDABLE` 的子集**——唯一可经 UI 覆盖的一档（域负责人本域 / 书记副与 party-staff 全量）；白名单外一律不可经 UI 写。

> 收口判定（自顶向下三问）：① 设置页只读列出（制度默认展示位）→ ② 键的 `kind` 决定源码默认可否按支部制度调整（branch-default）或锁定（institutional）→ ③ 是否在 `POLICY_OVERRIDABLE` 决定能否经 UI 覆盖（域参数）。三层全过才有设置页可调控件；否则改 = 源码层变更（须裁决，走换壳工作单人工替换）。

#### 放行程序（把某制度项放开为「支部可调」的唯一路径）

某项现为制度默认 / `branch-default` 未登记白名单、或 `institutional` 项，要放开为支部可在设置页调节：

1. **书记裁决**（出具依据编号，如附录 / 决策记录编号）；
2. 登记 `POLICY_OVERRIDABLE`（policy-defaults.js：path / type / min-max / domain 域节——含钳制范围与域负责人归属，防越权写坏）；
3. **同步 settings 展示与 kind 注释**：该项从「支部制度参数」只读区移入对应「域参数」卡（或新增卡），kind 注释改注「域参数（L2）· 书记裁 YYYY-MM-DD」；
4. **依据编号回填审计 why**：覆盖写留痕补裁决依据（随 2026-09-09 审计内核落地，见变更流）。

反向收权同理：从 `POLICY_OVERRIDABLE` 摘除 + 撤设置页控件 + kind 注释回注「不可经 UI 覆盖」。现状白名单内**无**制度可调项（设置页「支部制度可调参数：暂无」为预期态），三键均为域参数。

#### 变更流（保存即生效 + 留痕 + 回滚 + 历史上限）

- **保存即生效，不设审批闸**：config 各域写口即时写库生效（书记 R4，2026-09-06）——低频可回滚，故不设审批闸。
- **留痕 = `config.configChangeHistory`**：`{ by, at, what, from?, to?, why? }`（by = 登录快照 personId；what = 配置键或操作语义如 `branch-created` / `config-copied`；why = 可选依据/出处编号，来源页可回填；**逐键 diff 追加，无实质变化不产生冗余条目**）。modules/blocks/workforce/org 档案/policyOverrides/建支部/配置导入复制全部写口共用同一数组；聚合类操作（配置包导入 / 复制到支部）= 一操作一痕 `{ from: 源, to: fields }`。
- **回滚原语（2026-09-09 审计内核 cc1cde66 已落地）**：`rollbackBranchConfig` 单键写回（定位 history 条目把 `from` 原样经同一写口写回；跨键/聚合条目如 `branch-created`/`config-copied` 拒绝回滚）——回滚本身再追加一条 `{ what:'rollback', from: 现值, to: 回滚值 }`，**历史不改写**（审计不可变）。UI：设置 → 支部治理「配置变更记录」只读列表（人/时间/键/前后值/why，书记/副/party-staff 可见）可对单键条目「回滚此更改」（confirm 后执行）。「恢复默认」= 写 null / 删键的语义化回滚。
- **why / 历史上限（同上审计内核落地）**：写口支持可选 `opts.why` 透传留痕（放行依据编号回填，见放行程序④）；history 裁剪保留最近 100 条（`CONFIG_HISTORY_MAX`）。
- **不对称明示（设计意图，非缺漏）**：① 个人偏好层**无留痕**——只存本机键、不进 config 历史（本人即时偏好，不打扰他人）；② 制度刚性层源码变更**无 config 留痕**——改动落在 **git 版本历史**而非运行时 configChangeHistory（config 留痕只覆盖支部 config 域，不含源码字面量变更）。

#### 与内容接缝（在线可改 vs 仓库文件）

- **在线可改只在设置 / 换组织向导（①②③ 步）**：组织信息（①）、模块/块组合（②）、角色分工（③）即时写入 config 生效留痕；向导 **④「术语/制度/数据指引 + 换壳工作单」只读**——汇总摘要 + 待人工替换清单 + 验证点，不在此在线改仓库。
- **仓库文件内容一律出换壳工作单人工替换，不经设置页**：mock 演示数据（people/accounts/branches/activities…）、系统常量（constants.js）、角色权限矩阵（SYSTEM_ROLE_PERMISSION.md）、术语与使用策略（USAGE_POLICY.md）、制度 SOP（`content/02_institution/sop/`）、配色系统固定令牌（COLOR_SYSTEM.md + styles.css `:root`）、policy-defaults 未登记白名单的 branch-default 与 institutional 默认——替换清单见 `org-wizard-report.js` `REPLACE_ENTRIES`；改动落在 git、随版本交付，换壳口径自查见工作单第三部分。

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

- **P1 支部多实例 + 党委监控台账**：branch 落地 + 现数据迁移 br-b1；党委账号与工作台；监控台账（各支部成员规模/三会一课/主题党日/发展党员进度/思想汇报/书记任期状态）+ 支部列表管理（创建/改名）；数据隔离生效。验收（行为）：党委登录见全院两视图、支部登录只见本支部；现有支部演示功能不回归。
- **P2 书记任命与任期**：党委任命/撤换书记 → 书记工作台动态绑定被任命人；任期记录（改选换届档案）。验收：任命某成员后其登录即书记台、原书记降回成员/副书记；任期历史可查。
- **P3 党委指导审批 + 下发通知**（2026-09-03 范围与形态已裁定，见 §0）：
  - **上报（支部→党委）**：书记/副书记在书记工作台「上报党委」tab 发起——`develop-node`（发展节点）/`activity-report`（活动报备）两类，标题+说明上报（`reviewRequests` 记录，挂 branchId，状态 pending/approved/rejected）；党委在党委工作台「上报审批」tab 逐项批/驳（驳回须附意见，批准可附指导意见）→ 结论（含意见与处理人）回传支部侧同页可见。
  - **下发（党委→支委层）**：党委在「下发通知」tab 选目标支部（支部动态创建后自动可选）撰写下发 → 复用通知实体（`source:'committee'` + `audience:'committee'` + `branchId`），仅目标支部支委层成员在通知入口（铃铛/通知列表）可见并已读反馈，条目带「党委下发」红标；支部自发通知管理区不出现上级下发（只读治理信息，不可删改）。验收：双向通道闭环（上报→批复→回传；下发→支委收件），支部非支委党员不受打扰。

## 6. 演示与基线

- mock 升级 "1 党委 + 1 支部（br-b1）"：新增党委演示账号，现有支部演示数据/功能完全保留。
- 回归口径（行为）：两级可见范围、支部配置驱动、branchDocs 隔离、双向通道闭环逐项通过后收口；执行记录（版本串/测试清单）在 `.ctx/logs/`。

## 7. 风险与原则

- **最大改动面**：全数据域加 branchId（触及 46 功能的数据读写）——P1 只做"维度落地 + 隔离生效"，功能行为不变。
- **书记身份判定**：P2 起书记工作台访问以 `branches.secretaryId`（党委任命链，见 §3）为准，不再依赖固定演示账号 u_sec。
- 隔离在 services 层收敛，勿在各 tab 手写过滤（防漂移）。
- 新能力注册式（modules/capabilities/ 新增 party-committee-workspace），勿增核心单体。
- **上线前待收紧（P3 落地时登记）**：服务端资源级写权限仍为通用 requireAuth——任何登录用户理论上可写 branches/appointmentRecords/reviewRequests（含自批风险）；当前以 UI 层角色收敛 + 数据为演示态接受，上线部署前须按角色收紧（requireRole: party-staff / 本支部支委层）。

## 8. 验收（总原则）

- 设计成不成立以**行为验收**为准：两级可见范围（党委见全院、支部见本支部）、支部配置驱动（换 header/启停模块生效）、branchDocs 支部级隔离、P3 双向通道闭环（上报→批复→回传；下发→支委收件且非支委不打扰）。
- 行为验收的**执行记录**（版本串、测试清单、通过结论）属过程内容：随 spec 用后即删、台账存 `.ctx/logs/`，不常驻本设计文档。
