---
title: "工程化评估与改造行动线"
type: audit_report
role: "[工程师]+[AI]"
created: 2026-09-03
last_updated: "2026-09-29"
status: active
related_files: [content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md, content/04_web_design/evolution/WORKFLOW_BLOCK_CONTRACT.md, content/04_web_design/evolution/PARTY_COMMITTEE_DESIGN.md, content/04_web_design/module/SOP_WEBSITE_GUIDE.md, content/04_web_design/deploy/DEPLOYMENT_GUIDE.md, .ctx/REVIEW_QUEUE.md, CLAUDE.md, content/03_doc_system/DOC_MAP.md]
---

# 工程化评估与改造行动线

> **定位**：支书 2026-09-03 问询「如果做一次 模块化、插件化、开源化 的 100 分评估，你会怎么输出？我以此来指导你」（原「模块化 / 插件化 / 开源化评估」据此更名，2026-09-09）。本文档为该工程化评估与改造方向的**现行唯一口径**：评估结论、工程做法纪律与行动优先级一体维护，作为后续开发顺序的方向选择依据。
> **维护纪律（本文件自述即判据）**：**覆盖式维护、不逐轮留历史行**——本文件只写「**当前值 / 当前残项 / 当前纪律**」，**逐批「做了什么、为什么 +1」一律进 `.ctx/logs/**`**（沿革单一源）。⚠ 2026-09-29 批次 266 据此做了一次**瘦身**：此前 §一 速览行内 / 综合行 / §二 各维标题 / §四 各行动行内累积的**逐批论证链**已删除（同批已核：其内容在月度日志逐批段与「附：工程化评估逐批沿革」节内均已有），**只留当前值与指针**；再犯即属违规。
> **受众**：[工程师]+[AI]（架构维护者）+ 支书（方向裁决人）
> **关联**：`content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md`（组件化/插件化演进母文档，评估正文已压为其 §二 历史结论段）、`content/04_web_design/evolution/WORKFLOW_BLOCK_CONTRACT.md`（L3 工作流块契约）、`content/04_web_design/evolution/PARTY_COMMITTEE_DESIGN.md`（两级治理设计）、`.ctx/REVIEW_QUEUE.md`（全局评估总表，本文件一行）。
> **职能（2026-09-17 立，规范见 [OPERATIONS_GUIDE §5.1](../content/03_doc_system/OPERATIONS_GUIDE.md)）**
> **回答什么问题**：「**现在工程化到几成、下一步该改哪里**」——五个维度（模块化 / 插件化 / 开源化 / 超参数 / 组合）的**当前**打分与依据、工程做法纪律、改造行动线的**当前**优先级与状态。
> **不回答什么**：① **哪一批做了什么**（沿革与逐批论证）→ `.ctx/logs/YYYY-MM-EXECUTION_LOG.md`；② **规则与守卫的判据细节** → `CLAUDE.md`（R 表）与 `content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md §0.2`（规则→守卫→状态索引）；③ **测试清单与运行方式** → `README.md` / `server/README.md`；④ **系统当前长什么样**（目录树 / 表数 / 页面数）→ `.ctx/SNAPSHOT.md`；⑤ **文档职责与导航** → `content/03_doc_system/DOC_MAP.md`。
> **谁什么时候读**：`[工程师]+[AI]`；**每次决定「下一批做什么」之前必读**；支书问工程化进展或方向时读。按需（on-demand）。

---

## 一、评估总览

> **支书 2026-09-06 再评定调（三条口径，长期有效）**：① 综合分反映的是**二开组合能力**（模板型交付下「别人能否快速换壳用起来」），不是纯工程内聚分；② **重改进不唯分**——分数只作方向指引，重点看残项清单与行动是否推进；③ **开源长期交付形态 = 模板型**——仓库是「制度即代码」模板，随附示例组织（本科生党支部）只是可整体替换的默认值，文档与演示以「给新组织换壳」为叙事主线。

| 维度 | 得分 | 一句话结论（**当前**） |
|------|------|-----------|
| 模块化 | **99 / 100** | 五层分层（`core` / `services` / `components` / `modules(capabilities)` / `entries(tabs)`）+ 组件积木 + tab 动态 import 懒加载 + capability 自注册为真；域内出口收敛有样板与纪律（见 §3.1）；工作台 tab **分组单一轴**；说明文件口径已**守卫化**（`doc-consistency::S1–S16`）。**残项＝徽章 / 选择器等组件出口仍散** |
| 插件化 | **75 / 100** | registry 自注册 + 按 scope 组装 + `config.modules/blocks/workforce`「配置即组合」（净化单一源 `services/branch/config-clean.js`，server 单向权威）+ L3 block manifest 契约 + `module-compose` v0 纯校验（depends / conflictsWith，测试 6/6 绿）。**残项＝`module-compose` 仍只做前端纯校验**（服务端 config 校验留 v1；「插件安装 / 卸载」概念未立） |
| 开源化 | **80 / 100** | 全程中文可读的设计 / 规范文档 + 代码 `role` 标注与设计源链接 + 测试覆盖厚；根 README 以「复用与二次开发（给其他组织）」为核心章节且含 **30 分钟换壳指南** + 演示数据一键重置 `?reset=1`；数据可整体替换（`people` / `accounts` + `.env.example`）；LICENSE(MIT) + `CONTRIBUTING.md` + **语义化 release / 发布工作流**（`docs/scripts/release.mjs`；守卫 `version-stamp::S7`）。**残项＝无**（English 版经支书裁定「不做」，属产品边界、非工程缺陷） |
| 超参数可调性 | **86 / 100** | `policy-defaults.js` 集中默认单一源，逐项标注「`branch-default` 可调 / `institutional` 固定」+ 出处 + 消费点；`POLICY_OVERRIDABLE` 白名单经**设置 → 支部治理「域参数」卡**可覆盖（域负责人仅本域），「支部制度参数」卡只读展示制度默认；**26 叶键 100% 有归属**（白名单 14 ＋ `POLICY_FIXED` 12，守卫 `policy-config::R1–R3` ⇒ 「未登记」第三态被消灭）。**残项＝无**（新增参数须同批入两类之一） |
| 组合能力（二开视角） | **83 / 100** | 「配置即组合」：模块 / 块 / 分工的**启停 ＋ 排序**（支部默认层与个人偏好层分离、互不覆盖）＋ `configChangeHistory` 逐键留痕与单键回滚；L3 块契约（**6 块**）＋ 通用编排内核（范围过滤 / 组合校验 / 稳定拓扑序）＋ 换组织向导第②步内联「**组合体检**」。**残项＝画布 UI（L4 编辑器形态）· 运行时面（写口 / 任务派生是否消费组合产物——**口径待支书裁**）· ② 表单条目 / ③ 参与人范围两轴** |
| **综合（当前）** | **≈ 85 / 100** | 五维均值 **99 / 75 / 80 / 86 / 83 = 84.6**。口径见上「再评定调」三条；**分数只作方向指引**——逐批「为何 +1 / 不加分」的论证见 `.ctx/logs/2026-09-EXECUTION_LOG.md`「附：工程化评估逐批沿革」节 |

