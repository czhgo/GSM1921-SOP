#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════
//  deploy/doctor.mjs —— **部署自检 ＋ 小白引导**（跨平台，纯 Node，无第三方依赖）
//
//  用法（在仓库根或解包后的发布包根执行）：
//    node deploy/doctor.mjs                     # 自检并告诉你下一步做什么
//    node deploy/doctor.mjs --env /etc/gsm1921.env   # 顺带检查环境变量文件
//    BASE=http://127.0.0.1:3000 node deploy/doctor.mjs   # 顺带探服务是否活着
//
//  它只**读**、**不改**任何东西，退出码：0 = 可以起服务了；1 = 还有拦路项。
//  设计原则（支书 2026-09-29：「我毕竟是全栈开发上的小白」）：
//    · 每一项都印 **✅ 已就绪 / ⚠ 缺什么 / 👉 下一步**，不堆术语；
//    · 「下一步」永远是**一条可复制粘贴的命令**或**一个可点的网址**。
// ════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const argv = process.argv.slice(2);
const envArg = argv.indexOf('--env');
const ENV_FILE = envArg === -1 ? (process.env.ENV_FILE || null) : argv[envArg + 1];
const BASE = (process.env.BASE || 'http://127.0.0.1:' + (process.env.PORT || 3000)).replace(/\/$/, '');

const blockers = [];
const todos = [];
const ok = (m) => console.log(`  ✅ ${m}`);
const warn = (m) => console.log(`  ⚠ ${m}`);
const head = (m) => console.log(`\n== ${m}`);

/** 解析 env 文件（只认 `KEY=值` 两种写法：systemd EnvironmentFile / 手写均可）
 *  ⚠ 必须剥掉值后面的**行内注释**——`deploy/env.production.example` 通篇带注释（如 `APP_ENV=production  # …`），
 *  不剥就会把注释当成值的一部分 ⇒ 每一项都误报「建议 production」（2026-09-29 批次 272 实测踩到并修）。 */
