#!/usr/bin/env node
// role: [工程师]+[AI]
// scripts/audit-tabs.mjs — 页签审计编排器（批次 526 · Wave 1-A）
//
// 口径见 `.trae/documents/2026-11-02-tab-audit-asset.md` §3.1：
//   一条命令跑一个 / 全部页签，输出 JSON 评分卡 + Markdown 报告 + 1440/390 截图。
//   默认自起 `:memory:` 实例（seedDatabase + 随机端口，不污染演示库）；`--base` 复用已起服务。
// 维度：
//   F 前端（checks-front.mjs）——本 agent 负责；
//   D 数据 / C CRUD / E 运算（+ M）——**动态 import** 并行 agent 的 checks-*.mjs；
//   文件不存在 / 加载失败时该维度逐页签记 skip 或 exception，不阻断 F。
// 用法：
//   cd server
//   node scripts/audit-tabs.mjs --tab secretary.group-progress --tab prop.archive --tab leader.members
//   node scripts/audit-tabs.mjs --all --json ../.ctx/evidence/2026-11-02/tab-audit/findings.json --md ../.ctx/evidence/2026-11-02/tab-audit/summary.md
//   node scripts/audit-tabs.mjs --base http://localhost:3000 --tab org.taskforce --headed
// ⚠ 本脚本不进 daily；默认写临时库，`--base` 形态不在共享库做破坏性 CRUD（由 C2 依 dbMode 自行降级）。

import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { TAB_CATALOG, CATALOG_BY_KEY, assertCatalogIntegrity } from './audit/catalog.mjs';
import { runFrontChecks } from './audit/checks-front.mjs';
import { writeReport, summarize } from './audit/report.mjs';
import {
  ACCOUNTS, startAuditServer, apiLogin, login, openTab, shot,
} from './audit/harness.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_DIR = resolve(__dirname, '..');
const REPO_DIR = resolve(SERVER_DIR, '..');

const ALL_DIMS = ['F', 'D', 'C', 'E', 'M'];

/** 今日（Asia/Shanghai）→ YYYY-MM-DD，供默认报告目录 */
function todayStamp() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date());
}

function usage() {
  return [
    '用法：node scripts/audit-tabs.mjs [选项]',
    '',
    '  --tab <role.tab>   审计指定页签（可重复；与 --all 互斥）',
    '  --all              审计 catalog 全部 45 个页签',
    '  --json <path>      JSON 评分卡输出路径',
    '  --md <path>        Markdown 报告输出路径',
    '  --headed           Playwright 显示浏览器窗口',
    '  --timeout <ms>     单页签等待上限（默认 30000）',
    '  --only <dims>      只跑指定维度，逗号分隔（F,D,C,E,M）',
    '  --base <url>       复用已起服务（不启 :memory:；写维度自行降级）',
    '  --help             显示本帮助',
    '',
    '默认：createApp({dbPath:":memory:"}) + seedDatabase + 随机端口 + Playwright Chromium。',
    '退出码：0 = 审计完成（P0/P1 看报告）；2 = 参数 / 运行错误。',
  ].join('\n');
}

/** 解析 CLI（未知参数直接抛错，不静默忽略） */
function parseArgs(argv) {
  const args = { tabs: [], all: false, headed: false, timeout: 30000, only: '', base: '', json: '', md: '', help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (value === undefined || String(value).startsWith('--')) throw new Error(`${arg} 缺少取值`);
      i += 1;
      return value;
    };
    switch (arg) {
      case '--tab': args.tabs.push(next()); break;
      case '--all': args.all = true; break;
      case '--json': args.json = next(); break;
      case '--md': args.md = next(); break;
      case '--headed': args.headed = true; break;
      case '--timeout': args.timeout = Number(next()); break;
      case '--only': args.only = next(); break;
      case '--base': args.base = next().replace(/\/+$/, ''); break;
      case '--help': case '-h': args.help = true; break;
      default: throw new Error(`未知参数：${arg}`);
    }
  }
  if (!Number.isFinite(args.timeout) || args.timeout <= 0) throw new Error('--timeout 必须是正数（ms）');
  if (args.all && args.tabs.length) throw new Error('--all 与 --tab 互斥');
  if (!args.all && !args.tabs.length && !args.help) throw new Error('必须给 --tab <key> 或 --all');
  return args;
}

