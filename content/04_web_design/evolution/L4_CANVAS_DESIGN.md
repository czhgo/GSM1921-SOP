---
title: "L4 支部工作地图设计稿 v2.1（平铺模块 + 按人双视图）"
type: design
role: "[工程师]+[AI]"
created: 2026-09-03
last_updated: "2026-09-03"
status: draft-pending-confirm
related_files: [BLOCK_MANIFEST_CONTRACT.md, ARCHITECTURE_EVOLUTION.md, MODULARIZATION_ASSESSMENT.md]
---

# L4 支部工作地图设计稿 v2.1

> **定位**：支部工作的组织视图与分工载体。书记 2026-09-03 三重命令：
> ① **党建/党务二分已取消**（全仓废止，本稿不再出现该表达）；
> ② **"组织生活会"也是错误范畴**（本稿不设此模块）；
> ③ 地图呈现 = **平铺模块清单 + 按人分组 两种视图**（不设任何顶层大类筐）。
> 本稿模块清单只列既有工作形式，模块归属与分工由支部自行建设（书记台），调整走支委会议题。

---

## 一、模块清单（平铺；全部为既有工作形式，无分类筐、无自造项）

| 工作模块 | 既有资产 |
|---|---|
| 支部党员大会 / 支委会 / 党小组会 / 党课（三会一课） | ACTIVITY_CLASSIFICATION['three-meetings'].subtypes + 场景 branch-party-meeting / branch-committee / party-group-meeting / party-lecture |
| 主题党日 | ACTIVITY_CLASSIFICATION['theme-party'] + 场景 theme-party（党小组主题党日活动） |
| 专班 | taskforce 域（短期/长期） |
| 共建活动 | 场景 joint-event（团支部合办等） |
| 发展党员 | development-tab 管线 + 场景 develop-activist（环节：申请→积极分子→考察→发展对象→接收→转正） |
| 民主评议党员 | 年度评议（明细待建） |
| 换届选举 | appointment 任命机制 + 票决 |
| 考勤考察 | attendance/inspection 记录域（产出环节，附于活动/专班） |
| 意见反馈处理 | 场景 feedback-handling + 反馈管理 |
| 制度制定与迭代 | 场景 new-system |
| 信息平台支持 | 场景 info-platform |

> 考勤/考察/宣传等为**活动/专班运行中的产出环节**（卡内"产出交接"标签），不单列大类。

---

## 二、两种视图（书记裁决：平铺 + 按人）

**视图 A · 平铺模块清单**：上表模块横向/纵向平铺，卡 = manifest 工作包（开不开/谁负责/产出交接），无分组、无泳道、无连线。

**视图 B · 按人（分工视角）**：切换后按人组织——每位负责人（书记/副书记/三委员/党小组组长，或指派到的具体人）名下显示其负责模块；空人（无分工者）提示"待支委会分工"。

两视图同源一份 `config.workforce`，切换只换排列，不换数据。

---

## 三、分工（支部自行建设；调整 = 支委会议题）

- **入口**：书记台「支部分工」（支部自治）；**党委台不提供分工编排**（支部内政，党委只做实例/上报/监控）。
- **生效路径**：分工变更 = 支委会议题（议题类型：班子分工/模块归属）→ 表决通过 → 落 `config.workforce`（`{ [moduleId]: { ownerType: 'role'|'person', ownerId } }`；缺省按 SOP 责任人列）。书记可先会前拟稿（草稿态）。
- **落点**：指派后对应负责人工作台出现该模块入口/待办（复用既有角色台 + 待办派生）。

---

## 四、与既有资产映射（不新造）

模块 → workflow/blocks manifest（主题党日/专班已建；三会一课子会等按同法续建，粒度即上表）｜ 分工 → config.workforce（server config 白名单收口）｜ 产出交接 → manifest.outputs + OUTPUT_BLOCK_DEFS。

## 五、能力缺口（诚实清单）

培养联系人体系（到人）/ 联系人考察写实 / 民主评议明细 / 换届完整流程 / 党费收缴 —— 均不在既有系统，后续按 L3 manifest 补齐，非本次范围。

## 六、YAGNI

❌ 连线/条件 ｜ ❌ 党委编排分工 ｜ ❌ 顶层分类筐（党建/党务等全部不设）｜ ❌ 全站 tab 重构成地图（地图=组织与分工视图；执行仍走既有工作台）。

**验收闭环**：书记台「支部分工」→ 平铺/按人两视图 → 提议"发展党员改派副书记"→ 支委会议题 → 票决通过 → config.workforce 落库 → 副书记工作台出现对应入口。

## 七、待书记裁决

1. 模块清单（11 项平铺）是否有要加/删的既有工作形式？
2. 「支部分工」书记台入口 + 支委会议题生效（可会前草稿）是否放行编码？
