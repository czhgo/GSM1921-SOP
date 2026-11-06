// server/test/terminology-baseline.mjs — 术语 Harness 的存量基线（只降不升）
//
// 本文件只放「首轮存量」，不放判据。判据在 `docs-governance-guard.test.mjs` 的 H-T1…H-T4。
// 只降不升的实现方式：守卫要求「实测命中集 ≡ 本文件清单」（双向相等）——
//   新增一处未登记 ⇒ 红（新写进去的）；条目已修好却还留在清单里 ⇒ 也红（僵尸条目须撤下）。
//
// 三类清单：
//   1. STRUCTURAL_LABEL_BASELINE —— H-T3：尚未命中术语表的**结构性标签**（首轮存量）。
//      reason 首段是分类，冒号后写理由。分类集合见 `terminology-baseline.mjs` 顶部 `REASON_CATEGORIES`。
//      维护：新增页签 / 表头 / 筛选项 / 选项时，**先查术语表**；确属普通字段名才允许登记（并写理由）。
//   2. TAB_LABEL_EXEMPTIONS —— H-T2：页签名是「上位概念」，不按内部分段的单一对象改名（逐条写理由）。
//   3. LEGACY_INSIGHT_CALLERS —— H-T1：仍调用 `renderInsightView` 但**已无任何模块 import** 的遗留文件。
//      它们不参与按钮组判红（运行时不生成按钮），但**必须登记**：一旦被重新 import，可达性变 true，
//      就会回到 H-T1 的判红范围。
//   4. DEPRECATED_COPY_BASELINE —— H-T4：`docs/src/**` 内部**注释**里的废弃写法（非用户可见文案）。
//      本批硬约束只许改 UI 文案，故内部注释登记为存量；`deadline` 到期前须随文件触及清零。

/** H-T3 允许的理由分类（reason 以「分类：理由」书写，分类须在此集合内） */
export const REASON_CATEGORIES = ['表头字段', '页面名', '筛选项', '选项文案', '业务动作短语'];

