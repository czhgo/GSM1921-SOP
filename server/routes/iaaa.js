// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/routes/iaaa.js —— **北大 IAAA 统一身份认证入站链路**（2026-09-29 批次 271 新增）
//
//  【支书令（2026-09-29 逐字）】「我们在北大的服务器上，是会接北大 IAAA 系统，这个系统，如果有该人，
//    就登录进去，**如果没有这个人，那就要自动创建这个人的号，并且进入 选择支部，然后由支部 予以确认**！！」
//
//  【口径（本批 AskUserQuestion 四题，支书全取推荐档）】
//    ① 形态＝**IAAA OAuth**（授权页跳转 ＋ token 换学号/姓名）；
//    ② 建号＝**无额外门槛**（任何 IAAA 认过的人都能自助建号，但 `branchId: null` ⇒ **归属前什么也看不到**，
//       「支部确认」本身就是门槛）；
//    ③ 确认人＝**支书 / 副支书 / 组织委员**（与既有「成员流动登记」同口径 `MEMBER_FLOW_ROLES`，不新造角色口径）；
//    ④ **不新增表**：`users.branchId` 为空表「待归属」，申请意向写在 `users.data.joinIntent`，
//       审批留痕复用**既有** `auth_audit`（`action: 'join-approve' / 'join-reject'`，形状同
//       `routes/resources/semantic-routes.js::AUTH_AUDIT_KEYS`）。
//
//  【协议可插拔 —— 为什么要这样写】北大计算中心**尚未给出正式接口文档**（全仓此前无任何 IAAA 痕迹），
//    故本件把「认人」这一步收敛成一个**适配器**：只认两个环境变量（`IAAA_AUTH_URL` 授权页、
//    `IAAA_VERIFY_URL` 换学号姓名），并**同时兼容 JSON 与 XML 两种返回**。
//    ⚠ **待接口文档到手后，只需改 `_verifyWithIaaa()` 的解析或换掉这两个 URL**，其余链路一字不动。
//    ⚠ `IAAA_MOCK=1` 提供**本地假想 IAAA**（回调的 `token` 直接当学号）⇒ 全链可在本机端到端联调与测试。
//
//  【端点】挂在 `/api/v1/auth/iaaa`（见 `app.js` 挂载）
//    GET  /login                      → 302 到 IAAA 授权页（未配置且非 MOCK ⇒ 503 ＋ 可懂原因）
//    GET  /callback?token=…           → 换学号姓名 → 有号登录 / 无号建号 → 建会话
//                                       `?mode=json`（或 Accept: application/json）⇒ 返回 JSON；
//                                       否则 **302 到 `./login.html#iaaa=<会话 token>`**（走 hash：不经服务端日志、
//                                       不被 Referer 带出；前端取到后立即 `history.replaceState` 清掉）
//    POST /bind-branch                → 本人选支部（须已登录且 `branchId === null`）⇒ 写 `joinIntent`
//    GET  /pending                    → 待确认入站清单（门＝支书/副支书/组织委员；可 `?branchId=` 过滤）
//    POST /pending/:personId/approve  → 确认入站（落 `branchId` ＋ 留痕）
//    POST /pending/:personId/reject   → 驳回（清意向 ＋ 留痕）
// ════════════════════════════════════════════════════════════════
import express from 'express';
import { randomUUID } from 'node:crypto';
import { requireAuth } from './auth.js';
import { SECRETARY_AND_DEPUTY_ROLES, ORG_COMMISSIONER_ROLES, PARTY_STAFF_ROLE } from '../../docs/src/core/domain/constants.js';

const MOCK = process.env.IAAA_MOCK === '1';
const AUTH_URL = process.env.IAAA_AUTH_URL || 'https://iaaa.pku.edu.cn/iaaa/oauth.jsp';
const VERIFY_URL = process.env.IAAA_VERIFY_URL || 'https://iaaa.pku.edu.cn/iaaa/oauthlogin.do';
const APP_ID = process.env.IAAA_APP_ID || '';
const REDIRECT_URI = process.env.IAAA_REDIRECT_URI || '';

const listUsers = (db) => db.prepare('SELECT data FROM users').all().map((r) => JSON.parse(r.data));
const putUser = (db, u) => db.prepare('INSERT OR REPLACE INTO users (id, data) VALUES (?, ?)').run(u.id, JSON.stringify(u));
const findById = (db, id) => { const r = db.prepare('SELECT data FROM users WHERE id = ?').get(String(id)); return r ? JSON.parse(r.data) : null; };
const findByStudentId = (db, sid) => listUsers(db).find((u) => String(u.studentId) === String(sid)) || null;
const branchExists = (db, id) => !!db.prepare('SELECT id FROM branches WHERE id = ?').get(String(id));

