// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/publicity-static-guard.test.mjs —— 「GitHub Pages 宣传形态」守卫（G1–G4）
//
//  由来：本仓以 `docs/` 直接部署到 GitHub Pages 作为「宣传形态」（无后端、只读）。宣传形态的
//    几条关键要求此前只靠人记得维护、易回退——本守卫把它们固化为常驻断言：
//    · G1 静态页 / 用户可见面**不得露出「演示 / 示例组织 / Mock」可见文案**；
//    · G2 十月两活动（act-36 党建思想学习会 / act-37 红色徒步·香山行）在册；
//    · G3 种子待办**无过去截止**（静态演示不出现「已过期」待办）；
//    · G4 `deploy.js` 按宿主环境自动判定形态（不再写死 `server`）。
//
//  ⚠ 非 e2e：纯 node 读取，不起浏览器、不依赖 :3000 ⇒ 不进修 `test/sweep-shard.mjs` 的分片池。
//  ⚠ 白名单（G1，逐条给理由）：
//    · help.html 的 `data-search="…demo…"` 是**不可见**搜索关键词（英文 `demo` 本就不在本守卫禁列，仅备录）；
//    · `<!-- … -->` HTML 注释内的命中不算「可见文案」⇒ 检查前先剔除注释；
//    · JS 侧的**注释**不算「可见文案」⇒ 检查前先剔注释。
//  ════════════════════════════════════════════════════════════════
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

// ── 抽取口径（朴素：注释先剔除，再看可见文本/代码） ────────────────────
/** 剔除 HTML 注释（`<!-- … -->`）——注释内命中不算「可见文案」 */
const stripHtmlComments = (s) => String(s).replace(/<!--[\s\S]*?-->/g, ' ');

/**
 * 剔除 JS 注释：块注释（含跨行）+ 行注释——注释行跳过。
 * CRLF 先归一，否则逐行 `//.*$` 会因行尾 `\r` 失配。
 */
