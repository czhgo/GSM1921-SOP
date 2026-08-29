// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  service.todo.js — 待办任务服务层
//  最小三成本原则落地：任务流默认直接展示在工作台
//  Source: content/04_web_design/data/DATA_ARCHITECTURE.md §2.18-§2.20
//         content/04_web_design/design-system/DESIGN_SYSTEM.md §一 第6条
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../core/domain.js?v=20260829a';
import { persist } from '../core/data-adapter.js?v=20260829a';
import { generateId } from '../core/id.js?v=20260829a';

// ── 待办分类枚举 ──────────────────────────────────────────────
export const TodoCategory = {
  AUTH: 'auth',       // 赋权类：待赋权活动、待赋权专班、待设党小组组长
  ARCHIVE: 'archive', // 归档类：待归档活动、待归档专班
  REVIEW: 'review',   // 审核类：考勤确认、考察确认、复盘审核、活动审批
  NOTICE: 'notice',   // 通知类：通知阅读、通知催读
  SUBMIT: 'submit',   // 提交类：考勤上传、考察上传、复盘提交、周报报送
  TRACK: 'track',     // 追踪类：发展党员追踪、材料催缴、补课跟进
};

/** 待办分类中文标签 */
export const TODO_CATEGORY_LABELS = {
  [TodoCategory.AUTH]: '赋权类',
  [TodoCategory.ARCHIVE]: '归档类',
  [TodoCategory.REVIEW]: '审核类',
  [TodoCategory.NOTICE]: '通知类',
  [TodoCategory.SUBMIT]: '提交类',
  [TodoCategory.TRACK]: '追踪类',
};

// ── 待办状态枚举 ──────────────────────────────────────────────
export const TodoStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
};

export const TODO_STATUS_LABELS = {
  [TodoStatus.PENDING]: '待处理',
  [TodoStatus.IN_PROGRESS]: '进行中',
  [TodoStatus.COMPLETED]: '已完成',
  [TodoStatus.EXPIRED]: '已过期',
};

// ── 待办来源类型枚举 ──────────────────────────────────────────
export const TodoSourceType = {
  NOTICE: 'notice',
  ACTIVITY: 'activity',
  TASKFORCE: 'taskforce',
  MANUAL: 'manual',
};

// ── 待办行动类型枚举 ──────────────────────────────────────────
export const TodoActionType = {
  AUTHORIZE: 'authorize', // 赋权
  ARCHIVE: 'archive',     // 归档
  REVIEW: 'review',       // 审核
  READ: 'read',           // 阅读
  SUBMIT: 'submit',       // 提交
  TRACK: 'track',         // 追踪
  PARTICIPATE: 'participate', // 参与（visitor 活动待参与）
};

// ── 默认折叠状态（按分类） ────────────────────────────────────
export const DEFAULT_EXPANDED_CATEGORIES = new Set([
  TodoCategory.AUTH,
  TodoCategory.REVIEW,
]);

// ════════════════════════════════════════════════════════════════
//  持久化引擎
// ════════════════════════════════════════════════════════════════

function _loadTodos() {
  try {
    return [...mockDB.todos];
  } catch (e) {
    console.warn('[TodoStore] 加载失败：', e);
    return [];
  }
}

function _saveTodos(todos) {
  try {
    mockDB.todos = [...todos];
    persist();
  } catch (e) {
    console.warn('[TodoStore] 保存失败：', e);
  }
}

/** 今日 YYYY-MM-DD（聚合排序用） */
function _todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** 待办是否过期（pending 且 deadline 早于今日） */
function _isTodoExpired(todo, today) {
  if (todo.status === 'expired') return true;
  if (todo.status !== 'pending') return false;
  if (!todo.deadline) return false;
  return todo.deadline < today;
}

// ════════════════════════════════════════════════════════════════
//  TodoStore — 待办 CRUD + 派生触发
// ════════════════════════════════════════════════════════════════

