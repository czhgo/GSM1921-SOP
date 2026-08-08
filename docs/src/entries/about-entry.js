﻿// role: [工程师]+[AI]
// entries/about-entry.js — 关于页入口 v15（讲我们支部的故事）
// 核心理念：从"关系网络"到"支部的故事"——以党员成长为主线，讲清考察、工作哲学、探索与对话
// 设计风格：苹果风（纯白 + 大留白 + 大字体 + 微妙动画）
// 签名元素：【管理事，服务人】收束点题 + Exploration SVG 关系网络
// v15.3 变更（2026-08-04 书记五项修订复议）——动画架构重构，落业界成熟经验：
//   ①引入 Lenis 平滑滚动（unpkg 1.3.25，gsap.ticker 驱动 + ScrollTrigger.update 同步；reduced-motion 回落原生滚动）
//   ②全页 scrub:0.8/0.3 → scrub:true（滚动位置已被 Lenis 平滑，1:1 精确映射到每一时刻，杜绝"统一滞后"机械感）
//   ③阶段跳变改连续渐变：探索网络用 stageProgress 在相邻 stage 目标态间插值（节点 opacity/scale/saturate、边 opacity/dashoffset）
//     —— 删除二进制重渲染，根治"吸住又跳过"卡点；对话四卡"点亮→渐隐"连续插值；发展阶段高亮二进制改按进度插值
//   ④句式清理（本页范围）：对话卡 2 处「不是…就/才」改叙述式；书记原话保留
// v15.2 变更：v5.2 修订（2026-08-04 书记五项指令）——①删除过程性 spec 文档 ②卡片渐变改纯色（扁平化）
//   ③移除探索区 GSAP 吸附（bindExplorationSceneSnap 删除 + ab-snap-target 死类清理），治"吸住又跳过"卡点
//   ④全页 scrub:true→scrub:0.8 lerp 惯性平滑（v15.3 复议否决：统一 lerp 造成"机械滞后"，改 Lenis 平滑 + scrub:true）
//   ⑤叙事顺序重构方案A（认知→价值→路径：组织性→宝贵机会→发展流程→两种工作→考察→探索→对话）+ 章节重编号 + TOC/镜头交接同步
//   ⑥「不是……而是……」句式改写为叙述式（CLAUDE.md T-199 P-014 判例；书记原话"爱具体的人…"保留）
// v15.1 变更：v5.1 修订（2026-08-04 书记四条指令）——①卡片入场短区间 + power2.out + stagger 0.08 + scrub 可逆（正倒对称、不再快翻走才清晰）
//   ②修复卡片"黑色"根因：gsap.to filter from 态被解析为 brightness(0) 压暗整章 → 显式 fromTo brightness(1)→0.92 ③背景全页统一
//   --ab-paper-0（删除 nth-child(even) 深浅交替）④hero 大标题改党建红 ⑤终章去掉突变红色/光圈层，保持暖白 + 党建红大字 + 温和落位驶入
// v15 变更：v5 电影镜头流落地（2026-08-04 书记批准）——① bindCameraFlow 统一镜头语言（场景后拉/驶入交接 + 胶片时间码 + 进度线）
//   替换 v4 叠层拆分 ② 终章光圈 clip-path 全屏扩展（修复 end 越界断头，触发器钉页面底部）③ 背景统一 #FAF8F4 系 + 噪点 0.035
//   ④ 探索区分镜切换（活动退场 + 专班光圈揭示）+ 边描边生长 1.2s + 过去边弱化保留 + 节点行星呼吸 ⑤ 吸附停靠点重新校准至章节头部
// v14 变更：电影化滚动叙事（2026-08-04 书记批准）——①Hero 滚动退场场景切换 ②章节边界 GSAP snap 滚动吸附
//   ③信息章节 pin + 覆盖滑入叠层转场 ④终章封章全屏扩展转场 + Hero/终章微光粒子（原生 Canvas，党建红金）
//   Development 滚动驱动进度条+阶段高亮、Dialogue 环形四阶段滚动点亮、Exploration 节点光晕升级；reduced-motion 全面降级
// v13 变更：Exploration 从 Canvas 像素人动画切换为 SVG 关系网络脉动动画，保留 13 步 Development 时间轴 + GSAP 动画
// v12 变更：Exploration Canvas v2 重构——全屏沉浸 + 像素人 + 自由漫步 + 镜头推拉 + 脚印粒子 + 物件传递 + 编排式动画 + 滚动控制 + 底部字幕
// v10 变更：Exploration SVG 活动关系网络重构为 HTML div 节点 + SVG 连线 + 编排式 GSAP timeline（统一调度）替代 scrub 景深动画
// v9 变更：Development 时间轴重构为居中单列卡片布局（typography-first）+ 删除三列 grid/辅助线/交替布局 + GSAP 入场动画替代 scrub + 卡片点击展开详情（GSAP 动画）+ 决策节点用左侧色条区分（非金色光晕）
// v8 变更：GSAP ScrollTrigger 全接管（移除 IntersectionObserver + is-revealed）+ Hero 金色装饰线 + TOC 始终可见 label + Development 阶段交替双列布局 + Dialogue 竖向四步 + bindPageAnimations 统一动画入口 + Exploration 景深参数调优（0.6/0.92/0.7 + filter）
// v7 变更：Hero 标题改为成长路径 + Cognition 重构为组织性辩证法（个体→组织/组织→个体/个体→组织）+ Development 副标题精简 + 移除"三会决策节点"T3 表达 + 新增 Conclusion 收束 section（管理事，服务人）
// v6 变更：Section 重组（8→7）+ 13 节点横向时间轴（7 决策节点金色光晕）+ Exploration GSAP scrub 动画（替代 v5.2）+ T3 编程行话/自造隐喻清除
// v4 变更：去党建vs党务对比/考勤/思想汇报/角色独立section；新增考察积极分子/核心口号/两种工作/探索工作/行百里者半九十

import { renderSidebar } from '../components/sidebar.js?v=20260808m';
import { renderHeader } from '../components/header.js?v=20260808m';
import { getBasePath } from '../core/utils.js?v=20260808m';
import { icon } from '../core/icons.js?v=20260808m';

// ── 公开访问：不检查登录 ──
renderSidebar('about');
renderHeader('about');

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
    desc: '在活动策划、专班任务中发挥创造力，做出可被识别的原创性工作——这是考察的核心维度。',
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
    examples: ['活动策划', '专班任务'],
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
    { stage: 2, title: '组织者分工', desc: '组织者作为执行核心（脑子），向深度参与者分派具体任务清单——分工并行的起点。', flows: ['组织者 → 深度参与者（分工）'] },
    { stage: 3, title: '通知出席 + 带动参与', desc: '组织者通知普通参与者，深度参与者带动普通参与者参与——执行与扩散并行。', flows: ['组织者 → 普通参与者（通知）', '深度参与者 → 普通参与者（带动参与）'] },
    { stage: 4, title: '考勤考察 + 宣传报道', desc: '组织者提交考勤给纪检委员，向宣传委员提出宣传需求——监督与传播并行。', flows: ['组织者 → 纪检委员（提交考勤）', '组织者 → 宣传委员（宣传需求）', '支书 ↔ 纪检委员（横向配合）', '支书 ↔ 宣传委员（横向配合）'] },
    { stage: 5, title: '考察建档 + 人才库更新', desc: '组织者提交考察材料，纪检委员提交考察记录——组织委员据此更新支部人才库。原始材料留在纪检委员处。', flows: ['组织者 → 组织委员（考察建档）', '纪检委员 → 组织委员（考察记录）', '支书 ↔ 组织委员（横向配合）'] },
  ],
  taskforce: [
    { stage: 0, title: '发起人请求招募', desc: '发起人（书记/党小组组长/支委）请求组织委员招募——专班的起点。', flows: ['发起人'] },
    { stage: 1, title: '组织委员招募', desc: '组织委员作为唯一招募节点，接收招募请求。', flows: ['发起人 → 组织委员（请求招募）'] },
    { stage: 2, title: '招募赋权 + 业务赋权', desc: '组织委员招募赋权 + 发起人业务赋权——同时给组织者和深度参与者赋权。', flows: ['组织委员 → 组织者（招募赋权）', '组织委员 → 深度参与者（招募赋权）', '发起人 → 组织者（业务赋权）', '发起人 → 深度参与者（业务赋权）'] },
    { stage: 3, title: '协调执行 + 交付成果', desc: '组织者协调执行，交付成果给发起人——专班的工作闭环。', flows: ['组织者 → 深度参与者（协调执行）', '组织者 → 发起人（交付成果）'] },
  ],
};

