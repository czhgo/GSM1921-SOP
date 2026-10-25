// server/test/terminology-map.mjs — 术语表解析与结构性标签抽取（测试辅助，非产品代码）
//
// 为什么单独一件：H-T1…H-T4 四条断言都要回答「这个词属于哪一层、能不能和谁同排、是否已登记」。
//   若每条断言各写一套解析，术语表改一次字段就会在四处漂移。本件只做两件事：
//     ① **单源解析** `content/03_doc_system/TERMINOLOGY.md` → `{ term, layer, peers, forbidden, aliases, codeKey }`；
//     ② 从 UI 源码抽取「结构性标签」（页签 / 分段 / 表头 / 筛选 / 选项）→ 供登记核对。
// 解析不到 ≥18 条即抛错：术语表格式漂移时**先炸这里**，不让下游断言变成恒真。
//
// 边界（如实标注）：
//   · 只认「9 列都齐」的表格行；表头 / 分隔行 / 字段说明表自动跳过。
//   · `forbidden` 保留原文；`forbiddenTokens` 是「引号内词」的启发式切片，**不用于判红**
//     （H-T4 的禁用集是固定 5 词，见守卫头注）。
//   · 结构性标签抽取**跳过注释与 mock**；模板变量 / 含标签 / 超长句 / ASCII 标识符一律不收。
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';

export const ROOT = resolve(import.meta.dirname, '..', '..');
export const TERMINOLOGY_REL = 'content/03_doc_system/TERMINOLOGY.md';

const CORE_LAYERS = new Set([
  'business-object',
  'collaboration-structure',
  'org-unit',
  'deployment-unit',
  'process',
]);

const read = (f) => readFileSync(f, 'utf8');
const normPath = (p) => p.replace(/\\/g, '/');
const normalize = (p) => normPath(resolve(p)).toLowerCase();

/** 去掉括号注、反引号、粗体标记，留一个可比较的词面 */
function cleanToken(s) {
  return String(s)
    .replace(/（[^）]*）/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[`*]/g, '')
    .trim();
}

/** `{活动工作组, 专班工作组}` / `{活动, 专班}；{活动工作组, 专班工作组}` → [['活动工作组','专班工作组'], …] */
function parsePeers(raw) {
  const groups = [];
  for (const m of String(raw).matchAll(/\{([^}]*)\}/g)) {
    const tokens = m[1].split(/[,，]/).map(cleanToken).filter(Boolean);
    if (tokens.length) groups.push(tokens);
  }
  return groups;
}

/** 「合法别名」按 ；、/ 切（`；` 分隔多个别名，`、` 分隔同义写法） */
function parseAliases(raw) {
  const s = String(raw).trim();
  if (!s || s === '无') return [];
  return s.split(/[；;、]/).map(cleanToken).filter((x) => x && x !== '无');
}

/**
 * 解析术语表。
 * @param {string} [root]
 * @returns {Array<{term:string, definition:string, layer:string, updown:string,
 *   peers:string[][], forbidden:string, forbiddenTokens:string[], authority:string,
 *   codeKey:string, aliases:string[]}>}
 */
export function loadTerminology(root = ROOT) {
  const file = join(root, TERMINOLOGY_REL);
  if (!existsSync(file)) throw new Error(`术语表不存在：${TERMINOLOGY_REL}（H-T1…H-T4 的共同前提）`);
  const entries = [];
  for (const line of read(file).split(/\r?\n/)) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').map((s) => s.trim());
    // `| a | b | … |` → ['', a, b, …, '']；9 字段 ⇒ 11 段
    if (cells.length !== 11) continue;
    const [, term, definition, layerRaw, updown, peersRaw, forbiddenRaw, authority, codeKey, aliasesRaw] = cells;
    if (!term || term === '词条' || /^-+$/.test(term) || !definition || /^-+$/.test(definition)) continue;
    const layer = cleanToken(layerRaw);
    if (!CORE_LAYERS.has(layer)) {
      throw new Error(`术语「${term}」的层级「${layerRaw}」不在约定集合内（${[...CORE_LAYERS].join(' / ')}）`);
    }
    entries.push({
      term,
      definition,
      layer,
      updown,
      peers: parsePeers(peersRaw),
      peersRaw,
      forbidden: forbiddenRaw,
      forbiddenTokens: [...String(forbiddenRaw).matchAll(/「([^」]+)」/g)].map((m) => m[1]),
      authority,
      codeKey,
      aliases: parseAliases(aliasesRaw),
      aliasesRaw,
    });
  }
  if (entries.length < 18) {
    throw new Error(`只解析到 ${entries.length} 条词条（下限 18）：\`${TERMINOLOGY_REL}\` 的表格格式漂移，` +
      `H-T1…H-T4 会失去共同前提`);
  }
  return entries;
}

