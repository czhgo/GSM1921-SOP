// server/seed-rows.js — 按 manifest 读取「当前种子行」（B-499-8 Task 4）
// ════════════════════════════════════════════════════════════════
// 只读模块：服务于 server/seed-repair.js（启动漂移修复）与测试。
// 口径与 server/seed.js 播种**同源**：同一 manifest、同一具名导出、同一归一函数。
// 不写库、不替换集合；返回 table → 当前种子行数组。
// ════════════════════════════════════════════════════════════════
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SEED_MANIFEST } from '../docs/src/data/seed-manifest.js';
import {
  normalizeSeedActivitySeedRows,
  ensureLegacySourceWorkgroups,
  ensureDemoWorkgroupGrants,
} from '../docs/src/data/workgroup-seed-sync.js';
import { MOCK_TASKFORCES } from '../docs/src/data/mock/taskforces.js';
import { PEOPLE } from '../docs/src/data/mock/people.js';
import { BRANCHES } from '../docs/src/data/mock/branches.js';
import { PARTY_GROUPS } from '../docs/src/data/mock/party-groups.js';
import { SEED_TASKS, SEED_ASSIGNMENTS, SEED_ARCHIVE_RECORDS, SEED_SIGNUPS, SEED_REVIEW_REQUESTS, SEED_MAKEUP_TASKS } from '../docs/src/data/mock/seed.js';
import { ATTENDANCE_RECORDS } from '../docs/src/data/mock/attendance.js';
import { INSPECTION_RECORDS } from '../docs/src/data/mock/inspection.js';
import { MOCK_NOTICES } from '../docs/src/data/mock/notices.js';
import { REVIEW_RECORDS, TASKFORCE_REVIEW_RECORDS } from '../docs/src/data/mock/review.js';
import { THOUGHT_REPORTS } from '../docs/src/data/mock/thought-reports.js';
import { PERIODIC_ARCHIVES_SEED, PROP_TASKS_SEED } from '../docs/src/data/mock/prop.js';
import { ACTIVITIES } from '../docs/src/data/mock/activities.js';
import { SEED_TODOS } from '../docs/src/services/governance/todo.js';
import {
  seedIssues, seedMilestones,
  SEED_EXTERNAL_DISPATCHES, SEED_HANDOFFS, SEED_MEMBER_CONFIRMATIONS,
  SEED_ATTENDANCE_APPEALS, SEED_INSPECTION_APPEALS, SEED_ISSUE_UNREAD,
  SEED_AUTH_AUDIT, SEED_APPOINTMENT_RECORDS,
} from './seed.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (rel) => JSON.parse(readFileSync(path.join(ROOT, rel), 'utf8'));
const cloneRows = (rows) => (Array.isArray(rows) ? rows.map((row) => ({ ...row })) : []);
const moduleCache = new Map();

async function importSeedModule(rel) {
  const url = pathToFileURL(path.join(ROOT, rel)).href;
  if (!moduleCache.has(url)) moduleCache.set(url, import(url));
  return moduleCache.get(url);
}

/** 静态/JSON 种子源直接映射（与 server/seed.js 的 import 同源，避免每次启动重复解析）。 */
const DIRECT_ROWS = {
  users: PEOPLE,
  branches: BRANCHES,
  party_groups: PARTY_GROUPS,
  tasks: SEED_TASKS,
  assignments: SEED_ASSIGNMENTS,
  attendances: ATTENDANCE_RECORDS,
  inspections: INSPECTION_RECORDS,
  makeup_tasks: SEED_MAKEUP_TASKS,
  notices: MOCK_NOTICES,
  todos: SEED_TODOS,
  signups: SEED_SIGNUPS,
  activity_reviews: REVIEW_RECORDS,
  taskforce_reviews: TASKFORCE_REVIEW_RECORDS,
  thought_reports: THOUGHT_REPORTS,
  prop_tasks: PROP_TASKS_SEED,
  periodic_archive_submissions: PERIODIC_ARCHIVES_SEED,
  archive_records: SEED_ARCHIVE_RECORDS,
  review_requests: SEED_REVIEW_REQUESTS,
  external_dispatches: SEED_EXTERNAL_DISPATCHES,
  handoffs: SEED_HANDOFFS,
  member_confirmations: SEED_MEMBER_CONFIRMATIONS,
  attendance_appeals: SEED_ATTENDANCE_APPEALS,
  inspection_appeals: SEED_INSPECTION_APPEALS,
  issue_unread: SEED_ISSUE_UNREAD,
  auth_audit: SEED_AUTH_AUDIT,
  appointment_records: SEED_APPOINTMENT_RECORDS,
};

let derivedCache = null;
/** 由活动/专班派生的工作组三表（与 server/seed.js 同一函数、同一顺序） */
async function derivedWorkgroupRows() {
  if (derivedCache) return derivedCache;
  const seed = {
    activities: normalizeSeedActivitySeedRows(ACTIVITIES),
    taskforces: MOCK_TASKFORCES.map((row) => ({ ...row })),
    workgroups: [],
    workgroupMembers: [],
    workgroupGrants: [],
  };
  ensureLegacySourceWorkgroups(seed);
  ensureDemoWorkgroupGrants(seed);
  derivedCache = seed;
  return seed;
}

/** 单表当前种子行（未知表 ⇒ []，由修复逻辑跳过） */
export async function loadSeedRowsForTable(table) {
  if (table === 'milestones') return cloneRows(seedMilestones());
  if (table === 'issues') return cloneRows(seedIssues());
  if (table === 'activities' || table === 'taskforces'
    || table === 'workgroups' || table === 'workgroup_members' || table === 'workgroup_grants') {
    const derived = await derivedWorkgroupRows();
    const key = {
      activities: 'activities', taskforces: 'taskforces',
      workgroups: 'workgroups', workgroup_members: 'workgroupMembers', workgroup_grants: 'workgroupGrants',
    }[table];
    return cloneRows(derived[key]);
  }
  if (DIRECT_ROWS[table]) return cloneRows(DIRECT_ROWS[table]);

  const entry = SEED_MANIFEST.find((item) => item.table === table);
  if (!entry) return [];
  if (entry.seedModule.endsWith('.json')) {
    const raw = readJson(entry.seedModule);
    return cloneRows(raw[entry.seedExport]);
  }
  const mod = await importSeedModule(entry.seedModule);
  return cloneRows(mod[entry.seedExport]);
}

/** 全部 manifest 表的当前种子行（table → rows） */
export async function loadSeedRowsByTable() {
  const out = {};
  for (const entry of SEED_MANIFEST) {
    out[entry.table] = await loadSeedRowsForTable(entry.table);
  }
  return out;
}
