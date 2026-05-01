# Org OS Agent 操作指南

> 10 Agent 治理集群使用手册 | last_updated: 2026-05-01 | 类型: [人机]

---

## 一、Agent 注册表

| Agent | 类型 | 职责 | 工具 | Handoffs | 关联 Skill |
|-------|------|------|------|----------|-----------|
| 秘书处 | 协调型 | 计划拆解、排序、依赖梳理 | read, search | ✅ 可委派 | — |
| 组织部 | 执行型 | 文档规范化、术语治理 | read, agent, edit, search | ✅ →档案馆 | term-cleaner, anchor-fixer |
| 发改委 | 执行型 | 文本母本与内容层治理 | read, agent, edit, search | ✅ →档案馆 | sop-sync, yaml-slim |
| 工信部 | 执行型 | 代码内容层与 SOP 映射 | read, agent, edit, search | ✅ →档案馆 | sop2code, data-inspector |
| 外交部 | 执行型 | UI 交互与可用性 | read, agent, edit, search | ✅ →档案馆 | ui-verifier |
| 司法部 | 执行型 | 违宪审查与合规纠偏 | read, agent, edit, search | ✅ →档案馆 | audit-report |
| 检察院 | 审查型 | 三层合规审查与独立巡视 | read, search | ❌ 纯只读 | audit-report, data-inspector, ui-verifier |
| 机关党委 | 监督型 | 全局宪章与架构监督 | read, agent, edit, search | ❌ | — |
| 社科院 | 分析型 | 经验提炼与沉淀 | read, edit, search | ❌ | experience-distiller |
| 档案馆 | 记录型 | 系统变更日志记录 | read, edit, search | ❌ | log-recorder |

---

## 二、任务域 → Agent 委派链路

| 任务域 | 触发关键词 | Agent 链路 |
|--------|-----------|-----------|
| 活动建设 | 主题党日、三会一课、民主评议、换届、发展党员 | 秘书处 → 发改委 → 工信部 → 外交部 → 档案馆 |
| 组织建设 | 制度修订、职责分工、意见反馈、合规审查、文档规范 | 秘书处 → 组织部 → 司法部 → 检察院 → 档案馆 |
| 架构治理 | 宪章修改、Agent配置、Skill注册、权限变更 | 机关党委 → 秘书处 → 档案馆 |
| 经验提炼 | 经验沉淀、日志分析、复盘总结 | 社科院 → 档案馆 |

**优先级**: 架构治理 > 组织建设 > 活动建设 > 经验提炼

---

## 三、治理闭环标准流程

1. **规划**: 秘书处输出 Blueprint 与执行顺序
2. **执行**: 执行部门（组织部/发改委/工信部/外交部/司法部）按蓝图完成修改
3. **验证**: 检察院只读核验数据与交互闭环
4. **审计**: 检察院给出分级表与风险清单
5. **记录**: 档案馆按月 append-only 建档
6. **沉淀**: 社科院提炼经验，确认后回写

---

## 四、调用方式

### VS Code 中使用 Agent

在 VS Code Chat 中输入 `@Agent名称` 即可切换到对应 Agent。例如：

- `@秘书处 帮我梳理清理数字序号的计划`
- `@组织部 按计划执行术语清洗`

### Handoff 委派

Agent 完成工作后，通过 handoff 按钮将上下文交接给下一个 Agent。按钮在 Agent 回复末尾自动出现。

### 子代理权限

执行部门 Agent 仅可调用档案馆作为子代理（`agents: ['档案馆']`），禁止跨部门调用。

---

## 五、授权机制

| 层级 | 机制 | 触发方式 |
|------|------|---------|
| 层 1 | VS Code Allow/Cancel 原生弹窗 | edit/agent 工具调用自动触发 |
| 层 2 | Blueprint + /ask 显式授权 | Agent 写盘前输出 Blueprint，用户确认 |
| 层 3 | Handoff 按钮委派选择 | 用户点击按钮选择下一环节 |

---

## 六、值班口令示例

| 场景 | 口令 |
|------|------|
| SOP 数据变更核验 | `@检察院 对本次 SOP 数据变更执行只读核验并出报告` |
| 全局扫描 | `@检察院 扫描当前工作区并输出 S/A/B/C 重要性分级表` |
| 经验提炼 | `@社科院 扫描 [经验蒸馏: 否] 日志并先给我提炼矩阵，待我确认后再回写` |
| 文档规范 | `@组织部 对 content/SOP/ 执行术语标准化` |
| 代码映射 | `@工信部 同步 SOP 变更到 src/workflow/sopData.js` |
| UI 验证 | `@外交部 验证 index.html 交互是否与 SOP 流程一致` |
| 合规审查 | `@司法部 审查本次变更是否违反宪章` |
| 架构审定 | `@机关党委 审定本次架构变更提案` |
