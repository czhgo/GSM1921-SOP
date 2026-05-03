---
title: "光华管理学院本科生党支部 SOP"
type: index
audience:
  - 所有支部成员
  - 新任支委
  - 党小组组长
  - 开源贡献者
owner: "储子禾"
role: "[人]"
last_updated: "2026-05-02"
status: active
---

# 光华管理学院本科生党支部组织操作系统

**将党支部制度文本转化为可执行的代码工作流，由 10 个 AI Agent 组成治理集群持续维护。**

> 🌐 **公网访问：[https://czhgo.github.io/GSM1921-SOP/](https://czhgo.github.io/GSM1921-SOP/)**

三条核心价值：

1. **制度驱动** — 所有工作流源自 `content/SOP/`，改一处制度，全系统同步
2. **人机协作** — 书记提需求，AI Agent 几分钟内完成修改，全程有日志可查
3. **零门槛上手** — 委员只需看流程卡，无需理解任何代码或技术架构

---

## 仓库结构

```
/
├── README.md              ← 你在这里
├── ARCHITECTURE.md        [人机] 核心架构说明（分层、数据模型、变更流水线）
├── ROADMAP.md             [人机] 未来执行路线图（待办清单、技术产品 Phase 2-3）
├── index.html             [人机] UI 入口（浏览器打开即用）
│
├── content/               [人机] 内容中心
│   ├── SOP/               [人机] 制度母本层 — 所有工作流的最高权威来源
│   ├── guides/            [人机] 操作指南 — Agent 使用指南、文档导航、反馈卡
│   ├── insights/          [人机] 经验沉淀 — 党支部管理与实务经验
│   └── references/        [人]  官方底线层 — 党章、条例、模板（只读引用）
│
├── src/                   [人机] 代码实现层 — 状态机、服务层、SOP 工作流引擎
├── .github/               [AI]  Agent 治理层 — 10 Agent + 10 Skill + 宪章
└── .ctx/                  [AI]  运行时上下文 — AI 快速同步入口、执行日志、快照
```

> 完整架构说明见 [ARCHITECTURE.md](./ARCHITECTURE.md)，全局文档导航见 [content/guides/DOCUMENTATION_MAP.md](./content/guides/DOCUMENTATION_MAP.md)

---

## 双域架构

| 域 | 涵盖内容 |
|----|---------|
| **活动建设** | 主题党日、三会一课、民主评议、换届选举、发展党员、组织生活会 |
| **组织建设** | 制度修订、职责分工、意见反馈、合规审查、文档规范、定岗定责 |

**条块概念**：条条 = 功能委员线（组织/宣传/纪检），块块 = 党小组长线（第一/二/三党小组）

---

## 新人 5 分钟上手

### 1. 打开网页

直接访问 **[https://czhgo.github.io/GSM1921-SOP/](https://czhgo.github.io/GSM1921-SOP/)** 或本地双击 `index.html`，无需安装任何工具。

### 2. 把新活动写进日历

1. 点击右侧 **【推演工作台】** 页签
2. 选活动日期 → 选活动类型（主题党日/组织生活会/党小组会等）
3. 选承办党小组（如适用）→ 输入活动名称
4. 点击 **【写入活动】** → 日历自动标注，生成全套待办清单

### 3. 查自己要做什么

1. 点击左侧角色按钮（党支书/组织委员/宣传委员/纪检委员/党小组组长/活动组织者）
2. 系统自动筛选出仅与你相关的任务
3. 点击任务卡片 ▼ 展开详情，完成后改状态为【已完成】

### 4. 常见操作速查

| 我想做的事 | 操作路径 |
|-----------|---------|
| 知道这次活动我负责哪些步骤 | 左侧选角色按钮 → 右侧筛选任务列表 |
| 把新活动加进日历 | 推演工作台 → 填日期/场景/名称 → 写入活动 |
| 查阅标准流程手册 | [常见工作场景快速指南](./content/SOP/常见工作场景快速指南.md) |
| 发现流程有问题想改 | [SOP优化提案反馈卡](./content/guides/SOP优化提案反馈卡.md) → 提交书记确认 |
| 查看活动历史记录 | 左侧点击【归档库】按钮 |

---

## 按角色快速导航

### 新任支委（第一天必看）

1. [常见工作场景快速指南](./content/SOP/常见工作场景快速指南.md) — 9 个最常见工作场景
2. [支委与党小组定人定责定岗说明](./content/SOP/支委与党小组定人定责定岗说明.md) — 搞清楚谁负责什么

### 条条委员专属手册

| 角色 | 手册入口 |
|------|---------|
| 组织委员 | [组织委员工作流程指南](./content/SOP/组织委员工作流程指南.md) |
| 宣传委员 | [宣传委员工作流程指南](./content/SOP/宣传委员工作流程指南.md) |
| 纪检委员 | [纪检委员工作流程指南](./content/SOP/纪检委员工作流程指南.md) |

### 支委分工总览

```
块块（横向，活动组织）          条条（纵向，职能保障）
────────────────────          ────────────────────
第一党小组：储子禾（学术）      组织委员：侯嘉嵘
第二党小组：王峥旭（就业）      宣传委员：闫鑫岳
第三党小组：辛长乐（就业）      纪检委员：韩思宁
```

---

## AI Agent 治理集群

系统由 10 个 VS Code 自定义 Agent 组成，通过 handoffs 按钮形成协作链路。

| Agent | 类型 | 职责 |
|-------|------|------|
| 秘书处 | 协调型 | 计划拆解、排序、依赖梳理 |
| 组织部 | 执行型 | 文档规范化、术语治理 |
| 发改委 | 执行型 | 文本母本与内容层治理 |
| 工信部 | 执行型 | 代码内容层与 SOP 映射 |
| 外交部 | 执行型 | UI 交互与可用性 |
| 司法部 | 执行型 | 违宪审查与合规纠偏 |
| 检察院 | 审查型 | 三层合规审查与独立巡视 |
| 机关党委 | 监督型 | 全局宪章与架构监督 |
| 社科院 | 分析型 | 经验提炼与沉淀 |
| 档案馆 | 记录型 | 系统变更日志记录 |

> 完整使用指南见 [content/guides/AGENT_USAGE.md](./content/guides/AGENT_USAGE.md)，架构全貌见 [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 迭代路线图

| Phase | 状态 | 内容 |
|-------|------|------|
| Phase 1 — Static OS | ✅ 已完成 | GitHub Pages 纯静态部署 + 10 Agent 治理集群 |
| Phase 2 — Supabase Backend | 规划中 | 后端接入 + 用户认证 + 实时同步 |
| Phase 3 — Workflow Engine | 规划中 | Task 自动实例化 + 提醒推送 + 审计报告 |

> 完整路线图与待办清单见 [ROADMAP.md](./ROADMAP.md)

---

## 知识库导航

| 文档 | 说明 |
|------|------|
| [content/SOP/INDEX.md](./content/SOP/INDEX.md) | 全部 SOP 制度文件索引 |
| [content/guides/DOCUMENTATION_MAP.md](./content/guides/DOCUMENTATION_MAP.md) | 全局文档导航中心（按角色分层、权威性排序） |
| [content/guides/AGENT_USAGE.md](./content/guides/AGENT_USAGE.md) | Agent 使用指南与值班口令 |
| [content/references/README.md](./content/references/README.md) | 官方文件与会议记录目录（只读） |

---

## 开源协作

欢迎参与本项目的改进！以下是贡献方式：

### 报告问题

1. 在 GitHub Issues 中创建新 Issue
2. 标题格式：`[SOP]/[UI]/[Agent]/[Doc] 简要描述`
3. 包含：复现步骤、预期行为、实际行为

### 提交流程改进

1. 填写 [SOP优化提案反馈卡](./content/guides/SOP优化提案反馈卡.md)
2. 在 Issue 中附上反馈卡内容
3. 书记确认后，AI Agent 自动执行全局修复

### 提交代码

1. Fork 本仓库
2. 创建分支：`git checkout -b feature/your-feature`
3. **变更铁律**：所有修改必须沿 `SOP → workflow → service → state → UI` 管道流动，严禁跳步或逆向
4. 提交 PR，标题格式：`[Phase X] 简要描述`
5. PR 描述中必须包含 Change Trace 四要素：
   - `SSOT source`: 母本变更依据
   - `SOP impact`: SOP 变更情况
   - `Schema impact`: 数据结构变更
   - `Service impact`: 服务层变更

### 代码规范

- 原生 ESM，无构建工具，GitHub Pages 直接静态托管
- 所有数据变更必须经过 Service 层，UI 层禁止直接操作 `mockDB`
- 详细架构约束见 [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## License

本项目仅供光华管理学院本科生党支部内部使用。如需引用或改编，请联系仓库所有者。