// ===== SVG 关系网络（脉动动画） =====
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
  const stagesContainer = container.querySelector('.ab-exploration-stages');
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
    const nodeEl = svg.querySelector(`.ab-node-svg[data-id="${node.id}"]`);
    if (!nodeEl) return;

    const isActive = activeNodeIds.has(node.id);
    const isStar = node.id === starId;

    const scale = isActive ? PLANETARY_CONFIG.activeScale : PLANETARY_CONFIG.inactiveScale;
    nodeEl.style.transform = `translate(${node.x}px, ${node.y}px) scale(${scale})`;

    nodeEl.style.opacity = isActive ? PLANETARY_CONFIG.activeOpacity : PLANETARY_CONFIG.inactiveOpacity;
    nodeEl.style.filter = `saturate(${isActive ? PLANETARY_CONFIG.activeSaturate : PLANETARY_CONFIG.inactiveSaturate})`;

    nodeEl.setAttribute('data-role', isStar ? 'star' : (isActive ? 'planet' : 'inactive'));

    const circle = nodeEl.querySelector('.ab-node-circle');
    if (circle) {
      const baseRadius = isStar
        ? PLANETARY_CONFIG.starRadius
        : (isActive ? PLANETARY_CONFIG.planetRadius : PLANETARY_CONFIG.inactiveRadius);
      circle.setAttribute('r', baseRadius);
    }
  });

  // 2. 更新所有边
  network.edges.forEach(edge => {
    const edgeEl = svg.querySelector(`.ab-edge[data-from="${edge.from}"][data-to="${edge.to}"]`);
    if (!edgeEl) return;

    const pathEl = edgeEl.querySelector('.ab-edge-path');
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

    // v5 分镜原则：当前 stage 边亮起、过去弱化保留、未来不提前出现
    const edgeStage = edge.stage;
    const edgeOpacity = edgeStage === currentStageIndex
      ? PLANETARY_CONFIG.edgeActiveOpacity
      : (edgeStage < currentStageIndex ? 0.22 : PLANETARY_CONFIG.edgeInactiveOpacity);
    edgeEl.style.opacity = edgeOpacity;
    if (totalLength > 0) {
      // 未来边未绘制（dashoffset=全长），当前/过去边已绘制；CSS transition 1.2s 描边生长
      pathEl.style.strokeDashoffset = edgeStage > currentStageIndex ? `${totalLength}` : '0';
    }

    const arrowEl = edgeEl.querySelector('.ab-edge-arrow');
    if (arrowEl) {
      const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x) * 180 / Math.PI;
      arrowEl.setAttribute('transform', `translate(${toNode.x},${toNode.y}) rotate(${angle})`);
      arrowEl.style.opacity = edgeOpacity;
    }
  });
}

/** v15.3 预计算每个 stage 的节点目标态（供连续插值取用，避免每帧重复 identifyActiveNodes） */
function buildStageStates(network, stages) {
  return stages.map((_, s) => {
    const { activeNodeIds, starId } = identifyActiveNodes(s, network, stages);
    const nodeStates = {};
    network.nodes.forEach(node => {
      const isActive = activeNodeIds.has(node.id);
      const isStar = node.id === starId;
      nodeStates[node.id] = {
        opacity: isActive ? PLANETARY_CONFIG.activeOpacity : PLANETARY_CONFIG.inactiveOpacity,
        scale: isActive ? PLANETARY_CONFIG.activeScale : PLANETARY_CONFIG.inactiveScale,
        saturate: isActive ? PLANETARY_CONFIG.activeSaturate : PLANETARY_CONFIG.inactiveSaturate,
        radius: isStar ? PLANETARY_CONFIG.starRadius : (isActive ? PLANETARY_CONFIG.planetRadius : PLANETARY_CONFIG.inactiveRadius),
        role: isStar ? 'star' : (isActive ? 'planet' : 'inactive'),
      };
    });
    return { nodeStates };
  });
}

/** v15.3 连续渐变：p（连续 stage 位置 0..stageCount）逐帧驱动节点/边状态
 *  替代 v5.x 的二进制 stage 重渲染——状态跨 stage 平滑插值，根治"吸住又跳过"卡点。
 *  节点：opacity/scale/saturate/radius 在「当前 stage 目标态」与「下一 stage 目标态」间 lerp；
 *  边：进入本 stage 时描边生长（前 40% 行程），本 stage 内保持全亮，下一 stage 渐隐为「过去」，之后保持弱化；
 *  全程由滚动位置逐帧驱动（Lenis 平滑），CSS transition 已在 .ab-network-continuous 下禁用 → 精确到每一时刻。 */
function applyNetworkState(svg, network, p, stageCount, stageStates) {
  const lo = Math.min(stageCount - 1, Math.floor(p));
  const hi = Math.min(stageCount - 1, lo + 1);
  const f = p - lo;
  const stLo = stageStates[lo];
  const stHi = stageStates[hi];
  const smooth = (t) => t * t * (3 - 2 * t);

  network.nodes.forEach(node => {
    const el = svg.querySelector(`.ab-node-svg[data-id="${node.id}"]`);
    if (!el) return;
    const a = stLo.nodeStates[node.id];
    const b = stHi.nodeStates[node.id];
    el.style.opacity = String(a.opacity + (b.opacity - a.opacity) * f);
    el.style.transform = `translate(${node.x}px, ${node.y}px) scale(${a.scale + (b.scale - a.scale) * f})`;
    el.style.filter = `saturate(${a.saturate + (b.saturate - a.saturate) * f})`;
    const circle = el.querySelector('.ab-node-circle');
    if (circle) circle.setAttribute('r', String(a.radius + (b.radius - a.radius) * f));
    el.setAttribute('data-role', f < 0.5 ? a.role : b.role);
  });

  network.edges.forEach(edge => {
    const edgeEl = svg.querySelector(`.ab-edge[data-from="${edge.from}"][data-to="${edge.to}"]`);
    if (!edgeEl) return;
    const pathEl = edgeEl.querySelector('.ab-edge-path');
    const arrowEl = edgeEl.querySelector('.ab-edge-arrow');
    const L = EDGE_LENGTH_CACHE.get(pathEl) || 0;

    const e = edge.stage;
    let opacity, offset;
    if (p < e) {
      opacity = 0; offset = L;
    } else if (p < e + 0.4) {
      const t = smooth((p - e) / 0.4);
      opacity = t; offset = L * (1 - t);
    } else if (p < e + 1) {
      opacity = 1; offset = 0;
    } else if (p < e + 2) {
      const t = smooth(p - e - 1);
      opacity = 1 + (0.22 - 1) * t; offset = 0;
    } else {
      opacity = 0.22; offset = 0;
    }
    edgeEl.style.opacity = String(opacity);
    if (L > 0) pathEl.style.strokeDashoffset = String(offset);
    if (arrowEl) arrowEl.style.opacity = String(opacity);
    edgeEl.querySelectorAll('.ab-edge-dot').forEach(d => { d.style.opacity = String(opacity); });
  });
}

// ===== SVG 关系网络（脉动动画） End =====

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

