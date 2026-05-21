---
title: "角色三分类体系定义"
type: governance
role: "[人机]"
last_updated: "2026-05-02"
status: active
related_files:
  - ARCHITECTURE.md
  - .github/copilot-instructions.md
  - content/guides/governance/DOC_MAP.md
---

# 角色三分类体系定义

> 本文档定义 Org OS 仓库中所有文件的角色分类标准，确保人机协作边界清晰、权限可控。

---

## 一、角色定义

### [人] — 人类专属

| 维度 | 定义 |
|------|------|
| **标记** | `[人]` |
| **职责** | 人类独立阅读、决策、授权；AI 不可主动修改此类文件 |
| **权限边界** | AI 只读，任何修改须经人类显式授权（/ask） |
| **AI 读取规则** | AI 不主动加载，仅在被明确指向时读取 |
| **存储位置** | `content/references/`（官方底线层）、`assets/` |
| **典型场景** | 书记审阅党章原文、委员查阅会议记录、模板填写 |

### [人机] — 人类消费 + AI 上下文

| 维度 | 定义 |
|------|------|
| **标记** | `[人机]` |
| **职责** | 人类日常消费使用 + AI 自主读取作为工作上下文 |
| **权限边界** | AI 可读可引用，修改须 /ask 授权 |
| **AI 读取规则** | AI 按需检索，Layer 1/2 自动加载 |
| **存储位置** | `content/SOP/`、`content/guides/`、`content/insights/`、`docs/src/`、根目录核心文档 |
| **典型场景** | 委员查阅 SOP 流程、AI 读取架构说明、开发者查看代码 |

### [AI] — AI Agent 专用

| 维度 | 定义 |
|------|------|
| **标记** | `[AI]` |
| **职责** | AI Agent 专用指令、配置、运行时上下文 |
| **权限边界** | AI 可读写（受宪章约束），人类一般不直接编辑 |
| **AI 读取规则** | always-on（copilot-instructions.md）或 relevance-triggered |
| **存储位置** | `.github/`（宪章+Agent+Skill）、`.ctx/`（运行时上下文） |
| **典型场景** | Agent 执行日志记录、Skill 工作流触发、宪章规则校验 |

---

## 二、角色与仓库文件映射

### 根目录

| 文件 | 角色 | 理由 |
|------|------|------|
| README.md | [人] | 对外门面，人类第一接触点 |
| ARCHITECTURE.md | [人机] | 人类了解架构 + AI 读取上下文 |
| CLAUDE.md | [人机] | 人类规划 + AI 执行依据 |
| SSOT_INDEX.md | [AI] | 注册表，Agent 溯源依据 |
| index.html | [人机] | 人类使用界面 + AI 修改目标 |

### content/ 内容中心

| 子目录 | 角色 | 理由 |
|--------|------|------|
| content/SOP/ | [人机] | 制度母本，人类消费 + AI 溯源 |
| content/guides/ | [人机] | 操作指南，人类查阅 + AI 引用 |
| content/insights/ | [人机] | 经验沉淀，人类学习 + AI 蒸馏 |
| content/references/ | [人] | 官方底线，只读引用 |

### docs/src/ 代码层

