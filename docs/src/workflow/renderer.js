﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  renderer.js — 工作流可视化渲染器 v1.0
//  依赖 engine.js + definitions.js
//  产出：进度条 · 状态标签 · 子状态面板 · 阻塞横幅
// ════════════════════════════════════════════════════════════════

import { WorkflowEngine } from './engine.js?v=20260901h';
import {
  THEME_PARTY_DAY_DEFINITION,
  SHORT_TERM_DEFINITION,
  LONG_TERM_DEFINITION,
} from './definitions.js?v=20260901h';
import { icon } from '../core/icons.js?v=20260901h';

// ── 可用模板列表（渲染器使用）──────────────────────────────────
const TEMPLATE_REGISTRY = {
  'theme-party-day': THEME_PARTY_DAY_DEFINITION,
  'short-term': SHORT_TERM_DEFINITION,
  'long-term': LONG_TERM_DEFINITION,
};

// ════════════════════════════════════════════════════════════════
//  WorkflowRenderer
// ════════════════════════════════════════════════════════════════

class WorkflowRenderer {

  /**
   * @param {WorkflowEngine} engine - 已启动的引擎实例
   * @param {Object} definition - 流程定义对象
   */
  constructor(engine, definition) {
    this.engine = engine;
    this.definition = definition;
  }

  // ── 渲染全部可视化 ────────────────────────────────────────────
  render(container) {
    if (!container) return;
    container.innerHTML = '';
    container.appendChild(this._renderBlockingBanner());
    container.appendChild(this._renderProgressBar());
    container.appendChild(this._renderStateLabel());
    container.appendChild(this._renderSubStates()); // v2.0 子状态面板
  }

  // ── 进度条 ────────────────────────────────────────────────────
  _renderProgressBar() {
    const wrapper = document.createElement('div');
    wrapper.className = 'workflow-progress-wrapper';

    const states = this.definition.states;
    const currentIdx = states.findIndex(s => s.name === this.engine.currentState);
    const pct = states.length > 1
      ? Math.round((currentIdx / (states.length - 1)) * 100)
      : 100;

    const info = document.createElement('div');
    info.className = 'workflow-progress-info';

    const label = document.createElement('span');
    label.className = 'workflow-progress-label';
    label.textContent = '总体进度';
    info.appendChild(label);

    const value = document.createElement('span');
    value.className = 'workflow-progress-value';
    value.textContent = `${pct}%`;
    info.appendChild(value);

    const track = document.createElement('div');
    track.className = 'workflow-progress-track';

    const bar = document.createElement('div');
    bar.className = 'workflow-progress-bar';
    bar.style.width = `${pct}%`;

    const isBlocked = this.engine.blockedNodes.has(this.engine.currentState);
    if (isBlocked) bar.classList.add('blocked');

    track.appendChild(bar);

    wrapper.appendChild(info);
    wrapper.appendChild(track);
    return wrapper;
  }

  // ── 当前状态标签 ──────────────────────────────────────────────
  _renderStateLabel() {
    const wrapper = document.createElement('div');
    wrapper.className = 'workflow-state-label';

    const status = this.engine.getStatus();
    const currentState = this.definition.states.find(s => s.name === status.currentState);
    const phase = currentState ? currentState.metadata.phase : '';
    const isBlocked = status.isBlocked;

    const header = document.createElement('div');
    header.className = 'workflow-state-header';

    const dot = document.createElement('span');
    dot.className = `workflow-state-dot ${isBlocked ? 'blocked' : 'active'}`;
    header.appendChild(dot);

    const name = document.createElement('span');
    name.className = 'workflow-state-name';
    name.textContent = status.currentLabel || status.currentState;
    header.appendChild(name);

    if (phase) {
      const phaseTag = document.createElement('span');
      phaseTag.className = 'workflow-state-phase';
      phaseTag.textContent = phase;
      header.appendChild(phaseTag);
    }

    if (isBlocked) {
      const blockedTag = document.createElement('span');
      blockedTag.className = 'workflow-state-blocked-tag';
      blockedTag.textContent = '已阻塞';
      header.appendChild(blockedTag);
    }

    wrapper.appendChild(header);

    const meta = document.createElement('div');
    meta.className = 'workflow-state-meta';

    const metaItems = [
      { label: '模板', value: this.definition.title },
      { label: '时长', value: this.definition.duration === 'long-term' ? '长期活动' : '短期活动' },
      { label: '品牌', value: this.definition.brand ? '是' : '否' },
      { label: '发起', value: this.definition.direction === 'bottom-up' ? '自下而上' : this.definition.direction === 'top-down' ? '自上而下' : '未限定' },
      { label: '状态数', value: `${this.definition.states.length}` },
      { label: '流转次数', value: `${status.transitionCount}` },
    ];

    metaItems.forEach(item => {
      const m = document.createElement('span');
      m.className = 'workflow-meta-item';
      m.innerHTML = `<span class="workflow-meta-label">${item.label}</span> <span class="workflow-meta-value">${item.value}</span>`;
      meta.appendChild(m);
    });

    wrapper.appendChild(meta);
    return wrapper;
  }

