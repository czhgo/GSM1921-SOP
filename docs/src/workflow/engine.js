// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  engine.js — 工作流引擎 v2.0
//  v1.0: 状态机 + 流转规则 + 事件触发 + 历史日志 + 阻塞检测
//  v2.0: + 子状态追踪（考勤/宣传） + 角色流转守卫 + 前置校验
// ════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} StateNodeConfig
 * @property {string}   name               - 状态名称
 * @property {string}   label              - 状态中文标签
 * @property {string[]} allowedTransitions - 允许流转到的目标状态名列表
 * @property {Function} [onEnter]          - 进入该状态时的回调
 * @property {number}   [timeoutHours]     - 超时小时数
 * @property {Object}   [metadata]         - 附加元数据
 * @property {string[]} [requiredRoles]    - 可操作此状态的角色白名单（v2.0）
 * @property {Object}   [subStates]        - 子状态定义（v2.0）
 */

/**
 * @typedef {Object} SubStateConfig
 * @property {string}   name      - 子状态名
 * @property {string}   label     - 中文标签
 * @property {string[]} sequence  - 有序步骤列表（如 ['confirmed','executed','submitted']）
 * @property {string}   ownerRole - 负责此子状态的角色
 * @property {Function} [onStep]  - 步骤完成回调
 */

/**
 * @typedef {Object} TransitionEvent
 * @property {string} type    - 事件类型
 * @property {string} target  - 目标状态名
 * @property {Object} [payload]
 * @property {string} [role]   - 操作人角色（v2.0）
 */

// ── 内部结构 ────────────────────────────────────────────────────

class StateNode {
  constructor(config) {
    this.name               = config.name;
    this.label              = config.label || config.name;
    this.allowedTransitions = [...(config.allowedTransitions || [])];
    this.onEnter            = config.onEnter || null;
    this.timeoutHours       = config.timeoutHours || null;
    this.metadata           = { ...(config.metadata || {}) };
    this.requiredRoles      = config.requiredRoles || null; // v2.0
    this.subStates          = config.subStates || null;     // v2.0
    this.enteredAt          = null;
  }
}

class SubStateTracker {
  constructor(name, label, sequence, ownerRole) {
    this.name       = name;
    this.label      = label;
    this.sequence   = sequence;   // 如 ['confirmed','executed','submitted']
    this.ownerRole  = ownerRole;
    this.currentIdx = 0;         // 当前步骤索引
    this.steps      = {};        // { stepName: { completedAt, operator } }
    this.completed  = false;
  }

  get currentStep() {
    return this.sequence[this.currentIdx] || null;
  }

  get progress() {
    return Math.round((this.currentIdx / Math.max(this.sequence.length - 1, 1)) * 100);
  }

  completeStep(stepName, operator) {
    if (!this.sequence.includes(stepName)) throw new Error(`Unknown sub-step: ${stepName}`);
    const idx = this.sequence.indexOf(stepName);
    if (idx > this.currentIdx) throw new Error(`Cannot skip steps. Current: ${this.currentStep}, Requested: ${stepName}`);
    if (this.steps[stepName]) throw new Error(`Step already completed: ${stepName}`);

    this.steps[stepName] = { completedAt: new Date().toISOString(), operator };

    if (idx === this.currentIdx && idx < this.sequence.length - 1) {
      this.currentIdx++;
    } else if (idx === this.sequence.length - 1) {
      this.completed = true;
    }

    return { stepName, isFinal: this.completed, nextStep: this.currentStep };
  }

  toJSON() {
    return {
      name: this.name,
      label: this.label,
      currentStep: this.currentStep,
      progress: this.progress,
      completed: this.completed,
      steps: { ...this.steps },
      ownerRole: this.ownerRole,
    };
  }
}

// ════════════════════════════════════════════════════════════════
//  WorkflowEngine v2.0
// ════════════════════════════════════════════════════════════════

export class WorkflowEngine {

  constructor(definition) {
    this.definitionId  = definition.id || 'anonymous';
    this.title         = definition.title || 'Unnamed Workflow';
    /** @type {Map<string, StateNode>} */
    this.states        = new Map();
    this.currentState  = null;
    /** @type {TransitionRecord[]} */
    this.history       = [];
    this.createdAt     = null;
    /** @type {Set<string>} */
    this.blockedNodes  = new Set();
    /** @type {BlockingNotification[]} */
    this.notifications = [];

    // ── v2.0 新增：角色权限 + 子状态 ──
    this.roleGuardEnabled = true;
    /** @type {Map<string, SubStateTracker>} */
    this.subStateTrackers = new Map();

    if (definition.states) {
      for (const cfg of definition.states) {
        this.registerState(cfg);
      }
    }
  }