> **残项 TOP（当前未闭合；逐条依据见 §二 各维残项与 §六）**：① **G3-3 余下**——画布 UI（L4）· **运行时面**（口径待裁）· ②③ 两轴；② **组件出口仍有散件**（模块化，非阻塞）；③ **`module-compose` 仅前端纯校验**（插件化，服务端 config 校验留 v1）；④ **运行安全**——生产形态须显式设 `LOGIN_PASSWORD`（缺省演示口令；生产未设**启动即拒**已落地）。
> **已闭合项不在此逐条罗列**（历次「已消除」清单见日志沿革节，避免本文件再长第二本沿革）。

> 注（支书 2026-09-03 口径修正，**现行有效**）：本仓库是支部自己的内部系统，**.ctx 日志与 references / 历史会议材料均为内部资产、保留上传**，不存在「出仓脱敏」需求；三·3.3 R12 与行动线 P1b 中的出仓子项（脱敏 / 移出 / 账号外置 / .ctx ignore）**全部撤销**。保留的工程项仅是「**运行安全**」（见上残项 ④）。

---

## 二、评分依据（逐维：得分项 / 失分项 / 残项；口径唯一 = §一 速览）

### 2.1 模块化 —— 99/100

得分项：
- **五层分层清晰**：`core` / `services` / `components` / `modules(capabilities)` / `entries(tabs)`；tab 动态 import 懒加载、capability 自注册。
- **组件积木化**：徽章全站统一、表单字段 / 外壳（`forms.js`）、收件箱、汇报域（`reporting.js`）等；表单输入件已全局收编（`input-flat` 13px 单档、`label for` 关联、aria）。
- **域内出口收敛有样板与纪律**（样板 = `forms.js` / `badges.js` / `reporting.js` 三库，纪律见 §3.1）；`esc` / `fmtDt` 微工具、类型 / 阶段元数据、写场景清单等重复 / 三写均已收敛。
- **单一源 / 引擎化收敛台账**（口径与逐条判据见 **§3.4**，此处不复述）：版本号推导、分页、人 × 项目矩阵、翻页标记、控件档位与表格样式类族等**均已收进单一源并带守卫**；对应行动项 P0a–P2c 见 §四。
- **服务端按内聚切分**：`server/routes/resources/` 六件（见 §四 P7）。

失分项 / 残项（后续跟踪）：
- **徽章 / 选择器等组件出口仍散**：除三库外，`query-view` / `picker` / `modal` 等仍被各层逐文件直连。
- **手写表格收敛台账**仍留 2 处人工登记位（考勤明细 / 党小组清单，行数天然有界），未进一步收敛。

### 2.2 插件化 —— 75/100

得分项：
- registry 自注册 + 按 scope 组装（`workspace:secretary` / `workspace:party-committee`）；支部实例化 + 支部级 `fileSpaceIsolated`。
- `config.modules/blocks/workforce`「配置即组合」：支部 tab / 块 **启停 + 排序** + 分工归属；净化单一源 `config-clean.js`（server 严格口径、单向权威）；`tab-nav` 守卫防隐藏冲突。
- **按 viewer 角色先查能力**（`registry.js` 的角色过滤即单一源消费），再按 scope 兜底；两查皆空渲染**显式提示卡**（守卫 `capability-registry`）——即「组合后授权弱」一维的正面落地。
- L3 block manifest 契约 v1.1（`WORKFLOW_BLOCK_CONTRACT`）+ `manifests.js` + 校验器 + `config.blocks.workflowBlocks` 配置区 + 主题党日 manifest 驱动。
- `module-compose` v0：`depends` / `conflictsWith` 纯校验（引用存在 / 互斥同含 / depend 禁环）+ 测试 6/6 绿 + 文档闭环。

失分项 / 残项（后续跟踪）：
- **`module-compose` 仅前端纯校验**：服务端 config 校验留 v1；「插件**安装 / 卸载**」概念未立（元数据只作声明，无生命周期）。

### 2.3 开源化 —— 80/100

得分项：
- 全程中文可读的设计 / 规范文档；design（`content/`）与 spec 职责已纠偏；代码带 `role` 标注与设计源链接；测试覆盖厚（模块加载 + 多组 E2E）。
- 根 README 已一般化、以「复用与二次开发（给其他组织）」为核心章节，且含 **30 分钟换壳指南**；浏览器演示数据一键重置 `?reset=1`。
- 数据真人化可整体替换：`people` / `accounts` 基线 + `server/.env.example`（示例账号外置 env），新机器按 README 可独立跑通并自建数据。
- LICENSE（MIT）+ `CONTRIBUTING.md`。
- **语义化 release / 发布工作流**：`CHANGELOG.md`（Keep a Changelog 体例，**只记对使用者可见的变更**——逐批沿革归 `.ctx/logs/**`）＋ `docs/scripts/release.mjs`（默认预演 / 按变更类别语义化升号 / CHANGELOG ↔ `server/package.json` ↔ tag 三处取齐 / 打 `vX.Y.Z` 且**不 push**）；单一源 `docs/scripts/version-next.mjs`，常驻守卫 `version-stamp::S7`；发版三步见 `CONTRIBUTING.md §六`（行动项 **§四 P8**）。

失分项 / 残项（后续跟踪）：
- **无**。**English 版经支书 2026-09-28 裁定「不做」**（原文「我们不需要英语！」）⇒ 不计为残项。客观留档：对非中文换壳者仍有语言门槛，属**产品边界**而非工程缺陷。

### 2.4 超参数可调性 —— 86/100

得分项（判据：代码近旁可答「**可调 / 不可调 + 默认出处**」）：
- **`policy-defaults.js` 集中默认单一源**（行动项 §四 P3c）：票决门槛（应到 >2/3 且无反对）/ 会议类型与上传位例外 / 考察超期天数 / 应到名单 roster 等**逐项标注 `branch-default`（支部默认，可调）/ `institutional`（制度固定）** + 出处 + 消费点；业务层一律引用派生，不新写字面量。
- **域参数（L2）config 驱动**（§四 P3a 线）：`POLICY_OVERRIDABLE` 覆盖白名单（每项 = path / type / 钳制范围 / domain 域节）经**设置 → 支部治理「域参数」卡** UI 覆盖（域负责人仅本域）；值 = 覆盖、`null` = 恢复该域默认、整体 `null` = 全量恢复；读侧 `applyPolicyOverrides` 注入，净化 / 钳制单一源 = `config-clean::sanitizeConfigPolicyOverrides`（server 与前端 `branch.js` 同源）。
- **制度参数 UI**：设置 → 支部治理「支部制度参数」卡把票决门槛 / 应到口径 / 会议考勤类型 / 记录人 / 标因作为**制度默认只读展示区**——「可调 / 不可调 + 默认出处」在 UI 可见；放开为支部可调 = **放行程序**（支书裁决 → 登记白名单 → 注释同步 → 审计 why 回填；反向收权同理，见 `PARTY_COMMITTEE_DESIGN §2.6`）。
- **不可覆盖项也是可机检数据**：`POLICY_FIXED` 台账（逐项 `kind` + `why` + `src`）＋ 守卫 `policy-config::R1–R3` 断言「每个叶键恰属两类之一」（行动项 **§四 P9**）。
- 其余参数化位：表决配置 `optionSet` / `voterScope` / `quorumCheck`（默认 = 场景函数 `defaultVoteConfig(scenarioId)`，每活动可覆盖）；分工归属 `config.workforce`；色值令牌（`styles.css` 令牌 ↔ `DESIGN_SYSTEM.md §二` 固定 / 可调四层表对齐，行动项 P3e）。

失分项 / 残项（后续跟踪）：
- **无**（26 叶键 100% 有归属；将来新增参数须同批入「白名单」或「固定台账」之一）。

