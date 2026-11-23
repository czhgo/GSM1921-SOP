// ════════════════════════════════════════════════════════════════
//  server/run-mode.js —— 运行档（review / production）标识 ＋ 生产单支部硬断言
//
//  为什么单独成模块：两个档位的判定与文案必须只有一处（否则「日志说 review、实际按生产跑」这类
//  错位无法自查）；同时 `server.js` 一被 import 就会起服务，测试无法直接调它的启动逻辑，
//  故把纯判定与可注入 exit 的执行器放在这里，供入口与测试共用。
//
//  判定口径：只复用 `server/env.js::isProductionEnv()`（APP_ENV=production 或 NODE_ENV=production），
//  不在本文件另写一套。`ALLOW_MULTI_BRANCH=1` 是本档新增的显式放行开关，只在生产档有意义。
//
//  边界：本模块**不读也不写业务表**，只做一次 `COUNT(*) FROM branches`；不删除/修改任何数据。
// ════════════════════════════════════════════════════════════════
import { isProductionEnv } from './env.js';

/** 生产多支部被拒时必须在提示里出现的口径（测试逐字核这半句） */
export const MULTI_BRANCH_RULE = '一实例一支部；多支部需先完成服务端读过滤或显式设置 ALLOW_MULTI_BRANCH=1';

/**
 * 启动日志里的「运行档」一行。
 * @param {{production?:boolean, demoSeedEnabled?:boolean, dbPath?:string}} opts
 */
export function formatRunModeLine({ production = isProductionEnv(), demoSeedEnabled = false, dbPath = '' } = {}) {
  // 生产档固定写「演示种子=off」：生产默认不播种是硬约束，不随调用方传参变化（避免日志误导）。
  return production
    ? `[server] 运行档：production（单支部；演示种子=off；库=${dbPath}）`
    : `[server] 运行档：review（视觉检验；演示种子=${demoSeedEnabled ? 'on' : 'off'}；库=${dbPath}）`;
}

/**
 * 纯判定：当前库是否允许继续启动。
 * @param {{production?:boolean, branchCount?:number, allowMultiBranch?:boolean}} opts
 * @returns {{blocked:boolean, reason:string, branchCount:number, message?:string}}
 */
export function singleBranchDecision({ production = isProductionEnv(), branchCount = 0, allowMultiBranch = false } = {}) {
  // review 档只观察不拦截：它的用途是视觉检验，常需要拿一份含多支部的库做页面核对。
  if (!production) return { blocked: false, reason: 'not-production', branchCount };
  if (branchCount > 1 && !allowMultiBranch) {
    return {
      blocked: true,
      reason: 'multi-branch',
      branchCount,
      message: `[server] ⛔ 启动被拒：生产运行档检测到 ${branchCount} 个支部（${MULTI_BRANCH_RULE}）。\n`
        + '        可执行处置（二选一）：\n'
        + '          ① 拆分实例：每个支部一套进程 + 独立 DB_PATH（推荐，读接口天然不越支部）；\n'
        + '          ② 确认已完成服务端按支部读过滤后，显式设置 ALLOW_MULTI_BRANCH=1 再启动。\n'
        + '        多支部设计与实施顺序见 content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §十。\n'
        + '        核对支部数：node deploy/doctor.mjs --env <环境文件>',
    };
  }
  return { blocked: false, reason: branchCount > 1 ? 'allow-multi-branch' : 'single-branch', branchCount };
}

/**
 * 启动期执行器：迁移完成后调用（入口保证在 listen 之前）。
 * @param {import('better-sqlite3').Database} db
 * @param {{env?:NodeJS.ProcessEnv, log?:Console, exit?:(code:number)=>void, production?:boolean}} opts
 */
export function enforceSingleBranch(db, { env = process.env, log = console, exit = (code) => process.exit(code), production = isProductionEnv() } = {}) {
  const branchCount = db.prepare('SELECT COUNT(*) AS c FROM branches').get().c;
  const decision = singleBranchDecision({ production, branchCount, allowMultiBranch: env.ALLOW_MULTI_BRANCH === '1' });
  // 两档都打印分支数：review 档靠它核对「视觉检验用的是哪份库」，生产档靠它确认硬断言依据。
  log.log(production
    ? `[server] 支部数=${branchCount}（生产档单支部断言）`
    : `[server] 支部数=${branchCount}（review 档不拦，仅提示）`);
  if (decision.blocked) {
    log.error(decision.message);
    exit(1);
  }
  return decision;
}
