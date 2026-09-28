// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  version-next.mjs — 版本与发版治理的纯逻辑件（bump-version.mjs / release.mjs 共用，可单测）
// ════════════════════════════════════════════════════════════════
// 背景（2026-09-14 批次 28，Q-23-8 闭环）：
//   bump-version.mjs 原无参默认版本号为「当天日期 + a」——**不含当日续号逻辑**，
//   同日第二次发版若忘记显式传参，会把全站戳从 20260914b 往回写成 20260914a；
//   而收尾自检只比对「是否等于本次 VERSION」，回退后照样报「0 处残留 ✅」静默通过。
//   本模块把「下一个版本号」与「只允许前进」两条判据抽为纯函数，供脚本与守卫共用。
// ════════════════════════════════════════════════════════════════

/** 版本戳形态：8 位日期 + 1 位小写字母（与 bump-version 的全仓扫描正则同源） */
export const STAMP_RE = /^\d{8}[a-z]$/;

// ── 注释排除规则（stamper / 自检 / 守卫三处共用，勿各写一套）──
// 语义（2026-09-13 Q-21-4）：注释里的 `?v=xxx` 是人写的历史注记，不是浏览器缓存键
// → 既不改写、也不算陈旧、更不参与「活动版本戳单一源」判定。

/** 行首即是注释（整行注释） */
export function isCommentLine(line) {
  const t = String(line).trimStart();
  return t.startsWith('*') || t.startsWith('//') || t.startsWith('/*') || t.startsWith('<!--');
}

/** 去掉行尾注释后的代码部分（行尾追注的历史版本号同样属人工注记） */
export function codePartOf(line) {
  return String(line).replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
}

/**
 * 从既有戳集合推导「下一个版本号」。
 * 规则：同日期已有戳 → 取该日最大字母 +1；该日尚无戳 → `日期 + a`。
 * @param {string} today 8 位日期串（如 '20260914'）
 * @param {string[]} existingStamps 仓库内既有版本号（可含他日；非法形态自动忽略）
 * @returns {string} 下一个版本号
 */
export function nextVersionFor(today, existingStamps) {
  const list = (Array.isArray(existingStamps) ? existingStamps : [])
    .filter((s) => typeof s === 'string' && STAMP_RE.test(s));
  const sameDay = list.filter((s) => s.slice(0, 8) === today);
  if (sameDay.length === 0) return `${today}a`;
  const max = sameDay.sort().pop();
  const letter = max[8];
  if (letter === 'z') {
    throw new Error(`[version-next] 同日字母已用尽（${max}）——请改为次日发版或改用显式版本号`);
  }
  return today + String.fromCharCode(letter.charCodeAt(0) + 1);
}

/**
 * 版本号只允许前进：新版本号不得小于仓库现有最大戳。
 * @param {string} candidate 本次拟用版本号
 * @param {string} prevMax 仓库现有最大戳（可为空串）
 * @returns {boolean} true 表示前进或持平（首次发版无既有戳也算前进）
 */
export function isForward(candidate, prevMax) {
  if (!prevMax) return true;
  return String(candidate) >= String(prevMax);
}

// ════════════════════════════════════════════════════════════════
//  server/test 段：补戳「缓存键语境」判据（批次 46，Q-23-33 根治）
// ════════════════════════════════════════════════════════════════
// 为什么需要语境判据：原判据是
//   /(\/src\/[^'"?]*\.js)(\?[^'"]*)?(['"])/g
// ——只认「出现 `/src/….js` 且引号收尾」，**分不清 import 规格符与数据字符串**。
// 批 44 新增 `form-loop-registry.mjs`（字段级校验点台账，file 里写 `docs/src/…/x.js` 路径）后，
// 跑一次 bump 即把 **113 条 `file` 改成 …x.js?v=20260915d**，守卫 S4 随即报「文件不存在」。
// 而 `?v=` 只在**浏览器模块缓存键**位置才有意义（同一 query → 同一模块实例，防 ES Module 分裂）。
//
// 判据（只有下列两类语境随版本推进改写）：
//   ① 缓存键语境行——`import(…)` / 副作用 `import '…'` / `from '…'`（覆盖绝对 `/src/…` 与相对 `../../docs/src/…`）
//   ② 独立版本字面量——字符串内容**恰为** `?v=xxxxxxxxx`（如 `const V = '?v=…'`，供页面拼 import URL）
// 其余**一律逐字不变**：整行注释、Node 侧读取语境（`new URL(…?v=)` / `grab('…?v=')` / 路径字符串列表）、
//   台账形态（`SRC + '相对路径'`）。这些 `?v=` 对 fs 读取无意义（`fileURLToPath` 忽略 query），
//   是旧判据的误留；严格形态下不再由脚本管理（批次 46 已同批去掉存量）。
//
// 单一源纪律：**补戳与收尾自检必须共用本文件的判据**（守卫 `version-stamp.test.mjs::S4/S5` 断言），
//   否则会出现「补戳已收紧、自检仍按旧宽判据」→ 冻结戳被永久误报为陈旧残留。

