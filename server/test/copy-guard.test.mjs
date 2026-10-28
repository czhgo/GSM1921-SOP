// role: [工程师]+[AI]
// copy-guard.test.mjs — 守卫归并件（2026-10-27 批次 516 · B-515-2）
// 归并来源：copy-fold-guard.test.mjs · copy-length-guard.test.mjs · copy-master-guard.test.mjs · self-evident-copy-guard.test.mjs
// 2026-10-28 美学专项 Task 7：新增源件 5「卡头副题不承载操作指令」（SD-54 · S1/S2）。
// 纪律：只减文件数、不减断言数。每个源件包在独立 async 块作用域里（imports 转动态导入），
//   同名 helper / 常量互不冲突；失败信息仍保留各源件的横幅与断言名，便于定位。
// 运行：node --test server/test/copy-guard.test.mjs

// ═══ 源件 1：copy-fold-guard.test.mjs ═══
await (async () => {
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readdirSync, readFileSync } = await import('node:fs');
  const { join, relative, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');

  // role: [工程师]+[AI]
  // copy-fold-guard.test.mjs — 「折叠区口径是否有 help 同义段落」（DESIGN_SYSTEM §4.18 C8）的**登记 + 只报不判**守卫
  // （2026-09-25 文案存量清理批）
  //
  // 判据原文（§4.18.3 C8，逐字照录）：
  //   「**口径说明允许就地折叠，但不允许只在界面里存在一份**：折叠区内容必须与 help 的对应小节口径一致」；
  //   判据原文：「折叠文案若属**制度口径**，须在 `help.html` 有同义段落（改口径时两处同改；单处出现即视为孤本）」
  //
  // ⚠ **本守卫不判红**——如实说明为什么「机检不了」（这一条是上一批已登记、本批实读后**确认仍成立**的结论）：
  //   C8 的判据核心是「**同义**」。同义＝语义等价，**不是字符串等价**——「允许解散非空组」与「非空组也能解散」
  //   同义但零共享长串；反过来，两段共享长串也未必同义（前端匿名 / 后端实名）。任何用「字符重合 / 编辑距离 /
  //   关键词共现」搭出来的近似，都只能判**形近**，判不了**义同**；把它写成判红条件＝把「同义」偷换成「同串」，
  //   正是本仓反复警惕的「守卫越界假装覆盖」（见 doc-line-ref R4 的同类边界说明）。故 C8 **落纪律 + 人检清单**：
  //     · 机器能做的只有「**登记**」：列出全部折叠区，并标出「其文本在 help 里已有 ≥N8 字重合」＝**疑似已定点**；
  //     · 「疑似未定点」的那些进**人检清单**（下方打印），由人判「它是不是制度口径、help 有没有同义段落」。
  //
  // N8 取值（**只用于「疑似」提示，不作判红**）：取 C7 的 20 字——理由：折叠区若与 help 有 ≥20 字重合，必是
  //   「同一句在两处」，C8 要求的两处同改至少已满足「有对应段落」的形；取更小会大量假阳性，取更大则漏。
  //   **它不是 C8 的阈值**（C8 原文没给数字，只给了「同义」）——故只作提示，不作判据。
  //
  // 非空转：① 折叠区抽取正 / 负例 ② `docs/src` 里折叠区数 ≥ 基线下限（防「一个折叠区都抽不到 ⇒ 报告恒空」）
  //        ③ help 里定点卡片（`card-copy-*`）数 ≥ 基线下限（防登记表被删空）
  // 运行：node --test server/test/copy-fold-guard.test.mjs






  const HERE = dirname(fileURLToPath(import.meta.url));
  const ROOT = join(HERE, '..', '..');
  const SRC = join(ROOT, 'docs', 'src');
  const HELP = join(ROOT, 'docs', 'help.html');

  /** 「疑似已定点」的重合阈值（只作提示，见文件头；**不是 C8 的判据阈值**） */
  const N8 = 20;

  const SKIP_DIRS = ['mock', 'vendor', 'node_modules'];

  // ── 抽取（与 copy-master-guard 同族：剥注释 → 剥标签 → 解实体 → 去空白） ──
  function stripComments(src) {
    let s = String(src).replace(/\r\n?/g, '\n');
    s = s.replace(/\/\*[\s\S]*?\*\//g, ' ');
    s = s.replace(/<!--[\s\S]*?-->/g, ' ');
    return s.split('\n').map((line) => line.replace(/\/\/.*$/, '')).join('\n');
  }
  function decodeEntities(s) {
    return String(s).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
      .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  }
  const flatten = (html) => decodeEntities(String(html).replace(/<[^>]*>/g, ' ')).replace(/[\s\u3000]+/g, '');

  /** 抽出某源码里全部折叠区（`<details>` 的内容，去掉 `<summary>` 标题）；返回去空白后的正文数组 */
  function foldBodiesOf(src) {
    const s = stripComments(src).replace(/<script\b[\s\S]*?<\/script>/gi, ' ');
    const out = [];
    for (const m of s.matchAll(/<details\b[^>]*>([\s\S]*?)<\/details>/gi)) {
      const body = m[1].replace(/<summary\b[\s\S]*?<\/summary>/gi, ' ');
      const t = flatten(body);
      if (t) out.push(t);
    }
    return out;
  }

  function walk(dir, out = []) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.includes(e.name)) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p, out);
      else if (e.name.endsWith('.js')) out.push(p);
    }
    return out.sort();
  }

  /** 母本（help 正文）的全部 N8 字窗 */
  function gramSet(text, n = N8) {
    const s = new Set();
    for (let i = 0; i + n <= text.length; i++) s.add(text.slice(i, i + n));
    return s;
  }

  const HELP_TEXT = flatten(readFileSync(HELP, 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' '));
  const HELP_GRAMS = gramSet(HELP_TEXT);

  /** 该折叠区正文里是否存在 N8 字窗落在 help 里（＝疑似已有对应段落） */
  function overlapsHelp(body) {
    for (let i = 0; i + N8 <= body.length; i++) if (HELP_GRAMS.has(body.slice(i, i + N8))) return true;
    return false;
  }

  const FOLDS = walk(SRC).flatMap((abs) => foldBodiesOf(readFileSync(abs, 'utf8'))
    .map((body) => ({ file: relative(ROOT, abs).replace(/\\/g, '/'), body })));

  /** 折叠区数下限（非空转：低于此值说明抽取口径失效 / 报告恒空） */
  const FOLD_FLOOR = 8;
  /** help 定点卡片数下限（非空转：登记表不得被删空） */
  const CARD_FLOOR = 7;

  test('F1 非空转：折叠区抽取口径可用 + 折叠区 / 定点卡片规模达标', () => {
    // ① 正例：details 正文被抽出；summary 标题不计入
    assert.deepEqual(foldBodiesOf('<details><summary>口径 ▾</summary><p>应到＝正式＋预备</p></details>'),
      ['应到＝正式＋预备'], '抽取口径失效：折叠区正文没被抽出');
    // ① 负例：不在 details 里的文本不算折叠区
    assert.deepEqual(foldBodiesOf('<p>普通说明</p>'), [], '抽取口径过宽：非折叠文本被当成折叠区');
    // ② 规模下限
    assert.ok(FOLDS.length >= FOLD_FLOOR, `docs/src 里只抽到 ${FOLDS.length} 个折叠区（下限 ${FOLD_FLOOR}）：抽取口径失效 / 报告恒空`);
    const cards = [...readFileSync(HELP, 'utf8').matchAll(/id="(card-copy-[\w-]+)"/g)].map((m) => m[1]);
    assert.ok(cards.length >= CARD_FLOOR, `help 里定点卡片只剩 ${cards.length} 张（下限 ${CARD_FLOOR}）：C8 的「两处同改」少了一处`);
    assert.ok(HELP_TEXT.length > 10000, `help 正文只取到 ${HELP_TEXT.length} 字：母本提取疑似失效`);
  });

  test(`F2 折叠区口径登记（只报不判 / C8 机检不了「同义」）：${FOLDS.length} 个折叠区 vs help 定点 ${N8} 字疑似重合`, () => {
    const hit = FOLDS.filter((f) => overlapsHelp(f.body));
    const miss = FOLDS.filter((f) => !overlapsHelp(f.body));
    console.log(`[折叠区口径登记] 共 ${FOLDS.length} 个折叠区：与 help 有 ≥${N8} 字重合（**疑似已定点**）${hit.length} 个 ·`
      + ` 疑似未定点 ${miss.length} 个（**人检清单**：判它是不是制度口径、help 有无同义段落）`);
    for (const f of hit) console.log(`  · [疑似已定点] ${f.file} → 「${f.body.slice(0, 48)}…」`);
    for (const f of miss) console.log(`  · [人检] ${f.file} → 「${f.body.slice(0, 48)}…」（${f.body.length} 字）`);
    console.log('[C8 结论] 「同义」机检不了（见文件头）：本守卫只登记 + 出人检清单，不判红；'
      + '界面侧新增制度口径折叠区时，请同批在 help `#sec-copy-anchors` 加同义段落（或把它整段搬去 help 定点）。');
    // 只报不判：不设 assert.deepEqual(problems, [])。
  });

})();

