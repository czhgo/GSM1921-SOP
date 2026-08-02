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
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const session = token ? db.prepare('SELECT * FROM sessions WHERE token = ?').get(token) : null;
    if (!session) return res.status(401).json({ error: '未登录' });
    req.session = session;
    next();
  };
}
