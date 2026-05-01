---
name: yaml-slim
description: 安全精简 Markdown 前言区（frontmatter）——移除 last_updated 等冗余元数据字段，保留 version。适用场景：发布前的元数据规范化、批量清理。
---

# YAML 精简工作流

## 目标

标准化 Markdown 文件的前言区（YAML frontmatter），移除冗余元数据，保留版本可追溯性。

## 输入项

- **目标文件/目录**
- **模式**：只读核查或写盘
- **单文件或批量**
- **保留字段白名单**（可选，默认仅保留 `version`）

## Gotchas

- **`version` 字段是唯一强制保留的字段**——即使白名单为空也不能删除。
- Frontmatter 结束标记 `---` 前后不能有空格或多余字符——否则 YAML 解析器会将其视为正文的一部分。
- 如果 frontmatter 中不存在任何待删除字段，不要输出"已清理"，应输出"无需清理"并列出当前字段清单。

## 执行流程

1. 预检——定位目标文件的前言区
2. 若只读模式 → 产出核查报告
3. 若写盘模式 → 输出 `### Blueprint` → 工具调用获取授权
4. 执行——删除 last_updated（若存在），保留 version，保持 YAML 语法有效
5. 完成校验——前言区可解析、version 未变、正文未动

## 输出模板

```markdown
### 核查报告（只读）
- 扫描文件总数: ...
- 含 frontmatter 文件: ...
- 含 last_updated 文件: ...
- 当前字段清单: ...

### Blueprint（写盘）
- 目标: ...
- 编辑策略: 删除 last_updated，保留 version
- 风险: ...
- 回滚点: ...
```
