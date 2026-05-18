// role: [人机]
// ════════════════════════════════════════════════════════════════
//  definitions.js — 活动流程定义模板 v2.0
//  核心：短期活动双轨 / 长期活动双轨
//  三维度：时长 / 品牌（本轮搁置）/ 发起方向
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
//  A. 共享状态节点工厂
// ════════════════════════════════════════════════════════════════

const DRAFT = (timeoutHours = 168) => ({
  name: 'DRAFT',
  label: '草稿',
  allowedTransitions: ['PENDING_LEADER'],
  timeoutHours,
  metadata: { phase: '策划', editable: true },
});

const PENDING_LEADER = (timeoutHours = 48) => ({
  name: 'PENDING_LEADER',
  label: '待组长审批',
  allowedTransitions: ['APPROVED', 'DRAFT'],
  timeoutHours,
  metadata: { phase: '审批', editable: false },
});

const APPROVED = (timeoutHours = 96) => ({
  name: 'APPROVED',
  label: '已审批',
  allowedTransitions: ['PREPARING', 'GROUP_FORMING', 'DRAFT'],
  timeoutHours,
  metadata: { phase: '审批', editable: true },
});

const IN_PROGRESS = () => ({
  name: 'IN_PROGRESS',
  label: '进行中',
  allowedTransitions: ['COMPLETED', 'DRAFT'],
  timeoutHours: 36,
  metadata: { phase: '实施', editable: true },
});

const COMPLETED = (timeoutHours = 96) => ({
  name: 'COMPLETED',
  label: '已完成',
  allowedTransitions: ['IN_REVIEW', 'ARCHIVED', 'IN_PROGRESS'],
  timeoutHours,
  metadata: { phase: '收尾', editable: true },
});

const IN_REVIEW = (timeoutHours = 120) => ({
  name: 'IN_REVIEW',
  label: '复核中',
  allowedTransitions: ['ARCHIVED', 'COMPLETED'],
  timeoutHours,
  metadata: { phase: '复核', editable: false },
});

const ARCHIVED = () => ({
  name: 'ARCHIVED',
  label: '已归档',
  allowedTransitions: [],
  timeoutHours: null,
  metadata: { phase: '归档', editable: false },
});

// ── 短期活动专用状态 ─────────────────────────────────────────────

/**
 * 筹备中：组织者对接纪检委员（签到要求）+ 宣传委员（素材统筹）。
 * 招人目的：前期学习材料筹备 + 宣传素材准备。
 * 建活动群 + 核心群（组织者+宣传对接人+纪检对接人，一套班子）。
 *
 * v2.0: 含子状态追踪 — 考勤对接 + 宣传统筹 必须完成后才能进入 IN_PROGRESS
 */
const PREPARING = (timeoutHours = 72) => ({
  name: 'PREPARING',
  label: '筹备中',
  allowedTransitions: ['IN_PROGRESS', 'DRAFT'],
  timeoutHours,
  metadata: { phase: '筹备', editable: true },
  requiredRoles: ['organizer', 'leader', 'secretary', 'disc-commissioner', 'prop-commissioner'],
  subStates: {
    attendance: {
      name: 'attendance',
      label: '考勤对接',
      ownerRole: 'disc-commissioner',
      sequence: ['confirmed', 'executed', 'submitted'],
      stepsLabel: {
        confirmed:  '签到要求确认（组织者→纪检委员确认考勤方式）',
        executed:   '签到执行（活动当天纪检/组织者执行签到）',
        submitted:  '考勤汇总提交（纪检委员汇总→提交组织委员参与记录+提交宣传委员考勤记录）',
      },
    },
    publicity: {
      name: 'publicity',
      label: '宣传统筹',
      ownerRole: 'prop-commissioner',
      sequence: ['reviewed', 'coordinated', 'archived'],
      stepsLabel: {
        reviewed:    '宣传标准审核（宣传委员审核宣传标准）',
        coordinated: '素材统筹（宣传委员对接具体负责宣传的深度参与者统筹产出）',
        archived:    '宣传归档（宣传统筹材料归档）',
      },
    },
  },
});

