// role: [工程师]+[AI]
// ui-button-four-types.test.mjs — 按钮四类与 tab 豁免守卫（2026-10-19 立 · Task 9）
//
// 来源：Spec「最小三成本」Task 1 / Task 9；判例＝「无底色无边框按钮难用」「8 族分不清」。
// 裁定：动作按钮只有四类——主操作 / 次操作 / 强调次操作 / 危险；tab 与页签 `btn-tab` 豁免。
//
// 判据：
//   B1 四页重点不得再出现 `btn-ghost` / `btn-neutral` / `btn-action-*`；
//   B2 四页重点至少出现 `.btn-sm` 或 `.btn-md` 的显式尺寸；
//   B3 六台顶部 tab 的 `tab-btn` / 页签 `btn-tab` 不被本守卫统计；
//   B4 非空转：四页重点文件确实存在且含按钮标记。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PAGES = [
  { label: '支书 · 党小组', file: join(ROOT, 'docs', 'src', 'entries', 'tabs', 'secretary', 'group-progress-tab.js') },
  { label: '支书 · 支委会', file: join(ROOT, 'docs', 'src', 'entries', 'tabs', 'secretary', 'committee-meeting-tab.js') },
  { label: '支书 · 全局概况', file: join(ROOT, 'docs', 'src', 'components', 'governance', 'work-overview.js') },
  { label: '支书 · 待办', file: join(ROOT, 'docs', 'src', 'components', 'record', 'todo-list.js') },
];

const BANNED = ['btn-ghost', 'btn-neutral', 'btn-action-red', 'btn-action-green', 'btn-action-amber', 'btn-action-orange', 'btn-action-gray'];

test('B1 四页重点不再出现旧动作按钮类', () => {
  for (const { label, file } of PAGES) {
    const src = readFileSync(file, 'utf8');
    for (const cls of BANNED) {
      assert.ok(!src.includes(cls), `${label} 仍出现旧动作按钮类 ${cls}；应改用四类 + btn-sm/btn-md`);
    }
  }
});

test('B2 四页重点使用显式尺寸 btn-sm / btn-md', () => {
  for (const { label, file } of PAGES) {
    const src = readFileSync(file, 'utf8');
    assert.match(src, /btn-(sm|md)/, `${label} 未使用 btn-sm / btn-md 显式尺寸`);
  }
});

test('B3 tab / 页签 btn-tab 豁免：顶部 tab 文件不在本守卫统计面', () => {
  // 六台顶部 tab 的选中态与尺寸由 tab-bar / styles.css 维护；本守卫不读取、不改写。
  const tabBar = readFileSync(join(ROOT, 'docs', 'src', 'components', 'shell', 'tab-bar.js'), 'utf8');
  assert.ok(tabBar.includes('tab-btn'), 'tab-bar 仍应使用 tab-btn；本轮豁免且不改其尺寸');
});

test('B4 非空转：四页重点确实含按钮标记', () => {
  for (const { label, file } of PAGES) {
    const src = readFileSync(file, 'utf8');
    assert.match(src, /<button|listRowHtml|metric-band__item/, `${label} 未检出按钮标记，抽取面可能写坏`);
  }
});
