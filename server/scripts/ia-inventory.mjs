#!/usr/bin/env node
// role: [工程师]+[AI]
// ia-inventory.mjs — IA 全量矩阵生成器（只读扫描，不改生产代码）
//
// 扫描范围：
//   1) docs/src/capabilities/*-workspace.js —— 七台页签声明（id/label/groupLabel/coreTab/render）
//   2) docs/src/entries/tabs/**              —— 各页签渲染文件
//   3) docs/src/entries/pages/{activity-entry,activity-materials-entry,main-entry}.js
// 输出：.ctx/logs/archive/2026-10/IA_INVENTORY.md（稳定排序，可重复运行）
//
// 计数口径（详见报告末尾「口径说明」）：
//   · 卡片 = class/className 中含独立 `card` token 的容器；另记节标题（h2/h3 + renderTabHeader）
//   · 链接 = <a href> / .href 赋值 / window.location(.href) 赋值 / 独立 resolveDocumentUrl(...)
//   · 深链参数 = tab / highlight / activityId / branchId / subview 的出现次数
//   · 共享渲染文件在全局统计中按文件去重一次；tab 行按映射文件展示

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const DOCS = path.join(ROOT, 'docs');
const SRC = path.join(DOCS, 'src');
const CAP_DIR = path.join(SRC, 'capabilities');
const TABS_DIR = path.join(SRC, 'entries', 'tabs');
const PAGE_FILES = ['activity-entry.js', 'activity-materials-entry.js', 'main-entry.js']
  .map((name) => path.join(SRC, 'entries', 'pages', name));
const OUT_FILE = path.join(ROOT, '.ctx', 'logs', 'archive', '2026-10', 'IA_INVENTORY.md');

const DEEP_KEYS = ['tab', 'highlight', 'activityId', 'branchId', 'subview'];
const ID_KEYS = ['activityId', 'taskforceId', 'personId', 'issueId', 'noticeId', 'id', 'branchId'];

const rel = (abs) => path.relative(ROOT, abs).split(path.sep).join('/');
const cell = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
const uniqueSorted = (arr) => [...new Set(arr)].sort();

// ── 源码扫描基础：跳过字符串、屏蔽注释、配对括号 ────────────────────────────

function skipString(s, i) {
  const q = s[i];
  i += 1;
  while (i < s.length) {
    if (s[i] === '\\') { i += 2; continue; }
    if (s[i] === q) return i + 1;
    if (q !== '`' && s[i] === '\n') return i;
    if (q === '`' && s[i] === '$' && s[i + 1] === '{') {
      const end = matchDelimiter(s, i + 1, '{', '}');
      i = end < 0 ? s.length : end + 1;
      continue;
    }
    i += 1;
  }
  return i;
}

