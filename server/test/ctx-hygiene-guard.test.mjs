// role: [工程师]+[AI]
// ctx-hygiene-guard.test.mjs — `.ctx` 准入边界与审计产物归档守卫（2026-10-20 批次 491）
//
// 病灶：`.ctx` 顶层长期混放审计原文（`AUDIT_*`）、脚本产物（`IA_*`）、历史草稿（`*_DRAFT.md`）
//   与真正的台账/日志 ⇒ 新会话分不清「现行台账」与「一次性审计原文」，目录变成筐。
// 判据（四条，均可机械核验）：
//   ① 顶层只允许白名单 9 项（logs / evidence / TIMESTAMPS / SNAPSHOT / REVIEW_QUEUE / ACTIVE_RULINGS /
//      ENGINEERING_ASSESSMENT / README / AGENTS）；2026-10-24 批次 509 补登后两项（索引与智能体说明是
//      顶层准入的正常入口，不是一次性审计产物）；
//   ② 顶层不得出现 `AUDIT_*` / `IA_*` / `*_DRAFT.md` / `snapshots/`；
//   ③ 归档文件必须在正式文档或 2026-10 执行日志中有指针（防「移了等于丢了」）；
//   ④ 脚本生成的产物必须有对应脚本（`IA_INVENTORY` ↔ `ia-inventory.mjs`）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const CTX = join(ROOT, '.ctx');
const ARCHIVE = join(CTX, 'logs', 'archive', '2026-10');

const ALLOWED = new Set([
  'logs',
  'evidence',
  'TIMESTAMPS.md',
  'SNAPSHOT.md',
  'REVIEW_QUEUE.md',
  'ACTIVE_RULINGS.md',
  'ENGINEERING_ASSESSMENT.md',
  'README.md',
  'AGENTS.md',
]);

const ARCHIVED_AUDITS = [
  'AUDIT_IA_CRITICAL.md',
  'IA_LINK_TRUTH.md',
  'IA_INVENTORY.md',
  'AUDIT_ROUND1_WORKBENCH_STRUCTURE.md',
  'AUDIT_ROUND2_MINIMUM_THREE_COSTS.md',
  'AUDIT_ROUND3_4_COMBINED.md',
  'WORKBENCH_67_TAB_AUDIT_DRAFT.md',
];

/** 指针检索面：正式文档 + 本批执行日志（历史日志正文不改写，只认 2026-10 当月） */
const POINTER_FILES = [
  'CLAUDE.md',
  'README.md',
  'README-server.md',
  'README-members.md',
  'CONTRIBUTING.md',
  'content/03_doc_system/OPERATIONS_GUIDE.md',
  'content/03_doc_system/DOC_MAP.md',
  'content/03_doc_system/ARCHITECTURE.md',
  'content/04_web_design/module/MODULE_UI_DESIGN.md',
  'content/05_ai_coding/PARALLEL_SKILL_AUDIT.md',
  'content/05_ai_coding/TEST_AND_VERIFICATION.md',
  'content/insights/工程与AI协作的全栈实践.md',
  '.ctx/logs/2026-10-EXECUTION_LOG.md',
];

test('① `.ctx` 顶层只允许白名单项（9 项）', () => {
  const entries = readdirSync(CTX);
  const extra = entries.filter((name) => !ALLOWED.has(name));
  assert.deepEqual(extra, [], `.ctx 顶层出现白名单外条目：${extra.join(' / ')}——先沉淀到正式文档，再归档到 logs/archive/YYYY-MM/`);
  for (const name of ALLOWED) {
    assert.ok(existsSync(join(CTX, name)), `.ctx 顶层缺白名单项 ${name}（白名单与实况脱节）`);
  }
});

test('② 顶层不得回潮审计原文 / 脚本产物 / 历史草稿', () => {
  const entries = readdirSync(CTX);
  const offenders = entries.filter((name) => /^(AUDIT_|IA_)/.test(name) || /_DRAFT\.md$/.test(name) || name === 'snapshots');
  assert.deepEqual(offenders, [], `.ctx 顶层回潮：${offenders.join(' / ')}（应移入 .ctx/logs/archive/2026-10/）`);
});

test('③ 归档审计原文必须有正式文档或当月执行日志指针', () => {
  const corpus = POINTER_FILES
    .filter((rel) => existsSync(join(ROOT, rel)))
    .map((rel) => readFileSync(join(ROOT, rel), 'utf8'))
    .join('\n');
  const missing = [];
  for (const name of ARCHIVED_AUDITS) {
    assert.ok(existsSync(join(ARCHIVE, name)), `归档缺文件 ${name}`);
    if (!corpus.includes(name)) missing.push(name);
  }
  assert.deepEqual(missing, [], `以下归档原文在正式文档与当月执行日志中都没有指针（移了等于丢了）：${missing.join(' / ')}`);
});

test('④ 生成类产物必须有对应脚本', () => {
  assert.ok(existsSync(join(ROOT, 'server', 'scripts', 'ia-inventory.mjs')), '缺 IA_INVENTORY 的生成脚本 ia-inventory.mjs');
  const script = readFileSync(join(ROOT, 'server', 'scripts', 'ia-inventory.mjs'), 'utf8');
  assert.match(script, /\.ctx\/logs\/archive\/2026-10\/IA_INVENTORY\.md/, 'ia-inventory.mjs 输出路径须指向归档目录');
  assert.ok(statSync(join(ARCHIVE, 'IA_INVENTORY.md')).isFile(), 'IA_INVENTORY 归档产物不存在');
});
