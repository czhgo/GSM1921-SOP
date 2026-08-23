// role: [工程师]+[AI]
// entries/about-entry.js — 关于页入口（讲我们支部的故事）
// 核心理念：以党员成长为主线，讲清考察、工作哲学、探索与对话
// 设计风格：暖纸印刷叙事册（南西油墨宋 + 暖纸底 + 墨色标题 + 党建红印章 + 硬刷油墨质感）
// 动画：Lenis 平滑滚动 + CSS 滚动驱动（animation-timeline: view()）+ 原生 JS 驱动
// 签名元素：收束致谢（三层小字）+ 探索区 SVG 关系网络 + 对话卡日出日落公转（文字正立）

import { renderSidebar } from '../components/sidebar.js?v=20260823b';
import { renderHeader } from '../components/header.js?v=20260823b';
import { getBasePath } from '../core/utils.js?v=20260823b';
import { icon } from '../core/icons.js?v=20260823b';

// ── 公开访问：不检查登录 ──
// 静态壳模式（2026-08-12）：about 为纯静态文档，不加载 auth/notice 数据链（约 50 模块），
// 仅渲染共享侧边栏/顶栏壳；通知铃首次点击时才按需加载通知模块。
renderSidebar('about', { staticShell: true });
renderHeader('about', { staticShell: true });

// ════════════════════════════════════════════════════════════════
//  数据定义
// ════════════════════════════════════════════════════════════════

// 我们如何考察（全员三维度，党建贡献高亮——特别突出原创性贡献；2026-08-12 书记指令：不强调积极分子，所有人都受到这样的考察）
const REVIEW_DIMENSIONS = [
  {
    id: 'party-class',
    name: '党课学习',
    tag: '理论修养的根基',
    desc: '系统学习党的理论、路线、方针、政策，是支部成员成长的思想基础。',
    highlight: false,
  },
  {
    id: 'contribution',
    name: '党建贡献',
    tag: '特别突出原创性的贡献',
    desc: '在活动和专班中做出的工作成绩——特别看重原创性：在活动策划、专班任务中发挥创造力，做出可被识别的原创性贡献，这是考察的核心维度。',
    highlight: true,
  },
  {
    id: 'evaluation',
    name: '综合评价',
    tag: '群众基础与日常表现',
    desc: '群众口碑、日常表现、责任担当，构成对支部成员的全面画像。',
    highlight: false,
  },
];

// ===== 工作流关系动画：镜组驱动·分镜式（2026-08-13 批判性重构） =====
// 废弃旧「stage 驱动连续插值 + viewBox 推近 + 四层硬编码」；改为「flow 底账 + 镜组滚动稳态」。
// 每个镜组独立构图（扁平化、无分层无中心包围），滚动切换时节点移入/移出视野，viewBox 固定。
// 线三类：实线=任务/赋权流，虚线=信息流，点线=文件流；颜色只分「当前/非当前」两态。
// 信息集中：核心高频节点（党小组组长/组织者/组织委员/纪检委员）权重更高、视觉更重。

// 角色元数据：name（完整 T1 名，圆下方）+ short（圆内名，5 字内用完整名）+ color（工作流图节点辨识色）
// 颜色规则（书记 2026-08-13「先用还没被清理掉的硬编码颜色」；2026-08-14 §C.3 已迁移）：
//   工作流图节点辨识色对齐 DESIGN_SYSTEM §2.3.2 角色识别色系（organizer=天蓝系 / disc-commissioner=深橙 / org-commissioner=天蓝 / prop-commissioner=海蓝）；
//   职能色——发起方党建红 / 审批方深绿 / 执行核心深青 / 参与层灰 / 动作节点紫。
//   注：此处为「身份标识场景」默认辨识色；工作台内强调一律走主题色（可自选），见 DESIGN_SYSTEM §2.7/§2.8。
const WORKFLOW_ROLES = {
  leader:    { name: '党小组组长',   short: '党小组组长', color: '#15803D' }, // 深绿·审批/赋权
  organizer: { name: '组织者',       short: '组织者',     color: '#0E7490' }, // 深青·执行核心
  deep:      { name: '深度参与者',   short: '深度参与者', color: '#64748B' }, // 灰蓝·参与
  normal:    { name: '普通参与者',   short: '普通参与者', color: '#6B7280' }, // 灰·参与
  orgComm:   { name: '组织委员',     short: '组织委员',   color: '#0EA5E9' }, // 天蓝·组织协调（DESIGN_SYSTEM §2.3.2）
  discComm:  { name: '纪检委员',     short: '纪检委员',   color: '#C2410C' }, // 深橙·监督警示（DESIGN_SYSTEM §2.3.2）
  propComm:  { name: '宣传委员',     short: '宣传委员',   color: '#2563EB' }, // 海蓝·宣传传播（DESIGN_SYSTEM §2.3.2）
  initiator: { name: '发起人',       short: '发起人',     color: '#B91C1C' }, // 党建红·发起
  committee: { name: '支委会',       short: '支委会',     color: '#B91C1C' }, // 党建红·专班审议立项（集体决策）
  expanded:  { name: '支委扩大会',   short: '支委扩大会', color: '#B91C1C' }, // 党建红·活动讨论研究（集体决策）
};

// 活动场景：5 镜组（flow 底账对齐 SOP 主题党日详细步骤 + 组织者两种情况）
const ACTIVITY_SCENE = {
  id: 'activity',
  no: '01',
  title: '活动：党小组组长发起，同志们参与',
  note: '探索的边界由党小组组长划定，信息流与任务流并行——从策划、通知、执行到考勤、归档，每个环节都有明确的"谁找谁"。',
  viewBox: '0 0 800 720',
  shots: [
    {
      id: 0,
      title: '发起 + 支委扩大会讨论',
      desc: '党小组组长汇集活动信息，交支委扩大会讨论研究（线上或线下），讨论通过后组织者推进执行。',
      flows: [
        { text: '党小组组长 → 支委扩大会（汇集信息）', type: 'info' },
        { text: '支委扩大会 → 组织者（讨论通过·推进）', type: 'task' },
      ],
      nodes: [
        { id: 'leader',    x: 170, y: 204 },
        { id: 'expanded',  x: 400, y: 480 },
        { id: 'organizer', x: 630, y: 204 },
      ],
      edges: [
        { from: 'leader',    to: 'expanded',  type: 'info' },
        { from: 'expanded',  to: 'organizer', type: 'task' },
      ],
    },
    {
      id: 1,
      title: '分工',
      desc: '组织者向深度参与者分派任务，分工需经平等协商。',
      flows: [
        { text: '组织者 → 深度参与者（分工·平等协商）', type: 'task' },
      ],
      nodes: [
        { id: 'organizer', x: 320, y: 348 },
        { id: 'deep',      x: 540, y: 348 },
      ],
      edges: [
        { from: 'organizer', to: 'deep', type: 'task' },
      ],
    },
    {
      id: 2,
      title: '联系条条 + 通知 + 准备',
      desc: '组织者向条条委员说明活动计划，向普通参与者发布通知；宣传委员指导深度参与者准备宣传——多线程并行推进。',
      flows: [
        { text: '组织者 → 组织/宣传/纪检委员（说明活动计划）', type: 'info' },
        { text: '组织者 → 普通参与者（通知）', type: 'info' },
        { text: '宣传委员 → 深度参与者（宣传指导）', type: 'info' },
        { text: '纪检委员 ↔ 组织者（考勤对接）', type: 'info' },
      ],
      nodes: [
        { id: 'organizer', x: 300, y: 360 },
        { id: 'normal',    x: 210, y: 180 },
        { id: 'orgComm',   x: 600, y: 180 },
        { id: 'discComm',  x: 630, y: 360 },
        { id: 'propComm',  x: 600, y: 540 },
        { id: 'deep',      x: 250, y: 540 },
      ],
      edges: [
        { from: 'organizer', to: 'normal',   type: 'info' },
        { from: 'organizer', to: 'orgComm',  type: 'info' },
        { from: 'organizer', to: 'discComm', type: 'info' },
        { from: 'organizer', to: 'propComm', type: 'info' },
        { from: 'propComm',  to: 'deep',     type: 'info' },
      ],
    },
    {
      id: 3,
      title: '复盘 + 宣传产出 + 材料归档',
      desc: '组织者提交复盘给纪检委员批注确认；深度参与者将宣传产出与材料交组织者，组织者打包后统一提交宣传委员归档——多线程并行。',
      flows: [
        { text: '组织者 → 纪检委员（提交复盘·批注确认）', type: 'info' },
        { text: '深度参与者 → 组织者（交付宣传产出+材料）', type: 'file' },
        { text: '组织者 → 宣传委员（打包提交归档）', type: 'file' },
      ],
      nodes: [
        { id: 'organizer', x: 400, y: 348 },
        { id: 'discComm',  x: 640, y: 180 },
        { id: 'deep',      x: 200, y: 516 },
        { id: 'propComm',  x: 620, y: 516 },
      ],
      edges: [
        { from: 'organizer', to: 'discComm', type: 'info' },
        { from: 'deep',      to: 'organizer', type: 'file' },
        { from: 'organizer', to: 'propComm', type: 'file' },
      ],
    },
    {
      id: 4,
      title: '考察建档',
      desc: '纪检委员将考察记录提交组织委员，组织委员据此更新支部人才库——活动闭环的落点。',
      flows: [
        { text: '纪检委员 → 组织委员（考察记录·更新人才库）', type: 'file' },
      ],
      nodes: [
        { id: 'discComm', x: 260, y: 348 },
        { id: 'orgComm',  x: 540, y: 348 },
      ],
      edges: [
        { from: 'discComm', to: 'orgComm', type: 'file' },
      ],
    },
  ],
};

