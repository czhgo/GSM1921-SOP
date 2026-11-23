// role: [工程师]+[AI]
// server/scripts/run-precommit.mjs — 提交前 / 发布前 runner（2026-11-08 批次 537）
//
//  顺序：daily 结果门禁 → guards 静态守卫 → precommit 层（非核心域回归 + 真机 e2e）。
//  为什么先跑前两层：它们快且是结果判据，红了就不必等 e2e。
//  Playwright 缺失时**明确报错退出 2**（本层含 e2e，跳层＝假绿）。
//  用法：cd server && npm run test:precommit
import { dailyFiles, guardsFiles, precommitFiles } from '../test-tier-registry.mjs';
import { runTier, ensurePlaywright } from './tier-runner.mjs';

if (!(await ensurePlaywright())) process.exit(2);

const dailyCode = await runTier('daily', dailyFiles);
if (dailyCode !== 0) process.exit(1);

const guardsCode = await runTier('guards', guardsFiles);
if (guardsCode !== 0) process.exit(1);

// precommit 层含真机 e2e：串行跑（共享 :3000 与演示库数据，文件级并行会互踩）
process.exit(await runTier('precommit', precommitFiles, { concurrency: 1 }));
