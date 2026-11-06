# Lens A — web-design-guidelines

> 审查口径：Vercel Web Interface Guidelines（无障碍 / 焦点 / 表单 / 动效 / 排版 / 内容承载 / 导航状态 / 安全区）。
> 输入：`.ctx/AUDIT_ROUND1_WORKBENCH_STRUCTURE.md`、`.ctx/UNFINISHED_AUDIT_BACKLOG.md` 及 15 条深审样本对应代码。
> 本报告只读；未修改任何生产代码、spec 或其他 lens 文件。

## 深审发现

### U-02 「党员结构」口径问题已随概况重构消失，底表证据指针失效
- **现象**：旧 `secretary/overview-tab.js` 已缩为 32 行薄壳，实际渲染改由 `work-overview.js` 承担；全仓已无「党员结构」标题。`secretary-overview.js` 仍计算四阶段 `stageCounts`，但无任何消费点。
- **证据**：`docs/src/entries/tabs/secretary/overview-tab.js:1-32`；`docs/src/components/governance/work-overview.js:486-510`；`docs/src/services/governance/secretary-overview.js:284-300`；全仓检索 `stageCounts` 仅本文件 6 处（定义/累加/返回），无读取方。
- **影响**：按底表去改 `overview-tab.js:338-344` 会改错文件；四阶段死计算留在服务层，存在被重新接回页面的风险。
- **建议方向**：关闭 U-02；删除或标注 `stageCounts` 死代码；Round 2 只核新概况的「待我处理 / 条线」计数口径。
- **严重度**：P2
- **可能冲突**：若 lens B/C 主张恢复「队伍结构」分布卡，将与 Lens A 的「旧口径已下线」结论冲突。

### U-04 考勤页已收为两段，但「确认与录入」仍三卡纵排，且有两处可访问性缺口
- **现象**：「考勤」分段改为「确认与录入 / 数据查看」互斥两段；但「确认与录入」仍纵向叠放待确认队列、出勤申诉、会议考勤录入三张卡（会议卡默认收起）。队列整行是 `div` 点击目标，无 `role`/`tabindex`；会议活动 `<label>` 未与 `<select>` 关联；申诉打回使用 `window.prompt`。
- **证据**：`docs/src/entries/tabs/disc/attendance-tab.js:182-197`（两段切换）、`:514`（会议默认收起）、`:556`（整行可点 div）、`:790-791`（label 无 `for`）、`:242`（`window.prompt`）。
- **影响**：原「矩阵/明细/队列/录入同屏」已缓解；首屏仍需滚过三张卡。键盘与读屏无法获知整行可点；原生 prompt 破坏统一错误/说明样式。
- **建议方向**：保留两段；整行点击仅作鼠标增强，键盘路径保留 checkbox/链接；label 补 `for`；prompt 换项目内确认浮窗。
- **严重度**：P2
- **可能冲突**：lens B 可能要求把「会议录入」再拆一级；Lens A 认为当前两段已够，冲突点在拆分深度。

### U-05 专班三对象已互斥，但视图钮与招募浮窗缺状态/对话框语义
- **现象**：顶部「专班工作组 / 活动工作组 / 报名总表」三视图已互斥；但按钮仅靠 class 表示选中，无 `aria-pressed`；招募浮窗是手写 `div` overlay，无 `role="dialog"` / `aria-modal` / Esc / 焦点接管；「自动发布通知」用 `div onclick` 折叠，无键盘可达与 `aria-expanded`。
- **证据**：`docs/src/entries/tabs/org/taskforce-tab.js:72-75`（视图钮）、`:1373-1385`（自制 overlay）、`:1454`（div onclick 折叠）。
- **影响**：读屏用户不知道当前视图；键盘用户无法展开通知区；模态打开后焦点可逃逸到背后页面。
- **建议方向**：视图钮补 `aria-pressed`；浮窗复用 `components/ui/modal.js`（该组件已有 `role="dialog"` / `aria-modal` / Esc / 焦点回还）；折叠改 `<button aria-expanded>`。
- **严重度**：P2
- **可能冲突**：lens B 可能主张减少顶部按钮；Lens A 不建议删，只要求把选中态暴露给辅助技术。

