// server/test/catalog-sync.test.mjs — 「清单 / 目录类」口径同步守卫（**五件并一**，2026-09-15 批次 47-F 试点组）
//
// 合并来源（原五个独立文件，语义逐条保留、无削弱；断言均为描述性测试名、无 S 编号，故无需重编号）：
//   ① function-catalog.test.mjs      → T1 FUNCTION_CATALOG 结构合法
//   ② flow-catalog-sync.test.mjs     → T2 FLOW_LINKS 键集 ≡ catalog flow id 键集（双向）
//   ③ function-map-sync.test.mjs     → T3 根 README 功能地图标记块 = 实时生成
//   ④ vote-option-sync.test.mjs      → T4 server OPTION_ENUMS ≡ 前端 vote-config OPTION_SETS
//   ⑤ references-official-links.test.mjs → T5 官方制度文件链接 12371 + 新标签页打开
//
// 合并带来的实际收益（不只是「文件少」）：三份**重复的文本求值 helper**（`loadCatalog` /
//   `grab(relPath,name)` / `grabOptionSets`）收敛为**同一个** `grabExport()`——原先它们路径拼法、
//   `?v=` 剥离、正则各写一遍（同一个「从纯数据表达式取值」的口径散在三处）。
//
// 纪律（见 `REVIEW_QUEUE` 批次 47-F）：本文件是**一个域一个文件**的试点；后续按域逐组合并，
//   每组合并须同批改 `§0.2` + README 的守卫清单（漏改由 `doc-consistency.test.mjs::S9/S10/S11` 红灯拦住）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { generateMindmap } from '../../docs/scripts/gen-function-mermaid.mjs';
import { OPTION_ENUMS } from '../routes/committee.js';

const ROOT = fileURLToPath(new URL('../..', import.meta.url)); // 仓库根（含尾部分隔符）

/** 从「纯数据表达式」源文件里取 `export const <name> = …` 并求值（双环境可用，无需浏览器）。
 *  `relPath` 可带 `?v=` 版本戳——读盘前剥离（bump 脚本注入的模块版本戳不是文件系统路径的一部分）。 */
function grabExport(relPath, name) {
  const src = readFileSync(`${ROOT}${relPath.split('?')[0]}`, 'utf8');
  const m = new RegExp(`export const ${name} = ([\\s\\S]*?);\\s*(?:export|$)`, 'm').exec(src);
  assert.ok(m, `${relPath} 未找到 export const ${name}`);
  return new Function(`return (${m[1]})`)();
}

const CATALOG = 'docs/src/core/function-catalog.js';

// ── T1（原 function-catalog）：功能目录结构审计 ────────────────────────────────
test('T1 FUNCTION_CATALOG 结构合法（id/group/kind/role/related 全量校验）', () => {
  const groups = grabExport(CATALOG, 'FUNCTION_GROUPS');
  const items = grabExport(CATALOG, 'FUNCTION_CATALOG');
  assert.ok(Array.isArray(groups) && groups.length >= 5, 'GROUPS 至少 5 章');
  assert.ok(Array.isArray(items) && items.length >= 40, `条目至少 40 条，实际 ${items.length}`);
  const ids = new Set();
  const allIds = new Set(items.map((i) => i.id)); // 全量 id：related 可引用任意位置条目（含前向引用）
  const ROLES = ['secretary', 'org', 'prop', 'disc', 'leader', 'member', 'public'];
  for (const it of items) {
    assert.ok(it.id && /^[a-z0-9-]+$/.test(it.id), `id 非法：${it.id}`);
    assert.ok(!ids.has(it.id), `id 重复：${it.id}`);
    ids.add(it.id);
    assert.ok(it.name && typeof it.name === 'string');
    assert.ok(groups.includes(it.group), `group 未定义：${it.group}（${it.id}）`);
    assert.ok(typeof it.generic === 'boolean', `generic 必须 boolean：${it.id}`);
    assert.ok(['feature', 'flow', 'arch'].includes(it.kind), `kind 非法：${it.id}`);
    // kind 分支字段约定：feature 必须有 role（∈ 枚举）；flow/arch 允许无 role
    if (it.kind === 'feature') {
      assert.ok(ROLES.includes(it.role), `feature 条目 role 非法或缺失：${it.id}（role=${it.role}）`);
    }
    for (const r of it.related || []) {
      assert.ok(allIds.has(r) || r.startsWith('group:'), `related 引用不存在：${it.id} → ${r}`);
    }
  }
  // 链路与架构条目必须存在（12 条角色化链路 + 架构）
  const flowIds = items.filter((i) => i.kind === 'flow').map((i) => i.id);
  assert.ok(flowIds.length >= 12, `flow 条目至少 12 条，实际 ${flowIds.length}`);
  for (const required of ['flow-branch-committee', 'flow-general-meeting', 'flow-development', 'flow-institution', 'arch-layers']) {
    assert.ok(ids.has(required), `缺少必需条目 ${required}`);
  }
});

