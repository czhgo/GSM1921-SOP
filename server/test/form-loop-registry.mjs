// server/test/form-loop-registry.mjs — 「校验（validate）与载体（UI 控件）失配」病灶台账（2026-09-15 批次 44）
//
// 病灶（支书实报，批次 32 已修 1 处）：
//   「考察上传都没有填写考察的【框】，我要点击提交考察，却跟我说必须要填写考察内容！」
//   —— 提交时按状态取到「已选 X 人」，而逐人填写框不在位（选人面板一关就没渲染），
//      于是报「请填写 X 的考察内容」而框根本不存在。同类校验点全站 ≥50 处，只修了 1 处。
//
// 本模块是**纯数据台账**（不依赖 playwright），作为「普查守卫」（form-loop-sweep.test.mjs）的单一源：
//   · VALIDATION_SITES — 全站「提交/保存动作的字段级必填校验点」逐条登记。
//   · MACHINE_FLOWS   — 可自动化真机驱动的流程清单（含打开步骤 / 提交口 / 应报字段与载体）。
//
// ── 登记判据（class 定义）───────────────────────────────────────────────
//   命中以下任一形态，且文案**点名了一个具体字段/选择项**（可判定载体是否存在）即登记：
//     ① showToast('error'|'warn'|'warning', '...请填写/请输入/请选择/必须/不能为空/请先...')
//     ② showStatus('error', '...同上...')
//     ③ return { ok:false, error|message: '...同上...' }
//   语义上属于「状态守卫」（不点名字段，如「尚有 N 条未确认」「暂无可提交的考察」）不登记。
//
// ── machine 判据 ──────────────────────────────────────────────────────
//   machine:true  = 七演示账号之一登录后，能在页面上造出「空必填 + 点提交」并**看到载体**，
//                   已纳入 MACHINE_FLOWS 真机闭环（守卫断言 machine:true 条目必须全部出现在某流程 expect 里）。
//   machine:false = 确实无法自动化，**逐条写明 reason**（守卫断言每条 machine:false 都必须带非空 reason，
//                   防「白名单变垃圾桶」）。常见原因：原生 window.prompt 输入（无 DOM 载体）、
//                   需多角色同时在线、需先造复杂前置数据/进入详情浮态、字段默认预填故空表单不触发该分支、入口在议题详情内联区等。
//
// 注：file 为仓库根相对路径（正斜杠）；line 为登记时的近似行号（守卫**只按 file+field 断**，不按行号，容忍行号漂移）。
//
// ⚠ **保证范围（2026-09-15 批次 47-D 经 grill 后如实收紧）**：`machine: true` 的含义**仅**是——
//   「该字段的**必填校验分支**已在真机验证：**空提交会报出可见提示**，且该提示的**载体在位**」。
//   **它不保证成功路径**：填对后能否提交成功、是否落库、列表是否刷新——**均未覆盖**（已知盲区，`Q-23-44`）。
//   故读台账时**不得**把它读成「这条流程整体已被真机验证通过」：那是夸大，正是本仓库反复打击的「口径不实」。

/** 台账规模基线（守卫据此断言「不得静默缩水」；重构致减少须在同提交显式更新本基线并说明） */
export const SITES_BASELINE = 92;
export const FLOWS_BASELINE = 16;

