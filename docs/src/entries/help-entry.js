// role: [工程师]+[AI]
// entries/help-entry.js — 帮助页入口 v13（讲我们支部的故事）
// 核心理念：从"关系网络"到"支部的故事"——以党员成长为主线，讲清考察、工作哲学、探索与对话
// 设计风格：苹果风（纯白 + 大留白 + 大字体 + 微妙动画）
// 签名元素：【管理事，服务人】收束点题 + Exploration SVG 关系网络
// v13 变更：Exploration 从 Canvas 像素人动画切换为 SVG 关系网络脉动（Living Constellation v5.2），保留 13 步 Development 时间轴 + GSAP 动画
// v12 变更：Exploration Canvas v2 重构——全屏沉浸 + RPG 风像素人（12×20）+ 自由漫步 AI + 镜头推拉 + 脚印粒子 + 物件传递 + 10 beat 编排 + 滚动控制 + 底部字幕
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

// 活动关系网络（签名元素）：8 个角色节点 + 三类流（派活交付/报备告知/横向配合）
// 逻辑校准（D-207 衍生）：组织者是活动执行核心（脑子），党小组组长是发起者（创建活动+赋权组织者）
//   党小组组长可以是组织者，也可以不是——这是两个不同角色，有时由同一人担任
// v4.3.6 校准：4 层节点布局消除线交叠（书记顶/党小组组长+宣传上层/组织者+纪检中层/组织委员+参与者底层）；
//   报备改双向边（organizer↔secretary，label"报备/审批"）显性化书记审批反馈；
//   删除 secretary↔organizer collab 边（与报备边物理重合，由双向报备边替代）；
//   动画区分对待：task 用 dashoffset 绘制（有方向），info/collab 用 opacity 渐显（保留 CSS 虚线/点线）；
//   组织委员不归档宣传素材，只收集考察记录+维护人才库（duty 维持 v4.3.5）
// 节点布局：4 层结构——L1 书记(顶) / L2 党小组组长+宣传(上) / L3 组织者+纪检(中) / L4 组织委员+深度+普通(底)
// stage 字段：scroll-driven animation 的"信息出现顺序"分组（0=起点, 5=人才库更新终点）
// detail 字段：连线 tooltip 详情（回答"汇报什么？提交什么？"）
const ACTIVITY_NETWORK = {
  viewBox: '0 0 800 600',
  nodes: [
    // L1 顶部——书记居中（屋顶，视觉核心）：审批报备+横向配合
    { id: 'secretary',  name: '党支书',     x: 400, y: 60,  color: '#B91C1C', duty: '审批报备', stage: 1 },
    // L2 上层左——党小组组长（发起者：创建活动+赋权组织者）
    { id: 'leader',     name: '党小组组长', x: 140, y: 200, color: '#22C55E', duty: '发起者', stage: 0 },
    // L3 中层——组织者居中（执行核心·脑子），承接党小组组长赋权，负责分工/协调/报备
    { id: 'organizer',  name: '组织者',     x: 400, y: 320, color: '#7DD3FC', duty: '执行核心（脑子）', stage: 0 },
    // L4 底层——深度参与者（承担分工·手）
    { id: 'deep',       name: '深度参与者', x: 300, y: 500, color: '#94a3b8', duty: '承担分工（手）', stage: 2 },
    // L4 底层——普通参与者（按通知出席）
    { id: 'normal',     name: '普通参与者', x: 500, y: 500, color: '#6B7280', duty: '按通知出席', stage: 3 },
    // L2 上层右——宣传委员（宣传报道）
    { id: 'prop-commissioner', name: '宣传委员', x: 660, y: 200, color: '#2563EB', duty: '宣传报道', stage: 4 },
    // L3 中层右——纪检委员（考勤考察，原始材料留存处）
    { id: 'disc-commissioner', name: '纪检委员', x: 660, y: 320, color: '#C2410C', duty: '考勤考察', stage: 4 },
    // L4 底层左——组织委员（考察建档/人才库维护，只收集考察记录不归档宣传素材）
    { id: 'org-commissioner',  name: '组织委员', x: 140, y: 460, color: '#0EA5E9', duty: '考察建档/人才库维护', stage: 5 },
  ],
  edges: [
    // 派活交付（深红实线）——有交付物的转移流
    { from: 'leader',    to: 'organizer',         label: '赋权',       type: 'task', stage: 0, detail: '党小组组长创建活动后赋权组织者，组织者获得活动执行权' },
    { from: 'organizer', to: 'deep',              label: '分工',       type: 'task', stage: 2, detail: '组织者向深度参与者分派具体任务清单（内容/形式/截止时间）' },
    { from: 'organizer', to: 'prop-commissioner', label: '宣传需求',   type: 'task', labelT: 0.4, stage: 4, detail: '组织者向宣传委员提出宣传需求（活动亮点/报道角度/素材要求）' },
    { from: 'organizer', to: 'org-commissioner',  label: '考察建档',   type: 'task', labelT: 0.45, stage: 5, detail: '组织者向组织委员提交活动考察材料，组织委员据此更新人才库' },
    { from: 'organizer', to: 'disc-commissioner', label: '提交考勤',   type: 'task', labelT: 0.55, stage: 4, detail: '组织者向纪检委员提交出勤记录（应到/实到/缺席名单）' },
    { from: 'disc-commissioner', to: 'org-commissioner', label: '考察记录', type: 'task', labelDx: -38, labelDy: -14, stage: 5, detail: '纪检委员向组织委员提交考察记录（表现/贡献/问题），组织委员据此更新人才库；原始材料留纪检委员处' },
    // 报备告知（蓝虚线）——仅信息传递无交付物
    // 报备改双向：organizer↔secretary，显性化书记审批反馈（v4.3.6）
    { from: 'organizer', to: 'secretary',         label: '报备/审批',  type: 'info', bidirectional: true, stage: 1, detail: '组织者向党支书报备活动方案、时间、地点、参与人员名单；党支书审批反馈，把握活动执行方向' },
    { from: 'organizer', to: 'normal',            label: '通知',       type: 'info', stage: 3, detail: '组织者通知普通参与者活动时间、地点、着装要求' },
    { from: 'deep',      to: 'normal',            label: '带动参与',   type: 'info', labelDy: -18, stage: 3, detail: '深度参与者带动普通参与者积极参与活动' },
    // 横向配合（灰点线）——无方向的平等协作（书记↔支委；书记↔组织者已由双向报备边替代，不再单独画）
    { from: 'secretary', to: 'org-commissioner',  type: 'collab', label: '', stage: 5, detail: '书记与组织委员横向配合（把握人才库建设方向）' },
    { from: 'secretary', to: 'disc-commissioner', type: 'collab', label: '', stage: 4, detail: '书记与纪检委员横向配合（把握考察标准）' },
    { from: 'secretary', to: 'prop-commissioner', type: 'collab', label: '', stage: 4, detail: '书记与宣传委员横向配合（把握宣传方向）' },
  ],
};