// ── T2（原 flow-catalog-sync）：两份手写清单不得未同步（双向） ─────────────────
// 2026-09-03 建立：落实 mermaid-sources.js 注释「与 function-catalog 的 flow 条目 id 一一对应」。
test('T2 FLOW_LINKS 键集 与 function-catalog flow id 键集双向一致（防止未同步的情况）', () => {
  const groups = grabExport(CATALOG, 'FUNCTION_GROUPS');
  const catalog = grabExport(CATALOG, 'FUNCTION_CATALOG');
  const flowLinks = grabExport('docs/src/core/mermaid-sources.js', 'FLOW_LINKS');

  const flowIds = catalog.filter((i) => i.kind === 'flow').map((i) => i.id);
  const linkKeys = Object.keys(flowLinks);

  assert.deepEqual(
    [...linkKeys].sort(),
    [...flowIds].sort(),
    'FLOW_LINKS 键集与 function-catalog 的 flow 条目必须一一对应：新增/删除业务链路时两侧需同步',
  );

  for (const id of flowIds) {
    const it = catalog.find((i) => i.id === id);
    assert.ok(groups.includes(it.group), `flow ${id} 的 group 未在 FUNCTION_GROUPS 中定义`);
    assert.ok(Array.isArray(flowLinks[id]) && flowLinks[id].length > 0, `FLOW_LINKS[${id}] 缺少节点步骤`);
  }
});

// ── T3（原 function-map-sync）：README 顶部功能地图 = 实时生成 ──────────────────
// 2026-09-03 起：独立 FUNCTION_MAP.md 不再随仓库维护，仅校验 README 标记块。
// 2026-09-09 起：功能地图迁至**根 README.md 顶部**（通用化门面；锚点 <!--FUNC-MAP:ANCHOR-->）。
test('T3 根 README.md 功能地图标记块与实时生成一致（防止未同步的情况）', () => {
  const readme = readFileSync(`${ROOT}README.md`, 'utf8');
  assert.ok(readme.includes('<!--FUNC-MAP:ANCHOR-->'), 'README.md 含功能地图锚点');
  const m = /<!--FUNC-MAP:START-->([\s\S]*?)<!--FUNC-MAP:END-->/.exec(readme);
  assert.ok(m, 'README.md 已含标记块');
  const norm = (s) => s.replace(/\r\n/g, '\n').trim(); // 归一化行尾（工作区 CRLF / 生成 LF 均可）
  assert.equal(norm(m[1]), norm(generateMindmap()), '标记块内容 = 实时生成');
});

// ── T4（原 vote-option-sync）：跨层表决枚举不得未同步（双向） ──────────────────
// 前端为业务单一源（含 label/labels/objectRequiresNote），server 仅镜像 options 键集。
test('T4 server OPTION_ENUMS 与前端 vote-config OPTION_SETS 键集双向一致', () => {
  const optionSets = grabExport('docs/src/services/vote-config.js', 'OPTION_SETS');

  const serverKeys = Object.keys(OPTION_ENUMS).sort();
  const frontKeys = Object.keys(optionSets).sort();
  assert.deepEqual(serverKeys, frontKeys, 'optionSet 名集合两端不一致（新增/删除表决模式需同步）');

  for (const key of frontKeys) {
    assert.deepEqual(
      [...OPTION_ENUMS[key]].sort(),
      [...optionSets[key].options].sort(),
      `optionSet「${key}」的选项键集两端不一致`,
    );
  }

  // 「异议须附言」仅 deliberative 适用（server committee.js 硬规则；前端 objectRequiresNote 镜像）
  assert.equal(optionSets.deliberative.objectRequiresNote, true, 'deliberative 应要求 object 附言');
  assert.equal(optionSets.formal.objectRequiresNote, false, 'formal 附言应选填');
  assert.ok(optionSets.deliberative.options.includes('object'), 'deliberative 应含 object');
  assert.ok(!optionSets.formal.options.includes('object'), 'formal 不应含 object（无必附言）');
});

// ── T5（原 references-official-links）：官方制度链接与安全打开 ─────────────────
test('T5 官方制度文件均链接至 12371 官方原文并在新标签页打开', () => {
  const source = readFileSync(`${ROOT}docs/src/modules/references.js`, 'utf8');
  const officialDocs = ['official-01', 'official-02', 'official-03', 'official-04', 'official-05'];

  for (const id of officialDocs) {
    const entry = source.match(new RegExp(`id: '${id}'[\\s\\S]*?(?=\\n  },|\\n\\];)`));
    assert.ok(entry, `缺少 ${id} 文档条目`);
    assert.match(entry[0], /url: 'https:\/\/(?:www\.)?12371\.cn\//, `${id} 必须使用 12371 官方链接`);
  }

  assert.match(
    source,
    /class="ref-download-btn" href="\$\{d\.url\}"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/,
    '有链接的文档按钮应在新标签页安全打开',
  );
});