// ── 全站字段级必填校验点台账 ────────────────────────────────────────────
// 字段：{ file, line, field, flow, machine, msg, reason? }
//   file   = `SRC + 相对路径`（**故意不写成一整串**：bump-version.mjs 给 server/test/*.mjs 补戳用的
//            正则会命中「任何含 `/src/….js` 的字符串」，一整串会被当成 import 规格符补上 `?v=`，
//            把**数据**改坏——2026-09-15 批次 44 真实事故：113 条 file 被补戳致 S4 报「文件不存在」。
//            拆成 `SRC + '...'` 后，字面量里不再出现 `/src/….js` 连写，补戳脚本无法命中，S4 另有防污染断言）
//   field  = 报错点名的字段中文名（守卫按 file+field 判定「是否纳入真机覆盖」）
//   msg    = 报文里出现的字面量（守卫据此校验 file 内确实存在该文案，防僵尸条目）
export const SRC = 'docs/src/';
export const VALIDATION_SITES = [
  // ── 支书台 ──
  { file: SRC + 'entries/tabs/secretary/notification-tab.js', line: 155, field: '通知标题', flow: 'secretary/通知发布', machine: true, msg: '请填写通知标题' },
  { file: SRC + 'entries/tabs/secretary/notification-tab.js', line: 156, field: '通知内容', flow: 'secretary/通知发布', machine: true, msg: '请填写通知内容' },
  { file: SRC + 'entries/tabs/secretary/notification-tab.js', line: 157, field: '目标受众', flow: 'secretary/通知发布', machine: true, msg: '请选择目标受众' },
  { file: SRC + 'entries/tabs/secretary/notification-tab.js', line: 311, field: '通知标题', flow: 'secretary/通知编辑浮窗', machine: true, msg: '请填写通知标题' },
  { file: SRC + 'entries/tabs/secretary/notification-tab.js', line: 312, field: '通知内容', flow: 'secretary/通知编辑浮窗', machine: true, msg: '请填写通知内容' },
  { file: SRC + 'entries/tabs/secretary/calendar-tab.js', line: 1076, field: '活动名称', flow: 'secretary/写入活动', machine: true, msg: '请填写活动名称' },
  { file: SRC + 'entries/tabs/secretary/calendar-tab.js', line: 1077, field: '日期', flow: 'secretary/写入活动', machine: false, msg: '请选择日期', reason: '表单日期字段默认预填当日，空表单不会触发该分支' },
  { file: SRC + 'entries/tabs/secretary/calendar-tab.js', line: 1078, field: '活动地点', flow: 'secretary/写入活动', machine: true, msg: '请填写活动地点' },
  { file: SRC + 'entries/tabs/secretary/calendar-tab.js', line: 1040, field: '目标阶段', flow: 'secretary/写入活动·议程待讨论名单', machine: false, msg: '待讨论名单请选择目标阶段', reason: '需先在议程行内选「待讨论名单」类型并经人员选择器选人，前置交互复杂' },
  { file: SRC + 'entries/tabs/secretary/report-up-tab.js', line: 122, field: '事项类型、标题与说明', flow: 'secretary/上报党委', machine: true, msg: '请填写事项类型、标题与说明' },
  { file: SRC + 'entries/tabs/secretary/assign-tab.js', line: 217, field: '被赋权人', flow: 'secretary/赋权管理', machine: false, msg: '请选择被赋权人', reason: '需在赋权表单内先选定场景/项目，字段联动，前置交互复杂' },
  { file: SRC + 'entries/tabs/secretary/assign-tab.js', line: 218, field: '项目', flow: 'secretary/赋权管理', machine: false, msg: '请选择项目', reason: '同上：赋权表单字段联动' },
  { file: SRC + 'entries/tabs/secretary/assign-tab.js', line: 219, field: '角色', flow: 'secretary/赋权管理', machine: false, msg: '请选择角色', reason: '同上：赋权表单字段联动' },
  { file: SRC + 'entries/tabs/secretary/assign-tab.js', line: 419, field: '同志', flow: 'secretary/赋权管理·党小组归组', machine: false, msg: '请选择同志', reason: '需先打开归组浮态并进入选择态' },
  { file: SRC + 'entries/tabs/secretary/assign-tab.js', line: 423, field: '党小组', flow: 'secretary/赋权管理·党小组归组', machine: false, msg: '请选择党小组', reason: '需先打开归组浮态并进入选择态' },
  { file: SRC + 'entries/tabs/secretary/group-progress-tab.js', line: 714, field: '组名', flow: 'secretary/党小组·新建', machine: false, msg: '组名不能为空', reason: '需先打开新建党小组浮态并进入输入态' },
  { file: SRC + 'entries/tabs/secretary/todo-tab.js', line: 767, field: '退回原因', flow: 'secretary/待办·退回', machine: false, msg: '请填写退回原因', reason: '需先有可退回的待办并打开退回浮态' },
  { file: SRC + 'entries/tabs/secretary/feedback-tab.js', line: 559, field: '评论内容', flow: 'secretary/反馈管理·议题评论', machine: false, msg: '请输入评论内容', reason: '入口在议题详情内联评论区，需先有议题并进入详情' },
  { file: SRC + 'entries/tabs/secretary/feedback-tab.js', line: 570, field: '批复内容', flow: 'secretary/反馈管理·议题批复', machine: false, msg: '请输入批复内容', reason: '入口在议题详情内联批复区，需先有议题并进入详情' },
  { file: SRC + 'entries/tabs/secretary/feedback-tab.js', line: 580, field: '正式答复内容', flow: 'secretary/反馈管理·正式答复', machine: false, msg: '请输入正式答复内容', reason: '入口在议题详情内联答复区，需先有议题并进入详情' },

  // ── 纪检委员台 ──
  { file: SRC + 'entries/tabs/disc/attendance-tab.js', line: 272, field: '会议活动', flow: 'disc/考勤管理·建考勤', machine: false, msg: '请选择会议活动', reason: '【批次 47-D 真机实测】表单默认预选首个会议活动（activityId 非空），故「空表单点提交」永远不触发该分支——实测先报的是下一条「请选择参会人员」；要触发须先把活动下拉清空，属另一条前置路径，本批不纳入' },
  { file: SRC + 'entries/tabs/disc/attendance-tab.js', line: 276, field: '参会人员', flow: 'disc/考勤管理·建考勤', machine: true, msg: '请选择参会人员' },

  // ── 组长台 ──
  { file: SRC + 'entries/tabs/leader/inspection-tab.js', line: 212, field: '来源类型', flow: 'leader/考察上传', machine: true, msg: '请选择来源类型' },
  { file: SRC + 'entries/tabs/leader/inspection-tab.js', line: 216, field: '具体来源', flow: 'leader/考察上传', machine: true, msg: '请选择具体来源' },
  { file: SRC + 'entries/tabs/leader/inspection-tab.js', line: 219, field: '人员', flow: 'leader/考察上传', machine: true, msg: '请选择人员' },
  { file: SRC + 'entries/tabs/leader/inspection-tab.js', line: 232, field: '考察内容（逐人）', flow: 'leader/考察上传', machine: true, msg: '的考察内容' },
  { file: SRC + 'entries/tabs/leader/attendance-tab.js', line: 272, field: '活动', flow: 'leader/考勤上传', machine: true, msg: '请选择活动' },
  { file: SRC + 'entries/tabs/leader/attendance-tab.js', line: 275, field: '参会人员', flow: 'leader/考勤上传', machine: true, msg: '请选择参会人员' },
  { file: SRC + 'entries/tabs/leader/attendance-tab.js', line: 388, field: '要应用的状态', flow: 'leader/考勤上传·批量改状态', machine: false, msg: '请先选择要应用的状态', reason: '需先有考勤记录并进入批量状态操作态' },
  { file: SRC + 'entries/tabs/leader/write-tab.js', line: 423, field: '宣传标题/材料名称', flow: 'leader/活动管理·子记录', machine: false, msg: '材料名称', reason: '需先打开活动的子记录内联表单（先有活动并进入详情）' },
  { file: SRC + 'entries/tabs/leader/write-tab.js', line: 868, field: 'T-0 日期', flow: 'leader/活动管理·发起活动', machine: false, msg: '请填写 T-0 日期', reason: '发起活动为「活动类型→形式→时长→发起方向」多步向导，前置交互复杂' },
  { file: SRC + 'entries/tabs/leader/write-tab.js', line: 869, field: '活动地点', flow: 'leader/活动管理·发起活动', machine: false, msg: '请填写活动地点', reason: '同上：多步向导，非空表单路径' },
  { file: SRC + 'entries/tabs/leader/write-tab.js', line: 870, field: '活动名称', flow: 'leader/活动管理·发起活动', machine: false, msg: '请填写活动名称', reason: '同上：多步向导，非空表单路径' },

  // ── 组织委员台 ──
  { file: SRC + 'entries/tabs/org/inspection-tab.js', line: 226, field: '专班', flow: 'org/考察上传', machine: true, msg: '请选择专班' },
  { file: SRC + 'entries/tabs/org/inspection-tab.js', line: 230, field: '人员', flow: 'org/考察上传', machine: true, msg: '请选择人员' },
  { file: SRC + 'entries/tabs/org/inspection-tab.js', line: 236, field: '考察内容（逐人）', flow: 'org/考察上传', machine: true, msg: '的考察内容' },
  { file: SRC + 'entries/tabs/org/taskforce-tab.js', line: 1318, field: '专班名称', flow: 'org/专班管理·发起专班', machine: true, msg: '请填写专班名称' },
  { file: SRC + 'entries/tabs/org/taskforce-tab.js', line: 1319, field: '任务描述', flow: 'org/专班管理·发起专班', machine: true, msg: '请填写任务描述' },
  { file: SRC + 'entries/tabs/org/taskforce-tab.js', line: 1320, field: '所需人数', flow: 'org/专班管理·发起专班', machine: true, msg: '请填写有效的所需人数' },
  { file: SRC + 'entries/tabs/org/taskforce-tab.js', line: 1321, field: '截止日期', flow: 'org/专班管理·发起专班', machine: true, msg: '请选择截止日期' },
  { file: SRC + 'entries/tabs/org/taskforce-tab.js', line: 626, field: '退回原因', flow: 'org/专班管理·退回', machine: false, msg: '请填写退回原因', reason: '退回原因取自原生 window.prompt 输入，页面无 DOM 载体可断言' },
  { file: SRC + 'entries/tabs/org/taskforce-tab.js', line: 674, field: '贡献说明', flow: 'org/专班管理·代录贡献', machine: true, msg: '请填写贡献说明' },
  { file: SRC + 'entries/tabs/org/taskforce-tab.js', line: 676, field: '要代录的成员', flow: 'org/专班管理·代录贡献', machine: true, msg: '请选择要代录的成员' },
  { file: SRC + 'entries/tabs/org/taskforce-tab.js', line: 886, field: '材料名称', flow: 'org/专班管理·材料', machine: false, msg: '请填写材料名称', reason: '需先进入专班材料上传内联态' },
  { file: SRC + 'entries/tabs/org/taskforce-tab.js', line: 977, field: '进度说明', flow: 'org/专班管理·添加进度', machine: true, msg: '请填写进度说明' },
  { file: SRC + 'entries/tabs/org/taskforce-tab.js', line: 1036, field: '专班复盘内容', flow: 'org/专班管理·提交复盘', machine: true, msg: '请填写专班复盘内容' },

  // ── 宣传委员台 ──
  { file: SRC + 'entries/tabs/prop/weekly-tab.js', line: 139, field: '周次标签', flow: 'prop/周报报送·新增周次', machine: false, msg: '请填写周次标签', reason: '周次标签默认按当前日期预填，空表单不触发该分支' },
  { file: SRC + 'entries/tabs/prop/weekly-tab.js', line: 140, field: '日期范围', flow: 'prop/周报报送·新增周次', machine: false, msg: '请填写日期范围', reason: '日期范围默认按当前周预填，空表单不触发该分支' },
  { file: SRC + 'entries/tabs/prop/weekly-tab.js', line: 167, field: '周报内容', flow: 'prop/周报报送', machine: true, msg: '请填写周报内容' },
  { file: SRC + 'entries/tabs/prop/archive-tab.js', line: 663, field: '关联活动', flow: 'prop/档案归档', machine: false, msg: '请先选择关联活动', reason: '需先进入归档表单态并选定关联活动' },
  { file: SRC + 'entries/tabs/prop/archive-tab.js', line: 667, field: '文件', flow: 'prop/档案归档', machine: false, msg: '请先选择文件', reason: '需先进入归档表单态并选定待归档文件（文件选择器不可脚本设值）' },

  // ── 党委台 ──
  { file: SRC + 'entries/tabs/party-committee/branches-tab.js', line: 138, field: '支部名称', flow: 'party-committee/支部管理·新建', machine: true, msg: '请填写支部名称' },
  { file: SRC + 'entries/tabs/party-committee/branches-tab.js', line: 156, field: '支部名称', flow: 'party-committee/支部管理·改名', machine: false, msg: '支部名称不能为空', reason: '需先展开某支部的改名行内表单态' },
  { file: SRC + 'entries/tabs/party-committee/branches-tab.js', line: 167, field: '新任支书', flow: 'party-committee/支部管理·任命', machine: false, msg: '请选择新任支书', reason: '需先展开任命行并勾选「就地任命首任骨干」' },
  { file: SRC + 'entries/tabs/party-committee/dispatch-tab.js', line: 92, field: '目标支部', flow: 'party-committee/下发通知', machine: false, msg: '请选择目标支部', reason: '目标支部默认全选（_readFormState 缺省回填全部支部），空表单点提交不会触发该分支' },
  { file: SRC + 'entries/tabs/party-committee/dispatch-tab.js', line: 93, field: '标题与正文', flow: 'party-committee/下发通知', machine: true, msg: '请填写标题与正文' },
  { file: SRC + 'entries/tabs/party-committee/review-tab.js', line: 100, field: '意见', flow: 'party-committee/上报审批·驳回', machine: false, msg: '驳回请填写意见', reason: '需先有支部上报事项并点「驳回」进入浮态' },

  // ── 成员（visitor）台 ──
  { file: SRC + 'entries/tabs/visitor/thought-report-tab.js', line: 120, field: '思想汇报内容', flow: 'visitor/思想汇报', machine: true, msg: '请填写思想汇报内容' },
  { file: SRC + 'entries/tabs/visitor/review-tab.js', line: 174, field: '复盘总结', flow: 'visitor/活动复盘', machine: false, msg: '请填写复盘总结', reason: '需先有可复盘活动并进入复盘文本态' },
  { file: SRC + 'entries/tabs/visitor/attendance-tab.js', line: 112, field: '补课说明', flow: 'visitor/考勤概况·补课申请', machine: false, msg: '请填写补课说明', reason: '需先发起补课申请并进入说明输入态' },

  // ── 跨台组件 / 服务 ──
  { file: SRC + 'components/issue-form.js', line: 90, field: '标题', flow: 'component/议题提交', machine: false, msg: '请输入标题', reason: '议题提交浮态，入口需从各台议题区打开' },
  { file: SRC + 'components/issue-form.js', line: 91, field: '正文', flow: 'component/议题提交', machine: false, msg: '请输入正文', reason: '同上：议题提交浮态' },
  { file: SRC + 'components/issue-form.js', line: 92, field: '范围', flow: 'component/议题提交', machine: false, msg: '请选择范围', reason: '同上：议题提交浮态' },
  { file: SRC + 'components/issue-detail.js', line: 240, field: '评论内容', flow: 'component/议题详情·评论', machine: false, msg: '请输入评论内容', reason: '入口在议题详情内联评论区，需先有议题' },
  { file: SRC + 'services/issues.js', line: 1115, field: '汇报内容', flow: 'service/一键汇报', machine: false, msg: '请填写汇报内容', reason: '一键汇报浮态由各台 extra 入口打开，需先进入浮态' },
  { file: SRC + 'services/issues.js', line: 1291, field: '评论内容', flow: 'service/议题评论', machine: false, msg: '请输入评论内容', reason: '需先有议题并进入评论态' },
  { file: SRC + 'services/issues.js', line: 1368, field: '评论内容', flow: 'service/议题评论', machine: false, msg: '请输入评论内容', reason: '需先有议题并进入评论态' },
  { file: SRC + 'services/issues.js', line: 1374, field: '处置结果内容', flow: 'service/议题处置', machine: false, msg: '请输入处置结果内容', reason: '需先有议题并进入处置态' },
  { file: SRC + 'services/issues.js', line: 1448, field: '说明内容', flow: 'service/议题说明', machine: false, msg: '请输入说明内容', reason: '需先有议题并进入说明态' },
  { file: SRC + 'components/report-entry.js', line: 99, field: '汇报内容', flow: 'component/一键汇报', machine: false, msg: '请填写汇报内容', reason: '一键汇报浮态，需先进入浮态' },
  { file: SRC + 'components/report-inbox.js', line: 217, field: '答复内容', flow: 'component/汇报收件箱·答复', machine: false, msg: '请填写答复内容', reason: '需先有收到的汇报并进入答复态' },
  { file: SRC + 'components/work-overview.js', line: 377, field: '汇报内容', flow: 'component/工作概况·汇报', machine: false, msg: '请填写汇报内容', reason: '汇报浮态，需先进入浮态' },
  { file: SRC + 'components/taskforce-view.js', line: 290, field: '产出说明', flow: 'component/专班查看·产出', machine: false, msg: '请填写产出说明', reason: '需先打开专班产出的内联提交态' },
  { file: SRC + 'components/resolution-followup-manager.js', line: 143, field: '待落实事项', flow: 'component/决议落实', machine: false, msg: '请填写待落实事项', reason: '需先有决议并进入落实拆分态' },
  { file: SRC + 'components/resolution-followup-manager.js', line: 144, field: '责任人', flow: 'component/决议落实', machine: false, msg: '请选择责任人', reason: '同上：决议落实拆分态' },
  { file: SRC + 'components/resolution-followup-manager.js', line: 145, field: '落实时限', flow: 'component/决议落实', machine: false, msg: '请选择落实时限', reason: '同上：决议落实拆分态' },
  { file: SRC + 'components/vote-widget.js', line: 79, field: '表态', flow: 'component/表决控件', machine: false, msg: '请先选择表态', reason: '需在表决控件内选人后进入表态态' },
  { file: SRC + 'components/inspector.js', line: 542, field: '表态', flow: 'component/活动巡查·表决', machine: false, msg: '请先选择表态', reason: '需在巡查面板表决控件内进入表态态' },
  { file: SRC + 'components/inspector.js', line: 1212, field: '活动名称', flow: 'component/活动巡查·内联新建', machine: false, msg: '请填写活动名称', reason: '巡查面板内联新建活动表单，需先进入该态' },
  { file: SRC + 'components/inspector.js', line: 1213, field: '日期', flow: 'component/活动巡查·内联新建', machine: false, msg: '请选择日期', reason: '同上：内联新建活动表单' },
  { file: SRC + 'components/inspector.js', line: 1214, field: '活动地点', flow: 'component/活动巡查·内联新建', machine: false, msg: '请填写活动地点', reason: '同上：内联新建活动表单' },
  { file: SRC + 'components/person-edit-modal.js', line: 272, field: '成员姓名', flow: 'component/人员编辑浮窗', machine: false, msg: '成员姓名不能为空', reason: '需先打开人员编辑浮窗' },
  { file: SRC + 'components/org-setup-wizard.js', line: 1296, field: '源支部', flow: 'component/组织配置向导', machine: false, msg: '请选择源支部', reason: '需进入支部配置向导的对应步（多步向导）' },
  { file: SRC + 'components/org-setup-wizard.js', line: 1307, field: '首任支书', flow: 'component/组织配置向导', machine: false, msg: '请选择首任支书', reason: '同上：多步向导' },
  { file: SRC + 'modules/references.js', line: 732, field: '标题', flow: 'module/制度参考·新建', machine: false, msg: '请填写标题', reason: '制度参考浮态，需先打开制度上传浮窗' },
  { file: SRC + 'modules/references.js', line: 735, field: '制度正文', flow: 'module/制度参考·新建', machine: false, msg: '请填写制度正文', reason: '同上：制度上传浮窗' },
  { file: SRC + 'modules/references.js', line: 737, field: '要上传的文件', flow: 'module/制度参考·新建', machine: false, msg: '请选择要上传的文件', reason: '同上：制度上传浮窗（文件选择器不可脚本设值）' },
  { file: SRC + 'modules/references.js', line: 839, field: '标题', flow: 'module/制度参考·新版本', machine: false, msg: '请填写标题', reason: '需先打开制度新版本浮窗' },
  { file: SRC + 'modules/references.js', line: 840, field: '新版正文', flow: 'module/制度参考·新版本', machine: false, msg: '请填写新版正文', reason: '同上：制度新版本浮窗' },
  { file: SRC + 'services/review.js', line: 144, field: '复盘总结', flow: 'service/活动复盘', machine: false, msg: '请填写复盘总结', reason: '需先有可复盘活动并进入复盘文本态' },
  { file: SRC + 'services/roster-ui-logic.js', line: 96, field: '成员姓名', flow: 'service/名册新增成员', machine: false, msg: '请填写成员姓名（必填）', reason: '需先打开名册新增成员表单态' },
  { file: SRC + 'entries/thought-report-entry.js', line: 319, field: '修改后的思想汇报内容', flow: '思想汇报页·修改', machine: false, msg: '请填写修改后的思想汇报内容', reason: '需先有已提交汇报并进入修改态（思想汇报详情页）' },
];

