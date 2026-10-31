// server/test/state-enum-guard.test.mjs — 专班/工作组状态枚举守卫（Phase 0 · R4-D03，2026-10-20）
//
// 裁定（支书）：「DB/枚举/mock 以页面功能与权限判据为准，不以旧数据已有值为保留理由；
//   mock 数据可删改；状态集合由 UI 流程反推。」
//
// 判据：
//   G1 canonical 集合在位且唯一：`domain.js` 导出的 TaskforceStatus / WorkgroupStatus 恰好是
//      draft / pending_review / recruiting / active / completed / archived / dissolved，且
//      未开放（draft/pending_review）、在办（recruiting/active）、终态（completed/archived/dissolved）
//      三分类不重不漏；直接流转只允许 recruiting → active。
//   G2 枚举单一源：状态判据/授权/迁移/服务端写口文件必须从 `domain.js` 取判据，不得本地再声明状态数组。
//   G3 无裸状态数组：`docs/src/**` 与 `server/**`（测试除外）不得出现仅由状态字面量组成的数组；
//      状态集合只能引用 domain.js 的导出。
//   G4 mock 数据不出现枚举外值：`derive.js` 从事实派生的专班状态必须在 TASKFORCE_STATUSES 内；
//      由 mock 生成的工作组 status 必须在 WORKGROUP_STATUSES 内。
//   G5 迁移不复制未知状态：历史别名 in_progress → active；未知值 → draft（只读待核）。
//   G6 文档同步：DATA_MODEL.md 含 canonical 集合与 2.3.2 小节。
//
// 运行：cd server && node --test test/state-enum-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import {
  TaskforceStatus, TASKFORCE_STATUSES, TASKFORCE_PRE_OPEN_STATUSES, TASKFORCE_ACTIVE_STATUSES,
  TASKFORCE_TERMINAL_STATUSES, TASKFORCE_DIRECT_TRANSITIONS,
  WorkgroupStatus, WORKGROUP_STATUSES, WORKGROUP_WRITABLE_STATUSES, WORKGROUP_CLOSED_STATUSES,
  isTaskforceStatus, workgroupStatusForTaskforce,
} from '../../docs/src/core/domain/domain.js?v=20261031a';
import { MOCK_TASKFORCES } from '../../docs/src/data/mock/taskforces.js?v=20261031a';
import { applyDerivedFacts } from '../../docs/src/data/mock/derive.js?v=20261031a';
import { ensureLegacySourceWorkgroups } from '../../docs/src/data/workgroup-seed-sync.js?v=20261031a';

const ROOT = join(import.meta.dirname, '..', '..');
const SELF = join(import.meta.dirname, 'state-enum-guard.test.mjs');
const EXPECTED = Object.freeze([
  'draft', 'pending_review', 'recruiting', 'active', 'completed', 'archived', 'dissolved',
]);

// 状态判据/授权/迁移/服务端写口：必须引用 domain.js 的单一源。
const SINGLE_SOURCE_FILES = [
  'docs/src/services/activity/taskforce.js',
  'docs/src/services/core/auth.js',
  'docs/src/data/workgroup-seed-sync.js',
  'docs/src/data/mock-adapter.js',
  'docs/src/entries/pages/activity-entry.js',
  'docs/src/entries/tabs/visitor/projects-tab.js',
  'docs/src/entries/tabs/org/taskforce-tab.js',
  'server/routes/resources/workgroup-routes.js',
  'server/routes/resources/branch-scope.js',
  'server/routes/resources/signup-write-guard.js',
  'server/routes/resources/index.js',
  'server/db.js',
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git') continue;
    const file = join(dir, name);
    if (statSync(file).isDirectory()) {
      // 测试文件允许出现状态字面量（构造夹具）；扫面只针对应用面。
      if (name === 'test' && dir.endsWith('server')) continue;
      walk(file, out);
      continue;
    }
    if (name.endsWith('.js') || name.endsWith('.mjs')) out.push(file);
  }
  return out;
}

const read = (relPath) => readFileSync(join(ROOT, relPath), 'utf8');

/** 取顶层 `function <name>` / `export function <name>` 的函数体（到列 0 的 `}` 为止；静态扫描够用） */
function functionBody(source, name) {
  const start = source.indexOf(`function ${name}`);
  if (start < 0) return null;
  const end = source.indexOf('\n}', start);
  return source.slice(start, end < 0 ? undefined : end + 2);
}

