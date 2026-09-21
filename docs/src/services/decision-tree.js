// role: [工程师]+[AI]
// services/decision-tree.js — 统一决策树服务
// 从 ws-leader-entry.js 和 ws-secretary-entry.js 中提取的共享逻辑
// 包含：配置管理、状态管理、场景映射、工作流面板渲染、活动写入
import { BranchService } from './runtime.js?v=20260921o';
import { showToast } from '../core/utils.js?v=20260921o';
import { sopDatabase, instantiateSOP, renderWorkflow } from '../workflow/index.js?v=20260921o';
import { icon } from '../core/icons.js?v=20260921o';
import { NoticeStore } from './notice.js?v=20260921o';
// P2b（2026-09-03）：写活动场景选择清单单一源 = core/constants.js SCENARIO_WRITE_IDS/SCENARIO_LABELS
//   （与 calendar-tab WRITE_TEMPLATES 同源，勿再手写四子会清单）
import { SCENARIO_WRITE_IDS, SCENARIO_LABELS } from '../core/constants.js?v=20260921o';
// M4 场景注册化：经注册表读取 SOP 场景能力（sop-scenarios），行为零变化——能力缺省时回退直接读 sopDatabase
import { getCapabilities } from '../core/registry.js?v=20260921o';
import '../modules/capabilities/sop-scenarios.js?v=20260921o';

/**
 * 经注册表读取场景（M4 场景注册化消费点）
 * 优先使用 sop-scenarios 能力的 get()，未注册/未命中时回退 sopDatabase（与既有行为一致）。
 * @param {string} scenarioId
 * @returns {Object|undefined}
 */
function getScenario(scenarioId) {
  const cap = getCapabilities({ scope: 'scenario' }).find(c => c.id === 'sop-scenarios');
  if (cap && typeof cap.get === 'function') {
    const sc = cap.get(scenarioId);
    if (sc) return sc;
  }
  return sopDatabase.scenarios.find(s => s.scenarioId === scenarioId);
}

// ════════════════════════════════════════════════════════════════
//  决策树配置预设
// ════════════════════════════════════════════════════════════════

export const DECISION_TREE_CONFIGS = {
  leader: {
    L1: [
      { value: 'party-group-meeting', label: '党小组会', color: '#CE1126' },
      { value: 'theme-party', label: '主题党日', color: '#FFD700' },
    ],
    // 主题党日正交维度（多选）
    THEME_PARTY_DIMENSIONS: {
      isJoint: [
        { value: false, label: '独立开展' },
        { value: true, label: '共建开展' },
      ],
      isOutdoor: [
        { value: false, label: '校内' },
        { value: true, label: '校外' },
      ],
      carriers: [
        { value: '理论学习', label: '理论学习' },
        { value: '实践参访', label: '实践参访' },
        { value: '交流座谈', label: '交流座谈' },
        { value: '其他', label: '其他' },
      ],
    },
    // L2 活动形式（支书 2026-08-01 活动分类：党小组会无子分类，主题党日 L2=活动载体）
    L2: {
      'party-group-meeting': [
        { value: 'party-group-meeting', label: '党小组会' },
      ],
      'theme-party': [
        { value: '理论学习', label: '理论学习' },
        { value: '实践参访', label: '实践参访' },
        { value: '交流座谈', label: '交流座谈' },
        { value: '其他', label: '其他' },
      ],
    },
    L3: [
      { value: 'short', label: '短期' },
      { value: 'long', label: '长期' },
    ],
    L4: [
      { value: 'top-down', label: '自上而下' },
      { value: 'bottom-up', label: '自下而上' },
    ],
    // 承办党小组选项不再在配置里写死组名——运行时由调用方传入活组清单（见 hostGroups 函数），
    // 口径单一源 = services/party-group.js::groupOptions()。
    SCENARIO_MAP: {
      'party-group-meeting': 'party-group-meeting',
      'theme-party': 'theme-party',
    },
  },

  secretary: {
    L1: [
      { value: 'three-meetings', label: '三会一课', icon: '三', iconColor: '#CE1126', iconBg: 'rgba(206,17,38,0.10)', hasSub: true },
      { value: 'theme-party', label: '主题党日', icon: '主', iconColor: '#FFD700', iconBg: 'rgba(255,215,0,0.12)', scenarioId: 'theme-party' },
    ],
    L1Sub: {
      // P2b（2026-09-03）：四子会写入选项目录 = SCENARIO_WRITE_IDS/LABELS 派生（单一源，勿手写）
      'three-meetings': SCENARIO_WRITE_IDS['three-meetings'].map((scenarioId) => ({
        value: scenarioId, label: SCENARIO_LABELS[scenarioId], scenarioId,
      })),
    },
    // 主题党日正交维度（多选）
    THEME_PARTY_DIMENSIONS: {
      isJoint: [
        { value: false, label: '独立开展' },
        { value: true, label: '共建开展' },
      ],
      isOutdoor: [
        { value: false, label: '校内' },
        { value: true, label: '校外' },
      ],
      carriers: [
        { value: '理论学习', label: '理论学习' },
        { value: '实践参访', label: '实践参访' },
        { value: '交流座谈', label: '交流座谈' },
        { value: '其他', label: '其他' },
      ],
    },
    L3: [
      { value: 'short', label: '短期', desc: '单次活动，1天内完成' },
      { value: 'long', label: '长期', desc: '跨天或持续一段时间的活动' },
    ],
    L4: [
      { value: 'top-down', label: '自上而下', desc: '支委/支书发起，向下部署' },
      { value: 'bottom-up', label: '自下而上', desc: '党小组/成员提议，向上申报' },
    ],
  },
};

