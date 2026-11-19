---
title: "AI 协作域判例库"
type: governance
role: "[工程师]+[AI]"
last_updated: "2026-11-19"
status: active
related_files: [README.md, content/03_doc_system/CASES_INDEX.md, content/03_doc_system/OPERATIONS_GUIDE.md]
---

# AI 协作域判例库

> **本文件回答什么**：AI 协作方法条目**为什么这样定、边界在哪里**——每条记「真实发生过的场景 → 结论 → 边界 → 对应规范编号 → 证据指针」。
> **不回答什么**：方法正文与检查步骤 → [README.md](README.md) 所列五个分篇；目录与入口 → [CASES_INDEX.md](../03_doc_system/CASES_INDEX.md)；逐批过程 → `.ctx/logs/`。
> **读者**：`[工程师]+[AI]`。开新会话、接续旧会话、写批量脚本、做 e2e 验证之前读对应条目的边界一列。
> **纪律**：判例不产生规范效力（`OPERATIONS_GUIDE.md §32.3`）。AI 协作域的规范编号当前以分篇节名与 `CLAUDE.md H` 编号为准（`OP-` 编号待启用）。「结论」列只复述本条判例当时确认的落点，规范效力一律以对应分篇条目为准。

---

## CASE-AI-001 对话总结声称「已完成」，实测有 7 处遗漏

- **编号**：CASE-AI-001
- **场景（真实发生）**：T94 权限系统第 4 轮成果补强时，前序会话的对话总结声称「11 个 entry 已添加 storageKey 参数」；接续会话 Grep 验证发现实际只有 6 个 entry 添加，5 个 entry 完全未添加，另有 2 个 entry 虽有 storageKey 但 `activate` 仍为硬编码、未改为 activeTab——共 7 处遗漏。
- **结论**：接续会话不得把前序总结当作事实；凡「已完成」必须 Grep / 实测复核后才可沿用。
- **边界**：本条针对跨会话交接与子代理交付的结论；同一会话内直接可见的改动不必重复做全量复核，但仍须按 H25 跑运行验证。
- **对应规范编号**：`CONTEXT_MANAGEMENT.md`「对话总结虚假完成陷阱」＋ `CLAUDE.md H20.2` 验收
- **证据指针**：`content/05_ai_coding/CONTEXT_MANAGEMENT.md:59`。

## CASE-AI-002 「听起来合理」被当成制度依据

- **编号**：CASE-AI-002
- **场景（真实发生）**：`CLAUDE.md` 的 ASCII 决策示意图把主题党日承办方写成「承办: 党小组轮值」；制度从未规定主题党日由党小组轮值，正确表述是「承办: 按需指定党小组」。
- **结论**：涉及制度安排的表述必须有母本溯源；「听起来合理」不构成制度依据，写法应回到母本原句。
- **边界**：这类推断不依赖「上下文丢失」触发——正常工作同样会发生；找不到母本时应提问确认，不得用惯例补全。
- **对应规范编号**：`CONTEXT_MANAGEMENT.md`「上下文丢失后制度推断陷阱」＋ `CLAUDE.md H30.1`
- **证据指针**：`content/05_ai_coding/CONTEXT_MANAGEMENT.md:33`（判例）、`:37`（教训）。

## CASE-AI-003 改名只改文件名，引用残留

- **编号**：CASE-AI-003
- **场景（真实发生）**：ROADMAP→CLAUDE.md 更名时，只修改了文件名和部分引用，遗漏了 guides / insights / SOP 中的引用；该次更名被指出「一改具改执行不令人满意」。
- **结论**：改名后旧标识的引用须一次清零；做法与判据见 `DOCUMENT_GOVERNANCE.md`「一改具改执行陷阱」＋ `CLAUDE.md H30.1`。
- **边界**：触发面是「会被别处引用的标识」（文件名、编号、术语）；纯正文措辞润色不触发全仓扫描。
- **对应规范编号**：`DOCUMENT_GOVERNANCE.md`「一改具改执行」＋ `CLAUDE.md H30.1`
- **证据指针**：`content/05_ai_coding/DOCUMENT_GOVERNANCE.md:23`。

## CASE-AI-004 批量脚本被沙箱重复执行，误覆盖源文件

