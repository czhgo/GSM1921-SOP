// ════════════════════════════════════════════════════════════════
//  service.runtime.js — 运行时插槽 (Runtime Slot)
//  光华管理学院本科生党支部 SOP 引擎 v8.3
//
//  此文件是未来唯一的后端替换点。
//  将 USE_MOCK 切换为 false 并 import supabaseService 即可
//  平滑接入 Supabase 或学校计算中心后端。
// ════════════════════════════════════════════════════════════════

import * as mockService from './service.mock.js';

/** 切换为 false 并替换 supabaseService 导入即可接入真实后端 */
const USE_MOCK = true;

/**
 * BranchService — 党支部统一服务接口
 * 当前暴露：createActivity
 * 未来扩展：getActivities, updateActivity, deleteActivity 等
 */
export const BranchService = USE_MOCK
  ? mockService
  : mockService; // TODO: replace with supabaseService when USE_MOCK = false
