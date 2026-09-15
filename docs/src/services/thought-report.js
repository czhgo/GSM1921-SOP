// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  thought-report.js — 思想汇报服务（2026-08-30 支书决策启动数字化）
//  算法归档原则（支书 2026-08-30 强调）：党员/发展对象在系统内提交，
//  提交即入库即归档——算法按 personId 自动归集至个人档案，无人工归档环节，
//  组织委员只做查看/调用（考察发展党员时直接调用思想汇报记录）。
//  2026-09-07 R6-2「把关式初阅」（支书定案：组织初阅归档、必要时反馈）：
//    提交流程改为把关式状态机——pending（待组织初阅）→ 组织委员初阅：
//    approve → archived（通过即归档）；reject（须附意见）→ needs_revision → 本人
//    修改重交 → 回 pending。旧数据（R6-2 前算法归档产物，无 reviewStatus）
//    读取侧归一为 archived（已归档语义），不进待初阅队列。
//
//  ── 2026-09-13 支书裁定：思想汇报改按「面板数据」建模 ──────────────
//  支书原话：「思想汇报是一个面板数据——一个人可以在多个季度上传他的思想汇报。
//    不强制！但是数据类型上要设定好同一个人 id 下的多个思想汇报。
//    此外思想汇报一般而言 1500 字左右。我认为还是需要用一个界面来承载！而不是展开！」
//  落地口径（grill-me 面谈定案）：
//   ① 期次（period）：格式 `YYYY-Qn`（如 '2026-Q3'）；提交时**手填**（跨季补交可归对期次），
//      服务层缺省按 submittedAt 推导兜底（存量数据/接口调用零破坏）。**不强制提交**。
//   ② 一人多篇：同一 personId 同一期次**允许多篇**（补充稿/修改稿并存）——数据层无唯一性约束。
//   ③ 篇幅：约 1500 字为**软提示**（界面显示实时字数 + 建议篇幅），不作硬性拦截；
//      单一源 = policy-defaults.thoughtReport（原「界面不展示字数为宜」的口径冲突已裁定作废）。
//   ④ 承载：只读查阅走**独立阅读页**（docs/thought-report.html），不再行内展开。
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../core/domain.js?v=20260915f';
import { persist, flushSnapshot, getDataSource } from '../core/data-adapter.js?v=20260915f';
import { THOUGHT_REPORTS } from '../mock/index.js?v=20260915f';
import { POLICY_DEFAULTS } from '../core/policy-defaults.js?v=20260915f';
// 期次纯函数单一源 = core/period.js（服务层与通知模板共用，避免 core→services 环依赖）
import { PERIOD_RE, periodOf, periodLabel, comparePeriodDesc } from '../core/period.js?v=20260915f';
import { generateId } from '../core/id.js?v=20260915f';
// 支委层角色集合单一源（勿手写 5 支委名单——roles-sync 守卫会拦）
import { BRANCH_COMMISSION_ROLES } from '../core/constants.js?v=20260915f';
import { NoticeStore } from './notice.js?v=20260915f';
import { getPersonById } from './person.js?v=20260915f';

/** 期次助手再导出（既有/新增消费方沿用 services/thought-report.js 入口，勿另建第二份实现） */
export { PERIOD_RE, periodOf, periodLabel, comparePeriodDesc, periodOptions } from '../core/period.js?v=20260915f';

// ════════════════════════════════════════════════════════════════
//  访问门（单一源，2026-09-13）
//  ════════════════════════════════════════════════════════════════
//  思想汇报是个人思想材料：**仅本人与支委层可读**；把关式初阅为组织委员功能位。
//  界面显隐（阅读页按钮/列表入口）与服务层校验（reviewThoughtReport）**必须同源**，
//  否则会出现「按钮看得见、点了报无权限」的错位。故角色集合在此定义一次，两处引用。

/** 初阅功能位角色（把关式初阅 = 组织委员） */
export const THOUGHT_REVIEWER_ROLES = Object.freeze(['org-commissioner']);
/** 可读他人思想汇报的角色（支委层；本人恒可读自己的） */
export const THOUGHT_READER_ROLES = BRANCH_COMMISSION_ROLES;

