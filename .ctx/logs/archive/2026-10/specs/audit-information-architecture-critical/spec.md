# 信息架构批判性专项（脏乱繁 × 最小三成本）Spec

## Why

支书指出：当前每个功能的使用体验仍偏差，根因不是单页样式，而是**入口太多、界面太多**——没有做到「各尽其责又相互配合」。具体表现为：

1. **Tab 过多**：67 个页签里，是否存在可由其他页签承接、或同一角色任务被拆成多个页签的情况？
2. **卡片过多**：每个 tab 内多张卡片并列，缺少明确的阅读顺序与操作优先级；用户不知道先看哪张、先做哪一步。
3. **链接语义漂移**：链接能点开，但指向的不是**该角色此刻真正该去的地方**。已复现一例：
   `activity-materials-entry.js` 的「复盘 / 考勤 / 考察」统一链到 `workspace/visitor.html?tab=review`、
   `workspace/disc.html?tab=attendance`、`workspace/disc.html?tab=inspection`；对组长/支书组织者，
   本位入口分别在 `leader.html?tab=...` 或 `secretary.html?tab=...`，这是**角色无关的错误落点**。
4. **审查内涵需要升级**：上一轮 H21 多代理审查擅长「页面做得好不好」，但不擅长「这个页面/入口是否应该存在、它指向的地方对不对」。支书要求把这层批判性纳入 parallel subagent 审查的常设内涵。

本 spec 是一次**批判性 IA 专项**：先证明每个 tab / 卡片 / 链接是否配得上存在，再谈修复。不是视觉改版，也不是一次性重写。

## What Changes

* **建立 IA 全量矩阵**：7 台 × 全部 tab × 卡片的机器清单（tab 名、角色、首屏卡片、主行动、每张卡的去向、每枚链接的 page/tab/id/角色可达性）。

* **六路批判性审查**（并行子代理，各只加载一个 lens）：

  1. **Tab 必要性**：一 tab 一问；不能独立回答一个角色任务的 tab 应合并/删除。
  2. **卡片必要性与阅读顺序**：一张卡必须改变一个决策或动作；否则删除/合并；每 tab 只留一条主阅读线。
  3. **入口/出口与链接真值**：链接目标必须是「该角色 + 该对象 + 该步骤」的正确落点，不是「能打开」。
  4. **跨角色协作**：每个动作有唯一责任角色与唯一下一角色；交接点必须显式。
  5. **最小三成本**：信息 / 操作 / 学习成本逐 tab 量化，给「删/并/前置/下沉」建议。
  6. **数据与路由真值**：`?tab=`、`?highlight=`、`?activityId=`、`?branchId=`、`?subview=` 是否被目标页消费；不消费的深链判红。

* **sample-diff-learning**：人类抽审 5–10% 的高风险链接/卡片；AI 把每次纠正泛化为 Boolean 规则，落 `content/05_ai_coding/PARALLEL_SKILL_AUDIT.md` 与 `CLAUDE.md`（H21.3），不把结论只留在会话里。

* **grill-me 一次 frontier**：tab 合并/删除、卡片删减、链接落点、跨角色交接四类裁定集中问。

* **产出修复 spec**：审计报告 + 裁定后的修复 tasks；本批不直接重写 68 页签。

## Impact

* 审查面：7 个工作台 + `activity.html` / `activity-materials.html` / `index.html` + 深链通知模板。

* Phase 0 代码面：`server/routes/resources/**`（考察写门）、`docs/src/services/activity/inspection.js`、`docs/src/services/activity/decision-tree.js` / `services/core/mock.js`（活动创建事务）、`docs/src/data/mock-adapter.js`（多支部过滤）、状态枚举相关 domain/service/capability。

* 后续修复面：`capabilities/*-workspace.js`（tab 清单）、`entries/tabs/**`（卡片与链接）、`components/**`（共享卡片/链接 helper）。

* 文档面：`content/05_ai_coding/PARALLEL_SKILL_AUDIT.md`（新增 H21.3）、`CLAUDE.md`（H21.3 索引）。

* 不改表结构；D04 的 `workgroupId` 迁移另开 spec；宽表卡式化等 IA 裁定。

## 三、与已转后续项的顺序（2026-10-19 裁定）

| 项目            | 安排                    | 理由                                                       |
| ------------- | --------------------- | -------------------------------------------------------- |
| R4-D05 考察写门   | **Phase 0，与 IA 并行**   | 纯权限正确性，不改视觉结构；先堵住任一成员可改考察的缺口                             |
| R4-D02 活动创建事务 | **Phase 0，与 IA 并行**   | mock 创建链不建工作组，属数据一致性；不改页面结构，IA 可直接读修正后的数据                |
| mock 多支部过滤    | **Phase 0，与 IA 并行**   | 测试/演示保真度；mock 数据可删改，不影响真实结构                              |
| R4-D03 状态枚举   | **Phase 0，按 UI 功能反推** | 数据适配功能，不削足适履；先列出 UI/服务实际使用的状态，再定 canonical 集合，旧 mock 可重写 |
| R4-D04 考察父键   | **单独迁移 spec**         | 需新增 `workgroupId`、回填历史、改查询；不混进 IA                        |
| 宽表卡式化         | **IA 裁定后**            | IA 可能合并/删除表；先卡式化可能白做                                     |

