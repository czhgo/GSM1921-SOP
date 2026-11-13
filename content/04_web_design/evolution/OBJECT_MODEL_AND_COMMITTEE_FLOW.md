---
title: "对象模型与支委会议事流——三层挂靠、组长权限、上会回执、URL 形态"
type: design
role: "[工程师]+[AI]"
created: 2026-11-11
last_updated: "2026-11-13"
status: active
related_files: [../data/DATA_MODEL.md, ../data/DATA_CONTRACT.md, ../../02_institution/SYSTEM_ROLE_PERMISSION.md, ../../02_institution/COMMISSIONER_DUTY_FRAMEWORK.md, ../../02_institution/sop/党小组组长工作手册.md, ARCHITECTURE_EVOLUTION.md, .ctx/logs/2026-11-DECISION_LOG.md]
---

# 对象模型与支委会议事流

> **本文负责**：`D-866` 四项裁定的落地设计——三层对象模型判据、党小组组长权限矩阵、上会与回执状态机、URL 无后缀方案。
> **本文不负责**：① 现行字段与表结构 → [DATA_MODEL.md](../data/DATA_MODEL.md)；② 角色权限键级定义 → [SYSTEM_ROLE_PERMISSION.md](../../02_institution/SYSTEM_ROLE_PERMISSION.md)；③ 逐批过程 → `.ctx/logs/`。
> **状态**：已实施——URL `D-867`、对象模型 `D-868`、提案与上会回执 `D-869`。§一 的「现状」保留为实施前取证；判据已回写 `DATA_MODEL` / `SYSTEM_ROLE_PERMISSION`。

---

## 一、现行设计与差距（先证伪）

### 1.1 现行对象关系

