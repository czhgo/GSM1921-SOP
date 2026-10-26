// server/test/a11y-tree.test.mjs — Chromium 可访问性树（AX）真机守卫（2026-10-19）
//
// 由「读屏留人工」改为机器可判：不再靠人工读屏走查，而是用 CDP
// `Accessibility.getFullAXTree` 直接读取 Chromium 实际暴露给读屏的 role / name / 属性。
// 覆盖六件事（对应 Round 1 审计 U-05/U-09 等无障碍落点）：
//   A1 组织台「专班管理」→「发布招募」：AX 中存在 role=dialog、name=「发布专班招募」的节点，
//      且打开后焦点落在 `.modal-body` 内（不是 body、不是右上角 ×）。
//   A2 按 Esc 关闭：AX / DOM 中浮窗消失，焦点回到打开它的 `#btn-publish-tf`。
//   A3 专班两视图按钮：AX 中 role=button、name 分别为「专班工作组 / 报名总表」，
//      且每个节点都带 `pressed` 属性（true/false）。活动视图已迁至「活动日历」（2026-10-20 判例④）。
//   A4 成员台「项目分工」三子视图按钮：AX 中 `pressed` 属性存在。
//   A5 项目分工空态出口：无命中检索 → 空态出现；AX 中存在「去看我的分工」/「浏览全局分工」
//      的 button/link 节点，且可聚焦（DOM tabIndex ≥ 0 / 原生按钮）。
//   A6 纪检台「考勤管理」→「录入会议考勤」：AX 中存在 role=combobox、name 含「会议 / 活动」的节点。
//
// ⚠ A5 的口径说明（与页面实现同源，不是放宽）：检索引擎 `list-filter.js` 按单一源
//   `SEARCH_FILTER_MIN_ROWS=8` 决定是否渲染搜索框——当前种子成员（2400012349）「我的任务」为 **0 条**、
//   「我的分工」为 **5 条**，两档都低于门槛 ⇒ 搜索框按设计不渲染（不是缺陷）。
//   故本守卫在**有搜索框的视图（全局分工，42 条）**执行「无命中检索」以触发空态，
//   再回到本身即为空的「我的任务」，验证其空态出口「去看我的分工」进入 AX 且可聚焦。
//   若将来种子变化导致「我的任务」非空、而「我的分工」为空，则自动改用后者的「浏览全局分工」出口。
//
// 环境口径沿用页面测试惯例：静音外部字体与 Tailwind CDN（AX role/name 不依赖字体与样式），
// 任意外部资源加载失败都不会让本守卫变红。
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

let server;
let base;
let browser;

