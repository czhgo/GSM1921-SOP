// server/test/date-canon-guard.test.mjs — 「日期口径」静态守卫（R-26③ · 2026-10-05 批次 388）
//
// 来源（`CLAUDE.md R-26 ③ 待办`，本次落地）：「UTC 与本地日期口径混用（`toISOString().slice(0,10)` vs
//   `_currentYearMonth()`）须统一到本地口径。」
//   病灶：`new Date()` ＋ `toISOString()` 切前 10 位取「今天」是 **UTC** ⇒ 在 Asia/Shanghai（UTC+8）的
//   **00:00–08:00** 会把「今天」判成**昨天**（逾期 / 待办 / 发布日 / 归档日随之偏一天）——这是**早上用得多**
//   的支部系统里的真实错判。
//   本守卫把「应用面不得再用 UTC 切串取今天」**机械化**（此前只靠人记）。
//
// 判据：
//   D1 应用面（`docs/src/**` ＋ `server/**`）**不得**出现 UTC 切串取日；命中即红并指名。
//   D1b 同族：`toISOString().split('T')[0]`（批次 553 补漏）。
//   D1c 同族（2026-11-16 `polish-shell-and-display-truth` T10）：应用面**不得**用 `.slice(0, 10)`
//      从 ISO 串取日；存量按 `SLICE10_BASELINE` 逐条记账（只减不增，新增即红）。
//   D2 非空转：本地口径**单一源**确实在位——前端零依赖叶子 `docs/src/core/base/date.js`（导出 `todayLocal`）
//      ＋ 服务端单一源 `server/services/reporting.js`（导出 `today` / `fmtLocal`）；
//      且 `docs/src/core/domain/constants.js` 仍**只引一个零依赖叶子**（防它被顺手接上重依赖、破了「双端可载」）。
//   D3 抽取面下限（防判据被写坏 ⇒ 恒真）。
//
// ⚠ 边界（如实登记，**不假装覆盖**）：`docs/scripts/**` 与 `deploy/**` 是**发版 / 打包工具链**（其 `TODAY`
//   只用于**版本戳与产物名**、不属应用日期口径）⇒ 不在本判据面内。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const SELF = join(import.meta.dirname, 'date-canon-guard.test.mjs');
// ⚠ 目标串**拼接**而成：本文件自身不得出现该字面（否则自命中）
const RE = new RegExp('toISOString\\(\\)\\.slice\\(0,\\s*' + '10\\)');
// D1b（2026-11-15 批次 553）：同族逃逸——`toISOString().split('T')[0]`
const RE_SPLIT = new RegExp('toISOString\\(\\)\\.' + "split\\('T'\\)");

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    if (n === 'node_modules' || n === '.git') continue;
    const f = join(dir, n);
    if (statSync(f).isDirectory()) { walk(f, out); continue; }
    if (n.endsWith('.js') || n.endsWith('.mjs')) out.push(f);
  }
  return out;
}

test('D1 日期口径：应用面（docs/src ＋ server）不得用 UTC 切串取「今天」（R-26③）', () => {
  const hits = [];
  let scanned = 0;
  for (const dir of [join(ROOT, 'docs', 'src'), join(ROOT, 'server')]) {
    for (const f of walk(dir)) {
      if (f === SELF) continue;
      scanned += 1;
      readFileSync(f, 'utf8').split(/\r?\n/).forEach((line, i) => {
        if (RE.test(line)) hits.push(`${f.slice(ROOT.length + 1).replace(/\\/g, '/')}:${i + 1}`);
      });
    }
  }
  assert.ok(scanned >= 200, `只扫到 ${scanned} 个文件（基线 200）：扫描面被写坏，D1 会变恒真`);
  assert.deepEqual(hits, [], '应用面仍在用 UTC 切串取「今天」——应改为本地口径'
    + '（前端 `core/base/date.js::todayLocal()`；服务端 `services/reporting.js::today()` / `fmtLocal()`）：\n  '
    + hits.join('\n  '));
});

