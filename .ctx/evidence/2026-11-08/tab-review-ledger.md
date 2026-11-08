# 页签评议落地审计台账（2026-11-08 · 波次 3）

> 范围：46 个页签逐行核对「最近评议来源 / 结论 / 是否落地 / 未闭项 / A·B·C 分类」。
> 本台账只做审计与改口径，不重构页签、不改 UI、不改 `DS_06`。
> `41` 是批次 525 的算术残值（45 − 4 个已收敛），不是评议结论；现行注册表与派生物均为 **46** 页签。

## 一、口径与证据源

| 用途 | 唯一源 / 文件:行 |
|---|---|
| 页签清单（46） | `server/scripts/audit/catalog.mjs:15-18`；7 个 `docs/src/capabilities/*-workspace.js` 声明行（下表「标签」列同源） |
| 逐页签块数 | `server/test/style-baseline.mjs:800-912`（`TAB_BLOCK_BASELINE`） |
| 版式审计（45 页签） | `.ctx/evidence/2026-11-03/tab-audit/summary.md`（下文简称 `audit-1103`） |
| 版式审计（新增页签） | `.ctx/evidence/2026-11-08/tab-audit/summary.md`（下文简称 `audit-1108`） |
| IA 三问评议 | `.ctx/logs/archive/2026-10/AUDIT_IA_CRITICAL.md`（下文简称 `IA`） |
| 覆盖守卫 | `server/test/workbench-audit-coverage.test.mjs:40-50`（W1–W3：46 项 ↔ 基线双向相等、源码入口存在、写口有 gate） |
| 近期 UI 审校 | `.ctx/evidence/2026-11-07/ui-audit.md` |

**复核边界（如实登记）**：本台账逐条复核与页签结构相关的 IA-A / B / D / E 项；IA-C（链接真值）与 IA-F（路由真值）未逐条复跑，按 2026-10-25「IA 62→45」与 2026-11-01 批次 525 的收口记录视为已闭环；如需逐条复核，另开波次。

**分类定义**

- **A 已完成**：无 IA 未闭项；版式审计 F1–F8 全绿，超 4 块者已按 `TAB_BLOCK_BASELINE` 登记例外。
- **B 有未闭项**：存在带 `file:line` 的 IA 未闭项或未登记的结构超限。
- **C 从未做 IA 三问**：只有 F1–F8 版式审计，没有「是否必须存在 / 卡片是否改变决策 / 链接是否指向对的对象」的评议记录。

## 二、逐页签台账（46）

