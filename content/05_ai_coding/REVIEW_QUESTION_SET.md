---
title: "审查问题集 v1——从 36 个 spec 与 42 个批次倒查出的可复用判据"
type: guide
role: "[工程师]+[AI]"
last_updated: "2026-10-25"
status: active
---

# 审查问题集 v1

> **定位：** 这不是又一份审查方法论，而是把 `.trae/specs` 36 个 spec、执行日志最近 42 个批次、14 份审计报告中的**用户反馈原句 / 根因 / 修复动作**倒查成一张可逐条回答的清单。
> **与 `PARALLEL_SKILL_AUDIT.md` 的关系：** 后者管「怎么分 lens、怎么汇总、怎么裁定」；本文管「每轮开工前必须先回答什么」。两者串联顺序见 `PARALLEL_SKILL_AUDIT.md §0`。
> **read_strategy：** `on-demand`——每轮审查开工时读；日常任务不需要常驻。
> **规模：** 四组 16 条（语义 4 / 状态 4 / 闭环 4 / 结构 4）＋ 低频高危 5 条，共 **21 条**。

---

## 怎么用

1. **先逐条回答，再分 lens。** 对 Q-01…Q-21 每条给出三选一：`有`（本轮范围存在该问题）/ `无`（已核对不存在）/ `不适用＋理由`（说明为什么该问题不可能出现在本轮范围）。不允许只写「已关注」「基本一致」。
2. **回答必须带证据。** `有` 给 `文件:行号`、批次号或审计条目；`无` 给核对过的范围（页面/文件清单）；`不适用` 给范围理由。证据口径沿用 `PARALLEL_SKILL_AUDIT.md §4`。
3. **再分 lens。** 问题集回答完成后，才按本轮主题选 3 路 lens；问题集里答「有」的条目优先成为四个待回答问题的输入，答「无」的条目不再重复开题。
4. **输出命中矩阵才算完成。** 每轮开工时先填本轮在 `QUESTION_HIT_MATRIX.md` 的一行：`●` 本轮命中并处理 / `○` 本轮范围不适用 / 空白 本轮未问；填完才进入分 lens。未填矩阵的轮次不算完成。
5. **空白不是免责。** 空白只表示「当时没问」，不代表「当时没缺陷」；下一轮若范围相同，应优先补问上一轮空白最多的 3 条。

---

## 一、语义（单一源）· Q-01…Q-04

### Q-01 同一语义只有一个名称与一个入口

- **判据：** 同一动作 / 对象 / 状态，在页签、按钮、标题、提示、能力注册与代码常量中是否只有一个用户可见名称，并且只从一个入口触发？
- **真实反例：** 批次 508 纪检同一「确认考勤」同时出现「打包确认」「一次确认所选」「去考勤管理」「去处理」四种叫法（`.ctx/logs/2026-10-AUDIT_R8_THREE_COSTS.md` §二 B）；批次 502 页面写「跨组承办」而制度口径是「跨组招募」（`.ctx/logs/2026-10-EXECUTION_LOG.md` 批次 502）；`polish-workbench-visual-language` 中分组名「知情查看」与组内页签「知情查看」逐字相同。
- **机检守卫：** `copy-master-guard.test.mjs`、`copy-screen-guard.test.mjs`（同义句/重复词基线）；人工检查点：用能力注册表逐台对照页签、页内标题、按钮文案。
- **误报边界：** 六台同名「工作概况」「待办」是同一语义的不同权限面，不算多名称；同一动作面向不同角色给不同落点也不违反本条（落点问题归 Q-09）。
- **来源轮次：** `audit-round2-minimum-three-costs`、`polish-workbench-visual-language`、`run-round6-7-audits-and-cross-group-hosting`、`run-round8-9-audits-and-polish`；批次 502、503、508。

### Q-02 同一事实只有一个权威源与一个写口

