// server/test/backup-restore.test.mjs — 备份 → 恢复**演练**（2026-09-25）
//
// 病灶：`server/scripts/backup.mjs`（P0-5）与 `backup.ps1` 入口早已有，但**从未演练过「恢复」**——
//   「备份能跑通」不等于「坏了能回来」。本件把恢复当**可复现的验收**做的：
//   在临时库造数据 → **真跑 `scripts/backup.mjs` 真实入口（child process）** → 断言备份副本**内容**一致
//   （≥ 行数 + 逐值 + 嵌套字段；**不是**只断言「文件存在」那种假绿）→ 破坏原库 → 恢复到**新路径** →
//   `PRAGMA integrity_check` 断言 `ok` + 逐值核对 + 附件还原。
//
// ⚠ **备份最容易骗人的地方**＝WAL 未 checkpoint 的数据：库是 WAL 模式，最近提交可能只在 `data.db-wal` 里
//   未并回主库 ⇒ 「只拷主文件」会丢尾部。本件**实测**两件事并如实断言：
//     ① `scripts/backup.mjs` 走 SQLite 在线备份 API（`db.backup()`）⇒ 副本**含** WAL 内容（行数齐全）；
//     ② 反证：只 `copy data.db`（不走备份 API）**丢** WAL 尾部（行数偏少）——这正是不能用 `copy` 的原因。
//
// 运行：`node --test server/test/backup-restore.test.mjs`（纯 node，无浏览器 / 无服务依赖）
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import Database from 'better-sqlite3';
import { initDb } from '../db.js';

const SERVER = path.resolve(import.meta.dirname, '..');
const BACKUP_SCRIPT = path.join(SERVER, 'scripts', 'backup.mjs');

const SEED = [
  { id: 'bk-1', role: 'secretary', name: '备份甲' },
  { id: 'bk-2', role: 'member', name: '备份乙', nested: { tags: ['x', 'y'], deep: { n: 42 } } },
  { id: 'bk-3', role: 'organizer', name: '备份丙' },
];
const UPLOAD_TEXT = '附件内容-备份演练';

let root, dbPath, uploadsDir, outDir, db;

before(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'gsm-backup-'));
  dbPath = path.join(root, 'data.db');
  uploadsDir = path.join(root, 'uploads');
  outDir = path.join(root, 'bak');
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.writeFileSync(path.join(uploadsDir, 'note.txt'), UPLOAD_TEXT);
  db = initDb(dbPath);
  const stmt = db.prepare('INSERT INTO users (id, data) VALUES (?, ?)');
  for (const r of SEED) stmt.run(r.id, JSON.stringify(r));
});

after(() => {
  try { db.close(); } catch { /* 已在用例内关闭 */ }
  fs.rmSync(root, { recursive: true, force: true });
});