### 2.5 组合能力（二开视角）—— 83/100

得分项：
- **组合面 = 模块 / 块 / 分工启停 + 排序**：操作位 = 设置 → 支部治理「工作台默认顺序 / 支部信息与向导」卡（支书 / 副，副书同权）+ 党委台「支部配置」（party-staff）；`config.modules/blocks/workforce` 即组合声明 + `config-clean` 单源净化。
- **两层分离**：个人「我的工作台」页签顺序（偏好层、本机 / 本人生效）与支部默认编排（`config.modules`）**分层共存、互不覆盖**。
- **可安全回退**：`configChangeHistory` 逐键留痕（why 透传）+「配置变更记录」只读列表**单键回滚**（`rollbackBranchConfig`：回滚再留一痕、历史不改写、上限 100 条）。
- **能力注册表 = 台内固定组合的声明面**：`capabilities/*` 自注册，scope → 工作台 tab 清单。
- **L3 块契约 + 通用编排内核**：`workflow/blocks/orchestration.js`（范围过滤 `blocksForScope` / 组合校验 `composePlan` / 稳定拓扑序 / 编译为**既有 definition 形状的纯数据** `compilePlan`；守卫 `block-orchestration::O1–O5`）；块目录 **6 块**，支部可配**启停与顺序**（`workflowBlocks.blockOrder`，净化 / 排序均为单一实现）。
- 场景联动：`scenarioId` → `defaultVoteConfig` / 决策树模板（默认组合，可换）。
- 二开可换壳证据：根 README 30 分钟换壳指南 + `?reset=1` 演示重置（§四 P4a）。

失分项 / 残项（后续跟踪）：
- **画布 UI（L4 编辑器形态）**：未做（支书 2026-09-28 裁「画布另批」）。
- **运行时面**：写口 / 任务派生是否消费组合产物——**口径待支书裁**（块停用是否服务端硬执行）。
- **② 表单条目轴 / ③ 参与人范围轴**：未落地（落地前提是先定「manifest 字段 ↔ 写面板字段」对齐口径，见 `.ctx/REVIEW_QUEUE.md` `H-11`）。

---

## 三、工程做法与纪律

> 本节是**纪律与方法论**（长期有效，不是沿革）：3.1 出口扎口做法 · 3.2 数据域接线契约 · 3.3 去重审计证据（R1–R12） · 3.4 单一源 / 引擎化收敛台账（R13–R30 ＋ 可迁移要点 ①–⑫，**`content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md` 引本节的「理论口述版」**）。

### 3.1 统一扎口做法（本评估确立的第一个工程做法）

支书定调：**同一域可以有若干个函数（甚至若干个实现文件），但对外只暴露一个库文件；调用方一律 import 该库，不直接触碰内部实现。**

落地样板：`components/ui/forms.js`（表单域唯一出口）· `components/ui/badges.js`（徽章域）· `components/record/reporting.js`（汇报域）——三库建成后，组件平铺层「同域多文件」收敛（行动项 §四 P0·统一扎口）。同批回归：`module-load` + 相关 E2E 全绿，**零行为变化**。

**改造纪律（每次扎口必守）**：
1. 新增库**聚合重导出**，内部实现文件不搬运、不改名。
2. 调用方**只改 import 来源一行**；运行期零行为变化。
3. 每批扎口后跑 `module-load` + 受影响 E2E 回归。
4. **禁止双轨**：一旦建库，同域内新代码一律走库，存量直连同步收口。

### 3.2 数据域接线契约 v1（person 域试点确立）

**背景**：曾盘点出全站 68 处直连 `mock`；`data/mock/index.js` 实为「旧兼容中转」（person 函数早已落到 `services/member/person.js` 又被 re-export 回 mock）。债根 = **UI / 服务层 import 面挂在 `mock`，而非真正实现所在的 service**。**收官态 = UI 层（`entries` / `components` / `modules`）对 `mock` 的 import 直连清零**——全仓 `mock` 引用仅存于 `services/core` 数据层（种子接入点，契约允许）。**已达成**（逐批过程见 `.ctx/logs/2026-09-EXECUTION_LOG.md`；行动项 §四 P0·数据域接线）。

**契约条款（长期有效）**：
1. **人名与人员对象获取**（`getPersonById` / `getPersonName` / `PersonStore`）唯一出口 = `services/member/person.js`；**任何层禁止从 `mock/*` 获取人名**。
2. **成员名单**（PEOPLE 语义）唯一出口 = `PersonStore.getMembers()`；UI / tab / 组件层禁止直连 mock 种子数组；**种子数据仅许 service 层引用**。
3. **展示格式化函数**（`attendanceToLong` / `inspectionToLong` / `reviewToDisplay` 等）统一栖身各业务 domain service（`attendance` / `inspection` / `review`），随记录读写同域演进；**mock 数据模块不承载格式化逻辑**。
4. 新代码一律遵守 1~3；存量收口按批次推进，每批回归。

### 3.3 冗余 / 重复去重审计（R1–R12：证据与收敛去向）

> **定位**：支书 2026-09-03 要求「对多余、冗余、重复实现的代码高度批判性地思考并执行」。本表只收录**可证实（文件 + 行号）**的重复。**审计原则：先统一「同一业务事实的唯一出口」，再谈删代码——先扎口后去重，避免删完又长出第二份。**（逐批明细见 `.ctx/logs/2026-09-EXECUTION_LOG.md`）

| 组 | 重复事实 | **收敛去向（单一源；现状）** |
|----|---------|------------------|
| R1 | HTML 转义 `esc` 至少 10 个文件各写一份；`fmtDt` 双份 | ✅ `core/base/utils.js::escHtml` / `fmtDt` 唯一出口（各文件 import 别名 `esc`，调用面零改动） |
| R2 | 三会四子类清单三份；阶段枚举另见 `CANDIDATE_STAGES` 与各 seed | ✅ `MEETING_TYPES` → `ACTIVITY_CLASSIFICATION['three-meetings'].subtypes` 派生；**2 项复核保留**（见下「复核保留」） |
| R3 | 产出块 id 消费端手写（write-tab 4 个 id / calendar-tab 手写 blockId） | ✅ → `OUTPUT_BLOCK_DEFS` / `THEME_PARTY_DAY_MANIFEST.blockId` 派生 |
| R4 | 活动场景 id + label + 颜色三处手写 | ✅ `constants.js::SCENARIO_WRITE_IDS` / `SCENARIO_LABELS` 派生（全集唯一源 = `sopData.js`）；守卫 `scene-write-sync` |
| R5 | 业务链路 flow 语义三写、无键集比对测试 | ✅ 新增 `catalog-sync::T2` 键集**双向**断言（任一侧增删即红） |
| R6 | tab id 散落导航侧、隐藏后静默 no-op | ✅ `core/boot/tab-nav.js` 纯决策 + `tab-bar` 守卫（隐藏 tab 回退首个可见 tab）；`tab-nav` 4 态测试 |
| R7 | 支部 config 净化规则 server / 前端各一份 | ✅ 共享纯模块 `services/branch/config-clean.js`，**server 严格口径单向权威**、两端同源引用 |
| R8 | 表决规则（optionSet 枚举 + 异议附言）跨层重复 | ✅ `OPTION_ENUMS` 单一源 + `catalog-sync::T4` 键集双向断言 |
| R9 | 支委 / 支书 / 党委组织员角色 `Set` ≥5 份 | ✅ `constants.js` 四常量单一源；守卫 `roles-sync` 4 断言 |
| R10 | 删除 / 归档级联 server 与前端同构实现 | **观察**（未列入去重队列） |
| R11 | 资源名 / ID 注册表两端各一 | **观察**（未列入去重队列） |
| R12 | 运行安全：server 登录不验密码、账号明文口令 | ✅ **出仓子项撤销**（见 §一 末注）＋ **运行安全项已修**（行动项 §四 P1b：可换 `LOGIN_PASSWORD`、生产未设启动即拒） |

