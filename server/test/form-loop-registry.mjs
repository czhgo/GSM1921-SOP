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
// 注：file 为仓库根相对路径（正斜杠）；line 为登记时的近似行号（守卫**只按 file+field 断**，不按行号，容忍行号未同步）。
//
// ⚠ **保证范围（2026-09-15 批次 47-D 经 grill 后如实收紧）**：`machine: true` 的含义**仅**是——
//   「该字段的**必填校验分支**已在真机验证：**空提交会报出可见提示**，且该提示的**载体在位**」。
//   **它不保证成功路径**：填对后能否提交成功、是否落库、列表是否刷新——**均未覆盖**（已知盲区，`Q-23-44`）。
//   故读台账时**不得**把它读成「这条流程整体已被真机验证通过」：那是夸大，正是本仓库反复打击的「口径不实」。
//
// ⚠ **成功路径另有清单（`Q-23-44`，2026-09-16 起）**：本文件末尾的 `SUCCESS_FLOWS` 专管「填对之后成不成」，
//   与 `MACHINE_FLOWS` **互不蕴含**——**要判一条流程整体已被真机验证，必须两处都命中**。

/** 台账规模基线（守卫据此断言「不得静默缩水」；重构致减少须在同提交显式更新本基线并说明） */
// 批次 120（2026-09-21）：照片墙「上传照片」浮窗新增 1 处校验点（图片）+ 1 条真机流程 ⇒ 基线同上调。
// 批次 124（2026-09-21）：会议考勤上传主体收归「该场会议组织者」（`D-547`）⇒ 原 `disc-meeting-attendance`
//   流程退役（表单在演示数据下无人可上传、结构性不可达）⇒ **FLOWS_BASELINE 55 → 54**（校验点台账条数不变，
//   只把该表单的两条由 machine:true 转 machine:false 并写明理由）。
export const SITES_BASELINE = 94;
export const FLOWS_BASELINE = 54;

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
  { file: SRC + 'entries/tabs/secretary/notification-tab.js', line: 180, field: '通知标题', flow: 'secretary/通知发布', machine: true, msg: '请填写通知标题' },
  { file: SRC + 'entries/tabs/secretary/notification-tab.js', line: 181, field: '通知内容', flow: 'secretary/通知发布', machine: true, msg: '请填写通知内容' },
  { file: SRC + 'entries/tabs/secretary/notification-tab.js', line: 182, field: '目标受众', flow: 'secretary/通知发布', machine: true, msg: '请选择目标受众' },
  { file: SRC + 'entries/tabs/secretary/notification-tab.js', line: 344, field: '通知标题', flow: 'secretary/通知编辑浮窗', machine: true, msg: '请填写通知标题' },
  { file: SRC + 'entries/tabs/secretary/notification-tab.js', line: 345, field: '通知内容', flow: 'secretary/通知编辑浮窗', machine: true, msg: '请填写通知内容' },
  // 批次 91（2026-09-19 · SOP-B-17）：**本组通知的组织者发布口**（服务层单实现的浮窗，
  //   入口在成员台「活动动态」/ 组长台「活动管理」的活动行上，只对该场组织者本人出现）。
  //   `machine:false` 的原因是**前置数据随赋权而变**：要跑到这处校验，须先在同一演示库里造出
  //   「该演示账号恰是某场活动组织者」的稳定前置（7 个演示账号的组织者身份随库内容变化），
  //   故本批只登记、不造数据（同 `components/resolution-followup-manager.js` 由「造出真机可达且自洽的前置」解锁的前例）。
  { file: SRC + 'services/notice.js', line: 862, field: '通知标题（本组通知）', flow: 'service/本组通知发布', machine: false, msg: '请填写通知标题', reason: '【批次 91 新增 · 待解锁】入口是「发布本组通知」浮窗，只对**本人为该场活动组织者**的活动行出现（`services/activity.js::isActivityOrganizer` 实时判）；演示库里该条件随赋权数据变化，7 个演示账号不保证命中 ⇒ 造不出稳定前置。**这不是「结构性不可达」**（只要有一条该账号为组织者的活动即达），属「缺稳定数据」，与 `machine:false` 白名单里「需先造复杂前置数据」同类。' },
  { file: SRC + 'services/notice.js', line: 863, field: '通知内容（本组通知）', flow: 'service/本组通知发布', machine: false, msg: '请填写通知内容', reason: '同上：与本条同属一个浮窗（标题通过后才会走到内容这一格），入口条件相同（本人为该场组织者），本批只登记、不造数据。' },
  { file: SRC + 'entries/tabs/secretary/calendar-tab.js', line: 1092, field: '活动名称', flow: 'secretary/写入活动', machine: true, msg: '请填写活动名称' },
  { file: SRC + 'entries/tabs/secretary/calendar-tab.js', line: 1093, field: '日期', flow: 'secretary/写入活动', machine: true, msg: '请选择日期' },
  { file: SRC + 'entries/tabs/secretary/calendar-tab.js', line: 1094, field: '活动地点', flow: 'secretary/写入活动', machine: true, msg: '请填写活动地点' },
  // 批次 47-M（2026-09-16）：原 reason「前置交互复杂」**又一次是读起来复杂**——真机实测三段全可脚本化：
  //   ① 议程行**出厂即有一条**（模板选中后 `#wp-agenda-list` 内已有 `.wp-agenda-row`）；
  //   ② 「待讨论名单」只是行内一个 chip（`.wp-agenda-kind[data-kind="attendee-list"]`，点一下即亮）；
  //   ③ 多选人员走通用 `openPicker`（复用考察上传同一步骤）。三字段（名称/日期/地点）用 satisfy 顺序放行即可达。
  { file: SRC + 'entries/tabs/secretary/calendar-tab.js', line: 1056, field: '目标阶段', flow: 'secretary/写入活动·议程待讨论名单', machine: true, msg: '待讨论名单请选择目标阶段' },
  { file: SRC + 'entries/tabs/secretary/report-up-tab.js', line: 122, field: '事项类型、标题与说明', flow: 'secretary/上报党委', machine: true, msg: '请填写事项类型、标题与说明' },
  { file: SRC + 'entries/tabs/secretary/assign-tab.js', line: 217, field: '被赋权人', flow: 'secretary/赋权管理·项目赋权', machine: true, msg: '请选择被赋权人' },
  { file: SRC + 'entries/tabs/secretary/assign-tab.js', line: 218, field: '项目', flow: 'secretary/赋权管理·项目赋权', machine: true, msg: '请选择项目' },
  { file: SRC + 'entries/tabs/secretary/assign-tab.js', line: 219, field: '角色', flow: 'secretary/赋权管理·项目赋权', machine: true, msg: '请选择角色' },
  { file: SRC + 'entries/tabs/secretary/assign-tab.js', line: 419, field: '同志', flow: 'secretary/赋权管理·常设赋权', machine: true, msg: '请选择同志' },
  { file: SRC + 'entries/tabs/secretary/assign-tab.js', line: 423, field: '党小组', flow: 'secretary/赋权管理·常设赋权', machine: true, msg: '请选择党小组' },
  { file: SRC + 'entries/tabs/secretary/group-progress-tab.js', line: 714, field: '组名', flow: 'secretary/党小组·改名', machine: true, msg: '组名不能为空' },
  // 批次 47-Z（2026-09-17）：**由 `machine:false` 转 `machine:true`**。原 reason 两句话各有问题，逐句更正：
  //   · 对的一半：「退回浮态（`#mc-reject-note`）只在**有 pending 成员变更确认**时挂载」——实测计数 0 属实。
  //   · 错的一半：「纳入条件：**组织委员**在某台发起一次成员变更」——**跨人不成立**。该队列是
  //     **纯客户端**的（`mockDB.pendingMemberConfirmations` + 自管 localStorage 键 `gsm1921-member-confirmations`；
  //     `member-confirmation.js` 无任何服务端表，mock/api 两态同源）⇒ 请求只存在于**产生它的那个浏览器会话**里，
  //     **组织委员在另一台发起、支书这边根本看不到**。真正的前置是「**同一会话内先产生过一条请求**」。
  //   · 可达链（本批真机跑通）：支书本人也有该写权（`person-entry.js::EDIT_ROLES = 支书/副支书/组织委员`）⇒
  //     `person.html?id=p7` → 编辑档案 → 改「发展阶段」→ 保存（报出「已报送支书确认 1 项」）→ 回支书台「待办」→
  //     `[data-mc-id][data-decision="rejected"]` 即在位。**无需造种子、无需改产品、无需跨角色会话**。
  { file: SRC + 'entries/tabs/secretary/todo-tab.js', line: 672, field: '退回原因', flow: 'secretary/待办·退回', machine: true, msg: '请填写退回原因' },
  { file: SRC + 'entries/tabs/secretary/feedback-tab.js', line: 559, field: '评论内容', flow: 'secretary/反馈管理·议题评论', machine: true, msg: '请输入评论内容' },
  { file: SRC + 'entries/tabs/secretary/feedback-tab.js', line: 570, field: '批复内容', flow: 'secretary/反馈管理·议题批复', machine: true, msg: '请输入批复内容' },
  { file: SRC + 'entries/tabs/secretary/feedback-tab.js', line: 580, field: '正式答复内容', flow: 'secretary/反馈管理·正式答复', machine: true, msg: '请输入正式答复内容' },

  // ── 纪检委员台 ──
  // 批次 124（2026-09-21）：会议考勤上传主体收归「该场会议组织者」（支书 2026-09-20 定案，落地 `D-547`）
  //   ⇒ 纪检台「会议考勤录入」表单只列**本人可上传**的会议场次；演示数据里纪检（p10）不持任何会议
  //   场次的上传位 ⇒ 表单长期空态、这两条校验分支**真机不可达**（原流程 `disc-meeting-attendance` 随之退役）。
  //   **同形态的两条校验未失覆盖**：组织者上传位（组长台「考勤上传」）的「活动 / 参会人员」两条仍 machine:true。
  { file: SRC + 'entries/tabs/disc/attendance-tab.js', line: 302, field: '会议活动', flow: 'disc/考勤管理·建考勤', machine: false, reason: '上传位已收归该场会议组织者（批次 124 定案）；演示数据下纪检不持任何会议场次的上传位 ⇒ 该表单为空态、本分支不可达。同形态校验由 leader/考勤上传 覆盖。', msg: '请选择会议活动' },
  { file: SRC + 'entries/tabs/disc/attendance-tab.js', line: 306, field: '参会人员', flow: 'disc/考勤管理·建考勤', machine: false, reason: '同上（同一表单空态 ⇒ 两条校验同源不可达）。', msg: '请选择参会人员' },

  // ── 组长台 ──
  { file: SRC + 'entries/tabs/leader/inspection-tab.js', line: 273, field: '来源类型', flow: 'leader/考察上传', machine: true, msg: '请选择来源类型' },
  { file: SRC + 'entries/tabs/leader/inspection-tab.js', line: 277, field: '具体来源', flow: 'leader/考察上传', machine: true, msg: '请选择具体来源' },
  { file: SRC + 'entries/tabs/leader/inspection-tab.js', line: 280, field: '人员', flow: 'leader/考察上传', machine: true, msg: '请选择人员' },
  { file: SRC + 'entries/tabs/leader/inspection-tab.js', line: 293, field: '考察内容（逐人）', flow: 'leader/考察上传', machine: true, msg: '的考察内容' },
  { file: SRC + 'entries/tabs/leader/attendance-tab.js', line: 365, field: '活动', flow: 'leader/考勤上传', machine: true, msg: '请选择活动' },
  { file: SRC + 'entries/tabs/leader/attendance-tab.js', line: 368, field: '参会人员', flow: 'leader/考勤上传', machine: true, msg: '请选择参会人员' },
  { file: SRC + 'entries/tabs/leader/attendance-tab.js', line: 500, field: '要应用的状态', flow: 'leader/考勤上传·批量改状态', machine: true, msg: '请先选择要应用的状态' },
  // 批次 47-M（2026-09-16）：**组长台 · 活动管理 · 活动详情「添加子记录」内联表单**（D7 后仅剩宣传/材料两类）。
  // ⚠ 原 reason「需先打开活动的子记录内联表单（先有活动并进入详情）」把**两步点击**当成了不可自动化——
  //   真机实测：`.leader-act-item` **10 个**、活动详情内 `.act-sub-add-btn[data-type="publicity"]` **1 个**，
  //   点它即渲染 `.record-form-shell`（含 `.f-title` 与 `.record-save-btn`）。两步点击＝可脚本化，**不是障碍**。
  //   报文是**动态拼接**（`请填写${type==='publicity'?'宣传标题':'材料名称'}`）→ 本流程覆盖宣传分支，
  //   故 flow 里断言的是拼好的整串「请填写宣传标题」（登记项 `msg` 仍取文件中真实存在的字面量「材料名称」）。
  { file: SRC + 'entries/tabs/leader/write-tab.js', line: 473, field: '宣传标题/材料名称', flow: 'leader/活动管理·子记录', machine: true, msg: '材料名称' },
  { file: SRC + 'entries/tabs/leader/write-tab.js', line: 997, field: 'T-0 日期', flow: 'leader/活动管理·发起活动', machine: true, msg: '请填写 T-0 日期' },
  { file: SRC + 'entries/tabs/leader/write-tab.js', line: 998, field: '活动地点', flow: 'leader/活动管理·发起活动', machine: true, msg: '请填写活动地点' },
  { file: SRC + 'entries/tabs/leader/write-tab.js', line: 999, field: '活动名称', flow: 'leader/活动管理·发起活动', machine: true, msg: '请填写活动名称' },

  // ── 组织委员台 ──
  { file: SRC + 'entries/tabs/org/inspection-tab.js', line: 256, field: '专班', flow: 'org/考察上传', machine: true, msg: '请选择专班' },
  { file: SRC + 'entries/tabs/org/inspection-tab.js', line: 260, field: '人员', flow: 'org/考察上传', machine: true, msg: '请选择人员' },
  { file: SRC + 'entries/tabs/org/inspection-tab.js', line: 266, field: '考察内容（逐人）', flow: 'org/考察上传', machine: true, msg: '的考察内容' },
  { file: SRC + 'entries/tabs/org/taskforce-tab.js', line: 1318, field: '专班名称', flow: 'org/专班管理·发起专班', machine: true, msg: '请填写专班名称' },
  { file: SRC + 'entries/tabs/org/taskforce-tab.js', line: 1319, field: '任务描述', flow: 'org/专班管理·发起专班', machine: true, msg: '请填写任务描述' },
  { file: SRC + 'entries/tabs/org/taskforce-tab.js', line: 1320, field: '所需人数', flow: 'org/专班管理·发起专班', machine: true, msg: '请填写有效的所需人数' },
  { file: SRC + 'entries/tabs/org/taskforce-tab.js', line: 1321, field: '截止日期', flow: 'org/专班管理·发起专班', machine: true, msg: '请选择截止日期' },
  { file: SRC + 'entries/tabs/org/taskforce-tab.js', line: 626, field: '退回原因', flow: 'org/专班·退回补料', machine: true, msg: '请填写退回原因' },
  { file: SRC + 'entries/tabs/org/taskforce-tab.js', line: 674, field: '贡献说明', flow: 'org/专班管理·代录贡献', machine: true, msg: '请填写贡献说明' },
  { file: SRC + 'entries/tabs/org/taskforce-tab.js', line: 676, field: '要代录的成员', flow: 'org/专班管理·代录贡献', machine: true, msg: '请选择要代录的成员' },
  { file: SRC + 'entries/tabs/org/taskforce-tab.js', line: 886, field: '材料名称', flow: 'org/专班管理·材料', machine: true, msg: '请填写材料名称' },
  { file: SRC + 'entries/tabs/org/taskforce-tab.js', line: 977, field: '进度说明', flow: 'org/专班管理·添加进度', machine: true, msg: '请填写进度说明' },
  { file: SRC + 'entries/tabs/org/taskforce-tab.js', line: 1036, field: '专班复盘内容', flow: 'org/专班管理·提交复盘', machine: true, msg: '请填写专班复盘内容' },

  // ── 宣传委员台 ──
  { file: SRC + 'entries/tabs/prop/weekly-tab.js', line: 166, field: '周次标签', flow: 'prop/周报报送·新增周次', machine: true, msg: '请填写周次标签' },
  { file: SRC + 'entries/tabs/prop/weekly-tab.js', line: 167, field: '日期范围', flow: 'prop/周报报送·新增周次', machine: true, msg: '请填写日期范围' },
  { file: SRC + 'entries/tabs/prop/weekly-tab.js', line: 207, field: '周报内容', flow: 'prop/周报报送', machine: true, msg: '请填写周报内容' },
  // 批次 47-M（2026-09-16）：**宣传委员台 · 档案归档 · 上传宣传材料浮窗**——一条流程覆盖该浮窗**两处**校验点。
  // ⚠ 台账原挂 machine:false 的两条理由都被真机证伪，且**证伪方式与 47-K「制度参考写入」完全同款**：
  //   ①「文件（文件选择器不可脚本设值）」——**把手段当成了结论**：该支只需文件**为空**即报，
  //     根本不必给 file input 设值（同 47-K 的「要上传的文件」原话）。**「某控件设不了值」≠「该分支测不了」。**
  //   ②「关联活动（需先进入归档表单态并选定关联活动）」——真机实测：入口 `#archive-upload-btn`（计数 1、可见）
  //     点一下浮窗即在位，`#upload-activity` 出厂首项即空值「请选择关联活动」⇒ **空提交就报**，无需先选定。
  //   ⚠ 注意与 47-K 的差别：**这条也是 47-K 那条教训的第二次犯**（同一类理由、同一类证伪）——
  //     「理由即解法」若只在个案上纠正、不升格成普查项，就会一条条复发。
  { file: SRC + 'entries/tabs/prop/archive-tab.js', line: 824, field: '关联活动', flow: 'prop/档案归档', machine: true, msg: '请先选择关联活动' },
  { file: SRC + 'entries/tabs/prop/archive-tab.js', line: 828, field: '文件', flow: 'prop/档案归档', machine: true, msg: '请先选择文件' },
  // 批次 120（2026-09-21）：**照片墙 · 上传照片浮窗**（支书定案「建，并入档案归档」）。
  //   取齐决定＝文件走既有上传接口（不在记录内放 base64）⇒ 该浮窗只有**一处**必填校验点：
  //   图片为空即报（日期出厂即今天、标题/主体可空，故无第二处）。行号随本批在 `renderContent`
  //   插入照片墙区块而整体下移，**同批同步**（批次 49 立的 S6 判据：行号必须精确命中）。
  { file: SRC + 'entries/tabs/prop/archive-tab.js', line: 1220, field: '图片', flow: 'prop/照片墙', machine: true, msg: '请先选择图片' },

  // ── 党委台 ──
  { file: SRC + 'entries/tabs/party-committee/branches-tab.js', line: 138, field: '支部名称', flow: 'party-committee/支部管理·新建', machine: true, msg: '请填写支部名称' },
  { file: SRC + 'entries/tabs/party-committee/branches-tab.js', line: 156, field: '支部名称', flow: 'party-committee/支部管理·改名', machine: true, msg: '支部名称不能为空' },
  { file: SRC + 'entries/tabs/party-committee/branches-tab.js', line: 167, field: '新任支书', flow: 'party-committee/支部管理·任命', machine: true, msg: '请选择新任支书' },
  { file: SRC + 'entries/tabs/party-committee/dispatch-tab.js', line: 92, field: '目标支部', flow: 'party-committee/下发通知', machine: true, msg: '请选择目标支部' },
  { file: SRC + 'entries/tabs/party-committee/dispatch-tab.js', line: 93, field: '标题与正文', flow: 'party-committee/下发通知', machine: true, msg: '请填写标题与正文' },
  // 批次 47-P（2026-09-16）：**党委台 · 上报审批 · 驳回意见**——本条是「**改种子解锁一条**」的首个样本。
  // ⚠ 原 reason 是这样写的：「实测 `[data-rq-act="reject"]` 计数 **0**——驳回按钮只在**待批复**的支部上报事项上渲染，
  //   而种子无『支部上报党委』条目」。**这句实测是对的，但停在「现象」就下了结论**——
  //   真问题是：**这个「前置」在 mock 与 api 两形态下都恒不存在**（`docs/src/mock/seed.js` 无上报种子、
  //   `server/seed.js` 也未播种 `review_requests`）⇒ 支书在党委台**永远点不到「驳回」**，
  //   而这个「够不到」被记成了一条无害的白名单理由（正是 47-M 那条教训的翻版：**白名单会掩盖病灶**）。
  // 处置（支书 2026-09-16 裁定「允许改种子」）：补 `SEED_REVIEW_REQUESTS`（pending 一条）并**两形态同源**播种
  //   （mock 走 `mock-adapter._seedInitialData()`、api 走 `server/seed.js`，都读 `mock/seed.js` 这一份），
  //   于是本条从「够不到」变成「真机可达」。
  // ⚠ **为什么必须两形态都种**：只种 mock 会让守卫变绿而支书在真实（api）演示里依旧点不到——
  //   那正是本仓库最忌讳的**假绿**。种子的「单一源」不是整洁癖，是「真机可达」这句话成立的前提。
  // ★ **本条流程首跑即红，抓出第二个真 bug**（与 47-M 的 `showToast` 未导入**同族但不同病**）：
  //   本处三处 `showToast('文案')` 是**单参调用**，而接口是 `showToast(type, message)` ⇒ 整句文案被当成
  //   **type**（不在 COLORS 表 ⇒ 回落 `info`），`message` 为 `undefined` ⇒ 用户看到的是一条
  //   **只有图标、没有文字**的蓝点气泡（真机读到的 `textContent` 恰好是 `'i'`——就是那个图标字符）。
  //   后果分两半：① 驳回失败时**「为什么不让驳回」一字不说**；② 批准/驳回**成功后也看不到任何结论**。
  //   ⚠ 三点方法论：**(a)** 这类病灶**不是异常** ⇒ R-71 的 `pageerror` 判据**看不见它**；
  //   **(b)** 它**不是缺导入** ⇒ 47-M 那类静态扫描也看不见；
  //   **(c)** 唯一抓住它的是「**把提示文案本身当断言对象**」的真机判据——**机器读到的是空文本，人才会说「怎么只弹了个 i」**。
  //   ⇒ 已有静态守卫 `ux-guard ⑥`（showToast 调用约定，防「参数写反」）**只匹配两参形态**，单参从它眼皮下走过；
  //     本批已**在同一守卫里补上「参数个数」这一维**（原判据的盲区）。三处已修（补 type）。
  { file: SRC + 'entries/tabs/party-committee/review-tab.js', line: 104, field: '意见', flow: 'party-committee/上报审批·驳回', machine: true, msg: '驳回请填写意见' },

  // ── 成员（visitor）台 ──
  { file: SRC + 'entries/tabs/visitor/thought-report-tab.js', line: 129, field: '思想汇报内容', flow: 'visitor/思想汇报', machine: true, msg: '请填写思想汇报内容' },
  { file: SRC + 'entries/tabs/visitor/review-tab.js', line: 182, field: '复盘总结', flow: 'visitor/活动复盘', machine: true, msg: '请填写复盘总结' },
  { file: SRC + 'entries/tabs/visitor/attendance-tab.js', line: 142, field: '补课说明', flow: 'visitor/考勤概况·补课申请', machine: true, msg: '请填写补课说明' },

  // ── 跨台组件 / 服务 ──
  { file: SRC + 'components/issue-form.js', line: 100, field: '标题', flow: 'component/议题提交', machine: true, msg: '请输入标题' },
  { file: SRC + 'components/issue-form.js', line: 101, field: '正文', flow: 'component/议题提交', machine: true, msg: '请输入正文' },
  { file: SRC + 'components/issue-form.js', line: 102, field: '范围', flow: 'component/议题提交', machine: true, msg: '请选择范围' },
  // 批次 47-M（2026-09-16）：**独立页 `docs/feedback.html?id=<议题>` 的议题详情评论区**（`components/issue-detail.js`）。
  // ⚠ 与支书台「反馈管理」的 `secretary-feedback-issue-detail` **是两处真实调用点**：feedback-tab.js 自带一份
  //   内联 `renderIssueDetail`（用自己的 `#issue-comment-input`），本组件是**独立页那一份**（`#comment-input`）。
  //   原 reason「入口在议题详情内联评论区，需先有议题」——「先有议题」由种子提供（`docs/data/issues.json`
  //   播了 issue-001~004），而详情页**支持 `?id=` 深链直达**，两者都不构成障碍。
  { file: SRC + 'components/issue-detail.js', line: 254, field: '评论内容', flow: 'component/议题详情·评论', machine: true, msg: '请输入评论内容' },
  // 批次 47-M（2026-09-16）：**「我的处置」tab** 一栏三区（`services/issues.js` 内三份渲染各自的内联动作）。
  // 实测：组长台「我的处置」① 待处置事项 **1 行**，点行进详情即 `#mydispatch-comment-input` + 「评论」+「提交处置结果」
  //   ⇒ 1428（评论）与 1434（处置结果）**同面板两个提交口，一条流程覆盖**（用 `expect[].submit`）。
  // ⚠ 同文件另三处（「请我汇报」行内 1175 / 我发起的汇报详情 1351 / 我提交的反馈详情 1508）
  //   出没取决于**种子把哪条议题挂到演示账号头上**（`requestedBy` / `submittedBy` / 我提交或参与）
  //   ⇒ **同文件不同区，可达性不同**，故**逐条**登记，而不是按文件一刀切。
  //   **1428/1434 与 1175/1351 的关系亦是如此**：1428/1434（③区待处置详情）种子本就挂了数据、
  //   自 47-M 起为 `machine:true`；1175/1351 曾长期为空，**批 47-Q 补种子后一并转 `machine:true`**。
  //   1508（④区「我提交/参与的反馈」）**至今未解锁**——它的口径与公开匿名反馈域相冲（详见该条 reason）。
  //   ★ 批次 48（2026-09-17，支书裁定 `Q-23-48`「**接受缺口 + 改文案**」）：**本条不再往「解锁」方向走**——
  //     缺口已裁定为「产品接受」：④区在 api 形态下**结构上恒为空**（服务端真匿名脱敏抹掉认人字段，
  //     而 `getMyIssues` 恰排除 `kind:'report'`），故**改文案说清口径**（`services/issues.js` ④区说明行 +
  //     `help.html` 两处 + `README-members.md`），而**不改服务端隐私口径、也不造种子**（造了也只能在 mock 形态显形＝假绿）。
  //     ⇒ 本条**如实保留 `machine:false`**（理由从「待裁」变为「已裁定为接受的缺口」）。
  //   ★ 批次 49（2026-09-17）：支书就 Q-23-48 **改裁**走「**加不可反查的本人标识**」⇒ 缺口根因已修
  //     （`getMyIssues` 认「本浏览器提交令牌的哈希」），真机解锁路径见该条 reason 末段。
  // ★ 2026-09-17（同日晚）匿名口径改裁：来源＝支书原话「后台记录真实情况，匿名是前端的。
  //   但是我们也强调清楚，查看匿名的权限只有党委有。」⇒ `services/issues.js` 撤除旧「读取时删除
  //   `_realPersonId`」迁移（改为「库里留真身、常规出口脱敏、党委核查出口带真身」），并新增党委核查
  //   出口与两条写链专用访问器。
  //   ⚠ **诚实更正（2026-09-17 批次 52，黑话第 8 轮落地时由 S6 当场抓出）**：本组 5 处行号**当时被写成
  //   「已按实况同步」，实测全部又偏了 +4**（`issues.js` 上部随后又增了 4 行）⇒ **那句自述是错的**。
  //   这不是「守卫太严」，恰是 S6 存在的理由：**行号是台账里唯一没人核的那一半，不核就一定偏**（R-80）。
  //   已按 S6 报文更正为**实际行号**（判据与文案一字未改）；**下次改 `issues.js` 必须重核本组 5 条**。
  { file: SRC + 'services/issues.js', line: 1313, field: '汇报内容', flow: 'service/一键汇报', machine: true, msg: '请填写汇报内容' },
  { file: SRC + 'services/issues.js', line: 1489, field: '评论内容', flow: 'service/议题评论', machine: true, msg: '请输入评论内容' },
  { file: SRC + 'services/issues.js', line: 1566, field: '评论内容', flow: 'service/议题评论', machine: true, msg: '请输入评论内容' },
  { file: SRC + 'services/issues.js', line: 1572, field: '处置结果内容', flow: 'service/议题处置', machine: true, msg: '请输入处置结果内容' },
  { file: SRC + 'services/issues.js', line: 1646, field: '说明内容', flow: 'service/议题说明', machine: false, msg: '请输入说明内容', reason: '【批 47-X 真机+接口双取证·**口径更正**】原 reason 写「纳入条件：种子把某条议题的 reporterId/participants 指向演示账号」——**这是不够的、且方向错了**。实测事实：① 种子 `docs/data/issues.json` 里 issue-001 本就 `submittedBy:p5`、issue-002/003 的 `participants` 含 p11/p1/p13，**认人字段本来就在**；② 但 api 形态 `GET /api/v1/issues` 实测返回 **6 条**：4 条公开反馈**一律** `submittedBy:\'匿名\' / participants:[] / anonymous:true`（服务端按「真匿名」口径脱敏，见 `server/seed.js::seedIssues`）、2 条 `kind:\'report\'` 保留真名；③ 而 `IssueStore.getMyIssues` **排除 `kind===\'report\'`** 且靠 `submittedBy`/`participants` 认人 ⇒ **api 形态下该区结构上恒为空**（不是「种子没挂上」）。真机复核：成员台(p5)/组织台(p11)/组长台(p1)/宣传台(p12) 逐台打开「我的处置」，④区标题均为「我提交 / 参与的反馈 · 0」、宿主显「暂无我提交或参与的反馈」。**⇒ 这不是种子问题，是两形态口径不一致的产品缺口**（mock 形态直读 issues.json 带真名 ⇒ 有行；api 形态脱敏 ⇒ 恒空），而 help/README-members 都把该区写成了功能。**已立 `Q-23-48` 待支书裁定（2026-09-16 登记）**。**⇒ 批次 48（2026-09-17 支书裁定 `Q-23-48`：**接受缺口 + 改文案**）**已按裁定落地**：① **不改服务端隐私口径**（真匿名是公开反馈页的承诺）；② **不造种子**（④区的数据来源是「服务端按人回认」，只种 mock 等于**只在演示形态显形＝假绿**）；③ **改文案说清口径**——`services/issues.js` ④区标题下新增说明行「仅本地演示模式可见：正式部署下公开反馈按「真匿名」口径脱敏，无法按人回认」+ `help.html` 两处（§角色 tab 说明行 / 「我的处置」卡）+ `README-members.md` 成员能力行；④ 故本条**保留 `machine:false`**，reason 由「**待裁**」改为「**已裁定为产品接受的缺口**」（不再是悬而未决项，也不再是「纳入条件」）。**⇒ 批次 49（2026-09-17）该缺口的「根因」被修掉**：支书改裁走**不可反查的本人标识**——`IssueStore.getMyIssues` 新增第 ③ 条判据（本浏览器提交令牌的哈希 `tokenHash` 相符即算「我的」），④区在**正式部署下也能列出本机提交过的反馈**，且任何人都无法由数据反推是谁。**本条仍保留 `machine:false`**：真机要跑到这处校验，须先**在同一会话内用公开反馈页提交一条反馈**（令牌落本地 → ④区出现该行 → 进详情 → 空提交触发本校验），与批 47-Z「让产品自己把前置走出来」同法，**留作下一批的解锁动作**（本批不动台账判据，只如实改写 reason + 更正行号）。' },
  { file: SRC + 'components/report-entry.js', line: 99, field: '汇报内容', flow: 'component/一键汇报', machine: true, msg: '请填写汇报内容' },
  { file: SRC + 'components/report-inbox.js', line: 217, field: '答复内容', flow: 'component/汇报收件箱·答复', machine: true, msg: '请填写答复内容' },
  { file: SRC + 'components/work-overview.js', line: 377, field: '汇报内容', flow: 'component/工作概况·汇报', machine: true, msg: '请填写汇报内容' },
  { file: SRC + 'components/taskforce-view.js', line: 290, field: '产出说明', flow: 'component/专班查看·产出', machine: true, msg: '请填写产出说明' },
  // 批次 47-W（2026-09-16）：**三处由 `machine:false` 转 `machine:true`**——原 reason「实测 `.fu-add` 在 act-31
  //   详情不存在」**是事实**，但那只是**当时种子的事实**：该区只在有 `result:'passed'` 议程项时挂载，
  //   而原种子没有任何活动带 `result` ⇒ 结构性不可达。本批**按「造出真机可达且自洽的前置」处理**
  //   （而非维持不可达）：新增 `act-35`（线下支委会，议程项已通过——无 `voteConfig` 故不经表决硬校验，
  //   是真机可达成状态；详见 `docs/src/mock/activities.js` 该条注释），入口＝支书台「活动管理」切到 2026-08。
  { file: SRC + 'components/resolution-followup-manager.js', line: 143, field: '待落实事项', flow: 'component/决议落实', machine: true, msg: '请填写待落实事项' },
  { file: SRC + 'components/resolution-followup-manager.js', line: 144, field: '责任人', flow: 'component/决议落实', machine: true, msg: '请选择责任人' },
  { file: SRC + 'components/resolution-followup-manager.js', line: 145, field: '落实时限', flow: 'component/决议落实', machine: true, msg: '请选择落实时限' },
  { file: SRC + 'components/vote-widget.js', line: 79, field: '表态', flow: 'component/表决控件', machine: true, msg: '请先选择表态' },
  { file: SRC + 'components/inspector.js', line: 568, field: '表态', flow: 'component/活动巡查·表决', machine: true, msg: '请先选择表态' },
  { file: SRC + 'components/inspector.js', line: 1320, field: '活动名称', flow: 'component/活动巡查·信息编辑', machine: true, msg: '请填写活动名称' },
  { file: SRC + 'components/inspector.js', line: 1321, field: '日期', flow: 'component/活动巡查·信息编辑', machine: true, msg: '请选择日期' },
  { file: SRC + 'components/inspector.js', line: 1322, field: '活动地点', flow: 'component/活动巡查·信息编辑', machine: true, msg: '请填写活动地点' },
  { file: SRC + 'components/person-edit-modal.js', line: 272, field: '成员姓名', flow: 'component/人员编辑浮窗', machine: true, msg: '成员姓名不能为空' },
  // 批次 47-M（2026-09-16）：**独立页 `docs/wizard.html` · 「新建支部…」面板**——一条流程覆盖该面板**两处**校验点。
  // ⚠ 原 reason「需进入支部配置向导的对应步（多步向导）」/「同上：多步向导」**两条都错**：
  //   `_doCreate` 的两处守卫根本不在「多步向导的某一步」里，而在**页顶常驻的「新建支部…」小面板**上，
  //   点一下 `[data-wz-act="toggle-create"]` 即展开（面板出厂关闭 → 此时页面上只有这一个 toggle-create，
  //   选择器无歧义）。**「多步向导」这一说法把「页面上有个分步控件」误当成了「校验点藏在某一步后面」。**
  //   ⚠ 另一处实测事实：**「就地任命首任骨干」勾选框默认是勾上的**（`S.appointOn=true`，`#wz-create-appoint` checked）
  //   ——台账 47-K 曾有一条 reason 写「需勾选『就地任命首任骨干』（该勾选不存在）」被证伪（那是另一处）；
  //   这里恰好相反：**勾选存在且默认已勾** ⇒ 「首任支书」这一支**空提交即达**，连勾都不用点。
  //   校验序：① 模式切「复制现有」后源支部为空 →「请选择源支部」；② 放行后 →「请选择首任支书…」。
  { file: SRC + 'components/org-setup-wizard.js', line: 1303, field: '源支部', flow: 'component/组织配置向导', machine: true, msg: '请选择源支部' },
  { file: SRC + 'components/org-setup-wizard.js', line: 1314, field: '首任支书', flow: 'component/组织配置向导', machine: true, msg: '请选择首任支书' },
  { file: SRC + 'modules/references.js', line: 776, field: '标题', flow: 'module/制度参考·写入', machine: true, msg: '请填写标题' },
  { file: SRC + 'modules/references.js', line: 779, field: '制度正文', flow: 'module/制度参考·写入', machine: true, msg: '请填写制度正文' },
  { file: SRC + 'modules/references.js', line: 781, field: '要上传的文件', flow: 'module/制度参考·写入', machine: true, msg: '请选择要上传的文件' },
  { file: SRC + 'modules/references.js', line: 900, field: '标题', flow: 'module/制度参考·新版本', machine: true, msg: '请填写标题' },
  { file: SRC + 'modules/references.js', line: 901, field: '新版正文', flow: 'module/制度参考·新版本', machine: true, msg: '请填写新版正文' },
  // 批次 47-M（2026-09-16）：**服务层与 UI 层的重复守卫**——这一条**不是「没去做」，也不是「种子不够」**，
  //   而是**结构上到不了**：`visitor/review-tab.js:181` 在**调它之前**就有一份同文案判据（`if (!content)` → return），
  //   故从任何 UI 入口都不可能让这份服务层守卫成为**第一个**报出来的那一个。
  //   ⚠ 但它**不是死代码**：`submitActivityReviewForm` 是公开导出（todo-domain-view.test 断言支书「代提交复盘」走同链），
  //   且 mock/api 双态下服务层才是真正边界 ⇒ 保留为**防御性重复守卫**合理。
  //   **台账口径**：此类条目应显式标注「服务层重复守卫」，与「缺数据/缺步骤」区分开——三者的处置完全不同
  //   （前者不修，中者可造数据，后者应补 schema）。本批首次给这一类打了标。
  { file: SRC + 'services/review.js', line: 144, field: '复盘总结', flow: 'service/活动复盘', machine: false, msg: '请填写复盘总结', reason: '【批 47-M 结构性不可达·服务层重复守卫】唯一 UI 调用点 `visitor/review-tab.js:181` 已先做同文案判据后才调用本函数 ⇒ 真机上本守卫**永远不是第一个报出来的**，UI 层实测已由同名额登记（`entries/tabs/visitor/review-tab.js` 182）。本函数为公开导出（`todo-domain-view.test.mjs` 断言支书「代提交复盘」走同链），服务层是 mock/api 双态的边界，故保留为防御性重复守卫。**归类：不修，只标**' },
  { file: SRC + 'services/roster-ui-logic.js', line: 96, field: '成员姓名', flow: 'service/名册新增成员', machine: true, msg: '请填写成员姓名（必填）' },
  { file: SRC + 'entries/thought-report-entry.js', line: 295, field: '修改后的思想汇报内容', flow: '思想汇报页·修改', machine: true, msg: '请填写修改后的思想汇报内容' },
  // 批次 47-R（2026-09-16）**新增登记**：打回意见（同一独立页、另一提交口）。
  // ⚠ 说明为何此前不在台账里：S0/S2 只保证「规模不缩水」与「machine:true 全被覆盖」，
  //   **不保证「全站校验点都已登记」**——本条即是一处**台账遗漏**（原 92 条漏了这一处）。
  //   本批顺手补上并直接真机覆盖：种子里 tr-4（p3）本就存在，**组织委员**登录该页即可打回
  //   ⇒ 该处一直可达，只是**没人登记、也就没人跑**。**这就是「台账不是全量」的实例：漏登记＝漏发现。**
  // 2026-09-18 批次 86（`SOP-B-28` 取消初阅门）：打回由「初阅决定」改为**事后反馈**（可对任一篇发起），
  //   文案随之由「打回须填写初阅意见」改准为「打回须填写意见」；行号随本批改动同步。
  { file: SRC + 'entries/thought-report-entry.js', line: 272, field: '打回意见', flow: '思想汇报页·打回', machine: true, msg: '打回须填写意见' },
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
      // 批次 47-D 续（2026-09-16）：清空**默认预填的当日日期**（`#wp-date` value=today）→「请选择日期」一支变可达。
      //   这是「默认预填藏必填分支」的**第 9 例**；此前该条挂 machine:false 的理由正是「日期字段默认预填当日」——
      //   **该理由本身说明了解法**（清空即可），却被当成不可自动化的结论停在那里。见批 ⑨ 同款教训。
      { setValue: { selector: '#wp-date', value: '' } },
    ],
    submit: [{ click: '[data-action="wp-submit"]' }],
    expect: [
      { file: SRC + 'entries/tabs/secretary/calendar-tab.js', field: '活动名称', msg: '请填写活动名称', carrier: '#wp-title', satisfy: { setValue: { selector: '#wp-title', value: '表单闭环普查活动' } } },
      { file: SRC + 'entries/tabs/secretary/calendar-tab.js', field: '日期', msg: '请选择日期', carrier: '#wp-date', satisfy: { setValue: { selector: '#wp-date', value: '2026-10-31' } } },
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
    open: [
      // 批次 47-D 续（2026-09-16）：「目标支部」原挂 machine:false，理由写「**默认全选**（缺省回填全部支部）」——
      //   又是**理由即解法**：全选就全不选（`setChecked false`），清掉即达。本批为「默认全选/预勾」形态
      //   新增了 `setChecked` 步骤（见 form-loop-sweep），此处首次使用。
      //   注：**故意不派发 change**——`_readFormState` 缺省「全选」，派发 change 会触发重渲染把勾选回填。
      { setChecked: { selector: 'input[name="dispatch-branch"]', checked: false } },
    ],
    submit: [{ click: '#dispatch-submit' }],
    expect: [
      { file: SRC + 'entries/tabs/party-committee/dispatch-tab.js', field: '目标支部', msg: '请选择目标支部', carrier: '#dispatch-branches input[name="dispatch-branch"]', satisfy: { setChecked: { selector: 'input[name="dispatch-branch"]', checked: true } } },
      { file: SRC + 'entries/tabs/party-committee/dispatch-tab.js', field: '标题与正文', msg: '请填写标题与正文', carrier: '#dispatch-title' },
    ],
  },
  {
    // 批次 47-P（2026-09-16）：**党委台 · 上报审批 · 驳回须填意见**——「改种子解锁」的**首个样本**。
    // ⚠ 这条流程**没有 open 步骤**，但它成立的前提全是**种子**：`[data-rq-act="reject"]` 只在
    //   `status === 'pending'` 的上报卡上渲染，而该域原**两形态皆无种子**（见台账本条注释）。
    //   补 `SEED_REVIEW_REQUESTS`（mock + api 同源）后，党委台一进来就能看到待批复卡 ⇒ 入口恒在位。
    // ⚠ 顺带覆盖了一条**此前无人走过的链**：驳回守卫是「**先取意见文本再判空**」
    //   （`card.querySelector('.rq-decision')?.value.trim()`）——即「**同卡内的输入框与按钮**」
    //   这一形态；它与「面板级共用输入框」不同，故断言载体必须指到**该卡内**的 `.rq-decision`。
    id: 'pc-review-reject-note',
    page: 'party-committee',
    tab: '上报审批',
    open: [],
    submit: [{ click: '[data-rq-act="reject"]' }],
    expect: [
      { file: SRC + 'entries/tabs/party-committee/review-tab.js', field: '意见', msg: '驳回请填写意见', carrier: '.rq-decision' },
    ],
  },
  {
    id: 'pc-branch-rename',
    page: 'party-committee',
    tab: '支部管理',
    open: [
      { click: '.branch-rename-toggle' },
      { waitFor: '.branch-rename-save' },
      { setValue: { selector: '.branch-rename-input', value: '' } },
    ],
    submit: [{ click: '.branch-rename-save' }],
    expect: [
      { file: SRC + 'entries/tabs/party-committee/branches-tab.js', field: '支部名称', msg: '支部名称不能为空', carrier: '.branch-rename-input' },
    ],
  },
  {
    // 批次 47-D 续（2026-09-16）：**党委台 · 支部管理 · 任命支书行内表单**。
    // 台账原挂 machine:false 的理由是「需先展开任命行并勾选『就地任命首任骨干』」——**后半句不存在**：
    //   点「任命支书」展开后，`select.branch-appoint-select` 的**首个 option 是 value="" 的占位**
    //   （「— 选择本支部成员为新任支书 —」），故无需任何勾选，空提交直接报「请选择新任支书」。
    //   **又一次「reason 写的是别处的记忆」**——本批第 4 例（前述 ⑨/⑩/⑫/:118 同款）。
    id: 'pc-branch-appoint',
    page: 'party-committee',
    tab: '支部管理',
    open: [
      { click: '.branch-appoint-toggle' },
      { waitFor: '.branch-appoint-save' },
    ],
    submit: [{ click: '.branch-appoint-save' }],
    expect: [
      { file: SRC + 'entries/tabs/party-committee/branches-tab.js', field: '新任支书', msg: '请选择新任支书', carrier: '.branch-appoint-select' },
    ],
  },
  {
    // 批次 47-D 续（2026-09-16）：**独立页 `docs/feedback.html`（议题提交）**——一条流程覆盖该页三处校验点。
    // ⚠ 台账原 reason「议题提交浮态，入口需从各台议题区打开」**是错的**：它在**独立页**上（`feedback.html`
    //   挂 `#issue-form-container`），**不在任何 tab 的浮态里**。而原 schema 只会走 `workspace/<page>.html`，
    //   于是「schema 够不到」被记成了「需从各处打开」——**把工具的限制写成了产品的限制**。
    //   本批为 schema 加了 `path`（独立页直达），该页与 `search.html`/`thought-report.html`/`activity.html`
    //   上的十余处站点由此首次变为可达。
    id: 'page-feedback-issue-form',
    page: 'secretary',
    tab: '独立页 /feedback.html',
    path: '/feedback.html',
    open: [
      // 真机取证：`#issue-form-container` 初始 **innerHTML 为空**——该页默认停在**意见列表视图**
      //   （`#issue-list-view`），须先点「+ 新反馈」（`#btn-new-issue`）切到 `#issue-new-view` 才渲染表单。
      { click: '#btn-new-issue' },
      { waitFor: '#btn-submit-issue' },
      // 范围下拉若默认预选则清掉（同「默认预选首项」形态）；无预选时该操作无副作用。
      { setValue: { selector: '#form-scope', value: '' } },
    ],
    submit: [{ click: '#btn-submit-issue' }],
    expect: [
      { file: SRC + 'components/issue-form.js', field: '标题', msg: '请输入标题', carrier: '#form-title', satisfy: { setValue: { selector: '#form-title', value: '（真机普查）议题标题' } } },
      { file: SRC + 'components/issue-form.js', field: '正文', msg: '请输入正文', carrier: '#form-body', satisfy: { setValue: { selector: '#form-body', value: '（真机普查）议题正文' } } },
      { file: SRC + 'components/issue-form.js', field: '范围', msg: '请选择范围', carrier: '#form-scope' },
    ],
  },
  {
    // 批次 47-L（2026-09-16）：**顶栏常驻「一键汇报」浮态**（各工作台 tab-bar extraRight 上的 `#btn-report-entry`）。
    // 台账原挂 machine:false 的理由是「一键汇报浮态由各台 extra 入口打开，需先进入浮态」——**这不是障碍**：
    //   它就是**顶栏常驻按钮**，任何 tab 上点一下即开（`report-entry.js:45`）。**同批第五次「理由写的是假设」**。
    // 选 `visitor` 台是因为其入口已由 `ws-visitor-entry.js` 显式绑定；浮态与 tab 无关，切 tab 失效也不影响本流程。
    id: 'report-entry-one-click',
    page: 'visitor',
    tab: '今天',
    open: [
      { click: '#btn-report-entry' },
      { waitFor: '#report-modal-submit' },
    ],
    submit: [{ click: '#report-modal-submit' }],
    expect: [
      { file: SRC + 'components/report-entry.js', field: '汇报内容', msg: '请填写汇报内容', carrier: '#report-modal-body' },
    ],
  },
  {
    // 批次 47-L（2026-09-16）：**支书台 · 活动管理 · 巡查面板「活动信息编辑」浮窗**——一条流程覆盖**三处**校验点。
    // 入口链（真机可脚本化，无需人造种子）：日历网格的活动标签 `.cal-activity-item`（`calendar.js:577` 有点击绑定）
    //   → `setState({ viewMode:'detail', selectedActivityId })` → 巡查详情渲染出 `#inspector-edit-btn`（`inspector.js:923`）
    //   → 点它开 `activity-edit` 浮窗（`#ae-*`）。
    // ⚠ 台账原写「**内联新建**活动表单」——**名不副实**：它是 `_openActivityEditModal`，**编辑**浮窗，且三字段
    //   **全部预填现有值**（`#ae-title`/`#ae-date`/`#ae-location`）⇒ 不先在 open 里清空，这三支**都不可达**
    //   （「默认预填藏必填分支」，本批第 13 例）。**定 flow 名时必须回读源码**（本批第二次同款教训）。
    // 支书台 `viewType='manager'`（`ws-secretary-entry.js:56`）⇒ 巡查列表走**管理态**而非参与者态，卡片可进详情。
    id: 'secretary-inspector-activity-edit',
    page: 'secretary',
    tab: '活动管理',
    open: [
      // 批次 47-W：入口由「日历**第一条**」改为**显式指定 act-31**——原写法依赖「当月恰好只有一条活动」
      //   这个**偶然事实**（2026-09 只有 act-31）；本批为「决议落实」新增了 act-35（8 月）后，
      //   一旦将来 9 月再多一条，本流程就会静默切到别的活动上（**判据随数据变动**，同 R-76 ④）。
      { click: '.cal-activity-item[data-act-id="act-31"]' },
      { waitFor: '#inspector-edit-btn' },
      { click: '#inspector-edit-btn' },
      { waitFor: '#ae-title' },
      { setValue: { selector: '#ae-title', value: '' } },
      { setValue: { selector: '#ae-date', value: '' } },
      { setValue: { selector: '#ae-location', value: '' } },
    ],
    submit: [{ click: '#ae-save' }],
    expect: [
      { file: SRC + 'components/inspector.js', field: '活动名称', msg: '请填写活动名称', carrier: '#ae-title', satisfy: { setValue: { selector: '#ae-title', value: '（真机普查）活动名' } } },
      { file: SRC + 'components/inspector.js', field: '日期', msg: '请选择日期', carrier: '#ae-date', satisfy: { setValue: { selector: '#ae-date', value: '2026-10-30' } } },
      { file: SRC + 'components/inspector.js', field: '活动地点', msg: '请填写活动地点', carrier: '#ae-location' },
    ],
  },
  {
    // 批次 47-W（2026-09-16）：**支书台 · 活动管理 · 巡查详情「决议落实」**——**一条流程覆盖三处校验点**（全部转正）。
    // 与上两条**共用同一条 open 链**（日历活动标签 → 巡查详情）——「同面板多块」的第三例（47-D 的收益点再次兑现：新增成本≈0）。
    // ⚠ **本条的成立完全依赖新种子 `act-35`**（见 `docs/src/mock/activities.js` 该条注释）：
    //   该区只在**存在 `result:'passed'` 议程项**时挂载；原种子没有任何活动带 `result` ⇒ 三处**结构性不可达**
    //   （批 47-M 真机实测 `.fu-add` 计数 0，台账原 reason 属实）。本批按「**造出真机可达且自洽的前置**」处理，
    //   而**不是**给 act-31 挂 `result` 了事——那会造出「0 票却已通过」这种**真机永远不可能出现**的状态（假种子）。
    // ⚠ **入口要先切月**：act-35 在 8 月，而支书台「活动管理」默认展示当月 ⇒ 先 `#month-selector` 切到 `2026-08`。
    //   （既有两条流程的入口本批也一并**显式化**为 `[data-act-id]`，不再依赖「当月只有一条」这个偶然事实。）
    // ⚠ **三处必须按「点击顺序」逐支 satisfy**：`.fu-add` 的判据序是 事项 →（责任人）→（时限），
    //   每 satisfied 一支后**再点一次**同一按钮才会暴露下一支——`expect[].satisfy` 正是为此存在的。
    // 载体即控件自身（`.fu-new-item` / `.fu-new-owner` / `.fu-new-deadline`），**不另造判据**。
    id: 'secretary-inspector-resolution',
    page: 'secretary',
    tab: '活动管理',
    open: [
      { selectValue: { selector: '#month-selector', value: '2026-08' } },
      { waitFor: '.cal-activity-item[data-act-id="act-35"]' },
      { click: '.cal-activity-item[data-act-id="act-35"]' },
      { waitFor: '.fu-add' },
    ],
    submit: [{ click: '.fu-add' }],
    expect: [
      { file: SRC + 'components/resolution-followup-manager.js', field: '待落实事项', msg: '请填写待落实事项', carrier: '.fu-new-item', satisfy: { setValue: { selector: '.fu-new-item', value: '（真机普查）补充发展对象阶段材料' } } },
      { file: SRC + 'components/resolution-followup-manager.js', field: '责任人', msg: '请选择责任人', carrier: '.fu-new-owner', satisfy: { selectValue: { selector: '.fu-new-owner', value: 'role:org-commissioner' } } },
      { file: SRC + 'components/resolution-followup-manager.js', field: '落实时限', msg: '请选择落实时限', carrier: '.fu-new-deadline' },
    ],
  },
  {
    // 批次 47-X（2026-09-16）：**成员台 · 知情查看 · 专班分段 · 「我的产出填报」**——承 47-W 的 R-78 口径，再清一处不可达。
    // 入口链：知情查看 tab（`components/insight-view.js`）→ 分段钮 `.insight-view-btn[data-iview="taskforce"]`
    //   → 专班卡 `.tfv-card[data-tf-id="tf-001"]`（点击进只读详情）→ 详情内 `#tfv-contrib-add`（「填报本条产出」）。
    // ⚠ **成立条件＝种子给 active 专班补一名演示账号成员**（本批改 `docs/src/mock/taskforces.js::tf-001`
    //   成员补 p5）：该填报区**只在 `tf.status==='active' && isMember` 时渲染**（`taskforce-view.js:194`），
    //   而原种子两只 active 专班的成员（p8+p9 / p4+p7）**全非演示账号** ⇒ 任何演示账号登录都看不到它（结构性不可达）。
    //   **造前置时守 R-78 ②**：只**加成员**、**不动状态**、容量内（2/5 → 3/5）⇒「某 active 专班的成员里有本人」
    //   本就是产品自己走得通的状态（成员由报名/发起流程加入）。
    // ⚠ 判据载体＝**文本域自身** `#tfv-my-contrib-desc`（不另造判据）；提示由 `showToast` 走全局 toast。
    // ⚠ 成员台「知情查看」是**只读形态**（`readonly` 缺省 true）——但「我的产出填报」是 R3-3 给**成员本人**的写口，
    //   与该形态不冲突（只读指的是「活动分段不可编辑」）。
    id: 'visitor-insight-taskforce-contribution',
    page: 'visitor',
    tab: '知情查看',
    open: [
      { click: '.insight-view-btn[data-iview="taskforce"]' },
      { waitFor: '.tfv-card[data-tf-id="tf-001"]' },
      { click: '.tfv-card[data-tf-id="tf-001"]' },
      { waitFor: '#tfv-contrib-add' },
    ],
    submit: [{ click: '#tfv-contrib-add' }],
    expect: [
      { file: SRC + 'components/taskforce-view.js', field: '产出说明', msg: '请填写产出说明', carrier: '#tfv-my-contrib-desc' },
    ],
  },
  {
    // 批次 47-L（2026-09-16）：**支书台 · 活动管理 · 巡查详情「我的表态」（`inspector.js` 侧）**。
    // 与上一条**共用同一条 open 链**（日历活动标签 → 巡查详情），只是不再开编辑浮窗——「同面板多块」的又一例。
    // 真机取证（临时探针）：act-31 详情内 `.vote-btn` **6 个可见**、`.vote-submit` 80×28 在位 ⇒
    //   台账原 reason「需在巡查面板表决控件内进入表态态」中的「进入…态」**并不存在额外门槛**：
    //   详情一开，表态控件即在位；不点选项直接点「提交表态」即报「请先选择表态（赞成/反对/弃权）」。
    id: 'secretary-inspector-vote',
    page: 'secretary',
    tab: '活动管理',
    open: [
      // 批次 47-W：同 `secretary-inspector-activity-edit`——入口显式指定 act-31，不再依赖「当月只有一条」。
      { click: '.cal-activity-item[data-act-id="act-31"]' },
      { waitFor: '.vote-submit' },
    ],
    submit: [{ click: '.vote-submit' }],
    expect: [
      { file: SRC + 'components/inspector.js', field: '表态', msg: '请先选择表态', carrier: '.vote-btn' },
    ],
  },
  {
    // 批次 47-L（2026-09-16）：**独立页 `docs/activity.html?id=act-31`（活动详情）· 表决控件**（`vote-widget.js` 侧）。
    // `activity-entry.js:69` 取 `?id=` 作为对象 id（`tf-` 前缀走专班详情，其余走活动详情）。
    // 与巡查侧同为一个「未选表态即提交」的守卫，**两处各是一次真实调用点**（组件 vs 巡查内联实现），故分别覆盖。
    id: 'page-activity-vote',
    page: 'secretary',
    tab: '独立页 /activity.html',
    path: '/activity.html?id=act-31',
    open: [
      { waitFor: '.vote-submit' },
    ],
    submit: [{ click: '.vote-submit' }],
    expect: [
      { file: SRC + 'components/vote-widget.js', field: '表态', msg: '请先选择表态', carrier: '.vote-btn' },
    ],
  },
  {
    // 批次 47-D 续（2026-09-16）：**独立页 `docs/search.html` · 制度参考 · 写入支部文件浮窗**——一条流程覆盖**三处**校验点。
    // 入口 `#ref-branch-doc-add-btn`（文书=支书/副支书，登录账号符合）；浮窗 `#ref-branch-doc-modal`。
    // 校验序＝标题 →（用途分支）→ 制度正文 / 要上传的文件：
    //   · 用途默认**不是** institution（`#ref-modal-inst-box` 出厂 `hidden`）→ 先走「要上传的文件」；
    //   · 再用 `satisfy: selectValue` 把用途切到 `institution` →**同一浮窗**里让「制度正文」一支可达。
    //   ⚠ 原 reason「文件选择器不可脚本设值」**把手段当成了结论**：该支只需文件**为空**即报，
    //     根本不必给文件输入设值（不必碰 file input）。**「某控件设不了值」≠「该分支测不了」。**
    id: 'page-refs-doc-write',
    page: 'secretary',
    tab: '独立页 /search.html',
    path: '/search.html',
    // 该浮窗的校验提示写在**面板内状态区**（`showStatus` → `#ref-modal-status`），**不写全局 toast**：
    // 首次真机即被判「静默失败」——**提示载体不同 ≠ 没有提示**，读错载体与没有提示一样查不出病。
    noticeSel: '#ref-modal-status',
    open: [
      { click: '#ref-branch-doc-add-btn' },
      { waitFor: '#ref-modal-title' },
    ],
    submit: [{ click: '#ref-modal-confirm' }],
    expect: [
      { file: SRC + 'modules/references.js', field: '标题', msg: '请填写标题', carrier: '#ref-modal-title', satisfy: { setValue: { selector: '#ref-modal-title', value: '（真机普查）制度标题' } } },
      { file: SRC + 'modules/references.js', field: '要上传的文件', msg: '请选择要上传的文件', carrier: '#ref-modal-file', satisfy: { selectValue: { selector: '#ref-modal-purpose', value: 'institution' } } },
      { file: SRC + 'modules/references.js', field: '制度正文', msg: '请填写制度正文', carrier: '#ref-modal-body' },
    ],
  },
  {
    // 批次 47-D 续（2026-09-16）：**独立页 `docs/search.html` · 制度参考 · 上传新版浮窗**——**两处**校验点。
    // ⚠ **本流程带一条真实前置链**（真机取证）：种子支部**没有任何支部文件**（真机实测 `#ref-branch-docs-list` 高度 0、
    //   空态显「暂无支部文件」），故 `.ref-doc-action-btn[data-action="publish-version"]` **根本不存在**。
    //   「上传新版」按定义只能对**已存在的制度文本**操作 → 前置＝先用「写入文件」**真写一份制度文本**
    //   （标题 + 用途=institution + 正文齐全 → 确认）。**这条链把「写」与「改版」串成了同一真机路径**，
    //   也顺带证明了「写入」的成功路径确实落库并刷新出列表行。
    //   ⚠ 两处都**预填**（`#ref-pub-title`/`#ref-pub-body` 预填现行版内容）→ 必须在 open 里**先清空两者**
    //   （「默认预填藏必填分支」，本批第 11 例）。
    id: 'page-refs-publish-version',
    page: 'secretary',
    tab: '独立页 /search.html',
    path: '/search.html',
    noticeSel: '#ref-pub-status',
    open: [
      // 前置①：写一份制度文本（走成功路径，故不是 expect 而是 open 的一步）
      { click: '#ref-branch-doc-add-btn' },
      { waitFor: '#ref-modal-title' },
      { setValue: { selector: '#ref-modal-title', value: '（真机普查）前置制度文本' } },
      { selectValue: { selector: '#ref-modal-purpose', value: 'institution' } },
      { setValue: { selector: '#ref-modal-body', value: '（真机普查）前置制度正文，用于让「上传新版」入口成立。' } },
      { click: '#ref-modal-confirm' },
      // 前置②：等列表真的刷出「上传新版」按钮（此步即「写口落库 + 列表刷新」的实证）
      { waitFor: '.ref-doc-action-btn[data-action="publish-version"]' },
      { click: '.ref-doc-action-btn[data-action="publish-version"]' },
      { waitFor: '#ref-pub-title' },
      { setValue: { selector: '#ref-pub-title', value: '' } },
      { setValue: { selector: '#ref-pub-body', value: '' } },
    ],
    submit: [{ click: '#ref-pub-confirm' }],
    expect: [
      { file: SRC + 'modules/references.js', field: '标题', msg: '请填写标题', carrier: '#ref-pub-title', satisfy: { setValue: { selector: '#ref-pub-title', value: '（真机普查）新版标题' } } },
      { file: SRC + 'modules/references.js', field: '新版正文', msg: '请填写新版正文', carrier: '#ref-pub-body' },
    ],
  },
  {
    // 批次 47-D 续（2026-09-16）：**组织台 · 名册管理 · 新增成员（通用表单浮窗）**——覆盖的是
    //   **服务层**校验 `services/roster-ui-logic.js::validateMemberForm`（提交口 `form[data-modal-form]`）。
    // ⚠ **本条与下面「人员编辑浮窗」的关系值得记一笔**：两处**都报「成员姓名」**，但
    //   · 新增走 `openFormModal` → 服务层 `validateMemberForm` 出话术；
    //   · 编辑走 `person-edit-modal` → 组件层**自己先拦**（`if (!next.name)`）再提交。
    //   **不是重复登记，而是两条不同的写口各有各的守卫**——真机分别覆盖后，谁先拦谁后拦一目了然。
    id: 'org-roster-member-add',
    page: 'org',
    tab: '成员名册（?tab=roster）',
    // 组织台支持 `?tab=<id>` 深链（`development-tab.js` 的「去名册发起变更」即用此形），
    // 比按文案猜 tab 标题更稳；带 `path` 时守卫会跳过切 tab，直接落在成员名册。
    path: '/workspace/org.html?tab=roster',
    open: [
      { click: '#roster-add-btn' },
      { waitFor: 'form[data-modal-form] button[type="submit"]' },
    ],
    submit: [{ click: 'form[data-modal-form] button[type="submit"]' }],
    expect: [
      { file: SRC + 'services/roster-ui-logic.js', field: '成员姓名', msg: '请填写成员姓名（必填）', carrier: 'form[data-modal-form] input[data-field="name"]' },
    ],
  },
  {
    // 批次 47-D 续（2026-09-16）：**组织台 · 名册管理 · 行内「编辑」→ 成员档案编辑浮窗**。
    // 「默认预填藏必填分支」的**第 12 例**：`input[data-field="name"]` 预填成员现有姓名 → 先在 open 里清空。
    // 入口＝名册行内 `.roster-edit`（`data-person-id`，模态按 personId 现取档案真相）。
    id: 'org-roster-member-edit',
    page: 'org',
    tab: '成员名册（?tab=roster）',
    path: '/workspace/org.html?tab=roster',
    open: [
      { click: '.roster-edit' },
      { waitFor: '#person-edit-modal-form' },
      { setValue: { selector: '#person-edit-modal-form input[data-field="name"]', value: '' } },
    ],
    submit: [{ click: '#person-edit-modal-form button[type="submit"]' }],
    expect: [
      { file: SRC + 'components/person-edit-modal.js', field: '成员姓名', msg: '成员姓名不能为空', carrier: '#person-edit-modal-form input[data-field="name"]' },
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
      { file: SRC + 'entries/tabs/leader/attendance-tab.js', field: '活动', msg: '请选择活动', carrier: '#att-activity-select', satisfy: [{ selectFirstOption: '#att-activity-select' }, { click: '#att-clear-selection' }] },
      { file: SRC + 'entries/tabs/leader/attendance-tab.js', field: '参会人员', msg: '请选择参会人员', carrier: '#att-person-picker-container .person-picker-trigger' },
    ],
  },
  {
    // 批次 47-Y（2026-09-16，承 R-78 口径）：**组织委员台 · 专班管理 · 逐条核验「退回补料」的必填原因**。
    // 台账原 reason 写「需 candidate 产出条目处于待核态」，方向对但**不够**——真机实测还有**第二个**障碍：
    //   `window.prompt` 是**浏览器原生对话框**，不装应答器时 Playwright 自动 dismiss ⇒ 返回 `null`
    //   ⇒ 源码 `if (reason === null) return;` **直接 return，连空值分支都到不了**
    //   （源码 624-626：先判 `null`，再判 `.trim()` 为空）。**两个障碍缺一不可**。
    // 处置（R-78 两条出口里的「造真机可达的前置」）：
    //   ① 种子：`docs/src/mock/taskforces.js::tf-001` 给 p5 补**一条待核产出**（`{id,desc,by,at}` 且无
    //      `verifiedStatus`）——这正是成员在「我的产出填报」提交后的形状，产品自己就会产出它；
    //   ② 能力：`runStep` 新增 **`dialogAnswer`** 步骤（在**触发它的那一步之前**注册一次性应答器），
    //      本流程用 `answer:''` 打**空值分支**；`answer:'某原因'` 可打成功分支（留作后继复用）。
    // ⚠ 入口链与 `org-taskforce-progress-add`（47-V 成功路径）**同属「运行中」专班 → 详情面板**，
    //   只是本条的落点在**逐条核验块**而非进度块——「同面板多块」的第四例。
    // ⚠ **入口必须显式指定 tf-001**（`[data-tf-id="tf-001"]`），不能点「第一张卡」——本批真机首跑即踩：
    //   第一张卡**不是** tf-001（运行中桶里另有 tf-002），于是逐条核验块读的是别的专班 ⇒ 报「等待超时」。
    //   **这与 47-W 把 `.cal-activity-item` 改成 `[data-act-id]` 是同一课**：靠「第一张」成立的判据，
    //   一旦桶里多一只就静默换对象（R-78 ④）。
    // ⚠ 判据载体＝**被点的那个按钮自身**（点击后弹窗早期 return，按钮仍在位）。
    id: 'org-taskforce-reject-reason',
    page: 'org',
    tab: '专班管理',
    open: [
      { click: '#tf-bucket-active .tf-store-card[data-tf-id="tf-001"]' },
      { waitFor: '.tf-contrib-verify-btn[data-decision="reject"]' },
      { dialogAnswer: '' },
    ],
    submit: [{ click: '.tf-contrib-verify-btn[data-decision="reject"]' }],
    expect: [
      { file: SRC + 'entries/tabs/org/taskforce-tab.js', line: 626, field: '退回原因', msg: '请填写退回原因', carrier: '.tf-contrib-verify-btn[data-decision="reject"]' },
    ],
  },
  {
    // 批次 47-Y（2026-09-16，承 R-78 口径）：**成员台 · 考勤概况 · 去补课 → 补课说明**。
    // 台账原 reason 写「需 p5 的 pending 补课任务；该域按设计无静态种子，由纪检操作派生」——**后半句是错的**：
    //   ① 「无静态种子」不是设计必然，而是**当初没种**（`data-adapter.js` 那句「空属合理」已被本批更正）；
    //   ② 更关键的是**日期耦合**：该页只列**当月**活动（`visitor/attendance-tab.js:24-25`），
    //      而 7 月那条现成的 p5 缺勤（att38/act-11）**根本不在当月** ⇒ 就算照原方案「等纪检派生」也看不到。
    // 处置（R-78 出口一：造**可达且自洽**的前置）：
    //   ① `docs/src/mock/attendance.js` 补 **9 月**缺勤一条（`att-sep-1`：p5 · act-31 · 缺勤 · **已确认**）；
    //   ② `docs/src/mock/seed.js::SEED_MAKEUP_TASKS` 补**该条的派生结果**（补课任务，`attendanceRecordId` 对得上、
    //      `deadline` = 缺勤日 +7 天、`proofContent: null`）⇒ 与 `autoGenerateMakeupTask()` 落库形状逐项一致；
    //   ③ 两形态同源注入（`server/seed.js` 的 `replaceCollection('makeup_tasks')` ＋ `mock-adapter._seedInitialData`）
    //      ——**只种 mock 就是假绿**（47-S 的教训）。
    // ⚠ **必须是「已确认」的缺勤**（`recordedBy:'p10'`）：补课任务由「纪检**确认**考勤」时才派生，
    //   若记录还是待确认态却已存在补课任务，两者自相矛盾（R-78 ② 自洽）。
    // ⚠ 弹窗由 `openFormModal` 生成：字段 `[data-field="proof"]`、提交口 `[data-modal-form="..."] button[type=submit]`；
    //   判据载体＝**文本域自身**（点击后弹窗不关，仅弹 toast，故载体仍在位）。
    id: 'visitor-attendance-makeup-proof',
    page: 'visitor',
    tab: '考勤概况',
    open: [
      { click: '.visitor-att-makeup-btn' },
      { waitFor: '[data-modal-form="visitor-makeup-proof"]' },
    ],
    submit: [{ click: '[data-modal-form="visitor-makeup-proof"] button[type="submit"]' }],
    expect: [
      { file: SRC + 'entries/tabs/visitor/attendance-tab.js', line: 142, field: '补课说明', msg: '请填写补课说明', carrier: '[data-field="proof"]' },
    ],
  },
  // 批次 124（2026-09-21）**退役**：原 `disc-meeting-attendance`（纪检台 · 考勤管理 · 建考勤）流程——
  //   会议考勤上传主体收归「该场会议组织者」（支书 2026-09-20 定案，落地 `D-547`）后，纪检台
  //   「会议考勤录入」表单只列**本人可上传**的会议场次；演示数据里纪检（p10）不持任何会议场次的上传位
  //   ⇒ 表单长期空态，`waitFor: '#disc-meet-submit'` **结构性**不成立（不是抖动）。
  //   两条校验点随之转 `machine:false`（理由见上方 VALIDATION_SITES「纪检委员台」段）；
  //   **同形态的两条校验未失覆盖**：`leader-attendance-upload`（组织者上传位）的「活动 / 参会人员」仍在跑。
  //   ⚠ 本流程**不是**「自动化不了」，而是「该表单在演示数据下无人可上传」——若日后把会议考勤录入面
  //   移回某个常见角色手上（或演示数据里让某账号持有会议场次的上传位），应连同那两条校验点一并恢复。
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
  {
    // 批次 47-D：**组织台 · 专班材料记录**——第 4 块，仍复用同一条首步 open（「运行中」专班详情）。
    // 该块表单**不是**内联 textarea，而是共享壳 `recordFormShell`：触发 `.sub-add-btn` → 壳内
    // `.f-name`（材料名称）/ 提交 `.record-save-btn`。→ **同一个面板的四种块、三种表单形态**，
    // 这条流程证明「同面板多块」策略能覆盖到不同形态，不只是一堆同构 textarea。
    id: 'org-taskforce-materials',
    page: 'org',
    tab: '专班管理',
    open: [
      { click: '#tf-bucket-active .tf-store-card' },
      { click: '.sub-add-btn[data-type="materials"]' },
      { waitFor: '.record-save-btn' },
    ],
    submit: [{ click: '.record-save-btn' }],
    expect: [
      { file: SRC + 'entries/tabs/org/taskforce-tab.js', field: '材料名称', msg: '请填写材料名称', carrier: '.record-form-shell .f-name' },
    ],
  },
  {
    // 批次 47-D：**宣传台 · 周报报送 · 新增周次**——**「默认预填藏起必填分支」的第 4 例**
    // （前 3 例：纪检台建考勤默认预选活动、支书台通知编辑预填原值、本处周次/日期按当前日期派生预填）。
    // 同一套解法：**在 `open[]` 里先用 `setValue` 清空**，否则两支「请填写…」根本不可达。
    // 触发 `#weekly-add-btn` → 表单就位 → 清空两输入 → 提交 `#weekly-add-save`。
    id: 'prop-weekly-add-week',
    page: 'prop',
    tab: '周报报送',
    open: [
      { click: '#weekly-add-btn' },
      { waitFor: '#weekly-add-save' },
      { setValue: { selector: '#weekly-add-week', value: '' } },
      { setValue: { selector: '#weekly-add-range', value: '' } },
    ],
    submit: [{ click: '#weekly-add-save' }],
    expect: [
      { file: SRC + 'entries/tabs/prop/weekly-tab.js', field: '周次标签', msg: '请填写周次标签', carrier: '#weekly-add-week', satisfy: { setValue: { selector: '#weekly-add-week', value: '第32周' } } },
      { file: SRC + 'entries/tabs/prop/weekly-tab.js', field: '日期范围', msg: '请填写日期范围', carrier: '#weekly-add-range' },
    ],
  },
  {
    // 批次 47-D（2026-09-16）：**组长台 · 考勤上传 · 批量改状态（空值分支）**。
    // 支书清单把「组长台·批量改状态」列为 47-D 续项首位——实测它有**两个面**：
    //   · 成功路径（点「应用到全部」→ 逐人下拉真被改写）＝ `SUCCESS_FLOWS` 的 `leader-attendance-batch-status`；
    //   · 校验分支（**未选状态**就点应用 → 报「请先选择要应用的状态」）＝本条。
    // 两面共**同一条 open 链**（开表单 → 选活动 → 选人，工具栏才挂载），一次编写两处受益。
    // 原登记 reason「需先有考勤记录并进入批量状态操作态」**是错的**：真机无需预置考勤记录，
    //   只要「选了活动 + 选了人」逐人状态行就会渲染出批量工具栏（`_renderAttStatusRows` 由 onSelect 驱动）。
    id: 'leader-attendance-batch-status-empty',
    page: 'leader',
    tab: '考勤上传',
    open: [
      { click: '#btn-leader-upload-att' },
      { waitFor: '#att-form-panel' },
      { selectFirstOption: '#att-activity-select' },
      { openPicker: { trigger: '#att-person-picker-container .person-picker-trigger', count: 2 } },
    ],
    submit: [{ click: '#att-batch-apply' }],
    expect: [
      { file: SRC + 'entries/tabs/leader/attendance-tab.js', field: '要应用的状态', msg: '请先选择要应用的状态', carrier: '#att-batch-status' },
    ],
  },
  {
    // 批次 47-D（2026-09-16）：**组长台 · 活动管理 · 发起活动**（支书清单里的「发起活动向导」——
    //   实测向导在**组长台**「活动管理」tab（`leader/write-tab.js`），不是支书台；支书台的活动写入
    //   是另一条 `secretary-calendar-write`，早已覆盖）。一条流程覆盖该表单**三处**校验点。
    // ⚠ **原登记 reason「多步向导，前置交互复杂」是误判**（真机证伪）：三个字段的校验**不看决策树步数**
    //   （`#dt-submit` 处理序＝日期 → 地点 → 名称），真正的遮挡是**日期默认预填当日**
    //   ——「默认预填藏起必填分支」的**第 5 例**（前 4：纪检台建考勤默认预选活动 · 支书台通知编辑预填原值 ·
    //   宣传台周次/日期按当日派生 · 宣传台周次流程 ⑧）。同一解法：`open[]` 里先 `setValue` 清空。
    id: 'leader-write-activity',
    page: 'leader',
    tab: '活动管理',
    open: [
      { click: '#btn-leader-create' },
      { waitFor: '#dt-submit' },
      { setValue: { selector: '#dt-target-date', value: '' } },
    ],
    submit: [{ click: '#dt-submit' }],
    expect: [
      { file: SRC + 'entries/tabs/leader/write-tab.js', field: 'T-0 日期', msg: '请填写 T-0 日期', carrier: '#dt-target-date', satisfy: { setValue: { selector: '#dt-target-date', value: '2026-10-30' } } },
      { file: SRC + 'entries/tabs/leader/write-tab.js', field: '活动地点', msg: '请填写活动地点', carrier: '#dt-location', satisfy: { setValue: { selector: '#dt-location', value: '（普查）理科五号楼' } } },
      { file: SRC + 'entries/tabs/leader/write-tab.js', field: '活动名称', msg: '请填写活动名称', carrier: '#dt-title' },
    ],
  },
  {
    // 批次 47-D 续（2026-09-16）：**支书台 · 反馈管理 · 议题详情内联区**——一条流程覆盖该面板**三处**校验点。
    // 台账里**首次出现的「一个载体、多个提交口」形态**（此前 9 条都是「一个提交口、多个字段」）：
    //   · 评论与批复**共用** `#issue-comment-input`，靠 `[data-detail-action="add-comment" | "add-verdict"]` 分流；
    //   · 正式答复另有 `#issue-reply-input`。
    // **故用 `expect[].submit` 逐条指定提交口**（同一 open 链、同一面板，不必拆成三条流程——正是「同面板多校验点」的省事点）。
    // ⚠ 三处**都不需要 satisfy**：校验失败即 `return`（不重渲染、不清值），输入框始终为空 → 三个分支依次可达。
    //   **反向的坑**：若在中间给共用载体 satisfy 填过值，**另一条共用它的分支就再也进不去了**——写「共载体」流程前必须先问
    //   「这几个提交口是不是共用一个输入」（与「先问这个表单有什么默认值」同源，都是**先摸清表单的状态机**）。
    // ⚠ 原登记 reason「入口在议题详情内联 X 区，需先有议题并进入详情」**不足以说明不可自动化**：详情一开三区同在，
    //   而「先有议题」由种子提供，属可达。
    id: 'secretary-feedback-issue-detail',
    page: 'secretary',
    tab: '反馈管理',
    open: [
      { click: '[data-issue-action="open-detail"]' },
      { waitFor: '#issue-comment-input' },
    ],
    submit: [{ click: '[data-detail-action="add-comment"]' }],
    expect: [
      { file: SRC + 'entries/tabs/secretary/feedback-tab.js', field: '评论内容', msg: '请输入评论内容', carrier: '#issue-comment-input' },
      { file: SRC + 'entries/tabs/secretary/feedback-tab.js', field: '批复内容', msg: '请输入批复内容', carrier: '#issue-comment-input', submit: { click: '[data-detail-action="add-verdict"]' } },
      { file: SRC + 'entries/tabs/secretary/feedback-tab.js', field: '正式答复内容', msg: '请输入正式答复内容', carrier: '#issue-reply-input', submit: { click: '[data-detail-action="add-reply"]' } },
    ],
  },
  {
    // 批次 47-D 续（2026-09-16）：**支书台 · 赋权管理 · 项目赋权**——一条流程覆盖该表单**三处**校验点。
    // 台账原挂 machine:false 的理由是「需先选定场景/项目，字段联动，前置交互复杂」——**真机证伪**：
    //   ① 被赋权人（PersonPicker）**默认空** → 点提交第一条报的就是它，可达；
    //   ② 「项目」下拉**默认已选中首项**（`loadActivities()` 直接铺 option、无空项）→ 需在 `open[]` 里
    //      `setValue ''` 清空才可达（「默认预选首项」形态）；
    //   ③ 「角色」radio **默认不勾** → 可达。
    //   **「字段联动」是真的，但它只影响选项内容，不影响校验可达性**——把「联动复杂」当不可自动化的理由，
    //   是把「读起来复杂」当成了「跑不通」（同批第三例：见批 ⑨/⑫ 的同类教训）。
    id: 'secretary-assign-project-auth',
    page: 'secretary',
    tab: '赋权管理',
    open: [
      { waitFor: '#confirm-project-auth-btn' },
      { setValue: { selector: '#project-id-select', value: '' } },
    ],
    submit: [{ click: '#confirm-project-auth-btn' }],
    expect: [
      { file: SRC + 'entries/tabs/secretary/assign-tab.js', field: '被赋权人', msg: '请选择被赋权人', carrier: '#project-auth-picker-container .person-picker-trigger', satisfy: { openPicker: { trigger: '#project-auth-picker-container .person-picker-trigger', count: 1 } } },
      { file: SRC + 'entries/tabs/secretary/assign-tab.js', field: '项目', msg: '请选择项目', carrier: '#project-id-select', satisfy: { selectFirstOption: '#project-id-select' } },
      { file: SRC + 'entries/tabs/secretary/assign-tab.js', field: '角色', msg: '请选择角色', carrier: 'input[name="project-role"]' },
    ],
  },
  {
    // 批次 47-D 续（2026-09-16）：**支书台 · 赋权管理 · 常设赋权（设党小组组长）**——同一 tab 的另一个浮态，**一处 2 个校验点**。
    // 入口 `#ws-sec-assign-btn` → `#auth-panel-container`；提交口 `[data-auth-action="confirm"]`。
    // 校验序＝同志 → 党小组；两处都**不需要预先点组**（`selectedGroup` 初值 null），
    // 故 satisfy 只选人即可让第二条可达（与反馈详情的「共载体」坑不同：这里两个判据各读各的状态）。
    id: 'secretary-assign-group-leader',
    page: 'secretary',
    tab: '赋权管理',
    open: [
      { click: '#ws-sec-assign-btn' },
      { waitFor: '[data-auth-action="confirm"]' },
    ],
    submit: [{ click: '[data-auth-action="confirm"]' }],
    expect: [
      { file: SRC + 'entries/tabs/secretary/assign-tab.js', field: '同志', msg: '请选择同志', carrier: '#auth-panel-container .person-picker-trigger', satisfy: { openPicker: { trigger: '#auth-panel-container .person-picker-trigger', count: 1 } } },
      { file: SRC + 'entries/tabs/secretary/assign-tab.js', field: '党小组', msg: '请选择党小组', carrier: '#auth-panel-container [data-auth-action="select-group"]' },
    ],
  },
  {
    // 批次 47-D 续（2026-09-16）：**支书台 · 党小组 · 改组名浮窗**——「默认预填藏必填分支」的**第 7 例**。
    // ⚠ 台账原登记 **flow 写错**（记成「党小组·新建」）：新建浮窗的名字**可留空走默认名**
    //   （`#gp-add-name` placeholder「留空则用「<默认名>」」，`addGroup` 无空值校验），
    //   「组名不能为空」只出现在**改名**浮窗（`#gp-rename-name`，**预填原名** → 必须先在 open 里清空）。
    //   **教训：给校验点定 flow 名时必须回读源码确认分支归属，不能按「最像的浮窗」猜。**
    id: 'secretary-group-rename',
    page: 'secretary',
    tab: '党小组',
    open: [
      { click: '.gp-rename' },
      { waitFor: '#gp-rename-name' },
      { setValue: { selector: '#gp-rename-name', value: '' } },
    ],
    submit: [{ click: '#gp-rename-confirm' }],
    expect: [
      { file: SRC + 'entries/tabs/secretary/group-progress-tab.js', field: '组名', msg: '组名不能为空', carrier: '#gp-rename-name' },
    ],
  },
  {
    // 批次 47-M（2026-09-16）：**独立页 `docs/feedback.html?id=issue-001` · 议题详情评论区**（组件版）。
    // 与支书台「反馈管理」那条是**两处真实调用点**（各自一份内联实现、各自一个输入框 id），故各覆盖一次。
    // `?id=` 是页面自带深链路由（`feedback-entry.js::initRoute`），因此不必先从列表点进去。
    id: 'page-feedback-issue-detail',
    page: 'secretary',
    tab: '独立页 /feedback.html',
    path: '/feedback.html?id=issue-001',
    open: [
      { waitFor: '#comment-input' },
    ],
    submit: [{ click: '#btn-submit-comment' }],
    expect: [
      { file: SRC + 'components/issue-detail.js', field: '评论内容', msg: '请输入评论内容', carrier: '#comment-input' },
    ],
  },
  {
    // 批次 47-M（2026-09-16）：**组长台 · 我的处置 · 待处置事项详情**——一条流程覆盖**两处**校验点。
    // 这里是「同面板两个提交口、共用一个输入框」的第二例（第一例见 `secretary-feedback-issue-detail`）：
    //   「评论」与「提交处置结果」读的是**同一个** `#mydispatch-comment-input`。
    //   ⚠ 恰好安全的原因：两处校验失败都**只 toast 不重渲染**（源码 `showToast(...); return;`）⇒ 输入框始终为空，
    //     两个分支可依次命中；**若中间给共用载体 satisfy 填过值，后一个分支就再也进不去了**（同 47-D 续的坑）。
    //   ⚠ 另一处同源坑的反面：**「待处置」有行不等于「请我汇报」也有行**——三个区各按不同字段过滤（见台账注释）。
    id: 'leader-my-dispatch-detail',
    page: 'leader',
    tab: '我的处置',
    open: [
      { waitFor: '[data-mydispatch-action="open"]' },
      { click: '[data-mydispatch-action="open"]' },
      { waitFor: '#mydispatch-comment-input' },
    ],
    submit: [{ click: '[data-mydispatch-action="comment"]' }],
    expect: [
      { file: SRC + 'services/issues.js', field: '评论内容', msg: '请输入评论内容', carrier: '#mydispatch-comment-input' },
      { file: SRC + 'services/issues.js', field: '处置结果内容', msg: '请输入处置结果内容', carrier: '#mydispatch-comment-input', submit: { click: '[data-mydispatch-action="submit-result"]' } },
    ],
  },
  {
    // 批次 47-M（2026-09-16）：**宣传委员台 · 档案归档 · 上传宣传材料浮窗**——一条流程覆盖**两处**校验点。
    // 校验序：关联活动 → 文件。两处都**出厂即空**（`#upload-activity` 首项 value=""；file input 天然空），
    //   故无需任何 open 期清值——这是与「默认预填藏必填分支」相反的一类：**空态就是可达态**。
    // ⚠ 第二处（文件）的证据力：它同时证明了「**不必给 file input 设值**也能测这支」——
    //   这正是台账原 reason「文件选择器不可脚本设值」被证伪的地方。
    id: 'prop-archive-upload',
    page: 'prop',
    tab: '档案归档',
    open: [
      { click: '#archive-upload-btn' },
      { waitFor: '#upload-confirm' },
    ],
    submit: [{ click: '#upload-confirm' }],
    expect: [
      { file: SRC + 'entries/tabs/prop/archive-tab.js', field: '关联活动', msg: '请先选择关联活动', carrier: '#upload-activity', satisfy: { selectFirstOption: '#upload-activity' } },
      { file: SRC + 'entries/tabs/prop/archive-tab.js', field: '文件', msg: '请先选择文件', carrier: '#upload-file' },
    ],
  },
  {
    // 批次 120（2026-09-21）：**宣传委员台 · 档案归档 · 上传照片浮窗**（照片墙）。
    // 空态即可达态（同 47-M 的档案上传浮窗）：`#photo-upload-file` 天然空 ⇒ 点提交即报。
    // ⚠ 与档案上传浮窗的差别：本浮窗**不要求关联活动**（照片可独立成墙），故只登记一处校验点。
    id: 'prop-photo-wall-upload',
    page: 'prop',
    tab: '档案归档',
    open: [
      { click: '#photo-upload-btn' },
      { waitFor: '#photo-upload-confirm' },
    ],
    submit: [{ click: '#photo-upload-confirm' }],
    expect: [
      { file: SRC + 'entries/tabs/prop/archive-tab.js', field: '图片', msg: '请先选择图片', carrier: '#photo-upload-file' },
    ],
  },
  {
    // 批次 47-M（2026-09-16）：**组长台 · 活动管理 · 活动详情「添加子记录」内联表单**（D7 后仅剩宣传/材料两类）。
    // ⚠ 报文是**动态拼接**（`请填写${type==='publicity'?'宣传标题':'材料名称'}`）⇒ 断言用拼好的整串；
    //   登记项 `msg` 仍取文件中真实存在的字面量（S4 按字面量查出处），两者**故意不同**：
    //   一个证「文案出处存在」，一个证「真机报出来的那一句」。
    id: 'leader-act-subrecord',
    page: 'leader',
    tab: '活动管理',
    open: [
      { click: '.leader-act-item' },
      { waitFor: '.act-sub-add-btn[data-type="publicity"]' },
      { click: '.act-sub-add-btn[data-type="publicity"]' },
      { waitFor: '.record-form-shell .record-save-btn' },
    ],
    submit: [{ click: '.record-form-shell .record-save-btn' }],
    expect: [
      { file: SRC + 'entries/tabs/leader/write-tab.js', field: '宣传标题/材料名称', msg: '请填写宣传标题', carrier: '.record-form-shell .f-title' },
    ],
  },
  {
    // 批次 47-M（2026-09-16）：**独立页 `docs/wizard.html` · 「新建支部…」面板**——一条流程覆盖**两处**校验点。
    // 台账原 reason 两条都写「多步向导」——**错在把「页面上有个分步控件」当成「校验点藏在某一步后面」**：
    //   两处守卫都在**页顶常驻面板**里，`[data-wz-act="toggle-create"]` 点一下即展开。
    // ⚠ 「复制现有」模式必须**真点 radio**（`setValue` 不行）：`S.createMode` 只由 change 监听写入，
    //   且展开/启用源支部下拉也挂在该监听里——**这是「先摸清表单的状态机」的又一例**（同 47-D 续的默认预填类）。
    // ⚠ `#wz-create-source` 全支部只有一个选项（无空占位）⇒ 直接 `selectValue ''` 把 selectedIndex 置 -1
    //   （同 `secretary-assign-project-auth` 的清值手法），空提交即报「请选择源支部」。
    // ⚠ 「首任支书」一支**连勾都不用点**：`#wz-create-appoint` 出厂默认已勾（`S.appointOn=true`）。
    id: 'wizard-create-panel',
    page: 'party-committee',
    tab: '独立页 /wizard.html',
    path: '/wizard.html',
    open: [
      { waitFor: '[data-wz-act="toggle-create"]' },
      { click: '[data-wz-act="toggle-create"]' },
      { waitFor: '#wz-create-name' },
      { click: 'input[name="wz-create-mode"][value="copy"]' },
      { setValue: { selector: '#wz-create-source', value: '' } },
    ],
    submit: [{ click: '[data-wz-act="do-create"]' }],
    expect: [
      { file: SRC + 'components/org-setup-wizard.js', field: '源支部', msg: '请选择源支部', carrier: '#wz-create-source', satisfy: { selectFirstOption: '#wz-create-source' } },
      { file: SRC + 'components/org-setup-wizard.js', field: '首任支书', msg: '请选择首任支书', carrier: '#wz-create-appoint-secretary' },
    ],
  },
  {
    // 批次 47-M（2026-09-16）：**支书台 · 活动管理 · 会议议程「待讨论名单」的目标阶段**（S-2 守卫）。
    // 这条的校验点在**表单最末**（`_submitWritePanel` 里排在三字段之后），故 open[] 必须**先把
    //   活动名称/日期/地点填成合法值**才能走到它——「校验序决定 open 期要预备什么」（同 47-K 的做法）。
    //   日期 `#wp-date` 出厂预填当日 ⇒ 合法，不必再动。
    // ⚠ 三段前置全部实测可脚本化：议程行出厂即有一条；「待讨论名单」是行内 chip（点一下即亮，
    //   同时摘掉 `.wp-agenda-member-slot` 的 hidden，目标阶段下拉与人员选择器**同在**这一块里）；
    //   多选人员复用通用 `openPicker`（选人后关面板，选择仍在位）。
    id: 'secretary-calendar-agenda',
    page: 'secretary',
    tab: '活动管理',
    open: [
      { click: '#ws-sec-write-btn' },
      { waitFor: '[data-action="select-template"]' },
      { click: '[data-action="select-template"]' },
      { waitFor: '#wp-agenda-list' },
      { click: '.wp-agenda-row .wp-agenda-kind[data-kind="attendee-list"]' },
      { waitFor: '.wp-agenda-member-slot .person-picker-trigger' },
      { openPicker: { trigger: '.wp-agenda-member-slot .person-picker-trigger', count: 1 } },
      // ⚠ **这一步是决定性的**（真机首跑即红暴露）：`agenda-form.js::collectAgendaRows` 里有一句
      //   `if (!item) return null;`——**没有议题文字的议程行会被整行丢弃**，于是「待讨论名单已选人但没选目标阶段」
      //   这一支**根本走不到校验**：行被丢掉 ⇒ `agenda` 为空 ⇒ S-2 守卫不触发 ⇒ 表单继续往下走。
      //   即「**校验点在，但你得先让这一行活下来**」——与「默认预填藏必填分支」是**同一族病灶的两面**：
      //   前者＝值把分支挡住了，后者＝空值把**整条数据**挡住了。两者都只能靠**真机跑一遍**才看得见。
      { setValue: { selector: '.wp-agenda-row .wp-agenda-item', value: '（真机普查）讨论关于发展对象转为预备党员' } },
      { setValue: { selector: '#wp-title', value: '（真机普查）议程活动' } },
      { setValue: { selector: '#wp-location', value: '（真机普查）活动地点' } },
    ],
    submit: [{ click: '[data-action="wp-submit"]' }],
    expect: [
      { file: SRC + 'entries/tabs/secretary/calendar-tab.js', field: '目标阶段', msg: '待讨论名单请选择目标阶段', carrier: '.wp-agenda-to' },
    ],
  },
  // 批次 47-Q（2026-09-16，支书裁定「**加过滤 + 种进同源**」）：**内部汇报簇**——一条种子改动解锁四处。
  // 四处的公共前置是「存在 `kind:'report'` 的内部汇报」，而该域的内容单一源 `docs/data/issues.json`
  // **同时是公开匿名反馈页的数据源** ⇒ 直种会让内部汇报出现在公开面。
  // 处置（支书裁定 2026-09-16）：① **公开页加过滤**（`issue-list.js` 传 `kind:'feedback'`，列表与统计同一 kind）；
  //   ② **种进同源**（issue-101 请汇报请求 → 组织委员 p11；issue-102 成员主动汇报 → 组长 p1）；
  //   ③ **服务端按 kind 分流脱敏**（真匿名是**公开反馈**的口径，内部汇报按设计带名）。
  // 四处分别是：
  //   · ①区「请我汇报」行内提交口（`[data-mydispatch-action="submit-report"]`）
  //   · 工作概况「请我汇报」行（`.wo-req-submit`）
  //   · ②区「我发起的汇报」详情评论（`[data-mydispatch-action="open-report"]` → `#mydispatch-comment-input`）
  //   · 支书台「待办」汇报收件箱答复（`.rep-inbox-toggle` 展开 → `.rep-inbox-reply`）
  // ⚠ **两个种子行的 `submittedAt` 故意早于四条公开反馈**（07-05 / 07-08 vs 07-12~07-25）：支书台
  //   「反馈管理」用 `getAll()` 且按提交时间倒序 ⇒ 汇报行排在末尾，既有 `secretary-feedback-*` 流程
  //   所点的「第一行」仍是同一条公开反馈。**这是刻意的日期选择，不是巧合**（改日期会动到那些流程）。
  // ⚠ ②区与③区的详情**共用同一个 `#mydispatch-comment-input` 与 `[data-mydispatch-action="comment"]`**
  //   （同一 `#mydispatch-detail` 容器、不同 open 链）⇒ 两条流程的载体与提交口一致，**区别只在怎么进详情**。
  {
    id: 'org-my-dispatch-report-request',
    page: 'org',
    tab: '我的处置',
    open: [
      { waitFor: '[data-mydispatch-action="submit-report"]' },
    ],
    submit: [{ click: '[data-mydispatch-action="submit-report"]' }],
    expect: [
      { file: SRC + 'services/issues.js', field: '汇报内容', msg: '请填写汇报内容', carrier: '[id^="report-req-input-"]' },
    ],
  },
  {
    id: 'org-work-overview-report',
    page: 'org',
    tab: '工作概况',
    open: [
      { waitFor: '.wo-req-submit' },
    ],
    submit: [{ click: '.wo-req-submit' }],
    expect: [
      { file: SRC + 'components/work-overview.js', field: '汇报内容', msg: '请填写汇报内容', carrier: '#wo-req-list-host input[id^="wo-req-"]' },
    ],
  },
  {
    id: 'leader-my-dispatch-my-report',
    page: 'leader',
    tab: '我的处置',
    open: [
      { waitFor: '[data-mydispatch-action="open-report"]' },
      { click: '[data-mydispatch-action="open-report"]' },
      { waitFor: '#mydispatch-comment-input' },
    ],
    submit: [{ click: '[data-mydispatch-action="comment"]' }],
    expect: [
      { file: SRC + 'services/issues.js', field: '评论内容', msg: '请输入评论内容', carrier: '#mydispatch-comment-input' },
    ],
  },
  {
    id: 'secretary-report-inbox-reply',
    page: 'secretary',
    tab: '待办',
    open: [
      { waitFor: '.rep-inbox-toggle' },
      { click: '.rep-inbox-toggle' },
      { waitFor: '[id^="rep-inbox-input-"]' },
    ],
    submit: [{ click: '.rep-inbox-reply' }],
    expect: [
      { file: SRC + 'components/report-inbox.js', field: '答复内容', msg: '请填写答复内容', carrier: '[id^="rep-inbox-input-"]' },
    ],
  },
  // 批次 47-Z（2026-09-17）：**本条是「跨页前置链」的第一个实例**（台账里最后一条 `machine:false` 转正）。
  // 为什么必须跨页：该校验点的前置**不是「打开某个浮态」，而是「队列里得有一条待确认请求」**——
  //   而这条队列**只存在于产生它的那个浏览器会话**（纯客户端：`mockDB.pendingMemberConfirmations` +
  //   自管 localStorage 键 `gsm1921-member-confirmations`，mock/api 两态都没有服务端表）。
  //   ⇒ 原 reason 写的「组织委员在**某台**发起一次变更 → 该待办即出现」是**不成立的跨人假设**（如实更正）。
  // 真正可达的链（同一会话内）：支书本人也在该写权内（`person-entry.js::EDIT_ROLES`）⇒
  //   `person.html?id=p7` →「编辑档案」→ 改「发展阶段」（`[data-field="developStage"]`，报支书确认那一组）
  //   → 保存 ⇒ 队列里出现一条 pending ⇒ 回支书台「待办」→ 成员发展域 → 组行进详情 ⇒ 退回按钮在位。
  // 依赖的新能力：`{ goto }`（跨页跳转）· `{ openTab }`（跳回工作台后切 tab）——与 `dialogAnswer` / `reopen[]`
  //   同规：**形态逼出来的能力，不是为凑覆盖**。
  // ⚠ **2026-09-21 批次 127 改准（改测试不改制度，同 `D-513` 口径）**：原前置改的是 `p7`（**积极分子**）→
  //   「**发展对象**」；`D-553` 起该步**受「支委会讨论门」前置**（未上会讨论通过即被挡）⇒ 队列里不再出现 pending、
  //   本流程在「等 `secretary:member-confirm` 组行」处超时。本流程只为**造一条 pending**（校验点是「退回原因」必填），
  //   **与目标阶段无关** ⇒ 改用**不受该门约束**的 `积极分子 → 预备党员`（同一个人、同一处写口，**判据一字未改**）。
  {
    id: 'secretary-todo-reject-reason',
    page: 'secretary',
    tab: '待办',
    open: [
      { goto: '/person.html?id=p7' },
      { waitFor: '#person-edit-btn' },
      { click: '#person-edit-btn' },
      { waitFor: '#person-edit-modal-form' },
      { selectValue: { selector: '[data-field="developStage"]', value: '预备党员' } },
      { click: '#person-edit-modal-form button[type="submit"]' },
      { goto: '/workspace/secretary.html' },
      { waitFor: 'button[role="tab"]' },
      { openTab: '待办' },
      { waitFor: '.secretary-todo-item-main[data-group-key="secretary:member-confirm"]' },
      { click: '.secretary-todo-item-main[data-group-key="secretary:member-confirm"]' },
      { waitFor: '[data-mc-id][data-decision="rejected"]' },
      { click: '[data-mc-id][data-decision="rejected"]' },
      { waitFor: '#mc-reject-note' },
    ],
    submit: [{ click: '[data-mc-reject-ok]' }],
    expect: [
      { file: SRC + 'entries/tabs/secretary/todo-tab.js', field: '退回原因', msg: '请填写退回原因', carrier: '#mc-reject-note' },
    ],
  },
  // 批次 47-R（2026-09-16，支书裁定「过渡态种子都补」）：**过渡态种子簇**——三处，两改种子 + 一处补登记。
  // 三处的共同点：**都缺「过渡态数据」而不是缺功能**（按钮只在某个状态分支里渲染，而种子里永远没有那个状态）。
  // 1) 成员台「我的复盘」：种子把 p5 排为 act-3 的 `deep`（复盘责任人）⇒ 行卡出现。
  // 2) 思想汇报「修改并重新提交」：种子补 tr-5（p5 · needs_revision）⇒ 本人可见修改态。
  //    ⚠ 这条**只改 `docs/src/mock/thought-reports.js` 就够了**（与 47-P 的 `review_requests` 不同）：
  //      `loadThoughtReports()` 在 `mockDB.thoughtReports` 为空时**回退模块常量** ⇒ api 形态同样看得到。
  // 3) 思想汇报「打回」（`#tr-reject-confirm`）：**这处此前压根没登记在台账里**——种子里 tr-4（p3）
  //    本就存在、组织委员一直可达，只是**没人登记、也就没人跑**。本批补登记并直接覆盖。
  //    （2026-09-18 批次 86 取消初阅门后：打回改为**事后反馈**，组织委员对任一篇都可发起 ⇒ 该流程仍可达。）
  //    ⇒ **「台账不是全量」的实例**：S0 只防规模缩水、S2 只防 machine:true 漏覆盖，**都防不了「漏登记」**。
  {
    id: 'visitor-activity-review',
    page: 'visitor',
    tab: '我的复盘',
    open: [
      { waitFor: '.review-toggle' },
      { click: '.review-toggle' },
      { waitFor: '.btn-review-submit' },
    ],
    submit: [{ click: '.btn-review-submit' }],
    expect: [
      { file: SRC + 'entries/tabs/visitor/review-tab.js', field: '复盘总结', msg: '请填写复盘总结', carrier: '[id^="review-textarea-"]' },
    ],
  },
  {
    id: 'visitor-thought-report-resubmit',
    page: 'visitor',
    tab: '独立页 /thought-report.html?id=tr-5',
    path: '/thought-report.html?id=tr-5',
    open: [
      { waitFor: '#tr-resubmit-toggle' },
      { click: '#tr-resubmit-toggle' },
      { waitFor: '#tr-resubmit-confirm' },
      // ⚠ 「**默认预填藏必填分支**」第 **14** 例（本批首跑抓到）：`#tr-resubmit-content` 出厂就预填了
      //   **原文正文**（`thought-report-entry.js` 的 `${esc(rec.content)}`）⇒ 直接点「重新提交」会**成功**
      //   （真机实测提示「✓已重新提交，入库归档」），必填分支根本走不到。**同款解法：open 里先清空。**
      //   ⚠ 这条形态值得单列：它的预填**不是占位符也不是默认值，而是「上一次的内容」**——
      //     「修改重交」这个场景天然带原值，故此类表单**永远**需要先清空才能测必填。
      { setValue: { selector: '#tr-resubmit-content', value: '' } },
    ],
    submit: [{ click: '#tr-resubmit-confirm' }],
    expect: [
      { file: SRC + 'entries/thought-report-entry.js', field: '修改后的思想汇报内容', msg: '请填写修改后的思想汇报内容', carrier: '#tr-resubmit-content' },
    ],
  },
  {
    id: 'org-thought-report-reject',
    page: 'org',
    tab: '独立页 /thought-report.html?id=tr-4',
    path: '/thought-report.html?id=tr-4',
    open: [
      { waitFor: '#tr-reject-toggle' },
      { click: '#tr-reject-toggle' },
      { waitFor: '#tr-reject-confirm' },
    ],
    submit: [{ click: '#tr-reject-confirm' }],
    expect: [
      { file: SRC + 'entries/thought-report-entry.js', field: '打回意见', msg: '打回须填写意见', carrier: '#tr-reject-note' },
    ],
  },
];

