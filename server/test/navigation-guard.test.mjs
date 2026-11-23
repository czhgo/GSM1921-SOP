// role: [工程师]+[AI]
// navigation-guard.test.mjs — 守卫归并件（2026-11-22 批次 600 · D-910）
// 归并来源：link-target-guard.test.mjs · page-title-guard.test.mjs · archive-deeplink-guard.test.mjs · notice-deeplink-guard.test.mjs · ui-home-deeplink.test.mjs · no-about-route-guard.test.mjs · public-brand-guard.test.mjs · localstorage-key-guard.test.mjs
// 纪律：只减文件数、不减断言数；每个源件包在独立 async 块作用域里（imports 转动态导入），
//   同名 helper / 常量互不冲突；失败信息保留各源件的横幅与断言名，便于定位。

// ═══ 源件 1：link-target-guard.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // link-target-guard.test.mjs — 「JS 渲染型 href/src 的裸文件名」回归防线（2026-09-25 美学与链接存量批）
  //
  // 病灶（支书实机踩到过 404）：`docs/workspace/*.html` 七个工作台页**都有 `<base href="../">`**，
  //   把基准 URL 从 `docs/workspace/` 抬到 `docs/`。于是 JS 模板串里写的**裸文件名**（形如
  //   `href="secretary.html?activityId=…"`）会被浏览器解析到 **`docs/secretary.html`**（站点根下的同名文件）
  //   ——而工作台页实际上在 `docs/workspace/` 下 ⇒ **404**。
  //
  // 为什么前几批的守卫没抓到（**盲区**）：
  //   · 静态链接层 `link-integrity.test.mjs::L1` 只扫 `docs/**/*.html` 的 href/src（HTML 里写的是 `./workspace/…`，
  //     正确），对 `docs/src/**` 的**渲染型** href 只查了 `../` 前缀那一类（写 `../` 在本地「恰好能跑」、
  //     子路径发布时才 404），**没查裸文件名**。
  //   · JS 导航层 `L2` 只扫 `location.href = …` 赋值，模板串里渲染的 `href="…"` 属空白区。
  //   ⇒ 本守卫补这一层：**渲染型 href/src 里的裸文件名，按 `<base>` 规则解析后必须指向真实存在的文件**。
  //
  // 判据与「页面有没有 `<base href="../">`」的联动（**这是本 bug 的机理**）：
  //   · 工作台页 `docs/workspace/x.html`：`<base href="../">` ⇒ 基准 = `docs/` ⇒ 裸 `y.html` 解析到 `docs/y.html`。
  //   · 根级页 `docs/y.html`（无 `<base>`）⇒ 基准 = 页面所在目录 = `docs/` ⇒ 裸 `y.html` **同样**解析到 `docs/y.html`。
  //   ⇒ 全站页面只落在 `docs/` 与 `docs/workspace/` 两处，**两种页面的基准都汇到 `docs/`**
  //     ⇒ 裸文件名 `y.html` 的目标**与「渲染进哪个页面」无关**，恒等于 `docs/y.html`。
  //     同理 `./workspace/y.html` 在两种页面下都解析到 `docs/workspace/y.html`。
  //
  // 共享件的处置与失真风险（**如实登记**）：
  //   · 一段 JS 可能被多个页面复用（共享组件 / 共享 tab），静态上无法确定它渲染进哪张页面。
  //     因上一条「两种页面基准同为 `docs/`」，本守卫**不需要**判定宿主页面 ⇒ 取「两种页面的交集」即可，
  //     即：**裸文件名必须指向 `docs/` 根级真实存在的文件**（既不宽松也不加严）。
  //   · 失真风险（唯一一种）：若将来出现**位于新子目录、且不带 `<base>`** 的页面复用同一段 JS，则裸文件名在
  //     那张页面上会解析到**该子目录**（而非 `docs/`），本守卫会把它的「合法裸名」误判为红。届时须：
  //     ① 给该页面补 `<base href="../">`（与工作台页同规），或 ② 把该处渲染路径改写成 `./…`/`getBasePath()+…`
  //     （**推荐**，与既有 `getBasePath()` 口径一致，且与页面位置解耦）。**本守卫不为未出现的页面形态提前放宽。**
  //
  // 非空转判据（**缺一不可**）：
  //   ① 抽取口径在合成正/负样本上必须命中/不命中（防正则失效恒真）：见 SAMPLE_* 自检；
  //   ② 抽取面规模下限（扫描到的 js 文件数 / 渲染型属性引用数）——低于下限说明口径失效或扫描范围被削；
  //   ③ 正样本可判：两个**已修样本**（`workforce-panel.js` / `activities-tab.js`）的渲染路径必须是
  //      `./workspace/…`（裸名会 404）——它们此前就是这个 bug 的现场；
  //   ④ 反例实测（人工，不入仓）：把任一处改回裸名 ⇒ 本守卫须判红（见批报告）。
  //
  // 运行：node --test server/test/link-target-guard.test.mjs（纯 node，无需起服务）
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readdirSync, readFileSync, existsSync } = await import('node:fs');
  const { join, relative, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const HERE = dirname(fileURLToPath(import.meta.url));
  const ROOT = join(HERE, '..', '..');
  const DOCS = join(ROOT, 'docs');
  
  /**
   * 渲染型属性抽取口径（单一源）：
   * `href` / `src` 紧跟 `=`（HTML）或 `:`（对象属性）后接 **引号包裹的字符串**（"…" / '…' / `…`）。
   * 只取「属性值本身就是字符串字面量」的形态——`href = getBasePath() + 'x.html'` 这类**拼接**不命中
   * （拼接是页面位置解耦的写法，不属本病灶）；`new URL(…)` / `from '…'` 等 Node 读取语境另行剔除。
   */
  const RENDER_REF_RE = /\b(?:href|src)\s*[=:]\s*(?:"([^"\n]*)"|'([^'\n]*)'|`([^`\n]*)`)/g;
  /** 裸文件名形态：小写字母开头、只含小写字母/数字/连字符 + `.html`（**不含任何路径分隔符 / 前缀**） */
  const BARE_RE = /^[a-z][a-z0-9-]*\.html$/;
  
  /** 抽取面规模下限（非空转：实测值见批报告；低于下限＝口径失效或扫描范围被削） */
  const JS_FILE_FLOOR = 180;   // docs/src 下 .js 文件数
  const RENDER_REF_FLOOR = 100; // 渲染型 href/src 引用数（含各类前缀 / 外部 / 动态）
  
  /** 已修样本（此前就是「裸名 → <base> 解析到站点根 ⇒ 404」的现场）：这些文件里的渲染路径不得是裸名 */
  const FIXED_SAMPLE_FILES = [
    'docs/src/entries/tabs/secretary/workforce-panel.js',
    'docs/src/entries/tabs/visitor/activities-tab.js',
  ];
  
  /** 递归收集 docs/src 下全部 .js（相对仓库根的 posix 路径） */
  function jsFiles() {
    const out = [];
    const walk = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith('.js')) out.push(relative(ROOT, p).replace(/\\/g, '/'));
      }
    };
    walk(join(DOCS, 'src'));
    return out.sort();
  }
  
  /** 全站页面清单（决定 `<base>` 解析基准）：`{ path, baseDir, hasBase }` */
  function htmlPages() {
    const out = [];
    const walk = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) { if (e.name !== 'assets') walk(p); continue; }
        if (!e.name.endsWith('.html')) continue;
        const rel = relative(DOCS, p).replace(/\\/g, '/');
        const src = readFileSync(p, 'utf8');
        const base = (src.match(/<base href="([^"]+)"/) || [])[1] || null;
        // 基准目录 = 页面所在目录 ⊕ <base href>（与浏览器同规；本仓 base 只有 "../"）
        const baseDir = base ? join(dirname(p), base).replace(/\\/g, '/') : dirname(p).replace(/\\/g, '/');
        out.push({ path: rel, baseDir: relative(DOCS, baseDir).replace(/\\/g, '/') || '.', hasBase: !!base });
      }
    };
    walk(DOCS);
    return out.sort((a, b) => a.path.localeCompare(b.path));
  }
  
  /** 逐行抽取渲染型属性引用 `[{ file, line, value }]`（剔除整行注释 / ESM 规格符 / Node 读取语境） */
  function extractRenderedRefs(relFile) {
    const out = [];
    const src = readFileSync(join(ROOT, relFile), 'utf8');
    src.split(/\r?\n/).forEach((line, i) => {
      const t = line.trim();
      if (!t || t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return; // 整行注释
      if (/\bfrom\s*['"`]|\bimport\s*\(|\bnew\s+URL\s*\(/.test(line)) return; // ESM 规格符 / Node 读取
      const re = new RegExp(RENDER_REF_RE.source, 'g');
      let m;
      while ((m = re.exec(line)) !== null) out.push({ file: relFile, line: i + 1, value: m[1] ?? m[2] ?? m[3] });
    });
    return out;
  }
  
  /**
   * 分类一个渲染型属性值（**判据单一源**，供机检与非空转自检共用）：
   *   skip     空值 / 纯锚点（`#x`）——无文件目标
   *   dynamic  路径段含 `${…}`（运行时拼接）——静态不可判
   *   external 带 scheme（http/mailto/tel/data）或 `//host` ——外部
   *   prefixed 以 `/` `./` `../` 开头——显式路径（`../` 由 link-integrity L1 另守）
   *   bare     裸文件名（`x.html`）——**本守卫的判红面**
   *   other    其余（形如 `workspace/x.html` 的相对路径片段等）
   */
  function classify(value) {
    const v = String(value || '');
    const pathPart = v.split('#')[0].split('?')[0];
    if (!pathPart) return { kind: v.startsWith('#') ? 'skip' : 'skip' };
    if (pathPart.includes('${')) return { kind: 'dynamic' };
    if (/^[a-z][a-z0-9+.-]*:/i.test(pathPart) || pathPart.startsWith('//')) return { kind: 'external' };
    if (pathPart.startsWith('/') || pathPart.startsWith('./') || pathPart.startsWith('../')) return { kind: 'prefixed' };
    if (BARE_RE.test(pathPart)) return { kind: 'bare', name: pathPart };
    return { kind: 'other' };
  }
  
  /** 解析裸文件名目标：两种页面（根级 / 工作台）基准都汇到 `docs/` ⇒ 恒为 `docs/<name>` */
  const resolveBare = (name) => join(DOCS, name);
  
  /** 全量扫描（一次） */
  function scan() {
    const files = jsFiles();
    const refs = [];
    for (const f of files) refs.push(...extractRenderedRefs(f));
    return { files, refs };
  }
  
  // ── L6 裸文件名渲染目标存在性 ─────────────────────────────────────────
  test('L6 裸文件名渲染 href/src：按 <base> 规则解析后目标必须真实存在（裸 x.html → docs/x.html）', () => {
    const { files, refs } = scan();
    const offenders = [];
    let bareCount = 0;
    for (const r of refs) {
      const c = classify(r.value);
      if (c.kind !== 'bare') continue;
      bareCount++;
      const target = resolveBare(c.name);
      if (!existsSync(target)) {
        offenders.push(`${r.file}:${r.line} → href/src="${r.value}" ⇒ 解析为 docs/${c.name}，但该文件不存在`
          + `（裸文件名在工作台页 <base href="../"> 下会落到站点根 ⇒ 404；应写 ./workspace/${c.name} 或 getBasePath()+…）`);
      }
    }
    console.log(`[L6] 渲染型 href/src 裸文件名：扫描 ${files.length} 个 js / ${refs.length} 处引用，其中裸名 ${bareCount} 处，`
      + `不存在 ${offenders.length} 处`);
    assert.deepEqual(offenders, [],
      `渲染型裸文件名解析到不存在的文件（<base> 联动口径见文件头）：\n  ${offenders.join('\n  ')}`);
  });
  
  // ── L7 非空转自检 ────────────────────────────────────────────────────
  test('L7 非空转：抽取口径可用 + 抽取面规模达标 + 已修样本可判', () => {
    // ① 抽取口径正/负样本（合成片段：能命中裸名、不误判其它形态）
    const synth = [
      'const a = `<a href="secretary.html?activityId=1">x</a>`;', // 裸名 → 命中
      'const b = `<a href=\'thought-report.html?id=${r.id}\'>y</a>`;', // 裸名（query 含插值）→ 命中
      'const c = { href: `search.html` };', // 对象属性 + 模板串 → 命中
      'const d = `<a href="./workspace/secretary.html?x=1">z</a>`;', // 前缀 ./ → 不命中
      'const e = `<img src="https://cdn.example/a.html">`;', // 外部 → 不命中
      'const f = `<a href="#anchor">a</a>`;', // 纯锚点 → 不命中
      'const g = `<a href="${getBasePath()}person.html?id=1">b</a>`;', // 动态路径 → 不命中
      'const h = `<a href="workspace/org.html">c</a>`;', // 相对片段（含 /）→ 不命中
      '// href="secretary.html" 注释内的不得命中', // 整行注释 → 跳过
    ];
    const hits = [];
    synth.forEach((line, i) => {
      const re = new RegExp(RENDER_REF_RE.source, 'g');
      let m;
      while ((m = re.exec(line)) !== null) hits.push({ i, value: m[1] ?? m[2] ?? m[3] });
    });
    // 注释行按 extractRenderedRefs 的规则剔除后再分类
    const classified = hits.filter((h) => !synth[h.i].trim().startsWith('//')).map((h) => classify(h.value).kind);
    assert.deepEqual(
      classified, ['bare', 'bare', 'bare', 'prefixed', 'external', 'skip', 'dynamic', 'other'],
      `抽取口径失效：合成样本分类结果与预期不符（实测 ${JSON.stringify(classified)}）——守卫会恒真/过宽`);
    assert.equal(classify('secretary.html').name, 'secretary.html', '抽取口径失效：裸名未被识别');
  
    // ② 抽取面规模下限（低于下限说明口径失效或扫描范围被削）
    const { files, refs } = scan();
    assert.ok(files.length >= JS_FILE_FLOOR,
      `只扫到 ${files.length} 个 docs/src/*.js（下限 ${JS_FILE_FLOOR}）：扫描范围异常，断言可能恒真`);
    assert.ok(refs.length >= RENDER_REF_FLOOR,
      `只抽到 ${refs.length} 处渲染型 href/src 引用（下限 ${RENDER_REF_FLOOR}）：抽取口径失效，断言可能恒真`);
  
    // ②′ <base> 联动前提仍成立（判据的机理，被改动即红灯）：全站页面只落在 docs/ 与 docs/workspace/，
    //    且带 <base> 的页面基准都汇到 docs/（否则「裸名恒解析到 docs/<name>」这条口径就不成立）
    const pages = htmlPages();
    const badBase = pages.filter((p) => p.hasBase && p.baseDir !== '.');
    assert.deepEqual(badBase.map((p) => `${p.path}（<base> ⇒ 基准 ${p.baseDir}）`), [],
      '<base> 基准不再是 docs/ ——本守卫「裸名恒解析到 docs/<name>」的口径前提已变，须重审判据');
  
    // ③ 已修样本可判：这两个文件此前写的正是裸名（→ 404），现须为 `./workspace/…`
    for (const f of FIXED_SAMPLE_FILES) {
      const bare = extractRenderedRefs(f).filter((r) => classify(r.value).kind === 'bare');
      assert.deepEqual(bare.map((r) => `${r.file}:${r.line} → ${r.value}`), [],
        `已修样本回退为裸文件名（工作台页 <base href="../"> 下会 404）：\n  ${bare.map((r) => `${r.line}:${r.value}`).join('\n  ')}`);
    }
  
    console.log(`[L7] 非空转：js ${files.length}（下限 ${JS_FILE_FLOOR}）· 渲染引用 ${refs.length}（下限 ${RENDER_REF_FLOOR}）`
      + ` · 已修样本 ${FIXED_SAMPLE_FILES.length} 个（无裸名回退）`);
  });

})();

// ═══ 源件 2：page-title-guard.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // page-title-guard.test.mjs — 页题层级守卫（2026-10-21 R5-B F-01 / R5-C C-02）
  //
  // 口径（DESIGN_SYSTEM §3.3.1 / §4.25）：
  //   · H1 = 顶栏品牌（全站唯一）⇒ 每个 tab 的页面标题必须是 H2；
  //   · H2 字号统一 20px（.page-frame__title = 1.25rem）；
  //   · 卡头 / 内嵌面板标题降为 H3，不得再用 H4 + 16px 冒充分区。
  //
  // 本守卫是**静态**结构断言（真机「每个 tab 恰好一个 H2」由 page-sweep 承担）：
  //   P1 能力注册里的每个 tab，其渲染模块自身或共享件必须提供 H2（含 renderTabHeader）；
  //   P2 页题字号单一源 1.25rem，今天页 H2 用 text-xl；
  //   P3 全站源码不得再有 H4 + text-base（16px）的卡头；
  //   P4 七个工作台静态壳不得再输出页题（静态台名已移除，唯一 H2 由页签 renderTabHeader 提供）；
  //   P5 活动/专班详情 H3/H4 顺序合法（H4 不得先于 H3；汇报收件箱的 H4 前先出 H3）；
  //   P6 党委台卡头不复述页签名（「支部上报」只在页签 H2 出现一次）。
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync, readdirSync, existsSync } = await import('node:fs');
  const { join, resolve, relative } = await import('node:path');
  const ROOT = join(import.meta.dirname, '..', '..');
  const SRC = join(ROOT, 'docs', 'src');
  const read = (abs) => readFileSync(abs, 'utf8');
  
  const CAPABILITY_FILES = [
    'docs/src/capabilities/secretary-workspace.js',
    'docs/src/capabilities/org-workspace.js',
    'docs/src/capabilities/disc-workspace.js',
    'docs/src/capabilities/leader-workspace.js',
    'docs/src/capabilities/prop-workspace.js',
    'docs/src/capabilities/visitor-workspace.js',
    'docs/src/capabilities/party-committee-workspace.js',
  ];
  
  /** 七个工作台静态壳：页题 H2 只由页签 renderTabHeader 提供，静态壳不得再占 H2。 */
  const WORKSPACE_SHELLS = ['secretary', 'org', 'prop', 'disc', 'leader', 'visitor', 'party-committee'];
  
  /** 由共享件承担 H2 的渲染模块（登记例外，不是豁免：共享件自身由 P0 校验）。 */
  const SHARED_H2_PROVIDERS = [
    { marker: 'todo-tab-shell', where: 'components/record/todo-tab-shell.js' },
    { marker: 'work-overview', where: 'components/governance/work-overview.js' },
    { marker: 'issue-dispatch-view', where: 'components/feedback/issue-dispatch-view.js' },
    { marker: 'insight-view', where: 'components/record/insight-view.js' },
    { marker: 'today-tab', where: 'entries/tabs/today/today-tab.js' },
    { marker: 'shared/activity-calendar-tab', where: 'entries/tabs/shared/activity-calendar-tab.js' },
  ];
  
  /** 从能力注册行取 tab 的 render import 目标（每个 tab 声明都在首行带 import('…') / loadTabModule('…')）。 */
  function tabModules(capFile) {
    const abs = join(ROOT, capFile);
    const out = [];
    for (const line of read(abs).split('\n')) {
      if (!/\{ id: '[^']+', label: '[^']+'/.test(line)) continue;
      const m = /(?:import|loadTabModule)\('([^']+)'\)/.exec(line);
      if (!m) continue;
      const target = resolve(join(abs, '..'), m[1].split('?')[0]);
      out.push({
        cap: capFile,
        id: /\{ id: '([^']+)'/.exec(line)[1],
        label: /\{ label: '([^']+)'/.exec(line)?.[1] || '',
        target,
      });
    }
    return out;
  }
  
  /** 模块是否提供页题 H2（自身或登记共享件）。 */
  function providesH2(file) {
    const src = read(file);
    if (/<h2\b/.test(src)) return 'self';
    if (/renderTabHeader\s*\(/.test(src)) return 'self';
    for (const p of SHARED_H2_PROVIDERS) {
      if (src.includes(p.marker)) return p.where;
    }
    return null;
  }
  
  test('P0 页题单一源：renderTabHeader 产出 H2，字号 1.25rem', () => {
    const frame = read(join(SRC, 'components/shell/page-frame.js'));
    assert.match(frame, /<h2 class="page-frame__title">/, 'renderTabHeader 必须输出 H2');
    const css = read(join(SRC, 'styles.css'));
    assert.match(css, /\.page-frame__title\s*\{[^}]*font-size:\s*1\.25rem/, '页题 H2 字号须为 1.25rem（20px）');
    const today = read(join(SRC, 'entries/tabs/today/today-tab.js'));
    assert.match(today, /<h2 class="page-frame__title">今天/, '今天页 H2 须复用 .page-frame__title（20px，单一源）');
    assert.doesNotMatch(today, /<h2 class="font-title-cn text-lg/, '今天页 H2 不得再用 18px（text-lg）');
  });
  
  test('P1 每个 tab 的渲染模块都提供 H2（自身或登记共享件）', () => {
    const seen = new Map();
    const missing = [];
    for (const cap of CAPABILITY_FILES) {
      for (const t of tabModules(cap)) {
        if (!existsSync(t.target)) {
          missing.push(`${cap} · ${t.label}：渲染模块不存在 ${relative(ROOT, t.target)}`);
          continue;
        }
        const via = providesH2(t.target);
        if (!via) missing.push(`${cap} · ${t.label}：${relative(ROOT, t.target)} 无 H2 / renderTabHeader / 登记共享件`);
        else seen.set(`${cap}:${t.id}`, via);
      }
    }
    // 2026-10-25 IA 62→45：基线随页签总数改准（原 62 → 45）。
    assert.ok(seen.size >= 45, `页题覆盖数只有 ${seen.size}（基线 45）`);
    assert.deepEqual(missing, [], `以下 tab 缺页级 H2：\n  ${missing.join('\n  ')}`);
  });
  
  test('P2 登记共享件自身必须有 H2', () => {
    for (const p of SHARED_H2_PROVIDERS) {
      const src = read(join(SRC, p.where));
      assert.ok(/<h2\b/.test(src) || /renderTabHeader\s*\(/.test(src), `${p.where} 未提供 H2`);
    }
  });
  
  test('P3 卡头不得再用 H4 + 16px 冒充分区', () => {
    const offenders = [];
    const walk = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) { walk(p); continue; }
        if (!e.name.endsWith('.js')) continue;
        read(p).split('\n').forEach((line, idx) => {
          if (/<h4[^>]*(text-base|text-lg|font-size:\s*1rem)/.test(line)) {
            offenders.push(`${relative(ROOT, p)}:${idx + 1} ${line.trim().slice(0, 100)}`);
          }
        });
      }
    };
    walk(SRC);
    assert.deepEqual(offenders, [], `H4 越级（应改 H3 + 14px）：\n  ${offenders.join('\n  ')}`);
  });
  
  test('P4 工作台静态壳不再输出页题：唯一 H2 由页签 renderTabHeader 提供', () => {
    const offenders = [];
    for (const page of WORKSPACE_SHELLS) {
      const rel = `docs/workspace/${page}.html`;
      const src = read(join(ROOT, rel));
      if (/<h2\b/.test(src)) offenders.push(`${rel}：静态壳仍有 <h2>（静态台名应移除）`);
      if (/page-frame__title/.test(src)) offenders.push(`${rel}：静态壳仍有 .page-frame__title 页题元素`);
      if (!new RegExp(`id="${page}-content"`).test(src)) offenders.push(`${rel}：缺少页签内容容器 #${page}-content`);
    }
    assert.deepEqual(offenders, [], `页题单层被破坏（静态台名与页签 H2 重复）：\n  ${offenders.join('\n  ')}`);
  });
  
  test('P5 活动/专班详情 H3/H4 顺序合法：H4 不得先于 H3，汇报收件箱前先出 H3', () => {
    const src = read(join(SRC, 'entries/pages/activity-entry.js'));
    const firstH3 = src.indexOf('<h3');
    const firstH4 = src.indexOf('<h4');
    assert.ok(firstH3 >= 0, 'activity-entry.js 未找到任何 H3：详情分区标题层级丢失');
    if (firstH4 >= 0) {
      assert.ok(firstH3 < firstH4, 'activity-entry.js 出现 H4 先于 H3（应先出分区 H3，再进卡头 H4）');
    }
    assert.match(src, /renderCardHeader\(\{\s*title:\s*`汇报明细`[\s\S]{0,400}renderReportInboxHtml\(/,
      '汇报收件箱（卡头 H4）前须先出 H3「汇报明细」，不得 H4 先于 H3');
    // 内部语：原始 act-* / tf-* 不再作为正文徽章；只允许出现在复制链接的 title 里。
    assert.doesNotMatch(src, /<span class="text-xs text-gray-500">\$\{(?:act|tf)\.id\}<\/span>/,
      '活动/专班详情不得再把原始 ID 当正文徽章');
    assert.match(src, /title="对象编号 \$\{esc\((?:act|tf)\.id\)\}/, '原始 ID 只应移入复制链接的 title');
  });
  
  test('P6 党委台卡头不复述页签名：支部上报只在页签 H2 出现一次', () => {
    const src = read(join(SRC, 'entries/tabs/party-committee/review-tab.js'));
    assert.match(src, /renderTabHeader\(\{ title: '支部上报'/, '页签 H2 须由 renderTabHeader 提供');
    assert.doesNotMatch(src, /<h3[^>]*>\s*支部上报(?:处理)?\s*<\/h3>/, '卡头 H3 不得逐字复述页签名「支部上报」');
    assert.doesNotMatch(src, /renderSectionHeader\(\{[^}]*支部上报处理/, '「支部上报处理」卡头应降为普通文本或移除');
  });

})();

// ═══ 源件 3：archive-deeplink-guard.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // archive-deeplink-guard.test.mjs — 归档深链 / 复盘落点守卫（2026-10-24 · 批次 508）
  //
  // 为什么要有本守卫：
  //   · 归档库此前不读 URL 参数：外部深链 `archive.html?tab=taskforce&id=…` 一律落回
  //     「党建活动」且不打开详情；材料页深链 `focusActivityId` 命中折叠区时只滚动不展开，
  //     表现为「点了没反应」。活动详情「复盘」也曾指向人才库 / 归档页签（不是复盘承载面）。
  //   · 判据：
  //       D1 非空转：三个入口文件 + detail-anchor.js 都可读
  //       D2 archive-entry.js 读 URLSearchParams 的 tab 与 id，tab 值域含 activity/taskforce/notice
  //       D3 prop/archive-tab.js 命中 focusActivityId 时先展开 archive-display-fold，
  //          定位失败必须 showToast（不得静默）
  //       D4 activity-entry.js 的「复盘」不得再指向 tab=talent / tab=archive
  //       D5 detail-anchor.js 必须逐级展开父链 <details>，不可见时返回 false
  //   · 口径调整（据实况，不删断言）：
  //       D5 的「逐级打开 closest('details')」以**行为**判定——现有实现用 parentElement 链
  //       逐级置 `node.open = true`（等价且更早于 closest），因此同时接受
  //       `closest('details')` 或 `tagName === 'DETAILS'` 的逐级实现。
  // 运行：node --test server/test/archive-deeplink-guard.test.mjs
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync, existsSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const HERE = dirname(fileURLToPath(import.meta.url));
  const ROOT = join(HERE, '..', '..');
  const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
  
  const ARCHIVE_ENTRY = 'docs/src/entries/pages/archive-entry.js';
  const ARCHIVE_TAB = 'docs/src/entries/tabs/prop/archive-tab.js';
  const ACTIVITY_ENTRY = 'docs/src/entries/pages/activity-entry.js';
  const DETAIL_ANCHOR = 'docs/src/components/ui/detail-anchor.js';
  
  /** 取以 needle 开头的 `{ ... }` 块内部文本（大括号配对） */
  function blockStartingAt(src, needle) {
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
  
  /** 取 `function name(...) { ... }` 的函数体（先越过参数表的右括号，避免默认参数 `{}` 误判） */
  function functionBody(src, name) {
    const i = src.indexOf(`function ${name}(`);
    if (i < 0) return '';
    const paren = src.indexOf(')', i);
    if (paren < 0) return '';
    const start = src.indexOf('{', paren);
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
  
  test('D1 非空转：归档入口 / 归档页签 / 活动详情 / 定位工具四个文件都可读', () => {
    for (const rel of [ARCHIVE_ENTRY, ARCHIVE_TAB, ACTIVITY_ENTRY, DETAIL_ANCHOR]) {
      const abs = join(ROOT, rel);
      assert.ok(existsSync(abs), `缺少文件：${rel}`);
      const src = readFileSync(abs, 'utf8');
      assert.ok(src.length > 500, `${rel} 内容过短（${src.length} 字符）：可能读错文件`);
    }
  });
  
  test('D2 archive-entry.js：读 URLSearchParams 的 tab 与 id，tab 值域含三页签', () => {
    const src = read(ARCHIVE_ENTRY);
    assert.match(src, /new URLSearchParams\(/, 'archive-entry.js 未读取 URL 参数（深链全部落回默认页签）');
    assert.match(src, /\.get\(\s*['"]tab['"]\s*\)/, 'archive-entry.js 未读取 ?tab=');
    assert.match(src, /\.get\(\s*['"]id['"]\s*\)/, 'archive-entry.js 未读取 ?id=');
  
    const tabs = /const ARCHIVE_TABS\s*=\s*\[([\s\S]*?)\];/.exec(src)?.[1] || '';
    assert.ok(tabs, 'archive-entry.js 缺少 ARCHIVE_TABS 声明');
    const ids = [...tabs.matchAll(/id:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
    // 期望更新（Task 3 · 2026-10-25）：`?tab=notice` 退役——通知已有唯一列表与「已归档」筛选，
    //   归档页只留活动、专班两栏；旧深链在前端重定向到 messages.html?filter=archived。
    assert.deepEqual([...ids].sort(), ['activity', 'taskforce'],
      `归档页签值域应恰为 activity/taskforce，实际：${ids.join('/')}`);
    // Task 3：旧深链必须重定向到消息中心「已归档」，不得静默落回活动页签。
    assert.match(src, /messages\.html\?filter=archived/, 'archive-entry.js 未把 ?tab=notice 重定向到消息中心已归档');
  
    // 合法 tab 才切换（非法值回落 activity）
    assert.match(src, /ARCHIVE_TABS\.some\([^)]*_tabParam[^)]*\)/, 'archive-entry.js 未校验 tab 值域（非法值应回落 activity）');
    // 首帧渲染后按 id 打开详情
    assert.match(src, /_openArchivedDetail\(\s*_focusArchiveId\s*\)/, 'archive-entry.js 未在首帧渲染后按 ?id= 打开详情');
  });
  
  test('D3 prop/archive-tab.js：命中 focusActivityId 先展开折叠区，定位失败必须 showToast', () => {
    const src = read(ARCHIVE_TAB);
    const block = blockStartingAt(src, 'if (ctx?.focusActivityId)');
    assert.ok(block, 'archive-tab.js 缺少 `if (ctx?.focusActivityId)` 深链分支');
  
    const foldAt = block.indexOf('archive-display-fold');
    const openAt = block.search(/\.open\s*=\s*true/);
    const focusAt = block.indexOf('focusActivityAnchor');
    assert.ok(foldAt >= 0, '深链分支未定位 archive-display-fold（折叠区不展开则必然滚不动）');
    assert.ok(openAt >= 0, '深链分支未设置 fold.open = true');
    assert.ok(focusAt >= 0, '深链分支未调用 focusActivityAnchor');
    assert.ok(foldAt < focusAt, '必须先展开 archive-display-fold，再执行 focusActivityAnchor');
    assert.ok(openAt < focusAt, '必须先设置 fold.open = true，再执行 focusActivityAnchor');
  
    const failAt = block.indexOf('!focusActivityAnchor');
    assert.ok(failAt >= 0, '未判 focusActivityAnchor 的 false 返回（定位失败会被静默吞掉）');
    const after = block.slice(failAt);
    assert.match(after, /showToast\s*\(/, '定位失败必须 showToast 明确提示（不得静默）');
  });
  
  test('D4 activity-entry.js：复盘不得再指向 tab=talent / tab=archive', () => {
    const src = read(ACTIVITY_ENTRY);
    assert.doesNotMatch(src, /tab=talent/, '活动详情「复盘」仍指向 tab=talent（人才库不是复盘承载面）');
    assert.doesNotMatch(src, /tab=archive/, '活动详情「复盘」仍指向 tab=archive（归档不是复盘承载面）');
  
    const map = /const reviewHrefOf\s*=\s*\{([\s\S]*?)\}\s*\[role\]/.exec(src)?.[1] || '';
    assert.ok(map, 'activity-entry.js 缺少 reviewHrefOf 角色落点表');
    assert.match(map, /'disc-commissioner':\s*'workspace\/disc\.html\?tab=review'/,
      '纪检委员的复盘落点应为 disc 工作台复盘页签');
    assert.match(map, /'participant':\s*'workspace\/visitor\.html\?tab=growth&section=review'/,
      '普通参与者的复盘落点应为成员台「我的成长 · 复盘子区」（2026-10-25 IA 62→45）');
    assert.match(src, /label:\s*'复盘'[\s\S]{0,160}focusActivityId=/, '复盘入口应携带 focusActivityId 深链参数');
  });
  
  test('D5 detail-anchor.js：逐级展开父链 <details>，不可见时返回 false', () => {
    const src = read(DETAIL_ANCHOR);
  
    const closestImpl = /closest\(\s*['"]details['"]\s*\)/.test(src);
    const walkImpl = /tagName\s*===\s*['"]DETAILS['"]/.test(src) && /\.open\s*=\s*true/.test(src);
    assert.ok(closestImpl || walkImpl,
      'detail-anchor.js 未逐级展开父链 <details>（折叠区内定位必然失败）');
    if (closestImpl) {
      assert.match(src, /\.open\s*=\s*true/, 'closest(details) 后必须置 open = true');
    }
  
    assert.match(src, /offsetParent\s*===\s*null/, '缺少可见性判定（offsetParent === null 应视为不可见）');
    assert.match(src, /rect\.width\s*>\s*0\s*&&\s*rect\.height\s*>\s*0/,
      '可见性判定应同时核对宽高 > 0（仅 offsetParent 不够）');
  
    // 滚动函数：布局不可见 → false
    const scrollBlock = functionBody(src, 'scrollDetailIntoView');
    assert.ok(scrollBlock, '缺少 scrollDetailIntoView');
    assert.match(scrollBlock, /if\s*\(!el\)\s*return\s+false;/, 'scrollDetailIntoView 缺空目标 false');
    assert.match(scrollBlock, /if\s*\(!_hasLayout\(el\)\)\s*return\s+false;/, 'scrollDetailIntoView 不可见时必须返回 false');
  
    // 深链定位：滚动失败 → false（交给调用方 showToast）
    const focusBlock = functionBody(src, 'focusActivityAnchor');
    assert.ok(focusBlock, '缺少 focusActivityAnchor');
    assert.match(focusBlock, /if\s*\(!scrollDetailIntoView\([^)]*\)\)\s*return\s+false;/,
      'focusActivityAnchor 定位失败时必须返回 false（不得静默成功）');
  });

})();

// ═══ 源件 4：notice-deeplink-guard.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // ════════════════════════════════════════════════════════════════
  //  notice-deeplink-guard.test.mjs — 通知与深链 navTarget 守卫
  //  IA 修复 Task 3（F01–F07 / F12 · 2026-10-20）
  //
  //  根因：工作台壳（components/shell/workspace-shell.js）在首个渲染前把 `?tab=` / `?highlight=`
  //  读进 `_navTarget` 并**清掉 URL 参数**，再经 `ctx.navTarget` 下发给 tab。tab 内再读
  //  `location.search` 永远为空 ⇒ 通知深链失效（F01/F02/F03/F07 同一根因）。
  //
  //  本件锁死：
  //    · F01 党委 review 深链必须读 `ctx.navTarget.hl`，定位失败页内可见提示；
  //    · F02 思想汇报改落独立详情页 `thought-report.html?id=`（不再有 tab=thought-review 深链）；
  //    · F03 成员变更通知的 highlight 有 DOM 锚点（data-mc-request-id）且待办壳消费 navTarget；
  //    · F04 成员变更通知只发支书/副支书（audience + actionRoles）；
  //    · F05 作废裁决按接收人角色生成本位工作台落点；
  //    · F06 `targetType+targetId` 优先、`targetUrl` 仅兜底（模板头注与消费端同源）；
  //    · F07 只有 `workspace/*.html` 拼 `tab=todo`，`index.html` 不带 tab；待办页消费 highlight；
  //    · F12 跨台落点按接收人角色生成，不得保留其他角色台的写死落点。
  //
  //  运行：node --test test/notice-deeplink-guard.test.mjs（server 目录）
  // ════════════════════════════════════════════════════════════════
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync, existsSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { buildSystemNotice, SYSTEM_NOTICE_KIND_NAMES } = await import('../../docs/src/core/domain/system-notice-templates.js?v=20261120a');
  const ROOT = join(import.meta.dirname, '..', '..');
  const read = (...parts) => readFileSync(join(ROOT, ...parts), 'utf8');
  
  const TEMPLATES = read('docs/src/core/domain/system-notice-templates.js');
  const REVIEW_TAB = read('docs/src/entries/tabs/party-committee/review-tab.js');
  const TODO_SHELL = read('docs/src/components/record/todo-tab-shell.js');
  const NOTICE_SVC = read('docs/src/services/governance/notice.js');
  const NOTICE_VIEW = read('docs/src/components/governance/notice-view.js');
  const NOTICE_ENTRY = read('docs/src/entries/pages/notice-entry.js');
  const HEADER = read('docs/src/components/shell/header.js');
  const ARCHIVE_ENTRY = read('docs/src/entries/pages/archive-entry.js');
  const TODO_JUMP = read('docs/src/components/record/todo-jump.js');
  const TODAY_TAB = read('docs/src/entries/tabs/today/today-tab.js');
  const MEMBER_PANEL = read('docs/src/components/governance/member-change-panel.js');
  const AUTH = read('docs/src/services/core/auth.js');
  
  /** 去掉整行注释后的模板源码（F12 的角色页清单只看真实落点，不看注释里的历史值） */
  const TEMPLATE_CODE = TEMPLATES.split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
  
  /** 页面 → 能力注册文件名（targetUrl 的 tab 必须在该页能力注册内） */
  const CAP_BY_PAGE = {
    'secretary.html': 'secretary-workspace.js',
    'org.html': 'org-workspace.js',
    'prop.html': 'prop-workspace.js',
    'disc.html': 'disc-workspace.js',
    'leader.html': 'leader-workspace.js',
    'visitor.html': 'visitor-workspace.js',
    'party-committee.html': 'party-committee-workspace.js',
  };
  
  // ── F01 / F02 / F03：壳清参后必须消费 ctx.navTarget.hl ─────────────
  test('F01–F03 深链消费：review / todo 均读 ctx.navTarget.hl，失败可见', () => {
    // F01：党委 review tab —— URL 读取保留为兜底，但主通道必须是 navTarget
    assert.match(REVIEW_TAB, /navTarget\?\.hl/, 'review-tab 必须消费 ctx.navTarget.hl（壳已清 URL）');
    assert.match(REVIEW_TAB, /未找到该上报（可能已处理）/, 'review-tab 定位失败须页内可见提示');
  
    // F03/F07：待办壳 —— 同一根因，按 groupKey / 条目 id 定位，失败可见
    assert.match(TODO_SHELL, /navTarget\?\.hl/, 'todo-tab-shell 必须消费 ctx.navTarget.hl');
    assert.match(TODO_SHELL, /data-mc-request-id/, '待办壳须按成员变更申请 id 定位');
    assert.match(TODO_SHELL, /未找到该待办（可能已处理）/, '待办壳定位失败须页内可见提示');
    assert.match(MEMBER_PANEL, /data-mc-request-id="\$\{esc\(r\.id\)\}"/, '成员变更批量行须带 data-mc-request-id 锚点');
  
    // F02：思想汇报不再有 tab 内深链（单一承载面 = 详情页）
    assert.doesNotMatch(TEMPLATE_CODE, /tab=thought-review&highlight/, 'F02：思想汇报不得再落 tab=thought-review&highlight');
  
    // 模板里保留的 tab+highlight 深链，必须有对应消费断言（否则就是新的死链）
    if (/tab=review&highlight/.test(TEMPLATE_CODE)) {
      assert.match(REVIEW_TAB, /navTarget\?\.hl/, 'tab=review&highlight 必须由 review-tab 消费');
    }
    if (/tab=todo&highlight/.test(TEMPLATE_CODE)) {
      assert.match(TODO_SHELL, /navTarget\?\.hl/, 'tab=todo&highlight 必须由 todo-tab-shell 消费');
    }
  });
  
  // ── F02 / F12：每个静态 targetUrl 的页面与 tab 必须真实存在 ─────────
  test('F02/F12 targetUrl 守卫：page 存在于 docs/，tab 存在于该角色能力注册', () => {
    const urls = [...TEMPLATES.matchAll(/targetUrl:\s*(`|')([^`']+)\1/g)].map((m) => m[2]);
    assert.ok(urls.length > 0, '至少应能解析出静态 targetUrl');
    for (const raw of urls) {
      const page = raw.split('?')[0];
      if (page.includes('${')) continue; // 页面本身动态生成（如 workspacePageOf 产物）
      assert.ok(existsSync(join(ROOT, 'docs', page)), `targetUrl 页面不存在：${page}`);
      const tab = (raw.match(/[?&]tab=([a-z-]+)/) || [])[1];
      if (!tab) continue;
      const capFile = CAP_BY_PAGE[page.split('/').pop()];
      assert.ok(capFile, `未登记 ${page} 的能力注册`);
      const cap = read('docs/src/capabilities', capFile);
      assert.match(cap, new RegExp(`id:\\s*'${tab}'`), `${page} 的能力注册没有 tab=${tab}`);
    }
  });
  
  // ── F06：targetType+targetId 优先，targetUrl 仅兜底；入口统一先落全貌页 ─────
  test('F06 优先级与入口收口：非公告必须有坐标；所有通知入口先落 notice.html?id=', () => {
    assert.match(TEMPLATES, /targetType\+targetId 优先/, '模板文件头须声明优先契约');
    assert.match(TEMPLATES, /targetUrl.*兜底/, '模板文件头须声明 targetUrl 仅兜底');
  
    // Task 3（2026-10-25）：非公告（系统通知）必须有 targetType + targetId。
    // 期望更新：原 F06 只断言「有 targetUrl 时优先 targetType」，未要求每类系统通知都带坐标；
    //   现按消息对象模型逐 kind 构建，断言 kind='system' 且坐标齐全（缺坐标者写入侧会降级为公告）。
    const vars = {
      sourceId: 'obj-1', targetType: 'activity', targetId: 'obj-1', title: 't', content: 'c',
      personId: 'p-1', personName: '张三', activityTitle: '活动', activity: '活动',
      branchLabel: '支部', subject: '事项', submitterName: '李四', decision: 'confirmed',
      receiverRole: 'secretary', targetPage: 'workspace/visitor.html',
      removedPersonId: 'p-1', projectName: '项目', fromName: '甲', toName: '乙',
      actorRole: 'secretary', todoTitle: '待办', label: '记录', resource: 'activities',
    };
    for (const kind of SYSTEM_NOTICE_KIND_NAMES) {
      const n = buildSystemNotice(kind, vars);
      assert.equal(n.kind, 'system', `${kind} 的系统通知 kind 必须为 system`);
      assert.ok(n.targetType && n.targetId, `${kind} 的系统通知缺 targetType/targetId（非公告必须有坐标）`);
    }
  
    // Task 6（2026-10-25 批次 510）：`resolveNoticeUrl` 的页面级兜底与 direct 直跳已退役，且全仓无消费者
    //   ⇒ 导出本身就是死码（Q-14）。坐标优先契约改由「模板声明 + 详情页对象卡」承担。
    assert.doesNotMatch(NOTICE_SVC, /export function resolveNoticeUrl/,
      'Q-14：resolveNoticeUrl 已无消费者，不得再保留导出（页面级兜底随统一消息中心退役）');
    assert.match(NOTICE_ENTRY, /const type = n\.targetType;/, '消息详情页必须消费 targetType');
    assert.match(NOTICE_ENTRY, /const id = n\.targetId;/, '消息详情页必须消费 targetId');
  
    // Task 3：所有通知入口统一先落全貌页；direct 直跳与页面级兜底已退役。
    for (const [name, src] of [['header.js', HEADER], ['notice-view.js', NOTICE_VIEW]]) {
      assert.doesNotMatch(src, /resolveNoticeUrl\s*\(/, `${name} 不得再走通知 direct 直跳`);
      assert.doesNotMatch(src, /dest\.direct/, `${name} 不得再判 direct 分支`);
      assert.match(src, /notice\.html\?id=/, `${name} 的通知行必须以 notice.html?id= 为落点`);
    }
    // 铃铛 = 未读全量可滚动，不再按 DASHBOARD_LIMITS 裁剪（容器自行滚动）。
    assert.doesNotMatch(HEADER, /DASHBOARD_LIMITS\.notices/, 'header 不得再把铃铛列表裁到固定条数');
    assert.match(HEADER, /messages\.html\?filter=unread/, '铃铛底部「查看全部」应进消息中心未读');
    assert.doesNotMatch(ARCHIVE_ENTRY, /renderNoticeArchive/, '归档库不得再保留通知列表（第二入口）');
    assert.doesNotMatch(ARCHIVE_ENTRY, /resolveNoticeUrl/, '归档库不得再解析通知落点');
    assert.match(TODO_JUMP, /resolveDocumentUrl\('notice\.html'/, '通知类待办必须回消息详情');
    assert.match(TODAY_TAB, /resolveDocumentUrl\('notice\.html'/, '今天页未读通知必须回消息详情');
    assert.doesNotMatch(TODAY_TAB, /resolveNoticeUrl\s*\(/, '今天页不得再走通知 direct 直跳');
    assert.doesNotMatch(TODAY_TAB, /NoticeStore\.markRead\(noticeId\)/, '今天页不得在导航前预写已读');
  
    // 不得再出现「写了 targetUrl 却永不生效」的死链
    assert.doesNotMatch(TEMPLATE_CODE, /targetUrl:\s*'workspace\/leader\.html'/, 'F06：targetType 在前的模板不得再写死 leader 台');
    assert.doesNotMatch(TEMPLATE_CODE, /targetUrl:\s*'workspace\/secretary\.html\?tab=work-map'/, 'F06：activity 类型的 targetUrl 永不生效');
    assert.doesNotMatch(TEMPLATE_CODE, /targetUrl:\s*'workspace\/visitor\.html'/, 'F06：activity/taskforce 类型的固定 visitor 台死链');
  });
  
  // ── F04：成员变更通知只发支书/副支书 ────────────────────────────────
  test('F04 成员变更通知：audience + actionRoles 均锁定支书/副支书，不广播', () => {
    const n = buildSystemNotice('member-change-approved', {
      sourceId: 'mcr-1', personName: '张三', fromStage: '积极分子', toStage: '发展对象', activityTitle: '支委会',
    });
    assert.deepEqual(n.audience, ['secretary', 'deputy-secretary'], '受众只能是支书/副支书');
    assert.deepEqual(n.actionRoles, ['secretary', 'deputy-secretary'], '行动角色只能是支书/副支书');
    assert.equal(n.actionable, undefined, '不设 actionable（确认动作在待办组，不重复派生阅读待办）');
    assert.match(TEMPLATES, /'member-change-approved':[\s\S]*?audience: SECRETARY_AND_DEPUTY_ROLES/);
    assert.match(TEMPLATES, /'member-change-approved':[\s\S]*?actionRoles: SECRETARY_AND_DEPUTY_ROLES/);
  });
  
  // ── F05：作废裁决按接收人角色落本位工作台 ───────────────────────────
  test('F05 作废裁决落点：按接收人角色生成本位工作台（不再固定支书台）', () => {
    const cases = [
      ['secretary', 'workspace/secretary.html?tab=todo'],
      ['deputy-secretary', 'workspace/secretary.html?tab=todo'],
      ['org-commissioner', 'workspace/org.html?tab=todo'],
      ['prop-commissioner', 'workspace/prop.html?tab=todo'],
      ['disc-commissioner', 'workspace/disc.html?tab=todo'],
      ['leader', 'workspace/leader.html?tab=todo'],
      ['visitor', 'workspace/visitor.html?tab=todo'],
    ];
    for (const [role, url] of cases) {
      const n = buildSystemNotice('todo-void-decided', {
        sourceId: 'todo-1', todoTitle: '待办', decision: 'confirmed', reason: '重复派生', role,
      });
      assert.equal(n.targetUrl, url, `${role} 的裁决知会应落本位工作台`);
    }
    // 无角色信息时兜底支书台（不产生非法 URL）
    const fallback = buildSystemNotice('todo-void-decided', {
      sourceId: 'todo-2', todoTitle: '待办', decision: 'rejected', reason: '',
    });
    assert.equal(fallback.targetUrl, 'workspace/secretary.html?tab=todo', '无角色信息时兜底支书台');
  });
  
  // ── F07：只有 workspace/*.html 拼 tab=todo；待办壳消费 highlight ─────
  test('F07 待办深链：workspace/* 才拼 tab=todo，index.html 不带 tab；highlight 有消费', () => {
    assert.match(TODO_SHELL, /page\.startsWith\('workspace\/'\)/, '催办落点须按 workspace 前缀分流');
    assert.doesNotMatch(TODO_SHELL, /\$\{page\}\?tab=todo&highlight=/, '不得对所有页面统一拼 tab=todo（index.html 会成假深链）');
    assert.match(TODO_SHELL, /_resolveNavHighlightId/, '待办壳须有 highlight 读取实现');
    assert.match(TODO_SHELL, /navTarget\?\.hl/, '读取必须优先 ctx.navTarget.hl');
  });
  
  // ── F12：跨台落点按接收人角色生成 ──────────────────────────────────
  test('F12 跨台落点：不得保留其他角色台的写死 URL；动态落点按接收人角色派生', () => {
    const rolePages = [...TEMPLATE_CODE.matchAll(/workspace\/([a-z-]+)\.html/g)].map((m) => m[1]);
    // 允许保留的只有「受众/动作角色本身就是该页角色」或「无角色信息时的支书台兜底」
    const allowed = new Set(['secretary', 'visitor', 'party-committee']);
    for (const page of rolePages) {
      assert.ok(allowed.has(page), `未按角色收口的跨台落点：workspace/${page}.html`);
    }
    // 外部外发：按 receiverRole 生成；作废裁决：按 targetRole 生成
    assert.match(TEMPLATES, /workspacePageOf\(receiverRole\)/, '外发通知落点须按接收人角色生成');
    assert.match(TEMPLATES, /workspacePageOf\(targetRole\)/, '作废裁决落点须按接收人角色生成');
    // 赋权通知：接收人本位页由 ROLE_PAGE_MAP 派生（不再「非组长一律 visitor」）
    assert.match(AUTH, /ROLE_PAGE_MAP\.workspace\[person\?\.role\]/, '赋权通知落点须按接收人角色派生');
    // 补课提醒：当事人角色本位（成员台仍落「考勤概况」，其他角色不弹回）
    const makeupMember = buildSystemNotice('makeup-remind', {
      sourceId: 'mk-1', personId: '2400012347', activityName: '活动', deadline: '2026-10-30', role: 'participant',
    });
    assert.equal(makeupMember.targetUrl, 'workspace/visitor.html?tab=attendance', '成员补课落考勤概况');
    const makeupSecretary = buildSystemNotice('makeup-remind', {
      sourceId: 'mk-2', personId: '2300010001', activityName: '活动', deadline: '2026-10-30', role: 'secretary',
    });
    assert.equal(makeupSecretary.targetUrl, 'workspace/secretary.html', '其他角色落本台，不弹回成员台');
  });

})();

// ═══ 源件 5：ui-home-deeplink.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // ui-home-deeplink.test.mjs — 首页「完整日历 / 查看全部」深链守卫（2026-10-18 · Spec Task 8）
  //
  // 判据：
  //   D1 首页两个入口均带 data-ws-tab（深链协议仍在，不是裸 href）；
  //   D2 每台解析后的目标页签（data-ws-tab-<page> 覆盖 data-ws-tab）必须命中该台注册 tab id；
  //   D3 「完整日历」＝各台真实日历页签：支书/组织/宣传/纪检/组长 → calendar；成员台无独立日历页签
  //      → activities（＋subview=calendar）；党委台无日历页签 → 最近的 branches（支部管理；A05 已撤 monitor）；
  //   D4 「查看全部」＝真实工作组页签：组织台 → taskforce；宣传台 → kanban；支书/成员 → tf-view；
  //      纪检/组长 → taskforce.html（`TASKFORCE_HREF` 覆盖，页签已删/不再出专班段）；党委台 → branches；
  //   D5 不再出现「不存在的 tab=activities / tab=taskforce」——activities 只允许成员台、taskforce 只允许组织台；
  //   D6 main-entry.js 确实按角色消费 data-ws-tab-<page>，且 subview 只在 activities 上附加；
  //   D7 版本戳保持 20261018i（本批不升版本）。
  const test = (await import('node:test')).default;
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const INDEX = join(ROOT, 'docs', 'index.html');
  const MAIN_ENTRY = join(ROOT, 'docs', 'src', 'entries', 'pages', 'main-entry.js');
  const CAP_DIR = join(ROOT, 'docs', 'src', 'capabilities');
  
  // 首页链接可能落到的全部工作台页（与 ROLE_PAGE_MAP 对齐；党委台无支部内页签，另作最近可用映射）
  const PAGE_CAPS = {
    secretary: 'secretary-workspace.js',
    org: 'org-workspace.js',
    prop: 'prop-workspace.js',
    disc: 'disc-workspace.js',
    leader: 'leader-workspace.js',
    visitor: 'visitor-workspace.js',
    'party-committee': 'party-committee-workspace.js',
  };
  const SIX_BRANCH_PAGES = ['secretary', 'org', 'prop', 'disc', 'leader', 'visitor'];
  
  const TAB_ID_RE = /^\s*\{\s*id:\s*'([^']+)'/gm;
  
  function tabIdsOf(file) {
    const src = readFileSync(join(CAP_DIR, file), 'utf8');
    return new Set([...src.matchAll(TAB_ID_RE)].map((m) => m[1]));
  }
  
  const REGISTERED = Object.fromEntries(
    Object.entries(PAGE_CAPS).map(([page, file]) => [page, tabIdsOf(file)]),
  );
  
  /** data-ws-tab-party-committee → PartyCommittee（与 main-entry.js 的解析规则一致） */
  function camelPage(page) {
    return page.replace(/(^|-)([a-z])/g, (_, _sep, ch) => ch.toUpperCase());
  }
  
  /** 解析 index.html 中所有带 data-ws-tab* 的锚点 */
  function deeplinkAnchors() {
    const html = readFileSync(INDEX, 'utf8');
    const out = [];
    for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
      const attrs = {};
      for (const a of m[1].matchAll(/\bdata-ws-([\w-]+)(?:="([^"]*)")?/g)) {
        attrs[a[1]] = a[2] ?? '';
      }
      if (attrs.tab === undefined) continue;
      out.push({
        text: m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
        attrs,
      });
    }
    return out;
  }
  
  /** 该台实际会被写入 ?tab= 的值：优先 data-ws-tab-<page>，否则 data-ws-tab */
  function targetTabFor(anchor, page) {
    return anchor.attrs[`tab-${page}`] ?? anchor.attrs.tab;
  }
  
  const anchors = deeplinkAnchors();
  const calendarLink = anchors.find((a) => a.text.includes('完整日历'));
  const TASKFORCE_LIST = join(ROOT, 'docs', 'src', 'components', 'dashboard', 'taskforce-list.js');
  
  test('D1 首页「完整日历」走 data-ws-tab 深链；工作组「查看全部」由分组组件生成', () => {
    assert.ok(calendarLink, 'index.html 未找到「完整日历 →」');
    assert.equal(calendarLink.attrs.tab, 'calendar', '「完整日历」默认页签应为 calendar');
  
    const src = readFileSync(TASKFORCE_LIST, 'utf8');
    assert.match(src, /查看全部 →/, '工作组组头应生成「查看全部 →」');
    assert.match(src, /_viewAllHref\(section\.kind\)/, '查看全部应按「活动 / 专班」两类分组分别落地');
    assert.match(src, /const ACTIVITY_TAB = \{/, '缺活动工作组页签映射');
    assert.match(src, /const TASKFORCE_HREF = \{/, '缺专班详情页覆盖映射');
    assert.match(src, /const TASKFORCE_TAB = \{/, '缺专班工作组页签映射');
  });
  
  test('D2 首页「完整日历」每台解析后的目标页签都命中该台注册 tab id', () => {
    for (const page of Object.keys(PAGE_CAPS)) {
      const target = targetTabFor(calendarLink, page);
      assert.ok(target, `完整日历在 ${page} 台解析出的页签为空`);
      assert.ok(
        REGISTERED[page].has(target),
        `完整日历在 ${page} 台落到不存在的 tab="${target}"；该台注册页签：${[...REGISTERED[page]].join(', ')}`,
      );
    }
  });
  
  test('D3 「完整日历」落各台真实落点（2026-10-25 IA 62→45 改准）', () => {
    for (const page of SIX_BRANCH_PAGES) {
      // 支书台仍为活动管理；org/prop/disc/leader 的活动日历页签已降为工作概况页内折叠卡；成员台为活动动态。
      const expected = page === 'visitor' ? 'activities' : (page === 'secretary' ? 'calendar' : 'overview');
      assert.equal(
        targetTabFor(calendarLink, page),
        expected,
        `「完整日历」在 ${page} 台应落 ${expected}`,
      );
    }
    // 降级四台必须带页内落点参数（section=calendar），否则只会落在工作概况顶部、看不见日历卡。
    for (const page of ['org', 'prop', 'disc', 'leader']) {
      assert.equal(
        calendarLink.attrs[`section-${page}`],
        'calendar',
        `${page} 台「完整日历」须带 data-ws-section-${page}="calendar"`,
      );
    }
    // 成员台无独立日历页签：activities + subview=calendar（日历视图）
    assert.equal(calendarLink.attrs.view, 'calendar', '「完整日历」缺少 data-ws-view="calendar"');
    assert.equal(targetTabFor(calendarLink, 'visitor'), 'activities', '成员台应落活动动态的日历视图');
    assert.equal(
      targetTabFor(calendarLink, 'party-committee'),
      'branches',
      '党委台无日历页签，应落到最近的支部管理（A05 已撤支部动态）',
    );
  });
  
  /** 从 taskforce-list.js 读取角色映射（源即单一实现，不在测试里再写第二份） */
  function roleMapOf(name) {
    const src = readFileSync(TASKFORCE_LIST, 'utf8');
    const block = src.match(new RegExp(`const ${name} = \\{([\\s\\S]*?)\\};`));
    assert.ok(block, `taskforce-list.js 缺 ${name}`);
    const out = {};
    for (const m of block[1].matchAll(/(?:'([\w-]+)'|(\w+)):\s*'([^']+)'/g)) {
      out[m[1] || m[2]] = m[3];
    }
    return out;
  }
  
  const ROLE_PAGE = roleMapOf('ROLE_PAGE');
  const ACTIVITY_TAB = roleMapOf('ACTIVITY_TAB');
  const TASKFORCE_TAB = roleMapOf('TASKFORCE_TAB');
  const TASKFORCE_HREF = roleMapOf('TASKFORCE_HREF');
  const ROLE_TO_PAGE_KEY = {
    secretary: 'secretary',
    'deputy-secretary': 'secretary',
    'org-commissioner': 'org',
    'prop-commissioner': 'prop',
    'disc-commissioner': 'disc',
    leader: 'leader',
    participant: 'visitor',
    'party-staff': 'party-committee',
  };
  
  test('D4 工作组「查看全部」按活动 / 专班两类分别落到真实页签或详情页', () => {
    for (const role of Object.keys(ROLE_PAGE)) {
      const pageKey = ROLE_TO_PAGE_KEY[role];
      assert.ok(pageKey, `未登记角色 ${role} 的页面键`);
      const activityTab = ACTIVITY_TAB[role];
      const taskforceTab = TASKFORCE_TAB[role];
      assert.ok(activityTab, `${role} 缺活动工作组目标页签`);
      assert.ok(REGISTERED[pageKey].has(activityTab),
        `${role} 活动工作组落到不存在的 tab="${activityTab}"（${pageKey}）`);
      // 纪检/组长：专班「查看全部」走 taskforce.html 覆盖（页签已删/不再出专班段）⇒ 不再要求页签存在。
      const taskforceHref = TASKFORCE_HREF[role];
      if (taskforceHref) {
        assert.match(taskforceHref, /^taskforce\.html$/, `${role} 专班「查看全部」应落专班详情页`);
      } else {
        assert.ok(taskforceTab, `${role} 缺专班工作组目标页签`);
        assert.ok(REGISTERED[pageKey].has(taskforceTab),
          `${role} 专班工作组落到不存在的 tab="${taskforceTab}"（${pageKey}）`);
      }
    }
    // 抽样（2026-10-25 IA 62→45 改准）：成员台活动→activities、支书→calendar；组织台专班→taskforce；
    //   宣传→kanban；纪检/组长→详情页覆盖；党委两台均→branches。
    assert.equal(ACTIVITY_TAB.participant, 'activities');
    assert.equal(ACTIVITY_TAB.secretary, 'calendar');
    assert.equal(ACTIVITY_TAB['party-staff'], 'branches', '党委台活动工作组应落支部管理');
    assert.equal(TASKFORCE_TAB['org-commissioner'], 'taskforce');
    // 支书「知情查看」页签已并入全局概况页内卡；成员「专班动态」已并入项目分工「专班」区。
    assert.equal(TASKFORCE_TAB.secretary, 'overview', '支书专班工作组应落工作概况（页内知情卡）');
    assert.equal(TASKFORCE_TAB.participant, 'projects', '成员专班工作组应落项目分工「专班」区');
    assert.equal(TASKFORCE_TAB['prop-commissioner'], 'kanban', '宣传专班工作组应落项目看板');
    assert.equal(TASKFORCE_TAB['party-staff'], 'branches', '党委台应落支部管理');
    assert.deepEqual(Object.keys(TASKFORCE_HREF).sort(), ['disc-commissioner', 'leader'],
      '只有纪检/组长需要 taskforce.html 覆盖');
    // 页内落点：activity 在降级四台带 section=calendar；taskforce 在支书/成员带 section。
    const src = readFileSync(TASKFORCE_LIST, 'utf8');
    assert.match(src, /const ACTIVITY_SECTION = \{/, '缺活动日历页内落点映射');
    assert.match(src, /const TASKFORCE_SECTION = \{/, '缺专班页内落点映射');
  });
  
  test('D5 不再出现不存在的 tab=activities / tab=taskforce', () => {
    // 默认（未覆盖）值不得是 activities——成员台以外的台没有该 id
    assert.notEqual(calendarLink.attrs.tab, 'activities', '「完整日历」默认值不得写 activities');
    for (const page of Object.keys(PAGE_CAPS)) {
      const target = targetTabFor(calendarLink, page);
      if (page !== 'visitor') {
        assert.notEqual(target, 'activities', `${page} 台没有 activities 页签，不得落 tab=activities`);
      }
      if (page !== 'org') {
        assert.notEqual(target, 'taskforce', `${page} 台没有 taskforce 页签，不得落 tab=taskforce`);
      }
    }
    // 分组映射同样不得写不存在的 tab（D4 已逐角色核注册表）
    assert.notEqual(ACTIVITY_TAB['party-staff'], 'calendar', '党委台无 calendar 页签');
    assert.notEqual(TASKFORCE_TAB['party-staff'], 'taskforce', '党委台无 taskforce 页签');
  });
  
  test('D6 main-entry.js 按角色消费 data-ws-tab-<page>，subview 只在 activities 上附加', () => {
    const src = readFileSync(MAIN_ENTRY, 'utf8');
    assert.match(src, /wsTab\$\{pageSuffix\}/, 'main-entry.js 未按角色读取 data-ws-tab-<page>');
    assert.match(src, /dataset\.wsTab\b/, 'main-entry.js 未保留 data-ws-tab 兜底');
    assert.match(src, /tab\s*===\s*'activities'/, 'subview 应只在目标为 activities 时附加');
    assert.doesNotMatch(
      src,
      /a\.dataset\.wsView\s*\?/,
      'main-entry.js 仍无条件附加 subview（其它台会带无用参数）',
    );
  });
  
  test('D7 index 与 main-entry 共用同一活动版本戳（发版不写死版本号）', () => {
    const stampOf = (file) => [...readFileSync(file, 'utf8').matchAll(/\?v=(\d{8}[a-z])/g)].map((m) => m[1]);
    const indexStamps = new Set(stampOf(INDEX));
    const mainStamps = new Set(stampOf(MAIN_ENTRY));
    assert.equal(indexStamps.size, 1, `index.html 应只含一个活动版本戳，实测：${[...indexStamps].join(', ')}`);
    assert.equal(mainStamps.size, 1, `main-entry.js 应只含一个活动版本戳，实测：${[...mainStamps].join(', ')}`);
    assert.deepEqual([...mainStamps], [...indexStamps], 'index.html 与 main-entry.js 的版本戳必须一致（否则模块实例分裂）');
  });

})();

// ═══ 源件 6：no-about-route-guard.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // no-about-route-guard.test.mjs — 「关于」撤路由回归防线（2026-10-27 美学三镜 · Task 12.4）
  //
  // 口径（支书裁定）：`about.html` **文件保留**（旧外链 / 收藏仍可直达，不制造 404），
  // 但全站**不再提供任何「关于」导航入口**：
  //   A1 `docs/**/*.html` 不得有 `href` 指向 `about.html`（侧边栏 / 帮助目录 / 任意正文链接）；
  //   A2 `docs/src/**/*.js` 不得渲染 `about.html` 目标，也不得有 `module: 'about'` 侧栏项；
  //   A3 `docs/**/*.md`（README / AGENTS）不得再登记 `about.html` / `about-entry.js` 指针；
  //   A4 `docs/about.html` 仍在（撤路由 ≠ 删文件）。
  //
  // 非空转判据（缺一不可）：
  //   ① 抽取口径在合成正/负样本上命中/不命中（A5，防正则失效恒真）；
  //   ② 扫描面规模下限（HTML 页 / JS 文件 / Markdown 文件），低于下限＝口径或范围被削；
  //   ③ A4 文件存在且非空（防「删文件冒充撤路由」）。
  // 故障注入（人工，不入仓）：在 `docs/help.html` 临时加回 `<a href="./about.html">关于</a>`
  //   或 `sidebar.js` 加回 `{ module: 'about', … }` ⇒ A1 / A2 必须判红。
  //
  // 运行：node --test server/test/no-about-route-guard.test.mjs（纯 node，不起服务）
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readdirSync, readFileSync, existsSync, statSync } = await import('node:fs');
  const { join, relative, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const HERE = dirname(fileURLToPath(import.meta.url));
  const ROOT = join(HERE, '..', '..');
  const DOCS = join(ROOT, 'docs');
  const ABOUT_FILE = join(DOCS, 'about.html');
  
  /** 扫描面规模下限（非空转：实测值见批报告；低于下限＝口径失效或扫描范围被削） */
  const HTML_FLOOR = 15;   // docs/**/*.html
  const JS_FLOOR = 180;    // docs/src/**/*.js
  const MD_FLOOR = 2;      // docs/**/*.md（README + src/AGENTS.md）
  
  /** 归一化一个 href / 字面量：去 query / hash 后取末段，判是否指向 about.html */
  function isAboutTarget(value) {
    const raw = String(value || '').trim();
    if (!raw || raw.startsWith('#')) return false;          // 纯锚点不是文件目标
    const pathPart = raw.split('#')[0].split('?')[0].replace(/\$\{[^}]*\}/g, '');
    if (!pathPart) return false;
    const base = pathPart.replace(/\\/g, '/').split('/').pop().toLowerCase();
    return base === 'about.html';
  }
  
  /** HTML：抽取全部 href 值 */
  function htmlHrefs(src) {
    const out = [];
    const re = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
    let m;
    while ((m = re.exec(src)) !== null) out.push(m[1] ?? m[2] ?? '');
    return out;
  }
  
  /** HTML：指向 about.html 的 href（正样本命中，负样本不命中） */
  function htmlAboutLinks(src) {
    return htmlHrefs(src).filter(isAboutTarget);
  }
  
  /** JS：抽取引号包裹的字面量（含模板串）＋ `module: 'about'` 侧栏项 */
  const JS_QUOTED_RE = /(['"`])([^'"`\n]*?)\1/g;
  const JS_ABOUT_MODULE_RE = /\bmodule\s*:\s*(['"])about\1/;
  
  function jsRouteHits(src) {
    const hits = [];
    src.split(/\r?\n/).forEach((line, i) => {
      const t = line.trim();
      if (!t || t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
      let m;
      const re = new RegExp(JS_QUOTED_RE.source, 'g');
      while ((m = re.exec(line)) !== null) {
        if (isAboutTarget(m[2])) hits.push({ line: i + 1, kind: 'literal', value: m[2] });
      }
      if (JS_ABOUT_MODULE_RE.test(line)) hits.push({ line: i + 1, kind: 'module', value: t });
    });
    return hits;
  }
  
  /** Markdown：about 页面 / 入口指针（大小写不敏感） */
  const MD_POINTER_RE = /about\.html|about-entry\.js/i;
  function mdAboutPointers(src) {
    return src.split(/\r?\n/)
      .map((line, i) => ({ line: i + 1, text: line }))
      .filter((row) => MD_POINTER_RE.test(row.text));
  }
  
  /** 递归收集指定后缀（相对仓库根的 posix 路径） */
  function filesWithExt(dir, ext) {
    const out = [];
    const walk = (d) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        if (e.name === '.git' || e.name === 'vendor' || e.name === 'assets') continue;
        const p = join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith(ext)) out.push(relative(ROOT, p).replace(/\\/g, '/'));
      }
    };
    walk(dir);
    return out.sort();
  }
  
  // ── A1 HTML 无 about 导航链接 ────────────────────────────────────────
  test('A1 docs/**/*.html 不得再有 href 指向 about.html（侧边栏 / 帮助目录 / 正文）', () => {
    const files = filesWithExt(DOCS, '.html');
    const offenders = [];
    for (const f of files) {
      for (const href of htmlAboutLinks(readFileSync(join(ROOT, f), 'utf8'))) {
        offenders.push(`${f} → href="${href}"`);
      }
    }
    assert.deepEqual(offenders, [], `About 导航链接残留：\n  ${offenders.join('\n  ')}`);
    console.log(`[A1] About 导航链接：扫描 ${files.length} 个 HTML，残留 ${offenders.length} 处`);
  });
  
  // ── A2 JS 无 about 路由 / 侧栏项 ─────────────────────────────────────
  test('A2 docs/src/**/*.js 不得渲染 about.html，也不得有 module: "about" 侧栏项', () => {
    const files = filesWithExt(join(DOCS, 'src'), '.js');
    const offenders = [];
    for (const f of files) {
      for (const h of jsRouteHits(readFileSync(join(ROOT, f), 'utf8'))) {
        offenders.push(`${f}:${h.line} → ${h.kind === 'module' ? h.value : `about.html 字面量「${h.value}」`}`);
      }
    }
    assert.deepEqual(offenders, [], `About 路由残留：\n  ${offenders.join('\n  ')}`);
    console.log(`[A2] About 路由：扫描 ${files.length} 个 JS，残留 ${offenders.length} 处`);
  });
  
  // ── A3 Markdown 无 about 指针 ────────────────────────────────────────
  test('A3 docs/**/*.md 不得再登记 about.html / about-entry.js 指针', () => {
    const files = filesWithExt(DOCS, '.md');
    const offenders = [];
    for (const f of files) {
      for (const row of mdAboutPointers(readFileSync(join(ROOT, f), 'utf8'))) {
        offenders.push(`${f}:${row.line} → ${row.text.trim()}`);
      }
    }
    assert.deepEqual(offenders, [], `About 文档指针残留：\n  ${offenders.join('\n  ')}`);
    console.log(`[A3] About 文档指针：扫描 ${files.length} 个 Markdown，残留 ${offenders.length} 处`);
  });
  
  // ── A4 文件保留 ──────────────────────────────────────────────────────
  test('A4 docs/about.html 文件仍存在且非空（撤路由 ≠ 删文件）', () => {
    assert.ok(existsSync(ABOUT_FILE), 'docs/about.html 被删除：撤路由只撤入口，文件须保留（旧外链不 404）');
    assert.ok(statSync(ABOUT_FILE).size > 0, 'docs/about.html 为空文件');
  });
  
  test('A5 非空转：抽取口径正/负样本可判 + 扫描面规模达标', () => {
    // ① 目标判定：各种 about.html 形态命中，相似名 / 锚点不命中
    const positives = ['./about.html', 'about.html', '/docs/about.html?x=1', 'about.html#top', '${base}about.html'];
    const negatives = ['#about.html', './about.css', './about.html.bak', './myabout.html', './about-entry.js', ''];
    for (const v of positives) assert.equal(isAboutTarget(v), true, `应命中 about 目标：${v}`);
    for (const v of negatives) assert.equal(isAboutTarget(v), false, `不应命中 about 目标：${v}`);
  
    // ② HTML 口径
    assert.deepEqual(
      htmlAboutLinks('<a href="./about.html">关于</a><a href="./help.html">帮助</a>'),
      ['./about.html'],
      'HTML 抽取口径失效：about 链接未命中或误伤',
    );
  
    // ③ JS 口径：渲染字面量 / 侧栏 module 命中；帮助入口与 about-entry 入口不命中
    const jsHits = jsRouteHits([
      "const a = `<a href=\"${base}about.html\">关于</a>`;",
      "items.push({ module: 'about', label: '关于', href: base + 'about.html' });",
      "renderSidebar('about', { staticShell: true });",
      "const b = base + 'help.html';",
    ].join('\n'));
    assert.deepEqual(jsHits.map((h) => h.line), [1, 2, 2],
      'JS 抽取口径失效：about 字面量 / module 未命中，或误伤帮助入口');
    assert.ok(jsHits.some((h) => h.kind === 'module'), 'JS 抽取口径失效：module: "about" 未命中');
  
    // ④ 扫描面规模下限（低于下限说明口径失效或扫描范围被削）
    const html = filesWithExt(DOCS, '.html');
    const js = filesWithExt(join(DOCS, 'src'), '.js');
    const md = filesWithExt(DOCS, '.md');
    assert.ok(html.length >= HTML_FLOOR, `只扫到 ${html.length} 个 HTML（下限 ${HTML_FLOOR}）：扫描范围异常`);
    assert.ok(js.length >= JS_FLOOR, `只扫到 ${js.length} 个 JS（下限 ${JS_FLOOR}）：扫描范围异常`);
    assert.ok(md.length >= MD_FLOOR, `只扫到 ${md.length} 个 Markdown（下限 ${MD_FLOOR}）：扫描范围异常`);
    console.log(`[A5] 非空转：HTML ${html.length}（下限 ${HTML_FLOOR}）· JS ${js.length}（下限 ${JS_FLOOR}）`
      + ` · MD ${md.length}（下限 ${MD_FLOOR}）`);
  });

})();

// ═══ 源件 7：public-brand-guard.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // public-brand-guard.test.mjs — 未登录公共门厅品牌与分流守卫（2026-11-08 批次 536 · Task 7）
  //
  // 由来：spec `add-committee-activities-and-public-portal`「未登录公共门厅」＋ D-858 决策 10
  //   （门厅品牌＝「光华管理学院党建平台」+ 党徽）。未登录首页不再进入支部工作台，
  //   也不得暴露任何具体支部名。
  //
  // 判据（静态读源码；不连服务、不开浏览器）：
  //   P1 平台品牌「光华管理学院党建平台」出现在 index.html / login.html / branch.js；
  //   P2 index.html 有 #view-public-portal（aria-labelledby → #public-portal-title）与登录入口，
  //      且 #view-dashboard 仍在（登录态结构不删），门厅位于其后；
  //   P3 main-entry.js 按登录态分流：if (user) → initDashboard；else → initPublicPortal；
  //      loadWorkspaceData 只在 initDashboard 内（未登录不请求工作台数据）；
  //   P4 未登录品牌不落到具体支部：branch.js 段⑤返回平台品牌；首页 / 登录页 / main-entry 不含演示支部名，
  //      首页也不含 br-b1；演示支部名从 mock 种子派生（不在本文件另写第二份字面量）；
  //   P5 门厅客户端只走 /api/public/*：不带 Authorization、不读 token、8 秒超时、下载地址走白名单前缀；
  //   P6 非空转：分流正则与「演示支部名」扫描对植入样本能判出正 / 负例。
  //
  // 运行：`node --test server/test/public-brand-guard.test.mjs`（纯 node）
  const test = (await import('node:test')).default;
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const INDEX = join(ROOT, 'docs', 'index.html');
  const LOGIN = join(ROOT, 'docs', 'login.html');
  const MAIN_ENTRY = join(ROOT, 'docs', 'src', 'entries', 'pages', 'main-entry.js');
  const BRANCH = join(ROOT, 'docs', 'src', 'services', 'branch', 'branch.js');
  const CLIENT = join(ROOT, 'docs', 'src', 'data', 'public-portal-client.js');
  const MOCK_BRANCHES = join(ROOT, 'docs', 'src', 'data', 'mock', 'branches.js');
  
  const read = (file) => readFileSync(file, 'utf8');
  const PLATFORM_BRAND = '光华管理学院党建平台';
  
  /** 未登录 / 已登录分流（与 main-entry.js 同一形态；P6 用它做正负例自检） */
  const SPLIT_RE = /if\s*\(user\)\s*\{\s*initDashboard\(\);\s*\}\s*else\s*\{\s*initPublicPortal\(\);/;
  
  /** 从 mock 种子派生演示支部名（`name: '…', // 支部档案名`）——避免守卫里再写一份字面量 */
  function demoBranchNameOf(source) {
    const m = /^\s*name:\s*'([^']+)',\s*\/\/\s*支部档案名/m.exec(source);
    return m ? m[1] : '';
  }
  
  const indexHtml = read(INDEX);
  const loginHtml = read(LOGIN);
  const mainSource = read(MAIN_ENTRY);
  const branchSource = read(BRANCH);
  const clientSource = read(CLIENT);
  const mockBranchesSource = read(MOCK_BRANCHES);
  const demoBranchName = demoBranchNameOf(mockBranchesSource);
  
  test('P1 平台品牌出现在首页 / 登录页 / 顶栏品牌判定源', () => {
    assert.ok(indexHtml.includes(PLATFORM_BRAND), `index.html 缺平台品牌「${PLATFORM_BRAND}」`);
    assert.ok(loginHtml.includes(PLATFORM_BRAND), `login.html 缺平台品牌「${PLATFORM_BRAND}」`);
    assert.ok(branchSource.includes(PLATFORM_BRAND), `branch.js 缺平台品牌「${PLATFORM_BRAND}」`);
    assert.doesNotMatch(loginHtml, /党支部管理系统/, '登录页抬头不得再回退旧中性文案「党支部管理系统」');
    assert.match(indexHtml, /<title>光华管理学院党建平台 — GSM1921-SOP<\/title>/, '首页 <title> 应为平台品牌 + 产品名');
  });
  
  test('P2 首页有公共门厅容器与登录入口，工作台结构保留且排在其后', () => {
    assert.match(
      indexHtml,
      /<section\b[^>]*id="view-public-portal"[^>]*aria-labelledby="public-portal-title"/,
      '#view-public-portal 须是带可访问名称的 section',
    );
    assert.match(indexHtml, /id="public-portal-title"[^>]*>\s*光华管理学院党建平台\s*</, '门厅标题须为平台品牌');
    assert.match(indexHtml, /id="public-portal-login"/, '门厅缺登录入口');
    for (const id of ['public-portal-notices', 'public-portal-activities', 'public-portal-documents']) {
      assert.match(indexHtml, new RegExp(`id="${id}"`), `门厅缺区块容器 #${id}`);
    }
    assert.match(indexHtml, /id="public-portal-notices" class="[^"]*"[^>]*aria-busy="true"/,
      '门厅区块须带 aria-busy（加载完成后由 JS 撤）');
    assert.match(indexHtml, /id="view-dashboard"/, '不得删除 #view-dashboard（登录态工作台结构）');
    assert.ok(
      indexHtml.indexOf('id="view-dashboard"') < indexHtml.indexOf('id="view-public-portal"'),
      '#view-public-portal 应位于 #view-dashboard 之后',
    );
  });
  
  test('P3 main-entry 按登录态分流，未登录不调用 loadWorkspaceData', () => {
    assert.match(mainSource, SPLIT_RE,
      'main-entry.js 应为 `if (user) { initDashboard(); } else { initPublicPortal(); }` 分流');
    assert.equal((mainSource.match(/\bloadWorkspaceData\s*\(/g) || []).length, 1,
      'loadWorkspaceData 只允许一处调用（包在 initDashboard 内）');
    const initDashboardStart = mainSource.indexOf('function initDashboard');
    const loadWorkspaceStart = mainSource.indexOf('loadWorkspaceData(');
    assert.ok(initDashboardStart >= 0, 'main-entry.js 缺 initDashboard');
    assert.ok(loadWorkspaceStart > initDashboardStart,
      'loadWorkspaceData 必须在 initDashboard 内部（未登录分支不得触达）');
    assert.match(mainSource, /function initPublicPortal\s*\(/, 'main-entry.js 缺 initPublicPortal');
    assert.match(mainSource, /loadPublicPortal\(\)/, '门厅分流须调用 loadPublicPortal');
    assert.match(mainSource, /getElementById\('view-public-portal'\)/, 'initPublicPortal 须切到 #view-public-portal');
    assert.match(mainSource, /getElementById\('view-dashboard'\)[\s\S]{0,120}classList\.add\('hidden'\)/,
      '未登录须给 #view-dashboard 加 hidden');
  });
  
  test('P4 未登录品牌不落到具体支部名', () => {
    assert.ok(demoBranchName, '无法从 mock 种子解析演示支部名（派生口径失效）');
    assert.match(branchSource, new RegExp(`const PLATFORM_BRAND_TITLE = '${PLATFORM_BRAND}';`),
      'branch.js 须以常量承载平台品牌');
    assert.match(branchSource, /return \{ title: PLATFORM_BRAND_TITLE, segment: 5 \};/,
      '未登录 / 查无档案段（段⑤）须返回平台品牌');
    assert.doesNotMatch(branchSource, /GUEST_HEADER_PLACEHOLDER/, '未登录品牌不得再复用支部显示名占位');
    for (const [label, source] of [
      ['docs/index.html', indexHtml],
      ['docs/login.html', loginHtml],
      ['main-entry.js', mainSource],
      ['branch.js', branchSource],
    ]) {
      assert.ok(!source.includes(demoBranchName), `${label} 不得出现具体支部名「${demoBranchName}」`);
    }
    assert.ok(!indexHtml.includes('br-b1'), '首页静态壳不得出现支部 id「br-b1」');
  });
  
  test('P5 门厅客户端只走匿名 /api/public/*（无鉴权头、8 秒超时）', () => {
    // 只核「代码」不核注释：注释里的「不带 Authorization」是说明，不是实现
    const clientCode = clientSource
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n').map((line) => line.replace(/\/\/.*$/, '')).join('\n');
    for (const path of ['/api/public/portal', '/api/public/notices/', '/api/public/activities/', '/api/public/documents/']) {
      assert.ok(clientCode.includes(path), `public-portal-client.js 缺公共端点 ${path}`);
    }
    assert.match(clientCode, /\/api\/public\/documents\/\$\{[^}]*\}\/download/,
      '下载地址须拼 `/api/public/documents/<id>/download`');
    assert.doesNotMatch(clientCode, /Authorization/, '门厅客户端不得带 Authorization');
    assert.doesNotMatch(clientCode, /sessionStorage|localStorage/, '门厅客户端不得读 token / 本地存储');
    assert.match(clientSource, /REQUEST_TIMEOUT_MS = 8000/, '门厅请求须有 8 秒超时');
  });
  
  test('P6 非空转：分流正则与演示支部名扫描能判出正 / 负例', () => {
    assert.match('if (user) { initDashboard(); } else { initPublicPortal(); }', SPLIT_RE);
    assert.doesNotMatch('if (user) { initDashboard(); }', SPLIT_RE, '缺 else 分支不得被判为已分流');
    assert.doesNotMatch('initDashboard(); initPublicPortal();', SPLIT_RE, '无登录态判断不得被判为已分流');
    assert.ok(mockBranchesSource.includes(demoBranchName), '演示支部名派生应能在种子源里命中');
    assert.ok(`<h1>${demoBranchName}</h1>`.includes(demoBranchName), '支部名扫描应能命中植入样本');
  });

})();

// ═══ 源件 8：localstorage-key-guard.test.mjs ═══
await (async () => {
  // server/test/localstorage-key-guard.test.mjs — 「浏览器存储键必须登记」守卫（2026-09-24 批次 169）
  // ════════════════════════════════════════════════════════════════
  // 来源（支书逐字）：「我们必须把网页升级成系统！！【**浏览器缓存固然有用但不能什么都依靠浏览器缓存！！**】」
  // 判据（去缓存化审计给出的判据 3.5-2）：**枚举全仓 localStorage / sessionStorage 的键字面量，
  //   断言 键 ⊆ 已知映射**——映射分三档：
  //     A. **服务端权威**（server-authoritative）：该键的真相在服务端表 / 快照；本机键只是镜像 / 缓存 /
  //        mock 形态的对应物（清了不丢数据，或清了只是回到服务端值）。
  //        消费点：`server/db.js` 的 `RESOURCE_TABLES` / `SEMANTIC_TABLES` 与 `server/routes/**` 端点。
  //     B. **本机临时白名单**（local-only）：语义上**就应当只在本机**（草稿 / 预览 / mock 形态专属 / 设计如此）——
  //        硬搬服务端反而错（如未提交草稿、预览只是「本地看效果」）。逐条写明「为什么不上服务端」。
  //        落点见 `content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md` 的「浏览器存储键白名单」表。
  //     C. **UI 偏好与会话**（ui-pref-session）：主题 / 字号 / 强调色 / 个人偏好前缀 / 登录会话 / 标签页 / 令牌。
  //    ⇒ **任何新键若未进这三档之一 ⇒ 红灯**，并给出「请登记到白名单或改为服务端权威」的提示。
  //
  // 为什么要有这道守卫（长期防线）：本次「去缓存化」把四处「只有本机一份」的域搬上了服务端；但**制度靠守卫**——
  //   没有它，下一次「先落个 localStorage 再说」会悄悄回潮，「什么都依靠浏览器缓存」的老病会复发。
  //
  // 抽取口径（**可解释、可复核**，不过宽也不过窄）：
  //   ⓐ **存储调用字面量**：`(local|session)Storage.(get|set|remove)Item('…')` 的实参——无论命名空间一律收录；
  //   ⓑ **键名常量的字面量**：形如 `X_KEY = '…'` / `X_PREFIX = '…'` / `storageKey: '…'` 的字符串——
  //      这是本仓的主流写法（如 `export const RESIDENCE_KEY = 'gsm1921-residence-overrides'`），
  //      只抽 ⓐ 会漏掉绝大多数键。
  //   例外：`*_ACTION_KEY`（业务动作键，非存储键）按 `NON_STORAGE_CONST_NAMES` 逐条排除并给理由（防僵尸）。
  //   ⚠ 覆盖边界（如实标注，不假装覆盖）：以**变量间接引用**的键（如 `localStorage.getItem(someVar)` 且该变量
  //      既非 `*_KEY` 常量、也非存储调用实参）**不在本守卫射程**——那一半只能靠人读。
  //
  // 运行：`node --test server/test/localstorage-key-guard.test.mjs`（纯 node，无浏览器 / 无服务依赖）
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync, readdirSync, statSync, existsSync } = await import('node:fs');
  const { join } = await import('node:path');
  // Task 2.2（2026-10-26）：浏览器存储键的四类单一源（visual / auth / read-cache / temp）。
  const { CACHE_KEYS, CACHE_KEY_PREFIXES, CACHE_CATEGORIES, classifyCacheKey, validateBackupPayload, BACKUP_META, NICHE_COLLECTION_NAMES, } = await import('../../docs/src/data/cache-registry.js?v=20261120a');
  const ROOT = join(import.meta.dirname, '..', '..');
  
  /** 扫描根（源码；**不含** `server/test`：测试里出现的键是「引用」而非「新键」） */
  const SCAN_DIRS = [
    join(ROOT, 'docs', 'src'),
    join(ROOT, 'docs', 'scripts'),
    join(ROOT, 'server', 'routes'),
  ];
  /** 额外逐个扫的根目录文件（内联脚本里可能也写存储键） */
  const SCAN_FILES = (() => {
    const out = [];
    try {
      for (const n of readdirSync(join(ROOT, 'docs'))) {
        if (n.endsWith('.html')) out.push(join(ROOT, 'docs', n));
      }
    } catch (_) { /* 目录缺失：跳过 */ }
    for (const n of ['server/app.js', 'server/db.js', 'server/seed.js']) {
      const f = join(ROOT, n);
      if (existsSync(f)) out.push(f);
    }
    return out;
  })();
  
  const SKIP_DIRS = new Set(['node_modules', '.git', '.trae', '.vscode', 'assets']);
  
  // ════════════════════════════════════════════════════════════════
  //  三档已知映射（键 → 语义；**逐条给理由**）
  // ════════════════════════════════════════════════════════════════
  
  /** A 档：服务端权威（本机键＝镜像 / 缓存 / mock 形态对应物；清了不丢真相） */
  const SERVER_AUTHORITATIVE = {
    'workflowos_branch_db_v1': 'mock 形态的整库落盘；api 形态真相在服务端快照与各业务表（mock-adapter.js）',
    'gsm1921-residence-overrides': '在册/滞留状态；api 形态以服务端 users 行（residenceStatus/Note/History）为唯一权威（2026-09-24 批次 169 单轨化；services/member/roster.js）',
    'gsm1921-member-confirmations': '成员变更确认队列；服务端表 member_confirmations（2026-09-23 批次 163 服务端化；services/member/member-confirmation.js）',
    'gsm1921-attendance-appeals': '出勤申诉队列；服务端表 attendance_appeals（2026-09-24 批次 169；services/activity/attendance.js）',
    'gsm1921-inspection-appeals': '考察申诉队列；服务端表 inspection_appeals（2026-09-24 批次 169；services/activity/inspection.js）',
    'sop_org_os_auth_audit': '授权审计留痕；服务端表 auth_audit（2026-09-24 批次 169；services/core/auth.js）',
    'gsm1921-issue-cache-v3': '意见反馈读缓存；服务端 issues 表为权威（services/governance/issues.js）',
    'gsm1921-issue-cache-version': '上条缓存的版本号（缓存失效用，非数据本体）',
    'gsm1921-feedback-migrated': '反馈迁移标记（一次性迁移用；迁移的是种子，非用户数据）',
    'gsm1921-feedback-submissions': '旧版反馈本地提交件（迁移源；migrateFeedbackSubmissions 处理后清除）',
    'issue_reveals': '匿名反馈揭名的历史留痕；当前系统已关闭揭名入口，仅保留历史记录（服务端表 issue_reveals）',
    'gsm1921-milestone-cache': '批次里程碑读缓存；服务端表 milestones（内容单一源 docs/data/milestones.json，seed.js 播种；services/governance/milestones.js）',
    'workflowos_taskforces_v1': '专班旧单域键（已被整库键 workflowos_branch_db_v1 取代；taskforces 是服务端资源表）',
    'workflowos_notices_v1': '通知旧单域键（同上；notices 是服务端资源表）',
  };
  
  /** B 档：本机临时白名单（**就应当只在本机**——逐条写明为何不上服务端） */
  const LOCAL_ONLY = {
    'gsm1921-base-data-preview': '本机临时·预览：换组织前「本地看效果」，绝不写 mockDB / 种子 / 服务器（org-base-data-preview.js）——服务端化会把「看效果」变成「真改数据」',
    'gsm1921-issue-drafts': '本机临时·草稿：未提交的反馈/评论草稿不得保存真实身份；旧草稿读取时迁除身份字段（services/governance/issues.js）',
    'gsm1921-workforce-draft': '本机临时·草稿：支书台「拟定分工」未提交内容，属该设备上未完成的工作（entries/tabs/secretary/workforce-panel.js）',
    'workflowos_leader_activity_draft': '本机临时·草稿：组长「写入活动」未提交的表单暂存（刷新恢复用；entries/tabs/leader/write-tab.js）',
    'gsm1921-members-overlay': 'mock 形态专属：成员档案覆盖层；api 形态读链走 server users、写走 /members* 端点 ⇒ 无需服务端化（services/member/person.js）',
    'gsm1921-accounts': 'mock 形态专属：可持久化账号层；api 形态账号承载＝server users 表行（services/core/accounts.js）',
    'gsm1921-dev-stage-overrides': '**2026-09-28 已服务端化**：事实改挂成员档案字段 `developStageSince`（服务端权威、跨设备可读）；本键降级为**遗留键**——代码中仅剩「init 档移除清单 / 清一次存储残留」引用，不再有业务读写',
    'gsm1921-issue-submitter-token': '设计如此·本机令牌：随机不可反查人的防刷令牌（仅判重/限频用），按设计只在本设备（services/governance/issues.js）',
    'gsm1921-init-state': '本机·初始化态闸门：本标签页「正在初始化」的内存语义落盘位，非业务数据（services/core/init-reset.js）',
    'gsm1921-pending-writes-outbox': '本机临时·失败待同步队列：只存集合名/错误码/时间（不存业务数据），用于「未同步」可见提示与重试/放弃；真相始终在服务端（core/session/pending-writes.js，Task 3 2026-10-26）',
  };
  
  /** C 档：UI 偏好与会话 */
  const UI_PREF_SESSION = {
    'workflowos_theme': 'UI 偏好·主题',
    'workflowos_font_size': 'UI 偏好·字号',
    'workflowos_accent_role': 'UI 偏好·强调色',
    'gsm1921-api-token': '会话·API token（sessionStorage）',
    'gsm1921-login-user': '会话·登录人（localStorage 兜跨标签）',
    'gsm1921-tab-id': '会话·本标签页唯一 ID（sessionStorage）',
    'gsm1921-session-snap': '会话·本标签页登录会话快照（sessionStorage）',
    'sop_org_os_session': '会话·跨页状态会话（core/session/cross-page-state.js）',
    'sop_org_os_data_version': '会话·跨页数据版本（同上）',
    'gsm1921-remote-probe': 'UI 偏好·远端变更探测开关（data-adapter.js；off/0/false＝关）',
    'sop_org_os_assigned_roles': '历史遗留键·仅启动清理（roles.js 已无调用方，留一次 removeItem）',
  };
  
  /** 前缀型键（末尾的 `-`/`_` 即前缀语义；以 `startsWidth` 判定） */
  const SERVER_AUTHORITATIVE_PREFIXES = {
    'gsm1921-issue-unread-': '逐人未读标记；服务端表 issue_unread（2026-09-24 批次 169；services/governance/issues.js）',
  };
  const LOCAL_ONLY_PREFIXES = {
    'wizard-draft-': '本机临时·草稿：换组织向导未走完的草稿，按支部一份（components/governance/org-setup-wizard.js）',
    // 2026-11-01 批次 523：页签模块失败「同会话自愈一次」标记（键含 tab.id；成功渲染即删）。
    //   只表达「本会话试过一次重载」，不属于任何业务事实 ⇒ 不上服务端。
    'gsm1921-tab-selfheal-': '本机临时·页签失败自愈一次性标记（sessionStorage；成功后清除；components/shell/tab-bar.js）',
  };
  const UI_PREF_SESSION_PREFIXES = {
    'gsm1921-pref-': 'UI 偏好·个人偏好键空间（theme.js / preferences.js）',
    'cps-': '会话·跨页单值参数前缀（core/session/cross-page-state.js）',
    'workflowos_tab_': 'UI 偏好·工作台页签记忆（各 ws-*-entry.js 的 storageKey）',
    // 2026-11-10 批次 540：数据表列宽拖动偏好（`table:cols:<stateKey>` 逐表一份百分比数组）。
    //   只改本机呈现，不影响任何业务事实 ⇒ 不上服务端（components/ui/data-table.js）。
    'table:cols:': 'UI 偏好·表格列宽拖动（components/ui/data-table.js；纯展示，可随时丢弃）',
  };
  
  /** 非存储键的常量例外（逐条给理由；`*_ACTION_KEY` 是业务动作键，不落存储） */
  const NON_STORAGE_CONST_NAMES = {
    RESOLUTION_FOLLOWUP_ACTION_KEY: '待办「决议跟进」动作键（todo.actionKey），不写 localStorage/sessionStorage（services/governance/resolution-followup.js）',
    MODULE_CYCLE_ACTION_KEY: '待办「模块周期提醒」实时组动作键（todo.actionKey / 实时组 actionKey），不写 localStorage/sessionStorage（services/governance/todo.js，2026-10-06 批次 423）',
  };
  
  // ════════════════════════════════════════════════════════════════
  //  抽取
  // ════════════════════════════════════════════════════════════════
  
  /** 递归收集扫描面内的 .js / .mjs / .html */
  function walk(dir, out = []) {
    let names;
    try { names = readdirSync(dir); } catch (_) { return out; }
    for (const n of names) {
      if (SKIP_DIRS.has(n)) continue;
      const f = join(dir, n);
      let st;
      try { st = statSync(f); } catch (_) { continue; }
      if (st.isDirectory()) { walk(f, out); continue; }
      if (/\.(js|mjs|html)$/.test(n)) out.push(f);
    }
    return out;
  }
  
  const FILES = [...SCAN_DIRS.flatMap((d) => walk(d)), ...SCAN_FILES.filter(existsSync)];
  
  /** 该行是否纯注释行（注释里可以引用键做说明，不算「使用」） */
  const isCommentLine = (line) => /^\s*(\/\/|\*|\/\*)/.test(line);
  
  /** 直接字面量实参：`localStorage.getItem('k')` 等 */
  const CALL_LITERAL_RE = /(?:local|session)Storage\.(?:getItem|setItem|removeItem)\(\s*'([^']+)'/g;
  /** 键名常量的字面量：`X_KEY = 'k'` / `X_PREFIX = 'k'` / `storageKey: 'k'` */
  const CONST_LITERAL_RE = /\b([A-Za-z_$][\w$]*)\s*(?:=|:)\s*'([^']+)'/g;
  
  /**
   * 抽取全仓「键字面量」。
   * @returns {{callKeys:Map<string,string[]>, constKeys:Map<string,string[]>, nonStorage:Set<string>}}
   */
  function collectKeys() {
    const callKeys = new Map();   // key → 出现处（`file:line`）
    const constKeys = new Map();  // key → 出现处（`file:line`）
    const nonStorage = new Set(); // 被例外排除的常量名（须真实存在，防僵尸）
    for (const file of FILES) {
      const rel = file.slice(ROOT.length + 1).replace(/\\/g, '/');
      readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, i) => {
        if (isCommentLine(line)) return;
        const where = `${rel}:${i + 1}`;
        for (const m of line.matchAll(CALL_LITERAL_RE)) {
          const k = m[1];
          if (!callKeys.has(k)) callKeys.set(k, []);
          callKeys.get(k).push(where);
        }
        for (const m of line.matchAll(CONST_LITERAL_RE)) {
          const name = m[1], k = m[2];
          if (!/(^|_)(KEY|PREFIX|STORAGE_KEY)$/.test(name) && !/^storageKey$/.test(name)) continue;
          if (Object.prototype.hasOwnProperty.call(NON_STORAGE_CONST_NAMES, name)) { nonStorage.add(name); continue; }
          if (!constKeys.has(k)) constKeys.set(k, []);
          constKeys.get(k).push(where);
        }
      });
    }
    return { callKeys, constKeys, nonStorage };
  }
  
  const { callKeys, constKeys, nonStorage } = collectKeys();
  
  /** 全部候选键（调用字面量 ∪ 常量字面量） */
  const ALL_KEYS = [...new Set([...callKeys.keys(), ...constKeys.keys()])].sort();
  
  /** 三档归类（含前缀档） */
  function classify(key) {
    if (SERVER_AUTHORITATIVE[key]) return { tier: 'A 服务端权威', why: SERVER_AUTHORITATIVE[key] };
    if (LOCAL_ONLY[key]) return { tier: 'B 本机临时白名单', why: LOCAL_ONLY[key] };
    if (UI_PREF_SESSION[key]) return { tier: 'C UI 偏好与会话', why: UI_PREF_SESSION[key] };
    for (const p of Object.keys(SERVER_AUTHORITATIVE_PREFIXES)) if (key.startsWith(p)) return { tier: 'A 服务端权威（前缀）', why: SERVER_AUTHORITATIVE_PREFIXES[p] };
    for (const p of Object.keys(LOCAL_ONLY_PREFIXES)) if (key.startsWith(p)) return { tier: 'B 本机临时白名单（前缀）', why: LOCAL_ONLY_PREFIXES[p] };
    for (const p of Object.keys(UI_PREF_SESSION_PREFIXES)) if (key.startsWith(p)) return { tier: 'C UI 偏好与会话（前缀）', why: UI_PREF_SESSION_PREFIXES[p] };
    return null;
  }
  
  // ════════════════════════════════════════════════════════════════
  //  断言
  // ════════════════════════════════════════════════════════════════
  
  test('L1 全仓 localStorage / sessionStorage 键字面量 ⊆ 已知映射（未登记即红）', () => {
    const unregistered = ALL_KEYS.filter((k) => !classify(k));
    // 逐键列出归类（三档各多少、分别是哪些键）——把结果打进 console，便于复核
    const byTier = new Map();
    for (const k of ALL_KEYS) {
      const c = classify(k);
      const tier = c ? c.tier.split('（')[0] : 'UNREGISTERED';
      if (!byTier.has(tier)) byTier.set(tier, []);
      byTier.get(tier).push(k);
    }
    console.log('[localstorage-key-guard] 全仓键字面量归类（共 %d 个键）：', ALL_KEYS.length);
    for (const [tier, keys] of [...byTier.entries()].sort()) {
      console.log(`  · ${tier}：${keys.length} 个 → ${keys.join(', ')}`);
    }
    assert.deepEqual(
      unregistered.map((k) => `${k}（出现处：${[...(callKeys.get(k) || []), ...(constKeys.get(k) || [])].join(' / ')}）`), [],
      '发现**未登记的浏览器存储键**——请二选一：\n'
      + '  ① 若它的真相应当由服务端承载（可被他人 / 其他设备读到）⇒ **改为服务端权威**'
      + '（照 server/db.js::SEMANTIC_TABLES + server/routes/resources/semantic-routes.js 的「语义端点域」模板）；\n'
      + '  ② 若它**确实只应在本机**（草稿 / 预览 / mock 专属 / 偏好）⇒ **登记到白名单**'
      + '（本文件的三档映射 + content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md 的「浏览器存储键白名单」表），'
      + '并逐条写明「为什么不上服务端」。',
    );
  });
  
  test('L2 白名单非空转 + 无僵尸登记（映射里的每个键都得真在代码里出现）', () => {
    const declared = [
      ...Object.keys(SERVER_AUTHORITATIVE), ...Object.keys(LOCAL_ONLY), ...Object.keys(UI_PREF_SESSION),
    ];
    assert.ok(declared.length >= 20, `三档映射只登记了 ${declared.length} 个键（下限 20）：映射被删空，L1 会变成恒真`);
    const all = new Set(ALL_KEYS);
    const zombie = declared.filter((k) => !all.has(k));
    assert.deepEqual(zombie, [],
      `以下键已不在代码中出现（僵尸登记，请从映射里删除）：\n  ${zombie.join('\n  ')}`);
    // 前缀档同样不得僵尸
    const prefixes = [
      ...Object.keys(SERVER_AUTHORITATIVE_PREFIXES), ...Object.keys(LOCAL_ONLY_PREFIXES), ...Object.keys(UI_PREF_SESSION_PREFIXES),
    ];
    const zombiePrefix = prefixes.filter((p) => !ALL_KEYS.some((k) => k.startsWith(p)));
    assert.deepEqual(zombiePrefix, [], `以下前缀已无任何键命中（僵尸登记）：\n  ${zombiePrefix.join('\n  ')}`);
    // 常量例外名单不得僵尸化，且不得悄悄变宽
    const zombieExc = Object.keys(NON_STORAGE_CONST_NAMES).filter((n) => !nonStorage.has(n));
    assert.deepEqual(zombieExc, [], `NON_STORAGE_CONST_NAMES 里的常量已不存在（僵尸例外，请删除）：\n  ${zombieExc.join('\n  ')}`);
    assert.ok(Object.keys(NON_STORAGE_CONST_NAMES).length <= 2,
      `NON_STORAGE_CONST_NAMES 涨到 ${Object.keys(NON_STORAGE_CONST_NAMES).length} 条（上限 2）：例外只许逐条给理由、不许悄悄变宽`);
  });
  
  test('L3 抽取口径有基线（防正则失效 → 一个键都抽不到 → 断言恒真）', () => {
    assert.ok(FILES.length >= 40, `只扫到 ${FILES.length} 个文件（基线 40）：扫描面被改坏，L1 会变成恒真`);
    assert.ok(callKeys.size >= 8, `存储调用字面量只抽到 ${callKeys.size} 个键（基线 8）：ⓐ 口径失效`);
    assert.ok(constKeys.size >= 15, `键名常量字面量只抽到 ${constKeys.size} 个键（基线 15）：ⓑ 口径失效`);
  });
  
  // ════════════════════════════════════════════════════════════════
  //  Task 2.2 / 2.5（2026-10-26）：缓存键四类清单 ＋ 缓存边界断言
  // ════════════════════════════════════════════════════════════════
  //  口径（spec「浏览器缓存边界」）：只允许纯展示偏好长期留在浏览器；业务读缓存必须带集合版本；
  //  auth 键不得承载业务数据。四类单一源＝`docs/src/data/cache-registry.js`。
  
  const readSource = (rel) => readFileSync(join(ROOT, rel), 'utf8');
  
  /** 归类一个键集合中的未登记项（供 L4 与故障注入共用） */
  const unregisteredOf = (keys) => keys.filter((k) => classifyCacheKey(k) === CACHE_CATEGORIES.UNKNOWN);
  
  test('L4 全仓存储键必须落入四类清单（未登记 ⇒ unknown ⇒ 红）', () => {
    const unregistered = unregisteredOf(ALL_KEYS);
    assert.deepEqual(
      unregistered.map((k) => `${k}（出现处：${[...(callKeys.get(k) || []), ...(constKeys.get(k) || [])].join(' / ')}）`), [],
      '发现**未登记到 cache-registry 的浏览器存储键**——请先在 `docs/src/data/cache-registry.js` 的 '
      + '`CACHE_KEYS` / `CACHE_KEY_PREFIXES` 登记类别与理由（visual / auth / read-cache / temp），'
      + '模板键（如 `gsm1921-pref-<id>-theme`）用前缀规则登记，不得用宽泛正则放过。',
    );
    // 非空转：四类都必须真实存在，否则「登记」会退化成全塞一类
    const seen = new Set(ALL_KEYS.map((k) => classifyCacheKey(k)));
    for (const c of [CACHE_CATEGORIES.VISUAL, CACHE_CATEGORIES.AUTH, CACHE_CATEGORIES.READ_CACHE, CACHE_CATEGORIES.TEMP]) {
      assert.ok(seen.has(c), `四类清单里的 ${c} 一个键都没命中：分类已失效`);
    }
  });
  
  test('L5 registry 不得有僵尸登记（精确键须真在代码出现；前缀须至少命中一个键）', () => {
    const all = new Set(ALL_KEYS);
    const zombie = Object.keys(CACHE_KEYS).filter((k) => !all.has(k));
    assert.deepEqual(zombie, [], `cache-registry 的以下精确键已不在代码中出现（僵尸登记，请删除）：\n  ${zombie.join('\n  ')}`);
    const zombiePrefix = CACHE_KEY_PREFIXES.filter((rule) => !ALL_KEYS.some((k) => k.startsWith(rule.prefix)));
    assert.deepEqual(zombiePrefix.map((r) => r.prefix), [], `cache-registry 的以下前缀已无任何键命中（僵尸登记）：\n  ${zombiePrefix.map((r) => r.prefix).join('\n  ')}`);
  });
  
  test('L6 visual 键白名单：只允许主题 / 字号 / 强调色 / 页签顺序 / UI 偏好开关', () => {
    const EXPECTED_VISUAL = [
      'gsm1921-remote-probe', // 探测开关（UI 偏好，默认开）
      'workflowos_accent_role',
      'workflowos_font_size',
      'workflowos_theme',
    ];
    const visual = Object.keys(CACHE_KEYS).filter((k) => CACHE_KEYS[k].category === CACHE_CATEGORIES.VISUAL);
    assert.deepEqual(visual.sort(), EXPECTED_VISUAL.sort(),
      'visual 类只允许纯展示 / UI 偏好键——业务键不得混入 visual（否则「清缓存后业务仍在」会被本地缓存冒充）');
    // 模板键：逐人外观偏好与页签记忆必须走前缀规则（不是正则放过）
    for (const k of ['gsm1921-pref-2400012349-theme', 'gsm1921-pref-2400012349-tab-order-secretary', 'workflowos_tab_secretary']) {
      assert.equal(classifyCacheKey(k), CACHE_CATEGORIES.VISUAL, `${k} 应归入 visual（前缀规则）`);
    }
    assert.equal(classifyCacheKey('gsm1921-unregistered-visual-probe'), CACHE_CATEGORIES.UNKNOWN,
      '未登记键必须返回 unknown（visual 白名单不得靠前缀误收）');
  });
  
  test('L7 业务读缓存备份必须带 `_versions` + `savedAt`，缺版本 / 过期 / 版本不一致 ⇒ 不得当权威', () => {
    const mockSrc = readSource('docs/src/data/mock-adapter.js');
    assert.equal(BACKUP_META.VERSIONS, '_versions', '备份版本字段名必须与服务端集合版本协议同名（`_versions`）');
    assert.equal(BACKUP_META.SAVED_AT, 'savedAt', '备份落盘时间字段名必须为 `savedAt`');
    assert.match(mockSrc, /\[BACKUP_META\.VERSIONS\]/, '`_saveToStorage` 必须写入 `_versions`（业务读缓存备份的版本）');
    assert.match(mockSrc, /\[BACKUP_META\.SAVED_AT\]/, '`_saveToStorage` 必须写入 `savedAt`（业务读缓存备份的落盘时间）');
    assert.match(mockSrc, /validateBackupPayload\(/, '读取本地备份时必须校验版本/时效（restoreNicheCollections）');
    assert.equal(classifyCacheKey('workflowos_branch_db_v1'), CACHE_CATEGORIES.READ_CACHE,
      '整库本地备份属于 read-cache，不得混入 visual');
  
    const now = Date.parse('2026-10-26T00:00:00Z');
    const expectedVersions = { activities: 3, notices: 7 };
    const ok = validateBackupPayload(
      { _versions: { activities: 3, notices: 7 }, savedAt: '2026-10-25T23:59:00Z', activities: [] },
      { expectedVersions, now },
    );
    assert.equal(ok.ok, true, `版本一致且未过期的备份应可用（实测 ${JSON.stringify(ok)}）`);
    const missing = validateBackupPayload({ activities: [], savedAt: '2026-10-25T23:59:00Z' }, { expectedVersions, now });
    assert.equal(missing.ok, false, '**删掉 `_versions` 必须判红**——旧备份不得当权威');
    assert.equal(missing.reason, 'missing-versions');
    const stale = validateBackupPayload(
      { _versions: { activities: 2, notices: 7 }, savedAt: '2026-10-25T23:59:00Z' },
      { expectedVersions, now },
    );
    assert.equal(stale.ok, false, '集合版本落后于服务端时必须判红（须从服务端重拉）');
    assert.match(stale.reason || '', /^stale:/);
    const expired = validateBackupPayload(
      { _versions: { activities: 3, notices: 7 }, savedAt: '2026-10-24T00:00:00Z' },
      { expectedVersions, now },
    );
    assert.equal(expired.ok, false, '超过有效期的备份必须判红（不得把陈年备份当权威）');
    assert.equal(expired.reason, 'expired');
  });
  
  test('L8 auth 键不得承载业务数据（token 只进 sessionStorage；auth 键与业务集合不相交）', () => {
    const authKeys = Object.keys(CACHE_KEYS).filter((k) => CACHE_KEYS[k].category === CACHE_CATEGORIES.AUTH);
    const businessNames = new Set([
      ...NICHE_COLLECTION_NAMES,
      'activities', 'tasks', 'attendances', 'inspections', 'taskforces',
      'notices', 'todos', 'assignments', 'makeupTasks', 'users',
    ]);
    const overlap = authKeys.filter((k) => businessNames.has(k));
    assert.deepEqual(overlap, [], `auth 键不得是业务集合键：${overlap.join(', ')}`);
    // API token 只允许写 sessionStorage（硬约束：不得写 localStorage）
    const localTokenWrites = FILES.filter((f) => /localStorage\.setItem\(\s*'gsm1921-api-token'/.test(readFileSync(f, 'utf8')));
    assert.deepEqual(localTokenWrites.map((f) => f.slice(ROOT.length + 1).replace(/\\/g, '/')), [],
      'API token 不得写入 localStorage（只允许 sessionStorage）');
    assert.equal(classifyCacheKey('gsm1921-api-token'), CACHE_CATEGORIES.AUTH);
    assert.equal(classifyCacheKey('gsm1921-login-user'), CACHE_CATEGORIES.AUTH);
  });
  
  test('L9 故障注入：新增未登记键 / 删掉备份版本，都必须红', () => {
    // ① 模拟「有人在 docs/src 新增了一个字面键但没登记」⇒ 分类为 unknown
    assert.deepEqual(unregisteredOf(['gsm1921-login-user', 'gsm1921-fault-injected-store']),
      ['gsm1921-fault-injected-store'], '新增未登记键必须被判为 unknown');
    // ② 模拟「备份写入时删掉 `_versions`」⇒ 校验失败
    const verdict = validateBackupPayload(
      { savedAt: new Date().toISOString(), activities: [] },
      { expectedVersions: { activities: 1 } },
    );
    assert.equal(verdict.ok, false, '删掉 `_versions` 的备份必须判红');
    assert.equal(verdict.reason, 'missing-versions');
  });
  
  test('L10 读口拒收缺版本 / 过期备份（restoreNicheCollections 返回 false，由调用方重拉）', async () => {
    const prev = globalThis.localStorage;
    const store = new Map();
    globalThis.localStorage = {
      getItem: (k) => (store.has(String(k)) ? store.get(String(k)) : null),
      setItem: (k, v) => store.set(String(k), String(v)),
      removeItem: (k) => { store.delete(String(k)); },
      clear: () => { store.clear(); },
      key: (i) => [...store.keys()][i] ?? null,
      get length() { return store.size; },
    };
    try {
      const { restoreNicheCollections } = await import('../../docs/src/data/mock-adapter.js?v=20261120a');
      store.set('workflowos_branch_db_v1', JSON.stringify({ activities: [{ id: 'stale' }] }));
      assert.equal(restoreNicheCollections({ expectedVersions: { activities: 1 } }), false,
        '缺 `_versions` 的本地备份不得被采用（否则旧备份会被当成服务端权威）');
      store.set('workflowos_branch_db_v1', JSON.stringify({
        _versions: { activities: 1 }, savedAt: new Date().toISOString(), experienceDeposits: [{ id: 'ed-1' }],
      }));
      assert.equal(restoreNicheCollections({ expectedVersions: { activities: 1 } }), true,
        '版本一致且未过期的备份应可作临时镜像');
    } finally {
      if (prev === undefined) delete globalThis.localStorage;
      else globalThis.localStorage = prev;
    }
  });

})();
