// role: [工程师]+[AI]
// server/scripts/probe-stage.mjs — 阶段结果探针（2026-11-22 批次 600 · D-910）
//
// 定位：守卫的第一职责是「探测阶段结果、快速定位断点」，不是维护逐条白名单。
//   本探针只回答「哪一步断了」，不判业务细节；细节由 daily / 语义守卫回答。
// 用法：npm run probe:stage [-- --base http://127.0.0.1:3000]
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const argBase = process.argv.indexOf('--base');
const BASE = argBase > 0 ? process.argv[argBase + 1] : (process.env.PROBE_BASE || 'http://127.0.0.1:3000');

const rows = [];
const record = (name, ok, detail) => { rows.push({ name, ok, detail }); };

async function probe(name, fn) {
  try {
    const detail = await fn();
    record(name, true, detail || 'OK');
  } catch (e) {
    record(name, false, e && e.message ? e.message : String(e));
  }
}

const status = async (path, init) => {
  const res = await fetch(`${BASE}${path}`, init);
  return res.status;
};

await probe('服务可用（/login.html）', async () => {
  const s = await status('/login.html');
  if (s !== 200) throw new Error(`HTTP ${s}`);
  return 'HTTP 200';
});

await probe('核心页 6 个返回 200', async () => {
  const pages = ['/index.html', '/notice.html', '/login.html', '/feedback.html', '/workspace/secretary.html', '/help.html'];
  const bad = [];
  for (const p of pages) {
    const s = await status(p);
    if (s !== 200) bad.push(`${p}=${s}`);
  }
  if (bad.length) throw new Error(bad.join(' · '));
  return `${pages.length} 页全 200`;
});

await probe('写口门未被放宽（未登录）', async () => {
  const patch = await status('/api/v1/issues/probe-not-exist', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'closed' }),
  });
  const reaction = await status('/api/v1/issues/probe-not-exist/reactions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'thumbsUp' }),
  });
  if (patch !== 401 || reaction !== 401) throw new Error(`PATCH=${patch} · reactions=${reaction}（期望均 401）`);
  return 'PATCH / reactions 均 401';
});

await probe('契约表数可解析', async () => {
  const mod = await import('../data/domain-contract.mjs');
  const tables = Object.values(mod).find((v) => Array.isArray(v) && v.length >= 20);
  if (!tables) throw new Error('未找到 ≥20 的表清单导出');
  return `${tables.length} 张表`;
});

await probe('docs 相对链接存在', async () => {
  const files = readdirSync(join(ROOT, 'docs')).filter((n) => n.endsWith('.html'));
  const bad = [];
  for (const f of files) {
    const src = readFileSync(join(ROOT, 'docs', f), 'utf8');
    for (const m of src.matchAll(/href="(\.\/[^"#?]+\.html)[^"]*"/g)) {
      const target = join(ROOT, 'docs', m[1].replace(/^\.\//, ''));
      if (!existsSync(target) || !statSync(target).isFile()) bad.push(`${f} → ${m[1]}`);
    }
  }
  if (bad.length) throw new Error(bad.slice(0, 5).join(' · '));
  return `${files.length} 个 html 的相对链接均可解析`;
});

await probe('测试层计数（只打印）', async () => {
  const mod = await import('../test-tier-registry.mjs');
  return `daily ${mod.dailyFiles.length} · guards ${mod.guardsFiles.length} · precommit ${mod.precommitFiles.length}`;
});

const pad = (s, n) => String(s).padEnd(n, ' ');
console.log('\n阶段探针（probe:stage）');
console.log('─'.repeat(72));
for (const r of rows) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${pad(r.name, 24)} ${r.detail}`);
console.log('─'.repeat(72));
const failed = rows.filter((r) => !r.ok);
console.log(`${failed.length ? 'FAIL' : 'PASS'} · ${rows.length - failed.length}/${rows.length}`);
process.exit(failed.length ? 1 : 0);
