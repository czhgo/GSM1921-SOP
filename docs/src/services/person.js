// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  person.js — 人员数据服务层
//  T-142 Phase 2C：人员数据抽象，遵循写穿透缓存模式
//
//  设计原则：
//  1. 读操作：同步访问 mockDB.users（缓存）
//  2. 写操作：通过 DataAdapter 路由（未来接入后端）
//  3. 接口兼容：提供 getById/getName/getAll 等同步方法
//
//  立项⑥ A波（2026-09-06）——成员数据「网页化 + 双形态持久」底座：
//  · 成员档案数据源保持现状链（基底 = mock/people.js 静态 PEOPLE 种子），
//    另叠加「members 持久覆盖层」（localStorage 键 gsm1921-members-overlay，
//    gsm1921- 前缀 → ?reset=demo 档自动清除 = 回种子），与 org-base-data-preview
//    运行时预览（gsm1921-base-data-preview）分域共存：
//      静态种子 → members 持久覆盖层（增/改/删成员）→ 预览 override（五项基础字段临时看效果）
//  · 写口（saveMember/removeMember/replaceBranchMembers）双形态：
//      mock 形态 → 写 members 覆盖层（PersonStore 读链即时吃到；刷新仍持久）；
//      api 形态 → 写 server users 表（ApiAdapter.users create/update/delete，
//      服务器 users = PEOPLE 种子同源的成员档案表）。
//    读侧在 api 形态保持现状（服务器权威读回归 C 波数据域归一）。
//  · removeMember 引用守卫（双形态同规则）：命中任一业务域引用 → {ok:false, reason:'引用未清'}，
//    仅空引用可删；replaceBranchMembers 允许仅当目标支部业务域空（防孤儿）。
//
//  Source: content/04_web_design/data/DATA_ARCHITECTURE.md
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../core/domain.js?v=20260921p';
// P0 域缓存失效（spec §二.3）：成员覆盖层写口 bump（支书台 semester-remind/成员组等读数新鲜度）
import { bumpToken } from '../core/version-token.js?v=20260921p';
// 修复（T175）：直接从 mock/people.js 导入 PEOPLE，
// 断开 person.js ↔ mock/index.js 双向循环依赖（person.js 不再依赖 mock/index.js）
import { PEOPLE } from '../mock/people.js?v=20260921p';
// 成员基础数据预览叠加（立项④阶段三·目标1）：PersonStore 读取时套预览 override；
// 依赖方向单向（person → preview，preview 不 import person/roster，无循环）
import { overlayPreviewMembers } from './org-base-data-preview.js?v=20260921p';
// 双形态判定（mock/api）：data-adapter.js 为零静态依赖的叶子模块（无环）
import { getDataSource } from '../core/data-adapter.js?v=20260921p';
// 新成员 id 生成（mock 形态；'p_' + uuid，与种子 p1~p50/p_pc 不冲突）
import { generateId } from '../core/id.js?v=20260921p';

// ════════════════════════════════════════════════════════════════
//  PersonStore — 人员数据统一服务接口
// ════════════════════════════════════════════════════════════════