export const TodoStore = {
  // ── 查询 ──────────────────────────────────────────────────

  /** 获取全部待办 */
  getAll() {
    return _loadTodos();
  },

  /** 按 ID 获取待办 */
  getById(id) {
    return _loadTodos().find(t => t.id === id) || null;
  },

  /** 按角色查询待办（可选状态过滤） */
  getByRole(role, options = {}) {
    const { status, includeCompleted = false } = options;
    let todos = _loadTodos().filter(t => t.role === role);

    if (!includeCompleted) {
      todos = todos.filter(t => t.status !== TodoStatus.COMPLETED);
    }

    if (status) {
      todos = todos.filter(t => t.status === status);
    }

    return todos;
  },

  /** 按角色+分类查询待办 */
  getByRoleAndCategory(role, category) {
    return _loadTodos().filter(t => t.role === role && t.category === category);
  },

  /** 按来源查询待办（用于来源删除时联动） */
  getBySource(sourceType, sourceId) {
    return _loadTodos().filter(t => t.sourceType === sourceType && t.sourceId === sourceId);
  },

  /** 按角色查询待办并按分类分组 */
  getGroupedByCategory(role, options = {}) {
    const todos = this.getByRole(role, options);
    const grouped = {};
    for (const cat of Object.values(TodoCategory)) {
      grouped[cat] = [];
    }
    for (const todo of todos) {
      if (!grouped[todo.category]) grouped[todo.category] = [];
      grouped[todo.category].push(todo);
    }
    // 每类内部排序：过期优先，然后按截止时间升序
    for (const cat of Object.keys(grouped)) {
      grouped[cat].sort((a, b) => {
        const aExpired = this._isExpired(a);
        const bExpired = this._isExpired(b);
        if (aExpired && !bExpired) return -1;
        if (!aExpired && bExpired) return 1;
        const aDeadline = a.deadline || '9999';
        const bDeadline = b.deadline || '9999';
        return aDeadline.localeCompare(bDeadline);
      });
    }
    return grouped;
  },

  // ── 创建 ──────────────────────────────────────────────────

  /** 创建单条待办 */
  create(data) {
    const todo = {
      id: data.id || generateId('todo_'),
      title: data.title || '未命名待办',
      description: data.description || '',
      role: data.role,
      personId: data.personId || null,
      category: data.category,
      priority: data.priority || 'normal',
      status: data.status || TodoStatus.PENDING,
      deadline: data.deadline || null,
      createdAt: data.createdAt || new Date().toISOString(),
      completedAt: data.completedAt || null,
      sourceType: data.sourceType || TodoSourceType.MANUAL,
      sourceId: data.sourceId || null,
      actionType: data.actionType || null,
      actionData: data.actionData || null,
      // 业务动作标识（聚合键组成：role+actionKey，区分同 actionType 的不同业务域）
      actionKey: data.actionKey || null,
      // 数据上下游标注（E2：待办项标注数据流，如「组长上传考勤 → 纪检确认 → 考勤总表」；无则列表不显示）
      flow: data.flow || null,
    };

    const todos = _loadTodos();
    todos.push(todo);
    _saveTodos(todos);
    return todo;
  },

  /** 批量创建待办（用于通知派生） */
  createBatch(items) {
    const todos = _loadTodos();
    const created = [];
    for (const data of items) {
      const todo = {
        id: data.id || generateId('todo_'),
        title: data.title || '未命名待办',
        description: data.description || '',
        role: data.role,
        personId: data.personId || null,
        category: data.category,
        priority: data.priority || 'normal',
        status: data.status || TodoStatus.PENDING,
        deadline: data.deadline || null,
        createdAt: data.createdAt || new Date().toISOString(),
        completedAt: data.completedAt || null,
        sourceType: data.sourceType || TodoSourceType.MANUAL,
        sourceId: data.sourceId || null,
        actionType: data.actionType || null,
        actionData: data.actionData || null,
        // 业务动作标识（聚合键组成：role+actionKey，同 create）
        actionKey: data.actionKey || null,
        // 数据上下游标注（E2，同 create）
        flow: data.flow || null,
      };
      todos.push(todo);
      created.push(todo);
    }
    _saveTodos(todos);
    return created;
  },

  // ── 更新 ──────────────────────────────────────────────────

  /** 更新待办状态 */
  updateStatus(id, status) {
    const todos = _loadTodos();
    const idx = todos.findIndex(t => t.id === id);
    if (idx < 0) return null;

    todos[idx] = {
      ...todos[idx],
      status,
      completedAt: status === TodoStatus.COMPLETED ? new Date().toISOString() : todos[idx].completedAt,
    };
    _saveTodos(todos);
    return todos[idx];
  },

  /** 标记为已完成 */
  complete(id) {
    return this.updateStatus(id, TodoStatus.COMPLETED);
  },

  /** 标记为进行中 */
  start(id) {
    return this.updateStatus(id, TodoStatus.IN_PROGRESS);
  },

  /** 重新激活过期待办 */
  reactivate(id) {
    return this.updateStatus(id, TodoStatus.PENDING);
  },

  /** 通用更新 */
  update(id, patch) {
    const todos = _loadTodos();
    const idx = todos.findIndex(t => t.id === id);
    if (idx < 0) return null;
    todos[idx] = { ...todos[idx], ...patch };
    _saveTodos(todos);
    return todos[idx];
  },

  // ── 删除 ──────────────────────────────────────────────────

  /** 删除单条待办 */
  delete(id) {
    const todos = _loadTodos().filter(t => t.id !== id);
    _saveTodos(todos);
  },

  /** 按来源删除待办（来源删除时联动） */
  deleteBySource(sourceType, sourceId) {
    const todos = _loadTodos().filter(
      t => !(t.sourceType === sourceType && t.sourceId === sourceId)
    );
    _saveTodos(todos);
  },

  // ── 聚合查询与批量销项（2026-08-07 待办闭环化） ─────────────

  /**
   * 按「角色+业务动作」聚合（展示层聚合，同跳转目标合并为一条聚合卡）
   * @param {string} role
   * @returns {Array<{groupKey, actionKey, title, category, actionType, actionData, deadline, flow, count, items}>}
   */
  getGroupedByAction(role) {
    const todos = this.getByRole(role);
    const today = _todayStr();
    const map = new Map();
    for (const t of todos) {
      // 聚合键 = role:actionKey，actionKey 缺省时按 actionType 兜底
      const key = `${role}:${t.actionKey || t.actionType || t.category || 'other'}`;
      if (!map.has(key)) {
        map.set(key, {
          groupKey: key,
          actionKey: t.actionKey || t.actionType || 'other',
          title: t.title,
          category: t.category,
          actionType: t.actionType,
          actionData: t.actionData,
          deadline: t.deadline,
          flow: t.flow,
          count: 0,
          items: [],
        });
      }
      const g = map.get(key);
      g.count++;
      g.items.push(t);
      if (t.deadline && (!g.deadline || t.deadline < g.deadline)) g.deadline = t.deadline;
    }
    const groups = [...map.values()];
    // 组内排序：过期优先、截止升序
    groups.forEach(g => {
      g.items.sort((a, b) => {
        const aExp = _isTodoExpired(a, today);
        const bExp = _isTodoExpired(b, today);
        if (aExp !== bExp) return aExp ? -1 : 1;
        return (a.deadline || '9999').localeCompare(b.deadline || '9999');
      });
    });
    return groups;
  },

  /** 按来源批量标记完成（业务操作联动：纪检确认考勤→销对应待办等） */
  completeBySource(sourceType, sourceId) {
    const todos = _loadTodos();
    let changed = false;
    const updated = todos.map(t => {
      if (t.sourceType === sourceType && t.sourceId === sourceId && t.status !== TodoStatus.COMPLETED) {
        changed = true;
        return { ...t, status: TodoStatus.COMPLETED, completedAt: new Date().toISOString() };
      }
      return t;
    });
    if (changed) _saveTodos(updated);
    return updated;
  },

  /** 按聚合键批量标记完成（completeBySource 的补充：同 role+actionKey 全部销项） */
  completeByGroup(groupKey) {
    const todos = _loadTodos();
    let changed = false;
    const [role, ...rest] = String(groupKey).split(':');
    const actionKey = rest.join(':');
    const updated = todos.map(t => {
      const match = t.role === role && (t.actionKey || t.actionType || t.category || 'other') === actionKey;
      if (match && t.status !== TodoStatus.COMPLETED) {
        changed = true;
        return { ...t, status: TodoStatus.COMPLETED, completedAt: new Date().toISOString() };
      }
      return t;
    });
    if (changed) _saveTodos(updated);
    return updated;
  },

  // ── 过期检查 ──────────────────────────────────────────────

  /** 检查待办是否过期（pending 状态且 deadline < today） */
  _isExpired(todo) {
    if (todo.status !== TodoStatus.PENDING) return false;
    if (!todo.deadline) return false;
    const today = new Date().toISOString().slice(0, 10);
    return todo.deadline < today;
  },

  /** 扫描所有待办，将过期未处理标记为 expired */
  refreshExpiredStatus() {
    const todos = _loadTodos();
    let changed = false;
    const today = new Date().toISOString().slice(0, 10);
    const updated = todos.map(t => {
      if (t.status === TodoStatus.PENDING && t.deadline && t.deadline < today) {
        changed = true;
        return { ...t, status: TodoStatus.EXPIRED };
      }
      return t;
    });
    if (changed) _saveTodos(updated);
    return updated;
  },

  // ── 统计 ──────────────────────────────────────────────────

  /** 按角色统计待办数量（按分类） */
  getStatsByRole(role) {
    const todos = this.getByRole(role);
    const stats = {};
    for (const cat of Object.values(TodoCategory)) {
      stats[cat] = 0;
    }
    for (const t of todos) {
      if (!stats[t.category]) stats[t.category] = 0;
      stats[t.category]++;
    }
    stats._total = todos.length;
    stats._expired = todos.filter(t => this._isExpired(t) || t.status === TodoStatus.EXPIRED).length;
    return stats;
  },
};