// ── 长期活动专用状态 ─────────────────────────────────────────────

/**
 * 组建活动小组：审批通过后，建大活动群，拆分活动小组。
 * 每个活动小组：建小群 + 招募组织者 + 招募深度参与者。
 * 建核心群 = 各活动小组组织者 + 承办党小组组长 + 纪检委员 + 宣传委员。
 * 注意：活动小组 ≠ 党小组。
 */
const GROUP_FORMING = (timeoutHours = 168) => ({
  name: 'GROUP_FORMING',
  label: '组建活动小组',
  allowedTransitions: ['IN_PROGRESS', 'APPROVED'],
  timeoutHours,
  metadata: { phase: '组建', editable: true },
});

/**
 * 组织层同步：各活动小组组织者之间的协调阶段。
 *
 * v2.0: 含三个子状态 — 内容同步 + 考勤考察 + 协调层运作
 */
const SYNCING = (timeoutHours = 336) => ({
  name: 'SYNCING',
  label: '组织层同步',
  allowedTransitions: ['COMPLETED', 'IN_PROGRESS'],
  timeoutHours,
  metadata: { phase: '协调', editable: true },
  requiredRoles: ['organizer', 'leader', 'secretary', 'disc-commissioner', 'prop-commissioner'],
  subStates: {
    content_sync: {
      name: 'content_sync',
      label: '内容同步',
      ownerRole: 'prop-commissioner',
      sequence: ['direction_aligned', 'content_shared', 'progress_synced'],
      stepsLabel: {
        direction_aligned: '方向对齐（组织者→各活动小组确认活动方向一致）',
        content_shared:   '内容共享（各小组核心内容同步到宣传委员和核心群）',
        progress_synced:  '进度同步（各小组进展汇总→宣传委员统一更新全貌）',
      },
    },
    attendance_inspection: {
      name: 'attendance_inspection',
      label: '考勤考察',
      ownerRole: 'disc-commissioner',
      sequence: ['collected', 'summarized', 'reported'],
      stepsLabel: {
        collected:  '收集各小组参与记录（纪检委员→各小组组织者汇总深度参与者名单+考勤）',
        summarized: '汇总整理（纪检委员汇总全部参与记录→提交组织委员）',
        reported:   '上报结果（考勤汇总→支委会报告，异常情况标注并督办）',
      },
    },
    coordination_layer: {
      name: 'coordination_layer',
      label: '协调层运作',
      ownerRole: 'organizer',
      sequence: ['relations_balanced', 'experience_shared', 'layer_stable'],
      stepsLabel: {
        relations_balanced: '活动小组间关系协调（组织者们协商资源分配，避免冲突）',
        experience_shared:  '经验共享（各组织者分享本组做法→建立共同知识库）',
        layer_stable:        '组织层稳定（确认组织者长期深耕意愿，深度参与者可流动）',
      },
    },
  },
});

// ── 品牌活动专用状态（本轮搁置，保留作为知识沉淀）────────────────

const POSITIONING = (timeoutHours = 336) => ({
  name: 'POSITIONING',
  label: '定位设计',
  allowedTransitions: ['PENDING_LEADER'],
  timeoutHours,
  metadata: { phase: '策划', editable: true },
});

const PROTOTYPE = (timeoutHours = 504) => ({
  name: 'PROTOTYPE',
  label: '试点实施',
  allowedTransitions: ['ITERATING', 'POSITIONING'],
  timeoutHours,
  metadata: { phase: '试点', editable: true },
});

const ITERATING = (timeoutHours = 720) => ({
  name: 'ITERATING',
  label: '迭代优化',
  allowedTransitions: ['ESTABLISHED', 'PROTOTYPE'],
  timeoutHours,
  metadata: { phase: '迭代', editable: true },
});

const ESTABLISHED = () => ({
  name: 'ESTABLISHED',
  label: '成熟运营',
  allowedTransitions: ['CERTIFICATION_PENDING', 'ITERATING'],
  timeoutHours: null,
  metadata: { phase: '运营', editable: false },
});