- **判据：** 同一业务事实是否存在两个及以上可写落点，或读侧消费镜像而写侧改主源却不同事务同步？
- **真实反例：** R9 审计发现活动归档后对应工作组仍为 `active`，成员/授权/任务仍可写（`.ctx/logs/2026-10-AUDIT_R9_DATA_STRUCTURE.md` §〇 P1-1）；R10 审计发现 `seed-manifest` 把用户编辑字段仍列为 `seedOwnedFields`，刷新即回滚（`.ctx/logs/2026-10-AUDIT_R10_DATA_LIFECYCLE.md` §二）；批次 500 用 33 表逐字段对照才发现 mock 与 API 结构漂移。
- **机检守卫：** `mock-api-parity-structure.test.mjs`、`seed-drift.test.mjs`、`db-integrity-guard.test.mjs`；人工检查点：维护一张「权威表与字段 / 写口 / 读口 / 派生或存储」矩阵（R9 §一 的格式）。
- **误报边界：** 单向镜像允许存在（如 `workgroups` 为主源、`activities.assignments` 为兼容镜像），但必须只写主源、同事务同步；迁移期 legacy 字段有期限的兼容不算第二写口。
- **来源轮次：** `advance-r10-data-lifecycle`、`implement-r9-schema-plan`、`assign-cross-group-activity-to-party-group`、`round5-dirty-audit-and-truth-baseline`、`run-round8-9-audits-and-polish`；批次 499、500、503、504。

### Q-03 颜色与令牌语义正交

- **判据：** 每个颜色是否只承担「行动 / 状态 / 身份 / 结构」之一；主题色、活动类别色、链接色、按压色是否各有唯一来源，互不借用？
- **真实反例：** 批次 507 `--surface-active` 取党建红浅底 `#FEE2E2`，约 20 个中性组件的 `:active` 共用它，点任何中性按钮都闪红（`.ctx/logs/2026-10-EXECUTION_LOG.md` 批次 507 §一）；批次 508 `login.html:63` 的 `.login-btn:hover` 把深色实底刷成 `#F3F4F6`；R5-C 审计发现「逾期」在今天页是 error 红、在待办是 warning 琥珀（`.ctx/logs/archive/2026-10/AUDIT_R5_C_FRONTEND_DESIGN.md` C-05）。
- **机检守卫：** `theme-palette-guard.test.mjs`、`link-color-guard.test.mjs`、`hover-state-guard.test.mjs`、`ui-contrast-guard.test.mjs`、`activity-tone-guard.test.mjs`。
- **误报边界：** 党徽金 `#FFD700`、三会一课党建红 `#CE1126` 等固定语义色不随主题变化，不算混用；`badge--info` 的信息态蓝允许保留。
- **来源轮次：** `redesign-theme-palette-and-density`、`restore-homepage-brand-and-gold`、`unify-link-and-press-states`、`unify-field-shell-and-interaction-states`、`polish-workbench-visual-language`；批次 506、507、508。

### Q-04 名实一致

- **判据：** 页签名、页内标题、对象名、数据口径是否指向同一对象与同一范围？
- **真实反例：** `upgrade-workbench-page-quality` 中页签叫「支部监控台账」、页内叫「支部动态」；R5-C 审计发现今天页分区标题「活动管理」与页签「活动管理」同名不同义（C-17）；R8 真机发现页内 H2 与页签完全同名但不承担新的范围或权限信息（`.ctx/logs/2026-10-AUDIT_R8_THREE_COSTS.md` §三-4）。
- **机检守卫：** `page-title-guard.test.mjs`、`doc-consistency.test.mjs`、`workbench-revision-contract.test.mjs`；人工检查点：抽一台工作台，从页签栏读到页内标题，确认没有第二个同级页面标题。
- **误报边界：** 页内 H2 与页签同名且承担范围/权限说明时允许；但不得逐字重复页签名而无新信息。
- **来源轮次：** `upgrade-workbench-page-quality`、`audit-round3-modals-and-ia`、`run-round8-9-audits-and-polish`；批次 502、508。

---