// 专班场景：3 镜组（flow 底账对齐 SOP 组织委员工作流程指南 + 党小组组长工作手册 §4）
const TASKFORCE_SCENE = {
  id: 'taskforce',
  no: '02',
  title: '专班：组织委员统筹，不限时间地点',
  note: '与活动不同——专班由发起人提出需求，支委会审议立项后交组织委员统一招募；组织者负责分工记录与协调，深度参与者承担具体分工。',
  viewBox: '0 0 800 720',
  shots: [
    {
      id: 0,
      title: '发起 + 支委会审议',
      desc: '发起人（书记/党小组组长/支委等，可多人）提出专班需求；支委会审议立项（线上或线下），通过后交组织委员招募。',
      flows: [
        { text: '发起人 → 支委会（提出需求）', type: 'info' },
        { text: '支委会 → 组织委员（审议通过·交招募）', type: 'task' },
      ],
      nodes: [
        { id: 'initiator', x: 180, y: 348 },
        { id: 'committee', x: 400, y: 348 },
        { id: 'orgComm',   x: 620, y: 348 },
      ],
      edges: [
        { from: 'initiator', to: 'committee', type: 'info' },
        { from: 'committee', to: 'orgComm',   type: 'task' },
      ],
    },
    {
      id: 1,
      title: '招募赋权 + 名单同步',
      desc: '组织委员统一招募赋权给组织者和深度参与者；同时将名单同步给纪检委员——多线程并行。',
      flows: [
        { text: '组织委员 → 组织者（招募赋权）', type: 'task' },
        { text: '组织委员 → 深度参与者（招募赋权）', type: 'task' },
        { text: '组织委员 → 纪检委员（名单同步）', type: 'info' },
      ],
      nodes: [
        { id: 'orgComm',   x: 400, y: 180 },
        { id: 'organizer', x: 200, y: 516 },
        { id: 'deep',      x: 600, y: 516 },
        { id: 'discComm',  x: 640, y: 180 },
      ],
      edges: [
        { from: 'orgComm', to: 'organizer', type: 'task' },
        { from: 'orgComm', to: 'deep',      type: 'task' },
        { from: 'orgComm', to: 'discComm',  type: 'info' },
      ],
    },
    {
      id: 2,
      title: '分工协调 + 归档',
      desc: '组织者分工记录、协调推进；提交工作考察记录给纪检委员、工作量归档给组织委员——专班闭环。',
      flows: [
        { text: '组织者 → 深度参与者（分工记录·协调推进）', type: 'task' },
        { text: '组织者 → 纪检委员（工作考察记录）', type: 'file' },
        { text: '组织者 → 组织委员（工作量归档）', type: 'file' },
      ],
      nodes: [
        { id: 'organizer', x: 400, y: 180 },
        { id: 'deep',      x: 180, y: 516 },
        { id: 'discComm',  x: 620, y: 348 },
        { id: 'orgComm',   x: 620, y: 540 },
      ],
      edges: [
        { from: 'organizer', to: 'deep',     type: 'task' },
        { from: 'organizer', to: 'discComm', type: 'file' },
        { from: 'organizer', to: 'orgComm',  type: 'file' },
      ],
    },
  ],
};

// 和组织对话——四阶段（行百里者半九十）
const DIALOGUE_STAGES = [
  {
    no: '01',
    phase: '工作之前',
    question: '谁去告诉同志们活动/专班的工作内容？',
    answer: '党小组组长 / 发起人',
    desc: '工作开始前，由党小组组长（活动）或发起人（专班）向参与同志讲清工作内容、边界与预期。',
  },
  {
    no: '02',
    phase: '工作之中',
    question: '工作中遇到问题怎么办？',
    answer: '及时和组织沟通',
    desc: '反馈要在过程中进行——遇到偏差及时和组织对话、调整，避免事倍功半。',
  },
  {
    no: '03',
    phase: '工作之后',
    question: '如何在实践中改进？',
    answer: '和组织对话',
    desc: '活动完成后，还要和组织对话、复盘得失——行百里者半九十。',
  },
  {
    no: '04',
    phase: '下一次活动',
    question: '经验如何传承？',
    answer: '从这次到下一次',
    desc: '从一次活动/专班到下一次，同志与组织形成持续的对话关系——上次的经验成为下次的起点，在实践中不断改进工作内容与模式。',
  },
];

// 发展党员 7 关键节点（2026-08-18 T-270 压缩，成员视角，主语统一）
// 支部为主要执行者、成员自身不需突出工作的环节（政审/预审/报上级等）不单列主轴，仅出现在展开细节。
// 材料（思想汇报等）在具体节点展开中体现。
// isDecisionNode: 关键决策节点（含党支部委员会/党支部党员大会/上级党委），用金色光晕环标记
// article: 条号（T1 原文出处）
const DEVELOPMENT_TIMELINE = [
  // 阶段 1：入党申请人 → 入党积极分子
  { no: 1,  title: '递交入党申请书',     time: '年满十八岁', decisionMaker: '本人自愿',            decisionDetail: '入党申请人表达意愿；党组织一个月内派人谈话（支部执行，弱化）', article: '§5/§7', isDecisionNode: false, stage: 'applicant', stickyNote: null, timeHighlight: true },
  { no: 2,  title: '培养考察期',         time: '一年以上',   decisionMaker: '培养联系人 + 党支部',  decisionDetail: '定期撰写思想汇报；培养联系人指导培养；党支部每半年考察一次', article: '§9/§11', isDecisionNode: false, stage: 'applicant', stickyNote: '一年以上培养考察期' },
  // 阶段 2：入党积极分子 → 发展对象
  { no: 3,  title: '确定发展对象（公示）', time: '公示五个工作日', decisionMaker: '党支部委员会会议研究', decisionDetail: '在听取党小组、培养联系人、党员和群众意见基础上确定，报上级党委同意（支部执行）', article: '§13', isDecisionNode: true, stage: 'activist', stickyNote: null },
  { no: 4,  title: '短期集中培训',       time: '不少于三天或24学时', decisionMaker: '本人参加',    decisionDetail: '培训合格方可发展入党；政审由党组织开展（支部执行，弱化）', article: '§16/§17', isDecisionNode: false, stage: 'activist', stickyNote: null },
  // 阶段 3：发展对象 → 预备党员
  { no: 5,  title: '支部党员大会表决',    time: '预审合格后一个月内', decisionMaker: '党支部党员大会', decisionDetail: '本人在大会汇报；无记名投票表决，赞成人数超过应到会有表决权党员半数；支委会审查+基层党委预审（支部执行，弱化）', article: '§18/§19/§20', isDecisionNode: true, stage: 'prospect', stickyNote: '支部大会无记名投票表决' },
  // 阶段 4：预备党员 → 正式党员
  { no: 6,  title: '预备期',             time: '一年',       decisionMaker: '党组织继续教育和考察', decisionDetail: '定期撰写思想汇报；预备期从支部大会通过之日算起；党委审批（支部执行，弱化）', article: '§25/§28/§31', isDecisionNode: false, stage: 'full', stickyNote: '预备期一年' },
  { no: 7,  title: '转正支部大会表决',    time: '预备期满',   decisionMaker: '党支部党员大会',      decisionDetail: '本人书面申请 → 征求党小组、党员、群众意见 → 支部委员会审查 → 支部党员大会讨论表决 → 报上级审批', article: '§32/§33', isDecisionNode: true, stage: 'full', stickyNote: '书面申请→征求意见→支部大会→上级审批' },
];

// 小目录条目（8 个 section 对应 8 个圆点，2026-08-18 T-270 删「党建+科研」独立项）
// 主线（书记 2026-08-12 定序 + 2026-08-18 重构）：开篇 → 组织性（组织向大家讲述）→
// 三个成长机会 → 身份阶段（明线：积极分子怎么发展）→ 考察维度 → 工作流 → 行百里者半九十 → 收束（致谢与期待）
const TOC_ITEMS = [
  { id: 'hero',         label: '开篇' },
  { id: 'cognition',    label: '"组织性"的展开' },
  { id: 'philosophy',   label: '成长机会' },
  { id: 'development',  label: '身份阶段' },
  { id: 'review',       label: '如何考察' },
  { id: 'exploration',  label: '工作流' },
  { id: 'dialogue',     label: '行百里者半九十' },
  { id: 'conclusion',   label: '收束' },
];

// ════════════════════════════════════════════════════════════════
//  SVG 工具函数
// ════════════════════════════════════════════════════════════════

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el;
}

/** 计算从 from 到 to 的连线路径（缩进节点半径，避免被遮挡）
 *  labelT: label 在线段上的位置（0=起点, 1=终点, 0.5=中点），用于避开节点重叠
 *  curve: 曲率（0=直线），正值=沿线段顺时针 90° 方向偏移；用于反向边对分开
 */
function edgePath(from, to, radius = 42, labelT = 0.5, curve = 0) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  const x1 = from.x + ux * radius;
  const y1 = from.y + uy * radius;
  const x2 = to.x - ux * (radius + 6); // 多留 6px 给箭头
  const y2 = to.y - uy * (radius + 6);

  if (curve === 0) {
    const mx = x1 + (x2 - x1) * labelT;
    const my = y1 + (y2 - y1) * labelT;
    return { d: `M ${x1},${y1} L ${x2},${y2}`, mx, my, x1, y1, x2, y2 };
  }

  // 曲线：控制点在线段中点沿顺时针 90° 方向（-uy, ux）偏移 curve
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const cx = midX + (-uy) * curve;
  const cy = midY + ux * curve;
  // quadratic Bezier 上 t=labelT 处的点
  const t = labelT;
  const mx = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx + t * t * x2;
  const my = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cy + t * t * y2;
  return { d: `M ${x1},${y1} Q ${cx},${cy} ${x2},${y2}`, mx, my, x1, y1, x2, y2 };
}

// ════════════════════════════════════════════════════════════════
//  渲染函数
// ════════════════════════════════════════════════════════════════

