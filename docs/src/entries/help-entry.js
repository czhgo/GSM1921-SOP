// role: [人机]
// entries/help-entry.js — 帮助页入口 v4（讲我们支部的故事）
// 核心理念：从"关系网络"到"支部的故事"——以党员成长为主线，讲清考察、工作哲学、探索与对话
// 设计风格：苹果风（纯白 + 大留白 + 大字体 + 微妙动画）
// 签名元素：【管理事，服务人】核心口号 + 活动关系网络 SVG 图
// v4 变更：去党建vs党务对比/考勤/思想汇报/角色独立section；新增考察积极分子/核心口号/两种工作/探索工作/行百里者半九十

import { renderSidebar } from '../components/sidebar.js';
import { renderHeader } from '../components/header.js';
import { getBasePath } from '../core/utils.js';

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
// 🔑 逻辑校准（D-207 衍生）：组织者是活动执行核心（脑子），党小组组长是发起者（创建活动+赋权组织者）
//   组长可以是组织者，也可以不是——这是两个不同角色，有时由同一人担任
// 🔑 v4.3.6 校准：4 层节点布局消除线交叠（书记顶/组长+宣传上层/组织者+纪检中层/组织委员+参与者底层）；
//   报备改双向边（organizer↔secretary，label"报备/审批"）显性化书记审批反馈；
//   删除 secretary↔organizer collab 边（与报备边物理重合，由双向报备边替代）；
//   动画区分对待：task 用 dashoffset 绘制（有方向），info/collab 用 opacity 渐显（保留 CSS 虚线/点线）；
//   组织委员不归档宣传素材，只收集考察记录+维护人才库（duty 维持 v4.3.5）
// 节点布局：4 层结构——L1 书记(顶) / L2 组长+宣传(上) / L3 组织者+纪检(中) / L4 组织委员+深度+普通(底)
// stage 字段：scroll-driven animation 的"信息出现顺序"分组（0=起点, 5=人才库更新终点）
// detail 字段：连线 tooltip 详情（回答"汇报什么？提交什么？"）
const ACTIVITY_NETWORK = {
  viewBox: '0 0 800 600',
  nodes: [
    // L1 顶部——书记居中（屋顶，视觉核心）：审批报备+横向配合
    { id: 'secretary',  name: '党支书',     x: 400, y: 60,  color: '#B91C1C', duty: '审批报备', stage: 1 },
    // L2 上层左——组长（发起者：创建活动+赋权组织者）
    { id: 'leader',     name: '党小组组长', x: 140, y: 200, color: '#65A30D', duty: '发起者', stage: 0 },
    // L3 中层——组织者居中（执行核心·脑子），承接组长赋权，负责分工/协调/报备
    { id: 'organizer',  name: '组织者',     x: 400, y: 320, color: '#06B6D4', duty: '执行核心（脑子）', stage: 0 },
    // L4 底层——深度参与者（承担分工·手）
    { id: 'deep',       name: '深度参与者', x: 300, y: 500, color: '#10B981', duty: '承担分工（手）', stage: 2 },
    // L4 底层——普通参与者（按通知出席）
    { id: 'normal',     name: '普通参与者', x: 500, y: 500, color: '#6B7280', duty: '按通知出席', stage: 3 },
    // L2 上层右——宣传委员（宣传报道）
    { id: 'prop-commissioner', name: '宣传委员', x: 660, y: 200, color: '#3B82F6', duty: '宣传报道', stage: 4 },
    // L3 中层右——纪检委员（考勤考察，原始材料留存处）
    { id: 'disc-commissioner', name: '纪检委员', x: 660, y: 320, color: '#D97706', duty: '考勤考察', stage: 4 },
    // L4 底层左——组织委员（考察建档/人才库维护，只收集考察记录不归档宣传素材）
    { id: 'org-commissioner',  name: '组织委员', x: 140, y: 460, color: '#8B5CF6', duty: '考察建档/人才库维护', stage: 5 },
  ],
  edges: [
    // 派活交付（深红实线）——有交付物的转移流
    { from: 'leader',    to: 'organizer',         label: '赋权',       type: 'task', stage: 0, detail: '组长创建活动后赋权组织者，组织者获得活动执行权' },
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
    { id: 'initiator',        name: '发起人',     x: 400, y: 80,  color: '#B91C1C', duty: '书记/组长/支委', stage: 0 },
    { id: 'org-commissioner', name: '组织委员',   x: 660, y: 220, color: '#8B5CF6', duty: '唯一招募节点', stage: 1 },
    { id: 'organizer',        name: '组织者',     x: 200, y: 380, color: '#06B6D4', duty: '项目大脑', stage: 2 },
    { id: 'deep',             name: '深度参与者', x: 600, y: 380, color: '#10B981', duty: '项目之手', stage: 2 },
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
    { stage: 0, title: '组长赋权组织者', desc: '组长创建活动后赋权组织者——组织者获得活动执行权，成为活动执行核心。', flows: ['组长 → 组织者（赋权）'] },
    { stage: 1, title: '组织者向支书报备·支书审批', desc: '组织者向党支书报备活动方案、时间、地点——党支书审批反馈，把握活动执行方向。', flows: ['组织者 ↔ 支书（报备/审批）'] },
    { stage: 2, title: '组织者分工', desc: '组织者作为执行核心（脑子），向深度参与者分派具体任务清单——多线程并行的起点。', flows: ['组织者 → 深度参与者（分工）'] },
    { stage: 3, title: '通知出席 + 带动参与', desc: '组织者通知普通参与者，深度参与者带动普通参与者参与——执行与扩散并行。', flows: ['组织者 → 普通参与者（通知）', '深度参与者 → 普通参与者（带动参与）'] },
    { stage: 4, title: '考勤考察 + 宣传报道', desc: '组织者提交考勤给纪检委员，向宣传委员提出宣传需求——监督与传播并行。', flows: ['组织者 → 纪检委员（提交考勤）', '组织者 → 宣传委员（宣传需求）', '支书 ↔ 纪检委员（横向配合）', '支书 ↔ 宣传委员（横向配合）'] },
    { stage: 5, title: '考察建档 + 人才库更新', desc: '组织者提交考察材料，纪检委员提交考察记录——组织委员据此更新支部人才库。原始材料留在纪检委员处。', flows: ['组织者 → 组织委员（考察建档）', '纪检委员 → 组织委员（考察记录）', '支书 ↔ 组织委员（横向配合）'] },
  ],
  taskforce: [
    { stage: 0, title: '发起人请求招募', desc: '发起人（书记/组长/支委）请求组织委员招募——专班的起点。', flows: ['发起人'] },
    { stage: 1, title: '组织委员招募', desc: '组织委员作为唯一招募节点，接收招募请求。', flows: ['发起人 → 组织委员（请求招募）'] },
    { stage: 2, title: '招募赋权 + 业务赋权（多线程）', desc: '组织委员招募赋权 + 发起人业务赋权——同时给组织者和深度参与者赋权。', flows: ['组织委员 → 组织者（招募赋权）', '组织委员 → 深度参与者（招募赋权）', '发起人 → 组织者（业务赋权）', '发起人 → 深度参与者（业务赋权）'] },
    { stage: 3, title: '协调执行 + 交付成果', desc: '组织者协调执行，交付成果给发起人——专班的工作闭环。', flows: ['组织者 → 深度参与者（协调执行）', '组织者 → 发起人（交付成果）'] },
  ],
};

// ===== v5.0 Planetary Animation =====
// 行星大动画核心组件——3D 引力舞蹈 + 滚动驱动 + 边重绘
// 设计原则：参数化配置，模块化组件，便于未来调整

/**
 * v5.0 行星动画配置参数
 * 集中管理所有可调参数，便于未来微调
 */
const PLANETARY_CONFIG = {
  // 3D 透视投影
  focal: 400,                    // 透视焦距
  zRange: 50,                    // z 轴深度范围 (±50)
  projectionOpacityFloor: 0.7,   // 透视投影 opacity 下限（独立于 inactiveOpacity）

  // 倾斜轨道
  orbitTilt: 18,                 // 轨道平面倾斜角度（度）

  // Easing
  easingK: 0.6,                  // sin 调制系数（中段速度 = 1-k = 40%）

  // Stage 过渡区域
  transitionStart: 0.8,          // stage 内开始过渡的 progress (80%)
  transitionEnd: 0.2,            // 下一 stage 过渡结束的 progress (20%)

  // 滚动映射
  scrollStartVh: 0.3,            // stagesContainer 顶部到达视口 30% 时开始
  scrollEndVhOffset: 0.4,        // 滚动结束位置的 vh 偏移

  // 节点尺寸
  starRadius: 52,                // 恒星半径
  planetRadius: 40,              // 行星半径
  inactiveRadius: 32,            // 非激活节点半径

  // 布局缩放
  starScale: 1.3,                 // 恒星缩放
  planetScale: 1.0,               // 行星缩放
  inactiveScale: 0.8,             // 非激活节点缩放

  // 行星轨道半径
  planetOrbitRadius: {
    1: 110,                      // 1 个行星时的轨道半径
    2: 100,
    3: 110,
    4: 130,
  },

  // 视觉属性
  inactiveOpacity: 0.7,          // 非激活节点透明度（保持可见）
  inactiveSaturate: 0.6,         // 非激活节点饱和度
  inactiveEdgeOpacity: 0.15,     // 非激活边透明度
  edgeLiftFactor: 0.15,          // 边贝塞尔曲线抬升系数

  // 视角旋转
  viewRotateXMax: 3,             // 视角旋转最大角度（度）

  // SVG 中心
  activityCenter: { x: 400, y: 300 },
  taskforceCenter: { x: 400, y: 220 },
  activityPeripheralRadius: 280,  // activity 非激活节点外围半径
  taskforcePeripheralRadius: 200, // taskforce 非激活节点外围半径
};

