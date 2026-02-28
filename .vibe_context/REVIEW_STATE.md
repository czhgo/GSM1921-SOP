# REVIEW STATE — Single Source of Truth

> **Role:** Tracks all code-modification progress across sessions.  
> **Update policy:** Updated at step 5 of the SOP after every atomic change.  
> **Reading policy:** Always re-read this file at the start of every session (SOP step 2).  
> **Source:** Logic migrated from `_review/书记审阅记录.md` (审阅日期 2026-02-17, 书记储子禾).

---

## 📐 指令维度说明 (Directive Dimensions)

> This taxonomy governs how every constraint, rule, and issue is classified and inherited across sessions and scenarios.

| Dimension | Definition | Storage |
|-----------|-----------|---------|
| **Permanent Principles (永久原则)** | Bottom-layer constitutional rules written into `WORKFLOW_MASTER.md` (e.g., Occam's Razor anti-formalism). These **always** apply regardless of scenario, operation mode, or scope. They cannot be suspended by scenario files. | `WORKFLOW_MASTER.md` → `### Permanent Design Principles` |
| **Global Constraints (全局通用约束)** | Business rules that affect **all** activities and all scenarios (e.g., 考察档案 归组织委员, 意见反馈平台 归纪检委员). Active in both Strict and Sandbox modes. | `REVIEW_STATE.md` → Watchlist / Suspended Issues with `[Global]` tag |
| **Role/Delegation Constraints (职务分工约束)** | Adjustments to specific committee member responsibility boundaries. A sub-class of Global Constraints that specifically governs **who** does **what**. | `REVIEW_STATE.md` → Watchlist with `[Global]` tag + role annotation |
| **Scenario-Specific Constraints (特定场景约束)** | Rules that only apply within a specific activity type or scenario (e.g., 场景1 A/B classification rules). Suppressed in Sandbox mode when working on unrelated scenarios. | `REVIEW_STATE.md` → Watchlist / Suspended Issues with `[Scenario-X Only]` tag |

---

## ⚙️ Current Operation Mode: **[Sandbox]**

> 当处于 **Sandbox** 模式处理新场景（如场景2–9）时，仅继承 `[Global]` 级的 W/H 约束，暂不合并 `[Scenario-1 Only]` 的约束，避免特殊性与普遍性混淆。  
> 切换至 **Strict** 模式时，所有 W/H 约束（包括 Scenario-Specific 项）均对当前任务生效。

---

## 📊 Overall Progress

| Category | Total | ✅ Done | 🔄 In Progress | ⏳ Pending |
|----------|-------|---------|---------------|-----------|
| Pending Modification Tasks | 14 | 11 | 0 | 3 |
| Agent Watchlist Issues | 5 | 5 | 0 | 0 |
| Suspended Issues (DO NOT TOUCH) | 3 | — | — | 3 |

---

## 🗂️ Scenario Execution Status

| Scenario | File | Status | Last Updated | Notes |
|----------|------|--------|-------------|-------|
| Activity Rules Enforcement | `scenarios/activity_rules_enforcement.md` | ⏳ Pending | — | 主场景：场景1 A/B类拆分 |
| SOP Restructuring | `scenarios/sop_restructuring.md` | ⏳ Pending | — | 依赖 Activity Rules 完成后执行 |
| YAML Metadata Fix | `scenarios/yaml_metadata_fix.md` | ✅ Done | 2026-02-21 | 5个根节点文件已注入frontmatter |

---

## ✅ Pending Modification Tasks

> Extracted from `_review/书记审阅记录.md` 场景1 逐条修改意见.  
> Execute via scenario `activity_rules_enforcement.md` or `sop_restructuring.md` as indicated.

### 🔴 高优先级

- [x] **修改1**｜场景1 拆分为 1A 和 1B 两个子流程 — 在`流程指南/常见工作场景快速指南.md`中将场景1保留为总入口并新增1A（组织生活会）、1B（灵活学习活动）子流程；`工作流程图-定人定责定岗.md`第3节同步拆分（流程图待下一轮更新）
- [x] **修改2**｜补充 A 类活动（组织生活会）的12步标准程序 — 含会前谈心、对照检查、签到、自评互评、会议记录归档、宣传产出；需核查`官方文件/`中条例原文
- [x] **修改3**｜补充 B 类活动（灵活学习活动）的11步完整流程 — 含活动发起两种路径、组长审批、联系块块、实施、复盘、归档

### 🟡 中优先级

- [x] **修改4**｜宣传规范统一说明 — 在`流程指南/宣传委员工作流程指南.md`中增加「按活动类型的宣传规范」章节，明确A类（摘要+配图）与B类（活动摘要+配图）差异；两者均不需要宣传预热
- [x] **修改6**｜活动方案报备须过组长 — B类流程增加「组长审批」节点（Step 2）；A类由组长/书记发起天然包含审批
- [x] **修改7**｜时间线补充 — B类流程表格增加「时间节点」列；外出活动标注「2天前建群+人员到位」硬性要求；复盘1周内
- [x] **修改8**｜补充模板链接 — 场景1A链接`申报材料模板/工作记录类/党支部工作记录.docx`；场景1B链接`活动复盘/活动复盘模板.md`和`申报材料模板/其他模板/活动总结模板.md`
- [x] **修改9**｜补充活动当天Check清单 — B类Step 7后附室内清单（签到/拍照≥3张/活动记录/材料收齐）和外出清单（人员清点/安全须知/交通确认/拍照/返回清点）
- [x] **修改10**｜A类活动产出物清单 — 场景1A末尾增加checklist（会议记录/签到表/对照检查材料/宣传摘要+配图）
- [x] **修改11**｜B类活动考勤定性 — 明确写出「弹性考勤」；组织者和深度参与者出席必须；一般参与者以鼓励为主

### 🟢 低优先级

- [x] **修改5**｜"深度参与者"/"组织者"概念不需要重新定义 — 首次出现时标注「详见[纪检委员工作流程指南]」；概念仅针对党员（中共党员和预备党员）
- [x] **修改12**｜跨组参与规则 — B类注意事项中增加：优先本组→限额未满可邀他组→普通参与者一并考勤；⚠️ 标记悬置问题H1
- [ ] **修改13**｜外出活动特殊注意事项 — B类流程增加：安全保障、交通方式（用车审批）、经费管理，链接已有流程图
- [ ] **修改14**｜品牌活动与非品牌活动发起方式 — 场景8增加两种路径（有品牌→组长招募；无品牌→支书及组长沟通低成本活动）；场景1B「活动发起」步骤简要提及

---

## 🔍 Agent Watchlist（块块委员分工优化 — 修改时必须核查并反馈）

> Extracted from `_review/书记审阅记录.md` §「块块委员分工优化反馈」.  
> When any of these conflicts is encountered during execution, **flag it explicitly** in this table before proceeding.  
> **Sandbox mode:** Only `[Global]` items are inherited when working on scenarios 2–9.

| # | Scope (作用域) | 监查问题 | 涉及文件 | 状态 |
|---|---------------|---------|---------|------|
| W1 | `[Global]` | **考察档案归属**：2026年2月已将考察档案从纪检委员转给组织委员，需确保所有文件一致（不得出现纪检负责考察档案的表述） | `组织委员工作流程指南.md` / `纪检委员工作流程指南.md` | ✅ 已解决（Session 9：常见工作场景快速指南场景3+6、纪检委员指南TOC修正） |
| W2 | `[Global]` | **意见反馈平台负责人**：当前文档中部分写纪检委员、部分写组织委员，需统一为同一负责人 | `常见工作场景快速指南.md` / `组织委员工作流程指南.md` / `纪检委员工作流程指南.md` | ✅ 已解决（Session 9：统一为纪检委员，纪检指南恢复§4.2，支委说明/README同步更新） |
| W3 | `[Scenario-1 Only]` | **宣传委员角色差异**：A类活动宣传委员以「档案归档」为主；B类活动宣传委员以「指导宣传负责人」为主；两种角色不应混用 | `宣传委员工作流程指南.md` | ✅ 已解决（Session 5，新增 §3.0） |
| W4 | `[Scenario-1 Only]` | **块块委员触发时机差异**：A类活动纪检委员考勤为刚性全程参与；B类为弹性。此差异须体现在各委员工作手册中 | `纪检委员工作流程指南.md` | ✅ 已解决（Session 12：纪检指南明确A类三会一课刚性/B类极简备忘录机制，§2.4新增，§1.1表格更新）|
| W5 | `[Scenario-1 Only]` | **快速卡片未更新**：`_quick_cards/card-01-组织活动.md` (last_updated 2026-02-17) 使用简化5步流程，未反映Session 4引入的A类/B类（1A/1B）拆分。其他卡片亦需核查 | `_quick_cards/card-01-组织活动.md`（其他卡片待查） | ✅ 已解决（Session 9：彻底重写为A/B双路径卡片） |

---

## ⏸️ Suspended Issues — DO NOT TOUCH

> Extracted from `_review/书记审阅记录.md` §「悬置问题清单」.  
> **STRICT CONSTRAINT: The Agent MUST NOT modify or attempt to resolve these issues in any session until explicitly unlocked by the 书记.**  
> **Sandbox mode:** Only `[Global]` items are inherited when working on scenarios 2–9.

| # | Scope (作用域) | 问题 | 涉及文件 | 悬置原因 |
|---|---------------|------|---------|---------|
| H1 | `[Scenario-1 Only]` | 跨组参与时，组织者的考察如何协同？ | `纪检委员工作流程指南.md` | 书记指示先悬置，后续另行讨论 |
| H3 | `[Global]` | 党小组工作手册（条条委员专用）尚未建设 | 待新建文件 | 本轮先通过SOP规定条条职责 |
| H4 | `[Scenario-1B Only]` | **外出活动经费审批链路不明**：场景1B及骨架II外出子流程均提及"经费按支部经费管理规定执行"，但(a)支部经费管理规定尚未建立；(b)条条组长可自主审批的经费上限不明；(c)何时须报支委会审批未规定。属[Role/Delegation Constraints]维度。 | `流程指南/常见工作场景快速指南.md` / `流程指南/工作流程图-定人定责定岗.md` | Session 14 条条断点侦测发现，待书记裁定审批规则后解锁 |

---

## 🐛 AI-Identified Issues

| # | File | Line | Severity | Description | Status |
|---|------|------|----------|-------------|--------|
| — | — | — | — | _(None identified yet)_ | — |

---

## 📋 Session Log

| Session # | Date | Scenario | Changes Made | Outcome |
|-----------|------|----------|-------------|---------|
| 0 | 2026-02-21 | — | Initialized `.vibe_context/` architecture | ✅ Done |
| 1 | 2026-02-21 | yaml_metadata_fix | Injected YAML frontmatter into 5 root node files | ✅ Done |
| 2 | 2026-02-21 | — | Migrated `_review/书记审阅记录.md` → REVIEW_STATE; upgraded WORKFLOW_MASTER to v1.1; replaced generic scenarios with domain-specific scenarios; deleted `_review/` | ✅ Done |
| 3 | 2026-02-21 | sop_restructuring | Added `## 🤖 AI 协同工作流` section to `START_HERE.md`; includes Standard Invocation Prompt and Review Inbox workflow in Chinese | ✅ Done |
| 4 | 2026-02-21 | yaml_metadata_fix + activity_rules_enforcement | Phase1: injected YAML frontmatter into 5 more files (_quick_cards/README.md + 申报材料模板/4×README); Phase2: restructured 场景1 into 总入口+1A+1B in 常见工作场景快速指南.md; completed 修改1-3,5-12 | ✅ Done |
| 5 | 2026-02-21 | sop_restructuring | Created EXECUTION_LOG.md; updated WORKFLOW_MASTER SOP Step 6 + Standard Output Templates; added §3.0 按活动类型的宣传规范 to 宣传委员工作流程指南.md; resolved W3 | ✅ Done |
| 6 | 2026-02-22 | — | Added `## 🗺️ Dual-Panel Reference Map` section to WORKFLOW_MASTER v1.3: explicit storage paths, invocation methods, trigger conditions for both panels; 一改俱改 coupling mechanism table + validation gate | ✅ Done |
| 7 | 2026-02-22 | — | Created CONTENT_MAP.md: dual-purpose architecture declaration, annotated Markdown index (25 files), binary file registry (11 files), coverage gap table (G1-G4); added W5 to REVIEW_STATE Watchlist; updated WORKFLOW_MASTER v1.4 (SOP Step 2b + AI Panel storage paths) | ✅ Done |
| 8 | 2026-02-22 | Control Plane Refactoring | Added Operation Mode status bit (Sandbox/Strict) to REVIEW_STATE header; added Scope column to Watchlist (W1-W2→Global, W3-W5→Scenario-1 Only) and Suspended Issues (H1→Scenario-1 Only, H2-H3→Global) | ✅ Done |
| 9 | 2026-02-22 | Global Audit + Debt Resolution + Vision Declaration | Step1: C5/C6 in sop_restructuring+activity_rules_enforcement → dynamic scope-aware; Step2: W1+W2 resolved (6 files updated); Step3: W5 resolved (card-01 rewritten A/B); Step4: Vision declaration added to README.md | ✅ Done |
| 10 | 2026-02-22 | Template Razor & Feedback Channel (H2 Unlocked) | Razor-cut 3 MD templates (活动复盘/活动总结/支部基本信息 v1→v2, -75% lines); created _quick_cards/SOP优化提案反馈卡.md; added feedback card notice to START_HERE.md; H2 removed from Suspended Issues | ✅ Done |
| 11 | 2026-02-23 | Constitution Upgrade & Taxonomy Sync | WORKFLOW_MASTER v1.5: Permanent Principle 5 (Occam's Razor) added; REVIEW_STATE v2.0: Directive Dimensions table added; SOP优化提案反馈卡 v1.1: §1 Scope rewritten to 4-dimension taxonomy | ✅ Done |
| 12 | 2026-02-28 | Role Refactoring & Blind Spot Eradication | Step1: 工作流程图§5+定人定责说明§六场景3 盲区修复（纪检→记录并移交；组织委员→建立档案；倒查法归属更正）; Step2: 组织委员指南v1.1（培训班领队/党委办公室助理/终极归档中心/公域发令边界）; 纪检委员指南v3.1（党日活动指导者/§2.4极简备忘录机制/§1.1表格更新）; Step3: 常见工作场景快速指南v1.4（场景1B Step4公域发令+Step6私域督办+注意事项两条新规则）; W4 ✅ 出清 | ✅ Done |
| 13 | 2026-02-28 | SemVer Enforcement & Terminology Refactoring | Step1: WORKFLOW_MASTER v1.6 — Principle 6 (SemVer严格递增规范) 新增; Step2: 全局命名空间重构 — A类→组织生活会 / B类+灵活学习活动→党小组主题党日活动，涉及8个文件（常见工作场景快速指南v1.5/宣传委员指南v1.3/纪检委员指南v3.2/card-01/反馈卡v1.2/活动复盘模板v2.1/CONTENT_MAP v1.1/scenarios/activity_rules_enforcement）; Step3: REVIEW_STATE v2.2+EXECUTION_LOG 同步 | ✅ Done |
| 14 | 2026-02-28 | Topology Refactoring & Logic Gap Detection | Step1: 工作流程图v1.1→v1.2 — 三大核心骨架重构（骨架I组织生活会/骨架II党日活动含条件分支/骨架III党员发展）；旧§3通用图→骨架I；新增骨架II；旧§5→骨架III（纪检只记录移交）；旧§6党团班一体化→整合入骨架II分支2；旧§4制度建设→重编§6；§1/§2/§7/§8/§10保留并附说明；矩阵§9更新考察档案归属行; Step2: REVIEW_STATE v2.3 — 新增悬置H4（外出经费审批规则）；Suspended Issues 2→3 | ✅ Done |
| 15 | 2026-02-28 | Read & Triage — Priority Decision Inbox | 零业务规则修改。全库深度扫描：提取P0（H1/H3/H4三项悬置，各提供2-3个业务选项）、P1（修改13外出注意事项缺失变量清单、修改14品牌路径缺失变量清单）、P2（六项未触达边缘场景：党员发展异常/预备党员转正异常/组织生活会流程中断/场景4无申诉机制/场景文件状态错位/CONTENT_MAP G1-G2缺口）。Priority Decision Inbox 已在聊天窗口输出供书记决断。 | ✅ Done |
| 16 | 2026-02-28 | Constitution Upgrade: Ripple Sync Protocol | WORKFLOW_MASTER v1.6→v1.7：Step1 新增Principle 7（单一事实来源与衍生品同步，母本/下游衍生品层级+Ripple Sync四步Action）；Step2 一改俱改Coupling表格`SOP text modified in 流程指南/`行升级为含Mandatory Ripple Check的三步规则；Step3 R2新增UNLESS豁免条款（Ripple Sync触发时必须同步所有下游衍生品）；补全Principle 5标题。 | ✅ Done |

---

**Version:** 2.4  
**Owner:** 储子禾  
**Last updated:** 2026-02-28