/**
 * 承办党小组选项（不再写死组名）：活组清单由调用方传入（口径单一源 =
 * services/party-group.js::groupOptions()，新增/改名/解散后随渲染即时可见）。
 * 保留「组长本组必在选项内」的既有语义：本组若不在活组清单（如历史数据），补入，
 * 保证默认预选命中本组、改选后仍能回选本组（不改权限）。
 * @param {string[]} [options] 活组名清单
 * @param {string} [myGroup]   组长所属党小组（可缺省）
 * @returns {string[]} 承办党小组可选项
 */
export function hostGroups(options = [], myGroup = '') {
  const list = Array.isArray(options) ? [...options] : [];
  if (myGroup && !list.includes(myGroup)) list.push(myGroup);
  return list;
}

// ════════════════════════════════════════════════════════════════
//  DecisionTreeState — 决策树状态管理
// ════════════════════════════════════════════════════════════════

export class DecisionTreeState {
  constructor(configKey) {
    this.configKey = configKey;
    this.config = DECISION_TREE_CONFIGS[configKey];
    this.selections = {};
    this.step = 1;
    this.showPanel = false;
    this.submitting = false;
    this._resetSelections();
  }

  _resetSelections() {
    this.selections = { L1: null, L1Sub: null, L2: null, L3: null, L4: null, hostGroup: null };
  }

  reset() {
    this._resetSelections();
    this.step = 1;
    this.showPanel = false;
    this.submitting = false;
  }

  select(key, value) {
    this.selections[key] = value;
  }

  get(key) {
    return this.selections[key];
  }

  getAll() {
    return this.selections;
  }

  /** 根据决策树选择映射工作流定义ID */
  mapToDefinitionId() {
    const { L1, L3 } = this.selections;
    if (L1 === 'theme-party' || L1 === 'theme-day') return 'theme-party-day';
    return L3 === 'long' ? 'long-term' : 'short-term';
  }

  /** 根据决策树选择获取 scenarioId */
  getScenarioId() {
    const { L1, L1Sub } = this.selections;
    if (this.configKey === 'leader') {
      return this.config.SCENARIO_MAP[L1] || null;
    }
    // secretary
    if (L1 === 'theme-party') return 'theme-party';
    return L1Sub || null;
  }

  /** 获取场景标题 */
  getScenarioTitle() {
    const sid = this.getScenarioId();
    if (!sid) return '';
    const sc = getScenario(sid);
    return sc ? sc.title : '';
  }

