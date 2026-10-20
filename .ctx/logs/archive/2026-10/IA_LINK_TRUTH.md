---
title: "IA 链接真值审计（角色 + 对象 + 步骤）"
type: audit_report
role: "[工程师]+[AI]"
last_updated: "2026-10-19"
status: active
related_files: [.ctx/IA_INVENTORY.md, .ctx/AUDIT_IA_CRITICAL.md, .trae/specs/audit-information-architecture-critical/spec.md]
---

# IA 链接真值审计

> 判据：链接不是「能打开」就算对，而是「该角色 + 该对象 + 该步骤」的正确落点。
> 根因：工作台身份门（`bootstrap.js:172-201`）只放行本人角色台；跨台链接对非该台角色会被弹回并丢失 `tab`/对象。
> 矩阵：`.ctx/IA_INVENTORY.md`（124 链接 / 28 深链）。

## 一、材料闭环页：逐角色落点（主锚点）

来源：`docs/src/entries/pages/activity-materials-entry.js:105,117-125`。

| 材料行 | 现状目标 | 支书/副支书 | 组织委员 | 宣传委员 | 纪检委员 | 组长 | 成员组织者 | 其他成员 |
|---|---|---|---|---|---|---|---|---|
| 宣传材料（照片） | `prop.html?tab=archive` | 本页提交归档 + 纯文本「由宣传委员补材料」 | 纯文本交接 | `prop.html?tab=archive&highlight=<actId>`（缺件 focus） | 纯文本交接 | 纯文本交接 | 纯文本交接 | 纯文本交接 |
| 考勤 | `disc.html?tab=attendance` | `secretary.html?activityId=<actId>` 只读 + 交接 | 纯文本交接（组织台无考勤上传位） | 纯文本交接 | `disc.html?activityId=<actId>`（党课/党员大会）；党小组会/主题党日→组织者位 | `leader.html?tab=attendance` | `visitor.html?tab=attendance#org-host` | 纯文本「由组织者/纪检上传」 |
| 考察 | `disc.html?tab=inspection` | `secretary.html?activityId=<actId>` 只读 + 交接 | `org.html?tab=talent`（建档汇总位） | 纯文本交接 | `disc.html?tab=inspection`（确认/打回） | `leader.html?tab=inspection` | `visitor.html?tab=inspection` | 纯文本「由组织者提交、纪检确认」 |
| 复盘 | `visitor.html?tab=review` | `secretary.html?tab=group-progress`（只读状态） | 纯文本交接 | 纯文本交接 | `disc.html?tab=review`（监督/督办） | `leader.html?tab=members`（组员进展内只读） | `visitor.html?tab=review&focus=<actId>` | 纯文本「由组织者提交」 |
| 归档动作 | 本页 `archiveActivity` | 可提交 | 可提交 | 可提交 | 可提交 | 本页可提交（若入口对其开放） | 本页可提交（若入口对其开放） | 只读 |

**真机读数（2026-10-19）**：组长登录 → `activity-materials.html?id=act-1` → 材料行「考勤」链接（`./workspace/disc.html?tab=attendance`）→ 最终 URL `http://localhost:3000/workspace/leader.html`。确认：跨台链接被工作台身份门弹回，`tab` 与活动对象全部丢失。

**技术前置**：
- `focusActivityId` 新契约（不要复用 `activityId`，避免被各台 `onNavTarget` 劫持）。
- 壳的 `_objectHighlightSelector` 补 `[data-act-id]`，否则复盘卡无法高亮。
- 「去补充」与「去核对」分角色/分步骤，不能同一目标只换文案。

## 二、其他高风险链接