test('D1b 日期口径：应用面不得用 toISOString().split 取日（批次 553 补漏）', () => {
  const hits = [];
  let scanned = 0;
  for (const dir of [join(ROOT, 'docs', 'src'), join(ROOT, 'server')]) {
    for (const f of walk(dir)) {
      if (f === SELF) continue;
      // server/test/** 允许用 UTC 构造夹具日期（不是应用口径）
      if (f.includes(`${join('server', 'test')}`)) continue;
      scanned += 1;
      readFileSync(f, 'utf8').split(/\r?\n/).forEach((line, i) => {
        if (line.trim().startsWith('//')) return;
        if (RE_SPLIT.test(line)) hits.push(`${f.slice(ROOT.length + 1).replace(/\\/g, '/')}:${i + 1}`);
      });
    }
  }
  assert.ok(scanned >= 180, `只扫到 ${scanned} 个文件（基线 180）：扫描面被写坏，D1b 会变恒真`);
  assert.deepEqual(hits, [], '应用面仍在用 toISOString().split 取「今天」——应改为本地口径：\n  ' + hits.join('\n  '));
});

// ── D1c（2026-11-16 `polish-shell-and-display-truth` T10）──────────────────────────────
// 同族逃逸：先拿到 ISO 串、再 `slice(0, 10)` 取日，与 `toISOString()` 后接 slice 的结果一样，都是 **UTC 日**——
//   `2026-11-16T03:00:00Z` 切前 10 位得 `2026-11-16`，而 Asia/Shanghai 此时已是 16 日 11:00；
//   反向（本地 00:00–08:00 提交）会判成昨天。D1 / D1b 只堵住「`toISOString()` 写在前面」的写法，
//   本族补上「先拿到 ISO 串、再 slice 前 10 位」。
const RE_SLICE10 = new RegExp('\\.slice\\(0,\\s*' + '10\\)');
const SLICE10_FACE = join(ROOT, 'docs', 'src');

/**
 * 存量基线（2026-11-16 T10 实测 45 处；T5 已清掉 6 处取 ISO 日的写法 ⇒ 现 39 处；**只减不增**）。
 * 键＝`相对路径:行号`（行号随改动漂移：改动命中行**上方**代码须同批改准本常量）；
 * 值＝一句 reason（为什么这一处可以留到后面清；修掉一处须同批删条目，否则 D1c 判红提示下调）。
 * 余下 39 条均为 ISO 日展示 / 键归一化 / 列表截断（见下方边界），各自 reason 说明用途。
 */