// 发展党员 13 关键时间节点（依据《中国共产党发展党员工作细则（2026年）》T1 原文）
// isDecisionNode: 关键决策节点（含党支部委员会/党支部党员大会/上级党委），用金色光晕环标记
// article: 条号（T1 原文出处）
const DEVELOPMENT_TIMELINE = [
  // 阶段 1：入党申请人 → 入党积极分子
  // timeHighlight：递交入党申请书须年满十八周岁（书记决策，2026-08-01 重点标注）
  { no: 1,  title: '递交入党申请书',     time: '年满十八岁',     decisionMaker: '本人自愿',            decisionDetail: '入党申请人表达意愿',                       article: '§5',  isDecisionNode: false, stage: 'applicant', stickyNote: null, timeHighlight: true },
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
  { id: 'philosophy',   label: '宝贵机会' },
  { id: 'development',  label: '身份阶段' },
  { id: 'works',        label: '两种工作' },
  { id: 'review',       label: '考察维度' },
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

/** Section 2: 考察积极分子（三维度卡片，党建贡献高亮） */
function renderReview() {
  const cards = REVIEW_DIMENSIONS.map((d, i) => `
    <div class="ab-review-card ${d.highlight ? 'ab-review-card--highlight' : ''}" data-stagger tabindex="0" role="button" aria-label="${d.name}：${d.tag}">
      <span class="ab-review-card-no">${String(i + 1).padStart(2, '0')}</span>
      <div class="ab-review-card-head">
        <span class="ab-review-card-name">${d.name}</span>
        ${d.highlight ? '<span class="ab-review-card-badge">核心</span>' : ''}
      </div>
      <div class="ab-review-card-tag">${d.tag}</div>
      <div class="ab-review-card-desc">${d.desc}</div>
    </div>
  `).join('');

  return `
    <section id="review" class="ab-page ab-review-section" data-toc-id="review">
      <span class="ab-page-no">05</span>
      <span class="ab-page-runner">第五章 · 考察积极分子</span>
      <div class="ab-chapter">
        <div class="ab-chapter-eyebrow">考察维度</div>
        <h2 class="ab-chapter-title">我们怎么考察积极分子？</h2>
        <p class="ab-chapter-sub">三项考察内容——党课、贡献、评价，其中党建贡献特别看重原创性</p>
        <div class="ab-review-grid">${cards}</div>
        <div class="ab-review-footer">什么是党建贡献？→ 我们支部有一套工作架构</div>
      </div>
    </section>
  `;
}

/**
 * Section 4: 两条宝贵机会
 *
 * 母本：content/01_strategy/DEVELOPMENT_PATH.md 第一章·两条宝贵机会
 * T-195 第3轮重构：提炼版 quote 默认展示（梳理逻辑一目了然），点击卡片平滑切换为书记原话全文
 *   机会1（辩证递进结构）：quote 提炼=辩证句，points=两个向度定义，insight=在册意义句
 *   机会2（总起并列结构）：quote 提炼=总起+两条机会，points=要点解释，insight=在册论断句
 *   基线：SECRETARY_PRONOUNCEMENTS.md P-043 / P-044 书记原话与在册正文
 */
function renderPhilosophy() {
  const opportunities = [
    {
      no: '机会 1',
      title: '民主集中制下感受真实组织的两个向度',
      quote: '真实的组织不能只靠程序性，也不能只靠扁平化——两个向度的平衡，是支部生活中宝贵的成长机会。',
      fullQuote: '"民主集中制"下 感受真实的组织的两个向度："赋权"背景下的程序性 和 "探索"背景下的扁平化。这也就意味着真实的组织，不能只靠程序性令人凝聚在一起，也不能只靠"扁平化"而不去形成共识、带来效率。——提高生涯发展中对于所处组织的适应能力和开放心态。',
      points: [
        { label: '程序性', desc: '"赋权"背景下——组织通过分工、流程、记录、复盘让人凝聚' },
        { label: '扁平化', desc: '"探索"背景下——组织通过平等协商、无上下级分工让人创新' },
      ],
      insight: '体悟这种平衡，能提高生涯发展中对于所处组织的适应能力和开放心态——未来无论进入什么组织，都能理解真实组织既有程序性的一面，也有扁平化的一面。',
    },
    {
      no: '机会 2',
      title: 'AI时代中学生党支部的探索机会',
      quote: '作为AI时代中一个建设方兴未艾的学生组织，支部提供两条独特的探索机会：①真实地参与组织制度和组织文化的构建；②在"没有经济负担"的背景下探索AI时代组织转型的萌芽和组织产品的生产。',
      fullQuote: '作为AI时代中一个建设方兴未艾的学生组织，①可以真实地参与组织制度和组织文化的构建；②可以在"没有经济负担"的背景下探索AI时代下组织转型的萌芽和组织产品的生产。',
      points: [
        { label: '参与构建', desc: '可以真实地参与组织制度和组织文化的构建' },
        { label: '探索自由度', desc: '在"没有经济负担"的背景下探索组织转型的萌芽和组织产品的生产——未来进入职场后难以获得' },
      ],
      insight: '学生党支部的"方兴未艾"恰恰是机会所在：成熟组织没有这种探索空间，而学生组织有。',
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
      <article class="ab-philosophy-opp" data-stagger tabindex="0" role="button" aria-expanded="false" aria-label="${opp.no}：点击查看书记原话全文">
        <div class="ab-philosophy-opp-no">${opp.no}</div>
        <h3 class="ab-philosophy-opp-title">${opp.title}</h3>
        <blockquote class="ab-philosophy-opp-quote" data-brief="${encodeURIComponent(opp.quote)}" data-full="${encodeURIComponent(opp.fullQuote)}">
          ${opp.quote}
        </blockquote>
        <div class="ab-philosophy-opp-points">${pointsHTML}</div>
        <p class="ab-philosophy-opp-insight">${opp.insight}</p>
      </article>
    `;
  }).join('');

  return `
    <section id="philosophy" class="ab-page ab-philosophy-section ab-page--stagger" data-toc-id="philosophy">
      <span class="ab-page-no">02</span>
      <span class="ab-page-runner">第二章 · 宝贵机会</span>
      <div class="ab-chapter ab-philosophy-inner">
        <div class="ab-chapter-eyebrow">宝贵机会</div>
        <h2 class="ab-chapter-title">两条宝贵机会</h2>
        <p class="ab-chapter-sub" data-stagger>
          爱具体的组织——光华管理学院本科生党支部提供两条难得的成长机会。
        </p>
        <div class="ab-philosophy-opportunities">${cards}</div>
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
      body: '各种发展导向的同学——想进体制的、想走学术的、想去企业的——都能在组织中获得各自的成长。先锋模范在具体的工作中就能体现——任何一名党员都有自己的用武之地和成长空间。成长有两条路：个人闷头努力，或借由组织的经验、流程、集体智慧放大努力。光华管理学院本科生党支部就是你能在学院里接触到的那个具体组织。',
    },
    {
      num: '02',
      direction: '组织 → 个体',
      title: '事情运作有管理科学和既往经验',
      body: '真实组织运作靠流程和经验。事情的运转有管理科学——分工、流程、记录、复盘有规律；有既往经验——历届支委沉淀的工作流是可复用的资产。成员调取并执行这些工作流，本身就是成长：执行过程让抽象的"管理知识"变成手上会用的"管理能力"。支书主持会议、副书记协助、组织委员统筹专班、宣传委员管档案、纪检委员管考勤——这些是具体的分工，依据事情本身划分，不依据层级。',
    },
    {
      num: '03',
      direction: '个体 → 组织',
      title: '发挥主人翁精神在框架内真实表达',
      body: '组织性的真正功能是让各种发展轨迹的人通过组织获得成长——个人借由组织实现诉求，组织为个体提供成长路径。批评要在框架内提出：找准对象、找准时机。创新沉淀，就是把"没先例"变成"有先例"。你想做学术、想去企业、想走自己的路——支部的创新沉淀机制给你提供"把个人实践变成组织先例"的途径。',
    },
  ];

  const cards = stages.map(s => `
    <article class="ab-cognition-item" data-stagger>
      <div class="ab-cognition-item-num">${s.num}</div>
      <h3 class="ab-cognition-item-title">${s.title}</h3>
      <p class="ab-cognition-item-sub">${s.direction}</p>
      <div class="ab-cognition-item-body">
        <p class="ab-cognition-item-truth">${s.body}</p>
      </div>
    </article>
  `).join('');

  return `
    <section id="cognition" class="ab-page ab-cognition-section ab-page--split" data-toc-id="cognition">
      <span class="ab-page-no">01</span>
      <span class="ab-page-runner">第一章 · 组织性</span>
      <div class="ab-chapter ab-cognition-inner">
        <div class="ab-cognition-head">
          <div class="ab-chapter-eyebrow">"组织性"的展开</div>
          <h2 class="ab-chapter-title">"组织性"<br/>的展开</h2>
          <div class="ab-cognition-lead" data-stagger>
            <p>从入党申请人到党员，组织性是贯穿始终的成长途径。</p>
          </div>
        </div>
        <div class="ab-cognition-main">
          <div class="ab-cognition-grid">${cards}</div>
          <div class="ab-cognition-dialogue" data-stagger>
            <div class="ab-cognition-dialogue-label">核心命题</div>
            <blockquote class="ab-cognition-dialogue-quote">
              爱具体的人而不是爱抽象的人，爱具体的组织而不是爱抽象的组织。
            </blockquote>
          </div>
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
      <div class="ab-works-col ab-works-col--${w.tone}" data-stagger>
        <span class="ab-works-tag ab-works-tag--${w.tone}">${w.tag}</span>
        <h3 class="ab-works-col-title">${w.label}</h3>
        <p class="ab-works-col-summary">${w.desc}</p>
        <div class="ab-works-block">
          <div class="ab-works-block-label">例子</div>
          <ul class="ab-works-list">${examples}</ul>
        </div>
        <div class="ab-works-block">
          <div class="ab-works-block-label">特点</div>
          <ul class="ab-works-list">${features}</ul>
        </div>
      </div>
    `;
  }).join('');

  return `
    <section id="works" class="ab-page ab-works-section ab-page--offset-head" data-toc-id="works">
      <span class="ab-page-no">04</span>
      <span class="ab-page-runner">第四章 · 两种工作</span>
      <div class="ab-chapter">
        <div class="ab-chapter-eyebrow">两种工作</div>
        <h2 class="ab-chapter-title">我们面对两种工作</h2>
        <p class="ab-chapter-sub">一种是接续发力，一种是试错创造——探索工作是人人都参与的场域，包括积极分子</p>
        <div class="ab-works-grid">${cols}</div>
      </div>
    </section>
  `;
}