## 二、状态（正交）· Q-05…Q-08

### Q-05 状态判据唯一且现算

- **判据：** 同一状态是否只有一处判定；可现算的状态是否被存成布尔快照，导致不同页面各算一次？
- **真实反例：** R7 审计发现考勤/复盘的 `overdue` 是记录上的布尔快照，成员台读快照、纪检台又按日期现算，同一记录两结果（`.ctx/logs/2026-10-AUDIT_R7_DATA.md` R7-33）；R10 审计发现组长台用 `confirmer === '—'` 判待确认，与纪检台「自动确认」判据冲突（A08）；R10 B01–B03 中 SOP 仍按 T+7 生成任务，而制度参数是 10 天。
- **机检守卫：** `state-enum-guard.test.mjs`、`data-lifecycle-guard.test.mjs`、`attendance-batch.test.mjs`；人工检查点：列出该状态的「页面筛选 / 授权 / 写口校验」三处实际取值，确认同源。
- **误报边界：** 制度规定的冻结快照（应到名单、表决名单）允许存储；显示用快照（`sourceName`）允许只读保留，但不得参与判据。
- **来源轮次：** `audit-information-architecture-critical`、`run-round8-9-audits-and-polish`、`advance-r10-data-lifecycle`；批次 488、503、504。

### Q-06 交互态正交

- **判据：** `hover` / `active` / `selected` / `focus-visible` 是否各有专用令牌，且「选中」不由 hover 或 active 令牌表达？
- **真实反例：** 批次 508 待办选中行 `#F3F4F6`、日历选中格 `#E5E7EB`、二级页签近黑，三种「选中」三种灰（`.ctx/logs/2026-10-EXECUTION_LOG.md` 批次 508 §六样本 1）；批次 507 中性按钮 `:active` 复用党建红；批次 506 hover 仍用 `filter/opacity`，且无 `@media (hover:hover)` 门控。
- **机检守卫：** `hover-state-guard.test.mjs`、`ui-control-system-guard.test.mjs`、`ui-motion-guard.test.mjs`。
- **误报边界：** 侧边栏选中保留浅灰是批次 508 明确裁定的唯一豁免；信息态按钮 hover 只改颜色不算混用。
- **来源轮次：** `redesign-theme-palette-and-density`、`unify-link-and-press-states`、`unify-field-shell-and-interaction-states`；批次 506、507、508。

### Q-07 状态完备且失败不报成功

- **判据：** 加载 / 空 / 失败 / 只读 / 禁用是否各有独立可见态；失败分支之后是否仍会出现成功提示？
- **真实反例：** R8 真机纪检确认考勤 `POST /snapshot` 返回 403，界面当场乐观更新为 14 条，toast 只写「未保存成功，请稍后重试」，刷新回滚到 15 条（`.ctx/logs/2026-10-AUDIT_R8_THREE_COSTS.md` §二 B）；R11 审计发现 `activity-entry.js:657-660` catch 后仍报成功（`.ctx/logs/2026-10-AUDIT_UI_R11.md` P0-03）；`unify-field-shell-and-interaction-states` 中 `archive.html` 点击归档后是空页。
- **机检守卫：** `feedback-integrity.test.mjs`、`modal-contract.test.mjs`、`field-shell-guard.test.mjs`、`frontend-foundations-guard.test.mjs`（F9 写口失败不得提示成功）。
- **误报边界：** 纯本地偏好保存不需要远端失败态；确认弹窗的「取消」不是失败；后端异步投递允许短延迟，但页面必须显示「处理中」。
- **来源轮次：** `refine-ui-system-and-close-r10`、`unify-field-shell-and-interaction-states`、`run-round8-9-audits-and-polish`；批次 505、508。

### Q-08 状态可静态回读