/** Section 1: Hero — 从入党申请人到正式党员（成长路径开篇） */
function renderHero() {
  return `
    <section id="hero" class="ab-page ab-page--cover ab-hero-section" data-toc-id="hero">
      <canvas class="ab-particle-canvas" aria-hidden="true"></canvas>
      <div class="ab-hero-inner">
        <h1 class="ab-hero-title">从入党申请人<br/>到正式党员</h1>
        <p class="ab-hero-subtitle">光华管理学院本科生党支部</p>
        <div class="ab-hero-rule"></div>
        <div class="ab-hero-scroll-hint" aria-hidden="true">
          <span class="ab-scroll-text">向下滚动</span>
          ${icon('scrollDown', { width: 20, height: 28, viewBox: '0 0 20 28', className: 'ab-scroll-arrow' })}
        </div>
      </div>
    </section>
  `;
}

/** Section 2: 我们如何考察（全员三维度卡片，党建贡献高亮） */
function renderReview() {
  const cards = REVIEW_DIMENSIONS.map((d, i) => `
    <div class="ab-review-card ${d.highlight ? 'ab-review-card--highlight' : ''}" data-stagger tabindex="0" role="button" aria-label="${d.name}：${d.tag}">
      <span class="ab-review-card-no">${String(i + 1).padStart(2, '0')}</span>
      <div class="ab-review-card-head">
        <span class="ab-review-card-name">${d.name}</span>
        ${d.highlight ? '<span class="ab-review-card-badge">重点</span>' : ''}
      </div>
      <div class="ab-review-card-tag">${d.tag}</div>
      <div class="ab-review-card-desc">${d.desc}</div>
    </div>
  `).join('');

  return `
    <section id="review" class="ab-page ab-review-section" data-toc-id="review">
      <span class="ab-page-no">04</span>
      <span class="ab-page-runner">第四章 · 全员考察</span>
      <div class="ab-chapter ab-chapter--right">
        <div class="ab-chapter-eyebrow">全员考察</div>
        <h2 class="ab-chapter-title">我们如何考察</h2>
        <p class="ab-chapter-sub">三项考察内容——党课、贡献、评价，其中党建贡献特别看重原创性</p>
        <div class="ab-review-grid">${cards}</div>
        <div class="ab-review-footer">什么是党建贡献？→ 我们支部有一套工作架构</div>
      </div>
    </section>
  `;
}

/**
 * Section 4: 三个成长机会（2026-08-18 T-270 重构）
 *
 * 母本：SECRETARY_PRONOUNCEMENTS.md「三、人的成长」P-014/P-015/P-016——
 * 适应学习 / 探索创新 / 对话 三个并列成长机会。党建+科研（P-016 对话）从独立章并入此处。
 * blockquote 直接展示书记原话全文（延续既有风格）。
 */
function renderPhilosophy() {
  const opportunities = [
    {
      title: '适应、学习的机会',
      quoteLines: [
        '"民主集中制"下感受真实的组织的两个向度：',
        '"赋权"背景下的程序性 和 "探索"背景下的扁平化。',
        '这也就意味着真实的组织，不能只靠程序性令人凝聚在一起，也不能只靠"扁平化"而不去形成共识、带来效率。',
        '提高生涯发展中对于所处组织的适应能力和开放心态。',
      ],
      points: [
        { label: '程序性', desc: '"赋权"背景下——组织通过分工、流程、记录、复盘让人凝聚' },
        { label: '扁平化', desc: '"探索"背景下——组织通过平等协商、无上下级分工让人创新' },
      ],
      insight: '体悟这种平衡，能提高生涯发展中对于所处组织的适应能力和开放心态——未来无论进入什么组织，都能理解真实组织既有程序性的一面，也有扁平化的一面。',
    },
    {
      title: '探索、创新的机会',
      quoteLines: [
        '作为AI时代中一个建设方兴未艾的学生组织，',
        '①可以真实地参与组织制度和组织文化的构建；',
        '②可以在"没有经济负担"的背景下探索AI时代下组织转型的萌芽和组织产品的生产。',
      ],
      points: [
        { label: '参与构建', desc: '可以真实地参与组织制度和组织文化的构建' },
        { label: '探索自由度', desc: '在"没有经济负担"的背景下探索组织转型的萌芽和组织产品的生产——未来进入职场后难以获得' },
      ],
      insight: '学生党支部的"方兴未艾"恰恰是机会所在：成熟组织没有这种探索空间，而学生组织有。',
    },
    {
      title: '对话的机会——党建+科研',
      quoteLines: [
        '党建和经管学科科研的交叉点在于恢复和马克思主义的对话能力，恢复理论研究和现实治理之间的对话能力。',
      ],
      points: [
        { label: '研究对象', desc: '经管学科研究对象本身是历史生成、社会建构的，不是自明的——这是理工科不遇到的问题' },
        { label: '抽象能力', desc: '从现实到理论的抽象缺乏系统训练；马克思主义方法论与经济学工具互补，党建以组织化机制补足' },
        { label: '组织环境', desc: '党建+科研建设的是「促进高质量问题生成的组织环境」' },
      ],
      insight: '对经管学生而言，"服务人"有一个特别值得做的方向——帮助你恢复与思想、与现实世界的对话能力。',
    },
  ];

  const cards = opportunities.map(opp => {
    const pointsHTML = opp.points.map(p => `
      <div class="ab-philosophy-opp-point">
        <span class="ab-philosophy-opp-point-label">${p.label}</span>
        <span class="ab-philosophy-opp-point-desc">${p.desc}</span>
      </div>
    `).join('');

    return `
      <article class="ab-philosophy-opp" data-stagger>
        <h3 class="ab-philosophy-opp-title">${opp.title}</h3>
        <blockquote class="ab-philosophy-opp-quote">${opp.quoteLines.map(l => `<span class="ab-philosophy-opp-quote-line">${l}</span>`).join('')}</blockquote>
        <div class="ab-philosophy-opp-points">${pointsHTML}</div>
        <p class="ab-philosophy-opp-insight">${opp.insight}</p>
      </article>
    `;
  }).join('');

  return `
    <section id="philosophy" class="ab-page ab-philosophy-section" data-toc-id="philosophy">
      <span class="ab-page-no">02</span>
      <span class="ab-page-runner">第二章 · 成长机会</span>
      <div class="ab-chapter ab-philosophy-inner ab-chapter--center">
        <div class="ab-chapter-eyebrow">成长机会</div>
        <h2 class="ab-chapter-title">三个成长机会</h2>
        <p class="ab-chapter-sub" data-stagger>
          爱具体的组织——光华管理学院本科生党支部提供三个并列的成长机会。
        </p>
        <div class="ab-philosophy-opportunities">${cards}</div>
      </div>
    </section>
  `;
}

/**
 * Section 2: 组织性——组织向大家讲述（2026-08-18 T-271 第 2 轮修缮）
 *
 * 布局：纵向铺展（章头在上，内容纵向展开，与第二章错落语言统一）。
 * 三个关键词：只单独展示关键词（大字 + 书记提供的完整短语），不配 AI desc、不配引文。
 * 三条期待落点：标题 + 书记原话 blockquote（不写编号/日期/「书记」字样）。
 */
function renderCognition() {
  const keywords = [
    { word: '具体',     full: '一个具体的组织' },
    { word: '方兴未艾', full: '一个方兴未艾的组织' },
    { word: '提供成长', full: '一个提供成长的组织' },
  ];

  const expects = [
    {
      title: '你可以期待的成长路径',
      quote: '各种发展轨迹，都可以加入其中，获得他想要的成长，并且是通过组织获得他想要的成长。',
    },
    {
      title: '你可以期待的做事方式',
      quote: '事情的运作固然有管理的科学和既往的经验。作为支部成员，在执行已沉淀的工作流的基础上，本身便可以得到成长和锻炼。',
    },
    {
      title: '你可以期待的表达空间',
      quote: '我们不反对批评意见，但要求要在组织的框架内提出批评意见……我特别怕大家因为认为是\u201c党支部\u201d，所以怕说错话，而选择不\u201c真实表达\u201d！因为这样自己既没有真实的交互体验，组织也没办法持续进步。',
    },
  ];

  const keywordsHTML = keywords.map(k => `
    <article class="ab-keyword" data-stagger>
      <h3 class="ab-keyword-word">${k.word}</h3>
      <p class="ab-keyword-full">${k.full}</p>
    </article>
  `).join('');

  const expectsHTML = expects.map((e, i) => `
    <article class="ab-expect-card" data-stagger data-i="${i}">
      <h4 class="ab-expect-card-title">${e.title}</h4>
      <blockquote class="ab-expect-card-quote">${e.quote}</blockquote>
    </article>
  `).join('');

  return `
    <section id="cognition" class="ab-page ab-cognition-section" data-toc-id="cognition">
      <span class="ab-page-no">01</span>
      <span class="ab-page-runner">第一章 · 组织性</span>
      <div class="ab-chapter ab-cognition-inner">
        <div class="ab-chapter-eyebrow">"组织性"的展开</div>
        <h2 class="ab-chapter-title">"组织性"<br/>的展开</h2>
        <div class="ab-cognition-lead" data-stagger>
          <p>一个正在建设中的组织，先向你打开自己的处境。</p>
        </div>
        <div class="ab-keywords">${keywordsHTML}</div>
        <div class="ab-expect-list">${expectsHTML}</div>
      </div>
    </section>
  `;
}

/** 渲染单个场景的单一 SVG（镜组驱动·连续运动）
 *  单一画布 + viewBox 固定；所有节点/边去重渲染，滚动时 JS 连续驱动——
 *  节点位置在镜组间 lerp（走进/走出视野），边描边生长 + 起终点渐变（颜色补箭头方向）。 */