/**
 * sin 调制 easing 函数
 * f(p) = p + k * sin(2πp) / (2π)
 * 中段速度 = 1-k，两端速度 = 1+k
 * @param {number} p - 输入进度 0-1
 * @param {number} k - 调制系数（默认 0.6）
 * @returns {number} 缓动后进度 0-1
 */
function easeMiddleSlow(p, k = PLANETARY_CONFIG.easingK) {
  return p + (k * Math.sin(2 * Math.PI * p)) / (2 * Math.PI);
}

/**
 * 3D 透视投影
 * @param {Object} pos3D - {x, y, z} 3D 坐标
 * @param {number} focal - 透视焦距
 * @returns {Object} {screenX, screenY, scale, opacity}
 */
function project3DTo2D(pos3D, focal = PLANETARY_CONFIG.focal) {
  const { x, y, z } = pos3D;
  const factor = focal / (focal + z);
  return {
    screenX: x * factor,
    screenY: y * factor,
    scale: factor,
    opacity: Math.max(PLANETARY_CONFIG.projectionOpacityFloor, 1 - (z / (2 * PLANETARY_CONFIG.zRange)) * 0.3),
  };
}

/**
 * 贝塞尔曲线插值（二次贝塞尔）
 * @param {Object} p0 - 起点 {x, y, z}
 * @param {Object} p1 - 控制点 {x, y, z}
 * @param {Object} p2 - 终点 {x, y, z}
 * @param {number} t - 参数 0-1
 * @returns {Object} 插值点 {x, y, z}
 */
function bezier3D(p0, p1, p2, t) {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
    z: mt * mt * p0.z + 2 * mt * t * p1.z + t * t * p2.z,
  };
}

/**
 * 计算贝塞尔曲线控制点
 * 使运动轨迹优雅（向上凸起的弧线）
 * @param {Object} p0 - 起点
 * @param {Object} p2 - 终点
 * @returns {Object} 控制点 p1
 */
function computeControlPoint(p0, p2) {
  // 中点 + 向上偏移（y 减小）+ z 偏移
  const midX = (p0.x + p2.x) / 2;
  const midY = (p0.y + p2.y) / 2;
  const midZ = (p0.z + p2.z) / 2;
  // 向上凸起（SVG y 轴向下，所以减小 y）
  const lift = Math.sqrt((p2.x - p0.x) ** 2 + (p2.y - p0.y) ** 2) * 0.2;
  return {
    x: midX,
    y: midY - lift,
    z: midZ,  // 保持 z 中点（确定性，避免帧间抖动）
  };
}

/**
 * 计算指定 stage 下所有节点的 3D 目标位置
 * @param {number} stageIndex - stage 索引
 * @param {Object} network - 网络图数据 (ACTIVITY_NETWORK 或 TASKFORCE_NETWORK)
 * @param {Array} stages - stage 数据 (EXPLORATION_STAGES.activity 或 .taskforce)
 * @returns {Map<string, Object>} nodeId → {x, y, z, scale, opacity, saturate, role}
 *   role: 'star' | 'planet' | 'inactive'
 */
function computeStageLayout(stageIndex, network, stages) {
  const layout = new Map();
  const stage = stages[stageIndex];
  if (!stage) return layout;

  // 确定中心点（根据 network 类型）
  const isActivity = network === ACTIVITY_NETWORK;
  const center = isActivity
    ? PLANETARY_CONFIG.activityCenter
    : PLANETARY_CONFIG.taskforceCenter;

  // 识别该 stage 的激活节点
  // 从 network.edges 中找 stage 匹配的边，提取 from/to
  const activeNodeIds = new Set();
  const activeEdges = network.edges.filter(e => e.stage === stageIndex);
  activeEdges.forEach(e => {
    activeNodeIds.add(e.from);
    activeNodeIds.add(e.to);
  });

  // Fallback: if no active edges, parse stage.flows to find active nodes
  // (handles single-node stages like taskforce stage 0)
  if (activeNodeIds.size === 0 && stage.flows) {
    const nodeNameMap = new Map();
    network.nodes.forEach(n => {
      // Map both name and any alternate labels
      if (n.name) nodeNameMap.set(n.name, n.id);
    });

    stage.flows.forEach(flow => {
      // Parse flow string to extract node names
      // Formats: '发起人' | 'A → B（desc）' | 'A ↔ B（desc）'
      // Strip parenthetical descriptions first
      const cleaned = flow.replace(/（[^）]*）/g, '').trim();
      // Split on → or ↔
      const parts = cleaned.split(/[→↔]/).map(s => s.trim()).filter(s => s);
      parts.forEach(part => {
        const nodeId = nodeNameMap.get(part);
        if (nodeId) activeNodeIds.add(nodeId);
      });
    });
  }

  // 识别源节点（恒星）= 在该 stage 边中作为 from 出现最多的节点
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
  // 若无 from（如 taskforce stage 0 只有 initiator），取 activeNodeIds 第一个
  if (!starId && activeNodeIds.size > 0) {
    starId = Array.from(activeNodeIds)[0];
  }

  // 行星 = 激活节点中非恒星的
  const planetIds = Array.from(activeNodeIds).filter(id => id !== starId);

  // 布局恒星
  if (starId) {
    layout.set(starId, {
      x: center.x, y: center.y, z: 0,
      scale: PLANETARY_CONFIG.starScale, opacity: 1.0, saturate: 1.0,
      role: 'star',
    });
  }

  // 布局行星（等距排列在倾斜轨道上）
  const planetCount = planetIds.length;
  const orbitRadius = PLANETARY_CONFIG.planetOrbitRadius[planetCount] || 120;
  const tiltRad = (PLANETARY_CONFIG.orbitTilt * Math.PI) / 180;

  planetIds.forEach((id, i) => {
    const angle = (2 * Math.PI * i) / planetCount - Math.PI / 2;  // 从正上方开始
    // 倾斜轨道：x 不变，y 乘以 cos(tilt)，z 乘以 sin(tilt)
    const ox = Math.cos(angle) * orbitRadius;
    const oy = Math.sin(angle) * orbitRadius * Math.cos(tiltRad);
    const oz = Math.sin(angle) * orbitRadius * Math.sin(tiltRad);
    layout.set(id, {
      x: center.x + ox,
      y: center.y + oy,
      z: oz,
      scale: PLANETARY_CONFIG.planetScale, opacity: 1.0, saturate: 1.0,
      role: 'planet',
    });
  });

  // 布局非激活节点（飘到外围 + z 轴深处）
  const inactiveNodes = network.nodes.filter(n => !activeNodeIds.has(n.id));
  const peripheralRadius = isActivity
    ? PLANETARY_CONFIG.activityPeripheralRadius
    : PLANETARY_CONFIG.taskforcePeripheralRadius;
  inactiveNodes.forEach((node, i) => {
    const angle = (2 * Math.PI * i) / inactiveNodes.length + Math.PI / 4;
    const z = PLANETARY_CONFIG.zRange * (i % 2 === 0 ? 1 : -1);  // 交替正负 z
    layout.set(node.id, {
      x: center.x + Math.cos(angle) * peripheralRadius,
      y: center.y + Math.sin(angle) * peripheralRadius,
      z: z,
      scale: PLANETARY_CONFIG.inactiveScale, opacity: PLANETARY_CONFIG.inactiveOpacity,
      saturate: PLANETARY_CONFIG.inactiveSaturate,
      role: 'inactive',
    });
  });

  return layout;
}

/**
 * 预计算所有 stage 的布局
 * @param {Object} network - 网络图数据
 * @param {Array} stages - stage 数据
 * @returns {Array<Map>} 每个 stage 的布局数组
 */
function precomputeAllLayouts(network, stages) {
  return stages.map((_, i) => computeStageLayout(i, network, stages));
}

/**
 * 计算当前滚动位置对应的 stage progress
 * @param {number} scrollTop - 当前滚动位置
 * @param {HTMLElement} container - 探索工作 section 容器
 * @param {number} stageCount - stage 总数
 * @returns {Object} {stageIndex, stageProgress, transitionProgress, inTransition, transitionFrom, transitionTo}
 *   inTransition: true 表示在过渡区域，false 表示在静止区域
 *   transitionFrom/transitionTo: 过渡的起止 stage 索引
 */
