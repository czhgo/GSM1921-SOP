// ════════════════════════════════════════════════════════════════
//  server/scripts/preflight-cutover.mjs —— 换轨前置体检（2026-11-02 批次 527 · Wave 3）
// ════════════════════════════════════════════════════════════════
//  用途：在一个**候选生产库**上逐项检查，回答「这个库能不能直接换轨上线」。
//  用法（在 server/ 目录下）：
//    node scripts/preflight-cutover.mjs --db <库> [--uploads <附件目录>] [--strict]
//
//  检查项：
//    ① schema 版本：user_version 必须 == 代码 SCHEMA_VERSION（旧库/新库都阻断）；
//    ② 表齐全（资源/语义/工作组/版本/种子元数据）；
//    ③ 非空库：users / branches 至少各 1 行；
//    ④ seed-baseline：至少 1 名 party-staff（党委自举门）＋ 至少 1 个支部；
//       生产最小角色账号（支书/副支书/组织/宣传/纪检/组长）缺失 ⇒ 警告；
//    ⑤ 演示数据残留：users 演示账号 / `act-<短数字>` / `seed_meta.mode=demo` ⇒ 默认警告，
//       `--strict` 升为阻断（真实换轨**必须** `--strict` 且零残留）；
//    ⑥ 孤儿外键：users→branches、activities→branch、attendances→activity/person；
//    ⑦ 附件一致性：attachments 记录必须有对应物理文件（缺失=阻断）；uploads 里无记录的孤儿文件=警告。
//
//  输出：阻断（⛔）与警告（⚠）清单；**有阻断即 exit 1**；`--strict` 时警告也致 exit 1。
//  处置见 deploy/CUTOVER_RUNBOOK.md。
// ════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SCHEMA_VERSION, RESOURCE_TABLES, SEMANTIC_TABLES, WORKGROUP_TABLES, RETIRED_RESOURCE_TABLES,
} from '../db.js';
import { detectDemoSeedRows, loadDemoUserIds } from '../demo-data-guard.js';

const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RUNBOOK = 'deploy/CUTOVER_RUNBOOK.md';
const REQUIRED_ROLES = ['secretary', 'deputy-secretary', 'org-commissioner', 'prop-commissioner', 'disc-commissioner', 'leader'];

function parseArgs(argv) {
  const out = { db: null, uploads: null, strict: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--strict') { out.strict = true; continue; }
    if (!arg.startsWith('--')) throw new Error(`未知参数：${arg}`);
    const key = arg.slice(2);
    if (!['db', 'uploads'].includes(key)) throw new Error(`未知参数：${arg}（可用：--db --uploads --strict）`);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`参数 --${key} 缺值`);
    out[key] = value;
    i++;
  }
  if (!out.db) throw new Error('必须指定 --db <库路径>');
  return out;
}

function hasTable(db, name) {
  return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name));
}

const parseRows = (db, table) => (hasTable(db, table)
  ? db.prepare(`SELECT data FROM ${table}`).all().map((r) => { try { return JSON.parse(r.data); } catch { return null; } }).filter(Boolean)
  : []);

