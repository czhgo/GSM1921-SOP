// role: [工程师]+[AI]
// dead-selector-guard.test.mjs — 「零引用 CSS 类」存量回归防线（2026-09-28 死码清理批）
//
// 病灶（CSS 审计实测）：`docs/src/styles.css` 长期背着**成片零引用类**——同一批组件（`.role-card` 整族、
//   `.timeline-node` / `.tl-*`、`.card-flat`、`.btn-primary` / `.btn-secondary`、`.status-pill` / `.status-dot`、
//   真·值类 `.text-h1`…`.text-overline`、`.tint-dot`、`.theme-btn` / `.font-size-btn` …）早已无任何页面 /
//   脚本引用，却仍在 CSS 里（有的还被 `DESIGN_SYSTEM.md` 当「规范词汇」写着）⇒ 改色 / 减负改不干净，
//   且**没有守卫**，只能靠人记得 ⇒ 存量只会继续长。
//
// 本批（2026-09-28）：把审计查出的**零引用类**删除（`styles.css` 65 类 · `about.css` 3 类），并把
//   `DESIGN_SYSTEM.md` 里当「规范词汇」写的句子同步标「已废止」；`person-picker.css` 的 `inline-full`
//   虽同样零引用，但该文件**不在本批授权改动面** ⇒ 只登记进 `DEAD_SELECTOR_BASELINE`（待后续批次处置）；
//   同批立本**回归防线**：
//   Z1 新增死类：扫描到「零引用且不在台账 / 不在动态白名单」的类 ⇒ 红
//   Z2 僵尸登记：台账 / 白名单里的类若**已不在 CSS** ⇒ 红（收基线纪律：台账只减不增）
//   Z3 非空转自检：① 抽取口径合成正 / 负样本；② 分类对表（白名单每条须**仍是零引用**、理由 ≥20 字）；
//                  ③ 规模下限（防扫描面被削 / 台账被删空）；④ 抽取器「取选择器、不取声明值」负例
//   Z4 缩减进度（只报不判）：类选择器 / 零引用 / 台账 / 白名单当前计数
//
// 口径边界（**不得**自行放宽或加严）：
//   · 类选择器抽取＝**只取 `{…}` 之前的 prelude（选择器）**，不取声明值（`url(x.png)` 的 `png`、
//     `content:".b"` 的 `b` 都不得被当类）——见 Z3 负例。
//   · 引用比对＝`docs/**/*.{js,html}` 全文做**词边界命中**（`(?<![A-Za-z0-9_-])类名(?![A-Za-z0-9_-])`）。
//     用词边界而非裸子串：裸子串会把 `ab-tl-dot`（活类）误当 `tl-dot`（死类）的引用而漏判。
//   · **词边界判不了「动态拼接」**（`` `ab-edge--${e.type}` `` / `'ab-flow-line--' + f.type`）：一律进
//     `DYNAMIC_SELECTOR_WHITELIST`（`style-baseline.mjs`，人工逐条登记生成处）。守卫**不自动推断**，
//     也不因白名单而放宽其它类的判红。
//
// 收基线纪律：删零引用类后**同一批**更新 `style-baseline.mjs`（删台账条目）——进度自动前进；
//   **不得**为变绿补条目。
// 运行：node --test server/test/dead-selector-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEAD_SELECTOR_BASELINE, DYNAMIC_SELECTOR_WHITELIST,
  DEAD_SELECTOR_CSS_FILE_BASELINE, DEAD_SELECTOR_CLASS_BASELINE, DEAD_SELECTOR_CORPUS_FILE_BASELINE,
} from './style-baseline.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const DOCS = join(ROOT, 'docs');

const SKIP_DIRS = ['vendor'];
/** 引用比对面后缀 */
const CORPUS_EXTS = ['.js', '.html'];
/** 类名 token（含转义：`.text-\[11px\]`） */
const CLASS_TOKEN_RE = /\.((?:\\.|[A-Za-z0-9_-])+)/g;

/**
 * 抽取 CSS 文本里的**类选择器**（单一源口径）。
 * 做法＝逐字符扫，字符串 / 注释内不计；**只在遇到 `{` 时**把「自上一个 `{` / `}` 起累积的 prelude」当选择器
 * 解析类 token ⇒ 声明值（`url(x.png)` / `content:"…"`）永不进入解析面。
 * 返回去重后的类名数组（已去转义反斜杠）。
 */
export function classesOf(css) {
  const out = new Set();
  let buf = '';
  let inComment = false;
  let inStr = null;
  for (let i = 0; i < css.length; i++) {
    const ch = css[i];
    const nx = css[i + 1];
    if (inComment) {
      if (ch === '*' && nx === '/') { inComment = false; i++; }
      continue;
    }
    if (inStr) {
      if (ch === '\\') { i++; continue; }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '/' && nx === '*') { inComment = true; i++; continue; }
    if (ch === '"' || ch === "'") { inStr = ch; continue; }
    if (ch === '{' || ch === '}') {
      if (ch === '{') {
        for (const m of buf.matchAll(new RegExp(CLASS_TOKEN_RE.source, 'g'))) {
          out.add(m[1].replace(/\\/g, ''));
        }
      }
      buf = '';
      continue;
    }
    buf += ch;
  }
  return [...out];
}

