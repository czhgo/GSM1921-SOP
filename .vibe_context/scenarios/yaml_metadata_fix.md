# Scenario: YAML Metadata Fix

> **Trigger phrases:** "fix frontmatter", "inject YAML", "元数据修复", "YAML frontmatter"  
> **SOP position:** Loaded at step 3. Read this file **before** injecting or correcting YAML frontmatter.  
> **Dual-Track Rule:** This file contains Agent constraints ONLY. YAML frontmatter is the sole coupling anchor between the Control Plane and the Data Plane.

---

## 🎯 Objective

Inject or correct YAML frontmatter blocks in Markdown documents to establish and maintain the repository's context graph, while keeping human-readable content strictly in Simplified Chinese.

---

## 📋 Pre-Execution Checklist

- [ ] Re-read `REVIEW_STATE.md` — confirm no conflicting in-progress task
- [ ] Load the gold-standard schema from `流程指南/常见工作场景快速指南.md` (top of file)
- [ ] List all target files that are missing or have incorrect frontmatter
- [ ] Verify target file paths exist before editing

---

## ⚙️ Binding Constraints

| # | Constraint |
|---|-----------|
| C1 | **Schema compliance:** Every frontmatter block MUST include: `title`, `type`, `audience`, `owner`, `last_updated`, `version`, `status`, `related_files` |
| C2 | **Owner:** Always `"储子禾"` |
| C3 | **Version:** `"1.0"` for new files; increment minor version for updates |
| C4 | **Status:** `active` unless the document is deprecated |
| C5 | **`related_files` must establish a top-down dependency graph.** Root files (README.md) link to directories; directories link to specific guides; guides link to templates. |
| C6 | **Paths in `related_files` are repo-root-relative** (e.g., `"流程指南/常见工作场景快速指南.md"`) |
| C7 | **The frontmatter block is the ONLY coupling anchor.** Do not inject any other meta-content into human files. |
| C8 | **Do not modify file body content** during a YAML-only fix session, unless an obvious error (e.g., broken link) is discovered and logged in REVIEW_STATE first. |
| C9 | **`type` vocabulary:** use `index`, `guide`, `reference`, `review`, `SOP`, `template`, or `flowchart` |

---

## 🔗 Gold-Standard Schema (Control Plane Reference Only)

> The actual schema example lives in `流程指南/常见工作场景快速指南.md`. Do not copy it here.  
> Field definitions for quick reference:

| Field | Description | Example |
|-------|-------------|---------|
| `title` | Full document title in Chinese | `"常见工作场景快速指南"` |
| `type` | Document role | `SOP` / `index` / `guide` / `reference` |
| `audience` | List of target readers | `["所有支委", "党小组组长"]` |
| `owner` | Document owner | `"储子禾"` |
| `last_updated` | ISO date of last change | `"2026-02-21"` |
| `version` | Semantic version string | `"1.0"` |
| `status` | Lifecycle status | `active` |
| `related_files` | Repo-root-relative dependency list | `["流程指南/README.md"]` |

---

## 🔄 Execution Steps

- [ ] **Step 1** — Identify all target files (missing or incorrect frontmatter)
- [ ] **Step 2** — Load schema from `流程指南/常见工作场景快速指南.md`
- [ ] **Step 3** — For each target file: analyze content to infer correct `type`, `audience`, and `related_files`
- [ ] **Step 4** — Prepend (or replace) YAML block; do not modify file body
- [ ] **Step 5** — Verify all `related_files` paths resolve to existing files
- [ ] **Step 6** — Update REVIEW_STATE: mark task as done; log files modified

---

**Version:** 1.0  
**Owner:** 储子禾  
**Last updated:** 2026-02-21
