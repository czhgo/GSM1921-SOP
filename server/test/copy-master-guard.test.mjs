// role: [工程师]+[AI]
// copy-master-guard.test.mjs — 「界面复述制度母本」存量回归防线（2026-09-25 制度口径定点批）
//
// 判据原文（DESIGN_SYSTEM §4.18 C7，逐字照录，**不得自创更严 / 更宽**）：
//   · 「**制度原文不进界面**：制度母本（`content/02_institution/**`、`content/01_strategy/references/**`）
//      的整句不得搬进页面」
//   · 「界面文案与制度母本存在 **连续 ≥20 字**子串重合 ⇒ 红，必须改写成一句口径 ＋ 指向
//      `docs/help.html` 对应锚点的链接（**信息不丢，只搬家**）」
//   ⇒ **N = 20**（C7 原文值，逐字取自上表），判红面 ＝ `docs/src/**` 的界面文本。
//
// 母本取哪一份（**如实标注**，见本批报告 ⑥「与本文不一致处」）：
//   C7 原文点的母本路径是 `content/**`；本批把制度口径的正规去处落到 `docs/help.html`（界面只留一行 ＋ 深链），
//   故判红面按本批任务书取 **help.html 页面正文**（strip 标签后的可见文本）。
//   `content/**` 一侧另在 N4 以「**只报不判**」口径打印（体例同 control-font-guard 的 T4 全站口径）——
//   **不并入判红面**：并入即等于把两个面取并集，比 C7 原文更严。
//
// 抽取口径（＝ §4.18.5 的 DOM 口径搬到源码上）：
//   · 面 ＝ `docs/src/**/*.js` 里**会渲染出来的文本**：剥注释（`//` · `/* */` · `<!-- -->`）→ 剥标签
//     （`<…>` 整段去掉 ⇒ title / placeholder / aria-label 等**属性值不计**入，与 §4.18.5「可见文案＝文本节点」同口径；
//      上一批已把逐行重复说明改成 `title` 悬浮，正落在此口径的排除面上）→ 解 HTML 实体 → 去空白。
//   · **「说明性文本」＝中文句子**：重合段里至少含 N 个汉字（C7 说的是「整句」）。
//     纯 ASCII 的页名 / 文件路径 / 标识符（`party-committee.html`、`/services/member/party-group.js`、
//     `content/02_institution/sop/`）不是「整句」，实测它们会与 help 里的同名可见文本假命中 ⇒ 明确排除。
//   · 归一化：去空白（含全角空格）。**不做数字替换**——C7 原文无此口径（「数字→N」只属 C3）。
//   · 判「连续 ≥20 字」：在去空白的界面文本上滑窗，任一 20 字窗出现在母本中即命中，再向两侧扩到最大重合段。
//
// 判红 / 判据：
//   N1 新增重合：基线之外的 (文件, 重合片段) ⇒ 红（提示「该句应改为一行 ＋ help 深链」）
//   N2 逐文件 ratchet：某文件重合条数 > 基线 ⇒ 红（同一句再复述一遍也算新增）
//   N3 非空转：① 抽取口径正/负例（含 20/19 字边界）② 基线规模下限 ＋ 条目数一致 ③ 僵尸登记
//              ④ 定点登记完整性（help 里每张定点的 id / data-copy-key / data-search / data-copy-source，
//                 且 data-copy-source 文件真实存在）⑤ 界面深链可达（`docs/src` 里出现的 `./help.html#锚点`
//                 必须在 help.html 真有该 id）
//   N4 缩减进度（只报不判）：当前重合条数 / 文件数与基线对照、逐条列出现存命中；另打印 C7 原文母本
//              （`content/**`）口径的重合数，供后续批次对照。
//
// 收基线纪律：把界面上的复述改成「一行 ＋ help 深链」后，**同一批**从 BASELINE 删掉该条 / 减小计数——
//   进度自动前进；**不得**为变绿把新命中补进基线。
// 运行：node --test server/test/copy-master-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const DOCS = join(ROOT, 'docs');
const SRC = join(DOCS, 'src');
const HELP = join(DOCS, 'help.html');
const CONTENT = join(ROOT, 'content');

/** 判据阈值（DESIGN_SYSTEM §4.18 C7 原文值：连续 ≥20 字重合 ⇒ 红） */
const N = 20;

/** C7 原文点的母本路径（本守卫只在 N4 以「只报不判」口径用它） */
const MASTER_DIRS = [
  join(CONTENT, '02_institution'),
  join(CONTENT, '01_strategy', 'references'),
];

