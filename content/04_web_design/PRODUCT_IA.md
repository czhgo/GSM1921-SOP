---
title: "产品 IA 派生索引（页签功能地图）"
type: index
role: "[工程师]+[AI]"
last_updated: "2026-10-29"
version: "0.2"
status: active
related_files: [docs/src/core/domain/function-catalog.js, docs/src/capabilities/, content/03_doc_system/DOC_MAP.md]
---

# 产品 IA 派生索引（页签功能地图）

> **定位：派生索引，不承担规范，禁止手改。** 本文件由 `docs/src/capabilities/*-workspace.js`（页签注册单一源）与 `docs/src/core/domain/function-catalog.js`（功能目录单一源）派生而来，只回答「哪台有哪些页签、各自归哪组、主对象与主操作是什么」。
> **不负责什么**：页签的规范定义（分组轴见 [DS_03_COMPONENTS.md §4.6](design-system/DS_03_COMPONENTS.md)；组件与承载面见同文 §10.7 / §12.15，§10.7 在 [DS_05_MAP_AND_REFERENCE.md](design-system/DS_05_MAP_AND_REFERENCE.md)）、页签注册本身（改 `capabilities/*`）、术语定义（见 [TERMINOLOGY.md](../03_doc_system/TERMINOLOGY.md)）。
> **维护方式**：页签增删改 → 先改 `capabilities/*`，再同批按实况重写本表；`catalog-sync` 校验本表页签集合与注册表一致。**不得只改本表**。
> **当前总数：45**（支书 10 / 组织 8 / 宣传 5 / 纪检 6 / 组长 6 / 成员 7 / 党委 3）。2026-10-25 Task 5 完成 62 → 45；被删/降的 17 项见文末「旧页签 → 新落点」重定向表。

## 页签表（45）

