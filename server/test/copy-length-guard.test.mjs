// role: [工程师]+[AI]
// copy-length-guard.test.mjs — 「界面文案字数 / 括注 / 空态」存量回归防线（2026-09-25 文案存量清理批）
//
// 判据原文（DESIGN_SYSTEM §4.18 C1 / C2 / C5 / C6，逐字照录，**不得自创更严 / 更宽**）：
//   C1「**面板/卡片导语 ≤ 60 字**，其后直接是控件或数据」；
//      判据：「卡片内**首个**文本块的 `[...textContent.replace(/\s+/g,'')].length ≤ 60`。超 60 ⇒ 改为
//      「一行摘要（≤60）＋ `<details>` 折叠全文」」
//   C2「**单个连续说明段 ≤ 80 字**；超 80 必须拆段或折叠」；
//      判据：「任一**不在关闭的 `details` 内 / 非 `summary`** 的块元素 `textContent` 去空白后 `> 80` ⇒ 红」
//   C5「**单句括注 ≤ 2 个**（`（…）` 计数，含半角 `(...)`）」；判据：「单块内 `（` 出现 `≥3` 次 ⇒ 红」
//   C6「**空态/错误态 ≤ 30 字**，只写「为什么空 ＋ 下一步动作」，不写安慰话 / 承诺」；
//      判据：「空态容器（`.is-empty` / 「暂无 / 还没有」起始的块）文案 `> 30` 字 ⇒ 红」
//   ⇒ 阈值 N1=60 / N2=80 / N5=3 / N6=30，全部取自上表，本守卫不改。
//
// 判红面与抽取口径（**源码静态近似**；与 copy-master-guard 的抽取同族，差异逐条写明）：
//   · 面 ＝ `docs/src/**/*.js`，**减去** ① `docs/src/mock/**`（演示数据，非界面文案；§4.18.1 已认定
//     「最重几屏的字数主要来自运行时数据」）② `docs/src/core/function-catalog.js`（功能总览数据源，
//     渲染在 `about.html` / `help.html` 两张**文档页**上——§4.18.1 明确文档页不受本节约束）。
//   · 同族步骤（与 copy-master-guard 一致）：剥注释（`//` · `/* */` · `<!-- -->`）→ 解 HTML 实体 → 去空白（含全角空格）。
//   · **差异（为什么必须加，见报告 ⑦）**：copy-master-guard 只需「整份文件的可见文本」做 ≥20 字重合搜索，
//     故「剥标签→去空白」得一条长串即可；C1/C2/C5/C6 判的是**块元素/文本块**，若照搬「整份文件」口径会把
//     JS 代码、mock 数据、CSS 串一并当成「块」⇒ 长度失真。故本守卫把口径收成**块级**：
//       (a) 只取**反引号模板串**（界面 HTML 几乎都在模板串里），并剥 `${…}`（花括号配对 ⇒ 表达式代码不落入文案；
//           插值属**运行时数据**，§4.18.1 认定其非界面文案，剥离方向 = 本口径**不更严**）；
//       (b) 折叠不计入：整段删 `<details>…</details>`（含其 `summary`——C2 原文亦明确排除 summary，
//           §4.18.5「折叠内容不计入视线」）；
//       (c) 控件不计入：删 `<button>/<a>/<select>/<textarea>/<option>/<label>…</…>` 与 `<input>`（§4.18.5 可见文案排除控件父链）；
//       (d) **块元素**＝块级标签（p/div/li/ul/ol/section/article/aside/header/footer/main/nav/h1-6/td/th/tr/table/
//           thead/tbody/form/blockquote/pre/figure/figcaption/dl/dt/dd/fieldset/legend/caption/br）切段后的段文本；
//           段内联标签（strong/em/code/span…）随标签去掉 ⇒ 归并进同一段。
//   · 「说明性文本块」＝段文本含**汉字**（纯 ASCII 路径 / 类名 / 标识符不是「说明段」，同 C7 守卫对「整句」的收窄）。
//
// 判红 / 判据：
//   L1 卡片导语 >60（C1）：模板串内、class 命中「卡片容器」的容器里**首个**文本块 = 导语候选；>60 ⇒ 红
//   L2 单段 >80（C2）：块元素段文本 >80 ⇒ 红
//   L3 单句括注 ≥3（C5）：段内 `（`＋`(` 计数 ≥3 ⇒ 红
//   L4 空态 >30（C6）：以「暂无 / 还没有」起始的段或独立字符串字面量（`emptyMessage:` 等）>30 ⇒ 红
//   L5 非空转：① 抽取口径正 / 负例（含 60/61 · 80/81 · 3/2 · 30/31 边界）② 基线规模下限 ＋ 条目数一致
//              ③ 僵尸登记（基线文件不存在 / 该文件该类命中已清零）
//   L6 缩减进度（只报不判）：四类当前命中数与基线对照、逐条列出现存命中
//
// 收基线纪律：把长说明改成「一行摘要（≤60）＋ `<details>` 折叠 ＋ help 深链」后，**同一批**从下方
//   BASELINE_* 删条目 / 减计数——进度自动前进；**不得**为变绿把新命中补进基线。
// 运行：node --test server/test/copy-length-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SRC = join(ROOT, 'docs', 'src');

