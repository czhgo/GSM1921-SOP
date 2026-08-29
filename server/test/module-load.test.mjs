// role: [工程师]+[AI]
// module-load.test.mjs — 模块加载完整性审计（原 edit-integrity-audit.mjs，T-283 书记指令：共性问题全局化）
// 背景判例（2026-08-27）：多轮 Edit 反复增删同一文件时出现系统性损坏——
//   ①同作用域重复声明（agendaList ×2 → SyntaxError）
//   ②函数被误删仍被调用（_addAgendaRow → ReferenceError）
//   ③绑定代码被误删（inspector 议程编辑按钮绑定丢失 → 点击无效）
//   ④声明被误删仍被引用（agenda → ReferenceError）
// 机制：浏览器内 import 全部 docs/src 模块，任何语法/重复声明/未定义顶层引用都会在 import 时抛错
// 运行：node --test server/test/module-load.test.mjs（自包含 server）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
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

// 收集 docs/src 全部 .js 的相对路径（排除 entries/* 顶层入口——由页面装配时加载）
function collectJsFiles(dir, root) {
  const out = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'entries' && dir === root) continue;
      out.push(...collectJsFiles(p, root));
    } else if (e.name.endsWith('.js')) {
      out.push(relative(root, p).replace(/\\/g, '/'));
    }
  }
  return out;
}

test('E1 编辑完整性：docs/src 全部模块可加载（无语法/重复声明/未定义引用/误删调用）', async () => {
  const root = fileURLToPath(new URL('../../docs/src/', import.meta.url));
  const files = collectJsFiles(root, root);
  assert.ok(files.length > 50, `应收集到 50+ 模块，实际 ${files.length}`);

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(`${BASE}/login.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.readyState === 'complete', null, { timeout: 10000 });

    const { failed, total } = await page.evaluate(async (mods) => {
      const failures = [];
      let done = 0;
      for (const rel of mods) {
        try {
          await import(`/src/${rel}?v=20260827a`);
        } catch (e) {
          failures.push(`${rel} :: ${String(e).slice(0, 140)}`);
        }
        done++;
      }
      return { failed: failures, total: done };
    }, files);

    console.log(`[E1] 模块加载: ${total - failed.length}/${total} 通过`);
    if (failed.length > 0) {
      console.log('[E1] 无法加载的模块：');
      failed.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    }
    assert.equal(failed.length, 0, `编辑完整性失败 ${failed.length} 项:\n${failed.join('\n')}`);
  } finally {
    await browser.close();
  }
});
