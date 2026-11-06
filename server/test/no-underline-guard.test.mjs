// role: [工程师]+[AI]
// no-underline-guard.test.mjs — 「全站文本下划线清零」守卫（2026-10-27 Task 9 · spec refine-ui-three-lenses）
//
// 来源（用户裁定，逐字）：「全系统一个下划线都没有」。spec 的 BREAKING 项：
//   移除 `text-decoration: underline`、Tailwind `underline` / `hover:underline`、`text-underline-offset`；
//   链接识别改用「颜色 + 箭头/图标/底色 hover」。
//
// 本守卫判的是**源码里是否还写着下划线**（不是 computed style；运行时由各组件类承担）：
//   N1 非空转：扫描面 ≥250 个前端源；抽取口径在合成正/负样本上必须命中/不命中
//   N2 判红面：docs/**（除 `PENDING_FILES` 台账）内不得出现下列任一写法
//        · `text-decoration: underline`
//        · `text-underline-offset`
//        · `underline-offset-<n>`（Tailwind 偏移类）
//        · 类名 token `underline` / `hover:underline`
//   N3 PENDING 台账：逐条写明「谁持有、为什么暂留」；只报处数不判红（Task 12 收口后自然归零）
//   N4 只降不升：全站（含 PENDING）下划线处数不得超过 `TOTAL_CAP`（当前仅 help.html 3 处）
//
// 口径边界（如实标注）：
//   · 只认「文本装饰」下划线；表格分隔线 / 卡边 / 选中态边线（`border-*`）不属本口径，不判。
//   · 注释先剥除再判（避免「说明文字里提到 underline」被误判）；`https://` 不被当行注释截断。
//   · `help.html` 由 Task 12 持有（本任务无写权）；`login.html` / `sidebar.js` 同属 Task 12 写权面，
//     但当前已无下划线 ⇒ 一并进判红面，防止新增。
// 运行：node --test server/test/no-underline-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const DOCS = join(ROOT, 'docs');
const EXTS = ['.js', '.mjs', '.css', '.html'];
const SKIP_DIRS = ['vendor'];

/** Task 12 持有写权、本任务不改的文件（收口后自动归零；只报不判） */
const PENDING_FILES = {};
/** 全站下划线处数上限（只降不升）：Task 12 已收口 help.html，当前为 0 */
const TOTAL_CAP = 0;

