// role: [工程师]+[AI]
// audit/catalog.mjs — 页签审计目录（批次 526 · Wave 1-A）
//
// 口径见 `.trae/documents/2026-11-02-tab-audit-asset.md` §3.2：
//   · 页签清单**只从** `docs/src/capabilities/*-workspace.js` 读取（不在本文件手写第二份）；
//   · `blocks` 只从 `server/test/style-baseline.mjs::TAB_BLOCK_BASELINE` 读取；
//   · 启动时校验：45 项、键集合与 `TAB_BLOCK_BASELINE` 双向相等，否则抛错。
// ⚠ 新增 / 删除页签必须同批改 capabilities 注册表与 `TAB_BLOCK_BASELINE`，本文件自动跟随。

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TAB_BLOCK_BASELINE, TAB_BLOCK_TOTAL_BASELINE } from '../../test/style-baseline.mjs';

/** 七个工作台（与 `server/test/page-sweep.test.mjs::WORKS` 一致） */
export const ROLES = ['secretary', 'org', 'prop', 'disc', 'leader', 'visitor', 'party-committee'];

/** 页签数（契约固定 45；同时与基线规模常量对账） */
export const CATALOG_SIZE = 45;

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const CAPABILITIES_DIR = `${REPO_ROOT}docs/src/capabilities`;

/** 工作台 → 能力注册文件 */
const WORKSPACE_FILES = {
  secretary: 'secretary-workspace.js',
  org: 'org-workspace.js',
  prop: 'prop-workspace.js',
  disc: 'disc-workspace.js',
  leader: 'leader-workspace.js',
  visitor: 'visitor-workspace.js',
  'party-committee': 'party-committee-workspace.js',
};

/** `../entries/tabs/x/y.js?v=...` → `docs/src/entries/tabs/x/y.js` */
function normalizeSource(modulePath) {
  const clean = String(modulePath || '').split('?')[0].trim();
  if (!clean) return '';
  if (clean.startsWith('../entries/')) return `docs/src/${clean.slice(3)}`;
  return clean;
}

/**
 * 解析一个工作台能力文件里的 tab 声明。
 * 只用**声明形态**（`{ id: 'x', label: 'y'`）与紧随其后的 `loadTabModule('…')`；
 * 不执行浏览器模块（其中有 registry / DOM 依赖）。
 */
function parseWorkspace(role) {
  const file = `${CAPABILITIES_DIR}/${WORKSPACE_FILES[role]}`;
  let src;
  try {
    src = readFileSync(file, 'utf8');
  } catch (e) {
    throw new Error(`[audit/catalog] 读不到能力注册表 ${file}：${e.message}`);
  }
  const starts = [...src.matchAll(/\{\s*id:\s*'([^']+)',\s*label:\s*'([^']+)'/g)];
  return starts.map((match, index) => {
    const end = index + 1 < starts.length ? starts[index + 1].index : src.length;
    const body = src.slice(match.index, end);
    const moduleMatch = /loadTabModule\('([^']+)'\)/.exec(body);
    return {
      role,
      tab: match[1],
      label: match[2],
      source: normalizeSource(moduleMatch ? moduleMatch[1] : ''),
    };
  });
}

/** 45 项目录：`{ key, role, tab, label, source, blocks }` */
export const TAB_CATALOG = ROLES.flatMap((role) => parseWorkspace(role)).map((item) => {
  const key = `${item.role}.${item.tab}`;
  const baseline = TAB_BLOCK_BASELINE[key];
  return {
    key,
    role: item.role,
    tab: item.tab,
    label: item.label,
    source: item.source,
    blocks: baseline ? Number(baseline.blocks) : 0,
  };
});

/** key → 目录项（供编排层按 `--tab` 查找） */
export const CATALOG_BY_KEY = new Map(TAB_CATALOG.map((item) => [item.key, item]));

/**
 * 目录自检（编排层启动时调用）：
 * ① 条目数 = 45（且等于 `TAB_BLOCK_TOTAL_BASELINE`）；
 * ② key 唯一；③ 键集合与 `TAB_BLOCK_BASELINE` 双向相等；④ 必填字段非空。
 * @throws {Error} 任一条不成立
 */
export function assertCatalogIntegrity() {
  if (TAB_CATALOG.length !== CATALOG_SIZE) {
    throw new Error(`[audit/catalog] 页签数 ${TAB_CATALOG.length} ≠ ${CATALOG_SIZE}`);
  }
  if (TAB_CATALOG.length !== TAB_BLOCK_TOTAL_BASELINE) {
    throw new Error(`[audit/catalog] 页签数 ${TAB_CATALOG.length} ≠ TAB_BLOCK_TOTAL_BASELINE ${TAB_BLOCK_TOTAL_BASELINE}`);
  }
  const seen = new Set();
  for (const item of TAB_CATALOG) {
    if (seen.has(item.key)) throw new Error(`[audit/catalog] 重复 key：${item.key}`);
    seen.add(item.key);
    for (const field of ['key', 'role', 'tab', 'label', 'source']) {
      if (!item[field]) throw new Error(`[audit/catalog] ${item.key} 缺字段 ${field}（能力注册表解析失败？）`);
    }
    if (!ROLES.includes(item.role)) throw new Error(`[audit/catalog] ${item.key} 的 role「${item.role}」不是已知工作台`);
    if (!TAB_BLOCK_BASELINE[item.key]) throw new Error(`[audit/catalog] ${item.key} 未在 TAB_BLOCK_BASELINE 登记`);
  }
  const baselineKeys = new Set(Object.keys(TAB_BLOCK_BASELINE));
  const missing = [...baselineKeys].filter((key) => !seen.has(key));
  const extra = [...seen].filter((key) => !baselineKeys.has(key));
  if (missing.length || extra.length) {
    throw new Error(`[audit/catalog] 与 TAB_BLOCK_BASELINE 键集合不一致；缺：${missing.join(', ') || '无'}；多：${extra.join(', ') || '无'}`);
  }
  return true;
}
