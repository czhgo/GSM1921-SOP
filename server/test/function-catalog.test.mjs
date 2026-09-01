// server/test/function-catalog.test.mjs — 功能目录结构审计
// 与 gen-function-mermaid.mjs 相同的文本求值方式读取 catalog（纯数据表达式，双环境可用）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const catalogPath = fileURLToPath(new URL('../../docs/src/core/function-catalog.js', import.meta.url));

function loadCatalog() {
  const src = readFileSync(catalogPath, 'utf8');
  const grab = (name) => {
    const m = new RegExp(`export const ${name} = ([\\s\\S]*?);\\s*(?:export|$)`, 'm').exec(src);
    assert.ok(m, `未找到 export const ${name}`);
    return new Function(`return (${m[1]})`)();
  };
  return { groups: grab('FUNCTION_GROUPS'), items: grab('FUNCTION_CATALOG') };
}

test('FUNCTION_CATALOG 结构合法', () => {
  const { groups, items } = loadCatalog();
  assert.ok(Array.isArray(groups) && groups.length >= 5, 'GROUPS 至少 5 章');
  assert.ok(Array.isArray(items) && items.length >= 40, `条目至少 40 条，实际 ${items.length}`);
  const ids = new Set();
  const allIds = new Set(items.map((i) => i.id)); // 全量 id：related 可引用任意位置条目（含前向引用）
  for (const it of items) {
    assert.ok(it.id && /^[a-z0-9-]+$/.test(it.id), `id 非法：${it.id}`);
    assert.ok(!ids.has(it.id), `id 重复：${it.id}`);
    ids.add(it.id);
    assert.ok(it.name && typeof it.name === 'string');
    assert.ok(groups.includes(it.group), `group 未定义：${it.group}（${it.id}）`);
    assert.ok(typeof it.generic === 'boolean', `generic 必须 boolean：${it.id}`);
    assert.ok(['feature', 'flow', 'arch'].includes(it.kind), `kind 非法：${it.id}`);
    for (const r of it.related || []) {
      assert.ok(allIds.has(r) || r.startsWith('group:'), `related 引用不存在：${it.id} → ${r}`);
    }
  }
  // 链路与架构条目必须存在
  for (const required of ['flow-activity', 'flow-member-change', 'arch-layers']) {
    assert.ok(ids.has(required), `缺少必需条目 ${required}`);
  }
});
