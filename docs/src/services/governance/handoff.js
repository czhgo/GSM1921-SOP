// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  handoff.js — 三委数据交接协议（T-304 C2）
//  落地 content/02_institution/COMMISSIONER_DUTY_FRAMEWORK.md §E.2 数据交接协议：
//    纪检→组织 考勤统计 / 纪检→组织 考察记录提交 / 组织→纪检 补课需求回执
//  （组织→纪检 专班名单同步已在纪检考察 tab 落地，不重复建模）
//  后台同步机制（支书强调「信息流最畅通」）：交接生成 → 自动为接收方派生待办；
//  接收方确认 → 待办自动销项 + 状态落库，双向可追溯。
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../../core/domain.js?v=20260928i';
import { persist, getDataSource, getAdapter } from '../../core/data-adapter.js?v=20260928i';
import { bumpToken } from '../../core/version-token.js?v=20260928i'; // P0 域缓存失效（spec §二.3）
import { TodoStore, TodoCategory, TodoActionType, TodoSourceType } from './todo.js?v=20260928i';
import { generateId } from '../../core/id.js?v=20260928i';

// ── 2026-09-23 批次 163（T1）：api 形态补服务端对源 ─────────────────────────
// 病灶：handoffs 有本地落盘（mock-adapter 域清单）却**不在**快照 payload / init 拉取列表 / 服务端资源名映射
//   ⇒ api 形态下 `mockDB.handoffs` 恒为 `[]`，写入只活在当前页内存 + 本地备份，下次 init 被覆盖（刷新即丢）。
// 现分流（两形态并存、互不回归）：
//   · 读：**两形态同源**——读 `mockDB.handoffs` 缓存；api 形态下该缓存由 `init()` 从
//     `GET /api/v1/handoffs` 拉取填充（见 data-adapter.js::_loadAuxCollections）。
//   · 写：mock 形态＝现有本地路径（mockDB + persist，一字未改）；api 形态＝在上述本地写之外
//     **同发语义端点**（`POST /api/v1/handoffs`、`POST /api/v1/handoffs/:id/confirm`）落服务端。
// ⚠ 为什么写口保持**同步签名**（`create` 返回 handoff、`confirm` 返回 boolean）而不改成 async：
//   调用方全是同步用法（`if (HandoffStore.confirm(...)) n += 1`：`entries/tabs/org/todo-tab.js:44`、
//   `components/governance/handoff-inbox.js:81`），改 async 会让判据变成「Promise 恒真」= 假绿。
//   ⇒ 采用「本地乐观写 + 服务端同步（失败仅告警）」：服务端在**下一次 init** 成为权威
//   （写失败不静默——走 console.warn + `persist()` 的待办/快照通道）。
function _isApi() {
  try { return getDataSource() === 'api'; } catch (_) { return false; }
}
function _syncToServer(fn, what) {
  if (!_isApi()) return;
  try {
    const adapter = getAdapter();
    const call = fn(adapter);
    if (call && typeof call.catch === 'function') {
      call.catch((e) => console.warn(`[HandoffStore] api 形态${what}落服务端失败（本地已记，下次 init 以服务端为准）：`, e));
    }
  } catch (e) {
    console.warn(`[HandoffStore] api 形态${what}落服务端失败（本地已记，下次 init 以服务端为准）：`, e);
  }
}

// ── 交接类型元数据（from→to + 展示文案） ──
// IA-C1 Task2：domain 显式打标（handoff-* 键无法从前缀推断，逐型归域——
// 考勤统计归考勤纪律、考察记录提交归考察；spec 三节映射，处理位=接收委员）
// SOP-B-36（`D-429`）：考勤全周期统计的交付对象＝**支委会**（母本「全周期考勤统计交付支委会」），
//   与考察统计**同一条通道口径**（提交至支委会、组织委员接收位）——不再提交宣传备案。
export const HANDOFF_TYPES = {
  'attendance-archival': { from: 'disc-commissioner', to: 'org-commissioner',  label: '考勤统计', domain: 'attendance' },
  'inspection-report':   { from: 'disc-commissioner', to: 'org-commissioner',  label: '考察记录提交', domain: 'inspection' },
  'material-shortage':   { from: 'org-commissioner',  to: 'disc-commissioner', label: '补课需求回执', domain: 'attendance' },
};

export const HANDOFF_ROLE_LABELS = {
  'disc-commissioner': '纪检委员',
  'prop-commissioner': '宣传委员',
  'org-commissioner':  '组织委员',
  'secretary': '支书',
};

function _load() {
  return Array.isArray(mockDB.handoffs) ? mockDB.handoffs : [];
}
function _save(list) {
  mockDB.handoffs = [...list];
  bumpToken('handoff'); // P0：交接写口统一 bump（发起/接收方确认）
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
      id: generateId('ho'),
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
    // T1：api 形态同发服务端语义端点（本地已乐观写入；服务端在下一次 init 成为权威）
    _syncToServer((a) => a.handoffs && typeof a.handoffs.create === 'function' ? a.handoffs.create(handoff) : null, '交接发起');
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
        domain: meta.domain, // IA-C1 Task2：显式业务域（见 HANDOFF_TYPES 注释）
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
    // T1：api 形态同发服务端确认端点（销项状态落库；服务端在下一次 init 成为权威）
    _syncToServer((a) => a.handoffs && typeof a.handoffs.confirm === 'function' ? a.handoffs.confirm(id) : null, '交接确认');
    try {
      TodoStore.completeBySource(TodoSourceType.MANUAL, id);
    } catch (e) {
      console.warn('[HandoffStore] 销待办失败：', e);
    }
    return true;
  },
};
