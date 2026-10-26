// ════════════════════════════════════════════════════════════════
//  server/scripts/import-branch.mjs —— 正式数据导入（users / activities / attendances）
//
//  用法（在 server/ 目录下；**缺省 dry-run**）：
//    node scripts/import-branch.mjs --branch br-b1 --file data.json            # 只校验，不写
//    node scripts/import-branch.mjs --branch br-b1 --file data.json --apply    # 单事务导入
//    node scripts/import-branch.mjs --branch br-b1 --users users.csv --activities activities.csv --attendances attendances.csv --apply
//    node scripts/import-branch.mjs --branch br-b1 --file data.json --db D:\data\data.db --apply
//
//  输入形态：
//    · JSON：`{ "users": [...], "activities": [...], "attendances": [...] }`（键可缺省）
//    · CSV ：每类一个文件；首行为表头。单元格可用引号包裹；`assignments` / `agenda` 可写 JSON 文本。
//
//  支持的表（**仅这三类**）：
//    · users        —— id/name 必填；studentId 缺省=id；role 缺省 participant（不得 party-staff）；
//    · activities   —— id/title/date/type/organizer 必填；无 assignments 时自动补 organizer；
//                      与在线写口同源建工作组（`createActivityWorkgroup`）；
//    · attendances  —— activityId/personId/status 必填；id 缺省按 (activityId,personId) 稳定生成。
//
//  **未支持的表**（请走界面/语义端点或后续批次扩展；脚本不会静默忽略你的文件字段）：
//    branches / tasks / inspections / taskforces / notices / todos / assignments / signups /
//    activityReviews / taskforceReviews / archiveRecords / branchDocs / fileSpaceRecords /
//    imageRecords / issues / memberChangeRequests / agendaVotes / partyGroups / memberFlows /
//    propTasks / periodicArchives / externalDispatches / handoffs / memberConfirmations 等。
//
//  安全语义：
//    · **单事务**：users → activities（含工作组）→ attendances 全在一个 SQLite 事务内；
//      任一行失败 ⇒ 整体回滚，库保持导入前状态；
//    · **引用不存在即拒绝**：activity.organizer / assignments[].personId / attendance.personId
//      必须在（导入后或既有）users 中且属于目标支部；attendance.activityId 必须在（导入后或既有）
//      activities 中且属于目标支部；
//    · **不静默改归属**：既有人员若属于其他支部 ⇒ 拒绝；活动/考勤 id 已存在 ⇒ 拒绝。
// ════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { initDb, bumpCollectionVersion } from '../db.js';
import { DEFAULT_BRANCH_ID, ROLE_KEYS, ACTIVITY_SCOPES, isBranchLevelActivity, normalizeOrganizingScope } from '../../docs/src/core/domain/constants.js';
import { AttendanceStatus } from '../../docs/src/core/domain/domain.js';
import { workgroupIdFor } from '../../docs/src/data/activity-workgroup-sync.js';
import { applyDerivedFacts } from '../../docs/src/data/mock/derive.js';
import { createActivityWorkgroup } from '../routes/resources/workgroup-routes.js';

const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROLE_SET = new Set(ROLE_KEYS);
const ATTENDANCE_SET = new Set(Object.values(AttendanceStatus));
const UNSUPPORTED = [
  'branches / tasks / inspections / taskforces / notices / todos / assignments / signups',
  'activityReviews / taskforceReviews / archiveRecords / branchDocs / fileSpaceRecords / imageRecords',
  'issues / memberChangeRequests / agendaVotes / partyGroups / memberFlows / propTasks / periodicArchives',
  'externalDispatches / handoffs / memberConfirmations',
];

function parseArgs(argv) {
  const out = { apply: false, branch: null, db: null, file: null, users: null, activities: null, attendances: null };
  const valued = new Set(['branch', 'db', 'file', 'users', 'activities', 'attendances']);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--apply') { out.apply = true; continue; }
    if (arg === '--dry-run') { out.apply = false; continue; }
    if (!arg.startsWith('--')) throw new Error(`未知参数：${arg}`);
    const key = arg.slice(2);
    if (!valued.has(key)) throw new Error(`未知参数：${arg}（可用：--branch --file --users --activities --attendances --db --apply --dry-run）`);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`参数 --${key} 缺值`);
    out[key] = value;
    i++;
  }
  if (!out.branch) throw new Error('必须指定 --branch <支部 id>');
  if (!out.file && !out.users && !out.activities && !out.attendances) throw new Error('至少给 --file，或 --users/--activities/--attendances 之一');
  return out;
}

