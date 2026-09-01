// server/test/function-map-sync.test.mjs — 目录 → 图产物一致性（防漂移）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { generateMindmap, generateAll, applyToReadme } from '../../docs/scripts/gen-function-mermaid.mjs';

const README = fileURLToPath(new URL('../../README.md', import.meta.url));
const MAP = fileURLToPath(new URL('../../content/03_doc_system/FUNCTION_MAP.md', import.meta.url));

test('README 标记块与实时生成一致（防漂移）', () => {
  const readme = readFileSync(README, 'utf8');
  const generated = applyToReadme(readme);
  assert.ok(generated.includes('<!--FUNC-MAP:START-->') && generated.includes('<!--FUNC-MAP:END-->'), '标记块存在');
  const m = /<!--FUNC-MAP:START-->([\s\S]*?)<!--FUNC-MAP:END-->/.exec(readme);
  assert.ok(m, 'README 已含标记块');
  assert.equal(m[1].trim(), generateMindmap().trim(), '标记块内容 = 实时生成');
});

test('FUNCTION_MAP.md 与实时生成一致（防漂移）', () => {
  const map = readFileSync(MAP, 'utf8');
  const gen = generateAll();
  assert.ok(map.includes('## 功能地图'), '文档含功能地图章');
  assert.equal(map.trim(), gen.trim(), '文档内容 = 实时生成');
});
