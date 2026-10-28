// server/scripts/cleanup.mjs — 数据生命周期清理（B-499-8 Task 4；2026-10-26 Task 6 增测试残留档）
// ════════════════════════════════════════════════════════════════
// 口径（2026-10-28 支书裁定 · B-500-4 结案）：**业务数据永不自动删除**。
//   `--apply` 在业务数据面上只允许清三类：孤儿附件 / 悬空附件行 / 测试残留；
//   任何业务表（活动 / 通知 / 待办 / 归档 / 贡献 / 会议等）都不得由脚本自动删除。
//   若将来需要删除真实业务记录，须支书逐次手动触发并留审计。
//   旧备份轮转（`--keep`）与会话清理（`--sessions-before`，默认关）属基础设施维护，不触业务表。
//
// 默认 **dry-run**（只报告、不删）；`--apply` 才执行下面这些**确认项**：
//
//  A. 常规清理（不带 `--test-residue`）：
//     ① 孤儿附件：uploads/ 中存在、但没有任何 filePath / attachments.path 引用；
//     ② 悬空附件行：attachments 表中的 path 对应的物理文件已不存在；
//     ③ 旧备份：backups/ 下保留最近 N 份（`--keep`，默认 14），其余列为可删（基础设施维护，不触业务表）。
//
//  B. 测试残留清理（`--test-residue`）：
//     清 `act-b31-*` / `att-b31-*` / `mk-b31-*` / `act-ce46b61e` / `todo_seed_7` /
//     测试通知 `ntc-*` / 2026-10-21 `【进度汇报】` 测试议题，及其派生的
//     tasks / notices / workgroups / workgroup_members / issue_unread。
//     安全条件＝「ID 前缀 ＋ 标题/日期」双条件；真实业务行不动。
//     可选 `--sessions-before <ISO日期>`：删除该日期之前的 sessions（默认不删）。
//
// ⚠ 业务表及其中的真实业务行永不自动删除；测试残留档只删双条件命中的测试行，
//   不按时间或数量批量删业务数据。
// 用法：
//   node scripts/cleanup.mjs [--db <data.db>] [--uploads <dir>] [--backups <dir>] [--keep 14] [--apply]
//   node scripts/cleanup.mjs --test-residue [--apply] [--sessions-before 2026-10-01]
// 退出码：0 成功（含无事可做）；1 参数/环境错误。
// ════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TEST_ACTIVITY_TITLE = 'B3-1 测试活动';
const CROSS_GROUP_ACTIVITY_TITLE = '跨组活动真机验证 499';
const PROGRESS_ISSUE_TITLE = '【进度汇报】';
const PROGRESS_ISSUE_DATE = '2026-10-21';
const SEED_TODO_ID = 'todo_seed_7';
const SEED_TODO_TITLE = '设置第三党小组组长';

function parseArgs(argv) {
  const out = { apply: false, keep: 14, testResidue: false, sessionsBefore: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--apply') { out.apply = true; continue; }
    if (arg === '--test-residue') { out.testResidue = true; continue; }
    if (!arg.startsWith('--')) throw new Error(`未知参数：${arg}`);
    const key = arg.slice(2);
    if (!['db', 'uploads', 'backups', 'keep', 'sessions-before'].includes(key)) {
      throw new Error(`未知参数：${arg}（可用：--db --uploads --backups --keep --test-residue --sessions-before --apply）`);
    }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`参数 --${key} 缺值`);
    if (key === 'sessions-before') out.sessionsBefore = value;
    else out[key] = key === 'keep' ? Number(value) : value;
    i++;
  }
  if (!Number.isInteger(out.keep) || out.keep < 0) throw new Error('--keep 必须是非负整数');
  if (out.sessionsBefore && Number.isNaN(Date.parse(out.sessionsBefore))) {
    throw new Error(`--sessions-before 必须是可解析日期（如 2026-10-01）：${out.sessionsBefore}`);
  }
  return out;
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  const walk = (current) => {
    for (const name of fs.readdirSync(current)) {
      const full = path.join(current, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else out.push(full);
    }
  };
  walk(dir);
  return out;
}

/** 递归收集对象里所有 filePath / attachments[].path 值 */
function collectFileReferences(value, out) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const item of value) collectFileReferences(item, out);
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    if (key === 'filePath' && typeof item === 'string' && item) out.add(item);
    else if (key === 'attachments' && Array.isArray(item)) {
      for (const attachment of item) {
        if (attachment && typeof attachment.path === 'string') out.add(attachment.path);
      }
    } else collectFileReferences(item, out);
  }
}

const basenameOf = (value) => path.basename(String(value).split('?')[0].split('#')[0]);

/** 表是否有 `data` 列（`shadow_history` / `snapshot_conflicts` / `collection_versions` 等无此列） */
export function tableHasDataColumn(db, table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((column) => column.name === 'data');
}