before(async () => {
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

/** 外部资源静音（同 page-sweep / attendance-queue-selection e2e 惯例）：字体与 Tailwind 不参与 AX 判据 */
const MUTED = ['**://fonts.googleapis.com/**', '**://fonts.gstatic.com/**', '**://cdn.tailwindcss.com/**'];

/** 每个 page 复用一个 CDP 会话（`Accessibility.enable` 只需一次） */
const _axSessions = new WeakMap();

/** 取 Chromium 实际暴露的可访问性树（去掉 ignored 节点，属性摊平成对象） */
async function axSnapshot(page) {
  let client = _axSessions.get(page);
  if (!client) {
    client = await page.context().newCDPSession(page);
    await client.send('Accessibility.enable');
    _axSessions.set(page, client);
  }
  const { nodes } = await client.send('Accessibility.getFullAXTree');
  return nodes
    .filter((node) => !node.ignored)
    .map((node) => ({
      role: node.role?.value || '',
      name: String(node.name?.value ?? '').replace(/\s+/g, ' ').trim(),
      properties: Object.fromEntries((node.properties || []).map((p) => [p.name, p.value?.value])),
    }));
}

/** 登录并等页面骨架就位（重试一次，抗全量套件负载抖动） */
async function openWorkspace(page, studentId, workspace) {
  for (const pattern of MUTED) await page.route(pattern, (route) => route.abort());
  let ready = false;
  let lastError = null;
  for (let attempt = 0; attempt < 2 && !ready; attempt += 1) {
    try {
      await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#student-id', { timeout: 30000 });
      await page.fill('#student-id', studentId);
      await page.fill('#password', '123456');
      await Promise.all([
        page.waitForURL(`**/workspace/${workspace}.html`, { timeout: 30000 }),
        page.click('button[type="submit"]'),
      ]);
      await page.waitForFunction(() => document.querySelectorAll('button[role="tab"]').length > 0, { timeout: 45000 });
      ready = true;
    } catch (error) {
      lastError = error;
    }
  }
  if (!ready) throw lastError;
  await page.waitForTimeout(800);
}

/** 按 role + 精确 name 找 AX 节点 */
function findNode(nodes, role, name) {
  return nodes.find((node) => node.role === role && node.name === name);
}

/** 断言某节点带 pressed 属性（true / false 均可，但属性本身必须存在） */
function assertPressed(nodes, name) {
  const node = findNode(nodes, 'button', name);
  assert.ok(node, `AX 中找不到 role=button、name=「${name}」的节点（读屏无法识别该按钮）`);
  assert.ok(Object.prototype.hasOwnProperty.call(node.properties, 'pressed'),
    `「${name}」按钮在 AX 中缺少 pressed 属性（读屏无法播报选中态；实际属性=${JSON.stringify(node.properties)}）`);
  assert.ok(['true', 'false'].includes(String(node.properties.pressed)),
    `「${name}」按钮的 pressed 取值异常：${JSON.stringify(node.properties.pressed)}`);
  return { role: node.role, name: node.name, pressed: node.properties.pressed };
}

/** 空态出口：AX 必须是 button/link，且 DOM 可聚焦（tabIndex ≥ 0 或原生按钮） */
async function assertFocusableExit(page, nodes, name) {
  const node = nodes.find((n) => ['button', 'link'].includes(n.role) && n.name === name);
  assert.ok(node, `AX 中找不到 name=「${name}」的 button/link 空态出口（读屏用户没有离开空态的路径）`);
  const dom = await page.evaluate((label) => {
    const el = [...document.querySelectorAll('button, a[href]')]
      .find((candidate) => (candidate.textContent || '').replace(/\s+/g, ' ').trim() === label);
    if (!el) return null;
    return {
      tag: el.tagName,
      tabIndex: el.tabIndex,
      disabled: !!el.disabled,
      focusable: el.tabIndex >= 0 || (el.tagName === 'BUTTON' && !el.disabled),
    };
  }, name);
  assert.ok(dom, `DOM 中找不到空态出口「${name}」`);
  assert.ok(dom.focusable && !dom.disabled,
    `空态出口「${name}」不可聚焦（tag=${dom.tag}, tabIndex=${dom.tabIndex}, disabled=${dom.disabled}）`);
  const focused = await page.evaluate((label) => {
    const el = [...document.querySelectorAll('button, a[href]')]
      .find((candidate) => (candidate.textContent || '').replace(/\s+/g, ' ').trim() === label);
    if (!el) return false;
    el.focus();
    return document.activeElement === el;
  }, name);
  assert.equal(focused, true, `空态出口「${name}」在 DOM 中无法取得焦点`);
  return { role: node.role, name: node.name, focusable: node.properties.focusable, tabIndex: dom.tabIndex };
}

// A1 + A2：招募浮窗的对话框语义、焦点接管、Esc 关闭与焦点回还
test('A1/A2 组织台招募浮窗：AX dialog「发布专班招募」+ 焦点入正文 + Esc 关闭回还', async () => {
  const page = await browser.newPage();
  try {
    await openWorkspace(page, '2400012355', 'org');
    await page.locator('.org-tab-btn[data-org-tab="taskforce"]').click();
    await page.waitForSelector('#btn-publish-tf', { timeout: 20000 });
    await page.waitForSelector('#org-tf-view-btns', { timeout: 20000 });
    await page.waitForTimeout(500);

    const trigger = page.locator('#btn-publish-tf');
    assert.equal(await trigger.count(), 1, '组织台「专班管理」未渲染「发布招募」按钮 #btn-publish-tf');
    await trigger.focus();
    await trigger.click();
    await page.waitForSelector('#modal-overlay-recruit-form-modal [role="dialog"]', { timeout: 10000 });
    await page.waitForFunction(() => {
      const body = document.querySelector('#modal-overlay-recruit-form-modal .modal-body');
      const active = document.activeElement;
      return !!body && !!active && active !== document.body && body.contains(active);
    }, null, { timeout: 10000 });

    const nodes = await axSnapshot(page);
    const dialog = findNode(nodes, 'dialog', '发布专班招募');
    assert.ok(dialog, 'AX 中找不到 role=dialog、name=「发布专班招募」的节点（读屏无法识别模态对话框）');
    assert.ok(dialog.properties.modal === true || dialog.properties.modal === 'true',
      `招募浮窗 AX 缺少 modal 属性：${JSON.stringify(dialog.properties)}`);

    const focusState = await page.evaluate(() => {
      const panel = document.querySelector('#modal-overlay-recruit-form-modal [role="dialog"]');
      const body = panel?.querySelector('.modal-body');
      const active = document.activeElement;
      return {
        activeTag: active?.tagName,
        activeId: active?.id || '',
        inBody: !!body && body.contains(active),
        inPanel: !!panel && panel.contains(active),
      };
    });
    console.log('[AX] 招募浮窗 dialog:', JSON.stringify({ role: dialog.role, name: dialog.name, properties: dialog.properties }));
    console.log('[AX] 打开后焦点:', JSON.stringify(focusState));
    assert.equal(focusState.inBody, true,
      `浮窗打开后焦点不在 .modal-body 内（activeElement=${focusState.activeTag}#${focusState.activeId}，` +
      '读屏用户会停在背景或关闭按钮上）');

    // A2：Esc 关闭
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#modal-overlay-recruit-form-modal'), null, { timeout: 10000 });
    await page.waitForFunction(() => document.activeElement?.id === 'btn-publish-tf', null, { timeout: 10000 });

    const afterNodes = await axSnapshot(page);
    const dialogAfter = findNode(afterNodes, 'dialog', '发布专班招募');
    assert.ok(!dialogAfter, 'Esc 关闭后 AX 中仍存在 role=dialog、name=「发布专班招募」的节点');
    const domDialog = await page.evaluate(() => document.querySelectorAll('#modal-overlay-recruit-form-modal').length);
    assert.equal(domDialog, 0, 'Esc 关闭后 DOM 中仍存在招募浮窗遮罩');
    const focusBack = await page.evaluate(() => ({
      id: document.activeElement?.id || '',
      isTrigger: document.activeElement === document.getElementById('btn-publish-tf'),
    }));
    console.log('[AX] Esc 关闭后:', JSON.stringify({ dialogNodes: 0, domOverlay: 0, activeElement: focusBack }));
    assert.equal(focusBack.isTrigger, true,
      `Esc 关闭后焦点未回到 #btn-publish-tf（实际 activeElement=#${focusBack.id}）`);
  } finally {
    await page.close();
  }
});

// A3：专班两视图按钮的 AX pressed 属性（2026-10-20 判例④：活动视图已迁至活动日历，本页只留专班）
test('A3 专班两视图按钮：AX role=button 且带 pressed（专班工作组 / 报名总表）', async () => {
  const page = await browser.newPage();
  try {
    await openWorkspace(page, '2400012355', 'org');
    await page.locator('.org-tab-btn[data-org-tab="taskforce"]').click();
    await page.waitForSelector('#org-tf-view-btns', { timeout: 20000 });
    await page.waitForTimeout(500);

    const nodes = await axSnapshot(page);
    const readings = ['专班工作组', '报名总表'].map((name) => assertPressed(nodes, name));
    console.log('[AX] 专班两视图:', JSON.stringify(readings));
    assert.equal(readings.filter((r) => r.pressed === 'true').length, 1,
      `专班两视图应恰有一个选中态（pressed=true），实际=${JSON.stringify(readings)}`);
  } finally {
    await page.close();
  }
});

// A4：成员台项目分工三子视图按钮的 AX pressed 属性
test('A4 项目分工三子视图按钮：AX pressed 属性存在（我的任务 / 我的分工 / 全局分工）', async () => {
  const page = await browser.newPage();
  try {
    await openWorkspace(page, '2400012349', 'visitor');
    await page.locator('.visitor-tab-btn[data-visitor-tab="projects"]').click();
    await page.waitForSelector('.visitor-proj-sub', { timeout: 20000 });
    await page.waitForTimeout(500);

    const nodes = await axSnapshot(page);
    const readings = ['我的任务', '我的分工', '全局分工'].map((name) => assertPressed(nodes, name));
    console.log('[AX] 项目分工三视图:', JSON.stringify(readings));
    assert.equal(readings.filter((r) => r.pressed === 'true').length, 1,
      `项目分工三子视图应恰有一个选中态（pressed=true），实际=${JSON.stringify(readings)}`);
  } finally {
    await page.close();
  }
});

// A5：项目分工空态出口（无命中检索 → 空态 → AX 出口可聚焦）
test('A5 项目分工空态出口：检索无命中后 AX 存在可聚焦的「去看我的分工 / 浏览全局分工」', async () => {
  const page = await browser.newPage();
  try {
    await openWorkspace(page, '2400012349', 'visitor');
    await page.locator('.visitor-tab-btn[data-visitor-tab="projects"]').click();
    await page.waitForSelector('.visitor-proj-sub', { timeout: 20000 });
    await page.waitForTimeout(500);

    // 当前视图（缺省＝我的任务）是否按引擎门槛渲染了搜索框
    const currentHasSearch = (await page.locator('#visitor-tab-content .lf-bar input.lf-kw').count()) > 0;
    let searchedIn = '我的任务';
    if (!currentHasSearch) {
      searchedIn = '全局分工';
      console.log('[AX] 说明：默认视图「我的任务」行数低于检索引擎门槛（SEARCH_FILTER_MIN_ROWS=8），搜索框按设计不渲染；'
        + '改在「全局分工」执行无命中检索。');
      await page.locator('.visitor-proj-sub[data-proj-subview="all"]').click();
      await page.waitForTimeout(500);
    }
    const keyword = page.locator('#visitor-tab-content .lf-bar input.lf-kw');
    assert.equal(await keyword.count(), 1,
      `视图「${searchedIn}」未渲染搜索框（无命中检索无法执行；检索引擎门槛或视图计数变了？）`);
    await keyword.fill('zzzz-no-match');
    await page.waitForFunction(() => {
      const empty = document.querySelector('#visitor-tab-content .empty-state');
      return !!empty && empty.getBoundingClientRect().height > 0;
    }, null, { timeout: 10000 });
    const searchedEmpty = await page.evaluate(() => document.querySelector('#visitor-tab-content .empty-state')?.innerText.trim());
    // 该 tab 的空态文案由 projects-tab.js 自定义（`emptyMessage`：全量「— 暂无项目」/ 我的「— 你暂未参与任何项目」），
    //   不套检索引擎缺省「无匹配结果」；两种都算正常空态（批次 501 改准）。
    assert.ok(/暂无|无匹配/.test(searchedEmpty || ''),
      `无命中检索后空态文案异常：${JSON.stringify(searchedEmpty)}`);
    console.log('[AX] 无命中检索视图:', JSON.stringify({ view: searchedIn, keyword: 'zzzz-no-match', emptyState: searchedEmpty }));

    // 回到「我的任务」；若其本身为空则空态出口＝去看我的分工；否则退到「我的分工」的浏览全局分工
    const exits = [
      { view: 'tasks', label: '我的任务', action: '去看我的分工' },
      { view: 'mine', label: '我的分工', action: '浏览全局分工' },
    ];
    let picked = null;
    for (const item of exits) {
      await page.locator(`.visitor-proj-sub[data-proj-subview="${item.view}"]`).click();
      await page.waitForTimeout(600);
      const emptyVisible = await page.evaluate(() => {
        const empty = document.querySelector('#visitor-tab-content .empty-state');
        return !!empty && empty.getBoundingClientRect().height > 0;
      });
      if (emptyVisible) { picked = item; break; }
    }
    assert.ok(picked,
      '「我的任务」与「我的分工」都非空，无法进入带出口的空态；空态出口断言失去样本（种子/筛选口径变了？）');

    const nodes = await axSnapshot(page);
    const exitReading = await assertFocusableExit(page, nodes, picked.action);
    console.log('[AX] 空态出口:', JSON.stringify({ view: picked.label, ...exitReading }));
  } finally {
    await page.close();
  }
});

// A7：刷新工作台后的首个 Tab 必须落在「跳到主要内容」（2026-10-27 Task 2 · 阶段一）
//   病灶：tab-bar.activate 曾用元素级滚动定位激活页签，把「顺序焦点导航起点」挪到页签上。
test('A7 刷新支书台后首次 Tab 落在「跳到主要内容」', async () => {
  const page = await browser.newPage();
  try {
    await openWorkspace(page, '2300010001', 'secretary');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelectorAll('button[role="tab"]').length > 0, null, { timeout: 45000 });
    await page.waitForTimeout(800);

    const before = await page.evaluate(() => ({
      tag: document.activeElement?.tagName || '',
      id: document.activeElement?.id || '',
    }));
    assert.equal(before.tag, 'BODY', `刷新完成后不应有元素预先取得焦点（实际 ${before.tag}#${before.id}）`);

    await page.keyboard.press('Tab');
    const first = await page.evaluate(() => ({
      text: (document.activeElement?.textContent || '').replace(/\s+/g, ' ').trim(),
      cls: String(document.activeElement?.className || ''),
      href: document.activeElement?.getAttribute?.('href') || '',
      tag: document.activeElement?.tagName || '',
    }));
    console.log('[A11Y] 刷新后首次 Tab:', JSON.stringify(first));
    assert.match(first.cls, /skip-link/, `首次 Tab 应落在「跳到主要内容」，实际=${JSON.stringify(first)}`);
    assert.equal(first.text, '跳到主要内容');
  } finally {
    await page.close();
  }
});

// A8：侧栏抽屉焦点模型（2026-10-27 Task 2 · 阶段一）
//   打开 → 焦点进首个导航项；顶栏动作退出 Tab 序（DOM 顺序无法改时的等价修复）；
//   Esc → 收起 + inert + 回焦汉堡。
test('A8 侧栏抽屉：焦点入首个导航项、顶栏动作让位、Esc 关闭回焦汉堡', async () => {
  const page = await browser.newPage();
  try {
    await openWorkspace(page, '2300010001', 'secretary');
    const actionsSelector = '.header-actions a[href], .header-actions button, .header-actions [tabindex]';

    await page.locator('#hamburger-btn').click();
    await page.waitForTimeout(150);
    const opened = await page.evaluate((sel) => {
      const sidebar = document.getElementById('app-sidebar');
      const first = sidebar.querySelector('.sidebar-nav a[href], .sidebar-nav button');
      const actions = [...document.querySelectorAll(sel)];
      return {
        collapsed: sidebar.classList.contains('sidebar-collapsed'),
        inert: !!sidebar.inert,
        focusInSidebar: !!document.activeElement?.closest?.('#app-sidebar'),
        focusIsFirst: document.activeElement === first,
        headerActionCount: actions.length,
        headerActionsAllNegative: actions.length > 0 && actions.every((el) => el.tabIndex === -1),
      };
    }, actionsSelector);
    console.log('[A11Y] 抽屉打开:', JSON.stringify(opened));
    assert.equal(opened.collapsed, false, '点击汉堡后侧栏应展开');
    assert.equal(opened.inert, false, '展开时侧栏不得 inert');
    assert.equal(opened.focusInSidebar, true, '打开抽屉后焦点应进入侧栏');
    assert.equal(opened.focusIsFirst, true, '焦点应落在首个导航项');
    assert.equal(opened.headerActionsAllNegative, true,
      '展开时 4 个顶栏动作应暂时退出 Tab 序（tabindex=-1），不得排在侧栏之前');

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.activeElement?.id === 'hamburger-btn', null, { timeout: 5000 });
    const closed = await page.evaluate((sel) => {
      const sidebar = document.getElementById('app-sidebar');
      return {
        collapsed: sidebar.classList.contains('sidebar-collapsed'),
        inert: !!sidebar.inert,
        restored: [...document.querySelectorAll(sel)].every((el) => el.tabIndex >= 0),
      };
    }, actionsSelector);
    console.log('[A11Y] 抽屉 Esc 关闭:', JSON.stringify(closed));
    assert.equal(closed.collapsed, true, 'Esc 应收起侧栏');
    assert.equal(closed.inert, true, '收起时侧栏应 inert（不吞焦点）');
    assert.equal(closed.restored, true, '收起后顶栏动作应恢复原 Tab 序');
  } finally {
    await page.close();
  }
});

