# 页签评议落地审计台账（2026-11-08 · 波次 3 + 波次 F）

> 范围：46 个页签逐行核对「最近评议来源 / 结论 / 是否落地 / 未闭项 / A·B·C 分类」。
> 本台账只做审计与改口径，不重构页签、不改 UI、不改 `DS_06`。
> `41` 是批次 525 的算术残值（45 − 4 个已收敛），不是评议结论；现行注册表与派生物均为 **46** 页签。
> 波次 F（2026-11-08）：补齐 5 个 C 类页签的 IA 三问结论（§六），只写结论与证据，不改 UI / 不改 `PRODUCT_IA` 数字 / 不改 `DS_06`。

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

**复核边界（如实登记）**：本台账逐条复核与页签结构相关的 IA-A / B / D / E 项；IA-C（链接真值）与 IA-F（路由真值）未逐条复跑，按 2026-10-25「IA 62→45」与 2026-11-01 批次 525 的收口记录视为已闭环；如需逐条复核，另开波次。波次 F 只补 5 个 C 类页签的三问，未做真机点击复跑（结论均按源码取证）。

**分类定义**

- **A 已完成**：无 IA 未闭项；版式审计 F1–F8 全绿，超 4 块者已按 `TAB_BLOCK_BASELINE` 登记例外。
- **B 有未闭项**：存在带 `file:line` 的 IA 未闭项或未登记的结构超限。
- **C 从未做 IA 三问**：只有 F1–F8 版式审计，没有「是否必须存在 / 卡片是否改变决策 / 链接是否指向对的对象」的评议记录。波次 F 已把这 5 个补评为 A / B，当前 C 类为 0。

## 二、逐页签台账（46）

