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
//   S14 可数事实对账（枚举 / 计数类数字，文档声称值 == 代码实然值）＋ S15 弱清单（2026-09-23 批次 161）
//   S16 守卫注册完整性：S 类测试文件必须全数列入 `test:daily`（防守卫孤儿化；2026-09-28 批次 243）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = join(ROOT, 'docs', 'src');
const CAP = join(SRC, 'capabilities');
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
  const resSrc = read(join(ROOT, 'server', 'routes', 'resources', 'store.js'));
  const daSrc = read(join(SRC, 'data', 'data-adapter.js'));
  const domSrc = read(join(SRC, 'core', 'domain', 'domain.js'));

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
//   S1–S6 + D1–D9——**断言号当时没有守卫，只能靠人记得同步**（与 S9 对 §0.2 的病灶同源）。
//   ⚠ **该病灶已闭环**：S11 是常驻断言（README 写的断言号必须真实存在）；现 `version-stamp` 已到
//   `S1–S7 + D1–D11`（批次 236 加发版一致性 `S7` 与发版纯函数 `D10–D11`），README 与 §0.2 同批改准。
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
// S13（2026-09-17 批次 60，支书裁定「改为派生 + 守卫比对」；2026-09-26 批次 204 规模判据改**推导式**）：
//   **TIMESTAMPS 表行日期必须等于该文件 frontmatter 的 `last_updated`——漂移即红灯**。
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
//   · 跳过：**每一档都必须给出机制性理由**（见下），跳过**不许静默扩大**：
//       ① **白名单**（`TIMESTAMPS_SKIP_WHITELIST`，仅 2 条）：有 frontmatter 但无 `last_updated` 字段的
//          历史归档件，逐条写明理由（见常量）；
//       ② **已删除**（文件不存在）：该行**备注必须能读出「删除抄录」**（含 `🗑️` 且含「已删除 / 已合并 /
//          迁移 / 并入」等字样）——「登记项消失」必须可解释（墓碑台账：文件已删 ＋ 删于哪一批）；
//       ③ **无 frontmatter**：`.md` / `.markdown`（文档类）者**不得靠扩展名混过**，须逐条登记进
//          `TIMESTAMPS_NO_FM_MD_OK`（本批实读 7 条）；其余类按**扩展名白名单**（`TIMESTAMPS_NO_FM_EXT_OK`）
//          机械跳过（代码 / 样式 / 数据 / 资源类不带 YAML 属常态）；
//       ④ **目录行 / 通配行（`*`）**：机制性跳过。
//     ⚠ **白名单与两份名单都不能更宽**：新增须逐条写明理由（各带上限）。
//
// ★ 规模判据＝**推导式恒等式**（2026-09-26 批次 204 起；取代 2026-09-24~26 那串手改字面量）：
//   **已比对 ＋ 各档已跳过 ＝ 登记总数**——每一行都必须落进某一档，「登记项」不会凭空空消失；
//   某档变大时必须满足该档自己的理由约束（已删除要墓碑、无头 `.md` 要逐条登记）。
//   **故不再需要「每合并一批就手改一个整数」**——历史值串 `60 → 58 → 55 → 54 → 51` 的「五次下调」
//   即该设计债的实证（每次都是「删了几份带 frontmatter 的 `.md` ⇒ 可比对数下降 ⇒ 手改一个整数」），
//   留此一句供审计；**新形态不再出现该动作**。
//
// ⚠ 边界（不假装覆盖）：本守卫只核「表行 ↔ frontmatter」这一对；**frontmatter 自身是否滞后于
//   该文件最后一次提交**由 `server/test/frontmatter-freshness.test.mjs`（`R-83` 的机检件）核，本守卫不越界。
const TIMESTAMPS = join(ROOT, '.ctx', 'TIMESTAMPS.md');
/** 白名单：**有 frontmatter 但无 `last_updated` 字段**的历史归档件（不静默放过；新增须逐条给理由，上限 2） */
const TIMESTAMPS_SKIP_WHITELIST = [
  '.ctx/snapshots/SNAPSHOT_v3_20260502.md', // 快照件用 date / archived_at 表达时点，无 last_updated 字段
  '.ctx/logs/archive/2026-05-early-EXECUTION_LOG.md', // 归档件用 archived_date 表达时点，无 last_updated 字段
];
/** **无 frontmatter 的 markdown 登记行**：不能靠扩展名混过（`.md` 与「代码 / 样式」不同），须逐条登记理由（上限 12） */
const TIMESTAMPS_NO_FM_MD_OK = [
  'README.md',                                        // 仓库门面：纯 Markdown 入口，按全仓惯例不带 YAML 头
  'README-members.md',                                // 成员版说明：同上
  'README-server.md',                                 // 后端对接说明：同上
  'server/README.md',                                 // 后端子目录说明：同上
  '.ctx/ACTIVE_RULINGS.md',                           // 审计台账（`.ctx` 底座）：按 `.ctx` 体例不带 YAML 头
  '.ctx/logs/DECISION_LOG.md',                        // 决策日志月度索引：日志件、非文档
  '.ctx/logs/archive/2026-05-DECISION_LOG.md',        // 归档决策日志：同上
];
/** 无 frontmatter 时可按**扩展名**机械跳过的非文档类文件（代码 / 样式 / 数据 / 资源；无扩展名串为空） */
const TIMESTAMPS_NO_FM_EXT_OK = new Set([
  '.js', '.mjs', '.cjs', '.html', '.css', '.json', '.txt', '.yml', '.yaml',
  '.ps1', '.example', '.gitignore', '.png', '.jpg', '.svg', '.ico', '.woff2', '.csv', '',
]);

