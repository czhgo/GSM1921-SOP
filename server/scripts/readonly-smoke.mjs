#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════
//  server/scripts/readonly-smoke.mjs —— 只读演练冒烟（READ_ONLY=1）
//
//  用法（在 server/ 目录下；服务须已以 READ_ONLY=1 启动）：
//    node scripts/readonly-smoke.mjs --login 9000000001 <口令>
//    BASE=http://127.0.0.1:3000 node scripts/readonly-smoke.mjs --login <学号> <口令>
//
//  判据（以服务端真实响应为准）：
//    ① 存活：GET /api/v1/health ⇒ 200 {ok:true}
//    ② 登录：POST /api/v1/auth/login ⇒ 200（认证域在只读模式下放行）
//    ③ 首页：GET / ⇒ 200
//    ④ 六台读口：activities / attendances / inspections / notices / signups / todos 均 200（只读正常）
//    ⑤ 写口 403：snapshot（POST）· 通用资源（POST notices / PATCH users/:id / DELETE activities/:id）
//                 · 语义写（POST /api/v1/members）——错误文案须含「只读」
//  退出码：0 全过 / 1 有失败。
// ════════════════════════════════════════════════════════════════
const BASE = (process.env.BASE || `http://127.0.0.1:${process.env.PORT || 3000}`).replace(/\/$/, '');
const argv = process.argv.slice(2);
const li = argv.indexOf('--login');
const PERSON = li === -1 ? (process.env.SMOKE_PERSON || null) : (argv[li + 1] || process.env.SMOKE_PERSON || null);
const PASSWORD = li === -1 ? (process.env.SMOKE_PASSWORD || null) : (argv[li + 2] || process.env.SMOKE_PASSWORD || null);

let failed = 0;
const ok = (m) => console.log(`  ✔ ${m}`);
const bad = (m) => { failed++; console.error(`  ✖ ${m}`); };

async function req(path, options = {}) {
  const r = await fetch(BASE + path, options);
  let body = null;
  const text = await r.text();
  try { body = JSON.parse(text); } catch (_) { body = text; }
  return { status: r.status, body, text };
}

async function main() {
  console.log(`[readonly-smoke] 目标 ${BASE}`);

  try {
    const health = await req('/api/v1/health');
    if (health.status === 200 && health.body && health.body.ok === true) ok('存活 /api/v1/health ⇒ {ok:true}');
    else bad(`存活探针异常：HTTP ${health.status}`);
  } catch (e) { bad(`存活探针不可达：${e.message}`); }

  if (!PERSON || !PASSWORD) {
    bad('缺少登录参数：--login <学号> <口令>（或设 SMOKE_PERSON / SMOKE_PASSWORD）');
  } else {
    let token = null;
    try {
      const login = await req('/api/v1/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personId: PERSON, password: PASSWORD }),
      });
      if (login.status === 200 && login.body && login.body.token) {
        token = login.body.token;
        ok(`登录在只读模式下仍放行 ⇒ ${login.body.user?.name || PERSON}`);
      } else bad(`登录失败（只读模式应放行认证域）：HTTP ${login.status} ${String(login.text).slice(0, 120)}`);
    } catch (e) { bad(`登录不可达：${e.message}`); }

    const h = token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : {};

    try {
      const home = await req('/');
      if (home.status === 200) ok('首页 GET / ⇒ 200');
      else bad(`首页异常：HTTP ${home.status}`);
    } catch (e) { bad(`首页不可达：${e.message}`); }

    if (token) {
      // 六台读口（活动/考勤/考察/通知/报名/待办）
      for (const name of ['activities', 'attendances', 'inspections', 'notices', 'signups', 'todos']) {
        try {
          const got = await req(`/api/v1/${name}`, { headers: h });
          if (got.status === 200) ok(`读口 GET /api/v1/${name} ⇒ 200`);
          else bad(`读口 GET /api/v1/${name} ⇒ HTTP ${got.status}`);
        } catch (e) { bad(`读口 ${name} 不可达：${e.message}`); }
      }

      // 写口 403（含 snapshot / 通用 CRUD / 语义写）
      const writes = [
        ['POST', '/api/v1/snapshot', { activities: [], _versions: { activities: 0 } }],
        ['POST', '/api/v1/notices', { title: '只读冒烟写入', content: '应被拒绝' }],
        ['PATCH', `/api/v1/users/${encodeURIComponent(PERSON)}`, { role: 'participant' }],
        ['DELETE', '/api/v1/activities/act-1', null],
        ['POST', '/api/v1/members', { id: 'readonly-probe', name: '只读探测' }],
        ['PUT', '/api/v1/branches/br-b1/roster', { members: [{ id: 'readonly-probe', name: '只读探测' }] }],
      ];
      for (const [method, path, body] of writes) {
        try {
          const got = await req(path, { method, headers: h, ...(body ? { body: JSON.stringify(body) } : {}) });
          const message = typeof got.body?.error === 'string' ? got.body.error : String(got.text || '');
          if (got.status === 403 && /只读|READ_ONLY/i.test(message)) ok(`写口 ${method} ${path} ⇒ 403（${message.slice(0, 24)}…）`);
          else bad(`写口 ${method} ${path} 应 403 + 只读文案，实测 HTTP ${got.status}：${message.slice(0, 80)}`);
        } catch (e) { bad(`写口 ${method} ${path} 不可达：${e.message}`); }
      }

      // 清理会话不是业务写——登出允许（不作为判据，失败不影响结论）
      await fetch(`${BASE}/api/v1/auth/logout`, { method: 'POST', headers: h }).catch(() => {});
    }
  }

  console.log(failed ? `[readonly-smoke] ⛔ ${failed} 项失败` : '[readonly-smoke] ✅ 全部通过');
  process.exitCode = failed ? 1 : 0;
}

await main();
