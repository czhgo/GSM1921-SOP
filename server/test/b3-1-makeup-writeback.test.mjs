// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/b3-1-makeup-writeback.test.mjs — B3-1 补课完成→考勤回写 made_up（T-280）
//
//  【2026-09-29 批次 274 按已定方向改写为 **API 级**（`H-13` / `D-685`）】
//
//  为什么要改（原版为何长期红，根因已实证）：
//    · 原版用 `?dev=disc-commissioner`（**开发模式 = mock 形态**）登录，把补课任务注入前端 `mockDB` 后
//      `persist()`——而 **mock 形态的 `persist()` 不落库**（`isDemoReadOnly()`/mock-adapter 只写本机）；
//    · 而「补课」列表 `loadMakeupTasks()` 在**服务端形态**下读的是 `GET /api/v1/makeupTasks` ⇒
//      **服务端压根没有这条任务** ⇒ 列表里点不到 ⇒ 连带 3 项断言全红。
//      （实证：`docs/src/entries/tabs/disc/makeup-tab.js:29-30` 取全表、**无日期窗过滤**
//        ⇒ 所以「夹具过期」不是本条的根因，「任务不在服务端」才是。）
//    · 口径（`D-677` 数据形态冲突取 **API 优先**）：本用例**只在 api 态成立即可**，不再要求 mock 态同过。
//
//  改写后的判据链（全部落在**服务端真值**上）：
//    ① 以 **API** 造前置态（`POST /api/v1/attendances` ＋ `POST /api/v1/makeupTasks`），日期取**相对今天**有效值
//       （`deadline = 今天 + 4 天` ⇒ 状态「待补课」⇒ 按钮出现）；
//    ② 浏览器走**真 API 登录**（登录页表单：学号 ＋ 口令）⇒ 会话里出现 `gsm1921-api-token`；
//    ③ 在「考勤管理 → 补课」分段点「确认完成」（`makeup-tab.js` 的 B3-1 回写分支）；
//    ④ 读回断言走 `GET /api/v1/attendances` / `GET /api/v1/makeupTasks`（**不看前端内存**）；
//    ⑤ 收尾 `DELETE` 自清（不留测试数据）。
//
//  运行：先启动 server（缺省 :3000），再 `node --test server/test/b3-1-makeup-writeback.test.mjs`
// ════════════════════════════════════════════════════════════════
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const PW = process.env.LOGIN_PASSWORD || '123456';
const DISC_PERSON = 'p10';               // 纪检委员（`docs/src/data/mock/people.js`）
const DISC_STUDENT = '2400012354';       // 上者的学号（登录页表单用学号）
const MENTEE = 'p5';                     // 被补课人
const RID = Math.random().toString(36).slice(2, 8);
const ATT_ID = `att-b31-${RID}`;
const MK_ID = `mk-b31-${RID}`;
const today = new Date();
const dstr = (d) => d.toISOString().split('T')[0];
const ABSENT_DATE = dstr(new Date(today.getTime() - 3 * 864e5));   // 活动日＝3 天前
const DEADLINE = dstr(new Date(today.getTime() + 4 * 864e5));      // 截止＝4 天后（⇒「待补课」）