export const PersonStore = {
  /**
   * 按 ID 获取人员信息
   * @param {string} id - 人员 ID（如 'p1', 'p10'）
   * @returns {Object|null} 人员对象（含 id/name/studentId/partyGroup/developStage/role）
   */
  getById(id) {
    if (!id) return null;
    const users = this.getAll();
    return users.find(p => p.id === id) || null;
  },

  /**
   * 按 ID 获取人员姓名
   * @param {string} id - 人员 ID
   * @returns {string} 人员姓名（档案查无 → 已移出/转出记录索引查名，保证历史不匿名；
   *                   仍找不到则回退返回 ID 本身——既有未知文案）
   */
  getName(id) {
    const person = this.getById(id);
    if (person) return person.name;
    const removed = findRemovedRecord(id);
    if (removed && removed.name) return removed.name;
    return id;
  },

  /**
   * 支部成员名单（2026-09-03 数据域接线收口：UI 原直连 mock PEOPLE 改为经本服务获取）
   * 语义 = 成员档案（基底静态党员种子 PEOPLE，mock 形态再叠加 members 持久覆盖层：
   *   新增/字段覆盖/删除标记；成员选择/名单遍历用；不含登录系统账号 mockDB.users——见 getAll 注释）
   * 读取时叠加「成员基础数据预览」（name/partyGroup/developStage/residenceStatus/residenceNote，
   *   见 org-base-data-preview.js；未应用预览时 = 档案原值）
   * api 形态读侧保持现状链（基底 PEOPLE；服务器权威读回归 C 波数据域归一）
   * @returns {Array} 成员数组
   */
  getMembers() {
    return overlayPreviewMembers(_baseMemberRecords());
  },

  /**
   * 获取全部人员列表
   * @returns {Array} 人员数组
   */
  getAll() {
    // 修复（T175）：合并静态学生人员（PEOPLE，p1~p27）与系统账号（mockDB.users，u_*）。
    // 此前仅返回 mockDB.users（8 条系统账号），导致学生 ID（p1/p12/p13 等）
    // 解析不到姓名，页面显示"发起: p12"而非真实姓名。
    const map = new Map();
    [...overlayPreviewMembers(_baseMemberRecords()), ...(mockDB.users || [])].forEach(p => {
      if (p && p.id) map.set(p.id, p);
    });
    return Array.from(map.values());
  },

  // ── 立项⑥ A波：成员档案写口（mock 形态 → members 覆盖层；api 形态 → server users）──

  /**
   * 保存/新增成员（双形态）：已有 id → 字段级合并更新；新 id / 缺 id → 新增。
   *  - mock 形态：写入 members 持久覆盖层（localStorage 键 gsm1921-members-overlay，
   *    getMembers/getAll 读链即时生效；?reset=demo 清除该键 = 回种子）。
   *    若该成员此前被 removeMember 删除 → save 即复活（移除删除标记再 upsert）。
   *  - api 形态：写 server users 表（已存在 → PATCH 更新；不存在 → POST 创建）。
   * @param {Object} updates - 成员记录/局部补丁（含 id 时按 id 定位；name 新增必填）
   * @param {Object} [opts]
   * @param {string} [opts.by] - 操作人（审计预留；不写入成员档案字段）
   * @param {boolean} [opts.residenceMirror] - api 形态：在册状态镜像写入走支书/副支书语义端点
   *   （POST /members/:id/residence-status，成员变更确认链支书确认生效调用点；缺省 false → 走组织委员名册档案端点）
   * @param {boolean} [opts.restoreFromTransferOut] - api 形态：撤销流出时先清 server 侧 `transferOut` 软标记
   *   （POST /members/:id/undo-transfer-out，成员流动台账撤销调用点）；不清则该行仍被 /login 与 listUsers 读链排除，
   *   成员实际回不来。mock 形态忽略此选项（save 即复活，removedIds 自动清除）。缺省 false。
   * @param {boolean} [opts.memberFlowIntake] - api 形态：新增走成员流动「流入登记」语义端点
   *   （POST /members/intake，写门＝组织委员 + 支书/副支书）；缺省 false → 走名册新增端点
   *   （POST /members，R-10 组织委员专属）。2026-09-14 批次 30 裁定 Q-23-10。
   * @returns {Promise<{ok:boolean, member?:Object, reason?:string}>}
   */
  async saveMember(updates, opts = {}) {
    if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
      return { ok: false, reason: '成员数据须为对象' };
    }
    if (getDataSource() === 'api') return _apiSaveMember(updates, opts);
    return _mockSaveMember(updates);
  },

  /**
   * 移除成员（双形态同规则）：
   *  - 引用守卫（guardRefs 默认开）：该人在任一业务域被引用（支部现任支书/活动分工/考勤/考察/
   *    专班/报名/表态/思想汇报/复盘/成员变更/支委广播等，见 findMemberRefs）→ {ok:false, reason:'引用未清'}，
   *    仅空引用可删（先清业务引用再删）。
   *  - mock 形态：members 覆盖层标记删除（读链即时剔除；?reset=demo 回种子）；
   *    api 形态：POST server /members/:id/transfer-out 软标记「已转出」（原行保留、不删不匿名，
   *    与 mock 覆盖层 removedIds 记录同语义；R-10 2026-09-11）。
   * @param {string} personId - 成员 id
   * @param {Object} [opts]
   * @param {string} [opts.by] - 操作人（审计预留；mock 形态记入 removedIds.decidedBy）
   * @param {boolean} [opts.guardRefs=true] - 是否执行引用守卫（false = 强制删除，调用方自担孤儿）
   * @param {boolean} [opts.transferOut=false] - 是否按「转出」移除（removedIds 记录带 transferOut 标记，读链可判「已转出」）
   * @returns {Promise<{ok:boolean, id?:string, reason?:string, refs?:Array}>}
   */
  async removeMember(personId, opts = {}) {
    if (!personId) return { ok: false, reason: '缺少成员 id' };
    const guardRefs = opts?.guardRefs !== false;
    // 引用守卫（双形态同规则）：先于删除执行——api 形态以 mockDB 缓存（init 拉取的服务器数据）判定
    if (guardRefs) {
      const refs = findMemberRefs(personId);
      if (refs.length) {
        return {
          ok: false,
          reason: `引用未清：该成员仍被 ${[...new Set(refs.map(r => r.label))].join('、')} 引用，请先解除业务引用`,
          refs,
        };
      }
    }
    if (getDataSource() === 'api') return _apiRemoveMember(personId, opts);
    // mock 形态：存在于当前成员档案（种子 + 覆盖层）才可删
    if (!_baseMemberRecords().some(p => p.id === personId)) {
      return { ok: false, reason: '成员不存在（档案中无该 id）' };
    }
    return _mockRemoveMember(personId, { by: opts.by, transferOut: !!opts.transferOut });
  },

  /**
   * 整支部替换名单（双形态）：目标支部业务域空（无活动/专班/思想汇报/支部文件/任期/上报等历史）
   * 时允许——新名单整体成为该支部成员（旧属该支部成员从档案移除，roster/应到读链经 getMembers 即时变化）。
   * 演示支部 br-b1 有历史 → 默认拒绝（{ok:false, reason}），防孤儿引用。
   *  - mock 形态：members 覆盖层表达（旧该支部成员删除标记 + 新名单 upsert，branchId 强制归属目标支部）；
   *    api 形态：server users 批量（DELETE 旧该支部成员 → POST 新名单）。
   * @param {Array} records - 新名单（每人须 id + name；developStage/partyGroup/role 缺省继承原档案或默认值）
   * @param {Object} opts
   * @param {string} opts.branchId - 目标支部 id（须已存在于 mockDB.branches）
   * @param {string} [opts.by] - 操作人（审计预留）
   * @returns {Promise<{ok:boolean, branchId?:string, count?:number, reason?:string}>}
   */
  async replaceBranchMembers(records, opts = {}) {
    const branchId = opts?.branchId;
    if (!branchId) return { ok: false, reason: '缺少目标支部 branchId' };
    const list = Array.isArray(records) ? records
      : (records && Array.isArray(records.members) ? records.members : null);
    if (!list) return { ok: false, reason: '成员名单缺失（须为数组）' };
    for (const r of list) {
      if (!r || typeof r !== 'object' || Array.isArray(r) || !r.id || !String(r.name ?? '').trim()) {
        return { ok: false, reason: '名单含非法行（每行须 id + 非空 name）' };
      }
    }
    // api 形态：存在性/历史守卫以服务器为权威（_apiReplaceBranchMembers 内部查 branches 表，
    // 历史守卫经 mockDB 缓存——浏览器场景由 init 拉取服务器数据后与 mock 形态同规则）
    if (getDataSource() === 'api') return _apiReplaceBranchMembers(list, branchId);
    // mock 形态：存在性/历史守卫基于 mockDB（本地权威）
    if (!(mockDB.branches || []).some(b => b.id === branchId)) {
      return { ok: false, reason: '目标支部不存在（mockDB.branches 无该实例）' };
    }
    if (_branchHasHistory(branchId)) {
      return { ok: false, reason: '目标支部已有业务历史（活动/专班/思想汇报等），整支部替换名单被拒绝（防孤儿引用）' };
    }
    return _mockReplaceBranchMembers(list, branchId);
  },
};

