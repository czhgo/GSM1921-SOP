// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/scripts/audit/checks-economy.mjs —— E 运算维度（E1–E2）＋ M 信息经济（M1–M3）
//
//  E1 每个 read 口跑 5 次，记录 p50/p95/bytes；与 perf-baseline 比：
//     当前 p95 > 预算 × 1.2 或 bytes > 预算 × 1.2 ⇒ P2；
//     预算缺失 ⇒ 按「实测 p95 × 1.2，最低 50ms」生成内存预算（首轮，不写回源码）。
//  E2 报告附「最慢 5 接口 / 最大 5 响应体」摘要（findings.meta + E2 evidence）。
//  M1 顶层块 > 4 的页签：`TAB_BLOCK_BASELINE` 有非空 reason ⇒ exception；无理由 ⇒ P1。
//  M2 同页可见 H3 文本重复 ≥2 ⇒ P1（重复卡头）。
//  M3 同页 `.lf-bar` 数 >1 ⇒ P1（先合并再谈行数）。
//
//  返回 Finding[]：{ key, rule, severity, status, message, evidence }
// ════════════════════════════════════════════════════════════════

import { ENDPOINT_MAP } from './endpoint-map.mjs';
import { MULTI_BAR_EXCEPTIONS } from './economy-exceptions.mjs';
import { ensureSession, httpRequest, measurementsForTab, measureStats } from './checks-data.mjs';
import { TAB_BLOCK_BASELINE, TAB_BLOCK_LIMIT } from '../../test/style-baseline.mjs';
import {
  budgetFor, budgetSource, generatedBudget, isOverBudget, perfSummary, MIN_P95_BUDGET_MS,
} from './perf-baseline.mjs';

function finding(ctx, rule, severity, status, message, evidence = {}) {
  return { key: ctx.key, rule, severity, status, message, evidence };
}

function isPublicRead(path) {
  return path.startsWith('/api/v1/public/') || path === '/api/v1/health';
}

function parseRead(readItem) {
  const match = /^(GET|POST|PATCH|DELETE)\s+(\S+)$/.exec(String(readItem || '').trim());
  if (!match) return null;
  return { method: match[1], path: match[2] };
}

/** 确保有 5 次测量（复用 checks-data 的缓存；不足则补跑） */
async function ensureFiveRuns(ctx, item, session) {
  const existing = measurementsForTab(ctx.key).find((row) => row.endpoint === item);
  if (existing && existing.runs >= 5) return existing;
  const parsed = parseRead(item);
  if (!parsed) return null;
  const rows = [];
  const token = isPublicRead(parsed.path) ? null : session?.token;
  for (let i = 0; i < 5; i += 1) {
    const res = await httpRequest(ctx.base, parsed.path, {
      method: parsed.method, token, timeout: ctx.timeout,
    });
    rows.push({ ms: res.ms, bytes: res.bytes, status: res.status });
  }
  return { endpoint: item, ...measureStats(rows) };
}

/** M2/M3 的页面 DOM 采集（只读；页面须仍停在目标页签） */
async function collectEconomyDom(ctx) {
  if (!ctx.page) return { skip: '无页面句柄，未做信息经济 DOM 量测' };
  const contentId = `${ctx.role}-tab-content`;
  try {
    return await ctx.page.evaluate(({ cid }) => {
      const content = document.getElementById(cid);
      if (!content) return { hasContent: false };
      const visible = (el) => {
        const cs = getComputedStyle(el);
        return cs.display !== 'none' && cs.visibility !== 'hidden' && el.offsetParent !== null;
      };
      const norm = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim();
      const h3 = [...content.querySelectorAll('h3')].filter(visible).map(norm).filter(Boolean);
      const counts = new Map();
      for (const text of h3) counts.set(text, (counts.get(text) || 0) + 1);
      const duplicates = [...counts.entries()]
        .filter(([, n]) => n >= 2)
        .map(([text, count]) => ({ text: text.slice(0, 40), count }));
      const bars = [...content.querySelectorAll('.lf-bar')].filter(visible).length;
      return { hasContent: true, h3Count: h3.length, duplicates, bars };
    }, { cid: contentId });
  } catch (error) {
    return { error: String(error?.message || error) };
  }
}

/** M1：本页顶层块是否超限、是否登记了理由（每页一条汇总） */
function runEconomyM1(ctx, findings) {
  const baseline = TAB_BLOCK_BASELINE[ctx.key] || {};
  const blocks = Number(baseline.blocks) || 0;
  const reason = String(baseline.reason || '').trim();
  const oversize = Object.entries(TAB_BLOCK_BASELINE)
    .filter(([, value]) => Number(value?.blocks) > TAB_BLOCK_LIMIT)
    .map(([key, value]) => ({
      key, blocks: Number(value.blocks), reason: String(value.reason || '').trim(),
    }));
  const evidence = { key: ctx.key, blocks, limit: TAB_BLOCK_LIMIT, reason, oversize };
  if (blocks > TAB_BLOCK_LIMIT && !reason) {
    findings.push(finding(
      ctx, 'M1', 'P1', 'fail',
      `顶层块 ${blocks} > ${TAB_BLOCK_LIMIT} 且未登记理由（信息经济超限）`, evidence,
    ));
  } else if (blocks > TAB_BLOCK_LIMIT) {
    findings.push(finding(
      ctx, 'M1', null, 'exception',
      `顶层块 ${blocks} > ${TAB_BLOCK_LIMIT}，已登记例外：${reason}`, evidence,
    ));
  } else {
    findings.push(finding(
      ctx, 'M1', null, 'pass',
      `顶层块 ${blocks} ≤ ${TAB_BLOCK_LIMIT}（无超限例外）`, evidence,
    ));
  }
}

