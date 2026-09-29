// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/import-path-guard.test.mjs —— **ESM 相对规格符「路径存在性」守卫**（G1–G3）
// ════════════════════════════════════════════════════════════════
// 由来（2026-09-29 批次 262，定根因于 `REVIEW_QUEUE H-12` 的第二处红）：
//   批次 234–246 的 **P5 物理目录分层**把 `docs/src/entries/*.js` 平铺件移进 `entries/pages|workspace/`，
//   唯**一处模板字面量动态 import** 被漏改——`entries/pages/settings-entry.js` 的
//   `` import(`../modules/capabilities/${stem}-workspace.js`) `` ⇒ 解析到**不存在的**
//   `docs/src/entries/modules/capabilities/…` ⇒ **404**、「设置 → 我的工作台」面板恒显「加载失败，请刷新页面重试。」
//   （真机取证：`reqfail … net::ERR_ABORTED` ＋ `Failed to fetch dynamically imported module`）。
//   ⇒ 修一处 `../` → `../../` 后，`preferences.test.mjs::真实拖拽` 由红转绿（16/16）。
//
// **为什么此前无人拦**（本守卫要补的那一格，两只既有守卫都恰好绕开）：
//   ① `module-load.test.mjs::E1` 只 import `docs/src` 下**非 `entries/`** 的模块（其 `collectJsFiles` 明写
//      `if (e.name === 'entries' && dir === root) continue;`）⇒ **入口件不在扫描面内**；
//   ② `link-integrity.test.mjs::L2` 自述「抽取口径 = 剔除整行注释 / **ESM 规格符** / `new URL(…)`」
//      ⇒ **规格符是被显式排除的**（它守的是 `location.href=` 赋值）。
//   ③ 其余守卫（`link-target-guard`）守的是**渲染型 href/src 的裸文件名**，与模块图无关。
//   ⇒ 于是「目录分层改了路径深度、但规格符写错」这一类**没有任何静态判据**，只能等真机 404 才暴露。
//
// 判据（三条，逐条给理由；抽取**只取规格符语境**，避免 D-675「裸子串扫描双向都会错」的坑）：
//   **G1 相对规格符的字面量目标必须存在**：`from '…'` / 副作用 `import '…'` / 动态 `import('…')`（均为**字面量**）
//       ⇒ 去掉 `?query` 后按**该文件所在目录**解析，目标文件必须真实存在（查文件、不查目录）。
//   **G2 模板字面量动态 import：静态前缀的目录必须存在**：`` import(`../x/${expr}`) `` 的运行期片段静态判不了
//       ⇒ 只判前缀解析后的**目录存在**（这正是本次事故的形态：目录本身就不该是 `entries/modules/…`）。
//   **G3 非空转**：扫描文件数 / 抽到的规格符数有下限（防正则写坏后断言恒真），并**现场造一条坏路径**
//       （临时文件 → 必须被 G1 抓出 → 删除），证明判据真的会判。
//
// 覆盖边界（如实标注）：只扫 `docs/src/**/*.js`（前端可交付面）。**不扫** `docs/*.html` 的 `<script src>`（`link-integrity` 管）、
//   不扫 `server/**` 的 import（那些由运行测试本身覆盖）、不判裸包名（非相对 → 浏览器无法加载，另行处置）。
// 运行：`node --test server/test/import-path-guard.test.mjs`（纯 node，无浏览器 / 无服务依赖）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = join(ROOT, 'docs', 'src');

/** 收集 docs/src 下全部 .js（**含 entries/**——那正是本守卫要补的盲区） */
function collectJs(dir) {
  const out = [];
  for (const n of readdirSync(dir)) {
    const f = join(dir, n);
    if (statSync(f).isDirectory()) out.push(...collectJs(f));
    else if (n.endsWith('.js')) out.push(f);
  }
  return out;
}

