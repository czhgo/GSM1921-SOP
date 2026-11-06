// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/branch-id-literal-guard.test.mjs —— 缺省支部 id **字面量**守卫（2026-10-22 第七轮 P2）
// ════════════════════════════════════════════════════════════════
// 由来：缺省支部 `'br-b1'` 曾以 `|| 'br-b1'` 形式内联散落在前端 21 个文件 / 服务端 16 个文件；
//   换默认支部或多支部部署要逐处改，漏一处即产生跨支部归属（R2-17 已立单一源
//   `docs/src/core/domain/constants.js::DEFAULT_BRANCH_ID`，本守卫负责让它**不被重新写回字面量**）。
//
// 判据：
//   B1 生产代码（`docs/src/**/*.js` + `server/**/*.js`，**排除 `server/test/**`** 与 node_modules）
//      中 `'br-b1'` / `"br-b1"` 字面量一律判红；**唯一例外**＝常量定义行本身
//      （`export const DEFAULT_BRANCH_ID = 'br-b1';`）。
//   B2 注释行（`//` 整行、`/* … */` 块）不参与扫描——说明性文字可保留，不强制改写。
//   B3 非空转：扫描文件数 / 常量定义必须有下限；并现场用**内存副本**注入一条字面量证明判据真会判
//      （不在盘上造文件，避免与并行守卫互相干扰）。
//
// 覆盖边界（如实标注）：只扫 `.js`（`.env.example` 这类非代码示例不在面内）；不扫 `content/**` 文档；
//   `server/test/**` 属测试夹具，显式不在扫描面。
// 运行：`node --test server/test/branch-id-literal-guard.test.mjs`（纯 node）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const SCAN_ROOTS = [join(ROOT, 'docs', 'src'), join(ROOT, 'server')];
const CONST_REL = 'docs/src/core/domain/constants.js';
const DEFINITION = /^export const DEFAULT_BRANCH_ID = 'br-b1';$/;
const LITERAL = /['"]br-b1['"]/;

/** 收集扫描面：docs/src 全量 .js；server 全量 .js 但跳过顶层 `test/` 与 node_modules */
export function collectFiles() {
  const out = [];
  const walk = (dir, depth) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        if (name === 'node_modules' || name === '.git' || name === '.tmp') continue;
        if (name === 'test' && depth === 1 && dir === join(ROOT, 'server')) continue;
        walk(full, depth + 1);
      } else if (name.endsWith('.js')) {
        out.push(full);
      }
    }
  };
  for (const root of SCAN_ROOTS) walk(root, 1);
  return out;
}

/**
 * 单文件判据（纯函数，守卫与自检共用）：
 * 逐行扫描，跳过整行注释与 `/* … *​/` 块；命中字面量即记 { line, text }。
 * 常量定义文件只放行唯一那行定义。
 */
export function literalViolations(rel, text) {
  const out = [];
  let inBlock = false;
  const isConstFile = rel.replace(/\\/g, '/').endsWith(CONST_REL);
  text.split(/\r?\n/).forEach((raw, i) => {
    const t = raw.trim();
    if (inBlock) {
      if (t.includes('*/')) inBlock = false;
      return;
    }
    if (t.startsWith('//')) return;
    if (t.startsWith('/*')) {
      if (!t.includes('*/')) inBlock = true;
      return;
    }
    if (!LITERAL.test(raw)) return;
    if (isConstFile && DEFINITION.test(t)) return;
    out.push({ line: i + 1, text: t });
  });
  return out;
}

test('B1/B2 生产代码中的 br-b1 字面量除常量定义行外一律判红（注释行跳过）', () => {
  const files = collectFiles();
  const problems = [];
  for (const file of files) {
    const rel = relative(ROOT, file).replace(/\\/g, '/');
    for (const v of literalViolations(rel, readFileSync(file, 'utf8'))) {
      problems.push(`${rel}:${v.line}  ${v.text}`);
    }
  }
  assert.deepEqual(problems, [],
    `以下生产代码仍内联缺省支部字面量 'br-b1'（应改用 constants.js::DEFAULT_BRANCH_ID）：\n  ${problems.join('\n  ')}`);
});

test('B3 非空转：扫描面有规模、常量定义仍在，且判据真会判（内存副本注入反例）', () => {
  const files = collectFiles();
  assert.ok(files.length >= 300, `只扫到 ${files.length} 个生产 .js（基线 300）——扫描面被改坏`);
  const constFile = files.find((f) => relative(ROOT, f).replace(/\\/g, '/') === CONST_REL);
  assert.ok(constFile, `扫描面缺少常量定义文件 ${CONST_REL}`);

  // 反例 1：代码行内联字面量 ⇒ 必须判红
  const probe = "const fallback = value || 'br-b1';";
  const caught = literalViolations('docs/src/probe.js', probe);
  assert.equal(caught.length, 1, '注入的代码字面量未被判出 ⇒ 判据恒真');
  assert.equal(caught[0].line, 1);

  // 反例 2：同样内容写在注释里 ⇒ 不判（说明文字允许保留）
  const commentOnly = [
    "// 缺省支部 'br-b1'（说明性文字，允许保留）",
    '/* 块注释里的 \'br-b1\' 也不判 */',
    'const ok = DEFAULT_BRANCH_ID;',
  ].join('\n');
  assert.deepEqual(literalViolations('docs/src/probe.js', commentOnly), [], '注释行被误判 ⇒ 判据过严');

  // 反例 3：常量定义文件只有定义行放行，第二处同样判红
  const constText = "export const DEFAULT_BRANCH_ID = 'br-b1';\nconst again = 'br-b1';";
  const constCaught = literalViolations(CONST_REL, constText);
  assert.equal(constCaught.length, 1, '常量定义文件里的第二处字面量未被判出');
  assert.equal(constCaught[0].line, 2);
});
