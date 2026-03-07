# AI Context Registry — Scenario System

## Core Scenario Registry（核心场景注册表）

核心场景数量固定为 **4 个**。未来如需新增扩展场景（如 `data_migration`、`security_patch`），必须在本文件登记，并严格遵循 Purpose/Trigger/Allowed Files 的描述规范。

| 场景文件 | Purpose | Trigger（关键词摘要） | Allowed Files |
|---------|---------|---------------------|--------------|
| `scenarios/ui_scenario.md` | 界面呈现变更（UI 层终点） | UI、页面、按钮、布局、样式 | `index.html`, `assets/*` |
| `scenarios/core_logic.md` | 领域模型/Schema/Service/状态机变更 | 字段、schema、activity、task、数据结构、API | `src/*` |
| `scenarios/sop_sync.md` | SOP 制度文本新增/修改/重构/YAML 修复/domain 同步 | 流程、制度、职责、SOP、YAML、frontmatter | `knowledge/SOP/*`, `流程指南/*`, `src/domain.js` |
| `scenarios/meta_audit.md` | AI 治理元数据：日志、快照、审计、场景注册 | AI规则、审计、日志、EXECUTION_LOG | `.vibe_context/*` |

## 优先级（冲突时从左执行）

```
META_AUDIT → SOP_SYNC → CORE_LOGIC → UI_SCENARIO
```

## 扩展场景注册区（Extension Scenarios）

> 尚未注册任何扩展场景。如需新增，在此处追加行，并在 `scenarios/` 目录下创建对应文件。

| 场景文件 | Purpose | Trigger | Allowed Files | 登记日期 |
|---------|---------|---------|--------------|---------|
| （暂无） | | | | |

## 注册规范（Registration Protocol）

新增扩展场景必须满足：
1. **Purpose**：清晰描述本场景的唯一职责，不与现有 4 个核心场景重叠
2. **Trigger**：列出激活本场景的用户意图关键词（中英文均可）
3. **Allowed Files**：精确的文件白名单路径（通配符须说明范围）
4. 在本文件追加登记行后，在 `.vibe_context/scenarios/` 下创建同名 `.md` 文件
5. 在 `.vibe_context/logs/YYYY-MM-EXECUTION_LOG.md` 中记录注册操作审计日志
