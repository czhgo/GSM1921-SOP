// role: [工程师]+[AI]
// ux-guard.test.mjs — 「代码逻辑 / 界面文本 / 操作」三向失同步的静态防回潮哨兵
// 背景（2026-09-13 dogfood 彻查，支书指令「上述问题都不是孤例」）：
//   反复出现三类同源缺陷，本测试以静态扫描锁住，防止再次回潮——
//   ① 面向用户的考核 / 机器话术（KPI、以此计量、完成率）；
//   ② 身份写死（签发落款「支书提醒：」、销项主语写死「支书」、反馈指派用演示占位 ID u_*）；
//   ③ 通知消费端不按受众过滤（签发人收到自己下发的催办）；
//   ④ R-23：思想汇报系统通知的 authorize 必须按服务端 thought_reports 表复算，不得采信客户端自述。
// 扫描前剥离注释，避免误伤说明性注释（黑名单只约束面向用户的文案与代码字面量）。
// 运行：node --test server/test/ux-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const DOCS = join(ROOT, 'docs');

/** 递归收集指定后缀的文件（排除 node_modules / 构建产物） */
function walk(dir, exts, out = []) {
  let entries = [];
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, exts, out);
    else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}

/** 剥离注释后返回代码文本（JS 的 /* 块注释 与 // 行注释、HTML 的 <!-- -->；不追求字符串内的精确处理） */
function stripComments(src) {
  let s = src.replace(/\r\n?/g, '\n'); // 统一换行（CRLF 下 /\/\/.*$/ 会因 \r 失配）
  s = s.replace(/\/\*[\s\S]*?\*\//g, ' ');   // 块注释
  s = s.replace(/<!--[\s\S]*?-->/g, ' ');    // HTML 注释（含 JS 模板串内的说明性注释）
  s = s.split('\n').map((line) => line.replace(/\/\/.*$/, '')).join('\n'); // 行注释
  return s;
}

/** 全部前端源码（docs/src + docs 根页 html）逐文件剥离注释后的文本 */
function collectSources() {
  const files = [
    ...walk(join(DOCS, 'src'), ['.js']),
    ...walk(DOCS, ['.html']),
  ];
  return files.map((f) => ({
    file: relative(ROOT, f).replace(/\\/g, '/'),
    text: stripComments(readFileSync(f, 'utf8')),
  }));
}

// ── ① 用户可见文案：考核 / 机器话术黑名单（源码 + 根页 HTML，已剥离注释）────────
test('① 用户可见文案不得出现考核/机器话术（KPI · 以此计量 · 完成率）', () => {
  const BAN = ['KPI', '以此计量', '完成率'];
  const hits = [];
  for (const { file, text } of collectSources()) {
    for (const w of BAN) {
      if (text.includes(w)) hits.push(`${file} → 「${w}」`);
    }
  }
  assert.deepEqual(hits, [], `用户可见文案命中考核/机器话术（应改为事务性自然表达）：\n${hits.join('\n')}`);
});

// ── ② 身份写死：签发落款 / 销项主语不得写死单一角色 ──────────────────────────
test('② 落款与销项主语不得写死「支书」单一角色（副书同权：应含副支书）', () => {
  // 注：「副支书销项」含「支书销项」子串，故用否定后顾只拦未带「副」的写法
  const BAN = [/支书提醒：/, /由支书销项/, /(?<!副)支书销项/, /由支书在/];
  const hits = [];
  for (const { file, text } of collectSources()) {
    for (const re of BAN) {
      if (re.test(text)) hits.push(`${file} → ${re}`);
    }
  }
  assert.deepEqual(hits, [], `发现写死单一角色的落款/销项文案（应经当前登录角色或「支书/副支书」表达）：\n${hits.join('\n')}`);
});

// ── ③ 反馈处置 / 我的处置：身份不得用演示占位 ID（u_sec/u_org/u_prop/u_disc/u_leader_*）─
// 判例：支书指派落占位 ID，而「了解进展」请求落真实 personId → 委员/组长收不到；三组长共用 u_leader_1。
test('③ 反馈指派与「我的处置」不得使用演示占位 ID（u_*），须取真实登录成员 personId', () => {
  // 注：路径用 join 分段拼接（避免出现 "/src/" 字面量——bump-version 会给该模式追加 ?v= 版本戳而改坏测试）
  const targets = [
    ['secretary', 'feedback-tab.js'],
    ['org', 'my-dispatch-tab.js'],
    ['disc', 'my-dispatch-tab.js'],
    ['prop', 'my-dispatch-tab.js'],
    ['leader', 'my-dispatch-tab.js'],
  ];
  const BAN = /'u_(sec|org|prop|disc|leader)/;
  const hits = [];
  for (const parts of targets) {
    const file = join(DOCS, 'src', 'entries', 'tabs', ...parts);
    const text = stripComments(readFileSync(file, 'utf8'));
    if (BAN.test(text)) hits.push(relative(ROOT, file).replace(/\\/g, '/'));
  }
  assert.deepEqual(hits, [], `以下文件仍写死演示占位 ID（应取 AuthStore.getCurrentUser().personId / 按角色解析真实成员）：\n${hits.join('\n')}`);
});

// ── ④ 通知消费端统一受众门（根因哨兵）：list() 必须按 audience / actionRoles 过滤 ──
test('④ 通知消费端（NoticeStore.list）必须按受众/行动角色过滤——签发人不得收到自己下发的催办', () => {
  const src = readFileSync(join(DOCS, 'src/services/notice.js'), 'utf8');
  assert.match(src, /actionRoles\.includes\(/, 'NoticeStore.list 缺少 actionRoles 受众过滤');
  assert.match(src, /audience\.includes\(/, 'NoticeStore.list 缺少 audience 角色数组过滤');
  assert.match(src, /audience === 'committee'/, "NoticeStore.list 缺少 audience==='committee'（党委下发通道）过滤");
  // 2026-09-13 补：按人定向（分工调整「信息自动传递」需送到**到人负责人**，角色数组表达不了），
  // 且多受众必须**并存命中**（原 if/return 短路：committee 会吞掉 audiencePersons/actionRoles）
  assert.match(src, /audiencePersons/, 'NoticeStore.list 缺少 audiencePersons 按人定向过滤');
  assert.match(src, /_hitPersons\(n\)\) return true|_hitPersons\(n\)/, '多受众须并存命中（不得被 committee 短路吞掉）');
});

// ── ⑥ showToast 调用约定（2026-09-13 走查实报：workforce-panel 10 处参数写反）──
// 判例：`utils.showToast(type, message)`，但 workforce-panel.js 全文件按 (message, type) 调用，
// 结果提示气泡只显示类型字面量（"warn"/"success"），用户看不到任何有用信息。
test('⑥ showToast 调用约定：首参必须是类型（success|warn|error|info）——不得参数写反', () => {
  const re = /showToast\(\s*(`[^`]*`|'[^']*'|"[^"]*")\s*,\s*'(success|warn|error|info)'\s*\)/g;
  const hits = [];
  for (const { file, text } of collectSources()) {
    let m;
    while ((m = re.exec(text))) {
      if (!/^'(success|warn|error|info)'$/.test(m[1].trim())) {
        hits.push(`${file} → showToast(${m[1].slice(0, 24)}…, '${m[2]}')`);
      }
    }
  }
  assert.deepEqual(hits, [], `showToast 参数顺序写反（应为 showToast(type, message)）：\n${hits.join('\n')}`);
});

// ── ⑤ R-23 哨兵：思想汇报系统通知 authorize 必须按服务端 thought_reports 表复算 ──
test('⑤ 思想汇报系统通知 authorize 按服务端表复算（不采信客户端自述 personId）', () => {
  const src = readFileSync(join(ROOT, 'server/system-notice-kinds.js'), 'utf8');
  assert.match(src, /rowOf\(db, 'thought_reports', sourceId\)/, 'thought-report-submitted 未按 thought_reports 表复算授权');
  assert.match(src, /row\.personId === actor\.id/, 'thought-report-submitted 未校验提交人本人');
  const dbSrc = readFileSync(join(ROOT, 'server/db.js'), 'utf8');
  assert.match(dbSrc, /'thought_reports'/, 'server/db.js 缺 thought_reports 表');
  const resources = readFileSync(join(ROOT, 'server/routes/resources.js'), 'utf8');
  assert.match(resources, /thoughtReports: 'thought_reports'/, 'resources.js 缺 thoughtReports → thought_reports 映射');
});
