# Scenario: SOP Restructuring

> **Trigger phrases:** "restructure SOP", "modify workflow", "场景重构", "流程修改"  
> **SOP position:** Loaded at step 3. Read this file **before** modifying any `流程指南/` SOP document.  
> **Dual-Track Rule:** This file contains Agent constraints ONLY. All human-readable SOP content lives in `流程指南/`. DO NOT copy SOP narratives here.

---

## 🎯 Objective

Modify SOP text and workflow diagrams in `流程指南/` to correct 条条/块块 division of labor, without introducing redundant duty tables or violating Dual-Track Constraints.

---

## 📋 Pre-Execution Checklist

- [ ] Re-read `REVIEW_STATE.md` — confirm no conflicting in-progress task
- [ ] Identify the specific scenario(s) in `流程指南/常见工作场景快速指南.md` to be modified
- [ ] Note the Agent Watchlist items (W1–W4) and check if the target scenario touches them
- [ ] Confirm which 块块委员 (组织/宣传/纪检) are involved and whether their work manuals need updating

---

## ⚙️ Binding Constraints

| # | Constraint |
|---|-----------|
| C1 | **No standalone duty tables for 条条.** 条条 responsibilities must emerge entirely from the SOP flow steps. Never create a separate "条条分工表". |
| C2 | **块块 owners must be named explicitly** in every SOP step that requires 块块 support. Ambiguous ownership ("相关委员") is not acceptable. |
| C3 | **No redundancy.** If a procedure is already defined in a 块块 specialist guide (e.g., `纪检委员工作流程指南.md`), reference it — do not repeat it inline. |
| C4 | **Chinese only in human files.** All SOP text in `流程指南/` must be in Simplified Chinese. No English directives, no YAML logic blocks, no meta-comments. |
| C5 | **Watchlist W1–W4 must be checked** during every SOP restructuring session. If a conflict is found, log it in REVIEW_STATE before editing. |
| C6 | **Do not resolve suspended issues H1–H3.** If a suspended issue is encountered in the text, leave a ⚠️ marker and move on. |
| C7 | **Mermaid diagrams** must follow the existing color scheme: 蓝色=条条, 红色=块块, 绿色=起止. |
| C8 | **YAML frontmatter** in modified files: update `last_updated` field only. Do not change other YAML fields unless the scenario explicitly requires it. |

---

## 🔗 Reference Files (Data Plane)

> Read these files to understand current SOP structure. Do not embed their content here.

- `流程指南/常见工作场景快速指南.md` — primary SOP document
- `流程指南/工作流程图-定人定责定岗.md` — visual flow diagrams
- `流程指南/支委与党小组定人定责定岗说明.md` — duty framework reference
- `流程指南/组织委员工作流程指南.md` — 组织委员 specialist guide
- `流程指南/宣传委员工作流程指南.md` — 宣传委员 specialist guide
- `流程指南/纪检委员工作流程指南.md` — 纪检委员 specialist guide

---

## 🔄 Execution Steps

- [ ] **Step 1** — Load the target SOP scenario(s) from `常见工作场景快速指南.md`
- [ ] **Step 2** — Check W1–W4 watchlist items against the target scenario
- [ ] **Step 3** — Apply modifications with named 条条/块块 owners at every step
- [ ] **Step 4** — Update linked specialist guides (组织/宣传/纪检) if the scenario touches their responsibilities
- [ ] **Step 5** — Update Mermaid flow diagrams in `工作流程图-定人定责定岗.md`
- [ ] **Step 6** — Update `last_updated` in YAML frontmatter of all modified files
- [ ] **Step 7** — Update REVIEW_STATE: check off completed tasks; log any watchlist conflicts found

---

**Version:** 1.0  
**Owner:** 储子禾  
**Last updated:** 2026-02-21
