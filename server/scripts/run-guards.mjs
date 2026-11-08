// role: [工程师]+[AI]
// server/scripts/run-guards.mjs — guards 静态守卫 runner（2026-11-08 批次 537）
// 守卫按需跑：改样式 / 文档 / 结构时先跑本层，或 `npm run test:changed` 按改动面选守卫。
// 用法：cd server && npm run test:guards
import { guardsFiles } from '../test-tier-registry.mjs';
import { runTier } from './tier-runner.mjs';

process.exit(await runTier('guards', guardsFiles));