test('S13 TIMESTAMPS 表行日期必须等于文件 frontmatter 的 last_updated（漂移即红灯）', () => {
  const rows = [];
  for (const line of read(TIMESTAMPS).split(/\r?\n/)) {
    if (!line.startsWith('|')) continue;
    const c = line.split('|').map((s) => s.trim());
    // 5 列表行＝['', 文件路径, last_updated, 移入归档日, 角色, 备注, '']（2026-09-17 批次 61 加列后）；
    //   「周期性任务最后执行时间」表虽同为 5 列，但 c[2] 是任务名（非日期）⇒ 自然排除；「已删除文件记录」表 3 列（c.length 5）亦排除
    if (c.length !== 7 || !/^\d{4}-\d{2}-\d{2}/.test(c[2]) || c[1] === '文件路径') continue;
    rows.push({ path: c[1], date: c[2].slice(0, 10), note: c[5] });
  }
  // ① 解析非空转（**登记面规模**；注意这不是 2026-09-24~26 那个被反复下调的「可比对数」字面量）
  assert.ok(rows.length >= 200, `TIMESTAMPS 只解析到 ${rows.length} 条 5 列登记行（基线 200：2026-09-17 批次 61 实测 236 条，加列只是插入一列、行数不变）：解析或表结构异常，断言可能恒真`);

  const problems = [];
  const compared = [];   // 逐行「表行 ↔ frontmatter」逐字相等者
  const skips = new Map(); // 档名 → 行[]（每行恰好落一档；见下方恒等式）
  const add = (k, r) => { if (!skips.has(k)) skips.set(k, []); skips.get(k).push(r); };

  for (const r of rows) {
    if (TIMESTAMPS_SKIP_WHITELIST.includes(r.path)) { add('白名单（有 frontmatter 无 last_updated 的历史归档件）', r); continue; }
    if (r.path.includes('*')) { add('通配登记行', r); continue; }
    const abs = join(ROOT, r.path);
    if (!existsSync(abs)) {
      // ② 已删除：必须有「墓碑抄录」——否则「登记项消失」不可解释（使「跳过」不能静默扩大）
      if (!(r.note.includes('🗑️') && /已删除|已合并|迁移|并入|拆分|拆为|改名/.test(r.note))) {
        problems.push(`${r.path}：登记行指向的文件不存在，且备注里读不到删除抄录（须含 🗑️ 与「已删除 / 已合并 / 迁移 / 并入」等字样）——「登记项消失」必须可解释`);
      }
      add('已删除（文件不存在；须有墓碑抄录）', r); continue;
    }
    if (statSync(abs).isDirectory()) { add('目录行', r); continue; }
    let src;
    try { src = read(abs); } catch { problems.push(`${r.path}：登记行存在但文件读不出——须核实`); add('读不出（须核实）', r); continue; }
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(src)?.[1];
    if (!fm) {
      // ③ 无 frontmatter：**文档类（.md）不得靠扩展名混过**（须逐条登记），其余类按扩展名白名单机械跳过
      if (/\.(md|markdown)$/i.test(r.path)) {
        if (!TIMESTAMPS_NO_FM_MD_OK.includes(r.path)) {
          problems.push(`${r.path}：markdown 类文件无 frontmatter，且未登记进 TIMESTAMPS_NO_FM_MD_OK——新增此类须逐条给理由`);
        }
        add('无 frontmatter 的 markdown（须逐条登记理由）', r);
      } else {
        const ext = (/\.([a-z0-9]+)$/i.exec(r.path)?.[0] || '').toLowerCase();
        if (!TIMESTAMPS_NO_FM_EXT_OK.has(ext)) {
          problems.push(`${r.path}：无 frontmatter 且扩展名「${ext || '(无)'}」不在允许清单——跳过理由不明`);
        }
        add('无 frontmatter 的非文档文件（按扩展名机械跳过）', r);
      }
      continue;
    }
    const fmd = /^last_updated:[ \t]*["']?(\d{4}-\d{2}-\d{2})/m.exec(fm)?.[1];
    if (!fmd) { // 有 frontmatter 却无 last_updated 字段 ⇒ 红灯（除非已进白名单）
      problems.push(`${r.path}：该文件有 frontmatter 但无 last_updated 字段——须补字段，或按理由进 TIMESTAMPS_SKIP_WHITELIST`);
      add('有 frontmatter 无 last_updated（须补字段）', r); continue;
    }
    compared.push(r);
    if (r.date === fmd) continue;
    const days = Math.round((Date.parse(r.date) - Date.parse(fmd)) / 86400000);
    problems.push(`${r.path}：表行写 ${r.date}，frontmatter 写 ${fmd}（差 ${days > 0 ? '+' : ''}${days} 天）`);
  }

  // ★ 规模判据＝**推导式恒等式**（2026-09-26 批次 204 起，取代 2026-09-24~26 那串手改字面量）：
  //   **已比对 ＋ 各档已跳过 ＝ 登记总数** —— 每一行都必须落进某一档（未分类 ⇒ 本式不成立 ⇒ 红灯）。
  //   某档变大时，其**档内理由约束**（已删除要墓碑 / 无头 `.md` 要登记）会替人说话 ⇒ 不再需要手改整数。
  const skipTotal = [...skips.values()].reduce((a, b) => a + b.length, 0);
  assert.equal(compared.length + skipTotal, rows.length,
    `S13 规模恒等式不成立：已比对 ${compared.length} ＋ 已跳过 ${skipTotal} ≠ 登记总数 ${rows.length}（有登记行未落进任何一档）`);

  // 两份名单：不得僵尸化（改好后须撤下），也不得悄悄变宽
  const zombieWl = TIMESTAMPS_SKIP_WHITELIST.filter((p) => !rows.some((r) => r.path === p));
  assert.deepEqual(zombieWl, [], `TIMESTAMPS_SKIP_WHITELIST 里有已不在登记面的路径（僵尸白名单，请删除）：\n  ${zombieWl.join('\n  ')}`);
  assert.ok(TIMESTAMPS_SKIP_WHITELIST.length <= 2,
    `TIMESTAMPS_SKIP_WHITELIST 涨到 ${TIMESTAMPS_SKIP_WHITELIST.length} 条（上限 2）：白名单只许逐条给理由、不许悄悄变宽`);
  const zombieMd = TIMESTAMPS_NO_FM_MD_OK.filter((p) => !rows.some((r) => r.path === p));
  assert.deepEqual(zombieMd, [], `TIMESTAMPS_NO_FM_MD_OK 里有已不在登记面的路径（僵尸名单，请删除）：\n  ${zombieMd.join('\n  ')}`);
  assert.ok(TIMESTAMPS_NO_FM_MD_OK.length <= 12,
    `无 frontmatter 的 markdown 登记行名单涨到 ${TIMESTAMPS_NO_FM_MD_OK.length} 条（上限 12）：新增此类须逐条给理由`);

  assert.deepEqual(problems, [],
    `TIMESTAMPS.md 表行与文件 frontmatter 漂移（口径：**以 frontmatter 为准**，把表行日期改成 frontmatter 的值）：\n  ${problems.join('\n  ')}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// S14 / S15（2026-09-23 批次 161）：**可数事实对账**——把文档里出现的「确定数字」与
//   代码 / 数据的实然值逐条对账。
//
// 来源（批次 160 登记的病根）：「拟上会」清单类数**跨两批没被任何人发现**——`ACTIVE_RULINGS`
//   与队列写「四类」、系统与帮助页是「六类」。病根：那张表的自述判据只有「每行必带 `D-xxx`」
//   「不得出现决策日志里没有的口径」两条，**「枚举 / 计数类数字」没有任何守卫看着**
//   ⇒ 它能在两批之间悄悄漂掉。支书第 4 条：「这样的上下文污染一定还存在！！请一定要还
//   仓库文档天朗气清的上下文环境！」⇒ 本守卫补这一类：**加一道防线，让枚举类数字不再悄悄漂**。
//
// 取数原则（批次 160 的教训：同一件事换条正则能数出 4 与 6 两个值）：
//   · **权威值**一律从代码 / 数据取——能 import 的就 import（取运行时真值）；不能 import 的
//     按**锚定到具体函数体 / 小节 / 表块**取，**不做全文撒网**；
//   · **文档声称值**一律从**锚定行**取（标题行 / 指名行 / 表行），一处一句，不做模糊匹配；
//   · 分两档：**硬判据**（能自动取得权威值 ＋ 能从文本可靠抽出该数）⇒ 直接断言相等；
//     **弱清单**（取值定义不清、或有正当沿革）⇒ 只登记不判红，但登记也带基线（防
//     「正则失效 ⇒ 一条都解析不到 ⇒ 断言恒真」，也防口径成批变松）。
//
// ⚠ 边界（不假装覆盖）：只核「文档明写了一个数 ↔ 代码实然」这一对；**文档没写数、只列几项**
//   的地方（角色键列举式说明等）不判——那一半只能靠人读。
// ─────────────────────────────────────────────────────────────────────────────
const DECISION_LOG = join(ROOT, '.ctx', 'logs', '2026-09-DECISION_LOG.md');
const MONTH_INDEX = join(ROOT, '.ctx', 'logs', 'DECISION_LOG.md');
const RULINGS = join(ROOT, '.ctx', 'ACTIVE_RULINGS.md');
const QUEUE = join(ROOT, '.ctx', 'REVIEW_QUEUE.md');
const README_SERVER = join(ROOT, 'README-server.md');
const AGENDA_FORM = join(SRC, 'entries', 'tabs', 'secretary', 'agenda-form.js');
// 2026-09-28（G2 残余）：独立页入口已按判据分入 entries/pages/（settings 属独立页）
const SETTINGS_ENTRY = join(SRC, 'entries', 'pages', 'settings-entry.js');
// 2026-09-28 批次 234：资源路由按内聚切分为 `server/routes/resources/` 目录 ——
// 通用 CRUD 声明循环在 index.js（装配），资源名映射在 store.js（表访问原语）。
const RESOURCES_ROUTE = join(ROOT, 'server', 'routes', 'resources', 'index.js');
const RESOURCES_STORE = join(ROOT, 'server', 'routes', 'resources', 'store.js');

/** 取「第一条命中锚点」的那一行；取不到给空串 */
const lineWith = (text, re) => text.split(/\r?\n/).find((l) => re.test(l)) || '';

/** 取某小节（标题行 → 下一个同级 / 更高级标题之前） */
function section(text, re) {
  const lines = text.split(/\r?\n/);
  const s = lines.findIndex((l) => re.test(l));
  if (s < 0) return '';
  const e = lines.findIndex((l, i) => i > s && /^#{1,4} /.test(l));
  return lines.slice(s, e < 0 ? lines.length : e).join('\n');
}

/** 只取一个捕获组（不转数字——中文数字交给 cn 转） */
const m = (line, re, g = 1) => { const x = re.exec(line); return x ? x[g] : null; };

/** 「N」→ 数字（阿拉伯数字直取；中文数字一~十 / 十一~十九） */
function cn(v) {
  if (v === null || v === undefined) return null;
  if (/^\d+$/.test(v)) return Number(v);
  const t = /^十([一二三四五六七八九])$/.exec(v);
  if (t) return 10 + CN_NUM[t[1]];
  return CN_NUM[v] ?? null;
}
const CN_NUM = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

/** 从「（…· …· …）」式列举里数项数（分隔符＝` · `；取该行第一对全角括号） */
function enumCount(line) {
  const a = line.indexOf('（');
  const b = line.indexOf('）', a + 1);
  if (a < 0 || b < 0) return null;
  return line.slice(a + 1, b).split(' · ').filter((s) => s.trim()).length;
}

test('S14 可数事实对账：文档里的「枚举 / 计数」必须等于代码 / 数据的实然值', async () => {
  const problems = [];
  const { WORK_MAP_MODULES } = await import('../../docs/src/core/domain/work-map.js?v=20261001k');
  const { sopDatabase } = await import('../../docs/src/workflow/sopData.js?v=20261001k');
  const { ROLE_KEYS, ROLE_LEGACY_KEYS } = await import('../../docs/src/core/domain/constants.js?v=20261001k');
  const { SYSTEM_NOTICE_KIND_NAMES } = await import('../system-notice-kinds.js');

  /** 对账一条：`got` 为文档里抽出的数（null＝抽不出，判红并提示是判据失效而非「文档错」） */
  const eq = (fact, where, got, real, hint = '') => {
    if (got === null) {
      problems.push(`【${fact}】${where}：数**抽不出来**（锚点或写法变了）——请按实况改准该处写法，或改准判据`);
      return;
    }
    if (got !== real) problems.push(`【${fact}】${where} 写 ${got}，实然 ${real}${hint ? `（${hint}）` : ''}`);
  };
  // 支部分工模块数**第 4 读**的锚点＝母本 `BRANCH_WORK_MAP.md`（2026-10-01 批次 314 改锚，理由见下方 `eq`）
  const bwm = read(join(ROOT, 'content', '04_web_design', 'evolution', 'BRANCH_WORK_MAP.md'));
  const rs = read(README_SERVER);
  const help = read(HELP);
  const snap = read(SNAPSHOT);

  // ① 支部分工模块数（权威＝`work-map.js` 的 WORK_MAP_MODULES 长度）
  const modReal = WORK_MAP_MODULES.length;
  const s35 = section(rs, /^### 3\.5 /);
  eq('支部分工模块数', 'README-server.md §3.5 标题「共 N 个」', cn(m(lineWith(s35, /^### 3\.5 /), /共\s*([\d一二两三四五六七八九十]+)\s*个/)), modReal);
  eq('支部分工模块数', 'README-server.md §3.5 正文「下列 N 个模块 id」', cn(m(lineWith(s35, /^> 后端若要写支部配置/), /只能是下列\s*([\d一二两三四五六七八九十]+)\s*个/)), modReal);
  eq('支部分工模块数', 'README-server.md §3.5 表体行数', (s35.match(/^\| \d+ \| `/gm) || []).length, modReal);
  // ⚠ 2026-10-01 批次 314：原锚点为 `CLAUDE.md` 的 `R-58` 行；`R-58` 已按 `H50.1 §3`「完成即从乙部删去」**整行删除**
  //   （支书令「乙部已完成/闭环 应该清除掉！保证上下文干净！」）。**改判据不改制度**——锚点**上移到母本**
  //   `BRANCH_WORK_MAP.md` 的「模块数现为 N 项」（该处是**模块数现状的唯一声明点**，比原锚点＝派生物更可靠）。
  eq('支部分工模块数', 'BRANCH_WORK_MAP.md「模块数现为 N 项」', cn(m(lineWith(bwm, /模块数现为/), /模块数现为\s*(\d+)\s*项/)), modReal);

  // ② 内置 SOP 场景数（权威＝`sopData.js` 的 scenarios 长度）
  eq('内置 SOP 场景数', 'README-server.md §4.15「内置场景共 N 个」', cn(m(lineWith(rs, /\*\*内置场景共/), /内置场景共\s*([\d一二两三四五六七八九十]+)\s*个/)), sopDatabase.scenarios.length);

  // ③ 角色键数（权威＝`constants.js` 的 ROLE_KEYS / ROLE_LEGACY_KEYS）
  const bizReal = ROLE_KEYS.length;
  const legacyReal = ROLE_LEGACY_KEYS.length;
  const totalReal = bizReal + legacyReal;
  const s21 = section(rs, /^### 2\.1 /);
  const s21Head = lineWith(s21, /^### 2\.1 /);
  eq('角色键数（合计）', 'README-server.md §2.1 标题', cn(m(s21Head, /（(\d+) 键/)), totalReal);
  eq('角色键数（业务）', 'README-server.md §2.1 标题', cn(m(s21Head, /(\d+) 业务键/)), bizReal);
  eq('角色键数（遗留）', 'README-server.md §2.1 标题', cn(m(s21Head, /(\d+) 遗留键/)), legacyReal);
  eq('角色键数（合计）', 'README-server.md §2 导语「共 N 键」', cn(m(lineWith(rs, /本节分四层/), /共\s*([\d一二两三四五六七八九十]+)\s*键/)), totalReal);
  eq('角色键数（合计）', 'README-server.md §2.1 表体行数', (s21.match(/^\| \d+ \| `/gm) || []).length, totalReal);
  const srp = read(join(ROOT, 'content', '02_institution', 'SYSTEM_ROLE_PERMISSION.md'));
  const srp9a0 = lineWith(srp, /本表为角色键的权威清单/);
  eq('角色键数（合计）', 'SYSTEM_ROLE_PERMISSION §9a0', cn(m(srp9a0, /(\d+) 键全表/)), totalReal);
  eq('角色键数（业务）', 'SYSTEM_ROLE_PERMISSION §9a0', cn(m(srp9a0, /(\d+) 业务键/)), bizReal);
  eq('角色键数（遗留）', 'SYSTEM_ROLE_PERMISSION §9a0', cn(m(srp9a0, /(\d+) 遗留键/)), legacyReal);

  // ④ 「拟上会」清单类数（权威＝`agenda-form.js::buildAgendaCandidates` 里 group 的取值集）
  const afSrc = read(AGENDA_FORM);
  const afStart = afSrc.indexOf('export function buildAgendaCandidates');
  const afLinesFrom = afSrc.slice(afStart).split(/\r?\n/);
  let afDepth = 0, afEnd = afLinesFrom.length - 1;
  for (let i = 0; i < afLinesFrom.length; i++) {
    for (const ch of afLinesFrom[i]) { if (ch === '{') afDepth++; else if (ch === '}') afDepth--; }
    if (i > 0 && afDepth === 0) { afEnd = i; break; }
  }
  const afBody = afLinesFrom.slice(0, afEnd + 1).join('\n');
  const agendaGroups = new Set();
  for (const l of afBody.split(/\r?\n/)) {
    if (!/group:/.test(l)) continue;
    for (const g of l.matchAll(/'([A-Za-z]+)'/g)) agendaGroups.add(g[1]);
  }
  const agendaReal = agendaGroups.size;
  eq('「拟上会」清单类数', 'ACTIVE_RULINGS.md 的 `D-411` 行「共 N 类」', cn(m(lineWith(read(RULINGS), /^- .*一键导入议程/), /共\s*([\d一二两三四五六七八九十]+)\s*类/)), agendaReal,
    `系统 group 取值＝${[...agendaGroups].sort().join(' / ')}`);
  eq('「拟上会」清单类数', 'docs/help.html §3.1 括注列举', enumCount(lineWith(help, /「拟上会」清单<\/strong>里勾/)), agendaReal);
  eq('「拟上会」清单类数', 'REVIEW_QUEUE.md `SOP-B-33`「现为 N 类」', cn(m(lineWith(read(QUEUE), /^> \*\*已闭环\*\*：裁定 `D-552`/), /现为\s*([\d一二两三四五六七八九十]+)\s*类/)), agendaReal);

  // ⑤ ACTIVE_RULINGS 口径行数（权威＝该文件 `^- ` 实测；文首「权威读数」须与它一致）
  const ar = read(RULINGS);
  const arLines = ar.split(/\r?\n/).filter((l) => l.startsWith('- ')).length;
  const arHead = lineWith(ar, /\*\*口径行数（权威/);
  eq('ACTIVE_RULINGS 口径行数', '同文件文首「实有 N 行」', cn(m(arHead, /实有\s*([\d一二两三四五六七八九十]+)\s*行/)), arLines);
  eq('ACTIVE_RULINGS 口径行数', '同文件文首「一律以 N 为准」', cn(m(arHead, /一律以\s*([\d一二两三四五六七八九十]+)\s*为准/)), arLines);

  // ⑥ 决策日志条目数（权威＝`^## D-` 实测；文首 / 文末续编说明 / 本月目录 / 月度索引四处同源）
  const dl = read(DECISION_LOG);
  const dNums = [...dl.matchAll(/^## D-(\d+)/gm)].map((x) => Number(x[1]));
  const dReal = dNums.length;
  const dMax = Math.max(...dNums);
  const dlHead = lineWith(dl, /\*\*条目编号起止\*\*/);
  eq('决策日志条目数', '2026-09-DECISION_LOG 文首「共 N 条」', cn(m(dlHead, /本文件当前 \*\*`D-\d+` … `D-\d+`，共 (\d+) 条\*\*/)), dReal);
  eq('决策日志末条编号', '2026-09-DECISION_LOG 文首', cn(m(dlHead, /本文件当前 \*\*`D-\d+` … `D-(\d+)`/)), dMax);
  eq('决策日志下一条编号', '2026-09-DECISION_LOG 文首「下一条自」', cn(m(dlHead, /下一条自 \*\*`D-(\d+)`\*\*/)), dMax + 1);
  const dlCont = lineWith(dl, /\*\*本文件续编说明\*\*/);
  eq('决策日志条目数', '2026-09-DECISION_LOG 文末「续编说明」段', cn(m(dlCont, /当前止于 `D-\d+`\*\*（共 \*\*(\d+)\*\* 条/)), dReal);
  eq('决策日志末条编号', '2026-09-DECISION_LOG 文末「续编说明」段', cn(m(dlCont, /当前止于 `D-(\d+)`/)), dMax);
  const tocNums = [...section(dl, /^## 本月目录/).matchAll(/`D-(\d+)`/g)].map((x) => Number(x[1]));
  eq('决策日志末条编号', '2026-09-DECISION_LOG 本月目录末条', tocNums.length ? Math.max(...tocNums) : null, dMax);
  const miCells = lineWith(read(MONTH_INDEX), /^\| 2026-09 \|/).split('|').map((s) => s.trim());
  eq('决策日志条目数', '.ctx/logs/DECISION_LOG.md 月度索引', cn(m(miCells[3] || '', /^(\d+) 条（D-275~/)), dReal);
  eq('决策日志末条编号', '.ctx/logs/DECISION_LOG.md 月度索引', cn(m(miCells[3] || '', /D-275~D-(\d+)）$/)), dMax);

  // ⑦ 页面数（权威＝`docs/` 实况）
  const rootsN = readdirSync(join(ROOT, 'docs')).filter((f) => f.endsWith('.html')).length;
  const wsN = readdirSync(join(ROOT, 'docs', 'workspace')).filter((f) => f.endsWith('.html')).length;
  eq('页面数（合计）', 'README-server.md §3.1 标题「共 N 个静态页」', cn(m(lineWith(rs, /^### 3\.1 /), /共\s*([\d一二两三四五六七八九十]+)\s*个静态页/)), rootsN + wsN);
  const snapPages = lineWith(snap, /页面实测/);
  eq('页面数（合计）', 'SNAPSHOT.md「页面实测 N=根+工作台」', cn(m(snapPages, /页面实测 (\d+)=/)), rootsN + wsN);
  eq('根页数', 'SNAPSHOT.md', cn(m(snapPages, /=\s*(\d+) 根/)), rootsN);
  eq('工作台页数', 'SNAPSHOT.md', cn(m(snapPages, /\+(\d+) 工作台/)), wsN);

  // ⑧ 资源表数（权威＝`server/db.js` 的 RESOURCE_TABLES 长度）
  const dbTables = (read(join(ROOT, 'server', 'db.js')).match(/const RESOURCE_TABLES = \[([\s\S]*?)\]/)[1].match(/'/g) || []).length / 2;
  eq('资源表数', 'SNAPSHOT.md「资源表 N」', cn(m(lineWith(snap, /资源表 \d/), /资源表 (\d+)/)), dbTables);
  eq('资源表数', 'README-server.md §7.3#25「与代码一致为 N 张」', cn(m(lineWith(rs, /现与代码一致为/), /现与代码一致为 \*\*(\d+) 张\*\*/)), dbTables);

  // ⑨ 系统通知 kind 数（权威＝`server/system-notice-kinds.js` 的 KINDS 键集）
  const kindReal = SYSTEM_NOTICE_KIND_NAMES.length;
  eq('系统通知 kind 数', 'README-server.md §6.7「已注册的 kind（共 N 种）」', cn(m(lineWith(rs, /已注册的 kind/), /共\s*([\d一二两三四五六七八九十]+)\s*种/)), kindReal);
  eq('系统通知 kind 数', 'README-server.md §6.7 依据行「N 个键」', cn(m(lineWith(rs, /KINDS` 注册表/), /注册表，(\d+) 个键/)), kindReal);
  eq('系统通知 kind 数', 'README-server.md 文件表「N 种 kind」', cn(m(lineWith(rs, /系统派生通知：/), /系统派生通知：(\d+) 种 kind/)), kindReal);

  // ⑩ 路由数（权威＝`server/routes/**` 声明数 ＋ `server/app.js` 声明数，减循环声明、加循环展开）
  const routeSrc = walkJs(join(ROOT, 'server', 'routes')).map(read).join('\n');
  const declAll = (routeSrc.match(/\brouter\.(get|post|patch|delete|put)\s*\(/g) || []).length;
  const declLoop = (read(RESOURCES_ROUTE).match(/router\.(get|post|patch|delete|put)\(`\/\$\{name\}/g) || []).length;
  const declApp = (read(join(ROOT, 'server', 'app.js')).match(/\bapp\.(get|post|patch|delete|put)\s*\(/g) || []).length;
  const resNames = (read(RESOURCES_STORE).match(/const RESOURCE_TABLES = \{([\s\S]*?)\n\};/)[1].match(/^\s{2}(\w+):/gm) || []).length;
  const routeExplicit = declAll - declLoop + declApp;
  const routeExpanded = resNames + (resNames - 1) + resNames + resNames;
  const routeLine = lineWith(rs, /展开后总路由数/);
  eq('路由数（显式声明）', 'README-server.md §6 数量口径', cn(m(routeLine, /显式声明的路由 (\d+) 条/)), routeExplicit);
  eq('路由声明数', 'README-server.md §6 数量口径', cn(m(routeLine, /`router\.\*` 声明 \*\*(\d+) 条\*\*/)), declAll);
  eq('路由循环声明数', 'README-server.md §6 数量口径', cn(m(routeLine, /其中 \*\*(\d+) 条在通用资源循环里\*\*/)), declLoop);
  eq('app 路由声明数', 'README-server.md §6 数量口径', cn(m(routeLine, /`server\/app\.js` 的 (\d+) 条/)), declApp);
  eq('资源名数', 'README-server.md §6 数量口径', cn(m(routeLine, /（(\d+) 个资源名，见 §6\.2）/)), resNames);
  eq('路由数（循环展开）', 'README-server.md §6 数量口径', cn(m(routeLine, /循环展开 (\d+) 条/)), routeExpanded);
  eq('路由数（合计）', 'README-server.md §6 数量口径', cn(m(routeLine, /＝(\d+) ＋ (\d+) ＝ (\d+) 条/, 3)), routeExplicit + routeExpanded);
  eq('路由数（显式声明）', 'README-server.md §6 数量口径（算式左项）', cn(m(routeLine, /＝(\d+) ＋ (\d+) ＝ \d+ 条/)), routeExplicit);

  // ⑪ 设置中心分区数（权威＝`settings-entry.js` 的 SECTION_META 键集）
  const seSrc = read(SETTINGS_ENTRY);
  const seFrom = seSrc.indexOf('const SECTION_META = {');
  const seBlock = seSrc.slice(seFrom, seSrc.indexOf('\n};', seFrom));
  const secReal = (seBlock.match(/^ {2}'[a-z-]+': \{/gm) || []).length;
  eq('设置中心分区数', 'README-server.md §3.4「左栏共 N 个分区」', cn(m(lineWith(rs, /左栏共/), /左栏共\s*([\d一二两三四五六七八九十]+)\s*个分区/)), secReal);
  eq('设置中心分区数', 'docs/help.html §4.1 标题（2026-09-27 起：设置逐项独立成章，原 §5.4 迁入 §4.1）', cn(m(lineWith(help, /doc-h3-badge">4\.1<\/span>设置中心分区一览/), /设置中心分区一览（(\d+) 个分区/)), secReal);
  eq('设置中心分区数', 'docs/help.html §4.1 卡标题', cn(m(lineWith(help, /个分区：每区管什么/), /help-card-title">(\d+) 个分区/)), secReal);
  const secTableAt = help.indexOf('个分区：每区管什么');
  const secTable = help.slice(secTableAt, help.indexOf('</tbody>', secTableAt));
  eq('设置中心分区数', 'docs/help.html §4.1 表体行数', (secTable.match(/^\s*<tr><td>/gm) || []).length, secReal);
  eq('设置中心分区数', 'docs/help.html §0.4「N 个分区逐区一览」', cn(m(lineWith(help, /个分区逐区一览/), /(\d+) 个分区逐区一览/)), secReal);
  // 支书 / 副支书可见区数（权威＝「外观」＋「我的工作台」〔该角色有工作台时才发〕＋ SECRETARY_GOV 四区）
  const secGov = /const SECRETARY_GOV = \[([\s\S]*?)\];/.exec(seSrc)?.[1] || '';
  const govN = (secGov.match(/\{ id: '/g) || []).length;
  eq('支书可见设置分区数', 'docs/help.html §4.1「支书 / 副支书 N 区」', cn(m(lineWith(help, /支书 \/ 副支书 \d+ 区/), /支书 \/ 副支书 (\d+) 区/)), 2 + govN);

  // ⑫ 队列在册条数（权威＝「实施批次计划 ·（一）逐条归组」表「条数」列之和）
  const q = read(QUEUE);
  const qFrom = q.indexOf('（一）逐条归组');
  const groupTable = q.slice(qFrom, q.indexOf('| **合计** |', qFrom));
  const rowSums = [...groupTable.matchAll(/^\|\s[^|]*\|\s[^|]*\|\s*(\d+)\s*\|\s*$/gm)].map((x) => Number(x[1]));
  assert.ok(rowSums.length >= 10, `REVIEW_QUEUE.md 逐条归组表只解析到 ${rowSums.length} 个「条数」格（基线 10）：表结构或判据变了`);
  const qReal = rowSums.reduce((a, b) => a + b, 0);
  const sumLine = lineWith(q, /^\| \*\*合计\*\* \|/);
  eq('队列在册条数', 'REVIEW_QUEUE.md 合计行「N 条」', cn(m(sumLine, /\*\*(\d+) 条\*\*/)), qReal);
  eq('队列在册条数', 'REVIEW_QUEUE.md 合计行「N ✓」', cn(m(sumLine, /\| \*\*(\d+)\*\* ✓ \|/)), qReal);
  eq('队列在册条数', 'REVIEW_QUEUE.md 阶段 A「在册 N 条」', cn(m(lineWith(q, /^> \*\*在册 \d+ 条\*\*（/), /\*\*在册 (\d+) 条\*\*/)), qReal);
  eq('队列在册条数', 'REVIEW_QUEUE.md「（一）逐条归组（现况：N 条在册）」', cn(m(lineWith(q, /逐条归组（现况/), /现况：\*\*([\d一二两三四五六七八九十]+) 条在册\*\*/)), qReal);
  eq('队列在册条数', 'REVIEW_QUEUE.md 机器判据提示「现况＝N 条」', cn(m(lineWith(q, /机器判据提示/), /现况＝([\d一二两三四五六七八九十]+) 条/)), qReal);
  eq('队列在册条数', 'REVIEW_QUEUE.md 阶段 B「在册 N 条」', cn(m(lineWith(q, /^> \*\*状态与现况/), /\*\*在册 (\d+) 条\*\*/)), qReal);
  const relNums = q.split(/\r?\n/).filter((l) => /与在册计数的关系/.test(l))
    .map((l) => cn(m(l, /阶段 B 在册\*\*仍 ([\d一二两三四五六七八九十]+) 条/)));
  assert.ok(relNums.length >= 5, `REVIEW_QUEUE.md 只解析到 ${relNums.length} 处「与在册计数的关系」行（基线 5）：判据可能失效`);
  relNums.forEach((n, i) => eq('队列在册条数', `REVIEW_QUEUE.md「与在册计数的关系」第 ${i + 1} 处`, n, qReal));

  // ⑬ 真机台账规模（权威＝`server/test/form-loop-registry.mjs` 的**条目行**；2026-09-28 批次 240 · 收 `H-4`）
  //    病灶（`H-4`）：README 自述「95 处校验点 / 91 条可自动化 / 4 条非自动化」是**旧口径的定格**——
  //    台账早已长到 101 与 95 / 6，而**没有任何守卫核这几个数**：它与本表其它 12 项同属「可数事实」，
  //    却整整漏在外面（换壳者据此估工作量会偏）。
  //    ⚠ 计数判据（踩过的坑）：**只数条目行**（行首 `{ file:`），**注释里的 `machine:true` 不算**——
  //    对整段做正则会把注释文本数进去（台账里 101 vs 95 的差额正是这么来的，本批实测）。
  const frlSrc = read(join(ROOT, 'server', 'test', 'form-loop-registry.mjs'));
  const vBody = frlSrc.slice(frlSrc.indexOf('export const VALIDATION_SITES'), frlSrc.indexOf('export const MACHINE_FLOWS'));
  const mBody = frlSrc.slice(frlSrc.indexOf('export const MACHINE_FLOWS'), frlSrc.indexOf('export const SUCCESS_FLOWS'));
  const vEntries = vBody.split(/\r?\n/).filter((l) => /^\s*\{\s*file:/.test(l));
  const sitesManualReal = vEntries.filter((l) => /machine:\s*false/.test(l)).length;
  const sitesAutoReal = vEntries.length - sitesManualReal;
  const flowsReal = mBody.split(/\r?\n/).filter((l) => /^\s*\{\s*$/.test(l)).length;
  // 台账基线常量是**独立的第二读**：两读必须相等 ⇒ 计数正则写坏时立刻红（防恒真）
  eq('真机台账校验点总数', '台账 `SITES_BASELINE` 常量', cn(m(frlSrc, /export const SITES_BASELINE = (\d+);/)), vEntries.length);
  eq('真机台账真机流程数', '台账 `FLOWS_BASELINE` 常量', cn(m(frlSrc, /export const FLOWS_BASELINE = (\d+);/)), flowsReal);
  const readmeSrc = read(README);
  eq('真机台账校验点总数', 'README.md「共 N 处校验点」', cn(m(readmeSrc, /共 \*\*(\d+)\*\* 处校验点/)), vEntries.length);
  eq('真机台账可自动化条数', 'README.md「`machine:true` N 条可自动化」', cn(m(readmeSrc, /`machine:true` \*\*(\d+)\*\* 条可自动化/)), sitesAutoReal);
  eq('真机台账非自动化条数', 'README.md「`machine:false` N 条非自动化」', cn(m(readmeSrc, /`machine:false` \*\*(\d+)\*\* 条非自动化/)), sitesManualReal);
  eq('真机台账真机流程数', 'README.md「N 条真机闭环」', cn(m(readmeSrc, /\*\*(\d+) 条真机闭环\*\*/)), flowsReal);

  assert.deepEqual(problems, [],
    `文档里的「枚举 / 计数」与代码 / 数据实然值不符（口径：**以代码 / 数据实然值为准**）：\n  ${problems.join('\n  ')}`);
  // 非空转：实然值本身不得为 0 / NaN（否则公式写坏，断言会变成恒真）
  [['支部分工模块数', modReal], ['内置场景数', sopDatabase.scenarios.length], ['角色键数', totalReal],
    ['拟上会类数', agendaReal], ['ACTIVE_RULINGS 口径行', arLines], ['决策日志条目', dReal],
    ['页面数', rootsN + wsN], ['资源表数', dbTables], ['通知 kind 数', kindReal],
    ['路由数', routeExplicit + routeExpanded], ['设置分区数', secReal], ['队列在册', qReal],
    ['真机台账校验点', vEntries.length], ['真机台账真机流程', flowsReal],
  ].forEach(([k, v]) => assert.ok(Number.isFinite(v) && v > 0, `S14 的实然值「${k}」＝${v}：解析式写坏了，断言会变成恒真`));
});

// ─────────────────────────────────────────────────────────────────────────────
// S15 弱清单（同批）：**取值定义不清 / 或有正当沿革**的枚举数字——不判红，只登记 + 基线。
//   防两件事：① 「正则失效 ⇒ 一条都解析不到 ⇒ 断言恒真」（给下限）；② 「口径成批变松」
//   （给上限）。⚠ 弱清单**不是空壳**：每条都断言「它还认得那个写法」或「编号自洽」。
// ─────────────────────────────────────────────────────────────────────────────
test('S15 弱清单：有正当沿革 / 取值定义不清的枚举数字只登记（带基线，防僵尸与变松）', () => {
  // ① ACTIVE_RULINGS 各批增量句里的「现行有效 N 条」——**沿革串数、不是行数**
  //    （批次 159 已立口径「引用与自查一律以 107 为准」）：不判红，只登记句数与末值。
  const ar = read(RULINGS);
  const histN = (ar.match(/现行有效[^\n]{0,40}条/g) || []).length;
  assert.ok(histN >= 10, `ACTIVE_RULINGS 只解析到 ${histN} 句「现行有效 N 条」（下限 10）：沿革句被删或写法变了`);
  assert.match(ar, /不是行数/, 'ACTIVE_RULINGS 文首未写明「各批累加数**不是行数**」——读者会把沿革串数当现况');

  // ② CLAUDE.md 的「评议待办 · 执行型」表（`R-NN`）：**只留在办项**——`H50.1 §3`＝完成即**整行删除**（禁仅标 ✅）。
  //   2026-10-01 批次 314 按此把 **60 行已闭环 / 已立**删去（**69 → 9 行**）；**全文不丢** ⇒ 迁出附节
  //   （`.ctx/logs/2026-09-EXECUTION_LOG.md`「附：乙部「评议待办 · 执行型」`R-23`…`R-91` 迁出全文」）。
  //   本判据两条：① **在办表 ∪ 迁出附节**的 `R-NN` 并集须仍覆盖 `R-23`…`R-91` 全集（防「删表＝丢编号」）；
  //              ② **在办表自身不得再出现「已闭环 / 已立」注记**（防退回「仅标 ✅ 不删除」）。
  //   **无别处转引 ⇒ 不判「文档声称值」**（弱清单；下限 5 防「正则失效 ⇒ 一条也解析不到 ⇒ 断言恒真」）。
  const claude = read(join(ROOT, 'CLAUDE.md'));
  const rRows = [...claude.matchAll(/^\| (R-\d+) \|(.+)$/gm)].map((x) => [x[1], x[2]]);
  const rIds = rRows.map((r) => r[0]);
  assert.ok(rIds.length >= 5, `CLAUDE.md 只解析到 ${rIds.length} 条 R-NN 行（下限 5）：解析失效或整表被清空`);
  assert.equal(new Set(rIds).size, rIds.length, `CLAUDE.md 的 R-NN 编号有重复：${rIds.filter((id, i) => rIds.indexOf(id) !== i).join(' / ')}`);
  const closedRows = rRows.filter(([, tail]) => /已闭环|已立/.test(tail)).map((r) => r[0]);
  assert.deepEqual(closedRows, [], `乙部「评议待办 · 执行型」表出现「已闭环 / 已立」注记（H50.1 §3 禁「仅标 ✅ 不删除」）：${closedRows.join(' / ')}`);
  const migrated = read(join(ROOT, '.ctx', 'logs', '2026-09-EXECUTION_LOG.md'));
  const migratedIds = [...migrated.matchAll(/^\| (R-\d+) \|/gm)].map((x) => x[1]);
  const rAll = new Set([...rIds, ...migratedIds]);
  assert.ok(rAll.size >= 65, `R-NN 全集只解析到 ${rAll.size} 个（乙部在办表 ∪ 迁出附节；下限 65）：迁出附节被删或写法变了`);
  const rNums = [...rAll].map((s) => Number(s.slice(2))).sort((a, b) => a - b);
  assert.ok(rNums[0] === 23 && rNums[rNums.length - 1] === 91,
    `R-NN 编号区间应为 23…91，实为 ${rNums[0]}…${rNums[rNums.length - 1]}：编号被删或被改`);

  // ③ 角色键「列举式」说明（括注写「含 …」＝非穷举）：**不判穷举**，只登记处数（防被当成穷举清单读）。
  const rs = read(README_SERVER);
  const listedLines = rs.split(/\r?\n/).filter((l) => /角色键（含 /.test(l));
  assert.ok(listedLines.length >= 1, 'README-server.md 未解析到「角色键（含 …）」式列举（≥1 处）：写法变了或该说明被删');
});

// ─────────────────────────────────────────────────────────────────────────────
// S16 守卫注册完整性（2026-09-28 批次 243）：**S 类测试文件必须全数列入 `test:daily` 显式清单**。
//   病灶（本批实测）：`dead-selector-guard`（批次 227 立）与 `text-tier-guard`（文本档位批立）两个
//   **纯 node 守卫**——文件在、断言在、单跑全绿，却**不在任何 npm script 里**（`test:fast` / `test:daily`
//   都是**显式清单**）⇒ **从不自动运行**。同类「漏注册」已第三次：批 43 的 `page-sweep`（`S10` 即为此立）、
//   批次 239 的 `block-orchestration`（当批自补）、本次两个。**根因＝「新增守卫」没和「登记进日常档」绑定**。
//   判据（单一源）：`server/test/` 下**不** `import 'playwright'` 的 `*.test.{js,mjs}`（＝S 类，`CLAUDE.md R-85`）
//   必须 ⊆ `test:daily` 清单；两侧都设非空转下限（防解析写坏 ⇒ 差集恒空 ⇒ 漏注册也绿）。
// ─────────────────────────────────────────────────────────────────────────────
test('S16 守卫注册完整性：S 类测试文件必须全数列入 test:daily（防守卫孤儿化）', () => {
  const TDIR = join(ROOT, 'server', 'test');
  const all = readdirSync(TDIR).filter((f) => /\.test\.(js|mjs)$/.test(f));
  const playwrightRe = /from\s+['"]playwright['"]|import\(\s*['"]playwright['"]\s*\)/;
  const sClass = all.filter((f) => !playwrightRe.test(read(join(TDIR, f))));
  const pkg = JSON.parse(read(join(ROOT, 'server', 'package.json')));
  const daily = new Set((pkg.scripts['test:daily'].match(/test\/[A-Za-z0-9_.-]+\.test\.m?js/g) || [])
    .map((x) => x.replace(/^test\//, '')));
  // 非空转：两侧都必须有规模（解析写坏 ⇒ 差集恒空 ⇒ 「漏注册」也判绿）
  assert.ok(sClass.length >= 60 && daily.size >= 60,
    `解析面不足（S 类 ${sClass.length} / test:daily ${daily.size}，下限均 60）：判据或 package.json 解析被写坏`);
  const missing = sClass.filter((f) => !daily.has(f)).sort();
  assert.deepEqual(missing, [],
    `以下 S 类测试文件**不在 test:daily 清单**（守卫孤儿化 ⇒ 从不自动运行）：\n  ${missing.join('\n  ')}\n` +
    '  处置：加进 `server/package.json` 的 `test:daily`（S 类应全数入档，见 `CLAUDE.md R-85`）。');
});

