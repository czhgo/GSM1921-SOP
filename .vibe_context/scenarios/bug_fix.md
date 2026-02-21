# Scenario: Bug Fix

> **Trigger phrases:** "fix bug", "resolve issue", "correct error", "patch defect"  
> **SOP position:** Loaded at step 3. Read this file **before** making any defect-correction change.

---

## 🎯 Objective

Identify, isolate, and correct a specific defect with the smallest possible code change, and verify the fix does not introduce regressions.

---

## 📋 Pre-Execution Checklist

- [ ] Re-read `REVIEW_STATE.md` and confirm the bug is not already being addressed
- [ ] Reproduce the bug (describe the exact trigger / symptom)
- [ ] Identify the root-cause file and line range
- [ ] Confirm the expected correct behavior

---

## ⚙️ Constraints

| # | Constraint |
|---|-----------|
| C1 | Fix **only** the root cause — do not refactor surrounding code in the same commit |
| C2 | Do not change public interfaces, function signatures, or data schemas unless the bug requires it |
| C3 | Every fix must be accompanied by a test (new or updated) that would have caught the bug |
| C4 | Document the fix with an inline comment if the cause is non-obvious |
| C5 | If the fix reveals a deeper architectural issue, log it as a deferred task in REVIEW_STATE and do **not** fix it in this session |

---

## 🔄 Execution Steps

- [ ] **Step 1 — Reproduce:** Confirm the bug is reproducible and describe the symptom
- [ ] **Step 2 — Root cause:** Pinpoint the exact file, function, and line(s) responsible
- [ ] **Step 3 — Fix:** Apply the minimal change to correct the root cause
- [ ] **Step 4 — Test:** Run existing tests; add a targeted test if none covers this case
- [ ] **Step 5 — Regression check:** Confirm no previously passing tests now fail
- [ ] **Step 6 — Update REVIEW_STATE:** Mark bug as resolved; log any discovered deferred issues

---

## 📝 Notes / Context

> _(Populate before starting. Example: "Broken link to `活动复盘模板.md` in CHEATSHEET.md — file was moved.")_

---

**Version:** 1.0  
**Owner:** 储子禾  
**Last updated:** 2026-02-21
