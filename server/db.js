// server/db.js — SQLite 初始化与建表
import Database from 'better-sqlite3';

// 资源表：每张表 id 主键 + data JSON（保持与前端数据结构完全一致，嵌套字段零损失）
// T-218：新增 4 张 niche 表（经验沉淀/合规引用/文件空间/图片记录），与前端快照 payload 键名对齐
// T-209 全栈同步：补齐前端 mockDB 全部持久化域（报名/复盘/宣传/档案/外发确认 + 子记录聚合域），
// 使 API 模式下全部持久化域均有后端表支撑。act_sub_records/tf_sub_records
// 为对象聚合域，以「__root__ 单行」模式存储（见 data-adapter.js 封装）。
const RESOURCE_TABLES = [
  'users', 'activities', 'tasks', 'attendances', 'inspections',
  'taskforces', 'notices', 'todos', 'assignments', 'makeup_tasks',
  'experience_deposits', 'file_space_records', 'image_records',
  'signups', 'activity_reviews', 'taskforce_reviews', 'prop_tasks', 'weekly_reports',
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
  //   改裁后的口径：匿名＝**前端展示层匿名**——后台记真实提交人 `_realPersonId`，**常规读出口一律脱敏**，
  //   唯一可见出口＝党委核查端点 GET /api/v1/issues/reveal（仅 party-staff，**每次查看留痕** issue_reveals）；
  //   「正式表决无记名」不受本改裁影响（两段式：参与记录 + tally，逐人选项不落库）。
  'issues',
  // R-23（2026-09-13）：思想汇报建服务端表——原「服务端无表」使系统通知 authorize 只能采信
  //   客户端自述的 personId（无法验对象）。建表后 authorize 可据表复算「提交人本人或有权阅处角色」。
  'thought_reports',
  // 2026-09-14 批次 25：党小组一等实体（支书特批；组长由成员档案派生，本表仅落组级留痕）
  'party_groups',
  // 2026-09-14 批次 25：成员流动台账（流入/流出复式记账；登记即生效、可撤销留痕）
  'member_flows',
  // 2026-09-17 批次 51：匿名反馈「查看真身」留痕（支书改裁「查看匿名的权限只有党委有」）。
  //   留痕的意义＝让「只有党委能看」这条承诺**可被事后核对**——没有它，该承诺无从证伪。
  //   仅在 GET /api/v1/issues/reveal 命中时写入一条；不在 resources.js RESOURCE_TABLES 映射内
  //   ⇒ 无通用 CRUD 入口（前端不能自行造/改留痕）。
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
  applyMigrations(db); return db; // 迁移机制接入点（2026-09-25）：与 return 同行 ⇒ 上文行号零漂移（db.js 是 README-server.md 取证靶点）
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
export function replaceCollectionsAtomic(db, writes) {
  const run = db.transaction((items) => {
    const versions = {};
    for (const it of items) {
      replaceCollection(db, it.table, it.rows);
      versions[it.name] = bumpCollectionVersion(db, it.name);
    }
    return versions;
  });
  return run(writes);
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
];

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

/** v1 基线覆盖的**全部** db.js 自建表（冻结现状：35 资源表 + 7 语义表 + `sessions`/`attachments` + `collection_versions`） */
const BASELINE_TABLES = [
  ...RESOURCE_TABLES,
  ...SEMANTIC_TABLES,
  'sessions', 'attachments',
  COLLECTION_VERSIONS_TABLE,
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
      for (const t of [...RESOURCE_TABLES, ...SEMANTIC_TABLES]) {
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
