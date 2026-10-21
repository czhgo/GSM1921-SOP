// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  inspection.js — 考察记录 CRUD 服务
//  业务口径（2026-10-18 支书裁定）：考察依托工作组——考察记录挂活动工作组或专班工作组，
//    考察对象为该工作组成员；sourceType/activityId/taskforceId 只是工作组类型的投影，不是独立父对象。
// ════════════════════════════════════════════════════════════════

import { mockDB, SourceType, SOURCE_TYPE_LABELS, PARTICIPATION_LEVEL_LABELS, ParticipationLevel } from '../../core/domain/domain.js?v=20261021b';
import { POLICY_DEFAULTS } from '../../core/domain/policy-defaults.js?v=20261021b';
import { persist, getDataSource, getAdapter } from '../../data/data-adapter.js?v=20261021b';
import { generateId } from '../../core/base/id.js?v=20261021b';
import { bumpToken } from '../../core/base/version-token.js?v=20261021b'; // P0 域缓存失效（spec §二.3）
import { INSPECTION_RECORDS } from '../../data/mock/index.js?v=20261021b';
import { isInitStateActive } from '../core/init-reset.js?v=20261021b'; // C2 修复（2026-09-08）：init 态空态不回退演示种子
import { getPersonById, getPersonName } from '../member/person.js?v=20261021b';
import { TodoStore, TodoSourceType } from '../governance/todo.js?v=20261021b';
import { trackWrite } from '../../core/session/pending-writes.js?v=20261021b';
import { loadActivities, isActivityOrganizer } from './activity.js?v=20261021b';
// 专班「组织者」判据单一源（2026-09-23 · 专班考察上传位的本位判据要读它）
import { isTaskforceOrganizer, TaskForceRecordStore } from './taskforce.js?v=20261021b';
// R4-D05：删除/确认的默认操作人 = 当前登录人（调用方未显式传 actorId 时）
import { AuthStore } from '../core/auth.js?v=20261021b';
// D01/D08：考察写角色与确认角色单一源（server gates.js 同读，防两端一个放一个拦）
import { INSPECTION_WRITE_ROLES, INSPECTION_CONFIRM_ROLES } from '../../core/domain/constants.js?v=20261021b';

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
 * 考察上传位门禁（R4-D05，2026-10-20：改为 deny-by-default）
 * 允许：本场活动（专班）组织者 / 支书 / 副支书 / 纪检委员。
 * - 活动：`activity.organizer === personId`，或 `assignments` 中 role=organizer/deep；
 * - 专班：专班组织者（`taskforce.members` role=organizer；只按 workgroupId 反查，名称不作判据）。
 * 其余角色一律拒绝——不再有「专班一律放行」「本组组长按类型放行」的宽口。
 */

/**
 * 前端可写考察的角色（D08 正式纳入：支委层含组织委员「建档代录」；角色名单单一源 = constants.js）。
 * D01 的确认白名单不在此集：确认只看 `INSPECTION_CONFIRM_ROLES`，且禁止自确认。
 */
export const INSPECTION_ROLE_WRITE = new Set(INSPECTION_WRITE_ROLES);
/** 前端可确认/打回考察的角色（D01：纪检/支书/副支书） */
export const INSPECTION_ROLE_CONFIRM = new Set(INSPECTION_CONFIRM_ROLES);

// R4-D04：考察记录以工作组为稳定父键。历史记录无法回填时置 legacy:true 只读——
// 前后端同文案，避免「前端放行、服务端拒绝」的两种解释。
export const INSPECTION_LEGACY_REASON = '历史考察缺少工作组键（只读）';
export const INSPECTION_MISSING_KEY_REASON = '考察记录缺少工作组键（workgroupId），请从专班上下文重新上传';

/** 由 workgroupId 反查专班（workgroups.sourceId 优先；兼容旧记录直接存专班 id） */
function _taskforceByWorkgroupId(workgroupId) {
  if (!workgroupId) return null;
  const rows = TaskForceRecordStore.getAll();
  const group = (Array.isArray(mockDB.workgroups) ? mockDB.workgroups : [])
    .find(row => row.id === workgroupId && row.kind === 'taskforce');
  return (group?.sourceId && rows.find(r => r.id === group.sourceId))
    || rows.find(r => (r.workgroupId || `wg-taskforce-${r.id}`) === workgroupId)
    || rows.find(r => r.id === workgroupId)
    || null;
}

