---
title: "工程化评估与改造行动线"
type: design
role: "[工程师]+[AI]"
created: 2026-09-03
last_updated: "2026-09-09"
status: active
related_files: [content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md, content/04_web_design/evolution/WORKFLOW_BLOCK_CONTRACT.md, content/04_web_design/evolution/PARTY_COMMITTEE_DESIGN.md, content/04_web_design/module/SOP_WEBSITE_GUIDE.md, content/04_web_design/deploy/DEPLOYMENT_GUIDE.md, .ctx/REVIEW_QUEUE.md]
---

# 工程化评估与改造行动线

> **定位**：书记 2026-09-03 问询「如果做一次 模块化、插件化、开源化 的 100 分评估，你会怎么输出？我以此来指导你」（原「模块化 / 插件化 / 开源化评估」据此更名，2026-09-09）。本文档为该工程化评估与改造方向的**现行唯一口径**：评估结论、工程范式纪律与行动优先级一体维护，作为后续开发顺序的方向选择依据。**覆盖式维护、不逐轮留历史行**，口径沿革见附。
> **受众**：[工程师]+[AI]（架构维护者）+ 书记（方向裁决人）
> **关联**：`content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md`（组件化/插件化演进母文档，评估正文已压为其 §二 历史结论段）、`content/04_web_design/evolution/WORKFLOW_BLOCK_CONTRACT.md`（L3 工作流块契约，P2 行动承接）、`content/04_web_design/evolution/PARTY_COMMITTEE_DESIGN.md`（两级治理设计）、`.ctx/REVIEW_QUEUE.md`（全局评估总表，本文件一行）。

---

## 一、评估总览

> **书记 2026-09-06 再评定调**：① 综合分反映的是**二开组合能力**（模板型交付下「别人能否快速换壳用起来」），不是纯工程内聚分；② **重改进不唯分**——分数只作方向指引，重点看残项清单与行动是否推进（本轮 74→76 主要是**口径回归二开组合能力 + 新增可换壳证据**，不是"凭空改出 2 分"）；③ **开源长期交付形态 = 模板型**——仓库是「制度即代码」模板，随附示例组织（本科生党支部）只是可整体替换的默认值，文档与演示以「给新组织换壳」为叙事主线（落地：四 P4a 根 README 30 分钟换壳指南 + 演示数据一键重置 `?reset=1`）。

| 维度 | 得分 | 一句话结论 |
|------|------|-----------|
| 模块化 | 75 / 100 | 五层分层 + 组件积木 + tab 懒加载为真；esc/fmtDt 微工具、类型/阶段元数据、写场景清单等重复/三写均已收敛（近三轮新代码引入重复趋零）；残项=徽章/选择器等组件出口仍散、服务层个别 UI 依赖 |
| 插件化 | 75 / 100 | registry 自注册 + config.modules/blocks/workforce「配置即组合」+ module-compose v0 契约（depends/conflictsWith 纯校验 + 测试 + 文档）落地；残项=requiredRoles 门禁未被 workspace-shell 消费（仅元数据）、manifest 防漂移测试未全落地 |
| 开源化 | 74 / 100 | 根 README 已一般化、以「复用与二次开发（给其他组织）」为核心章节且增 30 分钟换壳指南（四 P4a）；数据真人化可整体替换（people/accounts 2026-09-06 基线）；MIT + CONTRIBUTING 齐；残项=无 English 版、release 发布工作流未做 |
| 超参数可调性 | 78 / 100 | policy-defaults 集中默认单一源：票决门槛（应到 2/3+无异议）/ 会议类型与上传位例外 / 考察超期天数 / 应到名单 roster（partyStages+excludeDetained，**已含滞留口径**，2026-09-06）逐项标注 branch-default 可调 / institutional 固定；残项=未接 config 驱动（可调仍改码，留 v1） |
| 组合能力（二开视角） | 78 / 100 | 组合面=模块/块/分工启停排序（2026-09-09 批3 起操作位=设置→支部治理「工作台默认顺序 / 支部信息与向导」（书记/副，副书同权）+ 党委台「支部配置」party-config-tab（party-staff））+ config.modules/blocks/workforce + L3 block manifest + module-compose v0 契约与测试 6/6 绿；证据=支部书记/副书记可视启停排序入口 + config 净化单源 config-clean；残项=requiredRoles 未消费、拖拽编排仅主题党日一处（L1→L5 未达） |
| **综合（当前）** | **≈ 76 / 100** | 五维均值（75/75/74/78/78）——书记 2026-09-06 再评定调「综合分反映二开组合能力 + 重改进不唯分 + 开源长期交付形态=模板型」；失分仍=无 config 驱动可调（默认/阈值改码）、requiredRoles 未消费、拖拽编排未实现、server 登录默认口令弱（行动线 P1b 已加口令校验，缺省 123456 + dev/demo 免密路径在，生产须显式换密）、无 English 版 |