| 台 | 组 | 页签 | 渲染入口 | 一句话职责 | 主对象 | 主操作 | 新落点 |
|---|---|---|---|---|---|---|---|
| 支书 | 总览 | 今天 | `entries/tabs/today/today-tab.js` | 登录落点：今日待办、会议与分工速览 | 个人日程 / 待办 | 跳转待办 / 详情 | — |
| 支书 | 总览 | 待办 | `entries/tabs/secretary/todo-tab.js` | 未读消息条 + 工作域折组的待办收件箱 | 待办 | 处理 / 跳转 | — |
| 支书 | 总览 | 全局概况 | `entries/tabs/secretary/overview-tab.js` | L2 全局：统一待处理队列与责任线指标；页内「知情查看」卡 | 工作概况 / 工作组 | 处理队列 / 切工作组分段 | 承接原「知情查看」页签（卡内只读） |
| 支书 | 我的职责 | 活动管理 | `entries/tabs/secretary/calendar-tab.js` | 全支部活动生命周期：日历 + 工具栏筛选（关键词 / 类别 / 品牌 / 党小组活动）+ 写入 | 活动 | 写入 / 筛选 / 记录 | 查询并入日历工具栏；活动赋权在活动详情 |
| 支书 | 我的职责 | 支委会 | `entries/tabs/secretary/committee-meeting-tab.js` | 支委身份构成与支委会会议入口 | 支委会 / 会议 | 授予 / 改派 / 开会 | — |
| 支书 | 我的职责 | 党小组 | `entries/tabs/secretary/group-progress-tab.js` | 党小组清单管理 + 跨组进展只读 | 党小组 | 新增 / 改名 / 解散 / 设组长 | — |
| 支书 | 我的职责 | 通知发布 | `entries/tabs/secretary/notification-tab.js` | 发布与管理消息（公告 / 系统通知 / 私信） | 消息 | 发布 / 编辑 / 删除 | — |
| 支书 | 我的职责 | 上报党委 | `entries/tabs/secretary/report-up-tab.js` | 支部关键事项上报党委并收回传结论 | 上报 | 提交 / 查看结论 | — |
| 支书 | 协作与知情 | 支部分工 | `entries/tabs/secretary/work-map-tab.js` | 支部工作地图：模块定人定责定岗（默认责任关系主从） | 分工 | 查看 / 调整分工 | — |
| 支书 | 制度与答复 | 意见反馈 | `entries/tabs/secretary/feedback-tab.js` | 收阅成员意见反馈并跟进处理 | 反馈 | 回复 / 关闭 | — |
| 组织 | 总览 | 今天 | `entries/tabs/today/today-tab.js` | 登录落点：今日待办、会议与分工速览 | 个人日程 / 待办 | 跳转待办 / 详情 | — |
| 组织 | 总览 | 待办 | `entries/tabs/org/todo-tab.js` | 未读消息条 + 工作域折组待办；页内「我经办的反馈」区 | 待办 / 反馈 | 处理 / 跳转 / 追加说明 | 承接原「我的处置」页签 |
| 组织 | 总览 | 工作概况 | `entries/tabs/org/overview-tab.js` | 汇报 / 卡点 / 在办三区总览；页内「活动日历」折叠卡 | 工作概况 / 活动 | 查看 / 跳转 / 展开日历 | 承接原「活动日历」页签（含跨组招募与活动进展） |
| 组织 | 我的职责 | 成员名册 | `entries/tabs/org/roster-tab.js` | 在册成员与档案状态维护 | 成员 | 新增 / 编辑 / 移出 | — |
| 组织 | 我的职责 | 人才库 | `entries/tabs/org/talent-tab.js` | 按发展阶段观察成员；页底折叠区录入考察 | 成员发展 / 考察 | 查看 / 录入考察 | — |
| 组织 | 我的职责 | 思想汇报 | `entries/tabs/org/thought-review-tab.js` | 思想汇报台账（人 × 期次）查看与打回 | 思想汇报 | 查看 / 打回 | — |
| 组织 | 我的职责 | 专班管理 | `entries/tabs/org/taskforce-tab.js` | 专班全生命周期 + 专班工作组赋权（本页「项目赋权 · 专班」） | 专班 / 专班工作组 | 发起 / 统筹 / 赋权 / 归档 | 承接原支书台「项目赋权 · 专班」 |
| 组织 | 我的职责 | 成员流动 | `entries/tabs/org/member-flow-tab.js` | 成员流入 / 流出登记与对账台账（本位） | 成员流动 | 登记 / 撤销 | 承接原支书台「成员流动」页签 |
| 宣传 | 总览 | 今天 | `entries/tabs/today/today-tab.js` | 登录落点：今日待办、会议与分工速览 | 个人日程 / 待办 | 跳转待办 / 详情 | — |
| 宣传 | 总览 | 待办 | `entries/tabs/prop/todo-tab.js` | 未读消息条 + 工作域折组待办；页内「我经办的反馈」区 | 待办 / 反馈 | 处理 / 跳转 / 追加说明 | 承接原「我的处置」页签 |
| 宣传 | 总览 | 工作概况 | `entries/tabs/prop/overview-tab.js` | 汇报 / 卡点 / 在办三区总览；页内「活动日历」折叠卡 | 工作概况 / 活动 | 查看 / 跳转 / 展开日历 | 承接原「活动日历」页签 |
| 宣传 | 我的职责 | 项目看板 | `entries/tabs/prop/kanban-tab.js` | 活动与专班合并看板 + 「宣传任务」泳道 | 项目 / 宣传任务 | 推进 / 接单 / 提交 | 承接原「宣传任务」页签 |
| 宣传 | 我的职责 | 档案归档 | `entries/tabs/prop/archive-tab.js` | 活动材料归档、支部文件与周期报送 | 档案 / 材料 | 上传 / 归档 / 报送 | — |
| 纪检 | 总览 | 今天 | `entries/tabs/today/today-tab.js` | 登录落点：今日待办、会议与分工速览 | 个人日程 / 待办 | 跳转待办 / 详情 | — |
| 纪检 | 总览 | 待办 | `entries/tabs/disc/todo-tab.js` | 未读消息条 + 工作域折组待办；页内「我经办的反馈」区 | 待办 / 反馈 | 处理 / 跳转 / 追加说明 | 承接原「我的处置」页签 |
| 纪检 | 总览 | 工作概况 | `entries/tabs/disc/overview-tab.js` | 汇报 / 卡点 / 在办三区总览；页内「活动日历」折叠卡 | 工作概况 / 活动 | 查看 / 跳转 / 展开日历 | 承接原「活动日历」页签 |
| 纪检 | 我的职责 | 考勤管理 | `entries/tabs/disc/attendance-tab.js` | 全支部考勤管理，含「考勤 / 补课」一级分段 | 考勤 | 确认 / 上传 / 补课 | — |
| 纪检 | 我的职责 | 复盘 | `entries/tabs/disc/review-tab.js` | 活动 / 专班复盘评议 | 复盘 | 批注 / 打回 / 确认 | — |
| 纪检 | 我的职责 | 考察管理 | `entries/tabs/disc/inspection-tab.js` | 考察确认与建档归集 | 考察 | 查看 / 确认 | — |
| 组长 | 总览 | 今天 | `entries/tabs/today/today-tab.js` | 登录落点：今日待办、会议与分工速览 | 个人日程 / 待办 | 跳转待办 / 详情 | — |
| 组长 | 总览 | 待办 | `entries/tabs/leader/todo-tab.js` | 未读消息条 + 工作域折组待办；页内「我经办的反馈」区 | 待办 / 反馈 | 处理 / 跳转 / 追加说明 | 承接原「我的处置」页签 |
| 组长 | 总览 | 工作概况 | `entries/tabs/leader/overview-tab.js` | 汇报 / 卡点 / 在办三区总览；页内「活动日历」折叠卡 | 工作概况 / 活动 | 查看 / 跳转 / 展开日历 | 承接原「活动日历」页签 |
| 组长 | 我的职责 | 本组活动 | `entries/tabs/leader/write-tab.js` | 本组活动创建与现场考勤录入 | 活动（本组） | 写入 / 录入考勤 | — |
| 组长 | 我的职责 | 考勤管理 | `entries/tabs/leader/attendance-tab.js` | 本组活动考勤上传 | 考勤 | 录入 / 上传 | — |
| 组长 | 我的职责 | 组员进展 | `entries/tabs/leader/members-tab.js` | 本组组员进度 / 考勤 / 考察与复盘；独立区「其他党小组」+ 页内「上传考察」 | 成员 / 党小组 / 考察 | 查看 / 了解进展 / 上传考察 | 承接原「知情查看」「考察管理」页签 |
| 成员 | 总览 | 今天 | `entries/tabs/today/today-tab.js` | 登录落点：今日待办、会议与分工速览 | 个人日程 / 待办 | 跳转待办 / 详情 | — |
| 成员 | 总览 | 待办 | `entries/tabs/visitor/todo-tab.js` | 未读消息条 + 工作域折组待办；页内「我经办的反馈」区 | 待办 / 反馈 | 处理 / 跳转 / 追加说明 | 承接原「我的处置」页签 |
| 成员 | 总览 | 工作概况 | `entries/tabs/visitor/overview-tab.js` | 汇报 / 卡点 / 在办三区（仅自我聚合） | 工作概况 | 查看 / 跳转 | — |
| 成员 | 我的职责 | 活动动态 | `entries/tabs/visitor/activities-tab.js` | 活动浏览与报名，自带列表 / 日历 / 查询三视图 | 活动 | 报名 / 查看 | — |
| 成员 | 我的职责 | 项目分工 | `entries/tabs/visitor/projects-tab.js` | 我的任务 / 我的分工 / 全局分工 + 「专班」区 | 活动 / 专班工作组 | 查看 / 勾掉任务 / 填报产出 | 承接原「专班动态」页签 |
| 成员 | 我的职责 | 考勤概况 | `entries/tabs/visitor/attendance-tab.js` | 个人考勤与补课状态 | 考勤 | 查看 | — |
| 成员 | 我的职责 | 我的成长 | `entries/tabs/visitor/growth-tab.js` | 思想汇报 / 我的考察 / 我的复盘三个子区 | 思想汇报 / 考察 / 复盘 | 提交 / 查看 / 申诉 / 复盘 | 合并原「思想汇报」「我的考察」「我的复盘」三页签 |
| 党委 | 党委治理 | 下发通知 | `entries/tabs/party-committee/dispatch-tab.js` | 向目标支部下发治理通知 | 消息（党委下发） | 选支部 / 下发 | — |
| 党委 | 党委治理 | 支部上报 | `entries/tabs/party-committee/review-tab.js` | 审批支部上报事项 | 上报 | 批准 / 驳回 | — |
| 党委 | 党委治理 | 支部管理 | `entries/tabs/party-committee/branches-tab.js` | 支部实例目录与配置 | 支部 | 查看 / 配置 | — |

