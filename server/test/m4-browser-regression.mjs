// role: [工程师]+[AI]
// m4-browser-regression.mjs — T-279 M4 浏览器回归（基于真实 DOM 结构）
// 验证：①首页渲染（main 内容 + 日历 tab 可达） ②注册表 M4 原语（版本聚合/数据源/场景/dashboard 能力）
//      ③6 个工作台 tab 渲染 + 各自能力注册 ④无 JS 错误
// 运行：node server/test/m4-browser-regression.mjs
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
}

const browser = await chromium.launch();

// ── 1. 首页 ──
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const homeErrs = [];
page.on('pageerror', (e) => homeErrs.push(String(e)));
await page.goto(BASE + '/index.html?view=calendar', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const home = await page.evaluate(async () => {
  const reg = await import('/src/core/registry.js?v=20260823b');
  await import('/src/modules/capabilities/data-source.js?v=20260823b');
  await import('/src/modules/capabilities/sop-scenarios.js?v=20260823b');
  const cal = await import('/src/components/calendar.js?v=20260823b');
  const main = document.querySelector('main');
  return {
    mainLen: main?.innerHTML.length || 0,
    hasStats: document.body.innerText.includes('本月活动'),
    hasCalendarTabs: !!document.querySelector('[id*="calendar"], [data-view="calendar"], .view-section'),
    version: reg.getRegistryVersion(),
    srcs: reg.getCapabilities({ scope: 'data-source' }).map(c => c.id),
    scenes: reg.getCapabilities({ scope: 'scenario' }).map(c => c.id),
    dash: reg.getCapabilities({ scope: 'dashboard' }).map(c => c.id),
  };
});
check('首页 main 渲染', home.mainLen > 5000, `len=${home.mainLen}`);
check('首页统计卡', home.hasStats);
check('首页日历容器可达', home.hasCalendarTabs);
check('注册表版本聚合', /20260823b/.test(home.version), `v=${home.version}`);
check('数据源能力注册 mock/api', home.srcs.includes('mock-data-source') && home.srcs.includes('api-data-source'), home.srcs.join(','));
check('场景能力注册 sop-scenarios', home.scenes.includes('sop-scenarios'), home.scenes.join(','));
check('dashboard 能力含 activity-calendar', home.dash.includes('activity-calendar'), home.dash.join(','));
check('首页无 JS 错误', homeErrs.length === 0, homeErrs.slice(0, 2).join(' | '));
await page.close();

// ── 2. 6 工作台 ──
const workspaces = [
  { file: 'leader', role: 'leader', name: '组长工作台', minTabs: 9, scope: 'workspace:leader', capId: 'leader-workspace' },
  { file: 'org', role: 'org-commissioner', name: '组织委员工作台', minTabs: 8, scope: 'workspace:org', capId: 'org-workspace' },
  { file: 'prop', role: 'prop-commissioner', name: '宣传委员工作台', minTabs: 7, scope: 'workspace:prop', capId: 'prop-workspace' },
  { file: 'disc', role: 'disc-commissioner', name: '纪检委员工作台', minTabs: 9, scope: 'workspace:disc', capId: 'disc-workspace' },
  { file: 'visitor', role: 'participant', name: '成员工作台', minTabs: 6, scope: 'workspace:visitor', capId: 'visitor-workspace' },
  // 书记工作台为早期薄壳样板（tab 内联入口，未注册表化——既有状态，M4 不改造）
  { file: 'secretary', role: 'secretary', name: '书记工作台', minTabs: 7, scope: 'workspace:secretary', capId: null },
];

for (const ws of workspaces) {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(`${BASE}/workspace/${ws.file}.html?dev=${ws.role}`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2200);
  const info = await p.evaluate(async ({ scope, file, minTabs }) => {
    const reg = await import('/src/core/registry.js?v=20260823b');
    const capIds = reg.getCapabilities({ scope }).map(c => c.id);
    // tab 按钮：前缀式 class（${file}-tab-btn），或通用 [class*="-tab-btn"]
    const btns = [...document.querySelectorAll(`#${file}-content [class*="tab-btn"]`)]
      .filter(b => b.textContent.trim().length > 0 && b.textContent.trim().length < 12);
    const tabContent = document.getElementById(`${file}-tab-content`);
    return { btnCount: btns.length, tabContentLen: tabContent?.innerHTML.length || 0, capIds };
  }, { scope: ws.scope, file: ws.file, minTabs: ws.minTabs });

  const capOk = !ws.capId || info.capIds.includes(ws.capId);
  check(`${ws.name} tab 渲染`, info.btnCount >= ws.minTabs, `tabs=${info.btnCount}/${ws.minTabs}`);
  check(`${ws.name} tab 内容非空`, info.tabContentLen > 50, `len=${info.tabContentLen}`);
  if (ws.capId) check(`${ws.name} 能力注册`, capOk, info.capIds.join(','));
  check(`${ws.name} 无 JS 错误`, errs.length === 0, errs.slice(0, 2).join(' | '));
  await p.close();
}

const fail = results.filter(r => !r.ok).length;
console.log(`\n===== M4 浏览器回归：${results.length - fail}/${results.length} 通过 =====`);
await browser.close();
process.exit(fail > 0 ? 1 : 0);