/** 抽规格符：只取「规格符语境」的字面量，模板字面量单列（kind: 'file' | 'dir'） */
function specifiersOf(text) {
  const out = [];
  const push = (raw, kind) => {
    if (!raw.startsWith('.')) return; // 只判相对规格符
    out.push({ raw, kind });
  };
  // 块注释整体剔除（保留行数无关紧要，这里只为不误报注释里的示例）
  const code = text.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const line of code.split(/\r?\n/)) {
    if (/^\s*\/\//.test(line)) continue; // 整行注释
    for (const m of line.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)) push(m[1], 'file');
    for (const m of line.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]/g)) push(m[1], 'file');
    for (const m of line.matchAll(/(^|[\s;{(])import\s+['"]([^'"]+)['"]/g)) push(m[2], 'file');
    // 模板字面量动态 import：只到第一个 ${ 之前的静态前缀
    for (const m of line.matchAll(/\bimport\s*\(\s*`([^`$]*)\$\{/g)) push(m[1], 'dir');
  }
  return out;
}

/** 对「单文件内容」求问题集（G1/G2 的唯一判据实现；G1 对全量文件调用它、G3 用内存副本调用它） */
function problemsFor(rel, file, text) {
  const out = [];
  for (const s of specifiersOf(text)) {
    const pathPart = s.raw.split('?')[0];
    if (!pathPart) continue;
    const target = resolve(dirname(file), pathPart);
    if (s.kind === 'file') {
      if (!existsSync(target) || statSync(target).isDirectory()) {
        out.push(`${rel} → \`${s.raw}\` 解析到不存在的文件（${target.slice(ROOT.length + 1).replace(/\\/g, '/')}）`);
      }
    } else if (!existsSync(target)) {
      out.push(`${rel} → \`${s.raw}\`（模板前缀）解析到不存在的目录（${target.slice(ROOT.length + 1).replace(/\\/g, '/')}）`);
    }
  }
  return out;
}

const FILES = collectJs(SRC);

test('G1/G2 相对 ESM 规格符的路径必须存在（字面量查文件；模板前缀查目录）', () => {
  const problems = [];
  for (const file of FILES) {
    const rel = file.slice(ROOT.length + 1).replace(/\\/g, '/');
    problems.push(...problemsFor(rel, file, readFileSync(file, 'utf8')));
  }
  assert.deepEqual(problems, [], `相对 ESM 规格符指向不存在的目标（运行时必 404、真机才暴露）：\n  ${problems.join('\n  ')}`);
});

test('G3 非空转：扫描面与抽取量有下限，且判据真会判（内存副本注入坏规格符，**不落盘**）', () => {
  assert.ok(FILES.length >= 240, `只扫到 ${FILES.length} 个 .js（基线 240：2026-09-29 实测 258）——抽取面被改坏了`);
  let total = 0;
  for (const f of FILES) total += specifiersOf(readFileSync(f, 'utf8')).length;
  assert.ok(total >= 1400, `只抽到 ${total} 条相对规格符（基线 1400：2026-09-29 实测 1618 = 文件字面量 1617 ＋ 模板前缀 1）——正则写坏后 G1/G2 会变成恒真`);

  // 现场反例：**只喂内存副本**（借一个真实文件路径作解析基准），走与 G1 完全同一份判据实现。
  // ⚠ 为什么不落盘造文件：本守卫扫的就是 `docs/src/**`，若在盘上临时造 `.js`，
  //   与 `module-load::E1`（它 import docs/src 全部模块）**并行跑时会互相干扰** ⇒ 用内存副本既证「判据真会判」、又零副作用。
  const base = join(SRC, '__probe__.js');
  const fake = "import './no-such-dir/nope.js';\nconst m = await import(`./also-missing/${x}.js`);\nimport './core/utils.js';\n";
  const got = problemsFor('docs/src/__probe__.js', base, fake);
  assert.equal(got.length, 2, `反例应报 2 条（1 个坏文件 + 1 个坏模板前缀），实测 ${got.length}：${got.join(' | ')}`);
  assert.ok(got[0].includes('./no-such-dir/nope.js'), '坏文件反例未被抓出');
  assert.ok(got[1].includes('./also-missing/'), '坏模板前缀反例未被抓出');
  // 对照组：同一次注入里的**好规格符**（`./core/utils.js`）不得被误报
  assert.ok(!got.some((p) => p.includes('./core/utils.js')), '存在的好规格符被误报 ⇒ 判据过严');
});
