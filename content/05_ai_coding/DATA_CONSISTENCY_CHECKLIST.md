---
title: "数据同源一致性校验手册"
type: governance
role: "[工程师]+[AI]"
last_updated: "2026-09-14"
status: active
related_files: [DATA_MODEL.md, content/03_doc_system/ARCHITECTURE.md, CLAUDE.md]
---

# 数据同源一致性校验手册

> **2026-09-04 迁入**：原 content/04_web_design/evolution/CHECKLIST.md（AI 方法论归 05）；属 05 测试验证纪律域。**配套手册：被「TEST_AND_VERIFICATION.md」『数据同源一致性校验』节引用**。

> **定位：** 本文档供支部成员与 AI 协作使用，是工程质检流程。按数据类别逐步检查：**如果在某处看到了某数据，可以预期在其他地方看到同源的数据。**
> 原话（2026-05-23）："按操作步骤逐步检查——如果在某处看到了某数据，可以预期在其他地方看到同源的数据。"

---

## 使用说明

> 本手册按数据类别组织，每种数据列出存储源、展示页面、同源校验点。
> 校验方式：打开任意校验点涉及的页面，确认数据一致。

---

## 0. 数据一致性评议 · 两层法（2026-09-13 支书裁定推广）

> **支书原话（2026-09-13）**：「结构+数据 双层断言！我觉得这次做的数据一致性评议很重要！我们要推广开来！」
> **适用范围**：任何实体（人 / 活动 / 记录 / 文件 …）的同源一致性评议——本次范本见 §1「跨表一致性（自动化守卫）」与 `server/test/person-consistency.test.mjs`。

**为何两层**

- 只有**数据层**断言 → 新代码可绕开单源：今天对了，明天新写的模块又自造一份口径。
- 只有**结构层**断言 → 数据本身可能已经不一致：口径只有一处，但那处的数据错了，或别的域的快照已经失同步。
- **两层都要**：结构层守住「口径只有一处实现」，数据层守住「同一实体的同一字段在各域取值一致」。

**结构层（静态扫描断言「口径只有一处实现」）**

- [ ] 禁止**模块加载期人员快照**：`const X = PersonStore.getMembers();` 这类模块顶层一次性捕获一律改为 `liveMembers()`（实时视图，只读；写入走 `PersonStore` 写口）
- [ ] 禁止**凭姓名认身份**：`.find(p => p.name === …)` 不得用作身份判定；姓名匹配只允许「**先按 id、姓名仅唯一命中才采纳**」，否则留空
- [ ] 禁止**手写已成单一源的判据**：如活动存储态不得再写 `status==='completed' || archived`，一律走 `core/constants.js::isActivityEnded / isActivityArchived / isActivityNotStarted / isActivityLive`
- [ ] 禁止**把控件档位高度交给环境**（2026-09-14 批次 31）：高度须由 `docs/src/styles.css` 的「上下内边距 + **显式行高** + 边框」算式决定（紧凑 `8+8+16+2 = 34px`、标准 `12+12+16+2 = 42px`）；靠 UA 默认或 Tailwind CDN 的 `text-*` 工具类提供行高时，环境一变同表单内会出现 42 / 43 / 47 三值并存。**同理：量尺规类真机复核必须在生产同构环境**（Tailwind / 字体 CDN 一律不得 abort——缺 preflight 会让行高退化，量出的尺寸全是伪证；本批曾据此误报「27 处 32px」，后经生产同构复测证伪）

**数据层（以权威源为基准逐域断言）**

- [ ] 同一实体的同一字段在各域取值一致；本次范本＝`server/test/person-consistency.test.mjs`：
  - D1 引用存在性——各域引用的 `personId` 均存在于权威人员源
  - D2 姓名快照一致——各域冗余字段 `personName` 与权威源姓名一致
  - D3 档案字段快照一致——各域冗余的档案字段与权威档案值一致
  - D4 同域双字段自洽——同一域内两字段指向同一实体时相互一致
  - D5 唯一档案 + 账号可解析——每个在册人唯一档案且可由登录账号解析

**推广方法（可套用到活动 / 记录 / 文件等任意实体）**

1. **定权威源**：该实体字段的唯一权威出处（人员＝PersonStore；活动＝activities 域；…）
2. **枚举所有引用该实体的域与字段路径**：逐域列出冗余快照字段与引用字段
3. **写四类断言**：引用存在性 + 快照一致性 + 同域自洽 + 唯一性
4. **写结构层静态扫描**：把「口径只有一处实现」固化为断言，防新代码回潮
5. **实测暴露的问题一律根治**（改单一源）而非打补丁——补丁只会留下第二处实现

> **第二范本（2026-09-13 批次 22 新增）**：`server/test/id-uniqueness.test.mjs`——实体 id 唯一性的两层法（结构层禁令扫描 + 数据层集合内/跨集合唯一性断言），与首个范本 `server/test/person-consistency.test.mjs` 并列。**推广路径（从个案到全站）**：同一缺陷形态可先用**一个实例**暴露（`thought-report.js` 的 `'tr_' + Date.now()` 同毫秒连提两篇撞 id），再**推广为全站扫描 + 守卫**（全仓 `Date.now()` 命中分四级台账 → 20 文件 38 处迁移 → 结构/数据两层断言防回潮）。

> **第三范本（2026-09-13 批次 23 新增）**：`server/test/notice-audience.test.mjs`——通知受众口径分裂的两层法（发布侧写入值与消费侧判定同源 + 取数口与可见性门分离），是「**同一类缺陷（口径分裂）在第二处实体的复现**」（前有活动生命周期展示态、人员字段，这里是通知受众）。

> **第四范本（2026-09-14 批次 24 新增）**：`RESIDENCE` 枚举「两份同值定义」收敛（`services/roster.js` & `services/org-base-data-preview.js` → `core/constants.js` 单一源），守卫落 `person-consistency.test.mjs` **S4**。要点三条：① **定义点放在依赖图的叶子**（无 import 的模块）——原先「为避免循环依赖只能两处维护」的说法，本质是把枚举放在了依赖图的中间层（`person → preview → roster` 成环），移到叶子即消解；② 原定义点**不保留 re-export 兼容层**（两条 import 路径＝隐性两源）；③ 守卫必须两层——旧的「两份同值断言」在单一源下**恒真＝假绿**，须替换为数据层**取值契约断言** + 结构层**唯一性静态扫描**（全仓只允许一处 `export const X =`，并断言原定义点仍在 import 它）。

> **第五范本（2026-09-14 批次 24 新增·非实体类一致性）**：**版本戳（缓存键）同值**——同一模块被多处 import 时若 `?v=` 不一致，浏览器会按 URL **分裂出第二个模块实例**（注册表/共享状态读空）。守卫＝`docs/scripts/bump-version.mjs` 的**收尾自检**：改写后扫描全仓 `?v=`，报告与本版本不一致的残留（**要守的是「改完有无陈旧残留」，不是「本次改了几个」**）；自检须与改写**同源跳过注释行**（注释里的版本号是人工注记、不是缓存键），且 stamper 须覆盖全部动态导入形态（含**模板字符串** `` import(`…/${stem}-workspace.js?v=…`) ``）。**推广**：凡「同一 URL/键必须在全站同值」的口径（版本戳、资源戳、CSS `url()` 资源），都适用于「生成 → 自检残留」这一对动作。