/** 入站审批留痕（形状＝`semantic-routes.js::AUTH_AUDIT_KEYS` 的单一源；不另造第二套形状） */
function audit(db, { targetPersonId, branchId, actorId, action }) {
  const row = {
    id: `auth-${randomUUID().slice(0, 8)}`,
    targetPersonId: String(targetPersonId),
    role: 'participant',            // 入站者按成员（participant）归入支部
    scopeRef: String(branchId),     // 「归入哪个支部」
    authorizedBy: actorId ? String(actorId) : null,
    authorizedAt: new Date().toISOString().slice(0, 10),
    action,                         // 'join-approve' / 'join-reject'
  };
  db.prepare('INSERT OR REPLACE INTO auth_audit (id, data) VALUES (?, ?)').run(row.id, JSON.stringify(row));
  return row;
}

/**
 * **IAAA 适配器**：拿凭证换「学号 ＋ 姓名」。
 * ⚠ 真实解析待计算中心接口文档确认；此处同时兼容 JSON（`{success,userName,name}`）与 XML 两种返回。
 * @returns {Promise<{studentId:string,name:string}>}
 */
async function _verifyWithIaaa(token) {
  if (MOCK) return { studentId: String(token), name: process.env.IAAA_MOCK_NAME || '（IAAA 测试用户）' };
  if (!VERIFY_URL) throw new Error('未配置 IAAA_VERIFY_URL');
  const url = `${VERIFY_URL}?appid=${encodeURIComponent(APP_ID)}&token=${encodeURIComponent(token)}`
    + (REDIRECT_URI ? `&redirUrl=${encodeURIComponent(REDIRECT_URI)}` : '');
  const r = await fetch(url);
  const text = await r.text();
  let studentId = '', name = '';
  try {
    const j = JSON.parse(text);
    if (j.success === false) throw new Error(j.msg || j.error || 'IAAA 校验失败');
    // 常见字段名一并兼容（`userName` 为学号；姓名可能叫 `name` / `trueName`）
    studentId = j.userName || j.userid || j.userId || j.studentId || '';
    name = j.name || j.trueName || j.realName || '';
  } catch (e) {
    if (e && e.message && !/Unexpected|JSON/.test(e.message)) throw e;
    const pick = (tag) => (text.match(new RegExp(`<${tag}>([^<]*)</${tag}>`)) || [])[1] || '';
    studentId = pick('userName') || pick('userid');
    name = pick('name') || pick('trueName');
  }
  if (!studentId) throw new Error('IAAA 未返回学号（解析口径待接口文档确认）');
  return { studentId: String(studentId), name: name || String(studentId) };
}

/** 门：支书 / 副支书 / 组织委员（与「成员流动登记」同口径，不新造角色口径） */
const canConfirm = (actor) => !!actor && (
  SECRETARY_AND_DEPUTY_ROLES.includes(actor.role)
  || ORG_COMMISSIONER_ROLES.includes(actor.role)
  || PARTY_STAFF_ROLE.includes(actor.role));

