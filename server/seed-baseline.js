// ════════════════════════════════════════════════════════════════
//  server/seed-baseline.js —— **最小组织基线**（生产自举），2026-09-29 批次 270 新增
//
//  【为什么必须有这个文件（本批查出的**自举死锁**）】
//    `server.js` 的生产形态**默认不播种**（`SEED_DISABLED = DISABLE_SEED==='1' || isProductionEnv()`），
//    而库是空的 ⇒ **`users` 表 0 行、`branches` 表 0 行** ⇒
//      · 没有人能登录（登录要查 `users`）⇒ 连党委都进不去；
//      · 没有人能建支部（`POST /branches` 的门是 `party-staff`，而库里没有党委账号）。
//    ⇒ **空库＝死锁**。本文件补上「能自举的最小形态」：**一个党委账号 ＋ 一个既存支部**，**零成员名单**。
//
//  【与「演示种子」的边界（本仓纪律：不混两种东西）】
//    · `server/seed.js::seedDatabase()` = **演示种子**（51 人名单 ＋ 活动/考勤/通知…，为**本地测试与演示**而存在）
//      ⇒ 仍由 `DISABLE_SEED` / `APP_ENV` 控制，**生产不播**；
//    · 本文件 = **组织基线**（只有「谁能登录」「本组织有哪个支部」两件事）⇒ **任何形态都补**、且**幂等**。
//    两者不重叠：`seedDatabase` 已含 `br-b1` 与 `p_pc` ⇒ 跑过演示种子后本文件**什么都不做**。
//
//  【口径（2026-09-29 支书令：「把党委功能设置好，以及一个既存的支部 光华管理学院本科生党支部」）】
//    · 党委：**不是数据库实体**（见 `docs/src/data/mock/branches.js::PARTY_COMMITTEE` 是前端常量、
//      `core/domain/work-map.js::ORG_SUBJECTS['party-committee']` 是组织型主体 id）⇒ 在库里**只体现为
//      一名 `role:'party-staff'` 的账号**（组织级、`branchId: null`，不属于任何支部）。
//    · 支部：**必须**用 id `br-b1`——全仓有「缺省支部」兜底（`actor.branchId || 'br-b1'`、
//      `getBranchIdOfPerson` 等）⇒ 换 id 会让所有兜底指向不存在的支部。
//    · 支部的 `config` 取**空组织模板口径**（`modules/blocks/workforce` 全 `null` ＝ 默认全开/缺省分工），
//      `secretaryId: null` ＝ **支书席位空缺待任命**（任命走党委台「支部管理」）。
//    · ⚠ **不写任何成员名单**（本批支书第 3 条：「目前所有的名单都不要部署上去」）。
//
//  【幂等】每张表**只在为空时**补：重复启动 / 已有数据都**不覆盖、不叠加**。
// ════════════════════════════════════════════════════════════════

/** 支部名与类型（支书点名：既存支部＝光华管理学院本科生党支部） */
const BASELINE_BRANCH = {
  id: 'br-b1',
  name: '光华管理学院本科生党支部',
  type: '本科生',
  config: {
    headerTitle: '光华管理学院本科生党支部',
    accent: null,
    modules: null,      // null ＝ 默认全开（与 br-b1 既有语义一致，见 services/branch/branch.js::EMPTY_BRANCH_TEMPLATE）
    blocks: null,       // null ＝ 产出块/工作流块全按默认
    workforce: null,    // null ＝ 缺省分工（不引用任何成员 id）
    desc: '',
    themePreset: null,
    fileSpaceIsolated: true,
  },
  secretaryId: null,    // 支书席位空缺——由党委台「支部管理」任命（本仓口径：一把手层归党委，D-585）
  status: 'active',
};

/**
 * 党委组织员的账号。
 * ⚠ 「学号」＝登录账号。缺省 `9000000001` 是**占位**：真实部署请用环境变量覆盖
 *   （`BASELINE_PARTY_STAFF_ID` / `BASELINE_PARTY_STAFF_NAME`），或部署后在设置中心改。
 */
function partyStaffRow() {
  const studentId = process.env.BASELINE_PARTY_STAFF_ID || '9000000001';
  const name = process.env.BASELINE_PARTY_STAFF_NAME || '党委组织员';
  return {
    id: 'p_pc',
    name,
    studentId,
    partyGroup: '',
    developStage: '',
    role: 'party-staff',   // 组织级角色：不属于任一支部（core/domain/constants.js::PARTY_STAFF_ROLE）
    branchId: null,
  };
}

const countOf = (db, table) => db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c;
const insertRow = (db, table, row) =>
  db.prepare(`INSERT OR IGNORE INTO ${table} (id, data) VALUES (?, ?)`).run(row.id, JSON.stringify(row));

/**
 * 补最小组织基线（幂等）。
 * @param {import('better-sqlite3').Database} db
 * @returns {{branch:boolean, partyStaff:boolean}} 本次**实际补了**哪几项（都为 false ⇒ 本来就有，未动）
 */
export function seedBaseline(db) {
  const done = { branch: false, partyStaff: false };

  // ① 既存支部：光华管理学院本科生党支部（id 固定 br-b1，见文件头口径）
  if (countOf(db, 'branches') === 0) {
    insertRow(db, 'branches', BASELINE_BRANCH);
    done.branch = true;
  }

  // ② 党委账号：必须有「一名 party-staff」——否则无人能建支部、也无人能进党委台
  const hasPartyStaff = db.prepare('SELECT data FROM users').all()
    .some((r) => { try { return JSON.parse(r.data).role === 'party-staff'; } catch { return false; } });
  if (!hasPartyStaff) {
    insertRow(db, 'users', partyStaffRow());
    done.partyStaff = true;
  }

  if (done.branch || done.partyStaff) {
    const parts = [];
    if (done.branch) parts.push(`支部 1 个（${BASELINE_BRANCH.name}）`);
    if (done.partyStaff) parts.push(`党委账号 1 名（${partyStaffRow().name} / 学号 ${partyStaffRow().studentId}）`);
    console.log(`[server] 已建立**最小组织基线**：${parts.join(' ＋ ')}；`
      + '**未灌任何成员名单**（名单请走 IAAA 登录 + 支部确认，或党委台「支部管理 → 导入成员名册」）');
  }
  return done;
}