- **判据：** 选中 / 展开 / 必填 / 错误 / 当前页能否从 DOM 语义（`aria-selected`、`aria-pressed`、`aria-expanded`、`aria-invalid`、`aria-current`）静态读出，而非只靠 class 或颜色？
- **真实反例：** R5-A 审计发现考勤分段钮、受众 chip 只切换 class，无 `aria-pressed`（`.ctx/logs/archive/2026-10/AUDIT_R5_A_WEB_GUIDELINES.md` R5A-20/21）；R8 真机从待办跳到考勤后 `document.activeElement = BODY`、命中高亮为空；Round 2 L-B07 校验失败只弹 toast，无 `aria-invalid` 与字段关联。
- **机检守卫：** `a11y-tree.test.mjs`、`field-shell-guard.test.mjs`、`modal-contract.test.mjs`；人工检查点：只用键盘 + 读屏走一遍本轮主任务。
- **误报边界：** 纯展示行不需要 `aria-selected`；原生 `checkbox` 的 `checked` 已足够，不强制自定义 `aria-checked`。
- **来源轮次：** `round1-workbench-structure-remediation`、`audit-round2-minimum-three-costs`、`refine-interface-and-unify-student-id`、`unify-field-shell-and-interaction-states`；批次 484、487、492、508。

---

## 三、闭环（落点与反馈）· Q-09…Q-12

### Q-09 入口落点真实且角色化

- **判据：** 每个可点入口是否指向「该角色 + 该对象 + 该步骤」的真实承载面；没有承载面时是否不渲染入口？
- **真实反例：** IA 审计材料页「考勤」一律链 `disc.html?tab=attendance`，组长组织者被弹回 `leader.html` 且丢失 tab/对象（`.ctx/logs/archive/2026-10/AUDIT_IA_CRITICAL.md` §一 C01）；批次 508 活动详情「复盘」落到 `talent/archive` 假入口；批次 498 宣传台原「归档活动」动作被撤，因为母本只给宣传委员材料归档。
- **机检守卫：** `material-link-truth.test.mjs`、`link-integrity.test.mjs`、`link-target-guard.test.mjs`、`archive-action-guard.test.mjs`。
- **误报边界：** 同一对象面向不同角色可以有不同落点，不算多入口；`null` 行渲染纯文本交接不是死链。
- **来源轮次：** `audit-information-architecture-critical`、`ia-critical-remediation`、`report-parent-and-issue-projection`、`unify-field-shell-and-interaction-states`；批次 488、489、498、508。

### Q-10 深链参数被目标页消费

- **判据：** URL 中的 `tab` / `id` / `activityId` / `highlight` / `focusActivityId` 等参数是否被目标页读取并消费；定位失败是否有可见提示？
- **真实反例：** IA 审计发现 `review&highlight=<rq>` 先被壳清参，页面读 URL 恒空（`AUDIT_IA_CRITICAL.md` §一 F01）；批次 508 `archive.html` 不读任何 URL 参数，`?tab=`、`?id=` 均落默认；R8 待办不带记录 id，落地后需人工二次定位。
- **机检守卫：** `notice-deeplink-guard.test.mjs`、`archive-deeplink-guard.test.mjs`、`ui-home-deeplink.test.mjs`、`link-integrity.test.mjs`。
- **误报边界：** 明确声明为展示快照的 `sourceName` 不要求可定位；参数缺失时回默认 tab 可接受，但不得静默声称「已定位」。
- **来源轮次：** `ia-critical-remediation`、`close-special-projects-batch-500`、`unify-field-shell-and-interaction-states`；批次 489、500、508。

### Q-11 写读同源闭环

- **判据：** 写入成功后，主读口是否立即可见同一值；可编辑字段保存后读侧是否刷新；空字段是否有派生来源或真实写入口？
- **真实反例：** R7 审计发现学号在档案页可改，但 `PATCH /members/:id/profile` 只并入 `users.data`、`users.id` 不变，新学号登不进（R7-01）；「在册备注」有输入框但永远存不进去（R7-02）；批次 501 向导保存成功但重进读不到，根因是读投影只给 `summary`。
- **机检守卫：** `write-path-guard.test.mjs`、`data-lifecycle-guard.test.mjs`、`feedback-integrity.test.mjs`、`mock-api-parity.test.mjs`；人工检查点：保存后不刷新，直接看主读口是否变化。
- **误报边界：** 只读快照字段不要求可写；后台异步派生允许短延迟，但必须显示处理中；显式 `runtimeFields` 之外的种子字段允许修复。
- **来源轮次：** `refine-interface-and-unify-student-id`、`close-special-projects-batch-500`、`advance-r10-data-lifecycle`；批次 492、501、504。

