/**
 * 活动 × 人员考勤关系的展示模型。
 * 每场活动先有冻结的应到成员关系；已记录考勤可以补入不在原名单中的实际到场者。
 * 这不是简单的两张独立清单：矩阵每格表达一名成员对一场活动的应到/考勤事实。
 */
export function buildAttendanceMatrixModel({ activities = [], records = [], rosterSnapshots = [] } = {}) {
  const activityById = new Map((Array.isArray(activities) ? activities : [])
    .filter((activity) => activity?.id && !activity.archived)
    .map((activity) => [String(activity.id), activity]));
  const recordsByKey = new Map();
  for (const record of Array.isArray(records) ? records : []) {
    if (!record?.activityId || !record?.personId || !activityById.has(String(record.activityId))) continue;
    recordsByKey.set(`${String(record.activityId)}\u0000${String(record.personId)}`, record);
  }
  const snapshotByActivity = new Map();
  for (const snapshot of Array.isArray(rosterSnapshots) ? rosterSnapshots : []) {
    if (!snapshot?.activityId || snapshot.frozen !== true || !activityById.has(String(snapshot.activityId))) continue;
    snapshotByActivity.set(String(snapshot.activityId), new Set(
      Array.isArray(snapshot.personIds) ? snapshot.personIds.map(String) : [],
    ));
  }

  const shownActivityIds = new Set();
  const personIds = new Set();
  for (const [key, record] of recordsByKey) {
    shownActivityIds.add(String(record.activityId));
    personIds.add(String(record.personId));
  }
  for (const [activityId, expectedIds] of snapshotByActivity) {
    shownActivityIds.add(activityId);
    for (const personId of expectedIds) personIds.add(personId);
  }
  const visibleActivities = [...shownActivityIds]
    .map((id) => activityById.get(id))
    .filter(Boolean);

  return {
    activities: visibleActivities,
    personIds: [...personIds].sort((a, b) => a.localeCompare(b)),
    cell(personId, activityId) {
      const record = recordsByKey.get(`${activityId}\u0000${personId}`);
      if (record) return { kind: 'recorded', status: record.status, recordId: record.id || null };
      const expectedIds = snapshotByActivity.get(String(activityId));
      if (!expectedIds) return { kind: 'not-frozen' };
      return expectedIds.has(String(personId)) ? { kind: 'unrecorded' } : { kind: 'not-applicable' };
    },
  };
}