  registerState(config) {
    if (this.states.has(config.name)) throw new Error(`Duplicate state: ${config.name}`);
    this.states.set(config.name, new StateNode(config));

    // 初始化子状态追踪器
    if (config.subStates) {
      for (const ss of Object.values(config.subStates)) {
        this.subStateTrackers.set(ss.name, new SubStateTracker(
          ss.name, ss.label, ss.sequence || [], ss.ownerRole
        ));
      }
    }
  }

  start(initialState, operator = 'system') {
    const initialStateName = initialState || this._resolveInitial();
    const state = this.states.get(initialStateName);
    if (!state) throw new Error(`Unknown initial state: ${initialStateName}`);

    this.currentState = initialStateName;
    const now = new Date().toISOString();
    this.createdAt = now;
    state.enteredAt = now;
    this._record(null, initialStateName, 'INIT', operator);

    // 初始化当前状态的子状态
    this._initSubStates(initialStateName);

    return this.getStatus();
  }

  // ── v2.0 核心：带角色校验的状态流转 ─────────────────────────────

  /**
   * @param {TransitionEvent} event
   * @param {string} operator - 操作人标识
   * @param {string} [operatorRole] - 操作人角色（如 'disc-commissioner'/'org-commissioner'/'prop-commissioner'/'leader'）
   * @returns {{ from, to, success }}
   */
  transition(event, operator = 'system', operatorRole = null) {
    if (!this.currentState) throw new Error('Workflow not started');

    const current = this.states.get(this.currentState);
    const targetName = event.target;

    // 1. 基础合法性检查
    if (!current.allowedTransitions.includes(targetName)) {
      const allowed = current.allowedTransitions.join(' → ');
      throw new Error(
        `[${this.title}] Transition blocked: "${this.currentState}" → "${targetName}" not allowed.\n` +
        `  Allowed: [${allowed || '(terminal)'}]`
      );
    }

    // 2. v2.0 角色守卫检查
    if (this.roleGuardEnabled && operatorRole) {
      const guardResult = this._checkRoleGuard(targetName, operatorRole);
      if (!guardResult.allowed) {
        throw new Error(
          `[${this.title}] Role guard blocked: "${operatorRole}" cannot execute "${event.type}" → "${targetName}".\n` +
          `  Reason: ${guardResult.reason}`
        );
      }
    }

    // 3. v2.0 前置校验（子状态必须全部完成才能离开当前状态）
    const preCheck = this._preTransitionCheck(this.currentState, targetName);
    if (!preCheck.passed) {
      throw new Error(
        `[${this.title}] Pre-condition failed for "${this.currentState}" → "${targetName}".\n` +
        `  Missing: ${preCheck.missing.join(', ')}`
      );
    }

    // ── 执行流转 ──
    const from = this.currentState;
    const now = new Date().toISOString();
    const next = this.states.get(targetName);

    this.currentState = targetName;
    next.enteredAt = now;

    if (typeof next.onEnter === 'function') {
      try { next.onEnter({ from, to: targetName, event, operator, operatorRole, engine: this }); }
      catch (e) { console.warn(`[WorkflowEngine] onEnter error at "${targetName}":`, e); }
    }

    this._record(from, targetName, event.type, operator, { ...event.payload, operatorRole });

    if (this.blockedNodes.has(from)) this.blockedNodes.delete(from);

    // 初始化新状态的子状态
    this._initSubStates(targetName);

    return { from, to: targetName, success: true };
  }

  // ── v2.0 子状态操作 ───────────────────────────────────────────

  /**
   * 完成一个子状态步骤。
   * @param {string} subStateName - 子状态名（如 'attendance' / 'publicity'）
   * @param {string} stepName     - 步骤名（如 'confirmed' / 'executed' / 'submitted'）
   * @param {string} operator     - 操作人
   * @param {string} [operatorRole] - 操作人角色
   */
  completeSubStep(subStateName, stepName, operator, operatorRole = null) {
    const tracker = this.subStateTrackers.get(subStateName);
    if (!tracker) throw new Error(`Unknown sub-state: ${subStateName}`);

    // 角色校验
    if (this.roleGuardEnabled && operatorRole && tracker.ownerRole) {
      if (operatorRole !== tracker.ownerRole && operatorRole !== 'secretary' && operatorRole !== 'leader') {
        throw new Error(`Role "${operatorRole}" cannot operate sub-state "${subStateName}" (owner: ${tracker.ownerRole})`);
      }
    }

    const result = tracker.completeStep(stepName, operator);

    // 记录子状态变更
    this.history.push({
      from: this.currentState,
      to: this.currentState,
      eventType: `SUBSTEP:${subStateName}`,
      operator,
      timestamp: new Date().toISOString(),
      payload: { stepName, ...result, operatorRole },
    });

    return result;
  }