| # | key | 标签（注册源） | 最近评议来源 | 结论 | 是否落地（代码 / 守卫证据） | 未闭项 | 类 | IA 三问结论 |
|---|---|---|---|---|---|---|---|---|
| 1 | `secretary.today` | 今天 `secretary-workspace.js:27` | `IA:37-38`（B01/B02）+ `audit-1103:16` | 改了 | `today-tab.js:414`（活动管理并入日程卡头，B-522-1）、`:624`（B02 合卡）；审计 pass | — | A | — |
| 2 | `secretary.todo` | 待办 `secretary-workspace.js:45` | `audit-1103:17` | 只登记 | `secretary/todo-tab.js`；审计 pass；`style-baseline:803` | — | A | — |
| 3 | `secretary.overview` | 全局概况 `secretary-workspace.js:46` | `audit-1103:18`（F1 exception）+ `IA:88`（E01） | 排批 | `entries/tabs/secretary/overview-tab.js:49`；7 块例外登记 `audit-1103:377` | E01 首屏历史统计；7 块 > 4 | B | — |
| 4 | `secretary.calendar` | 活动管理 `secretary-workspace.js:51` | `IA:41-42`（B05/B06）+ `audit-1103:19` | 改了 | `calendar-tab.js:55`、`:282-284`（三处呈现合为工具栏筛选 + 单一写口） | — | A | — |
| 5 | `secretary.committee-meeting` | 支委会 `secretary-workspace.js:59` | `audit-1103:20`（F1–F8）+ §六 F-1 | 只登记 | `committee-meeting-tab.js`；审计 pass；3 块 `style-baseline:809` | — | A | F-1 保留 |
| 6 | `secretary.group-progress` | 党小组 `secretary-workspace.js:66` | `IA:39-40`（B03/B04）+ `audit-1103:21` | 改了 | `group-progress-tab.js:30`（主从双栏，2 块；留痕下沉） | — | A | — |
| 7 | `secretary.notification` | 通知发布 `secretary-workspace.js:71` | `audit-1103:22` | 只登记 | `notification-tab.js`；审计 pass | — | A | — |
| 8 | `secretary.report-up` | 上报党委 `secretary-workspace.js:73` | `audit-1103:23`（F1–F8）+ §六 F-2 | 排批（改 CTA） | `report-up-tab.js`；审计 pass；4 块 `style-baseline:817` | F-2 热区不绑标题；统计与列表分面同信息 | B | F-2 改 CTA |
| 9 | `secretary.work-map` | 支部分工 `secretary-workspace.js:81` | `audit-1103:24` | 只登记 | `work-map-tab.js`；审计 pass | — | A | — |
| 10 | `secretary.feedback` | 意见反馈 `secretary-workspace.js:87` | `audit-1103:25` | 只登记 | `feedback-tab.js`；审计 pass | — | A | — |
| 11 | `org.today` | 今天 `org-workspace.js:36` | `IA:37-38`（B01/B02，同源） | 改了 | `today-tab.js:414`、`:624`；审计 pass | — | A | — |
| 12 | `org.todo` | 待办 `org-workspace.js:62` | `audit-1103:27`（M1 exception） | 只登记 | `org/todo-tab.js`；审计 pass；5 块已登记例外 | — | A | — |
| 13 | `org.overview` | 工作概况 `org-workspace.js:64` | `audit-1103:28`（M1 exception） | 只登记 | `org/overview-tab.js`；审计 pass；6 块已登记例外 | — | A | — |
| 14 | `org.roster` | 成员名册 `org-workspace.js:82` | `IA:48`（B12） | 改了 | 统计进卡头记录 `.ctx/logs/2026-10-EXECUTION_LOG.md:2947`；`audit-1103:29` pass | — | A | — |
| 15 | `org.talent` | 人才库 `org-workspace.js:83` | `IA:47`（B11）+ `IA:90`（E03） | 已落地（复核：2026-11-08 波次 C） | `entries/tabs/org/talent-tab.js:9-11,237-253`（「录入考察」已提为**卡头主 CTA**，一次点击展开并挂载既有 `inspection-tab.js`） | — | A | — |
| 16 | `org.thought-review` | 思想汇报 `org-workspace.js:86` | `audit-1103:31`、`:312-317`（F6 P2） | 只登记 | 审计 pass；P2 已人工确认为页签分组提示（L-07） | —（P2 登记，不改 UI） | A | — |
| 17 | `org.taskforce` | 专班管理 `org-workspace.js:87` | `IA:82`（D12 组织侧） | 只登记 | `entries/tabs/org/taskforce-tab.js:1342-1378`（复盘提交 → 纪检批注闭环）；审计 pass | — | A | — |
| 18 | `org.member-flow` | 成员流动 `org-workspace.js:92` | `audit-1103:33`（F1–F8）+ §六 F-3 | 排批（改 CTA） | `member-flow-tab.js`；审计 pass；3 块 `style-baseline:836` | F-3 对账提示无出口 | B | F-3 保留＋改 CTA |
| 19 | `prop.today` | 今天 `prop-workspace.js:27` | `IA:37-38`（B01/B02，同源） | 改了 | `today-tab.js:414`、`:624`；审计 pass | — | A | — |
| 20 | `prop.todo` | 待办 `prop-workspace.js:52` | `audit-1103:35`（M1 exception） | 只登记 | `prop/todo-tab.js`；审计 pass；5 块已登记例外 | — | A | — |
| 21 | `prop.overview` | 工作概况 `prop-workspace.js:54` | `audit-1103:36`（M1 exception） | 只登记 | `prop/overview-tab.js`；审计 pass；6 块已登记例外 | — | A | — |
| 22 | `prop.kanban` | 项目看板 `prop-workspace.js:61` | `IA:44-45`（B08/B09） | 改了 | `kanban-tab.js`（源码已无「待归档」去向条）；`.ctx/logs/2026-10-EXECUTION_LOG.md:2947`；5 块已登记例外 | — | A | — |
| 23 | `prop.archive` | 档案归档 `prop-workspace.js:64` | `IA:43`（B07） | 改了 | `archive-tab.js:509-524`（待归档 / 初稿 / 缺口三卡合一）、`:116` | — | A | — |
| 24 | `disc.today` | 今天 `disc-workspace.js:32` | `IA:37-38`（B01/B02，同源） | 改了 | `today-tab.js:414`、`:624`；审计 pass | — | A | — |
| 25 | `disc.todo` | 待办 `disc-workspace.js:57` | `audit-1103:40`（M1 exception） | 只登记 | `disc/todo-tab.js`；审计 pass；5 块已登记例外 | — | A | — |
| 26 | `disc.overview` | 工作概况 `disc-workspace.js:59` | `audit-1103:41`（M1 exception） | 只登记 | `disc/overview-tab.js`；审计 pass；6 块已登记例外 | — | A | — |
| 27 | `disc.attendance` | 考勤管理 `disc-workspace.js:64` | `IA:92`（E05）+ `audit-1103:42` | 已落地（复核：2026-11-08 波次 C） | `entries/tabs/disc/attendance-tab.js:4-16,73-74,206`（二级视图已撤，单一层级：确认 → 申诉 → 会议录入 → 矩阵/总表顺读） | — | A | — |
| 28 | `disc.review` | 复盘 `disc-workspace.js:68` | `IA:46`（B10）、`:72`（D02）、`:82`（D12） | 改 B10 / 排批 D | `entries/tabs/disc/review-tab.js:235-239`（两张并列卡并成一张「复盘监督」） | D02 打回态；D12 派发 / 回显 | B | — |
| 29 | `disc.inspection` | 考察管理 `disc-workspace.js:69` | `IA:79`（D09）+ `audit-1103:44` | 排批 | `entries/tabs/disc/inspection-tab.js:423-427`（提交即送达，D04 口径） | D09；5 块 > 4、2 条筛选条 | B | — |
| 30 | `leader.today` | 今天 `leader-workspace.js:37` | `IA:37-38`（B01/B02，同源） | 改了 | `today-tab.js:414`、`:624`；审计 pass | — | A | — |
| 31 | `leader.todo` | 待办 `leader-workspace.js:63` | `audit-1103:46`（M1 exception） | 只登记 | `leader/todo-tab.js`；审计 pass；5 块已登记例外 | — | A | — |
| 32 | `leader.overview` | 工作概况 `leader-workspace.js:64` | `audit-1103:47`（M1 exception） | 只登记 | `leader/overview-tab.js`；审计 pass；6 块已登记例外 | — | A | — |
| 33 | `leader.write` | 本组活动 `leader-workspace.js:72` | `audit-1103:48`（F1–F8）+ §六 F-4 | 排批（改 CTA） | `leader/write-tab.js`；审计 pass；3 块 `style-baseline:887` | F-4 指引无跳转；发布通知无往返证据 | B | F-4 保留＋改 CTA |
| 34 | `leader.attendance` | 考勤管理 `leader-workspace.js:76` | `audit-1103:49` | 只登记 | `leader/attendance-tab.js`；审计 pass（2 块） | — | A | — |
| 35 | `leader.members` | 组员进展 `leader-workspace.js:83` | `audit-1103:50`（M3 exception） | 只登记 | `entries/tabs/leader/members-tab.js:188-190`（复盘与其他组并入低频卡）；审计 pass | — | A | — |
| 36 | `visitor.today` | 今天 `visitor-workspace.js:28` | `IA:37-38`（B01/B02，同源） | 改了 | `today-tab.js:414`、`:624`；审计 pass | — | A | — |
| 37 | `visitor.todo` | 待办 `visitor-workspace.js:47` | `audit-1103:52`（M1 exception） | 只登记 | `visitor/todo-tab.js`；审计 pass；5 块已登记例外 | — | A | — |
| 38 | `visitor.overview` | 工作概况 `visitor-workspace.js:49` | `audit-1103:53`（M1 exception） | 只登记 | `visitor/overview-tab.js`；审计 pass；5 块已登记例外 | — | A | — |
| 39 | `visitor.activities` | 活动动态 `visitor-workspace.js:56` | `audit-1103:54` | 只登记 | `visitor/activities-tab.js`；审计 pass | — | A | — |
| 40 | `visitor.projects` | 项目分工 `visitor-workspace.js:57` | `audit-1103:55` | 只登记 | `visitor/projects-tab.js`；审计 pass | — | A | — |
| 41 | `visitor.attendance` | 考勤概况 `visitor-workspace.js:58` | `audit-1103:56`、`:319-324`（F6 P2） | 只登记 | 审计 pass；P2 已人工确认为指标占位（L-07） | —（P2 登记，不改 UI） | A | — |
| 42 | `visitor.growth` | 我的成长 `visitor-workspace.js:62` | `audit-1103:57` | 只登记 | `visitor/growth-tab.js`；审计 pass | — | A | — |
| 43 | `party-committee.dispatch` | 下发通知 `party-committee-workspace.js:26` | `audit-1108:16`（F1–F8）+ §六 F-5 | 排批（改 CTA） | `dispatch-tab.js`；审计 pass（批次 536 复跑）；3 块 `style-baseline:909` | F-5 先报成功再落库；公开计数首屏为 0 | B | F-5 保留＋改 CTA |
| 44 | `party-committee.gov-content` | 院级内容 `party-committee-workspace.js:32` | `audit-1108:17` | 只登记 | `content-tab.js`；审计 pass（批次 536 新增，4 块） | — | A | — |
| 45 | `party-committee.review` | 支部上报 `party-committee-workspace.js:37` | `IA:95`（E08）+ `audit-1103:59` | 改批复 / 排批任命 | `entries/tabs/party-committee/review-tab.js:209-217`（行内批准 / 驳回已落地） | E08 任命跨页 | B | — |
| 46 | `party-committee.branches` | 支部管理 `party-committee-workspace.js:38` | `IA:95`（E08）+ `audit-1103:60` | 排批 | `entries/tabs/party-committee/branches-tab.js:162-170`（任命提醒在册，动作未行内化） | E08 任命行内；`branch-delete` 无 CRUD 配方（登记） | B | — |