/**
 * 是否可读某篇思想汇报（本人 或 支委层）
 * @param {Object} rec 思想汇报记录
 * @param {{personId?:string, role?:string}} viewer 当前用户
 */
export function canReadThoughtReport(rec, viewer) {
  if (!rec || !viewer) return false;
  if (rec.personId === viewer.personId) return true;
  return THOUGHT_READER_ROLES.includes(viewer.role);
}

/** 是否可初阅（组织委员功能位；与 reviewThoughtReport 内部校验同源） */
export function canReviewThoughtReport(viewer) {
  return !!viewer && THOUGHT_REVIEWER_ROLES.includes(viewer.role);
}

// ════════════════════════════════════════════════════════════════
//  篇幅口径（软提示，单一源 = policy-defaults.thoughtReport）
// ════════════════════════════════════════════════════════════════

/** 建议篇幅（字）——仅供提示，不作拦截 */
export function wordHint() {
  return POLICY_DEFAULTS.thoughtReport.wordHint;
}

/** 「明显偏短」提示线（字）——低于此值提示补充，仍可提交 */
export function wordSoftMin() {
  return POLICY_DEFAULTS.thoughtReport.wordSoftMin;
}

/**
 * 篇幅提示文案（提交侧/初阅侧共用；单一源）
 * @param {string} content 正文
 * @returns {{ count:number, level:'ok'|'short', hint:string }}
 */
export function wordCountHint(content) {
  const count = String(content || '').trim().length;
  const hint = wordHint();
  const soft = wordSoftMin();
  if (count >= soft) return { count, level: 'ok', hint: `建议 ${hint} 字左右（软提示，不作拦截）` };
  return { count, level: 'short', hint: `当前偏短：建议 ${hint} 字左右（软提示，不作拦截，组织初阅会据此把关）` };
}


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
 * 读取归一（旧数据兼容，R6-2 + 2026-09-13 期次）：
 *  · 无 reviewStatus / 状态非法（R6-2 前算法归档产物）→ 按「已归档」处理；
 *  · 无 period / 格式非法（面板数据改造前的存量记录）→ 按 submittedAt 推导期次。
 * 两条归一都保证「读到的记录字段完整」，调用方无需各自兜底（避免各处口径不一）。
 * @param {Object} r 原始记录
 * @returns {Object} 归一后副本
 */
