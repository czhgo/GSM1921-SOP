// role: [工程师]+[AI]
// audit/report.mjs — 审计报告落盘（JSON 评分卡 + Markdown 分组报告）
//
// 契约（`.trae/documents/2026-11-02-tab-audit-asset.md` §3.1）：
//   findings.json = { generatedAt, base, dbMode, tabs:[{key,label,blocks,findings:[...]}],
//                     summary:{P0,P1,P2,exceptions} }
//   summary.md    = 顶部评分卡（每页签 F1–F8 的 pass/fail/exception）+ 按 P0/P1/P2 分组的问题与证据
//                   + 「例外清单（>4 块）」。
// ⚠ 报告只落 `.ctx/evidence/**`；不写 token、不写 cookie、不写登录口令。

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { TAB_BLOCK_BASELINE } from '../../test/style-baseline.mjs';

const SEVERITIES = ['P0', 'P1', 'P2'];
const FRONT_RULES = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8'];
const ECONOMY_RULES = ['M1', 'M2', 'M3'];

/** 汇总：P0/P1/P2 只计 `status==='fail'`；exception 单列。 */
export function summarize(findings) {
  const summary = { P0: 0, P1: 0, P2: 0, exceptions: 0 };
  for (const finding of findings) {
    if (finding.status === 'fail') {
      const severity = SEVERITIES.includes(finding.severity) ? finding.severity : 'P2';
      summary[severity] += 1;
    } else if (finding.status === 'exception') {
      summary.exceptions += 1;
    }
  }
  return summary;
}

