// role: [工程师]+[AI]
// nested-interaction-guard.test.mjs — 嵌套交互守卫（2026-10-31 P0 · 支书补充批次）
//
// 病灶：`role="button"` 整行容器里再嵌独立 `<button>` / `<a>`（通知行 5×2＝10 处、
//   待办行 4 处），点击「删除」容易连带触发整行「查看详情」，键盘焦点也容易被外层抢走。
//
// 判据：
//   N1 扫描 docs/src 下 `.js` / `.html`：可点容器（role="button"）子树内出现独立
//      `<button>` / `<a>` 即判红；唯一放行方式是容器带 `data-nested-actions="true"`，
//      且该文件已登记进白名单（附运行时命中数，合计 14）。
//   N2 白名单标记不得出现在未登记文件；登记项必须真实带标记（双向一致，防僵尸 / 防逃逸）。
//   N3 非空转：未标记的嵌套样本判红、标记但未登记的样本判红、纯文本行判绿。
//
// 运行：node --test server/test/nested-interaction-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, 'docs', 'src');

/** 已评审的嵌套交互白名单（文件 → 运行时命中数 + 理由）。
 *  通知：首页/支书台通知列表每屏 5 行 × 「删除 / 编辑」2 枚 = 10；
 *  待办：待办行尾「主行动 / 更多」= 4 处（四档紧迫度行）。合计 14。 */
const NESTED_WHITELIST = new Map([
  // ── 本批 14 处缺陷行（支书点名：通知 10 + 待办 4）──
  ['docs/src/entries/tabs/secretary/notification-tab.js', {
    runtimeHits: 10,
    defectSet: true,
    reason: '通知行整卡可点 + 行内删除/编辑；两层均 stopPropagation，键盘各自可达',
  }],
  ['docs/src/components/ui/list-row.js', {
    runtimeHits: 4,
    defectSet: true,
    reason: 'master 主从行整行选中 + 行尾主行动/更多；trailing 含控件时输出 data-nested-actions',
  }],
  // ── 存量同类（已有独立 stopPropagation / 内层优先判定，本批只登记不重写）──
  ['docs/src/components/shell/header.js', {
    runtimeHits: 1,
    defectSet: false,
    reason: '顶栏通知浮层行 + 「已读」按钮；已读按钮 stopPropagation，行 keydown 跳过内层控件',
  }],
  ['docs/src/entries/tabs/disc/attendance-tab.js', {
    runtimeHits: 1,
    defectSet: false,
    reason: '考勤队列行 + 勾选框/档案链接；行点击跳过 a/button/input/label',
  }],
  ['docs/src/entries/tabs/leader/write-tab.js', {
    runtimeHits: 1,
    defectSet: false,
    reason: '组长活动行 + 「发布本组通知」按钮；按钮 stopPropagation，行 keydown 跳过按钮',
  }],
  ['docs/src/entries/tabs/visitor/projects-tab.js', {
    runtimeHits: 1,
    defectSet: false,
    reason: '成员任务卡 + 「勾掉」按钮；按钮 stopPropagation，卡 keydown 要求 e.target === card',
  }],
]);

const EXPECTED_DEFECT_HITS = 14;
const MARKER = 'data-nested-actions="true"';
const WRAPPER_TAGS = new Set(['div', 'span', 'tr', 'li', 'section', 'article']);

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { walk(p, out); continue; }
    if (/\.(js|mjs|html)$/.test(e.name)) out.push(p);
  }
  return out;
}

/** 取 role="button" 容器的子树文本（按同名标签计深度；找不到闭合则截到上限） */
function subtreeOf(src, start, tag) {
  const tagRe = new RegExp(`<(/?)${tag}\\b[^>]*?(/?)>`, 'gi');
  tagRe.lastIndex = start;
  let depth = 0;
  let m;
  while ((m = tagRe.exec(src))) {
    const closing = m[1] === '/';
    const selfClosing = m[2] === '/';
    if (!closing && !selfClosing) depth += 1;
    if (closing) {
      depth -= 1;
      if (depth === 0) return src.slice(start, tagRe.lastIndex);
    }
    if (tagRe.lastIndex > start + 8000) break;
  }
  return src.slice(start, start + 8000);
}