### U-06 支部管理长页已拆为独立页 + 四段导航；表格字号三档与 page-sweep P7 冲突
- **现象**：党委台「支部管理」现仅保留支部目录；配置、换届向导、部署自查移入独立 `branch-config.html`，并以四段 `aria-current` 导航切换。残留问题：支部对比表实测表头 12px、首列 14px、其余 13px；新建支部输入框无 `name` / `autocomplete`。
- **证据**：`docs/src/capabilities/party-committee-workspace.js:16-30`；`docs/src/entries/tabs/party-committee/branches-tab.js:26-65`、`:36-37`；`docs/branch-config.html:35-68`；`docs/src/styles.css:4494-4508`；`server/test/page-sweep.test.mjs` 实跑输出：`[支部管理] P7 ... TH ... px:12`、`TD ... px:14`。
- **影响**：原「档案/向导/自查叠成长页」在结构层已闭环；但表内三种字号与 page-sweep 的 13px 单档契约冲突，导致全站普查红灯；表单自动填充行为不确定。
- **建议方向**：明确 12/14 是否为新表档并同步 P7 判据；若以 13px 为准则回退；输入补 `name` 与 `autocomplete="off"`。
- **严重度**：P2
- **可能冲突**：lens C 可能为 12/14 的层级设计辩护；冲突本质是「设计档位」与「守卫契约」谁是单一源。

### U-08 已按可写/只读分组，键盘语义齐备
- **现象**：组长「本组活动」已拆为「本组创建 / 承办（可写入）」与「可见活动（只读）」两组，支部级活动不再混进写入列表；活动行 `role="button"` + `tabindex="0"` + `focus-visible` 描边，宿主上有 Enter/Space 委托。
- **证据**：`docs/src/entries/tabs/leader/write-tab.js:170-219`（分组与行模板）、`:518-520`（键盘激活）；`docs/src/capabilities/leader-workspace.js:58-61`（页签名「本组活动」）。
- **影响**：原「范围文案未定、支部其他活动混排」已闭环；未发现新增的键盘/焦点缺陷。
- **建议方向**：关闭 U-08；Round 2 只核「可见活动（只读）」下方是否需再补一句「全支部 / 定向范围」。
- **严重度**：P2
- **可能冲突**：无。

### U-23 活动材料闭环整页缺失，Lens A 无法评审
- **现象**：全仓没有「活动材料闭环」页面或路由；仅在 `workflow/definitions.js` 的任务文案中出现「活动复盘 / 将全部活动材料主动交给宣传委员归档」，没有独立承载面。
- **证据**：`.ctx/REVIEW_QUEUE.md:349`；`docs/src` 检索 `材料闭环` 无命中；`docs/` 页面清单无对应入口。
- **影响**：用户完成活动后没有材料收口页面；入口位置、空态、上传/核对/归档步骤均无法做视觉与无障碍评审。
- **建议方向**：Round 3 先出信息架构与页面骨架（入口挂点、三步流程、空态与失败态），再进入视觉实现。
- **严重度**：P1
- **可能冲突**：lens C 可能认为整页缺失不属视觉审查范围；Lens A 认为没有承载面就无法落地任何界面规范。

### U-52 IAAA 三步 UI 已落地；残留异步提示无 aria-live、焦点不迁移
- **现象**：登录页已有「统一身份认证登录」按钮与说明；选支部面板复用登录页；组织台「成员流动」已有「待确认入站」卡与确认/驳回动作。残留：`#branch-note` 无 `role`/`aria-live`；切到选支部面板时未把焦点移到标题或列表；支部列表是普通按钮组，无单选组语义。
- **证据**：`docs/login.html:104-106`、`:136-141`；`docs/src/entries/pages/login-entry.js:175-221`；`docs/src/entries/tabs/org/member-flow-tab.js:131-174`。
- **影响**：底表「三步 UI 全缺」已过期；读屏听不到「已提交 / 等待确认」；键盘用户切面板后焦点仍在旧控件。
- **建议方向**：关闭 U-52；`#branch-note` 补 `role="status" aria-live="polite"`；面板显示后 `focus()` 标题；支部选择改 `radiogroup` 或至少补 `aria-pressed`。
- **严重度**：P2
- **可能冲突**：lens B 可能主张合并为单屏引导；冲突点在切换模型，不在无障碍要求。