> **主要矛盾 / 残项 TOP（一句）**：当前未闭合项集中在——组件出口仍散（徽章/选择器等）与服务层个别 UI 依赖（模块化）、requiredRoles 门禁未消费与 manifest 防漂移测试未全（插件化/组合能力）、可调默认未接 config 驱动仍改码（超参数）、拖拽编排仅主题党日一处 L1→L5 未达（组合能力）、无 English 版与 release 发布工作流（开源化）——均挂四行动线后续批次或残项跟踪（逐维依据见二）。

> 注（书记 2026-09-03 口径修正）：本仓库是支部自己的内部系统，**.ctx 日志与 references/历史会议材料均为内部资产、保留上传**，不存在"出仓脱敏"需求；三·3.3 R12 与行动线 P1b 中的出仓子项（脱敏/移出/账号外置/.ctx ignore）**全部撤销**。真正保留的工程项仅是「运行安全」：server 登录不校验密码在多人/计算中心部署时任何人可凭 personId 冒名登录（该运行安全项已由 P1b 于 2026-09-03 修复：默认口令校验可换 `LOGIN_PASSWORD` + `DISABLE_PASSWORD_CHECK=1` 逃逸门；本条保留撤销口径原貌）。

---

## 二、评分依据（逐维：得分项 / 失分项 / 残项；口径唯一=一速览，沿革见附）

### 2.1 模块化 —— 75/100

得分项：
- 五层分层清晰：core / services / components / modules(capabilities) / entries(tabs)；tab 动态 import 懒加载、capability 自注册。
- 组件积木化已落地：徽章全站统一、表单字段/外壳（forms.js）、收件箱、汇报域（reporting.js）等；表单 B1~B4 后输入件已全局收编（input-flat 14px、label for 关联、aria）。
- 组件平铺层同域多文件已收敛：forms.js / badges.js / reporting.js 三库出口建成（聚合重导出、实现不搬运、零行为变化）。
- esc/fmtDt 微工具、类型/阶段元数据、写场景清单等重复/三写均已收敛，近三轮新代码引入重复趋零（去重证据与去向见三·3.3）。

失分项 / 残项（后续跟踪）：
- 徽章/选择器等组件出口仍散：除三库外，query-view/picker/modal 等仍被各层逐文件直连。
- 服务层个别 UI 依赖（如 services/notice.js import badgeHtml 生成 HTML）。

### 2.2 插件化 —— 75/100

得分项：
- registry 自注册 + 按 scope 组装（workspace:secretary / workspace:party-committee）；支部实例化 + 支部级 fileSpaceIsolated。
- config.modules/blocks/workforce「配置即组合」：支部 tab/块 启停·排序 + 分工归属，净化单一源 config-clean.js（server 严格口径单向权威），tab-nav 守卫防隐藏冲突。
- L3 block manifest：块的 inputs 声明/事件/校验契约 v1.1（WORKFLOW_BLOCK_CONTRACT）+ manifests.js 双块 + 校验器 + 渲染桥 + config.blocks.workflowBlocks 配置区 + 主题党日入口守卫（S1~S4 全落地）。
- module-compose v0 契约：depends/conflictsWith 纯校验（引用存在/互斥同含/depends 禁环）+ 测试 6/6 绿 + 文档闭环（契约「组合声明」节 + registry 头注释）。

失分项 / 残项（后续跟踪）：
- requiredRoles 门禁未被 workspace-shell 消费（仅元数据，组合后授权弱）。
- manifest 防漂移测试未全落地。
- module-compose 仅前端纯校验：服务端 config 校验留 v1（插件安装/卸载概念未立）。

### 2.3 开源化 —— 74/100

得分项：
- 全程中文可读设计/规范文档；design（content）与 spec 职责已纠偏；代码带 role 标注与设计源链接；测试覆盖厚（模块加载 + 多组 E2E）。
- 根 README 已一般化、以「复用与二次开发（给其他组织）」为核心章节，且增 30 分钟换壳指南（四 P4a）；浏览器演示数据一键重置 `?reset=1`。
- 数据真人化可整体替换：people/accounts 2026-09-06 基线 + server/.env.example（示例账号外置 env），新机器按 README 可独立跑通并自建数据。
- LICENSE（MIT）+ 根 CONTRIBUTING.md 已补仓（2026-09-04）。

