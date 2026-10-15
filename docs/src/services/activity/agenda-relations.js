// 议程步骤与表决目标的共同校验（前端写表单 + 服务端 API 共用）。
// agendaStep 是会议议程步骤，不是“三会”会议类型，也不替代 kinds 业务标签。

const AGENDA_STEPS = new Set(['discussion', 'vote']);

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== '';
}

function isCanonicalId(value) {
  return typeof value === 'string' && value.length > 0 && value.trim() === value;
}

function fail(error) {
  return { ok: false, error };
}

/** 校验议程内显式声明的讨论→表决关系；旧议程可继续不带 agendaStep。 */
export function validateAgendaStructure(agenda) {
  if (agenda === undefined || agenda === null) return { ok: true };
  if (!Array.isArray(agenda)) return fail('会议议程须为列表');

  const ids = new Map();
  for (let index = 0; index < agenda.length; index += 1) {
    const row = agenda[index];
    if (!row || typeof row !== 'object' || Array.isArray(row)) return fail('议程项格式无效');
    if (!hasValue(row.id)) continue;
    const id = String(row.id).trim();
    if (ids.has(id)) return fail('议程项 id 不可重复');
    ids.set(id, index);
  }

  for (let index = 0; index < agenda.length; index += 1) {
    const row = agenda[index];
    const hasExplicitStep = row.agendaStep !== undefined && row.agendaStep !== null && row.agendaStep !== '';
    const step = hasExplicitStep ? row.agendaStep : '';
    const hasDiscussionLink = hasValue(row.discussionAgendaItemId);

    if (hasExplicitStep && (typeof step !== 'string' || !AGENDA_STEPS.has(step))) {
      return fail('议程步骤仅支持规范值 discussion 或 vote');
    }
    if (!step) {
      if (hasDiscussionLink) return fail('讨论项关联只能填写在表决项');
      continue;
    }
    if (!isCanonicalId(row.id)) return fail('显式讨论/表决项必须有规范字符串议程项 id');

    const hasRawDiscussionLink = row.discussionAgendaItemId !== undefined
      && row.discussionAgendaItemId !== null
      && row.discussionAgendaItemId !== '';
    if (hasRawDiscussionLink && !isCanonicalId(row.discussionAgendaItemId)) {
      return fail('讨论项关联必须使用规范字符串 id');
    }

    if (step === 'discussion') {
      if (hasRawDiscussionLink) return fail('讨论项不能关联另一讨论项');
      const hasOutcome = hasValue(row.result)
        || (row.personResults !== undefined && row.personResults !== null
          && (!Array.isArray(row.personResults) || row.personResults.length > 0))
        || hasValue(row.recordedBy)
        || hasValue(row.recordedAt)
        || row.reportToPartyMeeting === true;
      if (hasOutcome) return fail('讨论项不能记录决议结果或结果留痕');
      continue;
    }

    if (!hasDiscussionLink || !isCanonicalId(row.discussionAgendaItemId)) {
      return fail('表决项必须关联同一活动中排在前面的讨论项');
    }
    const discussionIndex = ids.get(row.discussionAgendaItemId);
    if (discussionIndex === undefined || discussionIndex >= index) {
      return fail('表决项必须关联同一活动中排在前面的讨论项');
    }
    if (agenda[discussionIndex]?.agendaStep !== 'discussion') {
      return fail('表决项只能关联讨论项');
    }
  }

  return { ok: true };
}

/** 校验表态目标是否为该活动中真实存在且允许表态的议程项。 */
export function validateAgendaVoteTarget(agenda, agendaItemId) {
  if (!Array.isArray(agenda) || !isCanonicalId(agendaItemId)) return fail('议程项不存在或不属于该活动');
  const structure = validateAgendaStructure(agenda);
  if (!structure.ok) return structure;
  const matches = agenda.filter((row) => row && row.id === agendaItemId);
  if (matches.length !== 1) return fail('议程项不存在或不属于该活动');
  const item = matches[0];

  if (item.agendaStep === 'discussion') return fail('讨论项不能直接表决，请在关联表决项中表态');
  return { ok: true, item };
}

/**
 * 解析最终表决项的业务数据来源：结构化议题仍可放在讨论项；若两步都有数据，表决项字段优先。
 * 结果与派生记录仍以表决项 id 为锚点，避免把“讨论过程”误记为最终决议。
 */
export function agendaDecisionSource(agenda, voteItem) {
  if (!voteItem || voteItem.agendaStep !== 'vote' || !Array.isArray(agenda)) return voteItem;
  const discussion = agenda.find((row) => row?.id === voteItem.discussionAgendaItemId && row.agendaStep === 'discussion');
  if (!discussion) return voteItem;

  const source = { ...discussion, ...voteItem };
  const kinds = [...new Set([
    ...(Array.isArray(discussion.kinds) ? discussion.kinds : []),
    ...(Array.isArray(voteItem.kinds) ? voteItem.kinds : []),
  ])];
  if (kinds.length) source.kinds = kinds;
  else if (!Array.isArray(voteItem.kinds)) source.kinds = discussion.kinds;

  const personIdsOf = (row) => Array.isArray(row.personIds) ? row.personIds : (row.personId ? [row.personId] : []);
  const personIds = [...new Set([...personIdsOf(discussion), ...personIdsOf(voteItem)])];
  if (personIds.length) source.personIds = personIds;

  const stagesOf = (row) => row.personStages && typeof row.personStages === 'object' && !Array.isArray(row.personStages)
    ? row.personStages : {};
  const personStages = { ...stagesOf(discussion), ...stagesOf(voteItem) };
  if (Object.keys(personStages).length) source.personStages = personStages;
  else delete source.personStages;

  for (const key of ['branchDocId', 'brandActivityId', 'approvalActivityId', 'toStage', 'fromStage']) {
    if (!hasValue(voteItem[key]) && hasValue(discussion[key])) source[key] = discussion[key];
  }
  return source;
}
