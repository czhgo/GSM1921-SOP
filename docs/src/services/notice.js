// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  service.notice.js — 通知数据模型
//  提供 NoticeStore：通知的 CRUD + mockDB 持久化
//  独立于 mockDB 内存结构，通过 mockDB.notices 统一持久化
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../core/domain.js?v=20260921j';
import { generateId } from '../core/id.js?v=20260921j';
import { persist, getDataSource, getApiBaseUrl, getAuthToken } from '../core/data-adapter.js?v=20260921j';
import { buildSystemNotice } from '../core/system-notice-templates.js?v=20260921j';
import { bumpToken } from '../core/version-token.js?v=20260921j'; // P0 域缓存失效（spec §二.3）
import { MOCK_NOTICES } from '../mock/index.js?v=20260921j';
import { isInitStateActive } from './init-reset.js?v=20260921j'; // C2 修复（2026-09-08）：init 态跳过演示种子兜底
import { showToast, getBasePath } from '../core/utils.js?v=20260921j';
import { AuthStore } from './auth.js?v=20260921j';
import { getPersonById, liveMembers } from './person.js?v=20260921j';
import { NoticeTodoDeriver, TodoStore, TodoSourceType, TodoStatus } from './todo.js?v=20260921j';
import { badgeHtml } from '../components/badges.js?v=20260921j';
import { openFormModal } from '../components/modal.js?v=20260921j';
// 组织者身份读取单一源（2026-09-19 批次 91 · SOP-B-17）——发布权随「被指定为该场组织者」动态获得
import { getOrganizedActivities, isActivityOrganizer } from './activity.js?v=20260921j';
import {
  NOTICE_PUBLISH_ROLES, NOTICE_MANAGE_ROLES, BRANCH_COMMISSION_ROLES,
  NOTICE_AUDIENCE_SENTINELS, ROLE_LABELS,
} from '../core/constants.js?v=20260921j';

function _loadNotices() {
  try {
    // 2026-08-08 归档闭环：统一归一化 archived 字段（旧数据缺省视为未归档）
    return (mockDB.notices || []).map(n => ({ ...n, archived: n.archived === true }));
  } catch (e) {
    console.warn('[NoticeStore] 加载失败：', e);
    return [];
  }
}

function _saveNotices(notices) {
  try {
    mockDB.notices = [...notices];
    bumpToken('notice'); // P0：通知写口统一 bump（发布/编辑/删除/归档/标记已读）
    persist();
  } catch (e) {
    console.warn('[NoticeStore] 保存失败：', e);
  }
}

// ════════════════════════════════════════════════════════════════
//  S1（2026-09-12）：通知 id 兜底重建——通知类待办未持久化到 NoticeStore 时，
//  按 id（noticeId / sourceId / todo.id）从待办现算重建一条只读通知，
//  使 notice.html?id=<id> 对任一入口都取得到正文（不新增第二份存储）。
// ════════════════════════════════════════════════════════════════

/** 待办 → 通知视图对象（正文重建；read=待办已办结） */
function _noticeFromTodo(todo, id) {
  if (!todo) return null;
  return {
    id,
    title: todo.title || '通知',
    content: todo.description || '',
    priority: todo.priority || 'normal',
    publishDate: String(todo.createdAt || '').slice(0, 10) || null,
    expireDate: todo.deadline || null,
    read: todo.status === TodoStatus.COMPLETED,
    targetModule: (todo.actionData && todo.actionData.targetModule) || null,
    derivedFromTodo: true, // 标记：正文由待办重建（确认读取=销对应待办）
  };
}

// ════════════════════════════════════════════════════════════════
//  受众判定单一源（Q-22-1，2026-09-13）
//  发布侧写入 NOTICE_AUDIENCE_SENTINELS（core/constants.js）的 sentinel 值，
//  消费端可见性判定（list() 受众门 / canReadNotice() 详情页读取权限）必须走这里，
//  杜绝「发布侧写 sentinel / 消费端比角色键」的口径分裂（`['all']` 永不命中 → 无人可见）。
// ════════════════════════════════════════════════════════════════

/**
 * 观看者上下文（list() 与 canReadNotice 共用）：角色 / 到人 personId / 发展阶段
 * 发展阶段从人员档案取（勿新增重依赖；getPersonById 已是本模块既有依赖）。
 * @param {{ role?:string, personId?:string }|null} user
 * @returns {{ role:string|null, personId:string|null, developStage:string|null }}
 */
function _noticeViewerCtx(user) {
  if (!user) return { role: null, personId: null, developStage: null };
  const personId = user.personId || null;
  return {
    role: user.role || null,
    personId,
    developStage: personId ? (getPersonById(personId)?.developStage || null) : null,
  };
}

/**
 * audience 数组命中判定（sentinel 单一源 + 裸角色键兼容）
 *  - sentinel broadcast（all）→ 恒命中（全员可见）
 *  - sentinel roles 含当前角色 / developStages 含当前发展阶段 → 命中
 *  - 未登记裸值 → 回退角色键直比（兼容 audience: ['org-commissioner'] 等既有写法）
 * @param {Object} n 通知
 * @param {{ role:string|null, developStage:string|null }} ctx
 * @returns {boolean}
 */
