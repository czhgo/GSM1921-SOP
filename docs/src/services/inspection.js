// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  inspection.js — 考察记录 CRUD 服务
// ════════════════════════════════════════════════════════════════

import { mockDB, SourceType, SOURCE_TYPE_LABELS, PARTICIPATION_LEVEL_LABELS, ParticipationLevel } from '../core/domain.js?v=20260921a';
import { POLICY_DEFAULTS } from '../core/policy-defaults.js?v=20260921a';
import { persist } from '../core/data-adapter.js?v=20260921a';
import { generateId } from '../core/id.js?v=20260921a';
import { bumpToken } from '../core/version-token.js?v=20260921a'; // P0 域缓存失效（spec §二.3）
import { INSPECTION_RECORDS } from '../mock/index.js?v=20260921a';
import { isInitStateActive } from './init-reset.js?v=20260921a'; // C2 修复（2026-09-08）：init 态空态不回退演示种子
import { getPersonById, getPersonName } from './person.js?v=20260921a';
import { TodoStore, TodoSourceType } from './todo.js?v=20260921a';
import { loadActivities } from './activity.js?v=20260921a';

export function loadInspectionRecords() {
  if (mockDB.inspections.length > 0) return [...mockDB.inspections];
  // C2 修复（2026-09-08）：init 态下 mockDB 空 = 合法空支部态，不回退演示种子（同 loadActivities）。
  return isInitStateActive() ? [] : [...INSPECTION_RECORDS];
}

/**
 * 读取活跃活动的考察记录（2026-08-08 归档闭环）
 * 活动类考察随活动归档退出工作区展示；专班类考察（sourceType=taskforce）保留
 * （组织/宣传工作台按专班呈现已完结记录，属既有设计）。
 * ⚠️ 写流程必须使用 loadInspectionRecords 原始版，避免整表写回丢失归档记录。
 */
export function loadActiveInspectionRecords() {
  const activeIds = new Set(loadActivities().filter(a => !a.archived).map(a => a.id));
  return loadInspectionRecords().filter(r =>
    r.sourceType === SourceType.TASKFORCE || activeIds.has(r.activityId)
  );
}

export function saveInspectionRecords(records) {
  mockDB.inspections = [...records];
  bumpToken('inspection'); // P0：考察写口统一 bump（录入/删除/纪检确认等均经本函数落库）
  persist();
}

// ── A1 上传位门禁（2026-09-05 落代码，语义见 SYSTEM_ROLE_PERMISSION §9b/§9f + CF §C.1a 考察管理）──

/**
 * 活动归属党小组（dogfood 权限专项 2026-09-13）
 * 判据与 attendance.js::_activityPartyGroup 同（勿各自改口径）：优先 hostGroup，缺省回退组织者所属小组。
 */
function _activityPartyGroup(activity) {
  if (!activity) return null;
  if (activity.hostGroup) return activity.hostGroup;
  const orgId = activity.organizer
    || (Array.isArray(activity.assignments) ? (activity.assignments.find(x => x.role === 'organizer') || {}).personId : null);
  return orgId ? ((getPersonById(orgId) || {}).partyGroup || null) : null;
}

/**
 * 考察上传位门禁
 * - 活动类：上传/修改=该活动组织者（assignments organizer 或顶层 organizer 派生；组长兼组织者同）；
 *   组长非组织者=本组监督位（督促上传，见组长页监督提示）
 * - 专班类：上传=专班实际负责人——身份（指派到人/角色）待支书另裁（§9b 组织委员行注）；
 *   裁决前暂按页面可达放行（组委/组长既有入口保留），recordedBy 记真实操作人
 */
export function canUploadInspection(personId, sourceType, sourceId) {
  if (!personId || !sourceType || !sourceId) return false;
  const role = (getPersonById(personId) || {}).role;
  if (role === 'secretary' || role === 'deputy-secretary') return true; // 支书/副支书例外承担
  if (sourceType === SourceType.TASKFORCE) return true; // 专班负责人位待身份编码，暂放行（见上）
  const activity = loadActivities().find(a => a.id === sourceId);
  if (!activity || activity.archived) return false;
  if (role === 'leader' && activity.type === '党小组会') {
    // 本组上传位（组长手册 §2.1）：仅本组活动（dogfood 权限专项 2026-09-13 补「本组」约束，
    // 此前仅判类型 → 任一组长可对他组小组会提交考察）
    const myGroup = (getPersonById(personId) || {}).partyGroup;
    return !!myGroup && _activityPartyGroup(activity) === myGroup;
  }
  const isOrg = (Array.isArray(activity.assignments) && activity.assignments.some(x => x.personId === personId && x.role === 'organizer'))
    || activity.organizer === personId;
  return !!isOrg;
}

