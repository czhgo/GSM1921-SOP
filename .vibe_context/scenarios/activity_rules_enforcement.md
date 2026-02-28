# Scenario: Activity Rules Enforcement

> **Trigger phrases:** "enforce activity rules", "A/B activity", "组织活动", "场景1拆分"  
> **SOP position:** Loaded at step 3. Read this file **before** making any change to party activity workflows.  
> **Dual-Track Rule:** This file contains Agent constraints ONLY. All human-readable SOP content lives in `流程指南/`. DO NOT copy narrative content here.

---

## 🎯 Objective

Apply the 书记-approved A-class / B-class party activity classification when modifying SOP flow documents. Ensure every step has a named 条条 owner and correct 块块 support role.

---

## 📋 Pre-Execution Checklist

- [ ] Re-read `REVIEW_STATE.md` — confirm no conflicting in-progress task
- [ ] Load the current text of `流程指南/常见工作场景快速指南.md` 场景1
- [ ] Load the current text of `流程指南/工作流程图-定人定责定岗.md` 第3节
- [ ] Note the applicable Watchlist items from REVIEW_STATE (`[Global]` items always; `[Scenario-1 Only]` items for this file's scope) and flag any conflicts found

---

## ⚙️ Binding Constraints

| # | Constraint |
|---|-----------|
| C1 | **A-class activities** (组织生活会) rules: |
|    | • Participants: 党员 + 预备党员 ONLY |
|    | • Attendance: rigid (三会一课) |
|    | • 复盘: NOT required |
|    | • 宣传: required (摘要+配图，纳入月推送) |
|    | • 档案归档: required |
| C2 | **B-class activities** (党小组主题党日活动) rules: |
|    | • Participants: all 支部成员 (党员+预备党员+发展对象+积极分子) |
|    | • Attendance: flexible (弹性考勤) |
|    | • 复盘: required within 1 week; may be completed by 积极分子 with 条条组长 guidance |
|    | • 宣传: required (活动摘要+配图，纳入月推送) |
|    | • 宣传预热: NOT required for either class |
| C3 | Every activity MUST pass 条条组长 approval before preparation begins (A-class: implied by 书记/支委会 deployment; B-class: explicit Step 2 node) |
| C4 | The principle "除了发展党员、转正、换届等需要严肃投票的事项，其他都可以往党小组压" must be preserved |
| C5 | Do NOT define "深度参与者" or "组织者" inline — reference `流程指南/纪检委员工作流程指南.md` on first mention |
| C6 | Do NOT resolve suspended issue H1 (跨组参与考察协同) — mark as ⚠️ 悬置 in the text |
| C7 | **动态 Watchlist 检查（取代硬编码 W1–W4）：** 必须动态检查 `REVIEW_STATE.md` 中标记为 `[Global]` 的全部 Watchlist 项，以及 `[Scenario-1 Only]` 项（本场景文件适用范围为场景1）。发现冲突时先记录至 REVIEW_STATE 再继续。 |
| C8 | Refer to `官方文件/` for A-class official procedure if more detailed steps are found there |
| C9 | Mermaid flow diagrams must use existing color scheme: 蓝色=条条, 红色=块块, 绿色=起止节点 |

---

## 🔗 Reference Files (Data Plane)

> Read these files to understand current content. Modify them as required by the pending tasks. Do not embed their content here.

- `流程指南/常见工作场景快速指南.md` — primary target (场景1 A/B split)
- `流程指南/工作流程图-定人定责定岗.md` — flow diagram target (第3节 split)
- `流程指南/宣传委员工作流程指南.md` — add 宣传规范 chapter (修改4)
- `流程指南/纪检委员工作流程指南.md` — reflect A/B attendance difference (W4)
- `_quick_cards/card-01-组织活动.md` — update to A/B classification (修改5 联动)
- `官方文件/【附件17】中国共产党支部工作条例（试行）（2018年10月28日）.docx` — verify A-class steps
- `官方文件/【附件12】党支部工作规范（学生）.pdf` — verify A-class steps

---

## 🔄 Execution Steps

- [x] **Step 1** — Implement 修改1: restructure 场景1 into 总入口 + 1A + 1B in `常见工作场景快速指南.md`
- [x] **Step 2** — Implement 修改2: add A-class 12-step procedure table with named owners
- [x] **Step 3** — Implement 修改3: add B-class 11-step flow with time-node column and two launch paths
- [x] **Step 4** — Implement 修改6: add 组长审批 node to B-class Step 2
- [x] **Step 5** — Implement 修改7: add time-node column; hard-code 外出活动 2-day build-group rule
- [x] **Step 6** — Implement 修改8: embed template links in 1A and 1B
- [x] **Step 7** — Implement 修改9: append check-list (室内/外出) after B-class Step 7
- [x] **Step 8** — Implement 修改10: append A-class deliverables checklist
- [x] **Step 9** — Implement 修改11: explicitly state "党小组主题党日活动弹性考勤" rule
- [x] **Step 10** — Implement 修改12: add cross-group participation rules; mark H1 as ⚠️ 悬置
- [x] **Step 11** — Implement 修改13: add 外出活动 safety/transport/finance notes
- [ ] **Step 12** — Implement 修改14: add brand/non-brand launch paths in 场景8 and 场景1B
- [x] **Step 13** — Implement 修改4: add 宣传规范 chapter in `宣传委员工作流程指南.md`
- [x] **Step 14** — Implement 修改5: add concept reference links (no re-definition)
- [x] **Step 15** — Update Mermaid diagrams in `工作流程图-定人定责定岗.md`
- [x] **Step 16** — Check applicable Watchlist items (Global + Scenario-1 specific); flag conflicts in REVIEW_STATE
- [x] **Step 17** — Update REVIEW_STATE: check off completed tasks, update session log

---

**Version:** 1.2  
**Owner:** 储子禾  
**Last updated:** 2026-02-28