function _audienceHit(n, ctx) {
  if (!Array.isArray(n.audience) || !n.audience.length) return false;
  // 裸角色键兼容（含既有 audience: ['org-commissioner'] 等写法；sentinel 值不会与真实角色键冲突）
  if (ctx.role && n.audience.includes(ctx.role)) return true;
  return n.audience.some((s) => {
    const def = NOTICE_AUDIENCE_SENTINELS[s];
    if (!def) return false;
    if (def.broadcast) return true;
    if (Array.isArray(def.roles) && ctx.role && def.roles.includes(ctx.role)) return true;
    if (Array.isArray(def.developStages) && ctx.developStage && def.developStages.includes(ctx.developStage)) return true;
    return false;
  });
}

/** audiencePersons 到人定向命中（既有口径，不改） */
function _audiencePersonsHit(n, ctx) {
  return !!(ctx.personId && Array.isArray(n.audiencePersons) && n.audiencePersons.includes(ctx.personId));
}

/** actionRoles 行动角色命中（既有口径，不改） */
function _audienceActionRolesHit(n, ctx) {
  return !!(ctx.role && Array.isArray(n.actionRoles) && n.actionRoles.includes(ctx.role));
}

/**
 * 该通知是否「有受众」（四类受众源任一非空）。
 * sentinel 值（含 audience 为裸字符串 sentinel 的历史写法）也视为有受众——
 * 但 broadcast sentinel（all）语义是广播，仍对所有人可见（见 _isBroadcastAudience）。
 */
function _hasAudience(n) {
  return (Array.isArray(n.audience) && n.audience.length > 0)
    || n.audience === 'committee'
    || !!NOTICE_AUDIENCE_SENTINELS[n.audience]
    || (Array.isArray(n.audiencePersons) && n.audiencePersons.length > 0)
    || (Array.isArray(n.actionRoles) && n.actionRoles.length > 0);
}

/** audience 是否含广播 sentinel（all）→ 全员可见（含无登录会话） */
function _isBroadcastAudience(n) {
  const a = n.audience;
  if (!a) return false;
  const list = Array.isArray(a) ? a : [a];
  return list.some((s) => NOTICE_AUDIENCE_SENTINELS[s] && NOTICE_AUDIENCE_SENTINELS[s].broadcast === true);
}

/** 观看者是否该通知的发布者（签发人恒可读自己的通知） */
function _isPublisher(n, ctx) {
  if (!ctx || !ctx.role) return false;
  // UI 发布口径：publishedBy 存角色标签（ROLE_LABELS[角色]），无 personId；按其比对
  if (n.publishedBy && ROLE_LABELS[ctx.role] && n.publishedBy === ROLE_LABELS[ctx.role]) return true;
  // 显式签发人 id（数据若带则优先）
  return !!(ctx.personId && (n.publisherId === ctx.personId || n.createdBy === ctx.personId));
}

// ════════════════════════════════════════════════════════════════
//  §D4 权限控制 — 通知发布/编辑/删除必须对接到角色白名单
// ════════════════════════════════════════════════════════════════

// dogfood 权限专项 2026-09-13：改引 constants.js 单一源（NOTICE_PUBLISH_ROLES / NOTICE_MANAGE_ROLES）——
// server routes/resources.js 的 notices 写门同源，杜绝「前端放行、后端全开」的前后端不一致。
const MANAGE_NOTICE_ROLES = new Set(NOTICE_MANAGE_ROLES);
const PUBLISH_NOTICE_ROLES = new Set(NOTICE_PUBLISH_ROLES);

export const NoticePermission = {
  /**
   * 发布权（2026-09-19 批次 91 · SOP-B-17 / `D-308` · `D-309`）：
   *   ① 角色白名单（支书 / 副支书 / 组织委员 / 宣传委员）——全支部通知与治理通知；
   *   ② **本组通知**：此人**被指定为某场活动的组织者**（按活动身份，不是角色）⇒ 该场的发布口就在他台上。
   *      指定即赋权、解除即收回（判据单一源 = `services/activity.js::getOrganizedActivities`）。
   * @param {string} role 常设角色键
   * @param {string} [personId] 当前人（缺省＝只按角色白名单判定，保持既有调用点行为）
   */
  canPublish(role, personId) {
    if (PUBLISH_NOTICE_ROLES.has(role)) return true;
    return getOrganizedActivities(personId).length > 0;
  },

  canManage(role) {
    return MANAGE_NOTICE_ROLES.has(role);
  },

  check(role, action = 'read', personId = null) {
    if (action === 'publish' || action === 'add') return this.canPublish(role, personId);
    if (action === 'edit' || action === 'update' || action === 'remove') return this.canManage(role);
    return true; // read — 全员可读
  },
};