// A9：首页日历 roving tabindex（2026-10-27 Task 2 · 阶段一）
//   role=grid/row；整张网格仅 1 个 Tab 停点（今天）；方向键移动且停点跟随。
test('A9 首页日历：role=grid/row + 单一 Tab 停点 + 方向键移动', async () => {
  const page = await browser.newPage();
  try {
    for (const pattern of MUTED) await page.route(pattern, (route) => route.abort());
    await page.goto(`${base}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#cal-main-grid [role="grid"] [data-date][role="gridcell"]', { timeout: 30000 });

    const shape = await page.evaluate(() => {
      const grid = document.querySelector('#cal-main-grid [role="grid"]');
      const stops = [...grid.querySelectorAll('[data-date][role="gridcell"][tabindex="0"]')];
      return {
        rows: grid.querySelectorAll('[role="row"]').length,
        stops: stops.length,
        todayStop: !!stops[0]?.classList.contains('is-today'),
        cells: grid.querySelectorAll('[data-date][role="gridcell"]').length,
      };
    });
    console.log('[A11Y] 首页日历形态:', JSON.stringify(shape));
    assert.ok(shape.cells >= 28, '首页日历应渲染整月日期格');
    assert.ok(shape.rows >= 2, '日历应包含表头行与日期行（role=row）');
    assert.equal(shape.stops, 1, '整张日历只允许 1 个 Tab 停点');
    assert.equal(shape.todayStop, true, '默认 Tab 停点应为今天（is-today）');

    const before = await page.evaluate(() => {
      const cells = [...document.querySelectorAll('#cal-main-grid [role="gridcell"]')];
      const mid = cells.find((c) => c.dataset.date.endsWith('-15')) || cells[Math.floor(cells.length / 2)];
      mid.focus();
      return mid.dataset.date;
    });
    await page.keyboard.press('ArrowRight');
    const after = await page.evaluate(() => ({
      date: document.activeElement?.dataset?.date || '',
      stops: [...document.querySelectorAll('#cal-main-grid [role="gridcell"][tabindex="0"]')].map((c) => c.dataset.date),
    }));
    console.log('[A11Y] 日历方向键:', JSON.stringify({ before, ...after }));
    assert.notEqual(after.date, before, 'ArrowRight 应把焦点移动到下一日期格');
    assert.deepEqual(after.stops, [after.date], '移动后 Tab 停点应唯一且跟随焦点');
  } finally {
    await page.close();
  }
});

// A6：纪检台会议考勤录入的 combobox
test('A6 纪检台会议考勤：AX role=combobox、name 含「会议 / 活动」', async (t) => {
  const page = await browser.newPage();
  try {
    await openWorkspace(page, '2400012354', 'disc');
    await page.locator('.disc-tab-btn[data-disc-tab="attendance"]').click();
    await page.waitForTimeout(1200);

    const toggle = page.locator('#disc-meet-toggle');
    if ((await toggle.count()) === 0) {
      console.log('[AX] 数据前置不满足：纪检台未渲染「录入会议考勤」入口（无可上传会议），本条跳过。');
      t.skip('数据前置不满足：纪检账号 2400012354 当前无可上传会议，会议考勤表单未渲染');
      return;
    }
    await toggle.click();
    await page.waitForTimeout(800);

    if ((await page.locator('#disc-meet-activity').count()) === 0) {
      const emptyText = await page.locator('#disc-meet-body').innerText().catch(() => '');
      console.log('[AX] 数据前置不满足：会议考勤表单未渲染，正文=', JSON.stringify(emptyText.trim()));
      t.skip(`数据前置不满足：纪检账号无可上传会议（表单空态：${emptyText.trim().slice(0, 60)}）`);
      return;
    }

    const nodes = await axSnapshot(page);
    const combo = nodes.find((node) => node.role === 'combobox' && node.name.includes('会议 / 活动'));
    assert.ok(combo,
      'AX 中找不到 role=combobox、name 含「会议 / 活动」的节点（读屏无法识别会议 / 活动下拉）；'
      + `实际 combobox=${JSON.stringify(nodes.filter((n) => n.role === 'combobox').map((n) => n.name))}`);
    console.log('[AX] 会议活动下拉:', JSON.stringify({ role: combo.role, name: combo.name, properties: combo.properties }));
  } finally {
    await page.close();
  }
});