/** 更新考察记录 */
function updateInspectionRecord(id, updates) {
  const records = loadInspectionRecords();
  const idx = records.findIndex(r => r.id === id);
  if (idx !== -1) {
    records[idx] = { ...records[idx], ...updates };
    saveInspectionRecords(records);
  }
}

/** 删除考察记录（仅待确认状态可删） */
export function deleteInspectionRecord(id) {
  const records = loadInspectionRecords();
  const idx = records.findIndex(r => r.id === id && r.status === 'pending');
  if (idx !== -1) {
    records.splice(idx, 1);
    saveInspectionRecords(records);
    return true;
  }
  return false;
}

/** 确认考察记录（纪检委员操作） */
export function confirmInspectionRecord(id) {
  const res = updateInspectionRecord(id, { status: 'confirmed' });
  // 做事即销待办：确认考察 → 销「考察超期/待确认」待办
  try { TodoStore.completeBySource(TodoSourceType.ACTIVITY, `insp_${id}`); } catch (e) { console.warn('[inspection] 销待办失败', e); }
  return res;
}

/**
 * 获取超期未确认的考察记录
 * 超期标准：待确认状态 + 录入时间超过默认天数（默认 7；P3c 单一源 =
 * core/policy-defaults.js inspection.overdueDays，可经 daysThreshold 覆盖，行为与既有调用兼容）
 */
export function getOverdueRecords(daysThreshold = POLICY_DEFAULTS.inspection.overdueDays) {
  const records = loadInspectionRecords();
  const now = Date.now();
  const threshold = daysThreshold * 24 * 60 * 60 * 1000;
  return records.filter(r => {
    if (r.status !== 'pending') return false;
    // 已打回（回退态）不计入「超期」：球已在上传方一侧（同考勤打回口径，批次 119）
    if (r.returnedBy) return false;
    const recordedTime = new Date(r.recordedAt).getTime();
    return (now - recordedTime) > threshold;
  });
}

/**
 * 按来源查询考察记录
 * @param {'activity'|'taskforce'} sourceType
 * @param {string} [sourceId] — activityId 或 sourceName
 */
export function getRecordsBySource(sourceType, sourceId) {
  const records = loadInspectionRecords();
  return records.filter(r => {
    if (r.sourceType !== sourceType) return false;
    if (sourceType === SourceType.ACTIVITY) return r.activityId === sourceId;
    return r.sourceName === sourceId;
  });
}

// ── 展示格式化（2026-09-03 数据域接线批次二：自 mock/inspection.js 原样提升）──
const _personName = (id) => getPersonName(id);
// R-16（2026-09-13）：改从 loadActivities()（mockDB 优先）取（API 模式新建活动的标题此前回退成 id）
const _activityTitle = (id) => loadActivities().find(a => a.id === id)?.title || id;
const _activityType = (id) => loadActivities().find(a => a.id === id)?.type || '未知';

/** 考察记录显示格式（以人为单位聚合展示） */
export function inspectionToDisplay(records) {
  return records.map(r => ({
    id: r.id,
    personId: r.personId,
    personName: _personName(r.personId),
    sourceType: r.sourceType,
    sourceLabel: SOURCE_TYPE_LABELS[r.sourceType] || r.sourceType,
    activityId: r.activityId,
    activityTitle: r.activityId ? _activityTitle(r.activityId) : null,
    sourceName: r.sourceName,
    level: r.level,
    levelLabel: PARTICIPATION_LEVEL_LABELS[r.level] || r.level,
    content: r.content || r.role, // P1-5：content 优先，旧数据以 role 兜底
    role: r.role,
    recordedByName: _personName(r.recordedBy),
    recordedAt: r.recordedAt,
    status: r.status || 'pending',
  }));
}