/** 本场活动是否为该人的组织位（组织者 / deep 协作者） */
function _isInspectionSourceOrganizer(personId, sourceType, sourceId) {
  if (!personId || !sourceType || !sourceId) return false;
  if (sourceType === SourceType.TASKFORCE) {
    // R4-D04：专班侧只按 workgroupId（稳定父键）反查，改名/同名都不再影响判据。
    const tf = _taskforceByWorkgroupId(sourceId);
    return !!tf && isTaskforceOrganizer(personId, tf.id);
  }
  const activity = loadActivities().find(a => a.id === sourceId);
  if (!activity) return false;
  if (activity.organizer === personId) return true;
  return Array.isArray(activity.assignments)
    && activity.assignments.some(x => x && x.personId === personId && (x.role === 'organizer' || x.role === 'deep'));
}

/**
 * 上传门禁的**可懂原因**（允许 → null）。
 * @returns {string|null}
 */
export function inspectionUploadDenyReason(personId, sourceType, sourceId) {
  if (!personId || !sourceType || !sourceId) return '缺少上传人或考察来源';
  const role = (getPersonById(personId) || {}).role;
  if (INSPECTION_ROLE_WRITE.has(role)) return null;
  if (sourceType === SourceType.TASKFORCE) {
    // R4-D04：sourceId 必须是专班工作组键；名称不再作为可上传来源。
    if (!_taskforceByWorkgroupId(sourceId)) return '专班工作组不存在或缺少工作组键，不能上传考察';
    return _isInspectionSourceOrganizer(personId, sourceType, sourceId)
      ? null : '仅专班组织者或纪检可上传考察';
  }
  const activity = loadActivities().find(a => a.id === sourceId);
  if (!activity || activity.archived) return '该活动已归档或不存在，不能上传考察';
  return _isInspectionSourceOrganizer(personId, sourceType, sourceId)
    ? null : '仅本场组织者或纪检可上传考察';
}

export function canUploadInspection(personId, sourceType, sourceId) {
  return inspectionUploadDenyReason(personId, sourceType, sourceId) === null;
}

/** 当前登录人（无会话 → null） */
function _currentPersonId() {
  try { return (AuthStore.getCurrentUser() || {}).personId || null; } catch (_) { return null; }
}

/**
 * 考察「确认 / 打回」授权判据（D01）：允许 → null，拒绝 → 原因。
 * 两件事都必须同时成立：
 *   ① 角色在 `INSPECTION_CONFIRM_ROLES`（纪检 / 支书 / 副支书）——组织委员等写角色**不能**确认；
 *   ② actorId !== recordedBy——禁止自确认（「谁提交谁确认」会让闭环形同虚设）。
 */
function _inspectionDecisionDeny(actorId, record, action) {
  // R4-D04：无法回填工作组键的历史记录只读——不参与确认/打回（连角色白名单也不放行）。
  if (record && record.legacy) return INSPECTION_LEGACY_REASON;
  const personId = actorId || _currentPersonId();
  if (!personId) return `无法识别当前用户，不能${action}考察`;
  const role = (getPersonById(personId) || {}).role;
  if (!INSPECTION_ROLE_CONFIRM.has(role)) return `仅纪检委员或支书/副支书可${action}考察`;
  if (record && record.recordedBy && record.recordedBy === personId) return '不能确认自己提交的考察';
  return null;
}

/** 确认授权判据（供页面预判按钮态与服务层共用） */
export function inspectionConfirmDenyReason(actorId, record) {
  return _inspectionDecisionDeny(actorId, record, '确认');
}

/** 打回授权判据（D01：与确认同一白名单 + 同一自确认禁令） */
export function inspectionReturnDenyReason(actorId, record) {
  return _inspectionDecisionDeny(actorId, record, '打回');
}

