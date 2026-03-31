**Purpose**: Manages all AI governance metadata operations, including execution log writing, scenario registry maintenance, snapshot generation, and audit compliance checks. All other scenarios MUST call back to this scenario upon completion to finalize log settlement.

> **[2026-03 Snapshot Freeze Note + 2026-03-22 Governance Reduction Update]**: The system completed full ES6 modular refactoring (Parts 1–3) and documentation-layer sync (Phase 1/2–2/2) on 2026-03-21, entering the v1.0 stable phase. The snapshot index file `SNAPSHOT_INDEX.md` was physically deleted on 2026-03-22 (governance reduction), replaced by a **self-explanatory filename** management mechanism. All snapshot freeze operations MUST follow these rules:
> 1. **Single Active Snapshot Principle**: At any given time, `.vibe_context/` SHALL retain only one active snapshot file (format: `SNAPSHOT_v<major>.<minor>_<YYYYMMDD>.md`).
> 2. **Obsolete Snapshot Deletion Authorization**: Old snapshots MAY be physically deleted only upon explicit secretary authorization; without authorization, only mark `status: deprecated` in the file's frontmatter.
> 3. **New Snapshot Naming**: Format is `SNAPSHOT_v<major>.<minor>_<YYYYMMDD>.md` (milestone node). `SNAPSHOT_INDEX.md` need not be maintained; the index is served by filenames and the current month's execution log.
> 4. **Required Snapshot Fields**: Modular structure inventory, data-flow rules, permission & view boundaries, global terminology lock declaration, global physical topology tree (Depth 4), LLM Context Alignment protocol.
> 5. **Log Audit**: Snapshot freeze operations MUST append an audit record at the end of `.vibe_context/logs/YYYY-MM-EXECUTION_LOG.md`.

**Trigger**: AI rules, audit, protocol, log, EXECUTION_LOG, snapshot, scenario registry, governance, meta, vibe_context

**Allowed Files**: `.vibe_context/*`

---

## §1 Execution Logging Rule

> Source: `meta_audit_log.md` — merged into meta_audit.md

**All modifications MUST leave a permanent physical record in the `.vibe_context/logs/` directory.**

### Mandatory Log Fields

Every log entry MUST include:

| Field | Description |
|------|------|
| `Scenario` | Detected scenario identifier |
| `Files Modified` | List of modified file paths |
| `SOP Reference` | `knowledge/SOP/[file].md#[section]` or `N/A` |
| `Schema Impact` | Affected fields, or `N/A` |
| `Summary` | One-sentence change description |
| `Timestamp` | ISO 8601 datetime |

**Non-compliance equals TASK FAILURE**: Any Session without a written execution log entry is considered incomplete.

### Log Rotation Rules

- Log file path: `.vibe_context/logs/YYYY-MM-EXECUTION_LOG.md` (one file per calendar month)
- At the start of a new month, the AI MUST check whether the current month's log file exists; if not, it MUST be created from the standard template before appending
- The index file `.vibe_context/logs/EXECUTION_LOG_INDEX.md` MUST be updated to reference the new monthly file

---

## §2 Delete + Log Rule

Whenever a file is deleted, BOTH of the following conditions MUST be simultaneously satisfied:

1. **Zero Information Loss**: Deleted information has been merged into a new file, or its core rule summary has been completely recorded in the log
2. **Mandatory Audit**: Append a DELETE entry in `.vibe_context/logs/YYYY-MM-EXECUTION_LOG.md`, containing:
   - Datetime
   - Operation type: `DELETE`
   - Deleted path
   - Information destination and core summary

---

## §3 Scenario Registry Guard

- Core scenarios are fixed at **4**: `ui_scenario.md`, `core_logic.md`, `sop_sync.md`, `meta_audit.md`
- No `.md` files other than the above 4 SHALL exist in `.vibe_context/scenarios/`
- To add an extension scenario, it MUST first be registered in `.vibe_context/AI_CONTEXT.md`, following the Purpose/Trigger/Allowed Files specification

---

## §4 Sub-Scenario: Experience Distillation

**Sub-Scenario: Experience Distillation**. Trigger keywords: 蒸馏经验 / 沉淀经验. Action guide: Scan the logs directory for entries marked `[经验蒸馏: 否]`, extract core business insights, update the experience distillation document in a structured manner, and append the `[经验蒸馏: 是]` marker to the original log entries in-place.

---

## Pre-Execution Checklist

- [ ] Confirm the operation type triggering this scenario (log write / delete audit / snapshot / scenario registry)
- [ ] Operate on `.vibe_context/*` files ONLY
- [ ] Before ending each Session, verify that the log entry has been written
- [ ] If a file was deleted, confirm that both conditions of the Delete + Log Rule are satisfied
