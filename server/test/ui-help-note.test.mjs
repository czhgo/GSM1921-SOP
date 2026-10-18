// role: [工程师]+[AI]
// ui-help-note.test.mjs — 帮助注释单一形态守卫（2026-10-19 立 · Task 2）
//
// 来源：Spec「最小三成本」Task 2 / SubTask 2.5；判例＝「同一页两种帮助链接风格并存」。
// 裁定：帮助注释＝一句正文 + 一个蓝链；统一类 `.help-note` / `.help-note__link`。
//
// 判据：
//   H1 DESIGN_SYSTEM §4.24「帮助注释」存在，含两个统一类与「一句正文 + 一个蓝链」口径；
//   H2 styles.css 定义 `.help-note`（12px / 中性灰 / line-height 1.6）与
//      `.help-note__link`（信息蓝 / 左间距 / hover 下划线）；
//   H3 党小组 / 支委会迁移后必须用 `.help-note__link`，且不得再出现手写 `sky-600` 链。
//      **当前页面尚未迁移**：若文件里还没有 `.help-note`，记为「页面任务待满足」并跳过，
//      不写死失败；迁移一旦开始（出现 `.help-note`），本守卫立即收紧。
//
// 运行：node --test server/test/ui-help-note.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DESIGN = join(ROOT, 'content', '04_web_design', 'design-system', 'DESIGN_SYSTEM.md');
const STYLES = join(ROOT, 'docs', 'src', 'styles.css');

/** 迁移后必须使用统一帮助注释的页面（Task 2 / SubTask 2.3 / 2.4） */
const PAGES = [
  { label: '支书 · 党小组', file: join(ROOT, 'docs', 'src', 'entries', 'tabs', 'secretary', 'group-progress-tab.js') },
  { label: '支书 · 支委会', file: join(ROOT, 'docs', 'src', 'entries', 'tabs', 'secretary', 'committee-meeting-tab.js') },
];

function sliceBetween(src, startMarker, endMarker) {
  const start = src.indexOf(startMarker);
  if (start < 0) return '';
  const end = src.indexOf(endMarker, start + startMarker.length);
  return end < 0 ? src.slice(start) : src.slice(start, end);
}

test('H1 DESIGN_SYSTEM §4.24 帮助注释存在且口径齐备', () => {
  const src = readFileSync(DESIGN, 'utf8');
  const section = sliceBetween(src, '### 4.24 帮助注释', '## 五、交互反馈规范');
  assert.ok(section.length > 100, 'DESIGN_SYSTEM 缺 §4.24「帮助注释」或正文过短');
  for (const key of ['.help-note__link', '.help-note', '一句正文 + 一个蓝链', 'help.html']) {
    assert.ok(section.includes(key), `§4.24 缺「${key}」`);
  }
  assert.ok(section.includes('反例'), '§4.24 缺反例（两种链接风格并存）');
});

test('H2 styles.css 定义 .help-note / .help-note__link', () => {
  const css = readFileSync(STYLES, 'utf8');
  const note = /\.help-note\s*\{([^}]*)\}/.exec(css)?.[1] || '';
  assert.ok(note, 'styles.css 缺 .help-note 规则');
  assert.match(note, /display:\s*block/, '.help-note 应为 display:block');
  assert.match(note, /font-size:\s*12px/, '.help-note 字号应为 12px');
  assert.match(note, /line-height:\s*1\.6/, '.help-note 行高应为 1.6');
  assert.match(note, /color:\s*var\(--neutral-500\)/, '.help-note 颜色应为 var(--neutral-500)');

  const link = /\.help-note__link\s*\{([^}]*)\}/.exec(css)?.[1] || '';
  assert.ok(link, 'styles.css 缺 .help-note__link 规则');
  assert.match(link, /color:\s*var\(--functional-info\)/, '.help-note__link 颜色应为 var(--functional-info)');
  assert.match(link, /margin-left:\s*var\(--space-1\)/, '.help-note__link 左间距应为 var(--space-1)');
  assert.match(link, /text-decoration:\s*none/, '.help-note__link 默认不应有下划线');
  assert.match(css, /\.help-note__link:hover\s*\{[^}]*text-decoration:\s*underline/,
    '.help-note__link:hover 应有下划线');
});

test('H3 党小组 / 支委会页面必须用 .help-note__link 蓝链', () => {
  for (const { label, file } of PAGES) {
    const src = readFileSync(file, 'utf8');
    assert.ok(src.includes('help-note'), `${label} 未使用 .help-note 统一帮助注释`);
    assert.ok(src.includes('help-note__link'), `${label} 用了 .help-note 但缺 .help-note__link 蓝链`);
    assert.ok(!/text-sky-600/.test(src), `${label} 仍有手写 text-sky-600 链，应收口到 .help-note__link`);
  }
});