/** 引用命中判据（单一源）：词边界；导出便于非空转自检 */
export function isReferenced(name, text) {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![A-Za-z0-9_-])${esc}(?![A-Za-z0-9_-])`).test(text);
}

/** 判红核心（纯函数，便于合成样本自检）：返回「零引用且不在台账 / 白名单」的类名 */
export function findNewDeadClasses(classes, corpusText, baselineNames, whitelistNames) {
  const allowed = new Set([...(baselineNames || []), ...(whitelistNames || [])]);
  return classes.filter((c) => !allowed.has(c) && !isReferenced(c, corpusText));
}

/** 递归收集（相对仓库根的 posix 路径） */
function walk(dir, exts) {
  const out = [];
  const rec = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name === '.git' || SKIP_DIRS.includes(e.name)) continue;
      const p = join(d, e.name);
      if (e.isDirectory()) rec(p);
      else if (exts.some((x) => e.name.endsWith(x))) out.push(relative(ROOT, p).replace(/\\/g, '/'));
    }
  };
  rec(dir);
  return out.sort();
}

/** CSS 源清单：`docs` 下全部 `.css`（排除 vendor）＋ `docs` 下 `.html` 的页内 `<style>` */
export function cssSources() {
  const out = [];
  for (const f of walk(DOCS, ['.css'])) {
    out.push({ file: f, css: readFileSync(join(ROOT, f), 'utf8') });
  }
  for (const f of walk(DOCS, ['.html'])) {
    const text = readFileSync(join(ROOT, f), 'utf8');
    let i = 0;
    for (const m of text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
      out.push({ file: `${f}#style${i++}`, css: m[1] });
    }
  }
  return out;
}

/** 引用比对面：`docs` 下全部 `.js` 与 `.html` 的全量文本（拼接为单一字符串，便于逐类比对） */
function corpus() {
  const files = walk(DOCS, CORPUS_EXTS);
  const text = files.map((f) => readFileSync(join(ROOT, f), 'utf8')).join('\n');
  return { files, text };
}

/** 全站类选择器 → 定义处（去重） */
function allClasses() {
  const map = new Map();
  for (const s of cssSources()) {
    for (const c of classesOf(s.css)) {
      if (!map.has(c)) map.set(c, []);
      map.get(c).push(s.file);
    }
  }
  return map;
}

const baselineNames = () => DEAD_SELECTOR_BASELINE.map((e) => (typeof e === 'string' ? e : e.name));
const whitelistNames = () => DYNAMIC_SELECTOR_WHITELIST.map((e) => e.name);

// ── Z1 新增死类 ──────────────────────────────────────────────────────
test('Z1 零引用类回归：现状之外出现「零引用且不在台账 / 动态白名单」的类 ⇒ 判红', () => {
  const { text } = corpus();
  const offenders = findNewDeadClasses([...allClasses().keys()], text, baselineNames(), whitelistNames());
  assert.deepEqual(offenders, [],
    `出现新的零引用 CSS 类（无任何 docs/**/*.{js,html} 引用；死码应删，动态拼接者应登记进 DYNAMIC_SELECTOR_WHITELIST）：\n  ${offenders.join('\n  ')}`);
});

// ── Z2 僵尸登记 ──────────────────────────────────────────────────────
test('Z2 僵尸登记：台账 / 白名单里的类若已不存在于 CSS ⇒ 判红（台账只减不增）', () => {
  const present = allClasses();
  const goneBase = baselineNames().filter((n) => !present.has(n));
  const goneWhite = whitelistNames().filter((n) => !present.has(n));
  assert.deepEqual([...goneBase, ...goneWhite], [],
    `台账 / 白名单条目指向「已不存在的类」（应从 style-baseline.mjs 删该条 · 收基线）：\n  ${[...goneBase, ...goneWhite].join('\n  ')}`);
});

