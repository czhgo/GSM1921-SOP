# Scenario: API Refactor

> **Trigger phrases:** "refactor API", "update endpoint", "restructure API layer"  
> **SOP position:** Loaded at step 3. Read this file **before** making any API-layer change.

---

## 🎯 Objective

Restructure or update API endpoints, request/response schemas, or service interfaces with zero regression.

---

## 📋 Pre-Execution Checklist

- [ ] Re-read `REVIEW_STATE.md` and confirm no conflicting in-progress task
- [ ] Identify all files that import / call the target endpoint or service
- [ ] Note the current request schema and response schema
- [ ] Confirm backward-compatibility requirement (breaking vs. non-breaking change)

---

## ⚙️ Constraints

| # | Constraint |
|---|-----------|
| C1 | Change only the files listed in the pre-execution checklist — no speculative refactoring |
| C2 | Preserve all existing public interfaces unless the scenario explicitly states a breaking change |
| C3 | Update every call-site that references the changed interface |
| C4 | Add or update API documentation / comments inline |
| C5 | Run existing tests after each changed file; fix any failures before proceeding |

---

## 🔄 Execution Steps

- [ ] **Step 1 — Map impact:** List all files affected by the API change
- [ ] **Step 2 — Update schema:** Modify the endpoint / service definition
- [ ] **Step 3 — Update call-sites:** Propagate the change to all callers
- [ ] **Step 4 — Update tests:** Add / modify tests to cover the new interface
- [ ] **Step 5 — Validate:** Run lint + build + tests; confirm all pass
- [ ] **Step 6 — Update REVIEW_STATE:** Check off completed tasks, log any issues found

---

## 📝 Notes / Context

> _(Populate before starting. Example: "Endpoint `/api/members` is being renamed to `/api/party_members`.")_

---

**Version:** 1.0  
**Owner:** 储子禾  
**Last updated:** 2026-02-21