// ════════════════════════════════════════════════════════════════
//  通知→待办派生机制
//  Source: content/04_web_design/data/DATA_ARCHITECTURE.md §2.19
// ════════════════════════════════════════════════════════════════

export const NoticeTodoDeriver = {
  /**
   * 通知发布时，若 actionable=true，自动为 actionRoles 中的每个角色生成待办
   * @param {Object} notice - 通知对象（含 actionable/actionRoles/actionTask/actionDeadline 等扩展字段）
   */
  deriveFromNotice(notice) {
    if (!notice || notice.archived) return []; // 2026-08-08 归档闭环：已归档通知不派生待办
    if (!notice.actionable) return [];
    if (!Array.isArray(notice.actionRoles) || notice.actionRoles.length === 0) return [];

    const items = notice.actionRoles.map(role => ({
      title: notice.actionTask || notice.title,
      description: notice.content || '',
      role,
      category: TodoCategory.NOTICE,
      priority: notice.priority || 'normal',
      deadline: notice.actionDeadline || notice.expireDate || null,
      sourceType: TodoSourceType.NOTICE,
      sourceId: notice.id,
      actionType: this._inferActionType(notice),
      actionData: { noticeId: notice.id },
      flow: this._inferFlow(notice),
    }));

    return TodoStore.createBatch(items);
  },

  /** 根据通知 targetModule 推断行动类型 */
  _inferActionType(notice) {
    const moduleMap = {
      attendance: TodoActionType.REVIEW,
      party: TodoActionType.REVIEW,
      activity: TodoActionType.READ,
      workspace: TodoActionType.READ,
    };
    return moduleMap[notice.targetModule] || TodoActionType.READ;
  },

  /** 根据通知 targetModule 推断数据流（E2：无明确上下游的通知不标注） */
  _inferFlow(notice) {
    const flowMap = {
      attendance: '考勤上传 → 纪检确认 → 考勤总表',
      party: '发展材料 → 组织委员建档 → 人才库',
    };
    return flowMap[notice.targetModule] || null;
  },

  /** 通知取消/过期时，关联待办标记为 expired */
  expireByNotice(noticeId) {
    const todos = _loadTodos();
    let changed = false;
    const updated = todos.map(t => {
      if (t.sourceType === TodoSourceType.NOTICE && t.sourceId === noticeId && t.status === TodoStatus.PENDING) {
        changed = true;
        return { ...t, status: TodoStatus.EXPIRED };
      }
      return t;
    });
    if (changed) _saveTodos(updated);
    return updated;
  },
};

