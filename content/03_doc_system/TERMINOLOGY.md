---
title: "术语表（全仓唯一术语定义源）"
type: governance
role: "[工程师]+[AI]"
last_updated: 2026-11-03
version: "0.1"
status: active
related_files: [content/03_doc_system/OPERATIONS_GUIDE.md, content/02_institution/SYSTEM_ROLE_PERMISSION.md, content/03_doc_system/ARCHITECTURE.md, content/04_web_design/data/DATA_MODEL.md]
---

# 术语表（全仓唯一术语定义源）

> **定位**：本文是**全仓唯一的术语定义源**。任何文件、页面文案、页签 / 分段 / 表头 / 筛选标签需要解释一个词时，以本表为准；其余文件只许引用，不许另写一份定义。
> **不负责什么**：规范条文（设计/权限/数据）仍在各自母本；判例正文在 `CASES.md`；本文只回答「这个词是什么、跟谁同级、什么写法禁用、代码键是什么」。
> **维护规则**：新增 / 改名词条 = 改本表 + 同批改引用方（`OPERATIONS_GUIDE §19`、`sop/INDEX.md` 只留指针）；**不得**在别处出现第二份定义句。

## 字段说明（9 字段）

| 字段 | 含义 |
|---|---|
| 词条 | 规范用词（用户可见文本与文档正文一律用这一写法） |
| 定义 | 一句话说清「是什么、不是什么」 |
| 层级 | `business-object`（业务对象）/ `collaboration-structure`（协作结构）/ `org-unit`（组织单元）/ `deployment-unit`（部署单元）/ `process`（过程与动作） |
| 上位 / 下位 | 所属与所辖；无则写「无」 |
| 允许并列集 | 可以出现在同一按钮组 / 表头 / 筛选行的集合；不在集合内即不得同排 |
| 禁用写法 | 明确判红的写法（含旧称、并提、同义替换） |
| 权威文档 | 制度或代码中的权威位置（`文件:行号`） |
| 代码键 | 实现里的类型 / 字段 / 常量 / 集合键 |
| 合法别名 | 可在限定语境使用的同义词；无则写「无」 |

## 首批 18 条（＋IA 45 批新增 2 条，共 20 条）

