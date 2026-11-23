// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/scripts/audit/dom-probe.mjs —— 浏览器侧 DOM 采集单一源
//
//  口径（2026-11-02 批次 527 · Wave 1）：
//   · `hasPager(root)` 是分页承载的唯一判据：`.lf-pager [data-lf-page]` 或 `.page-btn`；
//     checks-front F7、checks-data D2、page-sweep P1/P3/P11 一律走它，不再各写一套选择器。
//   · `h2Summary(root)` 是页题摘要的单一实现（page-sweep 的「H2 恰 1」与 checks-front F4 同口径）。
//   · `collectDom` 只读 DOM；通过 `withSharedDomHelpers` 注入上面的 helper 后交给 page.evaluate，
//     保证浏览器侧与 Node 侧用的是同一份实现（函数体序列化时不能依赖外部自由变量）。
// ════════════════════════════════════════════════════════════════

/**
 * 分页承载判定（唯一判据）。
 * @param {Element|Document|null} root
 * @returns {boolean}
 */
export function hasPager(root) {
  if (!root) return false;
  if (typeof root.matches === 'function' && root.matches('.page-btn')) return true;
  return !!root.querySelector('.lf-pager [data-lf-page], .page-btn');
}

/**
 * 可见 H2 摘要（页题恰 1 的同一口径）。
 * @param {Element|Document|null} root
 * @returns {{count:number,sizes:number[]}}
 */
export function h2Summary(root) {
  if (!root) return { count: 0, sizes: [] };
  const headings = [...root.querySelectorAll('h2')].filter((el) => el.offsetParent !== null);
  return {
    count: headings.length,
    sizes: [...new Set(headings.map((el) => Math.round(parseFloat(getComputedStyle(el).fontSize) * 100) / 100))],
  };
}

const HAS_PAGER_SRC = `const hasPager = ${hasPager.toString()};`;
const H2_SUMMARY_SRC = `const h2Summary = ${h2Summary.toString()};`;

/**
 * 把共用 helper 的源码注入待执行函数（Playwright 序列化函数体时不会携带闭包）。
 * @param {Function} fn 形如 `(cfg) => …`
 * @returns {Function} 可在浏览器侧通过 page.evaluate 执行的等价函数
 */
export function withSharedDomHelpers(fn) {
  // eslint-disable-next-line no-new-func
  return new Function('cfg', `${HAS_PAGER_SRC}\n${H2_SUMMARY_SRC}\nreturn (${fn.toString()})(cfg);`);
}

/** page-sweep 的 H2 探针（传入内容容器 id） */
export function buildH2Probe() {
  // eslint-disable-next-line no-new-func
  return new Function('rootId', `${H2_SUMMARY_SRC}\nreturn h2Summary(document.getElementById(rootId));`);
}

/** D2 的分页探针（传入内容容器 id；缺省整页） */
export function buildHasPagerProbe() {
  // eslint-disable-next-line no-new-func
  return new Function('rootId', `${HAS_PAGER_SRC}\nreturn hasPager(rootId ? document.getElementById(rootId) : document);`);
}

/** checks-front 的 DOM 采集探针 */
export function buildCollectDomProbe() {
  return withSharedDomHelpers(collectDom);
}

/**
 * 浏览器侧采集（纯函数，只读 DOM）。经由 `buildCollectDomProbe()` 注入 helper 后执行。
 * @param {{contentId:string, pageRows:number}} cfg
 */
