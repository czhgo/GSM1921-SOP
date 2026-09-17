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
 *   · 保留处置类字段（assignee/assigneeRole/dispatchHistory/comments/reactions）用于演示指派与处置链路；
 *   · 支部归属 branchId（每个组织独立 issue 空间，2026-09-15 支书裁定）：取 issues.json 所载；
 *     存量缺省按部署默认支部 'br-b1'（与前端 services/issues.js 写入口径 getBranchIdOfPerson 同源）。
 */
function seedIssues() {
  let raw;
  try {
    raw = JSON.parse(readFileSync(new URL('../docs/data/issues.json', import.meta.url), 'utf8'));
  } catch {
    return [];
  }
  return (raw.issues || []).map((r) => {
    // 批次 47-Q（2026-09-16，支书裁定「加过滤 + 种进同源」）：**内部汇报不脱敏**。
    // 本文件同时承载两类：公开匿名反馈（无 kind）与内部汇报（kind:'report'）。
    //   「真匿名」是**公开反馈**的口径（防经提交人/参与者反查）——它对**内部汇报不成立**：
    //   内部汇报按设计就是**带名**的（submittedBy/assignee/participants 指向真人），
    //   支书台「汇报收件箱」与成员台「我发起的汇报」全靠这些字段成立。
    //   若照旧一律脱敏，api 形态会把这些字段抹掉 ⇒ 两形态不一致（mock 直读原文件带名、api 全匿名）
    //   ⇒ 守卫绿而支书在真实演示里看不到汇报（典型的假绿）。故按 kind 分流。
    if (r.kind === 'report') return { ...r, branchId: r.branchId || 'br-b1' };
    const { tokenHash: _t, participants: _p, submittedBy: _s, ...rest } = r;
    return { ...rest, branchId: r.branchId || 'br-b1', submittedBy: '匿名', anonymous: true, participants: [] };
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
  // 批次 47-P（2026-09-16，支书「允许改种子」裁定）：支部上报审批基线。
  // 与 mock 态**同源**（`docs/src/mock/seed.js::SEED_REVIEW_REQUESTS`，经 mock-adapter._seedInitialData 注入）
  // ⇒ 两形态一致；补它的直接动因：党委台「驳回」只在 pending 行渲染，而本表原无种子
  // ⇒ api 形态下支书在党委台点不到该动作（批 47-M 实测入口计数 0）。
  replaceCollection(db, 'review_requests', seedMod.SEED_REVIEW_REQUESTS);
  // 批次 47-Y（2026-09-16，承 R-78 口径）：补课任务基线。
  // 与 mock 态**同源**（`docs/src/mock/seed.js::SEED_MAKEUP_TASKS`，经 mock-adapter._seedInitialData 注入）
  // ⇒ 两形态一致；补它的直接动因：成员台「考勤概况 · 去补课」入口只在「本人 pending 补课任务」存在时渲染，
  //   而该表原无种子（`data-adapter.js` 原注「由纪检操作生成，空属合理」）⇒ api 形态下该入口恒不存在。
  //   本条任务＝`att-sep-1`（p5 · act-31 · 缺勤 · 已确认）的派生结果（详见该常量注释）。
  replaceCollection(db, 'makeup_tasks', seedMod.SEED_MAKEUP_TASKS);
  // 2026-09-14 批次 25：党小组一等实体种子（br-b1 现有三组；组长由成员档案派生不落本表）
  replaceCollection(db, 'party_groups', partyGroupsMod.PARTY_GROUPS);
  // 2026-09-14 批次 25：成员流动台账（member_flows）种子为空数组（运行时业务过程数据，
  // 无演示历史）→ 不灌库；服务端表由 db.js RESOURCE_TABLES 建表，写入走快照/CRUD 通道。
}