### Q-12 失败与空态有出口

- **判据：** 空态是否「一句状态 + 至多一个下一步」；失败是否可见、可重试、保留输入；破坏性动作是否有确认或回执？
- **真实反例：** R5-B 审计统计 46 处 `emptyMessage`，只有 3 处给下一步（`.ctx/logs/archive/2026-10/AUDIT_R5_B_DESIGN_TASTE.md` F-04）；R5-A 审计发现通知删除单击即物理删除，无确认无撤销（R5A-07）；R5-B 审计发现原生 `confirm/prompt` 仍 45 处，与自有 modal 并存（F-08）。
- **机检守卫：** `feedback-integrity.test.mjs`、`modal-contract.test.mjs`、`modal-escape-guard.test.mjs`、`copy-screen-guard.test.mjs`；人工检查点：空态页与失败路径各走一遍。
- **误报边界：** 纯展示空表可只写「无记录」；破坏性确认已由 `openModal` 统一时，不要求每个动作再写长文案，但必须保留后果句。
- **来源轮次：** `phase2-home-and-urgent-fixes`、`round1-workbench-structure-remediation`、`consolidate-modal-surface`、`refine-ui-system-and-close-r10`；批次 484、485、497、505。

---

## 四、结构（唯一源 / 死码 / 文档分职）· Q-13…Q-16

### Q-13 唯一实现

- **判据：** 对话框 / 列表行 / 表格 / 按钮 / 下拉 / 空态是否只走共享组件；是否存在第二实现或手写同类结构？
- **真实反例：** 批次 497 发现 `docs/src` 仍有 12 处自建浮层 / 7 文件，而唯一浮窗守卫只扫 `openModal(`，白名单为空造成「零例外」假绿（`consolidate-modal-surface`）；R11 审计发现 `.input-flat-sm` 只有 padding/font/radius，无背景、无描边、无 focus（P0-01）；R5-B 审计发现破坏性确认有原生 `confirm`、`modal.js`、自建 popover 三套载体（F-08）。
- **机检守卫：** `ui-modal-form-guard.test.mjs`、`ui-control-system-guard.test.mjs`、`row-markup-guard.test.mjs`、`responsive-cards-guard.test.mjs`。
- **误报边界：** 明确非对话框固定层（toast、同步横幅、锚定 popover）允许不进 `openModal`，但必须进白名单并写理由；表格引擎与手写业务表可按数据形状分流，但同类结构不得有两种写法。
- **来源轮次：** `consolidate-modal-surface`、`refine-ui-system-and-close-r10`、`redesign-theme-palette-and-density`、`rebuild-workbench-density-and-composition`；批次 497、505、506。

### Q-14 无双源 / 死码 / 死数据

- **判据：** 是否还有不可达状态、只写不读字段、零引用类/变量、幽灵账号、已完成条目滞留、过期台账？
- **真实反例：** 批次 506 `taskforce-view.js::_renderTfCard` 仍引用已删常量 `STATUS_COLOR`，整个 tab 渲染抛 `ReferenceError` 退化成空白（`.ctx/logs/2026-10-EXECUTION_LOG.md` 批次 506 §四）；R7-30 `mockDB.users` 仍有 11 条 `u_*` 幽灵账号并进「人员全集」；批次 505 `CLAUDE.md` 乙部滞留 10 条已完成条目。
- **机检守卫：** `dead-selector-guard.test.mjs`、`ctx-hygiene-guard.test.mjs`、`data-lifecycle-guard.test.mjs`、`ui-redundancy-guard.test.mjs`。
- **误报边界：** 迁移期 legacy 字段、旧 id 登录别名为兼容保留，必须写期限；历史只读留痕不算死数据。
- **来源轮次：** `slim-ctx-audit-artifacts`、`refine-ui-system-and-close-r10`、`redesign-theme-palette-and-density`、`advance-r10-data-lifecycle`；批次 505、506、507。