/** 返回 |{nested:true, marked:boolean, tag, index} 的疑似容器（跳过纯注释行） */
export function findNestedContainers(src) {
  const out = [];
  const re = /<(div|span|tr|li|section|article)\b[^>]*\brole=["']button["'][^>]*>/gi;
  let m;
  while ((m = re.exec(src))) {
    const tag = m[1].toLowerCase();
    if (!WRAPPER_TAGS.has(tag)) continue;
    const lineStart = src.lastIndexOf('\n', m.index) + 1;
    const lineHead = src.slice(lineStart, m.index).trim();
    if (lineHead.startsWith('//') || lineHead.startsWith('*')) continue;
    const openTag = m[0];
    const inner = subtreeOf(src, m.index, tag);
    const nested = /<(?:button|a)\b/i.test(inner);
    out.push({ tag, index: m.index, nested, marked: openTag.includes(MARKER), openTag });
  }
  return out;
}

test('N1 可点容器子树内出现独立 button/a：未标记或未登记即判红', () => {
  const offenders = [];
  for (const file of walk(SRC)) {
    const src = readFileSync(file, 'utf8');
    const relPath = relative(ROOT, file).replace(/\\/g, '/');
    for (const hit of findNestedContainers(src)) {
      if (!hit.nested) continue;
      const line = src.slice(0, hit.index).split(/\r?\n/).length;
      if (!hit.marked) {
        offenders.push(`${relPath}:${line} role=button 内嵌 button/a 但缺 ${MARKER}`);
        continue;
      }
      if (!NESTED_WHITELIST.has(relPath)) {
        offenders.push(`${relPath}:${line} 已标记嵌套交互但未登记白名单`);
      }
    }
  }
  assert.deepEqual(offenders, [],
    `发现未评审的嵌套交互（点击内层按钮会连带触发整行）：\n${offenders.join('\n')}`);
});

test('N2 白名单双向一致：标记只出现在登记文件，登记文件必须真实带标记', () => {
  const files = walk(SRC);
  const markedFiles = new Set(
    files.filter((f) => readFileSync(f, 'utf8').includes(MARKER))
      .map((f) => relative(ROOT, f).replace(/\\/g, '/')),
  );
  assert.deepEqual([...markedFiles].sort(), [...NESTED_WHITELIST.keys()].sort(),
    'data-nested-actions 标记与白名单必须双向一致（多一个＝逃逸，少一个＝僵尸）');

  const defectHits = [...NESTED_WHITELIST.values()]
    .filter((v) => v.defectSet)
    .reduce((sum, v) => sum + v.runtimeHits, 0);
  assert.equal(defectHits, EXPECTED_DEFECT_HITS,
    `本批缺陷行运行时命中数合计须为 ${EXPECTED_DEFECT_HITS}（实测 ${defectHits}）`);
});

test('N3 非空转：未标记嵌套判红、标记未登记判红、纯文本行判绿', () => {
  const nested = '<div role="button" tabindex="0"><span>标题</span><button>删除</button></div>';
  const found = findNestedContainers(nested);
  assert.equal(found.length, 1);
  assert.equal(found[0].nested, true);
  assert.equal(found[0].marked, false);

  const marked = `<div role="button" tabindex="0" ${MARKER}><span>标题</span><a href="#">档案</a></div>`;
  assert.equal(findNestedContainers(marked)[0].marked, true);

  const plain = '<div role="button" tabindex="0"><span>只有文字</span></div>';
  assert.equal(findNestedContainers(plain)[0].nested, false);

  const comment = '// <div role="button"><button>x</button></div>';
  assert.equal(findNestedContainers(comment).length, 0, '注释行不得计入');
});
