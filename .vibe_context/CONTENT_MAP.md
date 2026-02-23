---
title: "Human Panel Content Map"
type: index
owner: "储子禾"
last_updated: "2026-02-22"
version: "1.0"
status: active
---

# CONTENT MAP — Human Panel Index for AI Agents

> **Role:** Gives AI agents a rapid, annotated overview of every Human Panel file — both Markdown and binary — so that sessions start with full context without opening each document individually.  
> **When to read:** At the start of any session that involves navigating, editing, or auditing Human Panel content. Optional for narrowly scoped control-plane tasks.  
> **Maintenance policy:** Update whenever a new Human Panel file is created, significantly restructured, or when a binary file's content is newly transcribed into Markdown.

---

## 1. Dual-Purpose Architecture Declaration

**All AI-generated Markdown files in this repository are dual-purpose by design.**

| Property | Value |
|----------|-------|
| Human readability | ✅ Simplified Chinese; directly readable in GitHub / local Markdown viewer / WPS |
| AI agent readability | ✅ Directly accessible by path; YAML `related_files` provides the navigation graph |
| Separate AI transcription needed? | ❌ **No.** Markdown files ARE the AI's primary content data source — no mirroring into `.vibe_context/` is required or desirable |

**Implication for repo slimming:** There is no redundancy between Human Panel Markdown files and `.vibe_context/`. The AI Data Panel holds **only** state, rules, and orchestration — it never mirrors SOP narrative content. No slimming via consolidation is warranted. If AI path references need updating after a file is moved, update them in `related_files` fields and in this document.

---

## 2. Human Panel — Markdown Files (Dual-Purpose Inventory)

### Root Level

| File | YAML type | Abstract | Key Content Tags |
|------|-----------|----------|-----------------|
| `README.md` | `index` | Top-level repo overview and navigation table. Links to every major directory with one-line descriptions. Includes 按任务找文件 and 按角色找文件 tables, and a summary of the 条条/块块 dual-management structure. | 支部SOP, 导航, 文件夹说明, 角色导航, 条条, 块块 |
| `START_HERE.md` | `guide` | Onboarding guide for new members and AI sessions alike. Contains: 5-second quick-finder table (6 rows), role-based navigation (新任支委 / 块块委员 / 条条委员), template index table, and full **AI collaboration workflow** (standard invocation prompt + Review Inbox procedure). | 新手引导, AI协同, 标准调用指令, 模板位置, Review Inbox |
| `CHEATSHEET.md` | `reference` | One-page quick reference (WPS-friendly, no dependencies). ASCII-art scenario box, role-based file tree (条条 / 块块), 3-category template finder, 3-step onboarding path. | 速查, WPS友好, 无依赖, 极简导航 |

### 流程指南/

