// server/db.js — SQLite 初始化与建表
import Database from 'better-sqlite3';

// 资源表：每张表 id 主键 + data JSON（保持与前端数据结构完全一致，嵌套字段零损失）
// T-218：新增 4 张 niche 表（经验沉淀/合规引用/文件空间/图片记录），与前端快照 payload 键名对齐
// T-209 全栈同步：补齐前端 mockDB 全部持久化域（报名/复盘/宣传/档案/公邮/外发确认 + 子记录聚合域），
// 使 API 模式下 25 个持久化域全部有后端表支撑。act_sub_records/tf_sub_records/mailbox_config
// 为对象/单对象聚合域，以「__root__ 单行」模式存储（见 data-adapter.js 封装）。
const RESOURCE_TABLES = [
  'users', 'activities', 'tasks', 'attendances', 'inspections',
  'taskforces', 'notices', 'todos', 'assignments', 'makeup_tasks',
  'experience_deposits', 'compliance_references', 'file_space_records', 'image_records',
  'signups', 'activity_reviews', 'taskforce_reviews', 'prop_tasks', 'weekly_reports',
  'archive_records', 'mailbox_config', 'mailbox_history', 'external_dispatches',
  'act_sub_records', 'tf_sub_records',
  'branch_docs', 'member_change_requests', 'committee_broadcasts',
  'agenda_votes',
  // 2026-09-02 党委后台 P1：支部多实例（br-b1 + 党委动态创建的支部，config 配置档案同存）
  'branches',
  // 2026-09-02 党委后台 P2：书记任期记录（党委任命/撤换档案）
  'appointment_records',
  // 2026-09-02 党委后台 P3：支部上报审批（发展节点/活动报备 → 党委批驳档案）
  'review_requests',
];

const SCHEMA = `
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  person_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  path TEXT NOT NULL,
  size INTEGER NOT NULL,
  uploaded_by TEXT NOT NULL,
  uploaded_at TEXT NOT NULL
);
`;

export function initDb(dbPath) {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA);
  for (const t of RESOURCE_TABLES) {
    db.exec(`CREATE TABLE IF NOT EXISTS ${t} (id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
  }
  return db;
}

// 辅助：整表替换写入（写穿透快照用）。table 限定白名单，杜绝 SQL 注入。
export function replaceCollection(db, table, rows) {
  if (!RESOURCE_TABLES.includes(table)) {
    throw new Error(`未知资源表: ${table}`);
  }
  db.exec(`DELETE FROM ${table}`);
  const stmt = db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`);
  for (const row of rows) {
    stmt.run(row.id, JSON.stringify(row));
  }
}