function computeScrollProgress(scrollTop, container, stageCount) {
  const rect = container.getBoundingClientRect();
  const vh = window.innerHeight;
  // stage 说明区域的总高度
  const stagesContainer = container.querySelector('.help-exploration-stages');
  if (!stagesContainer) {
    return { stageIndex: 0, stageProgress: 0, transitionProgress: 0, inTransition: false, transitionFrom: 0, transitionTo: 0 };
  }
  if (stageCount <= 0) {
    return { stageIndex: 0, stageProgress: 0, transitionProgress: 0, inTransition: false, transitionFrom: 0, transitionTo: 0 };
  }
  const stagesRect = stagesContainer.getBoundingClientRect();
  const totalScrollRange = stagesRect.height;
  // 滚动进度：stagesContainer 顶部到达视口 30% 时开始，底部到达视口 70% 时结束
  const startScroll = stagesRect.top - vh * PLANETARY_CONFIG.scrollStartVh;
  const endScroll = startScroll + totalScrollRange - vh * PLANETARY_CONFIG.scrollEndVhOffset;
  const scrollRange = endScroll - startScroll;
  if (scrollRange <= 0) {
    return { stageIndex: 0, stageProgress: 0, transitionProgress: 0, inTransition: false, transitionFrom: 0, transitionTo: 0 };
  }
  const scrollProgress = Math.max(0, Math.min(1, (scrollTop - startScroll) / scrollRange));

  // 映射到 stage
  const stageFloat = scrollProgress * stageCount;
  const stageIndex = Math.min(stageCount - 1, Math.floor(stageFloat));
  const stageProgress = stageFloat - stageIndex;

  // 判断是否在过渡区域
  const ts = PLANETARY_CONFIG.transitionStart;  // 0.8
  const te = PLANETARY_CONFIG.transitionEnd;     // 0.2
  let transitionProgress = 0;
  let inTransition = false;
  let transitionFrom = stageIndex;
  let transitionTo = stageIndex;

  if (stageProgress > ts && stageIndex < stageCount - 1) {
    // 在当前 stage 的后 20% 过渡区域，向下一 stage 过渡
    inTransition = true;
    transitionProgress = (stageProgress - ts) / (1 - ts);
    transitionFrom = stageIndex;
    transitionTo = stageIndex + 1;
  } else if (stageProgress < te && stageIndex > 0) {
    // 在当前 stage 的前 20% 过渡区域，从上一 stage 过渡过来
    inTransition = true;
    transitionProgress = 1 - (stageProgress / te);
    transitionFrom = stageIndex - 1;
    transitionTo = stageIndex;
  }

  return {
    stageIndex,
    stageProgress,
    transitionProgress,
    inTransition,
    transitionFrom,
    transitionTo,
  };
}

/**
 * 在两个 stage 布局之间插值
 * @param {Map} layoutA - 起 stage 布局
 * @param {Map} layoutB - 终 stage 布局
 * @param {number} t - 过渡 progress (0-1)
 * @returns {Map} 插值后的 3D 位置
 */
function interpolatePositions(layoutA, layoutB, t) {
  const easedT = easeMiddleSlow(t);
  const result = new Map();
  const allNodeIds = new Set([...layoutA.keys(), ...layoutB.keys()]);

  allNodeIds.forEach(nodeId => {
    const a = layoutA.get(nodeId);
    const b = layoutB.get(nodeId);
    if (!a && b) {
      // 节点在 B 中新增：从 B 的外围位置淡入
      result.set(nodeId, { ...b, opacity: b.opacity * easedT });
    } else if (a && !b) {
      // 节点在 B 中消失：从 A 的位置淡出
      result.set(nodeId, { ...a, opacity: a.opacity * (1 - easedT) });
    } else if (a && b) {
      // 节点在两者中都存在：贝塞尔曲线插值
      const control = computeControlPoint(
        { x: a.x, y: a.y, z: a.z },
        { x: b.x, y: b.y, z: b.z }
      );
      const pos = bezier3D(
        { x: a.x, y: a.y, z: a.z },
        control,
        { x: b.x, y: b.y, z: b.z },
        easedT
      );
      // 插值视觉属性
      result.set(nodeId, {
        x: pos.x, y: pos.y, z: pos.z,
        scale: a.scale + (b.scale - a.scale) * easedT,
        opacity: a.opacity + (b.opacity - a.opacity) * easedT,
        saturate: a.saturate + (b.saturate - a.saturate) * easedT,
        role: t < 0.5 ? a.role : b.role,
      });
    }
  });

  return result;
}

/**
 * 根据当前 3D 位置渲染网络图（节点 transform + 边 path 重绘）
 * @param {SVGElement} svg - 网络图 SVG 元素
 * @param {Map} positions3D - 当前 3D 位置 (nodeId → {x,y,z,scale,opacity,saturate,role})
 * @param {Object} network - 网络图数据
 * @param {number} currentStageIndex - 当前 stage 索引（用于边 opacity）
 * @param {Object} transitionInfo - 过渡信息 {inTransition, transitionFrom, transitionTo, transitionProgress}
 */
function renderNetwork(svg, positions3D, network, currentStageIndex, transitionInfo) {
  if (!svg || !positions3D || !network) return;

  // 防御性 guard：确保 transitionInfo 字段完整
  const safeTransition = {
    inTransition: !!(transitionInfo && transitionInfo.inTransition),
    transitionFrom: transitionInfo ? transitionInfo.transitionFrom : 0,
    transitionTo: transitionInfo ? transitionInfo.transitionTo : 0,
    transitionProgress: transitionInfo ? Math.max(0, Math.min(1, transitionInfo.transitionProgress || 0)) : 0,
  };

  // 1. 更新节点位置
  positions3D.forEach((pos, nodeId) => {
    const nodeEl = svg.querySelector(`.help-node-svg[data-id="${nodeId}"]`);
    if (!nodeEl) return;

    // 3D 投影
    const projected = project3DTo2D({ x: pos.x, y: pos.y, z: pos.z });
    const finalScale = pos.scale * projected.scale;

    // 更新 transform
    nodeEl.setAttribute('transform', `translate(${projected.screenX},${projected.screenY}) scale(${finalScale})`);

    // 更新视觉属性
    nodeEl.style.opacity = pos.opacity * projected.opacity;
    nodeEl.style.filter = `saturate(${pos.saturate})`;

    // 更新 data-role（用于 CSS 样式）
    nodeEl.setAttribute('data-role', pos.role);

    // 更新 circle 半径（恒星放大）
    const circle = nodeEl.querySelector('.help-node-circle');
    if (circle) {
      const baseRadius = pos.role === 'star'
        ? PLANETARY_CONFIG.starRadius
        : pos.role === 'planet'
          ? PLANETARY_CONFIG.planetRadius
          : PLANETARY_CONFIG.inactiveRadius;
      circle.setAttribute('r', baseRadius);
    }
  });

  // 2. 更新边 path（实时重绘）
  network.edges.forEach((edge, i) => {
    const edgeEl = svg.querySelector(`.help-edge[data-from="${edge.from}"][data-to="${edge.to}"]`);
    if (!edgeEl) return;

    const fromPos = positions3D.get(edge.from);
    const toPos = positions3D.get(edge.to);
    if (!fromPos || !toPos) return;

    // 3D 投影
    const fromProj = project3DTo2D({ x: fromPos.x, y: fromPos.y, z: fromPos.z });
    const toProj = project3DTo2D({ x: toPos.x, y: toPos.y, z: toPos.z });

    // 计算贝塞尔曲线 path（边也是曲线，与节点运动一致）
    const midX = (fromProj.screenX + toProj.screenX) / 2;
    const midY = (fromProj.screenY + toProj.screenY) / 2;
    const lift = Math.sqrt((toProj.screenX - fromProj.screenX) ** 2 + (toProj.screenY - fromProj.screenY) ** 2) * PLANETARY_CONFIG.edgeLiftFactor;
    const cpX = midX;
    const cpY = midY - lift;

    const d = `M ${fromProj.screenX} ${fromProj.screenY} Q ${cpX} ${cpY} ${toProj.screenX} ${toProj.screenY}`;
    const pathEl = edgeEl.querySelector('.help-edge-path');
    if (pathEl) pathEl.setAttribute('d', d);

    // 计算边 opacity（stage 过渡混色）
    let edgeOpacity = 0;
    if (safeTransition.inTransition) {
      // 过渡区域：旧边→新边交叉混色
      if (edge.stage === safeTransition.transitionFrom) {
        edgeOpacity = 1 - safeTransition.transitionProgress;
      } else if (edge.stage === safeTransition.transitionTo) {
        edgeOpacity = safeTransition.transitionProgress;
      } else {
        edgeOpacity = PLANETARY_CONFIG.inactiveEdgeOpacity;
      }
    } else {
      // 静止区域：当前 stage 边可见，其他边淡
      if (edge.stage === currentStageIndex) {
        edgeOpacity = 1;
      } else {
        edgeOpacity = PLANETARY_CONFIG.inactiveEdgeOpacity;
      }
    }
    edgeEl.style.opacity = edgeOpacity;

    // 更新箭头位置（如果有）
    const arrowEl = edgeEl.querySelector('.help-edge-arrow');
    if (arrowEl) {
      const angle = Math.atan2(toProj.screenY - fromProj.screenY, toProj.screenX - fromProj.screenX) * 180 / Math.PI;
      arrowEl.setAttribute('transform', `translate(${toProj.screenX},${toProj.screenY}) rotate(${angle})`);
      arrowEl.style.opacity = edgeOpacity;
    }
  });
}

// ===== v5.0 Planetary Animation End =====