test('G1 canonical 集合：三分类不重不漏，直接流转仅 recruiting → active', () => {
  assert.deepEqual([...TASKFORCE_STATUSES], EXPECTED, 'TaskforceStatus 必须是 canonical 七态');
  assert.deepEqual([...WORKGROUP_STATUSES], EXPECTED, 'WorkgroupStatus 必须是 canonical 七态');
  assert.equal(new Set(TASKFORCE_STATUSES).size, EXPECTED.length, '专班状态不得重复');

  const partition = [
    ...TASKFORCE_PRE_OPEN_STATUSES, ...TASKFORCE_ACTIVE_STATUSES, ...TASKFORCE_TERMINAL_STATUSES,
  ];
  assert.deepEqual([...partition].sort(), [...EXPECTED].sort(), '未开放/在办/终态必须覆盖全部状态');
  assert.equal(new Set(partition).size, EXPECTED.length, '未开放/在办/终态不得重叠');

  assert.deepEqual([...WORKGROUP_WRITABLE_STATUSES], [TaskforceStatus.RECRUITING, TaskforceStatus.ACTIVE],
    '工作组写权限只认招募中/运行中');
  assert.deepEqual([...WORKGROUP_CLOSED_STATUSES], [
    TaskforceStatus.COMPLETED, TaskforceStatus.ARCHIVED, TaskforceStatus.DISSOLVED,
  ], '工作组终态必须是已完结/已归档/已解散');

  assert.deepEqual(Object.keys(TASKFORCE_DIRECT_TRANSITIONS).sort(), [...EXPECTED].sort(),
    '直接流转表必须覆盖全部状态（每个状态都有显式出口，防止漏态）');
  const transitions = Object.entries(TASKFORCE_DIRECT_TRANSITIONS)
    .flatMap(([from, list]) => list.map((to) => `${from}->${to}`));
  assert.deepEqual(transitions, ['recruiting->active'],
    '普通状态流转只允许 recruiting → active；其余必须走支委会/收尾语义写口');
});

test('G2 枚举单一源：授权/迁移/服务端写口均引用 domain.js，不本地再声明状态数组', () => {
  for (const relPath of SINGLE_SOURCE_FILES) {
    const source = read(relPath);
    assert.match(source, /from '[^']*domain\.js[^']*'/, `${relPath} 未从 domain.js 引用状态单一源`);
    assert.match(source, /(TASKFORCE_|WORKGROUP_|TaskforceStatus|WorkgroupStatus|isTaskforce|isWorkgroup|workgroupStatusForTaskforce)/,
      `${relPath} 未使用 canonical 状态导出`);
  }

  // 模型层级不得重新声明状态全集（防「单一源」被同名常量旁路）。
  const domain = read('docs/src/core/domain/domain.js');
  const declarations = domain.match(/export const (?:TASKFORCE|WORKGROUP)_STATUSES\s*=/g) || [];
  assert.equal(declarations.length, 2, '状态全集只能在 domain.js 声明一次（专班/工作组各一）');
});

test('G3 无裸状态数组：应用面不得出现仅由状态字面量组成的数组', () => {
  const literalArray = /\[\s*['"](?:draft|pending_review|recruiting|active|completed|archived|dissolved)['"](?:\s*,\s*['"](?:draft|pending_review|recruiting|active|completed|archived|dissolved)['"])*\s*\]/g;
  const hits = [];
  let scanned = 0;
  for (const dir of [join(ROOT, 'docs', 'src'), join(ROOT, 'server')]) {
    for (const file of walk(dir)) {
      if (file === SELF || file === join(ROOT, 'docs', 'src', 'core', 'domain', 'domain.js')) continue;
      scanned += 1;
      readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, index) => {
        literalArray.lastIndex = 0;
        if (literalArray.test(line)) hits.push(`${relative(ROOT, file).replace(/\\/g, '/')}:${index + 1}`);
      });
    }
  }
  assert.ok(scanned >= 200, `只扫到 ${scanned} 个源文件（基线 200）：扫描面被写坏，G3 会变恒真`);
  assert.deepEqual(hits, [], '发现裸状态数组——请改用 domain.js 的 TASKFORCE_*/WORKGROUP_* 或 isXxxStatus：\n  '
    + hits.join('\n  '));
});

