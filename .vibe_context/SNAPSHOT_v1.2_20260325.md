---
title: "System Snapshot v1.2"
type: snapshot
status: "ACTIVE - CURRENT"
date: "2026-03-25"
milestone: "全域制度层重构（活动建设 vs 组织建设双域化）；引入承办党小组 (hostGroup) 数据结构；场景选择器层级化降噪"
supersedes: "SNAPSHOT_v1.1_20260323.md"
topology_injected: "2026-03-25 (Architecture Phase 4/4: 治理层快照原子更迭)"
---

# 🏛️ System Snapshot v1.2 — 2026-03-25

---

## 0. Global Topology（全局物理拓扑树 — Depth 4）

> 本节为 LLM 跨 Session 记忆同步的核心物理坐标系。任何接手本系统的大模型，应以此拓扑树作为第一优先级定位资产。

```
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
│       ├── 常见工作场景快速指南.md          ← v3.0：# 一、活动建设 / # 二、组织建设 双域顶层架构
│       ├── 宣传委员工作流程指南.md          ← v1.8：含 (一)活动建设域 / (二)组织建设域 双域职责
│       ├── 组织委员工作流程指南.md          ← v1.7：含 (一)活动建设域 / (二)组织建设域 双域职责
│       ├── 纪检委员工作流程指南.md          ← v3.9：含 (一)活动建设域 / (二)组织建设域 双域职责
│       └── 支委与党小组定人定责定岗说明.md  ← v1.3：引言含两大域声明，条条委员含职责聚焦句式
│
├── .vibe_context/                         ← ★ AI治理元数据层（Control Plane）
│   ├── AI_CONTEXT.md                      ← ★ 已更新：两大核心域认知 + hostGroup 业务规范
│   ├── REVIEW_STATE.md                    ← v7.0，Stable/Release模式，控制平面总开关
│   ├── EXECUTION_LOG.md                   ← 日志索引
│   ├── SNAPSHOT_v1.2_20260325.md          ← ★ 本文件（当前唯一活动快照）
│   ├── scenarios/                         ← 4大核心场景路由文件
│   │   ├── core_logic.md
│   │   ├── sop_sync.md
│   │   ├── ui_scenario.md
│   │   └── meta_audit.md
│   └── logs/
│       ├── 2026-02-EXECUTION_LOG.md
│       ├── 2026-03-AUDIT_REPORT.md
│       └── 2026-03-EXECUTION_LOG.md       ← 当月执行日志（v1.2封版已追加）
│
├── docs/                                  ← 人类可读扩展文档
│   ├── DOCUMENTATION_MAP.md
│   ├── README.md
│   ├── SOP优化提案反馈卡.md
│   ├── SOP数据映射与同步指南.md
│   └── 党支部管理与实务经验沉淀.md
│
├── assets/
│   └── images/
│       └── party_emblem.png
│
└── 参考资料/                               ← 只读官方文件与会议记录
```

---

## 1. 两大核心域架构（v1.2 新增）

系统自 v1.2 起确立以下顶层业务域划分，贯穿制度层、UI 层、数据层：

### 1.1 活动建设域（Event Construction Domain）

聚焦于**发起、策划、执行党支部活动**的全流程管理。

| 典型场景 | scenarioId | 说明 |
|---------|-----------|------|
| 组织生活会 | `org-life` | 支部标准组织生活 |
| 主题党日活动 | `theme-party` | 支部特色活动，支持承办党小组 |
| 支部党员大会 | `branch-party-meeting` | 重要决议型全体大会 |
| 党小组会 | `party-group-meeting` | 小组层面常规活动 |
| 党课 | `party-lecture` | 政治理论学习活动 |

### 1.2 组织建设域（Org Construction Domain）

聚焦于**党员发展、纪律监督、信息报送、反馈处理**等长周期制度运营。

| 典型场景 | scenarioId | 说明 |
|---------|-----------|------|
| 发展积极分子 | `develop-activist` | 入党积极分子培育路径 |
| 党支部讨论 | `branch-discussion` | 重大事项讨论与决议 |
| 信息平台报送 | `info-platform` | 每周常规学工信息报送 |
| 意见反馈处理 | `feedback-handling` | 成员诉求收集与闭环响应 |

---

## 2. 承办党小组（hostGroup）数据字段规范（v1.2 新增）

### 2.1 字段定义

```yaml
hostGroup:
  type: string | null
  values: ["group1", "group2", "group3", null]
  default: null
  description: |
    承办党小组标识符。
    仅在"主题党日"等需要特定党小组承办的场景中使用，
    实现活动策划与执行责任的精准下放。
    其他场景（如组织生活会、党课）默认为 null，
    代表全支部共同承担，不下放至特定小组。
```