## 统计

| 台 | 页签数 |
|---|---:|
| 支书 | 10 |
| 组织 | 8 |
| 宣传 | 5 |
| 纪检 | 6 |
| 组长 | 6 |
| 成员 | 7 |
| 党委 | 3 |
| **合计** | **45** |

## 附：旧页签 → 新落点（重定向表）

> 口径：旧 `?tab=<旧id>` 一律由 `components/shell/workspace-shell.js::_legacyTabAliases` 重定向到「新页签 + `section` / `filter` / `lane` 参数」，并给可见提示（toast）；书签 / 待办 / 通知深链不落空。跨台迁移（支书「成员流动」）走页面级重定向，落地后 toast 说明。

| # | 台 | 旧页签（id） | 新页签（id） | 页内落点 / 参数 | 可见说明 |
|---|---|---|---|---|---|
| 1 | 支书 | 知情查看（`tf-view`） | 全局概况（`overview`） | `section=insight` → 页内「知情查看」卡（活动工作组 / 专班工作组） | toast「已并入工作概况」 |
| 2 | 支书 | 成员流动（`member-flow`） | 组织台「成员流动」（`org.html?tab=member-flow`） | 跨页重定向 `legacy=member-flow` | 落地 toast「入口已收口到组织台」 |
| 3 | 组织 | 活动日历（`calendar`） | 工作概况（`overview`） | `section=calendar` → 展开「活动日历」折叠卡（含跨组招募 / 活动进展） | toast「已并入工作概况」 |
| 4 | 组织 | 我的处置（`my-dispatch`） | 待办（`todo`） | `filter=dispatch` → 滚到「我经办的反馈」区 | toast「已并入待办 · 我经办的反馈」 |
| 5 | 宣传 | 活动日历（`calendar`） | 工作概况（`overview`） | `section=calendar` → 展开活动日历折叠卡 | toast「已并入工作概况」 |
| 6 | 宣传 | 我的处置（`my-dispatch`） | 待办（`todo`） | `filter=dispatch` | toast「已并入待办 · 我经办的反馈」 |
| 7 | 宣传 | 宣传任务（`tasks`） | 项目看板（`kanban`） | `lane=tasks` → 滚到「宣传任务」泳道 | toast「已并入项目看板」 |
| 8 | 纪检 | 活动日历（`calendar`） | 工作概况（`overview`） | `section=calendar` | toast「已并入工作概况」 |
| 9 | 纪检 | 我的处置（`my-dispatch`） | 待办（`todo`） | `filter=dispatch` | toast「已并入待办 · 我经办的反馈」 |
| 10 | 组长 | 活动日历（`calendar`） | 工作概况（`overview`） | `section=calendar` | toast「已并入工作概况」 |
| 11 | 组长 | 我的处置（`my-dispatch`） | 待办（`todo`） | `filter=dispatch` | toast「已并入待办 · 我经办的反馈」 |
| 12 | 组长 | 知情查看（`tf-view`） | 组员进展（`members`） | `section=groups` → 「其他党小组」独立区 | toast「已并入组员进展」 |
| 13 | 组长 | 考察管理（`inspection`） | 组员进展（`members`） | `section=inspection` → 页内「上传考察」折叠区 | toast「已降为组员进展页内动作」 |
| 14 | 成员 | 我的处置（`my-dispatch`） | 待办（`todo`） | `filter=dispatch` | toast「已并入待办 · 我经办的反馈」 |
| 15 | 成员 | 专班动态（`tf-view`） | 项目分工（`projects`） | `section=taskforce` → 「专班」区 | toast「已并入项目分工」 |
| 16 | 成员 | 思想汇报（`thought-report`） | 我的成长（`growth`） | `section=thought` → 「思想汇报」子区 | toast「已并入我的成长」 |
| 17a | 成员 | 我的考察（`inspection`） | 我的成长（`growth`） | `section=inspection` → 「我的考察」子区 | toast「已并入我的成长」 |
| 17b | 成员 | 我的复盘（`review`） | 我的成长（`growth`） | `section=review` → 「我的复盘」子区 | toast「已并入我的成长」 |

