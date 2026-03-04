// ════════════════════════════════════════════════════════════════
//  service.mock.js — Mock 服务层
//  光华管理学院本科生党支部 SOP 引擎 v8.3
//  依赖：domain.js（单向依赖，不依赖 UI 或 runtime）
// ════════════════════════════════════════════════════════════════

import { mockDB } from './domain.js';

const MOCK_DELAY_MS = 600;

/**
 * 创建新活动（Immutable 写入 mockDB）
 * 10% 概率触发随机错误：5% NetworkError + 5% PermissionError
 * @param {import('./domain.js').Activity} data - 活动数据（不含 id）
 * @returns {Promise<import('./domain.js').Activity>}
 */
export function createActivity(data) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const rand = Math.random();

      if (rand < 0.05) {
        const err = new Error('网络连接失败，请稍后重试');
        err.type = 'NetworkError';
        console.warn('[MockAdapter] createActivity 失败：NetworkError');
        reject(err);
        return;
      }

      if (rand < 0.10) {
        const err = new Error('权限不足，无法执行此操作');
        err.type = 'PermissionError';
        console.warn('[MockAdapter] createActivity 失败：PermissionError');
        reject(err);
        return;
      }

      // Immutable 写入：使用展开符替换整个数组，禁止 push
      const newItem = { ...data, id: String(Date.now()) };
      mockDB.activities = [...mockDB.activities, newItem];

      console.warn('[MockAdapter] createActivity 成功，id=' + newItem.id
        + '，当前 activities 总数：' + mockDB.activities.length);
      resolve(newItem);
    }, MOCK_DELAY_MS);
  });
}
