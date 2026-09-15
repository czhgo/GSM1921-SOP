// server/test/form-loop-sweep.test.mjs — 「校验（validate）与载体（UI 控件）失配」真机闭环普查守卫（2026-09-15 批次 44）
//
// 病根（支书实报，批次 32 已修 1 处）：提交时按状态取到「已选 X」，而逐人填写框不在位
//   （选人面板一关就没渲染），于是报「请填写 X 的考察内容」而框根本不存在。同类校验点全站 ≥50 处。
//
// 本守卫对 form-loop-registry.mjs 的 MACHINE_FLOWS **逐条真机闭环断言**（七演示账号登录取页）：
//   ① 打开到该表单（空必填，不做填写）；
//   ② 点提交；
//   ③ 必须出现**可见**的校验提示（showToast → #toast-container）；**既无提示也无提交成功＝静默失败，判违规**；
//   ④ 【核心判据】提示文案点名的字段，页面上必须有**可见载体**（未被 hidden/display:none 隐藏）——
//      报「请填写 X」而 X 的框不在位 ⇒ 违规（支书实报的那类）；
//   ⑤ 考察上传两流程经「打开人员选择器→选人→关面板」复刻「关面板」场景，直接覆盖反向断言：
//      载体（逐人填写框）面板关闭后仍在位，报「请填写 X 的考察内容」才成立。
// 另加台账守卫（防「只修一处」复发）：规模基线 / 白名单必带 reason / machine:true 全部纳入真机 / 无僵尸条目 / 出处文案存在。
// 运行：node --test --test-concurrency=1 test/form-loop-sweep.test.mjs（需 DISABLE_PASSWORD_CHECK=1，同其它 e2e）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
import { VALIDATION_SITES, MACHINE_FLOWS, SITES_BASELINE, FLOWS_BASELINE } from './form-loop-registry.mjs';

const ROOT = join(import.meta.dirname, '..', '..');

/** 七个工作台 → 演示账号（与 docs/src/mock/accounts.js 一致；口令 123456） */
const ACCOUNTS = {
  secretary: '2300010001',
  org: '2400012355',
  prop: '2400012356',
  disc: '2400012354',
  leader: '2400012345',
  visitor: '2400012349',
  'party-committee': '9000000001',
};

let server, base, browser;
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
    await new Promise((r) => server.close(r));
  }
});