/**
 * 考察记录长格式（按来源分组展示）
 * SOP-B-43（`D-457`）：**记录人必呈现**——总表与导出都带「记录人」（源头审校的可核凭据）；
 * 「记录时间」按同条裁定**留存、不强调**（数据层已有 `recordedAt`，本格式不透出）。
 */
export function inspectionToLong(records) {
  return records.map(r => ({
    id: r.id,
    name: _personName(r.personId),
    // R-16：透出来源标识（活动 id / 专班名），供台账行补「查看该活动」链接
    activityId: r.activityId || null,
    sourceName: r.sourceName || null,
    source: r.activityId ? _activityTitle(r.activityId) : r.sourceName,
    sourceType: SOURCE_TYPE_LABELS[r.sourceType] || r.sourceType,
    level: PARTICIPATION_LEVEL_LABELS[r.level] || r.level,
    role: r.role,
    content: r.content || r.role, // P1-5：content 优先，旧数据以 role 兜底
    status: r.status,
    recordedByName: r.recordedBy ? _personName(r.recordedBy) : '',
  }));
}

/**
 * 考察督办清单（SOP-B-10）：纪检委员的入口＝「**未闭环 / 超期**」项，**以人为第一列**（一人一行）。
 * 判据（本批择定，见执行日志批次 84）：**未闭环**＝已有考察记录且未确认（`status='pending'`）；
 * **超期**＝未确认且录入时间超过 `POLICY_DEFAULTS.inspection.overdueDays` 天（与 `getOverdueRecords` 同源）。
 * ⚠ 「该有而没有」那一侧（应有记录的应到口径）系统内无口径 ⇒ **本函数不判**（不自行推定）。
 * ⚠ **督办不等于接手**：建档与核对仍归组织委员（`SOP-A-12`）。
 * 纯数据辅助（无 DOM）：纪检台「考察管理」tab 督办清单卡消费；单测可直导。
 * @returns {Array<Object>} 按超期数 / 未闭环数降序
 */
export function listInspectionSupervision() {
  const overdueIds = new Set(getOverdueRecords().map(r => r.id));
  const byPerson = new Map();
  loadActiveInspectionRecords().forEach(r => {
    if ((r.status || 'pending') !== 'pending') return;
    // 已打回（回退态）：更正责任已交回上传方重新确认，**不在纪检待办内**（与考勤打回同规，
    // 批次 119「与纪检对齐，可打回」）——此处只列纪检该推动的那些，已打回项在总表/只读区可见。
    if (r.returnedBy) return;
    if (!byPerson.has(r.personId)) {
      const m = getPersonById(r.personId) || {};
      byPerson.set(r.personId, {
        personId: r.personId,
        name: _personName(r.personId),
        studentId: m.studentId || '',
        partyGroup: m.partyGroup || '',
        developStage: m.developStage || '',
        role: m.role || '',
        pendingCount: 0,
        overdueCount: 0,
        latestRecordedByName: '',
        latestRecordedAt: '',
      });
    }
    const row = byPerson.get(r.personId);
    row.pendingCount += 1;
    if (overdueIds.has(r.id)) row.overdueCount += 1;
    const at = r.recordedAt || '';
    if (at >= row.latestRecordedAt) {
      row.latestRecordedAt = at;
      row.latestRecordedByName = r.recordedBy ? _personName(r.recordedBy) : '';
    }
  });
  const zh = (a, b) => String(a).localeCompare(String(b), 'zh');
  return [...byPerson.values()].sort((a, b) =>
    b.overdueCount - a.overdueCount || b.pendingCount - a.pendingCount || zh(a.name, b.name));
}

/**
 * 考察记录宽格式（以人为行、来源为列）
 */
export function inspectionToWide(records) {
  const personMap = {};
  const sourceIds = [];
  records.forEach(r => {
    const sourceKey = r.activityId || r.sourceName;
    if (!sourceIds.find(s => s.key === sourceKey)) {
      sourceIds.push({
        key: sourceKey,
        title: r.activityId ? _activityTitle(r.activityId) : r.sourceName,
        type: SOURCE_TYPE_LABELS[r.sourceType] || r.sourceType,
      });
    }
    if (!personMap[r.personId]) {
      personMap[r.personId] = { name: _personName(r.personId), personId: r.personId, cells: {} };
    }
    personMap[r.personId].cells[sourceKey] = r.content || r.role; // P1-5：content 优先
  });
  return {
    columns: sourceIds,
    rows: Object.values(personMap),
  };
}

