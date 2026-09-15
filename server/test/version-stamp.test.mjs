// server/test/version-stamp.test.mjs — 版本号推导与版本戳纪律（2026-09-14 批次 28，Q-23-8 闭环）
// 两层法（DATA_CONSISTENCY_CHECKLIST §0）：
//   结构层 S1–S3：静态扫描防回潮
//     S1 bump-version 的默认版本号必须由既有戳推导（禁写死「当天日期 + a」）
//     S2 脚本必须含「版本号只允许前进」断言（防同日回退静默通过）
//     S3 全站活动版本戳单一源（活戳取值集合规模为 1）——注释里的历史注记不算缓存键
//     S4 server-test 段补戳判据走 version-next 单一源（禁自带第二套正则）
//     S5 server-test 段收尾自检与补戳同判据（否则冻结戳被判残留 / 数据被误报）
//   数据层 D1–D6：版本号推导纯函数口径（同日续号 / 跨日归零 / 空集 / 非法形态 / 字母用尽 / 只允许前进）
//   数据层 D7–D9：server-test 段补戳判据的 fixture（缓存键语境改写 / 非语境逐字不变 / 自检同源）
//
// 背景（Q-23-8）：bump-version.mjs 原无参默认「当天日期 + a」，同日第二次发版会把全站戳往回写
//   （实测 20260914b → 20260914a），而收尾自检只比对「是否等于本次 VERSION」故仍报「0 处残留 ✅」。
//
// 背景（Q-23-33，批次 46）：server-test 段原判据 `/(\/src\/[^'"?]*\.js)(\?[^'"]*)?(['"])/g`
//   不区分「import 规格符」与「数据字符串」——凡出现 `/src/….js` 且引号收尾者一律补戳，
//   批 44 即把 `form-loop-registry.mjs` 的 113 条台账 file 写成数据（守卫 S4 随即报「文件不存在」）。
//   本批把判据收紧为「缓存键语境」（import/from/副作用 import 行 + 独立版本字面量），
//   并对 Node 侧读取语境（`new URL(...?v=)` / `grab('...?v=')` / 路径字符串列表）与注释行
//   一律**逐字不变**（这类 `?v=` 对 fs 读取无意义，属旧判据误留）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nextVersionFor, isForward, STAMP_RE, isCommentLine, codePartOf, stampTestFileContent, cacheKeyStamps } from '../../docs/scripts/version-next.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOCS = join(ROOT, 'docs');
const SRC_DIR = join(DOCS, 'src');
const TEST_DIR = join(ROOT, 'server', 'test');
const BUMP = join(DOCS, 'scripts', 'bump-version.mjs');

const read = (f) => readFileSync(f, 'utf8');
const rel = (f) => f.slice(ROOT.length + 1).replace(/\\/g, '/');

function walk(dir, exts, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === 'scripts' || name === 'assets' || name === 'data' || name === 'node_modules') continue;
      walk(full, exts, out);
      continue;
    }
    if (exts.some((e) => name.endsWith(e))) out.push(full);
  }
  return out;
}

// ── 结构层 ──────────────────────────────────────────────────────────

