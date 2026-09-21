// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  thought-report.js — 思想汇报服务（2026-08-30 支书决策启动数字化）
//  算法归档原则（支书 2026-08-30 强调）：党员/发展对象在系统内提交，
//  提交即入库即归档——算法按 personId 自动归集至个人档案，无人工归档环节，
//  组织委员只做查看/调用（考察发展党员时直接调用思想汇报记录）。
//  ── 2026-09-18 批次 86（`SOP-B-28` 落地；依支书 2026-09-17 裁定 `D-387`）──
//  **取消「组织委员初阅通过才归档」这道人工门**：提交即归档（不再有「待初阅」这个
//    中间态，也不再有待初阅队列）——「初阅」不再作归档的前置环节。
//  审阅仍然存在，但**后置、且不拦**：审阅功能位（组织委员）在阅读页可对任一篇
//    「打回（要求本人补充）」（须附意见）→ needs_revision → 本人修改重交 → 回 archived。
//    打回是**事后反馈**，不是提交必经的门；提交人交上去即入库，不受任何审阅影响。
//  存量数据归一：无 reviewStatus / 状态非法 / 旧的 'pending' 一律读取侧归为 archived
//    （旧「待初阅」在取消门之后即「已入库」，不再有待办语义）。
//  篇幅提示见下方 wordCountHint（`SOP-B-11`：建议 1500 / 少于 1200 触发警告审阅 / 不影响提交；
//    **提醒只给提交人本人**——2026-09-21 批次 124，支书 2026-09-20 定案「只给提交人本人」）。
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

import { mockDB } from '../core/domain.js?v=20260921p';
import { persist, flushSnapshot, getDataSource } from '../core/data-adapter.js?v=20260921p';
import { THOUGHT_REPORTS } from '../mock/index.js?v=20260921p';
import { POLICY_DEFAULTS } from '../core/policy-defaults.js?v=20260921p';
// 期次纯函数单一源 = core/period.js（服务层与通知模板共用，避免 core→services 环依赖）
import { PERIOD_RE, periodOf, periodLabel, comparePeriodDesc } from '../core/period.js?v=20260921p';
import { generateId } from '../core/id.js?v=20260921p';
// 支委层角色集合单一源（勿手写 5 支委名单——roles-sync 守卫会拦）
import { BRANCH_COMMISSION_ROLES } from '../core/constants.js?v=20260921p';
import { NoticeStore } from './notice.js?v=20260921p';
import { getPersonById } from './person.js?v=20260921p';

/** 期次助手再导出（既有/新增消费方沿用 services/thought-report.js 入口，勿另建第二份实现） */
export { PERIOD_RE, periodOf, periodLabel, comparePeriodDesc, periodOptions } from '../core/period.js?v=20260921p';

// ════════════════════════════════════════════════════════════════
//  访问门（单一源，2026-09-13）
//  ════════════════════════════════════════════════════════════════
//  思想汇报是个人思想材料：**仅本人与支委层可读**；审阅动作（打回）为组织委员功能位。
//  界面显隐（阅读页按钮/列表入口）与服务层校验（rejectThoughtReport）**必须同源**，
//  否则会出现「按钮看得见、点了报无权限」的错位。故角色集合在此定义一次，两处引用。

/** 审阅功能位角色（审阅后在必要时「打回要求补充」= 组织委员） */
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

/** 是否可审阅（组织委员功能位；与 rejectThoughtReport 内部校验同源） */
export function canReviewThoughtReport(viewer) {
  return !!viewer && THOUGHT_REVIEWER_ROLES.includes(viewer.role);
}

// ════════════════════════════════════════════════════════════════
//  篇幅口径（单一源 = policy-defaults.thoughtReport）
//  `SOP-B-11`：建议 1500 字以上 · 少于 1200 字触发「警告审阅」 · **一律不影响提交**
//  2026-09-21 批次 124（支书 2026-09-20 定案「**只给提交人本人**」）：提醒**只在提交人本人的
//    提交页 / 重交页 / 阅读页出现**——**不在记录上留组织侧可见的标记、组织侧不经手篇幅这件事**，
//    也不存在「组织审阅篇幅」这一环节（组织委员的「打回」是另一件事：事后反馈，见下）。
// ════════════════════════════════════════════════════════════════