> 反例（无需拆分，防过度去重）：block manifest 校验唯一源在前端 `manifests.js`（server 测试经浏览器复用同文件），职责与 R7 的「config 形状净化」不同——**勿误并**。

### 3.4 单一源 / 引擎化收敛台账（R13–R30；**可迁移要点 ①–⑫ 见本节末**）

> **定位**：3.3 处理「同一事实被抄了几份」；本台账处理**更高一层的同类病灶**——**能力与口径散落在调用点**（各写一份分页 / 各写一套矩阵 / 档位靠环境供给 / 组清单在加载期被物化成快照 / 说明文件里的数字与名称无人守）。判据与守卫一并登记。**三轮之别**：R13–R20「**收进引擎**」；R21–R25「**收口到底**」；**R26 起「把口径变成断言」**——不再依赖人记得同步。

| 组 | 病灶形态 | **收敛去向（单一源）** | 守卫 |
|----|---------|-----------------|------|
| R13 版本号推导三处各写 | `bump-version.mjs` 内联「当天日期 + a」、无参运行会把同日戳往回写；注释排除规则只在一处置信 | `docs/scripts/version-next.mjs` 纯函数单一源（`nextVersionFor` / `isForward` / `isCommentLine` + `codePartOf`）；**批次 236 扩为「版本与发版治理」单一源**（+ `nextSemver` / `isSemverForward` / `parseChangelog` / `classifyChanges`，供 `release.mjs` 与守卫共用） | `version-stamp.test.mjs` S1–S7 + D1–D11（含「全站活动戳取值集合规模为 1」与发版一致性 `S7`） |
| R14 分页散落 5 处、引擎无分页 | 全站分页只在 issue-list / query-view / archive-entry / 反馈 / 活动动态 各写一版；**统一检索引擎自身没有分页** → 其承载的 28 处按人 / 按活动表无分页 | `components/ui/list-filter.js` **引擎内置分页**（每页 10、页码并入 `stateKey`、筛选回第 1 页、页数 ≤1 不出控件），28 处一次受益 | `filter-row.test.mjs::S10` |
| R15 矩阵三处各自为政 + 列无上限 | 考勤矩阵 / 考察人视图 / 表决 `.vs-matrix` 各写一套；宽表列随项目无限增长 | `components/ui/relation-matrix.js`（`byPerson` / `byItem` 互为转置、项目维列上限 6 + 一键展开、横向滚动 + 首列吸附） | `relation-matrix.test.mjs` S1–S6 + 真机① |
| R16 组清单「派生化快照 / 种子枚举代跑」 | 模块顶层 `[...new Set(PEOPLE.map(p => p.partyGroup))]` 展开 Proxy 即冻结；运行时用 `PARTY_GROUP_OPTIONS` 净化导入与统计 | `services/member/party-group.js::groupOptions()`（活组实体唯一条出口） | `party-group.test.mjs` S1–S4 |
| R17 控件档位 / 表格 / 分页样式各写 | 表格表头 7 处各写一份；档位靠 UA 与 CDN 工具类供给（同表单实测 42 / 43 / 47 三值并存） | `docs/src/styles.css` 类族单一源（`.data-table` / `.lf-*` / `.page-btn` + `.page-num` + `.is-current`）；档位算式显式（单档 38px × 13px） | `filter-row.test.mjs` S1–S12 + D1–D2 |
| R18 选人载体口径过宽 | §4.13「禁止 select 列人名」与实现有 4 处口径差 | 规范改**语义两分**（选名单成员 → `PersonPicker`；任命 / 指派到人 → 允许下拉）+ 例外台账 | `filter-row.test.mjs::S9` |
| R19 同一业务动作两个写门 | 成员流动「流入登记」与「名册新增」在 API 形态角色门冲突 | `server/routes/member.js` **同一实现体 `createMemberRow` 挂两个写门** | `member-flow::S4`、`permission-gate` ⑤d/⑥/⑦、`member-persist` api ⑫ |
| R20 状态与载体失配（非闭环） | 多选后关面板即「已选」、逐人填写框从未出现；`destroy()` 成环（用例由 11 秒劣化为 17.6 分钟超时） | `person-picker.js` 多选**点选即回调 + 关面板再回调**、调用方**重建前保态**、**销毁前先摘回调** | `inspection-loop-e2e`、`ux-guard::⑦` |
| R21 分页「收进引擎」但未收口 | 绕过引擎、自己手写渲染的仍有 13 处以上 | 21 个文件接入 `renderFilteredList`；引擎补「**无关键词无分面则不渲染检索条**」；**分组结构一律每组一实例、只给分页、不推平** | `filter-row.test.mjs::S12` |
| R22 翻页标记仍散（且单一源位置会成环） | 仍有 6 处手写翻页控件；翻页标记若留在 `list-filter.js` 会与矩阵形成模块环 | 抽为**叶子件** `components/ui/pager.js::pagerHtml`，引擎与矩阵共用；6 处并轨后统一读 `data-lf-page` | `filter-row` S10 + **S11**（`page-btn` / `page-num` 只允许由 `pager.js` 产出） |
| R23 矩阵人维无上限 + 单一源吞语义 | R15 只封顶项目维；表态矩阵的「异议红底 / 未投灰字」若并入通用矩阵会被吞 | `relation-matrix.js` 补 `MATRIX_ROW_LIMIT = 10`（人维在行 / 列同一切片）、`cfg.rowLimit`；新增 `cfg.cellClass()` **挂载点**（单一源只给挂载点，不吞领域语义） | `relation-matrix` S1 + **S5** |
| R24 宽表只覆盖 2 域 + 被取代实现留痕 | 其余域未迁；表态矩阵并入后留 5 条 `.vs-matrix*` 死样式与一条失真注释 | 推广三域（支部分工 / 专班报名 / 表态矩阵）→ **全站矩阵实现收敛为 1 处**；清死样式 + 修正注释；**保留语义类** `.vs-none` / `.vs-object` / `.vs-note` / `.vs-tally` / `.vs-quorum` / `.vs-locked` | `relation-matrix::S4` + `filter-row::S3` |
| R25 「归一」出口不全 → 调用点各写兜底 | 思想汇报读侧归一此前只有「按人」「待初阅」两出口，跨人取全量归一集合无处可取 | `services/governance/thought-report.js` 补**全量归一出口** `listAllThoughtReports()`（归一只此一处）；台账改用 `renderRelationMatrix` | `relation-matrix::S6` + 真机② |
| R26 说明文件里的数字与名称无人守 | 文档与代码积了 34 处口径未同步；**根因是没有守卫** | ① 全部按**代码实测**修正；② 数字分**五口径**并写明定义（mockDB 顶层业务域 / 持久化域 / server 表 / 资源名 / 快照键，**严禁互相代入**）；③ 新增 `server/test/doc-consistency.test.mjs` 把口径变常驻断言 | `doc-consistency`（**现到 `S1–S16`**：S1–S9 原口径 + S10/S11 守卫清单与断言号真实性 · S12 授权声明带日期 · S13 `TIMESTAMPS` ↔ frontmatter（规模判据 = 推导式恒等式）· S14 可数事实对账 · S15 弱清单 · **S16 守卫注册完整性**（S 类测试须全数列入 `test:daily`）；与 `DATA_CONSISTENCY_CHECKLIST §0.2` 同批取齐） |
| R27 结构层守卫锁「形态」锁不住「体验」 | 分页 / 矩阵守卫全是静态断言，证明不了「每个工作台每个 tab 跑起来真的分了页」 | 新增**真机全站普查** `server/test/page-sweep.test.mjs`（七台 × 全部 tab 逐一断言；门槛值由 S0 锁单一源） | `page-sweep.test.mjs`（S0 + 普查 + S1 非空转）。唯一初始告警经复核为**守卫口径过严** ⇒ **修守卫、不改产品** |
| R28 「同一病灶只修一处」当成「修完」 | 「提交报必填、框却不在位」修好后，**同一形态全站还有 92 处** | ① 立**台账** `server/test/form-loop-registry.mjs`；② 建**真机闭环普查** `form-loop-sweep.test.mjs`（空必填点须报**可见**提示，且提示点名的字段**须有可见载体**；另含真机成功路径）；③ 台账守卫 S0–S6；④ 纪律入 `DATA_CONSISTENCY_CHECKLIST` 第十三范本 + §0.1「同类规模」问 + `CLAUDE.md R-67`（后续强化 `R-73` / `R-78`） | `form-loop-sweep.test.mjs`（S0–S6 + 真机闭环 + 成功路径） |
| R28-附 工具脚本把「**数据**」当「**代码**」改写 | `bump-version.mjs` 补戳正则命中台账数据（`form-loop-registry.mjs` 113 条 `file` 字段被改坏，**真事故**） | 缓存键**语境判据**抽为单一源 `version-next.mjs::isCacheKeyLine`；台账数据改写为 `SRC + '相对路径'` 拼接 | `version-stamp` S4–S6 + D7–D9；`form-loop-sweep::S4`（数据里不得出现 `?v=`） |
| R29 授权声明必须可核验（注释不得伪造「支书批」） | 一条提醒随批进仓、注释写「支书 2026-09-09 批」，而全仓找不到该具体功能的问答记录 | 立 `CLAUDE.md R-70`：新增**面向用户的提醒 / 流程 / 人工动作**须**逐项**请支书确认，不得随批「一起进」；注释里的「支书批」**必须能指到具体问答记录**。判据收窄到「支书作为批准者的断言」（370 → 229 条命中） | `doc-consistency::S12`（同一行须带可核验日期 `YYYY-MM-DD`；迁移台账已清空 = 此后零容忍）。⚠ **日期能否真指到问答记录，机器查不了**——该半截靠支书复核，**不假装守卫覆盖整句纪律** |
| R30 「人工归集」类要求须由服务端代劳 | 提醒要求支书「请逐人归集」组员进展，而四项都已建服务端表、缺的只是按 `personId` 聚合的读接口——**算得出来的东西派给人做 = 虚假工作量** | 纯聚合单一源 `services/member/member-progress.js::aggregateMemberProgress`（服务端**同源 import**）+ 读接口 `GET /api/v1/leader/member-progress` + 前端双态载入器；界面由「催人干活」改「**呈报实况**」 | `member-progress.test.mjs::S1–S4`（S1 结构单一源：接口源码不得自写判定） |

