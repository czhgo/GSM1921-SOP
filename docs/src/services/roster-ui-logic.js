// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  roster-ui-logic.js — 成员名册网页管理（立项⑥ B波）纯逻辑层
// ════════════════════════════════════════════════════════════════
// 定位：把「成员名册」UI 的判定/文案逻辑抽成纯函数（无 DOM、无写存储），
//   供 entries/tabs/org/roster-tab.js 消费，同时可被 server 端纯测直导：
//   · 删除守卫 → 产品话术映射（引用清单只透出「业务类别」，不透出技术键/记录 id）；
//   · 新增成员表单校验（姓名必填；党小组/发展阶段/在册状态枚举与数据源一致，禁造新枚举）；
//   · 行内保存 diff（分组/阶段/滞留 变化 → 仅带变化字段的补丁）。
// 语义（书记口径，2026-09-06）：滞留 = 组织关系保留但人不在校 → 成员身份保留、
//   应到剔除、通知照发；备注为「滞留备注」，在校状态下不保留备注（防错位）。
// 依赖：roster.js（RESIDENCE 枚举 + getResidenceOf 读链）——两文件均纯 ESM、无 DOM。
// 单测：server/test/roster-ui-logic.test.mjs
// ════════════════════════════════════════════════════════════════

import { RESIDENCE, getResidenceOf } from './roster.js?v=20260908c';

// ── 删除守卫：业务域 → 产品话术类别（removeMember 引用守卫 refs 的展示映射）──
// 映射键 = PersonStore.findMemberRefs 的 domain（详见 services/person.js）；
// 展示只落「类别」+「条数」，不暴露 id / 域英文键（产品话术要求）。
const GUARD_CATEGORY_OF = {
  branches: '现任书记职务',
  activities: '活动分工',
  assignments: '活动分工',
  attendances: '考勤记录',
  inspections: '考察记录',
  taskforces: '专班成员',
  signups: '报名记录',
  agendaVotes: '支委会表态',
  thoughtReports: '思想汇报',
  activityReviews: '复盘记录',
  taskforceReviews: '复盘记录',
  memberChangeRequests: '成员变更申请',
  committeeBroadcasts: '支委广播',
};

/** 话术类别展示顺序（列表顺序与人员语义相关：职务 → 履职 → 记录） */
const GUARD_CATEGORY_ORDER = [
  '现任书记职务', '活动分工', '考勤记录', '考察记录', '专班成员',
  '报名记录', '支委会表态', '思想汇报', '复盘记录', '成员变更申请', '支委广播',
];

/**
 * 引用清单 → 话术类别计数（去重、保序；未知域回退 ref.label，再兜底「其他引用」）
 * @param {Array} [refs] removeMember 返回的 refs（[{domain,id,label}]）
 * @returns {Array<{category:string, count:number}>} 空引用 → []
 */
export function guardCategoryList(refs) {
  const counts = new Map();
  for (const r of refs || []) {
    if (!r) continue;
    const cat = GUARD_CATEGORY_OF[r.domain] || r.label || '其他引用';
    counts.set(cat, (counts.get(cat) || 0) + 1);
  }
  const out = [];
  for (const cat of GUARD_CATEGORY_ORDER) {
    if (counts.has(cat)) { out.push({ category: cat, count: counts.get(cat) }); counts.delete(cat); }
  }
  for (const [cat, count] of counts) out.push({ category: cat, count }); // 未知类别兜底
  return out;
}

/**
 * 删除守卫 → 完整产品话术（弹窗标题 + 原因说明；无引用返回 null）
 * @param {string} name 成员姓名
 * @param {Array} [refs] 引用清单（同 removeMember refs）
 * @returns {{title:string, reason:string, categories:Array}|null}
 */
export function buildGuardMessage(name, refs = []) {
  const categories = guardCategoryList(refs);
  if (!categories.length) return null;
  const joined = categories.map(c => c.category).join('、');
  const title = `暂无法删除「${String(name || '该成员')}」`;
  const reason = categories.length === 1
    ? `该成员仍被「${joined}」引用，需先解除或迁移相关记录，才能从名册删除。`
    : `该成员仍被「${joined}」等业务记录引用，需先解除或迁移这些记录，才能从名册删除。`;
  return { title, reason, categories };
}

/**
 * 新增成员表单校验（姓名必填；党小组/发展阶段可暂缺；在册状态枚举 = RESIDENCE，禁造新枚举）
 * 备注口径：仅滞留保留备注（在校 → 清空备注，与 org-base-data-preview 模板语义一致）
 * @param {Object} [form] { name, partyGroup, developStage, residenceStatus, residenceNote }
 * @returns {{ok:true, value:Object}|{ok:false, message:string}}
 */
export function validateMemberForm(form = {}) {
  const name = typeof form.name === 'string' ? form.name.trim() : '';
  if (!name) return { ok: false, message: '请填写成员姓名（必填）' };
  const partyGroup = typeof form.partyGroup === 'string' ? form.partyGroup.trim() : '';
  const developStage = typeof form.developStage === 'string' ? form.developStage.trim() : '';
  const residenceStatus = form.residenceStatus ?? RESIDENCE.CAMPUS;
  if (![RESIDENCE.CAMPUS, RESIDENCE.DETAINED].includes(residenceStatus)) {
    return { ok: false, message: '在册状态须为「在校」或「滞留」' };
  }
  let residenceNote = typeof form.residenceNote === 'string' ? form.residenceNote.trim() : '';
  if (residenceNote.length > 120) residenceNote = residenceNote.slice(0, 120); // 与输入 maxlength 对齐
  if (residenceStatus === RESIDENCE.CAMPUS) residenceNote = '';
  return { ok: true, value: { name, partyGroup, developStage, residenceStatus, residenceNote } };
}

/**
 * 行内保存 diff：成员现档案 × 表单值 → 仅含变化字段的补丁（saveMember 入参）
 *   - partyGroup / developStage：与档案字段比较（字符串 trim）；
 *   - residenceStatus / residenceNote：与「合并读链」现值比较（getResidenceOf 覆盖优先，
 *     与纪检/书记复核同源），任一变化 → 同时带出两个字段（备注随状态保存/清空）。
 * 注：滞留留痕（residenceHistory 追加）由 roster.saveResidenceChange 负责，
 *   本函数只产出「需持久化到成员档案」的字段差。
 * @param {Object} member 成员档案对象（含 id/partyGroup/developStage；residence 可缺省）
 * @param {Object} [ui] { partyGroup, developStage, residenceStatus, residenceNote }
 * @returns {Object} 补丁（空对象 = 无变化）
 */
export function diffMemberFields(member, ui = {}) {
  const patch = {};
  if (!member || !member.id) return patch;
  const partyGroup = typeof ui.partyGroup === 'string' ? ui.partyGroup.trim() : '';
  const developStage = typeof ui.developStage === 'string' ? ui.developStage.trim() : '';
  const residenceStatus = ui.residenceStatus ?? RESIDENCE.CAMPUS;
  const residenceNote = typeof ui.residenceNote === 'string' ? ui.residenceNote.trim() : '';
  if (member.partyGroup !== partyGroup) patch.partyGroup = partyGroup;
  if (member.developStage !== developStage) patch.developStage = developStage;
  const cur = getResidenceOf(member);
  if (cur.residenceStatus !== residenceStatus || cur.residenceNote !== residenceNote) {
    patch.residenceStatus = residenceStatus;
    patch.residenceNote = residenceStatus === RESIDENCE.CAMPUS ? '' : residenceNote; // 仅滞留保留备注
  }
  return patch;
}