/** 解析 --only（缺省五维全开） */
function parseDims(raw) {
  if (!raw) return new Set(ALL_DIMS);
  const dims = new Set(String(raw).split(',').map((s) => s.trim().toUpperCase()).filter(Boolean));
  for (const dim of dims) {
    if (!ALL_DIMS.includes(dim)) throw new Error(`--only 含未知维度「${dim}」（只能是 F,D,C,E,M）`);
  }
  return dims;
}

/** 预登录全部角色（失败不阻断；缺 token 由下游检查自行降级） */
async function collectTokens(base, timeout) {
  const tokens = {};
  const users = {};
  for (const role of Object.keys(ACCOUNTS)) {
    try {
      const session = await apiLogin(base, role, timeout);
      tokens[role] = session.token;
      users[role] = session.user;
    } catch (e) {
      console.log(`[audit-tabs] ${role} API 登录失败（D/C/E 可能降级）：${e.message}`);
    }
  }
  return { tokens, users };
}

/** 动态加载并行维度驱动（不存在 / 加载失败都不抛错） */
async function loadDriver(file, exportName) {
  const path = join(__dirname, 'audit', file);
  if (!existsSync(path)) return { skipReason: `${file} 不存在（由并行 agent 提供）` };
  try {
    const mod = await import(pathToFileURL(path).href);
    const fn = mod[exportName] || mod.default;
    if (typeof fn !== 'function') return { skipReason: `${file} 未导出 ${exportName}` };
    return { fn };
  } catch (e) {
    return { error: e };
  }
}

/** 构造 D/C/E/M 驱动清单（E 与 M 共用 checks-economy.mjs） */
async function buildDrivers(dims) {
  const drivers = [];
  if (dims.has('D')) {
    drivers.push({ dims: ['D'], file: 'checks-data.mjs', exportName: 'runDataChecks', ...(await loadDriver('checks-data.mjs', 'runDataChecks')) });
  }
  if (dims.has('C')) {
    drivers.push({ dims: ['C'], file: 'checks-crud.mjs', exportName: 'runCrudChecks', ...(await loadDriver('checks-crud.mjs', 'runCrudChecks')) });
  }
  if (dims.has('E') || dims.has('M')) {
    drivers.push({
      dims: ['E', 'M'].filter((dim) => dims.has(dim)),
      file: 'checks-economy.mjs',
      exportName: 'runEconomyChecks',
      ...(await loadDriver('checks-economy.mjs', 'runEconomyChecks')),
    });
  }
  return drivers;
}

function freshStability() {
  return { pageErrors: [], consoleErrors: [], http4xx: [] };
}

/** 资源加载失败属网络噪音（不是 console.error 语义），不计入 F8；真实 JS error 仍计 */
function isResourceNoise(text) {
  return /Failed to load resource|net::ERR_|favicon\.ico/i.test(String(text || ''));
}

/** skip 型 Finding（维度驱动缺失 / 未启用） */
function skipFinding(key, rule, message) {
  return { key, rule, severity: 'P2', status: 'skip', message, evidence: null };
}

