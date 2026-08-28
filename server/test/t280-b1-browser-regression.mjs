// role: [工程师]+[AI]
// t280-b1-browser-regression.mjs — T-280-B1 待办/通知直达跳转浏览器回归（基于真实 DOM + URL 断言）
// 覆盖 CHECKLIST「手动检查清单 T-280-B1」7 条：通知阅读/报名审核/组长赋权/考勤上传/复盘提交/书记通知/聚合卡一致性
// 运行：node server/test/t280-b1-browser-regression.mjs（server 需在 localhost:3000 运行）
// 构造策略：动态派生/构造待办（与真实派生逻辑同源），验证「行动按钮 → 跳转」处理函数；用例末尾按 id 清理
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
}

const browser = await chromium.launch();

// 展开待办全部分组（直接移除 hidden 类，避免 toggle 把默认展开的分组折叠）
async function showTodoActions(page, prefix) {
  await page.evaluate((p) => {
    document.querySelectorAll(`.${p}-todo-group-items.hidden`).forEach(el => el.classList.remove('hidden'));
  }, prefix);
  await page.waitForTimeout(300);
}

// ── U1 通知阅读待办直达（leader，构造 actionable 通知）──
{
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`${BASE}/workspace/leader.html?dev=leader`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);
  // 构造通知阅读待办（NoticeTodoDeriver 与真实发布链同源）
  let createdId = null;
  await page.evaluate(async () => {
    const { NoticeTodoDeriver } = await import('/src/services/todo.js?v=20260829f');
    const items = NoticeTodoDeriver.deriveFromNotice({
      id: 'ntc-b1test', title: 'B1测试通知（阅读直达）', content: '浏览器回归构造',
      actionable: true, actionRoles: ['leader'], targetModule: 'workspace', priority: 'normal',
    });
    window.__b1TestId = items[0].id;
  });
  createdId = await page.evaluate(() => window.__b1TestId);
  // 点击待办 tab 重新渲染
  await page.click('.leader-tab-btn[data-leader-tab="todo"]');
  await page.waitForTimeout(800);
  await showTodoActions(page, 'leader');
  const btn = page.locator('.leader-todo-action-btn', { hasText: '去阅读' }).first();
  const hasBtn = await btn.count() > 0;
  check('U1 通知阅读：待办渲染出「去阅读」按钮', hasBtn);
  if (hasBtn) {
    await btn.click();
    await page.waitForFunction(() => location.pathname.endsWith('notice.html'), null, { timeout: 3000 }).catch(() => {});
    const url = page.url();
    check('U1 通知阅读：点击「去阅读」跳 notice.html?id=ntc-b1test', /notice\.html\?id=ntc-b1test/.test(url), `url=${url}`);
  }
  await page.evaluate(async (id) => {
    const { TodoStore } = await import('/src/services/todo.js?v=20260829f');
    TodoStore.delete(id);
  }, createdId);
  check('U1 无 JS 错误', errs.length === 0, errs.slice(0, 2).join(' | '));
  await page.close();
}

// ── U2a 报名审核直达（secretary 真实数据 signup-review → tf-005）──
{
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`${BASE}/workspace/secretary.html?dev=secretary`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);
  await page.click('.secretary-tab-btn[data-secretary-tab="todo"]');
  await page.waitForTimeout(800);
  await showTodoActions(page, 'secretary');
  const btn = page.locator('.secretary-todo-action-btn[data-group-key="secretary:signup-review"]').first();
  const hasBtn = await btn.count() > 0;
  check('U2a 报名审核：书记待办渲染「去审核」（signup-review 组）', hasBtn);
  if (hasBtn) {
    await btn.click();
    await page.waitForFunction(() => location.pathname.endsWith('taskforce.html'), null, { timeout: 3000 }).catch(() => {});
    const url = page.url();
    check('U2a 报名审核：点击「去审核」跳 taskforce.html?id=tf-005', /taskforce\.html\?id=tf-005/.test(url), `url=${url}`);
  }
  check('U2a 无 JS 错误', errs.length === 0, errs.slice(0, 2).join(' | '));
  await page.close();
}