// ── 成功路径流程清单（Q-23-44，2026-09-16）────────────────────────────────
// **为什么单列而不是并进 MACHINE_FLOWS**：两者守的是**两种不同的病**，合并会重犯「口径不实」——
//   · MACHINE_FLOWS ⇒ 问「**没填对时**会不会好歹说一声、且框在不在」（校验分支 + 载体在位）；
//   · SUCCESS_FLOWS ⇒ 问「**填对了之后**到底成不成」——有没有成功提示、动作有没有真的改变状态、
//     重载之后数据还在不在（＝落库 + 列表刷新）。
// 一条流程可以只在前者、也可以只在后者；`machine:true` **不蕴含**本清单，反之亦然。
//
// 流程字段（复用 MACHINE_FLOWS 的 open[] 选择器链，**不另写一套**）：
//   open[]  同阶段一：点到表单就位
//   ready   阶段二的「就位标记」选择器（**必填**）：触发口（act）往往要等填值后才挂载，
//           不能拿它当就位判据；这里给一个 open 完成后立即可见、且**未填值前就已存在**的元素。
//   fill[]  填入**合法值**（步骤形态与 open[] 完全一致，共用 runStep）
//   act[]   触发动作（点提交/应用）
//   toast   提交后**必须**出现的成功提示子串（缺失或无提示 ⇒ 静默失败，违规）
//   toastTimeoutMs（可选）等成功提示的窗口（毫秒，缺省 4000）。**长链必须显式声明**——
//           批 47-S 真机实测：组长台「写入活动」要串行建 16 个 SOP 任务（每个写口 600ms）
//           ⇒ 约 10s 才弹提示，用缺省 4s 会被判「静默失败」（＝把「慢」误判成「没成」）。
//   settleMs（可选）触发动作后、重载前的**落库窗口**（毫秒）——仅写口 `persist()` 为 fire-and-forget
//           （不 await）的流程需要；不给窗口则重载会打断在途写，③ 就测错了对象。
//   independent（`path` + `reload` 时**必填**）页面形态：true = 独立页 `docs/*.html`（无 tab 条）；
//           false = 工作台深链 `/workspace/x.html?tab=y`（有 tab 条，重载后须切回 `tab`）。
//           **判据是「页面形态」而不是「有没有用 path」**——同一个 `path` 手段对应两种页面，
//           按手段分流会让深链页跳过「等 tab 渲染」⇒ 断言对象未渲染即开跑 = 假红（批次 47-S 的由来）。
//   noticeSel（可选）**成功提示的载体**：缺省全局 toast（`#toast-container`）。写口的成功提示若落在
//           **面板内状态区**（如制度浮窗的 `showStatus()` → `#ref-modal-status`），必须显式指定——
//           与阶段一同一条纪律：**提示载体读错 = 把「有提示」误判成「静默失败」**（且反过来也成立）。
//   reopen[]（可选，批次 47-V）`reload` 之后、断言之前**重跑的前置步骤**——「详情面板 / 浮窗」类写口
//           在整页重载后会**被收起**（展开状态不落库），不重新展开就只能得到「载体不在位」的假红。
//           ⚠ 它**不削弱** ③：重载已把 DOM 整体替换，重新展开后还能看到那段文本，恰证明它**来自落库数据**。
//   reload  true ⇒ 整页重载后再点回该 tab 再跑 asserts（**这一条才是「落库 + 刷新」的证据**）
//   asserts[] 三选一（**重载前后各跑一次**：前＝当场刷新、后＝真落库）：
//     · { selectValuesAll: { selector, value, min } } —— 匹配到的**每个** select 的值都等于 value（动作真改了状态）
//     · { text, carrier } —— carrier 可见（判据同阶段一）且其文本含 text（列表里真出现了新条目）
//     · { countUp: N, carrier } —— carrier 里的**计数**（文本首个整数）比**动作前**至少多 N（批次 47-T 立）。
//       为什么要有这一种：`{ text, carrier }` 只能断言**绝对值**，而绝对值会随**种子与同批其它流程**变动
//       （本条流程原写死「共 54 人」：定向跑绿、全量跑红，实测「共 55 人」）。**绝对值看似是「事实」，其实是
//       「此刻的巧合」**——本类要证的只是「这次动作真往这个列表里写了东西」，判增量才落在事实上。
//   knownGap（可选）**已坐实的产品缺口白名单**（批次 47-S 首次使用，形态与阶段一的 `machine:false` 同源）：
//           登记了 `knownGap` 的流程**不在本轮执行**，但**必须打 `reason`**且**计入基线**——
//           目的与 `machine:false` 完全一致：把「暂时证不了」与「懒得证」分开，且**缺口本身留在台账里**，
//           一旦补上就下调基线（不补则基线会因删条目而红）。**绝不用「只断言 toast」蒙过去**——
//           那正是本阶段要防的「只弹 toast 不办事」的伪装形态。
export const SUCCESS_FLOWS_BASELINE = 17;
/** 成功路径白名单（knownGap）规模基线——只减不增；补上一处即同批下调 */
export const SUCCESS_FLOWS_KNOWN_GAP = 0;