/** 删除/确认的授权判据：与本场组织者/纪检同一口径（允许 → null，拒绝 → 原因） */
function _inspectionMutationDeny(actorId, record, action) {
  // R4-D04：历史考察（缺工作组键）只读，删除/更正一律拒绝并给出明确原因。
  if (record && record.legacy) return INSPECTION_LEGACY_REASON;
  const personId = actorId || _currentPersonId();
  if (!personId) return `无法识别当前用户，不能${action}考察`;
  const role = (getPersonById(personId) || {}).role;
  if (INSPECTION_ROLE_WRITE.has(role)) return null;
  const sourceType = record.sourceType === SourceType.TASKFORCE ? SourceType.TASKFORCE : SourceType.ACTIVITY;
  // R4-D04：专班侧只认 workgroupId；缺键的新记录不得再走名称兜底。
  if (sourceType === SourceType.TASKFORCE && !record.workgroupId) return INSPECTION_MISSING_KEY_REASON;
  const sourceId = sourceType === SourceType.TASKFORCE ? record.workgroupId : record.activityId;
  return _isInspectionSourceOrganizer(personId, sourceType, sourceId)
    ? null : `仅本场组织者或纪检可${action}考察`;
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

/**
 * 删除考察记录（仅待确认状态可删；R4-D05 收紧为「本场组织者 / 支书 / 副支书 / 纪检」）
 * @returns {{ok:boolean, reason?:string}}
 */
export function deleteInspectionRecord(id, { actorId } = {}) {
  const records = loadInspectionRecords();
  const idx = records.findIndex(r => r.id === id);
  if (idx === -1) return { ok: false, reason: '考察记录不存在' };
  const deny = _inspectionMutationDeny(actorId, records[idx], '删除');
  if (deny) return { ok: false, reason: deny };
  if (records[idx].status !== 'pending') return { ok: false, reason: '只能删除待确认状态的记录' };
  records.splice(idx, 1);
  saveInspectionRecords(records);
  return { ok: true };
}

/**
 * 确认考察记录（D01：纪检/支书/副支书；禁止自确认）
 * 落 `confirmedBy / confirmedAt`，使「谁确认的」可追溯（此前只改 status）。
 * @returns {{ok:boolean, reason?:string}}
 */
export function confirmInspectionRecord(id, { actorId } = {}) {
  const rec = loadInspectionRecords().find(r => r.id === id);
  if (!rec) return { ok: false, reason: '考察记录不存在' };
  const personId = actorId || _currentPersonId();
  const deny = _inspectionDecisionDeny(personId, rec, '确认');
  if (deny) return { ok: false, reason: deny };
  updateInspectionRecord(id, {
    status: 'confirmed',
    confirmedBy: personId,
    confirmedAt: new Date().toISOString(),
  });
  // 做事即销待办：确认考察 → 销「考察超期/待确认」待办
  try { TodoStore.completeBySource(TodoSourceType.ACTIVITY, `insp_${id}`); } catch (e) { console.warn('[inspection] 销待办失败', e); }
  return { ok: true };
}

/**
 * 获取超期未确认的考察记录
 * 超期标准：待确认状态 + 录入时间超过默认天数（默认 7；P3c 单一源 =
 * core/domain/policy-defaults.js inspection.overdueDays，可经 daysThreshold 覆盖，行为与既有调用兼容）
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
 * @param {string} [sourceId] — activityId 或专班 workgroupId（R4-D04：不再接受专班名称）
 */
export function getRecordsBySource(sourceType, sourceId) {
  const records = loadInspectionRecords();
  return records.filter(r => {
    if (r.sourceType !== sourceType) return false;
    if (sourceType === SourceType.ACTIVITY) return r.activityId === sourceId;
    return r.workgroupId === sourceId;
  });
}

// ── 展示格式化（2026-09-03 数据域接线批次二：自 data/mock/inspection.js 原样提升）──
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
    workgroupId: r.workgroupId || null, // R4-D04：稳定父键（页面据此回查，不依赖名称）
    legacy: !!r.legacy,
    level: r.level,
    levelLabel: PARTICIPATION_LEVEL_LABELS[r.level] || r.level,
    content: r.content || r.role, // P1-5：content 优先，旧数据以 role 兜底
    role: r.role,
    recordedByName: _personName(r.recordedBy),
    recordedBy: r.recordedBy || null, // D01：页面据此判定「本人提交」（不得自确认）
    recordedAt: r.recordedAt,
    confirmedBy: r.confirmedBy || null,
    confirmedAt: r.confirmedAt || null,
    returnedBy: r.returnedBy || null,
    returnedAt: r.returnedAt || null,
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
    workgroupId: r.workgroupId || null,
    legacy: !!r.legacy,
    source: r.activityId ? _activityTitle(r.activityId) : r.sourceName,
    sourceType: SOURCE_TYPE_LABELS[r.sourceType] || r.sourceType,
    level: PARTICIPATION_LEVEL_LABELS[r.level] || r.level,
    role: r.role,
    content: r.content || r.role, // P1-5：content 优先，旧数据以 role 兜底
    status: r.status,
    recordedByName: r.recordedBy ? _personName(r.recordedBy) : '',
    recordedBy: r.recordedBy || null, // D01：本人提交的行不渲染确认按钮
    confirmedBy: r.confirmedBy || null,
    confirmedAt: r.confirmedAt || null,
    returnedBy: r.returnedBy || null,
    returnedAt: r.returnedAt || null,
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
    // R4-D04：矩阵按稳定父键分组（活动 activityId / 专班 workgroupId）；
    // sourceName 仅作历史（legacy）记录的最后展示兜底，不参与正常关联。
    const sourceKey = r.activityId || r.workgroupId || (r.legacy ? `legacy:${r.id}` : r.sourceName);
    if (!sourceIds.find(s => s.key === sourceKey)) {
      sourceIds.push({
        key: sourceKey,
        title: r.activityId ? _activityTitle(r.activityId) : (r.sourceName || r.workgroupId),
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
//   考察的 `recordedBy` ＝ **上传人**（组织者 / 组长 / 组织委员）——D01 起确认人另落
//   `confirmedBy / confirmedAt`（不再只改 `status`）；打回的回退态仍由「`status` 回 `pending`」
//   ＋ `returnedBy / returnedAt / returnReason` 表达（字段名与考勤打回逐字一致，便于同一套读法）。
// 存储：申诉队列＝`mockDB.inspectionAppeals`（内存读链）＋ 双形态持久（2026-09-24 批次 169 收口）：
//   mock 形态自管 localStorage 键（`gsm1921-` 前缀 → `?reset=demo` 自动清理，做法同 services/activity/attendance.js
//   的出勤申诉队列；原路径不变）；api 形态落服务端表 `inspection_appeals`
//   （端点 GET/POST/PATCH /api/v1/inspection-appeals，见 server/routes/resources.js 末「申诉队列」段），
//   `init()` 拉取填缓存 ⇒ **清本机缓存不丢队列**。
export const INSPECTION_APPEALS_KEY = 'gsm1921-inspection-appeals';

/** 是否 api 形态（申诉队列以服务端表为权威） */
function _isApiForm() {
  try { return getDataSource() === 'api'; } catch (_) { return false; }
}

/** api 形态：把一次申诉写同步到服务端（R3-P1（F-09）：登记 pending-writes，失败让调用方感知） */
function _syncAppealToServer(fn, what) {
  if (!_isApiForm()) return;
  try {
    const call = fn(getAdapter());
    if (call && typeof call.then === 'function') {
      trackWrite(call).catch((e) => console.warn(`[InspectionAppeal] api 形态${what}落服务端失败（本地已记，下次 init 以服务端为准）：`, e));
    }
  } catch (e) {
    console.warn(`[InspectionAppeal] api 形态${what}落服务端失败（本地已记，下次 init 以服务端为准）：`, e);
    trackWrite(Promise.reject(e));
  }
}

/** 读取考察申诉队列（api 形态读 init 拉取的服务端缓存；mock 形态读本地键；不可用 / 损坏 → []） */
export function loadInspectionAppeals() {
  if (Array.isArray(mockDB.inspectionAppeals)) return [...mockDB.inspectionAppeals];
  try {
    if (typeof localStorage === 'undefined') return [];
    const arr = JSON.parse(localStorage.getItem(INSPECTION_APPEALS_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch (_) { return []; }
}

function _saveInspectionAppeals(list) {
  mockDB.inspectionAppeals = [...list]; // 内存读链（两形态同源）
  if (_isApiForm()) return;             // api 形态：不落本机（服务端表为权威）
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
  _syncAppealToServer(a => (a.inspectionAppeals ? a.inspectionAppeals.create(all[all.length - 1]) : null), '申诉提交');
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
  _syncAppealToServer(a => (a.inspectionAppeals ? a.inspectionAppeals.patch(appealId, { status, note: note || '' }) : null), '申诉关闭');
  return { ok: true };
}

/**
 * 纪检核实属实 → 打回，交上传方（活动组织者 / 组长 / 专班上传方）重新确认。
 * ① 申诉置 `returned`（留痕：谁在何时打回、打回说明）；
 * ② 若该人该场**已有考察记录**，记录一并置回退态（回「待确认」＋ 写 returnedBy/returnedAt/returnReason）。
 * @returns {{ok:boolean, hadRecord:boolean}}
 */
export function returnInspectionAppeal(appealId, { by, note, actorId } = {}) {
  const all = loadInspectionAppeals();
  const it = all.find(a => a.id === appealId);
  if (!it || it.status !== 'pending') return { ok: false, hadRecord: false };
  // D01：打回与确认同一白名单 + 自确认禁令（申诉打回也会改记录回退态）
  const personId = actorId || by || _currentPersonId();
  const recordsForCheck = loadInspectionRecords();
  const targetRec = recordsForCheck.find(r => r.personId === it.personId && r.activityId === it.activityId);
  const deny = _inspectionDecisionDeny(personId, targetRec, '打回');
  if (deny) return { ok: false, hadRecord: false, reason: deny };
  const at = new Date().toISOString();
  it.status = 'returned';
  it.returnedBy = personId;
  it.returnedAt = at;
  it.returnNote = String(note || '').trim();
  _saveInspectionAppeals(all);
  _syncAppealToServer(a => (a.inspectionAppeals ? a.inspectionAppeals.patch(appealId, { status: 'returned', note: it.returnNote }) : null), '申诉打回');
  const records = recordsForCheck;
  const rec = targetRec;
  if (rec) {
    rec.status = 'pending';
    rec.returnedBy = personId;
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
export function returnInspectionRecord(recordId, { by, note, actorId } = {}) {
  const records = loadInspectionRecords();
  const rec = records.find(r => r.id === recordId);
  if (!rec) return { ok: false, reason: '考察记录不存在' };
  // D01：打回与确认同一白名单；`by` 仅兼容旧调用（真实操作人优先取 actorId/会话）
  const personId = actorId || by || _currentPersonId();
  const deny = _inspectionDecisionDeny(personId, rec, '打回');
  if (deny) return { ok: false, reason: deny };
  rec.status = 'pending';
  rec.returnedBy = personId;
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
  _syncAppealToServer(a => (a.inspectionAppeals ? a.inspectionAppeals.patch(appealId, { status: 'closed', note: note || '' }) : null), '申诉确认关闭');
  return { ok: true };
}

/**
 * 考察上传「本位」判据（2026-09-23 支书 nudge 裁定 · 单一源）——「这一步**一般由谁**上传」。
 * 与 `canUploadInspection`（**谁有权**：还含「支书 / 副支书例外承担」与「本组组长」这一上传位）分开：
 * 本位＝**该场活动（专班）的组织者**——
 *   · 活动：**考察记录由组织者上传**（`D-287`「材料上传主体一律组织者」· `D-315`）；
 *   · 专班：上传＝专班实际负责人（组织者），组织委员＝建档汇总、**不直接录原始数据**
 *     （CF §D 考察管理表「专班考察：上传/修改」行）。
 * 供「越俎代庖」nudge 判「操作人是不是本位」——本位操作人走原路径、零打扰。
 * @param {string} personId 操作人
 * @param {string} sourceType SourceType.ACTIVITY / SourceType.TASKFORCE
 * @param {string} sourceId 活动 id / 专班 workgroupId（R4-D04：专班不再用名称）
 * @returns {boolean}
 */
export function isInspectionHomePosition(personId, sourceType, sourceId) {
  if (!personId || !sourceType || !sourceId) return false;
  if (sourceType === SourceType.TASKFORCE) {
    const tf = _taskforceByWorkgroupId(sourceId);
    return !!tf && isTaskforceOrganizer(personId, tf.id);
  }
  return isActivityOrganizer(personId, sourceId);
}