/** 读整表（仅 data 列表）；非 JSON 行跳过 */
function readDataRows(db, table) {
  return db.prepare(`SELECT id, data FROM ${table}`).all()
    .map((row) => {
      try { return { id: row.id, data: JSON.parse(row.data) }; } catch { return null; }
    })
    .filter(Boolean);
}

export function planCleanup({ db, uploadsDir, backupsDir, keep = 14 }) {
  const fileRefs = new Set();
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all()
    .map((row) => row.name)
    .filter((name) => !['attachments', 'sessions', 'collection_versions', 'seed_meta'].includes(name));
  for (const table of tables) {
    // 2026-10-26 Task 6：按 PRAGMA 动态判断，无 `data` 列的表（shadow_history / snapshot_conflicts）跳过
    if (!tableHasDataColumn(db, table)) continue;
    for (const row of db.prepare(`SELECT data FROM ${table}`).all()) {
      try { collectFileReferences(JSON.parse(row.data), fileRefs); } catch { /* 非 JSON 行跳过 */ }
    }
  }

  const attachmentRows = db.prepare('SELECT id, path FROM attachments').all();
  const attachmentRefs = new Set(attachmentRows.map((row) => row.path).filter(Boolean));
  for (const ref of attachmentRefs) fileRefs.add(ref);
  const referencedNames = new Set([...fileRefs].map(basenameOf).filter(Boolean));

  const uploadFiles = listFiles(uploadsDir);
  const uploadNames = new Set(uploadFiles.map((file) => path.basename(file)));
  const orphanFiles = uploadFiles.filter((file) => !referencedNames.has(path.basename(file)));
  const danglingAttachmentRows = attachmentRows.filter((row) => row.path && !uploadNames.has(basenameOf(row.path)));

  const backupEntries = fs.existsSync(backupsDir)
    ? fs.readdirSync(backupsDir)
      .map((name) => {
        const full = path.join(backupsDir, name);
        const stat = fs.statSync(full);
        if (!stat.isDirectory() && ['backup.log', 'backup.json'].includes(name)) return null;
        return { name, full, mtimeMs: stat.mtimeMs };
      })
      .filter(Boolean)
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
    : [];
  const oldBackups = backupEntries.slice(keep);

  return { referencedNames, orphanFiles, danglingAttachmentRows, backupEntries, oldBackups, keep };
}

// ════════════════════════════════════════════════════════════════
//  测试残留（`--test-residue`）：ID 前缀 ＋ 标题/日期 双条件
// ════════════════════════════════════════════════════════════════
const idsIn = (rows, predicate) => rows.filter((row) => predicate(row)).map((row) => row.id);

/**
 * 只读规划测试残留删除（不写库）。
 * @returns {{ tables: {table:string, ids:string[], reason:string}[], total:number, sessionsBefore:string|null }}
 */
