---
title: "模块化 / 插件化 / 开源化评估——统一扎口方向裁决"
type: design
role: "[工程师]+[AI]"
created: 2026-09-03
last_updated: "2026-09-06"
status: active
related_files: [ARCHITECTURE_EVOLUTION.md, PARTY_COMMITTEE_DESIGN.md, ../module/SOP_WEBSITE_GUIDE.md, ../deploy/DEPLOYMENT_GUIDE.md]
---

# 模块化 / 插件化 / 开源化评估

> **定位**：书记 2026-09-03 问询「如果做一次 模块化、插件化、开源化 的 100 分评估，你会怎么输出？我以此来指导你」。本文档固化该评估结论与行动优先级，作为后续开发顺序的方向选择依据。
> **受众**：[工程师]+[AI]（架构维护者）+ 书记（方向裁决人）
> **关联**：[ARCHITECTURE_EVOLUTION.md](ARCHITECTURE_EVOLUTION.md)（组件化/插件化演进母文档）、[PARTY_COMMITTEE_DESIGN.md](PARTY_COMMITTEE_DESIGN.md)（两级治理设计）。

---

## 一、评估结论速览

> **书记 2026-09-06 再评定调**：① 综合分反映的是**二开组合能力**（模板型交付下「别人能否快速换壳用起来」），不是纯工程内聚分；② **重改进不唯分**——分数只作方向指引，重点看残项清单与行动是否推进（本轮 74→76 主要是**口径回归二开组合能力 + 新增可换壳证据**，不是"凭空改出 2 分"）；③ **开源长期交付形态 = 模板型**——仓库是「制度即代码」模板，随附示例组织（本科生党支部）只是可整体替换的默认值，文档与演示以「给新组织换壳」为叙事主线（落地：§8.8 P4a 根 README 30 分钟换壳指南 + 演示数据一键重置 `?reset=1`）。本文档**覆盖式维护、不逐轮留历史行**，口径沿革见 §八。

| 维度 | 得分 | 一句话结论 |
|------|------|-----------|
| 模块化 | 75 / 100 | 五层分层 + 组件积木 + tab 懒加载为真；esc/fmtDt 微工具、类型/阶段元数据、写场景清单等重复/三写均已收敛（近三轮新代码引入重复趋零）；残项=徽章/选择器等组件出口仍散、服务层个别 UI 依赖 |
| 插件化 | 75 / 100 | registry 自注册 + config.modules/blocks/workforce「配置即组合」+ module-compose v0 契约（depends/conflictsWith 纯校验 + 测试 + 文档）落地；残项=requiredRoles 门禁未被 workspace-shell 消费（仅元数据）、manifest 防漂移测试未全落地 |
| 开源化 | 74 / 100 | 根 README 已一般化、以「复用与二次开发（给其他组织）」为核心章节且增 30 分钟换壳指南（P4a）；数据真人化可整体替换（people/accounts 2026-09-06 基线）；MIT + CONTRIBUTING 齐；残项=无 English 版、release 发布工作流未做 |
| 超参数可调性 | 78 / 100 | policy-defaults 集中默认单一源：票决门槛（应到 2/3+无异议）/ 会议类型与上传位例外 / 考察超期天数 / 应到名单 roster（partyStages+excludeDetained，**已含滞留口径**，2026-09-06）逐项标注 branch-default 可调 / institutional 固定；残项=未接 config 驱动（可调仍改码，留 v1） |
| 组合能力（二开视角） | 78 / 100 | 组合面=工作台配置启停排序 + config.modules/blocks/workforce + L3 block manifest + module-compose v0 契约与测试 6/6 绿；证据=支部书记「工作台配置」入口可视启停排序（party-config-tab）+ config 净化单源 config-clean；残项=requiredRoles 未消费、拖拽编排仅主题党日一处（L1→L5 未达） |
| **综合（当前）** | **≈ 76 / 100** | 五维均值（75/75/74/78/78）——书记 2026-09-06 再评定调「综合分反映二开组合能力 + 重改进不唯分 + 开源长期交付形态=模板型」；失分仍=无 config 驱动可调（默认/阈值改码）、requiredRoles 未消费、拖拽编排未实现、server 登录默认口令弱（P1b 已加口令校验，缺省 123456 + dev/demo 免密路径在，生产须显式换密）、无 English 版 |
> 注 2（书记 2026-09-03 口径修正）：本仓库是支部自己的内部系统，**.ctx 日志与 references/历史会议材料均为内部资产、保留上传**，不存在"出仓脱敏"需求；§7.1 R12 与 §7.2 P1b 中的出仓子项（脱敏/移出/账号外置/.ctx ignore）**全部撤销**。真正保留的工程项仅是「运行安全」：server 登录不校验密码在多人/计算中心部署时任何人可凭 personId 冒名登录（该运行安全项已由 P1b 于 2026-09-03 修复：默认口令校验可换 `LOGIN_PASSWORD` + `DISABLE_PASSWORD_CHECK=1` 逃逸门，见 §7.2 执行状态；本条保留撤销口径原貌）。