export const SUCCESS_FLOWS = [
  {
    // Q-23-44 首个样本（支书 2026-09-16 裁定：本条归 Q-23-44 而非 47-D）。
    // 事实依据：`#att-batch-status` / `#att-batch-apply` 在 VALIDATION_SITES **无对应必填校验点**
    //   ——它没有「空提交会报错」的分支，是纯成功路径动作（源码 384-395：无值就走 error 提示，
    //   但那个提示不是「字段级必填」，故从未登记）。阶段一永远抓不到它，这正是本阶段存在的理由。
    // 判据：点「应用到全部」后，**逐人下拉真的被改写**（不是只弹个 toast）。
    id: 'leader-attendance-batch-status',
    page: 'leader',
    tab: '考勤上传',
    open: [
      { click: '#btn-leader-upload-att' },
      { waitFor: '#att-form-panel' },
    ],
    ready: '#att-activity-select',
    fill: [
      { selectFirstOption: '#att-activity-select' },
      { openPicker: { trigger: '#att-person-picker-container .person-picker-trigger', count: 2 } },
      { selectValue: { selector: '#att-batch-status', value: 'present' } },
    ],
    act: [{ click: '#att-batch-apply' }],
    // 2026-09-17 批次 49：文案随「不许假成功」一并更正——本按钮只把状态下发到各行下拉（改 DOM），
    // 落库在随后点「提交考勤」时。原文案「已批量设为…」让用户以为已保存（真机判据改的是**文案**，
    // 动作与断言一行未动；判据仍判「动作改变了什么」＝ 各行下拉值确已变为 present）。
    toast: '已批量填入',
    asserts: [
      // ⚠ 选择器必须带元素限定 `select[...]`：只写 `[id^="att-status-"]` 会把**列表宿主 `#att-status-rows`**
      //   一起匹配进来（它也在同前缀下、value 为空），于是「每个值都等于 present」恒不成立——首次跑真机即踩到。
      { selectValuesAll: { selector: 'select[id^="att-status-"]', value: 'present', min: 2 } },
    ],
  },
  {
    // Q-23-44 第二个样本：**带 reload 的一条**（覆盖「落库 + 列表刷新」这个最关键、也最容易假绿的面）。
    // 选它的理由：保存分支有真闭环（`persist()` 落库 + `renderContent()` 重渲染 + 列表出现新条目），
    //   且校验分支已由阶段一流程 ⑧ 覆盖——**同一条 open 链，两个阶段各证一半**，边际成本最低。
    // 填入的周次用定值（**不依赖当天日期**），否则「重载后断言」会随时钟变动而假红。
    id: 'prop-weekly-add-week-save',
    page: 'prop',
    tab: '周报报送',
    open: [
      { click: '#weekly-add-btn' },
      { waitFor: '#weekly-add-save' },
    ],
    ready: '#weekly-add-form',
    fill: [
      { setValue: { selector: '#weekly-add-week', value: '第98周' } },
      { setValue: { selector: '#weekly-add-range', value: '2027-01-04 ~ 2027-01-08' } },
    ],
    act: [{ click: '#weekly-add-save' }],
    toast: '已新建周次',
    reload: true,
    // 落库窗口：本写口是 `mockDB.weeklyReports = …; persist(); showToast(…)` —— persist 不 await，
    // 提示先于落库；不给窗口则重载会打断在途写（详见 form-loop-sweep 的 ⓪ 说明）。
    settleMs: 1500,
    asserts: [
      { text: '第98周', carrier: '#weekly-week' },
    ],
  },
  {
    // 批次 47-M（2026-09-16）· Q-23-44 第三个样本：**「我的处置」评论成功路径**。
    // 选它的理由很直接——**这条成功路径在批 47-M 之前是坏的**：`services/issues.js` 用了 11 次
    //   `showToast(...)` 却没 import 它，成功分支的 `showToast('success','评论已添加')` **抛在写之后**
    //   ⇒ 「数据已经落库，界面一声不吭」。本流程的第一条判据（成功提示）**正是那个 bug 的回归守卫**：
    //   若有人再把导入删掉，本条立刻红，而不必等谁去读源码。
    // ⚠ `reload:false`：本 tab 的详情态是**模块态**（`_renderMyDispatchDetail` 由点击驱动），
    //   整页重载会退回列表视图 ⇒ 断言对象不存在。故本条只证「当场真生效」（时间线里真出现新评论），
    //   **落库面留给第四条的独立页流程**（那条有稳定 URL 可重载）——两条合起来才覆盖 ②③。
    id: 'leader-my-dispatch-detail-comment',
    page: 'leader',
    tab: '我的处置',
    open: [
      { waitFor: '[data-mydispatch-action="open"]' },
      { click: '[data-mydispatch-action="open"]' },
      { waitFor: '#mydispatch-comment-input' },
    ],
    ready: '#mydispatch-comment-input',
    fill: [
      { setValue: { selector: '#mydispatch-comment-input', value: '（成功路径普查）我的处置评论' } },
    ],
    act: [{ click: '[data-mydispatch-action="comment"]' }],
    toast: '评论已添加',
    asserts: [
      { text: '（成功路径普查）我的处置评论', carrier: '#mydispatch-detail' },
    ],
  },
  {
    // 批次 47-M（2026-09-16）· Q-23-44 第四个样本：**独立页议题详情评论成功路径（含整页重载）**。
    // 选它的理由：它是「同一个动作在两个载体上」的另一半（组件版 `issue-detail.js`，与支书台内联版对照），
    //   而且**有稳定 URL**（`?id=`）⇒ 能把 ③「重载后仍成立」这条最关键的判据真正跑起来。
    // ⚠ 这条同时是对 `issue-detail.js` **写链**的取证。**历史沿革（如实登记，R-75 口径更正不删只换）**：
    //   · 批次 47-M～47-S 时该写链**不走 `IssueStore.addComment`**，而是自己改缓存 + 直接写 localStorage
    //     缓存键 ⇒ 「③ 重载后仍成立」证的只是**缓存没被读回覆盖**，**不得读成「服务端也收到了」**。
    //   · **批次 88（2026-09-18 · `D-486`）已改**：写链改走服务层 `IssueStore.addComment`（内含
    //     `_syncIssueToApi`），并给 `feedback.html` 补上数据源 hydrate ⇒ 支书侧提交**会 PATCH 回服务端**，
    //     重载后从服务端读回 ⇒ 本条现在**确实能证「服务端收到了」**（真机网络面实测 PATCH /api/v1/issues/:id）。
    //   ⚠ 与 47-S 的更正并存：47-S 那句「普查经真服务端登录 ⇒ api 形态」仍然成立，本条不再需要它来「解释为何证不了服务端」。
    //   ✅ **批次 47-S（2026-09-16）口径更正（AI 自纠，如实入册）**：原写「普查全程跑在 **mock 态**
    //     （`createApp` 内存库 + 前端 mock 源）」——**这句是错的**。真机实测：本普查经**真服务端
    //     `login.html` 登录**，登录成功即写入 `sessionStorage['gsm1921-api-token']` ⇒ `getDataSource()`
    //     返回 **'api'**，写口走 `/api/v1/*`、落服务端表；网络面实测可见 `POST /api/v1/snapshot`（204）。
    //     **结论仍成立但理由不同**：本流程证不了服务端，是因为**这条链本身不走服务端写口**，不是因为「跑在 mock 态」。
    //     ⚠ 这条更正会改写一串既有条目的解读方式（凡「mock 态证不了服务端」的说法都要按本条重读），
    //     且**它正是 `org-roster-member-add-save` 那条缺口的成因**：api 形态下前端部分读链仍返回静态种子。
    id: 'page-issue-detail-comment',
    page: 'secretary',
    tab: '独立页 /feedback.html',
    path: '/feedback.html?id=issue-001',
    open: [
      { waitFor: '#comment-input' },
    ],
    ready: '#comment-input',
    fill: [
      { setValue: { selector: '#comment-input', value: '（成功路径普查）独立页议题评论' } },
    ],
    act: [{ click: '#btn-submit-comment' }],
    toast: '评论已提交',
    reload: true,
    independent: true,
    asserts: [
      { text: '（成功路径普查）独立页议题评论', carrier: '#issue-detail-container' },
    ],
  },
  {
    // 批次 47-N（2026-09-16）· Q-23-44 第五个样本：**支书台 · 通知发布**（全站最高频的写口）。
    // 选它的理由：它是「**写口 → 列表 → 重载仍在**」三段最典型的一条，且**校验面早已在阶段一覆盖**
    //   （`secretary-notification` 一条流程三处）——本阶段只补「填对之后到底成不成」，边际成本最低。
    // ⚠ 受众是**多选 chip**（`[data-notif-action="select-audience"]` 点一下即选中，非下拉），
    //   故 fill 里只需点第一个 chip；本条**不断言受众文案**（换 chip 即会变，属易碎断言）。
    id: 'secretary-notification-publish',
    page: 'secretary',
    tab: '通知发布',
    open: [
      { waitFor: '#notif-title' },
    ],
    ready: '#notif-title',
    fill: [
      { setValue: { selector: '#notif-title', value: '（成功路径普查）通知标题' } },
      { setValue: { selector: '#notif-content', value: '（成功路径普查）通知正文——本条由真机成功路径写入。' } },
      { click: '[data-notif-action="select-audience"]' },
    ],
    act: [{ click: '[data-notif-action="publish"]' }],
    toast: '已发布至',
    settleMs: 1500,
    reload: true,
    asserts: [
      { text: '（成功路径普查）通知标题', carrier: '#notification-list-area' },
    ],
  },
  {
    // 批次 47-N（2026-09-16）· Q-23-44 第六个样本：**党委台 · 支部管理 · 新建支部**。
    // 选它的理由：这是**唯一一条跨越「前端表单 → 服务端 createBranch → 列表刷新」的完整落库链**，
    //   而阶段一只覆盖到它的第一处校验（支部名不能为空）——**成功面此前完全没有证据**。
    // ⚠ 断言载体取**整个 tab 容器**而非 `[data-branch-card]`：`CARRIER_PROBE` 只返回**首个**匹配元素的文本，
    //   而 `[data-branch-card]` 有多个（首个是既有支部）⇒ 必须用能覆盖全部卡片的外层容器。
    id: 'pc-branch-create',
    page: 'party-committee',
    tab: '支部管理',
    open: [
      { click: '#branch-add-toggle' },
      { waitFor: '#branch-form-submit' },
    ],
    ready: '#branch-name-input',
    fill: [
      { setValue: { selector: '#branch-name-input', value: '（成功路径普查）第二党支部' } },
    ],
    act: [{ click: '#branch-form-submit' }],
    toast: '已创建',
    settleMs: 1500,
    reload: true,
    asserts: [
      { text: '（成功路径普查）第二党支部', carrier: '#party-committee-tab-content' },
    ],
  },
  {
    // 批次 47-O（2026-09-16）· Q-23-44 第七个样本：**组织委员台 · 专班管理 · 发起专班（发布）**。
    // 选它的理由：**发起专班**是组织委员最高频的写口，且它的成功面**比校验面复杂得多**——
    //   `创建即自动报送支委会表决`（`submitForCommittee`）是**两步写**：先 `TaskForceRecordStore.add`
    //   落库，再报送；两步任一失败都是不同的提示（源码里 `submitOk` 为假时单独 toast 报「自动报送失败」）。
    //   即「**成功提示本身就是链路完整性证据**」——它只在这两步都成时才说「已报送支委会表决」。
    // ⚠ `dispatchSubmit` 而非 `click`：recruit 表单控件带原生 required，浏览器原生校验会先拦「点提交」。
    id: 'org-taskforce-recruit-publish',
    page: 'org',
    tab: '专班管理',
    open: [
      { click: '#btn-publish-tf' },
      { waitFor: '#recruit-form' },
    ],
    ready: '#rf-name',
    fill: [
      { setValue: { selector: '#rf-name', value: '（成功路径普查）发起专班' } },
      { setValue: { selector: '#rf-task', value: '（成功路径普查）任务描述' } },
      { setValue: { selector: '#rf-capacity', value: '3' } },
      { setValue: { selector: '#rf-deadline', value: '2026-10-31' } },
    ],
    act: [{ dispatchSubmit: '#recruit-form' }],
    toast: '发布成功，已报送支委会表决',
    settleMs: 1800,
    reload: true,
    asserts: [
      { text: '（成功路径普查）发起专班', carrier: '#org-tab-content' },
    ],
  },
  {
    // 批次 47-O（2026-09-16）· Q-23-44 第八个样本：**独立页 wizard.html · 新建「空支部」成功路径**。
    // ⚠ 关键手法（本批新学、已写进台账注释）：**取消勾选「就地任命首任骨干」不要靠 `click`，要靠 `setChecked`**——
    //   `_doCreate` 读的是 **DOM 的 `appointBox.checked`**（不读 `S.appointOn`），而 `setChecked` **故意不派发 change**；
    //   两者恰好对上：既不需要触发面板重渲染（免得把刚填的支部名冲掉），又能改到 `_doCreate` 真正读的那个值。
    //   ⚠ 顺序也有讲究：**先取消勾选、后填支部名**——反向写会踩「面板因 change 重渲染而清空输入」的坑。
    // 选它的理由：它与 `component/组织配置向导` 阶段一那条是**同一面板的两条出口**（失败出口 vs 成功出口），
    //   而成功出口是**跨「向导 → 服务端 createBranch → 切到新支部并重渲染」的完整落库链**。
    id: 'wizard-branch-create-empty',
    page: 'party-committee',
    tab: '独立页 /wizard.html',
    path: '/wizard.html',
    open: [
      { waitFor: '[data-wz-act="toggle-create"]' },
      { click: '[data-wz-act="toggle-create"]' },
      { waitFor: '#wz-create-name' },
    ],
    ready: '#wz-create-name',
    fill: [
      { setChecked: { selector: '#wz-create-appoint', checked: false } },
      { setValue: { selector: '#wz-create-name', value: '（成功路径普查）第三党支部' } },
    ],
    act: [{ click: '[data-wz-act="do-create"]' }],
    toast: '已创建——新支部为空',
    settleMs: 1800,
    reload: true,
    independent: true,
    asserts: [
      { text: '（成功路径普查）第三党支部', carrier: '#wizard-content' },
    ],
  },
  {
    // 批次 47-O（2026-09-16）· Q-23-44 第九个样本：**支书台 · 上报党委（提交上报）**。
    // 选它的理由（**一箭双雕**）：① 它是支书台高频写口，阶段一已覆盖其第一处校验；
    //   ② 更重要——**它是「党委台驳回意见」那一条 `machine:false` 的前置数据来源**！
    //     台账里 `party-committee/review-tab.js` 驳回意见的纳入条件写的正是「支书台先真机走一次成功路径
    //     造出待批复事项」。本条把那个条件**变成可自动执行的步骤**：成功路径跑通 ⇒ 待批复事项即存在。
    //     ⚠ 但**本批不据此就把驳回意见转 machine:true**：按纪律（47-L/47-M 两次教训），
    //       「前置已能造出」只是**必要条件**，还须真机跑一遍驳回流程确认可达，下一批再动。
    // ⚠ 类型默认选中第一个（`data-rq-type-label` 首项），故只需填标题与说明。
    id: 'secretary-report-up-submit',
    page: 'secretary',
    tab: '上报党委',
    open: [
      { click: '#rq-submit-toggle' },
      { waitFor: '#rq-form-submit' },
    ],
    ready: '#rq-title',
    fill: [
      { setValue: { selector: '#rq-title', value: '（成功路径普查）请示事项' } },
      { setValue: { selector: '#rq-content', value: '（成功路径普查）本条请示由真机成功路径写入。' } },
    ],
    act: [{ click: '#rq-form-submit' }],
    toast: '已提交：',
    settleMs: 1800,
    reload: true,
    asserts: [
      { text: '（成功路径普查）请示事项', carrier: '#rq-list' },
    ],
  },
  {
    // 批次 47-S（2026-09-16）· Q-23-44 第十个样本：**组织委员台 · 名册管理 · 新增成员**。
    // 选它的理由：**名册是「人」维度的单一源**，新增成员是所有下游（应到名单 / 考勤候选 / 通知受众 /
    //   发展数据）的入口——它若只弹 toast 不落库，全站人维数据都跟着错，而此前**只有失败面有证据**。
    // ⚠ 本条的页面形态值得记一笔：它走 `path` 直达，但**该 path 是工作台深链而非独立页**
    //   （`/workspace/org.html?tab=roster`）⇒ ③ 重载后**有** tab 条、必须切回 `tab`。这正是本批
    //   把「重载后是否切 tab」的判据从 `flow.path` 改成 `flow.independent` 的原因
    //   （见 form-loop-sweep 的说明）——按手段分流会让本条跳过「等 tab 渲染」而**假红**。
    // ⚠ `tab` 取**真实 tab 文案**「成员名册」（阶段一那条取的是 `成员名册（?tab=roster）`，
    //   那是给「人看的备注」而不是可点中的文案；`activateTab` 按文案匹配，备注形态切不过去）。
    id: 'org-roster-member-add-save',
    page: 'org',
    tab: '成员名册',
    path: '/workspace/org.html?tab=roster',
    open: [
      { click: '#roster-add-btn' },
      { waitFor: 'form[data-modal-form] button[type="submit"]' },
    ],
    ready: 'form[data-modal-form] input[data-field="name"]',
    fill: [
      { setValue: { selector: 'form[data-modal-form] input[data-field="name"]', value: '（成功路径普查）新增成员甲' } },
    ],
    act: [{ click: 'form[data-modal-form] button[type="submit"]' }],
    toast: '已新增成员',
    settleMs: 1800,
    reload: true,
    independent: false,
    // ⚠ **本条的来历（批次 47-S 最有价值的一处）**：初版断言真机即红——落库**成功**
    //   （探针直查服务端：users 表确有新行、`branchId=br-b1`），但名册读链看不到，
    //   根因是 `services/person.js::_baseMemberRecords()` 的 api 分支写死 `return [...PEOPLE]`
    //   （静态种子），而写侧 `_syncMockDBUsers()` 同步的是 `mockDB.users` ⇒ **假成功**。
    //   支书 2026-09-16 裁定「现在补齐 api 读链」→ 该分支已改为读服务端同步缓存，
    //   本条的 knownGap 白名单**同批撤销、基线下调为 0**（缺口补上就必须同批下调基线，
    //   否则 S5 的白名单计数会红——这正是那道断言存在的意义）。
    //   ⚠ 影响面不止这一条动作：**api 形态下名册的新增/编辑/移出读的是同一条读链**，
    //     故本条同时是那三处的回归守卫。
    asserts: [
      // ⚠ **为什么不直接断言「新成员的名字出现在列表里」**：名册走统一检索引擎，**分页 10 条/页**，
      //   新成员按种子顺序**追加在末页** ⇒ 用 `#roster-list-host` 当载体只能看到第 1 页（实测踩到）。
      //   故改断言**该列表自己的计数**（`.lf-count`，文案 `共 N 人`）——它由 `rows` 现算，
      //   「当场 51 + 重载后仍 51」同时证了「真写了」「真读出来了」「真落库了」。
      //   **口子在这里**：N 由种子决定（`PEOPLE` 51 条中 `branchId` 非空者 50 条 ⇒ 新增后 51）。
      //   **若将来增删种子人员，必须同步改这里的 N**——否则本条会红，而那是「断言过期」不是「产品坏了」。
      { text: '共 51 人', carrier: '#roster-list-host .lf-count' },
    ],
  },
  {
    // 批次 47-S（2026-09-16）· Q-23-44 第十一个样本：**党委台 · 下发通知**。
    // 选它的理由：与 `secretary-notification-publish` 是**同一动作的两侧**（支部发 vs 党委发），
    //   而党委下发是「院系 → 支部」通道的唯一起点；阶段一只覆盖到它的失败面（目标支部 / 标题正文）。
    // ⚠ 目标支部**不必在 fill 里勾选**：`_readFormState` 的缺省就是「全支部选中」
    //   （源码 `(mockDB.branches||[]).map(b => b.id)`）——阶段一那条要 `setChecked false` 正是为了
    //   把这个缺省**清掉**才够得着「请选择目标支部」；成功路径**保留缺省**即可，这属同一形态的两面。
    // ⚠ 断言载体用 `#dispatch-history`（单元素，其 textContent 含**全部**下发记录）：
    //   `CARRIER_PROBE` 只取**首个**匹配元素，若改用「单条记录」的选择器就会撞上既有的演示记录。
    id: 'pc-dispatch-publish',
    page: 'party-committee',
    tab: '下发通知',
    open: [],
    ready: '#dispatch-title',
    fill: [
      { setValue: { selector: '#dispatch-title', value: '（成功路径普查）下发通知标题' } },
      { setValue: { selector: '#dispatch-content', value: '（成功路径普查）下发通知正文——本条由真机成功路径写入。' } },
    ],
    act: [{ click: '#dispatch-submit' }],
    toast: '已下发至',
    settleMs: 1500,
    reload: true,
    asserts: [
      { text: '（成功路径普查）下发通知标题', carrier: '#dispatch-history' },
    ],
  },
  {
    // 批次 47-S（2026-09-16）· Q-23-44 第十二个样本：**组长台 · 活动管理 · 发起活动**。
    // 选它的理由：这条链是**全站最长的写链之一**——`writeActivityWithSOP` 一次写活动 + 派生后续待办，
    //   随后 `TodoStore.completeBySource` 销待办、`recordProjectGrants` 记赋权快照、`setState` 刷列表。
    //   阶段一只覆盖三处必填，**「创建之后到底成不成」此前没有证据**。
    // ⚠ 就位标记取 `#dt-title` 而非 `#dt-submit`：本面板**默认收起**（`showPanel=false`），
    //   点一次 `#btn-leader-create` 才展开；`open[]` 已按阶段一的同一链展开并清掉日期预填。
    id: 'leader-write-activity-save',
    page: 'leader',
    tab: '活动管理',
    open: [
      { click: '#btn-leader-create' },
      { waitFor: '#dt-submit' },
      { setValue: { selector: '#dt-target-date', value: '' } },
    ],
    ready: '#dt-title',
    fill: [
      { setValue: { selector: '#dt-target-date', value: '2026-10-30' } },
      { setValue: { selector: '#dt-location', value: '（成功路径普查）光华1号楼101报告厅' } },
      { setValue: { selector: '#dt-title', value: '（成功路径普查）发起活动甲' } },
    ],
    act: [{ click: '#dt-submit' }],
    toast: '创建成功',
    // 长链窗口：本流程 `writeActivityWithSOP` 会**串行创建 16 个 SOP 任务**（每写口 600ms）
    // ⇒ 真机实测约 10s 才弹「创建成功」（见 form-loop-sweep 的 ① 说明）。
    toastTimeoutMs: 30000,
    settleMs: 1800,
    reload: true,
    asserts: [
      { text: '（成功路径普查）发起活动甲', carrier: '#leader-activity-list' },
    ],
  },
  {
    // 批次 47-S（2026-09-16）· Q-23-44 第十三个样本：**成员台 · 思想汇报 · 提交**。
    // 选它的理由：思想汇报是**普通成员唯一的高频主动写口**，而它的成功面牵动一条跨台链
    //   （`addThoughtReport` 落库 → 派生系统通知 → 组织委员「初阅收件箱」出现新条目）。
    //   阶段一只覆盖「请填写思想汇报内容」一处。
    // ⚠ 断言用**计数文案**「已提交 N 篇」而不是列表文案：新增记录的 `title` 恒为 '思想汇报'
    //   （`addThoughtReport` 的缺省），列表里**没有可区分的文本**；而计数是从 `mockDB.thoughtReports`
    //   现算的 ⇒ 「当场 2 篇 + 重载后仍 2 篇」同时证了「真写了」与「真落库了」。
    //   **口子在这里**：N 由**种子**决定（演示账号 p5 的种子 = `tr-5` 一条）。**若将来给 p5 增删种子思想汇报，
    //   必须同步改这里的 N**——否则本条会红，而那是「断言过期」不是「产品坏了」。
    id: 'visitor-thought-report-submit',
    page: 'visitor',
    tab: '思想汇报',
    open: [],
    ready: '#tr-content',
    fill: [
      { setValue: { selector: '#tr-content', value: '（成功路径普查）本季度思想汇报正文——本条由真机成功路径写入，用于验证提交落库与列表刷新。' } },
    ],
    act: [{ click: '#tr-submit' }],
    toast: '思想汇报已提交',
    settleMs: 1500,
    reload: true,
    asserts: [
      { text: '已提交 2 篇', carrier: '#visitor-tab-content' },
    ],
  },
  {
    // 批次 47-T（2026-09-16）· Q-23-44 第十四个样本：**组长台 · 考勤上传（提交）**。
    // 选它的理由（支书点名的剩余高频之一）：**考勤是支部最刚性的记录**——它是出勤率 / 补课任务 /
    //   「应到实到」全部下游的源数据，而此前**只有失败面有证据**（阶段一覆盖「请选择活动」「请选择参会人员」）。
    // ⚠ 手法：用**阶段一同一条 open 链**（点上传按钮 → 表单入 DOM → 选活动 →
    //   `openPicker` 选 2 人）。阶段一用 `openPicker` 是为了**复刻「关面板」场景**（断言逐人填写框仍在位）；
    //   成功路径上它的作用是**真选人**——两者共用同一实现，故同一条链两处受益。
    // ⚠ 断言载体取**列表自己的计数**（`.lf-count`，文案 `共 N 人`）：提交后表单整区收起（`_attFormVisible=false`
    //   + `renderContent`），活动下拉里的「 · 已上传」标记**随表单一起消失**，故不能拿它当当场证据；
    //   而明细表 `#att-list-host` 的计数由 `attRows` 现算 ⇒ 「当场 +2 + 重载后仍 +2」两证齐备。
    // ⚠⚠ **判增量，不判绝对值**（全量实测抓到，2026-09-16 批 47-T 内自纠）：本条原写死「共 54 人」，
    //   **定向跑绿、全量跑红**（实测「共 55 人」）——因为该组长**本组既有明细条数会随同批其它流程 / 种子变动**
    //   （定向只跑这一个文件时与全量跑整站时的前序状态不同）。**绝对值看似是「事实」，其实是「此刻的巧合」**；
    //   本流程要证的只有「这次提交真写进了明细表」，故改判增量 `countUp: 2`（基线在动作前读、重载前后共用）。
    // ⚠⚠ 而「+2」这个数**必须由活动类型保证**，不能靠运气——探针实测（`probe-47T`，跑完即删）：
    //   下拉里**第一条「未上传」的活动是 `act-21`（7月主题党日）**，其候选人集合是「**支部在册成员**」
    //   （非党小组会不按应到收紧）⇒ 随机取 2 人里**有 1 人不属于本组** ⇒ 本组可见明细只 **+1**。
    //   故本条**再加 `selectOption.text: '党小组会'`**：党小组会的候选＝**本组应到名单**（实测「第一党小组应到 8 人」），
    //   取 2 人必在本组内 ⇒ 本组可见明细**稳定 +2**。**「涨了几」由产品语义决定，选哪一项要按这个语义去选。**
    id: 'leader-attendance-upload-submit',
    page: 'leader',
    tab: '考勤上传',
    open: [
      { click: '#btn-leader-upload-att' },
      { waitFor: '#att-form-panel' },
    ],
    ready: '#att-activity-select',
    fill: [
      // ⚠ **不能用 `selectFirstOption`**：真机实测首项是**已被本人上传过**的活动 ⇒ `appendAttendanceRecords`
      //   判「已确认记录不可覆盖」⇒ 提示「新增 **0** 条；重复跳过 2 条」——**流程白跑**（没有写、也就没证据）。
      //   `selectOption` 直接读**产品自己渲染**的两个事实：`notText:'已上传'`（未上传）+ `text:'党小组会'`（类型）。
      { selectOption: { selector: '#att-activity-select', notText: '已上传', text: '党小组会' } },
      // 2026-09-18 批次 83（SOP-B-2）：先清空「默认选中的报名者」，再手选 2 人——
      //   否则默认选中会与随后的 openPicker（点前两项＝反选）叠加，`+2` 断言失去意义。
      { click: '#att-clear-selection' },
      { openPicker: { trigger: '#att-person-picker-container .person-picker-trigger', count: 2 } },
    ],
    act: [{ click: '#att-form-submit' }],
    // 成功提示自带写入结果（源码 `考勤上传：新增 N 条；…`）⇒ 断言「新增 2 条」同时证了
    // **真新增了 2 条**（不是「弹了个 toast 就完事」）——本条流程的①与②在此互为佐证。
    toast: '考勤上传：新增 2 条',
    settleMs: 1800,
    reload: true,
    asserts: [
      { countUp: 2, carrier: '#att-list-host .lf-count' },
    ],
  },
  {
    // 批次 47-T（2026-09-16）· Q-23-44 第十五个样本：**宣传委员台 · 周报报送（报送）**。
    // 选它的理由（支书点名的剩余高频之一）：**周报是宣传委员的周期性硬动作**，且它是「一域两动作」的
    //   另一半——阶段一覆盖的是「新增周次」（`prop-weekly-add-week`），本阶段覆盖**真正的报送写口**。
    // ⚠ 断言手法值得记一笔：报出的正文渲染在 `.weekly-detail-content` 的**折叠区**（出厂带 `hidden`，
    //   需点「展开」才可见）⇒ 若拿它当载体，`CARRIER_PROBE` 的可见性判据会判「载体不可见」。
    //   故载体上移到 **tab 根容器** `#prop-tab-content`：`CARRIER_PROBE` 只校验**载体自身**可见，
    //   而读的是它的 `textContent`——**隐藏子节点的文本同样计入**。判据强度不变（那句正文确实只可能
    //   来自本次写入的复盘/正文落库 + 重渲染），只是把「谁可见」和「谁含这段文本」两件事分开。
    id: 'prop-weekly-submit-report',
    page: 'prop',
    tab: '周报报送',
    open: [],
    ready: '#weekly-content',
    fill: [
      { setValue: { selector: '#weekly-content', value: '（成功路径普查）本周完成的工作条目——本条由真机成功路径写入。' } },
    ],
    act: [{ click: '#weekly-submit-btn' }],
    toast: '周报已报送',
    settleMs: 1500,
    reload: true,
    asserts: [
      { text: '（成功路径普查）本周完成的工作条目', carrier: '#prop-tab-content' },
    ],
  },
  {
    // 批次 47-U（2026-09-16）· Q-23-44 第十六个样本：**支书台 · 通知编辑（改写并保存）**。
    // 选它的理由（支书点名的剩余高频之一）：**「通知」域的另一半**——阶段一覆盖的是「编辑浮窗的
    //   两处必填」（预填原值先清空才可达），本阶段覆盖**真正的保存写口**（`NoticeStore.update` → 列表重渲染）。
    // ⚠ 手法（与 `prop-weekly-submit-report` 同族，也是本仓最稳的一种）：**写入一段独一无二的标记文本，
    //   再断言这段文本出现在列表里** —— 不用计数、不用绝对值，故**不随种子 / 同批其它流程变动**（R-76 ④）。
    // ⚠ 标记选了与既有流程**互不包含**的字面（既有流程用「（成功路径普查）通知标题/通知正文/本周完成的工作条目」）：
    //   若本条也用「（成功路径普查）通知标题…」，而它又被拼进 `secretary-notification-publish` 的断言语料，
    //   那条断言就会被本条**顶替成立**——**两条流程的判据会互相冒充**（同 R-76 ②「有提示 ≠ 生效」的邻居）。
    // ⚠ 改的是列表**第一行**（按 `publishDate` 倒序）⇒ 编辑不改变排序，标记必落在第 1 页；
    //   载体取**列表持久容器** `#notification-list-area`（引擎翻页/筛选会重绘其内部，容器本身跨重渲染复用）。
    id: 'secretary-notice-edit-save',
    page: 'secretary',
    tab: '通知发布',
    open: [
      { click: '[data-notif-action="edit"]' },
      { waitFor: '#ne-save' },
    ],
    ready: '#ne-save',
    fill: [
      { setValue: { selector: '#ne-title', value: '【47-U 真机写入】通知标题已被本流程改写' } },
      { setValue: { selector: '#ne-content', value: '【47-U 真机写入】通知正文已被本流程改写——本条由真机成功路径写入。' } },
    ],
    act: [{ click: '#ne-save' }],
    toast: '通知已更新',
    settleMs: 1500,
    independent: false,
    reload: true,
    asserts: [
      { text: '【47-U 真机写入】通知标题已被本流程改写', carrier: '#notification-list-area' },
    ],
  },
  {
    // 批次 47-V（2026-09-16）· Q-23-44 第十七个样本：**组织台 · 专班管理 · 添加进度**。
    // 选它的理由：① 「专班」是组织委员的核心域，而**中间进度**是该域里最常发生的写动作
    //   （阶段一覆盖的是它的必填「请填写进度说明」，成功面此前无证据）；② 它与「代录贡献 / 提交复盘」
    //   **共用同一条 `open` 链**（同为「运行中」专班的详情面板）⇒ 边际成本极低（47-D 的「一个面板多块」收益点）。
    // ⚠ 手法：仍用**写一段独一无二的标记、再断言它出现在列表里**（与 47-U 同族，不用计数、不随种子变动）。
    // ⚠ **本批新增能力 `reopen[]` 的由来（真机踩出来的）**：详情面板是**展开态**（不落库）——
    //   整页重载后面板收起，直接断言只会报「载体不在位」；**那是假红**（看着像产品病，其实是守卫
    //   没把被测对象重新摆好，与 47-S「深链页跳过等 tab 渲染」同一类错）。故 `reload` 后显式声明
    //   `reopen[]` 把面板重新点开。**它不削弱 ③**：重载已把 DOM 整体替换，重开后仍能看到那段文本，
    //   恰证明它**来自落库数据**而非重载前的残留节点。
    id: 'org-taskforce-progress-add',
    page: 'org',
    tab: '专班管理',
    open: [
      { click: '#tf-bucket-active .tf-store-card' },
      { waitFor: '#btn-add-tf-progress' },
    ],
    ready: '#tf-progress-note',
    fill: [
      { setValue: { selector: '#tf-progress-note', value: '【47-V 真机写入】中间进度：本条由真机成功路径写入。' } },
    ],
    act: [{ click: '#btn-add-tf-progress' }],
    toast: '中间进度已记录',
    settleMs: 1200,
    independent: false,
    reload: true,
    reopen: [
      { click: '#tf-bucket-active .tf-store-card' },
      { waitFor: '#tf-sec-progress' },
    ],
    asserts: [
      { text: '【47-V 真机写入】中间进度：本条由真机成功路径写入。', carrier: '#tf-sec-progress' },
    ],
  },
];