function renderSceneSVG(scene) {
  const svg = svgEl('svg', {
    class: 'ab-scene-svg',
    viewBox: scene.viewBox,
    preserveAspectRatio: 'xMidYMid meet',
    'aria-label': scene.title,
  });

  // 收集去重节点（首现坐标作初始位置）
  const nodeMap = new Map();
  scene.shots.forEach(shot => {
    shot.nodes.forEach(n => {
      if (!nodeMap.has(n.id)) nodeMap.set(n.id, { x: n.x, y: n.y });
    });
  });

  // 收集去重边（带 shot 归属）
  const edgeList = [];
  const edgeIndex = new Map();
  scene.shots.forEach((shot, si) => {
    shot.edges.forEach(e => {
      const key = `${e.from}|${e.to}|${e.type}|${e.curve || 0}`;
      if (!edgeIndex.has(key)) {
        edgeIndex.set(key, edgeList.length);
        edgeList.push({ from: e.from, to: e.to, type: e.type, curve: e.curve || 0, shots: [si] });
      } else {
        edgeList[edgeIndex.get(key)].shots.push(si);
      }
    });
  });

  // defs：每条边一个起终点渐变（from 色 → to 色，补箭头方向语义）
  const defs = svgEl('defs');
  edgeList.forEach((e, i) => {
    const grad = svgEl('linearGradient', { id: `ab-grad-${i}`, gradientUnits: 'userSpaceOnUse' });
    grad.appendChild(svgEl('stop', { offset: '0%', 'stop-color': (WORKFLOW_ROLES[e.from] || {}).color || '#64748B' }));
    grad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': (WORKFLOW_ROLES[e.to] || {}).color || '#64748B' }));
    defs.appendChild(grad);
  });
  svg.appendChild(defs);

  // 边层（底层）
  const edgesG = svgEl('g', { class: 'ab-scene-edges' });
  edgeList.forEach((e, i) => {
    const fromPos = nodeMap.get(e.from);
    const toPos = nodeMap.get(e.to);
    if (!fromPos || !toPos) return;
    const path = edgePath(fromPos, toPos, 52, 0.5, e.curve);
    const toColor = (WORKFLOW_ROLES[e.to] || {}).color || '#64748B';

    const g = svgEl('g', {
      class: `ab-edge ab-edge--${e.type}`,
      'data-edge': String(i),
      'data-from': e.from,
      'data-to': e.to,
      'data-shots': e.shots.join(','),
    });
    g.appendChild(svgEl('path', { class: 'ab-edge-path', stroke: `url(#ab-grad-${i})`, d: path.d }));

    const angle = Math.atan2(path.y2 - path.y1, path.x2 - path.x1) * 180 / Math.PI;
    g.appendChild(svgEl('path', {
      d: 'M -8 -4 L 0 0 L -8 4 z',
      class: 'ab-edge-arrow',
      fill: toColor,
      transform: `translate(${path.x2},${path.y2}) rotate(${angle})`,
    }));

    edgesG.appendChild(g);
  });
  svg.appendChild(edgesG);

  // 节点层（顶层）：统一圆大小（至少容纳 5 字）+ 圆内短名 + 圆下完整名
  const nodesG = svgEl('g', { class: 'ab-scene-nodes' });
  nodeMap.forEach((pos, id) => {
    const role = WORKFLOW_ROLES[id] || { name: id, short: id, color: '#64748B' };
    const r = 70; // 2026-08-18 T-270 半径 52→70（大屏投影可读）

    const g = svgEl('g', {
      class: 'ab-node-svg',
      'data-id': id,
      transform: `translate(${pos.x},${pos.y})`,
      'aria-label': role.name,
    });
    g.appendChild(svgEl('circle', { class: 'ab-node-circle', r: String(r), fill: role.color }));

    const text = svgEl('text', { class: 'ab-node-text', 'text-anchor': 'middle', 'dominant-baseline': 'middle', x: 0, y: 0 });
    text.textContent = role.short;
    g.appendChild(text);

    if (role.name !== role.short) {
      const name = svgEl('text', { class: 'ab-node-name', 'text-anchor': 'middle', x: 0, y: r + 18 });
      name.textContent = role.name;
      g.appendChild(name);
    }

    nodesG.appendChild(g);
  });
  svg.appendChild(nodesG);

  return new XMLSerializer().serializeToString(svg);
}

/** Section 5: 工作流——镜组驱动连续运动（谁在什么时候该去找谁） */
/** 渲染单个探索场景片段（2026-08-14 T-248 性能：从 renderExploration 拆出，供懒渲染分片挂载） */
function renderSceneFragment(scene) {
  const svg = renderSceneSVG(scene);
  const stagesHTML = scene.shots.map(shot => `
      <div class="ab-exploration-stage" data-shot="${shot.id}">
        <div class="ab-exploration-stage-no">${String(shot.id + 1).padStart(2, '0')}</div>
        <div class="ab-exploration-stage-body">
          <h4 class="ab-exploration-stage-title">${shot.title}</h4>
          <p class="ab-exploration-stage-desc">${shot.desc}</p>
          <ul class="ab-exploration-stage-flows">
            ${shot.flows.map(f => `<li><span class="ab-flow-line ab-flow-line--${f.type}"></span>${f.text}</li>`).join('')}
          </ul>
        </div>
      </div>
    `).join('');
  return `
      <div class="ab-exploration-scene" data-scene="${scene.id}">
        <div class="ab-exploration-scene-head">
          <span class="ab-exploration-block-no">${scene.no}</span>
          <h3 class="ab-exploration-block-title">${scene.title}</h3>
        </div>
        <div class="ab-exploration-scene-body">
          <div class="ab-exploration-network-sticky">
            ${svg}
          </div>
          <div class="ab-exploration-stages">${stagesHTML}</div>
        </div>
        <div class="ab-exploration-scene-note">${scene.note}</div>
      </div>`;
}

/** 完整渲染探索章（保留：整章一次性渲染路径；懒渲染分片路径经 renderSceneFragment 复用同一模板） */
function renderExploration() {
  const scenesHTML = [ACTIVITY_SCENE, TASKFORCE_SCENE].map(scene => renderSceneFragment(scene)).join('');

  return `
    <section id="exploration" class="ab-page ab-network-section ab-exploration-section" data-toc-id="exploration">
      <span class="ab-page-no">05</span>
      <span class="ab-page-runner">第五章 · 工作流</span>
      <div class="ab-chapter">
        <div class="ab-chapter-eyebrow">工作流</div>
        <h2 class="ab-chapter-title">工作流——谁在什么时候该去找谁？</h2>
        <p class="ab-chapter-sub">有先例的，按工作流走<br/>没先例的，靠探索沉淀</p>
        ${scenesHTML}
        <p class="ab-exploration-coda">
          程序在所有人之上，所以扁平；书记因更大的责任嵌入更深，所以集中——扁平与集中，统一于程序。
        </p>
      </div>
    </section>
  `;
}

/** Section 7: 和组织对话——行百里者半九十（四阶段日出日落，滚动驱动公转，文字始终正立，闭环表达） */
function renderDialogue() {
  const stepsHTML = DIALOGUE_STAGES.map((s) => {
    return `
      <article class="ab-dialogue-card" data-state="future">
        <div class="ab-dialogue-no">${s.no}</div>
        <div class="ab-dialogue-phase">${s.phase}</div>
        <div class="ab-dialogue-question">${s.question}</div>
        <div class="ab-dialogue-answer">${s.answer}</div>
        <div class="ab-dialogue-desc">${s.desc}</div>
      </article>
    `;
  }).join('');

  return `
    <section id="dialogue" class="ab-page ab-dialogue-section" data-toc-id="dialogue">
      <span class="ab-page-no">06</span>
      <span class="ab-page-runner">第六章 · 行百里者半九十</span>
      <div class="ab-chapter ab-dialogue-inner">
        <!-- 2026-08-14 书记指令「标题和动画视窗可以同时出现，而不是只有几个卡片在空转」：
             章头（eyebrow/title/sub）移入 sticky flow 内——滚动旋转期间标题始终在场，与视窗同屏 -->
        <div class="ab-dialogue-flow">
          <div class="ab-dialogue-head">
            <div class="ab-chapter-eyebrow">善始善终</div>
            <h2 class="ab-chapter-title">行百里者半九十</h2>
            <p class="ab-chapter-sub">活动完成后，对话与复盘仍在继续——在实践中持续改进</p>
          </div>
          <div class="ab-dialogue-stage">
            ${stepsHTML}
          </div>
        </div>
        <!-- 垫片必须紧邻 flow 之后（2026-08-14 修正）。垫片提供滚动行程 -->
        <div class="ab-dialogue-spacer" aria-hidden="true"></div>
      </div>
    </section>
  `;
}

/** Section 8: 收束——小字自然收尾（2026-08-18 T-271 重构）
 *  三层小字由大到小居中：感谢你读到这里 → 期待我们的共同成长 → 实践是检验真理的唯一标准
 *  去口号：删除「管理事，服务人」大字与「爱具体的人/组织」echo（书记裁决：已内化、矫情） */
function renderConclusion() {
  return `
    <section id="conclusion" class="ab-page ab-page--closing ab-conclusion-section" data-toc-id="conclusion">
      <div class="ab-conclusion-inner">
        <p class="ab-conclusion-thanks" data-stagger>感谢你读到这里。</p>
        <p class="ab-conclusion-hope" data-stagger>期待我们的共同成长。</p>
        <p class="ab-conclusion-coda" data-stagger>实践是检验真理的唯一标准。</p>
      </div>
    </section>
  `;
}