> **第六范本（2026-09-14 批次 25–35 新增·「能力散落在调用点」类）**：**分页 / 矩阵 / 版本号推导**三项都不是「同一事实抄了几份」，而是**同一能力在调用点各写一遍**——分页散落 5 处而**统一检索引擎自身没有分页**（其承载的 28 处表无分页）；人×项目矩阵三处各自实现（考勤矩阵 / 考察人视图 / 表决 `.vs-matrix`）；版本号推导内联在发版脚本里且无参运行会把同日戳往回写。**判据**：凡「可能无限增长」的能力（分页 / 虚拟滚动 / 排序 / 转置矩阵 / 版本号推导）**一律做在引擎层或组件层并由守卫锁住**，调用点不得私自关掉（守卫扫全站 `pageSize: 0` 为零）。**落点**：`components/list-filter.js`（引擎内置分页）、`components/relation-matrix.js`（互为转置双视图 + 项目维列上限 + 一键展开）、`docs/scripts/version-next.mjs`（纯函数）。**守卫**：`filter-row.test.mjs::S10`、`relation-matrix.test.mjs` S1–S4、`version-stamp.test.mjs` S1–S3+D1–D6。

> **第七范本（2026-09-14 批次 31/33 新增·「口径寄生环境」类）**：控件档位高度看似「写着 34px / 42px」，实际渲染高度由 `内边距 + 行高 + 边框` 算出，而**行高一项原先没在任何单一源里显式声明**——靠 UA 默认与 Tailwind CDN 的 `text-*` 工具类供给；结果同一表单实测出 **42 / 43 / 47 三值并存**（增强下拉触发器 43、无 text 类的裸输入框 47）。**判据**：凡「由多个属性合成出来的量」（高度 / 间距 / 字号），**每个参与合成的项都必须在单一源里显式声明**；不得由环境（UA 默认、CDN 工具类、继承）供给。**附带纪律（量测侧）**：**尺规类真机复核必须在生产同构环境**——Tailwind / 字体 CDN 一律不得 abort，否则缺 preflight 会让行高退化，量出的尺寸全是**伪证**（本批首跑据此误报「27 处 32px」，同构复测证伪后如实更正）。**守卫**：`filter-row.test.mjs::D1 / D2`（按算式核算五处载体高度；缺行高声明即红，并含对旧版样式的**病灶复现**）。

> **第八范本（2026-09-14 批次 32 新增·「状态与载体失配」类）**：多选人员时选中集与触发器徽标**即时**变化（用户据此认为已选好），但 `onSelect` 回调只在点「确认选择」时触发；而逐人填写框**依赖该回调渲染** → 提交时报「请填写 X 的考察内容」而**框从未出现**。修法：**点选即回调 + 关面板再回调**，调用方**重建前保态**（改选不清空已填内容）。**衍生纪律**：**「销毁」路径必须先摘回调再触发副作用**——`destroy()` 内关面板会回调，而「回调 → 调用方重渲染 → 再销毁」成环（本批致一个用例由 11 秒劣化为 17.6 分钟超时）。**判据**：凡「输入载体由回调渲染、而提交校验读另一处状态」的组合，都要问「两者会不会不同步」；凡「回调里重渲染、重渲染里销毁」的组合，都要防环。**守卫**：`inspection-loop-e2e.test.mjs`（真机闭环：关面板即有填写框 + 改选不丢内容 + 提交落库）、`ux-guard.test.mjs::⑦`。

> **第九范本（2026-09-14 批次 29/16 新增·「绕过守卫的等价写法」类）**：守卫先按**字面**判（禁组名字面量数组），随后出现三类**语义等价**的绕过——模块加载期把派生结果物化成快照（`const X = [...new Set(PEOPLE.map(...))]`，展开 Proxy 即冻结）、运行时用**种子枚举**代跑活清单、下拉选项用 `option` 直接插值**人名变量**。**判据**：守卫判据要按**语义**写而非按字面写；每加一条字面禁令，都要追问「它想表达的语义是什么、还有哪些写法能绕过」，并把守卫改为按语义判（本批 S9 首版按「文件里既有 `<select>` 又有人源」判，实测 8 处假阳性 → 改为「逐行看 `<option>` 是否插值人名变量」）。**守卫**：`party-group.test.mjs` S1–S4、`filter-row.test.mjs::S9`（含白名单防僵尸）。

> **第十范本（2026-09-14 批次 30 新增·「为修一个 bug 复制一份实现」类）**：同一业务动作（流入登记建档）因**入口不同**而角色门不同（名册新增＝组织委员专属；成员流动登记＝组织委员 + 支书/副支书），直接放宽门会破坏另一条既有断言，而「再写一份实现」会留下两套口径。**修法**：**同一实现体、两个写门**——处理体抽为具名函数，分别挂不同 `requireRole`。**判据**：凡「同一动作 + 不同入口 + 不同门」的组合，先问「能不能同一个实现体挂多门」，再考虑拆实现；拆实现须在规范里显式声明两处语义与同步责任（本批落 `SYSTEM_ROLE_PERMISSION §9i 注④` 与 `DATA_FLOW §4.5.1`）。**守卫**：`member-flow.test.mjs::S4`、`permission-gate.test.mjs` ⑤d/⑥/⑦、`member-persist.test.mjs` api ⑫。

---

## 0.1 AI 自查问句（每批任务开始前扫一遍；命中即先问支书再动手）

> **用法（2026-09-14 支书指令）**：「这些经验是要推广开，**让 AI 以此为案例发现新问题来继续询问我的**」。故把上列范本压成**可复述的问句**——AI 每次接到「改表格 / 改控件 / 改数据 / 加能力」的任务时，先自问以下十句；**只要有一句的答案是「不清楚」或「大概吧」，就必须用 AskUserQuestion 问支书，不得自行决断**（本仓已有代价：批次 31 因环境伪证误报缺陷、批次 33 因没问清「统一所指」而反复返工）。

1. **口径唯一性**——这个数/这份清单，全站有几处在算？我要新增的是第几处？（→ 单一源）
2. **能力归属**——我要加的是「一处能力」还是「一处调用点」？它该在引擎层还是各页各写？（→ 引擎化）
3. **合成量的构成项**——这个尺寸/间距由哪几项合成？每一项都在单一源里显式声明了吗？还是靠 UA / CDN / 继承供给？（→ 算式显式）
4. **量测环境**——我的量测是否跑在与生产同构的环境里（CDN / 字体 / 权限门）？量出的数是**事实**还是**伪证**？
5. **状态与载体**——界面显示的状态（徽标/计数）与承载输入的载体，是否由**同一次变化**驱动？会不会「看着已选好、其实没渲染」？
6. **销毁与回调**——这条路径上有没有「回调里重渲染、重渲染里销毁」？销毁前摘回调了吗？
7. **守卫的语义**——我要加的守卫是按**字面**判还是按**语义**判？有哪些等价写法能绕过它？有没有白名单僵尸风险？
8. **多门同一动作**——这是不是「同一动作、不同入口、不同门」？能不能同一实现体挂多门，而不是再写一份？
9. **规范 vs 实现**——规范里这句话，写的时候想表达什么语义？现在全站有哪几处与它不一致？是**实现错**还是**规范写太宽**？（→ 前者改实现，后者改写规范并登记例外）
10. **无限增长**——这个列表/矩阵/列/页会不会随年份无限长？分页或封顶了吗？（→ 分页铁律 / 列上限）

---

## 1. 人员数据

**存储**：`docs/src/mock/people.js` → `PEOPLE` 常量（50 条记录，p1~p50）
**运行时**：`mockDB.users`（由 `docs/src/mock/people.js` PEOPLE 经 `seed.js` 注入）
**登录映射**：`docs/src/mock/accounts.js` → `MOCK_ACCOUNTS`（17 条，studentId ↔ personId）

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| index.html | 首页日历中的组织者信息 | 全部 |
| workspace/secretary.html | 赋权管理 tab：常设赋权（设组长）+项目赋权（organizer/deep）；人员选择器、统计卡片 | 支书 |
| workspace/org.html | 人员选择器、发展党员追踪 | 组织委员 |
| workspace/prop.html | 宣传任务关联人员 | 宣传委员 |
| workspace/disc.html | 考勤/考察/补课涉及人员 | 纪检委员 |
| workspace/leader.html | 人员选择器、党小组成员 | 党小组组长 |
| workspace/visitor.html | 只读人员信息 | 访客 |
| login.html | 学号+密码登录 | 全部 |

