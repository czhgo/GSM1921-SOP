// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/timestamps-note-baseline.mjs —— TIMESTAMPS「备注列预算」的**存量台账**（数据文件，判据在 guard）
// ════════════════════════════════════════════════════════════════
// 由来（2026-09-28 批次 235，承支书「TIMESTAMPS 最后一列是历史负担」）：
//   实测（本批）——登记 **273 行**、备注列合计 **71888 字符**（最长单格 3650）、
//   含 T-编号 74 行 · 含「日期刷」复述 20 行 · 「批次 N」罗列 >3 次者 39 行 · 单格 >1000 字者 16 行。
//   病根：备注列被当成「逐批沿革」的落点（写「本批改了什么」），而沿革的权威落点是 `.ctx/logs/**`（判据见 CLAUDE.md 台账纪律）。
//
// 用法（判据在 `timestamps-note-guard.test.mjs`）：四份清单与**实测命中集必须逐字相等**
//   ⇒ ① 新增一处违规（新格子堆沿革 / 新 T-编号 / 新日期复述 / 新批次号罗列）**立刻判红**；
//      ② 清单里的条目一旦不再命中（已收敛）**也判红**（僵尸条目须撤下）⇒ **天然「只降不升」**。
// ⚠ **收敛路径**：把该格的历史沿革**迁移到 `.ctx/logs/**`**（保留一句指针），然后从本文件删掉该 path。
//   禁止为变绿而**增**条目（增条目＝放宽守卫，属越权项，须支书核可并如实登记）。
// ⚠ 本文件**只许减**：任何一次「删条目」都是收敛；任何一次「加条目」都要在批注里写明理由与裁定出处。

/** 备注列**总字符预算**（当前生效值；只许人工下调，上调＝越权） */
// ⚠ 2026-10-02 批次 333（备注列第六轮）：实测 47,744（守卫口径，275 行）→ **迁出 2 格 ＋ 修一处「8 段被跳过」结构缺陷** 后 **47,136**（276 行）
//   ⇒ 预算 50,000 → **47,500**（**只降不升**）。**修缺陷说明**：`content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md` 那格含未转义竖线 ⇒ 整行 8 段、被守卫跳过。
// ⚠ 2026-10-01 批次 322（备注列第五轮）：实测 53,708 → **49,750** ⇒ 预算 57,000 → 50,000（**只降不升**）。
export const NOTE_TOTAL_BUDGET = 47500;
/** 历史冻结高水位（机检 NOTE_TOTAL_BUDGET ≤ 本值 ⇒ 预算不可能被悄悄调大） */
export const NOTE_TOTAL_HARD_CEIL = 95000;
// 高水位沿革（只许下调）：2026-09-30 批次 311 第四轮收敛（再迁 5 格：README.md /
//   content/02_institution/COMMISSIONER_DUTY_FRAMEWORK.md / content/04_web_design/data/DATA_MODEL.md /
//   content/04_web_design/module/MODULE_UI_DESIGN.md / docs/src/styles.css）后实测 53,708，
//   预算随之下调 65,000 → 57,000（**只降不升**）。四份清单同批共删 13 处（与批次 308 同形：
//   5 个 path 在四份清单里的出现次数之和）。
//   2026-09-30 批次 308 第三轮收敛（迁 5 格：docs/help.html / CLAUDE.md / server/README.md /
//   .ctx/ENGINEERING_ASSESSMENT.md / server/test/form-loop-registry.mjs）后实测 60,898，
//   预算随之下调 75,000 → 65,000（**只降不升**）。
//   2026-09-28 批次 235 首建时实测 157,952；同批按 R-89 收敛路径迁出 5 格
//   （`.ctx/logs/2026-09-EXECUTION_LOG.md`「附：TIMESTAMPS 备注列迁出的逐批沿革」）后实测 93,008，
//   人工下调上限至 95,000（留 ≈2,000 字供「改了必须刷卡」的短注）。**再上调＝放宽守卫＝越权项。**
/** 单格字数硬顶（超过即入清单） */
export const NOTE_LONG_MAX = 1000;
/** 单格「批次 N」出现次数硬顶（超过即入清单） */
export const BATCH_MENTION_MAX = 3;
/** 登记行数下限（非空转：解析口径被改坏即红） */
export const ROWS_MIN = 245;

