// role: [工程师]+[AI]
// block-manifest.test.mjs — L3 块 manifest 校验器单测（S1，2026-09-03）
// 契约源：content/04_web_design/evolution/WORKFLOW_BLOCK_CONTRACT.md v1.1
// 机制：浏览器内 import workflow/blocks/manifests.js（与运行时同解析），跑正/反样例断言
// 运行：node --test server/test/block-manifest.test.mjs（自包含 server，TMP 需指向可写目录）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
import {
  BLOCK_MANIFESTS, validateBlockManifest, CAPABILITY_PROVENANCE,
} from '../../docs/src/workflow/blocks/manifests.js?v=20260928s';
import { assertComposeValid } from '../../docs/src/core/module-compose.js?v=20260928s';

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
    await page.route('**://cdn.tailwindcss.com/**', (r) => r.abort());
    await page.goto(`${BASE}/login.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.readyState === 'complete', null, { timeout: 10000 });

    const result = await page.evaluate(async () => {
      const { BLOCK_MANIFESTS, validateBlockManifest } = await import('/src/workflow/blocks/manifests.js?v=20260928s');
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

// ════════════════════════════════════════════════════════════════
//  S2–S4「**未同步即红**」系列（G1 第④项，2026-09-28）
// ════════════════════════════════════════════════════════════════
//  病灶：manifest 是**声明式元数据**，此前只有「加载期 console.warn、不阻断」（manifests.js 末段）：
//    ① `sopRef` 只校验「非空字符串」，**不校验制度文件真实存在**——2026-09-13 实测断链 2 处，
//       靠人肉 content 自检才发现（块指不回制度文本＝溯源失效）；
//    ② `depends` / `conflictsWith` 引用缺失 / 互斥同含 / 成环，`assertComposeValid` 的异常
//       被 `try{...}catch{console.warn}` 吞掉——**组合错配可以静默上线**；
//    ③ `capabilityId` 只在「该 id 恰好在 CAPABILITY_PROVENANCE 里登记」时才对照 provenance，
//       **未登记的 id 被静默放过**（能力名写错 / 新块漏登无人知）。
//  本组把这三项从「警告」升级为「红」：**清单与实现不同步即停**（不再靠人记得）。
const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));

test('S2 未同步即红：manifest.sopRef 指向的制度文件必须真实存在（防制度溯源断链回潮）', () => {
  const missing = BLOCK_MANIFESTS
    .filter((m) => !existsSync(join(REPO_ROOT, m.sopRef)))
    .map((m) => `${m.blockId} → ${m.sopRef}`);
  assert.deepEqual(missing, [],
    '以下块的 sopRef 指向不存在的文件（块必须能指回真实制度文本）：\n  ' + missing.join('\n  '));
  console.log(`[S2] sopRef 制度溯源：${BLOCK_MANIFESTS.length} 块全部指向真实文件`);
});

test('S3 未同步即红：块组合声明必须真合法（引用 ∈ 块清单 / 无互斥同含 / depends 不成环）', () => {
  // 加载期只 warn；这里要求**必须不抛**。
  assert.doesNotThrow(() => assertComposeValid(BLOCK_MANIFESTS),
    '块组合声明不合法（depends/conflictsWith 与块清单不同步）');
  const ids = new Set(BLOCK_MANIFESTS.map((m) => m.blockId));
  for (const m of BLOCK_MANIFESTS) {
    for (const dep of m.depends || []) {
      assert.ok(ids.has(dep), `${m.blockId}.depends 引用了不存在的块「${dep}」`);
    }
    for (const c of m.conflictsWith || []) {
      assert.ok(ids.has(c), `${m.blockId}.conflictsWith 引用了不存在的块「${c}」`);
    }
  }
  console.log(`[S3] 组合声明：${BLOCK_MANIFESTS.length} 块合法（引用均在册、无互斥同含、depends 无环）`);
});

test('S4 未同步即红：manifest.capabilityId 必须在 CAPABILITY_PROVENANCE 登记（防能力名写错/新块漏登）', () => {
  const unregistered = BLOCK_MANIFESTS
    .map((m) => m.capabilityId)
    .filter((id) => !Object.prototype.hasOwnProperty.call(CAPABILITY_PROVENANCE, id));
  assert.deepEqual(unregistered, [],
    '以下 capabilityId 未在 manifests.js::CAPABILITY_PROVENANCE 登记（原先被静默放过）：\n  '
    + unregistered.join('\n  ')
    + '\n修法：新块在本表登记「capabilityId → 制度来源」（institution-common | branch-custom）。');
  console.log(`[S4] capabilityId 登记：${BLOCK_MANIFESTS.length} 块全部在册`);
});