// ── 抽取口径（单一源；N1–N4 与 N3 自检共用） ────────────────────────────
/** 剥注释（与 ux-guard 同口径：块注释 / HTML 注释 / 行注释；CRLF 先归一，否则 /\/\/.*$/ 会因 \r 失配） */
function stripComments(src) {
  let s = String(src).replace(/\r\n?/g, '\n');
  s = s.replace(/\/\*[\s\S]*?\*\//g, ' ');
  s = s.replace(/<!--[\s\S]*?-->/g, ' ');
  s = s.split('\n').map((line) => line.replace(/\/\/.*$/, '')).join('\n');
  return s;
}

/** HTML 实体 → 字（只认帮助页/模板串实际用到的几种 + 数字实体） */
function decodeEntities(s) {
  return String(s)
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
}

/** 剥标签 + 去空白 ⇒ 页面里真正会渲染出来的文本（属性值随标签一起去掉） */
function visibleText(html) {
  return decodeEntities(String(html).replace(/<[^>]*>/g, ' ')).replace(/[\s\u3000]+/g, '');
}

/** 一份界面源码的「界面文本」 */
function uiTextOf(src) {
  return visibleText(stripComments(src));
}

/** 一份 HTML 文档的「页面正文」（先摘掉 script / style / 注释，再剥标签去空白） */
function pageTextOf(html) {
  const body = String(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  return visibleText(body);
}

/** 母本的全部 N 字窗（Set 查询 O(1)） */
function gramSet(text, n = N) {
  const s = new Set();
  for (let i = 0; i + n <= text.length; i++) s.add(text.slice(i, i + n));
  return s;
}

/** 片段里的汉字个数（「说明性文本」判据：重合段须至少含 N 个汉字，纯 ASCII 路径/页名不算「整句」） */
function cjkCount(s) {
  return (String(s).match(/[\u4e00-\u9fff]/g) || []).length;
}

/** 界面文本里所有与母本「连续 ≥N 字」的重合段（扩到最大；按出现序返回；只留中文说明性文本） */
function findOverlaps(uiTxt, grams, n = N) {
  const out = [];
  let i = 0;
  while (i + n <= uiTxt.length) {
    if (!grams.has(uiTxt.slice(i, i + n))) { i++; continue; }
    let j = i + n;                       // 向后扩
    while (j < uiTxt.length && grams.has(uiTxt.slice(j - n + 1, j + 1))) j++;
    let s = i;                           // 向前扩
    while (s > 0 && grams.has(uiTxt.slice(s - 1, s - 1 + n))) s--;
    const frag = uiTxt.slice(s, j);
    if (cjkCount(frag) >= n) out.push(frag);
    i = j;
  }
  return out;
}

/** 递归收集文件（跳过第三方构建产物） */
function walk(dir, exts, out = []) {
  let entries = [];
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name === '.git' || e.name === 'vendor' || e.name === 'node_modules') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, exts, out);
    else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out.sort();
}

/** 逐份界面源码的重合结果 */
function scan() {
  const grams = gramSet(pageTextOf(readFileSync(HELP, 'utf8')));
  return walk(SRC, ['.js']).map((abs) => {
    const file = relative(ROOT, abs).replace(/\\/g, '/');
    const src = readFileSync(abs, 'utf8');
    return { file, ui: uiTextOf(src), hits: findOverlaps(uiTextOf(src), grams) };
  });
}

// ── 基线（现存命中项；只为「新增」判红；收基线见文件头纪律） ──────────────
/**
 * 文件 → 该文件已登记的重合片段（去空白后逐字）。
 * 存量性质（2026-09-25 收基线时逐条读过）：**全部是功能卡 / 通知模板 / 设置页 / about 页与 help 正文的
 * 既有同句**（help 用同一句话描述同一功能），**没有一条是本批两条迁移的残留**；本批不改这些界面
 * （about / settings / 通知模板等均不在本批授权面内）⇒ 逐条登记为基线，待各自批次收。
 */