- **编号**：CASE-AI-004
- **场景（真实发生）**：用 RunCommand 执行 node 拆分脚本 `tmp-split-ops.mjs` 把 `OPERATIONS_GUIDE.md` 拆为两文件；沙箱对同一命令重复执行——首次执行成功并截断源文件，重试时读到已截断的源文件，`findIndex` 返回 -1、`slice(0, -1)` 误覆盖源文件，§15–18 完整内容在工作区丢失。
- **结论**：写文件的破坏性脚本必须单次执行、执行前备份，并在脚本内加存在性守卫（找不到锚点即中止），不得默认「重复执行结果相同」。
- **边界**：本条只管会写文件的脚本；只读的分析 / 统计脚本可重复执行。
- **对应规范编号**：`FILE_OPERATION_RULES.md`「批量脚本沙箱重复执行」＋ `CLAUDE.md H20.2`
- **证据指针**：`content/05_ai_coding/FILE_OPERATION_RULES.md:125-127`（判例 T-282）。

## CASE-AI-005 e2e 绕过前端数据层写穿，被冲刷覆盖

- **编号**：CASE-AI-005
- **场景（真实发生）**：2026-08-27 e2e-login 回归中，测试用页面原生 `fetch` 直接 POST `/api/v1/snapshot` 写库，当时写穿立即成功（服务端 29→30 条）；但 `goto` 首页后服务端数据回退 29 条——新写入被 `pagehide` 防抖冲刷覆盖。
- **结论**：e2e 必须走前端数据层（服务层写口）完成写入，再由页面读取验证，不得绕过前端直接打快照接口。
- **边界**：只测服务端接口契约的测试可以直接打 API（它不经过页面生命周期）；一旦断言涉及「页面显示的最终数据」，就不得直打快照接口。
- **对应规范编号**：`TEST_AND_VERIFICATION.md`「浏览器 e2e 写穿断言」＋ `CLAUDE.md H25`
- **证据指针**：`content/05_ai_coding/TEST_AND_VERIFICATION.md:112-114`。

## CASE-AI-006 Tab 渲染竞态：冻结 ctx ＋ marker 不清 ＋ 持久绑定标记

- **编号**：CASE-AI-006
- **样本（真实发生）**：支书台点击活动管理、全局概况时出现空白或旧快照；切月后切走再切回仍显示旧月份；离开活动管理再回来，关键词 / 类别 / 品牌 / 清除四个筛选控件全部失效。取证发现三条并存：`renderCtx` 在建栏时一次性求值（冻结 state）；`_renderCurrentTab` 不删 `dataset.currentTab`，守卫型 tab 直接跳过骨架；`calFiltersBound` / `organizerEntryBound` / `talentJumpBound` 挂在持久容器上，重建后的新控件不再绑定。另有 loading 占位 `pointer-events:none` 无超时、动态 import 无 catch 的静默空白。
- **AI 假设**：首屏能渲染出来就说明 tab 生命周期正确；渲染上下文是稳定常量；绑定标记挂在容器上「只绑一次」更省事；loading 只是视觉占位，不需要超时。
- **人类意图**：点击哪个 tab，最终渲染的就必须是**该 tab 的最新数据**；控件离开再回来仍要生效；失败要看得见，占位不能永久灰化。
- **泛化规则（结论）**：渲染上下文取最新 state（函数化或每次点击重算）；所有渲染走同一生命周期（序号 ＋ 去重 ＋ 切前清 marker ＋ await ＋ 失败错误卡 ＋ loading 超时恢复）；「已绑定」标记挂在会被重建的元素自身或改用事件委托；验收必须包含「切月 → 切走 → 切回」「离开再回来筛选仍生效」两条行为用例，不能只测首屏。
- **守卫**：`runtime-tab-lifecycle-guard::R1–R7`（行为用例 ＋ 静态保态）＋ `P1–P5`（延迟可配 / 单次 loadDB / 首屏不阻塞 / hover 先读后写 / 后台渲染不铺占位）。
- **对应规范编号**：`TEST_AND_VERIFICATION.md`「非闭环类缺陷的守卫写法：真机闭环断言 + 静态保态断言」＋ `CLAUDE.md H25`
- **边界**：本条针对「同一 tab 的渲染 / 绑定生命周期」；纯服务端接口契约测试不受此限。首屏性能读数（974→515ms、hover p95 3.5→0.9ms）属演示环境实测，不当作跨机器承诺。
- **证据指针**：`docs/src/components/shell/tab-bar.js`（`renderCurrent` / `_safeRender` / `_armLoadingTimeout`）· `docs/src/components/shell/workspace-shell.js`（`renderCtx: () => _renderCtx(getAppState())`）· `server/test/runtime-tab-lifecycle-guard.test.mjs` · `.ctx/logs/2026-10-EXECUTION_LOG.md` 批次 512。

