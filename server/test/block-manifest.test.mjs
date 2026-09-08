// role: [工程师]+[AI]
// block-manifest.test.mjs — L3 块 manifest 校验器单测（S1，2026-09-03）
// 契约源：content/04_web_design/evolution/WORKFLOW_BLOCK_CONTRACT.md v1.1
// 机制：浏览器内 import workflow/blocks/manifests.js（与运行时同解析），跑正/反样例断言
// 运行：node --test server/test/block-manifest.test.mjs（自包含 server，TMP 需指向可写目录）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';

let server;
let BASE;

before(async () => {
  const app = createApp({ dbPath: ':memory:' });
  await seedDatabase(app.locals.db);
  server = app.listen(0);
  BASE = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    server.closeAllConnections?.();
    await new Promise((r) => server.close(r));
  }
});

test('S1 块 manifest：试点清单合规 + 校验器正/反样例', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(`${BASE}/login.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.readyState === 'complete', null, { timeout: 10000 });

    const result = await page.evaluate(async () => {
      const { BLOCK_MANIFESTS, validateBlockManifest } = await import('/src/workflow/blocks/manifests.js?v=20260908d');
      const out = { ids: [], allOk: true, invalidCount: 0, antiExamples: {} };

      // 正向：全部试点清单合规
      BLOCK_MANIFESTS.forEach((m) => {
        out.ids.push(m.blockId);
        const res = validateBlockManifest(m);
        if (!res.ok) { out.allOk = false; out.invalidCount++; }
      });

      // 反例 1：provenance 非法（通用制度谎报为支部自创）
      const bad1 = structuredClone(BLOCK_MANIFESTS[0]);
      bad1.provenance = 'branch-custom';
      out.antiExamples.provenance = validateBlockManifest(bad1).ok === false;

      // 反例 2：字段 kind 非法（绕过 forms.js 积木目录）
      const bad2 = structuredClone(BLOCK_MANIFESTS[0]);
      bad2.inputs.fields[0].kind = 'radioField';
      out.antiExamples.kind = validateBlockManifest(bad2).ok === false;

      // 反例 3：产出块不在 OUTPUT_BLOCK_DEFS 目录
      const bad3 = structuredClone(BLOCK_MANIFESTS[0]);
      bad3.outputs.outputBlocks.push('not-a-block');
      out.antiExamples.outputBlock = validateBlockManifest(bad3).ok === false;

      // 反例 4：发起角色键未知
      const bad4 = structuredClone(BLOCK_MANIFESTS[0]);
      bad4.validation.initiatorRoles = ['super-admin'];
      out.antiExamples.role = validateBlockManifest(bad4).ok === false;

      // 反例 5：字段 id 重复
      const bad5 = structuredClone(BLOCK_MANIFESTS[0]);
      bad5.inputs.fields.push({ ...bad5.inputs.fields[0] });
      out.antiExamples.fieldDup = validateBlockManifest(bad5).ok === false;

      return out;
    });

    assert.deepEqual(result.ids, ['theme-party-day', 'taskforce-run'], '试点块清单应为 主题党日 + 专班');
    assert.equal(result.allOk, true, `试点 manifest 应全部合规（不合规 ${result.invalidCount} 个）`);
    assert.equal(result.invalidCount, 0);
    assert.equal(result.antiExamples.provenance, true, 'provenance 反例应被拦截');
    assert.equal(result.antiExamples.kind, true, 'kind 反例应被拦截');
    assert.equal(result.antiExamples.outputBlock, true, '未知产出块应被拦截');
    assert.equal(result.antiExamples.role, true, '未知角色键应被拦截');
    assert.equal(result.antiExamples.fieldDup, true, '字段 id 重复应被拦截');

    console.log(`[S1] 块 manifest 校验: 清单 ${result.ids.join(' + ')} 合规，反例 5/5 拦截`);
  } finally {
    await browser.close();
  }
});
