// role: [工程师]+[AI]
// component-ratchet-guard.test.mjs — 守卫归并件（2026-11-22 批次 600 · D-910）
// 归并来源：badge-single-source-guard.test.mjs · button-height-guard.test.mjs · ui-button-four-types.test.mjs · field-shell-guard.test.mjs · form-field-guard.test.mjs · ui-control-system-guard.test.mjs · ui-custom-select.test.mjs · ui-select-appearance-guard.test.mjs · ui-focus-ring.test.mjs · ui-picker-focus.test.mjs · modal-guard.test.mjs · nested-interaction-guard.test.mjs · touch-target-guard.test.mjs · a11y-guard.test.mjs · about-freeze-guard.test.mjs
// 纪律：只减文件数、不减断言数；每个源件包在独立 async 块作用域里（imports 转动态导入），
//   同名 helper / 常量互不冲突；失败信息保留各源件的横幅与断言名，便于定位。

// ═══ 源件 1：badge-single-source-guard.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // server/test/badge-single-source-guard.test.mjs — 徽章只从 badgeHtml 出（2026-11-21 批次 587）
  //
  // 判据（`H31` 组件复用纪律、`DS_03` 徽章单源）：
  //   ① `docs/src` 不得手拼徽章（同一 class 串里 `rounded-full` ＋ `px-1.5|2|2.5` ＋ `py-0.5`）；
  //      存量按文件基线**只减不增**，新文件出现即红；徽章组件自身（`components/ui/badge*`）豁免。
  //   ② 反例自证：手拼徽章必须判红，`badgeHtml(...)` 产物模板不得被误伤。
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readdirSync, statSync, readFileSync } = await import('node:fs');
  const { join, relative } = await import('node:path');
  const ROOT = join(import.meta.dirname, '..', '..');
  const SRC = join(ROOT, 'docs', 'src');
  const RE_CLASS = /class="([^"]*rounded(?:-full)?\b[^"]*)"/g;
  
  /** 存量基线（2026-11-21 批次 590 实测 43 文件；只减不增）。 */
  const HAND_BADGE_BASELINE = new Set([
    'docs/src/components/feedback/issue-dispatch-view.js',
    'docs/src/components/feedback/reactions.js',
    'docs/src/components/governance/org-setup-wizard.js',
    'docs/src/components/governance/person-edit-modal.js',
    'docs/src/components/governance/resolution-followup-manager.js',
    'docs/src/components/governance/workforce-duty-card.js',
    'docs/src/components/governance/workgroup-member-editor.js',
    'docs/src/components/record/activity-view.js',
    'docs/src/components/record/inspector.js',
    'docs/src/components/record/taskforce-view.js',
    'docs/src/entries/pages/activity-entry.js',
    'docs/src/entries/pages/activity-materials-entry.js',
    'docs/src/entries/pages/messages-entry.js',
    'docs/src/entries/pages/notice-entry.js',
    'docs/src/entries/pages/party-committee-meeting-entry.js',
    'docs/src/entries/pages/person-entry.js',
    'docs/src/entries/pages/thought-report-entry.js',
    'docs/src/entries/tabs/disc/inspection-tab.js',
    'docs/src/entries/tabs/disc/review-tab.js',
    'docs/src/entries/tabs/leader/attendance-tab.js',
    'docs/src/entries/tabs/leader/inspection-tab.js',
    'docs/src/entries/tabs/leader/my-tasks-section.js',
    'docs/src/entries/tabs/leader/overview-tab.js',
    'docs/src/entries/tabs/leader/review-tab.js',
    'docs/src/entries/tabs/leader/write-tab.js',
    'docs/src/entries/tabs/org/inspection-tab.js',
    'docs/src/entries/tabs/org/member-flow-tab.js',
    'docs/src/entries/tabs/org/talent-tab.js',
    'docs/src/entries/tabs/org/taskforce-tab.js',
    'docs/src/entries/tabs/prop/archive-tab.js',
    'docs/src/entries/tabs/prop/tasks-tab.js',
    'docs/src/entries/tabs/prop/weekly-tab.js',
    'docs/src/entries/tabs/secretary/assign-tab.js',
    'docs/src/entries/tabs/secretary/feedback-tab.js',
    'docs/src/entries/tabs/secretary/group-progress-tab.js',
    'docs/src/entries/tabs/secretary/notification-tab.js',
    'docs/src/entries/tabs/secretary/report-up-tab.js',
    'docs/src/entries/tabs/secretary/todo-tab.js',
    'docs/src/entries/tabs/secretary/work-map-tab.js',
    'docs/src/entries/tabs/secretary/workforce-panel.js',
    'docs/src/entries/tabs/visitor/inspection-tab.js',
    'docs/src/entries/tabs/visitor/projects-tab.js',
    'docs/src/entries/tabs/visitor/review-tab.js',
  ]);
  
  function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full, out);
      else if (name.endsWith('.js')) out.push(full);
    }
    return out;
  }
  
  /** 是否手拼徽章（供守卫与反例共用）。 */
  function isHandBadge(text) {
    for (const m of String(text).matchAll(RE_CLASS)) {
      const cls = m[1];
      if (/px-(?:1\.5|2|2\.5)\b/.test(cls) && /\bpy-0\.5\b/.test(cls)) return true;
    }
    return false;
  }
  
  const COMPONENT_ALLOW = /docs\/src\/components\/ui\/(?:badge|badges|status-badge)\.js$/;
  
  test('① 手拼徽章只减不增：新文件出现即红', () => {
    const problems = [];
    for (const file of walk(SRC)) {
      const rel = relative(ROOT, file).replace(/\\/g, '/');
      if (COMPONENT_ALLOW.test(rel)) continue;
      if (!isHandBadge(readFileSync(file, 'utf8'))) continue;
      if (!HAND_BADGE_BASELINE.has(rel)) problems.push(`${rel} 手拼徽章：请改用 badgeHtml(label, tone)`);
    }
    assert.deepEqual(problems, [], `手拼徽章未登记：\n  ${problems.join('\n  ')}`);
  });
  
  test('② 反例自证：手拼判红、组件产物不误伤', () => {
    assert.equal(isHandBadge('<span class="text-xs px-2 py-0.5 rounded-full bg-blue-50">x</span>'), true,
      '注入的手拼徽章未被判出');
    assert.equal(isHandBadge('<span class="badge badge--info">x</span>'), false, 'badgeHtml 产物被误伤');
    assert.equal(isHandBadge('<span class="px-2 py-1 rounded-full">x</span>'), false, 'py-1 不属于徽章口径');
  });

})();

// ═══ 源件 2：button-height-guard.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // server/test/button-height-guard.test.mjs — h-8 只留档5 低频（2026-11-21 批次 587）
  //
  // 判据（`DS_03:120` 档5 32px）：`h-8` 只允许「导出 / 打印 / 分页 / 图标关闭 / 低频上传」语境；
  //   导航（日历周 / 日前后翻页）与表单动作必须走 `.btn-sm` / `.btn-md` 行高档。
  //   白名单按文件写死，只减不增；新文件出现 `h-8` 即红。反例自证在 ②。
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readdirSync, statSync, readFileSync } = await import('node:fs');
  const { join, relative } = await import('node:path');
  const ROOT = join(import.meta.dirname, '..', '..');
  const SRC = join(ROOT, 'docs', 'src');
  const RE_H8_ANY = /<button[^>]*class="[^"]*\bh-8\b[^"]*"/;
  const RE_H8_CLASS = /<button[^>]*class="[^"]*\bh-8\b[^"]*"/;
  
  /** 档5 / 图标白名单（2026-11-21 实测；只减不增）。 */
  const H8_ALLOW = Object.freeze({
    'docs/src/components/ui/modal.js': '图标关闭按钮（w-8 h-8，非行内动作）',
    'docs/src/entries/tabs/disc/inspection-tab.js': '档5：代录考察表单（低频上传）',
    'docs/src/components/record/activity-view.js': '档5：导出 CSV',
  });
  
  function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full, out);
      else if (name.endsWith('.js')) out.push(full);
    }
    return out;
  }
  
  test('① h-8 只允许白名单文件（日历导航已改 btn-sm）', () => {
    const problems = [];
    for (const file of walk(SRC)) {
      const rel = relative(ROOT, file).replace(/\\/g, '/');
      const src = readFileSync(file, 'utf8');
      if (!RE_H8_ANY.test(src)) continue;
      if (!H8_ALLOW[rel]) problems.push(`${rel} 出现 h-8：请归 .btn-sm / .btn-md 档`);
    }
    assert.deepEqual(problems, [], `h-8 越档：\n  ${problems.join('\n  ')}`);
  });
  
  test('② 反例自证：白名单外注入 h-8 必须判红', () => {
    const sample = '<button class="btn-outline h-8 px-3">x</button>';
    assert.equal(RE_H8_CLASS.test(sample), true, '注入的 h-8 未被判出');
    assert.equal(H8_ALLOW['docs/src/entries/tabs/secretary/calendar-tab.js'], undefined,
      '白名单不得包含日历导航文件（导航必须走 .btn-sm）');
  });

})();

// ═══ 源件 3：ui-button-four-types.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // ui-button-four-types.test.mjs — 按钮四类与 tab 豁免守卫（2026-10-19 立 · Task 9）
  //
  // 来源：Spec「最小三成本」Task 1 / Task 9；判例＝「无底色无边框按钮难用」「8 族分不清」。
  // 裁定：动作按钮只有四类——主操作 / 次操作 / 强调次操作 / 危险；tab 与页签 `btn-tab` 豁免。
  //
  // 判据：
  //   B1 四页重点不得再出现 `btn-ghost` / `btn-neutral` / `btn-action-*`；
  //   B2 四页重点至少出现 `.btn-sm` 或 `.btn-md` 的显式尺寸；
  //   B3 六台顶部 tab 的 `tab-btn` / 页签 `btn-tab` 不被本守卫统计；
  //   B4 非空转：四页重点文件确实存在且含按钮标记。
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const PAGES = [
    { label: '支书 · 党小组', file: join(ROOT, 'docs', 'src', 'entries', 'tabs', 'secretary', 'group-progress-tab.js') },
    { label: '支书 · 支委会', file: join(ROOT, 'docs', 'src', 'entries', 'tabs', 'secretary', 'committee-meeting-tab.js') },
    { label: '支书 · 全局概况', file: join(ROOT, 'docs', 'src', 'components', 'governance', 'work-overview.js') },
    { label: '支书 · 待办', file: join(ROOT, 'docs', 'src', 'components', 'record', 'todo-list.js') },
  ];
  
  const BANNED = ['btn-ghost', 'btn-neutral', 'btn-action-red', 'btn-action-green', 'btn-action-amber', 'btn-action-orange', 'btn-action-gray'];
  
  test('B1 四页重点不再出现旧动作按钮类', () => {
    for (const { label, file } of PAGES) {
      const src = readFileSync(file, 'utf8');
      for (const cls of BANNED) {
        assert.ok(!src.includes(cls), `${label} 仍出现旧动作按钮类 ${cls}；应改用四类 + btn-sm/btn-md`);
      }
    }
  });
  
  test('B2 四页重点使用显式尺寸 btn-sm / btn-md', () => {
    for (const { label, file } of PAGES) {
      const src = readFileSync(file, 'utf8');
      assert.match(src, /btn-(sm|md)/, `${label} 未使用 btn-sm / btn-md 显式尺寸`);
    }
  });
  
  test('B3 tab / 页签 btn-tab 豁免：顶部 tab 文件不在本守卫统计面', () => {
    // 六台顶部 tab 的选中态与尺寸由 tab-bar / styles.css 维护；本守卫不读取、不改写。
    const tabBar = readFileSync(join(ROOT, 'docs', 'src', 'components', 'shell', 'tab-bar.js'), 'utf8');
    assert.ok(tabBar.includes('tab-btn'), 'tab-bar 仍应使用 tab-btn；本轮豁免且不改其尺寸');
  });
  
  test('B4 非空转：四页重点确实含按钮标记', () => {
    for (const { label, file } of PAGES) {
      const src = readFileSync(file, 'utf8');
      assert.match(src, /<button|listRowHtml|metric-band__item/, `${label} 未检出按钮标记，抽取面可能写坏`);
    }
  });
  
  /** 取函数体（从 `function name` 到下一个顶层 `function`） */
  function functionBody(src, name) {
    const start = src.indexOf(`function ${name}`);
    assert.ok(start >= 0, `未找到函数 ${name}`);
    const next = src.indexOf('\nfunction ', start + 1);
    return next < 0 ? src.slice(start) : src.slice(start, next);
  }
  
  test('B5 行内可见动作 ≤2：党小组 / 支委会每行 1 主 + 更多，危险动作在菜单内', () => {
    const rows = [
      { label: '支书 · 党小组', src: readFileSync(PAGES[0].file, 'utf8'), fn: '_manageRowHtml' },
      { label: '支书 · 支委会', src: readFileSync(PAGES[1].file, 'utf8'), fn: 'rosterRowHtml' },
    ];
    for (const { label, src, fn } of rows) {
      const body = functionBody(src, fn);
      assert.match(body, /<details class="row-more">/, `${label} 行未使用「更多」菜单`);
      const visible = body.replace(/<details[\s\S]*?<\/details>/g, '');
      const n = (visible.match(/<button\b/g) || []).length;
      assert.ok(n <= 2, `${label} 行内可见动作应 ≤2（1 主 + 更多），实测 ${n}`);
    }
    const groupRow = functionBody(rows[0].src, rows[0].fn);
    const menu = groupRow.slice(groupRow.indexOf('row-more__menu'));
    assert.ok(menu.includes('gp-rename') && menu.includes('gp-dissolve'),
      '改名 / 解散应在党小组行的「更多」菜单内');
  });

})();

// ═══ 源件 4：field-shell-guard.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // field-shell-guard.test.mjs — 字段外壳 / 下拉统一守卫（2026-10-24 · 批次 508）
  //
  // 为什么要有本守卫：
  //   · 2026-10-29 P1（焦点只有一个信号）：输入族是**有边框控件**——
  //     聚焦只允许 `border-color` 变主题色；不画 outline、不画 box-shadow；
  //     `:focus` 与 `:focus-visible` 同表现（鼠标点击与键盘聚焦一致）。
  //   · 同一批把 select 统一交给 `enhanceSelects`（或全局 MutationObserver）增强，
  //     禁止各渲染点自建第二套下拉外观。
  //   · 判据：
  //       F1 非空转：styles.css 能解析到 `.input-flat` 与 `:focus-visible` 规则
  //       F2 活动态：`.input-flat:focus` 边框切主题色，`outline: none` ＋ `box-shadow: none`
  //       F3 键盘一致：`.input-flat:focus-visible` 与 `:focus` 同表现（只变边框），不得出环
  //       F4 旧双环变量退场：`.input-flat:focus` 与暗色段均不引用 `--focus-ring` / `--focus-halo`
  //       F5 禁用 / 只读分态：两者都存在且声明不同（禁用灰底 / 只读透明边）
  //       F6 select 统一：渲染 `<select>` 的文件必须本地 enhanceSelects / data-cs-enhanced，
  //          或落在 `.input-flat` 上由全局 MutationObserver 增强；例外逐条登记理由
  //   · 批次 524（F · 输入单一源）新增 R1–R3：裸输入棘轮——
  //       判据：`<input|select|textarea` 标签内 class 属性含 `input-flat` 即「裸写法」（绕开 forms.js，
  //       直接手写控件）。存量逐文件登记 `style-baseline.mjs::RAW_INPUT_BASELINE`，**只减不增**；
  //       未登记文件出现裸输入即红 ⇒ 新代码只能走 `forms.js` 的 textInput / selectInput / textField 等。
  //   · 口径调整（据实况，不删断言）：
  //       2026-10-28：原 F2 要求 `:focus` 只改边框、环只由 `:focus-visible` 承担；支书裁定
  //       「鼠标点击与键盘聚焦表现一致」后，环改由 `:focus` 承担（几何与 `:focus-visible` 相同）。
  //       2026-10-29 P1：输入框「边框还是很脏很厚」⇒ 全部退回只变边框（无 outline / 无 box-shadow）；
  //       F2/F3 判据改为「只变色、零环、零阴影」，并同批核算七主题边框色 vs 白卡 ≥3:1。
  // 运行：node --test server/test/field-shell-guard.test.mjs
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync, readdirSync } = await import('node:fs');
  const { join, dirname, relative } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const { ACCENT_COLORS } = await import('../../docs/src/core/domain/constants.js?v=20261120a');
  const { textInput, selectInput, suggestInput } = await import('../../docs/src/components/ui/form-field.js?v=20261120a');
  const { RAW_INPUT_BASELINE, RAW_INPUT_TOTAL_BASELINE, RAW_INPUT_FILE_BASELINE, } = await import('./style-baseline.mjs');
  const HERE = dirname(fileURLToPath(import.meta.url));
  const ROOT = join(HERE, '..', '..');
  const DOCS_SRC = join(ROOT, 'docs', 'src');
  const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
  const relOf = (abs) => relative(ROOT, abs).replace(/\\/g, '/');
  const STYLES = read('docs/src/styles.css');
  
  /** 是否画出了可见的环（none / 0 0 0 0 transparent 视为不画） */
  const paintsRing = (value) => !!value
    && !/^none$/i.test(value)
    && !/^0(?:px)? 0(?:px)? 0(?:px)? 0(?:px)?(?: (?:transparent|rgba\(0,\s*0,\s*0,\s*0\)))?$/i.test(value);
  
  /** sRGB 相对亮度（WCAG 定义） */
  function luminance(hex) {
    const raw = String(hex).replace('#', '');
    const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  
  function contrast(a, b) {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  }
  
  /** 取选择器列表精确包含 selector 的第一条规则体（先剥注释，避免注释里的花括号干扰） */
  function ruleBody(css, selector, from = 0) {
    const src = String(css).replace(/\/\*[\s\S]*?\*\//g, '');
    const re = /([^{}]+)\{([^{}]*)\}/g;
    re.lastIndex = from;
    let m;
    while ((m = re.exec(src))) {
      const sels = m[1].split(',').map((s) => s.trim());
      if (sels.includes(selector)) return m[2];
    }
    return '';
  }
  
  /** 取以 needle 开头的块的内部文本（大括号配对；注释已剥离） */
  function blockAfter(css, needle) {
    const src = String(css).replace(/\/\*[\s\S]*?\*\//g, '');
    const i = src.indexOf(needle);
    if (i < 0) return '';
    const start = src.indexOf('{', i);
    if (start < 0) return '';
    let depth = 0;
    for (let p = start; p < src.length; p += 1) {
      if (src[p] === '{') depth += 1;
      else if (src[p] === '}') {
        depth -= 1;
        if (depth === 0) return src.slice(start + 1, p);
      }
    }
    return '';
  }
  
  /** 递归收集 docs/src 下 .js */
  function walkJs(dir, out = []) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'vendor' || e.name === 'fonts' || e.name === 'images') continue;
        walkJs(p, out);
        continue;
      }
      if (e.name.endsWith('.js')) out.push(p);
    }
    return out;
  }
  
  const isCommentLine = (line) => {
    const t = line.trim();
    return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
  };
  
  /** 实际渲染 <select> 的源码行（排除注释里的用法示例） */
  function selectLines(src) {
    return src.split('\n').filter((line) => !isCommentLine(line) && line.includes('<select'));
  }
  
  /**
   * F6 例外：渲染 select 但既未本地 enhanceSelects，也没有把 input-flat 写在 select 标签上。
   * 依赖全局 MutationObserver（bootstrap.js）或类名由变量承载。
   */
  const SELECT_EXCEPTIONS = [
    {
      file: 'docs/src/components/sections/help-catalog.js',
      reason: 'help 页角色筛选是原生 select（help-role-filter，非 .input-flat 表单族；保留原生可访问性，不做圆角增强）',
    },
    {
      file: 'docs/src/components/ui/form-field.js',
      reason: 'selectField 的 class 由局部变量 cls 承载（恒为 input-flat w-full），由全局 MutationObserver 增强；标签行不含字面 input-flat',
    },
  ];
  
  test('F1 非空转：styles.css 可解析到 .input-flat 与 :focus-visible 规则', () => {
    const base = ruleBody(STYLES, '.input-flat');
    assert.ok(base, 'styles.css 缺少 .input-flat 规则（字段外壳底座）');
    const focusVisible = ruleBody(STYLES, '.input-flat:focus-visible');
    assert.ok(focusVisible, 'styles.css 缺少 .input-flat:focus-visible 规则（键盘焦点保险）');
  });
  
  test('F2 活动态：.input-flat:focus 边框切主题色，零 outline / 零 box-shadow', () => {
    const body = ruleBody(STYLES, '.input-flat:focus');
    assert.ok(body, 'styles.css 缺少 .input-flat:focus 规则');
    assert.match(body, /border-color:\s*var\(--app-accent\)\s*;/, '.input-flat:focus 必须把边框切到 var(--app-accent)');
    // 2026-10-29 P1：有边框控件只有一个信号——只变边框色，不得再画 outline / box-shadow。
    assert.equal(paintsRing(/(?:^|;)\s*outline\s*:\s*([^;]+)/.exec(body)?.[1]),
      false, '.input-flat:focus 不得出 outline（输入族只允许 border-color）');
    assert.equal(paintsRing(/(?:^|;)\s*box-shadow\s*:\s*([^;]+)/.exec(body)?.[1]),
      false, '.input-flat:focus 不得出 box-shadow（输入族只允许 border-color）');
    assert.doesNotMatch(body, /--focus-ring/, '.input-flat:focus 不得引用旧 --focus-ring（唯一来源是 --app-accent）');
  
    // 边框色 vs 白卡 ≥3:1，七主题逐色输出（不放宽对比度）。
    const keys = ['gold', 'red', 'orange', 'green', 'cyan', 'blue', 'purple'];
    for (const key of keys) {
      const light = ACCENT_COLORS[key].light.base;
      const ratio = contrast(light, '#FFFFFF');
      console.log(`[field-shell-guard] F2 边框色 ${key} ${light} vs 白卡 ${ratio.toFixed(2)}:1`);
      assert.ok(ratio >= 3, `${key} 输入框焦点边框对白卡仅 ${ratio.toFixed(2)}:1（要求 ≥3）`);
    }
  });
  
  test('F3 键盘一致：.input-flat:focus-visible 与 :focus 同表现（只变边框、不出环）', () => {
    const body = ruleBody(STYLES, '.input-flat:focus-visible');
    assert.ok(body, 'styles.css 缺少 .input-flat:focus-visible 规则');
    assert.match(body, /border-color:\s*var\(--app-accent\)\s*;/,
      '.input-flat:focus-visible 必须把边框切到 var(--app-accent)（键盘与鼠标同表现）');
    assert.equal(paintsRing(/(?:^|;)\s*outline\s*:\s*([^;]+)/.exec(body)?.[1]),
      false, '.input-flat:focus-visible 不得出 outline（键盘聚焦也不得比鼠标多一个信号）');
    assert.equal(paintsRing(/(?:^|;)\s*box-shadow\s*:\s*([^;]+)/.exec(body)?.[1]),
      false, '.input-flat:focus-visible 不得出 box-shadow');
    // 聚焦块必须与 :focus 同一条规则（不是各写一套）。
    const sameBlock = ruleBody(STYLES, '.input-flat:focus');
    assert.equal(sameBlock, body, '.input-flat:focus 与 :focus-visible 必须在同一个规则块（禁止两套口径）');
  });
  
  test('F4 旧双环变量退场：.input-flat:focus 与暗色段均不引用 --focus-ring / --focus-halo', () => {
    // 2026-10-28：焦点只用 --app-accent，旧的深灰环 / 黑晕变量整站删除；
    //   本判据防止有人把旧变量加回来形成第二套口径。
    const noComment = STYLES.replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(noComment, /var\(--focus-ring\)/, 'styles.css 仍引用 var(--focus-ring)');
    assert.doesNotMatch(noComment, /var\(--focus-halo\)/, 'styles.css 仍引用 var(--focus-halo)');
  
    const dark = blockAfter(STYLES, 'html.theme-dark {');
    assert.ok(dark, 'styles.css 缺少 html.theme-dark 块');
    assert.doesNotMatch(dark, /--focus-(?:ring|halo)\s*:/, '暗色段不应再覆盖旧焦点环变量');
  });
  
  test('F5 禁用 / 只读分态：两者都存在且声明不同（禁用灰底 / 只读透明边）', () => {
    const disabled = ruleBody(STYLES, '.input-flat:disabled');
    const readonly = ruleBody(STYLES, '.input-flat[readonly]');
    assert.ok(disabled, 'styles.css 缺少 .input-flat:disabled 规则');
    assert.ok(readonly, 'styles.css 缺少 .input-flat[readonly] 规则');
    assert.match(disabled, /background:\s*var\(--neutral-100\)\s*;/, '禁用态应为灰底 var(--neutral-100)');
    assert.match(disabled, /cursor:\s*not-allowed\s*;/, '禁用态应 cursor: not-allowed');
    assert.match(readonly, /border-color:\s*transparent\s*;/, '只读态应为透明边 border-color: transparent');
    assert.notEqual(disabled.replace(/\s+/g, ' '), readonly.replace(/\s+/g, ' '),
      '禁用与只读必须是两套可区分声明（不得合并成同一条规则）');
  });
  
  test('F6 select 统一：本地增强 / data-cs-enhanced / .input-flat 全局增强，例外逐条登记', () => {
    const bootstrap = read('docs/src/core/boot/bootstrap.js');
    assert.match(bootstrap, /new MutationObserver\(/, 'bootstrap.js 缺少全局 MutationObserver（动态 select 的单一增强入口）');
    assert.match(bootstrap, /enhanceSelects\(document\)/, 'bootstrap.js 未调用 enhanceSelects(document)');
    const customSelect = read('docs/src/components/ui/custom-select.js');
    assert.match(customSelect, /select\.input-flat:not\(\[data-cs-enhanced\]\)/,
      'enhanceSelects 必须只挑 .input-flat 且用 data-cs-enhanced 保持幂等');
  
    const files = walkJs(DOCS_SRC);
    const renderers = [];
    for (const abs of files) {
      const src = readFileSync(abs, 'utf8');
      const lines = selectLines(src);
      if (lines.length === 0) continue;
      renderers.push({ rel: relOf(abs), src, lines });
    }
    assert.ok(renderers.length >= 30, `只扫描到 ${renderers.length} 个渲染 select 的文件（下限 30）：扫描面写坏`);
  
    const offenders = [];
    for (const r of renderers) {
      if (/enhanceSelects\s*\(|data-cs-enhanced/.test(r.src)) continue;
      if (r.lines.every((line) => line.includes('input-flat'))) continue; // 全局 MutationObserver 兜底
      if (SELECT_EXCEPTIONS.some((e) => e.file === r.rel)) continue;
      offenders.push(`${r.rel}（${r.lines.length} 处 <select> 既未本地增强，也不在 .input-flat 上）`);
    }
    assert.deepEqual(offenders, [],
      `以下文件渲染了 select 但不在统一增强链上（本地 enhanceSelects / data-cs-enhanced / .input-flat 三选一）：\n  ${offenders.join('\n  ')}`);
  
    // 防僵尸：例外必须真实命中「渲染 select 且不在统一链上」
    const zombies = SELECT_EXCEPTIONS.filter((e) => {
      const r = renderers.find((x) => x.rel === e.file);
      if (!r) return true;
      if (/enhanceSelects\s*\(|data-cs-enhanced/.test(r.src)) return true;
      return r.lines.every((line) => line.includes('input-flat'));
    }).map((e) => `${e.file}（${e.reason}）`);
    assert.deepEqual(zombies, [], `F6 白名单存在僵尸条目（已迁移或文件不存在，请删除）：\n  ${zombies.join('\n  ')}`);
  });
  
  /* ════════════════════════════════════════════════════════════════
     R1–R3 裸输入棘轮（批次 524 · F · 输入单一源）
     ────────────────────────────────────────────────────────────────
     「裸输入」＝ `<input|select|textarea` 标签的 class 里出现 `input-flat`：
     即绕开 `components/ui/forms.js`（textInput / selectInput / textField / selectField / dateField）
     直接手写控件。**只减不增**：存量逐文件登记 `style-baseline.mjs::RAW_INPUT_BASELINE`；
     未登记文件出现裸输入即红（新代码必须走 forms.js）。
     ════════════════════════════════════════════════════════════════ */
  
  /** 标签结束位置：跳过引号与模板 `${…}`（属性值里的 `>` 不得截断标签） */
  function _tagEnd(src, from) {
    let quote = '';
    let depth = 0;
    for (let i = from; i < src.length; i += 1) {
      const ch = src[i];
      if (depth > 0) {
        if (ch === '{') depth += 1;
        else if (ch === '}') depth -= 1;
        continue;
      }
      if (quote) {
        if (ch === quote) quote = '';
        continue;
      }
      if (ch === '"' || ch === "'") { quote = ch; continue; }
      if (ch === '$' && src[i + 1] === '{') { depth = 1; i += 1; continue; }
      if (ch === '>') return i;
    }
    return -1;
  }
  
  /** 单文件裸输入处数（class 含 input-flat 的 input / select / textarea 标签数） */
  function rawInputCount(src) {
    const re = /<(input|select|textarea)\b/gi;
    let count = 0;
    let m;
    while ((m = re.exec(src))) {
      const end = _tagEnd(src, re.lastIndex);
      if (end < 0) break;
      const tag = src.slice(m.index, end + 1);
      if (/\bclass="[^"]*\binput-flat\b/.test(tag)) count += 1;
      re.lastIndex = end + 1;
    }
    return count;
  }
  
  /** 全量实测：`repo 相对路径 → 处数`（只收 >0 的文件） */
  function rawInputScan() {
    const out = {};
    for (const abs of walkJs(DOCS_SRC)) {
      const n = rawInputCount(readFileSync(abs, 'utf8'));
      if (n > 0) out[relOf(abs)] = n;
    }
    return out;
  }
  
  test('R1 裸输入只减不增：逐文件不超过基线，未登记文件出现裸输入即红', () => {
    const actual = rawInputScan();
    const rises = [];
    const fresh = [];
    for (const [file, n] of Object.entries(actual)) {
      const base = RAW_INPUT_BASELINE[file];
      if (base === undefined) fresh.push(`${file}（${n} 处，未登记）`);
      else if (n > base) rises.push(`${file}（${base} → ${n}）`);
    }
    assert.deepEqual(fresh, [],
      `以下文件新出现裸输入（应改走 forms.js 的 textInput / selectInput / textField…）：\n  ${fresh.join('\n  ')}`);
    assert.deepEqual(rises, [],
      `以下文件裸输入处数上涨（棘轮只减不增）：\n  ${rises.join('\n  ')}`);
  
    // 收基线：基线里已清零 / 文件已删的条目必须删掉（防僵尸条目掩盖真实回流）
    const zombies = Object.keys(RAW_INPUT_BASELINE).filter((file) => !actual[file]);
    assert.deepEqual(zombies, [], `基线存在僵尸条目（实测已为 0 或文件不存在，请按收基线纪律删除）：\n  ${zombies.join('\n  ')}`);
  });
  
  test('R2 规模与单一源：总数 / 文件数不超基线，forms.js 仍导出布局中立控件', () => {
    const actual = rawInputScan();
    const total = Object.values(actual).reduce((a, b) => a + b, 0);
    const files = Object.keys(actual).length;
    assert.ok(total <= RAW_INPUT_TOTAL_BASELINE, `裸输入总数 ${total} 超过基线 ${RAW_INPUT_TOTAL_BASELINE}（只减不增）`);
    assert.ok(files <= RAW_INPUT_FILE_BASELINE, `含裸输入的文件数 ${files} 超过基线 ${RAW_INPUT_FILE_BASELINE}（只减不增）`);
    // 非空转：基线总量必须等于逐条之和（防止只手改常量掩盖回流）
    const baseTotal = Object.values(RAW_INPUT_BASELINE).reduce((a, b) => a + b, 0);
    assert.equal(baseTotal, RAW_INPUT_TOTAL_BASELINE, 'RAW_INPUT_TOTAL_BASELINE 与逐文件基线之和不一致');
    assert.equal(Object.keys(RAW_INPUT_BASELINE).length, RAW_INPUT_FILE_BASELINE,
      'RAW_INPUT_FILE_BASELINE 与基线条目数不一致');
  
    const forms = read('docs/src/components/ui/forms.js');
    assert.match(forms, /textInput/, 'forms.js 未导出 textInput（输入单一源）');
    assert.match(forms, /selectInput/, 'forms.js 未导出 selectInput（输入单一源）');
  });
  
  test('R3 反例自检：合成裸 input 必须判红，控件积木产物必须不命中', () => {
    assert.equal(rawInputCount('<input type="text" class="input-flat text-xs w-full">'), 1,
      '合成裸 input 未被识别（口径失效）');
    assert.equal(rawInputCount('<textarea rows="2" class="input-flat w-full"></textarea>'), 1,
      '合成裸 textarea 未被识别');
    assert.equal(rawInputCount('<input type="text" class="input-flat text-xs"\n  placeholder="跨行">'), 1,
      '跨行裸 input 未被识别');
    // 控件积木的**调用点源码**不含字面 `<input` / `<select` ⇒ 必须不命中（守卫扫的是源码，不是产物 HTML）
    assert.equal(rawInputCount("html += textInput({ id: 'x', className: 'w-full', placeholder: '占位' });"), 0,
      'textInput 调用点被误判为裸输入');
    assert.equal(rawInputCount("html += selectInput({ id: 'y', options: [{ value: 'a', label: 'A' }] });"), 0,
      'selectInput 调用点被误判为裸输入');
    // 单一源契约：产物仍带 `input-flat text-xs` ＋ 调用方布局类
    assert.match(textInput({ id: 'x', className: 'w-full' }), /class="input-flat text-xs w-full"/,
      'textInput 未产出 input-flat text-xs ＋ 布局类');
    assert.match(selectInput({ id: 'y', options: [{ value: 'a', label: 'A' }] }), /class="input-flat text-xs"/,
      'selectInput 未产出 input-flat text-xs');
    // 非 .input-flat 的裸控件不在本口径内（如 checkbox / file 选择器）
    assert.equal(rawInputCount('<input type="checkbox" class="checkbox-accent">'), 0,
      '非 input-flat 控件被误判');
  });
  
  /* ════════════════════════════════════════════════════════════════
     R4–R5 建议输入去原生 datalist（2026-11-01 批次 525 · #4）
     ────────────────────────────────────────────────────────────────
     病灶：`<input list="…">` ＋ `<datalist>` 会让 Chrome 在输入框内画 UA picker 三角
     （实测暗像素 24 → 去掉 list 后 0）。改为 `suggestInput` 自建列表：
     ① `docs/src` 全量不得再出现 `list="` / `<datalist`（注释里也算，防止示例回潮）；
     ② 产物必须带 combobox ARIA（role / aria-expanded / aria-controls / aria-activedescendant）
        ＋ listbox，且不得含 `list` 属性。
     ════════════════════════════════════════════════════════════════ */
  
  /** 原生 datalist 用法计数（`list="` 属性边界避免误伤 data-*-list；`<datalist` 计标签）。 */
  function nativeDatalistCount(src) {
    const text = String(src ?? '');
    const listAttr = (text.match(/(?:^|\s)list="/g) || []).length;
    const datalist = (text.match(/<datalist/g) || []).length;
    return listAttr + datalist;
  }
  
  /** 自建建议输入 ARIA 契约（input combobox ＋ listbox；不带 option 因初始列表为空）。 */
  function hasComboboxAria(html) {
    const text = String(html ?? '');
    return /role="combobox"/.test(text)
      && /aria-expanded="/.test(text)
      && /aria-controls="/.test(text)
      && /aria-activedescendant="/.test(text)
      && /role="listbox"/.test(text);
  }
  
  test('R4 docs/src 原生 datalist 清零（list 属性 / datalist 标签）', () => {
    const files = walkJs(DOCS_SRC);
    assert.ok(files.length > 100, `只扫描到 ${files.length} 个文件（扫描面写坏）`);
    const offenders = [];
    for (const abs of files) {
      const n = nativeDatalistCount(readFileSync(abs, 'utf8'));
      if (n > 0) offenders.push(`${relOf(abs)}（${n} 处）`);
    }
    assert.deepEqual(offenders, [],
      `以下文件仍使用原生 list / datalist（应改走 forms.js::suggestInput）：\n  ${offenders.join('\n  ')}`);
    // 反例：合成 datalist 必须判红
    assert.equal(nativeDatalistCount('<input type="text" list="kw"><datalist id="kw"></datalist>'), 2,
      '反例（合成 list / datalist）未被识别');
    // 负例：data-*-list 不是原生 list 属性，不得误伤
    assert.equal(nativeDatalistCount('<ul data-myws-list="1"></ul>'), 0, 'data-*-list 被误判为原生 list');
  });
  
  test('R5 suggestInput 产物：combobox ARIA 齐全、无 list 属性', () => {
    const html = suggestInput({ id: 'probe', suggestions: ['第一组', '第二组组'], max: 8, className: 'lf-kw' });
    assert.match(html, /role="combobox"/, '产物缺少 role="combobox"');
    assert.match(html, /aria-expanded="false"/, '产物缺少 aria-expanded 初始态');
    assert.match(html, /aria-controls="probe-suggest-list"/, '产物缺少 aria-controls 指向列表');
    assert.match(html, /aria-activedescendant=""/, '产物缺少 aria-activedescendant');
    assert.match(html, /role="listbox"/, '产物缺少 role="listbox"');
    assert.match(html, /data-suggest-items="[^"]+"/, '产物缺少建议项数据');
    assert.equal(nativeDatalistCount(html), 0, '产物不得含 list 属性 / datalist');
    // 反例：无 ARIA 的合成建议输入必须判红
    assert.equal(hasComboboxAria('<input type="text" class="input-flat"><div class="suggest__list"></div>'), false,
      '反例（无 combobox ARIA）未被判红');
    assert.equal(hasComboboxAria(html), true, 'suggestInput 产物未通过 ARIA 判据');
  });

})();

// ═══ 源件 5：form-field-guard.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // form-field-guard.test.mjs — 表单字段「必填 / 报错 / 字段级可访问名」三件单一源（2026-11-21 批次 591 · SD-66 / SD-67）
  //
  // 判据来源：
  //   · DS_03 §4.3「必填语义与字段级可访问名」（SD-66 必填语义 / SD-67 筛选行控件必有字段级可访问名）
  //   · 判例 CASE-DESIGN-038 / 039（CASES.md）
  //
  // 检查面（4 条）：
  //   T1 必填语义：required:true ⇒ 控件出 required ＋ aria-required="true"；标签星号 aria-hidden（三种字段同源）
  //   T2 报错语义：错误行 role="alert" ＋ id="{id}-err"；控件 aria-invalid ＋ aria-describedby 关联
  //   T3 字段级可访问名：布局中立控件经 ariaLabel 出 aria-label；考勤筛选行活动下拉必须带名字（不得只靠首项文本）
  //   T4 反例自证：剥掉 a11y 属性后同一判据必须判假（守卫不是空转）
  const test = (await import('node:test')).default;
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const path = (await import('node:path')).default;
  const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const SRC = path.join(ROOT, 'docs', 'src');
  
  const V = '?v=20261120a';
  const { textField, textareaField, selectField, textInput, selectInput, labelHtml, errorHtml } =
    await import(`../../docs/src/components/ui/form-field.js${V}`);
  
  /** 必填语义谓词（守卫判据本体；T1 / T4 共用，避免两套口径） */
  function hasRequiredSemantics(html) {
    return /\srequired\b/.test(html) && /aria-required="true"/.test(html);
  }
  
  test('T1 必填语义：三种字段同源产出 required ＋ aria-required ＋ 星号 aria-hidden', () => {
    const opts = { id: 'f1', label: '姓名', options: [{ value: 'a', label: 'A' }] };
    const cases = {
      textField: textField({ ...opts, required: true }),
      textareaField: textareaField({ ...opts, required: true }),
      selectField: selectField({ ...opts, required: true }),
    };
    for (const [name, html] of Object.entries(cases)) {
      assert.ok(hasRequiredSemantics(html), `${name} 必填未输出 required / aria-required`);
      assert.match(html, /aria-hidden="true">\*</, `${name} 星号未标 aria-hidden`);
    }
    // 非必填不得误加
    assert.ok(!hasRequiredSemantics(textField({ id: 'f2', label: '可空' })), '非必填字段被加上必填语义');
    // 标签星号只在 required 时出现
    assert.ok(!/\*</.test(labelHtml({ id: 'f2', text: '可空' })), '非必填标签出现星号');
  });
  
  test('T2 报错语义：错误行 role=alert ＋ 控件 aria-invalid / aria-describedby 关联', () => {
    const err = errorHtml('f3', '请填写姓名');
    assert.match(err, /id="f3-err"/, '错误行缺 id');
    assert.match(err, /role="alert"/, '错误行缺 role=alert');
    for (const html of [
      textField({ id: 'f3', label: '姓名', error: '请填写姓名' }),
      textareaField({ id: 'f3', label: '说明', error: '请填写说明' }),
      selectField({ id: 'f3', label: '类型', error: '请选择类型', options: [] }),
    ]) {
      assert.match(html, /aria-invalid="true"/, '控件缺 aria-invalid');
      assert.match(html, /aria-describedby="f3-err"/, '控件未关联错误行');
      assert.match(html, /border-\[var\(--status-error\)\]/, '错误边未走状态令牌');
    }
  });
  
  test('T3 字段级可访问名：布局中立体经 ariaLabel 出 aria-label；考勤筛选行活动下拉带名字', () => {
    assert.match(textInput({ id: 'i1', ariaLabel: '活动筛选' }), /aria-label="活动筛选"/, 'textInput 未出 aria-label');
    assert.match(
      selectInput({ id: 's1', ariaLabel: '活动筛选', options: [{ value: '', label: '活动：全部' }] }),
      /aria-label="活动筛选"/,
      'selectInput 未出 aria-label',
    );
    const attendance = readFileSync(path.join(SRC, 'entries/tabs/disc/attendance-tab.js'), 'utf8');
    const block = attendance.slice(attendance.indexOf("id: 'att-activity-select'"), attendance.indexOf("id: 'att-activity-select'") + 260);
    assert.match(block, /ariaLabel:\s*'活动筛选'/, '考勤筛选行活动下拉缺字段级可访问名');
  });
  
  test('T4 反例自证：剥掉 a11y 属性后必填判据必须判假', () => {
    const good = textField({ id: 'f4', label: '姓名', required: true });
    assert.equal(hasRequiredSemantics(good), true);
    const stripped = good.replace(/\srequired\b/g, '').replace(/\saria-required="true"/g, '');
    assert.equal(hasRequiredSemantics(stripped), false, '剥掉 a11y 属性后判据仍为真 ⇒ 守卫空转');
    const badErr = errorHtml('f5', '错误').replace('role="alert"', '');
    assert.ok(!/role="alert"/.test(badErr), '错误行反例未被识别');
  });

})();

