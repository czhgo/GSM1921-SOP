// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/test/mock-api-parity-structure.test.mjs — mock ↔ API **结构真值**守卫（B-499-4，2026-10-21）
// ════════════════════════════════════════════════════════════════
// 与姊妹件 `mock-api-parity.test.mjs` 的分工：
//   · 姊妹件比「指定 5 张表的行值是否逐字一致」（读数真值）；
//   · 本文件比「**所有有种子源的表**在服务端行与同源 mock/种子行之间，字段集合与类型是否一致」
//     （结构真值）——覆盖 manifest 全表，而不是只 5 张。
//
// 判据（三分类，逐行逐字段）：
//   · 多出（extra）  ：服务端行有、同源种子行没有的字段；
//   · 缺失（missing）：种子行有、服务端行没有的字段；
//   · 类型不符（type）：同名字段两边的 JS 类型不同（null 单独计一类；array 与 object 不混同）。
// 白名单（PROJECTION_WHITELIST）：只放**客户端投影 / 装载投影**字段，每条必须写理由；
//   白名单只豁免「多出 / 缺失」两类（投影字段的存在性），**不豁免类型不符**。
//   白名单外出现任何一条 ⇒ 红；白名单必须非空、每条有 reason，且至少命中一条（防装饰性白名单）。
//
// 非空转：
//   ① manifest 覆盖服务端 `seed.js` 实际播种的全部表（双向核对）；
//   ② 每张表服务端行数 > 0、比对行数 / 字段数有下限；
//   ③ 比较器自检：人为改字段 / 删字段 / 改类型 / 增删行都必须被判出。
//
// 运行：`node --test test/mock-api-parity-structure.test.mjs`（server 目录）
// ⚠ 对 docs/src 的相对 import 带与源码一致的 `?v=` query（模块缓存键一致性，同姊妹件）。
// ════════════════════════════════════════════════════════════════
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { createApp } from '../app.js';
import { seedDatabase } from '../seed.js';
import {
  SEED_EXTERNAL_DISPATCHES, SEED_HANDOFFS, SEED_MEMBER_CONFIRMATIONS,
  SEED_ATTENDANCE_APPEALS, SEED_INSPECTION_APPEALS, SEED_ISSUE_UNREAD,
  SEED_AUTH_AUDIT, SEED_APPOINTMENT_RECORDS,
} from '../seed.js';
import {
  SEED_MANIFEST, SEED_MANIFEST_BY_TABLE, SEED_LIFECYCLE_CLASSES, SEED_INIT_TIERS,
} from '../../docs/src/data/seed-manifest.js?v=20261025a';
import {
  normalizeSeedActivitySeedRows, ensureLegacySourceWorkgroups, ensureDemoWorkgroupGrants,
} from '../../docs/src/data/workgroup-seed-sync.js?v=20261025a';
import { PEOPLE } from '../../docs/src/data/mock/people.js?v=20261025a';
import { BRANCHES } from '../../docs/src/data/mock/branches.js?v=20261025a';
import { ACTIVITIES } from '../../docs/src/data/mock/activities.js?v=20261025a';
import { MOCK_NOTICES } from '../../docs/src/data/mock/notices.js?v=20261025a';
import { MOCK_TASKFORCES } from '../../docs/src/data/mock/taskforces.js?v=20261025a';
import {
  SEED_TASKS, SEED_ASSIGNMENTS, SEED_ARCHIVE_RECORDS, SEED_SIGNUPS,
  SEED_REVIEW_REQUESTS, SEED_MAKEUP_TASKS,
} from '../../docs/src/data/mock/seed.js?v=20261025a';
import { PARTY_GROUPS } from '../../docs/src/data/mock/party-groups.js?v=20261025a';
import { ATTENDANCE_RECORDS } from '../../docs/src/data/mock/attendance.js?v=20261025a';
import { INSPECTION_RECORDS } from '../../docs/src/data/mock/inspection.js?v=20261025a';
import { REVIEW_RECORDS, TASKFORCE_REVIEW_RECORDS } from '../../docs/src/data/mock/review.js?v=20261025a';
import { THOUGHT_REPORTS } from '../../docs/src/data/mock/thought-reports.js?v=20261025a';
import { PERIODIC_ARCHIVES_SEED, PROP_TASKS_SEED } from '../../docs/src/data/mock/prop.js?v=20261025a';
import { SEED_TODOS } from '../../docs/src/services/governance/todo.js?v=20261025a';
import { applyDerivedFacts } from '../../docs/src/data/mock/derive.js?v=20261025a';