// 探索工作——分阶段 mini 关系图（v4.3.8 重构：时间轴 + 分阶段小图）
// 每个阶段一个 mini SVG，只展示该阶段活跃的节点和边
// 节点位置手动预设，确保小图清晰不拥挤
// 节点名字简化以适应小图（如"党小组组长"→"组长"）
const ACTIVITY_STAGE_GRAPHS = [
  {
    stage: 0,
    title: '组长赋权组织者',
    desc: '组长创建活动后赋权组织者——组织者获得活动执行权，成为活动执行核心。',
    viewBox: '0 0 300 180',
    nodes: [
      { id: 'leader',    name: '组长',     x: 150, y: 45,  color: '#65A30D' },
      { id: 'organizer', name: '组织者',   x: 150, y: 135, color: '#06B6D4' },
    ],
    edges: [
      { from: 'leader', to: 'organizer', label: '赋权', type: 'task' },
    ],
  },
  {
    stage: 1,
    title: '组织者向支书报备·支书审批',
    desc: '组织者向党支书报备活动方案、时间、地点——党支书审批反馈，把握活动执行方向。',
    viewBox: '0 0 300 180',
    nodes: [
      { id: 'secretary', name: '党支书',   x: 150, y: 45,  color: '#B91C1C' },
      { id: 'organizer', name: '组织者',   x: 150, y: 135, color: '#06B6D4' },
    ],
    edges: [
      { from: 'organizer', to: 'secretary', label: '报备/审批', type: 'info', bidirectional: true },
    ],
  },
  {
    stage: 2,
    title: '组织者分工',
    desc: '组织者作为执行核心（脑子），向深度参与者分派具体任务清单——多线程并行的起点。',
    viewBox: '0 0 300 180',
    nodes: [
      { id: 'organizer', name: '组织者',     x: 150, y: 45,  color: '#06B6D4' },
      { id: 'deep',      name: '深度参与者', x: 150, y: 135, color: '#10B981' },
    ],
    edges: [
      { from: 'organizer', to: 'deep', label: '分工', type: 'task' },
    ],
  },
  {
    stage: 3,
    title: '通知出席 + 带动参与',
    desc: '组织者通知普通参与者，深度参与者带动普通参与者参与——执行与扩散并行。',
    viewBox: '0 0 320 200',
    nodes: [
      { id: 'organizer', name: '组织者',     x: 80,  y: 50,  color: '#06B6D4' },
      { id: 'deep',      name: '深度参与者', x: 80,  y: 150, color: '#10B981' },
      { id: 'normal',    name: '普通参与者', x: 240, y: 100, color: '#6B7280' },
    ],
    edges: [
      { from: 'organizer', to: 'normal', label: '通知',     type: 'info' },
      { from: 'deep',      to: 'normal', label: '带动参与', type: 'info' },
    ],
  },
  {
    stage: 4,
    title: '考勤考察 + 宣传报道',
    desc: '组织者提交考勤给纪检委员，向宣传委员提出宣传需求——监督与传播并行。',
    viewBox: '0 0 340 220',
    nodes: [
      { id: 'secretary',        name: '党支书',   x: 170, y: 35,  color: '#B91C1C' },
      { id: 'organizer',        name: '组织者',   x: 60,  y: 110, color: '#06B6D4' },
      { id: 'disc-commissioner',name: '纪检委员', x: 280, y: 110, color: '#D97706' },
      { id: 'prop-commissioner',name: '宣传委员', x: 170, y: 185, color: '#3B82F6' },
    ],
    edges: [
      { from: 'organizer', to: 'disc-commissioner', label: '提交考勤',   type: 'task' },
      { from: 'organizer', to: 'prop-commissioner', label: '宣传需求',   type: 'task' },
      { from: 'secretary', to: 'disc-commissioner', label: '',           type: 'collab' },
      { from: 'secretary', to: 'prop-commissioner', label: '',           type: 'collab' },
    ],
  },
  {
    stage: 5,
    title: '考察建档 + 人才库更新',
    desc: '组织者提交考察材料，纪检委员提交考察记录——组织委员据此更新支部人才库。原始材料留在纪检委员处。',
    viewBox: '0 0 340 220',
    nodes: [
      { id: 'secretary',        name: '党支书',   x: 170, y: 35,  color: '#B91C1C' },
      { id: 'organizer',        name: '组织者',   x: 60,  y: 110, color: '#06B6D4' },
      { id: 'disc-commissioner',name: '纪检委员', x: 280, y: 110, color: '#D97706' },
      { id: 'org-commissioner', name: '组织委员', x: 170, y: 185, color: '#8B5CF6' },
    ],
    edges: [
      { from: 'organizer', to: 'org-commissioner',  label: '考察建档', type: 'task' },
      { from: 'disc-commissioner', to: 'org-commissioner', label: '考察记录', type: 'task' },
      { from: 'secretary', to: 'org-commissioner',  label: '',         type: 'collab' },
    ],
  },
];

const TASKFORCE_STAGE_GRAPHS = [
  {
    stage: 0,
    title: '发起人请求招募',
    desc: '发起人（书记/组长/支委）请求组织委员招募——专班的起点。',
    viewBox: '0 0 300 160',
    nodes: [
      { id: 'initiator', name: '发起人', x: 150, y: 80, color: '#B91C1C' },
    ],
    edges: [],
  },
  {
    stage: 1,
    title: '组织委员招募',
    desc: '组织委员作为唯一招募节点，接收招募请求。',
    viewBox: '0 0 300 180',
    nodes: [
      { id: 'initiator',       name: '发起人',   x: 150, y: 45,  color: '#B91C1C' },
      { id: 'org-commissioner',name: '组织委员', x: 150, y: 135, color: '#8B5CF6' },
    ],
    edges: [
      { from: 'initiator', to: 'org-commissioner', label: '请求招募', type: 'task' },
    ],
  },
  {
    stage: 2,
    title: '招募赋权 + 业务赋权',
    desc: '组织委员招募赋权 + 发起人业务赋权——同时给组织者和深度参与者赋权。',
    viewBox: '0 0 360 220',
    nodes: [
      { id: 'initiator',        name: '发起人',   x: 180, y: 35,  color: '#B91C1C' },
      { id: 'org-commissioner', name: '组织委员', x: 300, y: 110, color: '#8B5CF6' },
      { id: 'organizer',        name: '组织者',   x: 60,  y: 185, color: '#06B6D4' },
      { id: 'deep',             name: '深度参与者', x: 300, y: 185, color: '#10B981' },
    ],
    edges: [
      { from: 'org-commissioner', to: 'organizer', label: '招募赋权', type: 'task' },
      { from: 'org-commissioner', to: 'deep',      label: '招募赋权', type: 'task' },
      { from: 'initiator',        to: 'organizer', label: '业务赋权', type: 'task' },
      { from: 'initiator',        to: 'deep',      label: '业务赋权', type: 'task' },
    ],
  },
  {
    stage: 3,
    title: '协调执行 + 交付成果',
    desc: '组织者协调执行，交付成果给发起人——专班的工作闭环。',
    viewBox: '0 0 340 200',
    nodes: [
      { id: 'initiator', name: '发起人',     x: 170, y: 40,  color: '#B91C1C' },
      { id: 'organizer', name: '组织者',     x: 80,  y: 150, color: '#06B6D4' },
      { id: 'deep',      name: '深度参与者', x: 260, y: 150, color: '#10B981' },
    ],
    edges: [
      { from: 'organizer', to: 'deep',      label: '协调执行', type: 'task' },
      { from: 'organizer', to: 'initiator', label: '交付成果', type: 'info' },
    ],
  },
];

// 和组织对话——四阶段（行百里者半九十）
const DIALOGUE_STAGES = [
  {
    no: '01',
    phase: '工作之前',
    question: '谁去告诉同志们活动/专班的工作内容？',
    answer: '组长 / 发起人',
    desc: '工作开始前，由组长（活动）或发起人（专班）向参与同志讲清工作内容、边界与预期。',
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
    phase: '下一次迭代',
    question: '经验如何传承？',
    answer: '从这次到下一次',
    desc: '从一次活动/专班到下一次，同志与组织形成持续迭代的对话关系——上次的经验成为下次的起点，在实践中不断改进工作内容与模式。',
  },
];

