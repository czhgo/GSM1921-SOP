// role: [工程师]+[AI]
// entries/help-entry.js — 帮助页入口 v13（讲我们支部的故事）
// 核心理念：从"关系网络"到"支部的故事"——以党员成长为主线，讲清考察、工作哲学、探索与对话
// 设计风格：苹果风（纯白 + 大留白 + 大字体 + 微妙动画）
// 签名元素：【管理事，服务人】收束点题 + Exploration v2 像素人漫步交互
// v13 变更：Exploration Canvas 像素人动画升级——6帧行走循环（替换 pogo stick 弹跳）+ 扩大活动范围（wanderZone rx:0.3-0.4）+ 像素风对话气泡系统（10条专门台词）+ 删除镜头推拉（固定视角，保持像素游戏一贯做法）。美学沉淀到 DESIGN_SYSTEM.md §5.4。
// v15 变更：视觉焦点分层对话系统——基于游戏 UI 设计通用原则（视觉焦点引导+名称常驻+方向性视觉引导+对话气泡明确对应+信息三层分层+故事过渡帧）。解决 v14 三大问题：字幕信息传递差、两故事衔接突兀、说话人-被说话人无视觉交互。新增：currentBeat 焦点高亮（from/to 放大1.4×+光环+全不透明，其他降不透明度0.6）、方向箭头（from→to 虚线+箭头头部，角色色）、对话气泡角色色边框、顶部场景标题层（活动故事/专班故事）、转场过渡叙事（beat3→4 外出参访途中 + beat6→7 活动结束→专班启动）。
// v14 变更（v13 第二阶段）：多场景架构——室内4列隔间（会议室/教室/宿舍/图书馆）+ 室外红色教育基地 + 公交车转场（像素马赛克过渡）+ texting 短信气泡（室外→室内）+ beat4-6 外出参访 + beat7-10 隔间分散。
// v12 变更：Exploration Canvas v2 重构——全屏沉浸 + RPG 风像素人（12×20）+ 自由漫步 AI + 镜头推拉 + 脚印粒子 + 物件传递 + 10 beat 编排 + 滚动控制 + 底部字幕。删除旧网络拓扑图（ACTIVITY_NETWORK/TASKFORCE_NETWORK/EXPLORATION_STAGES/renderNetworkSVG/bindNetworkHover/bindExplorationOrchestration/setupSceneCanvas/calcEdgeCurvePoints/drawCanvasConnection/drawArrowHead）。Exploration 作为独立 section 不再嵌套 TwoWorks
// v10 变更：Exploration SVG 活动关系网络重构为 HTML div 节点 + SVG 连线 + 编排式 GSAP timeline（导演调度）替代 scrub 景深动画
// v9 变更：Development 时间轴重构为居中单列卡片布局（typography-first）+ 删除三列 grid/辅助线/交替布局 + GSAP 入场动画替代 scrub + 卡片点击展开详情（GSAP 动画）+ 决策节点用左侧色条区分（非金色光晕）
// v8 变更：GSAP ScrollTrigger 全接管（移除 IntersectionObserver + is-revealed）+ Hero 金色装饰线 + TOC 始终可见 label + Development 阶段交替双列布局 + Dialogue 竖向四步 + bindPageAnimations 统一动画入口 + Exploration 景深参数调优（0.6/0.92/0.7 + filter）
// v7 变更：Hero 标题改为成长路径 + Cognition 重构为组织性辩证法（个体→组织/组织→个体/个体→组织）+ Development 副标题精简 + 移除"三会决策节点"T3 表达 + 新增 Conclusion 收束 section（管理事，服务人）
// v6 变更：Section 重组（8→7）+ 13 节点横向时间轴（7 决策节点金色光晕）+ Exploration GSAP scrub 动画（替代 v5.2）+ T3 编程行话/自造隐喻清除
// v4 变更：去党建vs党务对比/考勤/思想汇报/角色独立section；新增考察积极分子/核心口号/两种工作/探索工作/行百里者半九十

import { renderSidebar } from '../components/sidebar.js';
import { renderHeader } from '../components/header.js';
import { getBasePath } from '../core/utils.js';
import { icon } from '../core/icons.js';

// ── 公开访问：不检查登录 ──
renderSidebar('help');
renderHeader('help');

// ════════════════════════════════════════════════════════════════
//  数据定义
// ════════════════════════════════════════════════════════════════

// 考察积极分子三维度（党建贡献高亮——特别突出原创性贡献）
const REVIEW_DIMENSIONS = [
  {
    id: 'party-class',
    name: '党课学习',
    tag: '理论修养的根基',
    desc: '系统学习党的理论、路线、方针、政策，是积极分子成长的思想基础。',
    highlight: false,
  },
  {
    id: 'contribution',
    name: '党建贡献',
    tag: '特别突出原创性的贡献',
    desc: '在活动策划、专班攻坚中发挥创造力，做出可被识别的原创性工作——这是考察的核心维度。',
    highlight: true,
  },
  {
    id: 'evaluation',
    name: '综合评价',
    tag: '群众基础与日常表现',
    desc: '群众口碑、日常表现、责任担当，构成对积极分子的全面画像。',
    highlight: false,
  },
];

// 两种工作（成熟 vs 探索）——侧重探索工作（发挥所有人智慧含积极分子）
const TWO_WORKS = [
  {
    id: 'mature',
    label: '成熟工作',
    tag: '接续发力',
    desc: '在前人基础上可以继续推进的工作——有规范的常规事务',
    examples: ['组织生活', '材料流转', '会务保障'],
    features: ['有规范', '有模板', '有前例'],
    tone: 'mature',
  },
  {
    id: 'explore',
    label: '探索工作',
    tag: '试错创造',
    desc: '需要发挥创造力、探索新可能——人人皆可贡献，包括积极分子',
    examples: ['活动策划', '专班攻坚'],
    features: ['有边界', '要对话', '要改进', '人人参与'],
    tone: 'explore',
  },
];

// ════════════════════════════════════════════════════════════════
//  Exploration v2 数据定义（角色 + Beat 编排）
// ════════════════════════════════════════════════════════════════

// 角色定义（合并活动+专班，角色基数：6 单人 + 深度 2 + 普通 3）
// wanderZone：每个角色在画布上的漫步区域（按比例 0~1）——v13 扩大范围（rx:0.3-0.4, ry:0.22）
const CHARACTERS = [
  { id: 'secretary',  name: '党支书',     cloth: '#B91C1C', hair: '#1E293B', pants: '#1E293B', count: 1, wanderZone: { cx: 0.5, cy: 0.2, rx: 0.35, ry: 0.22 } },
  { id: 'leader',     name: '党小组组长', cloth: '#22C55E', hair: '#1E293B', pants: '#374151', count: 1, wanderZone: { cx: 0.2, cy: 0.35, rx: 0.35, ry: 0.22 } },
  { id: 'organizer',  name: '组织者',     cloth: '#7DD3FC', hair: '#78350F', pants: '#374151', count: 1, wanderZone: { cx: 0.5, cy: 0.5, rx: 0.4, ry: 0.25 } },
  { id: 'prop',       name: '宣传委员',   cloth: '#2563EB', hair: '#1E293B', pants: '#1E293B', count: 1, wanderZone: { cx: 0.8, cy: 0.35, rx: 0.3, ry: 0.22 } },
  { id: 'disc',       name: '纪检委员',   cloth: '#C2410C', hair: '#1E293B', pants: '#374151', count: 1, wanderZone: { cx: 0.8, cy: 0.55, rx: 0.3, ry: 0.22 } },
  { id: 'org',        name: '组织委员',   cloth: '#0EA5E9', hair: '#1E293B', pants: '#1E293B', count: 1, wanderZone: { cx: 0.2, cy: 0.75, rx: 0.3, ry: 0.22 } },
  { id: 'deep',       name: '深度参与者', cloth: '#6366F1', hair: '#92400E', pants: '#374151', count: 2, wanderZone: { cx: 0.4, cy: 0.75, rx: 0.35, ry: 0.22 } },
  { id: 'normal',     name: '普通参与者', cloth: '#6B7280', hair: '#525252', pants: '#4B5563', count: 3, wanderZone: { cx: 0.6, cy: 0.8, rx: 0.35, ry: 0.22 } },
];

// 通用配色
const SKIN_COLOR = '#FCD5B5';
const SHOE_COLOR = '#451A03';
const EYE_COLOR = '#1E293B';

// Beat 编排（10 beats + 2 转场，活动 6 + 专班 4）
// type: 'visit'=角色互访 / 'object'=物件传递 / 'mixed'=同时互访+物件 / 'texting'=室外→室内短信
// scene: 'indoor-meeting'=会议室 / 'indoor-classroom'=教室 / 'indoor-library'=图书馆 / 'outdoor'=红色教育基地
// extraFrom/extraTo/extraObject: 同 beat 中次要的交互
// dialogue: 面对面对话气泡台词 / texting: 室外→室内短信气泡台词（v13 第二阶段新增）
// 转场：beat3→4（12-16s 公交车 indoor→outdoor）/ beat6→7（28-32s 公交车 outdoor→indoor）
const BEATS = [
  // 活动故事·室内策划（会议室）
  { time: 0,  duration: 4, type: 'visit',   from: 'leader',    to: 'organizer', subtitle: '党小组组长赋权组织者', object: null, scene: 'indoor-meeting', dialogue: { from: '这次活动你来组织', to: '收到，我来负责' } },
  { time: 4,  duration: 4, type: 'visit',   from: 'organizer', to: 'secretary', subtitle: '组织者向支书报备·支书审批', object: null, scene: 'indoor-meeting', dialogue: { from: '书记，活动方案报备', to: '方案通过，注意细节' } },
  { time: 8,  duration: 4, type: 'visit',   from: 'organizer', to: 'deep',      subtitle: '组织者向深度参与者分工', object: null, scene: 'indoor-meeting', dialogue: { from: '你负责现场协调', to: '好的，我来' } },
  // [12-16s: 公交车转场 indoor→outdoor] 外出角色：organizer/normal/deep
  // 活动故事·室外参访（红色教育基地）
  { time: 16, duration: 4, type: 'visit',   from: 'organizer', to: 'normal',    subtitle: '现场通知·带动参与', object: null, scene: 'outdoor', extraFrom: 'deep', extraTo: 'normal', dialogue: { from: '大家注意集合', to: '收到' } },
  { time: 20, duration: 4, type: 'texting', from: 'organizer', to: 'disc',      subtitle: '室外→室内：提交考勤', object: null, scene: 'outdoor', texting: { from: '考勤表发你了', to: '收到，已统计' } },
  { time: 24, duration: 4, type: 'texting', from: 'organizer', to: 'org',       subtitle: '室外→室内：考察建档', object: null, scene: 'outdoor', texting: { from: '考察材料同步', to: '已建档' } },
  // [28-32s: 公交车转场 outdoor→indoor] 外出角色返回室内
  // 专班故事·室内隔间分散
  { time: 32, duration: 4, type: 'visit',   from: 'leader',    to: 'org',       subtitle: '发起人请求招募', object: null, scene: 'indoor-meeting', dialogue: { from: '专班需要招募人手', to: '我来安排招募' } },
  { time: 36, duration: 4, type: 'mixed',   from: 'org',       to: 'organizer', subtitle: '招募赋权·业务赋权', object: 'directive', scene: 'indoor-library', extraFrom: 'leader', extraTo: 'deep', extraObject: 'directive', dialogue: { from: '招募授权给你', to: '收到' } },
  { time: 40, duration: 4, type: 'visit',   from: 'organizer', to: 'deep',      subtitle: '协调执行', object: null, scene: 'indoor-classroom', dialogue: { from: '执行进度怎么样', to: '按计划推进' } },
  { time: 44, duration: 4, type: 'object',  from: 'organizer', to: 'leader',    subtitle: '交付成果', object: 'package', scene: 'indoor-meeting', dialogue: { from: '专班成果交付', to: '辛苦了' } },
];

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
    desc: '不是等做完了才反馈——过程中就要对话，遇到偏差及时调整，避免事倍功半。',
  },
  {
    no: '03',
    phase: '工作之后',
    question: '如何在实践中改进？',
    answer: '和组织对话',
    desc: '活动不是做了就行。完成后必须和组织对话，复盘得失——行百里者半九十。',
  },
  {
    no: '04',
    phase: '下一次活动',
    question: '经验如何传承？',
    answer: '从这次到下一次',
    desc: '从一次活动/专班到下一次，同志与组织形成持续的对话关系——上次的经验成为下次的起点，在实践中不断改进工作内容与模式。',
  },
];

// 发展党员 13 关键时间节点（依据《中国共产党发展党员工作细则（2026年）》T1 原文）
// isDecisionNode: 关键决策节点（含党支部委员会/党支部党员大会/上级党委），用金色光晕环标记
// article: 条号（T1 原文出处）
const DEVELOPMENT_TIMELINE = [
  // 阶段 1：入党申请人 → 入党积极分子
  { no: 1,  title: '递交入党申请书',     time: '年满十八岁',     decisionMaker: '本人自愿',            decisionDetail: '入党申请人表达意愿',                       article: '§5',  isDecisionNode: false, stage: 'applicant', stickyNote: null },
  { no: 2,  title: '党组织派人谈话',     time: '一个月内',       decisionMaker: '党组织派人',           decisionDetail: '了解基本情况，介绍党的基本知识',           article: '§7',  isDecisionNode: false, stage: 'applicant', stickyNote: null },
  { no: 3,  title: '确定入党积极分子',   time: '—',              decisionMaker: '党支部委员会会议研究决定', decisionDetail: '在党员推荐、群团组织推优人选中确定',   article: '§8',  isDecisionNode: true,  stage: 'activist', stickyNote: null },
  { no: 4,  title: '报上级党委备案',     time: '—',              decisionMaker: '上级党委备案',   decisionDetail: '备案入党积极分子名单',                     article: '§8',  isDecisionNode: true,  stage: 'activist', stickyNote: null },
  { no: 5,  title: '指定培养联系人 + 培养考察', time: '一年以上', decisionMaker: '党支部每半年考察一次', decisionDetail: '培养联系人指导培养；党支部持续考察',     article: '§9/§11', isDecisionNode: false, stage: 'activist', stickyNote: '一年以上培养考察期' },
  // 阶段 2：入党积极分子 → 发展对象
  { no: 6,  title: '确定发展对象（公示）', time: '公示五个工作日', decisionMaker: '党支部委员会会议研究讨论并报上级党委同意', decisionDetail: '在听取党小组、培养联系人、党员和群众意见基础上确定', article: '§13', isDecisionNode: true, stage: 'prospect', stickyNote: null },
  { no: 7,  title: '政治审查',           time: '—',              decisionMaker: '党组织对发展对象进行政治审查',     decisionDetail: '深入了解入党动机、政治素质和现实表现',     article: '§16', isDecisionNode: false, stage: 'prospect', stickyNote: null },
  { no: 8,  title: '短期集中培训',       time: '一般不少于三天或者不少于二十四个学时', decisionMaker: '基层党委或县级党委组织部门', decisionDetail: '培训合格方可发展入党', article: '§17', isDecisionNode: false, stage: 'prospect', stickyNote: null },
  // 阶段 3：发展对象 → 预备党员
  { no: 9,  title: '党支部委员会审查 + 上级党委预审', time: '—', decisionMaker: '党支部委员会集体讨论 + 基层党委预审', decisionDetail: '审查合格后发放《中国共产党入党志愿书》', article: '§18', isDecisionNode: true, stage: 'probationary', stickyNote: null },
  { no: 10, title: '党支部党员大会讨论表决', time: '预审合格后一个月内', decisionMaker: '党支部党员大会（无记名投票，赞成人数超过应到会有表决权的党员人数的半数）', decisionDetail: '通过接收预备党员的决议', article: '§19/§20', isDecisionNode: true, stage: 'probationary', stickyNote: '支部大会无记名投票表决' },
  { no: 11, title: '上级党委审批',       time: '三个月内',       decisionMaker: '党委集体讨论和表决', decisionDetail: '批准预备党员，报上级党委组织部门备案',     article: '§25', isDecisionNode: true,  stage: 'probationary', stickyNote: null },
  // 阶段 4：预备党员 → 正式党员
  { no: 12, title: '预备期',             time: '一年',           decisionMaker: '党组织继续教育和考察', decisionDetail: '预备期从党支部党员大会通过其为预备党员之日算起', article: '§28/§31', isDecisionNode: false, stage: 'full', stickyNote: '预备期一年' },
  { no: 13, title: '转正手续',           time: '预备期满',       decisionMaker: '党支部委员会审查 + 党支部党员大会讨论表决通过 + 报上级党委审批', decisionDetail: '本人书面申请 → 征求党小组、党员、群众意见 → 党支部委员会审查 → 党支部党员大会讨论表决通过 → 报上级党委审批', article: '§32/§33', isDecisionNode: true, stage: 'full', stickyNote: '书面申请→征求意见→支部大会→上级审批' },
];

