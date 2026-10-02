---
title: "2026年10月执行日志"
type: execution_log
role: "[工程师]+[AI]"
last_updated: "2026-10-02"
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