/** Section 3: 发展党员交替时间轴（7 关键节点，居中列 + 左右交替侧面板，2026-08-18 T-270 压缩） */
function renderDevelopment() {
  // 阶段定义（4 阶段，2026-08-18 T-270 节点数随 7 节点压缩调整）
  const STAGES = [
    { key: 'applicant',    label: '入党申请人 → 入党积极分子', nos: [1,2] },
    { key: 'activist',     label: '入党积极分子 → 发展对象',   nos: [3,4] },
    { key: 'prospect',     label: '发展对象 → 预备党员',       nos: [5] },
    { key: 'full',         label: '预备党员 → 正式党员',       nos: [6,7] },
  ];

  const nodeMap = {};
  DEVELOPMENT_TIMELINE.forEach(n => { nodeMap[n.no] = n; });

  let html = '';

  STAGES.forEach(stage => {
    html += `<div class="ab-tl-stage">${stage.label}</div>`;

    stage.nos.forEach(no => {
      const node = nodeMap[no];
      if (!node) return;

      const isDecision = node.isDecisionNode;
      const isOdd = node.no % 2 === 1;

      const dotClass = isDecision ? 'ab-tl-dot--decision' : '';
      const noClass = isDecision ? 'ab-tl-no--decision' : '';

      const leftContent = isOdd
        ? `<div class="ab-tl-detail" data-step="${node.no}">
             <span class="ab-tl-detail-article">${node.article}</span>
             <span class="ab-tl-detail-decision">${node.decisionMaker}</span>
             <div class="ab-tl-detail-text">${node.decisionDetail}</div>
           </div>`
        : (node.stickyNote
            ? `<span class="ab-tl-sticky${isDecision ? ' ab-tl-sticky--decision' : ''}">${node.stickyNote}</span>`
            : '');

      const rightContent = isOdd
        ? (node.stickyNote
            ? `<span class="ab-tl-sticky${isDecision ? ' ab-tl-sticky--decision' : ''}">${node.stickyNote}</span>`
            : '')
        : `<div class="ab-tl-detail" data-step="${node.no}">
             <span class="ab-tl-detail-article">${node.article}</span>
             <span class="ab-tl-detail-decision">${node.decisionMaker}</span>
             <div class="ab-tl-detail-text">${node.decisionDetail}</div>
           </div>`;

      html += `
        <div class="ab-tl-row${isDecision ? ' ab-tl-row--decision' : ''}" data-step="${node.no}">
          <div class="ab-tl-side ab-tl-side--left">${leftContent}</div>
          <div class="ab-tl-center">
            <span class="ab-tl-dot ${dotClass}"></span>
            <span class="ab-tl-no ${noClass}">${node.no}</span>
            <span class="ab-tl-title">${node.title}</span>
            ${node.time && node.time !== '—' ? `<span class="ab-tl-time${node.timeHighlight ? ' ab-tl-time--hl' : ''}">${node.time}</span>` : ''}
          </div>
          <div class="ab-tl-side ab-tl-side--right">${rightContent}</div>
        </div>
      `;
    });
  });

  return `
    <section id="development" class="ab-page ab-development-section" data-toc-id="development">
      <span class="ab-page-no">03</span>
      <span class="ab-page-runner">第三章 · 发展党员</span>
      <div class="ab-chapter">
        <div class="ab-chapter-eyebrow">身份阶段</div>
        <h2 class="ab-chapter-title">从入党申请人到正式党员</h2>
        <p class="ab-chapter-sub">依据《发展党员工作细则（2026年）》</p>
        <div class="ab-timeline-legend">
          <span class="ab-timeline-legend-item"><span class="ab-timeline-legend-dot"></span>普通节点</span>
          <span class="ab-timeline-legend-item ab-timeline-legend-item--decision"><span class="ab-timeline-legend-dot"></span>关键决策节点</span>
        </div>
        <div class="ab-timeline-alternating">${html}</div>
      </div>
    </section>
  `;
}

/** 安全渲染（模块级，供 renderAboutContent 与探索区懒加载共用）：
 *  每个 section 用 try-catch 包裹，避免单个 section 报错导致整个页面空白 */
function safe(name, fn) {
  try {
    return fn();
  } catch (e) {
    console.error(`[renderAboutContent] ${name} ERROR:`, e);
    return `<div style="--acc-bg-dark:rgba(248,113,113,0.16);--acc-text-dark:#F87171;--acc-border-dark:#F87171;padding:20px;background:#fee;border:2px solid red;color:#900;">[${name} 渲染失败: ${e.message}]</div>`;
  }
}

/** 固定小目录（桌面端右侧，移动端隐藏） */
function renderTOC() {
  const items = TOC_ITEMS.map(item => `
    <a href="#${item.id}" class="ab-toc-dot-item" data-toc="${item.id}" aria-label="跳转到${item.label}">
      <span class="ab-toc-dot-mark" aria-hidden="true"></span>
      <span class="ab-toc-dot-tooltip">${item.label}</span>
    </a>
  `).join('');
  return `<nav class="ab-toc-nav" aria-label="页面目录"><div class="ab-toc-nav-inner">${items}</div></nav>`;
}

/** 主渲染入口 */
function renderAboutContent() {
  const content = document.getElementById('about-content');
  if (!content) {
    console.error('[renderAboutContent] #about-content not found');
    return;
  }
  const base = getBasePath();
  console.log('[renderAboutContent] start, base=', base);

  content.classList.add('ab-about');
  content.innerHTML = `
    ${safe('TOC', renderTOC)}
    ${safe('Hero', renderHero)}
    ${safe('Cognition', renderCognition)}
    ${safe('Philosophy', renderPhilosophy)}
    ${safe('Development', renderDevelopment)}
    ${safe('Review', renderReview)}
    <div class="ab-lazy-slot" id="ab-lazy-exploration" data-lazy="exploration" aria-label="工作流（滚动加载）"></div>
    ${safe('Dialogue', renderDialogue)}
    ${safe('Conclusion', renderConclusion)}
    <footer class="ab-page-footer">
      <a href="${base}index.html" class="ab-back-link">
        ${icon('arrowLeft', { className: 'w-3.5 h-3.5' })}
        返回主页
      </a>
    </footer>
  `;
}

// ════════════════════════════════════════════════════════════════
//  交互逻辑
// ════════════════════════════════════════════════════════════════

/** 时间轴展开（2026-08-14 T-249 规避 GSAP：CSS transition + class 切换，展开态样式在 about.css .ab-tl-row.is-expanded .ab-tl-detail） */
function bindTimelineToggle() {
  const container = document.querySelector('.ab-timeline-alternating');
  if (!container) return;
  let currentExpanded = null;
  container.querySelectorAll('.ab-tl-row').forEach(row => {
    const center = row.querySelector('.ab-tl-center');
    if (!center) return;
    center.style.cursor = 'pointer';
    center.addEventListener('click', () => {
      if (currentExpanded === row) {
        row.classList.remove('is-expanded');
        currentExpanded = null;
        return;
      }
      if (currentExpanded) currentExpanded.classList.remove('is-expanded');
      row.classList.add('is-expanded');
      currentExpanded = row;
    });
  });
}

let lenis = null;
/** Lenis 平滑滚动（2026-08-14 T-249 规避 GSAP：autoRaf 自驱，不再挂 gsap.ticker/ScrollTrigger） */
function bindLenis() {
  if (typeof Lenis === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  lenis = new Lenis({ autoRaf: true });
}

function bindTOC() {
  const tocItems = document.querySelectorAll('.ab-toc-dot-item');
  const tocNav = document.querySelector('.ab-toc-nav');
  const sections = document.querySelectorAll('.ab-page[data-toc-id]');
  if (!tocItems.length || !sections.length) return;

  tocItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const id = item.dataset.toc;
      const headerOffset = 64;
      const goTo = (target) => {
        if (lenis) {
          lenis.scrollTo(target, { offset: -headerOffset });
        } else {
          const top = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      };
      let target = document.getElementById(id);
      // 探索区懒渲染未完成时 #exploration 不存在：降级滚动到懒加载槽（槽顶即探索章节顶，渲染后位置不变）
      if (!target && id === 'exploration') {
        target = document.querySelector('#ab-lazy-exploration');
      }
      // 探索区未渲染且目标位于懒加载槽之后（dialogue/conclusion）：其位置按短布局计算会偏移约 4000px，
      // 先滚动到懒加载槽触发渲染，渲染完成后二次校准到真实位置（2026-08-12 修复；2026-08-14 T-249 无 ScrollTrigger.refresh，
      // 懒渲染插入后页面高度即更新，二次校准仍按 Lenis ResizeObserver 就绪后执行）
      const slotEl = document.querySelector('.ab-lazy-slot');
      const explorationRendered = !!document.querySelector('.ab-exploration-section');
      if (!explorationRendered && target && slotEl &&
          (slotEl.compareDocumentPosition(target) & Node.DOCUMENT_POSITION_FOLLOWING)) {
        lenis.scrollTo(slotEl, { offset: -headerOffset });
        const waitRender = () => {
          if (document.querySelector('.ab-exploration-section')) {
            // 等 Lenis 内部 ResizeObserver（250ms 防抖）更新 limit 后再二次跳转——
            // 渲染后立即 scrollTo 会被旧 limit（短布局 maxScroll）钳制，停在探索区中下部（2026-08-13 修复）
            setTimeout(() => {
              const t2 = document.getElementById(id);
              if (t2) goTo(t2);
            }, 280);
            return;
          }
          setTimeout(waitRender, 120);
        };
        setTimeout(waitRender, 160);
        return;
      }
      if (target) goTo(target);
    });
  });

  if (tocNav) {
    tocNav.addEventListener('mouseenter', () => tocNav.classList.add('is-hovered'));
    tocNav.addEventListener('mouseleave', () => tocNav.classList.remove('is-hovered'));
  }

  let currentId = null;
  const setActive = (id) => {
    if (id === currentId) return;
    currentId = id;
    tocItems.forEach(item => {
      item.classList.toggle('is-active', item.dataset.toc === id);
    });
  };

  let _tocObserver = null;
  // threshold:0 修复（2026-08-12 懒渲染复验发现）：原 threshold [0.15,0.4,0.6] 对高章节失效——
  // 探索章节高 2518px，观察带（15%~45% 视口）最大相交比 0.079 < 0.15，永不回调、TOC 不点亮。
  // 改为任意相交即回调，由 sort+setActive 取「观察带内最靠上章节」，语义等价且全章节通用。
  _tocObserver = new IntersectionObserver((entries) => {
    const visible = entries
      .filter(e => e.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (visible.length > 0) {
      setActive(visible[0].target.dataset.tocId);
    }
  }, { threshold: 0, rootMargin: '-15% 0px -55% 0px' });

  sections.forEach(s => _tocObserver.observe(s));

  setActive('hero');

  // 探索区懒渲染后补观察新 section（探索章节滚动高亮）
  window._tocObserveExploration = () => {
    if (!_tocObserver) return;
    const ex = document.querySelector('.ab-exploration-section');
    if (ex) _tocObserver.observe(ex);
  };
}