/** 某页签的 F1–F8 全量 skip（页面没打开时使用） */
function skipFrontFindings(key, message) {
  return ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8'].map((rule) => skipFinding(key, rule, message));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return 0;
  }
  const dims = parseDims(args.only);
  assertCatalogIntegrity();

  // 选中页签
  const keys = args.all ? TAB_CATALOG.map((tab) => tab.key) : args.tabs;
  for (const key of keys) {
    if (!CATALOG_BY_KEY.has(key)) throw new Error(`未知页签「${key}」；用 --all 或检查 catalog.mjs`);
  }
  const targets = keys.map((key) => CATALOG_BY_KEY.get(key));

  // 输出路径
  const defaultDir = join(REPO_DIR, '.ctx', 'evidence', todayStamp(), 'tab-audit');
  const jsonPath = args.json ? resolve(process.cwd(), args.json) : join(defaultDir, 'findings.json');
  const mdPath = args.md ? resolve(process.cwd(), args.md) : join(defaultDir, 'summary.md');
  const shotsDir = join(dirname(mdPath || jsonPath), 'shots');
  mkdirSync(shotsDir, { recursive: true });

  const drivers = await buildDrivers(dims);
  const generatedAt = new Date().toISOString();
  const startedAtMs = Date.now();
  const findings = [];
  let local = null;
  let base = args.base;
  let dbMode = args.base ? 'shared' : 'memory';
  let tokens = {};
  let users = {};
  let browser = null;

  try {
    if (!base) {
      local = await startAuditServer();
      base = local.base;
    }
    console.log(`[audit-tabs] base=${base} dbMode=${dbMode} tabs=${targets.length} dims=${[...dims].join('')}`);
    for (const driver of drivers) {
      if (driver.skipReason) console.log(`[audit-tabs] ${driver.file} 不可用 ⇒ ${driver.dims.join('/')} 维度逐页签记 skip：${driver.skipReason}`);
      else if (driver.error) console.log(`[audit-tabs] ${driver.file} 加载失败 ⇒ ${driver.dims.join('/')} 维度逐页签记 exception：${driver.error.message}`);
    }

    ({ tokens, users } = await collectTokens(base, args.timeout));

    const { chromium } = await import('playwright');
    browser = await chromium.launch({ headless: !args.headed });

    // 按角色分组，逐角色登录一次、逐页签深链打开
    const byRole = new Map();
    for (const item of targets) {
      if (!byRole.has(item.role)) byRole.set(item.role, []);
      byRole.get(item.role).push(item);
    }

    for (const [role, items] of byRole) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      let stability = freshStability();
      page.on('pageerror', (e) => stability.pageErrors.push(String(e && e.message ? e.message : e)));
      page.on('console', (msg) => {
        if (msg.type() !== 'error') return;
        const text = msg.text();
        if (!isResourceNoise(text)) stability.consoleErrors.push(text);
      });
      page.on('response', (res) => {
        const url = res.url();
        const status = res.status();
        if (url.includes('/api/v1/') && status >= 400 && status < 500) stability.http4xx.push({ status, url });
      });

      let loggedIn = true;
      try {
        await login(page, base, role, args.timeout);
      } catch (e) {
        loggedIn = false;
        console.error(`[audit-tabs] ${role} 登录失败：${e.message.split('\n')[0]}`);
      }

      for (const item of items) {
        const { key, tab, label, source, blocks } = item;
        const wideShot = join(shotsDir, `${key}.1440.png`);
        const narrowShot = join(shotsDir, `${key}.390.png`);
        stability = freshStability();

        if (!loggedIn) {
          findings.push({
            key, rule: 'F0', severity: 'P0', status: 'fail',
            message: `${ACCOUNTS[role]?.label || role} 登录失败，页签无法审计`,
            evidence: { role, tab, base },
          });
          findings.push(...skipFrontFindings(key, '登录失败，未打开页签'));
          for (const driver of drivers) for (const dim of driver.dims) findings.push(skipFinding(key, `${dim}0`, '登录失败，未执行该维度'));
          continue;
        }

        let opened = false;
        let url = `${base}/workspace/${role}.html?tab=${encodeURIComponent(tab)}`;
        try {
          url = await openTab(page, base, role, tab, args.timeout);
          await page.setViewportSize({ width: 1440, height: 900 });
          await page.waitForTimeout(300);
          await shot(page, wideShot);
          opened = true;
        } catch (e) {
          findings.push({
            key, rule: 'F0', severity: 'P0', status: 'fail',
            message: `页签打不开或未激活：${String(e.message || e).split('\n')[0]}`,
            evidence: { url, tab, label },
          });
          findings.push(...skipFrontFindings(key, '页签未打开，F 维度跳过'));
          for (const driver of drivers) for (const dim of driver.dims) findings.push(skipFinding(key, `${dim}0`, '页签未打开，未执行该维度'));
          continue;
        }

        const ctx = {
          key, role, tab, label, source, blocks,
          page, base, dbMode, tokens, users,
          timeout: args.timeout,
          shots: { wide: wideShot, narrow: narrowShot },
          stability,
        };

        if (dims.has('F')) {
          try {
            const frontFindings = await runFrontChecks(ctx);
            findings.push(...frontFindings);
            // 供 D3（首屏 4xx 口径）复用 F8 证据，避免重复导航。
            // D3 只关心 `/api/v1/` 4xx ⇒ 按 F8 evidence 的 4xx 计数重塑状态，
            // 避免「仅 console.error 的 P1」被误读成首屏 4xx（2026-11-02 F8 分级后）。
            const f8 = frontFindings.find((finding) => String(finding.rule).toUpperCase() === 'F8') || null;
            const http4xxCount = f8?.evidence?.counts?.http4xx ?? 0;
            ctx.frontFindings = frontFindings;
            ctx.f8 = f8
              ? {
                ...f8,
                status: http4xxCount > 0 ? 'fail' : 'pass',
                severity: http4xxCount > 0 ? 'P0' : null,
              }
              : null;
          } catch (e) {
            findings.push({ key, rule: 'F0', severity: 'P0', status: 'exception', message: `F 维度异常：${e.message}`, evidence: null });
          }
        }

        for (const driver of drivers) {
          if (driver.skipReason) {
            for (const dim of driver.dims) findings.push(skipFinding(key, `${dim}0`, `${driver.skipReason}，${dim} 维度跳过`));
            continue;
          }
          if (driver.error) {
            for (const dim of driver.dims) {
              findings.push({ key, rule: `${dim}0`, severity: 'P2', status: 'exception', message: `${driver.file} 加载失败：${driver.error.message}`, evidence: null });
            }
            continue;
          }
          try {
            const out = await driver.fn(ctx);
            const list = Array.isArray(out) ? out : [];
            for (const finding of list) {
              if (!finding || !finding.rule) continue;
              // 维度取规则首字母（D1 / E2 / M3…）
              const head = /^[FDCME]/i.exec(String(finding.rule))?.[0]?.toUpperCase() || '';
              if (!driver.dims.includes(head)) continue;
              findings.push({ key, ...finding });
            }
          } catch (e) {
            for (const dim of driver.dims) {
              findings.push({ key, rule: `${dim}0`, severity: 'P2', status: 'exception', message: `${driver.file} 执行异常：${e.message}`, evidence: null });
            }
          }
        }

        // 每个页签必须有两张截图（1440 已拍；390 由 F7 拍摄，F7 失败 / 未跑 F 时在此兜底）
        if (!existsSync(narrowShot)) {
          try {
            const prevViewport = page.viewportSize() || { width: 1440, height: 900 };
            await page.setViewportSize({ width: 390, height: 844 });
            await page.waitForTimeout(300);
            await shot(page, narrowShot);
            await page.setViewportSize(prevViewport);
          } catch (_) { /* 截图失败不阻断审计 */ }
        }

        const tabFindings = findings.filter((finding) => finding.key === key && finding.status === 'fail');
        const p0 = tabFindings.filter((finding) => finding.severity === 'P0').length;
        const p1 = tabFindings.filter((finding) => finding.severity === 'P1').length;
        const p2 = tabFindings.filter((finding) => finding.severity === 'P2').length;
        console.log(`[audit-tabs] ${key} → P0 ${p0} / P1 ${p1} / P2 ${p2}`);
        for (const finding of tabFindings) console.log(`  · ${finding.severity} ${finding.rule} ${finding.message}`);
      }

      await context.close();
    }
  } catch (e) {
    // 失败也要落盘：为尚未产出结果的页签补一条 F0 异常
    const message = String(e?.message || e).split('\n')[0];
    for (const item of targets) {
      if (!findings.some((finding) => finding.key === item.key)) {
        findings.push({ key: item.key, rule: 'F0', severity: 'P0', status: 'exception', message: `审计中断：${message}`, evidence: null });
      }
    }
    console.error(`[audit-tabs] 运行异常：${message}`);
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (local) await local.close().catch(() => {});

    const run = {
      generatedAt,
      durationMs: Date.now() - startedAtMs,
      base,
      dbMode,
      tabs: targets.map((item) => ({ key: item.key, label: item.label, blocks: item.blocks })),
    };
    const written = writeReport(findings, { mdPath, jsonPath, run });
    const summary = summarize(findings);
    console.log(`[audit-tabs] summary P0 ${summary.P0} / P1 ${summary.P1} / P2 ${summary.P2} · exception ${summary.exceptions}`);
    console.log(`[audit-tabs] json → ${written.jsonPath}`);
    console.log(`[audit-tabs] md   → ${written.mdPath}`);
    console.log(`[audit-tabs] shots → ${shotsDir}`);
  }
  return 0;
}

main().then((code) => {
  process.exitCode = code;
}).catch((e) => {
  console.error(`[audit-tabs] ${e.message}`);
  process.exitCode = 2;
});
