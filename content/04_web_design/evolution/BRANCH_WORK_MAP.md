---
title: "支部工作地图设计稿（平铺模块 + 按人双视图）"
type: design
role: "[工程师]+[AI]"
created: 2026-09-03
last_updated: "2026-09-14"
status: landed
related_files: [WORKFLOW_BLOCK_CONTRACT.md, ARCHITECTURE_EVOLUTION.md, ../../../.ctx/ENGINEERING_ASSESSMENT.md]
---

# 支部工作地图设计稿（平铺模块 + 按人双视图）

> **已落地 2026-09-04**：本设计已实现（代码：docs/src/entries/tabs/secretary/work-map-tab.js + workforce-panel.js；测试：server/test/work-map.test.mjs 绿）；本文档继续承担设计论证档案。

> **2026-09-03 支书裁决（放行编码）**：① 模块清单照 11 项放行；② 「支部分工」支书台入口 + 支委会议题生效（可会前草稿）**全链路放行**。（裁决出处见 2026-09-03 执行日志 `.ctx/logs/2026-09-EXECUTION_LOG.md`；SECRETARY_DIRECTIVES.md 未收录该设计裁定，无对应 P 编号）

> **定位**：支部工作的组织视图与分工载体。支书 2026-09-03 三重命令：
> ① **党建/党务二分已取消**（全仓废止，本稿不再出现该表达）；
> ② **"组织生活会"也是错误范畴**（本稿不设此模块）；
> ③ 地图呈现 = **平铺模块清单 + 按人分组 两种视图**（不设任何顶层大类筐）。
> 本稿模块清单只列既有工作形式，模块归属与分工由支部自行建设（支书台），调整走支委会议题。（三重命令裁决出处同上——2026-09-03 执行日志，SECRETARY_DIRECTIVES 无对应 P 编号）

---

## 一、模块清单（平铺；全部为既有工作形式，无分类筐、无自造项）

> **分层（tier，2026-09-13 支书裁定）**：模块分两层——`norm` **工作程序/党内统一规范**（必办、须有人、跨支部一致、**不可停用**）与 `method` **工作方法**（本支部自选，**可停用**、也可随时复用；各支部最大差别正在工作方法）。判据单一源 = `docs/src/core/work-map.js` 的 `tier` 字段；面板按层分组呈现。

| 工作模块 | 层 | 既有资产 |
|---|---|---|
| 支部党员大会 / 支委会 / 党小组会 / 党课（三会一课） | norm | ACTIVITY_CLASSIFICATION['three-meetings'].subtypes + 场景 branch-party-meeting / branch-committee / party-group-meeting / party-lecture |
| 主题党日 | norm | ACTIVITY_CLASSIFICATION['theme-party'] + 场景 theme-party（党小组主题党日活动） |
| 专班 | **method** | taskforce 域（短期/长期）；**本支部自创工作方法**（非全党通用；别的支部要用亦可复用，不用即可停用） |
| 共建活动 | **method** | 场景 joint-event（团支部合办等） |
| 发展党员 | norm | development-tab 管线 + 场景 develop-activist（环节：申请→积极分子→考察→发展对象→接收→转正） |
| 民主评议党员 | norm | 年度评议（明细待建） |
| 换届选举 | norm | appointment 任命机制 + 票决 |
| 考勤考察 | norm | attendance/inspection 记录域（产出环节，附于活动/专班） |
| 意见反馈处理 | norm | 场景 feedback-handling + 反馈管理 |
| 制度制定与迭代 | norm | 场景 new-system |
| 信息平台支持 | **method** | 场景 info-platform |

> 考勤/考察/宣传等为**活动/专班运行中的产出环节**（卡内"产出交接"标签），不单列大类。
> 停用表示：`config.workforce[moduleId] = { ownerType:'none', ownerId:'' }`（**仅方法类允许**；规范类落库前即被 `mergeWorkforceSnapshot` / `sanitizeConfigWorkforce` 拦掉）。

### 过拟合 / 欠拟合清单（2026-09-13 全局卡片审计，支书「以小见大」要求）

