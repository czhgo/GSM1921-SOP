// role: [工程师]+[AI]
// type-scale-guard.test.mjs — 守卫归并件（2026-10-27 批次 516 · B-515-2）
// 归并来源：small-text-guard.test.mjs · text-tier-guard.test.mjs · table-type-scale-guard.test.mjs · control-font-guard.test.mjs
// 2026-10-31 追加源件 5：type-tier-ratchet（档位表外新增即红 / 逐文件逐值棘轮 / 文档齐备 / 反例）。
// 纪律：只减文件数、不减断言数。每个源件包在独立 async 块作用域里（imports 转动态导入），
//   同名 helper / 常量互不冲突；失败信息仍保留各源件的横幅与断言名，便于定位。
// 运行：node --test server/test/type-scale-guard.test.mjs

// ═══ 源件 1：small-text-guard.test.mjs ═══
await (async () => {
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readdirSync, readFileSync } = await import('node:fs');
  const { join, relative, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const { SMALL_TEXT_TOTAL_BASELINE, SMALL_TEXT_FILE_BASELINE, SMALL_TEXT_BY_VALUE_BASELINE } = await import('./style-baseline.mjs');

  // role: [工程师]+[AI]
  // small-text-guard.test.mjs — 「非控件 9px / 10px 小字」禁止档守卫（2026-09-26 美学存量清理末批）
  //
  // 病灶（美学审查实测）：全站 `text-[10px]` 存量 28 处 / 12 文件（`text-[9px]` 0 处）。这些**非控件**
  //   落点（span/p/div/code 等）此前无判据——`control-font-guard` 只管 `<button>/<a>/<input>/<select>`
  //   上的小字；上一批结论是「文档无『非控件小字下限』条款 ⇒ 缺口径，只报不判」。本批把口径定下来。
  //
  // 口径（据既有事实推导，写进 `content/04_web_design/design-system/DESIGN_SYSTEM.md §3.2`）：
  //   · `DESIGN_SYSTEM §3.2 字号层级`表的**最低档**＝ `Overline` = `0.6875rem`（**11px**）——表内**没有**
  //     10px / 9px 档；`§4.3 ④` 亦明文「禁用 `text-[11px]`/`text-[10px]` 控件字号（与规范 Caption 档冲突）」，
  //     并守「控件字号单档 13px」。⇒ 档位表外的 9px / 10px **无任何档位依据**。
  //   · 故本守卫判：**`text-[9px]` 与 `text-[10px]` 一律禁止**（全站上限 0）；`text-[11px]` ＝ 档位表内
  //     `Overline` 档，**非控件处合规、不判红**（控件处仍由 `control-font-guard` 判红）。
  //
  // 与既有守卫的分工（不重叠、不重复判）：
  //   · `control-font-guard`：**控件面**的 9/10/11px（`<button>/<a>/<input>/<select>`）⇒ 红线。
  //   · 本守卫：**全站任意落点**的 9/10px（含控件面，是更严的下界）⇒ 红线；11px 只计进度不判。
  //
  // 运行：node --test server/test/small-text-guard.test.mjs
  
  
  
  
  
  
  
  const HERE = dirname(fileURLToPath(import.meta.url));
  const ROOT = join(HERE, '..', '..');
  const DOCS = join(ROOT, 'docs');
  
  const EXTS = ['.js', '.mjs', '.css', '.html'];
  const SKIP_DIRS = ['vendor'];
  /** 禁止档（档位表外）：9px / 10px。全站上限 = 0 */
  const FORBIDDEN = [9, 10];
  /** 档位表内最低档：Overline 11px（只计进度、不判红） */
  const ALLOWED_FLOOR = 11;
  /** 抽取口径（单一源）：`text-[<n>px]` 任意整数 n */
  const CLASS_RE = /text-\[(\d+)px\]/g;
  
  /** 递归收集扫描目标（相对仓库根的 posix 路径；与同族守卫同口径） */
  function scanFiles() {
    const out = [];
    const walk = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (e.name === '.git' || SKIP_DIRS.includes(e.name)) continue;
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (EXTS.some((x) => e.name.endsWith(x))) out.push(relative(ROOT, p).replace(/\\/g, '/'));
      }
    };
    walk(DOCS);
    return out.sort();
  }
  
  /** 抽取某段源码里的 `text-[<n>px]` 计数：n（数字）→ 处数 */
  function sizesOf(src) {
    const out = {};
    for (const m of src.matchAll(new RegExp(CLASS_RE.source, 'g'))) {
      const n = Number(m[1]);
      out[n] = (out[n] || 0) + 1;
    }
    return out;
  }
  
  function scan() {
    return scanFiles().map((file) => {
      const sizes = sizesOf(readFileSync(join(ROOT, file), 'utf8'));
      return { file, sizes };
    });
  }
  
  // ── P1 禁止档：全站 text-[9px] / text-[10px] 必须为 0 ─────────────────
  test('P1 禁止档回归：全站不得出现 text-[9px] / text-[10px]（档位表最低档＝Overline 11px）', () => {
    const offenders = [];
    for (const { file, sizes } of scan()) {
      for (const n of FORBIDDEN) {
        if (sizes[n]) offenders.push(`${file} → text-[${n}px] ×${sizes[n]}`);
      }
    }
    assert.deepEqual(offenders, [],
      `出现 DesignSystem 档位表之外的禁止档小字（§3.2 最低档 = Overline 11px；§4.3 ④ 禁用 10px/11px 控件字号）：\n  ${offenders.join('\n  ')}\n  处置：改到档位表内的档位（正文 13px / Caption 12px / Overline 11px）。`);
  });
  
  // ── P2 非空转自检（抽取口径可用 ＋ 扫描面非空）─────────────────────────
  test('P2 非空转：抽取口径正/负例 ＋ 扫描面规模下限 ＋ 反例实测', () => {
    // ① 正例：三种档位各命中（防「抽取器恒空 ⇒ 守卫恒绿」）
    assert.deepEqual(sizesOf('class="text-[9px] text-[10px] text-[11px]"'), { 9: 1, 10: 1, 11: 1 },
      '抽取口径失效：9/10/11px 未被全部抽出（守卫会恒真）');
    // ② 负例：档位表内的档位 / 非任意值类 / 非法长度 不得命中
    assert.deepEqual(sizesOf('text-[12px] text-[13px] text-xs text-[100px] text-[10]'), { 12: 1, 13: 1, 100: 1 },
      '抽取口径过宽：把档位表内的档或非 px 任意值当成目标（text-[100px] 会被抽出但不会误判为禁止档）');
    assert.deepEqual(sizesOf('text-[10px]'), { 10: 1 }, '抽取口径失效：单处 10px 未命中');
    // ③ 反例实测（真机负例）：把真实禁止档样本喂进同一抽取器 ⇒ 必须被 P1 判红（此处验抽取，P1 用同一器扫描真源码）
    const fake = 'const x = `<span class="text-[10px] text-gray-500">反例样本</span>`;';
    const n = Object.entries(sizesOf(fake)).filter(([k]) => FORBIDDEN.includes(Number(k)));
    assert.equal(n.reduce((a, [, c]) => a + c, 0), 1, '反例实测失败：合成源码里的 text-[10px] 未被禁止档口径命中');
    // ④ 扫描面非空（防「扫描范围被削成空目录 ⇒ P1 恒绿」）
    const rows = scan();
    const files = rows.length;
    const total11 = rows.reduce((a, r) => a + (r.sizes[ALLOWED_FLOOR] || 0), 0);
    assert.ok(files >= 80, `扫描面过窄（实测 ${files} 文件，下限 80）——P1 可能因范围被削而恒绿`);
    // ⚠ 2026-10-23 批次 505：全站 `text-[11px]` 统一并入 `text-xs`（12px），实测 11px 由 362 降到 66
    //   ⇒ 非空转下限随之下调（仍远高于「抽取器失效」的 0；上限基线只降不升）。
    // ⚠ 2026-10-24 Task 4.3：支书待办（14 处）与组织名册（10 处）的 11px 正文/元信息改 12px，
    //   实测 11px 由 68 降到 44 ⇒ 非空转下限随真实收基线再下调到 40（判据仍是「扫描面不得被削空」）。
    assert.ok(total11 >= 40, `档位表内 Overline 档（11px）实测过少（${total11} 处，下限 40）——抽取口径可能失效`);
  });
  
  // ── P3 缩减进度（只报不判）─────────────────────────────────────────
  test('P3 缩减进度：全站 9/10/11px 按档计数（9/10 禁止档须为 0；11px 只报）', () => {
    const rows = scan();
    const bySize = {};
    for (const r of rows) {
      for (const [n, c] of Object.entries(r.sizes)) {
        // 只统计 9/10/11 三个小字档（12px+ 属 Caption/正文档，不在本口径内）
        if (FORBIDDEN.includes(Number(n)) || Number(n) === ALLOWED_FLOOR) bySize[n] = (bySize[n] || 0) + c;
      }
    }
    const total = Object.values(bySize).reduce((a, b) => a + b, 0);
    const files = rows.filter((r) => Object.keys(r.sizes).some((n) => FORBIDDEN.includes(Number(n)) || Number(n) === ALLOWED_FLOOR)).length;
    const d = (cur, base) => (cur === base ? '持平' : cur < base ? `↓${base - cur}` : `↑${cur - base}`);
    console.log(`[非控件小字口径] 9px=${bySize[9] || 0} · 10px=${bySize[10] || 0}（禁止档，上限 0）`
      + ` · 11px=${bySize[11] || 0}（档位表内 Overline 档，合规）`);
    console.log(`[全站 text-[9/10/11px]（含非控件落点，仅进度口径）] 处数 ${total}（基线 ${SMALL_TEXT_TOTAL_BASELINE}，${d(total, SMALL_TEXT_TOTAL_BASELINE)}）`
      + ` · 文件 ${files}（基线 ${SMALL_TEXT_FILE_BASELINE}，${d(files, SMALL_TEXT_FILE_BASELINE)}）`
      + ` · 基线按值 ${JSON.stringify(SMALL_TEXT_BY_VALUE_BASELINE)}`);
    console.log('[口径单一源] DESIGN_SYSTEM §3.2 字号层级（最低档 Overline 11px）＋ §4.3 ④（禁用 10px/11px 控件字号）；'
      + '禁止档清存量后**不得**把新档补进基线。');
  });

})();