const SLICE10_BASELINE = Object.freeze({
  'docs/src/components/governance/person-profile-sections.js:189': '显示 submittedAt（思想汇报卡副题）',
  'docs/src/components/governance/resolution-followup-manager.js:43': '显示 completedAt（落实项时限文案）',
  'docs/src/components/governance/work-overview.js:581': '显示 completedAt（「完成于」文案）',
  'docs/src/components/governance/work-overview.js:914': '显示 submittedAt（上报卡副题）',
  'docs/src/components/governance/work-overview.js:954': '显示 submittedAt（上报卡副题）',
  'docs/src/components/record/inspector.js:763': '显示 recordedAt（记录人副题）',
  'docs/src/components/record/inspector.js:859': '显示 brandDesignatedAt（品牌活动说明）',
  'docs/src/components/sections/help-catalog.js:180': '列表截断（uniqueHits 取前 10；非日期）',
  'docs/src/components/sections/references.js:530': '显示 updatedAt（参考卡副题）',
  'docs/src/core/domain/policy-defaults.js:454': '键归一化（String(base) 截前 10 字符）',
  'docs/src/core/domain/todo-derive.js:553': '日期键归一化（比较用）',
  'docs/src/data/mock-adapter.js:1122': 'targetDate 取 ISO 日（mock 适配回退分支）',
  'docs/src/entries/pages/activity-entry.js:561': '显示 brandDesignatedAt（品牌认定说明）',
  'docs/src/entries/pages/activity-entry.js:588': '显示 reviewRequest.at（审批说明）',
  'docs/src/entries/pages/activity-entry.js:1397': '显示 ddl（截止日文案）',
  'docs/src/entries/pages/branch-config-entry.js:104': '显示 from / to（任期区间）',
  'docs/src/entries/pages/branch-readonly-entry.js:113': '列表截断（branchActivities 取前 10；非日期）',
  'docs/src/entries/pages/branch-readonly-entry.js:114': '显示 activity.date（活动日期）',
  'docs/src/entries/tabs/org/activity-calendar-tab.js:38': 'iso 串 → 日串（日历取日）',
  'docs/src/entries/tabs/org/member-flow-tab.js:277': '显示 revokedAt（撤销说明）',
  'docs/src/entries/tabs/org/talent-tab.js:69': '解析 dateStr 构造 Date（取日）',
  'docs/src/entries/tabs/org/talent-tab.js:111': '显示 ch.at（预备期提示）',
  'docs/src/entries/tabs/org/talent-tab.js:113': '显示 ch.at（预备期提示）',
  'docs/src/entries/tabs/org/talent-tab.js:228': '显示 last.recordedAt（最近考察）',
  'docs/src/entries/tabs/org/talent-tab.js:229': '显示 last.recordedAt（最近考察）',
  'docs/src/entries/tabs/org/taskforce-tab.js:708': '显示 completedAt（任务完成文案）',
  'docs/src/entries/tabs/org/thought-review-tab.js:125': '显示 submittedAt（汇报卡副题）',
  'docs/src/entries/tabs/party-committee/content-tab.js:104': '日串归一化（内容日期列）',
  'docs/src/entries/tabs/party-committee/dispatch-tab.js:339': '显示 publishExpiresAt（公开到期）',
  'docs/src/entries/tabs/secretary/agenda-form.js:223': '显示 approval.at（议程审批日）',
  'docs/src/entries/tabs/secretary/group-progress-tab.js:686': '列表截断（history 取前 10；非日期）',
  'docs/src/entries/tabs/secretary/notification-tab.js:466': 'publishDate 取日（通知日期）',
  'docs/src/services/governance/periodic-archive.js:5': '文本归一化（截前 10 字符做键）',
  'docs/src/services/governance/resolution-followup.js:110': 'deadline 取日（校验用）',
  'docs/src/services/governance/resolution-followup.js:118': 'deadline 取日（展示值）',
  'docs/src/services/member/member-flow.js:147': '显示 at（变更记录日期）',
  'docs/src/services/member/member-flow.js:224': 'at 取日（缺省值）',
  'docs/src/services/member/party-group.js:120': '显示 at（党小组记录日期）',
  'docs/src/services/member/person.js:289': 'entryDate 等取日（成员入册日）',
});

/** 应用面文件清单（`docs/src/**`；跳过 `mock/` 种子语料，其余与 D1 同口径） */
function collectAppFiles(dir = SLICE10_FACE, out = []) {
  for (const n of readdirSync(dir)) {
    if (n === 'node_modules' || n === '.git') continue;
    const f = join(dir, n);
    if (statSync(f).isDirectory()) { if (n !== 'mock') collectAppFiles(f, out); continue; }
    if (n.endsWith('.js') || n.endsWith('.mjs')) out.push(f);
  }
  return out;
}

/** 单文件命中（纯函数，供非空转自检共用）：整行注释不判；返回 `{ line, text }`（text 供报红） */
function slice10Hits(text) {
  const out = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const t = raw.trim();
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
    if (RE_SLICE10.test(raw)) out.push({ line: i + 1, text: t });
  });
  return out;
}