**过拟合（支部自创工作方法被升为顶级位 / 空数据仍占位）——已修**：

| 过拟合实例 | 位置 | 原状 | 现修 |
|---|---|---|---|
| 「专班待议（支委会）」独立顶卡 | `secretary/todo-tab.js` | **无条件渲染**，无数据也占位「暂无待议专班」 | 撤销顶卡 → 实时组归入「专班」业务域折组（有报送才成组） |
| 首页「活跃专班」统计卡 | `dashboard/stats.js` | 无专班支部永远显示「0 个」（不可配置） | 仅在确有活跃/招募中专班时出现 |
| 首页「专班进展」卡 | `index.html` + `dashboard/taskforce-list.js` | 空态「暂无活跃专班」恒占位 | 无活跃专班 → **整卡不出**（含标题与入口） |
| 首页「活动风采」卡 | `index.html` + `dashboard/gallery.js` | 空态「暂无风采展示」恒占位 | 无内容 → 整卡不出 |
| 组织台专班看板三桶 | `org/taskforce-tab.js` | 三桶恒渲染、空桶显「暂无…专班」并撑 `min-h-[120px]` | 只渲染**有内容**的分桶，列数随桶数自适应；全空给单一说明行 |

> 统一判据：**支部自创工作方法（provenance=branch-custom / tier=method）不得占据首页或 tab 顶部的固定槽位**；无数据即不出卡（不做「常驻空卡」）。规范类统计（如「本月活动」）不受此限。

**欠拟合（党内统一规范类工作在界面的承载现状）**：

| 规范类工作 | 界面承载现状 | 缺什么 |
|---|---|---|
| 三会一课（四子会） | 活动域（写入模板 4 场景）+ 日历/考勤/应到口径 + 分工卡 1 项 | 无按「党员大会/支委会/党小组会/党课」分列的落实视图（现靠日历分类筛选） |
| 主题党日 | 活动域 + 工作流块 `theme-party-day` + 分工卡 | — |
| 发展党员 | 组织台「发展数据」只读追踪 + 成员变更确认链 | 培养联系人体系（到人）未建 |
| 民主评议党员 | 仅活动**命名表达**（不设子类，沿用「组织生活会」裁定：内容是命名表达、不进子类 chips/写入表单） | 评议明细（评议表/格次/汇总）未建 |
| 换届选举 | 党委台「任命支书」+ 线上支委会票决 | 换届完整流程（酝酿提名/请示上级/选举大会/报批备案）未建 |
| 党费收缴 | **零承载**（全库无「党费」字样） | 是否纳入系统**待支书裁定** |
| 意见反馈处理 | 纪检台「反馈管理」+ 公开反馈页 + 各台「我的处置」 | — |
| 考勤考察 | 纪检/组长上传 + 考勤矩阵/总表 + 考察总表 | — |
| 制度制定与迭代 | 制度文件走 `content/` 目录 | 系统内无「制度台账/版本」位 |

> 判据：**规范类工作的「会议承载」已具备**（活动域 + 命名表达，与「组织生活会」同一裁定）；缺的是**流程明细/台账**——一律**显式登记**（work-map 描述或本表），**不用「占位卡」充数**（那正是过拟合）。

**2026-09-13 批次 21（三表统一化：第一列是人的表格 / 第一列是活动的表格）追加**：

过拟合（已处理）：

| 过拟合实例 | 原状 | 现修 |
|---|---|---|
| 小表强加检索条 | 少量行的表也渲染检索条，成本大于收益 | 门槛 `SEARCH_FILTER_MIN_ROWS = 8` 统一拦截（人/活动共用，动态行数 `> 8` 才出现检索条） |
| 活动类型/状态各页自造口径 | 各 tab 各写一套判据与状态文案 | 收敛为单一源——存储态判据 `isActivityEnded / isActivityArchived / isActivityNotStarted / isActivityLive`（`core/constants.js`）、生命周期展示态走 `components/inspector.js::deriveActivityLifecycleStatus`、类型写 `normalizeActivityType` 权威子类中文名 |
| 模块加载期人员快照 ×13 | 模块顶层捕获人员清单，与后台写入未同步、有张冠李戴风险 | 改 `services/person.js::liveMembers()` 实时视图（只读 Proxy，写入走 PersonStore 写口） |