失分项 / 残项（后续跟踪）：
- 无 English 版。
- 语义化发布（release）工作流未做：`?v=` 软版本利于日常整体失效，但非语义化版本发布。

### 2.4 超参数可调性 —— 78/100

得分项（已参数化或已声明，判据：代码近旁可答「可调/不可调 + 默认出处」）：
- **policy-defaults.js 集中默认单一源**（行动线 P3c，2026-09-05）：票决门槛（应到 >2/3 且无反对，2026-09-06 书记裁，附录⑩ S2 R2-3）/ 会议类型与上传位例外 / 考察超期天数 / 应到名单 roster（partyStages+excludeDetained，**已含滞留口径**，2026-09-06）逐项标注 branch-default 可调 / institutional 固定 + 出处 + 消费点；消费点一律引用派生，不在业务层新写字面量。
- 表决配置 optionSet/voterScope/quorumCheck：默认=场景函数 vote-config.defaultVoteConfig(scenarioId)，每活动 voteConfig 可覆盖。
- 分工归属 config.workforce（SOP 缺省责任人，支委会议题改派）。
- 色值：styles.css 令牌与 COLOR_SYSTEM 固定/可调四层表对齐——党建红 `--party-red`/党徽金 `--party-gold` 固定不可调（已声明令牌化）、`--accent-*` 主题自选；styles.css ↔ COLOR_SYSTEM ↔ constants 三源一致、零游离字面量（行动线 P3e / 8.6 色值收敛）。

失分项 / 残项（后续跟踪）：
- policy-defaults 未接 config 驱动：可调默认仍以改码方式（常量默认 + opts 覆盖），config 驱动留 v1（行动线 P4d）。

### 2.5 组合能力（二开视角）—— 78/100