  /**
   * 获取所有子状态的快照。
   */
  getSubStateStatus() {
    const result = {};
    for (const [name, tracker] of this.subStateTrackers) {
      result[name] = tracker.toJSON();
    }
    return result;
  }

  /**
   * 检查某状态的子状态是否全部完成。
   */
  areSubStatesComplete(stateName) {
    const state = this.states.get(stateName);
    if (!state || !state.subStates) return true;

    for (const ss of Object.values(state.subStates)) {
      const tracker = this.subStateTrackers.get(ss.name);
      if (tracker && !tracker.completed) return false;
    }
    return true;
  }

  // ── 角色守卫 ─────────────────────────────────────────────────

  _checkRoleGuard(targetStateName, operatorRole) {
    const target = this.states.get(targetStateName);
    if (!target || !target.requiredRoles) return { allowed: true };

    if (target.requiredRoles.includes(operatorRole)) return { allowed: true };
    if (target.requiredRoles.includes('any')) return { allowed: true };

    return {
      allowed: false,
      reason: `"${targetStateName}" requires one of roles: [${target.requiredRoles.join(', ')}], got "${operatorRole}"`,
    };
  }

  // ── 前置校验 ─────────────────────────────────────────────────

  _preTransitionCheck(currentStateName, targetStateName) {
    const current = this.states.get(currentStateName);
    if (!current || !current.subStates) return { passed: true, missing: [] };

    const missing = [];
    for (const ss of Object.values(current.subStates)) {
      if (ss.requiredBeforeExit !== false) {
        const tracker = this.subStateTrackers.get(ss.name);
        if (tracker && !tracker.completed) {
          missing.push(`${ss.label}(${ss.name}) 未完成 — 当前步骤: ${tracker.currentStep}`);
        }
      }
    }

    return { passed: missing.length === 0, missing };
  }

  // ── 初始化子状态 ───────────────────────────────────────────────

  _initSubStates(stateName) {
    const state = this.states.get(stateName);
    if (!state || !state.subStates) return;

    for (const ss of Object.values(state.subStates)) {
      if (!this.subStateTrackers.has(ss.name)) {
        this.subStateTrackers.set(ss.name, new SubStateTracker(
          ss.name, ss.label, ss.sequence || [], ss.ownerRole
        ));
      }
    }
  }

  // ── 继承自 v1.0 的方法 ────────────────────────────────────────

  checkBlocking(now = Date.now()) {
    if (!this.currentState) return [];
    const newlyBlocked = [];
    const current = this.states.get(this.currentState);
    if (!current || !current.timeoutHours || !current.enteredAt) return [];

    const elapsedHours = (now - new Date(current.enteredAt).getTime()) / (1000 * 60 * 60);
    if (elapsedHours > current.timeoutHours) {
      const alreadyBlocked = this.blockedNodes.has(this.currentState);
      this.blockedNodes.add(this.currentState);
      const notification = {
        type: 'BLOCKED', state: this.currentState, stateLabel: current.label,
        elapsedHours: Math.round(elapsedHours * 10) / 10,
        timeoutHours: current.timeoutHours, detectedAt: new Date(now).toISOString(),
      };
      this.notifications.push(notification);
      if (!alreadyBlocked) newlyBlocked.push(notification);
    }
    return newlyBlocked;
  }

  getHistory() { return [...this.history]; }

  getStatus() {
    const current = this.currentState ? this.states.get(this.currentState) : null;
    return {
      definitionId: this.definitionId, title: this.title,
      currentState: this.currentState, currentLabel: current ? current.label : null,
      createdAt: this.createdAt,
      isBlocked: this.blockedNodes.has(this.currentState),
      blockedNodes: [...this.blockedNodes],
      transitionCount: this.history.length,
      lastTransition: this.history.length > 0 ? this.history[this.history.length - 1] : null,
      history: [...this.history], notifications: [...this.notifications],
      // v2.0 新增
      subStates: this.getSubStateStatus(),
      subStatesComplete: this.areSubStatesComplete(this.currentState),
    };
  }

  getAvailableTransitions() {
    if (!this.currentState) return [];
    const current = this.states.get(this.currentState);
    return current ? [...current.allowedTransitions] : [];
  }

  reset() {
    for (const [, node] of this.states) node.enteredAt = null;
    this.currentState = null; this.history = []; this.createdAt = null;
    this.blockedNodes.clear(); this.notifications = [];
    this.subStateTrackers.clear();
  }

  _resolveInitial() {
    for (const [name] of this.states) return name;
    throw new Error('No states registered');
  }

  _record(from, to, eventType, operator, payload = null) {
    this.history.push({ from, to, eventType, operator, timestamp: new Date().toISOString(), payload });
  }
}