  /** 获取已选路径的文字摘要 */
  getSelectionPath() {
    const { L1, L1Sub, L2, L3, L4 } = this.selections;
    const parts = [];

    if (this.configKey === 'secretary') {
      if (L1 === 'three-meetings') {
        const sub = this.config.L1Sub['three-meetings'].find(o => o.value === L1Sub);
        parts.push(sub ? sub.label : '三会一课');
      } else if (L1 === 'theme-day') {
        parts.push('主题党日');
      }
    } else {
      const l1Opt = this.config.L1.find(o => o.value === L1);
      if (l1Opt) parts.push(l1Opt.label);
    }

    if (L2) {
      const l2Opts = this.config.L2[L1] || [];
      const l2 = l2Opts.find(o => o.value === L2);
      if (l2) parts.push(l2.label);
    }

    if (L3) parts.push(L3 === 'short' ? '短期' : '长期');
    if (L4) parts.push(L4 === 'top-down' ? '自上而下' : '自下而上');

    return parts.join(' / ');
  }

  /** 渲染 SOP 预览（leader 专用） */
  renderSopPreview() {
    const { L1 } = this.selections;
    if (!L1) return '<p class="text-gray-500">请先选择组织场景</p>';

    const scenarioId = this.getScenarioId();
    const scenario = getScenario(scenarioId);
    if (!scenario) return '<p class="text-gray-500">未找到对应SOP模板</p>';

    const tasks = scenario.tasks.filter(t => t.timeOffset !== null);
    if (tasks.length === 0) return '<p class="text-gray-500">该场景暂无需按时间安排的事项</p>';

    const phases = [
      { label: '会前准备', test: t => t.timeOffset < 0 },
      { label: '会中实施', test: t => t.timeOffset === 0 },
      { label: '会后归档', test: t => t.timeOffset > 0 },
    ];

    return phases.map(phase => {
      const phaseTasks = tasks.filter(phase.test);
      if (phaseTasks.length === 0) return '';
      return `
        <div class="mb-2">
          <div class="font-medium text-gray-700 mb-1">${phase.label}（${phaseTasks.length}项）</div>
          ${phaseTasks.slice(0, 4).map(t => `
            <div class="pl-2 py-0.5 flex items-center gap-1">
              <span class="text-gray-500">·</span>
              <span>T${t.timeOffset >= 0 ? '+' : ''}${t.timeOffset} ${t.title}</span>
            </div>
          `).join('')}
          ${phaseTasks.length > 4 ? `<div class="pl-2 text-gray-500">...及其他${phaseTasks.length - 4}项</div>` : ''}
        </div>
      `;
    }).join('');
  }
}

// ════════════════════════════════════════════════════════════════
//  共享函数：工作流面板渲染
// ════════════════════════════════════════════════════════════════

/**
 * 渲染工作流可视化面板（leader 和 secretary 共用）
 * @param {string} panelId - 面板 DOM ID（如 'leader-workflow' 或 'secretary-workflow'）
 * @param {string} anchorId - 锚点元素 ID
 * @param {string} definitionId - 工作流定义ID
 * @param {string} activityTitle - 活动标题
 * @param {'after'|'append'} [insertMode='after'] - 插入模式：'after' 插入到锚点之后，'append' 插入到锚点内部末尾
 */