test('G4 mock 数据：专班派生状态必须落在 canonical 枚举内，生成的工作组状态同源', () => {
  assert.ok(MOCK_TASKFORCES.length >= 8, 'mock 专班语料缺失，判据会变空转');
  // Task 1（2026-10-25）：种子不再写 status；状态由 derive.js 从截止日 / 解散事实派生。
  const derivedTaskforces = MOCK_TASKFORCES.map((row) => ({ ...row }));
  applyDerivedFacts({ activities: [], taskforces: derivedTaskforces });
  const illegal = derivedTaskforces.filter((row) => !isTaskforceStatus(row.status));
  assert.deepEqual(illegal.map((row) => `${row.id}:${row.status}`), [],
    'mock 专班派生状态出现枚举外值');

  const db = {
    activities: [],
    taskforces: derivedTaskforces.map((row) => ({ ...row })),
    workgroups: [], workgroupMembers: [], workgroupGrants: [],
  };
  ensureLegacySourceWorkgroups(db);
  assert.equal(db.workgroups.length, MOCK_TASKFORCES.length, '每个 mock 专班都应生成一个工作组');
  const illegalGroups = db.workgroups.filter((row) => !WORKGROUP_STATUSES.includes(row.status));
  assert.deepEqual(illegalGroups.map((row) => `${row.sourceId}:${row.status}`), [],
    'mock 生成的工作组出现枚举外状态');

  for (const group of db.workgroups) {
    const source = derivedTaskforces.find((row) => row.id === group.sourceId);
    assert.equal(group.status, workgroupStatusForTaskforce(source.status),
      `${group.sourceId} 的工作组状态应由专班状态 canonical 映射`);
  }
});

test('G5 迁移映射：in_progress → active；未知状态不得原样复制（→ draft 只读待核）', () => {
  const db = {
    activities: [],
    taskforces: [
      { id: 'tf-legacy-progress', name: '历史进行中', task: '任务', status: 'in_progress' },
      { id: 'tf-unknown', name: '未知状态', task: '任务', status: 'mystery-state' },
      { id: 'tf-no-status', name: '无状态历史记录', task: '任务' },
    ],
    workgroups: [], workgroupMembers: [], workgroupGrants: [],
  };
  ensureLegacySourceWorkgroups(db);
  const bySource = new Map(db.workgroups.map((row) => [row.sourceId, row.status]));
  assert.equal(bySource.get('tf-legacy-progress'), TaskforceStatus.ACTIVE, 'in_progress 应映射到 active');
  assert.equal(bySource.get('tf-unknown'), TaskforceStatus.DRAFT, '未知状态不得原样复制，应落 draft');
  assert.equal(bySource.get('tf-no-status'), TaskforceStatus.DRAFT, '缺失状态不得默认成可写状态，应落 draft');
  assert.ok(!WORKGROUP_STATUSES.includes('mystery-state') && !WORKGROUP_STATUSES.includes('in_progress'),
    '枚举外值不得进入工作组状态全集');
});

test('G6 文档同步：DATA_MODEL.md 写明 canonical 集合与状态分离', () => {
  const doc = read('content/04_web_design/data/DATA_MODEL.md');
  assert.match(doc, /2\.3\.2 专班 \/ 工作组状态 canonical 集合/, 'DATA_MODEL.md 缺少 2.3.2 状态小节');
  for (const status of EXPECTED) {
    assert.ok(doc.includes(`\`${status}\``), `DATA_MODEL.md 未登记状态 ${status}`);
  }
  assert.match(doc, /TASKFORCE_STATUSES/, 'DATA_MODEL.md 未指向专班状态单一源');
  assert.match(doc, /WORKGROUP_STATUSES/, 'DATA_MODEL.md 未指向工作组状态单一源');
  assert.match(doc, /不得把活动的 `published\/ongoing\/cancelled\/pending-approval` 写入专班或工作组/,
    'DATA_MODEL.md 未声明活动状态与专班/工作组状态分离');
});

// ═════════════════════════════════════════════════════════════════════════════
// 二、活动 / 消息状态单一源（批次 510 · SD-34）
//   判据：状态集合由 UI 流程反推，页面不得再写本地状态机；同一状态只能有一个派生器 / 一个种类判定。
//   G7 支委会页签：会议状态只认 `deriveMeetingStatus`，不得回落本地 `meetingStatus()`；
//   G8 派生器：`deriveActivityStatus` / `deriveMeetingStatus` 必须导出，活动状态返回值 ⊆ 五态；
//   G9 消息种类：`kindOf` 单一源，kind 只认 announcement / system / message，规范化必须处理逐人归档。
// ═════════════════════════════════════════════════════════════════════════════

