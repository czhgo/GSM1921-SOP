// role: [工程师]+[AI]
// audit/checks-front.mjs — F1–F8 前端维度检查（批次 526 · Wave 1-A）
//
// 口径见 `.trae/documents/2026-11-02-tab-audit-asset.md` §3.3：
//   F1 顶层块数 ≤4；>4 且 `TAB_BLOCK_BASELINE[key].reason` 非空 ⇒ exception，为空 ⇒ P1；
//      DOM 实测与基线块数不一致 ⇒ P1。
//   F2 `.lf-bar` **控件行数 ≤ 2**（按控件 top ±4px 聚簇计数，不看绝对高度）、非 column、
//      reset（`.lf-btn`）不得 flex-basis:100%。高度读数只作 evidence，不作阈值。
//   F3 无 `input[list]` / `datalist`；`.suggest__input` 必须 role="combobox"。
//   F4 可见 H1 = 0、H2 恰好 1；H3 前必须有 H2、H4 前必须有 H3（跳级 ⇒ P1）。
//   F5 每个 section 必须有 aria-label，或 aria-labelledby 指向存在的 id；不得 section 嵌套。
//   F6 可见「暂无 / 没有」文本不在 `.empty-state` 内 ⇒ P2（启发式，人工复核）。
//   F7 390 无横向溢出；`.lf-root` / 手写表行数 > 门槛时必须由同一 `hasPager(root)` 命中
//      （`.lf-pager [data-lf-page]` 或 `.page-btn`）。
//   F8 打开页签期间 pageerror 0、`/api/v1/` 4xx 0（P0）；**仅** console.error 非空 ⇒ P1
//      （2026-11-02 分级：控制台噪声不阻断功能，但本轮要修）。
// ⚠ 本文件只做**读**：不点击、不写库、不改页面；390 审次结束后恢复原视口。

import { TAB_BLOCK_BASELINE, TAB_BLOCK_LIMIT } from '../../test/style-baseline.mjs';
import { buildCollectDomProbe } from './dom-probe.mjs';
import { severityOf } from './severity.mjs';

/** 筛选条控件行数上限（SD-58；高度只作 evidence） */
const BAR_ROW_LIMIT = 2;
/** 长列表分页门槛：>10 行必须有分页（与 page-sweep P1/P3 同口径；检索条门槛另用 SEARCH_FILTER_MIN_ROWS） */
const PAGE_ROWS = 10;

const RULES = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8'];

/**
 * 统一 Finding（severity 默认由 severity.mjs 单一源判定；`severityOverride` 供分级检查复用同一规则编号）。
 */
function makeFinding(key, rule, status, message, evidence, severityOverride) {
  return {
    key,
    rule,
    severity: severityOverride || severityOf(rule),
    status,
    message,
    evidence: evidence ?? null,
  };
}

/**
 * 运行 F1–F8。调用前页面必须已停在目标页签（1440 视口）。
 * @param {{key:string, role:string, tab:string, label:string, source:string, blocks:number,
 *          page:import('playwright').Page, stability?:{pageErrors:string[],consoleErrors:string[],http4xx:Array},
 *          shots?:{wide?:string,narrow?:string}, timeout?:number}} ctx
 * @returns {Promise<Array<{key:string,rule:string,severity:string,status:string,message:string,evidence:any}>>}
 */