**同源校验点**：

- [ ] 支书工作台赋权管理 tab 中被赋权人候选列表对应 PEOPLE 中非支委成员
- [ ] 各工作台人员选择器中的列表对应 PEOPLE 全部成员（PersonPicker 默认可注入 filter；特定场景由调用方传过滤，如发展党员候选为非正式党员、支书赋权被赋权人为非支委）
- [ ] 人员发展阶段在各页面中一致（正式党员/预备党员/发展对象/积极分子），与 people.js 定义相同
- [ ] 登录页输入 accounts.js 中的学号+密码 → 成功登录后跳转首页，首页顶栏展示对应角色工作台入口（login-entry.js 登录后跳 index.html；main-entry.js 按角色改写 workspace 链接）
- [ ] 支书工作台赋权管理 tab 中常设角色标签（支书/支委/组长）对应 PEOPLE 中 role 字段 + AuthStore 赋权记录
- [ ] 发展党员追踪候选人（由 PEOPLE 中 developStage 非'正式党员' 的成员动态派生）的 stage 与 developStage 一致

**跨表一致性（自动化守卫）**（`server/test/person-consistency.test.mjs`，2026-09-13 批次 21 新增，7/7 通过）：

- [ ] **S1 结构层**：禁止模块加载期人员快照——模块顶层 `const X = PersonStore.getMembers()` 一律改 `liveMembers()` 实时视图
- [ ] **S2 结构层**：禁止凭姓名认身份——`.find(p => p.name === …)` 不得作身份判据，须「先按 id、姓名仅唯一命中才采纳」
- [ ] **S3 结构层**：禁止手写已成单一源的活动存储态判据——一律走 `core/constants.js` 的 `isActivityEnded / isActivityArchived / isActivityNotStarted / isActivityLive`
- [ ] **D1 数据层**：引用存在性——各域引用的 `personId` 均存在于权威人员源
- [ ] **D2 数据层**：姓名快照一致——各域冗余 `personName` 与权威源姓名一致
- [ ] **D3 数据层**：档案字段快照一致——各域冗余档案字段与权威档案值一致
- [ ] **D4 数据层**：同域双字段自洽——同一域内两字段指向同一实体时相互一致
- [ ] **D5 数据层**：唯一档案 + 账号可解析——每个在册人唯一档案且可由登录账号解析

---

## 2. 活动数据

**存储**：`docs/src/mock/activities.js` → `ACTIVITIES` 常量（29 条记录，act-1~act-30（act-28 已删除））
**运行时**：`mockDB.activities`（由 `seed.js` 注入）
**Service**：`docs/src/services/activity.js`

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| index.html | 首页日历标记+活动列表+招募区 | 全部 |
| workspace/secretary.html | 决策树活动写入+统计卡片+日历 | 支书 |
| workspace/org.html | 专班管理+活动列表 | 组织委员 |
| workspace/prop.html | 活动/专班看板 | 宣传委员 |
| workspace/disc.html | 考勤关联活动 | 纪检委员 |
| workspace/leader.html | 决策树活动写入+日历 | 党小组组长 |
| workspace/visitor.html | 只读活动查询 | 访客 |
| help.html | 权限体系说明（谁可创建活动） | 全部 |

**同源校验点**：

- [ ] 首页日历/列表中的活动数量 = ACTIVITIES 中未归档的记录数（仅过滤 archived；已取消活动如 act-20 仍显示并带「已取消」徽章，成员可感知取消事实）
- [ ] 支书工作台全局概况「活动与专班进度」= 未归档活动数（activeActivities）+ 进行中/招募中专班数（activeTaskforces）+ 待赋权活动数（pendingAuth，bottom-up 且 assignments 无 organizer）+ 复盘问题数（reviewIssues，活跃活动复盘 issues 总条数）
- [ ] 首页统计卡「本月活动」= 未归档且日期属本月（main-entry `_renderStats`，与支书概况口径同源）
- [ ] 活动状态在各页面中一致：draft/published/ongoing/completed/cancelled
- [ ] 品牌活动在日历/看板中标有品牌标记（isBrand=true 的活动；isBrand 为属性标签，无独立计数统计）
- [ ] 活动的 organizer 字段（如 p3=王五）在首页和各工作台中一致
- [ ] help.html 中"创建活动仅限党支书和党小组组长"= auth.js ROLE_PERMISSIONS 中的 create_activity 权限

---

## 3. 专班数据

**存储**：`docs/src/mock/taskforces.js` → `MOCK_TASKFORCES` 常量（8 条记录，tf-001~tf-008）
**运行时**：`mockDB.taskforces`（由 `seed.js` 注入）
**Service**：`docs/src/services/taskforce.js` → `TaskForceRecordStore`

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| index.html | 首页招募区（recruiting 状态专班） | 全部 |
| workspace/secretary.html | 专班总览+赋权管理 tab（专班成员赋权记录） | 支书 |
| workspace/org.html | 专班看板（待启动/进行中/已完成）+发布招募 | 组织委员 |
| workspace/prop.html | 专班看板 | 宣传委员 |
| workspace/disc.html | 专班考察记录 | 纪检委员 |
| workspace/visitor.html | 只读专班信息 | 访客 |

**同源校验点**：

- [ ] 首页招募区的专班 = MOCK_TASKFORCES 中 status='recruiting' 的记录（tf-005/tf-006）
- [ ] 组织委员看板中的专班分类与 MOCK_TASKFORCES 的 status 字段一致
- [ ] 专班成员 personId 在 PEOPLE 中存在
- [ ] 已解散专班（tf-008 status='dissolved'）在各工作台不显示为活跃专班
- [ ] 首页通知"五四主题党日筹备专班已组建"→ 组织委员看板可见 tf-003（completed）

---

## 4. 考勤数据

**存储**：`docs/src/mock/attendance.js` → `ATTENDANCE_RECORDS` 常量（151 条记录，att1~att151；att1~att43 为显式种子段，att44 起由 8 月活动生成器追加）
**运行时**：`mockDB.attendances`（由 `seed.js` 注入）
**Service**：`docs/src/services/attendance.js`

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| workspace/disc.html | 考勤总表（宽格式/长格式切换）+考勤确认 | 纪检委员 |
| workspace/leader.html | 考勤上传（党小组组长） | 党小组组长 |
| workspace/visitor.html | 只读考勤视图 | 访客 |

**同源校验点**：

- [ ] 纪检委员考勤总表中某活动的出勤人数 = ATTENDANCE_RECORDS 中该 activityId 且 status=present 的记录数
- [ ] 考勤记录的 personId 在 PEOPLE 中存在
- [ ] 考勤记录的 activityId 在 ACTIVITIES 中存在
- [ ] 已补课考勤记录（status='made_up'）= 补课任务中 status='completed' 的记录对应（att27/att14 已完成补课）
- [ ] 组织生活会（act-19）考勤记录含 studentId/developStage/partyGroup 字段
- [ ] 缺勤考勤记录中 overdue=true 的（att10/att33）应在补课任务中有对应 pending 项

---

## 5. 考察数据