/** 单格 > NOTE_LONG_MAX 字（26 行 · 待专项批把沿革迁 `.ctx/logs/**`） */
// ⚠ 2026-10-01 批次 322：**已清零**——原 6 格 >1000 字的备注**整段迁出**到 `.ctx/logs/2026-09-EXECUTION_LOG.md`
//   「附：TIMESTAMPS 备注列迁出的逐批沿革（批次 322）」，原位换短注 ⇒ 本清单合法为空（**达标态**，非「删空即变绿」，见 `N7` 例外条）。
export const OVERLONG_BASELINE = [
];

/** 备注含 `T-\d*` 编号（75 行 · T-编号是执行日志的键，台账不应承载） */
export const WITH_TID_BASELINE = [
  '.ctx/logs/2026-08-EXECUTION_LOG.md',
  'content/03_doc_system/PROCESS_GUIDE.md',
  'content/04_web_design/data/DATA_FLOW.md',
  'content/04_web_design/deploy/AUTHENTICATION_MODEL.md',
  'content/04_web_design/deploy/PKU_PARTY_INTEGRATION.md',
  'content/04_web_design/deploy/WECHAT_INTEGRATION.md',
  'content/04_web_design/design-system/COLOR_SYSTEM.md',
  'content/04_web_design/design-system/COMPONENT_SPEC.md',
  'content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md',
  'content/04_web_design/module/ABOUT_PAGE_DESIGN.md',
  'content/04_web_design/module/SOP_WEBSITE_GUIDE.md',
  'docs/src/about.css',
  'docs/src/components/role-hierarchy.js',
  'docs/src/core/session/cross-page-state.js',
  'docs/src/core/boot/registry.js',
  'docs/src/entries/pages/about-entry.js',
  'docs/src/entries/tabs/disc/_shared.js',
  'docs/src/entries/tabs/disc/attendance-tab.js',
  'docs/src/entries/tabs/disc/inspection-tab.js',
  'docs/src/entries/tabs/disc/makeup-tab.js',
  'docs/src/entries/tabs/disc/my-dispatch-tab.js',
  'docs/src/entries/tabs/disc/overview-tab.js',
  'docs/src/entries/tabs/disc/review-tab.js',
  'docs/src/entries/tabs/disc/tf-view-tab.js',
  'docs/src/entries/tabs/disc/todo-tab.js',
  'docs/src/entries/tabs/leader/_shared.js',
  'docs/src/entries/tabs/leader/attendance-tab.js',
  'docs/src/entries/tabs/leader/inspection-tab.js',
  'docs/src/entries/tabs/leader/members-tab.js',
  'docs/src/entries/tabs/leader/my-dispatch-tab.js',
  'docs/src/entries/tabs/leader/overview-tab.js',
  'docs/src/entries/tabs/leader/review-tab.js',
  'docs/src/entries/tabs/leader/tf-view-tab.js',
  'docs/src/entries/tabs/leader/todo-tab.js',
  'docs/src/entries/tabs/leader/write-tab.js',
  'docs/src/entries/tabs/org/development-tab.js',
  'docs/src/entries/tabs/org/inspection-tab.js',
  'docs/src/entries/tabs/org/my-dispatch-tab.js',
  'docs/src/entries/tabs/org/overview-tab.js',
  'docs/src/entries/tabs/org/talent-tab.js',
  'docs/src/entries/tabs/org/taskforce-tab.js',
  'docs/src/entries/tabs/org/todo-tab.js',
  'docs/src/entries/tabs/prop/archive-tab.js',
  'docs/src/entries/tabs/prop/kanban-tab.js',
  'docs/src/entries/tabs/prop/my-dispatch-tab.js',
  'docs/src/entries/tabs/prop/overview-tab.js',
  'docs/src/entries/tabs/prop/tasks-tab.js',
  'docs/src/entries/tabs/prop/todo-tab.js',
  'docs/src/entries/tabs/prop/weekly-tab.js',
  'docs/src/entries/tabs/visitor/activities-tab.js',
  'docs/src/entries/tabs/visitor/attendance-tab.js',
  'docs/src/entries/tabs/visitor/inspection-tab.js',
  'docs/src/entries/tabs/visitor/overview-tab.js',
  'docs/src/entries/tabs/visitor/projects-tab.js',
  'docs/src/entries/tabs/visitor/todo-tab.js',
  'docs/src/entries/workspace/ws-disc-commissioner-entry.js',
  'docs/src/entries/workspace/ws-leader-entry.js',
  'docs/src/entries/workspace/ws-org-commissioner-entry.js',
  'docs/src/entries/workspace/ws-prop-commissioner-entry.js',
  'docs/src/entries/workspace/ws-secretary-entry.js',
  'docs/src/entries/workspace/ws-visitor-entry.js',
  'docs/src/capabilities/activity-calendar.js',
  'docs/src/capabilities/disc-workspace.js',
  'docs/src/capabilities/leader-workspace.js',
  'docs/src/capabilities/org-workspace.js',
  'docs/src/capabilities/prop-workspace.js',
  'docs/src/capabilities/visitor-workspace.js',
  'docs/src/services/governance/secretary-overview.js',
  'docs/src/services/member/person.js',
  'docs/workspace/leader.html',
  'docs/workspace/org.html',
  'server/test/b3-1-makeup-writeback.test.mjs',
];

