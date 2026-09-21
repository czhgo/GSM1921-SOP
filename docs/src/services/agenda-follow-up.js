// role: [工程师]+[AI]
// 会议议程的会后衔接：只处理结果记录与其直接派生的文件、成员变更动作。
// 2026-09-02 AV4：记录「通过」前对支部党员大会（voteConfig.quorumCheck=true）做出席/赞成过半数硬校验
//（spec §3.4）；校验不通过抛错中止（不写 result，UI 层 catch 以 error toast 提示支书）。

import { fetchVotesStrict, presentIdsForItem, tallyForItem } from './committee-vote.js?v=20260921m';
// S-1（2026-09-09 支书批）：逐人结果中「通过者」需按人推导当前发展阶段（fromStage）——
// 单条议程的 fromStage / personStages 可能不覆盖全部对象（各自阶段不同），以成员档案现值兜底。
import { PersonStore } from './person.js?v=20260921m';
// 制度链（2026-09-21 批次 129 · `SOP-B-25` 第 ① 项 / `SOP-B-26`）：议程项结果的「制度」分支只做 IO，
//   判据与状态迁移的单一源在 branch-doc.js::applyInstitutionAgendaResult（纯函数，本文件不复制状态名）。
import { isInstitutionDoc, applyInstitutionAgendaResult } from './branch-doc.js?v=20260921m';
// 品牌认定（2026-09-21 批次 132 · 支书口径二「提案 → 支委会通过后确定」）：议程项结果的 `brand-designation`
//   分支只做 IO，判据与状态迁移的单一源在 activity.js::applyBrandDesignationResult（纯函数）。
import { commitBrandDesignationResult } from './activity.js?v=20260921m';

function replaceById(records, record) {
  const index = records.findIndex((item) => item.id === record.id);
  return index < 0
    ? [...records, record]
    : records.map((item) => item.id === record.id ? record : item);
}

// 议程类型判定：新议程用 kinds 数组（一条议程可多类型，支书 2026-09-01 裁决），
// 兼容旧单值 kind 字段（seed/历史数据）。
function hasKind(agendaItem, kind) {
  return (Array.isArray(agendaItem.kinds) && agendaItem.kinds.includes(kind))
    || agendaItem.kind === kind;
}

function findMemberChangeRequest(db, activityId, agendaItemId, personId) {
  return (db.memberChangeRequests || []).find((request) =>
    request.activityId === activityId
    && request.agendaItemId === agendaItemId
    && (!personId || request.personId === personId)
  ) || null;
}

/** 待讨论名单的成员列表：新模型 personIds 数组（支书 2026-09-01 多选裁决）；兼容旧单值 personId */
function agendaPersonIds(agendaItem) {
  if (Array.isArray(agendaItem.personIds)) return agendaItem.personIds;
  if (agendaItem.personId) return [agendaItem.personId];
  return [];
}

/**
 * 逐人结果 → 整条 result 汇总规则（S-1，2026-09-09 支书批）：
 *   全部通过 → 'passed'；部分通过 → 'partial'；全部未通过 → 'rejected'。
 * 与下方「只有通过者才生成成员变更申请」一致——partial 仅对通过者建申请，未通过者仅留痕（personResults）。
 * @param {Array<{passed:boolean}>} list 逐人结果
 * @returns {'passed'|'partial'|'rejected'}
 */
export function summarizePersonResults(list) {
  const total = Array.isArray(list) ? list.length : 0;
  const passed = (Array.isArray(list) ? list : []).filter((r) => r && r.passed === true).length;
  if (total > 0 && passed === total) return 'passed';
  if (passed === 0) return 'rejected';
  return 'partial';
}

/** 解析某成员此次变更的 fromStage：逐人快照 personStages → 议程 fromStage → 成员档案现值 */
function resolveFromStage(agendaItem, personId) {
  const perPerson = agendaItem.personStages && agendaItem.personStages[personId];
  if (perPerson) return perPerson;
  if (agendaItem.fromStage) return agendaItem.fromStage;
  return PersonStore.getById(personId)?.developStage || '';
}

/**
 * 正式表决硬校验（spec §3.4）：活动 voteConfig.quorumCheck === true 时，记录「通过」前校验
 *   (a) 出席过半数：实到（参与记录去重 personId，含弃权）≥ ceil(应到/2)；
 *   (b) 赞成过半数：approve 票数 > 应到/2。
 * 弃权计入出席、不计入赞成。返回拦截文案（含按场景拆分的可采取动作提示）；null = 校验通过。
 * 无记名活动（2026-09-12 支书裁定）：实到取参与记录、赞成取 tally 行（逐人选项不落库，
 *   门槛/结果一律按 应到/实到 + 计数 计算，不依赖逐人选项）；记名活动由逐人 position 现算
 *   —— 两形态统一走 presentIdsForItem/tallyForItem（committee-vote.js）。
 * 表态取 fetchVotesStrict（fail-hard）：API 拉取失败直接抛错中止记录——
 * 硬校验若静默降级本地缓存，门禁将按失真数据放行（AV4 审查修复）。
 * 支委会（deliberative / quorumCheck 默认 false）不拦截（保持展示不拦截现状）。
 */