/** 通用 SVG 关系网络渲染（支持自循环边、domain 标签、callouts、inline 内嵌模式） */
function renderNetworkSVG(network, opts) {
  const { sectionId, sectionClass, title, subtitle, modifier = '', callouts = [], domain = '', inline = false, pageNo = '', runner = '', eyebrow = '' } = opts;

  const svg = svgEl('svg', {
    class: 'ab-network-svg',
    viewBox: network.viewBox,
    preserveAspectRatio: 'xMidYMid meet',
    'aria-label': title || sectionClass,
  });

  // 节点查找表
  const nodeMap = {};
  network.nodes.forEach(n => { nodeMap[n.id] = n; });

  // 连线层（底层）
  const edgesG = svgEl('g', { class: 'ab-edges' });
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

    const g = svgEl('g', { class: `ab-edge ab-edge--${edge.type}${isSelf ? ' ab-edge--self' : ''}`, 'data-from': edge.from, 'data-to': edge.to, 'data-stagger': '', 'data-stagger-delay': (network.nodes.length + i) * 120, ...(edge.stage !== undefined ? { 'data-stage': edge.stage } : {}), ...(inline ? { 'data-role': 'planet' } : {}), ...(edge.detail ? { 'data-detail': edge.detail, 'data-label': edge.label || '' } : {}) });

    const pathEl = svgEl('path', {
      class: 'ab-edge-path',
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
        class: 'ab-edge-arrow',
        transform: `translate(${path.x2},${path.y2}) rotate(${angle})`,
        opacity: '0',
      });
      g.appendChild(arrowEl);
      // 双向边：起点添加反向箭头
      if (edge.bidirectional) {
        const reverseArrowEl = svgEl('path', {
          d: 'M -8 -4 L 0 0 L -8 4 z',
          fill: arrowFill,
          class: 'ab-edge-arrow',
          transform: `translate(${path.x1},${path.y1}) rotate(${angle + 180})`,
          opacity: '0',
        });
        g.appendChild(reverseArrowEl);
      }
    }

    // 协作线两端圆点
    if (edge.type === 'collab' && !isSelf) {
      const dotR = 3;
      g.appendChild(svgEl('circle', { cx: path.x1, cy: path.y1, r: dotR, fill: '#9CA3AF', class: 'ab-edge-dot', opacity: '0' }));
      g.appendChild(svgEl('circle', { cx: path.x2, cy: path.y2, r: dotR, fill: '#9CA3AF', class: 'ab-edge-dot', opacity: '0' }));
    }

    // 标签
    if (edge.label) {
      const labelDx = edge.labelDx || 0;
      const labelDy = edge.labelDy || 0;
      const labelG = svgEl('g', { class: 'ab-edge-label', transform: `translate(${mx + labelDx},${my + labelDy})` });
      const labelWidth = Math.max(36, edge.label.length * 13 + 12);
      const labelHeight = 20;
      const labelBg = svgEl('rect', {
        class: 'ab-edge-label-bg',
        x: -labelWidth / 2,
        y: -labelHeight / 2,
        width: labelWidth,
        height: labelHeight,
        rx: 6,
      });
      labelG.appendChild(labelBg);
      const labelText = svgEl('text', { class: 'ab-edge-label-text', 'text-anchor': isSelf ? 'start' : 'middle', 'dominant-baseline': 'middle', x: isSelf ? 4 : 0, y: 1 });
      labelText.textContent = edge.label;
      labelG.appendChild(labelText);
      g.appendChild(labelG);
    }

    edgesG.appendChild(g);
  });
  svg.appendChild(edgesG);

  // 节点层（顶层）
  const nodesG = svgEl('g', { class: 'ab-nodes' });
  network.nodes.forEach((node, i) => {
    const g = svgEl('g', { class: 'ab-node-svg', 'data-id': node.id, 'data-stagger': '', 'data-stagger-delay': i * 120, ...(node.stage !== undefined ? { 'data-stage': node.stage } : {}), ...(inline ? { 'data-role': 'planet' } : {}), transform: `translate(${node.x},${node.y})`, tabindex: '0', role: 'button', 'aria-label': `${node.name}：${node.duty}` });

    const circle = svgEl('circle', { class: 'ab-node-circle', r: '40', fill: node.color });
    g.appendChild(circle);

    const ring = svgEl('circle', { class: 'ab-node-ring', r: '44', fill: 'none', stroke: node.color, 'stroke-width': '1.5', opacity: '0.25' });
    g.appendChild(ring);

    const text = svgEl('text', { class: 'ab-node-text', 'text-anchor': 'middle', 'dominant-baseline': 'middle', x: 0, y: 0, fill: '#FFFFFF' });
    text.textContent = node.name;
    g.appendChild(text);

    const duty = svgEl('text', { class: 'ab-node-duty', 'text-anchor': 'middle', 'dominant-baseline': 'middle', x: 0, y: 58, fill: '#6B7280' });
    duty.textContent = node.duty;
    g.appendChild(duty);

    nodesG.appendChild(g);
  });
  svg.appendChild(nodesG);

  // domain 标签
  const domainHTML = domain
    ? `<span class="ab-section-domain ab-section-domain--${domain}">${domain === 'building' ? '党建工作' : '党务工作'}</span>`
    : '';

  // callouts 列表
  const calloutsHTML = callouts && callouts.length
    ? `<ul class="ab-callout-list">${callouts.map(c => `<li>${c}</li>`).join('')}</ul>`
    : '';

  // 序列化 SVG
  const svgString = new XMLSerializer().serializeToString(svg);

  // wrap 内容
  const wrapContent = `
    <div class="ab-network-legend">
      <span class="ab-legend-item"><span class="ab-legend-line ab-legend-line--task"></span>派活交付（实线·有方向）</span>
      <span class="ab-legend-item"><span class="ab-legend-line ab-legend-line--info"></span>报备告知（虚线·有方向）</span>
      <span class="ab-legend-item"><span class="ab-legend-line ab-legend-line--collab"></span>横向配合（点线·无方向）</span>
    </div>
    <div class="ab-network-container">${svgString}</div>
    <div class="ab-network-tooltip" aria-hidden="true"></div>
  `;

  // inline 模式
  if (inline) {
    return `
      <div class="ab-network-wrap ${sectionClass}">
        ${wrapContent}
      </div>
    `;
  }

  return `
    <section id="${sectionId}" class="ab-page ab-network-section ${sectionClass} ${modifier}" data-toc-id="${sectionId}">
      ${pageNo ? `<span class="ab-page-no">${pageNo}</span>` : ''}
      ${runner ? `<span class="ab-page-runner">${runner}</span>` : ''}
      <div class="ab-chapter">
        ${domainHTML}
        <div class="ab-chapter-eyebrow">${eyebrow}</div>
        <h2 class="ab-chapter-title">${title}</h2>
        <p class="ab-chapter-sub">${subtitle}</p>
        <div class="ab-network-wrap">
          ${wrapContent}
        </div>
        ${calloutsHTML}
      </div>
    </section>
  `;
}

