# Scenario: UI Update

> **Trigger phrases:** "update UI", "redesign page", "change layout", "update presentation"  
> **SOP position:** Loaded at step 3. Read this file **before** making any UI or document-presentation change.

---

## 🎯 Objective

Update the visual presentation, layout, or user-facing content of documents or frontend components while keeping the underlying logic and data structures intact.

---

## 📋 Pre-Execution Checklist

- [ ] Re-read `REVIEW_STATE.md` and confirm no conflicting in-progress task
- [ ] Identify all files whose rendered output will change
- [ ] Screenshot (or describe) the current state for comparison
- [ ] Confirm style guide / formatting rules that must be preserved

---

## ⚙️ Constraints

| # | Constraint |
|---|-----------|
| C1 | Do **not** modify business logic, data schemas, or workflow rules during a UI-only update |
| C2 | Maintain all existing anchor links (`#headings`) to avoid broken cross-references |
| C3 | Keep language (Chinese / English) consistent with the surrounding file |
| C4 | Preserve YAML frontmatter; only update `last_updated` field if content changes |
| C5 | Tables and task lists must remain parseable by standard Markdown renderers |

---

## 🔄 Execution Steps

- [ ] **Step 1 — Scope:** List every file whose rendered output will change
- [ ] **Step 2 — Implement:** Apply the presentation changes file by file
- [ ] **Step 3 — Verify links:** Check all internal `[text](path)` links still resolve
- [ ] **Step 4 — Verify anchors:** Check all `#heading` anchors still exist
- [ ] **Step 5 — Validate:** Render preview (if tooling available); confirm visual intent
- [ ] **Step 6 — Update REVIEW_STATE:** Check off completed tasks, log any issues found

---

## 📝 Notes / Context

> _(Populate before starting. Example: "Consolidate the two navigation tables in README.md into one.")_

---

**Version:** 1.0  
**Owner:** 储子禾  
**Last updated:** 2026-02-21
