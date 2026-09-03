// server/test/flow-catalog-sync.test.mjs — P0c 防漂移：FLOW_LINKS 键集 == function-catalog flow id 键集
// 2026-09-03 建立：落实 mermaid-sources.js 注释「与 function-catalog 的 flow 条目 id 一一对应（防漂移测试以 catalog 为准）」
// 双向断言：任一侧新增/删除 flow id，测试即红，须同步另一侧，杜绝"两份手写清单漂移"。
// 与 function-catalog.test.mjs 相同的文本求值方式读取纯数据表达式（双环境可用，无需浏览器）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url)); // 仓库根

function grab(relPath, name) {
  const src = readFileSync(`${root}${relPath}`, 'utf8');
  const m = new RegExp(`export const ${name} = ([\\s\\S]*?);\\s*(?:export|$)`, 'm').exec(src);
  assert.ok(m, `${relPath} 未找到 export const ${name}`);
  return new Function(`return (${m[1]})`)();
}

test('FLOW_LINKS 键集 与 function-catalog flow id 键集双向一致（防漂移）', () => {
  const groups = grab('docs/src/core/function-catalog.js', 'FUNCTION_GROUPS');
  const catalog = grab('docs/src/core/function-catalog.js', 'FUNCTION_CATALOG');
  const flowLinks = grab('docs/src/core/mermaid-sources.js', 'FLOW_LINKS');

  const flowIds = catalog.filter((i) => i.kind === 'flow').map((i) => i.id);
  const linkKeys = Object.keys(flowLinks);

  assert.deepEqual(
    [...linkKeys].sort(),
    [...flowIds].sort(),
    'FLOW_LINKS 键集与 function-catalog 的 flow 条目必须一一对应：新增/删除业务链路时两侧需同步',
  );

  for (const id of flowIds) {
    const it = catalog.find((i) => i.id === id);
    assert.ok(groups.includes(it.group), `flow ${id} 的 group 未在 FUNCTION_GROUPS 中定义`);
    assert.ok(Array.isArray(flowLinks[id]) && flowLinks[id].length > 0, `FLOW_LINKS[${id}] 缺少节点步骤`);
  }
});
