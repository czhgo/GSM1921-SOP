// server/seed.js — 从前端 mock 纯数据模块导入种子
import { readFileSync } from 'node:fs';
import { replaceCollection } from './db.js';

/**
 * 反馈域基线种子（R-24，2026-09-13 支书裁定「分形态各接各的源」）：
 * 服务端 issues 表原先**无种子** → API 形态下支书台「反馈管理」恒 0 条，
 * 而公开反馈页走本地 docs/data/issues.json 有 4 条 → 同域两口径。
 * 现以 issues.json 为**内容单一源**播种，并按真匿名口径脱敏：
 *   · submittedBy 一律 '匿名'、anonymous=true、participants=[]（防止经参与者反查提交人）；
 *   · 不写 tokenHash（仅判重/限频用，种子无此需求）；
 *   · 保留处置类字段（assignee/assigneeRole/dispatchHistory/comments/reactions）用于演示指派与处置链路。
 */
function seedIssues() {
  let raw;
  try {
    raw = JSON.parse(readFileSync(new URL('../docs/data/issues.json', import.meta.url), 'utf8'));
  } catch {
    return [];
  }
  return (raw.issues || []).map((r) => {
    const { tokenHash: _t, participants: _p, submittedBy: _s, ...rest } = r;
    return { ...rest, submittedBy: '匿名', anonymous: true, participants: [] };
  });
}

export async function seedDatabase(db) {
  const [peopleMod, activitiesMod, noticesMod, taskforcesMod, seedMod, branchesMod, partyGroupsMod] = await Promise.all([
    import('../docs/src/mock/people.js'),
    import('../docs/src/mock/activities.js'),
    import('../docs/src/mock/notices.js'),
    import('../docs/src/mock/taskforces.js'),
    import('../docs/src/mock/seed.js'),
    import('../docs/src/mock/branches.js'),
    import('../docs/src/mock/party-groups.js'),
  ]);

  replaceCollection(db, 'users', peopleMod.PEOPLE);
  replaceCollection(db, 'branches', branchesMod.BRANCHES);
  replaceCollection(db, 'activities', activitiesMod.ACTIVITIES);
  replaceCollection(db, 'notices', noticesMod.MOCK_NOTICES);
  replaceCollection(db, 'taskforces', taskforcesMod.MOCK_TASKFORCES);
  replaceCollection(db, 'tasks', seedMod.SEED_TASKS);
  replaceCollection(db, 'assignments', seedMod.SEED_ASSIGNMENTS);
  // T-209 全栈同步：档案归档/报名记录补种（与 mock-adapter.js _seedInitialData 对齐），
  // 保证 API 模式首启时宣传档案区与报名渠道有基线数据
  replaceCollection(db, 'archive_records', seedMod.SEED_ARCHIVE_RECORDS);
  replaceCollection(db, 'signups', seedMod.SEED_SIGNUPS);
  // R-24：反馈域基线（与公开反馈页同内容、按真匿名口径脱敏）。
  // 注：issues 是真匿名域（仅语义端点读写、不进快照写穿），但表本身在 db.js RESOURCE_TABLES 内，
  //   故与其它集合同走 replaceCollection 落库。
  replaceCollection(db, 'issues', seedIssues());
  // 2026-09-14 批次 25：党小组一等实体种子（br-b1 现有三组；组长由成员档案派生不落本表）
  replaceCollection(db, 'party_groups', partyGroupsMod.PARTY_GROUPS);
}
