import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const out = (...a) => console.log(...a);
const browser = await chromium.launch({ headless: true });

async function newCtx() {
  const c = await browser.newContext();
  const p = await c.newPage();
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  return { c, p, errs };
}

async function login(p, role) {
  await p.goto(`${BASE}/login.html`, { waitUntil: 'domcontentloaded' });
  await p.locator('#dev-toggle').check();
  await p.locator(`.login-card[data-role="${role}"]`).first().click();
  await p.waitForFunction(() => window.location.href.includes('workspace'), null, { timeout: 15000 });
  await p.waitForTimeout(2600);
}

const fileFor = (role) => role === 'org-commissioner' ? 'org' : role === 'prop-commissioner' ? 'prop' : role === 'disc-commissioner' ? 'disc' : role === 'leader' ? 'leader' : 'secretary';
const prefixFor = (role) => role === 'org-commissioner' ? 'org' : role === 'prop-commissioner' ? 'prop' : role === 'disc-commissioner' ? 'disc' : role === 'leader' ? 'leader' : 'secretary';

try {
  const A = await newCtx();
  await login(A.p, 'secretary');
  const token = await A.p.evaluate(() => { try { return sessionStorage.getItem('gsm1921-api-token'); } catch { return null; } });
  out('[env] api token present:', !!token, '| url:', A.p.url());

  await A.p.locator('.secretary-tab-btn[data-secretary-tab="notification"]').click();
  await A.p.waitForTimeout(900);
  const T1 = 'S1验证通知' + Date.now();
  await A.p.fill('#notif-title', T1);
  await A.p.fill('#notif-content', '正文内容：这是一条用于 S1 验证的通知，id 非 MOCK_NOTICES 种子。');
  await A.p.locator('[data-notif-action="select-audience"][data-value="all"]').click();
  await A.p.locator('[data-notif-action="publish"]').click();
  await A.p.waitForTimeout(1200);
  const notifId = await A.p.evaluate((t) => {
    const rows = [...document.querySelectorAll('[data-notif-id]')];
    const hit = rows.find(r => (r.innerText || '').includes(t));
    return hit ? hit.dataset.notifId : null;
  }, T1);
  out('[S1] published notice id =', notifId, '(非种子)');

  const badge = await A.p.evaluate(() => document.getElementById('notif-badge')?.textContent || '0');
  await A.p.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded' });
  await A.p.waitForTimeout(1800);
  const homeCount = await A.p.evaluate(() => document.getElementById('dashboard-notice-count')?.textContent || '');
  await A.p.goto(`${BASE}/workspace/secretary.html`, { waitUntil: 'domcontentloaded' });
  await A.p.waitForTimeout(2600);
  await A.p.locator('.secretary-tab-btn[data-secretary-tab="todo"]').click();
  await A.p.waitForTimeout(2200);
  const barCount = await A.p.evaluate(() => (document.querySelector('.secretary-unread-toggle')?.innerText || '').replace(/\s+/g, ' ').trim());
  out('[S3②] 顶栏角标 =', JSON.stringify(badge), '| 首页 =', JSON.stringify(homeCount), '| 待办未读条 =', JSON.stringify(barCount));

  await A.p.goto(`${BASE}/notice.html?id=${notifId}`, { waitUntil: 'domcontentloaded' });
  await A.p.waitForTimeout(2500);
  const cardText = await A.p.evaluate(() => document.getElementById('notice-detail-card')?.innerText || '');
  out('[S1] notice.html?id=' + notifId + ' 标题命中:', cardText.includes(T1), '| 不存在提示:', cardText.includes('不存在'));
  out('[S1] 卡片节选:', JSON.stringify(cardText.slice(0, 70)));

  await A.p.goto(`${BASE}/workspace/secretary.html`, { waitUntil: 'domcontentloaded' });
  await A.p.waitForTimeout(2600);
  await A.p.locator('.secretary-tab-btn[data-secretary-tab="todo"]').click();
  await A.p.waitForTimeout(1800);
  await A.p.locator('.secretary-tab-btn[data-secretary-tab="overview"]').click();
  await A.p.waitForTimeout(2400);
  const ovSig = await A.p.evaluate(() => (document.getElementById('secretary-tab-content')?.innerText || '').replace(/\s+/g, ' ').slice(0, 50));
  await A.p.locator('.secretary-tab-btn[data-secretary-tab="notification"]').click();
  await A.p.waitForTimeout(1400);
  const nfSig = await A.p.evaluate(() => (document.getElementById('secretary-tab-content')?.innerText || '').replace(/\s+/g, ' ').slice(0, 30));
  out('[S2] sig overview=', JSON.stringify(ovSig), '| notification=', JSON.stringify(nfSig));

  for (let i = 1; i <= 3; i++) {
    await A.p.goto(`${BASE}/workspace/secretary.html?tab=overview`, { waitUntil: 'domcontentloaded' });
    await A.p.waitForSelector('.secretary-tab-btn', { timeout: 15000 }).catch(() => {});
    await A.p.waitForTimeout(3000);
    const r = await A.p.evaluate(() => ({
      active: document.querySelector('.secretary-tab-btn.tab-btn-active')?.dataset.secretaryTab || null,
      anyBtn: document.querySelectorAll('.secretary-tab-btn').length,
      text: (document.getElementById('secretary-tab-content')?.innerText || '').replace(/\s+/g, ' ').slice(0, 50),
      isTodo: !!document.querySelector('#secretary-tab-content [data-ws-memo="todo-shell"]'),
    }));
    out(`[S2] run#${i} ?tab=overview → active=${r.active} btns=${r.anyBtn} isTodoShell=${r.isTodo} 命中overview签名=${r.text.includes(ovSig.slice(0, 18))}`);
  }
  for (let i = 1; i <= 3; i++) {
    await A.p.goto(`${BASE}/workspace/secretary.html?tab=notification`, { waitUntil: 'domcontentloaded' });
    await A.p.waitForSelector('.secretary-tab-btn', { timeout: 15000 }).catch(() => {});
    await A.p.waitForTimeout(2600);
    const r = await A.p.evaluate(() => ({
      active: document.querySelector('.secretary-tab-btn.tab-btn-active')?.dataset.secretaryTab || null,
      hit: (document.getElementById('secretary-tab-content')?.innerText || '').replace(/\s+/g, ' ').includes('发布通知'),
    }));
    out(`[S2] run#${i} ?tab=notification → active=${r.active} 内容命中发布通知=${r.hit}`);
  }

  await A.p.waitForSelector('.secretary-tab-btn[data-secretary-tab="todo"]', { timeout: 15000 }).catch(() => {});
  await A.p.focus('.secretary-tab-btn[data-secretary-tab="todo"]').catch(() => {});
  await A.p.keyboard.press('Enter');
  await A.p.waitForTimeout(1800);
  const kb = await A.p.evaluate(() => document.querySelector('.secretary-tab-btn.tab-btn-active')?.dataset.secretaryTab);
  out('[S2] 键盘 Enter 切换 → active=', kb);
  out('[console errors A@S2]', A.errs.length, JSON.stringify(A.errs.slice(0, 4)));

  await A.p.goto(`${BASE}/workspace/secretary.html?tab=today`, { waitUntil: 'domcontentloaded' });
  await A.p.waitForSelector('.secretary-tab-btn', { timeout: 15000 }).catch(() => {});
  await A.p.waitForTimeout(3000);
  const todayTxt = await A.p.evaluate(() => (document.getElementById('secretary-tab-content')?.innerText || '').replace(/\s+/g, ' ').slice(0, 140));
  out('[S4] secretary today =', JSON.stringify(todayTxt));

  await A.p.locator('.secretary-tab-btn[data-secretary-tab="notification"]').click();
  await A.p.waitForTimeout(1200);
  const delOk = await A.p.evaluate((id) => {
    const row = document.querySelector(`[data-notif-id="${id}"]`);
    const btn = row?.querySelector('[data-notif-action="delete"]');
    if (btn) { btn.click(); return true; }
    return false;
  }, notifId);
  await A.p.waitForTimeout(1000);
  out('[S1] 清理删除验证通知:', delOk);
  out('[console errors A]', A.errs.length, JSON.stringify(A.errs.slice(0, 6)));
  await A.c.close();

  for (const role of ['org-commissioner', 'prop-commissioner', 'disc-commissioner', 'leader']) {
    const B = await newCtx();
    try {
      await login(B.p, role);
      const f = fileFor(role), px = prefixFor(role);
      await B.p.goto(`${BASE}/workspace/${f}.html?tab=today`, { waitUntil: 'domcontentloaded' });
      await B.p.waitForSelector(`.${px}-tab-btn`, { timeout: 15000 }).catch(() => {});
      await B.p.waitForTimeout(3000);
      const todayHas = await B.p.evaluate((p) => {
        const el = document.getElementById(`${p}-tab-content`);
        const t = (el?.innerText || '').replace(/\s+/g, ' ');
        return { hasTodo: t.includes('本岗待办'), empty: t.includes('今天暂无安排'), snippet: t.slice(0, 80) };
      }, px);
      await B.p.goto(`${BASE}/workspace/${f}.html?tab=overview`, { waitUntil: 'domcontentloaded' });
      await B.p.waitForSelector(`.${px}-tab-btn`, { timeout: 15000 }).catch(() => {});
      await B.p.waitForTimeout(3000);
      const ov = await B.p.evaluate((p) => {
        const todos = [...document.querySelectorAll('.org-todo-item,.prop-todo-item,.disc-todo-item,.leader-todo-item')].length;
        const btns = [...document.querySelectorAll('[data-wo-jump="todo-all"]')].map(b => (b.innerText || '').replace(/\s+/g, ' ').trim());
        return { todoRows: todos, todoAllRows: btns.slice(0, 2) };
      }, px);
      out(`[S3①/S4] ${role}: today=${JSON.stringify(todayHas)} | overview 待办下钻行=${JSON.stringify(ov.todoAllRows)}`);
      out(`[S3①] ${role}: 待办 tab 组行数(切过去后计) —`);
    } catch (e) {
      out(`[ERR ${role}]`, e.message);
    }
    out(`[console errors ${role}]`, B.errs.length, JSON.stringify(B.errs.slice(0, 4)));
    await B.c.close();
  }
} catch (e) {
  out('[ERR]', e.stack || e.message);
} finally {
  await browser.close();
}