| File | YAML type | Abstract | Key Content Tags |
|------|-----------|----------|-----------------|
| `流程指南/README.md` | `index` | Directory of all `流程指南/` files. Recommended reading order (6 files), role-based navigation paths (新任支委 / 党小组组长 / 块块委员 / 积极分子 / 团班), file summary table with line-counts. | 阅读顺序, 角色导航, 文档概览 |
| `流程指南/常见工作场景快速指南.md` | `SOP` | **PRIMARY SOP — read first for any content task.** 9 common work scenarios. **Scenario 1** = activity-type router → **1A** (组织生活会, A-class): 12-step table with named owners (会前准备/会中实施/会后归档) + deliverables checklist. **1B** (灵活学习活动, B-class): 11-step table with time-node column, two launch paths (a=brand / b=ad-hoc), indoor/outdoor checklists,弹性考勤, cross-group rules, ⚠️ H1 suspended issue. **Scenarios 2–9:** new institution building, activist assessment, 党团班 joint activities, information-platform support, attendance queries, branch decision-making, brand-activity building, feedback handling. Appendix: role-to-scenario and task-to-scenario lookup tables, contact table. | 场景1A, 场景1B, A类, B类, 9个场景, 责任人, 联系人, 弹性考勤, 品牌活动 |
| `流程指南/支委与党小组定人定责定岗说明.md` | `SOP` | **DUTY FRAMEWORK.** Defines the 6-person branch committee (including 辛长乐 as deputy group leader), 条条/块块 dual management system, each person's dual-identity responsibilities (储子禾, 王峥旭, 侯嘉嵘, 闫鑫岳, 韩思宁), inter-group coordination mechanisms, accountability matrix (§5 定人/定责/定岗), and 4 optimization recommendations. | 条条, 块块, 双线管理, 定人定责定岗, 双重身份, 职责边界 |
| `流程指南/工作流程图-定人定责定岗.md` | `flowchart` | **10 Mermaid flowcharts.** (1) org chart with dual identity, (2) 条条-块块 collaboration map, (3) party activity flow (generic, pre-A/B split — ⚠️ needs update per REVIEW_STATE 修改1), (4) institution-building flow, (5) activist development → party member path, (6) 党团班 joint activity, (7) branch committee decision, (8) dual-identity switching state diagram, (9) responsibility matrix table, (10) decision-authority map. Color scheme: 蓝=条条, 红=块块, 绿=起止, 黄=职能. | Mermaid, 流程图, 10张图, 蓝红绿配色 |
| `流程指南/组织委员工作流程指南.md` | `SOP` | **组织委员（侯嘉嵘）complete manual.** 4 work scenarios: (1) info platform — notification workflow, 9-step table, notification text template; (2) ideological report archiving — collection/statistics/quality, quarterly stats template; (3) activity workflow building — co-built with 纪检委员; (4) member development support — materials per development stage. Includes FAQ (6 Q&A) + daily/semester checklists. | 信息平台, 思想汇报, 工作流建设, 党员发展协助, 组织委员 |
| `流程指南/宣传委员工作流程指南.md` | `SOP` | **宣传委员（闫鑫岳）complete manual.** 3 work scenarios: (1) branch meeting archive — 12-step table for 支部大会, checklist for 支委会 (no publicity needed); (2) party-group activity guidance — **§3.0 A/B class publicity rules** (A=档案归档主导, B=指导宣传负责人), guidance checklists, material standards (photo: ≥10 photos, 1920×1080; text: 800-1500 chars); (3) template library — 6-type template system, storage/sharing. Includes 宣传档案队伍 building, FAQ (6 Q&A) + checklists. | 宣传, 档案, A类B类宣传规范, 指导监督, 模板库, §3.0 |
| `流程指南/纪检委员工作流程指南.md` | `SOP` | **纪检委员（韩思宁）complete manual.** Key distinction: **考勤** (0-1 variable, 三会一课, → 宣传委员) vs **参与记录** (3-tier: 组织/深度参与/出勤, all activities, → 组织委员 monthly). 2026-02 transfers: 考察档案 and 意见反馈平台 moved to 组织委员. Activity review supervision: 组织者 must complete personally within 1 week. Make-up session management (1-2 week window). FAQ (6 Q&A). | 考勤, 三层参与记录, 倒查法, 活动复盘监督, 补课制度, 2026-02调整 |

### _quick_cards/

| File | YAML type | Abstract |
|------|-----------|----------|
| `_quick_cards/README.md` | `index` | Index of 5 WPS-friendly quick cards; table with scenario links and target audience per card. |
| `_quick_cards/card-01-组织活动.md` | `reference` | 5-step activity organizer card (confirm topic → notify → run → record → review). ⚠️ **Pre-dates A/B restructuring (last_updated 2026-02-17)** — does not distinguish 1A/1B. See W5 in REVIEW_STATE. |
| `_quick_cards/card-02-会议记录.md` | `reference` | Meeting-minutes card. Two cases: 三会一课 (use `党支部工作记录.docx`, 10+ photos, submit in 3 days) vs other activities (photos + brief text or `活动总结模板.md`). Photo standards table. |
| `_quick_cards/card-03-活动复盘.md` | `reference` | Activity review card for 活动组织者. 5 questions (goal achieved? highlights? problems? improvements? lessons?). Comparison table: 复盘 (by organizer, internal, non-delegable) vs 宣传总结 (by 深度参与者, external). |
| `_quick_cards/card-04-考勤记录.md` | `reference` | Attendance card for 纪检委员.考勤 vs 考察 comparison table. 三会一课 3-phase flow (before/during/after). Attendance table template. Leave rules (事假 1-day advance / 病假 post-hoc). Make-up policy. |
| `_quick_cards/card-05-宣传检查.md` | `reference` | Pre-publication checklist card for 宣传委员. 5 check areas: completeness, format, photo quality, text accuracy, political correctness. Review timeline (3 days → submit, 10 days → archive). |