### 3.1 数据适配功能原则（项目层）

* **DB / 枚举 / mock 以页面功能与权限判据为准**，不以「旧数据里已有这个值」为保留理由。

* **mock 数据只是验证辅助**：可删、可改、可重写；不得为兼容旧 mock 而保留无用状态或字段。

* 状态集合必须由 UI 流程反推：页面要筛选什么、授权要认什么、写口要校验什么，就定义什么状态；其余映射或删除。

* 该原则写入 `content/05_ai_coding/PARALLEL_SKILL_AUDIT.md` 与 `CLAUDE.md`，作为 H21.3 的一部分。

### Requirement: Phase 0 前置正确性（与 IA 并行）

系统 SHALL 在 IA 审计同时完成四项正确性修复：

1. **D05 考察写门**：`inspection` 的创建 / 确认 / 删除改为 deny-by-default；允许本场组织者、支书/副支书、纪检（或组织委员）按既有职责放行；服务端补写门；补越权测试。
2. **D02 活动创建事务**：活动创建写口必须同时建立工作组与组织者/深度参与者成员关系；mock 形态与 API 形态同源；旧 mock 数据可重写，不要求兼容。
3. **D03 状态枚举按 UI 反推**：列出 UI 页面筛选、授权判据、写口校验实际使用的状态；定义 canonical 集合；旧 `draft/pending_review/completed` 要么映射、要么删除；mock 数据随之重写；文档/枚举/守卫同步。
4. **mock 多支部过滤**：mock adapter 的 `list(params)` 按 `branchId` 过滤 users / activities / notices / attendances / todos / assignments；补双支部 mock/api 对照测试。
5. **D04 不进本 spec**：另开迁移 spec；宽表卡式化等 IA 裁定后再做。

#### Scenario: 普通成员不能改考察

* **WHEN** 普通成员调用 inspections 写口

* **THEN** 403；本场组织者 / 纪检 / 支书按职责可写

#### Scenario: 新建活动立即可用

* **WHEN** 支书新建活动

* **THEN** 同一会话内活动详情、工作组、组织者成员关系都已存在，不依赖刷新自愈

### Requirement: IA 全量矩阵

系统 SHALL 生成可核对的 IA 矩阵：

1. 每个工作台的 tab 清单（id / 显示名 / 角色 / 分组 / 是否 core / 可见性）。
2. 每个 tab 的卡片清单（标题 / 首屏顺序 / 主行动 / 数据来源 / 空态）。
3. 每个可点元素的去向（page / tab / 对象 id / 角色可达性 / 是否消费深链参数）。
4. 矩阵落 `.ctx/IA_INVENTORY.md`，并附机器生成脚本的统计（tab 数、卡片数、链接数）。

#### Scenario: 支书抽审任一 tab

* **WHEN** 打开矩阵中任一 tab

* **THEN** 能一眼看到它的卡片顺序、主行动、每枚链接去向与角色可达性

### Requirement: Tab 必要性（一 tab 一问）

每个 tab SHALL 通过「一 tab 一问」判据：

1. 该 tab 必须独立回答一个角色任务问题（如「今天要处理什么」「本组活动怎么发起」）。
2. 若两个 tab 回答同一问题，或一个 tab 的 80% 内容可由另一 tab 承接 ⇒ 合并候选。
3. 若一个 tab 没有独有主行动、没有独有数据、没有独有角色 ⇒ 删除候选。
4. 合并/删除必须给「谁迁到哪、深链怎么兼容、旧 id 是否保留」。

#### Scenario: 合并候选

* **WHEN** 两个 tab 的职责问题相同

* **THEN** 报告给出合并方案与深链兼容策略，而不是只说「重复」

### Requirement: 卡片必要性与阅读顺序

每个 tab 的卡片 SHALL 通过「决策/行动」判据：

1. 一张卡必须改变一个决策或触发一个动作；纯展示且不影响决策的卡片列为删除/下沉候选。
2. 每个 tab 只保留一条主阅读线：主行动 → 决策信息 → 次要信息 → 历史/归档。
3. 同屏卡片不得超过「一眼可数」的 5 张；超出必须分组或下沉。
4. 卡片之间必须有明确关系（因果 / 上下游 / 汇总-明细），不能只是并列堆叠。

#### Scenario: 卡片顺序

* **WHEN** 打开任一 tab

* **THEN** 第一张卡是当前主行动或最高优先级决策信息，而不是历史统计

