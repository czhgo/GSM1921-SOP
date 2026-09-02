// role: [工程师]+[AI]
// mock-integrity.test.mjs — Mock 数据完整性审计（T-283 方向1；原 mock-integrity-audit.mjs）
// 覆盖：引用完整性（外键）、字段完整性（必填）、id 唯一性、类型/状态合法性
// 环境：server localhost:3000 + Playwright（浏览器内动态 import，规避 ?v= 版本戳 node 解析问题）
// 运行：node --test server/test/mock-integrity.test.mjs（server 需在 3000 端口）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';

// 浏览器内收集全部 mock 数据（结构化克隆返回）
async function collectAll(page) {
  return page.evaluate(async () => {
    const mock = await import('/src/mock/index.js?v=20260901p');
    const seed = await import('/src/mock/seed.js?v=20260901p');
    const accounts = await import('/src/mock/accounts.js?v=20260901p');
    return {
      PEOPLE: mock.PEOPLE,
      ACTIVITIES: mock.ACTIVITIES,
      ATTENDANCE_RECORDS: mock.ATTENDANCE_RECORDS,
      INSPECTION_RECORDS: mock.INSPECTION_RECORDS,
      REVIEW_RECORDS: mock.REVIEW_RECORDS,
      TASKFORCE_REVIEW_RECORDS: mock.TASKFORCE_REVIEW_RECORDS,
      MOCK_NOTICES: mock.MOCK_NOTICES,
      MOCK_TASKFORCES: mock.MOCK_TASKFORCES,
      SEED_TASKS: seed.SEED_TASKS,
      SEED_ASSIGNMENTS: seed.SEED_ASSIGNMENTS,
      SEED_ARCHIVE_RECORDS: seed.SEED_ARCHIVE_RECORDS,
      SEED_SIGNUPS: seed.SEED_SIGNUPS,
      MOCK_ACCOUNTS: accounts.MOCK_ACCOUNTS,
    };
  });
}

