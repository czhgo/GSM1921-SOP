---
title: "交互与导航契约：待办 / 今天跳转与就地动作"
type: contract
status: active
version: 1.0
owner: 支书（契约裁决）；[工程师]+[AI]（维护）
acceptance: "server/test/todo-jump-contract.test.mjs 全绿（动作 × 六角色落点已注册、无 toast-only、缺 id 有显式提示、PendingTarget 已清理）；server/test/todo-cross-role-safety.test.mjs 绿"
last_updated: 2026-11-10
---

# 交互与导航契约：待办 / 今天跳转与就地动作

> 本契约回答「一条待办或今天页的一行被点击后，必须发生什么」。它约束 `docs/src/core/domain/todo-actions.js`、`docs/src/core/session/workspace-nav.js`、`docs/src/components/record/todo-tab-shell.js` 与六个工作台的待办页；不约束服务端派生口径（见 `.ctx/ENGINEERING_ASSESSMENT.md` 待办专项）。

## 一、动作声明

每个待办动作键（`actionKey`）必须在 `TODO_ACTIONS` 中声明一个对象，字段如下：

| 字段 | 必填 | 取值 | 说明 |
|---|---|---|---|
| `mode` | 是 | `inline` / `switch` / `direct` | 动作完成位置与跳转方式，三选一 |
| `tab` | 仅 `switch` | 页签 id | 目标工作台已注册的页签 id |
| `kind` | 是 | `activity` / `group` / `review` / `notice` / `member` / `attendance` / `inspection` / `handoff` | 目标对象类型，用于目标页定位 |
| `section` | 否 | 分段 id | 目标页内的分区，如纪检考勤页的 `makeup`、成员成长页的 `review` |
| `id` | 否 | 固定锚点 id | 仅当动作固定指向某一条记录时使用；常规由待办本体带 id |
| `label` | 是 | 文案 | 行尾按钮与详情主行动的文案单一源 |
| `roleOverrides` | 是（六台全覆盖） | 角色 → `{tab, kind, section}` | 六个工作台页签不同，逐台登记；缺一台即视为未完成 |
| `scopeOverrides` | 否 | `actionData.scope` → `{tab, kind}` | 同一动作按业务范围分流（如支书赋权的活动 / 专班） |

解析顺序固定：`actionKey` 优先于 `actionType`；角色覆盖优先于范围覆盖；范围覆盖优先于表项默认。调用方不得自行再写一套 `tabMap` 或 `if (actionKey === …)` 的落点分支。

## 二、三种模式

### `inline`——就地完成

确认、接收、通过、作废、删除、催办六类动作在**行尾或浮窗**完成，不切页签。声明 `mode: 'inline'` 时 `tab` 必须为空串。

- 行尾按钮与浮窗由待办列表与详情区提供；动作完成后必须重渲染当前页，或把该行从列表移除。
- 从只读页面（如「今天」）点击此类行时，落点是**待办页的该行**，由该行的行尾控件完成动作。
- 不得把 `inline` 动作改成「跳到某页让用户自己找按钮」。

### `switch`——同工作台可达

先查目标角色在本台注册的页签（单一源 `docs/src/core/domain/workspace-tabs.js::WORKSPACE_TAB_REGISTRY`）。

- **命中**：先写 `PendingTarget.set({tab, kind, id, section})`，再点击对应页签按钮；目标页渲染后一次性消费并定位。
- **未命中**：fail-closed。必须在内容区渲染可见提示「本台无该模块」，并给出**同义落点**按钮（工作概况 → 待办 → 今天，取本台第一个已注册者）。
- 不得只弹 toast、不得静默留在原页、不得直接拼 `workspace/<role>.html?tab=` 整页跳转。

### `direct`——对象详情

活动、专班、通知详情走对象详情路由（`object-route.js`；通知走 `notice.html?id=`）。这类入口不在对象所属工作台内，整页直达的点击成本更低。

- 缺对象 id 时不得跳空白详情页；必须给出「未定位到具体条目」可见提示。
- `direct` 动作的 `tab` 必须为空串。

## 三、缺 id 与定位

- 缺 id 时允许落到目标页顶部，但**目标页必须显示**「未定位到具体条目」，并说明可能已处理或已移出列表。
- 有 id 但页内找不到对应行时，同样显示该提示；不得静默停在列表顶部。
- 定位成功的判定：滚动到该条并给出一次高亮；折叠区内的目标必须先展开再定位。
- `PendingTarget` 为一次性状态：目标页渲染完成即 `consume()` 并清空。重渲染、切换页签、再点其他待办都不得复用上一条目标。

## 四、落点自检与守卫

- 运行期：`auditTodoActionTargets()` 逐动作 × 六角色解析，`switch` 目标页签必须在本台注册；缺项在模块加载时 `console.error`（显式报错，不静默失效）。
- 测试：`server/test/todo-jump-contract.test.mjs` 必须覆盖
  1. 动作表与六台能力注册表逐台页签 id 一致；
  2. 每个动作 × 六个角色的解析结果存在且落点已注册；
  3. `workspace-nav.js` 不含 toast-only 兜底；
  4. 缺 id 与未命中的显式提示文案存在；
  5. `PendingTarget` 设置与消费后清空。
- 真机：`server/test/today-action-groups-e2e.test.mjs` 校验今天页待办行为 `data-go="action"` 且带 `actionKey/sourceId`。

## 五、今天页的行

- 今天页的待办行必须写成 `data-go="action"` 并带 `data-action-key`、`data-source-id`、`data-todo-id`；点击后与待办页走同一契约（同一 `resolveTodoAction`，同一 `executeTodoAction`）。
- 非待办来源（会议、分工、表态、通知、汇报）保持各自既有落点：会议与分工走活动详情，通知走消息详情，汇报走待办「待答复」。
- 只读页面不得发明第二套跳转表；新增来源必须先在动作表登记，再在页面接线。

## 六、验收清单

| 判据 | 检查方式 |
|---|---|
| 六台页签清单与能力注册表一致 | `node --test test/todo-jump-contract.test.mjs`（页签集合比对） |
| 每个动作 × 六角色落点已注册 | 同上（`auditTodoActionTargets()` 为空） |
| 无 toast-only、无静默失败 | 同上（静态扫描 `workspace-nav.js` 与六台待办页） |
| 缺 id / 未命中给显式提示 | 同上（提示文案与 `data-nav-target-missing` 存在） |
| PendingTarget 一次性清理 | 同上（`set` → `consume` 后为空） |
| 跨角色待办不串台 | `node --test test/todo-cross-role-safety.test.mjs` |
