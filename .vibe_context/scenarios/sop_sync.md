**Purpose**: Manages all SOP institutional text operations — including creation, modification, restructuring, and metadata repair. Covers sub-scenarios: Activity Rules Enforcement (Class A/B activities), SOP structural reorganization, bidirectional traceability sync between domain code and SOP, and YAML frontmatter injection/repair.

> **[2026-03 Architecture Upgrade Note]**: SOP template data has been physically separated from `src/main.js` and further encapsulated into the dedicated subdirectory `src/workflow/`, exported uniformly via the `src/workflow/index.js` barrel file.
> - **`src/workflow/sopData.js`**: Stores raw SOP task node template data for all scenarios (`scenarioId → tasks[]`; each task contains `title`/`offset`/`executor`/`supervisor` fields).
> - **`src/workflow/sop.js`**: The `instantiateSOP(scenarioIds, t0DateStr)` function reads templates from `sopData.js`, adds `offset` days to `t0` (activity date), and outputs a task instance array with absolute date strings.
> - **`src/workflow/index.js`**: Barrel export file — exposes `instantiateSOP` and `sopDatabase`; both `src/main.js` and `src/events.js` import via `import { ... } from './workflow/index.js'`.
> - **Bidirectional Traceability Rule**: When modifying SOP institutional text, if task node definitions are involved, the corresponding scenario's task array in `src/workflow/sopData.js` MUST be checked and updated synchronously to maintain bidirectional consistency between "institutional text ↔ data template".

**Trigger**: workflow, institution, responsibility, owner, time node, rule, SOP, activity, organizational life meeting, party group, Class A/B, scenario refactor, YAML, frontmatter, metadata, schema, domain, institutional sync, sopData, sop.js, instantiateSOP

**Allowed Files**: `knowledge/SOP/*`, `流程指南/*`, `src/workflow/sopData.js`, `src/workflow/sop.js`, `src/workflow/index.js`

---

## §1 Activity Rules Enforcement (Class A/B Activities)

> Source: `activity_rules_enforcement.md` v1.2 — merged into sop_sync.md

### A-class Activity (Organizational Life Meeting) Constraints

| Rule | Content |
|------|------|
| Participants | Full party members + Probationary members ONLY |
| Attendance | Rigid (三会一课) |
| Debrief | Not required |
| Publicity | REQUIRED (summary + photo, included in monthly release) |
| Archive | REQUIRED |

### B-class Activity (Party Group Themed Party Day) Constraints

| Rule | Content |
|------|------|
| Participants | All branch members (members + probationary + development targets + activists) |
| Attendance | Flexible |
| Debrief | REQUIRED, within 1 week; may be completed by activists under guidance of the group leader |
| Publicity | REQUIRED (activity summary + photo, included in monthly release) |
| Pre-publicity | Not required for either class |

### Binding Constraints (Activity Rules)

| # | Constraint |
|---|-----------|
| C-A1 | Every activity MUST be approved by the party group leader before preparation begins (Class A: committee deployment implies approval; Class B: explicit Step 2 node) |
| C-A2 | The principle "except for matters requiring a formal vote such as member development, probationary conversion, and leadership re-election, everything else can be delegated to the party group" MUST be retained |
| C-A3 | Defining "deep participants" / "organizers" inline is PROHIBITED — on first mention, reference `流程指南/纪检委员工作流程指南.md` |
| C-A4 | Suspended issue H1 (cross-group participation coordination) SHALL NOT be resolved — mark ⚠️ suspended in the text |
| C-A5 | Mermaid diagram colors: blue = 块块, red = 条条, green = start/end nodes |
| C-A6 | Dynamically check `REVIEW_STATE.md` for `[Global]` and `[Scenario-1 Only]` Watchlist items; record conflicts in REVIEW_STATE before editing |

---

## §2 SOP Structure Constraints

> Source: `sop_restructuring.md` v1.1 — merged into sop_sync.md

