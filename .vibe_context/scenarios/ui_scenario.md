**Purpose**: Manages all UI-presentation-related changes — HTML structure, CSS styling, and Mermaid diagram visual styles. The UI layer is the terminal stage of the change pipeline; it MUST only be driven by upstream layers (SOP / Schema / Service) and SHALL NOT be modified in reverse.

> **[2026-03 Architecture Upgrade Notes]**: The UI layer has been refactored from a monolithic `index.html+main.js` into independent rendering modules. A RBAC dual-view switching mechanism and archive library entry point have been introduced.
>
> **Dual-View Switching Logic**:
> - **👀 Participant View** (`viewType: 'participant'`): Triggered by the sidebar "👀 参与视图" button via `setState({ viewType:'participant' })`. The inspector displays a read-only activity list; cards show only title and status. Clicking a card opens a native DOM Modal (`_showParticipantModal`) without exposing executor or supervisor information.
> - **⚙️ Management View** (`viewType: 'manager'`): Triggered by the four sidebar role buttons (组长 / 委员 / 组织者 / 深度参与) via `setState({ viewType:'manager', managementRole: '<role>' })`. The inspector displays actionable task details with status toggling (`<select>`); task cards and headings apply the corresponding colored left-border via `ROLE_THEME_CLASS[managementRole]` (blue / yellow / red / green).
>
> **Archive Library Entry**: The "归档库" button at the bottom of the sidebar management view triggers `setState({ viewArchived: true, viewType: 'manager', viewMode: 'list' })`. The inspector switches to archive mode — displaying all activities where `archived === true`; all `<select>` elements in the detail view become `disabled`; the "归档活动" button is replaced by "恢复活动". Clicking any role button automatically resets `viewArchived: false`.
>
> **Rendering Rules**: `renderUI(appState)` is the sole legitimate DOM entry point, owned by `src/main.js`; `src/calendar.js` handles calendar grid rendering; `src/inspector.js` handles right-panel rendering; `src/events.js` handles full event binding — all three receive `appState` via function parameters; direct DOM scatter-writes are Strictly prohibited.

**Trigger**: UI, page, button, layout, style, UX, index.html, color, icon, animation, visual, view, archive library, dual-view, participant view, management view, RBAC, viewType, viewArchived

**Allowed Files**: `index.html`, `assets/*`

---

## Binding Constraints

| # | Constraint |
|---|-----------|
| C1 | All DOM write operations MUST go through the `renderUI()` single entry point; direct `document.querySelector().innerHTML` writes outside `main.js` are Strictly prohibited. |
| C2 | Prior to any UI change, Schema (`domain.js`) and Service (`service.mock.js` / `service.runtime.js`) updates MUST be confirmed as complete. |
| C3 | Mermaid diagram color scheme: blue = 条条, red = 块块, green = start/end nodes |
| C4 | Before any modification, output the Three-Element Declaration: Detected Scenario / Allowed Scope / Modification Plan |
| C5 | Strictly prohibited: inserting English instructions, YAML logic blocks, or meta-comments into the human-visible content areas of `index.html`. |

## Execution Steps

- [ ] Confirm all upstream SOP / Schema / Service changes are complete (Change Pipeline Iron Law)
- [ ] Output the Three-Element Declaration
- [ ] Modify only `index.html` / `assets/*`; SHALL NOT touch `src/`
- [ ] Update execution log `.vibe_context/logs/YYYY-MM-EXECUTION_LOG.md`
