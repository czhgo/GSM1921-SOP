// server/test/doc-consistency.test.mjs — 「说明文件 ↔ 代码实测」口径守卫（2026-09-15 批次 42）
//
// 来源（支书第 4 项）：「请更新所有的 README、相关的说明文件！……也有很多值得提炼总结的经验，
//   这些经验是要推广开，让 AI 以此为案例发现新问题来继续询问我的！！」
// 病灶（本批实测）：说明文件与代码之间积了 **34 处口径未同步**——纪检台/组长台 tab 数（文档 10 vs 代码 8/9）、
//   已删 tab 仍列在帮助页（「复盘状态」「制度与文本」）、组织台 tab 顺序与代码相反、党委台两行写反、
//   数据域/表数在三份文档里各有版本（25/26/27/28/34/30）、页面数 19（实 21）、旧界面名（考勤总表 / 按人浏览 /
//   公邮）长期未随代码收敛。**根因：这些数字与名称没有守卫，只能靠人记得同步。**
//
// 本守卫把「说明文件里的口径」变成**测试常驻断言**（判据一律以代码实测为准，不引用文档自述）：
//   S1 各台 tab 数与代码注册数组长度一致（help.html 两处：§0.1 表与 §2.x 标题）
//   S2 各台 tab 名称齐备且已删 tab 名不得复现（帮助页 §2.x 区块内逐名核对）
//   S3 分组名只有一套轴：支部角色台＝工作台/我的职责/知情查看/制度与答复；党委台＝首页/全院治理/支部治理
//   S4 旧界面名黑名单零命中（考勤总表 / 按人浏览 / 公邮）——防「文档又写回旧名」
//   S5 数据五数（mockDB / mock-adapter / db.js / 资源名 / 快照键）文档声明与代码实测一致
//   S6 页面数（根页 + 工作台）文档声明与 `docs/` 实况一致
//   S7 单一源组件登记处：登记路径须真实存在，且至少被一处 import（防僵尸登记）
//   S8 公邮（mailbox）废止防回潮：代码与数据侧零残留
//   S9 §0.2「规则 → 守卫 → 状态 总索引」里的守卫引用必须真实存在（断言号不得写过时 / 写超前）
//   S10 §0.2 引用的守卫必须登记进 README 测试清单（堵「守卫悄悄缺席」——批 43 的 page-sweep 即长期缺席）
//   S11 README 里的守卫条目必须指到真实存在的文件与断言号（口径同 S9，覆盖 README）
//   S12 授权声明必须同行带可核验日期（防「注释伪造支书批」——Q-23-41）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = join(ROOT, 'docs', 'src');
const CAP = join(SRC, 'modules', 'capabilities');
const HELP = join(ROOT, 'docs', 'help.html');
const CHECKLIST = join(ROOT, 'content', '05_ai_coding', 'DATA_CONSISTENCY_CHECKLIST.md');
const SNAPSHOT = join(ROOT, '.ctx', 'SNAPSHOT.md');
const README = join(ROOT, 'README.md');

const read = (f) => readFileSync(f, 'utf8');

/** 遍历目录下的 .js / .mjs（守卫扫描用） */
function walkJs(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const f = join(dir, n);
    if (statSync(f).isDirectory()) walkJs(f, out);
    else if (/\.(js|mjs)$/.test(n)) out.push(f);
  }
  return out;
}

/** 逐台：从工作台注册文件解析 tab 清单（id / label / groupLabel 取自注册行；同一 id 只计一次） */
function tabsOf(file) {
  const src = read(join(CAP, file));
  const map = new Map();
  for (const line of src.split(/\r?\n/)) {
    const t = line.trimStart();
    if (t.startsWith('//') || !t.startsWith('{ id: ')) continue;
    const id = /id: '([^']+)'/.exec(line)?.[1];
    const label = /label: '([^']+)'/.exec(line)?.[1];
    const group = /groupLabel: '([^']+)'/.exec(line)?.[1];
    if (id && label && group && !map.has(id)) map.set(id, { label, group });
  }
  return map;
}

/** 台清单：help.html 页面名 → 工作台注册文件 / §2.x 小节号 */
const WORKS = [
  { page: 'secretary', file: 'secretary-workspace.js', sec: '2.1', name: '支书工作台' },
  { page: 'org', file: 'org-workspace.js', sec: '2.2', name: '组织委员工作台' },
  { page: 'prop', file: 'prop-workspace.js', sec: '2.3', name: '宣传委员工作台' },
  { page: 'disc', file: 'disc-workspace.js', sec: '2.4', name: '纪检委员工作台' },
  { page: 'leader', file: 'leader-workspace.js', sec: '2.5', name: '党小组组长工作台' },
  { page: 'visitor', file: 'visitor-workspace.js', sec: '2.6', name: '成员工作台' },
  { page: 'party-committee', file: 'party-committee-workspace.js', sec: '2.7', name: '党委工作台' },
];