> **本轮方法论要点（可迁移，①–⑫）**：①「**同一事实几份**」→ 3.3 去重；「**同一能力几处**」→ 本台账**引擎化**（R14/R15）；②「**口径寄生环境**」→ 算式显式（R17）与「量尺须生产同构」；③「**绕过守卫的等价写法**」→ 守卫须按**语义**判而非按字面判（R16 快照 / R18 人名变量 / R13 注释两级规则）；④「**为修一个 bug 复制一份实现**」→ 同一实现体挂多门（R19）；⑤「**能力收进引擎 ≠ 已收口**」→ 必须**反向枚举**（先查使用点、再查实现点）（R21/R22）；⑥「**单一源搬迁 = 一次全仓改签**」→ 换文件 / 换名字后须 grep 旧路径（含 `?v=`）并断言 0 命中，静态守卫只锁形态、锁不住引用完整性（R22 真实事故）；⑦「**单一源不吞语义**」→ 通用能力只提供**挂载点**（如 `cellClass`），领域语义留在域内（R23）；⑧「**被取代的实现痕迹要连注释一起清**」——注释与代码不同源即误导，会被后续 AI 当规范读（R24）；⑨「**归一也是一份口径**」——读侧归一同样只能有一个出口（R25）；⑩「**文档里的数字与名称也是口径**」——不一致不是文风问题，而是**缺守卫**（R26）；⑪「**静态断言锁形态、真机普查锁体验**」——支书以「我体验到的」提出的病灶，必须用**真机全站普查**取证（R27）；⑫「**只修一处 = 没修完**」——病灶是「**一类形态**」不是「一处 bug」：修完立刻数「同一形态全站还有几处」（按语义枚举），>1 处即建台账 + 真机覆盖，并让守卫把「新增同类未纳入覆盖」变红（R28）。
> **并附（2026-09-29 批次 262 增）**：⑬「**弃用只做到引用层、没做到资产层**」——删引用 ≠ 删资产（`docs/assets/vendor/` 曾留下两件零引用死库，见 `.ctx/REVIEW_QUEUE.md` `H-17`）；「目录分层 / 改路径」后必须扫**动态 import 的模板字面量**（静态守卫与 `module-load` 曾双双绕开，见 `H-15`）。

#### 复核保留（2026-09-03 定，防过度合并）
- ① `TYPE_META` / `STATUS_META`：支部侧（「待党委批复」+ desc）与党委侧（「待批复」）文案不同，属**双视角差异**，暂不合并。
- ② `makeup::MANDATORY_ACTIVITY_TYPES`（刚性考勤子集 + 主题党日）与 gallery 色名：业务语义 ≠ 三会子类清单，不并入 subtypes。

#### 复核约定
- 每完成一个行动线条目，回 §四 更新状态并留日志（`.ctx/logs/**`）。
- 评分按季度或重大架构变更后复核一次，防「评估僵尸化」。
- 用户否决某条优先级时，只调顺序不改表结构；新方向裁决追加为后续编号行。

---

## 四、改造行动线（现行唯一行动清单）

> **语义**：本表为后续开发顺序的**唯一依据**。**状态记号：✅ = 已完成 / 立项 = 在立项 / 后续 = 后续批次或残项跟踪**。**每行只写「现状 + 残项 + 指针」**；逐批过程与实测数字见 `.ctx/logs/2026-09-EXECUTION_LOG.md`。

