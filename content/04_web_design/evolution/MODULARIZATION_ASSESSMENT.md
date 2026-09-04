---
title: "模块化 / 插件化 / 开源化评估——统一扎口方向裁决"
type: design
role: "[工程师]+[AI]"
created: 2026-09-03
last_updated: "2026-09-03"
status: active
related_files: [ARCHITECTURE_EVOLUTION.md, PARTY_COMMITTEE_DESIGN.md, ../module/SOP_WEBSITE_GUIDE.md, ../deploy/DEPLOYMENT_GUIDE.md]
---

# 模块化 / 插件化 / 开源化评估

> **定位**：书记 2026-09-03 问询「如果做一次 模块化、插件化、开源化 的 100 分评估，你会怎么输出？我以此来指导你」。本文档固化该评估结论与行动优先级，作为后续开发顺序的方向选择依据。
> **受众**：[工程师]+[AI]（架构维护者）+ 书记（方向裁决人）
> **关联**：[ARCHITECTURE_EVOLUTION.md](ARCHITECTURE_EVOLUTION.md)（组件化/插件化演进母文档）、[PARTY_COMMITTEE_DESIGN.md](PARTY_COMMITTEE_DESIGN.md)（两级治理设计）。

---

## 一、评估结论速览

| 维度 | 得分 | 一句话结论 |
|------|------|-----------|
| 模块化 | 70 / 100 | 分层与组件积木真实；失分在主评估之后的**冗余/重复批判审计**——微工具（esc/fmtDt）十余份、元数据（类型/阶段）三写、清单（场景/链路）双维护 |
| 插件化 | 71 / 100 | 注册表单一源做得干净；短在「能力化」多为装饰性转发、tab id 散落导航侧、manifest 消费端手写 blockId、声明的防漂移测试未落地 |
| 开源化 | 66 / 100 | 本维度按「可复用/可移植性」评估（非对外发布合规）——LICENSE/env 外置/文档就位；缺口=server 登录不验密、18 个明文 123456、无 .env.example 与贡献说明 |
| **综合** | **≈ 69 / 100** | 最贵的问题不是缺新架构，而是**已存在的重复实现清单**——统一扎口的方向正确，但扎口面只覆盖了组件平铺层，未覆盖工具/元数据/清单层 |

> 注 1：上表为 2026-09-03 书记第二轮问询后的**批判性复评**（首评 80/72/74≈75 见 §三）。复评不推翻既有 P0~P2 结论，§七 的冗余审计与去重队列为新增最高优先输入。
> 注 2（书记 2026-09-03 口径修正）：本仓库是支部自己的内部系统，**.ctx 日志与 references/历史会议材料均为内部资产、保留上传**，不存在"出仓脱敏"需求；§7.1 R12 与 §7.2 P1b 中的出仓子项（脱敏/移出/账号外置/.ctx ignore）**全部撤销**。真正保留的工程项仅是「运行安全」：server 登录不校验密码在多人/计算中心部署时任何人可凭 personId 冒名登录。

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
- L3 block manifest（块的 inputs 声明、事件、校验）未定义 → 拖拽工作流模块（根 README 总目标）的代码前提未立。

### 3.3 开源化 —— 74/100

得分项：
- 全程中文可读设计/规范文档；design（content）与 spec 职责已纠偏。
- 代码带 role 标注与设计源链接；测试覆盖厚（116 模块加载 + 多组 E2E）。
- 根 README 已收录「工作流模块化」总目标（L1→L5 愿景）。

失分项（列入修复线）：
- mock 数据内嵌示例姓名/账号；dev 登录卡直连 mock → 需"示例数据外置"才可他人部署。
- 无 LICENSE / CONTRIBUTING / 发布（release）工作流。
- `?v=` 软版本利于日常整体失效，但非语义化版本发布。

---

## 四、行动优先级（书记据此裁决开发顺序）

| 优先级 | 行动 | 现状 | 验收标准 |
|--------|------|------|---------|
| P0 | 统一扎口推广：以 forms.js 为样板，为徽章/状态、数据视图等高频组件域逐一建库出口，全站收口 | forms.js、badges.js、reporting.js 三库完成（组件平铺层同域多文件已收敛） | 每建一库跑 module-load + E2E；仓库无该域直连残留 |
| P0 | 数据域自动接线：tab/能力声明依赖的 service + mock 整体可替换 | **收官**：person 域/formatter/PEOPLE/机构/登录四批收口完成——UI 层 mock 直连清零，种子仅存 services/core 数据层 | 新增 demo 分支或后端接入时 UI 零改动（data-adapter 双实现全量走通） |
| P1 | 开源合规包：LICENSE、示例账号外置 env、部署/贡献说明 | 未开工 | 新机器按 README 可独立跑通并自建数据 |
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

| 项 | 动作 | 验收标准 |
|----|------|---------|
| P0a | R1 微工具建库：HTML 转义/日期格式化收敛到唯一工具出口，10 处本地 `esc` 改 import | grep 本地 `function esc` 归零；module-load 全绿 |
| P0b | R2/R3 元数据单一源：MEETING_TYPES、MANDATORY_ACTIVITY_TYPES、gallery 色名、write-tab 4 id、calendar blockId 全部改为引用 constants/manifests | 全仓该 4 id/类型名无第二份字面量；写路径零行为变化 |
| P0c | R5 防漂移测试落地：新增测试断言 FLOW_LINKS 键集 == function-catalog flow id 键集（落实 mermaid-sources.js:30 注释承诺） | 测试进 server/test 且绿 |
| P1a | R7/R8 跨层：config 净化与表决枚举改为 server 单向权威 or 前端生成 → 注释互链 + 键集测试 | 两端字段集合由测试断言一致 |
| P1b | R12 运行安全（口径修正后唯一保留项）：server 登录加密码校验（可开关，缺省演示态兼容）——多人/计算中心部署时防凭 personId 冒名 | 新 clone 部署后无 personId 直取 token 路径；demo 态开关显式 |
| P2 | R4/R6/R9 结构性统一：场景目录、tab id、角色集合向单一源收敛（可随 L4 拖拽编排一并做） | 随 L3/L4 推进时验收 |