/** H-T3 首轮存量：结构性标签 → 理由（按 label 去重；同一 label 出现在多处只登记一次） */
export const STRUCTURAL_LABEL_BASELINE = [
  // ── 表头字段（表格列名，属性名而非业务对象） ──
  { label: '姓名', reason: '表头字段：人员属性列' },
  { label: '学号', reason: '表头字段：人员属性列' },
  { label: '发展阶段', reason: '表头字段：党员发展阶段（成员属性）' },
  { label: '所属党小组', reason: '表头字段：组织归属列' },
  { label: '类别', reason: '表头字段：活动 / 考察记录的类别列' },
  { label: '状态', reason: '表头字段：记录状态列' },
  { label: '备注（标因/补录）', reason: '表头字段：考勤备注列（括号内为列内说明）' },
  { label: '确认人', reason: '表头字段：确认操作人列' },
  { label: '操作', reason: '表头字段：行内动作列' },
  { label: '未闭环', reason: '表头字段：考察闭环统计列' },
  { label: '超期', reason: '表头字段：超期统计列' },
  { label: '最近记录人', reason: '表头字段：考察记录人列' },
  { label: '来源', reason: '表头字段：考察来源列' },
  { label: '内容', reason: '表头字段：考察内容列' },
  { label: '记录人', reason: '表头字段：记录操作人列' },
  { label: '缺席活动', reason: '表头字段：补课关联活动列' },
  { label: '补课方式', reason: '表头字段：补课方式列' },
  { label: '截止日期', reason: '表头字段：补课截止列' },
  { label: '确认状态', reason: '表头字段：确认状态列' },
  { label: '考察内容', reason: '表头字段：考察内容列' },
  { label: '在办 / 超期', reason: '表头字段：组员进展统计列' },
  { label: '考勤', reason: '表头字段：组员进展考勤列' },
  { label: '汇报', reason: '表头字段：思想汇报列' },
  { label: '阶段', reason: '表头字段：发展党员阶段列' },
  { label: '标签', reason: '表头字段：归档标签列' },
  { label: '类型', reason: '表头字段：记录类型列' },
  { label: '届别', reason: '表头字段：档案届别列' },
  { label: '日期', reason: '表头字段：记录日期列' },
  { label: '经手人', reason: '表头字段：档案经手人列' },
  { label: '备注', reason: '表头字段：行内备注列' },
  { label: '合计', reason: '表头字段：统计合计列' },
  { label: '档案', reason: '表头字段：档案统计列' },
  { label: '支部', reason: '表头字段：支部统计列（组织单元泛称，非并列标签）' },
  { label: '成员', reason: '表头字段：成员统计列' },
  { label: '在册党员', reason: '表头字段：在册党员统计列' },
  { label: '通知', reason: '表头字段：通知统计列' },
  { label: '待批复', reason: '表头字段：反馈待批复统计列' },
  { label: '组织提醒', reason: '表头字段：组织提醒统计列' },
  { label: '复盘状态', reason: '表头字段：党小组活动台账的复盘状态列（2026-11-01 批次 525 补登）' },
  { label: '应到 · 实到', reason: '表头字段：党小组活动台账的应到 / 实到列（2026-11-01 批次 525 补登）' },

  // ── 页面名（页签名是产品页面称谓，不是术语表要定义的业务对象） ──
  { label: '今天', reason: '页面名：各台首屏页签（共享 tab 名）' },
  { label: '工作概况', reason: '页面名：各台总览页签' },
  { label: '全局概况', reason: '页面名：支书台总览页签' },
  { label: '待办', reason: '页面名：待办页签（与「我经办的反馈」分区共用词）' },
  { label: '考勤管理', reason: '页面名：纪检 / 组长台页签（对象轴命名）' },
  { label: '考勤概况', reason: '页面名：成员台页签' },
  { label: '复盘', reason: '页面名：纪检台页签（对象轴命名）' },
  { label: '考察管理', reason: '页面名：纪检 / 组长台页签（对象轴命名）' },
  { label: '本组活动', reason: '页面名：组长台写入页签（按范围命名）' },
  { label: '组员进展', reason: '页面名：组长台页签' },
  { label: '成员名册', reason: '页面名：组织台页签' },
  { label: '成员流动', reason: '页面名：组织台页签' },
  { label: '人才库', reason: '页面名：组织台页签' },
  { label: '思想汇报', reason: '页面名：组织台页签' },
  { label: '专班管理', reason: '页面名：组织台页签（对象轴命名，与「专班」词条同源）' },
  { label: '下发通知', reason: '页面名：党委台页签（业务动作命名）' },
  { label: '支部上报', reason: '页面名：党委台页签' },
  { label: '支部管理', reason: '页面名：党委台页签' },
  { label: '项目看板', reason: '页面名：宣传台页签（承载宣传任务泳道）' },
  { label: '档案归档', reason: '页面名：宣传台页签' },
  { label: '活动管理', reason: '页面名：支书台页签（全支部活动写入）' },
  { label: '支委会', reason: '页面名：支书台页签（会议形态名）' },
  { label: '通知发布', reason: '页面名：支书台页签' },
  { label: '上报党委', reason: '页面名：支书台页签（业务动作命名）' },
  { label: '支部分工', reason: '页面名：支书台页签' },
  { label: '意见反馈', reason: '页面名：支书台页签' },
  { label: '活动动态', reason: '页面名：成员台页签（活动只读浏览）' },
  { label: '项目分工', reason: '页面名：成员台页签（承载「专班」区，上位概念）' },

  // ── 筛选项（facet 维度名 / 枚举值） ──
  { label: '沉淀主题', reason: '筛选项：复盘经验沉淀主题维度' },
  { label: '经验内容', reason: '筛选项：复盘经验内容维度' },
  { label: '适用场景', reason: '筛选项：复盘适用场景维度' },
  { label: '常见误区/反例', reason: '筛选项：复盘反例维度' },
  { label: '卡点类型', reason: '筛选项：组员进展卡点维度' },
  { label: '方向', reason: '筛选项：成员流动方向维度' },
  { label: '流入', reason: '筛选项：成员流动方向枚举值' },
  { label: '流出', reason: '筛选项：成员流动方向枚举值' },
  { label: '进行中', reason: '筛选项：项目状态枚举值' },
  { label: '已完成', reason: '筛选项：项目状态枚举值' },

  // ── 选项文案（`<option>` 文本：占位、状态词、身份名、动作短语） ──
  { label: '活动：全部', reason: '选项文案：考勤筛选占位' },
  { label: '状态：全部', reason: '选项文案：状态筛选占位' },
  { label: '活动类型：全部', reason: '选项文案：活动类型筛选占位' },
  { label: '党小组会（只读）', reason: '选项文案：活动类型枚举值（党小组会为活动形态名）' },
  { label: '请选择活动', reason: '选项文案：下拉占位' },
  { label: '请选择来源类型', reason: '选项文案：下拉占位' },
  { label: '请先选择来源类型', reason: '选项文案：级联下拉占位' },
  { label: '请选择专班', reason: '选项文案：下拉占位' },
  { label: '请选择发展阶段', reason: '选项文案：下拉占位' },
  { label: '请选择关联活动', reason: '选项文案：下拉占位' },
  { label: '请选择类型', reason: '选项文案：下拉占位' },
  { label: '请选择承办党小组', reason: '选项文案：下拉占位' },
  { label: '请选择关联对象', reason: '选项文案：下拉占位' },
  { label: '补选责任党小组…', reason: '选项文案：下拉占位' },
  { label: '新负责人…', reason: '选项文案：支部分工负责人候选占位（非工作组成员角色）' },
  { label: '（暂无活动，请先创建）', reason: '选项文案：空态占位' },
  { label: '（不关联活动）', reason: '选项文案：空值占位' },
  // 2026-11-01 批次 524：选项改由 `selectInput({ options: [{ label }] })` 生成，抽取面跟进 `options`
  //   数组后，原先由变量注入、从未进过扫描面的枚举文案首次显形——按「选项文案」登记，不新增业务词。
  { label: '在校', reason: '选项文案：在册状态枚举值' },
  { label: '滞留', reason: '选项文案：在册状态枚举值' },
  { label: '建议', reason: '选项文案：意见反馈类型枚举值' },
  { label: '疑问', reason: '选项文案：意见反馈类型枚举值' },
  { label: '纠正', reason: '选项文案：意见反馈类型枚举值' },
  { label: '肯定', reason: '选项文案：意见反馈类型枚举值' },
  { label: '活动类型', reason: '筛选项：活动类型维度名' },
  { label: '支书（审核）', reason: '选项文案：归档审核角色' },
  { label: '纪检委员（留档）', reason: '选项文案：归档留档角色' },
  { label: '— 选择状态 —', reason: '选项文案：下拉占位' },
  { label: '加载会前草案…', reason: '选项文案：加载态占位' },
  { label: '草案加载失败', reason: '选项文案：失败态提示' },
  { label: '出勤', reason: '选项文案：考勤状态枚举值' },
  { label: '缺勤', reason: '选项文案：考勤状态枚举值' },
  { label: '请假', reason: '选项文案：考勤状态枚举值' },
  { label: '全部出勤', reason: '选项文案：批量筛选值' },
  { label: '全部缺勤', reason: '选项文案：批量筛选值' },
  { label: '全部请假', reason: '选项文案：批量筛选值' },
  { label: '开放中', reason: '选项文案：复盘状态枚举值' },
  { label: '已指派', reason: '选项文案：反馈状态枚举值' },
  { label: '待终审', reason: '选项文案：反馈状态枚举值' },
  { label: '已关闭', reason: '选项文案：反馈状态枚举值' },
  { label: '指派：全部', reason: '选项文案：指派筛选占位' },
  { label: '未指派', reason: '选项文案：指派筛选值' },
  { label: '支书处置中', reason: '选项文案：反馈状态枚举值' },
  { label: '未分组', reason: '选项文案：党小组归组筛选值' },
  { label: '不指定', reason: '选项文案：空值占位' },
  { label: '自上而下', reason: '选项文案：活动方向枚举值' },
  { label: '自下而上', reason: '选项文案：活动方向枚举值' },
  { label: '短期', reason: '选项文案：专班周期枚举值' },
  { label: '长期', reason: '选项文案：专班周期枚举值' },
  { label: '普通', reason: '选项文案：紧急度枚举值' },
  { label: '紧急', reason: '选项文案：紧急度枚举值' },
  { label: '品牌：全部', reason: '选项文案：品牌筛选占位' },
  { label: '范围：全部', reason: '选项文案：意见反馈范围筛选占位（2026-11-01 批次 525 补登）' },
  { label: '范围：全部活动', reason: '选项文案：范围筛选占位' },
  { label: '活动类别：全部', reason: '选项文案：活动类别筛选占位' },
  { label: '党小组活动', reason: '选项文案：活动类别筛选值（不是并列按钮）' },
  { label: '组织委员', reason: '选项文案：支委身份名' },
  { label: '宣传委员', reason: '选项文案：支委身份名' },
  { label: '纪检委员', reason: '选项文案：支委身份名' },
  { label: '党小组组长', reason: '选项文案：组织单元身份名' },

  // ── 业务动作短语（按钮 / 行内动作类文案，不是业务对象） ──
  { label: '移出党小组', reason: '业务动作短语：成员名册行内动作' },
  { label: '只看品牌', reason: '业务动作短语：归档筛选开关' },
  { label: '不关联具体任务', reason: '业务动作短语：任务关联开关' },
  { label: '不关联', reason: '业务动作短语：关联对象空值' },
];