/** 备注含「日期由 X 刷 Y / 刷为 YYYY-MM-DD / 日期不变」复述（24 行） */
export const WITH_DATE_ECHO_BASELINE = [
  'content/02_institution/sop/INDEX.md',
  'content/04_web_design/evolution/PARTY_COMMITTEE_DESIGN.md',
  'docs/src/components/governance/org-setup-wizard.js',
  'docs/src/components/shell/header.js',
  'docs/src/entries/pages/activity-entry.js',
  'docs/src/entries/pages/notice-entry.js',
  'docs/src/entries/pages/party-committee-meeting-entry.js',
  'docs/src/entries/tabs/disc/inspection-tab.js',
  'docs/src/entries/tabs/leader/write-tab.js',
  'docs/src/entries/tabs/visitor/projects-tab.js',
  'docs/src/entries/tabs/visitor/review-tab.js',
  'docs/src/entries/workspace/ws-secretary-entry.js',
  'docs/src/components/sections/references.js',
  'docs/src/services/governance/notice.js',
];

/** 单格「批次 N」罗列 > BATCH_MENTION_MAX 次（49 行 · 沿革应进 `.ctx/logs/**`） */
export const WITH_BATCH_MENTION_BASELINE = [
  'README-members.md',
  'content/02_institution/sop/宣传委员工作流程指南.md',
  'content/02_institution/sop/常见工作场景快速指南.md',
  'content/02_institution/sop/支委与党小组定人定责定岗说明.md',
  'content/02_institution/sop/纪检委员工作流程指南.md',
  'content/02_institution/sop/组织委员工作流程指南.md',
  'content/03_doc_system/SERVICE_CATALOG.md',
  'content/03_doc_system/USAGE_POLICY.md',
  'content/04_web_design/data/DATA_FLOW.md',
  'content/04_web_design/design-system/COMPONENT_SPEC.md',
  'content/insights/README.md',
  'docs/src/components/governance/org-setup-wizard.js',
  'docs/src/components/record/inspector.js',
  'docs/src/components/ui/modal.js',
  'docs/src/entries/pages/party-committee-meeting-entry.js',
  'docs/src/entries/pages/settings-entry.js',
  'docs/src/entries/tabs/disc/attendance-tab.js',
  'docs/src/entries/tabs/leader/write-tab.js',
  'docs/src/entries/tabs/org/taskforce-tab.js',
  'docs/src/entries/tabs/prop/archive-tab.js',
  'docs/src/entries/tabs/secretary/calendar-tab.js',
  'docs/src/entries/tabs/secretary/work-map-tab.js',
  'docs/src/services/activity/activity.js',
];