export function planTestResidue(db, { sessionsBefore = null } = {}) {
  const plans = [];
  const add = (table, ids, reason) => {
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length) plans.push({ table, ids: unique, reason });
    return unique;
  };

  // ① 测试活动：双条件（id 前缀/固定 id ＋ 标题）
  const activities = readDataRows(db, 'activities');
  const testActivityIds = add('activities', idsIn(activities, (row) =>
    (String(row.id).startsWith('act-b31-') && row.data.title === TEST_ACTIVITY_TITLE)
    || (row.id === 'act-ce46b61e' && row.data.title === CROSS_GROUP_ACTIVITY_TITLE)
  ), '测试活动（act-b31-* / act-ce46b61e，标题同时匹配）');
  const activityIdSet = new Set(testActivityIds);

  // ② 测试议题：标题 ＋ 日期 双条件（`issue-102` 无 createdAt，不命中）
  const issues = readDataRows(db, 'issues');
  const testIssueIds = idsIn(issues, (row) =>
    row.data.title === PROGRESS_ISSUE_TITLE
    && String(row.data.createdAt || '').startsWith(PROGRESS_ISSUE_DATE)
  );
  const issueIdSet = new Set(testIssueIds);

  // ③ 测试考勤 / 补课任务：ID 前缀 ＋ 指向测试活动
  const attendances = readDataRows(db, 'attendances');
  add('attendances', idsIn(attendances, (row) =>
    String(row.id).startsWith('att-b31-') && activityIdSet.has(row.data.activityId)
  ), '测试考勤（att-b31-*，指向测试活动）');

  const makeupTasks = readDataRows(db, 'makeup_tasks');
  add('makeup_tasks', idsIn(makeupTasks, (row) =>
    String(row.id).startsWith('mk-b31-') && activityIdSet.has(row.data.activityId)
  ), '测试补课任务（mk-b31-*，指向测试活动）');

  // ④ 活动派生：任务 / 工作组 / 组成员
  const tasks = readDataRows(db, 'tasks');
  add('tasks', idsIn(tasks, (row) =>
    activityIdSet.has(row.data.activityId)
    || (row.data.issueId && issueIdSet.has(row.data.issueId))
    || (row.data.sourceType === 'issue' && issueIdSet.has(row.data.sourceId))
  ), '派生任务（指向测试活动/测试议题）');

  const workgroups = readDataRows(db, 'workgroups');
  const testWorkgroupIds = idsIn(workgroups, (row) =>
    (row.data.sourceType === 'activity' && activityIdSet.has(row.data.sourceId))
    || (['issue', 'review'].includes(row.data.sourceType) && issueIdSet.has(row.data.sourceId))
  );
  add('workgroups', testWorkgroupIds, '派生工作组（sourceType/sourceId 指向测试活动/测试议题）');
  const testWorkgroupSet = new Set(testWorkgroupIds);

  const workgroupMembers = readDataRows(db, 'workgroup_members');
  add('workgroup_members', idsIn(workgroupMembers, (row) => testWorkgroupSet.has(row.data.workgroupId)),
    '派生工作组成员（workgroupId ∈ 待删工作组）');

  // ⑤ 测试通知：`ntc-*` 且指向测试活动/测试议题
  const notices = readDataRows(db, 'notices');
  const noticeMatchesResidue = (row) => {
    if (!String(row.id).startsWith('ntc-')) return false;
    const targetId = row.data.targetId || row.data.sourceId || '';
    if (activityIdSet.has(targetId) || issueIdSet.has(targetId)) return true;
    const targetUrl = String(row.data.targetUrl || '');
    return [...activityIdSet].some((id) => targetUrl.includes(id));
  };
  add('notices', idsIn(notices, noticeMatchesResidue), '测试通知（ntc-*，指向测试活动/测试议题）');

  // ⑥ 议题未读标记：issueId ∈ 测试议题 ＋ at 日期同日（双条件）
  const issueUnread = db.prepare('SELECT id, data FROM issue_unread').all()
    .map((row) => {
      try { return { id: row.id, data: JSON.parse(row.data) }; } catch { return null; }
    })
    .filter(Boolean);
  add('issue_unread', idsIn(issueUnread, (row) =>
    issueIdSet.has(row.data.issueId) && String(row.data.at || '').startsWith(PROGRESS_ISSUE_DATE)
  ), '测试议题未读标记（issueId ∈ 测试议题且 at 同日）');

  // ⑦ 测试议题本身（最后再删）
  add('issues', testIssueIds, `测试议题（标题「${PROGRESS_ISSUE_TITLE}」＋ 日期 ${PROGRESS_ISSUE_DATE}）`);

  // ⑧ 测试种子待办：ID ＋ 标题 双条件
  const todos = readDataRows(db, 'todos');
  add('todos', idsIn(todos, (row) => row.id === SEED_TODO_ID && row.data.title === SEED_TODO_TITLE),
    '测试待办（todo_seed_7 ＋ 标题同时匹配）');

  // ⑨ 可选：sessions 早于指定日期（默认不删）
  if (sessionsBefore) {
    const rows = db.prepare('SELECT token FROM sessions WHERE created_at < ?').all(sessionsBefore);
    add('sessions', rows.map((row) => row.token), `sessions 早于 ${sessionsBefore}（显式指定才删）`);
  }

  // 子表先删、父表后删
  const order = ['workgroup_members', 'workgroups', 'tasks', 'notices', 'issue_unread', 'issues',
    'makeup_tasks', 'attendances', 'activities', 'todos', 'sessions'];
  plans.sort((a, b) => order.indexOf(a.table) - order.indexOf(b.table));

  return {
    tables: plans,
    total: plans.reduce((sum, plan) => sum + plan.ids.length, 0),
    sessionsBefore,
  };
}