// ════════════════════════════════════════════════════════════════
//  兼容性导出（逐步迁移后可删除）
// ════════════════════════════════════════════════════════════════

/**
 * @deprecated 请使用 PersonStore.getById()
 */
export function getPersonById(id) {
  return PersonStore.getById(id);
}

/**
 * @deprecated 请使用 PersonStore.getName()
 */
export function getPersonName(id) {
  return PersonStore.getName(id);
}

// PEOPLE 已在第 15 行导入，可在 person.js 内部使用，但不导出

// ════════════════════════════════════════════════════════════════
//  立项⑥ A波：members 持久覆盖层（mock 形态成员档案写/读底座）
//  · 键：gsm1921-members-overlay（gsm1921- 前缀 → ?reset=demo 档 collectResetKeys
//    自动清除 = 回种子；?reset=preview 档不清 = 覆盖层属于演示数据本体，非运行时预览）。
//  · 结构：{ version, upserts:[完整成员记录], removedIds:[string|{id,name,removedAt,decidedBy,transferOut?}] }
//    读 = 静态 PEOPLE 基底 + 覆盖层（removed 过滤 → upsert 覆盖/追加）。
//    removedIds 兼容旧 string 形态（历史数据）与新对象形态（含姓名 → 移出/转出后 getName 仍可解析，
//    历史记录不匿名；transferOut=true 表示按「转出」流程移除）。
//  · 独立于 workflowos_branch_db_v1 全量键：mock-adapter loadDB 不触碰本键，
//    PersonStore 读链（getMembers/getAll）每次读取时动态合并 → 写后即时生效、刷新仍持久。
// ════════════════════════════════════════════════════════════════

/** members 持久覆盖层的 localStorage 键（demo 重置集经 gsm1921- 前缀自动纳入） */
export const MEMBER_OVERLAY_KEY = 'gsm1921-members-overlay';
const MEMBER_OVERLAY_VERSION = 1;

