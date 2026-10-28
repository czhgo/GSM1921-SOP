// role: [工程师]+[AI]
// frontend-foundations-guard.test.mjs — 表单 / 错误文案 / nudge 基础设施守卫（batch 2B，2026-10-19）
//
// 覆盖四类「地基」改动（逐条对应本轮审计条目）：
//   F1 label for/id（R4-F05/B06/D08）：四个重点表单的 label 必须指向控件 id；
//      openFormModal 自动生成 `${id}-${key}` 并双向关联。
//   F2 必填与字段错误（R4-F05）：required / aria-required 落到控件；提交失败渲染
//      data-field-error 行、aria-invalid / aria-describedby，并聚焦首个错误字段。
//   F3 错误文案分流（R4-F09/B05/B08）：describeWriteError 按状态码给业务语言，界面不出现 HTTP 数字。
//   F4 nudge 动词（R3-F07）：每个 nudge 场景都有 verb，标题用「本步一般由{who}{verb}」。
//   F5 浮窗退出（R3-D06）：closeModal 150ms 淡出（reduced-motion 为 0），inert / 焦点立即回还。
//   F6 活动详情（R3-D07）：不再出现原生 confirm / prompt / alert。
// 运行：node --test server/test/frontend-foundations-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describeWriteError } from '../../docs/src/core/base/utils.js?v=20261028d';
import { NUDGE_TEXTS } from '../../docs/src/components/ui/modal.js?v=20261028d';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const MODAL = read('docs/src/components/ui/modal.js');
const REVIEW_TAB = read('docs/src/entries/tabs/disc/review-tab.js');
const CALENDAR_TAB = read('docs/src/entries/tabs/secretary/calendar-tab.js');
const MEMBER_FLOW = read('docs/src/entries/tabs/org/member-flow-tab.js');
const ACTIVITY = read('docs/src/entries/pages/activity-entry.js');
const PARTY_CONFIG = read('docs/src/entries/tabs/party-committee/party-config-tab.js');
const API_ADAPTER = read('docs/src/data/api-adapter.js');