/** 缓存键语境行：`import(` / 副作用 `import '` / `from '` */
export const CACHE_KEY_LINE_RE = /(?:\bimport\(\s*['"`]|\bimport\s+['"`]|\bfrom\s+['"`])/;

/** 独立版本字面量：字符串内容恰为 `?v=xxxxxxxxx` */
export const VERSION_LITERAL_RE = /(['"`])\?v=[0-9]{8}[a-z]\1/;

/** 任意版本戳（含前导 `?v=` 捕获组，供兜底替换与自检共用） */
export const ANY_STAMP_RE = /(\?v=)[0-9]{8}[a-z]/g;

/** import 规格符（含 `/src/` 的 .js 路径）+ 可选既有戳 */
const SPECIFIER_RE = /(\bimport\(\s*|\bimport\s+|from\s+)(['"`])([^'"`]*\/src\/[^'"`?]*\.js)(\?[^'"`]*)?(['"`])/g;

/**
 * 该行是否处于缓存键语境（整行注释一律不算——注释里的版本号是人工历史注记）。
 * @param {string} line 单行源码
 * @returns {boolean}
 */
export function isCacheKeyLine(line) {
  const raw = String(line);
  if (isCommentLine(raw)) return false;
  const code = codePartOf(raw);
  return VERSION_LITERAL_RE.test(code) || CACHE_KEY_LINE_RE.test(code);
}

/**
 * 改写单行的版本戳：**仅缓存键语境行**改写，其余逐字返回。
 * @param {string} line 单行源码
 * @param {string} version 本次版本号
 * @returns {string} 改写后的行
 */
export function stampCacheKeyLine(line, version) {
  if (!isCacheKeyLine(line)) return line;
  const withSpecifier = String(line).replace(
    SPECIFIER_RE,
    (m, pre, q1, path, _q, q2) => `${pre}${q1}${path}?v=${version}${q2}`
  );
  // 兜底：规格符正则覆盖不到的缓存键形态（如 `import(\`/src/${rel}?v=旧戳\`)`——路径含插值、不以 .js 收尾）
  return withSpecifier.replace(ANY_STAMP_RE, (m, pre) => `${pre}${version}`);
}

/**
 * 补戳整个 server/test 文件内容（逐行、行判据）。
 * @param {string} content 文件全文
 * @param {string} version 本次版本号
 * @returns {string} 改写后的全文（非缓存键语境行逐字不变）
 */
export function stampTestFileContent(content, version) {
  return String(content)
    .split('\n')
    .map((line) => stampCacheKeyLine(line, version))
    .join('\n');
}

/**
 * 提取文本「缓存键语境」下的全部版本戳（收尾自检与补戳同判据的入口）。
 * @param {string} content 文件全文
 * @returns {string[]} 去重后的版本戳
 */
export function cacheKeyStamps(content) {
  const found = [];
  for (const line of String(content).split('\n')) {
    if (!isCacheKeyLine(line)) continue;
    for (const m of codePartOf(line).matchAll(/\?v=([0-9]{8}[a-z])/g)) found.push(m[1]);
  }
  return [...new Set(found)];
}

// ════════════════════════════════════════════════════════════════
//  发版治理（2026-09-28 批次 236 · G3-1「语义化 release / 发布工作流」）
// ════════════════════════════════════════════════════════════════
// 为什么要在这里、而不在 release.mjs 里：**发版脚本与常驻守卫必须同判据**（同 `?v=` 那一层的
//   「补戳 / 自检共用」纪律）。脚本负责动作、守卫负责核账，两边若各写一套 semver 推导与
//   CHANGELOG 解析，就会出现「脚本按 A 规则升号、守卫按 B 规则核账」的静默错位。

/** 语义化版本号形态（`X.Y.Z`，三段十进制） */
export const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)$/;

/** CHANGELOG 的段落名（Keep a Changelog 允许的六类；本仓只用到前五类） */
export const CHANGELOG_KINDS = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security'];

/**
 * 由「变更类别」推导下一个语义化版本号（语义化的**判据**，不是随手 +1）：
 *   · 破坏性变更（段内出现 `BREAKING`）→ **主版本 +1**，其余归零；
 *   · 有新增（`### Added` 非空）→ **次版本 +1**，修订归零；
 *   · 其余（仅 Changed / Fixed / Removed / Security）→ **修订 +1**。
 * @param {string} current 当前版本号（`X.Y.Z`）
 * @param {{breaking?:boolean, added?:boolean, changed?:boolean, fixed?:boolean, removed?:boolean}} changes 变更类别
 * @returns {string} 下一个版本号
 */
export function nextSemver(current, changes = {}) {
  const m = SEMVER_RE.exec(String(current || ''));
  if (!m) throw new Error(`[version-next] 非法语义化版本号：${current}（须为 X.Y.Z）`);
  const [maj, min, pat] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (changes.breaking) return `${maj + 1}.0.0`;
  if (changes.added) return `${maj}.${min + 1}.0`;
  return `${maj}.${min}.${pat + 1}`;
}

/**
 * 语义化版本号只允许前进（三段落逐段比较；同号视为前进）。
 * @param {string} candidate 拟用版本号
 * @param {string} current 现有版本号（空串＝首次发版）
 * @returns {boolean}
 */
export function isSemverForward(candidate, current) {
  const a = SEMVER_RE.exec(String(candidate || ''));
  if (!a) return false;
  if (!current) return true;
  const b = SEMVER_RE.exec(String(current));
  if (!b) return false;
  for (let i = 1; i <= 3; i++) {
    const x = Number(a[i]);
    const y = Number(b[i]);
    if (x !== y) return x > y;
  }
  return true;
}

/**
 * 解析 CHANGELOG：取出 `## [Unreleased]` 段落的**类别 → 条目**，以及全部已发布版本（降序）。
 * 只认两种标题形态：`## [Unreleased]` 与 `## [X.Y.Z] - YYYY-MM-DD`（Keep a Changelog 体例）。
 * `### 类别` 只认 `CHANGELOG_KINDS` 白名单内的名字；未知类别忽略（不猜、不报错——守卫另有形态判据）。
 * @param {string} content CHANGELOG 全文
 * @returns {{unreleased: Record<string,string[]>, released: Array<{version:string,date:string}>}}
 */
export function parseChangelog(content) {
  const unreleased = {};
  const released = [];
  let section = null; // 'unreleased' | 'released'
  let version = null;
  let kind = null;
  for (const raw of String(content).split(/\r?\n/)) {
    const line = raw.trimEnd();
    const h2 = /^##\s+(.*)$/.exec(line);
    if (h2) {
      const tail = h2[1].trim();
      if (/^\[Unreleased\]/i.test(tail)) {
        section = 'unreleased';
        kind = null;
        continue;
      }
      const rel = /^\[(\d+\.\d+\.\d+)\](?:\s*-\s*(\d{4}-\d{2}-\d{2}))?/.exec(tail);
      if (rel) {
        section = 'released';
        version = rel[1];
        released.push({ version, date: rel[2] || '' });
        kind = null;
        continue;
      }
      section = null; // 其它 h2（如文件头说明）不参与解析
      continue;
    }
    const h3 = /^###\s+(.*)$/.exec(line);
    if (h3) {
      const name = h3[1].trim();
      kind = CHANGELOG_KINDS.includes(name) ? name : null;
      if (section === 'unreleased' && kind && !unreleased[kind]) unreleased[kind] = [];
      continue;
    }
    const item = /^[-*]\s+(.*\S)\s*$/.exec(line);
    if (item && section === 'unreleased' && kind) unreleased[kind].push(item[1]);
  }
  return { unreleased, released };
}

/**
 * 占位条目（`（暂无）` / `(暂无)`）——**不是变更**：`[Unreleased]` 落版后由脚本重置为占位，
 * 若把占位算作变更，会推出「永远有内容可发」的假版本号（实测：批次 236 预演首跑即把占位算成 Added → 0.2.0）。
 */
export const CHANGELOG_PLACEHOLDER_RE = /^[（(]\s*暂无\s*[）)]$/;

/**
 * 由 CHANGELOG 的 `[Unreleased]` 段落判定「变更类别」——供 `nextSemver` 用。
 * 判据：段内任一条目含 `BREAKING`（不区分大小写）⇒ 破坏性；`Added` 非空 ⇒ 新增；
 *   其余任一非空 ⇒ 一般变更；全空（含**只有占位**）⇒ `empty: true`（调用方据此判「无待发内容」）。
 * @param {Record<string,string[]>} unreleased `parseChangelog` 的 `unreleased`
 * @returns {{breaking:boolean, added:boolean, changed:boolean, fixed:boolean, removed:boolean, empty:boolean}}
 */
export function classifyChanges(unreleased) {
  const real = {};
  for (const [kind, items] of Object.entries(unreleased || {})) {
    real[kind] = (items || []).filter((t) => !CHANGELOG_PLACEHOLDER_RE.test(String(t).trim()));
  }
  const all = Object.values(real).flat();
  return {
    breaking: all.some((t) => /BREAKING/i.test(t)),
    added: real.Added?.length > 0,
    changed: real.Changed?.length > 0,
    fixed: real.Fixed?.length > 0,
    removed: real.Removed?.length > 0,
    empty: all.length === 0,
  };
}

