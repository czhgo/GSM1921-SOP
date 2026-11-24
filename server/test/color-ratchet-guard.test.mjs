// role: [工程师]+[AI]
// color-ratchet-guard.test.mjs — 守卫归并件（2026-11-22 批次 600 · D-910）
// 归并来源：hex-hardcode-guard.test.mjs · theme-palette-guard.test.mjs · status-color-guard.test.mjs · status-palette-text-guard.test.mjs · link-color-guard.test.mjs · ui-contrast-guard.test.mjs · ui-color-semantics.test.mjs · icon-color-guard.test.mjs · theme-pref.test.mjs · ui-primary-cta-color.test.mjs
// 纪律：只减文件数、不减断言数；每个源件包在独立 async 块作用域里（imports 转动态导入），
//   同名 helper / 常量互不冲突；失败信息保留各源件的横幅与断言名，便于定位。

// ═══ 源件 1：hex-hardcode-guard.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // hex-hardcode-guard.test.mjs — 「硬编码 hex」存量回归防线（2026-09-24 美学存量清理批）
  //
  // 病灶（美学审查实测）：全站硬编码 hex **2025 处 / 168 个不同值 / 93 个文件**——同一批语义色被反复写死，
  //   将来改色（或深色模式对齐）时改不干净。§2.8 早已定「四层分类取色、新增代码禁止硬编码色值」，
  //   但**没有任何守卫**——只能靠人记得 ⇒ 存量只会继续长。
  //
  // 本批**不做**「删存量 hex」（那是另一件事，须逐层改成 var(--*) / 语义类），只立**回归防线**：
  //   H1 逐文件 × 值：扫描到基线之外的 (文件, 值) ⇒ 红（= 「现状之外出现新的 hex」）
  //   H2 逐文件处数 ratchet：某文件处数 > 基线 ⇒ 红（把已允许的值再复制一份也算新增）
  //   H3 非空转自检：① 抽取口径在合成正/负样本上必须命中/不命中（防正则失效恒真）；
  //                  ② 基线规模下限（防台账被删减）；③ 僵尸登记（基线文件不存在 / 该文件已无 hex）⇒ 红
  //   H4 缩减进度：打印当前处数 / 值 / 文件数与基线对照（只报不判）
  //
  // 例外台账（逐条给理由，见 EXCEPTIONS）：`docs/help.html`（文档页自带 `doc-*` 调色板）·
  //   `docs/src/about.css`（关于页文档页自带 `--ab-*` 暖纸色板）；第三方片段 `docs/assets/vendor/**`
  //   在扫描范围外（gsap / ScrollTrigger / lenis 构建产物）。
  //
  // 收基线纪律：删存量 hex 后**同一批**更新 style-baseline.mjs（删该值 / 减 c）——进度自动前进；
  //   **不得**为变绿而把新值补进基线。
  // 运行：node --test server/test/hex-hardcode-guard.test.mjs
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readdirSync, readFileSync, existsSync } = await import('node:fs');
  const { join, relative, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const { HEX_BASELINE, HEX_TOTAL_BASELINE, HEX_FILE_BASELINE, HEX_VALUE_BASELINE, HEX_MOVE_LEDGER, } = await import('./style-baseline.mjs');
  const { ACCENT_COLORS } = await import('../../docs/src/core/domain/constants.js?v=20261120a');
  const HERE = dirname(fileURLToPath(import.meta.url));
  const ROOT = join(HERE, '..', '..');
  const DOCS = join(ROOT, 'docs');
  
  /** 扫描后缀（前端应用层 + 样式 + 根页 HTML） */
  const EXTS = ['.js', '.mjs', '.css', '.html'];
  /** 扫描范围外的目录（第三方构建产物） */
  const SKIP_DIRS = ['vendor'];
  /**
   * 抽取口径（单一源，与 style-baseline.mjs 生成时同一条）：
   * `#` + 3/4/6/8 位十六进制（CSS 颜色合法长度）+ 右侧词边界；
   * 前置否定 `(?<!&)` 排除 HTML 实体（`&#10003;` 是 ✓，不是色值）。
   */
  const HEX_RE = /(?<!&)#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/g;
  
  /** 例外台账：逐条给理由（allowNew = 该文件不参与「新增即红」，仍计入缩减进度） */
  const EXCEPTIONS = [
    {
      file: 'docs/help.html',
      allowNew: false,
      reason: '帮助页＝文档页（DESIGN_SYSTEM §4.18.1 明确 help.html/about.html 是文档页），页内自带 `<style>` 文档样式体系与内联 style。2026-11-03 批次 533（B-522-2）已把可令牌化的 365 处改为 `var(--*)`（532 → 167 处）；剩余 167 处为徽标三联/二联、文档页暖纸色、角色色与 3 处渐变，**无全局同名令牌**，不得新造色。故本文件从「只计进度」改为**只减不增**：新增值由 H1 判红、处数上涨由 H2 判红，收基线时同批下调 `style-baseline.mjs::HEX_BASELINE` 的 `c` 与 `v`。',
    },
    {
      file: 'docs/src/about.css',
      allowNew: false,
      reason: '关于页＝文档页（DESIGN_SYSTEM §4.18.1 同条豁免）。该文件自带**作用域隔离**的 `--ab-*` 暖纸印刷色板（`.ab-about{--ab-paper-0:#FAF8F4;…--ab-red:#CE1126;--ab-gold:#C9A227}`，明注「不影响全局/help 页」）——其中与全局 `:root` 等值的少数几处（如 `#CE1126`）**正是它自己的令牌定义**，其余为暖纸 / 墨色专有色与深色态字面量，**无全局同名令牌**（§2.8 口径「不许新造色」⇒ 不可清）。2026-11-04 批次 534（spec unify-ui-signals Task 5.3）：About 是冻结件（`about-freeze-guard` 整文件哈希锁定），内容一字不改；本文件从「只计进度」改为**只减不增**——新增值由 H1 判红、处数上涨由 H2 判红，收基线时同批下调 `style-baseline.mjs::HEX_BASELINE` 的 `c` 与 `v`。',
    },
  ];
  
  /** 递归收集扫描目标（相对仓库根的 posix 路径） */
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
  
  /** `<meta name="theme-color">` 的值必须是字面量（浏览器不解析 `var()`），单列由 H6 校验；
   *   它不是「界面配色硬编码」，故在 H1/H2 口径里先剥离，避免把同一语义色按页面数重复计数。 */
  const THEME_COLOR_META_RE = /<meta\s+name=["']theme-color["'][^>]*>/gi;
  const stripThemeColorMeta = (text) => text.replace(THEME_COLOR_META_RE, '');
  
  /** 逐文件抽取 hex（小写；theme-color 元信息先剥离） */
  function scan() {
    return scanFiles().map((file) => ({
      file,
      hits: stripThemeColorMeta(readFileSync(join(ROOT, file), 'utf8')).match(HEX_RE) || [],
    }));
  }
  
  const isAllowNew = (file) => EXCEPTIONS.some((e) => e.file === file && e.allowNew);
  
  /** hex 值形态（与抽取口径同源；小写） */
  const HEX_VAL_RE = /^#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})$/;
  
  /**
   * 搬移例外台账的**校验器**（纯函数，便于用合成 ctx 做非空转自检）。
   * ctx = { exists(file), valuesOf(file)→去重小写值数组, distinctValues()→全站 distinct 值数, valueCeiling→存量起点 }
   * 返回 problems 数组（空＝合法）。
   */
  function validateMoveLedger(entries, ctx) {
    const problems = [];
    const seen = new Set();
    for (const e of entries) {
      const id = e.id || `${e.from || '?'} → ${(e.to || []).join(' + ') || '?'}`;
      if (seen.has(id)) problems.push(`台账条目重复：${id}`);
      seen.add(id);
      if (!e.from || !Array.isArray(e.to) || !e.to.length) { problems.push(`${id}：缺 from / to`); continue; }
      if (!ctx.exists(e.from)) problems.push(`${id}：from 文件不存在（${e.from}）`);
      for (const t of e.to) if (!ctx.exists(t)) problems.push(`${id}：to 文件不存在（${t}）`);
      if (!e.reason || String(e.reason).length < 20) problems.push(`${id}：缺理由（≥20 字，说明为什么这算搬移）`);
      const values = (e.values || []).map((v) => String(v).toLowerCase());
      const fromValues = (e.fromValues || []).map((v) => String(v).toLowerCase());
      if (!values.length) problems.push(`${id}：values 为空（没有申报搬走的任何值）`);
      if (new Set(values).size !== values.length) problems.push(`${id}：values 有重复`);
      if (new Set(fromValues).size !== fromValues.length) problems.push(`${id}：fromValues 有重复`);
      for (const v of [...values, ...fromValues]) if (!HEX_VAL_RE.test(v)) problems.push(`${id}：非法色值 ${v}（须 3/4/6/8 位小写 hex）`);
      // ② 值集合不得新增：搬走的值必须来自旧文件的值集（不许借搬移加深色）
      const brand = values.filter((v) => !fromValues.includes(v));
      if (brand.length) problems.push(`${id}：搬移值不在 fromValues 里（借搬移加深色）：${brand.join(' ')}`);
      // ① 逐值对照可核（当前源码）：搬入成立、搬出成立
      const toVals = new Set(e.to.flatMap((t) => ctx.valuesOf(t)));
      const fromNow = new Set(ctx.valuesOf(e.from));
      const notIn = values.filter((v) => !toVals.has(v));
      if (notIn.length) problems.push(`${id}：申报的值未出现在 to 文件里（搬入未发生 / 值写错）：${notIn.join(' ')}`);
      const stillIn = values.filter((v) => fromNow.has(v));
      if (stillIn.length) problems.push(`${id}：申报的值仍留在 from 文件里（是复制而非搬移）：${stillIn.join(' ')}`);
      // ③ to 文件里不得出现「既非其原有允许值、也非从 from 搬来」的值（不只是搬家）
      for (const t of e.to) {
        const own = new Set(ctx.baselineValuesOf(t));
        const extra = [...new Set(ctx.valuesOf(t))].filter((v) => !own.has(v) && !fromValues.includes(v));
        if (extra.length) problems.push(`${id}：to 文件 ${t} 含「原有之外且非搬移」的值（不只是搬家）：${extra.join(' ')}`);
      }
    }
    // ③ 总量不得上升（全站 distinct 值数 ≤ 存量起点）
    if (typeof ctx.distinctValues === 'function' && typeof ctx.valueCeiling === 'number'
      && ctx.distinctValues() > ctx.valueCeiling) {
      problems.push(`搬移后全站 distinct 色值数 ${ctx.distinctValues()} > 存量起点 ${ctx.valueCeiling}（总量只能降，不得升）`);
    }
    return problems;
  }
  
  /**
   * 搬移例外（2026-09-25 支书裁定「开搬移例外」）：某文件**被声明为搬入方**时，其 `values` 里点名的值视为
   * 「从别处搬来」而非「新增」⇒ H1 不判红。**只放宽声明点名的 (文件, 值)**，其余一律照旧（见 H5 的逐条机检）。
   */
  const movedInto = (file) => {
    const s = new Set();
    for (const e of HEX_MOVE_LEDGER) if ((e.to || []).includes(file)) (e.values || []).forEach((v) => s.add(String(v).toLowerCase()));
    return s;
  };
  
  // ── H1 新增 (文件, 值) ────────────────────────────────────────────────
  test(`H1 硬编码 hex 回归：现状之外的 (文件, 值) 判红（基线 ${HEX_VALUE_BASELINE} 值 / ${HEX_FILE_BASELINE} 文件 / ${HEX_TOTAL_BASELINE} 处）`, () => {
    const offenders = [];
    for (const { file, hits } of scan()) {
      if (!hits.length || isAllowNew(file)) continue;
      const moved = movedInto(file);
      const base = HEX_BASELINE[file];
      if (!base) {
        const news = [...new Set(hits.map((h) => h.toLowerCase()))].filter((v) => !moved.has(v));
        if (news.length) offenders.push(`${file} → 新文件不得硬编码色值（未声明搬移的值）：${news.join(' ')}`);
        continue;
      }
      const allowed = new Set([...base.v, ...moved]);
      const news = [...new Set(hits.map((h) => h.toLowerCase()))].filter((v) => !allowed.has(v));
      if (news.length) {
        offenders.push(`${file} → 新增硬编码 hex：${news.join(' ')}（应取 §2.8 四层语义类 / var(--*) 主题变量）`);
      }
    }
    assert.deepEqual(offenders, [],
      `现状之外出现新的硬编码 hex（新增代码禁止硬编码色值，口径见 DESIGN_SYSTEM §2.8 四层分类）：\n  ${offenders.join('\n  ')}`);
  });
  
  // ── H2 逐文件处数 ratchet ────────────────────────────────────────────
  test('H2 处数 ratchet：逐文件 hex 处数不得高于基线（同一值复制到同文件也算新增）', () => {
    const grow = [];
    for (const { file, hits } of scan()) {
      if (!hits.length || isAllowNew(file)) continue;
      const base = HEX_BASELINE[file];
      if (!base) continue; // 新文件已由 H1 报出
      if (hits.length > base.c) grow.push(`${file} → ${hits.length} 处 > 基线 ${base.c} 处`);
    }
    assert.deepEqual(grow, [],
      `以下文件硬编码 hex 处数高于基线（收基线后不得再长）：\n  ${grow.join('\n  ')}`);
  });
  
  // ── H3 非空转自检 ────────────────────────────────────────────────────
  test('H3 非空转：抽取口径可用 + 基线规模达标 + 无僵尸登记', () => {
    // ① 抽取口径正例：3 位 / 6 位 / 8 位各命中
    assert.equal(
      ('#fff;#FFFFFF;color:#fafaf5;border-color:#CE1126FF'.match(HEX_RE) || []).length, 4,
      '抽取口径失效：合成样本里的 3/6/8 位色值未被全部抽出（守卫会恒真）');
    // ① 抽取口径负例：HTML 实体 / 锚点 / 非法长度 / 非十六进制字符 不得命中
    assert.equal(
      ('&#10003; href="#sec-ack" url(#g) #12 #xyz abcdef'.match(HEX_RE) || []).length, 0,
      '抽取口径过宽：HTML 实体（&#10003;）/锚点/非法长度被当成色值');
    // ② 基线规模下限（低于此值说明台账被删减或口径失效；正常批次只会缓慢下降）
    // ⚠ 2026-09-28 颜色存量批随收基线**下调** 85→80：`#C8102E`→`var(--party-red)` 后 9 个文件 hex 清零、
    //   条目按纪律删除（同日 H3 僵尸检查也强制删）⇒ 声明文件数 90→81，防呆下限同批下沉。
    // ⚠ 2026-09-28 色彩二分批再随存量对齐：删 `--app-accent*` 等硬编码兜底后 `docs/src/services/governance/issues.js`
    //   hex 清零 ⇒ 声明文件数 81→80，防呆下限**保持 80**（＝当前存量；**未放宽**——真正判红的是 H1（新增值）/
    //   H2（处数上涨）/ 下方僵尸登记，本下限只是「防台账被删空」的二级防呆）。
    // ⚠ 2026-09-28 组织台「成员流动」拆 tab 批（R10）：`org/roster-tab.js` 的两处 `#cbd5e1` 随代码**整体搬入**
    //   新文件 `org/member-flow-tab.js`（`HEX_MOVE_LEDGER` 逐值对照，H5）⇒ 按收基线纪律删该文件条目、文件数
    //   声明 80→79 ⇒ 本「防呆下限」随实况由 80 降到 **79**（与声明同值）。**不是放宽**：真正的判红项是 H1（新增值）/
    //   H2（处数上涨）/ 下方僵尸登记——本下限只防「台账被悄悄删空」，它随存量同步下沉。
    const files = Object.keys(HEX_BASELINE);
    // ⚠ 2026-10-01 批次 321：下限随 `HEX_FILE_BASELINE` 同步下沉 77 → 76（`org/development-tab.js` 随
    //   「整页并入人才库」删除 ⇒ 文件数合法减少；**收基线不是放宽**——核的是「抽取口径仍可用」而非「数量不减」）。
    // ⚠ 2026-10-02 批次 337（支书评 `#9`·徽章红/金字色）：`components/ui/badge.js` 的 5 处 hex
    //   （全在该文件注释里）随「brand/gold 不再挂内联字色 ＋ brand 改回党建红用 `var(--party-red)`」**清零**
    //   ⇒ 按收基线纪律删该文件条目、声明 76 → **75**，本「防呆下限」随实况同步下沉。
    //   **不是放宽**：真正的判红项是 H1（新增值）/ H2（处数上涨）/ 僵尸登记——本下限只防「台账被悄悄删空」。
    // ⚠ 2026-10-23 批次 505：7 主题 × 亮/暗 × 8 token 的手选色板落地（112 个 token）⇒ 按实况重设：
    //   文件数 74 → 51（23 个文件的内联派生清零）、distinct 168 → 287、处数 → 1419。
    //   下限随实况同步下沉，**不是放宽**——真正判红的是 H1（新增值）/ H2（处数上涨）/ 僵尸登记；
    //   色板本身的合法性由 H6 单独核（除 #FFFFFF 外只允许出现在两个色板定义文件）。
    // ⚠ 2026-10-29 P1（焦点单信号）：`feedback/issue-list.js` / `prop/kanban-tab.js` 的内联焦点色
    //   `#ce1126` 改为 `.focus-ring` 语义类后清零 ⇒ 按收基线纪律删两条目、声明 51 → 49，
    //   本「防呆下限」随实况同步下沉到 49（**不是放宽**：H1 新增值 / H2 处数上涨 / 僵尸登记仍是判红项）。
    // ⚠ 2026-10-29 P2（数字组单一语法）：`secretary/report-up-tab.js` 三处内联 hex 改语义 token 后清零
    //   ⇒ 再删一条目、声明 49 → 48，本下限随实况同步下沉到 48（同上，不是放宽）。
    // ⚠ 2026-11-01 批次 524：`overview-dispatch-bar.js` 待答复条改功能色后 hex 清零 ⇒ 删条目、
    //   声明 48 → 47，本下限随实况同步下沉到 47（同上，不是放宽）。
    // ⚠ 2026-11-04 批次 534：`tailwind-config.js`（改全 var() 映射）与 `activity-view.js`（三态色收敛）
    //   hex 清零 ⇒ 文件数 47 → **45**、处数 1433 → **818**（HEX_TOTAL_BASELINE 改为随实况同步）；
    //   防呆下限随实况下沉（47→45 / 1400→800）。**不是放宽**：判红项仍是 H1（新增值）/ H2（处数上涨）/
    //   下方僵尸登记——下限只防「台账被悄悄删空」。
    assert.ok(HEX_FILE_BASELINE >= 42 && files.length >= 42, `hex 基线文件数过少（实测 ${files.length} / 声明 ${HEX_FILE_BASELINE}，下限 42）`);
    assert.ok(HEX_TOTAL_BASELINE >= 800, `hex 基线处数过少（声明 ${HEX_TOTAL_BASELINE}，下限 800）`);
    assert.ok(HEX_VALUE_BASELINE >= 280, `hex 基线值数过少（声明 ${HEX_VALUE_BASELINE}，下限 280）`);
    assert.equal(files.length, HEX_FILE_BASELINE, '基线条目数与声明的文件数不一致（台账被改动须同步声明值）');
    // ③ 僵尸登记：基线文件必须真实存在，且该文件仍应有 hex 命中
    const gone = files.filter((f) => !existsSync(join(ROOT, f)));
    assert.deepEqual(gone, [], `基线条目指向不存在的文件（应从 style-baseline.mjs 移除）：\n  ${gone.join('\n  ')}`);
    const emptied = scan().filter(({ file, hits }) => HEX_BASELINE[file] && !hits.length).map(({ file }) => file);
    assert.deepEqual(emptied, [],
      `以下文件的硬编码 hex 已清零，应从 style-baseline.mjs 删除该条（收基线）：\n  ${emptied.join('\n  ')}`);
    // ④ 例外台账非空转：每条必须带理由，且文件真实存在
    for (const e of EXCEPTIONS) {
      assert.ok(e.reason && e.reason.length > 20, `例外台账缺理由：${e.file}`);
      assert.ok(existsSync(join(ROOT, e.file)), `例外台账指向不存在的文件：${e.file}`);
    }
  });
  
  // ── H4 缩减进度（只报不判） ──────────────────────────────────────────
  test('H4 缩减进度：当前存量与基线对照', () => {
    const rows = scan().filter((r) => r.hits.length);
    const total = rows.reduce((a, r) => a + r.hits.length, 0);
    const values = new Set();
    rows.forEach((r) => r.hits.forEach((h) => values.add(h.toLowerCase())));
    const d = (cur, base) => (cur === base ? '持平' : cur < base ? `↓${base - cur}` : `↑${cur - base}`);
    console.log(`[硬编码 hex 存量] 处数 ${total}（基线 ${HEX_TOTAL_BASELINE}，${d(total, HEX_TOTAL_BASELINE)}）`
      + ` · 值 ${values.size}（基线 ${HEX_VALUE_BASELINE}，${d(values.size, HEX_VALUE_BASELINE)}）`
      + ` · 文件 ${rows.length}（基线 ${HEX_FILE_BASELINE}，${d(rows.length, HEX_FILE_BASELINE)}）`);
    const top = rows.sort((a, b) => b.hits.length - a.hits.length).slice(0, 5)
      .map((r) => `${r.file}=${r.hits.length}`).join(' · ');
    console.log(`[存量最重五项] ${top}`);
    console.log('[收基线提示] 删存量后同批删 style-baseline.mjs 对应值 / 减小 c，进度即前进；不得为变绿补条目。');
  });
  
  // ── H5 搬移例外台账（2026-09-25 支书裁定「开搬移例外」） ──────────────────
  // 机制（为什么要有）：文件搬移 / 拆分会让颜色从 A 移到 B；逐文件 ratchet 会把「搬到新文件」判成「新文件新增
  //   hardcode」。故开此例外——但**必须人工声明 ＋ 逐值对照**，守卫**绝不自动放宽**（自动放宽＝取消 ratchet）。
  // 判据：见 style-baseline.mjs::HEX_MOVE_LEDGER 头注的 ①②③④；本用例落成机检，另以合成 ctx 做非空转自检。
  test(`H5 搬移例外台账：逐值对照 ＋ 不许借搬移加深色 ＋ 总量不得升（台账 ${HEX_MOVE_LEDGER.length} 条）`, () => {
    // 真实 ctx：值集/存在性/全站 distinct 都从当前源码取
    const SCAN0 = scan();
    const valuesOf = (file) => {
      const r = SCAN0.find((x) => x.file === file);
      return r ? [...new Set(r.hits.map((h) => h.toLowerCase()))] : [];
    };
    const allValues = new Set();
    SCAN0.forEach((r) => r.hits.forEach((h) => allValues.add(h.toLowerCase())));
    const ctx = {
      exists: (f) => existsSync(join(ROOT, f)),
      valuesOf,
      baselineValuesOf: (f) => (HEX_BASELINE[f]?.v || []).map((v) => v.toLowerCase()),
      distinctValues: () => allValues.size,
      valueCeiling: HEX_VALUE_BASELINE,
    };
    const problems = validateMoveLedger(HEX_MOVE_LEDGER, ctx);
    assert.deepEqual(problems, [], `搬移例外台账不成立（逐值对照 / 不得加深色 / 总量不得升）：\n  ${problems.join('\n  ')}`);
  
    // ── 非空转自检（合成 ctx：合法搬移判绿、四种违规判红；防「校验器写空」恒真）──
    const mkCtx = (map, distinct = 2, ceiling = 168, baseMap = {}) => ({
      exists: () => true,
      valuesOf: (f) => (map[f] || []).map((v) => v.toLowerCase()),
      baselineValuesOf: (f) => ((baseMap[f] ?? map[f] ?? [])).map((v) => v.toLowerCase()),
      distinctValues: () => distinct,
      valueCeiling: ceiling,
    });
    const reason = '文件拆分：旧文件的值整体搬到新文件，值集不变';
    // 正例：合法搬移（值已不在 from、已出现在 to、to 值集 ⊆ fromValues）⇒ 绿
    assert.deepEqual(validateMoveLedger(
      [{ from: 'a.js', to: ['b.js'], values: ['#ce1126'], fromValues: ['#ce1126', '#fff'], reason }],
      mkCtx({ 'a.js': ['#fff'], 'b.js': ['#ce1126'] })), [], '非空转失效：合法搬移没判绿');
    // 负例①：复制而非搬移（值仍留在 from）⇒ 红
    assert.ok(validateMoveLedger(
      [{ from: 'a.js', to: ['b.js'], values: ['#ce1126'], fromValues: ['#ce1126', '#fff'], reason }],
      mkCtx({ 'a.js': ['#ce1126', '#fff'], 'b.js': ['#ce1126'] })).some((p) => p.includes('仍留在 from')),
      '非空转失效：复制（未搬出）没被校验器判出');
    // 负例②：借搬移加深色（to 里出现「原有之外且非搬移」的新值）⇒ 红
    assert.ok(validateMoveLedger(
      [{ from: 'a.js', to: ['b.js'], values: ['#ce1126'], fromValues: ['#ce1126', '#fff'], reason }],
      mkCtx({ 'a.js': ['#fff'], 'b.js': ['#ce1126', '#123456'] }, 2, 168, { 'a.js': ['#fff'], 'b.js': ['#ce1126'] }))
      .some((p) => p.includes('不只是搬家')),
      '非空转失效：借搬移加深色没被校验器判出');
    // 负例③：申报值不在 fromValues 里（值集合新增）⇒ 红
    assert.ok(validateMoveLedger(
      [{ from: 'a.js', to: ['b.js'], values: ['#123456'], fromValues: ['#fff'], reason }],
      mkCtx({ 'a.js': [], 'b.js': ['#123456'] })).some((p) => p.includes('借搬移加深色')),
      '非空转失效：搬移值不在 fromValues 里没被校验器判出');
    // 负例④：缺理由 / 总量上升 ⇒ 红
    assert.ok(validateMoveLedger(
      [{ from: 'a.js', to: ['b.js'], values: ['#fff'], fromValues: ['#fff'], reason: '短' }],
      mkCtx({ 'a.js': [], 'b.js': ['#fff'] })).some((p) => p.includes('缺理由')),
      '非空转失效：缺理由没被校验器判出');
    assert.ok(validateMoveLedger(
      [{ from: 'a.js', to: ['b.js'], values: ['#fff'], fromValues: ['#fff'], reason }],
      mkCtx({ 'a.js': [], 'b.js': ['#fff'] }, 200, 168)).some((p) => p.includes('不得升')),
      '非空转失效：总量上升没被校验器判出');
  });
  
  // ── H6 主题色板例外（2026-10-23 批次 505） ───────────────────────────
  // 病灶：色板从「10 个 hex + 公式」升级为「7 主题 × 亮/暗 × 8 手选 hex」后，constants.js / styles.css
  //   必然新增 100+ 个色值。若放任它们散落到组件里，就成了新的「游离 hardcode」。
  // 判据（**只放宽声明点**，不放宽其它）：
  //   ① 色板值必须全部能在 `constants.js` 的 `ACCENT_COLORS` 表里找到（可追溯）；
  //   ② 除 `#FFFFFF`（与中性白同值，全站共用）外，任何色板值只允许出现在
  //      `docs/src/core/domain/constants.js` 与 `docs/src/styles.css` 两个「色板定义文件」。
  test('H6 主题色板例外：除 #FFFFFF 外，色板值只允许出现在 constants.js / styles.css', () => {
    const PALETTE_FILES = new Set([
      'docs/src/core/domain/constants.js',
      'docs/src/styles.css',
    ]);
    const values = new Set();
    for (const entry of Object.values(ACCENT_COLORS)) {
      for (const mode of ['light', 'dark']) {
        for (const v of Object.values(entry[mode])) values.add(String(v).toLowerCase());
      }
    }
    assert.ok(values.size >= 100, `色板值只收集到 ${values.size} 个（7×2×8 应 ≥100）：非空转`);
  
    const constantsSrc = readFileSync(join(ROOT, 'docs/src/core/domain/constants.js'), 'utf8').toLowerCase();
    const missingInTable = [...values].filter((v) => !constantsSrc.includes(v));
    assert.deepEqual(missingInTable, [], `以下色板值未出现在 constants.js（主题色必须在表内定义）：${missingInTable.join(' ')}`);
  
    const leaks = [];
    // 场域固定色 party-red 的 base＝党建红 #CE1126 是既有品牌 token（help / about / 换组织向导早有直写），
    //   故「组件泄漏」只扫 7 个用户主题；「必须在表内定义」仍覆盖全部 8 项（见上一段）。
    const themeOnlyValues = new Set();
    for (const k of ['gold', 'red', 'orange', 'green', 'cyan', 'blue', 'purple']) {
      for (const mode of ['light', 'dark']) for (const v of Object.values(ACCENT_COLORS[k][mode])) themeOnlyValues.add(String(v).toLowerCase());
    }
    for (const { file, hits } of scan()) {
      if (PALETTE_FILES.has(file)) continue;
      const hitSet = new Set(hits.map((h) => h.toLowerCase()));
      for (const v of themeOnlyValues) {
        if (v === '#ffffff') continue; // 中性白：全站共用，不算主题色泄漏
        if (hitSet.has(v)) leaks.push(`${file} → ${v}`);
      }
    }
    assert.deepEqual(leaks, [], `主题色板值出现在色板定义文件之外（组件不得直写主题色 hex）：\n  ${leaks.join('\n  ')}`);
  });
  
  // ── H7 主题栏元信息（2026-11-03 批次 533 · R5A-34）──────────────────────
  // 病灶：全站页面缺 `<meta name="theme-color">`，移动端浏览器地址栏不随主题；补时又不能各写各的色值。
  // 判据：除冻结件 `docs/about.html` 外，每个 `docs/**/*.html` 必须恰好一条 theme-color，且值为
  //   `styles.css :root` 的 `--party-red`（品牌统一层，不随支部主题变）。theme-color 必须写字面量，
  //   H1/H2 已把该元信息剥离，不重复计为界面硬编码。
  test('H7 theme-color：每页恰一条，且等于 --party-red（about.html 冻结件除外）', () => {
    const css = readFileSync(join(ROOT, 'docs/src/styles.css'), 'utf8');
    const partyRed = /--party-red:\s*(#[0-9a-fA-F]{3,8})/.exec(css)?.[1]?.toLowerCase();
    assert.ok(partyRed, 'styles.css 缺 --party-red（无法校验 theme-color 单一源）');
  
    const problems = [];
    for (const file of scanFiles().filter((f) => f.endsWith('.html'))) {
      if (file === 'docs/about.html') continue; // About 冻结件：原样保留
      const tags = readFileSync(join(ROOT, file), 'utf8').match(THEME_COLOR_META_RE) || [];
      if (tags.length !== 1) { problems.push(`${file} → theme-color ${tags.length} 条（须恰 1 条）`); continue; }
      const value = /content=["']([^"']+)["']/i.exec(tags[0])?.[1]?.toLowerCase();
      if (value !== partyRed) problems.push(`${file} → ${value} ≠ ${partyRed}`);
    }
    assert.deepEqual(problems, [],
      `theme-color 缺失 / 重复 / 与 --party-red 不一致：\n  ${problems.join('\n  ')}`);
  });

})();

// ═══ 源件 2：theme-palette-guard.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // theme-palette-guard.test.mjs — 7 主题显式色板守卫（spec redesign-theme-palette-and-density · Task 9）
  //
  // 本文件由 `color-ratchet-guard.test.mjs` / `gold-accent-guard.test.mjs` 合并而来（2026-10-24 批次 509）：
  //   原 `gold-accent-guard` 的 G1–G5 断言**逐条搬入本文件末尾**，未删一条。
  //   为什么做一个而不是两个：两者检查的是**同一张主题色表**（`ACCENT_COLORS`）与**同一组 CSS token**，
  //   失败根因都是「色值 / 派生链与主题表不一致」；拆开只会在红的时候多一次「该去哪个文件找」的跳转。
  //
  // 为什么要有本守卫：
  //   · 批次 505 把主题色从「1 个 hex + color-mix 公式」改成「7 主题 × 亮/暗 × 9 个手选 hex」。
  //     公式退场后，**没有任何守卫校验色值本身**：改错一个 hex、少写一个 token、把某主题
  //     退回 color-mix，都不会有红灯。本文件把色板结构、对比度、彩度与「固定语义色分离」
  //     钉成可机检判据。
  //   · 判据（与 spec「ADDED Requirements」逐条对应）：
  //       T1 结构：ACCENT_COLORS 恰 7 主题；每主题 light/dark 各 9 个合法 hex
  //       T2 对比度：softText/softBg 4.5–12；strongInk/strongBg ≥4.5；strongBg/卡片底 ≥3；
  //                  softBg 与白 1.08–1.35；strongBg HSL 饱和度 ≤85%
  //       T3 色板：ACCENT_PALETTE 恰 7 项、旧键（sky/light-blue/deep）不在其中且有别名回落
  //       T4 选择器：appearance-controls.js 只列 7 项、每项 2 枚小样、消费 getAccentColors、无 hex 字面量
  //       T5 语义色分离：活动类别色 / 党徽金不读 --app-accent*
  //       T6 strongHover（批次 508 第 9 token）：与 strongBg 同色相且不同值、与 strongInk ≥4.5:1、
  //          不得等于 activeBg（否则 hover 与选中态无法区分）
  //       T7 strongHover 非空转：7 主题 × 亮/暗都真实存在（不是 undefined），且注入 / 别名链齐备
  //       T12 颜色单一权威：`tailwind-config.js` 的 party / primary / neutral / surface 与
  //           `styles.css :root` 同名令牌**逐值相等**（`var()` 按解析后比较）；键集固定，防「删键蒙混」
  //       T13 颜色单一权威：`constants.js` 的 ACCENT_COLORS 默认主题（gold）亮 / 暗 × 9 token
  //           与 ROLE_COLORS.text / textDark **逐值等于** `styles.css` 对应令牌
  //           （非默认 6 主题由 `theme.js` 运行时注入，CSS 无同名令牌可对照 ⇒ 由 T1/T2 管色值合法性）
  //     T12/T13 均带反例：改一个镜像值必须判红（防正则 / 解析写坏导致恒真）。
  //   · 非空转：每类断言都先核「命中数 >0」，避免正则/解析写坏导致恒真。
  // 运行：node --test server/test/theme-palette-guard.test.mjs
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync, readdirSync } = await import('node:fs');
  const { join, dirname, relative } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const { ACCENT_COLORS, ACCENT_PALETTE, ACCENT_KEY_ALIASES, normalizeAccentKey, getAccentColors, accentButtonColors, ROLE_COLORS, } = await import('../../docs/src/core/domain/constants.js?v=20261120a');
  const HERE = dirname(fileURLToPath(import.meta.url));
  const ROOT = join(HERE, '..', '..');
  const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
  
  const STYLES = read('docs/src/styles.css');
  const CONSTANTS = read('docs/src/core/domain/constants.js');
  
  /** 取某选择器的规则体（逗号分隔后精确匹配；先剥注释） */
  function ruleBody(css, selector) {
    const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
    for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (m[1].trim().split(',').map((s) => s.trim()).includes(selector)) return m[2];
    }
    return '';
  }
  
  const THEME_KEYS = ['gold', 'red', 'orange', 'green', 'cyan', 'blue', 'purple'];
  // 场域固定色（2026-11-25 批次 627 · D-925）：登录 / 党委 / 支部治理四台固定党建红；
  //   它进 ACCENT_COLORS（色板可追溯 + 对比度受检），但不进 ACCENT_PALETTE（设置页仍 7 项）。
  const SCOPE_KEYS = ['party-red'];
  const TOKEN_KEYS = ['base', 'softBg', 'softBorder', 'softText', 'strongBg', 'strongInk', 'strongHover', 'hoverBg', 'activeBg'];
  const OLD_KEYS = ['sky', 'light-blue', 'deep'];
  const HEX_VALUE_RE = /^#[0-9A-Fa-f]{6}$/;
  const CARD_LIGHT = '#FFFFFF';
  const CARD_DARK = '#141D2F';
  
  // ── 颜色工具（WCAG 2.x；与 ui-contrast-guard 同式，避免依赖第三方） ──
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const rgb = (hex) => {
    const h = String(hex).replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  const luminance = (hex) => {
    const [r, g, b] = rgb(hex);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const contrast = (a, b) => {
    const la = luminance(a);
    const lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  /** HSL 饱和度（0–100）：S = (max-min) / (1 - |max+min-1|) */
  const hslSaturation = (hex) => {
    const [r, g, b] = rgb(hex).map((v) => v / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max === min) return 0;
    return ((max - min) / (1 - Math.abs(max + min - 1))) * 100;
  };
  /** HSL 色相（0–360），用于判 strongHover 与 strongBg 是否同色相 */
  const hue = (hex) => {
    const [r, g, b] = rgb(hex).map((v) => v / 255);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    if (d === 0) return 0;
    let h;
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return (h * 60 + 360) % 360;
  };
  const hueDiff = (a, b) => {
    const d = Math.abs(hue(a) - hue(b));
    return Math.min(d, 360 - d);
  };
  
  test('T1 结构：ACCENT_COLORS 7 用户主题 ＋ 1 场域固定色 × 亮/暗 × 9 个合法 hex token', () => {
    const keys = Object.keys(ACCENT_COLORS);
    assert.equal(keys.length, THEME_KEYS.length + SCOPE_KEYS.length,
      `主题数应为 ${THEME_KEYS.length + SCOPE_KEYS.length}，实际 ${keys.length}：${keys.join('/')}`);
    assert.deepEqual([...keys].sort(), [...THEME_KEYS, ...SCOPE_KEYS].sort(),
      `主题键必须恰为 ${[...THEME_KEYS, ...SCOPE_KEYS].join('/')}`);

    let tokenCount = 0;
    for (const key of [...THEME_KEYS, ...SCOPE_KEYS]) {
      const entry = ACCENT_COLORS[key];
      assert.ok(entry, `缺少主题 ${key}`);
      assert.equal(entry.key, key, `${key}.key 应为 '${key}'`);
      for (const mode of ['light', 'dark']) {
        const tokens = entry[mode];
        assert.ok(tokens, `${key}.${mode} 缺失`);
        const tokenKeys = Object.keys(tokens);
        assert.equal(tokenKeys.length, 9, `${key}.${mode} 应有 9 个 token，实际 ${tokenKeys.length}：${tokenKeys.join('/')}`);
        assert.deepEqual([...tokenKeys].sort(), [...TOKEN_KEYS].sort(), `${key}.${mode} token 名不符`);
        for (const name of TOKEN_KEYS) {
          const value = tokens[name];
          assert.match(value, HEX_VALUE_RE,
            `${key}.${mode}.${name} 必须是手选 6 位 hex（当前 ${JSON.stringify(value)}）：不得 color-mix / rgba / var 派生`);
          tokenCount += 1;
        }
      }
    }
    assert.equal(tokenCount, (THEME_KEYS.length + SCOPE_KEYS.length) * 2 * 9,
      `token 总数应为 ${(THEME_KEYS.length + SCOPE_KEYS.length) * 2 * 9}，实际 ${tokenCount}`);
  });
  
  test('T2 对比度与彩度：7 用户主题 ＋ 场域固定色 × 亮/暗逐项达标', () => {
    const problems = [];
    const readings = [];
    for (const key of [...THEME_KEYS, ...SCOPE_KEYS]) {
      for (const mode of ['light', 'dark']) {
        const t = ACCENT_COLORS[key][mode];
        const soft = contrast(t.softText, t.softBg);
        const ink = contrast(t.strongInk, t.strongBg);
        const strongCard = contrast(t.strongBg, mode === 'light' ? CARD_LIGHT : CARD_DARK);
        const softWhite = contrast(t.softBg, CARD_LIGHT);
        const sat = hslSaturation(t.strongBg);
        readings.push(`${key}.${mode}: soft ${soft.toFixed(2)} / ink ${ink.toFixed(2)} / strong-vs-card ${strongCard.toFixed(2)} / softBg-vs-white ${softWhite.toFixed(2)} / sat ${sat.toFixed(1)}%`);
        if (soft < 4.5) problems.push(`${key}.${mode} softText/softBg=${soft.toFixed(2)} < 4.5`);
        if (soft > 12) problems.push(`${key}.${mode} softText/softBg=${soft.toFixed(2)} > 12（刺眼）`);
        if (ink < 4.5) problems.push(`${key}.${mode} strongInk/strongBg=${ink.toFixed(2)} < 4.5`);
        if (strongCard < 3) problems.push(`${key}.${mode} strongBg/卡片底=${strongCard.toFixed(2)} < 3`);
        // softBg 的低彩度只对亮色档可测（暗色 softBg 是深底，与白对比天然 >1.35）
        if (mode === 'light' && (softWhite < 1.08 || softWhite > 1.35)) {
          problems.push(`${key}.light softBg 与白=${softWhite.toFixed(2)}，应落在 1.08–1.35`);
        }
        if (sat > 85) problems.push(`${key}.${mode} strongBg 饱和度=${sat.toFixed(1)}% > 85%（固定语义色除外，主题表内不得刺眼）`);
      }
    }
    assert.ok(readings.length === (THEME_KEYS.length + SCOPE_KEYS.length) * 2,
      `应产出 ${(THEME_KEYS.length + SCOPE_KEYS.length) * 2} 行读数，实际 ${readings.length}`);
    console.log(`[theme-palette] 对比度/彩度实测：\n  ${readings.join('\n  ')}`);
    assert.deepEqual(problems, [], `主题色板对比度/彩度不达标：\n  ${problems.join('\n  ')}`);
  });
  
  test('T3 色板：ACCENT_PALETTE 恰 7 项、旧键退场且有别名回落', () => {
    assert.equal(ACCENT_PALETTE.length, 7, `ACCENT_PALETTE 应为 7 项，实际 ${ACCENT_PALETTE.length}`);
    const paletteKeys = ACCENT_PALETTE.map((c) => c.key);
    assert.deepEqual([...paletteKeys].sort(), [...THEME_KEYS].sort(), 'ACCENT_PALETTE 键必须恰为 7 主题');
    for (const old of OLD_KEYS) {
      assert.ok(!paletteKeys.includes(old), `旧键 ${old} 仍在色板里（紫只留一个、蓝只留一个）`);
      assert.ok(ACCENT_KEY_ALIASES[old], `旧键 ${old} 缺少别名回落映射`);
    }
    // 旧值回落：天蓝/亮蓝 → 蓝；雾紫/深度参与者 → 紫；角色键收敛到 7 项。
    assert.equal(normalizeAccentKey('sky'), 'blue', 'sky 应回落 blue');
    assert.equal(normalizeAccentKey('light-blue'), 'blue', 'light-blue 应回落 blue');
    assert.equal(normalizeAccentKey('deep'), 'purple', 'deep 应回落 purple');
    assert.equal(normalizeAccentKey('participant'), 'gold', 'participant 应回落 gold（默认金）');
    assert.equal(normalizeAccentKey('secretary'), 'red', 'secretary 应收敛 red');
    assert.equal(normalizeAccentKey('totally-unknown'), 'gold', '未知键应回落 gold');
    // 查表返回 9 个 token + 旧别名，且不再做亮度分流
    const t = getAccentColors('gold', 'light');
    for (const name of TOKEN_KEYS) assert.equal(t[name], ACCENT_COLORS.gold.light[name], `getAccentColors 未按表返回 ${name}`);
    assert.equal(t.bg, t.softBg, '兼容别名 bg 应指向 softBg');
    assert.equal(t.strong, t.strongBg, '兼容别名 strong 应指向 strongBg');
    assert.equal(t.ink, t.strongInk, '兼容别名 ink 应指向 strongInk');
  });
  
  test('T4 主题选择器：只列 7 项、每项 2 枚小样、消费 getAccentColors、无 hex 字面量', () => {
    const src = read('docs/src/components/shell/appearance-controls.js');
    assert.match(src, /import\s*\{[^}]*ACCENT_PALETTE[^}]*\}\s*from\s*['"][^'"]*constants\.js/,
      'appearance-controls.js 应从 constants.js 导入 ACCENT_PALETTE（单一源）');
    assert.match(src, /import\s*\{[^}]*getAccentColors[^}]*\}\s*from\s*['"][^'"]*constants\.js/,
      'appearance-controls.js 应导入 getAccentColors（消费主题表，不写死色值）');
    assert.match(src, /ACCENT_PALETTE\.map\(/, '主题项应由 ACCENT_PALETTE.map 生成（只列 7 项）');
    const sampleHits = [...src.matchAll(/data-accent-sample=/g)].length;
    assert.equal(sampleHits, 2, `每个主题项应有 2 枚小样（soft / strong），模板里 data-accent-sample 出现 ${sampleHits} 次`);
    assert.match(src, /data-accent-sample="soft"/, '缺少「浅底 + 深字」小样');
    assert.match(src, /data-accent-sample="strong"/, '缺少「实底 + 字」小样');
    assert.match(src, /getAccentColors\(el\.dataset\.accentKey,\s*mode\)/,
      '小样重绘应按当前亮/暗从主题表取色');
    const hex = src.match(/#[0-9A-Fa-f]{3,8}\b/g) || [];
    assert.deepEqual(hex, [], `appearance-controls.js 不得出现 hex 字面量：${hex.join(' ')}`);
    // 旧键回落提示与 constants.js 同口径
    assert.match(src, /sky:\s*'blue'/, '旧键 sky 应回落 blue');
    assert.match(src, /'light-blue':\s*'blue'/, '旧键 light-blue 应回落 blue');
    assert.match(src, /deep:\s*'purple'/, '旧键 deep 应回落 purple');
  });
  
  test('T5 固定语义色分离：活动类别色 / 党徽金不读 --app-accent*', () => {
    const constants = read('docs/src/core/domain/constants.js');
    const typeBase = /const _ACTIVITY_TYPE_BASE\s*=\s*\{([\s\S]*?)\n\};/.exec(constants);
    assert.ok(typeBase, 'constants.js 缺少 _ACTIVITY_TYPE_BASE（活动类别色表）');
    assert.doesNotMatch(typeBase[1], /--app-accent/, '_ACTIVITY_TYPE_BASE 不得读主题 token（活动类别色是固定语义色）');
    assert.match(typeBase[1], /partyGold|_C\.partyGold/, '主题党日系应使用固定党徽金（_C.partyGold）');
    assert.match(typeBase[1], /partyRedBrand|_C\.partyRedBrand/, '三会一课系应使用固定党建红（_C.partyRedBrand）');
  
    const classification = /export const ACTIVITY_CLASSIFICATION\s*=\s*\{([\s\S]*?)\n\};/.exec(constants);
    assert.ok(classification, 'constants.js 缺少 ACTIVITY_CLASSIFICATION');
    assert.doesNotMatch(classification[1], /--app-accent/, 'ACTIVITY_CLASSIFICATION 不得读主题 token');
  
    const styles = read('docs/src/styles.css');
    assert.match(styles, /--party-gold:\s*#FFD700\s*;/, '党徽金应为固定 #FFD700（与主题金分开定义）');
    assert.match(styles, /--party-red:\s*#CE1126\s*;/, '党建红应为固定 #CE1126');
    assert.doesNotMatch(styles, /--party-gold:\s*var\(--app-accent/, '党徽金不得指向主题色变量');
    // 主题金与党徽金不同值（支书口径「党徽金 ≠ 主题金」）
    assert.notEqual(ACCENT_COLORS.gold.light.base.toLowerCase(), '#ffd700', '主题金不应等于党徽金 #FFD700（主题金应更沉稳）');
  });
  
  test('T6 strongHover：与 strongBg 同色相且不同值、与 strongInk ≥4.5:1、不得等于 activeBg', () => {
    const problems = [];
    const readings = [];
    for (const key of THEME_KEYS) {
      for (const mode of ['light', 'dark']) {
        const t = ACCENT_COLORS[key][mode];
        const hd = hueDiff(t.strongBg, t.strongHover);
        const ink = contrast(t.strongInk, t.strongHover);
        readings.push(`${key}.${mode}: hueΔ ${hd.toFixed(2)}° / ink-hover ${ink.toFixed(2)} / hover≠bg ${t.strongHover !== t.strongBg} / hover≠active ${t.strongHover !== t.activeBg}`);
        if (hd > 3) problems.push(`${key}.${mode} strongHover 与 strongBg 色相差 ${hd.toFixed(2)}° > 3°（实底 hover 必须同色相加深，不得换色相）`);
        if (t.strongHover === t.strongBg) problems.push(`${key}.${mode} strongHover 与 strongBg 同值（hover 无可见变化）`);
        if (t.strongHover === t.activeBg) problems.push(`${key}.${mode} strongHover 与 activeBg 同值（hover 与选中态无法区分）`);
        // 留 1e-9 容差：暗色红/橙/蓝/紫实测 4.50 恰好贴线，避免浮点尾差误判
        if (ink < 4.5 - 1e-9) problems.push(`${key}.${mode} strongInk/strongHover=${ink.toFixed(2)} < 4.5`);
      }
    }
    assert.equal(readings.length, 14, `应产出 14 行读数，实际 ${readings.length}`);
    console.log(`[theme-palette] strongHover 实测：\n  ${readings.join('\n  ')}`);
    assert.deepEqual(problems, [], `strongHover 不达标：\n  ${problems.join('\n  ')}`);
  });
  
  test('T7 strongHover 非空转：7 主题 × 亮/暗都真实存在，且注入 / 别名链齐备', () => {
    const presets = [];
    for (const key of THEME_KEYS) {
      for (const mode of ['light', 'dark']) {
        const tokens = ACCENT_COLORS[key][mode];
        assert.ok(Object.prototype.hasOwnProperty.call(tokens, 'strongHover'),
          `${key}.${mode} 缺少 strongHover 键（undefined / 未登记）`);
        assert.equal(typeof tokens.strongHover, 'string', `${key}.${mode}.strongHover 必须是字符串`);
        assert.match(tokens.strongHover, HEX_VALUE_RE, `${key}.${mode}.strongHover 必须是 6 位 hex`);
        const viaLookup = getAccentColors(key, mode).strongHover;
        assert.equal(viaLookup, tokens.strongHover, `getAccentColors('${key}','${mode}') 未返回 strongHover`);
        assert.notEqual(viaLookup, undefined, `${key}.${mode} getAccentColors().strongHover 为 undefined`);
        presets.push(viaLookup);
      }
    }
    assert.equal(presets.length, 14, `应核对 14 个 strongHover 值，实际 ${presets.length}`);
  
    // 注入链：theme.js 的 9 个后缀与 token 数组都含 strongHover；styles.css 有亮/暗原始变量与选边别名。
    const theme = read('docs/src/core/boot/theme.js');
    assert.match(theme, /ACCENT_TOKEN_SUFFIXES\s*=\s*\[[^\]]*'strong-hover'[^\]]*\]/,
      'theme.js 的 ACCENT_TOKEN_SUFFIXES 缺 strong-hover（第 9 token 不会注入）');
    assert.match(theme, /light\.strongHover/, 'theme.js 亮色 token 数组缺 strongHover');
    assert.match(theme, /dark\.strongHover/, 'theme.js 暗色 token 数组缺 strongHover');
    const styles = read('docs/src/styles.css');
    for (const name of ['--app-accent-strong-hover-light', '--app-accent-strong-hover-dark', '--app-accent-strong-hover']) {
      assert.ok(styles.includes(`${name}:`), `styles.css 缺 ${name} 定义`);
    }
    assert.match(styles, /html\.theme-dark\s*\{[\s\S]*?--app-accent-strong-hover:\s*var\(--app-accent-strong-hover-dark\)/,
      'styles.css 暗色段未把 --app-accent-strong-hover 选边到 *-dark');
  });
  
  // ═════════════════════════════════════════════════════════════════════════════
  // T8–T9：功能色层（2026-10-26 Task 4）
  //   T8 状态 / 类别 / 身份 token 齐备：--status-* 与别名；类别暗色 ≠ 状态暗色；
  //      --color-identity-* 逐值等于 ROLE_COLORS（text / textDark）；
  //      --color-link / --color-text-* / --color-border-* 语义别名存在。
  //   T9 僵尸 token 零消费者：12 个已删 token 在 docs/ 下不得再出现（注释也算）。
  // ═════════════════════════════════════════════════════════════════════════════
  
  /** 取 :root 内某变量值（先剥注释） */
  function rootVar(css, name) {
    const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const m = new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(clean);
    return m ? m[1].trim() : '';
  }
  
  /** 解 var(--x) 别名链（只到 hex；用于功能色 → 类别色的单一源核对） */
  function resolveVarChain(css, value, depth = 0) {
    const v = String(value || '').trim();
    const m = /^var\((--[a-z0-9-]+)\)$/i.exec(v);
    if (!m || depth > 8) return v;
    return resolveVarChain(css, rootVar(css, m[1]), depth + 1);
  }
  
  /** 取 html.theme-dark 块文本（大括号配对） */
  function darkBlock(css) {
    const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const i = src.indexOf('html.theme-dark {');
    if (i < 0) return '';
    const start = src.indexOf('{', i);
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
        if (['vendor', 'fonts', 'images'].includes(e.name)) continue;
        walkJs(p, out);
        continue;
      }
      if (e.name.endsWith('.js')) out.push(p);
    }
    return out;
  }
  
  const IDENTITY_ROLES = Object.keys(ROLE_COLORS);
  
  test('T8 功能色层：状态 / 类别 / 身份 / 语义别名齐备且身份色与 ROLE_COLORS 同值', () => {
    // ① 状态 4 色 + 短期别名（组件只读 --status-*）
    for (const key of ['success', 'warning', 'error', 'info']) {
      assert.match(rootVar(STYLES, `--status-${key}`), HEX_VALUE_RE, `styles.css 缺 --status-${key} 亮色值`);
      assert.equal(rootVar(STYLES, `--functional-${key}`), `var(--status-${key})`,
        `--functional-${key} 应仅为 --status-${key} 的兼容别名`);
    }
    const dark = darkBlock(STYLES);
    assert.ok(dark, 'styles.css 缺少 html.theme-dark 块');
    for (const key of ['success', 'warning', 'error', 'info']) {
      assert.match(rootVar(dark, `--status-${key}`), HEX_VALUE_RE, `暗色段缺 --status-${key} 的暗色值`);
    }
  
    // ② 类别 3 色；暗色类别与状态色分开（不再逐值相同）
    //    2026-10-27 Task 11.4：类别改为引用功能 color token（var 链），这里解析到最终 hex 再核。
    const functionalRed = rootVar(STYLES, '--color-functional-red');
    const functionalRedDark = rootVar(STYLES, '--color-functional-red-dark');
    const functionalGold = rootVar(STYLES, '--color-functional-gold');
    const functionalGoldDark = rootVar(STYLES, '--color-functional-gold-dark');
    assert.match(functionalRed, HEX_VALUE_RE, '缺功能红亮色 token');
    assert.match(functionalRedDark, HEX_VALUE_RE, '缺功能红暗色 token');
    assert.match(functionalGold, HEX_VALUE_RE, '缺功能金亮色 token');
    assert.match(functionalGoldDark, HEX_VALUE_RE, '缺功能金暗色 token');
    assert.equal(resolveVarChain(STYLES, rootVar(STYLES, '--color-category-three-meetings')), functionalRed,
      '类别红应引用 --color-functional-red（单一源）');
    assert.equal(resolveVarChain(STYLES, rootVar(STYLES, '--color-category-three-meetings-dark')), functionalRedDark,
      '类别红暗色应引用 --color-functional-red-dark');
    assert.equal(resolveVarChain(STYLES, rootVar(STYLES, '--color-category-theme-day')), functionalGold,
      '主题党日金应引用 --color-functional-gold');
    assert.equal(resolveVarChain(STYLES, rootVar(STYLES, '--color-category-theme-day-dark')), functionalGoldDark,
      '主题党日金暗色应引用 --color-functional-gold-dark');
    assert.equal(resolveVarChain(STYLES, rootVar(STYLES, '--color-category-theme-day-dot')), '#FFD700',
      '主题党日圆点应仍取党徽金 --party-gold（#FFD700）');
    assert.match(rootVar(STYLES, '--color-category-other'), HEX_VALUE_RE, '缺类别中性 token');
    const categoryRedDark = functionalRedDark;
    const categoryGoldDark = functionalGoldDark;
    const statusErrorDark = rootVar(dark, '--status-error');
    const statusWarningDark = rootVar(dark, '--status-warning');
    assert.notEqual(categoryRedDark.toLowerCase(), statusErrorDark.toLowerCase(),
      `暗色类别红 ${categoryRedDark} 不得等于 danger ${statusErrorDark}（类别不得借状态色）`);
    assert.notEqual(categoryGoldDark.toLowerCase(), statusWarningDark.toLowerCase(),
      `暗色主题党日金 ${categoryGoldDark} 不得等于 warning ${statusWarningDark}`);
  
    // ③ 身份色逐值等于 ROLE_COLORS.text / textDark（单一源；CSS 只放同值 token）
    assert.ok(IDENTITY_ROLES.length >= 10, `ROLE_COLORS 角色数过少（${IDENTITY_ROLES.length}）`);
    for (const role of IDENTITY_ROLES) {
      const expected = ROLE_COLORS[role].text;
      const expectedDark = ROLE_COLORS[role].textDark;
      assert.equal(rootVar(STYLES, `--color-identity-${role}`), expected,
        `--color-identity-${role} 应等于 ROLE_COLORS['${role}'].text（${expected}）`);
      assert.equal(rootVar(STYLES, `--color-identity-${role}-dark`), expectedDark,
        `--color-identity-${role}-dark 应等于 ROLE_COLORS['${role}'].textDark（${expectedDark}）`);
    }
  
    // ④ 语义别名（组件只读这一层）
    assert.equal(rootVar(STYLES, '--color-link'), 'var(--app-accent-soft-text)',
      '--color-link 应指向主题 soft-text（全站唯一链接色）');
    for (const [name, target] of [
      ['--color-text-primary', 'var(--neutral-800)'],
      ['--color-text-secondary', 'var(--neutral-600)'],
      ['--color-text-tertiary', 'var(--neutral-500)'],
      ['--color-border-subtle', 'var(--neutral-200)'],
      ['--color-border-strong', 'var(--neutral-300)'],
    ]) {
      assert.equal(rootVar(STYLES, name), target, `${name} 应指向 ${target}`);
    }
  });
  
  test('T9 僵尸 token 零消费者：12 个已删 token 在 docs 下不得再出现', () => {
    const ZOMBIES = [
      '--accent-sky', '--accent-indigo', '--accent-violet', '--accent-violet-light',
      '--accent-blue', '--accent-emerald', '--accent-amber', '--status-live',
      '--blue-hover', '--sky-hover', '--error-dark', '--brand-amber-dark',
    ];
    const files = [];
    const walk = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (['vendor', 'fonts', 'images'].includes(e.name)) continue;
        const p = join(dir, e.name);
        if (e.isDirectory()) { walk(p); continue; }
        if (/\.(js|mjs|css|html)$/.test(e.name)) files.push(p);
      }
    };
    walk(join(ROOT, 'docs'));
    assert.ok(files.length >= 100, `扫描面过小（${files.length} 个文件）`);
    const hits = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      for (const token of ZOMBIES) {
        if (src.includes(token)) hits.push(`${relative(ROOT, f)} → ${token}`);
      }
    }
    assert.deepEqual(hits, [], `已删除的僵尸 token 仍有消费者 / 残留：\n  ${hits.join('\n  ')}`);
  
    // 组件只写 --status-*：JS 源码不得再出现 --functional-*
    const jsFiles = walkJs(join(ROOT, 'docs', 'src'));
    const legacy = [];
    for (const f of jsFiles) {
      if (readFileSync(f, 'utf8').includes('--functional-')) legacy.push(relative(ROOT, f));
    }
    assert.deepEqual(legacy, [], `组件仍在使用 --functional-*（应改 --status-*）：\n  ${legacy.join('\n  ')}`);
  });
  
  // ═════════════════════════════════════════════════════════════════════════════
  // T10：功能色分离（2026-10-27 Task 11.4）
  //   功能红/金只服务三会一课 / 主题党日等类别；与 danger / warning / 7 主题 accent
  //   逐值不同，文字 vs 徽章底 ≥4.5:1。
  // ═════════════════════════════════════════════════════════════════════════════
  test('T10 功能色分离：亮/暗齐备、与 danger/warning/主题 accent 不撞值、文字 ≥4.5:1', () => {
    const red = rootVar(STYLES, '--color-functional-red');
    const redDark = rootVar(STYLES, '--color-functional-red-dark');
    const gold = rootVar(STYLES, '--color-functional-gold');
    const goldDark = rootVar(STYLES, '--color-functional-gold-dark');
    const functional = [red, redDark, gold, goldDark].map((v) => v.toLowerCase());
    assert.deepEqual(functional, ['#ce1126', '#fca5a5', '#a16207', '#fcd34d'],
      `功能色应为红 #CE1126/#FCA5A5、金 #A16207/#FCD34D，实际 ${functional.join('/')}`);
  
    // 与状态色逐值不同（亮/暗两档都要核）
    for (const [mode, values] of [
      ['light', ['--status-error', '--status-warning']],
      ['dark', ['--status-error', '--status-warning']],
    ]) {
      const block = mode === 'light' ? STYLES : darkBlock(STYLES);
      for (const name of values) {
        const status = rootVar(block, name).toLowerCase();
        assert.ok(!functional.includes(status), `${mode} ${name}（${status}）不得等于任何功能色`);
      }
    }
  
    // 与 7 主题 × 亮/暗的所有 accent token 不撞值
    const collisions = [];
    for (const key of THEME_KEYS) {
      for (const mode of ['light', 'dark']) {
        for (const [name, value] of Object.entries(ACCENT_COLORS[key][mode])) {
          if (functional.includes(String(value).toLowerCase())) collisions.push(`${key}.${mode}.${name}=${value}`);
        }
      }
    }
    assert.deepEqual(collisions, [], `功能色不得与主题 accent 同值：${collisions.join(' ')}`);
  
    // 文字 vs 徽章底 ≥4.5:1
    const mixHex = (a, b, p) => {
      const [ar, ag, ab] = rgb(a);
      const [br, bg, bb] = rgb(b);
      return `#${[ar * p + br * (1 - p), ag * p + bg * (1 - p), ab * p + bb * (1 - p)]
        .map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
    };
    const redDarkBg = mixHex(red, '#0F172A', 0.16);
    const readings = [
      ['功能红/亮徽章底', contrast(red, '#FEF2F2')],
      ['功能金/亮徽章底', contrast(gold, '#FEF9C3')],
      ['功能红/暗徽章底', contrast(redDark, redDarkBg)],
      ['功能金/暗徽章底', contrast(goldDark, '#2E2510')],
    ].map(([label, ratio]) => `${label} ${ratio.toFixed(2)}:1`);
    console.log(`[theme-palette] T10 功能色对比度：${readings.join(' · ')}`);
    for (const [label, ratio] of [
      ['功能红/亮徽章底', contrast(red, '#FEF2F2')],
      ['功能金/亮徽章底', contrast(gold, '#FEF9C3')],
      ['功能红/暗徽章底', contrast(redDark, redDarkBg)],
      ['功能金/暗徽章底', contrast(goldDark, '#2E2510')],
    ]) {
      assert.ok(ratio >= 4.5, `${label} ${ratio.toFixed(2)}:1 < 4.5`);
    }
  });
  
  // ═════════════════════════════════════════════════════════════════════════════
  // T11：暗色色阶补齐（2026-10-31 P8）
  //   病灶：`--primary-50/100/200` 在 `html.theme-dark` 段完全没有反向，
  //   `.workflow-state-phase` 等亮暗两模式渲成同一块 `#FEF2F2`；`--color-identity-*`
  //   也只有 `-dark` 后缀档、基础名在暗色下仍取亮色值。
  //   判据：① 暗色段必须定义 primary-50/100/200 与全部 identity 基础名（缺一即红）；
  //         ② 抽 6 个真实元素（规则体 background 取 token），断言亮/暗解析值不同；
  //         ③ 暗色 primary-200（描边）≥3:1、primary-50 上的文字 ≥4.5:1、identity 暗色文字 ≥4.5:1。
  // ═════════════════════════════════════════════════════════════════════════════
  test('T11 暗色色阶：primary-50/100/200 与 identity 基础名全部有暗色值；6 个元素亮暗背景不同', () => {
    const dark = darkBlock(STYLES);
    assert.ok(dark, 'styles.css 缺少 html.theme-dark 块');
  
    /** 在指定块内解 var() 链；块内没有则回落全文件 :root */
    const resolveIn = (block, value) => {
      let v = String(value || '').trim();
      for (let i = 0; i < 8; i += 1) {
        const m = /^var\((--[a-z0-9-]+)\)$/i.exec(v);
        if (!m) break;
        const next = rootVar(block, m[1]) || rootVar(STYLES, m[1]);
        if (!next) break;
        v = next;
      }
      return v;
    };
  
    // ① primary 低阶三档
    for (const name of ['--primary-50', '--primary-100', '--primary-200']) {
      const darkRaw = rootVar(dark, name);
      assert.ok(darkRaw, `暗色段缺 ${name}（深色下会退回亮白块）`);
      const light = resolveIn('', rootVar(STYLES, name));
      const darkVal = resolveIn(dark, darkRaw);
      assert.match(darkVal, HEX_VALUE_RE, `${name} 暗色值解析不到 hex（${darkRaw}）`);
      assert.notEqual(darkVal.toLowerCase(), light.toLowerCase(), `${name} 亮/暗同值（${light}）：暗色段没有真正反向`);
    }
  
    // ② identity 基础名：全部 role（含 CSS 独有的 deputy-leader）
    const identityNames = [
      ...IDENTITY_ROLES.map((r) => `--color-identity-${r}`),
      '--color-identity-deputy-leader',
    ];
    assert.ok(identityNames.length >= 5, `identity 核对面过小（${identityNames.length}）`);
    for (const name of identityNames) {
      const darkRaw = rootVar(dark, name);
      assert.ok(darkRaw, `暗色段缺 ${name}（消费方写基础名时仍取亮色值）`);
      const light = resolveIn('', rootVar(STYLES, name));
      const darkVal = resolveIn(dark, darkRaw);
      assert.match(darkVal, HEX_VALUE_RE, `${name} 暗色值解析不到 hex（${darkRaw}）`);
      assert.notEqual(darkVal.toLowerCase(), light.toLowerCase(), `${name} 亮/暗同值（${light}）`);
      assert.equal(darkVal.toLowerCase(), resolveIn(dark, rootVar(STYLES, `${name}-dark`)).toLowerCase(),
        `${name} 暗色值应等于 -dark 档（单一源＝ROLE_COLORS.textDark）`);
    }
  
    // ③ 6 个真实元素：规则体的 backgroundColor token 在亮/暗下必须解析成不同值
    const elements = [
      ['.workflow-state-phase', '--primary-50'],
      ['.cal-cell-mobile.has-tasks:active', '--primary-50'],
      ['.branch-config-nav [aria-current="page"]', '--primary-50'],
      ['.ref-download-btn', '--primary-50'],
      ['.ref-download-btn:hover', '--primary-100'],
      ['.ref-doc-action-danger', '--primary-50'],
    ];
    const readings = [];
    for (const [selector, expected] of elements) {
      const body = ruleBody(STYLES, selector);
      assert.ok(body, `styles.css 缺少 ${selector} 规则`);
      const m = /background(?:-color)?:\s*var\((--[a-z0-9-]+)\)/i.exec(body);
      assert.ok(m, `${selector} 的 background 应为 var(--token)（实际：${body.trim().slice(0, 80)}）`);
      assert.equal(m[1], expected, `${selector} 的 background token 应为 ${expected}，实际 ${m[1]}`);
      const light = resolveIn('', rootVar(STYLES, m[1]));
      const darkVal = resolveIn(dark, rootVar(dark, m[1]));
      assert.notEqual(darkVal.toLowerCase(), light.toLowerCase(),
        `${selector} 亮/暗 backgroundColor 相同（${light}）：元素在深色下仍是亮块`);
      readings.push(`${selector} ${light} → ${darkVal}`);
    }
    assert.equal(readings.length, 6, `应核对 6 个元素，实际 ${readings.length}`);
    console.log(`[theme-palette] T11 亮/暗背景：${readings.join(' · ')}`);
  
    // ④ 对比度：描边 / 文字
    const p200 = resolveIn(dark, rootVar(dark, '--primary-200'));
    const p50 = resolveIn(dark, rootVar(dark, '--primary-50'));
    const p300 = resolveIn('', rootVar(STYLES, '--primary-300'));
    const border = contrast(p200, CARD_DARK);
    const text = contrast(p300, p50);
    assert.ok(border >= 3, `primary-200 暗色描边对深卡 ${border.toFixed(2)}:1 < 3`);
    assert.ok(text >= 4.5, `primary-300 文字对 primary-50 暗底 ${text.toFixed(2)}:1 < 4.5`);
    const identityRows = identityNames.map((name) => {
      const v = resolveIn(dark, rootVar(dark, name));
      return [name, contrast(v, CARD_DARK), contrast(v, '#0B1220')];
    });
    const bad = identityRows.filter(([, c]) => c < 4.5);
    assert.deepEqual(bad.map(([n]) => n), [], `identity 暗色对深卡 <4.5:1：${bad.map(([n, c]) => `${n}=${c.toFixed(2)}`).join(' ')}`);
    console.log(`[theme-palette] T11 对比度：primary-200/深卡 ${border.toFixed(2)} · primary-300/primary-50 暗底 ${text.toFixed(2)}`
      + ` · identity 暗色/深卡 最低 ${Math.min(...identityRows.map(([, c]) => c)).toFixed(2)}`);
  });
  
  // ═════════════════════════════════════════════════════════════════════════════
  //
  // 历史：该守卫原为「默认现代金 #F5C518 + 深色字」而设（2026-10-19）。
  // 批次 505 起主题色改为 **7 主题 × 亮/暗 × 8 个手选 hex**：金主题是更沉稳的琥珀金 #A97A12，
  // 实底/实底字/浅底/浅底字各自独立成 token，`filter: brightness`、`--app-accent-strong: var(--app-accent)`
  // `--app-accent-text: #1F2937` 等旧派生机制全部退场。本守卫改为锁「新 token 语义」，
  // 同时保留党徽金 / 党建红固定色的断言（它们不随主题变化）。
  //
  // 断言：
  //   G1 styles.css：无 #F5C518 / 无 brightness；默认金 8 token 齐备；旧派生写法绝迹；党徽金/党建红固定；
  //   G2 constants.js：gold 主题 8 token 为手选 hex；accentButtonColors 查表返回 strongBg/strongInk；
  //   G3 四个注入点都走 applyAccentThemeTokens / getAccentColors（16 个原始变量），不再写旧三件套；
  //   G4 内存样本：gold 实底 #9A6B0F + 白字、red 实底 #9B2C22 + 白字；非法入参回落 gold（不是 var()）；
  //   G5 文字色/焦点环：浅底深字只走 --app-accent-soft-text；不得直接用裸 var(--app-accent)。
  
  test('G1 styles.css：默认金 8 token 齐备；无 #F5C518 / brightness / 旧派生；固定语义色不动', () => {
    // 注释里会写「2026-10-23 Task 7：hover 不再用 filter: brightness」，负例先剥注释再判。
    const bare = STYLES.replace(/\/\*[\s\S]*?\*\//g, '');
    // 旧实现退场：真金 #F5C518 与亮度派生都不得回来
    assert.doesNotMatch(bare, /#F5C518/i, 'styles.css 不得再出现旧默认金 #F5C518');
    assert.doesNotMatch(bare, /filter\s*:\s*brightness/i, 'hover 不得再用 filter: brightness（改用 hoverBg）');
    assert.doesNotMatch(bare, /--app-accent-strong\s*:\s*var\(--app-accent\)\s*;/,
      '--app-accent-strong 不得退回「本色」别名（实底必须查 strongBg）');
    assert.doesNotMatch(bare, /--app-accent-text\s*:\s*#1F2937/i,
      '--app-accent-text 不得退回中性近黑（浅底字必须查 softText）');
  
    // 默认金（:root 的亮/暗两套原始变量）
    const light = ACCENT_COLORS.gold.light;
    const dark = ACCENT_COLORS.gold.dark;
    for (const [suffix, value] of [
      ['base', light.base], ['soft-bg', light.softBg], ['soft-border', light.softBorder],
      ['soft-text', light.softText], ['strong-bg', light.strongBg], ['strong-ink', light.strongInk],
      ['hover-bg', light.hoverBg], ['active-bg', light.activeBg],
    ]) {
      assert.match(STYLES, new RegExp(`--app-accent-${suffix}-light:\\s*${value}\\s*;`, 'i'),
        `styles.css 缺少默认金 --app-accent-${suffix}-light: ${value}`);
    }
    for (const [suffix, value] of [
      ['base', dark.base], ['soft-bg', dark.softBg], ['soft-border', dark.softBorder],
      ['soft-text', dark.softText], ['strong-bg', dark.strongBg], ['strong-ink', dark.strongInk],
      ['hover-bg', dark.hoverBg], ['active-bg', dark.activeBg],
    ]) {
      assert.match(STYLES, new RegExp(`--app-accent-${suffix}-dark:\\s*${value}\\s*;`, 'i'),
        `styles.css 缺少默认金 --app-accent-${suffix}-dark: ${value}`);
    }
    // 亮/暗选边别名
    assert.match(STYLES, /--app-accent-strong-bg:\s*var\(--app-accent-strong-bg-light\)/,
      '--app-accent-strong-bg 应指向 *-light（亮色选边）');
    assert.match(STYLES, /--app-accent-soft-text:\s*var\(--app-accent-soft-text-light\)/,
      '--app-accent-soft-text 应指向 *-light（亮色选边）');
  
    // 固定语义色：党徽金 / 党建红不随主题变化
    assert.match(STYLES, /--party-gold:\s*#FFD700\s*;/, '党徽金应固定为 #FFD700');
    assert.match(STYLES, /--party-red:\s*#CE1126\s*;/, '党建红应固定为 #CE1126');
    assert.doesNotMatch(STYLES, /--party-gold:\s*var\(--app-accent/, '党徽金不得指向主题色');
  });
  
  test('G2 constants.js：gold 主题 8 token 为手选 hex；accentButtonColors 查表', () => {
    const g = ACCENT_COLORS.gold;
    assert.equal(g.light.base, '#A97A12', 'docs/src/core/domain/constants.js：gold.light.base 应为沉稳琥珀金 #A97A12');
    assert.equal(g.light.softBg, '#FBF3DC', 'docs/src/core/domain/constants.js：gold.light.softBg 应为 #FBF3DC');
    assert.equal(g.light.softBorder, '#E8D5A3', 'docs/src/core/domain/constants.js：gold.light.softBorder 应为 #E8D5A3');
    assert.equal(g.light.softText, '#6E4E08', 'docs/src/core/domain/constants.js：gold.light.softText 应为 #6E4E08');
    assert.equal(g.light.strongBg, '#9A6B0F', 'docs/src/core/domain/constants.js：gold.light.strongBg 应为 #9A6B0F');
    assert.equal(g.light.strongInk, '#FFFFFF', 'docs/src/core/domain/constants.js：gold.light.strongInk 应为白字');
    assert.equal(g.light.hoverBg, '#F6EAC6', 'docs/src/core/domain/constants.js：gold.light.hoverBg 应为 #F6EAC6');
    assert.equal(g.light.activeBg, '#F0DFAC', 'docs/src/core/domain/constants.js：gold.light.activeBg 应为 #F0DFAC');
    assert.equal(g.dark.strongBg, '#C89A34', 'docs/src/core/domain/constants.js：gold.dark.strongBg 应为 #C89A34');
    assert.equal(g.dark.strongInk, '#1E1503', 'docs/src/core/domain/constants.js：gold.dark.strongInk 应为深字 #1E1503');
  
    assert.match(CONSTANTS, /export function accentButtonColors/, 'constants.js 应导出 accentButtonColors');
    assert.equal(typeof accentButtonColors, 'function', 'accentButtonColors 应可直接 import');
    // 2026-10-24 批次 508：第 9 token strongHover 一并返回（实底 hover 同色相加深）。
    assert.match(CONSTANTS, /return \{ bg: t\.strongBg, text: t\.strongInk, strong: t\.strongBg, ink: t\.strongInk, strongHover: t\.strongHover \};/,
      'accentButtonColors 应直接查表返回 strongBg / strongInk / strongHover（无亮度分流）');
  });
  
  test('G3 四个注入点都走 16 个原始变量（applyAccentThemeTokens / getAccentColors）', () => {
    const sites = [
      'docs/src/core/boot/theme.js',
      'docs/src/core/boot/bootstrap.js',
      'docs/src/entries/pages/settings-entry.js',
      'docs/src/components/governance/org-setup-wizard.js',
    ];
    for (const rel of sites) {
      const src = read(rel);
      assert.match(src, /(applyAccentThemeTokens|getAccentColors)\(/, `${rel} 应经主题表取色 / 注入（不写死旧三件套）`);
      assert.doesNotMatch(src, /--app-accent-text',\s*btn\.text/, `${rel} 不应再写旧 --app-accent-text 三件套`);
      assert.doesNotMatch(src, /--app-accent-strong',\s*btn\.strong/, `${rel} 不应再写旧 --app-accent-strong 三件套`);
    }
    // 原始变量清单 = 9 个 token × 亮/暗（批次 508 增补 strong-hover）
    const theme = read('docs/src/core/boot/theme.js');
    assert.match(theme, /const ACCENT_TOKEN_SUFFIXES = \['base', 'soft-bg', 'soft-border', 'soft-text', 'strong-bg', 'strong-ink', 'strong-hover', 'hover-bg', 'active-bg'\]/,
      'theme.js 应一次注入 9 个 token 的亮/暗两套');
    assert.match(theme, /--app-accent-\$\{suffix\}-light/, 'theme.js 应写 *-light 原始变量');
    assert.match(theme, /--app-accent-\$\{suffix\}-dark/, 'theme.js 应写 *-dark 原始变量');
  });
  
  test('G4 内存样本：gold 实底白字 / red 实底白字 / 非法入参回落 gold', () => {
    const gold = accentButtonColors('gold');
    assert.equal(gold.strong, '#9A6B0F', 'gold 实底应为 strongBg #9A6B0F');
    assert.equal(gold.ink, '#FFFFFF', 'gold 实底字应为 strongInk #FFFFFF');
    assert.equal(gold.bg, '#9A6B0F', '旧字段 bg 应指向 strongBg');
  
    const red = accentButtonColors('red');
    assert.equal(red.strong, '#9B2C22', 'red 实底应为 strongBg #9B2C22');
    assert.equal(red.ink, '#FFFFFF', 'red 实底字应为白字');
  
    // 暗色档按表取 *-dark
    const goldDark = accentButtonColors('gold', 'dark');
    assert.equal(goldDark.strong, '#C89A34', 'gold 暗色实底应为 #C89A34');
    assert.equal(goldDark.ink, '#1E1503', 'gold 暗色实底字应为 #1E1503');
  
    // 非法输入兜底：不崩溃、回落到 gold 主题（不是运行时 var()）
    assert.deepEqual(accentButtonColors(''), {
      bg: '#9A6B0F', text: '#FFFFFF', strong: '#9A6B0F', ink: '#FFFFFF', strongHover: '#91650D',
    }, '非法入参应回落 gold 主题的显式 token');
  });
  
  test('G5 浅底深字：不得直接用裸 var(--app-accent)；焦点环只用 --app-accent', () => {
    const textRules = [
      '.text-accent',
      '.chip-option:hover',
      '.chip-accent-on',
      '.sel-accent-on',
      'button.metric-band__item.is-active .stat-card__label',
      '.page-num.is-current',
      '.wp-dim-chip.wp-dim-on',
      '.wp-brand-chip.wp-brand-on',
      '.wp-agenda-kind.wp-agenda-kind-on',
      '.cs-option.is-selected',
      '.accent-avatar',
      '.badge--accent',
    ];
    for (const selector of textRules) {
      const body = ruleBody(STYLES, selector);
      assert.ok(body, `styles.css 缺少 ${selector} 规则`);
      assert.match(body, /(?:^|[;\s])color:\s*var\(--app-accent-soft-text\)/,
        `${selector} 的文字色应走 --app-accent-soft-text（浅底深字显式查表）`);
      assert.doesNotMatch(body, /(?:^|[;\s])color:\s*var\(--app-accent\)\s*(?:!important)?\s*;/,
        `${selector} 仍在使用裸 var(--app-accent) 作文字色`);
    }
  
    const focusRules = [
      'button:focus-visible',
      '.ws-tab-scroll button:focus-visible',
      '.notif-dropdown-item:focus-visible',
      '.status-badge:focus-visible',
      'button.metric-band__item:focus-visible',
      // 2026-10-29 P1：行焦点三种写法合并为 `[data-interactive="true"]` 单一来源；
      //   行内焦点工具类统一走语义类 `.focus-ring`（同一几何）。
      '[data-interactive="true"]:focus-visible',
      '.focus-ring:focus-visible',
      '.todo-more__item:focus-visible',
      // 2026-10-28（支书裁定「消除假反馈」）：画廊卡的唯一交互元素是标题链，焦点环由它承担；
      //   原先挂在整卡上的 `.gallery-card:focus-visible` 已删除（卡片不进 tab 序列 ⇒ 不可达的死规则）。
      '.gallery-card__open:focus-visible',
    ];
    for (const selector of focusRules) {
      const body = ruleBody(STYLES, selector);
      assert.ok(body, `styles.css 缺少 ${selector} 规则`);
      // 2026-10-28 支书裁定：焦点环只用主题色 --app-accent（2px / offset 1px / 无 box-shadow）。
      assert.match(body, /outline:\s*2px solid var\(--app-accent\)/,
        `${selector} 的焦点环应使用主题色 --app-accent`);
      assert.match(body, /outline-offset:\s*1px\s*;/, `${selector} 的焦点环偏移应为 1px`);
      assert.match(body, /box-shadow:\s*none\s*;/, `${selector} 的焦点环不得再叠 box-shadow 光晕`);
      assert.doesNotMatch(body, /--focus-ring/, `${selector} 不得再引用旧 --focus-ring`);
    }
  
    // 反向判据（不降强度）：整卡既不可聚焦也不可点 ⇒ 不得残留环／手型光标。
    assert.equal(ruleBody(STYLES, '.gallery-card:focus-visible'), '',
      '整卡不可聚焦 ⇒ 不得再有 .gallery-card:focus-visible（焦点环由 .gallery-card__open 承担）');
    assert.doesNotMatch(ruleBody(STYLES, '.gallery-card'), /cursor:\s*pointer/,
      '.gallery-card 整卡不可点 ⇒ 不得有 cursor: pointer（看着能点其实点不动的假反馈）');
  });
  
  // ═════════════════════════════════════════════════════════════════════════════
  // T12–T13：颜色单一权威（2026-11-04 批次 534 · spec unify-ui-signals Task 5.1）
  //   权威＝`docs/src/styles.css`；`tailwind-config.js` 与 `constants.js` 只是**受守卫的镜像**。
  //   病灶：tailwind 里 `surface.page '#F8F9FA'` 与 `--surface-page #FAFAF5` 早已漂移；
  //     没有任何守卫核对镜像值 ⇒ 「改一处颜色」实际要改三处，忘一处就出现同屏两种色。
  //   判据：① 逐值相等（`var()` 解析到底色后比较，大小写归一）；
  //         ② 键集固定（删键 / 改名不得让守卫少核）；
  //         ③ 反例：改一个镜像值必须判红（防解析写坏恒真）。
  // ═════════════════════════════════════════════════════════════════════════════
  
  const TAILWIND_SRC = read('docs/src/tailwind-config.js');
  const norm = (v) => String(v == null ? '' : v).replace(/\s+/g, '').toLowerCase();
  
  /** 权威令牌（styles.css）解析到底色；解析不到返回空串（⇒ 必然判红，不会静默放行） */
  const tokenValue = (css, name) => {
    const raw = rootVar(css, name);
    return raw ? resolveVarChain(css, raw) : '';
  };
  
  /** tailwind 颜色组 → styles.css 令牌（键集是判据的一部分：删键也红） */
  const TW_EXPECTED = {
    party: {
      DEFAULT: '--party-red', red: '--party-red', gold: '--party-gold', 'gold-light': '--party-gold-light',
      50: '--primary-50', 100: '--primary-100', 200: '--primary-200', 300: '--primary-300',
      400: '--primary-400', 500: '--primary-500', 600: '--primary-600', 700: '--primary-700',
      800: '--primary-800', 900: '--primary-900', 950: '--primary-950',
    },
    primary: {
      50: '--primary-50', 100: '--primary-100', 200: '--primary-200', 300: '--primary-300',
      400: '--primary-400', 500: '--primary-500', 600: '--primary-600', 700: '--primary-700',
      800: '--primary-800', 900: '--primary-900', 950: '--primary-950',
    },
    neutral: {
      0: '--neutral-0', 50: '--neutral-50', 100: '--neutral-100', 200: '--neutral-200',
      300: '--neutral-300', 400: '--neutral-400', 500: '--neutral-500', 600: '--neutral-600',
      700: '--neutral-700', 800: '--neutral-800', 900: '--neutral-900',
    },
    surface: {
      page: '--surface-page', card: '--surface-card', elevated: '--surface-elevated',
      header: '--surface-header', sidebar: '--surface-sidebar', hover: '--surface-hover', active: '--surface-active',
    },
  };
  
  /** ACCENT_COLORS 的 JS 键 → styles.css `--app-accent-*` 后缀 */
  const ACCENT_TOKEN_SUFFIX = {
    base: 'base', softBg: 'soft-bg', softBorder: 'soft-border', softText: 'soft-text',
    strongBg: 'strong-bg', strongInk: 'strong-ink', strongHover: 'strong-hover',
    hoverBg: 'hover-bg', activeBg: 'active-bg',
  };
  
  /**
   * 在隔离的 `window` 上执行 tailwind 配置脚本，取回 colors 表。
   * 为什么不用 import：配置文件是 `window.tailwind.config = …` 形态，且要做「改源文本再解析」的反例。
   * @param {string} src — tailwind-config.js 源码
   * @returns {Object} colors 表
   */
  function parseTailwindColors(src) {
    const fn = new Function('window', `${src}\n;return window.tailwind.config.theme.extend.colors;`);
    return fn({});
  }
  
  /**
   * 纯判据：逐对比较镜像值与权威值。
   * @param {Array<{label:string, actual:string, expected:string}>} pairs
   * @returns {string[]} 漂移项（空＝镜像与权威一致）
   */
  function mirrorDrift(pairs) {
    return pairs
      .filter((p) => norm(p.actual) !== norm(p.expected))
      .map((p) => `${p.label}：镜像 ${p.actual || '（缺）'} ≠ 权威 ${p.expected || '（缺）'}`);
  }
  
  /** tailwind mirror 对（actual 先按 styles.css 解 var() 链，再与权威逐值比较） */
  function tailwindMirrorPairs(colors, css) {
    const pairs = [];
    for (const [group, expectedMap] of Object.entries(TW_EXPECTED)) {
      for (const [key, token] of Object.entries(expectedMap)) {
        const raw = colors?.[group]?.[key];
        pairs.push({
          label: `tailwind ${group}.${key}`,
          actual: raw ? resolveVarChain(css, raw) : '',
          expected: tokenValue(css, token),
        });
      }
    }
    return pairs;
  }
  
  /** constants.js mirror 对（ACCENT_COLORS 默认主题 9 token ＋ ROLE_COLORS text / textDark）
   *  为什么只核对默认主题：`styles.css :root` 只定义默认 gold 的 18 个原始变量；其余 6 主题由
   *  `theme.js::applyAccentThemeTokens` 在运行时注入，CSS 里没有同名令牌可对照（其色值合法性由 T1/T2 管）。 */
  function constantsMirrorPairs(colors = ACCENT_COLORS, roles = ROLE_COLORS, css = STYLES, theme = 'gold') {
    const pairs = [];
    const entry = colors[theme];
    for (const mode of ['light', 'dark']) {
      for (const [key, suffix] of Object.entries(ACCENT_TOKEN_SUFFIX)) {
        pairs.push({
          label: `ACCENT_COLORS.${theme}.${mode}.${key}`,
          actual: entry?.[mode]?.[key],
          expected: tokenValue(css, `--app-accent-${suffix}-${mode}`),
        });
      }
    }
    for (const [role, roleEntry] of Object.entries(roles)) {
      pairs.push({ label: `ROLE_COLORS.${role}.text`, actual: roleEntry.text, expected: tokenValue(css, `--color-identity-${role}`) });
      pairs.push({ label: `ROLE_COLORS.${role}.textDark`, actual: roleEntry.textDark, expected: tokenValue(css, `--color-identity-${role}-dark`) });
    }
    return pairs;
  }
  
  test('T12 tailwind 镜像 = styles.css 权威：party / primary / neutral / surface 逐值相等（含反例）', () => {
    const colors = parseTailwindColors(TAILWIND_SRC);
    // 键集固定：删键 / 改名不得让守卫少核
    for (const [group, expectedMap] of Object.entries(TW_EXPECTED)) {
      assert.ok(colors[group], `tailwind-config.js 缺少颜色组 ${group}`);
      assert.deepEqual(Object.keys(colors[group]).sort(), Object.keys(expectedMap).sort(),
        `tailwind ${group} 的键集与权威映射不一致（删键 / 改名 / 新增都要同批登记）`);
    }
  
    const pairs = tailwindMirrorPairs(colors, STYLES);
    const expectedCount = Object.values(TW_EXPECTED).reduce((n, m) => n + Object.keys(m).length, 0);
    assert.equal(pairs.length, expectedCount, `应核 ${expectedCount} 对，实际 ${pairs.length}：非空转`);
    // 权威侧必须解析到真 hex（否则 token 名写错也会「两边都空」而恒绿）
    const unresolved = pairs.filter((p) => !/^#[0-9a-f]{6}$/.test(norm(p.expected)));
    assert.deepEqual(unresolved.map((p) => p.label), [], `权威令牌解析不到 hex：${unresolved.map((p) => p.label).join(' ')}`);
    assert.deepEqual(mirrorDrift(pairs), [], `tailwind 镜像与 styles.css 漂移：\n  ${mirrorDrift(pairs).join('\n  ')}`);
  
    // 反例①：内存里改一个镜像值 ⇒ 必须判红
    const badColors = JSON.parse(JSON.stringify(colors));
    badColors.party.red = '#CE1127';
    assert.equal(mirrorDrift(tailwindMirrorPairs(badColors, STYLES)).length, 1,
      '反例未命中：改 party.red 后应恰好报 1 条漂移');
    // 反例②：改**源文本**再解析 ⇒ 必须判红（证明整条「解析 → 比较」链路有效，不只是比较函数有效）
    const tampered = TAILWIND_SRC.replace("party: { DEFAULT:'var(--party-red)'", "party: { DEFAULT:'#CE1127'");
    assert.notEqual(tampered, TAILWIND_SRC, '反例构造失败：源文本替换未生效（tailwind 结构变了要同步改本守卫）');
    assert.ok(mirrorDrift(tailwindMirrorPairs(parseTailwindColors(tampered), STYLES))
      .some((p) => p.startsWith('tailwind party.DEFAULT')),
    '反例未命中：源文本把 party.DEFAULT 改成 #CE1127 应判红');
    console.log('[theme-palette] T12 tailwind 镜像核对：'
      + `${pairs.length} 对一致（party 15 / primary 11 / neutral 11 / surface 7）`);
  });
  
  test('T13 constants.js 镜像 = styles.css 权威：ACCENT_COLORS(gold) 全 token ＋ ROLE_COLORS 文字色（含反例）', () => {
    const pairs = constantsMirrorPairs();
    assert.ok(pairs.length >= 2 * 9 + 20, `应核 ≥${2 * 9 + 20} 对，实际 ${pairs.length}：非空转`);
    const unresolved = pairs.filter((p) => !/^#[0-9a-f]{6}$/.test(norm(p.expected)));
    assert.deepEqual(unresolved.map((p) => p.label), [], `权威令牌解析不到 hex：${unresolved.map((p) => p.label).join(' ')}`);
    assert.deepEqual(mirrorDrift(pairs), [], `constants.js 镜像与 styles.css 漂移：\n  ${mirrorDrift(pairs).join('\n  ')}`);
  
    // 反例：改一个镜像值 ⇒ 必须判红
    const badColors = JSON.parse(JSON.stringify(ACCENT_COLORS));
    badColors.gold.light.base = '#000000';
    const bad = mirrorDrift(constantsMirrorPairs(badColors));
    assert.equal(bad.length, 1, `反例未命中：改 ACCENT_COLORS.gold.light.base 后应恰好报 1 条漂移（实为 ${bad.length}）`);
    assert.ok(bad[0].startsWith('ACCENT_COLORS.gold.light.base'), '反例报错项定位不对');
    const badge = JSON.parse(JSON.stringify(ROLE_COLORS));
    badge.leader.text = '#000000';
    assert.ok(mirrorDrift(constantsMirrorPairs(ACCENT_COLORS, badge)).some((p) => p.startsWith('ROLE_COLORS.leader.text')),
      '反例未命中：改 ROLE_COLORS.leader.text 应判红');
    console.log(`[theme-palette] T13 constants 镜像核对：${pairs.length} 对一致（ACCENT gold 18 + ROLE ${pairs.length - 18}）`);
  });

})();

// ═══ 源件 3：status-color-guard.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // status-color-guard.test.mjs — 状态色「填充档 / 文字档」两层守卫（2026-10-31 P8）
  //
  // 病灶（本守卫立项时的实测）：
  //   · `--status-success` #10B981 作正文 / 数值（对白卡）仅 2.54:1；
  //   · `--status-error` #EF4444 作必填星号等正文（19 处）仅 3.76:1；
  //   · `--status-info` #3B82F6 作正文 3.68:1。
  //   三者都低于 WCAG AA 正文 4.5:1。修法不是改填充色（它会破坏徽章底 / 圆点观感），
  //   而是拆两层：填充档只进徽章底 / 圆点 / 左条 / 图例；任何 `color:` 一律走 `--status-*-text`。
  //
  // 判据：
  //   S1 填充档出现在 `color:` 即红（CSS 声明与 JS 内联 style 同判；白名单只允许文字档与中性色）。
  //      含反例：合成串写回 `color: var(--status-success)` 必须被判出（防正则写坏恒真）。
  //   S2 三个文字档（success / error / info）亮暗逐色断言：对白卡 / 暖纸页底 / 深卡 / 暗页 ≥4.5:1，
  //      并打印逐色读数；warning 文字档一并复核。
  //   S3 关键 token 的文档值与实现值一致：status 四族 ＋ 三个文字档（§2.5）、surface 全部行（§2.6）、
  //      identity 全部行（§2.3.2）。含反例：把文档值改成旧值必须判红。
  //
  // 运行：node --test server/test/status-color-guard.test.mjs
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync, readdirSync } = await import('node:fs');
  const { join, dirname, relative } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const HERE = dirname(fileURLToPath(import.meta.url));
  const ROOT = join(HERE, '..', '..');
  const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
  
  const CSS = read('docs/src/styles.css');
  const DS01 = read('content/04_web_design/design-system/DS_01_COLOR_AND_THEME.md');
  
  const FILL_TOKENS = ['success', 'warning', 'error', 'info'];
  const TEXT_TOKENS = ['success', 'warning', 'error', 'info'];
  const WHITE = '#FFFFFF';
  const PAGE_LIGHT = '#FAFAF5';
  const CARD_DARK = '#141D2F';
  const PAGE_DARK = '#0B1220';
  const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
  
  // ── 颜色工具（WCAG 2.x；与 ui-contrast-guard / theme-palette-guard 同式） ──
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const rgb = (hex) => {
    const h = String(hex).replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  const luminance = (hex) => {
    const [r, g, b] = rgb(hex);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const contrast = (a, b) => {
    const la = luminance(a);
    const lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  
  /** 取 :root / 指定块内某变量值（先剥注释） */
  function varIn(block, name) {
    const clean = String(block).replace(/\/\*[\s\S]*?\*\//g, '');
    const m = new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(clean);
    return m ? m[1].trim() : '';
  }
  
  /** 取 html.theme-dark 块（大括号配对；与 theme-palette-guard 同口径） */
  function darkBlock(css) {
    const src = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const i = src.indexOf('html.theme-dark {');
    if (i < 0) return '';
    const start = src.indexOf('{', i);
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
  
  /**
   * 纯判据：从源码中找出「填充档出现在 color:」的位置。
   * 只认真正的 `color:`（`border-color:` / `background-color:` 因前置 `-` 不命中），
   * `var(--status-success-text)` 因右括号不紧跟 token 名不命中。
   * @param {string} src — CSS 或 JS 源码
   * @returns {string[]} 违规片段（空数组＝合法）
   */
  function findStatusFillTextViolations(src) {
    const clean = String(src)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
    const hits = [];
    const re = /(?:^|[;{"'\s])color\s*:\s*([^;"'}]+)/g;
    for (const m of clean.matchAll(re)) {
      const value = m[1].trim();
      if (/var\(--status-(?:success|warning|error|info)\)/.test(value)) hits.push(value);
    }
    return hits;
  }
  
  /** 递归收集 docs/src 下 .css / .js */
  function walk(dir, out = []) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (['vendor', 'fonts', 'images'].includes(e.name)) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p, out);
      else if (/\.(css|js)$/.test(e.name)) out.push(p);
    }
    return out;
  }
  
  test('S1 填充档只进徽章 / 圆点 / 左条 / 图例：出现在 color: 即红（含反例）', () => {
    // 反例：合成串必须被判出（否则正则写坏 ⇒ 恒绿）
    assert.deepEqual(findStatusFillTextViolations('a{color: var(--status-success);}').length, 1,
      '反例未命中：写回 color: var(--status-success) 应判红（守卫正则失效）');
    assert.deepEqual(findStatusFillTextViolations('a{color:var(--status-info)}').length, 1,
      '反例未命中：无空格写法 color:var(--status-info) 应判红');
    // 负例：文字档 / 中性色 / 边框属性不误伤
    assert.deepEqual(findStatusFillTextViolations('a{color: var(--status-success-text);}'), [],
      '误伤：--status-success-text 是文字档，应放行');
    assert.deepEqual(findStatusFillTextViolations('a{color: var(--neutral-600);}'), [],
      '误伤：中性色应放行');
    assert.deepEqual(findStatusFillTextViolations('a{border-color: var(--status-error); background-color: var(--status-error);}'), [],
      '误伤：border-color / background-color 是填充用法，应放行');
  
    const files = walk(join(ROOT, 'docs', 'src'));
    assert.ok(files.length >= 100, `扫描面过小（${files.length} 个文件）：判据可能失效`);
    const offenders = [];
    for (const f of files) {
      const hits = findStatusFillTextViolations(readFileSync(f, 'utf8'));
      if (hits.length) offenders.push(`${relative(ROOT, f).replace(/\\/g, '/')} → ${hits.join(' / ')}`);
    }
    assert.deepEqual(offenders, [],
      `以下位置仍把状态填充色当文字色（改 --status-*-text）：\n  ${offenders.join('\n  ')}`);
  
    // 非空转：三个文字档 token 必须真实存在（防止「全改成不存在的名字」也绿）
    for (const key of ['success', 'error', 'info']) {
      const v = varIn(CSS, `--status-${key}-text`);
      assert.match(v, HEX_RE, `styles.css 缺 --status-${key}-text 亮色值`);
      assert.match(varIn(darkBlock(CSS), `--status-${key}-text`), HEX_RE, `暗色段缺 --status-${key}-text`);
    }
  });
  
  test('S2 文字档逐色对比度：亮（白卡 / 页底）与暗（深卡 / 暗页）均 ≥4.5:1', () => {
    const dark = darkBlock(CSS);
    const rows = [];
    const problems = [];
    for (const key of TEXT_TOKENS) {
      const light = varIn(CSS, `--status-${key}-text`);
      const dk = varIn(dark, `--status-${key}-text`);
      assert.match(light, HEX_RE, `缺 --status-${key}-text 亮色值`);
      assert.match(dk, HEX_RE, `缺 --status-${key}-text 暗色值`);
      const pairs = [
        ['白卡', light, WHITE],
        ['页底', light, PAGE_LIGHT],
        ['深卡', dk, CARD_DARK],
        ['暗页', dk, PAGE_DARK],
      ];
      const cells = pairs.map(([label, fg, bg]) => {
        const ratio = contrast(fg, bg);
        if (ratio < 4.5) problems.push(`${key}-text ${label} ${ratio.toFixed(2)}:1 < 4.5`);
        return `${label} ${ratio.toFixed(2)}`;
      });
      rows.push(`${key}-text（亮 ${light} / 暗 ${dk}）：${cells.join(' · ')}`);
    }
    console.log(`[status-color] 文字档对比度实测：\n  ${rows.join('\n  ')}`);
    assert.equal(rows.length, 4, `应核对 4 个文字档，实际 ${rows.length}`);
    assert.deepEqual(problems, [], `状态文字档对比度不达标：\n  ${problems.join('\n  ')}`);
  });
  
  // ── S3 文档值 ↔ 实现值 ────────────────────────────────────────────────
  /** 截取两个标题之间的正文 */
  function section(doc, startMarker, endMarker) {
    const i = doc.indexOf(startMarker);
    if (i < 0) return '';
    const j = doc.indexOf(endMarker, i + startMarker.length);
    return j < 0 ? doc.slice(i) : doc.slice(i, j);
  }
  
  /**
   * 纯判据：比对 §2.5 功能色 / §2.6 表面色 / §2.3.2 身份色三张表的文档值与 styles.css。
   * @returns {string[]} 不一致项（空＝一致）
   */
  function docImplMismatches(docText, cssText) {
    const dark = darkBlock(cssText);
    const out = [];
    const norm = (v) => String(v).replace(/[`\s]/g, '').toLowerCase();
  
    // §2.5 功能色：| token | 别名 | 亮 | 暗 | 用途 |
    const statusSec = section(docText, '### 2.5 功能色', '### 2.6 表面色');
    const statusRows = [...statusSec.matchAll(/^\|\s*`(--status-[a-z-]+)`\s*\|[^|]*\|\s*`?(#[0-9A-Fa-f]{6})`?\s*\|\s*`?(#[0-9A-Fa-f]{6})`?\s*\|/gm)];
    for (const m of statusRows) {
      const [, name, lightDoc, darkDoc] = m;
      const lightImpl = varIn(cssText, name);
      const darkImpl = varIn(dark, name);
      if (norm(lightDoc) !== norm(lightImpl)) out.push(`§2.5 ${name} 亮色 文档 ${lightDoc} ≠ 实现 ${lightImpl || '（缺）'}`);
      if (norm(darkDoc) !== norm(darkImpl)) out.push(`§2.5 ${name} 暗色 文档 ${darkDoc} ≠ 实现 ${darkImpl || '（缺）'}`);
    }
  
    // §2.6 表面色：| token | 值 | 色块 | 用途 |
    const surfaceSec = section(docText, '### 2.6 表面色', '### 2.7 ');
    const surfaceRows = [...surfaceSec.matchAll(/^\|\s*`(--surface-[a-z-]+)`\s*\|\s*([^|]+?)\s*\|/gm)];
    for (const m of surfaceRows) {
      const [, name, cell] = m;
      const docValue = (cell.match(/var\(--[a-z0-9-]+\)|#[0-9A-Fa-f]{6}/) || [])[0];
      const impl = varIn(cssText, name);
      if (!docValue) out.push(`§2.6 ${name} 文档值无法解析：${cell}`);
      else if (norm(docValue) !== norm(impl)) out.push(`§2.6 ${name} 文档 ${docValue} ≠ 实现 ${impl || '（缺）'}`);
    }
  
    // §2.3.2 身份色：| token | 亮色 | 暗色 | … |
    const identitySec = section(docText, '#### 2.3.2', '### 2.4 ');
    const identityRows = [...identitySec.matchAll(/^\|\s*`--color-identity-([a-z-]+)`\s*\|\s*`?(#[0-9A-Fa-f]{6})`?\s*\|\s*`?(#[0-9A-Fa-f]{6})`?/gm)];
    for (const m of identityRows) {
      const [, role, lightDoc, darkDoc] = m;
      const lightImpl = varIn(cssText, `--color-identity-${role}`);
      const darkImpl = varIn(cssText, `--color-identity-${role}-dark`);
      if (norm(lightDoc) !== norm(lightImpl)) out.push(`§2.3.2 --color-identity-${role} 亮色 文档 ${lightDoc} ≠ 实现 ${lightImpl || '（缺）'}`);
      if (norm(darkDoc) !== norm(darkImpl)) out.push(`§2.3.2 --color-identity-${role} 暗色 文档 ${darkDoc} ≠ 实现 ${darkImpl || '（缺）'}`);
    }
  
    // 非空转：三张表各自必须解析到规模（防止表格被删 / 解析写坏 ⇒ 恒空）
    if (statusRows.length < 7) out.push(`§2.5 功能色表只解析到 ${statusRows.length} 行（应 ≥7：四填充档 ＋ 三文字档）`);
    if (surfaceRows.length < 3) out.push(`§2.6 表面色表只解析到 ${surfaceRows.length} 行（应 ≥3）`);
    if (identityRows.length < 5) out.push(`§2.3.2 身份色表只解析到 ${identityRows.length} 行（应 ≥5）`);
    return out;
  }
  
  test('S3 文档值 = 实现值：status 四族 / surface / identity（含旧值反例）', () => {
    assert.deepEqual(docImplMismatches(DS01, CSS), [],
      '规范文档色值与 styles.css 不一致（改了实现或文档只改了一边）');
  
    // 反例①：surface-hover 写回旧值 #F3F4F6 必须判红
    const badSurface = DS01.replace('`var(--neutral-200)`（`#E5E7EB`）', '`#F3F4F6`');
    assert.ok(docImplMismatches(badSurface, CSS).some((x) => x.includes('--surface-hover')),
      '反例未命中：§2.6 写回旧值 #F3F4F6 应判红');
  
    // 反例②：status-success-text 写回填充色必须判红
    const badStatus = DS01.replace('`--status-success-text` | — | `#047857`', '`--status-success-text` | — | `#10B981`');
    assert.ok(docImplMismatches(badStatus, CSS).some((x) => x.includes('--status-success-text')),
      '反例未命中：§2.5 文字档写回填充色应判红');
  
    // 反例③：identity 写回已删除的旧值必须判红
    const badIdentity = DS01.replace('| `--color-identity-organizer` | `#0369A1`', '| `--color-identity-organizer` | `#7DD3FC`');
    assert.ok(docImplMismatches(badIdentity, CSS).some((x) => x.includes('--color-identity-organizer')),
      '反例未命中：§2.3.2 写回旧值 #7DD3FC 应判红');
  });

})();

// ═══ 源件 4：status-palette-text-guard.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // server/test/status-palette-text-guard.test.mjs — 状态文字禁用 Tailwind 调色板（2026-11-21 批次 587）
  //
  // 判据（`H40.3-2`、`DS_03` SD-46 / §4.21.2）：
  //   ① 状态 / 提示文字只走 `--status-*-text` 或 `--neutral-*`；`docs/src` 的 `text-(amber|green|red|blue|emerald|rose|orange)-<n>`
  //      按文件计数只减不增（存量基线 286 处；新文件出现即红）。
  //   ② 卡片容器不得同时挂 `card` 与调色板底色（`bg-(gray|green|amber|red|blue)-(50|100)`）——卡片一律白底 ＋ hairline。
  //   ③ 反例自证：注入计数与卡片底色必须被判红。
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readdirSync, statSync, readFileSync } = await import('node:fs');
  const { join, relative } = await import('node:path');
  const ROOT = join(import.meta.dirname, '..', '..');
  const SRC = join(ROOT, 'docs', 'src');
  const RE_PALETTE_TEXT = /text-(?:amber|green|red|blue|emerald|rose|orange|indigo|sky|teal|violet|purple)-\d+/g;
  const RE_CARD_TINT = /class="([^"]*)"/g;
  
  /** 存量基线（2026-11-21 批次 590 实测 291 处 / 56 文件；只减不增）。 */
  const PALETTE_TEXT_BASELINE = Object.freeze({
    'docs/src/components/feedback/issue-detail.js': 1,
    'docs/src/components/governance/org-setup-wizard.js': 11,
    'docs/src/components/governance/person-edit-modal.js': 2,
    'docs/src/components/governance/resolution-followup-manager.js': 1,
    'docs/src/components/governance/workgroup-member-editor.js': 4,
    'docs/src/components/record/calendar.js': 3,
    'docs/src/components/record/inspector.js': 9,
    'docs/src/components/record/report-inbox.js': 1,
    'docs/src/components/record/taskforce-view.js': 3,
    'docs/src/components/ui/modal.js': 1,
    'docs/src/entries/pages/activity-entry.js': 9,
    'docs/src/entries/pages/activity-materials-entry.js': 8,
    'docs/src/entries/pages/branch-config-entry.js': 1,
    'docs/src/entries/pages/login-entry.js': 1,
    'docs/src/entries/pages/messages-entry.js': 1,
    'docs/src/entries/pages/party-committee-meeting-entry.js': 3,
    'docs/src/entries/pages/person-entry.js': 1,
    'docs/src/entries/tabs/disc/attendance-tab.js': 18,
    'docs/src/entries/tabs/disc/inspection-tab.js': 12,
    'docs/src/entries/tabs/disc/makeup-tab.js': 2,
    'docs/src/entries/tabs/disc/review-tab.js': 6,
    'docs/src/entries/tabs/leader/attendance-tab.js': 9,
    'docs/src/entries/tabs/leader/inspection-tab.js': 5,
    'docs/src/entries/tabs/leader/members-tab.js': 3,
    'docs/src/entries/tabs/leader/my-tasks-section.js': 3,
    'docs/src/entries/tabs/leader/overview-tab.js': 1,
    'docs/src/entries/tabs/leader/review-tab.js': 8,
    'docs/src/entries/tabs/leader/write-tab.js': 8,
    'docs/src/entries/tabs/org/inspection-tab.js': 7,
    'docs/src/entries/tabs/org/member-flow-tab.js': 11,
    'docs/src/entries/tabs/org/roster-tab.js': 1,
    'docs/src/entries/tabs/org/talent-tab.js': 2,
    'docs/src/entries/tabs/org/taskforce-tab.js': 19,
    'docs/src/entries/tabs/party-committee/branches-tab.js': 4,
    'docs/src/entries/tabs/party-committee/content-tab.js': 2,
    'docs/src/entries/tabs/party-committee/dispatch-tab.js': 3,
    'docs/src/entries/tabs/party-committee/party-config-tab.js': 3,
    'docs/src/entries/tabs/party-committee/review-tab.js': 1,
    'docs/src/entries/tabs/prop/archive-tab.js': 20,
    'docs/src/entries/tabs/prop/tasks-tab.js': 8,
    'docs/src/entries/tabs/prop/weekly-tab.js': 5,
    'docs/src/entries/tabs/secretary/assign-tab.js': 5,
    'docs/src/entries/tabs/secretary/calendar-tab.js': 7,
    'docs/src/entries/tabs/secretary/feedback-tab.js': 4,
    'docs/src/entries/tabs/secretary/group-progress-tab.js': 2,
    'docs/src/entries/tabs/secretary/notification-tab.js': 13,
    'docs/src/entries/tabs/secretary/report-up-tab.js': 4,
    'docs/src/entries/tabs/secretary/todo-tab.js': 3,
    'docs/src/entries/tabs/secretary/workforce-panel.js': 1,
    'docs/src/entries/tabs/visitor/attendance-tab.js': 4,
    'docs/src/entries/tabs/visitor/inspection-tab.js': 2,
    'docs/src/entries/tabs/visitor/projects-tab.js': 11,
    'docs/src/entries/tabs/visitor/review-tab.js': 7,
    'docs/src/entries/tabs/visitor/thought-report-tab.js': 1,
    'docs/src/services/governance/issues.js': 4,
    'docs/src/services/governance/review.js': 2,
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
  
  /** 返回 { rel → 计数 }；供守卫与反例共用。 */
  function paletteCountsOf(text) {
    return (String(text).match(RE_PALETTE_TEXT) || []).length;
  }
  
  /** 返回卡片容器里同时出现的调色板底色（字符串数组）。 */
  function cardTintOf(text) {
    const bad = [];
    for (const m of String(text).matchAll(RE_CARD_TINT)) {
      const cls = m[1];
      if (/\bcard\b/.test(cls) && /\bbg-(?:gray|green|amber|red|blue)-(?:50|100)\b/.test(cls)) bad.push(cls);
    }
    return bad;
  }
  
  const FILES = walk(SRC);
  
  test('① 调色板状态文字按文件计数只减不增，且不得出现新文件', () => {
    const problems = [];
    for (const file of FILES) {
      const rel = relative(ROOT, file).replace(/\\/g, '/');
      const count = paletteCountsOf(readFileSync(file, 'utf8'));
      if (count === 0) continue;
      const base = PALETTE_TEXT_BASELINE[rel];
      if (base == null) problems.push(`${rel}（${count}）未登记：新代码请用 --status-*-text / --neutral-*`);
      else if (count > base) problems.push(`${rel}：${count} > 基线 ${base}（只减不增）`);
    }
    assert.deepEqual(problems, [], `调色板状态文字超基线：\n  ${problems.join('\n  ')}`);
  });
  
  test('② 卡片容器不得挂调色板底色（卡一律白底 ＋ hairline）', () => {
    const bad = [];
    for (const file of FILES) {
      const hits = cardTintOf(readFileSync(file, 'utf8'));
      if (hits.length) bad.push(`${relative(ROOT, file).replace(/\\/g, '/')} → ${hits.join(' | ')}`);
    }
    assert.deepEqual(bad, [], `卡片仍用调色板底色：\n  ${bad.join('\n  ')}`);
  });
  
  test('③ 反例自证：调色板计数与卡片底色都必须被判出', () => {
    assert.equal(paletteCountsOf('class="text-red-600"'), 1, '注入的调色板文字未被计数');
    assert.equal(cardTintOf('class="card card-standard bg-gray-50"').length, 1, '注入的灰底卡未被判出');
    assert.equal(cardTintOf('class="rounded-lg bg-gray-50"').length, 0, '非卡片容器被误伤');
  });

})();

// ═══ 源件 5：link-color-guard.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // link-color-guard.test.mjs — 「跳转链接」颜色单一源守卫（2026-10-23 批次 507）
  //
  // 为什么要有本守卫：
  //   同一个「跳转」语义，首页一处是 `text-accent`（主题色深字）、另一处是 `text-blue-600`（蓝）——
  //   读者无法从颜色判断「这是链接还是信息态」。批次 507 裁定：**全站链接统一主题色深字**
  //   （`.link` / `.text-accent` → `--app-accent-soft-text`），蓝色只保留「信息态」（徽章 / 状态字 /
  //   带背景色的按钮型链接）。没有本守卫，下一批新增页面又会把 Tailwind 蓝当链接色写回来。
  //
  // 判据：
  //   L1 非空转：扫描到的文件数 / `<a>` 标签数低于下限即红（解析面被削 ⇒ L2 恒真）
  //   L2 纯文本 `<a>`（class 里没有 `bg-*`）不得出现 `text-blue-*` / `text-sky-*` / `text-indigo-*`
  //   L3 `.link` 组件类单一源：色取 `--color-link`；**无文本下划线**（2026-10-27 Task 9 全站清零），
  //      静态线索＝600 字重、hover＝10% 主题淡底（`--app-accent-tint`）
  //   L4 `.text-accent` 仍是等价别名（存量调用点依赖）
  //   L5 蓝色文字类总量只降不升（棘轮；覆盖 JS 动态 className 这类 `<a>` 正则抓不到的写法）
  // 运行：node --test server/test/link-color-guard.test.mjs
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readdirSync, readFileSync } = await import('node:fs');
  const { join, dirname, relative } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const HERE = dirname(fileURLToPath(import.meta.url));
  const ROOT = join(HERE, '..', '..');
  const DOCS = join(ROOT, 'docs');
  const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
  
  /** 扫 docs/ 下的前端源（js/html），排除第三方产物 */
  function walk(dir) {
    const out = [];
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const rel = relative(ROOT, full).replace(/\\/g, '/');
      if (rel.includes('assets/vendor') || rel.includes('node_modules')) continue;
      let st;
      try { st = readdirSync(full); } catch { st = null; }
      if (st) { out.push(...walk(full)); continue; }
      if (/\.(js|html)$/.test(name)) out.push(rel);
    }
    return out;
  }
  
  const FILES = walk(DOCS);
  
  /** `<a ...>` 开标签（含跨行的 class） */
  function anchors(src) {
    return [...src.matchAll(/<a\b[^>]*>/g)].map((m) => m[0]);
  }
  
  const BLUE_TEXT_RE = /\btext-(?:blue|sky|indigo)-\d{2,3}\b/;
  
  test('L1 非空转：可扫描到前端源与 <a> 标签', () => {
    assert.ok(FILES.length >= 150, `只扫描到 ${FILES.length} 个前端源文件（下限 150）`);
    const total = FILES.reduce((n, f) => n + anchors(read(f)).length, 0);
    assert.ok(total >= 200, `只扫描到 ${total} 个 <a> 标签（下限 200）：正则或目录口径失效，L2 会恒真`);
  });
  
  test('L2 纯文本链接不得用 Tailwind 蓝作链接色（信息态/带底色的按钮型链接除外）', () => {
    const offenders = [];
    let checked = 0;
    for (const f of FILES) {
      for (const tag of anchors(read(f))) {
        checked += 1;
        // 带底色的 `<a>` 是「按钮 / 徽章」形态（roster「档案」等），蓝色属信息态，不在链接口径内
        if (/\bbg-[a-z]+-\d{2,3}\b/.test(tag)) continue;
        const m = BLUE_TEXT_RE.exec(tag)
          || /style="[^"]*color:\s*var\(--accent-/.exec(tag); // 旧角色色板 --accent-blue 等不得当链接色
        if (m) offenders.push(`${f} → ${tag.replace(/\s+/g, ' ').slice(0, 120)}`);
      }
    }
    console.log(`[link] 检查 <a> 标签 ${checked} 个，蓝链接 ${offenders.length} 个`);
    assert.deepEqual(offenders, [],
      `跳转链接必须用 text-accent（主题色深字），不得用 Tailwind 蓝：\n  ${offenders.join('\n  ')}`);
  });
  
  test('L3 .link 单一源：色取 --color-link（→ softText），无下划线、600 字重 + 淡底 hover', () => {
    const css = read('docs/src/styles.css');
    assert.match(css, /--color-link:\s*var\(--app-accent-soft-text\)/,
      'styles.css 应定义全站唯一链接色 --color-link = var(--app-accent-soft-text)');
    const rule = /\.link\s*\{([^}]*)\}/.exec(css);
    assert.ok(rule, 'styles.css 缺少 .link 组件类');
    assert.match(rule[1], /color:\s*var\(--color-link\)/, '.link 的文字色必须是 --color-link');
    // 2026-10-27 Task 9：用户裁定「全系统一个下划线都没有」——不得再用下划线作线索。
    assert.doesNotMatch(rule[1], /text-decoration:\s*underline/, '.link 不得再用文本下划线');
    assert.doesNotMatch(rule[1], /text-underline-offset/, '.link 不得再写 text-underline-offset');
    // 「无下划线也可识别」＝必须有非下划线的静态线索（600 字重）＋ hover 淡底，不得退化成纯颜色。
    assert.match(rule[1], /font-weight:\s*600/, '.link 必须有 600 字重作静态线索（下划线已清零）');
    assert.doesNotMatch(rule[1], /color-mix\(|#[0-9A-Fa-f]{6}/, '.link 不得回落到 color-mix / hex');
  
    const aTextAccent = /a\.text-accent\s*\{([^}]*)\}/.exec(css);
    assert.ok(aTextAccent, 'styles.css 缺少 a.text-accent 静态线索规则');
    assert.match(aTextAccent[1], /text-decoration:\s*none/, 'a.text-accent 也应显式清零下划线');
  
    const hoverIdx = css.indexOf('.link:hover');
    assert.ok(hoverIdx > -1, '.link 缺少 :hover 规则');
    assert.match(css.slice(hoverIdx, hoverIdx + 160), /background:\s*var\(--app-accent-tint\)/,
      '.link:hover 应用 10% 主题淡底作非颜色线索');
    // 门控：从最近的 @media (hover: hover) 到 .link:hover 之间不得出现右花括号（否则已离块）
    const mediaIdx = css.lastIndexOf('@media (hover: hover)', hoverIdx);
    assert.ok(mediaIdx > -1, '.link:hover 必须由 @media (hover: hover) 门控');
    assert.equal(css.slice(mediaIdx, hoverIdx).includes('}'), false,
      '.link:hover 位于 @media (hover: hover) 块外（触屏会粘住 hover 底）');
  });
  
  test('L4 .text-accent 仍是等价别名（存量调用点依赖）', () => {
    const css = read('docs/src/styles.css');
    const rule = /\.text-accent\s*\{([^}]*)\}/.exec(css);
    assert.ok(rule, 'styles.css 缺少 .text-accent');
    assert.match(rule[1], /color:\s*var\(--app-accent-soft-text\)/, '.text-accent 必须与 .link 同源（softText）');
  });
  
  test('L5 蓝色文字类总量只降不升（覆盖 JS 动态 className）', () => {
    // 2026-10-23 批次 507 迁移后实测：docs/src/**/*.js 内 69 处（信息态徽章 / 状态 map / 表单控件），
    //   链接已全量迁移。此数为冻结上限——新增即红；清理后可下调本常量。
    const BASELINE = 70;
    let total = 0;
    for (const f of FILES) {
      if (!f.startsWith('docs/src/') || !f.endsWith('.js')) continue;
      total += (read(f).match(/\btext-(?:blue|sky|indigo)-\d{2,3}\b/g) || []).length;
    }
    assert.ok(total <= BASELINE,
      `蓝色文字类 ${total} 处 > 基线 ${BASELINE}（链接须用 text-accent；新增必须说明为何是信息态）`);
  });
  
  test('L6 帮助链接：.help-note__link 并入 --color-link，无下划线、600 字重 + 淡底 hover', () => {
    const css = read('docs/src/styles.css');
    const m = /\.help-note__link\s*\{([^}]*)\}/.exec(css);
    assert.ok(m, 'styles.css 缺少 .help-note__link');
    assert.match(m[1], /color:\s*var\(--color-link\)/, '.help-note__link 必须用全站唯一链接色 --color-link');
    assert.doesNotMatch(m[1], /text-decoration:\s*underline/, '.help-note__link 不得再用文本下划线');
    assert.match(m[1], /font-weight:\s*600/, '.help-note__link 必须有 600 字重作静态线索');
    assert.doesNotMatch(m[1], /--functional-info|--status-info|--accent-/, '.help-note__link 不得再用信息蓝 / 角色色当链接色');
  });
  
  test('L7 速查链接：a.qn-fn-* 颜色并入 --color-link，角色色只留边框', () => {
    const help = read('docs/help.html');
    assert.match(help, /a\.qn-fn\s*\{[^}]*color:var\(--color-link\)/,
      'help.html 的 a.qn-fn 应以 --color-link 作链接色');
    // 2026-10-27 Task 9：help.html 的下划线由 Task 12 收口（no-underline-guard 的 PENDING 台账），
    //   本守卫只锁「链接色」单一源，不再要求下划线；收口后此处无需再改。
    const lightRoleRules = [...help.matchAll(/a\.qn-fn-(?:leader|org|prop|disc|member|sec)\s*\{([^}]*)\}/g)];
    assert.equal(lightRoleRules.length, 6, `速查链接角色档应为 6 条，实际 ${lightRoleRules.length}`);
    for (const [, body] of lightRoleRules) {
      assert.doesNotMatch(body, /(?:^|[;\s])color:/, `速查链接角色档不得再写文字色（应继承 --color-link）：${body}`);
      assert.match(body, /border-color:/, '速查链接角色档只保留角色色边框');
    }
  
    const css = read('docs/src/styles.css');
    const darkRoleRules = [...css.matchAll(/html\.theme-dark a\.qn-fn-(?:leader|org|prop|disc|member|sec)\s*\{([^}]*)\}/g)];
    assert.equal(darkRoleRules.length, 6, `暗色速查链接角色档应为 6 条，实际 ${darkRoleRules.length}`);
    for (const [, body] of darkRoleRules) {
      assert.match(body, /color:\s*var\(--color-link\)\s*!important/,
        `暗色速查链接必须并入 --color-link：${body}`);
    }
  });
  
  test('L8 help / about 锚点不得用蓝色或角色色作链接色', () => {
    const offenders = [];
    for (const rel of ['docs/help.html', 'docs/about.html']) {
      for (const tag of anchors(read(rel))) {
        if (/\btext-(?:blue|sky|indigo)-\d{2,3}\b/.test(tag)
          || /color:\s*var\(--accent-/.test(tag)
          || /color:\s*var\(--color-identity-/.test(tag)
          || /color:\s*#(?:2563eb|1d4ed8|3b82f6|0ea5e9)/i.test(tag)) {
          offenders.push(`${rel} → ${tag.replace(/\s+/g, ' ').slice(0, 140)}`);
        }
      }
    }
    assert.deepEqual(offenders, [], `help / about 的锚点仍用蓝色或角色色当链接色：\n  ${offenders.join('\n  ')}`);
  });

})();

// ═══ 源件 6：ui-contrast-guard.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // ui-contrast-guard.test.mjs — 对比度与色彩语义守卫（2026-10-21 R5-B/C P1）
  //
  // 来源：R5-C C-05/C-06 与 R5-A 对比度项。判据一律按 WCAG 2.x 相对亮度公式静态计算：
  //   K1 金色徽章 `.badge--gold`：#92400E on #FDE68A ≥ 4.5:1（小字）；
  //   K2 选中页签金色派生文字：color-mix(accent 45%, #000) on 10% accent 底（合成页面底色）≥ 4.5:1；
  //     党建红 accent 同式亦须 ≥ 4.5:1；
  //   K3 分组名恢复为 8–9 月原样：`.tab-group-label` 12px / 主题色 10% 淡底（--app-accent-tint）/
  //      无边框 / 主题 soft-text（7 主题亮暗 ≥4.5:1）/ 3px 直角 / ≥24px；
  //      组间 `.tab-group-sep` 1px 线；≤1280px 只缩内边距、不隐藏也不下探 11px；
  //      选中页签 `.tab-btn-active` 用 solid soft 底 + 更强主题 accent 描边 + 700 字重、无文本下划线。
  //      （2026-10-27 Task 9：去 neutral-400 边框、底色由 soft-bg 降为 10% tint——用户裁定回到 8–9 月原样）
  //   K4 逾期统一 warning：今天页「逾期」附近不得出现 --functional-error；
  //   K5 二级分段 `.btn-tab.active` 跟随主题色（soft 三件套：soft-bg / soft-text / soft-border），不再固定红；
  //   K6 逾期文字档：--status-warning-text（亮/暗）≥4.5:1，--status-warning 只作圆点 / 填充
  //      （2026-10-27 Task 11.1：原填充色直接当文字，白底仅 2.15:1）；
  //      2026-11-04 批次 534：状态左条退出界面信号，`.section-accent-left` 不得再用 border-left。
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { ACCENT_COLORS } = await import('../../docs/src/core/domain/constants.js?v=20261120a');
  const ROOT = join(import.meta.dirname, '..', '..');
  const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
  const CSS = read('docs/src/styles.css');
  const TAB_BAR = read('docs/src/components/shell/tab-bar.js');
  const TODAY = read('docs/src/entries/tabs/today/today-tab.js');
  
  /** sRGB 分量 → 线性光 */
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  /** 相对亮度 */
  const luminance = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  /** WCAG 对比度 */
  function contrast(a, b) {
    const la = luminance(a);
    const lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }
  /** hex → rgb */
  const rgb = (hex) => {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  /** color-mix(in srgb, a p%, b)：p 为第一个颜色的占比 */
  const mix = (a, b, p) => a.map((v, i) => Math.round(v * p + b[i] * (1 - p)));
  
  const GOLD = rgb('#F5C518');
  const RED = rgb('#CE1126');
  const PAGE = rgb('#FAFAF5');
  const WHITE = rgb('#FFFFFF');
  const BLACK = rgb('#000000');
  
  test('K1 .badge--gold 深琥珀字 on #FEF9C3 ≥ 4.5:1（读 --badge-gold-* 令牌）', () => {
    // 批次 505：金色徽章底色由 #FDE68A 调为更浅的 #FEF9C3，字色固定深琥珀 #A16207
    // （固定语义色，不随主题变化）。2026-10-27 Task 11.4：字色改引功能金 token（同值）。
    // 2026-11-04 批次 534（Task 4.1）：徽标三连令牌化——`.badge--*` 只读 `--badge-*`，
    //   故本判据改从令牌定义取值，仍核「功能金字 vs 金色底 ≥ 4.5:1」。
    const body = (/\.badge--gold\s*\{([^}]*)\}/.exec(CSS.replace(/\/\*[\s\S]*?\*\//g, ''))?.[1] || '');
    assert.match(body, /background:\s*var\(--badge-gold-bg\)/, '.badge--gold 底应读 --badge-gold-bg');
    assert.match(body, /color:\s*var\(--badge-gold-text\)/, '.badge--gold 字应读 --badge-gold-text');
    const bg = /--badge-gold-bg:\s*(#[0-9A-Fa-f]{6})\s*;/.exec(CSS)?.[1];
    assert.equal(String(bg).toUpperCase(), '#FEF9C3', '金色徽章底令牌应为 #FEF9C3');
    assert.match(CSS, /--badge-gold-text:\s*var\(--color-functional-gold\)\s*;/,
      '金色徽章字令牌应引功能金 var(--color-functional-gold)');
    const gold = /--color-functional-gold:\s*(#[0-9A-Fa-f]{6})/.exec(CSS)?.[1];
    assert.equal(gold.toUpperCase(), '#A16207', '功能金亮色应为 #A16207');
    const ratio = contrast(rgb(gold), rgb(bg));
    assert.ok(ratio >= 4.5, `badge--gold 对比度 ${ratio.toFixed(2)}:1 低于 4.5`);
  });
  
  test('K2 选中页签文字走主题 softText（不再 color-mix 派生）且 ≥ 4.5:1', () => {
    // 2026-10-23 批次 507：选中页签文字由 `color-mix(--tab-accent 45%, #000)` 改为主题 softText
    // （每主题手选 hex，7 主题对比度全量核在 theme-palette-guard::T2；此处只作页签侧的定点复核）。
    const block = (/\.tab-btn-active\s*\{([^}]*)\}/.exec(CSS)?.[1] || '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.match(block, /color:\s*var\(--app-accent-soft-text\)/, '选中页签文字应为 --app-accent-soft-text');
    assert.doesNotMatch(block, /color-mix\(/, '选中页签文字不得再用 color-mix 派生');
    const tok = (name) => {
      const m = new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`).exec(CSS);
      assert.ok(m, `styles.css 缺少 ${name}`);
      return m[1];
    };
    const ratio = contrast(rgb(tok('--app-accent-soft-text-light')), rgb(tok('--app-accent-soft-bg-light')));
    assert.ok(ratio >= 4.5, `金色选中页签对比度 ${ratio.toFixed(2)}:1 低于 4.5`);
  });
  
  test('K3 分组名全宽可见（12px / 10% 淡底无边框 / 主题 soft-text 亮暗 ≥4.5:1 / 3px / ≥24px），≤1280 只缩不隐藏', () => {
    // 组名必须是可见文本，不是空 span（R5-C01 曾把组名整段移成 1px 竖线）。
    const nameLine = TAB_BAR.split('\n').find((l) => /tab-group-label/.test(l) && /\$\{groupName\}/.test(l)) || '';
    assert.ok(nameLine, 'tab-bar 未把 groupLabel 渲染为可见文本（.tab-group-label 内应为 ${groupName}）');
    assert.match(CSS, /\.tab-group-label\s*\{[^}]*font-size:\s*12px/, '组名应为 12px');
    // 2026-10-27 Task 9：恢复 8–9 月原样——主题色 10% 淡底、无边框、主题 soft 深字。
    //   淡底由 `--app-accent-tint` 从当前主题 base 换算 10% alpha（不用 color-mix / 主题色 rgba）。
    assert.match(CSS, /--app-accent-tint:\s*rgb\(from var\(--app-accent\) r g b \/ 10%\)/,
      'styles.css 应定义 --app-accent-tint = 当前主题色 10% 淡底（rgb(from … / 10%)）');
    assert.match(CSS, /\.tab-group-label\s*\{[^}]*background:\s*var\(--app-accent-tint\)/,
      '组名底色应为 10% 主题淡底 --app-accent-tint');
    assert.match(CSS, /\.tab-group-label\s*\{[^}]*border:\s*none/,
      '组名胶囊不得再有边框（8–9 月原样：无边框）');
    assert.doesNotMatch(CSS, /\.tab-group-label\s*\{[^}]*border:\s*1px/,
      '组名胶囊不得再写 1px 描边');
    assert.match(CSS, /\.tab-group-label\s*\{[^}]*color:\s*var\(--app-accent-soft-text\)/,
      '组名文字应为主题 soft-text');
    assert.doesNotMatch(CSS, /\.tab-group-label\s*\{[^}]*color:\s*var\(--neutral-500\)/,
      '组名不得退回 neutral-500（8–9 月为准绳的主题 soft 深字）');
    // 对比度：softText vs 10% 主题淡底（base 10% 叠在页面底上），7 主题 × 亮/暗全量核。
    const mix = (a, b, p) => a.map((v, i) => Math.round(v * p + b[i] * (1 - p)));
    const hex = (arr) => `#${arr.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
    const rows = [];
    for (const key of Object.keys(ACCENT_COLORS)) {
      for (const mode of ['light', 'dark']) {
        const t = ACCENT_COLORS[key][mode];
        const page = mode === 'light' ? '#FAFAF5' : '#0B1220';
        const tint = hex(mix(rgb(t.base), rgb(page), 0.1));
        const ratio = contrast(rgb(t.softText), rgb(tint));
        rows.push(`${key}.${mode} ${ratio.toFixed(2)}:1`);
        assert.ok(ratio >= 4.5, `${key}.${mode} 组名 softText/10% 淡底=${ratio.toFixed(2)}:1 < 4.5`);
      }
    }
    // 7 用户主题 ＋ 1 场域固定色（party-red）× 亮/暗 = 16 档（2026-11-25 批次 627 · D-925）
    assert.equal(rows.length, 16, `应核对 16 个主题档，实际 ${rows.length}`);
    console.log(`[ui-contrast] K3 组名 softText/10% 淡底：${rows.join(' · ')}`);
    assert.match(CSS, /\.tab-group-label\s*\{[^}]*border-radius:\s*3px/, '组名胶囊应为 3px 直角（8–9 月准绳）');
    assert.doesNotMatch(CSS, /\.tab-group-label\s*\{[^}]*width:\s*1px/, '组名不得再退化为 1px 竖线');
    assert.match(CSS, /\.tab-group-label\s*\{[^}]*min-height:\s*24px/, '组名胶囊高度须 ≥24px');
    assert.match(CSS, /\.tab-group-label\s*\{[^}]*flex-shrink:\s*0/, '组名不得被压缩（flex-shrink: 0）');
    assert.doesNotMatch(CSS, /\.tab-group-label[^{}]*\{[^}]*display:\s*none/,
      '分组胶囊不得用 display:none 隐藏（≤1280/≤1024 也不得隐藏）');
    // 组间分隔线单独成类。
    assert.ok(TAB_BAR.includes('tab-group-sep'), 'tab-bar 未渲染组间分隔线 .tab-group-sep');
    assert.match(CSS, /\.tab-group-sep\s*\{[^}]*width:\s*1px/, '.tab-group-sep 应为 1px 线');
    // ≤1280px 只缩小内边距（不隐藏、不降字号）；分隔线保留（≤1024 仅缩外边距）。
    //   2026-10-26 Task 1：字号由原来的 11px 改回 12px（11px 属 Overline 标签档，组名不再下探）。
    //   2026-10-27 Task 9：去边框后高度由 min-height 24px 承担，内边距口径不变。
    const narrow = /@media \(max-width: 1280px\) \{[\s\S]*?\.tab-group-label \{([\s\S]*?)\}[\s\S]*?\n\}/.exec(CSS);
    assert.ok(narrow, '缺少 ≤1280px 的分组名规则');
    assert.match(narrow[1], /padding:\s*1px 5px/, '≤1280px 组名应缩小内边距（1px 5px）');
    assert.doesNotMatch(narrow[1], /font-size:\s*(?:9|10|11)px/, '≤1280px 组名不得下探 11px 及以下（保持 12px 正文档）');
    assert.doesNotMatch(narrow[1], /display:\s*none/, '≤1280px 不得隐藏组名');
    assert.doesNotMatch(CSS, /@media \(max-width: 1280px\) \{[\s\S]*?\.tab-group-sep \{[^}]*display:\s*none/,
      '≤1280px 不得隐藏分隔线');
  
    // 选中页签：与组名淡底拉开层级——solid soft 底 + 更强主题 accent 描边 + 700 字重，且无文本下划线。
    const active = (/\.tab-btn-active\s*\{([^}]*)\}/.exec(CSS)?.[1] || '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(active, 'styles.css 缺 .tab-btn-active');
    assert.match(active, /border:\s*1px solid var\(--app-accent\)/, '选中页签须有更强的主题 accent 描边');
    assert.match(active, /font-weight:\s*700/, '选中页签字重须为 700');
    assert.doesNotMatch(active, /text-decoration:\s*underline/, '选中页签不得用文本下划线');
  });
  
  test('K4 今天页「逾期」使用 warning，不再用 error', () => {
    const hits = [...TODAY.matchAll(/逾期/g)].map((m) => m.index);
    assert.ok(hits.length > 0, '今天页未出现「逾期」');
    let hasWarning = false;
    for (const idx of hits) {
      const nearby = TODAY.slice(Math.max(0, idx - 400), idx + 400);
      assert.doesNotMatch(nearby, /--functional-error|--status-error/, '逾期附近不得再使用 error 状态色');
      if (/--functional-warning|--status-warning/.test(nearby)) hasWarning = true;
    }
    assert.ok(hasWarning, '逾期行应使用 --status-warning');
  });
  
  test('K5 .btn-tab.active 跟随主题色（soft 三件套，不再固定党建红）', () => {
    const m = /\.btn-tab\.active\s*\{([^}]*)\}/.exec(CSS);
    assert.ok(m, '缺少 .btn-tab.active 规则');
    // 批次 505：选中态 = 主题表 soft 三件套（浅底 / 深字 / 描边），深色由别名切 *-dark。
    assert.match(m[1], /background:\s*var\(--app-accent-soft-bg\)/, '选中态底色应跟随 --app-accent-soft-bg');
    assert.match(m[1], /color:\s*var\(--app-accent-soft-text\)/, '选中态文字应跟随 --app-accent-soft-text');
    assert.match(m[1], /border-color:\s*var\(--app-accent-soft-border\)/, '选中态描边应跟随 --app-accent-soft-border');
    assert.doesNotMatch(m[1], /--primary-50|--primary-700|--primary-200/, '不得再固定使用 primary 红系');
  });
  
  test('K6 逾期文字档：--status-warning-text 亮/暗 ≥4.5:1，warning 只作填充', () => {
    // 2026-10-27 Task 11.1：--status-warning（#F59E0B）直接当文字在白底仅 2.15:1；
    // 新增文字档 token 供逾期数值 / 超期标签 / 状态徽章文字使用，填充仍走 --status-warning。
    const light = /--status-warning-text:\s*(#[0-9A-Fa-f]{6})/.exec(CSS)?.[1];
    assert.ok(light, 'styles.css 缺 --status-warning-text 亮色值');
    const dark = /html\.theme-dark\s*\{[\s\S]*?--status-warning-text:\s*(#[0-9A-Fa-f]{6})/.exec(CSS)?.[1];
    assert.ok(dark, 'styles.css 暗色段缺 --status-warning-text');
  
    const lightWhite = contrast(rgb(light), WHITE);
    const lightPage = contrast(rgb(light), PAGE);
    const darkCard = contrast(rgb(dark), rgb('#141D2F'));
    const darkPage = contrast(rgb(dark), rgb('#0B1220'));
    assert.ok(lightWhite >= 4.5, `warning 文字档白底 ${lightWhite.toFixed(2)}:1 < 4.5`);
    assert.ok(lightPage >= 4.5, `warning 文字档页面底 ${lightPage.toFixed(2)}:1 < 4.5`);
    assert.ok(darkCard >= 4.5, `warning 文字档暗卡 ${darkCard.toFixed(2)}:1 < 4.5`);
    assert.ok(darkPage >= 4.5, `warning 文字档暗页 ${darkPage.toFixed(2)}:1 < 4.5`);
    console.log(`[ui-contrast] K6 warning 文字档：亮/白 ${lightWhite.toFixed(2)} · 亮/页 ${lightPage.toFixed(2)}`
      + ` · 暗/卡 ${darkCard.toFixed(2)} · 暗/页 ${darkPage.toFixed(2)}`);
  
    for (const [selector, why] of [
      ['.stat-card__value--warning', '逾期数值'],
      ['.badge--warning', '逾期状态徽章文字'],
      ['.workflow-substates-hint', '超期提示文字'],
    ]) {
      const body = (new RegExp(`${selector.replace(/\./g, '\\.')}\\s*\\{([^}]*)\\}`).exec(
        CSS.replace(/\/\*[\s\S]*?\*\//g, ''))?.[1] || '');
      assert.match(body, /color:\s*var\(--(?:badge-warning-text|status-warning-text)\)/,
        `${why}（${selector}）应使用 warning 文字档令牌，不得用填充色 --status-warning 当文字`);
    }
    // 填充语义保留：圆点仍取 --status-warning。
    assert.match(CSS, /\.todo-urgency-header__dot--warning\s*\{[^}]*background:\s*var\(--status-warning\)/,
      'warning 圆点应继续使用 --status-warning');
    // 2026-11-04 批次 534：状态左条退出界面信号。`.section-accent-left` 若仍存在，
    //   不得再用 border-left 承载状态；仍带 status 色时须另有背景 / 文字，不得只靠一条线。
    const accentBody = (/\.section-accent-left\s*\{([^}]*)\}/.exec(CSS.replace(/\/\*[\s\S]*?\*\//g, ''))?.[1] || '');
    if (accentBody) {
      assert.doesNotMatch(accentBody, /border-left/,
        '.section-accent-left 不得再用左条表达状态（改为背景 / 圆点 / 文字）');
      if (/--status-/.test(accentBody)) {
        assert.match(accentBody, /(?:^|[;\s])(?:background(?:-color)?|color|font-weight)\s*:/,
          '.section-accent-left 仍承担状态时，必须另有背景 / 文字，不得只靠一条线');
      }
    }
  });

})();

// ═══ 源件 7：ui-color-semantics.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // ui-color-semantics.test.mjs — 颜色语义守卫（2026-10-18 立 · Task 2 / SubTask 2.5）
  //
  // 来源：Spec「工作台视觉语言」§2.10 颜色四问与明暗档；判例＝「逾期与删除失败同屏，两处都是红」。
  // 病灶：`--functional-error` 同时承担「错误」和「逾期」，红色既是主题色又是状态色，用户无法判断语义。
  //
  // 判据：
  //   C1 DESIGN_SYSTEM 有「颜色四问」与逾期 / warning / error / 琥珀口径；
  //   C2 styles.css 有 `.badge--warning/success/info/accent` 变体，且 `.state-badge` 族已收口；
  //   C3 关键页面文件内「逾期」附近 120 字符不得出现 `--functional-error`；
  //   C4 DESIGN_SYSTEM §2.10 写明三个反例（整圈红边 / 功能色主按钮 / 主题色状态徽章）；
  //   C5 非空转自检：邻近判定在合成正 / 负样本上必须命中 / 不命中。
  //
  // 说明：C3 的存量页面由后续页面任务修复；若命中，失败信息会明确标注「待后续页面任务修复」，
  //   不放宽为永远绿。
  //
  // 运行：node --test server/test/ui-color-semantics.test.mjs
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync, existsSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const DESIGN = join(ROOT, 'content', '04_web_design', 'design-system', 'DS_01_COLOR_AND_THEME.md');
  const CSS = join(ROOT, 'docs', 'src', 'styles.css');
  
  /** 关键页面（后续页面任务负责修；本守卫只做结构断言，不判视觉） */
  const PAGES = [
    'docs/src/components/governance/work-overview.js',
    'docs/src/components/record/todo-list.js',
    'docs/src/components/record/todo-tab-shell.js',
    'docs/src/components/record/report-inbox.js',
    'docs/src/entries/tabs/secretary/committee-meeting-tab.js',
    'docs/src/components/dashboard/taskforce-list.js',
    'docs/src/components/governance/notice-view.js',
  ];
  
  const ERROR_TOKENS = ['--functional-error', '--status-error'];
  const WINDOW = 120;
  
  /** 找出「逾期」附近 120 字符内出现 error 令牌的站点（导出便于非空转自检） */
  function overdueErrorSites(src) {
    const hits = [];
    let from = 0;
    while (true) {
      const i = src.indexOf('逾期', from);
      if (i < 0) break;
      const start = Math.max(0, i - WINDOW);
      const end = Math.min(src.length, i + '逾期'.length + WINDOW);
      const slice = src.slice(start, end);
      if (ERROR_TOKENS.some((t) => slice.includes(t))) hits.push(i);
      from = i + 1;
    }
    return hits;
  }
  
  test('C1 DESIGN_SYSTEM 含颜色四问与逾期 / warning / error 口径', () => {
    const doc = readFileSync(DESIGN, 'utf8');
    for (const term of ['颜色四问', '逾期', 'warning', 'error', '琥珀']) {
      assert.ok(doc.includes(term), `DESIGN_SYSTEM 缺「${term}」（§2.10 颜色语义单一源）`);
    }
    assert.match(doc, /### 2\.10 颜色四问与明暗档/, 'DESIGN_SYSTEM 缺 §2.10 标题');
    assert.ok(doc.includes('阻断 / 失败 / 删除 / 驳回'), '§2.10 未写明 error 只保留给阻断 / 失败 / 删除 / 驳回');
  });
  
  test('C2 styles.css 含状态徽章变体（warning / success / info / accent），旧 state-badge 已收口', () => {
    const css = readFileSync(CSS, 'utf8');
    for (const variant of ['neutral', 'success', 'warning', 'info', 'accent']) {
      assert.ok(css.includes(`.badge--${variant}`), `styles.css 缺 .badge--${variant}`);
    }
    // 批次 530（B-518-1）：展示型胶囊只留 `.badge` 一族；`.state-badge` 不得再定义外观。
    assert.doesNotMatch(css, /\.state-badge\s*\{/,
      'styles.css 仍定义 .state-badge（展示胶囊已收口到 .badge，勿新增第二族）');
  });
  
  test('C3 关键页面「逾期」附近不得使用 --functional-error', () => {
    const offenders = [];
    for (const rel of PAGES) {
      const file = join(ROOT, rel);
      assert.ok(existsSync(file), `关键页面不存在：${rel}`);
      const src = readFileSync(file, 'utf8');
      const hits = overdueErrorSites(src);
      if (hits.length) offenders.push(`${rel} → ${hits.length} 处（逾期附近 120 字符出现 error 状态色）`);
    }
    assert.deepEqual(offenders, [],
      `以下页面仍把「逾期」写成错误红（待后续页面任务修复：逾期改 --status-warning，`
      + `error 只留给阻断 / 失败 / 删除 / 驳回）：\n  ${offenders.join('\n  ')}`);
  });
  
  test('C4 §2.10 写明三个反例（整圈红边 / 功能色主按钮 / 主题色状态徽章）', () => {
    const doc = readFileSync(DESIGN, 'utf8');
    for (const term of ['整圈红边', '功能色主按钮', '主题色状态徽章']) {
      assert.ok(doc.includes(term), `§2.10 缺反例「${term}」`);
    }
    assert.ok(doc.includes('主题色为红时，逾期仍用琥珀'), '§2.10 缺「主题色为红时，逾期仍用琥珀」口径');
  });
  
  test('C5 非空转：邻近判定在正 / 负样本上分别命中 / 不命中', () => {
    assert.equal(overdueErrorSites('逾期 <span style="color:var(--functional-error)">').length, 1,
      '邻近判定失效：逾期 + 旧 error token 未被判出');
    assert.equal(overdueErrorSites('逾期 <span style="color:var(--status-error)">').length, 1,
      '邻近判定失效：逾期 + --status-error 未被判出');
    assert.equal(overdueErrorSites('逾期 <span style="color:var(--status-warning)">').length, 0,
      '邻近判定过宽：逾期 + warning 被误判');
    const far = '逾期'.padEnd(WINDOW + 20, '。') + 'var(--status-error)';
    assert.equal(overdueErrorSites(far).length, 0, '邻近判定过宽：超出 120 字符仍被误判');
  });
  
  // ── C6 / C7：指标色分工（2026-11-01 批次 524 · 支书评议 #1） ───────────────
  // 病灶：「全局概览几乎全是主题色，功能色没起注意力引导作用」。裁定：指标与状态用功能色；
  //   动作 / 导航 / 选中态继续主题色。工作台结论带 6 处「待…」指标与「组员汇报」原本都是
  //   `--app-accent-soft-text`，逾期是唯一的 warning ⇒ 主题色即「正常」，功能色反而不显眼。
  const WORK_OVERVIEW = join(ROOT, 'docs', 'src', 'components', 'governance', 'work-overview.js');
  const DISPATCH_BAR = join(ROOT, 'docs', 'src', 'components', 'governance', 'overview-dispatch-bar.js');
  
  /** 指标声明抽取：同一行内 `label: '…'` 之后跟随 `color:`（字面 token 或 METRIC_TONE.x 引用） */
  const METRIC_LINE_RE = /label:\s*'([^'\n]+)'[^}\n]*?color:\s*(?:'([^'\n]+)'|([A-Za-z_$][\w.$]*))/g;
  /** 哪些标签属于「指标 / 状态」——主题色会抹平状态差异，必须取功能色 */
  function isStatusMetricLabel(label) {
    return label.startsWith('待') || label === '逾期' || label === '组员汇报';
  }
  /** 允许的指标文字色：功能状态文字档或中性档（动作 / 导航的 text-accent 不在本判据内） */
  const ALLOWED_METRIC_TONE = /^var\(--(?:status-[a-z]+-text|neutral-\d+)\)$/;
  
  /** 解析 `METRIC_TONE` 单一源（键 → 实际 token），供「引用常量」的指标解析到最终色 */
  function parseMetricTone(src) {
    const block = /const METRIC_TONE = \{([\s\S]*?)\};/.exec(src)?.[1] || '';
    return Object.fromEntries([...block.matchAll(/(\w+):\s*'([^']+)'/g)].map((m) => [m[1], m[2]]));
  }
  
  /** 抽取 `label → color` 站点（导出便于非空转自检）；`METRIC_TONE.x` 解析成实际 token */
  function metricToneSites(src, tones = parseMetricTone(src)) {
    return [...src.matchAll(METRIC_LINE_RE)].map((m) => {
      const raw = m[2] || m[3];
      const ref = /^METRIC_TONE\.(\w+)$/.exec(raw);
      return { label: m[1], raw, color: ref ? (tones[ref[1]] || '') : raw };
    });
  }
  
  /** 返回不合规的指标色（空数组 = 绿） */
  function metricToneViolations(src, tones = parseMetricTone(src)) {
    return metricToneSites(src, tones)
      .filter((s) => isStatusMetricLabel(s.label)
        && (!ALLOWED_METRIC_TONE.test(s.color) || s.color.includes('--app-accent')))
      .map((s) => `${s.label} → ${s.raw}${s.raw === s.color ? '' : `（${s.color}）`}`);
  }
  
  /** 待答复直达条：状态指标，不得再用角色主题色（accent / --app-accent） */
  function dispatchBarToneViolations(src) {
    const out = [];
    if (/--status-info/.test(src)) out.push('待答复条仍用信息色（--status-info*）：动作入口按 D-925 取主题 soft 三件套');
    if (!/btn-accent-soft/.test(src)) out.push('待答复条未使用 .btn-accent-soft（主题 soft 三件套）');
    return out;
  }
  
  test('C6 工作台结论带：待处理 / 逾期指标只取功能色，出现 --app-accent 即红', () => {
    const src = readFileSync(WORK_OVERVIEW, 'utf8');
    // 2026-11-10 批次 540 波次 5：纯计数档由 `--neutral-800` 改准 `--neutral-600`（计数不争重心）。
    assert.match(src, /const METRIC_TONE = \{\s*\n\s*pending:\s*'var\(--status-info-text\)',\s*\n\s*overdue:\s*'var\(--status-warning-text\)',\s*\n\s*normal:\s*'var\(--neutral-600\)',/,
      'work-overview.js 缺 METRIC_TONE 单一源（pending / overdue / normal 三档）');
    const sites = metricToneSites(src).filter((s) => isStatusMetricLabel(s.label));
    assert.ok(sites.length >= 8, `指标色抽取只命中 ${sites.length} 处（应 ≥8：逾期 / 待办 / 待答复 / 待赋权 / 待归档 / 待补课 / 组员汇报 / 待汇报）`);
    assert.deepEqual(metricToneViolations(src), [],
      `以下指标仍用主题色（判据：仅允许 --status-*-text / --neutral-*）：\n  ${metricToneViolations(src).join('\n  ')}`);
    assert.doesNotMatch(src, /--app-accent/, 'work-overview.js 不得再用 --app-accent*（动作 / 导航用 .text-accent 类，不写死变量）');
  });
  
  test('C7 待答复直达条：动作入口取主题 soft 三件套，不再用 info 状态底色（D-925 改判）', () => {
    const src = readFileSync(DISPATCH_BAR, 'utf8');
    assert.deepEqual(dispatchBarToneViolations(src), [],
      `overview-dispatch-bar.js 待答复条不满足功能色口径：\n  ${dispatchBarToneViolations(src).join('\n  ')}`);
  });
  
  test('C8 非空转：指标色与直达条判定在旧 / 新写法上分别判红 / 判绿', () => {
    const oldMetric = "metrics: _metrics({ label: '待答复', icon: 'message', color: 'var(--app-accent-soft-text)', value: (t) => t.answer }),";
    const newMetric = "metrics: _metrics({ label: '待答复', icon: 'message', color: METRIC_TONE.pending, value: (t) => t.answer }),";
    assert.equal(metricToneViolations(oldMetric).length, 1, '非空转失效：旧写法 --app-accent-soft-text 未被判红');
    assert.equal(metricToneViolations(newMetric, { pending: 'var(--status-info-text)' }).length, 0, '非空转过严：METRIC_TONE.pending 被误判');
    assert.equal(metricToneViolations("label: '待办', icon: 'list', color: 'var(--neutral-800)'").length, 0,
      '非空转过严：纯计数取中性档被误判');
    assert.equal(metricToneViolations("label: '在办', color: 'var(--neutral-500)'").length, 0,
      '非空转过严：非状态指标不应纳入判据');
  
    const oldBar = 'style="background:color-mix(in srgb, var(--status-info-text) 12%, transparent);color:var(--status-info-text);"';
    const newBar = '<button type="button" class="btn-accent-soft overview-dispatch-bar">去处理 →</button>';
    assert.ok(dispatchBarToneViolations(oldBar).length >= 1, '非空转失效：旧 info 状态条未被判红');
    assert.deepEqual(dispatchBarToneViolations(newBar), [], '非空转过严：accent-soft 动作条被误判');
  });

})();

// ═══ 源件 8：icon-color-guard.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // icon-color-guard.test.mjs — SVG 色彩契约守卫（2026-11-10 批次 540 波次 6 · SD-61）
  //
  // 病灶（本守卫立项时的实测）：
  //   · `icons.js` 的单行示例写着 `stroke: '#FFF'`——硬编码色值从「唯一图标源」向调用点传播，
  //     复制到 `header.js`（`#FFFFFF`）、`person-picker.js`（`#6B7280`）就成真；
  //   · `custom-select.js` / `archive-entry.js` 各自内联 `<svg>`，绕开唯一图标源；
  //   · `person-picker.css` 用 data-URI 把色值写进 URL（`%239CA3AF`），既绕开令牌也绕开 hex 扫描；
  //   · `status-color-guard` 只认 `color:` 声明，`--tint: var(--status-error)` → `.stat-icon-tint{color:var(--tint)}`
  //     这条链路把状态**填充档**当文字 / 笔触色用，守卫看不见。
  //
  // 判据（DS_03 §4.11.2）：
  //   G1 SVG 生成点只在 `icons.js`：其余位置出现 `<svg` / `data:image/svg` / `createElementNS(…svg…)` 即红，
  //      白名单 2 处逐条给理由，且每条必须在当前源码里真实命中（防僵尸白名单）。
  //      白名单只免「生成点」（G1），不免「色值」（G4）——名单里的文件仍按 G4 扫 SVG 片段色值。
  //   G2 `icon()` 的 `stroke` / `fill` 字面量只许 `currentColor` / `none` / `var(--token)`。
  //   G3 `--tint` 只收令牌：① 字面值必须是 `var(--token)`（禁 hex / rgba / 裸色 / color-mix）；
  //      ② 状态**填充档**（`--status-success|warning|error|info`）不得进 `--tint`，也不得作 `tint:` / `color:`
  //      配置值或喂给 `tint` 形参的位置实参——一律改 `-text` 档（补 status-color-guard 只认 `color:` 的盲区）。
  //   G4 SVG 片段（字面 `<svg …>` 与 data-URI 载荷）的色值只许 `currentColor` / `none` / `var(--token)` /
  //      `url(#id)`；hex 扫描含 URL 编码 `%23`（data-URI 盲区）。
  //   G5 图标尺寸：`icon()` 不得传数字 `size` / `width` / `height`（尺寸由 CSS 类驱动），白名单逐条给理由。
  //
  // 每条判据都带**反例自证**（合成样本必须判红、正样本必须放行），防「正则写坏 ⇒ 恒绿」。
  // 运行：node --test server/test/icon-color-guard.test.mjs
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync, readdirSync, existsSync } = await import('node:fs');
  const { join, dirname, relative } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const HERE = dirname(fileURLToPath(import.meta.url));
  const ROOT = join(HERE, '..', '..');
  const SRC = join(ROOT, 'docs', 'src');
  const ICONS = 'docs/src/core/base/icons.js';
  const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
  
  /** 状态填充档（`-text` 是文字档，不在其中） */
  const STATUS_FILL_RE = /var\(--status-(?:success|warning|error|info)\)/;
  const TOKEN_VAR_RE = /^var\(--[a-z0-9-]+\)$/i;
  const COLOR_WORD_RE = /^(?:currentColor|none|transparent)$/i;
  const SVG_PAINT_URL_RE = /^url\(#[^)]+\)$/i;
  
  /**
   * G1 白名单（2 处）：`icons.js` 之外仍会产生 SVG 的位置，逐条给理由。
   * 纪律：① 条目必须在当前源码里真实命中，否则本守卫判红（防「白名单只增不减、迟早变空头」）；
   *       ② 白名单只免「SVG 生成点」（G1），**不免色值**——名单内文件的 SVG 片段仍按 G4 判（批次 541）。
   */
  const SVG_SOURCE_WHITELIST = [
    {
      file: 'docs/src/about.css',
      reason: '关于页暖纸 / 墨色噪点纹理由 `feTurbulence` data-URI 生成（非图标、无色值、无同名令牌），'
        + '且 about 是冻结件（`about-freeze-guard` 整文件哈希锁定），本波次不动。',
    },
    {
      file: 'docs/src/entries/pages/about-entry.js',
      reason: '关于页关系图 / 环形公转是页面自绘的**数据图形**（`document.createElementNS(SVG_NS, …)`），'
        + '不是图标；节点色取 `ROLE_COLORS`（身份色单一源），由 about 冻结件口径保护。',
    },
  ];
  
  /** G5 尺寸白名单：`icon()` 允许传数字尺寸的位置（按文件登记，逐条给理由） */
  const DIMENSION_WHITELIST = [
    {
      file: 'docs/src/components/ui/custom-select.js',
      sizes: [12],
      reason: '原生 `select` 的增强触发器和内嵌搜索框里，箭头 / 放大镜固定 12px（`.cs-chevron` / `.cs-search-icon`'
        + ' 只给颜色与动效、不给尺寸）；尺寸由属性写死在此一处，避免 CSS 类跨文件漂移。',
    },
    {
      file: 'docs/src/entries/pages/about-entry.js',
      sizes: [20, 28],
      reason: '关于页顶部「向下滚动」提示箭头用**非 24×24 的自定义 viewBox**（`0 0 20 28`），尺寸由 SVG 属性'
        + '而非 Tailwind 类表达；about 是冻结件（`about-freeze-guard` 哈希锁定），本波次不动其内容。',
    },
  ];
  
  // ── 通用工具 ────────────────────────────────────────────────────────────
  /** 剥注释（`/* *\/` 与 `//`；只为判定，不改源文件） */
  function stripComments(src) {
    return String(src)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');
  }
  
  /** 递归收集 docs/src 的 .js / .css（相对仓库根的 posix 路径） */
  function scanFiles(dir = SRC, out = []) {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (['vendor', 'fonts', 'images'].includes(e.name)) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) scanFiles(p, out);
      else if (/\.(js|css)$/.test(e.name)) out.push(relative(ROOT, p).replace(/\\/g, '/'));
    }
    return out.sort();
  }
  
  /** 括号配对：取 `src[open]`（左括号）到对应右括号之间的实参文本 */
  function balancedArgs(src, openIdx) {
    let depth = 0;
    for (let i = openIdx; i < src.length; i += 1) {
      if (src[i] === '(') depth += 1;
      else if (src[i] === ')') {
        depth -= 1;
        if (depth === 0) return src.slice(openIdx + 1, i);
      }
    }
    return '';
  }
  
  /** 取出源文件里所有 `icon(…)` 调用的实参文本 */
  function iconCalls(src) {
    const clean = stripComments(src);
    const out = [];
    const re = /(?:^|[^\w$.])icon\s*\(/g;
    for (const m of clean.matchAll(re)) {
      const open = m.index + m[0].length - 1;
      out.push(balancedArgs(clean, open));
    }
    return out;
  }
  
  // ── G1 SVG 生成点 ───────────────────────────────────────────────────────
  /** 纯判据：返回该源码里的 SVG 生成点（字面 `<svg` / data-URI / createElementNS） */
  function svgSourceHits(src) {
    const clean = stripComments(src);
    const hits = [];
    if (/<svg[\s>]/.test(clean)) hits.push('<svg');
    if (/data:image\/svg/i.test(clean)) hits.push('data:image/svg');
    if (/createElementNS\([^)]*svg/i.test(clean)) hits.push('createElementNS(…svg…)');
    return hits;
  }
  
  test('G1 SVG 生成点只在 icons.js（白名单 2 处，逐条理由且必须真实命中）', () => {
    // 反例自证：三种写法都必须被判出
    assert.deepEqual(svgSourceHits("const x = '<svg viewBox=\"0 0 24 24\"></svg>';"), ['<svg'],
      '反例未命中：字面 <svg> 未被判出（G1 正则失效）');
    assert.deepEqual(svgSourceHits("background: url('data:image/svg+xml,<svg/>')"), ['data:image/svg'],
      '反例未命中：data-URI SVG 未被判出');
    assert.deepEqual(svgSourceHits("document.createElementNS(SVG_NS, 'path')"), ['createElementNS(…svg…)'],
      '反例未命中：createElementNS 自绘 SVG 未被判出');
    // 正例：普通字符串不误伤
    assert.deepEqual(svgSourceHits("const s = 'svg 不是图标';"), [],
      '误伤：普通字符串被判成 SVG 生成点');
  
    const allow = new Map(SVG_SOURCE_WHITELIST.map((w) => [w.file, w]));
    const files = scanFiles();
    assert.ok(files.length >= 100, `扫描面过小（${files.length} 个文件）：判据可能失效`);
  
    const offenders = [];
    const hitFiles = new Set();
    for (const f of files) {
      if (f === ICONS) continue; // 唯一图标源本身
      // 演示种子是**数据面**：`data/mock/auxiliary.js` 的 base64 内联 SVG 是活动照片占位（内容，不是图标），
      // 与图标契约无关；图标契约只判 UI 层（components / entries / core / 样式）。
      if (f.startsWith('docs/src/data/')) continue;
      const hits = svgSourceHits(read(f));
      if (!hits.length) continue;
      hitFiles.add(f);
      if (!allow.has(f)) offenders.push(`${f} → ${hits.join(' / ')}（改走 icons.js 的 icon()）`);
    }
    assert.deepEqual(offenders, [],
      `icons.js 之外出现 SVG 生成点（DS_03 §4.11.2：图标只经 icons.js）：\n  ${offenders.join('\n  ')}`);
  
    // 白名单非空转：每条必须有理由、文件存在、且当前源码仍命中
    const zombie = [];
    for (const w of SVG_SOURCE_WHITELIST) {
      if (!w.reason || w.reason.length < 20) zombie.push(`${w.file}：缺理由（≥20 字）`);
      else if (!existsSync(join(ROOT, w.file))) zombie.push(`${w.file}：文件不存在`);
      else if (!hitFiles.has(w.file)) zombie.push(`${w.file}：登记后已无 SVG 生成点（应从白名单删除）`);
    }
    assert.deepEqual(zombie, [], `G1 白名单失效：\n  ${zombie.join('\n  ')}`);
  });
  
  // ── G2 icon() 的 stroke / fill ─────────────────────────────────────────
  /** 纯判据：`icon()` 实参里的 stroke / fill 字面量是否只取 currentColor / none / var(--token) */
  function iconColorViolations(args) {
    const out = [];
    for (const m of String(args).matchAll(/\b(stroke|fill)\s*:\s*(['"])([^'"]*)\2/g)) {
      const value = m[3].trim();
      if (COLOR_WORD_RE.test(value) || TOKEN_VAR_RE.test(value)) continue;
      out.push(`${m[1]}: '${value}'`);
    }
    return out;
  }
  
  test('G2 icon() 的 stroke / fill 只许 currentColor / none / var(--token)', () => {
    // 反例自证
    assert.deepEqual(iconColorViolations("{ stroke: '#FFF' }"), ["stroke: '#FFF'"],
      '反例未命中：hex 笔触未被判出（G2 正则失效）');
    assert.deepEqual(iconColorViolations("{ fill: 'rgb(0,0,0)' }"), ["fill: 'rgb(0,0,0)'"],
      '反例未命中：rgb() 填充未被判出');
    // 正例：三种合法取值 + 动态变量不误伤
    assert.deepEqual(iconColorViolations("{ stroke: 'currentColor', fill: 'none' }"), [], '误伤：currentColor / none 被判红');
    assert.deepEqual(iconColorViolations("{ stroke: 'var(--neutral-500)' }"), [], '误伤：令牌被判红');
    assert.deepEqual(iconColorViolations('{ stroke: this._accent }'), [], '误伤：动态变量被判红（由 G3 管令牌来源）');
  
    const offenders = [];
    let calls = 0;
    for (const f of scanFiles()) {
      if (f === ICONS) continue; // 定义处（默认值 stroke='currentColor' / fill='none'）
      const src = read(f);
      for (const args of iconCalls(src)) {
        calls += 1;
        for (const v of iconColorViolations(args)) offenders.push(`${f} → icon(…, { ${v} }…)`);
      }
    }
    assert.ok(calls >= 30, `icon() 调用点只扫到 ${calls} 处（应 ≥30）：判据可能失效`);
    assert.deepEqual(offenders, [],
      `icon() 传了字面色值（改 currentColor 继承或 var(--token)）：\n  ${offenders.join('\n  ')}`);
  });
  
  // ── G3 --tint 只收令牌 + 禁状态填充档 ────────────────────────────────────
  /** 纯判据①：字面 `--tint: <值>` 必须是 var(--token)，且不得取状态填充档 */
  function tintLiteralViolations(src) {
    const clean = stripComments(src);
    const out = [];
    for (const m of clean.matchAll(/--tint\s*:\s*([^;"'`}]+)/g)) {
      const value = m[1].trim();
      if (value.startsWith('${')) continue; // 模板占位（由 ② 按来源判）
      if (!TOKEN_VAR_RE.test(value)) out.push(`--tint: ${value}（只许 var(--token)）`);
      else if (STATUS_FILL_RE.test(value)) out.push(`--tint: ${value}（状态填充档不得当图标 / 数值色，改 -text 档）`);
    }
    return out;
  }
  
  /** 收集「形参里带 tint」的函数名（含 `function f(…tint…)` 与 `const f = (…tint…) =>`） */
  function tintFnNames(src) {
    const names = new Set();
    for (const m of String(src).matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/g)) {
      if (/\btint\b/.test(m[2])) names.add(m[1]);
    }
    for (const m of String(src).matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*\(([^)]*)\)\s*=>/g)) {
      if (/\btint\b/.test(m[2])) names.add(m[1]);
    }
    return [...names];
  }
  
  /** 纯判据②：喂给 tint 的值（`tint:` / `color:` 配置项、`tint` 形参的位置实参）不得取状态填充档 */
  function tintSourceViolations(src) {
    const clean = stripComments(src);
    const out = [];
    // ②-1 配置项：tint: 'var(--status-x)' / color: 'var(--status-x)'（accentColor 不算——不是图标笔触色）
    for (const m of clean.matchAll(/\b(tint|color)\s*:\s*(['"])([^'"]*)\2/g)) {
      if (STATUS_FILL_RE.test(m[3].trim())) out.push(`${m[1]}: '${m[3].trim()}'`);
    }
    // ②-2 位置实参：函数定义里形参名含 tint 的，调用实参不得传状态填充档字面量
    for (const name of tintFnNames(clean)) {
      const re = new RegExp(`(?:^|[^\\w$.])${name}\\s*\\(`, 'g');
      for (const m of clean.matchAll(re)) {
        const args = balancedArgs(clean, m.index + m[0].length - 1);
        if (STATUS_FILL_RE.test(args)) out.push(`${name}(… var(--status-{fill}) …)`);
      }
    }
    return out;
  }
  
  test('G3 --tint 只收令牌、禁状态填充档（含 tint: / color: 配置项与 tint 形参位置实参）', () => {
    // 反例自证①
    assert.deepEqual(tintLiteralViolations('style="--tint:var(--status-error);"'), ['--tint: var(--status-error)（状态填充档不得当图标 / 数值色，改 -text 档）'],
      '反例未命中：--tint 取状态填充档未被判出（G3 正则失效）');
    assert.equal(tintLiteralViolations('style="--tint:#EF4444;"').length, 1, '反例未命中：--tint 写 hex 未被判出');
    assert.equal(tintLiteralViolations('style="--tint:rgba(0,0,0,.2);"').length, 1, '反例未命中：--tint 写 rgba 未被判出');
    // 正例：文字档 / 中性档 / 占位不误伤
    assert.deepEqual(tintLiteralViolations('style="--tint:var(--status-error-text);"'), [], '误伤：-text 档被判红');
    assert.deepEqual(tintLiteralViolations('style="--tint:var(--neutral-500);"'), [], '误伤：中性令牌被判红');
    assert.deepEqual(tintLiteralViolations('style="--tint:${s.color};"'), [], '误伤：模板占位被判红');
  
    // 反例自证②：配置项 + 位置实参
    assert.equal(tintSourceViolations("{ a: 1, tint: 'var(--status-info)' }").length, 1,
      '反例未命中：tint: 取状态填充档未被判出');
    assert.equal(tintSourceViolations("{ label: 'x', color: 'var(--status-error)' }").length, 1,
      '反例未命中：color: 取状态填充档未被判出（status-color-guard 的盲区）');
    assert.equal(tintSourceViolations('function item(n, tint){}\nitem("clock", "var(--status-info)")').length, 1,
      '反例未命中：喂给 tint 形参的位置实参未被判出');
    // 正例
    assert.deepEqual(tintSourceViolations("{ tint: 'var(--status-info-text)' }"), [], '误伤：-text 档被判红');
    assert.deepEqual(tintSourceViolations("{ accentColor: 'var(--status-error)' }"), [],
      '误伤：accentColor 不是图标笔触色（人物选择器等强调色另判）');
  
    // 真实源码
    const offenders = [];
    for (const f of scanFiles()) {
      const src = read(f);
      for (const v of tintLiteralViolations(src)) offenders.push(`${f} → ${v}`);
      if (f.endsWith('.js')) for (const v of tintSourceViolations(src)) offenders.push(`${f} → ${v}`);
    }
    assert.deepEqual(offenders, [],
      `--tint / 图标笔触取到了非法色值（只许 var(--token)，状态色一律 -text 档）：\n  ${offenders.join('\n  ')}`);
  });
  
  // ── G4 SVG 片段色值（含 data-URI 的 %23 盲区）────────────────────────────
  /** 纯判据：SVG 片段里的 stroke / fill / stop-color 只许 currentColor / none / transparent / var(--token) / url(#id) */
  function svgPaintViolations(svgText) {
    const decoded = String(svgText).replace(/%23/gi, '#');
    const out = [];
    for (const m of decoded.matchAll(/\b(stroke|fill|stop-color)\s*=\s*(["'])([^"']*)\2/g)) {
      const value = m[3].trim();
      if (COLOR_WORD_RE.test(value) || TOKEN_VAR_RE.test(value) || SVG_PAINT_URL_RE.test(value)) continue;
      out.push(`${m[1]}="${value}"`);
    }
    // 无属性形态（CSS-in-SVG / 片段内联 style）里的 hex 同样判红
    for (const m of decoded.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
      if (decoded.includes(`="${m[0]}"`) || decoded.includes(`='${m[0]}'`)) continue; // 已由属性判定报出
      out.push(`色值 ${m[0]}`);
    }
    return [...new Set(out)];
  }
  
  /** 抽出源码里的 data-URI SVG 载荷（含 URL 编码形态） */
  function dataUriSvgPayloads(src) {
    return [...String(src).matchAll(/data:image\/svg\+xml[;,]([^"')]*)/gi)].map((m) => m[1]);
  }
  
  test('G4 SVG 片段色值只许 currentColor / none / var(--token) / url(#id)，hex 扫描含 %23', () => {
    // 反例自证：data-URI 的 URL 编码 hex 必须被判出
    assert.deepEqual(svgPaintViolations("<svg stroke='%239CA3AF'></svg>"), ['stroke="#9CA3AF"'],
      '反例未命中：data-URI 里 %23 编码的 hex 未被判出（G4 盲区未闭合）');
    assert.equal(svgPaintViolations('<svg fill="#EF4444"></svg>').length, 1, '反例未命中：字面 hex 未被判出');
    // 正例
    assert.deepEqual(svgPaintViolations('<svg stroke="currentColor" fill="none"></svg>'), [], '误伤：currentColor / none 被判红');
    assert.deepEqual(svgPaintViolations('<svg stroke="var(--neutral-400)"></svg>'), [], '误伤：令牌被判红');
    assert.deepEqual(svgPaintViolations('<path stroke="url(#ab-grad-0)"/>'), [], '误伤：渐变引用被判红');
  
    // 真实源码：`icons.js` 之外（**含 G1 白名单文件**）的 SVG 片段必须无色值。
    //   白名单只豁免「生成点」这一条（G1），不豁免色值——否则把 hex 写进白名单文件即可绕过 G4。
    const offenders = [];
    for (const f of scanFiles()) {
      if (f === ICONS) continue;
      const clean = stripComments(read(f));
      const svgs = [...clean.matchAll(/<svg\b[\s\S]*?<\/svg>/g)].map((m) => m[0]);
      for (const payload of dataUriSvgPayloads(clean)) svgs.push(payload);
      for (const s of svgs) for (const v of svgPaintViolations(s)) offenders.push(`${f} → ${v}`);
    }
    assert.deepEqual(offenders, [],
      `SVG 片段里写了字面量色值（改 currentColor 或 var(--token)）：\n  ${offenders.join('\n  ')}`);
  });
  
  // ── G5 图标尺寸 ─────────────────────────────────────────────────────────
  /** 纯判据：`icon()` 实参里的数字 size / width / height */
  function iconDimensionViolations(args) {
    return [...String(args).matchAll(/\b(size|width|height)\s*:\s*(\d+)/g)].map((m) => `${m[1]}: ${m[2]}`);
  }
  
  test('G5 图标尺寸由 CSS 类驱动：数字 size / width / height 只在白名单（12px 下拉图标）', () => {
    // 反例自证
    assert.deepEqual(iconDimensionViolations("{ size: 18 }"), ['size: 18'], '反例未命中：数字 size 未被判出');
    assert.deepEqual(iconDimensionViolations("{ width: 20, height: 20 }"), ['width: 20', 'height: 20'],
      '反例未命中：数字 width / height 未被判出');
    // 正例：类名驱动不误伤
    assert.deepEqual(iconDimensionViolations("{ className: 'w-4 h-4' }"), [], '误伤：CSS 类被判红');
  
    const allow = new Map(DIMENSION_WHITELIST.map((w) => [w.file, w]));
    const offenders = [];
    for (const f of scanFiles()) {
      if (f === ICONS) continue;
      for (const args of iconCalls(read(f))) {
        for (const v of iconDimensionViolations(args)) {
          const w = allow.get(f);
          const px = Number(v.split(':')[1].trim());
          if (!w || !w.sizes.includes(px)) offenders.push(`${f} → icon(…, { ${v} }…)（尺寸交给 className）`);
        }
      }
    }
    assert.deepEqual(offenders, [],
      `图标尺寸被写死（DS_03 §4.11.2 尺寸由 CSS 类驱动）：\n  ${offenders.join('\n  ')}`);
  
    // 白名单非空转
    for (const w of DIMENSION_WHITELIST) {
      assert.ok(w.reason && w.reason.length > 20, `尺寸白名单缺理由：${w.file}`);
      assert.ok(existsSync(join(ROOT, w.file)), `尺寸白名单指向不存在的文件：${w.file}`);
    }
  });

})();

// ═══ 源件 9：theme-pref.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // server/test/theme-pref.test.mjs — 外观偏好键空间隔离（设置中心 R1-A 裁决，2026-09-09）纯逻辑单测
  // 覆盖支书裁决「方案 A」四个断言面：
  //   1) 登录用户 person 无键 → 出厂默认（主题=跟随系统默认档 / 字号=中 / 强调色=null），
  //      绝不回落读全局键、绝不「写一次」迁移（新账号首登不继承上一登录者外观）；
  //   2) 登录用户写入只落 person 键（gsm1921-pref-<personId>-{theme,font-size,accent-role}），
  //      绝不材料化全局键；
  //   3) 访客读写只走全局键（workflowos_theme / workflowos_font_size / workflowos_accent_role，行为不变）；
  //   4) 两空间互不污染（登录行为不改访客键；访客行为不改任何 person 键）。
  // 运行：node --test server/test/theme-pref.test.mjs（纯 node；localStorage/sessionStorage 注入 stub，
  //       theme.js 经 login-snapshot 判定登录态，DOM 路径全部有 typeof 守卫 → node 安全）。
  // 注意：本文件仅断言「键空间读写判定」，DOM class / --app-accent 生效由浏览器复验覆盖。
  
  const { test, beforeEach } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { getThemePreference, setThemePreference, getFontSizePreference, setFontSizePreference, getAccentRolePreference, setAccentRolePreference, resolveAppliedAccentRole, personPrefKey, syncAppearanceForActiveUser, getAppliedAccentColors, } = await import('../../docs/src/core/boot/theme.js?v=20261120a');
  const THEME_KEY = 'workflowos_theme';
  const FONT_KEY = 'workflowos_font_size';
  const ACCENT_KEY = 'workflowos_accent_role';
  const LOGIN_KEY = 'gsm1921-login-user';
  const TAB_KEY = 'gsm1921-tab-id';
  
  // ── 存储 stub（Map 实现；登录态经 login-snapshot 读取 localStorage LOGIN_KEY +
  //    sessionStorage TAB_KEY 判定，与偏好存储共用同一注入）──
  function installStorage() {
    const store = new Map();
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
      key: (i) => [...store.keys()][i] ?? null,
      get length() { return store.size; },
      _store: store,
    };
    globalThis.sessionStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
    return store;
  }
  beforeEach(() => { installStorage(); });
  
  /** 模拟登录（personId；LOGIN_KEY 不带 tabId → login-snapshot 直接判定登录态） */
  function loginAs(personId) {
    globalThis.localStorage.setItem(LOGIN_KEY, JSON.stringify({ personId, role: 'secretary' }));
  }
  const logout = () => globalThis.localStorage.removeItem(LOGIN_KEY);
  
  function keysOf(store) { return [...store.keys()].filter(k => k !== LOGIN_KEY); }
  function personKeysOf(store) { return keysOf(store).filter(k => k.startsWith('gsm1921-pref-')); }
  
  // ── 1) 登录用户 person 无键 = 出厂默认，不回退全局、零写入 ──
  test('R1-A：访客在全局键留下偏好后，新登录账号 person 无键 → 出厂默认不继承（不回退/不迁移写入）', () => {
    const store = installStorage();
    // 上一「登录者/访客」经全局键留下的外观（R1 缺陷源）
    store.set(THEME_KEY, 'dark');
    store.set(FONT_KEY, 'large');
    store.set(ACCENT_KEY, 'participant');
  
    loginAs('2400012349'); // 新账号首登：person 空间全新
    assert.equal(getThemePreference(), 'system', '主题默认 = 跟随系统默认档（不继承全局 dark）');
    assert.equal(getFontSizePreference(), 'medium', '字号默认 = 中（不继承全局 large）');
    assert.equal(getAccentRolePreference(), null, '强调色默认 = 未设置 null（不继承全局 participant）');
    assert.equal(personKeysOf(store).length, 0, '首登零写入：绝不「读一次迁移写」person 键');
    // 全局键保持原值（登录读取不回退 → 亦不触碰访客空间）
    assert.equal(store.get(THEME_KEY), 'dark');
    assert.equal(store.get(FONT_KEY), 'large');
    assert.equal(store.get(ACCENT_KEY), 'participant');
  });
  
  // ── 2) 登录用户写入只落 person 键 ──
  test('R1-A：登录用户 set 只写 person 键，绝不材料化全局键', () => {
    const store = installStorage();
    store.set(THEME_KEY, 'light'); // 访客先前偏好（应保持原样，不被登录行为改写）
    store.set(FONT_KEY, 'medium');
    store.set(ACCENT_KEY, 'secretary');
  
    loginAs('2300010001');
    setThemePreference('dark');
    setFontSizePreference('large');
    setAccentRolePreference('participant');
  
    assert.equal(store.get(personPrefKey('2300010001', '-theme')), 'dark');
    assert.equal(store.get(personPrefKey('2300010001', '-font-size')), 'large');
    assert.equal(store.get(personPrefKey('2300010001', '-accent-role')), 'participant');
    // 全局键 = 访客原值（登录写入未触碰）
    assert.equal(store.get(THEME_KEY), 'light');
    assert.equal(store.get(FONT_KEY), 'medium');
    assert.equal(store.get(ACCENT_KEY), 'secretary');
  });
  
  // ── 3) 访客读写只走全局键（行为不变）──
  test('R1-A：访客 set 只写全局键，get 读全局键；不产生任何 person 键', () => {
    const store = installStorage();
    logout();
    setThemePreference('light');
    setFontSizePreference('large');
    setAccentRolePreference('purple'); // ACCENT_COLORS 合法色板键（'green' 非合法键，会回落）
    assert.equal(store.get(THEME_KEY), 'light');
    assert.equal(store.get(FONT_KEY), 'large');
    assert.equal(store.get(ACCENT_KEY), 'purple');
    assert.equal(getThemePreference(), 'light');
    assert.equal(getFontSizePreference(), 'large');
    assert.equal(getAccentRolePreference(), 'purple');
    assert.equal(personKeysOf(store).length, 0, '访客行为不落 person 键');
    assert.equal(resolveAppliedAccentRole('secretary'), 'purple', '访客生效强调色 = 全局覆盖优先');
  });
  
  // ── 4) 双账号互不污染 + 切号读回 ──
  test('R1-A：2300010001 与 2400012349 偏好互不污染；切号后读回各自 person 键（2400012349 无键=默认）', () => {
    const store = installStorage();
    loginAs('2300010001');
    setThemePreference('dark');
    setFontSizePreference('large');
    setAccentRolePreference('participant');
    logout();
  
    loginAs('2400012349'); // 切到另一账号：默认不继承
    assert.equal(getThemePreference(), 'system');
    assert.equal(getFontSizePreference(), 'medium');
    assert.equal(getAccentRolePreference(), null);
    logout();
  
    loginAs('2300010001'); // 切回支书：person 键仍在
    assert.equal(getThemePreference(), 'dark');
    assert.equal(getFontSizePreference(), 'large');
    assert.equal(getAccentRolePreference(), 'participant');
    assert.equal(personKeysOf(store).length, 3, '仅 2300010001 三个 person 键；2400012349 首登零写入');
  });
  
  // ── 补充：resolveAppliedAccentRole 无覆盖回落默认金色（批次 505：默认主题键 = gold） ──
  test('resolveAppliedAccentRole：登录无覆盖 → 默认 gold；有覆盖 → 覆盖键；非法覆盖 → 默认 gold', () => {
    const store = installStorage();
    loginAs('2300010001');
    assert.equal(resolveAppliedAccentRole('secretary'), 'gold', '登录无覆盖 → 默认主题键 gold（绝不回落全局/角色色）');
    store.set(ACCENT_KEY, 'leader'); // 全局残留上一登录者/访客键（应被无视）
    assert.equal(resolveAppliedAccentRole('secretary'), 'gold', '登录解析无视全局残留');
    setAccentRolePreference('purple'); // 7 主题键之一
    assert.equal(resolveAppliedAccentRole('secretary'), 'purple', 'person 覆盖 → 覆盖键');
    setAccentRolePreference('leader'); // 历史角色键
    assert.equal(resolveAppliedAccentRole('secretary'), 'green', '角色键经别名收敛到 7 主题键（leader → green）');
    setAccentRolePreference('sky'); // 已删除的重复色相
    assert.equal(resolveAppliedAccentRole('secretary'), 'blue', '旧键 sky 应回落 blue');
    setAccentRolePreference('deep'); // 已删除的雾紫
    assert.equal(resolveAppliedAccentRole('secretary'), 'purple', '旧键 deep 应回落 purple');
    setAccentRolePreference('ghost-role'); // 非法键
    assert.equal(resolveAppliedAccentRole('secretary'), 'gold', '非法覆盖 → 默认 gold');
  });
  
  // ── 补充：node 无 DOM 环境下模块 API 安全（守卫路径不抛）──
  test('node 环境安全：sync/DOM 依赖 API 有 typeof 守卫，调用不抛', () => {
    loginAs('2300010001');
    assert.equal(syncAppearanceForActiveUser(), undefined);
    setThemePreference('dark');
  });
  
  // ── 补充（R1-A 点⑤，2026-09-09）：getAppliedAccentColors 渲染时解析 =
  //    getAccentColors(resolveAppliedAccentRole(fallback))——登录人 person 覆盖生效、
  //    覆盖非法回落角色默认、访客回落全局键，供各消费点统一取色（模块加载期快照的替代）。
  //    批次 505：取色改为 7 主题显式表（softBg / softBorder / softText / strongBg / strongInk …），
  //    不再按 alpha 派生 rgba。 ──
  test('getAppliedAccentColors：登录 person 覆盖生效 / 无覆盖=默认金 / 非法覆盖回落默认金', () => {
    const store = installStorage();
    loginAs('2300010001');
    // 无 person 覆盖 → 默认 gold 主题（亮色 base #A97A12）
    assert.equal(getAppliedAccentColors('secretary').accent, '#A97A12');
    // 全局残留（上一登录者/访客键）被无视
    store.set(ACCENT_KEY, 'leader');
    assert.equal(getAppliedAccentColors('secretary').accent, '#A97A12', '登录解析无视全局残留');
    // person 覆盖（participant 历史键 → gold 主题）→ 生效覆盖色（显式表 soft 三件套）
    setAccentRolePreference('participant');
    assert.equal(getAppliedAccentColors('secretary').accent, '#A97A12', 'participant → gold 主题（亮色 base）');
    assert.equal(getAppliedAccentColors('secretary').softBg, '#FBF3DC', '浅底取 gold.softBg');
    assert.equal(getAppliedAccentColors('secretary').softBorder, '#E8D5A3', '浅底描边取 gold.softBorder');
    assert.equal(getAppliedAccentColors('secretary').softText, '#6E4E08', '浅底深字取 gold.softText');
    // 覆盖非法 → 回落默认 gold
    setAccentRolePreference('ghost-role');
    assert.equal(getAppliedAccentColors('secretary').accent, '#A97A12');
    // 覆盖宣传委员（角色键 → blue 主题）→ 设置与页面同源
    setAccentRolePreference('prop-commissioner');
    assert.equal(getAppliedAccentColors('secretary').accent, '#3D4E9C');
    // 历史 alpha 参数已不生效（显式 token 不再派生 rgba）
    const { softBg, softBorder } = getAppliedAccentColors('secretary', 0.2, 0.5);
    assert.equal(softBg, '#EEF0F9', '浅底仍取 blue.softBg（alpha 参数不再生效）');
    assert.equal(softBorder, '#C8CEE9', '描边仍取 blue.softBorder（alpha 参数不再生效）');
  });
  
  test('getAppliedAccentColors：访客全局覆盖优先 / 无覆盖回落默认金', () => {
    const store = installStorage();
    logout();
    store.set(ACCENT_KEY, 'leader');
    assert.equal(getAppliedAccentColors('secretary').accent, '#2F6B4F', '访客生效强调色 = 全局覆盖优先（leader → green）');
    store.clear();
    logout();
    assert.equal(getAppliedAccentColors('secretary').accent, '#A97A12', '访客无覆盖 → 默认 gold');
  });

})();

// ═══ 源件 10：ui-primary-cta-color.test.mjs ═══
await (async () => {
  // role: [工程师]+[AI]
  // ui-primary-cta-color.test.mjs — 主 CTA 主题色实底守卫（2026-10-19 立；2026-10-23 批次 505 改口径）
  //
  // 口径：`.btn-accent` 背景不得再与深灰混合（泥褐），也不得再用 color-mix 压深；
  // 批次 505 起实底 = 主题表的 `strongBg`、实底字 = `strongInk`（8 token 显式表，逐主题手选）。
  // 运行：node --test server/test/ui-primary-cta-color.test.mjs
  const { test } = await import('node:test');
  const assert = (await import('node:assert/strict')).default;
  const { readFileSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const HERE = dirname(fileURLToPath(import.meta.url));
  const ROOT = join(HERE, '..', '..');
  const CSS = readFileSync(join(ROOT, 'docs', 'src', 'styles.css'), 'utf8');
  const CONSTANTS = readFileSync(join(ROOT, 'docs', 'src', 'core', 'domain', 'constants.js'), 'utf8');
  
  /** 取 `.btn-accent { … }` 规则体（排除 :hover / :disabled） */
  function btnAccentBody() {
    const m = /\.btn-accent\s*\{([^}]*)\}/.exec(CSS);
    return m ? m[1] : '';
  }
  
  test('C1 主 CTA 不再混入深灰 #1F2937', () => {
    const body = btnAccentBody();
    assert.ok(body, '未找到 .btn-accent 规则');
    assert.doesNotMatch(body, /#1F2937/i, '.btn-accent 仍在混入 #1F2937（泥褐）');
    assert.doesNotMatch(body, /color-mix\([^)]*#1F2937/i, '.btn-accent 仍用 color-mix(...#1F2937)');
  });
  
  test('C2 主 CTA 使用角色色令牌', () => {
    const body = btnAccentBody();
    assert.match(body, /var\(--app-accent/, '.btn-accent 背景未使用 --app-accent 令牌');
  });
  
  test('C3 实底/实底字查表：strongBg + strongInk（无 color-mix 压深）', () => {
    // 批次 505：每个主题的实底与实底字都是手选 hex（strongBg / strongInk），
    // 不再用 `color-mix(in srgb, 主题色 58%, black)` 按亮度压深。
    assert.match(CSS, /\.btn-accent\s*\{[^}]*background:\s*var\(--app-accent-strong-bg\)/,
      '.btn-accent 背景应为 var(--app-accent-strong-bg)（查表 strongBg）');
    assert.match(CSS, /\.btn-accent\s*\{[^}]*color:\s*var\(--app-accent-strong-ink\)/,
      '.btn-accent 文字色应为 var(--app-accent-strong-ink)（查表 strongInk）');
    assert.doesNotMatch(CSS, /color-mix\([^)]*var\(--app-accent[^)]*black/i,
      'styles.css 不得再用 color-mix(主题色 … black) 生成实底');
    assert.match(CONSTANTS, /return \{ bg: t\.strongBg, text: t\.strongInk, strong: t\.strongBg, ink: t\.strongInk, strongHover: t\.strongHover \};/,
      'accentButtonColors 应直接查表返回 strongBg / strongInk / strongHover');
    assert.match(CONSTANTS, /export function accentButtonColors/, '缺少 accentButtonColors 单一源');
  });

  test('T14 场域固定色：六页声明 data-accent-scope=party，theme.js 优先解析 party-red，且不进设置页色板', async () => {
    const { readFileSync: rf } = await import('node:fs');
    const R = new URL('../../', import.meta.url);
    const rd = (rel) => rf(new URL(rel, R), 'utf8');
    const scopePages = ['docs/login.html', 'docs/workspace/party-committee.html', 'docs/workspace/secretary.html', 'docs/workspace/org.html', 'docs/workspace/prop.html', 'docs/workspace/disc.html'];
    const personalPages = ['docs/workspace/visitor.html', 'docs/workspace/leader.html', 'docs/workspace/branch-readonly.html'];
    for (const f of scopePages) {
      assert.match(rd(f), /<html[^>]*data-accent-scope="party"/, `${f} 应声明 data-accent-scope="party"（治理场域固定党建红）`);
    }
    for (const f of personalPages) {
      assert.doesNotMatch(rd(f), /data-accent-scope="party"/, `${f} 属个人台，不得固定场域色`);
    }
    const theme = rd('docs/src/core/boot/theme.js');
    assert.match(theme, /accentScope === 'party'\)\s*return 'party-red'/, 'theme.js::resolveAppliedAccentRole 应按 data-accent-scope 优先返回 party-red');
    const { ACCENT_PALETTE } = await import('../../docs/src/core/domain/constants.js?v=20261120a');
    assert.ok(!ACCENT_PALETTE.some((c) => c.key === 'party-red'), 'party-red 不得进 ACCENT_PALETTE（设置页仍 7 项）');
  });

})();