const readJson = (rel) => JSON.parse(readFileSync(new URL(rel, import.meta.url), 'utf8'));

// ── 同源「mock 运行时行」构造 ────────────────────────────────────
// `activities / taskforces / workgroups*` 在 mock 形态由 `_seedInitialData` 做两步：
//   ① 活动组织落点归一（`normalizeSeedActivityOrganizing`，与 server/seed.js 同一函数）；
//   ② 数据模型必填装载默认（visibility / createdBy / createdAt；server/seed.js 同口径补齐）；
//   ③ `ensureLegacySourceWorkgroups` / `ensureDemoWorkgroupGrants` 派生工作组三表。
// 这里按同一顺序构造，保证比较面＝「mock 形态实际会读到的结构」。
const workgroupSeed = {
  activities: normalizeSeedActivitySeedRows(ACTIVITIES),
  taskforces: MOCK_TASKFORCES.map((row) => ({ ...row })),
  workgroups: [],
  workgroupMembers: [],
  workgroupGrants: [],
};
// Task 1（2026-10-25）：种子只存事实；比较面＝服务端落库后的派生形状（与 server/seed.js 同一个派生器）。
applyDerivedFacts(workgroupSeed, { people: PEOPLE });
ensureLegacySourceWorkgroups(workgroupSeed);
ensureDemoWorkgroupGrants(workgroupSeed);

const derivedSeedRows = {
  attendances: ATTENDANCE_RECORDS.map((row) => ({ ...row })),
  inspections: INSPECTION_RECORDS.map((row) => ({ ...row })),
  activityReviews: REVIEW_RECORDS.map((row) => ({ ...row })),
  notices: MOCK_NOTICES.map((row) => ({ ...row })),
  archiveRecords: SEED_ARCHIVE_RECORDS.map((row) => ({ ...row })),
};
applyDerivedFacts({
  activities: workgroupSeed.activities,
  ...derivedSeedRows,
}, { people: PEOPLE });

/**
 * 每张表对应的同源行（key = 物理表名）。
 * JSON 种子直接取顶层数组；`server/seed.js` 的常量已导出（供本测试与 Task 4 共用）。
 * ⚠ `issues` 用 **docs/data/issues.json 原文件**（mock 直读的口径）；
 *   服务端 `seedIssues()` 会补 `anonymous` ⇒ 由白名单按「服务端匿名化投影」豁免。
 */
const EXPECTED = {
  users: PEOPLE,
  branches: BRANCHES,
  party_groups: PARTY_GROUPS,
  milestones: readJson('../../docs/data/milestones.json').milestones,
  activities: workgroupSeed.activities,
  taskforces: workgroupSeed.taskforces,
  tasks: SEED_TASKS,
  assignments: SEED_ASSIGNMENTS,
  attendances: derivedSeedRows.attendances,
  inspections: derivedSeedRows.inspections,
  makeup_tasks: SEED_MAKEUP_TASKS,
  notices: derivedSeedRows.notices,
  todos: SEED_TODOS,
  signups: SEED_SIGNUPS,
  activity_reviews: derivedSeedRows.activityReviews,
  taskforce_reviews: TASKFORCE_REVIEW_RECORDS,
  thought_reports: THOUGHT_REPORTS,
  prop_tasks: PROP_TASKS_SEED,
  periodic_archive_submissions: PERIODIC_ARCHIVES_SEED,
  archive_records: derivedSeedRows.archiveRecords,
  issues: readJson('../../docs/data/issues.json').issues,
  review_requests: SEED_REVIEW_REQUESTS,
  external_dispatches: SEED_EXTERNAL_DISPATCHES,
  handoffs: SEED_HANDOFFS,
  member_confirmations: SEED_MEMBER_CONFIRMATIONS,
  attendance_appeals: SEED_ATTENDANCE_APPEALS,
  inspection_appeals: SEED_INSPECTION_APPEALS,
  issue_unread: SEED_ISSUE_UNREAD,
  appointment_records: SEED_APPOINTMENT_RECORDS,
  auth_audit: SEED_AUTH_AUDIT,
  workgroups: workgroupSeed.workgroups,
  workgroup_members: workgroupSeed.workgroupMembers,
  workgroup_grants: workgroupSeed.workgroupGrants,
};