// ════════════════════════════════════════════════════════════════
//  活动/专班生命周期→待办派生
//  Source: content/04_web_design/data/DATA_ARCHITECTURE.md §2.18.3
// ════════════════════════════════════════════════════════════════

export const LifecycleTodoDeriver = {
  /**
   * 活动创建后，自动为党小组组长生成赋权待办
   * @param {Object} activity - 活动对象
   */
  deriveFromActivityCreate(activity) {
    if (!activity || !activity.id) return [];

    return TodoStore.createBatch([{
      title: `为活动「${activity.title || '未命名'}」赋权组织者/深度参与者`,
      description: `活动日期：${activity.date || '未设定'}。请选择人员授予组织者或深度参与者角色。`,
      role: 'leader',
      category: TodoCategory.AUTH,
      priority: 'urgent',
      deadline: activity.date || null,
      sourceType: TodoSourceType.ACTIVITY,
      sourceId: activity.id,
      actionType: TodoActionType.AUTHORIZE,
      actionData: { scope: 'activity', sourceId: activity.id, sourceName: activity.title },
      // E2 数据上下游标注
      flow: '活动创建 → 组长赋权 → 组织者/深度参与者执行',
    }]);
  },

  /**
   * 专班创建后，自动为组织委员生成赋权待办
   * @param {Object} taskforce - 专班对象
   */
  deriveFromTaskforceCreate(taskforce) {
    if (!taskforce || !taskforce.id) return [];

    return TodoStore.createBatch([{
      title: `为专班「${taskforce.name || '未命名'}」赋权组织者/深度参与者`,
      description: `专班周期：${taskforce.startDate || '?'} ~ ${taskforce.endDate || '?'}. 请选择人员授予组织者或深度参与者角色。`,
      role: 'org-commissioner',
      category: TodoCategory.AUTH,
      priority: 'urgent',
      deadline: taskforce.startDate || null,
      sourceType: TodoSourceType.TASKFORCE,
      sourceId: taskforce.id,
      actionType: TodoActionType.AUTHORIZE,
      actionData: { scope: 'taskforce', sourceId: taskforce.id, sourceName: taskforce.name },
      // E2 数据上下游标注
      flow: '专班创建 → 组织委员赋权 → 成员执行',
    }]);
  },

  /**
   * 活动归档后，自动为宣传委员生成归档待办（如需归档材料）
   * @param {Object} activity - 活动对象
   */
  deriveFromActivityArchive(activity) {
    if (!activity || !activity.id) return [];

    return TodoStore.createBatch([{
      title: `归档活动「${activity.title || '未命名'}」材料`,
      description: `请上传活动归档材料（照片、新闻稿、总结等）。`,
      role: 'prop-commissioner',
      category: TodoCategory.ARCHIVE,
      priority: 'normal',
      deadline: null,
      sourceType: TodoSourceType.ACTIVITY,
      sourceId: activity.id,
      actionType: TodoActionType.ARCHIVE,
      actionData: { scope: 'activity', sourceId: activity.id, sourceName: activity.title },
      // E2 数据上下游标注
      flow: '宣传材料 → 宣传委员归档 → 产出物区',
    }]);
  },

  /** 活动删除时，联动删除关联待办 */
  deleteByActivity(activityId) {
    TodoStore.deleteBySource(TodoSourceType.ACTIVITY, activityId);
  },

  /** 专班删除时，联动删除关联待办 */
  deleteByTaskforce(taskforceId) {
    TodoStore.deleteBySource(TodoSourceType.TASKFORCE, taskforceId);
  },
};

