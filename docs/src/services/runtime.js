// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  service.runtime.js — 运行时插槽 (Runtime Slot)
//  光华管理学院本科生党支部 SOP 引擎 v11.0
//
//  T-142 阶段2改造：通过 DataAdapter 抽象层统一数据访问。
//  切换方式：setDataSource('api', { apiBaseUrl, authToken })
//  UI 层零改动，平滑接入学校计算中心后端。
//
//  兼容性：BranchService 仍暴露 mock.js 的完整 API，
//  确保现有调用方无需修改。
// ════════════════════════════════════════════════════════════════

import * as mockService from './mock.js?v=20260807j';
import { registerMockAdapter, registerApiAdapter, setDataSource, getDataSource } from '../core/data-adapter.js?v=20260807j';
import { MockAdapter } from '../core/mock-adapter.js?v=20260807j';
import { ApiAdapter } from '../core/api-adapter.js?v=20260807j';

// ── 初始化 DataAdapter ──────────────────────────────────────────

// 注册两个适配器实例
registerMockAdapter(MockAdapter);
registerApiAdapter(ApiAdapter);

// 当前使用 mock 模式（切换为 'api' 时自动走 API 适配器）
setDataSource('mock');

// P1 后端接入：登录后由 auth.js 调用此函数切换到 API 数据源
export function enableApiMode(token) {
  setDataSource('api', { apiBaseUrl: '', authToken: token });
  sessionStorage.setItem('gsm1921-api-token', token);
}

export function isApiMode() {
  return getDataSource() === 'api';
}

// ── BranchService — 党支部统一服务接口 ──────────────────────────

/**
 * BranchService 保持向后兼容，直接代理到 mock.js。
 * 新代码建议通过 data-adapter.js 的 getAdapter() 访问数据。
 *
 * 未来接入后端时：
 * 1. 在此处调用 setDataSource('api', { apiBaseUrl: 'https://...', authToken: '...' })
 * 2. BranchService 仍可用（mock.js 的 saveDB/loadDB 继续工作）
 * 3. 通过 getAdapter() 访问的数据走 API 适配器
 */
export const BranchService = mockService;
