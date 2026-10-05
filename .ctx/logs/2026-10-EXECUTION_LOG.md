---
title: "2026年10月执行日志"
type: execution_log
role: "[工程师]+[AI]"
last_updated: 2026-10-05"
status: active
related_files: [CLAUDE.md, .ctx/logs/2026-09-EXECUTION_LOG.md, .ctx/logs/EXECUTION_LOG_INDEX.md]
---

# 2026年10月执行日志

> 本文件记录 2026 年 10 月所有工作的执行动作。每条记录包含来源/关键动作/设计决策/结果/沉淀标签。
> **来源（2026-10-02 批次 336 换月 · 支书裁「甲 真换月：迁入 ＋ 改判据」）**：2026-10-01/02 的 **12 个批次节**（批次 323、325–335）自 `2026-09-EXECUTION_LOG.md` **逐字迁入**；此后新批次一律记于本文件。
## 批次 323（2026-10-01）：`R-73` 第 ③ 缺落成守卫 ＋ 连带补齐 `form-loop-sweep` 两处存量红 ＋ `R-70`/`R-73` 复核删行 ＋ `R-84` 归位复核改准

> **落点判据（`R-84`）**：本批**未新立裁定**——`R-73` 第 ③ 缺（「漏登记无守卫」）与 `H50.1 §3`（「乙部闭环即删行」）**均已裁定在先**，本批是**执行** ⇒ 本条**只进执行日志**，不占 `D-` 编号。

### 一、`R-73` 第 ③ 缺：新守卫 `validation-site-coverage.test.mjs`（`V1` 漏登记增量检测）

- **判据来源**＝`form-loop-registry.mjs` 开篇登记的**同一套「登记判据」**（① `showToast('error'|'warn'|'warning', '…')` ② `showStatus('error', …)` ③ `return { ok:false, error|message: … }`，且文案**点名字段 / 选择项**）。
- **形态**：扫 `docs/src/**` 得候选 → 与 `VALIDATION_SITES` 按 `(file, 文案)` 比对 → 未登记者落进 `UNREGISTERED_BASELINE`（**只降不升**；含「已登记却未撤基线」的反向断言）。
- **★ 落成当天即揪出 5 处真漏登记**（此前 `S0–S4` **全绿**，正是 ③ 缺所描述的「漏登记＝漏发现」）：
  1. `components/feedback/issue-form.js:106`「请选择事项领域」（2026-09-21 批次 126 新立第二根轴，当时未登记）
  2. `entries/tabs/leader/inspection-tab.js:209`「请填写考察内容」（组长台·驳回考察申诉分支）
  3. `entries/tabs/visitor/attendance-tab.js:167`「请填写说明」（成员台「我参加了但没记上」申诉浮窗——与 `:142` 补课申请是**两个不同浮窗**）
  4. `entries/tabs/visitor/inspection-tab.js:79`「请选择活动」（成员台·考察申诉——**整条链路此前无登记**）
  5. `entries/tabs/visitor/inspection-tab.js:80`「请填写说明」（同上）
- **处置**：5 条**同批登记**（均 `machine:false` ＋ 逐条 reason，不造数据）；台账 **实有 103 → 108**、`SITES_BASELINE` 103 → 108。另有 **4 处「状态守卫」**（不点名字段）留在基线里——**按台账判据本就不该登记**，非缺口。

### 二、连带补齐 `form-loop-sweep` 的**两处存量红**（本批实跑发现）

- **`S2`**：批次 303 把「写入活动 · 内嵌项目赋权」两处登记为 `machine:true`，却**从未纳入任何 `MACHINE_FLOWS.expect`** ⇒ 判据长期红。**补一条真机流程** `secretary-calendar-write-inline-grant`（open＝写入活动表单；submit＝点 `[data-action="wp-auth-add"]`；**只点「+ 加入名单」、不提交表单 ⇒ 不写库**）⇒ **真机实测通过**；`FLOWS_BASELINE` 56 → 57。
- **`S6`**：**19 处行号漂移**（其中 6 处系批次 317 把「写入活动」按钮移出 `calendar-tab.js` 模板所致，其余系历批累积）⇒ 逐处改准；实测 `S0–S6` **13/13 绿**。

### 三、乙部表复核（`H50.1 §3`）

- **删 `R-70`**：`Q-23-42` 已于 **2026-09-16 批次 47-J 闭环**（`doc-consistency::S12` 迁移台账**清空＝零容忍**）——本表旧记「基线 13 条 → `Q-23-42` 待补证」**系陈数**。
- **删 `R-73`**：③ 缺已由本批守卫落成 ⇒ 三缺全闭环。
- **`R-84` 改准**：`REVIEW_QUEUE` 过程叙述已于 2026-09-19 批次 101 迁出；本表旧记「**41 处 `Q-23-*` 待迁**」**系陈数**（「41 处」原为**批次 61 一次对账的口径**）；全仓 `Q-23-*` 本批实测 **745 处 / 40 文件**（执行日志 425 · 决策日志 161 · `DATA_CONSISTENCY_CHECKLIST` 26 · `form-loop-registry` 25 · `REVIEW_QUEUE` 21 …）。**仍留一条**：`REVIEW_QUEUE` 内若干「已迁出」区块仍是**多行**（`R-86` 要求只留一行指针）⇒ 续批压缩。
- 乙部表 **9 → 7 行**。

### 四、同步改动与守卫实测

- `README.md`（4 个可数事实：校验点 103 → 108 · `machine:false` 6 → 11 · 真机闭环 56 → 57 · 新守卫登记）· `content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md §0.2`（`R73` 行改「已闭环」）· `server/package.json`（新件入 `test:fast` / `test:daily`）· `CLAUDE.md`（乙部表删 2 行 / 改 1 行 ＋ 删除记录 ＋ 合并推进图 `323` 行）+ `server/test/form-loop-registry.mjs`（5 条登记 ＋ 1 条流程 ＋ 19 处行号）。
- **守卫实测（本批）**：`doc-consistency` **S1–S16 全绿** · `validation-site-coverage::V1` 绿 · `form-loop-sweep` **S0–S6 13/13** ＋ 真机 `活动管理` **8/8** · `doc-line-ref` / `version-stamp` / `timestamps-note-guard` / `frontmatter-freshness` / `link-integrity` / `link-target-guard` 同批绿（合跑 **58/58**）。
- **未跑全量**（`npm test`）——如实登记，收尾由 `R-85` 全量口把关；**本批未改 `docs/src/**` ⇒ 未 bump 任何 `?v=`（仍 `20261001k`）**；改动随批次 323 提交（**不 push**）。

***

## 批次 325（2026-10-01）：丙部 `P.15` **SOP 逐章评议 · 阶段 A**（公共规则表 ＋ 第一、二章）

> **决议 / 过程判据（`R-84`）**：本批是**诊断（评议）批**——产出＝**逐格偏差清单**（过程进本节）＋ **新立待裁命题**（进 `.ctx/REVIEW_QUEUE.md` 的 `SOP-G-2`）。**不产生新裁定** ⇒ 决策日志只记**诊断结论与新立命题**（`D-732`）。

### 一、范围与做法

- **范围由支书 2026-10-01 圈定＝乙档**：母本 `content/02_institution/sop/常见工作场景快速指南.md` 的 **「公共规则表」＋「第一章 活动与品牌场景」＋「第二章 制度与日常事务场景」**；**第三章「快速查找表」**（`:454-482`）与「延伸阅读」（`:485-493`）为**导航性内容、不纳入**。
- **做法**：对母本内每一条**可判定的规则 / 步骤 / 边界**逐格造「母本要求（行号＋要点）↔ 系统实然（`文件:行号`）」对照，**判定以代码实读为准**（不采信文档自述）。

### 二、判定分布（**实评 52 条**）

`一致` **47 条** · `上报待裁` **5 条** · **`改系统` 0 条 · `改母本` 0 条**。

**为什么 0 改系统 / 0 改母本**：凡系统有对应物者**均与母本相符**；凡无对应物者，多为**母本本身明示走线下**（如经费与用车：母本 `:60` 写「随草案在微信群报送支委会，**不额外进系统**」⇒ **系统不承载＝母本明示、非缺口**），或属**须支书先定「要不要上系统」的人工动作**（已全部转成 `SOP-G-2` 的 ①–⑤，**不擅判 `改系统`**）。

### 三、逐格对照全表（52 条 · 紧凑版；判定全部为「一致」者列在表末）

| # | 母本出处 + 要求 | 系统实然 | 判定 |
| --- | --- | --- | --- |
| 1 | `:26` 通知主体＝组织者（组长兼任时以组织者身份发布） | `services/governance/notice.js:172-175`（`canPublish` 白名单 ∨ `getOrganizedActivities`）· `workflow/sopData.js:19`（`1b-4` executor=`organizer`） | 一致 |
| 2 | `:31` 全支部通知 / 招募公告由支书发布 | `core/domain/constants.js:259` `NOTICE_PUBLISH_ROLES` | 一致 |
| 3 | `:33` 活动一律报备（支委扩大群）后方可写入 | `workflow/sopData.js:17`（`1b-2` executor=`expanded-committee`, T-7） | 一致 |
| 4 | `:39` 主题党日：弹性考勤 · 不强制补课 · 全体可跨组 | `sopData.js:13-14` · `services/activity/makeup.js:66-70` | 一致 |
| 5 | `:40` 三会一课刚性；补课范围＝党员大会＋党课；T+7；请假且线上参会不补 | `makeup.js:38-44,51-54,81-86` · `policy-defaults.js:45-47` · `attendance.js:217-240` | 一致 |
| 6 | `:41` 团支部合办按主题党日规则 | `core/domain/work-map.js:150-162`（共建＝主题党日维度 `isJoint`） | 一致 |
| 7 | `:49-54` 宣传规则（预热不需要 / 深参产出摘要+配图 / 推文自由裁量 / 归档） | `sopData.js:26`（`1b-8`）· `sopData.js:46`（`1c-9`）· `prop/archive-tab.js:530-551`（平台留痕） | 一致 |
| 8 | `:58` 经费一律支书审批（**母本 `:60` 明示不额外进系统**） | 系统无对应物（检索「经费/报销/用车」）——**母本明示不承载** | 一致 |
| 9 | `:59` 用车（京内租大巴 / 出京特事特办；同上不进系统） | 同上 | 一致 |
| 10 | `:72-73` 活动类型判断（三会一课仅党员+预备 / 主题党日全体可跨组） | `sopData.js:33-34,50-51` · `policy-defaults.js:59-62` | 一致 |
| 11 | `:75` 组织生活会非独立类型、以三会形式召开 | `constants.js:128-130,158,657` · `sopData.js` 无 `org-life` | 一致 |
| 12 | `:93` 活动由组长写入；写入时同时指定组织者＝赋权；解除即收回 | `leader/write-tab.js:62,1093-1094` · `services/activity/activity.js:41-60` | 一致 |
| **13** | `:90` **自下而上创建须先赋权后方可分派（Ⅱ）** | `decision-tree.js:76-78,119-122` ＋ `todo.js:1102-1129`（**只派生赋权待办、无前置硬门**） | **上报待裁 → `SOP-G-2-①`** |
| 14 | `:102-119` 主题党日 11 步 | `sopData.js:15-30`（`1b-1…1b-9`，锚点 -7/-7/-7/-2/-2/-2/0/+7/+3/+7/0） | 一致 |
| 15 | `:121` 逐项选择是否在系统内完成 | `services/activity/activity.js:187-207`（`deepWorkMode`）· `decision-tree.js:273-286` | 一致 |
| 16 | `:122` 组织者打包考察记录上传；组长过目、纪检确认后录入 | `sopData.js:23`（`1b-6a`）· `attendance.js:85-111`（上传位门禁） | 一致 |
| **17** | `:125` **组织者退出须经支委会确定接手人并完成交接** | 全仓检索「组织者退出/交接/解除指定/收回」——命中的均为**别事**（`handoff-inbox.js` 三委交接 · `member-confirmation.js:388-404` 支书交接） | **上报待裁 → `SOP-G-2-②`** |
| 18 | `:127-141` 活动当天 Check 清单 | `sopData.js:22`（`1b-6`） | 一致 |
| 19 | `:135-141` 外出提醒清单（弹提醒、可收起、不校验） | `services/activity/activity.js:72-85`（`OUTDOOR_CHECKLIST`）· `leader/write-tab.js:745-752` | 一致 |
| 20 | `:146` 跨组参与（推荐非强制） | `sopData.js:14` · `services/activity/signup.js` | 一致 |
| 21 | `:155-160` 三会一课子类型与主持人 | `sopData.js:38,42,55,59,70-71` | 一致 |
| 22 | `:160,184-186` 党课考勤归纪检；通知提前量不设固定值 | `policy-defaults.js:74` · `attendance.js:730-743` · `sopData.js:70`（`timeOffset:'flexible'`） | 一致 |
| 23 | `:162` 组织生活会以三会形式召开（谈心谈话 / 自评互评 / 工作记录模板 / 不需复盘） | `constants.js:128-130,158`（随承接会议承载） | 一致 |
| 24 | `:168` 刚性考勤；党小组会不默认补（写入时勾选） | `makeup.js:38-44,66-70` · `leader/write-tab.js:745-746,1093-1094` · `policy-defaults.js:47` | 一致 |
| 25 | `:169,215` 通知提前 ≥5 天到人 | `sopData.js:39,56,81`（`1c-2`/`1d-2`/`1e-2` 均 `timeOffset:-5`） | 一致 |
| 26 | `:171,222` 归档＝宣传委员；上传智慧党建平台；推文自由裁量 | `sopData.js:46,63,88` · `prop/archive-tab.js:530-551` | 一致 |
| 27 | `:176` 支委会产出物＝仅工作记录 | `sopData.js:87-88`（`1e-8`/`1e-9`） | 一致 |
| 28 | `:180` 党员大会产出物＝推文+配图 ＋ 工作记录 | `sopData.js:46`（`1c-9`） | 一致 |
| 29 | `:193-198` 党小组会：主持人组长；二维码签到场内扫码；纪检汇总 | `sopData.js:55,57,59` · `attendance.js:94-101` | 一致 |
| 30 | `:200-222` 三会一课通用流程 9 步 | `sopData.js:38-46`（`1c-1…1c-9` 九步齐备、逐条对应） | 一致 |
| 31 | `:220` 考勤汇总表列序（人→…→确认人） | `attendance.js:462-489`（`attendanceToLong`） | 一致 |
| 32 | `:237-251` 团支部合办 8 步（「支书批准」＝可开关参数） | `policy-defaults.js:186-196,289-303`（三态默认 `off`）· `settings-entry.js:1082-1153` · `activity.js:641-712` | 一致 |
| 33 | `:260` 团支部合办考勤与补课按主题党日 | `work-map.js:160` · `makeup.js` | 一致 |
| 34 | `:266,274-276` 品牌＝属性标签；提案 → 支委会通过后确定 | `activity.js:268-280`（`BRAND_PROPOSER_ROLES`）· `:444-503`（`applyBrandDesignationResult`，须 `decision==='passed'`） | 一致 |
| 35 | `:294-311` 制度制定迭代全流程 | `services/branch/branch-doc.js:379-515` | 一致 |
| 36 | `:313,384` 制度草案以「支部文件」起草归档；审议在会议议程上进行 | `branch-doc.js:95-123,399-424,434-440` | 一致 |
| 37 | `:310,319` 是否报送党员大会「审议时确定」 | `branch-doc.js:488-499`（`reportToPartyMeeting` → `pending-party-meeting`） | 一致 |
| 38 | `:341` 考察档案＝组织委员建档维护 | `capabilities/org-workspace.js:42,54` · `services/activity/inspection.js:199` | 一致 |
| 39 | `:342,354` 思想汇报自动归集；1500 建议 / 1200 警告审阅 / 不影响提交 | `services/governance/thought-report.js:164-206,101-107` · `policy-defaults.js:149-171` | 一致 |
| **40** | `:340,343` **党小组组长日常观察、向支书反馈考察意见** | 检索「日常观察 / 考察意见反馈」——仅命中邻接物 `todo.js:324-374`（半年考察提醒）· `issues.js:721-758`（汇报链） | **上报待裁 → `SOP-G-2-③`** |
| 41 | `:344-346` 发展党员支委会集体决策；先经支委会讨论通过方可推荐为发展对象 | `services/member/member-confirmation.js:22-26,207-236,270`（`COMMITTEE_GATED_STAGE='发展对象'`） | 一致 |
| 42 | `:350` 积极分子培养考察期 ≥1 年 | `todo.js:267-270`（`DEVELOP_NODE_THRESHOLDS` 365 天） | 一致 |
| **43** | `:355,357` **组织委员据个人自述反向核对、补全档案缺口** | 检索「反向核对 / 自述 / 档案缺口」——命中 `config-clean.js` / `org-wizard-report.js` 的「**支部自述**」（换组织场景，**非个人发展自述**） | **上报待裁 → `SOP-G-2-④`** |
| 44 | `:369` 组织委员：考察档案管理 ＋ 活动参与统计 | `org-workspace.js:42,54` · `attendance.js:500-535`（`listActivityParticipationByPerson`，批次 321 并入人才库） | 一致 |
| 45 | `:370` 材料催缴与审核督办（催办归组织委员；支书可催不越位） | `components/record/todo-tab-shell.js:422-471` · `components/ui/modal.js:284-291` | 一致 |
| 46 | `:371` 资料查询 / 支部文件版本维护 | `branch-doc.js`（`listDocs`/`publishNewVersion`）· `components/sections/references.js` | 一致 |
| **47** | `:375-377` **向委员提信息支持需求（提前 ≥2 天；给通知内容/受众/时间/形式）** | 检索「信息与档案支持 / 提前 2 天」——**无「向委员提需求」入口** | **上报待裁 → `SOP-G-2-⑤`** |
| 48 | `:385,410` 考勤 / 考察查询各角色在自己视图；宣传台不设此二页签 | `disc-workspace.js:39,41` · `leader/attendance-tab.js` · `visitor/attendance-tab.js` · `prop-workspace.js:19-54`（无） | 一致 |
| 49 | `:391-393` 三会一课考勤 / 考察档案 / 参与统计的查询归属 | 同上 ＋ `org-workspace.js:42,54` | 一致 |
| 50 | `:408-412` 考勤与考察两分离；事假提前 1 天 / 病假事后补 | `policy-defaults.js:86-91` · `attendance.js:636-642`（`absenceReasonNote`） | 一致 |
| 51 | `:425-444` 意见建议：支书收集、支委会处置；四类归口与反馈时限 | `work-map.js:202-209` · `services/governance/issues.js:1244-1249`（`ISSUE_DOMAINS` ＋ `replyHint`）· `:252-255` | 一致 |
| 52 | `:435` 线上讨论由「公开 issue 生命周期」承接 | `issues.js`（`submitIssue`/`assignIssue`/`addComment`/`closeIssue`） | 一致 |

**分布复核**：`一致` 47 · `上报待裁` 5（#13 · #17 · #40 · #43 · #47）· `改系统` 0 · `改母本` 0 ＝ **52** ✓。

### 四、本批范围与未覆盖（如实登记）

- **未纳入**：第三章「快速查找表」（`:454-482`）与「延伸阅读」（`:485-493`）＝**导航性内容**；**纯描述性文字**（如「不要堆砌活动」「鼓励积极分子参与」）**未单独出条**（无可判定项）。
- **未逐条核**：第二章「意见建议处理流程」的**逐环节时限**（`:439-444`）——系统里 `replyHint` **只是展示口径、不改流转**（已在 #51 说明）。
- **5 条「未找到对应物」均按纪律标注了检索关键字**，并一律判 `上报待裁`（**未擅判 `改系统`**）：母本**未写「须进系统」**，且多为线下协作 / 人工观察 ⇒ **须支书先给产品取向**。
- **本批未改任何代码 / 母本 / 配置**（**只读比对 ＋ 落账**）⇒ **未 bump 任何 `?v=`（仍 `20261001l`）**、**未跑全量**（纯 md 改动，走 `test:fast` 守卫）。

***

## 批次 326（2026-10-01）：`SOP-G-2` 五条待裁命题获裁（四条答复）＋ `①` 落地为「写入未赋权」**软提示** ＋ 连带修一处存量红

> **决议 / 过程判据（`R-84`）**：本批**因裁而作**——支书 2026-10-01 对批次 325 送裁的 `SOP-G-2-①`–`⑤` 与乙部 `V-6` 遗留项一并给了取向（**四条答复，逐字见「一」**）。**裁定进决策日志**（`D-733`），**实现过程与实测进本节**。

### 一、支书 2026-10-01 四条答复（逐字）

| # | 送裁问题（批次 325 提出） | 支书裁定（逐字） |
| --- | --- | --- |
| 1 | `SOP-G-2-①`「赋权前置」要不要做成硬门 | **「乙 软提示」** |
| 2 | `SOP-G-2-②`「组织者退出 / 接手」要不要系统承载 | **「乙 承载『转交组织者』」** |
| 3 | `SOP-G-2-③④⑤` 三条「母本有、系统无对应物」的线下协作类，哪些进系统 | **「暂无」** |
| 4 | 乙部 `V-6` 遗留：九业务域是否各配一色 | **「丙 只给重点域配色」** |

⇒ **本批落 `①`**；`②` 与 `V-6` 丙 **转后续批次**；`③④⑤` **定案＝暂不进系统**（见「五」）。

### 二、`①` 的落法（**不改裁定、只择落法**）

- **判据（条件）**：写入活动时**内嵌赋权名单为空**（`wp.pendingAuth.length === 0`）＝本场**尚未指定组织者**（＝尚未完成赋权）；发起专班时**初始成员里无 `role:'organizer'`** 同理。
- **动作**：**提交前弹一次软提示**，点主按钮**继续提交**（**不阻断写入** —— 母本未禁止「先写后补指定」）；点次按钮回表单。
- **单一源**：`docs/src/components/ui/modal.js` 新增 `confirmWriteWithoutGrant({subject, context})`；提示正文由内部 `_noGrantNoteHtml(subject, context)` **一处生成**（折进 nudge 与独立窗**共用同一份措辞**）。
- **不连弹两窗**：写入人**不是本位**（支书 / 其他支委）时，本段**折进既有「本位」nudge 那一窗**（`confirmNudge({ noGrant })` 新增可选参数）⇒ 同一次提交**只出现一个确认窗**；写入人**恰是本位**时无 nudge，才走**独立窗**。为此把「必须点按钮才能关」的机制从 `confirmNudge` 抽出为**共用内部件** `_mustPressConfirm`（两窗同一套语义，DOM 锚点 `[data-nudge-confirm]` / `[data-nudge-cancel]` 与 `panel.dataset.nudgeKey` **一字未改** ⇒ 既有真机件零改签）。
- **落点**：`docs/src/entries/tabs/secretary/calendar-tab.js::handleSubmitActivity`（**全部校验之后、真正写链之前** —— 与「本位」nudge 同位，保证既有的校验闭环普查不受影响）＋ `docs/src/entries/tabs/org/taskforce-tab.js::_submitRecruitForm`（该函数**改 `async`**、调用点加 `void`）。
- **为什么组长台（`leader/write-tab.js`）不加**：该链 `const organizerIds = _dtOrgPicker ? getSelected() : [currentLeaderId]` —— **缺省即组长本人** ⇒ 「未赋权」这一态在该链**结构上不成立**（组长写入时组织者已定）。如实登记，不重复加提示。

### 三、真机证据（**新立定向件**，`S12`）

`server/test/write-grant-prompt-e2e.test.mjs`（**已登记进 `test:daily`**）—— **双向证据**（不是「跑绿了」就算）：

- **正例**：支书**未指定组织者** ⇒ 确认窗（`#modal-overlay-nudge-activity-write`）**含「尚未指定组织者」**，点主按钮后**写入真落库**（日历出现该标题）；
- **反例**：经「＋ 加入名单」**指定组织者** ⇒ **同一窗不含该段** —— 证明它是**条件渲染**、不是恒显（否则本判据无区分度、且用户会当噪音）；
- **不连弹两窗**：两次提交实测**确认类浮窗均恰为 1 个**。

实测：`pass 1 / fail 0`（19.7s）。另：`form-loop-sweep` 台账侧 **`82 / 82` 全绿**（含为**专班发起成功路径**补的一步确认点击，见「六」）。

### 四、连带修一处**存量红**：`visitor-attendance-makeup-proof`

- **怎么发现的**：本批实跑 `form-loop-sweep` 全量，该条**唯一判红**；为区分「本批引入 / 存量」，用 `git stash push -u` 在**未含本批改动的基线**上复跑 ⇒ **同样判红** ⇒ **非本批引入，属存量**（如实登记，不掩饰）。
- **根因**：成员台「考勤概况」列表**只列本月活动**（`visitor/attendance-tab.js`：`a.date.startsWith(thisMonth)`），而「去补课 · 提交补课说明」按钮**长在活动行上**；种子 `mk-seed-1` 挂的是 **9 月**的 `act-31` ⇒ 时钟跨到 **10 月**后，**本人待补课的唯一提交入口消失** —— 补课任务仍是 `pending`、纪检台仍在等它闭环 ⇒ 属**未完成义务的死链**（**不是「测试抖动」**，可稳定复现）。
- **修法（最小对症面）**：**仍待补课的往期活动一并列入**（新增 `myPendingMakeupActIds`）—— **只新增、不缩小**原有面。
- **连带改签**：`form-loop-registry.mjs` 该文件三处行号 **142 → 152 · 167 → 177**（`S6` 行号台账同批改准）。
- **复跑**：`form-loop-sweep` 定向 `考勤概况` **9 / 9**；**全量 82 / 82**。

### 五、`SOP-G-2-③④⑤` 定案：**暂不进系统**

支书答「**暂无**」⇒ 三条**维持现状（线下协作）**：`③` 党小组组长日常观察、向支书反馈考察意见 · `④` 组织委员据个人自述反向核对考察档案 · `⑤` 向委员提信息支持需求。**本批只落裁定、不动代码**；`.ctx/REVIEW_QUEUE.md` 的 `SOP-G-2` 表内三条状态标注改「**已裁：暂不进系统（2026-10-01）**」。

### 六、改动清单

| # | 文件 | 改前 | 改后 |
| --- | --- | --- | --- |
| 1 | `docs/src/components/ui/modal.js` | 只有 `confirmNudge` 一个「必须点按钮才能关」的窗 | 抽出共用 `_mustPressConfirm` ＋ `_noGrantNoteHtml`；`confirmNudge` 新增 `noGrant` 可选参数；**新增导出** `confirmWriteWithoutGrant` |
| 2 | `docs/src/entries/tabs/secretary/calendar-tab.js` | 只有「本位」nudge | 提交前＋未赋权判据：非本位**折进 nudge**、本位走独立窗 |
| 3 | `docs/src/entries/tabs/org/taskforce-tab.js` | `_submitRecruitForm` 同步、「初始成员无组织者」无提示 | 改 `async`；初始成员无 `organizer` ⇒ 提交前软提示 |
| 4 | `docs/help.html` | 「创建会议活动」卡只写「本位」nudge；「发起专班」卡无相关句 | 两卡各补一段（未指定组织者时会弹软提示、可继续；专班组织者亦可后续指定） |
| 5 | `docs/src/entries/tabs/visitor/attendance-tab.js` | 列表只含本月活动 | 未赋权存量红修（见「四」） |
| 6 | `server/test/write-grant-prompt-e2e.test.mjs` | ——（新文件） | 定向真机件（正例 / 反例 / 不连弹两窗） |
| 7 | `server/test/form-loop-registry.mjs` | 专班发起成功路径 `act` 只有 `dispatchSubmit`；补课三处行号 142/167 | ＋`waitFor`＋`click` 确认按钮；行号改准 152/177 |
| 8 | `server/package.json` | `test:daily` 无本件 | ＋`test/write-grant-prompt-e2e.test.mjs` |
| 9 | `server/test/copy-master-guard.test.mjs` | 未记僵尸 | **只登记、本批不动**：实跑发现 `settings-entry.js` 一条已不在代码中（见「七」） |
| 10 | 全站 `?v=` | `20261001l` | **`20261001m`**（改了 `docs/src/**` ⇒ 必须 bump） |

### 七、如实登记（未做 / 异常 / 只登记不动的）

- **只登记、本批不动**：`copy-master-guard` 实跑发现 `settings-entry.js` 的「档案/职责参数等）每次保存自动留痕…」一条**已不在该文件中**（该句现只在 `docs/help.html`）⇒ 属**存量僵尸条目**（某历史批改写了该句却未同批收基线）。**本批不下调基线**，因 `N3` 对 `BASELINE_TOTAL` 设了**硬下限 `>= 11`**（「台账被删减」防线）—— 要收它须**同一批同时下调该下限并说明**，属独立取证件。已在守卫内**原位加注**留痕。
- **未跑全量**（`npm test` / `test:precommit`）—— 本批实跑：`test:fast` **140 / 140** · `doc-consistency` ＋ `ux-guard` ＋ `list-filter-chip-e2e` ＋ `attendance-batch` **31 / 31** · `form-loop-sweep` 全量 **82 / 82** · `click-cost` ＋ `agenda-flow` ＋ `agenda-closure` **11 / 11** · `page-sweep` ＋ `help-e2e` **12 / 12** · 新件 **1 / 1**。**收尾全量由 `R-85` 全量口把关。**
- **`②` 与 `V-6` 丙 未落**：支书已裁（「乙 承载『转交组织者』」/「丙 只给重点域配色」），**转后续批次**（`②` 涉及活动 / 专班两处写入面 ＋ 支委会确定接手人的制度语义；`V-6` 丙需先定**哪几个域算「重点」**）。

***

## 批次 327（2026-10-01）：`SOP-G-2-②`「转交组织者」落地（支书裁**乙：直接转交 ＋ 留痕**）＋ `V-6` 丙「只给重点域配色」（重点＝**项目线三域**）

> **决议 / 过程判据（`R-84`）**：本批**因裁而作** —— 支书 2026-10-01 就批次 326 末尾送裁的两条各给一取向（**三条答复，逐字见「一」**）。**裁定进决策日志**（`D-734`），**实现过程与实测进本节**。

### 一、支书 2026-10-01 答复（逐字）

| # | 送裁问题 | 支书裁定（逐字） |
| --- | --- | --- |
| 1 | `SOP-G-2-②`「转交组织者」怎么生效 | **「乙 直接转交 ＋ 留痕」** |
| 2 | 由谁发起 / 生效 | **「丙 上面三者 ＋ 现任组织者本人」** |
| 3 | `V-6` 遗留：九业务域里哪几个算「重点」 | **「乙 项目线三域」** |

### 二、`②` 的落法（**不改裁定、只择落法**）

- **判据 ＋ 写口 ＋ 弹窗 三合一单一源**：新增 `docs/src/components/governance/organizer-transfer.js`
  —— `canTransferOrganizer()`（可发起人判据）· `transferOrganizer()`（写）· `openOrganizerTransfer()`（浮窗）。
  **各宿主面只挂入口**，不复制第二份实现。
- **写**：期望角色表 ＝ 原非组织者行**保留**（deep 等，且新人若原为 deep 则去其 deep 行——一人只占一格）
  ＋ **旧组织者整行去掉（＝退出，不降级）** ＋ 新人接 `organizer`；走**既有**
  `AuthStore.syncProjectRoles`（写主源 ＋ 追加审计快照 `revoke`(旧) / `grant`(新) ＋ 通知被赋权人）
  ⇒ **「退出与接手人」两者都在既有审计链里**（谁转给谁 / 何时），**不新造第二套台账**。
- **两个宿主面**：`entries/pages/activity-entry.js`（**活动详情页** — 全角色可达，含现任组织者本人）
  ＋ `entries/tabs/org/taskforce-tab.js`（**专班详情** — 「成员角色」块内与「保存角色」并列）。
- **为什么与既有「保存角色」并存而非合并**：后者是**多角色整表编辑**（组织者 ＋ 深度参与者）；
  前者**语义更窄**——只换组织者，且带母本「退出 / 交接」这条语义。两处**写口同一个**（`syncProjectRoles`），
  只是入口语义不同 ⇒ 不合并、不互相替代。
- **做事即销待办**：转交成功即销该对象的赋权待办（`TodoSourceType.ACTIVITY` / `TASKFORCE`）——
  **口径同两处既有「保存角色」**（若不加，会出现「角色已改、赋权待办仍悬空」的不一致）。

### 三、`V-6` 丙 的落法

- **单一源** `docs/src/core/domain/constants.js::WORK_DOMAIN_COLORS`（**只三键**：`meeting` 会务 /
  `activity` 活动 / `taskforce` 专班），体例同既有 `ACTIVITY_CAT_COLOR`（`_applyDark` 补深色三件套，
  键就是 `WORK_DOMAIN` 的取值字符串 ⇒ 该文件**不** import `todo.js`，避免 `constants ↔ todo` 循环依赖）。
- **不新造色**：会务 / 活动沿用与「三会一课红 / 主题党日金」**同族**的色调（同一件事不在两处出现两套色）；
  专班取 `_C.indigo600`（**既非任何角色识别色、也非功能色四态** ⇒ 不与 §2.9 上两行抢语义）。
- **消费点唯一**：今天页行内域胶囊 `entries/tabs/today/today-tab.js::_domainChip(domain, label)`；
  **其余六域保持中性胶囊**（不配色＝不强调）。带色胶囊加 `data-domain` 供真机锚定。
- **文档**：`content/04_web_design/design-system/DESIGN_SYSTEM.md §2.9` 角色-令牌表**新增一行**
  「业务域识别色（限重点三域）」（写清令牌 / 什么时候用 / 什么时候不许用 / 依据）。

### 四、真机证据

- **新增台账校验点 ＋ 真机流程**：`page-activity-organizer-transfer`（独立页 `docs/activity.html?id=act-31`
  的「转交组织者」浮窗内**未选接手人即点「转交」** ⇒ 报「请选择接手人」且**载体（人选器）在位**）；
  `VALIDATION_SITES` **108 → 109** / `MACHINE_FLOWS` **57 → 58**（基线同批改准）。
  定向跑（`FORM_LOOP_TABS=独立页 /activity.html`）：**10 / 10**（含 `S0`–`S7` 台账守卫）。
- **今天页定向件扩断言**（`today-action-groups-e2e`，`V-6` 丙）：① 凡带 `data-domain` 的域胶囊**必有内联底色**、
  域键**只许三域之一**；② 不带者**不得**有内联底色（其余六域中性）；③ **非空转**——单一源**恰三键**、
  每键 `bg / text / border` 齐备（**不依赖演示数据**，防「碰巧一条重点域都没有」也判绿）。实测 **通过**。
- `test:fast` **140 / 140** · `ux-guard` ＋ `list-filter-chip-e2e` ＋ 今天页定向件 **9 / 9** ·
  `form-loop-sweep` **全量 83 / 83**（含 `S0`–`S7` 台账守卫 ＋ 本批新增的 `page-activity-organizer-transfer`；见「六」）。
- **台账四处计数同刷（本批补做）**：`DECISION_LOG.md` 月度索引 · `2026-09-DECISION_LOG.md` 本月目录末条 · 根 `README.md` 真机台账三数
  —— 初稿只改了文首 / 文末两处 ⇒ `doc-consistency` ⑥ 与「真机台账四断言」判红 6 条，本批一并改准（`459→460` / `D-733→D-734` /
  `108→109` · `97→98` · `57→58`）；改后 `doc-consistency` 绿。

### 五、改动清单

| # | 文件 | 改前 | 改后 |
| --- | --- | --- | --- |
| 1 | `docs/src/components/governance/organizer-transfer.js` | ——（新文件） | `②` 的判据 / 写口 / 浮窗**三合一单一源** |
| 2 | `docs/src/entries/pages/activity-entry.js` | 无转交入口 | 活动详情页加「转交组织者」一枚 ＋ 挂点 |
| 3 | `docs/src/entries/tabs/org/taskforce-tab.js` | 「成员角色」块只有「保存角色」 | 同块加「转交组织者」（**按四类人判定是否渲染**）＋ 挂点 |
| 4 | `docs/src/core/domain/constants.js` | 无「业务域色」 | 新增 `WORK_DOMAIN_COLORS`（**只三键** · 不新造色 · 固定不随主题）；**置于文件末尾**（避免中段插入位移 `README-server.md` 的 10 处行号引用 —— 先例 `D-544`） |
| 5 | `docs/src/entries/tabs/today/today-tab.js` | `_domainChip(label)` 一律中性灰 | `_domainChip(domain, label)`：三域上色（带 `data-domain` ＋ `--acc-*-dark` 深色态）、其余中性 |
| 6 | `content/04_web_design/design-system/DESIGN_SYSTEM.md` | §2.9 表无「业务域」行 | 新增一行「业务域识别色（限重点三域）」 |
| 7 | `server/test/form-loop-registry.mjs` | `SITES 108 / FLOWS 57`；`taskforce-tab.js` 10 + 1 处行号 | `SITES 109 / FLOWS 58`（＋新校验点＋新流程）；`taskforce-tab.js` 各行号 **+18 改准** |
| 8 | `server/test/today-action-groups-e2e.test.mjs` | 只断言「行带业务域胶囊」 | ＋ `V-6` 丙 三条断言（含**非空转**：单一源恰三键） |
| 9 | 全站 `?v=` | `20261001m` | **`20261001n`**（改了 `docs/src/**` ⇒ 必须 bump） |
| 10 | `.ctx/logs/2026-09-DECISION_LOG.md` · `.ctx/logs/DECISION_LOG.md` · `README.md` | 本月目录末条 `D-733` · 月度索引 `459 条（D-275~D-733）` · README 真机台账 `108 / 97 / 57` | 四处计数同刷：`D-734` · `460 条（D-275~D-734）` · `109 / 98 / 58`（`doc-consistency` ⑥ ＋ 真机台账四断言复绿） |
| 11 | `server/test/copy-screen-guard.test.mjs` | C4_BASELINE **12 屏**（含已漂到 ≤12 的 `secretary::全局概况` / `org::人才库`）；`org::我的处置` 未登记 | 收基线 **11 屏**：删两个 ≤12 条目 ＋ 复升的 `org::我的处置`（12.2）登记并给理由（**存量红 · 连带**） |

### 六、如实登记（未做 / 异常 / 只登记不动的）

- **支书台的活动详情面板未加同款入口**：`components/record/inspector.js`（支书台「活动管理」点活动后展开的详情面板）
  **本批未加**「转交组织者」——同一动作若在**三处**各写一遍入口会分叉；本批先在**活动详情页**
  （`activity.html` · 全角色可达，含现任组织者本人）＋**专班详情**落。**支书从活动管理进详情面板这条路径留待后续批次**
  （或在支书台加一枚指向活动详情页的跳转）——**如实登记，不写成「已全覆盖」**。
- **收尾全量已跑（`R-85`）**：`npm test` 首跑 **909 项 / 906 过 / 3 红**（另 `test:fast` **140 / 140** ·
  `form-loop-sweep` **全量 83 / 83** · `ux-guard` ＋ `list-filter-chip-e2e` ＋ 今天页定向件 **9 / 9**）。
  **三条红的归属与处置（用 `git stash push -u` 在未含本批改动的 HEAD 上对照复跑判定，非猜测）**：
  ① `doc-line-ref::R2` —— **本批自致**：`constants.js` **中段插入 20 行** ⇒ `README-server.md` 的 10 处
     行号引用（`ROLE_KEYS:185-191,819-821` 等）**整体 +20 漂移**；处置＝**把 `WORK_DOMAIN_COLORS` 移到文件末尾**
     （零位移；先例＝批次 122 `D-544`）⇒ 复绿（本项属**实现方式调整**，非放宽判据）；
  ② `copy-screen-guard::M2` / `M3` —— **存量红**（基线对照复跑**同样判红** ⇒ 非本批引入）：
     `secretary::全局概况` / `org::人才库` 已漂到 ≤12（应删条目）、`org::我的处置` 复升 >12（应登记）；
     处置＝**连带收基线**（删 2 ＋ 登记 1 并给理由）⇒ 复绿（`C4_BASELINE` 12 → 11 屏）。
  **三条结清后复跑全量：见「七」。**
- **`SOP-G-2-②` 落地后 `SOP-G-2` 整条可迁出**（`R-86`：① 已落、③④⑤ 已裁、② 已落 ⇒ 本项**在册待办清零**）——
  **本批未迁**（迁出属台账操作，留待台账批统一做；现状态已在 `REVIEW_QUEUE` 表内标「② 在办 → 已落」）。

### 七、收尾全量（`R-85`）

- **`npm test`（`DISABLE_PASSWORD_CHECK=1` / `DEMO_READONLY=0`，`:3000` 服务在跑）：909 项 / 909 过 / 0 红 / 0 跳过** ·
  **耗时 1,344 s（≈22.4 分钟）** · `exit=0`。三条红（见「六」）**全部结清后复跑所得**，非「未见新红」。
- 同批其余实跑：`test:fast` **140 / 140** · `form-loop-sweep` **全量 83 / 83**（含 `S0`–`S7` 台账守卫）·
  `copy-screen-guard` **11 / 11**（收基线后）· `doc-line-ref` ＋ `hex-hardcode-guard` ＋ `module-load` ＋
  `import-path-guard` **17 / 17** · `doc-consistency` **16 / 16**。
- ⚠ **`.tmp-batch327-full.log` / `.tmp-b327b.log` 两份诊断日志**已按「`.tmp*` 不留盘」纪律**删除**（不随提交）。

***

## 批次 328（2026-10-01）：台账批 —— `SOP-G-2` 全条收口并自 `REVIEW_QUEUE` 迁出（含五条「三档备选」存档）＋ 支书就批次 327 收尾所送四条各给取向

> **决议 / 过程判据（`R-84`）**：本批**因裁而作**——支书 2026-10-01 就批次 327 收尾送问的四条各给取向（**逐字见「一」**）。**裁定进决策日志**（`D-735`），**迁出操作与实测进本节**。

### 一、支书 2026-10-01 答复（逐字）

| # | 送问 | 支书裁定（逐字） |
| --- | --- | --- |
| 1 | 「转交组织者」生效后**要不要通知被退出的原组织者** | **「补：通知原组织者（推荐）」** |
| 2 | 支书台**活动详情面板**要不要加转交入口 | **「加一枚跳转到活动详情页（推荐）」** |
| 3 | 今天页「业务域三色」与版面**验收** | **「我觉得 条目 左侧 的span条 颜色也值得设计。此外，我并不知道 这几个h4排布是什么逻辑？我看不懂！！ 需要今天我动手 这个名字起得也不好」** ⇒ 判**不通过 · 须返工** |
| 4 | 318–327 之后**先做哪一项** | **「台账批：SOP-G-2 迁出＋收尾（推荐）」** |

### 二、本批执行（台账批）

- **`SOP-G-2` 整条迁出**：原表（五条逐条四列 ＋ 裁定落点表 ＋ 收口口径，**24 行**）→ **5 行指针 ＋ 去向**（`R-86`）。`REVIEW_QUEUE` **942 → 923 行**。
- **迁出顺序不可倒**：**先把五条「送裁前的三档备选」抄进 `D-735`、再迁出队列**——否则备选随迁出永久丢失（`D-735` 内已逐条存档）。
- **可追溯三处（迁出后仍齐备）**：① 诊断批 **52 条全表**（含 ①–⑤ 的母本出处 / 系统实然）＝执行日志**批次 325**（第 13 / 17 / 40 / 43 / 47 行）＋ `D-732`；② **取向与落点**＝`D-733`（① 软提示 · ③④⑤ 暂不进系统）/ `D-734`（② 转交组织者 ＋ `V-6` 丙）；③ **备选存档**＝`D-735`。
- **更正 `D-734` 三处初稿记错**（本批实读发现、非本批引入）：① 「`REVIEW_QUEUE` 表内 ② 已改『已落』」——**实为未改**（表内仍写「⏳ 在办」，直到本批整条迁出）；② 「`form-loop-sweep` 全量 **82 / 82**」——**实为 83 / 83**；③ 「**未跑全量**」——**实为已跑**（909 / 909 / 0）。三处皆已就地改准。

### 三、连带修一处红（`R-83`「改了没刷卡」· 跨零点提交类）

- `frontmatter-freshness::F2` 判红 1 条：`content/04_web_design/design-system/DESIGN_SYSTEM.md` 的 `last_updated` 写 `2026-10-01`，而**该文件最后一次提交日是 `2026-10-02`**（批次 327 的提交发生在 2026-10-02）⇒ 判「改了没刷卡」。
- **根因（值得记为一条经验）**：`F2` 比的是「frontmatter ↔ **最后一次提交日**」；**提交落在次日**（跨零点）是正常作业情形 ⇒ **凡在跨零点提交的批次里改过 `content/**`，都须同批把该文件 frontmatter 与 `TIMESTAMPS` 行刷到「提交日」**（否则该批提交一落地，`F2` 立即红）。
- **处置**：`DESIGN_SYSTEM.md` frontmatter `2026-10-01 → 2026-10-02` ＋ `.ctx/TIMESTAMPS.md` 对应行日期同批改准（`S13` 要求两处相等）⇒ `F2` 复绿。

### 四、守卫实跑

`doc-consistency` **16 / 16**（含 `S14 ⑥` 决策日志四处计数同刷 · `S14 ⑫` 队列在册条数——`SOP-G-*` **不计入** `SOP-B-*` 在册 ⇒ **仍 1 条**）· `timestamps-note-guard` 绿 · `frontmatter-freshness` **3 / 3**（修后）· `link-integrity` 绿 ⇒ 四件同跑 **31 / 31 / 0 红**；`npm test` **全量见「七」**。

### 五、改动清单

| # | 文件 | 改前 | 改后 |
| --- | --- | --- | --- |
| 1 | `.ctx/REVIEW_QUEUE.md` | `SOP-G-2` 整条（**24 行**：五条逐条表 ＋ 裁定落点表 ＋ 收口口径） | **一行指针 ＋ 去向**（5 行）；文件 **942 → 923 行** |
| 2 | `.ctx/logs/2026-09-DECISION_LOG.md` | 止于 `D-734`；四处计数 **460 条** | 新增 **`D-735`**（四条取向 ＋ 五条「三档备选」存档）；四处计数 **461 条**（下一条自 `D-736`）；**更正 `D-734` 三处初稿记错** |
| 3 | `.ctx/logs/DECISION_LOG.md` | 月度索引 `460 条（D-275~D-734）` | **`461 条（D-275~D-735）`** |
| 4 | `content/04_web_design/design-system/DESIGN_SYSTEM.md` | `last_updated: 2026-10-01` | **`2026-10-02`**（`F2` 复绿） |
| 5 | `.ctx/TIMESTAMPS.md` | 该行日期 `2026-10-01` | **`2026-10-02`**（与 frontmatter 相等，过 `S13`） |

### 六、如实登记（未做 / 在办 / 只登记不动的）

- **三条新取向均未实现**（**在办**，**不写成已落**）：① 转交组织者**补通知被退出的原组织者**；② 支书台活动详情面板**加一枚跳转到活动详情页**；③ **今天页三处视觉返工**（条目左侧色条须设计 · 分节 h4 的排布逻辑读不懂 · 卡名「需要我今天动手」不好）。
- **队列里其余「已迁出仍留多行」的区块**（`R-84` 续批项）**本批未动**——只处理 `SOP-G-2` 一条，**不借机横扫**（避免把一次台账操作做成普查）。
- **`D-735` 记的是「取向」不是「实现」**——四条取向中 ③ 条**尚未动代码**，故本批**未 bump 任何 `?v=`**（仍 `20261001n`）。

### 七、收尾全量（`R-85`）

- **`npm test`（`DISABLE_PASSWORD_CHECK=1` / `DEMO_READONLY=0`，`:3000` 服务在跑）：909 项 / 909 过 / 0 红 / 0 跳过** · **耗时 1,399 s（≈23.3 分钟）** · `exit=0`（含本批修好的 `frontmatter-freshness::F2`）。
- 同批其余实跑：`doc-consistency` ＋ `timestamps-note-guard` ＋ `frontmatter-freshness` ＋ `link-integrity` **31 / 31**。
- ⚠ **`.tmp-b328.log` 诊断日志**已按「`.tmp*` 不留盘」纪律**删除**（不随提交）。

## 批次 329（2026-10-01）：今天页左卡收成「单一轴」（动作性质 · 卡名 · 色条语义 三条再裁）＋ 落地

> **决议 / 过程判据（`R-84`）**：本批**因裁而作**——支书 2026-10-01 就批次 328 送裁的「今天页三处视觉返工」**逐处给三档并点选**（**逐字见「一」**）。**裁定进决策日志**（`D-736`），**实现与实测进本节**。

### 一、支书 2026-10-01 再裁（逐字）

| # | 送问（三档） | 支书裁定（逐字） |
| --- | --- | --- |
| 1 | 今天页左卡**分节轴**收成哪种 | **「甲 单一轴＝动作性质（推荐）」** |
| 2 | 左卡标题「需要我今天动手」**换成哪个** | **「甲 「今天要办」（推荐）」** |
| 3 | 条目左侧 3px **色条只承担哪种含义** | **「甲 只表紧迫度（推荐）」** |

（初判「不通过 · 须返工」的原话见本日志**批次 328「一」第 3 行**。）

### 二、本批实现（今天页左卡重写）

- **卡名**：`需要我今天动手` → **`今天要办`**（`leftCard` 与 `_allEmptyHtml` 两处）。
- **单一轴＝动作性质七类**：删 `_overdueZone`（逾期不再单开红底段，降为**行内红条**）· 删 `_dutyBlock` / `_pendingBlock` 两段头；**今日分工 / 待我表态 / 未读通知 / 待我处理的汇报**按**单一源映射** `SOURCE_ACTION`（duty / vote → `participate` · notice → `read` · report → `review`）**并入七类组**。
- **行左 3px 条只表紧迫度**：`_todoEntry` 统一给 红（`--functional-error`，逾期）/ 金（`--functional-warning`，今天到期）/ 灰（`--neutral-400`，随时）；分工 / 表态 / 通知 / 汇报行一律灰（无截止）；**分类走胶囊**（业务域 / 角色），不再用主题色 / info 蓝条。
- **统一行模型**：`_todoEntry` / `_dutyEntry` / `_voteEntry` / `_noticeEntry` / `_reportEntry` → `{key, bar, inner, attrs}`，经 `_entryRow` 落 `_row`；`_actionGroupsBlock` 组内**按紧迫度排序**（无截止殿后）。
- **汇报为异步**：`_fillPendingReports(container, personId, onNav)` 改为**注入「审核」组**——无该组则动态建组（`review` 在 `TODO_ACTION_ORDER` 首位 ⇒ `afterbegin` 前置），有则该组计数同步 +n；新注入行**单独绑定点击**（主渲染的 `.today-go` 循环已跑过）。
- **单一源提升**：`today-summary.js` 的 `ACTION_ORDER` / `ACTION_LABELS` 提升为**导出** `TODO_ACTION_ORDER` / `TODO_ACTION_LABELS`（左卡与生成侧同源，不再各留一份）。
- **头部版式注释同批改准**（版式段 ＋ 信息自陈段 ＋ 紧迫度 / 位轴 ＋ 计数行）。

### 三、同批改准的守卫 / 基线（**不是放宽**）

- `server/test/today-action-groups-e2e.test.mjs`：卡名断言两处改「今天要办」；**新增 ②′ 反向证据**——「旧段头（今日分工 / 待我表态 / 未读通知 / 待我处理的汇报）**须已并入七类组**」，判据只认 **h4 组标题**（不受行内文案干扰）。
- `server/test/style-baseline.mjs`：`P_TEXT_TIER_BASELINE` **删** `today-tab.js` 条目（其**唯一** 11px `<p>` ＝旧「逾期区」段头随删）⇒ `P_TEXT_TIER_TOTAL_BASELINE` / `FILE_BASELINE` **81 / 26 → 80 / 25**、按值 `11: 81 → 80`（收基线＝删条目，非放宽）。

### 四、守卫实跑（本批定向）

- `text-tier-guard`（段落口径 80 / 25 持平）· `hex-hardcode-guard` · `dead-selector-guard` · `button-system-guard` · `today-summary`（七项含 `byAction`）· `today-action-groups-e2e` —— **全绿**。
- `doc-consistency`（S13 TIMESTAMPS↔frontmatter · S14 四处计数）· `timestamps-note-guard` · `frontmatter-freshness`（F1 / F2 / F3）· `link-integrity` · `version-stamp` · `import-path-guard` · `module-load` —— **62 / 62 / 0 红**。
- `form-loop-sweep` ＋ `page-sweep` ＋ `ux-guard` ＋ `tab-nav` —— **105 / 105 / 0 红**（含 `form-loop-sweep`：`VALIDATION_SITES=109` / `MACHINE_FLOWS=58` / `SUCCESS_FLOWS=17`，与基线持平）。

### 五、改动清单

| 文件 | 改什么 |
| --- | --- |
| `docs/src/entries/tabs/today/today-tab.js` | 左卡重写（卡名 / 单一轴 / 色条语义 / 统一行模型 / 汇报异步注入「审核」组） |
| `docs/src/services/governance/today-summary.js` | `TODO_ACTION_ORDER` / `TODO_ACTION_LABELS` 提升为导出 |
| `server/test/today-action-groups-e2e.test.mjs` | 卡名断言改准 ＋ 新增 ②′ 反向证据 |
| `server/test/style-baseline.mjs` | 段落 11px 台账删 `today-tab.js`（81 / 26 → 80 / 25） |
| `.ctx/logs/2026-09-DECISION_LOG.md` · `.ctx/logs/DECISION_LOG.md` · 本节 | `D-736` ＋ 四处计数 `461 → 462` |
| 全站 `?v=` | `20261001n → 20261001o`（`bump-version`：JS 217 个 / HTML 22 个 / CSS 2 个 / server-test 88 个；陈旧戳自检 0 残留） |

### 六、如实登记

- **只改今天页左卡**（依 `D-736` / `D-735`「须逐处对应三点、不得顺手改其它」）；**右卡 / 其它页一字未动**。
- `_fillPendingReports` 由「独立子段」改为「注入审核组」⇒ 该组**计数随注入同步 +n**（§4.14 计数只留一处）。
- `ACTIVE_RULINGS.md` **0 行**（纯视觉收束，不产生新口径）。
- 真机（`http://127.0.0.1:3001`，演示种子）已交支书目验。

### 七、收尾全量（`R-85`）

- **`npm test`（`DISABLE_PASSWORD_CHECK=1` / `DEMO_READONLY=0`）：909 项 / 909 过 / 0 红 / 0 跳过** · **耗时 1,353,419 ms（≈22.6 分钟）**。
- ⚠ **如实登记**：末条进程退出码为 `1`，**非测试失败**——测试汇总已打印 `pass 909 / fail 0`，`exit=1` 系 Playwright 收尾时其自身 `debug.log` 写入被沙箱拦截（`TRAE Sandbox Error: hit restricted`）；**与测试内容无关**。
- ⚠ **`.tmp-b329.log` 诊断日志**已按「`.tmp*` 不留盘」纪律**删除**（不随提交）。

## 批次 330（2026-10-01）：转交组织者补两项（通知被退出的原组织者 ＋ 支书台活动详情面板加跳转）

> **决议 / 过程判据（`R-84`）**：本批**因裁而作**——批次 328 送裁的两条「在办」项获支书逐字裁定（**逐字见「一」**）。**裁定进决策日志**（`D-737`），**实现与实测进本节**。

### 一、支书 2026-10-01 裁定（逐字）

| # | 送问 | 支书裁定（逐字） |
| --- | --- | --- |
| 1 | 通知口径（只知会 / 知会 ＋ 交接提示 / 知会 ＋ 派生待办） | **「知会 ＋ 交接提示（推荐）」** |
| 2 | 跳转入口位置（顶部徽章行右侧 / 活动信息卡内 / 面板底部动作区） | **「顶部徽章行右侧（推荐）」** |
| 3 | 本批是否现在开做 | **「现在就做！！你必须规划好你要做什么，不能让目标永远不能收敛！！」** |

### 二、本批实现

- **① 通知被退出的原组织者**：新增系统派生通知 kind **`organizer-transferred`**——客户端模板（`docs/src/core/domain/system-notice-templates.js`）＋ 服务端注册表（`server/system-notice-kinds.js`）；受众＝**到人定向**（`audiencePersons`＝被退出的原组织者一人）、**不发角色广播**；文案＝**知会 ＋ 交接提示**、**不派生待办**；`organizer-transfer.js::transferOrganizer` 转交成功后 `NoticeStore.addSystem(...)`（失败只告警、**不回滚转交**）。
  - 服务端 `authorize`＝**支委层 或 被退出的原组织者本人**（`payload.removedPersonId === actor.id` ⇒ 受众＝他自己，只可能伤及本人）＋ **对象存在**；`build` **项目名按表复算**（`activities.title` / `taskforces.name`，不采信客户端同名值）。
- **② 支书台活动详情面板加跳转**：`docs/src/components/record/inspector.js` 顶部徽章行右侧加 `./activity.html?id=` 一枚「活动详情页 ›」（**只给支书 / 副支书**，`SECRETARY_ROLES`；`<base href="../">` 故写 `./`）；**不在面板内写第二份「转交」实现**。

### 三、同批改准的台账（**不是放宽**）

- `README-server.md` §6.7：kind 数 **21 → 22**（三处：清单标题 / 依据行「22 个键」/ 文件表「22 种 kind」）＋ 注册表区间 `:57-316 → :57-348` ＋ 补 `:325-347`（新 kind）引用。
- `server/test/form-loop-registry.mjs`：两处 `line` 随本批插入行同步——`inspector.js` 信息编辑 3 条 **1354/1355/1356 → 1360/1361/1362**（跳转段 +6 行）；`organizer-transfer.js` 接手人 **117 → 132**（import 注释 +3 ＋ 通知段 +12）。
- `server/test/permission-gate.test.mjs`：新增「转交组织者通知」用例（支委层 201 ＋ 受众到人 ＋ 项目名按表复算；非支委且非本人 403；本人 201；对象不存在 403）。

### 四、守卫实跑（本批定向）

- `permission-gate`（含新用例）· `doc-consistency`（`S5`/`S14` kind 数对账）· `doc-line-ref`（`R1–R6`）· `link-integrity`（`L1` 渲染型 `./activity.html` ＋ `L2`/`L3`/`L4`/`L5`）· `import-path-guard` · `module-load` · `button-system-guard` —— **49 / 49 / 0 红**。

### 五、改动清单

| 文件 | 改什么 |
| --- | --- |
| `docs/src/core/domain/system-notice-templates.js` | 新增模板 `organizer-transferred` |
| `server/system-notice-kinds.js` | 新增 kind（authorize 支委层 / 本人；build 按表复算项目名） |
| `docs/src/components/governance/organizer-transfer.js` | 转交成功后通知原组织者 |
| `docs/src/components/record/inspector.js` | 支书台徽章行右侧加「活动详情页 ›」跳转 |
| `README-server.md` | §6.7 kind 数 22（三处）＋ 注册表区间 |
| `server/test/form-loop-registry.mjs` · `server/test/permission-gate.test.mjs` | 行号同步 ＋ 新用例 |
| `.ctx/logs/2026-09-DECISION_LOG.md` · `.ctx/logs/DECISION_LOG.md` · 本节 | `D-737` ＋ 四处计数 `462 → 463` |
| 全站 `?v=` | `20261001o → 20261001p`（JS 217 / HTML 22 / CSS 2 / server-test 88；陈旧戳自检 0 残留） |

### 六、如实登记

- **不动** `AuthStore.syncProjectRoles` 的既有通知面（接手人那条 `project-auth-granted` 一字未动）。
- 转交由**现任组织者本人**发起时，接手人那条既有通知在 api 模式仍受其 authorize 的支委层限制（**先于本批的既有边界**，只登记、不动）。
- `ACTIVE_RULINGS.md` **0 行**（两项皆属既有裁定的落地，不产生新口径）。
- 真机（`http://127.0.0.1:3001`，演示种子）已交支书目验。

### 七、收尾全量（`R-85`）

- **`npm test`：910 项 / 910 过 / 0 红 / 0 跳过** · **耗时 1,346,832 ms（≈22.4 分钟）**（本批新增 `permission-gate` 用例 ⇒ 909 → 910）。
- ⚠ **如实登记（三跑才绿）**：首跑 `fail 1`——`form-loop-sweep::S6` 抓到本批插入行致 `inspector.js` 信息编辑 3 条行号漂移（1354/1355/1356 → 1360/1361/1362）；改准后第二跑又 `fail 1`——`organizer-transfer.js` 接手人 117 → 132。两处**均先直接实读目标行核对、再改**，第三跑 **910 / 910 / 0**。
- ⚠ **如实登记（退出码）**：末条进程退出码为 `1`，**非测试失败**——测试汇总已打印 `pass 910 / fail 0`，`exit=1` 系 Playwright 收尾时其自身 `debug.log` 写入被沙箱拦截（`TRAE Sandbox Error: hit restricted`）；**与测试内容无关**。
- ⚠ **`.tmp-b330*.log` 诊断日志**已按「`.tmp*` 不留盘」纪律**删除**（不随提交）。

## 批次 331（2026-10-02）：`V-3` 余项 —— 出「8 台 × 现序 × 建议序」页签顺序对照表（**待支书圈**）

> **决议 / 过程判据（`R-84`）**：本批**因裁而作**——支书 2026-10-01 就「高频功能落点」取**甲**并令「**页签顺序由 AI 先出「8 台 × 现序 × 建议序」对照表请支书圈**」（`D-730`）。**过程进本节**；**待裁命题本体进 `.ctx/REVIEW_QUEUE.md`**（其唯一职责，`R-86`）。

### 一、本批做了什么

- **补 `V-3` 的 ② 余项**：出「**8 台 × 现序 × 建议序**」对照表，落 `.ctx/REVIEW_QUEUE.md`「乙部 `V-3` 余项：页签顺序对照表」（**待支书圈**）。
- **现序取数＝唯一源**：各台 `docs/src/capabilities/*-workspace.js` 的页签注册数组**实读**；**合计 9＋10＋12＋7＋10＋12＋12 ＝ 72**，与 `page-sweep` 实测 `tab=72` **互证**。
- **建议序原则（写进表头）**：**组序与数量一律不动**（`V-2` / `V-3①` 已定 DOM，不重排结构），**只调「我的职责」组内按动作频次降序**；标 `✱` 者为建议改动、未标者＝建议维持。
- **`V-3` ①（功能钮提台顶栏）**经核实**已于批次 317 落地**（`components/shell/header.js` 本台主 CTA 槽位 `#header-cta-slot` ＋ `mountHeaderCta()`）⇒ 本批**只补 ②**，不重复实现。

### 二、改动清单

| 文件 | 改什么 |
| --- | --- |
| `.ctx/REVIEW_QUEUE.md` | 追加「乙部 `V-3` 余项：页签顺序对照表」节（**追加于文件末尾 ⇒ 既有行号零位移**）＋ frontmatter `last_updated` → 2026-10-02 |
| `CLAUDE.md` | 乙部在办表 `V-3` 行 ② 由「在办」→「**已出对照表 · 待支书圈**」（**行内改、行数零增减**）＋ frontmatter → 2026-10-02 |
| `.ctx/TIMESTAMPS.md` | `CLAUDE.md` / `.ctx/REVIEW_QUEUE.md` 两行日期 → 2026-10-02（过 `doc-consistency::S13` / `frontmatter-freshness::F2`） |

### 三、守卫实跑

- `doc-consistency` · `timestamps-note-guard` · `frontmatter-freshness` · `doc-line-ref` · `link-integrity` —— **37 / 37 / 0 红**。
- **只改 md ⇒ 未 bump `?v=`**（仍 `20261001p`）；**决策日志四处计数不变**（本批**无新裁定**，只是执行 `D-730` 的既有裁定 ⇒ 按 `R-84` **不另立 `D-` 条**）。

### 四、如实登记

- ⚠ 本批**只出表、不动任何注册数组**——改序须**支书圈定后另批落地**（同批改 `help.html` 五处表 ＋ 各台注册数组），否则 `doc-consistency::S1` 的页签计数会与代码对不上。
- ⚠ `V-3` **③**（「＋ 新增党小组」未提顶栏）**仍待支书复核**（批次 317 已如实登记为「卡内动作、非台主 CTA」）。

### 五、收尾全量（`R-85`）

- **`npm test`：910 项 / 910 过 / 0 红 / 0 跳过** · **耗时 1,357,486 ms（≈22.6 分钟）**。
- ⚠ **如实登记**：末条进程退出码 `1`，**非测试失败**——测试汇总已打印 `pass 910 / fail 0`；`exit=1` 系 Playwright 收尾时其自身 `debug.log` 写入被沙箱拦截（**与测试内容无关**）。
- ⚠ **`.tmp-b331.log` 诊断日志**已按「`.tmp*` 不留盘」纪律**删除**（不随提交）。

## 批次 332（2026-10-02）：`V-12` 余项收口 —— 筛选行 chip 形态「余下各页」按判据迁移

> **决议 / 过程判据（`R-84`）**：本批**因裁而作**——承支书 2026-10-01 `V-12` 裁定（取**甲**：推翻 `R-41`，改「搜索框 ＋ `span` 小胶囊」）＋ 执行取**丁**「**具体问题一定要具体分析**」；批次 319 只落**首批两页** ⇒ 本批做**余项**。**裁定（判据）进决策日志**（`D-738`），**实现与实测进本节**。

### 一、判据（把「具体分析」收成一条可判句）

- **人维表（`personFacets`）→ chip**：值集**小且稳定**（党小组 ~4 / 发展阶段 ~5 / 角色 ~6 / 在册 ~3）⇒ 平铺一次看全、少一次展开点击。
- **活动类表（`activityFacets`）→ 保持 `dropdown`**：含**月份 / 类别 / 类型 / 状态**（类型近十种）⇒ 平铺成「胶囊墙」反不如一次展开。
- ⚠ 引擎**两形态并存**、`facetStyle` 仍**逐页 opt-in**（默认不翻）；本批动的是**表类**这一层，**页级例外仍可另裁**。

### 二、本批实现

- **共迁 13 处**（10 个文件）加 `facetStyle: 'chip',`：`disc/makeup-tab`（104）· `disc/inspection-tab`（113）· `leader/attendance-tab`（210）· `leader/inspection-tab`（159）· `leader/members-tab`（159）· `org/inspection-tab`（137）· `org/taskforce-tab`（773）· `org/member-flow-tab`（224，**方向：流入 / 流出 2 值**）· `secretary/assign-tab`（192 / 385 / 619 / 759，**4 处**）· `secretary/group-progress-tab`（424）。
- **终止自检（写进脚本、跑过）**：`docs/src` 内**每一处** `facets: personFacets(` 的下一行**必有** `facetStyle` ⇒ 人维表侧**全量迁移、无漏网**（唯一命中例外是引擎文件头注释里的示例行，非调用点）。
- **定向件改样本**：`list-filter-chip-e2e::S11②` 的「未迁移样本」原为「考察上传」（**人维表** ⇒ 按新判据已迁，旧样本失效）⇒ 改指**活动类表页**（成员台「我的考察」，`visitor/inspection-tab` 用 `activityFacets()`）；新增成员登录助手（`p5` 2400012349）。新样本**恰落在判据线另一侧**，比原样本更贴题。

### 三、同批改准的台账（**不是放宽**）

- `server/test/form-loop-registry.mjs`：**29 处** `line` 随本批插入行同步（插 1 行的文件 +1；`assign-tab` 因 4 处插入，按插入位置分别 +1 / +2 / +3；`taskforce-tab` 1 处插入在其全部登记点之前 ⇒ 全 +1）。**先取 S6 实报的失配清单、再按位置差改，未凭猜**。
- `CLAUDE.md`：乙部在办表 `V-12` 行状态改「**余下各页已按判据迁移**（批次 332 · `D-738`）」。

### 四、守卫实跑

- `list-filter-chip-e2e`（S11 三条，含改样本后的反向证据）· `filter-row`（S2/S6/S7/S8/S10/S11）· `button-system-guard`（B4）· `module-load`（E1–E4）· `doc-consistency` —— **41 / 41 / 0 红**。
- `doc-consistency` ＋ `doc-line-ref` ＋ `timestamps-note-guard` ＋ `frontmatter-freshness` —— **32 / 32 / 0 红**（四处计数 464 一致 · `README-server.md` 侧行号引用未受影响）。

### 五、改动清单

| 文件 | 改什么 |
| --- | --- |
| `docs/src/entries/tabs/**`（10 个文件） | 13 处加 `facetStyle: 'chip',` |
| `server/test/list-filter-chip-e2e.test.mjs` | 新增成员登录助手 ＋ ② 反向样本改指活动类表页 ＋ 文件头补判据 |
| `server/test/form-loop-registry.mjs` | 29 处 `line` 同步 |
| `CLAUDE.md` | `V-12` 行状态改准 |
| `.ctx/logs/2026-09-DECISION_LOG.md` · `.ctx/logs/DECISION_LOG.md` · 本节 | `D-738` ＋ 四处计数 `463 → 464` |
| 全站 `?v=` | `20261001p → 20261001q`（JS 217 / HTML 22 / CSS 2 / server-test 88；陈旧戳自检 0 残留） |

### 六、如实登记（**两跑才绿**）

- **首跑 `fail 1`**：`form-loop-sweep::S6` 抓到本批插入行致 **29 处** `line` 漂移（7 个文件的检查点台账）；**按 S6 实报清单改准后**第二跑 **910 / 910 / 0**。
- ⚠ `personFacets` 侧**全量迁**（终止自检已跑）；**活动类表一律未动**——若支书认为某页活动表也该平铺，属**页级另裁**（本批不代裁）。
- ⚠ `docs/src/entries/tabs/**` 之外**未动任何文件**（引擎 `list-filter.js` 两形态并存、一字未改）。

### 七、收尾全量（`R-85`）

- **`npm test`：910 项 / 910 过 / 0 红 / 0 跳过** · **耗时 1,343,613 ms（≈22.4 分钟）**。
- ⚠ **如实登记**：末条进程退出码 `1`，**非测试失败**（已打印 `pass 910 / fail 0`；系 Playwright `debug.log` 写入被沙箱拦截）。
- ⚠ **`.tmp-b332*.log` 诊断日志**已按「`.tmp*` 不留盘」纪律**删除**（不随提交）。

### 附：TIMESTAMPS 备注列迁出的逐批沿革（批次 333 · 第六轮）

> **本批迁出 2 格**（备注列第六轮 · `R-89`）。**另修一处结构缺陷**：`content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md` 那格备注内含一个**未转义竖线** ⇒ 该行拆成 **8 段**，而守卫 `timestamps-note-guard` 的解析口径是「**恰好 7 段**」⇒ **该行历轮都被整行跳过**（其 1649 字沿革因此从未被压到）。本批把结构修回 5 列、并把该段沿革一并迁出。

**① `content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md`**（原格全文，逐字）：

```text
**（2026-09-30 批次 309：`§0`「范本 2–28」全文迁出、原位只留索引表；沿革入 `.ctx/logs/`）** **（本批：`R26` 范围 → `S1–S16`）** **（本批：`§0.2` 加 R33〔收 `H-3`〕）** **（2026-09-26 批次 205：`§0.2` 由 **39 行**补到 **51 行**（⚠ 批次 196 那句「`§0.2` 现 24 行」经机械复核为**低估**——**补行前实测已 39 行**，按 `^\
[⚠ 原格内含一个**未转义**的竖线（正是使该行成为 8 段、被守卫整行跳过的原因）]
` 计）——12 个「已落地但未登记」的守卫逐条补入（`doc-line-ref` / `frontmatter-freshness` / `copy-master-guard` / `copy-length-guard` / `copy-screen-guard` / `copy-fold-guard` / `copy-anchor-guard-e2e` / `mock-api-parity` / `db-migration` / `backup-restore` / `db-integrity-guard` / `localstorage-key-guard`；**断言号一律实读**）；§4 考勤 **`151 → 152`**（含补计隔离段 `att900`）；T-280-B5「仅 seed 8 集合、不覆盖 `attendances/inspections/todos`」**改准**为「现 `replaceCollection` **30 集合**、**已覆盖**三者」；R26 守卫范围 `S1–S12 → S1–S15`；**`§3.4` 无需同步**〔本批新增均**非 R 编号行**〕）** **2026-09-25 批次 196：`§0.2` 新增 3 行**（R17 行后加「硬编码 hex 存量回归 → `hex-hardcode-guard::H1–H5`」与「控件小字存量回归 → `control-font-guard::T1–T4`」；`link-integrity::L1–L5` 行后加「裸文件名链接 → `link-target-guard::L6–L7`」）⇒ **`§0.2` 现 24 行**；⚠ **本表行日期按 `S13` 口径「以 frontmatter 为准」保持 `2026-09-21`**——本文件正文（`§0.2`）本批已改，但 **frontmatter `last_updated` 仍 `2026-09-21`**（属 `content/**` 禁改面 ⇒ 未代刷）⇒ **不刷为 `2026-09-25`**（否则 `S13` 判红；处置同批次 111 的 `DATA_MODEL.md` 先例）；且 **`§3.4`↔`§0.2` 同步如实登记**（`§3.4` 在 `.ctx/ENGINEERING_ASSESSMENT.md`〔绝不改〕，本次新增行**不是 R 编号行**、`§3.4` 也未列 ⇒ 无需也无法同步）；数据同源一致性校验手册（T-278 无人称修缮；T-280 B1-1 登录跳转表述修正 + §16 登录门控 + 待办直达检查项 + T-235 第3轮实测回填；2026-09-20 批次 110 改准 `todo-tab.js:767` → `secretary/todo-tab.js:672` 与台账 93/91/2 → 95/91/4，批次 113 刷本行日期；**2026-09-21 批次 126 两处改准**：§10 展示页表的「反馈统计（支书专属…）」→「意见处置＝支委层」、同源校验点「支书专属权限 … `_ISSUE_PERMS_SECRETARY`」→「意见处置权限 … `_ISSUE_PERMS_DISPOSITION`」，frontmatter 与本报行同步刷为 2026-09-21）
```

**② `docs/src/data/data-adapter.js`**（原格全文，逐字）：

```text
**（本批：加装配标记〔收 `H-3`〕）** **（2026-09-26 批次 205–207：`_commitBase` 同族残余已修——回退块由「`['attendances','inspections']` 并列写死」改为按真实判据算 `filled`、只登记实际被注入的键；**Z5 语义一字未变**、净行数 0〔`numstat 3 3`〕；`['todos']` 那处**不改、只登记**〔外层守卫即 `!mockDB.todos.length`、无并列键可误推〕）** 数据适配器（setDataSource/init/persist）；**2026-09-26 批次 201（`D-661`）**：`_captureBase(mockDB)` **前移到任何 `await` 之前**（含 `_loadAuxCollections`）⇒ 修「就绪比基线早 ⇒ 吞写 ⇒ `_collectDirty` 判无脏集合 ⇒ flush 跑了但不发 POST」；★ **修正批次 197 两条判断（此前判断有误）**；**净行数 0**（`git diff --numstat` **9/9**）；**2026-09-25 批次 197（`D-657`，★ 本条系补记）**：修「**写入静默丢失**」竞态——`init()` 里两个 `SEED_FALLBACK` 回退块含 `await import(...)` ⇒ 紧随其后的**基线捕获 `_captureBase(mockDB)` 被推后成异步**（而**页面就绪判据**不等该回退）⇒ 窗口内写入被**随后捕获的基线一并吞掉**（`_collectDirty` 判「无脏集合」⇒ 跳过上传）；**修法**＝`_captureBase` **移到任何 `await` 之前**（`:322`）＋ 回退块改用 `_commitBase(mockDB, [...])` **显式登记**（`:339` / `:349`；Z5 语义不变）；**净 +9 行**（`11 / 2`）；**正样本**＝`POST /api/v1/snapshot → 200 {"versions":{"archiveRecords":1}}`、`archive_records` 6 → 7
```

## 批次 333（2026-10-02）：`R-89` TIMESTAMPS 备注列第六轮 —— **迁 2 格 ＋ 修一处「被守卫整行跳过」的结构缺陷**

> **决议 / 过程判据（`R-84`）**：本批属**执行**（承支书 2026-09-30「很多文档都膨胀了！…（特别是 AI 文档）」的存量压缩令 ＋ `R-89` 的收敛路径）⇒ **过程进本节，不另立 `D-` 条**。逐字沿革见本节**上方**「附：TIMESTAMPS 备注列迁出的逐批沿革（批次 333 · 第六轮）」。

### 一、本批查出一处**守卫看不见的行**（真缺陷）

- `content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md` 那格备注内**含一个未转义竖线** ⇒ 该行 `split('|')` 得 **8 段**；而守卫 `timestamps-note-guard` 的解析口径是「**恰好 7 段**」（`c.length !== 7` 即 `continue`）⇒ **该行历轮都被整行跳过**。
- **后果**：该格 **1,649 字**的逐批沿革（全表最长）**从未被任何一轮压到**；且它**不计入** `N2` 总量预算 ⇒ 预算读数偏乐观。
- **本批处置**：**修回 5 列结构 ＋ 把该段沿革一并迁出**（该格入 `.ctx/logs/`，原位换短注）。

### 二、本批做了什么

- **迁出 2 格（逐字入本节上方附节）**：① `content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md`（1,649 字，见上）；② `docs/src/data/data-adapter.js`（968 字，全表**可见**最长格）。两格原位换**短注**（现状 / 边界 / 指针，各 ≈150 字）。
- **预算下调（只降不升）**：`NOTE_TOTAL_BUDGET` **50,000 → 47,500**（守卫口径实测 **47,744 → 47,136**；表行 275 → 276——第 276 行正是**修复后首次可见**的那行）。
- **清单同步（只降不升）**：`WITH_BATCH_MENTION_BASELINE` **删 1 条**（`docs/src/data/data-adapter.js`——其新短注只 1 次「批次」⇒ 不再命中 `N6`）；`OVERLONG_BASELINE` **仍为 0 条**（迁后全表无 >1000 字格，**达标态**）。
- **`TIMESTAMPS.md` 自身三值同刷**：frontmatter `last_updated` ＋ 头下回显 ＋ 表行日期 **2026-09-30 → 2026-10-02**（该文件本批被改 ⇒ 按 `R-83` 刷卡；`S13` 要求表行 ＝ frontmatter）。

### 三、守卫实跑

- `timestamps-note-guard`（N1–N7，含 `N6` 实测 24 → **23** 条与清单逐字相等）· `doc-consistency`（`S13` 三值一致）· `frontmatter-freshness` —— **26 / 26 / 0 红**。
- **只改 md / 一个测试数据文件 ⇒ 未 bump `?v=`**（仍 `20261001q`）；**决策日志四处计数不变**（本批无新裁定 ⇒ 按 `R-84` 不另立 `D-` 条）。

### 四、如实登记

- ⚠ **本批不动任何业务代码 / 母本**；只动 `.ctx/TIMESTAMPS.md`（台账本体）· `.ctx/logs/2026-09-EXECUTION_LOG.md`（迁入）· `server/test/timestamps-note-baseline.mjs`（预算与清单）。
- ⚠ **守卫的解析口径未放宽**（仍是「恰好 7 段」）——本批修的是**行**、不是**判据**；修好后该行**进入**判据面（这正是本批的价值：把洞堵上）。
- ⚠ 备注列**仍未清零沿革**（余 23 格含 >3 次「批次 N」、14 格含日期复述、72 格含 T-编号）——属**存量台账**（逐轮收敛），本批**不扩项**。

### 五、收尾全量（`R-85`）

- **`npm test`：910 项 / 910 过 / 0 红 / 0 跳过** · **耗时 1,344,780 ms（≈22.4 分钟）**。
- ⚠ **如实登记**：末条进程退出码 `1`，**非测试失败**（已打印 `pass 910 / fail 0`；系 Playwright `debug.log` 写入被沙箱拦截）。
- ⚠ **`.tmp-b333.log` 诊断日志**已按「`.tmp*` 不留盘」纪律**删除**（不随提交）。

## 批次 334（2026-10-02）：支书评议批（11 条）之 **#7** —— 工作台 tab「加载不出来」**全域体检 ＋ 真机取证**

> **决议 / 过程判据（`R-84`）**：本批**因裁而作**——支书 2026-10-02 评「我发现 **tab 在切换和加载中存在 加载不出来的问题**！这很严重！」（**#7**），并指认台/tab＝**组织委员台**的「**活动日历**」与「**知情查看**」。**过程进本节**。

### 一、真机取证（三条探针 · 结论 ＝ **未复现**）

| 探针 | 场景 | 结果 |
| --- | --- | --- |
| ① 深链直开 | `workspace/org.html?tab=` `today` / `calendar` / `tf-view` / `roster` | 四 tab **均渲染**（1469 / 7995 / 9254 / 23594 字符）· **零 pageerror** |
| ② 点击切换 | 今天 → 活动日历 → 知情查看 → 成员名册 → 活动日历 → 知情查看（各停 1.2s） | **每次命中目标 tab** · 无残留上一 tab 内容 · 无骨架卡滞留 · 零 pageerror |
| ③ 连点竞态 | 无间隔连点 6 次（含两轮往返）＋ 快速往返（间隔 60ms） | 末态＝**最后点击**的 tab ⇒ **无「旧 import 晚到覆盖新 tab」** · 零 pageerror |

- ⇒ **代码层无此缺陷**；**容器 id 亦无误**：`#<prefix>-tab-content` 由 `docs/src/components/shell/tab-bar.js::renderTabBar` **生成**（五台「活动日历」与其一致），并非指向不存在的 id。
- **最可能的环境因**：本会话连续 bump `?v=` **5 次**（`n → o → p → q`）⇒ 浏览器里旧 HTML 与新模块**混版**（同一模块两个 token ＝ 两个实例）。**处置**＝**硬刷新（Ctrl+F5）**；并由下方**体检**兜住「静默空白」。

### 二、补上缺失的守卫（**真缺口**）

- `server/test/page-sweep.test.mjs` 原只查「分页 / 宽表 / 检索 / 脚本错误」——**「整页空白」不在覆盖面内**：`render` 里 `if (!el) return` 一类的**静默失败**不会被任何守卫发现（支书所谓「加载不出来」正是这一类）。
- 本批在 **8 台 × 全部 72 个 tab** 的切换循环里加**两条断言**：① 容器 `#<prefix>-tab-content` **必须存在**（防 `renderTabBar` 口径漂移）；② 该 tab 的 `innerHTML` **长度 > 10**（防静默空白）。
- **本次实跑**：`page-sweep` **11 / 11 绿**，`tab=72` **全部通过** ⇒ **现状无空白 tab**；该断言自此为**永久体检**（今后任何「加载不出来」必在 `npm test` 现身）。

### 三、如实登记

- ⚠ **未改任何业务代码**（探针证明无需改）；本批**只加守卫**。
- ⚠ 「活动日历 / 知情查看」在**代码层**无缺陷；若**硬刷新后仍复现**，请给**台 / tab / 浏览器 / 复现步骤**，我按新证据再查（不凭猜改码）。
- ⚠ **#6 十月日志体系**未在本批处理；**本节暂记于 9 月日志**，换月批（即将建 `2026-10-*`）一并迁入。

### 四、收尾全量（`R-85`）

- **`npm test`：910 项 / 910 过 / 0 红 / 0 跳过** · **耗时 1,376,306 ms（≈22.9 分钟）**。
- ⚠ **如实登记**：末条进程退出码 `1`，**非测试失败**（已打印 `pass 910 / fail 0`；系 Playwright `debug.log` 写入被沙箱拦截）。
- ⚠ **`.tmp-b334.log` · `.tmp-sweep.log` · 三条探针脚本**均已按「`.tmp*` 不留盘」纪律**删除**（不随提交）。

## 批次 335（2026-10-02）：**#6 十月日志体系换月 · 第一步** —— 判据改造（活跃决策日志按 `status: active` 指认 ＋ 各月交叉核对）

> **决议（`R-84`）**：支书 2026-10-02 就「**#6 既然已经是十月了，为什么还没有更新好我们的日志体系？请完善好！**」**取甲**「**真换月：迁入 ＋ 改判据**」。**裁定进决策日志**（`D-739`），**过程进本节**。

### 一、为什么不能只「建个文件」（勘察结论 · 有据）

- `server/test/doc-consistency.test.mjs:565` **硬编码** `2026-09-DECISION_LOG.md` 为唯一决策日志；`:697-707` 要求**四处同源**（文首「共 N 条 / 末条 / 下一条自」· 续编说明 · **本月目录末条** · 月度索引行）＝该文件的 `D-` 计数与末号。
- ⇒ 一旦把 10 月条目（`D-729…D-738`）迁出，9 月文件的**本月目录末条**就不再等于全局末号 ⇒ **守卫立刻红**。**换月必须与判据改造同批**（这正是本批先做判据的原因）。

### 二、本批做了什么（第一步 · 判据改造）

- `DECISION_LOG` 由**硬编码**改为**按 `status: active` 指认**，并**取最新一份**（`:571-575`）——把「月份」从判据里抽掉，以后换月只改文件、不改判据。
- 新增 **⑥-2「各月文件 × 月度索引行」交叉核对**（`:720-733`）：逐月核对「`## D-` 条数 / 起始号 / 末号」与索引行**三项相同**（**只增不减**：换月后旧月自动纳入，比原来只看一份**更强**）。
- **边界如实登记**：⑥-2 只覆盖索引行采用**现行格式**（`N 条（D-a~D-b）`）的月份；2026-06/07 等历史月是旧写法（无区间），**不在判据面内——不假装覆盖**。

### 三、**首跑抓到判据自身两处真缺陷**（改判据必须实跑的证据）

| # | 缺陷 | 处置 |
| --- | --- | --- |
| ① | `2026-07-DECISION_LOG.md` **冻结时 `status: active` 未改** ⇒ 「取第一个命中的」把判据**指到旧月** | 改为**取最新**的一份 active（`_dlActives[_dlActives.length - 1]`） |
| ② | 旧格式月（2026-07）索引行**无区间** ⇒ 新判据对其恒红 | ⑥-2 加**现行格式**白名单；旧月明确登记为判据面外 |

- ⚠ 两处均**照实记录**：若无本批实跑，②会以「判据变松」的形式潜伏。

### 四、第二步（**紧接下一批 · 行号地图已备**）

| 对象 | 切点 / 迁移面（**实读行号**） | 备注 |
| --- | --- | --- |
| `2026-09-DECISION_LOG.md` | `## D-729` 起 → **`:19835`** 至文末 ⇒ 迁入新 `2026-10-DECISION_LOG.md` | 9 月剩 `D-275…D-729` 区间待定（**含本批 `D-739`，切点须一并复核**） |
| `2026-09-EXECUTION_LOG.md` | `## 批次 323` 起 → **`:22398`** 至文末 ⇒ 迁入新 `2026-10-EXECUTION_LOG.md` | 10 月批次 323、325–334（含批次 333 的 `附`） |
| 两份文件的 `## 本月目录` | 9 月表内**混引 10 月条目**者（**`:463-475`** 实读，13 行长行） | **必须逐行判**，不能机械搬 |
| `.ctx/logs/DECISION_LOG.md` | `2026-09` 行改准 ＋ **新增 `2026-10` 行** | ⑥-2 会自动核对 |
| 两份 9 月文件 frontmatter | `status: active → archived` ＋ 指针到 10 月文件 | 顺带改正 **2026-07** 的 `status` 遗留（本批已发现的同类问题） |

### 五、如实登记

- ✔ **未动任何日志正文**（本批只改判据 ＋ 台账）；**未 bump `?v=`**（只改测试与 md）。
- ⚠ **换月尚未完成**：`2026-10-*` 两个文件**尚未创建**（第二步）。本节与 `D-739` 仍记于 9 月文件——**这是第二步要迁的对象本身**，如实登记。

### 六、收尾全量（`R-85`）

- **`npm test`：910 项 / 910 过 / 0 红 / 0 跳过** · **耗时 1,400,603 ms（≈23.3 分钟）**。
- ⚠ **如实登记**：末条进程退出码 `1`，**非测试失败**（已打印 `pass 910 / fail 0`；系 Playwright `debug.log` 写入被沙箱拦截）。
- ⚠ **`.tmp-b335.log`** 已按「`.tmp*` 不留盘」纪律**删除**。

## 批次 336（2026-10-02）：**#6 十月日志体系换月 · 第二步** —— 十月两文件落位 ＋ 10 月内容逐字迁入

> **决议（`R-84`）**：承 `D-739`（支书 2026-10-02 裁「**甲 真换月：迁入 ＋ 改判据**」）。**本批＝执行**（判据已在批次 335 改造完毕）⇒ 按 `R-84` **不另立 `D-` 条**。

### 一、本批做了什么（换月落地）

| 动作 | 实读数据 |
| --- | --- |
| **新建** `.ctx/logs/2026-10-DECISION_LOG.md` | 自 9 月文件**逐字迁入** `D-729`…`D-739` **11 条**；自带「条目编号起止」＝`D-729`…`D-739`／共 **11** 条／下一条自 `D-740` ＋「本月目录（2026-10）」＋续编说明 |
| **新建** `.ctx/logs/2026-10-EXECUTION_LOG.md` | 自 9 月文件**逐字迁入** **12 个批次节**（批次 323、325–335；含批次 333 的「附：TIMESTAMPS 备注列迁出」） |
| `2026-09-DECISION_LOG.md` | **冻结**（`status: archived`）＝止于 `D-728`／**454 条**；正文自 `D-729` 起整段移出；**本月目录按条目归属拆出 11 行**；文首「追加链」换为**冻结指针** |
| `2026-09-EXECUTION_LOG.md` | **冻结**＝止于 2026-09-30 的批次；文末加「本文件已冻结（批次 336 换月）」指针节 |
| `.ctx/logs/DECISION_LOG.md`（月度索引） | `2026-09` 行 → **`454 条（D-275~D-728）`**；**新增 `2026-10` 行** → `11 条（D-729~D-739）` |
| `.ctx/logs/EXECUTION_LOG_INDEX.md` | `2026年09月` → ✅ 已归档；**新增 `2026年10月` → 📝 活跃（当前月份）** |
| `.ctx/TIMESTAMPS.md` | 两份 9 月文件行日期 → 2026-10-02（本批被改）＋ **新增两份 10 月文件行** ＋ `EXECUTION_LOG_INDEX` 行 → 2026-10-02 |

### 二、**切分口径（关键判断 · 不是机械搬）**

- **本月目录不整体搬**：9 月表内**混引 9/10 月条目**的长行，按「**该行是否引用 `D-729` 及以上**」**逐行判**——引用到 10 月的 **11 行**迁入 10 月表，其余留 9 月（依守卫口径：**本月目录末条 ＝ 该文件实测最大 `D-` 号**）。
- **执行日志按批次整段搬**：切点＝`## 批次 323（2026-10-01）`。**批次 324 无独立执行节**（其内容见 `D-731`），故 10 月**12 节**＝批次 323、325–335。

### 三、**首跑抓到的问题（如实登记 · 换月脚本三处自伤）**

| # | 现象 | 根因 | 处置 |
| --- | --- | --- | --- |
| ① | 新文件**头部被守卫整段当一行**读（`## 本月目录` 找不到、文首抽不出） | 换月脚本头部用 **CR-only** 换行（仓库为 CRLF） | 规范为 CRLF 后复绿 |
| ② | 新决策日志**文首三处数抽不出来** | 头部锚点写成 `**本文件条目编号起止**`，判据要的是 `**条目编号起止**` | 改准锚点词 |
| ③ | `EXECUTION_LOG_INDEX.md` **表行 2026-09-19 ≠ frontmatter 2026-10-02**（`S13`） | 只刷了 frontmatter、**漏刷 `TIMESTAMPS` 行** | 补刷 |

### 四、守卫实跑

- `doc-consistency`（含改造后的 ⑥ / ⑥-2：**活跃＝`2026-10` 四处同源** · **9/10 两月 × 索引行交叉核对**）＋ `timestamps-note-guard` ＋ `frontmatter-freshness` ＋ `link-integrity` ＋ `doc-line-ref` —— **37 / 37 / 0 红**。

### 五、如实登记

- ⚠ **本节即首个落在 10 月文件里的批次节**（换月后新批次一律记于本文件）。
- ⚠ **未 bump `?v=`**（只改 `.ctx/**`）。
- ⚠ **遗留**：`2026-07` / `2026-08` 两份月决策日志的 frontmatter `status` 是否仍为 `active` **本批未动**（判据取「**最新** active」故不影响正确性）；如需彻底整洁，另批处理。

### 六、收尾全量（`R-85`）

- **`npm test`：910 项 / 910 过 / 0 红 / 0 跳过** · **耗时 1,402,241 ms（≈23.4 分钟）**。
- ⚠ **如实登记**：末条进程退出码 `1`，**非测试失败**（已打印 `pass 910 / fail 0`；系 Playwright `debug.log` 写入被沙箱拦截）。

## 批次 337（2026-10-02）：支书评议批 `#9` —— **徽章红/金分色**（含 `styles.css` 特批）

> **决议（`R-84`）**：本批**因裁而作**——支书 2026-10-02 评「为什么没有复用日历中的**红色和金色**呢，而要自己另起炉灶？」并圈选**甲**「改 `styles.css`（党建红）——需特批」。**裁定与特批登记进决策日志**（`D-740`），**过程进本节**。

### 一、根因（有据）

- `components/ui/badge.js:14-17` 的 `BADGE_VARIANT_CLASS` 给 `brand` / `gold` **各挂一个内联 `text-amber-800`** ⇒ 把 `.badge--brand`（琥珀）与 `.badge--gold`（金）**盖成同一色**；而 `constants.js:760` 的语义是**三会一课＝党建红（`brand`）/ 主题党日＝党徽金（`gold`）**。

### 二、本批实现

| 文件 | 改什么 |
| --- | --- |
| `docs/src/styles.css`（**本轮特批**） | `.badge--brand` 浅色 / 深色两条 → **党建红**：浅色 `background: #FEE2E2; color: var(--party-red); border: 1px solid rgba(206, 17, 38, 0.25)`；深色 `rgba(206, 17, 38, 0.18)` 底 ＋ `var(--functional-error)` 字。**用现成 token、零新增色值** |
| `docs/src/components/ui/badge.js` | `brand` / `gold` **去内联字色**（`warning` 保留：其 4.42 仍需加深）＋ 头注改写 |

### 三、同批收基线（**不是放宽**）

- `server/test/style-baseline.mjs`：**删** `ui/badge.js` 条目（该文件 hex 由 5 → **0**）· `HEX_FILE_BASELINE` 76 → **75**。
- `server/test/hex-hardcode-guard.test.mjs`：防呆下限随实况 76 → **75**（附理由注）。
- ⚠ **首跑抓到自伤（如实登记）**：头注里写了 hex 字面量 ⇒ `H2 处数 ratchet` 5 → 7 **红** ⇒ 改写为**不含 hex** 的表述后复绿（hex 实测 **0**）。

### 四、守卫实跑

- `test:fast` **140 / 140**（含 `hex-hardcode-guard` H1–H5）· `doc-consistency`（含 ⑤/⑥/⑥-2）＋ `link-integrity` ＋ `timestamps-note-guard` —— **28 / 28 / 0 红**。

### 五、如实登记

- ⚠ **变体判据 `activityTypeBadgeVariant` 未改**（本批只修**渲染层色值**）；若支书认为「三会一课」不该用 `brand` 之名，属**另裁**。
- ⚠ **未动** `header.js:144` 那处自加 `text-amber-800` 的**金徽章**（其语义＝党徽金，与本次红/金分色不冲突）；如需一并对齐，另批。
- ⚠ 全站 `?v=` 戳 `20261002a → b`（JS 217 / HTML 22 / CSS 2 / server-test 88；陈旧戳 **0 残留**）。

### 六、收尾全量（`R-85`）

- **`npm test`：910 项 / 910 过 / 0 红 / 0 跳过** · **耗时 1,413,657 ms（≈23.6 分钟）**。
- ⚠ **如实登记**：末条进程退出码 `1`，**非测试失败**（已打印 `pass 910 / fail 0`；系 Playwright `debug.log` 写入被沙箱拦截）。

## 批次 338（2026-10-02）：`SOP-G-1` **授权口径收口**（支书取甲：放宽至「该场组织者本人 ＋ 组长」）

> **决议（`R-84`）**：本批**因裁而作**——支书 2026-10-02「**按这个方案推进 V-3 页签建议序和 SOP-G-1 授权口径**」⇒ **裁定进决策日志**（`D-741`），**实现与实测进本节**。

### 一、病灶（登记于 `.ctx/REVIEW_QUEUE.md` `### SOP-G-1`，2026-09-23 批次 157 新立）

- `server/system-notice-kinds.js::project-auth-granted.authorize` 旧判据＝「**支委层**（`COMMITTEE_ROLE_SET`）＋ **来源对象存在**」⇒ **组长 / 该场组织者本人在前端能看见「确认赋权」并提交，服务端 403 静默丢弃**（同一动作两端口径不一致）。

### 二、本批实现（甲：与前端对齐，不新增角色）

| 档 | 判据 |
| --- | --- |
| ① | `COMMITTEE_ROLE_SET.has(actor.role)`（原面不变） |
| ② | `actor.role === 'leader'`（**党小组组长**；role key 实读自 `constants.js:187` `ROLE_KEYS`） |
| ③ | 该场**现任组织者本人**：活动＝`activity.assignments[]` / 专班＝`taskforce.members[]` 内 `role === 'organizer'` 行的 `personId === actor.id`（**形状与判据同** `organizer-transfer.js::organizerOf`） |

- ⚠ **开工前先实读、未猜**：`rowOf()`（`:26-34`）对行的 `data` 列**做 JSON 解包** ⇒ `assignments` / `members` 取出来即**数组**，`.some()` 安全。

### 三、正面证据（**新定向件**）

- `server/test/system-notice-project-auth-authorize.test.mjs`（**A1–A8 · 8 / 8 绿**）：A1 支委层五角色放行 · A2 组长放行（活动 / 专班双侧）· A3 / A4 **该场组织者本人**放行（活动 `assignments` / 专班 `members`）· **A5 无关成员仍拒** · **A6 `deep` 行不放行** · A7 对象不存在一律拒 · A8 无 actor 一律拒。
- ⇒ 既证「对齐了」，也证「**没有放宽到人人可发**」（A5 / A6 为反向证据）。

### 四、守卫实跑

- 新定向件 **8 / 8** · `test:fast` **140 / 140**；收尾全量见第六节。

### 五、如实登记

- ⚠ **只改服务端判据**；前端放行面**未动**（本就允许）⇒ 不改界面、**未 bump `?v=`**（无前端资产变化）。
- ⚠ **队列改法**：`SOP-G-1` 状态行**原位改准**（`待支书定` → `已裁 … 已落`），**不删行**——保 `doc-consistency` ⑫「`与在册计数的关系` ≥5 处」的基线；`SOP-G-*` 仍不计入 `SOP-B-*` 在册计数。

### 六、收尾全量（`R-85`）

- **`npm test`：918 项 / 918 过 / 0 红 / 0 跳过** · **耗时 1409825 ms（≈23.5 分钟）**。
- ⚠ **如实登记**：末条进程退出码 `1`，**非测试失败**（已打印 `pass 918 / fail 0`；系 Playwright `debug.log` 写入被沙箱拦截）。
- ⚠ **首跑抓到一处自伤（如实登记）**：新定向件用例号用 `A1..` 仍被 `doc-consistency::S16`（「S 类测试文件必须全数列入 `test:daily`」）判为**守卫孤儿** ⇒ 按守卫指示把该件**入档 `server/package.json` 的 `test:daily`** 后复绿（`doc-consistency` **16 / 16**）。

## 批次 340（2026-10-02）：`#1` 待办「作废」**实现**（落 `D-742` 六件规格 ＋ 支书两处追加裁定）＋ 裁决**站内知会**

> **决议（`R-84`）**：本批**因裁而作**——支书 2026-10-02 三条答复（`D-742`）＋ 就实现分叉的两处**追加裁定** ⇒ **裁定进决策日志**（`D-743`），**实现与实测进本节**。

### 一、支书两处追加裁定（本批开工前以 AskUserQuestion 问定）

| 命题 | 裁定 |
| --- | --- |
| 「待支委会确认」派生待办落**哪个台** | **支书台单点**；并补一句「其实要有一个**站内信**的功能——支书如果不认为这个待办能取消，或者说即使取消也要让**某个委员知情**，让他知道管理上可以优化」 |
| 作废后**回看**入口 | **暂不做** |

### 二、本批实现（`D-742` 规格 #1–#6 逐条）

| # | 文件 | 关键动作 |
| --- | --- | --- |
| 1 | `docs/src/services/governance/todo.js` | `requestVoid`（原因必填 → `voidPending`）· `confirmVoid`（→ `voided` 并清 `voidPending`，同样原因必填）· `rejectVoid`（清 `voidPending` 留 `voidRejected`）；`getByRole` 增 `includeVoided`（**缺省过滤 `voided`**）；新增读口 `getVoidPending()`；`_aggregateByAction` 的聚合组加 `persisted: true` 标记；`REALTIME_GROUP_DOMAIN` 增 `'todo-void-confirm' → WORK_DOMAIN.REPORT` |
| 2 | `docs/src/entries/tabs/secretary/todo-tab.js` | 新增 `_voidConfirmAgg()` 实时组（`groupKey='secretary:todo-void-confirm'`）＋ `renderVoidConfirmDetail` 逐条「确认作废 / 驳回」＋ `_onVoidDecide` / `_askVoidReject` / `_notifyVoidDecision` |
| 3 | `docs/src/components/record/todo-tab-shell.js` | 壳体据 `BRANCH_COMMISSION_ROLES` 算 `isCommittee`：**缺省硬删只在支委层**（非支委层 `deleteHandler=null`）；缺省「作废」＝支委层 `confirmVoid` / 其余 `requestVoid`；`_openVoidModal` 原因弹窗（原因必填） |
| 4 | `docs/src/components/record/todo-list.js` | 「作废」键 ＋ `voidPending` 行挂「**待支委会确认**」胶囊；**硬删/作废键并加 `g.persisted` 条件**（实时组不再渲染——修正「点了空转」的旧观感） |
| 5 | `server/system-notice-kinds.js` ＋ `docs/src/core/domain/system-notice-templates.js` | 新 kind `'todo-void-decided'`（授权＝支委层 ＋ 待办行存在；**受众＝该待办原属角色、按 `todos` 行复算**；**非行动性**纯知会） |
| 6 | `server/test/todo-void-flow.test.mjs`（新） | **V1–V5**（见第三节） |

### 三、正面证据（新定向件 `todo-void-flow.test.mjs` · V1–V5 · 5 / 5 绿）

- **V1** 无原因不得作废：`requestVoid({reason:'   '})` 返 `null`、不落 `voidPending`；未申请且无 `note` 的 `confirmVoid` 亦拒 ⇒「**作废 ≠ 完成**」（须有原因）。
- **V2** 申请（审批门第一段）：落 `voidPending`、`voided` 仍假、**列表照常可见**、进 `getVoidPending()`；域折组仍出该组且 `persisted===true`、组内条目带 `voidPending`。
- **V3** 确认：落 `voided`（`reason` 沿用申请原因、`confirmedBy` 记人）、清 `voidPending`、**默认列表出列**、`includeVoided:true` 可回看。
- **V4** 驳回：清 `voidPending`（`voided` 仍假）＋ 留 `voidRejected`（`note` / 原 `reason`）、**回到列表**。
- **V5** 防回潮（源码级）：壳体 `const isCommittee = BRANCH_COMMISSION_ROLES.includes(role)` ＋ 缺省硬删被 `else if (isCommittee)` 守住；列表 `canDelete = g.persisted && …` / `canVoid = g.persisted && …`。

### 四、守卫实跑

- 新定向件 **5 / 5**；`doc-consistency`（含 ⑤/⑥/⑥-2）＋ `link-integrity` ＋ `timestamps-note-guard` ＋ `frontmatter-freshness` ＋ `doc-line-ref` ＋ `import-path-guard` **39 / 39 / 0 红**；`version-stamp` ＋ `hex-hardcode-guard` ＋ `validation-site-coverage` **40 / 40**；`form-loop-sweep` **S0–S7 · 9 / 9**（含 `S6` 行号改准）。

### 五、首跑抓到的三处自伤（如实登记）

1. `hex-hardcode-guard`（H1 ＋ H2）：两处新弹窗原写 `accentColor: '#6B7280'`（壳体新值 ＋ 支书台处数 1 → 2）⇒ 改 `var(--functional-error)`（**用现成令牌、不新增硬编码值**）后复绿。
2. `validation-site-coverage::V1`：两处「原因必填」校验点未登记 ⇒ 同批登记进 `form-loop-registry.mjs`（**均 `machine:false` ＋ 写明理由**：演示种子无「待支委会确认的作废申请」过渡态 ⇒ 弹窗真机不可达；状态机由 V1–V5 在服务层覆盖），`SITES_BASELINE` **109 → 111**，同步 `README.md` 台账数。
3. `form-loop-sweep::S6`：`secretary/todo-tab.js` 中段插行（+65）致既有登记 `691` 漂移 ⇒ 改准为 `756`。

### 六、如实登记（口径与边界）

- **域归属自裁**：`todo-void-confirm` 归「汇报反馈」域（`D-743` 已登记，**非支书圈定**）。
- **知会不采信 `voided` 作判据**：前端快照写穿是**防抖**的（`data-adapter::_scheduleSnapshot`）⇒ 裁决后立刻发通知时服务端未必已收到 `voided`；故授权只取「**支委层 ＋ 待办行存在**」，标题/受众仍**按行复算**（若以 `voided` 为判据会**误 403**）。
- **支书台不开硬删**：该台既有 `onDeleteTodo: null` 未动（「硬删只留支委」读作「只有支委层可以留」，不要求每个支委台都开）。
- **未做**：「已作废」回看入口（支书裁「暂不做」）；`#4`「站内信」作为**独立形式**的设计仍待另批。
- 戳 `?v=20261002b → 20261002g`（JS 217 / HTML 22 / CSS 2 / server-test 89；陈旧戳 0 残留）。
- ⚠ **本批最重的一处自伤（如实登记 · 供后人）**：首跑 `npm test` 时 **真机（Playwright）全域挂起**——工作台骨架「加载中…」永不消解、无 `pageerror`、无 4xx；单跑一条**未受本批改动影响**的旧 e2e（`visitor/今天`）由 **4.3 s 退化到 619 s** 再超时。**根因＝版本戳「混戳」**：`docs/` 下 **82 个文件停在 `?v=20261002b`**、另 159 个已到 `c` ⇒ 同一模块按两个 URL 被加载成**两个实例**（`auth.js` / `tab-bar.js` / `ws-*-entry.js` / `login.html` 等），会话与注册表读空 ⇒ 页面挂死。**混戳的来历**：本批中途做「回退-验证」实验时用了 `git stash push/pop`，其中一次 `pop` 被中断（工具报 `exit -1`），**部分文件退回 HEAD（`b`）而其余保持工作树（`c`）**。**处置**：重跑 `bump-version.mjs` → **全站统一到 `20261002d`**（`git grep -l 'v=20261002b' -- docs` ＝ **0**），复测探针 `.lf-bar` **914 ms** 出现（改前 40 s 超时）。**其后本批为「定位是否本批代码所致」又做了两次「暂退-验证-还原」**（5 个前端文件先全退、再只退壳体），每轮都**重新 bump 成全站同戳**；最终确认**本批代码无责**（当前最终戳 `20261002g`，六个工作台真机复测 **12 / 10 / 12 / … 个 tab 全渲染**）。
  **教训（建议）：① `bump-version.mjs` 的「陈旧戳自检 0 处残留」只在**它自己那一跑**成立——**任何其后对工作树的回退/还原（`stash` / `checkout` / 编辑器撤销）都必须重跑该自检**；② 判「页面挂起 / tab 渲染不出来」时，**先核版本戳是否单一源**，再怀疑业务代码（本次险些把环境事故误记成功能回归，浪费了数轮排查）。

### 七、收尾全量（`R-85`）

- **`node --test --test-concurrency=1`（全量）：923 项 / 923 过 / 0 红 / 0 取消** · **耗时 1424572 ms（≈23.7 分钟）** · **`EXITCODE=0`**（先在 3000 端口起 `node server.js`；跑完停服）。
- 中间两跑如实登记：① 未起 3000 服务 ⇒ **8 红**、**全部是 `ECONNREFUSED localhost:3000`**（`b3-1-makeup-writeback` / `click-cost` C1–C5 / `mock-integrity` M1–M2）＝**环境类**；② 起服务后单跑该三件 **8 / 8 绿**，最终全量 **923 / 923**。
- ⚠ 末条进程另报一次 `TRAE Sandbox Error`（Playwright `chrome-headless-shell .../debug.log` 写入被沙箱拦截）——**非测试失败**（摘要已打印 `pass 923 / fail 0`、`EXITCODE=0`）。

## 批次 341（2026-10-02）：支书评议批 `#2` —— **全域 CRUD 探查**（30 张资源表 × C/R/U/D × 界面入口 × 权限门）

> **决议（`R-84`）**：本批**因裁而作**——支书 `#2`「全栈开发一定要关心 CRUD 的问题！一定要做一次 **全域的探查**！」⇒ 本批**只做探查与取证**（零代码），结论进本节；**待支书圈定**的修复项进 `.ctx/REVIEW_QUEUE.md`。

### 一、服务端口径（**已确认为全**，非本批缺口）

- `server/routes/resources/store.js:7-44` 的 `RESOURCE_TABLES` 实为 **30 个键**（⚠ 更正：此前 `.ctx/SNAPSHOT.md` 口径称「32 张」，本批以代码实然为准）。
- `server/routes/resources/index.js:40-162` 为**每张表统一注册** `GET /:name`（列表）/ `POST /:name`（创建，缺 id 服务端补）/ `PATCH /:name/:id`（局部合并）/ `DELETE /:name/:id`（删除）；外加 `POST /api/v1/snapshot` 全量快照写穿（逐集合乐观锁）。
- **权限门两层**：读口 `PUBLIC_READ`（现仅 `issues`，其余 `requireAuth`）· 写口 `COMMISSIONER_WRITE`（`branchDocs` / `fileSpaceRecords` / `imageRecords` 需支委层，其余 `requireAuth`）＋ 逐表 `RESOURCE_WRITE_GATE` ＋ 活动专有门（`_assertActivityWrite` / 批准门 / 计票方式 / 停用块）。
- **结论：服务端 CRUD 完整**；「CRUD 闭环」的缺口**全在前端界面入口**。

### 二、界面入口矩阵（`C` 创建 / `R` 读 / `U` 改 / `D` 删·作废·归档·停用；「—」＝无入口）

| 实体 | C | R | U | D | 缺口 |
|---|---|---|---|---|---|
| activities | 组长台「写入活动」/ 支书台「写入活动」 | 活动详情页 / 活动管理 / 日历 / 首页活动卡 | 活动管理（议程·状态·品牌）/ 支委会会议页 | 归档 ＋ 彻底删除（含子记录级联） | 无 |
| tasks | 随活动写入派生 | 活动详情「任务清单」/ 日历 | 任务状态 | — | **D 缺** |
| attendances | 组长台上传 / 纪检台会议录入 | 纪检台 / 组长台 / 成员台 | 确认·打回·补录 | **无任何清理入口**（只有打回） | **D 缺** |
| inspections | 纪检代录 / 组长上传 / 组织台补录 | 纪检台 / 组织台 / 组长台 | 确认·打回 | 删除（**仅 `pending` 可删**） | 无（限 pending） |
| taskforces | 组织台「发布招募」 | 专班页 / 组织台 / 项目看板 | 启动·进度·报送·解散 | 撤销并删除（软删留痕）/ 归档 | 无 |
| notices | 支书台通知发布 / 各台发布口 | 通知页 / 通知 tab / 顶栏铃铛 | 编辑浮窗 | 删除键 / 随源归档 | 无 |
| todos | **无手动建表单**（全派生） | 各台待办 tab | 完成·进行·激活 | **作废（审批门）＋ 支委层硬删**（批次 340） | 无 |
| assignments（独立表） | — | — | — | — | **整表无界面入口（死表）** |
| makeupTasks | 自动派生 | 纪检「补课」/ 成员台「去补课」 | 完成·回执 | **无任何清理入口** | **D 缺** |
| users | 组织台「新增成员」 | 成员名册 / 个人总表 | 编辑浮窗（api 走 `/members/*`） | **软移除**（改名册＋停用账号，可撤销） | 无硬删（软移除可接受） |
| experienceDeposits | 纪检台「记录经验沉淀」 | 仅作交叉引用（**无沉淀清单页**） | — | **无任何清理入口** | **D 缺（R 亦弱）** |
| complianceReferences | — | — | — | — | **整表无界面入口（死表）** |
| fileSpaceRecords | 宣传台「上传材料」 | 间接（无独立列表页） | — | 删除（联动删物理文件） | **U 缺** |
| imageRecords | 宣传台照片墙上传 | 照片墙 | 标注（PATCH） | **无删除入口** | **D 缺** |
| signups | 报名面板 / 组织台代报 | 报名面板 / 活动页 / 专班页 | 取消 / 审核 | 仅「取消报名」（改 status） | D 缺（有软取消） |
| activityReviews | 成员台「我的复盘」提交 | 纪检「复盘」/ 成员台 / 支书台 | 批注·打回·确认 | **无删除入口** | **D 缺** |
| taskforceReviews | 组织台「复盘」 | 纪检台（合并展示） | 同上 | **无删除入口** | **D 缺** |
| propTasks | **无新建入口**（仅种子兜底） | 宣传台「宣传任务」看板 | 状态推进 | **无删除入口** | **C、D 缺** |
| weeklyReports | 宣传台新增周次 | 宣传台报送历史 | 报送·内容·支书审核 | **无删除入口** | **D 缺** |
| archiveRecords | 宣传台「上传材料」 | 归档库 / 活动管理 | 状态推进 · 支书复核 | 删除 | 无 |
| externalDispatches | 宣传台「材料外发」 | 工作总览 / 各台「我的处置」 | 确认接收 | **无删除入口** | **D 缺** |
| actSubRecords | 组长台「写入活动」子记录 | 活动管理「子记录」 | 同上（宣传初稿状态） | 子记录表内联删除键 | 无 |
| tfSubRecords | 组织台专班「材料记录」 | 专班详情「子记录」 | 同上 | 内联删除键（考察只读） | 无 |
| branchDocs | 资料查询「新建文件」 | 资料查询页 | 上传新版 / 停用·启用 | 删除（制度文本只停用不删） | 无 |
| branches | 党委台「新建支部」/ 换组织向导 | 支部管理 / 监控台账 / 支部配置 | 改名 · 配置 · 组织档案 | **无删除 / 无停用·解散入口**（`ApiAdapter.branches.delete` 有接口无 UI） | **D 缺** |
| appointmentRecords | 党委台「任命支书」 | 支部管理「任期档案」 | 撤换封口（写 `to`） | **无删除入口**（历史档案，合理） | D 缺（合理） |
| reviewRequests | 支书台「上报党委」 | 党委台「上报审批」 | 批准 / 驳回 | **无删除入口** | **D 缺** |
| thoughtReports | 成员台「思想汇报」/ 独立页 | 组织台「思想汇报」/ 人才库 | 审阅 · 打回重提 | **无删除入口**（提交即归档） | **D 缺** |
| partyGroups | 支书台「新增党小组」 | 支书台「党小组与活动」/ 成员名册 | 改名 · 指派组员 | 解散（软：留痕） | 无 |
| memberFlows | 组织台「成员流动」登记（入/出/批量） | 组织台「成员流动」台账 | 对账 | 撤销（软：留痕） | 无 |

### 三、三个特别问题（支书 `#1`/`#2` 的直接答复）

1. **「有表、有服务端 CRUD、前端完全无入口」＝死表 2 张**：`complianceReferences`（合规引用）、`assignments`（**独立**分工表——⚠ 与界面里的 `activity.assignments` / `taskforce.members` **内联数组不是同一数据**）。
2. **「界面能创建、但界面上永远删不掉」**：
   - **完全无清理入口（12 张）**：`attendances` · `makeupTasks` · `experienceDeposits` · `imageRecords` · `activityReviews` · `taskforceReviews` · `weeklyReports` · `externalDispatches` · `tasks` · `branches` · `reviewRequests` · `thoughtReports`。
   - **仅软处理（2 张）**：`signups`（只能取消报名）· `propTasks`（有状态推进无删除）。
   - **对照（已有真删除/归档/软删）**：activities · inspections(限 pending) · taskforces · notices · todos · archiveRecords · fileSpaceRecords · branchDocs · actSubRecords · tfSubRecords · partyGroups · memberFlows · users(软移出)。
3. **绕过统一写口的直写点（典型 3 例，共约 10 余处，多数紧跟 `persist()` 属规范）**：
   - `entries/tabs/org/taskforce-tab.js:304-305`：直接改 `SignupStore._signups` 私有字段（绕过其 `bumpToken` 写口）。
   - `entries/tabs/prop/archive-tab.js:1356-1364 / :1447-1454`（照片）：api 形态直接 `fetch /api/v1/imageRecords` 后**就地改内存、不调 `persist()`**（注释：避免覆盖他人并发写）。
   - `entries/tabs/prop/archive-tab.js:1020-1033 / :615-634`（文件空间元数据）：直接 `fetch /api/v1/fileSpaceRecords` ＋ 就地改内存。

### 四、本批范围与后续

- **本批零代码**（只做探查与落账）⇒ **未改任何文件、未 bump `?v=`、未跑全量**（无代码改动；全量最近一次绿＝批次 340 的 **923 / 923 / 0**）。
- **修复项分三类，全部属产品取向 ⇒ 已进 `.ctx/REVIEW_QUEUE.md` 请支书圈**（判据：删不删是**制度**问题，不是工程问题——如考勤/复盘/思想汇报**故意不可删**以保审计完整性）。

## 批次 342（2026-10-02）：支书四条裁定全取甲 ⇒ 落**第一件：删死表 `compliance_references`**

> **决议（`R-84`）**：裁定进决策日志（`D-744`），实现与实测进本节。

### 一、删表全链（`D-744` 第 1 条前半）

| 层 | 改动 |
| --- | --- |
| 服务端 | `server/db.js`：`RESOURCE_TABLES` 去掉 `compliance_references`（35 → **34**）；**`MIGRATIONS` 新增 `v2 drop-compliance-references`**（`DROP TABLE IF EXISTS`，只删不迁数据）⇒ `SCHEMA_VERSION` 1 → **2**（启动日志实见 `[db] schema v2（本次应用 2 项）`） |
| 服务端 | `server/routes/resources/store.js`：资源名映射去一项（30 → **29**）、`ID_PREFIX` 撤 `cr` |
| 前端数据层 | `mock-adapter.js`（`_saveToStorage` / `loadDB` ×2 / 适配器接口）· `api-adapter.js`（接口 + 路径表注释）· `data-adapter.js`（init 三处 + 快照 payload，**25 → 24**）· `domain.js`（`mockDB` 域）· `init-reset.js`（重置清单） |
| **有意保留** | `mock-adapter.js::LEGACY_STORAGE_KEYS` 与 `init-reset.js` 的「旧版独立存储键」清单**仍留 `compliance_references`**——它们是**历史 localStorage 键的清理名单**，与实体是否存在无关 |

### 二、守卫与文档同批改准（首跑抓到 8 处红，逐条处置）

| 守卫 | 红因 | 处置 |
| --- | --- | --- |
| `db-migration::M6` | v1 基线规模下限 45（实得 44） | 下限 45 → **44**（＋文件头注改准） |
| `db-integrity-guard::G4` | `AD_HOC`（db.js 自建表）与冻结基线 `LEGACY_TABLES` 逐项相等 ⇒ 差 1 | 基线删该行（45 → 44）＋**注释写明「删表是『不改基线』的唯一例外」三条动作** |
| `doc-consistency::S5` 数据五数 | 34 / 33 / 29 / 24 | `DATA_CONSISTENCY_CHECKLIST.md` 五数同批改准（含「四数之差有据」算式） |
| `doc-consistency::S14` | 资源名 30→29、循环展开 119→115、合计 181→177 | `README-server.md §6 数量口径` 改准 |
| `doc-line-ref::R1` | README 指向 `domain.js` / `data-adapter.js` 的引用随删行漂移 | **12 处行号改准**（`domain.js:264/277/284/340-410` · `data-adapter.js:52-53,440-450,512-513,542-543,998/999,1001/1002,1039,1136,1193,1204,1018,1062` · `store.js:24,27,28-29,44-46,53,54,55` · `db.js:235`） |
| `doc-line-ref::R2` | 两处锚点漂移（`SCHEMA_VERSION` / `listTable`） | 同上同批改准 |
| `reset-tier-init` | 测试夹具含该域 | 删夹具行 |
| `doc-consistency::S6/S13`·`link-integrity`·`catalog-sync`·`mock-api-parity` 等 | — | 复跑绿 |

- **文档**：`README-server.md`（§4.12 改**删除登记**（**保编号**、不重排 §4.13+）· §4 全表清单 35/30 → 34/29 · §6.2 资源表 30 → 29（**并保留原第 12 项一行删除说明**）· §7.3#1/#3/#9/#25 计数）· `.ctx/SNAPSHOT.md`（资源表 35 → 34；空表清单 30 → 29）· `content/04_web_design/data/DATA_MODEL.md`（**原位改注、保行数**——该文件被 README 引用 45 处行号，删行会位移）· `content/04_web_design/deploy/DEPLOYMENT_GUIDE.md`。

### 三、收尾全量（`R-85`）

- **`node --test --test-concurrency=1`（全量）：923 项 / 923 过 / 0 红 / 0 取消** · **耗时 1344132 ms（≈22.4 分钟）** · **`EXITCODE=0`**（先在 3000 端口起 `node server.js`；跑完停服）。
- ⚠ **如实登记**：中途一次未起服务的重跑有 **8 处 `ECONNREFUSED localhost:3000`**（`b3-1-makeup-writeback` / `click-cost` C1–C5 / `mock-integrity` M1–M2 / `empty-template` B1）＝**环境类**；起服务后逐件单跑均绿。
- 戳 `?v=20261002g → 20261002h`。
- **余项**（`D-744` 第 1 条后半 ＋ 第 2–4 条）待分批：`assignments` 补界面入口 · B 档两类 · `branches` 补「停用（软）」 · D 档写口纪律统一。

## 批次 343（2026-10-02）：`#2` `D-744` 第 4 条 —— **写口纪律统一**（D 档，支书裁「甲 排批直接修」）

> **决议（`R-84`）**：裁定进决策日志（`D-745`），实现与实测进本节。

### 一、四处真偏离的收回（逐处取证 → 逐处改）

| # | 位置（改前） | 病 | 改后 |
| --- | --- | --- | --- |
| 1 | `entries/tabs/org/taskforce-tab.js:303-307` | 伸手改 `SignupStore._signups` 私有字段 ＋ 手写 `mockDB.signups = […]` ＋ `persist()` ⇒ **绕过了 `SignupStore` 的写口 `_saveSignups()`，其中的 `bumpToken('signup')` 没跑**（报名域缓存不失效） | 新增 `services/activity/signup.js::SignupStore.deleteBySource(sourceType, sourceId)`（内部 `_saveSignups` ＋ 返回删除条数）⇒ 调用点一行 |
| 2 | `entries/tabs/prop/archive-tab.js`（照片上传） | 直连 `fetch POST /api/v1/imageRecords` ＋ 就地改内存（不 `persist()`） | `getAdapter().imageRecords.create(row)` |
| 3 | 同上（照片标注 `_savePhotoAnnotation`） | api 直连 `fetch PATCH`；mock 就内存 ＋ `persist()` ⇒ **两形态两套写法** | 统一 `getAdapter().imageRecords.update(id, patch)`（两形态同码） |
| 4 | 同上（文件空间元数据 POST / DELETE） | 直连 `fetch` 两处 ＋ 就地改内存 | `getAdapter().fileSpaceRecords.create(...)` / `.delete(id)` |

- **使能改动**：`imageRecords` / `fileSpaceRecords` 在**两个适配器**里补齐**四件套**（`api-adapter.js` 加 `update`/`delete` 走 `_patch`/`_delete`；`mock-adapter.js` 加 `update`/`delete` 走「就内存 ＋ `_saveToStorage`」，体例照 `branchDocs`）。**语义未变**：api 形态仍是**逐条端点**（不触发整表快照写穿、不覆盖他人并发写）；mock 形态仍是本机持久化。

### 二、新守卫 `server/test/write-path-guard.test.mjs`（W1–W4）

- **W1** 通用资源端点不得被 `docs/src/**`（排除 `data/**`）直连 `fetch`；**W2** `services/**` 之外不得 `XxxStore._私有字段 =`；**W3** 语义端点白名单**不得命中资源名、不得被掏空**；**W4** **会话引导期例外清单 ≤2 文件且只能只读**。
- **首跑抓出 1 条真红**：`entries/pages/login-entry.js:191` 直连 `GET /api/v1/branches`。**处置＝判为「会话引导期例外」**（该页刻意不引数据层：会话建立前运行、直读 `sessionStorage` token、自建 `Authorization` 头），并**由 W4 把例外锁死为「≤2 文件 ＋ 只读」**——不是整类放行。
- **反例自检（不留盘）**：① W1 把 `login-entry` 从例外清单移除 ⇒ 判红并指名该行；② W3 把白名单加一条 `/\/api\/v1\/branches\b/` ⇒ 判红「命中了通用资源端点」（证明 W3 真能拦住「顺手放行资源」）。
- 入档：`server/package.json` 的 **`test:daily`（`S16`）＋ `test:fast`** 各加 1 条（与同族守卫 `dead-selector-guard` 并列）。

### 三、收尾全量（`R-85`）

- **全量首跑（发现 2 红）**：`925 / 927 / 2 红`（详见下节「四」；两红**均非本批设计缺陷**，是**行号/日期台账未随改动同批改准**）。
- **全量复跑（本批最终读数）**：**`ℹ tests 927` / `pass 927` / `fail 0`** / cancelled 0 / skipped 0 / todo 0，`duration_ms 1337635.078`（**≈22.3 分钟**），**`EXITCODE=1`**。
- ⚠ **如实登记**：末条进程退出码 `1`，**非测试失败**（测试汇总已打印 `pass 927 / fail 0`）；系 Playwright 收尾时其自身 `debug.log` 写入被沙箱拦截（**与测试内容无关**，同批次 331 / 334 的如实登记）。
- 守卫子集中间态：`doc-consistency`（含 `S16`）＋ `write-path-guard` ＋ `version-stamp` ＋ `catalog-sync` ＋ `mock-api-parity` ＋ `id-uniqueness` ＋ `taskforce-lifecycle` ＋ `scene-write-sync` ＋ `import-path-guard` **73 / 73 / 0 红**。
- 戳 `?v=20261002h → 20261002i`。

### 四、全量首跑抓出的两处连带（**同批改准**）

> **口径**：这两处**不是本批引入的设计缺陷**，而是「**动了会连带改准的台账**」——正是本仓既有纪律（`doc-line-ref` / `S6` / `F2`）在**全量**里起了作用。**不推给续批，同批改准**。

| # | 红项 | 病灶 | 改准 | 复跑证据 |
| --- | --- | --- | --- | --- |
| 1 | `form-loop-sweep::S6`（台账行号未同步） | 本批改 `org/taskforce-tab.js`（`.taskforce` 私有字段手术改走 `SignupStore.deleteBySource()`）与 `prop/archive-tab.js`（四处直连 fetch 收回 `getAdapter()`）⇒ **两文件行数位移**，而 `server/test/form-loop-registry.mjs::VALIDATION_SITES` 的 `line` 未同批改准（13 条：taskforce 10 条 ＋ archive 3 条） | 13 条 `line` 按实况改准 ＋ **顺带改准同址** `SUCCESS_FLOWS` 里 `退回原因` 的 `line`（`652 → 655`，该字段不被守卫消费、纯台账诚实性）＋ 加两行批次沿革注 | 单跑（`FORM_LOOP_TABS=专班管理` 降频）：**S6 复绿**，`16 / 16 / 0`；ORG 专班 6 条闭环 ＋ 2 条成功路径**真机全过** |
| 2 | `frontmatter-freshness::F2`（改了没刷卡） | **批次 342 的存量债**：`DATA_MODEL.md` / `DEPLOYMENT_GUIDE.md` / `DATA_CONSISTENCY_CHECKLIST.md` 三份 `content/**` 被批 342 改过并提交，但**提交时未刷 frontmatter**——F2 在**提交后**才暴露（提交前工作树 dirty ⇒ 判据不成立） | 三份 frontmatter `last_updated` → **2026-10-03**（＝各自 `git log -1 --date=short` 实读）＋ `.ctx/TIMESTAMPS.md` **三行同值同步**（过 `S13`） | 单跑 `doc-consistency` ＋ `frontmatter-freshness` ＋ `timestamps-note-guard`：**26 / 26 / 0 红** |

- **教训（入执行日志，供续批）**：**「提交」是 F2 的触发点**——某批改 `content/**` 后若**只跑全量、随后才提交**，则 F2 在**那一批**是绿的、在**下一批**才红。故凡改 `content/**` 者，**提交前**必须刷 frontmatter ＋ TIMESTAMPS（`R-83`）；**追加本批已按此改准**。
- ⚠ **如实登记（全量之后的台账微调）**：全量复跑**之后**又改了**纯 `.ctx/**` 台账**（`.ctx/REVIEW_QUEUE.md` 按 `D-744` 收口「全域 CRUD 缺口」节 ＋ `.ctx/TIMESTAMPS.md` 的 `REVIEW_QUEUE.md` 行日期同步）——**不涉 `docs/src/**` 与 `server/**` 逻辑**，故另跑受影响文档守卫 `doc-consistency` ＋ `frontmatter-freshness` ＋ `timestamps-note-guard` ＋ `link-integrity` ＋ `doc-line-ref` **37 / 37 / 0 红**复绿（全量读数 **927 / 927 / 0** 仍成立）。
- **余项**（`D-744` 第 1 条后半 ＋ 第 2–3 条）：`assignments` 补界面入口（批 345）· B 档两类 ＋ `branches` 补「停用（软）」（批 344）。

## 批次 344（2026-10-02）：`CRUD-5` —— **`branches` 补「停用（软）」入口**（支书 `D-744`③）

> **决议（`R-84`）**：本批**因裁而作**——支书 2026-10-02 就 `D-744`③ 裁「**甲：补「停用（软）」入口**（党委台；**留任期档、不物理删**）」。本批**无新裁定**（只是执行既有裁定）⇒ 按 `R-84` **不另立 `D-` 条**；**实现与实测进本节**。

### 一、本批做了什么

- **服务层新写口**：`docs/src/services/branch/branch.js::setBranchActive(id, active)`——**只改顶层 `status`**（`active` ↔ `inactive`）；与 `renameBranch` **同一写口形态**（`getAdapter().branches.update` → 本地 `mockDB` 同步 → `persist()`）。**不物理删**：支部实例仍可被读（监控台账 / 进去只读），`appointment_records`（任期档案）与成员档案**全部保留**。
- **党委台 UI**（`docs/src/entries/tabs/party-committee/branches-tab.js`）：① 卡片状态徽章由**硬编码「运行中」**改为 **status 感知**（`运行中` / `已停用`）；② 动作行新增 **「停用」/「恢复」** 键（`data-next` 决定方向）；③ 新增 `_toggleBranchStatus()`——**停用前二次确认**（软动作、可逆，与「任命」同族用内置 `window.confirm`；确认文案写明「档案保留、可恢复、不物理删除」），**恢复零打扰**。
- **文档改准**：`README-server.md` §4.25 的 `status` 行由 `'active'` → `'active' | 'inactive'`，注明「软停用＝`inactive`，党委台可停用/恢复，**不物理删**、任期与成员档案保留」（**原位改、行数零增减**）。
- **新增定向件** `server/test/branch-status.test.mjs`（B1–B3，已入 `test:daily`）：**B1** 停用后 `status=inactive`、**支部数量不变**、**任期档案序列化前后逐字相同**、`name`/`secretaryId`/`createdAt`/`config` 一字不改；**B2** 恢复回 `active`；**B3**（反例·非恒真）停用后 `getBranchById` **仍取得到**该支部（证「软停用不是删除」）。
- **台账同批改准**：`server/test/form-loop-registry.mjs` 里 `branches-tab.js` 的 3 条校验点行号随本批行数位移（+3）改准（`142` / `160` / `171`）。

### 二、如实登记

- ⚠ 本批**只落 `CRUD-5`**。`D-744`② 的 **B 档两类尚未落**——**审计类 5 张「保持不可删＋界面补说明」**与**业务过程类 6 张「作废·停用」软入口**（`makeupTasks`/`imageRecords`/`weeklyReports`/`externalDispatches`/`experienceDeposits`/`tasks`）**顺延下一批**（两者共享「留痕 vs 可作废」同一口径，合并落更一致）。
- ⚠ **真机覆盖面如实登记**：本批**未新增** `pc-branch-deactivate` 成功路径流——与既有 `pc-branch-appoint` **同款**（后者的 `window.confirm` **接受分支**亦未被成功路径流覆盖，只覆盖「空提交」校验分支）。**现有覆盖**＝定向件 B1–B3（写口）＋ 全量 `page-sweep`（该 tab 渲染非空、零脚本错误）＋ `pc-branch-rename`/`pc-branch-appoint` 两条真机流（同 tab，证渲染与绑定未坏）。

### 三、收尾全量（`R-85`）

- **`npm test`：930 项 / 930 过 / 0 红 / 0 跳过**（927 → **930**，本批新增 3）· **耗时 1,337,498 ms（≈22.3 分钟）**。
- ⚠ **如实登记**：末条进程退出码 `1`，**非测试失败**（已打印 `pass 930 / fail 0`；系 Playwright 收尾 `debug.log` 写入被沙箱拦截——与测试内容无关，同批次 331/334/343）。
- 守卫子集中间态：`import-path-guard` ＋ `mock-api-parity` ＋ `id-uniqueness` ＋ `branch-status` ＋ `branch-module-catalog` ＋ `branch-doc` ＋ `branch-config-audit` ＋ `doc-consistency` ＋ `doc-line-ref` ＋ `version-stamp` ＋ `text-tier-guard` ＋ `button-system-guard` ＋ `dead-selector-guard` ＋ `catalog-sync` **100 / 100 / 0 红**。
- 戳 `?v=20261002i → 20261003a`（JS 217 / HTML 22 / CSS 2 / server-test 90；陈旧戳 **0 残留**）。
- **余项**：`D-744` 第 1 条后半（`assignments` 补入口 → 批 345）· 第 2 条（B 档两类 → 下批）。

## 批次 345（2026-10-02）：支书评议批 `#10` —— **支书台「项目赋权 · 活动 / 专班」两卡合并＋选择题**

> **决议（`R-84`）**：本批**因裁而作**——支书 2026-10-02 评「这两个我认为首先没有上下关系，现在的排布让我觉得很罗嗦，**我情愿两者合并，加一个选择题，给 活动/专班 赋权**」（`#10`）。本批**无新裁定**（只是执行支书的取向）⇒ 按 `R-84` **不另立 `D-` 条**；**实现与实测进本节**。

### 一、本批做了什么

- **合并为一张卡**（`docs/src/entries/tabs/secretary/assign-tab.js`）：新增 `PROJECT_AUTH_MERGED_HTML`——一张卡承载「项目赋权（组织者 / 深度参与者）」，卡内**顶部一个「活动 / 专班」选择题**（两颗 `btn-accent`/`btn-outline` 互斥按钮），下方按选择只显示对应面板。`mountActivityProjectAuth` 由「两块 HTML 相加」改为「一张合并卡 ＋ 逐个渲染两块 ＋ 绑选择题」。
- **钩子 id 一字未改（关键约束）**：`#project-auth-panel` / `#tf-auth-panel` 及其**块内全部 id**（`#project-id-select` / `#tf-project-select` / `#confirm-project-auth-btn` / `#confirm-tf-auth-btn` / 两个 picker 容器 / 两个已赋权记录列表）**逐字保留** ⇒ 台账（`form-loop-registry`）· 深链（`todo-tab.js::expandAssignPanelForTodo`）· 真机流（`secretary-assign-project-auth`）**取到的东西与合并前逐字相同**。
- **深链同步**：`todo-tab.js::expandAssignPanelForTodo` 在滚动前先 `document.querySelector('.project-auth-kind-btn[data-kind=…]').click()` 切到该块——**不新增跨文件 import**（与该函数既有的 `#ws-sec-assign-btn.click()` 同款做法）；不先切会滚到一个 `hidden` 面板上（如实登记该耦合）。
- **选择题状态自持**：`_projectAuthKind` 模块级（重渲染按它恢复，与 `authPanel.open` 同款）；切块即时改按钮族与面板显隐。
- **组织委员台不动**：`mountTaskforceProjectAuth`（「专班管理」）仍按**单块**渲染（那台即本位、无「活动」侧），`TF_AUTH_HTML` 原样保留。
- **台账同批改准**：`form-loop-registry` 里 `assign-tab.js` 的 6 条校验点行号随本批行数位移（**+39**）改准（`365/366/367` · `582/586` · `772/773`）；`todo-tab.js` 的 2 条登记行在其**之前**（`756`/`806`）⇒ 不受影响（已核）。

### 二、`#10` 的「命名与归属」思考（**待支书圈**，未擅自改）

- 支书追问（逐字）：「**既然叫 党小组与活动 为什么 专班在这里？** 党小组与活动与 **活动管理** 的关系是什么？**这值得思考，并在各个工作台思考改进！！**」
- **实读现状**：支书台「**党小组与活动**」（`group-progress-tab.js`）现含三件——① 党小组清单＋组长指派（组层）· ② 党小组活动分区 · ③ **项目赋权**（情景② 活动 ＋ 情景③ 专班，本批已合并成一张卡）；「**活动管理**」（`calendar-tab.js`）＝活动的建 / 改 / 查（活动台账与本位写入）。
- **冲突点**：**专班与「党小组」无组织关系**（专班是跨组的临时编制）⇒ 情景③ 挂在「党小组与活动」名不符实；而「项目赋权」是**活动与专班的公共动作**，与「活动管理」又确有上下关系。
- **三档处置已登记** `.ctx/REVIEW_QUEUE.md`「`#10` 命名与归属 · 待支书圈」节（**甲** 项目赋权整块迁「活动管理」· **乙** 只把「党小组与活动」改名 · **丙** 情景③ 支书台只留深链）。**本批只出选项与影响面，不动 IA**（改落点会牵动 tab 名 / `help.html` / 台账 tab 字段 / 多条真机流）。

### 三、收尾全量（`R-85`）

- **`npm test`：930 项 / 930 过 / 0 红 / 0 跳过**（与本批前同数：**无新增用例**，改动由既有真机流 ＋ 守卫覆盖）· **耗时 1,334,713 ms（≈22.2 分钟）**。
- ⚠ **如实登记**：末条进程退出码 `1`，**非测试失败**（已打印 `pass 930 / fail 0`；系 Playwright 收尾 `debug.log` 写入被沙箱拦截——与测试内容无关，同批次 331/334/343/344）。
- ⚠ **覆盖面如实登记**：本批**未新增**定向件——「选择题切到专班」这一步**无专门真机断言**；现有覆盖＝`secretary-assign-project-auth` 真机流（活动面板默认可见、`#project-id-select`/`#confirm-project-auth-btn` 在位）＋ `page-sweep`（该 tab 渲染非空、零脚本错误）＋ 静态守卫（`dead-selector-guard` 等）。**缺口留待续批补一条 `secretary-assign-kind-switch` 真机流**。
- 守卫子集中间态：`version-stamp` ＋ `doc-consistency` ＋ `doc-line-ref` ＋ `import-path-guard` ＋ `text-tier-guard` ＋ `button-system-guard` ＋ `dead-selector-guard` ＋ `small-text-guard` ＋ `hex-hardcode-guard` ＋ `control-font-guard` ＋ `party-group` ＋ `mock-api-parity` ＋ `id-uniqueness` ＋ `catalog-sync` ＋ `localstorage-key-guard` ＋ `copy-master-guard` ＋ `self-evident-copy-guard` **101 / 101 / 0 红**。
- 戳 `?v=20261003a → 20261003b`（JS 217 / HTML 22 / CSS 2 / server-test 90；陈旧戳 **0 残留**）。
- **余项**：`D-744` 第 1 条后半（`assignments` 补入口）· 第 2 条（B 档两类）· `#10` 命名归属（待支书圈）。

## 批次 346（2026-10-02）：`D-744`② **B 档两类** —— 审计类「保持不可删」口径 ＋ 业务类「作废·停用」软入口（**机制层 ＋ 样板一张**）

> **决议（`R-84`）**：本批**因裁而作**——支书 2026-10-02 就 `D-744`② 裁「**甲：按 AI 分档**」：审计类（考勤 / 复盘 / 思想汇报 / 上报）**保持不可删 ＋ 界面补说明**；业务过程类（补课 / 照片 / 周报 / 外发 / 经验沉淀 / 活动任务）**补「作废·停用」软入口**（走审批门，同 `#1` 口径）。**无新裁定** ⇒ 按 `R-84` **不另立 `D-` 条**。

### 一、`CRUD-3` 审计类「保持不可删 ＋ 界面补一句说明」（5 张 · 4 个落点）

- 四处台账面各补**一句极短**说明（**附在既有副题行、不另起段落**，尽量零位移）：
  - `disc/attendance-tab.js`（考勤矩阵）：`留痕台账 · 不提供删除（更正 / 打回走状态）`
  - `disc/review-tab.js`（活动复盘监督）：副题行尾接 `· 留痕台账不提供删除`
  - `org/thought-review-tab.js`（思想汇报台账）：`留痕台账 · 不提供删除（打回 / 重交走状态）`
  - `party-committee/review-tab.js`（上报审批）：副题行尾接 `· 留痕台账不提供删除`
- **与批次 294 支书裁相权**：支书 2026-09-29 裁「**你的显示、功能已经是最好的说明了。干嘛多此一举？**」⇒ 本批**不写段落级解释**，只留一句说明**政策**（为什么不给删除）——该句**不是**替 UI 复述自明事。

### 二、`CRUD-4` 业务类「作废·停用」软入口 —— **机制层 ＋ `makeupTasks` 样板**

- **新写口** `docs/src/services/governance/soft-void.js`：`SOFT_VOID_RESOURCES` 注册表（store 键 / 显示名 / 责任人角色 / 标题取法）＋ `requestVoid`（**原因必填**；写 `voidPending`、记录**仍不出列**）· `confirmVoid`（支委层可达、可直接作废；落 `voided`{原因 / 申请人 / 时间 / 确认人}、清 `voidPending`）· `rejectVoid`（回原状 ＋ `voidRejected` 留痕）· `filterActive`（读侧出列）· `listVoidPending`（映射成支书台可消费形状，`id` ＝ `"<资源>:<记录id>"`）· `parseRecordVoidId`。写口形态同 `services/branch/branch.js::renameBranch`（`getAdapter()[resource].update` → `mockDB` 同步 → `persist()`）。
- **支书台并入同一裁决面**（`secretary/todo-tab.js`）：`_voidConfirmAgg()` 由「只收待办」改为 **待办 ＋ 业务记录两类并收**；`_onVoidDecide` 按 `parseRecordVoidId` 路由到 `_onRecordVoidDecide`（确认＝`SoftVoid.confirmVoid`；驳回＝`_askRecordVoidReject` 弹窗填意见）。**与 `#1` 待办作废同一组、同一裁决入口。**
- **样板表 `makeupTasks`**（`disc/makeup-tab.js`）：读侧 `SoftVoid.filterActive` 出列；行尾新增「作废」键（**支委层直接作废 / 其余人报支委会**，判据 `BRANCH_COMMISSION_ROLES`）；作废原因必填弹窗；状态格新增「待支委会确认」过渡态。
- **定向件** `server/test/soft-void.test.mjs`（V1 申请（「申请 ≠ 出列」）· V2 原因必填非恒真 · V3 `"<资源>:<id>"` 映射与回解 · V4 确认（原因取申请、出列、行数不变）· V5 驳回（回列表、留痕）），入档 `test:daily`。
- **真机流** `disc-makeup-void-reason`（新）：切「补课」分段 → 点行内「作废」→ 空原因提交 ⇒ 报「请填写作废原因（必填）」且载体在位。**真机实跑通过。**

### 三、首跑抓出的连带（**同批改准**）

| # | 红项 | 病灶 | 改准 |
| --- | --- | --- | --- |
| 1 | `validation-site-coverage::V1` | 新写「作废原因必填」是**新字段级必填校验点**而**未登台账** | 按 `machine:true` 登记进 `form-loop-registry.mjs`（服务端有 `makeup_tasks` 种子 ⇒ 演示态**可达** ⇒ 不许挂 `machine:false` 搪塞）＋ **同批补真机流** |
| 2 | `form-loop-sweep::S6` | `todo-tab.js` / `makeup-tab.js` 行数位移 ⇒ 既有登记行号漂移 | 改准（`756→760` · `806→824`〔记录作废驳回复用同一文案，登记只此一条、按 (file, 文案) 覆盖两处〕· 新登记 `makeup-tab.js:205`） |
| 3 | `doc-consistency::S14` | 「真机台账」三数随新增校验点变化 | `SITES_BASELINE 111→112` · `FLOWS_BASELINE 58→59` · `README.md` 三数（112 / 99 / 59）同批改准 |

### 四、如实登记

- ⚠ **本批只落 `CRUD-4` 的机制层 ＋ `makeupTasks` 一张样板**；**余 5 张待落**，且其中 **`externalDispatches` / `experienceDeposits` / `tasks` 当前没有「列出行」的表面**（只有发起 / 确认 / 状态位）⇒ 落点须**先与支书定**（已入 `.ctx/REVIEW_QUEUE.md`）。
- ⚠ **站内知会缺口**：未为「业务记录作废裁决」新建通知 kind（`#1` 有 `todo-void-decided`）——待余 5 张落时一并补（届时才有「非支委申请人」需要被知会）。

### 五、收尾全量（`R-85`）

- **`npm test`：936 项 / 936 过 / 0 红 / 0 跳过**（930 → **936**：本批新增 `soft-void` V1–V5 ＋ 真机流 1 条）· **耗时 1,334,203 ms（≈22.2 分钟）**。
- ⚠ **如实登记**：本批**跑了两轮全量**——首轮 **935 / 936 / 1 红**（唯一红＝上表 `S14`，属**计数同批改准**类，非行为缺陷）；三数改准后**复跑受影响 5 件守卫 37 / 37 / 0**，再**跑最终全量 936 / 936 / 0**。
- ⚠ **如实登记**：末条进程退出码 `1`，**非测试失败**（已打印 `pass 936 / fail 0`；系 Playwright 收尾 `debug.log` 写入被沙箱拦截——与测试内容无关，同批次 331/334/343/344/345）。
- 戳 `?v=20261003b → 20261003c`（JS 218 / HTML 22 / CSS 2 / server-test 91；陈旧戳 **0 残留**）。
- **余项**：`CRUD-4` 余 5 张（落点待圈）· `D-744` 第 1 条后半（`assignments` 补入口）· `#10` 命名归属（待支书圈）。

## 批次 347（2026-10-02）：支书评议批 `#5` —— **profile「自己看自己」**（复用 `person` 页脚手架）

> **决议（`R-84`）**：本批**因裁而作**——支书 2026-10-02 评「我们是否落地一个 profile 界面【自己看自己】！！和我们既有的 person 界面可以共用一些代码脚手架！！」。**无新裁定** ⇒ 按 `R-84` **不另立 `D-` 条**。

### 一、本批做了什么

- **`person` 页支持「自己」**（`docs/src/entries/pages/person-entry.js`）：**无 `?id=` ⇒ 本人**——`personId = params.get('id') || viewer.personId`；带 `?id=` 仍严格走「查阅他人档案」（名册 / 各处链接照旧，**行为一字未改**）；自视态在标题行加一枚「本人」标记。
- **入口**（`docs/src/components/shell/header.js`）：登录态在页头动作区新增「**我的档案**」链接（`#header-my-profile` → `person.html`，复用既有 `.header-action-btn` 样式族——与「登录」链接同款；**未登录不渲染**）⇒ **全站每页可达**（与批次 297-2 支书裁「跨台通用动作收进全局固定位」同向）。
- **零新增页面**：复用 `person.html` ⇒ `README-server.md §3.1`「静态页 22 个」与各处页签计数**不变**（这也是做成「双态」而非另建 `profile.html` 的理由）。

### 二、真机取证（一次性脚本 · 不留盘）

- 临时 `.mjs`（跑完即删）：dev 登录**支书** → 断言页头 `#header-my-profile` 在位（文案「我的档案」）→ 点它 → 落到 **`http://localhost:3000/person.html`（无 `?id=`）** → 卡内出现 **「本人」**，且姓名＝**登录人本人**。**四项全中。**
- 卡内实读（截取）：`正式党员 支书 本人 p13 储子禾 基础档案 学号 2300010001 党小组 第一党小组 角色 支书 所属支部 光华管理学院本科生党支部 …`

### 三、首跑抓出的连带（**同批改准**）

| # | 红项 | 病灶 | 改准 |
| --- | --- | --- | --- |
| 1 | `copy-screen-guard::M3` | 页头新增 1 枚控件 ⇒ **全站每屏「文案 ÷ 控件」比值下降** ⇒ `org::我的处置` 实测已 ≤12 | 按**收基线纪律**删 `C4_BASELINE` 条目 ＋ 删同条 `C4_REASON`（是**收基线**、非放宽）；单跑 `copy-screen-guard` **11 / 11 / 0** |

### 四、如实登记

- ⚠ 本批**未新增永久真机用例**（真机取证据为一次性脚本）——现有覆盖＝既有 `person.html?id=p7` 真机流（证**带 id 行为一字未改**）＋ 全量 `page-sweep` / 文案比等；**自视态的长期守卫留作续批**（缺口如实登记）。

### 五、收尾全量（`R-85`）

- **`npm test`：936 项 / 936 过 / 0 红 / 0 跳过**（与本批前同数：无新增用例）· **耗时 1,370,016 ms（≈22.8 分钟）**。
- ⚠ **如实登记**：本批**跑了两轮全量**——首轮 **935 / 936 / 1 红**（唯一红＝上表 `M3`）；改准后单跑 `copy-screen-guard` **11 / 11 / 0**，再**跑最终全量 936 / 936 / 0**。
- ⚠ 末条进程退出码 `1`，**非测试失败**（已打印 `pass 936 / fail 0`；系 Playwright 收尾 `debug.log` 写入被沙箱拦截——与测试内容无关，同批次 331/334/343–346）。
- 戳 `?v=20261003c → 20261003d`（JS 218 / HTML 22 / CSS 2 / server-test 91；陈旧戳 **0 残留**）。
- **余项**：`#4 站内信` · `#8 README-server 瘦身` · `#3 页签「过多」并减` · `#10 命名归属（待支书圈）` · `V-3 页签建议序` · `CRUD-4 余 5 张（落点待圈）` · `assignments 补入口` · 乙/丙部已落盘清理。

## 批次 348（2026-10-02）：支书评议批 `#4` —— **站内信 v1**（「指定人（私发）」档 ＋ 仅收发双方可见）

> **决议（`R-84`）**：本批**因裁而作**——支书 2026-10-02 评「**站内信 是一个 很重要的形式！！请一定要思考落地！！**」（`#4`）；另 `#1` 分叉处支书补「要有站内信……让**相关委员知情**」（`D-743`）。**无新裁定** ⇒ 按 `R-84` **不另立 `D-` 条**。

### 一、落地形（先取证，再落地）

- **只读调研（子代理）**：既有「通知」全貌＝`notices`（`id + data(JSON)`）＋ `audiencePersons` 到人字段 ＋ `canReadNotice` 受众门 ＋ 四处出口（铃铛 / 首页 / 各台待办未读条 / 详情页）。**明确缺**：无「类型」字段 · **`read` 是全局标量** · 无发件人到人字段 · **「支委层可读任意通知」会让私信被全体支委读到** · 发布门只开支委层 · 无选人器 · 无收件箱页。
- **与既有设计口径同向**：`content/04_web_design/deploy/DEPLOYMENT_GUIDE.md:152` 早已设计「**指定人（私发）| 工作私信**」⇒ 本批照该口径落成**「通知发布」表单的「指定人（私发 · 站内信）」受众档**，**不另立新领域**。

### 二、本批做了什么（v1）

- **受众档**（`docs/src/entries/tabs/secretary/notification-tab.js`）：受众区新增「指定人（私发 · 站内信）」档；选中后展开 `PersonPicker`（`mode:'multi'`，姓名 / 学号搜索——遵守选人规范 §2.2）。
- **逐人 fan-out**：提交时对每位收件人各生成一条（`noticeType:'message'` ＋ `fromPersonId` ＋ `audiencePersons:[该人]`）⇒ **未读 / 已读沿用既有全局 `read`**（不误灭他人未读；读侧与角标**零改**）。
- **可见性判据**（`docs/src/services/governance/notice.js`）：`canReadNotice` 新增 **⑥ 站内信分支**——**仅发件人 ＋ 收件人可见**，**必须置于 ④「支委层可读任意通知」兜底之前**；`_isPublisher` 增 `fromPersonId` 到人比对。
- **校验点零新增**：未选人时**复用既有**「请选择目标受众」文案 ⇒ 台账 / 真机流零改签（仅行号漂移 5 条，同批改准）。
- **定向件** `server/test/notice-message.test.mjs`（N1：发件人 ✓ / 收件人 ✓ / **支委层他人 ✗** / 无关成员 ✗ / 无会话 ✗；N2：普通通知既有口径未误伤），入档 `test:daily`。

### 三、真机取证（一次性脚本 · 不留盘）——**抓出一处真缺陷**

- **抓到的真缺陷（本批最有价值的一条）**：我给「指定人」chip 写的 `class` 属性**漏了收尾引号**（`…rounded-lg${…}>` 缺 `"`）⇒ 浏览器把其后整段（含 `<div id="notif-direct-host">`）**吞进 `class` 属性**，chip 成坏元素、**选人器永不出现**。**静态守卫与当轮全量均未拦下**（`form-loop-sweep` 的 `通知发布` 流只走「群体受众」路径）——**真机取证是唯一发现途径**。已修（补 `"`）。
- **修后取证（四项全中）**：① chip 在位、文案「指定人（私发 · 站内信）」；② 点开出现选人器（`#notif-direct-host`）→ 弹窗候选 **51 人**；③ 选中「罗文杰（第一党小组组长）」；④ 填标题 / 正文 → 发布 ⇒ toast **「✓ 站内信「（真机取证）支部工作沟通」已发送给 1 人（仅你与收件人可见）」**。
- **⚠ 一处误判（如实登记）**：首轮取证报「未保存成功」——**不是代码缺陷**，而是我手起的服务**未设 `DEMO_READONLY=0`**（`server/app.js:56` 默认注入 `true` ⇒ 客户端只读）。带 `DEMO_READONLY=0` 重起后即成功。

### 四、⚠ 一条「客户端发布通知不落服务端库」的**疑似**发现（**批次 349 已推翻 · 见下一节**）

- 本批查库（`server/data.db` · `better-sqlite3` 只读）见「客户端发布的通知（含本次私信）不在 `notices` 表」，并以**既有「群体通知」路径**做对照组（同样库内不增）⇒ 当时判为**平台级既有口径**，并列「站内信换会话 / 换设备不通达」为续批首要项。
- **⚠ 批次 349 复取证已推翻该结论**：该实验的浏览器会话用的是**演示登录（`#dev-toggle`）＝ mock 模式**（实测该会话 **零 `/api/v1/` 调用**）⇒ **本来就不写服务端**——**实验设计缺陷，非平台缺口**。**正确结论见批次 349 第一节。**

### 五、首跑抓出的连带（**同批改准**）

| # | 红项 | 病灶 | 改准 |
| --- | --- | --- | --- |
| 1 | `hex-hardcode-guard::H1` | 新 chip 抄了群体 chip 的内联 `--acc-text-dark: … #fff` ⇒ 该文件 hex 5 处 > 基线 4 处（H1 **禁新增**） | 改为**只借 `.chip-accent-on`**（其 color 走主题变量）——不写内联色 |
| 2 | `form-loop-sweep::S6` | `notification-tab.js` 行数位移 ⇒ 5 条既有登记行漂移 | 改准（`180/181/182 → 212/213/218` · `344/345 → 412/413`） |

### 六、收尾全量（`R-85`）

- **`npm test`：938 项 / 938 过 / 0 红 / 0 跳过**（936 → **938**：新增 `notice-message` N1–N2）· **耗时 1,346,833 ms（≈22.4 分钟）**。
- ⚠ **如实登记**：本批**跑了两轮全量**——首轮 938/938/0（**在真机取证之前**的代码态，故**未能**发现第三节那处缺引号缺陷）；补引号后复跑受影响 21 件 **118 / 118 / 0**（含 `form-loop-sweep` 降频 `通知发布` 真机流通过），再**跑最终全量 938 / 938 / 0**。
- ⚠ 末条进程退出码 `1`，**非测试失败**（已打印 `pass 938 / fail 0`；系 Playwright 收尾 `debug.log` 写入被沙箱拦截——与测试内容无关，同批次 331/334/343–347）。
- 戳 `?v=20261003d → 20261003e`（JS 218 / HTML 22 / CSS 2 / server-test 92；陈旧戳 **0 残留**）。
- **余项**：`#4` 余项（**甲** 谁可发 · **乙** 收件箱页 · **丙** 回复线程 · **丁** 是否分两入口）· `#8` · `#3` · `#10 命名归属` · `V-3` · `CRUD-4 余 5 张` · `assignments` · 乙/丙部清理。

## 批次 349（2026-10-02）：`#4` 续 —— **更正一条错误结论** ＋ 私信在通知下拉可辨识

> **性质**：本批＝**自我纠错 ＋ 小步补全**；**无新裁定** ⇒ 不另立 `D-` 条。

### 一、⚠ 更正：批次 348「客户端发布的通知不落服务端库」是**实验假象**

- **复取证（决定性）**：改用**真实登录**（`#student-id` = 2300010001 ＋ 密码 123456；`DISABLE_PASSWORD_CHECK=1`）取得 **API 模式**会话 ⇒ 同一会话实测 **88 次 `/api/v1/` 调用**，其中 **`POST /api/v1/snapshot` 200**（快照写穿）；随后发布一条通知并查库：`notices` **12 → 13 且命中该标题** ⇒ **客户端发布的通知（含私信）确实落服务端库、跨会话 / 跨设备可达** ✓。
- **错在哪**：批次 348 的两次实验**都用「演示登录」（`#dev-toggle`）**——该会话是 **mock 模式**（实测**零 `/api/v1/` 调用**，`persist()` 只写 localStorage）⇒ **本就不写服务端**，我把「演示态不写」误读成了「平台不落库」。
- **教训（本批内化）**：**判「服务端是否落库」前，必须先确认会话的数据源模式（mock / api）**——`docs/src/data/data-adapter.js::persist()`：mock 只写本地；api 走防抖快照（`_flushSnapshot` → `POST /api/v1/snapshot`，`SNAPSHOT_DEBOUNCE_MS = 800`）。且 `notices` **确在** `_buildSnapshotPayload` 内（`:544`）⇒ 快照本就覆盖通知。
- **处置**：批次 348 该节**已就地加注更正**；`.ctx/REVIEW_QUEUE.md` 同名条目改为「**已澄清：无此缺口**」。

### 二、`#4` 小步补全：私信可辨识

- `docs/src/components/shell/header.js`：通知下拉条目在「党委下发」位旁，对 `noticeType === 'message'` 增一枚 `badgeHtml('私信', 'brand')` ⇒ 收件人一眼分清「支部公告」与「私信」；复用批次 337 定色的 `brand` 变体（**不另造外观 · 不写内联色**）。`badgeHtml` 该文件原已引入（`:13`），**零新增 import**。

### 三、收尾全量（`R-85`）

- **`npm test`：938 项 / 938 过 / 0 红 / 0 跳过**（与本批前同数：本批无新增用例）· **耗时 1,345,148 ms（≈22.4 分钟）**。
- 守卫子集：`hex-hardcode-guard` ＋ `text-tier-guard` ＋ `small-text-guard` ＋ `button-system-guard` ＋ `dead-selector-guard` ＋ `version-stamp` ＋ `doc-consistency` ＋ `import-path-guard` ＋ `link-integrity` ＋ `copy-length-guard` ＋ `copy-master-guard` ＋ `self-evident-copy-guard` ＋ `control-font-guard` ＋ `notice-message` ＋ **`copy-screen-guard`（真机）** ⇒ **90 / 90 / 0**。
- ⚠ 末条进程退出码 `1`，**非测试失败**（已打印 `pass 938 / fail 0`；系 Playwright 收尾 `debug.log` 写入被沙箱拦截——与测试内容无关，同批次 331/334/343–348）。
- 戳 `?v=20261003e → 20261003f`（JS 218 / HTML 22 / CSS 2 / server-test 92；陈旧戳 **0 残留**）。
- **余项**：`#4` 余项（**甲** 谁可发 · **乙** 收件箱页 · **丙** 回复线程 · **丁** 是否分两入口）· `#8` · `#3` · `#10 命名归属` · `V-3` · `CRUD-4 余 5 张` · `assignments` · 乙/丙部清理。

## 批次 350（2026-10-02）：支书评议批 `#8` —— **README-server.md 瘦身（第一批）** ＋ 回答「为什么这么大」

> **决议（`R-84`）**：本批**因裁而作**——支书 2026-10-02 评「我不理解为什么README文档会这么大！请一定把所谓的索引，如果不是某种 上下文vibe coding的要求，一定要清理干净！！特别是 裁定时间戳 非常浪费内存！」（`#8`）。**无新裁定** ⇒ 不另立 `D-` 条。

### 一、先取证「谁在读它 / 什么可删」（子代理只读调研 · 决定性）

- **真正读 `README-server.md` 的只有两件**：`doc-line-ref.test.mjs`（引用层 R1–R6）＋ `doc-consistency.test.mjs`（S13 台账登记 / **S14 的 11 组定量锚点** / S15 列举）。`catalog-sync` / `link-integrity` / 全部 `*-guard` **均不读它**。
- **`doc-line-ref` 的 R5 是下限**（`REFS>=370` · `FILES>=55` · `ANCHORED>=30` · 短式 `>=30`）⇒ **不可成片删 `文件:行号` 引用**；其余 R1/R2/R3/R6 亦按引用判定。
- **「裁定时间戳」零守卫依赖**：逐条核实，**没有任何 `批次 N` / `20xx-xx-xx` 被守卫按字面量断言**（S14 的正则只取**数字本体**）。

### 二、本批做了什么（第一批 · 零风险）

- **删「目录」**（13 行）：文件自带 § 标题，目录纯冗余。
- **删 §8.1 后端 ／ §8.2 前端 两张逐文件索引表**（40 行）：与各节末的 `文件:行号` 依据行重复（§8 内**本身 0 条 `文件:行号`** ⇒ 删之不动 R5 任何基线）。
- **S14 锚点迁移**：§8.1 里被 `doc-consistency:753` 断言的唯一一句（「系统派生通知：23 种 kind」）**迁入 §6.7 正文**（新增一行），守卫复跑绿。
- **§8 更名「权威源与自我约束」**：只留「权威源表（谁是谁的唯一源）＋ 本文自我约束」；§8.3→§8.1、§8.4→§8.2。
- **改准**：文首「（见文末 §8 取证索引）」→「（权威源清单见 §8）」。
- **实测体量**：**1977 → 1922 行**（−55）· **145,074 → 142,037 字符**（−3,037）。

### 三、回答支书「为什么这么大」（实测答案 · 已入队列）

- **大头既不是「索引」也不是「时间戳」，而是 §4「数据模型字段级清单」**：`§4` 占 **931 行 ≈ 全文 48%**（§2 角色 262 · §3 功能 202 · §6 接口 191 · §5 部署 133 · §7 已知限制 50 · §1 背景 49 · §8 26）。
- **它是有意复刻** `content/04_web_design/data/DATA_MODEL.md`（§8 原索引表自述「即本文 §4 的来源 A」），服务本文定位——「**不需要先读本仓其它文件就能看懂**」的一站式说明书。
- **实测反证「时间戳浪费内存」的量级**：全文 `批次 N` 140 处 / 99 行、`20xx-xx-xx` 163 处 / ~122 行，**全清也只省 ≈3 KB ≈ 2%**。
- ⇒ **余项三档已入 `.ctx/REVIEW_QUEUE.md`「`#8`」节**请支书圈：**甲** 沿革注记是否清（建议保留，或只清纯日期、留批次号）· **乙** §4 是否改为「指针 ＋ 后端增量」（打破一站式定位）· **丙** §4 是否拆为独立文件。

### 四、收尾全量（`R-85`）

- **`npm test`：938 项 / 938 过 / 0 红 / 0 跳过**（与本批前同数）· **耗时 1,347,069 ms（≈22.5 分钟）**。
- 关键守卫先行复核：`doc-consistency`（含 **S14 锚点迁移**）＋ `doc-line-ref`（**R1–R6 全绿**，含 R5 四条下限）⇒ **22 / 22 / 0**。
- ⚠ 末条进程退出码 `1`，**非测试失败**（已打印 `pass 938 / fail 0`；系 Playwright 收尾 `debug.log` 写入被沙箱拦截——与测试内容无关，同批次 331/334/343–349）。
- 戳**不变**（本批只改 `README-server.md` 与 `.ctx/**`，未动 `docs/` 带戳资产 ⇒ 无需 bump；`?v=20261003f` 保持，陈旧戳 **0 残留**）。
- **余项**：`#8` 三档（待支书圈）· `#4` 四项 · `#3` · `#10 命名归属` · `V-3` · `CRUD-4 余 5 张` · `assignments` · 乙/丙部清理。

## 批次 351（2026-10-03）：`#11` / `#3` —— `V-3` 页签建议序**落地**（3 台注册数组 ＋ 两文档三表同批改准）

> **决议（`R-84`）**：本批**因裁而作**——支书 2026-10-02「**按这个方案推进 V-3 页签建议序和 SOP-G-1 授权口径**」（`D-741`）。其中 **`SOP-G-1` 授权口径已由批次 338 落地**（见该节）；**本批＝`V-3` 建议序的执行** ⇒ 按 `R-84` **不另立 `D-` 条**。对照表＝`.ctx/REVIEW_QUEUE.md`「乙部 `V-3` 余项：页签顺序对照表」（批次 331 出）。

### 一、本批落地（对照表标 `✱` 的 **3 台**，其余 4 台维持）

| 台 | 组 | 新序（注册数组实况） |
| --- | --- | --- |
| **支书 / 副支书**（`secretary-workspace.js`） | 我的职责 | 活动管理 · **支委会** · **党小组与活动** · 通知发布 · 上报党委 · 成员流动（原：活动管理 · 通知发布 · 上报党委 · 党小组与活动 · 支委会 · 成员流动） |
| 同上 | 知情查看 | **支部分工 · 知情查看**（原：知情查看 · 支部分工） |
| **组织委员**（`org-workspace.js`） | 我的职责 | **成员名册 · 人才库** · 考察上传 · 思想汇报 · 专班管理 · 成员流动（原：考察上传 · 思想汇报 · 专班管理 · 成员名册 · 成员流动 · 人才库） |
| **成员**（`visitor-workspace.js`） | 我的职责 | **活动动态 · 项目分工** · 考勤概况 · **思想汇报 · 我的考察** · 我的复盘（原：项目分工 · 活动动态 · 考勤概况 · 我的考察 · 思想汇报 · 我的复盘） |

- **理由（照录对照表）**：支书常态动作「支委会（议事留痕）」前置、上报党委按需后移；「支部分工」更具职责属性 ⇒ 与知情查看对调；支书令「**考察就是维护人才库的过程**」⇒ 名册 / 人才库＝长期维护主表前置；「最近有什么活动」是成员第一问 ⇒ 活动动态前置，思想汇报有节律（季度）⇒ 前移。
- **组序与条数一律不动**（`V-2` / `V-3①` 已定 DOM）——只调「我的职责 / 知情查看」**组内**次序。

### 二、同批改准（两文档 3＋3 表 · 因两处自述口径＝「注册序」）

- **`docs/help.html`** §2.1 / §2.2 / §2.6（该文件 `:298` 自述「第 2 章各 tab 表 ＝ **默认全开 ＋ 注册序**」⇒ 顺序即口径，须同批）；各表加一行极短批次说明注释（3 处）。
- **`README-server.md`** §3.2.1 / §3.2.2 / §3.2.6（表头带 `#` 序号列 ⇒ 顺序即信息；**只换行、行数守恒** ⇒ `doc-line-ref` R1–R6 的 `文件:行号` 引用零漂移）。
- **更正批 331 表头一处估数**：原写「同批改 `help.html` **五处表**＋各台数组」，**实测受影响台数＝3** ⇒ 只 3 表需改（未动的 4 台其表不必改）；已就地改准（`.ctx/REVIEW_QUEUE.md` 该节 ⚠）。

### 三、取证（先实读，未猜 · 两条决定性）

- **注册数组即「默认顺序」唯一源**：`docs/src/data/mock/branches.js:31` 演示支部 `modules: null`（＝默认全开 ＋ 注册序）；`server/seed.js` **无** `modules` / `tabOrder` 硬编码 ⇒ 改注册数组即改默认序，**无第二处需同步**。
- **无任何守卫断言页签顺序**：`doc-consistency::S1` 只核「各台 tab 数 ＋ tab 名是否在节内出现」（`:113` `block.includes(label)`，**不含序**）；`tab-nav` 核「初始决策优先序 / 回退」，不读注册数组次序 ⇒ **改序零守卫改签**（S1 计数无变化）。
- **首跑一处「疑似红」经复跑定性＝环境类**：子集首跑 48/49，唯一红为 `group-view.test.mjs`。复跑单件得 `401 !== 200`（B 类现场真登录）——**根因＝我手跑未注入 `DISABLE_PASSWORD_CHECK=1`**（`npm test` 脚本已注入）；**非真回归**。

### 四、守卫实跑

- 静态组 9 件（`doc-consistency` / `doc-line-ref` / `catalog-sync` / `capability-registry` / `tab-nav` / `version-stamp` / `module-load` / `dead-selector-guard` / `import-path-guard`）—— **72 / 72 / 0 红**。
- 全量见第五节。

### 五、收尾全量（`R-85`）

- **`npm test`：938 项 / 938 过 / 0 红 / 0 跳过** · **耗时 1,345,564 ms（≈22.4 分钟）**。
- ⚠ **如实登记**：末条进程退出码 `1`，**非测试失败**（已打印 `pass 938 / fail 0`；系 Playwright `debug.log` 写入被沙箱拦截——同批次 331/334/343–350）。
- 戳**不变**（本批未动 `docs/` **带戳资产引用**，只改 `help.html` 正文行序与能力数组的行序 ⇒ `?v=20261003f` 保持，陈旧戳 **0 残留**）。
- ⚠ **全量后只再改「非代码面」**（`.ctx/**` ＋ `CLAUDE.md`——均不带版本戳、不被任何 e2e 读取）：其读取方**逐件核过**＝11 件（`doc-consistency` / `doc-line-ref` / `timestamps-note-guard` / `frontmatter-freshness` / `catalog-sync` / `capability-registry` / `tab-nav` / `version-stamp` / `module-load` / `dead-selector-guard` / `import-path-guard`），**全量后复跑 82 / 82 / 0 红**；另 `click-cost` / `validation-site-coverage` / `write-grant-prompt-e2e` 三件**仅在注释里提及**这三份文件、**不读盘**（实核）。

### 六、台账改准

- `.ctx/TIMESTAMPS.md`：`docs/help.html` · `capabilities/org-workspace.js` · `capabilities/visitor-workspace.js` · `.ctx/logs/2026-10-EXECUTION_LOG.md` · `CLAUDE.md` 五行日期 → `2026-10-03`；**并补登一条缺失行** `docs/src/capabilities/secretary-workspace.js`（**实测该表原先无此行**，本批改了它 ⇒ 按 `R-83` 补登；备注列**不写 T 编号**以守 `timestamps-note-guard::N2` 只降不升预算——实测余量 230 字）。
- `.ctx/REVIEW_QUEUE.md`：`V-3` 节 → **已批 · 已落地**台账（§ 标题 ＋ ✅ 落地行 ＋ ⚠ 实测更正）。
- `CLAUDE.md` 乙部 `V-3` 行 → **✅ 全部落地**（①③ 批次 317 · ② 批次 351）。

### 七、如实登记

- ⚠ **本批只改「序」、不改「数」**：各台合计仍 **72 条** ⇒ `doc-consistency::S1` 计数无变化、`page-sweep` 仍 `tab=72`。
- ⚠ **`#3`「页签太多」的「减量」半边未动**：其**兼并**路径经 `H-25` 核查判「**无一组可合并**（`D-675` 母本依据不足）」⇒ **仍待支书裁**（是否接受该结论 / 或先改母本再减）；本批只落「**重排**」这一已被支书圈定的半边。
- ⚠ **`#6` 余项（`2026-07` / `2026-08` 两份月决策日志 frontmatter `status` 仍为 `active`）本批未动**（批次 336 已登记为「如需彻底整洁，另批处理」；判据取「最新 active」故不影响正确性）。
- **余项**：`#3` 减量（待裁）· `#2` `CRUD-4 余 5 张`（落点待圈）· `#4` 四项 · `#8` 三档 · `#10 命名归属` · `assignments` 补入口 · 乙/丙部清理。

## 批次 352–355 前置（2026-10-03）：支书就**四条待裁命题**圈定 —— **裁定落账**（`D-746`–`D-749`）

> **决议（`R-84`）**：本节是**裁定落账**（不实现）——支书 2026-10-03 就四条待裁命题逐条圈定 ⇒ **裁定进决策日志**（`D-746`–`D-749`），**过程与计数同批改准**进本节。**四条的实现分属批次 352（CRUD 余 5 张）· 353（站内信余三项）· 354（README 指针口径）· 355（`#3` 结论落账 ＋ 乙/丙部清理）**。

| # | 命题 | 支书圈定 | 落点 |
| --- | --- | --- | --- |
| `#2` | `CRUD-4` 余 5 张（`imageRecords` / `weeklyReports` / `externalDispatches` / `experienceDeposits` / `tasks`）的落点 | **甲 排批直接修**（无列表面的先补列出行） | `D-746` → 批次 352 |
| `#3` | 页签「过多」的减量方向 | **甲 接受 `H-25`「无一组可合并」结论**（减负＝重排 ＋ 折叠下沉 ＋ CTA；tab 数维持） | `D-747` → 批次 355 |
| `#4` | 站内信余四项 | **取三项**：收件箱页 · 发件权＝支委层∪组长 · 回复线程；**「分两入口」不取** | `D-748` → 批次 353 |
| `#8` | README-server 瘦身余三档 | **口径（逐字）**：「如果日志记录了相关的执行细节，那么我认为 README 只能留个把个指针！指针也必须指向 active file，绝不能是 log。」⇒ 清沿革注记、指针只指 active file | `D-749` → 批次 354 |

### 一、本批（落账）改了什么

- `.ctx/logs/2026-10-DECISION_LOG.md`：新增 **`D-746`–`D-749` 四条**（含逐条的背景 / 选项与裁定 / 理由 / 影响范围）＋ **四处同源计数**改准（文首「条目编号起止」`D-729`…`D-749` / 共 **21** 条 / 下一条自 `D-750` · 本月目录**前置四行** · 文末「续编说明」· 月度索引行）＋ frontmatter 刷 `2026-10-03`。
- `.ctx/logs/DECISION_LOG.md`（月度索引）：`2026-10` 行 `17 条（D-729~D-745）` → **`21 条（D-729~D-749）`** ＋ 概要补本批四条。
- `.ctx/TIMESTAMPS.md`：`2026-10-DECISION_LOG.md` · `DECISION_LOG.md` 两行日期刷 `2026-10-03`。

### 二、守卫实跑

- `doc-consistency`（含 ⑥ 四处同源 ＋ **⑥-2 各月 × 索引行交叉核对**）＋ `timestamps-note-guard`（N1–N7）＋ `frontmatter-freshness`（F1–F3）＋ `doc-line-ref` —— **32 / 32 / 0 红**。

### 三、如实登记

- ⚠ **本次只落账、未实现**：四条裁定的实现分别排在批次 352–355；**未改任何 `docs/**` 或 `server/**` 代码** ⇒ **未 bump `?v=`**（仍 `20261003f`）。
- ⚠ **`D-746` 括注里「其中 3 张无『列出行』表面」系我在写条目时的速记**——批次 341 矩阵实读是：`tasks` 的 R＝活动详情「任务清单」/ 日历（**有读面**）· `externalDispatches` 的 R＝工作总览 / 各台「我的处置」（**有读面**）· **只有 `experienceDeposits` 无沉淀清单页** ⇒ **实现批以矩阵为准**，且**在 352 节更正该句**（不假装当初就对）。

## 批次 352（2026-10-03）：`#2` `CRUD-4` 余项（第一批）—— **作废（软）**扩至 3 张（照片 / 周报 / 经验沉淀）＋ 弹窗**单一源** ＋ 两处适配器缺口修复

> **决议（`R-84`）**：本批**因裁而作**——支书 2026-10-03 就 `CRUD-4` 余 5 张取「**甲 排批直接修**」（`D-746`）。本批＝执行 ⇒ 不另立 `D-` 条。**组批口径**：余项**排批**⇒ 本批落**读面在普通 tab 页的 3 张**，**余 2 张（`externalDispatches` / `tasks`）排批次 352b**（先决条件已入队列，见第七节）。

### 一、本批落地（3 张，各补「读侧出列 ＋ 行内作废键」）

| 表 | 承载面（读面） | 读侧过滤 | 行内键 |
| --- | --- | --- | --- |
| `imageRecords` | 宣传台「档案归档 → **照片墙**」每张照片卡片 | `_loadImageRecords()` 走 `SoftVoid.filterActive` | `.pw-void-btn`（旁「待支委会确认」过渡态） |
| `weeklyReports` | 宣传台「周报报送 → **报送历史**」每行（**同时收住周次下拉**） | `_sortedReports()` 走 `filterActive`——⚠ **不在 `_loadWeeklyReports()` 过滤**（该函数结果会被 `mockDB.weeklyReports = reports` 写回，过滤即**丢行**） | `.weekly-void-btn` |
| `experienceDeposits` | 纪检台「活动监督复盘 → **已沉淀清单**」——**本批新补的「列出行」**（此前只有「督促清单」＝缺沉淀的活动，没有沉淀记录本身的列表） | `_activeDeposits()`；**交叉引用同步改** ⇒ 作废后该活动**回到督促清单** | `.rv-void-deposit` |

- 注册表（`services/governance/soft-void.js::SOFT_VOID_RESOURCES`）按同款**逐张加**（`storeKey` / `label` / `ownerRole` / `titleOf`），未另写第二套写口。

### 二、弹窗**单一源**（重构 · 一并收掉批次 346 的内联实现）

- 新增 `docs/src/components/ui/void-record.js::openVoidModal()`：**「作废原因必填」＝全站唯一实现处**；支委层直接 `confirmVoid` / 其余人 `requestVoid`（审批门口径同 `#1` · `D-742`）。
- 批次 346 的补课板块**同批改为调用它**（传入其既有 id：`makeup-void-modal` / `#makeup-void-reason` / `[data-makeup-void-ok]`）⇒ **真机流 `disc-makeup-void-reason` 的选择器一字未改**；台账两处随实现改签（`file` → `components/ui/void-record.js:61`）。

### 三、真机取证（一次性探针 · 跑完即删 · api 形态真登录）

| 面 | 证据（逐条实测） |
| --- | --- |
| ① 宣传委员（2400012356）· 周报报送 | 作废键 **4 枚** → 点开弹窗（`#void-reason` 在位）→ **空原因**提交 ⇒ toast「请填写作废原因（必填）」且**载体仍在位** → 填原因确认 ⇒ 报送历史 **4 → 3**；服务端 `GET /api/v1/weeklyReports` 命中 `voided.reason` ＝ 所填原因 |
| ② 照片墙 | 演示库**无照片**（`imageRecords` 0）⇒ 先用服务端上传接口造一张（`POST /api/v1/uploads` → `POST /api/v1/imageRecords` **201**）⇒ 卡片 **1**、作废键 **1** → 作废 ⇒ 卡片 **0**、服务端 `voided` **1** |
| ③ 纪检委员（2400012354）· 活动监督复盘 | 督促清单 **2** 条 → 经「督促沉淀」表单记 1 条 ⇒ **「已沉淀清单」卡出现**（**1** 条）· 督促剩 **1** → 作废该沉淀 ⇒ 已沉淀 **1**、服务端 `voided` **1**、**督促清单回到 3**（＝作废后该活动**重新回到督促清单** ✓ 语义要点） |

- **`pageerrors` ＝ 0**；探针自造记录（照片 / 沉淀）**跑完删除**、已作废者**恢复未作废** ⇒ 演示库复原（`remainingVoided` 三项全 0、`probeRowsLeft` 0）。

### 四、**首跑抓出两处真缺陷（已修 · 本批最重要）**

| # | 现象（真机/定向件实抛） | 根因 | 处置 |
| --- | --- | --- | --- |
| ① | api 形态作废 `experienceDeposits` 抛 `getAdapter(...)[resource].update is not a function` | **`api-adapter` 该域只有 `list` / `create`**（批次 343 `D-745` 四件套未覆盖到它） | 补 `update` / `delete` 两件 |
| ② | mock 形态作废 `weeklyReports` 抛 `Cannot read properties of undefined (reading 'update')` | **`MockAdapter` 根本没有 `weeklyReports` 域**（周报既有写法是 `mockDB.weeklyReports` ＋ `persist()` 直写，从未经适配器 ⇒ 长期潜伏） | 补该域四件套 |

- 两处均为**先实跑、后修**（①由真机探针抛出；②由新增定向件 `V6` 抛出）——**静态守卫一件都没拦住**（无「适配器四件套完备性」判据），如实登记为**守卫空白**。

### 五、守卫实跑

- 直接面：`npm run test:fast` 全套 ＋ `module-load` / `import-path-guard` / `doc-consistency` / `version-stamp` / `timestamps-note-guard` / `frontmatter-freshness` ⇒ **184 / 184 / 0 红**。
- 真机面：`copy-screen-guard`（M1–M4，**未收基线**）＋ `soft-void.test.mjs`（**V1–V6**，V6＝本批新增「第二张表走同一套语义」）⇒ **16 / 16 / 0 红**。
- 适配器/一致性面：`soft-void` / `mock-api-parity` / `module-load` / `import-path-guard` / `write-path-guard` / `doc-consistency` / `catalog-sync` / `seed-baseline` ⇒ **44 / 44 / 0 红**。
- **收尾全量见第六节。**

### 六、收尾全量（`R-85`）

- **`npm test`：939 项 / 939 过 / 0 红 / 0 跳过** · **耗时 1,438,119 ms（≈24.0 分钟）**（本批新增用例 ＋1：`soft-void` 的 V6 ⇒ 938 → **939**）。
- ⚠ **如实登记**：末条进程退出码 `1`，**非测试失败**（已打印 `pass 939 / fail 0`；系 Playwright `debug.log` 写入被沙箱拦截——同批次 331/334/343–351）。
- ⚠ **首跑 1 红 ＝ 陈旧断言（已改准）**：`form-loop-sweep::S6`（台账行号必须精确命中）报 **6 处漂移**——`prop/weekly-tab.js` 163/164/204 → **169/170/210** · `prop/archive-tab.js` 902/906/1293 → **919/923/1316**（本批在这两个文件里插了行）；改准后 `S6` 单跑复绿，**第二跑全量 939/939/0**。⇒ 与「环境类 / 真回归」三分类无涉（属**计划内的同批改签**，只是首跑漏做）。
- 戳**不变**（`?v=20261003f`；本批新增 / 改动的前端文件均在该链上，`version-stamp` S3·S6 复跑绿）。

### 七、如实登记

- ⚠ **余 2 张排批次 352b**：`externalDispatches`（**读面落在禁改文件** `entries/tabs/secretary/overview-tab.js` ⇒ 须特批或改由宣传台档案归档行内那枚外发单元承载）· `tasks`（**「作废派生任务」语义待定** ＋ MockAdapter 无 `tasks` 域）。**已入 `.ctx/REVIEW_QUEUE.md`**。
- ⚠ **未为「业务记录作废裁决」新建通知 kind**（`#1` 待办作废有 `todo-void-decided`）⇒ 352b 一并补。
- ⚠ **`D-746` 括注一处速记更正**：实测只有 `experienceDeposits` 无「列出行」表面（`tasks` / `externalDispatches` **有**读面）。
- ⚠ **戳不变**（`?v=20261003f`；新增文件与改文件均在该链上，`version-stamp` S3 复跑绿）。
- ⚠ **台账**：`TIMESTAMPS.md` 10 行日期刷 `2026-10-03` ＋ **补登 2 行**（`services/governance/soft-void.js` · `components/ui/void-record.js`；备注列合计 **47,460 / 预算 47,500**，仍在只降不升面内）· `docs/help.html` 三处补「作废」口径（照片墙 / 报送历史 / 复盘交接链）。

## 批次 352b（2026-10-03）：`#2` `CRUD-4` **余 2 张收口** —— `externalDispatches` · `tasks` ⇒ **该条闭环**

> **决议（`R-84`）**：承 `D-746`（支书 2026-10-03 取「甲 排批直接修」）；本批为**收口批** ⇒ 不另立 `D-` 条。**其中 `tasks` 的清理口径**经我 `AskUserQuestion` 请示，**支书 2026-10-03 取「甲：活动详情页行内作废（推荐）」**——该取向按 `R-84` 亦并入 `D-746` 的射程（同一命题的续答），**不另立条目**。

### 一、本批落地（余 2 张）

| 表 | 承载面 | 读侧出列点 | 行内键 |
| --- | --- | --- | --- |
| `externalDispatches` | 宣传台「档案归档」**行内那枚外发单元**（＝记录产生地；**未改禁改的概况面**） | **服务层** `external-dispatch.js::loadActiveDispatches()`（`listPendingByReceiver` 同批改走它）⇒ **发送方与接收方（含禁改的 `overview-tab.js` / `work-overview.js`）同时不再显示** | `.archive-dispatch-void-btn` |
| `tasks` | **活动管理内「活动巡查」面板的任务清单**（组长台/支书台同件 `components/record/inspector.js`） | `services/core/mock.js::listTasks()`（`state.tasks` 消费方全出列）⇒ **活动进度推导随之外列** | `.task-void-btn` |

- ⚠ **`externalDispatches` 的「禁改面」难题用服务层读口化解**（**未申请特批、未改概况文件**）：原唯一列表面在概况侧（`CLAUDE.md` 禁改）⇒ 本批**不动它**，把出列做在**服务层读口**上——一处改、两个界面同时生效。

### 二、**本批又抓到两处同型缺口 ＋ 一处旧契约坑（全部先实跑后修）**

| # | 现象 | 根因 | 处置 |
| --- | --- | --- | --- |
| ① | mock 形态作废外发记录抛 `Cannot read properties of undefined (reading 'update')` | `MockAdapter` **没有 `externalDispatches` 域**（api-adapter 早有）——与批次 352 的 `weeklyReports` **同型** | 补该域（list/create/update） |
| ② | mock 形态作废任务会把该行**替换成一个数组** | `MockAdapter.tasks.update` 历史契约**返回整个 tasks 数组**（同旧 `mock.js`） | 把 `soft-void::_write` 改为**不假设适配器返回形状**：返回值不是「该记录对象」时按 patch 本地合成 |
| ③ | 上两类的**守卫空白** | 批次 352 已登记「无适配器四件套完备性判据」 | 新增 **`soft-void.test.mjs::V7`**：逐张登记表核「两适配器都有 `update`」＋「`mockDB` 有该域」＋「注册项四要素齐」 |

### 三、真机取证（一次性探针 · 跑完即删 · api 形态真登录）

| 面 | 证据（逐条实测） |
| --- | --- |
| ① 任务作废（支书 2300010001） | 活动管理 → **月份切到 2026-07**（月份选择器 `#month-selector`）→ 点活动条目 `act-1` ⇒ 任务清单 **2 枚**作废键 → 空原因提交报「请填写作废原因（必填）」且载体在位 → 填原因确认 ⇒ 键 **2 → 1**、服务端 `tasks.voided.reason` ＝ 所填原因 |
| ② 外发记录作废（宣传委员 2400012356） | 先经 API 造一条 `refType:'publicity'` 外发记录（**并补一条带材料的归档记录**——该单元仅在**有材料文件**的行渲染）⇒ 行内出现 **1 枚**作废键 → 点开弹窗 → 填原因确认 ⇒ 键 **→ 0**、服务端 `voided` **1**；**发送方与接收方读口同步出列** |

- **`pageerrors` ＝ 0**；探针自造记录（外发 / 归档记录）**跑完删除**、已作废者**恢复** ⇒ 演示库复原（`remainingVoided` 两项 0 · `probeRowsLeft` 0 · `archiveRecords` 回到 6）。

### 四、守卫实跑

- `test:fast` 全套 ＋ `module-load` / `import-path-guard` / `doc-consistency` / `version-stamp` ⇒ **184 / 184 / 0 红**。
- `form-loop-sweep::S6`（台账行号精确命中）单跑 ⇒ 绿：本批连带改签 **7 处**——`prop/archive-tab.js` 919/923/1316 → **937/941/1334** · `components/record/inspector.js` 572/1360/1361/1362 → **574/1395/1396/1397**。
- `soft-void`（**V1–V7**）＋ `mock-api-parity` ＋ `module-load` ⇒ **15 / 15 / 0 红**。
- `timestamps-note-guard`（N1–N7）＋ `frontmatter-freshness`（F1–F3）⇒ 绿。
- **收尾全量见第五节。**

### 五、收尾全量（`R-85`）

- **`npm test`：940 项 / 940 过 / 0 红 / 0 跳过** · **耗时 1,484,578 ms（≈24.7 分钟）**（较上批 ＋1：本批新增 `soft-void::V7`）。
- ⚠ **如实登记**：末条进程退出码 `1`，**非测试失败**（已打印 `pass 940 / fail 0`；系 Playwright `debug.log` 写入被沙箱拦截——同批次 331/334/343–352）。
- ⚠ **首跑 1 红 ＝ 陈旧断言（已改准）**：`doc-line-ref::R2`（引用后括注符号须落在声明区间内）报 **2 处行号漂移**——`README-server.md:135` 的 `inspector.js:624` → **626** · `:1456` 的 `archive-tab.js:544-581` → **570-600**；**同批顺带改签另 3 处**（`:126` 的 `inspector.js:618` → **626**、`:615` 的 `inspector.js:828-847 / :1083-1097` → **840-861 / 1126-1139**、`:1456` 的 `archive-tab.js:998-1065` → **1033-1096**）；改后 `doc-line-ref` ＋ `doc-consistency` ＋ `version-stamp` 复跑 **40 / 40 / 0**，**第二跑全量 940/940/0**。
- 戳**不变**（`?v=20261003f`；`version-stamp` S3·S6 复跑绿）。

### 六、如实登记

- ⚠ **`CRUD-4` 判定为 ✅ 已闭环**（6 张全部具备「原因必填 → 支委直接作废 / 其余人报支委会 → 读侧出列 ＋ 留痕可回查」）；队列该条已改准。
- ⚠ **站内知会缺口仍未补**（「业务记录作废裁决」无派生通知 kind）⇒ **单列余项**，不影响闭环判定（裁决入口已在支书台待作废面）。
- ⚠ **`tasks` 作废影响面已如实登记**：`listTasks()` 出列 ⇒ 活动**进度推导/生命周期徽标**同步变化（探针未逐面核徽标差异，留待后续批若需要再取）。
- ⚠ **戳不变**（`?v=20261003f`）。

## 批次 353（2026-10-03）：`#4` 站内信**余三项落地** —— 收件箱页（独立页）＋ 发件权口径（支委层 ∪ 组长）＋ 回复线程

> **决议（`R-84`）**：承 `D-748`（支书 2026-10-03 取「收件箱页 ＋ 发件权＝支委层∪组长 ＋ 回复线程」三项、「分两入口」不取）。**开工时对「收件箱页的形态」再次请示**，支书取「**独立『我的私信』页**」⇒ **同题续答并入 `D-748`**（不另立条目），代价（页面计数 22 → 23）已同批付清。

### 一、本批落地

| 项 | 落地 |
| --- | --- |
| **乙 · 收件箱页** | 新增 `docs/messages.html` ＋ `docs/src/entries/pages/messages-entry.js`：**收件 ＋ 发件一屏**、方向徽标（收到 / 发出）、`全部 / 收到 / 发出 / 未读` 胶囊筛选、未读计数、展开即标已读（走 `NoticeStore.markRead`）、**就地回复成线**、写私信（按发送权显隐）。侧边栏加「我的私信」入口（**党委视图隐藏**，随 `PARTY_STAFF_HIDDEN_NAV`） |
| **甲 · 发件权** | 新立**单一源** `notice.js::canSendDirectMessage(role)`＝支委层 ∪ `leader`；`NoticeStore.add()` 对 `noticeType:'message'` **改走该判据**（与通用发布权分列——否则组长会被「本组通知＝本人是该场组织者」挡掉） |
| **丙 · 回复线程** | 新立 `sendDirectMessage()` / `replyToMessage()`（**服务层单一写口**；批次 348 的表单分支同批改为调用它，**旧的 inline fan-out 删除**）；回信＝一条新私信 ＋ **`replyTo`** 指向原信（不新造实体） |
| **丁 · 分两入口** | **✘ 不取**（维持单一入口；私信只在「我的私信」页与铃铛内的私信条目） |

### 二、页面计数连锁（独立页的代价 · 三处同源改准）

- `README-server.md §3.1`：标题 `共 22 个静态页` → **23**；清单补 `docs/messages.html` 行；「依据」的 `15 个根 .html` → **16**。
- `.ctx/SNAPSHOT.md`：目录树 `页面实测 22=15 根+7 工作台` → **23=16 根+7**；§III 核心文件清单补 `messages.html` 行；frontmatter `last_updated` 刷 `2026-10-03`（＋ `TIMESTAMPS` 同源行）。
- `docs/help.html §0.1`：站点页面表补「我的私信」行（含「只显示私信、不含支部公告」边界与发件权）。

### 三、台账连锁（新增 3 处校验点 · 1 条真机流）

- `form-loop-registry.mjs`：新增 3 处 `machine:true` 校验点（写私信：标题 / 正文 / 收件人）＋ 真机流 **`messages-compose-validate`**（**独立页 `/messages.html` · 逐支验到**；前两支用 `setValue` 满足 ⇒ **不触选人器**）；`SITES_BASELINE 112 → 115` · `FLOWS_BASELINE 59 → 60`。
- `README.md` 真机守卫段三数同批改准（`共 115 处校验点` · `machine:true 102` · `60 条真机闭环` / `真机流程 60 条`）。
- **刻意的排序设计**：写私信校验次序＝**标题 → 正文 → 收件人** ⇒ 前两支不依赖选人器（真机流可在不触选人器的前提下逐支验到）；回复区的「正文必填」**复用同一条文案**（同一口径，不另立第二处校验点）。

### 四、真机取证（一次性探针 · 跑完即删 · api 形态真登录 · `pageerrors` ＝ **0**）

| # | 证据 |
| --- | --- |
| ① 发私信（支书 2300010001） | 侧边栏「我的私信」入口 ✓ · 「写私信」按钮 ✓ · 选人器 **51 名候选** → 选 2 人 → 填标题 / 正文 → 发送 ⇒ toast「私信已发送给 …」✓ · 服务端 `notices` 新增 **2 条** `noticeType:'message'` 且 `fromPersonId='p13'` ✓ · 页内列表 2 行 ✓ |
| ② 收件人侧（实际收件人 p1 罗文杰 / 2400012345） | 「收到」条目 ＋ 未读徽标 ✓ → 展开（即已读）→ 回复 ⇒ toast「回复已发出」✓ · 服务端新增 **1 条** `{from:'p1', to:['p13'], replyTo:'notice-…'}` ⇒ **回复线程落库** ✓ |
| ③ 发件权反例 / 正例 | 普通成员（2400012349）⇒ 「写私信」按钮 **0（不出现）** ✓；党小组组长（2400012345）⇒ **1（在位）** ✓ |
| 复原 | 探针建的 5 条私信 / 回复 **全部删除**，`notices` 回到 **13**（与探针前一致）✓ |

### 五、守卫实跑

- `test:fast` 全套 ＋ `import-path-guard` / `version-stamp` / `timestamps-note-guard` / `frontmatter-freshness` ⇒ 绿。
- `validation-site-coverage`（V1：候选 **114** · 未登记 **4** ＝ 基线不变）＋ `doc-consistency`（S14 页面数三处已改准）＋ `module-load`（**E2 受检 13 页**，新增 `messages.html(经 hydrateDataSource)` 已被纳入）＋ `link-target-guard` / `link-integrity` / `doc-line-ref` / `catalog-sync` ⇒ **38 + 21 / 0 红**。
- **首跑 2 处红（均属「计划内改签 / 新写法的自纠」，非真回归）**：
  1. **新增真机流自身**：`messages-compose-validate` 首跑报「静默失败（正文）」——根因＝我把「满足上一格」误写在 `expect[i].submit`（`submit` 只接受**单步**，且语义是「本次提交怎么点」），**正确写法是 `expect[i].satisfy`**（满足该格以推进到下一支）；改后仍报「载体不在位 `#msg-compose-host`」⇒ 该 host 是无尺寸容器，**载体改指选人器触发键** `#msg-composer-host .person-picker-trigger`；两改后单跑 **1/1 绿**。
  2. **`form-loop-sweep::S6` 台账行号漂移 2 处**：`notification-tab.js` 412/413 → **405/406**（本批把该文件的私信 inline fan-out 换成了服务层调用，删掉 7 行）⇒ 同批改签后单跑绿。
  3. **`copy-screen-guard::M3` 要求收基线**：本批给宣传台「档案归档 / 周报报送」行尾加「作废」控件（批次 352/352b）⇒ `prop::宣传任务` 屏比值已 **≤12** ⇒ 按「**收基线纪律**」删 `C4_BASELINE` 该条目（`C4_REASON` 同撤）；复跑绿。**这是本批唯一一处「既非改签亦非自纠、而是因前批改动滞后触发」的红**——如实登记前批（352）未同批收该基线。
  4. **`button-system-guard::B4`「未入语义族 `<button>` 只许降不许升」**：新页两枚按钮（行级展开键 `.msg-toggle` · 筛选胶囊 `.msg-filter`）**未挂 8 族之一** ⇒ 按既有写法改准：展开键 → **`btn-ghost`**（透明、hover 底色，适合整行键）、筛选胶囊 → **`btn-tab chip-option`**（与 `list-filter.js` / `notification-tab.js` 的胶囊同款）⇒ 复跑绿（B4 ＋ dead-selector ＋ module-load 12/12）。**如实登记**：这是「新页必须走既有按钮族」的一次当场拦截，值此一记。
- **收尾全量见第六节。**

### 六、收尾全量（`R-85`）

- **`npm test`：941 项 / 941 过 / 0 红 / 0 跳过** · **耗时 1,366,217 ms（≈22.8 分钟）**（较上批 ＋1：本批新增校验点 3 处 ＋ 真机流 1 条 ⇒ 用例数 940 → **941**）。
- ⚠ **如实登记**：末条进程退出码 `1`，**非测试失败**（已打印 `pass 941 / fail 0`；系 Playwright `debug.log` 写入被沙箱拦截——同批次 331/334/343–352）。
- ⚠ **本批共 5 轮全量**（`R-85` 的代价如实记）：第 1 轮红＝新增真机流自身写法（`satisfy` 误置 · 载体无尺寸）· 第 2 轮红＝`form-loop-sweep::S6`（行号漂移）· 第 3 轮红＝`copy-screen-guard::M3`（前批 352 未同批收基线）· 第 4 轮红＝`button-system-guard::B4`（新页按钮未入 8 族）· **第 5 轮全绿**。**四处红逐条已在上节如实登记**（无一处掩盖）。
- 戳**不变**（`?v=20261003f`；`version-stamp` 复跑绿）。

### 七、如实登记

- ⚠ **`TIMESTAMPS.md` 备注列预算已顶格**（47,480 / 47,500，只降不升）⇒ 本批两个**新文件**（`docs/messages.html` · `entries/pages/messages-entry.js`）**未补登表行**，沿用本表既有的「**只登记不补行**」做法（本表原先亦无 `secretary-workspace.js` 等行）。**已入队列**：先做备注列收敛（清 N5 日期复述 / 沿革式括注）腾出预算，再补登。**另实测发现**：`docs/src/entries/tabs/secretary/notification-tab.js` 在 `TIMESTAMPS.md` **亦无表行**（本批改过它）——同属既有覆盖缺口，一并记入队列待收敛后补登。
- ⚠ **未改 `components/shell/header.js`**（`D-748` 影响范围原列「通知下拉加私信筛选入口」）——因支书取**独立页**形态，私信聚合面已由新页承担，铃铛处**保留**既有的「私信」徽标即可，**不再另加筛选**（如实登记该处范围收窄）。
- ⚠ 未为「新私信到达」新建通知 kind（沿用既有通知角标与未读条，故无缺口）。
- ⚠ 戳**不变**（`?v=20261003f`；新增页与新增模块均在该链上，`version-stamp` 复跑绿）。

---

## 批次 354（2026-10-03）：`#8` README-server 瘦身**第二批** —— 沿革注记（`批次 N` / 纯日期 / `D-xxx`）**全清** · 指针只指 active file（`D-749`）

支书 2026-10-03 就 `#8`「README 为什么这么大」的余三档给出**指针口径**（逐字）：「**如果日志记录了相关的执行细节，那么我认为 README 只能留个把个指针！指针也必须指向 active file，绝不能是 log。**」（`D-749`）⇒ 本批＝执行（`R-84` 不另立 `D-` 条）。

### 一、落地口径（三清三留）

| 清出 | 保留 |
|---|---|
| `批次 N` 沿革式括注 / 句首框（`**2026-xx-xx 批次 N 补/改准**：`） | `文件:行号` 引用**一字未动**（`doc-line-ref` R1–R6 的判据面，且正指 active 代码） |
| 纯日期沿革（作为出处 / 生效时点的 `2026-xx-xx`） | 句中**现况事实**（谁可做 / 怎么算 / 落到哪个字段） |
| `D-xxx` 裁定编号（**80 处 → 0**） | 数据示例日期（§4.18 `weekRange` 的 `2026-08-04 ~ 2026-08-08`）与**代码注释原文引文**内的日期（§7.1#2 的 `resources/index.js:517` 注释引文） |

**「改写」而非「删句」为原则**：句首「`**2026-xx-xx 批次 N 补**：`」的沿革框**改写为现行口径小标题**（如 §4.1「活动批准门」与「活动批准门『启用端』」、§6.7「已注册的 kind」、§4.15「场景集说明」、§6.13/§6.14「三域 / 四处服务端对源」）；整段**无现况价值**的**唯一一处**（§4.1「`**2026-09-19 批次 97 改准**`」——三条全是「本批改了什么」）**整行删除**。

### 二、实测量

| 项 | 改前 | 改后 |
|---|---|---|
| 行 | 1924 | **1923** |
| 字符 | 144,055 | **137,793**（**−6,262 ≈ −4.3%**） |
| `批次 N` 沿革注记 | 140 处 | **0**（余 6 行「批次」均为**域内正当用法**：`毕业批次` ×1 · `批次里程碑` ×3 · 数据示例日期 ×1 · 代码注释引文 ×1） |
| `D-xxx` | 80 处 | **0** |
| 纯日期沿革 | 163 处 | **0**（余 2 处见上表「保留」栏） |

### 三、守卫边界（**动手前先探边界、动手后同批复跑**）

- `doc-line-ref` **R1–R6 全绿**；**引用计数改前改后一字未动**（`REFS 447` · `FILES 72` · `ANCHORED 81` · `短式 36` · `弱 366`）——因本批**未删任何 `文件:行号` 引用**、只删沿革注记 ⇒ R5 四条下限（`REFS≥370` · `FILES≥55` · `ANCHORED≥30` · 短式 `≥30`）与**弱引用上限 400** 均零风险。
- `doc-consistency` **S14 涉及 `README-server.md` 的 8 组锚点全保**（逐句核未动）：`§2.1` 标题（13 键 / 11 业务键 / 2 遗留键）＋ `§2` 导语「共 13 键」＋ `§2.1` 表体行数 · `§3.1` 标题「共 23 个静态页」· `§3.4`「左栏共 10 个分区」· `§3.5` 标题「共 14 个」与「只能是下列 14 个模块 id」＋ 表体行数 · `§4.15`「内置场景共 7 个」· `§6 数量口径`**整句**（显式 62 · `router.*` 64 · 循环 4 · `app.js` 2 · 资源名 29 · 循环展开 115 · `＝62 ＋ 115 ＝ 177`）· `§6.7`「已注册的 kind（共 23 种）」＋「`KINDS` 注册表，23 个键」＋「系统派生通知：23 种 kind」· `§7.3#25`「现与代码一致为 **34 张**」。
- 两守卫合跑 **22 / 22 · 0 红**（改前亦 22/22 ⇒ **改动未动任何判据面**）。

### 四、不动项（如实）

- **§4 字段清单去留未裁**（`D-749` 选项表逐字记「未裁 · 续批再议」）⇒ 本批只清其**沿革注记**，**字段表本体（表行 / 字段名 / 取值 / 计数）一字未动**（`§4.0` 的 332 / 39 / 76 / 447 与各表行数均原样）。
- **不新增指针**：本文既有指针（§8.1「权威源」表 ＋ 各节「依据」行）落点**已是 active 文件**（`content/**` 母本与 `docs/src/**`、`server/**` 代码）；`D-749` 要求「**最多留个把个**」⇒ 无须再增。§8.1 的 `.ctx/` 行**是免责声明**（明写「审计底座，本文未据其断言现状」）、**不是详情指针**，保留。
- **戳不变**（本批未动 `docs/**` / `server/**` 代码 ⇒ 无 bump，仍 `?v=20261003f`）。

### 五、收尾全量（`R-85`）

- **`npm test`：941 项 / 941 过 / 0 红 / 0 跳过**（起 3000 服务 → 跑完停服）。
- ⚠ **如实登记**：末条进程退出码 `1`，**非测试失败**（已打印 `pass 941 / fail 0`；系 Playwright `debug.log` 写入被沙箱拦截——同批次 331/334/343–353）。
- **本批全量 1 轮即绿**（改动只碰 `README-server.md` 一个文档 ＋ 两份 `.ctx` 台账；无代码 / 无守卫判据面变动）。
- 戳**不变**（`?v=20261003f`；本批未动 `docs/**` / `server/**`）。

---

## 批次 355（2026-10-03）：`#3`「页签太多」**减量结论落账**（`D-747`：接受 `H-25`「无一组可合并」）＋ 乙/丙部**已落盘快速清理**

承支书 2026-10-03 裁定（`D-747`：`#3` 减量取「**甲 接受 `H-25`『无一组可合并』结论**」）⇒ 本批＝执行（`R-84` 不另立 `D-` 条），**无代码改动、只动两份台账**。

### 一、`#3` 结论落账（三处同源）

| 落点 | 改前 → 改后 |
|---|---|
| `REVIEW_QUEUE` `H-25` 行 | 「🟡 **清单已出 · 待支书裁**」→「✅ **已裁（支书 2026-10-03 取「甲 接受」· `D-747`）**」；处置栏「待支书裁：①是否接受…②若仍要减 tab 须先立母本依据」→「**已裁**：**tab 兼并此路不通 · 页签数维持 72 · 不再为减法改母本**；减负只走「重排（`V-3`，批次 351）＋ 折叠下沉 ＋ 功能钮提顶栏（批次 317）」」 |
| `REVIEW_QUEUE` 代码健康节「本节规模」 | **已收 / 已裁 17 → 18 条**（并入 `H-25`）· **待支书定 5 → 4 条**（`H-5` / `H-10` / `H-11` / `H-13`） |
| `REVIEW_QUEUE` 乙部 `V-3` 节 | 新增一段「**✅ `#3` 减量结论已裁**」——照录支书原话 ＋ 三条减负手段 ＋ 边界「无代码改动（`tab` 数 72 为现状、非新增）」 |

### 二、乙/丙部「已落盘」快速清理（`H50.1 §3`：完成即删行）

| 账 | 条目 | 判据（可复核） |
|---|---|---|
| 乙部表（`CLAUDE.md`） | **删 `R-41` 行**（**7 → 6 行**） | 其「**筛选行禁 chip**」正题已由批次 319 按支书 `V-12` 裁定**推翻并改准判据**（`filter-row::S2/S6`），**「余下各页逐页迁移」由批次 332 收口**（`D-738`）⇒ **在办事由消失**。原全文在 `.ctx/logs/2026-09-EXECUTION_LOG.md` 迁出附节（`S15②` 的 `R-23`…`R-91` 并集**仍全覆盖**）。 |
| 丙部在办表（`CLAUDE.md`） | **删 `P.17` 行** | 该行自述「✅ 已办（批次 316）」⇒ 不该滞留在办表 |

**未动（如实）**：`P.14`（「已裁：暂不推」＝**持续状态**，不是待决）· `P.15` / `P.16`（其余项/并线批次另见台账，**未取到「已全部完成」的实证**）⇒ 本批**不代裁、不误删**。

### 三、守卫实跑

- `doc-consistency`（**`S15②` `CLAUDE.md` 的 `R-NN` 并集覆盖 `R-23`…`R-91` ＋ 在办表零「已闭环」注记** · `S14` 计数）· `timestamps-note-guard`（`N1`–`N7`）· `frontmatter-freshness` · `doc-line-ref` ⇒ **32 / 32 · 0 红**。

### 四、收尾全量（`R-85`）

- **`npm test`：941 项 / 941 过 / 0 红 / 0 跳过**（起 3000 服务 → 跑完停服）。
- ⚠ **如实登记**：末条进程退出码 `1`，**非测试失败**（已打印 `pass 941 / fail 0`；系 Playwright `debug.log` 写入被沙箱拦截——同批次 331/334/343–354）。
- **本批全量 1 轮即绿**（只动 `.ctx/REVIEW_QUEUE.md` 与 `CLAUDE.md` 两份台账）。
- 戳**不变**（`?v=20261003f`；未动 `docs/**` / `server/**`）。

---

## 批次 356（2026-10-03）：`TIMESTAMPS.md` 备注列**第七轮 —— 收敛（收 3 格）＋ 补登（3 行）＋ 预算下调**

承批次 353 登记（备注列 **47,480 / 预算 47,500** 顶格 ⇒ 批次 353 的两个新文件**无法补登表行**）⇒ 本批＝**AI 域收口**（无可待裁项，`R-89` 收敛路径）。

### 一、收敛（3 格 · `R-89`「沿革迁 `.ctx/logs/**` ＋ 原位留一句指针」）

| 路径 | 改前备注字数 | 说明 |
|---|---|---|
| `docs/src/components/record/inspector.js` | **906** | 六段沿革（批次 205–207 色彩/字号清理 · 129 议程行 · 132 品牌三态 · 135 追加复盘判据 · 151 待批分流 ＋ 行号同步 · 312 表态通行证） |
| `docs/src/entries/pages/settings-entry.js` | **855** | 六段沿革（批次 132 补登 · 138 左栏颗粒度 · 184 设置项单一源重做 · 205–207 徽标处置 · 211–212 域卡控件 · 225 色彩清理） |
| `docs/src/services/activity/activity.js` | **796** | 四段沿革（批次 132 品牌认定段 · 135 追加复盘段 · 137 「勾掉即关闭」写口 · 151 活动批准门·支委会档段） |

**沿革全文整段逐字迁入**本文件「**附：TIMESTAMPS 备注列迁出的逐批沿革（批次 356）**」（见下节），原位换一行短注 ＋ 指针。

### 二、补登（3 行 · 批次 353 的覆盖缺口）

`docs/messages.html` · `docs/src/entries/pages/messages-entry.js` · `docs/src/entries/tabs/secretary/notification-tab.js`（备注均取**最短形**，守 `N2` 预算）。

### 三、预算同批下调（只降不升）

- 实测：**47,480（282 行）→ 45,549（285 行）**（收敛 −1,931 · 补登 + 净 ≈0）。
- `NOTE_TOTAL_BUDGET` **47,500 → 45,900**（留 ≈350 字供「改了必须刷卡」的短注）。
- `WITH_BATCH_MENTION_BASELINE` **23 → 20 条**（3 格「批次 N」罗列随沿革迁出而 ≤ 3 次，`N6` 实测 20 条）。

### 四、守卫实跑

- `timestamps-note-guard`（`N1`–`N7`）＋ `doc-consistency`（`S13` 表行日期 ↔ frontmatter · `S14` 计数）＋ `frontmatter-freshness`（`F1`–`F3`）⇒ **26 / 26 · 0 红**。

### 五、收尾全量（`R-85`）

- **`npm test`：941 项 / 941 过 / 0 红 / 0 跳过**（起 3000 服务 → 跑完停服）。
- ⚠ **如实登记**：末条进程退出码 `1`，**非测试失败**（已打印 `pass 941 / fail 0`；系 Playwright `debug.log` 写入被沙箱拦截——同批次 331/334/343–355）。
- **本批全量 1 轮即绿**。

### 六、如实登记

- 本批只动**台账**（`.ctx/TIMESTAMPS.md` · `.ctx/REVIEW_QUEUE.md` · 本日志）＋ **守卫基线**（`server/test/timestamps-note-baseline.mjs`），**未动 `docs/**` / `server/**` 业务代码** ⇒ 戳**不变**（`?v=20261003f`）。
- 收敛**只做 3 格**（N6 清单 20 条、N4 72 条、N5 14 条仍存）——本批以「腾出补登预算」为目标，**不一次清空**（余量另批）。

## 附：TIMESTAMPS 备注列迁出的逐批沿革（批次 356）

> 本批（2026-10-03 批次 356）把 `.ctx/TIMESTAMPS.md` 中 **3 格长备注**的逐批沿革**整段逐字迁出**于此，原位换一行短注（**收敛路径**见 `server/test/timestamps-note-guard.test.mjs`）。判据：`timestamps-note-guard::N2`（预算只降不升）＋ `N6`（单格「批次 N」罗列 > 3 次）⇒ 本批 3 格一并从 `WITH_BATCH_MENTION_BASELINE` 撤下（23 → 20 条）。

| docs/src/components/record/inspector.js | 2026-10-03 | — | [工程师]+[AI] | **（2026-09-26 批次 205–207：hex 4 处清 ＋ 控件 11px 3 处（`:736`/`:753`/`:754`）→ `text-[13px]`；收基线 `c` 23→19）** 检查器组件（产出物区/分类型关闭条件；2026-09-21 批次 129 议程行新增「报送党员大会表决」勾选位与「已定：报送党员大会表决」显示，随行位移台账 4 条行号同步；**批次 132：品牌认定按钮改「提案 / 撤回 / 取消认定」三态**〔取消「点一下即认定」〕＋ 议程项加「品牌认定：目标活动」徽标，随行位移台账 4 条行号再同步，`D-559`；**2026-09-21 批次 135：关闭判据新增一行「追加复盘（支委会要求）尚未交回」**——只判到「交回」不到「确认」、三会一课不适用（判据单一源＝`services/activity/activity.js`）；**本文件净行数 0**（+1 行判断、合并 1 行注释）⇒ `README-server.md` 的 `:616` 两处引用与 `form-loop-registry` 4 条行号**未位移**，`D-562`）；**2026-09-22 批次 151：待批块按档位分流（支书档＝批准 / 不批准；支委会档＝提请支委会表决）＋ 新增 `inspector-committee-vote-btn` 动作**——本批在该文件中段插行 ⇒ `form-loop-registry` 三条行号同步（`活动名称` / `日期` / `活动地点` 1320/1321/1322 → **1347/1348/1349**），`D-592`）；**2026-09-30 批次 312：表态面板的通行证由「角色」收回「本场应到名单」（`isVoterOf`，角色无关）**——批次 304 只改了「表态位是否挂」，**面板动作门与填充循环仍留 `isCommittee`** ⇒ 应到名单内的普通党员在支书台只挂得出空槽；本批一并改 `canVote`（净 +5 行 ⇒ `README-server.md` 4 处行号同批改签，`D-728`） |
| docs/src/entries/pages/settings-entry.js | 2026-09-29 | — | [工程师]+[AI] | **（2026-09-28 批次 225：存量色彩清理——`var(--tok, <硬编码>)` → `var(--tok)`〔该令牌已在 `:root`/`html.theme-dark` 有正式默认值、逐字等值 ⇒ 观感零变化；基线 c 13→6，含 1 处历史漂移改准〕；`D-674`）** **（2026-09-27 批次 211–212：路二——域卡新增可调控件（纪检卡 9 / 组织卡 2，体例逐字照抄既有 `data-pol-*`；**不另立卡**）；「支部制度参数」只读卡文案改准（放行程序三步 ＋ 时限 / 篇幅 / 补课范围「现已可调，去哪改」深链）＋ 卡头加「制度默认 · 只读」徽标）** **（2026-09-26 批次 205–207：3 枚同形徽标逐条处置——「支部信息与向导」删净（＋删两个局部变量）/「配置变更记录 · 审计」保留并说明/「活动批准门」改动态角色；真机实测「副支书 · 本支部可调」、`pageerror` 0）** 设置页入口（**2026-09-21 批次 132 补登**——本表原先无此行；本批「支部制度参数」卡新增「**不考勤的会议类型**」一行并改准记录人标签尾注，`D-558`；**2026-09-21 批次 138 左栏设计对齐最新颗粒度**——「支部制度参数」分区说明（`SECTION_META.desc`）补齐为「票决门槛 / 应到名单核对 / 会议考勤类型与不考勤的会议类型 / 考勤记录人 / 请假缺席标因」，卡内提示由「支部制度可调参数：暂无」改准为「制度里已登记的支部可调项（时限类 / 思想汇报字数 / 补课范围）不在本页直改，本页可调的只有各域职责参数」）；**2026-09-25 批次 184**：随 `settings.html` 整体重做，设置项渲染改走**全站单一源**（该页私有类 **50 → 7**、页面级 `<style>` 归零；样式并回 `docs/src/styles.css`），`D-647`） |
| docs/src/services/activity/activity.js | 2026-09-21 | — | [工程师]+[AI] | 活动服务（**2026-09-21 批次 132：新增「品牌认定」段**——提案 / 撤回 / 取消认定 ＋ 纯函数 `applyBrandDesignationResult` ＋ 落库 `commitBrandDesignationResult`，`D-559`；**2026-09-21 批次 135：新增「追加复盘要求」段**——`REVIEW_REQUEST_ROLES` / `canRequestReview` / `reviewRequestOf` / `isReviewReturned`（**只判到交回**）/ `isReviewRequestEligibleActivity`（**三会一课不适用**）/ `requestOrganizerReview` / `withdrawReviewRequest`，**判据与写口单一源**，`D-562`；**2026-09-21 批次 137：「勾掉即关闭」写口 `completeMyProjectTask` 追加在文件末尾**——只认本人按项目内身份持的那步（复用 `listMyProjectTasks` 单一源），**中段零位移 ⇒ `README-server.md` 的 `:234-245` / `:389-399` 等引用不漂移**，`D-566`）；**2026-09-22 批次 151：文件末尾新增「活动批准门·支委会档」段**（`ACTIVITY_APPROVAL_AGENDA_KIND` / `activityApprovalVoteOf` / `openCommitteeVoteForActivity` / `applyActivityApprovalResult` / `commitActivityApprovalResult`；**置于文件末尾 ⇒ 上文行号零位移**），`D-592`） |

---

## 批次 357（2026-10-03）：支书就**三条待裁命题**圈定 —— **裁定落账**（`D-750` / `D-751` / `D-752`，无新实现）

通过 `AskUserQuestion` 逐点请示（`H50.2` 审议交付机制），支书 2026-10-03 逐条圈定 ⇒ 裁定进决策日志，实现排后批。

| 命题 | 支书取向 | 落账条目 |
|---|---|---|
| `CRUD-2` `assignments` 补界面入口的**落点** | 给的是**术语 ＋ 归属口径**（逐字）：「分工 分为 常备性分工 和项目分工。前者是我自造的词，**请不要用**，我觉得**最重要的考察都是 项目分工**，也就是**事上见**！所谓的**支部分工** 那个是 对于**分管工作**的分工，写得比较大！！」 | `D-750` |
| `CRUD-6` C 档 2 张（`signups` · `propTasks`） | **补「作废（软）」** | `D-751` |
| README-server `§4`（931 行 ≈ 48%） | **改「指针 ＋ 后端增量」** | `D-752` |

**逐条要点（详见各 `D-` 节）**：

1. **`D-750`**——**术语禁令**：`常备性分工`**任何地方不得使用**（支书自造、明确不用）；**两分**：**支部分工**＝分管工作（**粗**）/ **项目分工**＝**事上见**（**细 · 最重要的考察面**）；**落点**：`assignments` 入口落**项目分工面**（按活动 / 专班呈现），**不并入「支部分工 / 工作地图」**。**实测**：全仓（`README-server.md` / `docs/**` / `content/**`）检索「常备性分工」**0 命中** ⇒ 落地时只需确保不回写。
2. **`D-751`**——`signups` · `propTasks` **各补一条「作废（软）」**，口径**完全沿用 `CRUD-4`**（原因必填 → 支委直接作废 / 其余人报支委会 → 读侧出列 ＋ 留痕可回查）；**不补硬删、不补手建**（`propTasks` 手建属另议）。
3. **`D-752`**——§4 **不再逐条复刻**母本字段表，只留**后端对接必需的约束** ＋ **来源 C 增量**，字段清单**指向** `content/04_web_design/data/DATA_MODEL.md`；**代价如实**＝打破一站式定位（`§1` 导语与 `§8.2` 自我约束须同批改）；**实现前先探边界**（`doc-line-ref::R5` 下限现状 `REFS 447` ＋ `S14` 8 组锚点）。

**台账同批改准**：`2026-10-DECISION_LOG.md` 文首「条目编号起止」**`D-729`…`D-752` · 共 24 条 · 下一条自 `D-753`** · 本月目录加 3 行 · 文末「续编说明」；`.ctx/logs/DECISION_LOG.md` 月度索引 2026-10 行 **21 条（D-729~D-749）→ 24 条（D-729~D-752）**；`REVIEW_QUEUE` 的 CRUD 节（`CRUD-2` / `CRUD-6` 改「已裁 · 待实现」＋ 标题改「余 2 条已裁待实现」）与 `#8` 节（§4 改「已裁 · 待实现」）。

**守卫实跑**：`doc-consistency`（`S14` ⑥ 四处同源 ＋ ⑥-2 各月×索引交叉核对 · `S13` 台账 · `S15`）＋ `timestamps-note-guard`（`N1`–`N7`）＋ `frontmatter-freshness`（`F1`–`F3`）⇒ **32 / 32 · 0 红**。

**本批只落账、未改任何 `docs/**` / `server/**` 代码 ⇒ 未 bump `?v=`**（仍 `20261003f`）。

---

## 批次 358（2026-10-03）：`D-751` **实现** —— `signups` · `propTasks` 两张补「作废（软）」⇒ **`CRUD-6` 闭环**

承支书 2026-10-03 裁定（`D-751`：`CRUD-6` C 档 2 张取「**补「作废（软）」**」）⇒ 本批＝执行（`R-84` 不另立 `D-` 条），**口径完全沿用 `CRUD-4` 的既有机制，不新造第二套**。

### 一、落地（作废键落点 ＋ 读侧出列点）

| 张 | 作废键落点（**记录产生地 / 管理面**） | 读侧出列点 |
|---|---|---|
| `propTasks` | 宣传台「宣传任务」卡行内（`entries/tabs/prop/tasks-tab.js`，与「接收 / 提交」同排） | 该 tab 新增读口 `_activePropTasks()`（分组计数 ＋ CSV 导出**同源**）；**写路径**（seed 兜底 / 状态推进）仍用原始数组 |
| `signups` | 活动详情页与专班详情页**共用组件** `components/governance/signup-panel.js` 的「**已通过名单**」行内（**待审核行已有「通过 / 拒绝」⇒ 不另加键**） | `services/activity/signup.js::getAll()` 过滤 `voided`（**纯读口**——写口 `apply`/`review`/`cancel`/`deleteBySource` 一律走 `this._signups`，不经它）＋ `today-summary.js` 的「是否算参与」判定同口径 |

- **弹窗单一源**＝`components/ui/void-record.js::openVoidModal`（「原因必填」那句校验**全站只此一处**）；支委层直接作废、其余人报支委会（落支书台「待办 → 待作废待确认」组）。
- `signups` 的作废键**按管理面显隐**——`resolveSignupReviewer(...)===本人` **或** 支委层（`BRANCH_COMMISSION_ROLES`）：已通过名单面本身对全员可见，故不把键发给无关读者（**实测**：以支书登录活动详情页 2 枚、专班详情页 1 枚）。
- `soft-void.js::SOFT_VOID_RESOURCES`：**6 张 → 8 张**。

### 二、★ 本批抓到并补齐**同型缺口（第 3、4 例）**：`MockAdapter` 缺 `signups` / `propTasks` 两域

**实读教训**：这两张此前**只有 `mockDB` 域与持久化列表**、**没有适配器域** ⇒ `getAdapter().signups` 为 `undefined` ⇒ 统一写口一调就抛
`Cannot read properties of undefined (reading 'update')`（**同批次 352 的 `weeklyReports`、批次 352b 的 `externalDispatches`**）。本批**先实跑后修**，按四件套补两域（`list`/`create`/`update`，id 前缀 `su` / `ppt`）；`soft-void.test.mjs::V7`（登记表 × 适配器完备性）**现自动覆盖 8 张**。

### 三、真机取证（一次性探针 · 跑完即删 · `createApp({dbPath:':memory:'})` ＋ `seedDatabase` ⇒ **不碰真库、无需复原** · `pageErrors` **0**）

| 面 | 取证（逐条实测） |
|---|---|
| 宣传任务（宣传委员 2400012356） | 作废键 **8 枚** → 点开弹窗 → **空原因**⇒ toast「请填写作废原因（必填）」且**弹窗仍在** ✓ → 填原因确认 ⇒ 作废键 **8 → 7** ✓ · 服务端 `prop_tasks` 该行 `voided.reason` 命中（`pt1`）✓ |
| 活动详情页（支书 2300010001 · `act-30`） | 「已通过名单」作废键 **2 枚** → 空原因拦截 ✓ → 确认 ⇒ **2 → 1** ✓ · 服务端 `signups` 该行 `voided.reason` 命中（`su-006`）✓ |
| 专班详情页（同组件 · `tf-005`） | 作废键 **1 枚**（`su-001`）✓（证明**同一组件两源同码**） |
| 复核 | `signups` 带 `voided` 的 **1 行** · `prop_tasks` 带 `voided` 的 **1 行** ⇒ **软作废落库、行数守恒** ✓ |

### 四、守卫实跑

- `soft-void`（`V1`–`V7`，含 **V7 现覆盖 8 张**）＋ `mock-api-parity`（`P1`–`P3`）＋ `button-system-guard`（`B4`：新键走 `btn-ghost` 族）＋ `import-path-guard`（`G1`–`G3`）＋ `validation-site-coverage`（候选 114 / 未登记 4 ＝ 基线）⇒ **18 / 18 · 0 红**。
- `test:fast` 全套（含 `write-path-guard` `W1`–`W4`）⇒ **144 / 144 · 0 红**。
- `module-load`（`E1` 全模块可加载 ＋ `E2` 受检页装配）＋ `copy-master-guard` / `copy-length-guard` / `copy-fold-guard` / `dead-selector-guard` / `small-text-guard` / `text-tier-guard` ⇒ **27 / 27 · 0 红**。
- `doc-consistency` ＋ `doc-line-ref` ＋ `version-stamp` ＋ `link-integrity` ＋ `link-target-guard` ＋ `catalog-sync` ⇒ **52 / 52 · 0 红**。
- `form-loop-sweep`（真机全量台账，含 `S0` 规模不缩水 ＋ **`S6` 台账行号必须真落在该文案那一行**）⇒ **85 / 85 · 0 红**。
- `timestamps-note-guard`（`N1`–`N7`）＋ `doc-consistency` ＋ `frontmatter-freshness` ⇒ **26 / 26 · 0 红**。

### 五、收尾全量（`R-85`）

- **`npm test`：941 项 / 941 过 / 0 红 / 0 跳过**（起 3000 服务 → 跑完停服）。
- ⚠ **如实登记**：末条进程退出码 `1`，**非测试失败**（已打印 `pass 941 / fail 0`；系 Playwright `debug.log`（本次另含 `C:\WINDOWS\FONTS\ARIAL.TTF`）写入被沙箱拦截——同批次 331/334/343–357）。
- **本批全量 1 轮即绿**（用例数不变 941：本批**未新增常驻真机流 / 未新增校验点**）。

### 六、如实登记

- **改判签一处（非本批引入、因本批而位移）**：`README-server.md §4.40` 依据行 `prop/tasks-tab.js:12,22-29,92` → **`:15,32-44,86-88`**（本批在该文件顶部插了 3 行 import ＋ 5 行读口，行号整体下移；**该引用无锚点 ⇒ `doc-line-ref` 机检查不到位移**，按纪律**人工改准**）。**顺带复核**：`§4.39` 的 `signup.js:4-8,73-86` 因插入点在其后 ⇒ **未位移、一字未改**。
- **`TIMESTAMPS.md`**：本批动过的 6 个文件——**3 个原有表行刷日期**（`mock-adapter.js` / `prop/tasks-tab.js` / `soft-void.js`）＋ **3 个原先无表行的补登**（`activity/signup.js` / `governance/today-summary.js` / `governance/signup-panel.js`，**最短形备注**）；备注列 **45,549 → 45,645**（预算 45,900，**只降不升**未破）。
- **未新增常驻真机流**：沿用本族既有做法（批次 346 的 `disc-makeup-void-reason` 是唯一常驻件，批次 352 / 352b 的另三张亦只做一次性探针 ＋ `V6`/`V7` 定向件）⇒ 本批两张同样**探针 ＋ V7**，**不假装**「每张都有常驻真机守卫」。
- **未动**：`hasApplied`（已作废的报名**仍**挡住重复报名——语义未裁，**不代裁**）· 报名总表（人×专班**矩阵**无行级动作槽 ⇒ 落点改「记录产生地」＝两个详情页；如实登记该偏离）。
- 戳：**`20261003f → 20261003g`**（全站 220 JS / 23 HTML / 2 CSS / 92 server-test 已刷，陈旧戳自检 0 残留）。

---

## 批次 359（2026-10-03）：`D-750` **续答落地** —— 活动详情页新增「**工作分工**」块（`assignments` **全 CRUD**）＋ `D-753` **落账**（测试套件 ≤10 分钟 · 待实现）

### 一、裁定

- **`D-750` 续答**（支书逐字）：「**活动详情页新增一块（推荐）**」＋「**我认为 全CRUD！**」⇒ 落点＝**活动详情页**；程度＝**增 / 改 / 删 ＋ 列表**（不是只读）；术语禁令不变（`常备性分工` 禁用）。
- **`D-753` 新立**（支书逐字）：「辛苦你花一点时间 **精简一下我们的test，每一次的时间都太长了，控制到10分钟以内！！择其精要！**」⇒ 全量 `npm test` 墙钟 **≈23 分钟 → ≤10 分钟**。**本批只落账**（含四处同源计数改准），**实现另批**。

### 二、落地（`assignments` 全 CRUD · 落点＝活动详情页新增一块）

| 件 | 内容 |
|---|---|
| **新服务** | `docs/src/services/activity/work-assignment.js`（**统一读写口**）：`canManageWorkAssignments`（判据单一源＝`isActivityOrganizerIn` ∪ `BRANCH_COMMISSION_ROLES`；**呈现与放行共用**）· `listWorkAssignments` · `createWorkAssignment`（**C**）· `updateWorkAssignment`（**U**，**只收白名单字段**、工作名不得改成空、`completedAt` 随状态位落）· `removeWorkAssignment`（**D**，**真删**——本表是「排错了就该删」的**安排性记录**，与另一族「作废（软）」无关）；写口形态同 `soft-void.js`（adapter → `mockDB` → `persist()`，**不假设适配器返回形状**） |
| **活动详情页** | `docs/src/entries/pages/activity-entry.js`：在「参与人员」**之后**新增宿主 `#work-assignments-host` **一整块**（**不新开页面 / 不新开一级入口**）——列表（工作名 / 负责人 · 截止 · 说明 / 状态）＋ 行内「开工 / 完成 · 编辑 · 删除」＋「新增分工」表单；**块内局部重渲染**（编辑态 `_waEditing` 一变只重画本块） |
| **可见性** | 列表**全员可见**；**管理键按「本场组织者 ∪ 支委层」显隐**（非管理者看不到任何增 / 改 / 删键） |
| **⚠ 不是同一份数据** | 本块＝服务端表 `assignments`（**一件件具体工作**，`README-server.md §4.7`）；页面上方「参与人员」＝**活动内联的 `activity.assignments`**（**项目角色数组**，`§4.1`）——两处**并列呈现、互不改写** |

### 三、★ 补两适配器缺口：`assignments` 缺 `update` / `delete`

**实读教训（第 5、6 例）**：`MockAdapter` 与 `ApiAdapter` 的 `assignments` 域**此前只有 `list` / `create`** ⇒ 「全 CRUD」一调就抛（同批次 352 `weeklyReports`、352b `externalDispatches`、358 `signups` / `propTasks`）。本批按四件套补齐两域的 `update` / `delete`（Mock 侧走 `mockDB` ＋ `_saveToStorage`；Api 侧走既有 `_patch` / `_delete` 打**服务端本就有的**通用资源 CRUD ⇒ **服务端零改动**）。

### 四、真机取证（一次性探针 · 跑完即删 · `createApp({dbPath:':memory:'})` ＋ `seedDatabase` ⇒ **不碰真库**）

| 面 | 取证（逐条实测） |
|---|---|
| 块在位（支书 `2300010001` · `act-30`） | `#work-assignments-host` 在位 ✓ · 初始 **0 行** · 「新增分工」键 **1 枚** ✓ |
| **C** | 空工作名 ⇒ toast「请填写工作名称」且**表单仍在** ✓ → 填名 ＋ 选负责人 ＋ 填截止 ⇒ **0 → 1 行** ✓ · 服务端命中 `asgn_…` / `status=pending` / `ddl=2026-10-20` ✓ |
| **U** | 改名 ⇒ 服务端 `workName` 随之改准 ✓ · 「开工 / 完成」连点两次 ⇒ `completed` 且 **`completedAt` 落** ✓ |
| **D** | 点删除（二次确认）⇒ **1 → 0 行** ✓ · 服务端已无该行 ✓ |
| **反向** | 普通成员 `2400012349`：块**可见** ✓ · 管理键 **0 枚** ✓（只读态） |
| 全程 | `pageErrors` **0** |

### 五、★★ 如实登记：一处**自伤缺陷**——模板字面量里的反引号（**静态守卫抓不到**）

- **经过**：首次真机探针 `#work-assignments-host` 恒缺；`pageerror` 报 `Unexpected identifier 'assignments'`。
- **根因**：在**模板字面量内**的 HTML 注释里写了反引号包住的 `assignments` ⇒ **反引号提前终止模板字面量**，其后 `assignments` 成了裸标识符 ⇒ **整个 `activity-entry.js` 解析失败**（整页不渲染）。
- **★ 为什么守卫没拦住**：`module-load::E1` 的 `collectJsFiles` **明写跳过 `entries/`**（页面入口不在静态装配面；`E2` 只核「该页入口被 import」、不核「它能跑」）⇒ **一次真机探针才逮到**。（同族已知：批次 262 的模板字面量动态 import 路径少一个 `../` 也只有真机才逮到 ⇒ 再次证明「入口层必须有真机面」。）
- **修法**：注释内反引号改为直书（`服务端表 assignments`）。**修后真机全绿**。
- ⚠ **本批未新增守卫**（补一个「模板字面量内反引号」静态检查属新增守卫、且与 `D-753`「压时长」相左）⇒ **只登记**。

### 五之补、★ 收尾全量**首跑 1 红**：`filter-row::S9`「选人载体」——**负责人不得用自建 `<select>` 罗列人名**

- **红**：S9「select 列人名只允许 §4.13 登记的**四处例外**；新代码请改用 `PersonPicker`（选名单成员）或先登记例外」。
- **我的错**：初版把「负责人」做成自建 `<select>`（成员名 `<option>`）⇒ 撞上 S9（该守卫明写「**禁新代码再长出第 5 处**」）。
- **修法（取守卫指的路，不登记第 5 处例外）**：改用**选人载体单一源** `components/governance/pickers.js::PersonPicker`（`mode:'single'` ＋ `initialIds` 预选现有负责人；读值走 `getSelected()[0]`）；表单里原 `<select>` 位置换 `.wa-assignee-host` 宿主。
- **复验**：`filter-row::S9` 绿；**重跑真机探针** ⇒ 「负责人载体＝PersonPicker（非下拉）✓」· 新增落库 `assignee=p1` ✓ · **编辑态预选生效**（改名后 `assignee` 仍为 `p1`，未丢）✓ · 其余四段与反向全绿 · `pageErrors` 0；`SITES` 台账行号随插行 **677 → 693** 同批改准。

### 六、守卫实跑

- `validation-site-coverage`（`V1` **候选 114 → 115 · 未登记 4 ＝ 基线**）＋ `module-load`（`E1`/`E2`）＋ `import-path-guard`（`G1`–`G3`）＋ `button-system-guard`（`B4`：新键走 `btn-tab` / `btn-accent` / `btn-outline` / `btn-ghost` 四族）＋ `dead-selector-guard` / `small-text-guard` / `text-tier-guard` / `doc-consistency` / `hex-hardcode-guard` / `style-baseline` ⇒ **43 / 43 · 0 红**。
- `form-loop-sweep`（`S0` 规模不缩水 · `S2` `machine:true` 全覆盖 · `S4` 出处文案在 · **`S6` 台账行号精确命中**）⇒ **85 / 85 · 0 红**。
- `timestamps-note-guard`（`N1`–`N7`）＋ `doc-consistency` ⇒ **23 / 23 · 0 红**。

### 七、台账（同批改准）

- `form-loop-registry.mjs`：**新登记 1 处**校验点（`activity-entry.js:677`「请填写工作名称」）⇒ `SITES_BASELINE` **115 → 116**；该点标 **`machine:false` ＋ 写明理由**（**本批不为新校验点新增慢件**——`D-753` 正令压时长）。
- 根 `README.md`：台账段 **`共 115 处校验点` → `116`** · **`machine:false` 13 → 14 条**。
- `.ctx/TIMESTAMPS.md`：**补登 1 行**（新文件 `activity/work-assignment.js`）＋ **3 行刷日期**（`activity-entry.js` / `api-adapter.js` / `mock-adapter.js`）⇒ 备注列 **45,645 → 45,684**（预算 45,900 未破）。
- `2026-10-DECISION_LOG.md`：`D-750` **加「续答」**节（落点＋全 CRUD）· **新立 `D-753`**（测试套件 ≤10 分钟）＋ 四处同源计数 **24 → 25 条**（`D-729`…`D-753`，下一条自 `D-754`）· 本月目录 ＋ 文末「续编说明」· `.ctx/logs/DECISION_LOG.md` 月度索引 2026-10 行 **24 → 25 条**。
- 戳：**`20261003g → 20261003h`**（221 JS / 23 HTML / 2 CSS / 92 server-test，陈旧戳自检 0 残留）。

### 八、收尾全量（`R-85`）

- **首跑 940 / 941 · 1 红** ⇒ 如「五之补」所述，红＝`filter-row::S9`（选人载体）**真回归**（我自建 `<select>` 罗列人名）⇒ **改走 `PersonPicker` 后复跑**。
- **复跑：941 项 / 941 过 / 0 红 / 0 跳过**（起 3000 服务 → 跑完停服）；**墙钟 ≈22.9 分钟**（两次实测：首跑 **1391 s** · 复跑 **1374 s**）——**该值即 `D-753`「测试套件压到 ≤10 分钟」的「改前」基线**（已记入 `D-753` 背景）。
- ⚠ **如实登记**：末条进程退出码 `1`，**非测试失败**（已打印 `pass 941 / fail 0`；系 Playwright `debug.log` 写入被沙箱拦截——同批次 331/334/343–358）。
- **用例数不变 941**（本批未新增常驻真机流）。



## 批次 360（2026-10-03，`D-753` **实现**：测试套件压到 ≤10 分钟 ＝ **分片轮跑**）

**任务**：承支书 2026-10-03「**精简一下我们的test，每一次的时间都太长了，控制到10分钟以内！！择其精要！**」（`D-753`）⇒ 本批＝执行（`R-84` 不另立 `D-` 条，`D-753` 加「续答」）。**路径＝分片轮跑**（支书对此定向征询两次跳过 ⇒ AI 按「择其精要」自决，已在 `D-753` 续答声明「可回退」）。

### 一、改前基线（本批先实测，不猜）

- 全量 **941 项 / 墙钟 1374 s（≈22.9 分钟）**。分族：**真机普查 14 件 221.7 s** · **form-loop 阶段一 60 件 389.6 s** · **阶段二 17 件 148.4 s** · 其余 850 件 502.3 s（其中 **57 件 ≥3 s 的散件 e2e 占 404.7 s**；**<0.5 s 的 743 件仅 29 s**）。
- ⇒ **纯「等价合并」到不了 10 分钟**（≥5 s 的 **112 件 ＝ 1042.7 s ＝ 83%**，同型循环省不下主体）；**并行已被 2026-08 实测否决**（浏览器回归争抢资源、失败项漂移）。

### 二、落成（新增 3 件 ＋ 改 2 件）

- **新建 `server/test/sweep-shard.mjs`（分片单源）**：`SHARD_COUNT=4` · `SHARD_PAGES`（1 secretary / 2 org+prop / 3 disc+leader / 4 visitor+party-committee）· `SHARD_E2E_FILES`（本片其它 e2e 文件）· `ALWAYS_E2E=[form-loop-sweep.test.mjs]` · `discoverTestFiles`（按 `from 'playwright'` 分 e2e / 非 e2e，与 `node --test` 发现规则同形）· `parseShard`（`1..4` | `all`，缺省 `1`，非法值显式抛错）。
- **新建 `server/run-suite.mjs`（启动器）**：非 e2e **每片全跑** ＋ 本片 e2e（`ALWAYS_E2E` ＋ 本片登记）→ `spawn(node --test --test-concurrency=1 …)`，注入 `FORM_LOOP_PAGES`，透传退出码，头注打印「分片档 k/4 · 工作台 · 本片 e2e k/34 · 未跑件数」。
- **新建 `server/test/suite-shard.test.mjs`（防漏网，`G1`–`G4`）**：`G1` 片池并集 **≡ 磁盘全部 e2e（双向）** · `G2` 片内文件存在且确为 e2e · `G3` 无重叠 · `G4` 片数 ≥2 / 每片非空 / `SHARD_PAGES` 值域 ≡ 真机 `flow.page` 出现过的页名（与 `form-loop-sweep::S7` 两处同拦）。**实测 4/4 绿**。
- **改 `server/test/form-loop-sweep.test.mjs`**：新增 `FORM_LOOP_PAGES`（按 `flow.page` 过滤，与既有 `FORM_LOOP_TABS` 叠加）＋ `S7` 同批扩展（**页名写错 ⇒ 一条 flow 都没命中 ⇒ 红灯**，防「分片把真机用例静默归零」）。
- **改 `server/package.json`**：`test`＝分片（`node run-suite.mjs`）· `test:full`／`test:precommit`＝`SWEEP_SHARD=all` · `test:daily` 补入 `suite-shard.test.mjs`。

### 三、判据面（一条用例未删）

- **只改「这一次跑哪些」**，未删任何用例 / 未动任何断言（`H30` 明禁静默摘除守卫）。
- **非 e2e 每片全跑**（快判据一片不漏）；**e2e 四片并集 ≡ 全量**（`suite-shard::G1` 双向机检）。

### 四、改后实测（四片 · 各起 3000 服务 · 跑完停服）

| 片 | 工作台 | 项数 | 结果 | 墙钟 |
|---|---|---|---|---|
| 1/4 | secretary | 773 | 773 过 / 0 红 | **510 s（8.5 min）** |
| 2/4 | org · prop | 780 | 780 过 / 0 红 | **503 s（8.4 min）** |
| 3/4 | disc · leader | 806 | 806 过 / 0 红 | **471.7 s（7.9 min）** |
| 4/4 | visitor · party-committee | 782 | 782 过 / 0 红 | **425.2 s（7.1 min）** |

⇒ **每片 ≤10 分钟 ✅**（改前 1374 s）。⚠ **末条 `exit=1` 系 Playwright `debug.log` 被沙箱拦截、非测试失败**（四片皆然，同批次 331/334/343–359）。

### 五、代价（如实）

- 单次默认**不覆盖全部 e2e** ⇒ 某批若破坏**别片**的 e2e，本批可能绿、轮转到那一片才红。缓解两条：**① 按改动面选片**（改到某台 / 某线必须选覆盖它的片）· **② `npm run test:full` 在发布前 / 大批改动跑**。
- 四片合计 ≈32 分钟 > 改前 23 分钟（**分片换的是「单次时长」，不是「总时长」**）。

### 六、台账同批改准

- `CLAUDE.md`：**无 `R-85` 正文**（2026-09-30 批次 307 已迁出）⇒ 改准落**迁出全文**（`.ctx/logs/2026-09-EXECUTION_LOG.md` 的 `R-85` 行加「2026-10-03 批次 360 改准」句）。
- 根 `README.md` `### 测试`：补分片说明（单源 / 启动器 / `SWEEP_SHARD` / `test:full`）＋ 测试节奏改写 ＋ 新增「测试机制守卫 `suite-shard`」一条。
- `server/README.md` 测试说明：「分片跑（默认）」＋「全量跑」两条拆开 · 提交前口径改「按改动面选片」 · 新增 `FORM_LOOP_PAGES` 段 · 耗时台账加「分片档」行、全量行改 **941 项 / ≈23 分钟** · 「已知既有红」块改准（**两处均已消除**，`H-13` 批次 274 / `H-15` 批次 262）。
- `.ctx/TIMESTAMPS.md`：补登 2 行（`server/run-suite.mjs` · `server/test/sweep-shard.mjs`）＋ `server/package.json` 行改准（脚本现况）。
- ⚠ **未补** `content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md §0.2` 索引（`content/**` ＝支书批改层 ⇒ 需特批；同批次 262/263 先例）——`suite-shard.test.mjs` 现只在根 `README.md` 与 `test:daily` 可见。

### 七、戳

- **不变**（`?v=20261003h`）——本批**未动 `docs/src/**`**（只动 `server/test/**` / `server/package.json` / 台账）。

### 八、收尾（`R-85` 改准后）

- **按改准后的口径**：收尾＝**跑覆盖本批改动面的片**——本批改动面在 `server/test/**`（非 e2e）⇒ **四片皆全跑非 e2e**，故四片**全部实跑**（即「四片轮跑 ＝ 一次全量覆盖」，且逐片给时长）。**四片全绿 / 每片 ≤10 分钟**（见四）。
- **文档改准后复跑（收尾片）**：`$env:SWEEP_SHARD='1'; npm test` ⇒ **773 项 / 773 过 / 0 红 / 墙钟 494.1 s（8.2 分钟）**✅（非 e2e 全跑 ＝ 本批改动面；末条 `exit=1` 同上）。
- **守卫定向实跑（57 项）**：`doc-consistency`（`S1`–`S16`）· `timestamps-note-guard`（`N1`–`N7`）· `frontmatter-freshness`（`F1`–`F3`）· `doc-line-ref`（`R1`–`R6`）· `version-stamp`（`S1`–`S7` ＋ `D1`–`D11`）· `catalog-sync`（`T1`–`T5`）· `suite-shard`（`G1`–`G4`）⇒ **59/59 · 0 红**。


## 批次 361（2026-10-03，`D-752` **实现**：README-server `§4` 改「**指针 ＋ 后端增量**」）

**任务**：承支书 2026-10-03 裁定（`D-752`：取「**乙 改「指针 ＋ 后端增量」**」）⇒ 本批＝执行（`R-84` 不另立 `D-` 条，`D-752` 一改具改检查**同批勾选**）。

### 一、动手前的边界实测（不猜）

- 基线：`README-server.md` **1923 行 / 137,793 字符**；`§4` 占 **530–1461 行 ＝ 931 行（≈48%）**，其中**表体 552 行**。
- `doc-line-ref::R5` 下限：`REFS ≥ 370`（现状 **447**）· `FILES ≥ 55` · `ANCHORED ≥ 30` · 短式 **36 ≥ 30**。
- **关键取证**：`§4` 的 **143 处引用里只有 4 处在表行上**（139 在正文 / 依据行）⇒ **删表体几乎不动引用面**（实测删后 `REFS 443`）。

### 二、落成（删 406 行表体 ＋ 一处重写）

- **删表体**：`§4.1–§4.11 · §4.13–§4.14 · §4.16–§4.33` 共 **31 节**的字段表（406 行）→ 原位一行指针「字段级清单见母本 `content/04_web_design/data/DATA_MODEL.md`（本文不复刻）」。
- **§4.0 重写**：「计数口径与来源」→「**怎么读这一节（来源口径）**」——**来源 A＝指向母本**（34 张字段表 / 332 行）· **来源 B＝服务端专有表 39 条（§4.34–§4.38，保留）** · **来源 C＝母本未列的增量（§4.39–§4.44 · §4.43 · §4.16 `domain` · §4.1 `signupClosed` 与品牌留痕 8 字段 · §4.5/§4.6/§4.17 `secretaryConfirmedAt`，保留）**；落库形态（`id`+`data` 键值表）与通用约定**保留**。
- **保留区（后端必需）**：服务端专有表 §4.34–§4.38 · 来源 C 增量 §4.39–§4.44 · §4.12 死表墓碑 · §4.15 内置场景 7 个 · §4.1 活动批准门（含「启用端」四段）· 各节 **行为口径 / 写门 / 枚举例外 / 依据**。
- **来源 C 字段补回（防「后端漏字段」）**：§4.1 补 **9 字段**小表（`signupClosed` ＋ 品牌留痕 8）· §4.5/§4.6/§4.17 各补一行 `secretaryConfirmedAt` · §4.16 补一行 `domain`（四类取值 ＋ 单一源）· §4.19 补 `role` 取值（角色键列举式）。
- **同批改**：§1 导语（去「一站式」、写明字段级清单唯一权威源）· §8.2 自我约束（同）。

### 三、守卫实跑（改前预判 ＋ 改后同批）

- `doc-line-ref` **R1–R6 全绿**（`REFS 447 → 443`，仍 ≥370；其余三条下限均保）。
- `doc-consistency` **S1–S16 全绿**：**首跑 1 红 `S15`**（「README-server.md 未解析到『角色键（含 …）』式列举」）——根因＝该列举原在 **§4.19 待办表的 `role` 行**（按计划删掉）⇒ **同批补回**为 §4.19 正文一行（**未改守卫**）；复跑 **16/16 绿**。
- `link-integrity` · `catalog-sync` · `version-stamp` 全绿 ⇒ 五件合跑 **首跑 49/50（1 红＝`S15`）→ 复跑全绿**。

### 四、实测（瘦身台账）

- `README-server.md`：**1923 → 1563 行**（−360）· **137,793 → 116,914 字符**（**−20,879 ≈ −15.2%**）。
- `§4`：**931 → 570 行**（−38.8%）。
- **三批合计**（`#8`：350 ＋ 354 ＋ 361）：**1977 → 1563 行** · **145,074 → 116,914 字符**（**−28,160 ≈ −19.4%**）。

### 五、台账 ＋ 收尾

- `.ctx/REVIEW_QUEUE.md` `#8` 节改「**已落三批次 · 已收口**」＋ 落实测。
- `2026-10-DECISION_LOG.md` `D-752` 一改具改检查**同批勾选**。
- `.ctx/TIMESTAMPS.md`：`README-server.md` 行按 `R-89` 改准（只写**现状 / 边界**）。
- 收尾（`R-85` 改准后）：本批改动面＝**文档（md）** ⇒ 跑**分片档**——起 3000 服务后 `SWEEP_SHARD=1 npm test` ⇒ **773 项 / 773 过 / 0 红 / 墙钟 492.4 s（8.2 分钟）**✅（非 e2e 全跑 ＝ 覆盖本批改动面；末条 `exit=1` 系 Playwright `debug.log` 被沙箱拦截、非测试失败）；跑完**停服**。
- **戳不变**（`?v=20261003h`）——本批**未动 `docs/src/**`**。


## 批次 362（2026-10-03，`#10` **轴线体检表**：只出表、不动代码）

**任务**：承支书 2026-10-03 三轮反馈（`#10`：三档皆不合理 · 轴不单一 · 活动/专班 属项目内部分层 · 党小组暂不承接专班 · 「先出全站轴线体检表」）⇒ 本批＝执行（`R-84` 不另立实现条；**新立 `D-754`**＝两条口径 ＋ 推进方式）。

### 一、体检表（8 台 × 72 页签 · 逐条标轴）

- **轴四类**：`对象`（按管理对象命名）· `动作`（按动作命名）· `性质`（权限 / 知情）· `通用`（今天 / 待办 / 概况三件套）。
- 逐台清点：支书 **12** · 组织 **12** · 宣传 **10** · 纪检 **9** · 组长 **10** · 成员 **12** · 党委 **7** ＝ **72**（与既有「72 页签」口径逐数对上）。
- **4 类病灶（逐条可指认上表）**：① **同组内混轴**（多台「我的职责」＝对象 ＋ 动作并列）· ② **同域两轴两名**（`考勤上传`↔`考勤管理` · `考察上传`↔`考察管理` · `通知发布`↔`下发通知`）· ③ **「性质轴」占页签位**（`知情查看` 6 台）· ④ **页内混轴**（`党小组与活动` ＝ 党小组〔对象〕＋党小组活动〔对象〕＋项目赋权〔动作〕；且赋权里把**并列的**活动/专班做成**互斥选择题**；`活动监督复盘` · `匿名反馈核查` 同型）。
- **建议的单一轴 IA（待支书圈）**：外层＝**对象轴**（项目〔活动∪专班，页内并列〕/ 成员 / 党小组 / 支部 / 反馈 / 记录类）；**动作一律降为页内**；`知情查看` 收为只读分区；`活动日历`/`活动管理`/`活动动态` 合为「活动」一页；**党小组 ↔ 专班承接＝可调项（默认关）**。
- **⚠ 代价与边界（如实）**：若按单一轴重排，将触及全站 IA（72 页签命名 / 归组 / `help.html` / `MACHINE_FLOWS.tab` / 真机流 / 台账 tab 字段），且与 `V-3`（批次 351）与 `D-747`「72 页签不再合并」相牵扯 ⇒ **逐台分批、先一台做样板**。

### 二、落点（只动台账）

- `.ctx/REVIEW_QUEUE.md` `#10` 节：标题改「**tab 划分的轴线混淆 · 已裁：先出全站轴线体检表**」＋ 三轮支书原话照录 ＋ 两条口径 ＋ 体检表 ＋ 4 类病灶 ＋ 建议 IA（原「三档处置」整段替换）。
- `.ctx/logs/2026-10-DECISION_LOG.md`：**新立 `D-754`** ＋ 文首编号起止（`D-729`…`D-754` · 共 **26** 条 · 下一条自 `D-755`）＋ 本月目录首行。
- `.ctx/logs/DECISION_LOG.md` 月度索引 2026-10 行：**25 → 26 条（D-729~D-754）**。

### 三、守卫

- **只改 `.ctx/**` 的 md**（未动 `docs/**` / `server/**` / `content/**`）⇒ **版本戳不变**（仍 `?v=20261003h`）。
- 收尾（`R-85` 改准后）：本批改动面＝**台账（md）** ⇒ 跑**分片档**——起 3000 服务后 `SWEEP_SHARD=1 npm test` ⇒ **773 项 / 773 过 / 0 红 / 墙钟 520.8 s（8.7 分钟）**✅（非 e2e 全跑 ＝ 覆盖本批改动面；末条 `exit=1` 系 Playwright `debug.log` 被沙箱拦截、非测试失败）；跑完**停服**。
- **守卫定向实跑**：`doc-consistency`（`S1`–`S16`）＋ `timestamps-note-guard` ＋ `frontmatter-freshness` ＋ `doc-line-ref` ＋ `version-stamp` ＋ `catalog-sync` ⇒ **首跑 54/55（1 红＝`S14`：**四处同源**的文末「续编说明」段未同步）→ 补正后 55/55 · 0 红**。


## 批次 363（2026-10-03，`#7` **前半取证**：组织委员台「活动日历」与「知情查看」到底各是什么）

**任务**：支书 2026-10-03 澄清 `#7` 里那「两个功能区」＝**组织委员台的「活动日历」与「知情查看」**，并要求「**请你适时启动server和内置浏览器！**」⇒ 本批＝**真机取证 ＋ 出三档**（只出表 / 只取证，不动代码）。

### 一、怎么取证（起服务 ＋ 内置浏览器）

- 起 3000 服务（`npm start`）；内置 Chromium 走 `?dev=` 免登入口，**六台逐台实开两个页签**（`?tab=calendar` / `?tab=tf-view`），逐页读 H3 / 分段钮 / 写按钮 / 正文摘要。

### 二、取证结果（六台 × 两页签）

| 台 | 「活动日历」页内 | 「知情查看」页内 |
|---|---|---|
| 支书 | H3「活动日历」＋ **「活动查询」**（管侧：统计条 / 写入 / 查询） | H3「**专班查看**」＋〔活动 / 专班〕（只读） |
| **组织**（支书指认） | H3「活动日历」（**只读** · 无分段 / 无导出） | H3「**活动查看**」＋〔活动 / 专班〕＋ **导出 CSV** ＋ 点条目看详情（只读） |
| 宣传 | H3「活动日历」（只读） | H3「**活动查看**」＋〔活动 / 专班〕 |
| 纪检 | H3「活动日历」（只读） | H3「**专班查看**」＋〔活动 / 专班〕 |
| 组长 | H3「活动日历」（只读） | H3「**专班查看**」＋〔活动 / 专班〕 |
| 成员 | H3「活动日历」（只读） | H3「**活动查看**」＋〔活动 / 专班〕 |

- **两页签读同一份数据、同一套引擎**（月份下拉 ＋ 月 / 周 / 日 / 列表，单一源 `docs/src/components/record/calendar.js`）、**都只读**；差别仅「知情查看」多一组〔活动 / 专班〕分段（部分台另有导出 CSV）⇒ **用户看不出边界**。
- **「知情查看」页内 H3 不稳定**：随分段默认值变（默认 `activity` → 「活动查看」；默认 `taskforce` → 「专班查看」）⇒ 标题也当不了边界线索。

### 三、病根（两次裁定叠加、无人回头核对 —— 非任一次之错）

- **2026-09-14**（支书裁）「同质薄壳合并 —— 原**活动查看**并入**知情查看**」，该 tab 承载「活动 / 专班 两分段」只读查看，`defaultView:'activity'` ＝合并前本 tab 的独占内容（`docs/src/entries/tabs/org/tf-view-tab.js:1-3`）。
- **2026-09-30 批次 310**（支书裁「**每个人应该都有这样的活动日历界面**」）把「日历」这一面抽出供**除支书台外五台**挂载（`docs/src/entries/tabs/shared/activity-calendar-tab.js:1-16`，明写「只读 · 不挂写入 / 不做第二套写口」）。
- ⇒ **五台（组织 / 宣传 / 纪检 / 组长 / 成员）各有两个展示同一份只读活动视图的页签**；组织台正是支书看到的那一对。

### 四、落脚

- `.ctx/REVIEW_QUEUE.md` **新立 `#7` 节**：支书两轮原话照录 ＋ 六台取证表 ＋ 病根 ＋ **三档处置（待支书圈：甲 知情查看只留专班 / 乙 删五台活动日历 / 丙 两者强制分工）**＋ 「本件即 `#10` 全站分期第一件样板料（先落组织委员台）」。
- **未立 `D-` 条**（尚无裁定——三档待支书圈；`R-84`：裁定才进决策日志）。
- ⚠ **本批未动任何代码 / 母本 / help**；**戳不变**（仍 `?v=20261003h`）。
- **守卫**：`doc-consistency`（`S1`–`S16`）＋ `timestamps-note-guard` ＋ `frontmatter-freshness` ＋ `doc-line-ref` ＋ `version-stamp` ＋ `catalog-sync` ⇒ **55/55 · 0 红**。
- **收尾（`R-85` 改准后 · ④ 适用边界）**：本批只改 `.ctx/**`（**未动 `docs/src/**` / `server/*.js` / `server/routes/**` / `server/test/**`**）⇒ 依 `R-85` ④，**收尾那一跑不触发**；读 `.ctx` 的判据（上列六件）已实跑并全绿。


## 批次 364（2026-10-03，`#7`/`#10` **口径落账 ＋ 规划落盘乙部**）

**任务**：承支书 2026-10-03 两条答复（`#7` 给「**知情查看＝赋权下游**」的工作逻辑；`#10` 令「**先落盘规划到乙部，防止忘记，然后组织委员台**」）⇒ 本批＝**只落盘**（不动任何代码）。

### 一、口径（`D-755`）

- 「知情查看」＝**该角色的「赋权下游」只读视图**（**唯一工作逻辑**：谁的下游，谁就该看得到）· **下游是什么可配置** · **视图形态按实际定** · **各有侧重**（组织委员下游含专班；支委会层＝所有工作都是其下游）。
- AI 原三档（甲 只留专班 / 乙 删五台活动日历 / 丙 强制分工）**作废**——**过拟合**：把「工作逻辑」问题当成了「页签去重」问题；且 `活动日历`＝**通用面**（人人有的活动日历）、`知情查看`＝**角色面**（我的赋权下游），**依据不同、不冲突**。

### 二、落盘（乙部）

- `CLAUDE.md` 新增 `## 在办：#10 页签单一轴 · 全站分期`——**三条口径**（`D-754` / `D-755`）＋ **每台三件事**（① 归组单一轴 · ② 同台不得有两个读同一份数据的只读页签 · ③ 「知情查看」按赋权下游重定义）＋ **批次表 365–372**（**365 组织委员台＝样板** → 366 宣传 → 367 纪检 → 368 组长 → 369 成员 → 370 支书 → 371 党委 → 372 全站收口）。
- `.ctx/REVIEW_QUEUE.md` `#7` 节：原三档**标作废**，改记本口径 ＋ 落地项（① 内容判据改按赋权下游 ② 下游映射做成可配置 ③ 视图形态按实际定）。

### 三、计数（四处同源）

- `2026-10-DECISION_LOG.md`：文首 `D-729`…`D-755` · 共 **27** 条 · 下一条自 `D-756`；本月目录首行加 `D-755` 行；文末「续编说明」段同刷。
- `.ctx/logs/DECISION_LOG.md` 月度索引 2026-10 行：**26 → 27 条（D-729~D-755）**。

### 四、如实登记

- ⚠ **未入 `ACTIVE_RULINGS`**：2026-10 的近若干 `D-` 条（`D-744`…`D-755`）**均未投影**，本批**不单独为 `D-755` 加行**（免口径不一）——该表 2026-10 的投影**待专批**。
- ⚠ 本批**未动 `docs/**` / `server/**` / `content/**`** ⇒ **戳不变**（`?v=20261003h`）；收尾依 `R-85` **④** 不触发（改动面只在 `.ctx/**` / `CLAUDE.md`），读台账的判据已实跑。


## 批次 365（2026-10-03，`#10` 全站分期**第一台样板**：组织委员台对照表 · 只出表）

**任务**：承支书 2026-10-03「**然后组织委员台！**」⇒ 本批＝**先出对照表**（沿 `V-3` 老路：出表 → 支书圈 → 落地），**不动任何代码**。

### 一、★ 找到「赋权下游」的**既有单一源**（不是新造）

- **`docs/src/core/domain/work-map.js`**：**14 个模块**，每模块带 **`defaultOwner`（缺省主责主体：角色键 或 组织型主体）**；**支部可改**（`config.workforce` ＋ `expandWorkforce` / `mergeWorkforceSnapshot` / `canDisableModule`）。
- **与支书原话逐字对上**：**`taskforce`（专班）的 `defaultOwner` ＝ `org-commissioner`（组织委员）** ⇒ 正合「目前看 专班归组织委员管」；`develop-party-member` / `feedback-handling` / `rule-making` / `info-platform` 的主责 ＝ **`branch-committee`（支委会）** ⇒ 正合「所有的工作都是支委会的下游」。
- ⇒ **「知情查看」的修法**：判据从**写死的〔活动 / 专班〕分段**改为**「按本角色的 `work-map` 下游渲染」**（缺省取 `defaultOwner`、支部改派后取 `config.workforce`）——**对象集自动可配置**；**视图形态按实际定**。

### 二、对照表（组织委员台 12 页签）

（全表见 `.ctx/REVIEW_QUEUE.md`「乙部 `#10` 全站分期 · 批次 365：组织委员台（样板）对照表」）

- **9 个页签不动**：今天 / 待办 / 工作概况 / 成员名册 / 人才库 / 思想汇报 / 专班管理 / 成员流动 / 我的处置。
- **3 处待支书圈**：**① `考察上传`（动作轴）降为「人才库」页内动作位**（依 `V-10` 支书原话「**考察就是维护人才库的过程！！**」；页签 **12 → 11**）· **② `活动日历`（通用面，批次 310 人人有）移入「工作台」组** · **③ `知情查看` 改判据按下游（组名可保留）**。
- **三档**：**甲（推荐）** 组结构与组名**不变**（只改 `groupLabel` 一处 ＋ 两处页内 ⇒ `S1`/`S2`/`S3` 与 `help.html` 两处零改签）· **乙** 只做 ③（轴未单一）· **丙** 连组名一起重排（**组数 4 → 3**，要动 `S1`/`S2`/`S3` ＋ `help.html` §0.1/§2 ＋ `README-server §3.2` 三表，成本最高）。
- **台账影响（三档共同，已列全）**：`help.html` 组名与计数 · `README-server.md §3.2` 三表 · `MACHINE_FLOWS.tab` 与 `form-loop-registry.mjs` 的 `flow.tab` · `page-sweep` 门槛（组织台 tab 数）· 按页签名定位的真机件。

### 三、如实登记

- ⚠ 本批**只出表**：页签数 / 组名 / 判据**一字未改**；**戳不变**（`?v=20261003h`）；收尾依 `R-85` ④ 不触发，读台账的判据已实跑。
- ⚠ **「知情查看」改判据会波及 5 台**（各台下游不同：**纪检台**下游含 `attendance-inspection`（考勤考察）⇒ 该台应出**考勤 / 考察**面而非专班面）⇒ **逐台分批**（批次 366 起）。

## 批次 366（2026-10-04，`#10` 全站分期**第一台样板落地**：组织委员台 · 甲档三项都做）

**任务**：支书就批次 365 对照表圈「**甲 三项都做**」＋就「知情查看」视图形态圈「**分段集合由下游决定**」⇒ 本批＝**首台落地**（样板 · 后七台照抄）。

### 一、三项改动（全部落地）

| # | 事项 | 改法 |
| --- | --- | --- |
| ① | `考察上传` 下沉 | 页签 **12 → 11**：删 `org-workspace.js` 的 `inspection` 注册；改 `org/inspection-tab.js` 的 `renderContent(ctx, container)` 可收宿主容器；`org/talent-tab.js` 页底加折叠区「录入考察」（`#talent-insp-toggle` ＋ `#talent-insp-body`，展开时懒 `import` 挂载） |
| ② | `活动日历` 归组 | `org-workspace.js` 中 `calendar` 的 `groupLabel` 由 `知情查看` 改 **`工作台`**，并把注册行**上移到 `overview` 之后**（组按注册序分段渲染，不上移会出现**第二个「工作台」分节**——真机实测抓出） |
| ③ | `知情查看` 按下游派生 | `work-map.js` 新增 `MODULE_VIEW_SEGMENT`（7 模块 → `activity` / `taskforce`）＋ `downstreamModulesOf` ＋ `downstreamViewSegments`；`insight-view.js` 新增 `opts.views`（分段钮**动态渲染**、深链目标优先并入、默认段回退 `ALLOWED[0]`）；`org/tf-view-tab.js` 载 `work-map` ＋ `branch` ＋ `auth` 派生 `views` ⇒ 组织委员下游＝专班 ⇒ **只出「专班」段** |

### 二、台账 / 判据面同源改准（7 处）

- `docs/help.html`：§0.1 计数 12 → 11 ／ §2.2 标题 12 → 11 ／ 删「考察上传」行 ／ 人才库行补「页底折叠区『录入考察』」／ 活动日历行改归「工作台」段 ／ 知情查看行改描述 ／ 帮助卡入口改准。
- `README-server.md`：§3.2.2 标题 12 → 11 个 ＋ 整表重排（活动日历列第 4、删 inspection、知情查看描述改）。
- `server/test/form-loop-registry.mjs`：`VALIDATION_SITES` 三条 `flow` 改 `org/人才库·录入考察`（行号 **265/269/275**）；`MACHINE_FLOWS.org-inspection` 改 `tab:'人才库'` 且 `open` 增 `{click:'#talent-insp-toggle'}, {waitFor:'#talent-insp-body'}`。
- `server/test/inspection-loop-e2e.test.mjs`：`loginAs(sid, ws, tab='考察上传')` 的 org 用例改 tab `人才库` ＋ 先点 `#talent-insp-toggle` 再 `waitForFunction(!!document.getElementById('btn-org-upload-insp'))`。
- `server/test/page-sweep.test.mjs`：门槛 `SWEEP.tabs >= 67` → **`>= 66`**。
- `server/test/copy-screen-guard.test.mjs`：`C4_BASELINE` 增 `'org::知情查看': { copy:483, ctrls:28, ratio:17.3 }` ＋ `C4_REASON` 对应条目（判据 >12 须登记）。
- `.ctx/TIMESTAMPS.md`：六行日期刷 `2026-10-04`。

### 三、收尾三跑（全绿）

- `npm run test:daily`：**728/728**。
- shard 3（`SWEEP_SHARD=3; npm test`）：**806/806/0**（470.7 s）。
- 全量（`npm run test:full`）：**942/942/0**（1337.6 s ≈ 22.3 min）。

### 四、真机取证（起 3000 服务 ＋ 内置 Chromium · `?dev=` 免登）

- 组织委员台页签 **11 个**、**无「考察上传」**；`活动日历` 位于「工作台」段（tab 序：今天 / 待办 / 工作概况 / **活动日历** / 成员名册 / 人才库 / 思想汇报 / 专班管理 / 成员流动 / 知情查看 / 我的处置）——**无第二个「工作台」分节**。
- 「人才库」页底折叠区：点击 `#talent-insp-toggle` 后文案转「收起」、`#talent-insp-body` 显形（`bodyLen 2451`）、`#btn-org-upload-insp` 在位。
- 「知情查看」仅出 **`['taskforce']`** 段、H3 为「**专班查看**」；`pageerror` **0**。

### 五、如实登记

- ⚠ **批次 366 系 `D-756` 立据**（支队 366 收尾本批未落 `D-756` 正文，已于同批补齐）；戳 `20261003h → 20261004a`。
- ⚠ **`function-catalog.js` 第 27/34 行 `tab:'development'`** 系批次 321 遗留（不在本批授权面）⇒ 只登记、未改。
- ⚠ **`ACTIVE_RULINGS` 未投影**：`D-744`…`D-756` 沿用 `D-755` 登记（待专批）。
- ⇒ **批次 367 起逐台铺开**（宣传 → 纪检 → 组长 → 成员 → 支书 → 党委 → 全站收口）。

## 批次 367（2026-10-04，`#10` 全站分期**第二台**：宣传委员台 · 支书两条答复）

**任务**：承批次 366「逐台铺开」⇒ 本批＝宣传委员台。出表前实况核查抓到**两处与既定口径相抵**（详见 `D-757` 背景）⇒ 按「拿不准的必须 ask user question」送支书，获**两条答复**：① 「知情查看」分段派生**空集**时**只出「活动」段**（甲）；② 逐字「**周报作为 归档的一个 特例即可！！**」。

### 一、两处落地

| # | 事项 | 改法 |
| --- | --- | --- |
| ① | `周报报送` 并入 `档案归档` | 页签 **10 → 9**：删 `prop-workspace.js` 的 `weekly` 注册；`prop/archive-tab.js` 页首加折叠区（`#archive-weekly-toggle` ＝ **`btn-outline` 族** ＋ `#archive-weekly-host`，模块态 `_weeklyOpen`，展开时懒 `import` 挂载；**归档兜底身份〔支书 / 副支书〕不呈现本折叠区**——按 `ARCHIVE_FALLBACK_ROLES` 短路，守「不扩大任何写权限」）；`prop/weekly-tab.js` 的 `renderContent(ctx, host)` 改收**宿主容器**（4 处递归调用同步传 `container`）——**不复制表单、不另写状态** |
| ② | `活动日历` 归「工作台」组 | `prop-workspace.js` 中 `calendar` 的 `groupLabel` 由 `知情查看` 改 **`工作台`**，并把注册行**上移到 `overview` 之后** |
| ③ | `知情查看` 按下游派生 | `prop/tf-view-tab.js` 载 `insight-view` ＋ `work-map` ＋ `branch` ＋ `auth`，`downstreamViewSegments` 派生；**空集回退 `['activity']`**（甲档）⇒ 本台只出「活动」段 |

### 二、台账 / 判据面同源改准（5 处）

- `docs/help.html`：§0.1 计数 10 → 9 ／ §2.3 标题 10 → 9 tab ／ 整表重排（活动日历列「工作台」段第 4 位、删「周报报送」行、档案归档行补「页内『周报』折叠区＝归档特例」、知情查看行改「只出『活动』段」）／ 周报帮助卡入口改指「档案归档 → 页内『周报』折叠区」。
- `README-server.md`：§3.2.3 标题 10 → 9 个 ＋ 整表重排；§2.2.4「职责位」句改准；两处 `文件:行号` 依据随 `archive-tab.js` 位移改签（`1033-1096 → 1083-1145`（`_handleArchiveUpload`）· `570-600 → 631-650`（党建平台留痕位））＋ `weekly-tab.js` 依据行号 `54-64,211-244 → 57-67,214-247`。
- `server/test/form-loop-registry.mjs`：四条 `prop-weekly*` 流程 `tab` 改 **「档案归档」** ＋ `open` 增「展开折叠区」步（`{click:'#archive-weekly-toggle'}` ＋ `waitFor`）；两条 `reload:true` 的流程**同批加 `reopen[]`**（重载后折叠区回收起态）；`VALIDATION_SITES` 三条 `weekly-tab.js` 行号 +3（172/173/213）、三条 `archive-tab.js` 行号随位移改准（**987/991/1384**）。
- `server/test/page-sweep.test.mjs`：门槛 `SWEEP.tabs >= 66` → **`>= 65`**（宣传台 10 → 9）。
- `server/test/copy-screen-guard.test.mjs`：**收基线**——删 `C3_BASELINE` 里已不存在的 `prop::周报报送`（M2/M4 另跑实测：各组比值**只降不升**、无新增 >12 屏）。
- `server/test/button-system-guard.test.mjs`（`B4` 棘轮，未改判据）：折叠钮初版写成裸 Tailwind ⇒ 未入语义族 `<button>` 由 0 升到 1 **判红** ⇒ **改走 `btn-outline` 族**（与批次 366 组织台 `#talent-insp-toggle` 同族）**复绿**。

### 三、收尾（覆盖分片）

- `SWEEP_SHARD=2; npm test`（prop 所在片）：**终跑 780 / 780 / 0 红**（`EXIT=0`）。过程中两次首跑红，均**同批改准**：① `form-loop-sweep::S6`「台账行号未同步」——`archive-tab.js` 三条 `VALIDATION_SITES` 行号随本批插入位移（937/941/1334 → 983/987/1380 → **987/991/1384**）；② `button-system-guard::B4`（见上）。尾条 `exit=1` 系 Playwright `debug.log` 被沙箱拦截、**非测试失败**。
- `npm run test:daily`：**首跑 2 红**（`doc-line-ref::R2` 一条符号锚点随位移失效 ＋ `timestamps-note-guard::N2` 备注超预算 75 字）⇒ **同批改准 / 收字**后 **doc 四件套 29/29 绿 · daily 728/728 绿**。

### 四、真机取证（起 3000 服务 ＋ 内置 Chromium）

- 宣传委员（`?dev=prop-commissioner`）：页签 **9 个**（今天 / 待办 / 工作概况 / **活动日历** / 宣传任务 / 项目看板 / 档案归档 / 知情查看 / 我的处置）、**无「周报报送」**；`活动日历` 位于「工作台」段第 4 位；「档案归档」页首「**周报 · 归档特例**」折叠区点击后文案转「收起」、`#weekly-content` / `#weekly-submit-btn` / `#weekly-add-btn` 在位；「知情查看」**只出 `['活动']` 段**（H3「活动查看」）；**新标签页 `pageerror` 0**。
- **支书（`?dev=secretary`）进本台＝归档兜底盘**：页签仅 **`档案归档`** 一个，**且 `#archive-weekly-toggle` 不在**（写面未扩）。

### 五、如实登记

- ⚠ **`档案归档` 名未改**（支书只令「周报作为 归档的一个 特例」）——轴残留登记，如要改按对象命名另行一批。
- ⚠ **归档兜底不自伤**：本批主动给 `_renderWeeklySlot()` 加了 `ARCHIVE_FALLBACK_ROLES` 短路（支书未要求；理由＝该面自述「不扩大任何写权限」），已真机取证。
- ⚠ **`page-sweep` 门槛 66 → 65**：按实测值改准，**范围未缩水**。
- ⚠ **戳 `20261004a → 20261004c`**：因新写的 `?v=20261004b` 字面量被 `bump-version` 计入「现有最大戳」，同日续号跳至 `c`（陈旧戳自检 0 残留）。
- ⚠ **`ACTIVE_RULINGS` 未投影**：`D-744`…`D-757`（同 `D-755` / `D-756` 登记）。
- ⇒ **批次 368 起继续**（纪检 → 组长 → 成员 → 支书 → 党委 → 全站收口）。

## 批次 368（2026-10-04，`#10` 全站分期**第三台**：纪检委员台 · 支书圈甲）

**任务**：承批次 367「逐台铺开」⇒ 本批＝纪检委员台。出表前核查出三处待办：**(a)** 「活动监督复盘」页签＝**动作＋对象混轴**（`D-754` 体检出，**本台特有**）· **(b)** `活动日历` 仍挂「知情查看」组（通用项）· **(c)** `知情查看` 按 `D-755` 派生为**空集**（同族问题，已由批次 367 甲档覆盖）。⇒ 只把 **(a)** 送支书，获**甲：改名「复盘」**。

### 一、三项落地

| # | 事项 | 改法 |
| --- | --- | --- |
| ① | `活动监督复盘` → `复盘` | `disc-workspace.js` 的 `review` 页签 `label` 改 **「复盘」**（对象轴；id 不变、页内四块一字未动）；`review-tab.js` 头注同批改准 |
| ② | `活动日历` 归「工作台」组 | `disc-workspace.js` 中 `calendar` 的 `groupLabel` 由 `知情查看` 改 **`工作台`**，并把注册行**上移到 `overview` 之后** |
| ③ | `知情查看` 按下游派生 | `disc/tf-view-tab.js` 载 `insight-view` ＋ `work-map` ＋ `branch` ＋ `auth`，`downstreamViewSegments` 派生；**空集回退 `['activity']`**（甲档）⇒ 本台只出「活动」段（默认段由「专班」变「活动」） |

### 二、台账 / 判据面同源改准（7 处）

- `docs/help.html`：§2.4 表内「活动监督复盘」行改「复盘」＋ **4 处**「纪检台『活动监督复盘』」引用改「复盘」＋ 一处「支书 / 组长 / 纪检『知情查看』的『专班』分段」**去掉纪检**（本批起纪检无专班段）＋ `活动日历` 行改「工作台」段 ＋ 知情查看行改「只出『活动』段」。
- `README-server.md`：§3.2.4 整表重排（`calendar` 列第 4、`review` 改「复盘」、知情查看描述改）。
- `docs/workspace/disc.html`：页头副标题「活动监督复盘」→「复盘」。
- `docs/src/core/domain/function-catalog.js`：`review` 条目（name/desc/usage）＋ `ws-disc` 描述（9 tab 清单）。
- **根 `README.md` 功能地图标记块**：`复盘评议（通用）` → `复盘（通用）`（由 `catalog-sync::T3` 派生核对，改前实测**判红**）。
- `server/test/copy-screen-guard.test.mjs`：屏幕键 `disc::活动监督复盘` → `disc::复盘`；**收基线**——删 `disc::知情查看`（其分段改后实测**已 ≤12**，按收基线纪律同批删条目 ＋ 撤理由）。
- `.ctx/TIMESTAMPS.md` 三行（`disc-workspace` / `disc/tf-view-tab` / `disc/review-tab`）＋ `.ctx/SNAPSHOT.md` 纪检行。

### 三、收尾（覆盖分片）

- `SWEEP_SHARD=3; npm test`（disc 所在片）：**806 / 806 / 0 红**（`EXIT=0`）；尾条 `exit=1` 系 Playwright `debug.log` 被沙箱拦截、**非测试失败**。
- `copy-screen-guard` 另**单件实跑**（含 `COPY_SCREEN_PRINT_BASELINE=1` 复测）：**首跑 1 红** ＝ `M3` 僵尸检查「`disc::知情查看` 已 ≤12 应从基线删条目」⇒ **同批删条目**后 **11/11 绿**；实测 `disc::复盘` **1151 / 71 = 16.2**（基线 16.66，未涨）。

### 四、真机取证（起 3000 服务 ＋ 内置 Chromium · `?dev=disc-commissioner`）

- 纪检台页签 **9 个**（今天 / 待办 / 工作概况 / **活动日历** / 考勤管理 / **复盘** / 考察管理 / 知情查看 / 我的处置）——`活动日历` 位于「工作台」段第 4 位，「复盘」在「我的职责」段。
- 「复盘」页三块标题在位（活动流程监督 / 活动复盘监督 / 经验沉淀督促清单）。
- 「知情查看」**只出 `['活动']` 段**（H3「活动查看」）。
- **新标签页 `pageerror` 0**（旧标签页的报错经查系**跨会话残留**〔引用旧戳 `?v=20261004c`〕、非本批引入）。

### 五、如实登记

- ⚠ **母本 / 职责表述里的「活动监督复盘」一字未改**（纪检职权名：`纪检委员工作流程指南.md` §三、`CDF`、`OPERATIONS_GUIDE` 等）——本批只改**页签名**；如支书要口径也统一为「复盘」，另行一批（涉 `content/**`）。
- ⚠ **`考勤管理` ↔ 组长台「考勤上传」的「同域两轴两名」未动**：**留待批次 369（组长台）/ 373（全站收口）** 一并定。
- ⚠ **`copy-screen-guard` 收基线 1 条**（`disc::知情查看`）：进度前进、非放宽（M2 的 >12 判红与 M3 僵尸检查一字未动）。
- ⚠ **戳 `20261004c → 20261004d`**；`ACTIVE_RULINGS` 未投影（`D-744`…`D-758`，待专批）。
- ⇒ **批次 369 起继续**（组长 → 成员 → 支书 → 党委 → 全站收口）。

## 批次 369（2026-10-04，`#10` 全站分期**第四台**：党小组长台 · 支书圈甲）

**任务**：承批次 368「逐台铺开」⇒ 本批＝党小组长台。出表前核查出三处待办：**(a)** 「考勤上传」/「考察上传」＝**动作轴**（与同组「活动管理 / 组员进展」对象轴混轴）· **(b)** 与纪检台「考勤管理 / 考察管理」＝**同域两轴两名**（`D-754` 体检表体检出）· **(c)** `活动日历` 仍挂「知情查看」组。⇒ 把 **(a)(b)** 合成一题送支书，获**甲：组长台改名「考勤管理 / 考察管理」**。

### 一、三项落地（＋ 批次 366 遗留收口）

| # | 事项 | 改法 |
| --- | --- | --- |
| ① | 两个页签改名 | `leader-workspace.js` 的 `attendance` / `inspection` 两个 `label` 由「考勤上传 / 考察上传」改 **「考勤管理 / 考察管理」**（对象轴；**与纪检台逐字同名**）；**页内 h3 同步改名**；**「上传」作为页内动作保留**（表单 / 按钮 / toast 一字未动）；两文件头注改准 |
| ② | `活动日历` 归「工作台」组 | `leader-workspace.js` 中 `calendar` 的 `groupLabel` 由 `知情查看` 改 **`工作台`**，把注册行**上移到 `overview` 之后** |
| ③ | `知情查看` 按下游派生 | `leader/tf-view-tab.js` 载 `insight-view` ＋ `work-map` ＋ `branch` ＋ `auth`，`downstreamViewSegments` 派生（组长下游＝党小组会 / 主题党日 / 共建活动 ⇒ **全映射 `activity`**）＋ 空集回退 ⇒ 本台只出「活动」段（默认段由「专班」变「活动」） |
| ④ | **批次 366 遗留三处＋一处真缺陷** | `org/taskforce-tab.js` 引导句改「组织台『人才库』页底『录入考察』」；`org/todo-tab.js` 的 `-org-tab="inspection"` → `talent`（**原为空操作**：该页签已并入人才库）、toast 与 `tabLabels.review` 同步改准 |

### 二、台账 / 判据面同源改准（5 处 ＋ 两件 e2e）

- `docs/help.html`：§0.1 角色行（「考勤 / 考察上传」→「考勤 / 考察管理」）＋ §2.5 标题与**整表重排**（`活动日历` 列「工作台」段第 4 位、两个页签改名、知情查看行改「只出『活动』段」）＋ **6 处**引用／卡片标题改准（含「考勤管理 · 上传」「考察管理 · 上传」两枚卡片标题）＋ 一处「支书 / 组长 / 纪检『知情查看』的『专班』分段」**去掉组长**。
- `README-server.md`：§3.2.5 **整表重排** ＋ 特例段「两个页签」改名 ＋ `leader-workspace.js:17-23,73-76` → **`81-83`** 行号改签。
- `docs/workspace/leader.html`：页头副标题「活动管理 · 考勤管理 · 考察管理 · 组员进展」。
- `docs/src/core/domain/function-catalog.js`：`ws-leader` 描述（10 tab 清单）。
- `docs/src/entries/tabs/**` 另 4 处引用改准（`leader/write-tab.js` 只读引导 · `visitor/activities-tab.js` 组织者入口标签 · `disc/attendance-tab.js` 上传位说明 · `org/inspection-tab.js` 导语）。
- `server/test/form-loop-registry.mjs`：**5 条** `MACHINE_FLOWS.tab` 改「考勤管理 / 考察管理」；`inspection-loop-e2e.test.mjs`（`loginAs` 默认页签 ＋ 用例名）与 `block-canvas-e2e.test.mjs`（只读引导断言文案）同批改准。
- `server/test/copy-screen-guard.test.mjs`：屏幕键随标签改；**收基线**——删 `leader::知情查看`（其分段改后实测**已 ≤12**）。
- `.ctx/TIMESTAMPS.md` 九行日期（`leader-workspace` · `leader/attendance-tab` · `leader/inspection-tab` · `leader/tf-view-tab` · `leader/write-tab` · `visitor/activities-tab` · `org/todo-tab` · `org/taskforce-tab` · `disc/attendance-tab`）。

### 三、收尾（覆盖分片）

- `SWEEP_SHARD=3; npm test`（leader 所在片，与 disc 同片）：**806 / 806 / 0 红**（`EXIT=0`）。
- `copy-screen-guard` 另**单件实跑**：**首跑 1 红** ＝ `M3` 僵尸检查「`leader::知情查看` 已 ≤12 应从基线删条目」⇒ **同批删条目**后 **11/11 绿**。

### 四、真机取证（起 3000 服务 ＋ 内置 Chromium · `?dev=leader`）

- 组长台页签 **10 个**（今天 / 待办 / 工作概况 / **活动日历**（「工作台」段第 4 位）/ 活动管理 / **考勤管理** / **考察管理** / 组员进展 / 知情查看 / 我的处置）；页头副标题同名。
- 「考勤管理」页 h3 ＝「考勤管理」；「知情查看」**只出 `['活动']` 段**（H3「活动查看」）。
- **新标签页 `pageerror` 0**（仅 CDN 字体请求被拦，非页面错误）。

### 五、如实登记

- ⚠ **页内动作文案保留「上传」**：toast（`考勤上传：新增 N 条…` / `考察上传成功…`）与按钮一字未动——页名管对象、页内管动作。
- ⚠ **母本 / 职责表述未动**（组长侧 `党小组组长工作手册` 的「组织者上传」等）。
- ⚠ **`copy-screen-guard` 收基线 1 条**（`leader::知情查看`）：进度前进、非放宽。
- ⚠ **戳 `20261004d → 20261004e`**；`ACTIVE_RULINGS` 未投影（`D-744`…`D-759`，待专批）。
- ⇒ **批次 371 起继续**（成员 → 支书 → 党委 → 全站收口）。

## 批次 371（2026-10-04，按 `D-762` 清单落地 · `D-763` 执行批）

**任务**：批次 370 三轮出表 ＋ 立口径后，支书圈定 `D-762` 落地清单 ⇒ 本批**照单施工**（**无新裁定**）。四项：① 统一日历组件改两栏 ② 成员台撤「活动日历」页签 ＋ 首页深链改落 ③ 成员台「知情查看」改名「专班动态」 ④ 组长台「活动管理」→「本组活动」。

### 一、四项落地

| # | 事项 | 改法 |
| --- | --- | --- |
| ① | **统一日历改「左日历 / 右详情」两栏、取消全屏** | `shared/activity-calendar-tab.js`：`TAB_HTML` 改 `grid-cols-1 lg:grid-cols-5` —— 左 `lg:col-span-3`（月选择 ＋ 视图钮 ＋ `#cal-main-grid` ＋ 图例）、右 `lg:col-span-2`（`#inspector-container` ＋ `#inspector-default`/`#inspector-content`/`#inspector-date-title`/`#inspector-cards`）；渲染末调 `renderInspectorFromState({...st, activities, viewType:'participant'})`（**只读分支**，不引入支委侧写侧能力）。**与支书台 `secretary/calendar-tab.js::calendar-view-section` 既有样板逐字同构**；**单一源改一次、四台生效**（支书纠偏：**不逐台做**） |
| ② | 成员台**撤「活动日历」独立页签**（12 → 11） | `visitor-workspace.js` 删 `calendar` 注册；`docs/index.html` 首页「完整日历 →」改 `data-ws-tab="activities" data-ws-view="calendar"`；`main-entry.js` 支持 `data-ws-view` → `&subview=`；`visitor/activities-tab.js` **一次性消费 `?subview=` ＋ 粘住**（壳会清 URL 参数）并**复用既有视图钮**切到日历视图 |
| ③ | 成员台「知情查看」→ **「专班动态」** | `visitor-workspace.js` 的 `tf-view` `label` 改「专班动态」；`visitor/tf-view-tab.js` 改 `views: ['taskforce']`（**只出专班段**）；**「我的产出填报」写口原地保留** |
| ④ | 组长台「活动管理」→ **「本组活动」** | `leader-workspace.js` 的 `write` `label` 按范围改名（支书台「活动管理」＝全支部写入） |

### 二、判据面 / 台账 6 处同源改准

`docs/help.html`（§0.1 成员台 12 → 11 ＋ 组长台块块文案 ＋ §2.5「本组活动」行 ＋ §2.6 标题 11 tab 与整表重排〔撤「活动日历」行、`活动动态` 行补三视图与深链、新增「专班动态」行〕）· `README-server.md`（§3.2.5「本组活动」行 ＋ §3.2.6 整表 12 → 11 ＋ **四台共用同一只读件** ＋ 两栏口径）· `docs/workspace/leader.html` 副标题 · `function-catalog.js`（`ws-leader` / `ws-visitor`）· `form-loop-registry.mjs`（`visitor-insight-taskforce-contribution.tab` → 专班动态）· `page-sweep.test.mjs`（门槛 **65 → 64**）· `copy-screen-guard.test.mjs`（**登记 `visitor::专班动态` 17.6**）· `.ctx/TIMESTAMPS.md` 四行。

### 三、收尾（覆盖分片）

- `SWEEP_SHARD=4`（成员台所在片）**782 / 782 / 0 红（`EXIT=0`，472.7 s）**。
- `copy-screen-guard` 单件实跑：**首跑 1 红** ＝ `M2`「`visitor::专班动态` 比值 17.6 未登记」⇒ 按 M2 判据**同批登记**（＋ `C4_REASON`）后 **11 / 11 绿**。
- 收尾前 doc 守卫子集（`doc-consistency` / `doc-line-ref` / `timestamps-note-guard` / `version-stamp` / `catalog-sync` / `link-integrity`）**57 / 57 绿**。

### 四、真机取证（起 3000 服务 ＋ 内置 Chromium）

- 成员台（`?dev=participant`）：**11 页签**（今天 / 待办 / 工作概况 / 活动动态 / 项目分工 / 考勤概况 / 思想汇报 / 我的考察 / 我的复盘 / **专班动态** / 我的处置）——**无「活动日历」** ✓
- 组长台（`?dev=leader`）：**10 页签**，第 5 枚 ＝ **「本组活动」** ✓；其「活动日历」页实测 `#calendar-view-section = grid grid-cols-1 lg:grid-cols-5 gap-4` ＋ 左 `lg:col-span-3` ＋ 右 `#inspector-container`（`lg:col-span-2`，默认文案「点击日历日期查看活动」）✓
- 深链：`?dev=participant&tab=activities&subview=calendar` ⇒ **视图钮 `calendar` 高亮**（＝落在日历视图）✓
- `pageerror` **0**（仅 CDN 字体请求被拦，非页面错误）。

### 五、如实登记

- ⚠ **`view` 参数名撞壳协议**：初版用 `?tab=activities&view=calendar`，真机测得**壳把 `view` 当旧协议参数消费掉**（`components/shell/workspace-shell.js:512-522`，`view=activities` 是既有语义）⇒ 承载页读不到；**改用 `subview`**。**两轮真机才证实**（第一版还踩到「壳清 URL ⇒ 页签后续重渲染读不到」⇒ 补「一次性消费 ＋ 粘住」）。
- ⚠ **本批戳连跳三档**（`20261004e → f → g → h`）：系「先 bump、后修正」所致，非三次独立改动。
- ⚠ **`活动日历` 现为四台共用**（org / prop / disc / leader）；成员台撤页签后，**「每人都有活动日历」的承载改由「活动动态 → 日历视图」满足**——与 2026-09-30 裁定**不矛盾、是细化**（`D-762` ①）。
- ⚠ **（丁）归属可转移一行未动**（`D-761` ③ 架构级，单独立项待认方向）。
- ⚠ **母本 / 职责表述未动**（本次未涉 `content/**`）。
- ⇒ **批次 372 起继续**（支书台 → 党委台 → 全站收口）。

## 批次 373（2026-10-04 · `D-765`）**支书台 ＋ 组长台 ＋ 组件复用纪律 · 落地**（`#10` 按对象归位 · 组长/副组长行内管理 · 「其他组」只读分段）

> **来源**：`D-764`（批次 372 出表 ＋ 立据）的五条施工单 ＋ `D-764` Q3 已圈。**开工前三处拿不准项上呈**（`D-764` 施工单文字与母本 / 既有设计相抵）⇒ 支书两轮 5 问圈定：① **乙**（项目赋权整卡搬「活动管理」）② **乙**（清单行内「设 / 改」开同一面板）＋ **新诉求「副组长赋权」圈甲**（同列双身份、1–2 名不定）＋ **撤销圈甲**（行内）③ **甲**（组长台加「其他组」只读分段）。

### 一、落地明细（逐项）

1. **① 支书台按对象归位**：`group-progress-tab.js` 撤「党小组活动」分区（`_groupActivitySectionHtml` / `_renderGroupActivities` / `#gp-group-activities` / `.gp-new-activity` / `#gp-activity-auth-host`）；`calendar-tab.js` 增设「党小组活动」卡（判据随迁＝`direction === 'bottom-up'`；`renderFilteredList` 分页）＋ 项目赋权整卡宿主 `#cal-activity-auth-host`（`mountActivityProjectAuth` 单一源不变）。**页签名 `党小组与活动` → `党小组`**（`secretary-workspace.js`；**id 仍 `group-progress`**）。`overview-tab.js`「赋权待审批」直达 `group-progress → calendar`、`tabLabels` 同步；`todo-tab.js::expandAssignPanelForTodo` **按 scope 分流** ＋ 新增 `_waitForEl`。
2. **② 组长 / 副组长行内管理**：`assign-tab.js` 撤 `LEADER_ASSIGN_HTML` 的块头 / 按钮 / 列表与 `renderAssignLeaders` / `renderAuthRecords` / `toggleAuthPanel`；`LEADER_ASSIGN_HTML` 收为 `#assign-area`；面板加**身份单选**（`input[name="assign-role"]`；**不预设默认** ⇒ 保留校验点）；新增导出 `openLeaderAssignPanel({ groupName })`；`handleConfirmLeader` 按身份 `authorize`；`selectProjectAuthKind` 改为导出。`group-progress-tab.js` 清单新增 `_leaderCellHtml`（**同列双身份** ＋ **行内撤销**）与 `_leaderAssignMap`；`mountAssignBlocks` 只挂 `mountLeaderAssign`。
3. **③ 两动作名保名 ＋ 导语**：`notification-tab.js` / `report-up-tab.js` 各加「动作」胶囊 ＋ 一句导语。
4. **④ 组长台「其他组」**：`insight-view.js` 分段集合扩为 `activity | taskforce | group`（段名「其他组」）；新增 `docs/src/components/record/other-groups-view.js`（只读别组 组员进展 / 复盘 / 考勤 / 考察，**无写入口**）；`leader/tf-view-tab.js` 改 `views = [...activityViews, 'group']`、`defaultView = activityViews[0]`。
5. **⑤ 组件复用纪律**：`CLAUDE.md` `#10` 节新增「全站纪律 · 组件复用」（范式＝批次 371 日历）。
6. **判据单一源（上移）**：`group-view.js` 新增 `groupLeadershipOf`（纯函数，分开列组长 / 副组长）＋ `groupReportRowsOf` / `reportRowStateOf` / `REPORT_DOT_COLOR`（自 `group-progress-tab.js` 上移，两处复用）；`group-progress-tab.js::_reportDot` 改用 `REPORT_DOT_COLOR`。

### 二、判据 / 台账面同源改准（8 类）

- `docs/help.html`：§2.1 表「党小组与活动」行 → **「党小组」行**（重写）＋ 活动管理行 ＋ `doc-note` 重写 ＋ `card-copy-party-group` / `card-copy-review-submit` / `card-copy-assign-leader` / `card-copy-assign-activity` / `card-copy-assign-taskforce` 五卡 ＋ §2.5 组长台「知情查看」行。
- `README-server.md`：§3.2.1 活动管理 / 党小组两行 ＋ §3.2.5 `tf-view` 行 ＋ §7.3#17 载体名单（「恰好四处」→ 十处、指针改 `:268-275`）＋ §4.20 `voteConfig` 行号 `:1241-1263 → :1304-1320`。
- `function-catalog.js`：`assign` / `ws-secretary`（顺带把页签数 **11 → 12**、补「成员流动」）/ `ws-leader`。
- `server/test/form-loop-registry.mjs`：**7 处行号**改准（`assign-tab` 321/322/323 · 531/536 · 642/643；`group-progress-tab` 833；`calendar-tab` 1291/1292/1293 · 1079/1080 · 1253；`notification-tab` 217/218/223 · 410/411；`report-up-tab` 126）＋ 常设赋权第二条 **「党小组」→「身份」** ＋ `MACHINE_FLOWS` 两条流程（`tab` 改准 / `open` 改 `.gp-assign-leader`）＋ **新增 1 条 `machine:false`〔请选择党小组〕** ⇒ `SITES_BASELINE 116 → 117`。
- `README.md`：真机台账计数 **117 处 / 15 条非自动化**。
- `server/test/doc-line-ref.test.mjs`：`R4`「副组长」载体名单 **+6** 处。
- `server/test/copy-length-guard.test.mjs`：C2 收基线（8/11 → **7/10**）· C6 收基线（4/4 → **3/3**）。
- `server/test/copy-screen-guard.test.mjs`：`secretary::党小组与活动` 从 C4_BASELINE / C4_REASON / C3_BASELINE **收基线**（屏键已不存在、两屏实测均 ≤12）。

### 三、收尾与真机

- **戳**：`20261004h → 20261004i`（bump 实测：JS **222** 个 / HTML 23 个 / CSS 2 个 / server-test 92 个）。
- **守卫**：静态守护卫子集全绿（`doc-consistency` / `doc-line-ref` / `catalog-sync` / `version-stamp` / `import-path-guard` / `dead-selector-guard` / `validation-site-coverage` / `group-view` / `timestamps-note-guard` / `copy-master` / `copy-length` / `frontmatter-freshness` / `module-load` / `hex-hardcode-guard`）＋ `copy-screen-guard` **真机 7 台逐 tab 全绿**（M1–M4）。
- **收尾（覆盖分片 · 起 3000 服务）**：`SWEEP_SHARD=1`（secretary 所在片）**773 / 773 / 0 红**；`SWEEP_SHARD=3`（leader 所在片）**806 / 806 / 0 红**。
- **真机**：支书台 **12 页签**（第 6 枚＝**「党小组」**）· 组长台 **10 页签**「知情查看」**两段＝活动 / 其他组**。

### 三之二、**顺带收口批次 371 遗留**（如实登记）

- ⚠ **`form-loop-registry.mjs` 三条 leader 真机流的 `tab` 仍写「活动管理」**（批次 371 已把该页签改名「**本组活动**」，但**该批收尾只跑了 `SWEEP_SHARD=4`**〔visitor ＋ party-committee〕、**未覆盖 leader** ⇒ **漏网**）。
- **本批被 `SWEEP_SHARD=3` 抓出**（真机报「切 tab『活动管理』超时：该按钮未进入激活态；当前 tab 条=[…,「本组活动」,…]」）⇒ 三条 `tab` 改准为 `本组活动`（`leader-write-activity` / `leader-act-subrecord` / `leader-write-activity-save`）。
- **教训**：改名/换台那批的**收尾分片必须覆盖被改台所在片**（本批即是）。

### 三之三、三处「收基线」（均为进度前进 · 非放宽）

- `copy-length-guard`：C2（`group-progress-tab` 长说明随分区迁出／改写）8 文件 11 条 → **7 / 10**；C6（原空态迁 `calendar-tab.js` 并改短 ≤30）4 文件 4 条 → **3 / 3**。
- `copy-screen-guard`：`secretary::党小组与活动`（屏键已不存在、两屏实测均 ≤12）从 C4_BASELINE / C4_REASON / C3_BASELINE **删条目**。
- `hex-hardcode-guard`：**未新增**——`REPORT_DOT_COLOR` 一度上移 `group-view.js` 被判「新文件不得硬编码色值」⇒ **改回**：色点仍留 `group-progress-tab.js`（既有基线内），`group-view.js` **不引色值**（纯逻辑域）。


### 四、如实登记

- ⚠ **页签名 `党小组与活动` → `党小组` 系施工单的直接推论**（本页只留「组」⇒ 名实须符），**施工单未逐字写改名**；若支书要求保名，一行可回退（id 始终 `group-progress`）。
- ⚠ **「项目赋权」整卡落在「活动管理」页、含「专班」选项**：系支书圈**乙**的直接结果（代价如实；换来母本「支书亦可」不破）。组织台「专班管理」的**本位**入口一字未动。
- ⚠ **`AuthStore.authorize('leader' / 'deputy-leader')` 只写审计快照、不改成员档案**（本批实读）：故清单表组长 / 副组长须**两源合并**（`groupLeadershipOf` 档案侧 ＋ `getAuthorizations()` 审计侧）；**预设（档案）无撤销入口、运行时赋权有**。
- ⚠ **`请选择党小组` 降为 `machine:false`**：党小组由行内「设 / 改」预设 ⇒ 空分支只在「支部无在册党小组」时可达（**非结构性不可达**）。
- ⚠ **母本 `content/**` 未动**：`CDF §D.1.1` 赋权入口表仍写「支书台『党小组与活动』同项入口」——**表述已过时**（入口现于「活动管理」页），只登记不改（循既有惯例）。
- ⚠ **「其他组」卡内「考察」聚合判据**用 `groupActivitiesOf`（organizer 属本组），与 `inspection.js::_activityPartyGroup`（优先 `hostGroup`）**略有差异**。
- ⇒ **批次 374–375 起继续**（党委台 → 全站收口）；**（丁）归属可转移＝架构级 · 单独立项**。

## 批次 374（2026-10-04 · `D-766`）**党委台**（单一轴 · 按下设支部筛选 · 7 → 6）＋ 甲部立 `H26.1 日志精简纪律`

> **本条起按 `H26.1` 执行**：过程与 diff **只留指针**（见 `8024106da` 之后这一笔提交），本地只留「为什么 / 拿不准 / 边界 / 量测」。

### 一、裁定与落地（指针）

- **裁定四问**（原文与含义见 `D-766`）：① **圈丙**「党委不上报，只接收 + 回复支部」⇒ `上报审批` → **`支部上报`**（`下发通知` 保名）② **圈甲** 全院治理组各页加「支部筛选」③ **圈乙** `支部配置` 并入 `支部管理` ⇒ **7 → 6** ④ **附令** 立 `H26.1`。
- **落地**：`party-committee-workspace.js`（撤 `party-config` 页签 ＋ review 改名）· **新共用件** `components/governance/branch-filter.js`（四页复用）· `review-tab.js` / `issue-review-tab.js` / `dispatch-tab.js` / `monitor-tab.js`（筛选接线）· `party-config-tab.js`（改 `mountPartyConfig()` 段落挂载）· `branches-tab.js`（页底「支部配置」卡 ＋ 两宿主 id 不变）· `CLAUDE.md`（`H26.1`）。

### 二、判据 / 台账面（指针）

见 `D-766`「判据 / 台账面同源改准（指针）」段（help · README-server · `S3` · `page-sweep` · `form-loop-registry` · `copy-screen` · e2e 3 件 · 戳 `20261004i → 20261004j`）。

### 三、量测读数

- **`SWEEP_SHARD=4`（visitor ＋ party-committee）782 / 782 / 0 红**（exit=1 仍是 Playwright `debug.log` 沙箱拦截，非测试失败）。
- `copy-screen-guard` M1–M4 **11 / 11 绿**（`party-committee::支部管理` 14.36 已登记；`::支部配置` 已收基线）。
- `page-sweep` **绿**，实测 `[普查覆盖] tab=68 引擎列表=68（其中总数>10 的 17）矩阵=4 手写表格=2`。
- 三件党委台 e2e **全绿**（`party-committee-review` 11.9s · `block-config-ui-e2e` 6.5s · `module-config-e2e` 10.0s）。
- 静态守护卫子集 ＋ `form-loop-sweep`（含真机流）**全绿**；`doc-consistency::S6/S14` 绿。
- bump `20261004i → 20261004j`（JS **223** 个 / HTML 23 / CSS 2 / server-test 92；陈旧戳 0）。

### 四、如实登记

见 `D-766` 末段四条（`page-sweep` 门槛长期低于实测〔登记为 375 单独立项〕· `BRANCH_FILTER_KEY` 被 `localstorage-key-guard` 误判为存储键故改名 `BRANCH_FILTER_STATE` · 母本 `PARTY_COMMITTEE_DESIGN.md` 仍称「上报审批」只登记不改 · 旧 `party-config` 注释字样已同步改准）。**另**：本批**首次照 `H26.1` 落盘**——执行日志不再逐项抄 diff。

## 批次 375（2026-10-04 · `D-767`）**`#10` 全站收口**（七台页签轴/序终对账 · 三类漂移机械化堵死 · `page-sweep` 门槛校准）

> **裁定与落地全在 `D-767`**——本条只留**量测读数 + 边界**（照 `H26.1`）。

### 一、量测读数

- **全量**（不设分片，七台全跑）：**775 / 775 / 0 红**（exit=1 仍是 Playwright `debug.log` 沙箱拦截，**非测试失败**）。
- `page-sweep` **绿**，`[普查覆盖] tab=68 引擎列表=68（其中总数>10 的 17）矩阵=4 手写表格=2`。
- `doc-consistency` **S1–S18 全绿**；新增 `S17` / `S18` 各带**反例自检**。

### 二、终对账脚本（一次性，未留盘）

- 用一次性脚本（`%TEMP%` 下、**不入仓库**）逐台比对「注册序 / help §2.x 表 / README-server §3.2.x 表 / flow `tab`」四路 ⇒ 抓出 3 类真漂移（详见 `D-767` 表）。
- ⚠ **脚本解析的两处已知伪差**（避免后人重踩）：README §3.2.x 把前 3 枚核心页签**并成一行**（`| 1-3 | … ★ / … ★ / … ★ |`）⇒ 逐行取首名会「少 3 枚」；help §2.7 之后**无同名小节边界** ⇒ 按标题切片会越界吃到后面章节的表。

### 三、边界（如实）

见 `D-767` 末段四条：README-server §3.2.x **仍未立机器判据**（不为凑守卫而写判不准的守卫）· §4.27「支部上报审批记录」是**数据域名**不改 · 母本一处旧表述**只登记** · `S17`/`S18` 是既有文件内新增断言（非新文件、不在 `S16` 射程变化内）。

## 批次 376（2026-10-04 · `D-768`）**乙 / 丙部清理**（支书令「已经完全落地的内容现在就全部删掉」）＋ `H31` 上移

> **裁定与落地全在 `D-768`**——本条只留**量测 + 边界**（照 `H26.1`）。

### 一、量测读数

- `REVIEW_QUEUE.md`：**1413 行 / 344,767 B → 915 行 / 258,289 B**（删 **19 个已落节**；插一节总指针）。
- `CLAUDE.md`：乙部清出四类（`#10` 批次表 11 行→1 行 · `V` 表 14 行→2 行 · 合并推进图 8 行→0 · 空排期表→一句）；甲部新增 `H31`。
- 守卫（改前 / 改后）：`doc-consistency`（含 `S12` / `S14`）· `doc-line-ref` · `frontmatter-freshness` · `timestamps-note-guard` · `catalog-sync` · `validation-site-coverage` **全绿**（改后 **40/40**）。

### 二、一次性脚本（未留盘）

- 路径：`%TEMP%` 下的 `purge376.mjs`（**不入仓库**）；**带守卫锚点断言**——删后缺任一 `S14` 锚点即 **ABORT 不写盘**。
- **闸门真拦了一次**：首跑因 3 处锚点（`已闭环：裁定 D-552` / `状态与现况` / `在册 N 条（`）判红中止；查明为**脚本自身正则漏 `m` 标志**（非真缺锚点）⇒ 修正后通过。**这是「防误删闸门有效」的实证**。
- 备份：改前副本留 `%TEMP%\RQ.bak.md`（**未入库**）。

### 三、边界（如实）

- **`SOP 逐章评议 · 阶段 A/B` 两节约 600 行仍在**（内文已全是「`> **已闭环**：裁定 …」指针行，阶段 B 官方口径＝**全部已裁**）⇒ **可再清**，但 `S14` 的计数锚点在其中 ⇒ **须与计数口径同批改**，登记为下一批。
- 母本就地改准 / `SOP-B-25` ② 派单 / （丁）归属可转移：**本批只立项登记**，实施留后续批（乙部已清到只剩这三件）。

## 批次 377（2026-10-05 · `D-769`）**母本就地改准（甲）＋ content 历史负担清理（乙）**（＋（丁）三答立据）

> **裁定与圈定全在 `D-769`**——本条只留**量测 + 边界**（照 `H26.1`）。

### 一、量测读数

- 母本改准：**11 份 `content/**`** 的 UI 旧页签名改准（**行数中性**）；`README-server.md` 对 `DATA_MODEL.md` 的 ~45 处行号引用**零位移**。
- 历史负担清理：`MODULE_UI_DESIGN.md` **−328 行**（§四 规划稿整节）· `DATA_CONSISTENCY_CHECKLIST.md` **−104 行**（手动检查清单及其后）；两处原位留指针。
- 指针重指：1 处文档（`DESIGN_SYSTEM.md` → §4.10.1）＋ 5 处代码注释（`org-workspace.js` · `org/member-flow-tab.js` · `party-committee/monitor-tab.js` · `secretary/work-map-tab.js` ×2）。
- `R-83` 刷卡：11 份 frontmatter ＋ `.ctx/TIMESTAMPS.md` 11 表行 → `2026-10-05`。
- 戳：`20261004j → 20261004k`（JS 223 / HTML 23 / CSS 2 / server-test 92）。

### 二、守卫读数

- `doc-consistency`（S1–S18）· `doc-line-ref`（R1–R6）· `frontmatter-freshness`（F1–F3）· `timestamps-note-guard`（N1–N7）· `link-integrity`（L1–L5）＝ **39/39 / 0 红**。
- `test:fast` ＝ **144/144 / 0 红**（`V1` 候选 116 / 未登记 4 持平）。
- `version-stamp` · `module-load` · `page-sweep`（阈值 68）＝ 全绿。

### 三、一次性脚本（未留盘）

- `%TEMP%\purge377.mjs`（**不入仓库**）：删 §四 / 手动清单；**EOL 按文件实测保留**（MODULE_UI_DESIGN＝LF · DATA_CONSISTENCY_CHECKLIST＝CRLF）。
- `%TEMP%\stamp377.mjs`：11 份 frontmatter ＋ 11 表行同日刷。

### 四、边界（如实）

- 清理面**只限「已执行的规划稿 ＋ 已守卫覆盖的手抄清单」**；`MODULE_UI_DESIGN` 一/二/三节与 `DATA_CONSISTENCY_CHECKLIST` §0–§16 **一字未动**。
- `REVIEW_QUEUE` 的 `SOP 逐章评议 · 阶段 A/B` 约 600 行**仍在** ⇒ 留批次 380。
- （丁）归属可转移（甲/甲/乙）＝**本批只立方向**，实施另批（批次 379）。

## 批次 378（2026-10-05 · `D-770`）**`SOP-B-25` ② 派单落地**（「制度内容（领域）→ 对应主体」判据进系统）

> **裁定与落地全在 `D-770`**——本条只留**量测 + 边界**（照 `H26.1`）。

### 一、量测读数

- 判据单一源：`work-map.js` 追加 `INSTITUTION_DOMAINS`（4 行）＋ `INSTITUTION_COLLECTIVE_SUBJECTS`（4 行）＋ `institutionSubjectOfDomain()`。
- 承载/界面：`branch-doc.js` 存 `domain`（**行数中性**）· `references.js` 写入浮窗**必选领域** ＋ 制度行显示「起草与监督：<主体>」。
- 台账：`form-loop-registry` ＋1 校验点（`SITES_BASELINE 117 → 118`）＋ 5 处行号改准 · `README.md`（118 / 103 / 15）· `README-server §4.42` ＋`domain` 行 · `BRANCH_WORK_MAP.md` 制度行 ＋派单口径 · `REVIEW_QUEUE` 在册 **1 → 0**（六处同源 ＋ 节清出，正文逐字迁本文件附节）。
- 戳：`20261004k → 20261004l`（JS 223 / HTML 23 / CSS 2 / server-test 92）。

### 二、守卫读数

- `form-loop-sweep`（S0–S7 ＋ 60 条真机闭环 ＋ 17 条真机成功路径）＝ **85/85 / 0 红**（含 `page-refs-doc-write` / `page-refs-publish-version`）。
- `work-map` / `doc-consistency`（S1–S18）/ `validation-site-coverage` / `import-path-guard` / `module-load` ＝ **33/33 / 0 红**。
- `test:fast` ＝ **144/144 / 0 红**；`copy-screen-guard` ＋ `copy-anchor-guard-e2e` ＝ **14/14 / 0 红**。

### 三、边界（如实）

- **派单为「归属 ＋ 呈现」层**：「按主体派生待办 / 改派工作流」**未做**（写权沿用既有限制、系统无「制度起草」待办 kind）。
- 草案三项未定（领域边界 / 跨领域 / 副支书单列）**照草案原样落**；旧制度数据无 `domain` ⇒ 显示「未登记」、**不回填**。
- `SOP-B-25` 三项（① 批次 129 · ② 批次 378 · ③ 批次 141）全落 ⇒ 移出在册，**`SOP-B-*` 系列全清**。

### 附：`SOP-B-25` ②「表草案」与四项未定事项原文（自 `REVIEW_QUEUE.md` 迁出 · 逐字）

> 2026-10-05 批次 378（`D-770`）：`SOP-B-25` ② 落地后按 `H50.1 §3` 从队列清出本节正文；下表与四问**逐字**留在本附节（`R-84` / `R-86`）。

### SOP-B-25（**部分落地（系统侧 · 2026-09-21 批次 129 · 裁定 `D-555`）：① 开关已落地 · ② 派单：**表草案已出（2026-09-21 批次 135）· 待支书改** · ③ **两个模块的缺省主责已落（2026-09-22 批次 141 · `D-573`）**——「意见反馈处理」「制度制定与迭代」的缺省主责改准为「**支委会**」（**组织型主体**，类似法人、不是自然人）；⚠ **表仍待支书改、全套派单逻辑未动**）制度建设：分档开关写「是否报送党员大会」+ 任务按条条职责归对应委员（C-36 / C-37）

> **来源**：支书 2026-09-17 对 `SOP-C-36` / `SOP-C-37` 的裁定原话——`SOP-C-36`「**系统加分档，但是不用 重要和其余 来区分，而是 是否报送党员大会 即可**」；`SOP-C-37`「**改系统，按条条职责归对应委员（推荐）**」（命题与裁定见 `.ctx/logs/2026-09-DECISION_LOG.md` 搜命题编号 `SOP-C-36` / `SOP-C-37`）。**② 的起草指令（2026-09-21 批次 135 · 逐字）**：「**你先起草 表草案。我要求你明确在文本中把 支委会 作为一个 【主体】**」。
> **性质**：**需求与口径登记**——只写「**要什么**」，**无字段名、无表结构、无技术参数**。**① 已落地（批次 129）**；**② 表草案已出（批次 135）、待支书改**。

- **要什么（分档开关）**：制度决策**不用「重大 / 其余」两档判断**，改用一个「**是否报送党员大会**」的开关——**由支委会审议时确定**是否报送：报送则上党员大会表决，不报送则由支委会审议通过。⇒ **✅ 已落地（2026-09-21 批次 129 · `D-555`）**：开关＝**支委会审议时在议程项上勾的一个标记**，**门控「能否当场成为现行版」**（不勾＝支委会通过即现行版；勾了＝转「待党员大会表决」，由支部党员大会议程定终局）。**裁定 / 落地 / 真机证据**：`D-555`；`.ctx/logs/2026-09-EXECUTION_LOG.md` 批次 129。
- **要什么（执行者）**：制度**起草与监督按条条职责归对应委员**（组织 / 宣传 / 纪检各自的制度由对应委员承担），**不再一律派组织委员**。
#### 📄 表草案：「制度内容 → 对应主体」（**草案 · 待支书改**，2026-09-21 批次 135 起草）

> ⚠ **这是草案，不是已定件；未据此改任何系统派单**（系统侧等表定了再落）。**「支委会」在表内是一个能承担责任的独立【主体】，不是「由哪些人组成」的集合**（依支书起草指令逐字要求）。
> **表怎么用**：给定制度内容所属领域 ⇒ 找到对应主体 ⇒ 该主体承担这条制度的**起草与监督落实**；**定稿与生效**另有它自己的一格（见「制度审议与认定」行）。

| 制度内容（领域） | 对应【主体】 | 该主体承担什么 | 依据 |
|---|---|---|---|
| 组织建设类：发展党员各环节、名册与阶段管理、专班与赋权、党小组设置 | **组织委员** | 起草与监督落实 | 定人定责 §2.1 条条职责「发展党员的考察与材料准备」· §3.2「发展党员的考察与材料准备、考察档案体系建立」 |
| 宣传与档案类：宣传材料产出与归档、档案合规、模板管理、周报 | **宣传委员** | 起草与监督落实 | §2.1 · §3.2「宣传与档案制度建设及队伍建设」 |
| 纪检类：考勤、补课、考察、活动监督复盘、意见渠道维护 | **纪检委员** | 起草与监督落实 | §2.1「考勤管理（含补课分段）· 考察管理 · 活动监督复盘」· §3.2「补课制度执行与意见建议反馈渠道维护」 |
| 支部全局与综合类：支部工作计划、支委会议事与工作规则、上级部署的落实办法 | **支书** | 起草与监督落实 | §3.1 支书「制定支部工作计划、检查工作执行情况」· §5.1 定人表「召集支委会 → 支书」 |
| **制度审议与认定**（是否成为现行版、是否报送党员大会表决） | **支委会** | **审议并作出认定**——通过即成现行版（勾「报送党员大会」则转党员大会表决后生效）；未通过退回起草人修改 | 《常见工作场景快速指南》§制度制定与迭代 步骤 5「支委会审议（支委会全体）」/ 步骤 7「决定是否报送党员大会（支委会）」· §5.3 定岗表「制度建设 → 决策机制＝支委会审议；是否报送支部党员大会表决，在审议时确定」· `D-555` |
| 品牌认定（认定属制度性口径，非个人裁量） | **支委会** | **通过后确定**（提案权＝支委 / 党小组组长） | 定人定责 §2.2「品牌由支委/党小组组长提案、支委会（有党小组组长参会即支委扩大会）通过后确定」· `D-559` |
| 意见建议处置 | **支委会** | **处置**（支书主持支委会） | CDF §C.1b 注 · `D-301` / `D-412` |
| 发展党员（集体决策事项） | **支委会** | **集体决策**（组织委员承担其中的考察与材料准备） | §5.1 定人表「发展党员 → 主责人＝支委会」＋其下注「必须集体决策，不落实到具体个人」 |

- ⚠ **「支委会」那一行写的是什么**：它承担 **制度审议与认定 · 品牌认定 · 意见建议处置 · 发展党员集体决策** 四类「集体决策」责任——**不是「五个人各自分工」的代称**；**表中同一件事不会同时挂到「支委会」与某个委员两条上**（委员是起草与监督落实，支委会是认定）。
- ⚠ **未定 / 请支书改的地方（4 处，AI 不代填）**：① 上表「领域 → 主体」的**边界**（如「考勤时限」类制度算纪检类还是支部全局类）；② **跨领域制度**（同时涉两个委员）怎么定主责；③ 上表**未列「副支书」**（母本 `SYSTEM_ROLE_PERMISSION` §9b 副书同权——本表按「领域」列主体、不按「人」列，**是否要为副支书单列一行，请支书定**）；④ **表定了之后**系统侧那条缺的「制度内容 → 对应主体」判据**怎么落**（本批不动）。

- **⚠ ② 现状（重新取证 · 2026-09-21 批次 135；**2026-09-22 批次 141 复核并改准一处**）**：**系统里仍没有「制度内容 → 对应委员 / 主体」的判据**（**领域 → 委员**那一层）——`docs/src/core/domain/work-map.js` 的模块 `rule-making` 主责**已由批次 141（`D-573`）改准为「支委会」（组织型主体，不是某个委员）**，**「起草与监督按条条职责归对应委员」仍未落**；`docs/src/core/domain/constants.js` 的 `COMMISSIONER_ROLES` 只是角色集合、**无领域映射**。⇒ **表定了才能落系统**。
  - **批次 141 进展（如实登记）**：「**把职责从个体支委明确给到【组织】**」这一层**已落**——系统新增**组织型主体**（`work-map.js::ORG_SUBJECTS`，`ownerType:'org'`），并把「意见反馈处理」「制度制定与迭代」两个模块的**缺省主责**改准为「支委会」；**只改这两个模块的缺省主责**，**未据此改全套派单逻辑**（改派面 / 负责人下拉一字未动）；**支委会不是角色键、不能登录**（不进 `ROLE_KEYS` / 不进身份→页面映射 / 与角色键取值不重叠；真机三证见 `.ctx/logs/2026-09-EXECUTION_LOG.md` 批次 141）。
  - **要您定什么（一句话）**：**改上表**（领域边界 / 跨领域 / 副支书是否单列 / 落法），**改完再落系统派单**。制度文本的写权**沿用既有** `INSTITUTION_MANAGER_ROLES`（支书 / 副支书，未放宽）。
  - **依据 / 取证**：`D-491`（批六停下）· `D-554`（批次 128 取证：制度任务拓扑已由批次 82 清掉）· `D-555`（批次 129，① 落地）；逐处 `文件:行号` 见 `.ctx/logs/2026-09-EXECUTION_LOG.md` 批次 128 / 129 / 135。

- **⚠ 顺带核实的工程事（2026-09-21 批次 135 · **2026-09-23 批次 158 改准**）**：**当时**「支委会」在系统里**不是一个主体**——它是**两样东西**：① **一组角色**（`constants.js::BRANCH_COMMISSION_ROLES` 五个**个人**角色键 `secretary` / `deputy-secretary` / `org-commissioner` / `prop-commissioner` / `disc-commissioner`，权限门一律按这五个键判）；② **一个会议类型**（活动 `type='支委会'` / `scenarioId='branch-committee'`）。**当时的结论**＝「支委会是独立主体」只活在母本文字里、系统里无对应物 ⇒ **本批停下上报、未自作主张改权限模型**。⚠ **该结论已被 2026-09-22 批次 141（`D-573`）推翻**：系统**已新增「组织型主体」**（`work-map.js::ORG_SUBJECTS` 含 `branch-committee`、`ownerType:'org'`），「意见反馈处理」与「制度制定与迭代」两模块的缺省主责**已改准为「支委会」**（见上行「② 现状」与本文件 `SOP-B-25` 标题）；**仍未变的半句**＝**支委会不是角色键、不能登录**（不进 `ROLE_KEYS` / 不进身份→页面映射 / 与角色键取值不重叠）。
- **母本侧**：`常见工作场景快速指南.md` 两处已按本项去掉「重大 / 其余」口径（`:310` · `:319`，见本文 `SOP-D-1` 的 `D-1-⑥`）；**批次 129 复核：母本与本项同向、未再改动**；`支委与党小组定人定责定岗说明.md:231` 同款已改准。**批次 135 复核：母本已含上表所需的全部依据句（§2.1/§3.1/§3.2/§5.1/§5.3 ＋ 快速指南 §制度制定与迭代），故本批「母本一字未动」——表是草案、不进母本。**
- **⚠ 本项已由「只登记需求与口径、未改任何代码」变为「① 已落地（批次 129 · `D-555`）」、再变为「② 出表草案（批次 135）**——本项**只登记需求与口径**（**无字段名、无表结构**）这一性质不变；**表草案亦不用于改系统派单**。

## 批次 379（2026-10-05 · `D-771`）**（丁）归属可转移 · 真转移落地（一次推全站）**

> **裁定与落地全在 `D-771`**——本条只留**量测 + 坑 + 边界**（照 `H26.1`）。

### 一、量测读数

- 判据单一源：`work-map.js` 追加 `TRANSFERABLE_TAB_ROWS`（**复合键** page × id × modules[] · 4 行 / 3 台）＋ `transferRowOf()` ＋ `transferTabDecision()`（`granted` / `revoked` / `pinned`）。
- 派生落点：`workspace-shell.js` 新增 `applyTabTransfer()`（撤下 / 迁入）＋ `_homeTabDef()`（取原台**声明常量**）＋ `TRANSFER_HOME_DECLS`（三台声明单一源）。
- 三台声明提为导出常量：`ORG_WORKSPACE_TAB_DECLS` / `DISC_WORKSPACE_TAB_DECLS` / `LEADER_WORKSPACE_TAB_DECLS`（`tabs()` 改为消费它）。
- 台账：`work-map.test.mjs` ＋1 断言块（复合键 / 缺省 / 改派 / person / 组织型主体 / page 白名单）。
- 戳：`20261004n → 20261004p`（p 为修「取 `tabs()` 失效」后）。

### 二、真机读数（真 Chromium ＋ 真 3000 服务）

- **缺省**：组织台含「专班管理」· 支书台不含 · `page-sweep` **tab=68**（七台逐台绿）。
- **改派 `taskforce → secretary`**：组织台撤下 / 支书台迁入 / 复位还原 · `pageerror` 0。
- **改派 `attendance-inspection → secretary` ＋ `theme-party → secretary`**：纪检台撤下「考勤管理 / 考察管理」；组长台那两条**仍在**（未入表职责位）；支书台迁入两条 ＋「本组活动」；复位还原 · `pageerror` 0。

### 三、坑（如实）

- **首版用「调原台 `tabs()`」取定义 ⇒ 迁入静默失效**：组长台 `tabs()` 是**查看者上下文相关**的（`_isOrganizerFallbackEntry()` ⇒ 在支书台上下文里返回「只有两个上传位」）⇒ `write` 取不到。
  **修法**＝把三台声明提为**导出常量**、迁入统一读常量（**不调 `tabs()`**）；并把这层理由写进 `LEADER_WORKSPACE_TAB_DECLS` 头注。
  **教训**：「跨上下文复用某台的定义」时，**不能假定它的取数函数是纯的**。

### 四、边界（如实）

- 「本组活动」一行承三模块（主题党日 / 共建活动 / 党小组会）⇒ 取「**任一模块归我即保留**」语义（**本批择定**）：只改派 `theme-party` 时组长台仍留、支书台也长出。
- **未入表**者不受影响：各台职责 / 上传位（如组长台「考勤管理」）、`我的处置`、`支委会`（入口壳）、各台 `知情查看`（只读下游视图）。
- `help.html §2.x` 与 `README-server §3.2.x` 记的是**缺省基线的页签集**、**未改**（转移后页签集随改派变化 ⇒ 口径为「注册基线」）——登记。
- 探针 `server/.tmp-probe379{,b,c,d}.mjs` **跑完即删**（不留盘）。

## 批次 380（2026-10-05 · `D-772`）**`REVIEW_QUEUE` 阶段 A/B 已闭环条清出**

> **裁定与落地全在 `D-772`**——本条只留**量测 + 判据 + 边界**（照 `H26.1`）。

### 一、量测读数

- `REVIEW_QUEUE.md`：**885 → 666 行**（清出 **48 个 `### SOP-*` 小节 / 223 行**）。
- 判据（机器可复核）：逐小节扫正文，**命中** `待定 / 待裁 / 请支书 / 待您定 / 未做 / 待批 / 留核 / 不建 / 停下 / 待复核` **任一 ⇒ 留**；否则清出。
- 原位补**两条指针**（阶段 A「收官」段后 · 阶段 B「状态与现况」段后）：清出判据 / 仍留者 / **命题↔裁定号索引去向**（`.ctx/logs/2026-09-DECISION_LOG.md` 搜命题编号；落地证据见执行日志批次 82–162）。
- 戳**不 bump**〔只改 `.ctx` 的 md〕。

### 二、守卫读数

- `doc-consistency`（**S1–S18**）＝ **18/18 / 0 红**——**`S14` 一字未动**（其锚点：在册 / 逐条归组现况 / 机器判据提示 / 状态与现况 / 合计 ＋ `D-552` 锚点 ＋ 6 处「与在册计数的关系」**全在保留集内**）。

### 三、边界（如实）

- 按**语言判据**清出、**未逐条人工重读**；判据**偏保守**（含「未做 / 待定」等词者一律留）⇒ **宁留不误删**。仍留在队列的活条目示例：`SOP-B-8` 四处待定项 · `SOP-B-25`「按主体派生待办未做」边界 · `SOP-F-5` ⑥ 待支书定 · `SOP-G-1` / `SOP-G-2` 迁出指针 · `SOP-E-1` ① 待裁。
- **命题 ↔ 裁定号索引**不再驻留队列（按 `R-86` 本就该如此）；索引能力由 `.ctx/logs/2026-09-DECISION_LOG.md` 承接。
- 清出脚本 `%TEMP%\purge380.mjs`（**不入仓库**）；改前副本留 `%TEMP%\RQ380.bak.md`（**未入库**）。

## 批次 381（2026-10-05 · `P.15` 阶段 B 第 5 批 · `D-773`）**指南第 11–14 章四列对照 ⇒「入口＝指南」14 章全过（阶段 B 指南部分收口）**

> **来源**：阶段 B 第 4 批（批次 58）收官列明的「未跑」项——「指南第 8–14 章及另外五份母本」；本批续 **第 11–14 章** ⇒ **`常见工作场景快速指南` 14 章全部过完**（阶段 B 对**入口文档**的部分**收口**）。
> **单元**：`content/02_institution/sop/常见工作场景快速指南.md` 第 11 章「意见建议反馈」`:416`-`:451` · 第 12 章「按角色查找」`:456`-`:468` · 第 13 章「按工作类型查找」`:470`-`:481` · 第 14 章「延伸阅读」`:485`-`:493`（**行号本批 Grep 实测**）。
> **性质**：**只读 + 只落账**——未改任何 SOP 母本 / `content/**` / 代码 / 测试；改动只在 `.ctx` 两文件（本文件 ＋ `REVIEW_QUEUE.md`）。
> **约束执行**：系统实际做法**一律指到 `文件:行号` / 守卫名 / 真机流程名**；指不到的一律写「缺」或「单侧不可比」，**不写「应该是」**。
> **覆盖账目（实测）**：四章共 **38 个动作** ⇒ **一致 21 · 走样 12 · 缺 5 · 多 0 · 单侧不可比 0**（21+12+5 = **38 ✓**）。逐章：第 11 章 **12**（一致 5 / 走样 4 / 缺 3）· 第 12 章 **10**（一致 3 / 走样 6 / 缺 1）· 第 13 章 **9**（一致 6 / 走样 2 / 缺 1）· 第 14 章 **7**（一致 7）。**不一致共 17** ⇒ 按同根合并为 **9 条待裁命题 `SOP-C-72`…`SOP-C-80`**。

---

**一、第 11 章「意见建议反馈」（`:416`-`:451`）—— 12 个动作**

| SOP 原文（逐字 · 行号实测） | 系统实际做法（证据可指） | 判断 | 若是走样：哪句话被读成了什么 / 别的读法 |
| --- | --- | --- | --- |
| `:418`「**适用角色：** 所有支部成员」 | `README-server.md:190`-`:191`（普通成员基础键 7：`issue.create`/`comment`/`reaction`/`mention`/`reference`…）；`docs/src/entries/pages/feedback-entry.js:62`-`:65`（未登录跳 `login.html`）；`docs/help.html:1292`「支部成员提交」 | **一致** | 附限定：**需登录**；匿名仅对外展示、真身党委可查。 |
| `:422`「**联系人：** 支书」 | 处置权**已放开到支委层五角色**：`server/routes/resources/index.js:519`（`ISSUE_DISPOSITION_SET = BRANCH_COMMISSION_ROLES`）·`README-server.md:122`·`:271`（处置键 8 · 五角色 Y）；`docs/src/entries/tabs/secretary/feedback-tab.js:114`（支书/副支书审核口）；`docs/src/services/governance/notice.js:594`-`:596`（`canSendDirectMessage`） | **走样** | 「**联系人＝支书**」被读成「**对接与处置恒为支书**」——系统实际是**支委层五角色集体处置**，且**成员无法定向私信支书**。**别的读法**：只指「审核公开这道门归支书 / 副支书」⇒ 此读法下与 `feedback-tab.js:114` 一致。 |
| `:425`「1. 通过"意见建议反馈平台"（收集到的线索**第一时间转交支委会**，由支书主持处理）」 | 平台在（`docs/feedback.html` · `docs/src/components/shell/sidebar.js:52`）；**无「第一时间自动转交」**：提交先入**草稿**、支书/副支书点通过才公开（`docs/src/components/feedback/issue-form.js:119` · `docs/src/services/governance/issues.js:447`·`:525` · `docs/help.html:1295`·`:1301`）；**上会靠手动勾选**（`docs/src/entries/tabs/secretary/agenda-form.js:157`-`:171` · `docs/src/entries/pages/party-committee-meeting-entry.js:258`-`:262`） | **走样** | 「收集到的线索**第一时间转交支委会**」被读成「**先入草稿、支书审核后才公开；上会须支书手动从「拟上会」清单勾选**」。**别的读法**：「转交支委会」可读作**审核门本身**（支书/副支书把关）⇒ 则只剩「非自动」一处差。 |
| `:426`「2. 直接向支书反馈」 | 站内信通道**在**（`docs/src/services/governance/notice.js:601` `listMyMessages` ·`:620` `sendDirectMessage` ·`:652` `replyToMessage`；`docs/messages.html` ＋ `docs/src/entries/pages/messages-entry.js`），但**发送权**＝支委层 ∪ 组长（`notice.js:594`-`:596`；`messages-entry.js:109`·`:117`·`:119` 文案「写私信限支委层与党小组组长」；服务层 `notice.js:627` 再拒） | **走样** | 「**所有成员**可直接向支书反馈」被读成「**只有支委层与党小组组长**能发起私信」。**别的读法**：渠道 2 指「**当面向支书口头反映**」（线下行为）⇒ 则该条不在系统承载范围（单侧不可比）。 |
| `:427`「3. 在支部大会上提出」 | **全仓 0 命中**（搜 `大会提出` / `会上提出` / `支部大会 意见`：仅命中所评母本自身与发展党员细则）；支部党员大会是**活动**（`branch-party-meeting`），议程行是支书/组长填的**自由文本**（`docs/src/.../inspector.js:1295`），成员**无「在会上提意见 → 记为反馈」链路**；`docs/help.html:750`-`:761`·`:764`-`:776` 只讲支书编排议程与表决 | **缺** | —（制度有系统无） |
| `:432`「提出意见 → 支书统一收集 → 线下座谈或线上讨论 → 支委会讨论制度修改 → 反馈结果」 | **分段承载（线上腿完整）**：提出＝`issues.js:410`（`submitIssue`）· 支书统一收集＝草稿审核（`issues.js:447`·`:525`）· 线上讨论＝公开 issue 评论时间线（`docs/src/components/feedback/issue-detail.js:219`-`:237`·`:251`-`:258`）＋支委会会议页「线上召开」（`party-committee-meeting-entry.js:167`·`:186`，效力口径 `:414`-`:424`「线上与线下完全同等效力」）· 支委会讨论制度修改＝`draftDoc` 拟上会类（`agenda-form.js:110`·`:177`-`:188`）＋支委会 `deliberative` 表决（`docs/src/services/activity/vote-config.js:16`-`:20`·`:43`-`:45`）· 反馈结果＝「正式答复」（`feedback-tab.js:493`·`:578`-`:587`）＋ 关闭（`feedback-tab.js:532` · `issues.js:681`-`:692`） | **一致** | 依据：上列（**任务级 + 展示层**）。**线下座谈无系统载体**（`help.html:776`「线下开会默认不写表决配置」），但母本本身即「**线下座谈 *或* 线上讨论**」二选一 ⇒ 不构成缺。 |
| `:435`「**职责界定：** 意见建议由支书统一收集，处置归支委会、由支书主持支委会……**其他支委（含纪检委员、组织委员）不干预处理过程，仅在支书明确安排下提供辅助。**」 | 「处置归支委会」✓（`index.js:519` · `README-server.md:122`·`:271`）·「线上讨论承接」✓（`issue-detail.js:251`-`:258`）·「制度修改由支委会讨论、结果由支委会反馈」✓（`feedback-tab.js:578`-`:587`）；**「支书主持支委会」无系统抓手**（无主持门 / 签发门）；**末句被系统直接违反**——纪检委员（`README-server.md:166`·`:271`「＋处置键 8」）与组织委员（`:144`·`:271`）**均持 8 个处置键**，可**直接指派 / 关闭 / 终审**，**无需支书安排** | **走样（关键句）** | 「**其他支委不干预、仅在支书明确安排下辅助**」被读成「**支委层人人可独立处置、无「仅辅助」门**」。**别的读法**：该句可读作「支委会**集体处置** ＝ 各支委以委员身份履职」⇒ 此读法下与系统一致，但系统确实**没有「须支书明确安排才可动手」的闸**。 |
| `:441`-`:444` 类型表四行（制度建设建议→支委会讨论制度修改→下次支委会后 · 活动组织建议→支书转相关党小组组长处理→1周内 · 工作流程建议→支书提交相关条条委员研究→2周内 · 其他建议→支书提交支委会研究→1个月内） | **逐条逐字实现**：`docs/src/services/governance/issues.js:1244`-`:1249`（`ISSUE_DOMAINS`：`institution`→`支委会（讨论制度修改）`/`下次支委会后` · `activity`→`相关党小组组长`/`1周内` · `workflow`→`相关条条委员`/`2周内` · `other`→`支委会（研究）`/`1个月内`）；该处注释 `:1230`-`:1242` **明写照母本 `:439`-`:444`**；三处呈现（`issue-form.js:72`-`:76` · `feedback-tab.js:367` · `issue-detail` 元信息区 · `docs/help.html:1295`） | **一致** | 附注：「反馈时间」列在系统里**只作 `replyHint` 文本呈现**（`issue-form.js:126`-`:128`），**无到期提醒 / 催办门**（反馈无 deadline 字段），且**不设流转门**（`issues.js:1242`）。 |
| `:448`「支部**鼓励**党员和积极分子提出建设性意见」 | **无专门载体**；最接近＝提交权对全员开放（`README-server.md:190`-`:191` · `help.html:1292`）＋匿名选项——但那只承载「**可提**」，不承载「**鼓励**」这一价值倡导 | **缺** | —（制度有系统无；搜 `建设性`：仅母本与两份 SOP，系统零命中） |
| `:449`「意见建议要**具体**，避免过于笼统」 | **无「具体性」校验**：表单必填仅 `title`/`body`/`scope`/`types`/`domain`（`docs/src/components/feedback/issue-form.js:98`-`:106`），无字数或「笼统」判定，也无针对笼统的驳回话术 | **缺** | —（制度有系统无；搜 `过于笼统` / `避免笼统`：系统零命中） |
| `:450`「制度修改由**支委会讨论、党员大会最终表决**，各环节由支书主持」 | 支委会讨论＝`draftDoc` 拟上会类（`agenda-form.js:110`·`:177`-`:188`）＋ 支委会 `deliberative` 表决（`vote-config.js:16`-`:20`·`:43`-`:45`）；**党员大会最终表决**＝制度链 `pending-party-meeting` 态另立 `partyVote` 类（`agenda-form.js:111`·`:181`-`:188`）＋ 支委会会议页「报送党员大会表决」勾选（`party-committee-meeting-entry.js:391`-`:405`）＋ 支部党员大会 `formal` 正式表决（`vote-config.js:21`-`:25`·`:40`-`:42`）；各环节支书主持＝支书创建 / 汇总 / 记录决议（`help.html:768`·`:773`） | **一致** | 依据：上列（**任务级 + 制度源**）。 |
| `:497`「**使用反馈：** ……通过网页系统的公开 issue 提交（由支委会处理、支书主持支委会，**可指派他人处理**）」 | 提交＝`issues.js:410` / `docs/feedback.html`；处理＝支委会（`index.js:519`）；**「可指派他人」有明确承载**——`feedback-tab.js:282`-`:288`（指派目标含支书处置 / 组织 / 宣传 / 纪检委员与各党小组组长）· `issues.js:599`（`assignIssue` 写 `assignee`/`assigneeRole` ＋ `dispatchHistory`）· `issues.js:627`-`:629`（自动通知被指派人）· 被指派人于各台「我的处置」办理（`docs/src/components/feedback/issue-dispatch-view.js:115`-`:219` ＋ 五台薄壳） | **一致** | 附注：① 「公开」的是**审核后的结果**（`issue-form.js:119`），非提交通道本身；② 「支书主持支委会」同 `:435` 行**无独立闸门**。 |

**二、第 12 章「按角色查找」（`:456`-`:468`）—— 10 个动作**（1 ＝ 该**查表能力**本身 ＋ 9 ＝ 表内 9 行）

| SOP 原文（逐字 · 行号实测） | 系统实际做法（证据可指） | 判断 | 若是走样：哪句话被读成了什么 / 别的读法 |
| --- | --- | --- | --- |
| `:456`-`:468`「按角色查找」表**本身**（角色 → 常用场景） | **系统无同构入口**（全仓搜 `按角色查找`：仅本母本与 `.ctx`）；最接近两处**均不同构**——`docs/help.html:302` §0.2「角色 ↔ **工作台**映射」（表 `:305`-`:319`，列＝角色｜说明｜**登录直达**）· `:411` §2「角色**工作台导览**」（表 `:418`-`:558`，列＝tab｜给谁用｜这页做什么｜怎么做） | **缺** | —（系统有「角色→工作台 / 角色→tab」两类导览，**无「角色→常用场景」**） |
| `:460`「\| 支书 \| 活动与品牌：**主题党日**；制度与日常事务：主持支委会（品牌认定、意见建议反馈）、积极分子考察 \|」 | 支委会开会主责＝`secretary`（`docs/src/core/domain/work-map.js:109`）· 反馈处置主体＝支委会「支书主持支委会」（`work-map.js:202`-`:209`）· 品牌认定→支委会（`work-map.js:394`）· 发展党员→支委会（`work-map.js:164`）；支书台 12 tab（`help.html:418`-`:444`）；**主题党日缺省主责＝党小组组长**（`work-map.js:134`；支书仅支部级 / 跨组例外 `:140`-`:141`） | **走样** | 「支书｜**主题党日**」被读成「支书**主责**主题党日」；系统缺省 `defaultOwner='leader'`（支书可写全支部活动 `help.html:427` 但**缺省归组长**）。**别的读法**：该行指支书作「**支部级 / 跨组发起**」的例外角色。 |
| `:461`「\| 副支书 \| 活动与品牌：主题党日；制度与日常事务：积极分子考察 \|」 | 与支书**共台同权**（`docs/help.html:309`·`:444`；`docs/src/core/domain/constants.js:186` `deputy-secretary`） | **一致** | — |
| `:462`「\| 党小组组长（块块） \| 活动与品牌：主题党日、**品牌培育观察**…… \|」 | 主题党日主责＝`leader`（`work-map.js:134`）· 党小组会＝`leader`（`:118`）· 共建活动＝`leader`（`:151`）；组长台「本组活动 / 考勤 / 考察 / 组员进展」（`help.html:526`-`:529`）；**「品牌培育观察」无独立动作位**——系统只有「品牌认定」（`work-map.js:394`-`:395`：支委 / 组长**提案** → 支委会**审议认定**） | **走样** | 「**品牌培育观察**」被读成「**提案权**」；「观察」这一**持续动作**在系统**无位**。**别的读法**：观察＝线下培育过程、系统只管认定结果 ⇒ 单侧不可比。 |
| `:463`「\| 组织委员（条条） \| 制度与日常事务：制度建设、积极分子考察、**信息与档案支持** \|」 | 制度对应主体（组织建设类→`org-commissioner`，`work_map.js:374`）· 发展党员管线（`:164`-`:172`）· 信息与档案＝组织台「成员名册 / 人才库 / 思想汇报」（`help.html:461`-`:466`） | **一致** | — |
| `:464`「\| 宣传委员（条条） \| 制度与日常事务：制度建设；活动与品牌：**主题党日**（组织生活会以三会形式召开） \|」 | 制度对应主体（宣传与档案类→`prop-commissioner`，`work-map.js:377`）· 宣传台职责＝宣传任务 / 项目看板 / 档案归档（`help.html:486`-`:488`）· **无活动写入口**（组织 / 宣传 / 纪检委员**无活动写入权**，`help.html:737`） | **走样** | 「宣传委员｜**主题党日**」被读成「宣传委员**参与 / 组织**主题党日」；系统读成「**无活动写入权**、仅只读知情（`help.html:489`）」。**别的读法**：此处「主题党日」指其**知情面 / 相关宣传产出**，非组织权。 |
| `:465`「\| 纪检委员（条条） \| ……考勤记录查询、意见建议反馈（走网页系统的公开 issue，由支委会处理、支书主持支委会，可指派他人处理）；活动与品牌：**主题党日** \|」 | 纪检类制度对应主体＝`disc-commissioner`（`work-map.js:380`-`:382`）· 考勤查询＝纪检台「考勤管理」＋场景库 `docs/src/workflow/sopData.js:92`-`:97`（`attendance-check`「查考勤记录」）· 反馈处置含纪检（支委层五角色，`help.html:1292`）· **无主题党日写权**（`help.html:737`） | **走样** | 同 `:464` 行（「主题党日」＝知情 / 产出面，非组织权）。**⚠ 本行括注「走网页系统的公开 issue、由支委会处理、支书主持、可指派他人」与系统一致**（`work_map.js:204` · `help.html:1292`·`:1297`）。 |
| `:466`「\| 支部党员 \| 制度与日常事务：积极分子考察 \|」 | 普通成员＝`participant`（`constants.js:187`）·「我的考察」在成员台（`help.html:552`）· 发展党员阶段＝`DEVELOP_STAGES`（`constants.js:231`） | **一致** | — |
| `:467`「\| **积极分子** \| 制度与日常事务：积极分子考察 \|」 | **「积极分子」不是登录角色键**（`ROLE_KEYS` `constants.js:185`-`:191` 无此项）；它是**发展阶段**（`DEVELOP_STAGES` `constants.js:231`），亦可作成员类型（`constants.js:837`） | **走样** | 母本把「积极分子」与支书等**角色并列成表行**；系统读成「**发展阶段 / 成员类型**」。**别的读法**：该行实为「**按发展阶段**查场景」，不能当登录身份。 |
| `:468`「\| **团支部/班委会** \| 活动与品牌：团支部合办活动 \|」 | **不是系统角色 / 实体**——`work-map.js:152`-`:153` 自注「团支部在我们的系统中只是一个字段『标记』」；对应模块＝`joint-event`「共建活动」（`:151`）；角色表（`help.html:308`-`:316`）无二者 | **走样** | 母本把「团支部 / 班委会」当**查表主体**；系统读成「**活动的一个维度标记**（跨组织合办），由党小组承办」。**别的读法**：该行是「**参与方标记**」而非角色。 |

**三、第 13 章「按工作类型查找」（`:470`-`:481`）—— 9 个动作**（1 ＝ 查表能力本身 ＋ 8 ＝ 表内 8 行）

| SOP 原文（逐字 · 行号实测） | 系统实际做法（证据可指） | 判断 | 若是走样：哪句话被读成了什么 / 别的读法 |
| --- | --- | --- | --- |
| `:470`-`:481`「按工作类型查找」表**本身**（工作类型 → 对应场景） | **系统无同名入口**；最近似＝**支部分工 / 工作地图**（`docs/src/core/domain/work-map.js:98`-`:234` `WORK_MAP_MODULES` 共 **14 模块**；渲染入口＝`help.html:437` 支书台「支部分工」三视图），但用途是**定人定责定岗**、**不链 SOP 场景名**；SOP 场景名由场景库承载（`docs/src/workflow/sopData.js`） | **缺** | —（有「工作类型**目录**」，无「工作类型 → **SOP 场景**」的查表） |
| `:474`「\| 活动组织 \| 主题党日 \|」 | `work-map.js:134` 模块「主题党日」（`theme-party`） | **一致** | — |
| `:475`「\| 制度建设 \| 制度制定与迭代 \|」 | `work-map.js:212` 模块「制度制定与迭代」（`rule-making`，主责支委会） | **一致** | — |
| `:476`「\| 发展党员 \| 积极分子考察 \|」 | `work-map.js:164` 模块「发展党员」（`develop-party-member`） | **一致** | — |
| `:477`「\| 党团班合作 \| **团支部合办活动** \|」 | 模块名＝「**共建活动**」（`joint-event`，`work-map.js:151`），靠 `desc`「跨组织合办活动（**团支部合办**等）」（`:160`）才对上；且自注「团支部只是一个字段标记、**不单开场景**」（`:152`-`:153`） | **走样** | SOP 场景名「**团支部合办活动**」被读成**独立场景**；系统读成「模块＝**共建活动**、团支部只是标记」。**别的读法**：党团班合作**不是一个场景**，而是「共建活动」的一个参与方维度。 |
| `:478`「\| 信息与档案 \| **组织委员的信息与档案支持** \|」 | 系统有**同名异义**模块：`work-map.js:224`「**信息平台支持**」（`info-platform`），主责＝**支委会**、定义＝「**本网页系统本身**」（`:232`）；该处注释 `:230`-`:231` **显式标注**「母本『信息平台支持』是**组织委员**的信息与档案支持服务……**另一件事同名**」 | **走样** | SOP「信息与档案 ＝ 组织委员的信息与档案支持」被读成系统模块「**信息平台支持**」；**同名不同义**（系统模块＝网页系统本身 / 归支委会），而「组织委员的信息与档案支持」散在组织台「成员名册 / 人才库 / 思想汇报」（`help.html:461`-`:466`）。**别的读法**：不可据 `info-platform` 指认 SOP 该行。 |
| `:479`「\| 考勤监督 \| 考勤记录查询 \|」 | `work-map.js:197` 模块「考勤考察」（`attendance-inspection`，主责纪检）· `sopData.js:92` 场景「查考勤记录」（`attendance-check`） | **一致** | — |
| `:480`「\| 品牌建设 \| 品牌属性标签 \|」 | `docs/src/core/domain/domain.js:30` 字段 `isBrand`＝「**品牌属性标签**」（认定＝支委 / 党小组组长提案 → 支委会审议通过后确定）· `work-map.js:394`「品牌认定」→支委会 | **一致** | — |
| `:481`「\| 意见反馈 \| 意见建议反馈 \|」 | `work-map.js:202` 模块「意见反馈处理」（`feedback-handling`，主责支委会）· `sopData.js:100` 场景「处理意见建议反馈」 | **一致** | — |

**四、第 14 章「延伸阅读」（`:485`-`:493`）—— 7 个动作**

| SOP 原文（逐字 · 行号实测） | 系统实际做法（证据可指） | 判断 | 备注 |
| --- | --- | --- | --- |
| `:487` `./支委与党小组定人定责定岗说明.md` | 目标**存在**（同目录）；被 `work-map.js:166`·`:218` 等引为母本 `定人定责 §5.x` | **一致** | `link-integrity` L5 覆盖 |
| `:488` `./组织委员工作流程指南.md` | **存在**；`content/02_institution/sop/INDEX.md:29` 已登记 | **一致** | 同上 |
| `:489` `./宣传委员工作流程指南.md` | **存在**；`INDEX.md:31` 已登记 | **一致** | 同上 |
| `:490` `./纪检委员工作流程指南.md` | **存在**；`INDEX.md:30` 已登记 | **一致** | 同上 |
| `:491` `../../03_doc_system/工作模板/经验沉淀辅助提示词.md` | **存在** | **一致** | 同上 |
| `:492` `../../01_strategy/references/历史会议材料/支委工作手册26春.docx` | **存在** | **一致** | 同上 |
| `:493` `../../01_strategy/references/历史会议材料/20251130党支部月度会议-发布版.pdf` | **存在** | **一致** | 同上 |

---

**五、归因与命题（不一致项 → `.ctx/REVIEW_QUEUE.md` `SOP-C-72`…`SOP-C-80`）**

- **不一致动作共 17 个**（走样 12 ＋ 缺 5；多 0；单侧不可比 0）；按**同根合并**归为 **9 条待裁命题**（映射见下）。
- **根因四条**：① **「处置归支委会」的落地＝支委层五角色放开，且无「支书主持 / 仅辅助」门**（牵出 `:422`·`:425`·`:435`）；② **「直接反馈支书」的通道＝私信，而私信发送权限支委层 ∪ 组长**（牵出 `:426`）；③ **「会上提出」与两条价值倡导（鼓励 / 要具体）无系统载体**（牵出 `:427`·`:448`·`:449`）；④ **SOP 的「按角色 / 按工作类型」两张查表在系统无同构入口，且表内主体与权限口径有 6 处不符**（牵出 `:456` 能力 · `:460`·`:462`·`:464`·`:465`·`:467`·`:468` · `:470` 能力 · `:477`·`:478`）。
- **命题不替支书裁**：每条只写「SOP 标准读法 / 现在的读法 / 后果 / 建议改哪边」，**未改任何代码 / 母本**。

**六、自校验（本批实测）**

1. **覆盖账目闭合**：第 11 章 12 ＝ 5+4+3；第 12 章 10 ＝ 3+6+1；第 13 章 9 ＝ 6+2+1；第 14 章 7 ＝ 7；**加总 38 ＝ 38 ✓**（一致 21 · 走样 12 · 缺 5 · 多 0 · 单侧 0）。
2. **指得住的「一致」证据均标层级**：任务级——`:432`(`issues.js:410`/`:447` ＋ `issue-detail.js:219`-`:258` ＋ `agenda-form.js:110` ＋ `vote-config.js:16`-`:20`) · `:450`(`agenda-form.js:111`·`:181`-`:188` ＋ `party-committee-meeting-entry.js:391`-`:405` ＋ `vote-config.js:21`-`:25`) · `:497`(`feedback-tab.js:282`-`:288` ＋ `issues.js:599`·`:627`-`:629` ＋ `issue-dispatch-view.js:115`-`:219`)。制度源 / 单一源——`:441`-`:444`(`issues.js:1244`-`:1249`，注释 `:1230`-`:1242` 明写照母本) · `:474`-`:481`(`work-map.js:134`·`:212`·`:164`·`:197`·`:394` ＋ `domain.js:30`)。展示层——`:460`-`:468`(`help.html:302`/`:411` · `:418`-`:558`)。
3. **守卫**：`node --test test/doc-consistency.test.mjs test/link-integrity.test.mjs test/timestamps-note-guard.test.mjs`（cwd `server`）→ **全绿**（读数见本批收尾）。
4. **本批改动文件**：`.ctx/logs/2026-10-EXECUTION_LOG.md` · `.ctx/REVIEW_QUEUE.md` · `.ctx/logs/2026-10-DECISION_LOG.md` · `.ctx/logs/DECISION_LOG.md` · `CLAUDE.md`（丙部 `P.15` 进度行）——**`content/**` / 代码 / 测试一字未动**；母本只读。

## 批次 382（2026-10-05 · `D-774`）**`README-server §3.2.x` 页签台账立机器判据（`S19`）＋ 两处陈旧计数改准**

> **裁定与落地全在 `D-774`**——本条只留**量测 + 判据 + 边界**（照 `H26.1`）。

### 一、量测读数

- 新守卫 **`S19`**（`server/test/page-sweep.test.mjs`）：`SWEEP.byPage` 记七台逐台实测页签数；断言「七台逐台 == `README-server §3.2.x` 台账」＋「各台之和 == 标题『共 N 个』」＋「真机合计 == 标题」＋「根 `README.md` 第二处引用 == 标题」；**非空转**＝实解析 **7** 台。
- 陈旧计数改准 **2 处**：`README-server.md:359`（73 → **68**）· `README.md:142`（73 → **68**）。
- 实测：七台 **12 / 11 / 9 / 9 / 10 / 11 / 6 ＝ 68** · `SWEEP.tabs=68`。
- 戳：**不 bump**〔只改 `.md` ＋ `server/test/**`〕。

### 二、守卫读数

- `page-sweep`（真机）：`S0` / `S1` / **`S19`** / `S2` / `S3` ＋ 七台真机普查 ＝ **12/12 / 0 红**。
- **反例自检**：`§3.2` 标题 68 → 67 ⇒ **`S19` 判红**（`§3.2.x 各台计数之和 68 ≠ 标题「共 67 个」`）；撤回 ⇒ **12/12 复绿**；反例不留盘。

### 三、边界（如实）

- `S19` **只守「计数」**；`§3.2.x` 四列（页签名 / 分组 / 谁用 / 做什么）与注册内容的一致性**仍未立判据**（写法差异大：★ 标记 / `1-3` 合并行 / 特例段）。
- 两处计数自批次 371–374 起**长期漂移未回改**（本批改准 ＋ 上守卫）。
- 本批**未改任何页签 / 业务代码**。

## 批次 383（2026-10-05 · `D-775`）**自纠批：批次 381「指南 11–14 章」系重复评议 ⇒ 对账改准 ＋ 9 条命题逐条处置**

> **性质**：**自纠 / 对账批**——本批**不改任何代码 / 母本 / 测试**；只改 `.ctx` 三文件 ＋ `CLAUDE.md` 丙部 `P.15` 进度行。

### 一、怎么发现的（如实）

- 准备续跑 `P.15` 阶段 B「下一份母本（定人定责 6 章）」时先做**去重核查**，读 `.ctx/logs/2026-09-EXECUTION_LOG.md` 的批次标题，**当场命中**：
  - **`## 批次 70（2026-09-18，阶段 B 第 5 批：指南第 11–14 章对照）`** ⇒ **批次 381 与我准备跑的 383，其第 11–14 章部分与批次 70 完全同章**；
  - **`## 批次 72（阶段 B 第 6 批：纪检委员指南对照）`** · **`## 批次 75（阶段 B 第 7 批：组织委员 ＋ 宣传委员指南对照）`** · **`## 批次 77（阶段 B 第 8 批（收口批）：组长手册 ＋ 定人定责说明对照）`** ⇒ **另五份母本亦已全跑**；
  - **`D-454`（批次 78）**：「阶段 B 第 8 批收口结论：0 条新立命题 / 0 条新待落地，**阶段 B 八批跑完**」。
- **根因**：批次 381 的「未跑」判断取自**批次 58 / 70 收官时写的**「未跑：指南第 8–14 章及另外五份母本」——**那是一句会过期的过程句**，其后批次 72 / 75 / 77 已把它清空。⇒ 批次 381 实为**复评**（间隔 17 天、用**当前系统**重跑），**不是首评**。

### 二、逐条对账（批次 381 的 9 条 → 处置）

| 批次 381 命题 | 覆盖（指南章 / 行） | 既有判定 / 裁定 | 对账结论 |
| --- | --- | --- | --- |
| `SOP-C-72` 支委会处置 / 支书主持 / 仅辅助 | 章11 `:422`·`:425`·`:435` | 批次 70 对同句判**一致**（其时写口＝`requireRole(db, SECRETARY_SET)` 支书专属） | **真新**——**2026-09-21 `D-550`** 才把处置放开到**支委层五角色**（`index.js:519`）⇒ **系统在该批之后变了**；母本 `:435` 未随之改准 |
| `SOP-C-73` 所有支部成员可直接向支书反馈 | 章11 `:426` | 批次 70 判**单侧不可比**（其时尚无站内信，「全站无该功能」） | **真新**——**站内信 2026-10-03 落地**后才**有可比物**（且发送权＝支委层 ∪ 组长） |
| `SOP-C-74` 在支部大会上提出 | 章11 `:427` | 批次 70 判**单侧不可比**（线下动作） | **撤下**（复评改判「缺」**与既有判定相左**，以既有为准） |
| `SOP-C-75` 鼓励提出 / 要具体 | 章11 `:448`·`:449` | **`SOP-C-53` 已裁**（`D-400`） | **撤下**（重复） |
| `SOP-C-76` 两张查表无同构入口 | 章12 / 章13 **能力本身** | 批次 70 只**逐行**判「该行场景有无落点」 | **降为登记**（新角度、事实成立，但两章本属导航表、是否要落系统未定） |
| `SOP-C-77` 积极分子 / 团支部被当角色 | 章12 `:466`·`:467` | 批次 70：`:466` 判**一致** · `:467` 判**走样**并依 `D-336` 自行解决 | **撤下**（两句均已有归属） |
| `SOP-C-78` 委员 ↔ 主题党日与活动写权 | 章12 `:460`·`:464`·`:465` | 批次 70 按「**任务执行者**」层判**一致**，并依 `D-342`/`D-344` 自行解决 | **降为登记**（新角度＝**写权层**；两层不同，事实登记、不推进） |
| `SOP-C-79` 品牌培育观察 | 章12 `:462` | **`SOP-C-57` 已裁**（`D-404`，已并入 `SOP-C-34` 落地清单） | **撤下**（重复） |
| `SOP-C-80` 团支部合办 / 信息与档案同名异义 | 章13 `:477`·`:478` | 批次 70 对 `:467`/`:477` 判**走样**并依 `D-336`/`D-390` 自行解决 | **撤下**（已在既有处置射程内） |

**净值**：**真新待裁 2（`C-72` / `C-73`）· 登记 2（`C-76` / `C-78`）· 撤下 5（`C-74` · `C-75` · `C-77` · `C-79` · `C-80`）**。

### 三、落地动作

- `.ctx/REVIEW_QUEUE.md`：`### SOP-C-72…C-80` 节**整节改写**为对账后形态（含「由来与更正」说明 ＋ 2 条真新命题全字段 ＋ 5 条撤下/2 条登记的逐条依据 ＋ 净值）；「状态与现况」行改准为「**阶段 B 累计 73 条 ＝ 已裁 71 ＋ 待裁 2**」，并**更正**原写的「指南 14 章已全部过完 / 另五份母本 30 章未跑」（**不确**：44 章早在 2026-09-18 跑完；**未跑＝0 章**）。
- `CLAUDE.md` 丙部 `P.15` 进度行：改准为「**阶段 A ＋ 阶段 B 均已完成**（阶段 B 八批＝批次 54 / 55 / 56–57 / 58 / 70 / 72 / 75 / 77，**批次 78 宣告八批跑完** `D-454`；**未跑 0 章**）＋ 批次 381 系**复评**」。

### 四、如实登记（边界）

- **批次 381 的四列表本身仍有效**（它用的是**当前**系统的行号与证据），价值＝**系统演进后的复评**；**作废的只是它的「首评」定性与其 5 条重复命题**。
- **未准备跑的 383（定人定责）已就地取消**——该文件同属**批次 77（阶段 B 第 8 批）** 与 **批次 144（按角色逐条）** 的已评范围，再跑即二次重复。
- **新发现的纪律风险（建议入甲部，本批不代立）**：**「未跑 / 待续」类过程句会过期**——凡据**收官注**判断「还有什么没跑」的，**必须先用批次标题全表反查**，不得只读一句收官话。本批即按此执行。
- `SOP-C-72` / `SOP-C-73` 两条**只出命题、不替支书裁**（`C-72` 的推荐档＝**改母本**依 `D-550` 收口；`C-73` 的推荐档＝**改系统**放开私信发送权）。

## 批次 384（2026-10-05 · `D-776`）**`P.15` 收口标注 ＋ 立 `R-92`「去重先于续跑」**

> **来源**：批次 383 自纠的收尾（`D-775`）——把「阶段 A/B 已完成」这一事实**落到 `P.15` 正题**，并把这次踩到的坑**升成一条纪律**，防再犯。

### 一、落地

- `CLAUDE.md` 丙部 `P.15` **正题加状态行**：**✅ 已完成**（阶段 A 批次 53 ＋ 阶段 B 八批 批次 54 / 55 / 56–57 / 58 / 70 / 72 / 75 / 77；**批次 78 宣告八批跑完 `D-454`**；**44 章全部过完、未跑＝0 章**；2026-10-05 批次 381 **复评**、批次 383 对账）。并**说明「设计说明予以保留」的理由**——它不是执行记录、而是**方法论判据**（复评可随时按同一套方法再做）⇒ 按 `H50.1 §3`「口径不随批次删」的例外留存。
- `CLAUDE.md` 乙部 `R-` 表**新增 `R-92`｜去重先于续跑**（编号自 `R-91` 之后；`R-90`/`R-91` 已于批次 314 删行但**编号不留用**）：凡续跑「未跑 / 待续 / 剩余 / 还剩 N 章」类工作（尤其**据收官注**判断时），**必须先用批次标题全表反查**；**收官注是会过期的过程句**（批次 58 / 70 的「未跑：指南第 8–14 章及另外五份母本」在批次 72 / 75 / 77 跑完后即失效）。状态＝**在办（待补机检）**——「该章是否已被评过」目前**无机检**，如实登记。

### 二、守卫读数

- `doc-consistency`（S1–S18）/ `frontmatter-freshness` / `doc-line-ref` / `timestamps-note-guard` / `link-integrity` ＝ **39/39 / 0 红**。

### 三、边界（如实）

- **`R-92` 无机检**：靠人按批次标题反查；**未硬凑守卫**（「该章是否已被评过」需先有「章 ↔ 批次」的可读映射，属待办）。
- 本批**只改 `CLAUDE.md`**（＋ 本文件与决策日志）；**未改代码 / 母本 / 测试**；**未 bump 版本戳**。
- `CLAUDE.md` 未在 `TIMESTAMPS` 表内（无 frontmatter）⇒ 不涉 `S13` / `F2`。

***

## 批次 385（2026-10-05 · `D-777`）**清出误伤补录**（批次 376 清出 19 节时一并清掉的 8 条未办结 ⚠ 余项回捞）＋ 立 `R-93`

> **来源（如实）**：批次 325 起逐批复核队列时发现——2026-10-04 批次 376 按 `H50.1 §3` 从 `REVIEW_QUEUE` **清出 19 个已落节**（1413 → 915 行）时，**只核了「该节是否已落」、未逐条核节内的「⚠ 余项 / 待裁 / 后续项」行** ⇒ **8 条尚未办结的 ⚠ 余项随节一并丢失**。本批属**纠错 + 补录**，非新功能。

### 一、取证（`git` 逐节回捞）

- 源＝`git show 60b15a2b^:.ctx/REVIEW_QUEUE.md`（**清出前的 1413 行版本**）；用临时脚本（`%TEMP%\audit385.mjs` / `audit385b.mjs`，**未入库、测完删除**）对**批次 376 清出的 19 节**逐节扫描 `⚠` / `余项` / `后续项` / `待裁` / `未办` 行。
- 结论：**8 条未办结 ⚠ 余项随节丢失**（1 `CRUD-4`/`CRUD-6` 通知 kind · 2 `CRUD-6` 报名总表作废键 / `hasApplied` · 3 `SOP-B-21` 二维码文案 · 4 `SOP-B-40` 两缺口 · 5 批次 365/366 活动深链 · 6 批次 367 `档案归档` 名 · 7 批次 373 `党小组` 改名系推论 · 8 `#7` tab 加载问题无复现证）。
- **同批核出「清出无误」者**：`#8` README-server 瘦身的「余项（请支书圈）」三档 **均已裁已落**（`★ §4` 批次 361）· `SOP-B-20` 的「导出件使用方」⚠ 系**口径说明**、非待办 ⇒ 确认批次 376 **除此 8 条外清出无虞**。

### 二、落地

- `.ctx/REVIEW_QUEUE.md`：新增 **「⚠ 清出误伤补录（批次 385 · `D-777`）」** 节（插于 `## 附录：W4 专项评议循环承接区` 之前）——① **8 条未办结 ⚠ 余项表**（逐条：来源节 / 批次 · ⚠ 原文要点 · **当前复核** · **性质**）② **「已办结、不必回队列者」** 清单（7 项，只列以免僵尸）。**总行数 692 → 712**。
- `CLAUDE.md` 乙部 `R-` 表：新增 **`R-93`**（**清出前逐条核 ⚠ 余项**；状态＝**在办 · 待补机检**）；**`R-92` / `R-93` 按号序排（R-92 在前）**，并**清除**此前 SearchReplace 前缀截断产生的**一行碎片**。
- `server/test/doc-consistency.test.mjs`：`S15` 的「**R-NN 编号区间**」上限 **92 → 93**（追实况）。
- `.ctx/logs/2026-10-DECISION_LOG.md`：`D-777` ＋ 计数（**48 → 49**，`D-729`…`D-777`，下一条自 `D-778`）＋ 本月目录行；本文件批次 385 节。

### 三、守卫读数

- `doc-consistency` / `frontmatter-freshness` / `doc-line-ref` / `timestamps-note-guard` / `link-integrity` ＝ **全绿 / 0 红**。

### 四、边界（如实）

- **`R-93` 无机检**：「节内是否还有未办 ⚠ 行」目前**无机器判据**（需先有「⚠ 行 ↔ 办结状态」可读映射）⇒ 与 `R-92` 同为**待补机检**。
- 补录 8 条**是否办结由支书定**：2 条（`SOP-B-40` / 批次 367 名）可由支书一句话在「落系统 / 母本改准」间收敛；2 条（通知 kind / `hasApplied`）涉**新能力或语义**，须支书圈后方可动；其余 4 条（`SOP-B-21` 扩授权面 · 批次 365/366 活动深链待落 · 批次 373 改名待确认 · `#7` 待复现证）各等支书一个动作。
- 本批**只改 `.ctx` 两文件 ＋ `CLAUDE.md` ＋ `server/test/doc-consistency.test.mjs` 的 `S15` 上限一处**；**未改业务代码 / 母本**；**未 bump 版本戳**。

***

## 批次 386（2026-10-05 · `D-778`）**objective #7「tab 切换/加载 加载不出来」真机复现 → 修根因 ＋ 立守卫 `S20`**

> **来源**：objective #7 支书反复点名「**tab 在切换和加载中存在 加载不出来的问题**」（批次 334 曾判「真机 72 页签全过、未复现、疑 `?v=` 混版」）；批次 385 补录表第 8 条仍标「待支书给复现证」。本批**自行真机复现、定位根因并修复**（非「混版」）。

### 一、取证（真机）

- 手段：Playwright ＋ 真起服务；**冷上下文**（模块未缓存）**0ms 连点**某台全部 tab ⇒ 落定后读 `#<prefix>-tab-content` 的 `innerText`，比「再点一次末个 tab（模块已缓存、必正确）」。
- 读数：**连点 12 个 tab ⇒ 4/4 落到陈旧 tab**；**双 tab 极速切换**（「成员流动 → 支部分工」）**4/4 落到「成员流动」**；其余 5 对双 tab 为 0/4（说明复现依赖 import 落定倒挂的时机）。
- ⚠ **探针文件 `.tmp-tabrepro.mjs` 跑完即删、未入库**。

### 二、根因（四层）

1. `renderTabBar` 只有**一个**共享内容容器 `#<prefix>-tab-content`；
2. 各 tab `render:(ctx)=>import(...).then(m=>m.renderContent(...))` ⇒ **写 DOM 发生在 import 落定那一刻**，与点击顺序**可能倒挂**（先点的模块后到 ⇒ 覆盖后点的 tab）；
3. `T-304` 的 `_renderInFlight` 只按 tabId 去重、**不表达「最新激活」**；
4. 十余处 `container.dataset.currentTab` 守卫（`today` / `group-progress` / `insight-view` / `calendar` / `work-map` / `feedback` / `overview` / `notification` / `report-up` / 党委台各 tab …）语义＝「**标记符还在 ⇒ 我的骨架还在**」，而**陈旧 tab 的覆盖写入不改该标记** ⇒ 目标 tab 找不到自己的 root 而静默 `return`（即使有纠正也会被挡）。

### 三、落地

- `docs/src/components/shell/tab-bar.js`（两处）：
  1. `_safeRender` 的 `done`：本次渲染落定后若 **`currentTab !== tab.id`**，**重渲染当前 tab**（`_renderInFlight` 去重 ⇒ 当前 tab 仍在渲染中则自然跳过，不重复 import）。
  2. 由本模块发起的渲染**前** `delete container.dataset.currentTab` ⇒ 强制目标 tab **整段重渲染**、不留残影（状态变化重渲染走 `workspace-shell::_renderCurrentTab` 直调 `tab.render`，不经此处 ⇒ 优化仍在）。
- `server/test/page-sweep.test.mjs`：新增真机守卫 **`S20`**（冷上下文连点全部 tab，内容不得落到陈旧 tab）；用**变量**挂「首 tab 模块慢 600ms」的路由把竞态**确定性化**（本地 localhost 各模块同速时窗口不稳），并**避免多一份字面 `page.route`** 触发 `S2` 计数。
- 版本戳 **`20261004p → 20261005a`**（`node docs/scripts/bump-version.mjs`；实测改写 JS 223 / HTML 23 / CSS 2 / server-test 92；陈旧戳 0 残留；`CODE_VERSION` +1）。
- `.ctx/REVIEW_QUEUE.md` 补录表第 8 条（`#7`）改「✅ 已闭环（批次 386）」；`.ctx/logs/2026-10-DECISION_LOG.md` `D-778` ＋ 计数/目录/续编说明；`.ctx/logs/DECISION_LOG.md` 月度索引 **49 → 50**；`.ctx/TIMESTAMPS.md` 的 `tab-bar.js` 行刷 `2026-10-05`。

### 四、守卫读数与反例自检

- `page-sweep` ＝ **13/13 / 0 红**（含 `S20`；实测 `tab=68` 不变、`S1` 非空转 / `S2` 环境自检 / `S19` 台账对账均绿）。
- **反例自检（先在旧代码上证明会红）**：`git stash push -- docs/src/components/shell/tab-bar.js` ⇒ `S20` **判红**（`内容落到了陈旧 tab（当前应为「反馈管理」）`，实际＝「今天」）⇒ `git stash pop` 复绿。
- 静态族：`doc-consistency`（S1–S18）/ `frontmatter-freshness` / `doc-line-ref` / `timestamps-note-guard` / `link-integrity` / `version-stamp` / `module-load` / `import-path-guard` ＝ **63/63 / 0 红**。
- **收尾全量（`R-85`，起 3000 服务）**：`npm test`（缺省分片档）＝ **777/777 / 0**；`npm run test:full`（`SWEEP_SHARD=all`，140 个测试文件＝非 e2e 106 ＋ e2e 34）＝ **948/948 / 0**（含真实机 `page-sweep` 与 `S20`；`tab=68` 不变）。终局末尾 `exit=1` 系 Playwright `debug.log` 被沙箱拦截、**非测试失败**（日志落 `EXITCODE=0`）。

### 五、同批顺手修一处陈旧断言（`block-canvas-e2e`）

- 首跑 `SWEEP_SHARD=all` 时**唯一一红**＝`block-canvas-e2e.test.mjs` 的「支书停用宣传 → 组长活动详情无 publicity 按钮」：`openActivityDetail` 按「**首个**含『活动』的 tab」点击 ⇒ `#10` 改版后该位被「**活动日历**」占据（`.leader-act-item` 实际只由「**本组活动**」＝`write-tab.js` 渲染）⇒ **恒 30s 超时**。
- **取证（先证陈旧）**：`git stash push -- docs/src/components/shell/tab-bar.js`（退回旧代码）**仍复现同一超时** ⇒ **与本批无关、系 `#10` 改版遗留**（该文件在**非缺省分片档**，此前未在收尾跑里暴露）。
- **修法**：`openActivityDetail` 的匹配由 `'活动'` 改准为 `'本组活动'`（**改测试不改制度**）；复跑 **1/1 绿**（8.3s）。

### 六、边界（如实）

- **`S20` 只覆盖「支书台 × 连点全部 tab」一个样本**（七台未逐一跑竞态）——修法在壳层、对七台同源；**未逐一扩围**。
- `S20` 的**注入延迟**只作用于该用例页面，**不改产品**；本地同速环境下原竞态窗口不稳，注入延迟用于稳定复现。
- **本批不新增页面 / 表 / 字段 / 权限**；只改「切换时的渲染落定顺序」。
- **`#7` 的另一半**（tab 功能边界）已由 `D-755` / `V-3` / `#10` 处理，本批只收「加载不出来」这半边。

***

## 批次 387（2026-10-05 · `D-779`）**组织台活动深链改落「活动日历」＋定位**（批次 366 登记的后续项落地）

> **来源**：批次 385 补录表第 5 条（`#10` 样板台后续项）＋ `org/tf-view-tab.js` 头注自陈「『把活动深链改落『活动日历』并为其加定位』登记为后续项」。

### 一、口径与改动

- **判据**（承 `D-755`「知情查看＝该角色的赋权下游」）：组织委员下游只含 `taskforce` ⇒ 活动深链**不该**落「知情查看」；「活动日历」（六台单一源 `entries/tabs/shared/activity-calendar-tab.js`）是活动的**通用承载面**。
- `docs/src/entries/workspace/ws-org-commissioner-entry.js`：`nav.actId || nav.view` 分支由 `activate('tf-view')` 改为 `activate('calendar')`；`nav.actId` 时 `setHighlight(actId, '[data-act-id="…"]')` ＋ `setState({ displayMonth: 活动所在月, selectedActivityId })`；返回 `{ tabId:'calendar', highlightId: actId }`。
- `docs/src/entries/tabs/org/tf-view-tab.js`：头注「⚠ 登记为后续项」→「✅ 深链兜底已收口」。
- 版本戳 `20261005a → 20261005b`（JS 223 / HTML 23 / CSS 2 / server-test 92；陈旧戳 0）。

### 二、守卫与反例

- `server/test/page-sweep.test.mjs` 新增 **`S21`**（组织台 `?activityId=` / `?view=activities` ⇒ 活动页签名 == 活动日历 ＋ `#cal-main-grid` 在位 ＋ 目标条目在月历 ＋ 月份切到该活动所在月）。
- **正向**（真机探针，跑完即删）：`?activityId=act-1`（活动在 2026-07、非当前月）⇒ 活动日历 · 命中 1 条 · `month-selector=2026-07` · 0 pageerror；`?view=activities` ⇒ 活动日历。
- **反例自检**：`git stash push -- docs/src/entries/workspace/ws-org-commissioner-entry.js` ⇒ `S21` **判红**（`?activityId= 应落「活动日历」（原落「知情查看」）`）⇒ pop 复绿。
- `page-sweep` ＝ **14/14 / 0 红**（含 `S20` / `S21`；`tab=68`）；静态族 ＝ **65/65 / 0 红**。
- **收尾全量（`R-85`）**：`npm run test:full`（`SWEEP_SHARD=all`）＝ 见本批提交说明。

### 三、边界（如实）

- **只动组织台**；其余台活动落点各有其承载，未逐一改。
- `?view=activities` **一并**改落「活动日历」（如实登记为「顺带」）：该参数由首页活动面板发出，而组织台「知情查看」现只出专班段 ⇒ 原落点会显示专班，与「查看全部活动」语义不符。
- 未改 `insight-view` 兜底代码（共享件）——只让组织台**不再走**那条兜底。
- `TIMESTAMPS.md` 的本文件行刷 `2026-10-05`，并按 `R-89`／`N4` 去掉备注里的 `T-编号` ⇒ 同批从 `timestamps-note-baseline.mjs::WITH_TID_BASELINE` 删该条（`N7` 双向一致；备注字数**净减**、仍在 `N2` 预算内）。

***

## 批次 388（2026-10-05 · `D-780`）**`R-26`③ 日期口径统一到本地**（应用面 81 处）＋ 立守卫 `date-canon-guard`

> **来源**：`CLAUDE.md R-26` 的 **③ 待办**（「UTC 与本地日期口径混用（`toISOString().slice(0,10)` vs `_currentYearMonth()`）须统一到本地口径」）＋ 批次 385 补录表外的乙部在办项。
> **病灶**：`new Date()` ＋ `toISOString()` 切前 10 位取「今天」是 **UTC** ⇒ Asia/Shanghai（UTC+8）的 **00:00–08:00** 把「今天」判成**昨天**（逾期 / 待办 / 发布日 / 归档日偏一天）——支部系统**早上用得多**，属真错判。

### 一、口径与落法（零依赖叶子）

- **前端**：新建 `docs/src/core/base/date.js`（**零依赖叶子**，导出 `_fmtDate` / `todayLocal`）；`core/base/utils.js` **转出**（`export { _fmtDate, todayLocal } from './date.js'`）⇒ 既有 `from '…/utils.js'` 调用点**一处未动**。**为什么不放 `utils.js`**：`core/domain/constants.js` 被全站 import 且要求**双端可载**（`services/activity/activity.js` 有明文「constants 不入服务层，以避循环」）⇒ 它只能引**零依赖**件，而 `utils.js` 牵 `core/session/pending-writes.js`。
- **服务端**：`server/services/reporting.js` 早有本地 `today()` / `daysAgo()`（`fmtLocal` 原为私有 ⇒ 本批**导出**）；6 处路由改用之。
- **两处 doc 口径同步改准**（原写「无 import 的叶子模块」）：`core/domain/constants.js` 头注 ＋ §RESIDENCE 注、`services/activity/activity.js` 放行注。

### 二、落地（应用面 81 处 ＋ 引用一改具改）

- `docs/src/**`：**39 文件 75 处**（UTC 取「今天」72 → `todayLocal()`；`X.toISOString()` 3 → `_fmtDate(X)`）＋ 按相对路径接线 import。
- `server/**`：**6 处**（`routes/iaaa.js` · `leader-progress.js` · `member.js` · `resources/index.js` · `resources/semantic-routes.js` · `system-notices.js`）。
- **测试口径对齐**：`member-confirmation.test.mjs`（`_dateOffset` → `daysAgo(-days)`；「缺省今日」→ `todayLocal()`）· `perf-index-equivalence.test.mjs`（参照实现同日）——防「测试用 UTC、生产用本地」在窗口内 flaky。
- **`README-server.md` 引用一改具改**：插入 import 使 24 个被引文件行位移 ⇒ 用 **LCS 行映射**（`git show HEAD:` ↔ 现版）逐号改准，**改写 108 条引用**（含短式续列 `:NN` 与逗号续列）。
- 版本戳 **`20261005b → 20261005c`**（JS 224 / HTML 23 / CSS 2 / server-test 92；陈旧戳 0）。
- `.ctx/TIMESTAMPS.md`：本批**实际编辑过**的 27 个（有表行）文件刷 `2026-10-05`（**只改日期列**）。

### 三、守卫与反例（判据确会抓）

- 新守卫 `server/test/date-canon-guard.test.mjs`：**`D1`** 应用面不得出现 UTC 切串取日（命中即红并指名；**非空转下限 200 文件**）；**`D2`** 本地口径单一源在位（前端叶子导出 `todayLocal` 且**零 import**；服务端导出 `today` / `fmtLocal`；`constants.js` **只许 1 条 import** 且指向 `../base/date.js`；`utils.js` 确有转出）。
- **登记**：`server/package.json` 的 **`test:daily`**（`S16` 硬要求）＋ `test:fast` · 根 `README.md` 汇总清单 · `server/README.md` 守卫清单 · `content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md §0.2` 索引行。
- **反例自检**：首跑 `D1` 即**判红**——抓的是本批自己的临时 codemod 文件（`server/.tmp-datefix.mjs`，已删）。
- **守卫读数**：`date-canon-guard` 2/2 · `doc-line-ref`（`R1`–`R6`）· `doc-consistency`（`S1`–`S18`，含 `S9`/`S10`/`S11`）· `module-load`（`E1`–`E4`）· `import-path-guard` · `version-stamp` · `frontmatter-freshness` · `timestamps-note-guard` · `link-integrity` · `link-target-guard` ＝ **67/67 / 0 红**。收尾全量见本批提交说明。

### 四、边界（如实）

- **射程＝应用面**：`docs/scripts/**`（`release.mjs` / `bump-version.mjs` 的 `TODAY`）与 `deploy/**` 属**发版 / 打包工具链**（日期只用于**版本戳与产物名**）⇒ **不在 `D1` 射程**、如实登记。
- **服务端一并改**（非 `R-26`③ 字面要求）：只改前端会使窗口内**前后端「今天」分叉** ⇒ 同批改准服务端 6 处。
- **`constants.js` 由「零 import」变「一条零依赖 import」**：破了原字面、**保住本意**（不成环、双端可载）；两处 doc 同批改准，`D2` 把守。
- 本批**不新增页面 / 表 / 字段 / 权限**。


***

## 批次 389（2026-10-05 · `D-781`）**`R-89` 续批**：TIMESTAMPS 备注列收敛 42 格（`T-编号` 71→29、合计 45,960→44,343、预算同批下调）

> **来源**：支书「**裁定时间戳 非常浪费内存**」＋ `CLAUDE.md R-89`（台账备注列只写「现状 / 边界 / 为什么」、逐批沿革一律进 `.ctx/logs/**`、预算只降不升）。

### 一、选面（先量后动）

- 逐格**实读**四份存量清单的备注原文，只取「**除 `N4 T-编号` 外无其它违规**」的格子（不同时命中 `N5 日期复述` / `N6 批次号罗列` / `N3 超长`）——否则一处收敛要同时改多份清单、极易漏。⇒ 命中 **42 格**：`docs/src/entries/tabs/**` 34 · `entries/workspace/*-entry.js` 3 · `entries/pages/about-entry.js` · `core/boot/registry.js` · `components/role-hierarchy.js` · `docs/workspace/*.html` 2 · `capabilities/disc-workspace.js`。
- 收敛形态：删「`T-279 Mx 新建` / `T-280 …` / `T-304 …`」这类**执行日志键**，保留**现状描述**（含 `tab 数 9` 等可数事实与 `scope='workspace:disc'` 等边界），统一加「沿革见 `.ctx/logs/`。」指针。

### 二、落地与读数

- `.ctx/TIMESTAMPS.md`：42 格备注换为「现状 / 边界 ＋ 沿革指针」；**备注列合计 45,960 → 44,343**（↓1,617）。
- `server/test/timestamps-note-baseline.mjs`：`WITH_TID_BASELINE` **删这 42 条**（71 → 29，`N7` 双向一致）＋ `NOTE_TOTAL_BUDGET` **45,900 → 44,700**（只降不升）＋ 注释计数改准。
- **旧备注逐字留档**：42 条落本文件**附节**「TIMESTAMPS 备注列迁出的逐批沿革（2026-10-05 批次 389）」（可复原、不丢信息）。
- `server/README.md`：该守卫的**实测数**改准（登记 **291 行** / 备注合计 **44,343 字** / 最长单格 **937 字** / `T-编号` **29** / 日期复述 **14** / 批次号罗列 **20** / 单格 >1000 字 **0**）。
- 版本戳**不 bump**（判据：只改 `.ctx/**` ＋ `server/test/*.mjs` 数据文件 ＋ `server/README.md`，无 `docs/src/**`）；`ACTIVE_RULINGS` 零行。

### 三、守卫读数

- `timestamps-note-guard` **7/7**（`N2` 预算下调后仍绿 · `N4` 命中集 ≡ 新基线 **29** · `N3` 仍 **0** · `N5` **14** · `N6` **20** · `N7` 非空转）；同批静态族（`doc-consistency` `S1`–`S18` · `frontmatter-freshness` · `doc-line-ref` · `link-integrity` · `version-stamp` · `date-canon-guard`）**59/59 / 0 红**。收尾全量见本批提交说明。

### 四、边界（如实）

- **只做「只犯 T-编号」的 42 格**；**同时犯多类**的格子（`disc/attendance-tab.js` · `leader/write-tab.js` · `visitor/projects-tab.js` · `prop/archive-tab.js` · `secretary/calendar-tab.js` · `org/taskforce-tab.js` 等）**本批未动** ⇒ 属**下一批**（`R-89` 仍在办；`N5` / `N6` 两条清单本批一字未动）。
- **`R-93` 的机检经本批实探「不成立」**：曾想以「已闭环节内不得含未办 ⚠ 行」立守卫 ⇒ 实测该形态 **49 处**命中，而绝大多数是体例允许的「**⚠ 仍未做（如实登记）**」（**留在已闭环节内是既定写法**）⇒ **判据会大面积误报、不予立**（与 `R-92` 同：**未硬凑守卫**）。
- 本批**未改任何业务代码 / 母本 / 页面**。

***

## 批次 390（2026-10-05 · `D-782`）**`R-23`② 展示值按表复算**（8 个 kind）＋ 判 ③ 非缺口

> **来源**：`CLAUDE.md R-23` 的 ②（「部分 kind 展示值仍取自 payload」）与 ③。
> **病灶**：`server/system-notice-kinds.js` 末尾的**统一包装**＝`(ctx) => buildSystemNotice(kind, { ...payloadOf(ctx), sourceId })`——**无 `build` 的 kind 会把客户端 payload 整包展开成模板变量** ⇒ 任一**获授权**的 actor 直调 `POST /api/v1/system-notices` 即可让通知**正文**显示**任意**活动名 / 日期 / 地点 / 材料名 / 周次 / 阶段名（`R-22` 的「按表复算」此前只落在 **6** 个 kind 的 `authorize` 与文案上）。

### 一、口径（把仓里既有做法升为通例）

- **对象字段按表复算**：活动名 / 日期 / 地点 / 材料名 / 接收角色 / 周次 / 阶段名 —— 一律取自**服务端可读表**，**不采信客户端 payload**。
- **人名沿用 payload**：服务端**无人员名册**（`activities.assignments[].personId` 是演示 id）⇒ 与既有 `organizer-transferred` 注记（原话「项目名按表复算；人名沿用 payload」）**同一口径**。

### 二、落地（8 个 kind ＋ 判据）

- `server/system-notice-kinds.js`（**+70 行**）补 `build`：`attendance-confirmed`（`activities.title`）· `activity-agenda-updated`（同）· `workforce-proposal-created`（同）· `activity-created-broadcast`（`title`/`date`/`location`）· `taskforce-vote-requested`（`title`/`date`→`publishDate`）· `member-change-approved`（`member_change_requests.fromStage`/`toStage`）· `external-dispatch-created`（`external_dispatches.refLabel`/`receiverRole`）· `weekly-report-submitted`（`weekly_reports.week`/`weekRange`）。
- `server/test/system-notice-project-auth-authorize.test.mjs`（**+66 行**）新增 **`B1`–`B7`**：伪造 payload 的 display 值**不得**出现在产物里 · 表内值**必须**在 · `B7` 非空转（8 个 kind 都真有 `build`）。
- `README-server.md` §2.2.3 / §6.7 **一改具改**（`:106-111`→`:122-136`；`:57-388`→`:57-458`；`:205-212`→`:260-276`；`:325-347`→`:408-430`；`:362-387`→`:441-457`）＋ §6.7 补「**展示值亦按表复算**」口径段。
- 版本戳**不 bump**（无 `docs/src/**` 改动）；`ACTIVE_RULINGS` 零行（执行、非新裁定）。

### 三、判据与反例（真机无需；纯 node）

- **正向**：`A1`–`A8` ＋ `B1`–`B7` 绿。
- **反例自检**：`git checkout` 退回旧 `server/system-notice-kinds.js` ⇒ **`B1`–`B6` 全红**（另有 `B7` 红）⇒ 从字节副本复原、`numstat` 复验 **+70/−0**。
- ⚠ **过程中一处自伤已修**：首版生成器把活动类写成 `act.activityTitle`（活动行的字段实为 `title`）⇒ `B1`–`B3` 首跑**判红**暴露；改准 5 处后复绿。**这正是「反例自检不可省」的自证**。

### 四、边界（如实）

- **只完成 8 / 11 个「可复算」kind**；余 3 个（`review-request-submitted` / `review-request-decided` / `project-auth-granted`）**未做**——其对象字段来自**前端既有纯函数**（`review-request.js::_subject` / `_branchLabel` 等），服务端复算须先抽**前后端共用件**，否则＝**第二实现**（违 `H31`）⇒ 属**下一批**。
- **人名仍沿用 payload**：服务端无人员名册 ⇒ 「通知里写别人的名字」这一半**仍未堵**；要堵需先立服务端人员名册读口（另立项）。
- **`review-overdue-reminder` / `review-resubmit-reminder`**：`authorize` 只认角色、**无 sourceId 对象** ⇒ **无表可复算**（登记为不可复算面）。
- **`R-23`③ 判非缺口**：`activity-notice-draft` / `taskforce-notice-draft` / `committee-dispatch` 的标题正文**由发布人填写**（草稿 / 人工下发）——**系设计**，不是「该复算而未复算」。

***

## 批次 391（2026-10-05 · `D-783` / `D-784`）**`R-23`② 余项收口**（余 3 个 kind ⇒ 对象字段 11/11）＋ 抽零依赖叶子共用件 ＋ 支书令「全量降频」

> **来源**：批次 390 如实登记的**余 3 个 kind**（其对象字段来自**前端纯函数**，服务端复算须先抽共用件、否则＝第二实现）。

### 一、做法

- **新件**：`docs/src/core/domain/review-request-labels.js`——**零依赖叶子**，导出 `REVIEW_REQUEST_TYPE_LABEL` / `branchDisplayName(branchId, branch)` / `reviewRequestSubject(row)`。
- **前端**：`services/governance/review-request.js` 改引该件（本地 `TYPE_LABEL` / `_subject` 删除；`_branchLabel` 留为「取 `mockDB.branches` 行」的薄壳、口径下沉）。
- **服务端** `system-notice-kinds.js`（**+38 行**）补 3 个 `build`：`review-request-submitted`（`branchLabel` ← `branches` 行〔`config.headerTitle` 优先〕· `subject` ← `review_requests` 行；**行缺失回落默认包装**）· `review-request-decided`（同上 ＋ **`approved` 由 `status` 复算** ＋ `decisionNote` 取表）· `project-auth-granted`（**项目名** ← `activities.title` / `taskforces.name`）。
- `README-server.md` §2.2.3 / §6.7 **一改具改**（5 处行号）＋ 口径段改准（11 kind · `B1`–`B10` · 共用件）。版本戳 **`20261005c → 20261005d`**。

### 二、判据与反例

- **正向**：`A1`–`A8` ＋ `B1`–`B10`（`B7` 非空转改 **11**）绿；静态族 ＋ `permission-gate` ＋ `notice-*` ＝ **102/102 / 0 红**。
- **反例自检**：`git checkout` 退回旧 `KINDS` ⇒ **`B8`/`B9`/`B10` 全红** ⇒ 从字节副本复原（`numstat +38/−0`）。
- ⚠ **环境坑（如实登记）**：直接 `node --test test/permission-gate.test.mjs` 会**大面积假红**（`登录失败 p13` 401）——脚本档会注入 **`DISABLE_PASSWORD_CHECK=1`**（`server/package.json`），带变量后 102/102 全绿 ⇒ **判据面无损**。

### 三、支书令：全量 probe 降频（`D-784`）

- 支书原话逐字：「**跑全量probe一定要减少频率，否则效率太低！可以在3-4个commit基础上全量probe**」⇒ **全量档按 3–4 个 commit 累积一次**；其间每批只跑「覆盖改动面的分片 ＋ 相关守卫子集」。
- 落点：`server/README.md` 测试章节两处（「全量跑」「提交前」）＋ `CLAUDE.md` 丙部说明行（引 `D-784`）。
- **本批即按此执行：未跑全量**；全量由随后**第 3–4 个 commit 处**补跑（覆盖 391/392/393 的改动面）。

### 四、边界（如实）

- **`R-23`② 对象字段 11/11 全落**；**余项只剩「人名 / 角色标签 / 落点」**——服务端无人员名册、且 `project-auth-granted` 落点取决于被赋权人身份 ⇒ 要堵须先立**服务端人员名册读口**（另立项）。
- 两条 `review-*-reminder` 无 `sourceId` 对象 ⇒ 不可复算；本批**未改授权门 / 表 / 字段 / 页面**。

***

### 附：TIMESTAMPS 备注列迁出的逐批沿革（2026-10-05 批次 389 · `R-89` 续批）

> 收敛路径＝把该格的历史沿革**逐字**迁入本日志、原位只留「现状 / 边界 ＋ 沿革指针」。本批共 **42** 格（皆只犯 `N4 T-编号`；`timestamps-note-baseline.mjs::WITH_TID_BASELINE` 同批删这 42 条）。

- docs/workspace/org.html :: 组织委员工作台（T-279 M3 入口版本 bump 20260823d）
- docs/workspace/leader.html :: 党小组组长工作台（T-279 M2 入口版本 20260822e；2026-08-23 styles.css 引用 bump 20260823a）
- docs/src/core/boot/registry.js :: 能力注册表三原语（registerCapability/getCapabilities/getCapability/mountCapability，T-279 M1 新建）
- docs/src/components/role-hierarchy.js :: 🗑️ 已删除（T-304 死代码清理）
- docs/src/entries/pages/about-entry.js :: 关于页入口（支部的故事；静态壳 + 死代码清理；T-272 对话三段角速度统一 PLATEAU 0.55）
- docs/src/entries/workspace/ws-prop-commissioner-entry.js :: 宣传委员工作台入口（T-279 M3 薄壳化 + T-280 B1-5 条件抑制+轮询定位）
- docs/src/entries/workspace/ws-disc-commissioner-entry.js :: 纪检委员工作台入口（T-279 M3 薄壳化 + T-280 B1-5 条件抑制+高亮存活）
- docs/src/entries/workspace/ws-leader-entry.js :: 党小组组长工作台入口（T-279 M2 薄壳化 + T-280 B1-5 条件抑制+轮询定位）
- docs/src/entries/tabs/leader/_shared.js :: 组长工作台共享上下文（纯函数 currentLeaderGroup/filterByRole，T-279 M2 新建）
- docs/src/entries/tabs/leader/todo-tab.js :: 组长待办 tab（T-279 M2 新建）
- docs/src/entries/tabs/leader/overview-tab.js :: 组长工作概况 tab（T-279 M2 新建）
- docs/src/entries/tabs/leader/attendance-tab.js :: **2026-09-25 批次 196：控件小字 `text-[11px]` → `text-[13px]` 1 处**（`:128`；**只改字号档、padding 一字未动**）；组长考勤上传 tab（T-279 M2 新建；**2026-09-21 批次 132：卡面与头注改准**——党课 / 党员大会上传位在纪检、支委会不考勤，`D-558`）
- docs/src/entries/tabs/leader/inspection-tab.js :: **（2026-09-27 批次 219：R2 页内导语——「考察上传」卡导语同批改写保值至 80 字〔补「专班考察见组织台「考察上传」」；同行改写 ⇒ 行号零位移〕）** 组长考察上传 tab（T-279 M2 新建）
- docs/src/entries/tabs/leader/review-tab.js :: 组长复盘提交 tab（T-279 M2 新建；**2026-09-25 批次 185 说明行迁移**——「复盘由活动组织者 / 深度参与者提交…本区仅展示状态，不提供提交」→ **一行 ＋ 深链** `./help.html#card-copy-review-submit`（被删语义见 `help.html:589`），`D-648`）
- docs/src/entries/tabs/leader/members-tab.js :: **（2026-09-28 批次 225：存量色彩清理——`var(--tok, <硬编码>)` → `var(--tok)`〔该令牌已在 `:root`/`html.theme-dark` 有正式默认值、逐字等值 ⇒ 观感零变化；基线 c 5→3〕；`D-674`）** 组长组员进展 tab（三区：卡点/进度/汇报，T-279 M2 新建；**2026-09-25 批次 199（`D-659`）：hex 清 1 处**（6→5）；**由「另一路」落地，本表行刷为 `2026-09-25`**）
- docs/src/entries/tabs/leader/tf-view-tab.js :: 组长专班查看 tab（URL 直达高亮，T-279 M2 新建）
- docs/src/entries/tabs/leader/my-dispatch-tab.js :: 组长我的处置 tab（T-279 M2 新建）
- docs/src/entries/tabs/org/todo-tab.js :: **2026-09-25 批次 196：控件小字 `text-[11px]` → `text-[13px]` 1 处**（`:159`；**只改字号档、padding 一字未动**）；组织委员待办 tab（T-279 M3 新建）
- docs/src/entries/tabs/org/overview-tab.js :: 组织委员工作概况 tab（T-279 M3 新建）
- docs/src/entries/tabs/org/inspection-tab.js :: **（2026-09-27 批次 219：R2 页内导语——「专班考察上传」卡导语补「。本页只收专班考察；组长台「考察上传」收本组活动考察。」〔同行改写 ⇒ 行号零位移〕）** 组织委员考察上传 tab（T-279 M3 新建）
- docs/src/entries/tabs/org/talent-tab.js :: **2026-09-25 批次 196：控件小字 `text-[11px]` → `text-[13px]` 1 处**（`:161`；**只改字号档、padding 一字未动**）；组织委员人才库 tab（T-279 M3 新建）
- docs/src/entries/tabs/org/development-tab.js :: 🗑️ **已删除**（**2026-10-01 批次 321** · 支书 V-10 取「乙：整页并入人才库」：「活动参与汇总」卡**并入** `docs/src/entries/tabs/org/talent-tab.js`；**发展阶段变更的写入位改个人总表** `person.html`）——本行按纪律留**删除抄录**，不再指向活文件（原：组织委员发展数据 tab，T-279 M3 新建）
- docs/src/entries/tabs/org/my-dispatch-tab.js :: 组织委员我的处置 tab（T-279 M3 新建）
- docs/src/entries/tabs/prop/todo-tab.js :: 宣传委员待办 tab（T-279 M3 新建）
- docs/src/entries/tabs/prop/overview-tab.js :: 宣传委员工作概况 tab（T-279 M3 新建）
- docs/src/entries/tabs/prop/tasks-tab.js :: 宣传任务 tab（T-279 M3 新建；**2026-09-25 批次 199（`D-659`）：hex 清 3 处**（9→6）；该文件内 `PROP_TASKS_SEED` 即服务端 `SEED_PROP_TASKS` 的单一源；**由「另一路」落地，本表行刷为 `2026-09-25`**）
- docs/src/entries/tabs/prop/kanban-tab.js :: 项目看板 tab（T-279 M3 新建；**2026-09-25 批次 199（`D-659`）：hex 清 3 处**（8→5）；**由「另一路」落地，本表行刷为 `2026-09-25`**）
- docs/src/entries/tabs/prop/weekly-tab.js :: 周报报送 tab 实现（T-279 M3 新建）。**边界**：已非独立页签——由「档案归档」页内折叠区挂载。
- docs/src/entries/tabs/prop/my-dispatch-tab.js :: 宣传委员我的处置 tab（T-279 M3 新建）
- docs/src/entries/tabs/disc/_shared.js :: 纪检委员共享上下文（DISC_COMMISSIONER_ID，T-279 M3 新建）
- docs/src/entries/tabs/disc/todo-tab.js :: 纪检委员待办 tab（T-279 M3 新建）
- docs/src/entries/tabs/disc/overview-tab.js :: 纪检委员工作概况 tab（T-279 M3 新建）
- docs/src/entries/tabs/disc/review-tab.js :: 复盘 tab（T-279 M3 新建；2026-10-04 批次 368 名由「活动监督复盘」改「复盘」）
- docs/src/entries/tabs/disc/makeup-tab.js :: 补课制度 tab（T-279 M3 新建 + T-280 B3-1 确认完成回写考勤 made_up；**2026-09-25 批次 193：范围段 87 ＋ 归档段 90 ＝ 177 字 → 摘要 38 字 ＋ `<details>`**，本守卫实测 **≤12**；新增 `card-copy-makeup-scope` 定点，`D-654`）
- docs/src/entries/tabs/disc/tf-view-tab.js :: 纪检委员知情查看 tab（T-279 M3 新建；批次 368 起只出「活动」段）
- docs/src/entries/tabs/disc/my-dispatch-tab.js :: 纪检委员我的处置 tab（T-279 M3 新建）
- docs/src/entries/tabs/visitor/todo-tab.js :: 成员待办 tab（T-279 M3 新建）
- docs/src/entries/tabs/visitor/overview-tab.js :: 成员工作概况 tab（T-279 M3 新建）
- docs/src/entries/tabs/visitor/activities-tab.js :: 活动动态 tab（T-279 M3 新建；**2026-09-25 批次 183**：`_organizerEntryHtml` 的入口 href `leader.html?tab=attendance` → `./workspace/leader.html?tab=attendance`〔**裸文件名会经 `<base href="../">` 解析到站点根 ⇒ 404**〕，`D-646`）；**2026-09-25 批次 199（`D-659`）：hex 清 1 处**（12→11）；**由「另一路」落地，本表行改注**（日期仍 `2026-09-25`））
- docs/src/entries/tabs/visitor/attendance-tab.js :: 考勤概况 tab（T-279 M3 新建；**2026-09-21 批次 139：「补课说明」浮窗加页脚深链**——成员台无支部治理分区 ⇒ 指设置首页〔外观 / 我的工作台〕，`D-570`）
- docs/src/entries/tabs/visitor/inspection-tab.js :: **（2026-09-28 批次 225：存量色彩清理——`var(--tok, <硬编码>)` → `var(--tok)`〔该令牌已在 `:root`/`html.theme-dark` 有正式默认值、逐字等值 ⇒ 观感零变化；基线 c 2→1〕；`D-674`）** 我的考察 tab（T-279 M3 新建）
- docs/src/capabilities/disc-workspace.js :: 纪检委员工作台能力声明（tab 清单自注册，scope='workspace:disc'，T-279 M3 新建；tab 数 9）


***

## 批次 392（2026-10-05 · `D-785`）**`R-89` 续批（第八轮）**——`N5 日期复述` ＋ `N6 批次号罗列` 两条清单**并集 31 格收敛**（备注合计 44,343 → 32,729 · 预算 44,700 → 33,100）

> **来源**：承支书「**裁定时间戳 非常浪费内存**」（objective #8）——前批（389）只收敛了「只犯 `N4 T-编号`」的格；本批把 `N5`/`N6` 两条清单的**并集**一次收敛。

### 一、做法

- **选面＝并集**：仅 `N5`（日期复述）11 · 仅 `N6`（逐批沿革罗列）17 · 交集 3 ＝ **31 格**（其中 9 格同时命中 `N4`）。以并集为口径，避免「一次收敛要同时改多份清单」的漏改。
- **收敛形态**（同批次 389）：删日期复述与逐批沿革罗列，保留**现状 / 边界**（含可数事实与关键口径，如「宣传委员指南：周报步与项目看板步留痕按钮名＝『标记已上报党建平台』」），统一加「沿革见 `.ctx/logs/`。」指针。
- **旧备注逐字留档**：追加到本文件「**附：TIMESTAMPS 备注列迁出的逐批沿革（批次 392）**」节，可复原。
- **三份清单同批删条目**：`N5` 14 → 1 · `N6` 20 → 1 · `N4` 29 → 21（9 格交集）；预算 `NOTE_TOTAL_BUDGET` **44,700 → 33,100**；四处注释计数与预算沿革同步改写。

### 二、⚠ `N7` 的「清单非空下限」（本批新发现 · 如实登记）

- 收敛后 `timestamps-note-guard::N7` 判红：`AssertionError: 四份清单内容完全相同——判据之间可能互相冒充（R-77）… 2 !== 4`。
- **成因（实读 `N7` 源码）**：`N7` 要求**四份清单两两不同**（`new Set(keys).size === keys.length`）＋ 至少一份非空；而 `OVERLONG_BASELINE` **已合法为空**（批次 322 清零）⇒ 若 `N5`/`N6` **同时清空**，两条空表**相互撞车**即红。
- **处置（不擅改判据）**：按 `N7` 约束，`N5`/`N6` **各保留 1 格**为「清单非空下限」——**保留格** `docs/src/entries/pages/notice-entry.js`（`N5`）· `content/04_web_design/design-system/COMPONENT_SPEC.md`（`N6`，其备注含 `T-282` ⇒ `N4` 亦保留）。
- ⚠ **登记为待支书圈**：若要**两条清单一并清零**，须把 `N7` 的「互不相同」收窄为「**非空清单之间互不相同**」（空表不参与比对）——**属改守卫判据 ⇒ 未擅动**（照 `S13` 阈值那两次的先例：改判据须支书核可）。

### 三、判据与反例

- **正向**：`timestamps-note-guard` **7/7** 绿（`N4` 21 · `N5` 1 · `N6` 1 · `N3` 0 · `N2` 预算下调后仍绿 · `N1` 非空转 · `N7` 互不相同）；同批静态族 **65/65 / 0 红**。
- **反例自检**：收敛过程中 `N7` **确实判红**（`2 !== 4`）⇒ 证明该约束**真的在生效**（非装饰）。

### 四、边界（如实）

- 本批**只改 `.ctx/**` ＋ `server/test/timestamps-note-baseline.mjs`（数据文件）＋ `server/README.md` 实测数 ＋ `CLAUDE.md` 进度行** ⇒ **未 bump 版本戳**（无 `docs/src/**` 改动）；`ACTIVE_RULINGS` 零行。
- **`R-89` 仍在办**：四份清单剩 `N4` 21 格（皆「同时犯多类」或纯 `T-编号`）待续批。
- **全量 probe 按 `D-784` 降频**：本批（第 2 个 commit）**未跑全量**；拟在**第 393/394 个 commit 处**补跑（覆盖 391–393 的改动面）。

***

### 附：TIMESTAMPS 备注列迁出的逐批沿革（2026-10-05 批次 392 · `R-89` 续批 · `N5`/`N6` 两条清单清零）

> 收敛路径同批次 389：历史沿革**逐字**迁入本日志、原位只留「现状 / 边界 ＋ 沿革指针」。本批共 **31** 格（`N5 日期复述` 14 ＋ `N6 批次号罗列` 20，交集 3；其中 9 格同时命中 `N4 T-编号`，一并清）。

- README-members.md :: **（2026-09-27 批次 211–212：路一 help 引用改准——`README-members.md` 1 处随第 4 章「设置逐项」独立而改准）** **（2026-09-26 批次 202：`:137` / `:198` 引用改准；只改引用、未改口径）** 支部成员版（2026-09-20 批次 106 补登；**2026-09-21 批次 138 三处改准**：思想汇报篇幅提醒「只给你本人看」（`D-547`）· 组长台考勤上传位按会议类型分（`D-558`）· 组织委员不再「篇幅不足看一眼」（`D-547`）；**新增**：意见反馈「事项领域 + 建议归口 + 处置归支委会」（`D-551` / `D-550`）· 匿名口径改「含支委层看不到真身」）
- content/02_institution/sop/INDEX.md :: SOP 导航（术语段删除党建/党务二分；**2026-09-22 批次 145**：常见工作场景快速指南那一行的用途栏「三会一课（**含组织生活会**）」→「三会一课（**组织生活会以三会形式召开**）」——按 `D-290` 去并列写法、概念保留，`D-577`；frontmatter 同步刷为 2026-09-22）
- content/02_institution/sop/常见工作场景快速指南.md :: **（2026-09-26 批次 201：`D-660` 引用改准〔`FLAT_ORGANIZATION_DESIGN.md` →《支部组织与委员体系》，`文件:行号` 形态只存在于 `.ctx/**`〕；只改引用、未改口径；由「另一路」落地，本表行日期按 `S13` 口径不刷）**  2026-09-22 批次 140 母本降级：移去沿革注记 3 处（`:21`「（2026-09-03）」权威载体声明日期 · `:26`「（D-2 决断）」· `:342`「2026-08-30 决策」），frontmatter 同步；`D-572`。**2026-09-22 批次 143**：消掉党课通知提前量的两句打架（`:184` 党课场景 · `:202` 三会一课通用流程）——改准为「**通知提前量不设固定值、由组织者把握**」（系按支书 2026-09-22 裁定「不设固定值」落；frontmatter 日期未变，当日已为 2026-09-22）；**2026-09-22 批次 145**：`:202`「支部党员大会、支委会、党小组会、**组织生活会**按同一套环节推进」→「支部党员大会、支委会、党小组会按同一套环节推进（**组织生活会以其中某一形式召开时，按该形式的步骤执行**）」——按 `D-290` **去并列**、概念保留，`D-577`；**2026-09-22 批次 146**（**系按支书 2026-09-22 授权**）：按角色查找·常用场景表 `:462`（党小组组长）/ `:464`（宣传委员）两处把「组织生活会」由**独立场景**改为「（**组织生活会以三会形式召开**）」的从属写法（**四个字保留**，依 `D-290`），`D-578`
- content/02_institution/sop/支委与党小组定人定责定岗说明.md :: **（2026-09-26 批次 201：`D-660` 引用改准〔`FLAT_ORGANIZATION_DESIGN.md` →《支部组织与委员体系》，`文件:行号` 形态只存在于 `.ctx/**`〕；只改引用、未改口径；由「另一路」落地，本表行日期按 `S13` 口径不刷）**  定人定责定岗说明（**2026-09-21 批次 139**：第三党小组组长那三处标注由「副组长」改准为「**代组长**〔＝组长，尚未转正、暂代组长职务〕——`:44` 名单行 · `:91` 块块表行〔职责一并由「协助」改回「组织」〕· `:202` 主责人表行；`D-571`）；**2026-09-22 批次 140 母本降级**：移去沿革注记 5 处（`:56`「定义修正」· `:132`「2026-08-05，2026-08-30 补充」· `:178`「2026-08-30 支书决策启动数字化，算法归档原则」· `:194`「（D-15）」· `:240`「2026-08-30 支书裁决，详见自动广播功能实现评议」），frontmatter 同步；`D-572`）；**2026-09-22 批次 142**：`:108` 条块交叉表复盘列「归档（组织建档/**宣传备案**/纪检汇总）」→「归档（组织建档/**宣传材料归档**/纪检汇总）」（考勤统计去向已由 `D-429` / `D-474` 改准为报支委会，frontmatter 未变）；**2026-09-22 批次 149**：§5.3 定岗表「制度建设」行的**主导者**由 `对应委员` 改准为 `支委会（可指定对应委员起草 / 修改）`——系按支书 2026-09-22 裁定「支委会可以指定个人来 起草/修改，报送支委会审议。主语都是支委会（支委扩大会）」落（`D-584`；**只改该格、行数守恒**）
- content/02_institution/sop/宣传委员工作流程指南.md :: 2026-09-21 批次 121 改准四处「反向过时」说明（`:57` 照片墙已实现、`:111` 图片管理规则括注、`:119` 周报自动生成与通知支书已实现、`:121` 图片管理已实现）；**2026-09-22 批次 140 母本降级**：移去沿革注记 2 处（`:67`「支书 2026-08-30 确认，无额外设计理由」· `:109`「（D-15 修订）」），frontmatter 同步；`D-572`；**2026-09-22 批次 144**：`:88` 周报步 4 的留痕按钮名由「标记已发送」改准为「**标记已上报党建平台**」（与系统周报页按钮 `docs/src/entries/tabs/prop/weekly-tab.js:275` 逐字取齐；归档页那枚「标记已发送（微信/对外）」是另一件事、未动），frontmatter 日期未变（当日已为 2026-09-22）；**2026-09-22 批次 145**：项目看板步 7 的留痕按钮名由「标记已发送」改准为「**标记已上报党建平台**」——`docs/src/entries/tabs/prop/archive-tab.js` 同批**补上这枚归档页留痕位**（与「标记已发送（微信/对外）」并列、两个动作分开记；只留痕、不对接），母本与系统取齐，`D-577`
- content/02_institution/sop/纪检委员工作流程指南.md :: 2026-09-20 批次 116 `:175`「汇总本月出勤率 → 公示」→「**→ 交支委会（不公示、不对外）**」（依支书定案「支委会 + 当事人本人」，`D-537`），frontmatter 同步；批次 119 `:86` §2.1 补「考察同流程含**同款打回**（含申诉先核实）」（依支书定案「与纪检对齐，可打回」，`D-541`）；2026-09-21 批次 124 §1.2 `:61` 会议考勤权限句改准为「**上传＝该场会议组织者**；纪检管确认（打包确认）/ 录入总表 / 统计核对与更正」（依支书 2026-09-20 定案「会议考勤上传收归组织者」，`D-548`）；**2026-09-22 批次 140 母本降级**：移去沿革注记 4 处（`:28`「2026-08-30 数字化决策」· `:53`「（D-15）」· `:62`「2026-09-21 支书口径一，修正 2026-09-20…」· `:87`「2026-09-20 支书定案…」），frontmatter 同步；`D-572`
- content/02_institution/sop/组织委员工作流程指南.md :: **（2026-09-26 批次 201：`D-660` 引用改准〔`FLAT_ORGANIZATION_DESIGN.md` →《支部组织与委员体系》，`文件:行号` 形态只存在于 `.ctx/**`〕；只改引用、未改口径；由「另一路」落地，本表行日期按 `S13` 口径不刷）**  2026-09-20 批次 115 `:202` 公示期「不少于 7 天」→「**不少于五个工作日**」（引上级《发展党员工作细则（2026年）》第十三条），frontmatter 同步；**2026-09-22 批次 140 母本降级**：移去沿革注记 3 处（`:15`「2026-08-30 数字化决策」· `:44`「支书 2026-08-30 确认」· `:130`「2026-08-30 支书强调的算法归档原则」），frontmatter 同步；`D-572`；**2026-09-23 批次 161**（**覆盖缺口：表行日期按 `S13` 口径跟随 frontmatter、未刷**）：`:181` / `:190` / `:191` 三处**只改载体**——「培养联系人考察记录」改准为「由培养联系人以**纸质材料**撰写（**有专门的纸质材料要求**），**系统内不设该栏 / 该功能**」，**制度要求不删、原位改写、行数守恒（3 / 3）**；**该文件 `frontmatter last_updated` 实读仍为 `2026-09-22`**（授权面外）⇒ 表行未刷；`D-611`
- content/03_doc_system/USAGE_POLICY.md :: 🗑️ **已删除**（**2026-09-26 批次 202**：正文**整体并入** `content/03_doc_system/OPERATIONS_GUIDE.md`《运行与协作规范》的 **§19–§23**〔原 §一 术语使用规范 → **§19**（子节 1.x → 19.x）· §二 AI 展开原则 → **§20** · §三 Emoji 使用规范 → **§21** · §四 决策记录 → **§22**（表体按沿革瘦身迁入批次 202 日志附节、原位留去向说明）· 内部代号简明词典 → **§23**〕⇒ **四份 → 一份**；沿革移入 `.ctx/logs/2026-09-EXECUTION_LOG.md` 批次 202 附节）（原：使用规范（术语 §一 + Emoji §三；2026-09-03 支书裁定废止「党建工作×党务工作」二分）〔2026-09-26 批次 201 引用改准注记保留〕）
- content/03_doc_system/SERVICE_CATALOG.md :: 🗑️ **已删除**（**2026-09-25 批次 179（`P.16` 第三批）**：正文**整体并入** `content/03_doc_system/ARCHITECTURE.md` 的 **§十一 统一服务目录与角色-服务权限矩阵**〔编号 **`11.1–11.3` 一字未改**〕⇒ **三份 → 一份**；`D-644`）（原：服务目录（v4.0 有机重组：清单总表+权限矩阵+权威源指针；2026-09-20 批次 110 改准 2 处——图片管理界面未实现（`D-446`）、三委数据交接改 disc/org，批次 113 刷本行日期；2026-09-20 批次 118 改准 3 处——考勤管理补出勤率两读口与 `workspace/visitor.html`、线上支委会表态入口补 `party-committee-meeting.html` 与同等效力、线上表决 API 备注补共用页）
- content/04_web_design/evolution/PARTY_COMMITTEE_DESIGN.md :: **（2026-09-27 支书裁定「补入口，让它们真可调」：§2.6 ⑤ 域参数层白名单描述扩表 + 放行程序节新增「本批放行登记」——时限类 / 补课范围与时限归纪检域、篇幅字数类归组织域；frontmatter 与本报行同步刷为 2026-09-27）** **（2026-09-26 04 组减负续批：§2.5 远期形态系复述 `ARCHITECTURE_EVOLUTION.md` §八，原位改一行指针；行数守恒；frontmatter 实读仍 `2026-09-26`、与表行同值 ⇒ `S13` 绿）** **（2026-09-26 批次 205 补行**：本表原无其行（历批只登记「覆盖缺口」），本批补行；日期＝frontmatter `last_updated` 实读值（与表行同值 ⇒ `S13` 绿）；`git log` 亦 2026-09-26**）** 院系党委后台——支部多实例两级治理设计定案
- content/04_web_design/data/DATA_FLOW.md :: 🗑️ **已删除**（**2026-09-23 批次 164（`P.16` 第一批）**：正文**整体并入** `content/04_web_design/data/DATA_MODEL.md`〔该文件标题改为「数据模型与数据流」〕⇒ **两份 → 一份**；沿革注记整段 19 行 ＋ 行内追注 55 处移入执行日志批次 164；`D-624`）（原：数据流设计——T-282 自 DATA_ARCHITECTURE 拆分 §一/§三/§四：总览 + 参与者数据流 + 前端数据流；2026-09-20 批次 110 改准 `_saveToStorage` 区间并补 `partyGroups` / `memberFlows` 两个漏列键，批次 113 刷本行日期；**2026-09-22 批次 142**：`:120` 归档层「提交：宣传委员备案」→「提交：支委会，组织委员接收建档」（`D-429` / `D-474`）
- content/insights/README.md :: **（2026-09-26 批次 208：沿革瘦身扫全——迁出 2 行「追加型沿革注记」（原 `:24` / `:25`）至 `.ctx/logs/2026-09-EXECUTION_LOG.md`「附：`content/**` 沿革注记迁出（2026-09-26 批次 208）」，原位按 `OPERATIONS_GUIDE §5.1` 留一行去指针；**本体改动**，`last_updated` 实读已为 `2026-09-26`（与表行同值 ⇒ `S13` 绿））** **（2026-09-26 批次 202：03《运行与协作规范》合并后引用改准〔`:34` → `OPERATIONS_GUIDE.md`〕；只改引用、`last_updated` 未刷〔`R-83` 债务〕；由同一批「另一路」落地）** **（2026-09-26 批次 209：沿革瘦身扫全落账——真正可搬仅 **2 行 / 1 文件**（本文件 `:24` / `:25` 两条追加型沿革注记），已逐字迁入 `.ctx/logs/2026-09-EXECUTION_LOG.md` 之「附」节〔执行＝批次 208、口径由 `D-665` 统一收录〕，原位留指针；`last_updated` 与表行同值仍 `2026-09-26` ⇒ `S13` 绿）** 经验沉淀层目录索引（2026-08-24 新增，与其他目录对齐）
- docs/src/components/shell/header.js :: **（2026-09-28 批次 223：`#C8102E` → `var(--party-red)`（＝`#CE1126`），1 处〔党委下发标签〕；基线 `header` c 6→5；日期由 `2026-08-12` 刷为 `2026-09-28`）** 页头组件（未读角标/主题色标签；数据层按需加载 + staticShell）
- docs/src/components/governance/org-setup-wizard.js :: **（2026-09-28 批次 223：`#C8102E` → `var(--party-red)`，向导主 CTA ×10；基线 c 18→8；日期由 `2026-09-25` 刷为 `2026-09-28`）** **2026-09-25 批次 196：控件小字 `text-[11px]` → `text-[13px]` 2 处**（`:318` / `:319`，即 `§4.3` 控件单档 `0.8125rem`；**只改字号档、padding 一字未动**）；换组织向导（**2026-09-22 批次 141 补登**——本表原先无此行；本批步骤③「角色分工」与 `_ownerLabel` / `_workforceValueMap` / 保存收集**四处同批取齐 `org` 组织主体位**——`org` 现值显示为「支委会（组织主体 · 保留现指定）」、不静默显示成角色位；随行插 7 行 ⇒ `server/test/form-loop-registry.mjs` 两条台账行号 +7，`D-573`）；**2026-09-25 批次 199（`D-659`）：再清 21 处 `text-[10px]` → `text-[11px]`**（表外 → 表内最低档；全是 `span/p/code` 上的括注 / 注释、padding 未动）；**由「另一路」落地，本表行改注**（日期仍 `2026-09-25`））
- docs/src/components/ui/modal.js :: **（2026-09-28 批次 225：存量色彩清理——`var(--tok, <硬编码>)` → `var(--tok)`〔该令牌已在 `:root`/`html.theme-dark` 有正式默认值、逐字等值 ⇒ 观感零变化〕；`D-674`）** **（2026-09-27 批次 211–212：路三——`NUDGE_TEXTS` **新增 4 键**（`todo-urge` / `assign-leader` / `assign-activity` / `assign-taskforce`；**文案全部引母本原文**）；⚠ **只登记未做**：`confirmNudge` 的 JSDoc `@param` 只列原 4 键、未补）** **2026-09-25 批次 196：hex 清 9 处（17 → 8）**（同一「等价令牌」选面原则）；模态框组件（**2026-09-21 批次 138**：新增可选 `settingsLink`——浮窗页脚「相关设置」深链的**单一源**，`openModal` / `openFormModal` 均可传；位置固定在 `.modal-body` 之外的页脚，不传者不渲染（确认 / 删除类浮窗不加）；**2026-09-21 批次 139：把页脚那段标记抽成导出 `settingsLinkHTML()`**——自建浮层（如宣传台上传浮层）用它插同款一条，**仍是单一源、不落第二份 HTML**，`D-570`）
- docs/src/entries/pages/activity-entry.js :: 活动/专班统一详情页入口（**2026-09-21 批次 132 补登**——本表原先无此行；本批品牌认定块由「一键切换」改为**提案 / 撤回 / 取消认定**三态，`D-559`；**2026-09-21 批次 135：新增「追加复盘（支委会要求）」卡与两个动作**（要求组织者复盘 / 撤回要求；给不在支书台的支委一个落点），`D-562`）；**2026-09-25 批次 199（`D-659`）：hex 清 1 处**（11→10）；**由「另一路」落地，本表行改注**（日期仍 `2026-09-21`→刷为 `2026-09-25`））
- docs/src/entries/pages/party-committee-meeting-entry.js :: **（2026-09-28 批次 223：`#C8102E` → `var(--party-red)`，3 处〔新建线上支委会 / 保存参会范围 / 加入本场议程〕；hex 清零 ⇒ 删条目；日期由 `2026-09-27` 刷为 `2026-09-28`）** **（2026-09-27 批次 218：R1 效力口径去号——`rulingNoticeHtml()` 提示条不再占序号（实读 `:421`：原「① 线上与线下完全同等效力…」→「效力口径（已定）· 线上与线下完全同等效力（2026-09-20 定案）…」，实读 `:424`）＋ 折叠 summary「（② ③ ④）▾」去号（实读 `:426`）＋ 折叠正文「②③④」改「其一 / 其二 / 其三」（实读 `:427`）⇒ 流程步成为唯一 `①②③④⑤`；由「另一路」落地、本表行加注）** **（2026-09-27 批次 211–212：路三——正常视图页头卡加「← 返回我的工作台」（逐字照抄既有 `renderShellDenied()` 的 `AuthStore.getPageForRole('workspace', role)` 体例）；真机 `/party-committee-meeting.html` → 点链接 → `/workspace/secretary.html`）** 支委会会议页入口（2026-09-21 批次 129 **补登**——本表原先无此行；本批制度草案在支委会审议时：可勾「报送党员大会表决」、记录结果时带 `reportToPartyMeeting`；**2026-09-25 批次 193：本页四段 130+131+146+131 ＝ 538 字 → 摘要 ＋ 折叠**（① 效力句**保留在界面**），比值 **24.1**；新增 `card-copy-pcm-scope` 定点；`§4.18` 判据落守卫见 `D-654`）
- docs/src/entries/workspace/ws-secretary-entry.js :: **（2026-09-28 批次 223：**深链兜底按场景归位**——`onNavTarget` 由「无条件 `activate('calendar')`」改为按 `activity.type==='支委会'` / `activity.scenarioId==='branch-committee'` 判定：支委会 → `committee-meeting`、其余 → `calendar`；★ 实读更正＝`D-671` 记的根因位置 `workspace-shell.js:27-48` 系误记、真句在本文件原 `:36`；日期由 `2026-08-24` 刷为 `2026-09-28`）** 支书工作台入口（T-280 B1-5 条件抑制重渲染+高亮存活）
- docs/src/entries/tabs/leader/write-tab.js :: **（2026-09-27 批次 219：R2 页内导语——「活动写入」卡导语补「；本组写入，全支部日历与写入主线见支书台「活动管理」。」〔同行改写 ⇒ 行号零位移〕）** 组长活动管理 tab（含决策树引导式写入，T-279 M2 新建；**2026-09-21 批次 137：写入表单活动信息区顶部原位加一行报备口径**——「本组活动一律先报备、报备通过后方才写入」随表单出现、**不设门槛**，**行数守恒、中段只改既有行 ⇒ 既有 `文件:行号` 引用不漂移**，`D-567`；**2026-09-21 批次 139：外出提醒清单浮窗加页脚深链**（组长职责参数），`D-570`）；**2026-09-25 批次 199（`D-659`）：hex 清 2 处**（24→22）；**由「另一路」落地，本表行改注**（日期刷为 `2026-09-25`））
- docs/src/entries/tabs/secretary/work-map-tab.js :: **（2026-09-28 批次 227：R5「支部分工」写侧默认折叠——新增模块级 `_toolOpen` ＋ `_toolFoldHtml()`〔体例照 `group-progress-tab.js::_progressOpen`；未展开不 load〕；真机 26 → 24 div、纯包裹 2 → 1；`D-675`）** **（2026-09-28 批次 225：存量色彩清理——`var(--tok, <硬编码>)` → `var(--tok)`〔该令牌已在 `:root`/`html.theme-dark` 有正式默认值、逐字等值 ⇒ 观感零变化；基线 c 5→3；含 Tailwind 任意值类与 `classList.toggle` 成对去兜底〕；`D-674`）** 支书工作台·支部分工（工作地图）三视图（**2026-09-22 批次 141 补登**——本表原先无此行；本批 `_ownerLabel` 补 `org` 分支、**按人矩阵收 `org` 入人维**（改前会把两个模块显示成「—」）、平铺卡 `org` 走强调色——**真机两视图都显示「支委会」**，`D-573`）；**2026-09-22 批次 145 改注**——注释与卡文案由「11 项 / 11 模块」改「**14 项 / 14 模块**」（模块目录按形式拆开，`D-577`；渲染逻辑一字未动）；**2026-09-22 批次 149 改注**——按人矩阵的**人维排序**补 `org:party-committee`（紧随支委层；`D-585`；**真机证到人维出现「党委」行**）
- docs/src/entries/tabs/secretary/calendar-tab.js :: **（2026-09-28 批次 225：存量色彩清理——`var(--tok, <硬编码>)` → `var(--tok)`〔该令牌已在 `:root`/`html.theme-dark` 有正式默认值、逐字等值 ⇒ 观感零变化；基线 c 12→7〕；`D-674`）** **（2026-09-27 批次 219：R2 页内导语——本文件「活动日历」卡内补导语「本页是活动的写入主线：全支部日历＋写入＋查询；组长台「活动管理」只写本组、无全支部日历。」〔该 tab 原无导语；**行数中性**：并入既有行、不新增行 ⇒ 行号零位移；`form-loop-registry` 对 `:1056/:1092/:1093/:1094` 取证仍逐条命中〕）** 支书工作台·日历 tab（2026-09-21 批次 129 **补登**——本表原先无此行；本批草案判据改走单一源 `isAgendaDraftDoc` ＋ 顺手修「拟上会」勾入制度草案丢 `branchDocId` 的既有缺陷；**2026-09-21 批次 137：写入活动浮窗表单步原位加一行报备口径**——「本组活动一律先报备、报备通过后方才写入」随表单出现、**不设门槛**，**行数守恒、中段只改既有行 ⇒ 既有 `文件:行号` 引用不漂移**，`D-567`；**2026-09-21 批次 138：浮窗页脚「相关设置 → 支部制度参数」深链由手写 DOM 收进 `components/ui/modal.js` 单一源**（传 `settingsLink`；位置仍在浮窗页脚、切步骤不消失；文案补「会议考勤类型与记录人」）；**本文件 -3 行 ⇒ `form-loop-registry` 4 条行号 -3（1059 → 1056；1095/1096/1097 → 1092/1093/1094）**）
- docs/src/entries/tabs/org/taskforce-tab.js :: **（2026-09-28 批次 225：存量色彩清理——`var(--tok, <硬编码>)` → `var(--tok)`〔该令牌已在 `:root`/`html.theme-dark` 有正式默认值、逐字等值 ⇒ 观感零变化；基线 c 54→46；含 Tailwind 任意值类与 `classList.toggle` 成对去兜底〕；`D-674`）** **（2026-09-26 批次 205–207：hex 4 处清；收基线 `c` 58→54）** 组织委员专班管理 tab（含发布招募，T-279 M3 新建）；**2026-09-25 批次 190**（`D-652`）：该 tab 内新增「**专班赋权**」落点（情景③，宿主 `#org-tf-assign-host`，`:88`；`:240` 调 `mountTaskforceProjectAuth`，从支书台 `assign` tab **归位至此**）；**本表行随本批刷为 `2026-09-25`**；**2026-09-25 批次 199（`D-659`）：控件小字 `text-[11px]` → `text-[13px]` 5 处已清**（**只改字号档、padding 一字未动**、该文件控件小字清零 ⇒ 基线删条目）；**由「另一路」落地，本表行改注**（日期仍 `2026-09-25`））
- docs/src/entries/tabs/prop/archive-tab.js :: **2026-10-04 批次 367：承接原「周报报送」页签（页内折叠区＝归档特例）**；**2026-09-25 批次 196：控件小字 `text-[11px]` → `text-[13px]` 1 处**（`:1081`；**只改字号档、padding 一字未动**）；档案归档 tab（T-279 M3 新建；2026-09-21 批次 120：**新增照片墙**——上传（走上传接口）/ 标注 / 按拍摄日期分组展示 ＋ 缩略图鉴权取 blob；**不新开 tab / 页面**；**2026-09-21 批次 139：「上传宣传材料」自建浮层页脚加相关设置深链**——用 `modal.js` 导出的 `settingsLinkHTML()` 插同款一条〔宣传台无支部治理分区 ⇒ 指设置首页〕，`D-570`）；**2026-09-22 批次 145 改注**——**归档行内补第二枚留痕位「标记已上报党建平台」**（与既有「标记已发送（微信/对外）」并列、两个动作分开记；与周报页**同款**字段 `platformReportedAt` / `platformReportedBy`、`persist()` 落库、**只留痕不对接**；同一活动多行 ⇒ 留痕**按活动聚合**；真机两枚按钮逐个真点、`pageerror` 0，`D-577`）；**2026-09-25 批次 199（`D-659`）：hex 清 2 处**（4→2）；**由「另一路」落地，本表行改注**（日期仍 `2026-09-25`））
- docs/src/entries/tabs/disc/attendance-tab.js :: **（2026-09-28 批次 225：存量色彩清理——`var(--tok, <硬编码>)` → `var(--tok)`〔该令牌已在 `:root`/`html.theme-dark` 有正式默认值、逐字等值 ⇒ 观感零变化；基线 c 19→13；含 Tailwind 任意值类与 `classList.toggle` 成对去兜底〕；`D-674`）** **（2026-09-26 批次 205–207：hex 1 处清；收基线 `c` 20→19）** **2026-09-25 批次 196：控件小字 `text-[11px]` → `text-[13px]` 4 处**（`:556` / `:557` / `:728` / `:729`；**只改字号档、padding 一字未动**；**本文件控件小字清零 ⇒ 按收基线纪律删条目**）；考勤管理 tab（T-279 M3 新建；**2026-09-21 批次 132：会议卡标题 / 说明 / 空态 / 表单脚注 / 应到提示改准**——党课·党员大会＝纪检上传位，`D-558`；**2026-09-25 批次 193：空态 107 字 ＋ modal 说明段 177 字 → 空态摘要 26 字 ＋ modal 摘要 30 字 ＋ `<details>`**，本守卫实测 **≤12**；新增 `card-copy-attendance-record` 定点，`D-654`）
- docs/src/entries/tabs/disc/inspection-tab.js :: **（2026-09-28 批次 225：存量色彩清理——`var(--tok, <硬编码>)` → `var(--tok)`〔该令牌已在 `:root`/`html.theme-dark` 有正式默认值、逐字等值 ⇒ 观感零变化；基线 c 11→6；含 Tailwind 任意值类与 `classList.toggle` 成对去兜底〕；`D-674`）** **（2026-09-28 批次 223：`#C8102E` → `var(--party-red)`（`:449` 提交代录主 CTA）；`:471` 的 JS 入参 `accentColor:'#C8102E'` 因参与 `hexToRgba()`/`darkenHex()` 运算 ⇒ **删显式覆盖、回落组件默认 `#CE1126`**；基线 c 12→11；日期由 `2026-09-24` 刷为 `2026-09-28`）** 考察管理 tab（T-279 M3 新建）
- docs/src/entries/tabs/visitor/projects-tab.js :: **（2026-09-28 批次 225：存量色彩清理——`var(--tok, <硬编码>)` → `var(--tok)`〔该令牌已在 `:root`/`html.theme-dark` 有正式默认值、逐字等值 ⇒ 观感零变化；基线 c 10→6；含 Tailwind 任意值类与 `classList.toggle` 成对去兜底〕；`D-674`）** 项目分工 tab（T-279 M3 新建；**2026-09-21 批次 137：「我的任务」卡片加「勾掉」动作**——落点就在既有卡片上、**不另开一处**；行携带 `taskId` ＋ host 事件委托加一支〔勾掉即关闭、不跳详情〕，写口 `services/activity/activity.js::completeMyProjectTask`，`D-566`）；**2026-09-25 批次 199（`D-659`）：hex 清 1 处**（11→10）；**由「另一路」落地，本表行改注**（日期刷为 `2026-09-25`））
- docs/src/entries/tabs/visitor/review-tab.js :: 成员台「我的复盘」tab（**2026-09-21 批次 135 补登**——本表原先无此行；本批卡片加「支委会要求」来源标记 ＋ 头注写明**不开「交回后自行更新」入口**，`D-562`）；**2026-09-25 批次 199（`D-659`）：hex 清 4 处**（5→1）；**由「另一路」落地，本表行改注**（日期刷为 `2026-09-25`））
- docs/src/services/governance/notice.js :: **（2026-09-28 批次 223：`#C8102E` → `var(--party-red)`，1 处〔党委下发标签〕；基线 c 3→2；日期由 `2026-08-12` 刷为 `2026-09-28`）** 通知服务（含通知→待办派生）
- docs/src/components/sections/references.js :: **（2026-09-28 批次 223：`#C8102E` → `var(--party-red)`（`:361` 去登录主 CTA）；基线 c 17→16；日期由 `2026-09-25` 刷为 `2026-09-28`）** **2026-09-25 批次 196：hex 清 6 处（23 → 17）**（同一「等价令牌」选面原则；**不碰 JS 颜色函数入参 / 映射键 / alpha 拼接**）；资料查询模块（2026-09-21 批次 129 制度行按状态分档——草案 / 已退回 / 待党员大会表决 / 现行版 / 停用；草案行补「修改草案」操作、成员侧只见现行版；随行位移台账 5 条行号同步）


***

## 批次 393（2026-10-05 · `D-748` 补记）站内信**服务端写门** —— 快照口复算「支委层 ∪ 组长 ＋ 发件人须本人」＋ api 面实证

> **来源**：objective #4（「站内信 是一个很重要的形式！！请一定要思考落地！！」）＋ #2（「全栈开发一定要关心 CRUD 的问题！一定要做一次全域的探查」）。`D-748` 三项（收件箱页 / 发件权 / 回复线程）已在**批次 353 落地**；本批补的是**唯一实质缺口** —— 发件权**只在前端**强制。

### 一、缺口（探查结论）

- 私信落库走 `POST /api/v1/snapshot`（整表写穿），该口此前仅 `requireAuth` ⇒ **任一登录成员直连即可伪造一条私信**（冒充发件人 / 塞给任意收件人）；`POST /notices` 的通用写门（`NOTICE_PUBLISH_ROLES` 不含 `leader`）**管不到私信**（私信不经该口）。
- 前端判据单一源已存在（`services/governance/notice.js::canSendDirectMessage` ＝ 支委层 ∪ leader），但服务端**无对应复算**（违 `D-677`「判据须落在 api 面的真实行为上」）。

### 二、做法

- 在 `server/routes/resources/gates.js` **文件末尾**追加 `_snapshotNoticeMessageGateDeny(db, payload, actor)`（**不改动上文任何行号**；角色集同源 `constants.js::BRANCH_COMMISSION_ROLES`，与既有 `ACTIVITY_WRITE_ROLES` 同法）＋ `NOTICE_MESSAGE_DENY_MSG`；`import { RESOURCE_TABLES, listTable }`（同为一行）。
- `server/routes/resources/index.js` 快照口 **等行数**接入：`_snapshotActivityApprovalGateDeny(...) || _snapshotNoticeMessageGateDeny(...)` ⇒ **行号零位移**（`README-server` / `doc-line-ref` 无改签）。
- **只拦「新增 / 篡改」**（同快照口批准门口径）：新增私信须「有发送权 ＋ `fromPersonId` ＝ 本人」；既有私信 `fromPersonId` 不可改、非作者不得改 `audiencePersons`；**未变行照旧放行**（快照整表写穿，正常同步必带收发双方在库私信）。
- `README-server.md §2.3` 写门表加一行（含 `gates.js:235` / `index.js:301` 引用）；`.ctx/logs/2026-10-DECISION_LOG.md` `D-748` 加**补记**，并把「本月目录」状态由「已裁（待落）」改准为**已落**。

### 三、判据与反例

- **单元件** `notice-message.test.mjs` 新增 `N3`／`N4`（发送权矩阵 · 代发拦截 · 非私信放行 · 未变行放行 · 篡改作者 / 收件人拦截）；**反例自检**：把该门改恒 `null` ⇒ **`N3`／`N4` 判红（2 fail）**，复原后 4/4 绿。
- **api 面实证**（`permission-gate.test.mjs` 新增一件，自包含 `createApp(:memory:)` ＋ `seedDatabase`）：普通成员（p7）直连 `POST /snapshot` 伪造私信 ⇒ **403**；支书（p13）本人发 ⇒ **200**。
- 守卫子集（14 文件）**105/105 / 0 红**。

### 四、边界（如实）

- `POST /notices` 的既有通用写门**不动**（私信不经该口）；「**删除**私信」**未设门**（沿用既有）；**跨支部**仍未在服务端过滤（§7.1 既有口径，另立项）。
- 本批**只改 `server/**` ＋ `README-server.md` ＋ `.ctx/**`** ⇒ **未 bump 版本戳**（无 `docs/src/**` 改动）；`ACTIVE_RULINGS` 零行（`D-748` 口径未变，本批是其 api 面执行）。
- **全量 probe（收尾实跑）**：批次 391→393 ＝ 降频窗内**第 3 个 commit** ⇒ 依 `D-784`「3–4 个 commit 全量一次」本批跑全量，**实读 `964 / 964 / 0 红`**（覆盖 391–393 改动面；较批次 390 全量 958 增 6 项）。⚠ 进程退出码非 0 系**沙箱拒绝写 Playwright `debug.log`**（`TRAE Sandbox Error: hit restricted`），**非测试失败**——判据以 `ℹ pass 964 / fail 0` 为准；临时日志 `.tmp-full-393.log` 未留盘、跑完已停服。


***

## 批次 394（2026-10-05 · `D-749`）README-server **沿革注记清零** —— `#8`「README 为什么这么大」收口

> **来源**：objective #8（「我不理解为什么 README 文档会这么大！……一定要清理干净」）＋ `D-749`（支书 2026-10-03 口径：沿革注记一律清出，最多留个把指针，且**只指 active file、绝不指 log**）。

### 一、做法

- codemod（`server/.tmp-codemod394.mjs`，跑完即删）按 **28 条锚点** 逐处清 `批次 N` / 纯日期 / `D-xxx`，**保留现行口径正文与 `文件:行号` 引用**；每条锚点断言「恰好命中 1 次」才写盘（不唯一即中止）。
- 清后复跑探针：`批次 N` **0 行** · `D-xxx` **0 行** · 纯日期剩 **1 行**（§7.1#2 表内**引用代码注释原文**的 `（2026-09-15 裁定）`——引用保真，**如实登记为口径例外**，不擅改）。
- **无删行 / 无加行**（全部原位改写）⇒ 文件行数 **1563（不变）** ⇒ 全文 `文件:行号` **零位移**（`doc-line-ref` 无需「引用并入保留段」）。

### 二、读数

| 指标 | 前 | 后 |
| --- | --- | --- |
| 字节 | 195,852 | **192,586**（−3,266） |
| 行数 | 1563 | 1563 |
| `批次 N` 行 | 28 | **0** |
| `D-xxx` 行 | 7 | **0** |
| 纯日期行 | 29 | **1**（例外） |
| `文件:行号` 引用行 | 201 | 201 |

### 三、顺带收口（陈旧台账）

- 同批发现并改准 **5 条**「已裁（待落）」实为**已落**的决策日志「本月目录」行：`D-752`（批次 361 · §4 已改「指针 ＋ 增量」，现 571 行）· `D-751`（批次 358 · `soft-void.js` 含 `signups`/`propTasks`）· `D-750`（批次 359 · `services/activity/work-assignment.js` 全 CRUD）· `D-746`（批次 352/352b · `SOFT_VOID_RESOURCES` 补 5 张）· `D-744`（CRUD 余项分批已全落）。
- `D-749` / `D-752` 各补「落地」注；`.ctx/TIMESTAMPS.md` 的 `README-server.md` 备注列收为「现状 ＋ 沿革见 `.ctx/logs/`」。

### 四、判据与边界

- 守卫：`doc-consistency` · `doc-line-ref` · `link-integrity` · `version-stamp` · `timestamps-note-guard` · `date-canon-guard` · `frontmatter-freshness` · `catalog-sync` · `module-load` ＝ **68/68 / 0 红**（含 `doc-consistency::S14` 十一组定量锚点全在位）。
- 边界：**只改 `README-server.md` ＋ `.ctx/**`** ⇒ **未 bump 版本戳**；`ACTIVE_RULINGS` 零行。
- **全量 probe 未跑**：本批为降频窗内**第 4 个 commit**，而**上一个 commit（批次 393）刚跑过 `964/964/0`** ⇒ 依 `D-784`「3–4 个 commit 一次」**顺延至下一窗**（避免重复全量）。


***

## 批次 395（2026-10-05 · `R-89` 续批（第九轮））TIMESTAMPS 备注列 **`N4 T-编号` 余 20 格收敛**（合计 32,729 → 31,250）

> **来源**：objective #8「裁定时间戳 非常浪费内存」＋ `R-89`。本批为**结构上可做的最后一轮**——余下 3 格是 `N7` 要求的「四份清单各不相同的非空下限」。

### 一、做法

- codemod（`server/.tmp-converge395.mjs`，跑完即删）按 **path → 新备注** 映射改写 20 格（不靠正则匹配旧文）；旧备注**逐字**收集并迁入本日志附节。
- 清后复量：`N4` **21 → 1**（仅留 `.ctx/logs/2026-08-EXECUTION_LOG.md`）；备注列合计 **32,729 → 31,250**（291 行不变）；最长单格 **937**。
- `COMPONENT_SPEC.md` 只**摘去 `T-282`**、**保留 ≥4 处「批次 N」** ⇒ 仍作 `N6` 的非空下限（故不在 `N4`、仍在 `N6`）。

### 二、判据

- `timestamps-note-guard` **7/7**（`N4` 1 · `N5` 1 · `N6` 1 · `N3` 0 · `N2` 预算 31,600 下调后仍绿 · `N1` · `N7` 四份清单互不相同）。
- 四份清单（**非空下限，三者互不相同**）：`N4`＝`.ctx/logs/2026-08-EXECUTION_LOG.md` · `N5`＝`docs/src/entries/pages/notice-entry.js` · `N6`＝`content/04_web_design/design-system/COMPONENT_SPEC.md`；`OVERLONG`＝空。

### 三、⚠ 结构上限（如实登记）

- **`R-89` 已到「无 `N7` 放宽则不可再降」的上限**：四份清单必须**互不相同**且至少一份非空 ⇒ 各留 1 格为下限。要**三条一并清零**，须把 `N7` 收窄为「**非空清单之间互不相同**」（空表不参与比对）——**属改守卫判据 · 已登记「待支书圈」**（照 `S13` 阈值先例：改判据须核可）。

### 四、边界

- 只改 `.ctx/**` ＋ `server/test/timestamps-note-baseline.mjs`（数据）＋ `server/README.md` 实测数 ＋ `CLAUDE.md` 进度行 ⇒ **未 bump 版本戳**；`ACTIVE_RULINGS` 零行。
- 全量 probe：本批为降频窗内**第 5 个 commit**；上一窗（批次 393）刚跑 `964/964/0` ⇒ 顺延。

***

### 附：TIMESTAMPS 备注列迁出的逐批沿革（2026-10-05 批次 395 · `R-89` 续批 · `N4 T-编号` 余 20 格）

> 收敛路径同前：历史沿革**逐字**迁入本日志、原位只留「现状 / 边界 ＋ 沿革指针」。本批 **20** 格（保留 `.ctx/logs/2026-08-EXECUTION_LOG.md` 1 格为「清单非空下限」）。

- content/03_doc_system/PROCESS_GUIDE.md :: 🗑️ **已删除**（**2026-09-26 批次 202**：正文**整体并入** `content/03_doc_system/OPERATIONS_GUIDE.md`《运行与协作规范》的 **§15–§18**〔**编号一字未改**——原即承 OPERATIONS_GUIDE §1–§14 顺延；原 §18 内 `***` 分隔符按 §7.1 改 `---`〕⇒ **四份 → 一份**）（原：运行标准·流程机制 §15 甲部修改/§16 吸收外部输入/§17 周期性任务含 W4 五专项/§18 支书评议细节；T-282 自 OPERATIONS_GUIDE 拆分）
- content/04_web_design/design-system/COLOR_SYSTEM.md :: 🗑️ **已删除**（**2026-09-24 批次 172**：正文**整体并入** `content/04_web_design/design-system/DESIGN_SYSTEM.md` 的 **§二 色彩系统**〔编号 **2.1–2.8 一字未改**〕⇒ **四份 → 一份**；`D-638`）（原：色彩系统规范——T-282 自 DESIGN_SYSTEM 拆分 §二：色盘/主色/辅助色/中性色/功能色/表面色/配色规则；2026-09-20 批次 110 改准「6 → 7 个工作台」，批次 113 刷本行日期）
- content/04_web_design/design-system/COMPONENT_SPEC.md :: 🗑️ **已删除**（**2026-09-24 批次 172**：正文**整体并入** `content/04_web_design/design-system/DESIGN_SYSTEM.md` 的 **§四 组件规范**〔编号 **4.1–4.17 一字未改**〕；`D-638`）（原：组件规范——T-282 自 DESIGN_SYSTEM 拆分 §四：按钮/卡片/输入/侧边栏/导航/日历图例/数据展示/图标/选人/状态徽章；2026-09-20 批次 110 改准「待初阅队列」现状句、批次 41 沿革句原样保留，批次 113 刷本行日期）
- content/04_web_design/module/ABOUT_PAGE_DESIGN.md :: **（2026-09-28 批次 233：`related_files` 里的入口路径随「entries/ 按判据分三类」改准〔`docs/src/entries/about-entry.js` → `docs/src/entries/pages/about-entry.js`〕⇒ 按 R-83 刷卡；frontmatter 与本报行同批刷为 `2026-09-28`）** **（2026-09-26 批次 201：`D-660` 加「本文负责 / 本文不负责 → 去哪找」边界头〔本组判「分而治之」、未合并未删文件〕；由「另一路」落地，本表行日期按 `S13` 口径不刷）**  About 页面设计系统（超参数设定原则/防风格疲劳/无竖线红线，新建 T-272；T-278 无人称修缮）
- content/04_web_design/deploy/PKU_PARTY_INTEGRATION.md :: 🗑️ **已删除**（**2026-09-25 批次 181**：正文**整体并入** `content/04_web_design/deploy/DEPLOYMENT_GUIDE.md` 的 **§六 北大党校对接**〔内部 §一–§十一 → **6.1–6.11**〕⇒ **四份 → 一份**；`D-645`）（原：北大党校与智慧党建系统对接设计（党校单向爬取+智慧党建双向同步+数据映射+小程序归位说明+待确认清单，新建；对接授权=党委组织部支持；T-278 无人称修缮；2026-09-20 批次 110 资源表 32 → 35〔2 处〕，批次 113 刷本行日期）
- content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md :: **（2026-09-27 批次 213：清偿 `R-83` 债务——frontmatter `last_updated` 由 `2026-09-26` 刷为 `2026-09-27`（HEAD 提交日 2026-09-27 后 `F2` 判红；仅刷元数据、正文未改）；与本报行同值 ⇒ `S13` 绿）** **（2026-09-26 04 组减负续批：§8.2 L2 行「操作位收口」细节〔设置→支部治理 / 原支书台「工作台配置」tab 废止〕系复述 `PARTY_COMMITTEE_DESIGN.md` §2.5/§2.6，原位改一行指针；行数守恒；frontmatter 实读仍 `2026-09-26`、与表行同值 ⇒ `S13` 绿）** **（2026-09-26 批次 201：`D-660` 加「本文负责 / 本文不负责 → 去哪找」边界头〔本组判「分而治之」、未合并未删文件〕；由「另一路」落地，本表行日期按 `S13` 口径不刷）**  架构演进（组件化落地评估+轻量插件化「能力注册表」设计+迭代机制+实施路径，新建 T-276；无人称文体）
- content/04_web_design/deploy/WECHAT_INTEGRATION.md :: 🗑️ **已删除**（**2026-09-25 批次 181**：正文**整体并入** `content/04_web_design/deploy/DEPLOYMENT_GUIDE.md` 的 **§五 微信协同与小程序设计**〔内部 §一–§八 → **5.1–5.8**〕⇒ **四份 → 一份**；`D-645`）（原：微信协同与小程序设计方案（§八 新增北大对接数据展示；小程序独立问题归位本文档；T-278 无人称修缮）
- content/04_web_design/module/SOP_WEBSITE_GUIDE.md :: **（2026-09-26 批次 202：03《运行与协作规范》合并后引用改准〔`:187` → `OPERATIONS_GUIDE.md`〕；只改引用、`last_updated` 未刷〔`R-83` 债务〕；由同一批「另一路」落地）** **（2026-09-26 批次 201：`D-660` 加「本文负责 / 本文不负责 → 去哪找」边界头〔本组判「分而治之」、未合并未删文件〕；由「另一路」落地，本表行日期按 `S13` 口径不刷）**  SOP-系统联动方法（T-278 无人称修缮）
- content/04_web_design/deploy/AUTHENTICATION_MODEL.md :: 🗑️ **已删除**（**2026-09-25 批次 181**：正文**整体并入** `content/04_web_design/deploy/DEPLOYMENT_GUIDE.md` 的 **§四 认证与登录门控**〔内部 §一–§八 → **4.1–4.8**〕⇒ **四份 → 一份**；`D-645`）（原：部署与认证场景模型（5 场景两轴正交 + 侧边栏统一 + 登录门控四层；T-278 无人称修缮）
- server/test/b3-1-makeup-writeback.test.mjs :: B3-1 补课完成→考勤回写验证（T-280 新建，5 项断言；**2026-09-24 批次 176：补 1 行 CDN `route.abort`**〔`:17`〕，`D-642`）
- docs/src/core/session/cross-page-state.js :: 跨页状态（T-280 B1-5 版本化 `CODE_VERSION`；**2026-09-22 批次 141 bump 自增 264 → 265**——`docs/scripts/bump-version.mjs` 每次 bump 自增，勿手改；**截至 2026-09-23 批次 155 已随各批 bump 至 `CODE_VERSION` 275 / 全站版本戳 `20260922k`**）
- docs/src/entries/workspace/ws-visitor-entry.js :: 访客/成员工作台入口（T-279 M3 薄壳化 + T-280 B1-5 条件抑制+高亮存活）
- docs/src/services/member/person.js :: 人员数据抽象服务（PersonStore，T-142 阶段2）
- docs/src/services/governance/secretary-overview.js :: 支书全局概况服务（T-143，E2 派生待办 flow；**2026-09-21 批次 132：`_aggAttendanceRemind` 排除不考勤类型**〔支委会〕——单源 `policy attendnoAttendanceTypes`，`D-558`）
- docs/src/capabilities/activity-calendar.js :: 首页活动日历能力声明（自注册模式，T-279 M1 新建）
- docs/src/capabilities/leader-workspace.js :: 组长工作台能力声明（tab 清单自注册，scope='workspace:leader'，T-279 M2e 新建）
- docs/src/capabilities/org-workspace.js :: **（2026-09-28 批次 227：R10「成员流动」拆 tab——在 `roster` 后注册 `{ id:'member-flow', label:'成员流动' }`（组织台 **11 → 12**）；`D-675`）** 组织委员工作台能力声明（tab 清单自注册，scope='workspace:org'，T-279 M3 新建）
- docs/src/capabilities/prop-workspace.js :: 宣传委员工作台能力声明（tab 清单自注册，scope='workspace:prop'，T-279 M3 新建）。**边界**：tab 数 9；改 tab 结构须同批改 `help.html §0.1/§2.3` 与 `README-server.md §3.2.3`。
- docs/src/capabilities/visitor-workspace.js :: 成员工作台能力声明（tab 清单自注册，scope='workspace:visitor'，T-279 M3 新建）
- docs/src/about.css :: **（2026-09-28 批次 227：CSS 零引用类全删——本文件 **3 类**（净 −26 行）＋ `.ab-edge-arrow{}` 空规则 / `.ab-hero-scroll-hint` 死 `animation` ＋ 孤立 `@keyframes ab-bounce-hint`；⚠ 本文件另有**他人未提交**改动（删 `.ab-bounce-hint` / `.ab-edge-arrow`）、**非本批**；`D-675`）** 关于页独立样式表（ab-* 内容区 + 南西油墨宋 @font-face + Tailwind 最小兜底，about.html 独占引用；T-272 第一章错落无竖线/第二章文字优先）
***

## 批次 396（2026-10-05 · `R-89` **收口**）`N7` 判据收窄（支书核可）＋ `N4`/`N5`/`N6` 三份清单**清零**

> **来源**：支书 2026-10-05 圈**甲「收窄 `N7`」**（本轮 AskUserQuestion）。此前批次 392 / 395 如实登记的「结构上限」（四份清单须互不相同且至少一份非空 ⇒ 各留 1 格）由此解除。

### 一、做法

- **改判据**：`timestamps-note-guard::N7` 由「四份清单**均为非空**且互不相同」收窄为「**非空**清单之间互不相同」（空表不参与比对）；**同批**把 `N4`/`N5`/`N6` 的「非空下限」3 格收敛（T-编号 / 日期复述 / 批次号罗列 各摘净）⇒ **四份清单全空**（达标态）。
- **非空转不靠 `N7`**：`N1`（`ROWS_MIN＝245`）＋ `N2`（预算 31,400 ＋ 冻结高水位 95,000）＋ 各清单「清单 ≡ 命中集」双向相等 仍各自成闸（命中非空而清单被清 ⇒ 判红）。
- 旧备注 3 条逐字迁入本日志附节；预算 31,600 → **31,400**。

### 二、读数

| 指标 | 批次 395 后 | 本批后 |
| --- | --- | --- |
| 备注列合计 | 31,250 | **31,106** |
| 预算 | 31,600 | **31,400** |
| `N3` 单格 >1000 字 | 0 | 0 |
| `N4` 含 `T-编号` | 1 | **0** |
| `N5` 日期复述 | 1 | **0** |
| `N6` 批次号罗列 >3 | 1 | **0** |

### 三、判据

- `timestamps-note-guard` **7/7**（`N7` 收窄后：无「非空清单」可比 ⇒ 互不相同恒成立；四份清单全空）。

### 四、边界

- **改判据已获支书核可**（本轮圈甲），**非越权**；遵循 `S13` 阈值那类「改判据须核可」通例。
- 只改 `.ctx/**` ＋ `server/test/timestamps-note-{guard,baseline}`（判据 / 数据）＋ `server/README.md` ＋ `CLAUDE.md` ⇒ **未 bump 版本戳**；全量按 `D-784` 顺延。

***

### 附：TIMESTAMPS 备注列迁出的逐批沿革（2026-10-05 批次 396 · `R-89` 收口 · `N4`/`N5`/`N6` 最后 3 格）

> 收敛路径同前。本批 **3** 格（三份清单的「非空下限」）。

$body


***

## 批次 397（2026-10-05 · 立据）支书本轮**四条裁定**入决策日志（`D-786`…`D-789`）＋ 降频窗全量 probe

> **来源**：本轮 `AskUserQuestion` 四条答复（守据 `R-84`：**裁定进决策日志**）。

### 一、立据（四条）

- `D-786` **`N7` 判据收窄**（支书圈甲）——四份清单「均为非空且互不相同」→「**非空**清单之间互不相同」（已由批次 396 落地）。
- `D-787` **「今天」页九业务域先「合并同类项」**（支书逐字「九类 可以再 合并合并 同类项！」）⇒ 先减类、配色随合并后再议。
- `D-788` **问卷字段清单已提供**（~24 列）⇒ 令建「成员自我描述」表单 ＋ 字段模型 ＋ 导入链；`V-10b` 由「待数据」**转在办**。
- `D-789` **`P.16` content 瘦身「继续按方案推进」**（31 → 9 份）。

四处计数同刷（文首 61 条 / 下一条 `D-790` · 续编说明 · 本月目录 4 行 · 月度索引 `DECISION_LOG.md`）。

### 二、降频窗全量 probe（依 `D-784`）

- 本窗＝批次 394–397（4 个 commit）⇒ 跑全量，**实读 `964 / 964 / 0 红`**（较批次 393 同值——本窗改动为文档 / 台账 / 判据面，未增减用例）。
- ⚠ 退出码非 0 仍系**沙箱拒绝写 Playwright `debug.log`**（`TRAE Sandbox Error: hit restricted`），**非测试失败**；临时日志未留盘、跑完已停服。

### 三、边界

- 只改 `.ctx/logs/**`（立据）⇒ **未 bump 版本戳**。
- **下一步在办**（按 `D-787`/`D-788`/`D-789`）：九业务域合并草案 · 问卷表单 / 字段模型 / 导入链 · `P.16` 继续合并。


***

## 批次 398（2026-10-05 · `D-787`）「今天」页业务域 **9 → 6 类合并**（单一源统一改）

> **来源**：本轮 AskUserQuestion —— 支书「九类 可以再 合并合并 同类项！」＋ 圈**乙「9 → 6 类」**、**甲「单一源统一改」**。

### 一、合并方案（9 → 6）

| 合并后（6 类） | 由谁合并 | 域键 |
| --- | --- | --- |
| **项目** | 会务 · 活动 · 专班 | `project` |
| 考勤纪律 | —— | `attendance` |
| 考察 | —— | `inspection` |
| 成员发展 | —— | `member-dev` |
| **上报与汇报** | 决议上报 · 汇报反馈 | `report-up` |
| 归档宣传 | —— | `archive` |

（＋ `none` 通知/未分类，不入域序）

### 二、做法（单一源 `docs/src/services/governance/todo.js`）

- `WORK_DOMAIN` 枚举 → **6 类 ＋ `NONE`**；`WORK_DOMAIN_LABELS` / `DOMAIN_ORDER` 同源改准。
- **存量旧域键读取归一**：新增 `_LEGACY_DOMAIN`（`meeting/activity/taskforce → project`；`resolution/report → report-up`），`inferDomain` / `_effDomain` / `_buildTodo` 三处归一 ⇒ **旧数据不回丢、写入即归一新键**。
- `inferDomain`：`taskforce-*` → 项目 · `resolution-*` → 上报与汇报 · `signup-review` 两源同域 · `authorize/participate` 一律项目（三会一课 scenario 表随之全为项目）。
- `REALTIME_GROUP_DOMAIN`：`review-*` → 项目 · `resolution-followup-remind` / `todo-void-confirm` → 上报与汇报。
- 消费面同批：`services/branch/workforce.js::DUTY_DOMAIN` · `entries/tabs/secretary/todo-tab.js` · `today-summary.js` / `today-tab.js` 注释。
- **配色**：`constants.js::WORK_DOMAIN_COLORS` **暂清空**（原「项目线三域」三色随合并失效；支书明示**配色随 6 类再议**）⇒ 各域胶囊一律中性。**待支书指色**。

### 三、判据（改判据与改实现同批）

- `todo-domain`（枚举 7 常量 / 旧键归一 / 映射逐条）· `todo-domain-view`（`DOMAIN_ORDER` 6 · 域序 · 实时融合）· `todo-deriver-domain`（13 处域期望）· `today-action-groups-e2e::S12`（`DOMAIN_LABELS` 6 类 · `WORK_DOMAIN_COLORS` 暂空）· `perf-todo-agg-cache` 期望串 —— 全批改准。
- **实跑**：`npm run test:daily` **747 / 747 / 0**；`npm run test:fast` **146 / 146 / 0**。

### 四、文档同批（一改具改）

- `content/04_web_design/design-system/DESIGN_SYSTEM.md` §2.9「业务域识别色」行改准（**现空 · 配色待定**）· `content/04_web_design/evolution/BRANCH_WORK_MAP.md`（「专班」域 → 「项目」域）· `docs/help.html` 待办折组列表（九域 → 6 类）· 根 `README.md` 工作域折组 · `CLAUDE.md` `V-6` 行（合并已落 · **仅配色待裁**）。
- 版本戳 **`20261005d → 20261005e`**（`docs/src/**` 改动；bump 实测 JS 224 / HTML 23 / CSS 2 / server-test 92，陈旧戳 0）。

### 五、边界（如实）

- **配色未定**（`WORK_DOMAIN_COLORS` 空表）⇒ 今天页各域胶囊**中性**；待支书指色后逐键补入（`today-action-groups-e2e::S12` 已留「定色后同批复用」的条件断言，非恒真）。
- `TIMESTAMPS`：`today-summary.js` 行日期刷 `2026-10-05`、`TIMESTAMPS.md` 自身 `last_updated` 两处刷 `2026-10-05`；`today-tab.js` / `todo-tab.js` / `todo-tab-shell.js` **无表行**（既有覆盖缺口，只登记）。
- 全量 probe：本批为降频窗内**第 6 个 commit**（上一窗批次 397 已跑 `964/964/0`）⇒ 顺延；本批以 `test:daily` ＋ `test:fast` 覆盖。


***

## 批次 399（2026-10-05 · `D-787` 续 · 配色）业务域 **只给「项目」配红金**

> **来源**：本轮 AskUserQuestion —— 支书圈**乙「只给『项目』配红金」**。

- `constants.js::WORK_DOMAIN_COLORS` 由**空表**改为**恰一键 `project`**（取**会务红族**：`rgba(206, 17, 38, 0.08)` / `_C.red800` / `rgba(206, 17, 38, 0.25)`）；其余五类**中性**。**金族留给活动类别色**（主题党日金），**不重复占用**。
- 判据同批：`today-action-groups-e2e::S12` ④/⑤ 由「现空」改为「**恰一键 `project`** 且色键 ∈ `DOMAIN_ORDER`、`bg/text/border` 齐备」（**非空转**：防「碰巧无项目域待办」假绿）。实跑该件 ＋ 域相关 / 结构守卫 **80 / 80 / 0**。
- 文档一改具改：`content/04_web_design/design-system/DESIGN_SYSTEM.md §2.9`（业务域识别色＝只给「项目」）· `CLAUDE.md` `V-6` 行（**配色已落**）。
- 版本戳 `20261005e → 20261005f`（JS 224 / HTML 23 / CSS 2 / server-test 92，陈旧 0）。


***

## 批次 400（2026-10-05 · `D-788` / `V-10b` 第一批）成员「**自我描述**」字段模型 ＋ 双端写口（含**本人自填靶向例外**）

> **来源**：本轮 AskUserQuestion —— 支书提供**问卷导出字段清单**（~24 列）＋ 圈**甲「扩 `people.js`」**（落点）· **甲「本人可填 ＋ 支委层代录」**（录入主体）· **甲「粘贴/CSV ＋ 预览」**（导入形态）。本批＝**字段模型 ＋ 写口**（表单 / 导入链另批）。

### 一、字段模型（**零依赖叶子** ＝ 单一源）

- 新建 `docs/src/core/domain/self-profile.js`：**15 字段 · 四类形态**（`text` / `bool` / `multi` / `list`），含 `SELF_PROFILE_FIELDS`（定义表）· `emptySelfProfile()` · `sanitizeSelfProfile()`（白名单键 / 类型归一 / 去空去重 / 限长 500 / 子表 ≤20 行 / 坏输入不崩）· `isSelfProfileEmpty()`。
- **不重复存**档案已有字段（姓名 / 学号 / 发展阶段）；问卷 ~24 列去重为 **15 字段**。

### 二、写口（双端单一源 ＋ 靶向判据）

- 前端 `services/member/person.js`：`MEMBER_FIELDS` / `API_PROFILE_FIELDS` 增 `selfProfile`；`_cleanMemberRecord` 按叶子净化（全空 ⇒ 不落字段）。
- 服务端 `routes/member.js`：`PROFILE_FIELDS` 增 `selfProfile`；`PATCH /members/:id/profile` 由 `requireRole(ORG_COMMISSIONER_ROLES)` 改 `requireAuth` ＋ **靶向判据**（组织委员 ⇒ 全白名单；**靶标＝本人 ⇒ 仅 `selfProfile`**；其余 403），并**服务端净化**（不采信客户端键集，同 `R-22`）。

### 三、判据

- 新建 `server/test/self-profile.test.mjs`（**A** 叶子 3 件 · **B** mock 写链 · **C** api 写链 2 件；含**反例自检**：把门改回组织委员专属 ⇒ `C1` 判红）。
- **同批改准**：`permission-gate` R-10 ⑥（本人对**自己**的非 `selfProfile` 字段 ⇒ **400**；对**别人** ⇒ **403**，两条分别断言）。
- **实跑**：`npm run test:daily` **753 / 753 / 0**（含新增 6 件；文件 111 → 112）；S16 守卫注册同步入档。

### 四、文档 / 台账同批

- `DATA_MODEL.md §2.26`（`selfProfile` 行 ＋ **15 字段子表** ＋ 行为口径②靶向判据）· `§三 单一源` 加行；`README-server.md §4.30` 加段。
- **`文件:行号` 改签**：用 **LCS 行映射**（HEAD ↔ 现版）改准 README-server 的 **15 处**引用（`DATA_MODEL.md` / `member.js` / `person.js`）；另**手工改准 2 处**（LCS 对「新增行 → 空行」不敏感）；`§7.1#8` 的「前后端门不一致」注**保留**并补「本人自填例外**不影响**支书 / 副支书 403 口径」。
- 版本戳 `20261005f → 20261005g`；`TIMESTAMPS`：`person.js` 刷 2026-10-05、新件补行。

### 五、边界（如实）

- **表单（模态字段）与导入链（粘贴 / CSV ＋ 预览）** 尚未落 ⇒ 另批（`D-788` 在办）。
- 演示种子 `people.js` **未加 `selfProfile` 样例**（展示面随表单批）；`person-entry.js` / `member.js` **无 TIMESTAMPS 表行**（既有覆盖缺口，只登记）。


***

## 批次 400 收尾 · 降频窗全量 probe（依 `D-784`）

- 本窗＝批次 **398–400**（3 个 commit：业务域 9→6 合并 · 只给「项目」配红金 · 成员「自我描述」字段模型 ＋ 写口）⇒ 跑全量，**实读 `970 / 970 / 0 红`**（较批次 397 的 964 增 **6**，＝新件 `self-profile.test.mjs`）。
- ⚠ 退出码非 0 仍系**沙箱拒绝写 Playwright `debug.log`**（`TRAE Sandbox Error: hit restricted`），**非测试失败**；临时日志未留盘、跑完已停服。


***

## 批次 401（2026-10-05 · `D-788` / `V-10b` 第二批）成员「自我描述」**表单** ＋ 本人自助填写入口

> **来源**：`D-788` 在办续（支书圈「**本人可填 ＋ 支委层代录**」）。

### 一、做法

- **表单**：`components/governance/person-edit-modal.js` 新增「**自我描述**」一组——**逐字段按叶子渲染**（`text`→单行、`bool`→三态「未填 / 是 / 否」、`multi`→多项以 `;` 分隔、`list`→文本框「每行一条、子项以 `|` 分隔」）；**字段清单与标签都由叶子给**（不另写字段名）。
- **本人自助模式**：模态新增 `selfOnly` 选项——**只出「自我描述」一组**、**只写 `selfProfile`**（其余档案字段归支委层），标题改「我的自我描述」。
- **入口**：`entries/pages/person-entry.js` 在 `isSelf`（无 `?id=` ＝ 自己看自己）时出「**填写我的自我描述**」按钮 ⇒ `openPersonEditModal({ selfOnly: true })`。
- **叶子新增** `selfProfileListToText` / `selfProfileListFromText`（**子表 ⇄ 文本格式单一源**；表单与后续导入链同用）；`person.js::_cleanMemberRecord` 改为「**显式传入即保留**（含空对象）」⇒ 支持**清空**自我描述。

### 二、判据（真机 ＋ 单元）

- 新建 **真机件** `self-profile-e2e.test.mjs`（自包含 `createApp(:memory:)` ＋ 真登录 p1 / 2400012345）：① 本人档案页有该入口；② 模态**只**出自我描述控件（**无**「姓名」等）；③ 填「专业」＋子表提交 ⇒ 模态关闭 ⇒ **再次打开值仍在**（落库 → 读回闭环）。**实跑 1/1**。
- `self-profile.test.mjs` `B1` 改准（显式空 ⇒ 落空对象 ＝ 清空；未提供 ⇒ 不落）。
- 同批改签：`form-loop-registry.mjs` 里 `person-edit-modal.js` 的校验点行号（272 → 334）；`sweep-shard.mjs` 分片池新增该 e2e（`suite-shard::G1` 要求）；`package.json` `test:daily` 增该件。
- **实跑**：`npm run test:daily` **754 / 754 / 0**；`test:fast` **146 / 146 / 0**。

### 三、文档 / 台账

- `docs/help.html` §功能地图「成员档案」行补「本人可填 / 改自我描述 ＋ 支委层可代录」。
- 版本戳 `20261005g → 20261005h`；TIMESTAMPS **无新增行**（`person-edit-modal.js` / `person-entry.js` **无表行**，既有覆盖缺口，只登记）。

### 四、边界（如实）

- **导入链（粘贴 / CSV ＋ 预览）** 未落 ⇒ 第三批（`D-788` 在办）。
- 「自我描述」**未进快照字段白名单**（`person-consistency::SNAPSHOT_FIELDS` 不列它）——不参与快照等价断言；亦**未加演示种子样例**。
