// server/test/doc-consistency.test.mjs — 「说明文件 ↔ 代码实测」口径守卫（2026-09-15 批次 42）
//
// 来源（支书第 4 项）：「请更新所有的 README、相关的说明文件！……也有很多值得提炼总结的经验，
//   这些经验是要推广开，让 AI 以此为案例发现新问题来继续询问我的！！」
// 病灶（本批实测）：说明文件与代码之间积了 **34 处口径漂移**——纪检台/组长台 tab 数（文档 10 vs 代码 8/9）、
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
  assert.deepEqual(problems, [], `数据口径漂移：\n${problems.join('\n')}`);
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