export function createIaaaRouter(db) {
  const router = express.Router();

  router.get('/login', (req, res) => {
    if (MOCK) return res.redirect(`./api/v1/auth/iaaa/callback?token=${encodeURIComponent(process.env.IAAA_MOCK_ID || '2026000001')}`);
    if (!APP_ID || !REDIRECT_URI) {
      return res.status(503).json({
        error: 'IAAA 未配置：请设置 IAAA_APP_ID 与 IAAA_REDIRECT_URI（授权页 IAAA_AUTH_URL / 校验 IAAA_VERIFY_URL 可选，有缺省）',
        hint: '本地联调可设 IAAA_MOCK=1',
      });
    }
    return res.redirect(`${AUTH_URL}?appID=${encodeURIComponent(APP_ID)}&redirectURI=${encodeURIComponent(REDIRECT_URI)}`);
  });

  router.get('/callback', async (req, res) => {
    const wantsJson = req.query.mode === 'json' || String(req.get('accept') || '').includes('application/json');
    const fail = (code, msg) => (wantsJson
      ? res.status(code).json({ ok: false, error: msg })
      : res.status(code).type('html').send(`<!doctype html><meta charset="utf-8"><title>登录失败</title>`
        + `<p style="font:16px/1.7 system-ui;padding:32px">统一身份认证登录失败：${msg}</p>`
        + `<p style="padding:0 32px"><a href="./login.html">返回登录页</a></p>`));
    const token = req.query.token;
    if (!token) return fail(400, '缺少 token（IAAA 回调未带凭证）');

    let ident;
    try { ident = await _verifyWithIaaa(token); } catch (e) { return fail(401, e.message); }

    // 有号则登录 / 无号则**自助建号**（口径②：无额外门槛；归属前 `branchId: null`）
    let user = findByStudentId(db, ident.studentId);
    let created = false;
    if (!user) {
      user = {
        id: `p_${randomUUID().replace(/-/g, '').slice(0, 12)}`,   // 与既有形态一致：`p_<uuid>`（见 services/member/person.js）
        name: ident.name,
        studentId: ident.studentId,
        partyGroup: '',
        developStage: '',
        role: 'participant',       // 入站即普通成员；身份由支部（组织委员/支书）后续按制度配置
        branchId: null,            // ⚠ **待归属**：确认前看不到任何支部内容
        provisionedBy: 'iaaa',
        provisionedAt: new Date().toISOString(),
      };
      putUser(db, user);
      created = true;
    }
    if (user.transferOut === true) return fail(403, '账号已停用（该成员已流出）');

    const session = randomUUID();
    db.prepare('INSERT INTO sessions (token, person_id, created_at) VALUES (?, ?, ?)')
      .run(session, user.id, new Date().toISOString());

    const payload = { ok: true, token: session, user, created, needBranch: !user.branchId };
    if (wantsJson) return res.json(payload);
    // 浏览器流：走 hash 回登录页（hash 不进服务端日志、不被 Referer 带出；前端取到后立即清掉）
    return res.redirect(`./login.html#iaaa=${encodeURIComponent(session)}`);
  });

  // 本人选支部（须已登录且尚未归属）
  router.post('/bind-branch', requireAuth(db), (req, res) => {
    const actor = req.actor;
    if (actor.branchId) return res.status(409).json({ error: '你已归属支部，无需再次选择' });
    const branchId = String((req.body && req.body.branchId) || '');
    if (!branchExists(db, branchId)) return res.status(400).json({ error: '支部不存在' });
    const u = findById(db, actor.id);
    if (!u) return res.status(404).json({ error: '账号不存在' });
    u.joinIntent = { branchId, at: new Date().toISOString() };
    putUser(db, u);
    res.json({ ok: true, joinIntent: u.joinIntent });
  });

  // 待确认入站清单（门＝支书/副支书/组织委员）
  router.get('/pending', requireAuth(db), (req, res) => {
    const actor = req.actor;
    if (!canConfirm(actor)) return res.status(403).json({ error: '无权限：仅支书/副支书/组织委员可看待确认入站' });
    const mine = actor.role !== 'party-staff';
    const want = req.query.branchId ? String(req.query.branchId) : null;
    const rows = listUsers(db)
      .filter((u) => u.branchId === null && u.joinIntent && u.joinIntent.branchId)
      .filter((u) => (want ? u.joinIntent.branchId === want : true))
      .filter((u) => (mine ? u.joinIntent.branchId === (actor.branchId || 'br-b1') : true))
      .map((u) => ({ personId: u.id, name: u.name, studentId: u.studentId, joinIntent: u.joinIntent }));
    res.json(rows);
  });

  // 确认 / 驳回（门同上；非党委者**只能**处理本支部的申请）
  for (const [verb, action] of [['approve', 'join-approve'], ['reject', 'join-reject']]) {
    router.post(`/pending/:personId/${verb}`, requireAuth(db), (req, res) => {
      const actor = req.actor;
      if (!canConfirm(actor)) return res.status(403).json({ error: '无权限：仅支书/副支书/组织委员可确认入站' });
      const u = findById(db, req.params.personId);
      if (!u) return res.status(404).json({ error: '账号不存在' });
      if (!u.joinIntent || !u.joinIntent.branchId) return res.status(409).json({ error: '该账号没有待确认的入站申请' });
      const target = String((req.body && req.body.branchId) || u.joinIntent.branchId);
      if (actor.role !== 'party-staff' && target !== (actor.branchId || 'br-b1')) {
        return res.status(403).json({ error: '无权限：只能处理本支部的入站申请' });
      }
      if (verb === 'approve') {
        if (!branchExists(db, target)) return res.status(400).json({ error: '支部不存在' });
        u.branchId = target;                       // ⚠ 归属落定：这一刻起该成员才属于某支部
        u.joinApprovedBy = actor.id;
        u.joinApprovedAt = new Date().toISOString();
        delete u.joinIntent;
      } else {
        u.joinRejectedBy = actor.id;               // 驳回：清意向、**保持未归属**（可重新选支部）
        u.joinRejectedAt = new Date().toISOString();
        delete u.joinIntent;
      }
      putUser(db, u);
      const audited = audit(db, { targetPersonId: u.id, branchId: target, actorId: actor.id, action });
      res.json({ ok: true, user: u, audit: audited });
    });
  }

  return router;
}
