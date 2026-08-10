// server/seed.js — 从前端 mock 纯数据模块导入种子
import { replaceCollection } from './db.js';

export async function seedDatabase(db) {
  const [peopleMod, activitiesMod, noticesMod, taskforcesMod, seedMod] = await Promise.all([
    import('../docs/src/mock/people.js'),
    import('../docs/src/mock/activities.js'),
    import('../docs/src/mock/notices.js'),
    import('../docs/src/mock/taskforces.js'),
    import('../docs/src/mock/seed.js'),
  ]);

  replaceCollection(db, 'users', peopleMod.PEOPLE);
  replaceCollection(db, 'activities', activitiesMod.ACTIVITIES);
  replaceCollection(db, 'notices', noticesMod.MOCK_NOTICES);
  replaceCollection(db, 'taskforces', taskforcesMod.MOCK_TASKFORCES);
  replaceCollection(db, 'tasks', seedMod.SEED_TASKS);
  replaceCollection(db, 'assignments', seedMod.SEED_ASSIGNMENTS);
  // T-209 全栈同步：档案归档/报名记录补种（与 mock-adapter.js _seedInitialData 对齐），
  // 保证 API 模式首启时宣传档案区与报名渠道有基线数据
  replaceCollection(db, 'archive_records', seedMod.SEED_ARCHIVE_RECORDS);
  replaceCollection(db, 'signups', seedMod.SEED_SIGNUPS);
}
