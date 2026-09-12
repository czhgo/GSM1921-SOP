// server/test/function-map-sync.test.mjs — 目录 → README 功能地图块一致性（防失同步）
// 2026-09-03 起：独立 FUNCTION_MAP.md 不再随仓库维护，仅校验 README 标记块。
// 2026-09-09 起：功能地图迁至**根 README.md 顶部**（通用化门面；锚点 <!--FUNC-MAP:ANCHOR-->）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { generateMindmap } from '../../docs/scripts/gen-function-mermaid.mjs';

const README = fileURLToPath(new URL('../../README.md', import.meta.url));

test('根 README.md 功能地图标记块与实时生成一致（防失同步）', () => {
  const readme = readFileSync(README, 'utf8');
  assert.ok(readme.includes('<!--FUNC-MAP:ANCHOR-->'), 'README.md 含功能地图锚点');
  const m = /<!--FUNC-MAP:START-->([\s\S]*?)<!--FUNC-MAP:END-->/.exec(readme);
  assert.ok(m, 'README.md 已含标记块');
  const norm = (s) => s.replace(/\r\n/g, '\n').trim(); // 归一化行尾（工作区 CRLF / 生成 LF 均可）
  assert.equal(norm(m[1]), norm(generateMindmap()), '标记块内容 = 实时生成');
});