function stripJsComments(src) {
  let s = String(src).replace(/\r\n?/g, '\n');
  s = s.replace(/\/\*[\s\S]*?\*\//g, ' ');
  return s.split('\n').map((line) => line.replace(/\/\/.*$/, '')).join('\n');
}

// ════════════════════════════════════════════════════════════════
//  G1 静态页 / 用户可见面：无「演示 / 示例组织 / Mock」可见文案
// ════════════════════════════════════════════════════════════════
/** 面①：三张静态 HTML（直接读文件文本） */
const PUBLIC_HTML = ['docs/index.html', 'docs/login.html', 'docs/help.html'];
/** 面②：三份**用户可见面**的 JS（注释行跳过） */
const VISIBLE_JS = [
  'docs/src/entries/pages/about-entry.js',
  'docs/src/components/shell/workspace-shell.js',
  'docs/src/data/data-adapter.js',
];
/** 静态 HTML 禁列（含只在登录页语境出现的两条） */
const BANNED_HTML = ['示例组织', '演示账号', 'Mock 校验', '进入支部（演示）', '只读演示', '党委演示只读视图'];
/** 用户可见面 JS 禁列（与 HTML 同源，去掉登录页专属的两条） */
const BANNED_JS = ['示例组织', '演示账号', '只读演示', '党委演示只读视图'];

test('G1 静态页 / 用户可见面无「演示 / 示例组织 / Mock」可见文案', () => {
  const hits = [];
  // 面①：静态 HTML——先剔 `<!-- -->` 注释（注释内命中不算可见）
  for (const rel of PUBLIC_HTML) {
    const body = stripHtmlComments(read(rel));
    assert.ok(body.length > 500, `${rel} 剔除注释后正文仅 ${body.length} 字：路径或读取失效，断言会恒真`);
    for (const term of BANNED_HTML) if (body.includes(term)) hits.push(`${rel} 命中「${term}」`);
  }
  // 面②：用户可见面 JS——先剔注释（块 + 行）再查
  for (const rel of VISIBLE_JS) {
    const code = stripJsComments(read(rel));
    assert.ok(code.length > 500, `${rel} 剔注释后代码仅 ${code.length} 字：路径或读取失效，断言会恒真`);
    for (const term of BANNED_JS) if (code.includes(term)) hits.push(`${rel}（非注释代码）命中「${term}」`);
  }
  assert.deepEqual(hits, [],
    `静态页 / 用户可见面出现「演示 / 示例组织 / Mock」可见文案（GitHub Pages 宣传形态不得露出演示措辞）：\n  ${hits.join('\n  ')}`);
});

// ════════════════════════════════════════════════════════════════
//  G2 十月两活动在册（act-36 / act-37）
// ════════════════════════════════════════════════════════════════
const ACTIVITIES = 'docs/src/data/mock/activities.js';
/** 取某活动词条所在行（本文件词条一律单行 ⇒ 行内取词条文本足够） */
const activityLineOf = (src, id) => src.split(/\r?\n/).find((l) => l.includes(`id: '${id}'`)) || '';

test('G2 十月两活动在册（act-36 党课 / act-37 红色徒步·纪念长征胜利 90 周年）', () => {
  const src = read(ACTIVITIES);
  const problems = [];
  // ① id 与日期字面量
  for (const id of ['act-36', 'act-37']) if (!src.includes(`id: '${id}'`)) problems.push(`缺活动 ${id}`);
  for (const d of ['2026-10-15', '2026-10-22']) if (!src.includes(`'${d}'`)) problems.push(`缺日期字面量 ${d}`);
  // ② 词条语义（各行逐行取，朴素做法）
  const act36 = activityLineOf(src, 'act-36');
  const act37 = activityLineOf(src, 'act-37');
  if (!act36.includes('党课')) problems.push('act-36 词条未含「党课」');
  if (!act37.includes('主题党日')) problems.push('act-37 词条未含「主题党日」');
  // 「纪念长征胜利 90 周年」允许全角空格/中文括号差异（用「长征胜利」作稳定子串）
  if (!act37.includes('长征胜利')) problems.push('act-37 词条未含「长征胜利」（红色徒步·香山行 纪念长征胜利 90 周年）');
  // 非空转：两条词条行都必须真实解析到（id 写法变了 ⇒ 上面的 includes 也不成立，仍显式挡一道）
  assert.ok(act36 && act37, '未解析到 act-36 / act-37 词条行（id 写法变了？）——断言会恒真');
  assert.deepEqual(problems, [], `十月两活动未在册（GitHub Pages 首页活动展示落空）：\n  ${problems.join('\n  ')}`);
});

// ════════════════════════════════════════════════════════════════
//  G3 种子待办无过去截止（SEED_TODOS）
// ════════════════════════════════════════════════════════════════
const TODO_SERVICE = 'docs/src/services/governance/todo.js';
/**
 * 截止日下限＝**2026-10 宣传基线**（种子待办不得早于该日，否则静态演示会显示「已过期」待办）。
 * ⚠ 若要更严，可改为与最新活动日期（`activities.js` 中最大 `date`）比对——本守卫取固定基线即可。
 */
const SEED_DEADLINE_FLOOR = '2026-10-01';

test('G3 种子待办无过去截止（SEED_TODOS 的日期型 deadline 不早于 2026-10-01）', () => {
  const src = read(TODO_SERVICE);
  const start = src.indexOf('export const SEED_TODOS = [');
  assert.ok(start >= 0, '未找到 `export const SEED_TODOS = [`（解析锚点变了）');
  const end = src.indexOf('\n];', start);
  assert.ok(end > start, '未找到 SEED_TODOS 数组的结束 `\\n];`（解析锚点变了）');
  const block = src.slice(start, end);
  // 只取 `deadline: 'YYYY-MM-DD'` 字面量（`deadline: null` / `deadline: someExpr` 自然跳过）
  const deadlines = [...block.matchAll(/deadline:\s*'(\d{4}-\d{2}-\d{2})'/g)].map((m) => m[1]);
  // 非空转：SEED_TODOS 里有一条 `deadline: null`，故用「解析到的日期字面量 ≥ 1」作下限——防正则失效恒真
  assert.ok(deadlines.length >= 1,
    `SEED_TODOS 里一条日期型 deadline 都没解析到（下限 1）：正则或锚点失效，守卫会恒真`);
  const past = deadlines.filter((d) => d < SEED_DEADLINE_FLOOR);
  console.log(`[种子待办截止] 解析到 ${deadlines.length} 条日期型 deadline：${deadlines.join(' / ')}（下限 ${SEED_DEADLINE_FLOOR}）`);
  assert.deepEqual(past, [],
    `SEED_TODOS 有早于 ${SEED_DEADLINE_FLOOR}（2026-10 宣传基线）的截止日——静态演示会显示「已过期」待办：\n  ${past.join('\n  ')}`);
});

// ════════════════════════════════════════════════════════════════
//  G4 静态托管形态自动判定（deploy.js）
// ════════════════════════════════════════════════════════════════
const DEPLOY_CONFIG = 'docs/src/config/deploy.js';

test('G4 静态托管形态自动判定（deploy.js 不再写死 server，两形态常量都在）', () => {
  const src = read(DEPLOY_CONFIG);
  assert.ok(!src.includes("export const DEPLOY_MODE = 'server';"),
    "deploy.js 仍写死 `export const DEPLOY_MODE = 'server';`（GitHub Pages 静态托管会被误判为有后端）——应按宿主环境自动判定");
  assert.ok(src.includes("'static'") && src.includes("'server'"),
    "deploy.js 缺少 'static' / 'server' 之一（两种形态都应在：浏览器宿主判 static、Node 宿主判 server）");
});