| # | key | 标签（注册源） | 最近评议来源 | 结论 | 是否落地（代码 / 守卫证据） | 未闭项 | 类 |
|---|---|---|---|---|---|---|---|
| 1 | `secretary.today` | 今天 `secretary-workspace.js:27` | `IA:37-38`（B01/B02）+ `audit-1103:16` | 改了 | `today-tab.js:414`（活动管理并入日程卡头，B-522-1）、`:624`（B02 合卡）；审计 pass | — | A |
| 2 | `secretary.todo` | 待办 `secretary-workspace.js:45` | `audit-1103:17` | 只登记 | `secretary/todo-tab.js`；审计 pass；`style-baseline:803` | — | A |
| 3 | `secretary.overview` | 全局概况 `secretary-workspace.js:46` | `audit-1103:18`（F1 exception）+ `IA:88`（E01） | 排批 | `entries/tabs/secretary/overview-tab.js:49`；7 块例外登记 `audit-1103:377` | E01 首屏历史统计；7 块 > 4 | B |
| 4 | `secretary.calendar` | 活动管理 `secretary-workspace.js:51` | `IA:41-42`（B05/B06）+ `audit-1103:19` | 改了 | `calendar-tab.js:55`、`:282-284`（三处呈现合为工具栏筛选 + 单一写口） | — | A |
| 5 | `secretary.committee-meeting` | 支委会 `secretary-workspace.js:59` | `audit-1103:20`（仅 F1–F8） | 只登记 | `committee-meeting-tab.js`；审计 pass | 从未做 IA 三问 | C |
| 6 | `secretary.group-progress` | 党小组 `secretary-workspace.js:66` | `IA:39-40`（B03/B04）+ `audit-1103:21` | 改了 | `group-progress-tab.js:30`（主从双栏，2 块；留痕下沉） | — | A |
| 7 | `secretary.notification` | 通知发布 `secretary-workspace.js:71` | `audit-1103:22` | 只登记 | `notification-tab.js`；审计 pass | — | A |
| 8 | `secretary.report-up` | 上报党委 `secretary-workspace.js:73` | `audit-1103:23`（仅 F1–F8） | 只登记 | `report-up-tab.js`；审计 pass | 从未做 IA 三问 | C |
| 9 | `secretary.work-map` | 支部分工 `secretary-workspace.js:81` | `audit-1103:24` | 只登记 | `work-map-tab.js`；审计 pass | — | A |
| 10 | `secretary.feedback` | 意见反馈 `secretary-workspace.js:87` | `audit-1103:25` | 只登记 | `feedback-tab.js`；审计 pass | — | A |
| 11 | `org.today` | 今天 `org-workspace.js:36` | `IA:37-38`（B01/B02，同源） | 改了 | `today-tab.js:414`、`:624`；审计 pass | — | A |
| 12 | `org.todo` | 待办 `org-workspace.js:62` | `audit-1103:27`（M1 exception） | 只登记 | `org/todo-tab.js`；审计 pass；5 块已登记例外 | — | A |
| 13 | `org.overview` | 工作概况 `org-workspace.js:64` | `audit-1103:28`（M1 exception） | 只登记 | `org/overview-tab.js`；审计 pass；6 块已登记例外 | — | A |
| 14 | `org.roster` | 成员名册 `org-workspace.js:82` | `IA:48`（B12） | 改了 | 统计进卡头记录 `.ctx/logs/2026-10-EXECUTION_LOG.md:2947`；`audit-1103:29` pass | — | A |
| 15 | `org.talent` | 人才库 `org-workspace.js:83` | `IA:47`（B11）+ `IA:90`（E03） | 排批 | `entries/tabs/org/talent-tab.js:300-317`（录入考察仍在页底折叠；参与汇总居中） | B11 + E03 | B |
| 16 | `org.thought-review` | 思想汇报 `org-workspace.js:86` | `audit-1103:31`、`:312-317`（F6 P2） | 只登记 | 审计 pass；P2 已人工确认为页签分组提示（L-07） | —（P2 登记，不改 UI） | A |
| 17 | `org.taskforce` | 专班管理 `org-workspace.js:87` | `IA:82`（D12 组织侧） | 只登记 | `entries/tabs/org/taskforce-tab.js:1342-1378`（复盘提交 → 纪检批注闭环）；审计 pass | — | A |
| 18 | `org.member-flow` | 成员流动 `org-workspace.js:92` | `audit-1103:33`（仅 F1–F8） | 只登记 | `member-flow-tab.js`；审计 pass | 从未做 IA 三问 | C |
| 19 | `prop.today` | 今天 `prop-workspace.js:27` | `IA:37-38`（B01/B02，同源） | 改了 | `today-tab.js:414`、`:624`；审计 pass | — | A |
| 20 | `prop.todo` | 待办 `prop-workspace.js:52` | `audit-1103:35`（M1 exception） | 只登记 | `prop/todo-tab.js`；审计 pass；5 块已登记例外 | — | A |
| 21 | `prop.overview` | 工作概况 `prop-workspace.js:54` | `audit-1103:36`（M1 exception） | 只登记 | `prop/overview-tab.js`；审计 pass；6 块已登记例外 | — | A |
| 22 | `prop.kanban` | 项目看板 `prop-workspace.js:61` | `IA:44-45`（B08/B09） | 改了 | `kanban-tab.js`（源码已无「待归档」去向条）；`.ctx/logs/2026-10-EXECUTION_LOG.md:2947`；5 块已登记例外 | — | A |
| 23 | `prop.archive` | 档案归档 `prop-workspace.js:64` | `IA:43`（B07） | 改了 | `archive-tab.js:509-524`（待归档 / 初稿 / 缺口三卡合一）、`:116` | — | A |
| 24 | `disc.today` | 今天 `disc-workspace.js:32` | `IA:37-38`（B01/B02，同源） | 改了 | `today-tab.js:414`、`:624`；审计 pass | — | A |
| 25 | `disc.todo` | 待办 `disc-workspace.js:57` | `audit-1103:40`（M1 exception） | 只登记 | `disc/todo-tab.js`；审计 pass；5 块已登记例外 | — | A |
| 26 | `disc.overview` | 工作概况 `disc-workspace.js:59` | `audit-1103:41`（M1 exception） | 只登记 | `disc/overview-tab.js`；审计 pass；6 块已登记例外 | — | A |
| 27 | `disc.attendance` | 考勤管理 `disc-workspace.js:64` | `IA:92`（E05）+ `audit-1103:42` | 排批 | `entries/tabs/disc/attendance-tab.js:85`、`:145`（工作视图两级切换仍在）；D07 已落地 `:668` | E05；6 块 > 4 | B |
| 28 | `disc.review` | 复盘 `disc-workspace.js:68` | `IA:46`（B10）、`:72`（D02）、`:82`（D12） | 改 B10 / 排批 D | `entries/tabs/disc/review-tab.js:235-239`（两张并列卡并成一张「复盘监督」） | D02 打回态；D12 派发 / 回显 | B |
| 29 | `disc.inspection` | 考察管理 `disc-workspace.js:69` | `IA:79`（D09）+ `audit-1103:44` | 排批 | `entries/tabs/disc/inspection-tab.js:423-427`（提交即送达，D04 口径） | D09；5 块 > 4、2 条筛选条 | B |
| 30 | `leader.today` | 今天 `leader-workspace.js:37` | `IA:37-38`（B01/B02，同源） | 改了 | `today-tab.js:414`、`:624`；审计 pass | — | A |
| 31 | `leader.todo` | 待办 `leader-workspace.js:63` | `audit-1103:46`（M1 exception） | 只登记 | `leader/todo-tab.js`；审计 pass；5 块已登记例外 | — | A |
| 32 | `leader.overview` | 工作概况 `leader-workspace.js:64` | `audit-1103:47`（M1 exception） | 只登记 | `leader/overview-tab.js`；审计 pass；6 块已登记例外 | — | A |
| 33 | `leader.write` | 本组活动 `leader-workspace.js:72` | `audit-1103:48`（仅 F1–F8） | 只登记 | `leader/write-tab.js`；审计 pass | 从未做 IA 三问 | C |
| 34 | `leader.attendance` | 考勤管理 `leader-workspace.js:76` | `audit-1103:49` | 只登记 | `leader/attendance-tab.js`；审计 pass（2 块） | — | A |
| 35 | `leader.members` | 组员进展 `leader-workspace.js:83` | `audit-1103:50`（M3 exception） | 只登记 | `entries/tabs/leader/members-tab.js:188-190`（复盘与其他组并入低频卡）；审计 pass | — | A |
| 36 | `visitor.today` | 今天 `visitor-workspace.js:28` | `IA:37-38`（B01/B02，同源） | 改了 | `today-tab.js:414`、`:624`；审计 pass | — | A |
| 37 | `visitor.todo` | 待办 `visitor-workspace.js:47` | `audit-1103:52`（M1 exception） | 只登记 | `visitor/todo-tab.js`；审计 pass；5 块已登记例外 | — | A |
| 38 | `visitor.overview` | 工作概况 `visitor-workspace.js:49` | `audit-1103:53`（M1 exception） | 只登记 | `visitor/overview-tab.js`；审计 pass；5 块已登记例外 | — | A |
| 39 | `visitor.activities` | 活动动态 `visitor-workspace.js:56` | `audit-1103:54` | 只登记 | `visitor/activities-tab.js`；审计 pass | — | A |
| 40 | `visitor.projects` | 项目分工 `visitor-workspace.js:57` | `audit-1103:55` | 只登记 | `visitor/projects-tab.js`；审计 pass | — | A |
| 41 | `visitor.attendance` | 考勤概况 `visitor-workspace.js:58` | `audit-1103:56`、`:319-324`（F6 P2） | 只登记 | 审计 pass；P2 已人工确认为指标占位（L-07） | —（P2 登记，不改 UI） | A |
| 42 | `visitor.growth` | 我的成长 `visitor-workspace.js:62` | `audit-1103:57` | 只登记 | `visitor/growth-tab.js`；审计 pass | — | A |
| 43 | `party-committee.dispatch` | 下发通知 `party-committee-workspace.js:26` | `audit-1108:16`（仅 F1–F8） | 只登记 | `dispatch-tab.js`；审计 pass（批次 536 复跑） | 从未做 IA 三问 | C |
| 44 | `party-committee.gov-content` | 院级内容 `party-committee-workspace.js:32` | `audit-1108:17` | 只登记 | `content-tab.js`；审计 pass（批次 536 新增，4 块） | — | A |
| 45 | `party-committee.review` | 支部上报 `party-committee-workspace.js:37` | `IA:95`（E08）+ `audit-1103:59` | 改批复 / 排批任命 | `entries/tabs/party-committee/review-tab.js:209-217`（行内批准 / 驳回已落地） | E08 任命跨页 | B |
| 46 | `party-committee.branches` | 支部管理 `party-committee-workspace.js:38` | `IA:95`（E08）+ `audit-1103:60` | 排批 | `entries/tabs/party-committee/branches-tab.js:162-170`（任命提醒在册，动作未行内化） | E08 任命行内；`branch-delete` 无 CRUD 配方（登记） | B |