const BASELINE = {
  'docs/src/components/governance/org-setup-wizard.js': [
    '模块/块组合、角色分工与组织档案（页眉/自述/主题',            // 换组织向导表单标签（与 §5.2 向导说明同句）
    '；日常分工调整请走支书台「支部分工」的支委会议题流程',        // 向导内嵌分工说明（与 §5.2 同句）
  ],
  'docs/src/core/domain/system-notice-templates.js': [
    '已报送支委会表决，表决通过后将开放招募（截止',                // 系统通知模板正文（与 §3.6 专班说明同句）
  ],
  'docs/src/entries/pages/about-entry.js': [
    '本系统面向各类党支部与学生组织——每个组织可部署自己的实例（自有名称、人员、制度、配色与数据）；当前页面展示的是示例组织的一套部署。', // 关于页首段与 help 页眉同句
  ],
  'docs/src/entries/pages/party-committee-meeting-entry.js': [
    '线上表决与线上记录的讨论结果即终局，不需线下追认',            // 支委会会议页效力口径（与 §0.1 同句）
  ],
  'docs/src/entries/pages/settings-entry.js': [
    '未找到您所属支部——请先由党委在『支部管理』中确认归属',        // 设置页未绑定支部提示（与 §5.4 同句）
    '档案/职责参数等）每次保存自动留痕：操作人、时间、变更项、前后', // 设置页配置留痕说明（与 §5.4 同句）
  ],
  // `docs/src/entries/tabs/disc/attendance-tab.js` 条目已于 2026-09-25「文案存量清理」批移除（收基线）：
  //   该文件两条同句（考勤上传位 / 录入即确认）已改为「一行摘要 ＋ help 深链 #card-copy-attendance-record」
  //   ⇒ 界面不再复述制度母本，按本守卫自身纪律（收基线＝删条目）删去。
  'docs/src/entries/tabs/org/inspection-tab.js': [
    '自动投递：纪检确认→考察总表（组织委员建档），无需',          // 考察自动投递口径（与 §3.4 同句）
  ],
  'docs/src/entries/tabs/secretary/calendar-tab.js': [
    '人数按现时「在校/滞留」状态自动剔除滞留成员，创建时',          // 活动写入人数口径（与 §3.2 同句）
  ],
  'docs/src/entries/tabs/secretary/report-up-tab.js': [
    '节点（确定积极分子/发展对象、接收预备党员、按期转正等',        // 上报党委事项类型（与 §3.7 同句）
  ],
  'docs/src/components/sections/references.js': [
    '该制度当前已停用，以下为最近版本正文（仅供查阅）',            // 资料查询停用提示（与 §0.1 同句）
  ],
};

/** 基线规模（下限防「台账被删减」，条目数一致防「改台账不如实声明」）
 *  2026-09-25「文案存量清理」批收基线：`disc/attendance-tab.js`（2 条）已改为「一行 ＋ help 深链」
 *  ⇒ 文件 10 → 9、条数 13 → 11（两处同步下调，见上）；下限随真实值下调，**只降不升**。 */
const BASELINE_FILE_COUNT = 9;
const BASELINE_TOTAL = 11;

/** 定点登记表（help.html 里 data-copy-key 卡片数）的下限，防台账被删空
 *  2026-09-25「文案存量清理」批：本批新增 4 张定点（issue-reveal / pcm-scope / attendance-record / makeup-scope）
 *  ⇒ 连同上一批 3 张共 7 张；下限随真实值上调（**只升不降**）。 */
const COPY_CARD_BASELINE = 7;

const SCAN = scan();

// ── N1 新增重合 ────────────────────────────────────────────────────────
test(`N1 界面复述制度母本：基线之外的「连续 ≥${N} 字重合」判红（基线 ${BASELINE_TOTAL} 条 / ${BASELINE_FILE_COUNT} 文件）`, () => {
  const offenders = [];
  for (const { file, hits } of SCAN) {
    if (!hits.length) continue;
    const known = new Set(BASELINE[file] || []);
    for (const h of hits) {
      if (!known.has(h)) offenders.push(`${file} → 「${h}」（${h.length} 字）`);
    }
  }
  assert.deepEqual(offenders, [],
    `界面在复述制度母本（DESIGN_SYSTEM §4.18 C7：连续 ≥${N} 字重合即红）——该句应改为「一行摘要（≤60 字）＋ help 深链」：\n  ${offenders.join('\n  ')}`);
});

// ── N2 逐文件 ratchet ──────────────────────────────────────────────────
test('N2 逐文件 ratchet：某文件的重合条数不得高于基线（同一句再复述一遍也算新增）', () => {
  const grow = [];
  for (const { file, hits } of SCAN) {
    const base = BASELINE[file];
    if (!base) continue; // 新命中已由 N1 报出
    if (hits.length > base.length) grow.push(`${file} → ${hits.length} 条 > 基线 ${base.length} 条`);
  }
  assert.deepEqual(grow, [], `以下文件复述制度母本的条数高于基线（收基线后不得再长）：\n  ${grow.join('\n  ')}`);
});

