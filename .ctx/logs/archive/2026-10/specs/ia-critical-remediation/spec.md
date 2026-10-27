# IA 批判性修复 Spec（tab 合并 / 链接真值 / 交接）

## Why

`.ctx/AUDIT_IA_CRITICAL.md` 六路审查确认：主要成本不是卡片数量，而是同一任务多入口、首屏历史统计、角色无关链接、`highlight` 无人消费、跨角色交接缺确认/回执。支书已裁定：
- Tab 合并/删除五项全做（A01/A02/A04/A05/A06；A03/A07 低风险一并）。
- 链接真值建新契约：`resolveMaterialHref` + `focusActivityId` + `[data-act-id]` + `highlightType`。
- 跨角色交接先做四项：D01/D06/D04/D08。
- 卡片顺序先做低风险六项：B02/B06/B07/B08/B10/B12。
- 数据适配功能：mock 可删改，不为旧数据削足适履。

## What Changes

### 1. Tab 合并/删除（67 → 62）

| 编号 | 动作 | 旧 id 兼容 | 落点 |
|---|---|---|---|
| A01 | 删除纪检台 `tf-view` | `?tab=tf-view` → `calendar` 别名；`taskforceId` → `taskforce.html?id=` | `disc-workspace.js`、`ws-disc`、`taskforce-list.js`、`workforce-duty-card.js` |
| A02 | 删除宣传台 `tf-view` | `?tab=tf-view` → `kanban` 别名 | `prop-workspace.js`、`ws-prop`、首页映射 |
| A03 | 组长台 `tf-view` 只留 `group` 段 | tab id 不动 | `leader/tf-view-tab.js`、`ws-leader` |
| A04 | 组织台 `tf-view` 并入 `taskforce` | `?tab=tf-view` → `taskforce` 别名 | `org/taskforce-tab.js` 加「我参与的」筛选 |
| A05 | 党委 `monitor` 并入 `branches` | `?tab=monitor` → `branches` 别名 | 待批复列、支部筛选迁 `branches`；保留隐私边界 |
| A06 | 党委 `governance-overview` 并入 `review`+`branches` | `?tab=governance-overview` → `review` 别名；`defaultTab=review` | `party-committee-workspace.js`、首页/通知落点 |
| A07 | 宣传 `kanban` 归档桶并入 `archive` | tab id 不动 | `kanban-tab.js` 只留进行态；「去归档」→ `?tab=archive` |

### 2. 链接真值契约

- 新增 `resolveMaterialHref({ role, isOrganizer, actId })`：材料页四行按角色返回本位 href 或 `null`（纯文本交接）。
- 新增 `focusActivityId`：目标 tab 预选本场活动；**不复用** `activityId`（避免被各台 `onNavTarget` 劫持）。
- 壳 `_objectHighlightSelector` 补 `[data-act-id]`；`highlight` 加 `highlightType`（p/a/t/rq/tr/mcr/group），壳只匹配对应类型。
- 先止死链：C04、C06、C07、C12。
- 再落角色化：C01、C02、C03、C05。
- 通知深链：F01 改读 `ctx.navTarget.hl`；F02 改落 `thought-report.html?id=`；F03 `sourceId` 传 groupKey 或补 `data-mc-request-id`；F07 仅 workspace 加 `tab=todo`；F09 3s 清理；F12 按角色渲染。
- 定位失败必须可见提示，不静默落默认 tab。

### 3. 跨角色交接四项

- **D01 考察确认**：确认白名单纪检/支书/副支书；禁止 `actorId === recordedBy`；落 `confirmedBy/confirmedAt`。
- **D06 会议考勤**：上传统一 `recordedBy:null`，由另一名支委确认；或明确「录入即确认」并改队列文案。
- **D04 自动交接**：auto 类型不派生接收方待办；toast/badge 改「已自动送达」；confirm 幂等 true。
- **D08 组织委员考察写门**：把组织委员正式纳入 `INSPECTION_ROLE_WRITE`（建档代录）或封掉组织台直写；两端口径同源。

### 4. 卡片顺序（低风险六项）

- B02 今天「日程」合并两卡。
- B06 支书活动统计「待赋权」可点锚点。
- B07 宣传归档：待归档/初稿前置，展示下沉，模板进帮助。
- B08 宣传任务：已提交折叠。
- B10 纪检复盘：并一张「复盘监督」卡。
- B12 组织名册：统计并入列表卡头，导入下沉。

## Impact

- 代码：`capabilities/*-workspace.js`、`entries/workspace/ws-*.js`、`entries/tabs/**`、`components/shell/workspace-shell.js`、`components/dashboard/taskforce-list.js`、`core/domain/system-notice-templates.js`、`services/governance/handoff.js`、`services/activity/inspection.js`、`services/activity/attendance.js`。
- 文档：`help.html`、`README-server.md §3.2`、`docs/SNAPSHOT` 页签数、`DATA_MODEL.md`（交接状态）。
- 不改表结构；不改后端权限链（D08 的写门属既有服务判据补齐）。

## Acceptance

- Tab 67→62（A01/A02/A04/A05/A06 各减 1；A03/A07 是组内段/页内区，不减页签），旧 id 全部有别名；首页/通知/履职卡落点同步；page-sweep tab 数/帮助页/README 计数全绿。
- 材料页四行按角色落点；`focusActivityId` 契约被目标 tab 消费；`[data-act-id]` 可高亮；定位失败有提示。
- 通知深链 F01/F02/F03/F07/F09/F12 真机可定位；无静默落默认。
- D01/D06/D04/D08 有接口/真机测试；A 台已办、B 台仍待办的反向待办清零。
- 卡片六项不改功能，只改顺序/折叠；真机复核。
- 守卫：tab 别名、链接真值、交接状态、help/README 计数。
- 未重写 68 页签；未改表结构。

## Non-goals

- 不做视觉改版；不一次性重写所有 tab。
- A08（成员台 projects/tf-view 收窄）、B01/B03/B04/B05/B09/B11、D02/D03/D05/D07/D09/D12 留后续复议。
- 宽表卡式化等 IA 裁定后再做。
- 不改后端 API 语义；D08 只补既有写门。