/**
 * 客户端 / 装载投影白名单（只豁免字段存在性，不豁免类型）。
 * 每条必须写 reason；新增前先确认它确实是「读侧投影」而不是数据漂移。
 */
const PROJECTION_WHITELIST = [
  {
    table: 'issues', field: 'anonymous',
    reason: '服务端 seedIssues() 对匿名反馈补 anonymous=true（匿名口径的服务端投影）；mock 直读 issues.json 原文件无此字段',
  },
  {
    table: 'notices', field: 'read',
    reason: '客户端按当前登录人投影的已读态；静态种子里的 read 只是展示默认值，不属服务端结构真值',
  },
  {
    table: 'todos', field: 'personId',
    reason: '到人待办的运行时定向字段（VisitorTodoDeriver / 决议跟进写入）；静态种子无到人归属',
  },
  {
    table: 'todos', field: 'ownerType',
    reason: '到人 / 到角色待办的运行时归属字段（由分工快照派生），静态种子不落',
  },
  {
    table: 'todos', field: 'ownerId',
    reason: '到人 / 到角色待办的运行时归属字段（由分工快照派生），静态种子不落',
  },
];
const WHITELIST_INDEX = new Map(PROJECTION_WHITELIST.map((item) => [`${item.table}.${item.field}`, item]));

// ── 比较器（纯函数；自检见 C3）─────────────────────────────────
const typeOf = (value) => (Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value);

/**
 * @param {string} table
 * @param {Array<Object>} expectedRows 同源种子 / mock 行
 * @param {Array<Object>} actualRows   服务端物理表行
 * @returns {{problems:Array<{kind:string, table:string, id:string, field:string, detail:string}>, allowed:Array, stats:Object}}
 */
function compareStructure(table, expectedRows, actualRows) {
  const problems = [];
  const allowed = [];
  const stats = { rows: actualRows.length, expected: expectedRows.length, extra: 0, missing: 0, type: 0, allowed: 0, fields: 0 };

  const report = (kind, id, field, detail) => {
    const key = `${table}.${field}`;
    if (kind !== 'type' && WHITELIST_INDEX.has(key)) {
      allowed.push({ table, field, id, kind, reason: WHITELIST_INDEX.get(key).reason });
      stats.allowed++;
      return;
    }
    stats[kind]++;
    problems.push({ kind, table, id, field, detail });
  };

  const expectedById = new Map(expectedRows.map((row) => [String(row.id), row]));
  const actualById = new Map(actualRows.map((row) => [String(row.id), row]));

  for (const [id, expected] of expectedById) {
    const actual = actualById.get(id);
    if (!actual) {
      report('missing', id, '(row)', '服务端表缺少该种子行');
      continue;
    }
    const fields = new Set([...Object.keys(expected), ...Object.keys(actual)]);
    for (const field of fields) {
      stats.fields++;
      const hasExpected = Object.hasOwn(expected, field);
      const hasActual = Object.hasOwn(actual, field);
      if (hasActual && !hasExpected) {
        report('extra', id, field, `服务端有 ${typeOf(actual[field])}，种子无`);
        continue;
      }
      if (!hasActual && hasExpected) {
        report('missing', id, field, `种子有 ${typeOf(expected[field])}，服务端无`);
        continue;
      }
      const et = typeOf(expected[field]);
      const at = typeOf(actual[field]);
      if (et !== at) report('type', id, field, `服务端 ${at} ≠ 种子 ${et}`);
    }
  }

  for (const id of actualById.keys()) {
    if (!expectedById.has(id)) report('extra', id, '(row)', '服务端多出种子行');
  }

  return { problems, allowed, stats };
}

// ── B 类现场：内存库 + seedDatabase（与线上同一播种路径）──────────
const app = createApp({ dbPath: ':memory:' });
await seedDatabase(app.locals.db);
const db = app.locals.db;
const serverRows = (table) => db.prepare(`SELECT data FROM ${table}`).all().map((row) => JSON.parse(row.data));