test('G7 支委会页签：会议状态不再本地判定，统一走 deriveMeetingStatus（批次 510 · SD-34）', () => {
  const rel = 'docs/src/entries/tabs/secretary/committee-meeting-tab.js';
  const source = read(rel);
  assert.ok(source.length > 1000,
    `${rel} 只读到 ${source.length} 字符（下限 1000）：读取面被写坏，本条会变恒真`);

  assert.ok(!/function\s+meetingStatus\s*\(/.test(source),
    `${rel} 又出现本地状态机 function meetingStatus()——会议状态判据唯一源是 data/mock/derive.js::deriveMeetingStatus`);
  // 「待召开」只允许作为徽章档的展示键出现；判定 / 返回该值＝页签又自算状态。
  assert.ok(!/(?:return|=>)\s*'待召开'/.test(source) && !/[=!]==?\s*'待召开'/.test(source),
    `${rel} 出现「待召开」字面量判定 / 返回分支——页面不得自行判会议状态，应由 deriveMeetingStatus 返回后只做展示映射`);
  assert.match(source, /import\s*\{[^}]*\bderiveMeetingStatus\b[^}]*\}\s*from\s*'[^']*data\/mock\/derive\.js/,
    `${rel} 未从 data/mock/derive.js 导入 deriveMeetingStatus（会议状态单一源）`);
});

test('G8 派生器单源：deriveActivityStatus / deriveMeetingStatus 必须导出，活动状态返回值 ⊆ 五态（批次 510 · SD-34）', () => {
  const rel = 'docs/src/data/mock/derive.js';
  const source = read(rel);
  assert.ok(source.length > 1000,
    `${rel} 只读到 ${source.length} 字符（下限 1000）：读取面被写坏，本条会变恒真`);

  const activityBody = functionBody(source, 'deriveActivityStatus');
  const meetingBody = functionBody(source, 'deriveMeetingStatus');
  assert.ok(activityBody, `${rel} 未导出 deriveActivityStatus`);
  assert.ok(meetingBody, `${rel} 未导出 deriveMeetingStatus`);

  // 静态扫描（不执行）：只看 `return <expr>;` 里的字符串字面量；`return a.status` 这类透传不计。
  const returns = [...activityBody.matchAll(/return\s+([^;]+);/g)].map((m) => m[1]);
  const literals = returns.flatMap((expr) => [...expr.matchAll(/'([^']+)'/g)].map((m) => m[1]));
  assert.ok(literals.length >= 4,
    `deriveActivityStatus 只抽到 ${literals.length} 个返回字面量（下限 4）：函数被改写或扫描口径失效，本条会变恒真`);

  const allowed = new Set(['draft', 'published', 'ongoing', 'completed', 'cancelled']);
  const illegal = [...new Set(literals.filter((value) => !allowed.has(value)))];
  assert.deepEqual(illegal, [],
    `deriveActivityStatus 返回了五态之外的值：${illegal.map((v) => `'${v}'`).join(' / ')}` +
    `（允许集合 = draft / published / ongoing / completed / cancelled）——请改派生器，不要放宽本断言`);
});

test('G9 消息种类单一源：notice.js 导出 kindOf，kind 判定只认三种身份，规范化含 archivedBy（批次 510 · SD-34）', () => {
  const rel = 'docs/src/services/governance/notice.js';
  const source = read(rel);
  assert.ok(source.length > 1000,
    `${rel} 只读到 ${source.length} 字符（下限 1000）：读取面被写坏，本条会变恒真`);

  assert.match(source, /export function kindOf\s*\(/,
    `${rel} 未导出 kindOf（消息种类判定的单一源）`);

  const checks = [...source.matchAll(/\bkind\s*[!=]==?\s*'([^']+)'/g)].map((m) => m[1]);
  assert.ok(checks.length >= 3,
    `只扫到 ${checks.length} 处 kind 字面量判定（下限 3）：判定写法被改写，本条会变恒真`);

  const allowed = new Set(['announcement', 'system', 'message']);
  const illegal = [...new Set(checks.filter((value) => !allowed.has(value)))];
  assert.deepEqual(illegal, [],
    `${rel} 的 kind 判定出现三种消息身份之外的值：${illegal.map((v) => `'${v}'`).join(' / ')}` +
    `（只允许 announcement / system / message）——请改 kindOf，不要放宽本断言`);

  const normalizeBody = functionBody(source, '_normalizeNotice');
  assert.ok(normalizeBody, `${rel} 未找到历史行规范化函数 _normalizeNotice`);
  assert.match(normalizeBody, /archivedBy/,
    `${rel}::_normalizeNotice 未处理 archivedBy（逐人归档名单）——归档会退回「一条收藏，全站跟着没」的旧口径`);
});
