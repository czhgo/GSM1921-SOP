// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  activity.js — 活动数据 CRUD 同步服务
//  与 attendance.js / inspection.js 同构：mockDB 优先 + mock 常量 fallback
// ════════════════════════════════════════════════════════════════

import { mockDB } from '../core/domain.js?v=20260909e';
import { persist } from '../core/data-adapter.js?v=20260909e';
import { ACTIVITIES } from '../mock/index.js?v=20260909e';
import { isInitStateActive } from './init-reset.js?v=20260909e'; // C2 修复（2026-09-08）：init 态空态不回退演示种子

/** 读取全部活动（同步接口，供 UI 层使用） */
export function loadActivities() {
  if (mockDB.activities.length > 0) return [...mockDB.activities];
  // C2 修复（2026-09-08）：mockDB 空 且处于 init 态 = 合法的空支部态（loadDB 已完成、
  // 业务域被清空），不得回退演示种子——否则 UI 主读口会把 demo 活动带回，init≈demo 依旧存在。
  // 无 init 哨兵（demo/正常演示态）保持原回退（未加载/首屏早期给演示数据）。
  return isInitStateActive() ? [] : [...ACTIVITIES];
}

/** 按 ID 查找活动 */
export function findActivityById(id) {
  if (!id) return null;
  const list = loadActivities();
  return list.find(a => a.id === id) || null;
}
