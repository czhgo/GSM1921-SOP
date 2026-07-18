// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  service.runtime.js — 运行时插槽 (Runtime Slot)
//  光华管理学院本科生党支部 SOP 引擎 v10.0
//
//  此文件是未来唯一的后端替换点。
//  步骤：① 将 USE_MOCK 切换为 false；② import supabaseService；
//  ③ 将 supabaseService 赋值给 BranchService 的 false 分支。
//  UI 层零改动，平滑接入 Supabase 或学校计算中心后端。
// ════════════════════════════════════════════════════════════════

import * as mockService from './mock.js';

/** 切换为 false 并替换下方 false 分支导入即可接入真实后端 */
const USE_MOCK = true;

// TODO: 接入真实后端时，替换此处导入并将 USE_MOCK 设为 false
// import * as supabaseService from './supabase.js';

/** 未实现的真实后端占位符，确保提前失败而非静默错误 */
const notImplemented = new Proxy({}, {
  get(_, key) {
    return () => Promise.reject(
      Object.assign(new Error(`[RuntimeSlot] 真实后端服务 '${key}' 尚未实现，请先实现 service.supabase.js`), { type: 'NotImplementedError' })
    );
  },
});

/**
 * BranchService — 党支部统一服务接口
 * 当前暴露：createActivity
 * 未来扩展：getActivities, updateActivity, deleteActivity 等
 */
export const BranchService = USE_MOCK
  ? mockService
  : notImplemented; // TODO: replace notImplemented with supabaseService
