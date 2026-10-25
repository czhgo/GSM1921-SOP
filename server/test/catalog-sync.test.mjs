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
import { generateReadmeBlock } from '../../docs/scripts/gen-function-mermaid.mjs';
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

const CATALOG = 'docs/src/core/domain/function-catalog.js';

/** 角色键 → 工作台能力注册文件（页签名单一源；`member` 共用成员台 `visitor.html`） */
const ROLE_CAPABILITY_FILES = {
  secretary: 'docs/src/capabilities/secretary-workspace.js',
  org: 'docs/src/capabilities/org-workspace.js',
  prop: 'docs/src/capabilities/prop-workspace.js',
  disc: 'docs/src/capabilities/disc-workspace.js',
  leader: 'docs/src/capabilities/leader-workspace.js',
  member: 'docs/src/capabilities/visitor-workspace.js',
};

/** 从能力注册文件解析 `{ id, label }` 声明（与 doc-consistency 的 tabsOf 同口径） */
function tabLabelsOf(relPath) {
  const src = readFileSync(`${ROOT}${relPath}`, 'utf8');
  const labels = new Set();
  for (const line of src.split(/\r?\n/)) {
    const t = line.trimStart();
    if (t.startsWith('//') || !t.startsWith('{ id: ')) continue;
    const label = /label: '([^']+)'/.exec(line)?.[1];
    if (label) labels.add(label);
  }
  return labels;
}

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

  // usage 中的「页签名」必须属于该角色的能力注册 label 集（2026-10-22 第八轮 P1）：
  //   只认**跨台已知页签名**为页签名——普通动作词（选模板 / 创建 / 审批）不参与判定；
  //   出现在 usage 里却不在本角色 label 集，即「导航路径写到了别的台/已摘除的页签」。
  const labelsByRole = new Map(Object.entries(ROLE_CAPABILITY_FILES).map(([role, file]) => [role, tabLabelsOf(file)]));
  const allLabels = new Set([...labelsByRole.values()].flatMap((set) => [...set]));
  const usageProblems = [];
  for (const it of items.filter((i) => i.kind === 'feature' && i.role !== 'public' && i.usage)) {
    const roleLabels = labelsByRole.get(it.role);
    if (!roleLabels) continue;
    for (const seg of String(it.usage).split('→').map((s) => s.trim())) {
      if (allLabels.has(seg) && !roleLabels.has(seg)) {
        usageProblems.push(`${it.id}（${it.role}）：usage 页签名「${seg}」不在该角色注册页签 {${[...roleLabels].join(' / ')}}`);
      }
    }
  }
  assert.deepEqual(usageProblems, [], `功能目录 usage 写了不属于该角色的页签名：\n  ${usageProblems.join('\n  ')}`);
});