欠拟合（已登记）：

- 部分表「第一列是人」与「第一列是活动」同等重要（考勤矩阵、表态矩阵、考察人视图矩阵等）——本轮**不接入**统一检索（矩阵/转置结构，接入会破坏视图与分页），登记为**已知例外**；
- 上述清单中「`Date.now()` 生成实体 id 的全站排查」与「`RESIDENCE` 常量两份同值定义」两项**已于 2026-09-14 批次 24 闭环**（id 收敛 `core/id.js` 单一源＋两层守卫；`RESIDENCE` 收敛 `core/constants.js` 单一源＋S4 结构层守卫）——权威留痕见 `.ctx/REVIEW_QUEUE.md`（Q-21-2 / Q-21-3）与 `CLAUDE.md`（R-35 / R-37）。

---

## 二、两种视图（支书裁决：平铺 + 按人）

**视图 A · 平铺模块清单**：上表模块横向/纵向平铺，卡 = manifest 工作包（开不开/谁负责/产出交接），无分组、无泳道、无连线。

**视图 B · 按人（分工视角）**：切换后按人组织——每位负责人（支书/副支书/三委员/党小组组长，或指派到的具体人）名下显示其负责模块；空人（无分工者）提示"待支委会分工"。

两视图同源一份 `config.workforce`，切换只换排列，不换数据。

---

## 三、分工（支部自行建设；调整 = 支委会议题）

- **定位（2026-09-13 支书裁定）**：分工 = 「工作事项 → 负责人」的**运行编排**，**不等于对组织的实际配置**（组织实际配置＝名称/架构/名册/制度，另行）。它是「线上调整一次，信息与任务自动传下去」的机制。
- **入口（双端，同一数据）**：
  · **支部日常**＝支书台「支部分工」（支部书记/副书记可编排，属支部自治）；
  · **党委/部署期**＝党委台「支部配置 → 换组织向导」**第③步「角色分工」**（换壳/新建支部时定基线）。
  > 修订说明：原稿 §三/§六 写「党委台不提供分工编排」，2026-09-13 支书裁定「这个不仅党委有这个权限，支部也要有」——两道口并存，均落同一 `config.workforce`。
- **生效路径**：分工变更 = 支委会议题（议题类型：班子分工/模块归属）→ 表决通过 → 落 `config.workforce`（`{ [moduleId]: { ownerType: 'role'|'person', ownerId } }`；缺省按 SOP 责任人列）。支书可先会前拟稿（草稿态）。
- **落点（自动传递，2026-09-13 补）**：采纳后按本次实际改派的负责人**逐条派生「履职」待办**（到人 → `personId`；角色 → `role`，并写入同域折组），同时系统通知 `workforce-proposal-adopted` 由服务端按 `extras.proposal` **复算 actionRoles/actionable** → 角色负责人另获定向待办；到人负责人的入口由各工作台概况「支部安排·我的分工」履职卡承载。

---

## 四、与既有资产映射（不新造）

模块 → workflow/blocks manifest（主题党日/专班已建；三会一课子会等按同法续建，粒度即上表）｜ 分工 → config.workforce（server config 白名单收口）｜ 产出交接 → manifest.outputs + OUTPUT_BLOCK_DEFS。

## 五、能力缺口（诚实清单）

培养联系人体系（到人）/ 联系人考察写实 / 民主评议明细 / 换届完整流程 / 党费收缴 —— 均不在既有系统，后续按 L3 manifest 补齐，非本次范围。

## 六、YAGNI