// 党员发展 5 阶段 25 步
const DEVELOPMENT_STAGES = [
  {
    id: 1, name: '申请入党', stepRange: '1-5', owner: '申请人 / 党支部 / 上级党委',
    color: '#CE1126', summary: '申请人表达入党意愿，党组织初步了解并推荐为入党积极分子',
    steps: [
      { no: 1,  title: '递交入党申请书',     owner: '申请人',     time: null },
      { no: 2,  title: '党组织派人谈话',     owner: '党支部',     time: '15 日内' },
      { no: 3,  title: '推荐入党积极分子',   owner: '团组织/党员', time: null },
      { no: 4,  title: '支委会讨论确定',     owner: '支部委员会', time: null },
      { no: 5,  title: '报上级党委备案',     owner: '上级党委',   time: null },
    ],
  },
  {
    id: 2, name: '积极分子培养', stepRange: '6-10', owner: '培养联系人 / 党支部',
    color: '#3B82F6', summary: '对入党积极分子进行系统培养教育考察，符合条件的确定为发展对象',
    steps: [
      { no: 6,  title: '指定培养联系人',     owner: '党支部',       time: null },
      { no: 7,  title: '培养教育考察',       owner: '培养联系人',   time: '至少一年' },
      { no: 8,  title: '听取群众意见',       owner: '党支部',       time: null },
      { no: 9,  title: '支委会确定发展对象', owner: '支部委员会',   time: null },
      { no: 10, title: '报上级党委备案',     owner: '上级党委',     time: null },
    ],
  },
  {
    id: 3, name: '发展对象考察', stepRange: '11-15', owner: '入党介绍人 / 党支部 / 上级党委',
    color: '#D97706', summary: '对发展对象进行政治审查和集中培训，经上级党委预审后准备接收',
    steps: [
      { no: 11, title: '确定入党介绍人',     owner: '党支部',       time: null },
      { no: 12, title: '政治审查',           owner: '党支部',       time: null },
      { no: 13, title: '开展集中培训',       owner: '党支部',       time: '不少于 3 天' },
      { no: 14, title: '支委会审查',         owner: '支部委员会',   time: null },
      { no: 15, title: '上级党委预审',       owner: '上级党委',     time: null },
    ],
  },
  {
    id: 4, name: '预备党员接收', stepRange: '16-20', owner: '党支部 / 上级党委',
    color: '#10B981', summary: '召开支部大会讨论表决，上级党委审批后举行入党宣誓',
    steps: [
      { no: 16, title: '填写入党志愿书',     owner: '申请人',       time: null },
      { no: 17, title: '支部大会表决',       owner: '党支部',       time: '无记名投票' },
      { no: 18, title: '上级党委谈话',       owner: '上级党委',     time: null },
      { no: 19, title: '上级党委审批',       owner: '上级党委',     time: '3 个月内' },
      { no: 20, title: '举行入党宣誓',       owner: '党支部',       time: null },
    ],
  },
  {
    id: 5, name: '预备党员转正', stepRange: '21-25', owner: '党支部 / 党小组 / 上级党委',
    color: '#B91C1C', summary: '预备党员在预备期内接受教育考察，期满后按程序转正',
    steps: [
      { no: 21, title: '编入党支部和党小组', owner: '党支部',       time: null },
      { no: 22, title: '教育考察',           owner: '党支部',       time: '预备期一年' },
      { no: 23, title: '提出转正申请',       owner: '预备党员',     time: '期满前' },
      { no: 24, title: '支部大会表决',       owner: '党支部',       time: null },
      { no: 25, title: '上级党委审批',       owner: '上级党委',     time: null },
    ],
  },
];

