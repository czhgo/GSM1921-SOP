// server/routes/auth.js — token 会话认证
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
// P2c（2026-09-03）：授权语义角色集单一源 = docs/src/core/domain/constants.js（前端 AuthStore.isCommissioner 同源，勿另写）
import { BRANCH_COMMISSION_ROLES } from '../../docs/src/core/domain/constants.js';

// ── 登录口令校验（2026-09-03 P1b 运行安全；2026-09-23 P0-3 生产硬挡）────────────────
// 原状：POST /login 仅凭 personId 发 token——多人/计算中心部署时任何知道学号者可冒名登录。
// 现状：默认校验口令。口令 = 支部统一登录口令，env LOGIN_PASSWORD 可换，缺省 '123456'（与前端演示账号密码一致，登录体验不变；同时堵住「直连 API 猜 personId」通道）。
// **生产形态**（isProductionEnv，单一源 server/env.js）：启动即要求 LOGIN_PASSWORD（缺省口令不得上线，见 server.js）；
//   逃逸门 DISABLE_PASSWORD_CHECK **一律不认**，且口令比对不含 '123456' 兜底 ⇒ 生产不存在「无口令也能登录」。
function passwordCheckDisabled() {
  return process.env.DISABLE_PASSWORD_CHECK === '1' && !isProductionEnv();
}
function loginPasswordOk(password) {
  return typeof password === 'string' && password.length > 0 &&
    password === (process.env.LOGIN_PASSWORD || (isProductionEnv() ? '' : '123456'));
}

export function createAuthRouter(db) {
  const router = Router();

  router.post('/login', (req, res) => {
    let { personId } = req.body || {};
    const { password } = req.body || {};
    // 迁移期（2026-10-20）：旧 p* 仅作登录别名；会话一律存学号（一次 console.warn）
    if (isLegacyPersonId(personId)) {
      const mapped = mapPersonId(personId);
      if (mapped == null) return res.status(401).json({ error: '未知人员' });
      if (!legacyAliasWarned) {
        legacyAliasWarned = true;
        console.warn('[auth] 检测到旧 p* 人员 id 登录别名（仅迁移期兼容），会话已改存学号');
      }
      personId = mapped;
    }
    const userRow = db.prepare('SELECT data FROM users WHERE id = ?').get(personId);
    if (!userRow) return res.status(401).json({ error: '未知人员' });
    if (!passwordCheckDisabled() && !loginPasswordOk(password)) {
      return res.status(401).json({ error: '口令错误' });
    }
    const user = JSON.parse(userRow.data);
    // 2026-09-14 批次 25：成员流出/转出 → 账号停用（软标记行保留，登录一律拒绝）
    if (user.transferOut === true) return res.status(401).json({ error: '账号已停用（该成员已流出）' });
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
    // 2026-11-03 Task 4：改走 getSessionUser——会话过期（SESSION_TTL_DAYS）时同样 401；
    // 原实现直查 sessions 表，会绕过 TTL 判定，令过期 token 仍能换取用户资料。
    const actor = getSessionUser(db, req);
    if (!actor) return res.status(401).json({ error: '未登录' });
    res.json(actor.user);
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

export function getSessionUser(db, req) { // 2026-10-24 批次 508：导出供公开归档读口做「可选登录」（有 token 按登录口径，无 token 按匿名公开口径）
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const session = token ? db.prepare('SELECT * FROM sessions WHERE token = ?').get(token) : null;
  if (!session || _sessionExpired(db, session)) return null;
  const userRow = db.prepare('SELECT data FROM users WHERE id = ?').get(session.person_id);
  if (!userRow) return null;
  const user = JSON.parse(userRow.data);
  // 2026-09-14 批次 25：停用账号（成员已流出）的在途会话一并失效
  if (user.transferOut === true) return null;
  return { session, user };
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

// 支委授权角色集合（含支书/副支书；授权语义，与前端 AuthStore.isCommissioner 口径一致）
// P2c（2026-09-03）：单一源 = constants.js BRANCH_COMMISSION_ROLES（勿在此手写）
const COMMISSIONER_ROLES = new Set(BRANCH_COMMISSION_ROLES);

// 支委写权限中间件（requireAuth + 角色校验，保护支部文件等需支委写入的资源）
export function requireCommissioner(db) {
  return requireRole(db, COMMISSIONER_ROLES);
}

// 运行形态判定单一源（P0-3）：`APP_ENV=production` 或 `NODE_ENV=production`，见 server/env.js。
// ⚠ 置尾以保上文行号（`auth.js:12-14` / `:17` / `:92-97` 等是 README-server.md 的取证靶点）；import 声明被提升，置尾不影响语义。
import { isProductionEnv } from '../env.js';
// 迁移期旧 p* 登录别名（映射表仅迁移与兼容使用，业务代码不得引用）
import { isLegacyPersonId, mapPersonId } from '../migrations/legacy-person-ids.js';

let legacyAliasWarned = false;

// ════════════════════════════════════════════════════════════════
//  会话 TTL（2026-11-03 Task 4）
//  为什么：login 已写 `sessions.created_at`，但 getSessionUser 只查 token 存在与否 ⇒
//    token 永久有效（README「token 无过期」风险项）。这里按 created_at 现算过期，
//    过期即删该会话行并视为未登录（/auth/me 与所有 requireAuth 写口因此 401）。
//  · 不改表结构、不加迁移：只读 login 已写的 created_at。
//  · SESSION_TTL_HOURS 缺省 3（支书 2026-11-03 裁定：3 小时过期）；非法值回落 3，避免误配成「永不过期」。
//  · 兼容旧配置：若只设了 SESSION_TTL_DAYS，则按天换算成小时。
//  · created_at 缺失或不可解析：不判过期（保持历史会话可用，避免旧库突然全量掉线）。
// ════════════════════════════════════════════════════════════════
function _sessionTtlHours() {
  const hours = Number(process.env.SESSION_TTL_HOURS);
  if (Number.isFinite(hours) && hours > 0) return hours;
  const days = Number(process.env.SESSION_TTL_DAYS);
  if (Number.isFinite(days) && days > 0) return days * 24;
  return 3;
}

function _sessionExpired(db, session) {
  const created = Date.parse(session && session.created_at);
  if (!Number.isFinite(created)) return false;
  if (Date.now() - created <= _sessionTtlHours() * 60 * 60 * 1000) return false;
  db.prepare('DELETE FROM sessions WHERE token = ?').run(session.token);
  return true;
}
