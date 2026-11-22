// role: [工程师]+[AI]
// style-ratchet-guard.test.mjs — 守卫归并件（2026-11-22 批次 600 · D-910）
// 归并来源：type-scale-guard.test.mjs · spacing-scale-guard.test.mjs · spacing-ratchet-guard.test.mjs · density-spacing-guard.test.mjs · container-width-guard.test.mjs · responsive-cards-guard.test.mjs · card-summary-hero-guard.test.mjs · row-markup-guard.test.mjs · action-row-wrap-guard.test.mjs · hover-state-guard.test.mjs · no-underline-guard.test.mjs · motion-guard.test.mjs · ui-motion-guard.test.mjs · dead-selector-guard.test.mjs · card-consistency-guard.test.mjs
// 纪律：只减文件数、不减断言数；每个源件包在独立 async 块作用域里（imports 转动态导入），
//   同名 helper / 常量互不冲突；失败信息保留各源件的横幅与断言名，便于定位。

// ═══ 源件 1：type-scale-guard.test.mjs ═══
await (async () => {
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
      TEXT_XS_BASELINE,
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
  
    // ── Q5 折叠头单一语法（2026-11-01）────────────────────────────────────
    // 病灶：折叠头标题在 todo-tab-shell.js 用 `font-title-cn`（800）＋ `text-sm`（14px）覆盖组件类，
    //   与同列「我的待办」16px/600 不一致。裁定：标题字号/字重/字族只在 `.disclosure__title` 定义，
    //   调用点不得再用 Tailwind 字号 / 标题字重类覆盖。
    /** 纯判据：标题规则体缺哪几项（空数组＝合规） */
    function titleTierProblems(body) {
      const bad = [];
      if (!/font-size:\s*var\(--text-md\)/.test(body)) bad.push('font-size 须为 var(--text-md)');
      if (!/font-weight:\s*600/.test(body)) bad.push('font-weight 须为 600');
      if (!/line-height:\s*24px/.test(body)) bad.push('line-height 须为 24px');
      return bad;
    }
    /** 纯判据：折叠头标题标签上的禁用类（空数组＝合规） */
    function titleClassProblems(tag) {
      const bad = [];
      if (/\bfont-title-cn\b/.test(tag)) bad.push('font-title-cn');
      if (/\btext-sm\b/.test(tag)) bad.push('text-sm');
      return bad;
    }
  
    test('Q5 折叠头单一语法：.disclosure__title 16/600/24，调用点不得再覆盖字号/标题字重', () => {
      const css = readFileSync(join(SRC, 'styles.css'), 'utf8');
      const body = /\.disclosure__title\s*\{([^}]*)\}/.exec(css)?.[1];
      assert.ok(body, 'styles.css 缺 .disclosure__title 规则');
      assert.deepEqual(titleTierProblems(body), [],
        `.disclosure__title 须为 16/600/24（--text-md）：${titleTierProblems(body).join(' / ')}`);
  
      const shell = readFileSync(join(SRC, 'components', 'record', 'todo-tab-shell.js'), 'utf8');
      const tag = /<h3\b[^>]*\bid="todo-strip-title"[^>]*>/.exec(shell)?.[0];
      assert.ok(tag, 'todo-tab-shell.js 缺折叠头标题 #todo-strip-title');
      assert.match(tag, /\bdisclosure__title\b/, '折叠头标题须挂 .disclosure__title');
      assert.deepEqual(titleClassProblems(tag), [],
        `折叠头标题类不得含 ${titleClassProblems(tag).join(' / ')}（字号/字重由 .disclosure__title 统一给出）`);
  
      // 反例：14px/800 的合成规则与旧调用点类必须被同一口径判红。
      assert.ok(titleTierProblems('.disclosure__title { font-size: 14px; font-weight: 800; line-height: 20px; }').length >= 2,
        '反例失效：14px/800 未命中（判据会恒绿）');
      assert.deepEqual(titleClassProblems('<h3 class="disclosure__title font-title-cn text-sm px-4">'), ['font-title-cn', 'text-sm'],
        '反例失效：旧调用点类未被识别');
      assert.deepEqual(titleClassProblems('<h3 class="disclosure__title text-base px-4">'), [],
        '正例失效：现行调用点类被误判');
    });
  
    // ── Q6 text-xs 存量棘轮（2026-11-03 批次 533 · B-515-5）──────────────
    // 口径：`docs/src` 下全部 `.js` / `.mjs` 中 `text-xs` 出现次数（CSS 定义 / about.css / 静态页 HTML 不计）。
    // 判据：正文段上迁 13px（`.text-body-sm`），标签 / meta / 计数保持 12px；总量只减不增。
    test('Q6 text-xs 存量只减不增：处数 / 文件数不得高于基线', () => {
      let total = 0, files = 0;
      for (const f of walk(SRC).filter((x) => /\.(js|mjs)$/.test(x))) {
        const n = (readFileSync(f, 'utf8').match(/\btext-xs\b/g) || []).length;
        if (n) { total += n; files += 1; }
      }
      assert.ok(total <= TEXT_XS_BASELINE.total,
        `text-xs 存量 ${total} 处 > 基线 ${TEXT_XS_BASELINE.total} 处：新增须落档（正文取 .text-body-sm / 标签取 11px），`
        + '迁出正文段后同批下调 style-baseline::TEXT_XS_BASELINE');
      assert.ok(files <= TEXT_XS_BASELINE.files,
        `text-xs 文件数 ${files} > 基线 ${TEXT_XS_BASELINE.files}：不得向新文件扩散`);
      // 非空转：正例命中 2 次；相似但不同的类不得命中
      assert.equal(('class="text-xs" text-xs').match(/\btext-xs\b/g).length, 2, '抽取口径失效');
      assert.equal(('class="text-body-sm" text-xsx').match(/\btext-xs\b/g), null, '抽取口径过宽');
    });
  
  })();

})();

// ═══ 源件 2：spacing-scale-guard.test.mjs ═══
await (async () => {
  // server/test/spacing-scale-guard.test.mjs — 间距五档与自由值存量守卫（2026-10-18 立 · Task 1）
  // 2026-10-31 追加 S5–S7：styles.css 非令牌声明 / 行内间距声明 / 含行内间距属性三档棘轮（只减不增）。
  //
  // 来源：Spec「工作台密度与组件重组」Task 1 / DESIGN_SYSTEM §4.21。
  //   病灶：间距此前没有档位表，页面直接写 `p-[14px]` / `gap-[10px]` / `mt-[6px]`，
  //   同屏出现多种厚度，且改一处不会带动其它页。
  //
  // 判据：
  //   S1 styles.css 存在 --space-1/2/3/4/6 且值分别为 4/8/12/16/24px；
  //   S2 docs/src 下任意间距类（p-/px-/py-/.../gap-/space-y-/space-x- + [Npx]）的存量
  //      **只降不升**（基线＝2026-10-18 本批实测 35）；
  //   S3 本批新增的四个复用模块不得出现自由间距值；
  //   S4 DESIGN_SYSTEM §4.21 的档位 / 组件族 / 禁止条款术语齐备（Task 9.3 的文档面）。
  //
  // 基线纪律：**只降不升**。迁移存量后请同批下调 SPACING_BASELINE；不得为变绿上调。
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync, readdirSync, statSync } = await import('node:fs');
  const { join, relative, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const { SPACING_NON_TOKEN_BASELINE, SPACING_INLINE_DECL_BASELINE, SPACING_INLINE_ATTR_BASELINE, } = await import('./style-baseline.mjs');
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const SRC = join(ROOT, 'docs', 'src');
  const CSS = join(SRC, 'styles.css');
  const DESIGN = join(ROOT, 'content', '04_web_design', 'design-system', 'DS_03_COMPONENTS.md');
  
  /** 五档令牌（单一源＝styles.css :root） */
  const SPACE_TOKENS = [
    ['--space-1', '4px'],
    ['--space-2', '8px'],
    ['--space-3', '12px'],
    ['--space-4', '16px'],
    ['--space-6', '24px'],
  ];
  
  /** 自由间距值：任意值工具类（长前缀在前，避免 p- 抢先命中 px-/py-） */
  const ARBITRARY_SPACING_RE = /\b(?:space-y|space-x|px|py|pt|pb|pl|pr|p|mx|my|mt|mb|ml|mr|m|gap)-\[\d+(?:\.\d+)?px\]/g;
  
  /** 基线（2026-10-18 本批实测 35；2026-10-20 浮窗/六条 IA 批次把全部 `py-[7px]` 迁到 `py-1.5` ⇒ 0；只降不升） */
  const SPACING_BASELINE = 0;
  
  /** 本批新增的四个模块（Task 2） */
  const NEW_MODULES = ['list-row.js', 'filter-bar.js', 'data-table.js', 'empty-state.js']
    .map((n) => join(SRC, 'components', 'ui', n));
  
  function walk(dir, out = []) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p, out);
      else if (/\.(js|mjs|css|html)$/.test(e.name)) out.push(p);
    }
    return out;
  }
  
  function countArbitrarySpacing(src) {
    return (src.match(ARBITRARY_SPACING_RE) || []).length;
  }
  
  test('S1 间距五档令牌：styles.css 存在且值为 4/8/12/16/24px', () => {
    const css = readFileSync(CSS, 'utf8');
    for (const [token, value] of SPACE_TOKENS) {
      assert.match(css, new RegExp(`${token}\\s*:\\s*${value}\\s*;`),
        `styles.css 缺少 ${token}: ${value}; —— 五档间距必须由 :root 单一源提供`);
    }
  });
  
  test('S2 自由间距值存量只降不升（基线 0）', () => {
    const files = walk(SRC);
    const perFile = new Map();
    let total = 0;
    for (const f of files) {
      const n = countArbitrarySpacing(readFileSync(f, 'utf8'));
      if (!n) continue;
      total += n;
      perFile.set(relative(ROOT, f).replace(/\\/g, '/'), n);
    }
    const ledger = [...perFile.entries()].sort((a, b) => b[1] - a[1])
      .map(([f, n]) => `  ${String(n).padStart(3)}  ${f}`).join('\n');
    console.log(`[spacing-scale-guard] docs/src 自由间距值 ${total} 个（棘轮上限 ${SPACING_BASELINE}）：\n${ledger}`);
    assert.ok(total <= SPACING_BASELINE,
      `自由间距值由 ${SPACING_BASELINE} 升到 ${total} 个 ⇒ 新代码只能引用 --space-1/2/3/4/6 或 §4.21 的语义类；迁移一屏请同批下调基线。`);
  });
  
  test('S3 新增四个复用模块不得出现自由间距值', () => {
    const offenders = [];
    for (const f of NEW_MODULES) {
      const src = readFileSync(f, 'utf8');
      const hits = src.match(ARBITRARY_SPACING_RE) || [];
      if (hits.length) offenders.push(`${relative(ROOT, f).replace(/\\/g, '/')} → ${[...new Set(hits)].join(' / ')}`);
    }
    assert.deepEqual(offenders, [],
      `新增模块出现自由间距值（应引用 styles.css 令牌或语义类）：\n  ${offenders.join('\n  ')}`);
  });
  
  test('S4 DESIGN_SYSTEM §4.21：五档定义、组件族采用矩阵与禁止条款齐备', () => {
    const doc = readFileSync(DESIGN, 'utf8');
    assert.match(doc, /### 4\.21 间距五档与组件采用矩阵/, 'DESIGN_SYSTEM 缺 §4.21 标题');
    for (const [token, value] of SPACE_TOKENS) {
      assert.ok(doc.includes(token) && doc.includes(value),
        `§4.21 缺间距令牌 ${token}（${value}）`);
    }
    for (const term of ['页面区块', '标准卡', '紧凑卡', '列表行', '表格单元', '表单字段', '徽章', '按钮']) {
      assert.ok(doc.includes(term), `§4.21 组件采用矩阵缺组件族「${term}」`);
    }
    for (const banned of ['p-[14px]', 'gap-[10px]', 'mt-[6px]']) {
      assert.ok(doc.includes(banned), `§4.21 禁止条款缺自由值示例「${banned}」`);
    }
  });
  
  // ════════════════════════════════════════════════════════════════
  // S5–S7 · 间距令牌覆盖率棘轮（2026-10-31 低风险收口批）
  //   病灶：styles.css 大量间距仍写裸值；行内 style 的 margin/padding 分散在页面里。
  //   本批**不做批量替换**（会改变渲染），只立棘轮：
  //   S5 styles.css 中「非 var(--space-*) 且非 0/auto」的 margin/padding/gap 声明 ≤ 基线；
  //   S6/S7 docs/**/*.{js,mjs,html} 的 style="…" 内间距声明数 / 含间距属性数 ≤ 基线。
  //   收基线：迁走一段就同批下调 style-baseline.mjs 的对应常量；不得为变绿上调。
  // ════════════════════════════════════════════════════════════════
  
  /** 间距属性（长名在前，避免 `p-` 抢先命中 `px-`；扫描面只认这些语义属性） */
  const SPACING_PROP_RE = /^(?:margin|padding)(?:-(?:top|right|bottom|left))?$|^(?:gap|row-gap|column-gap)$/;
  /** 零值 / 关键字：不算「间距取值」，不参与棘轮 */
  const SPACING_RESET_RE = /^(?:0|auto|inherit|initial|unset)$/i;
  /** styles.css 声明抽取（注释先剥掉，避免把文档表格里的示例算进去） */
  const SPACING_DECL_RE = /(?:^|[;{\s])((?:margin|padding)(?:-(?:top|right|bottom|left))?|gap|row-gap|column-gap)\s*:\s*([^;}]+)/g;
  /** 行内 style 属性（单/双引号 + JS 模板串三态） */
  const STYLE_ATTR_RE = /style=(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g;
  
  const stripCssComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
  
  /** 纯函数：styles.css 非令牌间距声明（反例自检用；不读磁盘） */
  function countNonTokenSpacing(css) {
    let nonToken = 0;
    let token = 0;
    for (const m of stripCssComments(css).matchAll(SPACING_DECL_RE)) {
      const v = m[2].trim().replace(/\s*!important$/i, '');
      if (SPACING_RESET_RE.test(v)) continue;
      if (/var\(--space-\d+\)/.test(v)) token += 1;
      else nonToken += 1;
    }
    return { nonToken, token };
  }
  
  /** 纯函数：行内间距统计（反例自检用；不读磁盘） */
  function countInlineSpacing(src) {
    let attrs = 0;
    let decls = 0;
    for (const m of src.matchAll(STYLE_ATTR_RE)) {
      const body = m[1] ?? m[2] ?? m[3] ?? '';
      let hit = 0;
      for (const d of body.split(';')) {
        const i = d.indexOf(':');
        if (i < 0) continue;
        if (!SPACING_PROP_RE.test(d.slice(0, i).trim())) continue;
        const v = d.slice(i + 1).trim().replace(/\s*!important$/i, '');
        if (SPACING_RESET_RE.test(v)) continue;
        hit += 1;
      }
      if (hit) attrs += 1;
      decls += hit;
    }
    return { attrs, decls };
  }
  
  test('S5 styles.css 非令牌间距声明只减不增（含反例自检）', () => {
    // 反例自检：裸值计入、令牌不计、0 不计（证明计数器不是恒 0 / 恒真）
    assert.deepEqual(countNonTokenSpacing('.a{padding:7px}.b{padding:var(--space-2)}.c{margin:0}'),
      { nonToken: 1, token: 1 }, 'S5 计数器失效：裸值 / 令牌 / 零值未被正确区分');
    const { nonToken, token } = countNonTokenSpacing(readFileSync(CSS, 'utf8'));
    console.log(`[S5] styles.css 间距声明：令牌 ${token} 条 · 非令牌 ${nonToken} 条（棘轮上限 ${SPACING_NON_TOKEN_BASELINE}）`);
    assert.ok(nonToken <= SPACING_NON_TOKEN_BASELINE,
      `styles.css 非令牌间距声明由 ${SPACING_NON_TOKEN_BASELINE} 升到 ${nonToken} ⇒ 新代码先引用 --space-1/2/3/4/6；`
      + '迁走一条请同批下调 style-baseline.mjs::SPACING_NON_TOKEN_BASELINE。');
    assert.ok(token >= 80, `令牌间距只剩 ${token} 条（下限 80）：抽取口径或令牌被削，棘轮失去对照面`);
  });
  
  test('S6 行内间距声明只减不增（含反例自检）', () => {
    assert.deepEqual(countInlineSpacing('<div style="margin-top:8px;padding:0">x</div>'), { attrs: 1, decls: 1 },
      'S6 计数器失效：行内 margin-top 未计入 / padding:0 未排除');
    let decls = 0;
    let attrs = 0;
    let files = 0;
    for (const f of walk(ROOT + '/docs')) {
      if (!/\.(js|mjs|html)$/.test(f)) continue;
      const r = countInlineSpacing(readFileSync(f, 'utf8'));
      if (r.attrs) files += 1;
      decls += r.decls;
      attrs += r.attrs;
    }
    console.log(`[S6] 行内间距声明 ${decls} 条 / 属性 ${attrs} 处 / 文件 ${files}（棘轮上限 ${SPACING_INLINE_DECL_BASELINE} 条）`);
    assert.ok(decls <= SPACING_INLINE_DECL_BASELINE,
      `行内间距声明由 ${SPACING_INLINE_DECL_BASELINE} 升到 ${decls} ⇒ 新代码改用 --space-* 或语义类；`
      + '迁走一条请同批下调 style-baseline.mjs::SPACING_INLINE_DECL_BASELINE。');
    assert.ok(attrs >= 100, `行内间距属性只剩 ${attrs} 处（下限 100）：扫描面被削，棘轮失去约束力`);
  });
  
  test('S7 含行内间距的 style 属性只减不增', () => {
    let attrs = 0;
    for (const f of walk(ROOT + '/docs')) {
      if (!/\.(js|mjs|html)$/.test(f)) continue;
      attrs += countInlineSpacing(readFileSync(f, 'utf8')).attrs;
    }
    assert.ok(attrs <= SPACING_INLINE_ATTR_BASELINE,
      `含行内间距的 style 属性由 ${SPACING_INLINE_ATTR_BASELINE} 升到 ${attrs} ⇒ 新增行内间距须先登记基线并写理由。`);
  });

})();

// ═══ 源件 3：spacing-ratchet-guard.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // server/test/spacing-ratchet-guard.test.mjs — 间距档位与暗色补丁棘轮（2026-11-20 批次 581 续）
  //
  // 判据：
  //   ① 间距工具类只允许 1 / 2 / 3 / 4 / 6 档；其余（5 / 7 / 8 / 1.5 / 2.5 / 3.5 …）计入「自由间距」，
  //      存量 1245 处登记为基线，**只减不增**；新增自由值即红。
  //   ② `html.theme-dark .text-*` 补丁 23 条登记为基线，**只减不增**；新代码应直接用 `--status-*-text` / `--neutral-*`。
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readdirSync, statSync, readFileSync } = await import('node:fs');
  const { join, relative } = await import('node:path');
  const ROOT = join(import.meta.dirname, '..', '..');
  const SRC = join(ROOT, 'docs', 'src');
  const FREE_SPACING_BASELINE = 1192;
  const DARK_TEXT_BASELINE = 22;
  
  function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full, out);
      else if (/\.(js|html)$/.test(name)) out.push(full);
    }
    return out;
  }
  
  function countFreeSpacing() {
    let total = 0;
    const files = [];
    for (const file of walk(SRC)) {
      const text = readFileSync(file, 'utf8');
      let count = 0;
      for (const m of text.matchAll(/class="([^"]*)"/g)) {
        for (const token of m[1].split(/\s+/)) {
          const hit = /^(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap)-(\d+(?:\.\d+)?)$/.exec(token);
          if (!hit) continue;
          if (![1, 2, 3, 4, 6].includes(Number(hit[1]))) count += 1;
        }
      }
      if (count) {
        total += count;
        files.push(`${relative(ROOT, file).replace(/\\/g, '/')}（${count}）`);
      }
    }
    return { total, files };
  }
  
  test('① 间距工具类只允许 1/2/3/4/6 档；自由间距只减不增', () => {
    const { total, files } = countFreeSpacing();
    assert.ok(total <= FREE_SPACING_BASELINE,
      `自由间距 ${total} 超过基线 ${FREE_SPACING_BASELINE}；请改用 1/2/3/4/6 档：\n  ${files.slice(0, 20).join('\n  ')}`);
    assert.ok(total >= FREE_SPACING_BASELINE - 40,
      `自由间距已显著下降（${total} < 基线 ${FREE_SPACING_BASELINE} − 40）：请同批下调基线，保持棘轮只减不增`);
  });
  
  test('② 暗色 Tailwind 补丁只减不增（当前 22 条）', () => {
    const css = readFileSync(join(SRC, 'styles.css'), 'utf8');
    const count = (css.match(/html\.theme-dark\s+\.text-[a-z0-9-]+\s*\{/g) || []).length;
    assert.ok(count <= DARK_TEXT_BASELINE, `暗色 Tailwind 补丁 ${count} 超过基线 ${DARK_TEXT_BASELINE}；新代码请用 --status-*-text / --neutral-*`);
  });

})();