/** Section 5: 探索工作——SVG 关系网络脉动动画 */
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
      title: '专班：组织委员统筹，不限时间地点',
      network: TASKFORCE_NETWORK,
      stages: EXPLORATION_STAGES.taskforce,
      note: '与活动不同——专班由组织委员统一招募赋权，发起人做业务赋权；组织者是项目的脑子，深度参与者是项目的手。',
    },
  ];

  const scenesHTML = scenes.map(scene => {
    const networkSVG = renderNetworkSVG(scene.network, {
      sectionClass: `ab-exploration-network--${scene.id}`,
      inline: true,
    });

    const stagesHTML = scene.stages.map(s => `
      <div class="ab-exploration-stage" data-stage="${s.stage}">
        <div class="ab-exploration-stage-no">${String(s.stage + 1).padStart(2, '0')}</div>
        <div class="ab-exploration-stage-body">
          <h4 class="ab-exploration-stage-title">${s.title}</h4>
          <p class="ab-exploration-stage-desc">${s.desc}</p>
          <ul class="ab-exploration-stage-flows">
            ${s.flows.map(f => `<li>${f}</li>`).join('')}
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
          <div class="ab-exploration-network-sticky" data-state="current">
            ${networkSVG}
          </div>
          <div class="ab-exploration-stages">
            ${stagesHTML}
          </div>
        </div>
        <div class="ab-exploration-scene-note">${scene.note}</div>
      </div>
    `;
  }).join('');

  return `
    <section id="exploration" class="ab-page ab-network-section ab-exploration-section" data-toc-id="exploration">
      <span class="ab-page-no">06</span>
      <span class="ab-page-runner">第六章 · 探索工作</span>
      <div class="ab-chapter">
        <div class="ab-chapter-eyebrow">探索运作</div>
        <h2 class="ab-chapter-title">探索工作——谁在什么时候该去找谁？</h2>
        <p class="ab-chapter-sub">项目——活动与专班两种探索方式，滚动看关系如何展开，每个阶段的信息流逐步点亮</p>
        ${scenesHTML}
      </div>
    </section>
  `;
}

