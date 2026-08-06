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
}