/** 成员档案允许持久化的字段白名单（防 by/ok 等操作噪音写入档案） */
const MEMBER_FIELDS = [
  'id', 'name', 'studentId', 'enrollYear', 'partyGroup', 'developStage', 'role', 'branchId',
  'residenceStatus', 'residenceNote', 'residenceHistory',
];

function _loadMemberOverlay() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(MEMBER_OVERLAY_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object') return null;
    return {
      upserts: Array.isArray(o.upserts) ? o.upserts : [],
      removedIds: Array.isArray(o.removedIds) ? o.removedIds : [],
    };
  } catch (_) { return null; }
}

function _saveMemberOverlay({ upserts, removedIds }) {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(MEMBER_OVERLAY_KEY, JSON.stringify({
      version: MEMBER_OVERLAY_VERSION,
      upserts,
      removedIds,
    }));
    bumpToken('member'); // P0：成员档案覆盖层写口 bump（saveMember/removeMember/replaceBranchMembers 汇聚点）
    return true;
  } catch (_) { return false; }
}

/**
 * 移除标记归一（removedIds 兼容）：项为 string（旧数据）→ 原样；对象 {id,name,…} → id
 * @param {string|{id:string}} x
 * @returns {string}
 */
function _removedIdOf(x) {
  return (x && typeof x === 'object' && !Array.isArray(x)) ? String(x.id) : String(x);
}

/**
 * 在 members 覆盖层 removedIds 中定位某成员的移除/转出记录（旧 string 项 → 仅含 id 的等价对象）
 * @param {string} personId
 * @returns {{id:string, name?:string, removedAt?:string, decidedBy?:string, transferOut?:boolean}|null}
 */
export function findRemovedRecord(personId) {
  if (!personId) return null;
  const ov = _loadMemberOverlay();
  const hit = (ov?.removedIds || []).find(x => _removedIdOf(x) === personId);
  if (hit === undefined) return null;
  if (hit && typeof hit === 'object' && !Array.isArray(hit)) return { ...hit, id: String(hit.id) };
  return { id: String(hit) };
}

/**
 * 合并函数（纯）：基底成员数组 × 覆盖层 → 档案视图（removed 过滤 → upsert 覆盖/追加）
 * @param {Array} base - 静态基底（PEOPLE）
 * @param {{upserts?:Array, removedIds?:Array}|null} overlay - removedIds 兼容 string[]（旧）与对象数组
 * @returns {Array} 新数组（基底顺序 + 新增尾随；不改动入参对象）
 */
export function applyMemberOverlay(base, overlay) {
  const removed = new Set((overlay?.removedIds || []).map(_removedIdOf).filter(Boolean));
  const map = new Map(base.filter(p => p && p.id && !removed.has(p.id)).map(p => [p.id, p]));
  for (const u of (overlay?.upserts) || []) {
    if (!u || !u.id || removed.has(u.id)) continue;
    const prev = map.get(u.id);
    map.set(String(u.id), { ...(prev || { id: u.id }), ...u });
  }
  return Array.from(map.values());
}

/**
 * 当前成员档案视图（mock 形态 = PEOPLE 基底 + 覆盖层；api 形态 = 服务端已同步 users 缓存）。
 * getMembers/getAll 的公共基底；本函数读 localStorage（覆盖层）仅 mock 形态生效。
 *
 * ⚠ **api 分支 2026-09-16 批次 47-S 修正（支书裁定「现在补齐 api 读链」，Q-23-45）**：
 *   原为 `return [...PEOPLE]`（注释自述「api 读侧保持现状（服务器权威读回归 C 波）」）——
 *   而**写侧**早已是服务端权威：`saveMember/removeMember` 在 api 形态走 `/api/v1/members*` 语义端点，
 *   随后 `_syncMockDBUsers()` 把结果同步进 `mockDB.users`（api-adapter 初始化也把
 *   `adapter.users.list()` 灌进同一处）。**读侧却写死静态种子** ⇒ 名册的「新增 / 编辑 / 移出」
 *   在 api 形态下**全部读不出效果**：提示说「已新增成员」、名册人数不变、刷新后依旧不变。
 *   真机坐实（批次 47-S 一次性探针）：服务端 users 表确有新行（`branchId=br-b1`），前端名册仍是 50 人。
 *   **修正口径 = 「服务器权威读」的本义：api 形态读服务端同步缓存，不读静态种子**；
 *   `PEOPLE` 退回它本来的角色——**mock 形态的基底**（`getBaseMemberRecords()` 亦同此语义）。
 * ⚠ 不再保留「api 读缓存为空时回退 PEOPLE」的兜底：**静态种子冒充真相正是本次病灶的成因**，
 *   静默兜底会把「服务端没数据」伪装成「有 51 人」。初始化完成前的渲染由壳层 LOADING→IDLE 闸门负责。
 * @returns {Array} 成员数组（未套 org-base-data-preview 预览）
 */