const CERTIFICATION_PENDING = (timeoutHours = 168) => ({
  name: 'CERTIFICATION_PENDING',
  label: '待认证',
  allowedTransitions: ['CERTIFIED', 'ESTABLISHED'],
  timeoutHours,
  metadata: { phase: '认证', editable: false },
});

const CERTIFIED = () => ({
  name: 'CERTIFIED',
  label: '已认证',
  allowedTransitions: ['ARCHIVED', 'ITERATING'],
  timeoutHours: null,
  metadata: { phase: '认证', editable: false },
});

// ════════════════════════════════════════════════════════════════
//  B. 主题党日活动模板（短期）
//     对应 sopData.js §theme-party
// ════════════════════════════════════════════════════════════════

export const THEME_PARTY_DAY_DEFINITION = {
  id: 'theme-party-day',
  title: '主题党日活动',
  duration: 'short-term',
  brand: false,
  direction: 'bottom-up',
  initialState: 'DRAFT',
  sopScenarioId: 'theme-party',
  states: [
    {
      ...DRAFT(168),
      metadata: {
        phase: '策划',
        sopTaskId: '1b-1',
        sopTaskTitle: '活动发起',
        sopExecutor: 'organizer',
        sopSupervisor: 'leader',
        sopTimeOffset: -7,
        sopDesc: '组织者可由党小组组长担任或在群内/支部群招募。策划活动方案（参访、线下学习等一次性活动）。',
      },
    },
    {
      ...PENDING_LEADER(48),
      metadata: {
        phase: '审批',
        sopTaskId: '1b-2',
        sopTaskTitle: '组长审批',
        sopExecutor: 'leader',
        sopDesc: '必须报块块组长审批同意后方可推进。',
      },
    },
    {
      ...APPROVED(72),
      metadata: {
        phase: '审批',
        sopTaskId: '1b-3',
        sopTaskTitle: '联系条条委员',
        sopExecutor: 'organizer',
        sopSupervisor: 'leader',
        sopTimeOffset: -7,
        sopDesc: '建活动群 + 核心群（组织者+宣传对接人+纪检对接人）。招募深度参与者：前期学习材料筹备 + 宣传素材准备。',
      },
    },
    {
      ...PREPARING(72),
      metadata: {
        phase: '筹备',
        sopTaskId: '1b-3-prep',
        sopTaskTitle: '筹备材料与对接',
        sopExecutor: 'organizer',
        sopSupervisor: 'leader',
        sopTimeOffset: -5,
        sopDesc: '组织者对接纪检委员（确认签到要求） + 对接宣传委员（确认宣传标准）。宣传委员对接具体负责宣传的深度参与者统筹素材。',
      },
    },
    {
      ...IN_PROGRESS(),
      metadata: {
        phase: '实施',
        sopTaskId: '1b-6',
        sopTaskTitle: '活动实施',
        sopExecutor: 'organizer',
        sopSupervisor: 'leader',
        sopTimeOffset: 0,
        sopDesc: '组织者全程负责。核查清单：签到 · 现场拍照（全景/互动/细节各至少1张）· 关键发言记录。',
      },
    },
    {
      ...COMPLETED(96),
      metadata: {
        phase: '收尾',
        sopTaskId: '1b-7',
        sopTaskTitle: '活动复盘与汇总',
        sopExecutor: 'organizer',
        sopSupervisor: 'leader',
        sopTimeOffset: 7,
        sopDesc: '纪检汇总：参与记录（→组织委员）+ 考勤（→宣传委员）。宣传统筹：对接深度参与者整理宣传产出。组织者完成复盘。',
      },
    },
    {
      ...ARCHIVED(),
      metadata: {
        phase: '归档',
        sopTaskId: '1b-9',
        sopTaskTitle: '材料归档',
        sopExecutor: 'organizer',
        sopSupervisor: 'leader',
        sopTimeOffset: 7,
        sopDesc: '将全部活动材料主动交给宣传委员归档。',
      },
    },
  ],
};

// ════════════════════════════════════════════════════════════════
//  C. 短期活动通用模板
//     覆盖：参访、线下学习等一次性活动
// ════════════════════════════════════════════════════════════════

