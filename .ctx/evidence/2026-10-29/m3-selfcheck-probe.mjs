// 用法：cd server; node ../.ctx/evidence/2026-10-29/m3-selfcheck-probe.mjs
// M3 换场景自检（2026-10-29）：用支书没点名过的页面复核 P1–P4。
// 口径：只做真机读数（内存库实例），不改产品代码；结果写同目录 m3-selfcheck.json。
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../../../server/node_modules/playwright/index.mjs';
import { createApp } from '../../../server/app.js';
import { seedDatabase } from '../../../server/seed.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const WIDTHS = [1440, 1024, 768, 390];

// Chromium 在沙箱里走不通外网（Node 可以）⇒ 预取 Tailwind JIT，由 route 回填，
// 保证 max-w-* / md:px-* 等工具类真实生效（不是另写一套宽度）。
const tailwindSrc = await (await fetch('https://cdn.tailwindcss.com')).text();

const app = createApp({ dbPath: ':memory:' });
await seedDatabase(app.locals.db);
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });

const out = {
  generatedAt: new Date().toISOString(),
  base: 'memory-db',
  widths: WIDTHS,
  p1: {},
  p2: {},
  p3: {},
  p4: {},
  checks: [],
};
const check = (id, scenario, expected, actual, pass, note = '') => {
  out.checks.push({ id, scenario, expected, actual, pass, note });
};

async function newPage(label) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.fulfill({
    status: 200, contentType: 'application/javascript', body: tailwindSrc,
  }));
  page.on('console', (m) => { if (m.type() === 'error') console.log(`[${label}] console.error: ${m.text()}`); });
  return { context, page };
}