// 专班关系网络：4 个节点 + 7 条流
// 节点重新布局：组织委员从中间挪到右侧，避免与 initiator↔organizer 长斜线 label 重叠
// 反向边 organizer→initiator 用 labelT 偏移，与 initiator→organizer 的 label 分开
// stage 字段：scroll-driven animation 的"信息出现顺序"分组（0=起点, 3=交付成果）
const TASKFORCE_NETWORK = {
  viewBox: '0 0 800 440',
  nodes: [
    { id: 'initiator',        name: '发起人',     x: 400, y: 80,  color: '#B91C1C', duty: '书记/党小组组长/支委', stage: 0 },
    { id: 'org-commissioner', name: '组织委员',   x: 660, y: 220, color: '#0EA5E9', duty: '唯一招募节点', stage: 1 },
    { id: 'organizer',        name: '组织者',     x: 200, y: 380, color: '#7DD3FC', duty: '项目大脑', stage: 2 },
    { id: 'deep',             name: '深度参与者', x: 600, y: 380, color: '#94a3b8', duty: '项目之手', stage: 2 },
  ],
  edges: [
    { from: 'initiator',        to: 'org-commissioner', label: '请求招募', type: 'task', stage: 1, detail: '发起人向组织委员提出专班需求（专班名称/人数/周期/考核标准）' },
    { from: 'org-commissioner', to: 'organizer',        label: '招募赋权', type: 'task', labelT: 0.55, stage: 2, detail: '组织委员招募并赋权组织者，组织者获得专班执行权' },
    { from: 'org-commissioner', to: 'deep',             label: '招募赋权', type: 'task', labelDx: 55, stage: 2, detail: '组织委员招募并赋权深度参与者，深度参与者获得专班参与权' },
    { from: 'initiator',        to: 'organizer',        label: '业务赋权', type: 'task', labelT: 0.3, curve: 32, stage: 2, detail: '发起人向组织者赋权业务方向（专班目标/工作内容/预期成果）' },
    { from: 'initiator',        to: 'deep',             label: '业务赋权', type: 'task', labelT: 0.3, stage: 2, detail: '发起人向深度参与者赋权业务方向（具体分工/技术要求）' },
    { from: 'organizer',        to: 'deep',             label: '协调执行', type: 'task', stage: 3, detail: '组织者协调深度参与者的执行，确保任务按计划推进' },
    { from: 'organizer',        to: 'initiator',        label: '交付成果', type: 'info', labelT: 0.3, curve: 32, stage: 3, detail: '组织者向发起人交付专班成果（工作记录/考察记录/创新提案）' },
  ],
};

