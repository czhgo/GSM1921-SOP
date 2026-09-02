// role: [工程师]+[AI]
// b3-1-makeup-writeback.test.mjs — B3-1 补课完成→考勤回写 made_up 验证（T-280）
// 运行：先启动 server，再 node server/test/b3-1-makeup-writeback.test.mjs
import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const browser = await chromium.launch();
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`);
};

// 独立上下文，避免污染共享 localStorage
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));

// 1. 登录纪检
await p.goto(`${BASE}/workspace/disc.html?dev=disc-commissioner`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(3000);

// 2. 注入合成补课任务（指向 att38 = ABSENT），持久化
await p.evaluate(async () => {
  // 版本串与全库一致（20260901c）：import 页面主模块实例（不一致会注入孤儿实例，页面读不到）
  const { mockDB } = await import('/src/core/domain.js?v=20260901o');
  const { persist } = await import('/src/core/data-adapter.js?v=20260901o');
  mockDB.makeupTasks = (mockDB.makeupTasks || []).filter(t => t.id !== 'mk_b31_test');
  mockDB.makeupTasks.push({
    id: 'mk_b31_test',
    personId: 'p5',
    activityId: 'act-11',
    attendanceRecordId: 'att38',
    activityName: '5月主题党日',
    personName: '测试成员',
    absentDate: '2026-05-20',
    deadline: '2026-05-27',
    status: 'pending',
    isMandatory: true,
    createdAt: new Date().toISOString(),
  });
  persist();
  // 确认 att38 当前状态为 absent
  const att = mockDB.attendances.find(r => r.id === 'att38');
  return att ? att.status : 'missing';
});
// 重载使补课 tab 读到注入任务
await p.goto(`${BASE}/workspace/disc.html`, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(2500);

// 3. 切到补课制度 tab
await p.click('.disc-tab-btn[data-disc-tab="makeup"]').catch(() => {});
await p.waitForTimeout(1500);

// 4. 找到注入任务并点击"确认完成"
const taskVisible = await p.evaluate(() => !!document.querySelector('.btn-disc-confirm-makeup[data-task-id="mk_b31_test"]'));
check('注入补课任务出现在待补课列表', taskVisible);
if (taskVisible) {
  await p.click('.btn-disc-confirm-makeup[data-task-id="mk_b31_test"]');
  await p.waitForTimeout(1000);
}

// 5. 验证 att38 回写为 made_up
const st = await p.evaluate(async () => {
  const { mockDB } = await import('/src/core/domain.js?v=20260901o');
  const att = mockDB.attendances.find(r => r.id === 'att38');
  const task = (mockDB.makeupTasks || []).find(t => t.id === 'mk_b31_test');
  return { attStatus: att ? att.status : 'missing', taskStatus: task ? task.status : 'missing', attOverdue: att ? att.overdue : null };
});
check('补课任务已标记 completed', st.taskStatus === 'completed', `task=${st.taskStatus}`);
check('对应考勤 att38 已回写 made_up', st.attStatus === 'made_up', `att=${st.attStatus}`);
check('att38 overdue 已清除', st.attOverdue === false, `overdue=${st.attOverdue}`);
check('无 JS 错误', errs.length === 0, errs.slice(0, 2).join(' | '));

await ctx.close();
await browser.close();

const pass = results.filter(r => r.ok).length;
const fail = results.filter(r => !r.ok).length;
console.log(`\nB3-1 验证：${pass} PASS / ${fail} FAIL / 共 ${results.length} 项`);
process.exit(fail > 0 ? 1 : 0);
