// role: [工程师]+[AI]
// esm-parse-guard.test.mjs — 前端模块「真正 ESM 解析」门禁（2026-10-29）
//
// 病灶（支书台「待办」页签恒显「这个页签暂时没加载出来」，点重试永远无效）：
//   `docs/src/entries/tabs/secretary/todo-tab.js` 与
//   `docs/src/entries/tabs/visitor/inspection-tab.js` 里各有一条 `import` 落在函数体内部。
//   浏览器按 ESM 解析 ⇒ 整个模块 `SyntaxError: Unexpected token '{'` ⇒ 既不导出 renderContent，
//   也不会因「重试」自愈（同一 URL 的模块图不会重新解析）。
//
// 为什么既有守卫没拦住：
//   · `module-load::E1` 收集模块时**显式排除 `entries/**`**（入口装配另有覆盖）；
//   · `import-path-guard` 只判「路径存在」，不判「语法位置」；
//   · `node --check` 按 CommonJS 解析，这类错误**退出码仍为 0**，不能当 ESM 门禁。
//
// 判据：
//   ESM1 扫描 `docs/src/**/*.js` + `docs/scripts/**/*.js`，全部必须通过真正的 ESM 解析；
//        失败数为 0；扫描面 ≥300（防扫描根写坏导致恒真）。
//   ESM2 反例：现场造一个「函数体内 import」的临时文件，守卫必须判红；
//        同一次注入里的合法 ESM 文件不得误报（证明判据不是恒真、也不是全红）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { parseFiles } from './lib/esm-parse.mjs';

const ROOT = join(import.meta.dirname, '..', '..');
const SCAN_ROOTS = [
  join(ROOT, 'docs', 'src'),
  join(ROOT, 'docs', 'scripts'),
];

/** 递归收集 .js（只收文件，不收目录；docs/scripts 目前只有 .mjs，保留扫描根以防将来出现 .js） */
function collectJs(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) collectJs(full, out);
    else if (name.endsWith('.js')) out.push(full);
  }
  return out;
}

const FILES = SCAN_ROOTS.flatMap((d) => collectJs(d));

test('ESM1 docs 前端模块全部通过真正的 ESM 解析（node --check 不算）', () => {
  assert.ok(FILES.length >= 300,
    `只扫描到 ${FILES.length} 个 .js（下限 300）——扫描根或后缀过滤被改坏，守卫会恒真`);

  const { total, failures } = parseFiles(FILES);
  assert.equal(total, FILES.length, '子进程回报的文件数与扫描结果不一致');

  if (failures.length > 0) {
    console.log('[ESM1] 解析失败文件：');
    for (const f of failures) {
      console.log(`  - ${relative(ROOT, f.file).replace(/\\/g, '/')} :: ${f.name}: ${f.message}`);
    }
  }

  assert.equal(failures.length, 0,
    `有 ${failures.length} 个模块无法被 ESM 解析（浏览器里会整模块失败、页签恒定报错）：\n`
    + failures.map((f) => `  ${relative(ROOT, f.file).replace(/\\/g, '/')} :: ${f.name}: ${f.message}`).join('\n'));
});

test('ESM2 反例：函数体内的 import 必须判红，合法 ESM 不得误报', () => {
  const dir = mkdtempSync(join(tmpdir(), 'esm-parse-negative-'));
  try {
    const bad = join(dir, 'bad.js');
    // 病人原形：import 落在函数体内（语法位置非法）
    writeFileSync(bad, [
      'export function renderContent() {',
      "  import { emptyStateHtml } from './empty-state.js';",
      '  return emptyStateHtml;',
      '}',
      '',
    ].join('\n'), 'utf8');

    const good = join(dir, 'good.js');
    // 对照：同样有 import，但位于模块顶层 ⇒ 必须通过
    writeFileSync(good, [
      "import { emptyStateHtml } from './empty-state.js';",
      'export function renderContent() { return emptyStateHtml; }',
      '',
    ].join('\n'), 'utf8');

    const { total, failures } = parseFiles([bad, good]);
    assert.equal(total, 2);
    assert.equal(failures.length, 1,
      `反例应只报 1 条（函数体内 import），实测 ${failures.length} 条：${failures.map((f) => f.file).join(', ')}`);
    assert.equal(failures[0].file, bad, '被判红的不是那个函数体内 import 的文件');
    assert.match(failures[0].message, /Unexpected token|import/i,
      `错误信息不像语法位置错误：${failures[0].name}: ${failures[0].message}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
