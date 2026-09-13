---
title: "支部工作地图设计稿（平铺模块 + 按人双视图）"
type: design
role: "[工程师]+[AI]"
created: 2026-09-03
last_updated: "2026-09-05"
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
