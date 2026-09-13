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
      id,
      publishDate: new Date().toISOString().slice(0, 10),
    };
    db.prepare('INSERT OR REPLACE INTO notices (id, data) VALUES (?, ?)').run(id, JSON.stringify(notice));
    res.status(201).json(notice);
  });

  return router;
}