❌ **连线/条件**：本稿是组织与分工视图，不是流程编排器——连线只复述流程先后，信息量增而无决策收益（执行顺序已由 workflow stages / 决策树承载；同 WORKFLOW_BLOCK_CONTRACT §六 YAGNI「图形化条件分支连线」）。
❌ **顶层分类筐（党建/党务等全部不设）**：平铺模块清单 = 最小信息成本——再套一层分组筐，用户找模块要先多钻一层，违反最小三成本（DESIGN_METHODOLOGY §1.2 / DESIGN_SYSTEM §一 第2条）。
  > 注：2026-09-13 的 `tier`（工作程序/工作方法）**不是分类筐**——它只在「发起调整」的模块下拉里以 optgroup 呈现，用于区分「必办不可停用」与「支部自选可停用」；平铺清单本身仍是一层，不放 tier 分组。
❌ **全站 tab 重构成地图**：执行入口已按角色工作台落地（最小操作成本形态）；地图只承载组织与分工视图，执行仍走既有工作台，重构不增决策收益。

**验收闭环**：支书台「支部分工」→ 平铺/按人两视图 → 提议"发展党员改派副支书"→ 支委会议题 → 票决通过 → config.workforce 落库 → 副支书工作台出现对应入口（生效消费端=各工作台概况「支部安排·我的分工」履职卡，2026-09-05 已补）。

## 七、裁决记录与落地进度

**2026-09-03 支书裁决**：
1. 模块清单 **照 11 项放行**（不增删既有工作形式）；
2. 「支部分工」入口 + 支委会议题生效（可会前草稿）**全链路放行**。

> 裁决出处：2026-09-03 执行日志（`.ctx/logs/2026-09-EXECUTION_LOG.md`）；SECRETARY_DIRECTIVES.md 未收录该设计裁定，无对应 P 编号。

