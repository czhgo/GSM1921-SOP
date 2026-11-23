---
title: "议程来源分类与待议池契约"
type: contract
status: active
version: 1.0.0
owner: 支书（契约裁决）；[工程师]+[AI]（维护）
last_updated: 2026-11-10
acceptance: server/test/agenda-classify.test.mjs 全绿（六类来源 × 四反例 × 服务端与客户端逐项一致 × 双支部过滤）
---

# 议程来源分类与待议池契约

> 本契约回答「哪些事必须上支委会、以什么类型上会、两端怎么算同一份结果」。条文口径以本文件为准；
> 判例与沿革归各域 `CASES.md` 与 `.ctx/logs/`。

## 一、适用范围

- 实现落点：`docs/src/core/domain/agenda-classify.js`（分类单一源）、
  `GET /api/v1/committee/agenda-candidates`（服务端汇总口）、
  `docs/src/entries/tabs/secretary/committee-meeting-tab.js`（待议池卡）、
  `docs/src/entries/pages/party-committee-meeting-entry.js`（议程摘要类型徽章）、
  `docs/src/entries/tabs/secretary/agenda-form.js::buildAgendaPool / buildAgendaCandidates`（清单归集）。
- 前端与服务端**必须** import 同一份分类函数；任一端另写类型判定、议程文案或去重键即违约。
- 新增来源类别**必须**同批改本契约 §二、`agenda-classify.js::AGENDA_SOURCES` 与本契约 §七 的验收项。

## 二、六类来源（顺序即待议池呈现顺序）

| 来源键 | 名称 | 引用类型 `refKind` | 类型 | 建议议程步骤 | 判据（可直接布尔化） |
|---|---|---|---|---|---|
| `taskforce-pending` | 专班事项（明确要求表决） | `taskforce-proposal` | 决策 | 表决 | 专班记录存在 `committeeRequest` 且 `status === 'pending'` |
| `issue-committee` | 意见反馈（归口支委会） | `issue` | 讨论 | 讨论 | 反馈 `status === 'open'`、未隐藏、未合并，且领域 ∈ 归口支委会两类 |
| `institution-draft` | 制度草案（待支委会审议） | `branch-doc` | 决策 | 表决 | 支部文件为草案态（无 `status` 或 `draft`），或制度处于 `draft` |
| `party-meeting-pending` | 待报送党员大会的制度 | `branch-doc` | 同步 | 无需表态 | 制度 `purpose === 'institution'` 且 `status === 'pending-party-meeting'` |
| `activist-recommend` | 积极分子推荐（发展对象） | `member` | 决策 | 表决 | 成员 `developStage === '积极分子'` |
| `brand-proposal` | 品牌提案 | `activity` | 决策 | 表决 | 活动未归档、`isBrand !== true`，且 `brandProposal` 为对象 |

另纳入两类（同属支委会事项；**只进**待议池，**不得**并入「拟上会」六类清单）：

| 来源键 | 名称 | 引用类型 | 类型 | 判据 |
|---|---|---|---|---|
| `activity-approval` | 活动批准（待支委会表决） | `activity` | 决策 | `status === 'pending-approval'` 且 `approval.mode === 'branch-committee'` 且 `approval.state` 缺省或 `pending` |
| `assignment-adjust` | 分工调整（待支委会表决） | `activity` | 决策 | 活动 `extras.kind === 'workforce-proposal'` 且 `extras.adoptedAt` 为空 |

## 三、类型三值

| 类型 | 判据 | 期望产出 `expected` | 是否需要表决 `needDecision` |
|---|---|---|---|
| `decision` 决策 | 制度或议程依据要求表决，或记录结果会改变系统状态（状态迁移、名单变更、认定生效） | 形成决议 | true |
| `discussion` 讨论 | 只在会上形成意见，不改变任何系统状态 | 形成意见 | false |
| `sync` 同步 | 只需知悉或备案，会上不表决 | 知悉备案 | false |

- 制度**已审议通过、待党员大会表决**时，`expected` 必须写「报送党员大会」，`status` 必须写 `reported`；其余来源 `status` 为 `pending`。
- 类型徽章文案**必须**取本表 `label`（决策 / 讨论 / 同步），不得在页面另写一套叫法。

## 四、反例（不得判为决策）

