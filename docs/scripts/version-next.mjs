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