// ── Z3 非空转自检 ────────────────────────────────────────────────────
test('Z3 非空转：抽取口径正 / 负例 ＋ 分类对表 ＋ 规模下限 ＋ 台账 / 白名单自洽', () => {
  // ① 抽取口径正例：多选择器 / 伪类 / 组合 / 媒体段 prelude / 转义类名
  assert.deepEqual(classesOf('.a, .b:hover { color: red } .c .d { x: 1 }').sort(), ['a', 'b', 'c', 'd'],
    '抽取口径失效：选择器里的类未被全部抽出（守卫会恒真）');
  assert.deepEqual(classesOf('@media (max-width: 768px) { .e { x: 1 } }'), ['e'],
    '抽取口径失效：@media 段内的类未抽出');
  assert.deepEqual(classesOf('.text-\\[11px\\] { font-size: 11px }'), ['text-[11px]'],
    '抽取口径失效：转义类名（.text-\\[11px\\]）未抽出');
  // ① 负例：声明值不得被当类（`url(x.png)` 的 png / `content:".b"` 的 b）；注释内类不得命中
  assert.deepEqual(classesOf('.a { background: url(x.png); content: ".b"; }'), ['a'],
    '抽取口径过宽：声明值（url 内 / 字符串内）被当成类选择器');
  assert.deepEqual(classesOf('/* .ghost { } */ .real { x: 1 }'), ['real'],
    '抽取口径过宽：注释里的类被抽出');
  // ① 引用判据正 / 负例：词边界（`ab-tl-dot` 不得当成 `tl-dot` 的引用）
  assert.equal(isReferenced('tl-dot', '<span class="tl-dot">'), true, '引用判据失效：正常的类引用未命中');
  assert.equal(isReferenced('tl-dot', '<span class="ab-tl-dot">'), false,
    '引用判据过宽：`ab-tl-dot` 被当成 `tl-dot` 的引用（应漏判死码）');
  // ② 判红核心：合成样本——新增死类判红、白名单内不判红、有引用不判红
  assert.deepEqual(findNewDeadClasses(['dead-1'], 'no refs here', [], []), ['dead-1'],
    '判红核心失效：零引用类未被判红');
  assert.deepEqual(findNewDeadClasses(['dead-1'], 'no refs here', ['dead-1'], []), [],
    '判红核心过宽：台账内的类被误判红');
  assert.deepEqual(findNewDeadClasses(['dyn-1'], 'no refs here', [], ['dyn-1']), [],
    '判红核心过宽：动态白名单内的类被误判红');
  assert.deepEqual(findNewDeadClasses(['used-1'], 'x used-1 y', [], []), [],
    '判红核心失效：有引用的类被误判红');
  // ③ 规模下限（防扫描面被削 / 抽取口径失效）
  const sources = cssSources();
  const present = allClasses();
  const { files } = corpus();
  assert.ok(sources.length >= DEAD_SELECTOR_CSS_FILE_BASELINE,
    `CSS 源数过少（实测 ${sources.length}，下限 ${DEAD_SELECTOR_CSS_FILE_BASELINE}）——Z1 可能因扫描面被削而恒绿`);
  assert.ok(present.size >= DEAD_SELECTOR_CLASS_BASELINE,
    `类选择器过少（实测 ${present.size}，下限 ${DEAD_SELECTOR_CLASS_BASELINE}）——抽取口径可能失效`);
  assert.ok(files.length >= DEAD_SELECTOR_CORPUS_FILE_BASELINE,
    `引用比对面文件过少（实测 ${files.length}，下限 ${DEAD_SELECTOR_CORPUS_FILE_BASELINE}）`);
  // ③ 分类对表（白名单条目须「仍是零引用」＋「理由 ≥20 字」；否则是误登记 / 空转）
  const { text } = corpus();
  for (const e of DYNAMIC_SELECTOR_WHITELIST) {
    assert.ok(e.name && typeof e.name === 'string', `白名单条目缺 name：${JSON.stringify(e)}`);
    assert.ok(e.reason && e.reason.length >= 20, `白名单条目缺理由（≥20 字）：${e.name}`);
    assert.equal(isReferenced(e.name, text), false,
      `白名单条目 ${e.name} 已能字面命中 ⇒ 不再是「动态拼接」，应删该条（僵尸登记）`);
  }
  // ③ 台账条目自洽（结构；本批台账为空亦须满足）
  for (const e of DEAD_SELECTOR_BASELINE) {
    const name = typeof e === 'string' ? e : e.name;
    assert.ok(name, `台账条目缺 name：${JSON.stringify(e)}`);
  }
  assert.equal(new Set(baselineNames()).size, baselineNames().length, '台账有名重复条目');
  assert.equal(new Set(whitelistNames()).size, whitelistNames().length, '白名单有名重复条目');
});

// ── Z4 缩减进度（只报不判） ──────────────────────────────────────────
test('Z4 缩减进度：类选择器 / 零引用 / 台账 / 白名单当前计数', () => {
  const present = allClasses();
  const { text } = corpus();
  const zero = [...present.keys()].filter((c) => !isReferenced(c, text));
  console.log(`[零引用 CSS 类] 类选择器 ${present.size} 个 · 零引用 ${zero.length} 个（台账 ${baselineNames().length} ＋ 动态白名单 ${whitelistNames().length}）`);
  console.log(`[台账（允许存在的零引用类）] ${baselineNames().join(' · ') || '（空）'}`);
  console.log(`[动态白名单] ${whitelistNames().join(' · ') || '（空）'}`);
  console.log(`[不判红的零引用] ${zero.filter((c) => whitelistNames().includes(c)).join(' · ') || '（无）'}`);
  console.log('[收基线提示] 删零引用类后同批删 style-baseline.mjs 的 DEAD_SELECTOR_BASELINE 条目；不得为变绿补条目。');
});