function _baseMemberRecords() {
  if (getDataSource() === 'api') return Array.isArray(mockDB.users) ? [...mockDB.users] : [];
  return applyMemberOverlay(PEOPLE, _loadMemberOverlay());
}

/**
 * 纯档案视图（不含预览叠加；供 MockAdapter.users.list 与读侧旁路消费）
 * 语义 = server users 表在 mock 形态的对应物（PEOPLE 种子 + members 覆盖层）
 * @returns {Array}
 */
export function getBaseMemberRecords() {
  return applyMemberOverlay(PEOPLE, _loadMemberOverlay());
}

/**
 * ════════════════════════════════════════════════════════════════
 *  liveMembers() — 人员清单「实时视图」常量（2026-09-13 数据一致性专项）
 * ════════════════════════════════════════════════════════════════
 *  病灶（person-consistency 守卫 S1）：全站 15 个模块曾在**模块加载期**写
 *    `const PEOPLE = PersonStore.getMembers();`
 *  ——模块只求值一次，此后成员增删（名册新增/移出/在册变更/发展阶段调整）在该模块内**永久陈旧**。
 *  这是「同一个人的信息对应不上」最隐蔽的一类来源：表里显示的还是旧名单/旧字段。
 *
 *  用法（零调用点改动的根治）：
 *    const PEOPLE = liveMembers();      // ← 实时视图，不是快照
 *    PEOPLE.find(p => p.id === id);     // 每次访问都取最新档案视图
 *
 *  实现：以空数组为壳的 Proxy，任何属性/下标访问都转发到**当次** getMembers() 结果。
 *  只读语义：写入（push/sort/赋值）一律抛错（人员清单不可就地改，写口只有 saveMember/removeMember）。
 * @returns {Array} 实时视图（Array 语义，只读）
 */
export function liveMembers() {
  return new Proxy([], {
    get(_, prop) {
      const list = PersonStore.getMembers();
      const v = list[prop];
      return typeof v === 'function' ? v.bind(list) : v;
    },
    has(_, prop) {
      return prop in PersonStore.getMembers();
    },
    set() {
      throw new Error('liveMembers() 为只读实时视图：人员清单请经 PersonStore.saveMember/removeMember 写入');
    },
    deleteProperty() {
      throw new Error('liveMembers() 为只读实时视图：人员清单请经 PersonStore 写口维护');
    },
  });
}

/** 字段级净化：仅保留成员档案字段白名单 + 强制 id 字符串 */
function _cleanMemberRecord(record) {
  const out = {};
  for (const f of MEMBER_FIELDS) if (record[f] !== undefined) out[f] = record[f];
  if (out.id !== undefined && out.id !== null) out.id = String(out.id);
  return out;
}

/** mock 形态保存（upsert 覆盖层；新 id / 缺 id → 自动生成 p_<uuid>） */
function _mockSaveMember(updates) {
  const view = _baseMemberRecords();
  const rawId = updates.id !== undefined && updates.id !== null && String(updates.id).trim() ? String(updates.id) : null;
  const targetId = rawId || generateId('p');
  const existing = view.find(p => p.id === targetId) || null;
  const base = existing || {
    id: targetId,
    name: '',
    studentId: '',
    partyGroup: '',
    developStage: '',
    role: 'participant',
    branchId: 'br-b1',
  };
  const next = { ...base, ..._cleanMemberRecord({ ...updates, id: targetId }) };
  if (!String(next.name || '').trim()) return { ok: false, reason: '成员姓名不能为空' };
  const ov = _loadMemberOverlay() || { upserts: [], removedIds: [] };
  const idx = ov.upserts.findIndex(u => u.id === targetId);
  const upserts = [...ov.upserts];
  if (idx >= 0) upserts[idx] = { ...next }; else upserts.push({ ...next });
  // save 即复活：清除历史删除标记（removedIds 中移除该 id；string/对象两种形态均兼容）
  const removedIds = ov.removedIds.filter(x => _removedIdOf(x) !== targetId);
  if (!_saveMemberOverlay({ upserts, removedIds })) return { ok: false, reason: '本地存储不可用，未保存' };
  return { ok: true, member: { ...next } };
}

/** mock 形态移除（覆盖层删除标记；removedIds 写对象 {id,name,removedAt,decidedBy,transferOut?}——
 *  name 取自档案，保证移出后历史读链仍可解析姓名（不匿名）；transferOut=true 供读链标「已转出」）
 * @param {string} personId
 * @param {{by?:string, transferOut?:boolean}} [opts]
 */
