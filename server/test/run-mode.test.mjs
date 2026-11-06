// server/test/run-mode.test.mjs —— 运行档（review / production）与生产单支部硬断言守卫
//
// 为什么单独成文件：本组用例只覆盖「启动形态」，不触 HTTP、不连 3000、不写运行库
//   （全部 `:memory:`），与 api 形态用例分离，秒级可跑。
//
// 验的是四件事：
//   R1/R2 启动日志文案逐字可核对（review 区分演示种子 on/off；production 固定 off）；
//   R3 生产档多支部默认**拒绝**，提示必须含「一实例一支部；多支部需先完成服务端读过滤或显式设置
//      ALLOW_MULTI_BRANCH=1」；
//   R4 `ALLOW_MULTI_BRANCH=1` 放行；
//   R5 review 档多支部**不拦**（视觉检验常需要多支部库）；
//   R6 执行器真的调用 exit(1)（注入 exit，不结束测试进程），review 档不退出；
//   R7 缺省判定确实复用 `env.js::isProductionEnv`（不另写一套口径）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initDb } from '../db.js';
import { formatRunModeLine, singleBranchDecision, enforceSingleBranch, MULTI_BRANCH_RULE } from '../run-mode.js';

/** 造一份只含 n 个支部的内存库（不播种、不触磁盘） */
function dbWithBranches(n) {
  const db = initDb(':memory:');
  const stmt = db.prepare('INSERT INTO branches (id, data) VALUES (?, ?)');
  for (let i = 1; i <= n; i += 1) stmt.run(`br-test-${i}`, JSON.stringify({ id: `br-test-${i}`, name: `测试支部${i}` }));
  return db;
}

test('R1 review 档日志文案：演示种子按实际开关显示 on/off，库路径原样透出', () => {
  assert.equal(
    formatRunModeLine({ production: false, demoSeedEnabled: true, dbPath: 'data.review.db' }),
    '[server] 运行档：review（视觉检验；演示种子=on；库=data.review.db）',
  );
  assert.equal(
    formatRunModeLine({ production: false, demoSeedEnabled: false, dbPath: 'data.review.db' }),
    '[server] 运行档：review（视觉检验；演示种子=off；库=data.review.db）',
  );
});

test('R2 production 档日志文案固定「单支部 / 演示种子=off」', () => {
  assert.equal(
    formatRunModeLine({ production: true, demoSeedEnabled: true, dbPath: '/opt/gsm1921/branch.db' }),
    '[server] 运行档：production（单支部；演示种子=off；库=/opt/gsm1921/branch.db）',
  );
});

test('R3 生产档多支部默认拒绝，提示含统一口径与可执行开关', () => {
  const d = singleBranchDecision({ production: true, branchCount: 3, allowMultiBranch: false });
  assert.equal(d.blocked, true);
  assert.equal(d.reason, 'multi-branch');
  assert.ok(d.message.includes(MULTI_BRANCH_RULE), '提示必须逐字包含统一口径');
  assert.match(d.message, /ALLOW_MULTI_BRANCH=1/, '提示必须给出可执行的放行开关');
});

test('R4 生产档多支部 + ALLOW_MULTI_BRANCH=1 ⇒ 放行（仍标记为显式放行）', () => {
  const d = singleBranchDecision({ production: true, branchCount: 3, allowMultiBranch: true });
  assert.equal(d.blocked, false);
  assert.equal(d.reason, 'allow-multi-branch');
});

test('R5 review 档多支部不拦（视觉检验需要多支部库）', () => {
  const d = singleBranchDecision({ production: false, branchCount: 5, allowMultiBranch: false });
  assert.equal(d.blocked, false);
  assert.equal(d.reason, 'not-production');
});

test('R6 执行器：生产档多支部调用 exit(1)；review 档不退出（:memory: 库）', () => {
  const db = dbWithBranches(2);
  const quiet = { log: () => {}, error: () => {} };
  let code = null;
  const prod = enforceSingleBranch(db, { production: true, env: {}, log: quiet, exit: (c) => { code = c; } });
  assert.equal(code, 1, '生产档多支部必须以退出码 1 结束');
  assert.equal(prod.blocked, true);

  code = null;
  const review = enforceSingleBranch(db, { production: false, env: {}, log: quiet, exit: (c) => { code = c; } });
  assert.equal(code, null, 'review 档不得退出');
  assert.equal(review.blocked, false);
  db.close();
});

test('R7 缺省判定复用 env.js::isProductionEnv（APP_ENV=production 即生产档）', () => {
  const prev = process.env.APP_ENV;
  process.env.APP_ENV = 'production';
  try {
    assert.equal(singleBranchDecision({ branchCount: 2 }).blocked, true);
  } finally {
    if (prev === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = prev;
  }
});