// ── N3 非空转自检 ──────────────────────────────────────────────────────
test('N3 非空转：抽取口径可用（含 20/19 字边界）+ 基线规模达标 + 无僵尸登记 + 定点登记完整 + 深链可达', () => {
  // ① 抽取口径正例：模板串里的说明行会被抽出
  assert.equal(uiTextOf('<p class="c">党员应到＝正式＋预备党员</p>'), '党员应到＝正式＋预备党员',
    '抽取口径失效：模板串里的说明行没被抽出（守卫会恒真）');
  // ① 负例：注释里的同一句不得计入（注释不渲染）
  assert.equal(uiTextOf('// 党员应到＝正式＋预备党员'), '',
    '抽取口径过宽：行注释里的文字被当成界面文本');
  assert.equal(uiTextOf('<!-- 党员应到＝正式＋预备党员 -->'), '',
    '抽取口径过宽：HTML 注释里的文字被当成界面文本');
  // ① 负例：属性值（title / placeholder）不是文本节点 ⇒ 不计入（§4.18.5 口径）
  assert.equal(uiTextOf('<div title="党员应到＝正式＋预备党员">ok</div>'), 'ok',
    '抽取口径过宽：属性值被当成界面文本（§4.18.5 的可见文案＝文本节点）');
  // ① 边界：恰好 20 字重合命中；19 字不命中（C7 原文阈值）
  const syn = '一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十'; // 30 字
  const gramsSyn = gramSet(syn);
  assert.deepEqual(findOverlaps(syn.slice(0, N), gramsSyn), [syn.slice(0, N)],
    `边界判据失效：恰好 ${N} 字的重合没被判出`);
  assert.deepEqual(findOverlaps(syn.slice(0, N - 1), gramsSyn), [],
    `边界判据过宽：${N - 1} 字的重合被判红（C7 原文阈值为 ≥${N} 字）`);
  // ① 母本剥 script/style/注释（帮助页 CSS 注释里的中文不得混进母本）
  const gramsHelp = gramSet(pageTextOf(readFileSync(HELP, 'utf8')));
  assert.ok(gramsHelp.size > 1000, `母本 N 字窗只有 ${gramsHelp.size} 个（页面正文提取疑似失效）`);

  // ② 基线规模下限（低于此值说明台账被删减或口径失效）
  const baseFiles = Object.keys(BASELINE);
  assert.ok(BASELINE_FILE_COUNT >= 9, `基线文件数过少（声明 ${BASELINE_FILE_COUNT}，下限 9）——台账被删减或抽取口径失效`);
  assert.ok(BASELINE_TOTAL >= 11, `基线条数过少（声明 ${BASELINE_TOTAL}，下限 11）——台账被删减或抽取口径失效`);
  assert.equal(baseFiles.length, BASELINE_FILE_COUNT,
    `基线条目数与声明的文件数不一致（实测 ${baseFiles.length} / 声明 ${BASELINE_FILE_COUNT}）`);
  assert.equal(baseFiles.reduce((a, f) => a + BASELINE[f].length, 0), BASELINE_TOTAL,
    '基线片段总数与声明值不一致（改台账须同步声明值）');
  // ③ 僵尸登记：基线文件必须真实存在，且该文件仍应有重合命中
  const gone = baseFiles.filter((f) => !existsSync(join(ROOT, f)));
  assert.deepEqual(gone, [], `基线条目指向不存在的文件（应删除该条）：\n  ${gone.join('\n  ')}`);
  const emptied = SCAN.filter(({ file, hits }) => BASELINE[file] && !hits.length).map(({ file }) => file);
  assert.deepEqual(emptied, [],
    `以下文件的重合已清零，应从 BASELINE 删除该条（收基线）：\n  ${emptied.join('\n  ')}`);

  // ④ 定点登记完整性：help.html 里每张定点卡的 id / data-copy-key / data-search / data-copy-source 齐备，
  //    且 data-copy-source 指向的界面文件真实存在（登记表＝help 自身的数据结构，不另建台账文件）
  const helpSrc = readFileSync(HELP, 'utf8');
  const cards = [...helpSrc.matchAll(/<div\b[^>]*\bid="(card-copy-[\w-]+)"[^>]*>/g)].map((m) => m[0]);
  assert.ok(cards.length >= COPY_CARD_BASELINE,
    `help.html 的定点点位只剩 ${cards.length} 张（基线 ${COPY_CARD_BASELINE}）——定点台账被删空，界面深链会成死链`);
  const cardIds = new Set();
  for (const tag of cards) {
    const id = /id="([^"]+)"/.exec(tag)[1];
    assert.ok(!cardIds.has(id), `help.html 定点 id 重复：${id}（每条口径只允许一处）`);
    cardIds.add(id);
    const key = /data-copy-key="([^"]+)"/.exec(tag);
    assert.ok(key && key[1], `定点 ${id} 缺 data-copy-key（登记主键，守卫按它核台账）`);
    assert.ok(/data-search="[^"]+"/.test(tag), `定点 ${id} 缺 data-search（help 搜索索引只收 .help-card[data-search]，缺了用户搜不到）`);
    const srcs = (/data-copy-source="([^"]*)"/.exec(tag) || [, ''])[1].split(',').map((s) => s.trim()).filter(Boolean);
    assert.ok(srcs.length, `定点 ${id} 缺 data-copy-source（该口径原挂在哪份界面文件——迁移去向须可反查）`);
    for (const s of srcs) {
      assert.ok(existsSync(join(ROOT, s)), `定点 ${id} 的 data-copy-source 指向不存在的文件：${s}`);
    }
    // 原句逐字可查：卡片正文与该文件都在，正文里须有这条口径的原文（非空转）
    assert.ok(helpSrc.slice(helpSrc.indexOf(tag), helpSrc.indexOf(tag) + 2600).includes('原文'),
      `定点 ${id} 未见「原文」段——被删掉的界面语义必须在 help 逐字可查（C7「信息不丢，只搬家」）`);
  }

  // ⑤ 界面深链可达：docs/src 里出现的 ./help.html#<锚点> 必须在 help.html 真有该 id
  const deepLinks = [];
  for (const abs of walk(SRC, ['.js'])) {
    const src = readFileSync(abs, 'utf8');
    for (const m of src.matchAll(/\.\/help\.html#([\w-]+)/g)) {
      deepLinks.push({ file: relative(ROOT, abs).replace(/\\/g, '/'), id: m[1] });
    }
  }
  assert.ok(deepLinks.length >= 2, `界面里的 help 深链只剩 ${deepLinks.length} 处（基线 2）——本批的两条迁移被撤了？`);
  const dead = deepLinks.filter((d) => !new RegExp(`id="${d.id}"`).test(helpSrc));
  assert.deepEqual(dead.map((d) => `${d.file} → #${d.id}`), [],
    '界面深链指向 help.html 里不存在的锚点（死链）：\n  ' + dead.map((d) => `${d.file} → #${d.id}`).join('\n  '));
});