/** 极简 CSV 解析（支持引号、转义双引号、CRLF） */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const src = String(text || '').replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === ',') { row.push(field); field = ''; continue; }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((v) => String(v).trim() !== '')) rows.push(row);
      row = [];
      continue;
    }
    field += ch;
  }
  row.push(field);
  if (row.some((v) => String(v).trim() !== '')) rows.push(row);
  if (!rows.length) return [];
  const header = rows.shift().map((h) => String(h).trim());
  return rows.map((cells) => Object.fromEntries(header.map((key, idx) => [key, String(cells[idx] ?? '').trim()])));
}

const maybeJson = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') return value;
  const text = value.trim();
  if (!text.startsWith('[') && !text.startsWith('{')) return value;
  try { return JSON.parse(text); } catch (_) { return value; }
};

function loadRecords(file) {
  const abs = path.resolve(file);
  const text = fs.readFileSync(abs, 'utf8');
  if (/\.csv$/i.test(abs)) return parseCsv(text);
  const json = JSON.parse(text);
  if (Array.isArray(json)) return json;
  return json;
}

function loadInput(args) {
  const out = { users: [], activities: [], attendances: [] };
  if (args.file) {
    const json = loadRecords(args.file);
    if (Array.isArray(json)) throw new Error('--file 的 JSON 须为对象 { users, activities, attendances }');
    for (const key of ['users', 'activities', 'attendances']) {
      if (json[key] !== undefined) {
        if (!Array.isArray(json[key])) throw new Error(`JSON 字段 ${key} 须为数组`);
        out[key].push(...json[key]);
      }
    }
  }
  for (const key of ['users', 'activities', 'attendances']) {
    if (!args[key]) continue;
    const rows = loadRecords(args[key]);
    if (!Array.isArray(rows)) throw new Error(`${key} 文件须为数组（CSV 行数组或 JSON 数组）`);
    out[key].push(...rows);
  }
  return out;
}

const byId = (rows) => new Map(rows.map((row) => [String(row.id), row]));

/**
 * 校验并生成计划（纯读；不写库）。任何引用/形状问题抛错（脚本打印后退出 1）。
 */