得分项：
- 组合面=模块/块/分工启停排序（2026-09-09 批3 起入口=设置→支部治理「工作台默认顺序 / 支部信息与向导」卡（书记/副，副书同权）与党委台「支部配置」party-config-tab（party-staff），原书记台「工作台配置」tab 已废止）+ config.modules/blocks/workforce「配置即组合」+ config-clean 单源净化。
- 能力注册表：capabilities/* 自注册，scope→工作台 tab 清单（台内固定组合的声明面）。
- L3 block manifest（inputs 声明/事件/校验 = 块级组合契约，落地于主题党日编排）+ module-compose v0 契约与测试 6/6 绿。
- 场景联动：scenarioId → defaultVoteConfig / 决策树模板（默认组合，可换）。
- 二开可换壳证据（2026-09-06）：根 README 30 分钟换壳指南 + `?reset=1` 演示重置（行动线 P4a）。

失分项 / 残项（后续跟踪）：
- requiredRoles 门禁未消费（组合后授权弱）。
- 拖拽编排（块组合的图形面）仅主题党日一处，L1→L5 愿景未达（行动线 P4d）。

---

## 三、工程范式与纪律

### 3.1 统一扎口范式（本评估确立的第一个工程范式）

书记定调：**同一域可以有若干个函数（甚至若干个实现文件），但对外只暴露一个库文件；调用方一律 import 该库，不直接触碰内部实现。**

落地样板（P0 试点一，已完成）：
- 新建 `docs/src/components/forms.js` —— 表单域唯一出口，聚合重导出字段积木（form-field：textField/textareaField/selectField/dateField/labelHtml/errorHtml）与外壳（form-shell：recordFormShell）。
- 三个直连调用方（dispatch-tab / write-tab / taskforce-tab）全部收口到库；仓库中已无直接 import form-field.js / form-shell.js 的调用方。
- 同批按同纪律完成：徽章域 `docs/src/components/badges.js`（P0 试点二）、汇报域 `docs/src/components/reporting.js`（P0 试点三）——三库后组件平铺层同域多文件收敛（见四 P0·统一扎口）。
- 回归：模块加载 116/116、party 相关 E2E 5/5 全绿，零行为变化。

**改造纪律（每次扎口必守）**：
1. 新增库聚合重导出，内部实现文件不搬运、不改名。
2. 调用方只改 import 来源一行；运行期零行为变化。
3. 每批扎口后跑 module-load + 受影响 E2E 回归。
4. 禁止双轨：一旦建库，同域内新代码一律走库，存量直连同步收口。

### 3.2 数据域接线契约 v1（2026-09-03 person 域试点确立）

**背景**：盘点显示全站 68 处直连 mock；mock/index.js 实为"旧兼容中转"（person 函数早已落到 services/person.js 又被 re-export 回 mock）。债根 = **UI/服务层 import 面挂在 mock，而非真正实现所在的 service**。收官态 = **UI 层（entries/components/modules）对 mock 的 import 直连清零**——全仓 mock 引用仅存于 services/core 数据层（种子接入点，契约允许）。

**试点与批次（全部已完成，2026-09-03）**：
- **试点（person 域）**：全站人名函数（getPersonById/getPersonName/PersonStore）import 面从 `mock/index`、`mock/people` 统一迁至 **`services/person.js`**（唯一服务出口）；`_personName` 兼容别名调用点全部改 `getPersonName`；`mock/index.js` 清除 person 中转段，退化为**纯种子/展示格式化数据仓**；涉及约 40 个文件，module-load + party/multi-user/write-hover/function-catalog 7/7 回归绿。
- **批次二（展示格式化提升）**：5 个纯展示格式化函数自 mock/* 原样提升至对应业务 service（attendanceToLong → services/attendance.js；inspectionToDisplay/inspectionToLong/inspectionToWide → services/inspection.js；reviewToDisplay → services/review.js）；mock/attendance|inspection|review.js 仅剩种子数组；7 个 UI 调用方 import 面改挂 services；module-load + mock-integrity + party + multi-user 7/7 回归绿。
- **批次三（成员名单 PEOPLE 收口）**：`services/person.js` 增 `PersonStore.getMembers()`（成员名单语义 = 静态党员种子，不含登录系统账号 mockDB.users——区别于 getAll）；全站 UI/组件/entry/tab 层 16 个文件直连 mock PEOPLE 改为经 `PersonStore.getMembers()` 模块级捕获；UI 层 PEOPLE 直连 mock **清零**（mock/index 的 PEOPLE re-export 仅剩 services 层 7 处种子引用，契约允许）；回归 module-load + party/multi-user/block-entry-guard/capability-registry 18/18 全绿。
- **批次四（余种子与机构/登录收口，收官）**：党委机构名 `branch.js` 增 `getCommitteeName()`，monitor/dispatch/branches 三个党委 tab 直连 mock/branches `PARTY_COMMITTEE` 改走服务（header 品牌软编码同域收敛）；账号登录 `auth.js` 增 `AuthStore.verifyCredentials()`，login-entry 直连 mock/accounts `mockLogin` 改走认证服务（真实后端接入时仅替换该实现）；达成 P0 收官态（UI 层 mock 直连清零）；回归 module-load + party-committee/dispatch + write-hover 5/5 全绿。

**契约条款**：
1. **人名与人员对象获取**（getPersonById/getPersonName/PersonStore）唯一出口 = `services/person.js`；任何层禁止从 `mock/*` 获取人名。
2. **成员名单**（PEOPLE 语义）唯一出口 = `services/person.js` 的 `PersonStore.getMembers()`；UI/tab/组件层禁止直连 mock 种子数组；种子数据仅许 service 层引用。
3. **展示格式化函数**（attendanceToLong/inspectionToLong/reviewToDisplay 等）统一栖身各业务 domain service（attendance/inspection/review），随记录读写同域演进；mock 数据模块不承载格式化逻辑。
4. 新代码一律遵守 1~3；存量收口按批次推进，每批回归。

### 3.3 冗余/重复去重审计与复核约定

> **定位**：书记 2026-09-03 要求「对多余、冗余、重复实现的代码高度批判性地思考并执行」。本审计只收录可证实（文件+行号）的重复，供书记裁决去重顺序。**审计原则：优先统一「同一业务事实的唯一出口」，再谈删代码——先扎口后去重，避免删完又长出第二份。**

#### 重复分组证据（收敛表；原证据文件:行，去向=行动编号见四，明细见执行日志 T-2026-09-033/034/035/036 与 2026-09-03 段）

| 组 | 重复事实 | 原证据（文件:行） | 收敛去向 |
|----|---------|----------------|---------|
| R1 微工具逐文件复制 | HTML 转义 `esc` 至少 10 个文件各写一份；`fmtDt` 双份 | inspector.js:482 / help-catalog.js:20 / activity-entry.js:43 / vote-widget.js:14 / vote-summary-panel.js:16 / review-tab.js:15-28 / report-up-tab.js:15-28 / party-config-tab.js:17 / branches-tab.js:14 / dispatch-tab.js:17（utils.js:127 的 esc 是 CSV 专用，非 HTML 转义） | ✅ 已收敛（P0a：core/utils.js 新增 `escHtml/fmtDt` 唯一出口，各文件 import 别名 `esc`，调用面零改动） |
| R2 类型/阶段元数据多写 | 三会四子类清单三份；阶段枚举另见 CANDIDATE_STAGES 与各 seed | constants.js:481-492 / inspector.js:356,374 / makeup.js:13,44 / dashboard/gallery.js:23（色名） | ✅ 收口 + 2 项复核保留（P0b：MEETING_TYPES→`ACTIVITY_CLASSIFICATION['three-meetings'].subtypes` 派生；TYPE_META/STATUS_META、MANDATORY_ACTIVITY_TYPES 与 gallery 色名复核保留，见下） |
| R3 产出块 id 消费端手写 | write-tab 重列 4 id 与 constants OUTPUT_BLOCK_DEFS 重复；calendar-tab 手写 THEME_DAY_BLOCK_ID 与 manifests.js blockId 重复 | write-tab.js:111,114-117,125-130 / constants.js:557-564 / calendar-tab.js:36 / manifests.js:26 | ✅ 已收敛（P0b：write-tab 产出块 4-id 字面量 → OUTPUT_BLOCK_DEFS 派生；calendar-tab `THEME_DAY_BLOCK_ID` → `THEME_PARTY_DAY_MANIFEST.blockId` 派生） |
| R4 场景目录子集三处手写 | 6 个活动场景的 id+label+颜色在 constants.js、decision-tree.js、calendar-tab WRITE_TEMPLATES 各维护一份（全集唯一源=sopData.js 12 场景） | sopData.js:10-165 / constants.js:121-129 / decision-tree.js:36-96 / calendar-tab.js:394-418 | ✅ 已收敛（P2b：constants 新增 `SCENARIO_WRITE_IDS/SCENARIO_LABELS` 派生；decision-tree 与 calendar-tab 改派生引用，scene-write-sync 测试兜底） |
| R5 业务链路三写 | flow 语义在 function-catalog desc、mermaid-sources FLOW_LINKS、以及声称的 sopData 各一份；无键集比对测试（注释声称的「防漂移测试」不存在） | function-catalog.js:63-76 / mermaid-sources.js:29-106 / function-catalog.test.mjs:44-48 | ✅ 已收敛（P0c：新增 `server/test/flow-catalog-sync.test.mjs` 键集**双向**断言，任一侧增删即红） |
| R6 tab id 散落导航侧 | entry 的 defaultTab/onNavTarget 硬编码 tab id，与能力 tab 清单及 config.modules.hiddenTabIds 无同一性守卫；隐藏后导航静默 no-op | 8 个 ws-*-entry.js / tab-bar.js:198-200 / branch.js:47-53 | ✅ 已收敛（P2a：`core/tab-nav.js` 纯决策 + tab-bar 守卫——隐藏 tab 回退首个可见 tab、杜绝静默白屏，tab-nav 4 态测试绿） |
| R7 跨层双净化 | 支部 config（modules/blocks）净化规则 server 与前端各一份，无互引注释、独立演化 | server/routes/resources.js:259-316 / docs/src/services/branch.js:132-176 | ✅ 已收敛（P1a：共享纯模块 `core/config-clean.js`，server 严格口径为单向权威，两端同源引用、本地净化实现删除） |
| R8 表决规则跨层重复 | optionSet 枚举+「异议须附言」server 与前端各一份，仅注释声明「对齐」 | server/routes/committee.js:30-36,90-92 / docs/src/services/vote-config.js:7-18 | ✅ 已收敛（P1a：`OPTION_ENUMS` 从 committee.js 导出 + `test/vote-option-sync.test.mjs` 键集双向断言） |
| R9 角色集合 ≥5 份 | 支委/书记/党委组织员角色 `Set` 分散多文件 | server/routes/auth.js:69-71 / member.js:13 / committee.js:15,17 / resources.js:56-59 / docs/src/core/constants.js:185 | ✅ 已收敛（P2c：constants 新增 BRANCH_COMMISSION_ROLES/SECRETARY_ROLES/PARTY_STAFF_ROLE/COMMITTEE_IDS 单一源，五处本地手写清零，roles-sync 4 断言绿） |
| R10 删除/归档级联同构 | DELETE 活动联动清理、归档级联 tasks，server 与前端同构实现（注释自认） | server/routes/resources.js:165-204 / docs/src/services/mock.js:142-204 | — 未列入去重队列（保持观察） |
| R11 资源名/ID 注册表两端各一 | RESOURCE_TABLES + ID_PREFIX 与前端快照键名两端手维护 | server/routes/resources.js:13-46,87-100 | — 未列入去重队列（保持观察） |
| R12 运行安全 | server 登录不验密码（凭 personId 发 token）；18 个账号明文 123456；demo 态/信任模型注释自认。**书记 2026-09-03 口径：.ctx 与历史材料为内部资产保留上传，非风险项；本条仅保留运行安全部分** | server/routes/auth.js:8-17 / docs/src/mock/accounts.js:4-26 | ✅ 出仓子项撤销 + 运行安全项已修复（行动线 P1b：默认口令校验可换 `LOGIN_PASSWORD` + `DISABLE_PASSWORD_CHECK=1` 逃逸门） |

> 反例（无需拆分，防过度去重）：block manifest 校验唯一源在前端 manifests.js（server 测试经浏览器复用同文件），职责与 R7 的「config 形状净化」不同——勿误并。

#### 复核保留（2026-09-03 定，防行为漂移）

- ① TYPE_META/STATUS_META：支部侧（「待党委批复」+desc）与党委侧（「待批复」）文案不同，属**双视角差异**，暂不合并。
- ② makeup `MANDATORY_ACTIVITY_TYPES`（刚性考勤子集+主题党日）与 gallery 色名：业务语义 ≠ 三会子类清单，不并入 subtypes。

#### 复核约定

- 每完成一个行动线条目，回四更新状态并留 T- 日志。
- 评分按季度或重大架构变更后复核一次，防「评估僵尸化」。
- 用户否决某条优先级时，只调顺序不改表结构；新方向裁决追加为后续编号行（P5+/后续跟踪行）。

---

## 四、改造行动线（现行唯一行动清单）

> **语义**：本表收敛原四行动优先级 + 3.3 去重队列（P0a~P2c）+ 超参/组合行动（P3a~P3e）+ 色值与 deploy 改进（8.7-①~④）+ 模板化落地（P4a~P4d）执行状态，为后续开发顺序的唯一依据。**状态记号：✅=已完成 / 立项=在立项 / 后续=后续批次或残项跟踪**；每批完成回本表更新并留 T- 日志，沿革指执行日志（见附）。

| 编号 | 行动内容 | 状态 |
|------|---------|------|
| P0·统一扎口 | 以 forms.js 为样板，为徽章/状态、数据视图等高频组件域逐一建库出口、全站收口（验收：每建一库跑 module-load + E2E；仓库无该域直连残留） | ✅ forms/badges/reporting 三库完成（组件平铺层同域多文件已收敛，纪律见三·3.1）；残项=徽章/选择器等出口仍散、服务层个别 UI 依赖（见二·2.1，随行动线持续收口） |
| P0·数据域接线 | tab/能力声明依赖的 service + mock 整体可替换（验收：新增 demo 分支或后端接入时 UI 零改动，data-adapter 双实现全量走通） | ✅ 收官：person 域/formatter/PEOPLE/机构/登录四批收口完成——UI 层 mock 直连清零，种子仅存 services/core 数据层（契约见三·3.2） |
| P0a | R1 微工具建库：escHtml/fmtDt 收敛到唯一工具出口，10 处本地 `esc` 改 import | ✅ 已完成（2026-09-03；grep 本地 `function esc` 归零，module-load 全绿） |
| P0b | R2/R3 元数据单一源：MEETING_TYPES、write-tab 4 id、calendar blockId 改为引用 constants/manifests（验收：全仓该类型/4 id 无第二份字面量，写路径零行为变化） | ✅ 收口（2026-09-03）；TYPE_META/STATUS_META 与 MANDATORY_ACTIVITY_TYPES/gallery 色名 2 项复核保留（见三·3.3 复核保留） |
| P0c | R5 防漂移测试落地：断言 FLOW_LINKS 键集 == function-catalog flow id 键集（落实 mermaid-sources.js:30 注释承诺） | ✅ 已完成（2026-09-03；flow-catalog-sync 双向断言测试入 server/test 且绿） |
| P1·开源合规包 | LICENSE、示例账号外置 env、部署/贡献说明（验收：新机器按 README 可独立跑通并自建数据） | ✅ 部分→闭环：根 LICENSE + CONTRIBUTING.md + server/.env.example 已在仓（2026-09-04），数据真人化整体可替换（2026-09-06，P4a 换壳指南补验收）；残项=无 English 版、release 发布工作流（见二·2.3） |
| P1a | R7/R8 跨层单源：config 净化与表决枚举改 server 单向权威 or 前端生成 → 注释互链 + 键集测试 | ✅ 已完成（2026-09-03；config-clean.js 共享纯模块 + OPTION_ENUMS 双向断言，28 测试中相关全绿） |
| P1b | R12 运行安全（口径修正后唯一保留项）：server 登录加密码校验（可开关，缺省演示态兼容）——多人/计算中心部署时防凭 personId 冒名 | ✅ 已完成（2026-09-03；缺省 '123456' 可换 `LOGIN_PASSWORD` + `DISABLE_PASSWORD_CHECK=1` 逃逸门，auth-password 5 态测试绿；生产须显式换密） |
| P2·L3 拖拽 | L3 block manifest + 拖拽编排（根 README 总目标）（验收：块声明 inputs/事件/校验契约定稿并经用户确认后编码） | ✅ 契约 v1.1 定稿；L3 S1~S4 全部落地（manifests 双块 + 校验器 + 渲染桥 + config.workflowBlocks 配置区 + 主题党日入口守卫，测试全绿）；拖拽编排全站推广=L1→L5 未达（转 P4d 后续） |
| P2a | R6 结构性统一：tab id 收敛——`core/tab-nav.js` 纯决策 + tab-bar 守卫（原随 L4 一并做的拆分提前单做） | ✅ 已完成（2026-09-03；隐藏 tab 回退首个可见 tab、杜绝静默白屏，tab-nav 4 态绿） |
| P2b | R4 结构性统一：写活动场景选择清单收敛单一源（constants `SCENARIO_WRITE_IDS/SCENARIO_LABELS` 派生） | ✅ 已完成（2026-09-03；scene-write-sync 3 断言绿，写路径无第二份字面量） |
| P2c | R9 结构性统一：授权语义角色集单一源（constants 四常量；至此去重队列 8/8 收口，P0b 2 项复核保留为有意决定） | ✅ 已完成（2026-09-03；五处本地手写角色集清零，roles-sync 4 断言绿） |
| P3a | 阈值参数化：票决门槛（quorum/veto）→ policy-defaults 常量默认 + evaluateWorkforceVotes(opts) 覆盖（2026-09-06 书记裁语义收紧：应到 >2/3 且无反对、弃权允许——附录⑩ S2 R2-3） | ✅ 已做（2026-09-05 初版 + 2026-09-06 语义裁；默认行为不变，用例绿） |
| P3b | 纪检会议考勤类型单源：`MEETING_ATTENDANCE_TYPES` 自 policy-defaults 派生导出，disc tab 引用（消双写） | ✅ 已做（2026-09-05；全仓该类型清单无第二份字面量） |
| P3c | 建立 `core/policy-defaults.js`：业务阈值/名单（上传位例外、超期天数、应到 roster 等）集中默认 + 逐项注释「支部默认/制度固定」 | ✅ 已完成（2026-09-05 spec open-source-deploy-improve；policy-defaults-sync.test 5/5 绿，消费点改引用） |
| P3d | 模块组合声明契约：capabilities/模块元数据补 depends/combinesWith/exclusive（草案）+ config 校验扩展 | ✅ v0 已完成（2026-09-05；module-compose 纯校验 + 失败态测试 6/6 绿 + capability-registry 7/7 绿 + 契约文档节）；服务端 config 校验留 v1 |
| P3e | 色板令牌收敛：styles.css 令牌与 COLOR_SYSTEM 对齐，固定/可调标注在文件头注释与四层表（8.6 落地：党建红/党徽金固定令牌化、`--accent-deep` 历史存量收敛为雾紫三源一致） | ✅ 已完成（2026-09-05；全仓无游离业务色字面量，品牌/角色色一律走令牌） |
| 8.7-① | 书记台分工面板保态（最小操作成本）：发起表单区 `#wf-form-zone` 独立于议题列表容器，列表重建不触碰表单 DOM | ✅ 已完成（2026-09-05） |
| 8.7-② | 书记台分工面板多议题票决判定并行：串行 for…of → `Promise.allSettled`（单失败 console.warn 不阻断）——缩短书记等待 | ✅ 已完成（2026-09-05） |
| 8.7-③ | 纪检会议考勤录入「收起/展开」保态：容器 CSS `hidden` 切换（不销毁 PersonPicker、不重建 innerHTML），仅提交成功后才重置会话（外部 re-render 重建为既有行为，已注释说明） | ✅ 已完成（2026-09-05） |
| 8.7-④ | deploy 文档口径风化修正：server/README 与根 README 测试计数改动态口径、命令段与 package.json scripts 对齐、env 说明补 LOGIN_PASSWORD/DISABLE_PASSWORD_CHECK | ✅ 已完成（2026-09-05；计数遗留经减负评议处理——CLAUDE.md:131 动态口径、SNAPSHOT 去固定计数，见 REVIEW_QUEUE 附录⑥） |
| P4a | 模板型落地最小包：根 README 增「给新组织：30 分钟换壳指南」（clone 跑 → 换 mock 数据 → 角色/术语/配色/policy 默认 → 支部名与分支配置 → npm test 验证）＋ 浏览器演示数据一键重置（URL `?reset=1` 清除本域演示存储键回种子初始态） | ✅ 已完成（2026-09-06；落地=根 README「复用与二次开发」节 + 「快速开始」节；mock-adapter.js `MockAdapter.loadDB()` 读取即检测 `?reset=1`，清除 `workflowos_*`/`gsm1921-*`/`sop_org_os_*` 前缀键与历史遗留键后整页导航回种子初始态；无 API token 时才执行，不清 sessionStorage，不破坏 API 模式） |
| P4b | 换组织向导页（立项④，2026-09-06 立）：引导式完成 people/accounts/branches/policy 替换并生成组织配置包（验收：向导产出可一键应用的换壳配置） | ✅ 主体落地（T-2026-09-044~047：书记 R1–R4 裁定 + 阶段一/二/三目标1，wizard.html 上线——详见 REVIEW_QUEUE 附录⑧）；阶段三候选（数据层覆盖预览/党委默认模板抽象）登记后续 |
| P4c | 演示数据与空组织模板分离（立项⑤，2026-09-06 立）：仓库随附「模板 + 示例组织」双形态、seed 完整性自动校验、一键重置分层服务化 | ✅ 落地（T-2026-09-047/048：空组织模板 + 建新支部正式能力 + ?reset 分层 demo/preview 与服务端对齐，详见 REVIEW_QUEUE 附录⑧）；域分区缺口（业务域非 branch 分区）已注释诚实边界 |
| P4d | 组合能力补强（后续批次）：policy-defaults 接入 config 驱动（超参可调不改码）、requiredRoles 门禁消费、拖拽编排由主题党日推广全站（L1→L5） | 后续（残项见二·2.4/2.5 与一速览失分行） |
| 后续·残项跟踪 | 组件出口继续收口（徽章/选择器等、服务层个别 UI 依赖）、manifest 防漂移测试补全、无 English 版、语义化 release 发布工作流 | 后续 |

---

## 附：沿革与口径注

- **评估沿革（一句）**：v1≈75（2026-09-03 首评宽松）→ v2≈69（同日批判性复评·冗余审计）→ v3≈67（2026-09-05 开源化问询：新增超参数可调性与模块组合双维度、口径最严）→ ≈74（P3a~P3e 回补）→ **v4≈76（2026-09-06 书记再评定调：综合分=二开组合能力、重改进不唯分、交付形态=模板型；P4a 新增可换壳证据）**。
- **关键日期与书记再评定调要点**：2026-09-03 书记问询「100 分评估怎么输出」（首评 + 确立统一扎口范式）；2026-09-03 口径修正（.ctx 日志与 references 历史材料为内部资产保留上传，R12 出仓子项全部撤销、仅留运行安全）；2026-09-03 批判性复评第二轮（去重审计 R1~R12 → P0a~P2c 队列）；2026-09-05 第三轮开源化问询（「超参数保留调整空间 + 模块怎么排列组合」→ 超参数/组合双维 + P3a~P3e + 8.7 修复/部署改进）；2026-09-06 书记第四轮再评定调三句（见一）+ P4a 换壳落地 + P4b/P4c 立项④/⑤；2026-09-08 书记批准「全面引用同步 + 文档改名重构」两项（并批 REVIEW_QUEUE 全局评估总表建表）；2026-09-09 本文件更名「工程化评估与改造行动线」+ 四区重构 + 全仓引用同步（本 commit）。
- **文件沿革（旧路径段，历史叙述保留旧名）**：原名 `content/04_web_design/evolution/MODULARIZATION_ASSESSMENT.md`（2026-09-03 建）→ 2026-09-08 git mv 迁 `.ctx/MODULARIZATION_ASSESSMENT.md`（commit 698306e，评估职能归审计底座）→ 2026-09-09 git mv 更名 `.ctx/ENGINEERING_ASSESSMENT.md` 并重构为「工程化评估与改造行动线」。旧文件名/旧路径仅存于执行日志与本文沿革叙述（含日志内对原「§二/§五/§七/§八」等旧结构的转述）。
- **执行日志索引**：各轮与行动明细见 `.ctx/logs/2026-09-EXECUTION_LOG.md`——T-2026-09-027（统一扎口试点 + 评估归档）、T-2026-09-033/034/035/036（去重审计与评估收敛/色值收敛/开源改进 spec/面板保态）、T-2026-09-042（v4 再评 + P4a 换壳指南 + 演示一键重置）、T-2026-09-044~048（P4b/P4c 换组织向导与模板分离立项执行）；旧结构各节明细指此，不再在本文叠加轮次记录。
