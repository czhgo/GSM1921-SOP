// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
// leader-progress.js — 「本组组员进展」服务端汇总读接口（2026-09-15 批次 47-I · Q-23-41 ②）
// ════════════════════════════════════════════════════════════════
// 支书裁定（2026-09-15）：把「组长逐人归集」改为**服务端汇总**（原话：「照理说理想状态下，
//   我们的后台服务器已经自动把这个相关信息都后台计算汇总好了，特别是文字括号里面的内容那几项」）。
//
// 单一源：聚合口径**不在本文件重写**，直接 import 前端同源纯函数
//   `docs/src/services/member/member-progress.js::aggregateMemberProgress`（前端 mock 态亦调用它）——
//   与 `constants.js` / `config-clean.js` / `system-notice-templates.js` 同一惯例。
// 数据源：服务端四张表 `todos`（在办/超期）· `attendances`（缺勤）· `inspections`（考察待确认）·
//   `issues`（汇报态）——均为「id + data(JSON)」键值表。2026-11-01 性能批：personId 集**下推到 SQL**
//   预筛（`IN (…)`），不再四表全读后 JS 过滤；行序按 `rowid` 还原为原全表扫描序（`find()` 取首条口径不变）。
// ════════════════════════════════════════════════════════════════

import { DEFAULT_BRANCH_ID } from '../../docs/src/core/domain/constants.js';
import { Router } from 'express';
import { requireAuth } from './auth.js';
import { aggregateMemberProgress } from '../../docs/src/services/member/member-progress.js';
// R-26③（2026-10-05 批次 388）：日期口径统一到**本地**（服务端单一源 `services/reporting.js`）
import { today as todayLocal } from '../services/reporting.js';
import { actorBranchId, branchSelectionError, createTableReader, resourceRowsForActor, selectedBranchRequiredError } from './resources/branch-scope.js';

// ── 读口（2026-11-01 性能批：personId 集下推 SQL 预筛）────────────────────────
// 原状：`SELECT data FROM <table>` 四表全读 → JS 按 personId 过滤（O(全表)，随数据量线性劣化）。
// 现状：先按 personId 集取**相关行**，再交给 `resourceRowsForActor` 做支部过滤、纯函数做聚合——
//   支部口径（含 `resourceBranchId` 的关联解析与兼容期兜底）**一行未改**，只缩小输入集。
// · 参数上限：SQLite 缺省 `SQLITE_MAX_VARIABLE_NUMBER = 999`，按列数折算每批 ≤500 个参数；
// · 行序：`ORDER BY rowid` ＋ 跨批按 rowid 合并 → 与原「无 WHERE 全表扫描」的 rowid 序一致
//   （`aggregateMemberProgress` 内 `find()` 取首条 open 汇报/请求，依赖该顺序）。
const MAX_PARAMS = 500;

const placeholders = (n) => new Array(n).fill('?').join(', ');

/** 按「列数 × 批大小 ≤ MAX_PARAMS」切批 */
function chunksFor(values, columns) {
  const size = Math.max(1, Math.floor(MAX_PARAMS / columns.length));
  const out = [];
  for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size));
  return out;
}

/**
 * 取「任一列等值命中 values 集」的行（多列取 OR；每批参数不超上限）。
 * @param {import('better-sqlite3').Database} db
 * @param {string} table 表名（白名单：本文件内固定字面量）
 * @param {string[]} columns 列或 `json_extract(...)` 等值表达式
 * @param {string[]} values 目标 id 集
 * @returns {Object[]} 解析后的 data，按 rowid 升序（= 原全表扫描序）
 */
function rowsMatching(db, table, columns, values) {
  if (!values.length) return [];
  const keyed = [];
  for (const chunk of chunksFor(values, columns)) {
    const where = columns.map((column) => `${column} IN (${placeholders(chunk.length)})`).join(' OR ');
    const sql = `SELECT rowid AS rid, data FROM ${table} WHERE ${where} ORDER BY rowid`;
    const params = columns.flatMap(() => chunk);
    for (const row of db.prepare(sql).all(...params)) keyed.push(row);
  }
  keyed.sort((a, b) => a.rid - b.rid);
  return keyed.map((row) => JSON.parse(row.data));
}

/** 仅取请求涉及的成员档案（原为整表 map；`users.id` 与 `data.id` 同源） */
const usersByIds = (db, personIds) => new Map(
  rowsMatching(db, 'users', ['id'], personIds).map((user) => [user.id, user]),
);

export function createLeaderProgressRouter(db) {
  const router = Router();

  // GET /api/v1/leader/member-progress?personIds=p4,p5&today=YYYY-MM-DD
  // 返回：{ rows: [{ personId, active, overdue, absent, inspPending, reportState, reportKind, reportTitle }], today }
  // 「今天」由查询参数给定（缺省取服务端当日）——避免两端各自取时区导致超期判定口径未同步。
  router.get('/leader/member-progress', requireAuth(db), (req, res) => {
    const scopeDeny = branchSelectionError(req.actor, req.query.branchId);
    if (scopeDeny) return res.status(403).json({ error: scopeDeny });
    const selectionRequired = selectedBranchRequiredError(req.actor, req.query.branchId);
    if (selectionRequired) return res.status(400).json({ error: selectionRequired });
    const branchId = actorBranchId(req.actor) || req.query.branchId || null;
    const personIds = String(req.query.personIds || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!personIds.length) {
      return res.status(400).json({ error: 'personIds 必填（逗号分隔的人员 id）' });
    }
    const requestedUsers = usersByIds(db, personIds);
    if (personIds.some((personId) => {
      const user = requestedUsers.get(personId);
      return !user || (branchId && (user.branchId || DEFAULT_BRANCH_ID) !== branchId);
    })) return res.status(403).json({ error: '无权限：只能查看所选支部成员进展' });
    const today = String(req.query.today || '').trim() || todayLocal();
    // 请求级预载：支部过滤时逐行解析的关联行（activities 等）只读一次表，四张表共用同一 reader
    const branchReader = createTableReader(db);
    /** personId 集预筛 → 支部过滤（口径全在 branch-scope，本文件不重写） */
    const scopedRows = (table, columns) => resourceRowsForActor(
      db, table, rowsMatching(db, table, columns, personIds), req.actor, branchId, branchReader,
    );

    const rows = aggregateMemberProgress({
      persons: personIds.map((personId) => ({ personId })),
      todos: scopedRows('todos', ["json_extract(data, '$.personId')"]),
      attendance: scopedRows('attendances', ['person_id']),
      inspections: scopedRows('inspections', ["json_extract(data, '$.personId')"]),
      // 汇报态两处判据：`submittedBy`（本人上报）与 `assignee`（被点名待汇报）——取并集预筛
      issues: scopedRows('issues', ["json_extract(data, '$.submittedBy')", "json_extract(data, '$.assignee')"]),
      today,
    });

    res.json({ rows, today });
  });

  return router;
}