async function quorumBlockMessage(activity, agendaItemId) {
  const cfg = activity.voteConfig;
  if (!cfg || cfg.quorumCheck !== true) return null;
  const total = Array.isArray(cfg.voterIds) ? cfg.voterIds.length : 0;
  if (total <= 0) return '应到名单为空，无法校验过半数';
  const votes = await fetchVotesStrict(activity.id);
  // 按本议程项统计（一条议程一次表决；多议题各自独立判定出席/赞成）
  const present = presentIdsForItem(votes, agendaItemId).length;
  const approve = Number(tallyForItem(votes, agendaItemId).approve) || 0;
  if (present < Math.ceil(total / 2)) {
    return `应到会有表决权党员过半数出席方可表决（当前 ${present}/${total} 已表态），可督促未表态党员表态`;
  }
  if (approve <= total / 2) {
    return `赞成未超过应到会有表决权党员的半数（${approve}/${total}），不能记录为通过，可继续沟通争取赞成票`;
  }
  return null;
}

/**
 * 记录一个结构化议程项的会议结果，并执行其唯一的后续动作。
 * 该函数不写活动本身，调用方在取得返回的 activity 后负责落库。
 *
 * S-1（2026-09-09 支书批）：支持逐人结果 `personResults`（[{ personId, passed, note? }]）——
 *   · 写入议程项 personResults（含未通过留痕：passed:false + 可选 note）；
 *   · 整条 result 由逐人结果汇总（全通过=passed / 部分=partial / 全未通过=rejected，见 summarizePersonResults）；
 *   · 仅「通过者」生成成员变更申请（partial 亦只建通过者，未通过者零申请、仅留痕）。
 * 无 personResults 时沿用旧单值 result 入参（兼容历史/讨论文件议程）。
 *
 * 2026-09-21 批次 129（制度链）：新增 `reportToPartyMeeting`——支委会审议**制度草案**时勾的
 *   「是否报送党员大会表决」（母本 `常见工作场景快速指南.md:310`「在审议时确定」）。非制度议程项传了也不影响。
 */