export function renderWorkflowPanel(panelId, anchorId, definitionId, activityTitle, insertMode = 'after') {
  const anchor = document.getElementById(anchorId);
  if (!anchor) return;

  // 移除已有面板
  const existing = document.getElementById(panelId);
  if (existing) existing.remove();

  const panel = document.createElement('div');
  panel.id = panelId;
  panel.className = 'workflow-panel-card';
  panel.innerHTML = `
    <div class="workflow-panel-title">
      ${icon('clock')}
      工作流追踪 — ${activityTitle || '新活动'}
    </div>
    <div id="${panelId}-content"></div>
  `;

  if (insertMode === 'append') {
    anchor.appendChild(panel);
  } else {
    anchor.after(panel);
  }

  const contentEl = document.getElementById(`${panelId}-content`);
  if (contentEl) {
    try {
      renderWorkflow(contentEl, definitionId, false);
    } catch (err) {
      console.warn(`[decision-tree] renderWorkflow failed:`, err);
      contentEl.innerHTML = '<p class="text-xs text-gray-500 text-center py-4">工作流渲染失败</p>';
    }
  }

  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ════════════════════════════════════════════════════════════════
//  共享函数：活动写入（创建活动 + 实例化SOP + 创建任务节点）
// ════════════════════════════════════════════════════════════════

/**
 * 写入活动：创建活动 → 实例化SOP → 创建任务节点
 * @param {object} activityData - 活动数据
 * @param {string} scenarioId - SOP场景ID
 * @param {string} targetDate - T-0 日期
 * @returns {Promise<{activity: object, taskCount: number}>}
 */
export async function writeActivityWithSOP(activityData, scenarioId, targetDate) {
  // 0. 原则7（同一套数据）：本次创建若已内联赋权组织者，顶层 organizer 随之派生同步。
  //   与 services/auth.js::_syncTopLevelOrganizer 同一口径（取 assignments 中首个 organizer 的 personId）。
  //   全仓 41 处读端（归档 / 首页 / 复盘卡 / inspector 等）消费顶层 activity.organizer；
  //   此前本链未做同步 ⇒ 组长指定他人为组织者后顶层仍是创建组长本人，同一台内两处显示互相矛盾
  //   （2026-09-17 批次 64 dogfood 实测）。**未指定组织者时保持调用方传入值不变**（原行为）。
  const orgAssign = Array.isArray(activityData.assignments)
    ? activityData.assignments.find(a => a.role === 'organizer')
    : null;
  const payload = orgAssign ? { ...activityData, organizer: orgAssign.personId } : activityData;

  // 1. 创建活动
  const activity = await BranchService.createActivity(payload);
  console.info('[DecisionTree] createActivity 成功, id=' + activity.id);

  // 2. 实例化 SOP 任务节点
  const taskNodes = instantiateSOP([scenarioId], targetDate);
  console.info('[DecisionTree] instantiateSOP 生成 ' + taskNodes.length + ' 个任务节点');

  // 3. 为每个任务节点创建 Task
  let createdCount = 0;
  for (const node of taskNodes) {
    try {
      await BranchService.createTask({
        activityId: activity.id,
        taskId: node.taskId || '',
        title: node.title,
        executor: node.executor,
        supervisor: node.supervisor,
        timeOffset: node.timeOffset,
        date: node.date instanceof Date ? node.date.toISOString().slice(0, 10) : String(node.date),
        desc: node.desc || '',
        status: 'pending',
        scenarioId: node.scenarioId || scenarioId,
      });
      createdCount++;
    } catch (taskErr) {
      console.warn('[DecisionTree] createTask 失败: ' + node.title, taskErr);
    }
  }

  // 自动广播（混合模式落地）：活动创建后通知建核心群（现场协调在微信群）
  _broadcastActivityCreated(activity);

  return { activity, taskCount: createdCount };
}

// ── 自动广播（2026-08-30 支书批准，混合模式落地）────────────────
// 活动创建后：站内通知组织者/组长「请前往微信群建核心群」——现场协调在微信群，
// 资料归档交接在系统（支书 2026-08-30 裁决）。通知失败不影响活动创建主流程。
function _broadcastActivityCreated(activity) {
  try {
    // R-22（2026-09-13）：系统派生通知改由服务端生成（kind 注册表复算授权；活动锚点 targetType/targetId
    // 由服务端按 sourceId 派生，活动归档时随 NoticeStore.archiveBySource 一并归档）
    NoticeStore.addSystem('activity-created-broadcast', activity.id, {
      activityTitle: activity.title || '新活动',
      date: activity.date || '',
      location: activity.location,
    });
  } catch (e) {
    console.warn('[DecisionTree] 建群广播失败（不影响活动创建）：', e);
  }
}