---
title: "System Snapshot v1.3"
type: snapshot
status: "[DEPRECATED] - superseded by SNAPSHOT_v2.0_20260401.md"
date: "2026-03-27"
milestone: "全域减负与 UI 极简降噪竣工；双域（活动建设/组织建设）架构彻底固化；日历检索实时响应；状态机完美解耦。"
supersedes: "SNAPSHOT_v1.2_20260325.md"
topology_injected: "2026-03-27 (Polish Phase 3/3: 系统原子清理与大满贯快照封版)"
---

# 🏛️ System Snapshot v1.3 — 2026-03-27

---

## 0. Global Topology（全局物理拓扑树 — Depth 4）

> 本节为 LLM 跨 Session 记忆同步的核心物理坐标系。任何接手本系统的大模型，应以此拓扑树作为第一优先级定位资产。

```text
GSM1921-SOP/                               ← 项目根目录（GitHub Pages 静态站）
├── index.html                             ← 唯一 HTML 入口，<script type="module"> 加载 src/main.js
├── README.md                              ← 项目驾驶舱（v6.1），含双域架构/9+2模块树/RBAC表/DAG说明
├── ARCHITECTURE.md                        ← 技术架构文档
├── AI_ENTRYPOINT.md                       ← 书记指令入口（AI 操作 SOP 首读）
├── SYSTEM_ROADMAP.md                      ← 系统路线图
│
├── src/                                   ← ★ 前端源码（ESM模块 + 服务层）
│   ├── main.js                            ← 启动入口 + renderUI()（唯一DOM更新出口）
│   ├── state.js                           ← appState + setState(patch) + registerRenderCallback
│   ├── constants.js                       ← ROLE_COLORS / ROLE_LABELS / ROLE_THEME_CLASS / ROLE_ORDER
│   │                                         含第五角色：secretary (党支书, #8B5CF6 紫色)
│   ├── utils.js                           ← showToast / _fmtDate / _fmtChinese / _currentYearMonth
│   ├── workflow/                          ← ★ SOP核心规则引擎（物理封装子目录）
│   │   ├── index.js                       ← 桶文件：统一对外导出 instantiateSOP / sopDatabase
│   │   ├── sopData.js                     ← SOP场景任务节点模板（含secretary角色、双域场景完整任务集）
│   │   └── sop.js                         ← instantiateSOP(scenarioIds, t0DateStr) → 绝对日期任务数组
│   ├── calendar.js                        ← renderCalendarByActivities(state, targetMonth)
│   │                                         双轨渲染：participant=文字标签；manager=Focus Mode四色任务
│   ├── inspector.js                       ← renderInspectorFromState / filterTasksByManagementRole
│   ├── events.js                          ← setupEventListeners()
│   │                                         ★ 含 hostGroup 字段提取 → actPayload
│   │                                         ★ #month-selector 实时响应（change 事件，无冗余按钮）
│   ├── service.mock.js                    ← CRUD + LocalStorage（SANDBOX_MODE开关）
│   ├── service.runtime.js                 ← BranchService出口（USE_MOCK路由开关）
│   ├── domain.js                          ← [Legacy] Schema typedef / mockDB（保留兼容）
│   └── id.js                             ← [Legacy] 唯一ID生成工具
│
├── knowledge/                             ← ★ SOP制度母本（最高权威，变更起点）
│   ├── README.md
│   └── SOP/
│       ├── INDEX.md                       ← SOP文件索引
│       ├── README.md
│       ├── 常见工作场景快速指南.md          ← v3.2：双域顶层架构 + 全9项减负成果落地
│       ├── 宣传委员工作流程指南.md          ← v1.9：含双域职责 + 减负精简归档产出物
│       ├── 组织委员工作流程指南.md          ← v1.8：含双域职责 + §4.1块块组长负责通知
│       ├── 纪检委员工作流程指南.md          ← v3.10：含双域职责 + 删除微信备忘录干预
│       └── 支委与党小组定人定责定岗说明.md  ← v1.4：两大域声明 + 减负最终归档规则
│
├── .vibe_context/                         ← ★ AI治理元数据层（Control Plane）
│   ├── AI_CONTEXT.md                      ← ★ 已更新：两大核心域认知 + hostGroup + secretary + 减负原则
│   ├── REVIEW_STATE.md                    ← v7.0，Stable/Release模式，控制平面总开关
│   ├── EXECUTION_LOG.md → logs/EXECUTION_LOG_INDEX.md  ← 日志索引（已迁移）
│   ├── SNAPSHOT_v1.3_20260327.md          ← ★ 本文件（当前唯一活动快照）
│   ├── scenarios/                         ← 4大核心场景路由文件
│   │   ├── core_logic.md
│   │   ├── sop_sync.md
│   │   ├── ui_scenario.md
│   │   └── meta_audit.md
│   └── logs/
│       ├── 2026-02-EXECUTION_LOG.md
│       ├── 2026-03-AUDIT_REPORT.md
│       └── 2026-03-EXECUTION_LOG.md       ← 当月执行日志（v1.3封版已追加）
│
├── docs/                                  ← 人类可读扩展文档
│   ├── DOCUMENTATION_MAP.md
│   ├── README.md
│   ├── SOP优化提案反馈卡.md
│   ├── SOP数据映射与同步指南.md
│   └── 党支部管理与实务经验沉淀.md
│
├── assets/
│   └── ...                               ← 静态资源（图片、PDF等只读资产）
│
└── backlog/
    └── PENDING_MODIFICATIONS.md          ← 待办任务队列
```

---

## 1. Milestones（里程碑记录）

| 版本 | 日期 | 里程碑描述 |
|------|------|-----------|
| v1.0 | 2026-02 | 系统初始化，ESM架构，LocalStorage持久化，基础SOP注入 |
| v1.1 | 2026-03-23 | 全域 SOP 同步（Phase 1–5B）；sopData.js 多场景扩充；宣传/组织/纪检三委指南升版 |
| v1.2 | 2026-03-25 | 双域架构（活动建设/组织建设）正式确立；hostGroup 字段引入；secretary 角色全面接管；场景选择器层级化 |
| v1.3 | 2026-03-27 | 全域减负与 UI 极简降噪竣工；双域（活动建设/组织建设）架构彻底固化；日历检索实时响应（月份选择器 change 事件）；状态机完美解耦（活动写入不再强制跳转视图）。 |

---

## 2. Architecture Invariants（架构不变量）

1. **唯一 HTML 入口**：`index.html` 是 GitHub Pages 静态站的唯一入口，`<script type="module" src="./src/main.js">` 是唯一模块加载点。
2. **单向状态流**：`setState(patch)` → `renderUI(state)` 是唯一合法数据→视图路径。
3. **双域数据路由**：活动建设 (scenarioId: theme-party / org-life / branch-party-meeting / party-group-meeting / party-lecture) 与组织建设 (develop-activist / feedback-handling / info-platform / committee-meeting / joint-event / brand-activity) 在 `sopData.js` 中以 scenarioId 区分。
4. **hostGroup 字段**：`group1` / `group2` / `group3` / `null`，仅主题党日/党小组会/组织生活会场景显示承办小组选择器。
5. **secretary 角色**：第五大核心角色（党支书），紫色 #8B5CF6，在 constants.js 完整注册，party-lecture / feedback-handling 场景底层任务由 secretary 全权负责。
6. **减负原则**：各角色产出物仅保留核心交付（宣传推文+配图+党支部工作记录），杜绝冗余记录。