export async function recordAgendaResult({ activity, agendaItemId, result, personResults = null, reportToPartyMeeting = false, adapter, db, actorId = null, now = new Date().toISOString() }) {
  if (!activity || !Array.isArray(activity.agenda)) throw new Error('活动议程不存在');
  const agendaItem = activity.agenda.find((item) => item.id === agendaItemId);
  if (!agendaItem) throw new Error('议程项不存在');

  const perPersonInput = Array.isArray(personResults) && personResults.length > 0 ? personResults : null;
  if (!perPersonInput && !['passed', 'rejected'].includes(result)) throw new Error('会议结果无效');

  // 逐人结果规范化（留痕：recordedBy/recordedAt 落每人）
  let normalizedPerPerson = null;
  let effectiveResult = result;
  if (perPersonInput) {
    normalizedPerPerson = perPersonInput
      .filter((r) => r && r.personId)
      .map((r) => ({
        personId: r.personId,
        passed: r.passed === true,
        ...(r.note ? { note: String(r.note) } : {}),
        recordedBy: actorId,
        recordedAt: now,
      }));
    if (normalizedPerPerson.length === 0) throw new Error('逐人结果为空');
    effectiveResult = summarizePersonResults(normalizedPerPerson);
  }

  // 正式表决硬校验（AV4）：存在通过者（passed/partial）时校验出席/赞成过半数；
  // 命中任一 → 抛错中止（不写 result），消息按场景附可采取动作提示（出席不足→督促表态，
  // 赞成不足→继续沟通争取赞成票；UI 层 catch 弹 error toast）。
  // 全未通过（rejected）不拦截。
  if (effectiveResult !== 'rejected') {
    const block = await quorumBlockMessage(activity, agendaItemId);
    if (block) throw new Error(block);
  }

  const agenda = activity.agenda.map((item) => item.id === agendaItemId
    ? {
      ...item,
      result: effectiveResult,
      ...(normalizedPerPerson ? { personResults: normalizedPerPerson } : {}),
      // 支委会审议制度草案时勾的「是否报送党员大会表决」（2026-09-21 批次 129）：留痕在议程项上
      ...(reportToPartyMeeting ? { reportToPartyMeeting: true } : {}),
      recordedBy: actorId,
      recordedAt: now,
    }
    : item);
  const updatedActivity = { ...activity, agenda };

  // 议程项结果的后续动作（2026-09-21 批次 129：**制度**接本链；普通文件维持现状）
  //   · 制度（purpose:'institution'）：判据与状态迁移的单一源在
  //     `branch-doc.js::applyInstitutionAgendaResult` —— 草案 → 支委会审议 → 通过即现行版；
  //     审议时勾了「报送党员大会」的 ⇒ 转「待党员大会表决」，再由支部党员大会记录通过成现行版；
  //     未通过 ⇒ 退回起草人修改（仍为草案＋退回意见，可改后重新提交）。会议类型与环节不符时不动。
  //   · 普通文件：**现状不变**——仅整条通过时归档（部分通过不归档）。
  if (hasKind(agendaItem, 'discussion-file') && agendaItem.branchDocId) {
    const doc = (db.branchDocs || []).find((d) => d && d.id === agendaItem.branchDocId);
    const onChain = doc && isInstitutionDoc(doc);
    const inst = onChain ? applyInstitutionAgendaResult({
      doc,
      meetingType: activity.type,
      decision: effectiveResult,
      reportToPartyMeeting: reportToPartyMeeting === true || agendaItem.reportToPartyMeeting === true,
      by: actorId,
      at: now,
      activityId: activity.id,
      agendaItemId: agendaItem.id,
    }) : null;
    if (inst && inst.ok) {
      const updated = await adapter.branchDocs.update(doc.id, inst.patch);
      db.branchDocs = replaceById(db.branchDocs || [], updated);
    } else if (effectiveResult === 'passed' && !onChain) {
      const archived = await adapter.branchDocs.update(agendaItem.branchDocId, {
        status: 'archived',
        archivedAt: now,
        discussionActivityId: activity.id,
        discussionAgendaItemId: agendaItem.id,
      });
      db.branchDocs = replaceById(db.branchDocs || [], archived);
    }
  }

  // 品牌认定（2026-09-21 批次 132 · 支书口径二「支委/党小组组长均可以提案，支委会……通过后确定」）：
  //   判据与状态迁移的单一源在 `services/activity.js::applyBrandDesignationResult`（纯函数）；
  //   落库走 `commitBrandDesignationResult`（活动主源单点改写 + persist ⇒ mock/api 同码，
  //   且页面本地主源同步更新 ⇒ 紧随其后的快照不会把认定覆盖回去）。
  //   只对「已提案、尚未认定」的活动且**会议类型＝支委会**时生效（会议类型不符则不动）；
  //   通过 ⇒ 置 `isBrand`（品牌认定确定）＋ 认定留痕；未通过 ⇒ 不作认定（提案保留 ＋ 退回意见）。
  if (hasKind(agendaItem, 'brand-designation') && agendaItem.brandActivityId) {
    commitBrandDesignationResult({
      activityId: agendaItem.brandActivityId,
      meetingActivityId: activity.id,
      meetingType: activity.type,
      decision: effectiveResult,
      by: actorId,
      at: now,
      agendaItemId: agendaItem.id,
    });
  }

  // 待讨论名单（支书 2026-09-01 多选裁决）：通过者逐人创建一条待审批申请（幂等防重复）。
  // S-1：有逐人结果 → 只建通过者；无逐人结果 → 整条通过时建全部名单对象（旧行为）。
  const isAttendeeList = hasKind(agendaItem, 'attendee-list') || hasKind(agendaItem, 'member-change');
  if (isAttendeeList) {
    const passedPersonIds = normalizedPerPerson
      ? normalizedPerPerson.filter((r) => r.passed).map((r) => r.personId)
      : (effectiveResult === 'passed' ? agendaPersonIds(agendaItem) : []);
    for (const personId of passedPersonIds) {
      if (findMemberChangeRequest(db, activity.id, agendaItem.id, personId)) continue;
      const fromStage = resolveFromStage(agendaItem, personId);
      if (!fromStage || !agendaItem.toStage) continue; // 阶段信息不全不生成（避免无效申请）
      const request = await adapter.memberChangeRequests.create({
        activityId: activity.id,
        agendaItemId: agendaItem.id,
        personId,
        fromStage,
        toStage: agendaItem.toStage,
        meetingResult: 'passed',
      });
      db.memberChangeRequests = replaceById(db.memberChangeRequests || [], request);
    }
  }

  return updatedActivity;
}

// 详情页「记录通过」接线（支书 2026-09-01 点验链路 ② 落地）：
// 与 recordAgendaResult 同逻辑，命名面向 UI 调用方（inspector 详情页）。
export const recordAgendaResultForActivity = recordAgendaResult;