// 小目录条目（9 个 section 对应 9 个圆点）
// 主线：开篇 → 组织性 → 流程怎么走 → 为什么是宝贵机会 → 考察维度 → 工作分类 → 探索运作 → 行百里者半九十 → 管理事服务人
const TOC_ITEMS = [
  { id: 'hero',         label: '开篇' },
  { id: 'cognition',    label: '"组织性"的展开' },
  { id: 'development',  label: '身份阶段' },
  { id: 'philosophy',   label: '宝贵机会' },
  { id: 'review',       label: '考察维度' },
  { id: 'works',        label: '两种工作' },
  { id: 'exploration',  label: '探索运作' },
  { id: 'dialogue',     label: '行百里者半九十' },
  { id: 'conclusion',   label: '管理事，服务人' },
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

/** 计算自循环路径（从节点右侧绕一圈回到右侧，标签置于环右侧） */
function selfLoopPath(node) {
  const x = node.x, y = node.y;
  const startX = x + 30, startY = y - 22;
  const endX = x + 30, endY = y + 22;
  const ctrlX1 = x + 100, ctrlY1 = y - 60;
  const ctrlX2 = x + 100, ctrlY2 = y + 60;
  return {
    d: `M ${startX},${startY} C ${ctrlX1},${ctrlY1} ${ctrlX2},${ctrlY2} ${endX},${endY}`,
    mx: x + 110,
    my: y,
  };
}

// ════════════════════════════════════════════════════════════════
//  渲染函数
// ════════════════════════════════════════════════════════════════

/** Section 1: Hero — 从入党申请人到正式党员（成长路径开篇） */
function renderHero() {
  return `
    <section id="hero" class="help-section help-hero-section" data-toc-id="hero">
      <div class="help-section-inner help-hero-inner">
        <h1 class="help-hero-title">从入党申请人<br/>到正式党员</h1>
        <p class="help-hero-subtitle">光华管理学院本科生党支部</p>
        <div class="help-hero-accent-line"></div>
        <div class="help-hero-scroll-hint" aria-hidden="true">
          <span class="help-scroll-text">向下滚动</span>
          ${icon('scrollDown', { width: 20, height: 28, viewBox: '0 0 20 28', className: 'help-scroll-arrow' })}
        </div>
      </div>
    </section>
  `;
}

/** Section 2: 考察积极分子（三维度卡片，党建贡献高亮） */
function renderReview() {
  const cards = REVIEW_DIMENSIONS.map(d => `
    <div class="help-review-card ${d.highlight ? 'help-review-card--highlight' : ''}" data-stagger tabindex="0" role="button" aria-label="${d.name}：${d.tag}">
      <div class="help-review-card-head">
        <span class="help-review-card-name">${d.name}</span>
        ${d.highlight ? '<span class="help-review-card-badge">核心</span>' : ''}
      </div>
      <div class="help-review-card-tag">${d.tag}</div>
      <div class="help-review-card-desc">${d.desc}</div>
    </div>
  `).join('');

  return `
    <section id="review" class="help-section help-review-section" data-toc-id="review">
      <div class="help-section-inner">
        <h2 class="help-section-title">我们怎么考察积极分子？</h2>
        <p class="help-section-subtitle">三项考察内容——党课、贡献、评价，其中党建贡献特别看重原创性</p>
        <div class="help-review-grid">${cards}</div>
        <div class="help-review-footer">什么是党建贡献？→ 我们支部有一套工作架构</div>
      </div>
    </section>
  `;
}

/**
 * Section 4: 两条宝贵机会
 *
 * 母本：content/01_strategy/DEVELOPMENT_PATH.md 第一章·两条宝贵机会
 * --------------------------------------------------
 * 机会1：民主集中制下感受真实组织的两个向度（程序性 + 扁平化）
 * 机会2：AI时代中学生党支部的探索机会（参与构建 + 探索自由度）
 */
function renderPhilosophy() {
  const opportunities = [
    {
      no: '机会 1',
      title: '民主集中制下感受真实组织的两个向度',
      quote: '"民主集中制"下 感受真实的组织的两个向度："赋权"背景下的程序性 和 "探索"背景下的扁平化。这也就意味着真实的组织，不能只靠程序性令人凝聚在一起，也不能只靠"扁平化"而不去形成共识、带来效率。——提高生涯发展中对于所处组织的适应能力和开放心态。',
      points: [
        { label: '程序性', desc: '"赋权"背景下——组织通过分工、流程、记录、复盘让人凝聚' },
        { label: '扁平化', desc: '"探索"背景下——组织通过平等协商、无上下级分工让人创新' },
      ],
      insight: '在支部中体悟这两个向度的平衡，能提高生涯发展中对于所处组织的适应能力和开放心态——理解真实组织必然包含这两个向度，并学会在其中游刃有余。',
    },
    {
      no: '机会 2',
      title: 'AI时代中学生党支部的探索机会',
      quote: '作为AI时代中一个建设方兴未艾的学生组织，①可以真实地参与组织制度和组织文化的构建；②可以在"没有经济负担"的背景下探索AI时代下组织转型的萌芽和组织产品的生产。',
      points: [
        { label: '参与构建', desc: '不是进入一个成熟组织去适应，而是参与组织制度和组织文化的构建' },
        { label: '探索自由度', desc: '在"没有经济负担"的背景下探索组织转型的萌芽和组织产品的生产——未来进入职场后难以获得' },
      ],
      insight: '学生党支部的"方兴未艾"恰恰是机会所在：成熟组织没有这种探索空间，而学生组织有。服务人的根本目标之一，就是让成员获得未来进入职场后难以获得的探索自由度。',
    },
  ];

  const cards = opportunities.map(opp => {
    const pointsHTML = opp.points.map(p => `
      <div class="help-philosophy-opp-point">
        <span class="help-philosophy-opp-point-label">${p.label}</span>
        <span class="help-philosophy-opp-point-desc">${p.desc}</span>
      </div>
    `).join('');

    return `
      <article class="help-philosophy-opp" data-stagger>
        <div class="help-philosophy-opp-no">${opp.no}</div>
        <h3 class="help-philosophy-opp-title">${opp.title}</h3>
        <blockquote class="help-philosophy-opp-quote">${opp.quote}</blockquote>
        <div class="help-philosophy-opp-points">${pointsHTML}</div>
        <p class="help-philosophy-opp-insight">${opp.insight}</p>
      </article>
    `;
  }).join('');

  return `
    <section id="philosophy" class="help-section help-philosophy-section" data-toc-id="philosophy">
      <div class="help-section-inner help-philosophy-inner">
        <h2 class="help-philosophy-title">两条宝贵机会</h2>
        <p class="help-philosophy-lead" data-stagger>
          爱具体的组织——光华管理学院本科生党支部提供两条难得的成长机会。
        </p>
        <div class="help-philosophy-opportunities">${cards}</div>
      </div>
    </section>
  `;
}

/**
 * Section 2: 组织性——贯穿成长路径的辩证法
 *
 * 母本：content/01_strategy/DEVELOPMENT_PATH.md 第一章（面向新成员的"组织性"故事）
 * --------------------------------------------------
 * 辩证法结构：个体→组织（个人诉求进入组织）/ 组织→个体（组织经验赋能个人）/ 个体→组织（个人创新沉淀回组织）
 * 3 阶段标题用书记原话金句，正文用平实描述（移除"误解/真相/具体化"三段式）
 * 核心命题：爱具体的人而不是爱抽象的人，爱具体的组织而不是爱抽象的组织
 */
function renderCognition() {
  const stages = [
    {
      num: '01',
      direction: '个体 → 组织',
      title: '各种发展轨迹都能加入获得成长',
      body: '组织性是组织化成长途径，不是排他门槛。各种发展导向的同学——想进体制的、想走学术的、想去企业的——都能在组织中获得各自的成长。成长有两条路：个人闷头努力，或借由组织的经验、流程、集体智慧放大努力。后者才是"组织化"。光华管理学院本科生党支部就是你能在学院里接触到的那个具体组织。',
    },
    {
      num: '02',
      direction: '组织 → 个体',
      title: '事情运作有管理科学和既往经验',
      body: '真实组织运作靠流程和经验，不是层级命令。事情的运转有管理科学——分工、流程、记录、复盘有规律；有既往经验——历届支委沉淀的工作流是可复用的资产。成员调取并执行这些工作流，本身就是成长：执行过程让抽象的"管理知识"变成手上会用的"管理能力"。支书主持会议、副书记协助、组织委员统筹专班、宣传委员管档案、纪检委员管考勤——这些是具体的分工，不是抽象的"层级"。',
    },
    {
      num: '03',
      direction: '个体 → 组织',
      title: '发挥主人翁精神在框架内真实表达',
      body: '组织性的真正功能是让各种发展轨迹的人通过组织获得成长——个人通过组织实现诉求，不是个人服从组织。批评要在框架内提出：找准对象、找准时机。创新沉淀，就是把"没先例"变成"有先例"。你想做学术、想去企业、想走自己的路——支部的创新沉淀机制给你提供"把个人实践变成组织先例"的途径。',
    },
  ];

  const cards = stages.map(s => `
    <article class="help-cognition-item" data-stagger>
      <div class="help-cognition-item-num">${s.num}</div>
      <h3 class="help-cognition-item-title">${s.title}</h3>
      <p class="help-cognition-item-sub">${s.direction}</p>
      <div class="help-cognition-item-body">
        <p class="help-cognition-item-truth">${s.body}</p>
      </div>
    </article>
  `).join('');

  return `
    <section id="cognition" class="help-section help-cognition-section" data-toc-id="cognition">
      <div class="help-section-inner help-cognition-inner">
        <div class="help-cognition-eyebrow">"组织性"的展开</div>
        <h2 class="help-cognition-title">"组织性"的展开</h2>

        <div class="help-cognition-lead" data-stagger>
          <p>从入党申请人到党员，组织性是贯穿始终的成长途径。</p>
        </div>

        <div class="help-cognition-grid">${cards}</div>

        <div class="help-cognition-dialogue" data-stagger>
          <div class="help-cognition-dialogue-label">核心命题</div>
          <blockquote class="help-cognition-dialogue-quote">
            爱具体的人而不是爱抽象的人，爱具体的组织而不是爱抽象的组织。
          </blockquote>
        </div>
      </div>
    </section>
  `;
}

/** Section 6: 两种工作（仅卡片，探索运作独立为 Exploration section） */
function renderTwoWorks() {
  const cols = TWO_WORKS.map(w => {
    const examples = w.examples.map(e => `<li>${e}</li>`).join('');
    const features = w.features.map(f => `<li>${f}</li>`).join('');
    return `
      <div class="help-works-col help-works-col--${w.tone}" data-stagger>
        <span class="help-works-tag help-works-tag--${w.tone}">${w.tag}</span>
        <h3 class="help-works-col-title">${w.label}</h3>
        <p class="help-works-col-summary">${w.desc}</p>
        <div class="help-works-block">
          <div class="help-works-block-label">例子</div>
          <ul class="help-works-list">${examples}</ul>
        </div>
        <div class="help-works-block">
          <div class="help-works-block-label">特点</div>
          <ul class="help-works-list">${features}</ul>
        </div>
      </div>
    `;
  }).join('');

  return `
    <section id="works" class="help-section help-works-section" data-toc-id="works">
      <div class="help-section-inner">
        <h2 class="help-section-title">我们面对两种工作</h2>
        <p class="help-section-subtitle">一种是接续发力，一种是试错创造——探索工作是人人都参与的场域，包括积极分子</p>
        <div class="help-works-grid">${cols}</div>
      </div>
    </section>
  `;
}

// ════════════════════════════════════════════════════════════════
//  Exploration Canvas v2 系统（全屏沉浸 + 像素人漫步 + 镜头推拉 + 物件传递）
// ════════════════════════════════════════════════════════════════

/**
 * 渲染 Exploration 独立 section——全屏 Canvas + 底部字幕覆盖层
 */
function renderExploration() {
  return `
    <section id="exploration" class="help-section help-exploration-section" data-toc-id="exploration">
      <div class="help-exploration-fullscreen-wrap">
        <div class="help-exploration-scene-title"></div>
        <canvas class="help-exploration-fullscreen-canvas"></canvas>
        <div class="help-exploration-subtitle"></div>
      </div>
    </section>
  `;
}

// ════════════════════════════════════════════════════════════════
//  像素绘制函数（RPG 风 12×20 像素人 + 8 种像素物件）
// ════════════════════════════════════════════════════════════════

/**
 * 绘制 RPG 风像素角色（12×20 像素结构）
 *
 * 像素结构（参考 spec.md §像素人设计）：
 *     ████         ← 头发顶部 (hairColor, 4px, 只在头顶)
 *    ░░░░░░░       ← 额头 (skinColor)
 *    ░░██░██░      ← 眼睛 (每个 2px 小方块)
 *    ░░░░░░░       ← 脸颊
 *     ░░░░░        ← 下巴
 *       ░░         ← 脖子 (skinColor, 2px)
 *    ▒▒▒▒▒▒▒       ← 肩膀 (clothColor, 7px)
 *   ▒░░    ░░▒     ← 手臂外侧 (clothColor) + 内侧 (skinColor)
 *   ▒░░▒▒▒▒░░▒     ← 身体 (clothColor) + 手臂
 *   ▒░░▒▒▒▒░░▒     ← 身体 + 手 (skinColor 小方块)
 *   ▒░░▒▒▒▒░░▒     ← 身体 + 手
 *   ▒░░▒▒▒▒░░▒     ← 身体 + 手
 *    ▒▒▒▒▒▒▒       ← 腰部
 *     ░░░░░        ← 裤子 (pantsColor, 5px)
 *     ░░  ░░       ← 左右腿分开
 *     ░░  ░░       ← 腿
 *     ▓▓  ▓▓       ← 鞋子 (shoeColor)
 *
 * @param {CanvasRenderingContext2D} ctx - 画布上下文
 * @param {number} cx - 角色中心 X（画布坐标）
 * @param {number} cy - 角色中心 Y（画布坐标，角色脚下基准点）
 * @param {object} charData - 角色配色数据 {cloth, hair, pants}
 * @param {number} p - 像素单元大小（基础）
 * @param {number} scl - 缩放系数
 * @param {number} opacity - 不透明度 0~1
 * @param {string} action - 动作状态 'idle'|'walk'|'action'|'interact'
 * @param {number} frame - 动画帧计数
 * @param {number} facing - 朝向 1=右 -1=左
 */
function drawPixelCharacter(ctx, cx, cy, charData, p, scl, opacity, action, frame, facing) {
  if (opacity <= 0.01 || scl <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, opacity);

  const ps = p * scl; // 缩放后的像素单元
  // 角色尺寸：宽 12px，高 20px（按 spec 12×20 结构）
  const W = 12;
  const H = 20;

  // 角色左上角（cx 为水平中心，cy 为脚下基准点）
  const bx = cx - (W / 2) * ps;
  const by = cy - H * ps;

  // 动画参数
  const breathe = action === 'idle' ? Math.sin(frame * 0.05) * 0.2 : 0;
  const WALK_FRAMES = [
    { llx: -1.5, lly: 0,    rlx: 1.5,  rly: 0,    bob: 0, arm: 1    },
    { llx: 0,    lly: -1.5, rlx: 0,    rly: 0,    bob: 1, arm: 0.5  },
    { llx: 1,    lly: -1,   rlx: -1,   rly: 0,    bob: 0, arm: 0    },
    { llx: 1.5,  lly: 0,    rlx: -1.5, rly: 0,    bob: 0, arm: -1   },
    { llx: 0,    lly: 0,    rlx: 0,    rly: -1.5, bob: 1, arm: -0.5 },
    { llx: -1,   lly: 0,    rlx: 1,    rly: -1,   bob: 0, arm: 0    },
  ];
  const walkFrameIdx = action === 'walk' ? Math.floor(frame / 6) % 6 : 0;
  const wf = action === 'walk' ? WALK_FRAMES[walkFrameIdx] : { llx: 0, lly: 0, rlx: 0, rly: 0, bob: 0, arm: 0 };
  const bob = wf.bob * ps;
  const armSwing = wf.arm * ps * 0.8;
  const armRaise = action === 'action' ? Math.sin(frame * 0.15) * 2 * ps + 4 * ps : 0;
  const armReach = action === 'interact' ? Math.sin(frame * 0.1) * ps * 0.4 + 2 * ps : 0;
  const headTurn = action === 'idle'
    ? (Math.floor(frame / 90) % 2 === 0 ? 0 : facing * 0.5 * ps)
    : 0;

  // v15: 颜色取值 + 阴影/高光变体（提升角色质感）
  const cloth = charData.cloth;
  const hair = charData.hair;
  const pants = charData.pants;
  // 暗色变体（用于阴影侧）
  const clothDark = shadeColor(cloth, -0.25);
  const pantsDark = shadeColor(pants, -0.25);
  const hairLight = shadeColor(hair, 0.2);
  const skinShadow = shadeColor(SKIN_COLOR, -0.12);

  // ── 像素绘制（按行从顶到底） ──
  // 行 0: 头发顶部 (4px 居中) + 高光
  ctx.fillStyle = hair;
  ctx.fillRect(bx + 4 * ps, by + (0 - breathe) * ps, 4 * ps, 1 * ps);
  ctx.fillStyle = hairLight;
  ctx.fillRect(bx + 5 * ps, by + (0 - breathe) * ps, 1 * ps, 1 * ps);
  // 行 1: 额头 (skinColor, 6px 居中)
  ctx.fillStyle = SKIN_COLOR;
  ctx.fillRect(bx + 3 * ps, by + (1 - breathe) * ps, 6 * ps, 1 * ps);
  // 行 2: 眼睛区域 (skinColor 底 + 两个 1px 眼睛)
  ctx.fillStyle = SKIN_COLOR;
  ctx.fillRect(bx + 2 * ps, by + (2 - breathe) * ps, 8 * ps, 1 * ps);
  ctx.fillStyle = EYE_COLOR;
  if (facing >= 0) {
    ctx.fillRect(bx + (4 + headTurn / ps) * ps, by + (2 - breathe) * ps, 1 * ps, 1 * ps);
    ctx.fillRect(bx + (7 + headTurn / ps) * ps, by + (2 - breathe) * ps, 1 * ps, 1 * ps);
  } else {
    ctx.fillRect(bx + (3 + headTurn / ps) * ps, by + (2 - breathe) * ps, 1 * ps, 1 * ps);
    ctx.fillRect(bx + (6 + headTurn / ps) * ps, by + (2 - breathe) * ps, 1 * ps, 1 * ps);
  }
  // 行 3: 脸颊 (skinColor, 8px) + 阴影侧
  ctx.fillStyle = SKIN_COLOR;
  ctx.fillRect(bx + 2 * ps, by + (3 - breathe) * ps, 8 * ps, 1 * ps);
  ctx.fillStyle = skinShadow;
  ctx.fillRect(bx + 2 * ps, by + (3 - breathe) * ps, 1 * ps, 1 * ps); // 左侧阴影
  // 行 4: 下巴 (skinColor, 6px 居中) + v15 嘴巴
  ctx.fillStyle = SKIN_COLOR;
  ctx.fillRect(bx + 3 * ps, by + (4 - breathe) * ps, 6 * ps, 1 * ps);
  ctx.fillStyle = shadeColor(SKIN_COLOR, -0.2);
  ctx.fillRect(bx + 5 * ps, by + (4 - breathe) * ps, 2 * ps, 1 * ps); // 嘴巴
  // 行 5: 脖子 (skinColor, 2px 居中)
  ctx.fillStyle = skinShadow;
  ctx.fillRect(bx + 5 * ps, by + (5 - breathe) * ps, 2 * ps, 1 * ps);

  // 行 6: 肩膀 (clothColor, 8px 居中)
  ctx.fillStyle = cloth;
  ctx.fillRect(bx + 2 * ps, by + (6 - bob) * ps, 8 * ps, 1 * ps);
  ctx.fillStyle = clothDark;
  ctx.fillRect(bx + 2 * ps, by + (6 - bob) * ps, 1 * ps, 1 * ps); // 左侧阴影

  // 行 7-12: 身体 + 手臂
  for (let row = 7; row <= 12; row++) {
    const yOff = (row - bob) * ps;
    ctx.fillStyle = cloth;
    ctx.fillRect(bx + 0 * ps, by + yOff, 2 * ps, 1 * ps); // 左臂
    ctx.fillRect(bx + 2 * ps, by + yOff, 8 * ps, 1 * ps); // 身体
    ctx.fillRect(bx + 10 * ps, by + yOff, 2 * ps, 1 * ps); // 右臂
    // v15: 身体左侧阴影
    ctx.fillStyle = clothDark;
    ctx.fillRect(bx + 2 * ps, by + yOff, 1 * ps, 1 * ps);
    // 手部
    if (row >= 11) {
      ctx.fillStyle = SKIN_COLOR;
      ctx.fillRect(bx + 1 * ps, by + yOff, 1 * ps, 1 * ps);
      ctx.fillRect(bx + 10 * ps, by + yOff, 1 * ps, 1 * ps);
    }
  }

  // 手臂动画
  if (action === 'walk' || action === 'action' || action === 'interact') {
    ctx.fillStyle = cloth;
    const leftArmDy = -armRaise + armSwing;
    ctx.fillRect(bx + 0 * ps, by + (7 - bob + leftArmDy) * ps, 2 * ps, 1 * ps);
    ctx.fillRect(bx + 0 * ps, by + (8 - bob + leftArmDy) * ps, 2 * ps, 1 * ps);
    const rightArmDy = armRaise - armSwing + armReach;
    ctx.fillRect(bx + 10 * ps, by + (7 - bob + rightArmDy) * ps, 2 * ps, 1 * ps);
    ctx.fillRect(bx + 10 * ps, by + (8 - bob + rightArmDy) * ps, 2 * ps, 1 * ps);
    if (action !== 'walk') {
      ctx.fillStyle = SKIN_COLOR;
      ctx.fillRect(bx + 1 * ps, by + (8 - bob + leftArmDy) * ps, 1 * ps, 1 * ps);
      ctx.fillRect(bx + 10 * ps, by + (8 - bob + rightArmDy) * ps, 1 * ps, 1 * ps);
    }
  }

  // 行 13: 腰部 (clothDark 腰带, 6px 居中)
  ctx.fillStyle = clothDark;
  ctx.fillRect(bx + 3 * ps, by + (13 - bob) * ps, 6 * ps, 1 * ps);

  // 行 14-15: 裤子 + v15 阴影
  ctx.fillStyle = pants;
  ctx.fillRect(bx + 3 * ps, by + (14 - bob) * ps, 6 * ps, 1 * ps);
  ctx.fillRect(bx + 3 * ps, by + (15 - bob) * ps, 6 * ps, 1 * ps);
  ctx.fillStyle = pantsDark;
  ctx.fillRect(bx + 3 * ps, by + (14 - bob) * ps, 1 * ps, 1 * ps); // 左侧阴影

  // 行 16-17: 左右腿分开
  ctx.fillStyle = pants;
  ctx.fillRect(bx + (3 + wf.llx) * ps, by + (16 - bob + wf.lly) * ps, 2 * ps, 1 * ps);
  ctx.fillRect(bx + (3 + wf.llx) * ps, by + (17 - bob + wf.lly) * ps, 2 * ps, 1 * ps);
  ctx.fillRect(bx + (7 + wf.rlx) * ps, by + (16 - bob + wf.rly) * ps, 2 * ps, 1 * ps);
  ctx.fillRect(bx + (7 + wf.rlx) * ps, by + (17 - bob + wf.rly) * ps, 2 * ps, 1 * ps);

  // 行 18-19: 鞋子
  ctx.fillStyle = SHOE_COLOR;
  ctx.fillRect(bx + (3 + wf.llx) * ps, by + (18 - bob + wf.lly) * ps, 2 * ps, 2 * ps);
  ctx.fillRect(bx + (7 + wf.rlx) * ps, by + (18 - bob + wf.rly) * ps, 2 * ps, 2 * ps);

  ctx.restore();
}

/** v15: 颜色明暗变体工具函数（amount: -1~1, 负=变暗, 正=变亮） */
function shadeColor(hex, amount) {
  const c = hex.replace('#', '');
  let r = parseInt(c.substring(0, 2), 16);
  let g = parseInt(c.substring(2, 4), 16);
  let b = parseInt(c.substring(4, 6), 16);
  r = Math.max(0, Math.min(255, Math.round(r + r * amount)));
  g = Math.max(0, Math.min(255, Math.round(g + g * amount)));
  b = Math.max(0, Math.min(255, Math.round(b + b * amount)));
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

/**
 * 在角色下方绘制名称标签
 */
function drawCharacterLabel(ctx, cx, cy, name, p, scl, opacity, scale) {
  if (opacity <= 0.01 || scl <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, opacity) * 0.9;

  const ps = p * scl;
  const fontSize = Math.max(10, Math.round(ps * 3.2 * scale));
  ctx.font = `600 ${fontSize}px "Noto Sans SC", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#374151';

  // 标签位置在角色脚下
  const labelY = cy + (15 * 0.55) * ps * scale;
  ctx.fillText(name, cx, labelY);

  ctx.restore();
}

/**
 * v15: 绘制焦点角色光环（发光圆环）
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx - 角色中心 X
 * @param {number} cy - 角色脚下 Y
 * @param {number} p - 像素单元
 * @param {string} color - 角色色
 */
function drawFocusRing(ctx, cx, cy, p, color) {
  ctx.save();
  const radius = 22;
  const cyCenter = cy - 20; // 角色身体中心
  // 外发光（柔和光晕）
  const gradient = ctx.createRadialGradient(cx, cyCenter, radius * 0.5, cx, cyCenter, radius * 1.4);
  gradient.addColorStop(0, color + '00');
  gradient.addColorStop(0.6, color + '40');
  gradient.addColorStop(1, color + '00');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(cx, cyCenter, radius * 1.4, radius * 1.6, 0, 0, Math.PI * 2);
  ctx.fill();
  // 内环（角色色虚线椭圆）
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 2]);
  ctx.beginPath();
  ctx.ellipse(cx, cyCenter, radius, radius * 1.2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

/**
 * v15: 绘制方向箭头（from→to，虚线+箭头头部）
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} fromAgent - 起点角色
 * @param {object} toAgent - 终点角色
 */
function drawDirectionArrow(ctx, fromAgent, toAgent) {
  const dx = toAgent.x - fromAgent.x;
  const dy = (toAgent.y - 30) - (fromAgent.y - 30); // 胸口高度
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 50) return; // 太近不画箭头

  // 缩进角色半径，避免覆盖角色
  const offset = 20;
  const startX = fromAgent.x + (dx / dist) * offset;
  const startY = (fromAgent.y - 30) + (dy / dist) * offset;
  const endX = toAgent.x - (dx / dist) * offset;
  const endY = (toAgent.y - 30) - (dy / dist) * offset;

  ctx.save();
  // 虚线（fromAgent 角色色）
  ctx.strokeStyle = fromAgent.charData.cloth;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 3]);
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.setLineDash([]);

  // 箭头头部（三角形）
  const angle = Math.atan2(dy, dx);
  const arrowSize = 7;
  ctx.fillStyle = fromAgent.charData.cloth;
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - arrowSize * Math.cos(angle - Math.PI / 6),
    endY - arrowSize * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    endX - arrowSize * Math.cos(angle + Math.PI / 6),
    endY - arrowSize * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ── 像素物件绘制（8 种物件）──

/**
 * 绘制像素物件
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} type - 物件类型 'attendance'|'megaphone'|'material'|'record'|'envelope'|'directive'|'package'|'badge'
 * @param {number} x - 中心 X
 * @param {number} y - 中心 Y
 * @param {number} scl - 缩放系数
 * @param {number} alpha - 不透明度 0~1
 */
function drawPixelObject(ctx, type, x, y, scl, alpha) {
  if (alpha <= 0.01 || scl <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
  const s = scl; // 物件像素单元

  switch (type) {
    case 'attendance': {
      // 考勤表：小本子（棕色矩形+白色线）
      ctx.fillStyle = '#92400E';
      ctx.fillRect(x - 6 * s, y - 8 * s, 12 * s, 16 * s);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x - 4 * s, y - 6 * s, 8 * s, 1 * s);
      ctx.fillRect(x - 4 * s, y - 3 * s, 8 * s, 1 * s);
      ctx.fillRect(x - 4 * s, y, 8 * s, 1 * s);
      ctx.fillRect(x - 4 * s, y + 3 * s, 6 * s, 1 * s);
      break;
    }
    case 'megaphone': {
      // 宣传需求：小喇叭（蓝色三角+矩形）
      ctx.fillStyle = '#2563EB';
      ctx.beginPath();
      ctx.moveTo(x - 8 * s, y - 4 * s);
      ctx.lineTo(x - 8 * s, y + 4 * s);
      ctx.lineTo(x - 2 * s, y + 6 * s);
      ctx.lineTo(x - 2 * s, y - 6 * s);
      ctx.closePath();
      ctx.fill();
      // 把手
      ctx.fillStyle = '#1E40AF';
      ctx.fillRect(x - 2 * s, y - 3 * s, 4 * s, 6 * s);
      // 喇叭口
      ctx.fillStyle = '#FBBF24';
      ctx.fillRect(x - 8 * s, y - 2 * s, 1 * s, 4 * s);
      break;
    }
    case 'material': {
      // 考察材料：小文件夹（天蓝矩形+标签）
      ctx.fillStyle = '#0EA5E9';
      ctx.fillRect(x - 7 * s, y - 5 * s, 14 * s, 10 * s);
      // 标签
      ctx.fillStyle = '#0284C7';
      ctx.fillRect(x - 7 * s, y - 7 * s, 6 * s, 2 * s);
      // 内页线
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x - 5 * s, y - 2 * s, 10 * s, 1 * s);
      ctx.fillRect(x - 5 * s, y + 1 * s, 10 * s, 1 * s);
      break;
    }
    case 'record': {
      // 考察记录：小文档（橙色矩形+横线）
      ctx.fillStyle = '#C2410C';
      ctx.fillRect(x - 6 * s, y - 8 * s, 12 * s, 16 * s);
      // 折角
      ctx.fillStyle = '#9A3412';
      ctx.beginPath();
      ctx.moveTo(x + 6 * s, y - 8 * s);
      ctx.lineTo(x + 2 * s, y - 8 * s);
      ctx.lineTo(x + 6 * s, y - 4 * s);
      ctx.closePath();
      ctx.fill();
      // 横线
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x - 4 * s, y - 4 * s, 8 * s, 1 * s);
      ctx.fillRect(x - 4 * s, y - 1 * s, 8 * s, 1 * s);
      ctx.fillRect(x - 4 * s, y + 2 * s, 6 * s, 1 * s);
      break;
    }
    case 'envelope': {
      // 招募请求：小信封（白色矩形+三角盖）
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x - 7 * s, y - 5 * s, 14 * s, 10 * s);
      // 三角盖
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 1 * s;
      ctx.beginPath();
      ctx.moveTo(x - 7 * s, y - 5 * s);
      ctx.lineTo(x, y + 1 * s);
      ctx.lineTo(x + 7 * s, y - 5 * s);
      ctx.stroke();
      // 边框
      ctx.strokeRect(x - 7 * s, y - 5 * s, 14 * s, 10 * s);
      break;
    }
    case 'directive': {
      // 业务赋权：小卷轴（红色圆角矩形+丝带）
      ctx.fillStyle = '#B91C1C';
      ctx.fillRect(x - 6 * s, y - 4 * s, 12 * s, 8 * s);
      // 卷轴端
      ctx.fillStyle = '#7F1D1D';
      ctx.fillRect(x - 7 * s, y - 5 * s, 2 * s, 10 * s);
      ctx.fillRect(x + 5 * s, y - 5 * s, 2 * s, 10 * s);
      // 丝带
      ctx.fillStyle = '#FBBF24';
      ctx.fillRect(x - 1 * s, y - 4 * s, 2 * s, 8 * s);
      break;
    }
    case 'package': {
      // 交付成果：小包裹（绿色方形+十字绳）
      ctx.fillStyle = '#16A34A';
      ctx.fillRect(x - 7 * s, y - 7 * s, 14 * s, 14 * s);
      // 十字绳
      ctx.fillStyle = '#92400E';
      ctx.fillRect(x - 7 * s, y - 1 * s, 14 * s, 2 * s);
      ctx.fillRect(x - 1 * s, y - 7 * s, 2 * s, 14 * s);
      // 蝴蝶结中心
      ctx.fillStyle = '#FBBF24';
      ctx.fillRect(x - 2 * s, y - 2 * s, 4 * s, 4 * s);
      break;
    }
    case 'badge': {
      // 赋权令：小徽章（金色圆形+十字）
      ctx.fillStyle = '#D4AF37';
      ctx.beginPath();
      ctx.arc(x, y, 7 * s, 0, Math.PI * 2);
      ctx.fill();
      // 十字
      ctx.fillStyle = '#7A0010';
      ctx.fillRect(x - 1 * s, y - 4 * s, 2 * s, 8 * s);
      ctx.fillRect(x - 4 * s, y - 1 * s, 8 * s, 2 * s);
      // 边框
      ctx.strokeStyle = '#92400E';
      ctx.lineWidth = 1 * s;
      ctx.beginPath();
      ctx.arc(x, y, 7 * s, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    default:
      // 未知类型不绘制
      break;
  }

  ctx.restore();
}

/**
 * 绘制像素风对话气泡（v13 新增）
 * 样式：方角黑边框（2px）+ 白底 + Noto Sans SC 字体
 * 位置：说话者头顶上方，下方有尾巴指向角色
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} bubble - { agent, text, alpha, scale }
 */
function drawDialogueBubbleCanvas(ctx, bubble) {
  if (bubble.alpha <= 0.01) return;
  const agent = bubble.agent;
  if (!agent) return;

  ctx.save();
  ctx.globalAlpha = Math.min(1, bubble.alpha);

  // v15: 使用角色色作为气泡边框，视觉对应说话人
  const charColor = agent.charData.cloth;

  // 气泡位置：角色头顶上方（角色高约 40px，气泡在头顶上方 30px）
  const cx = agent.x;
  const cy = agent.y - 70;

  // 计算文字尺寸
  const fontSize = 11;
  ctx.font = `600 ${fontSize}px "Noto Sans SC", "PingFang SC", sans-serif`;
  const textWidth = ctx.measureText(bubble.text).width;

  // 气泡尺寸（含 padding）
  const padX = 8;
  const padY = 5;
  const bubbleW = textWidth + padX * 2;
  const bubbleH = fontSize + padY * 2;

  // 应用 scale（弹出动画）—— 以气泡中心为原点
  ctx.translate(cx, cy);
  ctx.scale(bubble.scale, bubble.scale);
  ctx.translate(-cx, -cy);

  // 绘制白底
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(cx - bubbleW / 2, cy - bubbleH / 2, bubbleW, bubbleH);

  // v15: 角色色边框（2px）—— 视觉对应说话人
  ctx.strokeStyle = charColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(cx - bubbleW / 2, cy - bubbleH / 2, bubbleW, bubbleH);

  // 绘制尾巴（下方小三角指向角色）
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(cx - 4, cy + bubbleH / 2);
  ctx.lineTo(cx + 4, cy + bubbleH / 2);
  ctx.lineTo(cx, cy + bubbleH / 2 + 6);
  ctx.closePath();
  ctx.fill();
  // v15: 尾巴边线用角色色
  ctx.strokeStyle = charColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 4, cy + bubbleH / 2);
  ctx.lineTo(cx, cy + bubbleH / 2 + 6);
  ctx.lineTo(cx + 4, cy + bubbleH / 2);
  ctx.stroke();

  // 绘制文字
  ctx.fillStyle = '#1E293B';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(bubble.text, cx, cy);

  ctx.restore();
}

/** Section 7: 和组织对话——行百里者半九十（竖向四步） */
function renderDialogue() {
  const stepsHTML = DIALOGUE_STAGES.map(s => `
    <div class="help-dialogue-step">
      <div class="help-dialogue-step-no">${s.no}</div>
      <div class="help-dialogue-step-body">
        <div class="help-dialogue-step-phase">${s.phase}</div>
        <div class="help-dialogue-step-question">${s.question}</div>
        <div class="help-dialogue-step-answer">${s.answer}</div>
        <div class="help-dialogue-step-desc">${s.desc}</div>
      </div>
    </div>
  `).join('');

  return `
    <section id="dialogue" class="help-section help-dialogue-section" data-toc-id="dialogue">
      <div class="help-section-inner">
        <div class="help-dialogue-eyebrow">恢复对话能力</div>
        <h2 class="help-section-title">行百里者半九十</h2>
        <p class="help-section-subtitle">活动不是做了就行——必须和组织对话，在实践中持续改进</p>
        <div class="help-dialogue-steps">${stepsHTML}</div>
        <blockquote class="help-dialogue-coda" data-stagger>
          党建和经管学科科研的交叉点在于恢复和马克思主义的对话能力，恢复理论研究和现实治理之间的对话能力。
        </blockquote>
      </div>
    </section>
  `;
}

/** Section 8: 收束——管理事，服务人（极简点题式） */
function renderConclusion() {
  return `
    <section id="conclusion" class="help-section help-conclusion-section" data-toc-id="conclusion">
      <div class="help-section-inner help-conclusion-inner">
        <h2 class="help-conclusion-title">管理事，<br/>服务人</h2>
        <p class="help-conclusion-lead" data-stagger>
          党建与党务的统一主语，贯穿从入党申请人到正式党员的全路径。
        </p>
      </div>
    </section>
  `;
}

/** Section 3: 发展党员交替时间轴（13 关键节点，居中列 + 左右交替侧面板）
 * v10: center column + alternating side panels + sticky annotations + accordion
 * 奇数步 detail 展开在左侧，偶数步在右侧；sticky annotation 在对面 */
function renderDevelopment() {
  // 阶段定义（4 阶段）
  const STAGES = [
    { key: 'applicant',    label: '入党申请人 → 入党积极分子', nos: [1,2,3,4,5] },
    { key: 'activist',     label: '入党积极分子 → 发展对象',   nos: [6,7,8] },
    { key: 'prospect',     label: '发展对象 → 预备党员',       nos: [9,10,11] },
    { key: 'probationary', label: '预备党员 → 正式党员',       nos: [12,13] },
  ];

  // 从 DEVELOPMENT_TIMELINE 按节点编号快速查找
  const nodeMap = {};
  DEVELOPMENT_TIMELINE.forEach(n => { nodeMap[n.no] = n; });

  let html = '';

  STAGES.forEach(stage => {
    // 阶段标签（居中，无横线装饰）
    html += `<div class="help-tl-stage">${stage.label}</div>`;

    stage.nos.forEach(no => {
      const node = nodeMap[no];
      if (!node) return;

      const isDecision = node.isDecisionNode;
      const isOdd = node.no % 2 === 1;

      // 决策节点：amber dot + amber 编号；普通节点：party red 编号
      const dotClass = isDecision ? 'help-tl-dot--decision' : '';
      const noClass = isDecision ? 'help-tl-no--decision' : '';

      // side--left: 奇数步放 detail，偶数步放 sticky
      // side--right: 偶数步放 detail，奇数步放 sticky
      const leftContent = isOdd
        ? `<div class="help-tl-detail" data-step="${node.no}">
             <span class="help-tl-detail-article">${node.article}</span>
             <span class="help-tl-detail-decision">${node.decisionMaker}</span>
             <div class="help-tl-detail-text">${node.decisionDetail}</div>
           </div>`
        : (node.stickyNote
            ? `<span class="help-tl-sticky${isDecision ? ' help-tl-sticky--decision' : ''}">${node.stickyNote}</span>`
            : '');

      const rightContent = isOdd
        ? (node.stickyNote
            ? `<span class="help-tl-sticky${isDecision ? ' help-tl-sticky--decision' : ''}">${node.stickyNote}</span>`
            : '')
        : `<div class="help-tl-detail" data-step="${node.no}">
             <span class="help-tl-detail-article">${node.article}</span>
             <span class="help-tl-detail-decision">${node.decisionMaker}</span>
             <div class="help-tl-detail-text">${node.decisionDetail}</div>
           </div>`;

      html += `
        <div class="help-tl-row${isDecision ? ' help-tl-row--decision' : ''}" data-step="${node.no}">
          <div class="help-tl-side help-tl-side--left">${leftContent}</div>
          <div class="help-tl-center">
            <span class="help-tl-dot ${dotClass}"></span>
            <span class="help-tl-no ${noClass}">${node.no}</span>
            <span class="help-tl-title">${node.title}</span>
            ${node.time && node.time !== '—' ? `<span class="help-tl-time">${node.time}</span>` : ''}
          </div>
          <div class="help-tl-side help-tl-side--right">${rightContent}</div>
        </div>
      `;
    });
  });

  return `
    <section id="development" class="help-section help-development-section" data-toc-id="development">
      <div class="help-section-inner">
        <h2 class="help-section-title">从入党申请人到正式党员</h2>
        <p class="help-section-subtitle">依据《中国共产党发展党员工作细则（2026年）》</p>
        <div class="help-timeline-legend">
          <span class="help-timeline-legend-item"><span class="help-timeline-legend-dot"></span>普通节点</span>
          <span class="help-timeline-legend-item help-timeline-legend-item--decision"><span class="help-timeline-legend-dot"></span>关键决策节点</span>
        </div>
        <div class="help-timeline-alternating">${html}</div>
      </div>
    </section>
  `;
}

/** 固定小目录（桌面端右侧，移动端隐藏） */
function renderTOC() {
  // 极简圆点导航：8 个 8px 圆点对应 8 个 section，hover 显 tooltip
  const items = TOC_ITEMS.map(item => `
    <a href="#${item.id}" class="help-toc-dot-item" data-toc="${item.id}" aria-label="跳转到${item.label}">
      <span class="help-toc-dot-mark" aria-hidden="true"></span>
      <span class="help-toc-dot-tooltip">${item.label}</span>
    </a>
  `).join('');
  return `<nav class="help-toc-nav" aria-label="页面目录"><div class="help-toc-nav-inner">${items}</div></nav>`;
}

/** 主渲染入口 */
function renderHelpContent() {
  const content = document.getElementById('help-content');
  if (!content) {
    console.error('[renderHelpContent] #help-content not found');
    return;
  }
  const base = getBasePath();
  console.log('[renderHelpContent] start, base=', base);

  // 安全渲染：每个 section 用 try-catch 包裹，避免单个 section 报错导致整个页面空白
  const safe = (name, fn) => {
    try {
      const html = fn();
      console.log(`[renderHelpContent] ${name} OK, html.length=${html.length}`);
      return html;
    } catch (e) {
      console.error(`[renderHelpContent] ${name} ERROR:`, e);
      return `<div style="padding:20px;background:#fee;border:2px solid red;color:#900;">[${name} 渲染失败: ${e.message}]</div>`;
    }
  };

  content.classList.add('help-v3');
  content.innerHTML = `
    ${safe('TOC', renderTOC)}
    ${safe('Hero', renderHero)}
    ${safe('Cognition', renderCognition)}
    ${safe('Development', renderDevelopment)}
    ${safe('Philosophy', renderPhilosophy)}
    ${safe('Review', renderReview)}
    ${safe('TwoWorks', renderTwoWorks)}
    ${safe('Exploration', renderExploration)}
    ${safe('Dialogue', renderDialogue)}
    ${safe('Conclusion', renderConclusion)}
    <footer class="help-page-footer">
      <a href="${base}index.html" class="help-back-link">
        ${icon('arrowLeft', { size: 14 })}
        返回主页
      </a>
    </footer>
  `;
}

// ════════════════════════════════════════════════════════════════
//  交互逻辑
// ════════════════════════════════════════════════════════════════

/** 发展党员：时间轴手风琴展开/收起详情（GSAP 动画）
 * 点击 center 列的步骤 → 收起当前展开的 detail → 展开该步骤的 detail
 * detail 在左侧或右侧侧面板中，由 data-step 奇偶决定 */
function bindTimelineToggle() {
  const container = document.querySelector('.help-timeline-alternating');
  if (!container) return;

  // 所有 detail 初始隐藏
  const allDetails = container.querySelectorAll('.help-tl-detail');
  if (allDetails.length > 0) {
    gsap.set(allDetails, { autoAlpha: 0, height: 0 });
  }

  let currentExpanded = null; // 当前展开的 row

  container.querySelectorAll('.help-tl-row').forEach(row => {
    const center = row.querySelector('.help-tl-center');
    const detail = row.querySelector('.help-tl-detail');
    if (!center || !detail) return;

    center.style.cursor = 'pointer';

    center.addEventListener('click', () => {
      // 如果点击的是当前已展开的行 → 收起
      if (currentExpanded === row) {
        gsap.to(detail, {
          autoAlpha: 0,
          height: 0,
          duration: 0.3,
          ease: 'power2.in',
          overwrite: true,
        });
        row.classList.remove('is-expanded');
        currentExpanded = null;
        return;
      }

      // 收起之前展开的行
      if (currentExpanded) {
        const prevDetail = currentExpanded.querySelector('.help-tl-detail');
        if (prevDetail) {
          gsap.to(prevDetail, {
            autoAlpha: 0,
            height: 0,
            duration: 0.25,
            ease: 'power2.in',
            overwrite: true,
          });
        }
        currentExpanded.classList.remove('is-expanded');
      }

      // 展开当前行
      row.classList.add('is-expanded');
      gsap.to(detail, {
        autoAlpha: 1,
        height: 'auto',
        duration: 0.4,
        ease: 'power2.out',
        overwrite: true,
      });
      currentExpanded = row;
    });
  });
}

/** 固定小目录：点击跳转 + 当前 section 高亮 */
function bindTOC() {
  const tocItems = document.querySelectorAll('.help-toc-dot-item');
  const tocNav = document.querySelector('.help-toc-nav');
  const sections = document.querySelectorAll('.help-section[data-toc-id]');
  if (!tocItems.length || !sections.length) return;

  // 点击跳转（平滑滚动，考虑固定 header 高度）
  tocItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const id = item.dataset.toc;
      const target = document.getElementById(id);
      if (target) {
        const headerOffset = 64;
        const top = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  // hover 整体 nav 时提升不透明度
  if (tocNav) {
    tocNav.addEventListener('mouseenter', () => tocNav.classList.add('is-hovered'));
    tocNav.addEventListener('mouseleave', () => tocNav.classList.remove('is-hovered'));
  }

  // 高亮当前 section（IntersectionObserver）
  let currentId = null;
  const setActive = (id) => {
    if (id === currentId) return;
    currentId = id;
    tocItems.forEach(item => {
      item.classList.toggle('is-active', item.dataset.toc === id);
    });
  };

  const observer = new IntersectionObserver((entries) => {
    // 取可视区内最靠上的 section 作为当前
    const visible = entries
      .filter(e => e.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (visible.length > 0) {
      setActive(visible[0].target.dataset.tocId);
    }
  }, { threshold: [0.15, 0.4, 0.6], rootMargin: '-15% 0px -55% 0px' });

  sections.forEach(s => observer.observe(s));

  // 初始高亮 hero
  setActive('hero');
}

/** 全页面 GSAP 动画（ScrollTrigger + matchMedia 优雅降级） */
function bindPageAnimations() {
  // GSAP 可能未加载（CDN 失败），优雅降级
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    document.querySelectorAll('.help-section').forEach(s => s.style.opacity = '1');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  const mm = gsap.matchMedia();

  // ── 标准动画 ──
  mm.add('(prefers-reduced-motion: no-preference)', () => {

    // Hero — 优雅入场：标题上滑 + 金色装饰线 clipPath 擦除 + 副标题上滑
    const heroTitle = document.querySelector('.help-hero-title');
    const heroAccent = document.querySelector('.help-hero-accent-line');
    const heroSubtitle = document.querySelector('.help-hero-subtitle');
    if (heroTitle) {
      gsap.from(heroTitle, { y: 60, autoAlpha: 0, duration: 0.8, ease: 'power3.out' });
    }
    if (heroAccent) {
      gsap.from(heroAccent, { clipPath: 'inset(0 100% 0 0)', duration: 0.6, delay: 0.3, ease: 'power2.inOut' });
    }
    if (heroSubtitle) {
      gsap.from(heroSubtitle, { y: 20, autoAlpha: 0, duration: 0.6, delay: 0.15, ease: 'power2.out' });
    }

    // Cognition: 标题 + 论断卡片统一入场
    const cognitionSection = document.querySelector('.help-cognition-section');
    if (cognitionSection) {
      const cognitionEls = cognitionSection.querySelectorAll('.help-cognition-eyebrow, .help-cognition-title, .help-cognition-lead, .help-cognition-item, .help-cognition-dialogue');
      if (cognitionEls.length) {
        gsap.from(cognitionEls, {
          autoAlpha: 0,
          y: 30,
          duration: 0.5,
          stagger: 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: cognitionSection,
            start: 'top 80%',
            once: true,
          },
        });
      }
    }

    // Development: 时间轴入场动画（v9: 替代 scrub）
    bindDevelopmentEntranceAnimation();

    // Philosophy: 统一上浮入场（与其他块一致）
    const philosophySection = document.querySelector('.help-philosophy-section');
    if (philosophySection) {
      const philosophyEls = philosophySection.querySelectorAll('.help-philosophy-title, .help-philosophy-lead, .help-philosophy-opp');
      if (philosophyEls.length) {
        gsap.from(philosophyEls, {
          autoAlpha: 0,
          y: 30,
          duration: 0.5,
          stagger: 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: philosophySection,
            start: 'top 80%',
            once: true,
          },
        });
      }
    }

    // Review: 标题 + 三维度卡片统一入场
    const reviewSection = document.querySelector('.help-review-section');
    if (reviewSection) {
      const reviewEls = reviewSection.querySelectorAll('.help-section-title, .help-section-subtitle, .help-review-card');
      if (reviewEls.length) {
        gsap.from(reviewEls, {
          autoAlpha: 0,
          y: 30,
          duration: 0.5,
          stagger: 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: reviewSection,
            start: 'top 80%',
            once: true,
          },
        });
      }
    }

    // Works: 标题 + 两种工作卡片统一入场
    const worksSection = document.querySelector('.help-works-section');
    if (worksSection) {
      const worksEls = worksSection.querySelectorAll('.help-section-title, .help-section-subtitle, .help-works-col');
      if (worksEls.length) {
        gsap.from(worksEls, {
          autoAlpha: 0,
          y: 30,
          duration: 0.5,
          stagger: 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: worksSection,
            start: 'top 80%',
            once: true,
          },
        });
      }
    }

    // Dialogue: 标题 + 步骤卡片统一入场
    const dialogueSection = document.querySelector('.help-dialogue-section');
    if (dialogueSection) {
      const dialogueEls = dialogueSection.querySelectorAll('.help-dialogue-eyebrow, .help-section-title, .help-section-subtitle, .help-dialogue-step, .help-dialogue-coda');
      if (dialogueEls.length) {
        gsap.from(dialogueEls, {
          autoAlpha: 0,
          y: 30,
          duration: 0.5,
          stagger: 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: dialogueSection,
            start: 'top 80%',
            once: true,
          },
        });
      }
    }

    // Conclusion
    const conclusionSection = document.querySelector('.help-conclusion-section');
    if (conclusionSection) {
      gsap.from(conclusionSection.children, {
        scale: 0.9, opacity: 0, duration: 0.6, stagger: 0.15, ease: 'back.out(1.2)',
        scrollTrigger: { trigger: '.help-conclusion-section', start: 'top 80%' }
      });
    }

    // Exploration Canvas v2 漫步 AI + 镜头 + Beat 编排由 bindExplorationCanvas() 独立处理

    return () => ScrollTrigger.getAll().forEach(t => t.kill());
  });

  // ── reduced-motion 降级 ──
  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('.help-hero-title, .help-hero-subtitle, .help-hero-accent-line, .help-cognition-eyebrow, .help-cognition-title, .help-cognition-lead, .help-cognition-item, .help-cognition-dialogue, .help-philosophy-opp, .help-section-title, .help-section-subtitle, .help-review-card, .help-works-col, .help-dialogue-eyebrow, .help-dialogue-step, .help-dialogue-coda, .help-conclusion-section, .help-tl-row, .help-tl-stage', { autoAlpha: 1, y: 0, x: 0, scale: 1, clipPath: 'inset(0 0% 0 0)' });
    // Exploration Canvas 由 bindExplorationCanvas() 独立处理
  });
}

/** Development 时间轴入场动画（v10: 交替布局入场，替代 v9 scrub） */
function bindDevelopmentEntranceAnimation() {
  const section = document.querySelector('.help-development-section');
  if (!section) return;
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  const mm = gsap.matchMedia();

  // ── reduced-motion 降级 ──
  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set(section.querySelectorAll('.help-tl-row, .help-tl-stage'), { autoAlpha: 1, y: 0 });
    return;
  });

  // ── 正常模式：分阶段 ScrollTrigger 触发 + once ──
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const dividers = section.querySelectorAll('.help-tl-stage');

    dividers.forEach((divider, stageIdx) => {
      // 收集该阶段 divider 之后的行（到下一个 divider 之前的所有行）
      const stageRows = [];
      let next = divider.nextElementSibling;
      while (next && !next.classList.contains('help-tl-stage')) {
        if (next.classList.contains('help-tl-row')) {
          stageRows.push(next);
        }
        next = next.nextElementSibling;
      }

      // 阶段标签入场
      gsap.from(divider, {
        autoAlpha: 0,
        scale: 0.9,
        duration: 0.4,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: divider,
          start: 'top 85%',
          once: true,
        },
      });

      // 阶段内行 stagger 入场
      if (stageRows.length) {
        gsap.from(stageRows, {
          autoAlpha: 0,
          y: 40,
          duration: 0.5,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: divider,
            start: 'top 80%',
            once: true,
          },
        });
      }
    });
  });
}

// ════════════════════════════════════════════════════════════════
//  Exploration Canvas v2 — 漫步 AI + 镜头 + 脚印 + 物件传递 + Beat 编排
// ════════════════════════════════════════════════════════════════

/**
 * 初始化 Exploration Canvas v2 系统
 * 核心理念：全屏 Canvas + RPG 风像素人自由漫步 + GSAP timeline 驱动 10 beat 编排
 * - 漫步 AI：WANDER/CONVERGE/INTERACT 状态机
 * - 镜头系统：camera 对象 + GSAP 动画推拉（全景→聚焦→拉回）
 * - 脚印粒子：walk 状态时每 8 帧生成，alpha -= 0.02 渐隐
 * - 物件传递：8 种像素物件，二次贝塞尔曲线飞行轨迹（约 1.2s）
 * - 滚动控制：scroll→tl.play()，stop 150ms→tl.pause()
 * - 字幕切换：tl.call 在 beat 开始时切换底部字幕
 * - reduced-motion 降级：角色静态显示
 */
function bindExplorationCanvas() {
  const section = document.querySelector('.help-exploration-section');
  const canvas = document.querySelector('.help-exploration-fullscreen-canvas');
  const subtitleEl = document.querySelector('.help-exploration-subtitle');
  const sceneTitleEl = document.querySelector('.help-exploration-scene-title'); // v15 场景标题
  if (!section || !canvas || !subtitleEl || !sceneTitleEl) return;

  // GSAP 未加载时降级：直接显示静态画面
  if (typeof gsap === 'undefined') return;
  const hasScrollTrigger = typeof ScrollTrigger !== 'undefined';
  if (hasScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // ── Canvas 尺寸管理 + DPR ──
  let cw = 0, ch = 0, dpr = 1;
  function resizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    cw = rect.width;
    ch = rect.height;
    canvas.width = Math.floor(cw * dpr);
    canvas.height = Math.floor(ch * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeCanvas();
  const ro = new ResizeObserver(resizeCanvas);
  ro.observe(canvas);
  window.addEventListener('resize', resizeCanvas);

  // ── 镜头系统 ──
  // 全景：zoom=1.0, x=cw/2, y=ch/2
  // 聚焦：zoom=1.8, x=交互区域中心, y=交互区域中心
  const camera = { x: cw / 2 || 400, y: ch / 2 || 300, zoom: 1.0 };

  // ── 角色实例化（按 CHARACTERS count 展开为个体） ──
  // 每个 agent 拥有独立位置/速度/状态/目标
  const agents = [];
  let agentIdSeq = 0;
  CHARACTERS.forEach(c => {
    for (let i = 0; i < c.count; i++) {
      // 初始位置：在 wanderZone 中心附近随机偏移
      const zx = c.wanderZone.cx * cw;
      const zy = c.wanderZone.cy * ch;
      agents.push({
        id: `${c.id}-${agentIdSeq++}`,
        charId: c.id,
        charData: c,
        // 当前位置（像素坐标）
        x: zx + (Math.random() - 0.5) * 40,
        y: zy + (Math.random() - 0.5) * 40,
        // 漫步目标
        targetX: zx,
        targetY: zy,
        // 朝向 1=右 -1=左
        facing: Math.random() > 0.5 ? 1 : -1,
        // 状态：'wander' | 'converge' | 'interact'
        state: 'wander',
        // 动画帧计数
        frame: Math.floor(Math.random() * 100),
        // 行走速度（px/s）
        speed: 35 + Math.random() * 15,
        // idle 计时器（到达目标后等待）
        idleTimer: 0,
        // 当前 beat 中的角色（from/to/extra）
        beatRole: null,
      });
    }
  });

  // ── 脚印粒子系统 ──
  // walk 状态时每 8 帧生成一个脚印，alpha 每帧 -= 0.02
  const footprints = [];
  // ── 飞行物件系统 ──
  // 二次贝塞尔曲线：起点→控制点（上方）→终点
  const flyingObjects = [];
  // ── 对话气泡系统（v13 新增）──
  // 像素风对话框：方角黑边框 + 白底 + 像素字体，气泡在说话者头顶
  const dialogueBubbles = [];
  // ── 短信气泡系统（v13 第二阶段新增）──
  // 室外→室内 texting：蓝色背景+白字，从画布左缘（室内方向）发出到达外出角色
  const textingBubbles = [];

  // ── 场景状态管理（v13 第二阶段新增）──
  // currentScene: 'indoor-meeting' | 'indoor-classroom' | 'indoor-library' | 'outdoor' | 'bus-transition'
  let currentScene = 'indoor-meeting';
  // v15: 当前 beat 对象（用于焦点高亮+方向箭头）
  let currentBeat = null;
  // 外出角色（beat4-6 室外可见）：organizer/normal/deep
  const OUTDOOR_CHAR_IDS = ['organizer', 'normal', 'deep'];
  // 公交车状态：{ active, x, doorOpen, passengers[], direction }
  const bus = { active: false, x: 0, doorOpen: false, passengers: [], direction: 1 };
  // 马赛克过渡进度 0~1（0=无过渡, 1=完全马赛克）
  let mosaicProgress = 0;
  // 当前转场方向：'to-outdoor' | 'to-indoor' | null
  let transitionDir = null;

  // ── 工具函数：从 charId 找一个 agent（首个匹配） ──
  function findAgent(charId) {
    return agents.find(a => a.charId === charId);
  }

  // ── 漫步 AI：选新目标 ──
  function pickNewWanderTarget(agent) {
    const z = agent.charData.wanderZone;
    // 在 wanderZone 椭圆内随机选点
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random();
    agent.targetX = (z.cx + Math.cos(angle) * z.rx * r) * cw;
    agent.targetY = (z.cy + Math.sin(angle) * z.ry * r) * ch;
    agent.facing = agent.targetX > agent.x ? 1 : -1;
    agent.idleTimer = 0;
  }

  // ── CONVERGE：让角色走到指定位置 ──
  function convergeTo(agent, tx, ty) {
    agent.state = 'converge';
    agent.targetX = tx;
    agent.targetY = ty;
    agent.facing = tx > agent.x ? 1 : -1;
    agent.speed = 55; // 聚拢时稍快
  }

  // ── INTERACT：面对面交互 ──
  function startInteract(agent) {
    agent.state = 'interact';
    agent.frame = 0;
  }

  // ── 生成飞行物件 ──
  // fromAgent → toAgent，物件沿弧线飞行约 1.2s
  function spawnFlyingObject(type, fromAgent, toAgent) {
    const startX = fromAgent.x;
    const startY = fromAgent.y - 60; // 从手部高度发出
    const endX = toAgent.x;
    const endY = toAgent.y - 60;
    // 控制点：中点上方一段距离，形成向上弧线
    const midX = (startX + endX) / 2;
    const midY = Math.min(startY, endY) - 80;
    flyingObjects.push({
      type,
      startX, startY,
      midX, midY,
      endX, endY,
      t: 0,
      duration: 1.2,
      alpha: 1,
      done: false,
    });
  }

  // ── 生成对话气泡（v13 新增）──
  // agent 说话，text 为台词，delay 为延迟弹出（秒）
  // 气泡生命周期：delay 等待 → 0.2s 弹出 → 1.8s 显示 → 0.3s 淡出 → 移除
  function spawnDialogueBubble(agent, text, delay) {
    dialogueBubbles.push({
      agent,        // 跟随的角色
      text,
      delay,        // 延迟弹出（秒）
      age: 0,       // 已存在时间（秒）
      // 生命周期阶段：'waiting' → 'popping' → 'showing' → 'fading' → 'done'
      phase: 'waiting',
      alpha: 0,
      scale: 0,
    });
  }

  // ── 生成短信气泡（v13 第二阶段新增）──
  // fromAgent（室外）发短信给 toCharId（室内），气泡从左缘飞向 fromAgent
  function spawnTextingBubble(fromAgent, text, toCharId, delay) {
    textingBubbles.push({
      fromAgent,
      text,
      toCharId,
      delay,
      age: 0,
      phase: 'waiting', // 'waiting' → 'flying' → 'showing' → 'fading' → 'done'
      alpha: 0,
      scale: 0,
      // 飞行起点（画布左缘，代表室内方向）
      startX: 20,
      startY: fromAgent ? fromAgent.y : ch / 2,
      // 飞行进度 0~1
      flyT: 0,
    });
  }

  // ════════════════════════════════════════════════════════════════
  // 场景背景绘制（v13 第二阶段新增）
  // ════════════════════════════════════════════════════════════════

  // ── 室内背景：4列隔间 + 代表性家具 ──
  // v15 布局：外墙 + 2×2 开放式小方块（会议室/教室/宿舍/图书馆）
  const WALL_THICK = 10;
  const WALL_COLOR = '#C4B498';
  const WALL_HIGHLIGHT = '#D4C4A8';
  const WALL_SHADOW = '#A49378';
  const ROOM_COLORS_V15 = [
    '#F5F0E8', // 会议室（暖米）
    '#E8EFF5', // 教室（冷蓝白）
    '#F0F5E8', // 宿舍（淡绿白）
    '#F5F0F5', // 图书馆（淡紫白）
  ];
  const ROOM_NAMES_V15 = ['会议室', '教室', '宿舍', '图书馆'];

  function drawIndoorBackground(ctx, cw, ch) {
    // 1. 整体地板底色
    ctx.fillStyle = '#FAFAF7';
    ctx.fillRect(0, 0, cw, ch);

    const ix = WALL_THICK, iy = WALL_THICK;
    const iw = cw - WALL_THICK * 2, ih = ch - WALL_THICK * 2;
    const halfW = iw / 2, halfH = ih / 2;

    // 2. 四个方块底色（2×2 网格）
    // [0]=左上(会议室) [1]=右上(教室) [2]=左下(宿舍) [3]=右下(图书馆)
    const rooms = [
      { x: ix,       y: iy,       w: halfW, h: halfH, color: ROOM_COLORS_V15[0], name: ROOM_NAMES_V15[0] },
      { x: ix+halfW, y: iy,       w: halfW, h: halfH, color: ROOM_COLORS_V15[1], name: ROOM_NAMES_V15[1] },
      { x: ix,       y: iy+halfH, w: halfW, h: halfH, color: ROOM_COLORS_V15[2], name: ROOM_NAMES_V15[2] },
      { x: ix+halfW, y: iy+halfH, w: halfW, h: halfH, color: ROOM_COLORS_V15[3], name: ROOM_NAMES_V15[3] },
    ];
    rooms.forEach(r => {
      ctx.fillStyle = r.color;
      ctx.fillRect(r.x, r.y, r.w, r.h);
    });

    // 3. 方块分隔线（细线，开放式无墙）
    ctx.strokeStyle = '#D1D5DB';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ix + halfW, iy);
    ctx.lineTo(ix + halfW, iy + ih); // 竖线
    ctx.moveTo(ix, iy + halfH);
    ctx.lineTo(ix + iw, iy + halfH); // 横线
    ctx.stroke();

    // 4. 外墙（厚边框，带高光阴影）
    ctx.fillStyle = WALL_COLOR;
    ctx.fillRect(0, 0, cw, WALL_THICK); // 上墙
    ctx.fillRect(0, ch - WALL_THICK, cw, WALL_THICK); // 下墙
    ctx.fillRect(0, 0, WALL_THICK, ch); // 左墙
    ctx.fillRect(cw - WALL_THICK, 0, WALL_THICK, ch); // 右墙
    // 高光（上沿+左沿）
    ctx.fillStyle = WALL_HIGHLIGHT;
    ctx.fillRect(0, 0, cw, 2);
    ctx.fillRect(0, 0, 2, ch);
    // 阴影（下沿+右沿）
    ctx.fillStyle = WALL_SHADOW;
    ctx.fillRect(0, ch - 2, cw, 2);
    ctx.fillRect(cw - 2, 0, 2, ch);

    // 5. 房间名称（每块左上角小标签）
    ctx.font = '600 12px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#9CA3AF';
    rooms.forEach(r => {
      ctx.fillText(r.name, r.x + 8, r.y + 6);
    });

    // 6. 家具（每块一种代表性家具，缩放适配方块大小）
    const p = 2;
    drawMeetingRoomFurniture(ctx, rooms[0], p);
    drawClassroomFurniture(ctx, rooms[1], p);
    drawDormFurniture(ctx, rooms[2], p);
    drawLibraryFurniture(ctx, rooms[3], p);
  }

  // 会议室家具：圆桌 + 椅子（适配方块）
  function drawMeetingRoomFurniture(ctx, room, p) {
    const cx = room.x + room.w / 2;
    const cy = room.y + room.h / 2;
    const tw = Math.min(room.w * 0.5, 70);
    const th = Math.min(room.h * 0.25, 20);
    // 桌子（椭圆感矩形，棕色）
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(cx - tw/2, cy - th/2, tw, th);
    ctx.fillStyle = '#A07D1A';
    ctx.fillRect(cx - tw/2, cy - th/2, tw, 3);
    // 椅子（左右各2把）
    ctx.fillStyle = '#6B4423';
    for (let i = 0; i < 2; i++) {
      const ox = cx - tw/2 - 12 + i * (tw + 16);
      ctx.fillRect(ox, cy - 5, 8, 10);
    }
  }

  // 教室家具：黑板 + 课桌排（适配方块）
  function drawClassroomFurniture(ctx, room, p) {
    const cx = room.x + room.w / 2;
    // 黑板（顶部）
    const bw = Math.min(room.w * 0.6, 60);
    ctx.fillStyle = '#1B4332';
    ctx.fillRect(cx - bw/2, room.y + 20, bw, 14);
    ctx.fillStyle = '#2D6A4F';
    ctx.fillRect(cx - bw/2, room.y + 20, bw, 3);
    // 课桌排（2排×3个）
    ctx.fillStyle = '#92400E';
    const dw = 14, dh = 8;
    for (let row = 0; row < 2; row++) {
      const y = room.y + 45 + row * 28;
      for (let col = 0; col < 3; col++) {
        const x = room.x + 12 + col * (dw + 6);
        ctx.fillRect(x, y, dw, dh);
      }
    }
  }

  // 宿舍家具：床 + 书桌（适配方块）
  function drawDormFurniture(ctx, room, p) {
    // 床（左下）
    const bw = Math.min(room.w * 0.4, 40);
    const bh = Math.min(room.h * 0.3, 22);
    ctx.fillStyle = '#3730A3';
    ctx.fillRect(room.x + 8, room.y + room.h - bh - 8, bw, bh);
    ctx.fillStyle = '#4F46E5';
    ctx.fillRect(room.x + 8, room.y + room.h - bh - 8, bw, 4);
    // 枕头
    ctx.fillStyle = '#E0E7FF';
    ctx.fillRect(room.x + 10, room.y + room.h - bh - 6, 12, 8);
    // 书桌（右上）
    const dw = Math.min(room.w * 0.35, 32);
    ctx.fillStyle = '#7C2D12';
    ctx.fillRect(room.x + room.w - dw - 8, room.y + 20, dw, 14);
    // 台灯
    ctx.fillStyle = '#FBBF24';
    ctx.fillRect(room.x + room.w - 12, room.y + 14, 4, 6);
  }

  // 图书馆家具：书架 + 阅读桌（适配方块）
  function drawLibraryFurniture(ctx, room, p) {
    // 书架（右侧）
    const sw = 14;
    const sx = room.x + room.w - sw - 6;
    const sy = room.y + 16;
    const sh = room.h - 24;
    ctx.fillStyle = '#451A03';
    ctx.fillRect(sx, sy, sw, sh);
    // 书脊
    const bookColors = ['#DC2626', '#2563EB', '#16A34A', '#CA8A04', '#7C3AED'];
    const shelfCount = Math.floor(sh / 16);
    for (let row = 0; row < shelfCount; row++) {
      const y = sy + 4 + row * 16;
      for (let b = 0; b < 2; b++) {
        ctx.fillStyle = bookColors[(row + b) % bookColors.length];
        ctx.fillRect(sx + 2 + b * 5, y, 4, 12);
      }
    }
    // 阅读桌（中央偏左）
    const tw = Math.min(room.w * 0.35, 30);
    ctx.fillStyle = '#92400E';
    ctx.fillRect(room.x + 10, room.y + room.h/2 - 6, tw, 12);
  }

  // ── 室外背景：红色教育基地 ──
  function drawOutdoorBackground(ctx, cw, ch) {
    // 天空（浅蓝渐变）
    const skyGrad = ctx.createLinearGradient(0, 0, 0, ch * 0.6);
    skyGrad.addColorStop(0, '#87CEEB');
    skyGrad.addColorStop(1, '#B0E0E6');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, cw, ch * 0.6);
    // 草地（绿色）
    const grassGrad = ctx.createLinearGradient(0, ch * 0.6, 0, ch);
    grassGrad.addColorStop(0, '#7CB342');
    grassGrad.addColorStop(1, '#558B2F');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, ch * 0.6, cw, ch * 0.4);
    // 地平线分隔
    ctx.strokeStyle = '#558B2F';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, ch * 0.6);
    ctx.lineTo(cw, ch * 0.6);
    ctx.stroke();

    // 左上：红旗（旗杆+红色旗面）
    const flagX = 40, flagY = 40;
    ctx.fillStyle = '#6B7280';
    ctx.fillRect(flagX, flagY, 2, 50); // 旗杆
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.moveTo(flagX + 2, flagY);
    ctx.lineTo(flagX + 22, flagY + 5);
    ctx.lineTo(flagX + 2, flagY + 12);
    ctx.closePath();
    ctx.fill();

    // 中央：纪念碑（灰色梯形底座+方尖碑）
    const monX = cw / 2;
    const monBaseY = ch * 0.6;
    // 底座
    ctx.fillStyle = '#6B7280';
    ctx.fillRect(monX - 30, monBaseY - 15, 60, 15);
    ctx.fillStyle = '#9CA3AF';
    ctx.fillRect(monX - 30, monBaseY - 15, 60, 3);
    // 方尖碑
    ctx.fillStyle = '#4B5563';
    ctx.fillRect(monX - 12, monBaseY - 80, 24, 65);
    ctx.fillStyle = '#6B7280';
    ctx.fillRect(monX - 12, monBaseY - 80, 24, 4);
    // 碑顶（尖）
    ctx.fillStyle = '#374151';
    ctx.beginPath();
    ctx.moveTo(monX - 12, monBaseY - 80);
    ctx.lineTo(monX, monBaseY - 92);
    ctx.lineTo(monX + 12, monBaseY - 80);
    ctx.closePath();
    ctx.fill();
    // 碑文（金色五角星）
    ctx.fillStyle = '#FBBF24';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', monX, monBaseY - 50);

    // 两侧：树木（树干+树冠）
    drawTree(ctx, 80, ch * 0.6);
    drawTree(ctx, cw - 80, ch * 0.6);
    drawTree(ctx, cw * 0.25, ch * 0.65);
    drawTree(ctx, cw * 0.75, ch * 0.65);
  }

  function drawTree(ctx, x, baseY) {
    // 树干
    ctx.fillStyle = '#78350F';
    ctx.fillRect(x - 4, baseY - 20, 8, 20);
    // 树冠（三层绿色圆）
    ctx.fillStyle = '#2D6A4F';
    ctx.beginPath();
    ctx.arc(x, baseY - 30, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#40916C';
    ctx.beginPath();
    ctx.arc(x - 5, baseY - 35, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 5, baseY - 35, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── 像素公交车（侧视图）──
  // bus.x = 公交车左侧 x 坐标，doorOpen = 车门是否打开
  function drawBus(ctx, x, y, doorOpen) {
    const p = 2; // 像素单元
    // 车身（黄色）
    ctx.fillStyle = '#FBBF24';
    ctx.fillRect(x, y, 64 * p, 20 * p);
    // 车顶圆角
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(x + 2 * p, y - 2 * p, 60 * p, 2 * p);
    // 车窗（黑色排）
    ctx.fillStyle = '#1E293B';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(x + (6 + i * 14) * p, y + 3 * p, 10 * p, 6 * p);
    }
    // 车门（右侧，可开/关）
    if (doorOpen) {
      // 门打开：显示门框
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(x + 54 * p, y + 3 * p, 8 * p, 14 * p);
      ctx.strokeStyle = '#92400E';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 54 * p, y + 3 * p, 8 * p, 14 * p);
    } else {
      // 门关闭：黑色窗
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(x + 54 * p, y + 3 * p, 8 * p, 10 * p);
    }
    // 车轮（黑色圆）
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.arc(x + 12 * p, y + 20 * p, 4 * p, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 52 * p, y + 20 * p, 4 * p, 0, Math.PI * 2);
    ctx.fill();
    // 轮毂（灰色）
    ctx.fillStyle = '#9CA3AF';
    ctx.beginPath();
    ctx.arc(x + 12 * p, y + 20 * p, 1.5 * p, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 52 * p, y + 20 * p, 1.5 * p, 0, Math.PI * 2);
    ctx.fill();
    // 前灯
    ctx.fillStyle = '#FEF3C7';
    ctx.fillRect(x + 62 * p, y + 10 * p, 2 * p, 2 * p);
  }

  // ── 像素马赛克过渡 ──
  // progress 0~1：0=无马赛克，1=完全马赛克（大色块）
  function drawMosaicTransition(ctx, cw, ch, progress) {
    if (progress <= 0) return;
    // 马赛克块大小随 progress 增大（4px → 32px）
    const blockSize = Math.max(4, Math.floor(4 + progress * 28));
    ctx.save();
    ctx.globalAlpha = progress;
    for (let y = 0; y < ch; y += blockSize) {
      for (let x = 0; x < cw; x += blockSize) {
        // 取块中心点的颜色（采样）
        const px = Math.floor(x + blockSize / 2);
        const py = Math.floor(y + blockSize / 2);
        const data = ctx.getImageData(px, py, 1, 1).data;
        ctx.fillStyle = `rgb(${data[0]},${data[1]},${data[2]})`;
        ctx.fillRect(x, y, blockSize, blockSize);
      }
    }
    ctx.restore();
  }

  // ── 短信气泡绘制（蓝色背景+白字）──
  function drawTextingBubbleCanvas(ctx, bubble) {
    if (bubble.alpha <= 0.01) return;
    const agent = bubble.fromAgent;
    if (!agent) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, bubble.alpha);
    // 气泡位置：跟随 fromAgent（室外角色），但从左缘飞来
    let cx, cy;
    if (bubble.phase === 'flying') {
      // 飞行中：从左缘到 fromAgent 位置插值
      const t = bubble.flyT;
      cx = bubble.startX + (agent.x - bubble.startX) * t;
      cy = bubble.startY + (agent.y - 30 - bubble.startY) * t;
    } else {
      // 到达后：停在 fromAgent 头顶
      cx = agent.x;
      cy = agent.y - 30;
    }
    const fontSize = 11;
    ctx.font = `600 ${fontSize}px "Noto Sans SC", "PingFang SC", sans-serif`;
    const textWidth = ctx.measureText(bubble.text).width;
    const padX = 8, padY = 5;
    const bubbleW = textWidth + padX * 2 + 14; // 多留 14px 给短信图标
    const bubbleH = fontSize + padY * 2;
    ctx.translate(cx, cy);
    ctx.scale(bubble.scale, bubble.scale);
    ctx.translate(-cx, -cy);
    // 蓝色背景
    ctx.fillStyle = '#3B82F6';
    ctx.fillRect(cx - bubbleW / 2, cy - bubbleH / 2, bubbleW, bubbleH);
    // 短信图标（白色小信封）
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(cx - bubbleW / 2 + 4, cy - 3, 6, 4);
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - bubbleW / 2 + 4, cy - 3);
    ctx.lineTo(cx - bubbleW / 2 + 7, cy);
    ctx.lineTo(cx - bubbleW / 2 + 10, cy - 3);
    ctx.stroke();
    // 文字（白色）
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(bubble.text, cx + 7, cy);
    // 尾巴（指向左缘=室内方向）
    ctx.fillStyle = '#3B82F6';
    ctx.beginPath();
    ctx.moveTo(cx - bubbleW / 2, cy);
    ctx.lineTo(cx - bubbleW / 2 - 6, cy - 4);
    ctx.lineTo(cx - bubbleW / 2 - 6, cy + 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ── 渲染主循环（requestAnimationFrame） ──
  let lastTime = performance.now();
  let rafId = null;
  let isRunning = false;

  function update(dt) {
    // 更新角色
    agents.forEach(agent => {
      agent.frame++;
      if (agent.state === 'wander') {
        // 漫步：朝目标走，到达后 idle 一段时间再选新目标
        const dx = agent.targetX - agent.x;
        const dy = agent.targetY - agent.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 4) {
          // 到达，进入 idle
          agent.idleTimer += dt;
          if (agent.idleTimer > 1 + Math.random() * 2) {
            pickNewWanderTarget(agent);
          }
        } else {
          // 朝目标移动
          const vx = (dx / dist) * agent.speed;
          const vy = (dy / dist) * agent.speed;
          agent.x += vx * dt;
          agent.y += vy * dt;
          // walk 状态时每 8 帧生成一个脚印
          if (agent.frame % 8 === 0) {
            footprints.push({
              x: agent.x,
              y: agent.y,
              alpha: 0.6,
              color: agent.charData.pants,
              direction: agent.facing,
            });
          }
        }
      } else if (agent.state === 'converge') {
        // 聚拢：走到目标位置
        const dx = agent.targetX - agent.x;
        const dy = agent.targetY - agent.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 6) {
          // 到达聚拢位置，进入 interact
          startInteract(agent);
        } else {
          const vx = (dx / dist) * agent.speed;
          const vy = (dy / dist) * agent.speed;
          agent.x += vx * dt;
          agent.y += vy * dt;
          if (agent.frame % 8 === 0) {
            footprints.push({
              x: agent.x,
              y: agent.y,
              alpha: 0.6,
              color: agent.charData.pants,
              direction: agent.facing,
            });
          }
        }
      } else if (agent.state === 'interact') {
        // 交互：原地播放 action 动画（手臂前伸/上举）
        // 由 beat timeline 控制 state 切换回 wander
      }
    });

    // 更新脚印（alpha 递减）
    for (let i = footprints.length - 1; i >= 0; i--) {
      footprints[i].alpha -= 0.02;
      if (footprints[i].alpha <= 0) {
        footprints.splice(i, 1);
      }
    }

    // 更新飞行物件（贝塞尔曲线插值）
    for (let i = flyingObjects.length - 1; i >= 0; i--) {
      const obj = flyingObjects[i];
      obj.t += dt / obj.duration;
      if (obj.t >= 1) {
        obj.t = 1;
        obj.done = true;
      }
    }
    // 清理已完成物件（短暂淡出后移除）
    for (let i = flyingObjects.length - 1; i >= 0; i--) {
      if (flyingObjects[i].done) {
        flyingObjects[i].alpha -= 0.05;
        if (flyingObjects[i].alpha <= 0) {
          flyingObjects.splice(i, 1);
        }
      }
    }

    // 更新对话气泡（v13 新增）
    // 生命周期：waiting(delay) → popping(0.2s) → showing(1.8s) → fading(0.3s) → done
    for (let i = dialogueBubbles.length - 1; i >= 0; i--) {
      const b = dialogueBubbles[i];
      b.age += dt;
      if (b.phase === 'waiting') {
        if (b.age >= b.delay) {
          b.phase = 'popping';
          b.age = 0;
        }
      } else if (b.phase === 'popping') {
        // 0.2s 弹出：scale 0→1, alpha 0→1
        const p = Math.min(1, b.age / 0.2);
        b.scale = p;
        b.alpha = p;
        if (p >= 1) {
          b.phase = 'showing';
          b.age = 0;
        }
      } else if (b.phase === 'showing') {
        // 1.8s 显示
        b.scale = 1;
        b.alpha = 1;
        if (b.age >= 1.8) {
          b.phase = 'fading';
          b.age = 0;
        }
      } else if (b.phase === 'fading') {
        // 0.3s 淡出
        const p = Math.min(1, b.age / 0.3);
        b.alpha = 1 - p;
        if (p >= 1) {
          b.phase = 'done';
        }
      }
      // 移除已完成气泡
      if (b.phase === 'done') {
        dialogueBubbles.splice(i, 1);
      }
    }

    // 更新短信气泡（v13 第二阶段新增）
    // 生命周期：waiting(delay) → flying(0.6s) → showing(1.5s) → fading(0.3s) → done
    for (let i = textingBubbles.length - 1; i >= 0; i--) {
      const b = textingBubbles[i];
      b.age += dt;
      if (b.phase === 'waiting') {
        if (b.age >= b.delay) {
          b.phase = 'flying';
          b.age = 0;
        }
      } else if (b.phase === 'flying') {
        // 0.6s 飞行：从左缘飞向 fromAgent
        b.flyT = Math.min(1, b.age / 0.6);
        b.alpha = b.flyT;
        b.scale = 0.5 + b.flyT * 0.5;
        if (b.flyT >= 1) {
          b.phase = 'showing';
          b.age = 0;
          b.scale = 1;
        }
      } else if (b.phase === 'showing') {
        // 1.5s 显示
        b.alpha = 1;
        b.scale = 1;
        if (b.age >= 1.5) {
          b.phase = 'fading';
          b.age = 0;
        }
      } else if (b.phase === 'fading') {
        // 0.3s 淡出
        const p = Math.min(1, b.age / 0.3);
        b.alpha = 1 - p;
        if (p >= 1) {
          b.phase = 'done';
        }
      }
      if (b.phase === 'done') {
        textingBubbles.splice(i, 1);
      }
    }

    // 更新公交车位置（v13 第二阶段新增）
    if (bus.active) {
      // 公交车按 direction 方向移动（80px/s）
      bus.x += bus.direction * 80 * dt;
    }
  }

  function render() {
    // 1. 清空 Canvas
    ctx.clearRect(0, 0, cw, ch);

    // 1.5 绘制场景背景（v13 第二阶段新增：根据 currentScene 切换）
    if (currentScene === 'outdoor' || (transitionDir === 'to-indoor' && mosaicProgress > 0.5)) {
      drawOutdoorBackground(ctx, cw, ch);
    } else if (currentScene === 'bus-transition' && transitionDir === 'to-outdoor' && mosaicProgress < 0.5) {
      // 转场前半段：显示室内背景
      drawIndoorBackground(ctx, cw, ch);
    } else if (currentScene === 'bus-transition' && transitionDir === 'to-indoor' && mosaicProgress < 0.5) {
      // 转场前半段（回程）：显示室外背景
      drawOutdoorBackground(ctx, cw, ch);
    } else {
      // 默认室内背景
      drawIndoorBackground(ctx, cw, ch);
    }

    // 2. 应用镜头变换（v13：固定视角，不推拉）
    ctx.save();
    ctx.translate(cw / 2, ch / 2);
    ctx.scale(1.0, 1.0); // 固定 zoom=1.0，保持像素游戏一贯做法
    ctx.translate(-camera.x, -camera.y);

    // 3. 绘制脚印粒子层
    footprints.forEach(fp => {
      ctx.save();
      ctx.globalAlpha = fp.alpha;
      ctx.fillStyle = fp.color;
      // 小椭圆 4×2px，方向跟随角色朝向
      ctx.translate(fp.x, fp.y);
      ctx.scale(fp.direction, 1);
      ctx.beginPath();
      ctx.ellipse(0, 0, 2, 1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 4. 绘制角色层（v13 第二阶段：outdoor 场景只显示外出角色 + _hidden 检查）
    // v15：焦点高亮——当前 beat 的 from/to/extra 角色放大+光环，其他角色降不透明度
    const baseP = 2; // 像素单元基础大小
    const isOutdoor = currentScene === 'outdoor';
    agents.forEach(agent => {
      // 转场期间角色上车后隐藏
      if (agent._hidden) return;
      // outdoor 场景时，隐藏留守角色（非 OUTDOOR_CHAR_IDS）
      if (isOutdoor && !OUTDOOR_CHAR_IDS.includes(agent.charId)) return;

      // v15: 判断是否焦点角色
      const isFocus = currentBeat && (
        agent.charId === currentBeat.from ||
        agent.charId === currentBeat.to ||
        (currentBeat.extraFrom && agent.charId === currentBeat.extraFrom) ||
        (currentBeat.extraTo && agent.charId === currentBeat.extraTo)
      );

      // 焦点角色：放大+光环+全不透明；非焦点：缩小+降不透明度
      const scl = isFocus ? 1.4 : 1.1;
      const opacity = isFocus ? 1.0 : 0.6;

      // 焦点光环（在角色下方绘制）
      if (isFocus) {
        drawFocusRing(ctx, agent.x, agent.y, baseP, agent.charData.cloth);
      }

      // 根据 state 决定动作
      let action = 'idle';
      if (agent.state === 'converge') action = 'walk';
      else if (agent.state === 'interact') action = 'interact';

      drawPixelCharacter(
        ctx,
        agent.x,
        agent.y,
        agent.charData,
        baseP,
        scl,
        opacity,
        action,
        agent.frame,
        agent.facing
      );
      // 角色名称标签（焦点时加大+角色色）
      drawCharacterLabel(
        ctx,
        agent.x,
        agent.y,
        agent.charData.name,
        baseP,
        scl,
        opacity,
        isFocus ? 1.0 : 0.75
      );
    });

    // 4.5 v15: 绘制方向箭头（from→to）—— 在角色层之上，物件层之下
    if (currentBeat && currentBeat.type !== 'texting' && currentBeat.from && currentBeat.to) {
      const fromAgent = findAgent(currentBeat.from);
      const toAgent = findAgent(currentBeat.to);
      if (fromAgent && toAgent && !fromAgent._hidden && !toAgent._hidden) {
        // outdoor 场景只画外出角色的箭头
        const fromVisible = !isOutdoor || OUTDOOR_CHAR_IDS.includes(fromAgent.charId);
        const toVisible = !isOutdoor || OUTDOOR_CHAR_IDS.includes(toAgent.charId);
        if (fromVisible && toVisible) {
          drawDirectionArrow(ctx, fromAgent, toAgent);
        }
      }
    }

    // 5. 绘制飞行物件层
    flyingObjects.forEach(obj => {
      // 二次贝塞尔曲线插值
      const t = obj.t;
      const oneMinusT = 1 - t;
      const x = oneMinusT * oneMinusT * obj.startX + 2 * oneMinusT * t * obj.midX + t * t * obj.endX;
      const y = oneMinusT * oneMinusT * obj.startY + 2 * oneMinusT * t * obj.midY + t * t * obj.endY;
      drawPixelObject(ctx, obj.type, x, y, 1.0, obj.alpha);
    });

    // 5.5 绘制公交车层（v13 第二阶段新增）—— 在角色和物件之间
    if (bus.active) {
      drawBus(ctx, bus.x, ch * 0.5, bus.doorOpen);
    }

    // 6. 绘制对话气泡层（v13 新增）—— 在角色和物件之上
    dialogueBubbles.forEach(b => {
      if (b.phase === 'waiting' || b.phase === 'done') return;
      drawDialogueBubbleCanvas(ctx, b);
    });

    // 6.5 绘制短信气泡层（v13 第二阶段新增）—— 蓝色 texting
    textingBubbles.forEach(b => {
      if (b.phase === 'waiting' || b.phase === 'done') return;
      drawTextingBubbleCanvas(ctx, b);
    });

    // 7. 恢复变换
    ctx.restore();

    // 8. 绘制马赛克过渡（v13 第二阶段新增）—— 在最上层，不受镜头变换影响
    if (mosaicProgress > 0) {
      drawMosaicTransition(ctx, cw, ch, mosaicProgress);
    }
  }

  function loop(now) {
    if (!isRunning) return;
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    update(dt);
    render();
    rafId = requestAnimationFrame(loop);
  }

  function startLoop() {
    if (isRunning) return;
    isRunning = true;
    lastTime = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    isRunning = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  // ── 10 Beat 编排：GSAP timeline ──
  // 每个 beat = 全景(0.5s) → 推进(0.5s) → 聚焦交互(2.5s) → 拉回全景(0.5s)
  // beat.duration 总共约 4s，但 timeline 时间按 beat.time 跳转
  const beatTL = gsap.timeline({ paused: true });

  // v15: 根据 beat 返回场景标题（顶部显示）
  function getSceneTitle(beat) {
    if (!beat) return '';
    if (beat.scene === 'outdoor') return '活动故事 · 室外参访';
    if (beat.time < 28) return '活动故事 · 室内策划';
    return '专班故事 · 室内协作';
  }

  // 计算交互区域中心（v13 第二阶段：根据 scene 返回不同隔间位置）
  function getConvergeCenter(scene) {
    // v15: 2×2 网格布局，中心点对应方块中心
    if (scene === 'outdoor') {
      return { x: cw / 2, y: ch * 0.65 }; // 红色教育基地中央（草地）
    } else if (scene === 'indoor-meeting') {
      return { x: cw * 0.25, y: ch * 0.25 }; // 会议室（左上）
    } else if (scene === 'indoor-classroom') {
      return { x: cw * 0.75, y: ch * 0.25 }; // 教室（右上）
    } else if (scene === 'indoor-library') {
      return { x: cw * 0.75, y: ch * 0.75 }; // 图书馆（右下）
    }
    return { x: cw / 2, y: ch / 2 };
  }

  // 为每对交互角色计算聚拢位置（两人面对面，间距约 60px）
  function getConvergePositions(fromAgent, toAgent, scene) {
    const center = getConvergeCenter(scene);
    // from 在左，to 在右
    return {
      from: { x: center.x - 30, y: center.y },
      to: { x: center.x + 30, y: center.y },
    };
  }

  // ── 公交车转场动画（v13 第二阶段新增）──
  // direction: 'to-outdoor' | 'to-indoor'，duration: 总时长（秒）
  function playBusTransition(direction, duration) {
    transitionDir = direction;
    const tl = gsap.timeline();
    const d = duration;

    // 阶段1：外出角色走向上车点 + 公交车从左驶入（d*0.25）
    tl.call(() => {
      currentScene = 'bus-transition';
      bus.active = true;
      bus.doorOpen = false;
      OUTDOOR_CHAR_IDS.forEach(charId => {
        const agent = findAgent(charId);
        if (agent) convergeTo(agent, cw - 80, ch * 0.5);
      });
    });
    tl.fromTo(bus, { x: -150 }, { x: cw - 130, duration: d * 0.25, ease: 'power2.out' });

    // 阶段2：开门 + 角色上车 + 关门（d*0.2）
    tl.call(() => { bus.doorOpen = true; });
    tl.call(() => {
      OUTDOOR_CHAR_IDS.forEach(charId => {
        const agent = findAgent(charId);
        if (agent) agent._hidden = true;
      });
    }, null, '+=0.3');
    tl.call(() => { bus.doorOpen = false; }, null, '+=0.3');

    // 阶段3：公交车驶出右 + 马赛克过渡（d*0.2）
    tl.to(bus, { x: cw + 50, duration: d * 0.15, ease: 'power2.in' });
    tl.to({ p: 0 }, { p: 1, duration: d * 0.1, onUpdate: function() { mosaicProgress = this.targets()[0].p; } });

    // 阶段4：场景切换 + 马赛克消散（d*0.15）
    tl.call(() => {
      if (direction === 'to-outdoor') {
        currentScene = 'outdoor';
      } else {
        currentScene = 'indoor-meeting';
      }
      OUTDOOR_CHAR_IDS.forEach(charId => {
        const agent = findAgent(charId);
        if (agent) {
          agent._hidden = false;
          if (direction === 'to-outdoor') {
            agent.x = 60 + Math.random() * 80;
            agent.y = ch * 0.65 + (Math.random() - 0.5) * 40;
          } else {
            agent.x = 40 + Math.random() * 60;
            agent.y = ch / 2 + (Math.random() - 0.5) * 40;
          }
          agent.state = 'wander';
          pickNewWanderTarget(agent);
        }
      });
    });
    tl.to({ p: 1 }, { p: 0, duration: d * 0.1, onUpdate: function() { mosaicProgress = this.targets()[0].p; }, onComplete: () => { mosaicProgress = 0; transitionDir = null; } });

    // 阶段5：公交车从左驶入 + 到达 + 开门 + 关门 + 驶出（d*0.2）
    tl.fromTo(bus, { x: -150 }, { x: 30, duration: d * 0.12, ease: 'power2.out', onStart: () => { bus.doorOpen = false; } });
    tl.call(() => { bus.doorOpen = true; });
    tl.call(() => { bus.doorOpen = false; }, null, '+=0.3');
    tl.to(bus, { x: cw + 50, duration: d * 0.08, ease: 'power2.in' });
    tl.call(() => { bus.active = false; });
  }

  BEATS.forEach((beat, idx) => {
    const t = beat.time;
    // beat 内部节奏：0.0 字幕+场景切换 → 0.5 聚拢 → 1.5 交互+物件+对话气泡 → 3.5 恢复漫步
    // v13 第二阶段：新增 scene 切换 + texting 类型处理
    // v15：设置 currentBeat 用于焦点高亮+方向箭头
    beatTL.call(() => {
      // beat 开始：切字幕 + 切场景
      currentBeat = beat;
      subtitleEl.textContent = beat.subtitle;
      gsap.fromTo(subtitleEl,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3 }
      );
      // v15: 切换场景标题（顶部）
      const title = getSceneTitle(beat);
      if (title && sceneTitleEl.textContent !== title) {
        sceneTitleEl.textContent = title;
        gsap.fromTo(sceneTitleEl,
          { opacity: 0, y: -10 },
          { opacity: 1, y: 0, duration: 0.4 }
        );
      }
      // 切换场景（v13 第二阶段新增）
      if (beat.scene) {
        currentScene = beat.scene;
      }
    }, null, t);

    // texting 类型 beat：只生成短信气泡，不聚拢角色（to 角色在室内不可见）
    if (beat.type === 'texting') {
      beatTL.call(() => {
        const fromAgent = findAgent(beat.from);
        if (fromAgent && beat.texting) {
          // fromAgent（室外）发短信给 toCharId（室内）
          startInteract(fromAgent);
          spawnTextingBubble(fromAgent, beat.texting.from, beat.to, 0);
          // 回复气泡（延迟 0.8s）
          spawnTextingBubble(fromAgent, beat.texting.to, beat.to, 0.8);
        }
      }, null, t + 1.0);

      // 恢复漫步
      beatTL.call(() => {
        const fromAgent = findAgent(beat.from);
        if (fromAgent) {
          fromAgent.state = 'wander';
          fromAgent.speed = 35 + Math.random() * 15;
          pickNewWanderTarget(fromAgent);
        }
      }, null, t + 3.5);
      return;
    }

    // 聚拢（t+0.5）：from 和 to 角色走到交互位置
    beatTL.call(() => {
      const fromAgent = findAgent(beat.from);
      const toAgent = findAgent(beat.to);
      if (fromAgent && toAgent) {
        const pos = getConvergePositions(fromAgent, toAgent, beat.scene);
        convergeTo(fromAgent, pos.from.x, pos.from.y);
        convergeTo(toAgent, pos.to.x, pos.to.y);
        fromAgent.facing = 1; // 朝右（面向 to）
        toAgent.facing = -1; // 朝左（面向 from）
      }
      // extra 角色（如有）
      if (beat.extraFrom && beat.extraTo) {
        const ef = findAgent(beat.extraFrom);
        const et = findAgent(beat.extraTo);
        if (ef && et) {
          const center = getConvergeCenter(beat.scene);
          convergeTo(ef, center.x - 30, center.y + 80);
          convergeTo(et, center.x + 30, center.y + 80);
          ef.facing = 1;
          et.facing = -1;
        }
      }
    }, null, t + 0.5);

    // 交互+物件+对话气泡（t+1.5）：角色进入 interact 状态，物件飞行，气泡弹出
    beatTL.call(() => {
      const fromAgent = findAgent(beat.from);
      const toAgent = findAgent(beat.to);
      if (fromAgent && toAgent) {
        startInteract(fromAgent);
        startInteract(toAgent);
        // 物件传递（如 beat.object 不为空）
        if (beat.object) {
          spawnFlyingObject(beat.object, fromAgent, toAgent);
        }
        // 对话气泡（v13 新增）
        if (beat.dialogue) {
          spawnDialogueBubble(fromAgent, beat.dialogue.from, 0);
          spawnDialogueBubble(toAgent, beat.dialogue.to, 0.8);
        }
      }
      if (beat.extraFrom && beat.extraTo && beat.extraObject) {
        const ef = findAgent(beat.extraFrom);
        const et = findAgent(beat.extraTo);
        if (ef && et) {
          startInteract(ef);
          startInteract(et);
          spawnFlyingObject(beat.extraObject, ef, et);
        }
      }
    }, null, t + 1.5);

    // 恢复漫步（t+3.5）——v13：删除镜头拉回，只恢复角色状态
    beatTL.call(() => {
      // 所有参与交互的角色回到 wander
      const fromAgent = findAgent(beat.from);
      const toAgent = findAgent(beat.to);
      if (fromAgent) {
        fromAgent.state = 'wander';
        fromAgent.speed = 35 + Math.random() * 15;
        pickNewWanderTarget(fromAgent);
      }
      if (toAgent) {
        toAgent.state = 'wander';
        toAgent.speed = 35 + Math.random() * 15;
        pickNewWanderTarget(toAgent);
      }
      if (beat.extraFrom) {
        const ef = findAgent(beat.extraFrom);
        if (ef) {
          ef.state = 'wander';
          pickNewWanderTarget(ef);
        }
      }
      if (beat.extraTo) {
        const et = findAgent(beat.extraTo);
        if (et) {
          et.state = 'wander';
          pickNewWanderTarget(et);
        }
      }
    }, null, t + 3.5);
  });

  // ── 转场触发（v13 第二阶段新增）──
  // beat3→beat4 转场（time:12-16）：indoor→outdoor
  beatTL.call(() => {
    playBusTransition('to-outdoor', 4);
  }, null, 12);

  // v15: beat3→beat4 转场期间显示过渡叙事
  beatTL.call(() => {
    currentBeat = null; // 转场期间清除焦点
    sceneTitleEl.textContent = '外出参访 · 途中';
    gsap.fromTo(sceneTitleEl,
      { opacity: 0, y: -10 },
      { opacity: 1, y: 0, duration: 0.4 }
    );
    subtitleEl.textContent = '前往红色教育基地';
    gsap.fromTo(subtitleEl,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.3 }
    );
  }, null, 12.5);

  // beat6→beat7 转场（time:28-32）：outdoor→indoor
  beatTL.call(() => {
    playBusTransition('to-indoor', 4);
  }, null, 28);

  // v15: beat6→beat7 转场期间显示故事过渡叙事（活动→专班）
  beatTL.call(() => {
    currentBeat = null; // 转场期间清除焦点
    sceneTitleEl.textContent = '活动结束 → 专班启动';
    gsap.fromTo(sceneTitleEl,
      { opacity: 0, y: -10 },
      { opacity: 1, y: 0, duration: 0.4 }
    );
    subtitleEl.textContent = '活动告一段落，新的专班工作即将开始';
    gsap.fromTo(subtitleEl,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.3 }
    );
  }, null, 28.5);

  // timeline 结束后：所有角色继续漫步
  beatTL.call(() => {
    currentBeat = null; // v15：清除焦点
    agents.forEach(a => {
      a.state = 'wander';
      pickNewWanderTarget(a);
    });
  }, null, BEATS[BEATS.length - 1].time + 4);

  // ── reduced-motion 降级 ──
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    agents.forEach(a => {
      const z = a.charData.wanderZone;
      a.x = z.cx * cw;
      a.y = z.cy * ch;
      a.state = 'idle';
    });
    render();
    subtitleEl.textContent = BEATS[0].subtitle;
    subtitleEl.style.opacity = '1';
    return;
  }

  // ── 滚动控制：ScrollTrigger pin + 自动播放（v15: 动画结束前画布固定不随滚动移动）──
  let hasStarted = false;
  let explorationPin = null;

  function startExploration() {
    if (!hasStarted) {
      hasStarted = true;
      startLoop();
    }
    // 创建 pin：固定画布，动画期间不随滚动移动
    if (!explorationPin && hasScrollTrigger) {
      explorationPin = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: '+=200000',
        pin: true,
        pinSpacing: true,
        invalidateOnRefresh: true,
      });
    }
    beatTL.play();
  }

  function stopExploration() {
    beatTL.pause(0);
    hasStarted = false;
    if (explorationPin) {
      explorationPin.kill();
      explorationPin = null;
    }
  }

  if (hasScrollTrigger) {
    // v15: ScrollTrigger pin 模式——画布进入视口后固定，动画自动播放，完成后释放
    ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      onEnter: startExploration,
      onLeaveBack: stopExploration,
    });

    // 动画完成时：释放 pin，平滑滚动到下一个 section
    beatTL.eventCallback('onComplete', () => {
      if (explorationPin) {
        explorationPin.kill();
        explorationPin = null;
      }
      setTimeout(() => {
        const next = section.nextElementSibling;
        if (next) {
          next.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 200);
    });
  } else {
    // 降级：旧的 scroll 事件控制（ScrollTrigger 不可用时）
    let scrollTimeout = null;
    let isPlaying = false;
    function isInExplorationViewport() {
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight;
      return rect.top < vh * 0.7 && rect.bottom > vh * 0.3;
    }
    function onScrollFallback() {
      if (!isInExplorationViewport()) return;
      if (!hasStarted) {
        hasStarted = true;
        startLoop();
        beatTL.play();
        isPlaying = true;
        return;
      }
      if (!isPlaying) {
        beatTL.play();
        isPlaying = true;
        if (!isRunning) startLoop();
      }
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        beatTL.pause();
        isPlaying = false;
        agents.forEach(a => {
          if (a.state !== 'wander') {
            a.state = 'wander';
            pickNewWanderTarget(a);
          }
        });
      }, 150);
    }
    window.addEventListener('scroll', onScrollFallback, { passive: true });
    onScrollFallback();
  }
}

// ════════════════════════════════════════════════════════════════
//  启动
// ════════════════════════════════════════════════════════════════

renderHelpContent();
bindTimelineToggle();
bindTOC();
bindPageAnimations();
bindExplorationCanvas();