// ── 结构层 ────────────────────────────────────────────────────────────

test('S1 各台 tab 数与代码注册数组一致（help.html §0.1 表 + §2.x 标题两处都核）', () => {
  const help = read(HELP);
  // §0.1 表：<a href="./workspace/<page>.html">…</a></td><td>…（N 个 tab，见 2.x）
  const counts01 = new Map();
  for (const row of help.split(/<tr>/)) {
    const page = /workspace\/([a-z-]+)\.html/.exec(row)?.[1];
    const n = /（(\d+) 个 tab/.exec(row)?.[1];
    if (page && n) counts01.set(page, Number(n));
  }
  // §2.x 标题：<span class="doc-h3-badge">2.4</span>纪检委员工作台（8 tab）
  const counts2x = new Map();
  for (const m of help.matchAll(/doc-h3-badge">(2\.\d)<\/span>[^<（]*（[^（]*?(\d+) tab/g)) counts2x.set(m[1], Number(m[2]));

  const problems = [];
  for (const w of WORKS) {
    const real = tabsOf(w.file).size;
    const a = counts01.get(w.page);
    const b = counts2x.get(w.sec);
    if (a !== real) problems.push(`help.html §0.1「${w.name}」写 ${a ?? '(缺)'} 个 tab，代码 ${w.file} 实为 ${real}`);
    if (b !== real) problems.push(`help.html §${w.sec} 标题写 ${b ?? '(缺)'} tab，代码 ${w.file} 实为 ${real}`);
  }
  assert.deepEqual(problems, [], `说明文件 tab 数与代码不一致：\n${problems.join('\n')}`);
});

test('S2 各台 tab 名称齐备；已删 tab 名不得在帮助页复现', () => {
  const help = read(HELP);
  // 按 §2.x 标题切块，逐块核对本台 tab 名
  const marks = [...help.matchAll(/doc-h3-badge">(2\.\d)<\/span>/g)].map((m) => ({ sec: m[1], at: m.index }));
  const problems = [];
  for (const w of WORKS) {
    const at = marks.find((m) => m.sec === w.sec)?.at;
    if (at === undefined) { problems.push(`help.html 缺 §${w.sec} 小节`); continue; }
    const next = marks.find((m) => m.at > at)?.at ?? help.length;
    const block = help.slice(at, next);
    for (const [id, { label }] of tabsOf(w.file)) {
      if (!block.includes(label)) problems.push(`help.html §${w.sec}（${w.name}）缺 tab 名「${label}」（id ${id}）`);
    }
  }
  assert.deepEqual(problems, [], `帮助页 tab 名与代码不一致：\n${problems.join('\n')}`);
  // 已删 tab 名不得以表格行形式复现（复盘状态已并入「组员进展」；制度与文本随公邮废止撤除）
  assert.ok(!/<td>复盘状态<\/td>/.test(help), 'help.html 仍把「复盘状态」列为独立 tab（已并入「组员进展」）');
  assert.ok(!/<td>制度与文本<\/td>/.test(help), 'help.html 仍把「制度与文本」列为独立 tab（已随公邮废止撤除）');
});

test('S3 分组名只有一套轴：支部角色台四组、党委台三组（且「党建 / 反馈」组名不得回潮）', () => {
  const BRANCH_GROUPS = new Set(['工作台', '我的职责', '知情查看', '制度与答复']);
  const PC_GROUPS = new Set(['首页', '全院治理', '支部治理']);
  const problems = [];
  for (const w of WORKS) {
    const allowed = w.page === 'party-committee' ? PC_GROUPS : BRANCH_GROUPS;
    for (const [id, { group }] of tabsOf(w.file)) {
      if (!allowed.has(group)) problems.push(`${w.file} 的 ${id} 分组「${group}」不在允许集合 {${[...allowed].join(' / ')}}`);
    }
  }
  // 防回潮：旧的「党建 / 反馈」组名不得再出现在工作台注册里
  for (const f of readdirSync(CAP).filter((n) => n.endsWith('-workspace.js'))) {
    const src = read(join(CAP, f));
    if (/groupLabel: '党建'/.test(src)) problems.push(`${f} 仍有 groupLabel: '党建'（已改名「我的职责」）`);
    if (/groupLabel: '反馈'/.test(src)) problems.push(`${f} 仍有 groupLabel: '反馈'（已并入「制度与答复」）`);
  }
  assert.deepEqual(problems, [], problems.join('\n'));
  // 正向：新组名/新入口必须在面向用户的说明里出现（help 用组名，成员版用职责页清单）
  assert.match(read(HELP), /我的职责/, 'help.html 未出现新组名「我的职责」');
  const members = read(join(ROOT, 'README-members.md'));
  assert.match(members, /知情查看/, 'README-members.md 角色表未补「知情查看」');
  assert.match(members, /我的处置/, 'README-members.md 角色表未补答复入口「我的处置」');
});

test('S4 旧界面名黑名单零命中（考勤总表 / 按人浏览 / 公邮）', () => {
  // 扫描范围＝现行说明文件（不含 .ctx 历史留痕）
  const ROOTS = [join(ROOT, 'docs'), join(ROOT, 'content')];
  const ROOT_FILES = ['README.md', 'README-members.md', 'CLAUDE.md'];
  const BAD = [
    { re: /考勤总表/, why: '旧界面名，现名「考勤明细」' },
    { re: /按人浏览/, why: '旧界面名，现名「思想汇报台账（按人 × 期次）」' },
    { re: /公邮/, why: '已废止的功能（批次 42 支书裁定）' },
  ];
  const hits = [];
  const scan = (file) => {
    if (!/\.(md|html)$/.test(file)) return;
    const src = read(file);
    src.split(/\r?\n/).forEach((line, i) => {
      // 白名单：**历史/废止叙述**语境允许出现旧名（如治理规则正文写「公邮由支书裁定废止」、
      // 组件规范写「原『制度与文本』tab 已废止」）——守卫要抓的是「现行描述仍用旧名」。
      if (/已废止|废止|旧界面名|旧称|原「|改名|历史留痕/.test(line)) return;
      for (const b of BAD) if (b.re.test(line)) hits.push(`${relative(ROOT, file).split('\\').join('/')}:${i + 1} 含「${b.re.source}」（${b.why}）`);
    });
  };
  const walk = (dir) => {
    for (const n of readdirSync(dir)) {
      const f = join(dir, n);
      if (statSync(f).isDirectory()) walk(f);
      else scan(f);
    }
  };
  ROOTS.forEach(walk);
  ROOT_FILES.forEach((f) => scan(join(ROOT, f)));
  assert.deepEqual(hits, [], `说明文件仍写旧界名：\n${hits.join('\n')}`);
});

test('S5 数据五数：文档声明与代码实测一致（分口径，严禁互相代入）', () => {
  const dbSrc = read(join(ROOT, 'server', 'db.js'));
  const resSrc = read(join(ROOT, 'server', 'routes', 'resources.js'));
  const daSrc = read(join(SRC, 'core', 'data-adapter.js'));
  const domSrc = read(join(SRC, 'core', 'domain.js'));

  const dbTables = (dbSrc.match(/const RESOURCE_TABLES = \[([\s\S]*?)\]/)[1].match(/'/g) || []).length / 2;
  const resNames = (resSrc.match(/const RESOURCE_TABLES = \{([\s\S]*?)\n\};/)[1].match(/^\s{2}\w+:/gm) || []).length;
  const snapKeys = (daSrc.match(/_buildSnapshotPayload[\s\S]*?return \{([\s\S]*?)\n {2}\};/)[1].match(/^ {4}\w+:/gm) || []).length;
  const mockKeys = (domSrc.match(/export const mockDB = \{([\s\S]*?)\n\};/)[1].match(/^ {2}(\w+):/gm) || [])
    .map((s) => s.trim().replace(':', ''))
    .filter((k) => !k.startsWith('_')).length;

  assert.ok(mockKeys > 0, 'mockDB 顶层业务域解析失败');

  const checklist = read(CHECKLIST);
  const snapshot = read(SNAPSHOT);
  const problems = [];
  const decl = (re, real, label) => {
    const m = re.exec(checklist);
    if (!m) { problems.push(`DATA_CONSISTENCY_CHECKLIST 缺声明：${label}`); return; }
    if (Number(m[1]) !== real) problems.push(`${label}：文档写 ${m[1]}，代码实测 ${real}`);
  };
  decl(/mockDB 顶层业务域[\s\S]{0,80}实测 (\d+)/, mockKeys, 'mockDB 顶层业务域');
  decl(/快照 payload 键[\s\S]{0,80}实测 (\d+)/, snapKeys, '快照 payload 键');
  decl(/资源名映射[\s\S]{0,80}实测 (\d+)/, resNames, '资源名映射');
  decl(/server 表[\s\S]{0,80}实测 (\d+)/, dbTables, 'server 表');
  // SNAPSHOT 侧：资源表数与页面数
  const snapTable = /资源表 (\d+)/.exec(snapshot)?.[1];
  if (Number(snapTable) !== dbTables) problems.push(`SNAPSHOT 写「资源表 ${snapTable}」，代码实测 ${dbTables}`);
  assert.deepEqual(problems, [], `数据口径未同步：\n${problems.join('\n')}`);
});

test('S6 页面数：文档声明与 docs/ 实况一致（根页 + 工作台）', () => {
  const roots = readdirSync(join(ROOT, 'docs')).filter((f) => f.endsWith('.html')).length;
  const works = readdirSync(join(ROOT, 'docs', 'workspace')).filter((f) => f.endsWith('.html')).length;
  const total = roots + works;
  const snapshot = read(SNAPSHOT);
  assert.match(snapshot, new RegExp(`实测 ${total}（?:=|个）|实测 ${total}=`), `SNAPSHOT 未声明实测页面数 ${total}（${roots} 根 + ${works} 工作台）`);
  assert.match(snapshot, /以 docs\/ 实况为准/, 'SNAPSHOT 页面数须写明「以 docs/ 实况为准」的口径');
});

test('S7 单一源组件登记处：登记路径真实存在且至少被一处 import（防僵尸登记）', () => {
  const readme = read(README);
  const block = /\*\*单一源组件（新增件在此登记[^）]*）\*\*：([\s\S]*?)\r?\n\r?\n/.exec(readme)?.[1] || '';
  const paths = [...block.matchAll(/`([a-z0-9/.-]+\.(?:js|mjs))`/g)].map((m) => m[1]);
  assert.ok(paths.length >= 6, `未能从 README 单一源登记处解析出组件路径（实得 ${paths.length} 条）`);
  const files = [...walkJs(SRC), ...walkJs(join(ROOT, 'docs', 'scripts')), ...walkJs(join(ROOT, 'server', 'routes'))];
  const problems = [];
  for (const p of paths) {
    const abs = p.startsWith('docs/') ? join(ROOT, p) : join(SRC, p);
    if (!existsSync(abs) && !existsSync(join(ROOT, p))) { problems.push(`登记路径不存在：${p}`); continue; }
    const base = p.split('/').pop();
    const used = files.some((f) => new RegExp(`['"/]${base.replace('.', '\\.')}(\\?v=|')`).test(read(f)));
    if (!used) problems.push(`登记了但无人引用（僵尸登记，引用须带版本戳）：${p}`);
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});


test('S8 公邮（mailbox）废止防回潮：代码与数据侧零残留', () => {
  const roots = [SRC, join(ROOT, 'server', 'routes'), join(ROOT, 'docs', 'data')];
  const hits = [];
  const walk = (dir) => {
    for (const n of readdirSync(dir)) {
      const f = join(dir, n);
      if (statSync(f).isDirectory()) { walk(f); continue; }
      if (!/\.(js|mjs|json)$/.test(f)) continue;
      if (/mailboxConfig|mailboxHistory|mailbox_config|mailbox_history/.test(read(f))) hits.push(relative(ROOT, f).split('\\').join('/'));
    }
  };
  roots.forEach(walk);
  // 本守卫自身与历史日志不在扫描范围（roots 已排除 .ctx）
  assert.deepEqual(hits, [], `公邮域已废止，仍有残留登记：\n${hits.join('\n')}`);
});

test('S9 §0.2 总索引里的守卫引用必须真实存在（断言号不得写过时 / 写超前）', () => {
  const doc = read(CHECKLIST);
  const rows = doc.split(/\r?\n/).filter((l) => /^\|\s.*`[\w.-]+\.test\.(mjs|js)::/.test(l));
  assert.ok(rows.length >= 20, `§0.2 总索引行数过少（实测 ${rows.length}，基线 21 行）：索引被删减或格式破损`);
  const REF = /`([\w.-]+\.test\.(?:mjs|js))::([^`]*)`/g;
  const ID = /\b([SDNPMECL])(\d+)\b/g;
  const problems = [];
  const checked = new Set();
  for (const row of rows) {
    for (const m of row.matchAll(REF)) {
      const [, file, spec] = m;
      const abs = join(ROOT, 'server', 'test', file);
      if (!existsSync(abs)) { problems.push(`§0.2 引用了不存在的守卫文件：${file}`); continue; }
      const src = read(abs);
      checked.add(file);
      for (const id of spec.matchAll(ID)) {
        const name = id[0];
        // test 名形如 `test('S1 各台…` / `test('[E1] 模块加载…` —— 允许方括号前缀
        if (!new RegExp(`test\\(\\s*['"\`]\\[?${name}\\b`).test(src)) {
          problems.push(`§0.2 写「${file}::${spec.trim()}」，但该文件里没有断言号 ${name}（文档写过时 / 写超前）`);
        }
      }
    }
  }
  assert.ok(checked.size >= 15, `§0.2 只校验到 ${checked.size} 个守卫文件（基线 15）：解析或表结构异常`);
  assert.deepEqual(problems, [], `§0.2 规则 → 守卫 → 状态 总索引与实现不符：\n${problems.join('\n')}`);
});

// ── S10/S11（2026-09-15 批次 47-A）：README 侧的同一盲区 ──────────────────────────
// 来源（支书第 4 项复核 + 本批实测）：批 43 为「分页」建了真机普查守卫 `page-sweep.test.mjs`，
//   **但它至今没进 README 的守卫清单**——守卫存在、却没人看得见（等于半个没做）。
//   根因：S1–S9 把 tab 数 / 名称 / 分组轴 / 旧界面名 / 数据五数 / 页面数 / 单一源路径 / 废止域
//   都变成了常驻断言，**唯独「守卫本身有没有被登记」无人管**——新守卫可以悄悄缺席。
// 另实测：README 的守卫条目写「`version-stamp`（版本戳同值，S1–S3 + D1–D6）」，而该文件实际已到
//   S1–S6 + D1–D9（批次 46① 新增）——**断言号没有守卫，只能靠人记得同步**（与 S9 对 §0.2 的病灶同源）。
// 口径：§0.2 是「规则 → 守卫」的权威索引，README 是「守卫对人类可见」的清单 →
//   断言 §0.2 引用的每个守卫文件都必须在 README 出现，且 README 写的断言号必须真实存在。

test('S10 §0.2 引用的守卫必须登记进 README 测试清单（防「守卫悄悄缺席」）', () => {
  const refs = new Set([...read(CHECKLIST).matchAll(/`([\w.-]+\.test\.(?:mjs|js))::/g)].map((m) => m[1]));
  assert.ok(refs.size >= 15, `§0.2 只解析到 ${refs.size} 个守卫文件（基线 15）：解析或表结构异常`);
  // 只在「### 测试」小节内认登记——README 别处（如测试节奏的命令示例）顺带提及不算「登记」（否则断言被偶然提及污染）
  const lines = read(README).split(/\r?\n/);
  const start = lines.findIndex((l) => /^###\s*测试/.test(l));
  assert.ok(start >= 0, 'README 未找到「### 测试」小节（守卫清单的登记处）');
  const nextHead = lines.findIndex((l, i) => i > start && /^#{1,3}\s/.test(l));
  const section = lines.slice(start, nextHead < 0 ? lines.length : nextHead).join('\n');
  const listed = new Set([...section.matchAll(/\b([\w.-]+\.test\.(?:mjs|js))\b/g)].map((m) => m[1]));
  const missing = [...refs].filter((f) => !listed.has(f)).sort();
  assert.deepEqual(missing, [],
    `§0.2 索引引用的守卫未登记进 README 测试清单（守卫存在但无人可见；批 43 的 page-sweep 即长期缺席）：\n  ${missing.join('\n  ')}`);
});

test('S11 README 里的守卫断言号必须真实存在（口径同 S9，覆盖 README）', () => {
  const problems = [];
  const checked = new Set();
  for (const m of read(README).matchAll(/`([\w.-]+\.test\.(?:mjs|js))`([^`\n]{0,200})/g)) {
    const [, file, tail] = m;
    const abs = join(ROOT, 'server', 'test', file);
    if (!existsSync(abs)) { problems.push(`README 引用了不存在的守卫文件：${file}`); continue; }
    checked.add(file);
    const body = read(abs);
    for (const id of tail.matchAll(/\b([SDNPMECL]\d+)\b/g)) {
      const re = new RegExp("test\\(\\s*['\"`]\\[?" + id[1] + '\\b');
      if (!re.test(body)) {
        problems.push(`README 写「${file}${tail.slice(0, 30).trim()}…」，但该文件里没有断言号 ${id[1]}`);
      }
    }
  }
  assert.ok(checked.size >= 8, `README 只校验到 ${checked.size} 个守卫引用（基线 8）：守卫清单被删减，或条目未用完整文件名（形如 xxx.test.mjs）`);
  assert.deepEqual(problems, [], `README 守卫引用与实现不符：\n${problems.join('\n')}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// S12（2026-09-15 批次 47-H，Q-23-41 支书裁定「立纪律 + 加守卫」）：**授权声明必须可核验**。
//
// 来源：支书抽样「辅助小字」时撞见一条「开学第 1 周·逐人归集…」提醒（**随批4「域参数」批次一起进仓**），
//   而代码注释里写着「支书 2026-09-09 批」——**那句注释是 AI 自己写的，全仓找不到支书就该具体功能
//   的问答记录**。支书原话：「我为什么会批准这些信息…这完全是滑稽！」
//   病根：把「批次整体通过」当成「逐项通过」，并在注释里**伪造授权凭证**。
//
// 判据（**收窄到「支书作为批准者的断言」**）：
//   · 计入：`支书 批 / 裁定 / 同意 / 批准 / 拍板`（如「支书裁定：宽表默认」）
//   · 不计入（业务语汇，非授权声明）：应用自身的状态机 / 界面文案，如「报支书确认」「支书确认才生效」
//     「待支书确认」「支书确认/退回」——前者全站 370 条命中里绝大多数是这一类，故**必须收窄**
//     （收窄后 229 条命中 / 16 条无日期；再修掉本批新写的 3 条 → 基线 13 条）。
//
// 断言：**每条授权声明的同一行必须带可核验日期（YYYY-MM-DD）**。
//   ⚠ 如实标注：**日期是否真能指到问答记录，机器查不了**——本条只堵住「连日期都没有」这一半；
//     另一半（日期是否造假）只能靠支书复核。不假装守卫覆盖了整句纪律。
//   基线是**迁移台账**（已确认待补证，**不是正当例外**）：只许下调，某文件修好一条即须下调该文件基线
//   （僵尸化同样红灯）；新出现的无日期授权声明即刻红灯。
//
// ✅ **迁移台账已清空（2026-09-16 批次 47-J，Q-23-42 闭环）**：原 13 条（12 文件）**逐条回查到真实日期并写进同一行**——
//   回查源＝`.ctx/REVIEW_QUEUE.md` 的批次台账与 Q-xx 裁定记录、`.ctx/logs/2026-08|09-EXECUTION_LOG.md` 的批次条目号，
//   另有同文件内已带日期的同源注释与 `content/` 契约文档（如 `WORKFLOW_BLOCK_CONTRACT.md §〇`）双向印证。
//   落库日期：宽表默认 2026-09-14（批次 35）· S1/R1-3 2026-09-06（附录⑩ A 批）· S4/R4-x 2026-09-06（C 批）·
//   S6/R6-3 2026-09-06 · 禁用 SVG 图标 2026-08-10（T-203/204/205）· issues 措辞 2026-08-10（T-204）·
//   工作台配置定位 2026-09-03（T-026③）· v1.1 §〇 块差异化 2026-09-03 · 卡片去留/合并批 2026-09-10（追加批次②）。
//   **台账现为空数组＝零容忍**：此后任何一条无日期授权声明都会直接红灯。
//   ⚠ 回查中另发现两处**与本次无关的历史瑕疵**，据实登记不擅改（见 REVIEW_QUEUE Q-23-42 注）：
//     ① `work-overview.js` 注释里的「P-011 知情边界」编号有误（知情边界实为 P-015／原则 9；P-011 已于 2026-08-09 并入 P-010 弃用）；
//     ② 本守卫原批注把 `disc/attendance-tab.js` 第 2 条判为「界面文案误判」，实测该行后半「应到计算规则」是**真授权**（R1-3）。
// ─────────────────────────────────────────────────────────────────────────────
const AUTH_CLAIM_PAT = /支书\s*(批|裁定|同意|批准|拍板)/;
const AUTH_CLAIM_UNDATED_BASELINE = [];

test('S12 授权声明必须同行带可核验日期（防「注释伪造支书批」——Q-23-41）', () => {
  const files = [];
  const collect = (dir) => {
    for (const n of readdirSync(dir)) {
      if (n === 'node_modules' || n === '.browsers' || n === '.tmp' || n === '.git') continue;
      const f = join(dir, n);
      if (statSync(f).isDirectory()) collect(f);
      else if (/\.(js|mjs)$/.test(n) && !/\.test\.(mjs|js)$/.test(n)) files.push(f);
    }
  };
  collect(SRC);
  collect(join(ROOT, 'server'));
  assert.ok(files.length >= 200, `只收集到 ${files.length} 个源文件（基线 200）：扫描范围异常，断言可能恒真`);

  const counts = new Map();
  for (const f of files) {
    for (const line of read(f).split(/\r?\n/)) {
      if (!AUTH_CLAIM_PAT.test(line)) continue;
      if (/\d{4}-\d{2}-\d{2}/.test(line)) continue;
      const rel = relative(ROOT, f).replace(/\\/g, '/');
      counts.set(rel, (counts.get(rel) || 0) + 1);
    }
  }

  const base = new Map(AUTH_CLAIM_UNDATED_BASELINE.map((b) => [b.file, b.undated]));
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const baseTotal = [...base.values()].reduce((a, b) => a + b, 0);

  // ① 总量不得上涨
  assert.ok(total <= baseTotal,
    `无日期授权声明从基线 ${baseTotal} 条涨到 ${total} 条——**新写的授权声明必须同行带日期（YYYY-MM-DD）**；` +
    `若确实无法给日期，就不要写成「支书批/裁定」，改写成「AI 推测」或删除该断言。`);

  // ② 逐文件不得高于基线（能指到是哪个文件新增的）
  const grown = [...counts].filter(([f, n]) => n > (base.get(f) || 0))
    .map(([f, n]) => `${f}：基线 ${base.get(f) || 0} → 实测 ${n}`);
  assert.deepEqual(grown, [], `以下文件新增了「无日期的授权声明」：\n  ${grown.join('\n  ')}`);

  // ③ 迁移台账防僵尸：已修好但基线未下调 → 红灯（强制台账随修随减）
  const stale = [...base].filter(([f, n]) => (counts.get(f) || 0) < n)
    .map(([f, n]) => `${f}：基线 ${n} → 实测 ${counts.get(f) || 0}`);
  assert.deepEqual(stale, [],
    `S12 迁移台账僵尸：以下文件已补上日期/已改写，但基线没下调——请下调 AUTH_CLAIM_UNDATED_BASELINE：\n  ${stale.join('\n  ')}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// S13（2026-09-17 批次 60，支书裁定「改为派生 + 守卫比对」）：**TIMESTAMPS 表行日期必须等于该文件
//   frontmatter 的 `last_updated`——漂移即红灯**。
//
// 来源（支书 2026-09-17 已裁 · 逐字）：「**改为派生 + 守卫比对**」——`.ctx/TIMESTAMPS.md` 的登记行
//   日期不再靠人记得同步，而是**以文件 frontmatter 为派生源**：一致即绿、漂移即红。
// 病灶（批次 59 实测）：242 条登记行里 **39 行**「表行 ≠ frontmatter」；另有 144 行因「工作树 dirty
//   且在库无改动日记载」无法确证——`TIMESTAMPS.md` 更新规则第 1 条要求「本表随文件修改同步更新」，
//   而**没有任何机制保证它真的发生**。本守卫即那个机制的一半（另一半＝`CLAUDE.md R-83` 提交后必刷）。
//
// 判据（**精确到日，不许「差不多」「只比年-月」**）：
//   · 计入比对：登记行指向**真实存在的文件**、且该文件**有 frontmatter 且含 `last_updated`**；
//     表行日期必须**逐字等于** frontmatter 的 `last_updated`（`YYYY-MM-DD`）。
//   · 跳过（裁定认可的「只人工维护」的三块，**不报红**）：① 文件不存在 / 已删除（属「已删除文件记录」
//     块）；② **无 frontmatter** 的文件（`.js` / `.html` / `.css` / `.json` 类）；③ 通配登记行（`*`）
//     与目录行。
//   · **白名单（`TIMESTAMPS_SKIP_WHITELIST`，仅 2 条，逐条给理由）**：文件**有 frontmatter 但无
//     `last_updated` 字段**者——不静默放过（无字段即红灯），只有进白名单的才跳过：
//       ① `.ctx/snapshots/SNAPSHOT_v3_20260502.md`——快照件用 `date` / `archived_at` 表达时点，
//          无 `last_updated`；属历史归档件，本批不改（补字段＝改历史件体例）。
//       ② `.ctx/logs/archive/2026-05-early-EXECUTION_LOG.md`——归档件用 `archived_from` /
//          `archived_date` 表达时点，无 `last_updated`；同上属历史归档件，不改。
//     ⚠ **白名单不能更宽**：这三块之外任何一条「跳过」都必须是**机制性**的（文件不存在 / 无 frontmatter /
//       目录 / 通配），而不是「这条对不上就不比」——后者＝把守卫写松。新增白名单须逐条写明理由。
//
// ⚠ 边界（不假装覆盖）：本守卫只核「表行 ↔ frontmatter」这一对；**frontmatter 自身是否滞后于
//   该文件最后一次提交**（批次 59 列出 16 行）由 `R-83` 的「提交后必刷」纪律管，本守卫不越界
//   （表行仍以 frontmatter 为准，故这类会让表行跟着 frontmatter 一起滞后——本批已单列供复核）。
const TIMESTAMPS = join(ROOT, '.ctx', 'TIMESTAMPS.md');
/** 允许「表行 ↔ frontmatter」不比的登记行（本批 2 条：有 frontmatter 但无 `last_updated` 字段的历史归档件） */
const TIMESTAMPS_SKIP_WHITELIST = [
  '.ctx/snapshots/SNAPSHOT_v3_20260502.md', // 快照件用 date / archived_at 表达时点，无 last_updated 字段
  '.ctx/logs/archive/2026-05-early-EXECUTION_LOG.md', // 归档件用 archived_date 表达时点，无 last_updated 字段
];

test('S13 TIMESTAMPS 表行日期必须等于文件 frontmatter 的 last_updated（漂移即红灯）', () => {
  const rows = [];
  for (const line of read(TIMESTAMPS).split(/\r?\n/)) {
    if (!line.startsWith('|')) continue;
    const c = line.split('|').map((s) => s.trim());
    // 5 列表行＝['', 文件路径, last_updated, 移入归档日, 角色, 备注, '']（2026-09-17 批次 61 加列后）；
    //   「周期性任务最后执行时间」表虽同为 5 列，但 c[2] 是任务名（非日期）⇒ 自然排除；「已删除文件记录」表 3 列（c.length 5）亦排除
    if (c.length !== 7 || !/^\d{4}-\d{2}-\d{2}/.test(c[2]) || c[1] === '文件路径') continue;
    rows.push({ path: c[1], date: c[2].slice(0, 10) });
  }
  assert.ok(rows.length >= 200, `TIMESTAMPS 只解析到 ${rows.length} 条 5 列登记行（基线 200：2026-09-17 批次 61 实测 236 条，加列只是插入一列、行数不变）：解析或表结构异常，断言可能恒真`);

  const problems = [];
  let compared = 0;
  for (const r of rows) {
    if (TIMESTAMPS_SKIP_WHITELIST.includes(r.path)) continue;
    const abs = join(ROOT, r.path);
    if (!existsSync(abs) || statSync(abs).isDirectory()) continue; // 已删除 / 通配 / 目录行：属人工维护块
    let src;
    try { src = read(abs); } catch { continue; } // 读不了的（二进制等）：不计入
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(src)?.[1];
    if (!fm) continue; // 无 frontmatter：属人工维护块
    const fmd = /^last_updated:[ \t]*["']?(\d{4}-\d{2}-\d{2})/m.exec(fm)?.[1];
    if (!fmd) { // 有 frontmatter 却无 last_updated 字段 ⇒ 红灯（除非已进白名单）
      problems.push(`${r.path}：该文件有 frontmatter 但无 last_updated 字段——须补字段，或按理由进 TIMESTAMPS_SKIP_WHITELIST`);
      continue;
    }
    compared++;
    if (r.date === fmd) continue;
    const days = Math.round((Date.parse(r.date) - Date.parse(fmd)) / 86400000);
    problems.push(`${r.path}：表行写 ${r.date}，frontmatter 写 ${fmd}（差 ${days > 0 ? '+' : ''}${days} 天）`);
  }
  // 非空转基线（2026-09-17 批次 61 实测：236 条 5 列行 = 比对 60 + 无 frontmatter 159 + 已删除/通配 12
  //   + 目录 3 + 白名单 2；表结构由 4 列改 5 列只是**插入一列**，登记行总数与各档计数均不变）；掉到基线以下＝口径被写松（大量行被静默跳过）
  //   ⚠ 新增的「移入归档日」列**不参与**「表行 ↔ frontmatter」比对（它无 frontmatter 对应物）
  assert.ok(compared >= 60,
    `S13 只比对到 ${compared} 行（基线 60）：口径被写松了——大量行被静默跳过，请检查跳过条件`);
  assert.deepEqual(problems, [],
    `TIMESTAMPS.md 表行与文件 frontmatter 漂移（口径：**以 frontmatter 为准**，把表行日期改成 frontmatter 的值）：\n  ${problems.join('\n  ')}`);
});
