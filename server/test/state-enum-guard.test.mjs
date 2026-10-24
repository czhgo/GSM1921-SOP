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
//   G4 mock 数据不出现枚举外值：`MOCK_TASKFORCES[].status` 必须在 TASKFORCE_STATUSES 内；
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
} from '../../docs/src/core/domain/domain.js?v=20261024a';
import { MOCK_TASKFORCES } from '../../docs/src/data/mock/taskforces.js?v=20261024a';
import { ensureLegacySourceWorkgroups } from '../../docs/src/data/workgroup-seed-sync.js?v=20261024a';

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

test('G4 mock 数据：专班状态必须落在 canonical 枚举内，生成的工作组状态同源', () => {
  assert.ok(MOCK_TASKFORCES.length >= 8, 'mock 专班语料缺失，判据会变空转');
  const illegal = MOCK_TASKFORCES.filter((row) => !isTaskforceStatus(row.status));
  assert.deepEqual(illegal.map((row) => `${row.id}:${row.status}`), [],
    'mock 专班出现枚举外状态');

  const db = {
    activities: [],
    taskforces: MOCK_TASKFORCES.map((row) => ({ ...row })),
    workgroups: [], workgroupMembers: [], workgroupGrants: [],
  };
  ensureLegacySourceWorkgroups(db);
  assert.equal(db.workgroups.length, MOCK_TASKFORCES.length, '每个 mock 专班都应生成一个工作组');
  const illegalGroups = db.workgroups.filter((row) => !WORKGROUP_STATUSES.includes(row.status));
  assert.deepEqual(illegalGroups.map((row) => `${row.sourceId}:${row.status}`), [],
    'mock 生成的工作组出现枚举外状态');

  for (const group of db.workgroups) {
    const source = MOCK_TASKFORCES.find((row) => row.id === group.sourceId);
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