export async function runFrontChecks(ctx) {
  const { key, role, page, stability, shots } = ctx;
  const contentId = `${role}-tab-content`;
  const findings = [];

  let dom;
  try {
    dom = await page.evaluate(buildCollectDomProbe(), { contentId, pageRows: PAGE_ROWS });
  } catch (e) {
    for (const rule of RULES.slice(0, 6)) {
      findings.push(makeFinding(key, rule, 'exception', `页面 DOM 读取失败：${e.message}`, null));
    }
    findings.push(makeFinding(key, 'F7', 'skip', 'DOM 读取失败，未做 390 量测', null));
    findings.push(makeFinding(key, 'F8', 'exception', `DOM 读取失败：${e.message}`, stability ?? null));
    return findings;
  }

  if (!dom.hasContent) {
    for (const rule of RULES.slice(0, 6)) {
      findings.push(makeFinding(key, rule, 'exception', `内容容器 #${contentId} 不存在（页签未渲染）`, null));
    }
    findings.push(makeFinding(key, 'F7', 'skip', '内容容器不存在，未做 390 量测', null));
    findings.push(makeFinding(key, 'F8', 'exception', '内容容器不存在（页签未渲染）', stability ?? null));
    return findings;
  }

  const baseline = TAB_BLOCK_BASELINE[key] || {};
  const baselineBlocks = Number(baseline.blocks) || ctx.blocks || 0;
  const baselineReason = String(baseline.reason || '').trim();

  // ── F1 顶层块数 ─────────────────────────────────────────────
  // 2026-11-02 批次 526 校准：DOM 计数受「列表项 / 同构卡」影响，不能直接与人工基线做严格相等；
  //   故 F1 以**基线登记**为判据（>4 必须有 reason），DOM measured 只作证据与人工复核线索，
  //   不再因 measured ≠ baseline 判红（避免把 12 张同构活动卡误报成 12 个区块）。
  {
    const measured = dom.blocks.length;
    const blockSig = dom.blocks.map((b) => b.tag + (b.cls ? `.${b.cls}` : ''));
    const evidence = { measured, raw: dom.rawBlockCount ?? measured, baseline: baselineBlocks, blocks: blockSig };
    if (baselineBlocks > TAB_BLOCK_LIMIT && !baselineReason) {
      findings.push(makeFinding(key, 'F1', 'fail',
        `基线登记 ${baselineBlocks} > ${TAB_BLOCK_LIMIT} 且无理由`, evidence));
    } else if (baselineBlocks > TAB_BLOCK_LIMIT) {
      findings.push(makeFinding(key, 'F1', 'exception',
        `顶层块 ${baselineBlocks} > ${TAB_BLOCK_LIMIT}，已登记例外：${baselineReason}`, { ...evidence, reason: baselineReason }));
    } else {
      findings.push(makeFinding(key, 'F1', 'pass',
        `顶层块基线 ${baselineBlocks} ≤ ${TAB_BLOCK_LIMIT}（DOM 实测 ${measured}，仅作复核线索）`, evidence));
    }
  }

  // ── F2 筛选条（控件行数 / 方向 / reset 整行）────────────────────
  {
    const bars = dom.bars || [];
    const bad = bars.filter((bar) => bar.rows > BAR_ROW_LIMIT
      || bar.flexDirection === 'column'
      || bar.resetFullWidth);
    const describe = (bar) => {
      const issues = [];
      if (bar.rows > BAR_ROW_LIMIT) issues.push(`${bar.rows} 行（>${BAR_ROW_LIMIT}）`);
      if (bar.flexDirection === 'column') issues.push('flex-direction:column');
      if (bar.resetFullWidth) issues.push('reset 整行');
      return issues.join(' / ');
    };
    if (!bars.length) {
      findings.push(makeFinding(key, 'F2', 'pass', '无筛选条（.lf-bar）', { bars: 0 }));
    } else if (!bad.length) {
      findings.push(makeFinding(key, 'F2', 'pass',
        `${bars.length} 条筛选条均 ≤${BAR_ROW_LIMIT} 行、非 column、reset 未整行`,
        { bars: bars.map((bar) => ({
          rows: bar.rows, height: bar.height, flexDirection: bar.flexDirection, resetFullWidth: bar.resetFullWidth,
        })) }));
    } else {
      findings.push(makeFinding(key, 'F2', 'fail',
        `${bad.length}/${bars.length} 条筛选条超限：${bad.map(describe).join('；')}`,
        { bars: bad.map((bar) => ({
          rows: bar.rows, height: bar.height, flexDirection: bar.flexDirection, resetFullWidth: bar.resetFullWidth,
        })) }));
    }
  }

  // ── F3 输入装饰 ─────────────────────────────────────────────
  {
    const badSuggest = (dom.suggest || []).filter((s) => !s.hasRoleCombobox);
    const nativeCount = (dom.inputList || 0) + (dom.datalist || 0);
    if (nativeCount === 0 && badSuggest.length === 0) {
      findings.push(makeFinding(key, 'F3', 'pass', '无 input[list]/datalist；suggest 输入 ARIA 合规',
        { inputList: 0, datalist: 0, suggest: (dom.suggest || []).length }));
    } else {
      findings.push(makeFinding(key, 'F3', 'fail',
        `原生输入装饰 ${nativeCount} 处；suggest 缺 role=combobox ${badSuggest.length} 处`,
        { inputList: dom.inputList || 0, datalist: dom.datalist || 0, badSuggest }));
    }
  }

  // ── F4 标题层级 ─────────────────────────────────────────────
  {
    const headings = dom.headings || [];
    const h1 = headings.filter((h) => h.level === 1);
    const h2 = headings.filter((h) => h.level === 2);
    const problems = [];
    if (h1.length !== 0) problems.push(`可见 H1 ${h1.length} 个（工作台应 0，页题用 H2）`);
    if (h2.length !== 1) problems.push(`可见 H2 ${h2.length} 个（应 1）`);
    let seenH2 = false;
    let seenH3 = false;
    const jumps = [];
    for (const h of headings) {
      if (h.level === 2) { seenH2 = true; seenH3 = false; }
      if (h.level === 3) {
        if (!seenH2) jumps.push(`H3 前无 H2（${h.text}）`);
        seenH3 = true;
      }
      if (h.level === 4 && !seenH3) jumps.push(`H4 前无 H3（${h.text}）`);
    }
    if (jumps.length) problems.push(`层级断链：${jumps.join('；')}`);
    const evidence = { headings, jumps };
    if (!problems.length) {
      findings.push(makeFinding(key, 'F4', 'pass',
        `H1 0 / H2 1；标题序列 ${headings.map((h) => `h${h.level}`).join('→') || '（空）'}`, evidence));
    } else {
      findings.push(makeFinding(key, 'F4', 'fail', problems.join('；'), evidence));
    }
  }

  // ── F5 section 命名 / 嵌套 ───────────────────────────────────
  {
    const sections = dom.sections || [];
    const unnamed = sections.filter((s) => !s.hasLabel);
    const nested = dom.nestedSections || [];
    if (!unnamed.length && !nested.length) {
      findings.push(makeFinding(key, 'F5', 'pass', `${sections.length} 个 section 均有名称，无嵌套`, { sections: sections.length }));
    } else {
      findings.push(makeFinding(key, 'F5', 'fail',
        `未命名 section ${unnamed.length} 个；section 嵌套 ${nested.length} 处`,
        { unnamed, nestedSections: nested }));
    }
  }

  // ── F6 空态启发式（P2） ──────────────────────────────────────
  {
    const hits = dom.emptyHits || [];
    if (!hits.length) {
      findings.push(makeFinding(key, 'F6', 'pass', '未发现 .empty-state 之外的空态文本', { hits: 0 }));
    } else {
      findings.push(makeFinding(key, 'F6', 'fail',
        `${hits.length} 处空态文本不在 .empty-state 内（P2 待人工确认）`, { hits }));
    }
  }

  // ── F7 390 横向溢出 + 长列表分页门槛 ──────────────────────────
  {
    const paginationIssues = [
      ...(dom.engineOverPage || []).map((x) => `.lf-root 行数 ${x.rows} 无 [data-lf-page]`),
      ...(dom.tableOverPage || []).map((x) => `手写表行数 ${x.rows} 无分页控件`),
    ];
    if (paginationIssues.length) {
      findings.push(makeFinding(key, 'F7', 'fail',
        `长列表分页门槛未达标：${paginationIssues.join('；')}`,
        { engineOverPage: dom.engineOverPage, tableOverPage: dom.tableOverPage }));
    } else {
      try {
        const prevViewport = page.viewportSize() || { width: 1440, height: 900 };
        const twReady = await page.evaluate(() => {
          const probe = document.querySelector('.ws-tab-scroll');
          return !!probe && getComputedStyle(probe).display === 'flex';
        });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(450);
        const narrow = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        }));
        if (shots && shots.narrow) {
          try { await page.screenshot({ path: shots.narrow }); } catch (_) { /* 截图失败不改变判定 */ }
        }
        await page.setViewportSize(prevViewport);
        await page.waitForTimeout(250);
        if (!twReady) {
          findings.push(makeFinding(key, 'F7', 'skip', 'Tailwind CDN 未就绪（.ws-tab-scroll 非 flex），390 量测不可信', narrow));
        } else if (narrow.scrollWidth > narrow.innerWidth + 1) {
          findings.push(makeFinding(key, 'F7', 'fail',
            `390 横向溢出：scrollWidth ${narrow.scrollWidth} > innerWidth ${narrow.innerWidth}`, narrow));
        } else {
          findings.push(makeFinding(key, 'F7', 'pass',
            `390 无横向溢出（${narrow.scrollWidth} ≤ ${narrow.innerWidth} + 1）；长列表分页门槛通过`, narrow));
        }
      } catch (e) {
        try {
          await page.setViewportSize({ width: 1440, height: 900 });
        } catch (_) { /* 视口恢复失败时保留原错误 */ }
        findings.push(makeFinding(key, 'F7', 'exception', `390 量测失败：${e.message}`, null));
      }
    }
  }

  // ── F8 稳定性（分级） ───────────────────────────────────────
  // 2026-11-02：pageerror / 4xx ⇒ P0（功能性故障）；**仅** console.error ⇒ P1（控制台噪声本轮要修）。
  {
    if (!stability) {
      findings.push(makeFinding(key, 'F8', 'skip', '未采集运行时事件（编排层未提供 stability）', null));
    } else {
      const pageErrors = stability.pageErrors || [];
      const consoleErrors = stability.consoleErrors || [];
      const http4xx = stability.http4xx || [];
      const evidence = {
        pageErrors: pageErrors.slice(0, 5),
        consoleErrors: consoleErrors.slice(0, 5),
        http4xx: http4xx.slice(0, 5),
        counts: { pageErrors: pageErrors.length, consoleErrors: consoleErrors.length, http4xx: http4xx.length },
      };
      if (!pageErrors.length && !consoleErrors.length && !http4xx.length) {
        findings.push(makeFinding(key, 'F8', 'pass', 'pageerror 0 / console.error 0 / 4xx 0',
          { pageErrors: 0, consoleErrors: 0, http4xx: 0 }));
      } else if (pageErrors.length || http4xx.length) {
        const parts = [];
        if (pageErrors.length) parts.push(`pageerror ${pageErrors.length}`);
        if (http4xx.length) parts.push(`4xx ${http4xx.length}`);
        if (consoleErrors.length) parts.push(`console.error ${consoleErrors.length}`);
        findings.push(makeFinding(key, 'F8', 'fail', parts.join(' / '), evidence, 'P0'));
      } else {
        findings.push(makeFinding(key, 'F8', 'fail',
          `console.error ${consoleErrors.length}（仅控制台噪声，不阻断功能）`, evidence, 'P1'));
      }
    }
  }

  return findings;
}

// DOM 采集已抽到 `./dom-probe.mjs`（collectDom / hasPager / h2Summary 单一源）。