test('F1 label for/id：四个重点表单的 label 与控件 id 成对', () => {
  const forms = [
    ['docs/src/entries/tabs/secretary/calendar-tab.js', CALENDAR_TAB,
      ['wp-title', 'wp-date', 'wp-time', 'wp-location', 'wp-host']],
    ['docs/src/entries/tabs/org/member-flow-tab.js', MEMBER_FLOW,
      ['flow-intake-name', 'flow-intake-student-id', 'flow-intake-enroll-year', 'flow-intake-party-group', 'flow-intake-text']],
    ['docs/src/entries/pages/activity-entry.js', ACTIVITY,
      ['wa-work-name', 'wa-ddl', 'wa-work-description', 'wa-status']],
  ];
  for (const [rel, src, ids] of forms) {
    for (const id of ids) {
      assert.match(src, new RegExp(`for="${id}"`), `${rel} 缺少 label[for="${id}"]`);
      assert.match(src, new RegExp(`id="${id}"`), `${rel} 缺少控件[id="${id}"]`);
    }
  }

  // 批注 / 经验沉淀走 openFormModal：id 与 label for 由组件统一生成
  assert.match(MODAL, /const fieldId = \(key\) => `\$\{id\}-\$\{key\}`/,
    'openFormModal 应生成稳定字段 id `${id}-${key}`');
  assert.match(MODAL, /<label for="\$\{escHtml\(fid\)\}"/,
    'openFormModal 的 label 应用 for 指向生成 id');
  assert.match(MODAL, /id="\$\{escHtml\(fid\)\}"/,
    'openFormModal 的控件应有对应 id');
  assert.match(REVIEW_TAB, /openFormModal\(/g, '批注 / 经验沉淀应走 openFormModal');
});

test('F2 必填与字段错误：required/aria-required + 错误行 + aria 关联 + 聚焦首错', () => {
  assert.match(MODAL, /required aria-required="true"/,
    'openFormModal 应把 required / aria-required 落到控件');
  assert.match(MODAL, /data-field-error=/,
    'openFormModal 应渲染字段错误行（data-field-error）');
  assert.match(MODAL, /aria-invalid/,
    '字段错误时应设置 aria-invalid');
  assert.match(MODAL, /aria-describedby/,
    '字段错误行应以 aria-describedby 关联控件');
  assert.match(MODAL, /firstControl\?\.focus\(\)/,
    '提交失败应聚焦首个错误字段');
  assert.match(MODAL, /result && result\.ok === false/,
    'onSubmit 应支持 {ok:false, errors} 返回');
});

test('F3 describeWriteError：按状态码分流且界面不出现 HTTP 数字', () => {
  const cases = [
    [{ status: 401 }, '登录已过期，请重新登录'],
    [{ status: 403 }, '当前账号无权办理'],
    [{ status: 403, body: { error: '仅支书可办理' } }, '当前账号无权办理：仅支书可办理'],
    [{ status: 404 }, '记录不存在或已删除'],
    [{ status: 409 }, '已被他人更新，请刷新后重试'],
    [{ status: 428 }, '页面版本过旧，请刷新'],
    [{ status: 408 }, '服务暂时不可用，请稍后重试'],
    [{ status: 500 }, '服务暂时不可用，请稍后重试'],
    [{ status: 503 }, '服务暂时不可用，请稍后重试'],
    [{ type: 'NetworkError' }, '网络异常，请检查连接'],
    [{ name: 'TypeError', message: 'Failed to fetch' }, '网络异常，请检查连接'],
    [{ status: 400, body: { error: '活动名称不能为空' } }, '活动名称不能为空'],
  ];
  for (const [err, expected] of cases) {
    const msg = describeWriteError(err);
    assert.equal(msg, expected, `describeWriteError(${JSON.stringify(err)}) 文案不符`);
    assert.doesNotMatch(msg, /\b[45]\d{2}\b/, `错误文案不得出现 HTTP 状态数字：${msg}`);
  }
  assert.doesNotMatch(describeWriteError({ status: 403, message: 'API 请求失败: 403 Forbidden' }),
    /403|HTTP|API/, '403 的兜底文案不得泄露状态码或原始异常');
});

test('F4 API / 调用点：服务端 body.error 优先，party-config / calendar 走统一文案', () => {
  assert.match(API_ADAPTER, /const serverError = body && typeof body\.error === 'string'/,
    '_request 应优先读取服务端 body.error');
  assert.match(API_ADAPTER, /new Error\(serverError \|\|/, '_request 应优先用 body.error 作 message');
  assert.match(API_ADAPTER, /error\.body = body;/, '_request 应保留结构化 body');
  assert.match(API_ADAPTER, /error\.status = response\.status;/, '_request 应保留 status');

  assert.match(PARTY_CONFIG, /describeWriteError/, 'party-config-tab 应使用 describeWriteError');
  assert.doesNotMatch(PARTY_CONFIG, /HTTP \$\{resp\.status\}/,
    'party-config-tab 不应把 HTTP 状态码显示到界面');
  assert.doesNotMatch(PARTY_CONFIG, /String\(e && e\.message/,
    'party-config-tab 不应把原始异常显示到界面');
  assert.match(CALENDAR_TAB, /showToast\('error', describeWriteError\(err\)\)/,
    'calendar-tab 写入失败分支应走 describeWriteError');
});

test('F5 nudge 动词：每个场景都有 verb，标题按「本步一般由{who}{verb}」', () => {
  const verbs = new Set(['写入', '催办', '赋权', '上传']);
  for (const [key, text] of Object.entries(NUDGE_TEXTS)) {
    assert.ok(verbs.has(text.verb), `${key} 的 nudge verb 缺失或不在约定集合：${text.verb}`);
  }
  assert.match(MODAL, /title: `本步一般由\$\{_nudgeEsc\(whoText\)\}\$\{_nudgeEsc\(verbText\)\}`/,
    'confirmNudge 标题应使用 who + verb');
  assert.match(MODAL, /const verbText = text\.verb \|\| '办理'/, 'nudge 应有 verb 兜底');
});

test('F6 表单按钮与浮窗退出：默认「保存」+ 150ms 淡出 + inert/焦点立即回还', () => {
  assert.match(MODAL, /submitLabel = '保存'/, 'openFormModal 默认提交按钮应为「保存」');
  assert.match(REVIEW_TAB, /submitLabel: '保存批注'/, '批注浮窗应显式「保存批注」');
  assert.match(REVIEW_TAB, /submitLabel: '保存经验沉淀'/, '经验沉淀浮窗应显式「保存经验沉淀」');

  assert.match(MODAL, /prefers-reduced-motion: reduce/, 'closeModal 应尊重 reduced-motion');
  assert.match(MODAL, /setTimeout\(\(\) => overlay\.remove\(\), 150\)/,
    'closeModal 应先 150ms 淡出再移除节点');
  assert.match(MODAL, /_releaseInert\(id\)/, 'inert 还原与焦点回还应立即执行');
});

test('F7 活动详情：7 处原生对话框已全部改为 openModal', () => {
  assert.doesNotMatch(ACTIVITY, /window\.(confirm|prompt|alert)\s*\(/,
    'activity-entry 不应再使用 window.confirm / prompt / alert');
  assert.match(ACTIVITY, /_openConfirm\(\{/, '应使用 _openConfirm 二次确认');
  assert.match(ACTIVITY, /_openNotePrompt\(\{/, '复盘要求应使用 _openNotePrompt（textarea 必填）');
  assert.match(ACTIVITY, /activity-note-input/, '复盘要求应有 textarea');
  assert.match(ACTIVITY, /请写明一句要求内容/, '空值应就地报错');
});

// ════════════════════════════════════════════════════════════════
//  F8 可点容器键盘可达（第九轮 9B-5.3，2026-10-22）
//  规则：承载点击行为的容器要么是原生 `<a>` / `<button>`（浏览器自带键盘与读屏语义），
//        要么在**同一标签内**声明 `role="button"` ＋ `tabindex="0"`
//        （写法同 components/ui/list-row.js 的 master 行），且该文件有 Enter / Space 键处理。
//  覆盖本轮改到的四处点击面：首页统计卡 / 首页活动行 / 归档库条目 / 我的处置行。
// ════════════════════════════════════════════════════════════════
test('F8 可点容器键盘可达：非原生容器必须 role=button + tabindex=0 且文件有 Enter/Space 处理', () => {
  const targets = [
    ['docs/src/components/dashboard/stats.js', ['data-attendance-popover']],
    ['docs/src/components/dashboard/activity-panel.js', ['data-activity-id']],
    // 期望更新（Task 3 · 2026-10-25）：归档库「通知」页签退役，通知条目只存在于消息中心，
    //   本文件只剩活动 / 专班两类归档条目（仍须键盘可达）。
    ['docs/src/entries/pages/archive-entry.js', ['data-archive-item']],
    ['docs/src/components/feedback/issue-dispatch-view.js', [
      'data-mydispatch-action="open"',
      'data-mydispatch-action="open-report"',
      'data-mydispatch-action="open-my-issue"',
    ]],
    // Task 3（2026-10-25）：4 个原 `div` 伪开关升级为原生控件（成员复盘 / 组长复盘 / 组内复盘 / 动态高级筛选）。
    //   前三个行开关改为 `<summary>`（原生可聚焦）；动态高级筛选改走 `components/ui/disclosure.js`
    //   （summary 由组件统一产出，故对组件文件校验）。
    ['docs/src/entries/tabs/visitor/review-tab.js', ['review-toggle']],
    ['docs/src/entries/tabs/leader/review-tab.js', ['review-toggle']],
    ['docs/src/entries/tabs/secretary/group-progress-tab.js', ['gp-review-toggle']],
    ['docs/src/components/ui/disclosure.js', ['disclosure__summary']],
  ];
  const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const [rel, markers] of targets) {
    const src = read(rel);
    let needsKeydown = false;
    for (const marker of markers) {
      const re = new RegExp(`<([a-z][a-z0-9]*)\\b([^>]*${escapeRe(marker)}[^>]*)>`, 'g');
      const tags = [...src.matchAll(re)];
      assert.ok(tags.length > 0, `${rel} 未见 ${marker} 容器（守卫口径失效，须同步标记）`);
      for (const [, tag, attrs] of tags) {
        // 原生可聚焦控件：a / button / summary（details 的开合钮）/ details（内部有原生 summary）
        if (tag === 'a' || tag === 'button' || tag === 'summary' || tag === 'details') continue;
        needsKeydown = true;
        assert.match(attrs, /role="button"/, `${rel} 的 <${tag} ${marker}> 缺 role="button"`);
        assert.match(attrs, /tabindex="0"/, `${rel} 的 <${tag} ${marker}> 缺 tabindex="0"`);
      }
    }
    if (needsKeydown) {
      assert.match(src, /addEventListener\('keydown'/, `${rel} 缺 keydown：Enter / Space 与点击不等效`);
      assert.match(src, /e\.key !== 'Enter'[\s\S]{0,140}e\.key !== ' '/,
        `${rel} 的 keydown 应同时接受 Enter 与 Space`);
    }
  }
  // 4 个原 `div` 伪开关必须**已清零**（残留即红）
  const retired = [
    ['docs/src/entries/tabs/visitor/review-tab.js', /<div[^>]*review-toggle/],
    ['docs/src/entries/tabs/leader/review-tab.js', /<div[^>]*review-toggle/],
    ['docs/src/entries/tabs/secretary/group-progress-tab.js', /<div[^>]*gp-review-toggle/],
    ['docs/src/entries/tabs/leader/write-tab.js', /<div[^>]*id="dt-adv-toggle"/],
  ];
  for (const [rel, re] of retired) {
    assert.doesNotMatch(read(rel), re, `${rel} 仍残留 div 伪开关（应改原生 button / summary）`);
  }

  // ── 2026-10-26 Task 5：伪可点断言扩展到「行载体」 ─────────────────────────
  // 规则：`data-interactive="true"` 即「整行可点」，元素必须是原生 <a>/<button>，
  //       否则同标签必须有 role="button" + tabindex="0"，且消费方有 Enter/Space 处理。
  //       （与 V4 的 btn-ghost 白名单配套：行载体保留 btn-ghost，但可点性必须可键盘回读。）
  const LIST_ROW = read('docs/src/components/ui/list-row.js');
  const interactiveTags = [...LIST_ROW.matchAll(/<([a-z][a-z0-9]*)\b([^>]*data-interactive="true"[^>]*)>/g)];
  assert.ok(interactiveTags.length >= 4,
    `list-row.js 只解析到 ${interactiveTags.length} 个 data-interactive 载体（下限 4）：伪可点断言扫描面被写坏`);
  for (const [, tag, attrs] of interactiveTags) {
    if (tag === 'a' || tag === 'button') continue;
    assert.match(attrs, /role="button"/, `list-row.js 的 <${tag} data-interactive> 缺 role="button"`);
    assert.match(attrs, /tabindex="0"/, `list-row.js 的 <${tag} data-interactive> 缺 tabindex="0"`);
  }
  // 主从行（div 承载整行选中）必须有键盘等价处理：Enter 与 Space 都要接受。
  assert.match(read('docs/src/components/record/todo-list.js'),
    /addEventListener\('keydown'[\s\S]{0,160}(e\.key !== 'Enter'[\s\S]{0,80}e\.key !== ' '|e\.key === 'Enter'[\s\S]{0,120}e\.key === ' ')/,
    '主从行的 Enter/Space 键盘处理缺失（div 整行可点但键盘不可达）');
  // 行载体的可见 hover 必须同时存在（不靠 cursor:pointer 假装可点）。
  assert.match(read('docs/src/styles.css'),
    /\.list-row\[data-interactive="true"\]:hover\s*\{[^}]*background-color:\s*var\(--surface-hover\)/,
    '可点行缺可见 hover（底）');
});

// ════════════════════════════════════════════════════════════════
//  F9 写口失败不得提示成功（第九轮 9B-5.1 / 5.2，2026-10-22）
//  规则：发布 / 上报这类「提交即离手」的写口，必须先判返回值或捕获异常；
//        失败走原位 `role="alert"` ＋ 重试，**不得**先弹成功 toast。
//  判据用「顺序」而非「是否存在」：成功 toast 必须排在失败分支之后。
// ════════════════════════════════════════════════════════════════
test('F9 写口失败不得提示成功：先判返回值/捕获异常，成功 toast 在失败分支之后', () => {
  const NOTICE = read('docs/src/entries/tabs/secretary/notification-tab.js');
  const REPORT = read('docs/src/entries/tabs/secretary/report-up-tab.js');

  // 通知发布：NoticeStore.add 的返回值必须被接住，null ⇒ 原位报错并 return
  assert.match(NOTICE, /created\s*=\s*NoticeStore\.add\(/, '发布必须接住 NoticeStore.add 的返回值');
  assert.match(NOTICE, /if\s*\(!created\)\s*\{[\s\S]{0,160}return;/, '返回空值时须报错并中止，不得继续报成功');
  assert.match(NOTICE, /data-notif-publish-error role="alert"/, '发布失败须原位 role="alert"');
  assert.match(NOTICE, /data-notif-retry/, '发布失败须给重试入口');
  const noticeFail = NOTICE.indexOf("_renderPublishError('通知未发出");
  const noticeOk = NOTICE.indexOf("showToast('success', `通知「${title}」已发布");
  assert.ok(noticeFail > 0 && noticeOk > noticeFail,
    '成功 toast 必须排在失败分支之后（否则失败仍会先报成功）');

  // 上报党委：提交中禁用 + try/catch + 失败保留表单并原位报错
  assert.match(REPORT, /btn\.disabled\s*=\s*true/, '提交中须禁用按钮（防重复提交）');
  assert.match(REPORT, /catch\s*\(error\)/, '上报失败须捕获异常');
  assert.match(REPORT, /data-rq-error role="alert"/, '上报失败须原位 role="alert"');
  assert.match(REPORT, /data-rq-retry/, '上报失败须给重试入口');
  const reportCatch = REPORT.indexOf('catch (error)');
  const reportOk = REPORT.indexOf("showToast('success'");
  assert.ok(reportCatch > 0 && reportOk > reportCatch,
    '成功 toast 必须排在 catch 之后（否则失败仍会先报成功）');
});

// ════════════════════════════════════════════════════════════════
//  F10 日历默认月份＝当前自然月（2026-10-28 硬编码审计）
//  判据：`getInitialMonth()` 只读 URL；默认月由 `_currentYearMonth(now)` 派生
//        （`state.displayMonth` 缺省值 → `populateMonthSelector` 的「跟随当月」分支）。
//  注入 now：只用**两个不同 now** 跑同一份活动数据，默认月必须随之变化；
//        并断言初始月链路里没有写死的 `20YY-MM` 字面量。
// ════════════════════════════════════════════════════════════════
test('F10 日历默认月份由 now 派生：now=2026-10 / 2026-11 两个取值默认月随之变化', async () => {
  const { populateMonthSelector } = await import('../../docs/src/components/record/calendar.js?v=20261028d');
  const ACTS = [
    { id: 'a1', date: '2026-10-05', title: '活动甲' },
    { id: 'a2', date: '2026-11-05', title: '活动乙' },
  ];
  /** 最小 select 桩：只实现 populateMonthSelector 实际用到的接口 */
  const makeSelect = () => {
    const sel = {
      options: [{ value: '' }],
      dataset: {},
      addEventListener() {},
      appendChild(o) { sel.options.push(o); },
      get value() { return sel._value || ''; },
      set value(v) { sel._value = v; },
    };
    Object.defineProperty(sel, 'innerHTML', { set() { sel.options = [{ value: '' }]; sel._value = ''; } });
    return sel;
  };
  const run = (now) => {
    const sel = makeSelect();
    globalThis.document = {
      getElementById: (id) => (id === 'month-selector' ? sel : null),
      createElement: () => ({ value: '', textContent: '' }),
    };
    try { return populateMonthSelector(ACTS, undefined, now); }
    finally { delete globalThis.document; }
  };
  assert.equal(run(new Date(2026, 9, 15)), '2026-10', 'now=2026-10 时默认月应为 2026-10');
  assert.equal(run(new Date(2026, 10, 15)), '2026-11', 'now=2026-11 时默认月应为 2026-11');

  // 不得写死年月：初始月链路（URL 读取 ＋ 默认月推导）剥注释后不得出现 20YY-MM 字面量
  // （CRLF 先归一——否则 `/\/\/.*$/` 会因行尾 `\r` 失配，注释里的日期会被误当代码）
  const stripComments = (s) => String(s).replace(/\r\n?/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
  for (const f of ['docs/src/components/dashboard/activity-panel.js', 'docs/src/components/record/calendar.js']) {
    assert.ok(!/20\d{2}-\d{2}/.test(stripComments(read(f))),
      `${f} 的初始月链路出现写死年月（应全部由 now / 数据派生）`);
  }
});