**存储**：`docs/src/mock/inspection.js` → `INSPECTION_RECORDS` 常量（42 条记录，insp-1~insp-43（insp-17 已删除））
**运行时**：`mockDB.inspections`（由 `seed.js` 注入）
**Service**：`docs/src/services/inspection.js`

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| workspace/disc.html | 考察档案（以人为中心/按来源分组） | 纪检委员 |
| workspace/leader.html | 考察上传 | 党小组组长 |

**同源校验点**：

- [ ] 考察记录的 personId 在 PEOPLE 中存在
- [ ] 活动考察记录（sourceType='activity'）的 activityId 在 ACTIVITIES 中存在
- [ ] 专班考察记录（sourceType='taskforce'）的 sourceName 在 MOCK_TASKFORCES 中有对应名称
- [ ] 考察层级（organize/deep）= 活动的 assignments 中对应人员角色
- [ ] 参与过活动/专班（assignments 中 role=organizer/deep）的人员**应有**对应考察记录——业务期望，考察为组长/组织委员手工上传，数量依赖录入行为，非自动从 assignments 派生（B4-2 修正 2026-08-24）
- [ ] 考察记录字段语义（P1-5 固化）：考察内容入 `content` 字段，`role` 存角色职责标签，禁止把内容文本塞进 role
- [ ] 组长/组织委员录入的考察子记录同步写入正式考察库（P0-2 固化），同一数据仅一套正式存储

---

## 6. 通知数据

**存储**：`docs/src/mock/notices.js` → `MOCK_NOTICES` 常量（12 条记录，notice-101~notice-108 + notice-110 + notice-001/notice-005/notice-011）
**运行时**：`mockDB.notices`（由 `seed.js` 注入）
**Service**：`docs/src/services/notice.js` → `NoticeStore`

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| index.html | 通知铃铛+通知列表 | 全部 |
| notice.html | 通知详情页（含通知者/被通知者/时间） | 全部 |
| 各工作台 | 通知→待办派生（[DATA_MODEL.md](../04_web_design/data/DATA_MODEL.md) §2.19 机制） | 各角色 |

**同源校验点**：

- [ ] 首页通知铃铛未读数 = MOCK_NOTICES 中 read=false 且未过期的记录数
- [ ] 紧急通知（priority='urgent'）在首页标红显示
- [ ] 已过期通知（expireDate < 当前日期）不在首页通知列表中显示
- [ ] 通知详情页内容 = MOCK_NOTICES 中对应 id 的完整数据
- [ ] 通知 targetModule 与实际页面对应：activity→活动相关、party→发展党员、workspace→工作台、attendance→考勤

---

## 7. 待办数据

**存储**：`mockDB.todos`（运行时由 NoticeTodoDeriver/LifecycleTodoDeriver 派生）
**Service**：`docs/src/services/todo.js` → `TodoStore` + `NoticeTodoDeriver` + `LifecycleTodoDeriver`

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| workspace/secretary.html | 待办 tab（双栏布局：分类+列表） | 支书 |
| workspace/org.html | 待办 tab | 组织委员 |
| workspace/prop.html | 待办 tab | 宣传委员 |
| workspace/disc.html | 待办 tab | 纪检委员 |
| workspace/leader.html | 待办 tab | 党小组组长 |
| workspace/visitor.html | 待办 tab（只读） | 访客 |

**同源校验点**：

- [ ] 通知类待办（TodoCategory.NOTICE）= actionable=true 且 actionRoles 非空的通知，为每个角色派生一条（NoticeTodoDeriver，字段驱动而非关键词判断）
- [ ] 审核类待办（TodoCategory.REVIEW）= 待审核的考勤/考察/复盘记录派生
- [ ] 赋权类待办（TodoCategory.AUTH）= 活动创建→组长赋权待办（LifecycleTodoDeriver.deriveFromActivityCreate）+ 专班创建→组织委员赋权待办（deriveFromTaskforceCreate）+ 支书待赋权活动派生
- [ ] 各角色工作台的待办列表仅含与该角色相关的待办
- [ ] 待办状态流转：pending → in_progress → completed（或 expired）
- [ ] 支书待办 8 组动态聚合（SecretaryTodoDeriver.computeAggregates）：4 提醒类（考勤>3天未录入/考察超期/复盘>7天未提交/归档材料缺失）+ 4 复核类（考勤/考察/复盘/归档 secretaryConfirmedAt 为空），空组不展示

---

## 8. 赋权数据

**架构（T-190 赋权整合闭环）**：一主源 + 一审计快照 + 双写 + 单读
- **主源**：活动角色 `mockDB.activities[].assignments` / 专班成员 `mockDB.taskforces[].members`（统一英文编码 `organizer`/`deep`）
- **审计快照**：localStorage `sop_org_os_auth_audit`（只增不改；revoke 为追加记录，判定取最新一条）
- **常设赋权**（党小组组长 leader）：AuthStore 赋权链（AUTHORIZE_CHAIN），快照同样记录
- **Service**：`docs/src/services/auth.js` → `AuthStore`（authorize / revokeAuthorization / syncProjectRoles 三合一：写主源 + 追加快照 + 通知）

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| workspace/secretary.html | 赋权管理 tab：常设赋权（设为/取消组长）+项目赋权（organizer/deep） | 支书 |
| workspace/leader.html | 活动详情内联编辑角色（保存走 syncProjectRoles） | 组长 |
| workspace/org.html | 专班详情内联编辑成员角色（保存走 syncProjectRoles） | 组织委员 |

**同源校验点**：

- [ ] 支书工作台赋权管理 tab 的「已赋权记录」= 审计快照 `sop_org_os_auth_audit`
- [ ] 活动/专班项目角色（organizer/deep）主源 = `activity.assignments` / `taskforce.members`，新建数据在主源可查
- [ ] 赋权记录中 targetPersonId 在 PEOPLE 中存在
- [ ] 被赋权角色（organizer/deep/leader）在 auth.js AUTHORIZE_CHAIN 中有赋权链定义
- [ ] 赋权后，被赋权者工作台出现对应角色页面，AuthStore.canDo() 返回 true
- [ ] 撤销/解散专班回收赋权后：主源角色被移除 + 快照追加 revoke，被赋权者恢复为普通参与者
- [ ] 全仓禁止无主源写入点的字段：授权记录上的 `authorizedBy`/`scope` 必须有主源写入点（巡检 P0-1/P0-3 缺口固化）

---

## 9. 反馈数据

**存储**：`docs/data/issues.json`（权威源）+ localStorage `gsm1921-issue-drafts`（个人草稿）
**Service**：`docs/src/services/issues.js` → `IssueStore`（旧 FeedbackStore 已弃用，保留 shim 兼容）

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| feedback.html | GitHub Issue 风格反馈列表+提交表单 | 全部 |
| workspace/secretary.html | 反馈统计（支书专属：状态变更/关闭/隐藏/编辑） | 支书 |

**同源校验点**：

- [ ] feedback.html 的反馈列表 = issues.json 中的记录
- [ ] 支书面板的反馈统计 = IssueStore.countByStatus() 的结果
- [ ] 支书专属权限（关闭 issue/隐藏评论/编辑他人 issue）= auth.js 中的 _ISSUE_PERMS_SECRETARY
- [ ] 旧 FeedbackStore.getAll() 返回数据 = IssueStore 数据的兼容映射

---

## 11. 补课数据

**存储**：`mockDB.makeupTasks`（`core/domain.js` 初始化 `[]`，经 `core/data-adapter.js` 持久化；服务端模式路由 `/api/v1/makeupTasks`）
**运行时**：`mockDB.makeupTasks`
**Service**：`docs/src/services/makeup.js`

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| workspace/disc.html | 补课任务列表+确认补课 | 纪检委员 |
| workspace/leader.html | 补课状态查看 | 党小组组长 |