/** 词条 + 合法别名 → 词条对象（词条优先；别名不覆盖已有词条） */
export function makeLabelIndex(entries) {
  const map = new Map();
  for (const e of entries) map.set(e.term, e);
  for (const e of entries) {
    for (const a of e.aliases) if (!map.has(a)) map.set(a, e);
  }
  return map;
}

/** 去注释（JS 行注释 / 块注释；HTML 注释）——结构性标签只看真实渲染文本 */
export function stripComments(src) {
  return String(src)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/gm, '$1');
}

/** 递归列出目录下指定扩展名的文件（跳过 node_modules / mock） */
export function listSourceFiles(dir, ext = '.js') {
  const out = [];
  if (!existsSync(dir)) return out;
  (function walk(d) {
    for (const n of readdirSync(d)) {
      if (n === 'node_modules' || n === 'mock' || n.startsWith('mock-')) continue;
      const f = join(d, n);
      if (statSync(f).isDirectory()) { walk(f); continue; }
      if (n.endsWith(ext)) out.push(f);
    }
  })(dir);
  return out;
}

/** 从 `[` 起做括号配对（跳过字符串内的括号——本仓这些配置字面量极少含方括号，够用） */
function sliceBracket(src, openIdx) {
  if (src[openIdx] !== '[') return '';
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    const ch = src[i];
    if (ch === '[') depth++;
    else if (ch === ']') { depth--; if (depth === 0) return src.slice(openIdx, i + 1); }
  }
  return '';
}

/**
 * 各台页签声明（`capabilities/*`）：`{ id, label, groupLabel, render }`。
 * @returns {Array<{id:string,label:string,groupLabel:string,file:string,renderRel:string|null}>}
 */
export function extractCapabilityTabs(root = ROOT) {
  const capDir = join(root, 'docs', 'src', 'capabilities');
  const tabs = [];
  const re = /\{\s*id:\s*'([^']+)'\s*,\s*label:\s*'([^']+)'([\s\S]{0,600}?)\brender:\s*\([^)]*\)\s*=>\s*import\('([^']+)'\)/g;
  for (const abs of listSourceFiles(capDir)) {
    const src = stripComments(read(abs));
    const rel = normPath(relative(root, abs));
    for (const m of src.matchAll(re)) {
      const importPath = m[4].split('?')[0];
      const renderAbs = resolve(dirname(abs), importPath);
      const groupLabel = /groupLabel\s*:\s*'([^']+)'/.exec(m[3])?.[1] || '';
      tabs.push({
        id: m[1],
        label: m[2],
        groupLabel,
        file: rel,
        renderRel: existsSync(renderAbs) ? normPath(relative(root, renderAbs)) : null,
      });
    }
  }
  return tabs;
}

/** `insight-view.js` 的分段标签与分段类型（一级按钮组的唯一渲染源） */
export function extractInsightSegments(root = ROOT) {
  const rel = 'docs/src/components/record/insight-view.js';
  const abs = join(root, rel);
  if (!existsSync(abs)) throw new Error(`知情查看组件不存在：${rel}`);
  const src = stripComments(read(abs));
  const body = /const\s+SEG_LABEL\s*=\s*\{([\s\S]*?)\}/.exec(src)?.[1] || '';
  const labels = {};
  for (const m of body.matchAll(/([A-Za-z0-9_]+)\s*:\s*'([^']+)'/g)) labels[m[1]] = m[2];
  const types = [...(/const\s+SEG_TYPES\s*=\s*\[([^\]]*)\]/.exec(src)?.[1] || '').matchAll(/'([^']+)'/g)].map((m) => m[1]);
  if (!Object.keys(labels).length || !types.length) {
    throw new Error(`${rel} 的 SEG_LABEL / SEG_TYPES 解析不到：分段标签单一源被改坏`);
  }
  return { rel, labels, types };
}

/**
 * 调用了 `renderInsightView` 的文件（含各台 `views` 配置）。
 * `reachable=false` ⇒ 没有任何其它模块 import 它（遗留死文件，不参与按钮组判红，但必须登记）。
 */
