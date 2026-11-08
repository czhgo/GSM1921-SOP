// role: [工程师]+[AI]
// server/scripts/run-daily.mjs — daily 结果门禁 runner（2026-11-08 批次 537）
// 文件清单单一源＝`test-tier-registry.mjs::dailyFiles`；本文件不重新分类。
// 用法：cd server && npm run test:daily
import { dailyFiles } from '../test-tier-registry.mjs';
import { runTier } from './tier-runner.mjs';

process.exit(await runTier('daily', dailyFiles));