// 探索工作——阶段说明（scroll-driven animation 的 scroll range 提供者）
// 每个 stage 对应 SVG 中 data-stage 相同的节点和连线
// 阶段说明卡片高度 35vh × N 个 = 紧凑 scroll range，JS 监听 scroll 计算 progress
// 角色信息融入 stage 说明的 flow 标签（弱化视觉，让 SVG 的"流"成为主角）
const EXPLORATION_STAGES = {
  activity: [
    { stage: 0, title: '党小组组长赋权组织者', desc: '党小组组长创建活动后赋权组织者——组织者获得活动执行权，成为活动执行核心。', flows: ['党小组组长 → 组织者（赋权）'] },
    { stage: 1, title: '组织者向支书报备·支书审批', desc: '组织者向党支书报备活动方案、时间、地点——党支书审批反馈，把握活动执行方向。', flows: ['组织者 ↔ 支书（报备/审批）'] },
    { stage: 2, title: '组织者分工', desc: '组织者作为执行核心（脑子），向深度参与者分派具体任务清单——多线程并行的起点。', flows: ['组织者 → 深度参与者（分工）'] },
    { stage: 3, title: '通知出席 + 带动参与', desc: '组织者通知普通参与者，深度参与者带动普通参与者参与——执行与扩散并行。', flows: ['组织者 → 普通参与者（通知）', '深度参与者 → 普通参与者（带动参与）'] },
    { stage: 4, title: '考勤考察 + 宣传报道', desc: '组织者提交考勤给纪检委员，向宣传委员提出宣传需求——监督与传播并行。', flows: ['组织者 → 纪检委员（提交考勤）', '组织者 → 宣传委员（宣传需求）', '支书 ↔ 纪检委员（横向配合）', '支书 ↔ 宣传委员（横向配合）'] },
    { stage: 5, title: '考察建档 + 人才库更新', desc: '组织者提交考察材料，纪检委员提交考察记录——组织委员据此更新支部人才库。原始材料留在纪检委员处。', flows: ['组织者 → 组织委员（考察建档）', '纪检委员 → 组织委员（考察记录）', '支书 ↔ 组织委员（横向配合）'] },
  ],
  taskforce: [
    { stage: 0, title: '发起人请求招募', desc: '发起人（书记/党小组组长/支委）请求组织委员招募——专班的起点。', flows: ['发起人'] },
    { stage: 1, title: '组织委员招募', desc: '组织委员作为唯一招募节点，接收招募请求。', flows: ['发起人 → 组织委员（请求招募）'] },
    { stage: 2, title: '招募赋权 + 业务赋权（多线程）', desc: '组织委员招募赋权 + 发起人业务赋权——同时给组织者和深度参与者赋权。', flows: ['组织委员 → 组织者（招募赋权）', '组织委员 → 深度参与者（招募赋权）', '发起人 → 组织者（业务赋权）', '发起人 → 深度参与者（业务赋权）'] },
    { stage: 3, title: '协调执行 + 交付成果', desc: '组织者协调执行，交付成果给发起人——专班的工作闭环。', flows: ['组织者 → 深度参与者（协调执行）', '组织者 → 发起人（交付成果）'] },
  ],
};

// ===== v5.2 Living Constellation =====
// 核心理念：stage 驱动（非 scroll 驱动）+ CSS transition（非每帧 JS 重算）
// 所有节点始终可见（dim 处理非活跃），边绘制效果通过 CSS transition 可见
// 设计原则：参数化配置，模块化组件

/**
 * v5.2 行星动画配置参数
 * 集中管理所有可调参数，便于未来微调
 */
const PLANETARY_CONFIG = {
  // 滚动映射
  scrollStartVh: 0.3,
  scrollEndVhOffset: 0.4,

  // 节点尺寸
  starRadius: 52,
  planetRadius: 40,
  inactiveRadius: 36,

  // 节点视觉状态
  activeOpacity: 1.0,
  inactiveOpacity: 0.25,
  activeScale: 1.15,
  inactiveScale: 1.0,
  activeSaturate: 1.0,
  inactiveSaturate: 0.4,

  // 边视觉状态
  edgeActiveOpacity: 1.0,
  edgeInactiveOpacity: 0,
  edgeLiftFactor: 0.15,

  // SVG 中心（保留用于潜在的位置计算）
  activityCenter: { x: 400, y: 300 },
  taskforceCenter: { x: 400, y: 220 },
};

/**
 * 边长度缓存：避免每次 renderNetwork 调用 getTotalLength()
 */
const EDGE_LENGTH_CACHE = new WeakMap();

/**
 * 识别指定 stage 的活跃节点 ID 集合 + star 节点 ID
 */
function identifyActiveNodes(stageIndex, network, stages) {
  const stage = stages[stageIndex];
  if (!stage) return { activeNodeIds: new Set(), starId: null };

  const activeNodeIds = new Set();
  const activeEdges = network.edges.filter(e => e.stage === stageIndex);
  activeEdges.forEach(e => {
    activeNodeIds.add(e.from);
    activeNodeIds.add(e.to);
  });

  // Fallback: 从 stage.flows 解析节点名
  if (activeNodeIds.size === 0 && stage.flows) {
    const nodeNameMap = new Map();
    network.nodes.forEach(n => {
      if (n.name) nodeNameMap.set(n.name, n.id);
    });
    stage.flows.forEach(flow => {
      const cleaned = flow.replace(/（[^）]*）/g, '').trim();
      const parts = cleaned.split(/[→↔]/).map(s => s.trim()).filter(s => s);
      parts.forEach(part => {
        const nodeId = nodeNameMap.get(part);
        if (nodeId) activeNodeIds.add(nodeId);
      });
    });
  }

  // 识别 star 节点
  const fromCount = new Map();
  activeEdges.forEach(e => {
    fromCount.set(e.from, (fromCount.get(e.from) || 0) + 1);
  });
  let starId = null;
  let maxCount = 0;
  for (const [id, count] of fromCount) {
    if (count > maxCount) {
      maxCount = count;
      starId = id;
    }
  }
  if (!starId && activeNodeIds.size > 0) {
    starId = Array.from(activeNodeIds)[0];
  }

  return { activeNodeIds, starId };
}