function _mockRemoveMember(personId, opts = {}) {
  const ov = _loadMemberOverlay() || { upserts: [], removedIds: [] };
  const removedIds = [...ov.removedIds];
  if (!removedIds.some(x => _removedIdOf(x) === personId)) {
    const record = {
      id: personId,
      name: (_baseMemberRecords().find(p => p.id === personId) || {}).name || '',
      removedAt: new Date().toISOString(),
      decidedBy: opts.by || null,
    };
    if (opts.transferOut) record.transferOut = true;
    removedIds.push(record);
  }
  const upserts = ov.upserts.filter(u => u.id !== personId);
  if (!_saveMemberOverlay({ upserts, removedIds })) return { ok: false, reason: '本地存储不可用，未保存' };
  return { ok: true, id: personId };
}

/**
 * 引用守卫核心集：该人在业务域的引用清单（双形态同规则；api 形态经 mockDB 缓存同函数判定）。
 * 域 = 既有 mockDB/持久链集合：支部现任支书 / 活动分工（内嵌 assignments）/ 分工记录 /
 * 考勤 / 考察 / 专班成员 / 报名 / 支委会表态 / 思想汇报 / 活动·专班复盘 / 成员变更申请 / 支委广播。
 * @param {string} personId
 * @returns {Array<{domain:string, id:string, label:string}>} 空数组 = 无引用（可删）
 */
export function findMemberRefs(personId) {
  if (!personId) return [];
  const refs = [];
  const hit = (domain, id, label) => refs.push({ domain, id, label });
  // 支部现任支书（branches.secretaryId）
  for (const b of mockDB.branches || []) {
    if (b.secretaryId === personId) hit('branches', b.id, '支部现任支书');
  }
  // 活动内嵌分工（activities.assignments[].personId，含 organizer/deep/participant）
  for (const a of mockDB.activities || []) {
    for (const x of a.assignments || []) {
      if (x && x.personId === personId) hit('activities', a.id, '活动分工');
    }
  }
  // 分工记录（assignments[].assigneeId）
  for (const x of mockDB.assignments || []) {
    if (x.assigneeId === personId) hit('assignments', x.id, '活动分工');
  }
  // 考勤（attendances[].personId）
  for (const r of mockDB.attendances || []) {
    if (r.personId === personId) hit('attendances', r.id, '考勤记录');
  }
  // 考察（inspections[].personId）
  for (const r of mockDB.inspections || []) {
    if (r.personId === personId) hit('inspections', r.id, '考察记录');
  }
  // 专班成员（taskforces[].members[].personId）
  for (const t of mockDB.taskforces || []) {
    for (const m of t.members || []) {
      if (m && m.personId === personId) hit('taskforces', t.id, '专班成员');
    }
  }
  // 报名（signups[].personId）
  for (const s of mockDB.signups || []) {
    if (s.personId === personId) hit('signups', s.id, '报名记录');
  }
  // 支委会表态（agendaVotes[].personId）
  for (const v of mockDB.agendaVotes || []) {
    if (v.personId === personId) hit('agendaVotes', v.id, '支委会表态');
  }
  // 思想汇报（thoughtReports[].personId）
  for (const t of mockDB.thoughtReports || []) {
    if (t.personId === personId) hit('thoughtReports', t.id, '思想汇报');
  }
  // 复盘（activityReviews/taskforceReviews[].organizerId）
  for (const r of mockDB.activityReviews || []) {
    if (r.organizerId === personId) hit('activityReviews', r.id, '活动复盘');
  }
  for (const r of mockDB.taskforceReviews || []) {
    if (r.organizerId === personId) hit('taskforceReviews', r.id, '专班复盘');
  }
  // 成员变更申请（memberChangeRequests[].personId）
  for (const r of mockDB.memberChangeRequests || []) {
    if (r.personId === personId) hit('memberChangeRequests', r.id, '成员变更申请');
  }
  // 支委广播（committeeBroadcasts[].recipientId）
  for (const b of mockDB.committeeBroadcasts || []) {
    if (b.recipientId === personId) hit('committeeBroadcasts', b.id, '支委广播');
  }
  return refs;
}

/**
 * 支部是否已有业务历史（replaceBranchMembers 前置守卫；缺省归属 br-b1 与 monitor-tab 口径一致）
 * 域 = 活动（含其考勤/考察/报名子记录经 activityId 归属）/ 专班 / 思想汇报 / 支部文件 / 支书任期 / 上报审批
 * @param {string} branchId
 * @returns {boolean} true = 有历史（拒绝整支部替换）
 */
function _branchHasHistory(branchId) {
  const own = (r) => r && (r.branchId || 'br-b1') === branchId;
  if ((mockDB.activities || []).some(own)) return true;
  if ((mockDB.taskforces || []).some(own)) return true;
  if ((mockDB.thoughtReports || []).some(own)) return true;
  if ((mockDB.branchDocs || []).some(own)) return true;
  if ((mockDB.appointmentRecords || []).some(own)) return true;
  if ((mockDB.reviewRequests || []).some(own)) return true;
  return false;
}