## CASE-AI-007 系统通知「无受众」被当成广播，匿名读到定向赋权

- **编号**：CASE-AI-007
- **样本（真实发生）**：支书在未登录状态看到「某某已将您赋权」通知。取证发现三层叠加：`project-auth-granted` 写侧不产 `audience` / `audiencePersons`；读侧 `canReadNotice` 把「无受众」当广播、`list()` 无会话直接全放行；授权人姓名依赖前端 payload，服务端未复算。同类 7 个 kind 恒无受众。
- **AI 假设**：没有受众字段就是广播；服务端生成的通知天然可信；未登录放行只是演示便利。
- **人类意图**：没有受众就是**未授权**；定向通知只能到人；未登录不读任何站内通知；广播必须显式写 `audience:['all']`。
- **泛化规则（结论）**：安全默认 fail-closed——无受众系统通知不可读；广播必须显式；写侧按 kind 声明 `required / broadcast / conditional` 并在落库前校验；展示值（人名 / 项目名）由服务端按表复算；存量无受众行标 `legacyUnscoped`，仅发布者可见。
- **守卫**：`notice-audience-failclosed`（F1–F6）＋ `notice-audience::N1/N6/N7` ＋ `system-notice-project-auth-authorize::B10/E3/E5/E6`。
- **对应规范编号**：`CLAUDE.md H32`（服务端算业务事实）＋ `DATA_MODEL.md §2.9`（受众必填）＋ `INFORMATION_COMPUTATION.md §1.2–§1.4`。
- **边界**：公告（`kind='announcement'`）无受众仍按支部广播兼容；匿名可读只开 `publishScope='public'` 且未过期这一条窄口，已裁定，见 `D-858` / `PUBLIC_ENTRANCE.md`。
- **证据指针**：`docs/src/services/governance/notice.js`（`list()` / `canReadNotice`）· `server/system-notice-kinds.js`（`audiencePolicy`）· `server/routes/system-notices.js`（`normalizeSystemNotice`）· `server/scripts/migrate-notice-audience.mjs` · `.ctx/evidence/2026-11-07/notice-audience-gap.md`。

## CASE-AI-008 CLAUDE 层标记漂移：温层被搬空仍宣称三层

- **编号**：CASE-AI-008
- **样本（真实发生）**：`CLAUDE.md` 声明「热 / 温 / 冷三层」，实际温层 0 行、H60–H80 全被并进热层；守卫只挡总量与引用框，没有层边界、单节配额与温层非空检查，乙部历史叙述也不计入行数。
- **AI 假设**：只要总量不超 600 行就安全；层标记只是注释；历史完成项留在乙部便于追溯。
- **人类意图**：温层必须真的被用起来（触发式任务表）；层边界与单节配额要有机检；完成项整行删除，沿革归 git。
- **泛化规则（结论）**：结构规则必须有结构守卫——热/温/冷区间、每层允许的 H 节、温层非空、单节配额、乙部无历史叙述、触发表指针 `existsSync`；新增规则同批删等量旧行或降为指针。
- **守卫**：`ctx-hygiene-guard::⑧⑨`（层边界 / 温层 3–60 行 / 乙部 ≤18 行且无历史）＋ `claude-parallel-audit::C4`（判例下迁手册）＋ `ui-preflight-context::P5`（温层非空 + 触发表）。
- **对应规范编号**：`CLAUDE.md H26` / `H50` ＋ `CONTEXT_MANAGEMENT.md` 三层模型。
- **证据指针**：`CLAUDE.md`（`# 热层` / `# 温层` / `# 冷层`）· `server/test/ctx-hygiene-guard.test.mjs` · `.ctx/evidence/2026-11-07/ui-audit.md`。

## CASE-AI-009 只引「点缀色」允许，漏引「不承担状态语义」

