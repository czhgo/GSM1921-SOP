// role: [工程师]+[AI]
// link-audit.mjs — 全量链接审查（T-284：书记指令「所有链接，每一个都要查」）
// 覆盖：docs/**/*.html 全部 href/src（含 base href 解析）→ 文件存在性 + #锚点存在性
//      docs/src/**/*.js 全部 location.href / window.location 跳转目标 → 文件存在性
//      L3：HTTP 层每个链接 200（server 形态）+ 工作台门控跳转合理性
// 外部 URL（http/https/mailto/tel）仅记录不校验（需联网，标注来源）
// 运行：node --test server/test/link-audit.mjs（L3 需自包含 server，自动起停）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

let server;
let BASE;

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  server = app.listen(0);
  BASE = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    server.closeAllConnections?.();
    await new Promise((r) => server.close(r));
  }
});

const DOCS = fileURLToPath(new URL('../../docs/', import.meta.url));

function walk(dir, ext, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, ext, out);
    else if (e.name.endsWith(ext)) out.push(p);
  }
  return out;
}

// 解析相对 URL（支持 <base href>）
function resolveUrl(pagePath, baseHref, raw) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return { external: true, url: raw }; // http/mailto/tel/data
  if (raw.startsWith('//')) return { external: true, url: raw };
  const [rawPath, hashPart] = raw.split('#');
  const pathPart = (rawPath || '').split('?')[0]; // 剥离 ?v= 版本戳 query
  const pageDir = dirname(pagePath);
  let baseDir = pageDir;
  if (baseHref) {
    const b = baseHref.split('?')[0].split('#')[0] || '';
    baseDir = b ? resolve(pageDir, b) : pageDir;
  }
  const target = pathPart ? resolve(baseDir, pathPart) : pagePath;
  return { external: false, path: target, hash: hashPart || null };
}

test('L1 静态链接：全部 HTML href/src 目标存在 + 锚点存在', async () => {
  const htmls = walk(DOCS, '.html');
  assert.ok(htmls.length >= 16, `应收集 16+ HTML，实际 ${htmls.length}`);

  const issues = [];
  const stats = { checked: 0, external: 0, anchors: 0 };

  for (const page of htmls) {
    const relPage = relative(DOCS, page).replace(/\\/g, '/');
    const src = readFileSync(page, 'utf8');
    const baseHref = (src.match(/<base href="([^"]+)"/) || [])[1] || null;
    // 提取 href/src（排除动态 JS 模板变量、data:、javascript:、外部字体预连接）
    const pattern = /\b(?:href|src)="([^"]+)"/g;
    let m;
    while ((m = pattern.exec(src)) !== null) {
      const raw = m[1];
      if (!raw || raw.startsWith('#') || raw.startsWith('javascript:')) continue;
      const r = resolveUrl(page, baseHref, raw);
      if (r.external) { stats.external++; continue; }
      stats.checked++;
      const cleanPath = r.path.split('#')[0];
      if (!existsSync(cleanPath)) {
        issues.push(`${relPage} → ${raw}（目标不存在：${relative(DOCS, cleanPath).replace(/\\/g, '/')}）`);
        continue;
      }
      // 锚点校验（仅对 HTML 目标；id= / name=）
      if (r.hash) {
        const targetIsHtml = extname(cleanPath) === '.html';
        if (targetIsHtml) {
          stats.anchors++;
          const tSrc = readFileSync(cleanPath, 'utf8');
          const anchorId = r.hash.slice(1);
          const hasAnchor = new RegExp(`id=["']${anchorId}["']|name=["']${anchorId}["']`).test(tSrc);
          if (!hasAnchor) issues.push(`${relPage} → ${raw}（锚点 #${anchorId} 在目标中不存在）`);
        }
      }
    }
  }

  console.log(`[L1] 静态链接检查: ${stats.checked} 个本地链接 + ${stats.anchors} 个锚点 + ${stats.external} 个外部URL`);
  if (issues.length > 0) {
    console.log('[L1] ⚠️ 发现 ' + issues.length + ' 项：');
    issues.forEach((i, idx) => console.log(`  ${idx + 1}. ${i}`));
  } else {
    console.log('[L1] ✅ 全部静态链接目标存在、锚点有效');
  }
  assert.equal(issues.length, 0, `静态链接问题 ${issues.length} 项:\n${issues.join('\n')}`);
});