/** M2 / M3：同页重复卡头 / 多条筛选条 */
async function runEconomyM23(ctx, findings) {
  const dom = await collectEconomyDom(ctx);
  if (dom.skip) {
    findings.push(finding(ctx, 'M2', null, 'skip', dom.skip, {}));
    findings.push(finding(ctx, 'M3', null, 'skip', dom.skip, {}));
    return;
  }
  if (dom.error || !dom.hasContent) {
    const message = dom.error ? `信息经济 DOM 读取失败：${dom.error}` : '内容容器不存在（页签未渲染）';
    findings.push(finding(ctx, 'M2', null, 'exception', message, dom));
    findings.push(finding(ctx, 'M3', null, 'exception', message, dom));
    return;
  }
  if (dom.duplicates.length) {
    findings.push(finding(
      ctx, 'M2', 'P1', 'fail',
      `同页可见 H3 重复 ${dom.duplicates.length} 组：${dom.duplicates.map((d) => `「${d.text}」×${d.count}`).join('；')}`,
      { h3Count: dom.h3Count, duplicates: dom.duplicates },
    ));
  } else {
    findings.push(finding(
      ctx, 'M2', null, 'pass',
      `可见 H3 ${dom.h3Count} 个，无重复卡头`, { h3Count: dom.h3Count, duplicates: [] },
    ));
  }
  if (dom.bars > 1) {
    const reason = String(MULTI_BAR_EXCEPTIONS[ctx.key] || '').trim();
    findings.push(finding(
      ctx, 'M3', reason ? null : 'P1', reason ? 'exception' : 'fail',
      reason
        ? `同页 .lf-bar ${dom.bars} 条，已登记例外：${reason}`
        : `同页 .lf-bar ${dom.bars} 条（>1，先合并再谈行数）`,
      { bars: dom.bars, reason },
    ));
  } else {
    findings.push(finding(
      ctx, 'M3', null, 'pass', `.lf-bar ${dom.bars} 条（≤1）`, { bars: dom.bars },
    ));
  }
}

export async function runEconomyChecks(ctx) {
  const entry = ENDPOINT_MAP[ctx.key];
  const findings = [];
  const measured = [];
  if (!entry) {
    findings.push(finding(ctx, 'E0', 'P0', 'fail', `ENDPOINT_MAP 缺少页签 ${ctx.key}`, {}));
  }

  let session = null;
  try {
    session = await ensureSession(ctx, ctx.role);
  } catch (error) {
    findings.push(finding(ctx, 'E1', 'P0', 'fail', '无法取得登录会话，E1 无法测量', { error: String(error.message || error) }));
  }

  if (session && entry) {
    for (const item of entry.read || []) {
      const stats = await ensureFiveRuns(ctx, item, session);
      if (!stats) {
        findings.push(finding(ctx, 'E1', 'P1', 'skip', `读口格式不合法或未测量：${item}`, {}));
        continue;
      }
      measured.push(stats);
      const baseline = budgetFor(item, ctx.key);
      const source = budgetSource(item, ctx.key);
      const budget = baseline || generatedBudget({ p95: stats.p95, bytes: stats.bytes });
      if (!baseline) {
        findings.push(finding(
          ctx, 'E1', null, 'pass',
          `首轮预算已生成（${item}）：p95 ${budget.p95}ms / ${budget.bytes}B`,
          {
            endpoint: item, stats, budget, budgetSource: 'generated',
            note: `首轮生成规则：p95 = max(${MIN_P95_BUDGET_MS}ms, 实测 × 1.2)；后续只收紧`,
          },
        ));
        continue;
      }
      // 2026-11-02 批次 526 校准：本地接口常见个位数 ms，纯「超基线 20%」会噪声；
      //   加绝对地板（p95 50ms / 500KB）后才报 P2。
      const overP95 = stats.p95 > Math.max(budget.p95 * 1.2, 50);
      const overBytes = stats.bytes > Math.max(budget.bytes * 1.2, 500 * 1024);
      if (overP95 || overBytes) {
        findings.push(finding(
          ctx, 'E1', 'P2', 'fail',
          `读口超预算 20%：${item}（p95 ${stats.p95}ms vs 预算 ${budget.p95}ms）`,
          { endpoint: item, stats, budget, budgetSource: source },
        ));
      } else {
        findings.push(finding(
          ctx, 'E1', null, 'pass',
          `读口在预算内：${item}（p95 ${stats.p95}ms / 预算 ${budget.p95}ms）`,
          { endpoint: item, stats, budget, budgetSource: source },
        ));
      }
    }
  }

  // E2：最慢 5 / 最大 5
  if (session && entry) {
    const summary = perfSummary(measured, 5);
    findings.push(finding(
      ctx,
      'E2',
      null,
      'pass',
      `接口性能摘要：最慢 ${summary.slowest.length} 条 / 最大 ${summary.largest.length} 条`,
      { ...summary, measured: measured.length },
    ));
    findings.meta = summary;
  } else {
    findings.push(finding(
      ctx, 'E2', null, 'skip',
      entry ? '无登录会话，性能摘要未生成' : 'ENDPOINT_MAP 缺页签，E2 未执行', {},
    ));
  }

  // M 信息经济（不依赖登录会话，只读当前页签 DOM）
  runEconomyM1(ctx, findings);
  await runEconomyM23(ctx, findings);
  return findings;
}