| 情形 | 类型 | 期望产出 | 边界 |
|---|---|---|---|
| 专班创建 | 同步 | 知悉备案 | 创建专班工作组本身不要求表决；只有带 `committeeRequest: pending` 的报送才进池 |
| 活动创建 | 同步 | 知悉备案 | 日常活动创建属组织事务；活动批准另立 `activity-approval` 类 |
| 考勤交接 | 同步 | 知悉备案 | 台账移交只需知悉，不进需表决清单 |
| 制度已 `pending-party-meeting` | 同步 | 报送党员大会 | 支委会已审议通过，此处只报送，不再表决 |

## 五、服务端与客户端的计算分工

服务端**必须**算（跨人、跨设备必须一致的事实，见 `CLAUDE.md H32`）：

1. **去重**：去重键 ＝ `来源键:记录id`；同一来源同一记录只出现一次。不同来源指向同一活动视为两件事，不合并。
2. **时效**：`ageDays` ＝ 来源时点（`createdAt` / `submittedAt` / `uploadedAt` / `updatedAt` / `committeeRequest.at` / `date` / `at` 中首个可解析值）到当下的整日数；无时点则 `null`。
3. **类型**：`type` / `typeLabel` / `needDecision` / `expected`，取值只来自 §三。
4. **应到**：`attendees` ＝ `{ scope, count, personIds }`；`party-meeting-pending` 的 `scope` 为 `branch-party-meeting`（本支部党员阶段成员），其余为 `committee`（本支部支委）。
5. **支部过滤**：按 `branchId` 过滤每一条来源记录；支部账号只能读本支部，党委账号必须显式给 `?branchId=`。

客户端**只准**做：按类型分组（决策 → 讨论 → 同步）、组内排序（`ageDays` 长到短，同值按 `refId` 升序）、渲染徽章与文案。

- 客户端**不得**自行改判类型、改写议程文案、重算应到名单。
- 服务端不可用时，客户端只能显示「加载失败，请重试」；mock 形态可用同一分类函数本地归集，但**必须**标注「本地预览 · 应到名单未计算」。

## 六、端点契约

`GET /api/v1/committee/agenda-candidates`

- 权限：支委层（含支书 / 副支书 / 三委员）；非支委一律 403。支部账号的 `branchId` 由会话决定，传入他人支部一律 403。
- 查询参数：`branchId`（仅党委账号使用；缺省且无会话支部时 400）。
- 响应：数组，逐项字段固定为

| 字段 | 类型 | 含义 |
|---|---|---|
| `source` | string | §二 的来源键 |
| `sourceLabel` | string | 来源中文名 |
| `refKind` | string | 议程项 `sourceRef.kind` |
| `refId` | string | 来源记录 id |
| `item` | string | 议程文案（两端同一函数生成） |
| `type` | string | `decision` / `discussion` / `sync` |
| `typeLabel` | string | 决策 / 讨论 / 同步 |
| `step` | string \| null | 建议议程步骤：`vote` / `discussion` / `null`（只作提示，写入 `agendaStep` 仍由支书决定） |
| `needDecision` | boolean | 是否需要表决 |
| `expected` | string | 期望产出 |
| `status` | string | `pending` / `reported` |
| `dedupeKey` | string | 去重键 |
| `attendees` | object | `{ scope, count, personIds }` |
| `ageDays` | number \| null | 待议天数 |
| `meta` | string | 展示用补充说明（不参与对账） |

响应项另带议程引用字段（勾入议程时照搬，页面不得自行推断）：`kinds`，以及按来源出现的 `branchDocId` / `brandActivityId` / `approvalActivityId` / `personIds` / `toStage`。

## 七、验收

1. `cd server; $env:DISABLE_PASSWORD_CHECK=1; node --test test/agenda-classify.test.mjs`
   —— 覆盖：六类来源判据与类型、四反例、服务端返回与客户端 `classifyAgendaItem` 逐项一致（`item` / `type` / `step` / `needDecision` / `expected` / `status` / `dedupeKey`）、双支部互不串池、非支委 403。
2. 归口支委会的领域取值必须与母本派生集合相等（`ISSUE_DOMAINS` 中「建议归口」含支委会者）。
3. `node scripts/audit-tabs.mjs --tab secretary.committee-meeting` 无 P0 / P1。