### U-53 块决定 tab + 画布仍不存在，需在方案阶段写死键盘与动效约束
- **现象**：只有 `workflow/blocks/orchestration.js` 的纯函数内核，注释明确「画布 UI 还没做」；没有画布组件、拖拽实现或 tab 注册变更。
- **证据**：`docs/src/workflow/blocks/orchestration.js:7-8`；`docs/src/core/domain/constants.js:826`（仅活动产出块目录）。
- **影响**：结构级能力缺席；若未来只实现拖拽，将直接违反「手势/拖拽需有键盘替代」与 `prefers-reduced-motion` 要求。
- **建议方向**：方案稿先定「清单兜底 + 键盘移动块 + reduced-motion 下关闭位移动画」，再排期实现。
- **严重度**：P2
- **可能冲突**：lens C 可能主张 canvas-first；Lens A 要求必须保留非拖拽路径。

### U-09 空态仍无出口，且空态组件不支持动作插槽
- **现象**：「我的任务」空态只有「你暂无可承接的项目任务」文案；统一检索引擎的空态渲染为纯 `<p>`；`empty-state.js` 提供 `actionHtml` 槽但本页未用。子视图按钮常驻但无 `aria-pressed`；按钮类含 `transition-all`。
- **证据**：`docs/src/entries/tabs/visitor/projects-tab.js:105-119`（子视图常驻）、`:209`（空态文案）、`:114`（`transition-all`）；`docs/src/components/ui/list-filter.js:265`（空态纯文本）；`docs/src/components/ui/empty-state.js:15-22`（有 action 槽）。
- **影响**：用户看到「暂无可承接」时没有下一步；读屏不知当前子视图；`transition-all` 会连带布局属性，违背动效规范。
- **建议方向**：空态加「去我的分工 / 全局分工」按钮（给 `list-filter` 增加 `emptyActionHtml`，或本页自绘）；子视图补 `aria-pressed`；`transition-all` 改为具体属性。
- **严重度**：P2
- **可能冲突**：lens B 可能主张删掉三个子视图；Lens A 不反对删，但在保留方案下必须补空态出口。

### U-35 组长台仍无「我的任务」承载面
- **现象**：组长台 9 个页签中无「我的任务」；全目录检索 `listMyProjectTasks` / `completeMyProjectTask` 只在成员台 `visitor/projects-tab.js` 命中。
- **证据**：`docs/src/capabilities/leader-workspace.js:28-80`（9 个 tab 声明）；`docs/src/entries/tabs/leader/` 检索无「我的任务 / listMyProjectTasks」命中。
- **影响**：组长作为项目组织者时，SOP-B-31 已定的主口径在其主工作面不可见，只能切到成员台；职责与入口错位。
- **建议方向**：在组长台「待办」或「本组活动」内增加「我的任务」分段，复用 `services/activity/activity.js::listMyProjectTasks`，不另造数据源。
- **严重度**：P1
- **可能冲突**：lens B 可能认为「待办」已覆盖；冲突点在「待办聚合」与「按项目身份的任务」是否同一口径。

### U-12 议程归属校验已在服务端闭环
- **现象**：`POST /agenda-votes` 在写库前调用 `validateAgendaVoteTarget`，校验议题存在、唯一，且讨论项不得直接表决；同时校验活动存在与支部归属。
- **证据**：`server/routes/committee.js:13`（导入）、`:75-76`（调用与 400 返回）；`docs/src/services/activity/agenda-relations.js:83-92`（实现）。
- **影响**：跨活动孤儿票风险已消除；底表「未校验」证据过期。
- **建议方向**：关闭 U-12；补一条「用 A 活动 id + B 活动 agendaItemId」的回归用例即可。
- **严重度**：P2
- **可能冲突**：无。

### U-13 多支部读边界已在服务端按 actor/所选支部过滤
- **现象**：`resourceRowsForActor` 对支部账号按本支部过滤；党委未选支部时只返回支部目录与党委下发通知，其余资源返回空；请求他支部 `branchId` 返回 403。
- **证据**：`server/routes/resources/branch-scope.js:61-71`（`actorBranchId` / `branchSelectionError`）、`:180-199`（过滤实现）；`server/routes/resources/index.js:113-117`（list）、`:569-573`（bootstrap）。
- **影响**：「GET 返回整表」已不成立；底表证据过期。
- **建议方向**：关闭 U-13；Round 4 只保留写侧与缓存一致性复核。
- **严重度**：P2
- **可能冲突**：无。