## 三、计数

| 口径 | 数 | 页签 |
|---|---|---|
| 总页签 | **46** | — |
| A 已完成 | **34** | 1、2、4、6、7、9、10、11、12、13、14、16、17、19、20、21、22、23、24、25、26、30、31、32、34、35、36、37、38、39、40、41、42、44 |
| B 有未闭项 | **7** | 3 支书全局概况 · 15 人才库 · 27 纪检考勤 · 28 复盘 · 29 考察管理 · 45 支部上报 · 46 支部管理 |
| C 从未做 IA 三问 | **5** | 5 支委会 · 8 上报党委 · 18 成员流动 · 33 本组活动 · 43 下发通知 |
| 超 4 块（登记例外） | **6** | 3 全局概况 7 · 13 / 21 / 26 / 32 各台工作概况 6 · 27 纪检考勤 6 |

## 四、未闭项清单（10 条，带 file:line）

| # | 页签 | 未闭项 | 证据 |
|---|---|---|---|
| 1 | `secretary.overview` | IA-E01：首屏 4 个历史统计字段，支书查活动仍 2 屏 | `IA:88`；`overview-tab.js:49` |
| 2 | `secretary.overview` | 顶层 7 块 > 4，仅登记例外未收敛 | `style-baseline.mjs:804-807`；`audit-1103:377` |
| 3 | `org.talent` | IA-B11：纯展示「参与汇总」居中，写动作「录入考察」沉底 | `IA:47`；`talent-tab.js:300-317` |
| 4 | `org.talent` | IA-E03：组织录入考察 2 点击 / 写动作折叠，未到卡头 CTA | `IA:90`；`talent-tab.js:306-317` |
| 5 | `disc.attendance` | IA-E05：考勤工作视图保留两级切换 | `IA:92`；`attendance-tab.js:85`、`:145` |
| 6 | `disc.review` | IA-D02：打回态未全台统一，纪检侧只有 toast | `IA:72`；`review-tab.js:506` |
| 7 | `disc.review` | IA-D12：专班复盘派发通知 / 待办与组织台回显未闭环验证 | `IA:82`；`taskforce-tab.js:1342-1378` |
| 8 | `disc.inspection` | IA-D09：考察交接接收方只拿到专班类一半 | `IA:79`；`inspection-tab.js:423-427` |
| 9 | `party-committee.review` / `.branches` | IA-E08：批复行内已落地，任命仍跨页、无行内浮窗 | `IA:95`；`review-tab.js:209-217`；`branches-tab.js:162-170` |
| 10 | `disc.attendance` / `disc.inspection` | 超 4 块与同页 2 条筛选条，仅登记例外 | `style-baseline.mjs:866-874`；`audit-1103:330-335` |

## 五、结论

1. **不盲改 41 / 46 个页签**：34 个已完成，真正要动的是 7 个 B 类页签里的 10 条具体 IA 项。
2. **6 个超 4 块页签**已按 `TAB_BLOCK_BASELINE` 登记例外，收敛与否属设计取舍，不作为本批动作。
3. **5 个 C 类页签**缺的是 IA 三问记录，不是版式缺陷；下一批按「是否必须存在 / 卡片是否改变决策 / 链接是否指向对的对象」补评，评完再决定是否动结构。
4. 下一批只挑 B 类中「低风险、单文件」的 2 条先做（候选：`org.talent` 录入考察上提卡头、`disc.attendance` 撤销工作视图两级切换），其余登记待支书裁定。
