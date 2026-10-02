// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/routes/resources/store.js —— **资源表访问原语**（叶子件：不依赖同目录其它件）
//  切分（2026-09-28 批次 234）：原 routes/resources.js 1301 行按内聚拆 6 文件；本文件＝资源注册表 + ID 前缀 + 单表/单行读写。
// ════════════════════════════════════════════════════════════════

export const RESOURCE_TABLES = {
  activities: 'activities',
  tasks: 'tasks',
  attendances: 'attendances',
  inspections: 'inspections',
  taskforces: 'taskforces',
  notices: 'notices',
  todos: 'todos',
  assignments: 'assignments',
  makeupTasks: 'makeup_tasks',
  users: 'users',
  experienceDeposits: 'experience_deposits',
  fileSpaceRecords: 'file_space_records',
  imageRecords: 'image_records',
  signups: 'signups',
  activityReviews: 'activity_reviews',
  taskforceReviews: 'taskforce_reviews',
  propTasks: 'prop_tasks',
  weeklyReports: 'weekly_reports',
  archiveRecords: 'archive_records',
  externalDispatches: 'external_dispatches',
  actSubRecords: 'act_sub_records',
  tfSubRecords: 'tf_sub_records',
  branchDocs: 'branch_docs',
  // P1 党委后台（2026-09-02）：支部实例（党委工作台支部管理；写权限默认 requireAuth，收紧留 P2）
  branches: 'branches',
  // P2 党委后台（2026-09-02）：支书任期记录
  appointmentRecords: 'appointment_records',
  // P3 党委后台（2026-09-02）：支部上报审批（发展节点/活动报备 → 党委批驳）
  reviewRequests: 'review_requests',
  // R-23（2026-09-13）：思想汇报（建表后随快照同步；系统通知 authorize 据本表复算提交人）
  thoughtReports: 'thought_reports',
  // 2026-09-14 批次 25：党小组一等实体（支书特批；写门 = secretary，见 RESOURCE_WRITE_GATE）
  partyGroups: 'party_groups',
  // 2026-09-14 批次 25：成员流动台账（写门 = 组织委员 + 支书/副支书，见 RESOURCE_WRITE_GATE）
  memberFlows: 'member_flows',
};
export function listTable(db, table) {
  return db.prepare(`SELECT data FROM ${table}`).all().map(r => JSON.parse(r.data));
}
export const ID_PREFIX = {
  activities: 'act', tasks: 'tsk', attendances: 'att', inspections: 'ins',
  taskforces: 'tf', notices: 'ntc', todos: 'td', assignments: 'asg',
  makeupTasks: 'mk', experienceDeposits: 'xp',
  fileSpaceRecords: 'fs', imageRecords: 'img',
  signups: 'su', activityReviews: 'arw', taskforceReviews: 'tfr',
  propTasks: 'ppt', weeklyReports: 'wr', archiveRecords: 'ar',
  externalDispatches: 'ed',
  actSubRecords: 'asr', tfSubRecords: 'tfs',
  branchDocs: 'bd',
  branches: 'br',
  appointmentRecords: 'appt',
  reviewRequests: 'rq',
  thoughtReports: 'tr',
  // 2026-09-14 批次 25：党小组（id 形态 pg-<uuid>，与前端 generateId('pg','-') 对齐）
  partyGroups: 'pg',
  // 2026-09-14 批次 25：成员流动台账（id 形态 mf-<uuid>，与前端 generateId('mf','-') 对齐）
  memberFlows: 'mf',
};
/** 单行读（JSON 解码；不存在 ⇒ null）——三张语义表共用 */
export function getRow(db, table, id) {
  const row = db.prepare(`SELECT data FROM ${table} WHERE id = ?`).get(String(id));
  return row ? JSON.parse(row.data) : null;
}

/** 单行写（整条 JSON 字符串；`id` 主键 upsert）——三张语义表共用 */
export function writeRow(db, table, row) {
  db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`).run(row.id, JSON.stringify(row));
}