| 词条 | 定义 | 层级 | 上位 / 下位 | 允许并列集 | 禁用写法 | 权威文档 | 代码键 | 合法别名 |
|---|---|---|---|---|---|---|---|---|
| 活动 | 有明确时间、地点与组织落点的一次性业务记录（三会一课、主题党日等）；**项目的一种** | business-object | 上位＝项目；下位＝支部党员大会 / 支委会 / 党小组会 / 党课 / 主题党日 | {活动, 专班}；{活动工作组, 专班工作组} | 「活动项目」（并提）；「会议活动」 | `content/04_web_design/data/DATA_MODEL.md:26`、`content/03_doc_system/ARCHITECTURE.md:39` | `Activity` / `ActivityRecord` / `mockDB.activities` | 活动记录 |
| 专班 | 围绕独立事项、任务或产出建立、不限固定时间地点的业务记录；**项目的一种**，不是活动的后续阶段 | business-object | 上位＝项目；下位＝无（其协作结构见「专班工作组」） | {活动, 专班} | 「活动项目」；把专班写成活动后续阶段 | `content/01_strategy/SECRETARY_DIRECTIVES.md:302`、`:309` | `Taskforce` / `TaskForceRecord` / `mockDB.taskforces` | 专班记录 |
| 项目 | **活动 ∪ 专班的合称**，不是与二者并列的第三个业务对象 | business-object（合称） | 上位＝无；下位＝活动 / 专班 | **不可作为并列项**与活动、专班同排 | 「活动项目」；「项目组」 | `docs/src/core/domain/constants.js:338`、`content/02_institution/SYSTEM_ROLE_PERMISSION.md:103` | `PROJECT_ROLES` / `projectId` | 无 |
| 工作组 | 活动 / 专班业务记录之上的**协作结构**，承载组织者、深度参与者、任务、产出与授权；**不是独立业务对象** | collaboration-structure | 上位＝无（依附活动 / 专班）；下位＝活动工作组 / 专班工作组 | {活动工作组, 专班工作组}（同属工作组，按对象分） | 「项目组」；「协作组」；把「工作组」与「专班」并列 | `content/02_institution/SYSTEM_ROLE_PERMISSION.md:161`、`content/03_doc_system/ARCHITECTURE.md:38`、`content/04_web_design/data/DATA_MODEL.md:264` | `WorkGroup` / `WORKGROUP_STATUSES` / `mockDB.workgroups` | 无 |
| 活动工作组 | **随活动创建**的工作组，负责该活动的组织与深度参与；`kind='activity'` | collaboration-structure | 上位＝工作组；下位＝无 | {活动工作组, 专班工作组} | 「活动组」；把活动工作组当作独立业务对象 | `content/02_institution/COMMISSIONER_DUTY_FRAMEWORK.md:46`、`content/04_web_design/data/DATA_MODEL.md:264` | `WorkGroup.kind='activity'` | 无 |
| 专班工作组 | **围绕专班事项 / 任务 / 产出**建立的工作组；`kind='taskforce'` | collaboration-structure | 上位＝工作组；下位＝无 | {活动工作组, 专班工作组} | 把专班工作组直接叫「专班」；「专班负责人」 | `content/02_institution/COMMISSIONER_DUTY_FRAMEWORK.md:47`、`content/04_web_design/data/DATA_MODEL.md:264` | `WorkGroup.kind='taskforce'` | 无 |
| 党小组 | 支部内按成员分布划分的**组织单元**（块块），由组长 / 副组长负责；不是工作组 | org-unit | 上位＝支部；下位＝组员 | {第一党小组, 第二党小组, …}（同层组织单元）；**不得与工作组 / 专班同排** | 「其他组」（作一级并列标签）；与工作组同排 | `content/02_institution/COMMISSIONER_DUTY_FRAMEWORK.md:40`、`content/04_web_design/data/DATA_MODEL.md:1152` | `PartyGroup` / `mockDB.partyGroups` / `hostGroupId` | 组（仅页内简称，不作并列标签） |
| 组织者 | 工作组成员角色：协商分工、协调与责任记录；与深度参与者并列 | collaboration-structure | 上位＝工作组成员；下位＝无 | {组织者, 深度参与者} | 「负责人」；「专班负责人」；「项目负责人」 | `content/02_institution/COMMISSIONER_DUTY_FRAMEWORK.md:48`、`content/02_institution/SYSTEM_ROLE_PERMISSION.md:36` | `organizer` / `PROJECT_ROLES` | 项目组织者（旧称，保留于历史文本） |
| 深度参与者 | 工作组成员角色：承担约定执行工作；与组织者并列 | collaboration-structure | 上位＝工作组成员；下位＝无 | {组织者, 深度参与者} | 与「普通参与者」混用（后者＝活动报名者 / 专班入组申请者） | `content/02_institution/COMMISSIONER_DUTY_FRAMEWORK.md:48`、`content/02_institution/SYSTEM_ROLE_PERMISSION.md:36` | `deep` / `PROJECT_ROLES` | 无 |
| 分工 | 工作组内「谁承担哪项任务、哪部分执行」的约定与记录；由组织者协商并留痕 | process | 上位＝工作组协作；下位＝任务 / 产出 | {分工, 任务, 产出, 授权} | 「职责分工表」（指系统外台账）；把分工等同授权 | `content/04_web_design/data/DATA_MODEL.md:407`、`content/02_institution/COMMISSIONER_DUTY_FRAMEWORK.md:425` | `AssignmentRecord` / `WorkGroupTask` / `assigneeId` | 工作分工 |
| 考察 | 对工作组成员在本工作组中参与表现的记录；**父对象是工作组**，不是按人或按活动漂浮的台账 | business-object | 上位＝工作组；下位＝无 | {考勤, 考察}（不同业务记录，不可同格） | 「考察活动」；把考察写成活动属性 | `content/02_institution/COMMISSIONER_DUTY_FRAMEWORK.md:51`、`content/04_web_design/data/DATA_MODEL.md:386` | `InspectionRecord` / `mockDB.inspections` / `workgroupId` | 考察记录 |
| 能力包 | 党委维护、支部可自主启用的业务能力模板（含制度依据、适用范围、配置权、依赖与版本） | process | 上位＝党委能力目录；下位＝能力包版本 | {能力包, 模板, 版本} | 「功能包」；「插件」 | `content/02_institution/COMMISSIONER_DUTY_FRAMEWORK.md:55` | `capabilityPackageId` / `capabilityId` | 业务能力包 |
| 模块 | **支部工作地图**中的工作项（如支部党员大会、支委会、党小组会、党课…），用于分工与主责归属 | process | 上位＝支部工作地图；下位＝子项（现无启用） | {模块 × N}（同一地图内的平级工作项） | 「功能模块」（指页面 / 页签）；把页签叫模块 | `docs/src/core/domain/work-map.js:73`、`docs/src/core/domain/work-map.js:95` | `WORK_MAP_MODULES` / `config.workforce` | 工作模块 |
| 流程块 | L3 工作流块：既有能力 + 一层 manifest 元数据，表达一段可复用的流程步骤 | process | 上位＝工作流；下位＝步骤 | {流程块, 产出块}（同属「块」，语义不同） | 「工作流模块」；与「模块」混用 | `content/04_web_design/evolution/WORKFLOW_BLOCK_CONTRACT.md:13`、`:42` | `BLOCK_MANIFESTS` / `manifest` | 工作流块 |
| 产出块 | 活动产出记录的类别块（考勤 / 考察 / 宣传 / 材料），由支部 `config.blocks` 启停与排序 | process | 上位＝活动产出记录；下位＝考勤 / 考察 / 宣传 / 材料 | {流程块, 产出块}；{考勤, 考察, 宣传, 材料} | 「交付物块」；「产出模块」 | `docs/src/core/domain/constants.js:941`、`content/04_web_design/evolution/PARTY_COMMITTEE_DESIGN.md:76` | `OUTPUT_BLOCK_DEFS` / `config.blocks` | 产出记录块 |
| 授权 | 对某人授予某项**系统权限键**的行为与记录（可撤销、可审计，留授权人 / 时间 / 权限键） | process | 上位＝权限管理；下位＝权限键 | {授权, 成员关系}（分离，不可互推） | 「赋权」（除既有专名「常设赋权」）；把授权等同于成员关系 | `content/02_institution/SYSTEM_ROLE_PERMISSION.md:159`、`:161` | `WorkGroupGrant` / `permissionKeys` / `AuthStore.authorize` | 系统授权；项目授权（限定对象时）；常设赋权（专名，限党小组组长 / 支委身份） |
| 报名 | **活动**一般参与者参加活动的登记；不产生工作组成员身份，也不适用于专班 | process | 上位＝活动参与；下位＝无 | {报名, 工作组成员}（不同集合） | 「专班报名」（专班场景写「入组申请」）；把报名当工作组招募 | `content/02_institution/SYSTEM_ROLE_PERMISSION.md:165`、`content/04_web_design/data/DATA_MODEL.md:68` | `signups` / `activity-signup` / `signupEnabled` | 活动报名 |
| 会议 | 以议事 / 学习为内容的**活动的形态标签**（三会一课、支委会等）；是活动的下位形态，不是与活动并列的业务对象 | business-object（形态） | 上位＝活动；下位＝支部党员大会 / 支委会 / 党小组会 / 党课 | {支部党员大会, 支委会, 党小组会, 党课} | 「会议活动」；把会议与活动作同义替换 | `content/04_web_design/data/DATA_MODEL.md:34`、`content/04_web_design/data/DATA_MODEL.md:1234` | `deriveMeetingStatus` / `votesLocked` | 会议类活动（限定说明时） |
| 我的成长 | 成员台承载「思想汇报 / 我的考察 / 我的复盘」三类成长记录与提交口的**页内分区名**（2026-10-25 IA 45 批由三个页签合并）；不是新的业务对象 | process | 上位＝成员工作台；下位＝思想汇报 / 我的考察 / 我的复盘 | {思想汇报, 我的考察, 我的复盘} | 「成长中心」；把它当作与思想汇报并列的业务对象 | `docs/src/entries/tabs/visitor/growth-tab.js`、`content/04_web_design/PRODUCT_IA.md` | `growth` / `data-growth-section` | 无 |
| 我经办的反馈 | 各台待办页承载「待我处理 / 我已处理」反馈与汇报收件处理的**页内分区名**（2026-10-25 IA 45 批由五台「我的处置」页签并入）；不是新页签 | process | 上位＝待办；下位＝待我处理 / 我已处理 | {待办, 我经办的反馈}（分区归属，不与页签同排） | 「我的处置」（页签名，已废止）；把该分区当作独立页签 | `docs/src/components/record/todo-tab-shell.js`、`docs/src/components/feedback/issue-dispatch-view.js` | `ws-dispatch-section` / `filter=dispatch` | 反馈处置（限定说明时） |