/** H-T2：页签名是上位概念（不按内部分段的单一对象改名）——逐条写理由 */
export const TAB_LABEL_EXEMPTIONS = [
  {
    label: '全局概况',
    why: '支书台总览页：一页承载多张卡（含「知情查看」卡的活动工作组 / 专班工作组两段），页签名是上位页面名，不按单一分段改名。',
  },
  {
    label: '项目分工',
    why: '成员台页：同时覆盖「活动」与「专班」两类项目（列表 / 我的任务 / 专班区），页签名是上位概念，不按「专班」单对象命名。',
  },
];

/** H-T1：仍调用 renderInsightView 但已无任何模块 import 的遗留文件（运行时不生成按钮） */
export const LEGACY_INSIGHT_CALLERS = [
  {
    rel: 'docs/src/entries/tabs/leader/tf-view-tab.js',
    why: '组长台「知情查看」页签已于 2026-10-25 IA 62→45 删除（旧深链落 members&section=groups），本文件仅留历史实现；' +
      '其 views 里仍写着已废弃的 `group` 段——**可达性为 false 才允许存在**；若被重新 import，H-T1 会按「工作组 + 其他组」判红。',
  },
];

/** H-T4：`docs/src/**` 内部注释里的废弃写法（非用户可见；本批只许改 UI 文案，故登记并限期） */
export const DEPRECATED_COPY_BASELINE = [
  {
    file: 'docs/src/capabilities/secretary-workspace.js',
    term: '活动项目赋权',
    reason: '内部注释：记录 2026-09-25 赋权归位的沿革（非用户可见）',
    deadline: '2026-12-31',
  },
  {
    file: 'docs/src/components/ui/modal.js',
    term: '活动项目赋权',
    reason: '内部注释：D-434 / D-614 三情景沿革（非用户可见）',
    deadline: '2026-12-31',
  },
  {
    file: 'docs/src/entries/pages/notice-entry.js',
    term: '会议活动',
    reason: '内部注释：meetingActivityId 口径说明（字段名不改；用户可见文案已拆为「会议 / 活动」）',
    deadline: '2026-12-31',
  },
  {
    file: 'docs/src/entries/tabs/org/inspection-tab.js',
    term: '专班负责人',
    reason: '内部注释：2026-09 上传位沿革（用户可见文案已改「专班组织者」）',
    deadline: '2026-12-31',
  },
  {
    file: 'docs/src/entries/tabs/secretary/assign-tab.js',
    term: '活动项目赋权',
    reason: '内部注释：赋权三情景的本位说明（非用户可见）',
    deadline: '2026-12-31',
  },
  {
    file: 'docs/src/services/member/roster.js',
    term: '会议活动',
    reason: '内部注释：JSDoc 参数说明（非用户可见）',
    deadline: '2026-12-31',
  },
];

/**
 * H-T4 豁免表（本轮为空）：如需放行，必须逐条写 `{ file, term, why }`。
 * 空表也参与「僵尸豁免」检查：一旦填了却不再命中 ⇒ 判红，要求撤下。
 */
export const DEPRECATED_COPY_EXEMPTIONS = [];

/**
 * 关系钉死：同一词条在其它 content 文件里出现「定义句」的豁免（本轮为空）。
 * 形如 `{ file, term, why }`；空表同样参与僵尸检查。
 */
export const DEFINITION_DUP_EXEMPTIONS = [];