/** mock 形态整支部替换（覆盖层表达：旧该支部成员删除标记 + 新名单 upsert；removedIds 写对象含 name） */
function _mockReplaceBranchMembers(records, branchId) {
  const ov = _loadMemberOverlay() || { upserts: [], removedIds: [] };
  const view = applyMemberOverlay(PEOPLE, ov);
  const oldIds = view.filter(p => p.branchId === branchId).map(p => p.id);
  const removedIds = [...ov.removedIds];
  let upserts = ov.upserts.filter(u => !oldIds.includes(u.id));
  for (const id of oldIds) {
    if (!removedIds.some(x => _removedIdOf(x) === id)) {
      removedIds.push({
        id,
        name: (view.find(p => p.id === id) || {}).name || '',
        removedAt: new Date().toISOString(),
        decidedBy: null,
      });
    }
  }
  const baseMap = new Map(view.map(p => [p.id, p]));
  for (const r of records) {
    const rid = String(r.id);
    const base = baseMap.get(rid) || {
      id: rid, name: '', studentId: '', partyGroup: '', developStage: '', role: 'participant', branchId,
    };
    const next = { ...base, ..._cleanMemberRecord({ ...r, id: rid }), branchId };
    const ri = removedIds.findIndex(x => _removedIdOf(x) === rid);
    if (ri >= 0) removedIds.splice(ri, 1); // 入新名单 → 复活（若此前被删）
    const ui = upserts.findIndex(u => u.id === rid);
    if (ui >= 0) upserts[ui] = { ...next }; else upserts.push({ ...next });
  }
  if (!_saveMemberOverlay({ upserts, removedIds })) return { ok: false, reason: '本地存储不可用，未保存' };
  return { ok: true, branchId, count: records.length };
}

// ── api 形态实现（server users 表；ApiAdapter 动态导入防 mock 侧加载面扩大）──

async function _apiAdapterUsers() {
  const { ApiAdapter } = await import('../core/api-adapter.js?v=20260921p');
  return ApiAdapter.users;
}

/** 名册成员变更确认链写口（C-2 方案 B）：支书专属阶段语义端点（ApiAdapter.members.setDevelopStage） */
async function _apiAdapterMembers() {
  const { ApiAdapter } = await import('../core/api-adapter.js?v=20260921p');
  return ApiAdapter.members;
}

function _syncMockDBUsers(upsert, removeId) {
  // 同步本地 mockDB.users 缓存（api 模式由 init 拉取服务器 users；users 不在快照 payload，手动同步安全）
  const users = Array.isArray(mockDB.users) ? [...mockDB.users] : [];
  if (removeId) {
    mockDB.users = users.filter(u => u.id !== removeId);
    return;
  }
  const idx = users.findIndex(u => u.id === upsert.id);
  if (idx >= 0) users[idx] = { ...users[idx], ...upsert };
  else users.push(upsert);
  mockDB.users = users;
}

/** api 形态语义端点字段分组（与 server/routes/member.js 白名单同源，勿各自未同步） */
const API_RESIDENCE_FIELDS = ['residenceStatus', 'residenceNote', 'residenceHistory'];
const API_PROFILE_FIELDS = ['name', 'studentId', 'enrollYear', 'partyGroup'];
const API_CREATE_FIELDS = ['id', 'name', 'studentId', 'enrollYear', 'partyGroup', 'developStage', ...API_RESIDENCE_FIELDS];
const API_GOVERNANCE_FIELDS = ['role', 'branchId'];