**同源校验点**：

- [ ] 补课任务的 personId 在 PEOPLE 中存在
- [ ] 补课任务的 activityId 在 ACTIVITIES 中存在
- [ ] 补课任务的 attendanceRecordId 在 ATTENDANCE_RECORDS 中存在且对应记录 status 为 absent 或 leave
- [ ] 纪检「确认完成」补课任务时，按 attendanceRecordId 回写对应考勤记录 status='made_up' + overdue 清除（B3-1 修复 2026-08-24，完成必须对应真实产物）
- [ ] 已完成补课（status='completed'）对应的考勤记录 status='made_up'（att27/att14）
- [ ] 刚性考勤活动类型（支部党员大会/党小组会/党课/主题党日）的补课 isMandatory=true
- [ ] 补课截止日期 = 缺勤日期 +7 天

---

## 12. 复盘数据

**存储**：`docs/src/mock/review.js` → `REVIEW_RECORDS`（11 条活动复盘）+ `TASKFORCE_REVIEW_RECORDS`（2 条专班复盘）
**运行时**：`mockDB.activityReviews` / `mockDB.taskforceReviews`（P1-4 修复后写入 mockDB + persist()，刷新不丢失）
**Service**：`docs/src/services/review.js`

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| workspace/disc.html | 复盘审核（批注/打回/确认） | 纪检委员 |
| workspace/leader.html | 复盘提交 | 党小组组长 |

**同源校验点**：

- [ ] 活动复盘的 activityId 在 ACTIVITIES 中存在
- [ ] 专班复盘的 sourceName 在 MOCK_TASKFORCES 中有对应名称
- [ ] 复盘状态流转覆盖 5 种：未提交→已上传→批注中→已确认/已打回
- [ ] 已打回复盘（rev7 act-7）有 annotation 和 annotatedBy 字段
- [ ] 复盘的 organizerId = 对应活动/专班的 organizer 字段
- [ ] 复盘提交后持久化（P1-4 固化）：刷新页面后记录仍在；支书全局概况按**复盘问题数**（reviewIssues，活跃活动复盘中 issues 数组总条数）统计——2026-08-10 裁定复盘改问题导向，复盘完成率已废弃

---

## 13. 分工数据

**存储**：`docs/src/mock/seed.js` → `SEED_ASSIGNMENTS`（5 条种子数据）
**运行时**：`mockDB.assignments`
**Service**：无独立 Service——分工数据经 `core/data-adapter.js`（adapter.assignments）读写，权限联动 `services/auth.js`（syncProjectRoles）

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| workspace/secretary.html | 分工记录总览 | 支书 |

**同源校验点**：

- [ ] 分工记录的 assigneeId 在 PEOPLE 中存在
- [ ] 分工记录的 activityId 在 ACTIVITIES 中存在
- [ ] 分工状态（pending/in_progress/completed）与 data-adapter.js 的状态流转一致

---

## 14. 图片数据

**存储**：`mockDB.imageRecords`（运行时动态创建）
**Service**：`docs/src/core/data-adapter.js`（imageRecords 聚合）

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| workspace/prop.html | 图片管理（上传/标注/查看） | 宣传委员 |

**同源校验点**：

- [ ] 图片记录的 uploadedBy 在 PEOPLE 中存在
- [ ] 图片关联的 activityId（若有）在 ACTIVITIES 中存在

---

## 15. 文件空间数据

**存储**：`mockDB.fileSpaceRecords`（运行时动态创建）
**Service**：`docs/src/services/mock.js`（通用 CRUD）

**展示页面**：

| 页面 | 展示方式 | 角色 |
|------|---------|------|
| workspace/prop.html | 文件管理（经验沉淀/原始文件/宣传素材） | 宣传委员 |

**同源校验点**：

- [ ] 文件记录的 uploadedBy 在 PEOPLE 中存在
- [ ] 文件分类（experience/raw/publicity）与 category 字段一致

---

## 16. 登录与身份门控（2026-08-24 新增，B1-3）

> 认证与页面门控链路（设计权威源：AUTHENTICATION_MODEL.md §四 登录门控四层）。核心：登录态由 auth.js 单一判定，页面身份校验防错位。

**存储**：`localStorage gsm1921-login-user`（`{personId, role, tabId}`）+ `sessionStorage gsm1921-tab-id` / `gsm1921-session-snap`
**Service**：`docs/src/services/auth.js` → `AuthStore`（login / devLogin / logout / getCurrentUser）；`docs/src/core/bootstrap.js`（门控执行）

**同源校验点**：

- [ ] 已登录用户访问 login.html → 直接跳转首页（login-entry.js L10-13）
- [ ] 账号密码登录成功后 → 跳转首页，首页顶栏展示对应角色工作台入口（ROLE_PAGE_MAP 角色→页面映射）
- [ ] 工作台页面身份校验：用户访问非其身份对应工作台 → 自动跳转身份对应页面（bootstrap.js 登录快照角色页面 + 内存判定角色页面集合）
- [ ] `?dev=ROLE` 绕过仅限本地 hostname（localhost/127.0.0.1/::1）+ 白名单角色，生产环境拒绝（bootstrap.js DEV_HOSTNAME_WHITELIST / DEV_ROLE_WHITELIST）
- [ ] 登录态多标签页防串扰：getCurrentUser() 校验 tabId，tabId 不匹配回退本标签页快照（auth.js + login-snapshot.js 键名硬同步）
- [ ] CODE_VERSION 代码版本自检：旧 tab 持有旧 ES 模块时自动刷新一次加载新模块（cross-page-state.js isStaleCodeVersion + bootstrap.js）

---

## 跨类别同源校验

> 以下校验点涉及多种数据类别之间的关联一致性。

- [ ] 缺勤→补课→考勤联动：缺勤考勤记录（absent/leave）自动生成补课任务→补课完成后考勤状态变 made_up
- [ ] 通知→待办派生：actionable=true 且 actionRoles 非空的通知自动为各角色派生待办（字段驱动；含"确认/提交/审核"等关键词仅旧表述，实际以字段为准）
- [ ] 活动/专班→待办派生：状态变更（新建/到期/超时）自动派生审核类/归档类待办
- [ ] 活动 assignments → 考察记录：assignments 中 role=organizer/deep 的人员**应有**对应考察记录（业务期望，手工录入；非自动派生）
- [ ] 发展党员候选人 stage ↔ people.js developStage：候选人阶段与人员发展阶段一致
- [ ] 专班成员 personId ↔ people.js：专班 members 数组中 personId 在 PEOPLE 中存在
- [ ] 活动写入→日历/统计联动：支书/组长写入活动后，首页日历和统计卡片同步更新
- [ ] 首页统计卡口径（main-entry `_renderStats`）：本月活动=未归档且属本月 / 活跃专班=active+recruiting / 未读通知=activeOnly 且未读 / 个人考勤率=(present+made_up)/total（90/70 阈值三色）
- [ ] 活动生命周期展示态（deriveActivityLifecycleStatus）：草稿→已发布→进行中→已执行/待归档→已归档（+已取消）；全站徽章统一按此展示，不直接读 status 字面值（**单一源位置＝`components/inspector.js` 的 `ACTIVITY_LIFECYCLE` + `deriveActivityLifecycleStatus` + `activityLifecycleBadgeHtml`，2026-09-13 确认唯一**）
- [ ] 活动存储态判据单一源（`isActivityEnded / isActivityArchived / isActivityNotStarted / isActivityLive`，`core/constants.js`）：活动「已结束/已归档/未开始/仍在办」判据全站禁止手写 `status==='completed' || archived`，一律引用该单一源
- [ ] 按人视图口径（SecretaryOverviewStore.getPersonOverview）：4 角色（org/prop/disc/leader，副支书除外）；todoCount=聚合卡 count 求和；在办活动/专班按职责关系投影（manager=统筹/initiator=发起/member=成员）
- [ ] 前端持久化域 ↔ server 表对账（B5-2 2026-08-24）：mockDB 27 个持久化域 + users ↔ server 28 表（`server/db.js` RESOURCE_TABLES）；resources.js 28 个资源名 ↔ 表名 ↔ 前端快照 payload 键名一一映射
- [ ] 快照写穿边界（B5-1/B5-3 2026-08-24）：全量快照（`_buildSnapshotPayload`）覆盖 27 个持久化域，**不含 users 与 branchDocs**；branchDocs 走 per-item CRUD（POST/PATCH/DELETE `/api/v1/branchDocs`）且仅支委可写（COMMISSIONER_WRITE）——**严禁将 branchDocs 加入快照 payload**，否则 references.js 本地缓存与 server 会产生覆盖竞态
  > **2026-09-14 批次 25**：新增 `partyGroups`（党小组）与 `memberFlows`（成员流动台账）两域，两侧同步建表（域数/表数/快照覆盖数各 +2，**不含 users 与 branchDocs** 的排除说明不变）。**上述 27 域 / 28 表 / 快照 27 域为批次 25 的目标态**，落地前以代码实测为准。
  > **2026-09-14 实测差异（待专项对账）**：`server/db.js` 实为 34 表、`resources.js` 实为 30 个资源名、`_buildSnapshotPayload` 实为 25 个键——与「25 域 / 26 表」历史口径存在差异（`issues` 等语义端点域不在资源名映射内、`branches`/`branchDocs` 等按纪律排除）。本行口径的历史差异已登记为待办，勿据旧数照做。