/** 建议篇幅（字）——**只是建议**，不参与任何判定，更不拦提交 */
export function wordHint() {
  return POLICY_DEFAULTS.thoughtReport.wordHint;
}

/** 警告审阅线（字）——低于此值触发「警告审阅」（提醒相关人看一眼），**不是门槛、不拦提交** */
export function wordSoftMin() {
  return POLICY_DEFAULTS.thoughtReport.wordSoftMin;
}

/**
 * 篇幅提示文案（提交侧 / 重交侧 / 阅读侧共用；单一源）
 * ⚠ 三件事分开说清、不许混：**建议** 1500（wordHint）· **警告审阅线** 1200（wordSoftMin）·
 *   **一律不影响提交**（level 只用于文案配色，**不参与任何拦截判定**）。
 * ⚠ 这是**给提交人本人看**的提示（2026-09-21 批次 124：支书 2026-09-20 定案「只给提交人本人」）——
 *   各消费点**只在本人侧渲染**（提交页 / 重交页 / 阅读页的 isSelf），**组织侧不渲染该 level**。
 * @param {string} content 正文
 * @returns {{ count:number, level:'ok'|'short', hint:string }} level='short' 即「低于警告审阅线」
 */
export function wordCountHint(content) {
  const count = String(content || '').trim().length;
  const hint = wordHint();
  const soft = wordSoftMin();
  if (count >= soft) return { count, level: 'ok', hint: `建议 ${hint} 字以上（不影响提交）` };
  return { count, level: 'short', hint: `少于 ${soft} 字：触发警告审阅（不影响提交）；建议 ${hint} 字以上` };
}


// ════════════════════════════════════════════════════════════════
//  审阅（后置、不拦）状态机（2026-09-18 批次 86 起）
//  archived（默认：提交即入库归档）──打回（须附意见，组织委员）──▶ needs_revision
//        ▲                                                              │
//        └──────────────── 本人修改重交（仅本人）───────────────────────┘
//  ⚠ 「打回」是事后反馈，**不是提交必经的门**；任何一篇都照常提交、照常归档。
// ════════════════════════════════════════════════════════════════

/** 思想汇报审阅状态枚举（无「待初阅」——那道门已取消） */
export const THOUGHT_REVIEW_STATUS = Object.freeze({
  NEEDS_REVISION: 'needs_revision', // 已打回：需本人修改后重交
  ARCHIVED: 'archived', // 已入库归档（缺省；旧数据无状态字段 / 旧 'pending' 的归一值）
});

/**
 * 读取归一（旧数据兼容）：
 *  · 状态非 'needs_revision' 一律归一为 archived——含 R6-2 前的无状态产物与
 *    **旧的 'pending'（待初阅）**（取消初阅门后，「待初阅」不再是待办态）；
 *  · 无 period / 格式非法（面板数据改造前的存量记录）→ 按 submittedAt 推导期次。
 * 两条归一都保证「读到的记录字段完整」，调用方无需各自兜底（避免各处口径不一）。
 * @param {Object} r 原始记录
 * @returns {Object} 归一后副本
 */