export const NoticeStore = {
  _notices: [],

  init() {
    const persisted = _loadNotices();
    if (persisted.length > 0) {
      this._notices = persisted;
    } else if (isInitStateActive()) {
      // C2 修复（2026-09-08）：init 态下「无持久化通知 = 合法空支部态」——不兜底演示种子
      //（否则 MOCK_NOTICES 会经 _saveNotices 重新写回 mockDB/持久层，通知在 init 后回填 demo）。
      this._notices = [];
    } else {
      this._notices = [...MOCK_NOTICES];
      // 2026-08-08 归档闭环修复：mockDB 未加载（_loaded=false）时不得落库，
      // 否则会用 seed 原版覆盖 localStorage 中的运行时字段（如 archived），
      // 且过早落库可能写入不完整数据。loadDB 完成后读取统一走 _current()。
      if (mockDB._loaded) {
        _saveNotices(this._notices);
      }
    }
  },

  /**
   * 当前数据源（2026-08-08 归档闭环修复）：
   * 优先取 mockDB.notices（loadDB / seed 增量合并后的权威数据），
   * 兜底 _notices（mockDB 未加载或全空时的内存态）。
   * 修复早期 init（header 渲染先于 loadDB）导致 _notices 滞留 seed 原版、
   * archived 等运行时字段丢失的问题。
   */
  _current() {
    if (mockDB.notices && mockDB.notices.length > 0) {
      return mockDB.notices;
    }
    return this._notices;
  },

  /** 写操作前置对齐：以 mockDB.notices 为准刷新 _notices，避免基于旧内存态写回覆盖运行时字段 */
  _syncWithStore() {
    this._notices = [...this._current()];
  },

  list(filter = {}) {
    // 确保 _notices 已初始化（与 getAll() 一致，避免 list 在 init 前被调用返回空）
    if (this._notices.length === 0) {
      this.init();
    }
    let result = [...this._current()];

    // 2026-08-08 归档闭环：默认排除已归档通知（随活动/专班归档退出工作区）
    if (filter.includeArchived !== true) {
      result = result.filter(n => !n.archived);
    }

    // ── 受众门（2026-09-13 彻查批次：消费端统一过滤）─────────────────────────────
    // 背景（用户实报）：「支书的界面为什么会出现支书的催办？」根因＝消费端（铃铛/首页未读/角标/待办未读条）
    //   从未按受众过滤——签发人自己下发的催办又回到自己的未读里；且通知发布页所选受众（audience 数组）
    //   从未生效（选「党小组组长」实际全员可见）。
    // 规则：① audience==='committee' → 仅本支部支委层（党委下发通道，既有）
    //       ② audience 为 sentinel 数组（发布侧写入「全体党员/党小组组长/入党积极分子/发展对象」）→
    //          经 NOTICE_AUDIENCE_SENTINELS 单一源判定（广播 sentinel 全员可见；roles/developStages 命中即可见）；
    //          未登记裸值回退角色键直比（兼容既有 audience:['org-commissioner'] 等写法）——Q-22-1 修正
    //       ③ audiencePersons 为 personId 数组 → 按人定向（2026-09-13 补：分工调整「信息自动传递」
    //          需把通知直接送到**到人负责人**，角色数组表达不了）
    //       ④ actionRoles 非空（行动性通知：催办/提醒/表决进度/分工履职等）→ 仅目标角色可见
    //       ⚠ 同一通知可**并存多种受众**（如「committee + audiencePersons + actionRoles」），
    //          命中任一即可见——原实现按 if/return 短路，committee 会吞掉其余受众。
    //       ⑤ 无受众/无 actionRoles → 全员可见（如活动通知广播）
    // 注：无登录会话（node 单测/匿名）时不收窄，保持既有行为。
    {
      const _me = AuthStore.getCurrentUser();
      const _role = _me && _me.role;
      const _isComm = !!_role && BRANCH_COMMISSION_ROLES.includes(_role);
      const _myBranch = _me ? (getPersonById(_me.personId)?.branchId || 'br-b1') : null;
      // 受众命中走单一源（Q-22-1）：sentinel 经 NOTICE_AUDIENCE_SENTINELS 判定，裸角色键回退直比
      const _ctx = _noticeViewerCtx(_me);
      const _hitPersons = (n) => _audiencePersonsHit(n, _ctx);
      const _hitRoles = (n) => _audienceHit(n, _ctx);
      const _hitActions = (n) => _audienceActionRolesHit(n, _ctx);
      result = result.filter((n) => {
        if (!_hasAudience(n)) return true;   // 广播
        if (!_role) return true;         // 无会话：不按受众收窄（保持既有行为）
        if (n.audience === 'committee' && _isComm && !!_myBranch && (n.branchId || 'br-b1') === _myBranch) return true;
        if (_hitPersons(n) || _hitRoles(n) || _hitActions(n)) return true;
        return false;
      });
    }

    if (filter.activeOnly !== false) {
      const now = new Date().toISOString().slice(0, 10);
      result = result.filter(n => !n.expireDate || n.expireDate >= now);
    }

    // 支书裁决（2026-08-05）：「未读的重要；无论已读未读的紧急」
    // 展示层保留策略：紧急通知全部保留展示，重要通知仅展示未读的（已读重要通知收起）。
    // 角标未读统计不走此过滤（仍统计全部未读），仅在列表展示处传 retention:'visible'。
    if (filter.retention === 'visible') {
      result = result.filter(n => n.priority === 'urgent' || !n.read);
    }

    if (filter.sortBy === 'date') {
      result.sort((a, b) => b.publishDate.localeCompare(a.publishDate));
    } else {
      const priorityOrder = { urgent: 0, normal: 1 };
      result.sort((a, b) => (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1));
    }

    if (typeof filter.limit === 'number') {
      result = result.slice(0, filter.limit);
    }

    return result;
  },

  add(notice, actorRole = null, actorPersonId = null) {
    if (actorRole && !NoticePermission.check(actorRole, 'add', actorPersonId)) {
      console.warn(`[NoticeStore] 权限不足：角色 ${actorRole}（${actorPersonId || '未带 personId'}）无权发布通知`);
      return null;
    }
    // 人工发布路径（通知发布表单等）必传 actorRole，仍受白名单约束；
    // 2026-09-19 批次 91（SOP-B-17）：本组通知另按「此人是否该场组织者」放行（见 NoticePermission.canPublish）。
    // R-22（2026-09-13）：原「不传 actorRole 即打标 systemDerived」已随旧通道关闭而移除——
    //   系统派生通知改由 addSystem() 走服务端生成（POST /api/v1/system-notices）。
    const newNotice = {
      ...notice,
      id: notice.id || generateId('notice', '-'),
      publishDate: notice.publishDate || new Date().toISOString().slice(0, 10),
    };
    this._syncWithStore();
    this._notices = [...this._notices, newNotice];
    _saveNotices(this._notices);
    // 行动性通知自动派生对应角色待办（最小三成本原则·阶段1C-2）
    try {
      NoticeTodoDeriver.deriveFromNotice(newNotice);
    } catch (e) {
      console.warn('[NoticeStore] 派生待办失败：', e);
    }
    return newNotice;
  },

  /**
   * 系统派生通知统一入口（R-22，2026-09-13）
   * 业务流程副作用（成员提交思想汇报、纪检确认考勤、赋权/表决进度、发起活动、专班/分工变更、
   * 党委下发等）不再由前端自述可信标记，而是：
   *   · mock 模式（无 API 会话）：复用与应用同一模板的本地 add()，演示/离线不受影响；
   *   · API 模式：POST /api/v1/system-notices，由服务端按 kind 注册表复算授权并生成文案/落点。
   * 失败时 console.warn 明确原因，不静默吞掉。
   * @param {string} kind 注册表 kind（见 docs/src/core/system-notice-templates.js）
   * @param {string|null} sourceId 业务对象 id（服务端据此复算授权与落点）
   * @param {Object} [payload] 动态展示值（标题/正文/名称/计数等；不影响服务端安全判定）
   * @returns {Promise<Object|null>|Object|null} 新通知（失败返回 null）
   */
  addSystem(kind, sourceId = null, payload = {}) {
    const vars = { ...(payload || {}), sourceId };
    // ① 本地镜像（**同步**，批 17 回归修复）：多个界面读的是本地存储（下发历史、铃铛本地快照、
    //   以及「行动性通知 → 派生待办」），若只等服务端回包再并入，会出现「已提示下发成功但列表里没有」
    //   ——实测 party-committee-dispatch / online-committee 两用例因此失败。故先本地生成（与应用同一
    //   模板 system-notice-templates.js），再由服务端做权威复算与落库。
    let mirror = null;
    let built = null;
    try {
      built = buildSystemNotice(kind, vars);
    } catch (e) {
      console.warn(`[NoticeStore] 系统派生通知本地镜像失败（${kind}）：`, e);
    }
    // mock 模式（演示/离线）：无 API 会话 → 本地即权威（含"行动性通知→派生待办"，与既有行为一致）
    if (getDataSource() !== 'api' || !getAuthToken()) {
      return built ? this.add(built) : null;
    }
    // API 模式：仅做「可见性镜像」——**不在此派生待办**（成功后统一由服务端记录派生，避免同一通知派生两份待办）
    if (built) {
      mirror = {
        ...built,
        id: built.id || generateId('notice', '-'),
        publishDate: built.publishDate || new Date().toISOString().slice(0, 10),
      };
      this._syncWithStore();
      this._notices = [...this._notices, mirror];
      mockDB.notices = [...(mockDB.notices || []), mirror];
      _saveNotices(this._notices);
      bumpToken('notice');
    }
    // ② API 模式：服务端为权威（按 kind 复算授权、生成落点），失败则回收本地镜像
    return fetch(`${getApiBaseUrl()}/api/v1/system-notices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAuthToken()}` },
      body: JSON.stringify({ kind, sourceId, payload: payload || {} }),
    }).then(async (r) => {
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        console.warn(`[NoticeStore] 系统派生通知发送失败（${kind}，HTTP ${r.status}）：${body.error || r.statusText}`);
        // 授权被拒/参数非法 → 回收本地镜像，避免留下"幻影通知"
        if (mirror) this._dropLocalNotice(mirror.id);
        return null;
      }
      const notice = await r.json();
      // ③ 以服务端记录替换本地镜像（同一逻辑通知只保留一条，避免列表重复）
      if (notice && notice.id) {
        if (mirror) this._dropLocalNotice(mirror.id);
        this._syncWithStore();
        if (!this._notices.some((n) => n.id === notice.id)) {
          this._notices = [...this._notices, notice];
          mockDB.notices = [...(mockDB.notices || []), notice];
          bumpToken('notice');
        }
        // 行动性通知本地派生对应角色待办（与 add() 一致；服务端仅存通知本身）
        try {
          NoticeTodoDeriver.deriveFromNotice(notice);
        } catch (e) {
          console.warn('[NoticeStore] 派生待办失败：', e);
        }
      }
      return notice;
    }).catch((e) => {
      console.warn(`[NoticeStore] 系统派生通知发送失败（${kind}）：`, e);
      if (mirror) this._dropLocalNotice(mirror.id);
      return null;
    });
  },

  /**
   * 回收本地镜像通知（仅本地存储；服务端未落库或已被服务端记录替换时调用）。
   * 注：派生的待办不做回收（错误路径极罕见，且回收待办涉及跨域写；已由 console.warn 明确留痕）。
   */
  _dropLocalNotice(id) {
    if (!id) return;
    this._syncWithStore();
    this._notices = this._notices.filter((n) => n.id !== id);
    mockDB.notices = (mockDB.notices || []).filter((n) => n.id !== id);
    _saveNotices(this._notices);
    bumpToken('notice');
  },

  update(id, patch, actorRole = null) {
    if (actorRole && !NoticePermission.check(actorRole, 'update')) {
      console.warn(`[NoticeStore] 权限不足：角色 ${actorRole} 无权编辑通知`);
      return null;
    }
    const idx = this._notices.findIndex(n => n.id === id);
    if (idx === -1) return null;
    const updated = { ...this._notices[idx], ...patch };
    this._notices = [
      ...this._notices.slice(0, idx),
      updated,
      ...this._notices.slice(idx + 1),
    ];
    _saveNotices(this._notices);
    return updated;
  },

  remove(id, actorRole = null) {
    if (actorRole && !NoticePermission.check(actorRole, 'remove')) {
      console.warn(`[NoticeStore] 权限不足：角色 ${actorRole} 无权删除通知`);
      return false;
    }
    this._syncWithStore();
    const prev = this._notices.length;
    this._notices = this._notices.filter(n => n.id !== id);
    if (this._notices.length === prev) return false;
    _saveNotices(this._notices);
    // 通知删除时联动删除关联待办（避免遗留孤儿待办）
    try {
      TodoStore.deleteBySource(TodoSourceType.NOTICE, id);
    } catch (e) {
      console.warn('[NoticeStore] 联动删除待办失败：', e);
    }
    return true;
  },

  getAll({ includeArchived = false } = {}) {
    if (this._notices.length === 0) this.init();
    const src = this._current();
    return includeArchived ? [...src] : [...src].filter(n => !n.archived);
  },

  /**
   * 按 id 取通知（S1 单一取数口，2026-09-12；Q-22-1 2026-09-13 脱离可见性门）：
   * 本函数**只负责「按 id 取数」**——含已归档/过期（不排除 archived，不按 expireDate 收窄）；
   * 未命中 → 从通知类待办按 id / sourceId / actionData.noticeId 现算重建（派生通知未持久化的兜底），
   * 使任一跳转入口（待办/铃铛/首页/通知发布）的 id 都能打开正文。
   * ⚠ 可见性判定**已移交 canReadNotice()**（详情页渲染前调用）——本函数不得再套消费端受众门，
   *   否则签发人/受众都取不到自己的通知（Q-22-1 根因之二：详情页 100% 打不开）。
   * @param {string} id
   * @returns {Object|null}
   */
  getById(id) {
    if (!id) return null;
    if (this._notices.length === 0) this.init(); // 与 list() 一致：确保初始化（_current 取 mockDB 优先、内存兜底）
    const found = this._current().find(n => n.id === id);
    if (found) return found;
    try {
      const all = TodoStore.getAll();
      const todo = all.find(t => t && t.id === id)
        || all.find(t => t && t.sourceType === TodoSourceType.NOTICE && t.sourceId === id)
        || all.find(t => t && t.actionData && t.actionData.noticeId === id);
      return _noticeFromTodo(todo, id);
    } catch (e) {
      console.warn('[NoticeStore] 派生通知重建失败：', e);
      return null;
    }
  },

  /**
   * 归档与来源（活动/专班）绑定的通知（2026-08-08 归档闭环）
   * 活动/专班归档后，其配套通知随之一并归档，退出工作区。
   * @param {'activity'|'taskforce'} targetType
   * @param {string} targetId — activity.id 或 taskforce.id
   * @returns {number} 归档的通知条数
   */
  archiveBySource(targetType, targetId) {
    if (!targetType || !targetId) return 0;
    this._syncWithStore();
    let count = 0;
    this._notices = this._notices.map(n => {
      if (n.archived) return n;
      // targetType/targetId 精确匹配；或活动源通知经 targetUrl 携带 activityId 定位参数（如支书台 inspector 直达）——
      // 2026-09-05 补全：此类通知随活动归档不再成孤儿
      const urlCarriesActivity = targetType === 'activity' && typeof n.targetUrl === 'string'
        && n.targetUrl.includes(`activityId=${targetId}`);
      if ((n.targetType === targetType && n.targetId === targetId) || urlCarriesActivity) {
        count++;
        return { ...n, archived: true, archivedAt: new Date().toISOString().slice(0, 10) };
      }
      return n;
    });
    if (count > 0) _saveNotices(this._notices);
    return count;
  },

  markRead(id) {
    this._syncWithStore();
    const notice = this._notices.find(n => n.id === id);
    if (notice) {
      notice.read = true;
      _saveNotices(this._notices);
    } else {
      // S1：派生通知（未持久化）确认读取 → 直接销对应通知类待办
      try {
        const todo = TodoStore.getById(id);
        if (todo) TodoStore.complete(id);
      } catch (e) { console.warn('[notice] 派生通知销待办失败', e); }
    }
    // 做事即销待办：已读自动完成「通知阅读」待办
    try { TodoStore.completeBySource(TodoSourceType.NOTICE, id); } catch (e) { console.warn('[notice] 销待办失败', e); }
  },

  markAllRead() {
    this._syncWithStore();
    this._notices.forEach(n => { n.read = true; });
    _saveNotices(this._notices);
  },
};