function listFiles(dir) {
  const out = [];
  if (!dir || !fs.existsSync(dir)) return out;
  const walk = (d) => {
    for (const name of fs.readdirSync(d)) {
      const full = path.join(d, name);
      const st = fs.statSync(full);
      if (st.isDirectory()) walk(full);
      else out.push(path.basename(full));
    }
  };
  walk(dir);
  return out;
}

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); } catch (e) {
    console.error(`[preflight] ✖ ${e.message}`);
    process.exit(1);
  }
  const dbPath = path.resolve(args.db);
  const uploadsDir = path.resolve(args.uploads || process.env.UPLOAD_DIR || path.join(SERVER_DIR, 'uploads'));
  const blockers = [];
  const warnings = [];
  const block = (msg) => blockers.push(msg);
  const warn = (msg) => warnings.push(msg);

  if (!fs.existsSync(dbPath)) {
    console.error(`[preflight] ⛔ 库不存在：${dbPath}`);
    console.error(`[preflight]   处置见 ${RUNBOOK}。`);
    process.exit(1);
  }

  const { default: Database } = await import('better-sqlite3');
  let db;
  try {
    db = new Database(dbPath, { readonly: true, fileMustExist: true });
  } catch (e) {
    console.error(`[preflight] ⛔ 无法打开库：${e.message}`);
    process.exit(1);
  }

  try {
    // ① schema 版本
    const userVersion = Number(db.pragma('user_version', { simple: true })) || 0;
    if (userVersion !== SCHEMA_VERSION) {
      block(`schema 版本不匹配：库 user_version=${userVersion} · 代码 SCHEMA_VERSION=${SCHEMA_VERSION}`
        + `${userVersion > SCHEMA_VERSION ? '（库比代码新，禁止降级）' : '（库落后，先由匹配版本代码迁移）'}`);
    }

    // ② 表齐全
    const expectedTables = [
      ...RESOURCE_TABLES.filter((t) => !RETIRED_RESOURCE_TABLES.has(t)),
      ...SEMANTIC_TABLES,
      ...WORKGROUP_TABLES,
      'collection_versions', 'seed_meta', 'users', 'branches', 'attachments',
    ];
    const missing = [...new Set(expectedTables)].filter((t) => !hasTable(db, t));
    if (missing.length) block(`缺表：${missing.join(', ')}`);

    const count = (table) => (hasTable(db, table) ? db.prepare(`SELECT COUNT(*) c FROM ${table}`).get().c : 0);
    // ③ 非空库
    const usersCount = count('users');
    const branchesCount = count('branches');
    if (usersCount === 0) block('空库：users 0 行（无法登录）');
    if (branchesCount === 0) block('空库：branches 0 行（没有换轨落点）');

    // ④ seed-baseline 账号 / 支部
    const users = parseRows(db, 'users');
    const branches = parseRows(db, 'branches');
    const partyStaff = users.filter((u) => u.role === 'party-staff');
    if (usersCount > 0 && !partyStaff.length) block('缺少党委账号（role=party-staff）：空库自举门无法通过');
    const branchIds = new Set(branches.map((b) => String(b.id)));
    if (branchesCount > 0 && !branchIds.has('br-b1')) {
      warn('库内没有 br-b1（全仓缺省支部兜底指向它）；请确认所有写入都显式带 branchId');
    }
    const presentRoles = new Set(users.map((u) => u.role));
    const missingRoles = REQUIRED_ROLES.filter((r) => !presentRoles.has(r));
    if (usersCount > 0 && missingRoles.length) {
      warn(`生产最小角色账号不全：缺 ${missingRoles.join('、')}（生产首启会自动补；已有库请手工确认）`);
    }

    // ⑤ 演示数据残留（默认警告；--strict 阻断）
    const demoIds = await loadDemoUserIds();
    const demo = detectDemoSeedRows(db, { demoUserIds: demoIds });
    if (demo.demo) {
      warn(`演示数据残留：users ${demo.demoUsers.length} · activities ${demo.seedActivities.length}`
        + ` · seed_meta.mode=${demo.seedMode ?? '未登记'}（真实换轨必须为 0）`);
    }

    // ⑥ 孤儿外键
    const userIds = new Set(users.map((u) => String(u.id)));
    const activities = parseRows(db, 'activities');
    const activityIds = new Set(activities.map((a) => String(a.id)));
    const orphanUsers = users.filter((u) => u.branchId !== null && u.branchId !== undefined && !branchIds.has(String(u.branchId)));
    if (orphanUsers.length) block(`users→branches 孤儿 ${orphanUsers.length}：${orphanUsers.slice(0, 5).map((u) => u.id).join(', ')}${orphanUsers.length > 5 ? ' …' : ''}`);
    const orphanActivities = activities.filter((a) => a.branchId !== null && a.branchId !== undefined && !branchIds.has(String(a.branchId)));
    if (orphanActivities.length) block(`activities→branch 孤儿 ${orphanActivities.length}：${orphanActivities.slice(0, 5).map((a) => a.id).join(', ')}${orphanActivities.length > 5 ? ' …' : ''}`);
    const attendances = parseRows(db, 'attendances');
    const badAttendanceActivity = attendances.filter((a) => a.activityId !== undefined && !activityIds.has(String(a.activityId)));
    if (badAttendanceActivity.length) block(`attendances→activity 孤儿 ${badAttendanceActivity.length}：${badAttendanceActivity.slice(0, 5).map((a) => a.id).join(', ')}${badAttendanceActivity.length > 5 ? ' …' : ''}`);
    const badAttendancePerson = attendances.filter((a) => a.personId !== undefined && !userIds.has(String(a.personId)));
    if (badAttendancePerson.length) block(`attendances→person 孤儿 ${badAttendancePerson.length}：${badAttendancePerson.slice(0, 5).map((a) => a.id).join(', ')}${badAttendancePerson.length > 5 ? ' …' : ''}`);

    // ⑦ 附件目录 ↔ attachments 记录
    const attachments = hasTable(db, 'attachments') ? db.prepare('SELECT id, path FROM attachments').all() : [];
    const referenced = new Set();
    const missingFiles = [];
    for (const row of attachments) {
      const name = path.basename(String(row.path || ''));
      if (!name) continue;
      referenced.add(name);
      if (!fs.existsSync(path.join(uploadsDir, name))) missingFiles.push(`${row.id}:${name}`);
    }
    if (missingFiles.length) {
      block(`附件记录缺物理文件 ${missingFiles.length} 处（uploads=${uploadsDir}）：${missingFiles.slice(0, 5).join(', ')}${missingFiles.length > 5 ? ' …' : ''}`);
    }
    const diskFiles = listFiles(uploadsDir);
    const orphans = diskFiles.filter((name) => !referenced.has(name));
    if (orphans.length) warn(`uploads 目录存在无库记录的文件 ${orphans.length} 个（可能是历史残留）：${orphans.slice(0, 5).join(', ')}${orphans.length > 5 ? ' …' : ''}`);
    if (!fs.existsSync(uploadsDir)) warn(`附件目录不存在：${uploadsDir}（若库内无附件记录则可忽略）`);

    // 汇总
    console.log(`[preflight] 库：${dbPath}`);
    console.log(`[preflight] schema v${userVersion} · users=${usersCount} · branches=${branchesCount} · activities=${activities.length} · attendances=${attendances.length} · attachments=${attachments.length}`);
    console.log(`[preflight] 附件目录：${uploadsDir}`);
    if (warnings.length) {
      console.log(`[preflight] ⚠ 警告 ${warnings.length} 项：`);
      for (const w of warnings) console.log(`  - ${w}`);
    }
    if (blockers.length) {
      console.log(`[preflight] ⛔ 阻断 ${blockers.length} 项：`);
      for (const b of blockers) console.log(`  - ${b}`);
    }
    const failed = blockers.length > 0 || (args.strict && warnings.length > 0);
    if (failed) {
      console.log('[preflight] ✖ 不可换轨。处置见 ' + RUNBOOK + '。');
      process.exitCode = 1;
      return;
    }
    console.log(`[preflight] ✔ 通过${args.strict ? '（--strict：警告为 0）' : ''}；可以进入换轨。`);
  } finally {
    db.close();
  }
}

main().catch((e) => {
  console.error('[preflight] ✖ 体检失败：', e && e.message ? e.message : e);
  console.error(`[preflight]   处置见 ${RUNBOOK}。`);
  process.exit(1);
});
