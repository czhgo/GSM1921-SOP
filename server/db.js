// server/db.js — SQLite 初始化与建表
import Database from 'better-sqlite3';
import { WorkgroupStatus, workgroupStatusForTaskforce } from '../docs/src/core/domain/domain.js';
// R4-D04：考察记录回填与 mock hydrate 同源（纯函数，勿在服务端另写一套匹配规则）
import { migrateInspectionWorkgroupKeys, migrateReviewParentKeys } from '../docs/src/services/activity/inspection-migrate.js';
import { DEFAULT_BRANCH_ID, ACTIVITY_SCOPES, isBranchLevelActivity, normalizeOrganizingScope } from '../docs/src/core/domain/constants.js';

// 资源表：每张表 id 主键 + data JSON（保持与前端数据结构完全一致，嵌套字段零损失）
// T-218：新增 4 张 niche 表（经验沉淀/合规引用/文件空间/图片记录），与前端快照 payload 键名对齐
// T-209 全栈同步：补齐前端 mockDB 全部持久化域（报名/复盘/宣传/档案/外发确认 + 子记录聚合域），
// 使 API 模式下全部持久化域均有后端表支撑。act_sub_records/tf_sub_records
// 为对象聚合域，以「__root__ 单行」模式存储（见 data-adapter.js 封装）。
const RESOURCE_TABLES = [
  'users', 'activities', 'tasks', 'attendances', 'inspections',
  'taskforces', 'notices', 'todos', 'assignments', 'makeup_tasks',
  'experience_deposits', 'file_space_records', 'image_records',
  'signups', 'activity_reviews', 'taskforce_reviews', 'prop_tasks', 'periodic_archive_submissions',
  'archive_records', 'external_dispatches',
  'act_sub_records', 'tf_sub_records',
  'branch_docs', 'member_change_requests', 'committee_broadcasts',
  'agenda_votes',
  // 2026-09-02 党委后台 P1：支部多实例（br-b1 + 党委动态创建的支部，config 配置档案同存）
  'branches',
  // 2026-09-02 党委后台 P2：支书任期记录（党委任命/撤换档案）
  'appointment_records',
  // 2026-09-02 党委后台 P3：支部上报审批（发展节点/活动报备 → 党委批驳档案）
  'review_requests',
  // 2026-09-12 意见反馈「真匿名」→ **2026-09-17 支书改裁**：issues 表（仅 server/routes/resources.js 语义端点读写，
  // 不在 resources.js RESOURCE_TABLES 映射内 → 无通用 CRUD / 不进快照写穿；落库字段白名单）。
  //   旧口径：后台记真实提交人 `_realPersonId`、党委可通过 reveal 核查。D-824 已改为支部内闭环、无系统揭名入口；
  //   当前真实提交人只在服务端受保护字段保留，常规读口脱敏，旧接口拒绝所有角色；
  //   「正式表决无记名」不受本改裁影响（两段式：参与记录 + tally，逐人选项不落库）。
  'issues',
  // R-23（2026-09-13）：思想汇报建服务端表——原「服务端无表」使系统通知 authorize 只能采信
  //   客户端自述的 personId（无法验对象）。建表后 authorize 可据表复算「提交人本人或有权阅处角色」。
  'thought_reports',
  // 2026-09-14 批次 25：党小组一等实体（支书特批；组长由成员档案派生，本表仅落组级留痕）
  'party_groups',
  // 2026-09-14 批次 25：成员流动台账（流入/流出复式记账；登记即生效、可撤销留痕）
  'member_flows',
  // 2026-09-17 旧匿名反馈揭名留痕表；D-824 起停写，仅保留历史记录且无系统读取入口。
  // 不在资源 CRUD 映射内，避免通用快照或资源接口读写历史留痕。
  'issue_reveals',
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
  for (const t of [...RESOURCE_TABLES, ...SEMANTIC_TABLES]) {
    db.exec(`CREATE TABLE IF NOT EXISTS ${t} (id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
  }
  db.exec(`CREATE TABLE IF NOT EXISTS ${COLLECTION_VERSIONS_TABLE} (name TEXT PRIMARY KEY, version INTEGER NOT NULL DEFAULT 0)`);
  applyMigrations(db); ensureActivityArchiveIndexes(db); return db; // 迁移机制接入点（2026-09-25）：与 return 同行 ⇒ 上文行号零漂移（db.js 是 README-server.md 取证靶点）；2026-10-24 批次 508 追加归档读口索引（幂等、不抬 schema 版本）
}

// 辅助：整表替换写入（写穿透快照用）。table 限定白名单，杜绝 SQL 注入。
export function replaceCollection(db, table, rows) {
  if (!RESOURCE_TABLES.includes(table) && !SEMANTIC_TABLES.includes(table)) {
    throw new Error(`未知资源表: ${table}`);
  }
  db.exec(`DELETE FROM ${table}`);
  const stmt = db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`);
  for (const row of rows) {
    stmt.run(row.id, JSON.stringify(row));
  }
}

// ════════════════════════════════════════════════════════════════
//  P0-1（2026-09-23 支书裁定「系统一周内上服务器」· 六项 P0）：快照写穿的**集合版本号（乐观锁）**与**事务**
// ════════════════════════════════════════════════════════════════
// 病灶：`POST /snapshot` 逐集合 `replaceCollection`（DELETE + INSERT）**无事务** ⇒ 中途异常留下半空集合；
//   且无并发保护 ⇒ 同集合的两个在线会话，后写者以落后的内存快照整表覆盖前写者刚落库的数据（静默丢数据）。
// 协议（判据单一源＝`server/routes/resources.js` 末尾「快照写穿的集合版本号协议」段）：
//   请求 payload 内**可选** `_versions`（集合名→基线版本）；不一致 ⇒ 整批 409（不写）；一致 ⇒ 事务内
//   逐集合替换 + 版本 +1，回传 `{versions}`。**未带 `_versions` 的集合按无条件写**（兼容既有直连调用）。
// ⚠ 本段整体置于文件末尾：上文 `SCHEMA` / `initDb` / `replaceCollection` 的行号是 README-server.md 的取证靶点
//   （`doc-line-ref.test.mjs` 逐条核），插入一行即漂移 ⇒ 新增一律追加在文件尾部。
//   `COLLECTION_VERSIONS_TABLE` 虽被 `initDb` 引用，但模块顶层常量在导入方调用 `initDb` 前已完成求值 ⇒ 置尾安全。

/** 集合版本号表名（乐观锁；关系表，与 sessions/attachments 同类——**不动既有业务表结构**） */
export const COLLECTION_VERSIONS_TABLE = 'collection_versions';

/** 读全部集合版本（无行 ⇒ 0：该集合的「首次上传」服务端基线） */
export function readCollectionVersions(db) {
  const out = {};
  for (const r of db.prepare(`SELECT name, version FROM ${COLLECTION_VERSIONS_TABLE}`).all()) {
    out[r.name] = r.version;
  }
  return out;
}

/** 单集合版本 +1（**须在调用方事务内**；无行 ⇒ 以 0 为基线），返回新版本 */
export function bumpCollectionVersion(db, name) {
  const row = db.prepare(`SELECT version FROM ${COLLECTION_VERSIONS_TABLE} WHERE name = ?`).get(name);
  const next = (row ? row.version : 0) + 1;
  db.prepare(`INSERT OR REPLACE INTO ${COLLECTION_VERSIONS_TABLE} (name, version) VALUES (?, ?)`).run(name, next);
  return next;
}

/**
 * 快照写穿：**一个事务**内逐集合整表替换 + 版本号 +1 ⇒ **要么全成、要么全不动**（不再出现半空集合）。
 * `replaceCollection` 本身是纯 DELETE + INSERT 语句，在事务内调用天然可重入（better-sqlite3 嵌套 `transaction` 亦支持）。
 * @param {Object} db better-sqlite3 实例
 * @param {Array<{name:string, table:string, rows:Array}>} writes 本次要写的集合（name = 快照 payload 键）
 * @returns {Object<string, number>} 各集合写后的新版本号
 */
export function replaceCollectionsAtomic(db, writes, { workgroups = [] } = {}) {
  const run = db.transaction((items, relatedWorkgroups) => {
    const versions = {};
    for (const it of items) {
      replaceCollection(db, it.table, it.rows);
      versions[it.name] = bumpCollectionVersion(db, it.name);
    }
    for (const workgroup of relatedWorkgroups) {
      db.prepare('INSERT OR REPLACE INTO workgroups (id, data) VALUES (?, ?)')
        .run(workgroup.id, JSON.stringify(workgroup));
    }
    if (relatedWorkgroups.length > 0) bumpCollectionVersion(db, 'workgroups');
    // v11 影子表随快照整表重建（非权威源；只在快照覆盖活动/专班时执行）
    if (items.some((it) => ['activities', 'taskforces'].includes(it.name))) rebuildShadowTables(db);
    return versions;
  });
  return run(writes, workgroups);
}

// ════════════════════════════════════════════════════════════════
//  语义端点表（2026-09-23 批次 163）：无服务端对源的三域补齐
// ════════════════════════════════════════════════════════════════
// 病灶（只读审计核实）：`handoffs` / `pendingMemberConfirmations` / `milestones` 三域**只有浏览器本地一份**——
//   · `handoffs` 在 mock-adapter 落盘清单里，却**不在**前端快照 payload、**不在** init 拉取列表、
//     **不在** `resources.js` 的资源名映射 ⇒ api 形态下 `mockDB.handoffs` 恒为 `[]`，写入只活在当前页内存，
//     下次 init 被覆盖（=刷新即丢）。
//   · `pendingMemberConfirmations` 只存 localStorage 键 `gsm1921-member-confirmations` ⇒ 清缓存 = 死锁
//     （旧版 transferOut 存量请求的唯一出口就是这个队列）。
//   · `milestones` 只读静态文件 `docs/data/milestones.json` ⇒ 服务端无表、无对源。
// 模板＝**语义端点域**（照 `agenda_votes`）：给服务端表 + 逐域语义端点（`resources.js` 末「语义端点」段），
//   **故意不进快照 payload**（这些域的写口是语义端点，走快照会被防抖窗口里的陈旧缓存覆盖）；
//   `init()` 逐域拉取填充 mockDB 缓存（与 `agendaVotes` 同一取法）。
// ⚠ 本表**独立于 `RESOURCE_TABLES`**（不是它的追加）：`RESOURCE_TABLES` 的长度是
//   `content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md` 与 `.ctx/SNAPSHOT.md` 的**对账数字**
//   （守卫 `doc-consistency.test.mjs::S5` 逐条核）——那两份文档不在本批可改面内，
//   故新增的三张表另立本表（建表 + `replaceCollection` 白名单同源），`RESOURCE_TABLES` 一字不动。
//   ⇒ 它们也**不进快照写穿**（快照只写 `resources.js` 的资源名映射，那映射里没有这三张）。
export const SEMANTIC_TABLES = [
  // 三委数据交接（T-304 C2 §E.2；端点见 resources.js「三委数据交接」段）
  'handoffs',
  // 名册成员变更确认请求队列（附录⑩ S4；端点见 resources.js「成员变更确认」段）
  'member_confirmations',
  // 批次里程碑（内容单一源 = docs/data/milestones.json，seed.js 播种；端点只读）
  'milestones',
  // ── 2026-09-24 批次 169（支书逐字「不能什么都依靠浏览器缓存」）：三域「只有本机一份」的收口 ──
  // 出勤申诉队列 / 考察申诉队列（端点见 resources.js「申诉队列」段；写门见各端点 requireXxx）——
  //   原各只存 localStorage 键 gsm1921-attendance-appeals / gsm1921-inspection-appeals ⇒ 清缓存即队列灭失。
  'attendance_appeals',
  'inspection_appeals',
  // 意见反馈「逐人未读标记」（端点见 resources.js「反馈未读标记」段）——原按人分键
  //   gsm1921-issue-unread-<assigneeId> 存 localStorage ⇒ 清缓存即清零、换设备读不到。
  'issue_unread',
  // 授权审计留痕（端点见 resources.js「授权审计留痕」段）——原只存 localStorage 键 sop_org_os_auth_audit
  //   ⇒ 清缓存即留痕灭失。留痕的意义＝让「谁给谁赋了什么角色」这条治理承诺可被事后核对（只增不改）。
  'auth_audit',
  // 工作组子域和应到名单快照不属于既有语义表；由 schema v3 迁移建立。
];

const WORKGROUP_TABLES = Object.freeze([
  'workgroups', 'workgroup_members', 'workgroup_grants', 'workgroup_tasks', 'workgroup_outputs', 'attendance_rosters',
]);

// ════════════════════════════════════════════════════════════════
//  最小可用迁移机制（2026-09-25）：PRAGMA user_version 版本号 + 有序 migration 列表
// ════════════════════════════════════════════════════════════════
// 病灶（只读审计实测）：全库 45 张表**没有任何版本化迁移**——建表全在 initDb 的
//   `CREATE TABLE IF NOT EXISTS`（`SCHEMA` / `RESOURCE_TABLES` / `SEMANTIC_TABLES` / `collection_versions`）里，
//   `PRAGMA user_version` 恒为 0；表结构变更语句（`ALTER`）全库 0 处。「结构改了但线上库没跟着改」无从发现＝头号技术债。
// 做法（**叠加，不替换**）：既有 `CREATE TABLE IF NOT EXISTS` 路径**一字不动**（仍负责建表）；
//   本机制只在其上补「版本号 + 有序迁移」：
//   · `MIGRATIONS` ＝ `[{ version, name, tables?, up(db) }]`（version 严格递增、唯一）；
//   · `v1` ＝ **基线迁移**：把「机制落地时的 schema 现状」登记下来——`up()` 幂等重放 db.js 自建的
//     CREATE TABLE IF NOT EXISTS（此刻 initDb 已建过，纯幂等重放，**不改数据、不删改既有路径**），
//     并把 `user_version` 由 0 抬到 1 ⇒ 既有真库（含数据）首次启动即登记为 v1，**一行数据不动**。
//   · 今后**新增或变更结构一律走 v2、v3…**（在 up() 里建表 / ALTER，并在 `tables` 里登记表名）。
// 启动期：`initDb` 末尾调用 `applyMigrations(db)`——未应用的迁移**按序、在一个事务内**执行，每项跑完写回
//   `user_version`；**失败即抛**（better-sqlite3 `transaction` 自动整体回滚，含 `user_version` 与 DDL）⇒
//   **启动报错、绝不静默吞**。幂等可重入：已应用（version ≤ user_version）者跳过。
// ⚠ 本段整体置于文件末尾：上文 `SCHEMA` / `initDb` / `replaceCollection` 的行号是 `README-server.md` 的取证
//   靶点（`doc-line-ref.test.mjs` 逐条核）——接入点与 `return db;` **同行**，故上文行号零漂移。

/** v1 冻结表清单：34 资源表 + 7 语义表 + sessions/attachments/collection_versions；新表必须走后续迁移。 */
const BASELINE_TABLES = [
  'users', 'activities', 'tasks', 'attendances', 'inspections', 'taskforces', 'notices', 'todos', 'assignments', 'makeup_tasks', 'experience_deposits', 'file_space_records',
  'image_records', 'signups', 'activity_reviews', 'taskforce_reviews', 'prop_tasks', 'weekly_reports', 'archive_records', 'external_dispatches', 'act_sub_records', 'tf_sub_records', 'branch_docs',
  'member_change_requests', 'committee_broadcasts', 'agenda_votes', 'branches', 'appointment_records', 'review_requests', 'issues', 'thought_reports', 'party_groups', 'member_flows', 'issue_reveals',
  'handoffs', 'member_confirmations', 'milestones', 'attendance_appeals', 'inspection_appeals', 'issue_unread', 'auth_audit', 'sessions', 'attachments', 'collection_versions',
];

/**
 * 有序迁移列表。每项＝`{ version, name, tables?, up(db) }`：
 *   · `version`：正整数，**严格递增且唯一**（`validateMigrations` 自检）；
 *   · `name`：可读标识；
 *   · `tables`：本项新增 / 变更的表名（供守卫核对「新增结构是否写了迁移」；基线项登记现状表名）；
 *   · `up(db)`：幂等变更（建表 / ALTER）；**须可在事务内重入**。
 * ⚠ 新增结构**必须**追加新的 version（并在 `tables` 里登记表名），否则 `db-integrity-guard` 会判红。
 */
export const MIGRATIONS = [
  {
    version: 1,
    name: 'baseline-2026-09-25',
    tables: BASELINE_TABLES,
    up(db) {
      // 幂等重放 db.js 自建 DDL（此刻 initDb 已完成同样动作 ⇒ 纯标记；既有路径与数据不受影响）
      db.exec(SCHEMA);
      for (const t of BASELINE_TABLES.filter((name) => !['sessions', 'attachments', 'collection_versions'].includes(name))) {
        db.exec(`CREATE TABLE IF NOT EXISTS ${t} (id TEXT PRIMARY KEY, data TEXT NOT NULL)`);
      }
      db.exec(`CREATE TABLE IF NOT EXISTS ${COLLECTION_VERSIONS_TABLE} (name TEXT PRIMARY KEY, version INTEGER NOT NULL DEFAULT 0)`);
    },
  },
  {
    // v2（2026-10-02 批次 342 · 支书裁「甲」· 全域 CRUD 探查 `CRUD-1`）：
    //   **删死表 `compliance_references`**——该表全仓**无 UI 消费方、无写口、无字段契约**（批次 192/193 `D-653`
    //   即已查实），支书 2026-10-02 圈定「删表」。**只 DROP、不迁数据**（表内既有数据即无意义数据）。
    version: 2,
    name: 'drop-compliance-references',
    tables: [],
    up(db) {
      db.exec('DROP TABLE IF EXISTS compliance_references');
    },
  },
  {
    version: 3,
    name: 'workgroups-and-attendance-rosters',
    tables: WORKGROUP_TABLES,
    up(db) {
      for (const table of WORKGROUP_TABLES) db.exec('CREATE TABLE IF NOT EXISTS ' + table + ' (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
      // 旧活动与专班的业务 ID 保持原样；新工作组 ID 可由旧 ID 稳定重建。
      const users = new Map(db.prepare('SELECT id, data FROM users').all().map((r) => [r.id, JSON.parse(r.data)]));
      const groups = new Map(db.prepare('SELECT id, data FROM party_groups').all().map((r) => [r.id, JSON.parse(r.data)]));
      const groupNameByBranch = new Map([...groups.values()].map((g) => [`${g.branchId}:${g.name}`, g.id]));
      const write = (table, row) => db.prepare(`INSERT OR IGNORE INTO ${table} (id, data) VALUES (?, ?)`).run(row.id, JSON.stringify(row));
      const addMembers = (workgroup, members) => {
        for (const member of Array.isArray(members) ? members : []) {
          if (!member || !member.personId) continue;
          const role = ['organizer', 'deep', 'participant'].includes(member.role) ? member.role : 'participant';
          const id = `wgm-${encodeURIComponent(workgroup.id)}-${encodeURIComponent(String(member.personId))}`;
          write('workgroup_members', {
            id, branchId: workgroup.branchId, workgroupId: workgroup.id,
            personId: String(member.personId), role, status: 'active',
            createdBy: 'migration-v3', createdAt: workgroup.createdAt || new Date(0).toISOString(),
            migratedFromLegacy: true,
          });
        }
      };
      for (const row of db.prepare('SELECT id, data FROM activities').all()) {
        const activity = JSON.parse(row.data);
        const id = activity.workgroupId || `wg-activity-${row.id}`;
        const organizer = users.get(activity.organizer);
        const branchId = activity.branchId || organizer?.branchId || null;
        const hostGroupId = activity.hostGroupId || (branchId && activity.hostGroup ? groupNameByBranch.get(`${branchId}:${activity.hostGroup}`) : null) || null;
        const workgroup = {
          id, branchId, kind: 'activity', sourceType: 'activity', sourceId: row.id,
          name: activity.title || row.id, status: activity.archived ? WorkgroupStatus.ARCHIVED : WorkgroupStatus.ACTIVE,
          // 组织落点只有两档；旧 cross-group 读取别名在此即归一（批次 502）。
          organizingScope: activity.organizingScope ? normalizeOrganizingScope(activity.organizingScope, activity) : null,
          hostGroupId,
          migrationState: activity.organizingScope ? 'ready' : 'pending-review',
          createdAt: activity.createdAt || null,
        };
        write('workgroups', workgroup);
        addMembers(workgroup, activity.assignments);
        const migratedActivity = {
          ...activity,
          ...(branchId && !activity.branchId ? { branchId } : {}),
          ...(hostGroupId && !activity.hostGroupId ? { hostGroupId } : {}),
          workgroupId: id,
        };
        if (JSON.stringify(migratedActivity) !== JSON.stringify(activity)) {
          db.prepare('UPDATE activities SET data = ? WHERE id = ?').run(JSON.stringify(migratedActivity), row.id);
        }
      }
      for (const row of db.prepare('SELECT id, data FROM taskforces').all()) {
        const taskforce = JSON.parse(row.data);
        const id = taskforce.workgroupId || `wg-taskforce-${row.id}`;
        const manager = users.get(taskforce.manager);
        const initiator = users.get(taskforce.initiator);
        const candidates = [manager?.branchId, initiator?.branchId].filter(Boolean);
        const branchId = taskforce.branchId || (new Set(candidates).size === 1 ? candidates[0] : null);
        const workgroup = {
          id, branchId, kind: 'taskforce', sourceType: 'taskforce', sourceId: row.id,
          name: taskforce.name || row.id,
          status: taskforce.deletedAt ? WorkgroupStatus.ARCHIVED : workgroupStatusForTaskforce(taskforce.status),
          migrationState: 'pending-review', createdAt: taskforce.createdAt || null,
        };
        write('workgroups', workgroup);
        addMembers(workgroup, taskforce.members);
        if (!taskforce.workgroupId) {
          db.prepare('UPDATE taskforces SET data = ? WHERE id = ?').run(JSON.stringify({ ...taskforce, workgroupId: id }), row.id);
        }
      }
    },
  },
  {
    version: 4,
    name: 'periodic-archive-generic-submissions',
    tables: ['periodic_archive_submissions'],
    drops: ['weekly_reports'],
    up(db) {
      db.exec('CREATE TABLE IF NOT EXISTS periodic_archive_submissions (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
      const branchByPerson = new Map(db.prepare('SELECT id, data FROM users').all()
        .map((row) => [row.id, JSON.parse(row.data).branchId || null]));
      const write = db.prepare('INSERT OR IGNORE INTO periodic_archive_submissions (id, data) VALUES (?, ?)');
      for (const legacy of db.prepare('SELECT id, data FROM weekly_reports').all()) {
        const row = JSON.parse(legacy.data);
        // 旧资源诞生于单支部时期；可按提交人名册归属时优先取名册，缺失时沿用当时唯一支部。
        const migrated = { ...row, branchId: row.branchId || branchByPerson.get(row.submittedBy) || DEFAULT_BRANCH_ID };
        write.run(legacy.id, JSON.stringify(migrated));
      }
      db.exec('DROP TABLE weekly_reports');
    },
  },
  {
    // v5（IA 审查 R4-D04，2026-10-20）：考察记录补稳定父键 workgroupId。
    //   旧记录只按 sourceName 串专班名 ⇒ 改名断链、同名串数据。这里只改 inspections 的 JSON 行，
    //   **不动表结构**；回填函数与 mock hydrate 同源（docs/src/services/activity/inspection-migrate.js）。
    version: 5,
    name: 'inspection-workgroup-key',
    tables: [],
    up(db) {
      // 最小库 / 旧库可能尚未建 inspections 表（如只做 weekly_reports 迁移的测试库）⇒ 无可回填
      const hasInspections = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'inspections'").get();
      if (!hasInspections) return;
      const rows = db.prepare('SELECT id, data FROM inspections').all();
      if (rows.length === 0) return;
      const parseAll = (table) => db.prepare(`SELECT data FROM ${table}`).all().map((row) => JSON.parse(row.data));
      const result = migrateInspectionWorkgroupKeys({
        records: rows.map((row) => JSON.parse(row.data)),
        workgroups: parseAll('workgroups'),
        taskforces: parseAll('taskforces'),
      });
      const update = db.prepare('UPDATE inspections SET data = ? WHERE id = ?');
      result.rows.forEach((row, index) => {
        if (JSON.stringify(row) !== rows[index].data) update.run(JSON.stringify(row), rows[index].id);
      });
    },
  },
  {
    // v6（数据生命周期 P1-05/M1-M2，2026-10-20）：复盘补稳定父键。
    //   旧复盘只按 sourceName 关联专班 ⇒ 改名断链、同名串数据。只改 JSON 行，
    //   **不动表结构**；回填函数与 mock hydrate 同源（inspection-migrate.js::migrateReviewParentKeys）。
    version: 6,
    name: 'review-parent-keys',
    tables: [],
    up(db) {
      const hasTable = (name) => db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);
      if (!hasTable('activity_reviews') && !hasTable('taskforce_reviews')) return;
      const readTable = (table) => (hasTable(table) ? db.prepare(`SELECT id, data FROM ${table}`).all() : []);
      const parseAll = (table) => (hasTable(table) ? db.prepare(`SELECT data FROM ${table}`).all().map((row) => JSON.parse(row.data)) : []);
      const activityRows = readTable('activity_reviews');
      const taskforceRows = readTable('taskforce_reviews');
      if (activityRows.length === 0 && taskforceRows.length === 0) return;

      const result = migrateReviewParentKeys({
        activityReviews: activityRows.map((row) => JSON.parse(row.data)),
        taskforceReviews: taskforceRows.map((row) => JSON.parse(row.data)),
        activities: parseAll('activities'),
        workgroups: parseAll('workgroups'),
        taskforces: parseAll('taskforces'),
      });
      const writeBack = (table, rows, nextRows) => {
        if (!hasTable(table)) return;
        const update = db.prepare(`UPDATE ${table} SET data = ? WHERE id = ?`);
        nextRows.forEach((row, index) => {
          if (JSON.stringify(row) !== rows[index].data) update.run(JSON.stringify(row), rows[index].id);
        });
      };
      writeBack('activity_reviews', activityRows, result.activityReviews);
      writeBack('taskforce_reviews', taskforceRows, result.taskforceReviews);
    },
  },
  {
    // v7（2026-10-20 支书裁定）：人员主键由 p* 迁移为学号/工号。
    //   · users.id 先改，再改所有引用列（sessions.person_id / attachments.uploaded_by / 各 JSON 表）；
    //   · 一次事务；任何无法映射的旧 id ⇒ 抛错并整体回滚（不静默丢、不部分写入）；
    //   · 幂等：已全为学号时 mapped=0，rate=1。
    version: 7,
    name: 'person-id-student-number',
    tables: [],
    up(db) {
      const report = migratePersonIdsToStudentNumbers(db);
      console.log('[db] v7 人员主键迁移：', JSON.stringify(report));
    },
  },
  {
    // v8（2026-10-21 批次 499/502 · 支书补充口径）：跨组活动也必须落到承办党小组。
    //   · 支委会 / 党员大会 / 党课属支部级法定会议 ⇒ organizingScope='branch'，不塞党小组；
    //   · 其余一律 party-group（v10 起「跨组」只由 recruitmentScope 表达），无 hostGroupId 的旧行
    //     ⇒ legacyHostGroup=true（不猜测归属，编辑时补选）。
    version: 8,
    name: 'activity-host-group-scope',
    tables: [],
    up(db) {
      const hasActivities = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'activities'").get();
      if (!hasActivities) return;
      const rows = db.prepare('SELECT id, data FROM activities').all();
      const update = db.prepare('UPDATE activities SET data = ? WHERE id = ?');
      let reclassified = 0;
      let legacy = 0;
      let scopeFilled = 0;
      for (const row of rows) {
        const activity = JSON.parse(row.data);
        let changed = false;
        if (isBranchLevelActivity(activity)) {
          if (activity.organizingScope !== ACTIVITY_SCOPES.BRANCH) {
            activity.organizingScope = ACTIVITY_SCOPES.BRANCH;
            reclassified += 1;
            changed = true;
          }
        } else if (!activity.organizingScope) {
          // 旧行只有党小组名称派生的 hostGroupId（v3 已补）⇒ 承办范围可由既有字段确定，不算猜测。
          if (activity.hostGroupId) {
            activity.organizingScope = ACTIVITY_SCOPES.PARTY_GROUP;
            scopeFilled += 1;
            changed = true;
          } else if (!activity.legacyHostGroup) {
            activity.legacyHostGroup = true;
            legacy += 1;
            changed = true;
          }
        } else if (activity.organizingScope === ACTIVITY_SCOPES.CROSS_GROUP) {
          activity.organizingScope = ACTIVITY_SCOPES.PARTY_GROUP;
          if (!activity.hostGroupId && !activity.legacyHostGroup) {
            activity.legacyHostGroup = true;
            legacy += 1;
          }
          scopeFilled += 1;
          changed = true;
        }
        if (activity.organizingScope === ACTIVITY_SCOPES.BRANCH && activity.hostGroupId) {
          activity.hostGroupId = null;
          activity.hostGroup = '';
          changed = true;
        }
        if (changed) update.run(JSON.stringify(activity), row.id);
      }
      console.log(`[db] v8 活动组织落点：支部级重分类=${reclassified} 补承办范围=${scopeFilled} 待补责任组=${legacy}`);
    },
  },
  {
    // v9（B-499-8，2026-10-21）：种子版本元数据。浏览器侧早有 `SEED_DATA_VERSION`，
    //   服务端此前只在 users==0 时播种 ⇒ 既有库永不跟随种子更新。本表只存三件事：
    //   · `seed_version`：最近一次种子行修复/播种对应的 `docs/src/core/domain/domain.js::SEED_DATA_VERSION`；
    //   · `mode`：`demo` / `baseline`（rebuild-demo.mjs 写入）；
    //   · `updated_at`：写入时间。
    //   ⚠ 本迁移只建表，不改任何业务行；修复逻辑在 server/seed-repair.js，启动期在事务内只更新既有 seed id。
    version: 9,
    name: 'seed-meta',
    tables: ['seed_meta'],
    up(db) {
      db.exec('CREATE TABLE IF NOT EXISTS seed_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    },
  },
  {
    // v10（2026-10-21 批次 502 · 支书补充口径）：组织落点收敛为两档。
    //   · organizingScope='cross-group' ⇒ 'party-group'；保留 hostGroupId / hostGroup；
    //   · 非支部级活动缺 hostGroupId ⇒ legacyHostGroup=true（不猜测归属，组织台补选）；
    //   · 工作组成员含跨党小组深参（能按用户档案判定时）且活动未标 cross-group 招募
    //     ⇒ 补 recruitmentScope='cross-group'，协调人取本支部 org-commissioner（无则 null）；
    //   · 活动工作组镜像同步两档落点与招募字段。逐行仅在内容变化时写回，重复执行零改写。
    version: 10,
    name: 'activity-scope-two-tier',
    tables: [],
    up(db) {
      const hasTable = (name) => !!db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);
      if (!hasTable('activities')) return;
      const parseAll = (table) => (hasTable(table) ? db.prepare(`SELECT data FROM ${table}`).all().map((row) => JSON.parse(row.data)) : []);
      const activities = parseAll('activities');
      const workgroups = parseAll('workgroups');
      const members = parseAll('workgroup_members');
      const users = parseAll('users');
      const groups = parseAll('party_groups');
      const groupById = new Map(groups.map((group) => [String(group.id), group]));
      const groupByName = new Map(groups.map((group) => [`${group.branchId || DEFAULT_BRANCH_ID}:${group.name}`, group]));
      const userById = new Map(users.map((user) => [String(user.id), user]));
      const commissionerByBranch = new Map();
      for (const user of users.filter((row) => row.role === 'org-commissioner')) {
        const branchId = user.branchId || DEFAULT_BRANCH_ID;
        if (!commissionerByBranch.has(branchId)) commissionerByBranch.set(branchId, user.id);
      }
      const membersByWorkgroup = new Map();
      for (const member of members.filter((row) => row.status !== 'removed')) {
        const key = String(member.workgroupId || '');
        if (!membersByWorkgroup.has(key)) membersByWorkgroup.set(key, []);
        membersByWorkgroup.get(key).push(member);
      }
      const workgroupById = new Map(workgroups.map((row) => [String(row.id), row]));
      const updateActivity = db.prepare('UPDATE activities SET data = ? WHERE id = ?');
      const updateWorkgroup = hasTable('workgroups')
        ? db.prepare('UPDATE workgroups SET data = ? WHERE id = ?') : null;
      let scopeNormalized = 0;
      let legacyMarked = 0;
      let recruitmentFilled = 0;
      let workgroupsNormalized = 0;
      for (const activity of activities) {
        const rowId = activity.id;
        const branchId = activity.branchId || DEFAULT_BRANCH_ID;
        const normalizedScope = normalizeOrganizingScope(activity.organizingScope, activity);
        let changed = false;
        if (activity.organizingScope !== normalizedScope) {
          activity.organizingScope = normalizedScope;
          scopeNormalized += 1;
          changed = true;
        }
        if (normalizedScope === ACTIVITY_SCOPES.BRANCH) {
          if (activity.hostGroupId || activity.hostGroup) {
            activity.hostGroupId = null;
            activity.hostGroup = '';
            changed = true;
          }
        } else if (!activity.hostGroupId && !activity.legacyHostGroup) {
          activity.legacyHostGroup = true;
          legacyMarked += 1;
          changed = true;
        }

        const hostGroup = activity.hostGroupId
          ? groupById.get(String(activity.hostGroupId))
          : (activity.hostGroup ? groupByName.get(`${branchId}:${activity.hostGroup}`) : null);
        if (hostGroup && activity.hostGroup !== hostGroup.name) {
          activity.hostGroup = hostGroup.name;
          changed = true;
        }
        const workgroupId = activity.workgroupId || `wg-activity-${rowId}`;
        const memberRows = membersByWorkgroup.get(String(workgroupId)) || [];
        const crossDeep = !!hostGroup && memberRows.some((member) => {
          if (member.role !== 'deep') return false;
          if (member.crossGroup === true) return true;
          const person = userById.get(String(member.personId));
          return !!person?.partyGroup && person.partyGroup !== hostGroup.name;
        });
        if (crossDeep && activity.recruitmentScope !== 'cross-group') {
          activity.recruitmentScope = 'cross-group';
          activity.crossGroupCoordinatorId = commissionerByBranch.get(branchId) || null;
          recruitmentFilled += 1;
          changed = true;
        }
        if (changed) updateActivity.run(JSON.stringify(activity), rowId);

        const workgroup = workgroupById.get(String(workgroupId));
        if (!workgroup || workgroup.kind !== 'activity' || !updateWorkgroup) continue;
        let workgroupChanged = false;
        const mirroredScope = normalizeOrganizingScope(workgroup.organizingScope, activity);
        if (workgroup.organizingScope !== mirroredScope) {
          workgroup.organizingScope = mirroredScope;
          workgroupChanged = true;
        }
        if (mirroredScope === ACTIVITY_SCOPES.BRANCH) {
          if (workgroup.hostGroupId) {
            workgroup.hostGroupId = null;
            workgroupChanged = true;
          }
        } else if (activity.hostGroupId && workgroup.hostGroupId !== activity.hostGroupId) {
          workgroup.hostGroupId = activity.hostGroupId;
          workgroupChanged = true;
        }
        if (activity.recruitmentScope === 'cross-group'
          && (workgroup.recruitmentScope !== 'cross-group'
            || workgroup.crossGroupCoordinatorId !== activity.crossGroupCoordinatorId)) {
          workgroup.recruitmentScope = 'cross-group';
          workgroup.crossGroupCoordinatorId = activity.crossGroupCoordinatorId || null;
          workgroupChanged = true;
        }
        if (workgroupChanged) {
          updateWorkgroup.run(JSON.stringify(workgroup), workgroup.id);
          workgroupsNormalized += 1;
        }
      }
      console.log(`[db] v10 活动组织落点两档：落点归一=${scopeNormalized} 待补承办组=${legacyMarked} 补跨组招募=${recruitmentFilled} 工作组镜像=${workgroupsNormalized}`);
    },
  },
  {
    // v11（2026-10-23 批次 504 · 第九轮 schema 方案 · 支书令「三项一起」）：
    //   ① todos 增 branch_id 并回填（父行 → 所属人 → NULL，不猜测）；
    //   ② 五张热表增 generated stored 列与复合索引（为 P13 读过滤下推）；
    //   ③ 建影子子表 agenda_items / taskforce_contributions 并回填。
    // ⚠ 影子表**不是权威源**：读写仍走 JSON；只有 schema-split-readiness 全真后才可切。
    version: 11,
    name: 'todo-branch-pushdown-shadow',
    tables: ['agenda_items', 'taskforce_contributions'],
    up(db) {
      const hasTable = (name) => !!db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);
      // ⚠ 用 table_xinfo（table_info 不列 generated 列）——否则重跑 v11 会误判「列不存在」而重复 ADD。
      const columns = (table) => (hasTable(table) ? db.prepare(`PRAGMA table_xinfo(${table})`).all().map((c) => c.name) : []);
      const parseAll = (table) => (hasTable(table) ? db.prepare(`SELECT data FROM ${table}`).all().map((row) => JSON.parse(row.data)) : []);

      // ① Todo 归属列 + 回填
      if (hasTable('todos') && !columns('todos').includes('branch_id')) {
        db.exec('ALTER TABLE todos ADD COLUMN branch_id TEXT');
      }
      if (hasTable('todos')) {
        const activityBranch = new Map(parseAll('activities').map((row) => [String(row.id), row.branchId || null]));
        const taskforceBranch = new Map(parseAll('taskforces').map((row) => [String(row.id), row.branchId || null]));
        const noticeBranch = new Map(parseAll('notices').map((row) => [String(row.id), row.branchId || null]));
        const userBranch = new Map(parseAll('users').map((row) => [String(row.id), row.branchId || null]));
        const update = db.prepare('UPDATE todos SET data = ?, branch_id = ? WHERE id = ?');
        let filled = 0;
        let unresolved = 0;
        for (const row of db.prepare('SELECT id, data FROM todos').all()) {
          const todo = JSON.parse(row.data);
          if (todo.branchId) continue;
          const parent = todo.sourceType === 'activity' ? activityBranch.get(String(todo.sourceId || ''))
            : todo.sourceType === 'taskforce' ? taskforceBranch.get(String(todo.sourceId || ''))
              : todo.sourceType === 'notice' ? noticeBranch.get(String(todo.sourceId || ''))
                : null;
          const branchId = parent || userBranch.get(String(todo.personId || '')) || null;
          if (!branchId) { unresolved += 1; continue; }
          todo.branchId = branchId;
          update.run(JSON.stringify(todo), branchId, row.id);
          filled += 1;
        }
        console.log(`[db] v11 待办归属回填：已归属=${filled} 待归属=${unresolved}`);
        db.exec('CREATE INDEX IF NOT EXISTS idx_todos_branch ON todos(branch_id)');
      }

      // ② 热表可下推列（generated stored）+ 复合索引
      const addGenerated = (table, column, expr) => {
        if (!hasTable(table) || columns(table).includes(column)) return;
        try {
          // ⚠ SQLite 对**已有数据**的表不允许 `ALTER ... ADD ... STORED`（仅空表可用）⇒ 统一用 VIRTUAL：
          //   读时计算、可建索引、无需表重建；升级既有演示库/真库都安全。
          db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} TEXT GENERATED ALWAYS AS (${expr}) VIRTUAL`);
        } catch (e) {
          throw new Error(`[db] v11 加列失败 ${table}.${column}：${e.message}（现有列：${columns(table).join(',')}）`);
        }
      };
      addGenerated('attendances', 'branch_id', "json_extract(data,'$.branchId')");
      addGenerated('attendances', 'status', "json_extract(data,'$.status')");
      addGenerated('attendances', 'person_id', "json_extract(data,'$.personId')");
      addGenerated('attendances', 'activity_id', "json_extract(data,'$.activityId')");
      addGenerated('inspections', 'branch_id', "json_extract(data,'$.branchId')");
      addGenerated('inspections', 'activity_id', "json_extract(data,'$.activityId')");
      addGenerated('notices', 'branch_id', "json_extract(data,'$.branchId')");
      addGenerated('activities', 'branch_id', "json_extract(data,'$.branchId')");
      addGenerated('activities', 'status', "json_extract(data,'$.status')");
      const createIndex = (table, sql) => { if (hasTable(table)) db.exec(sql); };
      createIndex('attendances', 'CREATE INDEX IF NOT EXISTS idx_attendances_branch_status ON attendances(branch_id, status)');
      createIndex('attendances', 'CREATE INDEX IF NOT EXISTS idx_attendances_branch_person_activity ON attendances(branch_id, person_id, activity_id)');
      createIndex('inspections', 'CREATE INDEX IF NOT EXISTS idx_inspections_branch_activity ON inspections(branch_id, activity_id)');
      createIndex('notices', 'CREATE INDEX IF NOT EXISTS idx_notices_branch ON notices(branch_id)');
      createIndex('activities', 'CREATE INDEX IF NOT EXISTS idx_activities_branch_status ON activities(branch_id, status)');

      // ③ 影子子表（非权威源）＋ 回填
      db.exec('CREATE TABLE IF NOT EXISTS agenda_items (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
      db.exec('CREATE TABLE IF NOT EXISTS taskforce_contributions (id TEXT PRIMARY KEY, data TEXT NOT NULL)');
      rebuildShadowTables(db, { record: false });
    },
  },
];

/** 迁移列表的最大版本（＝目标 schema 版本；守卫据此核 `user_version`，防「有迁移没跑」/「版本号被手改」） */
export const SCHEMA_VERSION = MIGRATIONS.reduce((mx, m) => Math.max(mx, m.version), 0);

/**
 * 迁移列表自检（守卫与启动期共用）：version 严格递增且唯一、每项有 name 与 up 函数。
 * @returns {string[]} 问题清单（空数组＝通过）
 */
export function validateMigrations(list) {
  const problems = [];
  if (!Array.isArray(list) || list.length < 1) return ['迁移列表为空'];
  const seen = new Set();
  let prev = 0;
  list.forEach((m, i) => {
    const at = `第 ${i + 1} 项（${m && m.name ? m.name : '无名'}）`;
    if (!m || !Number.isInteger(m.version) || m.version < 1) { problems.push(`${at} 的 version 非法：${m && m.version}`); return; }
    if (seen.has(m.version)) problems.push(`${at} 的 version 重复：${m.version}`);
    if (m.version <= prev) problems.push(`${at} 的 version 未严格递增：${m.version} ≤ 前一项 ${prev}`);
    if (typeof m.name !== 'string' || !m.name.trim()) problems.push(`${at} 缺 name（迁移须可读可辨）`);
    if (typeof m.up !== 'function') problems.push(`${at} 缺 up 函数（空迁移＝写了等于没写）`);
    seen.add(m.version);
    prev = m.version;
  });
  return problems;
}

/**
 * 应用未应用的迁移：自检列表 → 取 `user_version` → 过滤 `version > current` 并**按序**在一个事务内执行，
 * 每项跑完写回 `user_version` → 打印已应用版本。**失败向上抛（不吞）**，事务整体回滚。
 * @param {Object} db better-sqlite3 实例
 * @param {Array} [list=MIGRATIONS] 迁移列表（仅测试注入用；生产恒为 `MIGRATIONS`）
 * @returns {{from:number, to:number, applied:number[]}}
 */
export function applyMigrations(db, list = MIGRATIONS) {
  const problems = validateMigrations(list);
  if (problems.length) throw new Error(`[db] 迁移列表自检未通过，拒绝启动：\n  ${problems.join('\n  ')}`);
  const current = Number(db.pragma('user_version', { simple: true })) || 0;
  const pending = list.filter((m) => m.version > current).sort((a, b) => a.version - b.version);
  if (!pending.length) return { from: current, to: current, applied: [] };
  const run = db.transaction(() => {
    for (const m of pending) {
      m.up(db);
      db.pragma(`user_version = ${m.version}`);
    }
  });
  run();
  const to = pending[pending.length - 1].version;
  console.log(`[db] schema v${to}（本次应用 ${pending.length} 项）`);
  return { from: current, to, applied: pending.map((m) => m.version) };
}

// ════════════════════════════════════════════════════════════════
//  v11 影子子表（2026-10-23 批次 504）：**非权威源**，只做双写与比对
// ════════════════════════════════════════════════════════════════
// 切表判据见 `server/scripts/schema-split-readiness.mjs` 与 `content/04_web_design/data/DATA_MODEL.md §2.3.2`：
//   只有「规模/409/子项查询」任一 + 影子连续 7 天 mismatch=0 + 保留期已裁，才可把权威源切到子表。
//   本函数只重建影子表，不改 JSON 主表、不改任何读路径。
export function rebuildShadowTables(db, { record = true } = {}) {
  const has = (name) => !!db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);
  if (!has('agenda_items') || !has('taskforce_contributions')) return { agenda: 0, contributions: 0 };
  const run = db.transaction(() => {
    db.exec('DELETE FROM agenda_items');
    db.exec('DELETE FROM taskforce_contributions');
    const insAgenda = db.prepare('INSERT OR REPLACE INTO agenda_items (id, data) VALUES (?, ?)');
    const insContribution = db.prepare('INSERT OR REPLACE INTO taskforce_contributions (id, data) VALUES (?, ?)');
    let agenda = 0;
    let contributions = 0;
    if (has('activities')) {
      for (const row of db.prepare('SELECT data FROM activities').all()) {
        const activity = JSON.parse(row.data);
        (Array.isArray(activity.agenda) ? activity.agenda : []).forEach((item, index) => {
          const id = `${activity.id}:${index}:${item?.id || ''}`;
          insAgenda.run(id, JSON.stringify({ id, activityId: activity.id, seq: index, ...item }));
          agenda += 1;
        });
      }
    }
    if (has('taskforces')) {
      for (const row of db.prepare('SELECT data FROM taskforces').all()) {
        const taskforce = JSON.parse(row.data);
        for (const member of (Array.isArray(taskforce.members) ? taskforce.members : [])) {
          for (const [index, contribution] of (Array.isArray(member.contributions) ? member.contributions : []).entries()) {
            const id = `${taskforce.id}:${member.personId}:${index}:${contribution?.id || ''}`;
            insContribution.run(id, JSON.stringify({
              id, taskforceId: taskforce.id, workgroupId: taskforce.workgroupId || null,
              personId: member.personId, role: member.role || null, ...contribution,
            }));
            contributions += 1;
          }
        }
      }
    }
    return { agenda, contributions };
  });
  const rebuilt = run();
  // C4 证据：重建后立即记一条当日比对结果（每日一条、幂等覆盖；写失败不影响本次重建）
  if (record) recordShadowSnapshot(db);
  return rebuilt;
}

/** 影子比对：JSON 主表展开后的行集 vs 子表行集（按稳定键比较，返回 mismatch 明细） */
export function compareShadowTables(db) {
  const has = (name) => !!db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);
  if (!has('agenda_items') || !has('taskforce_contributions')) return { mismatch: 0, agenda: 0, contributions: 0, details: [] };
  const expectedAgenda = new Map();
  const expectedContributions = new Map();
  if (has('activities')) {
    for (const row of db.prepare('SELECT data FROM activities').all()) {
      const activity = JSON.parse(row.data);
      (Array.isArray(activity.agenda) ? activity.agenda : []).forEach((item, index) => {
        const id = `${activity.id}:${index}:${item?.id || ''}`;
        expectedAgenda.set(id, JSON.stringify({ id, activityId: activity.id, seq: index, ...item }));
      });
    }
  }
  if (has('taskforces')) {
    for (const row of db.prepare('SELECT data FROM taskforces').all()) {
      const taskforce = JSON.parse(row.data);
      for (const member of (Array.isArray(taskforce.members) ? taskforce.members : [])) {
        for (const [index, contribution] of (Array.isArray(member.contributions) ? member.contributions : []).entries()) {
          const id = `${taskforce.id}:${member.personId}:${index}:${contribution?.id || ''}`;
          expectedContributions.set(id, JSON.stringify({
            id, taskforceId: taskforce.id, workgroupId: taskforce.workgroupId || null,
            personId: member.personId, role: member.role || null, ...contribution,
          }));
        }
      }
    }
  }
  const details = [];
  const check = (table, expected, label) => {
    const actual = new Map(db.prepare(`SELECT id, data FROM ${table}`).all().map((row) => [row.id, row.data]));
    for (const [id, json] of expected) {
      if (!actual.has(id)) { details.push({ label, id, kind: 'missing' }); continue; }
      if (actual.get(id) !== json) details.push({ label, id, kind: 'diff' });
    }
    for (const id of actual.keys()) if (!expected.has(id)) details.push({ label, id, kind: 'extra' });
  };
  check('agenda_items', expectedAgenda, 'agenda');
  check('taskforce_contributions', expectedContributions, 'contributions');
  return {
    mismatch: details.length, agenda: expectedAgenda.size, contributions: expectedContributions.size,
    // 按子表拆分（C4 历史要分别留 agenda / contributions 的 mismatch 数；details 只留前 20 条供定位）
    mismatchByLabel: { agenda: details.filter((d) => d.label === 'agenda').length, contributions: details.filter((d) => d.label === 'contributions').length },
    details: details.slice(0, 20),
  };
}

/** v11 回滚：只删影子表与索引；`todos.branch_id` 数据保留（列可留，符合「回滚不丢数据」） */
export function rollbackV11(db) {
  db.exec('DROP TABLE IF EXISTS agenda_items');
  db.exec('DROP TABLE IF EXISTS taskforce_contributions');
  for (const index of [
    'idx_todos_branch', 'idx_attendances_branch_status', 'idx_attendances_branch_person_activity',
    'idx_inspections_branch_activity', 'idx_notices_branch', 'idx_activities_branch_status',
  ]) db.exec(`DROP INDEX IF EXISTS ${index}`);
  db.pragma('user_version = 10');
}

// ════════════════════════════════════════════════════════════════
//  v7 人员主键迁移（p* → 学号/工号）
// ════════════════════════════════════════════════════════════════
//  · 先改 users.id，再改引用（sessions.person_id / attachments.uploaded_by / 全部 JSON 表）；
//  · JSON 表逐行走查：字符串**整值**命中旧 id ⇒ 换学号；`id` 里的复合串（`p11:issue-002`、
//    `wgm-…-p13`）按边界换写，其余自由文本（备注 / 审计原文）一律不动；
//  · 无法映射 ⇒ 先收集清单再抛（此时尚未写库），外层迁移事务整体回滚；
//  · 幂等：全为学号时没有任何旧 id 命中 ⇒ `{total:0,mapped:0,unmapped:[],rate:1}`。
export function migratePersonIdsToStudentNumbers(db) {
  const tables = [...new Set([...RESOURCE_TABLES, ...SEMANTIC_TABLES, ...WORKGROUP_TABLES])];
  const hasTable = (name) => Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name));
  const unmapped = new Set();
  let total = 0;
  let mapped = 0;
  const conflicts = [];

  // ① 旧 IAAA 代理键 `p_<uuid>`：表内无固定映射，改按该行自带 `studentId` 归一到学号
  //    （旧库可能残留；没有 studentId ⇒ 进 unmapped 清单，拒绝半写）。
  const userRows = hasTable('users') ? db.prepare('SELECT id, data FROM users').all() : [];
  const proxyAlias = new Map();
  for (const row of userRows) {
    if (!/^p_[0-9a-f][0-9a-f-]{6,}$/i.test(row.id)) continue;
    let data; try { data = JSON.parse(row.data); } catch { continue; }
    const sid = data?.studentId != null ? String(data.studentId) : '';
    if (sid && !isLegacyPersonId(sid) && !/^p_/i.test(sid)) proxyAlias.set(row.id, sid);
  }
  const mapId = (value) => (proxyAlias.has(value) ? proxyAlias.get(value) : mapPersonId(value));
  const isLegacyAny = (value) => typeof value === 'string' && (isLegacyPersonId(value) || proxyAlias.has(value));

  const mapExact = (value) => {
    if (!isLegacyAny(value)) return value;
    total += 1;
    const next = mapId(value);
    if (next == null) { unmapped.add(value); return value; }
    mapped += 1;
    return next;
  };

  // 复合 id（`p11:issue-002` / `wgg-seed-tf-001-p5`）：仅换边界上的旧 id
  const mapComposite = (value) => {
    if (typeof value !== 'string') return value;
    return value.replace(/(^|[-:])p(?:_pc|_[0-9a-f][0-9a-f-]{6,}|\d+)(?=$|[-:])/gi, (match, prefix) => {
      const token = match.slice(prefix.length);
      total += 1;
      const next = mapId(token);
      if (next == null) { unmapped.add(token); return match; }
      mapped += 1;
      return prefix + next;
    });
  };

  // 对象键里的人员 id：历史 `agenda[].personStages` 形如 `{p6:'发展对象'}`（值递归不会碰到键）
  const KEYED_PERSON_MAPS = new Set(['personStages']);
  // 数字型人员 id（历史 `audiencePersons: 17` / `reads: [13]`）：只在这些「人员数组」键下归一
  const NUMERIC_PERSON_ARRAYS = new Set(['audiencePersons', 'reads', 'voterIds', 'personIds', 'assigneeIds', 'actionPersonIds']);

  const transform = (value, parentKey) => {
    if (typeof value === 'number') {
      if (!NUMERIC_PERSON_ARRAYS.has(parentKey) || !Number.isInteger(value)) return value;
      total += 1;
      const next = mapId(`p${value}`);
      if (next == null || /^p\d+$/.test(next)) { unmapped.add(`number:${value}`); return value; }
      mapped += 1;
      return next;
    }
    if (typeof value === 'string') return mapExact(value);
    if (Array.isArray(value)) return value.map((item) => transform(item, parentKey));
    if (value && typeof value === 'object') {
      const out = {};
      for (const [key, item] of Object.entries(value)) {
        const nextKey = KEYED_PERSON_MAPS.has(parentKey) ? mapExact(key) : key;
        out[nextKey] = transform(item, key);
      }
      return out;
    }
    return value;
  };

  const plans = [];
  // ① users 先改：id 即学号（人员档案的 studentId 与行主键必须一致）
  for (const row of userRows) {
    const nextId = mapComposite(row.id);
    const data = transform(JSON.parse(row.data));
    if (typeof data.id === 'string') data.id = mapComposite(data.id);
    // 历史空 studentId：主键已被迁移则用新学号回填（否则迁移后档案自相矛盾）
    if ((data.studentId == null || data.studentId === '') && nextId !== row.id && !isLegacyAny(nextId)) {
      data.studentId = String(nextId);
    }
    if (data.studentId != null && String(data.studentId) !== String(nextId ?? data.id)) {
      unmapped.add(`users.id≠studentId:${row.id}->${data.studentId}`);
    }
    if (data.id !== nextId) data.id = nextId;
    if (nextId !== row.id || JSON.stringify(data) !== row.data) {
      plans.push({ table: 'users', id: row.id, nextId, data: JSON.stringify(data) });
    }
  }

  // ② 其余 JSON 表：整值换学号 + `id` 复合串换写
  for (const table of tables) {
    if (table === 'users' || !hasTable(table)) continue;
    for (const row of db.prepare(`SELECT id, data FROM ${table}`).all()) {
      const nextId = mapComposite(row.id);
      let data;
      try { data = JSON.parse(row.data); } catch { continue; }
      const nextData = transform(data);
      if (nextData && typeof nextData === 'object' && typeof nextData.id === 'string') {
        nextData.id = mapComposite(nextData.id);
      }
      if (nextId !== row.id || JSON.stringify(nextData) !== row.data) {
        plans.push({ table, id: row.id, nextId, data: JSON.stringify(nextData) });
      }
    }
  }

  // ③ 关系表：sessions.person_id / attachments.uploaded_by
  const relationPlans = [];
  if (hasTable('sessions')) {
    for (const row of db.prepare('SELECT token, person_id FROM sessions').all()) {
      const next = mapExact(row.person_id);
      if (next !== row.person_id) relationPlans.push({ table: 'sessions', key: row.token, column: 'person_id', next });
    }
  }
  if (hasTable('attachments')) {
    for (const row of db.prepare('SELECT id, uploaded_by FROM attachments').all()) {
      const next = mapExact(row.uploaded_by);
      if (next !== row.uploaded_by) relationPlans.push({ table: 'attachments', key: row.id, column: 'uploaded_by', next });
    }
  }

  // ④ 目标主键冲突预检（F-18）：任何一条在 UPDATE 时会撞主键的映射 ⇒ 先列清单、整体不写。
  //    （迁移事务在 applyMigrations 内；此处抛错 ⇒ 不产生半写库。）
  const plannedById = new Map();
  for (const plan of plans) {
    if (plan.nextId === plan.id) continue;
    const key = `${plan.table}\u0000${plan.nextId}`;
    const existing = plannedById.get(key);
    if (existing && existing !== plan.id) conflicts.push(`${plan.table}: ${existing} 与 ${plan.id} 均映射到 ${plan.nextId}`);
    else plannedById.set(key, plan.id);
  }
  for (const plan of plans) {
    if (plan.nextId === plan.id || !hasTable(plan.table)) continue;
    const clash = db.prepare(`SELECT 1 FROM ${plan.table} WHERE id = ?`).get(String(plan.nextId));
    if (!clash) continue;
    const renamedAway = plans.some((p) => p.table === plan.table && p.id === String(plan.nextId) && p.nextId !== p.id);
    if (!renamedAway) conflicts.push(`${plan.table}: ${plan.id} → ${plan.nextId} 的目标主键已存在`);
  }
  if (conflicts.length) {
    throw new Error(`[db] v7 人员主键迁移预检失败（未写入任何行）：${[...new Set(conflicts)].join('；')}`);
  }

  if (unmapped.size > 0) {
    throw new Error(`[db] v7 人员主键迁移失败：存在无法映射的旧人员 id / 不一致档案：${[...unmapped].join('、')}`);
  }

  const run = db.transaction(() => {
    // users 必须先落，其余表再引用新 id
    for (const plan of plans.sort((a, b) => (a.table === 'users' ? -1 : b.table === 'users' ? 1 : 0))) {
      db.prepare(`UPDATE ${plan.table} SET id = ?, data = ? WHERE id = ?`).run(plan.nextId, plan.data, plan.id);
    }
    for (const plan of relationPlans) {
      db.prepare(`UPDATE ${plan.table} SET ${plan.column} = ? WHERE ${plan.table === 'sessions' ? 'token' : 'id'} = ?`).run(plan.next, plan.key);
    }
  });
  run();

  return {
    total,
    mapped,
    unmapped: [...unmapped],
    rate: total === 0 ? 1 : Number((mapped / total).toFixed(4)),
  };
}

// 迁移专用映射（置尾：import 声明被提升，避免上文 README-server.md 取证行号漂移）
import { isLegacyPersonId, mapPersonId } from './migrations/legacy-person-ids.js';

// ════════════════════════════════════════════════════════════════
//  拆表闸门证据（2026-10-23 · spec refine-ui-system-and-close-r10 Task 10）
// ════════════════════════════════════════════════════════════════
// C2「同一行 7 天乐观锁 409」与 C4「影子每日比对历史」都要**可复核**，故各留一张证据表：
//   · snapshot_conflicts：快照版本冲突（真正返回 409 的那一批）逐集合记一行；
//   · shadow_history：每日一条 `compareShadowTables` 结果（agenda / contributions 分别记 mismatch 与行数）。
// 两张表**首次写入时懒建**（`CREATE TABLE IF NOT EXISTS`），不进 `initDb`：
//   新建库的表集合因此不变（db-integrity-guard 的冻结表基线不动），也不参与任何读路径。
// ⚠ 证据仅供 `server/scripts/schema-split-readiness.mjs` 判定；JSON 主表仍是唯一权威源，本段不改读写路径。
// ⚠ 所有写入 try/catch + `console.warn`：埋点失败不得改变 409 语义，也不得让快照写入失败。

/** 409 埋点表（懒建；只增不改，无业务读取入口） */
export const SNAPSHOT_CONFLICTS_TABLE = 'snapshot_conflicts';

/** 影子比对历史表（懒建；day 主键 ⇒ 每日最多一条、重复记录幂等覆盖） */
export const SHADOW_HISTORY_TABLE = 'shadow_history';

/** 409 的「行」粒度：快照版本协议是**整批 409**，冲突清单只到集合级 ⇒ row_id='*' 表示该集合整体冲突 */
const CONFLICT_ROW_SENTINEL = '*';

const GATE_TABLES_DDL = `
CREATE TABLE IF NOT EXISTS ${SNAPSHOT_CONFLICTS_TABLE} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  collection TEXT NOT NULL,
  row_id TEXT NOT NULL,
  occurred_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_snapshot_conflicts_row ON ${SNAPSHOT_CONFLICTS_TABLE}(collection, row_id, occurred_at);
CREATE TABLE IF NOT EXISTS ${SHADOW_HISTORY_TABLE} (
  day TEXT PRIMARY KEY,
  agenda_mismatch INTEGER NOT NULL,
  contribution_mismatch INTEGER NOT NULL,
  agenda_rows INTEGER NOT NULL,
  contribution_rows INTEGER NOT NULL,
  recorded_at TEXT NOT NULL
);
`;

function gateTableExists(db, table) {
  return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table);
}

function gateIso(value) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

/** 本地自然日（YYYY-MM-DD）；与 D1 日期口径一致，不用 UTC 切串 */
function gateLocalDay(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * 记一条 409 冲突（写入点＝`snapshot-versions.js::recordSnapshotConflicts`，由快照路由在真正返回 409 时调用）。
 * @returns {boolean} 是否写入成功（失败只 warn，不抛）
 */
export function recordSnapshotConflict(db, { collection, rowId = CONFLICT_ROW_SENTINEL, at = new Date() } = {}) {
  if (!collection) return false;
  try {
    db.exec(GATE_TABLES_DDL);
    db.prepare(`INSERT INTO ${SNAPSHOT_CONFLICTS_TABLE} (collection, row_id, occurred_at) VALUES (?, ?, ?)`)
      .run(String(collection), rowId == null ? CONFLICT_ROW_SENTINEL : String(rowId), gateIso(at));
    return true;
  } catch (e) {
    console.warn(`[db] 409 埋点写入失败（不影响 409 响应）：${e.message}`);
    return false;
  }
}

/**
 * 近 N 天 409 计数（只读；表不存在 ⇒ 全 0，不建表）。
 * 按 (collection,rowId) 聚合 ⇒ `maxByRow` 就是「同一行/N 天最多冲突几次」。
 * @returns {{windowDays:number, since:string, total:number, byRow:Array<{collection:string,rowId:string,count:number}>, maxByRow:number}}
 */
export function getConflictCounts(db, days = 7) {
  const windowDays = Number(days) > 0 ? Number(days) : 7;
  const since = new Date(Date.now() - windowDays * 86400000).toISOString();
  if (!gateTableExists(db, SNAPSHOT_CONFLICTS_TABLE)) return { windowDays, since, total: 0, byRow: [], maxByRow: 0 };
  const rows = db.prepare(
    `SELECT collection, row_id, COUNT(*) AS n FROM ${SNAPSHOT_CONFLICTS_TABLE}
      WHERE occurred_at >= ? GROUP BY collection, row_id ORDER BY n DESC, collection ASC, row_id ASC`,
  ).all(since);
  const byRow = rows.map((row) => ({ collection: row.collection, rowId: row.row_id, count: Number(row.n) }));
  return {
    windowDays, since,
    total: byRow.reduce((sum, row) => sum + row.count, 0),
    byRow,
    maxByRow: byRow.length ? byRow[0].count : 0,
  };
}

/**
 * 记一条当日影子比对结果（每日一条、幂等覆盖）。影子子表不存在则不记（避免把「未建表」记成 mismatch=0）。
 * @returns {Object|null} 写入的读数；失败/跳过返回 null
 */
export function recordShadowSnapshot(db, at = new Date()) {
  try {
    if (!gateTableExists(db, 'agenda_items') || !gateTableExists(db, 'taskforce_contributions')) return null;
    const shadow = compareShadowTables(db);
    db.exec(GATE_TABLES_DDL);
    const day = gateLocalDay(at);
    db.prepare(
      `INSERT OR REPLACE INTO ${SHADOW_HISTORY_TABLE}
        (day, agenda_mismatch, contribution_mismatch, agenda_rows, contribution_rows, recorded_at) VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(day, shadow.mismatchByLabel.agenda, shadow.mismatchByLabel.contributions, shadow.agenda, shadow.contributions, gateIso(at));
    return {
      day,
      agendaMismatch: shadow.mismatchByLabel.agenda,
      contributionMismatch: shadow.mismatchByLabel.contributions,
      mismatch: shadow.mismatch,
      agendaRows: shadow.agenda,
      contributionsRows: shadow.contributions,
    };
  } catch (e) {
    console.warn(`[db] 影子比对历史写入失败（不影响快照）：${e.message}`);
    return null;
  }
}

/**
 * 近 N 天影子比对历史（只读；表不存在 ⇒ 空列表，不建表）。按 day 倒序。
 * @returns {{windowDays:number, sinceDay:string, dayCount:number, zeroMismatchDays:number, days:Array}}
 */
export function getShadowHistory(db, days = 7) {
  const windowDays = Number(days) > 0 ? Number(days) : 7;
  const sinceDay = gateLocalDay(new Date(Date.now() - (windowDays - 1) * 86400000));
  if (!gateTableExists(db, SHADOW_HISTORY_TABLE)) {
    return { windowDays, sinceDay, dayCount: 0, zeroMismatchDays: 0, days: [] };
  }
  const rows = db.prepare(`SELECT * FROM ${SHADOW_HISTORY_TABLE} WHERE day >= ? ORDER BY day DESC`).all(sinceDay);
  const list = rows.map((row) => ({
    day: row.day,
    agendaMismatch: Number(row.agenda_mismatch),
    contributionMismatch: Number(row.contribution_mismatch),
    mismatch: Number(row.agenda_mismatch) + Number(row.contribution_mismatch),
    agendaRows: Number(row.agenda_rows),
    contributionsRows: Number(row.contribution_rows),
    recordedAt: row.recorded_at,
  }));
  return {
    windowDays, sinceDay,
    dayCount: list.length,
    zeroMismatchDays: list.filter((row) => row.mismatch === 0).length,
    days: list,
  };
}

// ════════════════════════════════════════════════════════════════
//  2026-10-24 批次 508：活动归档读口索引（幂等，不新增 schema 版本）
// ════════════════════════════════════════════════════════════════
// 理由：`GET /activities?archived=true` 的过滤已下推到 SQL（`server/routes/resources/index.js`），
//   若 activities 上无归档相关索引，按支部/归档态取数只能全表扫（归档库逐年增长）。
// 写法说明：v11 已为 activities 建了 `branch_id` / `status` 生成列与 `idx_activities_branch_status`，
//   但**没有** archived 列；为避免为一个索引抬 schema 版本（会触发全库迁移登记），此处用
//   **表达式索引**，且表达式与读口 WHERE 逐字一致（`IFNULL(json_extract(data,'$.archived'),0)`），
//   保证查询能命中索引；`IF NOT EXISTS` ⇒ 可幂等重入（新库 / 存量库 / 回滚后均安全）。
//   列序按「归档态在前、状态在后」：归档读口的主判据是 archived（选择性最高），status 供可选状态过滤。
export function ensureActivityArchiveIndexes(db) {
  db.exec("CREATE INDEX IF NOT EXISTS idx_activities_archived_status ON activities(IFNULL(json_extract(data,'$.archived'),0), status)");
}
