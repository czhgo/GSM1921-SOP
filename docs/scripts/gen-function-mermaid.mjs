// docs/scripts/gen-function-mermaid.mjs — 功能目录 → mermaid 图生成器
// 读 docs/src/core/function-catalog.js（文本求值，纯数据表达式），生成：
//   ① 功能地图（mindmap，含通用/特有文本标记；文本来自共享模块 src/core/mermaid-sources.js）
//   ② 12 条角色化业务链路（flowchart TD；节点=执行者:任务，源来自共享模块 FLOW_LINKS）
//   ③ 架构分层（flowchart TD）
//   ④ 服务依赖（flowchart LR）
// 产物策略（2026-09-03；2026-09-09 迁位）：不再随仓库维护独立 FUNCTION_MAP.md（派生稿），
//   仓库内唯一地图 = **根 README.md 顶部标记块**（锚点 `<!--FUNC-MAP:ANCHOR-->` 之后，含
//   `<!--FUNC-MAP:START/END-->` 标记，仅 mindmap）——普世化叙事下功能地图置于门面最前。
//   完整四章文档 = 直接运行本脚本打印（stdout）供按需查看/引用，不落盘。
// 用法：node docs/scripts/gen-function-mermaid.mjs --write  # 更新根 README 顶部标记块
//       node docs/scripts/gen-function-mermaid.mjs          # stdout 打印完整四章
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { generateMindmapText, FLOW_LINKS } from '../src/core/mermaid-sources.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url)); // docs/
const CATALOG_PATH = fileURLToPath(new URL('../src/core/function-catalog.js', import.meta.url));
const README_PATH = fileURLToPath(new URL('../../README.md', import.meta.url));

export function loadCatalog() {
  const src = readFileSync(CATALOG_PATH, 'utf8');
  const grab = (name) => {
    const m = new RegExp(`export const ${name} = ([\\s\\S]*?);\\s*(?:export|$)`, 'm').exec(src);
    if (!m) throw new Error(`未找到 export const ${name}`);
    return new Function(`return (${m[1]})`)();
  };
  return { groups: grab('FUNCTION_GROUPS'), items: grab('FUNCTION_CATALOG') };
}

function tag(it) {
  return it.generic ? '通用' : '特有';
}

export function generateMindmap() {
  return ['```mermaid', generateMindmapText(), '```'].join('\n');
}

function genFlow(id) {
  const flow = FLOW_LINKS[id];
  if (!flow) throw new Error(`未注册 flow 图：${id}`);
  return ['```mermaid', 'flowchart TD', ...flow, '```'].join('\n');
}

export function generateAll() {
  const { items } = loadCatalog();
  const flows = items.filter((i) => i.kind === 'flow');
  const flowsMd = flows.map((f) => `### ${f.name}（${tag(f)}）\n\n${genFlow(f.id)}`).join('\n\n');
  const arch = [
    '```mermaid',
    'flowchart TD',
    '  A[前台 · 19 页面（12 根 + 7 工作台）] --> B[中台 · entries / components / core]',
    '  B --> C[服务层 · services / mock]',
    '  C --> D[后端 · server / REST API]',
    '  D --> E[母本 · content/02_institution/sop]',
    '  E -.制度驱动.-> B',
    '```',
  ].join('\n');
  const deps = [
    '```mermaid',
    'flowchart LR',
    '  activity --> attendance',
    '  attendance --> review',
    '  review --> todo',
    '  notification --> todo',
    '  agenda --> branch-doc',
    '  branch-doc --> search',
    '```',
  ].join('\n');
  return [
    '# 系统功能地图与服务逻辑（FUNCTION_MAP）',
    '',
    '> 本文件由 `node docs/scripts/gen-function-mermaid.mjs --write` 自动生成，勿手改；功能清单以 `docs/src/core/function-catalog.js` 为准。',
    '',
    '## 功能地图',
    '',
    '通用能力与支部特有以下方（通用）/（特有）文本标注区分。',
    '',
    generateMindmap(),
    '',
    '## 业务链路',
    '',
    flowsMd,
    '',
    '## 架构分层',
    '',
    arch,
    '',
    '## 服务依赖',
    '',
    deps,
    '',
  ].join('\n');
}

export function applyToReadme(readme) {
  const block = generateMindmap();
  const start = '<!--FUNC-MAP:START-->';
  const end = '<!--FUNC-MAP:END-->';
  const anchor = '<!--FUNC-MAP:ANCHOR-->';
  if (readme.includes(start) && readme.includes(end)) {
    // 已有标记块：原位替换内容（位置由 README 维护，不搬动）
    return readme.replace(new RegExp(`${start}[\\s\\S]*?${end}`), `${start}\n\n${block}\n\n${end}`);
  }
  if (!readme.includes(anchor)) throw new Error('README 缺少 <!--FUNC-MAP:ANCHOR--> 锚点，无法插入功能地图');
  const section = `## 功能地图\n\n> 通用能力与组织特有能力以（通用）/（特有）文本标注区分；本图由 \`node docs/scripts/gen-function-mermaid.mjs --write\` 从 docs/src/core/function-catalog.js 生成，勿手改（完整四章含业务链路/架构分层/服务依赖用同脚本 stdout 打印）。\n\n${start}\n\n${block}\n\n${end}`;
  return readme.replace(anchor, `${anchor}\n\n${section}`);
}

// CLI：--write 时只更新 README 标记块（独立 FUNCTION_MAP.md 已不随仓库维护，见头注释）；
// 直接运行时 stdout 打印完整四章（供按需查看/引用）。
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain && process.argv.includes('--write')) {
  writeFileSync(README_PATH, applyToReadme(readFileSync(README_PATH, 'utf8')), 'utf8');
  console.log('✓ 已更新 README 标记块（功能地图 mindmap）');
} else if (isMain) {
  console.log(generateAll());
}