### Requirement: 链接真值（语义落点）

每枚链接/按钮 SHALL 通过「角色 + 对象 + 步骤」真值判据：

1. 目标 page 必须是该角色可进入的工作台；不可进入的角色应落到其本位工作台或只读页。
2. 目标 tab 必须存在且是该动作的本位 tab；不得落到「相近但不同」的 tab。
3. 目标必须携带对象 id（`activityId` / `highlight` / `branchId` / `personId`），且目标页必须消费该参数。
4. 跨工作台交接必须显式：例如「组织者补充考勤」应落 `leader.html?tab=attendance`（组长）或 `secretary.html?tab=calendar`（支书），不能一律 `disc.html?tab=attendance`。
5. 同一动作在不同角色下的落点差异必须写入矩阵，不允许「一条链接打天下」。

#### Scenario: 材料闭环的角色化落点

* **WHEN** 组长组织者从材料闭环点「考勤」

* **THEN** 落到 `leader.html?tab=attendance`，而不是 `disc.html?tab=attendance`

* **WHEN** 支书组织者点同一入口

* **THEN** 落到其本位考勤/活动管理入口

### Requirement: 跨角色协作与交接

系统 SHALL 为每个跨角色动作定义唯一责任与下一角色：

1. 每个动作标注「谁负责 / 谁确认 / 谁只读」。
2. 交接点必须显式（如「组织者上传 → 纪检确认」「宣传归档 → 支书审阅」），不能靠用户自己找。
3. 同一对象在多个角色台的呈现必须共享同一状态口径；不得出现 A 台已办、B 台仍待办。

#### Scenario: 交接可见

* **WHEN** 组织者完成上传

* **THEN** 下一责任角色在其本位台能看到待确认项，且有明确入口

### Requirement: 最小三成本量化

每个 tab SHALL 给出三项成本读数与改进建议：

1. 信息成本：首屏卡片数、字段数、重复词数、需要滚动几屏才能完成主任务。
2. 操作成本：完成主任务所需点击数、跨 tab 次数、跨工作台次数。
3. 学习成本：新用户需要先读几段说明/帮助才能完成主任务。

#### Scenario: 成本对比

* **WHEN** 报告给出合并/删除建议

* **THEN** 同时给出合并前后的三项成本对比，而不是只凭主观

### Requirement: H21.3 批判性 IA 审查常设化

H21 多代理审查协议 SHALL 增加 H21.3：

1. 每轮审查前先问三件事：这个 tab 是否必须存在？这张卡是否改变决策？这枚链接是否指向该角色该步骤的正确落点？
2. 三问未过，不得进入视觉/无障碍评分。
3. 结论写入 `content/05_ai_coding/PARALLEL_SKILL_AUDIT.md` §10 与 `CLAUDE.md` H21.3；新增守卫断言两处存在。
4. sample-diff-learning 的纠正规则同步落盘，不留在会话。

#### Scenario: 下一轮审查

* **WHEN** 启动新一轮 parallel subagent 审查

* **THEN** 子代理先交 IA 三问结论，再交视觉/无障碍结论

## MODIFIED Requirements

### Requirement: 四轮审查程序

四轮程序前增加「Round 0：IA 必要性抽审」：先证明 tab/卡片/链接配得上存在，再进入既有四轮。Round 0 可与任一轮合并执行，但不得跳过三问。

## REMOVED Requirements

无。

## Acceptance

* Phase 0：D05 / D02 / D03 / mock 多支部四项有守卫与真机/接口测试；未改表结构；D04 另开迁移 spec。

* `.ctx/IA_INVENTORY.md` 落盘：7 台 × 全部 tab × 卡片 × 链接矩阵，含机器统计。

* `.ctx/AUDIT_IA_CRITICAL.md` 落盘：六路独立审查 + 共识 / 分歧 / 待裁定 + 每条归属。

* `.ctx/IA_LINK_TRUTH.md` 落盘：每枚高风险链接的角色化落点与真值结论；至少含材料闭环一例的修复建议。

* sample-diff-learning：至少 5 个高风险样本经人类抽审，纠正泛化为 Boolean 规则并落盘。

* 一次 frontier：tab 合并/删除、卡片删减、链接落点、跨角色交接四类裁定集中问。

* 修复 spec/tasks 落盘；本批不直接重写 68 页签。

* H21.3 写入 `PARALLEL_SKILL_AUDIT.md` 与 `CLAUDE.md`，并有守卫。

## Non-goals

* 不做视觉改版；不以「好看」替代「该不该存在」。

* 不一次性删除/合并 tab；先出报告与裁定，再分批修。

* 不改表结构；D04 的 `workgroupId` 迁移另开 spec；宽表卡式化等 IA 裁定。

* 不以「旧数据已有」为保留状态的理由；mock 可删改。

* 不把「入口多」简单等同于「删入口」；必须给跨角色交接方案。

