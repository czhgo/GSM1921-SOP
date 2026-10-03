// role: [工程师]+[AI]
// block-manifest.test.mjs — L3 块 manifest 校验器单测（S1，2026-09-03）
// 契约源：content/04_web_design/evolution/WORKFLOW_BLOCK_CONTRACT.md v1.1
// 机制：浏览器内 import workflow/blocks/manifests.js（与运行时同解析），跑正/反样例断言
// 运行：node --test server/test/block-manifest.test.mjs（自包含 server，TMP 需指向可写目录）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
import {
  BLOCK_MANIFESTS, validateBlockManifest, CAPABILITY_PROVENANCE,
} from '../../docs/src/workflow/blocks/manifests.js?v=20261003g';
import { assertComposeValid } from '../../docs/src/core/base/module-compose.js?v=20261003g';
import { sopDatabase } from '../../docs/src/workflow/sopData.js?v=20261003g';
import * as DEF_MODULE from '../../docs/src/workflow/definitions.js?v=20261003g';

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
      const { BLOCK_MANIFESTS, validateBlockManifest } = await import('/src/workflow/blocks/manifests.js?v=20261003g');
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

    assert.deepEqual(result.ids, [
      'theme-party-day', 'taskforce',
      'branch-party-meeting', 'branch-committee', 'party-group-meeting', 'party-lecture',
    ], '块清单 = S1 试点两块 ＋ 2026-09-28 批次 248 铺开的三会一课四块（增删块须同批改准本断言）');
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

// ════════════════════════════════════════════════════════════════
//  S5 契约 §二「注册表对应」机检（2026-09-28 批次 247）
// ════════════════════════════════════════════════════════════════
//  契约 `WORKFLOW_BLOCK_CONTRACT §二 · 字段取值合法性` 明写：
//    「blockId … **与 capability/scenario id 一一对应，注册表缺失即契约失效**」。
//  实测（2026-09-28）：该条**此前无任何机检**，且**试点块自己就违反它**（2026-09-29 批次 268 已收口）——
//    `taskforce` 不在 capability（`core/boot/registry.js` 注册项）/ scenario（`sopData.js`）/
//    definition（`definitions.js`）三表任一处；`capabilityId: 'taskforce'` 亦非注册能力。
//    （`theme-party-day` 是 **definition id** ⇒ 合法，不属违规。）
//  本项把该条落成机检：**两个 id 必须落在注册集合内，或落在下方 `REGISTRY_EXCEPTIONS`
//  显式例外台账里并写明理由**（台账 ＋ 机检，同 §0.2 台账式守卫体例）。
//  三份集合一律**从单一源实读**（不手抄）：scenario ← `sopData.js`；definition ← `definitions.js`；
//  capability ← 扫 `docs/src/capabilities/*.js` 里 `registerCapability({ … id: '…' })`。
const CAP_DIR = join(REPO_ROOT, 'docs', 'src', 'capabilities');

/** 契约 §二 允许的**显式例外**（每条须写理由；新块一律走注册三表，不得随手加例外）
 *  ⚠ 2026-09-29 批次 268：原理由已消解 ⇒ **本台账清零**——`taskforce` 已由
 *  `docs/src/capabilities/taskforce.js` 注册为真能力，试点块 `blockId` 亦同批改准为 `taskforce`
 *  （与 `capabilityId` 同名）⇒ 契约 §二 恢复「唯一口径」（H-10 推荐档 ① 落地）。
 *  今后**新块一律走注册三表**；确需例外者在此逐条写理由。 */
const REGISTRY_EXCEPTIONS = {
  blockId: {},
  capabilityId: {},
};

/** 从单一源实读三类已注册 id（scenario / definition / capability） */
function _registeredIds() {
  const scenarios = new Set((sopDatabase.scenarios || []).map((s) => s.scenarioId));
  const definitions = new Set(Object.values(DEF_MODULE)
    .filter((v) => v && typeof v === 'object' && typeof v.id === 'string').map((v) => v.id));
  const capabilities = new Set();
  for (const f of readdirSync(CAP_DIR).filter((n) => n.endsWith('.js'))) {
    const src = readFileSync(join(CAP_DIR, f), 'utf8');
    // 只取 registerCapability 声明块内的 id（避免把文件里其它 id 字面量当成能力名）
    for (const m of src.matchAll(/registerCapability\(\{[\s\S]{0,400}?\bid:\s*'([^']+)'/g)) capabilities.add(m[1]);
  }
  return { scenarios, definitions, capabilities };
}

/** 纯函数：返回「既不在注册集合、也不在例外台账」的 id 清单（便于反例直接调用） */
function _registryMisses(manifests, sets, exceptions) {
  const known = new Set([...sets.scenarios, ...sets.definitions, ...sets.capabilities]);
  const out = [];
  for (const m of manifests) {
    if (!known.has(m.blockId) && !(exceptions.blockId || {})[m.blockId]) {
      out.push(`${m.blockId}（blockId 不在 capability / scenario / definition 三表，且未登记例外）`);
    }
    if (!sets.capabilities.has(m.capabilityId) && !(exceptions.capabilityId || {})[m.capabilityId]) {
      out.push(`${m.blockId}.capabilityId=${m.capabilityId}（不在能力注册表，且未登记例外）`);
    }
  }
  return out;
}

test('S5 契约 §二机检：manifest 的 blockId / capabilityId 必须落在注册三表或显式例外台账内', () => {
  const sets = _registeredIds();
  // 非空转：三表都必须真读到规模（解析写坏 ⇒ 集合空 ⇒ 什么都不缺 ⇒ 判据恒真）
  assert.ok(sets.scenarios.size >= 5, `只读到 ${sets.scenarios.size} 个 SOP 场景 id（下限 5）：判据或单一源被写坏`);
  assert.ok(sets.definitions.size >= 3, `只读到 ${sets.definitions.size} 个 workflow definition id（下限 3）`);
  assert.ok(sets.capabilities.size >= 10, `只读到 ${sets.capabilities.size} 个能力 id（下限 10）`);
  const misses = _registryMisses(BLOCK_MANIFESTS, sets, REGISTRY_EXCEPTIONS);
  assert.deepEqual(misses, [],
    '以下 id 不满足契约 §二「与 capability / scenario id 一一对应」且未登记例外：\n  '
    + misses.join('\n  ')
    + '\n修法：改用注册 id；确需例外则在本文件 REGISTRY_EXCEPTIONS 写明理由。');
  // 反例锁死（证明判据不是恒真）：一个未注册 id 必须被报出
  const probe = [...BLOCK_MANIFESTS, { blockId: 'ghost-not-registered', capabilityId: 'ghost-cap' }];
  assert.equal(_registryMisses(probe, sets, REGISTRY_EXCEPTIONS).length, 2,
    '反例：未注册的 blockId / capabilityId 必须各报 1 条（否则判据恒真、等于没检）');
  console.log(`[S5] 契约 §二：${BLOCK_MANIFESTS.length} 块 id 均在册`
    + `（scenario ${sets.scenarios.size} / definition ${sets.definitions.size} / capability ${sets.capabilities.size}`
    + `；例外 ${Object.keys(REGISTRY_EXCEPTIONS.blockId).length + Object.keys(REGISTRY_EXCEPTIONS.capabilityId).length} 条）`);
});
