// role: [工程师]+[AI]
// write-policy-evidence-guard.test.mjs — 写门矩阵 evidence 行号守卫（本批 P0-6）
//
// 病灶：write-policy-matrix 的 evidence 写「文件:行号 / #L 区间」，但没有任何守卫核这些行号；
//   实现文件整体下移后，矩阵仍指向旧行 ⇒ 矩阵的「取证」能力形同虚设。
// 判据（保守但可证伪）：
//   · evidence 里的 file:line 必须文件存在、行号在范围内、该行不是空行 / 纯注释 / 单闭合括号；
//   · evidence 带 `::函数名` 时，该文件必须仍含此函数名（防函数被删 / 改名后矩阵僵尸）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WRITE_POLICY_MATRIX } from '../security/write-policy-matrix.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const REF = /([A-Za-z0-9_./-]+\.(?:js|mjs))(?:::|#L|:)(\d+)(?:(?:-L?)(\d+))?/g;
const WEAK_LINE = /^\s*(?:\}|}\);)?\s*$/;

/** 证据里的 `file.js::fn` 配对（逐对校验，禁止把首个文件与后续所有函数名错配） */
function symbolPairs(evidence) {
  return [...evidence.matchAll(/([A-Za-z0-9_./-]+\.(?:js|mjs))::([A-Za-z_$][\w$]+)/g)]
    .map((m) => ({ rel: m[1], sym: m[2] }));
}

test('写门矩阵 evidence 行号可解析且不指向空行', () => {
  const problems = [];
  let refs = 0;
  for (const row of WRITE_POLICY_MATRIX) {
    const evidence = String(row.evidence || '');
    for (const m of evidence.matchAll(REF)) {
      const [, rel, startStr] = m;
      if (!rel.startsWith('server/') && !rel.startsWith('docs/')) continue;
      const abs = join(ROOT, rel);
      refs += 1;
      if (!existsSync(abs) || !statSync(abs).isFile()) {
        problems.push(`${rel}:${startStr} 文件不存在（${row.method} ${row.path}）`);
        continue;
      }
      const text = readFileSync(abs, 'utf8');
      const lines = text.split(/\r?\n/);
      const start = Number(startStr);
      if (!Number.isFinite(start) || start < 1 || start > lines.length) {
        problems.push(`${rel}:${startStr} 行号越界（共 ${lines.length} 行；${row.method} ${row.path}）`);
        continue;
      }
      if (WEAK_LINE.test(lines[start - 1] || '')) {
        problems.push(`${rel}:${startStr} 指向空行 / 注释 / 单闭合括号（${row.method} ${row.path}）`);
      }
    }
    for (const { rel, sym } of symbolPairs(evidence)) {
      if (!rel.startsWith('server/') && !rel.startsWith('docs/')) continue;
      const abs = join(ROOT, rel);
      if (existsSync(abs) && !readFileSync(abs, 'utf8').includes(sym)) {
        problems.push(`${rel} 已不含 \`::${sym}\`（${row.method} ${row.path}）`);
      }
    }
  }
  assert.ok(refs >= 10, `evidence 行号引用只有 ${refs} 条（下限 10）：解析面可能被写坏`);
  assert.deepEqual(problems, [], `写门矩阵 evidence 失配：\n  ${problems.join('\n  ')}`);
});