| 文件 | 角色 | 理由 |
|------|------|------|
| docs/src/workflow/ | [人机] | SOP 规则引擎，开发者维护 + AI 映射 |
| docs/src/*.js | [人机] | 代码模块，开发者维护 + AI 修改 |
| docs/src/styles.css | [人机] | 样式，开发者维护 + AI 修改 |

### .github/ 治理层

| 子目录 | 角色 | 理由 |
|--------|------|------|
| copilot-instructions.md | [AI] | 宪章，Agent 行为约束 |
| agents/ | [AI] | Agent 配置，Agent 运行时 |
| skills/ | [AI] | Skill 定义，Agent 能力挂载 |

### .ctx/ 运行时

| 文件 | 角色 | 理由 |
|------|------|------|
| CONTEXT.md | [AI] | AI 快速同步入口 |
| SNAPSHOT.md | [AI] | 系统快照 |
| TIMESTAMPS.md | [人机] | 时间戳注册表，人类可查 + AI 维护 |
| logs/ | [人机] | 执行日志，人类可查 + AI 写入 |

### 其他

| 文件 | 角色 | 理由 |
|------|------|------|
| assets/ | [人] | 静态资源，只读 |
| .vscode/ | [工具] | 工作区配置，非内容文件 |
| .markdownlint* | [工具] | 代码风格，非内容文件 |

### 子目录继承规则

子目录默认继承父目录的角色标记，除非子目录内文件显式声明不同角色：

- 父目录 `content/references/` = [人] → 其下所有子目录（`合规文件/`、`工作模板/`、`历史会议材料/`）均继承 [人] 角色
- 父目录 `content/SOP/` = [人机] → 其下子目录（`功能委员SOP/`、`党小组长SOP/` 等）均继承 [人机] 角色
- **例外规则**: 若子目录中某文件显式在 Front Matter 中声明不同 `role`，则覆盖继承规则

---

## 三、协作方式

### 跨角色修改规则

| 修改方向 | 规则 | 示例 |
|---------|------|------|
| [人] → [人机] | 人类可自由修改，AI 须 /ask | 书记修改 SOP 流程 |
| [人] → [AI] | 禁止人类直接修改，须通过 Agent | 修改 Agent 配置须走机关党委 |
| [人机] → [AI] | AI 可读取引用，修改须 /ask | AI 引用 SOP 修改代码 |
| [AI] → [人机] | AI 修改后须通知人类 | Agent 更新代码后记录日志 |
| [AI] → [人] | 严格禁止 AI 修改 | AI 不可修改党章原文 |
| [AI] → [人]（引用渲染） | AI 可读取 [人] 文件内容用于界面渲染展示，但不可修改源文件 | 党务管理模块引用官方合规文件展示，原文不变 |

### 引用渲染机制

当系统功能模块（如党务管理独立模块）需要在界面上展示 [人] 角色文件的内容时：
- AI 可读取 `content/references/` 下的文件内容
- 将内容渲染到 HTML 界面的只读展示区
- 源文件保持不可变的 [人] 角色状态
- 渲染缓存与源文件保持同步（文件变更时自动更新展示）

此机制填补了 [AI] 不可访问 [人] 和"界面需要展示官方内容"之间的权限真空。

### 信息流向

```
[人] 决策/授权
  ↓
[人机] 执行/消费 ←→ [AI] 自动化/校验
  ↓
[AI] 记录/归档
```

---

## 四、存储与读取机制

### 存储分区

| 角色 | 存储目录 | 访问控制 |
|------|---------|---------|
| [人] | content/references/, assets/ | AI 只读，人类读写 |
| [人机] | content/SOP/, content/guides/, content/insights/, docs/src/, 根目录 | AI 读取+授权修改，人类读写 |
| [AI] | .github/, .ctx/ | AI 读写（受宪章），人类一般不编辑 |

### 读取优先级

1. **AI 新对话启动**: copilot-instructions.md → .ctx/CONTEXT.md
2. **SOP 变更任务**: content/SOP/ → docs/src/workflow/ → SSOT_INDEX.md
3. **代码修改任务**: .ctx/CONTEXT.md → ARCHITECTURE.md → docs/src/
4. **文档治理任务**: SSOT_INDEX.md → content/guides/governance/DOC_MAP.md

---

## 五、可扩展性评估

### 当前覆盖度

| 维度 | 覆盖率 | 说明 |
|------|--------|------|
| 文件角色标注 | 100% | 所有仓库文件均有 `role` 标记（R3 86/86） |
| 权限边界定义 | 100% | 三种角色的读写权限明确 |
| 协作方式定义 | 95% | 跨角色修改规则已定义，can-modify 白名单已实施 |
| 存储机制 | 100% | 存储分区与访问控制明确 |
| 读取机制 | 95% | 读取优先级已定义，动态角色判定已实施 |
| **SA1 动态角色** | ✅ **已完成** | `dynamic_role` front matter + copilot-instructions 判定逻辑 |
| **SA2 can-modify 白名单** | ✅ **已完成** | copilot-instructions 白名单 + state.js `canAIModify()` |

### 扩展方向

| 方向 | 描述 | 优先级 |
|------|------|--------|
| **[工具] 角色扩展** | 当前 .vscode/ 和 .markdownlint* 标记为 [工具]，未来可能需要更细粒度分类 | 低 |
| **动态角色切换** | 某些文件在不同上下文中角色不同（如 SNAPSHOT.md 在归档时为 [人机]，在运行时为 [AI]） | 中 |
| **角色标签自动化** | 在 copilot-instructions.md 中实现 AI 自动识别文件角色并调整行为 | 高 |
| **权限执行自动化** | 将角色权限规则编码为 Agent Skill，实现自动权限校验 | 高 |
| **跨仓库角色一致性** | 若项目拆分为多仓库，角色分类需跨仓库一致 | 低 |

### 迭代计划

| 版本 | 内容 | 预计时间 |
|------|------|---------|
| v1.0 | 本文档（角色定义 + 文件映射 + 协作规则） | 2026-05-02 |
| v1.1 | 角色标签全仓写入（R3） + 子目录继承规则 + 引用渲染机制 | 2026-05-02 |
| **v2.0** | **SA1 动态角色判定（dynamic_role front matter + copilot-instructions 逻辑） + SA2 can-modify 白名单** | **2026-05-02** |

---

## 六、可扩展性评估（R2 评估报告摘要）

> 完整评估见历史文档 ROLE_SCALABILITY_ASSESSMENT.md（已归档）

### 综合评分：8.6/10

| 维度 | 评分 | 说明 |
|------|------|------|
| 角色扩展性 | 9/10 | 新增角色类型仅需扩展 ROLE_TYPES 枚举 |
| 权限扩展性 | 8/10 | can-modify 白名单支持动态扩展 |
| 文件映射扩展性 | 9/10 | 子目录继承机制自动覆盖新文件 |
| 协作规则扩展性 | 8/10 | 跨角色修改规则清晰 |
| 存储机制扩展性 | 9/10 | 存储分区与访问控制明确 |
| 读取机制扩展性 | 8/10 | 动态角色判定已实施 |

### 已实施优化

| 编号 | 优化项 | 状态 |
|------|--------|------|
| SA1 | 动态角色判定（dynamic_role front matter） | ✅ 已实施 |
| SA2 | can-modify 白名单（copilot-instructions + state.js） | ✅ 已实施 |
| OA1 | EMOJI_POLICY [AI] 角色策略 | ✅ 已实施 |
| OA2 | CALENDAR_DESIGN/BRAND_ACTIVITY [人机] 标记 | ✅ 已实施 |

---

## 七、与现有文档的一致性

| 文档 | 一致性检查 | 结果 |
|------|-----------|------|
| ARCHITECTURE.md §四 分层架构 | Layer 0-7 角色标注与本文件一致 | ✅ |
| content/guides/governance/DOC_MAP.md | 权威性层级与角色分类对应 | ✅ |
| .github/copilot-instructions.md | 写盘权限 + can-modify 白名单 + 动态角色判定与本文件一致 | ✅ v2.0 |
| .ctx/CONTEXT.md §3 文件访问权限 | Route ID 权限表与本文件协作方式一致；新增 `dynamic_role` 字段 | ✅ v2.0 |
| CLAUDE.md §二 角色三分类 | 定义与本文件一致 | ✅ |
