#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════
//  deploy/package.mjs —— 发布包**白名单打包器**（跨平台，纯 Node，无第三方依赖）
//
//  用法：
//    node deploy/package.mjs                 # 生成到 dist/（**不带** node_modules；目标机跑 npm ci --omit=dev）
//    node deploy/package.mjs --with-deps     # 连 node_modules 一起打（目标机无外网时用）
//    node deploy/package.mjs --keep-mock     # **保留**演示名单（只用于内部演示包；生产**不要**加）
//    node deploy/package.mjs --out <目录>
//
//  为什么要有它（2026-09-29 批次 269–270 · 部署前筹备）：
//    ① **应用根＝仓库根**：`server/app.js` 同源托管 `../docs` ⇒ `docs/` 与 `server/` **必须是兄弟目录**，
//       所以「只拷 server/」是错的（会 404 全部页面）。
//    ② **绝不能带**测试与运行时产物——实测 `server/.browsers`（Playwright 测试浏览器）**543.7 MB**，
//       而真正的应用负载只有 ~10 MB（不含依赖）。「整个目录拷过去」会白带 543 MB。
//    ③ **名单不出包**（2026-09-29 批次 270，系按支书第 3 条「**目前所有的名单都不要部署上去，那是错的！！**」）：
//       `docs/src/data/mock/people.js`（51 人**真名**）与 `accounts.js`（**学号＋口令**）**必须空壳化**——
//       否则二者可被**直接下载**（静态托管下就是普通 .js 文件），且匿名访客在只读演示下仍能看到名单。
//       ⇒ 默认**剥离**；并把「包内任何文件都不得出现名单里的姓名」落成**黑名单断言**（机检，不靠自觉）。
// ════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const argv = process.argv.slice(2);
const WITH_DEPS = argv.includes('--with-deps');
const KEEP_MOCK = argv.includes('--keep-mock');
const outArg = argv.indexOf('--out');
const OUT_DIR = path.join(ROOT, outArg === -1 ? 'dist' : argv[outArg + 1]);

// ── 白名单：包内**只允许**这些（相对仓库根）──────────────────────
const INCLUDE = [
  'docs',
  'server/server.js', 'server/app.js', 'server/db.js', 'server/env.js', 'server/seed.js',
  'server/seed-baseline.js', 'server/system-notice-kinds.js', 'server/package.json', 'server/package-lock.json',
  'server/routes', 'server/services', 'server/scripts',
  'deploy',                       // 部署脚本本身要进包（说明书里让运维跑 `deploy/install.sh` / `doctor.mjs`）
  'README.md', 'README-server.md', 'LICENSE', 'CHANGELOG.md',
  'content/04_web_design/deploy', // 部署说明书（运维时需要就地查）
];
// ── 黑名单（路径）：命中即**拒绝打包** ──────────────────────────
const EXCLUDE_ANY = [
  /(^|[/\\])\.browsers([/\\]|$)/,      // Playwright 浏览器 543.7 MB
  /(^|[/\\])node_modules([/\\]|$)/,     // 由 WITH_DEPS 单独控制
  /(^|[/\\])test([/\\]|$)/,             // server/test（服务器上不跑测试）
  /(^|[/\\])backups([/\\]|$)/,
  /(^|[/\\])uploads([/\\]|$)/,
  /(^|[/\\])data\.db(-wal|-shm)?$/,
  /(^|[/\\])\.git([/\\]|$)/,
  /\.log$/i, /\.tmp$/i,
];
const isExcluded = (rel) => EXCLUDE_ANY.some((re) => re.test(rel));

function walk(abs, base = abs, acc = []) {
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const p = path.join(abs, e.name);
    const rel = path.relative(base, p).split(path.sep).join('/');
    if (isExcluded(rel)) continue;
    if (e.isDirectory()) walk(p, base, acc);
    else acc.push(rel);
  }
  return acc;
}

