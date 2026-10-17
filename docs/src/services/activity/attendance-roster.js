// role: [工程师]+[AI]
// 主题党日报名与原应到名单的合并口径；前后端共享，避免客户端投影代替服务端规则。

function uniqueIds(values) {
  return [...new Set((Array.isArray(values) ? values : []).filter((value) => value != null && String(value).trim()).map(String))];
}

/**
 * 合并冻结前的原应到名单与主题党日已确认线下报名。
 * - 仅显式选择“不线下”的、已通过且未作废的工作组组织者/深度参与者，才从原名单移除；
 * - 普通参与者通过报名默认线下；组织者/深度参与者须显式 onsite=true 才新增；
 * - 其他活动（含三会一课）保持各自的正式名单，不从报名推导应到范围。
 */
export function deriveExpectedRosterIds({ activity, originalPersonIds = [], signups = [] } = {}) {
  const original = uniqueIds(originalPersonIds);
  if (activity?.type !== '主题党日') return original.sort();

  const assigned = new Set((Array.isArray(activity.assignments) ? activity.assignments : [])
    .filter((row) => row && ['organizer', 'deep'].includes(row.role))
    .map((row) => String(row.personId)));
  const relevant = (Array.isArray(signups) ? signups : []).filter((signup) => signup
    && signup.sourceType === 'activity'
    && String(signup.sourceId) === String(activity.id)
    && signup.status === 'approved'
    && !signup.voided);

  const explicitNonOnsiteAssignments = new Set(relevant
    .filter((signup) => ['organizer', 'deep'].includes(signup.role)
      && signup.onsite === false
      && assigned.has(String(signup.personId)))
    .map((signup) => String(signup.personId)));

  const eligibleSignups = relevant
    .filter((signup) => signup.role === 'participant'
      ? signup.onsite !== false // legacy/ordinary approved signup defaults to onsite
      : ['organizer', 'deep'].includes(signup.role) && signup.onsite === true)
    .map((signup) => String(signup.personId));

  return uniqueIds([
    ...original.filter((personId) => !explicitNonOnsiteAssignments.has(personId)),
    ...eligibleSignups,
  ]).sort();
}
