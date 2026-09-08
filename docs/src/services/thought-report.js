// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  thought-report.js — 思想汇报服务（2026-08-30 书记决策启动数字化）
//  算法归档原则（书记 2026-08-30 强调）：党员/发展对象在系统内提交，
//  提交即入库即归档——算法按 personId 自动归集至个人档案，无人工归档环节，
//  组织委员只做查看/调用（考察发展党员时直接调用思想汇报记录）。
//  2026-09-07 R6-2「把关式初阅」（书记定案：组织初阅归档、必要时反馈）：
//    提交流程改为把关式状态机——pending（待组织初阅）→ 组织委员初阅：
//    approve → archived（通过即归档）；reject（须附意见）→ needs_revision → 本人
//    修改重交 → 回 pending。旧数据（R6-2 前算法归档产物，无 reviewStatus）
//    读取侧归一为 archived（已归档语义），不进待初阅队列。
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../core/domain.js?v=20260908c';
import { persist } from '../core/data-adapter.js?v=20260908c';
import { THOUGHT_REPORTS } from '../mock/index.js?v=20260908c';
import { NoticeStore } from './notice.js?v=20260908c';
import { getPersonById } from './person.js?v=20260908c';

// ════════════════════════════════════════════════════════════════
//  R6-2 把关式初阅 状态机（2026-09-07）
//  pending（待组织初阅）──approve──▶ archived（通过即归档）
//        │
//        └──reject（须附意见）──▶ needs_revision ──resubmit（仅本人）──▶ pending
// ════════════════════════════════════════════════════════════════

/** 思想汇报初阅状态枚举 */
export const THOUGHT_REVIEW_STATUS = Object.freeze({
  PENDING: 'pending', // 待组织初阅
  NEEDS_REVISION: 'needs_revision', // 打回：需本人修改后重交
  ARCHIVED: 'archived', // 初阅通过 → 归档（旧数据无状态字段的默认值）
});

const _REVIEW_STATUS_SET = new Set(Object.values(THOUGHT_REVIEW_STATUS));

/**
 * 读取归一（旧数据兼容，R6-2）：无 reviewStatus / 状态非法的记录
 * （R6-2 前算法归档产物）按「已归档」处理——不入待初阅队列、不可再初阅。
 * @param {Object} r 原始记录
 * @returns {Object} 归一后副本（reviewStatus 恒为合法值）
 */
function _effective(r) {
  return {
    ...r,
    reviewStatus: _REVIEW_STATUS_SET.has(r && r.reviewStatus)
      ? r.reviewStatus
      : THOUGHT_REVIEW_STATUS.ARCHIVED,
    reviewHistory: Array.isArray(r && r.reviewHistory) ? r.reviewHistory : [],
  };
}

/** 读取全部思想汇报（算法归集的完整集合；持久化为空时回退 seed，与 inspection.js 同模式） */
export function loadThoughtReports() {
  return Array.isArray(mockDB.thoughtReports) && mockDB.thoughtReports.length > 0
    ? [...mockDB.thoughtReports]
    : [...THOUGHT_REPORTS];
}

/**
 * 提交思想汇报（R6-2 把关式初阅：提交 → 待组织初阅 pending，组织委员初阅通过后归档；
 * 打回则本人修改重交。不再"提交即归档"）
 * @param {Object} rec
 * @param {string} rec.personId   — 提交人（党员/发展对象）
 * @param {string} rec.content    — 思想汇报正文
 * @param {string} [rec.title]    — 标题（可选，默认「思想汇报」）
 * @returns {Object} 新记录（含 reviewStatus='pending'）
 */
export function addThoughtReport({ personId, content, title }) {
  const person = getPersonById(personId);
  const rec = {
    id: 'tr_' + Date.now(),
    personId,
    personName: person?.name || personId,
    title: title || '思想汇报',
    content: (content || '').trim(),
    submittedAt: new Date().toISOString(),
    reviewStatus: THOUGHT_REVIEW_STATUS.PENDING,
  };
  mockDB.thoughtReports = [...loadThoughtReports(), rec];
  persist();
  // 通知组织委员（把关式初阅）：提交 → 待组织初阅，通过后自动归档
  try {
    NoticeStore.add({
      title: '思想汇报已提交',
      content: `${rec.personName} 已提交思想汇报，待组织初阅，通过后系统将自动归档至其个人档案，可前往「发展数据」初阅调用。`,
      priority: 'normal',
      targetUrl: 'workspace/org.html',
    });
  } catch (e) {
    console.warn('[thought-report] 提交通知失败（不影响归档）：', e);
  }
  return rec;
}