// 小目录条目（7 个 section 对应 7 个圆点）
const TOC_ITEMS = [
  { id: 'hero',         label: '开篇' },
  { id: 'development',  label: '身份阶段' },
  { id: 'review',       label: '考察积极分子' },
  { id: 'philosophy',   label: '管理事，服务人' },
  { id: 'cognition',    label: '战略认知展开' },
  { id: 'works',        label: '两种工作' },
  { id: 'exploration',  label: '探索工作' },
  { id: 'dialogue',     label: '行百里者半九十' },
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

/** Section 1: Hero — 从申请人到正式党员 */
function renderHero() {
  return `
    <section id="hero" class="help-section help-hero-section" data-reveal data-toc-id="hero">
      <div class="help-section-inner help-hero-inner">
        <h1 class="help-hero-title">从申请人到<br/>正式党员</h1>
        <p class="help-hero-subtitle">每个同志的成长之路，也是支部的工作之道</p>
        <div class="help-hero-scroll-hint" aria-hidden="true">
          <span class="help-scroll-text">向下滚动</span>
          <svg class="help-scroll-arrow" width="20" height="28" viewBox="0 0 20 28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="10" y1="2" x2="10" y2="24"/>
            <polyline points="4 18 10 24 16 18"/>
          </svg>
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
    <section id="review" class="help-section help-review-section" data-reveal data-toc-id="review">
      <div class="help-section-inner">
        <h2 class="help-section-title">我们怎么考察积极分子？</h2>
        <p class="help-section-subtitle">三个维度——党课、贡献、评价，其中党建贡献特别看重原创性</p>
        <div class="help-review-grid">${cards}</div>
        <div class="help-review-footer">什么是党建贡献？→ 我们支部有一套工作架构</div>
      </div>
    </section>
  `;
}

/**
 * Section 3: 管理事，服务人——先锋模范作用落地论证
 *
 * 战略路线认定："管理事，服务人"
 * --------------------------------------------------
 * 本段为 help 页的浅层展示。"管理事，服务人"不仅是 UI 口号，
 * 而是系统级战略路线认定。详细设计理念见母本：
 * content/strategy/MANAGE_SERVE.md
 *
 * 核心命题：党支部不是职业准备所，而是通过组织获得成长的平台；组织性是资源而非门槛
 * 战略认知展开：理解真实（总）/ 善用经验（分·有先例）/ 创新沉淀（分·创新）/ 框架内对话（分·方法补充）
 */
function renderPhilosophy() {
  return `
    <section id="philosophy" class="help-section help-philosophy-section" data-reveal data-toc-id="philosophy">
      <div class="help-section-inner help-philosophy-inner">
        <div class="help-philosophy-eyebrow">我们支部的工作哲学</div>
        <h2 class="help-philosophy-title">管理事，<br/>服务人</h2>
        <div class="help-philosophy-split">
          <div class="help-philosophy-half">
            <div class="help-philosophy-half-label">管理事</div>
            <div class="help-philosophy-half-desc">把事情做好，工作有架构</div>
          </div>
          <div class="help-philosophy-divider" aria-hidden="true"></div>
          <div class="help-philosophy-half">
            <div class="help-philosophy-half-label">服务人</div>
            <div class="help-philosophy-half-desc">帮助同志成长，发展有路径</div>
          </div>
        </div>
        <div class="help-philosophy-reason" data-stagger>
          <div class="help-philosophy-reason-q">凭什么这样说？</div>
          <div class="help-philosophy-reason-a">
            因为我们要求党员的<span class="help-philosophy-emph">先锋模范作用落地</span>——不是喊口号，而是具体的。
          </div>
          <div class="help-philosophy-reason-detail">
            党员同志要帮助积极分子、发展对象同志熟悉支部工作、支部架构。
          </div>
        </div>
        <div class="help-philosophy-foot">先锋模范作用落地，才是"管理事，服务人"的真正含义</div>
      </div>
    </section>
  `;
}

/**
 * Section 3.5: 战略认知展开 + 恢复对话能力（P-041）
 *
 * 母本：content/strategy/MANAGE_SERVE.md 第三章 + 第六章
 * --------------------------------------------------
 * 总分结构：理解真实（总）→ 善用经验 / 创新沉淀 / 框架内对话（分）
 * 延伸段落：P-041 "恢复对话能力"战略表达
 */
function renderCognition() {
  return `
    <section id="cognition" class="help-section help-cognition-section" data-reveal data-toc-id="cognition">
      <div class="help-section-inner help-cognition-inner">
        <div class="help-cognition-eyebrow">战略认知展开</div>
        <h2 class="help-cognition-title">理解真实，才能服务人</h2>

        <div class="help-cognition-lead" data-stagger>
          <p>服务人的核心要义，是理解真实的组织和管理——不是想象中的等级森严，而是有管理的科学、有既往的经验。从这个认知出发，展开三个维度。</p>
        </div>

        <div class="help-cognition-grid">
          <article class="help-cognition-item" data-stagger>
            <div class="help-cognition-item-num">01</div>
            <h3 class="help-cognition-item-title">善用经验</h3>
            <p class="help-cognition-item-sub">对于有先例的工作</p>
            <p class="help-cognition-item-desc">先从既有工作流开始，理解流程为什么这样设计，再考虑要不要改。这样你才和组织发生实际的对话——不是凭空"我觉得"，而是基于已有经验去判断。</p>
          </article>

          <article class="help-cognition-item" data-stagger>
            <div class="help-cognition-item-num">02</div>
            <h3 class="help-cognition-item-title">创新沉淀</h3>
            <p class="help-cognition-item-sub">对于创新性的工作</p>
            <p class="help-cognition-item-desc">没有权威，没有"正确答案"等你去执行。每个人的意见和实践选择都很重要，组织要充分吸收个体经验，沉淀为新的工作流。</p>
          </article>

          <article class="help-cognition-item" data-stagger>
            <div class="help-cognition-item-num">03</div>
            <h3 class="help-cognition-item-title">框架内对话</h3>
            <p class="help-cognition-item-sub">两种工作的方法补充</p>
            <p class="help-cognition-item-desc">不要怕"说错话"——特别怕大家因为认为是"党支部"，所以怕说错话而选择不真实表达。框架内表达不是不许批评，而是批评要找准对象、找准时机。</p>
          </article>
        </div>

        <div class="help-cognition-dialogue" data-stagger>
          <div class="help-cognition-dialogue-label">延伸·恢复对话能力</div>
          <blockquote class="help-cognition-dialogue-quote">
            党建要帮助大家恢复和马克思主义的对话能力，恢复和现实世界的工程判断的对话能力。
          </blockquote>
          <p class="help-cognition-dialogue-desc">
            "恢复"而非"建立"——成员原本有这种能力，是在应试教育、脱离实践中逐渐丢了。马克思主义给思想高度，工程判断给实践深度，两个结合才是完整的党建目标。
          </p>
        </div>
      </div>
    </section>
  `;
}

/** Section 4: 两种工作（成熟 vs 探索） */
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
    <section id="works" class="help-section help-works-section" data-reveal data-toc-id="works">
      <div class="help-section-inner">
        <h2 class="help-section-title">我们面对两种工作</h2>
        <p class="help-section-subtitle">一种是接续发力，一种是试错创造——探索工作是人人都参与的场域，包括积极分子</p>
        <div class="help-works-grid">${cols}</div>
        <div class="help-works-footer">探索工作——发挥所有人智慧的场域 →</div>
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

  // v4.3.5：箭头改为独立 path 元素（原 SVG marker 无法直接控制 opacity）
  // 任务流=实心三角（派活交付的确定性），信息流=空心三角（报备告知的传递性）
  // 协作线无箭头（横向配合无方向），在连线两端用圆点表达平等关系
  // 箭头/圆点初始 opacity:0，JS 在线绘制完成（intraStageProgress > 0.95）后 fade in

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

    const g = svgEl('g', { class: `help-edge help-edge--${edge.type}${isSelf ? ' help-edge--self' : ''}`, 'data-from': edge.from, 'data-to': edge.to, 'data-stagger': '', 'data-stagger-delay': (network.nodes.length + i) * 120, ...(edge.stage !== undefined ? { 'data-stage': edge.stage } : {}), ...(inline ? { 'data-state': 'current' } : {}), ...(edge.detail ? { 'data-detail': edge.detail, 'data-label': edge.label || '' } : {}) });

    // v4.4.0：inline 模式下给 path 加 id，供脉搏光点 animateMotion 引用
    const pathId = inline ? `help-edge-path-${i}` : undefined;
    const pathEl = svgEl('path', {
      class: 'help-edge-path',
      d,
      ...(pathId ? { id: pathId } : {}),
    });
    g.appendChild(pathEl);

    // 箭头：独立 path 元素，初始 opacity:0，JS 在线绘制完成后 fade in
    // 非 collab 边才有箭头；计算方向角并旋转
    // v4.3.6：箭头统一实心三角（task 深红 #B91C1C / info 蓝 #3B82F6）；双向边在起点添加反向箭头
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
      // 双向边：起点添加反向箭头（organizer↔secretary 报备/审批）
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

    // 协作线两端圆点：表达"横向配合"的平等关系（无方向，两端对等）
    // 初始 opacity:0，JS 在线绘制完成后 fade in
    if (edge.type === 'collab' && !isSelf) {
      const dotR = 3;
      g.appendChild(svgEl('circle', { cx: path.x1, cy: path.y1, r: dotR, fill: '#9CA3AF', class: 'help-edge-dot', opacity: '0' }));
      g.appendChild(svgEl('circle', { cx: path.x2, cy: path.y2, r: dotR, fill: '#9CA3AF', class: 'help-edge-dot', opacity: '0' }));
    }

    // 标签：rect 白色背景 + text（避免与 node / 其他 label 重叠时不可读）
    // 协作线 label 为空，不渲染标签；支持手动 labelDx/labelDy 偏移
    if (edge.label) {
      const labelDx = edge.labelDx || 0;
      const labelDy = edge.labelDy || 0;
      const labelG = svgEl('g', { class: 'help-edge-label', transform: `translate(${mx + labelDx},${my + labelDy})` });
      // 先估算文本宽度（中文每字 ~12px，最小宽度 36px）
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

    // v4.4.0 Relational Pulse：inline 模式下添加脉搏光点（沿 path 流动的彩色圆点）
    // 算法艺术化表达——关系网络是"活的"，信息和任务在关系中流动
    // 不同边类型不同颜色不同节奏，避免视觉同步
    if (inline && !isSelf) {
      const pulseColor = edge.type === 'task' ? '#B91C1C' : edge.type === 'info' ? '#3B82F6' : '#9CA3AF';
      const pulseDur = edge.type === 'task' ? '2.8s' : edge.type === 'info' ? '3.4s' : '4s';
      const pulse = svgEl('circle', {
        class: 'help-edge-pulse',
        r: '2.8',
        fill: pulseColor,
        opacity: '0',
      });
      const animateMotion = svgEl('animateMotion', {
        dur: pulseDur,
        repeatCount: 'indefinite',
        rotate: 'auto',
        begin: `${i * 0.3}s`,  // 错峰启动，避免所有脉搏同步
      });
      const mpath = svgEl('mpath', { 'href': `#${pathId}`, 'xlink:href': `#${pathId}` });
      animateMotion.appendChild(mpath);
      pulse.appendChild(animateMotion);
      g.appendChild(pulse);
    }

    edgesG.appendChild(g);
  });
  svg.appendChild(edgesG);

  // 节点层（顶层）
  const nodesG = svgEl('g', { class: 'help-nodes' });
  network.nodes.forEach((node, i) => {
    const g = svgEl('g', { class: 'help-node-svg', 'data-id': node.id, 'data-stagger': '', 'data-stagger-delay': i * 120, ...(node.stage !== undefined ? { 'data-stage': node.stage } : {}), ...(inline ? { 'data-state': 'current' } : {}), transform: `translate(${node.x},${node.y})`, tabindex: '0', role: 'button', 'aria-label': `${node.name}：${node.duty}` });

    const circle = svgEl('circle', { class: 'help-node-circle', r: '40', fill: node.color });
    g.appendChild(circle);

    const ring = svgEl('circle', { class: 'help-node-ring', r: '44', fill: 'none', stroke: node.color, 'stroke-width': '1.5', opacity: '0.25' });
    g.appendChild(ring);

    const text = svgEl('text', { class: 'help-node-text', 'text-anchor': 'middle', 'dominant-baseline': 'middle', x: 0, y: 0, fill: '#FFFFFF' });
    text.textContent = node.name;
    g.appendChild(text);

    // 职责（节点下方）
    const duty = svgEl('text', { class: 'help-node-duty', 'text-anchor': 'middle', 'dominant-baseline': 'middle', x: 0, y: 58, fill: '#6B7280' });
    duty.textContent = node.duty;
    g.appendChild(duty);

    nodesG.appendChild(g);
  });
  svg.appendChild(nodesG);

  // domain 标签（党建/党务）—— v4 一般不用，保留兼容
  const domainHTML = domain
    ? `<span class="help-section-domain help-section-domain--${domain}">${domain === 'building' ? '党建工作' : '党务工作'}</span>`
    : '';

  // callouts 列表
  const calloutsHTML = callouts && callouts.length
    ? `<ul class="help-callout-list">${callouts.map(c => `<li>${c}</li>`).join('')}</ul>`
    : '';

  // 序列化 SVG：用 XMLSerializer 确保包含 xmlns 命名空间属性。
  // outerHTML 对 createElementNS 创建的 SVG 元素可能不包含 xmlns，
  // 导致 innerHTML 插入后浏览器不识别为 SVG 元素，内容不显示。
  const svgString = new XMLSerializer().serializeToString(svg);

  // wrap 内容（legend + container + tooltip）
  const wrapContent = `
    <div class="help-network-legend">
      <span class="help-legend-item"><span class="help-legend-line help-legend-line--task"></span>派活交付（实线·有方向）</span>
      <span class="help-legend-item"><span class="help-legend-line help-legend-line--info"></span>报备告知（虚线·有方向）</span>
      <span class="help-legend-item"><span class="help-legend-line help-legend-line--collab"></span>横向配合（点线·无方向）</span>
    </div>
    <div class="help-network-container">${svgString}</div>
    <div class="help-network-tooltip" aria-hidden="true"></div>
  `;

  // inline 模式：返回不带 section 包裹的内容（用于内嵌到 exploration section）
  if (inline) {
    return `
      <div class="help-network-wrap ${sectionClass}">
        ${wrapContent}
      </div>
    `;
  }

  return `
    <section id="${sectionId}" class="help-section help-network-section ${sectionClass} ${modifier}" data-reveal data-toc-id="${sectionId}">
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

/** 渲染分阶段 mini 关系图（v4.3.8 重构：时间轴 + 分阶段小图）
 *  每个阶段一个独立 mini SVG，只展示该阶段活跃的节点和边——信息聚焦不拥挤
 *  节点半径 28（小于 renderNetworkSVG 的 40），字体更小，无 duty 副标题
 *  复用 svgEl/edgePath 工具，三类线样式与 renderNetworkSVG 一致：
 *    - task 深红实线（有箭头）/ info 蓝虚线（有箭头，可双向）/ collab 灰点线（两端圆点）
 */
function renderMiniNetworkSVG(graph) {
  const svg = svgEl('svg', {
    xmlns: SVG_NS,
    class: 'help-mini-network-svg',
    viewBox: graph.viewBox,
    preserveAspectRatio: 'xMidYMid meet',
    'aria-label': `help-mini-stage-${graph.stage}`,
  });

  const nodeMap = {};
  graph.nodes.forEach(n => { nodeMap[n.id] = n; });

  // 边层（底层）
  const edgesG = svgEl('g', { class: 'help-edges' });
  graph.edges.forEach(edge => {
    const from = nodeMap[edge.from];
    const to = nodeMap[edge.to];
    if (!from || !to) return;

    const path = edgePath(from, to, 28, 0.5, 0);
    const { d, mx, my, x1, y1, x2, y2 } = path;

    const g = svgEl('g', {
      class: `help-edge help-edge--${edge.type}`,
      'data-from': edge.from,
      'data-to': edge.to,
    });

    g.appendChild(svgEl('path', { class: 'help-edge-path', d }));

    // 箭头：task/info 有方向，collab 无方向
    if (edge.type !== 'collab') {
      const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
      const arrowFill = edge.type === 'task' ? '#B91C1C' : '#3B82F6';
      g.appendChild(svgEl('path', {
        d: 'M -8 -4 L 0 0 L -8 4 z',
        fill: arrowFill,
        class: 'help-edge-arrow',
        transform: `translate(${x2},${y2}) rotate(${angle})`,
      }));
      // 双向边：起点添加反向箭头
      if (edge.bidirectional) {
        g.appendChild(svgEl('path', {
          d: 'M -8 -4 L 0 0 L -8 4 z',
          fill: arrowFill,
          class: 'help-edge-arrow',
          transform: `translate(${x1},${y1}) rotate(${angle + 180})`,
        }));
      }
    } else {
      // collab 两端圆点
      g.appendChild(svgEl('circle', { cx: x1, cy: y1, r: 3, fill: '#9CA3AF', class: 'help-edge-dot' }));
      g.appendChild(svgEl('circle', { cx: x2, cy: y2, r: 3, fill: '#9CA3AF', class: 'help-edge-dot' }));
    }

    // 标签：rect 白色背景 + text
    if (edge.label) {
      const labelG = svgEl('g', { class: 'help-edge-label', transform: `translate(${mx},${my})` });
      const labelWidth = Math.max(36, edge.label.length * 13 + 12);
      labelG.appendChild(svgEl('rect', {
        class: 'help-edge-label-bg',
        x: -labelWidth / 2,
        y: -10,
        width: labelWidth,
        height: 20,
        rx: 6,
      }));
      const text = svgEl('text', {
        class: 'help-edge-label-text',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        x: 0,
        y: 1,
      });
      text.textContent = edge.label;
      labelG.appendChild(text);
      g.appendChild(labelG);
    }

    edgesG.appendChild(g);
  });
  svg.appendChild(edgesG);

  // 节点层（顶层）
  const nodesG = svgEl('g', { class: 'help-nodes' });
  graph.nodes.forEach(node => {
    const g = svgEl('g', {
      class: 'help-node-svg',
      'data-id': node.id,
      transform: `translate(${node.x},${node.y})`,
    });
    g.appendChild(svgEl('circle', { class: 'help-node-circle', r: '28', fill: node.color }));
    g.appendChild(svgEl('circle', { class: 'help-node-ring', r: '32', fill: 'none', stroke: node.color, 'stroke-width': '1.5', opacity: '0.25' }));
    const text = svgEl('text', {
      class: 'help-node-text',
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
      x: 0,
      y: 0,
      fill: '#FFFFFF',
    });
    text.textContent = node.name;
    g.appendChild(text);
    nodesG.appendChild(g);
  });
  svg.appendChild(nodesG);

  return new XMLSerializer().serializeToString(svg);
}

/** Section 5: 探索工作——v4.4.0 Relational Pulse（关系脉动）
 *  设计理念：把支部关系网络想象成有生命的有机体——节点呼吸，边上脉搏流动。
 *  滚动时关系图演化：过去阶段淡入背景，当前阶段满色脉动，未来阶段几乎不可见。
 *  - "双列 sticky" = 左侧大关系图 sticky 钉住，右侧阶段说明滚动推进
 *  - "节点呼吸" = current 状态节点 r 在 40↔42 间缓慢循环（CSS animation 控制 SVG r 属性）
 *  - "边脉搏" = current 状态边上有彩色光点沿 path 流动（SVG SMIL animateMotion + mpath）
 *  - "三态演化" = past（灰化淡出）/ current（满色+呼吸+脉搏）/ future（极淡）
 *  - algorithmic-art 哲学：关系网络是"活的"——信息和任务在关系中流动，不是静态图
 *  - frontend-design 克制：一个 signature element（脉搏），其余克制——配色沿用 8 角色，
 *    字体 Noto Serif SC，结构即信息（图与文的对位）
 */
function renderExploration() {
  const scenes = [
    {
      id: 'activity',
      no: '01',
      title: '活动：组长发起，同志们参与',
      network: ACTIVITY_NETWORK,
      stages: EXPLORATION_STAGES.activity,
      note: '探索的边界由组长划定，信息流与任务流并行——从策划、通知、执行到考勤、归档，每个环节都有明确的"谁找谁"。',
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
    // inline 模式渲染大关系图（含脉搏光点）
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
    <section id="exploration" class="help-section help-network-section help-exploration-section" data-reveal data-toc-id="exploration">
      <div class="help-section-inner">
        <h2 class="help-section-title">探索工作——谁在什么时候该去找谁？</h2>
        <p class="help-section-subtitle">活动与专班，两种探索方式——滚动看关系如何展开，每个阶段都是一次生动的脉动</p>
        ${scenesHTML}
      </div>
    </section>
  `;
}