### Q-15 判定值单一源或现算

- **判据：** 角色集合、状态集合、人数、时限、页签计数、默认支部是否来自单一源或按数据现算，而非散落字面量？
- **真实反例：** R7 审计统计缺省支部 `br-b1` 前端 46 处 / 21 文件、服务端 84 处 / 16 文件（`.ctx/logs/2026-10-AUDIT_R7_DATA.md` R7-17）；`function-catalog.js:55-60` 写死 12/10/8/8/10/11 tab（R7-27）；R10 B01–B03 中 SOP 时限写死 T+7，与制度参数 10 天冲突。
- **机检守卫：** `branch-id-literal-guard.test.mjs`、`state-enum-guard.test.mjs`、`test-tier-guard.test.mjs`、`doc-consistency.test.mjs`（页签计数）；人工检查点：新增角色/状态/时限时全仓搜同一字面量。
- **误报边界：** 制度固定常量（党建红、法定会议类型）可保留字面量但必须登记来源；测试夹具允许固定日期；种子里的演示快照需标「演示快照」。
- **来源轮次：** `run-round6-7-audits-and-cross-group-hosting`、`run-round8-9-audits-and-polish`、`advance-r10-data-lifecycle`；批次 502、503、504。

### Q-16 文档分职与验证可信

- **判据：** 规范 / 判例 / 索引 / 过程记录是否各归其位；守卫是否非空转、证据是否可复现、是否以「类名存在」或「留人工」冒充完成？
- **真实反例：** `clarify-doc-scope-and-review-question-set` 指出 `DESIGN_SYSTEM` 把 SD 规则、论证、历史判例、操作步骤写在同一节；批次 497 的守卫只扫 `openModal(` 造成「零例外」假绿；批次 504 如实登记「非单一绿跑取证」；批次 485 把读屏复核从「留人工」改为 Chromium 可访问性树断言。
- **机检守卫：** `doc-consistency.test.mjs`、`docs-governance-guard.test.mjs`、`ctx-hygiene-guard.test.mjs`、`workbench-audit-coverage.test.mjs`、`test-tier-guard.test.mjs`。
- **误报边界：** 判例库允许写边界说明，但不得产生新的 SHALL；无法机检的语义判断可以走人工检查点，但必须写清检查人、样本与结论，不得只写「留人工」。
- **来源轮次：** `clarify-doc-scope-and-review-question-set`、`slim-ctx-audit-artifacts`、`plan-four-round-audit-program`、`consolidate-modal-surface`；批次 497、504、505。

---

## 五、低频高危（不按频次挤掉）

> 下列 5 条在 36 个 spec / 42 个批次里出现次数少（1–2 次），但一次命中的代价是可展示性崩塌、数据丢失或整页不可用；每轮必须单独回答，不得因为「上一轮没提」而跳过。

### Q-17 归档空壳

- **判据：** 归档入口是否落到有内容且消费参数的承载面；点击后是否只是空页、默认页或「找不到」？
- **真实反例：** 批次 508 用户从活动详情点「去归档」带 `focusActivityId`，落到 `archive.html` 后既不展开折叠区也不高亮，页面根本不读 URL 参数（`.ctx/logs/2026-10-EXECUTION_LOG.md` 批次 508 §一、§六样本 4）。
- **机检守卫：** `archive-deeplink-guard.test.mjs`、`link-integrity.test.mjs`。
- **误报边界：** 归档库本身为空是合法空态，只要有「暂无归档 + 下一步」；有内容但目标行不可见才是空壳。
- **来源轮次：** `unify-field-shell-and-interaction-states`、`audit-information-architecture-critical`；批次 508。