/** 判据阈值（DESIGN_SYSTEM §4.18 C1/C2/C5/C6 原文值，逐字取自上表） */
const N1 = 60;  // 面板/卡片导语
const N2 = 80;  // 单个连续说明段
const N5 = 3;   // 单句括注个数
const N6 = 30;  // 空态/错误态

/** 面：docs/src 下全部 .js，减去演示数据与文档页数据源（理由见文件头） */
const SKIP_DIRS = ['mock', 'vendor', 'node_modules'];
const SKIP_FILES = ['docs/src/core/function-catalog.js'];

/** 块级标签（切段边界；单一源，L1–L4 共用） */
const BLOCK_TAGS = ['p', 'div', 'li', 'ul', 'ol', 'section', 'article', 'aside', 'header', 'footer', 'main',
  'nav', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'td', 'th', 'tr', 'table', 'thead', 'tbody', 'form',
  'summary', 'blockquote', 'pre', 'figure', 'figcaption', 'dl', 'dt', 'dd', 'fieldset', 'legend', 'caption', 'br'];
const BLOCK_RE = new RegExp(`</?(?:${BLOCK_TAGS.join('|')})\\b[^>]*>`, 'gi');
/** 控件容器（整段删；§4.18.5 可见文案排除控件父链） */
const CTRL_RE = /<(button|a|select|textarea|option|label)\b[\s\S]*?<\/\1>/gi;
/** 卡片/面板容器识别（C1）：class 里含以 card 结尾的类名（card / help-card / stat-card / doc-card …）或 panel / doc-lead */
const CARD_RE = /(?:^|[\s"'`-])(?:[a-z0-9-]*-)?card(?:[\s"'`-]|$)|panel|doc-lead/;
/** 容器标签（L1 走标签栈时入栈的标签） */
const CONTAINERS = new Set(['div', 'section', 'article', 'aside', 'li', 'form', 'fieldset', 'td', 'tr', 'table', 'details', 'nav', 'header', 'footer', 'main']);
/** 空态/错误态起始词（C6 原文给的两种：`.is-empty` 容器 / 「暂无 / 还没有」起始） */
const EMPTY_RE = /^(?:暂无|还没有)/;

// ── 抽取口径（单一源；L1–L6 与 L5 自检共用） ─────────────────────────────
/** 剥注释（与 copy-master-guard / ux-guard 同口径；CRLF 先归一，否则 `/\/\/.*$/` 会因 \r 失配） */
function stripComments(src) {
  let s = String(src).replace(/\r\n?/g, '\n');
  s = s.replace(/\/\*[\s\S]*?\*\//g, ' ');
  s = s.replace(/<!--[\s\S]*?-->/g, ' ');
  return s.split('\n').map((line) => line.replace(/\/\/.*$/, '')).join('\n');
}

/** HTML 实体 → 字（与 copy-master-guard 同一子集 + 数字实体） */
function decodeEntities(s) {
  return String(s)
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');
}

/** 汉字个数（「说明性文本块」判据：至少 1 个汉字） */
function cjkCount(s) {
  return (String(s).match(/[\u4e00-\u9fff]/g) || []).length;
}

/** 取全部反引号模板串内容；串内 `${…}`（花括号配对，含嵌套）整体剥掉（插值＝运行时数据，非文案） */
export function templatesOf(src) {
  const out = [];
  let i = 0;
  const n = String(src).length;
  while (i < n) {
    if (src[i] === '`') {
      i += 1;
      let buf = '';
      while (i < n) {
        const ch = src[i];
        if (ch === '\\') { buf += src.slice(i, i + 2); i += 2; continue; }
        if (ch === '$' && src[i + 1] === '{') {
          let d = 1; i += 2;
          while (i < n && d > 0) { const c = src[i]; if (c === '{') d += 1; else if (c === '}') d -= 1; i += 1; }
          continue;
        }
        if (ch === '`') { i += 1; break; }
        buf += ch; i += 1;
      }
      out.push(buf);
      continue;
    }
    i += 1;
  }
  return out;
}

/** 模板串清洗：删 script/style、折叠区（含 summary）、控件容器、input（见文件头 (b)(c)） */
function cleanTemplate(tpl) {
  return String(tpl)
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<details\b[\s\S]*?<\/details>/gi, ' ')
    .replace(CTRL_RE, ' ')
    .replace(/<input\b[^>]*>/gi, ' ');
}

/** 块元素切段 ⇒ 段文本数组（去空白；留含汉字者） */
export function blocksOfTemplate(tpl) {
  const s = cleanTemplate(tpl).replace(BLOCK_RE, '\n').replace(/<[^>]*>/g, ' ');
  return decodeEntities(s).split('\n').map((t) => t.replace(/[\s\u3000]+/g, '')).filter((t) => t && cjkCount(t) > 0);
}

/** 卡片/面板容器内「首个文本块」＝导语候选（C1）；标签栈按文档序走，容器只认一次首块 */
export function cardLeadsOfTemplate(tpl) {
  const s = cleanTemplate(tpl);
  const out = [];
  const stack = [];
  const tok = /(<[^<>]*>)|([^<>]+)/g;
  let m;
  while ((m = tok.exec(s))) {
    if (m[1]) {
      const tag = m[1];
      const close = /^<\/([a-zA-Z0-9]+)/.exec(tag);
      if (close) {
        const name = close[1].toLowerCase();
        for (let k = stack.length - 1; k >= 0; k -= 1) { if (stack[k].name === name) { stack.length = k; break; } }
        continue;
      }
      const open = /^<([a-zA-Z0-9]+)/.exec(tag);
      if (!open) continue;
      const name = open[1].toLowerCase();
      if (tag.endsWith('/>') || !CONTAINERS.has(name)) continue;
      const cls = (/class\s*=\s*"([^"]*)"/.exec(tag) || /class\s*=\s*'([^']*)'/.exec(tag) || [, ''])[1];
      stack.push({ name, isCard: CARD_RE.test(cls), seen: false });
      continue;
    }
    const t = decodeEntities(m[2]).replace(/[\s\u3000]+/g, '');
    if (!t || !cjkCount(t)) continue;
    for (let k = stack.length - 1; k >= 0; k -= 1) {
      if (stack[k].isCard && !stack[k].seen) { stack[k].seen = true; out.push(t); break; }
    }
  }
  return out;
}

/** 独立字符串字面量里以「暂无 / 还没有」起始的块（C6 的 emptyMessage 等走这里；模板块走 blocksOfTemplate） */
export function emptyStringsOf(src) {
  const s = stripComments(src);
  const out = [];
  const re = /([`'"])((?:暂无|还没有)[^`'"\n]*)\1/g;
  let m;
  while ((m = re.exec(s))) {
    const t = decodeEntities(m[2]).replace(/[\s\u3000]+/g, '');
    if (t) out.push(t);
  }
  return out;
}

/** 括注计数（C5：全角 `（` 与半角 `(` 都算） */
export function parenCount(s) {
  return (s.match(/（/g) || []).length + (s.match(/\(/g) || []).length;
}

/** 递归收集判红面文件 */
function scanFiles() {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.includes(e.name)) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.js')) out.push(p);
    }
  };
  walk(SRC);
  return out.sort().map((p) => relative(ROOT, p).replace(/\\/g, '/')).filter((f) => !SKIP_FILES.includes(f));
}

/** 逐文件抽取四类命中 */
function scan() {
  return scanFiles().map((file) => {
    const src = readFileSync(join(ROOT, file), 'utf8');
    const blocks = [];
    const leads = [];
    for (const tpl of templatesOf(stripComments(src))) {
      blocks.push(...blocksOfTemplate(tpl));
      leads.push(...cardLeadsOfTemplate(tpl));
    }
    const empties = [...blocks.filter((b) => EMPTY_RE.test(b)), ...emptyStringsOf(src)];
    return {
      file,
      leads,
      blocks,
      c1: leads.filter((t) => t.length > N1),
      c2: blocks.filter((t) => t.length > N2),
      c5: blocks.filter((t) => parenCount(t) >= N5),
      c6: [...new Set(empties.filter((t) => t.length > N6))],
    };
  });
}

// ── 基线（现存命中项；只为「新增」判红；收基线见文件头纪律） ──────────────
/** C1：卡片导语 >60 的现存命中（2026-09-25 收基线时实测：**0 条**——现存卡片首块全部 ≤60；
 *  非空转由 L5 的「导语候选数 ≥ 100」保证，不是空壳）。 */
const BASELINE_C1 = {};
/** C2：单段 >80 的现存命中（文件 → 段文本数组）。2026-09-25 收基线时逐条读过：
 *  全部是**不在本批授权面内**的界面说明段（`org-setup-wizard` 换组织向导 / `settings-entry` 设置页 ——
 *  settings.html 刚整体重做、本批不动）与 `notice-entry` / `branches-tab` / `inspection-tab` /
 *  `leader/attendance-tab` / `group-progress-tab` 的既有长说明；`init-reset.js` 一条是控制台初始化提示
 *  （模板串，非界面文案——静态口径的已知噪声，如实登记待收）。⇒ 只为「新增」判红，待各自批次收。 */
const BASELINE_C2 = {
  'docs/src/components/governance/org-setup-wizard.js': [
    '换组织向导的配置权限：党委组织员（party-staff）可配置任意支部；本支部现任支书/副支书（副书同权）仅可配置自己的支部（config写口校验同branch服务既有语义）。',
    '新支部为空、支书席位空缺：勾选后创建时一并就地任命首任骨干——新任支书凭本人账号登录即可接管该支部（组织信息/模块/名册可在支书工作台与支部配置中继续完善）。任命对象来自现有成员（演示=跨支部兼任/调任）：若其在原支部任支委/组长，原支部对应席位将空缺（界面明示）；人员后续也可在成员管理/名单导入中补入新支部后再次调整。',
    '新支部为空：config默认全开、业务域为空、支书席位空缺——勾选上方「就地任命首任骨干」时随创建一并任命（已就地任命首任支书/组织委员者，创建后即建册、支书登录即可接管新支部）；不勾选则按原路径：创建后在下方分步填入组织信息/模块/分工，或按「换壳工作单」补数据。记录变更：config.configChangeHistory追加branch-created。',
    '下载「成员名单模板」→按真实名册改JSON→「导入名单(JSON)预览」：应到人数/党员分布即时可见变化（⑤验证与重置、纪检考勤等的应到名单来源一致）；「清除预览」一键回种子。',
  ],
  'docs/src/entries/notice-entry.js': [
    '申诉「能，线上参加」后：本场考勤记请假、不计入出席、不补课（纪检委员确认时以实际记录为准）。不申报或不能线上参会的，按实际考勤记录判：请假未参会、未请假缺席均须补课。',
  ],
  'docs/src/entries/settings-entry.js': [
    '提示：排序与恢复默认仅对当前账号（）生效，不影响支部默认顺序与他人。核心固定页签「」为全员必有，不可拖动、隐藏或排序；新页签由支部统一配置后出现，默认排于业务页签之后。',
    '办活动要不要先过一道批准门。默认关闭：关闭时活动写入与现在完全一样（写入即照常推进）；开启后写入即落「待批」，批准前不推进、批准后才发布、不批准则终止。档位可定「」或「」。',
  ],
  // 2026-09-27（设置页可调性批次）：原「支部制度里的可调项分两类…」长段已拆成多条一行摘要
  //   （每条 ≤80 字、单句括注 ≤2）⇒ C2 5→4；该段原为 C5 唯一命中（括号数 ≥3）⇒ C5 1→0，条目同步移除。
  //   同批：help 侧把「配置变更记录 / 归属判定」两句搬成同义段（与界面 ≥20 字重合）⇒ 界面侧按 C7
  //   收成一行摘要（≤80），两处 C2 命中消失、条目移除 ⇒ C2 4→2。
  'docs/src/entries/tabs/disc/inspection-tab.js': [
    '以人为第一列·随记录产生即时更新（没有「本月待汇总的表」）。未闭环＝已有考察记录未确认；超期＝未确认超过天。点姓名去推动闭环——督办不等于接手，建档与核对仍归组织委员；已确认的单条有误可「打回」，交上传方重新确认。',
  ],
  'docs/src/entries/tabs/leader/attendance-tab.js': [
    '考勤上传：组织者上传→纪检委员确认→录入考勤明细。仅列本组党小组会与本人为组织者的活动（主题党日/组织生活会等）；党课/支部党员大会的上传位在纪检委员（纪检台「会议考勤录入」），支委会不考勤；组长非组织者=本组监督位，督促上传',
  ],
  'docs/src/entries/tabs/party-committee/branches-tab.js': [
    '仅空支部可整体替换：下载「成员名册模板(JSON)」→保留要迁入本支部的成员行、删去其余→「选择名册文件」导入：净化后先核对下方统计卡，确认后一次保存——成员/应到统计即时更新。有成员/历史的支部不可整表替换，成员调整由本支部组织委员在「成员名册」逐人维护。',
  ],
  'docs/src/entries/tabs/secretary/group-progress-tab.js': [
    '党小组发起或承办的活动（活动方向「自下而上」）在此归集，点行看详情；支部部署的活动见「活动管理」。新建走既有「写入活动」，填表时在「高级选项·发起方向」选「自下而上」。',
  ],
  'docs/src/services/core/init-reset.js': [
    '[InitReset]?reset=init已初始化为「新支部初始态」：业务过程数据已清空（个独立业务键移除+主库业务域置空），白名单保留（账号/成员档案/支部配置/在册状态/主题/登录会话），正在刷新',
  ],
};
/** C5：单句括注 ≥3 的现存命中。`org-setup-wizard` / `settings-entry` 属授权面外的长说明；
 *  `leader/attendance-tab` 一条是真界面文案；`branch-doc.js` 一条是**代码串**（静态口径已知噪声）。 */
const BASELINE_C5 = {
  'docs/src/components/governance/org-setup-wizard.js': [
    '换组织向导的配置权限：党委组织员（party-staff）可配置任意支部；本支部现任支书/副支书（副书同权）仅可配置自己的支部（config写口校验同branch服务既有语义）。',
    '新支部为空、支书席位空缺：勾选后创建时一并就地任命首任骨干——新任支书凭本人账号登录即可接管该支部（组织信息/模块/名册可在支书工作台与支部配置中继续完善）。任命对象来自现有成员（演示=跨支部兼任/调任）：若其在原支部任支委/组长，原支部对应席位将空缺（界面明示）；人员后续也可在成员管理/名单导入中补入新支部后再次调整。',
  ],
  'docs/src/entries/tabs/leader/attendance-tab.js': [
    '本组（）应到人（组内党员−滞留剔除）。滞留者已在候选中标灰禁选（悬浮查看备注）：',
  ],
  // 2026-09-27（设置页可调性批次）：原 `settings-entry.js` 的「支部制度里的可调项分两类…」一条为
  //   该文件唯一 C5 命中；本批把该长段拆成多条一行摘要（每条括注 ≤2）⇒ 该文件 C5 归零、条目移除（收基线）。
  'docs/src/services/branch/branch-doc.js': [
    "if(!isInstitutionManager(role))return{ok:false,reason:'制度文本仅限支书（含副支书）操作'};",
  ],
};
/** C6：空态 >30 的现存命中（全站实测 4 处，与 §4.18.2 C6 的「全站实测 4 处」一致；最长 41 字） */
const BASELINE_C6 = {
  'docs/src/entries/tabs/org/taskforce-tab.js': [
    '暂无待核条目——专班成员在本专班详情「我的产出填报」提交产出后，此处逐条核验',
  ],
  'docs/src/entries/tabs/secretary/group-progress-tab.js': [
    '暂无党小组发起的活动（方向「自下而上」）——新建时选「自下而上」即在此归集',
  ],
  'docs/src/entries/tabs/secretary/report-up-tab.js': [
    '暂无上报记录·支部关键事项（发展节点/重要活动）上报后，党委批/驳结论将显示在这里',
  ],
  'docs/src/modules/references.js': [
    '暂无制度文本——可在「写入文件」中选择「制度文本」发布（支书/副支书）',
  ],
};

/** 基线规模（下限防「口径失效 / 台账被删减」；条目数一致防「改台账不如实声明」）
 *  2026-09-25 收基线实测值：C1 0/0 · C2 8 文件/15 条 · C5 4 文件/5 条 · C6 4 文件/4 条。
 *  2026-09-27（设置页可调性批次）收基线：settings-entry 长段拆成一行摘要 ⇒ C2 15→14（文件 8 不变）、
 *    C5 5→4（文件 4→3：settings-entry 该类归零、条目移除）；再随 help 侧同义段收「配置变更记录 / 归属判定」
 *    两处 C2 命中 ⇒ C2 14→12（文件 8 不变）。 */
const BASE_C1_FILES = 0;
const BASE_C1_TOTAL = 0;
const BASE_C2_FILES = 8;
const BASE_C2_TOTAL = 12;
const BASE_C5_FILES = 3;
const BASE_C5_TOTAL = 4;
const BASE_C6_FILES = 4;
const BASE_C6_TOTAL = 4;

/** 「导语候选」下限（非空转：L1 若一个卡片都认不出 ⇒ 恒真） */
const LEAD_CANDIDATE_FLOOR = 100;
/** 「说明段」候选下限（非空转：L2/L3 若抽取口径失效 ⇒ 恒真） */
const BLOCK_CANDIDATE_FLOOR = 1000;

const SCAN = scan();
const countOf = (key) => SCAN.reduce((a, r) => a + r[key].length, 0);
const filesOf = (key) => SCAN.filter((r) => r[key].length).length;

// ── L1 卡片导语 >60（C1） ───────────────────────────────────────────────
test(`L1 面板/卡片导语 ≤${N1} 字（基线 ${BASE_C1_TOTAL} 条 / ${BASE_C1_FILES} 文件）`, () => {
  const offenders = [];
  for (const { file, c1 } of SCAN) {
    const known = new Set(BASELINE_C1[file] || []);
    for (const t of c1) if (!known.has(t)) offenders.push(`${file} → 「${t}」（${t.length} 字）`);
  }
  assert.deepEqual(offenders, [],
    `面板/卡片导语超 ${N1} 字（DESIGN_SYSTEM §4.18 C1）——改为「一行摘要（≤60）＋ <details> 折叠全文」：\n  ${offenders.join('\n  ')}`);
});

// ── L2 单段 >80（C2） ───────────────────────────────────────────────────
test(`L2 单个连续说明段 ≤${N2} 字（基线 ${BASE_C2_TOTAL} 条 / ${BASE_C2_FILES} 文件）`, () => {
  const offenders = [];
  for (const { file, c2 } of SCAN) {
    const known = new Set(BASELINE_C2[file] || []);
    for (const t of c2) if (!known.has(t)) offenders.push(`${file} → 「${t}」（${t.length} 字）`);
  }
  assert.deepEqual(offenders, [],
    `单个连续说明段超 ${N2} 字（DESIGN_SYSTEM §4.18 C2）——须拆段或折叠：\n  ${offenders.join('\n  ')}`);
});

// ── L3 单句括注 ≥3（C5） ────────────────────────────────────────────────
test(`L3 单句括注 ≤${N5 - 1} 个（基线 ${BASE_C5_TOTAL} 条 / ${BASE_C5_FILES} 文件）`, () => {
  const offenders = [];
  for (const { file, c5 } of SCAN) {
    const known = new Set(BASELINE_C5[file] || []);
    for (const t of c5) if (!known.has(t)) offenders.push(`${file} → 「${t}」（${parenCount(t)} 个括注）`);
  }
  assert.deepEqual(offenders, [],
    `单句括注 ≥${N5} 个（DESIGN_SYSTEM §4.18 C5）——批次号 / 裁定日期 / 源码位一律进折叠区：\n  ${offenders.join('\n  ')}`);
});

// ── L4 空态 >30（C6） ───────────────────────────────────────────────────
test(`L4 空态/错误态 ≤${N6} 字（基线 ${BASE_C6_TOTAL} 条 / ${BASE_C6_FILES} 文件）`, () => {
  const offenders = [];
  for (const { file, c6 } of SCAN) {
    const known = new Set(BASELINE_C6[file] || []);
    for (const t of c6) if (!known.has(t)) offenders.push(`${file} → 「${t}」（${t.length} 字）`);
  }
  assert.deepEqual(offenders, [],
    `空态/错误态超 ${N6} 字（DESIGN_SYSTEM §4.18 C6）——只写「为什么空 ＋ 下一步动作」：\n  ${offenders.join('\n  ')}`);
});

// ── L5 非空转自检 ───────────────────────────────────────────────────────
test('L5 非空转：抽取口径可用（含 4 处阈值边界）+ 候选 / 基线规模达标 + 无僵尸登记', () => {
  // ① 抽取口径正例：模板串里的说明段会被抽出（含内联标签归并）
  assert.deepEqual(blocksOfTemplate('<p>党员应到＝正式<strong>＋</strong>预备党员</p>'), ['党员应到＝正式＋预备党员'],
    '抽取口径失效：模板串里的说明段没被抽出（守卫会恒真）');
  // ① 负例：折叠区（details）不计入（含 summary）
  assert.deepEqual(blocksOfTemplate('<details><summary>口径 ▾</summary><p>很长的一段说明</p></details>'), [],
    '抽取口径过宽：折叠区里的文字被当成可见文案（§4.18.5 折叠内容不计入）');
  // ① 负例：控件文案不计入（§4.18.5 可见文案排除控件父链）
  assert.deepEqual(blocksOfTemplate('<button>新建线上支委会</button><a href="#">见帮助</a>'), [],
    '抽取口径过宽：控件里的文字被当成说明性文本');
  // ① 负例：非模板串（代码 / 单引号数据）不入块面
  assert.deepEqual(templatesOf("const s = '<p>很长的说明性文本</p>';"), [],
    '抽取口径过宽：单引号字符串被当成界面模板串');
  // ① 边界：C1 60/61、C2 80/81、C5 2/3、C6 30/31
  const mk = (n) => '说'.repeat(n);
  assert.equal(blocksOfTemplate(`<p>${mk(80)}</p>`)[0].length, 80, 'C2 边界：80 字应被抽出');
  assert.equal(blocksOfTemplate(`<p>${mk(80)}</p>`).filter((t) => t.length > N2).length, 0, 'C2 边界过宽：80 字被判红（原文为 >80）');
  assert.equal(blocksOfTemplate(`<p>${mk(81)}</p>`).filter((t) => t.length > N2).length, 1, 'C2 边界失效：81 字没被判红');
  assert.equal(cardLeadsOfTemplate(`<div class="card">${mk(60)}</div>`)[0].length, 60, 'C1 边界：60 字应被抽出');
  assert.equal(cardLeadsOfTemplate(`<div class="card">${mk(60)}</div>`).filter((t) => t.length > N1).length, 0, 'C1 边界过宽：60 字被判红（原文为 >60）');
  assert.equal(cardLeadsOfTemplate(`<div class="card">${mk(61)}</div>`).filter((t) => t.length > N1).length, 1, 'C1 边界失效：61 字没被判红');
  assert.equal(parenCount('（甲）（乙）'), 2, 'C5：2 个全角括注应数出 2');
  assert.equal(parenCount('（甲）（乙）(丙)'), 3, 'C5：全角 + 半角应一起数');
  assert.equal(emptyStringsOf("emptyMessage: '暂无反馈 · 成员提交后在此逐条核查'").length, 1, 'C6 边界失效：emptyMessage 字符串没被抽出');
  assert.equal(emptyStringsOf("x = '还没有数据'")[0].length, 5, 'C6：字符串段应抽出（去空白后长度）');

  // ② 候选规模下限（低于此值说明抽取口径失效，L1 / L2 会变成恒真）
  const leads = countOf('leads');
  const blocks = countOf('blocks');
  assert.ok(leads >= LEAD_CANDIDATE_FLOOR, `卡片导语候选只剩 ${leads} 个（下限 ${LEAD_CANDIDATE_FLOOR}）：抽取口径失效`);
  assert.ok(blocks >= BLOCK_CANDIDATE_FLOOR, `说明段候选只剩 ${blocks} 个（下限 ${BLOCK_CANDIDATE_FLOOR}）：抽取口径失效`);

  // ③ 基线规模与条目数一致
  const BASE = [
    ['C1', BASELINE_C1, BASE_C1_FILES, BASE_C1_TOTAL],
    ['C2', BASELINE_C2, BASE_C2_FILES, BASE_C2_TOTAL],
    ['C5', BASELINE_C5, BASE_C5_FILES, BASE_C5_TOTAL],
    ['C6', BASELINE_C6, BASE_C6_FILES, BASE_C6_TOTAL],
  ];
  for (const [name, map, files, total] of BASE) {
    assert.equal(Object.keys(map).length, files, `${name} 基线文件数与声明值不一致（改台账须同步声明）`);
    assert.equal(Object.values(map).reduce((a, v) => a + v.length, 0), total, `${name} 基线条数与声明值不一致`);
  }

  // ④ 僵尸登记：基线文件必须存在，且该文件该类命中仍 ≥ 基线条数
  for (const [name, map] of BASE) {
    const gone = Object.keys(map).filter((f) => !existsSync(join(ROOT, f)));
    assert.deepEqual(gone, [], `${name} 基线指向不存在的文件（应删该条）：\n  ${gone.join('\n  ')}`);
  }
  const emptied = [];
  for (const [name, map, , ] of BASE) {
    const key = { C1: 'c1', C2: 'c2', C5: 'c5', C6: 'c6' }[name];
    for (const r of SCAN) if (map[r.file] && r[key].length < map[r.file].length) emptied.push(`${name} ${r.file}：基线 ${map[r.file].length} → 现存 ${r[key].length}`);
  }
  assert.deepEqual(emptied, [], `以下文件该类命中已减少，应从基线删条目 / 减计数（收基线）：\n  ${emptied.join('\n  ')}`);
});

// ── L6 缩减进度（只报不判） ────────────────────────────────────────────
test('L6 缩减进度：四类当前命中数与基线对照（逐条列出现存命中）', () => {
  const d = (cur, base) => (cur === base ? '持平' : cur < base ? `↓${base - cur}` : `↑${cur - base}`);
  const rows = [
    ['C1 卡片导语 >60', 'c1', BASE_C1_TOTAL, BASE_C1_FILES],
    ['C2 单段 >80', 'c2', BASE_C2_TOTAL, BASE_C2_FILES],
    ['C5 单句括注 ≥3', 'c5', BASE_C5_TOTAL, BASE_C5_FILES],
    ['C6 空态 >30', 'c6', BASE_C6_TOTAL, BASE_C6_FILES],
  ];
  console.log(`[文案字数守卫] 卡片导语候选 ${countOf('leads')} · 说明段候选 ${countOf('blocks')}`);
  for (const [label, key, total, files] of rows) {
    console.log(`  · ${label}：命中 ${countOf(key)} 条（基线 ${total}，${d(countOf(key), total)}）· 文件 ${filesOf(key)}（基线 ${files}）`);
  }
  for (const r of SCAN) {
    for (const [label, key] of [['C1', 'c1'], ['C2', 'c2'], ['C5', 'c5'], ['C6', 'c6']]) {
      for (const t of r[key]) console.log(`    ${label} ${r.file} → 「${t}」`);
    }
  }
  console.log('[收基线提示] 把长说明改成「一行摘要 ＋ <details> ＋ help 深链」后，同批删基线条目 / 减计数，进度即前进；不得为变绿补条目。');
  // 取基线工具（收基线 / 重建台账时用）：设 `COPY_LEN_PRINT_BASELINE=1` 即打印可直接粘贴的字面量
  if (process.env.COPY_LEN_PRINT_BASELINE) {
    const dump = (key) => {
      const m = {};
      for (const r of SCAN) if (r[key].length) m[r.file] = r[key];
      return JSON.stringify(m, null, 2);
    };
    for (const [name, key] of [['BASELINE_C1', 'c1'], ['BASELINE_C2', 'c2'], ['BASELINE_C5', 'c5'], ['BASELINE_C6', 'c6']]) {
      console.log(`== ${name} ==\n${dump(key)}`);
    }
  }
});