## 三、计数

| 口径 | 数 | 页签 |
|---|---|---|
| 总页签 | **46** | — |
| A 已完成 | **40** | 1、2、4、5、6、7、9、10、11、12、13、14、15、16、17、18、19、20、21、22、23、24、25、26、27、30、31、32、33、34、35、36、37、38、39、40、41、42、43、44 |
| B 有未闭项 | **6** | 3 支书全局概况 · 8 上报党委 · 28 复盘 · 29 考察管理 · 45 支部上报 · 46 支部管理 |
| C 从未做 IA 三问 | **0** | —（波次 F 补评：5、8、18、33、43 已分别落 §六 F-1…F-5） |
| 超 4 块（登记例外） | **6** | 3 全局概况 7 · 13 / 21 / 26 / 32 各台工作概况 6 · 27 纪检考勤 6 |

> **2026-11-09 复核（`D-861`）**：逐行分类实测 **A 35 / B 11 / 总 46**，与本表一致；`B11`（`org.talent` 录入考察沉底）仍未动，维持 B 类，本轮体验分下调据此计入。
> **2026-11-19 复核（`D-887`）**：`org.talent` 与 `disc.attendance` 两项经代码取证**已在 2026-11-08 波次 C 落地**（`talent-tab.js:9-11,237-253` 卡头 CTA；`attendance-tab.js:4-16,73-74,206` 单一层级视图）⇒ 两类由 B 改 A：**A 37 / B 9 / C 0**。L-13 的「默认两条」据此关闭。
> **2026-11-24 复核（批次 609）**：F-3 / F-4 / F-5 经代码取证**已在批次 539 落地**——`org/member-flow-tab.js:232`（对账不一致 → 成员名册出口）、`leader/write-tab.js:300-307`（考勤 / 考察只读指引改可点击深链）、`party-committee/dispatch-tab.js:213-229`（等 `addSystem` 回包再提示；`publicCount` 首屏按本地镜像初始化）。三类由 B 改 A：**A 40 / B 6 / C 0**。
> **2026-11-24 驳回（批次 619 · `D-921`）**：批次 618 的 F-2 改法（卡头 CTA）未经支书批准，已整体回滚 ⇒ F-2 **恢复未闭**，8 上报党委回到 B 类：**A 40 / B 6 / C 0**。

