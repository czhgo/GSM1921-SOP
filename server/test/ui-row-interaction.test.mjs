// role: [工程师]+[AI]
// ui-row-interaction.test.mjs — 行型交互守卫（2026-10-18 立 · Task 3 / SubTask 3.5）
//
// 来源：Spec「工作台视觉语言」§10.4 五类行型矩阵；判例＝「纯展示行加 hover，像能点却点不动」。
// 病灶：列表行一律挂 `cursor: pointer` + hover 变底，用户无法从外观判断哪一行真能点；
//   可点行又常是 `div` + click，键盘不可达。
//
// 判据：
//   R1 list-row.js 支持 rowType / data-row-type，且有 action / display 分支；
//   R2 styles.css：display / action 行显式 `cursor: default`（或 pointer-events:none），hover 不变底；
//   R3 可交互行有 `:focus-visible`；
//   R4 全站 `transition: all` 存量只降不升（2026-10-18 实测 7 处；新代码只允许 transform / opacity）；
//   R5 非空转自检：正则口径在合成样本上命中 / 不误命中。
//
// 运行：node --test server/test/ui-row-interaction.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, 'docs', 'src');
const DOCS = join(ROOT, 'docs');
const LIST_ROW = join(SRC, 'components', 'ui', 'list-row.js');
const CSS = join(SRC, 'styles.css');

/** 全站 `transition: all` 存量基线（2026-10-18 实测 7 处 / 4 文件；只降不升） */
const TRANSITION_ALL_BASELINE = 7;
const TRANSITION_ALL_RE = /transition\s*:\s*all\b/g;

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'vendor') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(js|mjs|css|html)$/.test(e.name)) out.push(p);
  }
  return out;
}

test('R1 list-row.js：rowType / data-row-type / action & display 分支齐备', () => {
  const src = readFileSync(LIST_ROW, 'utf8');
  assert.ok(src.includes('rowType'), 'list-row.js 缺 rowType 参数');
  assert.ok(src.includes('data-row-type'), 'list-row.js 未输出 data-row-type');
  assert.ok(src.includes("'nav'") && src.includes("'select'") && src.includes("'master'"),
    'list-row.js 行型白名单缺 nav / select / master');
  assert.match(src, /type === 'action' \|\| type === 'display'/, 'list-row.js 缺 action / display 的不可点分支');
  assert.ok(src.includes('data-interactive="true"'), '可点行缺 data-interactive="true"');
});

test('R2 styles.css：展示行 / 动作行无 pointer，且 hover 不变底', () => {
  const css = readFileSync(CSS, 'utf8');
  assert.match(css, /\.list-row\s*\{[^}]*cursor:\s*default/, '.list-row 默认应为 cursor: default');
  for (const type of ['display', 'action']) {
    const block = new RegExp(`\\.list-row\\[data-row-type="${type}"\\]\\s*\\{([^}]*)\\}`).exec(css);
    assert.ok(block, `styles.css 缺 .list-row[data-row-type="${type}"] 规则`);
    assert.match(block[1], /cursor:\s*default|pointer-events:\s*none/,
      `[data-row-type="${type}"] 必须是 cursor: default 或 pointer-events: none`);
    const hover = new RegExp(`\\.list-row\\[data-row-type="${type}"\\]:hover\\s*\\{([^}]*)\\}`).exec(css);
    assert.ok(hover, `styles.css 缺 [data-row-type="${type}"]:hover 兜底规则`);
    assert.match(hover[1], /background:\s*transparent/, `[data-row-type="${type}"] 不得有 hover 变底`);
  }
});

test('R3 可交互行有 :focus-visible', () => {
  const css = readFileSync(CSS, 'utf8');
  assert.match(css, /\.list-row\[data-interactive="true"\]:focus-visible\s*\{/,
    '可交互行缺 :focus-visible（键盘不可见焦点）');
  assert.match(css, /\.list-row\[data-interactive="true"\]\s*\{[^}]*cursor:\s*pointer/,
    '可交互行缺 cursor: pointer');
});

test(`R4 全站 transition: all 存量只降不升（基线 ${TRANSITION_ALL_BASELINE}）`, () => {
  const offenders = [];
  let total = 0;
  for (const f of walk(DOCS)) {
    const n = (readFileSync(f, 'utf8').match(TRANSITION_ALL_RE) || []).length;
    if (!n) continue;
    total += n;
    offenders.push(`${relative(ROOT, f).replace(/\\/g, '/')}=${n}`);
  }
  assert.ok(total <= TRANSITION_ALL_BASELINE,
    `全站 transition: all 由 ${TRANSITION_ALL_BASELINE} 升到 ${total} 处（${offenders.join(' · ')}）⇒ `
    + '新动效只允许 transition: transform / opacity（DESIGN_SYSTEM §5.1 / §4.23）');
});

test('R5 非空转：transition 口径命中 all、不误命中具体属性', () => {
  const count = (s) => (s.match(TRANSITION_ALL_RE) || []).length;
  assert.equal(count('transition: all 150ms ease-out;'), 1, '口径失效：transition: all 未命中');
  assert.equal(count('transition: background-color 150ms;'), 0, '口径过宽：具体属性被误判');
  assert.equal(count('transition: all;'), 1, '口径失效：无时长的 transition: all 未命中');
});