// ── 名单：先读**源**名册（用来做「包内不得出现这些姓名」的断言）──
//  ⚠ 口径（批次 270 实测踩到）：**只把「自然人姓名」算名单**——`p_pc` 的 name 是 `'党委组织员'`
//  （**角色名**，在多处代码里作常量出现）⇒ 若把它算进名册，断言会满屏假阳性。
//  故名册 = id 形如 `p<数字>` 的那些人（`p_pc` 是组织级账号、不作自然人名单）。
let ROSTER_NAMES = [];
try {
  const { PEOPLE } = await import(pathToFileURL(path.join(ROOT, 'docs/src/data/mock/people.js')).href);
  ROSTER_NAMES = PEOPLE.filter((p) => /^p\d+$/.test(String(p.id))).map((p) => p.name).filter((n) => n && n.length >= 2);
} catch (e) { console.warn('[package] ⚠ 读不到源名册：', e.message); }
const PLACEHOLDER = '（示例姓名）';

// ── 名单剥离（整文件空壳化）：两个**名单/口令的唯一来源** ——
const STRIP = {
  'docs/src/data/mock/people.js': `// 发布包已剥离演示名单（deploy/package.mjs；2026-09-29 批次 270）
// 空壳：保留导出名 \`PEOPLE\` 以免消费点 import 失败；成员请走 IAAA 登录 + 支部确认，或党委台「支部管理」导入名册。
export const PEOPLE = [];
`,
  'docs/src/data/mock/accounts.js': `// 发布包已剥离演示账号（deploy/package.mjs；2026-09-29 批次 270）
// 空壳：保留导出名/函数名以免消费点 import 失败。生产账号承载＝服务端 \`users\` 表（学号 + 全站统一口令）。
export const MOCK_ACCOUNTS = [];
export function mockLogin() { return null; }
`,
};
const TEXTY = /\.(js|mjs|html|json|md|css|yml|yaml|sh|ps1|conf|example)$/i;
// 口令泄露只查**账号行所在处**（`docs/src/data/mock/**` 与 `server/seed*`）——
//   `server/routes/auth.js` 与 `docs/src/services/core/accounts.js` 的 `'123456'` 是**非生产缺省口令常量**
//   （已由 `DEPLOYMENT_GUIDE` 明令「生产必须改 LOGIN_PASSWORD」），不算名单泄露。
const PW_FILE = /^docs\/src\/data\/mock\/|^server\/seed/;
const PW_SHAPE = /['"]studentId['"]\s*:\s*['"]?\d|password['"]?\s*:\s*['"]123456['"]/;

// ── 收集清单 ───────────────────────────────────────────────────
const files = [];
for (const rel of INCLUDE) {
  const abs = path.join(ROOT, rel.split('/').join(path.sep));
  if (!fs.existsSync(abs)) { console.warn(`[package] ⚠ 白名单项不存在，跳过：${rel}`); continue; }
  if (fs.statSync(abs).isFile()) { if (!isExcluded(rel)) files.push(rel); continue; }
  for (const r of walk(abs, ROOT)) files.push(rel + '/' + r.slice(rel.length + 1));
}
if (WITH_DEPS) for (const r of walk(path.join(ROOT, 'server', 'node_modules'), ROOT)) files.push(r);
files.sort();

// ── 断言①：路径黑名单 ─────────────────────────────────────────
const bad = files.filter((f) => EXCLUDE_ANY.some((re) => re.test(f)));
if (bad.length) {
  console.error('[package] ⛔ 包内出现黑名单文件（拒绝打包）：\n  - ' + bad.slice(0, 20).join('\n  - '));
  process.exit(1);
}