export function collectDom(cfg) {
  const content = document.getElementById(cfg.contentId);
  if (!content) return { hasContent: false };

  const isVisible = (el) => {
    if (!el) return false;
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden';
  };
  const clsOf = (el) => {
    const raw = typeof el.className === 'string' ? el.className : (el.getAttribute('class') || '');
    return raw.trim().split(/\s+/).slice(0, 3).join(' ');
  };
  const textOf = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();

  // F1：顶层块（排除页头）
  // 口径（2026-11-02 批次 526）：块 = 语义容器（section/aside/article/details/form/table/.card/.disclosure-host）；
  //   纯 div 包装层递归透明化，遇到第一个语义容器即停（其内部子块不再计入顶层）。
  //   这样不依赖 Tailwind 类白名单，也不会把卡内彩色子面板误算成顶层块。
  // ⚠ 2026-11-14 批次 550（D-873）：实现与上述口径对齐——**行内叶子不再计为块**。
  //   旧实现把「无子元素的行内节点」（`span` / `svg` / `p` 等）也 push 成块，
  //   实测在 `secretary.calendar`（9 个图例行内 span）/ `visitor.activities`（8 个 SVG 节点）/
  //   `secretary.report-up`（10 个列表行内 span/p）造出 10/14/9 的假读数；现改为：
  //   ① 子树里只要出现语义容器，就只认语义容器；② 一个语义容器都没有时，把该容器整体算 1 块。
  const BLOCK_SELECTOR = 'section, aside, article, details, form, table, .card, .disclosure-host';
  const isSemanticBlock = (el) => {
    try { return el.matches(BLOCK_SELECTOR); } catch { return false; }
  };
  const expandBlocks = (el, depth) => {
    if (depth > 6 || isSemanticBlock(el)) return [el];
    const kids = [...el.children].filter(isVisible).filter((kid) => !kid.matches('.page-frame__header'));
    if (!kids.length) return [el];
    // 重复兄弟（≥4 个同 tag+同 class）= 列表项，按 1 个「块种」计，避免把活动/成员列表的 12 张同构卡
    // 误算成 12 个顶层区块。
    const groups = new Map();
    for (const kid of kids) {
      const sig = kid.tagName + '|' + String(kid.className || '').trim().split(/\s+/).slice(0, 2).join(' ');
      const bucket = groups.get(sig) || [];
      bucket.push(kid);
      groups.set(sig, bucket);
    }
    const kept = [];
    for (const bucket of groups.values()) {
      if (bucket.length >= 4) kept.push(bucket[0]);
      else kept.push(...bucket);
    }
    const collected = [];
    for (const kid of kept) collected.push(...expandBlocks(kid, depth + 1));
    if (collected.some(isSemanticBlock)) return collected.filter(isSemanticBlock);
    return [el];
  };
  const blockEls = [];
  for (const el of [...content.children]) {
    if (el.matches('header.page-frame__header, .page-frame__header') || !isVisible(el)) continue;
    blockEls.push(...expandBlocks(el, 0));
  }
  const rawBlockCount = [...content.children]
    .filter((el) => !el.matches('header.page-frame__header, .page-frame__header') && isVisible(el)).length;
  const blocks = blockEls.map((el) => ({ tag: el.tagName.toLowerCase(), cls: clsOf(el) }));

  // F2：筛选条（控件行数 / 方向 / reset 整行）
  // 行数口径（2026-11-02 修正）：按**控件 top ±4px 聚簇**，簇数即行数——
  //   `.lf-bar` 的绝对高度会含容器上下 padding（实测合规两行 ≈96px），不能用固定 88px 判。
  //   控件取最外层匹配件（`.cs-select` 内的 button、`.suggest` 内的 input 不重复计），同 top 不影响簇数。
  const CTRL_SELECTOR = 'input, select, button, .cs-select, .lf-range, .suggest';
  const countBarRows = (bar) => {
    const all = [...bar.querySelectorAll(CTRL_SELECTOR)].filter(isVisible);
    const outer = all.filter((el) => !all.some((other) => other !== el && other.contains(el)));
    const tops = outer
      .map((el) => el.getBoundingClientRect().top)
      .filter((top) => Number.isFinite(top))
      .sort((a, b) => a - b);
    if (!tops.length) return 1;
    let rows = 1;
    let clusterTop = tops[0];
    for (const top of tops.slice(1)) {
      if (top - clusterTop > 4) {
        rows += 1;
        clusterTop = top;
      }
    }
    return rows;
  };
  const bars = [...content.querySelectorAll('.lf-bar')].filter(isVisible).map((bar) => {
    const rect = bar.getBoundingClientRect();
    const cs = getComputedStyle(bar);
    const resetFullWidth = [...bar.querySelectorAll('.lf-btn')]
      .filter((btn) => isVisible(btn))
      .some((btn) => {
        const btnCs = getComputedStyle(btn);
        return btnCs.flexBasis === '100%' || (rect.width > 0 && btn.getBoundingClientRect().width >= rect.width * 0.99);
      });
    return {
      rows: countBarRows(bar),
      height: Math.round(rect.height * 10) / 10,
      flexDirection: cs.flexDirection,
      resetFullWidth,
    };
  });

  // F3：原生输入装饰 + suggest ARIA
  const inputList = content.querySelectorAll('input[list]').length;
  const datalist = content.querySelectorAll('datalist').length;
  const suggest = [...content.querySelectorAll('.suggest__input')].map((el) => ({
    hasRoleCombobox: el.getAttribute('role') === 'combobox',
  }));

  // F4：可见标题序列
  const headings = [...content.querySelectorAll('h1, h2, h3, h4, h5, h6')].filter(isVisible).map((el) => ({
    level: Number(el.tagName.slice(1)),
    text: textOf(el).slice(0, 30),
  }));

  // F5：section 命名 / 嵌套
  const sections = [...content.querySelectorAll('section')].filter(isVisible).map((el) => {
    const label = (el.getAttribute('aria-label') || '').trim();
    const labelledby = (el.getAttribute('aria-labelledby') || '').trim();
    const ids = labelledby ? labelledby.split(/\s+/).filter(Boolean) : [];
    const idsResolved = ids.length > 0 && ids.every((id) => !!document.getElementById(id));
    return {
      hasLabel: !!(label || idsResolved),
      label: label || labelledby,
      id: el.id || '',
      cls: clsOf(el),
      parent: el.parentElement ? el.parentElement.tagName.toLowerCase() : '',
    };
  });
  const nestedSections = [...content.querySelectorAll('section section')].map((el) => {
    const outer = el.parentElement?.closest('section');
    return {
      inner: el.id || clsOf(el),
      outer: outer ? (outer.id || clsOf(outer)) : '',
    };
  });

  // F6：空态文本启发式（文本节点，最近容器无 .empty-state）
  //   2026-11-10 批次 541：两类「不是空态」的文本排除（判据可布尔化，命中记入 emptyIgnored 供复核）：
  //     ① 指标占位：`<指标名> —（<说明>）`（如「出勤 —（暂无应到名单）」）；
  //     ② 分组提示：与同级标题（h1–h5）并排的 `<span>` 说明（如「本期没有记录」）。
  const hits = [];
  const ignored = [];
  const seen = new Set();
  const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
  const re = /暂无|没有|还没有/;
  const METRIC_PLACEHOLDER_RE = /^[^\u2014]{1,20}\u2014（[^）]{1,30}）$/;
  const isMetricPlaceholder = (text) => METRIC_PLACEHOLDER_RE.test(text);
  const isHeadingHint = (el) => {
    if (!el || el.tagName !== 'SPAN') return false;
    const row = el.parentElement;
    return !!row && !!row.querySelector('h1, h2, h3, h4, h5');
  };
  let node = walker.nextNode();
  while (node && hits.length < 12) {
    const text = (node.nodeValue || '').replace(/\s+/g, ' ').trim();
    if (text && re.test(text)) {
      const parent = node.parentElement;
      const tag = parent ? parent.tagName.toLowerCase() : '';
      // 表格空态由 empty-state.js 的 table 变体产出：`<tr class="is-empty">` 内是
      // `.empty-state__text`，没有外层 `.empty-state`——这是同一组件的合法形态，不能算「裸文本」。
      if (parent && !['script', 'style', 'template', 'noscript'].includes(tag)
        && !parent.closest('.empty-state, .is-empty, .empty-state__text') && isVisible(parent)) {
        const sig = text.slice(0, 60) + ' @ ' + tag;
        if (!seen.has(sig)) {
          seen.add(sig);
          const why = isMetricPlaceholder(text) ? 'metric-placeholder'
            : (isHeadingHint(parent) ? 'heading-hint' : '');
          if (why) ignored.push({ text: text.slice(0, 60), tag, cls: clsOf(parent), why });
          else hits.push({ text: text.slice(0, 60), tag, cls: clsOf(parent) });
        }
      }
    }
    node = walker.nextNode();
  }

  // F7：长列表分页门槛（1440 DOM；判据与 page-sweep / D2 同一 hasPager）
  const engineOverPage = [];
  content.querySelectorAll('.lf-root').forEach((root) => {
    const list = root.querySelector('.lf-list');
    if (!list) return;
    const tbody = list.querySelector('tbody');
    const rows = tbody ? tbody.querySelectorAll('tr').length : list.children.length;
    if (rows > cfg.pageRows && !hasPager(root)) engineOverPage.push({ rows });
  });
  const tableOverPage = [];
  const hasAnyPager = hasPager(content);
  content.querySelectorAll('table.data-table').forEach((table) => {
    if (table.closest('.lf-root') || table.closest('.rm-root')) return;
    const rows = table.querySelectorAll('tbody tr').length;
    if (rows > cfg.pageRows && !hasAnyPager) tableOverPage.push({ rows });
  });

  return {
    hasContent: true,
    blocks,
    rawBlockCount,
    bars,
    inputList,
    datalist,
    suggest,
    headings,
    sections,
    nestedSections,
    emptyHits: hits,
    emptyIgnored: ignored,
    engineOverPage,
    tableOverPage,
  };
}
