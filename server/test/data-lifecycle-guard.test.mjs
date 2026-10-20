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
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
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
