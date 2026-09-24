// server/env.js — 运行形态判定（2026-09-23 P0-3 / P0-4 上线安全）
// 由来（2026-09-23 支书裁定「系统一周内上服务器」+「六项 P0 全做」）：默认口令、口令逃逸门、空库自动播演示种子
//   这三件事在**本地演示/测试**形态是刻意保留的便利，在**生产**形态是安全缺口 ⇒ 必须形态可区分。
// 判定口径（唯一源，勿在别处手写）：`APP_ENV=production`（本仓新增的显式开关，见 .env.example）
//   **或** 社区通行的 `NODE_ENV=production`。二者**都不设** ⇒ 非生产形态（本地/测试），行为一字不变
//   （这是 99 个测试文件保持全绿的前提：`npm test` 不设这两个变量）。
// 消费点：`server/server.js`（启动校验 + 默认不播种）、`server/routes/auth.js`（生产不认逃逸门）。
export function isProductionEnv() {
  return process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production';
}
