// server/test/date-canon-guard.test.mjs — 「日期口径」静态守卫（R-26③ · 2026-10-05 批次 388）
//
// 来源（`CLAUDE.md R-26 ③ 待办`，本次落地）：「UTC 与本地日期口径混用（`toISOString().slice(0,10)` vs
//   `_currentYearMonth()`）须统一到本地口径。」
//   病灶：`new Date()` ＋ `toISOString()` 切前 10 位取「今天」是 **UTC** ⇒ 在 Asia/Shanghai（UTC+8）的
//   **00:00–08:00** 会把「今天」判成**昨天**（逾期 / 待办 / 发布日 / 归档日随之偏一天）——这是**早上用得多**
//   的支部系统里的真实错判。
//   本守卫把「应用面不得再用 UTC 切串取今天」**机械化**（此前只靠人记）。
//
// 判据：
//   D1 应用面（`docs/src/**` ＋ `server/**`）**不得**出现 UTC 切串取日；命中即红并指名。
//   D2 非空转：本地口径**单一源**确实在位——前端零依赖叶子 `docs/src/core/base/date.js`（导出 `todayLocal`）
//      ＋ 服务端单一源 `server/services/reporting.js`（导出 `today` / `fmtLocal`）；
//      且 `docs/src/core/domain/constants.js` 仍**只引一个零依赖叶子**（防它被顺手接上重依赖、破了「双端可载」）。
//   D3 抽取面下限（防判据被写坏 ⇒ 恒真）。
//
// ⚠ 边界（如实登记，**不假装覆盖**）：`docs/scripts/**` 与 `deploy/**` 是**发版 / 打包工具链**（其 `TODAY`
//   只用于**版本戳与产物名**、不属应用日期口径）⇒ 不在本判据面内。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const SELF = join(import.meta.dirname, 'date-canon-guard.test.mjs');
// ⚠ 目标串**拼接**而成：本文件自身不得出现该字面（否则自命中）
const RE = new RegExp('toISOString\\(\\)\\.slice\\(0,\\s*' + '10\\)');

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    if (n === 'node_modules' || n === '.git') continue;
    const f = join(dir, n);
    if (statSync(f).isDirectory()) { walk(f, out); continue; }
    if (n.endsWith('.js') || n.endsWith('.mjs')) out.push(f);
  }
  return out;
}

test('D1 日期口径：应用面（docs/src ＋ server）不得用 UTC 切串取「今天」（R-26③）', () => {
  const hits = [];
  let scanned = 0;
  for (const dir of [join(ROOT, 'docs', 'src'), join(ROOT, 'server')]) {
    for (const f of walk(dir)) {
      if (f === SELF) continue;
      scanned += 1;
      readFileSync(f, 'utf8').split(/\r?\n/).forEach((line, i) => {
        if (RE.test(line)) hits.push(`${f.slice(ROOT.length + 1).replace(/\\/g, '/')}:${i + 1}`);
      });
    }
  }
  assert.ok(scanned >= 200, `只扫到 ${scanned} 个文件（基线 200）：扫描面被写坏，D1 会变恒真`);
  assert.deepEqual(hits, [], '应用面仍在用 UTC 切串取「今天」——应改为本地口径'
    + '（前端 `core/base/date.js::todayLocal()`；服务端 `services/reporting.js::today()` / `fmtLocal()`）：\n  '
    + hits.join('\n  '));
});

test('D2 非空转：本地口径单一源在位（前端零依赖叶子 ＋ 服务端单一源 ＋ constants 叶子不变量）', () => {
  const fe = readFileSync(join(ROOT, 'docs', 'src', 'core', 'base', 'date.js'), 'utf8');
  assert.match(fe, /export function todayLocal\(\)/, '前端叶子 `core/base/date.js` 未导出 `todayLocal`');
  assert.ok(!/^import[\s{]/m.test(fe), '前端 `core/base/date.js` 必须是**零依赖叶子**（否则 constants 不能引它）');

  const be = readFileSync(join(ROOT, 'server', 'services', 'reporting.js'), 'utf8');
  assert.match(be, /export function today\(\)/, '服务端单一源 `services/reporting.js` 未导出 `today`');
  assert.match(be, /export function fmtLocal\(d\)/, '服务端单一源 `services/reporting.js` 未导出 `fmtLocal`');

  const cst = readFileSync(join(ROOT, 'docs', 'src', 'core', 'domain', 'constants.js'), 'utf8');
  const imps = (cst.match(/^import[\s{]/gm) || []).length;
  assert.equal(imps, 1, `constants.js 只许 1 条 import（零依赖叶子）——实为 ${imps} 条；`
    + '它被全站 import 且要求双端可载，加依赖须先想清楚（见本文件头注）');
  assert.match(cst, /from '\.\.\/base\/date\.js/, 'constants.js 的唯一条 import 应指向零依赖叶子 `../base/date.js`');

  // 前端 `utils.js` 对本件做**转出**（既有 `from '…/utils.js'` 调用点不变）
  const utils = readFileSync(join(ROOT, 'docs', 'src', 'core', 'base', 'utils.js'), 'utf8');
  assert.match(utils, /export \{ _fmtDate, todayLocal \} from '\.\/date\.js/, 'utils.js 未转出 `date.js` 的口径函数');
});