// ════════════════════════════════════════════════════════════════
//  考察「打回」与「我参与了但没记上」申诉（SOP-B-10 督办强度对齐 · 2026-09-20 批次 119）
// ════════════════════════════════════════════════════════════════
// 支书定案二（原话）：「与纪检对齐，可打回（推荐）」——考察侧督办强度对齐纪检侧考勤。
// 「同一套语义」＝① **可恢复的回退态**（记录回「待确认」＋ 打回留痕可见）
//                ＋ ② **申诉入口**（当事人报「没记上」→ 纪检先核实 → 属实按打回处理）。
// ⚠ 一处差异（如实登记，未自创第二套）：考勤的 `recordedBy` ＝ **确认人**（纪检），
//   考察的 `recordedBy` ＝ **上传人**（组织者 / 组长 / 组织委员），确认人不落字段
//   （`confirmInspectionRecord` 只改 `status`）——故考察打回的回退态由「`status` 回 `pending`」
//   ＋ `returnedBy / returnedAt / returnReason` 表达（字段名与考勤打回逐字一致，便于同一套读法）。
// 存储：申诉队列＝本模块自管 localStorage 键（`gsm1921-` 前缀 → `?reset=demo` 自动清理，
//   做法同 `services/attendance.js` 的出勤申诉队列；mock-adapter / 服务端资源表清单不动）。
export const INSPECTION_APPEALS_KEY = 'gsm1921-inspection-appeals';