---

## 二、统一扎口范式（本评估确立的第一个工程范式）

书记定调：**同一域可以有若干个函数（甚至若干个实现文件），但对外只暴露一个库文件；调用方一律 import 该库，不直接触碰内部实现。**

落地样板（P0 试点一，已完成）：

- 新建 `docs/src/components/forms.js` —— 表单域唯一出口，聚合重导出字段积木（form-field：textField/textareaField/selectField/dateField/labelHtml/errorHtml）与外壳（form-shell：recordFormShell）。
- 三个直连调用方（dispatch-tab / write-tab / taskforce-tab）全部收口到库。
- 仓库中已无直接 import form-field.js / form-shell.js 的调用方。
- 回归：模块加载 116/116、party 相关 E2E 5/5 全绿，零行为变化。

**改造纪律（每次扎口必守）**：
1. 新增库聚合重导出，内部实现文件不搬运、不改名。
2. 调用方只改 import 来源一行；运行期零行为变化。
3. 每批扎口后跑 module-load + 受影响 E2E 回归。
4. 禁止双轨：一旦建库，同域内新代码一律走库，存量直连同步收口。

---

## 三、逐维评分依据

### 3.1 模块化 —— 80/100

得分项：
- 五层分层清晰：core / services / components / modules(capabilities) / entries(tabs)。
- tab 动态 import 懒加载；capability 自注册；组件积木化已落地（badge 全站统一、表单字段/外壳、收件箱等）。
- 表单 B1~B4 后输入件已全局收编（input-flat 14px、label for 关联、aria）。

失分项（列入修复线）：
- 组件出口零散：除 forms.js 外，badge/query-view/picker/modal 仍被各层逐文件直连。
- 服务层存在 UI 依赖（如 services/notice.js import badgeHtml 生成 HTML）。
- entries/tabs 直连 `mock/*`，数据源可替换性差（接入真实后端的前置债）。

### 3.2 插件化 —— 72/100

得分项：
- registry 自注册 + 按 scope 组装（workspace:secretary / workspace:party-committee）。
- 支部实例化 + config.modules/blocks 启停 = 模块开关雏形；支部级 fileSpaceIsolated。

失分项（列入修复线）：
- 无插件清单/依赖关系/冲突检测契约。
- 工作台 tab 显隐需 workspace-shell 与 capability tabs 双维护。
- 能力与页面 scope 常量强绑定，未达到"配置即组合"。
- ~~L3 block manifest（块的 inputs 声明、事件、校验）未定义 → 拖拽工作流模块（根 README 总目标）的代码前提未立。~~ ✅ 2026-09-03 已定义落地：契约 v1.1（WORKFLOW_BLOCK_CONTRACT）+ manifests.js 双块 + 校验器 + 渲染桥 + config.blocks.workflowBlocks 配置区 + 主题党日入口守卫（见 §四 P2 现状）。

### 3.3 开源化 —— 74/100

得分项：
- 全程中文可读设计/规范文档；design（content）与 spec 职责已纠偏。
- 代码带 role 标注与设计源链接；测试覆盖厚（116 模块加载 + 多组 E2E）。
- 根 README 已收录「工作流模块化」总目标（L1→L5 愿景）。

失分项（列入修复线）：
- mock 数据内嵌示例姓名/账号；dev 登录卡直连 mock → 需"示例数据外置"才可他人部署。
- ~~无 LICENSE / CONTRIBUTING~~ / 发布（release）工作流：LICENSE 与根 CONTRIBUTING.md 已补仓（2026-09-04，见 §四 P1 现状）；语义化发布（release）工作流仍未做（维持失分）。
- `?v=` 软版本利于日常整体失效，但非语义化版本发布。

---

## 四、行动优先级（书记据此裁决开发顺序）

| 优先级 | 行动 | 现状 | 验收标准 |
|--------|------|------|---------|
| P0 | 统一扎口推广：以 forms.js 为样板，为徽章/状态、数据视图等高频组件域逐一建库出口，全站收口 | forms.js、badges.js、reporting.js 三库完成（组件平铺层同域多文件已收敛） | 每建一库跑 module-load + E2E；仓库无该域直连残留 |
| P0 | 数据域自动接线：tab/能力声明依赖的 service + mock 整体可替换 | **收官**：person 域/formatter/PEOPLE/机构/登录四批收口完成——UI 层 mock 直连清零，种子仅存 services/core 数据层 | 新增 demo 分支或后端接入时 UI 零改动（data-adapter 双实现全量走通） |
| P1 | 开源合规包：LICENSE、示例账号外置 env、部署/贡献说明 | 部分落地：根 LICENSE + CONTRIBUTING.md + server/.env.example 已在仓（2026-09-04 补，见 BRANCH_WORK_MAP 落地进度·可复用文档件） | 新机器按 README 可独立跑通并自建数据 |
| P2 | L3 block manifest + 拖拽编排（根 README 总目标） | 契约 v1.1 定稿；L3 S1~S4 全部落地（manifests 双块 + 校验器 + 渲染桥 + config.workflowBlocks 配置区 + 主题党日入口守卫，测试全绿） | 块声明 inputs/事件/校验契约定稿并经用户确认后编码（L3 ✅ 2026-09-03） |

