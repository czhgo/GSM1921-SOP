---
title: "2026年10月执行日志"
type: execution_log
role: "[工程师]+[AI]"
last_updated: "2026-10-03"
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
