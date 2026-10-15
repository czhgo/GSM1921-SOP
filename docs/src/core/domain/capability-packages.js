// 业务能力包目录：页面、工作流块和产出块作为子层；目录属性彼此正交。
// T1–T3 是术语授权层级，本目录不以其定义功能等级。
// 制度适用性或依据尚无直接材料支持时保留 pending，由党委维护目录与模板、支部自主选择。
export const CAPABILITY_PACKAGES = [
  {
    id: 'activity-organization', name: '活动组织', version: '1.0.0',
    pages: [{ role: 'secretary', tabId: 'calendar' }, { role: 'leader', tabId: 'write' }],
    workflowBlockIds: ['branch-party-meeting', 'branch-committee', 'party-group-meeting', 'party-lecture', 'theme-party-day'],
    outputBlockIds: ['attendance', 'inspection', 'publicity', 'materials'],
    basisStatus: 'pending', basisReferences: ['content/02_institution/sop/常见工作场景快速指南.md'],
    applicability: 'pending', configurationAuthority: 'branch', dependencies: [],
  },
  {
    id: 'activity-attendance', name: '活动考勤', version: '1.0.0',
    pages: [{ role: 'disc-commissioner', tabId: 'attendance' }], workflowBlockIds: [], outputBlockIds: ['attendance'],
    basisStatus: 'pending', basisReferences: ['content/02_institution/sop/纪检委员工作流程指南.md'],
    applicability: 'pending', configurationAuthority: 'branch', dependencies: ['activity-organization'],
  },
  {
    id: 'taskforce-workgroup', name: '专班工作组', version: '1.0.0',
    // 考察、材料是活动通用产出块，并非专班专属子能力；专班任务与产出各有独立工作组记录。
    pages: [{ role: 'org-commissioner', tabId: 'taskforce' }], workflowBlockIds: ['taskforce'], outputBlockIds: [],
    basisStatus: 'pending', basisReferences: ['content/02_institution/sop/组织委员工作流程指南.md'],
    applicability: 'local', configurationAuthority: 'branch', dependencies: [],
  },
  {
    id: 'periodic-archive', name: '周期归档', version: '1.0.0',
    pages: [{ role: 'prop-commissioner', tabId: 'archive' }], workflowBlockIds: [], outputBlockIds: [],
    basisStatus: 'pending', basisReferences: [],
    applicability: 'pending', configurationAuthority: 'branch', dependencies: [],
  },
];

export const CAPABILITY_PACKAGE_BY_ID = new Map(CAPABILITY_PACKAGES.map((row) => [row.id, row]));

/** 只有当声明同一子能力的所有业务能力包均关闭时，才从全局可用集合中隐藏它。 */
export function disabledCapabilityChildIds(state, childKey) {
  const ownersById = new Map();
  for (const item of CAPABILITY_PACKAGES) {
    for (const id of item[childKey] || []) {
      if (!ownersById.has(id)) ownersById.set(id, []);
      ownersById.get(id).push(item.id);
    }
  }
  return [...ownersById]
    .filter(([, owners]) => owners.length > 0 && owners.every((id) => state?.[id] === false))
    .map(([id]) => id);
}