export function extractInsightCallers(root = ROOT) {
  const srcDir = join(root, 'docs', 'src');
  const files = listSourceFiles(srcDir);
  const stripped = new Map(files.map((f) => [normalize(f), stripComments(read(f))]));
  const callers = [];
  for (const abs of files) {
    const src = stripped.get(normalize(abs));
    if (!/renderInsightView\s*\(/.test(src)) continue;
    if (normalize(abs) === normalize(join(srcDir, 'components', 'record', 'insight-view.js'))) continue;
    const rel = normPath(relative(root, abs));
    const views = (/views\s*:\s*\[([^\]]*)\]/.exec(src)?.[1] || '');
    const viewsList = [...views.matchAll(/'([^']+)'/g)].map((m) => m[1]);
    // 可达性：是否有**别的文件**以相对路径 import 它（解析成绝对路径后比对，避免同名文件互相冒充）
    const reachable = [...stripped.entries()].some(([otherAbs, s]) => {
      if (otherAbs === normalize(abs)) return false;
      for (const m of s.matchAll(/(?:import\s*\(|from\s+|import\s+)['"]([^'"]+)['"]/g)) {
        const spec = m[1];
        if (!spec.startsWith('.')) continue;
        if (normalize(resolve(dirname(otherAbs), spec.split('?')[0])) === normalize(abs)) return true;
      }
      return false;
    });
    callers.push({ rel, views: viewsList, reachable });
  }
  return callers;
}

/**
 * 抽取「结构性标签」：页签 label / 分段 label / `<th>` / facet label / `<option>`。
 * 排除：mock、注释、模板变量（`${…}`）、含标签的、超长句（>12 字）、ASCII 标识符。
 * @returns {{items: Array<{label:string, kind:string, file:string}>, scannedFiles: number}}
 */
export function extractStructuralLabels(root = ROOT, segments = extractInsightSegments(root)) {
  const tabsDir = join(root, 'docs', 'src', 'entries', 'tabs');
  const capDir = join(root, 'docs', 'src', 'capabilities');
  const items = [];
  const files = [...listSourceFiles(tabsDir), ...listSourceFiles(capDir)];
  const push = (label, kind, file) => {
    const t = String(label).trim();
    if (!t || t.length < 2 || t.length > 12) return;
    if (/[<>{}]/.test(t) || /\$\{/.test(t)) return;
    if (/^[A-Za-z0-9_./:-]+$/.test(t)) return; // 编码 / 英文标识符 / 数字
    if (/\d{4,}/.test(t)) return;              // 学号 / 编号
    items.push({ label: t, kind, file });
  };

  for (const abs of files) {
    const file = normPath(relative(root, abs));
    const src = stripComments(read(abs));
    for (const m of src.matchAll(/<th\b[^>]*>([^<]+)<\/th>/g)) push(m[1], 'th', file);
    for (const m of src.matchAll(/<option\b[^>]*>([^<]+)<\/option>/g)) push(m[1], 'option', file);
    for (const m of src.matchAll(/facets\s*:\s*/g)) {
      const open = src.indexOf('[', m.index);
      const block = sliceBracket(src, open);
      for (const lm of block.matchAll(/label\s*:\s*'([^']+)'/g)) push(lm[1], 'facet', file);
    }
  }
  // 页签 label（能力声明是唯一注册源）
  for (const t of extractCapabilityTabs(root)) push(t.label, 'tab', t.file);
  // 分段 label（insight-view 单一源）
  for (const [key, label] of Object.entries(segments.labels)) push(label, `segment:${key}`, segments.rel);

  return { items, scannedFiles: files.length };
}

/** 正则转义 */
function escRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 「定义句」启发式：`词条 + (0–12 字) + 是指 / 指的是 / 定义为 / ，指…`。
 * 单独一个「指」只认**有分隔符且不是复合词**（指导 / 指派 / 指向 / 指标 … 不算），否则误报太多。
 * @param {string} text
 * @param {string[]} terms
 * @returns {Array<{term:string, text:string}>}
 */
export function definitionSentenceHits(text, terms) {
  const out = [];
  for (const term of terms) {
    const re = new RegExp(`${escRe(term)}[^。；\\n]{0,12}(?:是指|指的是|定义为|[，,：:]\\s*指(?!导|标|派|向|定|南|挥|数|令))`, 'g');
    for (const m of String(text).matchAll(re)) out.push({ term, text: m[0] });
  }
  return out;
}
