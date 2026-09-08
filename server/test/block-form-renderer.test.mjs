// role: [工程师]+[AI]
// block-form-renderer.test.mjs — L3 S2：manifest → forms.js 渲染桥单测（2026-09-03）
// 契约源：WORKFLOW_BLOCK_CONTRACT.md v1.1 §六 S2（验收=渲染输出与手写 forms.js 调用等价）
// 机制：浏览器内 import manifests + form-renderer，断言 kind 映射/字段收拢/无障碍关联
// 运行：node --test server/test/block-form-renderer.test.mjs（自包含 server，TMP 需可写）
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

test('S2 渲染桥：kind 映射/字段收拢/无障碍关联正确', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(`${BASE}/login.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.readyState === 'complete', null, { timeout: 10000 });

    const result = await page.evaluate(async () => {
      const { THEME_PARTY_DAY_MANIFEST, TASKFORCE_RUN_MANIFEST } = await import('/src/workflow/blocks/manifests.js?v=20260908d');
      const { renderManifestFields, manifestFieldCatalog, fieldDomId } = await import('/src/workflow/blocks/form-renderer.js?v=20260908d');

      const themeHtml = renderManifestFields(THEME_PARTY_DAY_MANIFEST);
      const tfDefault = renderManifestFields(TASKFORCE_RUN_MANIFEST);
      const tfAll = renderManifestFields(TASKFORCE_RUN_MANIFEST, { includeDisabled: true });

      const dom = new DOMParser().parseFromString(themeHtml, 'text/html');
      const tfDom = new DOMParser().parseFromString(tfAll, 'text/html');

      return {
        theme: {
          hasTitle: themeHtml.includes('id="theme-party-day__title"') && themeHtml.includes('活动名称'),
          hasDate: themeHtml.includes('type="date"') && themeHtml.includes('id="theme-party-day__date"'),
          hasSelect: themeHtml.includes('<select') && themeHtml.includes('id="theme-party-day__type"'),
          hasOptionTheme: themeHtml.includes('主题党日'),
          labelFor: dom.querySelector('label[for="theme-party-day__title"]') !== null,
        },
        taskforce: {
          // quota enabledDefault=false：默认收起，includeDisabled 时出现
          quotaHiddenByDefault: !tfDefault.includes('taskforce-run__quota'),
          quotaIncludedWhenDisabled: tfAll.includes('taskforce-run__quota'),
          hasTextarea: tfAll.includes('<textarea') && tfAll.includes('taskforce-run__goal'),
          orgOptions: tfAll.includes('组织者') && tfAll.includes('深度参与者'),
        },
        catalog: manifestFieldCatalog(TASKFORCE_RUN_MANIFEST).length,
        domId: fieldDomId('b1', 'f1') === 'b1__f1',
      };
    });

    // 主题党日块（institution-common）
    assert.equal(result.theme.hasTitle, true, 'title 字段应渲染为 textField 且带块前缀 id');
    assert.equal(result.theme.hasDate, true, 'date 字段应渲染为原生 date input');
    assert.equal(result.theme.hasSelect, true, 'type 字段应渲染为 select（forms.js selectField）');
    assert.equal(result.theme.hasOptionTheme, true, 'select 选项应含主题党日');
    assert.equal(result.theme.labelFor, true, 'label 应与控件 for 关联（无障碍）');
    // 专班块（branch-custom，字段收拢维度②）
    assert.equal(result.taskforce.quotaHiddenByDefault, true, 'enabledDefault=false 字段应默认收起（表单条目可组装）');
    assert.equal(result.taskforce.quotaIncludedWhenDisabled, true, 'includeDisabled=true 应渲染被收拢字段（配置面预览）');
    assert.equal(result.taskforce.hasTextarea, true, 'goal 应渲染为 textarea');
    assert.equal(result.taskforce.orgOptions, true, 'roles 选项应含 组织者/深度参与者（参与人组织尝试）');
    assert.equal(result.catalog, 4, '字段目录应含 4 项');
    assert.equal(result.domId, true, '块级字段 id 前缀应生效');

    console.log('[S2] 渲染桥: 主题党日 3 字段 + 专班收拢/预览/组织选项 均正确');
  } finally {
    await browser.close();
  }
});