---

## 五、数据域接线契约 v1（2026-09-03 person 域试点确立）

**背景**：盘点显示全站 68 处直连 mock；mock/index.js 实为"旧兼容中转"（person 函数早已落到 services/person.js 又被 re-export 回 mock）。债根 = **UI/服务层 import 面挂在 mock，而非真正实现所在的 service**。

**试点（person 域，已完成）**：
- 全站人名函数（getPersonById/getPersonName/PersonStore）import 面从 `mock/index`、`mock/people` 统一迁至 **`services/person.js`**（唯一服务出口）；`_personName` 兼容别名调用点全部改 `getPersonName`。
- `mock/index.js` 清除 person 中转段（不再 re-export person 函数），退化为**纯种子/展示格式化数据仓**。
- 涉及约 40 个文件；module-load + party/multi-user/write-hover/function-catalog 7/7 回归绿。

**批次二（展示格式化提升，已完成 2026-09-03）**：
- 5 个纯展示格式化函数自 mock/* 原样提升至对应业务 service：`attendanceToLong` → services/attendance.js；`inspectionToDisplay/inspectionToLong/inspectionToWide` → services/inspection.js；`reviewToDisplay` → services/review.js。
- mock/attendance|inspection|review.js 仅剩种子数组（冗余 person/activities/标签依赖随之清理）；mock/index.js 不再中转任何格式化函数。
- 7 个 UI 调用方 import 面改挂 services；module-load + mock-integrity + party + multi-user 7/7 回归绿。

**批次三（成员名单 PEOPLE 收口，已完成 2026-09-03）**：
- `services/person.js` 增 `PersonStore.getMembers()`（成员名单语义 = 静态党员种子，不含登录系统账号 mockDB.users——区别于 getAll）。
- 全站 UI/组件/entry/tab 层 16 个文件直连 mock PEOPLE（mock/index 或 mock/people）改为经 `PersonStore.getMembers()` 模块级捕获（体内用法零改动，行为与静态种子一致）。
- UI 层 PEOPLE 直连 mock **清零**；mock/index 的 PEOPLE re-export 仅剩 services 层 7 处种子引用（契约允许）。
- 回归：module-load + party/multi-user/block-entry-guard/capability-registry 18/18 全绿。

**批次四（余种子与机构/登录收口，收官 2026-09-03）**：
- 党委机构名：`branch.js` 增 `getCommitteeName()`；monitor/dispatch/branches 三个党委 tab 直连 mock/branches `PARTY_COMMITTEE` 改走服务（header 品牌软编码同域收敛）。
- 账号登录：`auth.js` 增 `AuthStore.verifyCredentials()`；login-entry 直连 mock/accounts `mockLogin` 改走认证服务（真实后端接入时仅替换该实现）。
- **达成 P0 收官态：UI 层（entries/components/modules）对 mock 的 import 直连清零**——全仓 mock 引用仅存于 services/core 数据层（种子接入点，契约允许）。
- 回归：module-load + party-committee/dispatch + write-hover 5/5 全绿。

**契约条款**：
1. **人名与人员对象获取**（getPersonById/getPersonName/PersonStore）唯一出口 = `services/person.js`；任何层禁止从 `mock/*` 获取人名。
2. **成员名单**（PEOPLE 语义）唯一出口 = `services/person.js` 的 `PersonStore.getMembers()`；UI/tab/组件层禁止直连 mock 种子数组；种子数据仅许 service 层引用。
3. **展示格式化函数**（attendanceToLong/inspectionToLong/reviewToDisplay 等）统一栖身各业务 domain service（attendance/inspection/review），随记录读写同域演进；mock 数据模块不承载格式化逻辑。
4. 新代码一律遵守 1~3；存量收口按批次推进，每批回归。

---

## 六、复核约定

- 每完成一个 P0 扎口试点，回本表更新"现状"列并留 T- 日志。
- 评分按季度或重大架构变更后复核一次，防"评估僵尸化"。
- 用户否决某条优先级时，只调顺序不改表结构；新方向裁决追加为 P3+ 行。

---

## 七、批判性复评：冗余/重复实现审计与去重队列（2026-09-03 书记第二轮）

> **定位**：书记要求"对多余、冗余、重复实现的代码高度批判性地思考并执行"。本审计只收录可证实（文件+行号）的重复，供书记裁决去重顺序。**审计原则：优先统一"同一业务事实的唯一出口"，再谈删代码——先扎口后去重，避免删完又长出第二份。**

### 7.1 重复分组清单（证据）

| 组 | 重复事实 | 证据（文件:行） |
|----|---------|----------------|
| R1 微工具逐文件复制 | HTML 转义 `esc` 至少 10 个文件各写一份；`fmtDt` 双份（另 TYPE_META/STATUS_META 双份同源 reviewRequests） | inspector.js:482 / help-catalog.js:20 / activity-entry.js:43 / vote-widget.js:14 / vote-summary-panel.js:16 / review-tab.js:15-28 / report-up-tab.js:15-28 / party-config-tab.js:17 / branches-tab.js:14 / dispatch-tab.js:17（utils.js:127 的 esc 是 CSV 专用，非 HTML 转义） |
| R2 类型/阶段元数据多写 | 三会四子类清单三份：constants.js:485 / inspector.js:356 MEETING_TYPES / makeup.js:13 MANDATORY_ACTIVITY_TYPES；阶段枚举另见 CANDIDATE_STAGES 与各 seed | constants.js:481-492 / inspector.js:356,374 / makeup.js:13,44 / dashboard/gallery.js:23（色名） |
| R3 产出块 id 消费端手写 | write-tab 重列 4 id（至少 3 处）与 constants OUTPUT_BLOCK_DEFS 重复；calendar-tab 手写 THEME_DAY_BLOCK_ID 与 manifests.js blockId 重复 | write-tab.js:111,114-117,125-130 / constants.js:557-564 / calendar-tab.js:36 / manifests.js:26 |
| R4 场景目录子集三处手写 | 6 个活动场景的 id+label+颜色在 constants.js（SCENARIO_TO_CATEGORY）、decision-tree.js、calendar-tab WRITE_TEMPLATES 各维护一份（全集唯一源=sopData.js 12 场景） | sopData.js:10-165 / constants.js:121-129 / decision-tree.js:36-96 / calendar-tab.js:394-418 |
| R5 业务链路三写 | flow 语义在 function-catalog desc、mermaid-sources FLOW_LINKS、以及声称的 sopData 各一份；无键集比对测试（注释声称的"防漂移测试"不存在） | function-catalog.js:63-76 / mermaid-sources.js:29-106 / function-catalog.test.mjs:44-48 |
| R6 tab id 散落导航侧 | entry 的 defaultTab/onNavTarget 硬编码 tab id，与能力 tab 清单及 config.modules.hiddenTabIds 无同一性守卫；隐藏后导航静默 no-op | 8 个 ws-*-entry.js / tab-bar.js:198-200 / branch.js:47-53 |
| R7 跨层双净化 | 支部 config（modules/blocks）净化规则 server 与前端各一份，无互引注释、独立演化 | server/routes/resources.js:259-316 / docs/src/services/branch.js:132-176 |
| R8 表决规则跨层重复 | optionSet 枚举+「异议须附言」server 与前端各一份，仅注释声明"对齐" | server/routes/committee.js:30-36,90-92 / docs/src/services/vote-config.js:7-18 |
| R9 角色集合 ≥5 份 | 支委/书记/党委组织员角色 `Set` 分散多文件 | server/routes/auth.js:69-71 / member.js:13 / committee.js:15,17 / resources.js:56-59 / docs/src/core/constants.js:185 |
| R10 删除/归档级联同构 | DELETE 活动联动清理、归档级联 tasks，server 与前端同构实现（注释自认） | server/routes/resources.js:165-204 / docs/src/services/mock.js:142-204 |
| R11 资源名/ID 注册表两端各一 | RESOURCE_TABLES + ID_PREFIX 与前端快照键名两端手维护 | server/routes/resources.js:13-46,87-100 |
| R12 运行安全 | server 登录不验密码（凭 personId 发 token）；18 个账号明文 123456；demo 态/信任模型注释自认（"书记/副书记操作 + 演示场景"）。**书记 2026-09-03 口径：.ctx 与历史材料为内部资产保留上传，非风险项；本条仅保留运行安全部分** | server/routes/auth.js:8-17 / docs/src/mock/accounts.js:4-26 |

> 反例（无需拆分，防过度去重）：block manifest 校验唯一源在前端 manifests.js（server 测试经浏览器复用同文件），职责与 R7 的"config 形状净化"不同——勿误并。

### 7.2 去重队列（优先级=改造成本低 × 漂移风险高）

| 项 | 动作 | 执行状态 | 验收标准 |
|----|------|---------|---------|
| P0a | R1 微工具建库：HTML 转义/日期格式化收敛到唯一工具出口，10 处本地 `esc` 改 import | ✅ 完成（2026-09-03，见下） | grep 本地 `function esc` 归零；module-load 全绿 |
| P0b | R2/R3 元数据单一源：MEETING_TYPES、MANDATORY_ACTIVITY_TYPES、gallery 色名、write-tab 4 id、calendar blockId 全部改为引用 constants/manifests | 🟡 部分完成（TYPE_META/STATUS_META 与 MANDATORY_ACTIVITY_TYPES/gallery 色名 2 项复核保留，见下） | 全仓该 4 id/类型名无第二份字面量；写路径零行为变化 |
| P0c | R5 防漂移测试落地：新增测试断言 FLOW_LINKS 键集 == function-catalog flow id 键集（落实 mermaid-sources.js:30 注释承诺） | ✅ 完成（2026-09-03，见下） | 测试进 server/test 且绿 |
| P1a | R7/R8 跨层：config 净化与表决枚举改为 server 单向权威 or 前端生成 → 注释互链 + 键集测试 | ✅ 完成（2026-09-03，见下） | 两端字段集合由测试断言一致 |
| P1b | R12 运行安全（口径修正后唯一保留项）：server 登录加密码校验（可开关，缺省演示态兼容）——多人/计算中心部署时防凭 personId 冒名 | ✅ 完成（2026-09-03，见下） | 新 clone 部署后无 personId 直取 token 路径；demo 态开关显式 |
| P2a | R6 结构性统一：tab id 收敛——`docs/src/core/tab-nav.js` 纯决策 + tab-bar 守卫（原随 L4 一并做的拆分提前单做） | ✅ 完成（2026-09-03，见下） | 落点命中支部隐藏 tab 回退首个可见 tab、杜绝静默白屏 |
| P2b | R4 结构性统一：写活动场景选择清单收敛单一源（constants `SCENARIO_WRITE_IDS/SCENARIO_LABELS` 派生） | ✅ 完成（2026-09-03，见下） | 写路径三会四子类/场景清单无第二份字面量 |
| P2c | R9 结构性统一：授权语义角色集单一源（constants `BRANCH_COMMISSION_ROLES/SECRETARY_ROLES/PARTY_STAFF_ROLE/COMMITTEE_IDS`） | ✅ 完成（2026-09-03，见下） | 五处本地手写角色集清零，角色 ∈ ROLE_KEYS 断言绿 |

> **执行状态（2026-09-03）**
> - P0a ✅：`esc` 本地实现 10 处 + `fmtDt` 2 处全部收口到 `core/utils.js` 新增 `escHtml/fmtDt` 唯一出口（各文件 import 别名 `esc`，调用面零改动）。
> - P0b ✅（部分）：`MEETING_TYPES` → `ACTIVITY_CLASSIFICATION['three-meetings'].subtypes` 引用；write-tab 产出块 4-id 字面量（2 处）→ `OUTPUT_BLOCK_DEFS` 派生；calendar-tab `THEME_DAY_BLOCK_ID` → `THEME_PARTY_DAY_MANIFEST.blockId` 派生。
> - **复核保留（防行为漂移）**：①TYPE_META/STATUS_META 支部侧（"待党委批复"+desc）与党委侧（"待批复"）文案不同，属双视角差异，暂不合并；②makeup `MANDATORY_ACTIVITY_TYPES`（刚性考勤子集+主题党日）与 gallery 色名，业务语义 ≠ 三会子类清单，不并入 subtypes。
> - P0c ✅：新增 `server/test/flow-catalog-sync.test.mjs`——FLOW_LINKS 键集与 function-catalog flow id 键集**双向断言**（任一侧增删即红）；纯 node 文本求值，沙箱内跑绿。
> - P1a ✅：R7 新增共享纯模块 `docs/src/core/config-clean.js`（cleanIdList/sanitizeConfigModules/sanitizeConfigBlocks，server 严格口径为单向权威），前端 `branch.js` 与 server `resources.js /branches/:id/config` 同源引用，两处本地净化实现删除；R8 `OPTION_ENUMS` 从 committee.js 导出 + 新增 `test/vote-option-sync.test.mjs` 键集双向断言。纯 node 回归：module-config / module-config-validate / workflow-block-config（HTTP config 写路径）/ agenda-votes / output-block-policy / function-map-sync / vote-option-sync 全绿（28 测试 25 过，3 失败均为沙箱 Playwright EPERM）。
> - P1b ✅：server `/login` 默认口令校验（env `LOGIN_PASSWORD` 缺省 '123456' 可换；`DISABLE_PASSWORD_CHECK=1` 逃逸门）；前端 AuthStore.login 与登录页传递密码；`npm test` 系列脚本统一置逃逸门保测试零回归；新增 `test/auth-password.test.mjs` 覆盖默认开/错口令/放行/逃逸门/换口令 5 态。纯 node 回归 24/24 绿（含 agenda-votes/module-config/workflow-block-config）。
> - P2a ✅（R6 首步）：新增 `docs/src/core/tab-nav.js`（resolveInitialTab/resolveTargetTab 纯决策，零依赖双端可加载），`components/tab-bar.js` 初始激活与目标激活接入守卫——defaultTab/记忆/priority 或 URL 导航落点命中被支部隐藏的 tab 时回退首个可见 tab 并 `console.warn`，杜绝静默白屏；`test/tab-nav.test.mjs` 4 态绿（与 capability-registry 共 16/16 绿）。注：branch-module-catalog.test.mjs 依赖浏览器能力注册，沙箱不可用（既有限制非本项回归）。
> - P2b ✅（R4 首步）：写活动场景选择清单收敛单一源——constants.js 新增 `SCENARIO_WRITE_IDS/SCENARIO_LABELS`（中文名派生自 `ACTIVITY_CLASSIFICATION['three-meetings'].subtypes` 权威序列），decision-tree secretary L1Sub 与 calendar-tab WRITE_TEMPLATES 三会 subtypes 改为派生引用（手写清单删除，渲染色/正交维度等本地属性保留）；`test/scene-write-sync.test.mjs` 3 断言绿（键集=平铺 id、四子会中文名逐序一致、写入 id ⊆ SCENARIO_TO_CATEGORY）。注：SCENARIO_TO_CATEGORY 为模块私有常量，测试文本求值。
> - P2c ✅（R9 收口；至此去重队列 7/8 全量完成 + P0b 部分完成（2 项复核保留见上），非 8/8 全量）：constants.js 新增 BRANCH_COMMISSION_ROLES/SECRETARY_ROLES/PARTY_STAFF_ROLE/COMMITTEE_IDS（与业务语义「条条三委员 COMMISSIONER_ROLES」明确区分）；前端 services/auth.js 与 server routes/auth/member/committee/resources 五处本地手写角色集/名单全部改为派生引用。`test/roles-sync.test.mjs` 4 断言绿（角色 ∈ ROLE_KEYS、授权/条条语义不混淆、名单=5 人、文本扫描特征串仅存 constants.js）。纯 node 回归 33/33 绿（含鉴权相关 agenda-votes/module-config/workflow-block-config/auth-password）。
> - 验证：13 个改动文件 GetDiagnostics 零错误；E2E 需在非沙箱终端补跑（`cd server && npm test`）。

---

## 八、超参数可调性与模块组合评估（2026-09-05 第三轮 · 书记开源化问询）

> **定位**：书记问询「既然是开源项目，有些超参数要保留调整空间——我们做的只是**默认设置/本科生党支部自己的设计**；有没有做到模块化，并声明清楚每个模块内部哪些参数可调、模块之间怎么排列组合？」本节为全局评估（覆盖含 A1 权限语义、M2 分工等近期改造板块），口径：**每个默认值都应能回答『这是支部默认，还是制度/合规不可调』**。
> **受众**：[工程师]+[AI]（架构维护者）+ 书记（方向裁决人）。

### 8.1 超参数可调性 —— 60 / 100

**得分项（好例，参数化或已声明）**：

| 超参数 | 默认（=本科生党支部设置） | 位置 | 调整面 |
|---|---|---|---|
| 表决配置 optionSet/voterScope/quorumCheck | deliberative 交流式 / committee 应到 | vote-config.defaultVoteConfig(scenarioId) | 每活动 voteConfig 可覆盖 |
| 支部 tab/块 启停·排序 | 全开 | branch config.modules/blocks + config-clean 单源净化 | 支部实例级配置 |
| 分工归属（11 模块） | SOP 缺省责任人 | config.workforce | 支委会议题改派 |
| 主题色/角色识别色 | 各角色预设 | styles.css `--accent-*` + COLOR_SYSTEM | 侧边栏主题自选（可调）；党建红/党徽金=固定（不可调，已声明） |
| 考察超期判定 | 7 天 | inspection.getOverdueRecords(daysThreshold=7) | 函数入参（未接 config，半开放） |

**失分项（近期改造亦未带原则，2026-09-05 前）**：
- 票决门槛 2/3 出席+无异议**硬编码**于 evaluateWorkforceVotes 内部，改门槛须改码（M2 板块）。
- 纪检会议考勤类型清单**双写**（attendance 服务字面量 + disc tab 本地 const）（A1 板块）。
- 考勤/考察上传位角色例外名单（书记/副书记例外、组长党小组会、组织者位）为函数内字面量数组。
- 无「可调参数声明」近码契约：多数默认值没有回答「支部默认 vs 制度固定」，调整点不集中（建议单一 `policy-defaults` 出口 + 每处默认旁注释）。
- 近期新功能（A1/M2）改动时未把原则带进去——触发本轮。

### 8.2 模块组合性 / 组合能力（二开视角）——基线 68 / 100（2026-09-06 再评 78，见速览与 §8.5 P3d）

**组合机制（已存在）**：
- 能力注册表：`capabilities/*` 自注册，scope→工作台 tab 清单（**台内固定组合的声明面**）。
- 支部 config：`config.modules`（tab 显隐/排序）、`config.blocks.workflowBlocks`（L3 块启停）、`config.workforce`（分工归属）——**实例级"配置即组合"**；净化单一源 config-clean.js；tab-nav 守卫防隐藏冲突。
- L3 block manifest：块的 inputs 声明/校验器/渲染桥 = **块级组合契约**（当前落地于主题党日编排）。
- 场景联动：scenarioId → defaultVoteConfig / 决策树模板（默认组合，可换）。

**失分项**：
- 模块**不自声明**「可与谁组合/依赖谁/互斥谁」——组合靠 config 白名单与注册顺序隐式成立，无组合矩阵、依赖图或冲突检测（插件安装/卸载不存在）。
- 能力 `requiredRoles` 门禁未被 workspace-shell 消费（仅元数据），"组合后授权"弱。
- 工作流块组合目前仅主题党日一处，未覆盖全站（L1→L5 愿景未达）。

### 8.3 声明清楚度（默认=支部语义标注）——含于上两维，判据：代码近旁能否回答"可调/不可调+默认出处"

已达标示例：styles.css（不可变底线注释）、COLOR_SYSTEM（固定/可调四层表）、vote-config（默认场景函数）、config-clean（支部配置单源）。未达标：业务阈值/类型/名单默认出处多数无标注（见 8.1 失分项）。

### 8.4 综合——当前 ≈ 76 / 100（2026-09-06 书记再评定调后口径，改进见速览）

> 口径说明：评估沿革 v1≈75（首评宽松）→ v2≈69（批判复评）→ v3≈67（新增开源部署双维度、最严）→ ≈74（P3a–P3e + P3c/P3d 回补）→ **≈76（2026-09-06 再评定调：综合分反映二开组合能力、重改进不唯分、交付形态=模板型；P4a 新增可换壳证据）**。本文档覆盖式维护，不逐轮留表；明细见执行日志 T-2026-09-033/034/035/036。

### 8.5 行动项（书记据以裁决）

| 项 | 动作 | 状态（2026-09-05） | 验收 |
|---|---|---|---|
| P3a | 阈值参数化：票决门槛（quorum/veto）→ 常量默认 + opts 覆盖 | ✅ 已做（WORKFORCE_VOTE_DEFAULT，默认=书记裁 2/3+无异议，可覆盖） | evaluateWorkforceVotes(opts) 用例绿；默认不变 |
| P3b | 纪检会议考勤类型单源：attendance `MEETING_ATTENDANCE_TYPES` 导出，disc tab 引用（消双写） | ✅ 已做 | 全仓该类型清单无第二份字面量 |
| P3c | 建立 `core/policy-defaults.js`：业务阈值/名单（上传位例外、超期天数等）集中默认 + 注释「支部默认/制度固定」 | ✅ 2026-09-05（spec open-source-deploy-improve，见 §8.7） | 每默认值旁可答"可调/不可调+出处"；policy-defaults-sync.test 5/5 绿 |
| P3d | 模块组合声明契约：capabilities/模块元数据补 `depends/combinesWith/exclusive`（草案）＋ config 校验扩展 | ✅ v0 2026-09-05（spec open-source-deploy-improve，见 §8.7） | module-compose 纯校验 + 失败态测试 6/6 绿；服务端 config 校验留 v1 |
| P3e | 色板：styles.css 令牌与 COLOR_SYSTEM 已对齐（固定/可调标注在文件头注释与四层表） | ✅ 2026-09-05（见 §8.6） | 全仓无游离业务色字面量（品牌/角色色一律走令牌） |

### 8.6 色值收敛落地（2026-09-05，可调/不可调双口径）

- **不可调（合规/品牌底线，令牌化）**：党建红 `--party-red #CE1126`、党徽金 `--party-gold #FFD700`——全站走令牌；inspector 品牌卡历史内联 `#EAB308` 已收敛为 `var(--party-gold)`；duty-card 移除越界金边框（金色应用范围=COLOR_SYSTEM 固定清单，不得扩增）。
- **可调（角色识别层，主题自选）**：`--accent-*` 系列走令牌；深度参与者 `--accent-deep` 由历史存量浅灰蓝 `#94a3b8` 收敛为雾紫 `#A78BFA`（`--accent-deep-light` 同步 `#C4B5FD`），与 COLOR_SYSTEM/constants `ACCENT_COLORS.deep` 三源一致。
- 权威唯一：COLOR_SYSTEM（文档）↔ styles.css/constants.js（代码）↔ 实现零游离字面量。

### 8.7 最小三成本自查与 deploy 改进（2026-09-05，spec：`.trae/specs/open-source-deploy-improve`）

**修复（操作成本，评估→执行）**：
- ①书记台分工面板多议题票决判定：串行 for…of → `Promise.allSettled` 并行（单失败 console.warn 不阻断）——多议题时缩短书记等待（`entries/tabs/secretary/workforce-panel.js`）。
- ②纪检会议考勤录入「收起/展开」保态：改为容器 CSS `hidden` 切换（不销毁 PersonPicker、不重建 innerHTML），仅提交成功后才重置会话——防已选活动/人员/状态重复劳动（`entries/tabs/disc/attendance-tab.js`）；外部 re-render（如队列确认）重建为既有行为，已注释说明。

**deploy 对接（文档口径风化修正）**：server/README 与根 README 测试计数改动态口径（实测 server/test 54 文件为底）、命令段与 package.json scripts 对齐、env 说明补 `LOGIN_PASSWORD`/`DISABLE_PASSWORD_CHECK`。遗留：CLAUDE.md / SNAPSHOT 仍含旧计数（另行处理）。

**疑点登记（待书记目视批）**：书记台分工面板展开态每次重建会丢未提交表单——2026-09-05 已修复（表单区独立于议题列表，见 §8.7 修复②）；同类「面板展开态重建丢表单」面批量复查列为减负/最小三成本候选。

**P3c/P3d 落地摘要（本 spec）**：`core/policy-defaults.js`（集中默认，逐项 kind=branch-default 可调 / institutional 固定 + 出处）消费点改引用（workforce 门槛/attendance 会议类型与上传位例外/inspection 超期天数），`policy-defaults-sync.test.mjs` 5/5 绿；`core/module-compose.js`（组合声明纯校验：引用存在/互斥同含/depends 禁环）+ `manifests.js` 两块补 `depends/conflictsWith` 并接自检 + WORKFLOW_BLOCK_CONTRACT「组合声明（P3d v0）」节 + registry.js 头注释，`module-compose.test.mjs` 6/6 绿、capability-registry 7/7 绿——默认行为零变化。

### 8.8 评估→改进（2026-09-06 · 书记第四轮再评定调，模板化落地）

> **书记 2026-09-06 再评定调三句**：① 综合分反映**二开组合能力**（模板型交付下"别人能否快速换壳用起来"），非纯工程内聚分；② **重改进不唯分**——分数只作方向指引，重点看残项清单与行动推进；③ **开源长期交付形态 = 模板型**——仓库是"制度即代码"模板，随附示例组织只是可整体替换的默认值。速览分项据此口径（模块化 75 / 插件化 75 / 开源化 74 / 超参数可调性 78 / 组合能力 78 / 综合 ≈76，依据见 §一速览）。

| 项 | 动作 | 状态（2026-09-06） | 验收 |
|---|---|---|---|
| P4a | 模板型落地最小包：根 README 增「给新组织：30 分钟换壳指南」（clone 跑 → 换 mock 数据 → 角色/术语/配色/policy 默认 → 支部名与分支配置 → npm test 验证）＋ 浏览器演示数据一键重置（URL `?reset=1` 清除本域演示存储键回种子初始态） | ✅ 本次完成 | 新 clone 者按指南约 30 分钟换壳跑通；`?reset=1` 后回种子初始态且不破坏正常加载与 API 模式 |
| P4b | 换组织向导页：引导式完成 people/accounts/branches/policy 替换并生成组织配置包 | 立项④（大，待书记排期） | 向导产出可一键应用的换壳配置 |
| P4c | 演示数据与空组织模板分离：仓库随附「模板 + 示例组织」双形态，seed 完整性自动校验、一键重置服务化 | 立项⑤（大，待书记排期） | 模板态零示例痕迹；seed 缺失/漂移测试兜底 |
| P4d | 组合能力补强（后续批次）：policy-defaults 接入 config 驱动（超参可调不改码）、requiredRoles 门禁消费、拖拽编排由主题党日推广全站（L1→L5） | 后续批次（残项见 §8.1/8.2 与速览失分行） | 超参改码→可配置；requiredRoles 生效；拖拽块覆盖多场景 |

> 落地位置（P4a）：根 README「复用与二次开发」节（替换入口总表后新增 30 分钟换壳指南）与「快速开始」节（`?reset=1` 说明）；`docs/src/core/mock-adapter.js` `MockAdapter.loadDB()`（读取即检测 `?reset=1`，清除 `workflowos_*`/`gsm1921-*`/`sop_org_os_*` 前缀键与历史遗留键后整页导航回种子初始态；无 API token 时才执行，不清 sessionStorage，不破坏 API 模式）。