function matchDelimiter(s, open, openCh, closeCh) {
  let depth = 0;
  for (let i = open; i < s.length; i += 1) {
    const c = s[i];
    if (c === "'" || c === '"' || c === '`') { i = skipString(s, i) - 1; continue; }
    if (c === openCh) depth += 1;
    else if (c === closeCh) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function maskComments(src) {
  const out = src.split('');
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const d = src[i + 1];
    if (c === '/' && d === '/') {
      while (i < src.length && src[i] !== '\n') { out[i] = ' '; i += 1; }
      continue;
    }
    if (c === '/' && d === '*') {
      out[i] = ' ';
      out[i + 1] = ' ';
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
        if (src[i] !== '\n') out[i] = ' ';
        i += 1;
      }
      if (i < src.length) { out[i] = ' '; out[i + 1] = ' '; i += 2; }
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { i = skipString(src, i); continue; }
    i += 1;
  }
  return out.join('');
}

function buildLineStarts(src) {
  const starts = [0];
  for (let i = 0; i < src.length; i += 1) if (src[i] === '\n') starts.push(i + 1);
  return starts;
}

function lineAt(starts, index) {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (starts[mid] <= index) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

function readExpression(s, start) {
  let depth = 0;
  let i = start;
  while (i < s.length) {
    const c = s[i];
    if (c === "'" || c === '"' || c === '`') { i = skipString(s, i); continue; }
    if (c === '(' || c === '[' || c === '{') depth += 1;
    else if (c === ')' || c === ']' || c === '}') {
      if (depth === 0) break;
      depth -= 1;
    } else if (c === ';' && depth === 0) {
      break;
    } else if (c === '\n' && depth === 0) {
      const before = s.slice(start, i).trimEnd();
      let j = i + 1;
      while (j < s.length && (s[j] === ' ' || s[j] === '\t' || s[j] === '\r')) j += 1;
      const next = s.slice(j, j + 3);
      const continues = /[?:+&|=,.([]$/.test(before) || /^[?:+.|&)]/.test(next);
      if (!continues) break;
    }
    i += 1;
  }
  return { expr: s.slice(start, i).trim().slice(0, 400), end: i };
}

function stripTemplateExpr(s) {
  return String(s ?? '').replace(/\$\{[^{}]*\}/g, '${…}');
}

function cleanText(s, max = 48) {
  let t = stripTemplateExpr(s)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length > max) t = `${t.slice(0, max - 1)}…`;
  return t;
}

function walkJs(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkJs(p));
    else if (ent.isFile() && ent.name.endsWith('.js')) out.push(p);
  }
  return out;
}

// ── 1. 解析七台页签声明 ─────────────────────────────────────────────────────

const workspaceFiles = fs.readdirSync(CAP_DIR)
  .filter((f) => f.endsWith('-workspace.js'))
  .sort()
  .map((f) => path.join(CAP_DIR, f));

const workspaces = [];