// ── T2（原 flow-catalog-sync）：两份手写清单不得未同步（双向） ─────────────────
// 2026-09-03 建立：落实 mermaid-sources.js 注释「与 function-catalog 的 flow 条目 id 一一对应」。
test('T2 FLOW_LINKS 键集 与 function-catalog flow id 键集双向一致（防止未同步的情况）', () => {
  const groups = grabExport(CATALOG, 'FUNCTION_GROUPS');
  const catalog = grabExport(CATALOG, 'FUNCTION_CATALOG');
  const flowLinks = grabExport('docs/src/core/domain/mermaid-sources.js', 'FLOW_LINKS');

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
// 2026-09-29 起（批次 268）：标记块由「只有 mindmap」扩为**三章**（能力地图 / 关键业务链路表 /
//   完整四章指针）——比较对象随之由 generateMindmap() 改为 generateReadmeBlock()；
//   并加严**非空转判据**：三章各自的可识别特征必须真在块内（防「生成器退化 ⇒ 断言恒真」）。
test('T3 根 README.md 功能地图标记块与实时生成一致（防止未同步的情况）', () => {
  const readme = readFileSync(`${ROOT}README.md`, 'utf8');
  assert.ok(readme.includes('<!--FUNC-MAP:ANCHOR-->'), 'README.md 含功能地图锚点');
  const m = /<!--FUNC-MAP:START-->([\s\S]*?)<!--FUNC-MAP:END-->/.exec(readme);
  assert.ok(m, 'README.md 已含标记块');
  const norm = (s) => s.replace(/\r\n/g, '\n').trim(); // 归一化行尾（工作区 CRLF / 生成 LF 均可）
  const block = norm(m[1]);
  assert.equal(block, norm(generateReadmeBlock()), '标记块内容 = 实时生成');

  // 非空转判据（三章特征齐备；缺一即说明生成器退化、断言将恒真）
  assert.ok(block.includes('```mermaid') && block.includes('mindmap'), '标记块须含能力地图 mindmap（第一章）');
  const flowCount = grabExport(CATALOG, 'FUNCTION_CATALOG').filter((i) => i.kind === 'flow').length;
  assert.ok(flowCount >= 12, `catalog flow 条目至少 12 条，实际 ${flowCount}`);
  const rows = block.split('\n').filter((l) => /^\| .+ \| .+ \| \d+ 步 \| .+ \|$/.test(l));
  assert.equal(rows.length, flowCount, `链路表数据行数须 = catalog flow 条数（${flowCount}），实得 ${rows.length}`);
  assert.ok(block.includes('gen-function-mermaid.mjs'), '标记块须含完整四章指针命令（第三章）');
});

// ── T4（原 vote-option-sync）：跨层表决枚举不得未同步（双向） ──────────────────
// 前端为业务单一源（含 label/labels/objectRequiresNote），server 仅镜像 options 键集。
test('T4 server OPTION_ENUMS 与前端 vote-config OPTION_SETS 键集双向一致', () => {
  const optionSets = grabExport('docs/src/services/activity/vote-config.js', 'OPTION_SETS');

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
  const source = readFileSync(`${ROOT}docs/src/components/sections/references.js`, 'utf8');
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

// ── T6（2026-10-25 批次 511 · IA 62→45）：IA 地图 ↔ 页签注册表 ────────────────
//   病灶：`PRODUCT_IA.md` 是**派生索引**（不承担规范、禁止手改），但它的页签表此前**无任何守卫**——
//     62 → 45 收敛时漏改一处，地图就会「多一个已删页签 / 少一个现行页签」；而注册表、help.html
//     各自为真（`doc-consistency::S1` 只对 help ↔ 注册），读者照着地图仍会找不到入口。
//   判据（Boolean）：① 地图行数 ＝ 页签总数（**45**，固定值）；② 逐台 label 集合 ≡ 注册表
//     （多一个 / 少一个 / 台名对不上都红）；③ 已降级的旧页签名不得在任何台重新注册
//     （「一功能一页签」；跨台重复必须先降级为页内区 + 深链重定向，见 `PRODUCT_IA` 重定向表）。
//   豁免：`成员流动` 的本位是组织台（支书台已降为页面级重定向）——只允许出现在组织台。
//   非空转：解析到的台数 ≥ 7、地图行 ≥ 45、注册 label 总量 ≥ 45（解析写坏 ⇒ 本条恒真）。

const IA_MAP = 'content/04_web_design/PRODUCT_IA.md';
const IA_EXPECTED_TOTAL = 45;

/** 台名（地图列）→ 注册文件 */
const IA_PAGE_FILES = [
  ['支书', 'docs/src/capabilities/secretary-workspace.js'],
  ['组织', 'docs/src/capabilities/org-workspace.js'],
  ['宣传', 'docs/src/capabilities/prop-workspace.js'],
  ['纪检', 'docs/src/capabilities/disc-workspace.js'],
  ['组长', 'docs/src/capabilities/leader-workspace.js'],
  ['成员', 'docs/src/capabilities/visitor-workspace.js'],
  ['党委', 'docs/src/capabilities/party-committee-workspace.js'],
];

/** 已降级的旧页签名 → 仍允许出现该名的台（空数组＝全站不得再注册） */
const IA_RETIRED_LABELS = {
  知情查看: [],
  活动日历: [],
  我的处置: [],
  宣传任务: [],
  我的考察: [],
  我的复盘: [],
  专班动态: [],
  成员流动: ['组织'],
};

test('T6 IA 地图 ≡ 页签注册表（45 条 · 逐台集合相等 · 已降级旧名不得重注册）', () => {
  const ia = readFileSync(`${ROOT}${IA_MAP}`, 'utf8');
  const start = ia.search(/^##\s*页签表/m);
  const end = ia.search(/^##\s*统计/m);
  assert.ok(start >= 0 && end > start, `${IA_MAP} 找不到「## 页签表」/「## 统计」边界：表格结构被改写`);
  const block = ia.slice(start, end);

  // ① 表头声明的总数 ＝ 固定 45
  const declared = Number(/##\s*页签表（(\d+)）/.exec(block)?.[1]);
  assert.equal(declared, IA_EXPECTED_TOTAL,
    `${IA_MAP} 表头声明的页签总数写 ${declared ?? '(缺)'}，应为 ${IA_EXPECTED_TOTAL}（IA 62→45 的目标）`);

  // ② 逐行取「台 | 页签」
  const iaRows = block.split(/\r?\n/).filter((l) => /^\|\s*(支书|组织|宣传|纪检|组长|成员|党委)\s*\|/.test(l));
  const iaByPage = new Map(IA_PAGE_FILES.map(([p]) => [p, new Set()]));
  for (const line of iaRows) {
    const c = line.split('|').map((s) => s.trim());
    iaByPage.get(c[1])?.add(c[3]);
  }
  assert.equal(iaRows.length, IA_EXPECTED_TOTAL,
    `${IA_MAP} 页签表解析到 ${iaRows.length} 行，应为 ${IA_EXPECTED_TOTAL} 行`);
  const statTotal = Number(/\|\s*\*\*合计\*\*\s*\|\s*\*\*(\d+)\*\*\s*\|/.exec(ia.slice(end))?.[1]);
  assert.equal(statTotal, iaRows.length,
    `${IA_MAP}「统计」合计写 ${statTotal ?? '(缺)'}，表体实为 ${iaRows.length} 行`);

  // ③ 逐台集合 ≡ 注册表（多 / 少都报出来）
  const problems = [];
  let regTotal = 0;
  for (const [page, file] of IA_PAGE_FILES) {
    const labels = tabLabelsOf(file);
    regTotal += labels.size;
    const mapped = iaByPage.get(page);
    assert.ok(mapped, `${IA_MAP} 缺「${page}」行组（台名与注册文件对不上）`);
    for (const l of labels) {
      if (!mapped.has(l)) problems.push(`${page}：注册表有「${l}」，${IA_MAP} 未登记`);
    }
    for (const l of mapped) {
      if (!labels.has(l)) problems.push(`${page}：${IA_MAP} 写了「${l}」，注册表无此页签`);
    }
  }
  assert.deepEqual(problems, [],
    `IA 地图与页签注册表不一致（地图是派生物：先改 capabilities/*，再同批重派生本表）：\n  ${problems.join('\n  ')}`);

  // ④ 一功能一页签：已降级的旧页签名不得重新注册（跨台重复必须降级）
  const regress = [];
  for (const [page, file] of IA_PAGE_FILES) {
    for (const label of tabLabelsOf(file)) {
      if (!Object.hasOwn(IA_RETIRED_LABELS, label)) continue;
      if (!IA_RETIRED_LABELS[label].includes(page)) {
        regress.push(`${page}：已降级页签名「${label}」被重新注册（旧名回潮）`);
      }
    }
  }
  assert.deepEqual(regress, [],
    `已降级的页签不得以独立页签回潮（新落点见 ${IA_MAP} 重定向表）：\n  ${regress.join('\n  ')}`);

  // ⑤ 非空转
  assert.equal(iaByPage.size, 7, `IA 地图台数解析为 ${iaByPage.size}（应 7）`);
  assert.ok(regTotal >= IA_EXPECTED_TOTAL,
    `注册 label 总量只有 ${regTotal}（下限 ${IA_EXPECTED_TOTAL}）：注册解析被写坏，本条会恒真`);
});