> 计数说明：目标表按「删/降项」计 17 项（成员台三项合并记 2 个减少量），页签净减 17 ⇒ 45。

## 来源

- 页签注册（台 / 组 / 页签名 / 渲染入口）：`docs/src/capabilities/{secretary,org,prop,disc,leader,visitor,party-committee}-workspace.js`
- 功能目录（能力名 / 所属组 / 使用路径）：`docs/src/core/domain/function-catalog.js`
- 旧深链承接：`docs/src/components/shell/workspace-shell.js::_legacyTabAliases` / `_legacyPageRedirects`

## 附：About 撤路由（2026-10-27 批次 514）

> **口径**：`about.html` **仅保留文件，不作路由**——不进入页面清单、侧边栏导航、帮助目录与 README 指针；旧外链 / 收藏仍可直达（不制造 404），但系统不再把它当维护中的页面入口。
>
> **独立冻结件（2026-10-27 支书裁定）**：About **与本项目无关，属独立件**——`docs/about.html`、`docs/src/about.css`、`docs/src/entries/pages/about-entry.js` **原样保留、不作修改**；**也不去修改它的引用面**（功能目录里的「关于」卡、help 正文的页面清单均**不动**）。它既不纳入本项目的 IA / 页面清单统计，也不纳入守卫扫描与待办清单。→ 由此，凡「About 功能卡 / help 页面清单仍有『关于』」**不再算待办**，出手修改即违规。
>
> - **页面清单 / 导航**：本文件的页签表（45 项）与旧页签重定向表均不含 About；侧边栏、help 目录、README 的入口已删除。
> - **文件保留**：`docs/about.html` 与 `docs/src/entries/pages/about-entry.js` 仍在仓库中，供历史外链直达；**不再新增**指向它的 href / `module: 'about'` 侧栏项 / 文档登记指针。
> - **判据与守卫**：`no-about-route-guard::A1–A4`（HTML 零链接 / JS 零路由与侧栏项 / Markdown 零指针 / 文件仍存在且非空）；判例边界见 [CASES.md](design-system/CASES.md) CASE-DESIGN-026。**守卫只覆盖上列四项，不扫功能目录与 help 正文**——那两处属独立件，刻意不判。**冻结件内容基线**另由 `server/test/about-freeze-guard.test.mjs` 承担（5 处：三件套整文件哈希 ＋ 功能目录「关于」卡 / help 正文页面清单的定位片段，改动即红）。
> - **后续**：若要恢复「关于」入口，须同时补页面清单、导航、help 落点与守卫白名单，不得只加回一个链接。

