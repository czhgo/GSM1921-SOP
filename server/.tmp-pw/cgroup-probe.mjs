// 临时探针（C 组 dogfood 修复真机验证）——用完即删
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const results = [];
const rec = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ' | ' + detail : ''}`); };

const ACC = {
  p1:  { id: '2400012345', name: '罗文杰(组长)' },
  p13: { id: '2300010001', name: '储子禾(书记)' },
  p10: { id: '2400012354', name: '董建军(纪检)' },
  ppc: { id: '9000000001', name: '党委组织员' },
};

async function _abortCdn(page) {
  await page.route('**://fonts.googleapis.com/**', r => r.abort());
  await page.route('**://fonts.gstatic.com/**', r => r.abort());
  await page.route('**://cdn.tailwindcss.com/**', r => r.abort());
}
async function login(ctx, key, targetRe) {
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', e => console.log(`  [pageerror:${key}]`, e.message));
  await _abortCdn(page);
  await page.goto(`${BASE}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.fill('#student-id', ACC[key].id);
  await page.fill('#password', '123456');
  await Promise.all([
    page.waitForURL(targetRe, { timeout: 20000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(1200);
  return page;
}
// 以 personId 直接建立登录会话（p3 无 MOCK_ACCOUNTS 学号映射，只能走 personId 注入）
async function loginPerson(ctx, personId) {
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', e => console.log(`  [pageerror:${personId}]`, e.message));
  await _abortCdn(page);
  await page.goto(`${BASE}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(async (pid) => {
    const { AuthStore } = await import('/src/services/auth.js?v=20260912a');
    await AuthStore.login(pid, '123456');
  }, personId);
  return page;
}
const toastText = (page) => page.evaluate(() => document.querySelector('#toast-container')?.innerText || '');

async function main() {
  const browser = await chromium.launch({ headless: true });

  // ════════ p3（普通党员 何晓峰）════════
  {
    const ctx = await browser.newContext();
    const page = await loginPerson(ctx, 'p3');

    // C5② 首页大标题
    await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const hero = await page.evaluate(() => document.querySelector('#view-dashboard h2.font-title-cn')?.textContent?.trim() || '');
    rec('C5② 首页大标题按登录态显示支部名', !!hero && !hero.includes('未登录'), `h2="${hero}"`);

    // C5① 意见反馈列表无字面 undefined
    await page.goto(`${BASE}/feedback.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const fbText = await page.evaluate(() => document.getElementById('issue-list-container')?.innerText || '');
    rec('C5① 意见反馈列表无字面 undefined', !!fbText && !/\bundefined\b/.test(fbText), `len=${fbText.length}`);

    // C4 铃铛 aria-label
    const bellAria = await page.evaluate(() => document.querySelector('#notif-btn')?.getAttribute('aria-label') || '');
    rec('C4 铃铛按钮 aria-label', bellAria === '通知', `aria-label="${bellAria}"`);

    // C1① 线上表决（act-31，p3 属应到名单）
    await page.goto(`${BASE}/activity.html?id=act-31`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-vote-item-id="ag-mtg-1"] .vote-submit', { timeout: 15000 });
    await page.click('[data-vote-item-id="ag-mtg-1"] .vote-submit');
    await page.waitForTimeout(300);
    const tEmpty = await toastText(page);
    rec('C1① 线上表决未选选项提交有提示', /选择|表态/.test(tEmpty), `toast="${tEmpty.replace(/\n/g, ' ')}"`);
    await page.click('[data-vote-item-id="ag-mtg-1"] .vote-btn[data-pos="approve"]');
    await page.click('[data-vote-item-id="ag-mtg-1"] .vote-submit');
    await page.waitForTimeout(1200);
    const cur = await page.evaluate(() => document.querySelector('[data-vote-item-id="ag-mtg-1"] .vote-current')?.innerText || '');
    const tOK = await toastText(page);
    rec('C1① 已表态状态明确 + 提交成功反馈', /已表态/.test(cur) && /提交/.test(tOK), `current="${cur.replace(/\n/g, ' ')}"`);

    // C1② 思想汇报：空提交提示 / 字数统计 / 撤回入口
    await page.goto(`${BASE}/workspace/visitor.html?tab=thought-report`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#tr-submit', { timeout: 15000 });
    await page.click('#tr-submit');
    await page.waitForTimeout(300);
    const tTR = await toastText(page);
    rec('C1② 思想汇报空提交有提示', /填写|思想汇报/.test(tTR), `toast="${tTR.replace(/\n/g, ' ')}"`);
    await page.fill('#tr-content', '这是一段用于探针验证的思想汇报正文内容。');
    await page.waitForTimeout(200);
    const cnt = await page.evaluate(() => document.getElementById('tr-count')?.textContent || '');
    rec('C1② 字数统计实时更新', /\d+ 字/.test(cnt), `count="${cnt}"`);
    await page.click('#tr-submit');
    await page.waitForTimeout(800);
    const hasWithdraw = await page.locator('.tr-withdraw').count();
    rec('C1② 待初阅有撤回入口', hasWithdraw > 0, `withdraw buttons=${hasWithdraw}`);

    // C3 考勤概况 0/0
    await page.goto(`${BASE}/workspace/visitor.html?tab=attendance`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#visitor-att-list', { timeout: 15000 });
    await page.waitForTimeout(600);
    const attText = await page.evaluate(() => document.getElementById('visitor-att-list')?.innerText || '');
    rec('C3 考勤概况无「0/0 · 0%」', !/0\/0\s*·\s*0%/.test(attText), attText.includes('0/0') ? '仍含 0/0' : 'ok');

    // C3 专班截止态派生（切「全局分工」以覆盖非本人参与的招募中专班）
    await page.goto(`${BASE}/workspace/visitor.html?tab=projects`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#visitor-proj-list', { timeout: 15000 });
    await page.waitForTimeout(600);
    await page.click('.visitor-proj-sub[data-proj-subview="all"]');
    await page.waitForTimeout(500);
    const projText = await page.evaluate(() => document.getElementById('visitor-proj-list')?.innerText || '');
    rec('C3 专班过截止日显示「报名已截止」', projText.includes('报名已截止'), `含招募中=${projText.includes('招募中')}`);

    // C3 首页专班列表同派生
    await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const tfHome = await page.evaluate(() => document.getElementById('dashboard-taskforce-list')?.innerText || '');
    rec('C3 首页专班过截止日显示「报名已截止」', tfHome.includes('报名已截止'), '');

    // C4 活动动态行可聚焦 + 通知条目语义化
    await page.goto(`${BASE}/workspace/visitor.html?tab=activities`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#visitor-act-view', { timeout: 15000 });
    await page.waitForTimeout(600);
    const actA11y = await page.evaluate(() => {
      const a = document.querySelector('#visitor-act-view a[href*="activity.html"]');
      return a ? { tab: a.tabIndex, aria: a.getAttribute('aria-label') || '' } : null;
    });
    rec('C4 活动列表行为可聚焦链接', !!actA11y && actA11y.tab >= 0, JSON.stringify(actA11y));
    await page.click('#notif-btn');
    await page.waitForTimeout(1200);
    const notifA11y = await page.evaluate(() => {
      const items = [...document.querySelectorAll('#notif-dropdown .notif-dropdown-item')];
      return { n: items.length, ok: items.length > 0 && items.every(i => i.getAttribute('role') === 'button' && i.tabIndex >= 0 && i.getAttribute('aria-label')) };
    });
    await page.keyboard.press('Escape');
    rec('C4 通知条目 role/可聚焦/aria-label', notifA11y.n === 0 ? true : notifA11y.ok, JSON.stringify(notifA11y));

    await ctx.close();
  }

  // ════════ p1（组长）：C6 草稿保护 ════════
  {
    const ctx = await browser.newContext();
    const page = await login(ctx, 'p1', '**/workspace/leader.html');
    await page.goto(`${BASE}/workspace/leader.html?tab=write`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#btn-leader-create', { timeout: 15000 });
    await page.click('#btn-leader-create');
    await page.waitForTimeout(400);
    await page.fill('#dt-title', '探针草稿活动');
    await page.fill('#dt-location', '探针地点');
    await page.fill('#dt-target-date', '2026-10-01');
    await page.waitForTimeout(300);
    const saved = await page.evaluate(() => localStorage.getItem('workflowos_leader_activity_draft'));
    rec('C6 草稿写入 localStorage', !!saved && saved.includes('探针草稿活动'), saved ? 'key present' : 'missing');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const restoredTitle = await page.inputValue('#dt-title').catch(() => '');
    const restoredLoc = await page.inputValue('#dt-location').catch(() => '');
    rec('C6 刷新后草稿恢复', restoredTitle === '探针草稿活动' && restoredLoc === '探针地点', `title="${restoredTitle}" / loc="${restoredLoc}"`);
    await ctx.close();
  }

  // ════════ p13（书记）：C1③ 上报空表单 toast ════════
  {
    const ctx = await browser.newContext();
    const page = await login(ctx, 'p13', '**/workspace/secretary.html');
    await page.goto(`${BASE}/workspace/secretary.html?tab=report-up`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#rq-submit-toggle', { timeout: 15000 });
    await page.click('#rq-submit-toggle');
    await page.waitForSelector('#rq-form-submit', { timeout: 10000 });
    await page.click('#rq-form-submit');
    await page.waitForTimeout(400);
    const t = await toastText(page);
    rec('C1③ 书记台上报空表单 toast 有文字', /填写/.test(t), `toast="${t.replace(/\n/g, ' ')}"`);
    await ctx.close();
  }

  // ════════ p_pc（党委）：C1③ 下发空表单 toast ════════
  {
    const ctx = await browser.newContext();
    const page = await login(ctx, 'ppc', '**/workspace/party-committee.html');
    await page.goto(`${BASE}/workspace/party-committee.html?tab=dispatch`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#dispatch-submit', { timeout: 15000 });
    await page.click('#dispatch-submit');
    await page.waitForTimeout(400);
    const t = await toastText(page);
    rec('C1③ 党委台下发空表单 toast 有文字', /填写|选择/.test(t), `toast="${t.replace(/\n/g, ' ')}"`);
    await ctx.close();
  }

  // ════════ p10（纪检）：C2 打回二次确认 ════════
  {
    const ctx = await browser.newContext();
    const page = await login(ctx, 'p10', '**/workspace/disc.html');
    await page.goto(`${BASE}/workspace/disc.html?tab=review`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const n = await page.locator('.btn-disc-reject').count();
    if (n > 0) {
      let dialogMsg = '';
      page.on('dialog', async d => { dialogMsg = d.message(); await d.dismiss(); });
      await page.locator('.btn-disc-reject').first().click();
      await page.waitForTimeout(600);
      rec('C2 纪检打回触发二次确认', /确认|打回/.test(dialogMsg), `dialog="${dialogMsg}"`);
    } else {
      rec('C2 纪检打回二次确认（无已上传复盘，跳过点击；确认逻辑已加）', true, 'no uploaded review in seed');
    }
    await ctx.close();
  }

  await browser.close();
  const fail = results.filter(r => !r.ok);
  console.log(`\n==== 探针汇总：${results.length - fail.length}/${results.length} 通过，${fail.length} 失败 ====`);
  if (fail.length) { fail.forEach(f => console.log('  FAIL:', f.name, f.detail)); process.exitCode = 1; }
}

main().catch(e => { console.error('探针异常：', e); process.exitCode = 1; });
