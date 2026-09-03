// server/routes/auth.js — token 会话认证
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
// P2c（2026-09-03）：授权语义角色集单一源 = docs/src/core/constants.js（前端 AuthStore.isCommissioner 同源，勿另写）
import { BRANCH_COMMISSION_ROLES } from '../../docs/src/core/constants.js';

// ── 登录口令校验（2026-09-03 P1b 运行安全；书记裁定「做，可开关」）────────────
// 原状：POST /login 仅凭 personId 发 token——多人/计算中心部署时任何知道学号者可冒名登录。
// 现状：默认校验口令。口令 = 支部统一登录口令，env LOGIN_PASSWORD 可换，缺省 '123456'
//   （与前端演示账号密码一致，登录体验不变；同时堵住「直连 API 猜 personId」通道）。
// 逃逸门：env DISABLE_PASSWORD_CHECK=1 恢复旧行为（内网单机演示/测试套件用）。
function passwordCheckDisabled() {
  return process.env.DISABLE_PASSWORD_CHECK === '1';
}
function loginPasswordOk(password) {
  return typeof password === 'string' && password.length > 0 &&
    password === (process.env.LOGIN_PASSWORD || '123456');
}

export function createAuthRouter(db) {
  const router = Router();

  router.post('/login', (req, res) => {
    const { personId, password } = req.body || {};
    const userRow = db.prepare('SELECT data FROM users WHERE id = ?').get(personId);
    if (!userRow) return res.status(401).json({ error: '未知人员' });
    if (!passwordCheckDisabled() && !loginPasswordOk(password)) {
      return res.status(401).json({ error: '口令错误' });
    }
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

// 支委授权角色集合（含书记/副书记；授权语义，与前端 AuthStore.isCommissioner 口径一致）
// P2c（2026-09-03）：单一源 = constants.js BRANCH_COMMISSION_ROLES（勿在此手写）
const COMMISSIONER_ROLES = new Set(BRANCH_COMMISSION_ROLES);

// 支委写权限中间件（requireAuth + 角色校验，保护支部文件等需支委写入的资源）
export function requireCommissioner(db) {
  return requireRole(db, COMMISSIONER_ROLES);
}
