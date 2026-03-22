**Purpose**: 管理所有 SOP 制度文本的新增、修改、重构与元数据修复操作。包含活动规则强制执行（A/B 类活动）、SOP 结构重组、域代码与 SOP 的双向追溯同步、以及 YAML frontmatter 注入与修复等全部子场景。

> **[2026-03 架构升级注记]**：SOP 模板数据已从 `src/main.js` 中物理分离至专用模块 `src/sopData.js`。
> - **`src/sopData.js`**：存放所有场景的 SOP 任务节点原始模板数据（`scenarioId → tasks[]`，每条任务含 `title`/`offset`/`executor`/`supervisor` 等字段）。
> - **`src/sop.js`**：`instantiateSOP(scenarioIds, t0DateStr)` 函数，读取 `sopData.js` 的模板，将 `offset` 天数加上 `t0`（活动日）后，输出含绝对日期字符串的任务实例数组。
> - **双向追溯规则**：修改 SOP 制度文本时，若涉及任务节点定义，必须同步检查并更新 `src/sopData.js` 对应场景的任务数组，保持"制度文本 ↔ 数据模板"的双向一致。

**Trigger**: 流程、制度、职责、负责人、时间节点、规则、SOP、活动、组织生活会、党小组、A/B 类、场景重构、YAML、frontmatter、元数据、schema、domain、制度同步、sopData、sop.js、instantiateSOP

**Allowed Files**: `knowledge/SOP/*`, `流程指南/*`, `src/sopData.js`, `src/sop.js`

---

## §1 Activity Rules Enforcement（A/B 类活动规则）

> 来源：`activity_rules_enforcement.md` v1.2 — merged into sop_sync.md

### A-class 活动（组织生活会）约束

| 规则 | 内容 |
|------|------|
| 参与者 | 党员 + 预备党员 ONLY |
| 考勤 | 刚性（三会一课） |
| 复盘 | 不要求 |
| 宣传 | 必须（摘要+配图，纳入月推送） |
| 档案归档 | 必须 |

### B-class 活动（党小组主题党日活动）约束

| 规则 | 内容 |
|------|------|
| 参与者 | 全体支部成员（党员+预备党员+发展对象+积极分子） |
| 考勤 | 弹性考勤 |
| 复盘 | 必须，1 周内完成；可由积极分子在党小组组长指导下完成 |
| 宣传 | 必须（活动摘要+配图，纳入月推送） |
| 宣传预热 | 两类均不要求 |

### Binding Constraints（活动规则）

| # | Constraint |
|---|-----------|
| C-A1 | 每项活动必须通过党小组组长审批后方可开始准备（A 类：支委会部署隐含审批；B 类：Step 2 显式节点） |
| C-A2 | 原则"除了发展党员、转正、换届等需要严肃投票的事项，其他都可以往党小组压"必须保留 |
| C-A3 | 不得在行文中定义"深度参与者"/"组织者"——首次提及时引用 `流程指南/纪检委员工作流程指南.md` |
| C-A4 | 悬置问题 H1（跨组参与考察协同）禁止解决——在文本中标记 ⚠️ 悬置 |
| C-A5 | Mermaid 图表颜色：蓝色=块块, 红色=条条, 绿色=起止节点 |
| C-A6 | 必须动态检查 `REVIEW_STATE.md` 中 `[Global]` 及 `[Scenario-1 Only]` Watchlist 项，发现冲突先记录至 REVIEW_STATE |

---

## §2 SOP Structure Constraints（结构重组约束）

> 来源：`sop_restructuring.md` v1.1 — merged into sop_sync.md