test('L2 JS 导航：location 跳转目标存在（含动态跳转的字面量片段校验）', async () => {
  const jss = walk(join(DOCS, 'src'), '.js');
  const issues = [];
  let checked = 0;
  let dynamic = 0;

  for (const js of jss) {
    const relJs = relative(DOCS, js).replace(/\\/g, '/');
    const src = readFileSync(js, 'utf8');
    const patterns = [
      /(?:window\.)?location\.href\s*=\s*[`'"]([^`'"#]+)/g,
      /location\.(?:replace|assign)\([`'"]([^`'"#]+)/g,
      /window\.location\.href\s*=\s*[`'"]([^`'"#]+)/g,
    ];
    for (const p of patterns) {
      let m;
      while ((m = p.exec(src)) !== null) {
        const raw = m[1];
        if (!raw || raw.startsWith('http') || raw.startsWith('mailto') || raw.startsWith('#') || raw.startsWith('/api')) continue;
        // 模板插值动态目标（${...}）：运行时拼接，抽取其中的 .html 字面量片段做存在性校验
        if (raw.includes('${')) {
          dynamic++;
          const htmlNames = raw.match(/[\w-]+\.html/g) || [];
          for (const h of htmlNames) {
            if (!existsSync(join(DOCS, h))) issues.push(`${relJs} → 动态目标含不存在页面 ${h}`);
          }
          continue;
        }
        let target = raw.startsWith('/') ? join(DOCS, raw) : resolve(DOCS, raw);
        if (!existsSync(target)) {
          issues.push(`${relJs} → ${raw}（目标不存在：${relative(DOCS, target).replace(/\\/g, '/')}）`);
        } else checked++;
      }
    }
  }

  console.log(`[L2] JS 导航检查: ${checked} 个静态跳转 + ${dynamic} 个动态跳转（字面量片段已校验）`);
  if (issues.length > 0) {
    console.log('[L2] ⚠️ 发现 ' + issues.length + ' 项：');
    issues.forEach((i, idx) => console.log(`  ${idx + 1}. ${i}`));
  } else {
    console.log('[L2] ✅ 全部 JS 跳转目标存在');
  }
  assert.equal(issues.length, 0, `JS 导航问题 ${issues.length} 项:\n${issues.join('\n')}`);
});

// 收集全部本地链接（L3 复用）
function collectLocalLinks() {
  const out = [];
  const htmls = walk(DOCS, '.html');
  for (const page of htmls) {
    const src = readFileSync(page, 'utf8');
    const baseHref = (src.match(/<base href="([^"]+)"/) || [])[1] || null;
    const pattern = /\b(?:href|src)="([^"]+)"/g;
    let m;
    while ((m = pattern.exec(src)) !== null) {
      const raw = m[1];
      if (!raw || raw.startsWith('#') || raw.startsWith('javascript:')) continue;
      const r = resolveUrl(page, baseHref, raw);
      if (r.external) continue;
      out.push({ page, raw, path: r.path.split('?')[0] });
    }
  }
  return out;
}

test('L3 HTTP 层：全部链接 200 + 工作台门控跳转合理性（server 形态）', async () => {
  const links = collectLocalLinks();
  const issues = [];
  let ok = 0;
  let tested = 0;

  for (const l of links) {
    if (!existsSync(l.path)) continue; // 存在性已由 L1 校验
    const rel = relative(DOCS, l.path).replace(/\\/g, '/').replace(/^\.\.\//, '');
    const url = `${BASE}/${rel}`;
    tested++;
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.status >= 200 && res.status < 400) ok++;
      else issues.push(`${relative(DOCS, l.page)} → /${rel}（HTTP ${res.status}）`);
    } catch (e) {
      issues.push(`${relative(DOCS, l.page)} → /${rel}（${String(e).slice(0, 80)}）`);
    }
  }

  // 门控合理性：未登录访问 6 个工作台（静态文件应 200——门控在前端 JS，跳转 login.html 目标存在已由 L1 校验）
  for (const ws of ['secretary', 'org', 'prop', 'disc', 'leader', 'visitor']) {
    const res = await fetch(`${BASE}/workspace/${ws}.html`, { redirect: 'manual' });
    if (res.status !== 200) issues.push(`/workspace/${ws}.html 未登录访问 HTTP ${res.status}（应为 200，门控在前端 JS）`);
    ok++; tested++;
  }
  // 门控目标页 login.html 存在
  const loginRes = await fetch(`${BASE}/login.html`, { redirect: 'manual' });
  if (loginRes.status !== 200) issues.push('/login.html HTTP ' + loginRes.status);

  console.log(`[L3] HTTP 链接验证: ${ok}/${tested} 通过（含 6 个工作台门控可达性）`);
  if (issues.length > 0) {
    console.log('[L3] ⚠️ 发现 ' + issues.length + ' 项：');
    issues.forEach((i, idx) => console.log(`  ${idx + 1}. ${i}`));
  } else {
    console.log('[L3] ✅ 全部链接 HTTP 200 + 门控目标可达');
  }
  assert.equal(issues.length, 0, `HTTP 链接问题 ${issues.length} 项:\n${issues.join('\n')}`);
});

test('L4 浏览器实测：登录态跳转逻辑（未登录直达登录页 / 已登录直达角色工作台 / 登录页返回闭环）', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();

    // 1. 未登录：首页 workspace 链接应被 main-entry 改为 login.html（消除绕路）
    await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#cal-main-grid', { timeout: 10000 }); // 首页渲染完成
    await page.waitForTimeout(800); // 等 _updateWorkspaceLinks / 查看更多链接生成
    const unlogged = await page.evaluate(() => ({
      workspaceLinks: [...document.querySelectorAll('a[href*="workspace/"]')].map(a => a.getAttribute('href')),
      loginLinks: [...document.querySelectorAll('a[href*="login"]')].map(a => a.getAttribute('href')),
    }));
    console.log('[L4] 未登录首页 workspace 链接:', JSON.stringify(unlogged.workspaceLinks), '| login 链接:', JSON.stringify(unlogged.loginLinks));
    assert.equal(unlogged.workspaceLinks.length, 0, `未登录时首页不应保留工作台直达链接: ${JSON.stringify(unlogged.workspaceLinks)}`);
    assert.ok(unlogged.loginLinks.length >= 2, `未登录时首页应有多个登录入口: ${JSON.stringify(unlogged.loginLinks)}`);

    // 2. 点击「工作台→」→ 应直达 login.html
    const wsLink = page.locator('a[href*="login"]').first();
    await wsLink.click();
    await page.waitForURL('**/login.html', { timeout: 10000 });
    console.log('[L4] 未登录点击「工作台→」直达 login.html ✓');

    // 3. login.html「返回主页」闭环
    await page.click('a[href="./index.html"]');
    await page.waitForURL('**/index.html', { timeout: 10000 });
    console.log('[L4] login.html「返回主页」可回 index.html ✓');

    // 4. 已登录秘书：登录后回首页，workspace 链接应指向 secretary.html
    await page.goto(`${BASE}/login.html`, { waitUntil: 'domcontentloaded' });
    await page.locator('#dev-toggle').first().check();
    await page.locator('.login-card[data-role="secretary"]').first().click();
    await page.waitForFunction(() => window.location.href.includes('workspace'), null, { timeout: 10000 });
    await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    const logged = await page.evaluate(() =>
      [...document.querySelectorAll('a[href*="workspace/"]')].map(a => a.getAttribute('href')));
    console.log('[L4] 已登录秘书首页 workspace 链接:', JSON.stringify(logged));
    assert.ok(logged.length > 0 && logged.every(h => h && h.includes('secretary.html')),
      `已登录秘书链接应全部指向 secretary.html: ${JSON.stringify(logged)}`);
    console.log('[L4] ✅ 登录态跳转逻辑全部合理');
  } finally {
    await browser.close();
  }
});
