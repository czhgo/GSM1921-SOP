// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  services/member/self-profile-import.js —— 成员「**自我描述**」**粘贴 / CSV 导入**服务
//  （2026-10-05 批次 402 · `D-788` / `V-10b`；支书圈「**甲：粘贴/CSV ＋ 预览**」）
//
//  语义（与 `branch-roster-import.js` 同契约风格：本模块只做**解析 ＋ 净化 ＋ 预览**，不落库）：
//    · 输入 = 一段文本（Excel 复制粘贴 → **制表符**；或 CSV → **逗号**／全角逗号）；**首行须为表头**。
//    · 匹配 = 优先**学号**（唯一），次选**姓名**（须唯一）；匹配不到 → `unmatched`，姓名重名 → `ambiguous`。
//    · 字段映射 = **表头关键词驱动**（问卷导出的列名很长，如「您担任什么学生工作？:职务」）——
//      别名表在本模块内（**单一源**）；未识别列**忽略**（不报错、不猜）。
//    · 净化 = 复用零依赖叶子 `core/domain/self-profile.js::sanitizeSelfProfile`（白名单键 / 类型归一 / 限长）。
//    · 「确认导入」由调用方（名册台）逐行走 `PersonStore.saveMember({ id, selfProfile })`——
//      **本模块不持有写口**（同 `sanitizeBranchRoster` 的分工）。
//  纯 ESM、无 DOM ⇒ 浏览器 / Node 双端可载（单测直导）。
// ════════════════════════════════════════════════════════════════

import { SELF_PROFILE_FIELDS, sanitizeSelfProfile } from '../../core/domain/self-profile.js?v=20261006a';

export const SELF_PROFILE_IMPORT_VERSION = 1;

/** 表头归一：去「您 / 的 / 问号 / 冒号 / 空格 / 全角括号」，压平大小写差异（映射只认关键词） */
function _normHeader(h) {
  return String(h == null ? '' : h)
    .replace(/[\s\u3000]/g, '')
    .replace(/[?？:：、，,（）()【】\[\]]/g, '')
    .replace(/^您/, '')
    .replace(/的/g, '');
}

/**
 * 表头 → 目标字段（**关键词驱动**；返回 `null` ＝未识别列，忽略）。
 * `kind`：`match`（仅用于匹配）/ `text` / `bool` / `multi` / `list`（子表第 0 行第 `sub` 列）。
 */
export function headerToTarget(header) {
  const h = _normHeader(header);
  if (!h) return null;
  // ① 匹配键
  if (h.includes('姓名')) return { kind: 'match', by: 'name' };
  if (h.includes('学号')) return { kind: 'match', by: 'studentId' };
  // ② 单值
  if (h.includes('手机号') || h.includes('电话')) return { kind: 'text', key: 'phone' };
  if (h.includes('年级')) return { kind: 'text', key: 'grade' };
  if (h.includes('专业')) return { kind: 'text', key: 'major' };
  if (h.includes('承担学生工作') || h.includes('担任班干部')) return { kind: 'bool', key: 'hasStudentWork' };
  // ③ ⚠ 顺序敏感：问卷长列名会同时命中多个关键词，**具体者先判**——
  //    「…学生工作/志愿服务中是否独立负责…」含「学生工作」与「志愿」⇒ 必须排在两者之前。
  if (h.includes('独立负责')) return { kind: 'bool', key: 'ledProject' };
  if (h.includes('活动名称')) return { kind: 'list', key: 'keyProjects', sub: 'name' };
  if (h.includes('工作内容')) return { kind: 'list', key: 'keyProjects', sub: 'work' };
  if (h.includes('奖项') || h.includes('荣誉')) {
    if (h.includes('级别') && h.includes('补充')) return { kind: 'list', key: 'honors', sub: 'levelOther' };
    if (h.includes('级别')) return { kind: 'list', key: 'honors', sub: 'level' };
    if (h.includes('名称')) return { kind: 'list', key: 'honors', sub: 'name' };
    return null;
  }
  if (h.includes('熟悉') && h.includes('补充')) return { kind: 'text', key: 'familiarWorksOther' };
  if (h.includes('熟悉')) return { kind: 'multi', key: 'familiarWorks' };
  if (h.includes('志愿') && h.includes('时长')) return { kind: 'text', key: 'volunteerHours' };
  if (h.includes('志愿')) return { kind: 'bool', key: 'volunteered' };
  if (h.includes('未来发展') && h.includes('补充')) return { kind: 'text', key: 'futureDirectionsOther' };
  if (h.includes('未来发展')) return { kind: 'multi', key: 'futureDirections' };
  if (h.includes('经历') && h.includes('特长')) return { kind: 'text', key: 'extraNote' };
  // ④ 子表（学生工作）——放最后：其关键词最泛（多数问卷列名前缀都含「学生工作」）
  if (h.includes('学生工作')) {
    if (h.includes('类别')) return { kind: 'list', key: 'studentWorks', sub: 'category' };
    if (h.includes('部门') || h.includes('班级')) return { kind: 'list', key: 'studentWorks', sub: 'dept' };
    if (h.includes('职务')) return { kind: 'list', key: 'studentWorks', sub: 'title' };
    return null;
  }
  return null;
}