// ── 真机闭环流程清单 ────────────────────────────────────────────────────
// 每条：{ id, page, tab, open:[步骤], submit:[步骤], expect:[{ file, field, msg, carrier, satisfy? }] }
//   步骤语言（纯数据，由普查守卫解释执行）：
//     { click: '选择器' }                                    点击
//     { waitFor: '选择器' }                                  等待元素出现
//     { selectFirstOption: '选择器' }                        选中首个非空 option（派发 change）
//     { selectValue: { selector, value } }                   设值并派发 change
//     { openPicker: { trigger, count } }                     打开人员选择器→点选 count 人→关面板（复刻「关面板」病灶场景）
//     { setValue: { selector, value } }                      给输入控件设值并派发 input
//     { dispatchSubmit: '表单选择器' }                        派发 submit 事件（绕过原生 required 拦截直达应用层校验）
//   expect 条目：carrier = 该字段「可见载体」的选择器；msg = 应出现在可见提示里的字面量；satisfy = 满足该字段以推进到下一必填。
export const MACHINE_FLOWS = [
  {
    id: 'secretary-notification',
    page: 'secretary',
    tab: '通知发布',
    open: [],
    submit: [{ click: '[data-notif-action="publish"]' }],
    expect: [
      { file: SRC + 'entries/tabs/secretary/notification-tab.js', field: '通知标题', msg: '请填写通知标题', carrier: '#notif-title', satisfy: { setValue: { selector: '#notif-title', value: '表单闭环普查·通知' } } },
      { file: SRC + 'entries/tabs/secretary/notification-tab.js', field: '通知内容', msg: '请填写通知内容', carrier: '#notif-content', satisfy: { setValue: { selector: '#notif-content', value: '表单闭环普查正文' } } },
      { file: SRC + 'entries/tabs/secretary/notification-tab.js', field: '目标受众', msg: '请选择目标受众', carrier: '[data-notif-action="select-audience"]' },
    ],
  },
  {
    id: 'secretary-calendar-write',
    page: 'secretary',
    tab: '活动管理',
    open: [
      { click: '#ws-sec-write-btn' },
      { waitFor: '[data-action="select-template"]' },
      { click: '[data-action="select-template"]' },
      { waitFor: '#wp-title' },
    ],
    submit: [{ click: '[data-action="wp-submit"]' }],
    expect: [
      { file: SRC + 'entries/tabs/secretary/calendar-tab.js', field: '活动名称', msg: '请填写活动名称', carrier: '#wp-title', satisfy: { setValue: { selector: '#wp-title', value: '表单闭环普查活动' } } },
      { file: SRC + 'entries/tabs/secretary/calendar-tab.js', field: '活动地点', msg: '请填写活动地点', carrier: '#wp-location' },
    ],
  },
  {
    id: 'secretary-report-up',
    page: 'secretary',
    tab: '上报党委',
    open: [
      { click: '#rq-submit-toggle' },
      { waitFor: '#rq-form-submit' },
    ],
    submit: [{ click: '#rq-form-submit' }],
    expect: [
      { file: SRC + 'entries/tabs/secretary/report-up-tab.js', field: '事项类型、标题与说明', msg: '请填写事项类型、标题与说明', carrier: '#rq-title' },
    ],
  },
  {
    id: 'visitor-thought-report',
    page: 'visitor',
    tab: '思想汇报',
    open: [],
    submit: [{ click: '#tr-submit' }],
    expect: [
      { file: SRC + 'entries/tabs/visitor/thought-report-tab.js', field: '思想汇报内容', msg: '请填写思想汇报内容', carrier: '#tr-content' },
    ],
  },
  {
    id: 'prop-weekly',
    page: 'prop',
    tab: '周报报送',
    open: [],
    submit: [{ click: '#weekly-submit-btn' }],
    expect: [
      { file: SRC + 'entries/tabs/prop/weekly-tab.js', field: '周报内容', msg: '请填写周报内容', carrier: '#weekly-content' },
    ],
  },
  {
    id: 'pc-branches',
    page: 'party-committee',
    tab: '支部管理',
    open: [
      { click: '#branch-add-toggle' },
      { waitFor: '#branch-form-submit' },
    ],
    submit: [{ click: '#branch-form-submit' }],
    expect: [
      { file: SRC + 'entries/tabs/party-committee/branches-tab.js', field: '支部名称', msg: '请填写支部名称', carrier: '#branch-name-input' },
    ],
  },
  {
    id: 'pc-dispatch',
    page: 'party-committee',
    tab: '下发通知',
    open: [],
    submit: [{ click: '#dispatch-submit' }],
    expect: [
      { file: SRC + 'entries/tabs/party-committee/dispatch-tab.js', field: '标题与正文', msg: '请填写标题与正文', carrier: '#dispatch-title' },
    ],
  },
  {
    id: 'org-taskforce-recruit',
    page: 'org',
    tab: '专班管理',
    open: [
      { click: '#btn-publish-tf' },
      { waitFor: '#recruit-form' },
    ],
    // recruit 表单控件带原生 required：浏览器原生校验会先于 JS 校验拦截「点提交」，
    // 故派发 submit 事件直达应用层校验点（登记项即应用层 showToast）。
    submit: [{ dispatchSubmit: '#recruit-form' }],
    expect: [
      { file: SRC + 'entries/tabs/org/taskforce-tab.js', field: '专班名称', msg: '请填写专班名称', carrier: '#rf-name', satisfy: { setValue: { selector: '#rf-name', value: '表单闭环普查专班' } } },
      { file: SRC + 'entries/tabs/org/taskforce-tab.js', field: '任务描述', msg: '请填写任务描述', carrier: '#rf-task', satisfy: { setValue: { selector: '#rf-task', value: '普查用任务描述' } } },
      { file: SRC + 'entries/tabs/org/taskforce-tab.js', field: '所需人数', msg: '请填写有效的所需人数', carrier: '#rf-capacity', satisfy: { setValue: { selector: '#rf-capacity', value: '3' } } },
      { file: SRC + 'entries/tabs/org/taskforce-tab.js', field: '截止日期', msg: '请选择截止日期', carrier: '#rf-deadline' },
    ],
  },
  {
    id: 'leader-inspection',
    page: 'leader',
    tab: '考察上传',
    open: [
      { click: '#btn-leader-upload-insp' },
      { waitFor: '#insp-form-panel' },
    ],
    submit: [{ click: '#insp-form-submit' }],
    expect: [
      { file: SRC + 'entries/tabs/leader/inspection-tab.js', field: '来源类型', msg: '请选择来源类型', carrier: '#insp-source-type', satisfy: { selectValue: { selector: '#insp-source-type', value: 'activity' } } },
      { file: SRC + 'entries/tabs/leader/inspection-tab.js', field: '具体来源', msg: '请选择具体来源', carrier: '#insp-source-select', satisfy: { selectFirstOption: '#insp-source-select' } },
      { file: SRC + 'entries/tabs/leader/inspection-tab.js', field: '人员', msg: '请选择人员', carrier: '#insp-person-picker-container .person-picker-trigger', satisfy: { openPicker: { trigger: '#insp-person-picker-container .person-picker-trigger', count: 1 } } },
      { file: SRC + 'entries/tabs/leader/inspection-tab.js', field: '考察内容（逐人）', msg: '的考察内容', carrier: 'textarea[id^="insp-content-"]' },
    ],
  },
  {
    id: 'org-inspection',
    page: 'org',
    tab: '考察上传',
    open: [
      { click: '#btn-org-upload-insp' },
      { waitFor: '#org-insp-form-panel' },
    ],
    submit: [{ click: '#org-insp-form-submit' }],
    expect: [
      { file: SRC + 'entries/tabs/org/inspection-tab.js', field: '专班', msg: '请选择专班', carrier: '#org-insp-tf-select', satisfy: { selectFirstOption: '#org-insp-tf-select' } },
      { file: SRC + 'entries/tabs/org/inspection-tab.js', field: '人员', msg: '请选择人员', carrier: '#org-insp-person-picker-container .person-picker-trigger', satisfy: { openPicker: { trigger: '#org-insp-person-picker-container .person-picker-trigger', count: 1 } } },
      { file: SRC + 'entries/tabs/org/inspection-tab.js', field: '考察内容（逐人）', msg: '的考察内容', carrier: 'textarea[id^="org-insp-content-"]' },
    ],
  },
  {
    // 批次 47-D（支书 2026-09-15 裁定「item2 优先高频」）：**考勤上传**是本支部最高频的提交动作之一。
    // 原两条登记为 machine:false（reason：「需先进入考勤上传表单态」「需先选定活动并进入人员勾选态」）；
    // 47-D 侦察确认「进入表单态」有确定的真机路径：点 `#btn-leader-upload-att` → `#att-form-panel` 入 DOM。
    id: 'leader-attendance-upload',
    page: 'leader',
    tab: '考勤上传',
    open: [
      { click: '#btn-leader-upload-att' },
      { waitFor: '#att-form-panel' },
    ],
    submit: [{ click: '#att-form-submit' }],
    expect: [
      { file: SRC + 'entries/tabs/leader/attendance-tab.js', field: '活动', msg: '请选择活动', carrier: '#att-activity-select', satisfy: { selectFirstOption: '#att-activity-select' } },
      { file: SRC + 'entries/tabs/leader/attendance-tab.js', field: '参会人员', msg: '请选择参会人员', carrier: '#att-person-picker-container .person-picker-trigger' },
    ],
  },
  {
    // 批次 47-D：**纪检台 · 考勤管理 · 建考勤**（与组长台同属「考勤」高频动作，但**表单不同构**——
    // 纪检台是「分段式」页签（`#att-segment-body`）+ 翻转开关 `#disc-meet-toggle`（模块级 `_meetFormVisible`
    // 初值 false，故点一次即展开，与组长台一致）；载体 id 前缀是 `disc-meet-*` 而非 `att-*`，勿混用。
    id: 'disc-meeting-attendance',
    page: 'disc',
    tab: '考勤管理',
    open: [
      { click: '#disc-meet-toggle' },
      { waitFor: '#disc-meet-submit' },
    ],
    submit: [{ click: '#disc-meet-submit' }],
    // 注：**「请选择会议活动」一支不可达**——表单默认预选首个活动（`#disc-meet-activity` 非空），
    // 故本流程只断可达的那条（参会人员）；该条登记项已据实测退回 machine:false 并写明原因（见 VALIDATION_SITES）。
    expect: [
      { file: SRC + 'entries/tabs/disc/attendance-tab.js', field: '参会人员', msg: '请选择参会人员', carrier: '#disc-meet-picker .person-picker-trigger' },
    ],
  },
  {
    // 批次 47-D：**支书台 · 通知编辑浮窗**——支书点名的高频「通知」域（发布已在册，编辑是其二）。
    // ⚠ 关键：编辑浮窗**预填**原值 → 必须在 open 里**先清空**标题与正文，否则「请填写…」两支
    //   都**不可达**（空表单也非空）。runStep 支持 `setValue`（设 .value 并发 input 事件）。
    id: 'secretary-notice-edit',
    page: 'secretary',
    tab: '通知发布',
    open: [
      { click: '[data-notif-action="edit"]' },
      { waitFor: '#ne-save' },
      { setValue: { selector: '#ne-title', value: '' } },
      { setValue: { selector: '#ne-content', value: '' } },
    ],
    submit: [{ click: '#ne-save' }],
    expect: [
      { file: SRC + 'entries/tabs/secretary/notification-tab.js', field: '通知标题', msg: '请填写通知标题', carrier: '#ne-title', satisfy: { setValue: { selector: '#ne-title', value: '临时标题' } } },
      { file: SRC + 'entries/tabs/secretary/notification-tab.js', field: '通知内容', msg: '请填写通知内容', carrier: '#ne-content' },
    ],
  },
  {
    // 批次 47-D：**组织台 · 专班管理 · 代录贡献**——一个表单覆盖 **2 处**校验点（贡献说明 → 代录成员）。
    // 前置：代录块只在**「运行中」专班**的详情面板里出现 → open 先点 `#tf-bucket-active` 里的卡片
    //   （看板分区 key 见 taskforce-tab.js::BUCKETS；发布前该面板 `#tf-detail-panel` 是 hidden）。
    // 判据顺序（源码 674 先于 676）：说明先判、成员后判 → expect 顺序即此。
    id: 'org-taskforce-contribution',
    page: 'org',
    tab: '专班管理',
    open: [
      { click: '#tf-bucket-active .tf-store-card' },
      { waitFor: '#btn-add-tf-contrib' },
    ],
    submit: [{ click: '#btn-add-tf-contrib' }],
    expect: [
      { file: SRC + 'entries/tabs/org/taskforce-tab.js', field: '贡献说明', msg: '请填写贡献说明', carrier: '#tf-contrib-desc', satisfy: { setValue: { selector: '#tf-contrib-desc', value: '代录：完成活动策划与执行排期' } } },
      { file: SRC + 'entries/tabs/org/taskforce-tab.js', field: '要代录的成员', msg: '请选择要代录的成员', carrier: '#tf-contrib-picker .person-picker-trigger' },
    ],
  },
  {
    // 批次 47-D：**组织台 · 专班管理 · 添加进度**——与「代录贡献」**共用同一条 open 链**
    // （同为「运行中」专班的详情面板），故边际成本极低；这是本批「一个面板多块」的收益点。
    id: 'org-taskforce-progress',
    page: 'org',
    tab: '专班管理',
    open: [
      { click: '#tf-bucket-active .tf-store-card' },
      { waitFor: '#btn-add-tf-progress' },
    ],
    submit: [{ click: '#btn-add-tf-progress' }],
    expect: [
      { file: SRC + 'entries/tabs/org/taskforce-tab.js', field: '进度说明', msg: '请填写进度说明', carrier: '#tf-progress-note' },
    ],
  },
  {
    // 批次 47-D：**组织台 · 专班管理 · 提交复盘**——与 ④⑤ **同面板**（「运行中」专班详情），
    // 一并覆盖即「一个 open 链 × 三块」，是本批最省的取法。提交钮 `#btn-submit-tf-review`（源码 1028）。
    id: 'org-taskforce-review',
    page: 'org',
    tab: '专班管理',
    open: [
      { click: '#tf-bucket-active .tf-store-card' },
      { waitFor: '#btn-submit-tf-review' },
    ],
    submit: [{ click: '#btn-submit-tf-review' }],
    expect: [
      { file: SRC + 'entries/tabs/org/taskforce-tab.js', field: '专班复盘内容', msg: '请填写专班复盘内容', carrier: '#tf-review-content' },
    ],
  },
];