/**
 * 是否可读某条通知（详情页读取权限，单一源，Q-22-1 2026-09-13）
 *
 * 规则：
 *   ① 无受众 / 广播 sentinel（all）→ 人人可读（含无登录会话）；
 *   ② 无登录会话 → 仅广播/无受众可读（上一步已返回）；
 *   ③ 发布者恒可读（签发人不应被自己的定向通知挡在门外）；
 *   ④ 支委层（BRANCH_COMMISSION_ROLES）可读（治理信息）；
 *   ⑤ 命中受众（audience sentinel / 裸角色键 / audiencePersons / actionRoles）可读；
 *   ⑥ 其余不可读。
 * 判定复用 list() 受众门**同一套** sentinel 判定（_audienceHit 等，勿写第二套规则）。
 * 注：本函数与 getById() 分工——getById 只取数、本函数判可见性（详情页渲染前调用）。
 * @param {Object} notice 通知对象
 * @param {{ personId?:string, role?:string }|null} [viewer] 观看者；缺省取当前登录会话
 * @returns {boolean}
 */
export function canReadNotice(notice, viewer) {
  const n = notice;
  if (!n) return false;
  const ctx = _noticeViewerCtx(viewer === undefined ? AuthStore.getCurrentUser() : viewer);
  if (!_hasAudience(n) || _isBroadcastAudience(n)) return true; // ① 无受众 / 广播 → 人人可读
  if (!ctx.role) return false;                                  // ② 无登录会话：仅广播/无受众
  if (_isPublisher(n, ctx)) return true;                        // ③ 发布者恒可读
  if (BRANCH_COMMISSION_ROLES.includes(ctx.role)) return true;  // ④ 支委层可读
  return _audiencePersonsHit(n, ctx)                            // ⑤ 命中受众可读
    || _audienceHit(n, ctx)
    || _audienceActionRolesHit(n, ctx);
}

