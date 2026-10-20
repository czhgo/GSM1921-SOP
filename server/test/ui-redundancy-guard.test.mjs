// role: [工程师]+[AI]
// ui-redundancy-guard.test.mjs — 固定冗余句回归守卫（2026-10-20 界面细化 × 冗余注释清理批）
//
// 来源：`.ctx/logs/archive/2026-10/UI_REDUNDANCY_AUDIT.md` 39 条中的 P1 文案组；
//   支书裁定：页头职责副标题全删、内部统计/系统机制词不进界面。
// 判据：`docs/**`（含 `docs/src/**`）的 HTML / JS / CSS 源码不得再出现下列固定冗余句：
//   · 组织生活与工作台账（A-01 首页 hero 副标题）
//   · 仅新增时采集 / 同时是登录账号 / 系统随阶段变更落档（A-03 人员档案小字）
//   · 全口径（A-05）· 最近卡点（A-06）· >条线<（A-06 表头）
// 为什么扫源码而不扫真机 DOM：这些句子都是模板串 / 静态 HTML 的固定文案，
//   运行时不会变体；源码级守卫能在合并前拦住回潮，且不依赖起服务与登录。
// 收基线纪律：合理例外必须进 WHITELIST 并写 reason（为何删掉仍会影响用户完成动作），
//   不得用「文件级跳过」代替。
// 运行：node --test server/test/ui-redundancy-guard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const DOCS = join(ROOT, 'docs');
const EXTS = ['.html', '.js', '.mjs', '.css'];
const SKIP_DIRS = new Set(['vendor', 'node_modules', '.git', '.tmp']);

/** 固定冗余句（逐字匹配；`>条线<` 只命中渲染用表头，不放宽到普通词组「条线」） */
const FORBIDDEN = [
  '组织生活与工作台账',
  '仅新增时采集',
  '同时是登录账号',
  '系统随阶段变更落档',
  '全口径',
  '最近卡点',
  '>条线<',
];

/** 合理例外台账：目前为空。新增例外必须写 { file, phrase, reason } 并说明「删掉会丢什么动作/状态」。 */
const WHITELIST = [];

function isWhitelisted(file, phrase) {
  return WHITELIST.some((x) => x.file === file && x.phrase === phrase);
}

/** 递归收集 docs 下需要扫描的源码文件（相对仓库根的 posix 路径，排序稳定） */
function scanFiles() {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (EXTS.some((ext) => entry.name.endsWith(ext))) out.push(relative(ROOT, abs).replace(/\\/g, '/'));
    }
  };
  walk(DOCS);
  return out.sort();
}

/** 抽取口径：返回源码里命中的固定冗余句（导出给非空转自检复用） */
export function hitsOf(src) {
  return FORBIDDEN.filter((phrase) => String(src).includes(phrase));
}

test('R1 固定冗余句不得回潮：docs/** 全量源码零命中', () => {
  const offenders = [];
  for (const file of scanFiles()) {
    const src = readFileSync(join(ROOT, file), 'utf8');
    for (const phrase of hitsOf(src)) {
      if (!isWhitelisted(file, phrase)) offenders.push(`${file} → 「${phrase}」`);
    }
  }
  assert.deepEqual(offenders, [], `以下位置仍出现已裁删的固定冗余句：\n  ${offenders.join('\n  ')}`);
});

test('R2 非空转：正样本命中、负样本不命中，且扫描面覆盖关键文件', () => {
  const files = scanFiles();
  assert.ok(files.length >= 100, `只扫描到 ${files.length} 个源码文件，扫描面异常（断言可能恒真）`);
  for (const rel of [
    'docs/index.html',
    'docs/workspace/secretary.html',
    'docs/workspace/visitor.html',
    'docs/src/entries/pages/person-entry.js',
    'docs/src/components/governance/work-overview.js',
    'docs/src/components/ui/custom-select.js',
  ]) {
    assert.ok(files.includes(rel), `扫描面漏掉关键文件 ${rel}`);
  }

  // 正例：每个固定句在合成串里都必须被抽出
  for (const phrase of FORBIDDEN) {
    assert.deepEqual(hitsOf(`前缀 ${phrase} 后缀`), [phrase], `抽取口径失效：「${phrase}」未被识别`);
  }
  // 负例：已改用的业务词与新表头不应误判
  assert.deepEqual(hitsOf('工作分工 / 待处理 / 逾期 / 阶段起始日 / —'), [], '抽取口径过宽：正常业务词被误判');
});
