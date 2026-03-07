# Meta Audit Log — Scenario Rules

> **Scenario:** `META_AUDIT`
> **Allowed Scope:** `.vibe_context/*`

## Execution Logging Rule

All modifications must be logged as a permanent physical record in the `.vibe_context/logs/` directory (e.g., appending to the current monthly `YYYY-MM-EXECUTION_LOG.md` file).

**Mandatory Log Content:**

- Scenario: `[detected scenario identifier]`
- Files Modified: `[list of modified file paths]`
- SOP Reference: `[knowledge/SOP/[file].md#[section] or N/A]`
- Schema Impact: `[field(s) affected or N/A]`
- Summary: `[one-sentence description of the change]`
- Timestamp: `[ISO 8601 datetime]`

**Log Rotation Rule:**

- Logs are stored in `.vibe_context/logs/YYYY-MM-EXECUTION_LOG.md` (one file per calendar month).
- When a new month begins, AI must check whether the current-month log file exists. If not, create it from the standard template before appending.
- The index file `.vibe_context/EXECUTION_LOG.md` must be updated to reference the new monthly file.

**Enforcement:**

Skipping the execution log entry is a `TASK FAILURE`. No session is considered complete until the log entry is written.