### Q-18 深色实底键 hover 变灰

- **判据：** 深色或实底按钮 hover 是否同色相加深，而不是被中性灰/浅灰覆盖？
- **真实反例：** 批次 508 `login.html:63` 的 `.login-btn:hover` 把深色实底刷成 `#F3F4F6`，白字浮在浅灰上（`.ctx/logs/2026-10-EXECUTION_LOG.md` 批次 508 §一）；R11 审计同时发现「主题色变体」文字统一落到近黑 `#1F2937`（P1-04）。
- **机检守卫：** `hover-state-guard.test.mjs`、`theme-palette-guard.test.mjs`。
- **误报边界：** 浅色主题的金底按钮用深色字，hover 同色相加深不算变灰；禁用态灰底不算 hover。
- **来源轮次：** `unify-field-shell-and-interaction-states`、`redesign-theme-palette-and-density`；批次 508。

### Q-19 链接两色

- **判据：** 同一页面的跳转链接是否只有一种链接色；蓝色是否只承担信息态？
- **真实反例：** 批次 507 首页「查看全部 →」用主题色、「完整日历 →」用蓝色；全仓 `<a>` 上 Tailwind 蓝 132 处 / 43 文件，而 `text-accent` 只有 18 处（`.ctx/logs/2026-10-EXECUTION_LOG.md` 批次 507 §一）。
- **机检守卫：** `link-color-guard.test.mjs`（L1–L5）。
- **误报边界：** `badge--info`、状态点、`bg-blue-*` 的信息态蓝保留；带底色的按钮型链接不算文字链接。
- **来源轮次：** `unify-link-and-press-states`；批次 507。

### Q-20 跨端丢写与种子回滚

- **判据：** 语义写口是否在同一事务推进集合版本；种子修复是否只重建基底、不覆盖运行时字段？
- **真实反例：** R10 审计发现系统通知、通用资源 POST/PATCH/DELETE、工作组成员/授权/产出单条写口只改行、不 bump `collection_versions`，另一台设备用旧 baseline 整表快照可把别人刚写的行删掉（`.ctx/logs/2026-10-AUDIT_R10_DATA_LIFECYCLE.md` §二）；批次 504 因此出现「自己刚写的一版把自己挡成 409」；R10 C01–C04 种子修复会把用户改过的标题/正文回滚。
- **机检守卫：** `db-integrity-guard.test.mjs`、`seed-drift.test.mjs`、`mock-api-parity-structure.test.mjs`、`perf-index-equivalence.test.mjs`。
- **误报边界：** 显式 `runtimeFields` 之外的种子字段允许修复；单机 mock 无并发时不触发 409，但版本推进仍须保留。
- **来源轮次：** `advance-r10-data-lifecycle`、`implement-r9-schema-plan`、`run-round8-9-audits-and-polish`；批次 504。

### Q-21 同一用户对象只有一个承载面

- **判据：** 同一用户对象（消息 / 待办 / 通知 / 私信）是否只有一个列表承载面、一个全貌承载面与一套状态机；是否存在页面级兜底把点击导向「首页 / 工作台」而不是对象本身？
- **真实反例：** 本轮 `rebuild-notification-and-data-truth`：消息被拆成公告、系统通知、私信三种投递源与四个承载面（`notice.html` / `messages.html` / `archive.html?tab=notice` / 铃铛下拉），并存三套已读语义、两套归档语义；点击会议通知落工作台首页（`targetModule:'workspace'` ＋ `resolveNoticeUrl` 的 `direct` 直跳，`docs/src/services/governance/notice.js` 旧实现）。
- **机检守卫：** `notice-deeplink-guard.test.mjs`（入口收口 / 坐标必填 / 无 `direct` 直跳 / 无 `resolveNoticeUrl` 导出）、`notice-audience.test.mjs`（N13–N16 逐人状态）、`notice-message.test.mjs`（N5 模型纯函数）；人工检查点：列出该对象的全部入口与列表页，确认只有一个列表、一个全貌，点击均先落全貌。
- **误报边界：** 同一对象面向不同角色可以有不同入口（铃铛 / 侧栏 / 首页卡），但必须指向同一列表或全貌；展示型摘要卡不算第二承载面；系统归档与用户归档是两个状态，不是两个承载面；待办的聚合组与被聚合对象不算同一对象。
- **来源轮次：** `rebuild-notification-and-data-truth`；批次 510。