// ── S1 主判据：manifest 全表结构对照（白名单外漂移即红）──────────
test('S1 结构真值：manifest 全表逐行比对字段集合 / 类型，输出多出 / 缺失 / 类型不符', () => {
  const allProblems = [];
  const allowedHits = [];
  const lines = [];
  let totalRows = 0;
  let totalExpectedRows = 0;
  let totalFields = 0;
  let extra = 0;
  let missing = 0;
  let type = 0;

  for (const entry of SEED_MANIFEST) {
    const expected = EXPECTED[entry.table];
    assert.ok(Array.isArray(expected), `${entry.table}：缺少同源行构造（manifest 有、EXPECTED 无）`);
    const actual = serverRows(entry.table);
    assert.ok(actual.length > 0, `${entry.table}：服务端表为空（播种缺口；空 == 空 会恒绿）`);

    const { problems, allowed, stats } = compareStructure(entry.table, expected, actual);
    allProblems.push(...problems);
    allowedHits.push(...allowed);
    extra += stats.extra;
    missing += stats.missing;
    type += stats.type;
    totalRows += stats.rows;
    totalExpectedRows += stats.expected;
    totalFields += stats.fields;
    lines.push(
      `[${entry.table}] server=${stats.rows} seed=${stats.expected} 多出=${stats.extra} 缺失=${stats.missing} 类型不符=${stats.type} 白名单豁免=${stats.allowed}`,
    );
  }

  // 报告（无论红绿都打印；便于「对照可重跑」时逐表读读数）
  console.log('\n── mock ↔ API 结构对照（B-499-4）──');
  console.log(lines.join('\n'));
  console.log(`合计：行 ${totalRows} / 种子行 ${totalExpectedRows} / 字段比较 ${totalFields}；多出=${extra} 缺失=${missing} 类型不符=${type}；白名单豁免=${allowedHits.length}`);

  assert.deepEqual(allProblems, [],
    `白名单外存在结构漂移（首因：mock/seed 数据或播种归一与 API/数据模型不一致）：\n${
      allProblems.slice(0, 40).map((p) => `  [${p.kind}] ${p.table}.${p.id}.${p.field}：${p.detail}`).join('\n')
    }${allProblems.length > 40 ? `\n  …共 ${allProblems.length} 条` : ''}`);

  // 白名单非空转：至少一条、每条有 reason、至少命中一条
  assert.ok(PROJECTION_WHITELIST.length > 0, '白名单不得为空（否则「投影字段」口径没有登记处）');
  for (const item of PROJECTION_WHITELIST) {
    assert.ok(item.reason && item.reason.length >= 10, `白名单 ${item.table}.${item.field} 必须写理由`);
  }
  assert.ok(allowedHits.length > 0, '白名单未命中任何一条（装饰性白名单）——应删掉未使用的条目或修正口径');

  // 抽取面下限（防「只比 5 张表」式空转）
  assert.ok(SEED_MANIFEST.length >= 30, `manifest 只覆盖 ${SEED_MANIFEST.length} 张表（下限 30）`);
  assert.ok(totalRows >= 300, `服务端比对行数合计 ${totalRows} < 300`);
  assert.ok(totalFields >= 1000, `字段比较次数 ${totalFields} < 1000`);
});

// ── S2 manifest 自身完整性 + 覆盖服务端实际播种表 ────────────────
test('S2 manifest 完整性：必填字段 / 枚举 / idPattern 命中全部种子行 / seedOwned 与 runtime 不相交', () => {
  const ids = new Set();
  for (const entry of SEED_MANIFEST) {
    for (const key of ['collection', 'table', 'seedModule', 'seedExport', 'idPattern', 'lifecycleClass', 'initTier']) {
      assert.ok(entry[key], `${entry.table}：manifest 缺 ${key}`);
    }
    assert.ok(!ids.has(entry.table), `manifest 表名重复：${entry.table}`);
    ids.add(entry.table);
    assert.ok(SEED_LIFECYCLE_CLASSES.includes(entry.lifecycleClass), `${entry.table}：非法 lifecycleClass`);
    assert.ok(SEED_INIT_TIERS.includes(entry.initTier), `${entry.table}：非法 initTier`);
    assert.ok(Array.isArray(entry.seedOwnedFields) && entry.seedOwnedFields.length > 0, `${entry.table}：seedOwnedFields 不得为空`);
    assert.ok(Array.isArray(entry.runtimeFields), `${entry.table}：runtimeFields 必须是数组`);
    const overlap = entry.seedOwnedFields.filter((field) => entry.runtimeFields.includes(field));
    assert.deepEqual(overlap, [], `${entry.table}：seedOwnedFields 与 runtimeFields 不得重叠`);

    const pattern = new RegExp(entry.idPattern);
    const rows = EXPECTED[entry.table];
    assert.ok(Array.isArray(rows), `${entry.table}：缺少同源行`);
    const bad = rows.filter((row) => !pattern.test(String(row.id))).map((row) => row.id);
    assert.deepEqual(bad, [], `${entry.table}：idPattern ${entry.idPattern} 未命中种子 id：${bad.slice(0, 5).join(',')}`);
  }
  assert.equal(Object.keys(SEED_MANIFEST_BY_TABLE).length, SEED_MANIFEST.length, 'SEED_MANIFEST_BY_TABLE 应覆盖全部表');
});

