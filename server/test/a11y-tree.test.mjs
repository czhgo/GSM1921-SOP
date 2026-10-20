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
//   A6 纪检台「考勤管理」→「录入会议考勤」：AX 中存在 role=combobox、name 含「会议活动」的节点。
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
    assert.ok(/无匹配项目/.test(searchedEmpty || ''),
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

// A6：纪检台会议考勤录入的 combobox
test('A6 纪检台会议考勤：AX role=combobox、name 含「会议活动」', async (t) => {
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
    const combo = nodes.find((node) => node.role === 'combobox' && node.name.includes('会议活动'));
    assert.ok(combo,
      'AX 中找不到 role=combobox、name 含「会议活动」的节点（读屏无法识别会议活动下拉）；'
      + `实际 combobox=${JSON.stringify(nodes.filter((n) => n.role === 'combobox').map((n) => n.name))}`);
    console.log('[AX] 会议活动下拉:', JSON.stringify({ role: combo.role, name: combo.name, properties: combo.properties }));
  } finally {
    await page.close();
  }
});
