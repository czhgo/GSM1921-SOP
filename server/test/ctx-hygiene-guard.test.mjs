// role: [工程师]+[AI]
// ctx-hygiene-guard.test.mjs — `.ctx` 准入边界与审计产物归档守卫（2026-10-20 批次 491）
//
// 病灶：`.ctx` 顶层长期混放审计原文（`AUDIT_*`）、脚本产物（`IA_*`）、历史草稿（`*_DRAFT.md`）
//   与真正的台账/日志 ⇒ 新会话分不清「现行台账」与「一次性审计原文」，目录变成筐。
// 判据（四条，均可机械核验）：
//   ① 顶层只允许白名单 10 项（logs / evidence / TIMESTAMPS / SNAPSHOT / REVIEW_QUEUE / ACTIVE_RULINGS /
//      ENGINEERING_ASSESSMENT / ACTIVE_CONTEXT / README / AGENTS）；2026-11-03 批次 529 增 `ACTIVE_CONTEXT`
//      （active 投影；≤300 行 / 30KB）。
//   ② 顶层不得出现 `AUDIT_*` / `IA_*` / `*_DRAFT.md` / `snapshots/`；
//   ③ 归档文件必须在正式文档或 2026-10 执行日志中有指针（防「移了等于丢了」）；
//   ④ 脚本生成的产物必须有对应脚本（`IA_INVENTORY` ↔ `ia-inventory.mjs`）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const CTX = join(ROOT, '.ctx');
const ARCHIVE = join(CTX, 'logs', 'archive', '2026-10');

const ALLOWED = new Set([
  'logs',
  'evidence',
  'TIMESTAMPS.md',
  'SNAPSHOT.md',
  'REVIEW_QUEUE.md',
  'ACTIVE_RULINGS.md',
  'ENGINEERING_ASSESSMENT.md',
  'ACTIVE_CONTEXT.md',
  'README.md',
  'AGENTS.md',
]);

const ARCHIVED_AUDITS = [
  'AUDIT_IA_CRITICAL.md',
  'IA_LINK_TRUTH.md',
  'IA_INVENTORY.md',
  'AUDIT_ROUND1_WORKBENCH_STRUCTURE.md',
  'AUDIT_ROUND2_MINIMUM_THREE_COSTS.md',
  'AUDIT_ROUND3_4_COMBINED.md',
  'WORKBENCH_67_TAB_AUDIT_DRAFT.md',
];

/** 指针检索面：正式文档 + 本批执行日志（历史日志正文不改写，只认 2026-10 当月） */
const POINTER_FILES = [
  'CLAUDE.md',
  'README.md',
  'README-server.md',
  'README-members.md',
  'CONTRIBUTING.md',
  'content/03_doc_system/OPERATIONS_GUIDE.md',
  'content/03_doc_system/DOC_MAP.md',
  'content/03_doc_system/ARCHITECTURE.md',
  'content/04_web_design/module/MODULE_UI_DESIGN.md',
  'content/05_ai_coding/PARALLEL_SKILL_AUDIT.md',
  'content/05_ai_coding/TEST_AND_VERIFICATION.md',
  'content/insights/工程与AI协作的全栈实践.md',
  '.ctx/logs/2026-10-EXECUTION_LOG.md',
];

test('① `.ctx` 顶层只允许白名单项（10 项）', () => {
  const entries = readdirSync(CTX);
  const extra = entries.filter((name) => !ALLOWED.has(name));
  assert.deepEqual(extra, [], `.ctx 顶层出现白名单外条目：${extra.join(' / ')}——先沉淀到正式文档，再归档到 logs/archive/YYYY-MM/`);
  for (const name of ALLOWED) {
    assert.ok(existsSync(join(CTX, name)), `.ctx 顶层缺白名单项 ${name}（白名单与实况脱节）`);
  }
});

test('② 顶层不得回潮审计原文 / 脚本产物 / 历史草稿', () => {
  const entries = readdirSync(CTX);
  const offenders = entries.filter((name) => /^(AUDIT_|IA_)/.test(name) || /_DRAFT\.md$/.test(name) || name === 'snapshots');
  assert.deepEqual(offenders, [], `.ctx 顶层回潮：${offenders.join(' / ')}（应移入 .ctx/logs/archive/2026-10/）`);
});