## 详情路由矩阵（派生附录，检查用 · 2026-10-26）

> **单一源**：`docs/src/core/domain/object-route.js::OBJECT_ROUTE_ENTRIES`。本表由该枚举派生、与代码同批维护，**不是**规范条文；规范判据见 [DS_03_COMPONENTS.md §12.15](design-system/DS_03_COMPONENTS.md)（SD-45），判例见 [CASES.md](design-system/CASES.md) CASE-DESIGN-023。
> **读法**：`direct`＝直达完整详情页；`locate`＝先留在当前工作台 / 预览面，再给「打开完整页」；`none`＝不渲染可点入口。

| 入口（`entry` 键） | 典型入口（页面 / 页签） | 对象 | mode | 落点 | 理由 |
|---|---|---|---|---|---|
| `notice` | 通知全貌 `notice.html?id=`、消息中心对象卡 | 活动 / 专班 | direct | `activity.html?id=` / `taskforce.html?id=` | 通知不在对象所属工作台内，对象卡是唯一动作 |
| `todo` | 待办页签、待办跳转（`todo-jump.js`） | 活动 / 专班 | direct | 同上 | 跨工作台聚合，没有可保留的筛选 / 列表上下文 |
| `home` | 首页活动风采卡、首页快捷入口 | 活动 / 专班 | direct | 同上 | 首页是跨对象聚合面，不是对象工作台 |
| `today` | 今天页日程行 / 待办摘要 | 活动 | direct | `activity.html?id=` | 跨对象日程摘要，行上没有所属列表 |
| `shared-calendar` | 六台共享日历（`tabs/shared/activity-calendar-tab.js`） | 活动 | direct | `activity.html?id=` | 只读日历不承载完整详情；同页再放完整面会形成第二落点 |
| `cross-page-deeplink` | 分享 / 跨台深链（党委、组长、纪检入口、材料页） | 活动 / 专班 | direct | 对应详情页 | 没有来源工作台上下文，落台目标未知 |
| `archive-row` | 档案归档页活动行（`tabs/prop/archive-tab.js`） | 活动 | direct | `activity.html?id=` | 归档库是跨对象聚合面，归档行不提供就地编辑 |
| `workspace-aggregate` | 工作台内跨对象列表（项目分工活动卡、看板、复盘 / 考察 / 考勤的来源列） | 活动 / 专班 | direct | 对应详情页 | 列表本身不是该对象所属工作台，不承载完整详情 |
| `owner-workspace` | 支书活动管理 inspector、组织台专班管理面板、成员项目分工专班卡 | 活动 / 专班 | locate | 同页预览 ＋「打开完整页」 | 已在对象所属工作台，整页跳走会丢失筛选 / 列表上下文 |
| `archive-modal` | 归档库活动 / 专班弹窗 | 活动 / 专班 | locate | 弹窗预览 ＋「打开完整页」 | 弹窗是列表内预览面，跳走会丢列表与页码 |
| `overview-preview` | 工作概况活动预览卡（`record/activity-view.js`） | 活动 | locate | 同页预览 ＋「打开完整页」 | 预览卡已是同页只读详情面，不再整页跳走 |