/** 工作流滚动协调器：镜组驱动·连续运动（2026-08-13 二轮重构）
 *  废弃「镜组层叠淡入淡出（幻灯片轮播）」；改为单一画布 + 连续插值——
 *  viewBox 固定（停留稳态），节点位置在镜组间 lerp（走进/走出视野），
 *  边连续淡入 + 起终点渐变（颜色补箭头方向）。滚动 scrub 连续驱动，可逆。
 *  【动/静自觉清单】（书记 2026-08-13 强调）
 *   静：视窗（viewBox 固定，不推近）
 *   静：卡片三态（data-state past/current/future，离散切换非连续）
 *   动：节点（位置镜组间 lerp + 入场/离场 opacity）
 *   动：边（path 重算 + 渐变方向跟随 + opacity 连续淡入淡出）
 *  【停顿节奏】阶梯映射：每镜组停留 75% 滚动行程（稳态停顿），25% 丝滑过渡 */
function bindExplorationScrollDriven() {
  const scenes = document.querySelectorAll('.ab-exploration-scene');
  if (!scenes.length) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp01 = (t) => Math.max(0, Math.min(1, t));
  const smooth = (t) => { const c = clamp01(t); return c * c * (3 - 2 * c); };

  // 节点在镜组间的位置插值 + 入场/离场淡入淡出
  const nodeStateAt = (traj, p) => {
    if (!traj || !traj.length) return { x: -100, y: -100, o: 0 };
    const first = traj[0].shot, last = traj[traj.length - 1].shot;
    const o = smooth((p - (first - 0.6)) / 0.8) * (1 - smooth((p - (last - 0.2)) / 0.8));
    let x = traj[0].x, y = traj[0].y;
    if (p > first && p < last) {
      for (let i = 0; i < traj.length - 1; i++) {
        if (p >= traj[i].shot && p <= traj[i + 1].shot) {
          const f = (p - traj[i].shot) / (traj[i + 1].shot - traj[i].shot);
          x = traj[i].x + (traj[i + 1].x - traj[i].x) * f;
          y = traj[i].y + (traj[i + 1].y - traj[i].y) * f;
          break;
        }
      }
    } else if (p >= last) {
      x = traj[traj.length - 1].x; y = traj[traj.length - 1].y;
    }
    return { x, y, o };
  };

  // 边在所属镜组附近描边生长 + 远离淡出
  const edgeStateAt = (def, p) => {
    let o = 0, grow = 0;
    for (const s of def.shots) {
      const g = smooth((p - (s - 0.7)) / 0.6);
      const f = 1 - smooth((p - (s + 0.3)) / 0.7);
      grow = Math.max(grow, g);
      o = Math.max(o, Math.min(g, f));
    }
    return { o, grow };
  };

  // 连续镜组位置：卡片顶部越过视口 60% 线，线性映射到 0..shotCount-1
  // 2026-08-14 性能：改用缓存文档坐标（stageTops），滚动帧零 getBoundingClientRect（layout thrash 主嫌疑）
  const continuousProgress = (stageTops, vh, scrollTop) => {
    if (!stageTops.length) return 0;
    const firstTop = stageTops[0];
    const lastTop = stageTops[stageTops.length - 1];
    const span = lastTop - firstTop || 1;
    return clamp01((vh * 0.6 - (firstTop - scrollTop)) / span) * (stageTops.length - 1);
  };

  // 阶梯映射：每个镜组停留 75% 滚动行程（稳态停顿，让观看者感知「这是一步阶段」），
  // 25% 丝滑过渡到下一个镜组（带缓动）——「丝滑动画 + 适当停顿」
  const PLATEAU = 0.75;
  const stepwise = (p) => {
    const step = Math.floor(p);
    const frac = p - step;
    if (frac <= PLATEAU) return step;
    const t = (frac - PLATEAU) / (1 - PLATEAU);
    return step + smooth(t);
  };

  const sceneData = [];
  scenes.forEach(scene => {
    const sceneDef = scene.dataset.scene === 'activity' ? ACTIVITY_SCENE : TASKFORCE_SCENE;
    const svg = scene.querySelector('.ab-scene-svg');
    const stages = scene.querySelectorAll('.ab-exploration-stage');
    if (!svg || !stages.length) return;

    // 节点轨迹：id -> [{shot, x, y}]
    const nodeTraj = new Map();
    sceneDef.shots.forEach((shot, si) => {
      shot.nodes.forEach(n => {
        if (!nodeTraj.has(n.id)) nodeTraj.set(n.id, []);
        nodeTraj.get(n.id).push({ shot: si, x: n.x, y: n.y });
      });
    });

    // 边（去重 + shot 归属）
    const edges = [];
    const edgeIdx = new Map();
    sceneDef.shots.forEach((shot, si) => {
      shot.edges.forEach(e => {
        const key = `${e.from}|${e.to}|${e.type}|${e.curve || 0}`;
        if (!edgeIdx.has(key)) {
          edgeIdx.set(key, edges.length);
          edges.push({ from: e.from, to: e.to, type: e.type, curve: e.curve || 0, shots: [si] });
        } else {
          edges[edgeIdx.get(key)].shots.push(si);
        }
      });
    });

    // DOM 引用
    const nodeEls = {};
    svg.querySelectorAll('.ab-node-svg').forEach(el => { nodeEls[el.dataset.id] = el; });
    const edgeEls = [];
    svg.querySelectorAll('.ab-edge').forEach(el => {
      const idx = parseInt(el.dataset.edge, 10);
      edgeEls.push({
        el,
        path: el.querySelector('.ab-edge-path'),
        arrow: el.querySelector('.ab-edge-arrow'),
        grad: svg.querySelector(`#ab-grad-${idx}`),
        def: edges[idx],
      });
    });

    sceneData.push({ scene, svg, stages, nodeTraj, nodeEls, edgeEls });
  });

  const renderFrame = (data, p) => {
    // 2026-08-14 T-248 性能：阈值跳过 + 缓存——位置移动 <0.5px 不写 transform；opacity 值未变不写 style；
    // 不可见边（opacity<0.02）跳过几何重算（只同步 opacity）
    data.nodeTraj.forEach((traj, id) => {
      const el = data.nodeEls[id];
      if (!el) return;
      const st = nodeStateAt(traj, p);
      const dx = Math.abs(st.x - (el._nx || -999));
      const dy = Math.abs(st.y - (el._ny || -999));
      if (dx > 0.5 || dy > 0.5) {
        el._nx = st.x; el._ny = st.y;
        el.setAttribute('transform', `translate(${st.x.toFixed(1)},${st.y.toFixed(1)})`);
      }
      const o = st.o < 0.02 ? '0' : st.o > 0.98 ? '1' : st.o.toFixed(2);
      if (el._no !== o) { el._no = o; el.style.opacity = o; }
    });

    // 边：path 重算 + 渐变方向跟随 + 透明度（阈值跳过 + 不可见边跳过几何重算）
    data.edgeEls.forEach(({ el, path, arrow, grad, def }) => {
      if (!def) return;
      const st = edgeStateAt(def, p);
      const o = st.o < 0.02 ? '0' : st.o > 0.98 ? '1' : st.o.toFixed(2);
      if (el._eo !== o) { el._eo = o; el.style.opacity = o; arrow.style.opacity = o; }
      if (st.o < 0.02) return; // 不可见边：只同步 opacity，跳过几何重算
      const fromPos = nodeStateAt(data.nodeTraj.get(def.from), p);
      const toPos = nodeStateAt(data.nodeTraj.get(def.to), p);
      const moved = Math.hypot(fromPos.x - (el._fx || -999), fromPos.y - (el._fy || -999),
                               toPos.x - (el._tx || -999), toPos.y - (el._ty || -999));
      if (moved > 0.5) {
        el._fx = fromPos.x; el._fy = fromPos.y; el._tx = toPos.x; el._ty = toPos.y;
        const ep = edgePath(fromPos, toPos, 70, 0.5, def.curve); // 2026-08-18 T-270 半径 52→70
        path.setAttribute('d', ep.d);
        if (grad) {
          grad.setAttribute('x1', fromPos.x.toFixed(1));
          grad.setAttribute('y1', fromPos.y.toFixed(1));
          grad.setAttribute('x2', toPos.x.toFixed(1));
          grad.setAttribute('y2', toPos.y.toFixed(1));
        }
        const angle = Math.atan2(ep.y2 - ep.y1, ep.x2 - ep.x1) * 180 / Math.PI;
        arrow.setAttribute('transform', `translate(${ep.x2},${ep.y2}) rotate(${angle})`);
      }
    });

    // 卡片三态
    const currentShot = Math.round(p);
    data.stages.forEach((s, i) => {
      if (i < currentShot) s.setAttribute('data-state', 'past');
      else if (i === currentShot) s.setAttribute('data-state', 'current');
      else s.setAttribute('data-state', 'future');
    });
  };

  // 初始渲染（p=0）
  sceneData.forEach(data => renderFrame(data, 0));

  if (prefersReduced) {
    // reduced-motion：静态全显，不监听滚动
    sceneData.forEach(data => {
      data.nodeTraj.forEach((traj, id) => { const el = data.nodeEls[id]; if (el) el.style.opacity = '1'; });
      data.edgeEls.forEach(({ el, path }) => { el.style.opacity = '1'; path.style.strokeDashoffset = '0'; });
    });
    return;
  }

  // 几何缓存（2026-08-14 性能：滚动帧零 getBoundingClientRect——layout thrash 主嫌疑；
  // 布局稳定后一次性读文档坐标，resize 时刷新。懒渲染场景 bind 时元素已就绪）
  let geomCache = [];
  const cacheGeom = () => {
    geomCache = sceneData.map(data => {
      const r = data.scene.getBoundingClientRect();
      return {
        top: r.top + window.scrollY,
        height: data.scene.offsetHeight,
        stageTops: Array.from(data.stages).map(s => s.getBoundingClientRect().top + window.scrollY),
      };
    });
  };
  cacheGeom();

  let ticking = false;
  const update = () => {
    ticking = false;
    const scrollTop = window.scrollY;
    const vh = window.innerHeight;

    sceneData.forEach((data, i) => {
      const g = geomCache[i];
      if (!g) return;
      if (scrollTop > g.top + g.height + vh || scrollTop + vh < g.top - vh) return;

      const p = stepwise(continuousProgress(g.stageTops, vh, scrollTop));
      // p 不变跳过全量重算（plateau 75% 停留期间零写入，2026-08-14 性能）
      if (p !== data.lastP) {
        data.lastP = p;
        renderFrame(data, p);
      }
    });
  };

  const onScroll = () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { cacheGeom(); if (!ticking) update(); });
}

