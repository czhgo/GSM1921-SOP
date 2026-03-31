**Purpose**: Manages changes to domain models, Schema fields, Service methods, state machines, and other core business logic. All code-layer modifications MUST be traceable to institutional references in `knowledge/SOP/`; Schema fields MUST carry `Source:` comment anchors.

> **[2026-03 Architecture Upgrade Notes]**: The state machine has been fully modularized and is no longer a monolithic `main.js`. Core business logic is distributed as follows:
> - **Global State**: `src/state.js` (`appState` immutable object, `setState(patch)`, `registerRenderCallback` circular dependency resolution)
> - **Inspector & Task Filtering**: `src/inspector.js` (`renderInspectorFromState`, `renderInspectorList`, `renderInspectorDetail`, `filterTasksByManagementRole`)
> - **SOP Instantiation Engine**: `src/workflow/sop.js` (`instantiateSOP(scenarioIds, t0DateStr)` expands templates into task arrays with absolute dates); exported uniformly via the `src/workflow/index.js` barrel file
> - **Constants Registry**: `src/constants.js` (`ROLE_COLORS`, `ROLE_LABELS`, `ROLE_THEME_CLASS`, `ROLE_ORDER`, `COMMISSIONER_ROLES`)
> - **Utility Functions**: `src/utils.js` (`showToast`, `_fmtDate`, `_fmtChinese`, `_currentYearMonth`)
> - **App Initialization & Render Coordination**: `src/main.js` (`initApp`, `renderUI` — sole DOM update entry point, approx. 154 lines)

**Trigger**: field, schema, activity, task, data structure, API, domain, service, state machine, STATE, renderUI, src/, state.js, inspector.js, sop.js, workflow, constants.js, utils.js

**Allowed Files**: `src/*` (`src/state.js`, `src/constants.js`, `src/utils.js`, `src/workflow/sopData.js`, `src/workflow/sop.js`, `src/workflow/index.js`, `src/calendar.js`, `src/inspector.js`, `src/events.js`, `src/main.js`, `src/service.mock.js`, `src/service.runtime.js`)

---

## Binding Constraints

| # | Constraint |
|---|-----------|
| C1 | Before adding any new Schema field, a corresponding SOP anchor MUST first be established in `knowledge/SOP/`; any field change lacking an SOP anchor SHALL be classified as [FAILED]. |
| C2 | Every field with business semantics in `domain.js` MUST carry a `Source: knowledge/SOP/[file].md#[section]` annotation. |
| C3 | When an SOP section is deleted or renamed, all `Source:` pointers in `domain.js` MUST be updated synchronously; stale "Dead Link" references are Strictly prohibited. |
| C4 | `main.js` SHALL only invoke services through `BranchService` (`service.runtime.js`); direct manipulation of `mockDB` is Strictly prohibited. |
| C5 | `appState` is immutable (MUST be updated via spread assignment); `renderUI()` is the sole DOM update exit point. |
| C6 | Before any modification, output the Three-Element Declaration: Detected Scenario / Allowed Scope / Modification Plan. |

## SOP → Code Traceability Verification (MUST be executed on every activation)

1. **Update SOP**: Confirm that the institutional text in `knowledge/SOP/` covers the rationale for this change.
2. **Update `domain.js` annotations**: Verify that all `Source:` pointers still reference valid SOP section titles.
3. **Update Service**: Ensure `service.mock.js` methods remain consistent with the Schema.
4. **Update `main.js`**: Verify that the state machine aligns with the Service interface.

## Execution Steps

- [ ] Confirm SOP is updated (`knowledge/SOP/` relevant files + `domain.js` `Source:` pointers)
- [ ] Output the Three-Element Declaration (SOP change / Schema impact / Service impact)
- [ ] Modify target files in `src/`
- [ ] Update execution log `.vibe_context/logs/YYYY-MM-EXECUTION_LOG.md`