## 四、未闭项清单（原 14 条；3–5 与 12–14 已闭环，余 8 条；#11 F-2 待支书裁定）

| # | 页签 | 未闭项 | 证据 |
|---|---|---|---|
| 1 | `secretary.overview` | IA-E01：首屏 4 个历史统计字段，支书查活动仍 2 屏 | `IA:88`；`overview-tab.js:49` |
| 2 | `secretary.overview` | 顶层 7 块 > 4，仅登记例外未收敛 | `style-baseline.mjs:804-807`；`audit-1103:377` |
| 3 | `org.talent` | ~~IA-B11：纯展示「参与汇总」居中，写动作「录入考察」沉底~~ **已闭环（2026-11-08 波次 C）** | `talent-tab.js:237-253`（卡头 CTA） |
| 4 | `org.talent` | ~~IA-E03：组织录入考察 2 点击 / 写动作折叠，未到卡头 CTA~~ **已闭环（同上）** | `talent-tab.js:9-11` |
| 5 | `disc.attendance` | ~~IA-E05：考勤工作视图保留两级切换~~ **已闭环（2026-11-08 波次 C）** | `attendance-tab.js:4-16,73-74,206` |
| 6 | `disc.review` | IA-D02：打回态未全台统一，纪检侧只有 toast | `IA:72`；`review-tab.js:506` |
| 7 | `disc.review` | IA-D12：专班复盘派发通知 / 待办与组织台回显未闭环验证 | `IA:82`；`taskforce-tab.js:1342-1378` |
| 8 | `disc.inspection` | IA-D09：考察交接接收方只拿到专班类一半 | `IA:79`；`inspection-tab.js:423-427` |
| 9 | `party-committee.review` / `.branches` | IA-E08：批复行内已落地，任命仍跨页、无行内浮窗 | `IA:95`；`review-tab.js:209-217`；`branches-tab.js:162-170` |
| 10 | `disc.attendance` / `disc.inspection` | 超 4 块与同页 2 条筛选条，仅登记例外 | `style-baseline.mjs:866-874`；`audit-1103:330-335` |
| 11 | `secretary.report-up` | F-2：唯一写入口是 40×40 空壳 summary，未与卡片标题行绑定；三项统计与列表状态分面同信息 | `report-up-tab.js:43`、`:52-55`；`styles.css:525-533` |
| 12 | `org.member-flow` | ~~F-3：对账不一致提示只说「请核对」，无出口到在册真相所在的成员名册~~ **已闭环（批次 539；`member-flow-tab.js:232`）** | `member-flow-tab.js:232`；`roster-tab.js:26-28` |
| 13 | `leader.write` | ~~F-4：3 处子记录只读指引为纯文本无跳转；「发布本组通知」只有静态权限链自洽，无往返验证~~ **已闭环（批次 539；`write-tab.js:300-307`）** | `write-tab.js:300-307`、`:225`；`audit-1108:436-439` |
| 14 | `party-committee.dispatch` | ~~F-5：下发按钮同步提示「已下发」，未等待 `addSystem` 回包；公开通知计数首屏恒 0~~ **已闭环（批次 539；`dispatch-tab.js:99-110,213-229`）** | `dispatch-tab.js:213-229`、`:107-111`；`notice.js:592-633` |