// 审计执行器：返回 issues 数组
function audit(data) {
  const issues = [];
  const peopleIds = new Set(data.PEOPLE.map(p => p.id));
  const activityIds = new Set(data.ACTIVITIES.map(a => a.id));
  const taskforceIds = new Set(data.MOCK_TASKFORCES.map(t => t.id));

  const validStatus = new Set(['draft', 'published', 'ongoing', 'completed', 'cancelled']);
  const validTypes = new Set(['支部党员大会', '支委会', '党小组会', '党课', '主题党日']);
  const validRoles = new Set(['organizer', 'deep', 'participant']);

  // ── id 唯一性（accounts 以 studentId 为唯一键）──
  for (const [name, list] of Object.entries(data)) {
    if (!Array.isArray(list)) continue;
    const keyFn = name === 'MOCK_ACCOUNTS' ? (item) => item.studentId : (item) => item.id;
    const seen = new Set();
    for (const item of list) {
      if (!item || typeof item !== 'object') { issues.push(`[${name}] 含非对象项`); continue; }
      const key = keyFn(item);
      if (key === undefined || key === '') { issues.push(`[${name}] 缺唯一键: ${JSON.stringify(item).slice(0, 80)}`); continue; }
      if (seen.has(key)) issues.push(`[${name}] 唯一键重复: ${key}`);
      seen.add(key);
    }
  }

  // ── activities 字段/类型/引用 ──
  for (const a of data.ACTIVITIES) {
    for (const f of ['title', 'type', 'date', 'status']) {
      if (a[f] === undefined || a[f] === '') issues.push(`[activities] ${a.id} 缺必填字段 ${f}`);
    }
    if (a.status !== undefined && !validStatus.has(a.status)) issues.push(`[activities] ${a.id} 非法 status: ${a.status}`);
    if (a.type !== undefined && !validTypes.has(a.type)) issues.push(`[activities] ${a.id} 非法 type: ${a.type}`);
    if (a.organizer !== undefined && a.organizer && !peopleIds.has(a.organizer)) issues.push(`[activities] ${a.id} organizer 引用不存在: ${a.organizer}`);
    if (Array.isArray(a.assignments)) {
      for (const asg of a.assignments) {
        if (!peopleIds.has(asg.personId)) issues.push(`[activities] ${a.id} assignments.personId 引用不存在: ${asg.personId}`);
        if (!validRoles.has(asg.role)) issues.push(`[activities] ${a.id} assignments.role 非法: ${asg.role}`);
      }
    }
    if (Array.isArray(a.participants)) {
      for (const pid of a.participants) if (!peopleIds.has(pid)) issues.push(`[activities] ${a.id} participants 引用不存在: ${pid}`);
    }
  }

  // ── people 字段 ──
  for (const p of data.PEOPLE) {
    if (!p.name) issues.push(`[people] ${p.id} 缺 name`);
    if (!p.role) issues.push(`[people] ${p.id} 缺 role`);
  }

  // ── attendance 引用 ──
  for (const r of data.ATTENDANCE_RECORDS) {
    if (!peopleIds.has(r.personId)) issues.push(`[attendance] ${r.id} personId 引用不存在: ${r.personId}`);
    if (r.activityId && !activityIds.has(r.activityId)) issues.push(`[attendance] ${r.id} activityId 引用不存在: ${r.activityId}`);
  }

  // ── inspection 引用 ──
  for (const r of data.INSPECTION_RECORDS) {
    if (!peopleIds.has(r.personId)) issues.push(`[inspection] ${r.id} personId 引用不存在: ${r.personId}`);
    if (r.activityId && !activityIds.has(r.activityId) && !taskforceIds.has(r.activityId)) issues.push(`[inspection] ${r.id} activityId 引用不存在: ${r.activityId}`);
  }

  // ── notices 引用（targetType=activity 时 targetId 应存在）──
  for (const n of data.MOCK_NOTICES) {
    if (!n.title) issues.push(`[notices] ${n.id} 缺 title`);
    if (n.targetType === 'activity' && n.targetId && !activityIds.has(n.targetId)) issues.push(`[notices] ${n.id} targetId 引用不存在: ${n.targetId}`);
  }

  // ── taskforces 引用（members 为 {personId, role} 对象数组）──
  for (const t of data.MOCK_TASKFORCES) {
    if (!t.name) issues.push(`[taskforces] ${t.id} 缺 name`);
    if (t.manager && !peopleIds.has(t.manager)) issues.push(`[taskforces] ${t.id} manager 引用不存在: ${t.manager}`);
    if (t.initiator && !peopleIds.has(t.initiator)) issues.push(`[taskforces] ${t.id} initiator 引用不存在: ${t.initiator}`);
    if (Array.isArray(t.members)) {
      for (const m of t.members) {
        const pid = typeof m === 'string' ? m : m?.personId;
        if (pid && !peopleIds.has(pid)) issues.push(`[taskforces] ${t.id} members 引用不存在: ${pid}`);
      }
    }
    if (Array.isArray(t.assignments)) {
      for (const asg of t.assignments) {
        if (asg.personId && !peopleIds.has(asg.personId)) issues.push(`[taskforces] ${t.id} assignments.personId 引用不存在: ${asg.personId}`);
      }
    }
  }

  // ── review 引用 ──
  for (const r of data.REVIEW_RECORDS) {
    if (r.activityId && !activityIds.has(r.activityId)) issues.push(`[review] ${r.id} activityId 引用不存在: ${r.activityId}`);
    if (r.personId && !peopleIds.has(r.personId)) issues.push(`[review] ${r.id} personId 引用不存在: ${r.personId}`);
  }

  // ── tasks / assignments（seed）引用 ──
  for (const t of data.SEED_TASKS) {
    if (t.activityId && !activityIds.has(t.activityId)) issues.push(`[seed.tasks] ${t.id} activityId 引用不存在: ${t.activityId}`);
    if (!t.title) issues.push(`[seed.tasks] ${t.id} 缺 title`);
  }
  for (const a of data.SEED_ASSIGNMENTS) {
    if (a.activityId && !activityIds.has(a.activityId)) issues.push(`[seed.assignments] ${a.id} activityId 引用不存在: ${a.activityId}`);
    if (a.assigneeId && !peopleIds.has(a.assigneeId)) issues.push(`[seed.assignments] ${a.id} assigneeId 引用不存在: ${a.assigneeId}`);
    if (a.createdBy && !peopleIds.has(a.createdBy)) issues.push(`[seed.assignments] ${a.id} createdBy 引用不存在: ${a.createdBy}`);
  }

  // ── archive / signups 种子引用 ──
  for (const r of (data.SEED_ARCHIVE_RECORDS || [])) {
    if (r.activityId && !activityIds.has(r.activityId)) issues.push(`[seed.archive] ${r.id} activityId 引用不存在: ${r.activityId}`);
  }
  for (const s of (data.SEED_SIGNUPS || [])) {
    if (s.activityId && !activityIds.has(s.activityId)) issues.push(`[seed.signups] ${s.id} activityId 引用不存在: ${s.activityId}`);
    if (s.personId && !peopleIds.has(s.personId)) issues.push(`[seed.signups] ${s.id} personId 引用不存在: ${s.personId}`);
  }

  // ── accounts 引用 ──
  for (const ac of data.MOCK_ACCOUNTS) {
    if (!peopleIds.has(ac.personId)) issues.push(`[accounts] ${ac.studentId} personId 引用不存在: ${ac.personId}`);
  }

  return issues;
}

