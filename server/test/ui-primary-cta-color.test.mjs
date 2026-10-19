// role: [工程师]+[AI]
// ui-primary-cta-color.test.mjs — 主 CTA 角色色全强度守卫（2026-10-19 · Spec Task 4）
//
// 口径：`.btn-accent` 背景不得再与深灰 #1F2937 混合（泥褐）；必须使用角色色令牌
// （`var(--app-accent)` 全强度或其专用压深档 `var(--app-accent-strong)`）。
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

test('C3 压深档仍取角色色相（亮色本色+深字 / 暗色压深+白字）', () => {
  // 2026-10-19 支书裁定默认金 #F5C518：亮色主题不再压深成棕，而是本色底 + 深字；
  // 暗色角色仍由 accentButtonColors() 生成 58% 压深底 + 白字，保持色相。
  assert.match(CSS, /--app-accent-strong:\s*var\(--app-accent\)/,
    '默认主题应使用本色底（亮色主题不再压深成棕）');
  assert.match(CONSTANTS, /color-mix\(in srgb, \$\{hex\} 58%, black\)/,
    '暗色角色应由 accentButtonColors 压深到 58% 并保持色相');
  assert.match(CONSTANTS, /export function accentButtonColors/, '缺少 accentButtonColors 单一源');
});