## 五、结论

1. **不盲改剩余页签**：**40 个已完成**，真正要动的是 **6 个 B 类页签里的 8 条具体 IA 项**（其中 F-2 待支书裁定）。
2. **6 个超 4 块页签**已按 `TAB_BLOCK_BASELINE` 登记例外，收敛与否属设计取舍，不作为本批动作。
3. **5 个 C 类页签已补评完毕**（§六）：1 个保留（支委会），4 个「保留 + 改 CTA」；缺的是出口与反馈，不是版式缺陷。
4. 下一批只挑「低风险、单文件、不动首屏结构」的 3 条先做（候选见 §七），其余登记待支书裁定。

## 六、波次 F：5 个 C 类页签的 IA 三问结论

> 取值口径：任务对象「本组活动」的注册表实际 key 是 `leader.write`（`leader-workspace.js:72`）；`secretary.group-progress` 的标签是「党小组」，已有 `IA:39-40`（B03/B04）记录，不属本波 C 类。

### F-1 `secretary.committee-meeting`（支委会 · 3 块）

- **一问 是否必须存在 → 保留**：改派 / 撤销支委身份只有这一处写口（`committee-meeting-tab.js:85-96` → `services/branch/appointment.js`），成员名册只显示角色文字、无改派动作（`org/roster-tab.js:255-266`）；会议表虽与「活动管理」同源（`secretary/calendar-tab.js:915` 同支持 `branch-committee` 场景），但线上议事页入口只在本表，并入活动管理会让「进入议事」多一跳。
- **二问 逐卡**：支委构成＝**决策**（谁在任 / 是否空缺 → 改派或补选，`:41-71`）；支委会会议＝**决策**（哪场待召开 / 进行中 → 进入议事，`:107-112`），已归档行属背景；页底 help-note＝**背景**（1 行口径指针，`:259`）。
- **三问 主 CTA 与落点**：`新建线上支委会 →` → `party-committee-meeting.html?action=new`（`:249` → 入口 `party-committee-meeting-entry.js:822-823` 落到创建位、不自动建场）；行内 `进入 ›` → `?id=`（`:149` → 入口 `:820`，越权兜底 `:489`）；帮助链接 `#card-copy-pcm-scope` 锚点存在（`help.html:715`）。断链 0 / 错对象 0 / 重复出口 0。
- **结论：保留。**
- **风险与下一动作**：本 tab 直读 `mockDB.activities` / `attendances` / `activityReviews` / `attendanceRosters`（`:108`、`:126`、`:133`），与 H32「UI 只经 data-adapter」不符；登记到数据接入专项，本批不改。