test('S2b manifest 覆盖服务端 seed.js 实际播种的全部表（双向）', () => {
  const source = readFileSync(new URL('../seed.js', import.meta.url), 'utf8');
  const seeded = new Set([
    ...[...source.matchAll(/replaceCollection\(\s*db,\s*'([a-z0-9_]+)'/g)].map((m) => m[1]),
    ...[...source.matchAll(/replaceWorkgroupTable\(\s*'([a-z0-9_]+)'/g)].map((m) => m[1]),
  ]);
  // `replaceWorkgroupTable` 的调用点是 `replaceWorkgroupTable('workgroups', ...)`（首参即表名）
  const manifestTables = new Set(SEED_MANIFEST.map((entry) => entry.table));
  const uncovered = [...seeded].filter((table) => !manifestTables.has(table));
  assert.deepEqual(uncovered, [], `seed.js 已播种但 manifest 未登记：${uncovered.join(', ')}`);
  const extra = [...manifestTables].filter((table) => !seeded.has(table));
  assert.deepEqual(extra, [], `manifest 登记但 seed.js 未播种（会「空 == 空」）：${extra.join(', ')}`);
});

// ── C3 比较器自检（防恒真）───────────────────────────────────────
test('C3 比较器自检：多字段 / 缺字段 / 类型不符 / 增删行都必须判出', () => {
  const base = [
    { id: 'x-1', name: '甲', count: 1, tags: ['a'], note: null },
    { id: 'x-2', name: '乙', count: 2, tags: [], note: 'n' },
  ];
  const pick = (rows) => compareStructure('t', base, rows);

  // 基线：完全一致 ⇒ 无问题
  assert.deepEqual(pick(base).problems, [], '同构两份不应报差异');

  // 多字段
  const extraField = base.map((row, i) => (i === 0 ? { ...row, extra: true } : row));
  assert.equal(pick(extraField).problems.filter((p) => p.kind === 'extra').length, 1, '未判出多字段');

  // 缺字段
  const missingField = base.map((row, i) => {
    if (i !== 0) return row;
    const { note: _drop, ...rest } = row;
    return rest;
  });
  assert.equal(pick(missingField).problems.filter((p) => p.kind === 'missing').length, 1, '未判出缺字段');

  // 类型不符（number → string；null → string）
  const typeChanged = base.map((row, i) => (i === 0 ? { ...row, count: '1', note: '不再是 null' } : row));
  assert.equal(pick(typeChanged).problems.filter((p) => p.kind === 'type').length, 2, '未判出类型不符');

  // 增行 / 删行
  assert.ok(pick([...base, { id: 'x-3', name: '丙', count: 3, tags: [], note: null }]).problems.some((p) => p.field === '(row)'), '未判出多行');
  assert.ok(pick(base.slice(1)).problems.some((p) => p.field === '(row)'), '未判出缺行');
});

// ── S3 反向断言：mock 种子不得含派生结果字段（批次 510 · SD-34 / DATA_MODEL §2.30）──
// 口径：`docs/src/data/mock/**` 只写**事实**（日期 / 取消 / 确认动作 / 归档指向…）；
//   status / archived / progress / overdue 一律由 `data/mock/derive.js::applyDerivedFacts` 现算。
//   种子若把派生结果写死，改一条事实不会让状态跟随（§2.30「改一条事实，全站跟随」失效）。
// 唯一例外：review.js 的专班复盘展示快照（见 S3 内注）——derive.js 尚未覆盖 taskforceReviews，
//   纪检复盘页仍靠它渲染进度胶囊；按 §2.30「保留演示快照必须登记并写理由」就地登记。
const MOCK_DIR = new URL('../../docs/src/data/mock/', import.meta.url);
const readMock = (name) => readFileSync(new URL(name, MOCK_DIR), 'utf8');
const mockIdCount = (src) => (src.match(/\bid\s*:\s*'/g) || []).length;
const lineOf = (src, index) => src.slice(0, index).split(/\r?\n/).length;

test('S3 mock 不得含派生结果字段：activities / review / inspection / taskforces（批次 510 · SD-34 / DATA_MODEL §2.30）', () => {
  const sources = {
    'activities.js': readMock('activities.js'),
    'review.js': readMock('review.js'),
    'inspection.js': readMock('inspection.js'),
    'taskforces.js': readMock('taskforces.js'),
  };

  // 非空转：四个种子文件必须读得到、且各有 ≥3 条 id 记录（防「文件被截断 / 正则失效 ⇒ 恒真」）。
  for (const [name, src] of Object.entries(sources)) {
    assert.ok(src.length > 1000, `mock/${name} 只读到 ${src.length} 字符（下限 1000）：读取面被写坏，S3 会变恒真`);
    const ids = mockIdCount(src);
    assert.ok(ids >= 3, `mock/${name} 只解析到 ${ids} 条 id 记录（下限 3）：种子被截断，S3 会变恒真`);
  }

  const hitsOf = (src, fields) => [...src.matchAll(new RegExp(`(?<![A-Za-z0-9_$])(?:${fields})\\s*:`, 'g'))]
    .map((m) => ({ field: m[0].replace(/\s*:$/, ''), index: m.index }));

  // ① activities：不得出现行级 status / archived；cancelled:true / draft:true 是事实，允许。
  const activityHits = hitsOf(sources['activities.js'], 'status|archived');
  assert.match(sources['activities.js'], /\bcancelled\s*:\s*true/,
    '（非空转）activities.js 里连 cancelled:true 事实都没有了——取消事实被误删，S3 的「允许事实」口径失效');
  assert.deepEqual(activityHits.map((h) => `activities.js:${lineOf(sources['activities.js'], h.index)} ${h.field}:`), [],
    'mock/activities.js 写死了派生结果字段（行级 status / archived）——请改种子（删除该字段，只留 date / cancelled / draft 等事实），不要改本断言');

  // ② review：活动复盘（REVIEW_RECORDS）不得出现 progress / overdue。
  //    豁免范围＝`export const TASKFORCE_REVIEW_RECORDS` 块（专班复盘展示快照，2 条 × progress/overdue）。
  const reviewSrc = sources['review.js'];
  const tfStart = reviewSrc.indexOf('export const TASKFORCE_REVIEW_RECORDS');
  const tfEnd = tfStart < 0 ? -1 : reviewSrc.indexOf('];', tfStart);
  assert.ok(tfStart >= 0 && tfEnd > tfStart,
    'mock/review.js 未找到 TASKFORCE_REVIEW_RECORDS 导出块：快照豁免范围失效，S3 会误判');
  const reviewHits = hitsOf(reviewSrc, 'progress|overdue')
    .filter((h) => !(h.index > tfStart && h.index < tfEnd))
    .map((h) => `review.js:${lineOf(reviewSrc, h.index)} ${h.field}:`);
  assert.deepEqual(reviewHits, [],
    'mock/review.js（活动复盘 / TASKFORCE_REVIEW_RECORDS 块外）写死了派生结果字段 progress / overdue' +
    '——请改种子（只留 activityId / reviewStatus / submittedAt 等事实），不要改本断言');

  // ③ inspection：不得出现行级 status；confirmedBy / confirmedAt 是确认动作事实，允许。
  const inspectionHits = hitsOf(sources['inspection.js'], 'status');
  assert.match(sources['inspection.js'], /\bconfirmed(?:By|At)\b/,
    '（非空转）inspection.js 里连 confirmedBy / confirmedAt 确认事实都没有了——考察确认事实被误删，S3 的「允许事实」口径失效');
  assert.deepEqual(inspectionHits.map((h) => `inspection.js:${lineOf(sources['inspection.js'], h.index)} ${h.field}:`), [],
    'mock/inspection.js 写死了派生结果字段（行级 status）——请改种子（只留 confirmedBy / confirmedAt 等确认动作事实），不要改本断言');

  // ④ taskforces：不得出现 status；状态由截止日 / 解散事实派生。
  const taskforceHits = hitsOf(sources['taskforces.js'], 'status');
  assert.deepEqual(taskforceHits.map((h) => `taskforces.js:${lineOf(sources['taskforces.js'], h.index)} ${h.field}:`), [],
    'mock/taskforces.js 写死了派生结果字段（status）——请改种子（只留 deadline / dissolvedAt / draft 等事实），不要改本断言');
});
