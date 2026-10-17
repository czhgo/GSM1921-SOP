// 工作组成员身份与操作授权模板的单一业务源。
// 模板仅用于界面建议；服务端仍须验证每项授权。

export const WORKGROUP_ROLE_LABELS = Object.freeze({
  organizer: '组织者',
  deep: '深度参与者',
});

export const WORKGROUP_PERMISSION_LABELS = Object.freeze({
  'activity.edit': '编辑活动',
  'activity.signup.manage': '管理活动报名',
  'activity.attendance.record': '登记活动考勤',
  'activity.view': '查看活动工作内容',
  'workgroup.members.manage': '调整工作组成员',
  'task.manage': '管理工作任务',
  'task.complete': '完成分配任务',
  'output.submit': '提交工作产出',
});

export const WORKGROUP_PERMISSION_TEMPLATES_BY_KIND = Object.freeze({
  activity: Object.freeze({
    organizer: Object.freeze(['activity.edit', 'activity.signup.manage', 'activity.attendance.record', 'workgroup.members.manage', 'task.manage', 'output.submit']),
    deep: Object.freeze(['activity.view', 'task.complete', 'output.submit']),
  }),
  taskforce: Object.freeze({
    organizer: Object.freeze(['workgroup.members.manage', 'task.manage', 'output.submit']),
    deep: Object.freeze(['task.complete', 'output.submit']),
  }),
});

export function workgroupPermissionTemplates(kind) {
  return WORKGROUP_PERMISSION_TEMPLATES_BY_KIND[kind] || WORKGROUP_PERMISSION_TEMPLATES_BY_KIND.activity;
}