| 编号 | 行动内容 | 状态（当前） |
|------|---------|------|
| P0·统一扎口 | 以 forms.js 为样板，为徽章 / 数据视图等高频组件域逐一建库出口、全站收口（验收：每建一库跑 module-load + E2E；仓库无该域直连残留） | ✅ 三库完成（纪律见 §3.1）；**残项**＝徽章 / 选择器等出口仍散（见 §二 2.1） |
| P0·数据域接线 | tab / 能力声明依赖的 service + mock 整体可替换（验收：新增 demo 分支或后端接入时 UI 零改动） | ✅ 收官：UI 层 `mock` 直连清零，种子仅存 `services/core` 数据层（契约见 §3.2） |
| P0a–P0c / P1a–P2c | 3.3 去重队列 R1–R9 的结构 / 单一源收口（微工具出口、元数据单一源、flow 键集断言、跨层单源、tab id 收敛、写场景清单、角色集单一源） | ✅ 全部完成；R2 的 2 项**复核保留**（§3.3 末）、R10/R11 **观察** |
| P1·开源合规包 | LICENSE、示例账号外置 env、部署 / 贡献说明 | ✅ 闭环（P8 交付后**残项清零**；原残项「拖拽编排」转 §四 P10） |
| P1b | R12 运行安全：server 登录加密码校验（可开关，缺省演示态兼容） | ✅ 完成（缺省 `'123456'` 可换 `LOGIN_PASSWORD` + `DISABLE_PASSWORD_CHECK=1` 逃逸门；**生产未设口令 ⇒ 启动即拒**） |
| P2·L3 拖拽 | L3 block manifest + 拖拽编排（验收：块声明 inputs / 事件 / 校验契约定稿并经支书确认后编码） | ✅ 契约 v1.1 定稿且已落地（块目录 **6 块** + 校验器 + `config.workflowBlocks` 配置区〔含 `blockOrder`〕）；**余下**＝画布 UI（L4）· 运行时面〔待裁〕· ②③ 两轴（转 P4d） |
| P3a–P3e | 阈值参数化（票决门槛）/ 纪检考勤类型单源 / `policy-defaults.js` 建立 / 模块组合声明契约 v0 / 色板令牌收敛 | ✅ 全部完成（现状见 §二 2.4；R2-3 裁定正文见 `.ctx/logs/2026-09-DECISION_LOG.md`「归位五」） |
| 8.7-①~④ | 支书台分工面板保态 / 多议题票决并行 / 考勤录入保态 / deploy 文档口径风化修正 | ✅ 全部完成 |
| P4a–P4c | 模板型最小包（换壳指南 + `?reset=1`）/ 换组织向导页 / 演示数据与空组织模板分离 | ✅ 完成（详见 `.ctx/REVIEW_QUEUE.md` 附录⑧；阶段三候选「数据层覆盖预览 / 党委默认模板抽象」登记后续） |
| P4d | 组合能力补强：`policy-defaults` 接 config 驱动 / `requiredRoles` 门禁消费 / 拖拽编排推广全站 | ✅ **三项均已完成**（域参数 config 驱动 · 门禁消费 · 见 P9 / P10）；**余下**＝画布 UI（L4）· 运行时面〔待裁〕· ②③ 两轴 |
| P5 | **物理目录分层**：`services/` → **5 域** · `components/` → **6 域** · `entries/` → **3 类**（`pages` / `workspace` / `tabs`）；`modules/` 经判据核验**不再细分**（余 3 件各成一类） | ✅ 完成；**2026-09-29 批次 267 再进一层**（支书点选「①+②+③」）——`modules/` 消解 · `core/` 分 4 子域 · 新立 `data/`；**落地方式与「下一次搬迁前必读」硬成本 ⇒ 见 §六 G2**（本行不重复） |
| P6 | **数据服务端化收尾**：唯一「暂留本机·未服务端化」的业务事实改挂成员档案字段 | ✅ 完成（写口与 `developStage` 同一笔落档、读口形状不变；本机键降级为遗留键）。**未上调任何维度分**——属「数据形态」，五维无对应量尺 |
| P7 | **服务端按内聚切分 ＋ mock / server 双份种子收成单一源** | ✅ 完成：`server/routes/resources.js`（1301 行）→ `routes/resources/` **六件**（`index` / `gates` / `approval-gates` / `snapshot-versions` / `store` / `semantic-routes`，逐字搬迁、口径零改写）；`docs/src/data/mock/prop.js` 收 `WEEKLY_REPORTS_SEED` / `PROP_TASKS_SEED`，UI 侧与 `server/seed.js` **同源 import**。⚠ **越权项（如实登记 · 待支书核可）**：`doc-line-ref::R5` 短式引用下限 **40 → 30**（切分后同一行多条短式落到不同新文件、短式无从表达 ⇒ 一律改写为全式；其余三条基线一字未动）。**切分成本的实测 ⇒ 见 §六 G2 末段** |
| P8 | **G3-1 语义化 release / 发布工作流** | ✅ 完成（现状见 §二 2.3；纪律 `CLAUDE.md R-90` · `CONTRIBUTING.md §六`） |
| P9 | **G3-2 全量 config 引擎** | ✅ 完成：`POLICY_DEFAULTS` 26 叶键 100% 有归属（白名单 14 ＋ `POLICY_FIXED` 12），守卫 `policy-config::R1–R3` 断言「每个叶键恰属两类之一」⇒ **「未登记」第三态被消灭**；白名单本批**不扩**（未登记项全属制度 / 展示口径，无技参）。现状见 §二 2.4 |
| P10 | **G3-3 拖拽编排 L1→L5**（组合能力主残项；块目录已由 2 块铺开至 **6 块**） | 🟢 **前三层已落**：L1 通用编排内核（纯 ESM、零依赖；守卫 `block-orchestration::O1–O5`）· L2 配置面（`workflowBlocks.blockOrder` ⇒ 顺序支部可配；向导第②步可排序 ＋ 内联「组合体检」）· L3 同类场景铺开（三会一课四块入册 ＋ 入口守卫 ＋ 机检 `scene-write-sync ④`）。**余下**＝① **运行时面**（写口 / 任务派生是否消费组合产物——**口径待支书裁**）② **画布 UI**（L4 编辑器形态）③ **② 表单条目 / ③ 参与人范围两轴**（待口径，见 `.ctx/REVIEW_QUEUE.md` `H-11`） |
| P11 | **English 版** | ❌ **裁定不做**（支书 2026-09-28 原文「我们不需要英语！」）⇒ 从残项移出；客观语言门槛如实留档（产品边界） |
| 后续·残项跟踪 | 组件出口零星散件、G3-3 余下三层 | 后续（见 §一 残项 TOP 与 §二 各维残项；**已闭合项不再逐条罗列**，见日志沿革节） |

---

## 五、经验索引与当前值（便于 check；2026-09-15 批次 44 建）

> **本节唯一职责**：让人（支书）与 AI 在**一屏内**看清「**现在是什么** → 由谁守 → 还欠什么**」。**本节不复述细节**——判据在守卫文件、规则在 `DATA_CONSISTENCY_CHECKLIST §0.2`、**逐批沿革与打分论证在执行日志**（单一源 + 指针纪律）。

### 5.1 逐批沿革与打分论证（**已迁出 → 日志**）

> **迁出去向说明**：本节标题保留（`§五` 的编号被多处按「§五 → 沿革」的心智引用过）。**迁到哪儿**：沿革表 + 逐批「为何 +1 / 不加分」论证 + 分数与规模演进链 → `.ctx/logs/2026-09-EXECUTION_LOG.md` 的「**附：工程化评估逐批沿革**」节。**为什么迁**：本文件职能＝回答「现在工程化到几成、下一步该改哪里」，不答「哪一批做了什么」。**现在要查**：沿革去日志；现状看 §一 / §二 / §3.4 / §5.2。