- **编号**：CASE-AI-009
- **样本（真实发生）**：批次 540 统一图标着色时，AI 逐条对照 `DESIGN_SYSTEM §一 原则 4`，抓到「**点缀色**（图标浅底 / 笔触 / 关键数值，每屏 1–2 处）不计入主色数量」，据此把彩色状态图标判为合规并放行；同一句后半「**不单独承担状态语义，须同时有文字标签**」没有被引用，若干只靠颜色区分的状态图标因此留在页面上。该句正是同批为 `CASE-DESIGN-030` 补写的边界，AI 读过该判例却没有读回它所指向的条文。
- **AI 假设**：命中「允许」那半句即等于该条已读；后半句属于补充说明，可以在动手时略过；判例只教「别过度去色」，不会反过来约束用色。
- **人类意图**：一条规范同时含「允许」与「约束」时，两句必须一起引；点缀色的前提是有文字标签，没有标签的颜色不享受这条豁免。
- **泛化规则（结论）**：引用带例外的规范须同句引完「允许 ＋ 例外条件 ＋ 兜底」三段，只引前半句视为未读该条；判例只作边界，不得当条文用；改一条规范的边界句时，同批检查所有引用了旧边界的调用点。
- **守卫**：`icon-color-guard::G3`（状态色只经 `--tint`，且只在计数 > 0 或状态成立时出现）＋ `status-color-guard::S1`（填充档不进图标笔触）。
- **对应规范编号**：`DESIGN_SYSTEM.md §一 原则 4` ＋ SD-61（图标色彩契约，正文见 `DS_03_COMPONENTS.md §4.11.2`）
- **边界**：本条只判「引用完整性」，不重开「图标能不能用色」；党徽 / 插画的多色仍按 §4.11.2 登记。`--tint` 的取值面由 `icon-color-guard::G3` 判，本条不另立色值白名单。
- **证据指针**：`content/04_web_design/design-system/DESIGN_SYSTEM.md:67` · `content/04_web_design/design-system/DS_03_COMPONENTS.md:539-551,1537` · `content/04_web_design/design-system/CASES.md`（CASE-DESIGN-030 / CASE-DESIGN-041）· `server/test/icon-color-guard.test.mjs`。

## CASE-AI-010 同一指标多值并存：台账各写一个「当前值」

- **编号**：CASE-AI-010
- **样本（真实发生）**：批次 565–567 后，`ACTIVE_CONTEXT §1` 写 81/80/81…、`ACTIVE_RULINGS §A` 带历史 81/78…、`ENGINEERING_ASSESSMENT §一` 表格写 82/80/82…、§二 六个标题写 81/80/81…；`server/README.md` 矩阵写 141 而行数实为 162；党委台页签一处 4、一处 5。每轮“重新检查”都会再发现同一批漂移。
- **AI 假设**：只要有一处写对就够；历史值留着便于对照；文档改一处即可，其余下次再说。
- **人类意图**：同一事实只允许**一个当前值 ＋ `D-xxx`**；历史值只进 `.ctx/logs/` 与 git；跨文件必须机检，不靠人眼。
- **泛化规则（结论）**：任何“当前值”类事实（评分、条数、页签数、白名单、层名、口令口径）必须有代码或证据单一源，并在 active/reference 台账逐处相等；改一处必须在同批改完全部引用（`H30` 先裁后清）。
- **守卫**：`ctx-hygiene-guard::⑪`（历史值不得回潮 / 每文件至多一个六维元组 / EA §一 不再开「重评」小节）＋ `::⑫`（三处六维一致）＋ `single-fact-consistency::G1`（矩阵 / 表 / 页签 / 白名单 / 四层名 ≡ 代码）＋ `spec-task-consistency::G2`（spec 台账噪声只减不增）。
- **对应规范编号**：`CLAUDE.md H26.5` · `H30`（先裁后清）· `H20.3`（check-batch-commits 基线）；`content/05_ai_coding/DOCUMENT_GOVERNANCE.md`「去重 / 日志分层」。
- **边界**：只判「当前值多值」，不判分数是否合理；历史值本身保留在 `.ctx/logs/` 与 git，不删除。
- **证据指针**：`D-883` · `D-884` · `.ctx/ACTIVE_CONTEXT.md §1` · `server/test/{ctx-hygiene-guard,single-fact-consistency,spec-task-consistency}.test.mjs`。
