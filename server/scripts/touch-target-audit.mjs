// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  touch-target-audit.mjs — 390 触控命中区 / 表单错误态 / 模态 Esc 真机审计（P9 · 2026-10-31）
//
//  产出：`.ctx/evidence/2026-10-31/touch-forms.json`（供 `server/test/touch-target-guard.test.mjs` 做棘轮守卫）
//  运行：cd server; $env:PLAYWRIGHT_BROWSERS_PATH = "$PWD/.browsers"; node scripts/touch-target-audit.mjs
//
//  口径：
//   · 390×844；遍历页面内全部可点元素（a/button/input/select/textarea/summary/role=button·tab·menuitem/gridcell[data-date]）。
//   · 命中区 = 元素矩形 ∪ 其绝对定位伪元素（::before/::after）矩形；伪元素按祖先 overflow 裁剪后再比。
//   · 「改动前」由同一页面注入覆盖样式（关闭本次新增的伪元素/滚动容器补白）后复测与截图。
//   · 「<44×44 数量」按命中区统计，作为 daily 守卫的棘轮基线来源。
// ════════════════════════════════════════════════════════════════
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.AUDIT_BASE || 'http://localhost:3000';
const ROOT = join(import.meta.dirname, '..', '..');
const OUT_DIR = join(ROOT, '.ctx', 'evidence', '2026-10-31');
const OUT_FILE = join(OUT_DIR, 'touch-forms.json');
const MUTED = ['**://fonts.googleapis.com/**', '**://fonts.gstatic.com/**'];
const VIEWPORT = { width: 390, height: 844 };

const DISABLE_CSS = `
  .cal-cell-mobile[data-date]::after,
  .tab-btn::after,
  .cal-view-btn::after,
  .myws-row .btn-action::after,
  .help-toc-item::after { content: none !important; }
  .ws-tab-scroll { padding-block: 0 !important; margin-block: 0 16px !important; }
  .help-toc { padding-block: 0 4px !important; margin-block: 0 !important; }
  .cal-cell-mobile[data-date] { overflow: hidden !important; }
`;

mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
const page = await context.newPage();
for (const p of MUTED) await page.route(p, (r) => r.abort());

const result = {
  date: '2026-10-31',
  spec: 'P9 touch-target / forms / modal',
  viewport: VIEWPORT,
  base: BASE,
  controls: {},
  offenders: [],
  offenderCount: 0,
  forms: {},
  modal: {},
  screenshots: [],
  auditNotes: [],
};

/** 隐藏外部资源噪音后打开页面 */
async function goto(url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
}

/** 页面内测量：可点元素 + 伪元素命中区（含祖先 overflow 裁剪） */
function measureInPage(selector) {
  const clipOf = (el) => {
    let rect = null;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.overflow === 'visible' && cs.overflowX === 'visible' && cs.overflowY === 'visible') continue;
      const r = n.getBoundingClientRect();
      // 裁到 padding box（边框内侧）；不按视口裁剪——视口外的元素滚动后同样可点。
      const nr = {
        top: r.top + (parseFloat(cs.borderTopWidth) || 0),
        left: r.left + (parseFloat(cs.borderLeftWidth) || 0),
        right: r.right - (parseFloat(cs.borderRightWidth) || 0),
        bottom: r.bottom - (parseFloat(cs.borderBottomWidth) || 0),
      };
      rect = rect ? {
        top: Math.max(rect.top, nr.top), left: Math.max(rect.left, nr.left),
        right: Math.min(rect.right, nr.right), bottom: Math.min(rect.bottom, nr.bottom),
      } : nr;
    }
    return rect;
  };
  const hitOf = (el) => {
    const r = el.getBoundingClientRect();
    const clip = clipOf(el);
    let box = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    for (const pe of ['::before', '::after']) {
      const ps = getComputedStyle(el, pe);
      if (ps.content === 'none' || ps.position !== 'absolute') continue;
      const w = parseFloat(ps.width) || 0;
      const h = parseFloat(ps.height) || 0;
      if (!w || !h) continue;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      let pr = { left: cx - w / 2, top: cy - h / 2, right: cx + w / 2, bottom: cy + h / 2 };
      if (clip) pr = {
        left: Math.max(pr.left, clip.left), top: Math.max(pr.top, clip.top),
        right: Math.min(pr.right, clip.right), bottom: Math.min(pr.bottom, clip.bottom),
      };
      box = {
        left: Math.min(box.left, pr.left), top: Math.min(box.top, pr.top),
        right: Math.max(box.right, pr.right), bottom: Math.max(box.bottom, pr.bottom),
      };
    }
    return {
      w: +r.width.toFixed(2), h: +r.height.toFixed(2),
      hitW: +Math.max(0, box.right - box.left).toFixed(2),
      hitH: +Math.max(0, box.bottom - box.top).toFixed(2),
      x: +r.left.toFixed(1), y: +r.top.toFixed(1),
      box: {
        left: +box.left.toFixed(2), top: +box.top.toFixed(2),
        right: +box.right.toFixed(2), bottom: +box.bottom.toFixed(2),
      },
    };
  };
  const out = [];
  for (const el of document.querySelectorAll(selector)) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (el.closest('[hidden]')) continue;
    out.push({
      selector: String(el.className || el.tagName).slice(0, 80),
      text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24),
      ...hitOf(el),
    });
  }
  return out;
}

