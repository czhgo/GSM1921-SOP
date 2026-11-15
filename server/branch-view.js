// ════════════════════════════════════════════════════════════════
//  server/branch-view.js —— 党委「进入某支部」只读门（T14 · 2026-11-15）
//
//  由来（`.trae/specs/close-six-dim-gaps/spec.md` Q10/Q13/Q14）：
//    党委台可进入某支部查看，但进入期间**只能看、不能改**；留痕（谁 / 何时 / 哪个支部）＋ 一键退出。
//
//  判据（复用 `read-only.js` 的写方法 / 认证域口径，不另写一套）：
//    · 写方法＝`isWriteMethod`（POST / PUT / PATCH / DELETE）；
//    · 认证域豁免＝`isAuthPath`（登录 / 登出本身不是业务写，否则无法登录）；
//    · 进入 / 退出两个语义写口豁免：`POST /committee/branch-visits`、`PATCH /committee/branch-visits/:id`；
//    · 其余写口：该 token 有未退出留痕 ⇒ 403 `{ error, readOnly: true }`。
//
//  留痕唯一源＝`branch_visits`（`server/db.js::MIGRATIONS` v17）；一个 token 只允许一条未退出记录。
// ════════════════════════════════════════════════════════════════

import { isAuthPath, isWriteMethod } from './read-only.js';

export const BRANCH_VIEW_READ_ONLY_MESSAGE = '当前正在只读查看支部：写入已被拒绝。请先在顶栏「退出查看」后再操作。';

/** 进入 / 退出两条语义写口（与 `semantic-routes.js` 的注册路径同一串） */
const BRANCH_VISIT_WRITE_PATH = /^\/api\/v1\/committee\/branch-visits(?:\/[^/]+)?\/?$/;

/** 请求全路径（不受 `app.use('/api/v1', ...)` 挂载前缀裁剪影响） */
export function requestPath(req) {
  return String((req && (req.originalUrl || req.url)) || '').split('?')[0];
}

/** 会话 token（与 `auth.js::getSessionUser` 同一取值口径） */
export function requestToken(req) {
  return String((req && (req.headers && req.headers.authorization)) || '').replace('Bearer ', '').trim();
}

/** 该 token 当前未退出的留痕行；无表 / 无记录一律 null（不凭猜造上下文） */
export function activeVisitRow(db, token) {
  if (!token) return null;
  try {
    return db.prepare('SELECT id, branch_id, entered_by, entered_at, token FROM branch_visits WHERE token = ? AND exited_at IS NULL ORDER BY entered_at DESC LIMIT 1')
      .get(token) || null;
  } catch {
    return null;
  }
}

/** 支部名（与前端 `getHeaderTitle` 同一投影：config.headerTitle → name → id） */
function branchNameOf(db, branchId) {
  try {
    const row = db.prepare('SELECT data FROM branches WHERE id = ?').get(branchId);
    if (!row) return String(branchId);
    const branch = JSON.parse(row.data);
    return branch.config?.headerTitle || branch.name || String(branchId);
  } catch {
    return String(branchId);
  }
}

/**
 * `/bootstrap` 与 403 响应共用的上下文投影。
 * 形状固定：`{ branchId, branchName, enteredBy, visitId }` 或 `null`（前端不自造标志，H32）。
 */
export function viewContextForRequest(db, req) {
  const row = activeVisitRow(db, requestToken(req));
  if (!row) return null;
  return {
    branchId: String(row.branch_id),
    branchName: branchNameOf(db, row.branch_id),
    enteredBy: String(row.entered_by),
    visitId: String(row.id),
  };
}

/** 进入 / 退出两条语义写口（只放行这两条，其余写口一律按留痕判定） */
export function isBranchVisitWrite(req) {
  return BRANCH_VISIT_WRITE_PATH.test(requestPath(req));
}

/**
 * 党委进入支部只读门（挂载位置与响应形状同 `read-only.js::createReadOnlyGuard`）。
 * @param {import('better-sqlite3').Database} db
 */
export function createBranchViewGuard(db) {
  return (req, res, next) => {
    if (!isWriteMethod(req.method) || isAuthPath(requestPath(req)) || isBranchVisitWrite(req)) return next();
    const context = viewContextForRequest(db, req);
    if (context) return res.status(403).json({ error: BRANCH_VIEW_READ_ONLY_MESSAGE, readOnly: true });
    next();
  };
}