// ═══ 源件 6：空态单一源守卫（2026-10-28 全站空态收口 · E1/E2）═══
await (async () => {
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readdirSync, readFileSync, existsSync } = await import('node:fs');
  const { join, relative, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');

  // role: [工程师]+[AI]
  // empty-state-guard（并入 copy-guard，2026-10-28 空态全站收口）
  //
  // 判据（DESIGN_SYSTEM §4.18 C6 / §4.20 表格空态 / §12.16 词表）：
  //   空态只从 `components/ui/empty-state.js::emptyStateHtml` 出（variant: panel / inline / table），
  //   不得在页面里手写「暂无 / 还没有 / 没有匹配 / 无匹配 / 请先登录」的空态标记。
  //
  // 判红面与抽取口径（为什么是「标签文本节点」）：
  //   · 面 ＝ `docs/src/**/*.js`（跳过 mock / vendor），减去组件自身 `empty-state.js`；
  //   · 剥注释（`//` · `/* */` · `<!-- -->`）→ 逐行找「`>` 与 `<` 之间的文本节点」里的关键字；
  //     裸字符串（`emptyMessage:` / `toast` / 数据兜底 `|| '暂无'`）不是空态标记 ⇒ 不计；
  //   · 排除：① 含 `emptyStateHtml(` 的行（组件出口）；② `<option>` 占位；
  //     ③ `empty-state__text` 静态骨架（`docs/index.html` / `search.html` 同款标记）；
  //     ④ `${…}` 插值内部（`>` 后紧跟 `$` 不进入匹配）——插值是运行时数据，不是手写文案。
  //   · 已知边界：`empty*.textContent = '暂无…'` 的写法不在本正则面内（静态近似），
  //     现有 0 处；若将来引入，应由 §4.18 C6 的 `emptyStringsOf` 面另判（本守卫不假装覆盖）。
  //
  // 判红 / 判据：
  //   E1 白名单之外的手写空态命中数 ＝ 0（迁移后基线 0；白名单 3 条逐条写理由）
  //   E2 非空转：① 反例（手写 `<p>暂无…</p>` / `请先登录` 必须命中）② 负例（组件调用 / option /
  //      静态骨架 / 裸字符串不得命中）③ 扫描面与组件采用规模下限 ④ 白名单条目数与僵尸登记
  // 运行：node --test server/test/copy-guard.test.mjs

  const HERE = dirname(fileURLToPath(import.meta.url));
  const ROOT = join(HERE, '..', '..');
  const SRC = join(ROOT, 'docs', 'src');

  const SKIP_DIRS = new Set(['mock', 'vendor', 'node_modules']);
  const SELF_REL = 'docs/src/components/ui/empty-state.js';

  /** 空态关键字（DESIGN_SYSTEM C6 / §12.16 词表口径） */
  const KEY_RE = /暂无|还没有|没有匹配|无匹配|请先登录/;
  /** 标签文本节点：`>` 与 `<` 之间、且不跨 `${` 插值 */
  const TEXT_NODE_RE = /(?<![=-])>[^<>$]*?(?:暂无|还没有|没有匹配|无匹配|请先登录)[^<>]*?</g;

  /** 剥注释（与同文件其它源件同口径） */
  function stripComments(src) {
    let s = String(src).replace(/\r\n?/g, '\n');
    s = s.replace(/\/\*[\s\S]*?\*\//g, ' ');
    s = s.replace(/<!--[\s\S]*?-->/g, ' ');
    return s.split('\n').map((line) => line.replace(/\/\/.*$/, ''));
  }

  /** 扫一段源码里的手写空态命中（供测试与反例自检共用） */
  function _scan(text) {
    const hits = [];
    for (const line of stripComments(text)) {
      if (!KEY_RE.test(line)) continue;
      if (/emptyStateHtml\s*\(/.test(line)) continue;
      if (/<option\b/i.test(line)) continue;
      if (/empty-state__text/.test(line)) continue;
      TEXT_NODE_RE.lastIndex = 0;
      let m;
      while ((m = TEXT_NODE_RE.exec(line))) hits.push(m[0]);
    }
    return hits;
  }

  function walk(dir, out = []) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(e.name)) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p, out);
      else if (e.name.endsWith('.js')) out.push(p);
    }
    return out.sort();
  }

  /** 白名单：每条都必须写理由；命中片段逐字（含 `>` / `<` 边界） */
  const WHITELIST = {
    'docs/src/components/dashboard/gallery.js': [
      { text: '>暂无活动照片<', why: '风采卡图位占位（图标 ＋ 一句），不是列表/页面空态区域；组件无图标槽' },
    ],
    'docs/src/components/ui/modal.js': [
      { text: '>（也就是还没有完成赋权）。<', why: '权限说明句里的「还没有」，是叙述不是空态' },
    ],
    'docs/src/entries/tabs/secretary/group-progress-tab.js': [
      { text: '>（本组暂无组长，「请组长关注」不可用）<', why: '行内状态括号注（说明按钮为何不可用），不是空态区域' },
    ],
  };

  /** 白名单规模（非空转：台账被删空 / 悄悄扩表都要判红） */
  const WHITELIST_FILES = 3;
  const WHITELIST_TOTAL = 3;
  /** 扫描面 / 组件采用规模下限（防「判红面被改小 ⇒ 恒真」） */
  const SCAN_FILES_FLOOR = 280;
  const COMPONENT_FILES_FLOOR = 60;
  const COMPONENT_CALLS_FLOOR = 120;

  const FILES = walk(SRC);
  const SCAN = FILES.map((abs) => {
    const file = relative(ROOT, abs).replace(/\\/g, '/');
    const src = readFileSync(abs, 'utf8');
    return { file, src, hits: file === SELF_REL ? [] : _scan(src) };
  });
  const COMPONENT_FILES = SCAN.filter((r) => /emptyStateHtml\s*\(/.test(r.src)).length;
  const COMPONENT_CALLS = SCAN.reduce((a, r) => a + (r.src.match(/emptyStateHtml\s*\(/g) || []).length, 0);

  test('E1 空态只从 empty-state.js 出：白名单外的手写空态命中数为 0', () => {
    const offenders = [];
    for (const { file, hits } of SCAN) {
      const known = new Set((WHITELIST[file] || []).map((x) => x.text));
      for (const h of hits) if (!known.has(h)) offenders.push(`${file} → 「${h}」`);
    }
    assert.deepEqual(offenders, [],
      '手写空态（DESIGN_SYSTEM §4.18 C6 / §4.20 / §12.16：空态只从 empty-state.js 出）——'
      + '改用 emptyStateHtml({ text, variant: \'inline\' | \'panel\' | \'table\' })；'
      + '白名单只收「不是空态区域的图位 / 行内状态 / 叙述句」，新增一条须写理由：\n  '
      + offenders.join('\n  '));
  });

  test('E2 非空转：反例命中 / 负例不误伤 + 扫描面与组件规模达标 + 白名单无僵尸', () => {
    // ① 反例：手写空态必须命中（正则写坏即红）
    assert.equal(_scan("el.innerHTML = '<p class=\"text-xs text-gray-500\">暂无记录</p>';").length, 1,
      '反例未命中：手写「暂无」空态必须被判红（匹配器坏了）');
    assert.equal(_scan("'<div class=\"card\"><p>请先登录</p></div>'").length, 1,
      '反例未命中：手写「请先登录」边缘态必须被判红');
    // ② 负例：组件出口 / option 占位 / 静态骨架 / 裸字符串都不得误伤
    assert.equal(_scan("emptyStateHtml({ text: '暂无记录', variant: 'inline' })").length, 0,
      '负例误伤：组件调用不是手写空态');
    assert.equal(_scan("'<option value=\"\">（暂无支委会场次）</option>'").length, 0,
      '负例误伤：下拉占位不是空态标记');
    assert.equal(_scan("'<p class=\"empty-state__text\">本月暂无活动</p>'").length, 0,
      '负例误伤：empty-state 静态骨架（docs/index.html 同款）不是手写空态');
    assert.equal(_scan("const x = '暂无';").length, 0,
      '负例误伤：数据兜底/计数字符串不是空态标记');
    assert.equal(_scan("// <p>暂无记录</p>").length, 0,
      '负例误伤：注释里的空态不是渲染标记');
    // ③ 扫描面与组件采用规模下限（防判红面被改小 / 组件被绕过）
    assert.ok(FILES.length >= SCAN_FILES_FLOOR,
      `只扫到 ${FILES.length} 份 docs/src 源码（下限 ${SCAN_FILES_FLOOR}）：判红面被改小`);
    assert.ok(COMPONENT_FILES >= COMPONENT_FILES_FLOOR,
      `只有 ${COMPONENT_FILES} 份文件使用 emptyStateHtml（下限 ${COMPONENT_FILES_FLOOR}）：组件 adoption 面疑似被绕过`);
    assert.ok(COMPONENT_CALLS >= COMPONENT_CALLS_FLOOR,
      `emptyStateHtml 调用只剩 ${COMPONENT_CALLS} 处（下限 ${COMPONENT_CALLS_FLOOR}）：空态单一源被拆散`);
    // ④ 白名单：条目数一致 + 文件存在 + 不是僵尸（该条命中仍存在）
    const files = Object.keys(WHITELIST);
    assert.equal(files.length, WHITELIST_FILES, '白名单文件数与声明值不一致（改台账须同步声明）');
    assert.equal(files.reduce((a, f) => a + WHITELIST[f].length, 0), WHITELIST_TOTAL,
      '白名单条数与声明值不一致（改台账须同步声明）');
    const gone = files.filter((f) => !existsSync(join(ROOT, f)));
    assert.deepEqual(gone, [], `白名单指向不存在的文件（应删该条）：\n  ${gone.join('\n  ')}`);
    const zombie = [];
    for (const f of files) {
      const hits = new Set((SCAN.find((r) => r.file === f) || { hits: [] }).hits);
      for (const x of WHITELIST[f]) if (!hits.has(x.text)) zombie.push(`${f} → 「${x.text}」（${x.why}）`);
    }
    assert.deepEqual(zombie, [],
      `以下白名单条目已不再命中，应删条目（收白名单）：\n  ${zombie.join('\n  ')}`);
    for (const f of files) for (const x of WHITELIST[f]) assert.ok(x.why && x.why.length >= 8,
      `白名单 ${f} 的「${x.text}」缺理由（新增白名单必须写清为什么不是空态）`);
  });

})();