/** 剥注释后判红（避免 prose 提到 underline 被误判） */
function stripComments(src, ext) {
  let s = src.replace(/\/\*[\s\S]*?\*\//g, '');
  if (ext === '.html') s = s.replace(/<!--[\s\S]*?-->/g, '');
  if (ext === '.js' || ext === '.mjs') {
    s = s.split('\n').map((line) => line.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n');
  }
  return s;
}

const PATTERNS = [
  { kind: 'text-decoration:underline', re: /text-decoration\s*:\s*[^;{}"']*\bunderline\b/gi },
  { kind: 'text-underline-offset', re: /text-underline-offset/gi },
  { kind: 'underline-offset-N', re: /underline-offset-\d/gi },
  { kind: 'underline token', re: /(?<![\w-])(?:hover:)?underline(?![\w-])/gi },
];

/** 抽取口径（导出便于非空转自检）：返回命中种类列表 */
export function underlineHits(src, ext = '.js') {
  const code = stripComments(src, ext);
  const kinds = [];
  for (const { kind, re } of PATTERNS) {
    const hits = code.match(new RegExp(re.source, re.flags));
    if (hits) kinds.push({ kind, count: hits.length });
  }
  return kinds;
}

function scanFiles() {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir)) {
      if (SKIP_DIRS.includes(e)) continue;
      const full = join(dir, e);
      if (statSync(full).isDirectory()) { walk(full); continue; }
      if (!EXTS.some((x) => e.endsWith(x))) continue;
      out.push(relative(ROOT, full).replace(/\\/g, '/'));
    }
  };
  walk(DOCS);
  return out.sort();
}

const FILES = scanFiles();

function scan() {
  return FILES.map((file) => {
    const ext = file.slice(file.lastIndexOf('.'));
    const kinds = underlineHits(readFileSync(join(ROOT, file), 'utf8'), ext);
    const total = kinds.reduce((n, k) => n + k.count, 0);
    return { file, kinds, total };
  }).filter((r) => r.total > 0);
}

test('N1 非空转：扫描面规模 + 抽取口径正/负例', () => {
  assert.ok(FILES.length >= 250, `只扫描到 ${FILES.length} 个前端源（下限 250）：扫描口径被削，N2 会恒真`);
  // 正例
  assert.deepEqual(underlineHits('<a class="text-accent hover:underline">x</a>', '.js'), [{ kind: 'underline token', count: 1 }],
    '抽取口径失效：hover:underline 未命中');
  assert.deepEqual(underlineHits('.x { text-decoration: underline; }', '.css'), [
    { kind: 'text-decoration:underline', count: 1 }, { kind: 'underline token', count: 1 },
  ], '抽取口径失效：CSS text-decoration: underline 未命中');
  assert.deepEqual(underlineHits('<a class="underline-offset-2">x</a>', '.html'), [{ kind: 'underline-offset-N', count: 1 }],
    '抽取口径失效：underline-offset-2 未命中');
  assert.deepEqual(underlineHits('.x { text-underline-offset: 2px; }', '.css'), [{ kind: 'text-underline-offset', count: 1 }],
    '抽取口径失效：text-underline-offset 未命中');
  // 负例
  assert.deepEqual(underlineHits('.x { text-decoration: none; }', '.css'), [], '抽取口径过宽：text-decoration: none 被误判');
  assert.deepEqual(underlineHits('const underlined = 1;', '.js'), [], '抽取口径过宽：underlined 被误判');
  assert.deepEqual(underlineHits('// 这里说明不用 underline\nconst a = 1;', '.js'), [], '抽取口径过宽：注释里的 underline 被误判');
  assert.deepEqual(underlineHits('/* hover:underline */ .x{color:red}', '.css'), [], '抽取口径过宽：块注释里的 underline 被误判');
});

test('N2 全站文本下划线清零（PENDING 台账之外为 0）', () => {
  const rows = scan();
  const offenders = rows.filter((r) => !PENDING_FILES[r.file]);
  for (const r of rows) {
    const detail = r.kinds.map((k) => `${k.kind}×${k.count}`).join(' / ');
    console.log(`[no-underline] ${PENDING_FILES[r.file] ? 'PENDING ' : 'OFFENDER'} ${r.file} → ${detail}`);
  }
  assert.deepEqual(
    offenders.map((r) => `${r.file} → ${r.kinds.map((k) => `${k.kind}×${k.count}`).join(' / ')}`),
    [],
    '以下文件仍写有文本下划线（改用 颜色 + 箭头/图标/底色 hover；见 spec「文本下划线全站清零」）',
  );
});

test('N3 PENDING 台账：文件存在、写明持有者；只报处数不判红', () => {
  const rows = new Map(scan().map((r) => [r.file, r]));
  const files = Object.keys(PENDING_FILES);
  for (const file of files) {
    assert.ok(PENDING_FILES[file].includes('Task 12'), `${file} 的 PENDING 理由必须写明持有者（Task 12）`);
    assert.ok(statSync(join(ROOT, file)).isFile(), `PENDING 台账指向不存在的文件：${file}`);
    const total = rows.get(file)?.total || 0;
    console.log(`[no-underline] PENDING ${file}：剩余 ${total} 处（收口后自动归零，无需删除本条）`);
  }
  // 台账为空时，任何仍有下划线的文件都必须已判红（N2），不得靠“未登记”漏过。
  const unregistered = scan().filter((r) => r.total > 0 && !files.includes(r.file)).map((r) => r.file);
  assert.deepEqual(unregistered, [], `仍有下划线但未进 PENDING 台账：${unregistered.join('、')}`);
});

test('N4 只降不升：全站下划线处数 ≤ 上限', () => {
  const total = scan().reduce((n, r) => n + r.total, 0);
  assert.ok(total <= TOTAL_CAP,
    `全站下划线 ${total} 处 > 上限 ${TOTAL_CAP}（新增必须说明为什么不是文本装饰；收口后只能下调本常量）`);
  console.log(`[no-underline] 全站下划线 ${total} 处（上限 ${TOTAL_CAP}）`);
});