- [ ] 聚合域存储模式（B5 对账 2026-08-24）：actSubRecords/tfSubRecords/mailboxConfig 服务端以「__root__ 单行」存储（`{id:'__root__', body:<原对象>}`），init() 拉取解包、快照写穿包装，round-trip 对称
- [ ] 实体 id 生成单一源（`core/id.js::generateId(prefix, sep)` + `randomHex()`，降级链 `crypto.randomUUID` → `crypto.getRandomValues` → `Math.random` 单一源）：全站实体 id 一律经此生成，禁止 `前缀 + Date.now()`、禁止 `Math.random()` 参与 id；**连字符前缀契约**——`tf-`/`notice-`（及 `cmt-`/`mc-`）必须显式传 `sep='-'`，否则打断 `sourceId.startsWith` 契约
- [ ] 受众写入值与判定同源（`NOTICE_AUDIENCE_SENTINELS`，`core/constants.js`）：发布侧写入的受众标识（sentinel）与消费侧可见性判定**必须取自同一注册表**；**语义维度不止角色**（还可能是发展阶段——`activists`/`candidates`＝入党积极分子/发展对象），勿假设「受众＝角色键」
- [ ] 取数口与可见性门分离：按 id / 主键取数（`getById` 一类）**不得**复用「列表可见性过滤」；可见性判定须有**独立入口**（`canReadNotice`）并在消费点显式调用，否则会出现「详情打不开」与「拆门即泄露」两难
- [ ] 成员档案枚举单一源（`RESIDENCE`，`core/constants.js`，2026-09-14 批次 24 收敛）：在册状态字面量全站**只允许一处定义**，消费点一律 import 该单一源（原 `services/roster.js` 与 `services/org-base-data-preview.js` 各持一份同值副本已撤销）；**断言方式**＝结构层 `person-consistency.test.mjs::S4`（唯一性静态扫描）+ 数据层取值契约；**同类**：`DEVELOP_STAGES`、`SEARCH_FILTER_MIN_ROWS`、`NOTICE_AUDIENCE_SENTINELS` 一律同址单一源
- [ ] 版本戳同值（缓存键一致性）：全站 `?v=<release>` 与本次发布版本**处处一致**——`docs/scripts/bump-version.mjs` 收尾自检须报「陈旧戳 0 处残留」；任一 `?v=` 落后即会让浏览器按 URL 分裂出第二个模块实例（注册表/共享状态读空）。**注意**：注释里的版本号是人工注记、不算缓存键（自检与改写同源跳过注释行）；**模板字符串动态 import**（`` import(`…/${stem}-workspace.js?v=…`) ``）也在覆盖范围内
- [ ] 党小组清单单一源（2026-09-14 收敛，批次 29 加固）：全站「组清单」只允许来自党小组实体（活组取 `status === 'active'` 者、按 `seq` 排序，读口 `services/party-group.js::groupOptions()`）；禁再出现写死组名数组（原三处：支书台赋权管理的组清单、组长建活动承办组选项、演示用户域）；**且须防两类绕过「字面量扫描」的等价病灶**——① 模块加载期**派生快照**（`const X = [...new Set(PEOPLE.map(p => p.partyGroup))]`：展开 `liveMembers()` 的 Proxy 即把实时视图冻结，与 `const PEOPLE = getMembers()` 同病；实测病灶 `components/person-picker.js`）；② 运行时用**种子枚举代跑**（`org-base-data-preview::PARTY_GROUP_OPTIONS` 只属预览种子期口径，运行时一律 `groupOptions()`；实测病灶 `services/branch-roster-import.js` 的导入行净化与按组应到统计、`entries/tabs/visitor/projects-tab.js` 的筛选项）。断言方式＝结构层 `party-group.test.mjs::S4`；「未分组」即 `partyGroup` 为空字符串，禁在各页自造别名判断
- [ ] 账号与成员档案同源（2026-09-14）：账号由学号派生（账号即学号），成员新增/流出与账号建号/停用必须成对发生；禁出现「档案有此人、账号层没有」或反向的孤项
- [ ] 档案「软标记」与撤销同源（2026-09-14 批次 29）：凡以**软标记**表达的状态（`transferOut` 等）都必须有**对称的清除口**，且清除须走**语义端点**——只打标记不清标记，会出现「撤销后账号仍 401 / 读链仍排除该行＝成员实际回不来」（实测病灶：API 形态撤销流出）。**口径**：mock 形态「save 即复活」自动清 `removedIds`，API 形态须 `POST /members/:id/undo-transfer-out`（与打标记端**同角色集** + 同支部 + 幂等 + 不接收字段）；接线选项 `saveMember(record, { restoreFromTransferOut: true })`。断言方式＝`member-persist.test.mjs` api ⑪（含病灶复现）+ `permission-gate.test.mjs` ⑤c + `member-flow.test.mjs` S4
- [ ] 版本戳单一源（2026-09-14 批次 29 常态守卫）：除发版脚本的收尾自检外，**「全站活动版本戳取值集合规模为 1」已升为测试常驻守卫**（`version-stamp.test.mjs::S3`）；发版脚本无参运行须按「读仓库现有戳 → 同日 max 字母 +1」推导，且**只允许前进**（小于现有最大戳即报错退出，防「同日版本号回退」静默通过）
- [ ] 「同一实现体、两个写门」须显式声明（2026-09-14 批次 30）：当同一业务动作因**入口不同而角色门不同**时（如名册新增 `/members` 组织委员专属 vs 成员流动流入 `/members/intake` 组织委员+支书/副支书），须抽同一实现体并分别挂门（`createMemberRow` 挂两次 `requireRole`），**禁用复制粘贴出第二份实现**；且须断言「原门未被放宽」（守卫：`member-flow.test.mjs::S4` 断言 `/members` 仍为 `ORG_COMMISSIONER_ROLES`）
- [ ] 「死代码清理」须先验存量兼容（2026-09-14 批次 29 处置原则）：删任何分支前先查**本地存储持久层能否带出该分支的旧数据**（如 `gsm1921-member-confirmations` 可跨刷新带出旧版 pending）——若该分支是其唯一出口，删除会造成「既处理不掉又持续拦截」的死锁；正确做法＝**真死代码删（无调用方者）、存量兼容留并原地加注**，保留者一处不少

