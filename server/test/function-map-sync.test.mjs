// server/test/function-map-sync.test.mjs — 目录 → README 功能地图块一致性（防漂移）
// 2026-09-03 DOC_SLIM A5：独立 FUNCTION_MAP.md 不再随仓库维护，仅校验 README 标记块。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { generateMindmap } from '../../docs/scripts/gen-function-mermaid.mjs';

const README = fileURLToPath(new URL('../../README.md', import.meta.url));

test('README 功能地图标记块与实时生成一致（防漂移）', () => {
  const readme = readFileSync(README, 'utf8');
  assert.ok(readme.includes('<!--FUNC-MAP:START-->'), 'README 已含标记块');
  const m = /<!--FUNC-MAP:START-->([\s\S]*?)<!--FUNC-MAP:END-->/.exec(readme);
  assert.ok(m, 'README 已含标记块');
  assert.equal(m[1].trim(), generateMindmap().trim(), '标记块内容 = 实时生成');
});