const CLICKABLE = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="tab"], [role="menuitem"], [role="gridcell"][data-date], [tabindex="0"]';

async function collectOffenders(pageName) {
  const list = await page.evaluate(measureInPage, CLICKABLE);
  const seen = new Set();
  for (const item of list) {
    if (item.hitW >= 44 && item.hitH >= 44) continue;
    const key = `${pageName}|${item.selector}|${item.text}|${item.hitW}x${item.hitH}|${item.x},${item.y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.offenders.push({ page: pageName, ...item });
  }
}

/** 类别测量 + 改动前后视觉尺寸 + 截图 */
async function captureCategory(key, pageName, selector, { minHitW = 44, minHitH = 44, adjacentGap = null, constraint = null, note = '' } = {}) {
  const after = await page.evaluate(measureInPage, selector);
  const afterShot = join(OUT_DIR, `390-${pageName}-after.png`);
  await page.screenshot({ path: afterShot, fullPage: false });
  result.screenshots.push(afterShot);
  await page.addStyleTag({ content: DISABLE_CSS });
  await page.waitForTimeout(120);
  const before = await page.evaluate(measureInPage, selector);
  const beforeShot = join(OUT_DIR, `390-${pageName}-before.png`);
  await page.screenshot({ path: beforeShot, fullPage: false });
  result.screenshots.push(beforeShot);
  const visualBefore = before[0] || null;
  const visualAfter = after[0] || null;
  // 相邻热区重叠：同一类别内两两求 2D 交集；只有 x / y 同时相交才算重叠。
  let overlapPairs = 0;
  let maxOverlapW = 0;
  let maxOverlapH = 0;
  for (let i = 0; i < after.length; i += 1) {
    for (let j = i + 1; j < after.length; j += 1) {
      const a = after[i].box;
      const b = after[j].box;
      const dx = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const dy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (dx > 0.01 && dy > 0.01) {
        overlapPairs += 1;
        maxOverlapW = Math.max(maxOverlapW, dx);
        maxOverlapH = Math.max(maxOverlapH, dy);
      }
    }
  }
  result.controls[key] = {
    maxOverlap: {
      pairs: overlapPairs,
      w: +maxOverlapW.toFixed(2),
      h: +maxOverlapH.toFixed(2),
    },
    selector,
    sampleText: after[0]?.text || '',
    visualBefore: visualBefore ? { w: visualBefore.w, h: visualBefore.h } : null,
    visualAfter: visualAfter ? { w: visualAfter.w, h: visualAfter.h } : null,
    hit: after.length
      ? { w: Math.min(...after.map((x) => x.hitW)), h: Math.min(...after.map((x) => x.hitH)) }
      : null,
    minHitW,
    minHitH,
    adjacentGap,
    constraint,
    note,
    count: after.length,
  };
  // 恢复本次改动（hide 注入的 style 节点）
  await page.evaluate(() => document.querySelectorAll('style').forEach((s) => {
    if (s.textContent && s.textContent.includes('content: none !important')) s.remove();
  }));
  return after;
}

// ═══ 登录页错误三态（未登录）═══
async function captureLoginState(pageName, action) {
  await goto(`${BASE}/login.html`);
  await page.waitForSelector('#student-id', { timeout: 30000 });
  await action();
  await page.waitForFunction(() => {
    const e = document.getElementById('login-error');
    return e && !e.classList.contains('hidden') && e.textContent.trim();
  }, null, { timeout: 15000 }).catch(() => {});
  const info = await page.evaluate(() => {
    const e = document.getElementById('login-error');
    const pick = (id) => {
      const el = document.getElementById(id);
      return el ? { invalid: el.getAttribute('aria-invalid'), describedby: el.getAttribute('aria-describedby'), value: el.value }
        : null;
    };
    const r = e ? e.getBoundingClientRect() : null;
    return {
      message: e ? e.textContent.trim() : '',
      visible: !!(e && !e.classList.contains('hidden')),
      errorTop: r ? +r.top.toFixed(1) : null,
      errorNearFields: !!(e && document.getElementById('password') && r && r.top >= document.getElementById('password').getBoundingClientRect().bottom),
      studentId: pick('student-id'),
      password: pick('password'),
      focused: document.activeElement && (document.activeElement.id || document.activeElement.tagName),
    };
  });
  result.forms[pageName] = info;
  return info;
}

await captureLoginState('loginEmpty', async () => {
  await page.click('#login-form button[type="submit"]');
});
await captureLoginState('loginWrong', async () => {
  await page.fill('#student-id', '2300010001');
  await page.fill('#password', 'wrong-pass');
  await page.click('#login-form button[type="submit"]');
});
await captureLoginState('loginNetwork', async () => {
  await page.route('**/api/v1/auth/login', (r) => r.abort());
  await page.fill('#student-id', '2300010001');
  await page.fill('#password', '123456');
  await page.click('#login-form button[type="submit"]');
  await page.waitForTimeout(1500);
  await page.unroute('**/api/v1/auth/login');
});

// ═══ 登录（支书）═══
await goto(`${BASE}/login.html`);
await page.waitForSelector('#student-id', { timeout: 30000 });
await page.fill('#student-id', '2300010001');
await page.fill('#password', '123456');
await Promise.all([
  page.waitForURL('**/workspace/secretary.html', { timeout: 30000 }),
  page.click('#login-form button[type="submit"]'),
]);
await page.waitForFunction(() => document.querySelectorAll('button[role="tab"]').length > 0, { timeout: 45000 });
await page.waitForTimeout(600);

// 工作台页签
await captureCategory('workbenchTab', 'workbench-tabs', 'button[role="tab"]', {
  adjacentGap: 8,
  note: '行内 gap 8px；宽度最小 58，已 ≥44，只扩高。滚动容器 padding-block 4px 抵消 overflow 裁剪。',
});
await collectOffenders('workspace-today');

// 日历日期格 + 视图切换
await page.locator('.secretary-tab-btn[data-secretary-tab="calendar"]').first().click();
await page.waitForSelector('.cal-cell-mobile', { timeout: 30000 });
await page.waitForTimeout(500);
await captureCategory('calendarDay', 'calendar-cells', '.cal-cell-mobile[data-date]', {
  minHitH: 42,
  adjacentGap: 2,
  constraint: '空行格视觉 40 高 + 行距 2 ⇒ 相邻可点元素节距 42；高度按 min(max(100%,44),100%+2) 收窄，避免上下行热区重叠 2px。有内容的 43.4 高行命中 44。',
  note: '横向命中 44（格宽 43.4 + 间距 2，净间隔约 1.4px）。overflow 改 visible 以露出扩展部分。',
});
await captureCategory('calendarView', 'calendar-view-switch', '.cal-view-btn', {
  minHitW: 37,
  adjacentGap: 6,
  constraint: '相邻按钮间距 6px，宽度上限 31+6=37；再扩会与相邻热区重叠。高度已 44。',
});
await collectOffenders('workspace-calendar');

// 待办行「更多」
await page.locator('.secretary-tab-btn[data-secretary-tab="todo"]').first().click();
await page.waitForTimeout(1500);
await captureCategory('todoMore', 'todo-more', '.todo-more__btn', {
  adjacentGap: 4,
  note: '命中区由既有 .list-row__trailing .btn-sm::after 提供 44×44；行尾 gap 4px（.todo-row），扩 1px/侧后仍留 2px。本次只核验不改规则。',
});
await collectOffenders('workspace-todo');

// 设置页行内动作
await goto(`${BASE}/settings.html#my-workspace`);
await page.waitForTimeout(2200);
await captureCategory('settingsAction', 'settings-myws', '.myws-row .btn-action', {
  minHitW: 36,
  minHitH: 42,
  adjacentGap: 2,
  constraint: '同一对上下移按钮间距 2px ⇒ 宽上限 36；相邻行节距 43px ⇒ 高上限 42（留 1px 不重叠）。',
});
await captureCategory('settingsListItem', 'settings-appearance', '.settings-group-item', {
  note: '设置左栏条目（非本次六类重点；作为同页对照组）。',
});
await collectOffenders('settings-my-workspace');
await goto(`${BASE}/settings.html#appearance`);
await page.waitForTimeout(1800);
await collectOffenders('settings-appearance');

// ═══ 设置向导错误三态（页眉空 / 空格 / 修正即清除）═══
await goto(`${BASE}/wizard.html`);
await page.waitForSelector('#wz-org-header', { timeout: 30000 });
await page.fill('#wz-org-header', '');
await page.click('[data-wz-act="save-step"][data-step="1"]');
await page.waitForFunction(() => {
  const e = document.getElementById('wz-org-header-err');
  return e && !e.hidden && e.textContent.trim();
}, null, { timeout: 15000 }).catch(() => {});
result.forms.settingsHeaderEmpty = await page.evaluate(() => {
  const el = document.getElementById('wz-org-header');
  const err = document.getElementById('wz-org-header-err');
  const r = err ? err.getBoundingClientRect() : null;
  const inputRect = el ? el.getBoundingClientRect() : null;
  return {
    message: err ? err.textContent.trim() : '',
    visible: !!(err && !err.hidden),
    invalid: el ? el.getAttribute('aria-invalid') : null,
    describedby: el ? el.getAttribute('aria-describedby') : null,
    errorNearField: !!(r && inputRect && r.top >= inputRect.bottom && r.top - inputRect.bottom < 40),
    errorTop: r ? +r.top.toFixed(1) : null,
    valuePreserved: el ? el.value : null,
  };
});
// 错误后输入即清除（不丢已填内容）
await page.fill('#wz-org-header', '   ');
await page.click('[data-wz-act="save-step"][data-step="1"]');
await page.waitForTimeout(200);
result.forms.settingsHeaderWhitespace = await page.evaluate(() => {
  const el = document.getElementById('wz-org-header');
  const err = document.getElementById('wz-org-header-err');
  return {
    message: err ? err.textContent.trim() : '',
    visible: !!(err && !err.hidden),
    invalid: el ? el.getAttribute('aria-invalid') : null,
    describedby: el ? el.getAttribute('aria-describedby') : null,
    valuePreserved: el ? el.value : null,
  };
});
await page.fill('#wz-org-header', '光华党支部');
result.forms.settingsHeaderCleared = await page.evaluate(() => {
  const el = document.getElementById('wz-org-header');
  return {
    invalid: el ? el.getAttribute('aria-invalid') : null,
    describedby: el ? el.getAttribute('aria-describedby') : null,
    value: el ? el.value : null,
  };
});

// ═══ 模态：confirmDanger Esc 取消 + 焦点回归 + Tab 陷阱 ═══
await page.evaluate(async () => {
  const mod = await import('/src/components/ui/modal.js?v=20261029b');
  const trigger = document.createElement('button');
  trigger.id = 'audit-modal-trigger';
  trigger.textContent = '打开危险确认';
  document.body.appendChild(trigger);
  trigger.focus();
  window.__auditDanger = 'pending';
  mod.confirmDanger({
    id: 'audit',
    title: '删除这条记录',
    bodyHtml: '<p>影响：该记录不可恢复。</p>',
    confirmLabel: '删除',
  }).then((v) => { window.__auditDanger = v; });
});
await page.waitForSelector('#modal-overlay-danger-audit', { timeout: 15000 });
const beforeEsc = await page.evaluate(() => ({
  overlay: !!document.getElementById('modal-overlay-danger-audit'),
  focusInPanel: !!document.activeElement.closest('#modal-overlay-danger-audit .modal-panel'),
  hasCloseBtn: !!document.querySelector('#modal-overlay-danger-audit [data-modal-close]'),
}));
// Tab 焦点陷阱：连按 6 次 Tab 仍应留在面板内
let trapped = true;
for (let i = 0; i < 6; i += 1) {
  await page.keyboard.press('Tab');
  trapped = trapped && await page.evaluate(() => !!document.activeElement.closest('#modal-overlay-danger-audit .modal-panel'));
}
await page.keyboard.press('Escape');
await page.waitForTimeout(400);
result.modal = {
  ...beforeEsc,
  tabTrapped: trapped,
  closedByEsc: await page.evaluate(() => !document.getElementById('modal-overlay-danger-audit')),
  focusReturned: await page.evaluate(() => document.activeElement && document.activeElement.id === 'audit-modal-trigger'),
  resolveValue: await page.evaluate(() => window.__auditDanger),
};

// ═══ 帮助目录 ═══
await goto(`${BASE}/help.html`);
await page.waitForSelector('.help-toc-item', { timeout: 30000 });
await captureCategory('helpToc', 'help-toc', '.help-toc-item', {
  adjacentGap: 2,
  note: '横排项间距 2px；宽度最小 46 已 ≥44，只扩高（上下无相邻可点元素）。',
});
await collectOffenders('help');

// ═══ 设置向导：新建支部两处就地错误（dev 模式 · 党委组织员；只触发校验失败，不写入）═══
// 用**全新 context**：主 context 已登录支书，登录页会直接跳工作台，挂不出开发模式开关。
let devPage = null;
try {
  const devContext = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  devPage = await devContext.newPage();
  for (const p of MUTED) await devPage.route(p, (r) => r.abort());
  await devPage.goto(`${BASE}/login.html?dev=1`, { waitUntil: 'domcontentloaded' });
  await devPage.waitForSelector('#dev-toggle', { timeout: 20000 });
  await devPage.check('#dev-toggle');
  await devPage.locator('#dev-cards [data-role="party-staff"]').first().click();
  await devPage.waitForURL(/\/(index|workspace\/[^/]+)\.html/, { timeout: 30000 }).catch(() => {});
  await devPage.goto(`${BASE}/wizard.html`, { waitUntil: 'domcontentloaded' });
  await devPage.waitForSelector('#wz-org-header', { timeout: 30000 });
  const createBtn = devPage.locator('[data-wz-act="toggle-create"]').first();
  if (await createBtn.count()) {
    await createBtn.click();
    await devPage.waitForSelector('#wz-create-appoint-secretary', { timeout: 15000 });
    // ① 勾选就地任命但未选首任支书
    await devPage.click('[data-wz-act="do-create"]');
    await devPage.waitForFunction(() => {
      const e = document.getElementById('wz-create-appoint-secretary-err');
      return e && !e.hidden && e.textContent.trim();
    }, null, { timeout: 10000 }).catch(() => {});
    result.forms.settingsAppointMissing = await devPage.evaluate(() => {
      const el = document.getElementById('wz-create-appoint-secretary');
      const err = document.getElementById('wz-create-appoint-secretary-err');
      return {
        message: err ? err.textContent.trim() : '',
        visible: !!(err && !err.hidden),
        invalid: el ? el.getAttribute('aria-invalid') : null,
        describedby: el ? el.getAttribute('aria-describedby') : null,
      };
    });
    // ② 首任支书 = 组织委员（同一人）
    await devPage.evaluate(() => {
      const sec = document.getElementById('wz-create-appoint-secretary');
      const org = document.getElementById('wz-create-appoint-org');
      const val = [...sec.options].find((o) => o.value)?.value || '';
      if (val) {
        sec.value = val;
        org.value = val;
        sec.dispatchEvent(new Event('change', { bubbles: true }));
        org.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await devPage.click('[data-wz-act="do-create"]');
    await devPage.waitForTimeout(300);
    result.forms.settingsAppointConflict = await devPage.evaluate(() => {
      const sec = document.getElementById('wz-create-appoint-secretary');
      const org = document.getElementById('wz-create-appoint-org');
      const err = document.getElementById('wz-create-appoint-conflict');
      return {
        visible: !!(err && !err.classList.contains('hidden') && !err.hidden),
        secInvalid: sec ? sec.getAttribute('aria-invalid') : null,
        secDescribedby: sec ? sec.getAttribute('aria-describedby') : null,
        orgInvalid: org ? org.getAttribute('aria-invalid') : null,
        orgDescribedby: org ? org.getAttribute('aria-describedby') : null,
      };
    });
  } else {
    result.auditNotes.push('dev 模式未出现新建支部面板：settingsAppoint* 两项未采集');
  }
} catch (e) {
  result.auditNotes.push(`dev 模式设置向导错误态采集失败：${e.message}`);
} finally {
  if (devPage) await devPage.context().close();
}

// ═══ 汇总 ═══
result.offenderCount = result.offenders.length;
result.auditNotes.push(`可点元素命中区 <44×44 共 ${result.offenderCount} 个（390×844；含输入框 / 普通按钮等未列入本轮六类的控件）。`);
writeFileSync(OUT_FILE, JSON.stringify(result, null, 2), 'utf8');
console.log(`[touch-audit] wrote ${OUT_FILE}`);
console.log(`[touch-audit] offenders=${result.offenderCount}`);
for (const [k, v] of Object.entries(result.controls)) {
  console.log(`  ${k}: visual ${v.visualBefore?.w}x${v.visualBefore?.h} → ${v.visualAfter?.w}x${v.visualAfter?.h}; hit ${v.hit?.w}x${v.hit?.h}`);
}
console.log('  forms:', Object.keys(result.forms).join(', '));
console.log('  modal:', JSON.stringify(result.modal));

await browser.close();