export const SHORT_TERM_DEFINITION = {
  id: 'short-term',
  title: '短期活动',
  duration: 'short-term',
  brand: false,
  direction: 'either',
  initialState: 'DRAFT',
  states: [
    DRAFT(168),
    PENDING_LEADER(48),
    APPROVED(72),
    PREPARING(72),
    IN_PROGRESS(),
    COMPLETED(96),
    ARCHIVED(),
  ],
};

// ════════════════════════════════════════════════════════════════
//  D. 长期活动通用模板
//     覆盖：宣讲团、人生回望录等持续打磨/多小组同步推进的活动
// ════════════════════════════════════════════════════════════════

export const LONG_TERM_DEFINITION = {
  id: 'long-term',
  title: '长期活动',
  duration: 'long-term',
  brand: false,
  direction: 'either',
  initialState: 'DRAFT',
  states: [
    {
      ...DRAFT(336),
      metadata: { note: '长期活动策划周期更长，需考虑活动小组拆分方案和组织者人选' },
    },
    {
      ...PENDING_LEADER(96),
      metadata: { note: '长期活动审批需评估资源投入和持续性' },
    },
    {
      ...APPROVED(168),
      metadata: { note: '建大活动群（全体参与者信息汇总群），筹备核心群人选' },
    },
    {
      ...GROUP_FORMING(168),
      metadata: {
        note: '拆分活动小组：每个小组建小群+招募组织者+招募深度参与者。建核心群=各组织者+承办党小组组长+纪检委员+宣传委员。区分于党小组。',
      },
    },
    {
      ...IN_PROGRESS(),
      metadata: { note: '各活动小组并行推进。组织者把握组内方向，协调深度参与者工作。' },
    },
    {
      ...SYNCING(336),
      metadata: {
        note: '组织层运作：组织者协调承办党小组组长（方向对齐）+纪检（考勤汇总）+宣传（内容同步）。深度参与者可离开，组织者长期深耕。',
        allowedTransitions: ['COMPLETED', 'IN_PROGRESS'],
      },
    },
    {
      ...COMPLETED(168),
      metadata: { note: '各活动小组完成。纪检汇总全部参与记录+考勤记录。宣传统筹全部宣传产出。组织者完成复盘。' },
    },
    {
      ...IN_REVIEW(168),
      metadata: { note: '支委复核复盘质量+材料完整性' },
    },
    ARCHIVED(),
  ],
};

// ════════════════════════════════════════════════════════════════
//  E. 品牌活动模板（本轮搁置，保留作为知识沉淀）
// ════════════════════════════════════════════════════════════════

export const SHORT_TERM_BRAND_DEFINITION = {
  id: 'short-term-brand',
  title: '短期品牌活动（搁置）',
  duration: 'short-term',
  brand: true,
  direction: 'either',
  initialState: 'DRAFT',
  states: [
    DRAFT(168),
    PENDING_LEADER(48),
    APPROVED(72),
    PREPARING(72),
    IN_PROGRESS(),
    COMPLETED(96),
    CERTIFICATION_PENDING(168),
    CERTIFIED(),
    ARCHIVED(),
  ],
};

export const LONG_TERM_BRAND_DEFINITION = {
  id: 'long-term-brand',
  title: '长期品牌活动（搁置）',
  duration: 'long-term',
  brand: true,
  direction: 'either',
  initialState: 'POSITIONING',
  sopScenarioId: 'brand-activity',
  states: [
    POSITIONING(336),
    PENDING_LEADER(72),
    {
      ...APPROVED(240),
      allowedTransitions: ['PROTOTYPE', 'POSITIONING'],
    },
    PROTOTYPE(504),
    ITERATING(720),
    ESTABLISHED(),
    CERTIFICATION_PENDING(168),
    CERTIFIED(),
    ARCHIVED(),
  ],
};

// ════════════════════════════════════════════════════════════════
//  F. 活动分类三维度（作为定义元数据，写入每套定义）
// ════════════════════════════════════════════════════════════════