// ── 落地：staging（含名单剥离）→ tar.gz（Windows 10+ 自带 bsdtar，Linux/macOS 自带 tar）──
const version = JSON.parse(fs.readFileSync(path.join(ROOT, 'server', 'package.json'), 'utf8')).version;
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const name = `gsm1921-sop-v${version}-${stamp}${WITH_DEPS ? '-withdeps' : ''}${KEEP_MOCK ? '-withmock' : ''}`;
fs.mkdirSync(OUT_DIR, { recursive: true });
const stage = path.join(OUT_DIR, name);
fs.rmSync(stage, { recursive: true, force: true });
let stripped = 0, total = 0, sanitized = 0, sanitizedFiles = 0;
for (const f of files) {
  const dst = path.join(stage, f.split('/').join(path.sep));
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  if (!KEEP_MOCK && STRIP[f]) { fs.writeFileSync(dst, STRIP[f]); stripped++; continue; }
  const src = fs.readFileSync(path.join(ROOT, f.split('/').join(path.sep)));
  if (!KEEP_MOCK && TEXTY.test(f) && ROSTER_NAMES.length) {
    // **包内名单消毒**：把任何文件名册里的姓名换成占位（文书/帮助页/种子 JSON 都可能带名——
    //   批次 270 实测 `docs/help.html` 里就有支书本人的真名、`server/seed.js` 里有名册真名）。
    let s = src.toString('utf8');
    let n = 0;
    for (const name of ROSTER_NAMES) {
      if (!s.includes(name)) continue;
      const c = s.split(name).length - 1;
      s = s.split(name).join(PLACEHOLDER); n += c;
    }
    if (n) { fs.writeFileSync(dst, s); sanitized += n; sanitizedFiles++; total += Buffer.byteLength(s); continue; }
  }
  fs.writeFileSync(dst, src);
  total += src.length;
}