---

# 手动检查清单（浏览器实测）

> 本章收录**电脑自动化检查难以覆盖、需人工浏览器实测**的检查项。按 URL 逐条实测，勾选验证结果。
> 背景：T-235 首页跳转直达（J1/J2/J3/J4）已实施完毕，AI 冒烟验证 4/8 用例 PASS，其余 4 项修复后需人工复核（2026-08-09 搁置浏览器自动化验证，转人工）。

## T-235 首页跳转直达（2026-08-09 追加）

> 检查方式：按角色登录后，直接访问下列带参数 URL，观察是否直达目标 tab + 目标条目高亮 + 高亮约 3 秒后自动褪去。
> 通用预期：① 落在目标 tab（不是默认「待办」）；② URL 参数被消费（地址栏参数消失）；③ 目标条目有蓝色高亮且自动褪去。

| # | 角色 | 访问 URL | 预期行为 | 第2轮冒烟结果 | 第3轮实测（2026-08-24 Playwright） |
|---|------|----------|----------|---------------|---------------|
| 1 | 支书 | `/workspace/secretary.html?activityId=act-15` | 落「活动管理」tab + 月份切到 2026-06 + 详情面板打开 act-15「6月共建」 + 日历条目高亮褪去 | ❌ 修复后待人工复核（原死循环已修） | ✅ PASS（tab/月份/详情/参数消费） |
| 2 | 支书 | `/workspace/secretary.html?taskforceId=tf-001` | 落「知情查看」tab + tf-001 卡片高亮褪去（不得被「待办」内容覆盖）〔2026-09-14 合并为知情查看（活动/专班分段），tab id 仍为 tf-view〕 | ❌ 修复后待人工复核（原懒加载竞态已修） | ✅ PASS（tab/高亮） |
| 3 | 组织委员 | `/workspace/org.html?activityId=act-15` | 落「知情查看」tab（默认「活动」分段）+ 月份切到 2026-06 + 详情面板打开 act-15 + 日历条目高亮褪去〔2026-09-14 原「活动查看」并入知情查看（活动/专班分段），tab id 由 activity-view 改为 tf-view〕 | ❌ 修复后待人工复核（原月份未跟随已修） | ✅ PASS（tab/详情） |
| 4 | 组织委员 | `/workspace/org.html?taskforceId=tf-002` | 落「专班管理」tab + tf-002 卡片高亮 + 详情展开 | ✅ PASS | ✅ PASS（卡片存在+高亮） |
| 5 | 宣传委员 | `/workspace/prop.html?activityId=act-1` | 落「项目看板」tab + act-1 看板卡片高亮褪去 | ✅ PASS | ✅ PASS（卡片高亮） |
| 6 | 纪检委员 | `/workspace/disc.html?taskforceId=tf-001` | 落「知情查看」tab + tf-001 卡片高亮褪去〔2026-09-14 合并为知情查看（活动/专班分段），tab id 仍为 tf-view〕 | ✅ PASS | ✅ PASS（高亮） |
| 7 | 党小组组长 | `/workspace/leader.html?activityId=act-2` | 落「活动管理」tab + act-2 详情展开 + 条目高亮褪去（注：act-1 属 p3 bottom-up，组长不可见属正常权限） | ❌ 修复后待人工复核（原 SignupStore 未导入已修，改用 act-2） | ✅ PASS（条目存在+高亮） |
| 8 | 访客 | `/workspace/visitor.html?activityId=act-1` | 落「活动动态」tab + act-1 条目高亮**自动褪去**（修复"一直亮着"） | ✅ PASS | ✅ PASS（条目存在+高亮+褪去） |

> **2026-08-24 第 3 轮说明（T-280 B1-2/B1-5）**：8 用例 + 附加 4 项全部浏览器实测 PASS（34/34，专项脚本 `server/test/t235-browser-regression.mjs` 已随 2026-08-30 脚本清理归档）。
> 实测中发现并修复 B1-5 缺陷：URL 直达高亮原被 `loadWorkspaceData` 二次 setState 重渲染冲掉（实际可见仅 ~300ms），已按方案 A 修复——
> 各工作台入口导航落点后 3 秒条件抑制当前 tab 重渲染（仅当导航目标已在 DOM 时抑制，目标缺失放行延迟数据补渲染），高亮目标存活至抑制窗口结束，一次性定位改为轮询定位。

### 附加检查项

- [ ] **view=activities 参数**：`/workspace/secretary.html?view=activities` 落「活动管理」tab；`/workspace/org.html?view=activities` 落「知情查看」tab（默认「活动」分段）；其余角色同理
- [ ] **首页日历条目点击**：首页日历中点击任一活动条目 → 跳转工作台并直达该活动（与活动列表卡片行为一致，J3）
- [ ] **首页专班卡片点击**：首页招募区点击专班卡片 → 跳转工作台并直达该专班（J2）
- [ ] **首页活动列表卡片点击**：点击「查看更多」外的活动卡片 → 跳转工作台直达该活动（J1）
- [ ] **高亮褪去一致性**：所有直达场景高亮均为约 3 秒自动褪去，无一例"一直亮着"

## T-280-B1 待办/通知直达跳转（2026-08-24 新增，B1-4）

> 检查方式：登录各角色后进入「待办」tab，点击通知类/审核类待办的行动按钮或聚合卡「处理」按钮，观察是否直达对应处理页/详情页。
> 背景：最小三成本 / 高频零跳转理念落地——待办行动按钮直达处理界面，减少中间跳转（DESIGN_SYSTEM.md 原则10）。
> **2026-08-24 浏览器实测：29/29 全过**——7 条全部代码化断言验证（URL / tab 激活态 / 详情面板 DOM；专项脚本已随 2026-08-30 脚本清理归档）。实测修复 2 缺陷：
> ① leader todo-tab 无 actionKey 级 tabMap → `review-submit` 复盘待办点「去提交」误跳考勤上传，已对齐 disc 的 actionKey 级映射；
> ② 赋权待办聚合对象无 sourceId + 懒加载 tab 渲染异步 → 同步 querySelector 找不到活动条目、直达详情失效，已改为 items[0] 取 sourceId + 以「详情面板打开」为完成条件的轮询点击。

- [x] **通知阅读待办**：点击「去阅读」→ 跳转 `notice.html?id=xxx` 打开对应通知详情（各角色 todo-tab 聚合时取首条 noticeId）——实测：leader 构造 actionable 通知 → 按钮「去阅读」→ URL=notice.html?id=ntc-b1test ✅
- [x] **报名审核待办**（组织/组长）：点击「去审核」→ 跳转 `activity.html?id=xxx` 或 `taskforce.html?id=xxx`（sourceId 以 tf- 前缀判定专班）——实测：支书真实数据 signup-review→taskforce.html?id=tf-005；组织构造活动报名→activity.html?id=act-15 ✅
- [x] **组长赋权待办**：点击「去赋权」→ 切到「活动管理」tab 并直达该活动详情内联编辑（≤2 跳，T-190 兜底）——实测：聚合卡「处理」→ write tab 激活 + act-2 详情面板自动打开 ✅
- [x] **组长考勤上传待办**：点击「去提交」→ 切到「考勤上传」tab——实测：构造 submit 待办 → attendance tab 激活 ✅
- [x] **组长复盘待办**：点击「去提交」→ 切到「复盘提交」tab——实测：构造 review-submit 待办 → review tab 激活（修复①后）✅
- [x] **支书通知发布 tab**：点击通知条目 → 跳转 `notice.html?id=xxx` 直达详情——实测：notification tab 点击行 → notice.html?id=notice-110（id 与行一致）✅
- [x] **聚合卡直达一致性**：聚合卡「处理」按钮与明细待办行动按钮跳转行为一致——实测：同 actionKey 聚合卡「处理」→ 与明细「去赋权」同一处理函数（onActionTodo → _handleTodoAction），行为一致 ✅