// ════════════════════════════════════════════════════════════════
//  通知跳转统一解析（业务页直达优先，2026-08-06）
//  全站所有通知跳转入口共用此函数，杜绝多入口逻辑分叉。
// ════════════════════════════════════════════════════════════════

// targetModule → 业务页（角色感知）：模块语义决定业务落点
//  - activity（活动/主题党日）→ 首页活动日历（全员统一活动视图）
//  - attendance（考勤）→ 纪检委员考勤管理 / 支书考勤概况
//  - party（发展党员/考察）→ 组织委员档案与发展党员 / 纪检委员考察管理 / 支书工作台
//  - workspace（工作部署/筹备）→ 支委各归其位 / 组长工作台 / 其余首页
// A①（2026-09-10）：导出供通知生产点复用同一映射计算对象级落点页（不改变下文 resolveNoticeUrl 兜底语义）。
export const NOTICE_MODULE_ROLE_PAGES = {
  activity: {
    '*': 'index.html',
  },
  attendance: {
    'disc-commissioner': 'workspace/disc.html',
    'secretary': 'workspace/secretary.html',
    'deputy-secretary': 'workspace/secretary.html',
    '*': 'index.html',
  },
  party: {
    'org-commissioner': 'workspace/org.html',
    'disc-commissioner': 'workspace/disc.html',
    'secretary': 'workspace/secretary.html',
    'deputy-secretary': 'workspace/secretary.html',
    '*': 'index.html',
  },
  workspace: {
    'secretary': 'workspace/secretary.html',
    'deputy-secretary': 'workspace/secretary.html',
    'org-commissioner': 'workspace/org.html',
    'prop-commissioner': 'workspace/prop.html',
    'disc-commissioner': 'workspace/disc.html',
    'leader': 'workspace/leader.html',
    '*': 'index.html',
  },
};