// ═══ 源件 2：text-tier-guard.test.mjs ═══
await (async () => {
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readdirSync, readFileSync, existsSync } = await import('node:fs');
  const { join, relative, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const { P_TEXT_TIER_BASELINE, P_TEXT_TIER_TOTAL_BASELINE, P_TEXT_TIER_FILE_BASELINE, P_TEXT_TIER_BY_VALUE_BASELINE } = await import('./style-baseline.mjs');

  // role: [工程师]+[AI]
  // text-tier-guard.test.mjs — 「段落/导语不得用标签档（11px）」档位-角色一致性守卫（2026-09-27 文本档位统一批）
  //
  // 来源（支书实报，逐字）：「目前 UI 设计上，我认为**完全存在着风格不统一的问题**……有的字大，有的字小，
  //   有的行距宽，有的窄。有的看起来更『方』『硬』，有的看起来『圆』『软』。我认为一定要按照标准去统一！！」
  //   真机量测（7 台 × 全部 tab，v=20260924a）证实：**同一语义层在同一 tab 内取了不同档**——「党小组与活动」
  //   tab 的卡片导语既出现 `text-[11px]`（6 处 `<p>`）又出现 `text-xs`（其余说明段），且因 `text-[11px]` 是
  //   任意值类**不携行高**，其实测行高 16.5px、而 `text-xs` 携固定行高 16px ⇒ 同一页同层文字**字号与行距双双不一致**。
  //
  // 口径（据既有事实推导，写进 `content/04_web_design/design-system/DESIGN_SYSTEM.md §3.2.2`）：
  //   · §3.2 档位表把 `Overline`（11px）定为「**分类标签**」档——同一行明写 `font-weight: 600` +
  //     `letter-spacing: 0.12em` + 大写；§3.2.1 又把「`text-[11px]` 非控件落点」直接定义为「＝本表 Overline 档」。
  //   · ⇒ **11px 只在「标签形态」合法**（标签、分类小标、侧栏组名…）；**`<p>` 是说明/导语段落**，属正文档，
  //     应取 Caption 12px 起（`text-xs`）——把标签档当段落用，就是本批要堵的「同层不同档」。
  //   · 9px / 10px：§3.2 档位表内**根本没有**这两档（最低档＝Overline 11px），一律禁止（与 `small-text-guard` 同口径）。
  //
  // 判据（**单一源＝`<p>` + `text-[9|10|11]px` 同标签共现**）：
  //   T1 新增站点：扫描到 `<p … text-[11px]>` 而基线里没有该 (文件, 值) ⇒ 红；9/10px 全站上限 0 ⇒ 红
  //   T2 逐文件处数 ratchet：> 基线 ⇒ 红（存量不得增长）
  //   T3 非空转自检：① 抽取口径正/负例（`<p>` 命中 / 非 `<p>` 不命中 / `<pre>` 不得误命中）；
  //                  ② 台账规模自洽（条目数 = 声明数，处数 = 声明数）；③ 僵尸登记（基线文件不存在 / 已清零）⇒ 红
  //   T4 缩减进度（只报不判）：`<p>` 口径与全站口径计数打印
  //
  // 覆盖边界（如实标注）：本守卫判的是**可机检的那一半**——`<p>`（段落即说明/导语，形态无歧义）。
  //   `<span>`/`<div>` 上的 11px 既可能是标签（合法 Overline 形态）也可能是附注（应 12px），**机器判不了**，
  //   故不计入判红面，只进 T4 进度口径。文字**颜色/字号以外的档位（行高/字重/圆角/阴影）**由
  //   `DESIGN_SYSTEM.md §3.2.2 / §4.19` 的档位表做人工口径，本守卫不越界假装覆盖。
  //
  // 收基线纪律：改准某文件后**同一批**更新 `style-baseline.mjs`（删该值 / 减 c），进度自动前进；
  //   **不得**为变绿而把新值补进基线。
  // 运行：node --test server/test/text-tier-guard.test.mjs
  
  
  
  
  
  
  
  const HERE = dirname(fileURLToPath(import.meta.url));
  const ROOT = join(HERE, '..', '..');
  const DOCS = join(ROOT, 'docs');
  
  const EXTS = ['.js', '.mjs', '.css', '.html'];
  const SKIP_DIRS = ['vendor'];
  /** 禁止档（档位表外，与 small-text-guard 同口径） */
  const FORBIDDEN = [9, 10];
  /** 标签档（Overline 11px）——段落不得使用，只作存量台账 */
  const LABEL_TIER = 11;
  /** 抽取口径（单一源）：`<p>` 标签内 class 属性体里出现 `text-[9|10|11]px`；`<p\b` 不误命中 `<pre>` / `<path>` */
  const PARA_TIER_RE = /<p\b[^>]*class=["'][^"']*text-\[(9|10|11)px\]/g;
  
  /** 递归收集扫描目标（相对仓库根的 posix 路径；与同族守卫同口径） */
  function scanFiles() {
    const out = [];
    const walk = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (e.name === '.git' || SKIP_DIRS.includes(e.name)) continue;
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (EXTS.some((x) => e.name.endsWith(x))) out.push(relative(ROOT, p).replace(/\\/g, '/'));
      }
    };
    walk(DOCS);
    return out.sort();
  }
  
  /** 抽取某段源码里「`<p>` 上 9/10/11px」的计数：px → 处数（导出便于非空转自检） */
  function paraTiersOf(src) {
    const out = {};
    for (const m of src.matchAll(new RegExp(PARA_TIER_RE.source, 'g'))) {
      const n = Number(m[1]);
      out[n] = (out[n] || 0) + 1;
    }
    return out;
  }
  
  function scan() {
    return scanFiles().map((file) => {
      const src = readFileSync(join(ROOT, file), 'utf8');
      const tiers = paraTiersOf(src);
      const total = Object.values(tiers).reduce((a, b) => a + b, 0);
      return { file, tiers, total };
    });
  }
  
  // ── T1 新增站点 / 禁止档 ─────────────────────────────────────────────
  test(`T1 段落档位回归：` + '`<p>` 上档位表外的 9/10px 判红；11px 基线之外新增判红'
    + `（基线 ${P_TEXT_TIER_TOTAL_BASELINE} 处 / ${P_TEXT_TIER_FILE_BASELINE} 文件）`, () => {
    const offenders = [];
    for (const { file, tiers } of scan()) {
      for (const n of FORBIDDEN) {
        if (tiers[n]) offenders.push(`${file} → <p> 出现 text-[${n}px] ×${tiers[n]}（档位表外，最低档＝Overline 11px）`);
      }
      const base = P_TEXT_TIER_BASELINE[file];
      if (!base) {
        if (tiers[LABEL_TIER]) offenders.push(`${file} → 新文件不得在 <p> 上用 text-[${LABEL_TIER}px]（段落应取 Caption 12px＝text-xs；11px 是标签档）`);
        continue;
      }
      if ((tiers[LABEL_TIER] || 0) > base.c) {
        offenders.push(`${file} → <p> 的 text-[${LABEL_TIER}px] 由基线 ${base.c} 处增至 ${tiers[LABEL_TIER]} 处`);
      }
    }
    assert.deepEqual(offenders, [],
      `段落（<p>）用了「标签档」字号（11px 属 Overline 标签档，段落应 Caption 12px；口径见 DESIGN_SYSTEM §3.2.2）：\n  ${offenders.join('\n  ')}`);
  });
  
  // ── T2 逐文件处数 ratchet ────────────────────────────────────────────
  test('T2 处数 ratchet：逐文件 <p> 的 11px 站点数不得高于基线', () => {
    const grow = [];
    for (const { file, total } of scan()) {
      const base = P_TEXT_TIER_BASELINE[file];
      if (!base) continue; // 新文件已在 T1 报出
      if (total > base.c) grow.push(`${file} → ${total} 处 > 基线 ${base.c} 处`);
    }
    assert.deepEqual(grow, [], `以下文件段落档位站点数高于基线：\n  ${grow.join('\n  ')}`);
  });
  
  // ── T3 非空转自检 ────────────────────────────────────────────────────
  test('T3 非空转：抽取口径正/负例 ＋ 台账规模自洽 ＋ 无僵尸登记', () => {
    // ① 抽取口径正例：`<p>` 命中（含 class 在属性序中间、单双引号）
    assert.deepEqual(paraTiersOf('<p class="text-[11px] text-gray-500">说明</p>'), { 11: 1 },
      '抽取口径失效：<p> 上的 text-[11px] 未被抽出（守卫会恒真）');
    assert.deepEqual(paraTiersOf("<p class='text-[10px]'>a</p>"), { 10: 1 },
      '抽取口径失效：单引号 class 未命中');
    assert.deepEqual(paraTiersOf('<p id="x" class="mb-1 text-[9px]">a</p>'), { 9: 1 },
      '抽取口径失效：class 前有其它属性时未命中');
    // ① 负例：非 `<p>` 标签不命中（标签档留待 T4 只报）；`<pre>` / `<path>` 不得误命中
    assert.deepEqual(paraTiersOf('<span class="text-[11px] font-semibold">工作台</span>'), {},
      '抽取口径过宽：<span> 上的 11px（合法 Overline 形态）被当成段落档');
    assert.deepEqual(paraTiersOf('<pre class="text-[11px]">x</pre>'), {},
      '抽取口径过宽：<pre> 被 <p\\b 误命中');
    assert.deepEqual(paraTiersOf('<path class="text-[11px]" d="M0 0"/>'), {},
      '抽取口径过宽：<path> 被误命中');
    assert.deepEqual(paraTiersOf('<p class="text-xs text-gray-500">正常档</p>'), {},
      '抽取口径过宽：段落上的正常档（text-xs）被误判为标签档');
    // ② 台账规模自洽（非空转；防「台账被删空/改坏」）
    const files = Object.keys(P_TEXT_TIER_BASELINE);
    assert.equal(files.length, P_TEXT_TIER_FILE_BASELINE, '基线条目数与声明的文件数不一致（台账被改动须同步声明值）');
    const declared = Object.values(P_TEXT_TIER_BASELINE).reduce((a, b) => a + b.c, 0);
    assert.equal(declared, P_TEXT_TIER_TOTAL_BASELINE, '基线条目处数之和与声明的总处数不一致（台账被改动须同步声明值）');
    assert.ok(P_TEXT_TIER_FILE_BASELINE >= 1 && P_TEXT_TIER_TOTAL_BASELINE >= 1,
      `台账规模下限被调成 0（实测 ${files.length} 文件 / 声明 ${P_TEXT_TIER_FILE_BASELINE}·${P_TEXT_TIER_TOTAL_BASELINE}）`);
    // ③ 僵尸登记：基线文件必须存在，且该文件仍应有段落档站点
    const gone = files.filter((f) => !existsSync(join(ROOT, f)));
    assert.deepEqual(gone, [], `基线条目指向不存在的文件（应从 style-baseline.mjs 移除）：\n  ${gone.join('\n  ')}`);
    const emptied = scan().filter((r) => P_TEXT_TIER_BASELINE[r.file] && !r.total).map((r) => r.file);
    assert.deepEqual(emptied, [],
      `以下文件段落档已清零，应从 style-baseline.mjs 删除该条（收基线）：\n  ${emptied.join('\n  ')}`);
    // ③ 值集不得越出 {11}
    for (const [f, b] of Object.entries(P_TEXT_TIER_BASELINE)) {
      for (const v of b.v) assert.ok(v === LABEL_TIER, `${f}：基线值 ${v} 不是标签档 11（存量只应剩 11px）`);
    }
  });
  
  // ── T4 缩减进度（只报不判） ──────────────────────────────────────────
  test('T4 缩减进度：段落口径与全站 9/10/11px 口径当前计数', () => {
    const rows = scan();
    const paraTotal = rows.reduce((a, r) => a + r.total, 0);
    const paraFiles = rows.filter((r) => r.total).length;
    const byValue = {};
    for (const r of rows) for (const [n, c] of Object.entries(r.tiers)) byValue[n] = (byValue[n] || 0) + c;
    const all = (src) => (src.match(/text-\[(9|10|11)px\]/g) || []).length;
    let siteTotal = 0;
    let siteFiles = 0;
    for (const f of scanFiles()) {
      const n = all(readFileSync(join(ROOT, f), 'utf8'));
      if (n) { siteTotal += n; siteFiles += 1; }
    }
    const d = (cur, base) => (cur === base ? '持平' : cur < base ? `↓${base - cur}` : `↑${cur - base}`);
    console.log(`[段落档位（<p>）] 站点 ${paraTotal}（基线 ${P_TEXT_TIER_TOTAL_BASELINE}，${d(paraTotal, P_TEXT_TIER_TOTAL_BASELINE)}）`
      + ` · 文件 ${paraFiles}（基线 ${P_TEXT_TIER_FILE_BASELINE}，${d(paraFiles, P_TEXT_TIER_FILE_BASELINE)}）`
      + ` · 按值 ${JSON.stringify(byValue)}（基线 ${JSON.stringify(P_TEXT_TIER_BY_VALUE_BASELINE)}）`);
    console.log(`[全站 text-[9/10/11px]（含 <span>/<div> 标签落点，仅进度口径）] 处数 ${siteTotal} · 文件 ${siteFiles}`);
    console.log('[口径单一源] DESIGN_SYSTEM §3.2 档位表（Overline 11px＝标签档）＋ §3.2.2（段落/导语＝Caption 12px 起）；'
      + '9/10px 为档位表外禁止档。收基线后不得把新值补进基线。');
  });

})();