/**
 * 计算当前滚动位置对应的 stage 索引
 */
function computeScrollProgress(scrollTop, container, stageCount) {
  const stagesContainer = container.querySelector('.help-exploration-stages');
  if (!stagesContainer || stageCount <= 0) {
    return { stageIndex: 0, stageProgress: 0 };
  }
  const stagesRect = stagesContainer.getBoundingClientRect();
  const vh = window.innerHeight;
  const totalScrollRange = stagesRect.height;
  const startScroll = stagesRect.top + scrollTop - vh * PLANETARY_CONFIG.scrollStartVh;
  const endScroll = startScroll + totalScrollRange - vh * PLANETARY_CONFIG.scrollEndVhOffset;
  const scrollRange = endScroll - startScroll;
  if (scrollRange <= 0) {
    return { stageIndex: 0, stageProgress: 0 };
  }
  const scrollProgress = Math.max(0, Math.min(1, (scrollTop - startScroll) / scrollRange));
  const stageFloat = scrollProgress * stageCount;
  const stageIndex = Math.min(stageCount - 1, Math.floor(stageFloat));
  const stageProgress = stageFloat - stageIndex;
  return { stageIndex, stageProgress };
}

/**
 * v5.2 渲染网络图——设置目标状态，CSS transition 负责动画
 */
function renderNetwork(svg, network, currentStageIndex, stages) {
  if (!svg || !network) return;

  const { activeNodeIds, starId } = identifyActiveNodes(currentStageIndex, network, stages);

  // 1. 更新所有节点
  network.nodes.forEach(node => {
    const nodeEl = svg.querySelector(`.help-node-svg[data-id="${node.id}"]`);
    if (!nodeEl) return;

    const isActive = activeNodeIds.has(node.id);
    const isStar = node.id === starId;

    const scale = isActive ? PLANETARY_CONFIG.activeScale : PLANETARY_CONFIG.inactiveScale;
    nodeEl.style.transform = `translate(${node.x}px, ${node.y}px) scale(${scale})`;

    nodeEl.style.opacity = isActive ? PLANETARY_CONFIG.activeOpacity : PLANETARY_CONFIG.inactiveOpacity;
    nodeEl.style.filter = `saturate(${isActive ? PLANETARY_CONFIG.activeSaturate : PLANETARY_CONFIG.inactiveSaturate})`;

    nodeEl.setAttribute('data-role', isStar ? 'star' : (isActive ? 'planet' : 'inactive'));

    const circle = nodeEl.querySelector('.help-node-circle');
    if (circle) {
      const baseRadius = isStar
        ? PLANETARY_CONFIG.starRadius
        : (isActive ? PLANETARY_CONFIG.planetRadius : PLANETARY_CONFIG.inactiveRadius);
      circle.setAttribute('r', baseRadius);
    }
  });

  // 2. 更新所有边
  network.edges.forEach(edge => {
    const edgeEl = svg.querySelector(`.help-edge[data-from="${edge.from}"][data-to="${edge.to}"]`);
    if (!edgeEl) return;

    const pathEl = edgeEl.querySelector('.help-edge-path');
    if (!pathEl) return;

    const fromNode = network.nodes.find(n => n.id === edge.from);
    const toNode = network.nodes.find(n => n.id === edge.to);
    if (!fromNode || !toNode) return;

    const midX = (fromNode.x + toNode.x) / 2;
    const midY = (fromNode.y + toNode.y) / 2;
    const lift = Math.sqrt((toNode.x - fromNode.x) ** 2 + (toNode.y - fromNode.y) ** 2) * PLANETARY_CONFIG.edgeLiftFactor;
    const d = `M ${fromNode.x} ${fromNode.y} Q ${midX} ${midY - lift} ${toNode.x} ${toNode.y}`;
    pathEl.setAttribute('d', d);

    if (!EDGE_LENGTH_CACHE.has(pathEl)) {
      try {
        EDGE_LENGTH_CACHE.set(pathEl, pathEl.getTotalLength());
      } catch (e) {
        EDGE_LENGTH_CACHE.set(pathEl, 0);
      }
    }
    const totalLength = EDGE_LENGTH_CACHE.get(pathEl);

    if (totalLength > 0 && !pathEl.style.strokeDasharray) {
      pathEl.style.strokeDasharray = `${totalLength}`;
    }

    const isActive = edge.stage === currentStageIndex;
    edgeEl.style.opacity = isActive ? PLANETARY_CONFIG.edgeActiveOpacity : PLANETARY_CONFIG.edgeInactiveOpacity;
    if (totalLength > 0) {
      pathEl.style.strokeDashoffset = isActive ? '0' : `${totalLength}`;
    }

    const arrowEl = edgeEl.querySelector('.help-edge-arrow');
    if (arrowEl) {
      const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x) * 180 / Math.PI;
      arrowEl.setAttribute('transform', `translate(${toNode.x},${toNode.y}) rotate(${angle})`);
      arrowEl.style.opacity = isActive ? PLANETARY_CONFIG.edgeActiveOpacity : PLANETARY_CONFIG.edgeInactiveOpacity;
    }
  });
}