### U-21 撤员已联动撤授权，但界面没有「授权将一并撤销」的确认
- **现象**：服务端移出工作组成员时，把该成员名下 grants 置 `revoked` 并写 `revokedBy/revokedAt/revocationReason`；前端「移出工作组」只是从本地 `memberMap` 删除行，没有确认或说明。
- **证据**：`server/routes/resources/workgroup-routes.js:49-54`（撤授权函数）、`:639-649`（移出事务）；`docs/src/components/governance/workgroup-member-editor.js:150-153`（无确认的移出）。
- **影响**：原「只置 removed、不改授权」已闭环；但操作者以为只是移人，实际连带失去授权，属破坏性动作缺少确认/撤销窗口。
- **建议方向**：关闭原 U-21；UI 在移出时提示「将同时撤销 N 项操作授权」，或提供撤销窗口。
- **严重度**：P2
- **可能冲突**：lens B 可能认为确认框是额外摩擦；冲突点在「告知」形式，不在是否需要告知。

### U-10 平板证据仍缺；样式只有一个 768px 断点，支部表强制 928px 内宽
- **现象**：现有截图只有 390 与 1440 两档；`styles.css` 只有 `@media (max-width: 768px)`；支部对比表 `min-width: 58rem`（928px），在 768–927px 视口只能横向滚动；page-sweep 未设置 viewport。
- **证据**：`docs/src/styles.css:493-494`（`pc-table-scroll` / `min-width: 58rem`）、`:562`（唯一 768px 断点）；`server/_audit_out/` 仅有 `*-390.png` / `*-1440.png`；`server/test/page-sweep.test.mjs` 检索 `setViewportSize` 无命中。
- **影响**：768/1024 平板的层级、焦点与横向滚动行为未取证，Round 1 的视觉结论不能外推；支部表在 iPad 竖屏必然出现内层横向滚动。
- **建议方向**：用 768×1024 与 1024×768 跑 U-04/U-05/U-06/U-08 四页，留存视口参数与截图；把 viewport 固化进 page-sweep。
- **严重度**：P1
- **可能冲突**：lens C 可能接受桌面证据；冲突点在是否把平板作为 Round 1 结项门槛。

### U-22 page-sweep 环境已恢复，但 7/7 工作台全红，失败集中在 P7 尺规与台账解析
- **现象**：`server/node_modules/playwright` 存在，Chromium 148.0.7778.96 可正常启动；实跑 `node --test test/page-sweep.test.mjs` 后 7 个真机普查全部失败，S1 / S19 也失败。P7 报表头 12px、首列 14px，与 `styles.css` 的新表档一致，疑为测试口径未同步；S1 报矩阵样本 2 < 基线 4；S19 报 README 页签句解析失效。
- **证据**：命令 `node --test test/page-sweep.test.mjs`（cwd=`server`）输出；`server/test/page-sweep.test.mjs:34`（import chromium）、`:55`（launch）；`docs/src/styles.css:4494-4508`（表头 `var(--text-sm)` / 首列 0.875rem）。
- **影响**：「缺 Chromium 不能判定」已不成立；当前红灯既可能是页面缺陷，也可能是守卫过期，不能直接当作视觉结论；Round 1 的取证方式已可用但结论尚未可信。
- **建议方向**：Round 1 先把失败分为「口径过期 / 页面缺陷 / 环境差异」三类，逐条归因；P7 与 S19 优先，因为它们影响全站结论。
- **严重度**：P1
- **可能冲突**：lens B/C 若引用 page-sweep 结论，需与 Lens A 的归因保持一致。

## 53 条 disposition