// ═══ 源件 4：density-spacing-guard.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // density-spacing-guard.test.mjs — 组件密度与间距节奏守卫（spec redesign-theme-palette-and-density · Task 9）
  //
  // 为什么要有本守卫：
  //   · Task 6 把「高度是内容副产物」改成「高度是设计值」：输入 40/34、按钮 36/32/28 由
  //     padding + 显式 line-height 推导（不再用 min-height 撑高）、行 48/56/44/40、summary 40。
  //     此前只有 button-system-guard 数按钮，没有任何判据能防止「页面又用 min-height/h-* 把高度拉回去」。
  //   · 判据：
  //       D1 输入/下拉：.input-flat 8+8+22+2=40；.input-flat-sm 8+8+16+2=34
  //       D2 按钮三档：36（页面/弹窗）/32（卡片/页签）/28（行内），均由 padding + line-height + 边框推导，
  //          且这三档规则体内不得出现 min-height（高度不得脱离文字行高）
  //       D3 行型：--row-standard 48 / --row-comfortable 56 / --row-compact 44 / --row-table 40 /
  //          --row-summary 40，并被 .list-row / .notice-row / .todo-row / summary 实际消费
  //       D4 命中区：行内 28px 按钮用伪元素扩到 ≥44px（视觉高度不变）
  //       D5 间距：--space-* 恰五档 4/8/12/16/24；组件内离档值（2/6/10/14/20）只降不升
  //       D6 Tailwind 1.5/2.5/3.5 数值档只降不升（口径见下方常量注释）
  //       D7 页头说明→summary 8–12；标题→次级 8
  // 运行：node --test server/test/density-spacing-guard.test.mjs
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync, readdirSync, statSync } = await import('node:fs');
  const { join, dirname, relative } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const HERE = dirname(fileURLToPath(import.meta.url));
  const ROOT = join(HERE, '..', '..');
  const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
  const STYLES = read('docs/src/styles.css');
  
  /** 极简规则切分（只取「选择器 { 声明 }」；本段无嵌套 at-rule） */
  function cssRules(section) {
    const out = [];
    const re = /([^{}]+)\{([^{}]*)\}/g;
    let m;
    while ((m = re.exec(section.replace(/\/\*[\s\S]*?\*\//g, ''))) !== null) {
      out.push({ selector: m[1].trim(), body: m[2] });
    }
    return out;
  }
  
  /**
   * 取某选择器的规则体：**按逗号分隔后的完整选择器精确匹配**。
   * 不能用「子串 + 前置空白」匹配——`html.font-size-large .input-flat { … }`
   * 会先命中，导致读到的是字号覆盖块而不是 `.input-flat` 本体。
   */
  function ruleBody(css, selector) {
    for (const r of cssRules(css)) {
      if (r.selector.split(',').map((s) => s.trim()).includes(selector)) return r.body;
    }
    return '';
  }
  
  /** 纵向 padding（支持 padding / padding-top+bottom 两种写法；忽略 !important） */
  function paddingY(body) {
    const m = /(?:^|;)\s*padding\s*:\s*([^;]+)/.exec(body);
    if (m) {
      const parts = m[1].replace(/!important/gi, '').trim().split(/\s+/).filter((x) => /^\d+(?:\.\d+)?px$/.test(x));
      const top = parseFloat(parts[0]);
      const bottom = parts.length > 2 ? parseFloat(parts[2]) : top;
      return top + bottom;
    }
    const t = /padding-top\s*:\s*(\d+(?:\.\d+)?)px/.exec(body);
    const b = /padding-bottom\s*:\s*(\d+(?:\.\d+)?)px/.exec(body);
    return t && b ? parseFloat(t[1]) + parseFloat(b[1]) : NaN;
  }
  
  /** 显式 line-height（px） */
  function lineHeightPx(body) {
    const m = /(?:^|;)\s*line-height\s*:\s*(\d+(?:\.\d+)?)px/.exec(body);
    return m ? parseFloat(m[1]) : NaN;
  }
  
  /** 边框（默认按钮/控件均为 1px 上下边） */
  const BORDER_Y = 2;
  
  function heightOf(body) {
    const py = paddingY(body);
    const lh = lineHeightPx(body);
    return Number.isFinite(py) && Number.isFinite(lh) ? py + lh + BORDER_Y : NaN;
  }
  
  test('D1 输入/下拉：40px 单档 + 34px 紧凑档（padding + 显式 line-height 推导）', () => {
    const base = ruleBody(STYLES, '.input-flat');
    assert.ok(base, 'styles.css 缺少 .input-flat 规则');
    assert.equal(paddingY(base), 16, '.input-flat 纵向内边距应为 8 + 8');
    assert.equal(lineHeightPx(base), 22, '.input-flat 行高应为 22px（高度必须显式声明）');
    assert.equal(heightOf(base), 40, '.input-flat 应由 8+8+22+2 推导为 40px');
    assert.match(base, /font-size:\s*0\.8125rem/, '.input-flat 正文应为 13px');
  
    const sm = ruleBody(STYLES, '.input-flat-sm');
    assert.ok(sm, 'styles.css 缺少 .input-flat-sm 规则');
    assert.equal(heightOf(sm), 34, '.input-flat-sm 应由 8+8+16+2 推导为 34px');
  
    assert.match(STYLES, /--control-h:\s*40px\s*;/, '--control-h 应为 40px');
    assert.match(STYLES, /--control-h-sm:\s*34px\s*;/, '--control-h-sm 应为 34px');
  
    const csTrigger = ruleBody(STYLES, '.cs-trigger.input-flat');
    assert.ok(csTrigger, 'styles.css 缺少 .cs-trigger.input-flat 规则');
    assert.equal(heightOf(csTrigger), 40, '.cs-trigger.input-flat 应与输入框同高 40px');
  });
  
  test('D2 按钮三档：36 / 32 / 28 由 padding + line-height 推导，主档不得用 min-height', () => {
    const marker = STYLES.indexOf('按钮尺寸归一（2026-10-18）');
    assert.ok(marker >= 0, 'styles.css 缺少「按钮尺寸归一（2026-10-18）」段');
    const rowMarker = STYLES.indexOf('列表行边框收敛（2026-10-18）', marker);
    const section = STYLES.slice(marker, rowMarker > marker ? rowMarker : undefined)
      .replace(/\/\*[\s\S]*?\*\//g, '');
    const rules = cssRules(section);
    assert.ok(rules.length >= 8, `按钮尺寸段规则数过少（${rules.length}），解析可能写坏`);
  
    // 只取「归一档」规则：同时含 padding 与**显式 px 行高**（避免命中组件基础样式块里 line-height:1 的写法）
    const find = (token) => rules.find((r) => new RegExp(`\\.${token}(?![\\w-])`).test(r.selector)
      && /padding/.test(r.body) && /line-height\s*:\s*\d+(?:\.\d+)?px/.test(r.body));
    const tierRules = [];
    const expectTier = (token, height) => {
      const r = find(token);
      assert.ok(r, `「按钮尺寸归一」段缺少 .${token} 的尺寸档`);
      assert.equal(heightOf(r.body), height, `.${token} 应由 padding + line-height 推导为 ${height}px（实际 ${heightOf(r.body)}）`);
      assert.doesNotMatch(r.body, /min-height/, `.${token} 不得用 min-height 撑高（高度须由文字行高参与计算）`);
      tierRules.push({ token, body: r.body });
    };
    // 36px 页面 / 弹窗档
    for (const token of ['btn-accent', 'btn-accent-soft', 'btn-outline', 'btn-danger', 'btn-danger-solid', 'btn-md', 'btn-neutral']) {
      expectTier(token, 36);
    }
    // 32px 卡片 / 页签档
    for (const token of ['btn-ghost', 'btn-tab']) expectTier(token, 32);
    // 28px 行内档
    for (const token of ['btn-sm', 'btn-action']) expectTier(token, 28);
  
    // 宽度由内容决定：三档只写水平内边距（页面 10 / 卡片 8 / 行内 8），不写固定 width
    assert.match(find('btn-accent').body, /padding:\s*8px\s+10px/, '36px 档水平内边距应为 10px');
    assert.match(find('btn-ghost').body, /padding:\s*4px\s+8px/, '32px 档水平内边距应为 8px');
    assert.match(find('btn-action').body, /padding:\s*4px\s+8px/, '28px 档水平内边距应为 8px');
    for (const t of tierRules) assert.doesNotMatch(t.body, /(?:^|[;\s])width\s*:/, `按钮档不得写固定宽度（宽度由内容决定）：.${t.token}`);
  });
  
  test('D3 行型：单行 48 / 双行 56 / 紧凑 44 / 表格 40 / summary 40，且被实际消费', () => {
    const vars = {};
    for (const [name, px] of [['--row-standard', 48], ['--row-comfortable', 56], ['--row-compact', 44], ['--row-table', 40], ['--row-summary', 40]]) {
      const m = new RegExp(`${name}:\\s*(\\d+)px`).exec(STYLES);
      assert.ok(m, `缺少 ${name}`);
      assert.equal(Number(m[1]), px, `${name} 应为 ${px}px`);
      vars[name] = px;
    }
    assert.ok(vars['--row-standard'] === 48 && vars['--row-comfortable'] === 56 && vars['--row-compact'] === 44,
      '行型必须为 48 / 56 / 44 三档');
  
    const listRow = ruleBody(STYLES, '.list-row');
    assert.match(listRow, /min-height:\s*var\(--row-standard\)/, '.list-row 应消费 --row-standard（48）');
    assert.match(listRow, /padding:\s*var\(--space-2\) var\(--space-3\)/, '.list-row 纵向留白应为 8px');
    assert.doesNotMatch(listRow, /min-height:\s*(?:55|61|62|79|82)px/, '.list-row 不得出现 55/61/62/79/82 等旧高度');
  
    const noticeRow = ruleBody(STYLES, '.notice-row');
    assert.match(noticeRow, /min-height:\s*var\(--row-comfortable\)/, '.notice-row 应走双行 56');
    const todoRow = ruleBody(STYLES, '.todo-row.list-row');
    assert.match(todoRow, /--row-standard:\s*var\(--row-comfortable\)/, '.todo-row 应把单行档改写为双行 56');
  
   // 2026-10-24 批次 508：summary 的 40 命中高只作用于「非按钮摘要」，
    //   按钮族 summary（.btn-outline/.btn-sm/…）按按钮档取高，不再 40/32/28 三值并存。
    const summary = ruleBody(STYLES, 'summary:not(.btn-outline):not(.btn-accent-soft):not(.btn-ghost):not(.btn-sm):not(.btn-tab)');
    assert.match(summary, /min-height:\s*var\(--row-summary\)/,
      '非按钮 summary 最小命中高应为 var(--row-summary)（40）——按钮族 summary 由按钮档接管');
    assert.match(STYLES, /--row-summary:\s*40px/, '--row-summary 应为 40px');
  });
  
  test('D4 行内 28px 按钮命中区 ≥44px（伪元素扩展，不改视觉高度）', () => {
    const body = ruleBody(STYLES, '.list-row__trailing .btn-sm::after');
    assert.ok(body, '缺少 .list-row__trailing .btn-sm::after 命中区规则');
    assert.match(body, /width:\s*max\(100%,\s*44px\)/, '命中区宽度应 ≥44px');
    assert.match(body, /height:\s*max\(100%,\s*44px\)/, '命中区高度应 ≥44px');
    assert.match(body, /transform:\s*translate\(-50%,\s*-50%\)/, '命中区应居中扩展');
    // 视觉高度仍为 28（由 D2 保证），此处不得再写 height: 44px 改变视觉
    assert.doesNotMatch(body, /(?:^|[;\s])height:\s*44px/, '命中区不得把视觉高度改成 44px');
  });
  
  test('D5 间距：--space-* 恰五档；组件内离档值（2/6/10/14/20）只降不升', () => {
    const space = {};
    for (const m of STYLES.matchAll(/--space-([\w-]+):\s*(\d+)px/g)) space[`--space-${m[1]}`] = Number(m[2]);
    assert.deepEqual(space, {
      '--space-1': 4, '--space-2': 8, '--space-3': 12, '--space-4': 16, '--space-6': 24,
    }, '间距令牌应恰为 4/8/12/16/24 五档');
  
    // 组件内离档值：padding / margin / gap 系列里出现 2/6/10/14/20px 的次数。
    // 基线 = 2026-10-23 批次 505 实测 113（Task 6 只在触碰范围收敛，未做全量替换）。
    // 棘轮：只降不升；每清理一批同批下调。
    const OFF_TIER_BASELINE = 113;
    const offRe = /(?:^|[;{])\s*(padding|margin|gap|row-gap|column-gap|padding-top|padding-right|padding-bottom|padding-left|margin-top|margin-right|margin-bottom|margin-left)\s*:\s*([^;{}]+)/g;
    const offValues = new Set(['2', '6', '10', '14', '20']);
    let off = 0;
    let m;
    while ((m = offRe.exec(STYLES)) !== null) {
      const px = (m[2].match(/(\d+)px/g) || []).map((v) => v.replace('px', ''));
      for (const v of px) if (offValues.has(v)) off += 1;
    }
    console.log(`[density] 组件内离档间距值 ${off} 处（棘轮上限 ${OFF_TIER_BASELINE}）`);
    assert.ok(off > 0, '离档值统计为 0：抽取口径可能失效（非空转）');
    assert.ok(off <= OFF_TIER_BASELINE, `组件内离档间距值由 ${OFF_TIER_BASELINE} 升到 ${off} 处 ⇒ 组件内边距只取 4/8/12/16/24；新增即红`);
  });
  
  test('D6 Tailwind 1.5/2.5/3.5 数值档只降不升', () => {
    // 口径：docs 下全部 .js/.html 的 Tailwind 类串里 `*-1.5 / *-2.5 / *-3.5`（排除 vendor）。
    // spec 原文的「160 处 / 20 文件」是早期抽样口径；本守卫按全量实测登记：
    //   2026-10-23 批次 505 实测 1056 处 / 99 文件（Task 6 只收敛触碰范围，未做全量替换）。
    // 棘轮：只降不升。
    const TOTAL_BASELINE = 1056;
    const FILE_BASELINE = 99;
    const walk = (dir, out = []) => {
      for (const n of readdirSync(dir)) {
        if (n === 'vendor') continue;
        const p = join(dir, n);
        if (statSync(p).isDirectory()) walk(p, out);
        else if (/\.(js|html)$/.test(n)) out.push(p);
      }
      return out;
    };
    const re = /\b[A-Za-z-]+-(?:1\.5|2\.5|3\.5)\b/g;
    let total = 0;
    const perFile = new Map();
    for (const f of walk(join(ROOT, 'docs'))) {
      const hits = readFileSync(f, 'utf8').match(re) || [];
      if (!hits.length) continue;
      total += hits.length;
      perFile.set(relative(ROOT, f).replace(/\\/g, '/'), hits.length);
    }
    console.log(`[density] Tailwind 1.5/2.5/3.5：${total} 处 / ${perFile.size} 文件（棘轮 ${TOTAL_BASELINE} / ${FILE_BASELINE}）`);
    assert.ok(total > 0 && perFile.size > 0, 'Tailwind 数值档统计为 0：抽取口径可能失效（非空转）');
    assert.ok(total <= TOTAL_BASELINE, `Tailwind 1.5/2.5/3.5 由 ${TOTAL_BASELINE} 升到 ${total} 处 ⇒ 不再新增离档间距`);
    assert.ok(perFile.size <= FILE_BASELINE, `含离档 Tailwind 值的文件由 ${FILE_BASELINE} 升到 ${perFile.size} 个`);
  });
  
  test('D7 页头说明→summary 8–12；标题→次级→描述 8', () => {
    const pageFrame = ruleBody(STYLES, '.page-frame');
    const gap = /gap:\s*var\(--space-(\d+)\)/.exec(pageFrame);
    assert.ok(gap, '.page-frame 应使用 --space-* 作为页头与内容间距');
    const gapPx = { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24 }[Number(gap[1])];
    assert.ok(gapPx >= 8 && gapPx <= 12, `.page-frame 页头说明→内容应为 8–12px（实际 ${gapPx}px）`);
  
    const tabHeader = ruleBody(STYLES, '[role="tabpanel"] > .page-frame__header');
    assert.ok(tabHeader, '缺少 [role="tabpanel"] > .page-frame__header 规则（tab 面板页头间距）');
    assert.match(tabHeader, /margin-bottom:\s*var\(--space-3\)/, 'tab 面板页头→内容应为 12px');
  
    const desc = ruleBody(STYLES, '.page-frame__description');
    assert.match(desc, /margin-top:\s*var\(--space-2\)/, '标题→说明应为 8px');
  
    const listMain = ruleBody(STYLES, '.list-row__main');
    assert.match(listMain, /gap:\s*var\(--space-2\)/, '行内标题→次级→描述应为 8px');
    assert.match(STYLES, /\.notice-row__meta\s*\{[^}]*margin-top:\s*8px/, '通知行标题→meta 应为 8px');
  });

})();

// ═══ 源件 5：container-width-guard.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // ════════════════════════════════════════════════════════════════
  //  server/test/container-width-guard.test.mjs — 页面容器宽度五档守卫（P4 · 2026-10-29）
  // ════════════════════════════════════════════════════════════════
  // 判据（静态扫描，纯 node）：
  //   C0 五档表与卡片栅格单一源在位（styles.css 注释表 ＋ `.card-grid`）；
  //   C1 `docs/*.html` 与 `docs/workspace/*.html` 的容器宽度类只允许五档
  //      （28rem / 48rem / 64rem / 72rem / 80rem；About 冻结件白名单，见下）；
  //   C2 任何 `max-width` 的 rem/px 定值也必须落在这五档（% / em / max-content 等非容器定值不管）；
  //   C3 反例：`max-w-2xl`（42rem）与 `1320px` 必须判红（证明比较器不是恒真）；
  //   C4 非空转下限：扫描页面数 ≥ 20；
  //   C5 本守卫须登记在 `test:daily`。
  //
  // About 白名单理由：`docs/about.html` 是 2026-10-27 支书裁定的独立冻结件，由
  //   `about-freeze-guard` 整文件哈希锁死（改一个字节即红）；宽度归一会与冻结基线冲突，
  //   故本守卫整页豁免，且**只豁免这一个文件**。
  // ════════════════════════════════════════════════════════════════
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync, readdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  const ROOT = join(import.meta.dirname, '..', '..');
  const DOCS = join(ROOT, 'docs');
  const STYLES = readFileSync(join(DOCS, 'src', 'styles.css'), 'utf8');
  const PKG = JSON.parse(readFileSync(join(ROOT, 'server', 'package.json'), 'utf8'));
  const read = (abs) => readFileSync(abs, 'utf8');
  
  /** 五档单一源（与 styles.css 注释表同口径）。 */
  const TIERS = { '28rem': '登录卡', '48rem': '标准阅读 / 表单', '64rem': '详情 / 设置', '72rem': '列表与工作台', '80rem': '表格密集页' };
  
  /** Tailwind 最大宽度工具类 → 档位（未列出的 `max-w-*` 一律判红）。 */
  const MAX_W_TOKENS = {
    'max-w-md': '28rem',
    'max-w-3xl': '48rem',
    'max-w-5xl': '64rem',
    'max-w-6xl': '72rem',
    'max-w-7xl': '80rem',
  };
  
  /** 页面骨架类（显式声明的容器修饰符）→ 档位。 */
  const SHELL_TOKENS = {
    'layout-shell--content': '72rem',
    'layout-shell--wide': '80rem',
    'page-frame--content': '72rem',
    'page-frame--wide': '80rem',
  };
  
  const ABOUT_EXEMPT = 'docs/about.html';
  
  function pageFiles() {
    return [
      ...readdirSync(DOCS).filter((n) => n.endsWith('.html')).map((n) => join(DOCS, n)),
      ...readdirSync(join(DOCS, 'workspace')).filter((n) => n.endsWith('.html')).map((n) => join(DOCS, 'workspace', n)),
    ];
  }
  
  const rel = (abs) => abs.slice(ROOT.length + 1).replace(/\\/g, '/');
  
  /** 像素 → rem（16px 根字号）；不整除即判 red。 */
  function pxTier(value) {
    const n = parseFloat(value);
    const rem = n / 16;
    return Number.isInteger(rem) ? `${rem}rem` : '';
  }
  
  /** 检查单个页面源码，返回违规列表。 */
  function violationsOf(src, file) {
    const bad = [];
    for (const m of src.matchAll(/class="([^"]*)"/g)) {
      for (const token of m[1].split(/\s+/).filter(Boolean)) {
        if (token.startsWith('max-w-')) {
          if (!MAX_W_TOKENS[token]) bad.push(`宽度类 ${token} 不在五档表（只允许 ${Object.keys(MAX_W_TOKENS).join(' / ')}）`);
        } else if (/^(layout-shell|page-frame)--/.test(token) && !SHELL_TOKENS[token]) {
          bad.push(`容器修饰类 ${token} 不在五档表`);
        }
      }
    }
    // 只核对 max-width 的 rem/px 定值；百分比 / em / max-content 等阅读宽度不算容器档。
    const styleScopes = [
      ...[...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]),
      ...[...src.matchAll(/style="([^"]*)"/g)].map((m) => m[1]),
    ];
    for (const scope of styleScopes) {
      for (const m of scope.matchAll(/max-width\s*:\s*([^;}"']+)/g)) {
        const value = m[1].trim();
        const numeric = /^([\d.]+)(rem|px)$/.exec(value);
        if (!numeric) continue;
        const tier = numeric[2] === 'px' ? pxTier(value) : `${numeric[1]}rem`;
        if (!TIERS[tier]) bad.push(`${file}：max-width ${value} 不在五档表`);
      }
    }
    return bad;
  }
  
  test('C0 五档表与卡片栅格单一源在位', () => {
    for (const tier of Object.keys(TIERS)) {
      assert.ok(STYLES.includes(tier), `styles.css 五档表缺 ${tier}`);
    }
    assert.match(STYLES, /\.card-grid\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fill,\s*minmax\(18rem,\s*1fr\)\)/,
      '卡片栅格须单一源 .card-grid = repeat(auto-fill, minmax(18rem, 1fr))');
    assert.match(STYLES, /\.card-grid\s*\{[^}]*gap:\s*var\(--space-4\)/, '卡片栅格间距须为 --space-4');
    assert.match(STYLES, /\/\*\s*═+[\s\S]*?P4 一套栅格[\s\S]*?═+\s*\*\//, 'styles.css 须保留 P4 五档表注释');
    assert.match(STYLES, /\.page-frame--wide\s*\{\s*max-width:\s*80rem/, '党委台 / 支部只读的 80rem 宽表档须在位');
  });
  
  test('C1/C2 页面容器宽度只允许五档（About 冻结件豁免）', () => {
    const files = pageFiles().filter((f) => rel(f) !== ABOUT_EXEMPT);
    const bad = [];
    for (const f of files) bad.push(...violationsOf(read(f), rel(f)));
    assert.deepEqual(bad, [], `页面容器宽度不在五档表：\n  ${bad.join('\n  ')}`);
  });
  
  test('C3 反例：max-w-2xl（42rem）与 1320px 必须判红', () => {
    const notice = read(join(DOCS, 'notice.html'));
    assert.ok(notice.includes('max-w-3xl'), '反例基线须先含 max-w-3xl（48rem 档）');
    const red42 = violationsOf(notice.replace('max-w-3xl', 'max-w-2xl'), 'fixture.html');
    assert.ok(red42.some((s) => s.includes('max-w-2xl')), '42rem（max-w-2xl）未被判红');
  
    const help = read(join(DOCS, 'help.html'));
    assert.ok(help.includes('max-width: 80rem'), '反例基线须先含 80rem 档');
    const redPx = violationsOf(help.replace('max-width: 80rem', 'max-width: 1320px'), 'fixture.html');
    assert.ok(redPx.some((s) => s.includes('1320px')), '1320px 定值未被判红');
  
    // 负例：48rem / 72rem / 80rem 合法，不得误伤
    assert.deepEqual(violationsOf('<div class="max-w-3xl"></div><div class="max-w-6xl"></div>', 'ok.html'), []);
    assert.deepEqual(violationsOf('<style>.x { max-width: 80rem; }</style>', 'ok.html'), []);
  });
  
  test('C4 非空转下限：扫描页面数 ≥ 20', () => {
    const files = pageFiles().filter((f) => rel(f) !== ABOUT_EXEMPT);
    assert.ok(files.length >= 20, `只扫描到 ${files.length} 个页面（下限 20）：扫描面被写坏`);
    assert.equal(files.filter((f) => rel(f) === ABOUT_EXEMPT).length, 0, 'About 须继续豁免（白名单不得误伤）');
  });
  
  test('C5 守卫登记在 daily / guards 层（2026-11-08 批次 537 起按需跑，不得孤儿化）', async () => {
    const { tierOf } = await import('../test-tier-registry.mjs');
    assert.ok(['daily', 'guards'].includes(tierOf('style-ratchet-guard.test.mjs')),
      'registry 未把 container-width-guard 登记在 daily / guards：守卫孤儿化');
  });

})();

// ═══ 源件 6：responsive-cards-guard.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // responsive-cards-guard.test.mjs — 宽表窄屏承载守卫（2026-10-21 · Task 7 / B-499-10）
  //
  // 口径（DESIGN_SYSTEM §4.10-9 / §4.20.2 / §4.20.7-5 / §6.2）：
  //   ① 表格 ≤640px 可切卡式行（`data-responsive="cards"`）：thead 隐藏、一行一卡、每格 `data-label`；
  //   ② 矩阵 ≤640px 堆叠＝**同一关系行的响应式形态**（同一张表 + data-label），不是第二套卡片矩阵；
  //   ③ 卡式行内 sticky / min-width 必须清零，页面主体不得横向溢出；
  //   ④ 打印时 `@media print` 恢复表格形态；
  //   ⑤ 信息完整性：每个数据 td 都有 data-label，且覆盖表头全部列名。
  //
  // 本守卫只做**静态**断言；「390×844 无横向溢出」由 `page-sweep.test.mjs` 真机审次承担。
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync, readdirSync } = await import('node:fs');
  const { join } = await import('node:path');
  const ROOT = join(import.meta.dirname, '..', '..');
  const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
  
  /** 递归列出 docs/src 下全部 .js（R5-C03：守卫改为扫描所有表格配置，不再点名文件）。 */
  function walkJs(dir) {
    const out = [];
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) out.push(...walkJs(p));
      else if (e.name.endsWith('.js')) out.push(p);
    }
    return out;
  }
  
  /** 配置块的列数：静态 <th> 数、colSpan 常量、或动态 colSpan（`4 + types.length` 视为 ≥5）。 */
  function colsOf(block) {
    const th = (block.match(/<th\b/g) || []).length;
    const col = Number(/colSpan:\s*(\d+)/.exec(block)?.[1] || 0);
    const dynamic = /colSpan:\s*[^,\n]*\+/.test(block) ? 5 : 0;
    return Math.max(th, col, dynamic);
  }
  
  /** 取 `table: { … }` 配置块（花括号配平）。 */
  function tableConfigBlocks(src) {
    const blocks = [];
    let i = 0;
    while ((i = src.indexOf('table: {', i)) >= 0) {
      let depth = 0;
      let j = i + 7;
      for (; j < src.length; j += 1) {
        if (src[j] === '{') depth += 1;
        else if (src[j] === '}') {
          depth -= 1;
          if (depth === 0) { j += 1; break; }
        }
      }
      blocks.push({ start: i, text: src.slice(i, j) });
      i = j;
    }
    return blocks;
  }
  
  const STYLES = read('docs/src/styles.css');
  const MATRIX = read('docs/src/components/ui/relation-matrix.js');
  const ATT = read('docs/src/entries/tabs/disc/attendance-tab.js');
  const FLOW = read('docs/src/entries/tabs/org/member-flow-tab.js');
  const GROUP = read('docs/src/entries/tabs/secretary/group-progress-tab.js');
  const OVERVIEW = read('docs/src/components/governance/work-overview.js');
  const COMMITTEE = read('docs/src/entries/tabs/secretary/committee-meeting-tab.js');
  const ENGINE = read('docs/src/components/ui/list-filter.js');
  const CAL_CARD = read('docs/src/entries/tabs/shared/activity-calendar-tab.js');
  
  /** 去掉括号补充说明与空白，用于「表头 ↔ data-label」覆盖比较（如「人数（含党员）」≡「人数」）。 */
  const norm = (s) => String(s).replace(/（[^）]*）/g, '').replace(/\s+/g, '').trim();
  
  /** 取函数体片段（从 `start` 到 `end`），用于按行模板核对 td/data-label。 */
  function slice(src, start, end) {
    const a = src.indexOf(start);
    assert.ok(a >= 0, `未找到片段起点：${start}`);
    const b = src.indexOf(end, a);
    assert.ok(b > a, `未找到片段终点：${end}`);
    return src.slice(a, b);
  }
  
  /** 数据 td 行（排除空态 colspan 行）里缺 data-label 的行。 */
  function missingLabels(chunk) {
    return chunk.split('\n')
      .filter((line) => /<td\b/.test(line) && !/colspan=/.test(line) && !/data-label=/.test(line))
      .map((line) => line.trim().slice(0, 80));
  }
  
  /** 某段行模板里的 data-label 集合。 */
  function labelsOf(chunk) {
    return [...chunk.matchAll(/data-label="([^"]+)"/g)].map((m) => m[1]);
  }
  
  test('C1 styles.css 卡式行单一源：thead 隐藏 / data-label / sticky 与 min-width 清零', () => {
    assert.match(STYLES, /@media \(max-width: 640px\) \{[\s\S]*?\.data-table\[data-responsive="cards"\] thead \{ display: none; \}/,
      '≤640px 须隐藏卡式表的 thead');
    assert.match(STYLES, /\.data-table\[data-responsive="cards"\] th,\s*\.data-table\[data-responsive="cards"\] td \{[\s\S]*?position: static;[\s\S]*?min-width: 0;/,
      '卡式行内 th/td 须清零 sticky 与 min-width');
    assert.match(STYLES, /\.data-table\[data-responsive="cards"\] td::before \{[\s\S]*?content: attr\(data-label\)/,
      '卡式行字段名须由 td[data-label] 提供');
    assert.match(STYLES, /\.data-table\[data-responsive="cards"\] tbody th \{[\s\S]*?position: static|\.data-table\[data-responsive="cards"\] th,\s*\.data-table\[data-responsive="cards"\] td \{[\s\S]*?position: static/,
      '矩阵行表头（tbody th）在卡式行内不得吸附');
    assert.match(STYLES, /\.rm-root \.rm-scroll \{[\s\S]*?max-height: none;[\s\S]*?overflow-x: visible;/,
      '矩阵卡式形态须解除容器限高与横滚');
  });
  
  test('C2 打印恢复表格形态：@media print 覆盖卡式行', () => {
    assert.match(STYLES, /@media print \{[\s\S]*?\.data-table\[data-responsive="cards"\] \{[\s\S]*?display: table !important/,
      '打印时卡式表须恢复 display:table');
    assert.match(STYLES, /@media print \{[\s\S]*?\.data-table\[data-responsive="cards"\] thead \{ display: table-header-group !important; \}/,
      '打印时表头须恢复');
    assert.match(STYLES, /@media print \{[\s\S]*?\.data-table\[data-responsive="cards"\] td::before \{ content: none !important; \}/,
      '打印时不得输出卡式字段名');
  });
  
  test('C3 手写卡式表：每个数据 td 都有 data-label（考勤汇总 / 党小组 / 条线）', () => {
    const attChunk = slice(ATT, 'function _renderTable', '// 翻页控件');
    assert.match(attChunk, /<table class="data-table" data-responsive="cards">/, '纪检考勤汇总须声明 data-responsive="cards"');
    assert.deepEqual(missingLabels(attChunk), [], '考勤汇总存在未带 data-label 的数据 td');
    const attLabels = labelsOf(attChunk);
    for (const label of ['姓名', '学号', '发展阶段', '所属党小组', '活动', '类别', '状态', '备注（标因/补录）', '确认人', '操作']) {
      assert.ok(attLabels.includes(label), `考勤汇总 td 缺 data-label="${label}"`);
    }
    const attHeads = [...attChunk.matchAll(/<th[^>]*>([^<]+)<\/th>/g)].map((m) => norm(m[1]));
    const attNorm = new Set(attLabels.map(norm));
    const attMissingCols = attHeads.filter((h) => h && !attNorm.has(h));
    assert.deepEqual(attMissingCols, [], `考勤汇总 data-label 未覆盖表头列：${attMissingCols.join(' / ')}`);
  
    // 2026-11-01 Task 4：党小组页改主从双栏，原「党小组清单」表撤；卡式行落在「活动台账」表。
    // 2026-11-10 批次 540：活动台账改由 `renderDataTable` 渲染 ⇒ 卡式行由 `responsive: true` 传给组件
    //   （`<table data-responsive="cards">` 由引擎产出），td 的 `data-label` 仍由本页行模板提供。
    assert.match(GROUP, /responsive:\s*true/, '活动台账须声明卡式行（responsive: true 交给 data-table）');
    const groupChunk = slice(GROUP, 'function _ledgerRowHtml', 'function _reviewDetailRowHtml');
    assert.deepEqual(missingLabels(groupChunk), [], '活动台账存在未带 data-label 的数据 td');
    const groupLabels = labelsOf(groupChunk);
    for (const label of ['日期', '活动', '复盘状态', '应到·实到']) {
      assert.ok(groupLabels.includes(label), `活动台账 td 缺 data-label="${label}"`);
    }
  
    const woChunk = slice(OVERVIEW, 'const tableRows = lineRows.map', 'const shownActions');
    assert.deepEqual(missingLabels(woChunk), [], '工作分工表存在未带 data-label 的数据 td');
    const woLabels = labelsOf(woChunk);
    for (const label of ['工作分工', '负责人', '在办', '逾期', '待处理']) {
      assert.ok(woLabels.includes(label), `工作分工表 td 缺 data-label="${label}"`);
    }
  });
  
  test('C4 全站引擎表扫描：列数 ≥5 的表格配置必须 opt-in 卡式行，且每个数据 td 有 data-label', () => {
    const offenders = [];
    for (const file of walkJs(join(ROOT, 'docs/src'))) {
      const src = readFileSync(file, 'utf8');
      const blocks = tableConfigBlocks(src);
      if (!blocks.length) continue;
      const hasWide = blocks.some((b) => colsOf(b.text) >= 5);
      blocks.forEach((b) => {
        const cols = colsOf(b.text);
        if (cols >= 5 && !/responsive:\s*true/.test(b.text)) {
          offenders.push(`${file.replace(ROOT + '\\', '')} 第 ${src.slice(0, b.start).split('\n').length} 行：${cols} 列未开 responsive`);
        }
      });
      if (hasWide) {
        // 同一文件内的行模板：任何非 colspan 的数据 td 都必须带 data-label（卡式行字段名单一源）。
        src.split('\n').forEach((line, idx) => {
          if (/<td\b/.test(line) && !/colspan=/.test(line) && !/data-label=/.test(line) && !/\$\{.*<td/.test(line)) {
            offenders.push(`${file.replace(ROOT + '\\', '')}:${idx + 1} 数据 td 缺 data-label`);
          }
        });
      }
    }
    assert.equal(offenders.length, 0,
      `以下宽表未满足「≥5 列必须卡式行 + 每格 data-label」：\n  ${offenders.join('\n  ')}`);
    // 非空转：确认扫描确实命中宽表配置（防正则失配导致恒真）。
    const wide = walkJs(join(ROOT, 'docs/src')).flatMap((f) => tableConfigBlocks(readFileSync(f, 'utf8')))
      .filter((b) => colsOf(b.text) >= 5);
    assert.ok(wide.length >= 9, `扫描到的 ≥5 列引擎表配置只有 ${wide.length} 个（基线 9）`);
  });
  
  test('C4b 引擎卡式表：成员流动 8 列 / 支委构成 4 列 / 支委会会议 5 列全覆盖', () => {
    assert.match(FLOW, /responsive: true/, '成员流动台账须 opt-in 卡式行');
    const flowChunk = slice(FLOW, 'function _flowRowHtml', '/** 未登记人员清单');
    assert.deepEqual(missingLabels(flowChunk), [], '成员流动台账存在未带 data-label 的数据 td');
    const flowLabels = labelsOf(flowChunk);
    for (const label of ['类型', '姓名', '学号', '届别', '日期', '经手人', '备注', '操作']) {
      assert.ok(flowLabels.includes(label), `成员流动台账 td 缺 data-label="${label}"`);
    }
    // 2026-10-23 批次 505（R7-08）：成员流动表头改为 `heads` 数组（空列按 hasValue 动态隐藏），
    //   `headHtml` 只剩 `${heads}`；表头列名改从 heads 数组的 <th> 字面量收集，判据（列数一致 + 覆盖）不变。
    const flowHeads = /headHtml: '<tr>(.*?)<\/tr>'/.exec(FLOW)?.[1] || '';
    // 2026-11-17 批次 562：表头统一带 `scope="col"`（a11y）⇒ 解析须容忍属性，不再只认裸 `<th>`。
    let flowHeadCols = [...flowHeads.matchAll(/<th\b[^>]*>([^<]+)<\/th>/g)].map((m) => norm(m[1]));
    if (flowHeadCols.length === 0) {
      const headsBlock = /const heads = \[([\s\S]*?)\]\.filter\(Boolean\)/.exec(FLOW)?.[1] || '';
      flowHeadCols = [...headsBlock.matchAll(/<th\b[^>]*>([^<]+)<\/th>/g)].map((m) => norm(m[1]));
    }
    assert.equal(flowLabels.length, flowHeadCols.length, `成员流动台账 td 数 ${flowLabels.length} 与表头列数 ${flowHeadCols.length} 不一致`);
    assert.deepEqual(flowHeadCols.filter((h) => !new Set(flowLabels.map(norm)).has(h)), [], '成员流动台账 data-label 未覆盖全部列名');
  
    // 2026-11-11 批次 546（D-869）：支委会页新增「支部提案池」5 列表，同批 opt-in 卡式行 ⇒ 2 → 3。
    assert.equal((COMMITTEE.match(/responsive: true/g) || []).length, 3, '支委构成 / 支委会会议 / 支部提案三表都须 opt-in 卡式行');
    const rosterChunk = slice(COMMITTEE, 'function rosterRowHtml', '/** 最近 8 场支委会');
    const meetingChunk = slice(COMMITTEE, 'function meetingRowHtml', '/** 行内选人实例');
    for (const [name, chunk, labels] of [
      // 2026-11-10 批次 541：支委构成表「来源」列并入身份注（「支书 · 党委配置」），列数 5→4；
      //   本守卫是表形状的镜像，同批改准（卡片模式的 data-label 仍逐格覆盖）。
      ['支委构成', rosterChunk, ['姓名', '身份', '状态', '操作']],
      ['支委会会议', meetingChunk, ['日期', '议题', '状态', '应到', '操作']],
      ['支部提案', slice(COMMITTEE, 'function proposalRowHtml', 'async function _proposalAction'), ['事项', '来源', '提案人', '状态', '操作']],
    ]) {
      assert.deepEqual(missingLabels(chunk), [], `${name}存在未带 data-label 的数据 td`);
      const got = labelsOf(chunk);
      assert.equal(got.length, labels.length, `${name} td 数 ${got.length} 与表头列数 ${labels.length} 不一致`);
      for (const label of labels) assert.ok(got.includes(label), `${name} td 缺 data-label="${label}"`);
    }
  });
  
  test('C6 手写 data-table：静态表头 ≥5 列必须 data-responsive="cards" 且每格 data-label', () => {
    const offenders = [];
    for (const file of walkJs(join(ROOT, 'docs/src'))) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/<table class="data-table([^"]*)"([^>]*)>([\s\S]{0,1200}?)<thead>([\s\S]*?)<\/thead>/g)) {
        const cols = (m[4].match(/<th\b/g) || []).length;
        if (cols < 5) continue;
        const rel = file.replace(ROOT + '\\', '');
        if (!/data-responsive="cards"/.test(m[2])) offenders.push(`${rel}：${cols} 列手写表未声明 data-responsive="cards"`);
        const body = m[3] + src.slice(m.index, src.indexOf('</table>', m.index));
        if (/<td\b/.test(body)) {
          body.split('\n').forEach((line, idx) => {
            if (/<td\b/.test(line) && !/colspan=/.test(line) && !/data-label=/.test(line)) {
              offenders.push(`${rel}：手写宽表数据 td 缺 data-label（${line.trim().slice(0, 60)}）`);
            }
          });
        }
      }
    }
    assert.equal(offenders.length, 0, `手写宽表卡式行不合规：\n  ${offenders.join('\n  ')}`);
  });
  
  test('C5 矩阵卡式结构：同一张表 + data-label + rm-scroll，保留 — / sticky / 列上限', () => {
    assert.match(MATRIX, /<table class="data-table rm-table" data-responsive="cards">/,
      '矩阵须与引擎表共用同一套卡式规则（同一张表，不新造第二套矩阵）');
    assert.match(MATRIX, /class="rm-scroll[^"]*"/, '矩阵滚动容器须挂 .rm-scroll（窄屏解除限高/横滚）');
    assert.match(MATRIX, /data-label="\$\{esc\(label\)\}" title="\$\{esc\(label\)\}"[^>]*>/,
      '矩阵每个 td 须带 data-label（当前可见列名）');
    assert.match(MATRIX, /cellOf\(p\.id, it\.id, it\.title\)/, 'byPerson：卡内逐项目名（data-label＝项目名）');
    assert.match(MATRIX, /cellOf\(p\.id, it\.id, p\.name\)/, 'byItem：卡内逐人姓名（data-label＝姓名）');
    assert.ok(/—<\/td>/.test(MATRIX), '空单元格仍须显示「—」');
    assert.match(MATRIX, /sticky left-0/, '桌面宽表仍保留首列吸附');
    assert.match(MATRIX, /export const MATRIX_COL_LIMIT = 6/, '项目维列上限 6 不得改动');
    assert.match(MATRIX, /export const MATRIX_ROW_LIMIT = 10/, '人维分页不得改动');
    // 引擎表格模式仍输出同一属性（单一源）
    assert.match(ENGINE, /data-responsive="cards"/, '统一检索引擎仍须输出 data-responsive="cards"');
  });
  
  test('C7 日历折叠卡（2026-10-27 Task 6.3）：40×40 摘要槽只留 chevron + aria-label，不塞整句', () => {
    const m = /<summary class="disclosure__summary"([^>]*)>([^<]*)<\/summary>/.exec(CAL_CARD);
    assert.ok(m, '未找到共享日历折叠卡的 <summary class="disclosure__summary">');
    assert.match(m[1], /aria-label="[^"]+"/, '折叠钮须有可访问名（aria-label）');
    assert.equal(m[2].trim(), '', '40px 摘要槽内不得再放整句文字（会竖排折行压卡）');
    // 四台（org / prop / disc / leader）的工作概况都复用同一实现。
    for (const page of ['org', 'prop', 'disc', 'leader']) {
      assert.match(read(`docs/src/entries/tabs/${page}/overview-tab.js`), /renderCalendarCard/,
        `${page} 台工作概况须复用共享日历折叠卡（单一源）`);
    }
  });

})();

// ═══ 源件 7：card-summary-hero-guard.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // card-summary-hero-guard.test.mjs — 卡片末行 / 折叠头 / hero 特例三组守卫
  // （2026-10-31 支书补充批次 P13–P15）
  //
  // 判据：
  //   G1 卡片末行不得出现「只有右对齐操作」的独立行——右下角孤零零一个「查看更多」不算一个末行；
  //      末行若有动作，必须与左侧信息同一行（flex justify-between / 左侧有内容）。
  //   G2 折叠头 summary：空内容 summary 必须宽度 100%、高度 ≥44；标题行 ≥44；可见文字不得塞进 summary。
  //   G3 hero 特例白名单：DS_05 §10.5.1 登记「居中整幅」；index 保持 text-center、48px 党徽；
  //      CSS / main-entry 不得再写 muted 左对齐降级。
  //   G4 嵌入形态不得再套卡（批次 524 · C/#3 #8）：`workgroup-view` / `taskforce-view` 必须接受
  //      `opts.embedded`，嵌入模板里不得出现 `class="card`；`insight-view` 必须给两者传 `embedded: true`。
  //   四组各带反例（合成样本命中 / 不误伤）。
  //
  // 运行：node --test server/test/card-summary-hero-guard.test.mjs
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync, readdirSync, existsSync } = await import('node:fs');
  const { join, relative, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const SRC = join(ROOT, 'docs', 'src');
  const INDEX = join(ROOT, 'docs', 'index.html');
  const CSS = join(SRC, 'styles.css');
  const MAIN = join(SRC, 'entries', 'pages', 'main-entry.js');
  const DS5 = join(ROOT, 'content', '04_web_design', 'design-system', 'DS_05_MAP_AND_REFERENCE.md');
  
  function walk(dir, out = []) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) { walk(p, out); continue; }
      if (/\.(js|html)$/.test(e.name)) out.push(p);
    }
    return out;
  }
  
  /** 「只有右对齐操作」的独立行：`text-right` 末行容器，**唯一**动作就是 a/button，
   *  且没有其它元素（左侧计数 / 说明 / 第二枚按钮）。动作组工具栏因此不误伤。
   *  卡片末行有动作时必须与左侧信息同一行（如 flex justify-between）。 */
  function hasRightOnlyActionRow(src) {
    const re = /<div\b[^>]*class="[^"]*\btext-right\b[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    let m;
    while ((m = re.exec(src))) {
      const inner = m[1].replace(/<!--[\s\S]*?-->/g, '').trim();
      const actions = (inner.match(/<(?:a|button)\b/gi) || []).length;
      const otherEl = /<(?!\/?(?:a|button)\b)[a-z][\w-]*\b/i.test(inner);
      if (actions === 1 && !otherEl) return true;
    }
    return false;
  }
  
  /** 空 summary 的 CSS 块是否「宽 100% 且高 ≥44」。 */
  function summaryCoversRow(css) {
    const block = /\.disclosure__summary:empty\s*\{([^}]*)\}/.exec(css);
    if (!block) return false;
    const body = block[1];
    const width = /width:\s*100%/.test(body);
    const height = /height:\s*(\d+)px/.exec(body);
    return width && !!height && Number(height[1]) >= 44;
  }
  
  /** CSS 是否回潮了 hero 左对齐降级（muted 块 text-align:start 或党徽 24px）。 */
  function hasHeroLeftAlignDowngrade(css) {
    return /#dashboard-hero\[data-hero="muted"\]\s*\{[^}]*text-align:\s*start/.test(css)
      || /#dashboard-hero\[data-hero="muted"\]\s+\.dashboard-hero__emblem\s*\{[^}]*width:\s*24px/.test(css);
  }
  
  /** 取出 `const embeddedHtml = \`…\`;` 的模板正文（嵌入形态唯一落点）。 */
  function embeddedTemplateOf(src) {
    const m = /const embeddedHtml = `([\s\S]*?)`;/.exec(src);
    return m ? m[1] : null;
  }
  
  /** 嵌入形态口径：接受 opts.embedded ＋ 嵌入模板不套 `.card`。 */
  function embeddedShapeProblems(src) {
    const problems = [];
    if (!/opts\.embedded === true\s*\?\s*embeddedHtml/.test(src)) {
      problems.push('未按 `opts.embedded === true ? embeddedHtml : …` 分叉（嵌入形态没有独立模板）');
    }
    const tpl = embeddedTemplateOf(src);
    if (tpl === null) problems.push('缺 `const embeddedHtml = \\`…\\`;` 模板常量');
    else if (/class="card\b/.test(tpl)) problems.push('嵌入模板仍出现 `class="card`（卡套卡）');
    return problems;
  }
  
  test('G1 卡片末行：不得只有右对齐操作（带左侧信息的同行合法）', () => {
    const files = [INDEX, ...walk(SRC)];
    const offenders = [];
    for (const file of files) {
      if (!existsSync(file)) continue;
      const src = readFileSync(file, 'utf8');
      if (hasRightOnlyActionRow(src)) offenders.push(relative(ROOT, file).replace(/\\/g, '/'));
    }
    assert.deepEqual(offenders, [],
      `卡片末行出现「只有右对齐操作」的独立行（未读数/说明须与动作同一行）：\n${offenders.join('\n')}`);
  
    // 反例：孤零零一个右对齐链接判红；左侧有未读数、右侧动作判绿。
    assert.equal(hasRightOnlyActionRow('<div class="pt-2 text-right"><a class="text-xs text-accent">查看更多 →</a></div>'), true);
    assert.equal(hasRightOnlyActionRow('<div class="mt-2 flex items-center justify-between gap-2"><span>2 条未读</span><a>查看更多 →</a></div>'), false);
    assert.equal(hasRightOnlyActionRow('<div class="text-right"><span>合计</span><a>查看</a></div>'), false);
  });
  
  test('G2 折叠头 summary：空内容 summary 宽 100% / 高 ≥44，标题行 ≥44', () => {
    const css = readFileSync(CSS, 'utf8');
    assert.ok(summaryCoversRow(css), 'styles.css 的 .disclosure__summary:empty 必须 width:100% 且 height ≥44');
    const titleBlock = /\.disclosure__title\s*\{([^}]*)\}/.exec(css);
    assert.ok(titleBlock, 'styles.css 缺 .disclosure__title');
    const minH = /min-height:\s*(\d+)px/.exec(titleBlock[1]);
    assert.ok(minH && Number(minH[1]) >= 44, '折叠标题行 min-height 须 ≥44');
  
    // summary 内不得再塞可见文字（文字应回标题的 .disclosure__meta）。
    const withText = [];
    for (const file of walk(SRC)) {
      const src = readFileSync(file, 'utf8');
      if (/class="disclosure__summary"[^>]*>[^<\s]/.test(src)) {
        withText.push(relative(ROOT, file).replace(/\\/g, '/'));
      }
    }
    assert.deepEqual(withText, [], `summary 内不得有可见文字（迁回标题）：\n${withText.join('\n')}`);
  
    // 反例：40×40 小块判不中；44 宽 100% 判中；可见文字样本能被识别。
    assert.equal(summaryCoversRow('.disclosure__summary:empty { width: 40px; height: 40px; }'), false);
    assert.equal(summaryCoversRow('.disclosure__summary:empty { width: 100%; height: 44px; }'), true);
    assert.match('<summary class="disclosure__summary">展开</summary>', /class="disclosure__summary"[^>]*>[^<\s]/);
    assert.doesNotMatch('<summary class="disclosure__summary"></summary>', /class="disclosure__summary"[^>]*>[^<\s]/);
  });
  
  test('G3 hero 特例白名单：DS_05 登记居中；CSS/入口不得回退左对齐降级', () => {
    const ds5 = readFileSync(DS5, 'utf8');
    const index = readFileSync(INDEX, 'utf8');
    const css = readFileSync(CSS, 'utf8');
    const main = readFileSync(MAIN, 'utf8');
  
    assert.match(ds5, /### 10\.5\.1 首页 hero 特例/, 'DS_05 缺 §10.5.1 hero 特例白名单');
    assert.match(ds5, /恒为居中整幅/, '白名单须写明「恒为居中整幅」');
    assert.match(ds5, /不得出现 24px 降级/, '白名单须写明不得 24px 降级');
    assert.match(index, /<div\b[^>]*class="[^"]*\btext-center\b[^"]*"[^>]*\bid="dashboard-hero"/,
      '#dashboard-hero 必须是居中（text-center）');
    assert.match(css, /\.dashboard-hero__emblem\s*\{[^}]*width:\s*48px[^}]*height:\s*48px/,
      '党徽必须 48×48');
    assert.equal(hasHeroLeftAlignDowngrade(css), false, 'CSS 不得回潮 muted 左对齐 / 24px 降级');
    assert.doesNotMatch(main, /data-hero\s*=\s*['"]muted['"]/, 'main-entry.js 不得再写 data-hero=muted');
  
    // 反例：左对齐块 / 24px 版必须被同一口径判红；普通居中块判绿。
    assert.equal(hasHeroLeftAlignDowngrade('#dashboard-hero[data-hero="muted"] { text-align: start; }'), true);
    assert.equal(hasHeroLeftAlignDowngrade('#dashboard-hero[data-hero="muted"] .dashboard-hero__emblem { width: 24px; height: 24px; }'), true);
    assert.equal(hasHeroLeftAlignDowngrade('#dashboard-hero { text-align: center; }'), false);
  });
  
  // G4：嵌入形态不得再套卡（批次 524 · C/#3 #8）
  //   病灶：`insight-view` 已用 embedded 跳过页头，但 `workgroup-view` / `taskforce-view`
  //   仍在内部渲染 `div.card` + 第二套卡头 ⇒ 「卡套卡」+ 双卡头。
  test('G4 嵌入形态不得再套卡：embedded 模板无 .card，insight-view 给两者传 embedded:true', () => {
    const WG = readFileSync(join(SRC, 'components', 'record', 'workgroup-view.js'), 'utf8');
    const TF = readFileSync(join(SRC, 'components', 'record', 'taskforce-view.js'), 'utf8');
    const INSIGHT = readFileSync(join(SRC, 'components', 'record', 'insight-view.js'), 'utf8');
  
    for (const [name, src] of [['workgroup-view.js', WG], ['taskforce-view.js', TF]]) {
      assert.deepEqual(embeddedShapeProblems(src), [],
        `${name} 的嵌入形态口径被改坏：\n  ${embeddedShapeProblems(src).join('\n  ')}`);
    }
  
    // insight-view 必须把两个子组件都切到嵌入形态
    assert.match(INSIGHT, /renderWorkgroupView\(body,\s*\{[\s\S]{0,240}?embedded:\s*true/,
      'insight-view 调 renderWorkgroupView 未传 embedded: true（会再套一层卡）');
    assert.match(INSIGHT, /renderTaskforceView\(body,\s*\{[\s\S]{0,240}?embedded:\s*true/,
      'insight-view 调 renderTaskforceView 未传 embedded: true（会再套一层卡）');
  
    // 反例：嵌入模板塞回 .card 必须判红；不接 embedded 也必须判红；独立形态的卡不受影响。
    const withCard = WG.replace('const embeddedHtml = `', 'const embeddedHtml = `<div class="card">');
    assert.ok(embeddedShapeProblems(withCard).some((p) => p.includes('class="card')),
      '反例：嵌入模板出现 class="card 未被判红');
    const noBranch = TF.replace(/opts\.embedded === true \? embeddedHtml :/, '');
    assert.ok(embeddedShapeProblems(noBranch).length > 0, '反例：去掉 embedded 分叉未被判红');
    const standaloneOnly = 'const x = `\n    <div class="card rounded-xl p-5"></div>`;';
    assert.equal(/class="card\b/.test(embeddedTemplateOf(standaloneOnly) || ''), false,
      '负例：不含 embeddedHtml 的源码不应被判出嵌入模板');
  });

})();

// ═══ 源件 8：row-markup-guard.test.mjs ═══
await (async () => {
  // server/test/row-markup-guard.test.mjs — 手写行容器存量守卫（2026-10-18 立 · Task 2 / Task 9）
  //
  // 来源：Spec「工作台密度与组件重组」Task 2 / Task 9；判例＝「`div` 行堆叠读不下去」。
  //   病灶：页面各自手写 `div` + `border-b` + `py-2.5` 的行容器，厚度、分隔线与行尾动作各写一套。
  //   裁定：新增重复行必须用 components/ui/list-row.js；手写行容器存量 **只降不升**。
  //
  // 判据：
  //   R1 docs/src 下三种典型手写行容器特征的出现次数 <= 基线（2026-10-18 实测 12）；
  //   R2 list-row.js 存在且导出 listRowHtml / listGroupHtml；
  //   R3 七个复用模块文件均存在（pager / relation-matrix 为本批前既有，不得重写但须在位）；
  //   R4 DESIGN_SYSTEM §4.20.7/§4.20.8 的三类行型与七个模块名齐备（Task 9.3 文档面）。
  //
  // 基线纪律：**只降不升**；新增行用 list-row。迁移后请同批下调 HANDWRITTEN_ROW_BASELINE。
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync, readdirSync, statSync, existsSync } = await import('node:fs');
  const { join, relative, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const SRC = join(ROOT, 'docs', 'src');
  const UI = join(SRC, 'components', 'ui');
  const DESIGN = join(ROOT, 'content', '04_web_design', 'design-system', 'DS_03_COMPONENTS.md');
  
  /** 典型手写行容器特征（逐字子串；本批实测合计 12） */
  const HANDWRITTEN_ROW_PATTERNS = [
    'border-b border-gray-100 last:border-b-0',
    'py-2.5 border-b border-gray-100',
    'flex items-center gap-3 py-2.5 px-3',
  ];
  
  /** 基线（2026-10-18 本批实测 12；只降不升） */
  const HANDWRITTEN_ROW_BASELINE = 12;
  
  /** 七个复用模块（Task 2；person-picker 属 governance 目录，不重写但须在位） */
  const MODULES = ['list-row.js', 'filter-bar.js', 'data-table.js', 'pager.js', 'empty-state.js', 'relation-matrix.js']
    .map((n) => join(UI, n))
    .concat(join(SRC, 'components', 'governance', 'person-picker.js'));
  
  function walk(dir, out = []) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p, out);
      else if (/\.(js|html)$/.test(e.name)) out.push(p);
    }
    return out;
  }
  
  test('R1 手写行容器存量只降不升（基线 12）', () => {
    const files = walk(SRC);
    let total = 0;
    const perFile = new Map();
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      let n = 0;
      for (const pat of HANDWRITTEN_ROW_PATTERNS) n += src.split(pat).length - 1;
      if (!n) continue;
      total += n;
      perFile.set(relative(ROOT, f).replace(/\\/g, '/'), n);
    }
    const ledger = [...perFile.entries()].sort((a, b) => b[1] - a[1])
      .map(([f, n]) => `  ${String(n).padStart(3)}  ${f}`).join('\n');
    console.log(`[row-markup-guard] 手写行容器 ${total} 处（棘轮上限 ${HANDWRITTEN_ROW_BASELINE}）：\n${ledger}`);
    assert.ok(total <= HANDWRITTEN_ROW_BASELINE,
      `手写行容器由 ${HANDWRITTEN_ROW_BASELINE} 升到 ${total} 处 ⇒ 新增行请用 components/ui/list-row.js；迁移一屏请同批下调基线。`);
  });
  
  test('R2 list-row.js 存在并导出 listRowHtml / listGroupHtml', () => {
    const file = join(UI, 'list-row.js');
    assert.ok(existsSync(file), 'components/ui/list-row.js 不存在——新增重复行没有单一源');
    const src = readFileSync(file, 'utf8');
    assert.match(src, /export function listRowHtml\s*\(/, 'list-row.js 未导出 listRowHtml');
    assert.match(src, /export function listGroupHtml\s*\(/, 'list-row.js 未导出 listGroupHtml');
  });
  
  test('R3 七个复用模块文件均存在', () => {
    for (const f of MODULES) {
      assert.ok(existsSync(f), `复用模块缺失：${relative(ROOT, f).replace(/\\/g, '/')}`);
    }
  });
  
  test('R4 DESIGN_SYSTEM §4.20.7/§4.20.8：三类行型与七个模块名齐备', () => {
    const doc = readFileSync(DESIGN, 'utf8');
    assert.match(doc, /#### 4\.20\.7 表格内部三类行型/, 'DESIGN_SYSTEM 缺 §4.20.7「表格内部三类行型」');
    assert.match(doc, /#### 4\.20\.8 复用模块采用矩阵/, 'DESIGN_SYSTEM 缺 §4.20.8「复用模块采用矩阵」');
    for (const term of ['对象行', '关系行', '留痕行']) {
      assert.ok(doc.includes(term), `§4.20.7 缺行型「${term}」`);
    }
    for (const mod of ['list-row', 'filter-bar', 'data-table', 'pager', 'empty-state', 'person-picker', 'relation-matrix']) {
      assert.ok(doc.includes(mod), `§4.20.8 采用矩阵缺模块「${mod}」`);
    }
    assert.ok(doc.includes('选人面板'), '§4.20.8 须把 person-picker 的代表页面写为「选人面板」');
  });

})();

// ═══ 源件 9：action-row-wrap-guard.test.mjs ═══
await (async () => {
  // server/test/action-row-wrap-guard.test.mjs — 行动行排布守卫（2026-11-07 批次 535 · SD-60）
  // 病灶：卡头标题不收缩 + aside 整组 margin-left:auto + 三处 flex-wrap:wrap
  //   ⇒ 宽度足够时按钮组仍被机械挤到第二行。
  // 判据（只守 `.card-head` 家族，不扫全站；`.lf-bar` 仍守 SD-58 的「两行上限」）：
  //   W1 `.card-head` 基准 flex-wrap:nowrap，且 ≤640 断点有 wrap 覆盖
  //   W2 `.card-head__title` 承担伸缩（flex:1 1 auto + min-width:0）
  //   W3 `.card-head__aside` 不拆组（flex:0 0 auto + flex-wrap:nowrap）
  //   W4 按钮族已有 white-space:nowrap（不重复添加，只防被删）
  //   W5 `.lf-bar` 仍为 flex-wrap:wrap（不得以「防换行」改坏筛选条）
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const ROOT = join(import.meta.dirname, '..', '..');
  const CSS = readFileSync(join(ROOT, 'docs', 'src', 'styles.css'), 'utf8');
  
  /** 取某个选择器的首个规则体（按 `{` 前的选择器精确匹配） */
  function ruleBody(selector) {
    const re = new RegExp(`(?:^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`);
    const m = CSS.match(re);
    return m ? m[1] : '';
  }
  
  test('W1 `.card-head` 基准 nowrap，≤640 断点有 wrap 覆盖', () => {
    const base = ruleBody('.card-head');
    assert.match(base, /flex-wrap:\s*nowrap/, '.card-head 基准须 flex-wrap:nowrap（≥641 不换行）');
    const media = CSS.slice(CSS.indexOf('@media (max-width: 640px)'));
    assert.match(media, /\.card-head\s*\{[^}]*flex-wrap:\s*wrap/, '≤640 须有 .card-head 换行覆盖');
  });
  
  test('W2 `.card-head__title` 承担伸缩（flex:1 1 auto + min-width:0）', () => {
    const body = ruleBody('.card-head__title');
    assert.match(body, /min-width:\s*0/, '.card-head__title 缺 min-width:0（标题不收缩会挤走按钮组）');
    assert.match(body, /flex:\s*1\s+1\s+auto/, '.card-head__title 缺 flex:1 1 auto（标题必须让位）');
  });
  
  test('W3 `.card-head__aside` 不拆组（flex:0 0 auto + nowrap）', () => {
    const body = ruleBody('.card-head__aside');
    assert.match(body, /flex-wrap:\s*nowrap/, '.card-head__aside 须 nowrap（meta 与 actions 不拆组）');
    assert.match(body, /flex:\s*0\s+0\s+auto/, '.card-head__aside 须 flex:0 0 auto（整组不让位）');
  });
  
  test('W4 按钮族保留 white-space:nowrap', () => {
    const groups = [...CSS.matchAll(/\.btn-tab\s*\{([^}]*)\}/g)].map((m) => m[1]);
    assert.ok(groups.length > 0, '找不到 .btn-tab 规则');
    assert.ok(groups.some((body) => /white-space:\s*nowrap/.test(body)),
      '按钮族缺 white-space:nowrap（按钮文字会内部断行）');
  });
  
  test('W5 `.lf-bar` 仍可折行（SD-58 不被本守卫改坏）', () => {
    const body = ruleBody('.lf-bar');
    assert.match(body, /flex-wrap:\s*wrap/, '.lf-bar 须保持 flex-wrap:wrap（筛选条两行上限）');
  });

})();

// ═══ 源件 10：hover-state-guard.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // hover-state-guard.test.mjs — hover / active / selected 三态与触屏门控守卫
  // （spec redesign-theme-palette-and-density · Task 9）
  //
  // 为什么要有本守卫：
  //   · Task 7 把「四套 hover 机制（filter / 默认灰 / opacity / 硬编码）」收敛为「显式 hoverBg +
  //     @media (hover:hover) 门控 + 触屏 :active + 键盘 focus-visible」。这批规则一旦被后续批次
  //     改回去（新增裸 :hover、用 filter/opacity/位移当反馈、给静态行加 hover），没有任何红灯。
  //   · 判据：
  //       H1 门控：styles.css / person-picker.css / about.css / help.html / login.html 的 `:hover`
  //          规则必须位于 `@media (hover: hover)` 内（例外白名单逐条给理由）
  //       H2 反馈只改颜色：hover 规则体内 filter/opacity/transform/translate/box-shadow 计数为 0
  //       H3 页签与 summary：均有 hover / active / focus-visible；静态行/卡无 hover
  //       H4 Tailwind：hoverOnlyWhenSupported: true（触屏不触发 hover 工具类）
  //       H5 非空转：hover 规则数 >0（解析写坏不得恒绿）
  // 运行：node --test server/test/hover-state-guard.test.mjs
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync, readdirSync, statSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const HERE = dirname(fileURLToPath(import.meta.url));
  const ROOT = join(HERE, '..', '..');
  const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
  
  const CSS_FILES = [
    'docs/src/styles.css',
    'docs/src/components/person-picker.css',
    'docs/src/about.css',
  ];
  const HTML_FILES = ['docs/help.html', 'docs/login.html'];
  
  /**
   * 极简 CSS 解析：返回所有「普通规则」（选择器 + 规则体 + 是否被 hover 媒体查询包住）。
   * 只处理 `选择器 { 声明 }` 与 `@media … { … }`；本仓这两类文件没有更深的嵌套。
   * @param {string} css
   * @param {boolean} onlyHover — true 时只返回带 `:hover` 的规则（H1/H2/H5 用）
   */
  function parseRules(css, onlyHover = false) {
    const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
    let buf = '';
    const stack = [];
    const rules = [];
    for (let i = 0; i < clean.length; i++) {
      const ch = clean[i];
      if (ch === '{') {
        const pre = buf.trim();
        buf = '';
        const parent = stack[stack.length - 1];
        const inHover = /^@media\s*\(\s*hover\s*:\s*hover\s*\)/.test(pre) || Boolean(parent && parent.inHover);
        stack.push({ pre, inHover, rule: !pre.startsWith('@'), body: '' });
      } else if (ch === '}') {
        const node = stack.pop();
        buf = '';
        if (node && node.rule && (!onlyHover || /:hover/.test(node.pre))) rules.push(node);
      } else {
        buf += ch;
        if (stack.length) stack[stack.length - 1].body += ch;
      }
    }
    return rules;
  }
  
  function styleBlocks(html) {
    return [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
  }
  
  /** 每个文件 → hover 规则清单 */
  function hoverRulesByFile() {
    const out = new Map();
    for (const rel of CSS_FILES) out.set(rel, parseRules(read(rel), true));
    for (const rel of HTML_FILES) out.set(rel, parseRules(styleBlocks(read(rel)), true));
    return out;
  }
  
  /**
   * 门控例外白名单：**只允许**确属「非交互或无法用 hover 背景表达」的规则。
   * 每条必须写清「为什么它不是三态控件」。当前实测 0 条——白名单为空是正常状态；
   * 新增条目须逐条给理由，不得用它给普通按钮/行/卡开后门。
   */
  const HOVER_GATE_EXCEPTIONS = [];
  
  test('H1 全仓 :hover 规则必须由 @media (hover: hover) 门控', () => {
    const byFile = hoverRulesByFile();
    const total = [...byFile.values()].reduce((n, r) => n + r.length, 0);
    assert.ok(total > 0, '未解析到任何 :hover 规则（解析口径失效，判据会恒真）');
  
    const ungated = [];
    for (const [file, rules] of byFile) {
      for (const r of rules) {
        if (r.inHover) continue;
        if (HOVER_GATE_EXCEPTIONS.some((e) => e.file === file && e.test.test(r.pre))) continue;
        ungated.push(`${file} → ${r.pre.replace(/\s+/g, ' ').slice(0, 100)}`);
      }
    }
    console.log(`[hover] 5 个文件共 ${total} 条 :hover 规则，未门控 ${ungated.length} 条`);
    assert.deepEqual(ungated, [],
      `以下 :hover 规则不在 @media (hover: hover) 内（触屏会粘住 hover 态）：\n  ${ungated.join('\n  ')}`);
  });
  
  /**
   * 纯判据（H2）：返回 hover 规则体里的「非颜色反馈」属性。
   * 2026-11-01 新裁定（支书 #6 行选中柔和化）：可点行左条改由 `::before` 伪元素承担 `opacity` 过渡——
   *   这是**装饰层淡入**，不是给行本身加透明 / 位移；因此只对「整个选择器列表都指向 ::before/::after」
   *   的规则放行 `opacity` 一个属性。filter / transform / translate / box-shadow 仍一律判红，
   *   元素级 `opacity`（`.x:hover { opacity: .8 }`）也仍判红。
   */
  function hoverFeedbackProblems(css) {
    const propRe = /(?:^|[;\s{])(filter|opacity|transform|translate|box-shadow)\s*:/g;
    const out = [];
    for (const r of parseRules(css, true)) {
      const decorative = r.pre.split(',').every((s) => /::(?:before|after)\s*$/.test(s.trim()));
      for (const m of r.body.matchAll(propRe)) {
        if (decorative && m[1] === 'opacity') continue;
        out.push({ pre: r.pre, prop: m[1] });
      }
    }
    return out;
  }
  
  test('H2 hover 反馈只改颜色：filter / opacity / transform / translate / box-shadow 计数为 0', () => {
    // ① 反例：元素级 opacity 必须判红；装饰伪元素只放行 opacity（其余属性仍红）
    assert.equal(hoverFeedbackProblems('.x:hover { opacity: 0.8; }').length, 1,
      '反例未被判红：元素级 hover opacity 必须命中');
    assert.deepEqual(hoverFeedbackProblems('.x:hover::before { opacity: 1; }'), [],
      '正例被判红：装饰伪元素 ::before 的 opacity 淡入属于新裁定放行项');
    assert.equal(hoverFeedbackProblems('.x:hover::before { transform: scale(1.1); }').length, 1,
      '反例未被判红：装饰伪元素的 transform 仍须命中');
    assert.equal(hoverFeedbackProblems('.x:hover::after { box-shadow: 0 0 0 3px var(--app-accent); }').length, 1,
      '反例未被判红：装饰伪元素的 box-shadow 仍须命中');
    assert.equal(hoverFeedbackProblems('.x:hover::before, .y:hover { opacity: 1; }').length, 1,
      '反例未被判红：选择器列表混入非伪元素主体时不得按装饰层放行');
  
    // ② 实况：CSS 文件直读、HTML 取页内 <style>，与 H1 的解析面一致
    const sourceOf = (file) => (HTML_FILES.includes(file) ? styleBlocks(read(file)) : read(file));
    const byFile = hoverRulesByFile();
    let checked = 0;
    for (const rules of byFile.values()) checked += rules.length;
    const offenders = [];
    for (const file of byFile.keys()) {
      for (const p of hoverFeedbackProblems(sourceOf(file))) {
        offenders.push(`${file} → ${p.pre.replace(/\s+/g, ' ').slice(0, 100)}：${p.prop}`);
      }
    }
    assert.ok(checked > 0, '未检查到任何 hover 规则（非空转）');
    console.log(`[hover] 检查 hover 规则体 ${checked} 条，非颜色反馈 ${offenders.length} 条`);
    assert.deepEqual(offenders, [],
      `hover 不得用 filter/opacity/transform/translate/box-shadow 充当反馈（只改颜色）：\n  ${offenders.join('\n  ')}`);
  });
  
  test('H3 页签与 summary 有三态；静态行/卡不假装可点', () => {
    const rules = parseRules(read('docs/src/styles.css'));
    const has = (re) => rules.some((r) => re.test(r.pre));
  
    // 2026-11-01：空壳热区（.disclosure__summary）不铺底色，改用 `summary:not(.disclosure__summary)`
    //   限定有可见文字的披露条 ⇒ 三态判据允许 `:not(...)` 夹在元素与伪类之间。
    const summaryStateRe = (pseudo) => new RegExp(`(^|[\\s,])summary(?::not\\([^)]*\\))*${pseudo}`);
    for (const pseudo of [':hover', ':active', ':focus-visible']) {
      assert.ok(has(new RegExp(`\\.tab-btn${pseudo}`)), `.tab-btn 缺少 ${pseudo} 状态`);
      assert.ok(has(summaryStateRe(pseudo)), `summary 缺少 ${pseudo} 状态`);
    }
    // 页签/摘要的 hover 必须在门控内（H1 已全量核，此处再锁这两个关键控件）
    const tabHover = rules.find((r) => /\.tab-btn:hover/.test(r.pre));
    assert.ok(tabHover && tabHover.inHover, '.tab-btn:hover 必须由 @media (hover: hover) 门控');
    const summaryHover = rules.find((r) => summaryStateRe(':hover').test(r.pre));
    assert.ok(summaryHover && summaryHover.inHover, 'summary:hover 必须由 @media (hover: hover) 门控');
    // 底色反馈必须排除整行空壳热区（否则悬停时整块不透明灰盖住标题）。
    const summaryBgHover = rules.find((r) => summaryStateRe(':hover').test(r.pre) && /background(?:-color)?\s*:/.test(r.body));
    assert.ok(summaryBgHover, 'summary:hover 缺底色反馈（有可见文字的披露条应保留灰底）');
    assert.match(summaryBgHover.pre, /:not\(\.disclosure__summary\)/,
      'summary:hover 的底色反馈必须排除 .disclosure__summary（空壳热区不得铺背景）');
  
    // 静态行/卡不得有 hover 背景（不可点就不要装可点）
    // `.gallery-card` 单独核：它是 `role="button" tabindex="0"` 的**可交互卡**（不是静态卡），
    // 允许 hover 只加文字下划线，但不得加背景 / cursor 伪装（见下一条）。
    const staticHover = [];
    for (const sel of ['.row-quiet', '.notice-row', '.list-row', '.card']) {
      const escaped = sel.replace(/\./g, '\\.');
      const re = new RegExp(`(^|[\\s,])${escaped}:hover(\\s|,|$)`);
      if (rules.some((r) => re.test(r.pre))) staticHover.push(sel);
    }
    assert.deepEqual(staticHover, [],
      `静态行/卡出现 hover 伪装（应只在 [data-interactive="true"] / 可点载体上加）：${staticHover.join(' / ')}`);
  
    const galleryHover = rules.filter((r) => /(^|[\s,])\.gallery-card:hover/.test(r.pre));
    assert.ok(galleryHover.length > 0, '可交互画廊卡应保留 hover（仅文字下划线）');
    for (const r of galleryHover) {
      assert.doesNotMatch(r.body, /(?:^|[;\s])background(?:-color)?\s*:/, '画廊卡 hover 不得改背景（只加文字下划线）');
      assert.doesNotMatch(r.body, /cursor\s*:/, '画廊卡 hover 不得再改 cursor（可点性由 role=button 表达）');
    }
  
    // 可交互行/卡仍保留 hover
    assert.ok(rules.some((r) => /\.list-row\[data-interactive="true"\]:hover/.test(r.pre)),
      '可交互列表行应有 hover（.list-row[data-interactive="true"]:hover）');
    assert.ok(rules.some((r) => /\.card--interactive:hover/.test(r.pre)),
      '可交互卡应有 hover（.card--interactive:hover）');
  });
  
  test('H4 Tailwind hoverOnlyWhenSupported: true（触屏不触发 hover 工具类）', () => {
    const src = read('docs/src/tailwind-config.js');
    assert.match(src, /hoverOnlyWhenSupported\s*:\s*true/, 'tailwind-config.js 应开启 hoverOnlyWhenSupported: true');
  });
  
  test('H5 非空转：hover 规则规模下限', () => {
    const byFile = hoverRulesByFile();
    const counts = [...byFile.entries()].map(([f, r]) => `${f}=${r.length}`).join(' · ');
    const total = [...byFile.values()].reduce((n, r) => n + r.length, 0);
    console.log(`[hover] 规则分布：${counts}`);
    // 2026-10-23 批次 505 实测 101 条（styles 82 / person-picker 8 / about 3 / help 7 / login 1）。
    // 2026-10-24 批次 508：login.html 的 hover 覆盖已删除（深色键曾因此变灰），
    //   该页现在继承各按钮族自己的 hover ⇒ 允许 0 条，但仍要求其余文件非空。
    assert.ok(total >= 85, `hover 规则只有 ${total} 条（下限 85）：解析面被削或规则被误删`);
    for (const [f, r] of byFile) {
      if (f === 'docs/login.html') continue;
      assert.ok(r.length > 0, `${f} 未解析到 hover 规则（该文件的选择器写法可能已变）`);
    }
  });
  
  // ── H6 / H7：按压态（2026-10-23 批次 507）────────────────────────────────
  // 病灶：`--surface-active` 曾是党建红浅底（亮 #FEE2E2 / 暗 #2A1A22），中性按钮一按就闪红，
  //   被读成「危险 / 失败」。裁定：中性控件按压＝中性灰，主题色控件＝主题 activeBg，
  //   党建红实底＝--party-red-active；反馈只用 1px 内阴影（不位移 / 不缩放），时长 180ms。
  test('H6 按压配色三源：中性灰 / 主题 activeBg / 党建红 active', () => {
    const css = read('docs/src/styles.css');
    const active = /--surface-active:\s*([^;]+);/.exec(css);
    assert.ok(active, 'styles.css 缺少 --surface-active');
    assert.equal(active[1].trim(), 'var(--neutral-200)',
      `--surface-active 必须是中性灰 var(--neutral-200)，实际「${active[1].trim()}」`);
    assert.doesNotMatch(css, /--surface-active:\s*#(?:FEE2E2|2A1A22)/i,
      '不得回落到红色浅底（#FEE2E2 / #2A1A22）——中性控件按下不得闪红');
    assert.match(css, /\.btn-tab\.active:active[\s\S]{0,80}?var\(--app-accent-active-bg\)/,
      '主题色选中页签（.btn-tab.active / .tab-btn-active）的按压必须走 --app-accent-active-bg');
    assert.match(css, /\.tab-btn-active:active[\s\S]{0,80}?var\(--app-accent-active-bg\)/,
      '顶栏工作台选中页签的按压必须走 --app-accent-active-bg');
    assert.match(css, /--party-red-active:/, '党建红实底按压仍用 --party-red-active（不得被中性灰顶掉）');
  });
  
  test('H7 按压反馈唯一源：反馈档 + 1px 内阴影，且无位移 / 缩放', () => {
    const css = read('docs/src/styles.css');
    // 2026-10-31 P10：按压属反馈档（80–120ms），--transition-press 走 --motion-feedback；
    // 旧 --motion-base 继续作为兼容别名（映射到进入档）但不作按压的唯一源。
    assert.match(css, /--transition-press:\s*(?:var\(--motion-feedback\)|var\(--motion-base\)|120ms|180ms)/, '缺少 --transition-press（反馈档别名）');
    const shadows = (css.match(/--press-shadow:\s*[^;]+;/g) || []);
    assert.equal(shadows.length, 2, `--press-shadow 应在 :root 与深色段各一处（实测 ${shadows.length}）`);
    // 唯一源：聚合 :active 规则 ＋ `.motion-press` 工具类各一处（后者供动态生成按钮）
    const consumers = (css.match(/box-shadow:\s*var\(--press-shadow\)/g) || []);
    assert.equal(consumers.length, 2, `内阴影消费点应恰 2 处（实测 ${consumers.length}）`);
    // 按压不得位移 / 缩放：聚合规则体内不得出现 transform / scale / translate
    const idx = css.indexOf(':is(.btn-accent');
    assert.ok(idx > -1, '缺少按压聚合规则 :is(.btn-accent, …):active');
    const block = css.slice(idx, css.indexOf('}', idx));
    assert.doesNotMatch(block, /transform|scale|translate/, '按压反馈不得用位移 / 缩放');
    // 聚合规则必须覆盖四类按钮与关键控件
    const selStart = css.lastIndexOf(':is(', idx);
    const selectors = css.slice(selStart, css.indexOf(')', selStart));
    for (const s of ['.btn-accent', '.btn-tab', '.btn-outline', '.cs-option', 'summary']) {
      assert.ok(selectors.includes(s), `按压聚合选择器缺 ${s}`);
    }
  });
  
  // ── H8 / H9：可点光标必须有三态 ＋ role=button 必须键盘可达（2026-10-28 批次 520）──
  // 病灶：本轮补 23 处可交互表面时发现，`cursor: pointer` 单独出现会让元素「看起来能点」，
  //   但既无 hover 也无 active；`role="button"` 若不带 tabindex，读屏能读出按钮、键盘却进不去。
  // 判据：
  //   H8 所有声明 `cursor: pointer` 的类，必须能在某条 `:hover` 或 `:active` 规则里找到同名类。
  //   H9 所有产出 `role="button"` 的标签，本身必须是 `<button>` / `<a>`，否则同标签必须带 `tabindex`。
  // 两条都带反例（写坏正则 / 判据写反 ⇒ 立即判红）。
  
  /** 全部规则（CSS 文件 ＋ HTML 页内 <style>），用于 H8 */
  function allRules() {
    const out = [];
    for (const rel of CSS_FILES) out.push({ file: rel, rules: parseRules(read(rel)) });
    for (const rel of HTML_FILES) out.push({ file: rel, rules: parseRules(styleBlocks(read(rel))) });
    return out;
  }
  
  /** 取选择器列表里每个选择器的「主语复合选择器」中的类名（祖先 / 后代类不算） */
  function subjectClasses(selector) {
    const out = new Set();
    for (const part of selector.split(',')) {
      const subject = part.trim().split(/\s*[>+~]\s*|\s+/).pop() || '';
      for (const m of subject.matchAll(/\.([a-zA-Z_][\w-]*)/g)) out.add(m[1]);
    }
    return out;
  }
  
  /** 纯判据（H8）：返回未被 :hover / :active 覆盖的 cursor:pointer 类 */
  function cursorStateProblems(files) {
    const covered = new Set();
    for (const { rules } of files) {
      for (const r of rules) {
        if (!/:hover|:active/.test(r.pre)) continue;
        // 覆盖判定允许祖先位：如 `.help-toc-dot-item:hover .dot-mark` 已给整项提供了 hover 反馈
        for (const m of r.pre.matchAll(/\.([a-zA-Z_][\w-]*)/g)) covered.add(m[1]);
      }
    }
    const problems = [];
    let rows = 0;
    for (const { file, rules } of files) {
      for (const r of rules) {
        if (!/(?:^|[;\s])cursor\s*:\s*pointer/.test(r.body)) continue;
        rows += 1;
        for (const cls of subjectClasses(r.pre)) {
          if (!covered.has(cls)) problems.push({ file, cls });
        }
      }
    }
    return { problems, rows };
  }
  
  /** 纯判据（H9）：返回缺 tabindex 的 role=button 非原生控件 */
  function roleButtonProblems(src) {
    const problems = [];
    let total = 0;
    const re = /<([a-zA-Z][\w-]*)\b([^>]*\brole="button"[^>]*)>/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      total += 1;
      const tag = m[1].toLowerCase();
      if (tag === 'button' || tag === 'a') continue;
      if (!/\btabindex\s*=/.test(m[2])) problems.push(m[0].replace(/\s+/g, ' ').slice(0, 100));
    }
    return { problems, total };
  }
  
  /** 递归收集 docs 下 .js / .html（跳过依赖目录） */
  function walkCode(dir, out = []) {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name === 'vendor' || name === '.git') continue;
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) walkCode(p, out);
      else if (name.endsWith('.js') || name.endsWith('.html')) out.push(p);
    }
    return out;
  }
  
  /**
   * H8 登记例外（逐条写理由；只收「状态由同元素其它类 / 元素级规则提供」与本轮冻结件）：
   *   · `.todo-more__btn` 与 `.btn-outline` 同元素（`todo-list.js:144`），状态由按钮族提供；
   *   · `.modal-fieldset__summary` 是 `<summary>` 元素，状态由全局 `summary:hover/active` 提供；
   *   · `.ab-tl-center` 属 About 冻结件，整行 `.ab-tl-row` 承担展开态，待支书点头后单独补。
   */
  const CURSOR_STATE_EXEMPT = [
    { file: 'docs/src/styles.css', cls: 'todo-more__btn', why: '与 .btn-outline 同元素，状态由按钮族提供' },
    { file: 'docs/src/styles.css', cls: 'modal-fieldset__summary', why: '<summary> 元素，状态由全局 summary:hover/active 提供' },
    { file: 'docs/src/about.css', cls: 'ab-tl-center', why: 'About 冻结件，整行承担展开态，待支书点头后单独补' },
  ];
  
  test('H8 声明 cursor:pointer 的类必须有 :hover 或 :active（反例：只有光标没有状态）', () => {
    // ① 反例：只有 cursor:pointer、无任何 hover / active ⇒ 必须判红
    const planted = [{ file: 'probe.css', rules: parseRules('.probe { cursor: pointer; }\n.probe:hover { color: red; }') }];
    assert.equal(cursorStateProblems([{ file: 'probe.css', rules: parseRules('.probe { cursor: pointer; }') }]).problems.length, 1,
      '反例未被判红：无 hover / active 的 cursor:pointer 必须命中');
    // ② 正例：hover 或 active 任一存在 ⇒ 不得误红
    assert.deepEqual(cursorStateProblems(planted).problems, [], '正例被判红：有 :hover 的可点类不得误判');
    assert.deepEqual(cursorStateProblems([{ file: 'probe.css', rules: parseRules('.probe { cursor: pointer; }\n.probe:active { color: red; }') }]).problems, [],
      '正例被判红：有 :active 的可点类不得误判');
  
    // ③ 实况
    const files = allRules();
    const { problems, rows } = cursorStateProblems(files);
    const exempt = new Map(CURSOR_STATE_EXEMPT.map((e) => [`${e.file}|${e.cls}`, e]));
    for (const e of CURSOR_STATE_EXEMPT) {
      assert.ok(e.why && e.why.length >= 8, `H8 例外 .${e.cls} 缺理由（新增例外须写清谁提供了状态）`);
      assert.ok(problems.some((p) => p.file === e.file && p.cls === e.cls),
        `H8 例外 .${e.cls} 已不再命中（僵尸例外，请删除）`);
    }
    assert.ok(CURSOR_STATE_EXEMPT.length <= 3, `H8 例外涨到 ${CURSOR_STATE_EXEMPT.length} 条（上限 3）：只许逐条给理由、不许扩表`);
    const offenders = problems.filter((p) => !exempt.has(`${p.file}|${p.cls}`))
      .map((p) => `${p.file} → .${p.cls}（cursor:pointer 但无 :hover / :active）`);
    assert.ok(rows >= 30, `只扫描到 ${rows} 条 cursor:pointer 规则（下限 30）：判据面被写坏`);
    console.log(`[hover] H8 cursor:pointer 规则 ${rows} 条 · 无状态且未登记 ${offenders.length} 处（登记例外 ${CURSOR_STATE_EXEMPT.length}）`);
    assert.deepEqual(offenders, [],
      `以下类只声明了 cursor:pointer，却没有 :hover / :active（看起来能点、实际没有反馈）：\n  ${offenders.join('\n  ')}`);
  });
  
  test('H9 产出 role="button" 的组件必须同时产出 tabindex（或本身是原生 button / a）', () => {
    // ① 反例：div 宣告按钮却无 tabindex ⇒ 必须判红
    assert.equal(roleButtonProblems('<div role="button" class="x">开办</div>').problems.length, 1,
      '反例未被判红：无 tabindex 的 role=button 必须命中');
    // ② 正例：带 tabindex / 原生 button / 原生 a ⇒ 不得误红
    assert.deepEqual(roleButtonProblems('<div role="button" tabindex="0">开办</div>').problems, [],
      '正例被判红：带 tabindex 的 role=button 不得误判');
    assert.deepEqual(roleButtonProblems('<button role="button">开办</button>').problems, [],
      '正例被判红：原生 button 不需要额外 tabindex');
    assert.deepEqual(roleButtonProblems('<a role="button" href="#">开办</a>').problems, [],
      '正例被判红：原生 a 不需要额外 tabindex');
  
    // ③ 实况：docs 全量 .js ＋ .html
    const files = walkCode(join(ROOT, 'docs')).map((abs) => ({ abs, src: readFileSync(abs, 'utf8') }));
    let total = 0;
    const problems = [];
    for (const { abs, src } of files) {
      const r = roleButtonProblems(src);
      total += r.total;
      problems.push(...r.problems.map((p) => `${abs.slice(ROOT.length + 1).replace(/\\/g, '/')} → ${p}`));
    }
    assert.ok(total >= 20, `只扫描到 ${total} 个 role="button" 标签（下限 20）：判据面被写坏`);
    console.log(`[hover] H9 role=button 标签 ${total} 个 · 缺 tabindex ${problems.length} 处`);
    assert.deepEqual(problems, [],
      `role="button" 不带 tabindex，键盘无法进入（能改原生 button / a 的优先改原生）：\n  ${problems.join('\n  ')}`);
  });
  
  // ── H10 空壳折叠热区不铺底色（2026-11-01）────────────────────────────────
  // 病灶：`.disclosure__summary` 是绝对定位、空内容、覆盖整行 1150×44 的热区；全局
  //   `summary:hover{background-color:var(--surface-hover)}` 会把它铺成不透明灰，盖住同列标题文字。
  // 判据：凡选择器主体含 `.disclosure__summary` 的规则（含 :hover / :active），
  //   `background` / `background-color` 只允许 `transparent` / `none`（缺省即透明）。
  /** 纯判据：返回给 .disclosure__summary 铺了非透明背景的规则（便于正反例自检） */
  function disclosureBackgroundProblems(css) {
    const out = [];
    for (const r of parseRules(css)) {
      // 先剥掉 `:not(...)`：`summary:not(.disclosure__summary)` 的主体是 summary，不算命中。
      const subject = r.pre.replace(/:not\([^)]*\)/g, '');
      if (!/\.disclosure__summary\b/.test(subject)) continue;
      const m = /(?:^|[;\s])background(?:-color)?\s*:\s*([^;]+)/.exec(r.body);
      if (!m) continue;
      const value = m[1].trim();
      if (/^(?:transparent|none)$/i.test(value)) continue;
      out.push(`${r.pre.replace(/\s+/g, ' ').slice(0, 100)} → background: ${value}`);
    }
    return out;
  }
  
  test('H10 空壳折叠热区不铺底色：.disclosure__summary（含 hover / active）背景必须透明', () => {
    // ① 反例：给空壳热区铺非透明背景 ⇒ 必须判红（hover 与常驻态都算）
    assert.equal(disclosureBackgroundProblems(
      '.disclosure__summary:hover { background-color: var(--surface-hover); }').length, 1,
      '反例未被判红：disclosure__summary:hover 的灰底必须命中');
    assert.equal(disclosureBackgroundProblems(
      '.disclosure__summary { background: var(--surface-active); }').length, 1,
      '反例未被判红：disclosure__summary 常驻底色必须命中');
    // ② 正例：非 disclosure 的 summary 铺底色合法；disclosure 只改颜色 / 显式 transparent 合法
    assert.deepEqual(disclosureBackgroundProblems(
      'summary:hover { background-color: var(--surface-hover); }'), [],
      '正例被判红：普通 summary 的灰底反馈不得误伤');
    assert.deepEqual(disclosureBackgroundProblems(
      '.disclosure__summary:hover { color: var(--neutral-800); }'), [],
      '正例被判红：只改 chevron 颜色（currentColor）不得误判');
    assert.deepEqual(disclosureBackgroundProblems(
      '.disclosure__summary { background-color: transparent; }'), [],
      '正例被判红：显式 transparent 不得误判');
    // ③ 实况
    const offenders = disclosureBackgroundProblems(read('docs/src/styles.css'));
    assert.deepEqual(offenders, [],
      `空壳折叠热区被铺了背景（悬停时整块不透明灰盖住同列标题）：\n  ${offenders.join('\n  ')}`);
  });
  
  // ── H11 可点行状态（2026-11-04 批次 534 改准：左条退出）────────────────────────
  // 病灶：`.list-row` 方角（`border-radius: 0`）＋ hover 用中性灰（灰显脏）；
  //   状态 / 选中 / 当前 / 身份共用同一条 3px 左侧色条，焦点环压在左条上又叠一圈。
  // 裁定：行 8px 圆角；hover 只用主题 10% 淡底；选中用 soft 底 ＋ soft 字 ＋ 字重；
  //   **状态左条计数为 0**（border-left / inset 3px / ::before 色条）；
  //   焦点环 `outline-offset: -2px` 压进行内，环仍只有全站唯一那一条（SD-27，不重开）。
  /** 纯判据：返回可点行状态口径的违规项（正反例复用同一口径，避免「反例另写一套」） */
  function listRowStateProblems(css) {
    const rules = parseRules(css);
    const subjects = (pre) => pre.split(',').map((s) => s.trim());
    const find = (sel) => rules.filter((r) => subjects(r.pre).includes(sel));
    const problems = [];
  
    const base = find('.list-row');
    if (!base.length) problems.push('缺 .list-row 规则');
    else if (!base.some((r) => /border-radius:\s*var\(--radius-sm\)/.test(r.body))) {
      problems.push('.list-row 的 border-radius 必须是 var(--radius-sm)（8px 圆角）');
    }
  
    const hover = find('.list-row[data-interactive="true"]:hover');
    if (!hover.length) problems.push('缺 .list-row[data-interactive="true"]:hover');
    else {
      const body = hover.map((r) => r.body).join('\n');
      if (/(?:^|[;\s])background(?:-color)?\s*:\s*var\(--surface-hover\)/.test(body)) {
        problems.push('可点行 hover 不得再用 --surface-hover（灰底只留静态分隔）');
      }
      if (!/(?:^|[;\s])background(?:-color)?\s*:\s*var\(--app-accent-tint\)/.test(body)) {
        problems.push('可点行 hover 底必须是 --app-accent-tint（主题 10% 淡底）');
      }
    }
  
    const selected = find('.list-row[data-selected="true"]');
    if (!selected.length) problems.push('缺 .list-row[data-selected="true"] 选中规则');
    else if (!selected.some((r) => /(?:^|[;\s])background(?:-color)?\s*:\s*var\(--app-accent-soft-bg\)/.test(r.body))) {
      problems.push('选中态必须用 --app-accent-soft-bg（不得用左条表达选中）');
    }
  
    // 左条禁令：状态型 / 装饰型左条一律不得出现在 .list-row 家族
    for (const r of rules) {
      if (!/\.list-row/.test(r.pre)) continue;
      if (/border-left/.test(r.body)) {
        problems.push(`可点行不得用 border-left 画状态左条：${r.pre}`);
      }
      if (/inset\s+[1-9]\d*px\s+0\s+0/.test(r.body)) {
        problems.push(`可点行不得用 inset 内阴影画左条：${r.pre}`);
      }
      if (/(?:^|[;\s])(?:width|inline-size)\s*:\s*3px/.test(r.body)) {
        problems.push(`可点行不得用伪元素画 3px 状态左条：${r.pre}`);
      }
    }
  
    return problems;
  }
  
  const H11_OK = `
  .list-row { border-radius: var(--radius-sm); }
  .list-row[data-interactive="true"]:hover { background-color: var(--app-accent-tint); }
  .list-row[data-selected="true"] { border-radius: var(--radius-sm); background: var(--app-accent-soft-bg); font-weight: 600; }
  `;
  
  test('H11 可点行：8px 圆角 + 主题 10% 淡底 + 选中 soft 底（状态左条计数为 0，含 4 条反例）', () => {
    // ① 正例：合规样本不得误红（含媒体查询内的 hover 规则）
    assert.deepEqual(listRowStateProblems(H11_OK), [], '正例被判红：合规的可点行状态口径不得误判');
  
    // ② 反例 1：圆角退回 0 ⇒ 必须判红
    const badRadius = H11_OK.replace('.list-row { border-radius: var(--radius-sm); }',
      '.list-row { border-radius: 0; }');
    assert.ok(listRowStateProblems(badRadius).some((p) => p.includes('border-radius')),
      '反例未被判红：行圆角退回 0 必须命中');
  
    // ③ 反例 2：hover 回灰底 --surface-hover ⇒ 必须判红
    const badHover = H11_OK.replace('background-color: var(--app-accent-tint)',
      'background-color: var(--surface-hover)');
    assert.ok(listRowStateProblems(badHover).some((p) => p.includes('--surface-hover')),
      '反例未被判红：可点行 hover 用灰底必须命中');
  
    // ④ 反例 3：把 3px 伪元素状态左条加回来 ⇒ 必须判红
    const badBar = `${H11_OK}\n.list-row[data-interactive="true"]::before { content: ''; width: 3px; background: var(--app-accent); }`;
    assert.ok(listRowStateProblems(badBar).some((p) => p.includes('3px 状态左条')),
      '反例未被判红：3px 伪元素左条加回来必须命中');
  
    // ⑤ 反例 4：用 border-left 画状态左条 ⇒ 必须判红
    const badBorder = H11_OK.replace(
      '.list-row[data-interactive="true"]:hover { background-color: var(--app-accent-tint); }',
      '.list-row[data-interactive="true"]:hover { background-color: var(--app-accent-tint); border-left: 3px solid var(--app-accent); }');
    assert.ok(listRowStateProblems(badBorder).some((p) => p.includes('border-left')),
      '反例未被判红：border-left 左条必须命中');
  
    // ⑥ 反例 5：选中只留左条、去掉 soft 底 ⇒ 必须判红
    const badSelected = H11_OK.replace('background: var(--app-accent-soft-bg); ', '');
    assert.ok(listRowStateProblems(badSelected).some((p) => p.includes('--app-accent-soft-bg')),
      '反例未被判红：选中态缺 soft 底必须命中');
  
    // ⑦ 实况
    const problems = listRowStateProblems(read('docs/src/styles.css'));
    assert.deepEqual(problems, [], `可点行状态口径不合新裁定（左条应已退出）：\n  ${problems.join('\n  ')}`);
    // 非空转：判据必须真解析到 .list-row 家族（而不是空串恒绿）
    const rules = parseRules(read('docs/src/styles.css'));
    const rows = rules.filter((r) => /\.list-row/.test(r.pre)).length;
    assert.ok(rows >= 10, `只解析到 ${rows} 条 .list-row 规则（下限 10）：判据面被写坏`);
    console.log(`[hover] H11 可点行规则 ${rows} 条 · 违规 ${problems.length} 处`);
  });

})();

// ═══ 源件 11：no-underline-guard.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // no-underline-guard.test.mjs — 「全站文本下划线清零」守卫（2026-10-27 Task 9 · spec refine-ui-three-lenses）
  //
  // 来源（用户裁定，逐字）：「全系统一个下划线都没有」。spec 的 BREAKING 项：
  //   移除 `text-decoration: underline`、Tailwind `underline` / `hover:underline`、`text-underline-offset`；
  //   链接识别改用「颜色 + 箭头/图标/底色 hover」。
  //
  // 本守卫判的是**源码里是否还写着下划线**（不是 computed style；运行时由各组件类承担）：
  //   N1 非空转：扫描面 ≥250 个前端源；抽取口径在合成正/负样本上必须命中/不命中
  //   N2 判红面：docs/**（除 `PENDING_FILES` 台账）内不得出现下列任一写法
  //        · `text-decoration: underline`
  //        · `text-underline-offset`
  //        · `underline-offset-<n>`（Tailwind 偏移类）
  //        · 类名 token `underline` / `hover:underline`
  //   N3 PENDING 台账：逐条写明「谁持有、为什么暂留」；只报处数不判红（Task 12 收口后自然归零）
  //   N4 只降不升：全站（含 PENDING）下划线处数不得超过 `TOTAL_CAP`（当前仅 help.html 3 处）
  //
  // 口径边界（如实标注）：
  //   · 只认「文本装饰」下划线；表格分隔线 / 卡边 / 选中态边线（`border-*`）不属本口径，不判。
  //   · 注释先剥除再判（避免「说明文字里提到 underline」被误判）；`https://` 不被当行注释截断。
  //   · `help.html` 由 Task 12 持有（本任务无写权）；`login.html` / `sidebar.js` 同属 Task 12 写权面，
  //     但当前已无下划线 ⇒ 一并进判红面，防止新增。
  // 运行：node --test server/test/no-underline-guard.test.mjs
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readdirSync, readFileSync, statSync } = await import('node:fs');
  const { join, relative, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const HERE = dirname(fileURLToPath(import.meta.url));
  const ROOT = join(HERE, '..', '..');
  const DOCS = join(ROOT, 'docs');
  const EXTS = ['.js', '.mjs', '.css', '.html'];
  const SKIP_DIRS = ['vendor'];
  
  /** Task 12 持有写权、本任务不改的文件（收口后自动归零；只报不判） */
  const PENDING_FILES = {};
  /** 全站下划线处数上限（只降不升）：Task 12 已收口 help.html，当前为 0 */
  const TOTAL_CAP = 0;
  
  /** 剥注释后判红（避免 prose 提到 underline 被误判） */
  function stripComments(src, ext) {
    let s = src.replace(/\/\*[\s\S]*?\*\//g, '');
    if (ext === '.html') s = s.replace(/<!--[\s\S]*?-->/g, '');
    if (ext === '.js' || ext === '.mjs') {
      s = s.split('\n').map((line) => line.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n');
    }
    return s;
  }
  
  const PATTERNS = [
    { kind: 'text-decoration:underline', re: /text-decoration\s*:\s*[^;{}"']*\bunderline\b/gi },
    { kind: 'text-underline-offset', re: /text-underline-offset/gi },
    { kind: 'underline-offset-N', re: /underline-offset-\d/gi },
    { kind: 'underline token', re: /(?<![\w-])(?:hover:)?underline(?![\w-])/gi },
  ];
  
  /** 抽取口径（导出便于非空转自检）：返回命中种类列表 */
  function underlineHits(src, ext = '.js') {
    const code = stripComments(src, ext);
    const kinds = [];
    for (const { kind, re } of PATTERNS) {
      const hits = code.match(new RegExp(re.source, re.flags));
      if (hits) kinds.push({ kind, count: hits.length });
    }
    return kinds;
  }
  
  function scanFiles() {
    const out = [];
    const walk = (dir) => {
      for (const e of readdirSync(dir)) {
        if (SKIP_DIRS.includes(e)) continue;
        const full = join(dir, e);
        if (statSync(full).isDirectory()) { walk(full); continue; }
        if (!EXTS.some((x) => e.endsWith(x))) continue;
        out.push(relative(ROOT, full).replace(/\\/g, '/'));
      }
    };
    walk(DOCS);
    return out.sort();
  }
  
  const FILES = scanFiles();
  
  function scan() {
    return FILES.map((file) => {
      const ext = file.slice(file.lastIndexOf('.'));
      const kinds = underlineHits(readFileSync(join(ROOT, file), 'utf8'), ext);
      const total = kinds.reduce((n, k) => n + k.count, 0);
      return { file, kinds, total };
    }).filter((r) => r.total > 0);
  }
  
  test('N1 非空转：扫描面规模 + 抽取口径正/负例', () => {
    assert.ok(FILES.length >= 250, `只扫描到 ${FILES.length} 个前端源（下限 250）：扫描口径被削，N2 会恒真`);
    // 正例
    assert.deepEqual(underlineHits('<a class="text-accent hover:underline">x</a>', '.js'), [{ kind: 'underline token', count: 1 }],
      '抽取口径失效：hover:underline 未命中');
    assert.deepEqual(underlineHits('.x { text-decoration: underline; }', '.css'), [
      { kind: 'text-decoration:underline', count: 1 }, { kind: 'underline token', count: 1 },
    ], '抽取口径失效：CSS text-decoration: underline 未命中');
    assert.deepEqual(underlineHits('<a class="underline-offset-2">x</a>', '.html'), [{ kind: 'underline-offset-N', count: 1 }],
      '抽取口径失效：underline-offset-2 未命中');
    assert.deepEqual(underlineHits('.x { text-underline-offset: 2px; }', '.css'), [{ kind: 'text-underline-offset', count: 1 }],
      '抽取口径失效：text-underline-offset 未命中');
    // 负例
    assert.deepEqual(underlineHits('.x { text-decoration: none; }', '.css'), [], '抽取口径过宽：text-decoration: none 被误判');
    assert.deepEqual(underlineHits('const underlined = 1;', '.js'), [], '抽取口径过宽：underlined 被误判');
    assert.deepEqual(underlineHits('// 这里说明不用 underline\nconst a = 1;', '.js'), [], '抽取口径过宽：注释里的 underline 被误判');
    assert.deepEqual(underlineHits('/* hover:underline */ .x{color:red}', '.css'), [], '抽取口径过宽：块注释里的 underline 被误判');
  });
  
  test('N2 全站文本下划线清零（PENDING 台账之外为 0）', () => {
    const rows = scan();
    const offenders = rows.filter((r) => !PENDING_FILES[r.file]);
    for (const r of rows) {
      const detail = r.kinds.map((k) => `${k.kind}×${k.count}`).join(' / ');
      console.log(`[no-underline] ${PENDING_FILES[r.file] ? 'PENDING ' : 'OFFENDER'} ${r.file} → ${detail}`);
    }
    assert.deepEqual(
      offenders.map((r) => `${r.file} → ${r.kinds.map((k) => `${k.kind}×${k.count}`).join(' / ')}`),
      [],
      '以下文件仍写有文本下划线（改用 颜色 + 箭头/图标/底色 hover；见 spec「文本下划线全站清零」）',
    );
  });
  
  test('N3 PENDING 台账：文件存在、写明持有者；只报处数不判红', () => {
    const rows = new Map(scan().map((r) => [r.file, r]));
    const files = Object.keys(PENDING_FILES);
    for (const file of files) {
      assert.ok(PENDING_FILES[file].includes('Task 12'), `${file} 的 PENDING 理由必须写明持有者（Task 12）`);
      assert.ok(statSync(join(ROOT, file)).isFile(), `PENDING 台账指向不存在的文件：${file}`);
      const total = rows.get(file)?.total || 0;
      console.log(`[no-underline] PENDING ${file}：剩余 ${total} 处（收口后自动归零，无需删除本条）`);
    }
    // 台账为空时，任何仍有下划线的文件都必须已判红（N2），不得靠“未登记”漏过。
    const unregistered = scan().filter((r) => r.total > 0 && !files.includes(r.file)).map((r) => r.file);
    assert.deepEqual(unregistered, [], `仍有下划线但未进 PENDING 台账：${unregistered.join('、')}`);
  });
  
  test('N4 只降不升：全站下划线处数 ≤ 上限', () => {
    const total = scan().reduce((n, r) => n + r.total, 0);
    assert.ok(total <= TOTAL_CAP,
      `全站下划线 ${total} 处 > 上限 ${TOTAL_CAP}（新增必须说明为什么不是文本装饰；收口后只能下调本常量）`);
    console.log(`[no-underline] 全站下划线 ${total} 处（上限 ${TOTAL_CAP}）`);
  });

})();

// ═══ 源件 12：motion-guard.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // motion-guard.test.mjs — 动效三档令牌 / 属性 / 反例守卫（2026-10-24 批次 508，2026-10-31 P10 扩面）
  //
  // 为什么要有本守卫：
  //   · 2026-10-24 批次 508 把全站过渡时长 / 曲线收敛为 `--motion-*` / `--ease-*` 唯一源；
  //   · 2026-10-31 P10 立三档：反馈 80–120ms / 进入退出 160–240ms / 强调 240–320ms，
  //     并把扫描面从 `styles.css` 扩到**全部产品 CSS + JS 内联样式字符串**。
  //   · 支书口径：「不能太 fancy（微软扁平风）；不能太简单（像掉帧）」——重活靠令牌与守卫兜住。
  //
  // 判据：
  //   M1 非空转：styles.css 解析到 ≥20 条 transition 声明
  //   M2 时长白名单：全部产品 CSS 的 transition/animation 时长只能 var(--motion-*) / 0s；
  //      裸值逐条登记（styles.css 存量 7 条），about.css 为冻结叙事页整文件登记（只登记不改）
  //   M3 属性白名单：transition-property 只能安全属性 + 已登记例外；all / 布局属性判红
  //   M4 三档令牌齐备且落在档内（feedback 80–120 / enter,exit 160–240 / emphasis 240–320）
  //   M5 reduced-motion：兜底块把 delay 归零、duration 压缩
  //   M6 可复用类：.motion-enter / .motion-collapse / .motion-press；scale 类已删除
  //   M7 反例：产品 CSS 的 keyframes 不得出现 rotateX / clip-path / 等比 scale()
  //   M8 JS 内联：不得写裸毫秒 transition/animation（about-entry.js 冻结登记）
  //   M9 滚动：不得写裸 `behavior:'smooth'`，必须走 `smoothScroll()`（about-entry.js 冻结登记）
  //   M10 滚动出口唯一：docs/src 除 utils.js helper 与 about-entry.js 外不得再直调 scrollIntoView/scrollTo/scrollBy
  // 运行：node --test server/test/motion-guard.test.mjs
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync, readdirSync, statSync } = await import('node:fs');
  const { join, dirname, relative } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const HERE = dirname(fileURLToPath(import.meta.url));
  const ROOT = join(HERE, '..', '..');
  const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
  const strip = (s) => String(s).replace(/\/\*[\s\S]*?\*\//g, '');
  const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
  
  const STYLES_REL = 'docs/src/styles.css';
  const RAW = read(STYLES_REL);
  const CSS = strip(RAW);
  
  /** 产品 CSS（不含 About 冻结件） */
  const PRODUCT_CSS = [
    STYLES_REL,
    'docs/src/components/person-picker.css',
    'docs/src/components/shell/tab-loading.css',
  ];
  /** About 冻结件：只登记、不改（2026-10-31 P10） */
  const ABOUT_CSS = 'docs/src/about.css';
  const ABOUT_EXCEPTION = '关于页叙事动效冻结件（0.9–1s 级长时长 / rotateX / clip-path / scale 均登记，不得扩散到产品页）';
  
  const DECL_RE = /^\s*(?:-webkit-)?(?:transition|animation)(?:-duration)?\s*:\s*([^;]+);?\s*$/;
  const TRANSITION_PROP_RE = /^\s*(?:-webkit-)?transition(?:-property)?\s*:\s*([^;]+);?\s*$/;
  
  /** 取选择器列表精确包含 selector 的规则体 */
  function ruleBody(css, selector) {
    const re = /([^{}]+)\{([^{}]*)\}/g;
    let m;
    while ((m = re.exec(css))) {
      const sels = m[1].split(',').map((s) => s.trim());
      if (sels.includes(selector)) return m[2];
    }
    return '';
  }
  
  /** 取以 needle 开头的块的内部文本（大括号配对） */
  function blockAfter(css, needle) {
    const i = css.indexOf(needle);
    if (i < 0) return '';
    const start = css.indexOf('{', i);
    if (start < 0) return '';
    let depth = 0;
    for (let p = start; p < css.length; p += 1) {
      if (css[p] === '{') depth += 1;
      else if (css[p] === '}') {
        depth -= 1;
        if (depth === 0) return css.slice(start + 1, p);
      }
    }
    return '';
  }
  
  /** 收集某 CSS 文件的 transition / animation 声明（行级） */
  function motionDecls(rel) {
    const lines = strip(read(rel)).split('\n');
    const out = [];
    lines.forEach((line, idx) => {
      const m = DECL_RE.exec(line);
      if (!m) return;
      out.push({ file: rel, line: idx + 1, text: norm(line), body: m[1].trim() });
    });
    return out;
  }
  
  /** 提取所有 @keyframes 的内部文本 */
  function keyframeBodies(css) {
    const out = [];
    const re = /@keyframes\s+[\w-]+\s*\{/g;
    let m;
    while ((m = re.exec(css))) {
      const start = css.indexOf('{', m.index);
      let depth = 0;
      for (let p = start; p < css.length; p += 1) {
        if (css[p] === '{') depth += 1;
        else if (css[p] === '}') {
          depth -= 1;
          if (depth === 0) { out.push(css.slice(start + 1, p)); break; }
        }
      }
    }
    return out;
  }
  
  /** 递归列 docs/src 下的 JS / HTML */
  function walk(dir, acc = []) {
    for (const name of readdirSync(dir)) {
      const abs = join(dir, name);
      const st = statSync(abs);
      if (st.isDirectory()) walk(abs, acc);
      else if (/\.(?:js|html)$/.test(name)) acc.push(relative(ROOT, abs).replace(/\\/g, '/'));
    }
    return acc;
  }
  
  const MOTION_DECLS = PRODUCT_CSS.flatMap((rel) => motionDecls(rel));
  const JS_FILES = walk(join(ROOT, 'docs/src'));
  
  /**
   * M2 存量白名单：styles.css 的 7 条裸值（本批可改面之外的存量，只降不增）。
   * 每条 key 是规范化后的整行声明；zombie 检查保证条目仍然真实存在。
   */
  const BARE_DURATION_EXCEPTIONS = [
    { file: STYLES_REL, decl: 'transition: opacity 0.25s ease-out, transform 0.25s ease-out;', reason: '视图切换（.view-section，存量）' },
    { file: STYLES_REL, decl: 'transition: opacity 0.14s ease-out, transform 0.14s ease-out;', reason: '状态徽章浮层（.status-badge-popover，存量）' },
    { file: STYLES_REL, decl: 'transition: background-color 0.12s ease-out;', reason: '状态徽章选项（.status-badge-option，存量）' },
    { file: STYLES_REL, decl: 'transition: opacity 240ms var(--help-ease);', reason: 'help 页目录（独立 --help-ease 体系，存量）' },
    { file: STYLES_REL, decl: 'transition: background-color 240ms var(--help-ease), transform 240ms var(--help-ease);', reason: 'help 页目录圆点（独立 --help-ease 体系，存量）' },
    { file: STYLES_REL, decl: 'animation-duration: 0.01ms !important;', reason: 'prefers-reduced-motion 兜底（必须保留极短时长以维持事件语义）' },
    { file: STYLES_REL, decl: 'transition-duration: 0.01ms !important;', reason: 'prefers-reduced-motion 兜底（必须保留极短时长以维持事件语义）' },
  ];
  
  /** 安全属性（不触发布局） */
  const SAFE_PROPERTIES = new Set([
    'opacity', 'transform', 'color', 'background-color', 'border-color', 'box-shadow', 'fill', 'stroke',
  ]);
  
  /** 已登记的既有过渡属性（不触发布局，但不在 8 个首选内） */
  const PROPERTY_EXCEPTIONS = new Map([
    ['outline-color', '焦点环颜色过渡（只重绘，不布局）'],
    ['grid-template-rows', '折叠面板高度过渡（.motion-collapse 的实现方式）'],
    ['grid-auto-rows', '列表展开行高过渡（既有 expand 动画）'],
    ['visibility', '浮层显隐（与 opacity 同组，避免 display 硬切）'],
    ['text-decoration-color', '链接下划线颜色过渡（只重绘）'],
  ]);
  
  /** 明令禁止的布局属性 */
  const FORBIDDEN_PROPERTIES = new Set([
    'all', 'height', 'width', 'max-height', 'max-width', 'min-height', 'min-width',
    'padding', 'padding-top', 'padding-bottom', 'padding-left', 'padding-right',
    'top', 'left', 'right', 'bottom',
    'margin', 'margin-top', 'margin-bottom', 'margin-left', 'margin-right',
  ]);
  
  test('M1 非空转：styles.css 解析到 ≥20 条 transition 声明', () => {
    const transitions = MOTION_DECLS.filter((d) => /^\s*(?:-webkit-)?transition/.test(d.text));
    assert.ok(transitions.length >= 20,
      `只解析到 ${transitions.length} 条 transition（下限 20）：声明解析或文件读取可能写坏`);
  });
  
  test('M2 时长白名单：产品 CSS 只允许 var(--motion-*) / 0s，裸值逐条登记（About 全文件登记）', () => {
    const hits = [];
    for (const d of MOTION_DECLS) {
      const noVar = d.body.replace(/var\([^)]*\)/g, '');
      const times = [...noVar.matchAll(/(?:^|[\s,])(\d*\.?\d+)(ms|s)\b/g)].map((m) => m[0].trim());
      if (times.length === 0) continue;
      const bare = times.filter((t) => t !== '0s' && t !== '0ms');
      if (bare.length === 0) continue;
      hits.push({ ...d, times: bare });
    }
    assert.ok(hits.length > 0, 'M2 非空转失败：没有解析到任何裸时长（正则可能写坏，守卫会恒绿）');
  
    const unmatched = hits.filter((h) => !BARE_DURATION_EXCEPTIONS.some(
      (e) => e.file === h.file && h.text === norm(e.decl)));
    assert.deepEqual(unmatched.map((h) => `${h.file}:${h.line} ${h.text}`), [],
      `transition/animation 时长必须走 var(--motion-*)（只允许 0s）；以下裸值未登记：\n  ${unmatched.map((h) => `${h.file}:${h.line} ${h.text}`).join('\n  ')}`);
  
    // 防僵尸：白名单条目必须仍真实命中
    const zombies = BARE_DURATION_EXCEPTIONS.filter(
      (e) => !hits.some((h) => h.file === e.file && h.text === norm(e.decl)));
    assert.deepEqual(zombies.map((e) => `${e.file} ${e.decl}（${e.reason}）`), [],
      `M2 白名单存在僵尸条目（裸值已迁移，请删除）：\n  ${zombies.map((e) => `${e.file} ${e.decl}（${e.reason}）`).join('\n  ')}`);
  
    // About 冻结件整文件登记：仍存在裸值（含 0.9–1s 叙事长时长），但不得出现在产品 CSS。
    const aboutHits = motionDecls(ABOUT_CSS);
    const aboutBare = aboutHits.filter((d) => /(?:\d*\.?\d+)(?:ms|s)\b/.test(d.body.replace(/var\([^)]*\)/g, '')));
    assert.ok(aboutBare.length > 0,
      `${ABOUT_CSS} 登记项已失效（未解析到裸时长）：${ABOUT_EXCEPTION}`);
    console.log(`[motion-guard] About 冻结件登记：${aboutBare.length} 条裸时长（只登记不改）`);
  });
  
  test('M3 属性白名单：不得过渡 all / 布局属性；例外逐条登记', () => {
    const violations = [];
    const seen = new Set();
    for (const rel of PRODUCT_CSS) {
      const lines = strip(read(rel)).split('\n');
      lines.forEach((line, idx) => {
        const m = TRANSITION_PROP_RE.exec(line);
        if (!m) return;
        const parts = m[1].split(',').map((p) => p.trim()).filter(Boolean);
        for (const part of parts) {
          if (part === 'none') continue;
          const prop = part.split(/\s+/)[0];
          seen.add(prop);
          if (FORBIDDEN_PROPERTIES.has(prop)) {
            violations.push(`${rel}:${idx + 1} 禁止过渡布局属性 ${prop}（${norm(line)}）`);
            continue;
          }
          if (!SAFE_PROPERTIES.has(prop) && !PROPERTY_EXCEPTIONS.has(prop)) {
            violations.push(`${rel}:${idx + 1} 未登记过渡属性 ${prop}（${norm(line)}）`);
          }
        }
      });
    }
    assert.ok(seen.size >= 5, `只解析到 ${seen.size} 种过渡属性（下限 5）：解析面写坏`);
    assert.deepEqual(violations, [], `transition 属性不合规：\n  ${violations.join('\n  ')}`);
    console.log(`[motion-guard] 过渡属性：${[...seen].sort().join(' / ')}`);
  });
  
  test('M4 三档令牌齐备且落在档内', () => {
    const val = (name) => {
      const m = new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(CSS);
      return m ? m[1].trim() : '';
    };
    const ms = (s) => {
      const m = /(\d*\.?\d+)\s*ms/.exec(s);
      return m ? Number(m[1]) : NaN;
    };
    // 三档：反馈 80–120 / 进入退出 160–240 / 强调 240–320
    const feedback = ms(val('--motion-feedback'));
    const enter = ms(val('--motion-enter'));
    const exit = ms(val('--motion-exit'));
    const emphasis = ms(val('--motion-emphasis'));
    assert.ok(feedback >= 80 && feedback <= 120, `--motion-feedback 必须在 80–120ms（实际 ${feedback}）`);
    assert.ok(enter >= 160 && enter <= 240, `--motion-enter 必须在 160–240ms（实际 ${enter}）`);
    assert.ok(exit >= 160 && exit <= 240, `--motion-exit 必须在 160–240ms（实际 ${exit}）`);
    assert.ok(emphasis >= 240 && emphasis <= 320, `--motion-emphasis 必须在 240–320ms（实际 ${emphasis}）`);
    // 兼容别名仍必须存在（消费方不断链）
    for (const name of ['--motion-fast', '--motion-base', '--motion-slow']) {
      assert.match(CSS, new RegExp(`${name}\\s*:\\s*[^;]+;`), `styles.css 缺兼容别名 ${name}`);
    }
    for (const name of ['--ease-standard', '--ease-enter']) {
      assert.match(CSS, new RegExp(`${name}\\s*:\\s*[^;]+;`), `styles.css 缺动效曲线令牌 ${name}`);
    }
  });
  
  test('M5 reduced-motion：兜底块把 transition-delay / animation-delay 归零', () => {
    const block = blockAfter(CSS, '@media (prefers-reduced-motion: reduce)');
    assert.ok(block, 'styles.css 缺少 @media (prefers-reduced-motion: reduce) 兜底块');
    assert.match(block, /transition-delay:\s*0s\s*!important\s*;/, 'reduced-motion 兜底缺 transition-delay: 0s !important');
    assert.match(block, /animation-delay:\s*0s\s*!important\s*;/, 'reduced-motion 兜底缺 animation-delay: 0s !important');
    assert.match(block, /transition-duration:\s*0\.01ms\s*!important\s*;/, 'reduced-motion 兜底缺 transition-duration 压缩');
    assert.match(block, /animation-duration:\s*0\.01ms\s*!important\s*;/, 'reduced-motion 兜底缺 animation-duration 压缩');
  });
  
  test('M6 可复用类：入场 / 折叠 / 按压三件套存在；scale 类已删除', () => {
    for (const cls of ['.motion-enter', '.motion-collapse', '.motion-press']) {
      const body = ruleBody(CSS, cls) || ruleBody(CSS, `${cls}:active`);
      assert.ok(body, `styles.css 缺少可复用动效类 ${cls}`);
    }
    const collapse = ruleBody(CSS, '.motion-collapse');
    assert.match(collapse, /grid-template-rows\s*:/, '.motion-collapse 必须用 grid-template-rows 做高度折叠（不得过渡 height）');
    assert.match(CSS, /\.motion-collapse\.is-open\s*\{[^}]*grid-template-rows:\s*1fr/,
      '.motion-collapse 缺 is-open 态（grid-template-rows: 1fr）');
    assert.match(ruleBody(CSS, '.motion-enter'), /transition:\s*opacity var\(--motion-enter\)[^;]*transform/,
      '.motion-enter 必须同时过渡 opacity 与 transform，并使用 --motion-enter');
    // P10 反例：`scale()` 类缩放属「太 fancy」，零消费方，已删除。
    assert.doesNotMatch(CSS, /\.motion-scale-in\s*\{/, '不得恢复 .motion-scale-in（scale 类过渡属「太 fancy」）');
    assert.doesNotMatch(CSS, /@keyframes\s+motionScaleIn/, '不得恢复 motionScaleIn 关键帧');
  });
  
  test('M7 反例：产品 CSS 的 keyframes 不得出现 rotateX / clip-path / 等比 scale()', () => {
    const violations = [];
    for (const rel of PRODUCT_CSS) {
      for (const body of keyframeBodies(strip(read(rel)))) {
        if (/rotateX\s*\(/.test(body)) violations.push(`${rel} keyframes 含 rotateX()`);
        if (/clip-path\s*:/.test(body)) violations.push(`${rel} keyframes 含 clip-path`);
        // scaleX / scaleY 是进度条 / 方向位移的合法用法；只有等比 scale() 判红。
        if (/(?<!scaleX)(?<!scaleY)(?<!scale3d)\bscale\s*\(/.test(body)) violations.push(`${rel} keyframes 含等比 scale()`);
      }
    }
    assert.deepEqual(violations, [], `「太 fancy」手法回流：\n  ${violations.join('\n  ')}`);
  });
  
  test('M8 JS 内联：不得写裸毫秒 transition/animation（about-entry.js 冻结登记）', () => {
    const violations = [];
    const BARE_JS_DECL = /(?:transition|animation)(?:-duration)?\s*(?::|=)\s*(['"`])(?:(?!\1).)*?\d*\.?\d+(?:ms|s)\b/;
    let aboutCount = 0;
    for (const rel of JS_FILES) {
      const src = read(rel);
      if (rel.endsWith('about-entry.js')) {
        aboutCount += (src.match(BARE_JS_DECL) || []).length;
        continue;
      }
      src.split('\n').forEach((line, idx) => {
        const code = line.replace(/^\s*(\/\/|\*|\/\*).*/, '');
        if (BARE_JS_DECL.test(code)) violations.push(`${rel}:${idx + 1} ${norm(line)}`);
      });
    }
    assert.deepEqual(violations, [], `JS 内联动效仍写裸毫秒（应走 var(--motion-*)）：\n  ${violations.join('\n  ')}`);
    console.log(`[motion-guard] About 冻结件 JS 登记：${aboutCount} 处`);
  });
  
  test('M9 滚动：禁止裸 behavior:\'smooth\'，必须走 smoothScroll()（about-entry.js 冻结登记）', () => {
    const SMOOTH = /behavior\s*:\s*['"]smooth['"]/;
    const violations = [];
    let aboutCount = 0;
    for (const rel of JS_FILES) {
      const lines = read(rel).split('\n');
      lines.forEach((line, idx) => {
        const code = line.replace(/^\s*(\/\/|\*|\/\*).*/, '');
        if (!SMOOTH.test(code)) return;
        if (rel.endsWith('about-entry.js')) { aboutCount += 1; return; }
        violations.push(`${rel}:${idx + 1} ${norm(line)}`);
      });
    }
    assert.deepEqual(violations, [], `禁止裸 behavior:'smooth'（改调 core/base/utils.js::smoothScroll）：\n  ${violations.join('\n  ')}`);
    assert.ok(aboutCount > 0, 'About 冻结件登记失效：未解析到 behavior:\'smooth\'');
    assert.match(read('docs/src/core/base/utils.js'), /export function smoothScroll\(/,
      'core/base/utils.js 缺 smoothScroll() helper');
  });
  
  test('M10 滚动出口唯一：除 helper / about-entry 外不得直调 scrollIntoView/scrollTo/scrollBy', () => {
    const CALL = /\.(scrollIntoView|scrollTo|scrollBy)\s*\(/;
    const violations = [];
    for (const rel of JS_FILES) {
      if (rel.endsWith('about-entry.js') || rel.endsWith('core/base/utils.js')) continue;
      read(rel).split('\n').forEach((line, idx) => {
        const code = line.replace(/^\s*(\/\/|\*|\/\*).*/, '');
        if (!CALL.test(code)) return;
        violations.push(`${rel}:${idx + 1} ${norm(line)}`);
      });
    }
    assert.deepEqual(violations, [], `滚动调用必须收口到 smoothScroll()：\n  ${violations.join('\n  ')}`);
  });

})();

// ═══ 源件 13：ui-motion-guard.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // ui-motion-guard.test.mjs — 卡片悬停动效 ＋ transition-all 收敛守卫（2026-10-22 · 第九轮 Task 6）
  //
  // 来源：9B 视觉与可访问 P2 两条——
  //   ① 卡片悬停**不得**上浮 / 加阴影（`hover:shadow-*` / `hover:-translate-y-*`）：
  //      阴影与位移会让列表行看起来像按钮，且过渡阴影/几何属性会触发布局与重绘；
  //      可点卡的反馈只保留 `border-color` / `background` 变化（`DESIGN_SYSTEM §4.2`）。
  //   ② `transition-all` 收敛为显式属性（`transition-colors` / `transition-[filter]` /
  //      `transition-[border-color,background-color]`）：`all` 会把宽高、阴影一并过渡，
  //      列表悬停时出现「整卡抽动」。全仓 27 处已逐一改为显式属性。
  //
  // 判据（棘轮：只降不升）：
  //   M1 `docs/**` 的 .js / .html 中 `hover:shadow-*` / `hover:-translate-*` 计数 ≤ 0；
  //   M2 `docs/**` 中 `transition-all` 计数 ≤ 0；
  //   M3 非空转：扫描面确实覆盖到页面源码，且显式过渡类仍大量存在（防正则写坏后恒绿）。
  //
  // 边界（2026-10-28 Task 4）：卡内箭头 2px 位移属合法反馈——它作用在 `.metric-band__jump` 子元素、
  //   由 `.card--interactive` 的 `--card-jump-shift` 驱动，整卡不位移、不加阴影；M1/M2 判据不变。
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync, readdirSync } = await import('node:fs');
  const { join, relative } = await import('node:path');
  const ROOT = join(import.meta.dirname, '..', '..');
  const DOCS = join(ROOT, 'docs');
  /** 第三方 vendor 与二进制资源不属页面源码，不参与统计 */
  const SKIP_DIRS = new Set(['vendor', 'fonts', 'images']);
  
  /** 递归收集 docs 下的 .js / .html（跳过 assets/vendor、assets/fonts、assets/images） */
  function walk(dir, out = []) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) continue;
        walk(p, out);
        continue;
      }
      if (e.name.endsWith('.js') || e.name.endsWith('.html')) out.push(p);
    }
    return out;
  }
  
  const FILES = walk(DOCS);
  
  /** 收集命中行（相对路径:行号），供台账打印 */
  function hits(re) {
    const found = [];
    for (const f of FILES) {
      const src = readFileSync(f, 'utf8');
      src.split('\n').forEach((line, idx) => {
        if (re.test(line)) {
          found.push(`${relative(ROOT, f).replace(/\\/g, '/')}:${idx + 1} ${line.trim().slice(0, 110)}`);
        }
      });
    }
    return found;
  }
  
  /** M1 棘轮基线：2026-10-22 Task 6 收敛后实测 0（只许降，不许升） */
  const HOVER_ELEVATION_BASELINE = 0;
  /** M2 棘轮基线：2026-10-22 Task 6 收敛后实测 0（原 27 处已全部改为显式属性） */
  const TRANSITION_ALL_BASELINE = 0;
  
  test('M1 卡片悬停不得上浮 / 加阴影：hover:shadow-* 与 hover:-translate-* 为零', () => {
    const found = hits(/hover:shadow-|hover:-translate-[xy]-/);
    console.log(`[ui-motion-guard] 卡片悬停阴影 / 上浮共 ${found.length} 处（棘轮上限 ${HOVER_ELEVATION_BASELINE}）：\n${found.join('\n')}`);
    assert.ok(
      found.length <= HOVER_ELEVATION_BASELINE,
      `卡片悬停阴影 / 上浮由 ${HOVER_ELEVATION_BASELINE} 升到 ${found.length} 处 ⇒ 可点卡只保留 border-color / background 变化：\n  ${found.join('\n  ')}`,
    );
  });
  
  test('M2 transition-all 只降不升（列表悬停不得过渡宽高 / 阴影）', () => {
    const found = hits(/transition-all/);
    console.log(`[ui-motion-guard] transition-all 共 ${found.length} 处（棘轮上限 ${TRANSITION_ALL_BASELINE}）：\n${found.join('\n')}`);
    assert.ok(
      found.length <= TRANSITION_ALL_BASELINE,
      `transition-all 由 ${TRANSITION_ALL_BASELINE} 升到 ${found.length} 处 ⇒ 改用 transition-colors / transition-[filter] / transition-[border-color,background-color]：\n  ${found.join('\n  ')}`,
    );
  });
  
  test('M3 非空转：扫描面覆盖页面源码，且显式过渡类仍存在', () => {
    assert.ok(FILES.length >= 150, `只扫描到 ${FILES.length} 个页面源码文件（下限 150）：遍历面被写坏`);
    const explicit = FILES.reduce((n, f) => n + (readFileSync(f, 'utf8').match(/transition-(colors|\[)/g) || []).length, 0);
    assert.ok(explicit >= 20, `显式过渡类只统计到 ${explicit} 处（下限 20）：正则失配会导致守卫恒绿`);
  });

})();

// ═══ 源件 14：dead-selector-guard.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // dead-selector-guard.test.mjs — 「零引用 CSS 类」存量回归防线（2026-09-28 死码清理批）
  //
  // 病灶（CSS 审计实测）：`docs/src/styles.css` 长期背着**成片零引用类**——同一批组件（`.role-card` 整族、
  //   `.timeline-node` / `.tl-*`、`.card-flat`、`.btn-primary` / `.btn-secondary`、`.status-pill` / `.status-dot`、
  //   真·值类 `.text-h1`…`.text-overline`、`.tint-dot`、`.theme-btn` / `.font-size-btn` …）早已无任何页面 /
  //   脚本引用，却仍在 CSS 里（有的还被 `DESIGN_SYSTEM.md` 当「规范词汇」写着）⇒ 改色 / 减负改不干净，
  //   且**没有守卫**，只能靠人记得 ⇒ 存量只会继续长。
  //
  // 本批（2026-09-28）：把审计查出的**零引用类**删除（`styles.css` 65 类 · `about.css` 3 类），并把
  //   `DESIGN_SYSTEM.md` 里当「规范词汇」写的句子同步标「已废止」；`person-picker.css` 的 `inline-full`
  //   虽同样零引用，但该文件**不在本批授权改动面** ⇒ 只登记进 `DEAD_SELECTOR_BASELINE`（待后续批次处置）；
  //   同批立本**回归防线**：
  //   Z1 新增死类：扫描到「零引用且不在台账 / 不在动态白名单」的类 ⇒ 红
  //   Z2 僵尸登记：台账 / 白名单里的类若**已不在 CSS** ⇒ 红（收基线纪律：台账只减不增）
  //   Z3 非空转自检：① 抽取口径合成正 / 负样本；② 分类对表（白名单每条须**仍是零引用**、理由 ≥20 字）；
  //                  ③ 规模下限（防扫描面被削 / 台账被删空）；④ 抽取器「取选择器、不取声明值」负例
  //   Z4 缩减进度（只报不判）：类选择器 / 零引用 / 台账 / 白名单当前计数
  //
  // 口径边界（**不得**自行放宽或加严）：
  //   · 类选择器抽取＝**只取 `{…}` 之前的 prelude（选择器）**，不取声明值（`url(x.png)` 的 `png`、
  //     `content:".b"` 的 `b` 都不得被当类）——见 Z3 负例。
  //   · 引用比对＝`docs/**/*.{js,html}` 全文做**词边界命中**（`(?<![A-Za-z0-9_-])类名(?![A-Za-z0-9_-])`）。
  //     用词边界而非裸子串：裸子串会把 `ab-tl-dot`（活类）误当 `tl-dot`（死类）的引用而漏判。
  //   · **词边界判不了「动态拼接」**（`` `ab-edge--${e.type}` `` / `'ab-flow-line--' + f.type`）：一律进
  //     `DYNAMIC_SELECTOR_WHITELIST`（`style-baseline.mjs`，人工逐条登记生成处）。守卫**不自动推断**，
  //     也不因白名单而放宽其它类的判红。
  //
  // 收基线纪律：删零引用类后**同一批**更新 `style-baseline.mjs`（删台账条目）——进度自动前进；
  //   **不得**为变绿补条目。
  // 运行：node --test server/test/dead-selector-guard.test.mjs
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readdirSync, readFileSync, existsSync } = await import('node:fs');
  const { join, relative, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const { DEAD_SELECTOR_BASELINE, DYNAMIC_SELECTOR_WHITELIST, DEAD_SELECTOR_CSS_FILE_BASELINE, DEAD_SELECTOR_CLASS_BASELINE, DEAD_SELECTOR_CORPUS_FILE_BASELINE, } = await import('./style-baseline.mjs');
  const HERE = dirname(fileURLToPath(import.meta.url));
  const ROOT = join(HERE, '..', '..');
  const DOCS = join(ROOT, 'docs');
  
  const SKIP_DIRS = ['vendor'];
  /** 引用比对面后缀 */
  const CORPUS_EXTS = ['.js', '.html'];
  /** 类名 token（含转义：`.text-\[11px\]`） */
  const CLASS_TOKEN_RE = /\.((?:\\.|[A-Za-z0-9_-])+)/g;
  
  /**
   * 抽取 CSS 文本里的**类选择器**（单一源口径）。
   * 做法＝逐字符扫，字符串 / 注释内不计；**只在遇到 `{` 时**把「自上一个 `{` / `}` 起累积的 prelude」当选择器
   * 解析类 token ⇒ 声明值（`url(x.png)` / `content:"…"`）永不进入解析面。
   * 返回去重后的类名数组（已去转义反斜杠）。
   */
  function classesOf(css) {
    const out = new Set();
    let buf = '';
    let inComment = false;
    let inStr = null;
    for (let i = 0; i < css.length; i++) {
      const ch = css[i];
      const nx = css[i + 1];
      if (inComment) {
        if (ch === '*' && nx === '/') { inComment = false; i++; }
        continue;
      }
      if (inStr) {
        if (ch === '\\') { i++; continue; }
        if (ch === inStr) inStr = null;
        continue;
      }
      if (ch === '/' && nx === '*') { inComment = true; i++; continue; }
      if (ch === '"' || ch === "'") { inStr = ch; continue; }
      if (ch === '{' || ch === '}') {
        if (ch === '{') {
          for (const m of buf.matchAll(new RegExp(CLASS_TOKEN_RE.source, 'g'))) {
            out.add(m[1].replace(/\\/g, ''));
          }
        }
        buf = '';
        continue;
      }
      buf += ch;
    }
    return [...out];
  }
  
  /** 引用命中判据（单一源）：词边界；导出便于非空转自检 */
  function isReferenced(name, text) {
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?<![A-Za-z0-9_-])${esc}(?![A-Za-z0-9_-])`).test(text);
  }
  
  /** 判红核心（纯函数，便于合成样本自检）：返回「零引用且不在台账 / 白名单」的类名 */
  function findNewDeadClasses(classes, corpusText, baselineNames, whitelistNames) {
    const allowed = new Set([...(baselineNames || []), ...(whitelistNames || [])]);
    return classes.filter((c) => !allowed.has(c) && !isReferenced(c, corpusText));
  }
  
  /** 递归收集（相对仓库根的 posix 路径） */
  function walk(dir, exts) {
    const out = [];
    const rec = (d) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        if (e.name === '.git' || SKIP_DIRS.includes(e.name)) continue;
        const p = join(d, e.name);
        if (e.isDirectory()) rec(p);
        else if (exts.some((x) => e.name.endsWith(x))) out.push(relative(ROOT, p).replace(/\\/g, '/'));
      }
    };
    rec(dir);
    return out.sort();
  }
  
  /** CSS 源清单：`docs` 下全部 `.css`（排除 vendor）＋ `docs` 下 `.html` 的页内 `<style>` */
  function cssSources() {
    const out = [];
    for (const f of walk(DOCS, ['.css'])) {
      out.push({ file: f, css: readFileSync(join(ROOT, f), 'utf8') });
    }
    for (const f of walk(DOCS, ['.html'])) {
      const text = readFileSync(join(ROOT, f), 'utf8');
      let i = 0;
      for (const m of text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
        out.push({ file: `${f}#style${i++}`, css: m[1] });
      }
    }
    return out;
  }
  
  /** 引用比对面：`docs` 下全部 `.js` 与 `.html` 的全量文本（拼接为单一字符串，便于逐类比对） */
  function corpus() {
    const files = walk(DOCS, CORPUS_EXTS);
    const text = files.map((f) => readFileSync(join(ROOT, f), 'utf8')).join('\n');
    return { files, text };
  }
  
  /** 全站类选择器 → 定义处（去重） */
  function allClasses() {
    const map = new Map();
    for (const s of cssSources()) {
      for (const c of classesOf(s.css)) {
        if (!map.has(c)) map.set(c, []);
        map.get(c).push(s.file);
      }
    }
    return map;
  }
  
  const baselineNames = () => DEAD_SELECTOR_BASELINE.map((e) => (typeof e === 'string' ? e : e.name));
  const whitelistNames = () => DYNAMIC_SELECTOR_WHITELIST.map((e) => e.name);
  
  // ── Z1 新增死类 ──────────────────────────────────────────────────────
  test('Z1 零引用类回归：现状之外出现「零引用且不在台账 / 动态白名单」的类 ⇒ 判红', () => {
    const { text } = corpus();
    const offenders = findNewDeadClasses([...allClasses().keys()], text, baselineNames(), whitelistNames());
    assert.deepEqual(offenders, [],
      `出现新的零引用 CSS 类（无任何 docs/**/*.{js,html} 引用；死码应删，动态拼接者应登记进 DYNAMIC_SELECTOR_WHITELIST）：\n  ${offenders.join('\n  ')}`);
  });
  
  // ── Z2 僵尸登记 ──────────────────────────────────────────────────────
  test('Z2 僵尸登记：台账 / 白名单里的类若已不存在于 CSS ⇒ 判红（台账只减不增）', () => {
    const present = allClasses();
    const goneBase = baselineNames().filter((n) => !present.has(n));
    const goneWhite = whitelistNames().filter((n) => !present.has(n));
    assert.deepEqual([...goneBase, ...goneWhite], [],
      `台账 / 白名单条目指向「已不存在的类」（应从 style-baseline.mjs 删该条 · 收基线）：\n  ${[...goneBase, ...goneWhite].join('\n  ')}`);
  });
  
  // ── Z3 非空转自检 ────────────────────────────────────────────────────
  test('Z3 非空转：抽取口径正 / 负例 ＋ 分类对表 ＋ 规模下限 ＋ 台账 / 白名单自洽', () => {
    // ① 抽取口径正例：多选择器 / 伪类 / 组合 / 媒体段 prelude / 转义类名
    assert.deepEqual(classesOf('.a, .b:hover { color: red } .c .d { x: 1 }').sort(), ['a', 'b', 'c', 'd'],
      '抽取口径失效：选择器里的类未被全部抽出（守卫会恒真）');
    assert.deepEqual(classesOf('@media (max-width: 768px) { .e { x: 1 } }'), ['e'],
      '抽取口径失效：@media 段内的类未抽出');
    assert.deepEqual(classesOf('.text-\\[11px\\] { font-size: 11px }'), ['text-[11px]'],
      '抽取口径失效：转义类名（.text-\\[11px\\]）未抽出');
    // ① 负例：声明值不得被当类（`url(x.png)` 的 png / `content:".b"` 的 b）；注释内类不得命中
    assert.deepEqual(classesOf('.a { background: url(x.png); content: ".b"; }'), ['a'],
      '抽取口径过宽：声明值（url 内 / 字符串内）被当成类选择器');
    assert.deepEqual(classesOf('/* .ghost { } */ .real { x: 1 }'), ['real'],
      '抽取口径过宽：注释里的类被抽出');
    // ① 引用判据正 / 负例：词边界（`ab-tl-dot` 不得当成 `tl-dot` 的引用）
    assert.equal(isReferenced('tl-dot', '<span class="tl-dot">'), true, '引用判据失效：正常的类引用未命中');
    assert.equal(isReferenced('tl-dot', '<span class="ab-tl-dot">'), false,
      '引用判据过宽：`ab-tl-dot` 被当成 `tl-dot` 的引用（应漏判死码）');
    // ② 判红核心：合成样本——新增死类判红、白名单内不判红、有引用不判红
    assert.deepEqual(findNewDeadClasses(['dead-1'], 'no refs here', [], []), ['dead-1'],
      '判红核心失效：零引用类未被判红');
    assert.deepEqual(findNewDeadClasses(['dead-1'], 'no refs here', ['dead-1'], []), [],
      '判红核心过宽：台账内的类被误判红');
    assert.deepEqual(findNewDeadClasses(['dyn-1'], 'no refs here', [], ['dyn-1']), [],
      '判红核心过宽：动态白名单内的类被误判红');
    assert.deepEqual(findNewDeadClasses(['used-1'], 'x used-1 y', [], []), [],
      '判红核心失效：有引用的类被误判红');
    // ③ 规模下限（防扫描面被削 / 抽取口径失效）
    const sources = cssSources();
    const present = allClasses();
    const { files } = corpus();
    assert.ok(sources.length >= DEAD_SELECTOR_CSS_FILE_BASELINE,
      `CSS 源数过少（实测 ${sources.length}，下限 ${DEAD_SELECTOR_CSS_FILE_BASELINE}）——Z1 可能因扫描面被削而恒绿`);
    assert.ok(present.size >= DEAD_SELECTOR_CLASS_BASELINE,
      `类选择器过少（实测 ${present.size}，下限 ${DEAD_SELECTOR_CLASS_BASELINE}）——抽取口径可能失效`);
    assert.ok(files.length >= DEAD_SELECTOR_CORPUS_FILE_BASELINE,
      `引用比对面文件过少（实测 ${files.length}，下限 ${DEAD_SELECTOR_CORPUS_FILE_BASELINE}）`);
    // ③ 分类对表（白名单条目须「仍是零引用」＋「理由 ≥20 字」；否则是误登记 / 空转）
    const { text } = corpus();
    for (const e of DYNAMIC_SELECTOR_WHITELIST) {
      assert.ok(e.name && typeof e.name === 'string', `白名单条目缺 name：${JSON.stringify(e)}`);
      assert.ok(e.reason && e.reason.length >= 20, `白名单条目缺理由（≥20 字）：${e.name}`);
      assert.equal(isReferenced(e.name, text), false,
        `白名单条目 ${e.name} 已能字面命中 ⇒ 不再是「动态拼接」，应删该条（僵尸登记）`);
    }
    // ③ 台账条目自洽（结构；本批台账为空亦须满足）
    for (const e of DEAD_SELECTOR_BASELINE) {
      const name = typeof e === 'string' ? e : e.name;
      assert.ok(name, `台账条目缺 name：${JSON.stringify(e)}`);
    }
    assert.equal(new Set(baselineNames()).size, baselineNames().length, '台账有名重复条目');
    assert.equal(new Set(whitelistNames()).size, whitelistNames().length, '白名单有名重复条目');
  });
  
  // ── Z4 缩减进度（只报不判） ──────────────────────────────────────────
  test('Z4 缩减进度：类选择器 / 零引用 / 台账 / 白名单当前计数', () => {
    const present = allClasses();
    const { text } = corpus();
    const zero = [...present.keys()].filter((c) => !isReferenced(c, text));
    console.log(`[零引用 CSS 类] 类选择器 ${present.size} 个 · 零引用 ${zero.length} 个（台账 ${baselineNames().length} ＋ 动态白名单 ${whitelistNames().length}）`);
    console.log(`[台账（允许存在的零引用类）] ${baselineNames().join(' · ') || '（空）'}`);
    console.log(`[动态白名单] ${whitelistNames().join(' · ') || '（空）'}`);
    console.log(`[不判红的零引用] ${zero.filter((c) => whitelistNames().includes(c)).join(' · ') || '（无）'}`);
    console.log('[收基线提示] 删零引用类后同批删 style-baseline.mjs 的 DEAD_SELECTOR_BASELINE 条目；不得为变绿补条目。');
  });

})();

