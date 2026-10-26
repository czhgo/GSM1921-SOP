// role: [工程师]+[AI]
// link-color-guard.test.mjs — 「跳转链接」颜色单一源守卫（2026-10-23 批次 507）
//
// 为什么要有本守卫：
//   同一个「跳转」语义，首页一处是 `text-accent`（主题色深字）、另一处是 `text-blue-600`（蓝）——
//   读者无法从颜色判断「这是链接还是信息态」。批次 507 裁定：**全站链接统一主题色深字**
//   （`.link` / `.text-accent` → `--app-accent-soft-text`），蓝色只保留「信息态」（徽章 / 状态字 /
//   带背景色的按钮型链接）。没有本守卫，下一批新增页面又会把 Tailwind 蓝当链接色写回来。
//
// 判据：
//   L1 非空转：扫描到的文件数 / `<a>` 标签数低于下限即红（解析面被削 ⇒ L2 恒真）
//   L2 纯文本 `<a>`（class 里没有 `bg-*`）不得出现 `text-blue-*` / `text-sky-*` / `text-indigo-*`
//   L3 `.link` 组件类单一源：色取 `--color-link`；**无文本下划线**（2026-10-27 Task 9 全站清零），
//      静态线索＝600 字重、hover＝10% 主题淡底（`--app-accent-tint`）
//   L4 `.text-accent` 仍是等价别名（存量调用点依赖）
//   L5 蓝色文字类总量只降不升（棘轮；覆盖 JS 动态 className 这类 `<a>` 正则抓不到的写法）
// 运行：node --test server/test/link-color-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const DOCS = join(ROOT, 'docs');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/** 扫 docs/ 下的前端源（js/html），排除第三方产物 */
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(ROOT, full).replace(/\\/g, '/');
    if (rel.includes('assets/vendor') || rel.includes('node_modules')) continue;
    let st;
    try { st = readdirSync(full); } catch { st = null; }
    if (st) { out.push(...walk(full)); continue; }
    if (/\.(js|html)$/.test(name)) out.push(rel);
  }
  return out;
}

const FILES = walk(DOCS);

/** `<a ...>` 开标签（含跨行的 class） */
function anchors(src) {
  return [...src.matchAll(/<a\b[^>]*>/g)].map((m) => m[0]);
}

const BLUE_TEXT_RE = /\btext-(?:blue|sky|indigo)-\d{2,3}\b/;

test('L1 非空转：可扫描到前端源与 <a> 标签', () => {
  assert.ok(FILES.length >= 150, `只扫描到 ${FILES.length} 个前端源文件（下限 150）`);
  const total = FILES.reduce((n, f) => n + anchors(read(f)).length, 0);
  assert.ok(total >= 200, `只扫描到 ${total} 个 <a> 标签（下限 200）：正则或目录口径失效，L2 会恒真`);
});

test('L2 纯文本链接不得用 Tailwind 蓝作链接色（信息态/带底色的按钮型链接除外）', () => {
  const offenders = [];
  let checked = 0;
  for (const f of FILES) {
    for (const tag of anchors(read(f))) {
      checked += 1;
      // 带底色的 `<a>` 是「按钮 / 徽章」形态（roster「档案」等），蓝色属信息态，不在链接口径内
      if (/\bbg-[a-z]+-\d{2,3}\b/.test(tag)) continue;
      const m = BLUE_TEXT_RE.exec(tag)
        || /style="[^"]*color:\s*var\(--accent-/.exec(tag); // 旧角色色板 --accent-blue 等不得当链接色
      if (m) offenders.push(`${f} → ${tag.replace(/\s+/g, ' ').slice(0, 120)}`);
    }
  }
  console.log(`[link] 检查 <a> 标签 ${checked} 个，蓝链接 ${offenders.length} 个`);
  assert.deepEqual(offenders, [],
    `跳转链接必须用 text-accent（主题色深字），不得用 Tailwind 蓝：\n  ${offenders.join('\n  ')}`);
});

test('L3 .link 单一源：色取 --color-link（→ softText），无下划线、600 字重 + 淡底 hover', () => {
  const css = read('docs/src/styles.css');
  assert.match(css, /--color-link:\s*var\(--app-accent-soft-text\)/,
    'styles.css 应定义全站唯一链接色 --color-link = var(--app-accent-soft-text)');
  const rule = /\.link\s*\{([^}]*)\}/.exec(css);
  assert.ok(rule, 'styles.css 缺少 .link 组件类');
  assert.match(rule[1], /color:\s*var\(--color-link\)/, '.link 的文字色必须是 --color-link');
  // 2026-10-27 Task 9：用户裁定「全系统一个下划线都没有」——不得再用下划线作线索。
  assert.doesNotMatch(rule[1], /text-decoration:\s*underline/, '.link 不得再用文本下划线');
  assert.doesNotMatch(rule[1], /text-underline-offset/, '.link 不得再写 text-underline-offset');
  // 「无下划线也可识别」＝必须有非下划线的静态线索（600 字重）＋ hover 淡底，不得退化成纯颜色。
  assert.match(rule[1], /font-weight:\s*600/, '.link 必须有 600 字重作静态线索（下划线已清零）');
  assert.doesNotMatch(rule[1], /color-mix\(|#[0-9A-Fa-f]{6}/, '.link 不得回落到 color-mix / hex');

  const aTextAccent = /a\.text-accent\s*\{([^}]*)\}/.exec(css);
  assert.ok(aTextAccent, 'styles.css 缺少 a.text-accent 静态线索规则');
  assert.match(aTextAccent[1], /text-decoration:\s*none/, 'a.text-accent 也应显式清零下划线');

  const hoverIdx = css.indexOf('.link:hover');
  assert.ok(hoverIdx > -1, '.link 缺少 :hover 规则');
  assert.match(css.slice(hoverIdx, hoverIdx + 160), /background:\s*var\(--app-accent-tint\)/,
    '.link:hover 应用 10% 主题淡底作非颜色线索');
  // 门控：从最近的 @media (hover: hover) 到 .link:hover 之间不得出现右花括号（否则已离块）
  const mediaIdx = css.lastIndexOf('@media (hover: hover)', hoverIdx);
  assert.ok(mediaIdx > -1, '.link:hover 必须由 @media (hover: hover) 门控');
  assert.equal(css.slice(mediaIdx, hoverIdx).includes('}'), false,
    '.link:hover 位于 @media (hover: hover) 块外（触屏会粘住 hover 底）');
});