/** 取对象中命名字段子集（纯，不改入参） */
function _pick(obj, keys) {
  const out = {};
  for (const k of keys) if (Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
  return out;
}

async function _apiSaveMember(updates, opts = {}) {
  try {
    const users = await _apiAdapterUsers();
    const members = await _apiAdapterMembers();
    const list = await users.list();
    const rawId = updates.id !== undefined && updates.id !== null && String(updates.id).trim() ? String(updates.id) : null;
    const exists = rawId && list.some(u => u.id === rawId);
    const member = _cleanMemberRecord({ ...updates, ...(rawId ? { id: rawId } : {}) });
    // 姓名校验（与 mock 分支口径一致）：新增必填；局部更新未提供 → 不校验/不覆盖（由端点合并保留原值）
    if (member.name === undefined) {
      if (!exists) return { ok: false, reason: '成员姓名不能为空' };
    } else if (!String(member.name).trim()) {
      return { ok: false, reason: '成员姓名不能为空' };
    }
    let saved = null;
    if (exists) {
      const { id, ...patch } = member;
      // R-11（2026-09-14 批次 29，Q-23-5）：撤销流出 = 复活被软标记转出的成员行。
      // server 侧「转出」是软标记（原行保留不删不匿名），故复活无需重建行，但**必须显式清标记**——
      // 仅走 profile/residence 补丁不会清除它，/login 仍按「账号已停用（该成员已流出）」401、
      // listUsers 读链仍过滤该行 → 撤销后成员实际回不来。与 mock 形态「save 即复活」语义对齐。
      if (opts.restoreFromTransferOut) {
        saved = await members.undoTransferOut(id);
      }
      // R-10（2026-09-11 支书裁定）：名册写链分流到语义端点（通用 PATCH /users/:id 仅 party-staff 可写，
      // 组织委员/支书经此会被 403 阻断）。字段分组互斥，逐组按当前字段路由：
      // ① 发展阶段 → 支书/副支书 develop-stage（唯一写位，不得由此改写）
      if (Object.prototype.hasOwnProperty.call(patch, 'developStage')) {
        saved = await members.setDevelopStage(id, patch.developStage);
      }
      // ② 在册相关字段 → 成员变更确认链支书镜像走 residence-status；名册行内维护走 profile（组织委员）
      const residence = _pick(patch, API_RESIDENCE_FIELDS);
      if (Object.keys(residence).length > 0) {
        saved = opts.residenceMirror
          ? await members.setResidenceStatus(id, residence)
          : await members.updateProfile(id, residence);
      }
      // ③ 治理字段（role/branchId）不改路线：仍走通用 users 写口（party-staff 门；任命链依赖，不扩大越权面）
      const gov = _pick(patch, API_GOVERNANCE_FIELDS);
      if (Object.keys(gov).length > 0) saved = await users.update(id, gov);
      // ④ 名册档案属性（姓名/学号/党小组）→ 组织委员专属 profile
      const profile = _pick(patch, API_PROFILE_FIELDS);
      if (Object.keys(profile).length > 0) saved = await members.updateProfile(id, profile);
      // 无字段可写（仅 id）→ 保留既有语义（通用 PATCH 回读行）
      if (!saved) saved = await users.update(id, {});
    } else if (Object.prototype.hasOwnProperty.call(member, 'role') || Object.prototype.hasOwnProperty.call(member, 'branchId')) {
      // 带治理字段的新增仍走通用 users（party-staff 门）；名册 UI 新增不含治理字段 → 语义端点
      saved = await users.create(member);
    } else if (opts.memberFlowIntake) {
      // 2026-09-14 批次 30（支书裁定 Q-23-10）：成员流动「流入登记」走 /members/intake
      // （写门 = 组织委员 + 支书/副支书，§9i）；名册新增仍走 /members（R-10 组织委员专属）。
      saved = await members.intake(_pick(member, API_CREATE_FIELDS));
    } else {
      saved = await members.create(_pick(member, API_CREATE_FIELDS));
    }
    _syncMockDBUsers(saved);
    return { ok: true, member: saved };
  } catch (e) {
    return { ok: false, reason: e?.message || 'server users 写入失败' };
  }
}

async function _apiRemoveMember(personId, opts = {}) {
  try {
    const members = await _apiAdapterMembers();
    // R-10：移出改为软标记「已转出」（原行保留、不删不匿名；与 mock removedIds 记录同语义）
    await members.transferOut(personId, opts?.note ? { note: opts.note } : {});
    _syncMockDBUsers(null, personId); // 服务器保留软标记行；本地缓存剔除 → 读链即时剔除
    return { ok: true, id: personId };
  } catch (e) {
    return { ok: false, reason: e?.message || 'server 成员移出失败' };
  }
}

async function _apiReplaceBranchMembers(records, branchId) {
  try {
    const { ApiAdapter } = await import('../core/api-adapter.js?v=20260921p');
    const users = ApiAdapter.users;
    // 存在性（服务器权威）：branches 表须有该实例
    const branches = await ApiAdapter.branches.list();
    if (!branches.some(b => b.id === branchId)) {
      return { ok: false, reason: '目标支部不存在（server branches 无该实例）' };
    }
    // 历史守卫（mockDB 缓存 = init 拉取的服务器数据；浏览器场景与 mock 形态同规则）
    if (_branchHasHistory(branchId)) {
      return { ok: false, reason: '目标支部已有业务历史（活动/专班/思想汇报等），整支部替换名单被拒绝（防孤儿引用）' };
    }
    const list = await users.list();
    const old = list.filter(u => (u.branchId || 'br-b1') === branchId);
    for (const u of old) {
      if (u.id === 'p_pc') continue; // 党委组织员不属于支部（branchId null）——防御：不误删系统内建
      await users.delete(u.id);
    }
    for (const r of records) {
      const member = _cleanMemberRecord({ ...r, id: String(r.id), branchId });
      await users.create(member);
    }
    // 同步 mockDB.users 缓存（整支部维度：重拉最稳）
    const fresh = await users.list();
    mockDB.users = fresh || [];
    return { ok: true, branchId, count: records.length };
  } catch (e) {
    return { ok: false, reason: e?.message || 'server users 批量替换失败' };
  }
}