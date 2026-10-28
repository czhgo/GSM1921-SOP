// server/test/data-lifecycle-guard.test.mjs — 数据生命周期 P1 守卫（2026-10-20）
// ════════════════════════════════════════════════════════════════
// 目的：把本轮「名单/操作人/父键/只写不读」修复钉成结构守卫，防止回潮：
//   ① docs/src 不得再用 `|| 'pN'` 把失效会话回落到固定演示人（P1-11）；
//   ② 不得写死支委名单 2400012354~2300010002（P1-09）；
//   ③ 不得用 generateId('p') 生成成员 id（P1-12：学号即唯一 id）；
//   ④ 复盘/经验沉淀写口必须落稳定父键，不得只写 sourceName（P1-05/M1）；
//   ⑤ mockDB 不新增「只写不读」集合：新增键必须在 docs/src 有消费者，或在允许清单内并写明理由（P1-26）；
//   ⑥ committeeBroadcasts 已停止写入（只保留存量读取与删除守卫）。
// ════════════════════════════════════════════════════════════════
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, utimesSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import Database from 'better-sqlite3';
import { initDb } from '../db.js';
import {
  classifyPersistKey, classifyTable,
} from '../../docs/src/data/seed-manifest.js?v=20261028e';
import {
  INIT_BLOB_KEEP_KEYS, INIT_BLOB_CLEAR_DEFAULTS, trimInitBlob,
} from '../../docs/src/services/core/init-reset.js?v=20261028e';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const SRC = join(ROOT, 'docs', 'src');

/** 递归列出 docs/src 下的 .js 文件（排除 node_modules / 生成物） */
function listJs(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...listJs(path));
    else if (name.endsWith('.js')) out.push(path);
  }
  return out;
}

const SRC_FILES = listJs(SRC);

/** 逐文件匹配；返回 [{ file, line, text }] */
function scan(pattern) {
  const hits = [];
  for (const file of SRC_FILES) {
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((text, index) => {
      const code = text.trim();
      if (code.startsWith('//') || code.startsWith('*')) return; // 注释中的反面示例不算回潮
      if (pattern.test(text)) hits.push({ file: file.replace(ROOT, ''), line: index + 1, text: code });
    });
  }
  return hits;
}