/** Section 7: 和组织对话——行百里者半九十（四阶段横向册页，滚动逐卡点亮） */
function renderDialogue() {
  const stepsHTML = DIALOGUE_STAGES.map((s, i) => {
    return `
      <article class="ab-dialogue-card" data-state="future" data-stagger>
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
      <span class="ab-page-no">07</span>
      <span class="ab-page-runner">第七章 · 行百里者半九十</span>
      <div class="ab-chapter ab-dialogue-inner">
        <div class="ab-chapter-eyebrow">恢复对话能力</div>
        <h2 class="ab-chapter-title">行百里者半九十</h2>
        <p class="ab-chapter-sub">活动完成后，对话与复盘仍在继续——在实践中持续改进</p>
        <div class="ab-dialogue-flow">${stepsHTML}</div>
        <blockquote class="ab-dialogue-coda" data-stagger>
          党建和经管学科科研的交叉点在于恢复和马克思主义的对话能力，恢复理论研究和现实治理之间的对话能力。
        </blockquote>
      </div>
    </section>
  `;
}

/** Section 8: 收束——管理事，服务人（大字宣言：滚动驱动放大落位 + 背景转深党建红全屏收束，无印章隐喻） */
function renderConclusion() {
  const lines = ['管理事，', '服务人'];
  const titleHTML = lines.map(line =>
    `<span class="ab-conclusion-line">${[...line].map(ch =>
      `<span class="ab-conclusion-char">${ch}</span>`
    ).join('')}</span>`
  ).join('');
  return `
    <section id="conclusion" class="ab-page ab-page--closing ab-conclusion-section" data-toc-id="conclusion">
      <canvas class="ab-particle-canvas" aria-hidden="true"></canvas>
      <div class="ab-conclusion-inner">
        <h2 class="ab-conclusion-title">${titleHTML}</h2>
        <p class="ab-conclusion-lead" data-stagger>
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
        <div class="ab-development-progress" aria-hidden="true"><div class="ab-development-progress-fill"></div></div>
        <div class="ab-chapter-eyebrow">身份阶段</div>
        <h2 class="ab-chapter-title">从入党申请人到正式党员</h2>
        <p class="ab-chapter-sub">依据《中国共产党发展党员工作细则（2026年）》</p>
        <div class="ab-timeline-legend">
          <span class="ab-timeline-legend-item"><span class="ab-timeline-legend-dot"></span>普通节点</span>
          <span class="ab-timeline-legend-item ab-timeline-legend-item--decision"><span class="ab-timeline-legend-dot"></span>关键决策节点</span>
        </div>
        <div class="ab-timeline-alternating">${html}</div>
      </div>
    </section>
  `;
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

  // 安全渲染：每个 section 用 try-catch 包裹，避免单个 section 报错导致整个页面空白
  const safe = (name, fn) => {
    try {
      const html = fn();
      console.log(`[renderAboutContent] ${name} OK, html.length=${html.length}`);
      return html;
    } catch (e) {
      console.error(`[renderAboutContent] ${name} ERROR:`, e);
      return `<div style="padding:20px;background:#fee;border:2px solid red;color:#900;">[${name} 渲染失败: ${e.message}]</div>`;
    }
  };

  content.classList.add('ab-about');
  content.innerHTML = `
    ${safe('TOC', renderTOC)}
    ${safe('Hero', renderHero)}
    ${safe('Cognition', renderCognition)}
    ${safe('Philosophy', renderPhilosophy)}
    ${safe('Development', renderDevelopment)}
    ${safe('TwoWorks', renderTwoWorks)}
    ${safe('Review', renderReview)}
    ${safe('Exploration', renderExploration)}
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

/** 发展党员：时间轴手风琴展开/收起详情（GSAP 动画） */
function bindTimelineToggle() {
  const container = document.querySelector('.ab-timeline-alternating');
  if (!container) return;

  const allDetails = container.querySelectorAll('.ab-tl-detail');
  if (allDetails.length > 0) {
    gsap.set(allDetails, { autoAlpha: 0, height: 0 });
  }

  let currentExpanded = null;

  container.querySelectorAll('.ab-tl-row').forEach(row => {
    const center = row.querySelector('.ab-tl-center');
    const detail = row.querySelector('.ab-tl-detail');
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
        const prevDetail = currentExpanded.querySelector('.ab-tl-detail');
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

/** Lenis 平滑滚动（v15.3 引入——业界成熟经验）
 * 滚轮输入 → 带惯性的缓动滚动位置：快滑有惯性滑行、慢滑逐帧精确；
 * 与 ScrollTrigger 集成：平滑后的滚动位置经 ScrollTrigger.update 喂给动画 → scrub:true 即 1:1 精确映射，
 * 无需再叠加 scrub lerp（替代 v5.2 scrub:0.8 的"统一滞后"机械感）。
 * reduced-motion 下不启动，回落原生滚动。 */
let lenis = null;
function bindLenis() {
  if (typeof Lenis === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    // GSAP 不可用：Lenis 自带 rAF 循环，仍提供平滑滚动
    lenis = new Lenis({ autoRaf: true });
    return;
  }
  lenis = new Lenis({ autoRaf: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
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
      const target = document.getElementById(id);
      if (target) {
        const headerOffset = 64;
        if (lenis) {
          lenis.scrollTo(target, { offset: -headerOffset });
        } else {
          const top = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
          window.scrollTo({ top, behavior: 'smooth' });
        }
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
    document.querySelectorAll('.ab-page').forEach(s => s.style.opacity = '1');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  const mm = gsap.matchMedia();

  // ── 标准动画 ──
  mm.add('(prefers-reduced-motion: no-preference)', () => {

    // Hero — 空间纵深入场：纸页从桌面翻起推入（rotationX + translateZ + 视差上浮），告别垂直平移
    const heroTitle = document.querySelector('.ab-hero-title');
    const heroAccent = document.querySelector('.ab-hero-rule');
    const heroSubtitle = document.querySelector('.ab-hero-subtitle');
    if (heroTitle) {
      gsap.from(heroTitle, {
        y: 40, autoAlpha: 0, rotationX: -14, z: -60,
        transformPerspective: 900, transformOrigin: '50% 100%',
        duration: 0.9, ease: 'power3.out',
      });
    }
    if (heroAccent) {
      // 材质转场：墨迹从中心晕开成线
      gsap.from(heroAccent, { clipPath: 'inset(0 50% 0 50%)', duration: 0.6, delay: 0.35, ease: 'power2.inOut' });
    }
    if (heroSubtitle) {
      gsap.from(heroSubtitle, { y: 14, autoAlpha: 0, duration: 0.6, delay: 0.2, ease: 'power2.out' });
    }

    // 卡片/内容入场统一参数（v5.1 重参数化——治"翻过去了才显示清楚"与"处处匀速"）：
    // 区间缩短：章节进入视口后 ~1/3 行程即完成显示（end 卡在章节顶部 30% 视口，不再拖到章节底部）；
    // ease power2.out 产生"先快后慢"的落定节奏（improve-animations：enter → ease-out）；
    // stagger 0.08s（30-80ms 错峰）；scrub:true（v15.3 复议：滚动位置已被 Lenis 平滑，1:1 精确映射到每一时刻）。
    const cardEntrance = (targets, section, startVh, endVh, y = 40, stagger = 0.08) => {
      if (!targets.length) return;
      gsap.fromTo(targets, { autoAlpha: 0, y }, {
        autoAlpha: 1, y: 0, stagger, ease: 'power2.out',
        scrollTrigger: {
          trigger: section,
          start: `top ${startVh}%`,
          end: `top ${endVh}%`,
          scrub: true,
          immediateRender: false,
        },
      });
    };

    // Cognition —— 章题 + 三卡随滚动错落升起
    const cognitionSection = document.querySelector('.ab-cognition-section');
    if (cognitionSection) {
      cardEntrance(
        cognitionSection.querySelectorAll('.ab-chapter-eyebrow, .ab-chapter-title, .ab-cognition-lead, .ab-cognition-item, .ab-cognition-dialogue'),
        cognitionSection, 80, 30, 40, 0.08
      );
    }

    // Development
    bindDevelopmentEntranceAnimation();

    // Philosophy —— 演示式逐段揭示（书记裁决：两卡非并列，先后各一）：标题区先随滚动升起，两卡随后错落
    const philosophySection = document.querySelector('.ab-philosophy-section');
    if (philosophySection) {
      cardEntrance(
        philosophySection.querySelectorAll('.ab-chapter-title, .ab-chapter-sub'),
        philosophySection, 82, 44, 36, 0.08
      );
      cardEntrance(
        philosophySection.querySelectorAll('.ab-philosophy-opp'),
        philosophySection, 70, 30, 40, 0.08
      );
    }
    bindPhilosophyExpand();

    // Review —— 卡片随滚动升起落位（scrub 可逆，杜绝一次性）
    const reviewSection = document.querySelector('.ab-review-section');
    if (reviewSection) {
      cardEntrance(
        reviewSection.querySelectorAll('.ab-chapter-title, .ab-chapter-sub, .ab-review-card'),
        reviewSection, 80, 30, 42, 0.08
      );
    }

    // Works —— 双列卡片随滚动升起
    const worksSection = document.querySelector('.ab-works-section');
    if (worksSection) {
      cardEntrance(
        worksSection.querySelectorAll('.ab-chapter-title, .ab-chapter-sub, .ab-works-col'),
        worksSection, 80, 30, 42, 0.08
      );
    }

    // Dialogue —— 标题区 + 收尾引言入场改为 scrub 可逆（正放倒放对称）；四卡本身由 data-state 三态滚动点亮
    const dialogueSection = document.querySelector('.ab-dialogue-section');
    if (dialogueSection) {
      cardEntrance(
        dialogueSection.querySelectorAll('.ab-chapter-eyebrow, .ab-chapter-title, .ab-chapter-sub, .ab-dialogue-coda'),
        dialogueSection, 80, 36, 36, 0.08
      );
    }

    // Conclusion —— 入场与全屏扩展统一由 bindCameraFlow 滚动驱动，此处不再单独绑定

    return () => ScrollTrigger.getAll().forEach(t => t.kill());
  });

  // ── reduced-motion 降级 ──
  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set('.ab-hero-title, .ab-hero-subtitle, .ab-hero-rule, .ab-chapter-eyebrow, .ab-chapter-title, .ab-chapter-sub, .ab-cognition-lead, .ab-cognition-item, .ab-cognition-dialogue, .ab-philosophy-opp, .ab-review-card, .ab-works-col, .ab-dialogue-card, .ab-dialogue-coda, .ab-conclusion-section, .ab-tl-row, .ab-tl-stage', { autoAlpha: 1, y: 0, x: 0, scale: 1, clipPath: 'inset(0 0% 0 0)' });
  });
}

/** 机会区块：点击卡片在提炼版与原话全文间平滑切换（KeyNote 式交叉淡入，无"点击展开"文字按钮） */
function bindPhilosophyExpand() {
  const cards = document.querySelectorAll('.ab-philosophy-opp');
  if (!cards.length) return;

  // 无 GSAP 时降级：直接切换内容
  if (typeof gsap === 'undefined') {
    cards.forEach(card => {
      const quoteEl = card.querySelector('.ab-philosophy-opp-quote');
      if (!quoteEl) return;
      const brief = decodeURIComponent(quoteEl.dataset.brief || '');
      const full = decodeURIComponent(quoteEl.dataset.full || '');
      let expanded = false;
      const toggle = () => {
        expanded = !expanded;
        card.setAttribute('aria-expanded', String(expanded));
        quoteEl.innerHTML = expanded ? full : brief;
      };
      card.addEventListener('click', toggle);
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });
    return;
  }

  cards.forEach(card => {
    const quoteEl = card.querySelector('.ab-philosophy-opp-quote');
    if (!quoteEl) return;
    const brief = decodeURIComponent(quoteEl.dataset.brief || '');
    const full = decodeURIComponent(quoteEl.dataset.full || '');
    let expanded = false;

    const toggle = () => {
      expanded = !expanded;
      card.setAttribute('aria-expanded', String(expanded));
      const target = expanded ? full : brief;
      // KeyNote 式平滑：内容淡出上移 → 替换 → 淡入归位
      gsap.to(quoteEl, {
        autoAlpha: 0,
        y: -8,
        duration: 0.22,
        ease: 'power2.in',
        onComplete: () => {
          quoteEl.innerHTML = target;
          gsap.fromTo(quoteEl, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out' });
        },
      });
    };

    card.addEventListener('click', toggle);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });
}

/** Development 时间轴入场动画 */
function bindDevelopmentEntranceAnimation() {
  const section = document.querySelector('.ab-development-section');
  if (!section) return;
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: reduce)', () => {
    gsap.set(section.querySelectorAll('.ab-tl-row, .ab-tl-stage'), { autoAlpha: 1, y: 0 });
    return;
  });

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const dividers = section.querySelectorAll('.ab-tl-stage');

    dividers.forEach((divider, stageIdx) => {
      const stageRows = [];
      let next = divider.nextElementSibling;
      while (next && !next.classList.contains('ab-tl-stage')) {
        if (next.classList.contains('ab-tl-row')) {
          stageRows.push(next);
        }
        next = next.nextElementSibling;
      }

      gsap.fromTo(divider, { autoAlpha: 0, y: 24, scale: 0.96 }, {
        autoAlpha: 1, y: 0, scale: 1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: divider,
          start: 'top 85%',
          end: 'top 45%',
          scrub: true,
          immediateRender: false,
        },
      });

      if (stageRows.length) {
        gsap.fromTo(stageRows, { autoAlpha: 0, y: 34 }, {
          autoAlpha: 1, y: 0, stagger: 0.08,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: divider,
            start: 'top 80%',
            end: 'top 40%',
            scrub: true,
            immediateRender: false,
          },
        });
      }
    });
  });
}

/** SVG 关系网络 hover 交互：悬停节点高亮相关连线 */
function bindNetworkHover() {
  document.querySelectorAll('.ab-network-container').forEach(container => {
    const svg = container.querySelector('svg');
    if (!svg) return;
    const nodes = svg.querySelectorAll('.ab-node-svg');
    const edges = svg.querySelectorAll('.ab-edge');
    const tooltip = container.parentNode.querySelector('.ab-network-tooltip');
    const nodeDataMap = {};

    svg.querySelectorAll('.ab-node-svg').forEach(n => {
      const id = n.dataset.id;
      const circle = n.querySelector('.ab-node-circle');
      const dutyText = n.querySelector('.ab-node-duty');
      nodeDataMap[id] = {
        name: n.querySelector('.ab-node-text')?.textContent || id,
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
        <span class="ab-tooltip-name" style="color:${data.color}">${data.name}</span>
        <span class="ab-tooltip-duty">${data.duty}</span>
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
            <span class="ab-tooltip-name">${label || ''}</span>
            <span class="ab-tooltip-duty">${detail}</span>
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
 * v15.3 探索网络滚动协调器（连续渐变版）
 * 滚动位置 → 连续 stage 位置 p = stageIndex + stageProgress → applyNetworkState 逐帧插值；
 * 替代 v5.2 的二进制 stage 重渲染（stage 切换时才 renderNetwork + CSS transition），根治"吸住又跳过"卡点。
 */
function bindExplorationScrollDriven() {
  const scenes = document.querySelectorAll('.ab-exploration-scene');
  if (!scenes.length) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const sceneData = [];
  scenes.forEach(scene => {
    const network = scene.dataset.scene === 'activity' ? ACTIVITY_NETWORK : TASKFORCE_NETWORK;
    const stages = scene.dataset.scene === 'activity'
      ? EXPLORATION_STAGES.activity
      : EXPLORATION_STAGES.taskforce;
    const svg = scene.querySelector('.ab-network-svg');
    const stagesContainer = scene.querySelector('.ab-exploration-stages');
    sceneData.push({
      scene, network, stages, svg, stagesContainer,
      stageCount: stages.length,
      stageStates: buildStageStates(network, stages),
      continuous: false, // 首次滚动后才切入连续模式（保留初始 CSS 入场）
    });
  });

  // 初始渲染：stage 0 结构 + 状态 + stage 标签态
  sceneData.forEach(data => {
    if (!data.svg) return;
    renderNetwork(data.svg, data.network, 0, data.stages);
    const sceneStages = data.scene.querySelectorAll('.ab-exploration-stage');
    sceneStages.forEach((s, i) => {
      s.setAttribute('data-state', i === 0 ? 'current' : 'future');
    });
  });

  if (prefersReduced) return;

  // 滚动驱动：连续插值（v15.3 替代二进制重渲染）
  let ticking = false;

  const update = () => {
    ticking = false;
    const scrollTop = window.scrollY;

    sceneData.forEach(data => {
      if (!data.svg || !data.stagesContainer) return;

      const progress = computeScrollProgress(scrollTop, data.scene, data.stageCount);

      // 首次滚动：切入连续模式——禁用 CSS transition（时间驱动），改由逐帧插值（滚动驱动）
      if (!data.continuous) {
        data.continuous = true;
        data.svg.classList.add('ab-network-continuous');
      }

      applyNetworkState(data.svg, data.network, progress.stageIndex + progress.stageProgress, data.stageCount, data.stageStates);

      const sceneStages = data.scene.querySelectorAll('.ab-exploration-stage');
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
}

// ════════════════════════════════════════════════════════════════
//  电影化滚动叙事 v2（2026-08-04 书记三轮裁决后重构）
//  ① 滚动驱动的场景切换（Hero 退场 + Dialogue/Exploration 章节点亮）
//  ② 滚动吸附（仅限 Exploration 探索区场景内——书记裁决：吸附只属于探索区）
//  ③ 滚动叠层转场（空间叠层：被覆盖章退后压暗 + 覆盖章 3D 升起，演示式逐步揭示）
//  ④ 滚动驱动的全屏扩展转场（终章封章压合：旋转落章 + 金环压力波 + 六字逐字点亮）
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

/** ① Hero 滚动退场——随滚动淡出上移，交棒给下一章（场景切换） */
function bindHeroExit() {
  const hero = document.querySelector('.ab-hero-section');
  const heroInner = document.querySelector('.ab-hero-inner');
  const scrollHint = document.querySelector('.ab-hero-scroll-hint');
  if (!hero || !heroInner) return;

  gsap.to(heroInner, {
    yPercent: -16,
    scale: 0.96,
    opacity: 0.15,
    ease: 'none',
    scrollTrigger: {
      trigger: hero,
      start: 'top top',
      end: 'bottom 25%',
      scrub: true,
    },
  });

  if (scrollHint) {
    gsap.to(scrollHint, {
      opacity: 0,
      y: 10,
      ease: 'none',
      scrollTrigger: {
        trigger: hero,
        start: 'top 82%',
        end: 'bottom 96%',
        scrub: true,
      },
    });
  }
}

/** ③④⑤ v5 电影镜头流统一入口——场景连续交接 + 胶片时间码 + 进度线（v5.1：终章去除全屏变红）
 *  替换 v4 的 bindGentleLayerDepth + bindConclusionExpand 拆分逻辑（治"拼贴/粗糙/触发别扭"）：
 *  镜头语言：旧场景整体后拉（scale 0.97 + yPercent −3.5 + brightness 0.92，fromTo 显式 from 态防止压黑）
 *  → 新场景从下方驶入覆盖，全程无硬切；
 *  终章 v5.1：去掉突变红/金化（书记裁决"实现不出效果就别实现"），保持暖白 + 党建红大字 + 温和落位驶入。 */
function bindCameraFlow() {
  // ── A. 镜头连续性：章节场景交接（治"拼贴"）——顺序与叙事章节一致（v5.2 方案A）
  const pairs = [
    ['.ab-cognition-section', '.ab-philosophy-section'],
    ['.ab-philosophy-section', '.ab-development-section'],
    ['.ab-development-section', '.ab-works-section'],
    ['.ab-works-section', '.ab-review-section'],
    ['.ab-review-section', '.ab-exploration-section'],
    ['.ab-exploration-section', '.ab-dialogue-section'],
  ];

  pairs.forEach(([fromSel, toSel]) => {
    const fromEl = document.querySelector(fromSel);
    const toEl = document.querySelector(toSel);
    if (!fromEl || !toEl) return;

    // 旧场景整体后拉：轻微上移 + 缩小 + 压暗（幅度克制，内容全程可读）
    // v5.1 修复"卡片黑色"：gsap.to 的 from 态会把 filter 解析为 brightness(0)，
    // 滚动区间中段整章被压暗至 0.3~0.9 亮度——显式 fromTo brightness(1)→0.92，最小亮度 0.92 全程不黑
    const fromInner = fromEl.querySelector('.ab-chapter');
    if (fromInner) {
      gsap.fromTo(fromInner,
        { yPercent: 0, scale: 1, filter: 'brightness(1)' },
        {
          yPercent: -3.5, scale: 0.97, filter: 'brightness(0.92)',
          ease: 'none',
          scrollTrigger: {
            trigger: toEl,
            start: 'top 92%',
            end: 'top 38%',
            scrub: true,
            immediateRender: false,
          },
        }
      );
    }

    // 新场景驶入覆盖：章节从下方滑入落位（镜头交接同步发生，无硬切）
    const toInner = toEl.querySelector('.ab-chapter');
    if (toInner) {
      gsap.fromTo(toInner,
        { yPercent: 6, autoAlpha: 0.88, scale: 0.985 },
        {
          yPercent: 0, autoAlpha: 1, scale: 1,
          ease: 'none',
          immediateRender: false,
          scrollTrigger: {
            trigger: toEl,
            start: 'top 96%',
            end: 'top 56%',
            scrub: true,
          },
        }
      );
    }
  });

  // ── B. 胶片时间码 + 进度线（叙事锚点：滚动即胶片推进，右上角 24fps 帧计数） ──
  const rail = document.createElement('div');
  rail.className = 'ab-rail';
  const tc = document.createElement('div');
  tc.className = 'ab-tc';
  tc.innerHTML = '<span class="ab-tc-tag">FILM</span><span class="ab-tc-time">00:00:00:00</span>';
  const timeEl = tc.querySelector('.ab-tc-time');
  document.body.appendChild(rail);
  document.body.appendChild(tc);

  const FILM_TOTAL = 24 * 60 * 12; // 12:00:00:00 @24fps
  // rAF 节流：scroll 事件高频触发，scrollHeight 布局读取合并到每帧一次（防 layout thrash）
  let gaugeTicking = false;
  const updateFilmGauge = () => {
    if (gaugeTicking) return;
    gaugeTicking = true;
    requestAnimationFrame(() => {
      gaugeTicking = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      let f = Math.round(p * FILM_TOTAL);
      const fr = f % 24; f = (f - fr) / 24;
      const ss = f % 60; f = (f - ss) / 60;
      const mm = f % 60; const hh = (f - mm) / 60;
      timeEl.textContent = [hh, mm, ss, fr].map(n => String(n).padStart(2, '0')).join(':');
      rail.style.transform = `scaleX(${p})`;
    });
  };
  updateFilmGauge();
  window.addEventListener('scroll', updateFilmGauge, { passive: true });
  window.addEventListener('resize', updateFilmGauge);

  // ── C. 终章收束（v5.1：去掉突变红色/金化——书记裁决"实现不出效果就别实现"） ──
  // 保持暖白背景 + 党建红大字，仅保留温和的"镜头落位"驶入（scale 0.86→1 + autoAlpha，scrub 可逆），
  // 与全页背景统一、与其余章节镜头语言一致，不再做全屏变红。
  const section = document.querySelector('.ab-conclusion-section');
  const inner = document.querySelector('.ab-conclusion-inner');
  if (section && inner) {
    gsap.fromTo(inner,
      { scale: 0.86, autoAlpha: 0 },
      {
        scale: 1, autoAlpha: 1,
        ease: 'power2.out',
        scrollTrigger: { trigger: section, start: 'top bottom', end: 'center 60%', scrub: true, immediateRender: false },
      }
    );
  }

  // 清理：matchMedia revert 时移除滚动监听与挂载的固定元素
  return () => {
    window.removeEventListener('scroll', updateFilmGauge);
    window.removeEventListener('resize', updateFilmGauge);
    rail.remove();
    tc.remove();
  };
}

/** ② 滚动吸附——仅限 Exploration 探索区场景内（书记裁决：吸附只属于探索区，全局 snap 破坏 UI 连续性）
 *  v5 重新校准：停靠点 = 每张 stage 标题头部，与左侧 sticky 关系图顶线对齐（替换 v4 的 0.36 生硬值）；
 *  柔和磁性：duration {min:0.35,max:0.7} + power2.out + 轻微 delay，不夺轮；
 *  范围止于最后一张 stage，防止吸附越界拦住后续章节
 *  v5.2 移除：书记裁决"移除吸附 + 全局 scrub 平滑"（2026-08-04），快速滚动时吸附造成"吸住又跳过"卡点 */


/** Development 时间轴滚动驱动：顶部进度条 + 阶段高亮 */
function bindDevelopmentScrollProgress() {
  const section = document.querySelector('.ab-development-section');
  const fill = document.querySelector('.ab-development-progress-fill');
  const timeline = document.querySelector('.ab-timeline-alternating');
  if (!section || !timeline) return;

  if (fill) {
    gsap.to(fill, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: timeline,
        start: 'top 72px',
        end: 'bottom 85%',
        scrub: true,
      },
    });
  }

  section.querySelectorAll('.ab-tl-stage').forEach(div => {
    ScrollTrigger.create({
      trigger: div,
      start: 'top 78%',
      end: 'bottom 22%',
      // v15.3 连续化：阶段高亮颜色按滚动进度插值（灰 #ABA191 → 党建红 #CE1126），替代 is-active 二进制跳变
      onUpdate: (self) => {
        const t = self.progress < 0 ? 0 : self.progress > 1 ? 1 : self.progress;
        const s = t * t * (3 - 2 * t); // smoothstep：进入柔和、离开柔和
        const r = Math.round(171 + (206 - 171) * s);
        const g = Math.round(161 + (17 - 161) * s);
        const b = Math.round(145 + (38 - 145) * s);
        div.style.color = `rgb(${r}, ${g}, ${b})`;
      },
    });
  });
}

/** Dialogue 四阶段滚动驱动（v15.3 连续渐变版）
 *  滚动进度 → 连续位置 t = progress × N，每张卡按"点亮窗 [i, i+0.6)→渐隐窗 [i+1.6, i+2.6)"逐帧插值
 *  opacity/saturate/scale/border 全部连续，替代二进制 data-state 跳变；data-state 仅驱动编号圆标（CSS transition 平滑） */
function bindDialogueScrollActivation() {
  const section = document.querySelector('.ab-dialogue-section');
  const cards = section ? section.querySelectorAll('.ab-dialogue-card') : [];
  if (!section || !cards.length) return;

  // 三态目标值（与 CSS data-state 规则保持一致）
  const FUTURE = { opacity: 0.38, saturate: 0.3, scale: 0.96 };
  const CURRENT = { opacity: 1, saturate: 1, scale: 1.02 };
  const PAST = { opacity: 0.72, saturate: 0.6, scale: 0.985 };
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const smooth = (t) => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;

  const apply = (progress) => {
    const t = progress * cards.length; // 连续位置 0..N
    cards.forEach((card, i) => {
      const d = t - i;
      // 点亮进度：进入本卡窗口时 future→current（前 60% 行程）
      const lightFactor = d < 0 ? 0 : d < 0.6 ? smooth(d / 0.6) : 1;
      // 渐隐进度：下一卡点亮后 current→past（本卡窗口 60% 之后再一卡行程内淡出）
      const dimFactor = d < 1.6 ? 0 : d < 2.6 ? smooth((d - 1.6) / 1.0) : 1;
      // 当前度（驱动 data-state 圆标与边框）
      const currentFactor = lightFactor * (1 - dimFactor);

      let opacity, saturate, scale;
      if (dimFactor > 0) {
        opacity = lerp(CURRENT.opacity, PAST.opacity, dimFactor);
        saturate = lerp(CURRENT.saturate, PAST.saturate, dimFactor);
        scale = lerp(CURRENT.scale, PAST.scale, dimFactor);
      } else {
        opacity = lerp(FUTURE.opacity, CURRENT.opacity, lightFactor);
        saturate = lerp(FUTURE.saturate, CURRENT.saturate, lightFactor);
        scale = lerp(FUTURE.scale, CURRENT.scale, lightFactor);
      }

      card.style.opacity = String(opacity);
      card.style.filter = `saturate(${saturate})`;
      card.style.transform = `scale(${scale})`;
      if (currentFactor > 0.02) {
        card.style.borderColor = `rgba(206, 17, 38, ${(currentFactor * 0.4).toFixed(3)})`;
      } else {
        card.style.borderColor = '';
      }
      card.dataset.state = currentFactor > 0.35 ? 'current' : (dimFactor > 0 ? 'past' : 'future');
    });
  };

  ScrollTrigger.create({
    trigger: section,
    start: 'top 72%',
    end: 'bottom 55%',
    onUpdate: (self) => apply(self.progress),
  });

  // 初始态：全部 future
  apply(0);
}

/** 探索区分镜切换：活动→专班作为同一镜头的两个分镜（v5 五·乙 ①）
 *  专班场景进入时：活动网络退场（后拉压暗），专班网络以"光圈 + 横移"揭示（clip-path circle + scale）
 *  共享节点（组织者/深度参与者/组织委员）在两分镜各自呈现，形成"同镜换景"的转场锚点 */
function bindExplorationStoryboardSwitch() {
  const actNet = document.querySelector('.ab-exploration-scene[data-scene="activity"] .ab-exploration-network-sticky');
  const taskScene = document.querySelector('.ab-exploration-scene[data-scene="taskforce"]');
  const taskNet = taskScene && taskScene.querySelector('.ab-exploration-network-sticky');
  if (!actNet || !taskNet) return;

  // 活动分镜退场：后拉 + 压暗（与全页镜头交接语言一致）
  // v5.1 同步修复：显式 fromTo brightness(1)→0.9，避免 from 态 brightness(0) 将活动网络压黑
  gsap.fromTo(actNet,
    { autoAlpha: 1, scale: 1, filter: 'brightness(1)' },
    {
      autoAlpha: 0.55, scale: 0.97, filter: 'brightness(0.9)',
      ease: 'none',
      scrollTrigger: {
        trigger: taskScene,
        start: 'top 85%',
        end: 'top 30%',
        scrub: true,
        immediateRender: false,
      },
    }
  );

  // 专班分镜揭示：光圈从中心展开 + 轻微横移落位
  gsap.fromTo(taskNet,
    { clipPath: 'circle(14% at 50% 40%)', scale: 0.94, autoAlpha: 0.35 },
    {
      clipPath: 'circle(135% at 50% 40%)', scale: 1, autoAlpha: 1,
      ease: 'none',
      immediateRender: false,
      scrollTrigger: {
        trigger: taskScene,
        start: 'top 92%',
        end: 'top 35%',
        scrub: true,
      },
    }
  );
}

/** 电影化滚动叙事统一入口（reduced-motion 下自动全部降级） */
function bindCinematicScroll() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    bindHeroExit();
    const cleanupCamera = bindCameraFlow() || (() => {});
    bindExplorationStoryboardSwitch();
    bindDevelopmentScrollProgress();
    bindDialogueScrollActivation();
    return () => {
      cleanupCamera();
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  });
}

// ════════════════════════════════════════════════════════════════
//  启动
// ════════════════════════════════════════════════════════════════

renderAboutContent();
bindTimelineToggle();
bindLenis();
bindTOC();
bindPageAnimations();
bindNetworkHover();
bindExplorationScrollDriven();
bindCinematicScroll();
document.querySelectorAll('.ab-particle-canvas').forEach(c => initParticleCanvas(c));