// ════════════════════════════════════════════════════════════════
//  Visitor 待办派生（普通成员/访客）
//  通知待阅读（未读·未过期·受众相关）+ 活动待参与（未来·本人参与）
//  幂等：按 sourceType+sourceId 去重，可安全重复调用
// ════════════════════════════════════════════════════════════════

// 待办聚合键 'visitor' 与角色键 participant 的映射（S9 文档登记，书记 2026-08-30 裁定：不改代码）
// 语义：'visitor' 是「普通参与者工作台（participant.html）」的待办聚合键，对应角色 participant；
// 与「访客（未登录）」无关。设计文档 ROLE_SSOT_DESIGN.md S9 已登记映射，保留 'visitor' 键不动。
export const VisitorTodoDeriver = {
  /**
   * 派生全部 visitor 待办（通知待阅读 + 活动待参与）
   * @param {Object} opts
   * @param {string} opts.personId — 当前用户 personId
   * @param {Object} [opts.person] — 当前用户人员对象（用于受众匹配）
   * @param {Array}  opts.notices  — NoticeStore.getAll() 结果
   * @param {Array}  opts.activities — 已映射的活动列表（含 assignments/organizer）
   */
  deriveAll({ personId, person, notices, activities, signups }) {
    const created = [];
    created.push(...this.deriveFromNotices({ personId, person, notices }));
    created.push(...this.deriveFromActivities({ personId, activities, signups }));
    return created;
  },

  /**
   * 通知待阅读：未读、未过期、受众相关的通知
   * 受众规则：attendance（纪检考勤）不派给普通成员；party（发展党员）只派给非正式党员
   */
  deriveFromNotices({ personId, person, notices }) {
    if (!personId) return [];
    const today = new Date().toISOString().slice(0, 10);
    const items = [];
    for (const n of notices || []) {
      if (n.archived) continue; // 2026-08-08 归档闭环：已归档通知不派生阅读待办
      if (n.read) continue;
      if (n.expireDate && n.expireDate < today) continue;
      const module = n.targetModule;
      if (module === 'attendance') continue;
      if (module === 'party' && person && person.developStage === '正式党员') continue;
      const dup = TodoStore.getBySource(TodoSourceType.NOTICE, n.id).some(t => t.status !== TodoStatus.COMPLETED);
      if (dup) continue;
      items.push({
        title: `阅读通知「${n.title}」`,
        description: n.content || '',
        role: 'visitor',
        category: TodoCategory.NOTICE,
        priority: n.priority || 'normal',
        deadline: n.expireDate || null,
        sourceType: TodoSourceType.NOTICE,
        sourceId: n.id,
        actionType: TodoActionType.READ,
        actionData: { noticeId: n.id },
      });
    }
    return TodoStore.createBatch(items);
  },

  /**
   * 活动待参与：未来、未归档/未取消/非草稿、本人参与的活动
   * 同时清理已取消/已过期的残留待办，避免孤儿项
   */
  deriveFromActivities({ personId, activities, signups = [] }) {
    if (!personId) return [];
    const today = new Date().toISOString().slice(0, 10);
    const applicableIds = new Set();
    const items = [];
    for (const a of activities || []) {
      if (!a || !a.id) continue;
      if (a.archived || a.status === 'cancelled' || a.status === 'draft') continue;
      if (!a.date || a.date < today) continue;
      // T233：approved 报名也是参与事实（报名即加入/审核通过后）
      const approvedMine = (signups || []).some(s =>
        s.sourceType === 'activity' && s.sourceId === a.id &&
        s.personId === personId && s.status === 'approved'
      );
      const mine = a.organizer === personId ||
        (Array.isArray(a.assignments) && a.assignments.some(x => x.personId === personId)) ||
        approvedMine;
      if (!mine) continue;
      applicableIds.add(a.id);
      // dup 仅限「参与」类待办：signup-review 等其它同源待办不得阻止参与待办生成
      const dup = TodoStore.getBySource(TodoSourceType.ACTIVITY, a.id)
        .some(t => t.actionType === TodoActionType.PARTICIPATE && t.status !== TodoStatus.COMPLETED);
      if (dup) continue;
      items.push({
        title: `参与活动「${a.title || '未命名'}」`,
        description: `活动日期：${a.date}。请按时参与并配合考勤。`,
        role: 'visitor',
        category: TodoCategory.TRACK,
        priority: 'normal',
        deadline: a.date,
        sourceType: TodoSourceType.ACTIVITY,
        sourceId: a.id,
        actionType: TodoActionType.PARTICIPATE,
        actionData: { activityId: a.id },
      });
    }
    // 清理：本人已不适用（取消/过期/归档）的活动待办 → 移除
    const stale = _loadTodos().filter(t =>
      t.role === 'visitor' &&
      t.sourceType === TodoSourceType.ACTIVITY &&
      t.status !== TodoStatus.COMPLETED &&
      !applicableIds.has(t.sourceId)
    );
    if (stale.length > 0) {
      const remaining = _loadTodos().filter(t => !stale.some(s => s.id === t.id));
      _saveTodos(remaining);
    }
    return TodoStore.createBatch(items);
  },

  /**
   * 专班参与待办：approved 报名或已是成员的未来招募专班（T233 报名渠道）
   * 与 deriveFromActivities 同模式：未来/未截止、本人参与、去重、清理过期残留
   */
  deriveFromTaskforceSignups({ personId, taskforces, signups = [] }) {
    if (!personId) return [];
    const today = new Date().toISOString().slice(0, 10);
    const applicableIds = new Set();
    const items = [];
    for (const tf of taskforces || []) {
      if (!tf || !tf.id) continue;
      if (tf.status !== 'recruiting' && tf.status !== 'active') continue;
      if (tf.deadline && tf.deadline < today) continue;
      const isMember = (tf.members || []).some(m => m.personId === personId);
      const approved = (signups || []).some(s =>
        s.sourceType === 'taskforce' && s.sourceId === tf.id &&
        s.personId === personId && s.status === 'approved'
      );
      if (!isMember && !approved) continue;
      applicableIds.add(tf.id);
      // dup 仅限「参与」类待办：signup-review 等其它同源待办不得阻止参与待办生成
      const dup = TodoStore.getBySource(TodoSourceType.TASKFORCE, tf.id)
        .some(t => t.actionType === TodoActionType.PARTICIPATE && t.status !== TodoStatus.COMPLETED);
      if (dup) continue;
      items.push({
        title: `参与专班「${tf.name || '未命名'}」`,
        description: tf.task || '',
        role: 'visitor',
        category: TodoCategory.TRACK,
        priority: 'normal',
        deadline: tf.deadline || null,
        sourceType: TodoSourceType.TASKFORCE,
        sourceId: tf.id,
        actionType: TodoActionType.PARTICIPATE,
        actionData: { taskforceId: tf.id },
      });
    }
    // 清理：本人已不适用（取消/过期/归档）的专班待办 → 移除
    const stale = _loadTodos().filter(t =>
      t.role === 'visitor' &&
      t.sourceType === TodoSourceType.TASKFORCE &&
      t.status !== TodoStatus.COMPLETED &&
      !applicableIds.has(t.sourceId)
    );
    if (stale.length > 0) {
      const remaining = _loadTodos().filter(t => !stale.some(s => s.id === t.id));
      _saveTodos(remaining);
    }
    return TodoStore.createBatch(items);
  },
};