**`none` 分支（不属于某个入口，对所有入口一致）**：缺 `id` → `none`；跨支部普通角色 → `none`；未登记入口 → `none`；党委（`party-staff`）/ 组织员（`org-commissioner`）放行。已归档活动与专班终态仍可点，但 `readOnly=true`，详情页写口关闭并显示「已归档，只读保留」。深链未命中必须有可见提示（归档库 / 组织台 `?taskforceId=`）。

## 样板屏元素清单（检查用，不是规范）

> **这一步只回答「同一屏里同类元素能不能只出现一档」**，不新增规范、不改 IA。规范正文仍在
> [DESIGN_SYSTEM.md](design-system/DESIGN_SYSTEM.md)；本清单是 Task 4「同屏纵向一致」的检查底稿，
> 随样板屏实现同批维护，**不是**新的权威源。
>
> **维护边界**：本文件正文的页签表仍由代码派生、**禁止手改**；只有这一节「样板屏元素清单」是
> 人工维护的检查附录——改样板屏时同批改这里，改页签注册表时只重派生上面的表。
>
> **总规矩：同屏同类元素只用一档。** 同一屏里，分区头只能有一种组件、折叠头只能有一种实现、
> 同类动作只能有一个按钮档、同一个计数只能出现在一个位置、说明只能后置且不与标题复述。
> 跨屏不要求逐字相同（各台可各有主题色与密度），但**屏内不得混档**。

### 屏 1 · 支书台「活动管理」

实现：`docs/src/entries/tabs/secretary/calendar-tab.js`（+ 共享 `components/record/calendar.js` / `inspector.js`）