const api = async (method, path, { token, body } = {}) => {
  const r = await fetch(BASE + path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json = null; try { json = JSON.parse(text); } catch { /* 非 JSON */ }
  return { status: r.status, json, text };
};

test('B3-1（API 级）补课完成 → 服务端考勤回写 made_up ＋ overdue 清除', async (t) => {
  // ── ① 前置：API 登录（失败 ⇒ 明确报「server 未起 / 口令不符」而不是含糊失败）──
  const login = await api('POST', '/api/v1/auth/login', { body: { personId: DISC_PERSON, password: PW } });
  assert.equal(login.status, 200, `纪检登录失败（HTTP ${login.status} ${login.text.slice(0, 120)}）`
    + '——请确认 server 已在 ' + BASE + ' 运行，且口令与 LOGIN_PASSWORD 一致');
  const token = login.json.token;
  assert.ok(token, '登录未返回 token');

  // 取一条活动（补课任务要挂活动；若库里没有活动就现造一条，日期用相对今天的有效值）
  let activityId = (await api('GET', '/api/v1/activities', { token })).json?.[0]?.id;
  if (!activityId) {
    activityId = `act-b31-${RID}`;
    const mk = await api('POST', '/api/v1/activities', { token, body: {
      id: activityId, name: 'B3-1 测试活动', date: ABSENT_DATE, type: '支委会',
    } });
    assert.equal(mk.status, 201, `造活动失败：HTTP ${mk.status} ${mk.text.slice(0, 120)}`);
  }
  const activityName = (await api('GET', '/api/v1/activities', { token })).json
    .find((a) => a.id === activityId)?.name || 'B3-1 测试活动';

  // ── ② 以 API 造前置态：考勤（absent ＋ overdue）＋ 补课任务（pending，截止在未来）──
  assert.equal((await api('POST', '/api/v1/attendances', { token, body: {
    id: ATT_ID, personId: MENTEE, activityId, status: 'absent', overdue: true,
    recordedBy: DISC_PERSON, recordedAt: new Date().toISOString(),
  } })).status, 201, '造考勤记录失败');
  assert.equal((await api('POST', '/api/v1/makeupTasks', { token, body: {
    id: MK_ID, personId: MENTEE, activityId, attendanceRecordId: ATT_ID,
    activityName, personName: '测试成员', absentDate: ABSENT_DATE, deadline: DEADLINE,
    status: 'pending', isMandatory: true, createdAt: new Date().toISOString(),
  } })).status, 201, '造补课任务失败');

  // 反例锁死：确认前置态**确实是** absent＋overdue（否则「回写成功」可能是恒真）
  const before = (await api('GET', '/api/v1/attendances', { token })).json.find((r) => r.id === ATT_ID);
  assert.equal(before.status, 'absent', '前置态应为 absent（否则回写分支不会执行）');
  assert.equal(before.overdue, true, '前置态应为 overdue=true（保持「overdue 清除」的检出力）');

  // ── ③ 浏览器：走**真 API 登录**（登录页表单），再进纪检台的补课分段 ──
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  try {
    await p.goto(`${BASE}/login.html`, { waitUntil: 'domcontentloaded' });
    await p.fill('#student-id', DISC_STUDENT);
    await p.fill('#password', PW);
    await p.click('button[type="submit"]');
    // 会话落地的判据：sessionStorage 出现 API token（= 真的走了服务端，而不是开发模式）
    await p.waitForFunction(() => !!sessionStorage.getItem('gsm1921-api-token'), null, { timeout: 15000 });

    await p.goto(`${BASE}/workspace/disc.html`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(2500);
    await p.click('.disc-tab-btn[data-disc-tab="attendance"]').catch(() => {});
    await p.waitForTimeout(1200);
    await p.click('.att-seg-btn[data-seg="makeup"]').catch(() => {});
    await p.waitForTimeout(1200);

    const visible = await p.evaluate((id) => !!document.querySelector(`.btn-disc-confirm-makeup[data-task-id="${id}"]`), MK_ID);
    assert.ok(visible, '注入的补课任务应出现在待补课列表（服务端造的数据 ⇒ 列表读得到）');

    await p.click(`.btn-disc-confirm-makeup[data-task-id="${MK_ID}"]`);
    await p.waitForTimeout(1500);

    assert.deepEqual(errs, [], `页面不应有 JS 错误：${errs.slice(0, 2).join(' | ')}`);
  } finally {
    await ctx.close();
    await browser.close();
  }

  // ── ④ 读回断言：**服务端真值**（`GET /api/v1/…`），不看前端内存 ──
  const att = (await api('GET', '/api/v1/attendances', { token })).json.find((r) => r.id === ATT_ID);
  const task = (await api('GET', '/api/v1/makeupTasks', { token })).json.find((r) => r.id === MK_ID);
  assert.ok(att && task, '服务端应仍有这两行（读回判据的前提）');
  assert.equal(task.status, 'completed', `补课任务应回写 completed，实测 ${task.status}`);
  assert.ok(task.completedAt, '应记 completedAt');
  assert.equal(att.status, 'made_up', `考勤应回写 made_up，实测 ${att.status}`);
  assert.equal(att.overdue, false, `overdue 应清除，实测 ${att.overdue}`);
  assert.ok(att.madeUpAt, '应记 madeUpAt');

  // ── ⑤ 自清：不留测试数据 ──
  await api('DELETE', `/api/v1/makeupTasks/${MK_ID}`, { token });
  await api('DELETE', `/api/v1/attendances/${ATT_ID}`, { token });
  const gone = (await api('GET', '/api/v1/attendances', { token })).json.find((r) => r.id === ATT_ID);
  assert.equal(gone, undefined, '清理应生效（否则测试库会被污染）');
});
