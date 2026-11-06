// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/routes/public-info.js —— **未登录可读的最小公开信息**（2026-10-28 新增）
//
//  由来：「支部名不写死」——换一个支部部署，登录页抬头与帮助页应显示新支部名。
//    但登录前浏览器没有 token，`GET /api/v1/branches` 一律 401/403 ⇒ 前端读不到支部档案。
//    本端点补上唯一缺的那一面：**只回答「本站支部的显示名」**。
//
//  ⚠ 安全边界（本件的核心约束，改之前先读）：
//    · **只读**：仅 GET，不挂任何写方法；
//    · **免登录**：不 requireAuth（登录页与帮助页都是访客可进）；
//    · **最小暴露**：响应体**只有一个键** `name` —— 不返回 branch id、成员、config、
//      支部清单，也不返回任何可用于越权定位的标识；
//    · **中性兜底**：支部档案缺失 / 表未建 / 名称为空 ⇒ `{ name: '本支部' }`，**不 500**；
//    · **不缓存**：`Cache-Control: no-store` —— 支部改名后下一次请求立即生效。
//
//  显示名口径复用既有单一源：`review-request-labels.js::branchDisplayName`
//    （`config.headerTitle` 优先，为空回退 `name`；读不到回中性「本支部」）。
//    同源消费点见 `routes/setup.js` 与 `server/system-notice-kinds.js`，不落第二实现（H31）。
//
//  路径：`GET /api/v1/public/branch-name`（挂载点见 `app.js`）
// ════════════════════════════════════════════════════════════════
import express from 'express';
import { getRow } from './resources/store.js';
import { DEFAULT_BRANCH_ID } from '../../docs/src/core/domain/constants.js';
import { branchDisplayName } from '../../docs/src/core/domain/review-request-labels.js';

export function createPublicInfoRouter(db) {
  const router = express.Router();

  router.get('/branch-name', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    let branch = null;
    try {
      branch = getRow(db, 'branches', DEFAULT_BRANCH_ID);
    } catch (_) {
      /* 表缺失 / 库未初始化 ⇒ 走中性兜底，不把内部错误暴露给访客 */
    }
    const name = (branchDisplayName('', branch) || '').trim() || '本支部';
    res.json({ name });
  });

  return router;
}
