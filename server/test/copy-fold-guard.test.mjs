// role: [工程师]+[AI]
// copy-fold-guard.test.mjs — 「折叠区口径是否有 help 同义段落」（DESIGN_SYSTEM §4.18 C8）的**登记 + 只报不判**守卫
// （2026-09-25 文案存量清理批）
//
// 判据原文（§4.18.3 C8，逐字照录）：
//   「**口径说明允许就地折叠，但不允许只在界面里存在一份**：折叠区内容必须与 help 的对应小节口径一致」；
//   判据原文：「折叠文案若属**制度口径**，须在 `help.html` 有同义段落（改口径时两处同改；单处出现即视为孤本）」
//
// ⚠ **本守卫不判红**——如实说明为什么「机检不了」（这一条是上一批已登记、本批实读后**确认仍成立**的结论）：
//   C8 的判据核心是「**同义**」。同义＝语义等价，**不是字符串等价**——「允许解散非空组」与「非空组也能解散」
//   同义但零共享长串；反过来，两段共享长串也未必同义（前端匿名 / 后端实名）。任何用「字符重合 / 编辑距离 /
//   关键词共现」搭出来的近似，都只能判**形近**，判不了**义同**；把它写成判红条件＝把「同义」偷换成「同串」，
//   正是本仓反复警惕的「守卫越界假装覆盖」（见 doc-line-ref R4 的同类边界说明）。故 C8 **落纪律 + 人检清单**：
//     · 机器能做的只有「**登记**」：列出全部折叠区，并标出「其文本在 help 里已有 ≥N8 字重合」＝**疑似已定点**；
//     · 「疑似未定点」的那些进**人检清单**（下方打印），由人判「它是不是制度口径、help 有没有同义段落」。
//
// N8 取值（**只用于「疑似」提示，不作判红**）：取 C7 的 20 字——理由：折叠区若与 help 有 ≥20 字重合，必是
//   「同一句在两处」，C8 要求的两处同改至少已满足「有对应段落」的形；取更小会大量假阳性，取更大则漏。
//   **它不是 C8 的阈值**（C8 原文没给数字，只给了「同义」）——故只作提示，不作判据。
//
// 非空转：① 折叠区抽取正 / 负例 ② `docs/src` 里折叠区数 ≥ 基线下限（防「一个折叠区都抽不到 ⇒ 报告恒空」）
//        ③ help 里定点卡片（`card-copy-*`）数 ≥ 基线下限（防登记表被删空）
// 运行：node --test server/test/copy-fold-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SRC = join(ROOT, 'docs', 'src');
const HELP = join(ROOT, 'docs', 'help.html');

/** 「疑似已定点」的重合阈值（只作提示，见文件头；**不是 C8 的判据阈值**） */
const N8 = 20;

const SKIP_DIRS = ['mock', 'vendor', 'node_modules'];