| 编号 | 结论 | 一句话理由 | 归属轮次 |
|---|---|---|---|
| U-01 | 已闭环 | 2026-10-18 概况重构后旧「优先队列」标题已下线，周报待审并入 `reportPending` 与待我处理计数（`work-overview.js:419-432,619`） | Round 2 |
| U-02 | 已闭环 | 「党员结构」标题与四阶段分布卡已随概况重构移除；仅剩 `secretary-overview.js:284-300` 无消费的死计算 | Round 2 |
| U-03 | 已闭环 | 宣传台 `weekly` 页签已于 2026-10-04 摘除，页头改为「档案归档（周/月周期报送）」，不再是独立模块 | Round 1 |
| U-04 | 确认 | 已收为「确认与录入 / 数据查看」两段，但确认段仍三卡纵排，且有 label/可点 div/prompt 三处可访问性缺口 | Round 1 |
| U-05 | 确认 | 三对象已用互斥视图钮分开，但视图钮缺 `aria-pressed`、招募浮窗缺 dialog 语义、折叠用 div onclick | Round 1 |
| U-06 | 已闭环 | 长页已拆为支部目录 + `branch-config.html` 四段导航；残留表档字号冲突与表单 `name` 缺失另记 | Round 1 |
| U-07 | 确认 | 人才库与活动参与仍用独立 `stateKey`（`org-talent-table` / `org-participation-summary`），共享筛选未定 | Round 2 |
| U-08 | 已闭环 | 已按「本组创建/承办（可写）」与「可见活动（只读）」分组，行有 role/tabindex/键盘委托 | Round 2 |
| U-09 | 确认 | 空态仍只有文案，`list-filter.js:265` 不支持动作插槽；子视图常驻但无 `aria-pressed` | Round 3 |
| U-10 | 需补证 | 只有 390/1440 截图，无 768/1024 视口证据；page-sweep 也未设 viewport | Round 1 |
| U-11 | 本轮不适用 | 议程「目的/预期产出」是字段与 DATA_MODEL 缺口，Lens A 无可比对的界面证据 | Round 4 |
| U-12 | 已闭环 | 服务端已用 `validateAgendaVoteTarget` 校验议题归属与讨论/表决类型（`committee.js:75-76`） | Round 4 |
| U-13 | 已闭环 | `resourceRowsForActor` 已按本支部过滤，党委未选支部不再返回整表（`branch-scope.js:180-199`） | Round 4 |
| U-14 | 本轮不适用 | 模板目录版本化/审批发布是制度与数据治理问题，非界面审查对象 | Round 4 |
| U-15 | 本轮不适用 | 考勤应到集合冻结与空白态语义属数据模型，Lens A 不判 | Round 4 |
| U-16 | 本轮不适用 | 「今天」六入口的角色/支部数据投影属数据权限，需真机抽样 | Round 4 |
| U-17 | 本轮不适用 | 成员流动两入口的权责门一致性属权限核对 | Round 4 |
| U-18 | 本轮不适用 | 「我的处置」视图权限与后端写门一致性属权限核对 | Round 4 |
| U-19 | 本轮不适用 | 知情查看下游越权/漏范围属权限核对 | Round 4 |
| U-20 | 本轮不适用 | 活动/专班/工作组成员镜像双写属数据一致性 | Round 4 |
| U-21 | 已闭环 | 服务端移出成员时已联动把 grants 置 revoked；仅 UI 缺「授权将一并撤销」提示 | Round 4 |
| U-22 | 确认 | Chromium 已可用且能实跑，但 7/7 工作台与 S1/S19 全红，需先归因再引用结论 | Round 1 |
| U-23 | 确认 | 全仓无「活动材料闭环」页面/路由，整页缺失，Lens A 无法评审 | Round 3 |
| U-24 | 需补证 | 产出块 chips 启停→保存是操作路径证据，静态代码不能替代真机录屏/E2E | Round 3 |
| U-25 | 本轮不适用 | `getMembers()` 只含种子属数据层缺陷，非视觉审查对象 | Round 4 |
| U-26 | 本轮不适用 | 测试文件整合属工程治理，不影响界面 | Round 4 |
| U-27 | 本轮不适用 | 成功路径覆盖率是测试口径问题 | Round 4 |
| U-28 | 本轮不适用 | 事假提前 1 天的分类边界属制度裁定 | Round 4 |
| U-29 | 本轮不适用 | 「全年/半年」考察口径属制度文本一致性 | Round 4 |
| U-30 | 本轮不适用 | 副职身份键是否兼并属角色数据模型裁定 | Round 4 |
| U-31 | 本轮不适用 | 解除组织者是否发更正通知属流程裁定 | Round 3 |
| U-32 | 本轮不适用 | 工作流状态机标签属流程定义，不是界面文案单点 | Round 4 |
| U-33 | 本轮不适用 | 按制度主体派生待办/改派属工作流能力缺口 | Round 3 |
| U-34 | 本轮不适用 | 服务端门与培养考察期拦人属权限/规则实现 | Round 4 |
| U-35 | 确认 | 组长台 9 个 tab 中仍无「我的任务」，成员台才有 `listMyProjectTasks` 承载面 | Round 3 |
| U-36 | 本轮不适用 | DATA_MODEL issues 补 `domain` 行属文档/数据模型 | Round 4 |
| U-37 | 需补证 | 「拟上会」全空态在演示库不可达，缺真机截图或构造空库证据 | Round 3 |
| U-38 | 本轮不适用 | 运行时「真装配成功」守卫属工程守卫 | Round 4 |
| U-39 | 本轮不适用 | 按角色/工作类型两张查表是否落系统属交互方案裁定 | Round 3 |
| U-40 | 本轮不适用 | 委员↔主题党日/活动写入权属权限设计 | Round 4 |
| U-41 | 本轮不适用 | 支委会档「未通过」处置属状态机裁定 | Round 3 |
| U-42 | 本轮不适用 | 培养联系人考察记录双向联动属流程设计 | Round 3 |
| U-43 | 本轮不适用 | 评测分跨文件口径不一致属文档一致性 | Round 4 |
| U-44 | 本轮不适用 | OPERATIONS_GUIDE 悬空指针属文档链接 | Round 4 |
| U-45 | 本轮不适用 | 「表单条目」轴落地属配置能力 | Round 4 |
| U-46 | 需补证 | `b3-1` 4/5 断言红缺失败日志与根因归因 | Round 4 |
| U-47 | 本轮不适用 | DATA_CONSISTENCY_CHECKLIST 索引未补属文档治理 | Round 4 |
| U-48 | 本轮不适用 | 搬迁盲区是否立常驻守卫属工程守卫 | Round 4 |
| U-49 | 本轮不适用 | 部署前四条限制与权限口径属部署/权限 | Round 4 |
| U-50 | 本轮不适用 | Windows 专有脚本与索引落点属工程/性能 | Round 4 |
| U-51 | 本轮不适用 | IAAA 入站接口与新增表属数据/接口设计 | Round 4 |
| U-52 | 已闭环 | 登录 IAAA 按钮、页内选支部、组织台「待确认入站」均已实现；残留异步提示与焦点问题另记 | Round 4 |
| U-53 | 确认 | 块决定 tab + 画布仍未实现，仅有 orchestration 纯函数内核（`orchestration.js:7-8`） | Round 4 |