// ── 包内说明书：**「种子包含什么 / 功能包含什么 / 三步部署」都从本包实际内容生成**（不手写，故不会过期）──
//   2026-09-29 批次 272 新增（支书：「种子包含什么？功能包含什么？一定要尝试尽快部署好」）。
{
  const inStage = (rel) => path.join(stage, rel.split('/').join(path.sep));
  const ls = (rel) => (fs.existsSync(inStage(rel)) ? fs.readdirSync(inStage(rel)) : []);
  const pages = ls('docs').filter((f) => f.endsWith('.html'));
  const works = ls('docs/workspace').filter((f) => f.endsWith('.html'));
  const caps = ls('docs/src/capabilities').filter((f) => f.endsWith('.js'));
  const manif = fs.existsSync(inStage('docs/src/workflow/blocks/manifests.js'))
    ? fs.readFileSync(inStage('docs/src/workflow/blocks/manifests.js'), 'utf8') : '';
  const blocks = [...manif.matchAll(/blockId:\s*'([^']+)'/g)].map((m) => m[1]);
  const md = `# 发布包说明书（由 deploy/package.mjs 自动生成 · ${new Date().toISOString().slice(0, 16).replace('T', ' ')}）

> 这一份是给**部署的人**看的：三条命令跑起来；下面「包含什么 / 种什么」**都是从本包实际内容数出来的**，
> 不是手写的清单，所以永远和包里一致。

## 一、三步部署（逐条复制执行）

\`\`\`bash
# ① 装依赖（目标机需能访问 npm 源；无外网时改用 --with-deps 打出来的包，跳过本条）
cd server && npm ci --omit=dev

# ② 配环境变量：把 deploy/env.production.example 复制成 /etc/gsm1921.env，
#    至少改 LOGIN_PASSWORD（**必改**：生产未设 ⇒ 服务启动即拒）；IAAA 可选（见第四节）
cp deploy/env.production.example /etc/gsm1921.env && vi /etc/gsm1921.env

# ③ 一键装（建服务账号 + systemd + 每日备份 + 冒烟）；只想先试跑就用 npm start
sudo bash deploy/install.sh
\`\`\`

装完/起服务后的两条自检：

\`\`\`bash
node deploy/doctor.mjs --env /etc/gsm1921.env        # 部署自检 + 「下一步做什么」
node deploy/smoke.mjs --login <党委账号学号> <口令>   # 冒烟（存活 + 登录 + 读本人）
\`\`\`

## 二、这个包**包含**什么（实测自本包内容）

| 项 | 数量 | 明细 |
|---|---|---|
| 静态页（根级） | **${pages.length}** | ${pages.join(' · ')} |
| 角色工作台页 | **${works.length}** | ${works.join(' · ')} |
| 能力声明件 | **${caps.length}** | ${caps.join(' · ')} |
| 工作流块（blockId） | **${blocks.length}** | ${blocks.join(' · ')} |
| 部署脚本 | 7 | \`package.mjs\`（打包）· \`smoke.mjs\`（冒烟）· \`doctor.mjs\`（自检）· \`install.sh\`（Linux 一键）· \`install.ps1\`（Windows 一键）· \`update.sh\`（一键更新）· \`nginx.sample.conf\` |

**这个包**不含**（刻意排除，\`package.mjs\` 里有断言把关）**：测试件（\`server/test\`）· Playwright 浏览器（\`server/.browsers\`，543 MB）· 库文件（\`data.db\`）· 附件（\`uploads/\`）· 备份（\`backups/\`）· **任何成员名单**（见第五节）。

## 三、首启会**种**什么（空库首启自动建立；**零成员名单**）

- **党委账号 1 名** —— 角色 \`party-staff\`（党委组织员，组织级、不属于任何支部）。学号缺省 \`9000000001\`，可用环境变量 \`BASELINE_PARTY_STAFF_ID\` 指定。
- **支部 1 个** —— **光华管理学院本科生党支部**（id \`br-b1\`；\`config\` 为空组织模板口径＝模块/块/分工全按默认；**支书席位空缺待任命**）。
- **其余业务表全空** —— 成员请走「IAAA 登录 + 支部确认」（见第四节），或党委台「支部管理 → 导入成员名册」。
- 幂等：已有数据时**什么都不做**；重复启动不会覆盖你改过的支部名/配置。

> 这是「组织基线」，与**演示种子**（50 人名单 + 活动/考勤等，仅用于本地测试与演示）是两件事：
> 生产形态**默认不播演示种子**，也不会把它们打进这个包。

## 四、IAAA 统一身份认证（可选；不开也不影响用口令登录）

开了之后的链路：**IAAA 认人 → 有号则登录 / 无号则自动建号 → 选支部 → 支部确认**。

**怎么开通**（公开流程，可自助办）：
1. 由**在校职工**（老师/党务老师）登录 <https://portal.pku.edu.cn/> →「办事大厅」→ 搜「**统一身份认证应用备案申请**」→ 在线填写并提交审批（**线上办理，无需纸质材料，无需跑计算中心**；⚠ 该集成服务**仅面向在校职工**）。
2. 审批通过后，**计算中心会发《技术文档》**并沟通细节。
3. 把《技术文档》里的 \`appID\` 填进环境变量 \`IAAA_APP_ID\`；把你在备案里登记的回调地址填进 \`IAAA_REDIRECT_URI\`
   （形如 \`https://<你的域名>/api/v1/auth/iaaa/callback\`，**两端必须逐字一致**，否则 IAAA 会拒绝跳回）。

**不想等备案先试**：设 \`IAAA_MOCK=1\`（回调的 token 直接当学号），全链可在本机跑通。
**要改代码吗**：只有 \`server/routes/iaaa.js\` **开头那 5 行**（授权页/校验 URL/appID/回调）＋（若《技术文档》字段名不同）
函数 \`_verifyWithIaaa()\` 里标了 \`← 可能要改\` 的两行 —— 全文件其余部分不用动。

## 五、名单不出包（**这个包不含任何成员名单**）

- 打包时已把 \`docs/src/data/mock/people.js\`（演示名册）与 \`accounts.js\`（学号+口令）**空壳化**，
  并把其余文本件里的姓名**替换为占位**；
- 出包前有**两道断言**：路径黑名单 **0** 命中、姓名/口令泄露 **0** 命中 —— 任一非 0 就**拒绝出包**；
- 所以：**这个包里没有真名、没有学号、没有口令**。

## 六、常见故障

| 现象 | 原因 / 怎么办 |
|---|---|
| 启动打印 \`⛔ 启动被拒：…必须显式设置 LOGIN_PASSWORD\` | **这是故意的**：生产形态未设口令就拒启动。设 \`LOGIN_PASSWORD\` 后重启 |
| 页面能开但数据空 | 正常：首启只有「党委 + 一个支部」，没有任何成员与业务数据 |
| 大图上传失败 / 413 | 反代请求体上限要 **≥ 10m**（\`client_max_body_size 10m\`，见 \`deploy/nginx.sample.conf\`） |
| 「关于」页显示成静态形态 | 反代把 \`/src/config/deploy.js\` 当静态文件了 —— 必须**单独放行到 Node**（同上文件里已写明） |
| 想用「统一身份认证登录」 | ⚠ **前端入口尚未做**（后端链路已就绪）：先用**口令登录**（党委账号 + \`LOGIN_PASSWORD\`）；IAAA 可先照第四节去备案，前端入口随后补上 |
| 忘记党委账号学号 | 看启动日志第一段「已建立最小组织基线…学号 …」，或用 \`BASELINE_PARTY_STAFF_ID\` 重建 |
`;
  fs.writeFileSync(inStage('DEPLOY.md'), md);
  console.log(`[package]    包内已生成 DEPLOY.md（静态页 ${pages.length} · 工作台 ${works.length} · 能力 ${caps.length} · 块 ${blocks.length}）`);
}

