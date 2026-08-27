// role: [工程师]+[AI]
// t235-browser-regression.mjs — T-235 首页跳转直达浏览器实测（T-280 B1-2）
// 覆盖：CHECKLIST「手动检查清单 T-235」8 用例 + view=activities 附加项 + 首页三类点击 + 高亮褪去一致性
// 运行：先启动 server（node server.js），再执行 node server/test/t235-browser-regression.mjs
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
}

const browser = await chromium.launch();

/** 登录辅助：打开 workspace?dev=ROLE（devLogin + reload），等待数据加载 */
async function loginAs(role, file) {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(`${BASE}/workspace/${file}.html?dev=${role}`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3000); // devLogin 触发 reload + mockDB 加载
  return { p, errs };
}

/** 读取当前激活 tab id */
async function getActiveTab(p, prefix) {
  return p.evaluate((pfx) => {
    const btn = document.querySelector(`.${pfx}-tab-btn.tab-btn-active`);
    return btn ? btn.getAttribute(`data-${pfx}-tab`) : null;
  }, prefix);
}

/** 读取当前 URL search（应已被消费清空） */
async function getSearch(p) {
  return p.evaluate(() => window.location.search);
}

/** 目标元素是否带高亮类 */
async function hasHighlight(p, sel) {
  return p.evaluate((s) => !!document.querySelector(`${s}.nav-flash-highlight`), sel);
}

/** 等待元素出现 + 检查高亮（轮询式：容忍冷加载首次渲染延迟；waitForSelector 对 class 变化偶发漏检，改用 evaluate 轮询） */
async function waitElAndHighlight(p, sel, timeout = 8000) {
  const exists = await p.waitForSelector(sel, { timeout, state: 'attached' }).then(() => true).catch(() => false);
  if (!exists) return { exists: false, highlighted: false };
  const highlighted = await p.evaluate(async ({ sel, timeout }) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = document.querySelector(sel);
      if (el && el.classList.contains('nav-flash-highlight')) return true;
      await new Promise(r => setTimeout(r, 100));
    }
    return false;
  }, { sel, timeout });
  return { exists: true, highlighted };
}