// ===== v5.2 Living Constellation End =====

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
 * 母本：content/01_strategy/DEVELOPMENT_PATH.md 第一章
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

/** 通用 SVG 关系网络渲染（支持自循环边、domain 标签、callouts、inline 内嵌模式） */
function renderNetworkSVG(network, opts) {
  const { sectionId, sectionClass, title, subtitle, modifier = '', callouts = [], domain = '', inline = false } = opts;

  const svg = svgEl('svg', {
    class: 'help-network-svg',
    viewBox: network.viewBox,
    preserveAspectRatio: 'xMidYMid meet',
    'aria-label': title || sectionClass,
  });

  // 节点查找表
  const nodeMap = {};
  network.nodes.forEach(n => { nodeMap[n.id] = n; });

  // 连线层（底层）
  const edgesG = svgEl('g', { class: 'help-edges' });
  network.edges.forEach((edge, i) => {
    const from = nodeMap[edge.from];
    const to = nodeMap[edge.to];
    if (!from || !to) return;

    // 自循环 vs 普通连线
    const isSelf = edge.self === true || edge.from === edge.to;
    const labelT = edge.labelT !== undefined ? edge.labelT : 0.5;
    const curve = edge.curve || 0;
    const path = isSelf ? selfLoopPath(from) : edgePath(from, to, 42, labelT, curve);
    const { d, mx, my } = path;

    const g = svgEl('g', { class: `help-edge help-edge--${edge.type}${isSelf ? ' help-edge--self' : ''}`, 'data-from': edge.from, 'data-to': edge.to, 'data-stagger': '', 'data-stagger-delay': (network.nodes.length + i) * 120, ...(edge.stage !== undefined ? { 'data-stage': edge.stage } : {}), ...(inline ? { 'data-role': 'planet' } : {}), ...(edge.detail ? { 'data-detail': edge.detail, 'data-label': edge.label || '' } : {}) });

    const pathEl = svgEl('path', {
      class: 'help-edge-path',
      d,
    });
    g.appendChild(pathEl);

    // 箭头：独立 path 元素
    if (edge.type !== 'collab' && !isSelf) {
      const angle = Math.atan2(path.y2 - path.y1, path.x2 - path.x1) * 180 / Math.PI;
      const arrowFill = edge.type === 'task' ? '#B91C1C' : '#3B82F6';
      const arrowEl = svgEl('path', {
        d: 'M -8 -4 L 0 0 L -8 4 z',
        fill: arrowFill,
        class: 'help-edge-arrow',
        transform: `translate(${path.x2},${path.y2}) rotate(${angle})`,
        opacity: '0',
      });
      g.appendChild(arrowEl);
      // 双向边：起点添加反向箭头
      if (edge.bidirectional) {
        const reverseArrowEl = svgEl('path', {
          d: 'M -8 -4 L 0 0 L -8 4 z',
          fill: arrowFill,
          class: 'help-edge-arrow',
          transform: `translate(${path.x1},${path.y1}) rotate(${angle + 180})`,
          opacity: '0',
        });
        g.appendChild(reverseArrowEl);
      }
    }

    // 协作线两端圆点
    if (edge.type === 'collab' && !isSelf) {
      const dotR = 3;
      g.appendChild(svgEl('circle', { cx: path.x1, cy: path.y1, r: dotR, fill: '#9CA3AF', class: 'help-edge-dot', opacity: '0' }));
      g.appendChild(svgEl('circle', { cx: path.x2, cy: path.y2, r: dotR, fill: '#9CA3AF', class: 'help-edge-dot', opacity: '0' }));
    }

    // 标签
    if (edge.label) {
      const labelDx = edge.labelDx || 0;
      const labelDy = edge.labelDy || 0;
      const labelG = svgEl('g', { class: 'help-edge-label', transform: `translate(${mx + labelDx},${my + labelDy})` });
      const labelWidth = Math.max(36, edge.label.length * 13 + 12);
      const labelHeight = 20;
      const labelBg = svgEl('rect', {
        class: 'help-edge-label-bg',
        x: -labelWidth / 2,
        y: -labelHeight / 2,
        width: labelWidth,
        height: labelHeight,
        rx: 6,
      });
      labelG.appendChild(labelBg);
      const labelText = svgEl('text', { class: 'help-edge-label-text', 'text-anchor': isSelf ? 'start' : 'middle', 'dominant-baseline': 'middle', x: isSelf ? 4 : 0, y: 1 });
      labelText.textContent = edge.label;
      labelG.appendChild(labelText);
      g.appendChild(labelG);
    }

    edgesG.appendChild(g);
  });
  svg.appendChild(edgesG);

  // 节点层（顶层）
  const nodesG = svgEl('g', { class: 'help-nodes' });
  network.nodes.forEach((node, i) => {
    const g = svgEl('g', { class: 'help-node-svg', 'data-id': node.id, 'data-stagger': '', 'data-stagger-delay': i * 120, ...(node.stage !== undefined ? { 'data-stage': node.stage } : {}), ...(inline ? { 'data-role': 'planet' } : {}), transform: `translate(${node.x},${node.y})`, tabindex: '0', role: 'button', 'aria-label': `${node.name}：${node.duty}` });

    const circle = svgEl('circle', { class: 'help-node-circle', r: '40', fill: node.color });
    g.appendChild(circle);

    const ring = svgEl('circle', { class: 'help-node-ring', r: '44', fill: 'none', stroke: node.color, 'stroke-width': '1.5', opacity: '0.25' });
    g.appendChild(ring);

    const text = svgEl('text', { class: 'help-node-text', 'text-anchor': 'middle', 'dominant-baseline': 'middle', x: 0, y: 0, fill: '#FFFFFF' });
    text.textContent = node.name;
    g.appendChild(text);

    const duty = svgEl('text', { class: 'help-node-duty', 'text-anchor': 'middle', 'dominant-baseline': 'middle', x: 0, y: 58, fill: '#6B7280' });
    duty.textContent = node.duty;
    g.appendChild(duty);

    nodesG.appendChild(g);
  });
  svg.appendChild(nodesG);

  // domain 标签
  const domainHTML = domain
    ? `<span class="help-section-domain help-section-domain--${domain}">${domain === 'building' ? '党建工作' : '党务工作'}</span>`
    : '';

  // callouts 列表
  const calloutsHTML = callouts && callouts.length
    ? `<ul class="help-callout-list">${callouts.map(c => `<li>${c}</li>`).join('')}</ul>`
    : '';

  // 序列化 SVG
  const svgString = new XMLSerializer().serializeToString(svg);

  // wrap 内容
  const wrapContent = `
    <div class="help-network-legend">
      <span class="help-legend-item"><span class="help-legend-line help-legend-line--task"></span>派活交付（实线·有方向）</span>
      <span class="help-legend-item"><span class="help-legend-line help-legend-line--info"></span>报备告知（虚线·有方向）</span>
      <span class="help-legend-item"><span class="help-legend-line help-legend-line--collab"></span>横向配合（点线·无方向）</span>
    </div>
    <div class="help-network-container">${svgString}</div>
    <div class="help-network-tooltip" aria-hidden="true"></div>
  `;

  // inline 模式
  if (inline) {
    return `
      <div class="help-network-wrap ${sectionClass}">
        ${wrapContent}
      </div>
    `;
  }

  return `
    <section id="${sectionId}" class="help-section help-network-section ${sectionClass} ${modifier}" data-toc-id="${sectionId}">
      <div class="help-section-inner">
        ${domainHTML}
        <h2 class="help-section-title">${title}</h2>
        <p class="help-section-subtitle">${subtitle}</p>
        <div class="help-network-wrap">
          ${wrapContent}
        </div>
        ${calloutsHTML}
      </div>
    </section>
  `;
}