## 本轮不适用

- U-11：议程字段与 DATA_MODEL 覆盖缺口，非 Lens A 可比对的界面证据；转 Round 4。
- U-14：党委模板目录版本化/审批发布属制度与数据治理；转 Round 4。
- U-15：考勤应到集合冻结与「应到未录」语义属数据模型；转 Round 4。
- U-16：「今天」六入口的角色/支部数据投影需账号抽样；转 Round 4。
- U-17：成员流动两入口权责门一致性属权限核对；转 Round 4。
- U-18：「我的处置」视图权限与后端写门一致性属权限核对；转 Round 4。
- U-19：知情查看下游越权/漏范围属权限核对；转 Round 4。
- U-20：活动/专班/工作组成员镜像双写属数据一致性；转 Round 4。
- U-25：`getMembers()` 只返回种子、不含 server 新建成员属数据层缺陷；转 Round 4。
- U-26：测试文件整合属工程治理；转 Round 4。
- U-27：成功路径覆盖率是测试口径问题；转 Round 4。
- U-28：事假提前 1 天是否单列属制度裁定；转 Round 4。
- U-29：「全年/半年」考察口径属制度文本一致性；转 Round 4。
- U-30：副职身份键是否兼并属角色数据模型裁定；转 Round 4。
- U-31：解除组织者是否发更正通知属流程裁定；转 Round 3。
- U-32：工作流状态机标签属流程定义；转 Round 4。
- U-33：按制度主体派生待办/改派属工作流能力缺口；转 Round 3。
- U-34：服务端独立门与培养考察期拦人属权限/规则实现；转 Round 4。
- U-36：DATA_MODEL issues 补 `domain` 行属文档/数据模型；转 Round 4。
- U-38：运行时「真装配成功」守卫属工程守卫；转 Round 4。
- U-39：两张查表无同构入口属交互方案裁定；转 Round 3。
- U-40：委员↔主题党日/活动写入权层属权限设计；转 Round 4。
- U-41：支委会档「未通过」处置属状态机裁定；转 Round 3。
- U-42：培养联系人考察记录双向联动属流程设计；转 Round 3。
- U-43：评测分跨文件口径不一致属文档一致性；转 Round 4。
- U-44：OPERATIONS_GUIDE 悬空指针属文档链接；转 Round 4。
- U-45：「表单条目」轴落地属配置能力；转 Round 4。
- U-47：DATA_CONSISTENCY_CHECKLIST §0.2 索引未补属文档治理；转 Round 4。
- U-48：目录搬迁三类盲区是否立常驻守卫属工程守卫；转 Round 4。
- U-49：部署前四条限制及权限口径属部署/权限；转 Round 4。
- U-50：Windows 专有脚本与 S2 索引落点属工程/性能；转 Round 4。
- U-51：IAAA 入站接口信息与新增表属数据/接口设计；转 Round 4。