---

## 附录：样本清单

### A. 36 个 spec（按时间倒序，与矩阵行一致）

`rebuild-notification-and-data-truth`、`clarify-doc-scope-and-review-question-set`、`unify-field-shell-and-interaction-states`、`unify-link-and-press-states`、`redesign-theme-palette-and-density`、`refine-ui-system-and-close-r10`、`advance-r10-data-lifecycle`、`implement-r9-schema-plan`、`run-round8-9-audits-and-polish`、`run-round6-7-audits-and-cross-group-hosting`、`round5-dirty-audit-and-truth-baseline`、`report-parent-and-issue-projection`、`consolidate-modal-surface`、`close-special-projects-batch-500`、`assign-cross-group-activity-to-party-group`、`audit-information-architecture-critical`、`audit-round3-modals-and-ia`、`refine-interface-and-unify-student-id`、`slim-ctx-audit-artifacts`、`ia-critical-remediation`、`migrate-inspection-workgroup-key`、`restore-homepage-brand-and-gold`、`audit-round2-minimum-three-costs`、`round1-workbench-structure-remediation`、`plan-four-round-audit-program`、`generalize-parallel-skill-audit`、`phase2-home-and-urgent-fixes`、`upgrade-workbench-page-quality`、`repair-workbench-blockers-and-findings`、`reflect-minimum-three-costs`、`rebuild-workbench-density-and-composition`、`polish-workbench-visual-language`、`harden-mobile-and-primary-actions`、`establish-workbench-quality-program`、`fix-october-activity-and-homepage-tagline`、`strip-demo-branding-for-publicity`。

### B. 42 个批次小节

批次 458、459、460、461、462、463、464、465、466、467–471、472、482、483、474、473、484、485、486、487、488、489、490、491、492、493、494、495、496、497、498、499、500、501、502、503、504、505、506、507、508、509、510（源：`.ctx/logs/2026-10-EXECUTION_LOG.md`，按 `## 批次` 切分的最后 42 节）。

### C. 审计报告（14 份）

`.ctx/logs/archive/2026-10/AUDIT_IA_CRITICAL.md`、`AUDIT_R5_A_WEB_GUIDELINES.md`、`AUDIT_R5_B_DESIGN_TASTE.md`、`AUDIT_R5_C_FRONTEND_DESIGN.md`、`AUDIT_ROUND1_WORKBENCH_STRUCTURE.md`、`AUDIT_ROUND2_MINIMUM_THREE_COSTS.md`、`AUDIT_ROUND3_4_COMBINED.md`；`.ctx/logs/2026-10-AUDIT_R6_FRONTEND.md`、`2026-10-AUDIT_R7_DATA.md`、`2026-10-AUDIT_R8_THREE_COSTS.md`、`2026-10-AUDIT_R8_RECONCILE.md`、`2026-10-AUDIT_R9_DATA_STRUCTURE.md`、`2026-10-AUDIT_R10_DATA_LIFECYCLE.md`、`2026-10-AUDIT_UI_R11.md`。

> 说明：`archive/2026-10` 下另有 `UI_REDUNDANCY_AUDIT(_R2).md`、`DATA_LIFECYCLE_AUDIT(_R2).md`、`IA_LINK_TRUTH.md` 等早期专项报告；本轮通过 R6/R7/R10 的对账表交叉引用其结论，未逐字重复计数。