// ═══ 源件 15：card-consistency-guard.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // server/test/card-consistency-guard.test.mjs — 卡厚度与卡头字重（2026-11-20 批次 581）
  //
  // 判据（`DS_03 §4.2 / §4.21.2`，2026-11-20 改准）：
  //   ① 卡内边距只允许 `.card-standard`（16）/ `.card-compact`（12）；`p-5` / `p-6` / `p-8` 不得直接挂在 `.card` 上；
  //   ② 卡头只从 `page-frame.js::renderCardHeader` 出：`docs/src` 不得再手写页面级 / 面板级卡头 `<h3>`；
  //      `docs/search.html` 为静态页（无模块装配），单列白名单；
  //   ③ `.card-standard` / `.card-compact` 两个出口必须在 `styles.css` 定义（防止只改调用点、出口消失）。
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readdirSync, statSync, readFileSync } = await import('node:fs');
  const { join, relative } = await import('node:path');
  const ROOT = join(import.meta.dirname, '..', '..');
  const DOCS = join(ROOT, 'docs');
  
  function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name === '.git') continue;
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full, out);
      else if (/\.(js|html)$/.test(name)) out.push(full);
    }
    return out;
  }
  
  const files = walk(DOCS);
  const rel = (f) => relative(ROOT, f).replace(/\\/g, '/');
  
  test('① 卡内边距只走 card-standard / card-compact，不再直接挂 p-5 / p-6 / p-8', () => {
    const bad = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/class="([^"]*)"/g)) {
        const tokens = m[1].split(/\s+/).filter(Boolean);
        if (!tokens.includes('card')) continue;
        const hit = tokens.find((t) => /^p-(5|6|8)$/.test(t));
        if (hit) bad.push(`${rel(file)} → ${hit}`);
      }
    }
    assert.deepEqual(bad, [], `卡内边距越档（改用 card-standard / card-compact）：\n  ${bad.join('\n  ')}`);
  });
  
  // 静态页无法装配模块（`search.html`）；其余一律走 `renderCardHeader`。
  const STATIC_ALLOW = new Set(['docs/search.html']);
  
  test('② 卡头只从 renderCardHeader 出：不得再手写页面级 / 面板级卡头 H3', () => {
    const bad = [];
    for (const file of files) {
      if (rel(file) === 'docs/src/components/shell/page-frame.js') continue;
      if (STATIC_ALLOW.has(rel(file))) continue;
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/<h3 class="([^"]*)"/g)) {
        const cls = m[1];
        if (!/(text-base|text-sm)/.test(cls) || !/font-semibold/.test(cls)) continue;
        bad.push(`${rel(file)} → ${cls}`);
      }
    }
    assert.deepEqual(bad, [], `手写卡头仍未迁移到 renderCardHeader（页面级 / variant:'panel'）：\n  ${bad.join('\n  ')}`);
  });
  
  test('③ 两个卡厚度出口必须在 styles.css 定义', () => {
    const css = readFileSync(join(ROOT, 'docs', 'src', 'styles.css'), 'utf8');
    assert.match(css, /\.card-standard\s*\{[^}]*padding:\s*var\(--space-4\)/, '.card-standard 必须定义 padding: var(--space-4)');
    assert.match(css, /\.card-compact\s*\{[^}]*padding:\s*var\(--space-3\)/, '.card-compact 必须定义 padding: var(--space-3)');
  });

})();