  // ── v2.0 子状态面板（考勤对接 + 宣传统筹）─────────────────────
  _renderSubStates() {
    const wrapper = document.createElement('div');
    wrapper.className = 'workflow-substates-wrapper';

    const status = this.engine && this.engine.getStatus ? this.engine.getStatus() : null;
    if (!status || !status.subStates || Object.keys(status.subStates).length === 0) {
      wrapper.classList.add('hidden');
      return wrapper;
    }

    const title = document.createElement('div');
    title.className = 'workflow-substates-title';
    title.textContent = '子状态追踪';
    wrapper.appendChild(title);

    // 获取当前状态定义中的 subStates 配置（含 stepsLabel）
    const currentStateDef = this.definition.states.find(s => s.name === this.engine.currentState);
    const subStateDefs = (currentStateDef && currentStateDef.subStates) || {};

    for (const [name, sub] of Object.entries(status.subStates)) {
      const card = document.createElement('div');
      card.className = 'workflow-substate-card';

      const header = document.createElement('div');
      header.className = 'workflow-substate-header';

      const nameLabel = document.createElement('span');
      nameLabel.className = 'workflow-substate-name';
      nameLabel.textContent = sub.label;
      header.appendChild(nameLabel);

      const ownerTag = document.createElement('span');
      ownerTag.className = 'workflow-substate-owner';
      ownerTag.textContent = this._roleLabel(sub.ownerRole);
      header.appendChild(ownerTag);

      if (sub.completed) {
        const doneTag = document.createElement('span');
        doneTag.className = 'workflow-substate-done';
        doneTag.textContent = '已完成';
        header.appendChild(doneTag);
      } else {
        const pctTag = document.createElement('span');
        pctTag.className = 'workflow-substate-pct';
        pctTag.textContent = `${sub.progress}%`;
        header.appendChild(pctTag);
      }

      card.appendChild(header);

      // 步骤列表
      const stepsContainer = document.createElement('div');
      stepsContainer.className = 'workflow-substate-steps';

      const def = subStateDefs[name];
      const stepLabels = (def && def.stepsLabel) || {};

      if (!sub.sequence || !sub.sequence.length) continue;

      for (let i = 0; i < sub.sequence.length; i++) {
        const stepName = sub.sequence[i];
        const stepInfo = sub.steps[stepName];

        const stepEl = document.createElement('div');
        stepEl.className = `workflow-substate-step ${i < sub.currentIdx ? 'done' : i === sub.currentIdx ? 'current' : 'pending'}`;

        const dot = document.createElement('div');
        dot.className = 'workflow-substep-dot';

        const content = document.createElement('div');
        content.className = 'workflow-substep-content';

        const labelEl = document.createElement('div');
        labelEl.className = 'workflow-substep-label';
        labelEl.textContent = stepLabels[stepName] || stepName;
        content.appendChild(labelEl);

        if (stepInfo) {
          const metaEl = document.createElement('div');
          metaEl.className = 'workflow-substep-meta';
          metaEl.textContent = `${this._formatTime(stepInfo.completedAt)} · ${stepInfo.operator}`;
          content.appendChild(metaEl);
        } else if (i === sub.currentIdx) {
          const waitEl = document.createElement('div');
          waitEl.className = 'workflow-substep-waiting';
          waitEl.textContent = '等待完成...';
          content.appendChild(waitEl);
        }

        stepEl.appendChild(dot);
        stepEl.appendChild(content);
        stepsContainer.appendChild(stepEl);
      }

      card.appendChild(stepsContainer);
      wrapper.appendChild(card);
    }

    // 前置条件提示
    if (!status.subStatesComplete) {
      const hint = document.createElement('div');
      hint.className = 'workflow-substates-hint';
      hint.textContent = '所有子状态完成后才能进入下一阶段';
      wrapper.appendChild(hint);
    }

    return wrapper;
  }

  _roleLabel(roleKey) {
    const map = {
      'disc-commissioner': '纪检委员',
      'org-commissioner':  '组织委员',
      'prop-commissioner': '宣传委员',
      'leader':           '党小组组长',
      'organizer':        '组织者',
      'secretary':        '书记',
      'committee':        '支委会',
      'expanded-committee': '支委扩大会',
      'global':           '全局管理员',
    };
    return map[roleKey] || roleKey;
  }