// ═══ 源件 2：copy-length-guard.test.mjs ═══
await (async () => {
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readdirSync, readFileSync, existsSync } = await import('node:fs');
  const { join, relative, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');

  // role: [工程师]+[AI]
  // copy-length-guard.test.mjs — 「界面文案字数 / 括注 / 空态」存量回归防线（2026-09-25 文案存量清理批）
  //
  // 判据原文（DESIGN_SYSTEM §4.18 C1 / C2 / C5 / C6，逐字照录，**不得自创更严 / 更宽**）：
  //   C1「**面板/卡片导语 ≤ 60 字**，其后直接是控件或数据」；
  //      判据：「卡片内**首个**文本块的 `[...textContent.replace(/\s+/g,'')].length ≤ 60`。超 60 ⇒ 改为
  //      「一行摘要（≤60）＋ `<details>` 折叠全文」」
  //   C2「**单个连续说明段 ≤ 80 字**；超 80 必须拆段或折叠」；
  //      判据：「任一**不在关闭的 `details` 内 / 非 `summary`** 的块元素 `textContent` 去空白后 `> 80` ⇒ 红」
  //   C5「**单句括注 ≤ 2 个**（`（…）` 计数，含半角 `(...)`）」；判据：「单块内 `（` 出现 `≥3` 次 ⇒ 红」
  //   C6「**空态/错误态 ≤ 30 字**，只写「为什么空 ＋ 下一步动作」，不写安慰话 / 承诺」；
  //      判据：「空态容器（`.is-empty` / 「暂无 / 还没有」起始的块）文案 `> 30` 字 ⇒ 红」
  //   ⇒ 阈值 N1=60 / N2=80 / N5=3 / N6=30，全部取自上表，本守卫不改。
  //
  // 判红面与抽取口径（**源码静态近似**；与 copy-master-guard 的抽取同族，差异逐条写明）：
  //   · 面 ＝ `docs/src/**/*.js`，**减去** ① `docs/src/data/mock/**`（演示数据，非界面文案；§4.18.1 已认定
  //     「最重几屏的字数主要来自运行时数据」）② `docs/src/core/domain/function-catalog.js`（功能总览数据源，
  //     渲染在 `about.html` / `help.html` 两张**文档页**上——§4.18.1 明确文档页不受本节约束）。
  //   · 同族步骤（与 copy-master-guard 一致）：剥注释（`//` · `/* */` · `<!-- -->`）→ 解 HTML 实体 → 去空白（含全角空格）。
  //   · **差异（为什么必须加，见报告 ⑦）**：copy-master-guard 只需「整份文件的可见文本」做 ≥20 字重合搜索，
  //     故「剥标签→去空白」得一条长串即可；C1/C2/C5/C6 判的是**块元素/文本块**，若照搬「整份文件」口径会把
  //     JS 代码、mock 数据、CSS 串一并当成「块」⇒ 长度失真。故本守卫把口径收成**块级**：
  //       (a) 只取**反引号模板串**（界面 HTML 几乎都在模板串里），并剥 `${…}`（花括号配对 ⇒ 表达式代码不落入文案；
  //           插值属**运行时数据**，§4.18.1 认定其非界面文案，剥离方向 = 本口径**不更严**）；
  //       (b) 折叠不计入：整段删 `<details>…</details>`（含其 `summary`——C2 原文亦明确排除 summary，
  //           §4.18.5「折叠内容不计入视线」）；
  //       (c) 控件不计入：删 `<button>/<a>/<select>/<textarea>/<option>/<label>…</…>` 与 `<input>`（§4.18.5 可见文案排除控件父链）；
  //       (d) **块元素**＝块级标签（p/div/li/ul/ol/section/article/aside/header/footer/main/nav/h1-6/td/th/tr/table/
  //           thead/tbody/form/blockquote/pre/figure/figcaption/dl/dt/dd/fieldset/legend/caption/br）切段后的段文本；
  //           段内联标签（strong/em/code/span…）随标签去掉 ⇒ 归并进同一段。
  //   · 「说明性文本块」＝段文本含**汉字**（纯 ASCII 路径 / 类名 / 标识符不是「说明段」，同 C7 守卫对「整句」的收窄）。
  //
  // 判红 / 判据：
  //   L1 卡片导语 >60（C1）：模板串内、class 命中「卡片容器」的容器里**首个**文本块 = 导语候选；>60 ⇒ 红
  //   L2 单段 >80（C2）：块元素段文本 >80 ⇒ 红
  //   L3 单句括注 ≥3（C5）：段内 `（`＋`(` 计数 ≥3 ⇒ 红
  //   L4 空态 >30（C6）：以「暂无 / 还没有」起始的段或独立字符串字面量（`emptyMessage:` 等）>30 ⇒ 红
  //   L5 非空转：① 抽取口径正 / 负例（含 60/61 · 80/81 · 3/2 · 30/31 边界）② 基线规模下限 ＋ 条目数一致
  //              ③ 僵尸登记（基线文件不存在 / 该文件该类命中已清零）
  //   L6 缩减进度（只报不判）：四类当前命中数与基线对照、逐条列出现存命中
  //
  // 收基线纪律：把长说明改成「一行摘要（≤60）＋ `<details>` 折叠 ＋ help 深链」后，**同一批**从下方
  //   BASELINE_* 删条目 / 减计数——进度自动前进；**不得**为变绿把新命中补进基线。
  // 运行：node --test server/test/copy-length-guard.test.mjs






  const HERE = dirname(fileURLToPath(import.meta.url));
  const ROOT = join(HERE, '..', '..');
  const SRC = join(ROOT, 'docs', 'src');

  /** 判据阈值（DESIGN_SYSTEM §4.18 C1/C2/C5/C6 原文值，逐字取自上表） */
  const N1 = 60;  // 面板/卡片导语
  const N2 = 80;  // 单个连续说明段
  const N5 = 3;   // 单句括注个数
  const N6 = 30;  // 空态/错误态

  /** 面：docs/src 下全部 .js，减去演示数据与文档页数据源（理由见文件头） */
  const SKIP_DIRS = ['mock', 'vendor', 'node_modules'];
  const SKIP_FILES = ['docs/src/core/domain/function-catalog.js'];

  /** 块级标签（切段边界；单一源，L1–L4 共用） */
  const BLOCK_TAGS = ['p', 'div', 'li', 'ul', 'ol', 'section', 'article', 'aside', 'header', 'footer', 'main',
    'nav', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'td', 'th', 'tr', 'table', 'thead', 'tbody', 'form',
    'summary', 'blockquote', 'pre', 'figure', 'figcaption', 'dl', 'dt', 'dd', 'fieldset', 'legend', 'caption', 'br'];
  const BLOCK_RE = new RegExp(`</?(?:${BLOCK_TAGS.join('|')})\\b[^>]*>`, 'gi');
  /** 控件容器（整段删；§4.18.5 可见文案排除控件父链） */
  const CTRL_RE = /<(button|a|select|textarea|option|label)\b[\s\S]*?<\/\1>/gi;
  /** 卡片/面板容器识别（C1）：class 里含以 card 结尾的类名（card / help-card / stat-card / doc-card …）或 panel / doc-lead */
  const CARD_RE = /(?:^|[\s"'`-])(?:[a-z0-9-]*-)?card(?:[\s"'`-]|$)|panel|doc-lead/;
  /** 容器标签（L1 走标签栈时入栈的标签） */
  const CONTAINERS = new Set(['div', 'section', 'article', 'aside', 'li', 'form', 'fieldset', 'td', 'tr', 'table', 'details', 'nav', 'header', 'footer', 'main']);
  /** 空态/错误态起始词（C6 原文给的两种：`.is-empty` 容器 / 「暂无 / 还没有」起始） */
  const EMPTY_RE = /^(?:暂无|还没有)/;

  // ── 抽取口径（单一源；L1–L6 与 L5 自检共用） ─────────────────────────────
  /** 剥注释（与 copy-master-guard / ux-guard 同口径；CRLF 先归一，否则 `/\/\/.*$/` 会因 \r 失配） */
  function stripComments(src) {
    let s = String(src).replace(/\r\n?/g, '\n');
    s = s.replace(/\/\*[\s\S]*?\*\//g, ' ');
    s = s.replace(/<!--[\s\S]*?-->/g, ' ');
    return s.split('\n').map((line) => line.replace(/\/\/.*$/, '')).join('\n');
  }

  /** HTML 实体 → 字（与 copy-master-guard 同一子集 + 数字实体） */
  function decodeEntities(s) {
    return String(s)
      .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&');
  }

  /** 汉字个数（「说明性文本块」判据：至少 1 个汉字） */
  function cjkCount(s) {
    return (String(s).match(/[\u4e00-\u9fff]/g) || []).length;
  }

  /** 取全部反引号模板串内容；串内 `${…}`（花括号配对，含嵌套）整体剥掉（插值＝运行时数据，非文案） */
  function templatesOf(src) {
    const out = [];
    let i = 0;
    const n = String(src).length;
    while (i < n) {
      if (src[i] === '`') {
        i += 1;
        let buf = '';
        while (i < n) {
          const ch = src[i];
          if (ch === '\\') { buf += src.slice(i, i + 2); i += 2; continue; }
          if (ch === '$' && src[i + 1] === '{') {
            let d = 1; i += 2;
            while (i < n && d > 0) { const c = src[i]; if (c === '{') d += 1; else if (c === '}') d -= 1; i += 1; }
            continue;
          }
          if (ch === '`') { i += 1; break; }
          buf += ch; i += 1;
        }
        out.push(buf);
        continue;
      }
      i += 1;
    }
    return out;
  }

  /** 模板串清洗：删 script/style、折叠区（含 summary）、控件容器、input（见文件头 (b)(c)） */
  function cleanTemplate(tpl) {
    return String(tpl)
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<details\b[\s\S]*?<\/details>/gi, ' ')
      .replace(CTRL_RE, ' ')
      .replace(/<input\b[^>]*>/gi, ' ');
  }

  /** 块元素切段 ⇒ 段文本数组（去空白；留含汉字者） */
  function blocksOfTemplate(tpl) {
    const s = cleanTemplate(tpl).replace(BLOCK_RE, '\n').replace(/<[^>]*>/g, ' ');
    return decodeEntities(s).split('\n').map((t) => t.replace(/[\s\u3000]+/g, '')).filter((t) => t && cjkCount(t) > 0);
  }

  /** 卡片/面板容器内「首个文本块」＝导语候选（C1）；标签栈按文档序走，容器只认一次首块 */
  function cardLeadsOfTemplate(tpl) {
    const s = cleanTemplate(tpl);
    const out = [];
    const stack = [];
    const tok = /(<[^<>]*>)|([^<>]+)/g;
    let m;
    while ((m = tok.exec(s))) {
      if (m[1]) {
        const tag = m[1];
        const close = /^<\/([a-zA-Z0-9]+)/.exec(tag);
        if (close) {
          const name = close[1].toLowerCase();
          for (let k = stack.length - 1; k >= 0; k -= 1) { if (stack[k].name === name) { stack.length = k; break; } }
          continue;
        }
        const open = /^<([a-zA-Z0-9]+)/.exec(tag);
        if (!open) continue;
        const name = open[1].toLowerCase();
        if (tag.endsWith('/>') || !CONTAINERS.has(name)) continue;
        const cls = (/class\s*=\s*"([^"]*)"/.exec(tag) || /class\s*=\s*'([^']*)'/.exec(tag) || [, ''])[1];
        stack.push({ name, isCard: CARD_RE.test(cls), seen: false });
        continue;
      }
      const t = decodeEntities(m[2]).replace(/[\s\u3000]+/g, '');
      if (!t || !cjkCount(t)) continue;
      for (let k = stack.length - 1; k >= 0; k -= 1) {
        if (stack[k].isCard && !stack[k].seen) { stack[k].seen = true; out.push(t); break; }
      }
    }
    return out;
  }

  /** 独立字符串字面量里以「暂无 / 还没有」起始的块（C6 的 emptyMessage 等走这里；模板块走 blocksOfTemplate） */
  function emptyStringsOf(src) {
    const s = stripComments(src);
    const out = [];
    const re = /([`'"])((?:暂无|还没有)[^`'"\n]*)\1/g;
    let m;
    while ((m = re.exec(s))) {
      const t = decodeEntities(m[2]).replace(/[\s\u3000]+/g, '');
      if (t) out.push(t);
    }
    return out;
  }

  /** 括注计数（C5：全角 `（` 与半角 `(` 都算） */
  function parenCount(s) {
    return (s.match(/（/g) || []).length + (s.match(/\(/g) || []).length;
  }

  /** 递归收集判红面文件 */
  function scanFiles() {
    const out = [];
    const walk = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (SKIP_DIRS.includes(e.name)) continue;
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith('.js')) out.push(p);
      }
    };
    walk(SRC);
    return out.sort().map((p) => relative(ROOT, p).replace(/\\/g, '/')).filter((f) => !SKIP_FILES.includes(f));
  }

  /** 逐文件抽取四类命中 */
  function scan() {
    return scanFiles().map((file) => {
      const src = readFileSync(join(ROOT, file), 'utf8');
      const blocks = [];
      const leads = [];
      for (const tpl of templatesOf(stripComments(src))) {
        blocks.push(...blocksOfTemplate(tpl));
        leads.push(...cardLeadsOfTemplate(tpl));
      }
      const empties = [...blocks.filter((b) => EMPTY_RE.test(b)), ...emptyStringsOf(src)];
      return {
        file,
        leads,
        blocks,
        c1: leads.filter((t) => t.length > N1),
        c2: blocks.filter((t) => t.length > N2),
        c5: blocks.filter((t) => parenCount(t) >= N5),
        c6: [...new Set(empties.filter((t) => t.length > N6))],
      };
    });
  }

  // ── 基线（现存命中项；只为「新增」判红；收基线见文件头纪律） ──────────────
  /** C1：卡片导语 >60 的现存命中（2026-09-25 收基线时实测：**0 条**——现存卡片首块全部 ≤60；
   *  非空转由 L5 的「导语候选数 ≥ 100」保证，不是空壳）。 */
  const BASELINE_C1 = {};
  /** C2：单段 >80 的现存命中（文件 → 段文本数组）。2026-09-25 收基线时逐条读过：
   *  全部是**不在本批授权面内**的界面说明段（`org-setup-wizard` 换组织向导 / `settings-entry` 设置页 ——
   *  settings.html 刚整体重做、本批不动）与 `notice-entry` / `branches-tab` / `inspection-tab` /
   *  `leader/attendance-tab` / `group-progress-tab` 的既有长说明；`init-reset.js` 一条是控制台初始化提示
   *  （模板串，非界面文案——静态口径的已知噪声，如实登记待收）。⇒ 只为「新增」判红，待各自批次收。 */
  const BASELINE_C2 = {
    // 2026-10-22 第六轮审查收基线：`disc/inspection-tab` 督办导语、`org-setup-wizard` 名册预览段
    //   已压成一行 ⇒ 两条移除；C2 7→5、文件 5→4。
    // 2026-10-01 批次 315（支书 V-11「党委组织员本来不是我们支部的，为什么要强调」取甲）：
    //   `org-setup-wizard.js` 的「换组织向导的配置权限：党委组织员（party-staff）可配置任意支部；…」一条
    //   已随该句改写而**不再超 80 字** ⇒ **按收基线纪律同批删条目**、`BASE_C2_TOTAL` 12 → 11（文件数不变）。
    'docs/src/components/governance/org-setup-wizard.js': [
      '新支部为空、支书席位空缺：勾选后创建时一并就地任命首任骨干——新任支书凭本人账号登录即可接管该支部（组织信息/模块/名册可在支书工作台与支部配置中继续完善）。任命对象来自现有成员（如跨支部兼任/调任）：若其在原支部任支委/组长，原支部对应席位将空缺（界面明示）；人员后续也可在成员管理/名单导入中补入新支部后再次调整。',
      '新支部为空：config默认全开、业务域为空、支书席位空缺——勾选上方「就地任命首任骨干」时随创建一并任命（已就地任命首任支书/组织委员者，创建后即建册、支书登录即可接管新支部）；不勾选则按原路径：创建后在下方分步填入组织信息/模块/分工，或按「换壳工作单」补数据。记录变更：config.configChangeHistory追加branch-created。',
    ],
    'docs/src/entries/pages/settings-entry.js': [
      '提示：排序与恢复默认仅对当前账号（）生效，不影响支部默认顺序与他人。核心固定页签「」为全员必有，不可拖动、隐藏或排序；新页签由支部统一配置后出现，默认排于业务页签之后。',
    ],
    // 2026-10-20 第二轮界面细化：`settings-entry.js` 的「办活动要不要先过一道批准门…」
    //   已压成一句（卡导语 + 一行状态）⇒ C2 该文件 2 → 1；`notice-entry.js` 的「申诉『能，线上参加』后…」
    //   已整段删除（规则移 help #card-copy-attendance-record）⇒ 该文件 C2 归零、条目移除。收基线后
    //   `BASE_C2_FILES` 6 → 5、`BASE_C2_TOTAL` 9 → 7。
    // 2026-09-27（设置页可调性批次）：原「支部制度里的可调项分两类…」长段已拆成多条一行摘要
    //   （每条 ≤80 字、单句括注 ≤2）⇒ C2 5→4；该段原为 C5 唯一命中（括号数 ≥3）⇒ C5 1→0，条目同步移除。
    //   同批：help 侧把「配置变更记录 / 归属判定」两句搬成同义段（与界面 ≥20 字重合）⇒ 界面侧按 C7
    //   收成一行摘要（≤80），两处 C2 命中消失、条目移除 ⇒ C2 4→2。
    'docs/src/entries/tabs/leader/attendance-tab.js': [
      '考勤上传：组织者上传→纪检委员确认→录入考勤明细。仅列本组党小组会与本人为组织者的活动（主题党日/组织生活会等）；党课/支部党员大会的上传位在纪检委员（纪检台「会议考勤录入」），支委会不考勤；组长非组织者=本组监督位，督促上传',
    ],
    // 2026-10-18 工作台提质：党委 `branches-tab.js` 的整表替换长说明已改为一行摘要
    //   ⇒ 该文件 C2 归零、条目移除（收基线）；`BASE_C2_FILES` 7 → 6、`BASE_C2_TOTAL` 10 → 9。
    // 2026-10-04 批次 373（`#10` 按对象归位 · 支书圈乙）：「党小组活动」分区整段自 `group-progress-tab.js`
    //   迁 `calendar-tab.js`，原长说明**改写为本页卡片一行导语 + 条目空态**（均 ≤80）⇒ 该文件 C2 归零、
    //   条目移除（收基线）；`BASE_C2_FILES` 8 → 7、`BASE_C2_TOTAL` 11 → 10。
    'docs/src/services/core/init-reset.js': [
      '[InitReset]?reset=init已初始化为「新支部初始态」：业务过程数据已清空（个独立业务键移除+主库业务域置空），白名单保留（账号/成员档案/支部配置/在册状态/主题/登录会话），正在刷新',
    ],
  };
  /** C5：单句括注 ≥3 的现存命中。`org-setup-wizard` / `settings-entry` 属授权面外的长说明；
   *  `leader/attendance-tab` 一条是真界面文案；`branch-doc.js` 一条是**代码串**（静态口径已知噪声）。 */
  const BASELINE_C5 = {
    // 2026-10-01 批次 315（支书 V-11 取甲）：`org-setup-wizard.js` 原「党委组织员…（party-staff）…（副书同权）…（config…）」
    //   一句有 ≥3 个括注；改写后**括注降到 2** ⇒ 按收基线纪律同批删条目、`BASE_C5_TOTAL` 4 → 3（文件数不变）。
    'docs/src/components/governance/org-setup-wizard.js': [
      '新支部为空、支书席位空缺：勾选后创建时一并就地任命首任骨干——新任支书凭本人账号登录即可接管该支部（组织信息/模块/名册可在支书工作台与支部配置中继续完善）。任命对象来自现有成员（如跨支部兼任/调任）：若其在原支部任支委/组长，原支部对应席位将空缺（界面明示）；人员后续也可在成员管理/名单导入中补入新支部后再次调整。',
    ],
    'docs/src/entries/tabs/leader/attendance-tab.js': [
      '本组（）应到人（组内党员−滞留剔除）。滞留者已在候选中标灰禁选（悬浮查看备注）：',
    ],
    // 2026-09-27（设置页可调性批次）：原 `settings-entry.js` 的「支部制度里的可调项分两类…」一条为
    //   该文件唯一 C5 命中；本批把该长段拆成多条一行摘要（每条括注 ≤2）⇒ 该文件 C5 归零、条目移除（收基线）。
    'docs/src/services/branch/branch-doc.js': [
      "if(!isInstitutionManager(role))return{ok:false,reason:'制度文本仅限支书（含副支书）操作'};",
    ],
  };
  /** C6：空态 >30 的现存命中（全站实测 4 处，与 §4.18.2 C6 的「全站实测 4 处」一致；最长 41 字） */
  const BASELINE_C6 = {
    // 2026-10-23 R10 P3-14：`org/taskforce-tab.js` 的 37 字空态
    //   「暂无待核条目——专班成员在本专班详情…逐条核验」已收成「暂无待核条目」⇒ 该命中不再成立、
    //   条目移除（收基线）；`BASE_C6_FILES` 3 → 2、`BASE_C6_TOTAL` 3 → 2。
    // 2026-10-04 批次 373：原 `group-progress-tab.js` 的「党小组活动」空态**随分区迁 `calendar-tab.js`**
    //   并改短为 ≤30（`暂无党小组发起的活动（新建时选「自下而上」）`）⇒ 该命中不再成立、条目移除（收基线）；
    //   `BASE_C6_FILES` 4 → 3、`BASE_C6_TOTAL` 4 → 3。
    'docs/src/entries/tabs/secretary/report-up-tab.js': [
      '暂无上报记录·支部关键事项（发展节点/重要活动）上报后，党委批/驳结论将显示在这里',
    ],
    'docs/src/components/sections/references.js': [
      '暂无制度文本——可在「写入文件」中选择「制度文本」发布（支书/副支书）',
    ],
  };

  /** 基线规模（下限防「口径失效 / 台账被删减」；条目数一致防「改台账不如实声明」）
   *  2026-09-25 收基线实测值：C1 0/0 · C2 8 文件/15 条 · C5 4 文件/5 条 · C6 4 文件/4 条。
   *  2026-09-27（设置页可调性批次）收基线：settings-entry 长段拆成一行摘要 ⇒ C2 15→14（文件 8 不变）、
   *    C5 5→4（文件 4→3：settings-entry 该类归零、条目移除）；再随 help 侧同义段收「配置变更记录 / 归属判定」
   *    两处 C2 命中 ⇒ C2 14→12（文件 8 不变）。 */
  const BASE_C1_FILES = 0;
  const BASE_C1_TOTAL = 0;
  const BASE_C2_FILES = 4;
  const BASE_C2_TOTAL = 5;
  const BASE_C5_FILES = 3;
  const BASE_C5_TOTAL = 3;
  const BASE_C6_FILES = 2;
  const BASE_C6_TOTAL = 2;

  /** 「导语候选」下限（非空转：L1 若一个卡片都认不出 ⇒ 恒真） */
  const LEAD_CANDIDATE_FLOOR = 100;
  /** 「说明段」候选下限（非空转：L2/L3 若抽取口径失效 ⇒ 恒真） */
  const BLOCK_CANDIDATE_FLOOR = 1000;

  const SCAN = scan();
  const countOf = (key) => SCAN.reduce((a, r) => a + r[key].length, 0);
  const filesOf = (key) => SCAN.filter((r) => r[key].length).length;

  // ── L1 卡片导语 >60（C1） ───────────────────────────────────────────────
  test(`L1 面板/卡片导语 ≤${N1} 字（基线 ${BASE_C1_TOTAL} 条 / ${BASE_C1_FILES} 文件）`, () => {
    const offenders = [];
    for (const { file, c1 } of SCAN) {
      const known = new Set(BASELINE_C1[file] || []);
      for (const t of c1) if (!known.has(t)) offenders.push(`${file} → 「${t}」（${t.length} 字）`);
    }
    assert.deepEqual(offenders, [],
      `面板/卡片导语超 ${N1} 字（DESIGN_SYSTEM §4.18 C1）——改为「一行摘要（≤60）＋ <details> 折叠全文」：\n  ${offenders.join('\n  ')}`);
  });

  // ── L2 单段 >80（C2） ───────────────────────────────────────────────────
  test(`L2 单个连续说明段 ≤${N2} 字（基线 ${BASE_C2_TOTAL} 条 / ${BASE_C2_FILES} 文件）`, () => {
    const offenders = [];
    for (const { file, c2 } of SCAN) {
      const known = new Set(BASELINE_C2[file] || []);
      for (const t of c2) if (!known.has(t)) offenders.push(`${file} → 「${t}」（${t.length} 字）`);
    }
    assert.deepEqual(offenders, [],
      `单个连续说明段超 ${N2} 字（DESIGN_SYSTEM §4.18 C2）——须拆段或折叠：\n  ${offenders.join('\n  ')}`);
  });

  // ── L3 单句括注 ≥3（C5） ────────────────────────────────────────────────
  test(`L3 单句括注 ≤${N5 - 1} 个（基线 ${BASE_C5_TOTAL} 条 / ${BASE_C5_FILES} 文件）`, () => {
    const offenders = [];
    for (const { file, c5 } of SCAN) {
      const known = new Set(BASELINE_C5[file] || []);
      for (const t of c5) if (!known.has(t)) offenders.push(`${file} → 「${t}」（${parenCount(t)} 个括注）`);
    }
    assert.deepEqual(offenders, [],
      `单句括注 ≥${N5} 个（DESIGN_SYSTEM §4.18 C5）——批次号 / 裁定日期 / 源码位一律进折叠区：\n  ${offenders.join('\n  ')}`);
  });

  // ── L4 空态 >30（C6） ───────────────────────────────────────────────────
  test(`L4 空态/错误态 ≤${N6} 字（基线 ${BASE_C6_TOTAL} 条 / ${BASE_C6_FILES} 文件）`, () => {
    const offenders = [];
    for (const { file, c6 } of SCAN) {
      const known = new Set(BASELINE_C6[file] || []);
      for (const t of c6) if (!known.has(t)) offenders.push(`${file} → 「${t}」（${t.length} 字）`);
    }
    assert.deepEqual(offenders, [],
      `空态/错误态超 ${N6} 字（DESIGN_SYSTEM §4.18 C6）——只写「为什么空 ＋ 下一步动作」：\n  ${offenders.join('\n  ')}`);
  });

  // ── L5 非空转自检 ───────────────────────────────────────────────────────
  test('L5 非空转：抽取口径可用（含 4 处阈值边界）+ 候选 / 基线规模达标 + 无僵尸登记', () => {
    // ① 抽取口径正例：模板串里的说明段会被抽出（含内联标签归并）
    assert.deepEqual(blocksOfTemplate('<p>党员应到＝正式<strong>＋</strong>预备党员</p>'), ['党员应到＝正式＋预备党员'],
      '抽取口径失效：模板串里的说明段没被抽出（守卫会恒真）');
    // ① 负例：折叠区（details）不计入（含 summary）
    assert.deepEqual(blocksOfTemplate('<details><summary>口径 ▾</summary><p>很长的一段说明</p></details>'), [],
      '抽取口径过宽：折叠区里的文字被当成可见文案（§4.18.5 折叠内容不计入）');
    // ① 负例：控件文案不计入（§4.18.5 可见文案排除控件父链）
    assert.deepEqual(blocksOfTemplate('<button>新建线上支委会</button><a href="#">见帮助</a>'), [],
      '抽取口径过宽：控件里的文字被当成说明性文本');
    // ① 负例：非模板串（代码 / 单引号数据）不入块面
    assert.deepEqual(templatesOf("const s = '<p>很长的说明性文本</p>';"), [],
      '抽取口径过宽：单引号字符串被当成界面模板串');
    // ① 边界：C1 60/61、C2 80/81、C5 2/3、C6 30/31
    const mk = (n) => '说'.repeat(n);
    assert.equal(blocksOfTemplate(`<p>${mk(80)}</p>`)[0].length, 80, 'C2 边界：80 字应被抽出');
    assert.equal(blocksOfTemplate(`<p>${mk(80)}</p>`).filter((t) => t.length > N2).length, 0, 'C2 边界过宽：80 字被判红（原文为 >80）');
    assert.equal(blocksOfTemplate(`<p>${mk(81)}</p>`).filter((t) => t.length > N2).length, 1, 'C2 边界失效：81 字没被判红');
    assert.equal(cardLeadsOfTemplate(`<div class="card">${mk(60)}</div>`)[0].length, 60, 'C1 边界：60 字应被抽出');
    assert.equal(cardLeadsOfTemplate(`<div class="card">${mk(60)}</div>`).filter((t) => t.length > N1).length, 0, 'C1 边界过宽：60 字被判红（原文为 >60）');
    assert.equal(cardLeadsOfTemplate(`<div class="card">${mk(61)}</div>`).filter((t) => t.length > N1).length, 1, 'C1 边界失效：61 字没被判红');
    assert.equal(parenCount('（甲）（乙）'), 2, 'C5：2 个全角括注应数出 2');
    assert.equal(parenCount('（甲）（乙）(丙)'), 3, 'C5：全角 + 半角应一起数');
    assert.equal(emptyStringsOf("emptyMessage: '暂无反馈 · 成员提交后在此逐条核查'").length, 1, 'C6 边界失效：emptyMessage 字符串没被抽出');
    assert.equal(emptyStringsOf("x = '还没有数据'")[0].length, 5, 'C6：字符串段应抽出（去空白后长度）');

    // ② 候选规模下限（低于此值说明抽取口径失效，L1 / L2 会变成恒真）
    const leads = countOf('leads');
    const blocks = countOf('blocks');
    assert.ok(leads >= LEAD_CANDIDATE_FLOOR, `卡片导语候选只剩 ${leads} 个（下限 ${LEAD_CANDIDATE_FLOOR}）：抽取口径失效`);
    assert.ok(blocks >= BLOCK_CANDIDATE_FLOOR, `说明段候选只剩 ${blocks} 个（下限 ${BLOCK_CANDIDATE_FLOOR}）：抽取口径失效`);

    // ③ 基线规模与条目数一致
    const BASE = [
      ['C1', BASELINE_C1, BASE_C1_FILES, BASE_C1_TOTAL],
      ['C2', BASELINE_C2, BASE_C2_FILES, BASE_C2_TOTAL],
      ['C5', BASELINE_C5, BASE_C5_FILES, BASE_C5_TOTAL],
      ['C6', BASELINE_C6, BASE_C6_FILES, BASE_C6_TOTAL],
    ];
    for (const [name, map, files, total] of BASE) {
      assert.equal(Object.keys(map).length, files, `${name} 基线文件数与声明值不一致（改台账须同步声明）`);
      assert.equal(Object.values(map).reduce((a, v) => a + v.length, 0), total, `${name} 基线条数与声明值不一致`);
    }

    // ④ 僵尸登记：基线文件必须存在，且该文件该类命中仍 ≥ 基线条数
    for (const [name, map] of BASE) {
      const gone = Object.keys(map).filter((f) => !existsSync(join(ROOT, f)));
      assert.deepEqual(gone, [], `${name} 基线指向不存在的文件（应删该条）：\n  ${gone.join('\n  ')}`);
    }
    const emptied = [];
    for (const [name, map, , ] of BASE) {
      const key = { C1: 'c1', C2: 'c2', C5: 'c5', C6: 'c6' }[name];
      for (const r of SCAN) if (map[r.file] && r[key].length < map[r.file].length) emptied.push(`${name} ${r.file}：基线 ${map[r.file].length} → 现存 ${r[key].length}`);
    }
    assert.deepEqual(emptied, [], `以下文件该类命中已减少，应从基线删条目 / 减计数（收基线）：\n  ${emptied.join('\n  ')}`);
  });

  // ── L6 缩减进度（只报不判） ────────────────────────────────────────────
  test('L6 缩减进度：四类当前命中数与基线对照（逐条列出现存命中）', () => {
    const d = (cur, base) => (cur === base ? '持平' : cur < base ? `↓${base - cur}` : `↑${cur - base}`);
    const rows = [
      ['C1 卡片导语 >60', 'c1', BASE_C1_TOTAL, BASE_C1_FILES],
      ['C2 单段 >80', 'c2', BASE_C2_TOTAL, BASE_C2_FILES],
      ['C5 单句括注 ≥3', 'c5', BASE_C5_TOTAL, BASE_C5_FILES],
      ['C6 空态 >30', 'c6', BASE_C6_TOTAL, BASE_C6_FILES],
    ];
    console.log(`[文案字数守卫] 卡片导语候选 ${countOf('leads')} · 说明段候选 ${countOf('blocks')}`);
    for (const [label, key, total, files] of rows) {
      console.log(`  · ${label}：命中 ${countOf(key)} 条（基线 ${total}，${d(countOf(key), total)}）· 文件 ${filesOf(key)}（基线 ${files}）`);
    }
    for (const r of SCAN) {
      for (const [label, key] of [['C1', 'c1'], ['C2', 'c2'], ['C5', 'c5'], ['C6', 'c6']]) {
        for (const t of r[key]) console.log(`    ${label} ${r.file} → 「${t}」`);
      }
    }
    console.log('[收基线提示] 把长说明改成「一行摘要 ＋ <details> ＋ help 深链」后，同批删基线条目 / 减计数，进度即前进；不得为变绿补条目。');
    // 取基线工具（收基线 / 重建台账时用）：设 `COPY_LEN_PRINT_BASELINE=1` 即打印可直接粘贴的字面量
    if (process.env.COPY_LEN_PRINT_BASELINE) {
      const dump = (key) => {
        const m = {};
        for (const r of SCAN) if (r[key].length) m[r.file] = r[key];
        return JSON.stringify(m, null, 2);
      };
      for (const [name, key] of [['BASELINE_C1', 'c1'], ['BASELINE_C2', 'c2'], ['BASELINE_C5', 'c5'], ['BASELINE_C6', 'c6']]) {
        console.log(`== ${name} ==\n${dump(key)}`);
      }
    }
  });

})();

// ═══ 源件 3：copy-master-guard.test.mjs ═══
await (async () => {
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readdirSync, readFileSync, existsSync } = await import('node:fs');
  const { join, relative, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');

  // role: [工程师]+[AI]
  // copy-master-guard.test.mjs — 「界面复述制度母本」存量回归防线（2026-09-25 制度口径定点批）
  //
  // 判据原文（DESIGN_SYSTEM §4.18 C7，逐字照录，**不得自创更严 / 更宽**）：
  //   · 「**制度原文不进界面**：制度母本（`content/02_institution/**`、`content/01_strategy/references/**`）
  //      的整句不得搬进页面」
  //   · 「界面文案与制度母本存在 **连续 ≥20 字**子串重合 ⇒ 红，必须改写成一句口径 ＋ 指向
  //      `docs/help.html` 对应锚点的链接（**信息不丢，只搬家**）」
  //   ⇒ **N = 20**（C7 原文值，逐字取自上表），判红面 ＝ `docs/src/**` 的界面文本。
  //
  // 母本取哪一份（**如实标注**，见本批报告 ⑥「与本文不一致处」）：
  //   C7 原文点的母本路径是 `content/**`；本批把制度口径的正规去处落到 `docs/help.html`（界面只留一行 ＋ 深链），
  //   故判红面按本批任务书取 **help.html 页面正文**（strip 标签后的可见文本）。
  //   `content/**` 一侧另在 N4 以「**只报不判**」口径打印（体例同 control-font-guard 的 T4 全站口径）——
  //   **不并入判红面**：并入即等于把两个面取并集，比 C7 原文更严。
  //
  // 抽取口径（＝ §4.18.5 的 DOM 口径搬到源码上）：
  //   · 面 ＝ `docs/src/**/*.js` 里**会渲染出来的文本**：剥注释（`//` · `/* */` · `<!-- -->`）→ 剥标签
  //     （`<…>` 整段去掉 ⇒ title / placeholder / aria-label 等**属性值不计**入，与 §4.18.5「可见文案＝文本节点」同口径；
  //      上一批已把逐行重复说明改成 `title` 悬浮，正落在此口径的排除面上）→ 解 HTML 实体 → 去空白。
  //   · **「说明性文本」＝中文句子**：重合段里至少含 N 个汉字（C7 说的是「整句」）。
  //     纯 ASCII 的页名 / 文件路径 / 标识符（`party-committee.html`、`/services/member/party-group.js`、
  //     `content/02_institution/sop/`）不是「整句」，实测它们会与 help 里的同名可见文本假命中 ⇒ 明确排除。
  //   · 归一化：去空白（含全角空格）。**不做数字替换**——C7 原文无此口径（「数字→N」只属 C3）。
  //   · 判「连续 ≥20 字」：在去空白的界面文本上滑窗，任一 20 字窗出现在母本中即命中，再向两侧扩到最大重合段。
  //
  // 判红 / 判据：
  //   N1 新增重合：基线之外的 (文件, 重合片段) ⇒ 红（提示「该句应改为一行 ＋ help 深链」）
  //   N2 逐文件 ratchet：某文件重合条数 > 基线 ⇒ 红（同一句再复述一遍也算新增）
  //   N3 非空转：① 抽取口径正/负例（含 20/19 字边界）② 基线规模下限 ＋ 条目数一致 ③ 僵尸登记
  //              ④ 定点登记完整性（help 里每张定点的 id / data-copy-key / data-search / data-copy-source，
  //                 且 data-copy-source 文件真实存在）⑤ 界面深链可达（`docs/src` 里出现的 `./help.html#锚点`
  //                 必须在 help.html 真有该 id）
  //   N4 缩减进度（只报不判）：当前重合条数 / 文件数与基线对照、逐条列出现存命中；另打印 C7 原文母本
  //              （`content/**`）口径的重合数，供后续批次对照。
  //
  // 收基线纪律：把界面上的复述改成「一行 ＋ help 深链」后，**同一批**从 BASELINE 删掉该条 / 减小计数——
  //   进度自动前进；**不得**为变绿把新命中补进基线。
  // 运行：node --test server/test/copy-master-guard.test.mjs
  
  
  
  
  
  
  const HERE = dirname(fileURLToPath(import.meta.url));
  const ROOT = join(HERE, '..', '..');
  const DOCS = join(ROOT, 'docs');
  const SRC = join(DOCS, 'src');
  const HELP = join(DOCS, 'help.html');
  const CONTENT = join(ROOT, 'content');
  
  /** 判据阈值（DESIGN_SYSTEM §4.18 C7 原文值：连续 ≥20 字重合 ⇒ 红） */
  const N = 20;
  
  /** C7 原文点的母本路径（本守卫只在 N4 以「只报不判」口径用它） */
  const MASTER_DIRS = [
    join(CONTENT, '02_institution'),
    join(CONTENT, '01_strategy', 'references'),
  ];
  
  // ── 抽取口径（单一源；N1–N4 与 N3 自检共用） ────────────────────────────
  /** 剥注释（与 ux-guard 同口径：块注释 / HTML 注释 / 行注释；CRLF 先归一，否则 /\/\/.*$/ 会因 \r 失配） */
  function stripComments(src) {
    let s = String(src).replace(/\r\n?/g, '\n');
    s = s.replace(/\/\*[\s\S]*?\*\//g, ' ');
    s = s.replace(/<!--[\s\S]*?-->/g, ' ');
    s = s.split('\n').map((line) => line.replace(/\/\/.*$/, '')).join('\n');
    return s;
  }
  
  /** HTML 实体 → 字（只认帮助页/模板串实际用到的几种 + 数字实体） */
  function decodeEntities(s) {
    return String(s)
      .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&');
  }
  
  /** 剥标签 + 去空白 ⇒ 页面里真正会渲染出来的文本（属性值随标签一起去掉） */
  function visibleText(html) {
    return decodeEntities(String(html).replace(/<[^>]*>/g, ' ')).replace(/[\s\u3000]+/g, '');
  }
  
  /** 一份界面源码的「界面文本」 */
  function uiTextOf(src) {
    return visibleText(stripComments(src));
  }
  
  /** 一份 HTML 文档的「页面正文」（先摘掉 script / style / 注释，再剥标签去空白） */
  function pageTextOf(html) {
    const body = String(html)
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ');
    return visibleText(body);
  }
  
  /** 母本的全部 N 字窗（Set 查询 O(1)） */
  function gramSet(text, n = N) {
    const s = new Set();
    for (let i = 0; i + n <= text.length; i++) s.add(text.slice(i, i + n));
    return s;
  }
  
  /** 片段里的汉字个数（「说明性文本」判据：重合段须至少含 N 个汉字，纯 ASCII 路径/页名不算「整句」） */
  function cjkCount(s) {
    return (String(s).match(/[\u4e00-\u9fff]/g) || []).length;
  }
  
  /** 界面文本里所有与母本「连续 ≥N 字」的重合段（扩到最大；按出现序返回；只留中文说明性文本） */
  function findOverlaps(uiTxt, grams, n = N) {
    const out = [];
    let i = 0;
    while (i + n <= uiTxt.length) {
      if (!grams.has(uiTxt.slice(i, i + n))) { i++; continue; }
      let j = i + n;                       // 向后扩
      while (j < uiTxt.length && grams.has(uiTxt.slice(j - n + 1, j + 1))) j++;
      let s = i;                           // 向前扩
      while (s > 0 && grams.has(uiTxt.slice(s - 1, s - 1 + n))) s--;
      const frag = uiTxt.slice(s, j);
      if (cjkCount(frag) >= n) out.push(frag);
      i = j;
    }
    return out;
  }
  
  /** 递归收集文件（跳过第三方构建产物） */
  function walk(dir, exts, out = []) {
    let entries = [];
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
    for (const e of entries) {
      if (e.name === '.git' || e.name === 'vendor' || e.name === 'node_modules') continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p, exts, out);
      else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
    }
    return out.sort();
  }
  
  /** 逐份界面源码的重合结果 */
  function scan() {
    const grams = gramSet(pageTextOf(readFileSync(HELP, 'utf8')));
    return walk(SRC, ['.js']).map((abs) => {
      const file = relative(ROOT, abs).replace(/\\/g, '/');
      const src = readFileSync(abs, 'utf8');
      return { file, ui: uiTextOf(src), hits: findOverlaps(uiTextOf(src), grams) };
    });
  }
  
  // ── 基线（现存命中项；只为「新增」判红；收基线见文件头纪律） ──────────────
  /**
   * 文件 → 该文件已登记的重合片段（去空白后逐字）。
   * 存量性质（2026-09-25 收基线时逐条读过）：**全部是功能卡 / 通知模板 / 设置页 / about 页与 help 正文的
   * 既有同句**（help 用同一句话描述同一功能），**没有一条是本批两条迁移的残留**；本批不改这些界面
   * （about / settings / 通知模板等均不在本批授权面内）⇒ 逐条登记为基线，待各自批次收。
   */
  const BASELINE = {
    'docs/src/components/governance/org-setup-wizard.js': [
      '模块/块组合、角色分工与组织档案（页眉/自述/主题',            // 换组织向导表单标签（与 §5.2 向导说明同句）
      '；日常分工调整请走支书台「支部分工」的支委会议题流程',        // 向导内嵌分工说明（与 §5.2 同句）
    ],
    'docs/src/core/domain/system-notice-templates.js': [
      '已报送支委会表决，表决通过后将开放招募（截止',                // 系统通知模板正文（与 §3.6 专班说明同句）
    ],
    // `docs/src/entries/pages/about-entry.js` 条目已于 2026-10-11（批次 441）**收基线移除**：
    //   该句「本系统面向各类党支部与学生组织……」系宣传形态要去掉的平台化小字，本批从
    //   关于页 / 帮助页 / 首页三处一并删除（母本侧与界面侧重合同时消失）⇒ 按本守卫自身
    //   纪律（收基线＝删条目）删去，并同批下调 BASELINE_FILE_COUNT / BASELINE_TOTAL
    //   与 N3 两处硬下限（只降不升，见下方常量注释）。
    // `docs/src/entries/pages/party-committee-meeting-entry.js` 条目已于 2026-10-18（Task 4 去说明化）收基线：
    //   原「线上表决与线上记录的讨论结果即终局，不需线下追认」长说明已改为一句短提示 + help 深链，
    //   界面与母本不再有 ≥20 字连续重合 ⇒ 按收基线纪律删条目；文件数 7 → 6、条数 9 → 8，
    //   N3 两处硬下限同批下调为 `>= 6` / `>= 8`。
    'docs/src/entries/pages/settings-entry.js': [
      '未找到您所属支部——请先由党委在『支部管理』中确认归属',        // 设置页未绑定支部提示（与 §5.4 同句）
      // ⚠ 2026-10-01 批次 326 实跑发现（**只登记、本批不动**）：本条系**存量僵尸条目**——
      //   实际抽取出的命中已不含它（实测 10 条 vs 声明 11）；该句现只存在于 `docs/help.html`
      //   （母本侧），`settings-entry.js` 内 `grep '每次保存自动留痕'` 零命中。
      //   即：某历史批改写了该句却未同批收基线。**本批不下调**，因 `N3` 对 `BASELINE_TOTAL` 设了
      //   硬下限 `>= 11`（「台账被删减」防线）——要收它须**同一批同时下调该下限并说明**，属独立取证件。
      '档案/职责参数等）每次保存自动留痕：操作人、时间、变更项、前后', // 设置页配置留痕说明（与 §5.4 同句）
    ],
    // `docs/src/entries/tabs/disc/attendance-tab.js` 条目已于 2026-09-25「文案存量清理」批移除（收基线）：
    //   该文件两条同句（考勤上传位 / 录入即确认）已改为「一行摘要 ＋ help 深链 #card-copy-attendance-record」
    //   ⇒ 界面不再复述制度母本，按本守卫自身纪律（收基线＝删条目）删去。
    // `docs/src/entries/tabs/org/inspection-tab.js` 条目已于 2026-10-18「工作台提质」批移除（收基线）：
    //   该文件的「自动投递：纪检确认→考察总表…」长说明已改为一行摘要，界面与母本不再有 ≥20 字连续重合
    //   ⇒ 按收基线纪律删条目；`BASELINE_FILE_COUNT` 8 → 7、`BASELINE_TOTAL` 10 → 9，N3 下限同批下调。
    // `docs/src/entries/tabs/secretary/calendar-tab.js` 条目已于 2026-10-20（第二轮界面细化）收基线：
    //   活动写入人数口径的同义句（「人数按现时…剔除滞留成员，创建时锁定名单」）已删，只保留表单顶部的
    //   一次说明；界面与母本不再有 ≥20 字连续重合 ⇒ 按收基线纪律删条目，文件数 6 → 5、条数 8 → 7。
    'docs/src/entries/tabs/secretary/report-up-tab.js': [
      '节点（确定积极分子/发展对象、接收预备党员、按期转正等',        // 上报党委事项类型（与 §3.7 同句）
    ],
    'docs/src/components/sections/references.js': [
      '该制度当前已停用，以下为最近版本正文（仅供查阅）',            // 资料查询停用提示（与 §0.1 同句）
    ],
  };
  
  /** 基线规模（下限防「台账被删减」，条目数一致防「改台账不如实声明」）
   *  2026-09-25「文案存量清理」批收基线：`disc/attendance-tab.js`（2 条）已改为「一行 ＋ help 深链」
   *  ⇒ 文件 10 → 9、条数 13 → 11（两处同步下调，见上）；下限随真实值下调，**只降不升**。
   *  ⚠ 2026-10-01 批次 326 实跑发现一条僵尸条目（见上 `settings-entry.js` 处注释）：实测命中 10 条而降级
   *    防线要求 `>= 11` ⇒ **本批不回改**（要收须同一批同时下调下限并说明，属独立取证件）。
   *  2026-10-11（批次 441）：收 `about-entry.js` 条目（该平台化小字已从关于页 / 帮助页 / 首页三处删除，
   *    母本与界面侧重合同时清零）⇒ 文件 9 → 8、条数 11 → 10；N3 两处硬下限同批下调为 `>= 8` / `>= 10`
   *    （与上一条同规矩：只降不升、同批说明）。 */
  const BASELINE_FILE_COUNT = 5;
  const BASELINE_TOTAL = 7;
  
  /** 定点登记表（help.html 里 data-copy-key 卡片数）的下限，防台账被删空
   *  2026-09-25「文案存量清理」批：本批新增 4 张定点（issue-reveal / pcm-scope / attendance-record / makeup-scope）
   *  ⇒ 连同上一批 3 张共 7 张；下限随真实值上调（**只升不降**）。 */
  const COPY_CARD_BASELINE = 7;
  
  const SCAN = scan();
  
  // ── N1 新增重合 ────────────────────────────────────────────────────────
  test(`N1 界面复述制度母本：基线之外的「连续 ≥${N} 字重合」判红（基线 ${BASELINE_TOTAL} 条 / ${BASELINE_FILE_COUNT} 文件）`, () => {
    const offenders = [];
    for (const { file, hits } of SCAN) {
      if (!hits.length) continue;
      const known = new Set(BASELINE[file] || []);
      for (const h of hits) {
        if (!known.has(h)) offenders.push(`${file} → 「${h}」（${h.length} 字）`);
      }
    }
    assert.deepEqual(offenders, [],
      `界面在复述制度母本（DESIGN_SYSTEM §4.18 C7：连续 ≥${N} 字重合即红）——该句应改为「一行摘要（≤60 字）＋ help 深链」：\n  ${offenders.join('\n  ')}`);
  });
  
  // ── N2 逐文件 ratchet ──────────────────────────────────────────────────
  test('N2 逐文件 ratchet：某文件的重合条数不得高于基线（同一句再复述一遍也算新增）', () => {
    const grow = [];
    for (const { file, hits } of SCAN) {
      const base = BASELINE[file];
      if (!base) continue; // 新命中已由 N1 报出
      if (hits.length > base.length) grow.push(`${file} → ${hits.length} 条 > 基线 ${base.length} 条`);
    }
    assert.deepEqual(grow, [], `以下文件复述制度母本的条数高于基线（收基线后不得再长）：\n  ${grow.join('\n  ')}`);
  });
  
  // ── N3 非空转自检 ──────────────────────────────────────────────────────
  test('N3 非空转：抽取口径可用（含 20/19 字边界）+ 基线规模达标 + 无僵尸登记 + 定点登记完整 + 深链可达', () => {
    // ① 抽取口径正例：模板串里的说明行会被抽出
    assert.equal(uiTextOf('<p class="c">党员应到＝正式＋预备党员</p>'), '党员应到＝正式＋预备党员',
      '抽取口径失效：模板串里的说明行没被抽出（守卫会恒真）');
    // ① 负例：注释里的同一句不得计入（注释不渲染）
    assert.equal(uiTextOf('// 党员应到＝正式＋预备党员'), '',
      '抽取口径过宽：行注释里的文字被当成界面文本');
    assert.equal(uiTextOf('<!-- 党员应到＝正式＋预备党员 -->'), '',
      '抽取口径过宽：HTML 注释里的文字被当成界面文本');
    // ① 负例：属性值（title / placeholder）不是文本节点 ⇒ 不计入（§4.18.5 口径）
    assert.equal(uiTextOf('<div title="党员应到＝正式＋预备党员">ok</div>'), 'ok',
      '抽取口径过宽：属性值被当成界面文本（§4.18.5 的可见文案＝文本节点）');
    // ① 边界：恰好 20 字重合命中；19 字不命中（C7 原文阈值）
    const syn = '一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十'; // 30 字
    const gramsSyn = gramSet(syn);
    assert.deepEqual(findOverlaps(syn.slice(0, N), gramsSyn), [syn.slice(0, N)],
      `边界判据失效：恰好 ${N} 字的重合没被判出`);
    assert.deepEqual(findOverlaps(syn.slice(0, N - 1), gramsSyn), [],
      `边界判据过宽：${N - 1} 字的重合被判红（C7 原文阈值为 ≥${N} 字）`);
    // ① 母本剥 script/style/注释（帮助页 CSS 注释里的中文不得混进母本）
    const gramsHelp = gramSet(pageTextOf(readFileSync(HELP, 'utf8')));
    assert.ok(gramsHelp.size > 1000, `母本 N 字窗只有 ${gramsHelp.size} 个（页面正文提取疑似失效）`);
  
    // ② 基线规模下限（低于此值说明台账被删减或口径失效）
    const baseFiles = Object.keys(BASELINE);
    assert.ok(BASELINE_FILE_COUNT >= 5, `基线文件数过少（声明 ${BASELINE_FILE_COUNT}，下限 5）——台账被删减或抽取口径失效`);
    assert.ok(BASELINE_TOTAL >= 7, `基线条数过少（声明 ${BASELINE_TOTAL}，下限 7）——台账被删减或抽取口径失效`);
    assert.equal(baseFiles.length, BASELINE_FILE_COUNT,
      `基线条目数与声明的文件数不一致（实测 ${baseFiles.length} / 声明 ${BASELINE_FILE_COUNT}）`);
    assert.equal(baseFiles.reduce((a, f) => a + BASELINE[f].length, 0), BASELINE_TOTAL,
      '基线片段总数与声明值不一致（改台账须同步声明值）');
    // ③ 僵尸登记：基线文件必须真实存在，且该文件仍应有重合命中
    const gone = baseFiles.filter((f) => !existsSync(join(ROOT, f)));
    assert.deepEqual(gone, [], `基线条目指向不存在的文件（应删除该条）：\n  ${gone.join('\n  ')}`);
    const emptied = SCAN.filter(({ file, hits }) => BASELINE[file] && !hits.length).map(({ file }) => file);
    assert.deepEqual(emptied, [],
      `以下文件的重合已清零，应从 BASELINE 删除该条（收基线）：\n  ${emptied.join('\n  ')}`);
  
    // ④ 定点登记完整性：help.html 里每张定点卡的 id / data-copy-key / data-search / data-copy-source 齐备，
    //    且 data-copy-source 指向的界面文件真实存在（登记表＝help 自身的数据结构，不另建台账文件）
    const helpSrc = readFileSync(HELP, 'utf8');
    const cards = [...helpSrc.matchAll(/<div\b[^>]*\bid="(card-copy-[\w-]+)"[^>]*>/g)].map((m) => m[0]);
    assert.ok(cards.length >= COPY_CARD_BASELINE,
      `help.html 的定点点位只剩 ${cards.length} 张（基线 ${COPY_CARD_BASELINE}）——定点台账被删空，界面深链会成死链`);
    const cardIds = new Set();
    for (const tag of cards) {
      const id = /id="([^"]+)"/.exec(tag)[1];
      assert.ok(!cardIds.has(id), `help.html 定点 id 重复：${id}（每条口径只允许一处）`);
      cardIds.add(id);
      const key = /data-copy-key="([^"]+)"/.exec(tag);
      assert.ok(key && key[1], `定点 ${id} 缺 data-copy-key（登记主键，守卫按它核台账）`);
      assert.ok(/data-search="[^"]+"/.test(tag), `定点 ${id} 缺 data-search（help 搜索索引只收 .help-card[data-search]，缺了用户搜不到）`);
      const srcs = (/data-copy-source="([^"]*)"/.exec(tag) || [, ''])[1].split(',').map((s) => s.trim()).filter(Boolean);
      assert.ok(srcs.length, `定点 ${id} 缺 data-copy-source（该口径原挂在哪份界面文件——迁移去向须可反查）`);
      for (const s of srcs) {
        assert.ok(existsSync(join(ROOT, s)), `定点 ${id} 的 data-copy-source 指向不存在的文件：${s}`);
      }
      // 2026-10-20 支书裁定：帮助页不再写「原文（原为…）」这类版本叙事，直接写现行口径
      //   ⇒ 哨兵从「必须出现『原文』二字」改成「卡片正文须有 ≥40 个汉字的可执行口径」，
      //   防的是「卡片被删空 / 只剩标题」（非空转）；id / key / search / source / 深链检查一字未放宽。
      const cardSlice = helpSrc.slice(helpSrc.indexOf(tag), helpSrc.indexOf(tag) + 2600);
      const cardCjk = (cardSlice.replace(/<[^>]*>/g, '').match(/[\u4e00-\u9fff]/g) || []).length;
      assert.ok(cardCjk >= 40,
        `定点 ${id} 正文过短（${cardCjk} 个汉字）——被删掉的界面语义须在 help 有可执行口径（C7「信息不丢，只搬家」）`);
    }
  
    // ⑤ 界面深链可达：docs/src 里出现的 ./help.html#<锚点> 必须在 help.html 真有该 id
    const deepLinks = [];
    for (const abs of walk(SRC, ['.js'])) {
      const src = readFileSync(abs, 'utf8');
      for (const m of src.matchAll(/\.\/help\.html#([\w-]+)/g)) {
        deepLinks.push({ file: relative(ROOT, abs).replace(/\\/g, '/'), id: m[1] });
      }
    }
    assert.ok(deepLinks.length >= 2, `界面里的 help 深链只剩 ${deepLinks.length} 处（基线 2）——本批的两条迁移被撤了？`);
    const dead = deepLinks.filter((d) => !new RegExp(`id="${d.id}"`).test(helpSrc));
    assert.deepEqual(dead.map((d) => `${d.file} → #${d.id}`), [],
      '界面深链指向 help.html 里不存在的锚点（死链）：\n  ' + dead.map((d) => `${d.file} → #${d.id}`).join('\n  '));
  });
  
  // ── N4 缩减进度（只报不判） ────────────────────────────────────────────
  test('N4 缩减进度：当前重合条数 / 文件数与基线对照（另打印 C7 原文母本 content/** 口径）', () => {
    const rows = SCAN.filter((r) => r.hits.length);
    const total = rows.reduce((a, r) => a + r.hits.length, 0);
    const d = (cur, base) => (cur === base ? '持平' : cur < base ? `↓${base - cur}` : `↑${cur - base}`);
    console.log(`[界面复述制度母本] 命中 ${total} 条（基线 ${BASELINE_TOTAL}，${d(total, BASELINE_TOTAL)}）`
      + ` · 文件 ${rows.length}（基线 ${BASELINE_FILE_COUNT}，${d(rows.length, BASELINE_FILE_COUNT)}）· 阈值 ≥${N} 字`);
    for (const r of rows) {
      for (const h of r.hits) console.log(`  · ${r.file} → 「${h}」（${h.length} 字）`);
    }
    // C7 原文母本（content/**）口径：只报不判（并入判红面即比 C7 原文更严，见文件头）
    const masterFiles = MASTER_DIRS.flatMap((dir) => walk(dir, ['.md']));
    const masterText = masterFiles
      .map((f) => readFileSync(f, 'utf8').replace(/[*`_#>|[\]()]/g, '')) // md 标记近似剥离（只作对照）
      .join('\n');
    const gramsMaster = gramSet(visibleText(masterText));
    let alt = 0;
    const altFiles = [];
    for (const { file, ui } of SCAN) {
      for (const h of findOverlaps(ui, gramsMaster)) {
        alt++; altFiles.push(`${file} → 「${h}」（${h.length} 字）`);
      }
    }
    console.log(`[只报不判 · C7 原文母本 ${masterFiles.length} 份 content/**.md] 命中 ${alt} 条`
      + `${altFiles.length ? '：\n  ' + altFiles.join('\n  ') : '（0 条）'}`);
    console.log('[收基线提示] 把复述改成「一行 ＋ help 深链」后，同批从 BASELINE 删条目 / 减小计数，进度即前进；不得为变绿补条目。');
  });

})();

// ═══ 源件 4：self-evident-copy-guard.test.mjs ═══
await (async () => {
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync, readdirSync, statSync } = await import('node:fs');
  const { join, dirname, relative } = await import('node:path');
  const { fileURLToPath } = await import('node:url');

  /**
   * 「此地无银三百两」守卫（2026-09-29 批次 294 立 · 支书评议裁定）
   *
   * 来源（支书逐字）：
   *   「此地无银三百两。你的显示、功能已经是最好的说明了。干嘛多此一举？
   *     你要全仓库检查 if the UI can tell itself, you needn't use the tedious expressions.」
   *
   * 判据：下表「自明句 / 机器话」在 `docs/src/**` **零命中**（棘轮：只许减不许增）。
   *   每条注明**为什么**——它们都在**替 UI 说话**（把界面本可自明的事再讲一遍）。
   *
   * ⚠ 入表门槛（防误伤）：只收**明确**的 tic（几乎只出现在用户可见文案里的成句）；
   *   泛词（如「注意」「说明」）**不入表**——它们大量出现在代码注释里，入表即误报。
   *   守卫只扫 `docs/src/**` 的源码文本（含注释），故入表词必须「注释里也不该出现」。
   *
   * ⚠ 非空转：本守卫自带反例自检（`_scan` 对植入样本必须命中）——防「正则写坏恒绿」。
   */






  const __dirname = dirname(fileURLToPath(import.meta.url));
  const SRC = join(__dirname, '..', '..', 'docs', 'src');

  /** 自明句 / 机器话黑名单（零容忍，只可增补理由，不可删） */
  const BANNED = [
    { p: '你只会看到', why: '替界面解释可见性——界面本身就只显示该显示的' },
    { p: '无需调试器', why: '机器话；把给人看的页面说成调试工具' },
    { p: '此地无银', why: '自明还要强调自明' },
    { p: '一目了然', why: '替读者下结论' },
    { p: '显而易见', why: '替读者下结论' },
    { p: '顾名思义', why: '名字已自明，不必再解' },
    { p: '如你所见', why: '指着屏幕说话' },
    // 2026-10-21 R3 批次（逐条对应 UI_AUDIT_R3 的「此地无银」与冗余说明；完整口径在 help）
    { p: '随机令牌比对', why: 'R3-08：100 字令牌机制说明移 help，界面只需一句可执行提示' },
    { p: '开放中指派，可评论或提交处置结果', why: 'R3-08：段标题与按钮已表达，不需要再解释一遍' },
    { p: '等待支书确认', why: 'R3-17：同一摘要里「待支书确认：」已在前，尾部重复' },
    { p: '推荐填写', why: 'R3-18：星号与字段本身已表达，不用含糊的「推荐填写」' },
    { p: '仅「滞留」时填写', why: 'R3-18：用占位符教人何时填，属规则说明' },
    { p: '取消「只看我参与的」可查看支部全部专班', why: 'R3-15：筛选器就在同一行，空态不要教用户操作' },
    { p: '本人暂无参与或受权的专班', why: 'R3-15：「受权」非用户词，空态应直说真实状态' },
    { p: '发布专班后立即通知全体成员', why: 'R3-27：勾选框已表达，不需要再解释一次' },
    { p: '此提醒只给你本人看', why: 'R3-21：提交页无需解释可见性（阅读页已有本人标记）' },
    { p: '列＝最近 6 个专班', why: 'R3-14：hint 只留「最近 6 个」，不解释实现细节' },
    { p: '已报送支书确认，生效前保持现值', why: 'R3-17：40 字 pill title 讲路由，徽章已写状态' },
    { p: '提交即入库归档至个人档案；本页只收本人提交', why: 'R3-21：同页三次说归档，删到只剩必要提示' },
    { p: '完整记录在成员个人档案', why: 'R3-12：聚合页不冒充个人档案入口，改用真实落点' },
  ];

  function walkJs(dir, out = []) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) walkJs(p, out);
      else if (name.endsWith('.js')) out.push(p);
    }
    return out;
  }

  /** 扫一段文本，返回命中项（供测试与反例自检共用） */
  function _scan(text) {
    const hits = [];
    for (const { p, why } of BANNED) {
      if (text.includes(p)) hits.push(`${p}（${why}）`);
    }
    return hits;
  }

  test('Z1「此地无银」自明句零命中：docs/src 不得出现替 UI 说话的多余说明', () => {
    const problems = [];
    let scanned = 0;
    for (const f of walkJs(SRC)) {
      scanned++;
      const hits = _scan(readFileSync(f, 'utf8'));
      if (hits.length) problems.push(`${relative(join(__dirname, '..', '..'), f)} → ${hits.join(' / ')}`);
    }
    assert.ok(scanned >= 100, `只扫到 ${scanned} 个 js 文件（基线 100）：扫描面被改坏了`);
    assert.deepEqual(problems, [], `发现「此地无银」自明句（界面已自明 ⇒ 删掉该说明，勿替 UI 说话）：\n  ${problems.join('\n  ')}`);
  });

  test('Z2 非空转：黑名单匹配器对植入样本必须命中', () => {
    const planted = `const x = '这里你只会看到与本区相关的内容，无需调试器即可自查';`;
    const hits = _scan(planted);
    assert.ok(hits.length >= 2, `匹配器坏了（植入样本只命中 ${hits.length} 条）`);
  });

})();

// ═══ 源件 5：卡头副题不承载操作指令（SD-54 · 2026-10-28 美学专项 Task 7）═══
await (async () => {
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync, readdirSync } = await import('node:fs');
  const { join, relative, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');

  // role: [工程师]+[AI]
  // 卡头副题守卫（2026-10-28 美学专项 Task 7 · SD-54；并入 copy-guard）
  //
  // 判据原文（DESIGN_SYSTEM §12.15 SD-54）：
  //   「卡头副题只写『范围 + 约束』；不得出现操作指令（点击…查看 / 点上方 / 点右上角 / 下一步：）」
  //
  // 判红面为什么收成「副题本体」而不是「整份文件」：SD-54 管的是**第二行的承载分工**——
  //   卡头第二行是信息位，不得改成「怎么点」的说明。空态 / 错误态文案（`下一步：…`）属 §4.18 C6，
  //   不在本条；故口径取两类**副题声明**：
  //     ① `renderCardHeader({ … meta: … })` 的 `meta`（卡头副题单一源，`components/shell/page-frame.js`）；
  //     ② `<h3>…</h3>` 紧跟的 `text-xs` 副题 span（手写卡头，如 `taskforce-view` 的「全支部 · 只读」）。
  //   运行时用 `textContent` 覆写某个 span 的分支不定义副题单一源，不入口径（判据只管声明处）。
  //
  // 判红 / 判据：
  //   S1 副题命中操作指令 ⇒ 红（`点击[^，。]{0,8}查看` / `点上方` / `点右上角` / `下一步：`）
  //   S2 非空转：① 两类副题都能抽出（含 `renderCardHeader` 多行调用）② 反例「点击卡片查看详情」必须命中
  //              ③ 负例「全支部 · 只读」不得命中 ④ 副题数 ≥ 下限（抽取口径失效即红）
  // 运行：node --test server/test/copy-guard.test.mjs

  const HERE = dirname(fileURLToPath(import.meta.url));
  const ROOT = join(HERE, '..', '..');
  const SRC = join(ROOT, 'docs', 'src');

  /** 本轮判红面（DESIGN_SYSTEM §12.15 SD-54）：四份 record 组件 ＋ entries/tabs/** */
  const RECORD_FILES = ['activity-view', 'workgroup-view', 'taskforce-view', 'inspector']
    .map((n) => join(SRC, 'components', 'record', `${n}.js`));

  /** 副题里不得出现的操作指令（SD-54 原文四式） */
  const BANNED_RE = /点击[^，。]{0,8}查看|点上方|点右上角|下一步：/;

  /** 副题数下限（实测 25 条；低于此值说明抽取口径失效 ⇒ S1 会恒真） */
  const SUBTITLE_FLOOR = 15;

  function walkJs(dir, out = []) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walkJs(p, out);
      else if (e.name.endsWith('.js')) out.push(p);
    }
    return out;
  }

  /** 截取 `renderCardHeader(` 起的整个调用（括号配平；跳过字符串 / 模板串） */
  function callText(src, start) {
    let depth = 0;
    let quote = null;
    const open = src.indexOf('(', start);
    for (let k = open; k < src.length; k += 1) {
      const c = src[k];
      if (quote) {
        if (c === '\\') { k += 1; continue; }
        if (c === quote) quote = null;
        continue;
      }
      if (c === '`' || c === "'" || c === '"') { quote = c; continue; }
      if (c === '(') depth += 1;
      else if (c === ')') { depth -= 1; if (!depth) return src.slice(start, k + 1); }
    }
    return src.slice(start);
  }

  /** 取调用里的 `meta:` 字面量（引号 / 模板串；表达式形式的 meta 不判） */
  function metaOf(call) {
    const m = /meta\s*:\s*/.exec(call);
    if (!m) return null;
    const vs = m.index + m[0].length;
    const q = call[vs];
    if (!['`', "'", '"'].includes(q)) return null;
    let k = vs + 1;
    while (k < call.length && call[k] !== q) {
      if (call[k] === '\\') { k += 2; continue; }
      k += 1;
    }
    return call.slice(vs + 1, k);
  }

  /** 手写卡头：`<h3>…</h3>` 紧跟的 `text-xs` 副题 span */
  const HAND_SPAN_RE = /<h3\b[^>]*>[\s\S]*?<\/h3>\s*<span\b[^>]*class="[^"]*text-xs[^"]*"[^>]*>([\s\S]*?)<\/span>/g;

  /** 去插值 / 去标签 / 去空白 ⇒ 副题的可见文本 */
  const flat = (s) => String(s).replace(/\$\{[^{}]*\}/g, ' ').replace(/<[^>]*>/g, ' ')
    .replace(/[\s\u3000]+/g, '');

  /** 一份源码里的全部副题声明 */
  function subtitlesOf(src) {
    const out = [];
    for (let i = src.indexOf('renderCardHeader('); i !== -1; i = src.indexOf('renderCardHeader(', i + 1)) {
      const m = metaOf(callText(src, i));
      if (m !== null) out.push({ kind: 'meta', text: flat(m) });
    }
    for (const m of src.matchAll(HAND_SPAN_RE)) out.push({ kind: 'span', text: flat(m[1]) });
    return out;
  }

  const FILES = [...RECORD_FILES, ...walkJs(join(SRC, 'entries', 'tabs'))].sort();
  const SUBS = FILES.flatMap((abs) => subtitlesOf(readFileSync(abs, 'utf8'))
    .map((s) => ({ file: relative(ROOT, abs).replace(/\\/g, '/'), ...s })));

  test(`S1 卡头副题只写「范围 + 约束」：操作指令命中数为 0（实测 ${SUBS.length} 条副题）`, () => {
    const offenders = SUBS.filter((s) => BANNED_RE.test(s.text))
      .map((s) => `${s.file} → 「${s.text}」（${s.kind === 'meta' ? 'renderCardHeader meta' : '手写卡头 span'}）`);
    assert.deepEqual(offenders, [],
      `卡头副题出现操作指令（DESIGN_SYSTEM §12.15 SD-54）——第二行只写范围 + 约束，`
      + `「怎么点」交给行载体自身（hover / 焦点 / 箭头）：\n  ${offenders.join('\n  ')}`);
  });

  test(`S2 非空转：副题抽取口径可用（反例命中 / 负例不命中）+ 副题数 ≥ ${SUBTITLE_FLOOR}`, () => {
    // ① 两类副题都能抽出（含多行调用）
    assert.deepEqual(subtitlesOf("renderCardHeader({ title: '活动工作组', meta: '本支部 · 只读' })")
      .map((s) => s.text), ['本支部·只读'], '抽取口径失效：renderCardHeader 的 meta 没被抽出（守卫会恒真）');
    assert.deepEqual(subtitlesOf("<h3>专班查看</h3>\n          <span class=\"text-xs text-gray-500\">全支部 · 只读</span>")
      .map((s) => s.text), ['全支部·只读'], '抽取口径失效：手写卡头副题 span 没被抽出');
    // ② 反例：操作指令必须被判命中
    const planted = "renderCardHeader({ title: '活动清单', meta: '点击卡片查看详情' })";
    const hit = subtitlesOf(planted).filter((s) => BANNED_RE.test(s.text));
    assert.equal(hit.length, 1, '反例未命中：含「点击卡片查看详情」的副题必须被判红（匹配器坏了）');
    // ③ 负例：范围 + 约束不得误伤
    assert.equal(BANNED_RE.test('全支部·只读'), false, '负例误伤：「全支部 · 只读」属合规副题，不得命中');
    assert.equal(BANNED_RE.test('在册12·党员9·待办2'), false, '负例误伤：计数型副题不得命中');
    // ④ 规模下限（防抽取口径失效后 S1 恒真）
    assert.ok(SUBS.length >= SUBTITLE_FLOOR,
      `只抽到 ${SUBS.length} 条卡头副题（下限 ${SUBTITLE_FLOOR}）：抽取口径失效 / 判红面被改小`);
  });

})();