function _effective(r) {
  const periodOk = PERIOD_RE.test(String((r && r.period) || ''));
  return {
    ...r,
    reviewStatus: (r && r.reviewStatus) === THOUGHT_REVIEW_STATUS.NEEDS_REVISION
      ? THOUGHT_REVIEW_STATUS.NEEDS_REVISION
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
 * 提交思想汇报（2026-09-18 批次 86 起：**提交即入库即归档**——取消「初阅通过才归档」
 * 这道人工门，见文件头 `SOP-B-28`；审阅改为事后反馈，不影响本次提交与归档）
 * 2026-09-13 面板数据改造：新增期次（period）维度——手填优先，缺省按提交时间推导；
 *   同一 personId 同一期次**允许多篇**（数据层无唯一性约束，支持补充稿/修改稿并存）。
 * @param {Object} rec
 * @param {string} rec.personId   — 提交人（党员/发展对象）
 * @param {string} rec.content    — 思想汇报正文
 * @param {string} [rec.title]    — 标题（可选，默认「思想汇报」）
 * @param {string} [rec.period]   — 期次 `YYYY-Qn`（手填；缺省/非法 → 按提交时间推导）
 * @returns {Object} 新记录（含 reviewStatus='archived'、period）
 */
export function addThoughtReport({ personId, content, title, period }) {
  // 篇幅：**只提示、不拦**——建议 1500 字以上、少于 1200 字触发警告审阅（`SOP-B-11`），
  // **一律不影响提交**：本函数不做任何字数校验，过短照常入库归档。
  // 口径单一源 = policy-defaults.thoughtReport；界面按 wordCountHint() 显示实时字数与提示。
  const person = getPersonById(personId);
  const submittedAt = new Date().toISOString();
  const periodValue = PERIOD_RE.test(String(period || '')) ? String(period) : periodOf(submittedAt);
  const rec = {
    // 唯一 id 走 core/id.js（crypto.randomUUID）；原 `'tr_' + Date.now()` 在**同毫秒连提两篇**
    // 时产生同 id（重复主键 → 归集指向错乱），2026-09-13 由面板数据用例实测暴露并根治。
    id: generateId('tr'),
    personId,
    personName: person?.name || personId,
    title: title || '思想汇报',
    period: periodValue,
    content: (content || '').trim(),
    submittedAt,
    reviewStatus: THOUGHT_REVIEW_STATUS.ARCHIVED,
  };
  mockDB.thoughtReports = [...loadThoughtReports(), rec];
  persist();
  // 通知组织委员（思想汇报归口）：该篇**已入库归档**（不再有「待初阅」这道待办）
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
 *   **跨人**的全量归一集合（此前只有按人一个归一出口，无全量出口）。
 * @returns {Object[]} 归一后记录（原顺序）
 */
export function listAllThoughtReports() {
  return loadThoughtReports().map(_effective);
}

/**
 * 按人归集查询（读取侧经 _effective 归一：给定个人档案 → 返回其全部思想汇报，
 * 含 needs_revision/archived，按提交时间倒序）
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
 * 组织委员审阅后的「打回（要求本人补充）」（2026-09-18 批次 86：后置反馈，**不是提交的门**）
 * ——任何一篇（无论已入库多久）都可由审阅功能位打回；打回 → needs_revision（须附意见），
 * 本人修改重交后自动回 archived。每次打回在 reviewHistory 追加 { decision, note, by, at } 留痕。
 * @param {Object} arg
 * @param {string} arg.id     — 思想汇报 id
 * @param {string} arg.note   — 打回意见（必填：要说清请本人补充什么）
 * @param {string} arg.by     — 审阅人（成员 id）
 * @param {string} arg.role   — 审阅人角色（仅 org-commissioner 可打回）
 * @returns {{ok:true, rec:Object}|{ok:false, reason:string}}
 */
export function rejectThoughtReport({ id, note, by, role }) {
  if (!THOUGHT_REVIEWER_ROLES.includes(role)) {
    return { ok: false, reason: '无权限：仅组织委员可审阅思想汇报' };
  }
  const list = loadThoughtReports();
  const idx = list.findIndex(r => r.id === id);
  if (idx === -1) return { ok: false, reason: '思想汇报不存在或已被移除' };
  const cur = _effective(list[idx]);
  if (cur.reviewStatus === THOUGHT_REVIEW_STATUS.NEEDS_REVISION) {
    return { ok: false, reason: '该篇已打回、待本人补充，无需重复打回' };
  }
  const noteText = (note || '').trim();
  if (!noteText) {
    return { ok: false, reason: '打回须填写意见' };
  }
  const updated = {
    ...list[idx],
    reviewStatus: THOUGHT_REVIEW_STATUS.NEEDS_REVISION,
    reviewHistory: [
      ...(list[idx].reviewHistory || []),
      { decision: 'reject', note: noteText, by, at: new Date().toISOString() },
    ],
  };
  mockDB.thoughtReports = list.map(r => (r.id === id ? updated : r));
  persist();
  return { ok: true, rec: updated };
}

/**
 * 本人修改重交（打回后闭环）：仅 needs_revision 且仅提交人本人可重交；
 * 重交后 content 更新、submittedAt 刷新、状态回 archived（**提交即入库即归档**，
 * 不再回「待初阅」），历史留痕（reviewHistory）原样保留。
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
    reviewStatus: THOUGHT_REVIEW_STATUS.ARCHIVED,
    submittedAt: new Date().toISOString(),
  };
  mockDB.thoughtReports = list.map(r => (r.id === id ? updated : r));
  persist();
  return { ok: true, rec: updated };
}