## 并列约束（从本表派生，可直接判红）

1. **项目是合称**：`{活动, 专班}` 可并列；「项目」不得与活动 / 专班同排（见第 3 条）。
2. **工作组按对象分**：一级只允许 `{活动工作组, 专班工作组}`；`{工作组, 专班}`、`{活动工作组, 专班}` 均判红（见第 4–6 条）。
3. **组织单元不同排**：党小组只与同层党小组并列，不得与工作组、专班、项目同排（见第 7 条）。
4. **授权不用「赋权」**：通用写法一律「授权」；「常设赋权」作为既有专名保留（见第 16 条）。
5. **会议不是活动的同义词**：会议是活动的一种形态；正文按具体会议名写，不写「会议活动」（见第 18 条）。
6. **报名与入组分离**：活动写「报名」；专班写「入组申请」，不写「专班报名」（见第 17 条）。

> **第二批待登记（本批不定义，勿在别处补写定义）**：支部党员、支部成员、条条、块块、党小组承办、支部级、跨组。登记后同批把引用方改为本表指针。

---

## 附：系统现行口径承接（2026-11-03）

> 来源：`.ctx/ACTIVE_RULINGS.md` 分类承接；每条末尾 `（D-xxx）` 是决议指针，正文以本文件为准。

- **「北京大学智慧党建平台（党旗飘飘）」**：全称；首次出现用全称，其后可用「智慧党建平台」。（D-302）
- **「支部党员大会」**：全称；首次出现用全称，其后可简写；索引与术语以全称为准，不新增「支部大会」为简称。（D-303）