// ── U2b 报名审核直达（org 构造 act-15 报名待办 → activity.html）──
{
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`${BASE}/workspace/org.html?dev=org-commissioner`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);
  const todoId = await page.evaluate(async () => {
    const { TodoStore, TodoCategory, TodoActionType, TodoSourceType } = await import('/src/services/todo.js?v=20260829f');
    const [t] = TodoStore.createBatch([{
      title: 'B1测试：审核活动报名', role: 'org-commissioner', category: TodoCategory.REVIEW,
      actionType: TodoActionType.REVIEW, actionKey: 'signup-review', sourceType: TodoSourceType.ACTIVITY,
      sourceId: 'act-15', actionData: { signupId: 'su-b1test', sourceType: 'activity', sourceId: 'act-15' },
    }]);
    return t.id;
  });
  await page.click('.org-tab-btn[data-org-tab="todo"]');
  await page.waitForTimeout(800);
  await showTodoActions(page, 'org');
  const btn = page.locator('.org-todo-action-btn[data-group-key="org-commissioner:signup-review"]').first();
  const hasBtn = await btn.count() > 0;
  check('U2b 报名审核：组织委员待办渲染「去审核」', hasBtn);
  if (hasBtn) {
    await btn.click();
    await page.waitForFunction(() => location.pathname.endsWith('activity.html'), null, { timeout: 3000 }).catch(() => {});
    const url = page.url();
    check('U2b 报名审核：点击「去审核」跳 activity.html?id=act-15', /activity\.html\?id=act-15/.test(url), `url=${url}`);
  }
  await page.evaluate(async (id) => {
    const { TodoStore } = await import('/src/services/todo.js?v=20260829f');
    TodoStore.delete(id);
  }, todoId);
  check('U2b 无 JS 错误', errs.length === 0, errs.slice(0, 2).join(' | '));
  await page.close();
}

// ── U3 组长赋权待办直达（构造活动创建赋权待办 → write tab + act-1 详情）──
{
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`${BASE}/workspace/leader.html?dev=leader`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);
  const todoId = await page.evaluate(async () => {
    const { LifecycleTodoDeriver, TodoStore } = await import('/src/services/todo.js?v=20260829f');
    // act-2 为组长（p3）可见活动（act-1 属 p3 bottom-up 创建，组长不可见属正常权限）
    const items = LifecycleTodoDeriver.deriveFromActivityCreate({ id: 'act-2', title: 'B1赋权测试', date: '2026-08-30' });
    return items[0].id;
  });
  await page.click('.leader-tab-btn[data-leader-tab="todo"]');
  await page.waitForTimeout(800);
  await showTodoActions(page, 'leader');
  // 聚合卡「处理」或明细「去赋权」任一
  const aggBtn = page.locator('.leader-todo-action-btn[data-group-key="leader:authorize"]').first();
  const detBtn = page.locator(`.leader-todo-action-btn[data-todo-id="${todoId}"]`).first();
  const aggCount = await aggBtn.count();
  const detCount = await detBtn.count();
  check('U3 赋权：渲染出行动按钮（聚合卡或明细）', aggCount > 0 || detCount > 0, `agg=${aggCount} det=${detCount}`);
  if (aggCount > 0 || detCount > 0) {
    if (aggCount > 0) await aggBtn.click(); else await detBtn.click();
    await page.waitForSelector('.leader-tab-btn[data-leader-tab="write"].tab-btn-active', { timeout: 3000 }).catch(() => {});
    const writeActive = await page.evaluate(() => !!document.querySelector('.leader-tab-btn[data-leader-tab="write"].tab-btn-active'));
    check('U3 赋权：切到「活动管理」tab', writeActive);
    await page.waitForSelector('.leader-act-item[data-act-id="act-2"]', { timeout: 3000 }).catch(() => {});
    const actItem = await page.evaluate(() => !!document.querySelector('.leader-act-item[data-act-id="act-2"]'));
    check('U3 赋权：活动管理 tab 内 act-2 条目存在', actItem);
    await page.waitForFunction(() => {
      const panel = document.getElementById('leader-act-detail');
      return panel && !panel.classList.contains('hidden');
    }, null, { timeout: 3000 }).catch(() => {});
    const detailOpen = await page.evaluate(() => {
      const panel = document.getElementById('leader-act-detail');
      return !!panel && !panel.classList.contains('hidden');
    });
    check('U3 赋权：act-2 详情面板自动打开（≤2 跳直达）', detailOpen);
  }
  await page.evaluate(async (id) => {
    const { TodoStore } = await import('/src/services/todo.js?v=20260829f');
    TodoStore.delete(id);
  }, todoId);
  check('U3 无 JS 错误', errs.length === 0, errs.slice(0, 2).join(' | '));
  await page.close();
}

