// role: [工程师]+[AI]
// server/test/contract-doc-guard.test.mjs — 「契约」类文档守卫（2026-11-08 批次 537）
// ════════════════════════════════════════════════════════════════
// 为什么需要：
//   `content/04_web_design` 新增第五类载体「契约」（落点 `contracts/`），回答「实现必须遵守什么
//   结构 / 版本 / 兼容 / 验收」。没有守卫时，`type: contract` 会被随手写进普通规范 / 判例文档，
//   读者无法区分「规范效力」与「说明件」；契约本身也会缺 owner / acceptance 而无从验收。
//
// 判据（纯 node 静态扫描，不起服务、不引 playwright）：
//   CD1 `content/04_web_design/contracts/*.md` 逐份必备 `type: contract` / `status` / `version` /
//       `owner` / `acceptance`（frontmatter 单行键值；目录索引 `README.md` 属「索引」载体，不参与契约
//       字段校验，但必须存在并写明五键口径；目录尚未建立时登记 0 份，校验器由 CD3 守住）
//   CD2 非 `contracts/` 文档不得声明 `type: contract`（白名单为空；新增例外须逐条写理由）
//   CD3 非空转：合成 1 份合格契约判绿；逐个缺字段必须判红
// ════════════════════════════════════════════════════════════════
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const CONTENT = join(ROOT, 'content');
const CONTRACTS = join(CONTENT, '04_web_design', 'contracts');

/** 非 contracts 目录里允许声明 `type: contract` 的历史文档（当前为空；新增须逐条写理由） */
const LEGACY_WHITELIST = [];

const read = (f) => readFileSync(f, 'utf8');
const rel = (f) => relative(ROOT, f).replace(/\\/g, '/');

function walkMd(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const n of readdirSync(dir)) {
    const f = join(dir, n);
    if (statSync(f).isDirectory()) walkMd(f, out);
    else if (n.endsWith('.md')) out.push(f);
  }
  return out;
}

/** 取 frontmatter 键值（首块 `---` … `---`，只认单行 `key: value`） */
export function parseFrontmatter(src) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(src);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return fm;
}

/** 契约必备字段（纯函数，便于合成用例自检） */
export const CONTRACT_FIELDS = ['type', 'status', 'version', 'owner', 'acceptance'];

/** 返回契约文档的问题清单；空数组＝合格 */
export function contractProblems(src) {
  const fm = parseFrontmatter(src);
  if (!fm) return ['缺 frontmatter（`---` 块）'];
  const problems = [];
  if (fm.type !== 'contract') problems.push(`type 须为 contract（实为 ${fm.type || '缺失'}）`);
  for (const key of CONTRACT_FIELDS) {
    if (!fm[key]) problems.push(`缺 ${key}`);
  }
  return problems;
}

/** 契约文档＝contracts/ 下除目录索引外的 .md（README.md 是「索引」载体，见 contracts/README.md） */
const contractFiles = () => walkMd(CONTRACTS).filter((f) => !/[\\/]README\.md$/i.test(f));

test('CD1 contracts/*.md 逐份必备 type / status / version / owner / acceptance', () => {
  const idx = join(CONTRACTS, 'README.md');
  assert.ok(existsSync(idx), 'contracts/README.md 不存在——契约载体的状态词与变更规则无处登记');
  assert.match(read(idx), /type: contract/,
    'contracts/README.md 未写明 `type: contract` 必备字段口径（状态词与变更规则须可执行）');
  const files = contractFiles();
  const problems = files.flatMap((f) => contractProblems(read(f)).map((p) => `${rel(f)}：${p}`));
  assert.deepEqual(problems, [], `契约文档必备字段不全：\n  ${problems.join('\n  ')}`);
  if (!existsSync(CONTRACTS) || !files.length) {
    console.log('[contract-doc-guard] contracts/ 无契约正文：本项登记 0 份（校验器由 CD3 合成用例守住）');
  }
});

test('CD2 非 contracts 文档不得声明 type: contract（白名单为空）', () => {
  const docs = walkMd(CONTENT);
  // 非空转：扫描面要有规模（目录改名 / 解析写坏 ⇒ 命中恒空）
  assert.ok(docs.length >= 40, `content/ 只扫描到 ${docs.length} 份 .md（下限 40）：扫描面被写坏`);
  const offenders = docs
    .filter((f) => !relative(ROOT, f).replace(/\\/g, '/').startsWith('content/04_web_design/contracts/'))
    .filter((f) => !LEGACY_WHITELIST.includes(rel(f)))
    .filter((f) => /^type:\s*contract\b/m.test(read(f)))
    .map(rel)
    .sort();
  assert.deepEqual(offenders, [],
    `以下非 contracts/ 文档声明了 \`type: contract\`（契约只能落在 content/04_web_design/contracts/）：\n  ${offenders.join('\n  ')}`);
});

test('CD3 非空转：合格契约判绿；逐个缺字段必须判红', () => {
  const good = '---\ntype: contract\nstatus: active\nversion: 1.0.0\nowner: 支书\nacceptance: 见文末验收清单\n---\n\n# 示例契约\n';
  assert.deepEqual(contractProblems(good), [], '合格契约被判红（校验器写坏）');
  for (const key of CONTRACT_FIELDS) {
    const broken = good.replace(new RegExp(`^${key}:.*$`, 'm'), '');
    assert.ok(contractProblems(broken).length > 0, `缺 ${key} 未判红（校验器恒真）`);
  }
  assert.ok(contractProblems('没有 frontmatter 的正文').length > 0, '缺 frontmatter 未判红');
});