| 元素 | 允许的组件 / 类 | 档位 | 同屏约束 |
|---|---|---|---|
| 页面标题 | `renderTabHeader` | H2 · 20px · 600 | 一屏一个，不复述为卡头 |
| 分区头（卡头） | `renderCardHeader` | H3 · 16px · 600 · 宋体 | 同屏只此一种；右侧只放动作 |
| 统计条 | `#secretary-stats` 文本行 | 12px · 400（数值 600） | 只列活动域指标（待赋权 / 活跃 / 本月）；不挂徽章 |
| 筛选控件 | `.input-flat` | 40px · 13px | 月份 / 关键词 / 类别 / 品牌 / 范围同高同字号 |
| 筛选行动作 | `.btn-tab.lf-btn` | 36px · 13px | 只「清除」一档，与筛选控件基线对齐 |
| 视图分段 | `.btn-tab` ＋ `.active` | 32px · 13px | 月 / 周 / 日 / 列表；分段控件不写成动作按钮 |
| 卡头动作 | `.btn-accent-soft` | 36px · 13px | 「+ 新建党小组活动」次主操作一档 |
| 折叠头 | `renderDisclosure` | 标题兄弟 H3 · `summary` 仅 `aria-labelledby` | 文件内不再手写 `details` / `summary`；同 chevron / 内边距（本屏仅写入浮窗两处） |
| 行内徽章 | `badgeHtml`（生命周期 / 品牌） | 组件自带 | 不与 `state-badge` 混用 |
| 说明 | `.text-xs .text-gray-500`，主体之后 | 12px · 400 | 页脚只留「活动赋权在活动详情、专班赋权在组织台」 |

### 屏 2 · 支书台「全局概况」

实现：`docs/src/entries/tabs/secretary/overview-tab.js` ＋ `components/governance/work-overview.js`
＋ `components/record/insight-view.js`（`embedded` 形态）

| 元素 | 允许的组件 / 类 | 档位 | 同屏约束 |
|---|---|---|---|
| 页面标题 | `renderTabHeader` | H2 · 20px · 600 | 一屏一个 |
| 结论带 | `.metric-band--cards` ＋ `.card.stat-card` | 数字 24px / 标签 12px | 四个数固定；四列数字卡，筛选与滚动分两种控件 |
| 分区头（卡头） | `renderCardHeader` | H3 · 16px · 600 · 宋体 | 工作分工 / 待我处理 / 周期归档待审核 / 我已处理 同一档 |
| 计数 | `.card-head__meta` | 12px · 400 · neutral-500 | 同一卡最多一处；不写进 H3；不与 `state-badge` 混用 |
| 折叠头 | 原生 `details` ＋ 兄弟 H3（`aria-labelledby`） | 与分区头同档 | 只「我已处理」一处 |
| 分段按钮 | `.btn-tab` ＋ `.active`（`insight-view`） | 32px · 13px | 只放「活动工作组 / 专班工作组」；「其他党小组」独立区 |
| 行内动作 | `.btn-outline.btn-sm` | 28px · 12px | 待我处理行 / 周期归档行同一档 |
| 徽章 | `state-badge`（逾期）/ `badgeHtml`（活动 · 专班） | 组件自带 | 计数列只用 `state-badge` |
| 说明 | 分段内容之后 | 12px · 400 | 「活动工作组在活动详情可办事」后置；卡头「· 只读」不重复 |
| 表格 | `.data-table` | 13px 单档 | 不另造表头样式 |

### 屏 3 · 支书台「支部分工」

实现：`docs/src/entries/tabs/secretary/work-map-tab.js`（`styles.css` 的 `.wm-*` 段）

| 元素 | 允许的组件 / 类 | 档位 | 同屏约束 |
|---|---|---|---|
| 页面标题 | `renderTabHeader` | H2 · 20px · 600 | 一屏一个 |
| 视图分段 | `.btn-tab` ＋ `.active` | 32px · 13px | 责任关系 / 平铺模块 / 按人 / 按项目 同档 |
| 分区头（卡头） | `renderCardHeader` | H3 · 16px · 600 · 宋体 | 责任关系 / 分工调整工具 同一档 |
| 左列主行 | `.wm-module-item__name` | 14px · 600 · 无衬线 | 与右列主标题同档 |
| 左列次行 | `.wm-module-item__owner` | 12px · 400 · neutral-500 | 与右列 `dt` 同档 |
| 右列主标题 | `.wm-detail__title` | 14px · 600 · 无衬线 | 与左列主行同档（不再用宋体 / 700） |
| 右列字段行 | `.wm-detail__row` | 上下 4px / 左右 8px；`dt` 12px · `dd` 14px | 与左列模块项同内边距 |
| 停用项动作 | `.btn-outline` | 36px · 13px | 与「展开分工调整工具」同档 |
| 空态 | `emptyStateHtml` | 一句说明 ＋ 一个 `.btn-outline` | 不并列多个动作 |
| 说明 | 主体与工具之后 | 12px · 400 | 只留「分工由本支部自行调整，改派走支委会议题」 |