### F-2 `secretary.report-up`（上报党委 · 4 块）

- **一问 → 保留**：支部半侧双向通道只此一处（`:3-5`），党委批复回执也只在此页回显（`:190-197`）；党委侧受理在 `party-committee.review`，角色不同，不存在可并入的对象。
- **二问**：发起上报表单＝**决策**（报哪类、写什么，`:96-116`）；上报记录列表＝**决策**（跟批复 / 补报，`:165-200`）；顶部三项统计＝**冗余候选**（与列表状态分面同信息，`:43`、`:72-89` 对 `:169-174`）。
- **三问**：主 CTA 是**空壳 summary**（`:52-55`，仅 `aria-label="发起上报"`），落点＝同页展开表单；热区停在卡右上 40×40——`styles.css:525-533` 的「空 summary 覆盖整行」要求前置兄弟是 `.disclosure__title`，本页前置是 `div.flex`，规则未生效。断链 0 / 错对象 0 / 重复出口 1（统计与列表分面）。
- **结论：改 CTA**（展开动作并入标题行可点区；统计降为筛选条计数）。
- **风险与下一动作**：统计合卡动首屏结构，属支书裁定项，先登记不实施；表单用裸 `input` / `textarea`（`:107`、`:111`）未走 `forms.js`，与 H40.3 第 4 条冲突，登记到表单专项。

