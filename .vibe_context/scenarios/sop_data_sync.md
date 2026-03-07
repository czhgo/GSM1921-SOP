# Scenario: SOP Data Sync

> **Trigger phrases:** "sync SOP", "update domain", "制度同步", "sop_data_sync"
> **SOP position:** Loaded when modifying `knowledge/SOP/` Markdown files or `src/domain.js` schema.
> **Dual-Track Rule:** This file contains Agent constraints ONLY. All human-readable SOP content lives in `knowledge/SOP/`. DO NOT copy narrative content here.

---

## 🎯 Objective

Keep `knowledge/SOP/` Markdown files and `src/domain.js` JSDoc annotations in sync. Whenever a SOP document is modified, the corresponding `Source:` pointers in `domain.js` must be verified and updated. Whenever a schema field is added, it must be anchored to a real SOP section.

---

## 📋 Pre-Execution Checklist

- [ ] Re-read `REVIEW_STATE.md` — confirm no conflicting in-progress task
- [ ] Identify which `knowledge/SOP/*.md` files are changing
- [ ] Load current `src/domain.js` JSDoc to review all `Source:` annotations
- [ ] Verify every referenced heading still exists in the target SOP file

---

## ⚙️ Binding Constraints

| # | Constraint |
|---|-----------|
| C1 | Every field in `Activity` and `Task` typedefs that carries business semantics MUST have a `Source:` annotation pointing to an existing `knowledge/SOP/*.md` heading |
| C2 | Annotation format: `Source: knowledge/SOP/[filename].md#[section name]` — no version numbers, no line numbers |
| C3 | If a SOP chapter is renamed, the `Source:` pointer in `domain.js` must be updated in the same commit |
| C4 | If a SOP chapter is deleted, the corresponding field's `Source:` annotation must be removed or redirected — orphaned pointers are treated as [FAILED] |
| C5 | New schema fields may not be added without a matching SOP anchor; propose the SOP section first if it does not exist |

---

## 🔗 Reference Files (Data Plane)

> Read these files to understand current content. Modify them as required. Do not embed their content here.

- `src/domain.js` — schema source of truth; all `Source:` annotations live here
- `knowledge/SOP/常见工作场景快速指南.md` — activity lifecycle, supervision mechanism
- `knowledge/SOP/支委与党小组定人定责定岗说明.md` — org structure, visibility scope
- `knowledge/SOP/组织委员工作流程指南.md` — execution roles, task workflow

---

## 🔗 SOP Traceability Mechanism (制度与代码双向追溯)

如果本路由被激活，且人类修改了 `knowledge/SOP/` 中的任何制度文本，AI 必须自动执行以下级联验证：

1. **Update SOP** (更新 Markdown 制度文本).
2. **Update `domain.js` annotation** (检查并同步更新 JSDoc 中的 Source 追溯指针).

如果 SOP 删除了某个业务规则或章节，必须同步移除或更新 `domain.js` 中对应的 Source 字段与逻辑。出现"断链 (Dead Link)"的 Schema 将导致任务被标记为 [FAILED]。

---

**Version:** 1.0
**Owner:** 侯嘉嵘
**Last updated:** 2026-03-07