| # | Constraint |
|---|-----------|
| C-S1 | **Strictly PROHIBITED: creating a separate responsibility matrix for 块块**; 块块 responsibilities MUST emerge naturally from the SOP workflow steps |
| C-S2 | **Commissioner names SHALL be explicit**: every SOP step requiring 条条 support MUST name the responsible commissioner; "relevant commissioner" is NOT acceptable |
| C-S3 | **No Redundancy**: workflows already defined in a commissioner's dedicated workbook SHALL be referenced only, not duplicated inline |
| C-S4 | **`流程指南/` files SHALL use Simplified Chinese exclusively**; injecting English directives, YAML logic blocks, or meta-comments is PROHIBITED |
| C-S5 | Dynamically check `REVIEW_STATE.md` for `[Global]` and currently matched `[Scenario-X Only]` items; record conflicts before editing |
| C-S6 | **PROHIBITED: modifying** Suspended Issues H items marked `[Global]` in `REVIEW_STATE.md`; leave ⚠️ markers and skip |
| C-S7 | In YAML frontmatter, update only the `last_updated` field unless the scenario explicitly requires otherwise |

---

## §3 SOP ↔ Code Bidirectional Traceability (domain.js Sync)

> Source: `sop_data_sync.md` v1.0 — merged into sop_sync.md

| # | Constraint |
|---|-----------|
| C-D1 | Every field with business semantics in the `Activity` / `Task` typedef MUST have a `Source: knowledge/SOP/[file].md#[section]` annotation |
| C-D2 | Annotation format: `Source: knowledge/SOP/[filename].md#[section name]` — no version numbers or line numbers |
| C-D3 | When an SOP section is renamed, the `Source:` pointer in `domain.js` MUST be updated in the same commit |
| C-D4 | When an SOP section is deleted, the corresponding field's `Source:` MUST be removed or redirected; orphaned pointers are treated as [FAILED] |
| C-D5 | New Schema fields SHALL NOT be added without an SOP anchor; if the SOP section does not exist, a proposal to add it MUST be submitted first |

### Cascade Verification Steps (MUST execute when SOP_SYNC is active)

1. **Update SOP**: Update `knowledge/SOP/` Markdown institutional text
2. **Update `domain.js` annotation**: Check and sync `Source:` traceability pointers
3. Dead Link detected → mark task as [FAILED], stop and report

---

## §4 YAML Frontmatter Repair Specification

> Source: `yaml_metadata_fix.md` v1.0 — merged into sop_sync.md

### Required Fields (all must be present)

`title` · `type` · `audience` · `owner` · `last_updated` · `version` · `status` · `related_files`

### Field Specification

| Field | Specification |
|------|------|
| `owner` | Always `"储子禾"` |
| `version` | New file: `"1.0"`; increment minor version on update |
| `status` | `active` (use `deprecated` for obsolete files) |
| `type` vocabulary | `index` / `guide` / `reference` / `review` / `SOP` / `template` / `flowchart` |
| `related_files` | Repository root-relative path (e.g., `"流程指南/常见工作场景快速指南.md"`); SHALL establish a top-down dependency graph |

### YAML Binding Constraints

| # | Constraint |
|---|-----------|
| C-Y1 | The frontmatter block is the **sole** coupling anchor between the control plane and data plane; injecting other meta-content into human files is PROHIBITED |
| C-Y2 | During YAML-only repair sessions, file body SHALL NOT be modified unless an obvious error is found and recorded in `REVIEW_STATE` |
| C-Y3 | All `related_files` paths MUST be verified to exist |
| C-Y4 | The gold-standard Schema example is in the header of `流程指南/常见工作场景快速指南.md`; do not duplicate it here |

---

## Pre-Execution Checklist

- [ ] Re-read `REVIEW_STATE.md` — confirm no conflicting tasks are in progress
- [ ] Confirm the target scenario's sub-category (Activity Rules / Structural Reorganization / Schema Sync / YAML Repair)
- [ ] Check applicable Watchlist items (Global + scenario-matched)
- [ ] Output the three-element declaration: Detected Scenario / Allowed Scope / Modification Plan
- [ ] After executing changes, update the execution log `.vibe_context/logs/YYYY-MM-EXECUTION_LOG.md`
