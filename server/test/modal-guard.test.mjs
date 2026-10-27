// role: [工程师]+[AI]
// modal-guard.test.mjs — 守卫归并件（2026-10-27 批次 516 · B-515-2）
// 归并来源：modal-contract.test.mjs · modal-escape-guard.test.mjs · ui-modal-form-guard.test.mjs
// 纪律：只减文件数、不减断言数。每个源件包在独立 async 块作用域里（imports 转动态导入），
//   同名 helper / 常量互不冲突；失败信息仍保留各源件的横幅与断言名，便于定位。
// 运行：node --test server/test/modal-guard.test.mjs

// ═══ 源件 1：modal-contract.test.mjs ═══
await (async () => {
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');

  // role: [工程师]+[AI]
  // modal-contract.test.mjs — 弹窗交互闭环契约守卫（2026-10-23 · Task 8 / R11 P0-05 · P1-11 · P1-12）
  //
  // 为什么是静态断言：`docs/src/components/ui/modal.js` 依赖浏览器 DOM，且所有跨模块 import 都带
  //   `?v=` 版本查询串（浏览器缓存用），Node 无法直接解析。故本守卫读取源码做「存在性 / 否定性」断言，
  //   不启动浏览器、不引入 Playwright。
  // 覆盖：
  //   M1 提交中 `_requestCancel` 早退（Esc / 遮罩 / × / [data-modal-cancel] 四路统一挂起）
  //   M2 `setModalBusy` 写 `aria-busy`，且 openFormModal 的 setBusy 调用它
  //   M3 错误区 / 字段错误行带 `role="alert"`
  //   M4 `onSubmit` 只有显式 true / {ok:true} 才关窗（undefined 不关）
  //   M5 三处原生 prompt / confirm 已移除
  // 运行：node --test server/test/modal-contract.test.mjs






  const HERE = dirname(fileURLToPath(import.meta.url));
  const ROOT = join(HERE, '..', '..');
  const MODAL = readFileSync(join(ROOT, 'docs/src/components/ui/modal.js'), 'utf8');

  /** 截取 `function name` / `async function name` / `export function name` 到下一个顶层 export */
  function fnSource(src, name) {
    const start = src.search(new RegExp(`(?:export\\s+)?(?:async\\s+)?function\\s+${name}\\s*\\(`));
    assert.notEqual(start, -1, `找不到函数 ${name}`);
    const next = src.indexOf('\nexport ', start + 1);
    return src.slice(start, next === -1 ? src.length : next);
  }

  test('M1 _requestCancel 在提交中早退（四条关闭路径统一挂起）', () => {
    const src = fnSource(MODAL, '_requestCancel');
    assert.match(src, /_busyIds\.has\(id\)\)\s*return;/, '提交中必须直接 return，不得进入 onCancel/closeModal');
    // 早退必须发生在执行 onCancel 与 closeModal 之前
    const busyIdx = src.indexOf('_busyIds.has(id)');
    const cancelIdx = src.indexOf('_cancelHandlers.get(id)');
    const closeIdx = src.indexOf('closeModal(id)');
    assert.ok(busyIdx !== -1 && cancelIdx !== -1 && closeIdx !== -1, '_requestCancel 结构缺失');
    assert.ok(busyIdx < cancelIdx && busyIdx < closeIdx, '忙态早退必须先于 onCancel / closeModal');
  });

  test('M2 setModalBusy 设置 aria-busy，openFormModal 提交态调用它', () => {
    const src = fnSource(MODAL, 'setModalBusy');
    assert.match(src, /aria-busy/, 'setModalBusy 应设置 aria-busy');
    assert.match(src, /panel\.setAttribute\('aria-busy'/, '面板应标 aria-busy');
    const form = fnSource(MODAL, 'openFormModal');
    assert.match(form, /setModalBusy\(id,\s*busy\)/, 'openFormModal 的提交态应统一走 setModalBusy');
  });

  test('M3 错误区与字段错误行使用 role="alert"', () => {
    assert.match(MODAL, /class="modal-form-error"\s+data-modal-error\s+role="alert"/,
      '通用错误区应带 role="alert"');
    assert.match(MODAL, /data-field-error="\$\{escHtml\(key\)\}"\s+role="alert"/,
      '字段错误行应带 role="alert"');
  });

  test('M4 onSubmit 契约：仅显式 true / {ok:true} 关窗，undefined 不关', () => {
    const helper = fnSource(MODAL, 'shouldCloseOnResult');
    assert.match(helper, /return\s+result\s*===\s*true\s*\|\|\s*\(!!result\s*&&\s*result\.ok\s*===\s*true\);/,
      'shouldCloseOnResult 必须只认 true / {ok:true}');
    const form = fnSource(MODAL, 'openFormModal');
    assert.match(form, /shouldCloseOnResult\(result\)/, 'openFormModal 必须以 shouldCloseOnResult 判定关窗');
    assert.match(form, /result\s*===\s*undefined/, 'undefined 必须走「保留浮窗」分支');
    assert.doesNotMatch(form, /if\s*\(result\s*===\s*false\)\s*\{\s*setBusy\(false\);\s*return;\s*\}[\s\S]{0,200}closeModal\(id\)/,
      '不得再把 false / undefined 当成功关窗');
  });

  test('M5 三处原生 prompt / confirm 已移除并改用统一浮窗', () => {
    const issueDetail = readFileSync(join(ROOT, 'docs/src/components/feedback/issue-detail.js'), 'utf8');
    const feedbackTab = readFileSync(join(ROOT, 'docs/src/entries/tabs/secretary/feedback-tab.js'), 'utf8');
    const reviewTab = readFileSync(join(ROOT, 'docs/src/entries/tabs/disc/review-tab.js'), 'utf8');

    assert.doesNotMatch(issueDetail, /(?<![.\w])prompt\s*\(/, 'issue-detail.js 不得再调用原生 prompt');
    assert.match(issueDetail, /openFormModal\(/, 'issue-detail.js 应改用 openFormModal');
    assert.doesNotMatch(feedbackTab, /(?<![.\w])prompt\s*\(/, 'feedback-tab.js 不得再调用原生 prompt');
    assert.match(feedbackTab, /openFormModal\(/, 'feedback-tab.js 应改用 openFormModal');
    assert.doesNotMatch(reviewTab, /window\.(?:confirm|prompt)\s*\(/, 'review-tab.js 不得再调用原生 confirm/prompt');
    assert.match(reviewTab, /openModal\(/, 'review-tab.js 的二次确认应改用 openModal');
  });

})();

// ═══ 源件 2：modal-escape-guard.test.mjs ═══
await (async () => {
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');

  // role: [工程师]+[AI]
  // modal-escape-guard.test.mjs — 通用浮窗（modal.js）插值转义守卫（R4-F01，2026-10-19）
  //
  // 背景：openModal 的 title、openFormModal 的 label / placeholder / value / option / 错误文本
  //   都可能来自用户输入或服务端数据。任何一处直接拼进 innerHTML 都是存储型 XSS 的入口。
  // 判据：上述「用户数据」插值必须逐项经过 escHtml；内部结构变量（bodyHtml / closeBtnHTML / titleId 等）
  //   属受控模板，不在此列。
  // 非空转：正 / 负样本自检（escHtml(...) 通过；裸 f.label / o.value 必须被识别）。
  // 运行：node --test server/test/modal-escape-guard.test.mjs






  const HERE = dirname(fileURLToPath(import.meta.url));
  const ROOT = join(HERE, '..', '..');
  const MODAL = readFileSync(join(ROOT, 'docs/src/components/ui/modal.js'), 'utf8');

  /** 截取某个导出函数的源码（到下一个顶层 export 为止） */
  function exportSource(name) {
    const start = MODAL.indexOf(`export function ${name}`);
    assert.notEqual(start, -1, `modal.js 中找不到 export function ${name}`);
    const next = MODAL.indexOf('\nexport ', start + 1);
    return MODAL.slice(start, next === -1 ? MODAL.length : next);
  }

  /** 用户数据插值（只认「整段就是一个用户数据引用」的 ${…}，不含表达式 / 函数调用） */
  const USER_EXPR = /^(?:title|f\.label|f\.placeholder|f\.key|o\.label|o\.value|val|submitLabel|settingsLink\.(?:href|text))$/;

  /**
   * 扫描未转义的用户数据插值。
   * `escHtml(f.label)` 的表达式整体是函数调用，不会命中 USER_EXPR ⇒ 视为已转义。
   */
  function unescapedUserInterpolations(src) {
    const out = [];
    for (const m of src.matchAll(/\$\{([^{}]*)\}/g)) {
      const expr = m[1].trim();
      if (USER_EXPR.test(expr)) out.push(expr);
    }
    return out;
  }

  test('M1 非空转自检：escHtml(...) 通过，裸用户数据必须被识别', () => {
    const positive = '<label>${escHtml(f.label)}</label><option value="${escHtml(o.value)}">${escHtml(o.label)}</option>';
    const negative = '<label>${f.label}</label><input value="${val}" placeholder="${f.placeholder}">';
    assert.deepEqual(unescapedUserInterpolations(positive), [],
      '正值样本（全部 escHtml）不应被判为未转义');
    assert.deepEqual(unescapedUserInterpolations(negative), ['f.label', 'val', 'f.placeholder'],
      '负值样本（裸用户数据）应被逐项识别');
  });

  test('M2 openModal：title / settingsLink 以纯文本写入，不解释 HTML', () => {
    const src = exportSource('openModal');
    // 2026-10-20 R3-01：标题改走 textContent（调用方误传 HTML 也只显示原文），不再拼进 innerHTML
    assert.match(src, /titleEl\.textContent\s*=/, 'openModal 标题应以 textContent 写入');
    assert.doesNotMatch(src, /\$\{safeTitle\}/, '标题不得再以 HTML 插值方式渲染');
    assert.deepEqual(unescapedUserInterpolations(src), [],
      `openModal 存在未转义的用户数据插值：${unescapedUserInterpolations(src).join(', ')}`);

    // 页脚「相关设置」深链由 settingsLinkHTML 渲染（openModal 只负责挂载），转义判据落在该函数
    const settings = exportSource('settingsLinkHTML');
    assert.match(settings, /escHtml\(settingsLink\.href\)/, 'settingsLink.href 应转义');
    assert.match(settings, /escHtml\(settingsLink\.text\)/, 'settingsLink.text 应转义');
    assert.doesNotMatch(settings, /href="\$\{settingsLink\.href\}"/, 'settingsLink.href 不得裸插值');
  });

  test('M3 openFormModal：label / placeholder / value / option / 错误文本全部过 escHtml', () => {
    const src = exportSource('openFormModal');
    for (const expr of ['f.label', 'f.placeholder', 'f.key', 'o.label', 'o.value', 'val', 'submitLabel']) {
      assert.match(src, new RegExp(`escHtml\\(${expr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
        `${expr} 应经 escHtml 转义`);
    }
    assert.match(src, /escHtml\(msg\)/, '字段错误文本应经 escHtml 转义');
    assert.deepEqual(unescapedUserInterpolations(src), [],
      `openFormModal 存在未转义的用户数据插值：${unescapedUserInterpolations(src).join(', ')}`);
  });

})();

// ═══ 源件 3：ui-modal-form-guard.test.mjs ═══
await (async () => {
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync, readdirSync, statSync } = await import('node:fs');
  const { join, dirname, relative } = await import('node:path');
  const { fileURLToPath } = await import('node:url');

  // role: [工程师]+[AI]
  // ui-modal-form-guard.test.mjs — 浮窗表单统一体例守卫（2026-10-20 · R3-01/02/09/10）
  //
  // 背景（`.ctx/logs/archive/2026-10/UI_AUDIT_R3.md` 判例②）：
  //   浮窗的问题不在字段多少，而在「动作位置 / 关闭语义 / 移动端」三处——
  //   · R3-01 成员档案标题拼 HTML，被 escHtml 后逐字显示；
  //   · R3-02 取消写入不 reset，`pendingAuth` 残留到下一次写入；
  //   · R3-10 提交按钮写在 `.modal-body` 文末，长表单滚出视口；390px 两列挤压。
  // 判据（本守卫）：
  //   1. modal.js 必须提供 sticky footer / dvh / safe-area / onCancel，标题只走 textContent；
  //   2. 全站 openModal 调用不得在 footerHtml 之外放提交按钮（白名单需写理由）；
  //   3. person-edit-modal 的标题必须是纯文本（链接在 body 内）；
  //   4. 写入活动的取消 / Esc / 遮罩必须清 `wp.pendingAuth`。
  // 非空转：先跑「提取调用 / 判定提交按钮」的自检，防止解析写坏后恒绿。
  // 运行：node --test server/test/ui-modal-form-guard.test.mjs






  const HERE = dirname(fileURLToPath(import.meta.url));
  const ROOT = join(HERE, '..', '..');
  const SRC = join(ROOT, 'docs', 'src');
  const MODAL = readFileSync(join(SRC, 'components/ui/modal.js'), 'utf8');
  const CSS = readFileSync(join(SRC, 'styles.css'), 'utf8');

  const read = (rel) => readFileSync(join(SRC, rel), 'utf8');

  /** 递归列出 docs/src 下全部 .js（跳过生成物 / 第三方） */
  function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p, out);
      else if (name.endsWith('.js')) out.push(p);
    }
    return out;
  }

  /**
   * 从 `openModal(` 起点截取完整调用（括号配平；跳过字符串 / 模板串）。
   * 为什么要自己配平：bodyHtml 里全是模板串与花括号，正则截不准。
   */
  function extractCall(src, startIdx) {
    const open = src.indexOf('(', startIdx);
    if (open === -1) return '';
    let depth = 0;
    let quote = null;
    for (let i = open; i < src.length; i += 1) {
      const c = src[i];
      if (quote) {
        if (c === '\\') { i += 1; continue; }
        if (c === quote) quote = null;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
      if (c === '(') depth += 1;
      else if (c === ')') {
        depth -= 1;
        if (depth === 0) return src.slice(startIdx, i + 1);
      }
    }
    return src.slice(startIdx);
  }

  /** 提交类按钮的标记（openFormModal 的 footer 用 data-modal-submit；写入活动用 data-action） */
  const SUBMIT_MARK = /type="submit"|data-action="wp-submit"|data-modal-submit=/;

  /** 判定一个 openModal 调用是否把提交按钮写在了 footer 之外 */
  function submitOutsideFooter(callText) {
    const submitIdx = callText.search(SUBMIT_MARK);
    if (submitIdx === -1) return false;
    const footerIdx = callText.indexOf('footerHtml');
    return footerIdx === -1 || submitIdx < footerIdx;
  }

  // 白名单：{ 文件相对路径: 理由 }。当前无例外——新增例外必须在这里写明「为什么不能进 footer」。
  const SUBMIT_OUTSIDE_FOOTER_WHITELIST = {};

  /**
   * 非对话框固定层白名单（G6）：仅限「全屏但不承载表单 / 不是对话框」的层，每条必须写理由。
   * 对话框（表单、确认、详情）一律不得自建 —— 自建即绕开 role/aria-modal/inert/焦点回还/关闭语义。
   */
  const FIXED_LAYER_WHITELIST = {
    'data/data-adapter.js': '连接失败 / 会话失效的全屏拦截层（role=alert，非表单、单动作）；data 层不反向依赖组件层',
  };

  /** 该源码是否自建了「全屏固定层」（`position:fixed` 与 `inset:0` 同现，或 Tailwind `fixed inset-0`） */
  function hasFixedOverlay(src) {
    if (/['"`]fixed inset-0/.test(src)) return true;
    let idx = src.indexOf('position:fixed');
    while (idx !== -1) {
      const win = src.slice(Math.max(0, idx - 200), idx + 300);
      if (/inset:\s*0/.test(win)) return true;
      idx = src.indexOf('position:fixed', idx + 1);
    }
    return false;
  }


  test('G1 非空转自检：能截取调用，且能识别 body 内 / footer 内的提交按钮', () => {
    const src = [
      'openModal({ id: "a", bodyHtml: `<button type="submit">保存</button>` });',
      'openModal({ id: "b", bodyHtml: `<p>x</p>`, footerHtml: `<button type="submit">保存</button>` });',
    ].join('\n');
    const a = extractCall(src, src.indexOf('openModal'));
    const b = extractCall(src, src.indexOf('openModal', src.indexOf('openModal') + 1));
    assert.match(a, /bodyHtml/);
    assert.equal(submitOutsideFooter(a), true, 'body 内的提交按钮应被判为违规');
    assert.equal(submitOutsideFooter(b), false, 'footer 内的提交按钮不应被判为违规');
  });

  test('G2 modal.js：header 纯文本 / sticky footer / dvh / safe-area / onCancel 齐备', () => {
    assert.match(MODAL, /export function openModal\(/, 'openModal 应保留统一入口');
    assert.match(MODAL, /footerHtml = ''/, 'openModal 应提供 footerHtml');
    assert.match(MODAL, /footerSticky = true/, '页脚应默认 sticky（调用方不必重复写）');
    assert.match(MODAL, /onCancel = null/, 'openModal 应提供 onCancel');
    assert.match(MODAL, /_requestCancel\(id\)/, 'Esc / 遮罩 / × 应走统一取消入口');
    assert.match(MODAL, /class="modal-footer\$?\{?/, '页脚应由统一类名渲染');
    assert.match(MODAL, /titleEl\.textContent\s*=/, '标题必须用 textContent 写入（禁止 HTML）');
    assert.doesNotMatch(MODAL, /<h3[^>]*>\$\{/, '标题不得直接以 HTML 插值');

    // CSS：高度 dvh（软键盘不遮底）、footer sticky、safe-area、≤640px 单列
    const panelRule = CSS.match(/\.modal-panel\s*\{[\s\S]*?\}/)?.[0] || '';
    assert.match(panelRule, /max-height:\s*min\(92dvh/, '浮窗高度应用 min(92dvh, …)');
    const footerRule = CSS.match(/\.modal-footer--sticky\s*\{[\s\S]*?\}/)?.[0] || '';
    assert.match(footerRule, /position:\s*sticky/, 'footer 必须 sticky');
    assert.match(footerRule, /env\(safe-area-inset-bottom/, 'footer 必须支持 safe-area');
    const mobile = CSS.slice(CSS.indexOf('@media (max-width: 640px)'));
    assert.match(mobile, /\.modal-form-grid\s*\{[\s\S]*?grid-template-columns:\s*1fr/, '≤640px 表单应单列');
  });

  test('G3 全站 openModal：提交按钮不得在 footerHtml 之外（白名单须写理由）', () => {
    const violations = [];
    let calls = 0;
    let footerCalls = 0;
    for (const file of walk(SRC)) {
      const src = readFileSync(file, 'utf8');
      let idx = src.indexOf('openModal(');
      while (idx !== -1) {
        // 跳过定义处 `export function openModal(`
        if (!/function\s+$/.test(src.slice(Math.max(0, idx - 24), idx))) {
          calls += 1;
          const call = extractCall(src, idx);
          if (call.includes('footerHtml')) footerCalls += 1;
          if (submitOutsideFooter(call)) {
            const rel = relative(ROOT, file).replace(/\\/g, '/');
            if (!SUBMIT_OUTSIDE_FOOTER_WHITELIST[rel]) violations.push(rel);
          }
        }
        idx = src.indexOf('openModal(', idx + 1);
      }
    }
    assert.ok(calls >= 20, `openModal 调用盘点面不足（${calls}），解析可能写坏`);
    assert.ok(footerCalls >= 15, `采用统一 footer 的调用面不足（${footerCalls}），体例未铺开`);
    assert.deepEqual([...new Set(violations)], [],
      `以下 openModal 调用把提交按钮放在 footer 之外：${[...new Set(violations)].join(', ')}`);
  });

  test('G4 成员档案浮窗：标题纯文本，完整档案入口在 body 内', () => {
    const src = read('components/governance/person-edit-modal.js');
    const title = src.match(/title:\s*`([^`]*)`/)?.[1] ?? '';
    assert.ok(title, 'person-edit-modal 应有 title');
    assert.doesNotMatch(title, /<[a-z/]/i, 'R3-01：标题不得拼 HTML 标签');
    assert.match(src, /data-person-archive-link/, '「查看完整档案」应作为 body 内按钮');
    assert.match(src, /data-modal-submit="\$\{MODAL_ID\}"/, '保存按钮应在统一 footer');
    // 只读区去重：非 selfOnly 时只保留不可改的 3 项（角色 / 支部 / 留痕）
    assert.match(src, /selfOnly \? readonlyAll : \[/, '只读区应按 selfOnly 分流');
  });

  test('G5 写入活动：取消 / Esc / 遮罩都清 pendingAuth', () => {
    const cal = read('entries/tabs/secretary/calendar-tab.js');
    const dt = read('services/activity/decision-tree.js');
    assert.match(cal, /onCancel:\s*_resetWriteState/, 'openModal 应挂 onCancel');
    assert.match(cal, /function _resetWriteState\(\)\s*\{[\s\S]*?wp\.reset\(\)/, '_resetWriteState 应调用 wp.reset()');
    assert.match(cal, /case 'wp-cancel'[\s\S]*?_resetWriteState\(\)/, '取消按钮应清临时状态');
    const resetBody = dt.match(/reset\(\)\s*\{[\s\S]*?\n\s*\}/)?.[0] || '';
    assert.match(resetBody, /this\.pendingAuth\s*=\s*\[\]/, 'DecisionTreeState.reset 应清 pendingAuth');
  });

  test('G6 非空转：hasFixedOverlay 能识别自建全屏层，且不误报普通 fixed 定位', () => {
    assert.equal(hasFixedOverlay("el.style.cssText='position:fixed;inset:0;z-index:9';"), true);
    assert.equal(hasFixedOverlay("['position:fixed', 'inset:0'].join(';')"), true);
    assert.equal(hasFixedOverlay('<div class="fixed inset-0 bg-black/40"></div>'), true);
    assert.equal(hasFixedOverlay("el.style.cssText='position:fixed;z-index:10;bottom:1rem';"), false);
  });

  test('G7 浮层唯一实现：对话框不得自建全屏固定层（白名单须写理由）', () => {
    const violations = [];
    for (const file of walk(SRC)) {
      const rel = relative(SRC, file).replace(/\\/g, '/');
      if (rel === 'components/ui/modal.js') continue; // 唯一实现本体
      const src = readFileSync(file, 'utf8');
      if (hasFixedOverlay(src) && !FIXED_LAYER_WHITELIST[rel]) violations.push(rel);
    }
    assert.deepEqual(violations, [],
      `以下文件自建了全屏浮层（绕开 role/aria-modal/inert/焦点回还），应改走 openModal：${violations.join(', ')}`);
  });

  test('G8 R3-25：六处 settingsLink 统一短文案，modal 做长度归一 / 兜底', () => {
    // 6 个调用点（与 R3-25 清单同源）：全部只传「制度参数 →」，完整口径在 help。
    const callers = [
      'entries/tabs/leader/write-tab.js',
      'entries/tabs/disc/review-tab.js',
      'entries/tabs/org/member-flow-tab.js',
      'entries/tabs/visitor/attendance-tab.js',
      'entries/tabs/prop/archive-tab.js',
      'entries/tabs/secretary/calendar-tab.js',
    ];
    for (const file of callers) {
      assert.match(read(file), /settingsLink:\s*\{[^\n]*text:\s*'制度参数 →'/, `${file} 的 settingsLink 文案须归一为「制度参数 →」`);
    }
    // 组件层兜底：缺省 / 过长一律回落短文案，且不得再写「相关设置：」长前缀。
    assert.match(MODAL, /SETTINGS_LINK_TEXT = '制度参数 →'/, 'modal.js 须声明统一短文案');
    assert.match(MODAL, /raw && raw\.length <= 12/, 'modal.js 须对调用方文案做长度归一');
    assert.doesNotMatch(MODAL, /相关设置：/, '页脚不得再带「相关设置：」前缀');
  });

  // ════════════════════════════════════════════════════════════════
  //  R5A-07/08（2026-10-21）：删除确认与归档推进都走统一浮窗
  // ════════════════════════════════════════════════════════════════
  test('G9 通知删除：先 openModal 二次确认，确认后才 NoticeStore.remove（并说明联动删除待办）', () => {
    const src = read('entries/tabs/secretary/notification-tab.js');
    assert.match(src, /function _confirmDeleteNotice\(noticeId\)/, '缺删除确认入口');
    assert.match(src, /_confirmDeleteNotice[\s\S]{0,800}openModal\(\{/, '删除确认须复用统一浮窗 openModal');
    assert.match(src, /openModal\(\{[\s\S]{0,1500}NoticeStore\.remove\(noticeId,\s*'secretary'\)/,
      'NoticeStore.remove 只应在确认浮窗的确认回调里执行');
    assert.doesNotMatch(src, /const delBtn[\s\S]{0,240}NoticeStore\.remove/,
      '列表点击处理不得直接删除——必须先弹确认');
    assert.match(src, /同步删除该通知关联的待办/, '确认文案须说明会联动删除待办');
    assert.match(src, /data-modal-cancel="notice-delete-confirm"/, '取消按钮须走统一取消语义');
  });

  test('G10 归档推进：不再自建 position:fixed / 380px 浮层，改走 openModal', () => {
    const src = read('entries/tabs/prop/archive-tab.js');
    assert.doesNotMatch(src, /archive-advance-popover/, '不得再保留自建浮层 id');
    assert.doesNotMatch(src, /position:\s*fixed/, '归档推进不得自建 fixed 浮层（绕开 dialog 语义与焦点接管）');
    assert.doesNotMatch(src, /width:\s*380px/, '不得再固定 380px（390px 视口仅剩 2px 边距）');
    assert.match(src, /openModal\(\{\s*id:\s*'archive-advance'/, '归档推进须迁到 openModal');
    assert.match(src, /data-modal-cancel="archive-advance"/, '取消须走统一取消语义（Esc / 遮罩 / × 同源）');
    assert.doesNotMatch(src, /document\.addEventListener\('keydown',\s*escHandler\)/,
      '迁到 openModal 后不得再自挂 Esc 监听（关闭清理由 modal 统一负责）');
  });


})();