/** evidence → 单行可读文本（不写 HTML） */
function evidenceText(evidence) {
  if (evidence == null) return '—';
  if (typeof evidence === 'string') return evidence.replace(/\s+/g, ' ').trim() || '—';
  try {
    return JSON.stringify(evidence).replace(/`/g, '\\`');
  } catch (_) {
    return String(evidence);
  }
}

/** 规则排序（F → D → C → E → M，数字升序） */
function ruleOrder(rule) {
  const match = /^([FDCME])(\d+)/.exec(String(rule || '').replace(/\s/g, ''));
  const prefixOrder = { F: 1, D: 2, C: 3, E: 4, M: 5 };
  return match ? (prefixOrder[match[1]] || 9) * 100 + Number(match[2]) : 999;
}

function sortFindings(findings) {
  return [...findings].sort((a, b) => (a.key || '').localeCompare(b.key || '')
    || ruleOrder(a.rule) - ruleOrder(b.rule)
    || (a.status || '').localeCompare(b.status || ''));
}

/** 规则 → 单元显示（评分卡） */
function cellFor(finding) {
  if (!finding) return '—';
  if (finding.status === 'pass') return 'pass';
  if (finding.status === 'exception') return 'exception';
  if (finding.status === 'skip') return 'skip';
  return `fail(${finding.severity || 'P2'})`;
}

/** 同一规则多条 Finding 时取「最严重」的一条进评分卡（fail > exception > skip > pass） */
function priorityOf(finding) {
  if (!finding) return 99;
  if (finding.status === 'fail') return SEVERITIES.indexOf(finding.severity) === -1 ? 3 : SEVERITIES.indexOf(finding.severity);
  if (finding.status === 'exception') return 4;
  if (finding.status === 'skip') return 5;
  return 6;
}

function renderScorecard(tabs, byKey) {
  const lines = ['## 评分卡', ''];
  lines.push(`| 页签 | blocks | ${FRONT_RULES.join(' | ')} |`);
  lines.push(`|${['---', '---', ...FRONT_RULES.map(() => '---')].join('|')}|`);
  for (const tab of tabs) {
    const map = byKey.get(tab.key) || new Map();
    const cells = FRONT_RULES.map((rule) => cellFor(map.get(rule)));
    lines.push(`| ${tab.label || ''} \`${tab.key}\` | ${tab.blocks ?? '—'} | ${cells.join(' | ')} |`);
  }
  lines.push('');
  lines.push('> `exception` = 已登记例外（不计违规）；`skip` = 无法可靠测量（不假绿）。');
  lines.push('');
  return lines;
}

/** 其他维度（D/C/E/M）评分卡；无结果时不出表 */
function renderOtherMatrix(tabs, byKey) {
  const rules = new Set();
  for (const tab of tabs) {
    for (const rule of (byKey.get(tab.key) || new Map()).keys()) {
      if (!FRONT_RULES.includes(rule)) rules.add(rule);
    }
  }
  if (!rules.size) return [];
  const ordered = [...rules].sort((a, b) => ruleOrder(a) - ruleOrder(b));
  const lines = ['## 其他维度', '', `| 页签 | ${ordered.join(' | ')} |`, `|${['---', ...ordered.map(() => '---')].join('|')}|`];
  for (const tab of tabs) {
    const map = byKey.get(tab.key) || new Map();
    lines.push(`| \`${tab.key}\` | ${ordered.map((rule) => cellFor(map.get(rule))).join(' | ')} |`);
  }
  lines.push('');
  return lines;
}

/** 信息经济（M1–M3）小节：每页签一条汇总 + M1 超限理由 */
function renderEconomySection(tabs, byKey) {
  const has = tabs.some((tab) => ECONOMY_RULES.some((rule) => (byKey.get(tab.key) || new Map()).has(rule)));
  if (!has) return [];
  const lines = [
    '## 信息经济',
    '',
    '| 页签 | M1 超限理由 | M2 重复卡头 | M3 多条筛选条 |',
    '|---|---|---|---|',
  ];
  for (const tab of tabs) {
    const map = byKey.get(tab.key) || new Map();
    lines.push(`| \`${tab.key}\` | ${ECONOMY_RULES.map((rule) => cellFor(map.get(rule))).join(' | ')} |`);
  }
  lines.push('');
  const details = [];
  for (const tab of tabs) {
    const map = byKey.get(tab.key) || new Map();
    for (const rule of ECONOMY_RULES) {
      const item = map.get(rule);
      if (!item) continue;
      details.push(`- \`${tab.key}\` · ${rule}：${item.status}${item.message ? ` —— ${item.message}` : ''}`);
    }
  }
  if (details.length) lines.push('明细：', '', ...details, '');
  return lines;
}

function renderSeveritySection(severity, findings) {
  const rows = findings.filter((finding) => finding.status === 'fail' && finding.severity === severity);
  const lines = [`## ${severity}（${rows.length}）`, ''];
  if (!rows.length) {
    lines.push('（无）', '');
    return lines;
  }
  for (const finding of rows) {
    lines.push(`### ${finding.key} · ${finding.rule}`);
    lines.push('');
    lines.push(`- key：\`${finding.key}\``);
    lines.push(`- rule：\`${finding.rule}\``);
    lines.push(`- message：${finding.message}`);
    lines.push(`- evidence：\`${evidenceText(finding.evidence)}\``);
    lines.push('');
  }
  return lines;
}

function renderStatusSection(status, title, findings) {
  const rows = findings.filter((finding) => finding.status === status);
  const lines = [`## ${title}（${rows.length}）`, ''];
  if (!rows.length) {
    lines.push('（无）', '');
    return lines;
  }
  lines.push('| key | rule | message |');
  lines.push('|---|---|---|');
  for (const finding of rows) {
    lines.push(`| \`${finding.key}\` | ${finding.rule} | ${String(finding.message).replace(/\|/g, '\\|')} |`);
  }
  lines.push('');
  return lines;
}

/** 例外清单（>4 块）：基线登记 + 本次实测（若已有 F1 evidence） */
function renderExceptionLedger(tabs, byKey) {
  const rows = tabs.filter((tab) => Number(tab.blocks) > 4);
  const lines = ['## 例外清单（>4 块）', ''];
  if (!rows.length) {
    lines.push('（无）', '');
    return lines;
  }
  lines.push('| 页签 | 基线块数 | 登记理由 | 本次实测 |');
  lines.push('|---|---|---|---|');
  for (const tab of rows) {
    const baseline = TAB_BLOCK_BASELINE[tab.key] || {};
    const f1 = (byKey.get(tab.key) || new Map()).get('F1');
    const measured = f1?.evidence?.measured ?? '—';
    lines.push(`| \`${tab.key}\` | ${baseline.blocks ?? tab.blocks} | ${String(baseline.reason || '').replace(/\|/g, '\\|')} | ${measured} |`);
  }
  lines.push('');
  return lines;
}

/** Markdown 报告全文 */
export function renderMarkdown(findings, run) {
  const summary = summarize(findings);
  const tabs = Array.isArray(run.tabs) ? run.tabs : [];
  const byKey = new Map();
  for (const finding of findings) {
    if (!byKey.has(finding.key)) byKey.set(finding.key, new Map());
    const rule = String(finding.rule).split('.')[0];
    const current = byKey.get(finding.key).get(rule);
    if (!current || priorityOf(finding) < priorityOf(current)) {
      byKey.get(finding.key).set(rule, finding);
    }
  }
  const lines = [
    '# 页签审计报告',
    '',
    `- 生成时间：${run.generatedAt}`,
    `- 耗时：${run.durationMs ?? 0} ms`,
    `- 服务：${run.base}`,
    `- 数据库形态：${run.dbMode}${run.dbMode === 'memory' ? '（:memory: 临时库）' : '（复用已起服务；写维度应降级）'}`,
    `- 页签数：${tabs.length}`,
    `- 汇总：P0 ${summary.P0} / P1 ${summary.P1} / P2 ${summary.P2} · exception ${summary.exceptions}`,
    '',
    '判据：P0/P1 本轮必改；P2 只进报告。已登记例外（exception）不计违规，但须复核理由是否仍成立。',
    '',
    ...renderScorecard(tabs, byKey),
    ...renderOtherMatrix(tabs, byKey),
    ...renderEconomySection(tabs, byKey),
    ...renderSeveritySection('P0', findings),
    ...renderSeveritySection('P1', findings),
    ...renderSeveritySection('P2', findings),
    ...renderStatusSection('exception', '例外登记（不计违规）', findings),
    ...renderStatusSection('skip', '跳过项（不假绿）', findings),
    ...renderExceptionLedger(tabs, byKey),
  ];
  return lines.join('\n');
}

/**
 * 落盘报告。
 * @param {Array<object>} findings
 * @param {{mdPath?:string, jsonPath?:string,
 *          run:{generatedAt?:string,durationMs?:number,base?:string,dbMode?:string,
 *               tabs?:Array<{key:string,label?:string,blocks?:number}|string>}}} opts
 * @returns {{mdPath:string|null, jsonPath:string|null}}
 */
export function writeReport(findings, { mdPath, jsonPath, run } = {}) {
  const ordered = sortFindings(Array.isArray(findings) ? findings : []);
  const rawTabs = Array.isArray(run?.tabs) ? run.tabs : [];
  const tabs = rawTabs.map((tab) => (typeof tab === 'string'
    ? { key: tab, label: '', blocks: null }
    : { key: tab.key, label: tab.label || '', blocks: tab.blocks ?? null }));
  // 兜底：findings 里出现但 run.tabs 未列的 key（如全局异常）也落盘
  for (const finding of ordered) {
    if (!tabs.some((tab) => tab.key === finding.key)) {
      tabs.push({ key: finding.key, label: '', blocks: null });
    }
  }

  const payload = {
    generatedAt: run?.generatedAt || new Date().toISOString(),
    base: run?.base || '',
    dbMode: run?.dbMode || '',
    tabs: tabs.map((tab) => ({
      key: tab.key,
      label: tab.label,
      blocks: tab.blocks,
      findings: ordered.filter((finding) => finding.key === tab.key),
    })),
    summary: summarize(ordered),
  };

  if (jsonPath) {
    mkdirSync(dirname(jsonPath), { recursive: true });
    writeFileSync(jsonPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  }
  if (mdPath) {
    mkdirSync(dirname(mdPath), { recursive: true });
    writeFileSync(mdPath, renderMarkdown(ordered, {
      generatedAt: payload.generatedAt,
      durationMs: run?.durationMs ?? 0,
      base: payload.base,
      dbMode: payload.dbMode,
      tabs,
    }), 'utf8');
  }
  return { mdPath: mdPath || null, jsonPath: jsonPath || null };
}