/**
 * 按人归集查询（读取侧经 _effective 归一：给定个人档案 → 返回其全部思想汇报，
 * 含 pending/needs_revision/archived，按提交时间倒序）
 * @param {string} personId
 */
export function listThoughtReportsByPerson(personId) {
  return loadThoughtReports()
    .map(_effective)
    .filter(r => r.personId === personId)
    .sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
}

/** 某人的思想汇报提交数（读取侧归一，供档案/列表角标） */
export function countThoughtReportsByPerson(personId) {
  return listThoughtReportsByPerson(personId).length;
}

/**
 * 待初阅队列（组织委员初阅收件箱，R6-2）：仅 pending，按提交时间升序（先提交先阅）。
 * 旧数据（无 reviewStatus）归一为 archived → 天然不进队列。
 * @returns {Object[]}
 */
export function listPendingReviews() {
  return loadThoughtReports()
    .map(_effective)
    .filter(r => r.reviewStatus === THOUGHT_REVIEW_STATUS.PENDING)
    .sort((a, b) => (a.submittedAt || '').localeCompare(b.submittedAt || ''));
}

/**
 * 组织委员把关式初阅（R6-2 状态机推进）
 * approve → archived（通过即归档）；reject → needs_revision（须附初阅意见）。
 * 每次初阅在 reviewHistory 追加 { decision, note, by, at } 留痕。
 * @param {Object} arg
 * @param {string} arg.id        — 思想汇报 id
 * @param {'approve'|'reject'} arg.decision — 初阅决定
 * @param {string} [arg.note]    — 初阅意见（reject 必填）
 * @param {string} arg.by        — 初阅人（成员 id）
 * @param {string} arg.role      — 初阅人角色（仅 org-commissioner 可初阅）
 * @returns {{ok:true, rec:Object}|{ok:false, reason:string}}
 */
export function reviewThoughtReport({ id, decision, note, by, role }) {
  if (role !== 'org-commissioner') {
    return { ok: false, reason: '无权限：仅组织委员可初阅思想汇报' };
  }
  const list = loadThoughtReports();
  const idx = list.findIndex(r => r.id === id);
  if (idx === -1) return { ok: false, reason: '思想汇报不存在或已被移除' };
  const cur = _effective(list[idx]);
  if (cur.reviewStatus !== THOUGHT_REVIEW_STATUS.PENDING) {
    return { ok: false, reason: `仅待初阅状态可初阅：当前为 ${cur.reviewStatus}` };
  }
  if (decision !== 'approve' && decision !== 'reject') {
    return { ok: false, reason: `非法初阅决定：${decision}` };
  }
  const noteText = (note || '').trim();
  if (decision === 'reject' && !noteText) {
    return { ok: false, reason: '打回须填写初阅意见' };
  }
  const updated = {
    ...list[idx],
    reviewStatus: decision === 'approve'
      ? THOUGHT_REVIEW_STATUS.ARCHIVED
      : THOUGHT_REVIEW_STATUS.NEEDS_REVISION,
    reviewHistory: [
      ...(list[idx].reviewHistory || []),
      { decision, note: noteText, by, at: new Date().toISOString() },
    ],
  };
  mockDB.thoughtReports = list.map(r => (r.id === id ? updated : r));
  persist();
  return { ok: true, rec: updated };
}

/**
 * 本人修改重交（R6-2 打回后闭环）：仅 needs_revision 且仅提交人本人可重交；
 * 重交后 content 更新、submittedAt 刷新、状态回 pending（重新进入待初阅队列），
 * 历史留痕（reviewHistory）原样保留。
 * @param {Object} arg
 * @param {string} arg.id       — 思想汇报 id
 * @param {string} arg.content  — 修改后的正文
 * @param {string} arg.by       — 操作人（须为提交人本人）
 * @returns {{ok:true, rec:Object}|{ok:false, reason:string}}
 */
export function resubmitThoughtReport({ id, content, by }) {
  const list = loadThoughtReports();
  const idx = list.findIndex(r => r.id === id);
  if (idx === -1) return { ok: false, reason: '思想汇报不存在或已被移除' };
  const cur = _effective(list[idx]);
  if (cur.reviewStatus !== THOUGHT_REVIEW_STATUS.NEEDS_REVISION) {
    return { ok: false, reason: '仅被打回（needs_revision）的汇报可修改重交' };
  }
  if (cur.personId !== by) {
    return { ok: false, reason: '仅本人可修改重交思想汇报' };
  }
  const updated = {
    ...list[idx],
    content: (content || '').trim(),
    reviewStatus: THOUGHT_REVIEW_STATUS.PENDING,
    submittedAt: new Date().toISOString(),
  };
  mockDB.thoughtReports = list.map(r => (r.id === id ? updated : r));
  persist();
  return { ok: true, rec: updated };
}