function _effective(r) {
  const periodOk = PERIOD_RE.test(String((r && r.period) || ''));
  return {
    ...r,
    reviewStatus: _REVIEW_STATUS_SET.has(r && r.reviewStatus)
      ? r.reviewStatus
      : THOUGHT_REVIEW_STATUS.ARCHIVED,
    reviewHistory: Array.isArray(r && r.reviewHistory) ? r.reviewHistory : [],
    period: periodOk ? String(r.period) : periodOf(r && r.submittedAt),
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
 * 2026-09-13 面板数据改造：新增期次（period）维度——手填优先，缺省按提交时间推导；
 *   同一 personId 同一期次**允许多篇**（数据层无唯一性约束，支持补充稿/修改稿并存）。
 * @param {Object} rec
 * @param {string} rec.personId   — 提交人（党员/发展对象）
 * @param {string} rec.content    — 思想汇报正文
 * @param {string} [rec.title]    — 标题（可选，默认「思想汇报」）
 * @param {string} [rec.period]   — 期次 `YYYY-Qn`（手填；缺省/非法 → 按提交时间推导）
 * @returns {Object} 新记录（含 reviewStatus='pending'、period）
 */
export function addThoughtReport({ personId, content, title, period }) {
  // 篇幅惯例（政策默认约 1500 字）：**软提示、不作硬性字数拦截**（过短内容由组织初阅把关）。
  // 口径单一源 = policy-defaults.thoughtReport；界面按 wordCountHint() 显示实时字数与建议篇幅。
  const person = getPersonById(personId);
  const submittedAt = new Date().toISOString();
  const periodValue = PERIOD_RE.test(String(period || '')) ? String(period) : periodOf(submittedAt);
  const rec = {
    // 唯一 id 走 core/id.js（crypto.randomUUID）；原 `'tr_' + Date.now()` 在**同毫秒连提两篇**
    // 时产生同 id（重复主键 → 归集/初阅指向错乱），2026-09-13 由面板数据用例实测暴露并根治。
    id: generateId('tr'),
    personId,
    personName: person?.name || personId,
    title: title || '思想汇报',
    period: periodValue,
    content: (content || '').trim(),
    submittedAt,
    reviewStatus: THOUGHT_REVIEW_STATUS.PENDING,
  };
  mockDB.thoughtReports = [...loadThoughtReports(), rec];
  persist();
  // 通知组织委员（把关式初阅）：提交 → 待组织初阅，通过后自动归档
  // R-22（2026-09-13）：系统派生通知改由服务端生成（kind 注册表复算授权 + 文案 + 落点）
  // R-23（2026-09-13）：服务端按 thought_reports 表复算授权 → API 模式须**先冲刷快照**把本次
  //   提交落服务端表，再触发系统通知（否则 800ms 防抖窗口内服务端尚无该行 → 授权 403 无通知）。
  const fireNotice = () => {
    try {
      NoticeStore.addSystem('thought-report-submitted', rec.id, {
        personId: rec.personId,
        personName: rec.personName,
        period: rec.period,
      });
    } catch (e) {
      console.warn('[thought-report] 提交通知失败（不影响归档）：', e);
    }
  };
  if (getDataSource() === 'api') {
    flushSnapshot().then(fireNotice).catch(fireNotice);
  } else {
    fireNotice();
  }
  return rec;
}

/**
 * 全量思想汇报（读取侧经 _effective 归一：期次与状态字段一律补全，调用方不必各自兜底）
 * 2026-09-14 批次 41（Q-23-18 余项）：组织台「思想汇报台账」＝人 × 期次宽表需要
 *   **跨人**的全量归一集合（此前只有按人/待初阅两个归一出口，无全量出口）。
 * @returns {Object[]} 归一后记录（原顺序）
 */
export function listAllThoughtReports() {
  return loadThoughtReports().map(_effective);
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

/**
 * 按人 + 按期次归集（面板数据的阅读视图口径，2026-09-13）：
 * 同一期次下的多篇聚为一组，组间按期次倒序——供独立阅读页与按人档案区使用。
 * @param {string} personId
 * @returns {Array<{period:string,label:string,items:Object[]}>}
 */
export function listThoughtReportsByPersonGrouped(personId) {
  const map = new Map();
  for (const r of listThoughtReportsByPerson(personId)) {
    if (!map.has(r.period)) map.set(r.period, []);
    map.get(r.period).push(r);
  }
  return [...map.entries()]
    .map(([period, items]) => ({ period, label: periodLabel(period), items }))
    .sort((a, b) => comparePeriodDesc(a.period, b.period));
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
  return listAllThoughtReports()
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
  if (!THOUGHT_REVIEWER_ROLES.includes(role)) {
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

/**
 * 本人撤回（C1，2026-09-12）：仅提交人本人、仅 pending（待初阅、尚未被组织采纳）可撤回；
 * 撤回即从个人归集移除该篇——补齐「提交后无法撤回」的断头路。
 * @param {Object} arg
 * @param {string} arg.id  — 思想汇报 id
 * @param {string} arg.by  — 操作人（须为提交人本人）
 * @returns {{ok:true}|{ok:false, reason:string}}
 */
export function withdrawThoughtReport({ id, by }) {
  const list = loadThoughtReports();
  const idx = list.findIndex(r => r.id === id);
  if (idx === -1) return { ok: false, reason: '思想汇报不存在或已被移除' };
  const cur = _effective(list[idx]);
  if (cur.personId !== by) return { ok: false, reason: '仅本人可撤回思想汇报' };
  if (cur.reviewStatus !== THOUGHT_REVIEW_STATUS.PENDING) {
    return { ok: false, reason: '仅待初阅状态可撤回（已归档/已退回不可撤回）' };
  }
  mockDB.thoughtReports = list.filter(r => r.id !== id);
  persist();
  return { ok: true };
}