test('③ 归档审计原文必须有正式文档或当月执行日志指针', () => {
  const corpus = POINTER_FILES
    .filter((rel) => existsSync(join(ROOT, rel)))
    .map((rel) => readFileSync(join(ROOT, rel), 'utf8'))
    .join('\n');
  const missing = [];
  for (const name of ARCHIVED_AUDITS) {
    assert.ok(existsSync(join(ARCHIVE, name)), `归档缺文件 ${name}`);
    if (!corpus.includes(name)) missing.push(name);
  }
  assert.deepEqual(missing, [], `以下归档原文在正式文档与当月执行日志中都没有指针（移了等于丢了）：${missing.join(' / ')}`);
});

test('④ 生成类产物必须有对应脚本', () => {
  assert.ok(existsSync(join(ROOT, 'server', 'scripts', 'ia-inventory.mjs')), '缺 IA_INVENTORY 的生成脚本 ia-inventory.mjs');
  const script = readFileSync(join(ROOT, 'server', 'scripts', 'ia-inventory.mjs'), 'utf8');
  assert.match(script, /\.ctx\/logs\/archive\/2026-10\/IA_INVENTORY\.md/, 'ia-inventory.mjs 输出路径须指向归档目录');
  assert.ok(statSync(join(ARCHIVE, 'IA_INVENTORY.md')).isFile(), 'IA_INVENTORY 归档产物不存在');
});

