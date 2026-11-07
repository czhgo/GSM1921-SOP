// server/test/action-row-wrap-guard.test.mjs — 行动行排布守卫（2026-11-07 批次 535 · SD-60）
// 病灶：卡头标题不收缩 + aside 整组 margin-left:auto + 三处 flex-wrap:wrap
//   ⇒ 宽度足够时按钮组仍被机械挤到第二行。
// 判据（只守 `.card-head` 家族，不扫全站；`.lf-bar` 仍守 SD-58 的「两行上限」）：
//   W1 `.card-head` 基准 flex-wrap:nowrap，且 ≤640 断点有 wrap 覆盖
//   W2 `.card-head__title` 承担伸缩（flex:1 1 auto + min-width:0）
//   W3 `.card-head__aside` 不拆组（flex:0 0 auto + flex-wrap:nowrap）
//   W4 按钮族已有 white-space:nowrap（不重复添加，只防被删）
//   W5 `.lf-bar` 仍为 flex-wrap:wrap（不得以「防换行」改坏筛选条）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const CSS = readFileSync(join(ROOT, 'docs', 'src', 'styles.css'), 'utf8');

/** 取某个选择器的首个规则体（按 `{` 前的选择器精确匹配） */
function ruleBody(selector) {
  const re = new RegExp(`(?:^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`);
  const m = CSS.match(re);
  return m ? m[1] : '';
}

test('W1 `.card-head` 基准 nowrap，≤640 断点有 wrap 覆盖', () => {
  const base = ruleBody('.card-head');
  assert.match(base, /flex-wrap:\s*nowrap/, '.card-head 基准须 flex-wrap:nowrap（≥641 不换行）');
  const media = CSS.slice(CSS.indexOf('@media (max-width: 640px)'));
  assert.match(media, /\.card-head\s*\{[^}]*flex-wrap:\s*wrap/, '≤640 须有 .card-head 换行覆盖');
});

test('W2 `.card-head__title` 承担伸缩（flex:1 1 auto + min-width:0）', () => {
  const body = ruleBody('.card-head__title');
  assert.match(body, /min-width:\s*0/, '.card-head__title 缺 min-width:0（标题不收缩会挤走按钮组）');
  assert.match(body, /flex:\s*1\s+1\s+auto/, '.card-head__title 缺 flex:1 1 auto（标题必须让位）');
});

test('W3 `.card-head__aside` 不拆组（flex:0 0 auto + nowrap）', () => {
  const body = ruleBody('.card-head__aside');
  assert.match(body, /flex-wrap:\s*nowrap/, '.card-head__aside 须 nowrap（meta 与 actions 不拆组）');
  assert.match(body, /flex:\s*0\s+0\s+auto/, '.card-head__aside 须 flex:0 0 auto（整组不让位）');
});

test('W4 按钮族保留 white-space:nowrap', () => {
  const groups = [...CSS.matchAll(/\.btn-tab\s*\{([^}]*)\}/g)].map((m) => m[1]);
  assert.ok(groups.length > 0, '找不到 .btn-tab 规则');
  assert.ok(groups.some((body) => /white-space:\s*nowrap/.test(body)),
    '按钮族缺 white-space:nowrap（按钮文字会内部断行）');
});

test('W5 `.lf-bar` 仍可折行（SD-58 不被本守卫改坏）', () => {
  const body = ruleBody('.lf-bar');
  assert.match(body, /flex-wrap:\s*wrap/, '.lf-bar 须保持 flex-wrap:wrap（筛选条两行上限）');
});