// ⚠ 边界（如实登记）：本判据按字面 `.slice(0, 10)` 扫，**无法可靠区分**用途——
//   ① 取 ISO 日（本守卫针对者，应改本地口径）；
//   ② 列表截断（`hits.slice(0, 10)` 取前 10 条）；
//   ③ 键 / 文本归一化（截前 10 字符做比较键或拼 `T00:00:00`）。
//   ②③ 存量一并入基线并逐条给 reason；**新增即红**，由人判断属哪一类（②③ 须写明理由再入基线）。
//   扫描面只到 `docs/src/**`（排除 `**/mock/**` 种子与整行注释）；服务端日期口径由 D1 / D1b 覆盖。
test('D1c 日期口径：应用面不得用 slice(0,10) 取 ISO 日（存量基线只减不增）', () => {
  // 非空转：注入样本必须判出、注释行必须不判
  assert.equal(slice10Hits('const d = iso.slice(0, 10);').length, 1, '注入的 slice(0,10) 未被判出 ⇒ 判据恒真');
  assert.equal(slice10Hits("// 旧写法 iso.slice(0, 10) 已废弃").length, 0, '注释行被误判 ⇒ 判据过严');

  const files = collectAppFiles();
  assert.ok(files.length >= 280, `只扫到 ${files.length} 个应用面文件（基线 280）：扫描面被写坏，D1c 会变恒真`);

  const hits = new Map();
  for (const f of files) {
    const rel = relative(ROOT, f).replace(/\\/g, '/');
    for (const h of slice10Hits(readFileSync(f, 'utf8'))) hits.set(`${rel}:${h.line}`, h.text);
  }

  const blank = Object.entries(SLICE10_BASELINE)
    .filter(([, reason]) => String(reason || '').trim().length < 4).map(([key]) => key);
  assert.deepEqual(blank, [], `存量基线条目缺 reason（不可审计）：${blank.join(' / ')}`);

  const known = new Set(Object.keys(SLICE10_BASELINE));
  const added = [...hits.keys()].filter((key) => !known.has(key)).sort();
  assert.deepEqual(added, [], '应用面新增了「用 slice(0,10) 取日」的写法——取「今天」请用本地口径'
    + '（前端 `core/base/date.js::todayLocal()`；服务端 `services/reporting.js::today()` / `fmtLocal()`）：\n  '
    + added.map((key) => `${key}\n      ${hits.get(key)}`).join('\n  '));

  const gone = [...known].filter((key) => !hits.has(key)).sort();
  assert.deepEqual(gone, [], '基线内命中已消失：请同批删除 SLICE10_BASELINE 对应条目（只减不增；'
    + '改动命中行上方代码导致行号漂移也按此处理）：\n  ' + gone.join('\n  '));
});

test('D2 非空转：本地口径单一源在位（前端零依赖叶子 ＋ 服务端单一源 ＋ constants 叶子不变量）', () => {
  const fe = readFileSync(join(ROOT, 'docs', 'src', 'core', 'base', 'date.js'), 'utf8');
  assert.match(fe, /export function todayLocal\(\)/, '前端叶子 `core/base/date.js` 未导出 `todayLocal`');
  assert.ok(!/^import[\s{]/m.test(fe), '前端 `core/base/date.js` 必须是**零依赖叶子**（否则 constants 不能引它）');

  const be = readFileSync(join(ROOT, 'server', 'services', 'reporting.js'), 'utf8');
  assert.match(be, /export function today\(\)/, '服务端单一源 `services/reporting.js` 未导出 `today`');
  assert.match(be, /export function fmtLocal\(d\)/, '服务端单一源 `services/reporting.js` 未导出 `fmtLocal`');

  const cst = readFileSync(join(ROOT, 'docs', 'src', 'core', 'domain', 'constants.js'), 'utf8');
  const imps = (cst.match(/^import[\s{]/gm) || []).length;
  assert.equal(imps, 1, `constants.js 只许 1 条 import（零依赖叶子）——实为 ${imps} 条；`
    + '它被全站 import 且要求双端可载，加依赖须先想清楚（见本文件头注）');
  assert.match(cst, /from '\.\.\/base\/date\.js/, 'constants.js 的唯一条 import 应指向零依赖叶子 `../base/date.js`');

  // 前端 `utils.js` 对本件做**转出**（既有 `from '…/utils.js'` 调用点不变）
  const utils = readFileSync(join(ROOT, 'docs', 'src', 'core', 'base', 'utils.js'), 'utf8');
  assert.match(utils, /export \{ _fmtDate, todayLocal \} from '\.\/date\.js/, 'utils.js 未转出 `date.js` 的口径函数');
});
