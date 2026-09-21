// server/test/doc-line-ref.test.mjs — 「说明文件里的取证断言」守卫（2026-09-20 批次 107）
//
// 来源（支书第 ⑥ 条）：「我们在根目录的 README 文档的开头新置一个链接，就是针对后台对接的说明文件——README-server，
//   后端那边需要完整过一下这个系统的背景以及后端所有的【角色、功能、板块、字段说明】！每一项都需要！！」
//   README-server.md 是**给外部后端对接团队**的一站式说明书（背景 / 角色 / 功能板块 / 字段 / 部署 / 接口 / 已知限制），
//   它的取证手段是正文里 **380 处 `文件:行号` 引用**——**引用失效＝后端照着找不到东西**。
//
// 病灶（批次 107 实测）：批次 106 只核了 8 处（自己改动的影响面）+ 抽样，其余未逐条核，并登记「不假装覆盖」。
//   本批先造验证器、再逐条核，实测：
//     ① **指针失效 3 处**——2 处指向空行（`DATA_MODEL.md:1038` / `:1098`）、1 处行号越界（`sopData.js:117-133`，该文件实 131 行）；
//     ② **行号漂移 2 处**——`docs/src/core/domain.js:267` 实为 `:266`（`handoffs: []` 在第 266 行）；
//     ③ **区间越到下一节 16 处**——md 区间末行落在**下一节的标题行**上（如 `DATA_MODEL.md:510-548`，548 是 `### 2.15` 的标题）；
//     ④ **内容过期 1 处**——正文写 `sopData.js` 有 **24 条** `timeOffset: null`，实测 **6 条**（115-116、123-126 行）。
//
// 判据（三级，逐条无容差；「印证」判不了的部分**如实标注不计入**，见 R2 的边界）：
//   **R1 一级＝指针指向真实位置**：每条引用能解析成真实文件（含**短式引用** `:192`——承前一个完整引用的文件；
//       含**逗号续列** `:44,161`）、行号落在该文件行数内、区间内**至少一个非空行**。
//   **R2 二级＝符号能印证**：引用后**紧跟的括注**里若写了反引号标识符（如 `constants.js:185-191`（`ROLE_KEYS`）），
//       该标识符必须出现在**声明区间内**。⚠ 边界：括注写「概念名」而非「区间内出现的标识符」时会误报
//       （当前 1 条，逐条给理由进 `ANCHOR_EXCEPTIONS`）；括注本身缺失（纯中文说明 / 无括注）的**不判**——
//       那一半只能靠人读（本批逐条读过，见执行日志）。
//   **R3 三级＝md 区间不越节**：(a) 区间**末个非空行不得是 markdown 标题**（标题是**下一节**的题目，
//       落在区间里＝区间多吞了一行）；(b) 若区间**起点是标题**，则区间内（起点之外）**不得再出现同级/更高级标题**
//       （防「一个区间跨两节」）。仅对 `.md` 引用生效。
//   **R4 关键词型取证仍成立**：正文里「X 零命中 / X 在代码中检索不到消费点」这类**按关键词取证**的断言，
//       机器可复核者逐条核对（当前 2 条：`副组长` 在 `docs/` 的**命中集＝身份载体白名单**〔2026-09-21 批次 139
//       `D-571` 由「零命中」改准——副组长已是系统身份键〕；`AI_API_BASE_URL` 在代码中无消费点）。
//       ⚠ **为什么不把「换一种说法」也做进来**：换说法的旧口径**机检不了**——如 `README-members.md` 写
//       「开本组活动、**上传本组考勤与考察**」（语义＝组长上传），**不含字面串「组长上传」**，grep 永远扫不到；
//       而「角色名 + 动作词」共现是**正常中文**（该句本身是对的），机器无法据此判错 ⇒ 这一半落**纪律**
//       （`CLAUDE.md` `R-87`「关键词反查只覆盖字面层；换说法必须人工通读」），**本守卫不越界假装覆盖**。
//   **R5 非空转**：引用总数 / 被引文件数 / 带锚点引用数三条基线 + 白名单不得僵尸化，
//       防「正则失效 ⇒ 一条都解析不到 ⇒ 断言恒真」把守卫悄悄写空。
//
// 覆盖边界（如实标注）：本守卫只核 `README-server.md`；`README.md` / `README-members.md` / `content/**` 里的
//   同类引用**不在本守卫范围**（那几份的引用另有 `link-integrity` 的链接层校验，行号层未覆盖）。
//
// 批次 111（2026-09-20）后续说明：`DATA_MODEL.md` §2.1 补 8 个字段行 ⇒ 该文件第 53 行起整体下移 8 行；
//   README-server.md 内指向 `DATA_MODEL.md` 的行号引用**共 45 处（分布 41 行）**，其中 **44 处已同批 +8 平移**
//   （`27-53` 一并收敛为 `27-60`），1 处（`deliverableIds` 的 `:47`）落在插入点之上、不动。
//   本守卫**改前/改后实测计数不变**（引用 382 = 全式 337 + 短式 45 · 被引文件 63 · 带锚点 36 · md 多行区间 66）
//   ⇒ R1–R5 的基线常量无需调整，此处仅留记录。上方「批次 107 病灶」里的示例行号是**当时的取值**（历史留痕），未随本次位移改写。
// 运行：`node --test server/test/doc-line-ref.test.mjs`（纯 node，无浏览器 / 无服务依赖）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const TARGET = join(ROOT, 'README-server.md');
const read = (f) => readFileSync(f, 'utf8');