/** Section 6: 和组织对话——行百里者半九十（四阶段环形循环） */
function renderDialogue() {
  const cards = DIALOGUE_STAGES.map(s => `
    <div class="help-dialogue-card help-dialogue-card--pos${s.no}" data-stagger tabindex="0">
      <div class="help-dialogue-no">${s.no}</div>
      <div class="help-dialogue-phase">${s.phase}</div>
      <div class="help-dialogue-question">${s.question}</div>
      <div class="help-dialogue-answer">${s.answer}</div>
      <div class="help-dialogue-desc">${s.desc}</div>
    </div>
  `).join('');

  // 4 个 SVG 箭头（线+箭头头，精致统一，替代 CSS border 三角形）
  const arrowSVG = `<svg viewBox="0 0 20 14" fill="none" aria-hidden="true"><path d="M3 7 L15 7 M11 2 L15 7 L11 12" stroke="var(--help-party-red)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  return `
    <section id="dialogue" class="help-section help-dialogue-section" data-reveal data-toc-id="dialogue">
      <div class="help-section-inner">
        <h2 class="help-section-title">行百里者半九十</h2>
        <p class="help-section-subtitle">活动不是做了就行——必须和组织对话，在实践中持续改进</p>
        <div class="help-dialogue-cycle">
          <svg class="help-dialogue-ring" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <ellipse cx="50" cy="50" rx="46" ry="46" fill="none" stroke="var(--help-party-red)" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.35" vector-effect="non-scaling-stroke" />
          </svg>
          <div class="help-dialogue-flow">${cards}</div>
          <div class="help-dialogue-arrow help-dialogue-arrow--01-02" aria-hidden="true">${arrowSVG}</div>
          <div class="help-dialogue-arrow help-dialogue-arrow--02-03" aria-hidden="true">${arrowSVG}</div>
          <div class="help-dialogue-arrow help-dialogue-arrow--03-04" aria-hidden="true">${arrowSVG}</div>
          <div class="help-dialogue-arrow help-dialogue-arrow--04-01" aria-hidden="true">${arrowSVG}</div>
        </div>
        <div class="help-dialogue-foot">事前 → 事中 → 事后 → 下一次——循环往复，同志与组织在实践中不断改进</div>
      </div>
    </section>
  `;
}

/** Section 7: 党员发展时间轴 */
function renderDevelopment() {
  const stages = DEVELOPMENT_STAGES.map(stage => `
    <div class="help-stage-card" data-stage="${stage.id}" style="--stage-color:${stage.color};" data-stagger tabindex="0" role="button" aria-expanded="false" aria-label="阶段${stage.id}：${stage.name}">
      <div class="help-stage-bar"></div>
      <div class="help-stage-no">${stage.id}</div>
      <div class="help-stage-name">${stage.name}</div>
      <div class="help-stage-range-badge">步骤 ${stage.stepRange}</div>
      <div class="help-stage-owner">${stage.owner}</div>
      <div class="help-stage-summary">${stage.summary}</div>
      <div class="help-stage-toggle">点击展开详情</div>
    </div>
  `).join('');

  const details = DEVELOPMENT_STAGES.map(stage => {
    const steps = stage.steps.map(s => `
      <div class="help-step-row">
        <span class="help-step-no">${s.no}</span>
        <span class="help-step-title">${s.title}</span>
        <span class="help-step-owner">${s.owner}</span>
        ${s.time ? `<span class="help-step-time">${s.time}</span>` : '<span class="help-step-time help-step-time--empty"></span>'}
      </div>
    `).join('');
    return `
      <div class="help-stage-detail" data-stage-detail="${stage.id}">
        <div class="help-stage-detail-header" style="--stage-color:${stage.color};">
          <span class="help-stage-detail-name">阶段 ${stage.id} · ${stage.name}</span>
          <span class="help-stage-detail-range">步骤 ${stage.stepRange}</span>
        </div>
        <div class="help-step-list">${steps}</div>
      </div>
    `;
  }).join('');

  return `
    <section id="development" class="help-section help-development-section" data-reveal data-toc-id="development">
      <div class="help-section-inner">
        <h2 class="help-section-title">5 个阶段，25 个步骤</h2>
        <p class="help-section-subtitle">身份阶段的演进——点击阶段卡片展开详情</p>
        <div class="help-stage-grid">${stages}</div>
        <div class="help-stage-detail-area" id="help-stage-detail-area">
          <div class="help-stage-detail-placeholder">点击上方任意阶段，查看该阶段的具体步骤</div>
        </div>
        <div class="help-stage-detail-templates" hidden>${details}</div>
        <div class="help-development-coda">身份阶段的演进只是起点——支部如何考察每一位积极分子？</div>
      </div>
    </section>
  `;
}

/** 固定小目录（桌面端右侧，移动端隐藏） */
function renderTOC() {
  // 右上角竖向圆点导航：7 个圆点对应 7 个 section，半透明、hover 显 tooltip
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
    ${safe('Development', renderDevelopment)}
    ${safe('Review', renderReview)}
    ${safe('Philosophy', renderPhilosophy)}
    ${safe('Cognition', renderCognition)}
    ${safe('TwoWorks', renderTwoWorks)}
    ${safe('Exploration', renderExploration)}
    ${safe('Dialogue', renderDialogue)}
    <footer class="help-page-footer">
      <a href="${base}index.html" class="help-back-link">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        返回主页
      </a>
    </footer>
  `;
}