/**
 * 解析通知跳转目标
 * 规则（业务页直达优先）：
 *   1. 有 targetUrl → 直达目标业务页（系统通知显式指定，如催办/赋权，含 activityId 定位参数）
 *   2. 无 targetUrl → 按 targetModule 映射到与当前角色匹配的业务页
 *   3. 行动性通知（actionRoles）→ 仅目标角色直达业务页，其余仅进详情页
 *   4. 模块映射结果与当前页相同 → 回退通知详情页（避免原地刷新"循环"；显式 targetUrl 不适用此条）
 * @param {Object} n 通知对象
 * @param {string} [currentRole] 当前角色；缺省时读取 AuthStore
 * @returns {{ url: string|null, direct: boolean }} url 为可直接赋给 location.href 的地址（已含 basePath）
 */
export function resolveNoticeUrl(n, currentRole = null) {
  if (!n) return { url: null, direct: false };
  if (!currentRole) {
    try { currentRole = AuthStore.getCurrentUser()?.role || null; } catch (_) { currentRole = null; }
  }
  // 3. 行动性通知受众过滤：仅目标角色可直达业务页
  if (Array.isArray(n.actionRoles) && n.actionRoles.length > 0) {
    if (!currentRole || !n.actionRoles.includes(currentRole)) {
      return { url: null, direct: false };
    }
  }
  // 0. T233 targetType/targetId 显式定位 → 直达详情页（招募/报名类通知，活动/专班分页）
  if (n.targetType && n.targetId) {
    const detailFile = n.targetType === 'taskforce' ? 'taskforce.html' : n.targetType === 'activity' ? 'activity.html' : null;
    if (detailFile) {
      return { url: getBasePath() + `${detailFile}?id=${n.targetId}`, direct: true };
    }
  }
  // 1. targetUrl 直达（显式指定，不做同页回退）
  if (n.targetUrl) {
    return { url: getBasePath() + n.targetUrl, direct: true };
  }
  // 2. targetModule 角色感知映射
  let page = null;
  if (n.targetModule) {
    const roleMap = NOTICE_MODULE_ROLE_PAGES[n.targetModule] || {};
    page = roleMap[currentRole] || roleMap['*'] || null;
  }
  if (!page) return { url: null, direct: false };
  // 4. 模块映射结果与当前页相同 → 回退详情页（避免原地刷新"循环"）
  const currentFile = (window.location.pathname.split('/').pop() || 'index.html').split('?')[0];
  const targetFile = (page.split('/').pop() || '').split('?')[0];
  if (currentFile === targetFile) {
    return { url: null, direct: false };
  }
  return { url: getBasePath() + page, direct: true };
}

