// role: [工程师]+[AI]
// 会议议程的会后衔接：只处理结果记录与其直接派生的文件、成员变更动作。

function replaceById(records, record) {
  const index = records.findIndex((item) => item.id === record.id);
  return index < 0
    ? [...records, record]
    : records.map((item) => item.id === record.id ? record : item);
}

// 议程类型判定：新议程用 kinds 数组（一条议程可多类型，书记 2026-09-01 裁决），
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

/** 待讨论名单的成员列表：新模型 personIds 数组（书记 2026-09-01 多选裁决）；兼容旧单值 personId */
function agendaPersonIds(agendaItem) {
  if (Array.isArray(agendaItem.personIds)) return agendaItem.personIds;
  if (agendaItem.personId) return [agendaItem.personId];
  return [];
}

/**
 * 记录一个结构化议程项的会议结果，并执行其唯一的后续动作。
 * 该函数不写活动本身，调用方在取得返回的 activity 后负责落库。
 */
export async function recordAgendaResult({ activity, agendaItemId, result, adapter, db, actorId = null, now = new Date().toISOString() }) {
  if (!activity || !Array.isArray(activity.agenda)) throw new Error('活动议程不存在');
  if (!['passed', 'rejected'].includes(result)) throw new Error('会议结果无效');
  const agendaItem = activity.agenda.find((item) => item.id === agendaItemId);
  if (!agendaItem) throw new Error('议程项不存在');

  const agenda = activity.agenda.map((item) => item.id === agendaItemId
    ? { ...item, result, recordedBy: actorId, recordedAt: now }
    : item);
  const updatedActivity = { ...activity, agenda };

  if (result !== 'passed') return updatedActivity;

  if (hasKind(agendaItem, 'discussion-file') && agendaItem.branchDocId) {
    const archived = await adapter.branchDocs.update(agendaItem.branchDocId, {
      status: 'archived',
      archivedAt: now,
      discussionActivityId: activity.id,
      discussionAgendaItemId: agendaItem.id,
    });
    db.branchDocs = replaceById(db.branchDocs || [], archived);
  }

  // 待讨论名单（书记 2026-09-01 多选裁决）：名单通过后为每人创建一条待审批申请（幂等防重复）
  const isAttendeeList = hasKind(agendaItem, 'attendee-list') || hasKind(agendaItem, 'member-change');
  if (isAttendeeList) {
    const personIds = agendaPersonIds(agendaItem);
    for (const personId of personIds) {
      if (findMemberChangeRequest(db, activity.id, agendaItem.id, personId)) continue;
      const request = await adapter.memberChangeRequests.create({
        activityId: activity.id,
        agendaItemId: agendaItem.id,
        personId,
        fromStage: agendaItem.fromStage,
        toStage: agendaItem.toStage,
        meetingResult: 'passed',
      });
      db.memberChangeRequests = replaceById(db.memberChangeRequests || [], request);
    }
  }

  return updatedActivity;
}

// 详情页「记录通过」接线（书记 2026-09-01 点验链路 ② 落地）：
// 与 recordAgendaResult 同逻辑，命名面向 UI 调用方（inspector 详情页）。
export const recordAgendaResultForActivity = recordAgendaResult;