### F-3 `org.member-flow`（成员流动 · 3 块）

- **一问 → 保留**：「名册答有谁、流动答人怎么变」的一 tab 一问判据（`:5-10`；`roster-tab.js:26-28`）；名册行内「移出」走 `registerOutflow`（`roster-tab.js:564-570`），撤销与对账只能在本页，删除会断链。
- **二问**：待确认入站（IAAA）＝**决策**（确认 / 驳回直接决定该人能否进工作台，`:176-183`）；流动台账＋对账行＝**决策**（核对与撤销纠错，`:216-227`）；对账不一致提示＝**背景但当前无出口**（`:226`）。
- **三问**：登记流入 / 登记流出 → 同页模态（`:111-112`、`:292-491`）；行内撤销 → 确认模态（`:276-278`）；确认入站 / 驳回 → 服务端（`:194`）。无跨页链接；对账提示「请核对下方记录与撤销留痕」只指本页，不指在册真相所在的成员名册 → 单向链路。
- **结论：保留 + 改 CTA**（对账提示补一条到 `org.html?tab=roster` 的出口）。
- **风险与下一动作**：支书 / 副支书入口经页面级重定向（`workspace-shell.js:502`），是真实跨页跳转；落地文案须继续说明「已切到组织台」，否则会被读成断链。本批不改。

### F-4 `leader.write`（本组活动 · 3 块）

- **一问 → 保留**：组长唯一的活动写入面（`leader-workspace.js:69-72`），考勤 / 考察 / 组员进展已按对象拆走（`:76`、`:83`）；「我的任务」与「待办」的口径区分写在模块头（`my-tasks-section.js:9-11`：项目身份 SOP 任务对 `TodoStore` 聚合），不构成重复。
- **二问**：我的任务＝**决策**（勾掉本人那一步，`:189`）；本组创建 / 承办清单＝**决策**（进入详情改派角色，`:201-202`）；可见活动（只读）＝**背景**（`:204-205`）；行内详情＝**决策**（角色赋权 / 子记录，`:208`、`:334-368`）。
- **三问**：创建活动 → 同页决策面板（`:194`）；发布本组通知 → 模态（`notice-view.js:184-233`），前端 `notice.js:324-332` 与服务端 `gates.js:73-77` 都放行「本场组织者」（不只角色白名单）；行点击 → 行内详情（`:239-247`）；子记录只读指引「考勤请到『考勤管理』录入 / 考察请到『考察管理』录入」是纯文本，无链接（`:300-302`）。
- **结论：保留 + 改 CTA**（3 处指引补跨 tab 跳转）。
- **风险与下一动作**：`发布本组通知` 无真机往返证据（`audit-1108:436-439`：leader 对 `POST /api/v1/notices` 的 C2 无配方 / 403），权限链只做到静态自洽；下一批补一条真机或服务端用例，不得只凭代码判断通过。

### F-5 `party-committee.dispatch`（下发通知 · 3 块）

