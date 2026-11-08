// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/routes/resources/publication-audit.js —— **发布动作留痕**（叶子件：不依赖同目录其它件）
//
//  为什么单列一件：`publication_audits` 是「谁在什么时候把哪条内容放到了什么可见范围」的
//  只增不改台账（发布 / 撤回 / 改期 / 过期 / 支部采纳都会写）。党委内容写口
//  （`semantic-routes.js::registerExtraSemanticRoutes` 尾部）与后续任务共用同一处写入逻辑，
//  避免两条写口各拼一份字段而漂移。
//
//  口径（与 `server/data/domain-contract.mjs` 的 `publication_audits` 契约同形）：
//    id=`pub-<uuid8>`；`data` 含 `resourceType/resourceId/action/actorId/actorRole/anonymous/
//    oldValue/newValue/note/at`。
//    · `actorId` 缺省 `null`（系统动作 / 过期归档等无操作者场景）；
//    · `anonymous=true` 时 `actorId` 与 `actorRole` 一律 `null`（匿名不可反查）。
//  ⚠ 本文件只写留痕，不改任何业务表；留痕行只增不改（外部读口按 `at` 倒序展示）。
// ════════════════════════════════════════════════════════════════

import { randomUUID } from 'node:crypto';

/**
 * 写一条发布动作留痕。
 * @param {import('better-sqlite3').Database} db better-sqlite3 实例
 * @param {Object} entry
 * @param {string} entry.resourceType 资源类型（如 `activity` / `notice` / `branchDoc`）
 * @param {string} entry.resourceId 资源 id
 * @param {string} entry.action 动作（如 `publish` / `unpublish` / `update-scope`）
 * @param {{id?:string, role?:string}|null} [entry.actor] 操作者（`req.actor`）
 * @param {*} [entry.oldValue] 变更前取值（结构由调用方决定；无则 `null`）
 * @param {*} [entry.newValue] 变更后取值
 * @param {string} [entry.note] 备注
 * @param {boolean} [entry.anonymous] 匿名留痕（`actorId` / `actorRole` 一律 `null`）
 * @returns {Object} 写入的留痕行
 */
export function writePublicationAudit(db, {
  resourceType,
  resourceId,
  action,
  actor = null,
  oldValue = null,
  newValue = null,
  note = '',
  anonymous = false,
} = {}) {
  const anonymousAudit = anonymous === true;
  const row = {
    id: `pub-${randomUUID().slice(0, 8)}`,
    resourceType: String(resourceType || ''),
    resourceId: String(resourceId || ''),
    action: String(action || ''),
    actorId: anonymousAudit ? null : (actor && actor.id ? String(actor.id) : null),
    actorRole: anonymousAudit ? null : (actor && actor.role ? String(actor.role) : null),
    anonymous: anonymousAudit,
    oldValue: oldValue === undefined ? null : oldValue,
    newValue: newValue === undefined ? null : newValue,
    note: typeof note === 'string' ? note : '',
    at: new Date().toISOString(),
  };
  db.prepare('INSERT INTO publication_audits (id, data) VALUES (?, ?)')
    .run(row.id, JSON.stringify(row));
  return row;
}