### 活动复盘/

| File | YAML type | Abstract |
|------|-----------|----------|
| `活动复盘/README.md` | `导航` | Activity review guide. Who (组织者 only, not 宣传委员), when (within 1 week; NOT for 三会一课), how (template / GitHub Issues / hybrid). 3 principles (objective/specific/timely). 3 anti-patterns (formalistic/blame/unfinished). File naming convention: `YYYYMMDD-活动名称-复盘.md`. |
| `活动复盘/活动复盘模板.md` | `模板` | 9-section structured review template (basic info, goal review, execution, highlights+innovations, problems, improvements, lessons, future implications, action plan). For internal 组织者 use. Distinct from 活动总结模板 (which is for external/archival). |

### 申报材料模板/

| File | YAML type | Abstract |
|------|-----------|----------|
| `申报材料模板/README.md` | `index` | Template library root index. 3 categories: 工作记录类 (三会一课), 宣传材料类 (posters/articles), 其他模板 (activity summary, branch info). |
| `申报材料模板/工作记录类/README.md` | `index` | Index for work-record templates. Primary item: `党支部工作记录.docx` (三会一课 mandatory form). |
| `申报材料模板/宣传材料类/README.md` | `index` | Index for publicity material templates (to be populated). |
| `申报材料模板/其他模板/README.md` | `index` | Index for other templates: activity summary + branch basic info. |
| `申报材料模板/其他模板/活动总结模板.md` | `模板` | 8-section activity summary template for external/archival use. Includes photo requirements (≥10, 1920×1080), word-count specs (800-2000 chars in 3 tiers), submission instructions (3 days, to public mailbox or 宣传委员). Distinct from 活动复盘模板 (which is internal). |
| `申报材料模板/其他模板/支部基本信息模板.md` | `模板` | Branch basic-info card for申报材料. Contains: org info, 6-member committee table, member-count placeholders, 3-group setup (学术组/就业组×2), 支部特色 (条条/块块, 3 building threads), 组织意图. Updated each semester by 宣传委员. |

---

## 3. Human Panel — Binary Files (PDF / DOCX)

These files **cannot be read directly by AI agents**. The table records their content and transcription status.

