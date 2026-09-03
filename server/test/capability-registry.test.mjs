// role: [工程师]+[AI]
// capability-registry.test.mjs — T-279 M4 能力注册表迭代机制断言
// 验证：①能力按 scope/role/env 过滤 ②unregisterCapability 注销（回滚=注销声明）
//      ③getRegistryVersion 版本聚合 ④resolveDeps 依赖查询 ⑤listCapabilities 一次取齐
//      ⑥data-source / sop-scenarios 能力声明形态（env/deps/apply/list/get）
// 运行：node --test docs/test/capability-registry.test.mjs
// 设计权威源：content/04_web_design/ARCHITECTURE_EVOLUTION.md §五（迭代机制）

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// ── 加载 registry.js（纯 ESM 无内部 import，读源码经 data: URL 导入） ──
let registry;
test.before(async () => {
  const src = await readFile(
    new URL('../../docs/src/core/registry.js?v=20260903c', import.meta.url),
    'utf8',
  );
  const b64 = Buffer.from(src, 'utf8').toString('base64');
  registry = await import(`data:text/javascript;base64,${b64}`);
});

test('registerCapability + getCapabilities 按 scope/role/env 过滤', () => {
  registry.registerCapability({
    id: 'test-a', scope: ['dashboard'], requiredRoles: null, env: null, version: '1.0.0',
  });
  registry.registerCapability({
    id: 'test-b', scope: ['workspace'], requiredRoles: ['secretary'], env: ['prod'], version: '1.0.0',
  });

  // scope 过滤
  assert.ok(registry.getCapabilities({ scope: 'dashboard' }).some(c => c.id === 'test-a'));
  assert.ok(!registry.getCapabilities({ scope: 'dashboard' }).some(c => c.id === 'test-b'));
  // role 过滤（requiredRoles 数组应用）
  assert.ok(registry.getCapabilities({ scope: 'workspace', role: 'secretary' }).some(c => c.id === 'test-b'));
  assert.ok(!registry.getCapabilities({ scope: 'workspace', role: 'leader' }).some(c => c.id === 'test-b'));
  // env 过滤（M4 功能开关）
  assert.ok(registry.getCapabilities({ scope: 'workspace', env: 'prod' }).some(c => c.id === 'test-b'));
  assert.ok(!registry.getCapabilities({ scope: 'workspace', env: 'dev' }).some(c => c.id === 'test-b'));
  // null requiredRoles = 无角色限制
  assert.ok(registry.getCapabilities({ scope: 'dashboard', role: 'x' }).some(c => c.id === 'test-a'));

  registry.unregisterCapability('test-a');
  registry.unregisterCapability('test-b');
});

test('unregisterCapability 注销（回滚=注销声明）', () => {
  registry.registerCapability({ id: 'test-rm', scope: ['all'] });
  assert.ok(registry.getCapability('test-rm'));
  assert.equal(registry.unregisterCapability('test-rm'), true);
  assert.equal(registry.getCapability('test-rm'), undefined);
  // 注销未注册能力返回 false
  assert.equal(registry.unregisterCapability('not-exist'), false);
});

test('getRegistryVersion 聚合最大版本', () => {
  registry.registerCapability({ id: 'test-v1', scope: ['all'], version: '1.0.0' });
  registry.registerCapability({ id: 'test-v2', scope: ['all'], version: '20260823a' });
  registry.registerCapability({ id: 'test-v3', scope: ['all'] }); // 缺省 1.0.0
  assert.equal(registry.getRegistryVersion(), '20260823a');
  registry.unregisterCapability('test-v1');
  registry.unregisterCapability('test-v2');
  registry.unregisterCapability('test-v3');
});

test('resolveDeps 返回未注册依赖（不阻断挂载）', () => {
  registry.registerCapability({ id: 'test-dep', scope: ['all'], deps: ['data-adapter', 'ghost-cap'] });
  const missing = registry.resolveDeps('test-dep');
  assert.ok(Array.isArray(missing));
  assert.ok(missing.includes('ghost-cap')); // ghost-cap 未注册 → 列入缺失
  // data-adapter 在此测试环境同样未注册为能力 → 一并列入（仅提示，不阻断）
  assert.ok(missing.includes('data-adapter'));
  assert.deepEqual(registry.resolveDeps('no-such'), []);
  registry.unregisterCapability('test-dep');
});

