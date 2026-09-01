// server/routes/auth.js — token 会话认证
import { Router } from 'express';
import { randomUUID } from 'node:crypto';

export function createAuthRouter(db) {
  const router = Router();

  router.post('/login', (req, res) => {
    const { personId } = req.body || {};
    const userRow = db.prepare('SELECT data FROM users WHERE id = ?').get(personId);
    if (!userRow) return res.status(401).json({ error: '未知人员' });
    const user = JSON.parse(userRow.data);
    const token = randomUUID();
    db.prepare('INSERT INTO sessions (token, person_id, created_at) VALUES (?, ?, ?)')
      .run(token, personId, new Date().toISOString());
    res.json({ token, user });
  });

  router.post('/logout', (req, res) => {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    res.status(204).end();
  });

  router.get('/me', (req, res) => {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const session = token ? db.prepare('SELECT * FROM sessions WHERE token = ?').get(token) : null;
    if (!session) return res.status(401).json({ error: '未登录' });
    const user = JSON.parse(db.prepare('SELECT data FROM users WHERE id = ?').get(session.person_id).data);
    res.json(user);
  });

  return router;
}

// token 校验中间件（保护资源写接口）
export function requireAuth(db) {
  return (req, res, next) => {
    const actor = getSessionUser(db, req);
    if (!actor) return res.status(401).json({ error: '未登录' });
    req.session = actor.session;
    req.actor = actor.user;
    next();
  };
}

function getSessionUser(db, req) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const session = token ? db.prepare('SELECT * FROM sessions WHERE token = ?').get(token) : null;
  if (!session) return null;
  const userRow = db.prepare('SELECT data FROM users WHERE id = ?').get(session.person_id);
  if (!userRow) return null;
  return { session, user: JSON.parse(userRow.data) };
}

export function requireRole(db, roles) {
  return (req, res, next) => {
    const actor = getSessionUser(db, req);
    if (!actor) return res.status(401).json({ error: '未登录' });
    if (!roles.has(actor.user.role)) return res.status(403).json({ error: '无权限' });
    req.session = actor.session;
    req.actor = actor.user;
    next();
  };
}

// 支委角色集合（与前端 AuthStore.isCommissioner 口径一致）：
// 书记 / 副书记 / 组织委员 / 宣传委员 / 纪检委员
const COMMISSIONER_ROLES = new Set([
  'secretary', 'deputy-secretary', 'org-commissioner', 'prop-commissioner', 'disc-commissioner',
]);

// 支委写权限中间件（requireAuth + 角色校验，保护支部文件等需支委写入的资源）
export function requireCommissioner(db) {
  return requireRole(db, COMMISSIONER_ROLES);
}