> **执行状态（2026-09-03）**
> - P0a ✅：`esc` 本地实现 10 处 + `fmtDt` 2 处全部收口到 `core/utils.js` 新增 `escHtml/fmtDt` 唯一出口（各文件 import 别名 `esc`，调用面零改动）。
> - P0b ✅（部分）：`MEETING_TYPES` → `ACTIVITY_CLASSIFICATION['three-meetings'].subtypes` 引用；write-tab 产出块 4-id 字面量（2 处）→ `OUTPUT_BLOCK_DEFS` 派生；calendar-tab `THEME_DAY_BLOCK_ID` → `THEME_PARTY_DAY_MANIFEST.blockId` 派生。
> - **复核保留（防行为漂移）**：①TYPE_META/STATUS_META 支部侧（"待党委批复"+desc）与党委侧（"待批复"）文案不同，属双视角差异，暂不合并；②makeup `MANDATORY_ACTIVITY_TYPES`（刚性考勤子集+主题党日）与 gallery 色名，业务语义 ≠ 三会子类清单，不并入 subtypes。
> - P0c ✅：新增 `server/test/flow-catalog-sync.test.mjs`——FLOW_LINKS 键集与 function-catalog flow id 键集**双向断言**（任一侧增删即红）；纯 node 文本求值，沙箱内跑绿。
> - P1a ✅：R7 新增共享纯模块 `docs/src/core/config-clean.js`（cleanIdList/sanitizeConfigModules/sanitizeConfigBlocks，server 严格口径为单向权威），前端 `branch.js` 与 server `resources.js /branches/:id/config` 同源引用，两处本地净化实现删除；R8 `OPTION_ENUMS` 从 committee.js 导出 + 新增 `test/vote-option-sync.test.mjs` 键集双向断言。纯 node 回归：module-config / module-config-validate / workflow-block-config（HTTP config 写路径）/ agenda-votes / output-block-policy / function-map-sync / vote-option-sync 全绿（28 测试 25 过，3 失败均为沙箱 Playwright EPERM）。
> - P1b ✅：server `/login` 默认口令校验（env `LOGIN_PASSWORD` 缺省 '123456' 可换；`DISABLE_PASSWORD_CHECK=1` 逃逸门）；前端 AuthStore.login 与登录页传递密码；`npm test` 系列脚本统一置逃逸门保测试零回归；新增 `test/auth-password.test.mjs` 覆盖默认开/错口令/放行/逃逸门/换口令 5 态。纯 node 回归 24/24 绿（含 agenda-votes/module-config/workflow-block-config）。
> - P2a ✅（R6 首步）：新增 `docs/src/core/tab-nav.js`（resolveInitialTab/resolveTargetTab 纯决策，零依赖双端可加载），`components/tab-bar.js` 初始激活与目标激活接入守卫——defaultTab/记忆/priority 或 URL 导航落点命中被支部隐藏的 tab 时回退首个可见 tab 并 `console.warn`，杜绝静默白屏；`test/tab-nav.test.mjs` 4 态绿（与 capability-registry 共 16/16 绿）。注：branch-module-catalog.test.mjs 依赖浏览器能力注册，沙箱不可用（既有限制非本项回归）。
> - P2b ✅（R4 首步）：写活动场景选择清单收敛单一源——constants.js 新增 `SCENARIO_WRITE_IDS/SCENARIO_LABELS`（中文名派生自 `ACTIVITY_CLASSIFICATION['three-meetings'].subtypes` 权威序列），decision-tree secretary L1Sub 与 calendar-tab WRITE_TEMPLATES 三会 subtypes 改为派生引用（手写清单删除，渲染色/正交维度等本地属性保留）；`test/scene-write-sync.test.mjs` 3 断言绿（键集=平铺 id、四子会中文名逐序一致、写入 id ⊆ SCENARIO_TO_CATEGORY）。注：SCENARIO_TO_CATEGORY 为模块私有常量，测试文本求值。
> - P2c ✅（R9 收口，队列 8/8 完成）：授权语义角色集单一源——constants.js 新增 `BRANCH_COMMISSION_ROLES/SECRETARY_ROLES/PARTY_STAFF_ROLE/COMMITTEE_IDS`（与业务语义「条条三委员 COMMISSIONER_ROLES」明确区分）；前端 services/auth.js 与 server routes/auth/member/committee/resources 五处本地手写角色集/名单全部改为派生引用。`test/roles-sync.test.mjs` 4 断言绿（角色 ∈ ROLE_KEYS、授权/条条语义不混淆、名单=5 人、文本扫描特征串仅存 constants.js）。纯 node 回归 33/33 绿（含鉴权相关 agenda-votes/module-config/workflow-block-config/auth-password）。
> - 验证：13 个改动文件 GetDiagnostics 零错误；E2E 需在非沙箱终端补跑（`cd server && npm test`）。