test('L4 .text-accent 仍是等价别名（存量调用点依赖）', () => {
  const css = read('docs/src/styles.css');
  const rule = /\.text-accent\s*\{([^}]*)\}/.exec(css);
  assert.ok(rule, 'styles.css 缺少 .text-accent');
  assert.match(rule[1], /color:\s*var\(--app-accent-soft-text\)/, '.text-accent 必须与 .link 同源（softText）');
});

test('L5 蓝色文字类总量只降不升（覆盖 JS 动态 className）', () => {
  // 2026-10-23 批次 507 迁移后实测：docs/src/**/*.js 内 69 处（信息态徽章 / 状态 map / 表单控件），
  //   链接已全量迁移。此数为冻结上限——新增即红；清理后可下调本常量。
  const BASELINE = 70;
  let total = 0;
  for (const f of FILES) {
    if (!f.startsWith('docs/src/') || !f.endsWith('.js')) continue;
    total += (read(f).match(/\btext-(?:blue|sky|indigo)-\d{2,3}\b/g) || []).length;
  }
  assert.ok(total <= BASELINE,
    `蓝色文字类 ${total} 处 > 基线 ${BASELINE}（链接须用 text-accent；新增必须说明为何是信息态）`);
});

test('L6 帮助链接：.help-note__link 并入 --color-link，无下划线、600 字重 + 淡底 hover', () => {
  const css = read('docs/src/styles.css');
  const m = /\.help-note__link\s*\{([^}]*)\}/.exec(css);
  assert.ok(m, 'styles.css 缺少 .help-note__link');
  assert.match(m[1], /color:\s*var\(--color-link\)/, '.help-note__link 必须用全站唯一链接色 --color-link');
  assert.doesNotMatch(m[1], /text-decoration:\s*underline/, '.help-note__link 不得再用文本下划线');
  assert.match(m[1], /font-weight:\s*600/, '.help-note__link 必须有 600 字重作静态线索');
  assert.doesNotMatch(m[1], /--functional-info|--status-info|--accent-/, '.help-note__link 不得再用信息蓝 / 角色色当链接色');
});

test('L7 速查链接：a.qn-fn-* 颜色并入 --color-link，角色色只留边框', () => {
  const help = read('docs/help.html');
  assert.match(help, /a\.qn-fn\s*\{[^}]*color:var\(--color-link\)/,
    'help.html 的 a.qn-fn 应以 --color-link 作链接色');
  // 2026-10-27 Task 9：help.html 的下划线由 Task 12 收口（no-underline-guard 的 PENDING 台账），
  //   本守卫只锁「链接色」单一源，不再要求下划线；收口后此处无需再改。
  const lightRoleRules = [...help.matchAll(/a\.qn-fn-(?:leader|org|prop|disc|member|sec)\s*\{([^}]*)\}/g)];
  assert.equal(lightRoleRules.length, 6, `速查链接角色档应为 6 条，实际 ${lightRoleRules.length}`);
  for (const [, body] of lightRoleRules) {
    assert.doesNotMatch(body, /(?:^|[;\s])color:/, `速查链接角色档不得再写文字色（应继承 --color-link）：${body}`);
    assert.match(body, /border-color:/, '速查链接角色档只保留角色色边框');
  }

  const css = read('docs/src/styles.css');
  const darkRoleRules = [...css.matchAll(/html\.theme-dark a\.qn-fn-(?:leader|org|prop|disc|member|sec)\s*\{([^}]*)\}/g)];
  assert.equal(darkRoleRules.length, 6, `暗色速查链接角色档应为 6 条，实际 ${darkRoleRules.length}`);
  for (const [, body] of darkRoleRules) {
    assert.match(body, /color:\s*var\(--color-link\)\s*!important/,
      `暗色速查链接必须并入 --color-link：${body}`);
  }
});

test('L8 help / about 锚点不得用蓝色或角色色作链接色', () => {
  const offenders = [];
  for (const rel of ['docs/help.html', 'docs/about.html']) {
    for (const tag of anchors(read(rel))) {
      if (/\btext-(?:blue|sky|indigo)-\d{2,3}\b/.test(tag)
        || /color:\s*var\(--accent-/.test(tag)
        || /color:\s*var\(--color-identity-/.test(tag)
        || /color:\s*#(?:2563eb|1d4ed8|3b82f6|0ea5e9)/i.test(tag)) {
        offenders.push(`${rel} → ${tag.replace(/\s+/g, ' ').slice(0, 140)}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `help / about 的锚点仍用蓝色或角色色当链接色：\n  ${offenders.join('\n  ')}`);
});