// ── 断言②（**名单不泄露**）：消毒后再扫一遍，任何文本文件都不得残留名册姓名；账号类文件不得残留演示口令 ──
const leaks = [];
for (const f of fs.readdirSync(stage, { recursive: true })) {
  const abs = path.join(stage, f);
  if (!fs.statSync(abs).isFile() || !TEXTY.test(f)) continue;
  const rel = f.split(path.sep).join('/');
  const s = fs.readFileSync(abs, 'utf8');
  const hit = ROSTER_NAMES.filter((n) => s.includes(n));
  if (hit.length) leaks.push(`${rel} 残留姓名 ${hit.slice(0, 3).join('/')}${hit.length > 3 ? '…' : ''}`);
  if (PW_FILE.test(rel) && PW_SHAPE.test(s)) leaks.push(`${rel} 残留账号/口令行`);
}
if (leaks.length) {
  console.error('[package] ⛔ 名单泄露断言失败（拒绝出包）：\n  - ' + leaks.slice(0, 15).join('\n  - ')
    + '\n修法：把泄露源补进 deploy/package.mjs 的 STRIP，或（内部演示包）显式加 --keep-mock。');
  fs.rmSync(stage, { recursive: true, force: true });
  process.exit(1);
}
const rosterSize = new Set(ROSTER_NAMES).size;

fs.writeFileSync(path.join(stage, 'MANIFEST.txt'),
  `# ${name}\n# 生成：${new Date().toISOString()}　文件数=${files.length}\n`
  + `# 演示名单：${KEEP_MOCK ? '⚠ 已保留（--keep-mock：**不要**用于生产）' : `已剥离 ${stripped} 个文件（people.js / accounts.js 空壳化）`}\n`
  + `# 组织基线：首次启动自动建立「党委账号 1 名 ＋ 支部「光华管理学院本科生党支部」(br-b1)」，**零成员名单**\n`
  + '# 说明：这是**发布包**，不含测试件 / .browsers / 库文件 / 附件 / 备份。\n#\n' + files.join('\n') + '\n');

const tarball = path.join(OUT_DIR, `${name}.tar.gz`);
fs.rmSync(tarball, { force: true });
execFileSync('tar', ['-czf', tarball, '-C', OUT_DIR, name], { stdio: 'inherit' });
const sha = crypto.createHash('sha256').update(fs.readFileSync(tarball)).digest('hex');
fs.writeFileSync(tarball + '.sha256', `${sha}  ${path.basename(tarball)}\n`);
fs.rmSync(stage, { recursive: true, force: true });

console.log(`[package] ✅ ${path.basename(tarball)}`);
console.log(`[package]    文件 ${files.length} 个 · 解包后 ${(total / 1048576).toFixed(1)} MB（含 node_modules=${WITH_DEPS}）`);
console.log(`[package]    名单：${KEEP_MOCK ? '⚠ 保留（--keep-mock，**勿用于生产**）'
  : `空壳化 ${stripped} 个文件 ＋ 消毒 ${sanitizedFiles} 个文件 / ${sanitized} 处姓名（源名册 ${rosterSize} 人）`}`);
console.log('[package]    断言：路径黑名单 **0** 命中 ＋ 姓名/口令泄露 **0** 命中');
console.log(`[package]    sha256 ${sha}`);
console.log('[package]    解包后请在仓库根执行：cd server && npm ci --omit=dev（不带 --with-deps 时）');