/** Section 5: 探索工作——SVG 关系网络脉动（Living Constellation v5.2） */
function renderExploration() {
  const scenes = [
    {
      id: 'activity',
      no: '01',
      title: '活动：党小组组长发起，同志们参与',
      network: ACTIVITY_NETWORK,
      stages: EXPLORATION_STAGES.activity,
      note: '探索的边界由党小组组长划定，信息流与任务流并行——从策划、通知、执行到考勤、归档，每个环节都有明确的"谁找谁"。',
    },
    {
      id: 'taskforce',
      no: '02',
      title: '专班：组织委员招募，定向攻坚',
      network: TASKFORCE_NETWORK,
      stages: EXPLORATION_STAGES.taskforce,
      note: '与活动不同——专班由组织委员统一招募赋权，发起人做业务赋权；组织者是项目的脑子，深度参与者是项目的手。',
    },
  ];

  const scenesHTML = scenes.map(scene => {
    const networkSVG = renderNetworkSVG(scene.network, {
      sectionClass: `help-exploration-network--${scene.id}`,
      inline: true,
    });

    const stagesHTML = scene.stages.map(s => `
      <div class="help-exploration-stage" data-stage="${s.stage}">
        <div class="help-exploration-stage-no">${String(s.stage + 1).padStart(2, '0')}</div>
        <div class="help-exploration-stage-body">
          <h4 class="help-exploration-stage-title">${s.title}</h4>
          <p class="help-exploration-stage-desc">${s.desc}</p>
          <ul class="help-exploration-stage-flows">
            ${s.flows.map(f => `<li>${f}</li>`).join('')}
          </ul>
        </div>
      </div>
    `).join('');

    return `
      <div class="help-exploration-scene" data-scene="${scene.id}">
        <div class="help-exploration-scene-head">
          <span class="help-exploration-block-no">${scene.no}</span>
          <h3 class="help-exploration-block-title">${scene.title}</h3>
        </div>
        <div class="help-exploration-scene-body">
          <div class="help-exploration-network-sticky" data-state="current">
            ${networkSVG}
          </div>
          <div class="help-exploration-stages">
            ${stagesHTML}
          </div>
        </div>
        <div class="help-exploration-scene-note">${scene.note}</div>
      </div>
    `;
  }).join('');

  return `
    <section id="exploration" class="help-section help-network-section help-exploration-section" data-toc-id="exploration">
      <div class="help-section-inner">
        <h2 class="help-section-title">探索工作——谁在什么时候该去找谁？</h2>
        <p class="help-section-subtitle">项目——活动与专班两种探索方式，滚动看关系如何展开，每个阶段都是一次生动的脉动</p>
        ${scenesHTML}
      </div>
    </section>
  `;
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

/** Section 3: 发展党员交替时间轴（13 关键节点，居中列 + 左右交替侧面板） */
function renderDevelopment() {
  // 阶段定义（4 阶段）
  const STAGES = [
    { key: 'applicant',    label: '入党申请人 → 入党积极分子', nos: [1,2,3,4,5] },
    { key: 'activist',     label: '入党积极分子 → 发展对象',   nos: [6,7,8] },
    { key: 'prospect',     label: '发展对象 → 预备党员',       nos: [9,10,11] },
    { key: 'probationary', label: '预备党员 → 正式党员',       nos: [12,13] },
  ];

  const nodeMap = {};
  DEVELOPMENT_TIMELINE.forEach(n => { nodeMap[n.no] = n; });

  let html = '';

  STAGES.forEach(stage => {
    html += `<div class="help-tl-stage">${stage.label}</div>`;

    stage.nos.forEach(no => {
      const node = nodeMap[no];
      if (!node) return;

      const isDecision = node.isDecisionNode;
      const isOdd = node.no % 2 === 1;

      const dotClass = isDecision ? 'help-tl-dot--decision' : '';
      const noClass = isDecision ? 'help-tl-no--decision' : '';

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

/** 发展党员：时间轴手风琴展开/收起详情（GSAP 动画） */
function bindTimelineToggle() {
  const container = document.querySelector('.help-timeline-alternating');
  if (!container) return;

  const allDetails = container.querySelectorAll('.help-tl-detail');
  if (allDetails.length > 0) {
    gsap.set(allDetails, { autoAlpha: 0, height: 0 });
  }

  let currentExpanded = null;

  container.querySelectorAll('.help-tl-row').forEach(row => {
    const center = row.querySelector('.help-tl-center');
    const detail = row.querySelector('.help-tl-detail');
    if (!center || !detail) return;

    center.style.cursor = 'pointer';

    center.addEventListener('click', () => {
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

  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter(e => e.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (visible.length > 0) {
      setActive(visible[0].target.dataset.tocId);
    }
  }, { threshold: [0.15, 0.4, 0.6], rootMargin: '-15% 0px -55% 0px' });

  sections.forEach(s => observer.observe(s));

  setActive('hero');
}

/** 全页面 GSAP 动画（ScrollTrigger + matchMedia 优雅降级） */
function bindPageAnimations() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    document.querySelectorAll('.help-section').forEach(s => s.style.opacity = '1');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  const mm = gsap.matchMedia();

  // ── 标准动画 ──
  mm.add('(prefers-reduced-motion: no-preference)', () => {

    // Hero — 优雅入场
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

    // Cognition
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

    // Development
    bindDevelopmentEntranceAnimation();

    // Philosophy
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

    // Review
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

    // Works
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

    // Dialogue
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

    return () => ScrollTrigger.getAll().forEach(t => t.kill());
  });

  // ── reduced-motion 降级 ──
  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('.help-hero-title, .help-hero-subtitle, .help-hero-accent-line, .help-cognition-eyebrow, .help-cognition-title, .help-cognition-lead, .help-cognition-item, .help-cognition-dialogue, .help-philosophy-opp, .help-section-title, .help-section-subtitle, .help-review-card, .help-works-col, .help-dialogue-eyebrow, .help-dialogue-step, .help-dialogue-coda, .help-conclusion-section, .help-tl-row, .help-tl-stage', { autoAlpha: 1, y: 0, x: 0, scale: 1, clipPath: 'inset(0 0% 0 0)' });
  });
}

/** Development 时间轴入场动画 */
function bindDevelopmentEntranceAnimation() {
  const section = document.querySelector('.help-development-section');
  if (!section) return;
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set(section.querySelectorAll('.help-tl-row, .help-tl-stage'), { autoAlpha: 1, y: 0 });
    return;
  });

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const dividers = section.querySelectorAll('.help-tl-stage');

    dividers.forEach((divider, stageIdx) => {
      const stageRows = [];
      let next = divider.nextElementSibling;
      while (next && !next.classList.contains('help-tl-stage')) {
        if (next.classList.contains('help-tl-row')) {
          stageRows.push(next);
        }
        next = next.nextElementSibling;
      }

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

/** SVG 关系网络 hover 交互：悬停节点高亮相关连线 */
function bindNetworkHover() {
  document.querySelectorAll('.help-network-container').forEach(container => {
    const svg = container.querySelector('svg');
    if (!svg) return;
    const nodes = svg.querySelectorAll('.help-node-svg');
    const edges = svg.querySelectorAll('.help-edge');
    const tooltip = container.parentNode.querySelector('.help-network-tooltip');
    const nodeDataMap = {};

    svg.querySelectorAll('.help-node-svg').forEach(n => {
      const id = n.dataset.id;
      const circle = n.querySelector('.help-node-circle');
      const dutyText = n.querySelector('.help-node-duty');
      nodeDataMap[id] = {
        name: n.querySelector('.help-node-text')?.textContent || id,
        color: circle?.getAttribute('fill') || '#B91C1C',
        duty: dutyText?.textContent || '',
      };
    });

    const highlight = (id) => {
      svg.classList.add('has-hover');
      edges.forEach(e => {
        const related = e.dataset.from === id || e.dataset.to === id;
        e.classList.toggle('highlighted', related);
        e.classList.toggle('dimmed', !related);
      });
      nodes.forEach(n => {
        const nid = n.dataset.id;
        const isConnected = id === nid ||
          Array.from(edges).some(e =>
            (e.dataset.from === id && e.dataset.to === nid) ||
            (e.dataset.to === id && e.dataset.from === nid)
          );
        n.classList.toggle('highlighted', isConnected);
        n.classList.toggle('dimmed', !isConnected);
      });
    };

    const reset = () => {
      svg.classList.remove('has-hover');
      edges.forEach(e => { e.classList.remove('highlighted', 'dimmed'); });
      nodes.forEach(n => { n.classList.remove('highlighted', 'dimmed'); });
      if (tooltip) { tooltip.classList.remove('is-visible'); tooltip.innerHTML = ''; }
    };

    const showTooltip = (node, id) => {
      if (!tooltip || !nodeDataMap[id]) return;
      const data = nodeDataMap[id];
      tooltip.innerHTML = `
        <span class="help-tooltip-name" style="color:${data.color}">${data.name}</span>
        <span class="help-tooltip-duty">${data.duty}</span>
      `;
      tooltip.classList.add('is-visible');
      const nodeRect = node.getBoundingClientRect();
      const wrapRect = container.parentNode.getBoundingClientRect();
      tooltip.style.left = (nodeRect.left - wrapRect.left + nodeRect.width / 2) + 'px';
      tooltip.style.top = (nodeRect.top - wrapRect.top - 8) + 'px';
    };

    nodes.forEach(node => {
      node.addEventListener('mouseenter', () => {
        highlight(node.dataset.id);
        showTooltip(node, node.dataset.id);
      });
      node.addEventListener('mouseleave', reset);
      node.addEventListener('focus', () => { highlight(node.dataset.id); showTooltip(node, node.dataset.id); });
      node.addEventListener('blur', reset);
    });

    // 连线 hover
    edges.forEach(edge => {
      edge.addEventListener('mouseenter', (e) => {
        if (!svg.classList.contains('has-hover')) {
          edge.classList.add('hovered');
        }
        const detail = edge.dataset.detail;
        const label = edge.dataset.label;
        if (tooltip && detail) {
          tooltip.innerHTML = `
            <span class="help-tooltip-name">${label || ''}</span>
            <span class="help-tooltip-duty">${detail}</span>
          `;
          tooltip.classList.add('is-visible');
          const edgeRect = edge.getBoundingClientRect();
          const wrapRect = container.parentNode.getBoundingClientRect();
          tooltip.style.left = (edgeRect.left - wrapRect.left + edgeRect.width / 2) + 'px';
          tooltip.style.top = (edgeRect.top - wrapRect.top - 8) + 'px';
        }
      });
      edge.addEventListener('mouseleave', () => {
        edge.classList.remove('hovered');
        if (tooltip) { tooltip.classList.remove('is-visible'); tooltip.innerHTML = ''; }
      });
    });
  });
}

/**
 * v5.2 行星大动画协调器
 * stage 驱动：仅在 stage 切换时调用 renderNetwork，CSS transition 负责动画
 */
function bindExplorationScrollDriven() {
  const scenes = document.querySelectorAll('.help-exploration-scene');
  if (!scenes.length) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const sceneData = [];
  scenes.forEach(scene => {
    const network = scene.dataset.scene === 'activity' ? ACTIVITY_NETWORK : TASKFORCE_NETWORK;
    const stages = scene.dataset.scene === 'activity'
      ? EXPLORATION_STAGES.activity
      : EXPLORATION_STAGES.taskforce;
    const svg = scene.querySelector('.help-network-svg');
    const stagesContainer = scene.querySelector('.help-exploration-stages');
    sceneData.push({
      scene, network, stages, svg, stagesContainer,
      stageCount: stages.length,
      currentRenderedStage: -1,
    });
  });

  // 初始渲染：stage 0
  sceneData.forEach(data => {
    if (!data.svg) return;
    renderNetwork(data.svg, data.network, 0, data.stages);
    data.currentRenderedStage = 0;
  });

  if (prefersReduced) return;

  // 滚动驱动
  let ticking = false;

  const update = () => {
    ticking = false;
    const scrollTop = window.scrollY;

    sceneData.forEach(data => {
      if (!data.svg || !data.stagesContainer) return;

      const progress = computeScrollProgress(scrollTop, data.scene, data.stageCount);

      if (progress.stageIndex !== data.currentRenderedStage) {
        data.currentRenderedStage = progress.stageIndex;
        renderNetwork(data.svg, data.network, progress.stageIndex, data.stages);
      }

      const sceneStages = data.scene.querySelectorAll('.help-exploration-stage');
      sceneStages.forEach((s, i) => {
        if (i < progress.stageIndex) s.setAttribute('data-state', 'past');
        else if (i === progress.stageIndex) s.setAttribute('data-state', 'current');
        else s.setAttribute('data-state', 'future');
      });
    });
  };

  const onScroll = () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  update();
}

// ════════════════════════════════════════════════════════════════
//  启动
// ════════════════════════════════════════════════════════════════

renderHelpContent();
bindTimelineToggle();
bindTOC();
bindPageAnimations();
bindNetworkHover();
bindExplorationScrollDriven();
