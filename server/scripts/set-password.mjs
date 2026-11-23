// server/scripts/set-password.mjs — 为单个用户设置个人登录密码（波次 G · 2026-11-08）
// ════════════════════════════════════════════════════════════════
//  用途：把 `users.data.passwordHash` 写成 `scrypt$<saltHex>$<hashHex>`。
//    · 设置后该用户**只认个人密码**；未设置的用户仍走支部统一口令（`LOGIN_PASSWORD` / 非生产 '123456'）。
//    · 旧库无需回填——原统一口令无法反推个人密码；逐人按需运行本脚本即可。
//    · 不改表结构、不新增迁移：`passwordHash` 是 `users.data` 的 JSON 可选字段。
//
//  用法（在 server/ 目录）：
//    node scripts/set-password.mjs 2300010001                 # 交互输入两遍（回显关闭）
//    node scripts/set-password.mjs 2300010001 --password '…'  # 非交互（脚本 / 批量）
//    node scripts/set-password.mjs 2300010001 --db ./data.db  # 指定库（缺省 DB_PATH 或 ./data.db）
//    npm run set-password -- 2300010001
//
//  留痕：同一事务内追加一条 `auth_audit`（`what: 'password-set'`），不记录明文 / 散列。
// ════════════════════════════════════════════════════════════════
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { initDb } from '../db.js';
import { hashPassword } from '../security/password.mjs';

const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const out = { personId: '', password: null, db: process.env.DB_PATH || path.join(SERVER_DIR, 'data.db') };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--password') {
      const value = argv[i + 1];
      if (value === undefined) throw new Error('--password 缺值');
      out.password = value;
      i++;
      continue;
    }
    if (arg === '--db') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error('--db 缺值');
      out.db = value;
      i++;
      continue;
    }
    if (arg.startsWith('--')) throw new Error(`未知参数：${arg}（可用：<studentId> --password <plain> --db <path>）`);
    if (out.personId) throw new Error(`多余参数：${arg}`);
    out.personId = arg;
  }
  return out;
}

/** 关闭回显的密码输入（Windows / Linux TTY 通用）；非 TTY（管道）时直接读一行 */
function readPasswordLine(promptText) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(promptText);
    if (!stdin.isTTY) {
      let text = '';
      stdin.setEncoding('utf8');
      stdin.on('data', (chunk) => { text += chunk; });
      stdin.on('end', () => resolve(text.split(/\r?\n/)[0] || ''));
      stdin.resume();
      return;
    }
    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let buffer = '';
    const cleanup = () => {
      stdin.removeListener('data', onData);
      stdin.setRawMode(wasRaw);
      stdin.pause();
    };
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') { cleanup(); process.stdout.write('\n'); resolve(buffer); return; }
        if (ch === '\u0003') { cleanup(); process.stdout.write('\n'); process.exit(130); } // Ctrl+C
        if (ch === '\u007f' || ch === '\b') { buffer = buffer.slice(0, -1); continue; }
        buffer += ch;
      }
    };
    stdin.on('data', onData);
  });
}

async function resolvePassword(provided) {
  if (provided !== null) {
    if (provided.length === 0) throw new Error('口令不能为空');
    return provided;
  }
  const first = await readPasswordLine('个人密码：');
  if (!first) throw new Error('口令不能为空');
  const second = await readPasswordLine('再输入一次：');
  if (first !== second) throw new Error('两次输入不一致');
  return first;
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`[set-password] ${e.message}`);
    process.exit(1);
  }
  if (!args.personId) {
    console.error('[set-password] 用法：node scripts/set-password.mjs <studentId> [--password <plain>] [--db <path>]');
    process.exit(1);
  }

  const db = initDb(args.db);
  try {
    const row = db.prepare('SELECT data FROM users WHERE id = ?').get(args.personId);
    if (!row) {
      console.error(`[set-password] 未找到用户：${args.personId}（库：${args.db}）`);
      process.exit(1);
    }
    const password = await resolvePassword(args.password);
    const user = { ...JSON.parse(row.data), passwordHash: hashPassword(password) };
    const at = new Date().toISOString();
    const audit = { id: `auth-${randomUUID().slice(0, 8)}`, what: 'password-set', targetPersonId: String(args.personId), by: 'cli:set-password', at };
    db.transaction(() => {
      db.prepare('UPDATE users SET data = ? WHERE id = ?').run(JSON.stringify(user), args.personId);
      db.prepare('INSERT OR REPLACE INTO auth_audit (id, data) VALUES (?, ?)').run(audit.id, JSON.stringify(audit));
    })();
    console.log(`[set-password] 已为 ${args.personId} 设置个人密码；该账号登录只认此密码（未设置者仍用支部统一口令）。`);
  } finally {
    db.close();
  }
}

main().catch((e) => {
  console.error(`[set-password] 失败：${e.message}`);
  process.exit(1);
});