// ═══ 源件 3：table-type-scale-guard.test.mjs ═══
await (async () => {
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');

  // role: [工程师]+[AI]
  // table-type-scale-guard.test.mjs — 数据表字号「单档 13px」静态守卫（2026-10-19 支书裁定回退）
  //
  // 背景：P7（`page-sweep.test.mjs`）在真机量测 `.data-table th/td` 的渲染字号须为 13px。
  //   此前表头走 `var(--text-sm)`（12px）、首列走 `0.875rem`（14px），靠「字重 / 颜色承担强调」的
  //   说法掩盖了字号离档；支书 2026-10-19 裁定回退：**表头与首列同为 13px 单档，不再改字号**。
  //   本守卫锁住静态声明，防止后续批次又把字号改回两档（真机 P7 一旦放宽就看不出来）。
  //   同时锁住 `page-sweep.test.mjs` 的 `cellPx: 13`——防止有人改判据（放宽真机尺规）让普查转绿。
  //
  // 运行：node --test server/test/table-type-scale-guard.test.mjs
  
  
  
  
  
  const HERE = import.meta.dirname;
  const ROOT = join(HERE, '..', '..');
  const STYLES = join(ROOT, 'docs', 'src', 'styles.css');
  const PAGE_SWEEP = join(HERE, 'page-sweep.test.mjs');
  
  /** 抽取 CSS 中某选择器的声明体（只认行首起笔的选择器，避免命中注释里的同名文字） */
  function ruleBodies(css, selector) {
    const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?:^|\\n)\\s*${esc}\\s*\\{([\\s\\S]*?)\\}`, 'g');
    return [...css.matchAll(re)].map((m) => m[1]);
  }
  
  test('自称非空转：规则抽取正则能命中目标规则、且不误命中邻近规则', () => {
    const sample = `
  /* .data-table thead th 注释里的同名文字不应命中 */
  .data-table thead th {
    font-size: 0.8125rem;
    font-weight: 600;
  }
  .data-table tbody td {
    font-size: 0.8125rem;
  }
  .data-table tbody td:first-child {
    font-size: 0.8125rem;
    font-weight: 500;
  }`;
    const heads = ruleBodies(sample, '.data-table thead th');
    assert.equal(heads.length, 1, '内存样本：表头规则应恰好命中 1 次');
    assert.match(heads[0], /font-size:\s*0\.8125rem/, '内存样本：表头规则应命中 13px 声明');
    const tds = ruleBodies(sample, '.data-table tbody td');
    assert.equal(tds.length, 1, '内存样本：`.data-table tbody td` 不应把 `td:first-child` 一并吞入');
    const firsts = ruleBodies(sample, '.data-table tbody td:first-child');
    assert.equal(firsts.length, 1, '内存样本：首列规则应恰好命中 1 次');
    assert.match(firsts[0], /font-size:\s*0\.8125rem/, '内存样本：首列规则应命中 13px 声明');
  });
  
  test('P7 表头：`.data-table thead th` 为 0.8125rem 单档，不含 var(--text-sm) / 0.75rem', () => {
    const css = readFileSync(STYLES, 'utf8');
    const bodies = ruleBodies(css, '.data-table thead th');
    assert.equal(bodies.length, 1, `styles.css 中 \`.data-table thead th\` 规则应恰好 1 条（实得 ${bodies.length}）`);
    const body = bodies[0];
    assert.match(body, /font-size:\s*0\.8125rem/, '表头字号须为 0.8125rem（13px 单档）');
    assert.doesNotMatch(body, /var\(--text-sm\)/, '表头不得再走 var(--text-sm)（12px，离档）');
    assert.doesNotMatch(body, /0\.75rem/, '表头不得出现 0.75rem（12px，离档）');
    assert.match(body, /font-weight:\s*600/, '表头强调应继续由字重 600 承担');
  });
  
  test('P7 首列：`.data-table tbody td:first-child` 为 0.8125rem 单档，不含 0.875rem', () => {
    const css = readFileSync(STYLES, 'utf8');
    const bodies = ruleBodies(css, '.data-table tbody td:first-child');
    assert.equal(bodies.length, 1, `styles.css 中 \`.data-table tbody td:first-child\` 规则应恰好 1 条（实得 ${bodies.length}）`);
    const body = bodies[0];
    assert.match(body, /font-size:\s*0\.8125rem/, '首列字号须为 0.8125rem（13px 单档）');
    assert.doesNotMatch(body, /0\.875rem/, '首列不得出现 0.875rem（14px，离档）');
    assert.match(body, /font-weight:\s*500/, '首列强调应继续由字重 500 承担');
  });
  
  test('P7 真机判据不放宽：page-sweep.test.mjs 仍为 cellPx: 13', () => {
    const src = readFileSync(PAGE_SWEEP, 'utf8');
    assert.match(src, /cellPx:\s*13\b/, 'page-sweep 的 DECK.cellPx 须保持 13——不得靠放宽判据转绿');
  });

})();