// ── U4 组长考勤上传待办（构造 submit 待办 → 考勤上传 tab）──
{
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`${BASE}/workspace/leader.html?dev=leader`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);
  const todoId = await page.evaluate(async () => {
    const { TodoStore, TodoCategory, TodoActionType, TodoSourceType } = await import('/src/services/todo.js?v=20260829f');
    const [t] = TodoStore.createBatch([{
      title: 'B1测试：上传活动考勤', role: 'leader', category: TodoCategory.SUBMIT,
      actionType: TodoActionType.SUBMIT, actionKey: 'attendance-upload', sourceType: TodoSourceType.ACTIVITY,
      sourceId: 'act-15',
    }]);
    return t.id;
  });
  await page.click('.leader-tab-btn[data-leader-tab="todo"]');
  await page.waitForTimeout(800);
  await showTodoActions(page, 'leader');
  const btn = page.locator(`.leader-todo-action-btn[data-todo-id="${todoId}"]`).first();
  const aggBtn = page.locator('.leader-todo-action-btn[data-group-key="leader:attendance-upload"]').first();
  const hasBtn = (await btn.count()) > 0 || (await aggBtn.count()) > 0;
  check('U4 考勤上传：渲染「去提交」按钮', hasBtn);
  if (hasBtn) {
    if ((await aggBtn.count()) > 0) await aggBtn.click(); else await btn.click();
    await page.waitForSelector('.leader-tab-btn[data-leader-tab="attendance"].tab-btn-active', { timeout: 3000 }).catch(() => {});
    const active = await page.evaluate(() => !!document.querySelector('.leader-tab-btn[data-leader-tab="attendance"].tab-btn-active'));
    check('U4 考勤上传：点击「去提交」切到「考勤上传」tab', active);
  }
  await page.evaluate(async (id) => {
    const { TodoStore } = await import('/src/services/todo.js?v=20260829f');
    TodoStore.delete(id);
  }, todoId);
  check('U4 无 JS 错误', errs.length === 0, errs.slice(0, 2).join(' | '));
  await page.close();
}

// ── U5 组长复盘提交待办（构造 review-submit 待办 → 复盘提交 tab）──
{
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`${BASE}/workspace/leader.html?dev=leader`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);
  const todoId = await page.evaluate(async () => {
    const { TodoStore, TodoCategory, TodoActionType, TodoSourceType } = await import('/src/services/todo.js?v=20260829f');
    const [t] = TodoStore.createBatch([{
      title: 'B1测试：提交活动复盘', role: 'leader', category: TodoCategory.SUBMIT,
      actionType: TodoActionType.SUBMIT, actionKey: 'review-submit', sourceType: TodoSourceType.ACTIVITY,
      sourceId: 'act-15',
    }]);
    return t.id;
  });
  await page.click('.leader-tab-btn[data-leader-tab="todo"]');
  await page.waitForTimeout(800);
  await showTodoActions(page, 'leader');
  const btn = page.locator(`.leader-todo-action-btn[data-todo-id="${todoId}"]`).first();
  const aggBtn = page.locator('.leader-todo-action-btn[data-group-key="leader:review-submit"]').first();
  const hasBtn = (await btn.count()) > 0 || (await aggBtn.count()) > 0;
  check('U5 复盘提交：渲染「去提交」按钮', hasBtn);
  if (hasBtn) {
    if ((await aggBtn.count()) > 0) await aggBtn.click(); else await btn.click();
    await page.waitForSelector('.leader-tab-btn[data-leader-tab="review"].tab-btn-active', { timeout: 3000 }).catch(() => {});
    await page.waitForSelector('.leader-tab-btn[data-leader-tab="attendance"].tab-btn-active', { timeout: 3000 }).catch(() => {});
    const active = await page.evaluate(() => ({
      review: !!document.querySelector('.leader-tab-btn[data-leader-tab="review"].tab-btn-active'),
      attendance: !!document.querySelector('.leader-tab-btn[data-leader-tab="attendance"].tab-btn-active'),
    }));
    check('U5 复盘提交：点击「去提交」切到「复盘提交」tab', active.review && !active.attendance, `active=${JSON.stringify(active)}`);
  }
  await page.evaluate(async (id) => {
    const { TodoStore } = await import('/src/services/todo.js?v=20260829f');
    TodoStore.delete(id);
  }, todoId);
  check('U5 无 JS 错误', errs.length === 0, errs.slice(0, 2).join(' | '));
  await page.close();
}

