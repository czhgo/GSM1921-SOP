// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  activity.js — 活动数据 CRUD 同步服务
//  与 attendance.js / inspection.js 同构：mockDB 优先 + mock 常量 fallback
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../core/domain.js?v=20260901i';
import { persist } from '../core/data-adapter.js?v=20260901i';
import { ACTIVITIES } from '../mock/index.js?v=20260901i';

/** 读取全部活动（同步接口，供 UI 层使用） */
export function loadActivities() {
  return mockDB.activities.length > 0 ? [...mockDB.activities] : [...ACTIVITIES];
}

/** 按 ID 查找活动 */
export function findActivityById(id) {
  if (!id) return null;
  const list = loadActivities();
  return list.find(a => a.id === id) || null;
}
