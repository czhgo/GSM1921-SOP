#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════
//  deploy/smoke.mjs —— 上线/更新后的**冒烟检查**（跨平台，纯 Node）
//
//  用法：
//    node deploy/smoke.mjs                          # 只探存活
//    node deploy/smoke.mjs --login <personId> <口令>  # 追加「登录 + 读 /me」
//    BASE=http://127.0.0.1:3000 node deploy/smoke.mjs
//    # 也可用环境变量：SMOKE_PERSON / SMOKE_PASSWORD（避免口令进命令历史）
//
//  判据（**以服务端真实响应为准**，不看日志）：
//    ① `GET /api/v1/health` ⇒ 200 且 body `{"ok":true}`
//    ② `POST /api/v1/auth/login` ⇒ 200 且拿到 token（**表单是 `{personId, password}`**——
//       本系统是「选人 + 全支部统一口令」，没有个人密码；见 server/routes/auth.js:24）
//    ③ `GET /api/v1/auth/me` 带 token ⇒ 200 且返回本人（**注意在 `/auth` 前缀下**，不是 `/api/v1/me`）
//  退出码：0 全过 / 1 有失败（可直接当更新脚本的门）。
//
//  ⚠ 两处实现注意（2026-09-29 批次 269 实测踩到并已修）：
//    ① 登录**必须带 `personId`**——只传 password 会得到 401「未知人员」；
//    ② **不要用 `process.exit()` 收尾**：Node 24 + Windows 下会在 undici 句柄仍在关闭时
//       触发 libuv 断言（`Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)`）并返回垃圾退出码；
//       改用 `process.exitCode`，等事件循环自然收敛。
// ════════════════════════════════════════════════════════════════
const BASE = (process.env.BASE || 'http://127.0.0.1:' + (process.env.PORT || 3000)).replace(/\/$/, '');
const argv = process.argv.slice(2);
const li = argv.indexOf('--login');
const PERSON = li === -1 ? null : (argv[li + 1] || process.env.SMOKE_PERSON || null);
const PASSWORD = li === -1 ? null : (argv[li + 2] || process.env.SMOKE_PASSWORD || null);

let failed = 0;
const ok = (m) => console.log(`  ✔ ${m}`);
const bad = (m) => { failed++; console.error(`  ✖ ${m}`); };

async function main() {
  console.log(`[smoke] 目标 ${BASE}`);
  try {
    const r = await fetch(`${BASE}/api/v1/health`);
    const j = await r.json().catch(() => null);
    if (r.ok && j && j.ok === true) ok('存活探针 /api/v1/health ⇒ {ok:true}');
    else bad(`存活探针异常：HTTP ${r.status}　body=${JSON.stringify(j)}`);
  } catch (e) { bad(`存活探针不可达：${e.message}`); }

  if (li === -1) {
    console.log('  · 未传 --login，跳过登录两项');
  } else if (!PERSON || !PASSWORD) {
    console.log('  · --login 需两个参数（personId 口令），或设 SMOKE_PERSON / SMOKE_PASSWORD；本次跳过');
  } else {
    let token = null;
    try {
      const r = await fetch(`${BASE}/api/v1/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personId: PERSON, password: PASSWORD }),
      });
      const j = await r.json().catch(() => null);
      if (r.ok && j && j.token) { token = j.token; ok(`登录 /api/v1/auth/login ⇒ ${j.user?.name || PERSON}`); }
      else bad(`登录失败：HTTP ${r.status}　body=${JSON.stringify(j).slice(0, 200)}`);
    } catch (e) { bad(`登录不可达：${e.message}`); }
    if (token) {
      try {
        const r = await fetch(`${BASE}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        const j = await r.json().catch(() => null);
        if (r.ok && j && j.id) ok(`读本人 /api/v1/auth/me ⇒ ${j.name || j.id}`);
        else bad(`读本人失败：HTTP ${r.status}`);
        // 清理：登出，别在库里攒 session
        await fetch(`${BASE}/api/v1/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
      } catch (e) { bad(`读本人不可达：${e.message}`); }
    }
  }
  console.log(failed ? `[smoke] ⛔ ${failed} 项失败` : '[smoke] ✅ 全部通过');
  process.exitCode = failed ? 1 : 0;   // ⚠ 不用 process.exit()（见文件头注意②）
}

await main();