// ════════════════════════════════════════════════════════════════
//  种子数据 — mock 待办示例
// ════════════════════════════════════════════════════════════════

export const SEED_TODOS = [
  // 宣传委员待办
  {
    id: 'todo_seed_6',
    title: '提交七一活动新闻稿',
    description: '请撰写并提交七一建党105周年系列活动新闻稿。',
    role: 'prop-commissioner',
    category: TodoCategory.SUBMIT,
    priority: 'normal',
    status: TodoStatus.PENDING,
    deadline: '2026-08-01',
    createdAt: '2026-07-05T08:00:00',
    sourceType: TodoSourceType.MANUAL,
    sourceId: null,
    actionKey: 'activity-archive',
    actionType: TodoActionType.SUBMIT,
    actionData: null,
    // E2 数据上下游标注
    flow: '宣传材料 → 宣传委员归档 → 产出物区',
  },
  // 书记待办
  {
    id: 'todo_seed_7',
    title: '设置第三党小组组长',
    description: '第三党小组组长待任命，请在常设赋权中完成设置。',
    role: 'secretary',
    category: TodoCategory.AUTH,
    priority: 'normal',
    status: TodoStatus.PENDING,
    deadline: null,
    createdAt: '2026-07-01T08:00:00',
    sourceType: TodoSourceType.MANUAL,
    sourceId: null,
    actionKey: 'authorize',
    actionType: TodoActionType.AUTHORIZE,
    actionData: { scope: 'leader', sourceId: null, sourceName: '第三党小组组长' },
  },
];

/** 已废弃种子（T232 闭环化移除：虚假/过期且来源与销项动作不匹配，改由业务数据动态派生） */
const OBSOLETE_SEED_IDS = new Set(['todo_seed_1', 'todo_seed_2', 'todo_seed_3', 'todo_seed_4', 'todo_seed_5']);

/** 初始化种子数据（幂等：按 id 补齐缺失种子；同时清理已废弃种子，避免残留叠加） */
export function seedTodos() {
  let existing = _loadTodos();
  // 清理已废弃种子（用户 localStorage 可能残留旧版本种子）
  const purged = existing.filter(t => !OBSOLETE_SEED_IDS.has(t.id));
  if (purged.length !== existing.length) {
    _saveTodos(purged);
    existing = purged;
  }
  const existingIds = new Set(existing.map(t => t.id));
  const missing = SEED_TODOS.filter(t => !existingIds.has(t.id));
  if (missing.length === 0) return;
  _saveTodos([...existing, ...missing]);
}