// ════════════════════════════════════════════════════════════════
//  电影化滚动叙事（2026-08-04 书记三轮裁决后重构）
//  ① 滚动驱动的场景切换（Hero 退场 + Dialogue/Exploration 章节点亮）
//  ② 章节镜头交接 + 叠层转场（旧场景后拉 → 新场景驶入，演示式逐步揭示）
//  ③ 终章温和落位（大字收束）
//  ════════════════════════════════════════════════════════════════

/**
 * 生成式微光粒子背景（algorithmic-art 风格）
 * 党建红 #CE1126 / 党徽金 #FFD700 / 微银过渡色；seeded random 恒重现；
 * 低密度慢速上升、不抢文字；reduced-motion 下不启动（CSS 亦隐藏画布）
 */
function initParticleCanvas(canvas, opts = {}) {
  if (!canvas) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // mulberry32 seeded RNG —— 同一 seed 产出同一片粒子场
  let seed = (opts.seed || 20260804) >>> 0;
  const rand = () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const PALETTE = [
    { r: 206, g: 17, b: 38 },   // 党建红
    { r: 255, g: 215, b: 0 },   // 党徽金
    { r: 148, g: 163, b: 184 }, // 微银过渡色
  ];
  const DENSITY = 24000; // px²/粒子 —— 低密度
  const SPEED = 0.1;     // 慢速流动

  let W = 0, H = 0;
  let particles = [];
  let raf = null;
  let running = false;

  const spawn = (anywhere) => {
    const c = PALETTE[Math.floor(rand() * PALETTE.length)];
    return {
      x: anywhere ? rand() * W : rand() * W,
      y: anywhere ? rand() * H : H + 10,
      r: 0.6 + rand() * 1.8,
      vx: (rand() - 0.5) * SPEED * 1.2,
      vy: -(SPEED * (0.5 + rand() * 1.6)),
      alpha: 0.1 + rand() * 0.26,
      pulse: rand() * Math.PI * 2,
      c,
    };
  };

  const resize = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.max(8, Math.round((W * H) / DENSITY));
    particles = Array.from({ length: count }, () => spawn(true));
  };

  const tick = () => {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.pulse += 0.012;
      if (p.y < -12) Object.assign(p, spawn(false));
      if (p.x < -12) p.x = W + 12;
      if (p.x > W + 12) p.x = -12;
      const a = p.alpha * (0.72 + 0.28 * Math.sin(p.pulse));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.c.r}, ${p.c.g}, ${p.c.b}, ${a.toFixed(3)})`;
      ctx.fill();
    }
    raf = requestAnimationFrame(tick);
  };

  const start = () => { if (!running) { running = true; raf = requestAnimationFrame(tick); } };
  const stop = () => { running = false; if (raf) { cancelAnimationFrame(raf); raf = null; } };

  resize();
  start();

  // 离屏/切后台暂停，节约资源
  const io = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) start(); else stop();
  }, { threshold: 0.01 });
  io.observe(canvas);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  window.addEventListener('resize', resize);
}

/** Dialogue 四阶段滚动驱动（2026-08-13 批判性重构：去轮毂 + 公转文字正立 + 非 90° 四相位）
 *  滚动 progress → 转盘角 θ（顺时针一圈，四卡各经历一次日出日落，首尾闭合）
 *  2026-08-14 书记设计指导落地：
 *    - 地平线 = sticky 视窗最下端（不渲染视觉元素，卡片落到视窗底边即 opacity→0 消失）
 *    - 进入/退出旋转：滚动进入章节时卡片线性旋转着进入（θ -45°→0°），sticky 固定瞬间卡①恰在正午；
 *      退出时旋转着离开（θ 0°→+45°）
 *    - 覆盖关系/数量/透明度：同时可见 3 张——正午 1 张 opacity 1 z 最高、左右侧卡 ≈0.5 半透明、地下 opacity 0
 *  每张卡：位置沿环公转（translate x,y），卡片本身不旋转 → 文字始终正立；
 *  亮度由「角度高度 angleH」决定（b = angleH^1.5——正午 1 全亮、侧卡 ≈0.35 半透明、地下 0 完全隐去），
 *  地下判定 angleH<0.35；「3 太阳」模型——视窗内恒 3 张可见（正午+左右）+ 1 张地下隐去
 *  亮度渲染 = opacity + scale + border-color + zIndex（filter 为最贵属性已移除）
 *  【动/静自觉清单】（书记 2026-08-13 强调）
 *   静：视窗（.ab-dialogue-flow/stage 容器尺寸，固定不缩放不平移；sticky 期间位置固定在 stickyTop）
 *   静：卡片文字（不 rotate，文字始终正立）
 *   静：地平线（= 视窗底边，无视觉元素，界定卡片消失线）
 *   动：卡片（公转 θ + elevation 驱动 opacity/scale/border/zIndex）
 *   动：滚动行程（.ab-dialogue-spacer 垫片——仅提供行程，无视觉元素，随页面滚动）
 *  【稳态清单】
 *   稳态：每阶段正午停留（PLATEAU 0.7，观看者感知「这是一步阶段」）+ 卡①正午锚点（sticky 固定瞬间）
 *   非稳态：进入段/退出段线性旋转（流畅过渡，无阶梯停顿） */
function bindDialogueScrollActivation() {
  const section = document.querySelector('.ab-dialogue-section');
  const cards = section ? section.querySelectorAll('.ab-dialogue-card') : [];
  if (!section || !cards.length) return;

  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const smooth = (t) => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;
  const DEG = Math.PI / 180;
  // 阶梯停顿（书记 2026-08-13「静 + 卡片正午停留」）：每张卡转到正午（progress=i/4）停留，其余平滑过渡
  // 2026-08-14 书记「动画不丝滑」：PLATEAU 0.75→0.70——停留仍可感知、过渡更长更柔（丝滑）
  // 2026-08-19 T-272 书记「正常转动太快」：PLATEAU 0.70→0.55——转动段 30%→45%，90° 分摊更多行程，转速约降 1/3
  const PLATEAU = 0.55;
  // 2026-08-19 T-272 三段角速度统一基准：正常转动段每 90° 分摊 (1-PLATEAU)/4 单位 progress，
  //   进入/退出段按同一速率（ROT_RATE = 90°/((1-PLATEAU)/4) ≈ 800°/progress 单位）旋转，观感连续不突兀
  const ROT_RATE = 90 / ((1 - PLATEAU) / 4);
  const stepwise = (p) => {
    const x = p * 4;
    const step = Math.floor(x);
    const frac = x - step;
    if (frac <= PLATEAU) return step / 4;
    const t = (frac - PLATEAU) / (1 - PLATEAU);
    return (step + smooth(t)) / 4;
  };

  const apply = (progress) => {
    const flow = section.querySelector('.ab-dialogue-flow');
    // 2026-08-14 章头入视窗重构：环形舞台从 flow 分离为 .ab-dialogue-stage（方形），S 取舞台宽
    const stage = flow ? flow.querySelector('.ab-dialogue-stage') : null;
    const S = stage ? stage.clientWidth : 600;
    // ⚠️ querySelectorAll 返回 NodeList（无 .map），须 Array.from 转数组（2026-08-14 复验抓到的致命 bug）
    const maxCardH = cards.length ? Math.max(...Array.from(cards, c => c.offsetHeight)) : 240;
    // 2026-08-14 T-247 环半径放宽（书记「半径非常充裕，不要有压力」）：
    //   正午停留四卡 90° 间隔、相邻中心距 = 1.414R ≥ 卡宽 → 互不重叠；
    //   R 允许正午卡超出 stage 顶进入 head 与 stage 间留白区（flow gap 56px 容纳「升起」感）
    const cardW = 192; // 与 CSS .ab-dialogue-card width 一致（T-248 卡略窄）
    // 2026-08-14 T-249 环内切舞台 + 空间给足：R 上限 0.5S、不溢出余量 121（gap 同步 121，正午卡升起恰到 head 底不遮副标题 p）
    // 2026-08-18 T-271 行百里者半九十转动半径加大：R 上限 0.5S → 0.56S（环更贴近舞台边缘，公转幅度更大）
    const R = Math.min(S * 0.56, Math.max(S / 2 - maxCardH / 2 + 121, cardW / 1.414));
    // 2026-08-18 T-271 椭圆轨迹（书记「长轴稍微长一点」）：长轴水平 rx = 1.2R（页面宽度充裕，横向扫过范围更舒展），
    //   短轴垂直 ry = R（正午升起逻辑不变、不遮章头）；相邻 90° 卡中心距 = R*√(1.2²+1²) = R*1.562 ≥ 卡宽 → 互不重叠
    const rx = R * 1.2;
    const ry = R;
    // 四相位（间隔 90°，第 1 张卡初始在正午 -90°）：正午(顶)·日出(左)·地下(底)·日落(右)
    // 屏幕坐标 y 向下，正角 = 顺时针；θ 递增即顺时针公转
    const baseAngle = [-90, 180, 90, 0];
    // 2026-08-14 进入/退出旋转（书记：旋转着进出 + sticky 固定瞬间卡①正午）：
    //   progress<0 → 进入段线性旋转（θ -45°→0°）；sticky 固定瞬间 progress=0 → θ=0 → 卡①正午
    //   0≤progress≤1 → 阶梯公转（每阶段正午停留）
    //   progress>1 → 退出段线性旋转（θ 0°→+45°）
    // 2026-08-19 T-272 三段角速度统一：进入/退出段 θ 按 ROT_RATE（与正常转动同速率），滚动观感连续
    const theta = progress <= 0 ? progress * ROT_RATE
      : progress >= 1 ? 360 + (progress - 1) * ROT_RATE
      : stepwise(progress) * 360;

    cards.forEach((card, i) => {
      const rad = (baseAngle[i] + theta) * DEG;
      const x = rx * Math.cos(rad);
      const y = ry * Math.sin(rad);
      const angleH = (1 - Math.sin(rad)) / 2;   // 角度高度：正午=1、侧卡=0.5、底部=0（与 R/S 无关，矮视口 R 压缩时鲁棒）

      // 定位：卡片中心对齐圆心（translate -50% -50%）+ 偏移到环上 (x,y)；不 rotate → 文字正立
      if (angleH < 0.35) {
        // 地下（环底部扇区）：彻底消失（书记裁决「消失的卡片也就消失了」）
        card.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(0.92)`;
        card.style.opacity = '0';
        card.style.zIndex = '0';
        card.style.borderColor = '';
        card.dataset.state = 'future';
      } else {
        // 2026-08-14 T-247 透明度 b = angleH^1.5（3 太阳模型，与 R/S 无关）：
        //   正午 1 全亮、侧卡 0.5^1.5≈0.354 半透明、地下角度 <0.35 → 0 完全隐去；
        //   zIndex 随亮度分层（正午卡最上、侧卡次之——正确的层级覆盖）
        const b = Math.pow(angleH, 1.5);
        const scale = lerp(0.92, 1.05, b);
        card.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${scale.toFixed(3)})`;
        card.style.opacity = String(b);
        card.style.zIndex = String(Math.round(b * 10));
        if (b > 0.6) {
          card.style.borderColor = `rgba(206, 17, 38, ${(((b - 0.6) / 0.4) * 0.4).toFixed(3)})`;
          card.dataset.state = 'current';
        } else {
          card.style.borderColor = '';
          card.dataset.state = 'future';
        }
      }
    });
  };

  // 2026-08-13 sticky 固定视窗（书记裁决）：flow 变 sticky——滚动时视窗固定，卡片在内公转 + 正午停留。
  // progress 计算（2026-08-14 二轮根治「完全不转 + 起点跳变」，浏览器实测定位根因）：
  //   不能用 flow 顶相对视口（sticky 期间它恒 = stickyTop，分子恒 0 → progress 恒 0）。
  //   改为基于 parent 底相对视口 + 静态章头高度：
  //     - headerH：静态章头高度（eyebrow/title/sub）。⚠️ Chrome 中 sticky 卡住期间 flow.offsetTop
  //       返回的是视觉偏移（随滚动增长 559→1102），逐帧重读会让 startBottom ≡ parentRect.bottom、
  //       traveled ≡ 0 → progress 恒 0 → 卡片完全不转（2026-08-14 真机验证实锤）。
  //       修复：仅当 flow 未被卡住（顶 > stickyTop）或 resize 时才刷新 headerH（此时 offsetTop=静态布局值）。
  //     - travelTotal = parentH - headerH - flowH：flow 顶从 stickyTop 滚到 parent 底推出的真实行程
  //     - startBottom = stickyTop - headerH + parentH：sticky 刚卡住瞬间的 parent 底
  //     - traveled = startBottom - parentRect.bottom；progress = clamp01(traveled / travelTotal)
  //   全程线性，滚动任意路径（lenis/原生/跳转）都按真实几何计算，可逆。
  let headerH = 0;
  const refreshHeaderH = () => {
    const flow = section.querySelector('.ab-dialogue-flow');
    if (flow) headerH = flow.offsetTop;
  };
  refreshHeaderH();
  const updateDialogue = () => {
    const flow = section.querySelector('.ab-dialogue-flow');
    if (!flow) return;
    const parent = flow.parentElement;
    const vh = window.innerHeight || 1;
    const stickyTop = Math.max(96, Math.min(140, vh * 0.12)); // 与 CSS top 一致
    const flowTop = flow.getBoundingClientRect().top;
    // flow 未被 sticky 卡住时 offsetTop = 静态布局位置 → 顺带刷新 headerH（字体加载等布局变化自愈）
    if (flowTop > stickyTop + 1) refreshHeaderH();
    const parentRect = parent.getBoundingClientRect();
    const flowH = flow.offsetHeight;
    const parentH = parent.offsetHeight;
    const travelTotal = parentH - headerH - flowH; // sticky 真实行程
    if (travelTotal <= 0) return;
    const startBottom = stickyTop - headerH + parentH; // sticky 开始时 parent 底
    const traveled = startBottom - parentRect.bottom;
    let progress;
    if (flowTop > stickyTop) {
      // 2026-08-14 进入段（书记「旋转着进入」）：flow 顶从视口底部滚到 stickyTop → progress →0，
      // 卡片线性旋转进入；sticky 固定瞬间 progress=0 → θ=0 → 卡①恰在正午（锚定）
      // 2026-08-19 T-272 角速度统一：45° 旋转对应 (45/ROT_RATE) 单位 progress（原 -0.125 过慢）
      progress = clamp01((flowTop - stickyTop) / Math.max(1, vh - stickyTop)) * -(45 / ROT_RATE);
    } else {
      progress = clamp01(traveled / travelTotal);
      if (progress >= 1) {
        // 2026-08-14 退出段（书记「旋转着离开」）：flow 被推出后继续线性旋转 45°（progress 1→1+45/ROT_RATE）
        const over = stickyTop + flowH - parentRect.bottom;
        progress = 1 + (over > 0 ? clamp01(over / Math.max(1, vh)) * (45 / ROT_RATE) : 0);
      }
    }
    apply(progress);
  };
  // 双保险 + rAF 节流（2026-08-14 性能：lenis.on 与 window scroll 同帧触发两次 → 每帧仅执行一次 apply）
  let rafPending = false;
  const scheduleUpdate = () => {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => { rafPending = false; updateDialogue(); });
  };
  if (lenis) lenis.on('scroll', scheduleUpdate);
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', () => { refreshHeaderH(); updateDialogue(); });

  // 初始态：按当前位置计算（页面顶部时 = 0，θ=0 时日出在右上、日中在顶、日落在左上、地下在正下）
  updateDialogue();
}

// ════════════════════════════════════════════════════════════════
//  启动
// ════════════════════════════════════════════════════════════════

// 探索区懒渲染（减负：最大单章 28KB HTML + 2 个 SVG 网络 DOM 延迟到滚动接近时渲染，
// 首屏主线程只渲染 hero→review 六章；探索动画绑定函数天然可重入——首次无元素时无害返回）
function initLazySlots() {
  const slots = document.querySelectorAll('.ab-lazy-slot');
  if (!slots.length) return;

  const mountExploration = (slot) => {
    // 2026-08-14 T-248 性能：两场景分片插入，长任务拆半；绑定与 refresh 移到全部就绪后
    const scenesEl = document.createElement('div');
    scenesEl.className = 'ab-exploration-scenes';
    // 章节框架（页码/章头/sub 等，HTML 量小非长任务源）一次插入并承载场景容器，
    // 保持原 renderExploration 的 section 结构等价（data-toc-id 高亮/页码/章节头不能丢）
    slot.insertAdjacentHTML('beforeend', `
      <section id="exploration" class="ab-page ab-network-section ab-exploration-section" data-toc-id="exploration">
        <span class="ab-page-no">05</span>
        <span class="ab-page-runner">第五章 · 工作流</span>
        <div class="ab-chapter">
          <div class="ab-chapter-eyebrow">工作流</div>
          <h2 class="ab-chapter-title">工作流——谁在什么时候该去找谁？</h2>
          <p class="ab-chapter-sub">有先例的，按工作流走<br/>没先例的，靠探索沉淀</p>
        </div>
      </section>
    `);
    slot.querySelector('.ab-chapter').appendChild(scenesEl);
    slot.querySelector('.ab-chapter').insertAdjacentHTML('beforeend', `
      <p class="ab-exploration-coda">
        程序在所有人之上，所以扁平；书记因更大的责任嵌入更深，所以集中——扁平与集中，统一于程序。
      </p>
    `);
    scenesEl.insertAdjacentHTML('beforeend', safe('Exploration1', () => renderSceneFragment(ACTIVITY_SCENE)));
    requestAnimationFrame(() => {
      scenesEl.insertAdjacentHTML('beforeend', safe('Exploration2', () => renderSceneFragment(TASKFORCE_SCENE)));
      // 探索区动画绑定（启动时元素缺失已无害返回，此处真实生效）
      bindExplorationScrollDriven();
      // TOC 补观察探索章节（滚动高亮）
      if (window._tocObserveExploration) window._tocObserveExploration();
    });
  };

  // 2026-08-14 修复「章节切换卡壳」：懒渲染由「滚动接近时触发」改为「空闲预渲染」优先——
  // 原实现滚动到探索区边界才插入约 4000px HTML + ScrollTrigger.refresh（实测一次性 3.3s 长任务，
  // 章节切换明显卡壳）。requestIdleCallback 在页面加载后主线程空闲时后台渲染，滚动到探索区时已就绪；
  // IntersectionObserver 降级为兜底（idle 未执行且用户已滚动接近时触发）
  let mounted = false;
  const mountAll = () => {
    if (mounted) return;
    mounted = true;
    slots.forEach(mountExploration);
  };

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(mountAll, { timeout: 3000 });
  } else {
    slots.forEach(mountExploration);
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      mountAll();
    });
  }, { rootMargin: '600px 0px' }); // 兜底：idle 未执行但用户已滚动接近
  slots.forEach(slot => io.observe(slot));
}

renderAboutContent();
bindTimelineToggle();
bindLenis();
bindTOC();
bindExplorationScrollDriven();
bindDialogueScrollActivation();
initLazySlots();
// 粒子背景仅保留 hero（终章以大字收束为主，减负单 rAF 循环）
const heroCanvas = document.querySelector('.ab-hero-section .ab-particle-canvas');
if (heroCanvas) initParticleCanvas(heroCanvas);