// ── 8 用例 ──────────────────────────────────────────────
// 用例 1：书记 activityId=act-15 → 活动管理(calendar) + 月份 2026-06 + 详情 + 高亮
{
  const { p } = await loginAs('secretary', 'secretary');
  await p.goto(`${BASE}/workspace/secretary.html?activityId=act-15`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(900);
  const tab = await getActiveTab(p, 'secretary');
  const search = await getSearch(p);
  const month = await p.evaluate(() => document.body.innerText.includes('2026年6月') || document.body.innerText.includes('2026-06'));
  const detail = await p.evaluate(() => document.body.innerText.includes('6月共建'));
  check('用例1 书记 activityId=act-15 → 活动管理 tab', tab === 'calendar', `tab=${tab}`);
  check('用例1 书记 URL 参数已消费', search === '', `search=${search}`);
  check('用例1 书记 月份切到 2026-06', month);
  check('用例1 书记 详情面板打开 act-15', detail);
  await p.close();
}

// 用例 2：书记 taskforceId=tf-001 → 专班查看 + 卡片高亮
{
  const { p } = await loginAs('secretary', 'secretary');
  await p.goto(`${BASE}/workspace/secretary.html?taskforceId=tf-001`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(900);
  const tab = await getActiveTab(p, 'secretary');
  const search = await getSearch(p);
  const { highlighted: hl } = await waitElAndHighlight(p, '.tfv-card[data-tf-id="tf-001"]');
  check('用例2 书记 taskforceId=tf-001 → 专班查看 tab', tab === 'tf-view', `tab=${tab}`);
  check('用例2 书记 URL 参数已消费', search === '', `search=${search}`);
  check('用例2 书记 tf-001 卡片高亮', hl);
  await p.close();
}

// 用例 3：组织委员 activityId=act-15 → 活动查看 + 月份跟随 + 详情
{
  const { p } = await loginAs('org-commissioner', 'org');
  await p.goto(`${BASE}/workspace/org.html?activityId=act-15`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(900);
  const tab = await getActiveTab(p, 'org');
  const search = await getSearch(p);
  const detail = await p.evaluate(() => document.body.innerText.includes('6月共建'));
  check('用例3 组织 activityId=act-15 → 活动查看 tab', tab === 'activity-view', `tab=${tab}`);
  check('用例3 组织 URL 参数已消费', search === '', `search=${search}`);
  check('用例3 组织 详情面板打开 act-15', detail);
  await p.close();
}

// 用例 4：组织委员 taskforceId=tf-002 → 专班管理 + 卡片高亮 + 详情展开
{
  const { p } = await loginAs('org-commissioner', 'org');
  await p.goto(`${BASE}/workspace/org.html?taskforceId=tf-002`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(900);
  const tab = await getActiveTab(p, 'org');
  const search = await getSearch(p);
  const { exists: cardExists, highlighted: hl } = await waitElAndHighlight(p, '.tf-store-card[data-tf-id="tf-002"]');
  check('用例4 组织 taskforceId=tf-002 → 专班管理 tab', tab === 'taskforce', `tab=${tab}`);
  check('用例4 组织 URL 参数已消费', search === '', `search=${search}`);
  check('用例4 组织 tf-002 卡片存在', cardExists);
  check('用例4 组织 tf-002 卡片高亮', hl);
  await p.close();
}

// 用例 5：宣传委员 activityId=act-1 → 项目看板 + 卡片高亮
{
  const { p } = await loginAs('prop-commissioner', 'prop');
  await p.goto(`${BASE}/workspace/prop.html?activityId=act-1`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(900);
  const tab = await getActiveTab(p, 'prop');
  const search = await getSearch(p);
  const { highlighted: hl } = await waitElAndHighlight(p, '.kanban-card[data-kt="activity"][data-ki="act-1"]');
  check('用例5 宣传 activityId=act-1 → 项目看板 tab', tab === 'kanban', `tab=${tab}`);
  check('用例5 宣传 URL 参数已消费', search === '', `search=${search}`);
  check('用例5 宣传 act-1 看板卡片高亮', hl);
  await p.close();
}

// 用例 6：纪检委员 taskforceId=tf-001 → 专班查看 + 卡片高亮
{
  const { p } = await loginAs('disc-commissioner', 'disc');
  await p.goto(`${BASE}/workspace/disc.html?taskforceId=tf-001`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(900);
  const tab = await getActiveTab(p, 'disc');
  const search = await getSearch(p);
  const { highlighted: hl } = await waitElAndHighlight(p, '.tfv-card[data-tf-id="tf-001"]');
  check('用例6 纪检 taskforceId=tf-001 → 专班查看 tab', tab === 'tf-view', `tab=${tab}`);
  check('用例6 纪检 URL 参数已消费', search === '', `search=${search}`);
  check('用例6 纪检 tf-001 卡片高亮', hl);
  await p.close();
}

// 用例 7：党小组组长 activityId=act-2 → 活动管理 + 详情展开 + 高亮
{
  const { p } = await loginAs('leader', 'leader');
  await p.goto(`${BASE}/workspace/leader.html?activityId=act-2`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(900);
  const tab = await getActiveTab(p, 'leader');
  const search = await getSearch(p);
  const { exists: itemExists, highlighted: hl } = await waitElAndHighlight(p, '.leader-act-item[data-act-id="act-2"]');
  check('用例7 组长 activityId=act-2 → 活动管理 tab', tab === 'write', `tab=${tab}`);
  check('用例7 组长 URL 参数已消费', search === '', `search=${search}`);
  check('用例7 组长 act-2 条目存在', itemExists);
  check('用例7 组长 act-2 条目高亮', hl);
  await p.close();
}

// 用例 8：访客 activityId=act-1 → 活动动态 + 高亮自动褪去
{
  const { p } = await loginAs('participant', 'visitor');
  await p.goto(`${BASE}/workspace/visitor.html?activityId=act-1`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(900);
  const tab = await getActiveTab(p, 'visitor');
  const search = await getSearch(p);
  // 活动动态列表条目选择器为 data-visitor-act-id（非 data-act-id）
  const { exists: itemExists, highlighted: hlEarly } = await waitElAndHighlight(p, '[data-visitor-act-id="act-1"]');
  await p.waitForTimeout(3000); // 高亮 2800ms 应已褪去
  const hlLate = await hasHighlight(p, '[data-visitor-act-id="act-1"]');
  check('用例8 访客 activityId=act-1 → 活动动态 tab', tab === 'activities', `tab=${tab}`);
  check('用例8 访客 URL 参数已消费', search === '', `search=${search}`);
  check('用例8 访客 目标条目存在', itemExists);
  check('用例8 访客 初始高亮', hlEarly);
  check('用例8 访客 高亮自动褪去', !hlLate);
  await p.close();
}

// ── 附加：view=activities ─────────────────────────────
{
  const { p } = await loginAs('secretary', 'secretary');
  await p.goto(`${BASE}/workspace/secretary.html?view=activities`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(900);
  const tab = await getActiveTab(p, 'secretary');
  check('附加 书记 view=activities → 活动管理 tab', tab === 'calendar', `tab=${tab}`);
  await p.close();
}
{
  const { p } = await loginAs('org-commissioner', 'org');
  await p.goto(`${BASE}/workspace/org.html?view=activities`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(900);
  const tab = await getActiveTab(p, 'org');
  check('附加 组织 view=activities → 活动查看 tab', tab === 'activity-view', `tab=${tab}`);
  await p.close();
}

// ── 附加：首页三类点击跳转（J1/J2/J3）────────────────────

// J1 活动列表卡片
{
  const { p } = await loginAs('participant', 'visitor');
  await p.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  // 检测方法：点击后等待进入 workspace 路径（URL 参数会被工作台立即消费清空；
  // waitForURL 对 replaceState 清参的中间 URL 捕获不稳定，改用 waitForFunction 轮询）
  const navPromise = p.waitForFunction(() => window.location.pathname.includes('/workspace/'), null, { timeout: 5000 }).catch(() => null);
  const clicked = await p.evaluate(() => {
    const el = document.querySelector('#dashboard-activity-list [data-activity-id]');
    if (!el) return false;
    el.click();
    return true;
  });
  if (!clicked) { check('附加 首页活动列表卡片点击 目标元素不存在', false); }
  else {
    const nav = await navPromise;
    check('附加 首页活动列表卡片点击 → 工作台 activityId 直达', !!nav);
  }
  await p.close();
}

// J2 专班卡片
{
  const { p } = await loginAs('participant', 'visitor');
  await p.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  const navPromise = p.waitForFunction(() => window.location.pathname.includes('/workspace/'), null, { timeout: 5000 }).catch(() => null);
  const clicked = await p.evaluate(() => {
    const el = document.querySelector('[data-tf-id]');
    if (!el) return false;
    el.click();
    return true;
  });
  if (!clicked) { check('附加 首页专班卡片点击 目标元素不存在', false); }
  else {
    const nav = await navPromise;
    check('附加 首页专班卡片点击 → 工作台 taskforceId 直达', !!nav);
  }
  await p.close();
}

// J3 日历条目点击（日历视图）
{
  const { p } = await loginAs('participant', 'visitor');
  await p.goto(`${BASE}/index.html?view=calendar`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  const navPromise = p.waitForFunction(() => window.location.pathname.includes('/workspace/'), null, { timeout: 5000 }).catch(() => null);
  const clicked = await p.evaluate(() => {
    const el = document.querySelector('.cal-activity-item');
    if (!el) return false;
    el.click();
    return true;
  });
  if (!clicked) { check('附加 首页日历条目点击 目标元素不存在', false); }
  else {
    const nav = await navPromise;
    check('附加 首页日历条目点击 → 工作台 activityId 直达', !!nav);
  }
  await p.close();
}

await browser.close();

// ── 汇总 ──────────────────────────────────────────────
const pass = results.filter(r => r.ok).length;
const fail = results.filter(r => !r.ok).length;
console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`T-235 实测汇总：${pass} PASS / ${fail} FAIL / 共 ${results.length} 项`);
process.exit(fail > 0 ? 1 : 0);