### 5.2 当前值（一屏看现状）

- **五维（当前）**：模块化 **99** · 插件化 **75** · 开源化 **80** · 超参数可调性 **86** · 组合能力 **83** ⇒ **综合 ≈ 85**（均值 84.6）。残项与依据见 §一 / §二。
- **目录分层（当前 · 2026-09-29 批次 267 收官）**：`core/` **4 子域**（base 7 · domain 7 · boot 4 · session 4 = 22 件）· `data/` **新立**（4 适配器 ＋ `mock/` 15 件）· `services/` **5 域**（core 9 · member 9 · activity 12 · governance 11 · branch 8 = 49 件）· `components/` **7 域**（ui 13 · shell 6 · sections 2 · feedback 4 · record 11 · governance 13 · dashboard 4 = 53 件）· `capabilities/` **顶层 11 件** · `entries/` **3 类**（pages 15 · workspace 7 · tabs 68）· `workflow/` 8 件 · `config/` 1 件。**`modules/` 已消解**（能力声明上提顶层；3 件跨页件按判据归位：`branch-demo-nav` → `services/core/` · `references`/`help-catalog` → `components/sections/`）。落地方式与硬成本 ⇒ 见 §六 G2。
- **测试规模**：**动态口径，不写死**——以 `server/test/` 实测为准（分档见 `server/README.md`「测试耗时台账」）。
- **纪律与判据索引（当前）**：`§3.4` 收敛台账 **R13–R30 共 19 行**（含 `R28-附` / `R29` / `R30`）；`CLAUDE.md` 现行纪律 **R-68 ~ R-80**（真机同环境量测 · 不得以「等裁定」结束回合 · 授权声明可核验 · 异常面下沉动作级 · 守卫覆盖按接口逐维数 · 台账完备性三缺一 · 等待窗口须覆盖真实耗时 · 判据落在事实上而非手段上 · 增量而非绝对值 · 判据之间不得互相冒充 · 「不可达」只有两条出口 · 「成功」须确认落库 · 每个字段都要有判据）；自查问句 = `DATA_CONSISTENCY_CHECKLIST §0.1`（**现到二十七问**）；范本 = 同文件（**第六–第二十七**）；判例集 = `content/05_ai_coding/TEST_AND_VERIFICATION.md`。**逐条「哪一批增了哪一问 / 哪一范本」属沿革 ⇒ 见日志**。
- **浏览器本地业务数据（当前）**：**已无「暂留本机·未服务端化」的业务事实**。其余本机键按性质三类（草稿 / 预览 · 本机令牌 / 运行态 · 偏好与会话），判定与逐条理由 = `content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md §0.3`（机检镜像 = `localstorage-key-guard`）。

### 5.3 一页指针（找什么去哪里，不在本文件复述）

| 想查什么 | 去哪里（唯一权威） |
|----------|--------------------|
| **规则 → 由哪个守卫守 → 当前状态** | `content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md` **§0.2 总索引**（S9 守卫其引用真实性） |
| 病灶类的**可执行判据**（改前自问） | 同文件 **§0.1 自查问句（现到二十七问）** + **范本第六–第二十七** |
| **判例**（什么条件下会失效、怎么被抓住） | `content/05_ai_coding/TEST_AND_VERIFICATION.md` |
| 单一源**组件**登记（新增件须登记） | `README.md` 开发路径 · 单一源组件登记处 |
| 本轮 / 历轮的**原始动作记录** | `.ctx/logs/2026-09-EXECUTION_LOG.md`（批次条目 ＋「附：工程化评估逐批沿革」） |
| **定了什么** | `.ctx/logs/2026-09-DECISION_LOG.md` |
| 评审遗留与特批记录 | `.ctx/REVIEW_QUEUE.md`（Q 台账 + 附录） |
| 术语与口径唯一化 | `content/03_doc_system/OPERATIONS_GUIDE.md` §19（《运行与协作规范》术语使用规范；母本表见 `ARCHITECTURE.md §十`） |
| 当前版本基线 | `.ctx/SNAPSHOT.md`（版本里程碑 + 生成段） |
| **何时动过** | `.ctx/TIMESTAMPS.md` |

### 5.4 每批任务的入口顺序（三步，谁改谁负责）

1. **改前**：读 `DATA_CONSISTENCY_CHECKLIST §0.2` 扫与本次改动相关的规则，再读 §0.1 十四问自问（答不实**先问支书**）；
2. **改中**：新能力 / 口径一律收进单一源（引擎 / 叶子件 / 常量表），**反向枚举**确认没有绕过单一源的自写实现；**同类病灶先数规模**（>1 处即建台账 + 真机覆盖）；
3. **改后**：更新 §0.2 总索引 + 相应守卫（新增断言即更新 `README` 守卫清单语区）；**交付报告第一屏给提交命令与未提交规模**（`R-66`）；**定向测试为主，交付前才跑全量**。

---

## 六、改进梯度（G0–G3）

> **排序原则**：**先做「机械可验证、失败可定位」的，再动「一改就牵动全链」的**。每一级写清 **前置条件 / 做什么 / 验收判据 / 主要风险**——梯度不是愿望清单，而是**可独立交付、可独立复跑**的分批。

### G0 · 零风险（当批可交付；不动物理结构、不动禁改文件）
- 说明文件口径统一与「服务可用性」入口口径（`file://` 打不开网页 / 要用服务地址）。
- 残项台账化：§二 各维残项逐条可指认，机器判不了的**如实登记**。
- **验收**：`doc-consistency` / `doc-line-ref` / `frontmatter-freshness` 三绿；**只改 md 时不 bump `?v=`**。

### G1 · 小步可验证 —— ✅ **已完成（四项全清，各带常驻守卫）**
1. ✅ **按 viewer 角色消费能力**（插件化与组合能力共同最大失分项）：`workspace-shell` 先查角色能力、再按 scope 兜底，两查皆空**渲染显式提示卡**（原为静默空壳）。守卫 `capability-registry`。
2. ✅ **选人域出口扎口**：`components/governance/pickers.js` 为唯一出口（两个实现文件不直连）。守卫 `person-consistency::S5`。
3. ✅ **服务层剥离 UI 依赖**：`issue-dispatch-view.js` / `notice-view.js` 两个新组件承载原住在服务层的渲染（整块逐字搬迁、零行为变化）；服务层对 `components/` 的 import **清零**。守卫 `module-load::E3`。
4. ✅ **manifest「未同步即红」**：`block-manifest` 新增 S2（`sopRef` 制度文件须真实存在）/ S3（组合声明必须真合法，原先只 `console.warn`）/ S4（`capabilityId` 须在 `CAPABILITY_PROVENANCE` 登记）。

### G2 · 结构性（最贵）—— ✅ **已完成：物理目录分层**
`services/` **47 件 → 5 域**；`components/` **51 件 → 6 域**；`entries/` **3 类**（`pages` / `workspace` / `tabs`）。**落地方式（可复用）= codemod 而非手改**：① 移动文件；② **Pass A** 按「旧目录解析、新目录重算」重写全部相对 specifier；③ **Pass B** 改文本引用（md / html / 注释 / 字符串）；④ **Pass C** 补两类漏网形态（**路径分片 join** `'services','x.js'` 与**正则转义字面量** `services\/x\.js`）；⑤ `?v=` 全链 bump；⑥ 行号引用同批改签。

**下一次搬迁前必读（实测硬成本）**：