/** 依表头行判分隔符（制表符 / 逗号 / 全角逗号取出现最多者；都没有 ⇒ 制表符） */
export function detectDelimiter(headerLine) {
  const cands = ['\t', ',', '，'];
  let best = '\t', bestN = 0;
  for (const d of cands) {
    const n = String(headerLine || '').split(d).length - 1;
    if (n > bestN) { bestN = n; best = d; }
  }
  return best;
}

/**
 * 解析表格文本 → `{ headers, rows }`（跳过空行；每行按分隔符切开并 trim；不足列补 ''）。
 * @returns {{ok:boolean, reason?:string, delimiter?:string, headers?:string[], rows?:string[][]}}
 */
export function parseSelfProfileSheet(text) {
  const lines = String(text == null ? '' : text)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== '');
  if (lines.length < 2) return { ok: false, reason: '至少要有「表头 ＋ 一行数据」两行' };
  const delimiter = detectDelimiter(lines[0]);
  const cut = (l) => l.split(delimiter).map((c) => String(c).trim());
  const headers = cut(lines[0]);
  // 「可识别列」只认映射到 selfProfile 字段的列；`姓名/学号` 仅是**匹配键**，不算内容列。
  if (!headers.some((h) => { const t = headerToTarget(h); return t && t.kind !== 'match'; })) {
    return { ok: false, reason: '表头未识别到任何「自我描述」列（请带上问卷导出的列名，且含「姓名」或「学号」列用于匹配）' };
  }
  if (!headers.some((h) => ['name', 'studentId'].includes((headerToTarget(h) || {}).by))) {
    return { ok: false, reason: '表头缺「姓名」或「学号」列 —— 无匹配键，导入无法定位成员' };
  }
  const rows = lines.slice(1).map(cut).map((cells) => {
    const out = headers.map((_, i) => cells[i] === undefined ? '' : cells[i]);
    return out;
  }).filter((cells) => cells.some((c) => c !== ''));
  if (!rows.length) return { ok: false, reason: '表头之外没有数据行' };
  return { ok: true, delimiter, headers, rows };
}

/** 单元格 → 布尔（「是 / 有 / 参加」→ true；「否 / 没有」→ false；空 → null） */
function _toBool(cell) {
  const s = String(cell == null ? '' : cell).trim();
  if (!s) return null;
  if (/^(是|有|参加|参加过|是)/.test(s)) return true;
  if (/^(否|没有|无|未|不)/.test(s)) return false;
  return null;
}