test('B1 备份→恢复演练：真跑 scripts/backup.mjs ⇒ 破坏原库 ⇒ 恢复到新路径 ⇒ 完整性 + 行/字段逐值一致', () => {
  // ── 前提：库在 WAL 模式，且确有未 checkpoint 的数据（否则本演练证明不了「备份拿到 WAL 内容」）──
  assert.equal(String(db.pragma('journal_mode', { simple: true })).toLowerCase(), 'wal', '前提：库应为 WAL 模式');
  const walSize = fs.existsSync(dbPath + '-wal') ? fs.statSync(dbPath + '-wal').size : 0;
  assert.ok(walSize > 0, `前提：未 checkpoint 的 WAL 非空（实测 ${walSize} B）`);

  const srcRows = db.prepare('SELECT id, data FROM users ORDER BY id').all().map((r) => r.data);

  // ── ① 真跑备份脚本（真实入口，child process；禁用「只断言文件存在」）──
  const res = spawnSync(process.execPath,
    [BACKUP_SCRIPT, '--db', dbPath, '--out', outDir, '--uploads', uploadsDir],
    { encoding: 'utf8' });
  console.log('[B1] scripts/backup.mjs 输出：\n' + (res.stdout || '').trim());
  assert.equal(res.status, 0, `备份脚本应退出码 0（stderr：${(res.stderr || '').trim()}）`);

  const bakDb = path.join(outDir, 'data.db');
  assert.ok(fs.existsSync(bakDb), '备份应产出 data.db');

  // ── ② 备份副本必须**含 WAL 未 checkpoint 的数据**：行数 + 逐值一致 ──
  const bk = new Database(bakDb, { readonly: true });
  let bakRows;
  try {
    assert.equal(bk.pragma('integrity_check', { simple: true }), 'ok', '备份副本须 integrity ok');
    bakRows = bk.prepare('SELECT data FROM users ORDER BY id').all().map((r) => r.data);
  } finally { bk.close(); }
  assert.deepEqual(bakRows, srcRows, '备份副本的 users 行须与源库逐值一致（含 WAL 未 checkpoint 部分）');
  for (const s of ['-wal', '-shm']) fs.rmSync(bakDb + s, { force: true });

  // ── ③ 反证：只拷主文件（不走备份 API）会丢 WAL 尾部 ──
  const naive = path.join(root, 'naive-copy.db');
  fs.copyFileSync(dbPath, naive);
  const nd = new Database(naive, { readonly: true });
  let naiveRows = 0;
  try {
    try { naiveRows = nd.prepare('SELECT COUNT(*) c FROM users').get().c; }
    catch { naiveRows = 0; } // 主文件未 checkpoint ⇒ 连 users 表都还没落进主文件（比「少几行」更强的证据）
  } finally { nd.close(); }
  for (const s of ['', '-wal', '-shm']) fs.rmSync(naive + s, { force: true });
  console.log(`[B1] 实测：WAL 未 checkpoint=${walSize} B · 备份副本 users=${bakRows.length} 行 · 只拷主文件 users=${naiveRows} 行`);
  assert.ok(naiveRows < srcRows.length,
    `「只拷主文件」应丢 WAL 尾部（实测 ${naiveRows} < ${srcRows.length}）——若相等说明 WAL 已被 checkpoint，本演练的 WAL 前提失效`);

  // ── ④ 破坏原库：关连接后删库文件（含 -wal / -shm），模拟故障 ──
  db.close();
  for (const s of ['', '-wal', '-shm']) fs.rmSync(dbPath + s, { force: true });
  assert.ok(!fs.existsSync(dbPath), '前置：原库已删除（模拟故障）');

  // ── ⑤ 恢复：把备份的 data.db 复制到**新路径**，附件目录也一并还原 ──
  const restoreDb = path.join(root, 'restored', 'data.db');
  fs.mkdirSync(path.dirname(restoreDb), { recursive: true });
  fs.copyFileSync(bakDb, restoreDb);
  const restoreUploads = path.join(root, 'restored-uploads');
  fs.cpSync(path.join(outDir, 'uploads'), restoreUploads, { recursive: true });

  // ── ⑥ 恢复后断言：integrity ok + 行数 + 逐值（含嵌套字段） + 附件 ──
  const rd = new Database(restoreDb, { readonly: true });
  try {
    assert.equal(rd.pragma('integrity_check', { simple: true }), 'ok', '恢复后必须 integrity_check=ok');
    const got = rd.prepare('SELECT id, data FROM users ORDER BY id').all().map((r) => r.data);
    assert.equal(got.length, srcRows.length, '恢复后 users 行数须与源一致');
    assert.deepEqual(got, srcRows, '恢复后 users 须逐值一致');
    const byId = new Map(got.map((d) => { const o = JSON.parse(d); return [o.id, o]; }));
    assert.equal(byId.get('bk-1').role, 'secretary', '关键字段逐值：bk-1.role');
    assert.deepEqual(byId.get('bk-2').nested, { tags: ['x', 'y'], deep: { n: 42 } }, '嵌套字段须逐值一致');
    assert.equal(byId.get('bk-3').name, '备份丙', '关键字段逐值：bk-3.name');
  } finally { rd.close(); }
  assert.equal(fs.readFileSync(path.join(restoreUploads, 'note.txt'), 'utf8'), UPLOAD_TEXT, '附件须一并恢复');
  console.log('[B1] ✔ 破坏原库 → 恢复到新路径 → integrity_check=ok、行/字段逐值一致、附件还原');
});
