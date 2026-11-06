---
title: "AI 协作域判例库"
type: governance
role: "[工程师]+[AI]"
last_updated: "2026-10-26"
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
- **结论**：改文件名、编号或术语后，必须全仓 Grep 旧标识并做零残留复核（`CLAUDE.md H30.1`）。
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