async function login(page, account) {
  await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.fill('#student-id', account);
  await page.fill('#password', '123456');
  await Promise.all([
    page.waitForURL(/workspace\//, { timeout: 20000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForFunction(() => document.readyState === 'complete', null, { timeout: 15000 });
}

// ── P1 焦点：输入族只变边框（help 搜索框 / 登录学号） ─────────────────────────
async function readFocus(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const probe = document.createElement('span');
    probe.style.color = 'var(--app-accent)';
    document.body.appendChild(probe);
    const accent = getComputedStyle(probe).color;
    probe.remove();
    return {
      tag: el.tagName.toLowerCase(),
      outlineWidth: cs.outlineWidth,
      outlineStyle: cs.outlineStyle,
      boxShadow: cs.boxShadow,
      borderTopColor: cs.borderTopColor,
      borderTopWidth: cs.borderTopWidth,
      accent,
      focused: document.activeElement === el,
    };
  }, selector);
}

async function focusByKeyboard(page, selector) {
  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
  for (let i = 0; i < 400; i += 1) {
    await page.keyboard.press('Tab');
    const hit = await page.evaluate((sel) => document.activeElement === document.querySelector(sel), selector);
    if (hit) return true;
  }
  return false;
}

async function p1() {
  // 1) 帮助页搜索框（公开页，不进工作台）
  {
    const { context, page } = await newPage('help-focus');
    await page.goto(`${base}/help.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.help-search-input', { timeout: 10000 });
    await page.click('.help-search-input');
    await page.waitForTimeout(320); // 等 border-color 0.15s 过渡走完再读数
    const mouse = await readFocus(page, '.help-search-input');
    const kbReached = await focusByKeyboard(page, '.help-search-input');
    await page.waitForTimeout(320);
    const keyboard = await readFocus(page, '.help-search-input');
    out.p1.helpSearch = { selector: '.help-search-input', mouse, keyboard, kbReached };
    await context.close();
  }
  // 2) 登录页学号输入（公开页）
  {
    const { context, page } = await newPage('login-focus');
    await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#student-id', { timeout: 10000 });
    await page.click('#student-id');
    await page.waitForTimeout(320); // 等 border-color 0.15s 过渡走完再读数
    const mouse = await readFocus(page, '#student-id');
    const kbReached = await focusByKeyboard(page, '#student-id');
    await page.waitForTimeout(320);
    const keyboard = await readFocus(page, '#student-id');
    out.p1.loginStudentId = { selector: '#student-id', mouse, keyboard, kbReached };
    await context.close();
  }

  for (const [key, r] of Object.entries(out.p1)) {
    const rows = [['mouse', r.mouse], ['keyboard', r.keyboard]];
    for (const [mode, v] of rows) {
      const zeroOutline = v && v.outlineWidth === '0px' && v.boxShadow === 'none';
      const themeBorder = v && v.borderTopColor === v.accent;
      check(`P1-${key}-${mode}`,
        `${key}（${mode}）聚焦：outlineWidth=0 / boxShadow=none / 边框色=主题色`,
        { outlineWidth: '0px', boxShadow: 'none', borderTopColor: v?.accent },
        { outlineWidth: v?.outlineWidth, boxShadow: v?.boxShadow, borderTopColor: v?.borderTopColor },
        Boolean(v?.focused && zeroOutline && themeBorder),
        `tag=${v?.tag}`);
    }
    const same = r.mouse && r.keyboard
      && r.mouse.outlineWidth === r.keyboard.outlineWidth
      && r.mouse.boxShadow === r.keyboard.boxShadow
      && r.mouse.borderTopColor === r.keyboard.borderTopColor;
    check(`P1-${key}-same`, `${key}：鼠标与键盘读数一致`,
      '三项读数逐字相等',
      same ? '相等' : `${JSON.stringify(r.mouse)} vs ${JSON.stringify(r.keyboard)}`,
      Boolean(same));
  }
}

// ── P2 数字组：图标块在左 + 数值/标签在右；4/2/2 列、四张等高 ──────────────────
const P2_MEASURE = ([selector, cardSelector]) => {
  const host = document.querySelector(selector);
  if (!host) return null;
  const cards = [...host.querySelectorAll(cardSelector)];
  const grid = getComputedStyle(host).gridTemplateColumns.split(/\s+/).filter(Boolean);
  const rows = cards.map((card) => {
    const icon = card.querySelector(':scope > .stat-icon-tint');
    const body = card.querySelector(':scope > .stat-card__body');
    const value = body?.querySelector('.stat-card__value');
    const label = body?.querySelector('.stat-card__label');
    const ir = icon?.getBoundingClientRect();
    const br = body?.getBoundingClientRect();
    return {
      height: Math.round(card.getBoundingClientRect().height),
      iconFirst: card.firstElementChild === icon,
      hasValue: Boolean(value),
      hasLabel: Boolean(label),
      iconLeftOfBody: Boolean(ir && br && ir.right <= br.left + 1 && ir.left < br.left),
      centerDelta: ir && br ? Math.round(Math.abs((ir.top + ir.bottom) / 2 - (br.top + br.bottom) / 2) * 10) / 10 : null,
    };
  });
  return {
    count: cards.length,
    cols: grid.length,
    heights: rows.map((r) => r.height),
    heightDiff: rows.length ? Math.max(...rows.map((r) => r.height)) - Math.min(...rows.map((r) => r.height)) : null,
    iconFirst: rows.every((r) => r.iconFirst),
    hasValueLabel: rows.every((r) => r.hasValue && r.hasLabel),
    iconLeftOfBody: rows.every((r) => r.iconLeftOfBody),
    centerDeltaMax: rows.length ? Math.max(...rows.map((r) => r.centerDelta ?? 99)) : null,
    gridOverflow: host.scrollWidth > host.clientWidth + 1,
    docOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
  };
};

async function p2() {
  // 首页四数
  {
    const { context, page } = await newPage('home-stats');
    await login(page, '2400012349');
    await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelectorAll('#dashboard-stats > .card').length >= 4, null, { timeout: 20000 });
    out.p2.home = {};
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(350);
      out.p2.home[width] = await page.evaluate(P2_MEASURE, ['#dashboard-stats', ':scope > .card']);
    }
    await context.close();
  }
  // 支书台总览四数
  {
    const { context, page } = await newPage('secretary-overview');
    await login(page, '2300010001');
    await page.goto(`${base}/workspace/secretary.html?tab=overview`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelectorAll('.metric-band--cards > .metric-band__item').length >= 4, null, { timeout: 25000 });
    out.p2.secretaryOverview = {};
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(350);
      out.p2.secretaryOverview[width] = await page.evaluate(
        P2_MEASURE, ['.metric-band--cards', ':scope > .metric-band__item']);
    }
    await context.close();
  }

  for (const [key, byWidth] of Object.entries(out.p2)) {
    for (const [width, m] of Object.entries(byWidth)) {
      const w = Number(width);
      const expectedCols = w === 1440 ? 4 : 2;
      check(`P2-${key}-${w}-cols`, `${key} @${w}：列数`,
        expectedCols, m?.cols, m?.cols === expectedCols);
      check(`P2-${key}-${w}-struct`, `${key} @${w}：图标块在左 + 数值/标签在右`,
        'iconFirst && hasValueLabel && iconLeftOfBody && centerDeltaMax<=2',
        { iconFirst: m?.iconFirst, hasValueLabel: m?.hasValueLabel, iconLeftOfBody: m?.iconLeftOfBody, centerDeltaMax: m?.centerDeltaMax },
        Boolean(m?.iconFirst && m?.hasValueLabel && m?.iconLeftOfBody && m?.centerDeltaMax <= 2));
      check(`P2-${key}-${w}-height`, `${key} @${w}：四张等高`,
        'heightDiff<=1', m?.heightDiff, m?.heightDiff !== null && m?.heightDiff <= 1,
        `heights=${JSON.stringify(m?.heights)}`);
      check(`P2-${key}-${w}-overflow`, `${key} @${w}：无横向溢出`,
        'gridOverflow=false && docOverflow=false',
        { gridOverflow: m?.gridOverflow, docOverflow: m?.docOverflow },
        Boolean(m && !m.gridOverflow && !m.docOverflow));
    }
  }
}

// ── P3 筛选行：直接子元素只有 .lf-bar__row；同段左边缘对齐；390 无横向溢出 ─────
const P3_MEASURE = () => {
  const bars = [...document.querySelectorAll('.lf-bar')].filter((el) => el.offsetParent !== null || el.getClientRects().length);
  return bars.map((bar) => {
    const kids = [...bar.children];
    const rows = kids.filter((k) => k.classList.contains('lf-bar__row'));
    const firsts = rows.map((r) => r.firstElementChild).filter(Boolean);
    const lefts = firsts.map((el) => el.getBoundingClientRect().left);
    return {
      segs: rows.map((r) => r.dataset.seg || ''),
      childTags: kids.map((k) => `${k.tagName.toLowerCase()}.${(k.className || '').toString().split(/\s+/).filter(Boolean).join('.')}`),
      onlyRows: kids.length > 0 && kids.every((k) => k.classList.contains('lf-bar__row')),
      rowCount: rows.length,
      alignDelta: lefts.length >= 2 ? Math.round((Math.max(...lefts) - Math.min(...lefts)) * 10) / 10 : 0,
      rowLeftDelta: rows.length
        ? Math.round(Math.max(...rows.map((r) => {
          const f = r.firstElementChild;
          return f ? Math.abs(f.getBoundingClientRect().left - r.getBoundingClientRect().left) : 0;
        })) * 10) / 10
        : 0,
      barOverflow: bar.scrollWidth > bar.clientWidth + 1,
    };
  });
};

const P3_DOC_OVERFLOW = () => document.documentElement.scrollWidth > window.innerWidth + 1;

async function p3() {
  // 名册页（组织台 · 名册）
  {
    const { context, page } = await newPage('org-roster');
    await login(page, '9000000001');
    await page.goto(`${base}/workspace/org.html?tab=roster`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.lf-bar__row', { timeout: 25000 });
    await page.waitForTimeout(1000);
    out.p3.roster = { account: '9000000001', path: '/workspace/org.html?tab=roster', byWidth: {} };
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(400);
      out.p3.roster.byWidth[width] = {
        bars: await page.evaluate(P3_MEASURE),
        docOverflow: await page.evaluate(P3_DOC_OVERFLOW),
      };
    }
    await context.close();
  }
  // 归档库
  {
    const { context, page } = await newPage('archive');
    await login(page, '2400012349');
    await page.goto(`${base}/archive.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.lf-bar__row', { timeout: 20000 });
    await page.waitForTimeout(600);
    out.p3.archive = { account: '2400012349', path: '/archive.html', byWidth: {} };
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(400);
      out.p3.archive.byWidth[width] = {
        bars: await page.evaluate(P3_MEASURE),
        docOverflow: await page.evaluate(P3_DOC_OVERFLOW),
      };
    }
    await context.close();
  }

  for (const [key, data] of Object.entries(out.p3)) {
    for (const [width, m] of Object.entries(data.byWidth)) {
      const w = Number(width);
      const bars = m.bars || [];
      check(`P3-${key}-${w}-exists`, `${key} @${w}：筛选行存在`, 'bars>=1', bars.length, bars.length >= 1);
      check(`P3-${key}-${w}-rows`, `${key} @${w}：直接子元素只有 .lf-bar__row`,
        '每条 bar 的 onlyRows 均为 true',
        bars.map((b) => ({ onlyRows: b.onlyRows, children: b.childTags })),
        bars.length > 0 && bars.every((b) => b.onlyRows));
      check(`P3-${key}-${w}-align`, `${key} @${w}：同段控件左边缘对齐`,
        'alignDelta=0 且 rowLeftDelta=0',
        bars.map((b) => ({ alignDelta: b.alignDelta, rowLeftDelta: b.rowLeftDelta })),
        bars.length > 0 && bars.every((b) => b.alignDelta === 0 && b.rowLeftDelta === 0));
      check(`P3-${key}-${w}-overflow`, `${key} @${w}：无横向溢出`,
        '每条 bar 无溢出且文档无溢出',
        { barOverflow: bars.map((b) => b.barOverflow), docOverflow: m.docOverflow },
        Boolean(!m.docOverflow && bars.every((b) => !b.barOverflow)));
    }
  }
}

// ── P4 容器：设置 64rem / 帮助 80rem；四档边界 + 无横向溢出 ────────────────────
const P4_MEASURE = (selector) => {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const parent = el.parentElement;
  const pr = parent ? parent.getBoundingClientRect() : null;
  const pcs = parent ? getComputedStyle(parent) : null;
  const parentInner = pr && pcs
    ? pr.width - parseFloat(pcs.paddingLeft || '0') - parseFloat(pcs.paddingRight || '0')
    : null;
  return {
    selector,
    maxWidth: cs.maxWidth,
    boxSizing: cs.boxSizing,
    paddingLeft: cs.paddingLeft,
    paddingRight: cs.paddingRight,
    left: Math.round(r.left * 10) / 10,
    right: Math.round(r.right * 10) / 10,
    width: Math.round(r.width * 10) / 10,
    parentInner: parentInner === null ? null : Math.round(parentInner * 10) / 10,
    centeredInParent: Boolean(pr)
      && Math.abs((r.left - pr.left) - (pr.right - r.right)) <= 1.5,
    docOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
  };
};

function expectedWidth(maxWidth, viewport, parentInner) {
  const mw = parseFloat(maxWidth);
  const limit = Number.isFinite(mw) ? mw : viewport;
  const pool = parentInner === null ? viewport : parentInner;
  return Math.round(Math.min(limit, pool) * 10) / 10;
}

async function p4() {
  // 设置页（64rem）
  {
    const { context, page } = await newPage('settings');
    await login(page, '2400012349');
    await page.goto(`${base}/settings.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#main-content .max-w-5xl', { timeout: 20000 });
    await page.waitForTimeout(600);
    out.p4.settings = { path: '/settings.html', tier: '64rem', byWidth: {} };
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(350);
      out.p4.settings.byWidth[width] = await page.evaluate(P4_MEASURE, '#main-content > div');
    }
    await context.close();
  }
  // 帮助页（80rem）
  {
    const { context, page } = await newPage('help-width');
    await page.goto(`${base}/help.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.doc-wrap', { timeout: 10000 });
    out.p4.help = { path: '/help.html', tier: '80rem', byWidth: {} };
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(250);
      out.p4.help.byWidth[width] = await page.evaluate(P4_MEASURE, '.doc-wrap');
    }
    await context.close();
  }

  for (const [key, data] of Object.entries(out.p4)) {
    const tierPx = data.tier === '64rem' ? 1024 : 1280;
    for (const [width, m] of Object.entries(data.byWidth)) {
      const w = Number(width);
      check(`P4-${key}-${w}-maxwidth`, `${key} @${w}：max-width = ${data.tier}`,
        `${tierPx}px`, m?.maxWidth, m?.maxWidth === `${tierPx}px`);
      const exp = m ? expectedWidth(m.maxWidth, w, m.parentInner) : null;
      check(`P4-${key}-${w}-width`, `${key} @${w}：主体宽度 = min(容器档, 可用区)`,
        exp, m?.width, m && Math.abs(m.width - exp) <= 1.5);
      check(`P4-${key}-${w}-center`, `${key} @${w}：主体在父级内居中`,
        'centeredInParent=true', m?.centeredInParent, Boolean(m?.centeredInParent),
        `left=${m?.left} right=${m?.right}`);
      check(`P4-${key}-${w}-overflow`, `${key} @${w}：无横向溢出`,
        'docOverflow=false', m?.docOverflow, Boolean(m && !m.docOverflow));
    }
  }
}

await p1();
await p2();
await p3();
await p4();

const failed = out.checks.filter((c) => !c.pass);
out.summary = {
  total: out.checks.length,
  passed: out.checks.length - failed.length,
  failed: failed.length,
  failedIds: failed.map((c) => c.id),
};

await browser.close();
server.closeAllConnections?.();
await new Promise((r) => server.close(r));
writeFileSync(join(HERE, 'm3-selfcheck.json'), JSON.stringify(out, null, 2), 'utf8');

for (const c of out.checks) {
  console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.id}  ${c.scenario}  expected=${JSON.stringify(c.expected)}  actual=${JSON.stringify(c.actual)}`);
}
console.log(`\nsummary: ${out.summary.passed}/${out.summary.total} passed, ${out.summary.failed} failed`);
console.log(`wrote ${join(HERE, 'm3-selfcheck.json')}`);
process.exitCode = failed.length ? 1 : 0;