test('listCapabilities 一次取齐 items/version/count', () => {
  registry.registerCapability({ id: 'test-list', scope: ['dashboard'], version: '20260823b' });
  const { items, version, count } = registry.listCapabilities({ scope: 'dashboard' });
  assert.ok(Array.isArray(items));
  assert.ok(items.some(c => c.id === 'test-list'));
  assert.equal(version, '20260823b');
  assert.equal(count, items.length);
  registry.unregisterCapability('test-list');
});

test('mountCapability 未注册抛错', async () => {
  await assert.rejects(
    () => registry.mountCapability('ghost-mount', null, {}),
    /未注册能力/,
  );
});

// ── data-source / sop-scenarios 能力声明形态（静态断言） ──
test('data-source.js 注册 mock/api 数据源能力（env/deps/apply）', async () => {
  const src = await readFile(
    new URL('../../docs/src/modules/capabilities/data-source.js?v=20260903c', import.meta.url),
    'utf8',
  );
  assert.match(src, /id: 'mock-data-source'/);
  assert.match(src, /id: 'api-data-source'/);
  assert.match(src, /scope: \['data-source'\]/);
  assert.match(src, /env: null/);            // mock 全环境
  assert.match(src, /env: \['prod'\]/);      // api 仅生产
  assert.match(src, /deps: \['data-adapter'\]/);
  assert.match(src, /apply: \(ctx\) => setDataSource\('api'/);
  assert.match(src, /registerCapability\(\{[\s\S]*registerCapability\(\{/); // 两次注册
});

test('sop-scenarios.js 注册场景能力（scope/scenario + list/get）', async () => {
  const src = await readFile(
    new URL('../../docs/src/modules/capabilities/sop-scenarios.js?v=20260903c', import.meta.url),
    'utf8',
  );
  assert.match(src, /id: 'sop-scenarios'/);
  assert.match(src, /scope: \['scenario'\]/);
  assert.match(src, /list: \(\) => sopDatabase\.scenarios/);
  assert.match(src, /get: \(scenarioId\) => sopDatabase\.scenarios\.find/);
});

test('decision-tree 消费点经注册表读取场景（getScenario 回退 sopDatabase）', async () => {
  const src = await readFile(
    new URL('../../docs/src/services/decision-tree.js?v=20260903c', import.meta.url),
    'utf8',
  );
  assert.match(src, /import \{ getCapabilities \} from '\.\.\/core\/registry\.js/);
  assert.match(src, /capabilities\/sop-scenarios\.js/);
  assert.match(src, /function getScenario\(scenarioId\)/);
  assert.match(src, /cap\.get\(scenarioId\)/);
});

test('bootstrap 数据源选择经注册表（行为零变化：有 token 走 api，回退 mock）', async () => {
  const src = await readFile(
    new URL('../../docs/src/core/bootstrap.js?v=20260903c', import.meta.url),
    'utf8',
  );
  assert.match(src, /getCapabilities\(\{ scope: 'data-source' \}\)/);
  assert.match(src, /apiCap\.apply\(\{ apiBaseUrl: '', authToken: savedToken \}\)/);
  assert.match(src, /mockCap\.apply\(\)/);
  assert.doesNotMatch(src, /setDataSource\('api'\)/); // 直接切换收敛到能力 apply
});

test('components.js 注册共享组件能力（scope: component，M6）', async () => {
  const src = await readFile(
    new URL('../../docs/src/modules/capabilities/components.js?v=20260903c', import.meta.url),
    'utf8',
  );
  assert.match(src, /id: 'component:todo-list'/);
  assert.match(src, /id: 'component:calendar'/);
  assert.match(src, /id: 'component:custom-select'/);
  assert.match(src, /scope: \['component'\]/);
  assert.match(src, /registerCapability\(\{[\s\S]*registerCapability\(\{/); // 多次注册
});

test('M6/M7 功能断言：component scope 过滤 + env 按环境启用', async () => {
  registry.registerCapability({ id: 'component:test-x', name: '测试组件', scope: ['component'], version: '20260830a', deps: ['state'] });
  assert.ok(
    registry.getCapabilities({ scope: 'component' }).some(c => c.id === 'component:test-x'),
    'scope:component 应过滤出组件能力'
  );
  // M7：dev-only 能力在 prod 下不可见（env 开关）
  registry.registerCapability({ id: 'env-dev-only', scope: ['all'], env: ['dev'] });
  assert.ok(registry.getCapabilities({ env: 'dev' }).some(c => c.id === 'env-dev-only'));
  assert.ok(
    !registry.getCapabilities({ env: 'prod' }).some(c => c.id === 'env-dev-only'),
    'prod 下 dev-only 能力不可见'
  );
  registry.unregisterCapability('component:test-x');
  registry.unregisterCapability('env-dev-only');
});
