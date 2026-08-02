// server/test/e2e-login.test.js — Task 9 端到端验证
//
// 全链路：账号密码登录 → 后端签发 token → 前端切换 API 数据源
//         → 首页渲染 → 同源后端数据可达
//
// 自包含设计：测试内用 createApp({ dbPath: ':memory:' }) + seedDatabase
// 启动真实服务并监听随机端口，不依赖外部已启动的服务器；
// t.after 统一关闭 browser 与 server，`npm test`（裸 node --test 自动发现）可直接运行。
//
// 说明：
// - 登录必须走账号密码表单（#student-id / #password），不走 dev 卡片（devLogin 不产生 API token）。
// - 合法账号 2300010001/123456 → personId 'p13'（党支部书记 沈一），p13 在种子 users 表中。
// - fresh browser context 下 localStorage 为空：登录页不会因已登录自动跳转；
//   首页首次加载会触发 CODE_VERSION 自检 reload 一次，sessionStorage（含 API token）在 reload 间保留。

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

let server;
let base;
let browser;

before(async () => {
  // 启动 app（内存库 + 种子）并监听随机端口
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;

  browser = await chromium.launch({ headless: true });
});

after(async () => {
  if (browser) await browser.close();
  if (server) {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
});

test('账号密码登录后切换 API 数据源，首页渲染且后端数据可达', async () => {
  const page = await browser.newPage();
  try {
    // 1. 打开登录页（fresh context，无历史登录态）
    await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });

    // 2. 通过账号密码表单登录（2300010001/123456 → p13 书记）
    await page.fill('#student-id', '2300010001');
    await page.fill('#password', '123456');
    await Promise.all([
      page.waitForURL('**/index.html', { timeout: 10000 }),
      page.click('button[type="submit"]'),
    ]);

    // 3. 登录成功应写入 API token（AuthStore.login → enableApiMode）
    const token = await page.evaluate(() => sessionStorage.getItem('gsm1921-api-token'));
    assert.ok(token, '登录成功后 sessionStorage 应存在 gsm1921-api-token');

    // 4. 首页正常渲染：等待 header 渲染出书记身份标签（“党支部书记”）
    await page.waitForFunction(() => {
      const header = document.getElementById('app-header');
      return header && header.textContent.includes('党支部书记');
    }, { timeout: 10000 });
    assert.match(await page.title(), /管理引擎/);

    // 5. 后端数据可达：页面上下文同源 fetch bootstrap 应返回 users 数组
    const bootstrap = await page.evaluate(async () => {
      const res = await fetch('/api/v1/bootstrap');
      if (!res.ok) return { ok: false, status: res.status };
      const data = await res.json();
      return { ok: true, users: data.users };
    });
    assert.equal(bootstrap.ok, true, 'bootstrap 接口应可访问');
    assert.ok(
      Array.isArray(bootstrap.users) && bootstrap.users.length > 0,
      'bootstrap 应返回非空 users 数组'
    );
  } finally {
    await page.close();
  }
});
