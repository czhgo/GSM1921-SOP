// server/test/mock-import-guard.test.mjs — H32 守卫：运行时不得读 mock 静态名册（2026-11-15 批次 553）
//
// 病灶（批次 552 跨层专项）：`services/core/visibility.js` 与 `governance/secretary-overview.js`
//   在 api 形态仍 import `data/mock/people.js` 的静态 `PEOPLE` 取名册 / 党小组 ⇒ 新增或移出成员后
//   可见清单、角色计数、阶段人数全部错值。规则 `CLAUDE.md H32` 早已写明「UI 不直接读 mock / localStorage，
//   只经 data-adapter / api-adapter 门面」，但没有机检落点 ⇒ 本次补成常驻守卫。
//
// 判据：
//   M1 `docs/src/services/**` 与 `docs/src/components/**` 不得 `import { … PEOPLE … } from '…/data/mock/(people|index).js'`；
//      命中即红并指名。白名单只允许「mock 形态种子源」6 处，逐条给理由。
//   M2 非空转：扫描文件数须 ≥ 120（防正则失效 / 目录改名导致恒真）。
//
// 说明：其它 `data/mock/**` 种子（活动 / 考察 / 通知等）不属本判据——它们是 mock 形态的初始数据，
//   由 data-adapter 统一装配；本守卫只盯「人员名册」这一条运行时事实。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const D = (p) => join(ROOT, p);

// 白名单：mock 形态种子源（api 形态由 data-adapter / PersonStore 接管）
const WHITELIST = new Map([
  ['docs/src/services/branch/branch.js', '支部 / 党委显示名与支委名单种子（mock 形态装配用）'],
  ['docs/src/services/branch/org-base-data-preview.js', '组织基础数据预览：由 mock 种子派生的只读样例'],
  ['docs/src/services/core/auth.js', 'mock 登录账号种子；api 形态走 /auth/login'],
  ['docs/src/services/core/roles.js', '角色枚举种子；角色键本体在 core/domain/constants.js'],
  ['docs/src/services/member/person.js', 'PersonStore 的 mock 形态名册源；api 形态读服务端缓存'],
  ['docs/src/components/sections/references.js', '帮助页静态人员引用（非运行时权限 / 可见性）'],
]);

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    if (n === 'node_modules' || n === '.git') continue;
    const f = join(dir, n);
    if (statSync(f).isDirectory()) { walk(f, out); continue; }
    if (n.endsWith('.js')) out.push(f);
  }
  return out;
}

const IMPORT_PEOPLE = /import\s*\{[^}]*\bPEOPLE\b[^}]*\}\s*from\s*'[^']*data\/mock\/(?:people|index)\.js/;

test('M1 运行时不得从 data/mock 读 PEOPLE（H32）', () => {
  const hits = [];
  let scanned = 0;
  for (const dir of [D('docs/src/services'), D('docs/src/components')]) {
    for (const f of walk(dir)) {
      scanned += 1;
      const rel = f.slice(ROOT.length + 1).replace(/\\/g, '/');
      readFileSync(f, 'utf8').split(/\r?\n/).forEach((line, i) => {
        if (!IMPORT_PEOPLE.test(line)) return;
        if (WHITELIST.has(rel)) return;
        hits.push(`${rel}:${i + 1}`);
      });
    }
  }
  assert.ok(scanned >= 120, `只扫到 ${scanned} 个文件（基线 120）：扫描面被写坏，M1 会变恒真`);
  assert.deepEqual(hits, [], '运行时仍直接读 mock 静态名册——应改走 PersonStore / data-adapter（H32）：\n  '
    + hits.join('\n  '));
});

test('M2 白名单只减不增：每条都必须有理由', () => {
  for (const [file, reason] of WHITELIST) {
    assert.ok(reason && reason.length >= 8, `${file} 的白名单理由过短`);
    assert.ok(statSync(D(file)).isFile(), `白名单指向的文件不存在：${file}`);
  }
});