test('S1 bump-version 默认版本号由既有戳推导（禁写死「当天日期 + a」）', () => {
  const src = read(BUMP);
  assert.match(src, /from '\.\/version-next\.mjs'/, 'bump-version 须 import version-next 单一源');
  assert.match(src, /nextVersionFor\(/, 'bump-version 默认版本号须经 nextVersionFor 推导');
  assert.ok(!/DEFAULT_VERSION\s*=/.test(src),
    '不得再保留「DEFAULT_VERSION = 当天日期 + a」写法——同日第二次发版会回退版本戳');
});

test('S2 bump-version 含「版本号只允许前进」断言', () => {
  const src = read(BUMP);
  assert.match(src, /isForward\(/, 'bump-version 须断言本次版本号不小于仓库现有最大戳');
  assert.match(src, /PREV_MAX/, 'bump-version 须先算出仓库现有最大戳再比对');
});

/** 全站非注释行里出现过的版本戳 → 首个出现位置（S3 / S6 共用） */
function scanActiveStamps() {
  const files = [
    ...walk(SRC_DIR, ['.js', '.css']),
    ...walk(DOCS, ['.html']),
    ...walk(TEST_DIR, ['.mjs', '.test.js']),
  ];
  const seen = new Map(); // 戳 → 首个出现位置
  for (const f of files) {
    read(f).split(/\r?\n/).forEach((line, i) => {
      // 注释排除规则与 bump-version 的 stamper / 自检同源（整行注释 + 行尾追注均不算缓存键）
      if (isCommentLine(line)) return;
      for (const m of codePartOf(line).matchAll(/\?v=(\d{8}[a-z])/g)) {
        if (!seen.has(m[1])) seen.set(m[1], `${rel(f)}:${i + 1}`);
      }
    });
  }
  return seen;
}

test('S3 全站活动版本戳单一源（取值集合规模为 1）', () => {
  const seen = scanActiveStamps();
  assert.ok(seen.size > 0, '未扫描到任何 ?v= 版本戳（扫描根路径可能失效）');
  assert.equal(seen.size, 1,
    `全站只允许一个活动版本戳（实测 ${seen.size} 个：${[...seen.entries()].map(([v, w]) => `${v} @ ${w}`).join(' / ')}）——` +
    '陈旧戳会让浏览器按 URL 分裂出第二个模块实例（注册表/共享状态读空的根因）');
});

test('S4 server-test 段补戳判据走 version-next 单一源（禁自带第二套正则）', () => {
  const src = read(BUMP);
  assert.match(src, /stampTestFileContent\(/, 'server-test 段补戳须调用 version-next 的共享实现');
  assert.ok(!/\(\/src\/\[\^'"\?\]\*\\\.js\)/.test(src),
    '不得保留旧判据「只要出现 /src/*.js 且引号收尾就补戳」——它会把数据字符串当 import 规格符改写（Q-23-33）');
});

test('S5 server-test 段收尾自检与补戳同判据', () => {
  const src = read(BUMP);
  assert.match(src, /\bcacheKeyStamps\b/, 'server-test 段陈旧戳自检须与补戳共用同一判据函数');
});

test('S6 server-test 段补戳幂等：以活动戳干跑零改写', () => {
  const active = [...scanActiveStamps().keys()];
  assert.equal(active.length, 1, `活动戳应唯一（实测 ${active.join(', ')}）——见 S3`);
  const dirtied = walk(TEST_DIR, ['.mjs', '.test.js']).filter(
    (f) => stampTestFileContent(read(f), active[0]) !== read(f)
  ).map(rel);
  assert.deepEqual(dirtied, [],
    `以下 server/test 文件「干跑即被改写」——陈旧戳，或文件里含**形似 import 行的数据/fixture**被误当 import 规格符` +
    `（Q-23-33 同一形态，批 46 实测：version-stamp 自己的 fixture 即踩过）：${dirtied.join(', ')}`);
});

// ── 数据层（版本号推导纯函数）───────────────────────────────────────

test('D1 同日续号：取该日最大字母 +1', () => {
  assert.equal(nextVersionFor('20260914', ['20260914b', '20260914a']), '20260914c');
  assert.equal(nextVersionFor('20260914', ['20260914a']), '20260914b');
});

test('D2 跨日归零：他日戳不影响当日', () => {
  assert.equal(nextVersionFor('20260915', ['20260914c', '20260913z']), '20260915a');
});

test('D3 空集合：首次发版为 a', () => {
  assert.equal(nextVersionFor('20260914', []), '20260914a');
  assert.equal(nextVersionFor('20260914', undefined), '20260914a');
});

test('D4 非法形态忽略：只认「8 位日期 + 1 位小写字母」', () => {
  assert.equal(nextVersionFor('20260914', ['20260914b', '2026x1', 'abc', '', null]), '20260914c');
  assert.ok(STAMP_RE.test('20260914a'));
  assert.ok(!STAMP_RE.test('20260914A'), '大写字母不算合法戳（扫描正则同源）');
  assert.ok(!STAMP_RE.test('2026091a'));
});

test('D5 同日字母用尽：显式报错而非静默生成非法戳', () => {
  assert.throws(() => nextVersionFor('20260914', ['20260914z']), /字母已用尽/);
});

test('D6 只允许前进：新版本号不得小于现有最大戳', () => {
  assert.equal(isForward('20260914c', '20260914b'), true);
  assert.equal(isForward('20260914b', '20260914b'), true);
  assert.equal(isForward('20260914a', '20260914b'), false, '同日回退必须被判为不可前进');
  assert.equal(isForward('20260914a', ''), true, '首次发版（无既有戳）视为前进');
});

// ── 数据层：server-test 段补戳判据 fixture（批 46 ①，Q-23-33）────────────
// 判据口径：**只有缓存键语境**才随版本推进改写——① import/from/副作用 import 行；
//   ② 独立版本字面量（`const V = '?v=…'`，供页面 import 拼 URL 用）。
// 其余一律逐字不变：整行注释、Node 侧读取语境（`new URL(…?v=)` / `grab(…?v=)` / 路径字符串列表）、
//   台账形态（`SRC + '相对路径'`）——这些 `?v=` 对 fs 读取无意义，是旧判据的误留。

const TICK = String.fromCharCode(96);
const NEW_V = '20260915z';

// fixture 用占位符组装，**不在本文件留下完整版本戳字面量**，也让 fixture 的「源文本」对补戳脚本不可见
//（否则守卫 S3「全站活动版本戳单一源」会把假戳读成第二个活动戳；且 bump 会给 fixture 里的无戳 import 行追加戳，
// 把 fixture 的输入悄悄改坏——这正是 Q-23-33「数据被当成 import 规格符」的同一形态）。
//   `{OLD}`＝补戳前的旧戳；`{NEW}`＝补戳后应变成的新戳；`{NONE}`＝空串（表达「此处本来无戳」）
const OLD_V = '20260101a';
const FIXTURE_TEMPLATE = [
  '// 头注：对 docs/src 的相对 import 必须带 {OLD}（整行注释 → 逐字不变）',
  "import { a } from '../../docs/src/core/domain.js{OLD}';",
  "import { b } from '../../docs/src/core/state.js{NONE}';",
  "import '/src/core/icons.js{NONE}';",
  "  const c = await import('/src/core/data-adapter.js{OLD}');",
  '  const d = await import(' + TICK + '/src/${rel}{OLD}' + TICK + ');',
  "const V = '{OLD}';",
  "  new URL('../../docs/src/core/registry.js{OLD}', import.meta.url),",
  "const g = grab('docs/src/core/function-catalog.js{OLD}', 'FUNCTION_CATALOG');",
  "const list = ['docs/src/core/constants.js{OLD}'];",
  "  { file: SRC + 'entries/tabs/secretary/todo-tab.js', line: 767, field: '退回原因' },",
];
// 逐行期望：注释行与 Node 读取/台账行保持 `{OLD}`（逐字不变），其余取 `{NEW}`
const EXPECTED_TEMPLATE = [
  '// 头注：对 docs/src 的相对 import 必须带 {OLD}（整行注释 → 逐字不变）',
  "import { a } from '../../docs/src/core/domain.js{NEW}';",
  "import { b } from '../../docs/src/core/state.js{NEW}';",
  "import '/src/core/icons.js{NEW}';",
  "  const c = await import('/src/core/data-adapter.js{NEW}');",
  '  const d = await import(' + TICK + '/src/${rel}{NEW}' + TICK + ');',
  "const V = '{NEW}';",
  "  new URL('../../docs/src/core/registry.js{OLD}', import.meta.url),",
  "const g = grab('docs/src/core/function-catalog.js{OLD}', 'FUNCTION_CATALOG');",
  "const list = ['docs/src/core/constants.js{OLD}'];",
  "  { file: SRC + 'entries/tabs/secretary/todo-tab.js', line: 767, field: '退回原因' },",
];
const fill = (lines, map) => lines.map((l) => l.replace(/\{(OLD|NEW|NONE)\}/g, (m, k) => map[k]));
const STAMP_FIXTURE = fill(FIXTURE_TEMPLATE, { OLD: '?v=' + OLD_V, NEW: '?v=' + OLD_V, NONE: '' });
const STAMP_EXPECTED = fill(EXPECTED_TEMPLATE, { OLD: '?v=' + OLD_V, NEW: '?v=' + NEW_V, NONE: '' });

test('D7 补戳只改缓存键语境：import/from/副作用 import 追加或替换 + 版本字面量替换', () => {
  const got = stampTestFileContent(STAMP_FIXTURE.join('\n'), NEW_V).split('\n');
  assert.equal(got.length, STAMP_EXPECTED.length);
  [1, 2, 3, 4, 5, 6].forEach((i) => {
    assert.equal(got[i], STAMP_EXPECTED[i], `第 ${i + 1} 行应改写为：${STAMP_EXPECTED[i]}`);
  });
});

test('D8 非 import 语境逐字不变（注释 / Node 读取 / 台账形态）', () => {
  const got = stampTestFileContent(STAMP_FIXTURE.join('\n'), NEW_V).split('\n');
  [0, 7, 8, 9, 10].forEach((i) => {
    assert.equal(got[i], STAMP_FIXTURE[i],
      `第 ${i + 1} 行非缓存键语境，必须逐字不变（旧判据会把它当 import 规格符改写——Q-23-33 根因）`);
  });
  // 台账形态（`SRC + '相对路径'`）从构造上不含 `/src/….js` 连写，任何判据都不得给它加戳
  assert.ok(!/todo-tab\.js\?v=/.test(got.join('\n')), '台账数据串不得被补戳');
});

test('D9 自检判据同源：只取缓存键语境下的戳（非语境与注释不计）', () => {
  const f = [
    "import { a } from './x.js" + '?v=' + '20260101a' + "';",
    "  new URL('../../docs/src/core/registry.js" + '?v=' + '20261231z' + "', import.meta.url),",
    '// 注释里的历史注记 ' + '?v=' + '20261231z',
    "const V = '" + '?v=' + '20260101b' + "';",
  ].join('\n');
  assert.deepEqual(cacheKeyStamps(f).sort(), ['20260101a', '20260101b'],
    '自检只应看到缓存键语境下的戳；Node 读取语境与注释里的戳不算缓存键');
});

