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
// ⑦ 【第二阶段 · 成功路径，2026-09-16 批次 Q-23-44】上两条只证「**没填对时**会不会说一声、框在不在」，
//   **填对了之后的路完全没走**（能否提交成功、是否落库、列表是否刷新）。第二阶段对 SUCCESS_FLOWS 逐条问：
//   填合法值 → 触发动作 → ① 必须出现**成功提示**；② 动作**真的改变了状态**；③ 标 reload 的还要
//   **整页重载后仍成立**（＝落库 + 列表刷新的唯一证据；只断言当场 DOM 变化会假绿）。
//   两阶段**互不蕴含**：一条流程可能只在前阶段、也可能只在后阶段。
// 另加台账守卫（防「只修一处」复发）：规模基线 / 白名单必带 reason / machine:true 全部纳入真机 / 无僵尸条目 / 出处文案存在。
// 运行：node --test --test-concurrency=1 test/form-loop-sweep.test.mjs（需 DISABLE_PASSWORD_CHECK=1，同其它 e2e）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
import {
  VALIDATION_SITES, MACHINE_FLOWS, SITES_BASELINE, FLOWS_BASELINE,
  SUCCESS_FLOWS, SUCCESS_FLOWS_BASELINE, SUCCESS_FLOWS_KNOWN_GAP,
} from './form-loop-registry.mjs';

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