for (const file of workspaceFiles) {
  const src = fs.readFileSync(file, 'utf8');
  const masked = maskComments(src);
  const starts = buildLineStarts(src);
  const nameMatch = masked.match(/\bname\s*:\s*'([^']+)'/);
  const page = `${path.basename(file).replace(/-workspace\.js$/, '')}.html`;
  const workspace = {
    file,
    relFile: rel(file),
    page,
    name: nameMatch ? nameMatch[1] : `${page} 工作台`,
    tabs: [],
  };

  const ranges = [];
  const tabRe = /\{\s*id\s*:\s*'([^']+)'/g;
  let m;
  while ((m = tabRe.exec(masked)) !== null) {
    const open = m.index;
    if (ranges.some(([a, b]) => open >= a && open <= b)) continue;
    const close = matchDelimiter(masked, open, '{', '}');
    if (close < 0) continue;
    const obj = masked.slice(open, close + 1);
    if (!/\brender\s*:/.test(obj)) continue;
    // 跳过 registerCapability({...}) 的能力对象（其内联 tabs 数组会让 render 出现在同一段文本里）
    if (/\brequiredRoles\s*:/.test(obj) || /\bscope\s*:\s*\[/.test(obj)) continue;

    const id = m[1];
    const label = (obj.match(/\blabel\s*:\s*'([^']+)'/) || [])[1] || id;
    const groupLabel = (obj.match(/\bgroupLabel\s*:\s*'([^']+)'/) || [])[1] || '未分组';
    const coreTab = /\bcoreTab\s*:\s*true/.test(obj);

    const imports = [...obj.matchAll(/import\(\s*(['"])([^'"]+)\1\s*\)/g)]
      .map((x) => x[2].split('?')[0]);
    let target = null;
    let dynamic = false;
    if (imports.length) {
      const abs = path.resolve(path.dirname(file), imports[0]);
      if (fs.existsSync(abs) && fs.statSync(abs).isFile()) target = abs;
      else dynamic = true;
    } else {
      dynamic = true;
    }

    workspace.tabs.push({
      id,
      label,
      groupLabel,
      coreTab,
      dynamic,
      targetAbs: target,
      targetRel: target ? rel(target) : '动态',
      line: lineAt(starts, open),
    });
    ranges.push([open, close]);
  }

  workspaces.push(workspace);
}

workspaces.sort((a, b) => (a.page < b.page ? -1 : a.page > b.page ? 1 : 0));

const wsByPage = new Map(workspaces.map((w) => [`workspace/${w.page}`, w]));
const allTabs = workspaces.flatMap((w) => w.tabs.map((t) => ({ ...t, workspace: w })));

// 渲染文件 → 拥有该 tab 的工作台（用于 `?tab=` 相对链接的静态可达性）
const ownersByFile = new Map();
for (const tab of allTabs) {
  if (tab.dynamic || !tab.targetRel) continue;
  if (!ownersByFile.has(tab.targetRel)) ownersByFile.set(tab.targetRel, []);
  const owners = ownersByFile.get(tab.targetRel);
  if (!owners.includes(tab.workspace)) owners.push(tab.workspace);
}

// ── 2. 文件级提取：卡片 / 节标题 / 主行动 / 链接 ─────────────────────────────

function readQueryValue(s, start) {
  if (s.startsWith('${', start)) {
    const end = matchDelimiter(s, start + 1, '{', '}');
    if (end >= 0) return s.slice(start, end + 1);
  }
  let i = start;
  while (i < s.length && !/[&\s'"`<>]/.test(s[i])) i += 1;
  return s.slice(start, i);
}

function parseQuery(raw) {
  const params = [];
  const normalized = String(raw ?? '').replace(/&amp;/g, '&');
  const keyRe = /[?&]([A-Za-z_][\w-]*)=/g;
  let m;
  while ((m = keyRe.exec(normalized)) !== null) {
    let value = stripTemplateExpr(readQueryValue(normalized, keyRe.lastIndex).trim());
    if (!value.includes('${')) value = value.replace(/[),;]+$/, '');
    // `${…}${…}` 这类拼接只保留首个动态占位，避免把后续表达式吞进同一个值
    value = value.replace(/(\$\{…\}).+$/, '$1');
    params.push({ key: m[1], value });
  }
  return params;
}

function parseSearchParamsObject(raw) {
  const params = [];
  const blocks = [...raw.matchAll(/searchParams\s*:\s*\{([\s\S]{0,300}?)\}/g)];
  for (const block of blocks) {
    const body = block[1];
    for (const segment of body.split(',')) {
      const seg = segment.trim();
      if (!seg) continue;
      const kv = seg.match(/^(?:['"]([^'"]+)['"]|([A-Za-z_][\w-]*))\s*(?::\s*([\s\S]+))?$/);
      if (!kv) continue;
      const key = kv[1] || kv[2];
      if (!key || key === 'searchParams') continue;
      const rawValue = kv[3] ? kv[3].trim() : '${…}';
      params.push({ key, value: stripTemplateExpr(rawValue) });
    }
  }
  return params;
}

function mergeParams(...lists) {
  const out = [];
  const seen = new Set();
  for (const list of lists) {
    for (const p of list) {
      const key = `${p.key}=${p.value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}

function extractPage(raw) {
  const s = String(raw ?? '');
  const ws = s.match(/workspace\/([A-Za-z0-9._-]+\.html)/);
  if (ws) return `workspace/${ws[1]}`;
  const page = s.match(/([A-Za-z0-9._-]+\.html)/);
  return page ? page[1] : null;
}

function countCards(masked) {
  let cards = 0;
  const classRe = /\bclass(?:Name)?\s*=\s*("([^"]*)"|'([^']*)'|`([^`]*)`)/g;
  let m;
  while ((m = classRe.exec(masked)) !== null) {
    const value = m[2] ?? m[3] ?? m[4] ?? '';
    if (/(^|\s)card(\s|$)/.test(value)) cards += 1;
  }

  const headings = [...masked.matchAll(/<h([23])\b[^>]*>([\s\S]*?)<\/h\1>/g)]
    .map((x) => cleanText(x[2], 40))
    .filter(Boolean);
  const tabHeaders = (masked.match(/\brenderTabHeader\s*\(/g) || []).length;

  return { cards, headings, tabHeaders, sections: headings.length + tabHeaders };
}

function findPrimaryAction(masked) {
  const tagRe = /<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = tagRe.exec(masked)) !== null) {
    const attrs = m[2];
    const cls = attrs.match(/\bclass\s*=\s*("([^"]*)"|'([^']*)'|`([^`]*)`)/);
    if (!cls) continue;
    const value = cls[2] ?? cls[3] ?? cls[4] ?? '';
    if (!/\bbtn-accent\b/.test(value)) continue;
    let text = cleanText(m[3], 32);
    if (!text || /^\$\{/.test(text)) {
      const aria = attrs.match(/\baria-label\s*=\s*("([^"]*)"|'([^']*)')/);
      const title = attrs.match(/\btitle\s*=\s*("([^"]*)"|'([^']*)')/);
      text = cleanText(aria?.[2] ?? aria?.[3] ?? title?.[2] ?? title?.[3] ?? '', 32);
    }
    if (text && !/^\$\{/.test(text)) return text;
  }
  return '';
}

function extractLinks(masked, lineStarts, sourcePage, owners) {
  const rows = [];
  const covered = [];

  const anchorRe = /<a\b([^>]*)>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = anchorRe.exec(masked)) !== null) {
    const attrs = m[1];
    const hrefMatch = attrs.match(/\bhref\s*=\s*("([^"]*)"|'([^']*)'|`([^`]*)`)/);
    if (!hrefMatch) continue;
    const raw = hrefMatch[2] ?? hrefMatch[3] ?? hrefMatch[4] ?? '';
    let text = cleanText(m[2]);
    if (!text || /^\$\{/.test(text)) {
      const aria = attrs.match(/\baria-label\s*=\s*("([^"]*)"|'([^']*)')/);
      const title = attrs.match(/\btitle\s*=\s*("([^"]*)"|'([^']*)')/);
      text = cleanText(aria?.[2] ?? aria?.[3] ?? title?.[2] ?? title?.[3] ?? '', 48);
    }
    if (!text || /^\$\{/.test(text)) text = '（动态文本）';
    rows.push({ kind: 'a', index: m.index, line: lineAt(lineStarts, m.index), raw: raw.trim(), text, sourcePage, owners });
    covered.push([m.index, anchorRe.lastIndex]);
  }

  const assignRe = /(?:\bwindow\s*\.\s*location(?:\s*\.\s*href)?|\blocation(?:\s*\.\s*href)?|\b[A-Za-z_$][\w$]*\s*\.\s*href)\s*=\s*(?!=)/g;
  while ((m = assignRe.exec(masked)) !== null) {
    const { expr, end } = readExpression(masked, assignRe.lastIndex);
    if (!expr) continue;
    const name = m[0].replace(/\s*=\s*$/, '').replace(/\s+/g, '');
    rows.push({
      kind: 'assign',
      index: m.index,
      line: lineAt(lineStarts, m.index),
      raw: expr,
      text: `[JS] ${name}`,
      sourcePage,
      owners,
    });
    covered.push([m.index, end]);
  }

  const isCovered = (idx) => covered.some(([a, b]) => idx >= a && idx <= b);

  // 对象字面量 href:（组件/辅助渲染的链接配置，如 _materialRowHtml({ href: ... })）
  const propRe = /\bhref\s*:\s*(`([^`]*)`|"([^"]*)"|'([^']*)')/g;
  const nearbyText = (index) => {
    const from = Math.max(0, index - 300);
    const to = Math.min(masked.length, index + 300);
    const windowText = masked.slice(from, to);
    const textRe = /\b(?:label|text)\s*:\s*(['"`])([^'"`]*)\1/g;
    let best = null;
    let tm;
    while ((tm = textRe.exec(windowText)) !== null) {
      const distance = Math.abs(from + tm.index - index);
      if (!best || distance < best.distance) best = { distance, text: cleanText(tm[2], 40) };
    }
    return best?.text || '';
  };
  while ((m = propRe.exec(masked)) !== null) {
    if (isCovered(m.index)) continue;
    const raw = (m[2] ?? m[3] ?? m[4] ?? '').trim();
    if (!/\.html|workspace\/|\?tab=|&amp;tab=/.test(raw)) continue;
    rows.push({
      kind: 'hrefprop',
      index: m.index,
      line: lineAt(lineStarts, m.index),
      raw,
      text: nearbyText(m.index) || '[配置] href',
      sourcePage,
      owners,
    });
    covered.push([m.index, propRe.lastIndex]);
  }

  const resolveRe = /\bresolveDocumentUrl\s*\(/g;
  while ((m = resolveRe.exec(masked)) !== null) {
    if (isCovered(m.index)) continue;
    const open = masked.indexOf('(', m.index);
    const close = matchDelimiter(masked, open, '(', ')');
    if (close < 0) continue;
    const raw = masked.slice(m.index, close + 1);
    const page = extractPage(raw) || '动态';
    rows.push({
      kind: 'resolve',
      index: m.index,
      line: lineAt(lineStarts, m.index),
      raw,
      text: `[JS] resolveDocumentUrl(${page})`,
      sourcePage,
      owners,
    });
    covered.push([m.index, close]);
  }

  rows.sort((a, b) => a.index - b.index || (a.raw < b.raw ? -1 : a.raw > b.raw ? 1 : 0));
  const seen = new Set();
  return rows.filter((row) => {
    const key = `${row.kind}:${row.index}:${row.raw}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function analyzeFile(abs) {
  const src = fs.readFileSync(abs, 'utf8');
  const masked = maskComments(src);
  const starts = buildLineStarts(src);
  const relFile = rel(abs);
  const owners = ownersByFile.get(relFile) || [];
  const sourcePage = owners.length === 1 ? `workspace/${owners[0].page}` : null;
  const { cards, headings, tabHeaders, sections } = countCards(masked);
  const links = extractLinks(masked, starts, sourcePage, owners);

  return {
    abs,
    relFile,
    cards,
    headings,
    tabHeaders,
    sections,
    primary: findPrimaryAction(masked),
    links,
    masked,
    lineStarts: starts,
  };
}

const scannedFiles = uniqueSorted([
  ...walkJs(TABS_DIR).map((p) => rel(p)),
  ...PAGE_FILES.map((p) => rel(p)),
  ...allTabs.filter((t) => !t.dynamic && t.targetAbs).map((t) => t.targetRel),
]);

const fileStats = new Map();
for (const relFile of scannedFiles) {
  const abs = path.join(ROOT, relFile);
  if (!fs.existsSync(abs)) continue;
  fileStats.set(relFile, analyzeFile(abs));
}

// ── 3. 链接归一化与可达性判定 ───────────────────────────────────────────────

function resolveLink(row) {
  const raw = row.raw;
  const queryParams = parseQuery(raw);
  const objectParams = parseSearchParamsObject(raw);
  const params = mergeParams(queryParams, objectParams);

  let page = extractPage(raw);
  const isQueryOnly = /^\s*['"`]?\?/.test(raw);
  if (!page && isQueryOnly) {
    if (row.sourcePage) page = row.sourcePage;
    else if (row.owners.length > 1) page = '(本台)';
  }

  const tabEntry = params.find((p) => p.key === 'tab');
  let targetTab = tabEntry ? tabEntry.value : '';
  if (targetTab && targetTab.includes('${')) targetTab = '动态';

  const idEntry = ID_KEYS
    .map((key) => params.find((p) => p.key === key))
    .find(Boolean);
  const objectId = idEntry ? (idEntry.value || '${…}') : '';

  const deep = DEEP_KEYS
    .map((key) => {
      const p = params.find((x) => x.key === key);
      if (!p) return '';
      return `${key}=${p.value}`;
    })
    .filter(Boolean);

  const targetPage = page || '动态';

  return {
    ...row,
    page: targetPage,
    targetTab: targetTab || (page && page.startsWith('workspace/') ? '(默认)' : ''),
    objectId: objectId || '—',
    deepParams: deep,
    params,
  };
}

function accessibility(row) {
  const tab = row.targetTab;
  if (!row.page || row.page === '动态') {
    if (tab && tab !== '(默认)' && row.owners.length) {
      const hits = row.owners
        .map((ws) => ws.tabs.find((t) => t.id === tab))
        .filter(Boolean);
      if (hits.length === row.owners.length) return `可达：各台均有「${hits[0].label}」`;
      if (hits.length) return `部分可达（${hits.length}/${row.owners.length} 台）`;
      return '静态：目标台无此 tab';
    }
    return '待真机（动态目标）';
  }
  if (row.page === '(本台)') return '待真机（共享渲染，来源台不定）';
  if (row.page.startsWith('workspace/')) {
    const ws = wsByPage.get(row.page);
    if (!ws) return '待真机（未知工作台页）';
    if (!tab || tab === '(默认)') return `可达：${ws.name}（默认页签）`;
    if (tab === '动态') return '待真机（页签动态）';
    const target = ws.tabs.find((t) => t.id === tab);
    return target ? `可达：${ws.name}·${target.label}` : '静态：目标台无此 tab';
  }
  if (row.page === 'login.html') return '公开：登录页';
  if (row.page === 'index.html') return '公开：首页（匿名可访）';
  return '待真机（页面级门控）';
}

const allLinks = [];
for (const relFile of scannedFiles) {
  const stats = fileStats.get(relFile);
  if (!stats) continue;
  for (const row of stats.links) {
    const resolved = resolveLink(row);
    allLinks.push({
      ...resolved,
      file: relFile,
      accessibility: accessibility(resolved),
      targetDisplay: resolved.page === '动态'
        ? '动态'
        : `${resolved.page}${resolved.targetTab && resolved.targetTab !== '(默认)' ? `?tab=${resolved.targetTab}` : ''}`,
    });
  }
}

// 深链参数：源码中的字面量出现次数（含链接目标与查询串构造函数）+ URLSearchParams.get 读取次数
const deepCounts = Object.fromEntries(DEEP_KEYS.map((k) => [k, 0]));
for (const relFile of scannedFiles) {
  const stats = fileStats.get(relFile);
  if (!stats) continue;
  const code = stats.masked.replace(/&amp;/g, '&');
  const litRe = /[?&](tab|highlight|activityId|branchId|subview)=/g;
  let m;
  while ((m = litRe.exec(code)) !== null) deepCounts[m[1]] += 1;
  const getRe = /\.get\(\s*(['"])(tab|highlight|activityId|branchId|subview)\1\s*\)/g;
  while ((m = getRe.exec(stats.masked)) !== null) deepCounts[m[2]] += 1;
}
const deepTotal = Object.values(deepCounts).reduce((sum, n) => sum + n, 0);

// 每个 tab 的链接目标清单
for (const ws of workspaces) {
  for (const tab of ws.tabs) {
    if (tab.dynamic || !tab.targetRel) {
      tab.linkTargets = [];
      continue;
    }
    const rows = allLinks.filter((link) => link.file === tab.targetRel);
    tab.linkTargets = uniqueSorted(rows.map((r) => r.targetDisplay));
  }
}

// ── 4. 统计与自检 ───────────────────────────────────────────────────────────

const fileList = [...fileStats.values()];
const totalCards = fileList.reduce((sum, f) => sum + f.cards, 0);
const totalSections = fileList.reduce((sum, f) => sum + f.sections, 0);
const totalLinks = allLinks.length;
const totalTabs = allTabs.length;
const coreTabs = allTabs.filter((t) => t.coreTab).length;

const failures = [];
if (workspaces.length !== 7) failures.push(`工作台数=${workspaces.length}（期望 7）`);
if (totalTabs < 60) failures.push(`tab 数=${totalTabs}（期望 ≥ 60）`);
if (totalLinks < 30) failures.push(`链接数=${totalLinks}（期望 ≥ 30）`);
for (const ws of workspaces) {
  if (!ws.tabs.length) failures.push(`${ws.relFile} 未解析出 tab`);
}
if (failures.length) {
  console.error('[ia-inventory] 自检失败：');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

// ── 5. 生成 Markdown ────────────────────────────────────────────────────────

const lines = [];
lines.push('# IA 全量矩阵');
lines.push('');
lines.push('> 生成命令：`node server/scripts/ia-inventory.mjs`');
lines.push('> 本文件由脚本生成，可重复运行；排序为稳定排序（工作台按页面名、tab 按声明序、链接按文件+行号）。');
lines.push('');

lines.push('## 总览统计');
lines.push('');
lines.push('| 指标 | 读数 |');
lines.push('| --- | ---: |');
lines.push(`| 工作台数 | ${workspaces.length} |`);
lines.push(`| tab 数 | ${totalTabs} |`);
lines.push(`| core tab 数 | ${coreTabs} |`);
lines.push(`| 卡片数（card 容器，文件去重） | ${totalCards} |`);
lines.push(`| 区块标题数（h2/h3 + renderTabHeader） | ${totalSections} |`);
lines.push(`| 链接数（源码位置去重） | ${totalLinks} |`);
lines.push(`| 深链参数出现次数 | ${deepTotal} |`);
lines.push(`| 扫描文件数 | ${fileList.length} |`);
lines.push('');
lines.push(`深链参数分布：${DEEP_KEYS.map((k) => `\`${k}\`=${deepCounts[k]}`).join(' · ')}`);
lines.push('');

lines.push('## 工作台概览');
lines.push('');
lines.push('| 工作台 | 页面 | 能力文件 | tab 数 | core | 卡片数（台内文件去重） | 链接数（台内文件去重） |');
lines.push('| --- | --- | --- | ---: | ---: | ---: | ---: |');
for (const ws of workspaces) {
  const files = uniqueSorted(ws.tabs.filter((t) => !t.dynamic && t.targetRel).map((t) => t.targetRel));
  const cards = files.reduce((sum, f) => sum + (fileStats.get(f)?.cards || 0), 0);
  const links = files.reduce((sum, f) => sum + (fileStats.get(f)?.links.length || 0), 0);
  lines.push(`| ${cell(ws.name)} | \`workspace/${ws.page}\` | \`${ws.relFile}\` | ${ws.tabs.length} | ${ws.tabs.filter((t) => t.coreTab).length} | ${cards} | ${links} |`);
}
lines.push('');

for (const ws of workspaces) {
  lines.push(`## ${ws.name}（\`workspace/${ws.page}\`）`);
  lines.push('');
  lines.push('| tab id | 显示名 | 分组 | core | 对应文件 | 卡片数 | 主行动（若有） | 链接目标清单 |');
  lines.push('| --- | --- | --- | :---: | --- | --- | --- | --- |');
  for (const tab of ws.tabs) {
    let fileCell = '动态';
    let cardCell = '动态';
    let primary = '—';
    if (!tab.dynamic && tab.targetRel && fileStats.has(tab.targetRel)) {
      const stats = fileStats.get(tab.targetRel);
      fileCell = `\`${tab.targetRel}\``;
      const sectionNote = stats.sections ? `（节标题 ${stats.sections}）` : '';
      cardCell = `${stats.cards}${sectionNote}`;
      primary = stats.primary || '—';
    }
    const targets = tab.linkTargets.length ? tab.linkTargets.join('<br>') : '—';
    lines.push(`| \`${tab.id}\` | ${cell(tab.label)} | ${cell(tab.groupLabel)} | ${tab.coreTab ? '是' : '否'} | ${fileCell} | ${cardCell} | ${cell(primary)} | ${targets} |`);
  }
  lines.push('');
}

// 三个入口页面的扫描摘要
const pageSummaries = PAGE_FILES.map((abs) => fileStats.get(rel(abs))).filter(Boolean);
lines.push('## 非工作台页面扫描');
lines.push('');
lines.push('| 页面入口 | 卡片数 | 区块标题 | 链接数 | 主行动（若有） |');
lines.push('| --- | ---: | ---: | ---: | --- |');
for (const stats of pageSummaries) {
  lines.push(`| \`${stats.relFile}\` | ${stats.cards} | ${stats.sections} | ${stats.links.length} | ${cell(stats.primary || '—')} |`);
}
lines.push('');

lines.push('## 链接明细');
lines.push('');
lines.push('> 来源为 `文件:行号`；同一源码位置只记一条。「角色可达性」仅做静态判定：工作台页需登录，页签存在性取自 capabilities 声明；页面级门控与运行时权限未展开的标「待真机」。');
lines.push('');
lines.push('| 来源文件:行号 | 文本 | 目标 page | 目标 tab | 对象 id | 深链参数 | 角色可达性 |');
lines.push('| --- | --- | --- | --- | --- | --- | --- |');
for (const link of allLinks) {
  const source = `\`${link.file}:${link.line}\``;
  const tabCell = link.targetTab || '—';
  const deepCell = link.deepParams.length ? link.deepParams.join('<br>') : '—';
  lines.push(`| ${source} | ${cell(link.text)} | ${cell(link.page)} | ${cell(tabCell)} | ${cell(link.objectId)} | ${cell(deepCell)} | ${cell(link.accessibility)} |`);
}
lines.push('');

lines.push('## 口径说明');
lines.push('');
lines.push('- **卡片数**：`class` / `className` 中含独立 `card` token 的容器数；括号内为节标题数（`<h2>`/`<h3>` 文本 + `renderTabHeader` 调用）。');
lines.push('- **主行动**：该渲染文件中第一个静态 `btn-accent` 控件（按钮或链接）的可见文本；无则记「—」。');
lines.push('- **链接**：`<a href>`、对象字面量 `href:`（组件/辅助渲染配置）、`.href =` / `window.location(.href) =` 赋值、独立 `resolveDocumentUrl(...)` 调用；一行一条，按源码位置去重。');
lines.push('- **深链参数**：`tab` / `highlight` / `activityId` / `branchId` / `subview` 在源码字面量中的出现次数（含链接目标与查询串构造函数），加上 `URLSearchParams.get(...)` 的读取次数；与「链接明细」逐行值可能不等，因为并非每个参数都出现在链接行内。');
lines.push('- **`activityId` 读数**：本次扫描范围内（tabs/** 与三个入口页）对象定位统一用 `?id=` 承载；`entries/workspace/**` 对 `?activityId=` 的消费不在扫描范围，故该参数计数为 0。');
lines.push('- **对应文件**：取 `render` 中第一个静态 `import(...)` 的目标；目标可落在 `entries/tabs/**` 之外（如支书台 `tf-view` → `components/record/insight-view.js`），仍按同一规则计数。');
lines.push('- **共享渲染文件**：`today-tab.js`、`shared/activity-calendar-tab.js`、`record/insight-view.js`、`org/member-flow-tab.js` 等被多台复用的文件，在「链接明细」中按文件只列一次；各 tab 行按其映射文件展示，故会重复出现。');
lines.push('- **薄壳委托**：如 `my-dispatch-tab.js` 只调用共享组件的 `renderMyDispatchTab(...)`，本矩阵不展开其内部 DOM，故该 tab 卡片数为 0。');
lines.push('- **动态**：`render` 无静态 import 字面量、或链接目标为运行时变量时标「动态」/「待真机」，不省略。');
lines.push('');

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, `${lines.join('\n')}\n`, 'utf8');

console.log(`[ia-inventory] workspaces=${workspaces.length} tabs=${totalTabs} core=${coreTabs} cards=${totalCards} sections=${totalSections} links=${totalLinks} deep=${deepTotal}`);
console.log(`[ia-inventory] deep: ${DEEP_KEYS.map((k) => `${k}=${deepCounts[k]}`).join(' ')}`);
console.log(`[ia-inventory] wrote ${rel(OUT_FILE)}`);
