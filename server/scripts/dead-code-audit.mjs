// server/scripts/dead-code-audit.mjs — 死代码清点（2026-11-25 批次 631 立 · 635 升级为入口可达性审计）
//
// 两类「死」分开报，处置不同：
//   ① 根本不能调用 = **入口不可达**（从 HTML `<script>` 起算，沿静态 import 与能力表动态规格都走不到）
//      ⇒ 可删；
//   ② 生产不需要 = 开关恒假 / 仅演示用 ⇒ 保留并收门（清单见 `server/run-mode.js` 头注）。
//
// 口径（与运行时同源）：
//   · 入口＝`docs/**/*.html` 的 `<script src="…js">` ＋ `docs/src/entries/workspace/*-entry.js`；
//   · 静态边＝`import … from '…js'` / `import('…js')` 字面量，按调用文件相对解析；
//   · 动态规格＝正文里的 `…/entries/…js` 串，按 `docs/src/capabilities/` 为基准解析
//     （与 `core/boot/tab-loader.js::CAPABILITY_BASE` 同口径）。
//
// 误差：纯正则，只能证明「走不到」，不能证明「永远不会被走到」；删除前仍须人工复核。
// 自检：`--self-test` 用合成样本验证「可达不进、不可达必进」。
//
// 用法：node server/scripts/dead-code-audit.mjs [--json] [--self-test]

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, basename, resolve, dirname } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const DOCS = join(ROOT, 'docs');
const SRC = join(DOCS, 'src');
const CAP_DIR = join(SRC, 'capabilities');
const JSON_OUT = process.argv.includes('--json');
const SELF_TEST = process.argv.includes('--self-test');

const walk = (dir, filter, out = []) => {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walk(p, filter, out);
    else if (filter(ent.name)) out.push(p);
  }
  return out;
};
const rel = (p) => relative(ROOT, p).replace(/\\/g, '/');

/** 入口 + 静态边 + 动态规格 → 可达集合 */
export function analyze({ modules, texts, entries, capabilityDir }) {
  const edges = new Map();
  for (const p of modules) {
    const t = texts.get(p) || '';
    const set = new Set();
    for (const m of t.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+\.js)(?:\?[^'"]*)?['"]/g)) {
      const spec = m[1];
      if (!spec.startsWith('.')) continue;
      const abs = resolve(dirname(p), spec);
      if (texts.has(abs)) set.add(abs);
    }
    // 能力表动态规格：`../entries/tabs/…js` 以 capabilities/ 为基准
    for (const m of t.matchAll(/['"]((?:\.\.?\/)+entries\/[^'"]+\.js)(?:\?[^'"]*)?['"]/g)) {
      const abs = resolve(capabilityDir, m[1]);
      if (texts.has(abs)) set.add(abs);
    }
    edges.set(p, set);
  }
  const reach = new Set(entries.filter((p) => texts.has(p)));
  const queue = [...reach];
  while (queue.length) {
    const cur = queue.pop();
    for (const nx of edges.get(cur) || []) {
      if (!reach.has(nx)) { reach.add(nx); queue.push(nx); }
    }
  }
  const unreachable = modules.filter((p) => !reach.has(p));
  return { reach, unreachable };
}

function collect() {
  const modules = walk(SRC, (n) => n.endsWith('.js'));
  const texts = new Map(modules.map((p) => [p, readFileSync(p, 'utf8')]));
  const htmlFiles = walk(DOCS, (n) => n.endsWith('.html'));
  const entries = [];
  for (const h of htmlFiles) {
    const t = readFileSync(h, 'utf8');
    for (const m of t.matchAll(/<script[^>]+src="([^"]+\.js)(?:\?[^"]*)?"/g)) {
      const abs = resolve(DOCS, m[1].replace(/^\.\//, ''));
      if (existsSync(abs)) entries.push(abs);
    }
  }
  for (const p of modules) {
    if (/entries[\\/]workspace[\\/][^\\/]+-entry\.js$/.test(p)) entries.push(p);
  }
  // 服务端也会直接 import 前端纯领域模块（如 `routes/leader-progress.js` → `core/domain/party-group-scope.js`）：
  //   这些是真实消费者，必须作为可达种子，否则会误删「前端入口走不到但服务端在用」的模块。
  const serverFiles = walk(join(ROOT, 'server'), (n) => /\.(js|mjs)$/.test(n));
  const serverTexts = [];
  for (const p of serverFiles) {
    const t = readFileSync(p, 'utf8');
    serverTexts.push(t);
    for (const m of t.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]*docs\/src\/[^'"]+\.js)(?:\?[^'"]*)?['"]/g)) {
      const abs = resolve(dirname(p), m[1]);
      if (existsSync(abs)) entries.push(abs);
    }
  }
  return { modules, texts, entries, serverText: serverTexts.join('\n') };
}

if (SELF_TEST) {
  // 合成样本：a → b（可达），c（不可达）
  const mk = (name, body) => join(SRC, '__audit_selftest__', name);
  const a = mk('a.js', "import './b.js';\n");
  const b = mk('b.js', 'export const x = 1;\n');
  const c = mk('c.js', 'export const y = 2;\n');
  const texts = new Map([[a, a && "import './b.js';"], [b, 'export const x = 1;'], [c, 'export const y = 2;']]);
  const { reach, unreachable } = analyze({ modules: [a, b, c], texts, entries: [a], capabilityDir: CAP_DIR });
  const ok = reach.has(a) && reach.has(b) && unreachable.length === 1 && unreachable[0] === c;
  console.log(`[dead-code] self-test ${ok ? 'PASS' : 'FAIL'}：可达 ${reach.size} / 不可达 ${unreachable.length}`);
  process.exit(ok ? 0 : 1);
}

const { modules, texts, entries, serverText } = collect();
const { unreachable } = analyze({ modules, texts, entries, capabilityDir: CAP_DIR });
const allText = [...texts.values()].join('\n') + '\n' + serverText;

// 三面之第三面：全文文件名引用（兜底，防动态拼串漏网）
const stillReferenced = unreachable.filter((p) => {
  const base = basename(p);
  const others = [...texts.entries()].filter(([k]) => k !== p).map(([, v]) => v).join('\n');
  return others.includes(base) || allText.includes(rel(p));
});

const deadModules = unreachable.filter((p) => !stillReferenced.includes(p));

// 零外部引用导出（沿用 631 口径；仅登记不删）
const unusedExports = [];
for (const p of modules) {
  const t = texts.get(p) || '';
  const names = [...t.matchAll(/export\s+(?:async\s+)?(?:function|const|class|let)\s+([A-Za-z_$][\w$]*)/g)].map((m) => m[1]);
  for (const name of names) {
    const used = [...texts.entries()].some(([k, v]) => k !== p && new RegExp(`\\b${name}\\b`).test(v));
    if (!used) unusedExports.push(`${rel(p)}::${name}`);
  }
}

const report = {
  modules: modules.length,
  entries: entries.length,
  unreachable: deadModules.map(rel),
  reachableByFilenameOnly: stillReferenced.map(rel),
  unusedExports,
};

if (JSON_OUT) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`[dead-code] 模块 ${modules.length} · 入口 ${entries.length} · 不可达 ${report.unreachable.length} · 仅文件名命中 ${report.reachableByFilenameOnly.length} · 零引用导出 ${unusedExports.length}`);
  for (const r of report.unreachable) console.log('  不可达: ' + r);
  for (const r of report.reachableByFilenameOnly) console.log('  仅文件名命中(不删): ' + r);
}
