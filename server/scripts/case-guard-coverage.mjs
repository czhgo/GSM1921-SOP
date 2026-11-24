// server/scripts/case-guard-coverage.mjs — 判例 ↔ 守卫覆盖审计（2026-11-25 批次 632 · D-930）
//
// 为什么：判例把「为什么」写进了文档，但只要守卫没覆盖到发现问题的那个节点，下一批就会被
//   「优化」掉（CASE-DESIGN-034 只锁外层、D-898 无守卫两例）。本脚本把每条判例声称的守卫
//   逐个拿到 `server/test/**` 里查证，输出三分类：有机检 / 找不到 / 仅人工核。
//
// 口径：解析 `## CASE-…` 小节内的「守卫」行，抽 `guard-id`（含 `guard::X1` 形态）；
//   判据是「该 id 或其源件名出现在某个测试文件里」。找不到 ≠ 无效——可能写在规则正文或人工核，
//   所以只报事实，由人裁决补守卫或降级登记。
//
// 用法：node server/scripts/case-guard-coverage.mjs [--json] [--write]

import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const JSON_OUT = process.argv.includes('--json');
const WRITE = process.argv.includes('--write');

// 目录遍历（Dirent，避免额外 stat）
function walk2(dir, filter, out = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walk2(p, filter, out);
    else if (filter(ent.name)) out.push(p);
  }
  return out;
}

const caseFiles = walk2(join(ROOT, 'content'), (n) => n === 'CASES.md');
const testFiles = walk2(join(ROOT, 'server', 'test'), (n) => n.endsWith('.test.mjs'));
const testCorpus = testFiles.map((p) => ({ rel: relative(ROOT, p).replace(/\\/g, '/'), text: readFileSync(p, 'utf8') }));

const GUARD_RE = /[a-z][a-z0-9-]*(?:-guard|guard)(?:::[A-Za-z]\d+)?/g;

const rows = [];
for (const file of caseFiles) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  const blocks = readFileSync(file, 'utf8').split(/\n(?=## CASE-)/);
  for (const block of blocks) {
    const head = /^## (CASE-[A-Z]+-\d+)/.exec(block.trim());
    if (!head) continue;
    const guardLine = block.split('\n').find((l) => /守卫/.test(l)) || '';
    const ids = [...new Set((guardLine.match(GUARD_RE) || []).map((s) => s.toLowerCase()))];
    const found = ids.filter((id) => {
      const needle = id.split('::')[0];
      return testCorpus.some((t) => t.text.toLowerCase().includes(needle));
    });
    rows.push({
      caseId: head[1],
      file: rel,
      guardField: guardLine.trim().slice(0, 160),
      claimed: ids,
      verified: found,
      verdict: ids.length === 0 ? '仅人工核' : (found.length === ids.length ? '有机检' : '声称有机检但找不到'),
    });
  }
}

const byVerdict = rows.reduce((acc, r) => { acc[r.verdict] = (acc[r.verdict] || 0) + 1; return acc; }, {});
if (JSON_OUT) {
  console.log(JSON.stringify({ total: rows.length, byVerdict, rows }, null, 2));
} else {
  console.log(`[case-guard] 判例 ${rows.length} 条 · ${Object.entries(byVerdict).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  for (const v of ['声称有机检但找不到', '仅人工核']) {
    for (const r of rows.filter((x) => x.verdict === v)) {
      console.log(`  [${v}] ${r.caseId}：${r.claimed.join('/') || '(未写守卫)'}`);
    }
  }
}

if (WRITE) {
  const dir = join(ROOT, '.ctx', 'evidence', '2026-11-25');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const lines = [
    '# 判例 ↔ 守卫覆盖审计（2026-11-25 批次 632）',
    '',
    `- 判例总数：${rows.length}；分类：${Object.entries(byVerdict).map(([k, v]) => `${k} ${v}`).join(' · ')}`,
    '',
    '| 判例 | 分类 | 声称守卫 | 可核 |',
    '|---|---|---|---|',
    ...rows.map((r) => `| ${r.caseId} | ${r.verdict} | ${r.claimed.join(' / ') || '—'} | ${r.verified.join(' / ') || '—'} |`),
    '',
    '> 口径：解析各域 `CASES.md` 的「守卫」行，抽 guard id 到 `server/test/**` 查证；找不到不等于无效（可能写在规则正文或人工核），由人裁决补守卫或降级登记。',
  ];
  writeFileSync(join(dir, 'case-guard-coverage.md'), lines.join('\n'), 'utf8');
  console.log(`[case-guard] 已写入 .ctx/evidence/2026-11-25/case-guard-coverage.md`);
}