// ── 抽取（与 copy-master-guard 同族：剥注释 → 剥标签 → 解实体 → 去空白） ──
function stripComments(src) {
  let s = String(src).replace(/\r\n?/g, '\n');
  s = s.replace(/\/\*[\s\S]*?\*\//g, ' ');
  s = s.replace(/<!--[\s\S]*?-->/g, ' ');
  return s.split('\n').map((line) => line.replace(/\/\/.*$/, '')).join('\n');
}
function decodeEntities(s) {
  return String(s).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
}
const flatten = (html) => decodeEntities(String(html).replace(/<[^>]*>/g, ' ')).replace(/[\s\u3000]+/g, '');

/** 抽出某源码里全部折叠区（`<details>` 的内容，去掉 `<summary>` 标题）；返回去空白后的正文数组 */
export function foldBodiesOf(src) {
  const s = stripComments(src).replace(/<script\b[\s\S]*?<\/script>/gi, ' ');
  const out = [];
  for (const m of s.matchAll(/<details\b[^>]*>([\s\S]*?)<\/details>/gi)) {
    const body = m[1].replace(/<summary\b[\s\S]*?<\/summary>/gi, ' ');
    const t = flatten(body);
    if (t) out.push(t);
  }
  return out;
}

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.includes(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out.sort();
}

/** 母本（help 正文）的全部 N8 字窗 */
function gramSet(text, n = N8) {
  const s = new Set();
  for (let i = 0; i + n <= text.length; i++) s.add(text.slice(i, i + n));
  return s;
}

const HELP_TEXT = flatten(readFileSync(HELP, 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' '));
const HELP_GRAMS = gramSet(HELP_TEXT);

/** 该折叠区正文里是否存在 N8 字窗落在 help 里（＝疑似已有对应段落） */
function overlapsHelp(body) {
  for (let i = 0; i + N8 <= body.length; i++) if (HELP_GRAMS.has(body.slice(i, i + N8))) return true;
  return false;
}

const FOLDS = walk(SRC).flatMap((abs) => foldBodiesOf(readFileSync(abs, 'utf8'))
  .map((body) => ({ file: relative(ROOT, abs).replace(/\\/g, '/'), body })));

/** 折叠区数下限（非空转：低于此值说明抽取口径失效 / 报告恒空） */
const FOLD_FLOOR = 8;
/** help 定点卡片数下限（非空转：登记表不得被删空） */
const CARD_FLOOR = 7;

test('F1 非空转：折叠区抽取口径可用 + 折叠区 / 定点卡片规模达标', () => {
  // ① 正例：details 正文被抽出；summary 标题不计入
  assert.deepEqual(foldBodiesOf('<details><summary>口径 ▾</summary><p>应到＝正式＋预备</p></details>'),
    ['应到＝正式＋预备'], '抽取口径失效：折叠区正文没被抽出');
  // ① 负例：不在 details 里的文本不算折叠区
  assert.deepEqual(foldBodiesOf('<p>普通说明</p>'), [], '抽取口径过宽：非折叠文本被当成折叠区');
  // ② 规模下限
  assert.ok(FOLDS.length >= FOLD_FLOOR, `docs/src 里只抽到 ${FOLDS.length} 个折叠区（下限 ${FOLD_FLOOR}）：抽取口径失效 / 报告恒空`);
  const cards = [...readFileSync(HELP, 'utf8').matchAll(/id="(card-copy-[\w-]+)"/g)].map((m) => m[1]);
  assert.ok(cards.length >= CARD_FLOOR, `help 里定点卡片只剩 ${cards.length} 张（下限 ${CARD_FLOOR}）：C8 的「两处同改」少了一处`);
  assert.ok(HELP_TEXT.length > 10000, `help 正文只取到 ${HELP_TEXT.length} 字：母本提取疑似失效`);
});

test(`F2 折叠区口径登记（只报不判 / C8 机检不了「同义」）：${FOLDS.length} 个折叠区 vs help 定点 ${N8} 字疑似重合`, () => {
  const hit = FOLDS.filter((f) => overlapsHelp(f.body));
  const miss = FOLDS.filter((f) => !overlapsHelp(f.body));
  console.log(`[折叠区口径登记] 共 ${FOLDS.length} 个折叠区：与 help 有 ≥${N8} 字重合（**疑似已定点**）${hit.length} 个 ·`
    + ` 疑似未定点 ${miss.length} 个（**人检清单**：判它是不是制度口径、help 有无同义段落）`);
  for (const f of hit) console.log(`  · [疑似已定点] ${f.file} → 「${f.body.slice(0, 48)}…」`);
  for (const f of miss) console.log(`  · [人检] ${f.file} → 「${f.body.slice(0, 48)}…」（${f.body.length} 字）`);
  console.log('[C8 结论] 「同义」机检不了（见文件头）：本守卫只登记 + 出人检清单，不判红；'
    + '界面侧新增制度口径折叠区时，请同批在 help `#sec-copy-anchors` 加同义段落（或把它整段搬去 help 定点）。');
  // 只报不判：不设 assert.deepEqual(problems, [])。
});