/** P3 党委下发来源徽标（红底白字，与支部自发的通知区分；下发=党委→支委层治理通道） */
function committeeSourceChip() {
  return '<span style="display:inline-flex;align-items:center;padding:0 6px;border-radius:9999px;background:#C8102E;color:#fff;font-size:10px;line-height:16px;flex-shrink:0;">党委下发</span>';
}

export function renderNoticeList(containerId, limit = 5) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // 支书规则（2026-08-01）：任何带时间字段的列示一律按时间倒序（最新在前）
  // 支书裁决（2026-08-05）：重要通知仅保留未读，紧急通知无论已读未读均展示
  const notices = NoticeStore.list({ activeOnly: true, limit, sortBy: 'date', retention: 'visible' });

  if (notices.length === 0) {
    container.innerHTML = '<p class="text-sm text-gray-500">暂无通知</p>';
    return;
  }

  const priorityBadge = {
    urgent: badgeHtml('紧急', 'gold'),
    normal: badgeHtml('重要', 'info'),
  };

  container.innerHTML = notices.map(n => `
    <div class="notice-item flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 hover:shadow-sm rounded-lg px-2 -mx-2 transition-all duration-200 group"
         data-target="${n.targetModule || ''}" data-notice-id="${n.id}" data-target-url="${n.targetUrl || ''}"
         title="${n.title} — ${n.content}">
      ${priorityBadge[n.priority] || ''}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5 min-w-0">
          ${n.source === 'committee' ? committeeSourceChip() : ''}
          <p class="text-sm font-medium text-gray-800 truncate group-hover:text-blue-700 transition-colors">${n.title}</p>
        </div>
        <p class="text-xs text-gray-500 mt-0.5 line-clamp-2">${n.content}</p>
      </div>
      <div class="flex items-center gap-1 whitespace-nowrap mt-0.5">
        ${!n.read ? `<button class="notice-confirm-read text-xs text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors" data-notice-id="${n.id}">确认读取</button>` : ''}
        <span class="text-xs text-gray-500">${n.publishDate}</span>
      </div>
    </div>
  `).join('');

  // 绑定确认读取按钮：先弹出完整消息浮窗，浮窗中确认已读
  container.querySelectorAll('.notice-confirm-read').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.noticeId;
      const notice = NoticeStore._notices.find(n => n.id === id);
      if (!notice) return;
      _showNoticePopover(notice, btn);
    });
  });

  // 绑定点击：标记已读 + 统一跳转（resolveNoticeUrl 业务页直达优先）
  container.querySelectorAll('.notice-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.noticeId;
      const notice = NoticeStore._notices.find(n => n.id === id);
      if (id) NoticeStore.markRead(id);
      // 视觉反馈：点击后标题颜色变浅
      item.querySelector('p.text-sm')?.classList.add('text-gray-500');
      const dest = resolveNoticeUrl(notice);
      const finalUrl = dest.direct ? dest.url : `${getBasePath()}notice.html?id=${id}`;
      window.location.href = finalUrl;
    });
  });
}

/**
 * 通知浮窗：展示完整消息内容 + 确认已读按钮
 * 点击"确认读取"时弹出，确认后标记已读并关闭浮窗
 */
function _showNoticePopover(notice, triggerBtn) {
  // 移除已有浮窗
  const existing = document.getElementById('notice-read-popover');
  if (existing) existing.remove();

  const priorityBadge = {
    urgent: badgeHtml('紧急', 'gold'),
    normal: badgeHtml('重要', 'info'),
  };

  const popover = document.createElement('div');
  popover.id = 'notice-read-popover';
  popover.style.cssText = 'position:fixed;z-index:100;background:var(--surface-card);border-radius:12px;box-shadow:0 12px 36px rgba(0,0,0,0.15);border:1px solid var(--neutral-200);padding:16px;width:360px;max-height:80vh;overflow-y:auto;';

  popover.innerHTML = `
    <div class="flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
        <div class="flex items-center gap-2">
          ${priorityBadge[notice.priority] || ''}
          ${notice.source === 'committee' ? committeeSourceChip() : ''}
          <h3 class="font-title-cn text-sm font-semibold text-gray-800">${notice.title}</h3>
        </div>
      <button id="notice-popover-close" class="text-gray-500 hover:text-gray-600 text-sm leading-none">&times;</button>
    </div>
    <div class="text-xs text-gray-500 mb-3">${notice.publishDate || ''}</div>
    <div class="text-sm text-gray-700 leading-relaxed mb-4 whitespace-pre-wrap">${notice.content || '无内容'}</div>
    ${notice.meetingActivityId
      // SOP-B-5（D-293）：会议通知的「能否线上参会」在**详情页**确认时填——浮窗只作指路，
      // 不在此再放一份填写位（同一件事两处填＝两套口径）。
      ? '<div class="text-[11px] text-gray-500 mb-3 leading-5">本次会议可申报<b>能否线上参会</b>——请点通知标题打开详情页，在「确认读取」时填写（线上参会记请假、不计出席、不补课）。</div>'
      : ''}
    <div class="flex justify-end gap-2 pt-2 border-t border-gray-100">
      <button id="notice-popover-cancel" class="text-xs px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">取消</button>
      <button id="notice-popover-confirm" class="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">确认已读</button>
    </div>
  `;

  document.body.appendChild(popover);

  // 定位：在触发按钮附近
  const rect = triggerBtn.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();
  let top = rect.bottom + 8;
  let left = rect.left;
  // 防止溢出视口
  if (top + popoverRect.height > window.innerHeight) top = Math.max(8, rect.top - popoverRect.height - 8);
  if (left + 360 > window.innerWidth) left = Math.max(8, window.innerWidth - 368);
  popover.style.top = top + 'px';
  popover.style.left = left + 'px';

  // 关闭浮窗
  const closePopover = () => popover.remove();

  popover.querySelector('#notice-popover-close')?.addEventListener('click', closePopover);
  popover.querySelector('#notice-popover-cancel')?.addEventListener('click', closePopover);

  // 确认已读
  popover.querySelector('#notice-popover-confirm')?.addEventListener('click', () => {
    NoticeStore.markRead(notice.id);
    // 视觉反馈：列表项标题变浅 + 移除"确认读取"按钮
    const item = triggerBtn.closest('.notice-item');
    if (item) {
      item.querySelector('p.text-sm')?.classList.add('text-gray-500');
      triggerBtn.remove();
    }
    closePopover();
    showToast('success', '已确认读取');
  });

  // 点击外部关闭
  const outsideHandler = (e) => {
    if (!popover.contains(e.target) && !triggerBtn.contains(e.target)) {
      closePopover();
      document.removeEventListener('click', outsideHandler, true);
    }
  };
  setTimeout(() => document.addEventListener('click', outsideHandler, true), 0);

  // ESC 关闭
  const escHandler = (e) => {
    if (e.key === 'Escape') { closePopover(); document.removeEventListener('keydown', escHandler); }
  };
  document.addEventListener('keydown', escHandler);
}