/** 引用里认的文件扩展名（`.env.example` 之类点名到扩展的也算） */
const EXT = 'js|mjs|md|html|json|css|yml|yaml|txt|ps1|example';
/** 完整引用：`文件:12` / `文件:12-34` / `文件:12,34` / `文件:12-34,56` */
const FULL_REF = new RegExp(`([A-Za-z0-9_./-]+\\.(?:${EXT})):((?:\\d+(?:\\s*[-–]\\s*\\d+)?)(?:\\s*,\\s*\\d+(?:\\s*[-–]\\s*\\d+)?)*)`, 'g');
/** 短式引用：`:12`（承前一个完整引用的文件） */
const SHORT_REF = /(?<![A-Za-z0-9_./-]):((?:\d+(?:\s*[-–]\s*\d+)?)(?:\s*,\s*\d+(?:\s*[-–]\s*\d+)?)*)/g;

/** 二级判据的例外（逐条给理由；R5 会核它们不是僵尸、也不会悄悄变多） */
const ANCHOR_EXCEPTIONS = [
  {
    ref: 'docs/src/services/vote-config.js:41,44',
    why: '括注（`voteConfig` 取值）写的是**概念名**：41/44 行是 defaultVoteConfig 的两个 return 字面量（取值即 voteConfig），' +
      '而「voteConfig」这个词只出现在函数名 defaultVoteConfig 与该函数上方注释里，不在 41/44 行内 —— 引用本身是对的，是判据的启发式够不到。',
  },
];

/** 排除的目录：历史留痕与依赖不进「按 basename 解析短名引用」的候选集 */
const SKIP_DIRS = new Set(['node_modules', '.git', '.trae', '.vscode', '.superpowers', '.ctx', 'uploads']);

/** basename → 仓库相对路径（用于解析 `DEPLOYMENT_GUIDE.md:239` 这类省略目录的引用） */
const basenameIndex = new Map();
(function walk(dir) {
  for (const n of readdirSync(dir)) {
    if (SKIP_DIRS.has(n)) continue;
    const f = join(dir, n);
    if (statSync(f).isDirectory()) { walk(f); continue; }
    if (!basenameIndex.has(n)) basenameIndex.set(n, []);
    basenameIndex.get(n).push(relative(ROOT, f).replace(/\\/g, '/'));
  }
})(ROOT);

/** 解析引用的文件（绝对路径）；解析不到返回 null（解析到多处同名文件也算解析不到——口径从严） */
function resolveRef(p) {
  const direct = join(ROOT, p);
  if (existsSync(direct) && !statSync(direct).isDirectory()) return direct;
  const cands = basenameIndex.get(p.split('/').pop()) || [];
  return cands.length === 1 ? join(ROOT, cands[0]) : null;
}

/** `12-34,56` → [{a:12,b:34},{a:56,b:56}] */
function parseRanges(s) {
  return s.split(/\s*,\s*/).map((part) => {
    const m = /^(\d+)(?:\s*[-–]\s*(\d+))?$/.exec(part.trim());
    return { a: Number(m[1]), b: m[2] ? Number(m[2]) : Number(m[1]) };
  });
}

