// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
// leader-progress.js — 「本组组员进展」服务端汇总读接口（2026-09-15 批次 47-I · Q-23-41 ②）
// ════════════════════════════════════════════════════════════════
// 支书裁定（2026-09-15）：把「组长逐人归集」改为**服务端汇总**（原话：「照理说理想状态下，
//   我们的后台服务器已经自动把这个相关信息都后台计算汇总好了，特别是文字括号里面的内容那几项」）。
//
// 单一源：聚合口径**不在本文件重写**，直接 import 前端同源纯函数
//   `docs/src/services/member-progress.js::aggregateMemberProgress`（前端 mock 态亦调用它）——
//   与 `constants.js` / `config-clean.js` / `system-notice-templates.js` 同一惯例。
// 数据源：服务端四张表 `todos`（在办/超期）· `attendances`（缺勤）· `inspections`（考察待确认）·
//   `issues`（汇报态）——均为「id + data(JSON)」键值表，故此处只能取全量后交给纯函数聚合。
// ════════════════════════════════════════════════════════════════

import { Router } from 'express';
import { requireAuth } from './auth.js';
import { aggregateMemberProgress } from '../../docs/src/services/member-progress.js';

/** 取整表全量（键值表：id 主键 + data JSON） */
const allOf = (db, table) => db.prepare(`SELECT data FROM ${table}`).all().map((r) => JSON.parse(r.data));

export function createLeaderProgressRouter(db) {
  const router = Router();

  // GET /api/v1/leader/member-progress?personIds=p4,p5&today=YYYY-MM-DD
  // 返回：{ rows: [{ personId, active, overdue, absent, inspPending, reportState, reportKind, reportTitle }], today }
  // 「今天」由查询参数给定（缺省取服务端当日）——避免两端各自取时区导致超期判定口径未同步。
  router.get('/leader/member-progress', requireAuth(db), (req, res) => {
    const personIds = String(req.query.personIds || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!personIds.length) {
      return res.status(400).json({ error: 'personIds 必填（逗号分隔的人员 id）' });
    }
    const today = String(req.query.today || '').trim() || new Date().toISOString().slice(0, 10);

    const rows = aggregateMemberProgress({
      persons: personIds.map((personId) => ({ personId })),
      todos: allOf(db, 'todos'),
      attendance: allOf(db, 'attendances'),
      inspections: allOf(db, 'inspections'),
      issues: allOf(db, 'issues'),
      today,
    });

    res.json({ rows, today });
  });

  return router;
}