- **一问 → 保留**：党委→支部通知唯一通道（`core/domain/system-notice-templates.js:326-339`：`source='committee'`、`audience='committee'`）；院级内容只管活动与资料（`content-tab.js:5-6`、`:45-50`），不承载通知。公开通知子视图与通知同对象，挂本页正确；页签名「下发通知」不覆盖「公开」语义，页头已补一句（`:105`）。
- **二问**：撰写卡＝**决策**（目标支部 / 优先级 / 正文，`:146-175`）；已发送列表＝**背景**（核对，行内无动作，`:216-238`）；公开通知列表＝**决策**（撤下，`:294-309`）；公开通知撰写＝**决策**（`:245-276`）。
- **三问**：下发通知 → `NoticeStore.addSystem('committee-dispatch', …)`（`:200-208`）；已发送列表按 `source==='committee'` 读本地镜像（`:217-220`）；公开通知发布 / 撤下 → api-adapter（`:366`、`:379`）。问题：按钮在**同步**循环里发请求后立刻 toast「已下发至 N 个支部」（`:209`），服务端失败只由服务层回收镜像（`notice.js:592-633`），页面不会改口。
- **结论：保留 + 改 CTA**（等待回包，按结果分档提示）。
- **风险与下一动作**：公开通知计数 `publicCount` 只在进入公开子视图后刷新（`:103`、`:110`），首屏显示 0 属误导；与 F-5 同文件，同批修。

## 七、波次 F 汇总与下一批建议

| 页签 | 三问结论 | 未闭项数 | 处置 |
|---|---|---|---|
| `secretary.committee-meeting` | 保留 | 0（风险 1 条，非本 tab IA） | 归档为 A |
| `secretary.report-up` | 改 CTA | 1（F-2） | 排批；统计合卡待支书裁定 |
| `org.member-flow` | 保留＋改 CTA | 1（F-3） | 排批；单文件低风险 |
| `leader.write` | 保留＋改 CTA | 1（F-4） | 排批；指引跳转先做，发布通知补验证 |
| `party-committee.dispatch` | 保留＋改 CTA | 1（F-5） | 排批；单文件低风险 |

**下一批建议（原 3 条已复核收口；余 1 条待裁定）**

1. ~~**F-5** `dispatch-tab.js:193-213`~~ **已在批次 539 落地**（`:213-229` 等回包、`:107-111` 首屏计数）。
2. ~~**F-4** `leader/write-tab.js:300-302`~~ **已在批次 539 落地**（`:300-307` 可点击深链）。
3. ~~**F-3** `org/member-flow-tab.js:226`~~ **已在批次 539 落地**（`:232` 名册出口）。

F-2（上报表单热区与统计合卡）动首屏结构与统计口径，已进丙部待支书裁定（批次 609）。

## 八、批次 615 处置结论（未闭项逐条去向）

| # | 结论 | 判据 / 落点 | 去向 |
|---|---|---|---|
| 1 | 需动首屏统计结构，单批风险高 | `overview-tab.js:49`；首屏 4 个历史统计 | **排批**（独立 UI 批，先出方案） |
| 2 | 7 块 >4：各块对应不同决策面，合并会混淆状态 | `style-baseline.mjs:804-807` | **保留例外**（不新增例外） |
| 6 | 打回态错误面需跨 tab 统一组件 | `review-tab.js:506` | **排批**（与「错误面下沉动作级」同批） |
| 7 | 专班复盘派发回显缺真机往返验证 | `taskforce-tab.js:1342-1378` | **排批**（补一条真机流） |
| 8 | 考察交接接收方只拿专班类一半 | `inspection-tab.js:423-427` | **排批**（服务端派生改动） |
| 9 | 任命仍跨页、无行内浮窗 | `review-tab.js:209-217`；`branches-tab.js:162-170` | **排批**（IA 改动，待支书确认形态） |
| 10 | 超 4 块 + 同页 2 条筛选条 | `style-baseline.mjs:866-874` | **保留例外**（收敛会压掉不同筛选面） |
| 11 | F-2 热区与统计合卡 | `report-up-tab.js:43` 等 | **待裁**（`P-5`） |

**6 个超 4 块页签逐条结论**：`secretary.overview`（全局概况 7 块）、`disc.attendance` / `disc.inspection` / `org.*` 等工作概况 6 块——每块承载不同决策对象（场次 / 状态 / 异常 / 操作），合并会把「看哪一类」压成一次额外切换；维持登记例外，调色板与卡头规则照常生效。复评触发：支书给出「单屏只留 4 块」的优先级排序后重排。