// ── N4 缩减进度（只报不判） ────────────────────────────────────────────
test('N4 缩减进度：当前重合条数 / 文件数与基线对照（另打印 C7 原文母本 content/** 口径）', () => {
  const rows = SCAN.filter((r) => r.hits.length);
  const total = rows.reduce((a, r) => a + r.hits.length, 0);
  const d = (cur, base) => (cur === base ? '持平' : cur < base ? `↓${base - cur}` : `↑${cur - base}`);
  console.log(`[界面复述制度母本] 命中 ${total} 条（基线 ${BASELINE_TOTAL}，${d(total, BASELINE_TOTAL)}）`
    + ` · 文件 ${rows.length}（基线 ${BASELINE_FILE_COUNT}，${d(rows.length, BASELINE_FILE_COUNT)}）· 阈值 ≥${N} 字`);
  for (const r of rows) {
    for (const h of r.hits) console.log(`  · ${r.file} → 「${h}」（${h.length} 字）`);
  }
  // C7 原文母本（content/**）口径：只报不判（并入判红面即比 C7 原文更严，见文件头）
  const masterFiles = MASTER_DIRS.flatMap((dir) => walk(dir, ['.md']));
  const masterText = masterFiles
    .map((f) => readFileSync(f, 'utf8').replace(/[*`_#>|[\]()]/g, '')) // md 标记近似剥离（只作对照）
    .join('\n');
  const gramsMaster = gramSet(visibleText(masterText));
  let alt = 0;
  const altFiles = [];
  for (const { file, ui } of SCAN) {
    for (const h of findOverlaps(ui, gramsMaster)) {
      alt++; altFiles.push(`${file} → 「${h}」（${h.length} 字）`);
    }
  }
  console.log(`[只报不判 · C7 原文母本 ${masterFiles.length} 份 content/**.md] 命中 ${alt} 条`
    + `${altFiles.length ? '：\n  ' + altFiles.join('\n  ') : '（0 条）'}`);
  console.log('[收基线提示] 把复述改成「一行 ＋ help 深链」后，同批从 BASELINE 删条目 / 减小计数，进度即前进；不得为变绿补条目。');
});
