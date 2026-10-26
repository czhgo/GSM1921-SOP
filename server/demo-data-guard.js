// ════════════════════════════════════════════════════════════════
//  server/demo-data-guard.js —— 生产启动闸门：库内含演示种子行 ⇒ 默认拒启
//
//  背景（spec restore-capsule-and-harden-data-truth · Task 7.1）：
//    生产形态已默认不播种（SERVER `SEED_DISABLED`），但**存量库**可能在上线前被灌过演示种子。
//    仅打印一行「演示种子账号=N」不足以阻止「拿演示库当正式库」⇒ 生产形态改为**默认拒绝启动**，
//    须显式 `ALLOW_DEMO_DATA=1` 才放行（放行时日志明确警告）。
//
//  判据（两条，均只读）：
//    ① users：`PEOPLE`（前端演示名册）中**属于支部**的 id 集；另认旧版 `p<数字>` 形态残留。
//       党委组织员（PEOPLE 中 branchId:null）**不算**——生产基线必然建一名，否则每次启动都误报。
//    ② activities：演示种子 id 形态 `act-<短数字>`（如 `act-1` / `act-31`）。
//       真实写入由服务端生成 `act-<8 位 hex>`，长度 > 4 ⇒ 不命中；`act-ce46b61e` 之类测试残留也不命中。
//
//  边界（如实登记）：本闸门**不删除任何数据**；只决定「是否允许以当前库启动」。
//    `--mode baseline` 重建库（`scripts/rebuild-demo.mjs`）与空库首启均不会被误伤：
//    空库/基线库没有演示成员，也没有 `act-<数字>` 活动行。
//
//  可测性：判定函数（`demoGateDecision`）是纯函数；`enforceProductionDemoGate` 允许注入
//    `exit` / `log`，测试不必真的结束进程。
// ════════════════════════════════════════════════════════════════
import { isProductionEnv } from './env.js';

/** 演示活动种子 id 形态（短数字；真实运行态 `act-<8hex>` 不命中） */
export const DEMO_ACTIVITY_ID_RE = /^act-\d{1,4}$/;
/** 旧版演示人员 id 形态（v7 迁移前）；生产残留判据只认这一种「包无关」形态 */
export const LEGACY_DEMO_USER_ID_RE = /^p\d{1,3}$/;

/**
 * 只读检测演示种子行。
 * @param {import('better-sqlite3').Database} db
 * @param {{demoUserIds?: Set<string>|string[]|null}} [opts]
 * @returns {{demoUsers:string[], seedActivities:string[], demo:boolean, counts:{users:number, activities:number}}}
 */
export function detectDemoSeedRows(db, { demoUserIds = null } = {}) {
  const roster = new Set(Array.from(demoUserIds || []).map(String));
  const users = db.prepare('SELECT id FROM users').all()
    .map((row) => String(row.id))
    .filter((id) => LEGACY_DEMO_USER_ID_RE.test(id) || roster.has(id));
  const seedActivities = db.prepare('SELECT id FROM activities').all()
    .map((row) => String(row.id))
    .filter((id) => DEMO_ACTIVITY_ID_RE.test(id));
  // 第三判据（包无关）：`seed_meta.mode='demo'` 是 rebuild-demo 写下的形态标记；
  //   即使发布包把 mock 名册壳化（PEOPLE=[]）或有人手工删掉了演示行，标记仍能阻止「演示库当正式库」。
  let seedMode = null;
  try {
    const row = db.prepare("SELECT value FROM seed_meta WHERE key = 'mode'").get();
    seedMode = row ? row.value : null;
  } catch (_) { /* 老库无 seed_meta */ }
  return {
    demoUsers: users,
    seedActivities,
    seedMode,
    demo: users.length + seedActivities.length > 0 || seedMode === 'demo',
    counts: { users: users.length, activities: seedActivities.length },
  };
}

