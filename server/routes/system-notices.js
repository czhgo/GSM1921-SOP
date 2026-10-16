// server/routes/system-notices.js — 系统派生通知端点
// R-22（2026-09-13）：把「系统派生通知」的生成权收到服务端。前端不再自述可信标记，
// 由本端点按注册表（server/system-notice-kinds.js）复算授权、生成文案并落库。
//   POST /api/v1/system-notices  body = { kind, sourceId, payload }
//     · 未登录 → 401（requireAuth）
//     · kind 不在注册表 → 400（附可懂文案）
//     · authorize 不通过 → 403
//     · 通过 → 由 build 生成通知写入 notices 表 → 201 + 新通知
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { requireAuth } from './auth.js';
import { SYSTEM_NOTICE_KINDS } from '../system-notice-kinds.js';
// R-26③（2026-10-05 批次 388）：日期口径统一到**本地**（服务端单一源 `services/reporting.js`）
import { today as todayLocal } from '../services/reporting.js';
import { actorBranchId, resourceBranchId } from './resources/branch-scope.js';
import { RESOURCE_TABLES } from './resources/store.js';

const SOURCE_RESOURCE_BY_KIND = Object.freeze({
  'periodic-archive-submitted': 'periodicArchives',
  'weekly-report-submitted': 'periodicArchives',
  'thought-report-submitted': 'thoughtReports',
  'attendance-confirmed': 'activities',
  'activity-agenda-updated': 'activities',
  'workforce-proposal-created': 'activities',
  'workforce-proposal-adopted': 'activities',
  'committee-vote-progress': 'activities',
  'committee-vote-locked': 'activities',
  'external-dispatch-created': 'externalDispatches',
  'review-request-submitted': 'reviewRequests',
  'review-request-decided': 'reviewRequests',
  'activity-created-broadcast': 'activities',
  'taskforce-vote-requested': 'activities',
  'activity-notice-draft': 'activities',
  'taskforce-notice-draft': 'taskforces',
  'makeup-remind': 'makeupTasks',
  'committee-dispatch': 'branches',
  'member-change-approved': 'memberChangeRequests',
  'todo-void-decided': 'todos',
});

// Semantic records whose tables are outside the generic resource CRUD registry still need a
// fixed source-table mapping so notice authorization can enforce branch ownership.
const SEMANTIC_SOURCE_TABLES = Object.freeze({
  memberChangeRequests: 'member_change_requests',
});

function sourceRow(db, resource, sourceId) {
  const table = RESOURCE_TABLES[resource] || SEMANTIC_SOURCE_TABLES[resource];
  if (!table || !sourceId) return null;
  const found = db.prepare(`SELECT data FROM ${table} WHERE id = ?`).get(String(sourceId));
  return found ? JSON.parse(found.data) : null;
}

function noticeSource(db, kind, sourceId, payload) {
  if (kind === 'record-void-decided') {
    const resource = payload?.resource;
    const row = sourceRow(db, resource, sourceId);
    return row ? { resource, row } : null;
  }
  if (kind === 'project-auth-granted' || kind === 'organizer-transferred') {
    const hint = payload?.targetType || payload?.sourceType;
    const resource = hint === 'taskforce' ? 'taskforces' : hint === 'activity' ? 'activities' : null;
    if (resource) {
      const row = sourceRow(db, resource, sourceId);
      return row ? { resource, row } : null;
    }
    const candidates = ['activities', 'taskforces']
      .map((name) => ({ resource: name, row: sourceRow(db, name, sourceId) }))
      .filter((item) => item.row);
    return candidates.length === 1 ? candidates[0] : null;
  }
  const mapped = SOURCE_RESOURCE_BY_KIND[kind];
  if (mapped) {
    const row = sourceRow(db, mapped, sourceId);
    return row ? { resource: mapped, row } : null;
  }
  // 未登记 kind 保留兼容读取，但仅在全资源表中唯一命中时采用；ID 冲突不能靠表遍历顺序猜来源。
  const candidates = [...new Set(Object.keys(RESOURCE_TABLES))]
    .map((resource) => ({ resource, row: sourceRow(db, resource, sourceId) }))
    .filter((item) => item.row);
  return candidates.length === 1 ? candidates[0] : null;
}

export function createSystemNoticesRouter(db) {
  const router = Router();

  router.post('/system-notices', requireAuth(db), (req, res) => {
    const actor = req.actor;
    if (!actor) return res.status(401).json({ error: '未登录' });

    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const kind = typeof body.kind === 'string' ? body.kind.trim() : '';
    const def = SYSTEM_NOTICE_KINDS[kind];
    if (!def) {
      return res.status(400).json({ error: `未知的系统通知类型：${kind || '（空）'}` });
    }

    const payload = (body.payload && typeof body.payload === 'object' && !Array.isArray(body.payload))
      ? body.payload
      : {};
    const ctx = { actor, sourceId: body.sourceId != null ? String(body.sourceId) : null, payload, db };

    let allowed = false;
    try {
      allowed = def.authorize(ctx) === true;
    } catch (e) {
      // authorize 内部异常按「不通过」处理（fail-closed），并留日志便于排查
      console.warn(`[system-notices] authorize 异常（kind=${kind}）：`, e);
      allowed = false;
    }
    if (!allowed) {
      return res.status(403).json({ error: `无权限：当前身份不能触发「${kind}」系统通知` });
    }

    const resolvedSource = noticeSource(db, kind, ctx.sourceId, payload);
    const sourceBranchId = resolvedSource
      ? resourceBranchId(db, resolvedSource.resource, resolvedSource.row)
      : null;
    const ownBranch = actorBranchId(actor);
    if (ownBranch && resolvedSource && !sourceBranchId) {
      return res.status(403).json({ error: '无权限：无法确认业务记录的支部归属' });
    }
    if (ownBranch && sourceBranchId && ownBranch !== sourceBranchId) {
      return res.status(403).json({ error: '无权限：不能为其他支部触发系统通知' });
    }

    let built;
    try {
      built = def.build(ctx);
    } catch (e) {
      console.warn(`[system-notices] build 失败（kind=${kind}）：`, e);
      return res.status(500).json({ error: '系统通知生成失败' });
    }
    // id/publishDate 由服务端补齐并覆盖，杜绝客户端携带同名锚点字段
    const id = `ntc-${randomUUID().slice(0, 8)}`;
    const notice = {
      ...built,
      ...((sourceBranchId || ownBranch) ? { branchId: sourceBranchId || ownBranch } : {}),
      id,
      publishDate: todayLocal(),
    };
    db.prepare('INSERT OR REPLACE INTO notices (id, data) VALUES (?, ?)').run(id, JSON.stringify(notice));
    res.status(201).json(notice);
  });

  return router;
}