// ═══ 源件 4：control-font-guard.test.mjs ═══
await (async () => {
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readdirSync, readFileSync, existsSync } = await import('node:fs');
  const { join, relative, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const { CTRL_SMALL_BASELINE, CTRL_SMALL_TOTAL_BASELINE, CTRL_SMALL_FILE_BASELINE, SMALL_TEXT_TOTAL_BASELINE, SMALL_TEXT_FILE_BASELINE, SMALL_TEXT_BY_VALUE_BASELINE } = await import('./style-baseline.mjs');

  // role: [工程师]+[AI]
  // control-font-guard.test.mjs — 「控件上的 9/10/11px 小字」存量回归防线（2026-09-24 美学存量清理批）
  //
  // 病灶（美学审查实测）：全站 `text-[9px]/[10px]/[11px]` **370 处 / 56 个文件**，其中**直接落在控件上**的
  //   **23 处 / 12 个文件**——违反 DESIGN_SYSTEM §4.3「输入组件统一原则」④
  //   （原文：「**禁止** `text-[11px]`/`text-[10px]` 控件字号（与规范 Caption 档冲突）」）
  //   与「字号 **单档 `0.8125rem`（13px）**」。控件小字是"看起来就用不上"的档位：控件文字是操作入口，
  //   11px 在移动端与深色主题下都难读，且同一筛选行/工具条里会与 13px 档并列（并档后只剩一档）。
  //
  // 本批**不做**「顺手删存量小字」（属另一件事：控件小字往往连带按钮尺寸/布局，须逐处复刻真机核对），
  //   只立**回归防线**：
  //   T1 新增站点：扫描到基线之外的 (文件, 标签|小字类) ⇒ 红
  //   T2 逐文件站点数 ratchet：> 基线 ⇒ 红（存量不得增长）
  //   T3 非空转自检：① 抽取口径合成样本（控件命中 / 非控件不命中 / class 跨行命中）；
  //                  ② 台账规模自洽 ＋ 空台账零存量（2026-09-26 末批：全站控件小字已清零 ⇒ 台账清空，
  //                     「非空转」由数字下限改为更强的「空台账 ⇒ 全站实测须为 0」）；③ 僵尸登记
  //                     （基线文件不存在 / 该文件已无小字控件）⇒ 红
  //   T4 缩减进度：控件口径与全站口径计数打印
  //
  // 口径边界（**不得**自行放宽或加严）：
  //   · 判红标签＝`<button>` / `<a>` / `<input>` / `<select>`（任务与 §4.3 的控件面）；
  //     `<span>`/`<label>`/`<div>` 上的小字（标签、时间戳等附注）**不在判红面**，只计入 T4 的进度口径。
  //   · `text-[9px]`：§4.3 ④ 原文只点名 10px / 11px；9px 由「控件字号单档 13px」（§4.3 ② 「禁止自制
  //     Tailwind 控件」+ 单档口诀）推得，属同一口径的**下界**。**全站实测 9px 现存 0 处** ⇒ 纳入判红
  //     不会产生任何「更严」的存量压制（真机口径见报告）。
  //
  // 运行：node --test server/test/control-font-guard.test.mjs
  
  
  
  
  
  
  
  const HERE = dirname(fileURLToPath(import.meta.url));
  const ROOT = join(HERE, '..', '..');
  const DOCS = join(ROOT, 'docs');
  
  const EXTS = ['.js', '.mjs', '.css', '.html'];
  const SKIP_DIRS = ['vendor'];
  /** 判红控件标签（单一源：任务口径 ＝ §4.3 的控件面） */
  const CTRL_TAGS = ['button', 'a', 'input', 'select'];
  /** 小字类抽取（9/10/11px 三种；§4.3 原文点名 10/11，9px 见文件头口径边界说明） */
  const SMALL_RE = /text-\[(9|10|11)px\]/g;
  const TAG_RE = new RegExp(`<(${CTRL_TAGS.join('|')})\\b[^>]*>`, 'g');
  
  function scanFiles() {
    const out = [];
    const walk = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (e.name === '.git' || SKIP_DIRS.includes(e.name)) continue;
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (EXTS.some((x) => e.name.endsWith(x))) out.push(relative(ROOT, p).replace(/\\/g, '/'));
      }
    };
    walk(DOCS);
    return out.sort();
  }
  
  /** 提取某段源码里的控件小字签名：`标签|小字类` → 处数 */
  function ctrlSignatures(src) {
    const sig = {};
    let m;
    const re = new RegExp(TAG_RE.source, 'g');
    while ((m = re.exec(src))) {
      const c = /class="([^"]*)"/.exec(m[0]);
      if (!c) continue;
      for (const hit of c[1].match(SMALL_RE) || []) {
        const k = `${m[1]}|${hit}`;
        sig[k] = (sig[k] || 0) + 1;
      }
    }
    return sig;
  }
  
  function scan() {
    return scanFiles().map((file) => {
      const src = readFileSync(join(ROOT, file), 'utf8');
      const sig = ctrlSignatures(src);
      const total = Object.values(sig).reduce((a, b) => a + b, 0);
      const all = (src.match(SMALL_RE) || []).length;
      return { file, sig, total, all };
    });
  }
  
  // ── T1 新增控件小字站点 ──────────────────────────────────────────────
  test(`T1 控件小字回归：基线之外的 (文件, 标签|小字类) 判红（基线 ${CTRL_SMALL_TOTAL_BASELINE} 处 / ${CTRL_SMALL_FILE_BASELINE} 文件）`, () => {
    const offenders = [];
    for (const { file, sig } of scan()) {
      const base = CTRL_SMALL_BASELINE[file];
      if (!base) {
        const k = Object.keys(sig);
        if (k.length) offenders.push(`${file} → 新文件控件不得挂小字类：${k.join(' ')}`);
        continue;
      }
      for (const [key, n] of Object.entries(sig)) {
        const bn = base.sig[key] || 0;
        if (bn === 0) offenders.push(`${file} → 新增控件小字：${key}（§4.3 ④ 禁止 text-[11px]/text-[10px] 控件字号）`);
        else if (n > bn) offenders.push(`${file} → ${key} 由基线 ${bn} 处增至 ${n} 处`);
      }
    }
    assert.deepEqual(offenders, [],
      `控件上出现 DesignSystem 禁止的小字档（控件字号单档 13px，见 DESIGN_SYSTEM §4.3）：\n  ${offenders.join('\n  ')}`);
  });
  
  // ── T2 逐文件处数 ratchet ────────────────────────────────────────────
  test('T2 处数 ratchet：逐文件控件小字站点数不得高于基线', () => {
    const grow = [];
    for (const { file, total } of scan()) {
      const base = CTRL_SMALL_BASELINE[file];
      if (!base || !total) continue; // 新文件已在 T1 报出
      if (total > base.c) grow.push(`${file} → ${total} 处 > 基线 ${base.c} 处`);
    }
    assert.deepEqual(grow, [], `以下文件控件小字站点数高于基线：\n  ${grow.join('\n  ')}`);
  });
  
  // ── T3 非空转自检 ────────────────────────────────────────────────────
  test('T3 非空转：抽取口径可用 + 台账规模自洽（空台账 ⇒ 全站须为 0）+ 无僵尸登记', () => {
    // ① 抽取口径正例：控件命中（含 class 属性体，且能取到 class）
    assert.deepEqual(ctrlSignatures('<button class="text-[11px] px-2">a</button>'), { 'button|text-[11px]': 1 },
      '抽取口径失效：控件上的 text-[11px] 未被抽出（守卫会恒真）');
    assert.deepEqual(ctrlSignatures('<a class="x text-[10px]">a</a>'), { 'a|text-[10px]': 1 },
      '抽取口径失效：<a> 上的 text-[10px] 未被抽出');
    // ① 正例：属性顺序在前 / class 前有其它属性同样命中
    assert.deepEqual(ctrlSignatures('<input type="text" class="text-[9px]" value="1">'), { 'input|text-[9px]': 1 },
      '抽取口径失效：属性序在 class 之前时未命中');
    // ① 负例：非控件标签上的小字不计入控件口径
    assert.deepEqual(ctrlSignatures('<span class="text-[11px]">时间戳</span>'), {},
      '抽取口径过宽：<span> 上的小字被当成控件小字');
    assert.deepEqual(ctrlSignatures('<button class="text-xs">正常档</button>'), {},
      '抽取口径过宽：控件上的正常档（text-xs）被误判为小字');
    // ② 台账规模自洽 ＋ 空台账零存量（非空转；2026-09-26 末批：全站控件小字已清零，台账随之清空）
    const files = Object.keys(CTRL_SMALL_BASELINE);
    assert.equal(files.length, CTRL_SMALL_FILE_BASELINE, '基线条目数与声明的文件数不一致（台账被改动须同步声明值）');
    const ctrlNow = scan().reduce((a, r) => a + r.total, 0);
    if (!files.length) {
      // 台账已清空 ⇒ 全站实测也必须为 0；否则是「台账被删空而存量还在」（比数字下限更强的非空转判据）
      assert.equal(ctrlNow, CTRL_SMALL_TOTAL_BASELINE,
        `控件小字台账已删空（声明 ${CTRL_SMALL_FILE_BASELINE} 文件 / ${CTRL_SMALL_TOTAL_BASELINE} 处），但全站实测仍有 ${ctrlNow} 处控件小字（台账被删空 ⇒ 收基线纪律被绕过）`);
    } else {
      assert.ok(CTRL_SMALL_FILE_BASELINE >= 1 && CTRL_SMALL_TOTAL_BASELINE >= 1,
        `台账非空但规模下限被调成 0（实测 ${files.length} 文件 / 声明 ${CTRL_SMALL_FILE_BASELINE}·${CTRL_SMALL_TOTAL_BASELINE}）`);
    }
    // ③ 僵尸登记：基线文件必须存在，且该文件仍应有控件小字站点
    const gone = files.filter((f) => !existsSync(join(ROOT, f)));
    assert.deepEqual(gone, [], `基线条目指向不存在的文件（应从 style-baseline.mjs 移除）：\n  ${gone.join('\n  ')}`);
    const emptied = scan().filter((r) => CTRL_SMALL_BASELINE[r.file] && !r.total).map((r) => r.file);
    assert.deepEqual(emptied, [],
      `以下文件控件小字已清零，应从 style-baseline.mjs 删除该条（收基线）：\n  ${emptied.join('\n  ')}`);
  });
  
  // ── T4 缩减进度（只报不判） ──────────────────────────────────────────
  test('T4 缩减进度：控件口径与全站口径当前计数', () => {
    const rows = scan();
    const ctrlTotal = rows.reduce((a, r) => a + r.total, 0);
    const ctrlFiles = rows.filter((r) => r.total).length;
    const allTotal = rows.reduce((a, r) => a + r.all, 0);
    const allFiles = rows.filter((r) => r.all).length;
    const byValue = {};
    for (const r of rows) {
      for (const k of Object.keys(r.sig)) {
        const v = k.split('|')[1];
        byValue[v] = (byValue[v] || 0) + r.sig[k];
      }
    }
    const d = (cur, base) => (cur === base ? '持平' : cur < base ? `↓${base - cur}` : `↑${cur - base}`);
    console.log(`[控件小字] 站点 ${ctrlTotal}（基线 ${CTRL_SMALL_TOTAL_BASELINE}，${d(ctrlTotal, CTRL_SMALL_TOTAL_BASELINE)}）`
      + ` · 文件 ${ctrlFiles}（基线 ${CTRL_SMALL_FILE_BASELINE}，${d(ctrlFiles, CTRL_SMALL_FILE_BASELINE)}）`
      + ` · 按值 ${JSON.stringify(byValue)}`);
    console.log(`[全站 text-[9/10/11px]（含非控件落点，仅进度口径）] 处数 ${allTotal}（基线 ${SMALL_TEXT_TOTAL_BASELINE}，${d(allTotal, SMALL_TEXT_TOTAL_BASELINE)}）`
      + ` · 文件 ${allFiles}（基线 ${SMALL_TEXT_FILE_BASELINE}，${d(allFiles, SMALL_TEXT_FILE_BASELINE)}）`
      + ` · 基线按值 ${JSON.stringify(SMALL_TEXT_BY_VALUE_BASELINE)}`);
    console.log('[收基线提示] 清掉存量控件小字后同批删 style-baseline.mjs 对应条目 / 减小 c，进度即前进；不得为变绿补条目。');
  });

})();

