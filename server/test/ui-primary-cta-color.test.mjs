// role: [工程师]+[AI]
// ui-primary-cta-color.test.mjs — 主 CTA 主题色实底守卫（2026-10-19 立；2026-10-23 批次 505 改口径）
//
// 口径：`.btn-accent` 背景不得再与深灰混合（泥褐），也不得再用 color-mix 压深；
// 批次 505 起实底 = 主题表的 `strongBg`、实底字 = `strongInk`（8 token 显式表，逐主题手选）。
// 运行：node --test server/test/ui-primary-cta-color.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const CSS = readFileSync(join(ROOT, 'docs', 'src', 'styles.css'), 'utf8');
const CONSTANTS = readFileSync(join(ROOT, 'docs', 'src', 'core', 'domain', 'constants.js'), 'utf8');

/** 取 `.btn-accent { … }` 规则体（排除 :hover / :disabled） */
function btnAccentBody() {
  const m = /\.btn-accent\s*\{([^}]*)\}/.exec(CSS);
  return m ? m[1] : '';
}

test('C1 主 CTA 不再混入深灰 #1F2937', () => {
  const body = btnAccentBody();
  assert.ok(body, '未找到 .btn-accent 规则');
  assert.doesNotMatch(body, /#1F2937/i, '.btn-accent 仍在混入 #1F2937（泥褐）');
  assert.doesNotMatch(body, /color-mix\([^)]*#1F2937/i, '.btn-accent 仍用 color-mix(...#1F2937)');
});

test('C2 主 CTA 使用角色色令牌', () => {
  const body = btnAccentBody();
  assert.match(body, /var\(--app-accent/, '.btn-accent 背景未使用 --app-accent 令牌');
});

test('C3 实底/实底字查表：strongBg + strongInk（无 color-mix 压深）', () => {
  // 批次 505：每个主题的实底与实底字都是手选 hex（strongBg / strongInk），
  // 不再用 `color-mix(in srgb, 主题色 58%, black)` 按亮度压深。
  assert.match(CSS, /\.btn-accent\s*\{[^}]*background:\s*var\(--app-accent-strong-bg\)/,
    '.btn-accent 背景应为 var(--app-accent-strong-bg)（查表 strongBg）');
  assert.match(CSS, /\.btn-accent\s*\{[^}]*color:\s*var\(--app-accent-strong-ink\)/,
    '.btn-accent 文字色应为 var(--app-accent-strong-ink)（查表 strongInk）');
  assert.doesNotMatch(CSS, /color-mix\([^)]*var\(--app-accent[^)]*black/i,
    'styles.css 不得再用 color-mix(主题色 … black) 生成实底');
  assert.match(CONSTANTS, /return \{ bg: t\.strongBg, text: t\.strongInk, strong: t\.strongBg, ink: t\.strongInk, strongHover: t\.strongHover \};/,
    'accentButtonColors 应直接查表返回 strongBg / strongInk / strongHover');
  assert.match(CONSTANTS, /export function accentButtonColors/, '缺少 accentButtonColors 单一源');
});