test('⑤ ACTIVE_CONTEXT：≤300 行 / ≤30KB，frontmatter 齐全且保鲜', () => {
  const p = join(CTX, 'ACTIVE_CONTEXT.md');
  assert.ok(existsSync(p), '缺 `.ctx/ACTIVE_CONTEXT.md`（active 投影）');
  const src = readFileSync(p, 'utf8');
  const lines = src.split(/\r?\n/).length;
  const bytes = Buffer.byteLength(src, 'utf8');
  assert.ok(lines <= 300, `ACTIVE_CONTEXT 行数 ${lines} > 300：先把细节降级到 reference`);
  assert.ok(bytes <= 30 * 1024, `ACTIVE_CONTEXT 字节 ${bytes} > 30KB：先把细节降级到 reference`);
  assert.match(src, /^layer:\s*active/m, 'ACTIVE_CONTEXT frontmatter 缺 `layer: active`');
  assert.match(src, /^last_verified:\s*"?\d{4}-\d{2}-\d{2}"?/m, 'ACTIVE_CONTEXT frontmatter 缺 `last_verified`');
  assert.match(src, /^budget:\s*".*?"/m, 'ACTIVE_CONTEXT frontmatter 缺 `budget`');
  const latest = src.match(/^latest_decision:\s*"?D-(\d+)"?/m);
  assert.ok(latest, 'ACTIVE_CONTEXT frontmatter 缺 `latest_decision: D-xxx`');

  const logDir = join(CTX, 'logs');
  const monthLogs = readdirSync(logDir)
    .filter((f) => /^\d{4}-\d{2}-DECISION_LOG\.md$/.test(f))
    .sort();
  assert.ok(monthLogs.length > 0, '找不到任何 `YYYY-MM-DECISION_LOG.md`');
  const activeLog = readFileSync(join(logDir, monthLogs[monthLogs.length - 1]), 'utf8');
  const dNums = [...activeLog.matchAll(/^## D-(\d+)/gm)].map((x) => Number(x[1]));
  assert.ok(dNums.length > 0, `${monthLogs[monthLogs.length - 1]} 解析不到 D-xxx 条目`);
  const maxD = Math.max(...dNums);
  assert.ok(Number(latest[1]) >= maxD,
    `ACTIVE_CONTEXT latest_decision=D-${latest[1]} 落后于 ${monthLogs[monthLogs.length - 1]} 最后一条 D-${maxD}：先刷新 active 投影`);
});

test('⑥ ACTIVE_RULINGS：≤150 行且含 §B 分域索引（规则正文不在 .ctx）', () => {
  const p = join(CTX, 'ACTIVE_RULINGS.md');
  const src = readFileSync(p, 'utf8');
  const lines = src.split(/\r?\n/).length;
  assert.ok(lines <= 150, `ACTIVE_RULINGS 行数 ${lines} > 150：规则正文应迁 content，只留索引`);
  assert.match(src, /^## §B 分域索引/m, 'ACTIVE_RULINGS 缺「§B 分域索引」——规则正文应迁 content，本文件只留索引');
  const indexRows = src.split(/\r?\n/).filter((l) => /^\| [一二三四五六七八九十]+、/.test(l)).length;
  assert.ok(indexRows >= 16, `ACTIVE_RULINGS 分域索引只解析到 ${indexRows} 行（下限 16）：分域表被写坏或漏项`);
});

test('⑦ SNAPSHOT：≤250 行且不再承载批次小结', () => {
  const src = readFileSync(join(CTX, 'SNAPSHOT.md'), 'utf8');
  const lines = src.split(/\r?\n/).length;
  assert.ok(lines <= 250, `SNAPSHOT 行数 ${lines} > 250：批次小结应迁 EXECUTION_LOG_INDEX，SNAPSHOT 只留现状`);
  const batchSections = (src.match(/^## 批次 \d+ 小结/mg) || []).length;
  assert.equal(batchSections, 0, `SNAPSHOT 仍有 ${batchSections} 段批次小结：已改由 EXECUTION_LOG_INDEX 承接`);
});

test('⑧ CLAUDE.md：≤600 行 / ≤85KB；甲部引用框 ≤15 且不写历史', () => {
  const p = join(ROOT, 'CLAUDE.md');
  const src = readFileSync(p, 'utf8');
  const lines = src.split(/\r?\n/).length;
  const bytes = Buffer.byteLength(src, 'utf8');
  assert.ok(lines <= 600, `CLAUDE 行数 ${lines} > 600：先降级细则到 content，再删历史`);
  assert.ok(bytes <= 85 * 1024, `CLAUDE 字节 ${bytes} > 85KB：先降级细则到 content，再删历史`);

  const jiaStart = src.indexOf('# 甲部');
  const yiStart = src.indexOf('# 乙部');
  assert.ok(jiaStart >= 0 && yiStart > jiaStart, 'CLAUDE 缺 `# 甲部` / `# 乙部` 分界');
  const jia = src.slice(jiaStart, yiStart);
  const quotes = jia.split(/\r?\n/).filter((l) => /^\s*>/.test(l));
  assert.ok(quotes.length <= 15, `甲部引用框 ${quotes.length} 处 > 15：规则应写正文，不写引用框`);
  const historical = quotes.filter((l) => /批次\s*\d+|已废止|沿革|支书原话/.test(l) && !l.includes('批次 521'));
  assert.deepEqual(historical, [],
    `甲部引用框仍含历史叙述（应删 / 迁 logs，只留「原话即规则」）：\n  ${historical.join('\n  ')}`);
});

test('⑨ CLAUDE.md：乙部 ≤12 行且状态合法；丙部 ≤4 条且无已裁', () => {
  const src = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf8');
  const yiStart = src.indexOf('# 乙部');
  const bingStart = src.indexOf('# 丙部');
  assert.ok(yiStart >= 0 && bingStart > yiStart, 'CLAUDE 缺 `# 乙部` / `# 丙部` 分界');
  const yi = src.slice(yiStart, bingStart);
  const yiRows = yi.split(/\r?\n/).filter((l) => /^\|/.test(l) && !/^\|\s*[-:]+\s*\|/.test(l) && !/^\|\s*(ID|目标批次)\s*\|/.test(l));
  assert.ok(yiRows.length <= 12, `乙部表行 ${yiRows.length} 行 > 12：真任务应排期，假任务应删除`);
  const allowed = new Set(['在办', '待启动', '待裁']);
  const bad = yiRows.map((l) => l.split('|').map((s) => s.trim()).filter(Boolean)).filter((cells) => !allowed.has(cells[cells.length - 1]));
  assert.deepEqual(bad.map((c) => c.join(' | ')), [],
    `乙部出现非法状态（只允许 在办 / 待启动 / 待裁；已完成 / 已闭环 / 冻结件应删除）`);

  const bing = src.slice(bingStart);
  const bingRows = bing.split(/\r?\n/).filter((l) => /^\|/.test(l) && !/^\|\s*[-:]+\s*\|/.test(l) && !/^\|\s*ID\s*\|/.test(l));
  assert.ok(bingRows.length <= 4, `丙部表行 ${bingRows.length} 行 > 4：只留真待裁`);
  assert.doesNotMatch(bing, /已裁|已结项/, '丙部出现已裁 / 已结项：裁定后应删除');
});