/** 引用后紧跟的括注里的反引号标识符（用于二级判据）；取不出锚点＝该条不判 */
function anchorsOf(tail) {
  const out = new Set();
  for (const m of tail.matchAll(/`([^`]+)`/g)) {
    let t = m[1].trim();
    if (/[/\\]/.test(t) || /[\u4e00-\u9fa5]/.test(t) || /\s/.test(t)) continue; // 路径 / 中文 / 含空格（如 `timeOffset: null`）不算锚点
    if (t.includes('::')) t = t.split('::').pop();
    t = t.replace(/\(.*\)$/, '');
    if (/^[A-Za-z_$][A-Za-z0-9_$.]*$/.test(t)) out.add(t.split('.').pop());
  }
  return [...out].filter((s) => s.length >= 3);
}

/** 逐行抽出全部引用（含短式），并记下「引用后紧跟的括注」供二级判据用 */
function collectRefs() {
  const lines = read(TARGET).split(/\r?\n/);
  const refs = [];
  lines.forEach((line, i) => {
    const evs = [...line.matchAll(FULL_REF)].map((m) => ({ kind: '全式', file: m[1], ranges: parseRanges(m[2]), at: m.index, len: m[0].length }));
    for (const s of line.matchAll(SHORT_REF)) {
      if (evs.some((e) => s.index >= e.at && s.index < e.at + e.len)) continue; // 完整引用内部的冒号
      const before = evs.filter((e) => e.at < s.index).pop();
      if (!before) continue; // 行内无前序完整引用：无从判文件，跳过（不计入基线）
      evs.push({ kind: '短式', file: before.file, ranges: parseRanges(s[1]), at: s.index, len: s[0].length });
    }
    evs.sort((x, y) => x.at - y.at);
    evs.forEach((e, k) => {
      const next = evs[k + 1];
      // 括注＝本条引用之后、下一条引用之前的文字；去掉引用自身的收尾反引号；在句号/分号处截断
      // （不截断会把下一句里提到的符号算到本条上——实测 `DEPLOYMENT_GUIDE.md:239` 曾因此误报）
      const tail = line.slice(e.at + e.len, next ? next.at : line.length)
        .replace(/^`/, '').replace(/`$/, '')
        .split(/[。；]/)[0];
      refs.push({
        readmeLine: i + 1, kind: e.kind, file: e.file, ranges: e.ranges, tail,
        key: `${e.file}:${e.ranges.map((r) => (r.a === r.b ? String(r.a) : `${r.a}-${r.b}`)).join(',')}`,
      });
    });
  });
  return refs;
}

const REFS = collectRefs();
const FILES = [...new Set(REFS.map((r) => r.file))].sort();
const ANCHORED = REFS.filter((r) => anchorsOf(r.tail).length > 0);

// ── R1 一级：指针指向真实位置 ──────────────────────────────────────────────

test('R1 每条 `文件:行号` 引用都指到真实位置（文件可解析 / 行号在范围内 / 区间非空）', () => {
  const problems = [];
  for (const r of REFS) {
    const where = `README-server.md:${r.readmeLine} ${r.kind} ${r.key}`;
    const abs = resolveRef(r.file);
    if (!abs) { problems.push(`${where} → 文件解析不到（既不在仓库内按该路径存在，也不是唯一 basename）`); continue; }
    const src = read(abs).split(/\r?\n/);
    for (const g of r.ranges) {
      if (g.a < 1 || g.b < g.a) { problems.push(`${where} → 行号区间非法（${g.a}-${g.b}）`); continue; }
      if (g.b > src.length) { problems.push(`${where} → 行号越界（该文件实 ${src.length} 行，引用到 ${g.b}）`); continue; }
      if (!src.slice(g.a - 1, g.b).some((s) => s.trim())) problems.push(`${where} → 指向空行（区间 ${g.a}-${g.b} 全是空行）`);
    }
  }
  assert.deepEqual(problems, [], `README-server.md 的 \`文件:行号\` 引用失效（后端会照着找不到东西）：\n  ${problems.join('\n  ')}`);
});

// ── R2 二级：符号能印证 ────────────────────────────────────────────────────