// ════════════════════════════════════════════════════════════════
//  交互逻辑
// ════════════════════════════════════════════════════════════════

/** 滚动触发淡入 + stagger 动画 */
function bindScrollReveal() {
  const sections = document.querySelectorAll('[data-reveal]');
  if (!sections.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        // 触发内部 stagger 元素
        entry.target.querySelectorAll('[data-stagger]').forEach(el => {
          const delay = el.dataset.staggerDelay || 0;
          el.style.transitionDelay = `${delay}ms`;
          el.style.animationDelay = `${delay}ms`;
        });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  sections.forEach(s => observer.observe(s));
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

    // 收集节点数据用于 tooltip
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
      // 定位到节点上方
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

    // 连线 hover 加粗 + tooltip 显示详情（回答"汇报什么？提交什么？"）
    edges.forEach(edge => {
      edge.addEventListener('mouseenter', (e) => {
        if (!svg.classList.contains('has-hover')) {
          edge.classList.add('hovered');
        }
        // 显示连线 tooltip
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

/** 党员发展：阶段卡片点击展开 */
function bindStageToggle() {
  const content = document.getElementById('help-content');
  if (!content) return;
  const area = document.getElementById('help-stage-detail-area');
  if (!area) return;

  const activate = (stageId) => {
    const stage = DEVELOPMENT_STAGES.find(s => s.id === stageId);
    if (!stage) return;

    const cards = content.querySelectorAll('.help-stage-card');
    const current = content.querySelector(`.help-stage-card[data-stage="${stageId}"]`);
    const isAlreadyActive = current?.classList.contains('active');

    if (isAlreadyActive) {
      // 折叠
      cards.forEach(c => { c.classList.remove('active'); c.setAttribute('aria-expanded', 'false'); });
      area.classList.remove('is-expanded');
      area.style.maxHeight = area.scrollHeight + 'px';
      requestAnimationFrame(() => { area.style.maxHeight = '0px'; });
      return;
    }

    cards.forEach(c => { c.classList.toggle('active', Number(c.dataset.stage) === stageId); c.setAttribute('aria-expanded', String(Number(c.dataset.stage) === stageId)); });

    const tpl = content.querySelector(`[data-stage-detail="${stageId}"]`);
    const wasExpanded = area.classList.contains('is-expanded');
    area.innerHTML = tpl ? tpl.innerHTML : '<div class="help-stage-detail-placeholder">暂无数据</div>';
    area.classList.add('is-expanded');

    if (!wasExpanded) {
      area.style.maxHeight = '0px';
      requestAnimationFrame(() => { area.style.maxHeight = area.scrollHeight + 'px'; });
      const onEnd = (e) => {
        if (e.propertyName === 'max-height') {
          area.style.maxHeight = 'none';
          area.removeEventListener('transitionend', onEnd);
        }
      };
      area.addEventListener('transitionend', onEnd);
    } else {
      area.style.maxHeight = 'none';
    }
  };

  content.addEventListener('click', e => {
    const card = e.target.closest('.help-stage-card');
    if (card) { activate(Number(card.dataset.stage)); return; }
  });
  content.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const card = e.target.closest('.help-stage-card');
    if (card) { e.preventDefault(); activate(Number(card.dataset.stage)); }
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

/** 探索工作——v4.4.0 Relational Pulse 滚动联动
 *
 *  双列 sticky 布局：左侧大关系图 sticky 钉住，右侧阶段说明滚动推进。
 *  滚动时根据右侧 stage 位置，更新左侧网络图中所有节点和边的 data-state：
 *  - stage 进入视口中部 → 对应节点/边 data-state="current"（满色 + 呼吸 + 脉搏）
 *  - stage 离开视口上方 → 对应节点/边 data-state="past"（灰化淡出）
 *  - stage 离开视口下方 → 对应节点/边 data-state="future"（极淡）
 *
 *  降级策略：
 *  - prefers-reduced-motion: 所有 stage 和节点/边直接 data-state="current"，无呼吸/脉搏动画
 */
function setNetworkState(networkWrap, currentStage) {
  if (!networkWrap) return;
  networkWrap.setAttribute('data-state', 'current');

  networkWrap.querySelectorAll('.help-node-svg').forEach(node => {
    const stage = parseInt(node.dataset.stage, 10);
    if (isNaN(stage)) return;
    if (stage < currentStage) node.setAttribute('data-state', 'past');
    else if (stage === currentStage) node.setAttribute('data-state', 'current');
    else node.setAttribute('data-state', 'future');
  });

  networkWrap.querySelectorAll('.help-edge').forEach(edge => {
    const stage = parseInt(edge.dataset.stage, 10);
    if (isNaN(stage)) return;
    if (stage < currentStage) edge.setAttribute('data-state', 'past');
    else if (stage === currentStage) edge.setAttribute('data-state', 'current');
    else edge.setAttribute('data-state', 'future');
  });
}

function bindExplorationScrollDriven() {
  const scenes = document.querySelectorAll('.help-exploration-scene');
  if (!scenes.length) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 初始化：每个 scene 的第一个 stage 设为 current，网络图也同步到 stage 0
  scenes.forEach(scene => {
    const sceneStages = scene.querySelectorAll('.help-exploration-stage');
    const networkWrap = scene.querySelector('.help-exploration-network-sticky');
    if (!sceneStages.length || !networkWrap) return;

    if (prefersReduced) {
      // 降级：所有 stage 和网络图元素直接 current
      sceneStages.forEach(s => s.setAttribute('data-state', 'current'));
      networkWrap.querySelectorAll('.help-node-svg, .help-edge').forEach(el => {
        el.setAttribute('data-state', 'current');
      });
      return;
    }

    sceneStages.forEach((s, i) => {
      s.setAttribute('data-state', i === 0 ? 'current' : 'future');
    });
    setNetworkState(networkWrap, 0);
  });

  if (prefersReduced) return;

  // IntersectionObserver：基于 root zone 内的 stage 位置重新计算所有状态
  // rootMargin: 顶部 -20%，底部 -30% → 视口中部 20%~70% 的区域作为"current zone"
  // 策略：每次回调时，遍历每个 scene，找到 root zone 内最接近视口中心的 stage 作为 current
  //       其余 stage 按 idx 设为 past/future；网络图中的节点/边同步更新
  const observer = new IntersectionObserver(() => {
    const vh = window.innerHeight;
    const rootTop = vh * 0.20;
    const rootBottom = vh * 0.70;
    const viewportCenter = vh / 2;

    scenes.forEach(scene => {
      const sceneStages = scene.querySelectorAll('.help-exploration-stage');
      const networkWrap = scene.querySelector('.help-exploration-network-sticky');
      if (!sceneStages.length || !networkWrap) return;

      // 找到在 root zone 内且最接近视口中心的 stage
      let currentStage = null;
      let minDist = Infinity;
      sceneStages.forEach(s => {
        const rect = s.getBoundingClientRect();
        if (rect.bottom > rootTop && rect.top < rootBottom) {
          const center = rect.top + rect.height / 2;
          const dist = Math.abs(center - viewportCenter);
          if (dist < minDist) {
            minDist = dist;
            currentStage = s;
          }
        }
      });

      // 没有 stage 在 root zone 内，保持现状
      if (!currentStage) return;

      const currentStageIdx = parseInt(currentStage.dataset.stage, 10);
      sceneStages.forEach(s => {
        const idx = parseInt(s.dataset.stage, 10);
        if (idx < currentStageIdx) s.setAttribute('data-state', 'past');
        else if (idx === currentStageIdx) s.setAttribute('data-state', 'current');
        else s.setAttribute('data-state', 'future');
      });

      // 同步更新左侧网络图
      setNetworkState(networkWrap, currentStageIdx);
    });
  }, {
    threshold: [0, 0.15, 0.4],
    rootMargin: '-20% 0px -30% 0px',
  });

  document.querySelectorAll('.help-exploration-stage').forEach(s => observer.observe(s));
}

// ════════════════════════════════════════════════════════════════
//  启动
// ════════════════════════════════════════════════════════════════

renderHelpContent();
bindScrollReveal();
bindNetworkHover();
bindStageToggle();
bindTOC();
bindExplorationScrollDriven();
