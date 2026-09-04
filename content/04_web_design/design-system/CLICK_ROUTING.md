# 点击落点映射表

> **权威源**：本文档为「什么地方可以点击、点击后落在哪里」的全局规范（书记 2026-08-29 分层原则裁定）。
> 适用于所有页面/工作台的可点击业务对象（活动/专班/通知/档案等）。
> 相关规范：[COMPONENT_SPEC.md](COMPONENT_SPEC.md)（组件交互态）、[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)（视觉规范）。

## 1. 分层原则（书记 2026-08-29 裁定）

同一业务对象在不同上下文允许不同落点，但**同一场景内必须一致**，且每一类落点必须有明确依据：

| 上下文 | 落点 | 依据 |
|---|---|---|
| 首页（已登录） | 跳本人工作台（`?activityId=` / `?taskforceId=` 定位） | 直达处理，最小操作成本（T-284 系列裁定） |
| 首页（未登录/访客态） | 跳 login.html（带对象 ID 意图） | T-284：未登录统一直达登录页，消除绕路 |
| 工作台内日历/列表 | 同页详情面板（setState 内嵌） | 工作台上下文内处理，不跳页 |
| 参与者活动动态 tab | 独立详情页 `activity.html?id=` | visitor 只读浏览视角（T233 裁定） |
| 通知内的活动/专班链接 | 独立详情页（`activity.html?id=` / `taskforce.html?id=`） | 通知直达详情（T233 裁定，resolveNoticeUrl 统一出口） |
| 归档库条目 | 弹窗展示归档详情 | 档案浏览场景（archive-entry） |

**统一出口**：跨页跳转统一经 `core/cross-page-state.js` 的 `buildURL`；通知链接统一经 `services/notice.js` 的 `resolveNoticeUrl`（杜绝多入口逻辑分叉）。

## 2. 活动条目落点映射表

| # | 入口（文件:行） | 落点 | 分层达标 |
|---|---|---|---|
| A1 | 首页活动列表 `components/dashboard/activity-panel.js:121` + `main-entry.js:87-95` | 工作台 `?activityId=` / 未登录 login | ✓ 分层① |
| A2 | 首页活动风采 `components/dashboard/gallery.js:53` + `main-entry.js:105-113` | 同上 | ✓ 分层① |
| A3 | visitor 活动动态 `entries/tabs/visitor/activities-tab.js:84,149,195` | 独立详情页 `activity.html?id=` | ✓ 分层④ |
| A4 | org 工作台日历 `components/calendar.js:479-495` + `activity-view.js` | 同页只读详情面板 | ✓ 分层③ |
| A5 | 书记工作台日历 `calendar-tab.js:103` + `inspector.js` | 同页可操作详情面板 | ✓ 分层③（可操作） |
| A6 | 工作台日历列表视图 `calendar.js:396-400` | 同页详情 | ✓ 分层③ |
| A7 | 通知活动链接 `notice.js:309-314` | 独立详情页 | ✓ 分层⑤ |
| A8 | 归档库条目 `archive-entry.js:116` | 弹窗详情 | ✓ 分层⑥ |

## 3. 专班条目落点映射表

| # | 入口（文件:行） | 落点 | 分层达标 |
|---|---|---|---|
| B1 | 首页专班列表 `dashboard/taskforce-list.js:40` + `main-entry.js:96-104` | 工作台 `?taskforceId=`（org 自动展开卡片/组长纪检 tf-view 高亮） | ✓ 分层① |
| B2 | org 专班管理卡片 `taskforce-tab.js:680` | 同页内嵌详情面板 | ✓ 分层③ |
| B3 | 组长/纪检专班查看 `components/taskforce-view.js:125` | 同页只读详情面板 | ✓ 分层③ |
| B4 | 通知专班链接 `notice.js:310` | 独立页 `taskforce.html?id=` | ✓ 分层⑤ |

## 4. 可点击性规范（T-304 Q2 全治裁定）

1. **光标兜底**：`styles.css` 全局 `button { cursor: pointer }` / `button:disabled { cursor: not-allowed }`（2026-08-29 已实施）——手写按钮不再逐个补 cursor。
2. **纯展示不加 hover 伪装**（COMPONENT_SPEC §4.2 硬性规则 4）：纯展示行/卡不得有 hover 上浮/变底（已清理：首页统计卡前三张、书记考勤明细行）。
3. **嵌套热区**：操作按钮嵌在可点击卡片内必须 `event.stopPropagation()` 阻断冒泡（已有：taskforce-tab/todo-list/header/references）——新增此类结构时必须同步阻断。
4. **z-index 层级**：浮层统一三档——dropdown 100 / modal 500 / overlay 9999，新浮层不得另起档位。

## 5. 一致性审计结论（2026-08-29）

- 全部 A1-A8 / B1-B4 案例均可在分层原则下解释达标，**无违规落点**。
- 已治理：未登录首页点击 `user.role` 空引用 TypeError（main-entry.js 判空，T-304 方案 B）；首页统计卡 hover 伪装（stats.js）；书记考勤明细行 hover 伪装（calendar-tab）。
- 遗留观察（非阻断）：`index.html:59` 静态写死 `workspace/visitor.html` 与 JS 按角色改写并存（T-284 有意）；z-index 已规范但需在新浮层开发时遵守。