  // ── 阻塞警告横幅 ──────────────────────────────────────────────
  _renderBlockingBanner() {
    const wrapper = document.createElement('div');
    wrapper.className = 'workflow-banner-wrapper';

    const status = this.engine.getStatus();
    if (!status.isBlocked) {
      wrapper.classList.add('hidden');
      return wrapper;
    }

    const lastNotif = this.engine.notifications[this.engine.notifications.length - 1];
    if (!lastNotif) {
      wrapper.classList.add('hidden');
      return wrapper;
    }

    wrapper.classList.add('workflow-banner-blocked');

    const iconSpan = document.createElement('span');
    iconSpan.className = 'workflow-banner-icon';
    iconSpan.innerHTML = icon('warning', { className: 'w-5 h-5' });
    wrapper.appendChild(iconSpan);

    const text = document.createElement('div');
    text.className = 'workflow-banner-text';
    text.innerHTML = `<strong>阻塞警告</strong> — 状态「${lastNotif.stateLabel}」已超时 ${lastNotif.elapsedHours} 小时（阈值 ${lastNotif.timeoutHours}h），请及时处理。`;
    wrapper.appendChild(text);

    return wrapper;
  }

  // ── 辅助：时间格式化 ──────────────────────────────────────────
  _formatTime(iso) {
    const d = new Date(iso);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}

// ════════════════════════════════════════════════════════════════
//  模拟工作流引擎（演示用）
// ════════════════════════════════════════════════════════════════

const MOCK_OPERATORS = ['韩思宁', '侯嘉嵘', '闫鑫岳', '王奕铭', '系统'];
const MOCK_EVENT_CHAINS = {
  'theme-party-day': [
    { type: 'INIT', target: 'DRAFT' },
    { type: 'SUBMIT', target: 'PENDING_EXPANDED' },
    { type: 'APPROVE', target: 'APPROVED' },
    { type: 'SUBMIT', target: 'PREPARING' },
    { type: 'SUBMIT', target: 'IN_PROGRESS' },
  ],
  'short-term': [
    { type: 'INIT', target: 'DRAFT' },
    { type: 'SUBMIT', target: 'PENDING_EXPANDED' },
    { type: 'APPROVE', target: 'APPROVED' },
    { type: 'SUBMIT', target: 'PREPARING' },
    { type: 'SUBMIT', target: 'IN_PROGRESS' },
    { type: 'COMPLETE', target: 'COMPLETED' },
    { type: 'ARCHIVE', target: 'ARCHIVED' },
  ],
  'long-term': [
    { type: 'INIT', target: 'DRAFT' },
    { type: 'SUBMIT', target: 'PENDING_EXPANDED' },
    { type: 'APPROVE', target: 'APPROVED' },
    { type: 'SUBMIT', target: 'GROUP_FORMING' },
    { type: 'SUBMIT', target: 'IN_PROGRESS' },
  ],
};

export function createMockEngine(definitionId) {
  const def = TEMPLATE_REGISTRY[definitionId];
  if (!def) throw new Error(`Unknown definition: ${definitionId}`);

  const engine = new WorkflowEngine(def);
  engine.start(def.initialState, '系统');

  const events = MOCK_EVENT_CHAINS[definitionId] || [];
  for (let i = 0; i < events.length; i++) {
    if (events[i].type === 'INIT') continue;
    try {
      const op = MOCK_OPERATORS[i % MOCK_OPERATORS.length];
      engine.transition(events[i], op);
    } catch (e) {
      break;
    }
  }

  return engine;
}

/**
 * 按定义ID生成模拟阻塞场景。
 * 将引擎卡在特定状态，手动设置 enteredAt 为过去时间触发阻塞。
 */
export function createMockBlockedEngine(definitionId) {
  const engine = createMockEngine(definitionId);
  const states = engine.definition.states || [];

  if (engine.currentState && states.length > 0) {
    const current = [...engine.states.values()].find(s => s.name === engine.currentState);
    if (current && current.timeoutHours) {
      const fakeEntered = new Date(Date.now() - (current.timeoutHours + 2) * 3600000).toISOString();
      current.enteredAt = fakeEntered;
    }
    engine.checkBlocking();
  }

  return engine;
}

// ════════════════════════════════════════════════════════════════
//  便捷入口：渲染到指定容器
// ════════════════════════════════════════════════════════════════

export function renderWorkflow(container, definitionId, blocked = false) {
  const engine = blocked
    ? createMockBlockedEngine(definitionId)
    : createMockEngine(definitionId);
  const def = TEMPLATE_REGISTRY[definitionId];
  const renderer = new WorkflowRenderer(engine, def);
  renderer.render(container);
  return { engine, renderer };
}