// ═══ 源件 6：ui-control-system-guard.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // server/test/ui-control-system-guard.test.mjs — 控件层单一源守卫（2026-10-23 · R11 Task 12.1）
  //
  // 本文件由 `component-ratchet-guard.test.mjs` / `button-system-guard.test.mjs` 合并而来（2026-10-24 批次 509）：
  //   原 `button-system-guard` 的 B1–B8 断言**逐条搬入本文件末尾**，未删一条；文件内变量改名仅为避开
  //   本文件已有的 `FILES`（控件扫描结果），判据与基线数值一字未动。
  //   为什么做一个而不是两个：两者检查的是**同一批 `<button>` 的类名与 `styles.css` 的控件规则**，
  //   失败根因都是「控件外观没有走单一源（族 / 尺寸 / 边框 / 颜色）」；拆开只会让同一次改动在两处各红一次。
  //
  // 来源：`历史 spec（已删）` 的 SD-1/2/3/4/6/9/10
  //   与 `.ctx/logs/archive/2026-10/2026-10-AUDIT_UI_R11.md` 第五节「SD-1…SD-11 可断言化」。
  // 判据（全部静态、纯 node，不起服务、不开浏览器）：
  //   SD-1 文本 / 日期 / 下拉 / 多行控件必须挂 `.input-flat` / `.input-flat-sm`；
  //        同串不得再出现 `text-sm`、`rounded`/`rounded-lg`、独立 `border`（白名单逐条写理由）。
  //   SD-2 边框必须有颜色：CSS 不得出现无颜色 `border: … solid;`；
  //        JS/HTML 里 `<button class="… border …">` 的独立 `border` 必须同串有 `border-*` 色类或内联 `border-color`。
  //   SD-3 控件圆角只能 8px（`--radius-sm`）；CSS 字面量不得出现 4px / 6px（允许 calc / 999px；
  //        `.tab-group-label` 的 3px 直角是 SD-3 登记例外，见 DESIGN_SYSTEM §12.6 / §12.15）。
  //   SD-4 `summary` 的 UA 三角由全局规则移除；`<summary>` 上 `list-none` 例外数必须为 0。
  //   SD-6 `.btn-accent-soft` 不得用 `--neutral-0` 当底色；`--app-accent-deep` 必须存在且被用作文字色。
  //   SD-9 页签组名必须是可见文本（不是空 span），组间存在 `.tab-group-sep`。
  //   SD-10 今天页 / 待办页不得出现 `text-[10px]` / `text-[11px]`；`--text-xs` ≥ 0.75rem。
  //
  // 非空转：每类断言都有命中基线（控件 > 200、按钮 > 300、radius 声明 > 100、summary > 20、
  //   solid 边框 > 50），并校验白名单每条至少命中 1 次——正则写坏或面被截断都会变红，而不是恒真。
  // 运行：node --test server/test/ui-control-system-guard.test.mjs
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync, readdirSync, statSync } = await import('node:fs');
  const { join, relative, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const { ACCENT_COLORS } = await import('../../docs/src/core/domain/constants.js?v=20261120a');
  const HERE = dirname(fileURLToPath(import.meta.url));
  const ROOT = join(HERE, '..', '..');
  const SRC = join(ROOT, 'docs', 'src');
  const CSS = readFileSync(join(SRC, 'styles.css'), 'utf8');
  /** 剥注释（保留换行）：规则选择器解析用——注释里的示例类名不参与判据 */
  const CSS_BARE = CSS.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  const TAB_BAR = readFileSync(join(SRC, 'components', 'shell', 'tab-bar.js'), 'utf8');
  const TODAY = readFileSync(join(SRC, 'entries', 'tabs', 'today', 'today-tab.js'), 'utf8');
  const TODO_SHELL = readFileSync(join(SRC, 'components', 'record', 'todo-tab-shell.js'), 'utf8');
  const WORK_OVERVIEW = readFileSync(join(SRC, 'components', 'governance', 'work-overview.js'), 'utf8');
  const STATS = readFileSync(join(SRC, 'components', 'dashboard', 'stats.js'), 'utf8');
  const LIST_ROW = readFileSync(join(SRC, 'components', 'ui', 'list-row.js'), 'utf8');
  
  /** 递归收集 docs/src 的 .js ＋ docs/*.html（与 SD-1 的扫描面一致） */
  function collectFiles() {
    const out = [];
    const walk = (dir) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        const st = statSync(p);
        if (st.isDirectory()) {
          if (name === 'node_modules' || name === 'vendor') continue;
          walk(p);
        } else if (name.endsWith('.js')) out.push(p);
      }
    };
    walk(SRC);
    for (const name of readdirSync(join(ROOT, 'docs'))) {
      if (name.endsWith('.html')) out.push(join(ROOT, 'docs', name));
    }
    return out;
  }
  
  /** 剥注释但**保留换行**（行号可核）；HTML 不剥 `//`，避免把 `https://` 截断 */
  function stripComments(src, isHtml) {
    let s = String(src)
      .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
      .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
    if (!isHtml) s = s.replace(/\/\/.*$/gm, '');
    return s;
  }
  
  const FILES = collectFiles().map((p) => {
    const isHtml = p.endsWith('.html');
    return {
      abs: p,
      rel: relative(ROOT, p).replace(/\\/g, '/'),
      src: readFileSync(p, 'utf8'),
      code: stripComments(readFileSync(p, 'utf8'), isHtml),
    };
  });
  
  const lineOf = (text, index) => text.slice(0, index).split('\n').length;
  const classOf = (tag) => (/class="([^"]*)"/.exec(tag) || [null, ''])[1];
  
  /**
   * SD-1 白名单（逐条写理由；不按名字猜）：
   *   · person-picker-search —— 选人器搜索框，完整字段定义在 `components/person-picker.css:168`
   *     （描边 / 8px / 焦点环齐备）；它是「搜索」语义，不并入 `.input-flat`，避免覆盖选择器内部排版。
   *   · help-search-input —— 帮助页搜索，`docs/help.html:135` 内联完整定义（描边 / 8px / 焦点）。
   *   · cs-search-input —— 自定义下拉的内嵌搜索，`styles.css:1223` 完整定义（描边 / 8px / 焦点）。
   *   · vote-note —— 表态附言多行框，`styles.css:2460` 完整定义（白底 / 1px / 8px / focus）。
   *   · help-role-filter —— 帮助页身份筛选下拉，`docs/help.html:149` 完整定义。
   *   2026-10-28：`login-input` 条目删除——登录页输入框已并入 `.input-flat`（支书裁定「控件入族」），
   *   白名单条目失去命中对象（僵尸白名单应删，不得为保绿留下）。
   */
  const INPUT_WHITELIST = [
    { token: 'person-picker-search', reason: '选人器搜索框，person-picker.css:168 完整定义' },
    { token: 'help-search-input', reason: '帮助页搜索，help.html:135 内联完整定义' },
    { token: 'cs-search-input', reason: '自定义下拉内嵌搜索，styles.css:1223 完整定义' },
    { token: 'vote-note', reason: '表态附言多行框，styles.css:2460 完整定义' },
    { token: 'help-role-filter', reason: '帮助页身份筛选，help.html:149 内联完整定义' },
  ];
  const WHITELIST_RE = new RegExp(`(^|\\s)(${INPUT_WHITELIST.map((w) => w.token).join('|')})(\\s|$)`);
  
  /**
   * SD-1 存量（只许降不许升）：R11 Task 2 未清完的 ad-hoc 覆盖。
   * `docs/src` 下 JS 文件的所有权不在 Task 12.1（本任务只能改 `styles.css` 与测试），故按本仓
   * 「收基线纪律」登记为棘轮：清理一处即从表中删一条 / 减计数；新增同类立刻变红。
   */
  const SD1_LEGACY = [
    {
      rel: 'docs/src/components/feedback/issue-detail.js',
      kind: 'rounded',
      max: 2,
      reason: '议题详情状态下拉仍带 `rounded`（Task 2 存量；JS 所有权不在 12.1）',
    },
    {
      rel: 'docs/src/components/governance/workgroup-member-editor.js',
      kind: 'text-sm',
      max: 1,
      reason: '工作组分工下拉仍带 `text-sm`（Task 2 存量；JS 所有权不在 12.1）',
    },
  ];
  
  const CONTROL_RE = /<(input|select|textarea)\b[^>]*>/g;
  
  test('SD-1 控件类单一源：input/select/textarea 必须挂 .input-flat(.input-flat-sm)，且不得再写 ad-hoc 覆盖', () => {
    let total = 0;
    const whitelistHits = new Map(INPUT_WHITELIST.map((w) => [w.token, 0]));
    const unclassified = [];
    const issues = [];
  
    for (const f of FILES) {
      let m;
      CONTROL_RE.lastIndex = 0;
      while ((m = CONTROL_RE.exec(f.code)) !== null) {
        const tag = m[0];
        const cls = classOf(tag);
        const type = (/type="([^"]*)"/.exec(tag) || [null, ''])[1];
        // checkbox / radio / file / hidden 不属文本控件（spec 明文排除）。
        if (/^(checkbox|radio|file|hidden)$/i.test(type)) continue;
        total += 1;
        const at = `${f.rel}:${lineOf(f.code, m.index)}`;
  
        const wl = INPUT_WHITELIST.find((w) => new RegExp(`(^|\\s)${w.token}(\\s|$)`).test(cls));
        if (wl) { whitelistHits.set(wl.token, whitelistHits.get(wl.token) + 1); continue; }
  
        // 表单积木的 class 由函数内常量提供（`${cls}`），常量值必须是 input-flat。
        if (/\$\{cls\}/.test(cls)) {
          assert.equal(f.rel, 'docs/src/components/ui/form-field.js',
            `${at}：只有 form-field.js 允许用 \${cls} 间接提供控件类`);
          const flatDecls = [...f.code.matchAll(/const cls = [^\n]*'input-flat[^']*'/g)].length;
          assert.ok(flatDecls >= 4, `form-field.js 的 cls 常量少于 4 处 input-flat（实际 ${flatDecls}）`);
          continue;
        }
  
        if (!/(^|\s)input-flat(-sm)?(\s|$)/.test(cls)) {
          unclassified.push(`${at} type=${type || '—'} class="${cls.trim()}"`);
          continue;
        }
  
        const standaloneBorder = /(^|\s)border(\s|$)/.test(cls);
        if (/(^|\s)text-sm(\s|$)/.test(cls)) issues.push({ rel: f.rel, kind: 'text-sm', at, cls });
        if (/(^|\s)rounded(-lg)?(\s|$)/.test(cls)) issues.push({ rel: f.rel, kind: 'rounded', at, cls });
        if (standaloneBorder) issues.push({ rel: f.rel, kind: 'border', at, cls });
      }
    }
  
    // 非空转：控件面必须够大（口径写坏 / 面被截断 ⇒ 断言恒真）
    // 2026-11-21 批次 591：考勤筛选行活动下拉由裸 `<select>` 改为 `selectInput(...)`（SD-67），
    //   字面控件少 1 个 ⇒ 下限随实测下调 1（仍远高于「面被截断」的量级，非空转能力不变）。
    assert.ok(total >= 199, `扫描到的控件只有 ${total} 个（下限 199）：SD-1 的扫描面被写坏`);
    // 白名单本身就是口径的一部分：每条至少命中一次，否则是僵尸白名单
    for (const [token, n] of whitelistHits) {
      assert.ok(n >= 1, `SD-1 白名单「${token}」一次都没命中（僵尸白名单，应删或改判据）`);
    }
    assert.deepEqual(unclassified, [],
      `以下控件既未挂 .input-flat / .input-flat-sm，也不在逐条写明理由的白名单内：\n  ${unclassified.join('\n  ')}`);
  
    // ad-hoc 覆盖：逐条与棘轮基线比对（存量只许降不许升）
    const counts = new Map();
    for (const it of issues) counts.set(`${it.rel}|${it.kind}`, (counts.get(`${it.rel}|${it.kind}`) || 0) + 1);
    const offenders = [];
    for (const [key, n] of counts) {
      const [rel, kind] = key.split('|');
      const legacy = SD1_LEGACY.find((l) => l.rel === rel && l.kind === kind);
      const max = legacy ? legacy.max : 0;
      if (n > max) offenders.push(`${rel} 的 ${kind} 由 ${max} 升到 ${n}（${issues.filter((i) => i.rel === rel && i.kind === kind).map((i) => i.at).join(' / ')}）`);
    }
    console.log(`[ui-control-system-guard] SD-1 控件 ${total} 个（白名单命中 ${[...whitelistHits.entries()].map(([k, v]) => `${k}:${v}`).join(' · ')}）`);
    assert.deepEqual(offenders, [],
      `控件同串出现 ad-hoc 覆盖（正确做法：删掉这些类，控件外观只由 .input-flat 定义）：\n  ${offenders.join('\n  ')}`);
  });
  
  /** SD-2：CSS 里有颜色的 solid 边框（用于非空转）与无颜色边框 */
  function borderDecls(css) {
    const out = [];
    const re = /border(?:-(?:top|right|bottom|left))?\s*:\s*([^;{}]+);/g;
    let m;
    while ((m = re.exec(css)) !== null) out.push({ value: m[1].trim(), line: lineOf(css, m.index) });
    return out;
  }
  const COLOR_IN_BORDER = /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|hwb\(|lab\(|lch\(|oklch\(|oklab\(|color-mix\(|var\(|currentColor|transparent|\b(?:white|black|gold)\b/i;
  
  test('SD-2 边框必须有颜色：CSS 无「无颜色 solid」；按钮独立 border 必须同串带色类', () => {
    const solids = borderDecls(CSS).filter((d) => /\bsolid\b/.test(d.value));
    assert.ok(solids.length >= 50, `styles.css 只解析到 ${solids.length} 条 solid 边框（下限 50）：SD-2 口径失效`);
    const colorless = solids.filter((d) => !COLOR_IN_BORDER.test(d.value))
      .map((d) => `styles.css:${d.line} → border: ${d.value};`);
    assert.deepEqual(colorless, [],
      `以下 CSS 边框没有颜色（currentColor 会在深色主题/不同上下文变成黑边）：\n  ${colorless.join('\n  ')}`);
  
    /**
     * 动态色类白名单：独立 `border` 写在静态前缀、颜色由同一函数内的常量提供。
     * 每条都要在下方被「理由仍成立」复核，避免白名单变成垃圾桶。
     */
    const DYNAMIC_BORDER = [
      {
        rel: 'docs/src/entries/tabs/prop/archive-tab.js',
        classMatch: /gallery-feature-btn/,
        mustContain: ['border-gray-200', 'border-sky-200'],
        reason: 'gallery-feature-btn 的颜色由 ${btnCls} 常量提供（两支均有 border-* 色类）',
      },
    ];
  
    let borderButtons = 0;
    const unresolved = [];
    for (const f of FILES) {
      let m;
      const re = /<button\b[^>]*>/g;
      while ((m = re.exec(f.code)) !== null) {
        const tag = m[0];
        const cls = classOf(tag);
        if (!/(^|\s)border(\s|$)/.test(cls)) continue;
        borderButtons += 1;
        const hasColorClass = /(^|\s)border-[^\s]+/.test(cls);
        const hasInline = /border-color\s*:/.test(tag);
        if (hasColorClass || hasInline) continue;
        const dyn = DYNAMIC_BORDER.find((d) => d.rel === f.rel && d.classMatch.test(cls));
        if (dyn) {
          assert.ok(dyn.mustContain.every((t) => f.src.includes(t)),
            `${dyn.rel} 的 SD-2 白名单理由已不成立（缺少 ${dyn.mustContain.join(' / ')}）⇒ 删白名单或补色类`);
          continue;
        }
        unresolved.push(`${f.rel}:${lineOf(f.code, m.index)} class="${cls.trim()}"`);
      }
    }
    assert.ok(borderButtons >= 10, `只有 ${borderButtons} 个按钮带独立 border（下限 10）：SD-2 的按钮扫描面被写坏`);
    console.log(`[ui-control-system-guard] SD-2 solid 边框 ${solids.length} 条 · 带独立 border 的按钮 ${borderButtons} 个`);
    assert.deepEqual(unresolved, [],
      `以下按钮用了独立 border 却没有同串色类 / 内联 border-color（会落到 currentColor）：\n  ${unresolved.join('\n  ')}`);
  });
  
  test('SD-3 控件圆角 8px：CSS 字面量不得出现 4px / 6px；.input-flat(-sm) 走 --radius-sm', () => {
    const radius = [...CSS.matchAll(/border-radius\s*:\s*([^;{}]+);/g)]
      .map((m) => ({ value: m[1].trim(), line: lineOf(CSS, m.index) }));
    assert.ok(radius.length >= 100, `styles.css 只解析到 ${radius.length} 条 border-radius（下限 100）：SD-3 口径失效`);
    const bad = radius.filter((r) => /\b[46]px\b/.test(r.value))
      .map((r) => `styles.css:${r.line} → border-radius: ${r.value};`);
    console.log(`[ui-control-system-guard] SD-3 border-radius 声明 ${radius.length} 条（4/6px 例外 ${bad.length} 条）`);
    assert.deepEqual(bad, [], `圆角不得出现 4px / 6px 例外（控件 8px、卡片 12px、胶囊 999px；`
      + `.tab-group-label 3px 为登记例外）：\n  ${bad.join('\n  ')}`);
  
    assert.match(CSS, /--radius-sm:\s*8px/, '--radius-sm 必须为 8px');
    const flat = /(^|\n)\.input-flat\s*\{([^}]*)\}/.exec(CSS_BARE);
    assert.ok(flat, '缺少 .input-flat 规则');
    assert.match(flat[2], /border-radius:\s*var\(--radius-sm\)/, '.input-flat 的圆角必须取 --radius-sm');
    const flatSm = /(^|\n)\.input-flat-sm\s*\{([^}]*)\}/.exec(CSS_BARE);
    assert.ok(flatSm, '缺少 .input-flat-sm 规则');
    assert.match(flatSm[2], /border-radius:\s*var\(--radius-sm\)/, '.input-flat-sm 的圆角必须取 --radius-sm');
  });
  
  test('SD-4 披露控件统一：全局移除 summary 三角，且 <summary> 上无 list-none 例外', () => {
    const base = /(^|\n)\s*summary\s*\{([^}]*)\}/.exec(CSS_BARE);
    assert.ok(base, 'styles.css 缺少全局 `summary { list-style: none }`');
    assert.match(base[2], /list-style:\s*none/, 'summary 必须去掉 UA marker（list-style: none）');
    const webkit = /(^|\n)\s*summary::-webkit-details-marker\s*\{([^}]*)\}/.exec(CSS_BARE);
    assert.ok(webkit, '缺少 summary::-webkit-details-marker 规则');
    assert.match(webkit[2], /display:\s*none/, 'summary::-webkit-details-marker 必须 display:none');
  
    let summaryTags = 0;
    let listNone = 0;
    for (const f of FILES) {
      const re = /<summary\b[^>]*>/g;
      let m;
      while ((m = re.exec(f.code)) !== null) {
        summaryTags += 1;
        if (/(^|\s)list-none(\s|$)/.test(classOf(m[0]))) listNone += 1;
      }
    }
    assert.ok(summaryTags >= 20, `只扫描到 ${summaryTags} 个 <summary>（下限 20）：SD-4 口径失效`);
    console.log(`[ui-control-system-guard] SD-4 <summary> ${summaryTags} 个 · list-none 例外 ${listNone} 个`);
    assert.equal(listNone, 0, `逐点 list-none 例外必须清零（全局规则已统一），实际 ${listNone} 个`);
  });
  
  test('SD-6 浅主题底不显白：.btn-accent-soft 消费 soft 三件套（手选 hex，非 color-mix）', () => {
    // 2026-10-23 批次 506：浅底/深字不再由 color-mix 派生——每主题 softBg/softText 是手选 hex，
    //   非法 `--neutral-0` 近白仍禁止；`--app-accent-deep` 仅作兼容别名（= softText），不再是独立令牌。
    assert.match(CSS, /--app-accent-soft-bg:\s*var\(--app-accent-soft-bg-light\)/, '缺少 softBg 别名');
    assert.match(CSS, /--app-accent-soft-text:\s*var\(--app-accent-soft-text-light\)/, '缺少 softText 别名');
    const soft = /\.btn-accent-soft\s*\{([^}]*)\}/.exec(CSS);
    assert.ok(soft, '缺少 .btn-accent-soft 规则');
    const bg = /background(?:-color)?\s*:\s*([^;]+);/.exec(soft[1]);
    assert.ok(bg, '.btn-accent-soft 必须显式声明背景');
    const value = bg[1].trim();
    assert.notEqual(value, 'var(--neutral-0)', '.btn-accent-soft 的背景不得为 --neutral-0（近白）');
    assert.ok(/var\(--app-accent-soft-bg\)/.test(value),
      `.btn-accent-soft 的背景必须是 softBg token（明显着色），实际：${value}`);
    assert.ok(!/color-mix\(/.test(value), `.btn-accent-soft 的背景不得再用 color-mix 派生，实际：${value}`);
    assert.match(soft[1], /color:\s*var\(--app-accent-soft-text\)/, '.btn-accent-soft 的文字必须用 softText token');
  });
  
  test('SD-9 页签组名可见：groupLabel 渲染为非空文本，且存在 .tab-group-sep', () => {
    const labelLine = TAB_BAR.split('\n').find((l) => l.includes('class="tab-group-label"')) || '';
    assert.ok(labelLine, 'tab-bar.js 未渲染 .tab-group-label');
    assert.match(labelLine, /\$\{groupName\}/, '组名必须是可见文本（${groupName}），不能是空 span');
    assert.doesNotMatch(labelLine, /class="tab-group-label"[^>]*>\s*<\/span>/, '组名不得渲染为空 span');
    assert.match(TAB_BAR, /const groupName = String\(groupLabel \?\? ''\)\.trim\(\)/, '组名必须来自 groupLabel 去空白');
    assert.ok(TAB_BAR.includes('tab-group-sep'), 'tab-bar.js 缺少组间分隔线 .tab-group-sep');
    assert.match(CSS, /\.tab-group-sep\s*\{[^}]*width:\s*1px/, 'styles.css 缺少 .tab-group-sep 的 1px 线');
    // 非空转：页签模板确实读 groupLabel（否则上面的「可见文本」只是巧合）
    assert.ok((TAB_BAR.match(/groupLabel/g) || []).length >= 2, 'tab-bar.js 对 groupLabel 的引用少于 2 处：口径可能被写坏');
  });
  
  test('SD-10 正文字号下限：今天页 / 待办无 10/11px；--text-xs ≥ 0.75rem', () => {
    for (const [rel, src, floor] of [
      ['today-tab.js', TODAY, 10],
      ['todo-tab-shell.js', TODO_SHELL, 5],
    ]) {
      const c10 = (src.match(/text-\[10px\]/g) || []).length;
      const c11 = (src.match(/text-\[11px\]/g) || []).length;
      const candidates = (src.match(/text-xs|text-\[12px\]/g) || []).length;
      assert.ok(candidates >= floor,
        `${rel} 只解析到 ${candidates} 处 12px 档（下限 ${floor}）：SD-10 的扫描面被写坏`);
      assert.equal(c10, 0, `${rel} 仍有 ${c10} 处 text-[10px]（正文不得小于 12px）`);
      assert.equal(c11, 0, `${rel} 仍有 ${c11} 处 text-[11px]（正文不得小于 12px）`);
    }
    const m = /--text-xs:\s*([\d.]+)rem/.exec(CSS);
    assert.ok(m, 'styles.css 缺少 --text-xs 定义');
    const rem = Number(m[1]);
    assert.ok(rem >= 0.75, `--text-xs 为 ${m[1]}rem（< 0.75rem / 12px）：正文档被写小`);
  });
  
  // ═════════════════════════════════════════════════════════════════════════════
  // B1–B8：原 `button-system-guard.test.mjs`（按钮体系 ＋ 死字段）逐条搬入
  // ═════════════════════════════════════════════════════════════════════════════
  /**
   * 按钮体系 ＋ 死字段 守卫（批次 287 立 / 批次 288 按在force口径重写）
   *
   * 来源（支书裁定）：
   *   「如果是 button 我要求**所有的界面**都统一！」（支书 2026-09-29）
   *   「历史的经验教训要谨防再犯！」（支书 2026-09-29；→ B1）
   *   在force尺寸口径＝`docs/src/styles.css` 的「按钮尺寸规范」（**支书指令 2026-08-06**
   *   ：全站一次规范，**同一界面按钮高度差距不过大**）——**四档**。
   *
   * ⚠ 批次 287 的**错误**（本文件重写的原因）：当时把口径写成「按钮必须走 `.btn` 四变体」，
   *   而 **`.btn` / `.btn--primary` / `.btn--sm` 在 `styles.css` 里根本不存在**
   *   （实际只有 `.btn-action*` / `.btn-md*` / `.btn-tab*` / `.btn-accent*`）。
   *   ⇒ 该口径指向未实现的类名、并把它自造的 316 个"越轨"当成缺陷。**已按在force四档重写**。
   *
   * B1【死字段】`docs/src/**` **不得引用已被移除的字段**。
   *   教训：批次 280 把首页通知归并建在 `systemDerived` 上，而该标记**已随 R-22 移除**
   *   （见 `docs/src/services/governance/notice.js` 批注）⇒ 判定恒假、**归并静默失灵**。
   *
   * B2【按钮尺寸档】每个 `<button>` 必须命中**四档之一**（或命名族），否则＝**第五种高度**（越轨）。
   *   档1 微操作 25px ：`.btn-action*`
   *   档2 默认　30px ：`text-xs` + `py-1.5`
   *   档3 行内对齐 34px：`text-xs` + `py-2`
   *   档4 主 CTA 34px：`text-sm` + （`py-1.5` 带边框 / `py-[7px]` 无边框）
   *   命名族（另有其自身尺寸口径）：`.btn-md*` / `.btn-tab*` / `.btn-accent*`
   *   **例外**（非按钮，不判）：`sr-only` 隐藏语义按钮；**无 `px-`/`py-`/`btn` 的纯文字动作**（如「全部 ›」）。
   *   ⚠ 上限是**棘轮**：归位后**必须一并下调**（批次 288 实测真值 103；三屏已归零，
   *     早前 316＝错口径、147＝正则缺陷 `py-\[7px\]\b` 的 `\b` 永不成立 ⇒ 均已修）。
   *
   * B3【台账】打印**逐文件越轨清单**，供 ③-c「先三屏、再铺开」归位使用。
   *
   * B4【按钮族棘轮】未入**语义族**的 `<button>` 数**只许降不许升**（2026-09-30 批次 297-1 立）。
   *   来源：支书 2026-09-30 裁「⑦ 按钮族＝**全面归一**」＋「**新立 4 族**（中性 / 描边 / 文字 / 危险）」。
   *   目标族谱（**全站按钮只准用这 8 族**，单一源＝`styles.css`「按钮族谱补全」段 ＋ `DESIGN_SYSTEM §4.1`）：
   *     主操作 `.btn-accent` · 次主操作 `.btn-accent-soft` · 微操作 `.btn-action*` · **中性 `.btn-neutral`** ·
   *     **描边 `.btn-outline`** · **文字 `.btn-ghost`** · **危险 `.btn-danger`** · 命名族 `.btn-md*` / `.btn-tab*`。
   *   基线＝**批次 297-1 实测 454**（手写 344 ＋ 含 btn 词干非族 110）；**每迁完一屏一并下调基线**（收基线纪律）。
   *
   * B5【族·语义一致】`.btn-ghost` **不得带内联实底**（2026-09-30 批次 300 立）。
   *   来源：支书 2026-09-30 原话「**button 还有漏网之鱼？请全面检查，所有的角色！**」——实测全站
   *   55+ 处 `class="btn-ghost…"` ＋ 内联 `background:var(--party-red)` 等**实底**＝「**借文字族的
   *   形状伪装主操作实底**」。`B4` 只查「类名是否入族」（`btn-ghost` 在族内 ⇒ 不报），故这整类
   *   **用错族**长期隐形。判据见 `DESIGN_SYSTEM §4.1 何时用哪族`：主操作→`.btn-accent` ·
   *   危险→`.btn-danger(-solid)` · 中性→`.btn-neutral` · 次主操作→`.btn-accent-soft`。
   *   基线＝**批次 300 归一后实测 0**（棘轮：只许降不许升）。
   */
  const __dirname = HERE;
  
  /** B1：已移除 / 从未有写入方的字段（引入即静默失灵）—— 只可增补，不可删除 */
  const DEAD_FIELDS = [
    { key: 'systemDerived', reason: 'R-22 已移除该标记（notice.js 批注）；引用即判定恒假' },
  ];
  
  /** 四档 ＋ 命名族（在force口径，单一源＝`styles.css` COMPONENT: Button 段） */
  const TIERS = [
    // 档1 微操作：命名族 `.btn-action` **或** 与其等高的 13px 正文档微操作
    //   （`text-[13px] px-2 py-0.5`——13px 系 **2026-09-14 支书裁定的全站正文单档**
    //    〔见 `styles.css:337`「全站正文 13px、控件 38px」〕，`py-0.5` 后高 ≈25px 与档1 等值）。
    //   ⚠ 判据按**高度等值**，不按写法排斥——写法不同但同高即合规（避免"只认一种写法"的假阳性）。
    //   ⚠⚠ **易错点（本文件已犯两次）**：`]` 是非单词字符，`\]\b` 在其后接空格/引号时**永不成立** ⇒
    //       任意值类名（`text-[13px]` / `py-[7px]`）的匹配**一律不要写尾随 `\b`**。
    { id: '档1/25px', hit: (c) => /\bbtn-action\b/.test(c)
      // 档1 等值写法（**系统性**，非偶发）：`(text-xs|text-[13px]) + px-2.5 py-1` ≈ 26px，
      //   与 `.btn-action`(25px) **仅差 1px**；该写法在 ≥15 个屏一致复用（名册/支部/纪检/宣传/待办…），
      //   属既有微操作约定 ⇒ 判合规（判据是**高度**，不是写法）。
      || (/text-xs|text-\[13px\]/.test(c) && /\bpy-1\b/.test(c))
      || (/\bpy-0\.5\b/.test(c) && !/text-sm/.test(c)) },
    { id: '档2/30px', hit: (c) => /\btext-xs\b/.test(c) && /\bpy-1\.5\b/.test(c) && !/\btext-sm\b/.test(c) },
    { id: '档3/34px', hit: (c) => /\btext-xs\b/.test(c) && /\bpy-2\b/.test(c) },
    { id: '档4/34px', hit: (c) => /\btext-sm\b/.test(c) && (/\bpy-1\.5\b/.test(c) || /py-\[7px\]/.test(c)) },
    { id: '命名族', hit: (c) => /\b(btn-md|btn-tab|btn-accent)\b/.test(c) },
    // 档6/44px 工作台页签（2026-11-16 批次 557 支书批准 · spec polish-shell-and-display-truth T2）：
    //   顶部页签视觉高 44（`min-h-11`）＋ 13px 正文（`.text-body-sm`）；尺寸与命中区单一源＝
    //   `styles.css .tab-btn`（`::after` 44×44），不属四档动作按钮。判据同时要求 `tab-btn` 与
    //   `min-h-11`，任意其它按钮再多写 `min-h-11` 也不会被本档放行。
    { id: '档6/44px 页签', hit: (c) => /\btab-btn\b/.test(c) && /\bmin-h-11\b/.test(c) },
    // 档5＝**U5b（2026-09-07 支书批准）**：**低频操作钮**（导出 / 打印 / 分页）统一 **32px**，
    //   与分页钮 / 下拉**同高同 border 家族**（见 `disc/attendance-tab.js` 同处注释）。**在force，勿归位**。
    { id: '档5/32px 低频', hit: (c) => /\bh-8\b/.test(c) },
  ];
  
  /**
   * 例外（不判）：
   *   ① `sr-only` 隐藏语义按钮；
   *   ② **纯文字动作**（无 `px-`/`py-`/`btn`，如「全部 ›」）——导航，不是按钮；
   *   ③ **行式载体**（`w-full` ＋ `text-left`，如首页「今天有会/本岗待办」整行可点条）——
   *      高度由行内容决定，属 `§4.19` 内嵌行块，**不是按钮档**；强塞 25/30/34px 会破坏行布局；
   *   ④ **主题预览卡**（2026-10-23 批次 505）：`appearance-controls.js` 的 7 个主题项是
   *      「带 `aria-pressed` 的主题色预览控件」（内含两枚 20px 小样），不是动作按钮；
   *      尺寸由 `.appearance-*` 段与 `min-w-[104px]` 自身口径决定，不并入动作按钮四档。
   *   ⚠ 批次 288 修正：早前 `py-\[7px\]\b` 中的 `\]` 后接空格 ⇒ `\b` 永不成立，
   *      导致**「主 CTA 档」被整体误判为越轨**（错数由此虚高）。**已修**。
   */
  const isExempt = (c) => /\bsr-only\b/.test(c)
    // 无纵向内边距 ⇒ 高度由**行高 / CSS** 决定，属**文字动作或 CSS 族**，不在「按钮高度档」范畴。
    || !/\bpy-/.test(c)
    // 行式载体（整行可点条目）：`w-full` **或** `flex-1` ＋ `text-left` ⇒ 高度由行内容决定（归 `§4.19`）。
    || (/\b(w-full|flex-1)\b/.test(c) && /\btext-left\b/.test(c));
  
  /** 主题预览卡放行判据（见例外④）：标签同时带 `data-accent-key` 与 `aria-pressed` */
  const isThemePreview = (tag) => /\bdata-accent-key=/.test(tag) && /\baria-pressed=/.test(tag);
  
  /** 棘轮上限（越轨数）：**已归零（批次 290）** ⇒ 此后**任何**新按钮都必须落档，零容忍 */
  const BUTTON_OFF_BUDGET_CEILING = 0;
  
  function walkJs(dir, out = []) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) walkJs(p, out);
      else if (name.endsWith('.js')) out.push(p);
    }
    return out;
  }
  
  const BTN_FILES = walkJs(SRC);
  
  /**
   * **CSS 命名族校验**（而非按名字猜）：把 `styles.css` 里**确实定义过的**类名收进集合；
   * 某 `<button>` 的类名里若含「已定义 ＋ 名字带 `btn`/`button`」的令牌 ⇒ 判为**命名族**
   * （其尺寸由该 CSS 块自理，已由 `styles.css` 的按钮尺寸规范覆盖）。
   * 典型：`.ref-doc-action-btn`（`styles.css:2173`）/ `.page-btn`（`:898`）/ `.vote-btn`（`:1774`）。
   */
  const CSS_SRC = CSS;
  const CSS_CLASSES = new Set([...CSS_SRC.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]));
  const isCssNamedFamily = (c) => c.split(/\s+/)
    // `chip` 亦属**表单命名族**（`styles.css:776`：「表单内的 chip（.chip-option）」）——
    // 其高度由该 CSS 块定，不属按钮高度档。
    .some((t) => /(btn|button|chip)/.test(t) && CSS_CLASSES.has(t));
  
  test('B1 死字段：docs/src 不得引用已被移除的字段', () => {
    const hits = [];
    for (const f of BTN_FILES) {
      const src = readFileSync(f, 'utf8');
      for (const { key, reason } of DEAD_FIELDS) {
        if (new RegExp(`\\.${key}\\b`).test(src)) {
          hits.push(`${relative(join(__dirname, '..', '..'), f)} → .${key}（${reason}）`);
        }
      }
    }
    assert.deepEqual(hits, [], `发现对已移除字段的引用（判定会恒假、行为静默失灵）：\n${hits.join('\n')}`);
  });
  
  test('B2 按钮尺寸档：<button> 必须命中四档之一（或命名族）', () => {
    const perFile = new Map();
    let total = 0;
    for (const f of BTN_FILES) {
      const src = readFileSync(f, 'utf8');
      const re = /<button[^>]*\bclass="([^"]*)"/g;
      let m;
      while ((m = re.exec(src)) !== null) {
        const cls = m[1];
        const tagEnd = src.indexOf('>', re.lastIndex);
        const tag = src.slice(m.index, tagEnd === -1 ? src.length : tagEnd + 1);
        if (isExempt(cls)) continue;
        if (isThemePreview(tag)) continue; // 例外④：主题预览卡（不是动作按钮）
        if (isCssNamedFamily(cls)) continue;
        if (TIERS.some((t) => t.hit(cls))) continue;
        total += 1;
        const line = src.slice(0, m.index).split('\n').length;
        if (!perFile.has(f)) perFile.set(f, []);
        perFile.get(f).push(`${line}: ${cls.trim()}`);
      }
    }
    // B3 台账：逐文件越轨清单（**文件:行号 + 类名**，供 ③-c 精确归位）
    const ledger = [...perFile.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([f, list]) => `  ${String(list.length).padStart(3)}  ${relative(join(__dirname, '..', '..'), f)}\n`
        + list.map((s) => `         - ${s}`).join('\n'));
    console.log(`[button-system-guard] 未命中档的 <button> 共 ${total} 个（棘轮上限 ${BUTTON_OFF_BUDGET_CEILING}）：\n${ledger.join('\n')}`);
    assert.ok(
      total <= BUTTON_OFF_BUDGET_CEILING,
      `未命中四档的 <button> 由 ${BUTTON_OFF_BUDGET_CEILING} 升到 ${total} 个 ⇒ 新按钮须落在 styles.css「按钮尺寸规范」四档之一。`,
    );
  });
  
  // ═════════════════════════════════════════════════════════════════════════════
  // T3-1 … T3-3：组件契约（2026-10-25 · `历史 spec（已删）` Task 3）
  //   契约：折叠＝原生 details；菜单＝button + aria-expanded + aria-controls；浮窗＝modal.js；
  //         标题永远不进交互元素（兄弟节点 + aria-labelledby）。
  //   本组三条断言只做静态扫描（同本文件其它用例），不依赖真实 DOM。
  // ═════════════════════════════════════════════════════════════════════════════
  
  test('T3-1 交互元素内无标题：button / summary / role=button 内不得出现 h1..h6 或 role=heading', () => {
    const hits = [];
    let scanned = 0;
    for (const f of FILES) {
      // button / summary：原生元素不允许同类嵌套 ⇒ 非贪婪取到对应闭标签即可
      const re = /<(button|summary)\b[^>]*>([\s\S]*?)<\/\1>/g;
      let m;
      while ((m = re.exec(f.code)) !== null) {
        scanned += 1;
        if (/<h[1-6]\b|role="heading"/.test(m[2])) {
          hits.push(`${f.rel}:${lineOf(f.code, m.index)} <${m[1]}> 内出现标题`);
        }
      }
      // role=button 容器：取到第一个同名闭标签（div / span / li / a / tr）
      const reRole = /<([a-z][a-z0-9]*)\b[^>]*role="button"[^>]*>([\s\S]*?)<\/\1>/g;
      let r;
      while ((r = reRole.exec(f.code)) !== null) {
        scanned += 1;
        if (/<h[1-6]\b|role="heading"/.test(r[2])) {
          hits.push(`${f.rel}:${lineOf(f.code, r.index)} role=button 容器内出现标题`);
        }
      }
    }
    // 非空转：交互元素面必须够大（口径写坏 / 面被截断 ⇒ 恒真）
    assert.ok(scanned >= 200, `只扫描到 ${scanned} 个交互元素（下限 200）：T3-1 的扫描面被写坏`);
    console.log(`[ui-control-system-guard] T3-1 交互元素 ${scanned} 个 · 内含标题 ${hits.length} 处`);
    assert.deepEqual(hits, [],
      `标题不得进入交互元素（须为兄弟节点，用 aria-labelledby 关联）：\n  ${hits.join('\n  ')}`);
  });
  
  test('T3-2 折叠状态可静态回读：summary 必在 details 内；aria-expanded 必带 aria-controls', () => {
    const problems = [];
    let detailFiles = 0;
    let expandToggles = 0;
    for (const f of FILES) {
      const summaries = (f.code.match(/<summary\b/g) || []).length;
      const details = (f.code.match(/<details\b/g) || []).length;
      if (details > 0) detailFiles += 1;
      if (summaries > details) {
        problems.push(`${f.rel}: <summary> ${summaries} 个 > <details> ${details} 个（存在孤立 summary）`);
      }
      const re = /<[a-z][a-z0-9]*\b[^>]*\baria-expanded="[^"]*"[^>]*>/g;
      let m;
      while ((m = re.exec(f.code)) !== null) {
        expandToggles += 1;
        if (!/\baria-controls="/.test(m[0])) {
          problems.push(`${f.rel}:${lineOf(f.code, m.index)} aria-expanded 缺 aria-controls`);
        }
      }
    }
    // 非空转：两种原语都必须有足够样本
    assert.ok(detailFiles >= 8, `只有 ${detailFiles} 个文件使用 <details>（下限 8）：折叠口径被写坏`);
    assert.ok(expandToggles >= 10, `只扫描到 ${expandToggles} 个静态 aria-expanded（下限 10）：口径被写坏`);
    console.log(`[ui-control-system-guard] T3-2 details 文件 ${detailFiles} 个 · 静态 aria-expanded ${expandToggles} 个`);
    assert.deepEqual(problems, [],
      `折叠状态必须可静态回读（details/open 或 aria-expanded + aria-controls）：\n  ${problems.join('\n  ')}`);
  });
  
  test('T3-3 同一文件同类折叠只用一种原语（菜单除外）', () => {
    const offenders = [];
    let detailsFiles = 0;
    for (const f of FILES) {
      if (!/<details\b/.test(f.code)) continue;
      detailsFiles += 1;
      const re = /<button\b[^>]*\baria-expanded="[^"]*"[^>]*>/g;
      let m;
      while ((m = re.exec(f.code)) !== null) {
        // 菜单（aria-haspopup）与导航抽屉（sidebar）不是「阅读型折叠」，不算同类
        if (/aria-haspopup="(menu|true)"/.test(m[0])) continue;
        if (/aria-controls="app-sidebar"/.test(m[0])) continue;
        offenders.push(`${f.rel}:${lineOf(f.code, m.index)} 同一文件同时出现 details 与 aria-expanded 折叠`);
      }
    }
    assert.ok(detailsFiles >= 8, `只有 ${detailsFiles} 个文件使用 <details>（下限 8）：T3-3 的扫描面被写坏`);
    console.log(`[ui-control-system-guard] T3-3 details 文件 ${detailsFiles} 个 · 混用 ${offenders.length} 处`);
    assert.deepEqual(offenders, [],
      `同一文件同类折叠只能用一种原语（阅读型 details；动作型 aria-expanded；菜单除外）：\n  ${offenders.join('\n  ')}`);
  });
  
  /**
   * T4-1【同一文件只允许一种折叠头实现】（2026-10-25 · Task 4「同屏纵向一致」）
   *   判据：同一文件不得既用 `renderDisclosure(...)`（标题为兄弟 H3 的封装）又手写
   *   `<details>` / `<summary>`（折叠头写在 summary 里）——两种折叠头会让**同一屏**出现
   *   两种 chevron / 内边距 / 标题层级，正是支书指出的「纵向不一致」。
   *   与 T3-3 的分工：T3-3 管「details ↔ aria-expanded」原语混用；本条管「封装 ↔ 手写」混用。
   *   豁免（逐条给理由，且不得僵尸化）：组件定义自身 + 两处**行内清单**折叠（不是分区折叠头）。
   */
  const FOLD_HEAD_EXEMPTIONS = [
    {
      rel: 'docs/src/components/ui/disclosure.js',
      reason: '折叠封装的唯一实现本身：模板就是 `<details>/<summary>`，不是第二次手写',
    },
    {
      rel: 'docs/src/entries/tabs/prop/archive-tab.js',
      reason: '「归档记录」一处历史 `<details id="archive-display-fold">`（行内展示折叠，非分区折叠头；'
        + 'archive-display-fold 另被深链守卫按 id 依赖，迁移需单批）',
    },
    {
      rel: 'docs/src/entries/tabs/leader/write-tab.js',
      reason: '活动行内「外出提醒清单」`<details class="leader-outdoor-check">`（行内清单，'
        + '不是分区折叠头；点击委托按该类名跳过）',
    },
  ];
  
  test('T4-1 同一文件只允许一种折叠头实现：renderDisclosure 与手写 details/summary 不混用', () => {
    const offenders = [];
    let rendererFiles = 0;
    let markupFiles = 0;
    for (const f of FILES) {
      if (!f.rel.endsWith('.js')) continue;
      const usesRenderer = /renderDisclosure\s*\(/.test(f.code);
      const usesMarkup = /<(?:details|summary)\b/.test(f.code);
      if (usesRenderer) rendererFiles += 1;
      if (usesMarkup) markupFiles += 1;
      if (usesRenderer && usesMarkup) offenders.push(f.rel);
    }
    // 非空转：两条实现路径都必须有足够样本（口径写坏 / 面被截断 ⇒ 本条恒真）
    assert.ok(rendererFiles >= 2, `只有 ${rendererFiles} 个文件使用 renderDisclosure（下限 2）：扫描面被写坏`);
    assert.ok(markupFiles >= 8, `只有 ${markupFiles} 个文件手写 details/summary（下限 8）：扫描面被写坏`);
  
    const exempt = new Set(FOLD_HEAD_EXEMPTIONS.map((e) => e.rel));
    const zombie = FOLD_HEAD_EXEMPTIONS.filter((e) => !offenders.includes(e.rel)).map((e) => e.rel);
    assert.deepEqual(zombie, [], `FOLD_HEAD_EXEMPTIONS 里有已不混用的文件（僵尸豁免，请删除）：\n  ${zombie.join('\n  ')}`);
    assert.deepEqual(offenders.filter((rel) => !exempt.has(rel)), [],
      '同一文件混用了两种折叠头（renderDisclosure 与手写 details/summary）——同屏会出现两种折叠头形态：\n'
      + offenders.filter((rel) => !exempt.has(rel)).map((rel) => `  ${rel}`).join('\n'));
    console.log(`[ui-control-system-guard] T4-1 renderDisclosure 文件 ${rendererFiles} 个 · 手写折叠文件 ${markupFiles} 个 · 混用 ${offenders.length - zombie.length} 处（豁免 ${exempt.size}）`);
  });
  
  /** 语义族令牌（B4 判据单一源；与 `styles.css`「按钮族谱补全」段、`DESIGN_SYSTEM §4.1` 三处同源） */
  const FAMILY_TOKENS = [
    'btn-accent-soft', 'btn-accent', 'btn-action', 'btn-md', 'btn-tab',
    'btn-neutral', 'btn-outline', 'btn-ghost', 'btn-danger',
    // 2026-10-26 Task 5：第二档「纯文字动作」——无描边/底色，静态线索＝下划线；
    //   它不是动作按钮族，但必须入册，才能让 B4（未入族 = 手写按钮）继续为零。
    'btn-text',
  ];
  /** B4 棘轮基线（批次 297-2 全站归一后实测 **0**；**只许下调**） */
  const HANDWRITTEN_BUTTON_BASELINE = 0;
  
  /**
   * B4 **豁免清单**（判据改准 · 2026-09-30 批次 297-2 收窄；支书裁「组件自带强调色的控件豁免并回退」）
   * ——**组件自带选中态强调色**（用自己的 `--xxx-accent` 变量）的控件不并入 8 族：它们各自即「命名族」。
   * 每条须写明「哪个组件 / 选中态从哪来」，**不得按名字猜**（受 `D-668` 结构性判据须自实况归纳约束）。
   */
  const COMPONENT_STATE_EXEMPT = [
    '-tab-btn', // 页头 tab（`components/shell/tab-bar.js` 单一源）：选中态＝`.tab-btn-active` ＋ 内联 `--tab-accent`
    'subtab', // 页内二级切换（党委上报/下发通知共用）：选中态＝`.subtab[aria-selected="true"]`，2026-10-18 工作台提质
    'sidebar-footer-action', // 侧栏页脚动作（帮助/设置/登录/退出）：尺寸单一源＝styles.css 同名类（桌面 22.4 / 移动 44，`D-913`），低频紧凑档
    'todo-more__item', // 待办行尾更多菜单项：尺寸单一源＝styles.css 同名类，菜单项不是独立动作按钮
    'metric-band__item', // 概况结论带指标（筛选/定位控件，不是动作按钮）：选中态＝`.is-active` ＋ `--app-accent-bg`，尺寸由 styles.css 同名类定
    'gp-group-card', // 党小组选择卡（整卡可点，视觉由卡片边框/底色承担；不是动作按钮）
    'modal-close-btn', // 弹窗关闭 ×（2026-10-23 R11 P1-11）：形态/尺寸自有类（styles.css `.modal-close-btn`＋移动端 36px 命中区），不是动作按钮，不并入 8 族
    // 2026-10-23 批次 505：`.tint-action`＝**组件自带固定语义色**的动作按钮（`data-tone` 驱动金/成功/信息/危险，
    //   不随主题色变化；见 inspector.js / taskforce-tab.js）。它是「组件自有强调色」的既有豁免类，
    //   尺寸走动作按钮档 2（text-xs + py-1.5），故不并入主题色 8 族。
    'tint-action',
  ];
  
  test('B4 按钮族棘轮：未入语义族的 <button> 只许降不许升（「全面归一」的进度表）', () => {
    const walk = (dir, out = []) => {
      for (const n of readdirSync(dir)) {
        const p = join(dir, n);
        if (statSync(p).isDirectory()) walk(p, out);
        else if (n.endsWith('.js')) out.push(p);
      }
      return out;
    };
    let handwritten = 0;
    let exempt = 0;
    let themePreview = 0;
    const perFile = new Map();
    const re = /<button[^>]*\bclass="([^"]*)"/g;
    for (const f of walk(SRC)) {
      // 2026-10-25 Task 3：MenuButton 的按钮类由**调用方**传入（必须落 8 族之一），
      //   组件模板里的 `${buttonClassName}` 无法静态归族 ⇒ 该文件不参与本棘轮。
      if (f.endsWith('menu-button.js')) continue;
      const src = readFileSync(f, 'utf8');
      let m;
      while ((m = re.exec(src)) !== null) {
        const cls = m[1];
        const tagEnd = src.indexOf('>', re.lastIndex);
        const tag = src.slice(m.index, tagEnd === -1 ? src.length : tagEnd + 1);
        // 2026-10-23 批次 505：主题预览卡＝带 aria-pressed 的预览控件（例外④），不是动作按钮。
        if (isThemePreview(tag)) { themePreview += 1; continue; }
        // ⚑ 2026-09-30 批次 297-2 **收窄判据**（支书裁「**组件自带强调色的控件豁免并回退**」＋
        //   「把这些页头 tab 恢复到之前的模式」）：**组件自带选中态强调色**（用自己的 `--xxx-accent`
        //   变量，不随通用主题族走）的控件**不并入 8 族**——它们各自就是「命名族」。
        //   判据＝class 串命中组件自有类（字面可见，不按名字猜：`tab-bar.js` 已把 `${prefix}-tab-btn` 内联）。
        if (COMPONENT_STATE_EXEMPT.some((t) => cls.includes(t))) { exempt += 1; continue; }
        if (FAMILY_TOKENS.some((t) => new RegExp(`(^|\\s)${t}`).test(cls))) continue;
        handwritten += 1;
        if (!perFile.has(f)) perFile.set(f, 0);
        perFile.set(f, perFile.get(f) + 1);
      }
    }
    const ledger = [...perFile.entries()].sort((a, b) => b[1] - a[1])
      .map(([f, n]) => `  ${String(n).padStart(3)}  ${relative(join(__dirname, '..', '..'), f)}`);
    console.log(`[button-system-guard] 未入语义族的 <button> 共 ${handwritten} 个（棘轮上限 ${HANDWRITTEN_BUTTON_BASELINE}）；组件自有类豁免 ${exempt} 个（${COMPONENT_STATE_EXEMPT.join(' / ')}）；主题预览卡 ${themePreview} 个：\n${ledger.join('\n')}`);
    assert.ok(
      handwritten <= HANDWRITTEN_BUTTON_BASELINE,
      `未入语义族的 <button> 由 ${HANDWRITTEN_BUTTON_BASELINE} 升到 ${handwritten} 个 ⇒ 新按钮须走 8 族之一（${FAMILY_TOKENS.join(' / ')}）；每迁完一屏请一并下调基线。`,
    );
  });
  
  /** B5 棘轮基线（批次 300 归一后实测 **0**；只许下调） */
  const GHOST_SOLID_BASELINE = 0;
  
  test('B5 族·语义一致：.btn-ghost 不得带内联实底（借文字族形状伪装实底）', () => {
    const offenders = [];
    const tagRe = /<button\b[^>]*>/g;
    for (const f of BTN_FILES) {
      const src = readFileSync(f, 'utf8');
      let m;
      while ((m = tagRe.exec(src)) !== null) {
        const tag = m[0];
        const cls = (/class="([^"]*)"/.exec(tag) || [null, ''])[1];
        if (!/(^|\s)btn-ghost(?![\w-])/.test(cls)) continue;
        const style = (/style="([^"]*)"/.exec(tag) || [null, ''])[1];
        // 运行期动态样式（含模板表达式）⇒ 豁免：此类＝**组件自带状态**（选中态/色板等），
        //   正是 `D-712` 收窄口径「组件自带强调色的控件豁免」所指（如 `${brandBtnStyle}` / `${accent.hex}`）。
        if (style.includes('${')) continue;
        const bg = (/background\s*:\s*([^;"]+)/.exec(style) || [null, ''])[1].trim();
        if (!bg) continue;
        if (/^(none|transparent)$/i.test(bg)) continue;   // 本就不是实底
        const line = src.slice(0, m.index).split('\n').length;
        offenders.push(`  ${relative(join(__dirname, '..', '..'), f)}:${line} → ${bg}`);
      }
    }
    console.log(`[button-system-guard] .btn-ghost 带内联实底的 <button> 共 ${offenders.length} 个（棘轮上限 ${GHOST_SOLID_BASELINE}）：\n${offenders.join('\n')}`);
    assert.ok(
      offenders.length <= GHOST_SOLID_BASELINE,
      `'.btn-ghost' 带内联实底的 <button> 有 ${offenders.length} 个（上限 ${GHOST_SOLID_BASELINE}）⇒ 实底须归主操作 / 危险 / 中性族，勿借文字族形状。`,
    );
  });
  
  /**
   * B6【尺寸归一单一源】（2026-10-18 立；2026-10-23 Task 6 改为 padding + line-height 推导）
   *   来源：支书反馈「有的厚、有的薄；有的字大、有的字小」⇒ 裁定**全局 CSS 归一**：
   *   8 个语义族的高度 / 字号 / 内边距只由 `styles.css` 的「按钮尺寸归一（2026-10-18）」段决定，
   *   页面不再用 `text-* / py-* / px-* / h-*` 零散决定厚薄。
   *   判据：
   *     ① 该段存在；
   *     ② **2026-10-23 Task 6 口径**：36px 标准档（accent / accent-soft / outline / neutral /
   *        danger / danger-solid / md）、32px 紧凑档（ghost / tab）、28px 小号档（sm / action）；
   *        高度 = 上下 padding + 显式 line-height + 边框 2px，**不得再用 min-height 撑高**；
   *        字号正文 13px、微操作 12px，均带 `!important`。
   *     ③ 通用排布（inline-flex / 居中 / 不换行 / gap / 1px 边框）存在；
   *     ④ `.btn-icon` 例外存在（32×32、padding 0）。
   */
  const SIZE_NORMALIZE_MARKER = '按钮尺寸归一（2026-10-18）';
  const ROW_QUIET_MARKER = '列表行边框收敛（2026-10-18）';
  
  /** 极简规则切分：只取「选择器 { 声明 }」（本段无嵌套 at-rule；先剥注释，避免注释里的示例类串段） */
  function cssRules(css) {
    const out = [];
    const re = /([^{}]+)\{([^{}]*)\}/g;
    let m;
    while ((m = re.exec(css)) !== null) out.push({ selector: m[1].trim(), body: m[2] });
    return out;
  }
  
  /** 纵向 padding（忽略 !important） */
  function paddingY(body) {
    const m = /(?:^|;)\s*padding\s*:\s*([^;]+)/.exec(body);
    if (!m) return NaN;
    const parts = m[1].replace(/!important/gi, '').trim().split(/\s+/).filter((x) => /^\d+(?:\.\d+)?px$/.test(x));
    const top = parseFloat(parts[0]);
    const bottom = parts.length > 2 ? parseFloat(parts[2]) : top;
    return top + bottom;
  }
  
  /** 显式 px 行高 */
  function lineHeightPx(body) {
    const m = /line-height\s*:\s*(\d+(?:\.\d+)?)px/.exec(body);
    return m ? parseFloat(m[1]) : NaN;
  }
  
  test('B6 按钮尺寸归一：标准 36px ＋ 紧凑 32px ＋ 小号 28px（padding + line-height 推导）', () => {
    const start = CSS_SRC.indexOf(SIZE_NORMALIZE_MARKER);
    assert.ok(start >= 0,
      `styles.css 缺少「${SIZE_NORMALIZE_MARKER}」段 ⇒ 按钮尺寸仍会被页面工具类零散决定（厚薄不一的老病）。`);
    const rowStart = CSS_SRC.indexOf(ROW_QUIET_MARKER, start);
    const section = CSS_SRC.slice(start, rowStart > start ? rowStart : undefined)
      .replace(/\/\*[\s\S]*?\*\//g, '');
    const rules = cssRules(section);
    const tierRuleOf = (token) => rules.find((r) => new RegExp(`\\.${token}(?![\\w-])`).test(r.selector)
      && /padding/.test(r.body) && /line-height\s*:\s*\d+(?:\.\d+)?px/.test(r.body));
  
    const expectTier = (token, height, fontSize) => {
      const r = tierRuleOf(token);
      assert.ok(r, `styles.css：「${SIZE_NORMALIZE_MARKER}」段缺少 .${token} 的尺寸档（页面会退回零散工具类）`);
      const derived = paddingY(r.body) + lineHeightPx(r.body) + 2;
      assert.equal(derived, height,
        `styles.css：.${token} 应由 padding + line-height + 2px 边框推导为 ${height}px（实际 ${derived}）`);
      assert.doesNotMatch(r.body, /min-height/, `styles.css：.${token} 不得用 min-height 撑高（高度须由文字行高参与计算）`);
      assert.match(r.body, new RegExp(`font-size:\\s*${fontSize}px\\s*!important`),
        `styles.css：.${token} 的字号应为 ${fontSize}px !important`);
    };
    // 标准档 36px
    expectTier('btn-accent', 36, 13);
    expectTier('btn-outline', 36, 13);
    expectTier('btn-accent-soft', 36, 13);
    expectTier('btn-danger', 36, 13);
    expectTier('btn-danger-solid', 36, 13); // 只给确认弹窗
    expectTier('btn-md', 36, 13);            // 常规尺寸别名（不是独立视觉族）
    expectTier('btn-neutral', 36, 13);       // 存量类（只降不升）
    // 紧凑档 32px
    expectTier('btn-ghost', 32, 13);
    // 页签 / 分段控件（32px，豁免：不属于动作按钮）
    expectTier('btn-tab', 32, 13);
    // 小号档 28px
    expectTier('btn-sm', 28, 12);
    expectTier('btn-action', 28, 12);
  
    // ③ 通用排布单一源（排布属性**不加** `!important`：行式载体的 `justify-between` /
    //    `items-start` / `border-0` 等工具类须能后加载覆盖；只锁尺寸属性）
    const common = rules.find((r) => /display:\s*inline-flex/.test(r.body)
      && /align-items:\s*center/.test(r.body)
      && /justify-content:\s*center/.test(r.body)
      && /gap:\s*var\(--space-1\)\s*!important/.test(r.body)
      && /white-space:\s*nowrap/.test(r.body)
      && /border-width:\s*1px/.test(r.body));
    assert.ok(common, `styles.css：「${SIZE_NORMALIZE_MARKER}」段缺少通用排布规则（inline-flex / 居中 / gap:var(--space-1)!important / nowrap / border-width:1px）`);
  
    // ④ 图标型例外
    const icon = rules.find((r) => /\.btn-icon(?![\w-])/.test(r.selector) && /width:\s*32px/.test(r.body));
    assert.ok(icon, `styles.css：「${SIZE_NORMALIZE_MARKER}」段缺少 .btn-icon 例外（图标按钮 32×32）`);
    assert.match(icon.body, /padding:\s*0\s*!important/, 'styles.css：.btn-icon 的 padding 应为 0 !important');
  });
  
  /**
   * B7【族内不得再写尺寸】（2026-10-18 立，棘轮；2026-10-19 排除页签）
   *   问题：归一后尺寸已由 `styles.css` 用 `!important` 锁死，但页面里仍有
   *   `<button class="btn-outline … text-sm py-1.5">` 这类「族类 ＋ 尺寸工具类」——
   *   既不生效、又让读码者误以为尺寸还归页面管。
   *   存量约 491 处，**本批不清**（支书要求「不要一次清 400 处」），只锁「不得新增」。
   *   判据＝`<button class>` 同时命中**动作按钮族令牌** 与 尺寸工具类令牌（字号 / 内边距 / 高度）。
   *   **排除**：`tab-btn` / 页签 `btn-tab` —— 它们是导航 / 分段控件，不是动作按钮，
   *   不计入「动作按钮尺寸工具类」统计，也不参与四类迁移。
   *   基线＝2026-10-18 实测 **488**（只许降不许升；每迁完一屏一并下调）。
   *   2026-10-19 排除 `tab-btn` / 页签 `btn-tab` 后实测 **413** ⇒ 基线下调为 413。
   *   2026-10-23 R11：toast 新增一条关闭按钮（error/success 提示可手动关闭）⇒ 实测 414，
   *     基线按实况上调为 414（只此一次，之后只许降不许升）。
   *   2026-10-23 批次 505（Task 7/8 收口后）：实测 **396**（族内尺寸工具类随主题/密度收敛下降）
   *     ⇒ 按收基线纪律下调为 396（只降不升）。
   *   2026-10-26 Task 5：btn-ghost 动作迁移后实测 **360** ⇒ 按收基线纪律下调为 360。
   */
  const FAMILY_SIZE_OVERRIDE_BASELINE = 360;
  const SIZE_TOKEN_RE = /^(?:text-(?:xs|sm|base|lg|xl)|text-\[\d+px\]|p-\d+(?:\.\d+)?|px-\d+(?:\.\d+)?|py-\d+(?:\.\d+)?|h-\d+(?:\.\d+)?|min-h-\S+)$/;
  // 动作按钮族令牌；**不含** `btn-tab`（页签 / 分段控件豁免，见 B7 注释）
  const FAMILY_TOKEN_RE = /(^|\s)(btn-accent-soft|btn-accent|btn-action|btn-md|btn-neutral|btn-outline|btn-ghost|btn-danger)/;
  /** 页签 / 分段控件：（`tab-btn` 页头 tab ＋ `btn-tab` 页签）一律排除 */
  const TAB_EXEMPT_RE = /(^|\s)(tab-btn|btn-tab)(?![\w-])/;
  
  test('B7 族内不得再写尺寸：动作按钮族上的 text-*/py-*/px-*/h-* 只许降不许升（tab-btn / btn-tab 豁免）', () => {
    let total = 0;
    const perFile = new Map();
    const re = /<button[^>]*\bclass="([^"]*)"/g;
    for (const f of BTN_FILES) {
      const src = readFileSync(f, 'utf8');
      let m;
      while ((m = re.exec(src)) !== null) {
        const cls = m[1];
        if (TAB_EXEMPT_RE.test(cls)) continue;
        if (!FAMILY_TOKEN_RE.test(cls)) continue;
        if (!cls.split(/\s+/).some((t) => SIZE_TOKEN_RE.test(t))) continue;
        total += 1;
        perFile.set(f, (perFile.get(f) || 0) + 1);
      }
    }
    const ledger = [...perFile.entries()].sort((a, b) => b[1] - a[1])
      .map(([f, n]) => `  ${String(n).padStart(3)}  ${relative(join(__dirname, '..', '..'), f)}`);
    console.log(`[button-system-guard] 动作按钮族仍写尺寸工具类 ${total} 个（棘轮上限 ${FAMILY_SIZE_OVERRIDE_BASELINE}；tab-btn / btn-tab 已排除）：\n${ledger.join('\n')}`);
    assert.ok(
      total <= FAMILY_SIZE_OVERRIDE_BASELINE,
      `动作按钮族上的尺寸工具类由 ${FAMILY_SIZE_OVERRIDE_BASELINE} 升到 ${total} 个 ⇒ 尺寸已由 styles.css「${SIZE_NORMALIZE_MARKER}」统一，新按钮不要再写 text-*/py-*/px-*/h-*；迁移一屏请一并下调基线。`,
    );
  });
  
  /**
   * B8【btn-ghost 存量只降不升】（2026-10-19 立）
   *   来源：Spec「最小三成本」——`btn-ghost` 无底色无边框，读者无法判断可点性；
   *   新代码**不得**再用它作为动作按钮类型（行内动作改 `.btn-outline` / `.btn-accent-soft`，
   *   危险改 `.btn-danger`，纯导航/帮助用 `<a>`）。
   *   本批只锁**全站存量**（四页重点的页面级归零由 Task 9 `component-ratchet-guard.test.mjs` 收紧）。
   *   基线＝2026-10-19 实测（只许降不许升；每迁完一屏一并下调）。
   *   2026-10-26 Task 5：动作按钮全量迁移到 `.btn-outline` / `.btn-text`，只剩 4 处**非动作行载体**
   *   （list-row ×2 / today 清单行 ×1 / 考勤矩阵入口 ×1，见 V4 白名单）⇒ 基线下调为 4。
   */
  const GHOST_BUTTON_BASELINE = 4; // 2026-10-26 Task 5 实测 4（均为非动作行载体）
  
  test('B8 btn-ghost 作为动作按钮的存量只许降不许升（新代码不得使用）', () => {
    let total = 0;
    const perFile = new Map();
    const re = /<button[^>]*\bclass="([^"]*)"/g;
    for (const f of BTN_FILES) {
      const src = readFileSync(f, 'utf8');
      let m;
      while ((m = re.exec(src)) !== null) {
        const cls = m[1];
        if (!/(^|\s)btn-ghost(?![\w-])/.test(cls)) continue;
        total += 1;
        const rel = relative(join(__dirname, '..', '..'), f).replace(/\\/g, '/');
        perFile.set(rel, (perFile.get(rel) || 0) + 1);
      }
    }
    const ledger = [...perFile.entries()].sort((a, b) => b[1] - a[1])
      .map(([f, n]) => `  ${String(n).padStart(3)}  ${f}`);
    console.log(`[button-system-guard] 以 btn-ghost 作动作按钮的 <button> 共 ${total} 个（棘轮上限 ${GHOST_BUTTON_BASELINE}）：\n${ledger.join('\n')}`);
    assert.ok(
      total <= GHOST_BUTTON_BASELINE,
      `btn-ghost 动作按钮由 ${GHOST_BUTTON_BASELINE} 升到 ${total} 个 ⇒ 新代码不得再用 btn-ghost；行内动作用 .btn-outline / .btn-accent-soft，危险用 .btn-danger。`,
    );
  });
  
  // ═════════════════════════════════════════════════════════════════════════════
  // V1–V3：视觉基础三组判据（2026-10-26 · `历史 spec（已删）` Task 3）
  //   来源：支书反馈「分组胶囊没恢复 / 表格向后伸展 / 结论带挤在一起」。
  //   判据口径（静态，纯 node）：容器与行载体同 class 同语义、胶囊全宽可见且 ≥24px、
  //   关键宽表 table-layout:fixed ＋ 列宽模板。
  // ═════════════════════════════════════════════════════════════════════════════
  
  test('V1 容器语义：数字组单一语法 / section.card 必有可访问名 / list-row 四载体可区分', () => {
    // ① 数字组单一语法（2026-10-29 P2「同类只有一个语法」）：
    //    全站数字组＝图标块在左（.stat-icon-tint 40×40、浅底由 --tint 派生）＋ .stat-card__body
    //    （.stat-card__value / .stat-card__label 两行在右）。卡片不自带尺寸：不得再有
    //    `flex-direction: column` 与写死的 `min-height`；列数与等高交给栅格 `align-items: stretch`。
    assert.match(WORK_OVERVIEW, /<section class="metric-band metric-band--interactive metric-band--cards(?: metric-band--cards--content)?"/,
      '工作概况结论带须为 .metric-band--interactive.metric-band--cards（四张数字卡，含可点 button/a）');
    assert.match(CSS, /\.metric-band--cards\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/,
      'styles.css 缺 .metric-band--cards 的四列卡网格');
    assert.match(WORK_OVERVIEW, /class="card card--interactive stat-card metric-band__item/,
      '工作台数字卡须复用 .card（不得另造第二套卡面）');
    const cardBody = /const body = `<span class="stat-icon-tint"[\s\S]*?<div class="stat-card__body">[\s\S]*?stat-card__value[\s\S]*?stat-card__label">\$\{esc\(metric\.label\)\}<\/p>[\s\S]*?<\/div>`/.exec(WORK_OVERVIEW);
    assert.ok(cardBody, '四数卡 body 须为「图标块 .stat-icon-tint ＋ .stat-card__body（数值/标签）」');
    assert.match(cardBody[0], /--tint:\$\{color\}/, '图标浅底须由 --tint 派生（取既有语义色，不写 hex）');
    assert.match(STATS, /stat-icon-tint[\s\S]{0,400}stat-card__body[\s\S]{0,400}stat-card__value[\s\S]{0,400}stat-card__label/,
      '首页统计卡须与工作台同构：图标块 ＋ .stat-card__body（数值/标签）');
    // 可点卡反馈不得用阴影 / 上浮（DESIGN_SYSTEM §4.2；判据与 ui-motion-guard 同向）。
    for (const [label, source] of [['work-overview.js', WORK_OVERVIEW], ['stats.js', STATS]]) {
      assert.doesNotMatch(source, /hover:shadow|hover:-translate-[xy]-/, `${label} 不得以 hover 阴影 / 上浮作反馈`);
    }
    assert.doesNotMatch(CSS_BARE, /\.card--interactive:hover\s*\{[^}]*box-shadow/, '.card--interactive:hover 不得加阴影');
    assert.doesNotMatch(CSS_BARE, /\.card--interactive:hover\s*\{[^}]*translate/, '.card--interactive:hover 不得上浮 / 整卡位移');
  
    // 卡面几何（判据只能更严）：横排、间距 --space-3、不写尺寸；图标块 40×40 / --radius-md / --tint 12% 派生。
    const statCardCss = /\.stat-card\s*\{([^}]*)\}/.exec(CSS_BARE)?.[1] || '';
    assert.match(statCardCss, /align-items:\s*center/, '.stat-card 须横排居中（图标在左、文字在右）');
    assert.match(statCardCss, /gap:\s*var\(--space-3\)/, '.stat-card 图标与文字区之间须为 --space-3');
    assert.doesNotMatch(statCardCss, /flex-direction:\s*column/, '.stat-card 不得再竖排（图标一行 / 数值一行 / 标签一行）');
    assert.doesNotMatch(statCardCss, /(?:min-)?height:\s*\d+px/, '.stat-card 不得写死高度（等高交给栅格 stretch）');
    assert.match(CSS_BARE, /\.stat-card__body\s*\{[^}]*flex-direction:\s*column/,
      '.stat-card__body 须为右侧纵向两行（数值 / 标签）');
    assert.match(CSS_BARE, /\.stat-icon-tint\s*\{[^}]*width:\s*40px[^}]*height:\s*40px/,
      '图标块须为 40×40');
    assert.match(CSS_BARE, /\.stat-icon-tint\s*\{[^}]*border-radius:\s*var\(--radius-md\)/,
      '图标块圆角须取 --radius-md');
    // 栅格：桌面四列、≤1024 两列（手机同两列），四张等高只由 stretch 保证。
    assert.match(CSS_BARE, /\.stat-grid,\s*\.metric-band--cards\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)[\s\S]{0,240}align-items:\s*stretch/,
      'styles.css 缺 .stat-grid / .metric-band--cards 的四列等比栅格（align-items: stretch）');
    assert.match(CSS_BARE, /\.stat-grid,\s*\.metric-band--cards\s*\{[^}]*grid-auto-rows:\s*1fr/,
      '数字组须 grid-auto-rows: 1fr（两列时上下两行等高，不靠写死 min-height）');
    assert.match(CSS_BARE, /@media \(max-width: 1024px\)\s*\{[\s\S]{0,200}\.stat-grid,\s*\.metric-band--cards\s*\{[\s\S]{0,120}repeat\(2,/,
      '≤1024 时数字组须降为两列');
  
    // 待办摘要（原 .metric-band--static 只读带）已并入同一语法；只读档不得回潮。
    assert.match(TODO_SHELL, /class="stat-grid mb-4" role="group" aria-label="待办摘要"/,
      '待办摘要须使用 .stat-grid（数字组单一语法）');
    assert.match(TODO_SHELL, /stat-card__body[\s\S]{0,160}stat-card__value[\s\S]{0,160}stat-card__label/,
      '待办摘要卡须为「图标块 ＋ 数值/标签」');
    assert.doesNotMatch(CSS_BARE, /\.metric-band--static/, 'styles.css 不得保留 .metric-band--static 第二套只读档');
    // ② 结论带不再用 0 间距 + 左线分隔。
    assert.doesNotMatch(CSS_BARE, /\.metric-band\s*\{[^}]*gap:\s*0\s*;/, '.metric-band 不得再用 gap: 0（项间应为 8–12px）');
    assert.doesNotMatch(CSS_BARE, /\.metric-band__item\s*\{[^}]*border-left/, '.metric-band__item 不得再用左线分隔（由间距承担）');
  
    // ③ section 只用于有可访问名的分区；.card 容器其余统一 div。
    const offenders = [];
    let cardSections = 0;
    for (const f of FILES) {
      const re = /<section\b[^>]*>/g;
      let m;
      while ((m = re.exec(f.code)) !== null) {
        const tag = m[0];
        if (!/(^|\s)card(\s|$)/.test(classOf(tag))) continue;
        cardSections += 1;
        if (!/\baria-label(?:ledby)?="/.test(tag)) {
          offenders.push(`${f.rel}:${lineOf(f.code, m.index)} → ${tag.replace(/\s+/g, ' ').slice(0, 120)}`);
        }
      }
    }
    assert.ok(cardSections >= 8, `只扫描到 ${cardSections} 个 section.card（下限 8）：V1 的扫描面被写坏`);
    assert.deepEqual(offenders, [],
      `section 只能用于有可访问名（aria-label / aria-labelledby）的分区；其余卡容器请用 <div>：\n  ${offenders.join('\n  ')}`);
  
    // ④ list-row 四类行载体：元素 + data-row-type + data-interactive 三者一致，类名不另造。
    assert.match(LIST_ROW, /data-row-type="\$\{type\}"/, 'list-row.js 必须输出 data-row-type');
    for (const type of ['display', 'nav', 'action', 'master']) {
      assert.ok(LIST_ROW.includes(`'${type}'`), `list-row.js 行型白名单缺 ${type}`);
    }
    assert.match(CSS, /\.list-row\[data-row-type="display"\]/, 'styles.css 缺展示行样式');
    assert.match(CSS, /\.list-row\[data-row-type="action"\]/, 'styles.css 缺动作行样式');
    assert.match(CSS, /\.list-row\[data-row-type="nav"\][\s\S]{0,120}\.list-row\[data-row-type="master"\]/,
      'styles.css 缺导航行 / 主从行的可点样式');
  });
  
  // ═════════════════════════════════════════════════════════════════════════════
  // V8 数字组全量语法（2026-10-29 P2「同类只有一个语法」）
  //   扫描面：docs/src/**/*.js ＋ docs/*.html（与 SD-1 同一批 FILES）。
  //   ① 竖排回潮：出现 `.stat-card` ＋ `.stat-card__value` 的模板必须有 `.stat-card__body`
  //      （图标在左、数值/标签在右两行）；缺 body（value/label 仍是卡片直系子元素）或
  //      卡片内联 `flex-direction: column` ⇒ 判红。
  //   ② 组内 hex：卡片开标签或 body…label 窗口出现 #rgb/#rrggbb ⇒ 判红（颜色只取语义 token）。
  //   带反例（非空转）：坏样本命中、好样本不命中，另有 `--tint:#…` 与裸 `color:#…` 两个样本。
  // ═════════════════════════════════════════════════════════════════════════════
  test('V8 数字组全量：不得回潮竖排三段 / 组内不得内联 hex', () => {
    const CARD_TAG_RE = /<(?:div|button|a)\b[^>]*class="[^"]*\bstat-card\b[^"]*"[^>]*>/g;
    const HEX_RE = /#[0-9a-f]{3,8}\b/i;
  
    /** 竖排回潮判定（纯函数，便于反例对照） */
    const verticalRegression = (code) => {
      if (!/\bstat-card\b/.test(code)) return false;
      if (!/stat-card__value/.test(code)) return false; // 只有图标块 / 骨架，不算数字组
      if (!/stat-card__body/.test(code)) return true;   // 缺 body ⇒ 数值与标签仍是卡片直系子元素
      return /stat-card[\s\S]{0,240}flex-direction:\s*column/.test(code);
    };
    /** 数字组内联 hex（卡片开标签 ＋ body…label 窗口；纯函数） */
    const inlineHex = (code) => {
      const hits = [];
      for (const m of code.matchAll(CARD_TAG_RE)) if (HEX_RE.test(m[0])) hits.push(m[0]);
      for (const m of code.matchAll(/stat-card__body[\s\S]{0,400}?stat-card__label/g)) if (HEX_RE.test(m[0])) hits.push(m[0]);
      return hits;
    };
  
    const vertical = [];
    const hex = [];
    let cards = 0;
    for (const f of FILES) {
      if (verticalRegression(f.code)) vertical.push(f.rel);
      const hits = inlineHex(f.code);
      if (hits.length) hex.push(`${f.rel} → ${hits[0].replace(/\s+/g, ' ').slice(0, 120)}`);
      cards += [...f.code.matchAll(CARD_TAG_RE)].length;
    }
    assert.ok(cards >= 7, `只扫描到 ${cards} 个数字卡（下限 7）：V8 的扫描面被写坏`);
    assert.deepEqual(vertical, [],
      `数字组不得回潮竖排结构（须 .stat-card + .stat-icon-tint + .stat-card__body）：\n  ${vertical.join('\n  ')}`);
    assert.deepEqual(hex, [],
      `数字组内不得内联硬编码 hex（--tint / color 取语义 token）：\n  ${hex.join('\n  ')}`);
  
    // ── 反例（合成样本）：判据写坏会在这里先红 ──
    const badVertical = '<div class="card stat-card"><span class="stat-icon-tint"></span>'
      + '<p class="stat-card__value">3</p><p class="stat-card__label">逾期</p></div>';
    const goodVertical = '<div class="card stat-card"><span class="stat-icon-tint"></span>'
      + '<div class="stat-card__body"><p class="stat-card__value">3</p><p class="stat-card__label">逾期</p></div></div>';
    const badColumn = '<div class="card stat-card" style="flex-direction: column">'
      + '<div class="stat-card__body"><p class="stat-card__value">1</p><p class="stat-card__label">逾期</p></div></div>';
    assert.equal(verticalRegression(badVertical), true, 'V8 反例失效：竖排三段样本未被判红');
    assert.equal(verticalRegression(goodVertical), false, 'V8 反例失效：合规样本被误判');
    assert.equal(verticalRegression(badColumn), true, 'V8 反例失效：卡片内联竖排未被判红');
  
    const badHexTint = '<div class="card stat-card" style="--tint:#3B82F6">'
      + '<div class="stat-card__body"><p class="stat-card__value">3</p><p class="stat-card__label">逾期</p></div></div>';
    const badHexValue = '<div class="card stat-card">'
      + '<div class="stat-card__body"><p class="stat-card__value" style="color:#3B82F6">3</p>'
      + '<p class="stat-card__label">逾期</p></div></div>';
    assert.equal(inlineHex(badHexTint).length, 1, 'V8 反例失效：--tint 内联 hex 未被判红');
    assert.equal(inlineHex(badHexValue).length, 1, 'V8 反例失效：数值内联 hex 未被判红');
    assert.equal(inlineHex(goodVertical).length, 0, 'V8 反例失效：合规样本被误判为内联 hex');
  });
  
  
  test('V2 分组胶囊全宽可见：无 display:none 断点、高度 ≥24px、3px 直角、无边框 + 10% 淡底', () => {
    assert.doesNotMatch(CSS, /\.tab-group-label[^{}]*\{[^}]*display:\s*none/,
      '分组胶囊不得在任何断点用 display:none 隐藏');
    assert.doesNotMatch(CSS, /\.tab-group-label[^{}]*\{[^}]*visibility:\s*hidden/,
      '分组胶囊不得用 visibility:hidden 隐藏');
    assert.match(CSS, /\.tab-group-label\s*\{[^}]*min-height:\s*24px/, '分组胶囊高度须 ≥24px');
    // 2026-10-26 Task 1：恢复 8–9 月的 3px 直角（SD-3 的 999px 胶囊例外，见 DESIGN_SYSTEM 登记）。
    assert.match(CSS, /\.tab-group-label\s*\{[^}]*border-radius:\s*3px/,
      '分组胶囊应为 3px 直角（.tab-group-label 是 SD-3 胶囊 999px 的登记例外）');
    assert.match(CSS, /\.tab-group-label\s*\{[^}]*flex-shrink:\s*0/, '组名不得被压缩（flex-shrink: 0）');
  
    // 2026-10-27 Task 9：用户裁定恢复 8–9 月原样——**无边框**；形状由 3px 直角与 10% 主题淡底承担。
    //   （原 V2 的「描边对页面底 ≥1.5:1」随边框一并退场，改为核「无边框 + 淡底 token 正确」。）
    assert.match(CSS, /\.tab-group-label\s*\{[^}]*border:\s*none/, '分组胶囊应无边框（8–9 月原样）');
    assert.doesNotMatch(CSS, /\.tab-group-label\s*\{[^}]*border:\s*1px/, '分组胶囊不得再写 1px 描边');
    assert.match(CSS, /--app-accent-tint:\s*rgb\(from var\(--app-accent\) r g b \/ 10%\)/,
      'styles.css 应定义 --app-accent-tint（当前主题色 10% 淡底，随 7 主题亮/暗自动跟随）');
    assert.match(CSS, /\.tab-group-label\s*\{[^}]*background:\s*var\(--app-accent-tint\)/,
      '分组胶囊底色应为 --app-accent-tint（10% 淡底）');
  
    // ≤1280 只缩内边距，不隐藏、不降字号（页签条继续横向滚动）。
    //   2026-10-26 Task 1：字号由原来的 11px 改回 12px（11px 属 Overline 标签档）。
    //   2026-10-27 Task 9：去边框后高度由 min-height 24px 承担，内边距口径不变。
    const narrow = /@media \(max-width: 1280px\) \{[\s\S]*?\.tab-group-label \{([\s\S]*?)\}[\s\S]*?\n\}/.exec(CSS);
    assert.ok(narrow, '缺少 ≤1280px 的分组名规则');
    assert.match(narrow[1], /padding:\s*1px 5px/, '≤1280px 组名应缩小内边距（1px 5px）');
    assert.doesNotMatch(narrow[1], /font-size:\s*(?:9|10|11)px/, '≤1280px 组名不得下探 11px 及以下（保持 12px 正文档）');
    assert.doesNotMatch(narrow[1], /display:\s*none/, '≤1280px 不得隐藏组名');
  });
  
  test('V3 关键表定列宽：wo-lines-table fixed ＋ colgroup 模板 ＋ 末列贴列尾', () => {
    assert.match(CSS, /\.wo-lines-table\s*\{[^}]*table-layout:\s*fixed/,
      '.wo-lines-table 必须 table-layout: fixed（否则末列吃掉余量）');
    assert.match(CSS, /\.data-table--fixed\s*\{[^}]*table-layout:\s*fixed/,
      'styles.css 须提供 .data-table--fixed 定列宽档供其它关键表采用');
    assert.match(WORK_OVERVIEW, /<table class="data-table data-table--fixed wo-lines-table"/,
      '工作分工表须挂 .data-table--fixed');
    const cols = [...WORK_OVERVIEW.matchAll(/<col class="wo-col-([a-z]+)"\s*\/>/g)].map((m) => m[1]);
    assert.deepEqual(cols, ['name', 'owner', 'count', 'count', 'pending'],
      `工作分工表列宽模板应为 工作分工/负责人/在办/逾期/待处理，实测 ${JSON.stringify(cols)}`);
    for (const cls of ['wo-col-name', 'wo-col-owner', 'wo-col-count', 'wo-col-pending']) {
      assert.match(CSS, new RegExp(`\\.${cls}\\s*\\{[^}]*width:\\s*\\d+%`), `styles.css 缺列宽 ${cls}`);
    }
    // 末列贴列尾 + 首列 nowrap 保留但有最大宽。
    assert.match(CSS, /\.wo-lines-table thead th:last-child,[\s\S]{0,80}\.wo-lines-table tbody td:last-child\s*\{[^}]*padding-inline-end:\s*var\(--space-4\)/,
      '末列表头/单元格须留 16px 尾部内边距');
    assert.match(CSS, /\.wo-lines-table thead th:last-child,[\s\S]{0,80}\.wo-lines-table tbody td:last-child\s*\{[^}]*text-align:\s*end/,
      '末列内容须贴列尾（text-align: end）');
    assert.match(CSS, /\.wo-line-name\s*\{[^}]*white-space:\s*nowrap/, '首列 nowrap 应保留');
    assert.match(CSS, /\.wo-line-name\s*\{[^}]*max-width:/, '首列 nowrap 须同时给最大宽');
    // ≤640 卡式行：动作列自起排（不甩到卡右缘）。
    assert.match(CSS, /\.data-table\[data-responsive="cards"\] td:last-child\s*\{[^}]*justify-content:\s*flex-start/,
      '≤640 卡式行动作列应为 justify-content: flex-start');
  });
  
  // ═════════════════════════════════════════════════════════════════════════════
  // V4–V7：按钮三档与可点性（2026-10-26 · `历史 spec（已删）` Task 5）
  //   三档契约（支书裁定）：
  //     ① 动作按钮：必须 1px 描边或底色；`btn-ghost` 只保留给**非动作行载体**；
  //     ② 纯文字动作：静态下划线或尾随箭头，箭头不得 neutral-400；
  //     ③ 图标按钮：视觉 32×32 + 命中区 ≥44×44；
  //     ④ 行载体：可见 hover（底/边/左条），色差 ≥1.2:1。
  //   本组全部静态扫描（纯 node），并对白名单做「每条命中 ≥1 次」的非空转校验。
  // ═════════════════════════════════════════════════════════════════════════════
  
  /**
   * V4 白名单：**唯一允许保留 `btn-ghost` 的场所＝非动作行载体**。
   * 每条写明「为什么它不是动作按钮」＋「可见线索由谁提供」，并核实际处数（多一处即红）。
   */
  const GHOST_ROW_WHITELIST = [
    {
      rel: 'docs/src/components/ui/list-row.js',
      max: 2,
      marker: 'data-row-type',
      reason: '导航行 / 选择行的原生 <button> 整行载体（data-row-type + data-interactive）；'
        + 'hover 底与选中 soft 底见 .list-row[data-interactive="true"]:hover（左条已退出）',
    },
    {
      rel: 'docs/src/entries/tabs/today/today-tab.js',
      max: 1,
      marker: 'w-full',
      reason: '今天页清单行（w-full + text-left）整行点击跳转；hover 底（左条已退出）',
    },
    {
      rel: 'docs/src/entries/tabs/disc/overview-tab.js',
      max: 1,
      marker: 'w-full',
      reason: '概况条线缺口行升级为整行导航载体（w-full + text-left）；hover 底由 .btn-ghost:hover 提供',
    },
    {
      rel: 'docs/src/entries/tabs/prop/overview-tab.js',
      max: 1,
      marker: 'w-full',
      reason: '宣传概况「待归档」行升级为整行导航载体（w-full + text-left）；hover 底由 .btn-ghost:hover 提供',
    },
    {
      rel: 'docs/src/entries/tabs/disc/attendance-tab.js',
      max: 1,
      marker: 'hover:bg-[var(--surface-hover)]',
      reason: '考勤矩阵记录入口＝行内定位载体（点此到待确认队列，不是写操作），自带可见 hover',
    },
  ];
  
  /** V4 单行判据（纯函数，反例复用同一判据，避免「反例另写一套」）。 */
  function ghostLineProblem(line, entry) {
    if (!/(^|[\s"'`])btn-ghost(?![\w-])/.test(line)) return null;
    if (!entry) return 'not-whitelisted';
    if (!line.includes(entry.marker)) return 'marker-missing';
    return null;
  }
  
  test('V4 btn-ghost 不得用于动作按钮：只允许白名单内的非动作行载体', () => {
    const allowed = new Map(GHOST_ROW_WHITELIST.map((w) => [w.rel, w]));
    const hits = new Map();
    const offenders = [];
    for (const f of FILES) {
      if (!f.rel.endsWith('.js')) continue;
      const w = allowed.get(f.rel);
      f.code.split('\n').forEach((line, i) => {
        if (!/(^|[\s"'`])btn-ghost(?![\w-])/.test(line)) return;
        hits.set(f.rel, (hits.get(f.rel) || 0) + 1);
        const problem = ghostLineProblem(line, w);
        if (!problem) return;
        if (problem === 'not-whitelisted') {
          offenders.push(`${f.rel}:${i + 1} ${line.trim().slice(0, 120)}`);
          return;
        }
        offenders.push(`${f.rel}:${i + 1} 白名单标记「${w.marker}」不在该按钮上`
          + '（行载体证据消失 ⇒ 它不是非动作行载体）');
      });
    }
    // 反例：同一判据对「白名单外」「标记缺失」必须判红，对合法行载体必须判绿。
    assert.equal(ghostLineProblem('<button class="btn-ghost">删除</button>', undefined),
      'not-whitelisted', 'V4 反例：白名单外的 btn-ghost 未被判红');
    assert.equal(ghostLineProblem('<button class="btn-ghost">删除</button>', GHOST_ROW_WHITELIST[0]),
      'marker-missing', 'V4 反例：白名单文件里缺行载体标记未被判红');
    assert.equal(ghostLineProblem(
      `<button class="btn-ghost ${GHOST_ROW_WHITELIST[0].marker}">行</button>`, GHOST_ROW_WHITELIST[0]),
    null, 'V4 反例：合法行载体被误判红');
    // 非空转：白名单每条必须命中，且处数不多不少
    for (const w of GHOST_ROW_WHITELIST) {
      assert.ok(w.reason && w.reason.length >= 20,
        `V4 白名单「${w.rel}」缺理由（≥20 字，说明为什么它不是动作按钮）`);
      const n = hits.get(w.rel) || 0;
      assert.ok(n >= 1, `V4 白名单「${w.rel}」一次都没命中（僵尸白名单，应删或改判据）`);
      assert.equal(n, w.max, `${w.rel} 的 btn-ghost 处数应为 ${w.max}（实测 ${n}）；新增/减少都必须同步白名单并写理由`);
    }
    const totalRows = [...hits.values()].reduce((a, b) => a + b, 0);
    assert.ok(totalRows >= 5, `只扫描到 ${totalRows} 个行载体（下限 5）：V4 的扫描面被写坏`);
    console.log(`[ui-control-system-guard] V4 btn-ghost 仅剩非动作行载体 ${totalRows} 处（白名单 ${GHOST_ROW_WHITELIST.length} 文件）`);
    assert.deepEqual(offenders, [],
      `btn-ghost 不得再承担动作按钮（动作请改 .btn-outline / .btn-accent / .btn-danger）：\n  ${offenders.join('\n  ')}`);
  });
  
  test('V5 纯文字动作有静态线索：btn-text 600 字重 + 尾随箭头非 neutral-400', () => {
    // ① 第二档类本身必须有静态线索（2026-10-27 Task 9：下划线全站清零 ⇒ 改 600 字重 + 主题色；
    //    hover 补 10% 主题淡底，尾随箭头仍是第二线索）。
    const btnText = /(^|\n)\.btn-text\s*\{([^}]*)\}/.exec(CSS_BARE);
    assert.ok(btnText, 'styles.css 缺少 .btn-text（纯文字动作档）');
    assert.match(btnText[2], /font-weight:\s*600/, '.btn-text 必须有 600 字重（静态线索）');
    assert.doesNotMatch(btnText[2], /text-decoration:\s*underline/, '.btn-text 不得再用文本下划线');
    assert.match(CSS_BARE, /\.btn-text:hover\s*\{[^}]*background:\s*var\(--app-accent-tint\)/,
      '.btn-text:hover 应有 10% 主题淡底');
    assert.match(btnText[2], /color:\s*var\(--color-link\)/, '.btn-text 的文字色应为 --color-link');
  
    // ② 全站 btn-text 按钮必须带尾随箭头（第二个非颜色线索）；并核对样本量。
    let btnTextCount = 0;
    const missingArrow = [];
    for (const f of FILES) {
      if (!f.rel.endsWith('.js')) continue;
      const re = /<button\b[^>]*\bclass="([^"]*)"[^>]*>([\s\S]*?)<\/button>/g;
      let m;
      while ((m = re.exec(f.code)) !== null) {
        if (!/(^|\s)btn-text(?![\w-])/.test(m[1])) continue;
        btnTextCount += 1;
        if (!/[›→»←]/.test(m[2])) missingArrow.push(`${f.rel}:${lineOf(f.code, m.index)}`);
      }
    }
    assert.ok(btnTextCount >= 3, `只扫描到 ${btnTextCount} 个 .btn-text 按钮（下限 3）：V5 的扫描面被写坏`);
    assert.deepEqual(missingArrow, [],
      `纯文字动作必须有尾随箭头（或静态下划线之外的第二个线索）：\n  ${missingArrow.join('\n  ')}`);
  
    // ③ 「全部 / 查看 / 更多」类纯文字按钮不得落在未入册的裸类上（btn-text / link 之外的按钮必须走按钮族）。
    const bareTextActions = [];
    let labelActions = 0;
    for (const f of FILES) {
      if (!f.rel.endsWith('.js')) continue;
      const re = /<button\b([^>]*)>([\s\S]*?)<\/button>/g;
      let m;
      while ((m = re.exec(f.code)) !== null) {
        const attrs = m[1];
        const text = m[2].replace(/<[^>]*>/g, '').trim();
        if (!/^(全部|查看|更多)(\s|›|→|$)/.test(text)) continue;
        labelActions += 1;
        const cls = (/class="([^"]*)"/.exec(attrs) || [null, ''])[1];
        if (/(^|\s)btn-(text|outline|accent|accent-soft|ghost|neutral|danger|sm|md|tab|action)(?![\w-])/.test(cls)) continue;
        if (/(^|\s)link(?![\w-])/.test(cls)) continue;
        bareTextActions.push(`${f.rel}:${lineOf(f.code, m.index)} class="${cls.trim()}" → ${text.slice(0, 16)}`);
      }
    }
    // 2026-11-15 `close-six-dim-gaps` T8：今天页空态撤掉「全部 ›」（空态只留唯一动作「看待办」），
    //   全站「全部/查看/更多」类纯文字动作由 3 处降为 2 处 ⇒ 样本下限按实际收基线 3 → 2。
    //   判红口径（裸类必须为 0）一字未动；两处样本仍足以证明扫描器在工作。
    assert.ok(labelActions >= 2, `只扫描到 ${labelActions} 个「全部/查看/更多」动作（下限 2）：V5 口径被写坏`);
    assert.deepEqual(bareTextActions, [],
      `纯文字动作必须挂 .btn-text（600 字重 + 主题色）或 .link，不得用裸类：\n  ${bareTextActions.join('\n  ')}`);
  
    // ④ 可点箭头不得用最浅中性色 neutral-400 / text-gray-400。
    const dullArrow = [];
    for (const f of FILES) {
      if (!f.rel.endsWith('.js') && !f.rel.endsWith('.html')) continue;
      for (const line of f.code.split('\n')) {
        if (/(text-gray-400|neutral-400)[^\n]{0,90}[›→»]|[›→»][^\n]{0,90}(text-gray-400|neutral-400)/.test(line)) {
          dullArrow.push(`${f.rel} → ${line.trim().slice(0, 120)}`);
        }
      }
    }
    assert.doesNotMatch(CSS, /\.wo-jump\s*\{[^}]*neutral-400/, '.wo-jump（行尾箭头）不得用 neutral-400');
    assert.doesNotMatch(CSS, /\.metric-band__jump\s*\{[^}]*neutral-400/, '.metric-band__jump 不得用 neutral-400');
    console.log(`[ui-control-system-guard] V5 .btn-text ${btnTextCount} 个 · 「全部/查看/更多」${labelActions} 个 · 浅色箭头 ${dullArrow.length} 处`);
    assert.deepEqual(dullArrow, [],
      `可点箭头不得用 neutral-400 / text-gray-400（改 neutral-600 或主题 soft-text）：\n  ${dullArrow.join('\n  ')}`);
  });
  
  test('V6 图标按钮：视觉 32×32，命中区 ≥44×44，且有无障碍名', () => {
    // ① .btn-icon 视觉 32 + ::after 44
    const icon = /(^|\n)\.btn-icon\s*\{([^}]*)\}/.exec(CSS_BARE);
    assert.ok(icon, 'styles.css 缺少 .btn-icon');
    assert.match(icon[2], /width:\s*32px/, '.btn-icon 视觉宽应为 32px');
    assert.match(icon[2], /height:\s*32px/, '.btn-icon 视觉高应为 32px');
    const iconAfter = /\.btn-icon::after\s*\{([^}]*)\}/.exec(CSS_BARE);
    assert.ok(iconAfter, '.btn-icon 缺少 ::after 命中区');
    assert.match(iconAfter[1], /max\(100%,\s*44px\)/, '.btn-icon::after 命中区须为 max(100%, 44px)');
  
    // ② 折叠钮 40×40 视觉 → 44 命中
    const summaryAfter = /\.disclosure__summary::after\s*\{([^}]*)\}/.exec(CSS_BARE);
    assert.ok(summaryAfter, '.disclosure__summary 缺少 ::after 命中区（40 视觉 → 44 命中）');
    assert.match(summaryAfter[1], /max\(100%,\s*44px\)/, '.disclosure__summary::after 须为 max(100%, 44px)');
    // ③ 其它自有图标钮（汉堡 / 日历浮层关闭 / 弹窗关闭 / 选人器关闭）统一进 44 命中组
    for (const cls of ['.hamburger-btn', '.cal-mobile-detail-close', '.modal-close-btn', '.person-picker-close-btn']) {
      assert.match(CSS, new RegExp(`${cls}::after[\\s\\S]{0,400}max\\(100%,\\s*44px\\)`),
        `${cls} 缺 44×44 命中区（::after）`);
    }
  
    // ④ 所有 btn-icon 按钮必须有无障碍名，且样本量非空
    let total = 0;
    const unnamed = [];
    for (const f of FILES) {
      if (!f.rel.endsWith('.js')) continue;
      const re = /<button\b[^>]*\bclass="([^"]*)"[^>]*>/g;
      let m;
      while ((m = re.exec(f.code)) !== null) {
        if (!/(^|\s)btn-icon(?![\w-])/.test(m[1])) continue;
        total += 1;
        if (!/\baria-label(?:ledby)?="/.test(m[0])) {
          unnamed.push(`${f.rel}:${lineOf(f.code, m.index)} class="${m[1].trim()}"`);
        }
      }
    }
    assert.ok(total >= 6, `只扫描到 ${total} 个 .btn-icon 按钮（下限 6）：V6 的扫描面被写坏`);
    console.log(`[ui-control-system-guard] V6 图标按钮 ${total} 个（44 命中组 4 类 + .btn-icon）`);
    assert.deepEqual(unnamed, [], `图标按钮必须有 aria-label / aria-labelledby：\n  ${unnamed.join('\n  ')}`);
  });
  
  /** 取 CSS 变量块（行首选择器 sel 后第一对花括号）；用于在 :root / 深色段内解析 var() */
  function cssVarBlock(css, sel) {
    const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = new RegExp(`(^|\\n)\\s*${esc}\\s*\\{`).exec(css);
    if (!m) return '';
    const start = css.indexOf('{', m.index);
    const end = css.indexOf('}', start);
    return start < 0 || end < 0 ? '' : css.slice(start + 1, end);
  }
  /** 在块内解析 `var(--x)`（只解一层，找不到则回退到 root 块） */
  function resolveVar(block, root, name) {
    const re = new RegExp(`--${name}\\s*:\\s*([^;]+);`);
    const m = re.exec(block) || re.exec(root);
    return m ? m[1].trim() : '';
  }
  function hexOf(value, block, root, depth = 0) {
    if (depth > 4) return '';
    const v = String(value || '').trim();
    const ref = /^var\(--([\w-]+)\)$/.exec(v);
    if (ref) return hexOf(resolveVar(block, root, ref[1]), block, root, depth + 1);
    return /^#[0-9a-f]{3,8}$/i.test(v) ? v.toLowerCase() : '';
  }
  function relLum(hex) {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const ch = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
    const lin = ch.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  }
  function contrast(a, b) {
    const la = relLum(a);
    const lb = relLum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }
  
  test('V7 可点行 hover：主题 10% 淡底；状态左条计数为 0，选中靠 soft 底（2026-11-04 改准）', () => {
    const root = cssVarBlock(CSS_BARE, ':root');
    const dark = cssVarBlock(CSS_BARE, 'html.theme-dark');
    assert.ok(root && dark, 'styles.css 缺少 :root / html.theme-dark 变量块');
  
    const hover = resolveVar(root, root, 'surface-hover');
    const hoverDark = resolveVar(dark, root, 'surface-hover');
    assert.ok(hover && hoverDark, '缺少 --surface-hover（亮/暗）');
    // 旧值回归：1.06–1.11:1 的浅灰不得回来。
    assert.doesNotMatch(CSS, /--surface-hover:\s*#F3F4F6/i, '--surface-hover 不得回落到 #F3F4F6（对白卡仅 1.11:1）');
    assert.doesNotMatch(CSS, /--surface-hover:\s*#1E293B/i, '暗色 --surface-hover 不得回落到 #1E293B（对深卡仅 1.15:1）');
  
    const cases = [
      ['亮色', root, root],
      ['暗色', dark, root],
    ];
    const readings = [];
    for (const [label, block, base] of cases) {
      const h = hexOf(resolveVar(block, base, 'surface-hover'), block, base);
      const card = hexOf(resolveVar(block, base, 'surface-card'), block, base);
      const page = hexOf(resolveVar(block, base, 'surface-page'), block, base);
      assert.ok(h && card && page, `${label}：surface 变量无法解析为 hex（hover=${h} card=${card} page=${page}）`);
      const cCard = contrast(h, card);
      const cPage = contrast(h, page);
      readings.push(`${label} hover ${h} vs 卡片 ${card}=${cCard.toFixed(2)}:1 · vs 页面 ${page}=${cPage.toFixed(2)}:1`);
      // 2026-11-01 新裁定：灰底退居「静态分隔」（表格行 / 分组线等），不再充当可点行 hover；
      //   但 token 本身仍须与卡片 / 页面可辨，否则静态分隔层会糊在卡上。
      assert.ok(cCard >= 1.2, `${label}：--surface-hover 对卡片仅 ${cCard.toFixed(2)}:1（要求 ≥1.2）`);
      assert.ok(cPage >= 1.15, `${label}：--surface-hover 对页面底仅 ${cPage.toFixed(2)}:1（要求 ≥1.15）`);
    }
  
    // 可点行 hover（2026-11-01 裁定保留）：底取主题 10% 淡底，不用灰底 --surface-hover；
    //   2026-11-04 批次 534 改准：状态 / 装饰左条全部退出，选中靠 soft 底 ＋ soft 字 ＋ 字重。
    assert.match(CSS, /--app-accent-tint:\s*rgb\(from var\(--app-accent\) r g b \/ 10%\)/,
      'styles.css 应定义 --app-accent-tint（当前主题色 10% 淡底）');
    const rowHover = /\.list-row\[data-interactive="true"\]:hover\s*\{([^}]*)\}/.exec(CSS_BARE);
    assert.ok(rowHover, 'styles.css 缺 .list-row[data-interactive="true"]:hover');
    assert.match(rowHover[1], /background-color:\s*var\(--app-accent-tint\)/,
      '可点行 hover 底必须是主题 10% 淡底（--app-accent-tint）');
    assert.doesNotMatch(rowHover[1], /--surface-hover/,
      '可点行 hover 不得再回灰底 --surface-hover（灰底只留静态分隔）');
    assert.doesNotMatch(rowHover[1], /background-image/,
      '可点行 hover 不得再用 background-image 画左条（渐变无法过渡）');
    // 左条禁令（2026-11-04）：把 3px 左条加回来必须判红——伪元素 / border-left / inset 内阴影三路都查。
    assert.doesNotMatch(CSS_BARE, /\.list-row[^,{]*::before\s*\{[^}]*width:\s*3px/,
      '可点行不得再用伪元素画 3px 状态左条（左条已退出界面信号）');
    assert.doesNotMatch(CSS_BARE, /\.list-row[^,{]*\{[^}]*border-left/,
      '可点行不得用 border-left 画状态左条');
    assert.doesNotMatch(CSS_BARE, /\.list-row[^,{]*\{[^}]*box-shadow:\s*inset\s+3px/,
      '可点行不得用 inset 3px 内阴影画左条');
    assert.match(CSS_BARE, /\.list-row\[data-selected="true"\]\s*\{[^}]*background(?:-color)?:\s*var\(--app-accent-soft-bg\)/,
      '选中态必须用 --app-accent-soft-bg（不得靠左条表达选中）');
    assert.match(CSS_BARE, /\.list-row\[data-interactive="true"\]\[data-selected="true"\]:hover\s*\{[^}]*background-color:\s*var\(--app-accent-soft-bg\)/,
      '选中行 hover 必须保持主题 soft-bg（不得被 hover 淡底覆盖）');
  
    // 结论带的筛选 chip 必须有静态描边/底色（可切换控件，不是纯文字）。
    assert.match(CSS_BARE, /button\.metric-band__item--filter\s*\{[^}]*border:\s*1px solid var\(--neutral-200\)/,
      '筛选 chip 必须有 1px 描边（可切换控件）');
    assert.match(CSS_BARE, /button\.metric-band__item--filter\s*\{[^}]*background:\s*var\(--neutral-0\)/,
      '筛选 chip 必须有底色');
  
    console.log(`[ui-control-system-guard] V7 ${readings.join(' · ')}`);
  });
  
  // ═════════════════════════════════════════════════════════════════════════════
  // FOCUS-1…3：焦点单环（2026-10-28）
  //   病灶：输入框键盘聚焦时 `:focus` 与 `:focus-visible` 同时命中——
  //     `:focus` 画 `box-shadow: 0 0 0 3px var(--app-accent-soft-bg)`（对白卡 1.11:1，暗色比卡片更暗），
  //     `:focus-visible` 再画 `outline: 2px solid var(--app-accent)` ⇒ 两个环叠在一起（「黑环 + 金环」）。
  //   `<select>`（.cs-trigger）实测同样是两条声明，但 3px 环几乎不可见，肉眼只看到一条金环。
  //   口径：环只由 `:focus-visible` 的一条实线 outline 承担，与 <select> 同宽 / 同色 / 同偏移
  //     （2px / --app-accent / offset 1px；对白卡 3.83:1、对页面底 3.66:1）。
  //   覆盖：页内检索（.lf-kw）· 下载内嵌搜索（.cs-search-input）· 归档搜索（#archive-search）·
  //     全站搜索（#ref-search-input）· 帮助页搜索（.help-search-input）· 选人器搜索（.person-picker-search）。
  // ═════════════════════════════════════════════════════════════════════════════
  const HELP_HTML = readFileSync(join(ROOT, 'docs', 'help.html'), 'utf8');
  const PERSON_PICKER_CSS = readFileSync(join(SRC, 'components', 'person-picker.css'), 'utf8');
  const ARCHIVE_HTML = readFileSync(join(ROOT, 'docs', 'archive.html'), 'utf8');
  const SEARCH_HTML = readFileSync(join(ROOT, 'docs', 'search.html'), 'utf8');
  const LIST_FILTER_JS = readFileSync(join(SRC, 'components', 'ui', 'list-filter.js'), 'utf8');
  const CUSTOM_SELECT_JS = readFileSync(join(SRC, 'components', 'ui', 'custom-select.js'), 'utf8');
  
  /** 规则块（剥注释但保留换行 ⇒ 行号可核）：{ selector(空白归一), body, line } */
  function ruleBlocks(css) {
    const bare = String(css).replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
    const out = [];
    for (const m of bare.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      out.push({ selector: m[1].trim().replace(/\s+/g, ' '), body: m[2], line: lineOf(bare, m.index) });
    }
    return out;
  }
  
  /** 取某条声明的**最后一条**值（CSS 同块内后者胜出）；无声明返回 null */
  function declOf(body, prop) {
    const re = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, 'gi');
    let value = null;
    for (const m of body.matchAll(re)) value = m[1].trim().replace(/\s*!important$/i, '');
    return value;
  }
  
  /** 选择器列表里以某伪类结尾的基选择器（`:focus` 不会命中 `:focus-within`） */
  function basesOf(selector, pseudo) {
    return selector.split(',').map((s) => s.trim())
      .filter((s) => s.endsWith(pseudo))
      .map((s) => s.slice(0, -pseudo.length).trim());
  }
  
  /** 是否画出了可见的环（none / 0 0 0 0 transparent 视为不画） */
  const paintsRing = (value) => !!value
    && !/^none$/i.test(value)
    && !/^0(?:px)? 0(?:px)? 0(?:px)? 0(?:px)?(?: (?:transparent|rgba\(0,\s*0,\s*0,\s*0\)))?$/i.test(value);
  
  /** 双环检测：同一基选择器上，`:focus` 画 box-shadow 环 且 `:focus-visible` 画 outline 环 */
  function doubleRingViolations(css) {
    const shadow = new Map(); // base → line
    const outline = new Map(); // base → line
    for (const b of ruleBlocks(css)) {
      if (paintsRing(declOf(b.body, 'box-shadow'))) {
        for (const base of basesOf(b.selector, ':focus')) shadow.set(base, b.line);
      }
      if (paintsRing(declOf(b.body, 'outline'))) {
        for (const base of basesOf(b.selector, ':focus-visible')) outline.set(base, b.line);
      }
    }
    const out = [];
    for (const [base, line] of shadow) {
      if (outline.has(base)) {
        out.push(`${base}：:focus 的 box-shadow 环（第 ${line} 行）与 :focus-visible 的 outline 环（第 ${outline.get(base)} 行）叠加`);
      }
    }
    return out;
  }
  
  /** 选择器列表精确含 selector 的规则体（用于核对「同一个块」的声明） */
  function blockBodyOf(css, selector) {
    const hit = ruleBlocks(css).find((b) => b.selector.split(',').map((s) => s.trim()).includes(selector));
    return hit ? hit.body : '';
  }
  
  // 反例 / 正例（合成样本，必须先证明检测函数会判红、不会误红）
  const SYNTH_DOUBLE = '.probe:focus { border-color: red; box-shadow: 0 0 0 3px rgba(0,0,0,.2); }\n'
    + '.probe:focus-visible { outline: 2px solid red; outline-offset: 1px; }';
  const SYNTH_DOUBLE_SAME_BLOCK = '.probe:focus, .probe:focus-visible { box-shadow: 0 0 0 3px red; outline: 2px solid red; }';
  const SYNTH_SINGLE = '.probe:focus { border-color: red; box-shadow: none; outline: none; }\n'
    + '.probe:focus-visible { outline: 2px solid red; outline-offset: 1px; }';
  
  test('FOCUS-1 焦点单环：同一选择器（块）不得同时出 :focus 的 box-shadow 环与 :focus-visible 的 outline 环', () => {
    // ① 反例：两条规则叠环 ⇒ 必须判红（否则判据是恒真的空转）
    assert.equal(doubleRingViolations(SYNTH_DOUBLE).length, 1,
      '反例未被判红：双环检测失效（判据会变成恒真）');
    // ② 反例：同一个规则块内同时写两种环 ⇒ 同样判红
    assert.equal(doubleRingViolations(SYNTH_DOUBLE_SAME_BLOCK).length, 1,
      '同一规则块内的双环未被判红');
    // ③ 正例：单环（:focus 只改边 / 清环）⇒ 不得误红
    assert.equal(doubleRingViolations(SYNTH_SINGLE).length, 0,
      '正例被判红：双环检测把合法的单环也算成了双环');
  
    // ④ 实况：styles.css 全表零双环
    const blocks = ruleBlocks(CSS);
    assert.ok(blocks.length >= 400, `styles.css 只解析到 ${blocks.length} 个规则块（下限 400）：FOCUS-1 扫描面被写坏`);
    const violations = doubleRingViolations(CSS);
    console.log(`[ui-control-system-guard] FOCUS-1 规则块 ${blocks.length} 个 · 双环 ${violations.length} 处`);
    assert.deepEqual(violations, [],
      `同一控件同时画 box-shadow 环与 outline 环（键盘聚焦会出现两个环）：\n  ${violations.join('\n  ')}`);
  
    // ⑤ 字段外壳的 `:focus` 必须显式清环（不是靠「没写」碰巧对）
    assert.match(blockBodyOf(CSS, '.input-flat:focus'), /box-shadow:\s*none\s*;/,
      '.input-flat:focus 必须显式 box-shadow: none（画环即与 :focus-visible 的 outline 叠成双环）');
    assert.match(blockBodyOf(CSS, '.cs-trigger:focus-within'), /box-shadow:\s*none\s*;/,
      '.cs-trigger:focus-within 必须显式 box-shadow: none（否则 <button> 触发器会落到全局 6px --focus-halo 补环上）');
  });
  
  test('FOCUS-2 输入族只变边框色（零 outline / 零 box-shadow），且与 <select> 共用同一规则块', () => {
    // ① 不得存在裸元素级 :focus-visible 全局规则（那会给所有输入再套一圈）
    const bareGlobal = ruleBlocks(CSS).filter((b) => b.selector.split(',').map((s) => s.trim())
      .some((s) => /^(?::focus-visible|input:focus-visible|textarea:focus-visible|select:focus-visible)$/.test(s)));
    assert.deepEqual(bareGlobal.map((b) => `styles.css:${b.line} → ${b.selector}`), [],
      '存在裸元素级 :focus-visible 全局规则 ⇒ 搜索框会被二次套环');
  
    // ② 搜索 / 输入面：聚焦只允许 border-color，不得出现 outline / box-shadow
    const cases = [
      ['页内检索 / 归档搜索 / 全站搜索（.lf-kw · #archive-search · #ref-search-input）', CSS, '.input-flat:focus'],
      ['下拉内嵌搜索（.cs-search-input）', CSS, '.cs-search-input:focus'],
      ['帮助页搜索（.help-search-input）', HELP_HTML, '.help-search-input:focus'],
      ['帮助页角色筛选（.help-role-filter）', HELP_HTML, '.help-role-filter:focus'],
      ['选人器搜索（.person-picker-search）', PERSON_PICKER_CSS, '.person-picker-search:focus'],
    ];
    for (const [label, src, selector] of cases) {
      const body = blockBodyOf(src, selector);
      assert.ok(body, `缺少 ${label} 的焦点规则块（${selector}）`);
      assert.match(body, /border-color:\s*var\(--app-accent\)\s*;/,
        `${label} 聚焦应只把边框切到主题色（--app-accent）`);
      assert.equal(paintsRing(declOf(body, 'outline')), false,
        `${label} 是输入族，不得用 outline 画焦点（只允许 border-color）`);
      assert.equal(paintsRing(declOf(body, 'box-shadow')), false,
        `${label} 不得用 box-shadow 画焦点`);
    }
  
    // ③ <select> 基准：它与 .input-flat 共用同一个规则块（同一口径，不是两份相近声明）
    const focusBlock = ruleBlocks(CSS).find((b) => b.selector.split(',').map((s) => s.trim()).includes('.input-flat:focus'));
    assert.ok(focusBlock, 'styles.css 缺少 .input-flat:focus 规则块');
    for (const sel of ['.input-flat:focus-visible', '.cs-trigger:focus-within', '.cs-trigger:focus-visible']) {
      assert.ok(focusBlock.selector.split(',').map((s) => s.trim()).includes(sel),
        `<select>（.cs-trigger）与输入框必须共用同一条焦点规则（缺 ${sel}）`);
    }
    assert.match(focusBlock.body, /outline:\s*none\s*;/, '输入族规则块必须显式清掉 outline（.cs-trigger 是 <button>）');
  
    // ④ 四个页面搜索面确实挂在这套类上（不是只改了 CSS、DOM 没接上）
    assert.match(ARCHIVE_HTML, /id="archive-search"[^>]*class="[^"]*input-flat/,
      'archive.html 的 #archive-search 未挂 .input-flat');
    assert.match(SEARCH_HTML, /id="ref-search-input"[^>]*class="[^"]*input-flat/,
      'search.html 的 #ref-search-input 未挂 .input-flat');
    assert.match(LIST_FILTER_JS, /class="input-flat[^"]*lf-kw/, 'list-filter.js 的检索条未挂 .input-flat + .lf-kw');
    assert.match(CUSTOM_SELECT_JS, /class="cs-search-input"/, 'custom-select.js 未渲染 .cs-search-input');
  
    // ⑤ 边框色（焦点信号）对背景 ≥3:1（WCAG 1.4.11 非文本对比；主题色亮档 vs 白卡 / 页面底）
    const accent = /--app-accent-base-light:\s*(#[0-9A-Fa-f]{6})/.exec(CSS)?.[1];
    assert.ok(accent, 'styles.css 缺少 --app-accent-base-light（无法核算边框对比度）');
    const vsCard = contrast(accent, '#FFFFFF');
    const vsPage = contrast(accent, '#FAFAF5');
    console.log(`[ui-control-system-guard] FOCUS-2 焦点边框 ${accent} vs 白卡 ${vsCard.toFixed(2)}:1 · vs 页面底 ${vsPage.toFixed(2)}:1`);
    assert.ok(vsCard >= 3, `焦点边框对白卡仅 ${vsCard.toFixed(2)}:1（要求 ≥3）`);
    assert.ok(vsPage >= 3, `焦点边框对页面底仅 ${vsPage.toFixed(2)}:1（要求 ≥3）`);
  });
  
  test('FOCUS-3 「考勤良好」数值不再用 --status-success（24px 大字 ≥3:1），绿色只留图标', () => {
    // --status-success 亮色 #10B981 对白卡 2.54:1（24px 大字要求 ≥3:1）；
    // 仓内无更深的成功文字 token（--status-warning-text 是警示档、--color-functional-* 是红/金），
    // 故数值退回正文色 --neutral-800，绿色只留在 .stat-icon-tint 的图标笔触上（装饰、aria-hidden）。
    assert.match(STATS, /const ATTENDANCE_VALUE_COLOR = \{[\s\S]{0,80}good: 'var\(--neutral-800\)'/,
      '「良好」档数值色应为 --neutral-800（--status-success 作 24px 数值仅 2.54:1）');
    assert.match(STATS, /color: ATTENDANCE_TONE_COLOR\[myTone\], valueColor: ATTENDANCE_VALUE_COLOR\[myTone\]/,
      '考勤卡须把「图标色」与「数值色」分开取（图标留绿、数值退回正文色）');
    assert.match(STATS, /style="color:\$\{s\.valueColor \|\| s\.color\};"/,
      '数值必须优先取 valueColor（缺省回落到图标色）');
    assert.match(STATS, /class="stat-icon-tint" style="--tint:\$\{s\.color\};"/,
      '图标块仍取绿色 --status-success 作点缀');
    const success = /--status-success:\s*(#[0-9A-Fa-f]{6})/.exec(CSS)?.[1];
    assert.ok(success, 'styles.css 缺少 --status-success');
    const green = contrast(success, '#FFFFFF');
    const body = contrast('#1F2937', '#FFFFFF');
    console.log(`[ui-control-system-guard] FOCUS-3 --status-success/白卡 ${green.toFixed(2)}:1（大字不达标）· --neutral-800/白卡 ${body.toFixed(2)}:1`);
    assert.ok(green < 3, `反证失败：--status-success 对白卡应为 ${green.toFixed(2)}:1（<3），否则本断言失去意义`);
    assert.ok(body >= 4.5, `--neutral-800 对白卡 ${body.toFixed(2)}:1 应 ≥4.5`);
  });
  
  // ═════════════════════════════════════════════════════════════════════════════
  // FOCUS-4…5：全站焦点单一来源 ＋ 七主题焦点环对比度（2026-10-29 P1 全量扫描）
  //   P1：任一控件在任一时刻最多一个焦点信号。
  //     · 有边框控件（输入 / 多行文本 / 下拉触发器 / 搜索框）＝只用 border-color；
  //     · 无边框控件（按钮 / 链接 / 页签 / 行 / 徽章）＝只加一圈 2px 主题色实线，且只由 :focus-visible 触发；
  //     · 任一规则块不得同时声明非 none 的 outline 与非 none 的 box-shadow；
  //     · 焦点色只来自 var(--app-accent)；固定党徽金 #FFD700 / 党建红 #CE1126 / 深棕一律禁止；
  //     · 登记例外：实底控件取反色 --app-accent-strong-ink（内侧 offset -2px）；
  //       顶栏深红底用白色令牌 --app-accent-strong-ink-light；person-picker 的 --pp-accent 是主题色注入别名。
  //   扫描面：docs/src/**/*.css ＋ docs/src/**/*.js 模板串 ＋ docs/*.html 内联样式与类名。
  // ═════════════════════════════════════════════════════════════════════════════
  const FOCUS_SELECTOR_RE = /:focus(?:-visible|-within)?/;
  const FOCUS_ALLOWED_COLOR_TOKENS = [
    'var(--app-accent)',
    'var(--app-accent-strong-ink)',
    'var(--app-accent-strong-ink-light)',
    'var(--pp-accent)',
  ];
  const FOCUS_FORBIDDEN_COLORS = [/#FFD700/i, /#CE1126/i, /--party-gold/, /--party-red/, /--help-party-red/];
  /** 有边框控件：只允许 border-color 变主题色（出现 outline / box-shadow 即红） */
  const INPUT_FAMILY_BASES = [
    '.input-flat', '.input-flat-sm', '.cs-trigger', '.cs-search-input',
    '.vote-note', '.person-picker-search', '.help-search-input', '.help-role-filter',
  ];
  /** 无边框控件：必须有一圈 2px 主题色实线（无环即红） */
  const BUTTON_FAMILY_BASES = [
    'button', 'a', 'summary', '[role="button"]', '[role="option"]', '[role="tab"]',
    '[data-interactive="true"]', '.focus-ring', '.skip-link',
    '.btn-accent', '.btn-accent-soft', '.btn-outline', '.btn-ghost', '.btn-text',
    '.btn-danger', '.btn-danger-solid', '.btn-tab', '.tab-btn', '.subtab',
    '.status-badge', '.cs-option', '.notif-dropdown-item', '.help-toc-item',
    '.help-search-result', '.help-quick-tasks a', '.help-browse summary',
  ];
  
  /** 单份 CSS 的全量焦点扫描：返回 { problems, focusBlocks } */
  function focusScan(css, label) {
    const problems = [];
    const inputSeen = new Map();
    const buttonSeen = new Map();
    let focusBlocks = 0;
    for (const b of ruleBlocks(css)) {
      const sels = b.selector.split(',').map((s) => s.trim());
      const focusSels = sels.filter((s) => FOCUS_SELECTOR_RE.test(s));
      const outline = declOf(b.body, 'outline');
      const shadow = declOf(b.body, 'box-shadow');
      // 任一规则块：焦点信号层数 ≤1（outline 与非 none 的 box-shadow 并存即红）
      if (paintsRing(outline) && paintsRing(shadow)) {
        problems.push(`${label}:${b.line} ${b.selector}：同一规则块同时声明 outline 与 box-shadow 两条环`);
      }
      if (!focusSels.length) continue;
      focusBlocks += 1;
      if (paintsRing(shadow)) {
        problems.push(`${label}:${b.line} ${b.selector}：焦点不得用 box-shadow 画环（${shadow}）`);
      }
      if (paintsRing(outline)) {
        for (const re of FOCUS_FORBIDDEN_COLORS) {
          if (re.test(outline)) {
            problems.push(`${label}:${b.line} ${b.selector}：焦点色「${outline}」是固定党徽金 / 党建红 / 深棕（禁止）`);
          }
        }
        if (!FOCUS_ALLOWED_COLOR_TOKENS.some((t) => outline.includes(t))) {
          problems.push(`${label}:${b.line} ${b.selector}：焦点环色「${outline}」不是 var(--app-accent)（或登记取反别名）`);
        }
      }
      for (const sel of focusSels) {
        const base = sel.replace(/:focus(?:-visible|-within)?$/, '');
        if (INPUT_FAMILY_BASES.some((x) => base === x || base.startsWith(`${x}[`))) {
          if (paintsRing(outline)) {
            problems.push(`${label}:${b.line} ${sel}：输入族不得用 outline 画焦点（只允许 border-color）`);
          }
          const rec = inputSeen.get(base) || { color: false };
          if (/border-color:\s*var\(--app-accent\)\s*;/.test(b.body)) rec.color = true;
          inputSeen.set(base, rec);
        }
        if (BUTTON_FAMILY_BASES.includes(base) && !/:disabled|\[data-disabled/.test(sel)) {
          const rec = buttonSeen.get(base) || { ring: false };
          if (paintsRing(outline)) rec.ring = true;
          buttonSeen.set(base, rec);
        }
      }
    }
    for (const [base, rec] of inputSeen) {
      if (!rec.color) problems.push(`${label}：输入族 ${base} 有焦点规则但没有 border-color: var(--app-accent)`);
    }
    for (const [base, rec] of buttonSeen) {
      if (!rec.ring) problems.push(`${label}：按钮族 ${base} 的焦点规则没有环（outline 为空或 none）`);
    }
    return { problems, focusBlocks };
  }
  
  /** JS / HTML 行内焦点工具类（绕过 styles.css 的第二套写法） */
  function inlineFocusProblems(src) {
    const problems = [];
    src.split('\n').forEach((line, i) => {
      const ln = i + 1;
      if (/focus(?:-visible)?:(?:outline|ring)/.test(line)) {
        problems.push(`第 ${ln} 行：行内焦点工具类绕过 styles.css（${line.trim().slice(0, 100)}）`);
      }
      if (/outline-\[#[0-9A-Fa-f]{3,8}\]/.test(line)) {
        problems.push(`第 ${ln} 行：硬编码 hex 焦点环（${line.trim().slice(0, 100)}）`);
      }
      if (/(#FFD700|#CE1126|outline-blue|ring-blue)/i.test(line) && /focus/i.test(line)) {
        problems.push(`第 ${ln} 行：焦点色写死党徽金 / 党建红 / 蓝色工具类（${line.trim().slice(0, 100)}）`);
      }
    });
    return problems;
  }
  
  /** HTML 页内的 <style> 段；CSS 文件原样返回 */
  function cssOf(label, src) {
    return label.endsWith('.html')
      ? [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n')
      : src;
  }
  
  /** 递归收集 docs/src 下 .css（与 .js 扫描面同源） */
  function walkCss(dir, out = []) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) walkCss(p, out);
      else if (name.endsWith('.css')) out.push(p);
    }
    return out;
  }
  
  test('FOCUS-4 全量扫描：每控件最多一个焦点信号；输入族零 outline；按钮族必有环；焦点色无党徽金/党建红', () => {
    // ① 反例：同一规则块「边框 + outline 环 + box-shadow 环」三层 ⇒ 必须判红
    const SYNTH_LAYERS = '.probe:focus { border-color: red; outline: 2px solid red; box-shadow: 0 0 0 3px red; }';
    assert.ok(focusScan(SYNTH_LAYERS, 'probe').problems.some((p) => /两条环/.test(p)),
      '反例未被判红：同一规则块的 outline + box-shadow 双层检测失效');
    // ② 反例：输入族出现 outline ⇒ 必须判红
    const SYNTH_INPUT = '.input-flat:focus { border-color: var(--app-accent); outline: 2px solid var(--app-accent); }';
    assert.ok(focusScan(SYNTH_INPUT, 'probe').problems.some((p) => /输入族不得用 outline/.test(p)),
      '反例未被判红：输入族写 outline 必须命中');
    // ③ 反例：按钮族无环 ⇒ 必须判红
    const SYNTH_BTN = 'button:focus-visible { outline: none; box-shadow: none; }';
    assert.ok(focusScan(SYNTH_BTN, 'probe').problems.some((p) => /按钮族 button/.test(p)),
      '反例未被判红：按钮族没有焦点环必须命中');
    // ④ 反例：焦点色改用固定党徽金 / 党建红 ⇒ 必须判红
    const SYNTH_GOLD = '.probe:focus-visible { outline: 2px solid #FFD700; box-shadow: none; }';
    const SYNTH_RED = '.probe:focus-visible { outline: 2px solid #CE1126; box-shadow: none; }';
    assert.ok(focusScan(SYNTH_GOLD, 'probe').problems.length >= 1, '反例未被判红：#FFD700 作焦点色');
    assert.ok(focusScan(SYNTH_RED, 'probe').problems.length >= 1, '反例未被判红：#CE1126 作焦点色');
    // ⑤ 正例：输入族只变色 + 按钮族单环 ⇒ 不得误红
    const SYNTH_OK = '.input-flat:focus { border-color: var(--app-accent); outline: none; box-shadow: none; }\n'
      + 'button:focus-visible { outline: 2px solid var(--app-accent); outline-offset: 1px; box-shadow: none; }';
    assert.deepEqual(focusScan(SYNTH_OK, 'probe').problems, [], '正例被判红：合法的单信号焦点被误判');
    // ⑥ 反例 / 正例：行内焦点工具类
    assert.ok(inlineFocusProblems('<div class="focus-visible:outline focus-visible:outline-[#CE1126]">').length >= 1,
      '反例未被判红：行内 focus-visible:outline-[#CE1126] 必须命中');
    assert.equal(inlineFocusProblems('<div class="focus-ring">').length, 0,
      '正例被判红：统一语义类 focus-ring 不得命中');
    console.log(`[ui-control-system-guard] FOCUS-4 反例判定：双层 ${focusScan(SYNTH_LAYERS, 'probe').problems.length} 处 · 输入 outline ${focusScan(SYNTH_INPUT, 'probe').problems.length} 处 · 按钮无环 ${focusScan(SYNTH_BTN, 'probe').problems.length} 处 · #FFD700 ${focusScan(SYNTH_GOLD, 'probe').problems.length} 处 · #CE1126 ${focusScan(SYNTH_RED, 'probe').problems.length} 处 · 行内工具类 ${inlineFocusProblems('<div class="focus-visible:outline focus-visible:outline-[#CE1126]">').length} 处`);
  
    // ⑦ 实况全量：CSS 文件 ＋ HTML 内联 <style> / 类名 ＋ JS 模板串
    const cssFiles = walkCss(SRC);
    const htmlFiles = readdirSync(join(ROOT, 'docs'))
      .filter((n) => n.endsWith('.html')).map((n) => join(ROOT, 'docs', n));
    const jsFiles = walkJs(SRC);
    assert.ok(cssFiles.length >= 4, `只扫描到 ${cssFiles.length} 个 CSS 文件（下限 4）`);
    assert.ok(jsFiles.length >= 250, `只扫描到 ${jsFiles.length} 个 JS 文件（下限 250）`);
    assert.ok(htmlFiles.length >= 15, `只扫描到 ${htmlFiles.length} 个 HTML 文件（下限 15）`);
  
    let focusBlocks = 0;
    const problems = [];
    for (const p of cssFiles) {
      const label = relative(ROOT, p).replace(/\\/g, '/');
      const r = focusScan(readFileSync(p, 'utf8'), label);
      focusBlocks += r.focusBlocks;
      problems.push(...r.problems);
    }
    for (const p of htmlFiles) {
      const label = relative(ROOT, p).replace(/\\/g, '/');
      const src = readFileSync(p, 'utf8');
      const r = focusScan(cssOf(label, src), label);
      focusBlocks += r.focusBlocks;
      problems.push(...r.problems);
      problems.push(...inlineFocusProblems(src).map((x) => `${label} ${x}`));
    }
    for (const p of jsFiles) {
      const label = relative(ROOT, p).replace(/\\/g, '/');
      problems.push(...inlineFocusProblems(readFileSync(p, 'utf8')).map((x) => `${label} ${x}`));
    }
    assert.ok(focusBlocks >= 40, `只扫描到 ${focusBlocks} 条焦点规则（下限 40）：扫描面被写坏，本断言会恒真`);
    console.log(`[ui-control-system-guard] FOCUS-4 焦点规则 ${focusBlocks} 条 · CSS ${cssFiles.length} / JS ${jsFiles.length} / HTML ${htmlFiles.length} · 违规 ${problems.length} 处`);
    assert.deepEqual(problems, [],
      `焦点必须只有一个信号（输入族只变色 / 按钮族只有一圈 / 不得用 box-shadow / 不得用党徽金或党建红）：\n  ${problems.join('\n  ')}`);
  });
  
  test('FOCUS-5 七主题 ＋ 场域固定色 base 焦点环：对白卡 #FFFFFF 与深卡 #141D2F 均 ≥3:1（逐色日志）', () => {
    const CARD_LIGHT = '#FFFFFF';
    const CARD_DARK = '#141D2F';
    // 2026-11-25 批次 627（D-925）：ACCENT_COLORS 增场域固定色 party-red（登录 / 党委 / 支部治理四台），
    //   焦点环同样按主题色取值，故一并纳入对比度检查。
    const keys = ['gold', 'red', 'orange', 'green', 'cyan', 'blue', 'purple', 'party-red'];
    assert.deepEqual(Object.keys(ACCENT_COLORS).sort(), [...keys].sort(),
      'ACCENT_COLORS 必须为七用户主题 ＋ party-red（场域固定色）');
    const readings = [];
    for (const key of keys) {
      const light = ACCENT_COLORS[key].light.base;
      const dark = ACCENT_COLORS[key].dark.base;
      assert.match(light, /^#[0-9A-Fa-f]{6}$/, `${key} 亮档 base 不是合法 hex：${light}`);
      assert.match(dark, /^#[0-9A-Fa-f]{6}$/, `${key} 暗档 base 不是合法 hex：${dark}`);
      const vsLight = contrast(light, CARD_LIGHT);
      const vsDark = contrast(dark, CARD_DARK);
      readings.push(`${key} 亮 ${light} vs 白卡 ${vsLight.toFixed(2)}:1 · 暗 ${dark} vs 深卡 ${vsDark.toFixed(2)}:1`);
      assert.ok(vsLight >= 3, `${key} 亮档焦点环对白卡仅 ${vsLight.toFixed(2)}:1（要求 ≥3）`);
      assert.ok(vsDark >= 3, `${key} 暗档焦点环对深卡仅 ${vsDark.toFixed(2)}:1（要求 ≥3）`);
    }
    console.log(`[ui-control-system-guard] FOCUS-5 ${readings.join(' · ')}`);
  });
  
  // ═════════════════════════════════════════════════════════════════════════════
  // V9 数据表表头去灰（2026-11-01 支书 #2）
  //   病灶：`.data-table th` 声明 `background-color: var(--neutral-0)`，
  //     `.data-table thead th` 又声明 `background: var(--neutral-50)` ⇒ 同一页里 `<thead>` 表头显灰、
  //     tbody 的 `<th scope="row">`（relation-matrix）显白，两套表头「莫名其妙的灰显脏」。
  //   裁定：表头统一无底色（白底透出）＋ 1px 下边框；**两条规则体内都不得出现 background**。
  //   抽取口径＝本文件既有的 `ruleBlocks`（剥注释保留换行、按逗号拆选择器、空白归一）。
  // ═════════════════════════════════════════════════════════════════════════════
  const HEADER_SELECTORS = ['.data-table th', '.data-table thead th'];
  
  /** 纯判据：返回给数据表表头声明了 background / background-color 的规则（正反例复用同一口径） */
  function tableHeaderBackgroundProblems(css) {
    const out = [];
    for (const r of ruleBlocks(css)) {
      const sels = r.selector.split(',').map((s) => s.trim());
      if (!sels.some((s) => HEADER_SELECTORS.includes(s))) continue;
      const m = /(?:^|[;\s])background(?:-color)?\s*:\s*([^;]+)/.exec(r.body);
      if (m) out.push(`${r.selector} → background: ${m[1].trim()}`);
    }
    return out;
  }
  
  test('V9 表头去灰：`.data-table th` / `.data-table thead th` 不得声明 background（含反例）', () => {
    // ① 反例：任一条重新写底色 ⇒ 必须判红（合成样本，防判据恒真）
    assert.equal(tableHeaderBackgroundProblems('.data-table thead th { background: var(--neutral-50); }').length, 1,
      '反例未被判红：`.data-table thead th` 的 neutral-50 底色必须命中');
    assert.equal(tableHeaderBackgroundProblems('.data-table th { background-color: var(--neutral-0); }').length, 1,
      '反例未被判红：`.data-table th` 的 neutral-0 底色必须命中');
    // ② 正例：只留边框 / 字号 / 字重 / 字色 ⇒ 不得误红
    assert.deepEqual(tableHeaderBackgroundProblems(
      '.data-table thead th { font-size: 0.8125rem; border-bottom: 1px solid var(--neutral-200); }'), [],
    '正例被判红：无底色的表头规则不得误判');
    assert.deepEqual(tableHeaderBackgroundProblems('.data-table tbody td { background: var(--neutral-0); }'), [],
      '正例被判红：数据格（不是表头）的底色不属于本判据');
  
    // ③ 实况：两条规则都不得带 background；且规则本体仍在位（不得用「删规则」换绿）
    const problems = tableHeaderBackgroundProblems(CSS);
    assert.deepEqual(problems, [],
      `表头被重新铺了底色（同页 thead 与 th[scope=row] 会再次不同色）：\n  ${problems.join('\n  ')}`);
  
    const blocks = ruleBlocks(CSS);
    const pick = (sel, extra) => blocks.filter((r) => {
      const sels = r.selector.split(',').map((s) => s.trim());
      return sels.includes(sel) && (!extra || extra.test(r.body));
    });
    const thead = pick('.data-table thead th');
    assert.equal(thead.length, 1, `styles.css 中 \`.data-table thead th\` 规则应恰好 1 条（实得 ${thead.length}）`);
    assert.match(thead[0].body, /border-bottom:\s*1px solid var\(--neutral-200\)/,
      '表头去灰后，分隔必须由 1px 下边框承担');
    assert.match(thead[0].body, /font-size:\s*0\.8125rem/, '表头字号仍应为 0.8125rem 单档');
    const th = pick('.data-table th', /padding/);
    assert.equal(th.length, 1, `styles.css 中带 padding 的 \`.data-table th\` 规则应恰好 1 条（实得 ${th.length}）`);
    assert.match(th[0].body, /color:\s*var\(--neutral-500\)/, '表头字色仍应为 --neutral-500');
    console.log(`[ui-control-system-guard] V9 表头规则 ${blocks.length} 条 · 带底色的表头 ${problems.length} 条`);
  });

})();

// ═══ 源件 7：ui-custom-select.test.mjs ═══
await (async () => {
  // server/test/ui-custom-select.test.mjs — 自定义下拉键盘可达守卫（2026-10-21 · R5A-03）
  //
  // 来源：`.ctx/logs/archive/2026-10/AUDIT_R5_A_WEB_GUIDELINES.md` R5A-03。
  // 判据（静态源码）：
  //   K1 触发器：稳定 id + aria-labelledby（字段标签 + 当前值）+ aria-haspopup=listbox
  //      + aria-expanded + role=combobox + aria-controls；
  //   K2 原生 select 只是值载体：tabIndex=-1 且 aria-hidden=true，读屏不再遇到第二个 combobox；
  //   K3 listbox 选项可聚焦（tabindex=-1），ArrowUp/Down/Home/End/Enter/Space/Escape 都有分支；
  //   K4 打开时焦点进 listbox（无搜索框时落选中/首项），关闭（Esc）时归还触发器；
  //   K5 选项键盘焦点有可见样式（主题色 2px / offset 1px / 无 box-shadow）。
  //
  // 运行：node --test server/test/ui-custom-select.test.mjs
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const SELECT = readFileSync(join(ROOT, 'docs', 'src', 'components', 'ui', 'custom-select.js'), 'utf8');
  const STYLES = readFileSync(join(ROOT, 'docs', 'src', 'styles.css'), 'utf8');
  
  test('K1 触发器：id / aria-labelledby / combobox / haspopup / expanded / controls', () => {
    assert.match(SELECT, /trigger\.id\s*=\s*`\$\{sel\.id/, '触发器应有稳定 id（取原生 select id）');
    assert.match(SELECT, /trigger\.setAttribute\('role',\s*'combobox'\)/, '触发器应暴露 role=combobox');
    assert.match(SELECT, /trigger\.setAttribute\('aria-labelledby',\s*labelledBy\.join\(' '\)\)/,
      '触发器应把字段标签 + 当前值串成 aria-labelledby');
    assert.match(SELECT, /sel\.labels/, '应从原生 select 的 label 取字段名');
    assert.match(SELECT, /trigger\.setAttribute\('aria-haspopup',\s*'listbox'\)/, '缺 aria-haspopup=listbox');
    assert.match(SELECT, /trigger\.setAttribute\('aria-expanded',\s*'false'\)/, '缺初始 aria-expanded=false');
    assert.match(SELECT, /trigger\.setAttribute\('aria-controls',\s*menu\.id\)/, '缺 aria-controls（指向 listbox）');
  });
  
  test('K2 原生 select：tabIndex=-1 + aria-hidden，避免重复控件', () => {
    assert.match(SELECT, /sel\.tabIndex\s*=\s*-1/, '原生 select 应移出 Tab 序列');
    assert.match(SELECT, /sel\.setAttribute\('aria-hidden',\s*'true'\)/, '原生 select 应 aria-hidden=true');
  });
  
  test('K3 listbox 选项可聚焦，方向键 / Home / End / Enter / Space / Esc 齐备', () => {
    assert.match(SELECT, /item\.tabIndex\s*=\s*-1/, '选项应可编程聚焦');
    assert.match(SELECT, /menu\.addEventListener\('keydown'/, 'listbox 缺 keydown 处理');
    for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', 'Escape']) {
      assert.match(SELECT, new RegExp(`case '${key}'`), `缺 ${key} 键分支`);
    }
    assert.match(SELECT, /case ' ':/, '缺 Space 选择分支');
    assert.match(SELECT, /function _enabledOptions\(menu\)/, '缺「可聚焦选项」收集（须排除禁用项与搜索过滤项）');
    assert.match(SELECT, /is-disabled/, '_enabledOptions 应排除禁用项');
    assert.match(SELECT, /style\.display !== 'none'/, '_enabledOptions 应排除被搜索过滤隐藏的项');
  });
  
  test('K4 打开焦点进 listbox；Esc 关闭后归还触发器', () => {
    assert.match(SELECT, /_enabledOptions\(menu\)\[0\][\s\S]{0,40}\|\|\s*menu/, '无选项时应聚焦 listbox 自身');
    assert.match(SELECT, /target\.focus\(\)/, '打开菜单后应把焦点移入 listbox');
    assert.match(SELECT, /_closeMenu\(wrapper,\s*menu,\s*trigger,\s*\{\s*restoreFocus:\s*true\s*\}\)/,
      'Esc 关闭应回焦触发器');
    assert.match(SELECT, /if \(restoreFocus\) trigger\.focus\(\)/, 'restoreFocus 分支应真正回焦');
    assert.match(SELECT, /function _selectOption/, '选择应走单一入口（写回 + change + 关闭 + 回焦）');
  });
  
  test('K5 选项键盘焦点可见（主题色 2px / offset 1px / 无光晕）', () => {
    const rule = STYLES.match(/\.cs-option:focus-visible\s*\{([^}]*)\}/)?.[1] || '';
    assert.ok(rule, 'styles.css 缺 .cs-option:focus-visible');
    assert.match(rule, /outline:\s*2px solid var\(--app-accent\)/, '选项焦点应使用主题色 --app-accent');
    assert.match(rule, /outline-offset:\s*1px\s*;/, '选项焦点偏移应为 1px');
    assert.match(rule, /box-shadow:\s*none\s*;/, '选项焦点不得再叠 box-shadow 光晕');
  });

})();

// ═══ 源件 8：ui-select-appearance-guard.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // ui-select-appearance-guard.test.mjs — 下拉外观三档与状态一致性守卫（2026-10-20 界面细化批）
  //
  // 来源：`.ctx/logs/archive/2026-10/UI_REDUNDANCY_AUDIT.md` A-10 / B-21 / C-05 / C-06 / C-08。
  // 判据：
  //   S1 大字号：styles.css 在 `html.font-size-large` 下必须覆盖菜单四项字号
  //      （.cs-option / .cs-group-label / .cs-search-input / .cs-empty）；
  //   S2 深色：选中项必须覆写为「近白字 + 主题色淡底」，不得继续用亮色主题注入的深字；
  //   S3 禁用：custom-select.js 必须把 select.disabled 同步到触发器（disabled + aria-disabled），
  //      并在属性变化时跟随；
  //   S4 空态：0 选项时菜单必须渲染「暂无可选项」；
  //   S5 分组禁用：optgroup.disabled 必须传递到分组标题与子项（不可选）；
  //   S6 非空转：选择器抽取有正/负例，避免「写进注释也算命中」。
  // 运行：node --test server/test/ui-select-appearance-guard.test.mjs
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const ROOT = join(import.meta.dirname, '..', '..');
  const STYLES = readFileSync(join(ROOT, 'docs/src/styles.css'), 'utf8');
  const SELECT = readFileSync(join(ROOT, 'docs/src/components/ui/custom-select.js'), 'utf8');
  
  /** 取某选择器后第一对花括号内的声明体（导出给非空转自检复用） */
  function ruleBody(css, selector) {
    const idx = String(css).indexOf(selector);
    if (idx < 0) return '';
    const open = String(css).indexOf('{', idx);
    const close = String(css).indexOf('}', open);
    if (open < 0 || close < 0) return '';
    return String(css).slice(open + 1, close);
  }
  
  const LARGE_FONT_RULES = [
    'html.font-size-large .cs-option',
    'html.font-size-large .cs-group-label',
    'html.font-size-large .cs-search-input',
    'html.font-size-large .cs-empty',
  ];
  
  test('S1 大字号：菜单四项都有字号覆盖（不再 11–12px 卡在 17px 触发器下）', () => {
    for (const selector of LARGE_FONT_RULES) {
      const body = ruleBody(STYLES, selector);
      assert.ok(body, `styles.css 缺少 ${selector} 规则`);
      assert.match(body, /(?:^|[;\s])font-size:\s*[^;]+;/, `${selector} 缺 font-size（大字号档未覆盖）`);
    }
  });
  
  test('S2 深色：选中项走主题 soft 三件套（亮/暗由 token 别名选边），不逐点覆盖', () => {
    // 2026-10-23 批次 506：深色不再逐点写 `html.theme-dark .cs-option.is-selected` 补丁——
    //   浅底/深字改为消费 `--app-accent-soft-bg/-soft-text`，`html.theme-dark` 段把 8 个别名
    //   整体切到 `*-dark`（见 theme-palette-guard T1），故日夜同源、也不会「深字叠深底」。
    const body = ruleBody(STYLES, '.cs-option.is-selected');
    assert.ok(body, 'styles.css 缺少 .cs-option.is-selected');
    assert.match(body, /(?:^|[;\s])background:\s*var\(--app-accent-soft-bg\)/, '选中项底色应为 --app-accent-soft-bg');
    assert.match(body, /(?:^|[;\s])color:\s*var\(--app-accent-soft-text\)/, '选中项文字应为 --app-accent-soft-text');
    assert.equal(
      ruleBody(STYLES, 'html.theme-dark .cs-option.is-selected'), '',
      '不应再保留深色逐点补丁（暗色由 --app-accent-soft-* 的 *-dark 别名承担）'
    );
    const darkBlock = STYLES.slice(STYLES.indexOf('html.theme-dark {'));
    assert.match(darkBlock, /--app-accent-soft-bg:\s*var\(--app-accent-soft-bg-dark\)/, '深色段应把 softBg 别名切到 *-dark');
    assert.match(darkBlock, /--app-accent-soft-text:\s*var\(--app-accent-soft-text-dark\)/, '深色段应把 softText 别名切到 *-dark');
  });
  
  test('S3 禁用：select.disabled 同步到触发器（disabled + aria-disabled），并监听属性变化', () => {
    assert.match(SELECT, /trigger\.disabled\s*=\s*disabled/, '触发器未同步 disabled');
    assert.match(SELECT, /setAttribute\(\s*'aria-disabled'\s*,\s*'true'\s*\)/, '触发器缺 aria-disabled="true"');
    assert.match(SELECT, /removeAttribute\(\s*'aria-disabled'\s*\)/, '解除禁用时未移除 aria-disabled');
    assert.match(SELECT, /attributeFilter:\s*\['value',\s*'disabled'\]/, 'MutationObserver 未跟随 disabled 属性');
    assert.match(STYLES, /\.cs-trigger:disabled[\s\S]{0,160}cursor:\s*not-allowed/, 'styles.css 缺禁用触发器灰化样式');
  });
  
  test('S4 空态：0 选项时菜单渲染「暂无可选项」', () => {
    assert.match(SELECT, /sel\.options\.length\s*===\s*0/, '未判断 0 选项');
    assert.match(SELECT, /暂无可选项/, '0 选项时未渲染「暂无可选项」');
  });
  
  test('S5 分组禁用：optgroup.disabled 传递到标题与子项', () => {
    assert.match(SELECT, /node\.disabled/, '未读取 optgroup.disabled');
    assert.match(SELECT, /appendOption\(o,\s*frag,\s*!!node\.disabled\)/, '分组禁用未传递给子项');
    assert.match(SELECT, /head\.classList\.add\('is-disabled'\)/, '分组标题未加禁用态');
    assert.match(STYLES, /\.cs-group-label\.is-disabled/, 'styles.css 缺分组禁用灰态');
  });
  
  test('S6 非空转：选择器抽取正/负例', () => {
    assert.match(ruleBody('a { color: red; } html.font-size-large .cs-option { font-size: 1rem; }', 'html.font-size-large .cs-option'),
      /font-size:\s*1rem/, '抽取口径失效：正样本未取到声明体');
    assert.equal(ruleBody('a { color: red; }', 'html.font-size-large .cs-empty'), '', '抽取口径失效：不存在的选择器应返回空');
  });

})();

// ═══ 源件 9：ui-focus-ring.test.mjs ═══
await (async () => {
  // server/test/ui-focus-ring.test.mjs — 焦点可见性守卫（2026-10-21 · R5A-04/05）
  //
  // 来源：`.ctx/logs/archive/2026-10/AUDIT_R5_A_WEB_GUIDELINES.md` R5A-04/05。
  // 2026-10-29 P1（焦点只有一个信号）后本文件的判据：
  //   F1 唯一来源：--focus-ring / --focus-halo 两个旧变量已删除，焦点颜色只用 --app-accent；
  //   F2 全局按钮 / 链接 / summary / role 控件 / 行 / .focus-ring 只声明一条 outline
  //      （2px 主题色 / offset 1px / 无 box-shadow）；
  //   F3 输入族（有边框控件）：`:focus` 与 `:focus-visible` 同表现——只变 border-color，
  //      不出 outline、不出 box-shadow（鼠标与键盘一致）；
  //   F4 对比度：七主题 × 亮/暗的主题色（边框色 / 环色同源）vs 页面底 / 白卡 ≥ 3:1；
  //   F5 非空转：对比度函数有正/负例，规则抽取不把不存在规则当命中；
  //   F6 顶栏三按钮并入同一口径（不再用党徽金 + 金晕），且不得出现两条环。
  //
  // 运行：node --test server/test/ui-focus-ring.test.mjs
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const STYLES = readFileSync(join(ROOT, 'docs', 'src', 'styles.css'), 'utf8').replace(/\r\n/g, '\n');
  
  const GOLD = '#FFD700';
  const DARK_SURFACE = '#0B1220';
  const DARK_CARD = '#141D2F';
  const LIGHT_SURFACE = '#FAFAF5';
  const LIGHT_CARD = '#FFFFFF';
  const HEADER_RED = '#7A0010';
  
  /** 七主题的主题色 base（与 constants.js ACCENT_COLORS 同值；亮/暗各一） */
  const THEME_ACCENTS = {
    gold:   { light: '#A97A12', dark: '#E0B24C' },
    red:    { light: '#A32B24', dark: '#E0796F' },
    orange: { light: '#B45B33', dark: '#E39B6F' },
    green:  { light: '#2F6B4F', dark: '#7CC4A0' },
    cyan:   { light: '#0F6D7B', dark: '#63B8C7' },
    blue:   { light: '#3D4E9C', dark: '#8F9EDB' },
    purple: { light: '#6D5382', dark: '#B79FCB' },
  };
  
  function _ruleBody(css, selector) {
    const idx = css.indexOf(selector);
    if (idx < 0) return '';
    const open = css.indexOf('{', idx);
    const close = css.indexOf('}', open);
    return open < 0 || close < 0 ? '' : css.slice(open + 1, close);
  }
  
  /** sRGB 相对亮度（WCAG 定义） */
  function _luminance(hex) {
    const raw = String(hex).replace('#', '');
    const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
    const channels = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
    const [r, g, b] = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  
  function _contrast(a, b) {
    const [hi, lo] = [_luminance(a), _luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  }
  
  test('F1 唯一来源：--focus-ring / --focus-halo 已删除，焦点颜色只用 --app-accent', () => {
    // 2026-10-28：支书裁定全站只用主题色；两个旧变量（亮色深灰 / 暗色覆盖）一律退场。
    assert.doesNotMatch(STYLES, /--focus-ring\s*:/, 'styles.css 不应再定义 --focus-ring');
    assert.doesNotMatch(STYLES, /--focus-halo\s*:/, 'styles.css 不应再定义 --focus-halo');
    assert.doesNotMatch(STYLES, /var\(--focus-ring\)/, 'styles.css 不应再引用 var(--focus-ring)');
    assert.doesNotMatch(STYLES, /var\(--focus-halo\)/, 'styles.css 不应再引用 var(--focus-halo)');
    assert.match(STYLES, /--app-accent:\s+var\(--app-accent-base-light\)/, '主题色 token 应存在');
    const darkBlock = STYLES.match(/html\.theme-dark\s*\{([\s\S]*?)\n\s*\}/)?.[1] || '';
    assert.ok(darkBlock, '缺少 html.theme-dark 变量块');
    assert.doesNotMatch(darkBlock, /--focus-(?:ring|halo)\s*:/, '暗色段不应再覆盖旧焦点环变量');
  });
  
  test('F2 全局控制器只声明一条 outline（2px 主题色 / offset 1px / 无 box-shadow）', () => {
    const body = _ruleBody(STYLES, 'button:focus-visible,\na:focus-visible');
    assert.ok(body, '缺少全局 button/a:focus-visible 规则');
    const outlines = body.match(/outline:\s*[^;]+;/g) || [];
    assert.equal(outlines.length, 1, `全局焦点环应只声明一条 outline，实测 ${outlines.length}`);
    assert.match(body, /outline:\s*2px solid var\(--app-accent\)/, '全局焦点环应使用主题色 --app-accent');
    assert.match(body, /outline-offset:\s*1px\s*;/, '全局焦点环偏移应为 1px');
    assert.match(body, /box-shadow:\s*none\s*;/, '全局焦点环不得再叠 box-shadow 光晕');
    for (const sel of ['summary:focus-visible', '[role="button"]:focus-visible', '[role="option"]:focus-visible', '[role="tab"]:focus-visible', '[data-interactive="true"]:focus-visible', '.focus-ring:focus-visible']) {
      assert.ok(body.includes(sel) || STYLES.includes(sel), `全局焦点规则应覆盖 ${sel}`);
    }
  
    // 实底控件（.btn-accent / .btn-danger-solid / 实底 status-badge）：2026-10-28 改用负偏移，
    // 环落在主题色实底内侧；否则白环 / 深墨环落在卡片上（≈1.05–1.14:1）等于看不见。
    const solid = _ruleBody(STYLES, '.btn-accent:focus-visible,\n.btn-danger-solid:focus-visible');
    assert.ok(solid, '缺少实底控件焦点环规则（.btn-accent / .btn-danger-solid）');
    assert.match(solid, /outline:\s*2px solid var\(--app-accent-strong-ink\)\s*;/, '实底控件环色应为 --app-accent-strong-ink');
    assert.match(solid, /outline-offset:\s*-2px\s*;/, '实底控件环必须内压（offset -2px），不得落在外侧卡片上');
    assert.match(solid, /box-shadow:\s*none\s*;/, '实底控件环不得叠 box-shadow');
    assert.match(STYLES, /\.status-badge\[aria-pressed="true"\]:focus-visible/, '实底 status-badge 须纳入同一条内压环');
  
    const tok = (name) => new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})\\s*;`).exec(STYLES)?.[1];
    const solidPairs = [
      ['亮色白环 vs 实底 strongBg', tok('app-accent-strong-ink-light'), tok('app-accent-strong-bg-light')],
      ['暗色深墨环 vs 实底 strongBg', tok('app-accent-strong-ink-dark'), tok('app-accent-strong-bg-dark')],
    ];
    for (const [label, ink, bg] of solidPairs) {
      assert.ok(ink && bg, `styles.css 缺少实底环 / 底色令牌（无法核算「${label}」）`);
      const ratio = _contrast(ink, bg);
      console.log(`[ui-focus-ring] F2 ${label} ${ink} / ${bg} ${ratio.toFixed(2)}:1`);
      assert.ok(ratio >= 3, `${label} 仅 ${ratio.toFixed(2)}:1（要求 ≥3）`);
    }
  });
  
  test('F3 输入族：:focus 与 :focus-visible 同表现——只变边框色，不出环、不出阴影', () => {
    // 2026-10-29 P1：输入框是「有边框控件」⇒ 焦点只有一个信号（border-color）。
    const focus = _ruleBody(STYLES, '.input-flat:focus, .cs-trigger:focus-within')
      || _ruleBody(STYLES, '.input-flat:focus');
    assert.ok(focus, '缺少 .input-flat:focus 字段外壳规则');
    assert.match(focus, /border-color:\s*var\(--app-accent\)/, '活动态边框应为主题色');
    assert.match(focus, /outline:\s*none\s*;/, '活动态不得出 outline（输入族只允许 border-color）');
    assert.match(focus, /box-shadow:\s*none\s*;/, '活动态不得出 box-shadow');
    // 键盘态与鼠标态共用同一个规则块（不是各写一套）。
    const kb = _ruleBody(STYLES, '.input-flat:focus-visible');
    assert.equal(kb, focus, '`:focus` 与 `:focus-visible` 必须是同一个规则块（鼠标 / 键盘同表现）');
    for (const [label, sel] of [
      ['紧凑档', '.input-flat-sm:focus'],
      ['下拉内嵌搜索', '.cs-search-input:focus'],
      ['投票备注', '.vote-note:focus'],
    ]) {
      const body = _ruleBody(STYLES, sel);
      assert.ok(body, `缺少 ${label}（${sel}）焦点规则`);
      assert.match(body, /border-color:\s*var\(--app-accent\)/, `${label} 聚焦应把边框切到主题色`);
      const outline = /(?:^|;)\s*outline\s*:\s*([^;]+)/.exec(body)?.[1]?.trim();
      assert.ok(!outline || /^none$/i.test(outline), `${label} 不得出 outline（输入族只允许 border-color）`);
      const shadow = /(?:^|;)\s*box-shadow\s*:\s*([^;]+)/.exec(body)?.[1]?.trim();
      assert.ok(!shadow || /^none$/i.test(shadow), `${label} 不得出 box-shadow`);
    }
  });
  
  test('F4 对比度：七主题 × 亮/暗的主题色 vs 页面底 / 白卡 ≥ 3:1', () => {
    // 2026-10-28：焦点环改用主题色，故逐主题核算；数值只报不藏（低于 3 须在交付说明中报告）。
    for (const [key, pair] of Object.entries(THEME_ACCENTS)) {
      assert.ok(_contrast(pair.light, LIGHT_SURFACE) >= 3,
        `${key} 亮色焦点环 vs 页面底仅 ${_contrast(pair.light, LIGHT_SURFACE).toFixed(2)}:1`);
      assert.ok(_contrast(pair.light, LIGHT_CARD) >= 3,
        `${key} 亮色焦点环 vs 白卡仅 ${_contrast(pair.light, LIGHT_CARD).toFixed(2)}:1`);
      assert.ok(_contrast(pair.dark, DARK_SURFACE) >= 3,
        `${key} 暗色焦点环 vs 暗页面底仅 ${_contrast(pair.dark, DARK_SURFACE).toFixed(2)}:1`);
      assert.ok(_contrast(pair.dark, DARK_CARD) >= 3,
        `${key} 暗色焦点环 vs 暗卡仅 ${_contrast(pair.dark, DARK_CARD).toFixed(2)}:1`);
      console.log(`[ui-focus-ring] F4 ${key}: light ${pair.light} 页 ${_contrast(pair.light, LIGHT_SURFACE).toFixed(2)} / 卡 ${_contrast(pair.light, LIGHT_CARD).toFixed(2)} · dark ${pair.dark} 页 ${_contrast(pair.dark, DARK_SURFACE).toFixed(2)} / 卡 ${_contrast(pair.dark, DARK_CARD).toFixed(2)}`);
    }
    // 反证：党徽金对白卡不足 3:1，故不得再当焦点色。
    assert.ok(_contrast(GOLD, LIGHT_CARD) < 3, '反证失败：党徽金对白卡本就不足 3:1');
  });
  
  test('F5 非空转：对比度函数与规则抽取有正/负例', () => {
    assert.ok(_contrast('#000000', '#FFFFFF') > 20, '对比度函数失效（黑白应约 21:1）');
    assert.ok(_contrast('#FFFFFF', '#FFFFFF') === 1, '同色对比度应为 1');
    assert.equal(_ruleBody('a { color: red; }', '.not-exist:focus'), '', '不存在的选择器应返回空');
  });
  
  test('F6 顶栏三按钮：深红底改用既有白色令牌（2px / offset 1px / 无 box-shadow），白环对 #7A0010 ≥3:1', () => {
    // 2026-10-28：顶栏底恒为深红 #7A0010，七种主题色在其上只有 1.51–2.99:1 ⇒ 改白色令牌。
    const body = _ruleBody(STYLES, '#app-header .hamburger-btn:focus-visible');
    assert.ok(body, '缺少顶栏作用域焦点环规则（#app-header .hamburger-btn:focus-visible）');
    assert.match(body, /outline:\s*2px solid var\(--app-accent-strong-ink-light\)\s*;/,
      '顶栏焦点环应使用仓库既有白色令牌 --app-accent-strong-ink-light（不得写死 hex）');
    assert.match(body, /outline-offset:\s*1px\s*;/, '顶栏焦点环偏移应为 1px（几何与全站一致，只换颜色）');
    assert.match(body, /box-shadow:\s*none\s*;/, '顶栏焦点环不得再带金光晕');
    assert.doesNotMatch(body, /--party-gold/, '顶栏焦点环不得再用党徽金');
    assert.doesNotMatch(body, /outline:\s*2px solid var\(--app-accent\)\s*;/,
      '顶栏焦点环不得再用主题色（对深红底 1.51–2.99:1，低于 3:1）');
    assert.match(STYLES, /#app-header \.header-action-btn:focus-visible/, '顶栏动作按钮须纳入同一焦点环');
    assert.match(STYLES, /#app-header #notif-btn:focus-visible/, '顶栏通知按钮须纳入同一焦点环');
  
    // 白色令牌必须两态都接近纯白：:root 定义 #FFFFFF，且暗色段不得重定义该 -light 原始变量。
    const inkLight = /--app-accent-strong-ink-light:\s*(#[0-9A-Fa-f]{6})\s*;/.exec(STYLES)?.[1];
    assert.ok(inkLight, 'styles.css 缺少 --app-accent-strong-ink-light（无法核算顶栏环颜色）');
    assert.ok(_contrast(inkLight, '#FFFFFF') <= 1.05,
      `--app-accent-strong-ink-light 计算值 ${inkLight} 不是近纯白（对白 ${_contrast(inkLight, '#FFFFFF').toFixed(2)}:1）`);
    const darkBlock = STYLES.match(/html\.theme-dark\s*\{([\s\S]*?)\n\s*\}/)?.[1] || '';
    assert.doesNotMatch(darkBlock, /--app-accent-strong-ink-light\s*:/,
      '暗色段不得重定义 --app-accent-strong-ink-light（否则暗色顶栏环不再白）');
  
    const vsHeader = _contrast(inkLight, HEADER_RED);
    console.log(`[ui-focus-ring] F6 顶栏白环 ${inkLight} vs 深红 ${HEADER_RED} ${vsHeader.toFixed(2)}:1`);
    assert.ok(vsHeader >= 3, `顶栏白环对 #7A0010 仅 ${vsHeader.toFixed(2)}:1（要求 ≥3）`);
    // 记录读数：旧口径（主题色）确实低于 3:1，是本次换色的依据。
    for (const [key, pair] of Object.entries(THEME_ACCENTS)) {
      console.log(`[ui-focus-ring] F6 ${key} 主题色焦点环 vs 顶栏深红 ${_contrast(pair.light, HEADER_RED).toFixed(2)}:1（已弃用）`);
    }
  });

})();

// ═══ 源件 10：ui-picker-focus.test.mjs ═══
await (async () => {
  // server/test/ui-picker-focus.test.mjs — 选人面板可达性守卫（2026-10-19 立 · Task 5）
  //
  // 来源：Spec「移动端与主动作硬化」/ Requirement「选人面板可达」。
  // 判据（静态源码）：
  //   F1 Tab / Shift+Tab 焦点陷阱：焦点在面板内循环，不落到遮罩后的页面；
  //   F2 打开时锁 body 滚动，关闭恢复原值；
  //   F3 Esc 关闭并回焦打开前的焦点（触发按钮）；
  //   F4 resize / orientationchange 重定位；390px 宽度与 left 均收敛在视口内；
  //   F5 CSS 不得再用 transition: all（属性变化不可控）。
  //
  // 单一源：docs/src/components/governance/person-picker.js、docs/src/components/person-picker.css。
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const JS = join(ROOT, 'docs', 'src', 'components', 'governance', 'person-picker.js');
  const CSS = join(ROOT, 'docs', 'src', 'components', 'person-picker.css');
  
  const jsSrc = readFileSync(JS, 'utf8');
  const cssSrc = readFileSync(CSS, 'utf8');
  
  test('F1 焦点陷阱：Tab / Shift+Tab 在面板内循环', () => {
    assert.match(jsSrc, /e\.key\s*!==\s*'Tab'/, '缺少 Tab 键分支 ⇒ 焦点会落回遮罩后的页面');
    assert.match(jsSrc, /e\.shiftKey/, '缺少 Shift+Tab（反向循环）分支');
    assert.match(jsSrc, /preventDefault\s*\(\s*\)/, '循环到端点时须 preventDefault，阻止浏览器把焦点移出面板');
    assert.match(jsSrc, /_getFocusableElements\s*\(/, '缺少面板内可聚焦元素收集');
    assert.match(jsSrc, /\.contains\s*\(\s*active\s*\)/, '缺少「焦点是否仍在面板内」判断');
    assert.match(jsSrc, /\.focus\s*\(\s*\)/, '循环端点须把焦点移回面板内的首/末元素');
  });
  
  test('F2 打开锁 body 滚动，关闭恢复原值', () => {
    assert.match(jsSrc, /document\.body\.style\.overflow\s*=\s*'hidden'/, '打开面板时须锁 body 滚动');
    assert.match(jsSrc, /_prevBodyOverflow/, '须记录打开前的 overflow 原值');
    assert.match(jsSrc, /document\.body\.style\.overflow\s*=\s*this\._prevBodyOverflow/,
      '关闭面板时须恢复打开前的 overflow，而不是硬写某个值');
  });
  
  test('F3 Esc 关闭并回焦打开前的焦点', () => {
    assert.match(jsSrc, /e\.key\s*===\s*'Escape'/, '缺少 Esc 关闭分支');
    assert.match(jsSrc, /_lastFocused\s*=\s*document\.activeElement/, '打开面板时须记录当前焦点');
    assert.match(jsSrc, /focusTarget\?\.focus\s*\(/, '关闭后须回焦（优先打开前的焦点，兜底触发按钮）');
  });
  
  test('F4 resize / orientationchange 重定位，390px 不出屏', () => {
    assert.match(jsSrc, /addEventListener\('resize'/, '缺少 resize 重定位监听');
    assert.match(jsSrc, /addEventListener\('orientationchange'/, '缺少 orientationchange 重定位监听');
    assert.match(jsSrc, /_positionPanel\s*\(\s*this\._panelEl\s*\)/, '视口变化后须以面板实例重新定位');
    assert.match(jsSrc, /Math\.min\(380,\s*viewportW\s*-\s*16\)/, '面板宽度须收敛在视口内（390px 下不溢出）');
    assert.match(jsSrc, /Math\.max\(8,\s*Math\.min\(rect\.left,/, 'left 须夹在 [8, 视口宽 - 面板宽 - 8] 内');
  });
  
  test('F5 CSS 不使用 transition: all', () => {
    assert.ok(!/transition\s*:\s*all\b/.test(cssSrc),
      'person-picker.css 仍含 transition: all ⇒ 收成具体属性（background-color / border-color / color / box-shadow 等）');
  });

})();

// ═══ 源件 11：modal-guard.test.mjs ═══
await (async () => {
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
    const USER_EXPR = /^(?:title|f\.label|f\.placeholder|f\.key|o\.label|o\.value|val|submitLabel)$/;
  
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
  
    test('M2 openModal：title 以纯文本写入，不解释 HTML', () => {
      const src = exportSource('openModal');
      // 2026-10-20 R3-01：标题改走 textContent（调用方误传 HTML 也只显示原文），不再拼进 innerHTML
      assert.match(src, /titleEl\.textContent\s*=/, 'openModal 标题应以 textContent 写入');
      assert.doesNotMatch(src, /\$\{safeTitle\}/, '标题不得再以 HTML 插值方式渲染');
      assert.deepEqual(unescapedUserInterpolations(src), [],
        `openModal 存在未转义的用户数据插值：${unescapedUserInterpolations(src).join(', ')}`);
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
  
    test('G8 R3-25 · B-500-2：浮窗不再渲染「制度参数 →」深链（能力与六处调用一并移除）', () => {
      // 原 6 个调用点（R3-25 清单同源）：设置深链与浮窗体例（DESIGN_SYSTEM §4.27：页脚只放取消 / 提交）
      // 冲突，2026-10-28 批次 518 整套移除 ⇒ 本条改为**移除守卫**：能力不得回潮，调用方不得再传。
      const callers = [
        'entries/tabs/leader/write-tab.js',
        'entries/tabs/disc/review-tab.js',
        'entries/tabs/org/member-flow-tab.js',
        'entries/tabs/visitor/attendance-tab.js',
        'entries/tabs/prop/archive-tab.js',
        'entries/tabs/secretary/calendar-tab.js',
      ];
      for (const file of callers) {
        assert.doesNotMatch(read(file), /settingsLink/, `${file} 不得再向浮窗传「设置」深链`);
      }
      // 组件层：选项、短文案归一与渲染函数都不得回潮。
      assert.doesNotMatch(MODAL, /settingsLink/, 'modal.js 不得再保留「设置」深链选项');
      assert.doesNotMatch(MODAL, /modal-settings-link/, 'modal.js 不得再渲染页脚深链标记');
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
  
  // ═══ 源件 4：危险动作确认面（SD-53 · 2026-10-28 美学专项 Task 7）═══
  await (async () => {
    const { test } = await import('node:test');
    const assert = (await import('node:assert/strict')).default;
    const { readFileSync, readdirSync, statSync } = await import('node:fs');
    const { join, relative, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
  
    // role: [工程师]+[AI]
    // 危险动作确认面守卫（2026-10-28 美学专项 Task 7 · SD-53）
    //
    // 判据原文（DESIGN_SYSTEM §4.27.1）：危险动作必须离开正文流、进入确认面；确认面须含
    //   「做什么 / 影响范围 / 可否恢复」三段；统一入口 `modal.js::confirmDanger`。
    //
    // 判红 / 判据：
    //   D1 原生对话框清零：`docs/src/**` 里 `window.confirm(` 与裸 `confirm(` 计数为 0
    //      （`.confirm(id)` 业务方法名与方法定义 `confirm(id) {` 不属对话框，不在其列）。
    //   D2 三段式入口存在：`modal.js` 导出 `confirmDanger`，且其声明文本（JSDoc ＋ 函数体）
    //      同时含「影响」「恢复」两个词。
    // 非空转：D1 带反例（`confirm('x')` 必须被判命中）与负例（`.confirm(id)` / `confirm(id) {` 不命中）；
    //   D2 带反例（删掉「恢复」的构造文本必须判不合格）；D1 另设扫描文件数下限，防扫描面被改坏后恒真。
    // 运行：node --test server/test/modal-guard.test.mjs
  
    const HERE = dirname(fileURLToPath(import.meta.url));
    const ROOT = join(HERE, '..', '..');
    const SRC = join(ROOT, 'docs', 'src');
    const MODAL = readFileSync(join(SRC, 'components/ui/modal.js'), 'utf8');
  
    /** 扫描文件数下限（实测 docs/src 下 .js 远多于 100；低于此值说明扫描面被改坏） */
    const FILE_FLOOR = 100;
  
    /** 剥注释（行注释 / 块注释）——注释里写 `confirm(` 不算调用 */
    function stripComments(src) {
      let s = String(src).replace(/\r\n?/g, '\n');
      s = s.replace(/\/\*[\s\S]*?\*\//g, ' ');
      return s.split('\n').map((line) => line.replace(/\/\/.*$/, '')).join('\n');
    }
  
    /** 方法定义 `confirm(id) {`（业务方法名，不是浏览器对话框） */
    const METHOD_DEF_RE = /^\s*(?:async\s+)?confirm\s*\([^)]*\)\s*\{/;
  
    /** 源码里的原生 confirm 调用（返回 `行号: 该行`；`.confirm(` 方法名 / 方法定义不判） */
    function nativeConfirms(raw) {
      const src = stripComments(raw);
      const out = [];
      for (const m of src.matchAll(/confirm\s*\(/g)) {
        const before = src.slice(Math.max(0, m.index - 8), m.index);
        const lineStart = src.lastIndexOf('\n', m.index) + 1;
        const lineEnd = src.indexOf('\n', m.index);
        const line = src.slice(lineStart, lineEnd === -1 ? src.length : lineEnd).trim();
        if (/window\.$/.test(before)) { out.push(line); continue; }   // window.confirm(
        if (/\.$/.test(before)) continue;                              // x.confirm(...) / 方法名
        if (METHOD_DEF_RE.test(line)) continue;                        // confirm(id) { ... }
        out.push(line);
      }
      return out;
    }
  
    /** `confirmDanger` 的声明文本（JSDoc ＋ 函数体） */
    function dangerEntryText(src) {
      const idx = src.indexOf('export function confirmDanger');
      if (idx === -1) return '';
      const docStart = src.lastIndexOf('/**', idx);
      const next = src.indexOf('\nexport ', idx + 1);
      return src.slice(docStart === -1 ? idx : docStart, next === -1 ? src.length : next);
    }
  
    /** 三段式入口判据：导出 ＋ 影响 ＋ 恢复 */
    const dangerEntryOk = (src) => {
      const text = dangerEntryText(src);
      return !!text && text.includes('影响') && text.includes('恢复');
    };
  
    function walkJs(dir, out = []) {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walkJs(p, out);
        else if (name.endsWith('.js')) out.push(p);
      }
      return out;
    }
  
    test('D1 原生 confirm 清零：docs/src 不得再出现 window.confirm( / 裸 confirm(', () => {
      // 反例：原生调用必须被判命中
      assert.deepEqual(nativeConfirms("if (!ok) { const r = confirm('x'); }"), ["if (!ok) { const r = confirm('x'); }"],
        '反例未命中：`confirm(\'x\')` 必须被判为原生对话框（匹配器坏了）');
      assert.deepEqual(nativeConfirms("const r = window.confirm('删除？');"), ["const r = window.confirm('删除？');"],
        '反例未命中：`window.confirm(` 必须被判为原生对话框');
      // 负例：业务方法名与方法定义不判
      assert.deepEqual(nativeConfirms('await getAdapter().memberChangeRequests.confirm(id);'), [],
        '负例误伤：`.confirm(id)` 是业务方法名，不是浏览器对话框');
      assert.deepEqual(nativeConfirms('confirm(id) {\n  return true;\n}'), [],
        '负例误伤：`confirm(id) {` 是业务方法定义，不是浏览器对话框');
      // 负例：注释里的写法不判
      assert.deepEqual(nativeConfirms('// 已不再使用 confirm( 原生对话框'), [],
        '负例误伤：注释里的写法不判');
  
      const files = walkJs(SRC);
      assert.ok(files.length >= FILE_FLOOR, `只扫到 ${files.length} 个 .js（下限 ${FILE_FLOOR}）：扫描面被改坏`);
      const offenders = files.flatMap((f) => nativeConfirms(readFileSync(f, 'utf8'))
        .map((line) => `${relative(ROOT, f).replace(/\\/g, '/')} → ${line}`));
      assert.deepEqual(offenders, [],
        `docs/src 仍有原生 confirm（SD-53：危险动作必须进确认面，改走 modal.js::confirmDanger）：\n  ${offenders.join('\n  ')}`);
    });
  
    test('D2 三段式入口：modal.js 导出 confirmDanger，声明文本含「影响」「恢复」', () => {
      // 反例：删掉「恢复」的构造文本必须判不合格
      const planted = [
        '/** 危险动作确认面：① 做什么 ② 影响范围（哪些行 / 人 / 记录会变） */',
        'export function confirmDanger({ id, title, bodyHtml }) {',
        '  return _mustPressConfirm({ id: `danger-${id}`, title, bodyHtml, danger: true });',
        '}',
      ].join('\n');
      assert.equal(dangerEntryOk(planted), false, '反例未判红：缺「恢复」的确认面不得算三段式入口');
      assert.equal(dangerEntryOk('/** 影响 恢复 */ export function confirmDanger() {}'), true,
        '正例未通过：含「影响」「恢复」的声明应判合格（判据本身写坏了）');
  
      assert.match(MODAL, /export function confirmDanger\(/, 'modal.js 必须导出 confirmDanger（危险动作唯一入口）');
      const text = dangerEntryText(MODAL);
      assert.ok(text.includes('影响'), 'confirmDanger 的声明文本缺「影响范围」（三段式第 2 段）');
      assert.ok(text.includes('恢复'), 'confirmDanger 的声明文本缺「可否恢复」（三段式第 3 段）');
      assert.ok(dangerEntryOk(MODAL), 'confirmDanger 未满足三段式入口判据');
    });
  
  })();
  
  // ═══ 源件 5：表单字段类型透传（2026-10-28 前端设计审查 P1）═══
  await (async () => {
    const { test } = await import('node:test');
    const assert = (await import('node:assert/strict')).default;
    const { readFileSync } = await import('node:fs');
    const { join, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
  
    // role: [工程师]+[AI]
    // 判据：openFormModal 的字段类型必须「已知类型原样透传、未知类型开发期报错 / 生产期回退 text」。
    // 病灶（2026-10-28 审查 P1）：原判据 `if (!t || known.includes(t)) return 'text'` 把 email / tel /
    //   url / number / date / time 一并渲染成文本框 ⇒ 移动端不弹对应键盘、日期也不出选择器。
    // 为什么执行源码而非只做文本断言：判据是「生成的 type 值」，静态匹配只能证明写了 includes，
    //   证明不了返回值；故抽出 `inputType` 在沙箱里按生产 / 开发两种环境各跑一遍，并带反例。
  
    const HERE = dirname(fileURLToPath(import.meta.url));
    const ROOT = join(HERE, '..', '..');
    const MODAL = readFileSync(join(ROOT, 'docs/src/components/ui/modal.js'), 'utf8');
  
    const KNOWN = ['text', 'number', 'date', 'time', 'email', 'tel', 'url', 'password'];
  
    /** 抽出 `const inputType = (t) => { … };`，注入 `_isDevEnv` / `console` / `id` 三项外部依赖 */
    function buildInputType(src, { dev }) {
      const start = src.indexOf('const inputType = (t) => {');
      assert.notEqual(start, -1, 'modal.js 中找不到 inputType 判据');
      const end = src.indexOf('\n  };', start);
      assert.notEqual(end, -1, 'inputType 判据的收尾（\\n  };）缺失');
      const body = src.slice(start, end + 5);
      const stub = { error() {}, warn() {} };
      return new Function('_isDevEnv', 'console', 'id', `${body}; return inputType;`)(() => dev, stub, 'guard');
    }
  
    /** 「8 个已知类型全部原样透传」的唯一判据（正 / 反例共用，防判据本身写坏） */
    const allKnownPassThrough = (fn) => KNOWN.every((t) => fn(t) === t);
  
    test('T1 字段类型：8 个已知类型原样透传，未知类型生产期回退 text（含反例）', () => {
      // 反例：旧实现（已知类型一律 return text）必须被判不合格
      const OLD = [
        'function wrapper() {',
        '  const inputType = (t) => {',
        "    const known = ['text', 'number', 'date', 'time', 'email', 'tel', 'url', 'password'];",
        "    if (!t || known.includes(t)) return 'text';",
        "    return 'text';",
        '  };',
        '}',
      ].join('\n');
      assert.equal(allKnownPassThrough(buildInputType(OLD, { dev: false })), false,
        '反例未判红：已知类型一律返回 text 的旧实现必须被判不合格');
  
      const prod = buildInputType(MODAL, { dev: false });
      for (const t of KNOWN) assert.equal(prod(t), t, `生产期 type="${t}" 必须原样透传（不得回退 text）`);
      assert.equal(prod(''), 'text', '未给类型时应回退 text');
      assert.equal(prod(undefined), 'text', '未给类型时应回退 text');
      assert.equal(prod('nonsense'), 'text', '未知类型生产期应回退 text（不得抛错）');
  
      const dev = buildInputType(MODAL, { dev: true });
      assert.throws(() => dev('nonsense'), /未知字段类型/, '未知类型开发期应直接报错（不静默降级）');
  
      // 渲染侧：type 属性由 inputType(f.type) 生成（否则判据再好也到不了 DOM）
      assert.match(MODAL, /type="\$\{escHtml\(inputType\(f\.type\)\)\}"/,
        'openFormModal 的 <input> 应把 inputType(f.type) 写进 type 属性');
    });
  
  })();
  
  // ═══ 源件 6：确认类浮窗 Esc 取消 ＋ 焦点回归 ＋ 表单错误成对产出（2026-10-31 · P9）═══
  await (async () => {
    const { test } = await import('node:test');
    const assert = (await import('node:assert/strict')).default;
    const { readFileSync } = await import('node:fs');
    const { join, dirname } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
  
    // 判据（P9）：
    //   E1 确认类浮窗（confirmDanger / confirmNudge 共用的 _mustPressConfirm）必须 Esc 可取消：
    //      `escCancel: true` ＋ `onCancel: () => finish(false)`（Esc = 取消，不执行原动作）。
    //   E2 关闭后焦点回到触发元素：openModal 记录 opener，closeModal 走 _releaseInert 还焦点；
    //      同时焦点陷阱（Tab 困在面板内）必须仍在（已实现即核验）。
    //   E3 表单错误渲染必须**同时**产出 aria-invalid 与 aria-describedby（登录页 / 设置向导 / 表单浮窗）。
    // 非空转：E1 / E3 各带反例（缺字段的构造文本必须判不合格）。
  
    const HERE = dirname(fileURLToPath(import.meta.url));
    const ROOT = join(HERE, '..', '..');
    const SRC = join(ROOT, 'docs', 'src');
    const MODAL = readFileSync(join(SRC, 'components/ui/modal.js'), 'utf8');
    const LOGIN = readFileSync(join(SRC, 'entries/pages/login-entry.js'), 'utf8');
    const WIZARD = readFileSync(join(SRC, 'components/governance/org-setup-wizard.js'), 'utf8');
  
    /** 截取函数源码（到下一个顶层 export 为止） */
    function fnSource(src, name) {
      const start = src.search(new RegExp(`(?:export\\s+)?(?:async\\s+)?function\\s+${name}\\s*\\(`));
      assert.notEqual(start, -1, `找不到函数 ${name}`);
      const next = src.indexOf('\nexport ', start + 1);
      return src.slice(start, next === -1 ? src.length : next);
    }
  
    /** 确认类浮窗是否具备 Esc 取消（正 / 反例共用；缺任一即判不合格） */
    const confirmEscReady = (src) => /escCancel:\s*true/.test(src)
      && /onCancel:\s*\(\)\s*=>\s*finish\(false\)/.test(src);
  
    /** 错误渲染是否同时产出两个属性（正 / 反例共用） */
    const hasAriaErrorPair = (src) => /aria-invalid/.test(src) && /aria-describedby/.test(src);
  
    test('E1 确认类浮窗 Esc 可取消：escCancel 开启且 Esc = finish(false)（含反例）', () => {
      // 反例：只有 dismissable:false 的旧实现必须判不合格
      const old = [
        'const panel = openModal({ id, dismissable: false, bodyHtml,',
        "  footerHtml: `${cancelBtnHtml}${confirmBtnHtml}`,",
        '  onMount: (p) => {} });',
      ].join('\n');
      assert.equal(confirmEscReady(old), false, '反例未判红：缺 escCancel / 取消回落的旧实现必须不合格');
      assert.equal(confirmEscReady('openModal({ escCancel: true, onCancel: () => finish(false) })'), true,
        '正例未通过：escCancel + finish(false) 应判合格（判据本身写坏了）');
  
      const confirm = fnSource(MODAL, '_mustPressConfirm');
      assert.match(confirm, /dismissable:\s*false/, '确认类浮窗不得点遮罩关闭');
      assert.ok(confirmEscReady(confirm), '_mustPressConfirm 必须开启 escCancel 并把 Esc 落成 finish(false)');
  
      // openModal 侧：escCancel 选项、Esc 挂载条件、blocking 自身可取消
      assert.match(MODAL, /escCancel\s*=\s*dismissable/, 'openModal 应提供 escCancel（缺省跟随 dismissable）');
      assert.match(MODAL, /if\s*\(dismissable\s*\|\|\s*escCancel\)\s*\{/, 'Esc 监听应在 dismissable 或 escCancel 时挂载');
      assert.match(MODAL, /_blockingModalIds\.size\s*>\s*0\s*&&\s*!_blockingModalIds\.has\(id\)/,
        'blocking 浮窗自身必须仍可被 Esc 取消，只有底下浮窗让位');
    });
  
    test('E2 关闭后焦点回到触发元素；Tab 焦点仍困在浮窗内', () => {
      // 打开时记录 opener
      assert.match(MODAL, /const opener\s*=\s*document\.activeElement/, 'openModal 应记录打开前的 activeElement');
      assert.match(MODAL, /_openers\.set\(id,\s*opener\)/, 'opener 应按浮窗 id 登记');
      // 关闭时还焦点
      const release = fnSource(MODAL, '_releaseInert');
      assert.match(release, /opener\.focus\(\)/, '关闭时应把焦点还给打开它的元素');
      assert.match(MODAL, /_releaseInert\(id\);/, 'closeModal 必须调用 _releaseInert（全关闭路径统一）');
      // 焦点陷阱仍在
      const trap = fnSource(MODAL, '_applyFocusTrap');
      assert.match(trap, /e\.key\s*!==\s*'Tab'/, '应处理 Tab');
      assert.match(trap, /first\.focus\(\)/, 'Tab 到末尾应回到首个可聚焦元素');
      assert.match(trap, /last\.focus\(\)/, 'Shift+Tab 到首个应回到末个可聚焦元素');
    });
  
    test('E3 表单错误必须同时产出 aria-invalid 与 aria-describedby（含反例）', () => {
      // 反例：只有 aria-invalid 的旧实现必须判不合格
      assert.equal(hasAriaErrorPair('el.setAttribute("aria-invalid", "true");'), false,
        '反例未判红：只有 aria-invalid、没有 aria-describedby 的渲染必须不合格');
      assert.equal(hasAriaErrorPair('el.setAttribute("aria-invalid", "true"); el.setAttribute("aria-describedby", id);'), true,
        '正例未通过：两个属性齐备应判合格（判据本身写坏了）');
  
      // 表单浮窗：showErrors 同时写两个属性
      const showErrors = fnSource(MODAL, 'openFormModal');
      assert.match(showErrors, /control\.setAttribute\('aria-invalid',\s*'true'\)/, 'openFormModal 字段错误应标 aria-invalid');
      assert.match(showErrors, /control\.setAttribute\('aria-describedby',\s*errEl\.id\)/, 'openFormModal 字段错误应指向错误文本');
  
      // 登录页：_showError 同时写两个属性
      assert.match(LOGIN, /const _showError\s*=/, '登录页应有统一的错误呈现入口 _showError');
      const loginShow = LOGIN.slice(LOGIN.indexOf('const _showError'));
      assert.ok(loginShow.includes("setAttribute('aria-invalid', 'true')"), '登录页错误应标 aria-invalid');
      assert.ok(loginShow.includes("setAttribute('aria-describedby', _errId)"), '登录页错误应指向 #login-error');
      // 三条错误路径（空字段 / 本地口令错误 / 服务端失败）都走 _showError
      assert.ok((LOGIN.match(/_showError\(/g) || []).length >= 3, '登录页空字段 / 口令错误 / 服务端失败三条路径都应走 _showError');
  
      // 设置向导：_showWizError 同时写两个属性，且页眉 / 源支部 / 首任支书三处调用
      assert.match(WIZARD, /function _showWizError\(/, '设置向导应有字段级错误入口 _showWizError');
      const wizShow = WIZARD.slice(WIZARD.indexOf('function _showWizError'), WIZARD.indexOf('function _clearWizError'));
      assert.ok(wizShow.includes("setAttribute('aria-invalid', 'true')"), '设置向导字段错误应标 aria-invalid');
      assert.ok(wizShow.includes("setAttribute('aria-describedby', errEl.id)"), '设置向导字段错误应指向就地错误文本');
      assert.ok((WIZARD.match(/_showWizError\(/g) || []).length >= 3, '页眉显示名 / 源支部 / 首任支书三处错误都应就地渲染');
      // 就地错误节点必须带 id（aria-describedby 才有落点）
      for (const id of ['wz-org-header-err', 'wz-create-source-err', 'wz-create-appoint-secretary-err']) {
        assert.match(WIZARD, new RegExp(`id="${id}"`), `缺少就地错误节点 #${id}`);
      }
    });
  
  })();

})();

// ═══ 源件 12：nested-interaction-guard.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // nested-interaction-guard.test.mjs — 嵌套交互守卫（2026-10-31 P0 · 支书补充批次）
  //
  // 病灶：`role="button"` 整行容器里再嵌独立 `<button>` / `<a>`（通知行 5×2＝10 处、
  //   待办行 4 处），点击「删除」容易连带触发整行「查看详情」，键盘焦点也容易被外层抢走。
  //
  // 判据：
  //   N1 扫描 docs/src 下 `.js` / `.html`：可点容器（role="button"）子树内出现独立
  //      `<button>` / `<a>` 即判红；唯一放行方式是容器带 `data-nested-actions="true"`，
  //      且该文件已登记进白名单（附运行时命中数，合计 14）。
  //   N2 白名单标记不得出现在未登记文件；登记项必须真实带标记（双向一致，防僵尸 / 防逃逸）。
  //   N3 非空转：未标记的嵌套样本判红、标记但未登记的样本判红、纯文本行判绿。
  //
  // 运行：node --test server/test/nested-interaction-guard.test.mjs
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync, readdirSync } = await import('node:fs');
  const { join, relative, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const SRC = join(ROOT, 'docs', 'src');
  
  /** 已评审的嵌套交互白名单（文件 → 运行时命中数 + 理由）。
   *  通知：首页/支书台通知列表每屏 5 行 × 「删除 / 编辑」2 枚 = 10；
   *  待办：待办行尾「主行动 / 更多」= 4 处（四档紧迫度行）。合计 14。 */
  const NESTED_WHITELIST = new Map([
    // ── 本批 14 处缺陷行（支书点名：通知 10 + 待办 4）──
    ['docs/src/entries/tabs/secretary/notification-tab.js', {
      runtimeHits: 10,
      defectSet: true,
      reason: '通知行整卡可点 + 行内删除/编辑；两层均 stopPropagation，键盘各自可达',
    }],
    ['docs/src/components/ui/list-row.js', {
      runtimeHits: 4,
      defectSet: true,
      reason: 'master 主从行整行选中 + 行尾主行动/更多；trailing 含控件时输出 data-nested-actions',
    }],
    // ── 存量同类（已有独立 stopPropagation / 内层优先判定，本批只登记不重写）──
    ['docs/src/components/shell/header.js', {
      runtimeHits: 1,
      defectSet: false,
      reason: '顶栏通知浮层行 + 「已读」按钮；已读按钮 stopPropagation，行 keydown 跳过内层控件',
    }],
    // 2026-11-04 批次 534（Task 3.1）：考勤队列行已去掉 `role="button"` 外壳，整行只作鼠标
    //   点按热区，键盘落点＝行内原生复选框 / 链接 ⇒ 不再属于嵌套交互，白名单登记随之撤除。
    ['docs/src/entries/tabs/leader/write-tab.js', {
      runtimeHits: 1,
      defectSet: false,
      reason: '组长活动行 + 「发布本组通知」按钮；按钮 stopPropagation，行 keydown 跳过按钮',
    }],
    ['docs/src/entries/tabs/visitor/projects-tab.js', {
      runtimeHits: 1,
      defectSet: false,
      reason: '成员任务卡 + 「勾掉」按钮；按钮 stopPropagation，卡 keydown 要求 e.target === card',
    }],
    // 2026-11-11 批次 546（D-868）：专班卡整卡可点 +「补选承办方」按钮；
    //   按钮 stopPropagation，卡只在 e.target 命中卡本身时打开详情。
    ['docs/src/entries/tabs/org/taskforce-tab.js', {
      runtimeHits: 1,
      defectSet: false,
      reason: '专班卡整卡可点 + 「补选承办方」按钮；按钮 stopPropagation，卡 keydown 跳过内层控件',
    }],
    // 2026-11-04 批次 533（R5A-22）：反馈行整卡可点 + 提交人信息展示按钮（原 span 提示改为可聚焦 button）；
    //   行点击对 `[data-tip]` 提前返回，不连带打开详情。
    ['docs/src/entries/tabs/secretary/feedback-tab.js', {
      runtimeHits: 1,
      defectSet: false,
      reason: '反馈行整卡可点 + 提交人 tip 按钮；行点击见到 [data-tip] 即返回，按钮键盘可达',
    }],
    // 2026-11-15 Task 4.2：人才库成员卡整卡可点（跳名册并高亮）+ 卡内姓名链接（档案页）；
    //   卡点击见到 <a> 即返回，卡 keydown 跳过内层链接 / 控件，两层键盘各自可达。
    ['docs/src/entries/tabs/org/talent-tab.js', {
      runtimeHits: 1,
      defectSet: false,
      reason: '成员卡整卡可点 + 卡内姓名链接；点击与键盘均优先内层 <a>，不抢跳',
    }],
  ]);
  
  const EXPECTED_DEFECT_HITS = 14;
  const MARKER = 'data-nested-actions="true"';
  const WRAPPER_TAGS = new Set(['div', 'span', 'tr', 'li', 'section', 'article']);
  
  function walk(dir, out = []) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) { walk(p, out); continue; }
      if (/\.(js|mjs|html)$/.test(e.name)) out.push(p);
    }
    return out;
  }
  
  /** 取 role="button" 容器的子树文本（按同名标签计深度；找不到闭合则截到上限） */
  function subtreeOf(src, start, tag) {
    const tagRe = new RegExp(`<(/?)${tag}\\b[^>]*?(/?)>`, 'gi');
    tagRe.lastIndex = start;
    let depth = 0;
    let m;
    while ((m = tagRe.exec(src))) {
      const closing = m[1] === '/';
      const selfClosing = m[2] === '/';
      if (!closing && !selfClosing) depth += 1;
      if (closing) {
        depth -= 1;
        if (depth === 0) return src.slice(start, tagRe.lastIndex);
      }
      if (tagRe.lastIndex > start + 8000) break;
    }
    return src.slice(start, start + 8000);
  }
  
  /** 返回 |{nested:true, marked:boolean, tag, index} 的疑似容器（跳过纯注释行） */
  function findNestedContainers(src) {
    const out = [];
    const re = /<(div|span|tr|li|section|article)\b[^>]*\brole=["']button["'][^>]*>/gi;
    let m;
    while ((m = re.exec(src))) {
      const tag = m[1].toLowerCase();
      if (!WRAPPER_TAGS.has(tag)) continue;
      const lineStart = src.lastIndexOf('\n', m.index) + 1;
      const lineHead = src.slice(lineStart, m.index).trim();
      if (lineHead.startsWith('//') || lineHead.startsWith('*')) continue;
      const openTag = m[0];
      const inner = subtreeOf(src, m.index, tag);
      const nested = /<(?:button|a)\b/i.test(inner);
      out.push({ tag, index: m.index, nested, marked: openTag.includes(MARKER), openTag });
    }
    return out;
  }
  
  test('N1 可点容器子树内出现独立 button/a：未标记或未登记即判红', () => {
    const offenders = [];
    for (const file of walk(SRC)) {
      const src = readFileSync(file, 'utf8');
      const relPath = relative(ROOT, file).replace(/\\/g, '/');
      for (const hit of findNestedContainers(src)) {
        if (!hit.nested) continue;
        const line = src.slice(0, hit.index).split(/\r?\n/).length;
        if (!hit.marked) {
          offenders.push(`${relPath}:${line} role=button 内嵌 button/a 但缺 ${MARKER}`);
          continue;
        }
        if (!NESTED_WHITELIST.has(relPath)) {
          offenders.push(`${relPath}:${line} 已标记嵌套交互但未登记白名单`);
        }
      }
    }
    assert.deepEqual(offenders, [],
      `发现未评审的嵌套交互（点击内层按钮会连带触发整行）：\n${offenders.join('\n')}`);
  });
  
  test('N2 白名单双向一致：标记只出现在登记文件，登记文件必须真实带标记', () => {
    const files = walk(SRC);
    const markedFiles = new Set(
      files.filter((f) => readFileSync(f, 'utf8').includes(MARKER))
        .map((f) => relative(ROOT, f).replace(/\\/g, '/')),
    );
    assert.deepEqual([...markedFiles].sort(), [...NESTED_WHITELIST.keys()].sort(),
      'data-nested-actions 标记与白名单必须双向一致（多一个＝逃逸，少一个＝僵尸）');
  
    const defectHits = [...NESTED_WHITELIST.values()]
      .filter((v) => v.defectSet)
      .reduce((sum, v) => sum + v.runtimeHits, 0);
    assert.equal(defectHits, EXPECTED_DEFECT_HITS,
      `本批缺陷行运行时命中数合计须为 ${EXPECTED_DEFECT_HITS}（实测 ${defectHits}）`);
  });
  
  test('N3 非空转：未标记嵌套判红、标记未登记判红、纯文本行判绿', () => {
    const nested = '<div role="button" tabindex="0"><span>标题</span><button>删除</button></div>';
    const found = findNestedContainers(nested);
    assert.equal(found.length, 1);
    assert.equal(found[0].nested, true);
    assert.equal(found[0].marked, false);
  
    const marked = `<div role="button" tabindex="0" ${MARKER}><span>标题</span><a href="#">档案</a></div>`;
    assert.equal(findNestedContainers(marked)[0].marked, true);
  
    const plain = '<div role="button" tabindex="0"><span>只有文字</span></div>';
    assert.equal(findNestedContainers(plain)[0].nested, false);
  
    const comment = '// <div role="button"><button>x</button></div>';
    assert.equal(findNestedContainers(comment).length, 0, '注释行不得计入');
  });

})();

// ═══ 源件 13：touch-target-guard.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // ════════════════════════════════════════════════════════════════
  //  touch-target-guard.test.mjs — 390 触控命中区 / 表单错误态 / 确认弹窗 Esc 守卫（P9 · 2026-10-31）
  //
  //  为什么在 daily 层：本文件不 import playwright（`test-tier-guard::T3` 要求 daily 纯 node）。
  //  真机遍历由 `server/scripts/touch-target-audit.mjs`（Playwright）完成并写入
  //  `.ctx/evidence/2026-10-31/touch-forms.json`；本守卫对该读数做**棘轮 + 结构 + 反例**断言：
  //    T1 判定器非空转：40×40 假元素必须判红；44×44 不判红。
  //    T2 六类控件的命中区扩展规则必须存在于 styles.css（视觉尺寸不变：只写伪元素 width/height）。
  //    T3 证据读数：视觉尺寸改动前后一致；命中区达到各类最小值；不足 44 的必须有「相邻间距不足」说明。
  //    T4 相邻热区不重叠：证据里 maxOverlap.pairs === 0。
  //    T5 表单错误态：登录三态 + 设置向导三态都产出 aria-invalid + aria-describedby，错误贴字段。
  //    T6 确认弹窗：Esc 可关、焦点回触发元素、Tab 焦点困在面板内、resolve(false)。
  //    T7 <44×44 数量按棘轮基线只减不增，且六类控件不得回到 offender 名单。
  //  运行：cd server; node --test test/touch-target-guard.test.mjs
  // ════════════════════════════════════════════════════════════════
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync, existsSync } = await import('node:fs');
  const { join } = await import('node:path');
  const ROOT = join(import.meta.dirname, '..', '..');
  const STYLES = readFileSync(join(ROOT, 'docs', 'src', 'styles.css'), 'utf8');
  const EVIDENCE_FILE = join(ROOT, '.ctx', 'evidence', '2026-10-31', 'touch-forms.json');
  
  /** 全站 390 可点元素命中区 <44×44 的棘轮基线（只降不升；下调时同批改本常量并在注释写新读数）
   *  2026-10-31 P9 首版实测：见 evidence.offenderCount。 */
  const OFFENDER_BASELINE = 269;
  
  /** 六类控件的命中区下限（不足 44 的必须带 constraint 说明，且不得低于该下限） */
  const EXPECTED = {
    workbenchTab: { w: 44, h: 44 },
    // 空行日期格视觉 40 高 + 行距 2 ⇒ 相邻节距 42：按「不重叠」收窄到 42（有内容的 43.4 高格达 44）
    calendarDay: { w: 44, h: 42, constrained: true },
    calendarView: { w: 37, h: 44, constrained: true },
    todoMore: { w: 44, h: 44 },
    settingsAction: { w: 36, h: 42, constrained: true },
    helpToc: { w: 44, h: 44 },
  };
  
  /** 可达性判定：命中区是否达到 44×44（纯函数，供正 / 反例共用） */
  const isSmallHit = ({ hitW, hitH }) => !(hitW >= 44 && hitH >= 44);
  
  /** 取 CSS 规则体（首个匹配） */
  function ruleBody(css, selector) {
    const i = css.indexOf(selector);
    if (i === -1) return '';
    const open = css.indexOf('{', i);
    const close = css.indexOf('}', open);
    return open === -1 || close === -1 ? '' : css.slice(open + 1, close);
  }
  
  const EVIDENCE = existsSync(EVIDENCE_FILE) ? JSON.parse(readFileSync(EVIDENCE_FILE, 'utf8')) : null;
  
  test('T1 判定器非空转：40×40 假元素必须判红，44×44 不得误伤', () => {
    // 反例：40×40 的假元素放进统计必须判红
    assert.equal(isSmallHit({ hitW: 40, hitH: 40 }), true, '反例未判红：40×40 必须算命中区不足');
    assert.equal(isSmallHit({ hitW: 43.9, hitH: 100 }), true, '单边不足 44 也必须判红');
    // 负例：达标不得误伤
    assert.equal(isSmallHit({ hitW: 44, hitH: 44 }), false, '44×44 不应被判红');
    assert.equal(isSmallHit({ hitW: 58, hitH: 44 }), false, '单边超出不应被判红');
  });
  
  test('T2 六类控件的命中区扩展规则存在，且只写伪元素尺寸（不改视觉）', () => {
    const cases = [
      ['.tab-btn::after', 44, 44],
      ['.cal-view-btn::after', 37, 44],
      ['.myws-row .btn-action::after', 36, 42],
    ];
    for (const [selector, w, h] of cases) {
      const body = ruleBody(STYLES, selector);
      assert.ok(body, `styles.css 缺少命中区规则 ${selector}`);
      assert.match(body, new RegExp(`width:\\s*max\\(100%,\\s*${w}px\\)`), `${selector} 命中宽应为 ${w}px`);
      assert.match(body, new RegExp(`height:\\s*max\\(100%,\\s*${h}px\\)`), `${selector} 命中高应为 ${h}px`);
      assert.match(body, /transform:\s*translate\(-50%,\s*-50%\)/, `${selector} 应居中扩展`);
      assert.doesNotMatch(body, /(?:^|[;\s])(?:width|height):\s*\d+px\s*;/, `${selector} 不得把视觉尺寸写死`);
    }
    // 日期格：宽 44；高按「不重叠」收窄（min(max(100%,44px), 100% + 2px)）
    const day = ruleBody(STYLES, '.cal-cell-mobile[data-date]::after');
    assert.match(day, /width:\s*max\(100%,\s*44px\)/, '日期格命中宽应为 44px');
    assert.match(day, /height:\s*min\(max\(100%,\s*44px\),\s*calc\(100%\s*\+\s*4px\)\)/,
      '日期格命中高应为 min(max(100%,44px), 100%+4px)（按相邻行距收窄，不重叠）');
    assert.match(day, /transform:\s*translate\(-50%,\s*-50%\)/, '日期格命中区应居中扩展');
    // 帮助目录：只在 ≤640 横排形态扩高（桌面纵向列表会与相邻项重叠）
    const media = STYLES.slice(STYLES.indexOf('@media (max-width: 640px) {'));
    assert.match(media, /\.help-toc-item::after\s*\{[\s\S]*?height:\s*max\(100%,\s*44px\)/,
      '≤640 下帮助目录项应扩到 44 高');
    // 待办「更多」由既有规则提供 44×44（本次只核验，不新增第二套）
    const more = ruleBody(STYLES, '.list-row__trailing .btn-sm::after');
    assert.match(more, /width:\s*max\(100%,\s*44px\)/, '待办「更多」命中宽应 ≥44（既有规则）');
    assert.match(more, /height:\s*max\(100%,\s*44px\)/, '待办「更多」命中高应 ≥44（既有规则）');
  });
  
  test('T3 证据读数：视觉尺寸前后一致、命中区达标；不足 44 必须有相邻间距说明', () => {
    assert.ok(EVIDENCE, `缺少真机证据文件：${EVIDENCE_FILE}（先跑 server/scripts/touch-target-audit.mjs）`);
    assert.equal(EVIDENCE.viewport.width, 390, '证据必须是 390 宽视口');
    assert.equal(EVIDENCE.date, '2026-10-31', '证据日期应为 2026-10-31');
  
    for (const [key, expected] of Object.entries(EXPECTED)) {
      const c = EVIDENCE.controls[key];
      assert.ok(c, `证据缺少控件类别 ${key}`);
      assert.ok(c.visualBefore && c.visualAfter, `${key} 缺少改动前后视觉尺寸`);
      assert.ok(Math.abs(c.visualBefore.w - c.visualAfter.w) <= 0.5,
        `${key} 视觉宽度变化 ${c.visualBefore.w} → ${c.visualAfter.w}（要求不变）`);
      assert.ok(Math.abs(c.visualBefore.h - c.visualAfter.h) <= 0.5,
        `${key} 视觉高度变化 ${c.visualBefore.h} → ${c.visualAfter.h}（要求不变）`);
      assert.ok(c.hit && c.hit.w >= expected.w && c.hit.h >= expected.h,
        `${key} 命中区 ${c.hit?.w}×${c.hit?.h} 未达下限 ${expected.w}×${expected.h}`);
      if (expected.constrained) {
        assert.ok(c.constraint && String(c.constraint).trim().length >= 8,
          `${key} 命中区不足 44，必须在证据里写明相邻间距不足的原因`);
        assert.ok(Number.isFinite(c.adjacentGap), `${key} 必须记录实测相邻间距`);
      }
    }
  });
  
  test('T4 相邻热区不重叠：各类别 2D 交集对数为 0', () => {
    assert.ok(EVIDENCE, '缺少真机证据文件');
    for (const key of Object.keys(EXPECTED)) {
      const c = EVIDENCE.controls[key];
      assert.ok(c?.maxOverlap, `${key} 缺少相邻重叠读数`);
      assert.equal(c.maxOverlap.pairs, 0,
        `${key} 相邻热区重叠 ${c.maxOverlap.pairs} 对（最大 ${c.maxOverlap.w}×${c.maxOverlap.h}）`);
    }
  });
  
  test('T5 表单错误态：登录三态 + 设置向导三态均产出 aria-invalid 与 aria-describedby', () => {
    assert.ok(EVIDENCE, '缺少真机证据文件');
    const forms = EVIDENCE.forms || {};
    for (const key of ['loginEmpty', 'loginWrong', 'loginNetwork']) {
      const f = forms[key];
      assert.ok(f && f.visible && f.message, `${key} 应显示就地错误文本`);
      assert.equal(f.errorNearFields, true, `${key} 错误文本应贴在字段附近`);
      assert.equal(f.studentId?.invalid, 'true', `${key} 学号应标 aria-invalid`);
      assert.equal(f.studentId?.describedby, 'login-error', `${key} 学号应指向 #login-error`);
      assert.equal(f.password?.invalid, 'true', `${key} 密码应标 aria-invalid`);
      assert.equal(f.password?.describedby, 'login-error', `${key} 密码应指向 #login-error`);
    }
    // 提交失败不丢已填内容
    assert.equal(forms.loginWrong?.studentId?.value, '2300010001', '口令错误后学号应保留');
    assert.equal(forms.loginWrong?.password?.value, 'wrong-pass', '口令错误后密码输入应保留');
  
    const empty = forms.settingsHeaderEmpty;
    assert.ok(empty && empty.visible && empty.message, '设置向导页眉为空应就地报错');
    assert.equal(empty.errorNearField, true, '设置向导错误应贴在页眉字段下方');
    assert.equal(empty.invalid, 'true', '设置向导页眉应标 aria-invalid');
    assert.equal(empty.describedby, 'wz-org-header-err', '设置向导页眉应指向就地错误文本');
  
    const ws = forms.settingsHeaderWhitespace;
    assert.ok(ws && ws.visible, '纯空格也应就地报错');
    assert.equal(ws.invalid, 'true', '纯空格态 aria-invalid 应为 true');
    assert.equal(ws.describedby, 'wz-org-header-err', '纯空格态 aria-describedby 应指向错误文本');
  
    const cleared = forms.settingsHeaderCleared;
    assert.equal(cleared?.invalid, null, '修正后应清除 aria-invalid');
    assert.equal(cleared?.describedby, null, '修正后应清除 aria-describedby');
    assert.equal(cleared?.value, '光华党支部', '修正后已填内容应保留');
  
    // 新建支部两处错误态（dev 模式党委组织员；真实 UI 点击触发，不写入）
    const missing = forms.settingsAppointMissing;
    assert.ok(missing && missing.visible && missing.message, '未选首任支书应就地报错');
    assert.equal(missing.invalid, 'true', '未选首任支书应标 aria-invalid');
    assert.equal(missing.describedby, 'wz-create-appoint-secretary-err', '错误应指向首任支书字段的错误文本');
    const conflict = forms.settingsAppointConflict;
    assert.ok(conflict && conflict.visible, '首任支书 = 组织委员应显示同人冲突错误');
    for (const side of ['sec', 'org']) {
      assert.equal(conflict[`${side}Invalid`], 'true', `同人冲突：${side} 应标 aria-invalid`);
      assert.equal(conflict[`${side}Describedby`], 'wz-create-appoint-conflict', `同人冲突：${side} 应指向冲突文本`);
    }
  });
  
  test('T6 确认弹窗：Esc 可关 + 焦点回触发元素 + Tab 焦点困在面板内 + resolve(false)', () => {
    assert.ok(EVIDENCE, '缺少真机证据文件');
    const m = EVIDENCE.modal || {};
    assert.equal(m.overlay, true, '确认弹窗应能打开');
    assert.equal(m.focusInPanel, true, '打开后焦点应在面板内');
    assert.equal(m.hasCloseBtn, false, '确认类弹窗不应渲染右上角 ×（只保留 Esc / 按钮）');
    assert.equal(m.tabTrapped, true, 'Tab 焦点应困在弹窗内');
    assert.equal(m.closedByEsc, true, 'Esc 应可关闭确认弹窗');
    assert.equal(m.focusReturned, true, '关闭后焦点应回到触发元素');
    assert.equal(m.resolveValue, false, 'Esc 取消应 resolve(false)，不得执行原动作');
  });
  
  test('T7 <44×44 数量只减不增，且六类控件不得回到 offender 名单', () => {
    assert.ok(EVIDENCE, '缺少真机证据文件');
    assert.ok(Number.isInteger(EVIDENCE.offenderCount), '证据缺少 offenderCount');
    assert.ok(EVIDENCE.offenderCount <= OFFENDER_BASELINE,
      `390 可点元素命中区 <44×44 由 ${OFFENDER_BASELINE} 升到 ${EVIDENCE.offenderCount}：新增控件必须带命中区扩展，棘轮只降不升`);
    assert.ok(EVIDENCE.offenderCount > 0, 'offender 统计为 0：遍历口径可能失效（非空转）');
  
    // 无相邻约束的三类：不得再回到 offender 名单
    for (const [re, label] of [
      [/tab-btn/, '工作台页签'],
      [/todo-more__btn/, '待办行更多'],
      [/help-toc-item/, '帮助目录'],
    ]) {
      const hit = EVIDENCE.offenders.filter((o) => re.test(o.selector) && (o.hitW < 44 || o.hitH < 44));
      assert.deepEqual(hit.map((o) => `${o.page} → ${o.selector} ${o.hitW}×${o.hitH}`), [],
        `${label} 不得回到 <44×44 offender 名单`);
    }
  
    // 受相邻间距约束的三类：允许仍在 offender 名单（<44），但不得低于证据里记录的下限
    const constrained = [
      [/cal-cell-mobile/, '日历日期格', 44, 42],
      [/cal-view-btn/, '日历视图切换', 37, 44],
      [/myws-row[\s\S]*btn-action|btn-action[\s\S]*myws-row/, '设置页行内动作', 36, 42],
    ];
    for (const [re, label, minW, minH] of constrained) {
      const bad = EVIDENCE.offenders.filter((o) => re.test(o.selector) && (o.hitW < minW || o.hitH < minH));
      assert.deepEqual(bad.map((o) => `${o.page} → ${o.selector} ${o.hitW}×${o.hitH}`), [],
        `${label} 的命中区不得低于已记录的相邻约束下限 ${minW}×${minH}`);
    }
  });

})();

// ═══ 源件 14：a11y-guard.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // a11y-guard.test.mjs — 可访问性常驻静态守卫（`close-six-dim-gaps` T10 · 2026-11-15）
  //
  // 为什么要有本守卫：`a11y-tree.test.mjs` 用 Chromium 可访问性树做真机判据，但它在 precommit 层、
  //   逐页跑、只覆盖 6 个代表页面；日常改模板（`docs/src/**/*.js` 的 innerHTML 模板 ＋ `docs/*.html`）
  //   时没有任何机检能拦住「新加一个无名称的图标钮 / 无标签的输入框 / 缺 aria-selected 的页签」。
  //   本文件把六条可静态判定的底线做成 guards 层棘轮：存量按实跑数字登记（只减不增），新增即红。
  //
  // 判据（全部在源码文本上近似，逐条注明边界）：
  //   A1 按钮 / 链接可访问名非空：`<button>` 与带 `href` 的 `<a>` 必须有
  //      `aria-label` / `aria-labelledby` / `title` 之一，或可见文字非空。
  //      · 边界：`${...}` 表达式按「可能产出文字」计（宁可漏判不误判）；找不到闭标签的拼接式模板不计。
  //   A2 表单控件有标签关联：`<input>`（hidden / submit / button / reset / image 除外）/`<select>`/
  //      `<textarea>` 必须有 `aria-label` / `aria-labelledby` / `title`，或 `id` 命中同文件
  //      `<label for="id">`，或被 `<label>` 包裹。placeholder 不算标签。
  //   A3 `section` 有可访问名称且不嵌套：开标签必须有非空 `aria-label` / `aria-labelledby`；
  //      同文件按标签顺序计深度，深度 >0 时再开 section 记嵌套。
  //   A4 `role="tab"` 同时带 `aria-selected` 与 `aria-controls`（读屏才能播报选中态与面板归属）。
  //   A5 非原生 `role="button"` 容器带 `tabindex`，且同文件存在 Enter / Space 键盘处理。
  //   A6 纯图标按钮（内文只有 `<svg>` / `icon(...)`）必须有 `aria-label` / `aria-labelledby`。
  //
  // 收基线纪律（同 `style-baseline.mjs`）：只减不增。修掉存量后**同批下调** `a11y-baseline.mjs` 的计数；
  //   **不得**为变绿上调计数或缩窄扫描面（扫描面下限在 A0 判据里钉住）。
  // 运行：cd server; node --test test/a11y-guard.test.mjs
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync, readdirSync, statSync } = await import('node:fs');
  const { join, relative } = await import('node:path');
  const { A11Y_BASELINE } = await import('./a11y-baseline.mjs');
  const ROOT = join(import.meta.dirname, '..', '..');
  const SRC = join(ROOT, 'docs', 'src');
  const DOCS = join(ROOT, 'docs');
  const SKIP_DIRS = new Set(['mock', 'vendor', 'node_modules']);
  
  // ── 源码 → 标签（静态近似；口径写在文件头） ─────────────────────────────
  
  /** 剥注释（块注释 / HTML 注释 / 行注释；与 copy-guard 同习惯） */
  function stripComments(src) {
    let s = String(src).replace(/\r\n?/g, '\n');
    s = s.replace(/\/\*[\s\S]*?\*\//g, ' ');
    s = s.replace(/<!--[\s\S]*?-->/g, ' ');
    return s.split('\n').map((line) => line.replace(/\/\/.*$/, '')).join('\n');
  }
  
  /** 取标签属性值；返回 null＝属性不存在，''＝存在但为空 */
  function attr(attrs, name) {
    const m = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`).exec(attrs || '');
    return m ? (m[1] ?? m[2] ?? '') : null;
  }
  
  /** 可访问名称属性（aria-label / aria-labelledby）是否给出了非空值 */
  function hasNameAttr(attrs) {
    return ['aria-label', 'aria-labelledby'].some((k) => String(attr(attrs, k) || '').trim().length > 0);
  }
  
  /** 扫描开标签（不匹配闭标签；引号内的 `>` 不截断） */
  function scanTags(src) {
    const out = [];
    const re = /<([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      out.push({
        name: m[1].toLowerCase(),
        attrs: m[2] || '',
        start: m.index,
        end: re.lastIndex,
        line: src.slice(0, m.index).split('\n').length,
      });
    }
    return out;
  }
  
  /** 内文可见文字（去掉 SVG / `icon(...)` / 标签 / 空白） */
  function visibleText(inner) {
    return String(inner || '')
      .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
      .replace(/\bicon\s*\([^()]*\)/g, ' ')
      .replace(/\$\{\s*\}/g, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&[a-zA-Z]+;/g, 'X')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  /** 闭标签位置（找不到返回 -1：拼接式模板不计，见文件头边界） */
  function findClose(text, name, from) {
    return text.toLowerCase().indexOf(`</${name}`, from);
  }
  
  /**
   * 审计一段源码。
   * @param {string} src 源码文本
   * @param {string} [file] 文件名（只用于报告）
   * @returns {{problems:Array, observed:Object}}
   */
  function auditSource(src, file = '<memory>') {
    const text = stripComments(src);
    const tags = scanTags(text);
    const problems = [];
    const observed = { names: 0, labels: 0, sections: 0, tabs: 0, roleButtons: 0, iconButtons: 0, unresolved: 0 };
    const push = (check, line, detail) => problems.push({ check, file, line, detail });
  
    // label 关联表
    const labelFor = new Set();
    for (const t of tags) {
      if (t.name !== 'label') continue;
      const f = attr(t.attrs, 'for');
      if (f) labelFor.add(f.trim());
    }
    const hasKeydown = /keydown|keyup|keypress/.test(text);
    const handlesEnter = /\bEnter\b/.test(text) && /Spacebar|' '|" "|key === ' '/.test(text);
  
    for (const t of tags) {
      // A1 按钮 / 链接可访问名
      if (t.name === 'button' || t.name === 'a') {
        if (t.name === 'a' && attr(t.attrs, 'href') === null) {
          // 无 href 的 <a> 不是链接（锚点占位），不进入名称判据
        } else {
          const close = findClose(text, t.name, t.end);
          if (close === -1) {
            observed.unresolved += 1;
          } else {
            observed.names += 1;
            const inner = text.slice(t.end, close);
            const named = hasNameAttr(t.attrs)
              || String(attr(t.attrs, 'title') || '').trim().length > 0
              || visibleText(inner).length > 0;
            if (!named) push('names', t.line, `<${t.name}> 无可访问名称`);
          }
        }
      }
  
      // A2 表单控件标签关联
      if (t.name === 'input' || t.name === 'select' || t.name === 'textarea') {
        const type = t.name === 'input' ? String(attr(t.attrs, 'type') || 'text').toLowerCase() : '';
        if (!['hidden', 'submit', 'button', 'reset', 'image'].includes(type)) {
          observed.labels += 1;
          const id = String(attr(t.attrs, 'id') || '').trim();
          const before = text.slice(0, t.start).toLowerCase();
          const wrapped = before.lastIndexOf('<label') > before.lastIndexOf('</label>');
          const labeled = hasNameAttr(t.attrs)
            || String(attr(t.attrs, 'title') || '').trim().length > 0
            || (id !== '' && labelFor.has(id))
            || wrapped;
          if (!labeled) push('labels', t.line, `<${t.name}> 缺标签关联 / aria-label`);
        }
      }
  
      // A4 role=tab
      if (String(attr(t.attrs, 'role') || '') === 'tab') {
        observed.tabs += 1;
        if (!attr(t.attrs, 'aria-selected')) push('tabs', t.line, 'role="tab" 缺 aria-selected');
        if (!attr(t.attrs, 'aria-controls')) push('tabs', t.line, 'role="tab" 缺 aria-controls');
      }
  
      // A5 非原生 role=button
      if (String(attr(t.attrs, 'role') || '') === 'button' && t.name !== 'button') {
        observed.roleButtons += 1;
        if (attr(t.attrs, 'tabindex') === null) {
          push('roleButtons', t.line, 'role="button" 缺 tabindex');
        } else if (!(hasKeydown && handlesEnter)) {
          push('roleButtons', t.line, 'role="button" 未见 Enter/Space 键盘处理');
        }
      }
  
      // A6 纯图标按钮
      if (t.name === 'button') {
        const close = findClose(text, 'button', t.end);
        if (close === -1) continue;
        const inner = text.slice(t.end, close);
        const hasIcon = /<svg\b/i.test(inner) || /\bicon\s*\(/.test(inner);
        if (!hasIcon) continue;
        observed.iconButtons += 1;
        if (visibleText(inner).length > 0) continue;   // 有可见文字，不属纯图标钮
        if (hasNameAttr(t.attrs)) continue;
        push('iconButtons', t.line, '<button> 纯图标缺 aria-label');
      }
    }
  
    // A3 section（名称 + 嵌套；按标签顺序计深度）
    const secRe = /<(\/?)section\b([^>]*)>/gi;
    let depth = 0;
    let m;
    while ((m = secRe.exec(text)) !== null) {
      if (m[1] === '/') {
        depth = Math.max(0, depth - 1);
        continue;
      }
      const line = text.slice(0, m.index).split('\n').length;
      observed.sections += 1;
      if (!hasNameAttr(m[2] || '')) push('sections', line, '<section> 缺可访问名称');
      if (depth > 0) push('sections', line, '<section> 嵌套在另一 section 内');
      depth += 1;
    }
  
    return { problems, observed };
  }
  
  // ── 扫描面 ────────────────────────────────────────────────────────────
  function walk(dir, out = []) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(e.name)) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p, out);
      else if (/\.(js|mjs)$/.test(e.name)) out.push(p);
    }
    return out;
  }
  
  const FILES = [
    ...walk(SRC),
    ...readdirSync(DOCS).filter((n) => n.endsWith('.html')).map((n) => join(DOCS, n)),
  ].sort();
  
  const RESULTS = FILES.map((abs) => {
    const file = relative(ROOT, abs).replace(/\\/g, '/');
    return { file, ...auditSource(readFileSync(abs, 'utf8'), file) };
  });
  
  const TOTAL = { names: 0, labels: 0, sections: 0, tabs: 0, roleButtons: 0, iconButtons: 0, unresolved: 0 };
  for (const r of RESULTS) for (const k of Object.keys(TOTAL)) TOTAL[k] += r.observed[k] || 0;
  
  const sum = (check) => RESULTS.reduce((n, r) => n + r.problems.filter((p) => p.check === check).length, 0);
  const samples = (check, n = 6) => RESULTS.flatMap((r) => r.problems.filter((p) => p.check === check))
    .slice(0, n).map((p) => `${p.file}:${p.line} ${p.detail}`);
  
  // ── A0 扫描面非空转 ───────────────────────────────────────────────────
  test('A0 扫描面达标（文件数 / 各类样本下限）且审计器能判出违规', () => {
    console.log(`[a11y] 扫描 ${FILES.length} 文件；样本 ${JSON.stringify(TOTAL)}；`
      + `违规 ${JSON.stringify(Object.fromEntries(['names', 'labels', 'sections', 'tabs', 'roleButtons', 'iconButtons'].map((k) => [k, sum(k)])))}`);
    assert.ok(FILES.length >= A11Y_BASELINE.scan.files,
      `只扫到 ${FILES.length} 份源码（下限 ${A11Y_BASELINE.scan.files}）：扫描面被写小`);
    for (const key of ['names', 'labels', 'sections', 'tabs', 'roleButtons', 'iconButtons']) {
      assert.ok(TOTAL[key] >= A11Y_BASELINE.scan[key],
        `${key} 只抽到 ${TOTAL[key]} 个样本（下限 ${A11Y_BASELINE.scan[key]}）：抽取口径失效`);
    }
  
    // 反例：六个判据各有一条必须被判红；正例不得误伤
    const bad = auditSource(`
      <button><svg viewBox="0 0 1 1"><path d="M0 0"/></svg></button>
      <a href="x.html"></a>
      <input type="text" placeholder="搜索">
      <section><section aria-label="内层"></section></section>
      <button role="tab">页签</button>
      <div role="button">可点容器</div>
    `);
    for (const check of ['names', 'labels', 'sections', 'tabs', 'roleButtons', 'iconButtons']) {
      assert.ok(bad.problems.some((p) => p.check === check), `反例未判红：${check} 判据失效`);
    }
    const good = auditSource(`
      <button type="button" aria-label="关闭">\${icon('close')}</button>
      <a href="x.html">可见文字</a>
      <label for="kw">搜索</label><input id="kw" type="text">
      <section aria-label="区块"></section>
      <button role="tab" aria-selected="false" aria-controls="panel-1">页签</button>
      <div role="button" tabindex="0" onkeydown="if (e.key === 'Enter' || e.key === ' ') go()">可点容器</div>
    `);
    assert.deepEqual(good.problems, [], `正例被误伤：${JSON.stringify(good.problems)}`);
  });
  
  // ── A1–A6 棘轮 ───────────────────────────────────────────────────────
  const CASES = [
    ['A1 按钮 / 链接可访问名非空', 'names'],
    ['A2 表单控件有标签关联或 aria-label', 'labels'],
    ['A3 section 有名且不嵌套', 'sections'],
    ['A4 role=tab 带 aria-selected / aria-controls', 'tabs'],
    ['A5 role=button 容器 tabindex ＋ Enter/Space', 'roleButtons'],
    ['A6 纯图标按钮有 aria-label', 'iconButtons'],
  ];
  
  for (const [title, key] of CASES) {
    test(`${title}：存量不得超过基线（只减不增）`, () => {
      const actual = sum(key);
      const base = A11Y_BASELINE[key];
      assert.ok(actual <= base,
        `${key} 违规由基线 ${base} 升到 ${actual}（新增控件必须补齐可访问性；`
        + `修掉存量后同批下调 a11y-baseline.mjs，不得上调）：\n  ${samples(key).join('\n  ')}`);
    });
  }

})();

// ═══ 源件 15：about-freeze-guard.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // about-freeze-guard.test.mjs — About「独立冻结件」内容基线守卫（2026-10-29）
  //
  // 为什么立这道守卫：支书多次强调 **About 是独立冻结件**——三件套（`docs/about.html` /
  //   `docs/src/about.css` / `docs/src/entries/pages/about-entry.js`）**原样保留**，它的两处引用面
  //   （功能目录「关于」卡、帮助页正文的页面清单）**也不许改**。此前这条规则只写在文档里
  //   （`.ctx/AGENTS.md` 常见坑、`content/04_web_design/PRODUCT_IA.md` 附节），**没有守卫**；
  //   上一轮 AI 擅自删了功能卡与帮助页清单，被支书要求全部回退。本守卫把规则变成内容基线：
  //   **恰好 5 个位置**，任一处变化即红并指出差异。
  //
  // 五个位置与定位方式（基线数据见 `about-freeze-baseline.mjs`）：
  //   ① docs/about.html                              整文件 SHA-256
  //   ② docs/src/about.css                           整文件 SHA-256
  //   ③ docs/src/entries/pages/about-entry.js        整文件 SHA-256
  //   ④ docs/src/core/domain/function-catalog.js     定位串 `{ id: 'about', name: '关于',` → 该行 trim() 后哈希
  //   ⑤ docs/help.html                               定位串 `系统页面分为根页面`       → 该行 trim() 后哈希
  //   ④⑤ **不做整文件哈希**：这两个文件会因别的原因正常变动（新增功能卡 / 正文微调），
  //   整文件哈希会把正常改动也判红。定位串未命中 ⇒ 同样判红（文案「定位串未命中，条目可能被删」），
  //   防「直接删掉那条」冒充合规。
  //
  // 判据 B1–B5：
  //   B1 基线条目**恰好 5 条**、字段齐备、文件集合与五个位置逐字相等（防漏项 / 防换条）。
  //   B2 三件套整文件哈希 ≡ 基线（去 BOM ＋ 换行统一 `\n`；行尾差异不算改动）。
  //   B3 两处引用面定位片段哈希 ≡ 基线（差异逐条报文件、行号与实际片段）。
  //   B4 非空转：两处定位串在真实文件里**恰好命中 1 行**、片段非空（否则 B3 会恒真 / 恒假）。
  //   B5 反例：把 5 个文件复制到临时目录（**不碰真实文件**），逐处改动 ⇒ 必须判红；
  //      副本原样 ⇒ 必须判绿（证明判定器既不是恒红、也不是恒绿）。
  //
  // 运行：node --test server/test/about-freeze-guard.test.mjs（纯 node，不起服务）
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync, existsSync, mkdtempSync, mkdirSync, cpSync, writeFileSync, rmSync } = await import('node:fs');
  const { createHash } = await import('node:crypto');
  const { join, dirname } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const { ABOUT_FREEZE_BASELINE } = await import('./about-freeze-baseline.mjs');
  const ROOT = join(import.meta.dirname, '..', '..');
  
  /** 五个位置（防「条数对但换了对象」） */
  const EXPECTED_FILES = [
    'docs/about.html',
    'docs/help.html',
    'docs/src/about.css',
    'docs/src/core/domain/function-catalog.js',
    'docs/src/entries/pages/about-entry.js',
  ];
  
  /** 去 BOM ＋ 换行统一为 `\n` ＋ 版本戳归一（行尾或发布补戳都不算内容改动）
   *  由来：2026-10-29 发布补戳把 about.html 里 `?v=` 从 20261029a 换成 b，整文件哈希变了，
   *  冻结守卫误判为「About 被改动」。冻结的是内容，缓存戳属于发布机械字段，故先归一。 */
  const normalize = (s) => s
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\?v=[0-9A-Za-z]+/g, '?v=__STAMP__');
  const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
  const brief = (s, n = 160) => (s.length > n ? `${s.slice(0, n)}…` : s);
  
  /** 定位串命中行（1-based 行号 ＋ trim 后文本） */
  function locateLines(text, locator) {
    const hits = [];
    normalize(text).split('\n').forEach((line, i) => {
      if (line.includes(locator)) hits.push({ line: i + 1, text: line.trim() });
    });
    return hits;
  }
  
  /**
   * 逐条核基线，返回问题清单（空数组＝全绿）。
   * `root` 可指向临时副本（B5 反例复用同一判定器，不改判据）。
   */
  function checkBaseline(root, entries = ABOUT_FREEZE_BASELINE) {
    const problems = [];
    for (const e of entries) {
      const abs = join(root, e.file);
      if (!existsSync(abs)) {
        problems.push(`${e.file}：文件不存在（About 冻结件被删？）`);
        continue;
      }
      const text = readFileSync(abs, 'utf8');
      if (!e.locator) {
        const actual = sha256(normalize(text));
        if (actual !== e.sha256) {
          problems.push(`${e.file}：整文件内容与基线不一致（基线 ${e.sha256.slice(0, 12)}… / 实为 `
            + `${actual.slice(0, 12)}…）——About 冻结件被改动`);
        }
        continue;
      }
      const hits = locateLines(text, e.locator);
      if (hits.length === 0) {
        problems.push(`${e.file}：定位串未命中，条目可能被删（定位串「${e.locator}」）`);
        continue;
      }
      if (hits.length > 1) {
        problems.push(`${e.file}：定位串命中 ${hits.length} 行（应恰好 1 行）——判据不确定，`
          + `命中行 ${hits.map((h) => h.line).join(' / ')}`);
        continue;
      }
      const actual = sha256(hits[0].text);
      if (actual !== e.sha256) {
        problems.push(`${e.file}:${hits[0].line}：定位片段与基线不一致（基线 ${e.sha256.slice(0, 12)}… `
          + `/ 实为 ${actual.slice(0, 12)}…）\n    实际片段：${brief(hits[0].text)}`);
      }
    }
    return problems;
  }
  
  // ── B1 基线规模与字段 ────────────────────────────────────────────────────────
  test('B1 基线条目恰好 5 条：字段齐备 · 文件集合＝五个冻结位置（防漏项 / 换条）', () => {
    assert.equal(ABOUT_FREEZE_BASELINE.length, 5,
      `About 冻结基线应恰好 5 条（3 件套 ＋ 2 处引用面），实为 ${ABOUT_FREEZE_BASELINE.length} 条——条目被删或漏登记`);
  
    for (const e of ABOUT_FREEZE_BASELINE) {
      assert.equal(typeof e.file, 'string', `基线条目缺 file：${JSON.stringify(e)}`);
      assert.ok(Object.hasOwn(e, 'locator'), `${e.file}：条目缺 locator 字段（整文件哈希者写 null）`);
      assert.match(e.sha256, /^[0-9a-f]{64}$/, `${e.file}：sha256 不是 64 位小写十六进制`);
      assert.ok(typeof e.reason === 'string' && e.reason.length >= 10, `${e.file}：缺一行理由（≥10 字）`);
      if (e.locator !== null) {
        assert.ok(typeof e.locator === 'string' && e.locator.trim().length >= 4,
          `${e.file}：定位串为空或过短（无法定位最小片段）`);
      }
    }
  
    assert.deepEqual(ABOUT_FREEZE_BASELINE.map((e) => e.file).sort(), EXPECTED_FILES,
      'About 冻结基线的文件集合与五个冻结位置不一致（条目被替换 / 新增了不该有的位置）');
    assert.deepEqual(ABOUT_FREEZE_BASELINE.filter((e) => e.locator === null).map((e) => e.file).sort(),
      EXPECTED_FILES.filter((f) => !f.endsWith('function-catalog.js') && !f.endsWith('help.html')),
      '整文件哈希条目应恰为三件套（about.html / about.css / about-entry.js）');
  });
  
  // ── B2 三件套整文件 ──────────────────────────────────────────────────────────
  test('B2 三件套整文件哈希 ≡ 基线（About 页面 / 样式 / 入口脚本一字不动）', () => {
    const entries = ABOUT_FREEZE_BASELINE.filter((e) => e.locator === null);
    const problems = checkBaseline(ROOT, entries);
    assert.deepEqual(problems, [], `About 三件套被改动：\n  ${problems.join('\n  ')}`);
    console.log(`[B2] 三件套整文件哈希：${entries.length} 件一致`);
  });
  
  // ── B3 两处引用面 ────────────────────────────────────────────────────────────
  test('B3 两处引用面定位片段 ≡ 基线（功能目录「关于」卡 · help 正文页面清单）', () => {
    const entries = ABOUT_FREEZE_BASELINE.filter((e) => e.locator !== null);
    const problems = checkBaseline(ROOT, entries);
    assert.deepEqual(problems, [], `About 引用面被改动：\n  ${problems.join('\n  ')}`);
    console.log(`[B3] 引用面定位片段：${entries.length} 处一致`);
  });
  
  // ── B4 非空转：定位串在真实文件里恰好命中 1 行 ───────────────────────────────
  test('B4 非空转：每条定位串在真实文件里恰好命中 1 行且片段非空', () => {
    const entries = ABOUT_FREEZE_BASELINE.filter((e) => e.locator !== null);
    assert.equal(entries.length, 2, `定位串条目应为 2 条（实为 ${entries.length}）：B3 的判红面被削`);
    for (const e of entries) {
      const hits = locateLines(readFileSync(join(ROOT, e.file), 'utf8'), e.locator);
      assert.equal(hits.length, 1,
        `${e.file}：定位串「${e.locator}」命中 ${hits.length} 行（应恰好 1 行）——定位串未命中，条目可能被删；`
        + '命中多行则判据不确定');
      assert.ok(hits[0].text.length >= 20,
        `${e.file}:${hits[0].line}：定位片段只有 ${hits[0].text.length} 字，过短不足以承载条目内容`);
    }
    console.log(`[B4] 定位串命中：${entries.map((e) => e.file).join(' · ')}`);
  });
  
  // ── B5 反例：临时副本改动任一处必须判红 ─────────────────────────────────────
  test('B5 反例：临时副本改动任一处必须判红（真实文件不动）', () => {
    const dir = mkdtempSync(join(tmpdir(), 'about-freeze-'));
    try {
      for (const e of ABOUT_FREEZE_BASELINE) {
        const dst = join(dir, e.file);
        mkdirSync(dirname(dst), { recursive: true });
        cpSync(join(ROOT, e.file), dst);
      }
  
      // ① 原样副本 ⇒ 必须判绿（否则判定器恒红，反例没有证明力）
      assert.deepEqual(checkBaseline(dir), [], '临时副本原样却判红：判定器恒红，本守卫的绿不成立');
  
      // ② 逐处改内容 ⇒ 必须判红
      for (const e of ABOUT_FREEZE_BASELINE) {
        const p = join(dir, e.file);
        const original = readFileSync(p, 'utf8');
        let tampered;
        if (!e.locator) {
          tampered = `${original}\n<!-- freeze-tamper -->\n`;          // 整文件：追加一行即改哈希
        } else {
          tampered = normalize(original).replace(e.locator, `${e.locator}　`); // 定位片段：只改命中行
        }
        writeFileSync(p, tampered, 'utf8');
        const problems = checkBaseline(dir);
        assert.ok(problems.some((s) => s.startsWith(`${e.file}:`) || s.startsWith(`${e.file}：`)),
          `${e.file}：内容改动后未判红（反例失效）——问题清单：${JSON.stringify(problems)}`);
        writeFileSync(p, original, 'utf8');
      }
  
      // ③ 引用面整行删除 ⇒ 必须报「定位串未命中，条目可能被删」
      for (const e of ABOUT_FREEZE_BASELINE.filter((x) => x.locator !== null)) {
        const p = join(dir, e.file);
        const original = readFileSync(p, 'utf8');
        const kept = normalize(original).split('\n').filter((line) => !line.includes(e.locator)).join('\n');
        writeFileSync(p, kept, 'utf8');
        const problems = checkBaseline(dir);
        assert.ok(problems.some((s) => s.includes('定位串未命中，条目可能被删')),
          `${e.file}：删掉该行后未报「定位串未命中，条目可能被删」——防「删条目冒充合规」的判据失效`);
        writeFileSync(p, original, 'utf8');
      }
  
      // ④ 反例跑完，真实文件仍应与基线一致（证明全程只动临时副本）
      assert.deepEqual(checkBaseline(ROOT), [], '反例过程中真实 About 冻结件被改动');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    console.log('[B5] 反例：5 处逐个改动均判红 · 副本原样判绿 · 真实文件未动');
  });

})();

// ═══ 源件 16：viewport-and-touch-guard ═══
await (async () => {
  // role: [工程师]+[AI]
  // viewport-and-touch-guard — 外部准则（Web Interface Guidelines）里五条能布尔化的收口项（2026-11-23 批次 604 · D-914）
  //
  // 为什么有本守卫：批次 604 用 web-design-guidelines 做外部准则探查时，发现「粘性头遮住聚焦元素」
  //   「<img> 尺寸三种写法并存」这类只在真机上才看得见的漏网。文档写进 `UI_REVIEW_CHECKLIST ⑨`
  //   不算收口——没有机检就会下一次改动又漏回去。本组把五条写成可布尔判定的验收标准：
  //   TC-1 固定顶栏避让：`html` 的 `scroll-padding-top` 必须等于 `#app-header` 的 `height`（逐值比对）。
  //   TC-2 触控：至少一条 `touch-action: manipulation` 规则覆盖九类可交互控件。
  //   TC-3 滚动隔离：`.sidebar-nav`（抽屉）与 `.modal-body`（模态体）都声明 `overscroll-behavior: contain`。
  //   TC-4 触控高亮显式设定：`html` 必须声明 `-webkit-tap-highlight-color: transparent`。
  //   TC-5 图片：`docs/*.html` 的 `<img>` 必须有 `alt` ＋ 数值 `width`/`height`（hidden 除外）；
  //        `docs/src/**/*.js` 的 `<img>` 必须有 `alt`（尺寸可由固定尺寸类承担）。
  // 五条都带反例自检（改坏 ⇒ 必须判红），证明判定器不是恒绿。
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync, readdirSync } = await import('node:fs');
  const { join, relative } = await import('node:path');
  const ROOT = join(import.meta.dirname, '..', '..');
  const CSS = join(ROOT, 'docs', 'src', 'styles.css');
  const DOCS = join(ROOT, 'docs');

  /** 剥 CSS 注释（注释里的示例不得计入判据） */
  const stripCssComments = (s) => String(s).replace(/\/\*[\s\S]*?\*\//g, '');

  /** 剥 JS 注释（块注释 ＋ 整行 / 行尾注释；`https://` 不被误剥） */
  const stripJsComments = (s) => String(s)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

  /** 顶层规则块 `{selector, body}`（进入 `@media` 时整块跳过；本组判据只针对顶层规则） */
  function ruleBlocks(css) {
    const src = stripCssComments(css);
    const out = [];
    let i = 0;
    let selStart = 0;
    while (i < src.length) {
      const ch = src[i];
      if (ch === '{') {
        const selector = src.slice(selStart, i).split('}').pop().trim().replace(/\s+/g, ' ');
        let depth = 1;
        let j = i + 1;
        while (j < src.length && depth > 0) {
          if (src[j] === '{') depth += 1;
          else if (src[j] === '}') depth -= 1;
          j += 1;
        }
        out.push({ selector, body: src.slice(i + 1, j - 1) });
        i = j;
        selStart = j;
        continue;
      }
      if (ch === '}') selStart = i + 1;
      i += 1;
    }
    return out;
  }

  /** 取某选择器的全部规则体（选择器逐字相等） */
  const bodiesOf = (blocks, selector) => blocks.filter((b) => b.selector === selector).map((b) => b.body);

  /** 取规则体里某声明的值（最后一条生效；无则 null） */
  function declValue(body, prop) {
    const re = new RegExp(`(?:^|[;{\\s])${prop.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*:\\s*([^;}]+)`, 'g');
    let v = null;
    let m;
    while ((m = re.exec(body)) !== null) v = m[1].trim();
    return v;
  }

  const CSS_SRC = readFileSync(CSS, 'utf8');
  const BLOCKS = ruleBlocks(CSS_SRC);

  /** TC-1 纯函数：返回 `{header, pad}`（px 数值）；缺声明为 null */
  function headerScrollPair(css) {
    const blocks = ruleBlocks(css);
    const headerBody = bodiesOf(blocks, '#app-header').join(';');
    const htmlBody = bodiesOf(blocks, 'html').join(';');
    const px = (v) => (v && /^(\d+(?:\.\d+)?)px$/.test(v) ? Number(v.slice(0, -2)) : null);
    return {
      header: px(declValue(headerBody, 'height')),
      pad: px(declValue(htmlBody, 'scroll-padding-top')),
    };
  }

  test('TC-1 固定顶栏避让：html 的 scroll-padding-top ≡ #app-header 的 height（逐值比对）', () => {
    const { header, pad } = headerScrollPair(CSS_SRC);
    assert.ok(header > 0, '#app-header 的 height 未解析到数值：判据失去对照面');
    assert.equal(pad, header,
      `scroll-padding-top=${pad} 与 #app-header height=${header} 不等：锚点 / 聚焦滚动会被固定顶栏遮住；`
      + '两处必须同值（改高度同批改 scroll-padding-top）');
    const bad = CSS_SRC.replace(/scroll-padding-top:\s*\d+(?:\.\d+)?px/, 'scroll-padding-top: 0px');
    assert.notDeepEqual(headerScrollPair(bad), { header, pad: header }, 'TC-1 反例失效：改坏 scroll-padding-top 未判红');
    console.log(`[TC-1] 顶栏避让：height=${header}px ≡ scroll-padding-top=${pad}px`);
  });

  const TOUCH_REQUIRED = ['button', 'a[href]', 'summary', '[role=button]', '[role=tab]', '[role=option]', 'input', 'select', 'textarea'];

  /** TC-2 纯函数：覆盖 `touch-action: manipulation` 的控件（选择器去引号归一） */
  function touchCovered(css) {
    const covered = new Set();
    for (const b of ruleBlocks(css)) {
      if (!/touch-action\s*:\s*manipulation/.test(b.body)) continue;
      for (const raw of b.selector.split(',')) {
        covered.add(raw.trim().replace(/"/g, '').replace(/'/g, '').replace(/\s+/g, ' '));
      }
    }
    return covered;
  }

  test('TC-2 触控：touch-action: manipulation 覆盖九类可交互控件（缺一即红）', () => {
    const covered = touchCovered(CSS_SRC);
    const missing = TOUCH_REQUIRED.filter((s) => !covered.has(s));
    assert.deepEqual(missing, [],
      `touch-action: manipulation 未覆盖：${missing.join(' / ')}（双击缩放延迟会回来）`);
    const bad = CSS_SRC.replace(/button,\s*\n?\s*a\[href\][\s\S]{0,400}?touch-action:\s*manipulation/, 'button { touch-action: manipulation }');
    assert.deepEqual([...touchCovered(bad)].filter((s) => TOUCH_REQUIRED.includes(s)).length >= TOUCH_REQUIRED.length, false,
      'TC-2 反例失效：删掉控件选择器未判红');
    console.log(`[TC-2] 触控：覆盖 ${covered.size} 个选择器（要求 ≥ ${TOUCH_REQUIRED.length}）`);
  });

  test('TC-3 滚动隔离：抽屉 .sidebar-nav 与模态体 .modal-body 都 contain（不串联页面滚动）', () => {
    for (const sel of ['.sidebar-nav', '.modal-body']) {
      const bodies = bodiesOf(BLOCKS, sel);
      assert.ok(bodies.length > 0, `${sel} 规则块缺失：判据失去对照面`);
      assert.ok(bodies.some((b) => /overscroll-behavior\s*:\s*contain/.test(b)),
        `${sel} 缺 overscroll-behavior: contain（内层滚到底会带动页面滚动）`);
      const bad = CSS_SRC.replace(new RegExp(`(\\${sel}\\s*\\{[^}]*?)overscroll-behavior:\\s*contain`, 'g'), '$1');
      assert.equal(/overscroll-behavior\s*:\s*contain/.test(bodiesOf(ruleBlocks(bad), sel).join(';')), false,
        `TC-3 反例失效：从 ${sel} 删掉 contain 未判红`);
    }
    console.log('[TC-3] 滚动隔离：.sidebar-nav · .modal-body 均 contain');
  });

  test('TC-4 触控高亮显式设定：html 声明 -webkit-tap-highlight-color: transparent', () => {
    const htmlBody = bodiesOf(BLOCKS, 'html').join(';');
    const v = declValue(htmlBody, '-webkit-tap-highlight-color');
    assert.equal(v, 'transparent',
      `-webkit-tap-highlight-color=${v}：必须显式设为 transparent（默认系统蓝与党建红壳层撞色）`);
    const bad = CSS_SRC.replace(/\s*-webkit-tap-highlight-color:\s*transparent;?/, '');
    assert.equal(declValue(bodiesOf(ruleBlocks(bad), 'html').join(';'), '-webkit-tap-highlight-color'), null,
      'TC-4 反例失效：删掉声明未判红');
    console.log('[TC-4] 触控高亮：transparent（显式设定）');
  });

  /** TC-5 纯函数：图片判据 → 问题清单 */
  function imageProblems(html, { requireDims }) {
    const problems = [];
    const re = /<img\b((?:"[^"]*"|'[^']*'|[^>"'])*)>/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      const attrs = m[1] || '';
      const get = (name) => {
        const hit = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`).exec(attrs);
        return hit ? (hit[1] ?? hit[2] ?? '') : null;
      };
      const line = html.slice(0, m.index).split('\n').length;
      if (get('alt') === null) problems.push(`${line}:<img> 缺 alt`);
      if (!requireDims || get('hidden') !== null) continue;
      for (const dim of ['width', 'height']) {
        const v = get(dim);
        if (v === null || !/^\d+$/.test(v.trim())) problems.push(`${line}:<img> 缺数值 ${dim}（防 CLS）`);
      }
    }
    return problems;
  }

  test('TC-5 图片：静态页 <img> 必须有 alt ＋ 数值 width/height；JS 模板必须有 alt', () => {
    const pages = readdirSync(DOCS).filter((n) => n.endsWith('.html')).sort();
    const pageProblems = pages.flatMap((n) => imageProblems(readFileSync(join(DOCS, n), 'utf8'), { requireDims: true })
      .map((p) => `docs/${n}:${p}`));
    assert.deepEqual(pageProblems, [], `静态页图片判据不满足：\n${pageProblems.join('\n')}`);

    const jsProblems = [];
    const walkSrc = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (['mock', 'vendor', 'node_modules'].includes(e.name)) continue;
        const p = join(dir, e.name);
        if (e.isDirectory()) walkSrc(p);
        else if (/\.(js|mjs)$/.test(e.name)) {
          for (const p2 of imageProblems(stripJsComments(readFileSync(p, 'utf8')), { requireDims: false })) {
            jsProblems.push(`${relative(ROOT, p).replace(/\\/g, '/')}:${p2}`);
          }
        }
      }
    };
    walkSrc(join(DOCS, 'src'));
    assert.deepEqual(jsProblems, [], `JS 模板图片缺 alt：\n${jsProblems.join('\n')}`);

    assert.equal(imageProblems('<img src="a.png" class="x">', { requireDims: true }).length, 3,
      'TC-5 反例失效：缺 alt / width / height 未全部判红');
    assert.deepEqual(imageProblems('<img src="a.png" alt="" width="48" height="48">', { requireDims: true }), [],
      'TC-5 反例误伤：合规 <img> 被判红');
    console.log(`[TC-5] 图片：静态页 ${pages.length} 个 · JS 模板 alt 全绿`);
  });

})();

// ═══ 源件 16：死代码与非生产开关收门（2026-11-25 批次 631 · D-929）═══
await (async () => {
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync, existsSync } = await import('node:fs');
  const { join } = await import('node:path');
  const ROOT = join(import.meta.dirname, '..', '..');
  const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

  test('D1 非生产开关收门：?dev 只在本地主机生效，且开关清单登记在 run-mode', () => {
    const login = read('docs/src/entries/pages/login-entry.js');
    assert.match(login, /_DEV_LOCAL_HOST\s*=\s*\/\^\(localhost/,
      '?dev 分支必须先判本机主机名（生产域名不得靠拼参数进入开发登录）');
    assert.match(login, /_DEV_ALLOWED\s*=\s*_DEV_LOCAL_HOST\s*&&/,
      '_DEV_ALLOWED 必须以主机名门为必要条件');
    const runMode = read('server/run-mode.js');
    for (const key of ['ALLOW_MULTI_BRANCH', 'IAAA_MOCK', 'DISABLE_PASSWORD_CHECK', 'ALLOW_DEMO_DATA', 'SANDBOX_MODE', '?dev=1']) {
      assert.ok(runMode.includes(key), `run-mode.js 的「仅非生产开关」清单缺 ${key}`);
    }
  });

  test('D2 死代码清点脚本存在且可复跑（只报候选，删除须人工复核）', () => {
    assert.ok(existsSync(join(ROOT, 'server/scripts/dead-code-audit.mjs')), '缺 dead-code-audit.mjs（死代码清点入口）');
    const src = read('server/scripts/dead-code-audit.mjs');
    assert.match(src, /--json/, '清点脚本须支持 --json 供台账引用');
    assert.match(src, /根本不能调用/, '脚本头注须区分两类「死」并说明处置差异');
  });
})();