test('R2 引用后括注里的符号必须出现在声明区间内（逐条无容差；例外仅 1 条且写明理由）', () => {
  assert.ok(ANCHORED.length >= 30, `只解析出 ${ANCHORED.length} 条带符号锚点的引用（基线 30）：解析口径被改坏了，断言会变成假绿`);
  const exempt = new Set(ANCHOR_EXCEPTIONS.map((e) => e.ref));
  const problems = [];
  for (const r of ANCHORED) {
    if (exempt.has(r.key)) continue;
    const abs = resolveRef(r.file);
    if (!abs) continue; // 文件不存在已由 R1 报红
    const src = read(abs).split(/\r?\n/);
    const anchors = anchorsOf(r.tail);
    const seg = r.ranges.map((g) => src.slice(g.a - 1, g.b).join('\n')).join('\n');
    if (!anchors.some((s) => seg.includes(s))) {
      problems.push(`README-server.md:${r.readmeLine} ${r.key}（区间内未出现 ${anchors.map((s) => `\`${s}\``).join(' / ')}）` +
        ` —— 若行号已漂移请改行号；若括注写的是概念名而非区间内标识符，请改写括注或按理由进 ANCHOR_EXCEPTIONS`);
    }
  }
  assert.deepEqual(problems, [], `符号锚点与区间对不上：\n  ${problems.join('\n  ')}`);
  // 白名单不得僵尸化（改好后必须撤下），也不得悄悄变宽
  const zombie = ANCHOR_EXCEPTIONS.filter((e) => !REFS.some((r) => r.key === e.ref)).map((e) => e.ref);
  assert.deepEqual(zombie, [], `ANCHOR_EXCEPTIONS 里有已不存在的引用（僵尸白名单，请删除）：\n  ${zombie.join('\n  ')}`);
  assert.ok(ANCHOR_EXCEPTIONS.length <= 2, `ANCHOR_EXCEPTIONS 涨到 ${ANCHOR_EXCEPTIONS.length} 条（上限 2）：白名单只许逐条给理由、不许悄悄变宽`);
});

// ── R3 三级：md 区间不越节 ─────────────────────────────────────────────────

test('R3 md 区间不得越到下一节（末个非空行不是标题；起点是标题时区间内无同级/更高级标题）', () => {
  const problems = [];
  let checked = 0;
  for (const r of REFS) {
    if (!r.file.endsWith('.md')) continue;
    const abs = resolveRef(r.file);
    if (!abs) continue;
    const src = read(abs).split(/\r?\n/);
    for (const g of r.ranges) {
      if (g.a < 1 || g.b > src.length || g.a === g.b) continue; // 单行 / 越界：由 R1 管
      checked++;
      const seg = src.slice(g.a - 1, g.b);
      let last = seg.length - 1;
      while (last >= 0 && !seg[last].trim()) last--;
      if (last >= 0 && /^#{1,6}\s/.test(seg[last])) {
        problems.push(`README-server.md:${r.readmeLine} ${r.key} → 第 ${g.a + last} 行（末个非空行）是标题「${seg[last].trim().slice(0, 40)}」（标题属下一节，区间应止于本节最后一个内容行）`);
        continue;
      }
      const head = /^(#{1,6})\s/.exec(seg[0]);
      if (!head) continue;
      const lvl = head[1].length;
      for (let k = 1; k < seg.length; k++) {
        const h = /^(#{1,6})\s+(.*)$/.exec(seg[k]);
        if (h && h[1].length <= lvl) {
          problems.push(`README-server.md:${r.readmeLine} ${r.key} → 起点是标题，区间内又出现同级/更高级标题「${h[2].slice(0, 30)}」（区间跨了两节）`);
          break;
        }
      }
    }
  }
  assert.ok(checked >= 55, `只检查到 ${checked} 个 md 多行区间（基线 55：批次 107 实测 66）：解析口径被改坏了`);
  assert.deepEqual(problems, [], `md 区间越到下一节：\n  ${problems.join('\n  ')}`);
});

// ── R4 关键词型取证仍成立 ──────────────────────────────────────────────────

test('R4 「零命中 / 检索不到消费点」类关键词取证仍成立（防取证过期）', () => {
  // ① README-server.md §7.3#17 原写「`docs/` 与 `server/` 全仓检索『副组长』零命中」。
  //    ⚠ **本批（2026-09-21 批次 139 · `D-571`，系照支书 2026-09-21 口径落）该条取证已过期、按新实况改准**：
  //    支书裁定「副组长」是**与组长可区分的第二个身份**（同页同台、同权限集、任务优先给组长）⇒ 系统里
  //    落地了 `deputy-leader`（`constants.js` 文件末挂载块 / `auth.js` / `group-view.js` / 登录身份卡），
  //    「docs/ 内零命中」不再成立。断言的**量**随之从「＝0」改为「**恰好等于身份载体那几处**」——
  //    名单就是下面这份白名单（**不多不少**：多一处说明有人在别处又写了一份身份载体，少一处说明载体被删）。
  //    （README-server.md:1757 那一行现与实况相左；本批**不许改 README**，已如实登记、留待单独改准。）
  const DOC_DEPUTY_LEADER_HITS = [
    'docs/src/core/constants.js',        // 身份键 / 标签 / 页面映射 / 颜色三处（文件末集中挂载）
    'docs/src/entries/login-entry.js',   // 开发身份卡「党小组副组长」
    'docs/src/services/auth.js',         // 权限集 / 赋权链挂载 + 角色读回
    'docs/src/services/group-view.js',   // 「本组组长」解析：组长优先、无组长时才回落副组长
  ].sort();
  const hitsDoc = [];
  (function walk(dir) {
    for (const n of readdirSync(dir)) {
      const f = join(dir, n);
      if (statSync(f).isDirectory()) { walk(f); continue; }
      if (!/\.(js|mjs|json|html|css|md)$/.test(n)) continue;
      if (read(f).includes('副组长')) hitsDoc.push(relative(ROOT, f).replace(/\\/g, '/'));
    }
  })(join(ROOT, 'docs'));
  assert.deepEqual([...hitsDoc].sort(), DOC_DEPUTY_LEADER_HITS,
    `\`docs/\` 内『副组长』命中集与身份载体名单不符，实测命中：${[...hitsDoc].sort().join(' / ')}` +
    `（若确实新增 / 移除了身份载体，请同批改准本名单——并同步 README-server.md §7.3#17 的现状行）`);

  // ② README-server.md §5.3 / §7.3#22：「`AI_API_BASE_URL` 在代码中检索不到消费点（未取证）」→ 复核代码侧
  const codeRoots = [join(ROOT, 'docs', 'src'), join(ROOT, 'server')];
  const hitsCode = [];
  for (const root of codeRoots) {
    (function walk(dir) {
      for (const n of readdirSync(dir)) {
        if (SKIP_DIRS.has(n) || n === 'test') continue; // 测试文件不算「消费点」
        const f = join(dir, n);
        if (statSync(f).isDirectory()) { walk(f); continue; }
        if (!/\.(js|mjs|json|css|html)$/.test(n)) continue;
        if (read(f).includes('AI_API_BASE_URL')) hitsCode.push(relative(ROOT, f).replace(/\\/g, '/'));
      }
    })(root);
  }
  assert.deepEqual(hitsCode, [], `README-server.md 断言「\`AI_API_BASE_URL\` 在代码中检索不到消费点」，实测命中：${hitsCode.join(' / ')}` +
    `（若已接入，须同批改准 §5.3 与 §7.3#22）`);
});

// ── R5 非空转 ──────────────────────────────────────────────────────────────

test('R5 非空转：引用总数 / 被引文件数 / 带锚点引用数均有基线（防正则失效把守卫写成恒真）', () => {
  assert.ok(REFS.length >= 370, `只解析到 ${REFS.length} 条引用（基线 370：批次 107 实测 383 = 全式 338 + 短式 45）：解析口径被改坏，R1–R3 会变成恒真`);
  assert.ok(FILES.length >= 55, `只解析到 ${FILES.length} 个被引文件（基线 55：批次 107 实测 62）：解析口径被改坏`);
  assert.ok(ANCHORED.length >= 30, `带锚点的引用只剩 ${ANCHORED.length} 条（基线 30：批次 107 实测 36）：二级判据在缩水`);
  const shortN = REFS.filter((r) => r.kind === '短式').length;
  assert.ok(shortN >= 40, `短式引用只剩 ${shortN} 条（基线 40：批次 107 实测 45）：短式解析被改坏（短式最容易被漏）`);
});