/**
 * 三维度说明：
 *
 * 1. 时长维度 (duration)
 *    - short-term（短期）：一次性完成，如参访、线下学习
 *    - long-term （长期）：长期打磨/接续工作/多活动小组同步推进，如宣讲团、人生回望录
 *
 * 2. 品牌维度 (brand)
 *    - true  ：持续迭代打造品牌的项目（本轮搁置）
 *    - false ：普通日常活动
 *
 * 3. 发起维度 (direction)
 *    - bottom-up（自下而上）：党小组/成员自发创造性活动，组织方式更灵活
 *    - top-down  （自上而下）：支委/书记布置的任务，强调规范落实
 *    - either    （未限定）：两种发起方式均可
 */

export const DIMENSION_DEFINITIONS = {
  duration: {
    'short-term': { label: '短期活动', rule: '一次性完成（参访、线下学习等）', timeoutMultiplier: 1.0 },
    'long-term': { label: '长期活动', rule: '长期打磨/接续工作/多活动小组同步推进', timeoutMultiplier: 2.0 },
  },
  brand: {
    true: { label: '品牌活动（搁置）', rule: '持续迭代打造品牌（本轮搁置）' },
    false: { label: '非品牌活动', rule: '普通日常活动' },
  },
  direction: {
    'bottom-up': { label: '自下而上', rule: '党小组/成员自发创造性活动' },
    'top-down': { label: '自上而下', rule: '支委/书记布置的任务' },
    'either': { label: '未限定', rule: '两种发起方式均可' },
  },
};

// ════════════════════════════════════════════════════════════════
//  G. 定义索引
// ════════════════════════════════════════════════════════════════

export const DEFINITION_INDEX = {
  'theme-party-day': THEME_PARTY_DAY_DEFINITION,
  'short-term': SHORT_TERM_DEFINITION,
  'long-term': LONG_TERM_DEFINITION,
  'short-term-brand': SHORT_TERM_BRAND_DEFINITION,
  'long-term-brand': LONG_TERM_BRAND_DEFINITION,
};

/**
 * 按时长维度获取对应定义。
 * 品牌维度本轮搁置，调用时 isBrand 仅用于特殊场景。
 */
export function getDefinition(duration, isBrand = false) {
  if (isBrand) {
    const key = duration === 'long-term' ? 'long-term-brand' : 'short-term-brand';
    return DEFINITION_INDEX[key];
  }
  const key = duration === 'long-term' ? 'long-term' : 'short-term';
  return DEFINITION_INDEX[key];
}

/**
 * 根据三维度查询最匹配的定义。
 * @param {'short-term'|'long-term'} duration
 * @param {boolean} isBrand
 * @param {'bottom-up'|'top-down'|'either'} direction
 */
export function findDefinition(duration, isBrand = false, direction = 'either') {
  const def = getDefinition(duration, isBrand);
  if (def.direction === 'either' || def.direction === direction) return def;
  return { ...def, direction }; // 以实际 direction 覆盖
}

// ════════════════════════════════════════════════════════════════
//  H. 流程定义元数据汇总表
// ════════════════════════════════════════════════════════════════

export const DEFINITION_META = [
  { id: 'theme-party-day',  title: '主题党日活动',  duration: 'short-term', brand: false, direction: 'bottom-up', sopScenarioId: 'theme-party',    stateCount: 7, status: 'active' },
  { id: 'short-term',       title: '短期活动',      duration: 'short-term', brand: false, direction: 'either',    sopScenarioId: null,              stateCount: 7, status: 'active' },
  { id: 'long-term',        title: '长期活动',      duration: 'long-term',  brand: false, direction: 'either',    sopScenarioId: null,              stateCount: 9, status: 'active' },
  { id: 'short-term-brand',  title: '短期品牌活动',   duration: 'short-term', brand: true,  direction: 'either',    sopScenarioId: null,              stateCount: 9, status: 'suspended' },
  { id: 'long-term-brand',   title: '长期品牌活动',   duration: 'long-term',  brand: true,  direction: 'either',    sopScenarioId: 'brand-activity',  stateCount: 9, status: 'suspended' },
];