| 成本项 | 现状与教训 |
|---|---|
| 相对 specifier 重算 | **文件一挪，连「指向未挪文件」的相对路径也要重算**（深度变了）；服务层 / 组件层 / 入口层三轮累计上千处 |
| 文本引用 | md / html / 注释 / 台账数据同批要改（同样上千处） |
| **守卫的「相对深度」断言** | **2026-09-29 新增**：有守卫把相对路径深度写死在断言里 ⇒ 文件一挪即红。**已改 `(\.\.\/)+` 深度无关写法**；**「文件名写死在断言里」这一类仍在**（下次搬迁仍会红，只是能一眼定位） |
| 说明文件行号引用 | `README-server.md` 的 `文件:行号` 极敏感——**只动一个文件三行即触发 6 处**瞬时失效（`doc-line-ref` 当场判红）⇒ **等同批改签，或对注释改动改用「净零行」** |
| **动态 import 的模板字面量** | **2026-09-29 新增（真事故）**：一处 `` import(`../x/${y}.js`) `` 漏改深度 ⇒ **运行时 404**、真机才暴露（见 `.ctx/REVIEW_QUEUE.md` `H-15`）⇒ **搬迁后必须扫这一类，已补 `import-path-guard`** |
| **浏览器绝对路径 `/src/<…>`** | **2026-09-29 批次 267 实测**：E2E 测试大量用 `import('/src/core/x.js?v=…')` 这种**浏览器绝对路径**——它既不是相对 specifier、也不是 md/html 的 `docs/src/…` ⇒ **Pass A / Pass B 都扫不到**，静默 404（只在全量档暴露）。搬迁后必须**另跑一遍 `/src/<旧>` → `/src/<新>`**。 |
| **目录名与既有「跳表」撞名** | **2026-09-29 批次 267 实测**：新立的 `docs/src/data/` 撞上 `bump-version.mjs` / `release.mjs` / `localstorage-key-guard` 里**沿用的 `'data'` 跳过项**（原为防御性死项，此前无此目录）⇒ 该目录**整层不被打戳 / 不被扫描**（`version-stamp` 会因出现两个活动戳判红、`localstorage-key-guard` 会把该层定义的键判成「僵尸登记」）。**立新目录前必须先 grep 全仓跳表**。 |
| **`core.autocrlf=true` 下的 `git checkout`** | **2026-09-29 批次 267 实测（真事故）**：`git checkout -- .` 把整棵工作树由 LF 写成 CRLF；守卫里用 `\n` 写死的正则（如 `branchId,\n\s*title,`）**当场判红**，且 `git diff` **看不见**（autocrlf 把 EOL 差异归一化）⇒ 排查极费时。**处置**：按 `git ls-files --eol` 把「索引为 LF、工作树成 CRLF」的文件改回 LF（403 个）。**教训**：本仓工作树是 LF；回收工作树不要用裸 `git checkout -- .`。 |
| 禁改面 | `docs/src/data/mock-adapter.js` 等在**禁改清单**内：只随全站 stamp 动 `?v=`（零代码改动） |

- **服务端那一半（同线）**：`server/routes/resources.js`（1301 行）→ `routes/resources/` 六件。**教训**：① **import 深度不可一律 +1**（该文件依赖横跨三档 ⇒ 必须逐条按「老目录解析 ⇒ 新目录重算」）；② 守卫与测试里**把该路径写死**的多处须同批改签；③ `doc-line-ref` 短式引用在「同一行多条落到不同新文件」时无从表达 ⇒ 改写为全式（`R5` 短式下限 40 → 30，**越权项、待支书核可**）。
- **残余（如实登记）**：**2026-09-29 批次 267 已消解**——支书点选「①+②+③ 全档」后：① `modules/capabilities/` 上提为顶层 `capabilities/`，余 3 件**按判据**归位（`branch-demo-nav` 是身份/放行横切件 ⇒ `services/core/`；`references`/`help-catalog` 是页级板块渲染器 ⇒ 新建 `components/sections/`——两者有**共同判据**，不再是 P5 时判的「各成一类」）；② `core/` 27 件分四子域（base/domain/boot/session）；③ `mock/` 与 4 个 adapter 合成顶层 `data/`（按 `D-677` 让「数据形态」边界一眼可见）。**改判理由**：P5 只判过 `modules/`「**不再细分**」（不在 3 件内部再建子目录），**未裁过命名与归位**；支书本轮明确要求「更舒服、高效的划分」。**累计 56 件搬迁 / 723 处 specifier 重算 / 800 处全路径引用 + 216 处裸路径 + 106 处 `/src/` 绝对路径**。

### G3 · 已获支书点选 / 裁决（三项）
- **G3-1 语义化 release / 发布工作流**：✅ 已交付（→ §四 **P8**；纪律 `CLAUDE.md R-90` · `CONTRIBUTING.md §六`）。
- **G3-2 全量 config 引擎**：✅ 已收口（→ §四 **P9**；`POLICY_FIXED` 台账 ＋ 守卫 `policy-config::R1–R3`）。
- **G3-3 拖拽编排 L1→L5**（→ §四 **P10**）：🟢 **前三层已落**（L1 内核 / L2 配置面 / L3 同类场景铺开）。支书已裁两项口径：① **「块差异」＝「流程组合」**（`WORKFLOW_BLOCK_CONTRACT §〇` 三轴取第 ① 轴；②③ 轴本批不作主口径）；② **推进顺序＝先「全站推广」**（画布 UI 另批）。契约约束：`§二` 要求 `blockId` 与既有 capability / scenario id **一一对应** ⇒ 铺开**复用既有场景 id**（`block-manifest::S5` 把「注册表对应」落成机检 + 显式例外台账）。
  - **余下（待裁决，不代裁）**：① **运行时面**——「支部停用某块」是否**服务端硬执行**（现状：仅前端入口守卫，服务端活动写门 `_assertActivityWrite` 只按角色 × 活动类型判、**不看 `config.blocks`**）⇒ 属产品 / 制度口径；② **画布 UI（L4）**；③ **② 表单条目 / ③ 参与人范围两轴**（见 `.ctx/REVIEW_QUEUE.md` `H-11`）。
- **English 版：裁定不做**（支书 2026-09-28 原文「我们不需要英语！」）⇒ 从开源化残项移出（→ §四 **P11**）。
- **纪律**：每项**先出方案再动手**（本文件与 `content/**` 均为支书批改层）；**G3 任何一项不得以「顺手一起做」进入 G0–G2 的批次**（`CLAUDE.md R-70`）。

### 梯度纪律（不许跳过）
- **G1 未清之前不做 G2**（理由见上）。
- **G3 任何一项不得以「顺手一起做」进入 G0–G2 的批次**（`CLAUDE.md R-70`）。

---

## 附：沿革与口径注

> **迁出去向说明**：本节原有四段（评估沿革（一句）、关键日期与支书再评定调要点、文件沿革（旧路径段）、执行日志索引）已于 2026-09-17 **逐字迁出**至 `.ctx/logs/2026-09-EXECUTION_LOG.md` 的「**附：稳定文档迁出的逐批沿革（2026-09-17 批次 58）**」节。**为什么迁**：本文件职能＝评估结论、工程纪律与行动优先级，「历轮分数怎么变 / 关键日期 / 文件改过什么名 / 日志索引」是沿革。**现在要查**：沿革去上述日志附节；现状看 §一 / §二 / §3.4 / §5.2。