| # | Constraint |
|---|-----------|
| C-S1 | **禁止为块块单独建立分工表**；块块职责必须从 SOP 流程步骤中自然呈现 |
| C-S2 | **条条委员须具名**：每个需要条条支持的 SOP 步骤必须明确写出负责委员姓名，"相关委员"不可接受 |
| C-S3 | **禁止冗余**：条条专属工作手册中已定义的流程，引用即可，不得行内重复 |
| C-S4 | **`流程指南/` 文件全部使用简体中文**；禁止写入英文指令、YAML 逻辑块、元注释 |
| C-S5 | 动态检查 `REVIEW_STATE.md` 中 `[Global]` 及当前场景匹配 `[Scenario-X Only]` 项；冲突先记录再编辑 |
| C-S6 | **禁止修改** `REVIEW_STATE.md` 中标记 `[Global]` 的 Suspended Issues H 项；遇悬置内容留 ⚠️ 标记并跳过 |
| C-S7 | YAML frontmatter 中仅更新 `last_updated` 字段，除非场景明确要求 |

---

## §3 SOP ↔ Code 双向追溯（domain.js 同步）

> 来源：`sop_data_sync.md` v1.0 — merged into sop_sync.md

| # | Constraint |
|---|-----------|
| C-D1 | `Activity` / `Task` typedef 中每个具有业务语义的字段 MUST 有 `Source: knowledge/SOP/[file].md#[section]` 注释 |
| C-D2 | 注释格式：`Source: knowledge/SOP/[filename].md#[section name]`——不含版本号或行号 |
| C-D3 | SOP 章节重命名时，`domain.js` 的 `Source:` 指针必须同步更新（同一 commit） |
| C-D4 | SOP 章节删除时，对应字段的 `Source:` 必须移除或重定向——孤悬指针视为 [FAILED] |
| C-D5 | 新 Schema 字段不得无 SOP 锚点添加；若 SOP 章节不存在，必须先提出 SOP 新增方案 |

### 级联验证步骤（SOP_SYNC 激活时必须执行）

1. **Update SOP**：更新 `knowledge/SOP/` Markdown 制度文本
2. **Update `domain.js` annotation**：检查并同步 `Source:` 追溯指针
3. 出现断链 Dead Link → 任务标记 [FAILED]，停止并报告

---

## §4 YAML Frontmatter 修复规范

> 来源：`yaml_metadata_fix.md` v1.0 — merged into sop_sync.md

### 必须字段（全部必须存在）

`title` · `type` · `audience` · `owner` · `last_updated` · `version` · `status` · `related_files`

### 字段规范

| 字段 | 规范 |
|------|------|
| `owner` | 始终为 `"储子禾"` |
| `version` | 新文件 `"1.0"`；更新时递增次版本号 |
| `status` | `active`（废弃文件用 `deprecated`） |
| `type` 词汇表 | `index` / `guide` / `reference` / `review` / `SOP` / `template` / `flowchart` |
| `related_files` | 仓库根相对路径（如 `"流程指南/常见工作场景快速指南.md"`）；须建立从上到下的依赖图 |

### YAML Binding Constraints

| # | Constraint |
|---|-----------|
| C-Y1 | frontmatter 块是控制平面与数据平面之间**唯一**的耦合锚点，不得在人类文件中注入其他元内容 |
| C-Y2 | YAML-only 修复会话期间不修改文件正文，除非发现明显错误且已在 REVIEW_STATE 中记录 |
| C-Y3 | 所有 `related_files` 路径须验证文件存在 |
| C-Y4 | 黄金标准 Schema 示例见 `流程指南/常见工作场景快速指南.md` 头部，不在此处复制 |

---

## Pre-Execution Checklist（通用）

- [ ] 重读 `REVIEW_STATE.md`——确认无冲突进行中任务
- [ ] 确认目标场景所属子类（活动规则/结构重组/Schema 同步/YAML 修复）
- [ ] 检查适用 Watchlist 项（Global + 场景匹配）
- [ ] 输出三要素声明：Detected Scenario / Allowed Scope / Modification Plan
- [ ] 执行变更后更新执行日志 `.vibe_context/logs/YYYY-MM-EXECUTION_LOG.md`
