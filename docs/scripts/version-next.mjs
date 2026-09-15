// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  version-next.mjs — 版本号推导（bump-version.mjs 的纯逻辑件，可单测）
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