// ════════════════════════════════════════════════════════════════
//  本组通知发布口（2026-09-19 批次 91 · SOP-B-17 / `D-308` · `D-309` · §9k）
//  「组织者是信息流与任务流」——某人被指定为某场活动的组织者，**这场活动的发布口就在他台上**：
//    · 发布权随「被指定」动态获得（见 NoticePermission.canPublish），**不按角色静态加名单**；
//    · 受众＝**本组**（该场承办党小组 / 缺省取组织者所属党小组的成员 ＋ 组织者本人）；
//    · **全支部通知仍归支书**——本口不提供全支部广播，不做支书代发。
//  单一实现，供成员台「活动动态」与组长台「活动管理」两处行内入口共用（勿各自再写一份）。
// ════════════════════════════════════════════════════════════════

/** 该场活动的「本组」人员 id（承办党小组优先，缺省＝组织者所属党小组；恒含组织者本人） */
export function groupAudienceIdsOf(activity, organizerId) {
  const group = activity?.hostGroup
    || (getPersonById(organizerId) || {}).partyGroup
    || '';
  const ids = liveMembers().filter(p => p.partyGroup && p.partyGroup === group).map(p => p.id);
  if (organizerId && !ids.includes(organizerId)) ids.push(organizerId);
  return { group, ids };
}

/**
 * 打开「发布本组通知」浮窗（该场活动的组织者本人可用）
 * @param {{ activity:Object, accentColor?:string, onPublished?:Function }} opts
 * @returns {boolean} 是否打开了浮窗（无权限 / 无活动时返回 false 并给出提示）
 */
export function openGroupNoticeComposer({ activity, accentColor = '#3B82F6', onPublished = null } = {}) {
  const me = AuthStore.getCurrentUser();
  const meId = me?.personId || null;
  if (!activity || !meId) { showToast('error', '无法发布：活动或登录会话缺失'); return false; }
  if (!isActivityOrganizer(meId, activity.id)) {
    showToast('error', '只有本场活动的组织者才能发布本组通知');
    return false;
  }
  const { group, ids } = groupAudienceIdsOf(activity, meId);
  const audienceLabel = group ? `本组（${group}）` : '本组';

  openFormModal({
    id: 'group-notice-compose',
    title: `发布本组通知 · ${activity.title || '未命名活动'}`,
    accentColor,
    submitLabel: '发布',
    fields: [
      { key: 'title', label: '通知标题', required: true, placeholder: '如：本周党小组会时间与地点' },
      { key: 'content', label: '通知内容', required: true, type: 'textarea', placeholder: '写清时间、地点、需要谁做什么' },
    ],
    onSubmit: (values) => {
      const title = (values.title || '').trim();
      const content = (values.content || '').trim();
      if (!title) { showToast('error', '请填写通知标题'); return false; }
      if (!content) { showToast('error', '请填写通知内容'); return false; }
      const created = NoticeStore.add({
        title,
        content,
        priority: 'normal',
        publishDate: new Date().toISOString().slice(0, 10),
        expireDate: null,
        targetModule: 'activity',
        targetType: 'activity',
        targetId: activity.id,
        targetUrl: `activity.html?id=${encodeURIComponent(activity.id)}`,
        read: false,
        audience: [],
        audiencePersons: ids,
        audienceLabel: `${audienceLabel} · 组织者发布`,
        publishedBy: ROLE_LABELS[me.role] || me.role || '',
        publisherId: meId,
        createdBy: meId,
        source: 'activity-group',
      }, me.role, meId);
      if (!created) { showToast('error', '发布失败：无发布权限'); return false; }
      showToast('success', `已发布本组通知（${audienceLabel} ${ids.length} 人可见）`);
      if (typeof onPublished === 'function') onPublished(created);
      return true;
    },
  });
  return true;
}