// M2 生命周期一致性：活动状态与子记录/任务/考勤的状态矛盾
function auditLifecycle(data) {
  const issues = [];
  const byId = new Map(data.ACTIVITIES.map(a => [a.id, a]));
  const actById = (id) => byId.get(id);

  // 1. cancelled 活动不应有关联考勤（未发生却记录出勤 = 数据矛盾）
  for (const att of data.ATTENDANCE_RECORDS) {
    const act = actById(att.activityId);
    if (act && act.status === 'cancelled') issues.push(`[lifecycle] 已取消活动 ${att.activityId} 仍有考勤 ${att.id}`);
  }
  // 2. cancelled 活动不应有未完成任务
  for (const t of data.SEED_TASKS) {
    const act = actById(t.activityId);
    if (act && act.status === 'cancelled' && t.status !== 'completed') issues.push(`[lifecycle] 已取消活动 ${t.activityId} 仍有未完成任务 ${t.id}`);
  }
  // 3. completed 活动关联任务应为 completed（关闭条件全完成语义）
  for (const t of data.SEED_TASKS) {
    const act = actById(t.activityId);
    if (act && act.status === 'completed' && t.status !== 'completed') issues.push(`[lifecycle] 已完成活动 ${t.activityId} 有关联任务未完成 ${t.id}(${t.status})`);
  }
  // 4. 考勤关联活动必须已发生（书记 2026-08-05 规则：已生成考勤的活动日期须已发生）
  for (const att of data.ATTENDANCE_RECORDS) {
    const act = actById(att.activityId);
    if (act && act.date > '2026-08-05' && act.status !== 'cancelled') issues.push(`[lifecycle] 未来活动 ${att.activityId}(${act.date}) 已有考勤 ${att.id}`);
  }
  // 5. signups/archive 引用源存在
  const tfIds = new Set(data.MOCK_TASKFORCES.map(t => t.id));
  for (const s of (data.SEED_SIGNUPS || [])) {
    const ok = s.sourceType === 'activity' ? byId.has(s.sourceId) : tfIds.has(s.sourceId);
    if (!ok) issues.push(`[lifecycle] signup ${s.id} 引用源不存在: ${s.sourceType}/${s.sourceId}`);
  }
  for (const r of (data.SEED_ARCHIVE_RECORDS || [])) {
    if (r.activityId && !byId.has(r.activityId)) issues.push(`[lifecycle] archive ${r.id} 引用活动不存在: ${r.activityId}`);
  }
  // 6. 活动缺失：draft 活动数量统计（信息）
  return issues;
}

test('M2 数据结构生命周期一致性：活动状态 × 子记录/任务/考勤无矛盾', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const data = await collectAll(page);
    const issues = auditLifecycle(data);
    if (issues.length > 0) {
      console.log('[M2] ⚠️ 生命周期不一致 ' + issues.length + ' 项：');
      issues.forEach((i, idx) => console.log(`  ${idx + 1}. ${i}`));
    } else {
      console.log('[M2] ✅ 生命周期一致性通过');
    }
    assert.equal(issues.length, 0, `生命周期一致性问题 ${issues.length} 项:\n${issues.join('\n')}`);
  } finally {
    await browser.close();
  }
});

test('M1 Mock 数据完整性审计：零孤立引用 + 必填字段齐全 + id 唯一 + 类型合法', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    const data = await collectAll(page);
    const issues = audit(data);

    const stats = {};
    for (const [k, v] of Object.entries(data)) {
      stats[k] = Array.isArray(v) ? v.length : (v === undefined ? 'MISSING' : typeof v);
    }
    console.log('[M1] 集合规模:', JSON.stringify(stats));

    if (issues.length > 0) {
      console.log('[M1] ⚠️ 发现 ' + issues.length + ' 项问题：');
      issues.forEach((i, idx) => console.log(`  ${idx + 1}. ${i}`));
    } else {
      console.log('[M1] ✅ 零问题：引用/字段/id/类型全部通过');
    }
    assert.equal(issues.length, 0, `Mock 数据完整性问题 ${issues.length} 项:\n${issues.join('\n')}`);
  } finally {
    await browser.close();
  }
});