async function loginAs(studentId, pageName) {
  const page = await browser.newPage();
  page.__errs = [];
  page.on('pageerror', (e) => page.__errs.push(e.message));
  await page.route('**://fonts.googleapis.com/**', (r) => r.abort());
  await page.route('**://fonts.gstatic.com/**', (r) => r.abort());
  await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
  let ok = false;
  for (let attempt = 0; attempt < 2 && !ok; attempt += 1) {
    await page.goto(`${base}/login.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#student-id', { timeout: 30000 });
    await page.fill('#student-id', studentId);
    await page.fill('#password', '123456');
    await Promise.all([
      page.waitForURL(`**/workspace/${pageName}.html`, { timeout: 30000 }),
      page.click('button[type="submit"]'),
    ]);
    try {
      await page.waitForFunction(() => document.querySelectorAll('button[role="tab"]').length > 0, { timeout: 45000 });
      ok = true;
    } catch (e) {
      if (attempt === 1) throw e;
    }
  }
  // 等数据加载（LOADING→IDLE 的 setState 重渲染）稳定后再切 tab：避免壳层 _renderCurrentTab
  // 与切 tab 动态 import 的「旧 tab 内容晚到覆盖新 tab」竞态（同 page-sweep 的做法，此处留更足余量）。
  await page.waitForTimeout(1500);
  return page;
}

async function openTab(page, label) {
  await page.evaluate((l) => {
    [...document.querySelectorAll('button[role="tab"]')].find((x) => x.textContent.includes(l))?.click();
  }, label);
  await page.waitForTimeout(1000);
}

/**
 * 元素是否**可见**（未被祖先 display:none / visibility:hidden / opacity:0 隐藏；含尺寸）。
 * 载体友好判定：允许「原生控件被视觉隐藏但可见容器在」的两种统一改造——
 *   · select.input-flat 由 custom-select 增强：原生 select 加 .cs-native 被 clip 隐藏，
 *     可见载体是 .cs-select 内的 .cs-trigger（唯一源 components/custom-select.js）；
 *   · checkbox/radio 以 .hidden 藏于可见 label（chip）内：可见载体即该 label。
 * 判定的仍是「用户能否看到并操作该字段的载体」，不改变「报必填而载体不在位＝违规」的判据。
 */
const CARRIER_VISIBLE = (sel) => {
  const isVisible = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 2 && r.height > 2 && s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0;
  };
  return [...document.querySelectorAll(sel)].some((el) =>
    isVisible(el) ||
    isVisible(el.closest('.cs-select')?.querySelector('.cs-trigger')) ||
    isVisible(el.closest('label')));
};

async function runStep(page, step) {
  if (!step) return;
  if (step.click) {
    await page.evaluate((s) => document.querySelector(s)?.click(), step.click);
    await page.waitForTimeout(250);
  } else if (step.waitFor) {
    await page.waitForSelector(step.waitFor, { state: 'attached', timeout: 10000 });
    await page.waitForTimeout(200);
  } else if (step.selectFirstOption) {
    // 联动的来源下拉可能是异步填充——轮询等待首个非空 option
    await page.waitForFunction((s) => {
      const el = document.querySelector(s);
      return !!el && [...el.options].some((o) => o.value);
    }, step.selectFirstOption, { timeout: 8000 }).catch(() => {});
    await page.evaluate((s) => {
      const el = document.querySelector(s);
      const opt = el && [...el.options].find((o) => o.value);
      if (opt) { el.value = opt.value; el.dispatchEvent(new Event('change', { bubbles: true })); }
    }, step.selectFirstOption);
    await page.waitForTimeout(400);
  } else if (step.selectValue) {
    const { selector, value } = step.selectValue;
    await page.evaluate(({ s, v }) => {
      const el = document.querySelector(s);
      if (el) { el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); }
    }, { s: selector, v: value });
    await page.waitForTimeout(400);
  } else if (step.openPicker) {
    const { trigger, count } = step.openPicker;
    await page.evaluate((s) => document.querySelector(s)?.click(), trigger);
    await page.waitForFunction(() => document.querySelectorAll('.person-picker-item').length > 0, { timeout: 8000 });
    await page.evaluate((n) => {
      const items = [...document.querySelectorAll('.person-picker-item')];
      for (let i = 0; i < n && i < items.length; i += 1) items[i].click();
    }, count);
    await page.waitForTimeout(250);
    // 复刻病灶场景：不点「确认」，直接关面板——逐人填写框必须仍在位
    await page.evaluate(() => document.querySelector('.person-picker-close-btn')?.click());
    await page.waitForTimeout(300);
  } else if (step.setValue) {
    const { selector, value } = step.setValue;
    await page.evaluate(({ s, v }) => {
      const el = document.querySelector(s);
      if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }
    }, { s: selector, v: value });
    await page.waitForTimeout(150);
  } else if (step.dispatchSubmit) {
    await page.evaluate((s) => {
      const f = document.querySelector(s);
      if (f) f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }, step.dispatchSubmit);
    await page.waitForTimeout(250);
  } else {
    throw new Error(`未知步骤：${JSON.stringify(step)}`);
  }
}

async function submitFlow(page, flow) {
  await page.evaluate(() => { document.getElementById('toast-container')?.replaceChildren(); });
  for (const s of flow.submit) await runStep(page, s);
}

/** 读取本次提交产生的可见提示（#toast-container 文本）；超时无提示返回 ''（＝静默失败候选） */
async function readToast(page) {
  await page.waitForFunction(
    () => (document.getElementById('toast-container')?.textContent || '').trim().length > 0,
    { timeout: 4000 },
  ).catch(() => {});
  return page.evaluate(() => (document.getElementById('toast-container')?.textContent || '').replace(/\s+/g, ' ').trim());
}

/** 打开到目标表单：点 tab → 执行 open 步骤 → 等到「提交口」就位；抗负载抖动重试一次 */
async function ensureFlow(page, flow) {
  const submitSel = flow.submit[0].click || flow.submit[0].dispatchSubmit;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await openTab(page, flow.tab);
    for (const s of flow.open) await runStep(page, s);
    try {
      await page.waitForSelector(submitSel, { state: 'attached', timeout: 12000 });
      return;
    } catch (e) {
      if (attempt === 2) {
        const diag = await page.evaluate(() => ({
          tabs: [...document.querySelectorAll('button[role="tab"]')].map((b) => b.textContent.trim()),
          active: document.querySelector('button[role="tab"].tab-btn-active')?.textContent?.trim() || '',
          contentLen: (document.getElementById('secretary-tab-content') || {}).innerHTML?.length ?? -1,
          html: ((document.getElementById('secretary-tab-content') || {}).innerHTML || '').slice(0, 500),
          bodyHint: (document.querySelector('main, #workspace-main, body')?.textContent || '').slice(0, 120),
        }));
        throw new Error(`等待提交口「${submitSel}」超时；诊断：${JSON.stringify(diag)}；脚本错误：${JSON.stringify(page.__errs)}`);
      }
      await page.waitForTimeout(1200);
    }
  }
}

/** 逐条真机闭环断言（返回违规数组；空数组＝通过） */
async function sweepFlow(page, flow) {
  const v = [];
  for (let i = 0; i < flow.expect.length; i += 1) {
    const e = flow.expect[i];
    const at = `${e.file} · ${e.field}`;
    await submitFlow(page, flow);
    const toast = await readToast(page);
    if (!toast) { v.push(`静默失败：点提交后既无校验提示也无成功提示（${at}）`); break; }
    if (!toast.includes(e.msg)) {
      v.push(`提示不符：应报「${e.msg}」实测「${toast}」（${at}）`);
      // 提示不符则后续状态不可信，停止该流程
      break;
    }
    const visible = await page.evaluate(CARRIER_VISIBLE, e.carrier);
    if (!visible) v.push(`【载体不在位】报「${e.msg}」但载体「${e.carrier}」不可见/不存在（${at}）`);
    if (e.satisfy) await runStep(page, e.satisfy);
  }
  return v;
}

// ── 台账守卫（防「只修一处」复发）────────────────────────────────────────

test('S0 台账不得静默缩水：VALIDATION_SITES / MACHINE_FLOWS 规模不低于基线', () => {
  console.log(`[台账规模] VALIDATION_SITES=${VALIDATION_SITES.length}（基线 ${SITES_BASELINE}） machine:true=${VALIDATION_SITES.filter((s) => s.machine).length} machine:false=${VALIDATION_SITES.filter((s) => !s.machine).length} MACHINE_FLOWS=${MACHINE_FLOWS.length}（基线 ${FLOWS_BASELINE}）`);
  assert.ok(VALIDATION_SITES.length >= SITES_BASELINE, `校验点台账 ${VALIDATION_SITES.length} 少于基线 ${SITES_BASELINE}（如因重构而减少须在同提交显式更新基线并说明）`);
  assert.ok(MACHINE_FLOWS.length >= FLOWS_BASELINE, `真机流程 ${MACHINE_FLOWS.length} 少于基线 ${FLOWS_BASELINE}`);
});

test('S1 白名单项必带 reason：machine:false 每条都必须写明「为什么不能自动化」', () => {
  const bad = VALIDATION_SITES.filter((s) => !s.machine && !(s.reason && s.reason.trim()));
  assert.deepEqual(bad.map((s) => `${s.file}:${s.line} ${s.field}`), [], '存在无 reason 的 machine:false 白名单项（防白名单变垃圾桶）');
});

test('S2 machine:true 校验点必须全部纳入真机覆盖（新增校验点未纳入＝守卫变红）', () => {
  const covered = new Set();
  for (const f of MACHINE_FLOWS) for (const e of f.expect) covered.add(`${e.file}|${e.field}`);
  const missing = VALIDATION_SITES.filter((s) => s.machine && !covered.has(`${s.file}|${s.field}`))
    .map((s) => `${s.file} · ${s.field}`);
  assert.deepEqual(missing, [], `下列 machine:true 校验点未出现在任何 MACHINE_FLOWS.expect：\n${missing.join('\n')}`);
});

test('S3 无僵尸条目：每个 expect 条目必须对应 machine:true 校验点（删流程也变红）', () => {
  const truth = new Set(VALIDATION_SITES.filter((s) => s.machine).map((s) => `${s.file}|${s.field}`));
  const zombie = [];
  for (const f of MACHINE_FLOWS) for (const e of f.expect) if (!truth.has(`${e.file}|${e.field}`)) zombie.push(`[${f.id}] ${e.file} · ${e.field}`);
  assert.deepEqual(zombie, [], `下列 expect 条目没有对应的 machine:true 校验点：\n${zombie.join('\n')}`);
});

test('S4 出处文案存在：每条登记项的 file 存在且含所登记文案（防漂移/僵尸）', () => {
  const bad = [];
  for (const s of VALIDATION_SITES) {
    // 防污染：数据里绝不该出现 `?v=`——2026-09-15 批次 44 真实事故：bump-version.mjs 的 test 补戳正则
    // 把 113 条 file 当成 import 规格符补上 `?v=…`，S4 只报「文件不存在」而看不出被谁改坏。此断言把它变成
    // 一眼可辨的红灯；台账数据也据此改写成 `SRC + '相对路径'`（不再出现 `/src/….js` 连写，补戳脚本无法命中）。
    const path = s.file.split('?')[0];
    if (path !== s.file) { bad.push(`登记项被版本戳污染（file 含 ?v=）：${s.file}`); continue; }
    const abs = join(ROOT, path);
    if (!existsSync(abs)) { bad.push(`文件不存在：${s.file}`); continue; }
    if (!readFileSync(abs, 'utf8').includes(s.msg)) bad.push(`文案缺失：${s.file} 不含「${s.msg}」（字段 ${s.field}）`);
  }
  assert.deepEqual(bad, [], bad.join('\n'));
});

// ── 真机闭环普查（逐流程）──────────────────────────────────────────────

for (const flow of MACHINE_FLOWS) {
  test(`真机闭环 · ${flow.page}/${flow.tab}（${flow.id}）：空必填点提交须报可见提示且载体在位`, async () => {
    const page = await loginAs(ACCOUNTS[flow.page], flow.page);
    try {
      await ensureFlow(page, flow);
      const violations = await sweepFlow(page, flow);
      assert.deepEqual(violations, [], `${flow.id} 表单闭环普查不通过：\n${violations.map((x) => '  - ' + x).join('\n')}`);
    } finally {
      await page.close();
    }
  });
}