### 2.2 UI 绑定

- `index.html` 中 `#host-group-select` 下拉控件绑定此字段。
- `src/events.js` 中 `#gen-schedule-cal-btn` 事件提取 `hostGroup` 值写入 `actPayload`。
- `src/service.mock.js` 通过 spread 操作透传，无需特殊处理。

### 2.3 业务规范

1. **仅限责任下放场景使用**：`hostGroup` 仅在"主题党日"等由特定党小组主导承办的活动中填写非 null 值。
2. **全支部活动保持 null**：组织生活会、党课等全体活动统一设为 null，UI 应将 null 渲染为"全支部"或隐藏此字段。
3. **不影响任务分配逻辑**：`hostGroup` 为元数据标识，sopData.js 任务节点不依赖此字段做分叉路由，业务含义由 SOP 文档描述。

---

## 3. 场景选择器层级结构（v1.2 新增）

`index.html` 中 `#scenario-select-cal` 已按业务域重构为两级 `<optgroup>` 结构：

```html
<optgroup label="活动建设">
  <option value="theme-party">主题党日活动</option>
  <option value="org-life">组织生活会</option>
  <option value="branch-party-meeting">支部党员大会</option>
  <option value="party-group-meeting">党小组会</option>
  <option value="party-lecture">党课</option>
</optgroup>
<optgroup label="组织建设">
  <option value="develop-activist">发展积极分子</option>
  <option value="branch-discussion">党支部讨论</option>
  <option value="info-platform">信息平台报送</option>
  <option value="feedback-handling">意见反馈处理</option>
  <!-- 其他组织建设场景 -->
</optgroup>
```

降噪效果：用户无需在平铺 9 个选项中逐一辨认，通过域归属即可快速定位目标场景。

---

## 4. 关键数据流（运行时 DAG）

```
活动创建（双域场景）
  └─▶ #gen-schedule-cal-btn click [src/events.js]
        └─▶ 读取 #scenario-select-cal（含optgroup域结构）
        └─▶ 读取 #host-group-select → hostGroup 字段
              └─▶ actPayload = { scenarioId, t0, hostGroup, ... }
                    └─▶ BranchService.createActivity(actPayload)
                          └─▶ service.mock.createActivity → mockDB.activities.push({ ...actPayload })
                                └─▶ instantiateSOP(scenarioIds, t0DateStr) [src/workflow/sop.js]
                                      └─▶ BranchService.createTask(taskData) × N
                                            └─▶ setState({ activities, tasks }) → renderUI(appState)
```

---

## 5. 五大角色体系（v1.1 引入 secretary，v1.2 封版确认）

| managementRole | 中文名称 | 颜色 | CSS Theme Class | 引入版本 |
|----------------|---------|------|----------------|---------|
| `leader` | 党小组组长 | 🔵 蓝色 | `.role-theme-leader` | v1.0 |
| `commissioner` | 条条委员 | 🟡 黄色 | `.role-theme-commissioner` | v1.0 |
| `organizer` | 活动组织者 | 🔴 红色 | `.role-theme-organizer` | v1.0 |
| `deep` | 深度参与者 | 🟢 绿色 | `.role-theme-deep` | v1.0 |
| `secretary` | 党支书 | 🟣 紫色 (#8B5CF6) | `.role-theme-secretary` | v1.1 |

---

## 6. 封版审计记录

| 字段 | 值 |
|------|---|
| 封版日期 | 2026-03-25 |
| 执行会话 | Org OS Architecture Phase 4/4（治理层快照原子更迭） |
| 前序快照 | `SNAPSHOT_v1.1_20260323.md` → **已物理删除**，由本文件取代 |
| 本快照状态 | `[ACTIVE - CURRENT]` |
| 文档变更 | `.vibe_context/AI_CONTEXT.md`（两大核心域认知 + hostGroup 规范）、`README.md`（双域划分逻辑 + 承办党小组特性 + 版本号升级）、`.vibe_context/logs/2026-03-EXECUTION_LOG.md`（审计纪要追加） |
| 代码变更 | 无（Phase 4/4 为纯治理操作，严禁碰触 `src/`） |
| v1.1 里程碑 | 引入全局活动寻址器；SOP工作流引擎物理剥离至 `src/workflow/`；治理层全面对齐 workflow 认知；引入 secretary 角色 |
| v1.2 新增里程碑 | 全域制度层重构（活动建设 vs 组织建设双域化）；引入承办党小组 (hostGroup) 数据结构；场景选择器层级化降噪 |