/** 读取考察申诉队列（存储不可用 / 数据损坏 → []） */
export function loadInspectionAppeals() {
  try {
    if (typeof localStorage === 'undefined') return [];
    const arr = JSON.parse(localStorage.getItem(INSPECTION_APPEALS_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch (_) { return []; }
}

function _saveInspectionAppeals(list) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(INSPECTION_APPEALS_KEY, JSON.stringify(list));
  } catch (_) { /* 存储不可用：不阻塞流程 */ }
}

/**
 * 提交考察申诉（当事人侧「我参与了但没记上」）。
 * 同人同活动已有未处理（pending）申诉 → 不重复登记。
 * @param {{personId:string, activityId:string, note?:string}} params
 * @returns {{ok:boolean, reason?:string}}
 */
export function createInspectionAppeal({ personId, activityId, note } = {}) {
  if (!personId || !activityId) return { ok: false, reason: '缺少活动或申诉人' };
  const all = loadInspectionAppeals();
  if (all.some(a => a.personId === personId && a.activityId === activityId && a.status === 'pending')) {
    return { ok: false, reason: 'already' };
  }
  all.push({
    id: generateId('inspAppeal'),
    personId,
    activityId,
    note: String(note || '').trim(),
    status: 'pending',
    createdAt: new Date().toISOString(),
  });
  _saveInspectionAppeals(all);
  return { ok: true };
}

/**
 * 关闭考察申诉（纪检核实后：不属实 / 已另行处理）——留痕可见。
 * @param {string} appealId
 * @param {{by?:string, note?:string, status?:string}} [opts]
 * @returns {{ok:boolean}}
 */
export function closeInspectionAppeal(appealId, { by, note, status = 'closed' } = {}) {
  const all = loadInspectionAppeals();
  const it = all.find(a => a.id === appealId);
  if (!it) return { ok: false };
  it.status = status;
  it.decidedBy = by || null;
  it.decidedAt = new Date().toISOString();
  if (note) it.decisionNote = String(note);
  _saveInspectionAppeals(all);
  return { ok: true };
}

/**
 * 纪检核实属实 → 打回，交上传方（活动组织者 / 组长 / 专班上传方）重新确认。
 * ① 申诉置 `returned`（留痕：谁在何时打回、打回说明）；
 * ② 若该人该场**已有考察记录**，记录一并置回退态（回「待确认」＋ 写 returnedBy/returnedAt/returnReason）。
 * @returns {{ok:boolean, hadRecord:boolean}}
 */
export function returnInspectionAppeal(appealId, { by, note } = {}) {
  const all = loadInspectionAppeals();
  const it = all.find(a => a.id === appealId);
  if (!it || it.status !== 'pending') return { ok: false, hadRecord: false };
  const at = new Date().toISOString();
  it.status = 'returned';
  it.returnedBy = by || null;
  it.returnedAt = at;
  it.returnNote = String(note || '').trim();
  _saveInspectionAppeals(all);
  const records = loadInspectionRecords();
  const rec = records.find(r => r.personId === it.personId && r.activityId === it.activityId);
  if (rec) {
    rec.status = 'pending';
    rec.returnedBy = by || null;
    rec.returnedAt = at;
    rec.returnReason = it.returnNote || '考察申诉核实';
    saveInspectionRecords(records);
  }
  return { ok: true, hadRecord: !!rec };
}

/**
 * 对单条考察记录打回（纪检对已确认记录的例外路径）：回「待确认」＋ 写打回留痕。
 * ⚠ 与考勤打回同语义：**不是替上传方改数**，而是把更正责任交回上传方重新确认。
 * @returns {{ok:boolean}}
 */
export function returnInspectionRecord(recordId, { by, note } = {}) {
  const records = loadInspectionRecords();
  const rec = records.find(r => r.id === recordId);
  if (!rec) return { ok: false };
  rec.status = 'pending';
  rec.returnedBy = by || null;
  rec.returnedAt = new Date().toISOString();
  rec.returnReason = String(note || '').trim() || '纪检打回';
  saveInspectionRecords(records);
  return { ok: true };
}

/** 上传方重新确认（打回后可恢复的另一半）：清打回痕、回「待确认」交纪检复核 */
export function reconfirmReturnedInspectionRecord(recordId, { actorId } = {}) {
  const records = loadInspectionRecords();
  const rec = records.find(r => r.id === recordId);
  if (!rec) return { ok: false };
  delete rec.returnedBy;
  delete rec.returnedAt;
  delete rec.returnReason;
  rec.submittedBy = actorId || rec.submittedBy;
  rec.updatedBy = actorId || null;
  rec.updatedAt = new Date().toISOString();
  rec.status = 'pending';
  saveInspectionRecords(records);
  return { ok: true };
}

/**
 * 上传方对「考察申诉」的确认（打回后闭环）：按核实结论写入 / 更正该场该人的考察，并关闭申诉。
 * 已有记录 → 清打回痕并更正内容；无记录 → 按上传方所选层级补录一条（回「待确认」，确认权仍归纪检）。
 * @param {{appealId:string, actorId:string, level?:string, content?:string, note?:string}} params
 * @returns {{ok:boolean}}
 */
export function resolveInspectionAppeal({ appealId, actorId, level, content, note } = {}) {
  const all = loadInspectionAppeals();
  const it = all.find(a => a.id === appealId);
  if (!it) return { ok: false };
  const records = loadInspectionRecords();
  const rec = records.find(r => r.personId === it.personId && r.activityId === it.activityId);
  if (rec) {
    delete rec.returnedBy;
    delete rec.returnedAt;
    delete rec.returnReason;
    if (content) rec.content = String(content).trim();
    if (level) rec.level = level;
    rec.submittedBy = actorId || rec.submittedBy;
    rec.updatedBy = actorId || null;
    rec.updatedAt = new Date().toISOString();
    rec.status = 'pending'; // 回「待确认」——确认权归纪检，上传方不代确认
    saveInspectionRecords(records);
  } else {
    const lv = level || ParticipationLevel.ORGANIZE;
    records.push({
      id: generateId('insp'),
      sourceType: SourceType.ACTIVITY,
      activityId: it.activityId,
      sourceName: null,
      personId: it.personId,
      level: lv,
      content: String(content || '').trim() || '参与情况经核实补录',
      role: lv === ParticipationLevel.DEEP_PARTICIPATE ? '深度参与者' : '组织者',
      recordedBy: actorId || null,
      recordedAt: new Date().toISOString(),
      submittedBy: actorId || null,
      status: 'pending',
    });
    saveInspectionRecords(records);
  }
  it.status = 'closed';
  it.decidedBy = actorId || null;
  it.decidedAt = new Date().toISOString();
  if (note) it.decisionNote = String(note);
  _saveInspectionAppeals(all);
  return { ok: true };
}