function readEnvFile(p) {
  const out = {};
  if (!p || !fs.existsSync(p)) return out;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1);
    if (!/^\s*["']/.test(val)) val = val.replace(/\s+#.*$/, '');   // 无引号才剥注释；有引号按原样
    out[key] = val.trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  部署自检（deploy/doctor.mjs）—— 只会读，不会改任何东西      ║');
console.log('╚══════════════════════════════════════════════════════════════╝');

// ── ① 运行环境 ──
head('① 运行环境');
const major = Number(process.versions.node.split('.')[0]);
if (major >= 22) ok(`Node 版本 ${process.version}（要求 ≥ 22）`);
else { warn(`Node 版本 ${process.version} **过低**（要求 ≥ 22；better-sqlite3@12 不支持 18）`); blockers.push('Node 版本过低'); }
console.log(`  · 操作系统 ${process.platform} · 架构 ${process.arch}`);

// ── ② 文件是否齐（发布包/仓库根）──
head('② 文件位置（"应用根"必须是同时含 docs/ 与 server/ 的那一层）');
const need = [
  ['server/server.js', '后端入口'],
  ['server/app.js', '后端应用'],
  ['docs/index.html', '前端首页'],
  ['docs/login.html', '登录页'],
  ['server/package.json', '后端依赖清单'],
];
for (const [rel, what] of need) {
  const abs = path.join(ROOT, rel.split('/').join(path.sep));
  if (fs.existsSync(abs)) ok(`${rel}（${what}）`);
  else { warn(`**缺** ${rel}（${what}）—— 你是不是在子目录里跑的？请 cd 到"应用根"再跑`); blockers.push(`缺文件 ${rel}`); }
}

// ── ③ 依赖 ──
head('③ 依赖是否装好');
const depOk = ['express', 'better-sqlite3', 'multer', 'nodemailer']
  .every((d) => fs.existsSync(path.join(ROOT, 'server', 'node_modules', d)));
if (depOk) ok('server/node_modules 已就绪（express / better-sqlite3 / multer / nodemailer）');
else {
  warn('依赖未装（或不全）');
  todos.push('cd server && npm ci --omit=dev    # 目标机需能访问 npm 源；无外网请用 --with-deps 打的包');
}

// ── ④ 数据目录可写 ──
head('④ 数据落点（**库与附件必须可写，且必须一起备份**）');
for (const [rel, what] of [['server', '库文件所在目录'], ['server/uploads', '附件目录']]) {
  const abs = path.join(ROOT, rel.split('/').join(path.sep));
  try {
    fs.mkdirSync(abs, { recursive: true });
    fs.accessSync(abs, fs.constants.W_OK);
    ok(`${rel}/ 可写（${what}）`);
  } catch (e) { warn(`${rel}/ **不可写**：${e.message}`); blockers.push(`${rel}/ 不可写`); }
}

// ── ⑤ 环境变量（生产必设 5 项 ＋ IAAA）──
head('⑤ 环境变量');
const env = { ...process.env, ...readEnvFile(ENV_FILE) };
if (ENV_FILE) console.log(`  · 读取环境文件：${ENV_FILE}${fs.existsSync(ENV_FILE) ? '' : '（**文件不存在**）'}`);
else console.log('  · 未传 --env（只查当前进程的环境变量；systemd 部署请加 `--env /etc/gsm1921.env`）');

const prod = env.APP_ENV === 'production' || env.NODE_ENV === 'production';
const five = [
  ['APP_ENV', 'production', '生产形态开关（未设 ⇒ 口令与播种的保护都不生效）'],
  ['LOGIN_PASSWORD', null, '**必改**：全站统一口令（生产未设 ⇒ server 启动即拒）'],
  ['DB_PATH', null, '库文件路径（缺省 server/data.db）'],
  ['UPLOAD_DIR', null, '附件目录（缺省 server/uploads）'],
  ['SEED_FALLBACK', '0', '关断前端三域演示回退（生产置 0）'],
];
for (const [k, want, what] of five) {
  const v = env[k];
  if (v === undefined || v === '') {
    if (k === 'LOGIN_PASSWORD' || k === 'APP_ENV') { warn(`${k} **未设** —— ${what}`); blockers.push(`${k} 未设`); }
    else { warn(`${k} 未设（${what}）`); }
  } else if (want && v !== want) warn(`${k}=${v}（建议 ${want}）—— ${what}`);
  else ok(`${k}=${k === 'LOGIN_PASSWORD' ? '（已设，不回显）' : v}`);
}
if (env.DISABLE_PASSWORD_CHECK === '1' && prod) { warn('DISABLE_PASSWORD_CHECK=1 **在生产形态会被忽略**（逃逸门只在非生产生效），但仍建议删掉它'); }
if (env.LOGIN_PASSWORD === '123456') warn('LOGIN_PASSWORD 还是缺省演示口令 `123456` —— **必须改**');

console.log('\n  ── IAAA 统一身份认证（没备案也能先用口令登录）──');
if (env.IAAA_MOCK === '1') ok('IAAA_MOCK=1 ⇒ 本地联调模式（回调的 token 直接当学号；**生产不要设**）');
else if (!env.IAAA_APP_ID || !env.IAAA_REDIRECT_URI) {
  warn('IAAA 未配置（`IAAA_APP_ID` / `IAAA_REDIRECT_URI` 为空）⇒ 走「统一身份认证登录」会提示未配置，**不影响用口令登录**');
  console.log('     👉 想开通：由**在校职工**登录 https://portal.pku.edu.cn/ →「办事大厅」→ 搜「**统一身份认证应用备案申请**」');
  console.log('        → 在线提交（线上办、无需纸质、无需跑计算中心；⚠ 该服务仅面向在校职工）→ 审批后计算中心发《技术文档》');
  console.log('        → 把文档里的 `appID` 填 IAAA_APP_ID；把备案里登记的回调地址填 IAAA_REDIRECT_URI');
  console.log('          （形如 https://<你的域名>/api/v1/auth/iaaa/callback，**两端必须逐字一致**）');
} else {
  ok(`IAAA 已配置：appID=${env.IAAA_APP_ID}`);
  console.log(`     · 回调地址 = ${env.IAAA_REDIRECT_URI}`);
  console.log('     · ⚠ 确认它与你**备案登记的回调**逐字一致；不一致时 IAAA 会拒绝跳回');
  if (!prod) warn('当前不是生产形态（APP_ENV≠production）—— 本地能跑，但上线前请设 APP_ENV=production');
}

// ── ⑥ 服务是否活着 ──
head('⑥ 服务是否已在跑');
try {
  const r = await fetch(`${BASE}/api/v1/health`, { signal: AbortSignal.timeout(2500) });
  const j = await r.json().catch(() => null);
  if (r.ok && j && j.ok === true) ok(`${BASE}/api/v1/health ⇒ {ok:true}（服务在跑）`);
  else warn(`${BASE} 有响应但不符合预期：HTTP ${r.status}`);
} catch {
  console.log(`  · ${BASE} 暂无响应（服务还没起，正常）`);
  todos.push('cd server && npm start        # 起服务（缺省 http://localhost:3000）');
}

// ── ⑦ 结论：下一步做什么 ──
head('⑦ 结论 · 你下一步做什么');
if (blockers.length) {
  console.log(`  ⛔ 还有 ${blockers.length} 个拦路项：${blockers.join('；')}`);
} else {
  console.log('  ✅ 没有拦路项 —— 可以起服务了');
}
console.log('\n  首次部署（三条命令，逐条复制执行）：');
console.log('    1) cd server && npm ci --omit=dev');
console.log('    2) 设环境变量：把 deploy/env.production.example 复制成 /etc/gsm1921.env 并改 LOGIN_PASSWORD，');
console.log('       然后（或用一键脚本）  sudo bash deploy/install.sh');
console.log('    3) 起服务后跑冒烟：node deploy/smoke.mjs --login <党委账号学号> <口令>');
console.log('\n  起服务后会发生什么（首启空库自动建立，**零成员名单**）：');
console.log('    · 党委账号 1 名（角色 party-staff；学号可用 BASELINE_PARTY_STAFF_ID 指定）');
console.log('    · 支部 1 个：**光华管理学院本科生党支部**（id br-b1，支书席位空缺待任命）');
console.log('    · 其余业务表全空 —— 成员请走 IAAA 登录 + 支部确认，或党委台「支部管理 → 导入成员名册」');
console.log('\n  排错：journalctl -u gsm1921 -f（systemd）／看 npm start 那个窗口（前台）');
process.exitCode = blockers.length ? 1 : 0;