/** 动态加载演示名册 id（不可得 ⇒ null；此时只按 `p<数字>` 旧形态判） */
export async function loadDemoUserIds() {
  try {
    const { PEOPLE } = await import('../docs/src/data/mock/people.js');
    return new Set(PEOPLE.filter((p) => p && p.branchId).map((p) => String(p.id)));
  } catch (_) {
    return null;
  }
}

/**
 * 纯判定：是否应拒绝启动。
 * @param {{production:boolean, allowDemoData:boolean, demoUsers:string[], seedActivities:string[], seedMode?:string|null}} input
 * @returns {{blocked:boolean, warn:boolean, reason:'not-production'|'clean'|'allow-demo-data'|'demo-detected', message?:string}}
 */
export function demoGateDecision({ production, allowDemoData, demoUsers = [], seedActivities = [], seedMode = null }) {
  if (!production) return { blocked: false, warn: false, reason: 'not-production' };
  const demoFlag = seedMode === 'demo';
  if (demoUsers.length + seedActivities.length === 0 && !demoFlag) return { blocked: false, warn: false, reason: 'clean' };
  const detail = `users 演示账号 ${demoUsers.length} 个${demoUsers.length ? `（${demoUsers.slice(0, 5).join(', ')}${demoUsers.length > 5 ? ' …' : ''}）` : ''}`
    + ` · activities 演示种子 id ${seedActivities.length} 个${seedActivities.length ? `（${seedActivities.slice(0, 5).join(', ')}${seedActivities.length > 5 ? ' …' : ''}）` : ''}`
    + `${demoFlag ? ' · seed_meta.mode=demo' : ''}`;
  if (allowDemoData) {
    return {
      blocked: false,
      warn: true,
      reason: 'allow-demo-data',
      message: `[server] ⚠ ALLOW_DEMO_DATA=1：库内含演示种子行（${detail}），已按显式开关放行启动。`
        + '生产库不应长期保留演示数据——请先备份，再以空库/基线库起步（scripts/rebuild-demo.mjs --mode baseline）后导入真实数据。',
    };
  }
  return {
    blocked: true,
    warn: false,
    reason: 'demo-detected',
    message: `[server] ⛔ 启动被拒：生产形态检测到演示种子行（${detail}）。`
      + '继续以该库启动会把演示数据当成真实账本。处置二选一：'
      + '① 停服 → 备份 → 改用空库/基线库起步（node scripts/rebuild-demo.mjs --mode baseline --out <新库>，'
      + '再按 server/scripts/restore.mjs 替换）；'
      + '② 若确认本次只是演练/临时环境，显式设 ALLOW_DEMO_DATA=1 再启动（日志会保留警告）。',
  };
}

/**
 * 启动期执行器：生产形态 + 演示种子行 + 未显式放行 ⇒ 写日志并退出（默认 exit(1)）。
 * 非生产形态**零 DB 查询**直接返回（本地演示/测试行为不变）。
 */
export async function enforceProductionDemoGate(db, { env = process.env, log = console, exit = (code) => process.exit(code) } = {}) {
  const production = env.APP_ENV === 'production' || env.NODE_ENV === 'production' || isProductionEnv();
  if (!production) return { blocked: false, reason: 'not-production' };
  const found = detectDemoSeedRows(db, { demoUserIds: await loadDemoUserIds() });
  const decision = demoGateDecision({
    production,
    allowDemoData: env.ALLOW_DEMO_DATA === '1',
    demoUsers: found.demoUsers,
    seedActivities: found.seedActivities,
    seedMode: found.seedMode,
  });
  if (decision.warn && decision.message) log.warn(decision.message);
  if (decision.blocked) {
    log.error(decision.message);
    exit(1);
  }
  if (!decision.blocked && !decision.warn) {
    log.log('[server] 正式数据自检：未发现演示种子行（users 演示账号=0 · activities 演示种子 id=0）');
  }
  return { ...decision, ...found.counts };
}