// ═══ 源件 5：type-tier-ratchet.test.mjs（2026-10-31 字号档位收口） ═══
// role: [工程师]+[AI]
// 口径（单一源＝`DS_02_TYPE_AND_SIZE.md §3.2.3` 档位表；登记值见 style-baseline.mjs）：
//   Q1 档位表外的新 (文件, 字号) ⇒ 红（新增字号必须落在档位表内）；
//   Q2 逐文件逐值 ratchet ⇒ 红（存量只减不增）；
//   Q3 非空转：抽取器正/负例、台账规模自洽、僵尸文件、文档档位齐备、扫描面下限；
//   Q4 进度（只报不判）：档位表内 / 表外当前计数。
// 覆盖边界：只判**可解析为 px 的静态字号**（px / rem / var(--text-*)）；`clamp()` / `calc()` /
//   `em` / `%` 等流体值不参与静态判定（about.css 冻结件即落在此类）。
await (async () => {
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readdirSync, readFileSync, existsSync } = await import('node:fs');
  const { join, relative, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const {
    TYPE_TIER_ALLOWED, TYPE_TIER_BASELINE, TYPE_TIER_TOTAL_BASELINE, TYPE_TIER_FILE_BASELINE,
  } = await import('./style-baseline.mjs');

  const HERE = dirname(fileURLToPath(import.meta.url));
  const ROOT = join(HERE, '..', '..');
  const DOCS = join(ROOT, 'docs');
  const SRC = join(DOCS, 'src');
  const DS02 = join(ROOT, 'content', '04_web_design', 'design-system', 'DS_02_TYPE_AND_SIZE.md');

  /** Tailwind 工具类 → px（本仓实际在用的档位；新增档位须先改文档） */
  const TW = {
    'text-xs': 12, 'text-sm': 14, 'text-base': 16, 'text-lg': 18,
    'text-xl': 20, 'text-2xl': 24, 'text-3xl': 30,
  };
  /** 令牌 → px（单一源＝styles.css `:root`；`html.font-size-large` 覆盖值由基线承接） */
  const TOKENS = {
    '--text-xs': 12, '--text-sm': 12, '--text-base': 14, '--text-md': 16,
    '--text-lg': 18, '--text-xl': 20, '--text-2xl': 22, '--text-3xl': 24,
    '--text-body': 15, '--text-secondary': 13, '--text-meta': 12,
  };
  const ALLOWED = new Set(TYPE_TIER_ALLOWED);

  function walk(dir, out = []) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name === '.git' || e.name === 'vendor') continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p, out);
      else out.push(p);
    }
    return out;
  }

  /** 扫描面：docs/src 下全部 .css ＋ docs 下全部 .js/.mjs */
  function targetFiles() {
    const css = walk(SRC).filter((f) => f.endsWith('.css'));
    const js = walk(DOCS).filter((f) => /\.(js|mjs)$/.test(f));
    return [...new Set([...css, ...js])].sort();
  }

  const stripCssComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
  /** 只剥整行 `//` 注释（避免误伤 `https://`）与块注释 */
  const stripJsComments = (s) => s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  /** 字号值归一：px / rem / var(--text-*) → px；其它（clamp/calc/em/%/关键字）→ null */
  function normalize(raw) {
    const v = String(raw).trim().replace(/\s*!important$/i, '');
    if (/^-?\d*\.?\d+px$/.test(v)) return parseFloat(v);
    if (/^-?\d*\.?\d+rem$/.test(v)) return Number((parseFloat(v) * 16).toFixed(2));
    const t = /var\((--text-[a-z0-9-]+)\)/.exec(v);
    if (t && TOKENS[t[1]] != null) return TOKENS[t[1]];
    return null;
  }

  /** 抽某文件的全部可解析字号值（数组；保留重复次数） */
  function fontValuesOf(file, src) {
    const isCss = file.endsWith('.css');
    const body = isCss ? stripCssComments(src) : stripJsComments(src);
    const out = [];
    if (!isCss) {
      for (const m of body.matchAll(/(?<![\w-])text-(xs|sm|base|lg|xl|2xl|3xl)\b(?!-)/g)) {
        out.push(TW[`text-${m[1]}`]);
      }
      for (const m of body.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)) out.push(Number(m[1]));
    }
    for (const m of body.matchAll(/font-size\s*:\s*([^;}"'\n`]+)/g)) {
      const v = normalize(m[1]);
      if (v != null) out.push(v);
    }
    return out;
  }

  function scan() {
    return targetFiles().map((abs) => {
      const file = relative(ROOT, abs).replace(/\\/g, '/');
      const values = fontValuesOf(abs, readFileSync(abs, 'utf8'));
      /** @type {Record<number, number>} */
      const outOfTier = {};
      let allowed = 0;
      for (const v of values) {
        if (ALLOWED.has(v)) allowed += 1;
        else outOfTier[v] = (outOfTier[v] || 0) + 1;
      }
      return { file, values, allowed, outOfTier };
    });
  }

  /** 纯函数：按台账判「新增 / 上涨」；便于反例自检（不读磁盘） */
  function tierOffenses(rows, baseline = TYPE_TIER_BASELINE) {
    const bad = [];
    for (const { file, outOfTier } of rows) {
      for (const [k, n] of Object.entries(outOfTier)) {
        const v = Number(k);
        const base = baseline[file]?.[v] || 0;
        if (base === 0) bad.push(`${file} → 新增档位表外字号 ${v}px ×${n}`);
        else if (n > base) bad.push(`${file} → ${v}px 由基线 ${base} 处增至 ${n} 处`);
      }
    }
    return bad;
  }

  // ── Q1 新增档位表外字号 ──────────────────────────────────────────────
  test('Q1 字号档位：档位表外的新 (文件, 值) 判红（新增字号必须落在档位表内）', () => {
    const bad = tierOffenses(scan());
    assert.deepEqual(bad, [],
      `出现 DS_02 §3.2.3 档位表之外的字号（新代码只许用 ${TYPE_TIER_ALLOWED.join(' / ')}px；`
      + '存量按 style-baseline.mjs::TYPE_TIER_BASELINE 登记，只减不增）：\n  ' + bad.join('\n  '));
  });

  // ── Q2 逐文件逐值 ratchet ────────────────────────────────────────────
  test('Q2 处数 ratchet：逐文件逐值的档位表外字号不得高于基线', () => {
    const grow = [];
    for (const { file, outOfTier } of scan()) {
      for (const [k, n] of Object.entries(outOfTier)) {
        const base = TYPE_TIER_BASELINE[file]?.[Number(k)];
        if (base != null && n > base) grow.push(`${file} → ${k}px ${n} 处 > 基线 ${base} 处`);
      }
    }
    assert.deepEqual(grow, [], `以下文件档位表外字号处数高于基线：\n  ${grow.join('\n  ')}`);
  });

  // ── Q3 非空转 / 反例 / 文档齐备 ──────────────────────────────────────
  test('Q3 非空转：抽取器正负例 ＋ 台账自洽 ＋ 文档档位齐备 ＋ 扫描面下限', () => {
    // ① 正例：px / rem / 令牌 / Tailwind 工具类 / 任意值类
    assert.equal(normalize('14px'), 14, '抽取器失效：14px 未归一');
    assert.equal(normalize('0.8125rem'), 13, '抽取器失效：0.8125rem 未归一为 13px');
    assert.equal(normalize('var(--text-body)'), 15, '抽取器失效：var(--text-body) 未归一为 15px');
    assert.deepEqual(fontValuesOf('x.css', '.a{font-size:16px}'), [16], '抽取器失效：CSS font-size 未命中');
    assert.deepEqual(fontValuesOf('x.js', '<b class="text-sm text-[15px]">x</b>'), [14, 15],
      '抽取器失效：text-sm / text-[15px] 未命中');
    // ② 负例：流体值不得被当成静态 px
    assert.deepEqual(fontValuesOf('x.css', '.a{font-size:clamp(14px,2vw,18px)}'), [],
      '抽取器过宽：clamp() 被当成静态档位');
    // ③ 反例实测：合成「新文件 28px」必须判红；档位表内字号必须判绿
    const fakeRed = tierOffenses([{ file: 'docs/src/new-file.js', outOfTier: { 28: 1 } }]);
    assert.equal(fakeRed.length, 1, '反例失效：新文件 28px 未被判红');
    assert.deepEqual(tierOffenses([{ file: 'docs/src/new-file.js', outOfTier: {} }]), [],
      '反例失效：档位表内字号被误判');
    // ④ 台账自洽：条目数 / 总处数 / 值不在档位表内 / 文件真实存在
    const files = Object.keys(TYPE_TIER_BASELINE);
    assert.equal(files.length, TYPE_TIER_FILE_BASELINE, '基线条目数与声明文件数不一致');
    const sum = Object.values(TYPE_TIER_BASELINE)
      .reduce((a, o) => a + Object.values(o).reduce((x, y) => x + y, 0), 0);
    assert.equal(sum, TYPE_TIER_TOTAL_BASELINE, '基线处数之和与声明总处数不一致');
    for (const [f, vals] of Object.entries(TYPE_TIER_BASELINE)) {
      assert.ok(existsSync(join(ROOT, f)), `基线条目指向不存在的文件：${f}`);
      for (const [k, n] of Object.entries(vals)) {
        assert.ok(!ALLOWED.has(Number(k)), `${f}：${k}px 已在档位表内，不应进基线`);
        assert.ok(Number.isFinite(Number(k)) && n > 0, `${f}：基线值/处数非法（${k}: ${n}）`);
      }
    }
    // ⑤ 文档齐备：档位表必须逐值写进 DS_02 §3.2.3（防止代码与文档两套刻度）
    const doc = readFileSync(DS02, 'utf8');
    for (const tier of TYPE_TIER_ALLOWED) {
      assert.ok(doc.includes(`${tier}px`), `DS_02 §3.2.3 缺档位 ${tier}px`);
    }
    assert.match(doc, /3\.2\.3\s+全站实测字号档位/, 'DS_02 缺 §3.2.3 全站实测字号档位');
    // ⑥ 扫描面非空（防「扫描范围被削成空目录 ⇒ Q1 恒绿」）
    const rows = scan();
    const decls = rows.reduce((a, r) => a + r.values.length, 0);
    assert.ok(rows.length >= 50, `扫描面过窄（${rows.length} 文件，下限 50）`);
    assert.ok(decls >= 300, `可解析字号声明过少（${decls} 处，下限 300）`);
  });

  // ── Q4 进度（只报不判）──────────────────────────────────────────────
  test('Q4 缩减进度：档位表内 / 表外当前计数', () => {
    const rows = scan();
    const allowed = rows.reduce((a, r) => a + r.allowed, 0);
    const out = rows.reduce((a, r) => a + Object.values(r.outOfTier).reduce((x, y) => x + y, 0), 0);
    const byValue = {};
    for (const r of rows) for (const [k, n] of Object.entries(r.outOfTier)) byValue[k] = (byValue[k] || 0) + n;
    const d = (cur, base) => (cur === base ? '持平' : cur < base ? `↓${base - cur}` : `↑${cur - base}`);
    console.log(`[字号档位] 档位表内 ${allowed} 处 · 表外 ${out} 处（基线 ${TYPE_TIER_TOTAL_BASELINE}，${d(out, TYPE_TIER_TOTAL_BASELINE)}）`
      + ` · 文件 ${rows.filter((r) => Object.keys(r.outOfTier).length).length}（基线 ${TYPE_TIER_FILE_BASELINE}）`);
    console.log(`[字号档位 · 表外按值] ${JSON.stringify(byValue)}`);
    console.log('[口径单一源] DS_02 §3.2.3 档位表；新增档位先改文档与 TYPE_TIER_ALLOWED，再清存量（只减不增）。');
  });

})();