async function loginAs(studentId, pageName, targetPath) {
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
  // 批次 47-D 续（2026-09-16）：**独立页支持**。台账里有 13 处校验点**不在工作台 tab 上**，
  //   落在 `docs/*.html` 独立页（feedback / search / thought-report / activity）——
  //   原 schema 只会走 `workspace/<page>.html`，这些站点**结构性不可达**，只能长期挂 machine:false
  //   （「够不到」被记成了「自动化不了」）。故：先照常登录拿到会话，再**直达**目标路径；
  //   独立页没有 `button[role="tab"]`，`ensureFlow` 会跳过切 tab。
  if (targetPath) {
    await page.goto(`${base}${targetPath}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
  }
  return page;
}

async function openTab(page, label) {
  await page.evaluate((l) => {
    [...document.querySelectorAll('button[role="tab"]')].find((x) => x.textContent.includes(l))?.click();
  }, label);
  await page.waitForTimeout(1000);
}

/**
 * 载体探针（**可见性与文本的单一源**）：既判「用户能否看到并操作该字段的载体」，也取该载体的文本。
 * 载体友好判定：允许「原生控件被视觉隐藏但可见容器在」的两种统一改造——
 *   · select.input-flat 由 custom-select 增强：原生 select 加 .cs-native 被 clip 隐藏，
 *     可见载体是 .cs-select 内的 .cs-trigger（唯一源 components/custom-select.js）；
 *   · checkbox/radio 以 .hidden 藏于可见 label（chip）内：可见载体即该 label。
 * 判定的仍是「用户能否看到并操作该字段的载体」，不改变「报必填而载体不在位＝违规」的判据。
 * ⚠ 两阶段**共用本函数**：2026-09-16 阶段二初版另写了一份只量 rect 的弱判据，真机立刻误报
 *   「载体不可见：#weekly-week」（它是被 clip 成 1×1 的 .cs-native，可见的其实是 .cs-trigger）——
 *   同一判据写两遍＝第二套口径，必错一边。故收敛到唯一出口。
 */
const CARRIER_PROBE = (sel) => {
  const isVisible = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 2 && r.height > 2 && s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0;
  };
  const proxyOf = (el) => {
    if (isVisible(el)) return el;
    const trigger = el.closest('.cs-select')?.querySelector('.cs-trigger');
    if (isVisible(trigger)) return trigger;
    const label = el.closest('label');
    if (isVisible(label)) return label;
    return null;
  };
  for (const el of document.querySelectorAll(sel)) {
    const proxy = proxyOf(el);
    if (!proxy) continue;
    // 文本取「控件本身（含 select 的 option 文本，＝列表条目在不在）+ 可见载体文本」两者并集
    return { visible: true, text: `${el.textContent || ''} ${proxy.textContent || ''}`.replace(/\s+/g, ' ').trim() };
  }
  return { visible: false, text: '' };
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
  } else if (step.selectOption) {
    // 批次 47-T（2026-09-16）：**按「选项文本特征」选**——「首个非空 option」不够用的场景：
    //   组长台考勤上传的活动下拉里，**已被本人上传过的活动**会在选项文本后缀「 · 已上传」
    //   （`attendance-tab.js` 的 option 模板），而**成功路径必须挑一个尚未上传的活动**
    //   （选已上传的 → `appendAttendanceRecords` 判「已确认记录不可覆盖」→ `新增 0 条` ⇒ 白跑）。
    //   `notText` 即「**避开带这个标记的选项**」；它直接读**产品自己渲染出来的标记**，
    //   不另造一套判据（与「按事实判」同一条纪律）。
    const { selector: oSel, notText, text: oText } = step.selectOption;
    const picked = await page.evaluate(({ s, nt, t }) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const opt = [...el.options].find((o) => o.value
        && (!nt || !String(o.textContent).includes(nt))
        && (!t || String(o.textContent).includes(t)));
      if (!opt) return null;
      el.value = opt.value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return String(opt.textContent).trim();
    }, { s: oSel, nt: notText || '', t: oText || '' });
    if (picked === null) throw new Error(`selectOption 匹配不到符合条件的选项：${oSel}（notText=${notText || '—'} / text=${oText || '—'}）`);
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
  } else if (step.setChecked) {
    // 批次 47-D 续（2026-09-16）：**勾选态**批量设置——补「默认全选 / 默认预勾」这一类形态的解法。
    // `checked:false` 用在同一 open 链里清掉「缺省全选」（党委下发通知的目标支部即为该形态：
    //   不勾任何目标点提交才会报「请选择目标支部」）；`checked:true` 用作 satisfy 让后继分支可达。
    // **故意不派发 change**：这些提交口在点击时直接读 `.checked`，派发 change 反而可能触发重渲染
    //   把状态回填（下发通知的 `_readFormState` 缺省正是「全选」）。
    const { selector: cSel, checked } = step.setChecked;
    const matched = await page.evaluate(({ s, c }) => {
      const els = [...document.querySelectorAll(s)];
      els.forEach((el) => { el.checked = !!c; });
      return els.length;
    }, { s: cSel, c: checked });
    if (matched === 0) throw new Error(`setChecked 匹配不到任何元素：${cSel}`);
    await page.waitForTimeout(150);
  } else if (step.dialogAnswer !== undefined) {
    // 批次 47-Y（2026-09-16）：**原生对话框应答**——`window.prompt` 类校验点（专班「退回补料」，
    //   与 `vote-summary-panel` 同源先例）走的是浏览器**原生 prompt**：不装应答器时 Playwright 会自动
    //   dismiss ⇒ 返回 `null` ⇒ 源码 `reason === null` **直接 return，连「空值分支」都到不了**
    //   （判据永远看不见）——这正是台账原 reason 说「该点不可达」的一半真相。
    //   故须在**触发它的那一步之前**声明应答内容：`answer:''` 打**空值分支**（本批用它拿「请填写退回原因」），
    //   `answer:'某原因'` 可打**成功分支**（留作后继流程复用；写法与 `block-config-ui-e2e` 的
    //   `party.once('dialog', d => d.accept())` 同源）。
    //   ⚠ 一次性应答器：用 `once` 而非 `on`，避免把本流程后续的对话框一并吞掉。
    const answer = String(step.dialogAnswer ?? '');
    page.once('dialog', (d) => d.accept(answer));
    await page.waitForTimeout(120);
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
  } else if (step.goto) {
    // 批次 47-Z（2026-09-17）：**跨页前置链**——有些校验点的前置**不在同一个页面上**。
    //   首个实例：支书台「待办」的「退回原因」——它的前置是「成员变更确认队列里得有一条 pending」，
    //   而该队列是**纯客户端**的（`mockDB.pendingMemberConfirmations` + 自管 localStorage 键；
    //   mock/api 两态都没有服务端表）⇒ 只能**在同一会话内先造出这条请求**（`person.html` 改发展阶段）。
    //   `goto` 指仓库根相对路径（与 `flow.path` 同一口径），`base` 由本文件持有。
    await page.goto(base + step.goto, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
  } else if (step.openTab) {
    // 跳回工作台后要**再切一次 tab**（工作台整页重载后停在默认 tab）。
    //   不与 `openTab` 的初始调用合并：那一次发生在 `open[]` **之前**，此时页面还没被 `goto` 带走。
    await openTab(page, step.openTab);
  } else {
    throw new Error(`未知步骤：${JSON.stringify(step)}`);
  }
}

/** 提示载体：默认全局 toast。**面板内自带状态区**的浮窗（如制度参考的 `#ref-modal-status` /
 *  `#ref-pub-status`）用 `flow.noticeSel` 指定——2026-09-16 首次真机即踩到：制度写入浮窗的校验走
 *  `showStatus()` 写**面板内状态区**，不写 toast，守卫按 toast 读就判成「静默失败」。
 *  **提示载体不同 ≠ 没有提示**；但读错载体同样会把「有提示」误判成「没提示」。 */
const NOTICE_SEL_DEFAULT = '#toast-container';

async function submitFlow(page, flow, override) {
  const sel = flow.noticeSel || NOTICE_SEL_DEFAULT;
  await page.evaluate((s) => { document.querySelector(s)?.replaceChildren(); }, sel);
  for (const s of (override ? [override] : flow.submit)) await runStep(page, s);
}

/** 读取本次提交产生的提示（默认 #toast-container；可指定面板内状态区）；超时无提示返回 ''（＝静默失败候选） */
async function readToast(page, sel = NOTICE_SEL_DEFAULT, timeoutMs = 4000) {
  await page.waitForFunction(
    (s) => (document.querySelector(s)?.textContent || '').trim().length > 0,
    sel,
    { timeout: timeoutMs },
  ).catch(() => {});
  return page.evaluate((s) => (document.querySelector(s)?.textContent || '').replace(/\s+/g, ' ').trim(), sel);
}

/** 打开到目标表单：点 tab → 执行 open 步骤 → 等到「就位标记」；抗负载抖动重试一次
 *  readySel 缺省＝提交口（阶段一）；成功路径传 flow.ready —— 其触发口往往要等填值后才挂载，
 *  不可拿来当「就位」判据（那会白等三次超时）。 */
async function ensureFlow(page, flow, readySel) {
  const first = (flow.submit || flow.act || [])[0] || {};
  const submitSel = readySel || first.click || first.dispatchSubmit;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    // 独立页（`flow.path`）没有 tab 条，跳过切 tab（否则点击静默无效、诊断还会误报「tab 列表为空」）
    if (!flow.path) await openTab(page, flow.tab);
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
    await submitFlow(page, flow, e.submit);
    const toast = await readToast(page, flow.noticeSel);
    if (!toast) { v.push(`静默失败：点提交后既无校验提示也无成功提示（${at}）`); break; }
    // 指定了**面板内状态区**载体时，额外确认它真的可见（该区出厂带 `hidden`，若未摘掉＝用户看不到提示）
    if (flow.noticeSel) {
      const { visible } = await page.evaluate(CARRIER_PROBE, flow.noticeSel);
      if (!visible) v.push(`提示载体不可见：${flow.noticeSel}（面板状态区仍处隐藏态 ⇒ 提示虽写入、用户看不到）（${at}）`);
    }
    if (!toast.includes(e.msg)) {
      v.push(`提示不符：应报「${e.msg}」实测「${toast}」（${at}）`);
      // 提示不符则后续状态不可信，停止该流程
      break;
    }
    const { visible } = await page.evaluate(CARRIER_PROBE, e.carrier);
    if (!visible) v.push(`【载体不在位】报「${e.msg}」但载体「${e.carrier}」不可见/不存在（${at}）`);
    if (e.satisfy) await runStep(page, e.satisfy);
  }
  return v;
}

// ── 第二阶段：成功路径（Q-23-44，2026-09-16）──────────────────────────────
// 与阶段一的分工见 form-loop-registry.mjs 头部：阶段一证「没填对时有没有提示且载体在位」，
// 本阶段证「**填对了之后到底成不成**」。三条判据缺一不可——
//   ① **成功提示**：无提示 ⇒ 静默失败；提示不符 ⇒ 口径不符。二者皆违规。
//   ② **动作真生效**：断言状态被真正改写（逐人下拉值 / 列表新条目），而不是只弹了个 toast。
//      ——「只弹 toast 不办事」正是支书实报那类非闭环最省事的伪装形态。
//   ③ **重载后仍成立**（仅 reload:true 的流程）：整页 reload → 点回同一 tab → 再断言。
//      —— 这一条才是「落库 + 列表刷新」的证据；只断言当场 DOM 变化会**假绿**
//      （内存态改了但没 persist，照样当场看着对）。

/** 从载体文本里读第一个整数（引擎计数文案形如「共 55 人」） */
const firstInt = (t) => {
  const m = String(t).match(/\d+/);
  return m ? Number(m[0]) : null;
};

/** 动作**前**读载体计数，当增量类断言的基线（读不出则返回 null，断言会据实报红而非静默通过） */
async function readCarrierCount(page, carrier) {
  const r = await page.evaluate(CARRIER_PROBE, carrier);
  return r.visible ? firstInt(r.text) : null;
}

/** 单条断言（返回 { ok, detail }）；`base` ＝动作前取的基线（仅 `countUp` 用） */
async function evaluateAssert(page, a, base = {}) {
  if (a.selectValuesAll) {
    const { selector, value, min } = a.selectValuesAll;
    return page.evaluate(({ s, v, n }) => {
      const els = [...document.querySelectorAll(s)];
      const vals = els.map((e) => e.value);
      return {
        ok: els.length >= n && vals.every((x) => x === v),
        detail: `「${s}」匹配 ${els.length} 个（要求 ≥${n}），实测值=[${vals.join(',')}]（期望全为 ${v}）`,
      };
    }, { s: selector, v: value, n: min });
  }
  if (a.countUp != null) {
    // 增量类断言（批次 47-T 立）：**判「涨了多少」，不判「涨到几」**。由来（全量实测，非推测）：
    //   本条流程（考勤上传）原按绝对值写「共 54 人」，**定向跑绿、全量跑红**（实测 55）——
    //   因为该组长本组既有明细条数会**随同批其它流程 / 种子**变动。绝对值不是「事实」，
    //   是「此刻的巧合」；而本流程要证的只是「这次提交真写进了明细表」，故判增量才落在事实上。
    const r = await page.evaluate(CARRIER_PROBE, a.carrier);
    if (!r.visible) return { ok: false, detail: `载体不在位（判据同阶段一）：${a.carrier}` };
    const now = firstInt(r.text);
    const before = base[a.carrier];
    return {
      ok: now !== null && before !== null && now - before >= a.countUp,
      detail: `载体「${a.carrier}」计数未增：要求 ≥ +${a.countUp}，动作前 ${before} → 实测 ${now}（原文：${r.text.slice(0, 80)}）`,
    };
  }
  if (a.text) {
    // 复用阶段一的同一份载体判据（**不另写第二套可见性口径**）
    const r = await page.evaluate(CARRIER_PROBE, a.carrier);
    if (!r.visible) return { ok: false, detail: `载体不在位（判据同阶段一）：${a.carrier}` };
    return {
      ok: r.text.includes(a.text),
      detail: `载体「${a.carrier}」文本不含「${a.text}」（实测：${r.text.slice(0, 160)}）`,
    };
  }
  throw new Error(`未知断言：${JSON.stringify(a)}`);
}

/** 断言带**有界重试**：切 tab 后的内容重渲染与断言之间存在竞态（重载路径尤甚），
 *  首次即断会假红。重试有上界（默认 8s），真不生效仍会红——不掩盖病，只不误报。 */
async function checkAssert(page, a, base = {}) {
  let last = { ok: false, detail: '断言未执行' };
  for (let i = 0; i < 16; i += 1) {
    last = await evaluateAssert(page, a, base);
    if (last.ok) return last;
    await page.waitForTimeout(500);
  }
  return last;
}

/** 切 tab 并**确认真的切过去了**（`tab-btn-active` 在位），失败重试。
 *  为什么需要：整页重载后壳层会异步恢复上次 tab，我们的点击可能被随后的重渲染覆盖 →
 *  表现为「载体在 DOM 里但不可见」（内容渲染了、容器仍是 hidden），看着像产品病，其实是切 tab 没成。 */
async function activateTab(page, label) {
  for (let i = 0; i < 10; i += 1) {
    await openTab(page, label);
    const active = await page.evaluate((l) => {
      const btn = [...document.querySelectorAll('button[role="tab"]')].find((x) => x.textContent.includes(l));
      return !!btn && btn.classList.contains('tab-btn-active');
    }, label);
    if (active) return true;
    await page.waitForTimeout(600);
  }
  return false;
}

/** 成功路径逐条真机断言（返回违规数组；空数组＝通过）
 *  **三段各证一件事，互不替代**：
 *   ① 成功提示 —— 有没有说「成了」；
 *   ② 当场断言 —— 界面**当场**有没有被刷新出新状态（列表出现新条目 / 下拉值被改写）；
 *   ③ 重载后断言（仅 reload 流程）—— 写有没有**真的落库**（②通过≠③通过：内存态改了但没落库照样当场好看）。
 */
async function sweepSuccessFlow(page, flow) {
  const v = [];
  const noticeSel = flow.noticeSel || NOTICE_SEL_DEFAULT;
  for (const s of flow.fill) await runStep(page, s);
  // ⓪a **增量类断言（`countUp`）须先取动作前的基线**——绝对值会随种子与**同批其它流程**漂移
  //   （本条：定向跑「共 54 人」绿、全量跑「共 55 人」红）。基线在**动作之前**读，`reload` 前后共用。
  const base = {};
  for (const a of flow.asserts) {
    if (a.countUp == null) continue;
    base[a.carrier] = await readCarrierCount(page, a.carrier);
  }
  await page.evaluate((s) => { document.querySelector(s)?.replaceChildren(); }, noticeSel);
  for (const s of flow.act) await runStep(page, s);
  // ⓪ 落库窗口（`settleMs`）：多处写口的 `persist()` 是 **fire-and-forget**（`persist(); showToast(...)`
  //   不 await），成功提示**先于**写落地 → 立刻重载会**打断在途写**，于是 ③ 量到的其实是
  //   「写有没有被打断」而不是「写有没有落库」。留窗口不改判据强度，只把测错的对象扳回来。
  //   ⚠ 反向也成立：**产品自身**在「提交后立刻关页/重载」下同样可能丢写——该脆弱性已如实登记
  //   `Q-23-44`，**未擅改产品**（不为了让守卫变绿而改产品，也不为了避开它而删掉 ③）。
  if (flow.settleMs) await page.waitForTimeout(flow.settleMs);
  // ① 成功提示（须在 reload 之前读——重载会清掉 toast 容器）
  // ⚠ 批次 47-S（2026-09-16）：等待窗口**按流程可配**（`flow.toastTimeoutMs`，缺省 4s 同旧行为）。
  //   由来（真机实测，非推测）：组长台「写入活动」一条链要**串行创建 16 个 SOP 任务**
  //   （`MockAdapter` 每个写口固定 600ms 延迟）⇒ 从点提交到弹「创建成功」**约 10s**；
  //   而本函数只等 4s ⇒ 报「静默失败」。**「写得太慢」与「写不成」是两回事**，等待窗口不足
  //   会把前者误判成后者（且方向最坏：会去怀疑产品没写库）。故窗口缺省沿用 4s，长链显式声明。
  const toast = await readToast(page, noticeSel, flow.toastTimeoutMs || 4000);
  if (!toast) v.push(`静默失败：触发动作后无任何提示（既无成功也无失败，需人工确认是否真生效）`);
  else if (!toast.includes(flow.toast)) v.push(`成功提示不符：应含「${flow.toast}」实测「${toast}」`);
  // ② 当场真生效（带重试 → 同时充当「等列表刷新」）
  for (const a of flow.asserts) {
    const r = await checkAssert(page, a, base);
    if (!r.ok) v.push(`动作未真生效（当场）：${r.detail}`);
  }
  // ③ 落库（整页重载是唯一证据）
  if (flow.reload) {
    await page.reload({ waitUntil: 'domcontentloaded' });
    // 批次 47-M（2026-09-16）：**独立页（`docs/*.html`）没有 tab 条**——整页重载后既不该等 tab 渲染，
    //   也不该去「切回 tab」（那会白等 10 轮、再误报一条「重载后无法切回」）。重载本身就停在原 URL
    //   （`?id=` 深链不变），故只需等页面脚本把详情再渲染一次。
    // ⚠ 批次 47-S（2026-09-16）**判据从 `flow.path` 改为 `flow.independent`**：原写法把
    //   「**独立页**」与「**走 `path` 直达**」当成了同一件事，而两者并不等价——
    //   `flow.path` 还可指向**工作台深链**（如 `/workspace/org.html?tab=roster`），那种页**有** tab 条。
    //   一刀切会把「等 tab 渲染 + 切回目标 tab」两步跳掉 ⇒ 断言对象还没渲染就开跑 ⇒ **假红**
    //   （「载体不在位」看着像产品病，其实是守卫自己没等页面就绪）。**同一手段（`path`）对应两种页面形态，
    //   判据必须落在「页面形态」上，不能落在「用了哪个手段到达」上。**
    if (flow.independent) {
      await page.waitForTimeout(2500);
    } else {
      await page.waitForFunction(() => document.querySelectorAll('button[role="tab"]').length > 0, { timeout: 45000 });
      await page.waitForTimeout(1500); // 同 loginAs：等 LOADING→IDLE 重渲染稳定再切 tab
      if (!(await activateTab(page, flow.tab))) v.push(`重载后无法切回「${flow.tab}」：tab 未进入激活态（下列断言结果不可信）`);
    }
    // 批次 47-V（2026-09-16）：`reopen[]`——**「详情面板 / 浮窗」类写口在整页重载后会被收起**
    //   （面板展开状态不落库），此时直接断言只会报「载体不在位」：**看着像产品病，其实是守卫
    //   没把被测对象重新摆好**（与批次 47-S「深链页跳过等 tab 渲染」同一类错，只是换了个面）。
    //   故 `reload` 之后、断言之前，允许显式声明「重新展开」的步骤（形态与 `open[]` 同，共用 runStep）。
    //   ⚠ 这不削弱 ③：重载 + 重新展开后仍能看到那段文本，恰恰证明**它来自落库数据**，
    //   而不是重载前残留在 DOM 里的旧节点（DOM 已被整页替换）。
    if (Array.isArray(flow.reopen)) {
      for (const s of flow.reopen) await runStep(page, s);
      await page.waitForTimeout(500);
    }
    for (const a of flow.asserts) {
      const r = await checkAssert(page, a, base);
      if (!r.ok) v.push(`重载后不成立（写未落库 / 列表未刷新）：${r.detail}`);
    }
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

test('S5 成功路径清单（Q-23-44）不得静默缩水，且每条字段齐备（防「登记了一半就跑」）', () => {
  const gaps = SUCCESS_FLOWS.filter((f) => f.knownGap);
  console.log(`[成功路径] SUCCESS_FLOWS=${SUCCESS_FLOWS.length}（基线 ${SUCCESS_FLOWS_BASELINE}） knownGap=${gaps.length}（基线 ${SUCCESS_FLOWS_KNOWN_GAP}）`);
  assert.ok(SUCCESS_FLOWS.length >= SUCCESS_FLOWS_BASELINE,
    `成功路径流程 ${SUCCESS_FLOWS.length} 少于基线 ${SUCCESS_FLOWS_BASELINE}（如因重构而减少须在同提交显式更新基线并说明）`);
  // 白名单**只减不增**（形态与阶段一 `machine:false` 同源）：既防「偷偷多挂一条不跑」，
  // 也防「补好了却忘了下调基线」（补上后条目数不变而白名单少 1 ⇒ 基线不匹配即红，逼同批对齐）。
  assert.equal(gaps.length, SUCCESS_FLOWS_KNOWN_GAP,
    `成功路径白名单（knownGap）实为 ${gaps.length} 条、基线 ${SUCCESS_FLOWS_KNOWN_GAP} 条（补上一处须同批下调基线）`);
  // 白名单必带 reason（防白名单变垃圾桶，同 S1）
  assert.deepEqual(gaps.filter((f) => !(f.knownGap && f.knownGap.trim())).map((f) => f.id), [],
    'knownGap 必须写明原因（「暂时证不了」与「懒得证」必须可分）');
  const ids = SUCCESS_FLOWS.map((f) => f.id);
  assert.equal(new Set(ids).size, ids.length, `成功路径流程 id 重复：${ids.join(', ')}`);
  const bad = [];
  for (const f of SUCCESS_FLOWS) {
    // ready 必填：没有它，ensureFlow 只能拿「填值后才挂载的触发口」当就位判据 → 必然白等三次超时。
    if (!f.ready) bad.push(`${f.id}：缺 ready（就位标记）`);
    if (!Array.isArray(f.open)) bad.push(`${f.id}：缺 open[]`);
    // ⚠ 批次 47-S（2026-09-16）**判据收紧为「有没有声明」而不是「有几条」**：`open: []` 是**合法声明**
    //   （表单出厂即在位、无需任何前置点击，如党委台下发通知 / 成员台思想汇报），
    //   原写法把「空数组」与「字段缺失」混为一谈 ⇒ 逼作者为凑长度写一个空转步骤。
    //   **要防的是「登记了一半就跑」（漏声明），不是「这个表单不需要前置」。**
    if (!Array.isArray(f.fill) || f.fill.length === 0) bad.push(`${f.id}：缺 fill[]（成功路径必须真填合法值）`);
    if (!Array.isArray(f.act) || f.act.length === 0) bad.push(`${f.id}：缺 act[]`);
    if (!(f.toast && f.toast.trim())) bad.push(`${f.id}：缺 toast（成功提示子串）——无它则无从判定是否真成功`);
    if (!Array.isArray(f.asserts) || f.asserts.length === 0) bad.push(`${f.id}：缺 asserts[]（只弹 toast 不办事＝未闭环，必须有「真生效」断言）`);
    if (!ACCOUNTS[f.page]) bad.push(`${f.id}：page「${f.page}」无对应演示账号`);
    // 批次 47-S（2026-09-16）：**`path` 有两种页面形态**（独立页 `docs/*.html` / 工作台深链
    //   `/workspace/x.html?tab=y`），而 ③ 重载路径必须据此分流（独立页无 tab 条、深链页有）。
    //   故凡 `path` + `reload` 者**必须显式声明** `independent`——不给默认值，就是逼作者做一次判断，
    //   防「照抄上一条」把独立页的跳引继承到深链页上（那条路只会得到假红）。
    if (f.path && f.reload && typeof f.independent !== 'boolean') {
      bad.push(`${f.id}：带 path + reload 却未声明 independent（独立页 docs/*.html 写 true；工作台深链写 false）`);
    }
  }
  assert.deepEqual(bad, [], `成功路径流程登记不完整：\n${bad.join('\n')}`);
  // 断言**标记文本不得互相包含**（批次 47-U 立）：同一套真机流程共用一个服务端数据面，
  //   若 A 流程写入的标记是 B 流程断言标记的**子串**，则 **A 一旦真写入，B 的断言就会被顶替成立**
  //   ——两条流程的判据互相冒充，红变绿而无人知晓（同「有成功提示 ≠ 动作生效」的邻居）。
  //   ⚠ 只查 `text` 型断言的标记；`countUp` / `selectValuesAll` 不含字面语料，天然免疫。
  const marks = SUCCESS_FLOWS.flatMap((f) => (f.asserts || [])
    .filter((a) => a.text)
    .map((a) => ({ id: f.id, text: a.text })));
  const dup = [];
  for (const a of marks) {
    for (const b of marks) {
      if (a === b) continue;
      if (a.text !== b.text && b.text.includes(a.text)) dup.push(`${a.id} 的标记「${a.text}」是 ${b.id} 标记「${b.text}」的子串`);
    }
  }
  assert.deepEqual([...new Set(dup)], [], `成功路径断言标记互相包含（会互相冒充成立）：\n${[...new Set(dup)].join('\n')}`);
});

/** 真机闭环普查（逐流程）────────────────────────────────────────────── */

/** 未捕获脚本错误（`pageerror`）——**第三类判据，2026-09-16 批次 47-M 新增**。
 *  为什么必须有它：前两类判据都从「提示文本」出发，而**有些病灶根本不产出文本**——
 *  批 47-M 真机抓到：`services/issues.js` 用了 11 次 `showToast(...)` 却从未 import 它，
 *  运行到这些行一律抛 `ReferenceError: showToast is not defined`。于是：
 *    · 校验失败那几处**抛在 return 之前** ⇒ 点提交后「既无提示也无反应」，看着像死按钮；
 *    · 成功那几处**抛在写之后** ⇒ 数据已落库、界面一声不吭，用户以为没生效而重复提交。
 *  两类判据都只会报「静默失败」——**而这个「静默」的成因完全查不出来**（读代码得顺藤摸到模块头部）。
 *  `pageerror` 直接把成因摆在眼前 ⇒ 这类病灶从此**一律红灯**，不必再靠人去猜为什么静默。
 *  ⚠ 只算 `pageerror`（真·未捕获异常），**不含** console 噪声与资源加载失败（字体被 abort 是普查故意为之）。 */
function uncaughtErrors(page) {
  return (page.__errs || []).filter((m) => /ReferenceError|TypeError|is not a function|is not defined|Cannot read/.test(m));
}

for (const flow of MACHINE_FLOWS) {
  test(`真机闭环 · ${flow.page}/${flow.tab}（${flow.id}）：空必填点提交须报可见提示且载体在位`, async () => {
    const page = await loginAs(ACCOUNTS[flow.page], flow.page, flow.path);
    try {
      await ensureFlow(page, flow);
      const violations = await sweepFlow(page, flow);
      const errs = uncaughtErrors(page);
      if (errs.length) violations.push(`真机跑该流程时抛出未捕获脚本错误（这类错误往往就是「静默」的成因）：\n      ${errs.join('\n      ')}`);
      assert.deepEqual(violations, [], `${flow.id} 表单闭环普查不通过：\n${violations.map((x) => '  - ' + x).join('\n')}`);
    } finally {
      await page.close();
    }
  });
}

// ── 真机成功路径普查（逐流程，Q-23-44）─────────────────────────────────

for (const flow of SUCCESS_FLOWS) {
  test(`真机成功路径 · ${flow.page}/${flow.tab}（${flow.id}）：填对→触发→须成功提示且动作真生效${flow.reload ? '（含整页重载·落库）' : ''}`, async () => {
    // 白名单流程（已坐实的产品缺口）：**跳过执行**，但把缺口大声打出来——
    // 与阶段一 `machine:false` 同规：白名单是「登记」，不是「隐藏」。
    if (flow.knownGap) {
      console.log(`[已知缺口·不执行] ${flow.id}：${flow.knownGap}`);
      return;
    }
    // 批次 47-M（2026-09-16）：补传 `flow.path`——**独立页的成功路径流程也要直达**
    //   （原实现只走 `workspace/<page>.html`，本阶段首次出现独立页流程，不传就停在错误的页面上白等超时）。
    const page = await loginAs(ACCOUNTS[flow.page], flow.page, flow.path);
    try {
      await ensureFlow(page, flow, flow.ready);
      const violations = await sweepSuccessFlow(page, flow);
      const errs = uncaughtErrors(page);
      if (errs.length) violations.push(`真机跑该成功路径时抛出未捕获脚本错误：\n      ${errs.join('\n      ')}`);
      assert.deepEqual(violations, [], `${flow.id} 成功路径普查不通过：\n${violations.map((x) => '  - ' + x).join('\n')}`);
    } finally {
      await page.close();
    }
  });
}