| 对象 | 现行定位 | 挂靠字段 | 证据 |
|---|---|---|---|
| 党小组 | 独立组织单元；成员归属由其表达 | `people.partyGroup` | [DATA_MODEL §2.5](../data/DATA_MODEL.md) |
| 活动 | 一次活动，组织落点 `party-group` / `branch` | `hostGroupId`（`party-group` 必填）；`workgroupId='wg-activity-{id}'` | [DATA_MODEL](../data/DATA_MODEL.md#L60-L66) |
| 专班 | 围绕任务或产出组织协作，可跨时间 | `workgroupId='wg-taskforce-{id}'`；`activityId` 仅兼容 | [DATA_MODEL](../data/DATA_MODEL.md#L257-L262)、[taskforce.js](../../../docs/src/services/activity/taskforce.js#L42) |
| 工作组 | 执行载体：成员、授权、任务、产出 | `workgroupId` 回指活动或专班 | [DATA_MODEL](../data/DATA_MODEL.md#L271-L279) |

**差距 1：层序没有一份判据表。** 活动与专班并列于业务层，工作组是执行层；党小组在数据上只以人员属性出现。三者的「归属 → 业务 → 执行」关系分散在台账、读面与设计稿里，各写一份。

**差距 2：专班挂靠字段缺失且口径冲突。** 专班没有 `hostGroupId`，只能从 `workgroupId` 反推执行组，无法表达承办党小组。[work-map.js](../../../docs/src/core/domain/work-map.js#L154) 把「考勤」列为专班产出，而考勤记录只带 `activityId`（[DATA_MODEL §2.5](../data/DATA_MODEL.md#L351-L370)），专班考勤没有承载表。

**差距 3：工作组没有指导关系字段。** 现行无「指导支委」字段；「谁指导该工作组」只能从分工表与议程人工推断。

### 1.2 党小组组长现状

- 本组活动可建、可改；支部级（`top-down`）活动只读：[write-tab.js](../../../docs/src/entries/tabs/leader/write-tab.js#L43-L48)、[同文件 L188-L204](../../../docs/src/entries/tabs/leader/write-tab.js#L188-L204)。
- 本组活动角色可保存；支部级角色由支书侧确定，组长点击即拒：[write-tab.js L349-L353](../../../docs/src/entries/tabs/leader/write-tab.js#L349-L353)、[L440-L442](../../../docs/src/entries/tabs/leader/write-tab.js#L440-L442)。
- 支部级诉求仍在微信群报备；系统内无提案实体、无状态、无回执。组长手册只写「报支委确认」的线下流程：[党小组组长工作手册 L67](../../02_institution/sop/党小组组长工作手册.md#L67)、[L108](../../02_institution/sop/党小组组长工作手册.md#L108)。
- **结论**：「组内全权」已基本成立；「支部提案」缺实体、缺状态机、缺回执。

### 1.3 支委会现状

- 事项池 `GET /committee/agenda-candidates` 仅 `requireCommissioner` 可读（[committee.js L236](../../../server/routes/committee.js#L236)）。任何登录成员可经 `POST /issues` 提交意见反馈（写门 `self-service`，[write-policy-matrix.mjs L443-L446](../../../server/security/write-policy-matrix.mjs#L443-L446)），支委在候选池以 `issue-committee` 看到（[committee.js L282](../../../server/routes/committee.js#L282)）；该通道没有回执、状态、来源对象与期望时点，不能承担「支部级事项提案」。
- 来源八类：六类基础 ＋ 活动批准 ＋ 分工调整（[agenda-classify.js L29-L45](../../../docs/src/core/domain/agenda-classify.js#L29-L45)）；四反例排除日常创建与交接（[L55-L58](../../../docs/src/core/domain/agenda-classify.js#L55-L58)）。
- 表决以 `agenda_votes` 行承载；没有独立的「待上会事项」实体，也没有统一回执。
- 截止／锁定限支书、副支书（[committee.js L205-L207](../../../server/routes/committee.js#L205-L207)）；决议无外发路由，文件头注只写到「记录决议」（[committee.js L1-L2](../../../server/routes/committee.js#L1-L2)）。
- **结论**：事项有分类、无统一工单；有决议、无广播。

---

## 二、目标对象模型（`D-866` 裁定）

### 2.1 三层判据表

| 层 | 对象 | 必须挂靠 | 唯一性判据 | 不承担 |
|---|---|---|---|---|
| 组织归属层 | 党小组 | 支部 | 一名成员只属于一个党小组 | 不承担活动、专班、工作组的授权 |
| 业务层 | 活动 / 专班 | 承办党小组 `hostGroupId`；支部级为 `null` | 每个业务对象只挂一个承办党小组 | 不承担成员授权（授权在工作组） |
| 执行层 | 工作组 | 且只挂一个业务对象：`activityId` 或 `taskforceId` | 一个业务对象对应一个主工作组（现行 1:1） | 不承担组织归属；不设指导支委字段 |

**五条硬判据**

1. **成员归属唯一**：`people.partyGroup` 指向一个党小组；跨组参与只写 `workgroup_members`，不改 `partyGroup`。
2. **业务承办唯一**：活动沿用 `activity.hostGroupId`；专班新增 `taskforce.hostGroupId`。支部级对象 `organizingScope='branch'` 且 `hostGroupId=null`，承办方记为支委会。
3. **工作组挂靠唯一**：`workgroups.activityId` 与 `workgroups.taskforceId` 二选一、不得同时非空；`wg-*` 前缀只作兼容，不作判据。
4. **工作组不设指导支委**：支委的指导通过分工（`assignments`）与议程（`agenda`）表达，不进工作组表。
5. **成员身份不授予系统权限**：授权只经 `workgroup_grants`，与现行口径一致。

### 2.2 与现行的迁移差异

| 变更 | 影响表 | 迁移判据 |
|---|---|---|
| 专班新增 `hostGroupId` | `taskforces` | 历史专班不回填、不猜归属：缺值置 `null` ＋ `legacyHostGroup=true`，组织台「待补承办党小组」补选后清除 |
| 专班考勤口径 | `work-map.js` / 考勤 | 专班不产生考勤；[work-map.js L154](../../../docs/src/core/domain/work-map.js#L154) 去掉「考勤」，专班考察沿用 `inspection(sourceType='taskforce')` |
| 工作组挂靠校验 | `workgroups` | 写入与读面校验 `activityId` 与 `taskforceId` 二选一；历史行缺两者只读，由经办人补录 |

---

## 三、党小组组长权限矩阵（组内全权 ＋ 支部提案）

### 3.1 组内统筹的四个可见面

组长台现有页签：今天、待办、总览、本组活动、考勤、成员（[workspace-tabs.js L42-L44](../../../docs/src/core/domain/workspace-tabs.js#L42-L44)）。「统筹」落在四个面：

| 面 | 组长看到什么 | 可做什么 |
|---|---|---|
| 本组活动 | 本组创建 / 承办的活动 ＋ 支部级只读活动 | 建、改、归档、材料、本组通知 |
| 组员 | 本组成员台账与成长节点 | 查看、催办、组内推荐 |
| 考勤 | 本组活动的考勤状态 | 上传、督促组织者、查看补课 |
| 本组工作组 | 本组活动与专班的工作组任务、产出 | 成员、任务、产出；授权限本组活动 |

### 3.2 权限矩阵

| 场景 | 组长 | 副组长 | 支书 / 副支书 | 其他支委 | 落点 |
|---|---|---|---|---|---|
| 本组活动建 / 改 / 归档 | Y | Y | Y | 按分工只读 | 组长台「本组活动」 |
| 本组活动考勤上传 | Y（组织者身份） | Y（组织者身份） | Y | 纪检确认 | 组长台「考勤」 |
| 本组活动材料 / 宣传记录 | Y | Y | Y | 宣传按分工 | 组长台「本组活动」子记录 |
| 本组工作组任务 / 产出 | Y | Y | Y | 按分工 | 工作组视图 |
| 本组活动授权 | Y | Y | Y | 组织委员可协助 | 工作组授权面板 |
| 支部级活动 | 只读 ＋ 提案 | 只读 ＋ 提案 | Y | 按分工 | 本组活动「支部级」段 |
| 支部级事项提案 | Y | Y | Y | Y | 组长台总览行动行 |
| 受理 / 排期 / 建会 | 不得 | 不得 | Y | 可复核、可建议排期 | 支委会议程 |
| 记录决议 | 不得 | 不得 | Y | 不得 | 支委会议程 |
| 决议查看 | 提案人必收 | 提案人必收 | Y | Y | 通知与议程 |

**提案判据**

- 提案必带：来源对象（活动 / 专班 / 成员 / 制度）、事由、建议类型（决策 / 讨论 / 同步）、期望时点、附件（可空）。
- 提案不得直接改支部级对象状态；状态变化只能由支委会决议回写。
- 提案人可撤回；撤回记为 `rejected` 并写理由，记录保留。
- 提案入口放组长台总览的行动行，不新增页签（页签密度见 [DS_06](../design-system/DS_06_LAYOUT_AND_DENSITY.md)）。

---

## 四、上会与广播

### 4.1 状态机

| 状态 | 含义 | 谁可进入 | 回执对象 |
|---|---|---|---|
| `pending` | 已提交、待受理 | 提案人 | 提案人（提交回执） |
| `queued` | 已受理、待排期 | 支委复核或支书受理 | 提案人（受理回执） |
| `on-agenda` | 已排期到某次支委会 | 支书 / 副支书建会 | 支委 ＋ 提案人（排期回执） |
| `decided` | 已形成决议 | 支书 / 副支书记录 | 支委 ＋ 提案人 ＋ 受影响人 |
| `closed` | 已归档 | 支书 / 副支书 | 提案人 |
| `rejected` | 不受理 / 撤回 | 支委或支书（须写理由） | 提案人 |

**判据**

1. 状态只能沿 `pending → queued → on-agenda → decided → closed|rejected` 前进；不得跳级，不得回退。撤回只允许在 `pending` / `queued`。
2. 建会只允许支书、副支书；其他支委可复核、补充材料、建议排期。
3. 每次状态变更写一条事件（谁、何时、从 → 到、理由）；回执由事件生成，不另建一套已读状态。
4. 同一事项同一状态只发一次回执；重发须显式操作。
5. 决议通知默认受众为支委层 ＋ 提案人 ＋ 受影响人；全支部知悉由支书在记录决议时勾选。
6. 八类来源保留为事项类型，不新增第九类；组长提案按其来源对象落到对应类型，附 `proposedBy`。
7. 四反例继续排除日常创建与交接：日常活动创建、专班创建、考勤交接不因新增提案入口而进入上会事项。

### 4.2 广播路径

| 事件 | 通知对象 | 渠道 | 现行对应 |
|---|---|---|---|
| 提交 / 受理 | 提案人 | 通知（`audiencePersons`） | 仅意见反馈可提交，无回执 |
| 排期 | 支委层 ＋ 提案人 | 通知（`committee` sentinel ＋ 到人） | 无 |
| 决议 | 支委层 ＋ 提案人 ＋ 受影响人 | 通知 ＋ 议程结果 | 仅议程内可见 |
| 归档 / 驳回 | 提案人 | 通知 ＋ 理由 | 无 |

受众口径沿用 [notice.js](../../../docs/src/services/governance/notice.js#L279-L285)：定向通知只命中受众，支委层身份不构成越读理由。

---

## 五、URL 无后缀（B 方案）

### 5.1 现状

- 服务端已支持无后缀：[app.js L63-L64](../../../server/app.js#L63-L64) 的 `express.static(DOCS_DIR, { extensions: ['html'] })`。
- 实测：`GET http://localhost:3000/workspace/secretary` 返回 200（2026-11-11，本机 3000）。
- 站内链接仍写 `.html`，用户从页面点进去会看到后缀。

### 5.2 改造三层

| 层 | 改什么 | 验收判据 |
|---|---|---|
| 生成层 | [page-url.js](../../../docs/src/core/base/page-url.js) 的 `pageHref()` 是唯一后缀变换；`resolveDocumentUrl()` 内联调用它 | 全仓只有这一处做后缀变换 |
| 运行时归一 | [link-normalize.js](../../../docs/src/core/base/link-normalize.js) 对初始 DOM 与新增节点统一改写站内锚点；`help` / `about` 冻结面跳过 | 入口页站内链接不再出现 `.html` |
| 重定向 | 登录、登出、深链、跨台重定向等 `location.href` / `replace()` 调用点统一经 `pageHref()` | 地址栏不出现 `.html` |
| 守卫 | 页签审计、导航契约、链接检查同步允许无后缀 | 守卫全绿；旧断言不删，只改期望值 |

> **实施状态（2026-11-11 批次 542）**：生成层、运行时归一与重定向已接线；静态 HTML 源文件不改，靠运行时归一覆盖。旧 `.html` 保持 200。尚未跑全量 `test:daily` / `test:guards` 终验。

### 5.3 兼容与回滚

- 旧 `.html` 保持 200，不做 301。
- 开关 `URL_STYLE=extensionless|html`，默认 `extensionless`；回滚只改这一处。
- 不支持 `file://` 直开；部署必须经服务器。`<base href>` 保持现状，不改目录式 URL。

### 5.4 验收

- 26 个入口手动打开无 `.html`；旧链接仍可开。
- 深链（活动 / 专班 / 通知详情）无后缀且定位正确。
- `audit-tabs --all` P0 / P1 = 0。

---

## 六、实施顺序

1. **URL B**：独立、可回滚，先做。
2. **对象模型判据**：专班 `hostGroupId` ＋ 工作组挂靠校验 ＋ `work-map` 考勤口径。
3. **提案实体与状态机**：表、路由、回执。
4. **建会权收口 ＋ 决议广播**。
5. **母本回写**：`DATA_MODEL` / `SYSTEM_ROLE_PERMISSION` / `COMMISSIONER_DUTY_FRAMEWORK`。

---

## 七、已裁（`D-867`）

| 问题 | 裁定 | 影响 |
|---|---|---|
| 支部级专班是否存在 | 存在：`hostGroupId` 可空，承办方记为支委会 | `taskforces.hostGroupId` 可空；支部级专班与支部级活动同构 |
| 决议默认受众 | 支委 ＋ 提案人 ＋ 受影响人 | 通知默认 `audience` 按此生成；全支部知悉须显式勾选 |
| 组长提案可见性 | 全体支委可见（统一池） | 事项池读权限保持 `requireCommissioner`；组长只新增提交口 |