**落地进度（攒批推进）**：
- ✅ **M0 数据契约**：`docs/src/core/work-map.js`（11 模块目录 + 缺省分工 + `expandWorkforce` 快照展开，零依赖双端可加载）；`config-clean.js` 新增 `sanitizeConfigWorkforce`；server `PATCH /branches/:id/config` 支持 `config.workforce`（null=恢复缺省）；`branch.js` 新增 `getBranchWorkforce/updateBranchWorkforce`（写配置抽 `_saveBranchConfig` 共用）。
- ✅ **M1 地图视图**：支书台新增「支部分工」tab（党建组）——视图 A 平铺 11 模块卡 / 视图 B 按人分组（纯排列切换，同一份 workforce）；禁 SVG 图标（沿用支书台裁定）。
- ✅ **M2 已落地**：`services/workforce.js`（发起分工调整 = 创建「支委会」议题活动，voteConfig=deliberative 交流式，应到支委；议题列表；采纳 = 至少已有一名支委表态后合并 `config.workforce` 落库并标记活动）；`workforce-panel.js`（支书台「支部分工」tab 底部分工调整工具：发起表单 / 议题跟踪 / 去表决跳活动详情 / 采纳生效，仅支书/副支书可见）；`work-map.js` 增 `mergeWorkforceSnapshot`（模块白名单合并）。表决复用既有 agenda-votes 资产（本链路不重复造投票 UI）。
- ✅ **M2 闭环补齐（2026-09-05，支书批准「批准，开工」）**：①票决通过判定 `evaluateWorkforceVotes`（应到支委 2/3 出席且无异议=通过）为采纳硬门槛，议题 extras 记 `voteOutcome`；②面板表单升级多行（模块→新负责人）+「存草稿/直接发起」，草稿=支书台本地暂存（`gsm1921-workforce-draft`）；③生效消费端 `components/workforce-duty-card.js`——各工作台概况常驻「支部安排·我的分工」履职卡（实时读 config.workforce，可去履职跳本台对应 tab）；④`server/test/workforce-gate.test.mjs` 判定/合并快照纯测试 5 项全绿。演示验收闭环（改派发展党员→副支书）目视复核待浏览器环境。
- 测试：`server/test/work-map.test.mjs`（目录唯一性/快照展开/**合并白名单**/净化/HTTP PATCH 含恢复默认）5 项绿；module-load 全量加载绿。
- **可复用文档件已补**：`server/.env.example` 环境模板、根 `CONTRIBUTING.md` 贡献指南、README 演示账号指引修正 + 贡献引用。
- ✅ **落地注记（2026-09-14 落地）· 党小组升为一等实体，本项不新增工作地图模块**：党小组由「成员档案 `partyGroup` 字段取值集合」升为一等实体——组清单持久化（`partyGroups` 域，活组取状态为 `active` 者、按 `seq` 排序）+ 新增/改名/解散 + 留痕；支书台「**党小组**」tab（由原「党小组进展」升级：清单 + 管理写口 + 进展只读 + 未分组提示）。**落点文件**：`docs/src/services/party-group.js`（写口单一源）、`docs/src/entries/tabs/secretary/group-progress-tab.js`、`docs/src/modules/capabilities/secretary-workspace.js`、`docs/src/mock/party-groups.js`（种子三组）、`server/routes/resources.js`（资源名 / `ID_PREFIX:'pg'` / 写门）。**测试证据**：`server/test/party-group.test.mjs` **9/9 通过**（结构层 S1-S3 + 数据层 D1-D6）；全量 `node --test --test-concurrency=1` **523/523 通过（0 失败）**；真机**串行**复核——党小组 tab 清单 3 行且进展区保留、写口链路（新增「第四党小组」→ 改名「（试改）」→ 解散空组转「已解散」→ 解散非空组「第三党小组」16 人转「未分组」→ 行内下拉归组 1 人后未分组 16 降到 15）、`PAGEERRORS: []`。**本项不新增工作地图模块**——理由：组织结构维护属既有模块的「职责有入口」（党的组织设置本就在三会一课/专班等既有模块的运行中承载），故模块清单维持 11 项、`docs/src/core/work-map.js` 的模块目录不增删，`server/test/work-map.test.mjs:36` 的模块数断言（11 项）不受影响。**状态：已落地（2026-09-14）**。
- ✅ **落地注记（2026-09-14 批次 26）· 成员流入/流出登记（复式记账台账 + 对账 + 自动建号 + 登记即生效 + 撤销留痕），本项不新增工作地图模块**：**落点文件**：`docs/src/services/member-flow.js`（台账写口单一源：`loadMemberFlows` / `reconcile` 对账 / `registerIntake` 单人流入 / `registerIntakeBatch` 粘贴多行 / `registerOutflow` 多人流出 / `revokeFlow` 撤销 / `canRegisterFlow`）、`docs/src/services/accounts.js`（账号层可持久化：账号取学号、口令取支部统一默认口令）、`docs/src/entries/tabs/org/roster-tab.js`（组织台名册内「成员流动」面板）、`server/routes/resources.js`（写门 `memberFlows`）；配套 `docs/src/mock/member-flows.js` / `mockDB.memberFlows` / `server/db.js` 表 `member_flows` / `api-adapter` 资源组 / 快照 payload 与 init 拉取 / `init-reset` 清档。**测试证据**：`server/test/member-flow.test.mjs` **10 例通过**（两层法 S1–S3 / D1–D6）；全量 `node --test --test-concurrency=1` **533/533 通过（0 失败）**；真机**串行**复核（组织台名册「成员流动」）——面板与对账行在位（期初在册 51 · 流入 0 · 流出 0 · 当前在册 51）、单人流入成功（流入 1、当前在册 52）、批量粘贴三行（错误行回显「第 2 行：学号不能为空（账号由学号派生）」，其余两行照常入库，流入 3、当前在册 54）、流出弹窗含 PersonPicker 入口与流出日期与备注、`PAGEERRORS: []`；**未完成（如实标注）**：流出与撤销的 UI 点击链路未真机点到（复核脚本选择器未命中 PersonPicker 展开后的候选，脚本报 Malformed value 中断），该链路数据层已由 member-flow 单测覆盖。**本项不新增工作地图模块**——模块数仍为 11，`docs/src/core/work-map.js` 的模块目录不增删。**状态：已落地（2026-09-14）**。