## T-280-B5 前后端数据模型对账（2026-08-24 新增，B5-2）

> 检查方式：对照 `server/db.js` / `server/routes/resources.js` / `server/seed.js` 与前端 `data-adapter.js` / `mock-adapter.js` 的持久化域，逐表核对映射与写穿边界。
> 背景：T-280 B5 前后端对账——server 28 表（users + 27 业务）与前端 mockDB 27 个持久化域一一映射；snapshot 全量写穿与 per-item CRUD 两条写路径边界清晰。
> **2026-08-24 实测：6/6 全过**——API 级代码断言（无浏览器依赖；专项脚本已随 2026-08-30 脚本清理归档）。实测说明：V2/V3 因 server seed 仅在空库执行（db 持久化），archiveRecords 等「初始有种子」与 attendances 等「初始为空」改代码级断言（读 seed.js/mock/seed.js 源码印证）；V4 验证 login 路由在 `/api/v1/auth/login`。

- [x] **表↔域映射**：26 资源 list 全部返回 200+数组（`resources.js` RESOURCE_TABLES 26 名全通）✅
- [x] **seed 复用**：运行时 users 50/taskforces 8/activities 29+ 基线 + 代码级确认 `mock/seed.js` SEED_ARCHIVE_RECORDS/SEED_SIGNUPS 常量与 `server/seed.js` 的 archive_records/signups 注入 ✅
- [x] **空表回退**：代码级确认 `server/seed.js` 仅 seed 8 集合、**不覆盖 attendances/inspections/todos**（前端 init 空表回退本地种子的必要性印证；运行时回退行为由 b3-1/e2e-login 浏览器验证）✅
- [x] **branchDocs 写权限**：未登录 POST→401；非支委（leader p1）POST→403；支委（secretary p13）POST→201 + 删除 204（COMMISSIONER_WRITE 强制支委身份）✅
- [x] **聚合域 round-trip**：快照写穿 `[{id:'__root__', body}]` → 读回 `__root__` 单行 + body 深比较一致 → 清理写回空 ✅
- [x] **auth 测试**：`server/test` 全量测试通过（2026-08-24：21/21，含 b3-1 回写 5 项等；历史票证专项脚本已随 2026-08-30 清理归档），含 e2e-login 回归

## T223 活动排序统一（2026-08-09 追加）

> 背景：曾发现党小组组长「活动写入」的已有关联活动按时间正序排列（旧在前），违反 T223「未完成在前、已完成在后，组内按 date 降序（新者在前）」统一基准。已修复 `_renderWriteContent` + 宣传委员「关联活动」下拉。
> 2026-08-09 彻查补充（指令"必须彻查"）：全仓 53 处排序点逐一排查，新增修复 4 处——组长考勤上传「选择活动」下拉、组长考察上传「选择具体来源」下拉、组长复盘分桶列表、专班查看组件桶内排序，全部按 T223 基准落地。
> 通用预期：所有活动/专班列表均为「未完成在前、已完成在后，组内新者在前」；活动按 date 降序、专班按 createdAt 降序。

- [ ] **党小组组长「活动写入」已有关联活动**：未完成（草稿/已发布/进行中）在前、已完成（已执行/已取消）在后，组内按 date 降序（新者在前）
- [ ] **党小组组长「考勤上传」选择活动下拉**：选项按 date 降序（新者在前）（ws-leader-entry L994-999，2026-08-09 修复）
- [ ] **党小组组长「考察上传」选择具体来源下拉**：活动选项按 date 降序（ws-leader-entry L1238-1242，2026-08-09 修复）
- [ ] **党小组组长「复盘提交」待复盘/已复盘分桶**：桶内按 date 降序（ws-leader-entry L1459-1465，2026-08-09 修复）
- [ ] **知情查看组件（支书/组长「知情查看」的「专班」分段）**：各状态桶内按 createdAt 降序（taskforce-view.js，2026-08-09 修复；2026-09-14 原「专班查看」合并为知情查看（活动/专班分段）)
- [ ] **宣传委员「上传宣传材料」关联活动下拉**：选项按 date 降序（新者在前）
- [ ] **首页活动列表/日历**：未完成在前、已完成在后，组内 date 降序（main-entry L293-298 / calendar.js L352）
- [ ] **访客「活动动态」**：date 降序且仅显示未取消未归档（ws-visitor-entry L324）
- [ ] **各角色项目/专班看板**：宣传/组织委员看板桶内新者在前（ws-prop L369-383 / ws-org L92-93）
- [ ] **支书「专班总览」**：专班按 createdAt 降序（新者在前）

## 编辑完整性校验（T-283 新增，2026-08-27）

> 背景：T-283 功能开发中多次出现「多轮 Edit 导致误删/重复」系统性损坏——重复声明（SyntaxError）、函数/绑定被误删（ReferenceError 或点击静默失效）、声明误删。支书指令：此类共性问题须成为 checklist 重要部分并全局检查。机制与判例详见 [FILE_OPERATION_RULES.md §14.1（同区域连续编辑覆盖）](FILE_OPERATION_RULES.md)。

- [ ] **GetDiagnostics 全仓零错误**（每次多文件修改后的最低检查：语法错误/未定义引用/重复声明）
- [ ] **模块加载完整性审计**：`node --test server/test/module-load.test.mjs`（浏览器 import 全部 docs/src 模块全量通过——模块数随演进变化，不在本文维护具体数值；已入 npm test 回归）
- [ ] **新增功能浏览器回归**：功能路径实测（如三会一课议程：创建写入→详情显示→行内编辑→保存→持久化，server/test/agenda-flow.test.mjs A1-A3）
- [ ] **点击成本回归**：进入工作台→可执行事项 ≤2 跳；高频操作点击次数达标（server/test/click-cost.test.mjs C1-C3）
- [ ] **数据完整性回归**：Mock 数据引用/字段/id/类型 + 生命周期一致性（server/test/mock-integrity.test.mjs M1-M2）
- [ ] **删除性 Edit 复核**：删除代码块后 Read 复核邻近区域，确认无连带误删

## 链接完整性校验（T-284 新增，2026-08-27）

> 支书指令「所有链接的审查，每一个都要查」。四层法：静态存在与跳转合理相区分。全量审计脚本 `server/test/link-integrity.test.mjs`（L1-L5，已入 npm test 回归）。

- [ ] **L1 静态链接**：全部 HTML href/src 目标文件存在 + `#锚点` 有效（含 `<base href>` 解析与 `?v=` 剥离）
- [ ] **L2 JS 导航**：`location.href`/`replace`/`assign` 目标存在（模板插值动态跳转抽取 `.html` 字面量片段校验）
- [ ] **L3 HTTP 层**：自包含 server 下每个链接 200 + 工作台门控可达
- [ ] **L4 登录态逻辑**：首页链接登录态感知——已登录直达角色工作台 / 未登录直达 login.html（不出现「公开页→工作台→门控踢→login」绕路）；登录页须有「返回主页」闭环
- [ ] **版本戳同步**：测试内嵌 import 的 `?v=` 戳（evaluate 字符串内）bump 脚本不覆盖，bump 后须 grep 检查 `server/test` 残留旧戳