| File | Format | Content Summary | Transcribed Into | AI Access |
|------|--------|----------------|-----------------|-----------|
| `党小组会/20251130党支部月度会议-发布版.pdf` | PDF | November 2025 monthly branch meeting report. **Primary source document** for A/B activity classification, 条条/块块 dual-management principles, and the 11-point SOP reform decisions (including the 2026-02 responsibility transfers). | `流程指南/常见工作场景快速指南.md` (场景1A/1B), `流程指南/支委与党小组定人定责定岗说明.md`, all three 块块委员 work guides | ⚠️ Not directly readable. Core decisions fully transcribed. |
| `党小组会/光华管理学院本科生党支部关于成立党小组的说明-2505.docx` | DOCX | Founding document for the 3-group party small-group structure (2025 edition). Defines the rationale, group definitions, and leadership structure. | `流程指南/支委与党小组定人定责定岗说明.md` §1 (人员结构与双重身份体系) | ⚠️ Not directly readable. Core content transcribed. |
| `党小组会/党建活动SOP流程图-初版-白文琦&孙睿.pdf` | PDF | Initial draft SOP flowcharts by 白文琦 & 孙睿. **Superseded** by the current Mermaid diagrams. | **Superseded** by `流程指南/工作流程图-定人定责定岗.md` — no extraction needed | ⚠️ Not directly readable. **Archived, not operationally relevant.** |
| `官方文件/【附件11】中国共产党章程.pdf` | PDF | CPC Constitution. Foundational policy document governing all party organizations and activities. | Not transcribed — general knowledge assumed | ⚠️ Not directly readable. Referenced for overall compliance. |
| `官方文件/【附件12】党支部工作规范（学生）.pdf` | PDF | Student party branch work standards. Specifies formal procedures for branch meetings and activities. Referenced by `scenarios/activity_rules_enforcement.md` (C8) for A-class activity verification. | Not transcribed | ⚠️ Not directly readable. Use to verify 场景1A steps against official standard. |
| `官方文件/【附件14】中国共产党党员教育管理工作条例（2019年5月21日）.docx` | DOCX | CPC Member Education & Management Regulations (2019). Governs 思想汇报 requirements and member development procedures. | Not transcribed | ⚠️ Not directly readable. Compliance reference for member development. |
| `官方文件/【附件15】中国共产党发展党员工作细则（2014年）.docx` | DOCX | CPC Member Development Detailed Rules (2014). Governs the formal process from activist to party member. | Not transcribed | ⚠️ Not directly readable. Compliance reference for member development flow. |
| `官方文件/【附件16】中国共产党普通高等学校基层组织工作条例（2010年8月13日）.docx` | DOCX | CPC Regulations on Basic Organization Work in Higher Education (2010). Governs branch organizational structure and election procedures. | Not transcribed | ⚠️ Not directly readable. Compliance reference for organizational procedures. |
| `官方文件/【附件17】中国共产党支部工作条例（试行）（2018年10月28日）.docx` | DOCX | **CPC Branch Work Regulations (Trial, 2018).** The most directly applicable official document. Formally defines 组织生活会 (A-class) procedures. Referenced by `scenarios/activity_rules_enforcement.md` (C8) as the authoritative standard for 场景1A steps. | Not transcribed | ⚠️ Not directly readable. **Consult to validate 场景1A 12-step procedure for compliance.** |
| `支部委员会/支委工作手册26春.docx` | DOCX | Spring 2026 branch committee work manual. Comprehensive job descriptions and working procedures for all committee members. **Source document** whose directives were implemented in the `流程指南/` SOP files. | Operational core transcribed into `流程指南/` docs. | ⚠️ Not directly readable. Original manual may contain administrative detail beyond current SOP Markdown files. |
| `申报材料模板/工作记录类/党支部工作记录.docx` | DOCX | Standard **三会一课 work record form** (.docx). The mandatory template for all 三会一课 archiving. Cannot be AI-read but its existence and usage instructions are documented throughout the SOP. | Usage documented in: `流程指南/宣传委员工作流程指南.md` §2, `流程指南/常见工作场景快速指南.md` 场景1A, `_quick_cards/card-01-组织活动.md`, `_quick_cards/card-02-会议记录.md` | ⚠️ Not directly readable. **Operational reference only — AI cannot validate form content.** |

---

## 4. Coverage Gap Register

| # | Gap | Impact | Recommended Action |
|---|-----|--------|-------------------|
| G1 | 官方文件/ PDFs and DOCXs have no Markdown abstracts | Medium: AI cannot verify A-class activity procedural steps against official text | Low priority. These are standard CPC public documents; context is inferable from titles. Create a brief Markdown abstract only if a future SOP revision requires line-by-line official text verification. |
| G2 | `支委工作手册26春.docx` may contain administrative details not yet transcribed | Low: current SOP Markdown files are operationally complete | Track: when the manual is updated, transcribe any new operational changes into the relevant `流程指南/` files and update REVIEW_STATE. |
| G3 | `_quick_cards/card-01-组织活动.md` predates the A/B activity restructuring (last_updated 2026-02-17, Session 4 was 2026-02-21) | **Medium: card shows a simplified 5-step flow without 1A/1B distinction, potentially misleading users** | **Logged as W5 in REVIEW_STATE.** Update the card to reflect A-class vs B-class distinction in a future session. |
| G4 | `流程指南/工作流程图-定人定责定岗.md` §3 (党小组活动流程) predates A/B restructuring | Medium: generic flowchart does not show 1A/1B split | Already tracked in REVIEW_STATE as pending task (修改1 note: "流程图待下一轮更新"). |

---

**Version:** 1.0  
**Owner:** 储子禾  
**Last updated:** 2026-02-22