/** 依表头规格把一行单元格收集成 raw selfProfile（未净化） */
function _rowToRaw(headers, cells) {
  const raw = {};
  let hasAny = false;
  headers.forEach((h, i) => {
    const t = headerToTarget(h);
    if (!t || t.kind === 'match') return;
    const cell = String(cells[i] == null ? '' : cells[i]).trim();
    if (!cell) return;
    hasAny = true;
    if (t.kind === 'text') raw[t.key] = cell;
    else if (t.kind === 'bool') raw[t.key] = _toBool(cell);
    else if (t.kind === 'multi') raw[t.key] = cell; // 叶子按分隔符拆
    else if (t.kind === 'list') {
      const arr = Array.isArray(raw[t.key]) ? raw[t.key] : [];
      if (!arr[0]) arr[0] = {};
      arr[0][t.sub] = cell;
      raw[t.key] = arr;
    }
  });
  return { raw, hasAny };
}

/** 非空字段计数（预览用；`bool` 计 true/false、`multi`/`list` 计非空元素） */
function _nonEmptyCount(sp) {
  let n = 0;
  for (const f of SELF_PROFILE_FIELDS) {
    const v = sp[f.key];
    if (f.type === 'bool') { if (v === true || v === false) n += 1; continue; }
    if (f.type === 'multi') { if (Array.isArray(v) && v.length) n += 1; continue; }
    if (f.type === 'list') { if (Array.isArray(v) && v.length) n += 1; continue; }
    if (String(v || '')) n += 1;
  }
  return n;
}

/**
 * 构建导入预览（纯）：解析 → 逐行映射/净化 → 按**学号优先、姓名次之**匹配成员。
 * @param {string} text 粘贴文本（Excel 制表符 / CSV 逗号）
 * @param {Array<Object>} members 成员档案（须含 id / name / studentId）
 * @returns {{ok:boolean, reason?:string, delimiter?:string, rows?:Array, counts?:Object}}
 *   `rows[]` = `{ personId|null, name, studentId, status:'matched'|'unmatched'|'ambiguous'|'empty', selfProfile, fields, problems[] }`
 */
export function buildSelfProfileImport(text, members) {
  const parsed = parseSelfProfileSheet(text);
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  const list = Array.isArray(members) ? members : [];
  const byStudentId = new Map();
  const byName = new Map();
  for (const m of list) {
    if (!m || !m.id) continue;
    const sid = String(m.studentId || '').trim();
    if (sid) byStudentId.set(sid, m.id);
    const nm = String(m.name || '').trim();
    if (nm) byName.set(nm, [...(byName.get(nm) || []), m.id]);
  }

  const nameIdx = parsed.headers.findIndex((h) => (headerToTarget(h) || {}).by === 'name');
  const sidIdx = parsed.headers.findIndex((h) => (headerToTarget(h) || {}).by === 'studentId');

  const rows = [];
  for (const cells of parsed.rows) {
    const name = nameIdx >= 0 ? cells[nameIdx] : '';
    const studentId = sidIdx >= 0 ? cells[sidIdx] : '';
    const { raw, hasAny } = _rowToRaw(parsed.headers, cells);
    const selfProfile = sanitizeSelfProfile(raw);
    const fields = _nonEmptyCount(selfProfile);
    const problems = [];
    let personId = null;
    let status = 'unmatched';
    if (studentId && byStudentId.has(studentId)) {
      personId = byStudentId.get(studentId);
      status = 'matched';
    } else if (name && (byName.get(name) || []).length === 1) {
      personId = byName.get(name)[0];
      status = 'matched';
    } else if (name && (byName.get(name) || []).length > 1) {
      status = 'ambiguous';
      problems.push('姓名重名（须带学号）');
    } else {
      problems.push(studentId ? '学号未在名册中' : '未匹配到成员（缺学号 / 姓名）');
    }
    if (status === 'matched' && !hasAny) { status = 'empty'; problems.push('该行无自我描述内容'); }
    rows.push({ personId, name, studentId, status, selfProfile, fields, problems });
  }

  const counts = {
    total: rows.length,
    matched: rows.filter((r) => r.status === 'matched').length,
    empty: rows.filter((r) => r.status === 'empty').length,
    unmatched: rows.filter((r) => r.status === 'unmatched').length,
    ambiguous: rows.filter((r) => r.status === 'ambiguous').length,
  };
  return { ok: true, delimiter: parsed.delimiter, headers: parsed.headers, rows, counts };
}