## 数据形态与缓存边界（检查用，不是规范）

> **定位**：人工维护的检查附录，回答「同一界面在不同数据形态下应看到什么、写到哪里」。规范判据见 [DS_03_COMPONENTS.md §12.15](design-system/DS_03_COMPONENTS.md)（SD-48），判例见 [CASES.md](design-system/CASES.md)（CASE-DATA-001）；逐表种子口径见 [DATA_SEED_CONTRACT.md](data/DATA_SEED_CONTRACT.md)。
> **单一源**：形态判定＝`docs/src/services/core/runtime.js::getDataSource`；缓存键四类＝`docs/src/data/cache-registry.js`；演示窗口＝`docs/src/data/mock/demo-window.js::DEMO_WINDOW`；部署开关＝`DEPLOYMENT_GUIDE.md`。

### 形态 × 界面 × 写入

| 形态 | 判定 | 界面应显示 | 读 | 写 |
|---|---|---|---|---|
| **mock**（静态托管 / 演示） | 无 server 或显式 mock | 演示种子（窗口 2026-08-01–2026-11-30），四个月均有活动 | 本地种子 ＋ 浏览器读缓存 | 写本机；不得写服务器 |
| **api**（常态） | `getDataSource()==='api'` | **服务端有什么显示什么**；空库显示空态，不得用 mock 填空 | 服务端快照；本地读缓存只是镜像（须带 `_versions` ＋ `savedAt`） | 服务端行 / 快照请求 / 语义端点 2xx 三选一；失败进 outbox 显示「未同步」 |
| **正式轨道** | `APP_ENV=production` | 真实支部数据；默认 `SEED_FALLBACK=false`；库内含演示种子时拒绝启动（`ALLOW_DEMO_DATA=1` 才放行） | 服务端 | `import-branch`（dry-run → 事务）导入名册；`restore` 停服恢复；`restore.mjs` 备份先行 |
| **只读演练** | 生产库副本 ＋ `READ_ONLY=1` | 与正式一致，但所有写口关闭并给只读提示 | 服务端只读 | 一律 403；页面可完整浏览 |

### 缓存四类（长期只留第一类）

| 类别 | 允许内容 | 代表键 | 判据 |
|---|---|---|---|
| visual（纯展示偏好） | 主题 / 字号 / 强调色 / 页签顺序 / 提醒开关 | `workflowos_theme`、`gsm1921-pref-*`、`workflowos_tab_*` | 长期保留；不得承载业务数据 |
| auth（会话鉴权） | 登录快照 / tabId / 会话快照 / API token | `gsm1921-login-user`、`gsm1921-api-token`、`gsm1921-session-snap` | token 只进 `sessionStorage`；与业务集合不相交 |
| read-cache（业务读缓存） | 服务端数据的本机镜像 | `workflowos_branch_db_v1`、`gsm1921-issue-cache-v3` | 必须带 `_versions` ＋ `savedAt`，缺版本 / 过期 / 版本不一致不得当权威 |
| temp（草稿 / 一次性） | 草稿 / 预览 / 迁移标记 / outbox | `gsm1921-pending-writes-outbox`、`gsm1921-*-draft` | 只在本机；不承担业务成功，恢复后可重试或放弃 |

> **读法**：清空 localStorage 后重新登录，只有 visual 回默认；业务数据必须从服务端恢复。若某业务标注在清缓存后消失，先查它是否误落在 read-cache 或 temp。