| 编号 | 链接 | 来源 | 现状目标 | 问题 | 正确目标 | 严重度 |
|---|---|---|---|---|---|---|
| C06 | 考勤管理 / 打回确认 | `visitor/activities-tab.js:53` | `leader.html?tab=attendance` | 普通成员组织者进不了组长台，被弹回 | 本台 `visitor.html?tab=attendance#org-host`；组长才落 leader | P1 |
| C07 | 去宣传台查看 | `secretary/overview-tab.js:105` | `prop.html?tab=archive` | D-807④ 已撤支书进宣传台，点击被弹回 | 本台 `?tab=todo` 代归档，或纯文本 | P2 |
| C08 | 首页党委活动/专班 | `main-entry.js:130-166` | `party-committee.html?activityId=` | 党委台无 `onNavTarget`，对象被清 | `activity.html?id=` 或 `monitor&branchId=` | P2 |
| C09 | 未登录活动/专班 | `main-entry.js:76-78,126-136` | `login.html?activityId=` | 登录后不回对象 | 登录保留 `next`，按角色回对象 | P2 |
| C10 | 返回 | `activity-materials-entry.js:39-44` | 固定活动详情 | 从工作台来也回公开页，丢上下文 | referrer 同源 workspace→history.back() | P3 |
| C11 | 材料页可见性 | `activity-materials-entry.js:67-76` | 只校验登录+存在 | 待批活动可被非支委凭 id 读 | 复用 `isActivityVisibleTo` | P2 |
| C12 | 材料闭环入口 | `activity-entry.js:450` | 所有角色无条件 | 普通成员进入「看得到做不了」 | 仅组织者/支委/宣传；其余只读或隐藏 | P3 |
| F01 | `review&highlight=<rq>` | `system-notice-templates.js:148` | 壳先清参，页面读 URL 恒空 | 通知无法定位 | 读 `ctx.navTarget.hl`；失败提示 | 高 |
| F02 | `thought-review&highlight=<tr>` | `system-notice-templates.js:42-48` | 页面不消费，矩阵无锚点 | 深链失效 | 改落 `thought-report.html?id=` 或补 `data-tr-id` | 高 |
| F03 | `todo&highlight=<mcr>` | `system-notice-templates.js:73-78` | 待办不消费，聚合键不同 | 无法定位成员确认项 | sourceId 传 groupKey 或补 `data-mc-request-id` | 高 |
| F04 | 成员变更通知 | `system-notice-templates.js:73-78` | 无受众→全站广播 | 非支书被弹回 | 补 `audience/actionRoles` | 高 |
| F05 | 作废裁决通知 | `system-notice-templates.js:304` | 固定支书台 | 受众可能是委员 | 按 `row.role` 生成对应工作台 | 高 |
| F06 | `targetUrl` 与 `targetType` 并存 | `system-notice-templates.js:106,170,287` | targetUrl 永不生效 | 文案与落点不一致 | 明确优先级或删 targetUrl | 中 |
| F07 | `todo&highlight=<groupKey>` | `todo-tab-shell.js:714-728` | 页面不消费；可落 index.html?tab=todo | 催办落到首页/折组不可见 | 仅 workspace 加 tab；补 highlight 消费 | 中 |
| F08 | `tab` 被支部配置隐藏 | `workspace-shell.js:383,403-426` | 静默回退默认 tab | 用户以为链接坏了 | 内容区可见提示+替代落点 | 中 |
| F09 | `highlight` 无类型 | `workspace-shell.js:544-595` | 值域混杂；定时器不清理 | 跨 tab 语义串味 | `highlightType`/前缀；3s 清理 | 中 |
| F10 | `id/activityId/branchId` | 多处 | 同名异义；详情页不收别名 | 复制链接易失效 | 固定契约；详情页收别名归一 | 中 |
| F11 | `branchId` 筛选 | `monitor-tab.js:52`、`branch-filter.js:17-22` | 空值被 `||` 回退 | mock 不能清除筛选 | `Map.has` + 空值删 URL | 中 |
| F12 | 跨台 prop/disc/visitor | 多处 | 对当前角色不可达 | 被弹回丢上下文 | 按角色渲染本位入口/纯文本 | 高 |

## 三、修复顺序（建议）

1. **先止死链**：C04、C06、C07、C12——只改链接/显隐，不动结构。
2. **定契约**：C05 `focusActivityId`；壳补 `[data-act-id]`；F09 `highlightType` + 清理。
3. **按角色落点**：C01、C02、C03；F12 同步。
4. **通知深链**：F01、F02、F03、F04、F05、F07。
5. **回跳与可见性**：C08、C09、C11；F08、F11。
6. **文案与假入口**：C10、C12。

## 四、边界

- 本文件只审链接真值；不改代码。
- 「角色可达性」以 `bootstrap.js` 工作台身份门与 `ROLE_PAGE_MAP` 为准；动态变量目标标「待真机」。
- 所有目标页 tab 均已核对 `capabilities/*-workspace.js` 注册表。