function buildPlan(db, { branchId, users, activities, attendances, actorId }) {
  const branchRow = db.prepare('SELECT data FROM branches WHERE id = ?').get(branchId);
  if (!branchRow) throw new Error(`目标支部不存在：${branchId}`);
  const branch = JSON.parse(branchRow.data);

  const dbUsers = db.prepare('SELECT data FROM users').all().map((r) => JSON.parse(r.data));
  const usersById = byId(dbUsers);
  const cleanUsers = [];
  const incomingUserIds = new Set();
  for (const raw of users) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('users 行须为对象');
    const id = String(raw.id ?? '').trim();
    const name = String(raw.name ?? '').trim();
    if (!id) throw new Error('users 行缺少 id（学号/工号）');
    if (!name) throw new Error(`users ${id} 缺少姓名`);
    if (incomingUserIds.has(id)) throw new Error(`users id 重复：${id}`);
    incomingUserIds.add(id);
    const existing = usersById.get(id);
    if (existing && (existing.branchId || DEFAULT_BRANCH_ID) !== branchId) {
      throw new Error(`users ${id} 已属于其他支部（${existing.branchId || '未归属'}），不能静默改归属`);
    }
    // 未给 role 时保留既有角色（防整表导入把现任支委静默降级）
    const role = raw.role === undefined || raw.role === null || String(raw.role).trim() === ''
      ? (existing?.role || 'participant') : String(raw.role).trim();
    if (!ROLE_SET.has(role)) throw new Error(`users ${id} 的角色无效：${role}`);
    if (role === 'party-staff') throw new Error(`users ${id} 不能是党委组织员（组织级角色不属于支部）`);
    const next = {
      ...(existing || {}),
      id,
      name,
      studentId: raw.studentId ? String(raw.studentId) : (existing?.studentId || id),
      role,
      branchId,
      ...(raw.partyGroup !== undefined ? { partyGroup: String(raw.partyGroup) } : {}),
      ...(raw.developStage !== undefined ? { developStage: String(raw.developStage) } : {}),
      ...(raw.residenceStatus !== undefined ? { residenceStatus: String(raw.residenceStatus) } : {}),
      ...(raw.residenceNote !== undefined ? { residenceNote: String(raw.residenceNote) } : {}),
      ...(raw.email !== undefined ? { email: String(raw.email) } : {}),
      ...(raw.phone !== undefined ? { phone: String(raw.phone) } : {}),
    };
    delete next.transferOut; delete next.transferOutAt; delete next.transferOutNote;
    cleanUsers.push(next);
  }
  const effectiveUsers = new Map([...usersById, ...cleanUsers.map((row) => [String(row.id), row])]);
  const assertMember = (personId, where) => {
    const id = String(personId ?? '').trim();
    if (!id) throw new Error(`${where} 缺少 personId`);
    const user = effectiveUsers.get(id);
    if (!user) throw new Error(`${where} 引用了不存在的人员：${id}`);
    if ((user.branchId || DEFAULT_BRANCH_ID) !== branchId) throw new Error(`${where} 的人员 ${id} 不属于目标支部`);
    return user;
  };

  const dbActivities = new Map(db.prepare('SELECT data FROM activities').all()
    .map((row) => { const data = JSON.parse(row.data); return [String(data.id), data]; }));
  const cleanActivities = [];
  const incomingActivityIds = new Set();
  for (const raw of activities) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('activities 行须为对象');
    const id = String(raw.id ?? '').trim();
    const title = String(raw.title ?? '').trim();
    const date = String(raw.date ?? '').trim();
    const type = String(raw.type ?? '').trim();
    const organizer = String(raw.organizer ?? '').trim();
    if (!id) throw new Error('activities 行缺少 id');
    if (!title) throw new Error(`activities ${id} 缺少 title`);
    if (!date) throw new Error(`activities ${id} 缺少 date`);
    if (!type) throw new Error(`activities ${id} 缺少 type`);
    if (!organizer) throw new Error(`activities ${id} 缺少 organizer`);
    if (incomingActivityIds.has(id)) throw new Error(`activities id 重复：${id}`);
    incomingActivityIds.add(id);
    if (dbActivities.has(id)) throw new Error(`activities ${id} 已存在（导入不静默覆盖既有活动）`);
    assertMember(organizer, `activities ${id}.organizer`);
    const rawAssignments = maybeJson(raw.assignments);
    const assignments = Array.isArray(rawAssignments) && rawAssignments.length
      ? rawAssignments.map((item) => {
        const personId = String(item?.personId ?? '').trim();
        assertMember(personId, `activities ${id}.assignments`);
        const role = String(item?.role || 'deep').trim();
        if (!['organizer', 'deep', 'participant'].includes(role)) throw new Error(`activities ${id}.assignments 角色无效：${role}`);
        return { ...item, personId, role };
      })
      : [{ personId: organizer, role: 'organizer' }];
    const hostGroupId = raw.hostGroupId ? String(raw.hostGroupId) : null;
    if (hostGroupId) {
      const groupRow = db.prepare('SELECT data FROM party_groups WHERE id = ?').get(hostGroupId);
      if (!groupRow) throw new Error(`activities ${id}.hostGroupId 引用了不存在的党小组：${hostGroupId}`);
      if ((JSON.parse(groupRow.data).branchId || DEFAULT_BRANCH_ID) !== branchId) throw new Error(`activities ${id}.hostGroupId 不属于目标支部`);
    }
    const row = {
      ...raw,
      id,
      title,
      date,
      type,
      organizer,
      branchId,
      assignments,
      organizingScope: normalizeOrganizingScope(raw.organizingScope, { ...raw, organizer, assignments }),
      ...(hostGroupId ? { hostGroupId } : {}),
      createdBy: raw.createdBy || actorId,
      workgroupId: workgroupIdFor('activity', id),
      createdAt: raw.createdAt || new Date().toISOString(),
    };
    if (isBranchLevelActivity(row)) { row.hostGroupId = null; row.hostGroup = ''; }
    if (row.status !== undefined && !['draft', 'published', 'cancelled'].includes(String(row.status))) {
      throw new Error(`activities ${id}.status 无效：${row.status}`);
    }
    if (row.agenda !== undefined) row.agenda = maybeJson(row.agenda) ?? row.agenda;
    cleanActivities.push(row);
  }

  const dbAttendances = db.prepare('SELECT data FROM attendances').all().map((r) => JSON.parse(r.data));
  const pairSeen = new Map(dbAttendances.map((row) => [`${row.activityId}\u0000${row.personId}`, row]));
  const attendanceById = new Map(dbAttendances.map((row) => [String(row.id), row]));
  const activityIds = new Set([...dbActivities.keys(), ...cleanActivities.map((row) => String(row.id))]);
  const cleanAttendances = [];
  for (const raw of attendances) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('attendances 行须为对象');
    const activityId = String(raw.activityId ?? '').trim();
    const personId = String(raw.personId ?? '').trim();
    const status = String(raw.status ?? '').trim();
    if (!activityId) throw new Error('attendances 行缺少 activityId');
    if (!personId) throw new Error(`attendances ${activityId} 缺少 personId`);
    if (!activityIds.has(activityId)) throw new Error(`attendances 引用了不存在的活动：${activityId}`);
    assertMember(personId, `attendances ${activityId}`);
    if (!ATTENDANCE_SET.has(status)) throw new Error(`attendances ${activityId}/${personId} 状态无效：${status || '空'}`);
    const pair = `${activityId}\u0000${personId}`;
    if (pairSeen.has(pair)) throw new Error(`attendances 已存在同一活动与人员：${activityId} / ${personId}`);
    pairSeen.set(pair, raw);
    const generated = `att-${createHash('sha1').update(pair).digest('hex').slice(0, 8)}`;
    const id = String(raw.id ?? '').trim() || generated;
    if (attendanceById.has(id)) throw new Error(`attendances id 已存在：${id}`);
    const confirmed = raw.confirmed === true || raw.confirmed === 'true' || raw.confirmed === '1';
    const now = new Date().toISOString();
    const row = {
      ...raw,
      id,
      activityId,
      personId,
      status,
      branchId,
      recordedBy: actorId,
      ...(confirmed ? { confirmed: true, confirmedBy: actorId, confirmedAt: now } : {}),
      createdAt: raw.createdAt || now,
    };
    cleanAttendances.push(row);
  }

  return { branch, users: cleanUsers, activities: cleanActivities, attendances: cleanAttendances };
}

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); } catch (e) {
    console.error(`[import] ✖ ${e.message}`);
    process.exit(1);
  }
  const dbPath = path.resolve(args.db || process.env.DB_PATH || path.join(SERVER_DIR, 'data.db'));
  if (!fs.existsSync(dbPath)) {
    console.error(`[import] ✖ 库不存在：${dbPath}（请先起一次服务建库，或用 --db 指定）`);
    process.exit(1);
  }
  let input;
  try { input = loadInput(args); } catch (e) {
    console.error(`[import] ✖ 读取导入文件失败：${e.message}`);
    process.exit(1);
  }

  console.log(`[import] 目标库：${dbPath}`);
  console.log(`[import] 目标支部：${args.branch}`);
  console.log(`[import] 模式：${args.apply ? 'APPLY（单事务写入）' : 'DRY-RUN（只校验，不写）'}`);
  console.log('[import] 未支持的表（请走界面/语义端点）：');
  for (const line of UNSUPPORTED) console.log(`[import]   · ${line}`);

  const db = initDb(dbPath);
  let plan;
  try {
    const actorRow = db.prepare('SELECT data FROM users').all()
      .map((r) => JSON.parse(r.data)).find((u) => u.role === 'party-staff');
    const actorId = actorRow ? actorRow.id : 'system-import';
    plan = buildPlan(db, {
      branchId: String(args.branch), users: input.users, activities: input.activities,
      attendances: input.attendances, actorId,
    });
    console.log(`[import] 校验通过：users=${plan.users.length} · activities=${plan.activities.length} · attendances=${plan.attendances.length}`);
    if (!args.apply) {
      console.log('[import] --dry-run 结束：未写入任何数据。确认无误后加 --apply。');
      db.close();
      return;
    }
    const run = db.transaction(() => {
      const put = db.prepare('INSERT OR REPLACE INTO users (id, data) VALUES (?, ?)');
      for (const row of plan.users) put.run(row.id, JSON.stringify(row));
      for (const row of plan.activities) {
        const created = createActivityWorkgroup(db, { id: 'import', role: 'party-staff', branchId: args.branch }, row);
        if (!created.ok) throw new Error(`activities ${row.id} 建组失败：${created.error}`);
      }
      const putAttendance = db.prepare('INSERT OR REPLACE INTO attendances (id, data) VALUES (?, ?)');
      for (const row of plan.attendances) putAttendance.run(row.id, JSON.stringify(row));
      // 派生字段（活动状态 / 考勤 studentId·developStage·partyGroup）与 mock 同源
      const people = db.prepare('SELECT data FROM users').all().map((r) => JSON.parse(r.data));
      const acts = plan.activities.map((row) => ({ ...row }));
      const atts = plan.attendances.map((row) => ({ ...row }));
      applyDerivedFacts({ activities: acts, attendances: atts }, { people });
      const updateAct = db.prepare('UPDATE activities SET data = ? WHERE id = ?');
      for (const row of acts) updateAct.run(JSON.stringify(row), row.id);
      const updateAtt = db.prepare('UPDATE attendances SET data = ? WHERE id = ?');
      for (const row of atts) updateAtt.run(JSON.stringify(row), row.id);
      for (const name of ['users', 'activities', 'attendances', 'workgroups', 'workgroup_members']) {
        bumpCollectionVersion(db, name);
      }
    });
    try { run(); } catch (e) {
      console.error(`[import] ✖ 写入失败，已整体回滚：${e.message}`);
      db.close();
      process.exit(1);
    }
    console.log(`[import] ✔ 导入完成（单事务）：users +${plan.users.length} · activities +${plan.activities.length} · attendances +${plan.attendances.length}`);
    console.log('[import] 提示：成员登录用 LOGIN_PASSWORD（全站统一口令）；导入后请用真实账号跑一次登录冒烟。');
  } finally {
    try { db.close(); } catch (_) { /* 已关闭 */ }
  }
}

main().catch((e) => {
  console.error('[import] ✖ 导入失败：', e && e.message ? e.message : e);
  process.exit(1);
});
