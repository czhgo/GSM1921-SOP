// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  handoff.js — 三委数据交接协议（T-304 C2）
//  落地 content/02_institution/COMMISSIONER_FRAMEWORK.md §E.2 数据交接协议：
//    纪检→宣传 考勤备案 / 纪检→组织 考察记录提交 / 组织→纪检 补课需求回执
//  （组织→纪检 专班名单同步已在纪检考察 tab 落地，不重复建模）
//  后台同步机制（书记强调「信息流最畅通」）：交接生成 → 自动为接收方派生待办；
//  接收方确认 → 待办自动销项 + 状态落库，双向可追溯。
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../core/domain.js?v=20260901q';
import { persist } from '../core/data-adapter.js?v=20260901q';
import { TodoStore, TodoCategory, TodoActionType, TodoSourceType } from './todo.js?v=20260901q';

// ── 交接类型元数据（from→to + 展示文案） ──
export const HANDOFF_TYPES = {
  'attendance-archival': { from: 'disc-commissioner', to: 'prop-commissioner', label: '考勤备案' },
  'inspection-report':   { from: 'disc-commissioner', to: 'org-commissioner',  label: '考察记录提交' },
  'material-shortage':   { from: 'org-commissioner',  to: 'disc-commissioner', label: '补课需求回执' },
};

export const HANDOFF_ROLE_LABELS = {
  'disc-commissioner': '纪检委员',
  'prop-commissioner': '宣传委员',
  'org-commissioner':  '组织委员',
  'secretary': '党支部书记',
};

function _load() {
  return Array.isArray(mockDB.handoffs) ? mockDB.handoffs : [];
}
function _save(list) {
  mockDB.handoffs = [...list];
  persist();
}

export const HandoffStore = {
  getAll() { return _load(); },

  /** 某角色待确认的交接 */
  listByRole(role) {
    return _load().filter(h => h.to === role && h.status === 'pending');
  },

  /** 某角色待确认交接数（badge） */
  pendingCount(to) {
    return _load().filter(h => h.to === to && h.status === 'pending').length;
  },

  /** 是否存在某类型 + 引用对象的待确认交接（如：本活动考勤已提交待备案） */
  hasPendingFor(type, refId) {
    return _load().some(h => h.type === type && h.refId === refId && h.status === 'pending');
  },

  /**
   * 发起交接（写入 + 自动派生接收方待办）
   * @param {{type:string, refType:string, refLabel:string, refId:string, note?:string}} data
   */
  create({ type, refType, refLabel, refId, note = '' }) {
    const meta = HANDOFF_TYPES[type];
    if (!meta) return null;
    const handoff = {
      id: 'ho_' + Date.now(),
      type,
      from: meta.from,
      to: meta.to,
      refType: refType || '',
      refLabel: refLabel || '',
      refId: refId || '',
      note,
      status: 'pending',
      createdAt: new Date().toISOString(),
      confirmedAt: null,
      confirmedBy: null,
    };
    _save([..._load(), handoff]);
    // 后台同步：交接生成 → 接收方待办 +1（信息流最畅通，接收方工作台直接可见）
    try {
      TodoStore.create({
        title: `数据交接：${meta.label}（${refLabel}）`,
        description: note || `${HANDOFF_ROLE_LABELS[meta.from] || meta.from} → ${HANDOFF_ROLE_LABELS[meta.to] || meta.to}，请确认接收`,
        role: meta.to,
        category: TodoCategory.REVIEW,
        priority: 'normal',
        sourceType: TodoSourceType.MANUAL,
        sourceId: handoff.id,
        actionType: TodoActionType.REVIEW,
        actionKey: `handoff-${type}`,
        actionData: { handoffId: handoff.id },
        flow: `交接：${HANDOFF_ROLE_LABELS[meta.from] || meta.from} → ${HANDOFF_ROLE_LABELS[meta.to] || meta.to}`,
      });
    } catch (e) {
      console.warn('[HandoffStore] 派生待办失败：', e);
    }
    return handoff;
  },

  /** 接收方确认交接（确认 = 销待办 + 状态落库） */
  confirm(id, actorRole) {
    const list = _load();
    const h = list.find(x => x.id === id);
    if (!h || h.status !== 'pending') return false;
    if (h.to !== actorRole) return false;
    h.status = 'done';
    h.confirmedAt = new Date().toISOString();
    h.confirmedBy = actorRole;
    _save(list);
    try {
      TodoStore.completeBySource(TodoSourceType.MANUAL, id);
    } catch (e) {
      console.warn('[HandoffStore] 销待办失败：', e);
    }
    return true;
  },
};