test('① docs/src 不得出现 `|| \'pN\'` 操作人兜底（P1-11）', () => {
  const hits = scan(/\|\|\s*['"]p\d+['"]/);
  assert.deepEqual(hits, [], `失效会话不得回落到固定演示人：\n${hits.map(h => `${h.file}:${h.line} ${h.text}`).join('\n')}`);
});

test('② 不得写死支委名单 2400012354~2300010002（P1-09）', () => {
  // 三连以上的 2400012354~2300010002 数组字面量＝名单快照；名单必须 getCommitteeIds(users) 角色派生。
  const hits = scan(/\[\s*['"]2400012345[0-4]['"]\s*,\s*['"]2400012345[0-4]['"]\s*,\s*['"]2400012345[0-4]['"]/);
  const constants = readFileSync(join(SRC, 'core', 'domain', 'constants.js'), 'utf8');
  assert.doesNotMatch(constants, /export\s+const\s+COMMITTEE_IDS\s*=/, 'constants.js 不得再导出写死的 COMMITTEE_IDS 名单');
  assert.deepEqual(hits, [], `支委名单必须角色派生：\n${hits.map(h => `${h.file}:${h.line} ${h.text}`).join('\n')}`);
});

test('③ 不得用 generateId(\'p\') 生成成员 id（P1-12）', () => {
  const hits = scan(/\bgenerateId\(\s*['"`]p['"`]\s*\)/);
  assert.deepEqual(hits, [], `新成员 id 必须用学号：\n${hits.map(h => `${h.file}:${h.line} ${h.text}`).join('\n')}`);
});

test('④ 复盘/沉淀写口必须落稳定父键，不得只写 sourceName（P1-05/M1）', () => {
  const source = readFileSync(join(SRC, 'entries', 'tabs', 'disc', 'review-tab.js'), 'utf8');
  // 写口：活动用 activityId、专班用 taskforceId，并写 sourceId
  assert.match(source, /sourceId:\s*sourceType === 'taskforce'/, '沉淀写口必须落 sourceId（活动 activityId / 专班 taskforceId）');
  assert.match(source, /activityId:\s*sourceType === 'activity'/, '活动沉淀必须写 activityId');
  assert.match(source, /taskforceId:\s*sourceType === 'taskforce'/, '专班沉淀必须写 taskforceId');
  // 读口：「已沉淀」必须按父键集合比对，而不是只按名称
  assert.match(source, /depositedKeys\.has\(key\)/, '「已沉淀」判据必须按稳定父键比对');
  assert.match(source, /function _reviewParentKey/, '复盘父键解析函数须在位');
  assert.match(source, /function _depositParentKey/, '沉淀父键解析函数须在位');
});

test('⑤ mockDB 不新增只写不读集合（允许清单 + 理由，P1-26）', () => {
  const domain = readFileSync(join(SRC, 'core', 'domain', 'domain.js'), 'utf8');
  const block = /export const mockDB = \{([\s\S]*?)\n\};/.exec(domain);
  assert.ok(block, 'domain.js 应导出 mockDB 字面量');
  const keys = [...block[1].matchAll(/^ {2}([A-Za-z_$][\w$]*):/gm)].map(m => m[1]);

  // 允许清单（每条必须写明「为什么可以只写不读」）——新增项须先在此登记理由。
  const WRITE_ONLY_ALLOWED = {
    committee_broadcasts: 'P1-26：已停止写入，仅保留存量读取（GET /committeeBroadcasts）与删除守卫；送达由系统通知承担',
  };
  // 基线（2026-10-20 存量集合，固定快照）：只拦「本批之后新增」的集合；存量不回头追究。
  const BASELINE = new Set([
    '_schema', '_loaded',
    'users', 'activities', 'tasks', 'attendances', 'inspections', 'activityReviews', 'taskforceReviews',
    'assignments', 'makeupTasks', 'actSubRecords', 'tfSubRecords', 'fileSpaceRecords', 'experienceDeposits',
    'handoffs', 'taskforces', 'workgroups', 'workgroupMembers', 'workgroupGrants', 'workgroupTasks',
    'workgroupOutputs', 'attendanceRosters', 'notices', 'todos', 'signups', 'imageRecords', 'propTasks',
    'periodicArchives', 'archiveRecords', 'externalDispatches', 'branchDocs', 'memberChangeRequests',
    'committeeBroadcasts', 'agendaVotes', 'thoughtReports', 'partyGroups', 'memberFlows', 'branches',
    'appointmentRecords', 'reviewRequests', 'pendingMemberConfirmations',
  ]);

  const readers = new Map();
  for (const file of SRC_FILES) {
    if (/data[\\/]mock-adapter\.js$/.test(file)) continue;
    if (/core[\\/]domain[\\/]domain\.js$/.test(file)) continue;
    if (/core[\\/]init-reset\.js$/.test(file)) continue;
    const text = readFileSync(file, 'utf8');
    for (const key of keys) {
      if (text.includes(`mockDB.${key}`) || text.includes(`mockDB?.${key}`)) {
        readers.set(key, (readers.get(key) || 0) + 1);
      }
    }
  }

  const added = keys.filter(key => !BASELINE.has(key));
  const offenders = added.filter(key => !readers.has(key) && !WRITE_ONLY_ALLOWED[key]);
  assert.deepEqual(offenders, [], `以下新增集合只写不读且未登记理由：${offenders.join('、')}`);
});

test('⑥ committeeBroadcasts 已停止写入（P1-26）', () => {
  const adapter = readFileSync(join(SRC, 'data', 'mock-adapter.js'), 'utf8');
  const writes = [...adapter.matchAll(/mockDB\.committeeBroadcasts\s*=\s*\[\.\.\./g)];
  assert.equal(writes.length, 0, 'mock 形态不得再向 committeeBroadcasts 追加行（存量恢复/读取保留）');
  const serverRoute = readFileSync(join(ROOT, 'server', 'routes', 'member.js'), 'utf8');
  assert.doesNotMatch(serverRoute, /writeRow\(db,\s*'committee_broadcasts'/, '服务端 approve 不得再广播写入');
});

test('⑦ 建表清单不新增只写不读集合（允许清单 + 理由，P1-26）', () => {
  const dbSource = readFileSync(join(ROOT, 'server', 'db.js'), 'utf8');
  const namesFrom = (pattern) => [...(pattern.exec(dbSource)?.[1] || '').matchAll(/'([a-z0-9_]+)'/g)]
    .map((m) => m[1])
    .filter((name) => name !== 'id' && name !== 'data');
  const tables = new Set([
    ...namesFrom(/const RESOURCE_TABLES = \[([\s\S]*?)\n\];/),
    ...namesFrom(/export const SEMANTIC_TABLES = \[([\s\S]*?)\n\];/),
    ...namesFrom(/const WORKGROUP_TABLES = Object\.freeze\(\[([\s\S]*?)\]\);/),
    'sessions', 'attachments', 'collection_versions',
  ]);

  // 2026-10-20 存量表快照：只拦「本批之后新增」的建表。
  const BASELINE_TABLES = new Set([
    'users', 'activities', 'tasks', 'attendances', 'inspections', 'taskforces', 'notices', 'todos',
    'assignments', 'makeup_tasks', 'experience_deposits', 'file_space_records', 'image_records',
    'signups', 'activity_reviews', 'taskforce_reviews', 'prop_tasks', 'periodic_archive_submissions',
    'archive_records', 'external_dispatches', 'act_sub_records', 'tf_sub_records', 'branch_docs',
    'member_change_requests', 'committee_broadcasts', 'agenda_votes', 'branches', 'appointment_records',
    'review_requests', 'issues', 'thought_reports', 'party_groups', 'member_flows', 'issue_reveals',
    'handoffs', 'member_confirmations', 'milestones', 'attendance_appeals', 'inspection_appeals',
    'issue_unread', 'auth_audit', 'workgroups', 'workgroup_members', 'workgroup_grants',
    'workgroup_tasks', 'workgroup_outputs', 'attendance_rosters', 'sessions', 'attachments',
    'collection_versions',
  ]);
  const TABLE_WRITE_ONLY_ALLOWED = {
    committee_broadcasts: 'P1-26：已停止写入，仅保留存量读取（GET /committeeBroadcasts）与删除守卫',
    collection_versions: '服务端快照版本戳内部表，无前端消费者',
    sessions: '认证会话内部表，仅服务端读写',
    attachments: '附件元数据内部表，仅上传/下载链路消费',
    issue_reveals: 'D-824 起停写，仅保留历史留痕，无系统读取入口',
  };

  const appsSource = SRC_FILES
    .filter((file) => !/data[\\/]mock-adapter\.js$/.test(file))
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');
  const readByApp = (table) => {
    const camel = table.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase());
    return appsSource.includes(table) || appsSource.includes(camel);
  };

  const added = [...tables].filter((table) => !BASELINE_TABLES.has(table));
  const offenders = added.filter((table) => !readByApp(table) && !TABLE_WRITE_ONLY_ALLOWED[table]);
  assert.deepEqual(offenders, [], `以下新增表只写不读且未登记理由：${offenders.join('、')}`);
});

// ════════════════════════════════════════════════════════════════
//  B-499-8（Task 4）：数据生命周期守卫
//  ⑧ 分类完整性：mock 持久化键 / mockDB 键 / db 表都必须有归属（种子或非种子登记）
//  ⑨ reset 分区：每个持久化键必须落在 init 的 keep 或 clear 分区
//  ⑩ init 空态真实性：工作组域 / attendanceRosters / 旧 weeklyReports 必须被清空
//  ⑪ API token no-op：?reset=init 的边界仍以 token 为门
//  ⑫ 清理安全：cleanup 默认 dry-run；--apply 只删孤儿附件 / 悬空附件行 / 旧备份
//  ⑬ 重建边界：rebuild-demo 生产拒绝 demo、目标已存在拒绝、只写指定输出
//  ⑭ 档案归档单删联动物理文件
// ════════════════════════════════════════════════════════════════

const adapterSource = readFileSync(join(SRC, 'data', 'mock-adapter.js'), 'utf8');
const persistedKeys = [...(/localStorage\.setItem\(STORAGE_KEY, JSON\.stringify\(\{([\s\S]*?)\}\)\)/.exec(adapterSource)?.[1] || '')
  .matchAll(/^ {6}([A-Za-z_$][\w$]*):/gm)].map((m) => m[1]);
const domainSource = readFileSync(join(SRC, 'core', 'domain', 'domain.js'), 'utf8');
const mockDbKeys = [...(/export const mockDB = \{([\s\S]*?)\n\};/.exec(domainSource)?.[1] || '')
  .matchAll(/^ {2}([A-Za-z_$][\w$]*):/gm)].map((m) => m[1]).filter((key) => key !== '_loaded');

test('⑧ 分类完整性：mock 持久化键 / mockDB 键 / 物理表全部有归属（未分类即红）', () => {
  assert.ok(persistedKeys.length >= 30, `持久化键抽取失败（实得 ${persistedKeys.length} 个）`);
  const unclassifiedKeys = [...new Set([...persistedKeys, ...mockDbKeys])].filter((key) => !classifyPersistKey(key));
  assert.deepEqual(unclassifiedKeys, [], `以下持久化键未在 seed-manifest 分类：${unclassifiedKeys.join('、')}`);

  const dbSource = readFileSync(join(ROOT, 'server', 'db.js'), 'utf8');
  const namesFrom = (pattern) => [...(pattern.exec(dbSource)?.[1] || '').matchAll(/'([a-z0-9_]+)'/g)]
    .map((m) => m[1]).filter((name) => name !== 'id' && name !== 'data');
  const tables = new Set([
    ...namesFrom(/const RESOURCE_TABLES = \[([\s\S]*?)\n\];/),
    ...namesFrom(/export const SEMANTIC_TABLES = \[([\s\S]*?)\n\];/),
    ...namesFrom(/const WORKGROUP_TABLES = Object\.freeze\(\[([\s\S]*?)\]\);/),
    'sessions', 'attachments', 'collection_versions', 'seed_meta',
  ]);
  const unclassifiedTables = [...tables].filter((table) => !classifyTable(table));
  assert.deepEqual(unclassifiedTables, [], `以下物理表未在 seed-manifest 分类：${unclassifiedTables.join('、')}`);
});

test('⑨ reset 分区：每个 mock 持久化键必须落在 init 的 keep 或 clear 分区', () => {
  const partition = new Set([...INIT_BLOB_KEEP_KEYS, ...Object.keys(INIT_BLOB_CLEAR_DEFAULTS)]);
  const orphans = persistedKeys.filter((key) => !partition.has(key));
  assert.deepEqual(orphans, [], `以下持久化键未纳入 init 分区（keep / clear）：${orphans.join('、')}`);
});

test('⑩ init 空态真实性：工作组域 / attendanceRosters / 旧 weeklyReports 均被清空', () => {
  const blob = {
    _schema: 1,
    users: [{ id: 'u_sec' }],
    branches: [{ id: 'br-b1' }],
    appointmentRecords: [{ id: 'appt-1' }],
    workgroups: [{ id: 'wg-activity-act-1' }],
    workgroupMembers: [{ id: 'wgm-1' }],
    workgroupGrants: [{ id: 'wgg-seed-1' }],
    workgroupTasks: [{ id: 'wgt-1' }],
    workgroupOutputs: [{ id: 'wgo-1' }],
    attendanceRosters: [{ id: 'ar-1' }],
    taskforces: [{ id: 'tf-001' }],
    makeupTasks: [{ id: 'mk-seed-1' }],
    reviewRequests: [{ id: 'rq-seed-1' }],
    partyGroups: [{ id: 'pg-1' }],
    weeklyReports: [{ id: 'wr-1' }],
  };
  const out = trimInitBlob(blob);
  for (const key of ['workgroups', 'workgroupMembers', 'workgroupGrants', 'workgroupTasks', 'workgroupOutputs', 'attendanceRosters',
    'taskforces', 'makeupTasks', 'reviewRequests', 'partyGroups', 'weeklyReports']) {
    assert.ok(Array.isArray(out[key]) && out[key].length === 0, `${key} 必须被 init 清空`);
  }
  assert.equal(out.users.length, 1, '账号白名单保留');
  assert.equal(out.branches.length, 1, '支部 config 保留');
});

test('⑪ API token no-op：init 档仍以 sessionStorage token 为执行边界', () => {
  const source = readFileSync(join(SRC, 'services', 'core', 'init-reset.js'), 'utf8');
  assert.match(source, /sessionStorage\.getItem\('gsm1921-api-token'\)/, 'init 档必须先检查 API token');
  assert.match(source, /if \(typeof sessionStorage !== 'undefined' && sessionStorage\.getItem\('gsm1921-api-token'\)\) return false;/,
    'token 在场必须直接返回 false（不动存储、不导航）');
});

test('⑫ 清理安全：cleanup 默认 dry-run；--apply 只删孤儿附件 / 悬空附件行 / 旧备份，业务记录不动', () => {
  const root = mkdtempSync(join(tmpdir(), 'gsm-cleanup-'));
  const dbPath = join(root, 'data.db');
  const uploads = join(root, 'uploads');
  const backups = join(root, 'backups');
  mkdirSync(uploads, { recursive: true });
  mkdirSync(backups, { recursive: true });
  const db = initDb(dbPath);
  db.prepare('INSERT INTO activities (id, data) VALUES (?, ?)').run('act-1', JSON.stringify({ id: 'act-1', title: '保留业务行', filePath: '/api/v1/uploads/used.txt' }));
  db.prepare('INSERT INTO attachments (id, filename, path, size, uploaded_by, uploaded_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run('a-used', 'used.txt', '/api/v1/uploads/used.txt', 1, 'u1', '2026-10-21T00:00:00.000Z');
  db.prepare('INSERT INTO attachments (id, filename, path, size, uploaded_by, uploaded_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run('a-dangling', 'missing.txt', '/api/v1/uploads/missing.txt', 1, 'u1', '2026-10-21T00:00:00.000Z');
  db.close();
  writeFileSync(join(uploads, 'used.txt'), 'used');
  writeFileSync(join(uploads, 'orphan.txt'), 'orphan');
  const backupNames = ['bak-1', 'bak-2', 'bak-3'];
  backupNames.forEach((name, index) => {
    const dir = join(backups, name);
    mkdirSync(dir);
    const time = new Date(Date.now() - (backupNames.length - index) * 1000);
    utimesSync(dir, time, time);
  });
  const script = join(ROOT, 'server', 'scripts', 'cleanup.mjs');

  const dry = spawnSync(process.execPath, [script, '--db', dbPath, '--uploads', uploads, '--backups', backups, '--keep', '1'], { encoding: 'utf8' });
  assert.equal(dry.status, 0, `dry-run 应成功：${dry.stderr}`);
  assert.match(dry.stdout, /DRY-RUN/, '默认必须是 dry-run');
  assert.ok(existsSync(join(uploads, 'orphan.txt')), 'dry-run 不得删除孤儿附件');
  assert.equal(readdirSync(backups).length, 3, 'dry-run 不得删除旧备份');
  const before = new Database(dbPath, { readonly: true });
  try { assert.equal(before.prepare('SELECT COUNT(*) c FROM attachments').get().c, 2, 'dry-run 不得删除附件行'); } finally { before.close(); }

  const apply = spawnSync(process.execPath, [script, '--db', dbPath, '--uploads', uploads, '--backups', backups, '--keep', '1', '--apply'], { encoding: 'utf8' });
  assert.equal(apply.status, 0, `--apply 应成功：${apply.stderr}`);
  assert.ok(existsSync(join(uploads, 'used.txt')), '被引用的附件必须保留');
  assert.ok(!existsSync(join(uploads, 'orphan.txt')), '孤儿附件必须删除');
  assert.deepEqual(readdirSync(backups), ['bak-3'], '只保留最近 keep 份');
  const after = new Database(dbPath, { readonly: true });
  try {
    assert.equal(after.prepare('SELECT COUNT(*) c FROM attachments').get().c, 1, '悬空附件行删除、其他附件行保留');
    assert.equal(after.prepare('SELECT COUNT(*) c FROM activities').get().c, 1, '业务记录不得删除');
    assert.equal(JSON.parse(after.prepare('SELECT data FROM activities WHERE id = ?').get('act-1').data).title, '保留业务行');
  } finally { after.close(); }
  rmSync(root, { recursive: true, force: true });
});

test('⑬ 重建边界：生产拒绝 demo、目标已存在拒绝、baseline 只写指定输出并写 seed_meta', () => {
  const root = mkdtempSync(join(tmpdir(), 'gsm-rebuild-'));
  const script = join(ROOT, 'server', 'scripts', 'rebuild-demo.mjs');
  const demoOut = join(root, 'demo.db');
  const prod = spawnSync(process.execPath, [script, '--mode', 'demo', '--out', demoOut], {
    encoding: 'utf8', env: { ...process.env, APP_ENV: 'production' },
  });
  assert.notEqual(prod.status, 0, '生产形态必须拒绝 demo');
  assert.ok(!existsSync(demoOut), '被拒绝时不得留下产物');

  const existing = join(root, 'existing.db');
  writeFileSync(existing, 'x');
  const refuse = spawnSync(process.execPath, [script, '--mode', 'baseline', '--out', existing], { encoding: 'utf8' });
  assert.notEqual(refuse.status, 0, '目标已存在默认必须拒绝');
  assert.equal(readFileSync(existing, 'utf8'), 'x', '被拒绝时不得覆盖目标');

  const baselineOut = join(root, 'baseline.db');
  const ok = spawnSync(process.execPath, [script, '--mode', 'baseline', '--out', baselineOut], { encoding: 'utf8' });
  assert.equal(ok.status, 0, `baseline 重建应成功：${ok.stderr}`);
  const db = new Database(baselineOut, { readonly: true });
  try {
    assert.equal(db.prepare('SELECT COUNT(*) c FROM users').get().c, 1, 'baseline 只建 1 名党委账号');
    assert.equal(db.prepare('SELECT COUNT(*) c FROM branches').get().c, 1, 'baseline 只建 1 个支部');
    const mode = db.prepare("SELECT value FROM seed_meta WHERE key='mode'").get();
    const version = db.prepare("SELECT value FROM seed_meta WHERE key='seed_version'").get();
    assert.equal(mode.value, 'baseline', 'seed_meta.mode 必须写入');
    assert.ok(version.value, 'seed_meta.seed_version 必须写入');
  } finally { db.close(); }
  rmSync(root, { recursive: true, force: true });
});

test('⑭ 档案归档单删联动物理文件（或保留仍被其他表引用的文件）', () => {
  const source = readFileSync(join(ROOT, 'server', 'routes', 'resources', 'index.js'), 'utf8');
  assert.match(source, /name === 'archiveRecords'/, 'archiveRecords 必须进入文件类删除联动分支');
  assert.match(source, /stillReferenced[\s\S]{0,200}deleteUploadedFile\(doc\.filePath\)/,
    'archiveRecords 单删必须联动 deleteUploadedFile，并在他处仍引用时保留');
});

test('⑮ 测试残留清理：ID 前缀 ＋ 标题/日期 双条件命中，真实业务行不动；默认 dry-run', () => {
  const root = mkdtempSync(join(tmpdir(), 'gsm-residue-'));
  const dbPath = join(root, 'data.db');
  const db = initDb(dbPath);
  const insert = (table, row) => db.prepare(`INSERT INTO ${table} (id, data) VALUES (?, ?)`)
    .run(row.id, JSON.stringify(row));

  // 测试残留（应删）
  insert('activities', { id: 'act-b31-test01', title: 'B3-1 测试活动', date: '2026-10-19' });
  insert('activities', { id: 'act-ce46b61e', title: '跨组活动真机验证 499', date: '2026-10-21' });
  insert('attendances', { id: 'att-b31-test01', activityId: 'act-b31-test01', personId: '2400012349', status: 'absent' });
  insert('makeup_tasks', { id: 'mk-b31-test01', activityId: 'act-b31-test01', personId: '2400012349' });
  insert('tasks', { id: 'tsk-test-1', activityId: 'act-b31-test01', title: '活动发起' });
  insert('workgroups', { id: 'wg-activity-act-b31-test01', sourceType: 'activity', sourceId: 'act-b31-test01', name: 'B3-1 测试活动' });
  insert('workgroup_members', { id: 'wgm-test-1', workgroupId: 'wg-activity-act-b31-test01', personId: '2400012349' });
  insert('notices', { id: 'ntc-test01', title: '活动已创建，请建核心群', targetId: 'act-ce46b61e' });
  insert('issues', { id: 'issue-test01', title: '【进度汇报】', createdAt: '2026-10-21T11:39:44.354Z' });
  insert('issue_unread', { id: 'secretary-review:issue-test01', issueId: 'issue-test01', at: '2026-10-21T11:41:20.021Z' });
  insert('todos', { id: 'todo_seed_7', title: '设置第三党小组组长' });

  // 真实业务行（必须保留）：分别只满足单条件
  insert('activities', { id: 'act-real-1', title: 'B3-1 测试活动', date: '2026-09-01' });
  insert('activities', { id: 'act-b31-real', title: '真实支部活动', date: '2026-10-01' });
  insert('issues', { id: 'issue-real', title: '【进度汇报】', createdAt: '2026-10-22T00:00:00.000Z' });
  insert('todos', { id: 'todo_seed_7_real', title: '设置第三党小组组长' });
  // sessions 默认不删；显式 --sessions-before 才按日期清
  db.prepare('INSERT INTO sessions (token, person_id, created_at) VALUES (?, ?, ?)')
    .run('sess-old', '2400012349', '2026-09-01T00:00:00.000Z');
  db.prepare('INSERT INTO sessions (token, person_id, created_at) VALUES (?, ?, ?)')
    .run('sess-new', '2400012349', '2026-10-25T00:00:00.000Z');
  db.close();

  const script = join(ROOT, 'server', 'scripts', 'cleanup.mjs');
  const dry = spawnSync(process.execPath, [script, '--db', dbPath, '--test-residue'], { encoding: 'utf8' });
  assert.equal(dry.status, 0, `dry-run 应成功：${dry.stderr}`);
  assert.match(dry.stdout, /DRY-RUN/, '默认必须是 dry-run');
  assert.match(dry.stdout, /activities: 2 行/, '必须打印将删行数与表名');
  const before = new Database(dbPath, { readonly: true });
  try { assert.equal(before.prepare('SELECT COUNT(*) c FROM activities').get().c, 4, 'dry-run 不得删除'); } finally { before.close(); }

  const apply = spawnSync(process.execPath, [script, '--db', dbPath, '--test-residue', '--apply'], { encoding: 'utf8' });
  assert.equal(apply.status, 0, `--apply 应成功：${apply.stderr}`);
  const after = new Database(dbPath, { readonly: true });
  try {
    const ids = (table) => after.prepare(`SELECT id FROM ${table} ORDER BY id`).all().map((row) => row.id);
    assert.deepEqual(ids('activities'), ['act-b31-real', 'act-real-1'], '仅双条件命中的测试活动可删');
    assert.deepEqual(ids('attendances'), [], '测试考勤应删');
    assert.deepEqual(ids('makeup_tasks'), [], '测试补课任务应删');
    assert.deepEqual(ids('tasks'), [], '派生任务应删');
    assert.deepEqual(ids('workgroups'), [], '派生工作组应删');
    assert.deepEqual(ids('workgroup_members'), [], '派生工作组成员应删');
    assert.deepEqual(ids('notices'), [], '测试通知应删');
    assert.deepEqual(ids('issue_unread'), [], '测试议题未读标记应删');
    assert.deepEqual(ids('issues'), ['issue-real'], '日期不同的真实议题保留');
    assert.deepEqual(ids('todos'), ['todo_seed_7_real'], 'ID 不同的真实待办保留');
    assert.deepEqual(after.prepare('SELECT token FROM sessions ORDER BY token').all().map((row) => row.token),
      ['sess-new', 'sess-old'], '默认不删 sessions');
  } finally { after.close(); }

  // 显式 --sessions-before 才按日期清 sessions（主键是 token，不是 id）
  const sessions = spawnSync(process.execPath,
    [script, '--db', dbPath, '--test-residue', '--sessions-before', '2026-10-01', '--apply'], { encoding: 'utf8' });
  assert.equal(sessions.status, 0, `--sessions-before 应成功：${sessions.stderr}`);
  const final = new Database(dbPath, { readonly: true });
  try {
    assert.deepEqual(final.prepare('SELECT token FROM sessions ORDER BY token').all().map((row) => row.token),
      ['sess-new'], '只删早于指定日期的 sessions');
  } finally { final.close(); }
  rmSync(root, { recursive: true, force: true });
});

// ════════════════════════════════════════════════════════════════
//  B-500-4 结案（2026-10-28 支书裁定）：业务数据永不自动删除
//  ⑯ 清理删除目标白名单不含任何业务表（含反例，非空转）
// ════════════════════════════════════════════════════════════════
test('⑯ cleanup 删除目标白名单不含任何业务表（业务数据永不自动删；含反例）', () => {
  // 业务表全集：db.js 的 RESOURCE_TABLES ＋ SEMANTIC_TABLES
  //   （attachments / sessions / collection_versions 属内部表，不在这两份清单内）
  const dbSource = readFileSync(join(ROOT, 'server', 'db.js'), 'utf8');
  const namesFrom = (pattern) => [...(pattern.exec(dbSource)?.[1] || '').matchAll(/'([a-z0-9_]+)'/g)]
    .map((m) => m[1]).filter((name) => name !== 'id' && name !== 'data');
  const BUSINESS_TABLES = new Set([
    ...namesFrom(/const RESOURCE_TABLES = \[([\s\S]*?)\n\];/),
    ...namesFrom(/export const SEMANTIC_TABLES = \[([\s\S]*?)\n\];/),
  ]);
  assert.ok(BUSINESS_TABLES.has('activities') && BUSINESS_TABLES.has('notices') && BUSINESS_TABLES.has('todos'),
    `业务表全集抽取失败（${BUSINESS_TABLES.size} 张）：判据会变成恒真`);

  // 删除目标白名单（口径 2026-10-28）：常规清理只允许删 attachments 行；
  //   孤儿附件 / 悬空引用分别落在物理文件与附件行，不涉及业务表。
  //   `--test-residue` 是显式开关 ＋「ID 前缀 ＋ 标题/日期」双条件，不属于本条的自动保留期清理。
  const CLEANUP_TABLE_WHITELIST = ['attachments'];

  // 从 cleanup.mjs 源码取字面量 `DELETE FROM <表>`（`DELETE FROM ${table}` 属测试残留档，不被本正则取到）
  const cleanupSource = readFileSync(join(ROOT, 'server', 'scripts', 'cleanup.mjs'), 'utf8');
  const literalTargets = [...cleanupSource.matchAll(/DELETE\s+FROM\s+([a-z_][a-z0-9_]*)/gi)].map((m) => m[1]);
  assert.ok(literalTargets.length >= 1, '未从 cleanup.mjs 抽到任何 DELETE FROM 目标：抽取面被写坏，本条会恒真');

  // 同一判据函数：SQL 是否触及业务表（反例与实测共用）
  const touchesBusinessTable = (sql) => {
    const table = /DELETE\s+FROM\s+([a-z_][a-z0-9_]*)/i.exec(sql)?.[1]?.toLowerCase();
    return Boolean(table && BUSINESS_TABLES.has(table));
  };

  assert.deepEqual(literalTargets.filter((t) => !CLEANUP_TABLE_WHITELIST.includes(t)), [],
    `cleanup.mjs 出现白名单外的删除目标：${literalTargets.join(' / ')}——业务数据永不自动删`);
  assert.deepEqual(literalTargets.filter(touchesBusinessTable), [],
    `cleanup.mjs 的删除目标命中业务表：${literalTargets.join(' / ')}`);
  assert.ok(!BUSINESS_TABLES.has('attachments'), 'attachments 不应被算作业务表（否则白名单判据失去意义）');

  // 反例（非空转）：同一判据必须把业务表 SQL 判为违规
  assert.equal(touchesBusinessTable('DELETE FROM activities'), true,
    '反例失效：「DELETE FROM activities」必须被判为触及业务表');
  assert.equal(touchesBusinessTable('DELETE FROM attachments'), false,
    '正例失效：「DELETE FROM attachments」不应被判为业务表');
});