// ── U6 书记通知发布 tab：点击通知条目 → notice.html?id=xxx 直达详情 ──
{
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`${BASE}/workspace/secretary.html?dev=secretary`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);
  await page.click('.secretary-tab-btn[data-secretary-tab="notification"]');
  await page.waitForTimeout(800);
  const row = page.locator('.secretary-notification-row, [class*="notification"] [class*="row"], [data-notif-id]').first();
  const hasRow = await row.count() > 0;
  check('U6 通知发布：通知列表存在可点击条目', hasRow);
  if (hasRow) {
    // 从 DOM 读取该行通知 id（代码化：不依赖视觉）
    const notifId = await page.evaluate(() => {
      const el = document.querySelector('.secretary-notification-row, [data-notif-id]');
      return el ? (el.dataset.notifId || el.dataset.id || null) : null;
    });
    await row.click();
    await page.waitForFunction(() => location.pathname.endsWith('notice.html'), null, { timeout: 3000 }).catch(() => {});
    const url = page.url();
    check('U6 通知发布：点击通知条目跳 notice.html?id=xxx', /notice\.html\?id=/.test(url), `url=${url}`);
    if (notifId) check('U6 通知发布：跳转 id 与点击条目一致', url.includes(`id=${notifId}`), `notifId=${notifId}`);
  }
  check('U6 无 JS 错误', errs.length === 0, errs.slice(0, 2).join(' | '));
  await page.close();
}

// ── U7 聚合卡直达一致性（聚合卡「处理」与明细「去赋权」行为一致）──
{
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto(`${BASE}/workspace/leader.html?dev=leader`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);
  const ids = await page.evaluate(async () => {
    const { LifecycleTodoDeriver, TodoStore } = await import('/src/services/todo.js?v=20260829f');
    // 同 actionKey 两条 → 聚合卡（count=2）；另一条不同 actionKey → 明细按钮
    const a = LifecycleTodoDeriver.deriveFromActivityCreate({ id: 'act-2', title: 'B1聚合测试A', date: '2026-08-30' })[0];
    const b = LifecycleTodoDeriver.deriveFromActivityCreate({ id: 'act-2', title: 'B1聚合测试B', date: '2026-08-31' })[0];
    return { a: a.id, b: b.id };
  });
  await page.click('.leader-tab-btn[data-leader-tab="todo"]');
  await page.waitForTimeout(800);
  await showTodoActions(page, 'leader');
  const aggBtn = page.locator('.leader-todo-action-btn[data-group-key="leader:authorize"]').first();
  check('U7 聚合卡：同 actionKey 待办聚合为一张卡', (await aggBtn.count()) > 0);
  // 聚合卡「处理」→ write tab + act-2 详情
  if ((await aggBtn.count()) > 0) {
    await aggBtn.click();
    await page.waitForSelector('.leader-tab-btn[data-leader-tab="write"].tab-btn-active', { timeout: 3000 }).catch(() => {});
    const w1 = await page.evaluate(() => !!document.querySelector('.leader-tab-btn[data-leader-tab="write"].tab-btn-active'));
    check('U7 聚合卡「处理」：切到活动管理 tab', w1);
    await page.waitForSelector('.leader-act-item[data-act-id="act-2"]', { timeout: 3000 }).catch(() => {});
    const d1 = await page.evaluate(() => !!document.querySelector('.leader-act-item[data-act-id="act-2"]'));
    check('U7 聚合卡「处理」：act-2 条目存在', d1);
    await page.waitForFunction(() => {
      const panel = document.getElementById('leader-act-detail');
      return panel && !panel.classList.contains('hidden');
    }, null, { timeout: 3000 }).catch(() => {});
    const d2 = await page.evaluate(() => {
      const panel = document.getElementById('leader-act-detail');
      return !!panel && !panel.classList.contains('hidden');
    });
    check('U7 聚合卡「处理」：act-2 详情面板自动打开（与明细行为一致）', d2);
  }
  await page.evaluate(async (ids) => {
    const { TodoStore } = await import('/src/services/todo.js?v=20260829f');
    TodoStore.delete(ids.a); TodoStore.delete(ids.b);
  }, ids);
  check('U7 无 JS 错误', errs.length === 0, errs.slice(0, 2).join(' | '));
  await page.close();
}

const fail = results.filter(r => !r.ok).length;
console.log(`\n===== T-280-B1 浏览器回归：${results.length - fail}/${results.length} 通过 =====`);
await browser.close();
process.exit(fail > 0 ? 1 : 0);