/** 在可写连接上按计划删除（单事务；子表顺序由 `planTestResidue` 保证） */
export function applyTestResidue(db, plan) {
  let removed = 0;
  // sessions 的主键是 `token`（其余表为 `id`）
  const keyColumn = (table) => (table === 'sessions' ? 'token' : 'id');
  db.transaction(() => {
    for (const { table, ids } of plan.tables) {
      const del = db.prepare(`DELETE FROM ${table} WHERE ${keyColumn(table)} = ?`);
      for (const id of ids) removed += del.run(id).changes;
    }
  })();
  return removed;
}

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); } catch (e) {
    console.error(`[cleanup] ✖ ${e.message}`);
    process.exit(1);
  }
  const dbPath = path.resolve(args.db || process.env.DB_PATH || path.join(SERVER_DIR, 'data.db'));
  const uploadsDir = path.resolve(args.uploads || process.env.UPLOAD_DIR || path.join(SERVER_DIR, 'uploads'));
  const backupsDir = path.resolve(args.backups || path.join(SERVER_DIR, 'backups'));
  if (!fs.existsSync(dbPath)) {
    console.error(`[cleanup] ✖ 数据库不存在：${dbPath}（用 --db 指定）`);
    process.exit(1);
  }

  let Database;
  try {
    ({ default: Database } = await import('better-sqlite3'));
  } catch (e) {
    console.error(`[cleanup] ✖ 未安装 better-sqlite3（请在 server/ 目录 npm install）：${e.message}`);
    process.exit(1);
  }

  const mode = args.apply ? 'APPLY' : 'DRY-RUN';
  console.log(`[cleanup] ${mode} · db=${dbPath}`);

  if (args.testResidue) {
    const db = new Database(dbPath, { readonly: !args.apply });
    let plan;
    try {
      plan = planTestResidue(db, { sessionsBefore: args.sessionsBefore });
    } finally {
      db.close();
    }
    console.log(`[cleanup]   测试残留计划：${plan.tables.length} 张表 / ${plan.total} 行`);
    for (const { table, ids, reason } of plan.tables) {
      const preview = ids.slice(0, 8).join(', ') + (ids.length > 8 ? ` …（共 ${ids.length}）` : '');
      console.log(`[cleanup]     ${table}: ${ids.length} 行 — ${reason}\n        ${preview}`);
    }
    if (!args.sessionsBefore) console.log('[cleanup]   sessions：未删除（默认保留；确需清理请加 --sessions-before <日期>）');
    if (!plan.total) {
      console.log('[cleanup]   未发现测试残留。');
      return;
    }
    if (!args.apply) {
      console.log('[cleanup] 未删除任何内容（dry-run）。确认后加 --apply。');
      return;
    }
    const dbWrite = new Database(dbPath);
    let removed = 0;
    try { removed = applyTestResidue(dbWrite, plan); } finally { dbWrite.close(); }
    console.log(`[cleanup] ✔ 已删除测试残留：${removed} 行（${plan.tables.map((p) => p.table).join(' / ')}）`);
    console.log('[cleanup] 未触碰任何真实业务行（双条件白名单）。');
    return;
  }

  const db = new Database(dbPath, { readonly: !args.apply });
  let plan;
  try {
    plan = planCleanup({ db, uploadsDir, backupsDir, keep: args.keep });
  } finally {
    db.close();
  }

  console.log(`[cleanup]   上传目录：${uploadsDir}（文件 ${listFiles(uploadsDir).length}）`);
  console.log(`[cleanup]   备份目录：${backupsDir}（现有 ${plan.backupEntries.length} 份，保留 ${plan.keep}）`);
  console.log(`[cleanup]   ① 孤儿附件：${plan.orphanFiles.length}${plan.orphanFiles.length ? '\n      ' + plan.orphanFiles.slice(0, 20).map((file) => path.relative(uploadsDir, file)).join('\n      ') : ''}`);
  console.log(`[cleanup]   ② 悬空附件行：${plan.danglingAttachmentRows.length}${plan.danglingAttachmentRows.length ? '\n      ' + plan.danglingAttachmentRows.slice(0, 20).map((row) => `${row.id} → ${row.path}`).join('\n      ') : ''}`);
  console.log(`[cleanup]   ③ 旧备份（超出 ${plan.keep} 份）：${plan.oldBackups.length}${plan.oldBackups.length ? '\n      ' + plan.oldBackups.map((entry) => entry.name).join('\n      ') : ''}`);

  if (!args.apply) {
    console.log('[cleanup] 未删除任何内容（dry-run）。确认后加 --apply。');
    return;
  }

  let removedFiles = 0;
  for (const file of plan.orphanFiles) {
    fs.rmSync(file, { force: true });
    removedFiles++;
  }
  let removedRows = 0;
  if (plan.danglingAttachmentRows.length) {
    const dbWrite = new Database(dbPath);
    try {
      const remove = dbWrite.prepare('DELETE FROM attachments WHERE id = ?');
      dbWrite.transaction((ids) => { for (const id of ids) remove.run(id); })(plan.danglingAttachmentRows.map((row) => row.id));
      removedRows = plan.danglingAttachmentRows.length;
    } finally { dbWrite.close(); }
  }
  let removedBackups = 0;
  for (const entry of plan.oldBackups) {
    fs.rmSync(entry.full, { recursive: true, force: true });
    removedBackups++;
  }
  console.log(`[cleanup] ✔ 已删除：孤儿附件 ${removedFiles} · 悬空附件行 ${removedRows} · 旧备份 ${removedBackups}`);
  console.log('[cleanup] 未触碰任何业务表记录。');
}

main().catch((e) => {
  console.error('[cleanup] ✖ 失败：', e && e.message ? e.message : e);
  process.exit(1);
});
