// docs/scripts/gen-function-mermaid.mjs — 功能目录 → mermaid 图生成器
// 读 docs/src/core/domain/function-catalog.js（文本求值，纯数据表达式），生成：
//   ① 功能地图（mindmap，含通用/特有文本标记；文本来自共享模块 src/core/mermaid-sources.js）
//   ② 12 条角色化业务链路（flowchart TD；节点=执行者:任务，源来自共享模块 FLOW_LINKS）
//   ③ 架构分层（flowchart TD）
//   ④ 服务依赖（flowchart LR）
// 产物策略（2026-09-03；2026-09-09 迁位；2026-09-29 批次 268 扩为三章）：不再随仓库维护独立
//   FUNCTION_MAP.md（派生稿），仓库内唯一地图 = **根 README.md 顶部标记块**（锚点
//   `<!--FUNC-MAP:ANCHOR-->` 之后，含 `<!--FUNC-MAP:START/END-->` 标记）——通用化门面下功能地图置于最前。
//   标记块三章（`generateReadmeBlock()`）：① 能力地图（mindmap）② 关键业务链路表
//   （**从 catalog flow 条目 + FLOW_LINKS 首/末节点派生**，不手写死数据）③ 完整四章指针。
//   完整四章文档（含逐条 flowchart）＝ 直接运行本脚本打印（stdout）供按需查看/引用，不落盘以免 README 臃肿。
// 用法：node docs/scripts/gen-function-mermaid.mjs --write  # 更新根 README 顶部标记块
//       node docs/scripts/gen-function-mermaid.mjs          # stdout 打印完整四章
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { generateMindmapText, FLOW_LINKS } from '../src/core/domain/mermaid-sources.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url)); // docs/
const CATALOG_PATH = fileURLToPath(new URL('../src/core/domain/function-catalog.js', import.meta.url));
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

// ── README 标记块（三章：能力地图 mindmap / 关键业务链路表 / 完整四章指针） ──────────
// 2026-09-29 批次 268：标记块由「只有 mindmap」扩为三章。链路表**全部派生**——
//   链路名取 catalog 的 kind==='flow' 条目（顺序即 catalog 顺序），起/终取 FLOW_LINKS 的
//   首/末节点，经＝FLOW_LINKS[id].length（箭头条数）；**不得手写死数据**，否则破坏 T2/T3 的同源纪律。

/** 解析 mermaid 节点 `A[执行者: 任务]` → { executor, task }（剥去轴标签与方括号） */
function parseNode(token) {
  const t = token.trim();
  const m = /^[A-Za-z0-9]+\[([\s\S]+)\]$/.exec(t);
  const text = (m ? m[1] : t).trim();
  const i = text.indexOf(': ');
  return i < 0 ? { executor: text, task: '' } : { executor: text.slice(0, i), task: text.slice(i + 2) };
}

/** 链路端点（单一源：FLOW_LINKS）：起＝首行首节点，终＝末行末节点，步数＝箭头条数 */
function flowSpan(id) {
  const lines = FLOW_LINKS[id];
  if (!Array.isArray(lines) || lines.length === 0) throw new Error(`FLOW_LINKS 未注册该链路或为空：${id}`);
  const nodes = (line) => line.split('-->').map(parseNode);
  const head = nodes(lines[0]);
  const tail = nodes(lines[lines.length - 1]);
  return { start: head[0], end: tail[tail.length - 1], steps: lines.length };
}

function catalogFlows() {
  return loadCatalog().items.filter((i) => i.kind === 'flow');
}

export function generateFlowTable() {
  const flows = catalogFlows();
  const rows = flows.map((f) => {
    const { start, end, steps } = flowSpan(f.id);
    return `| ${f.name} | ${start.executor} · ${start.task} | ${steps} 步 | ${end.executor} · ${end.task} |`;
  });
  return [
    `### 二、关键业务链路（${flows.length} 条）`,
    '',
    '> 本表**从单一源派生**（勿手改）：链路名与顺序取 `docs/src/core/domain/function-catalog.js` 的 flow 条目，起 / 终取 `docs/src/core/domain/mermaid-sources.js` 的 `FLOW_LINKS` 首 / 末节点，「经」＝该链路箭头步数。逐条 flowchart 见第三章。',
    '',
    '| 链路 | 起 | 经 | 终 |',
    '|------|----|----|----|',
    ...rows,
  ].join('\n');
}

export function generateReadmeBlock() {
  const count = catalogFlows().length;
  return [
    '### 一、能力地图（按制度域）',
    '',
    '> **读法**：本图按**制度域**分组（党建 / 宣传与档案 / 活动与专班 / 公共 / 角色工作台），与「角色工作台」不互斥——同一能力可能由多台承载，故「党建」组里既有页面也有职能。',
    '',
    generateMindmap(),
    '',
    generateFlowTable(),
    '',
    '### 三、完整四章（架构分层 · 服务依赖 · 数据流）',
    '',
    `> 完整四章（功能地图 · ${count} 条业务链路 flowchart · 架构分层 · 服务依赖）**不落盘**（免 README 臃肿）：运行 \`node docs/scripts/gen-function-mermaid.mjs\` 打印到 stdout 查看。`,
  ].join('\n');
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
    '  A[前台 · 根页面 + 工作台（页面清单以 docs/ 实测为准）] --> B[中台 · entries / components / core]',
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
    '> 本文件由 `node docs/scripts/gen-function-mermaid.mjs --write` 自动生成，勿手改；功能清单以 `docs/src/core/domain/function-catalog.js` 为准。',
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
  const eol = readme.includes('\r\n') ? '\r\n' : '\n';
  const sep = `${eol}${eol}`;
  const block = eol === '\n' ? generateReadmeBlock() : generateReadmeBlock().replace(/\n/g, eol);
  const start = '<!--FUNC-MAP:START-->';
  const end = '<!--FUNC-MAP:END-->';
  const anchor = '<!--FUNC-MAP:ANCHOR-->';
  if (readme.includes(start) && readme.includes(end)) {
    // 已有标记块：原位替换内容（位置由 README 维护，不搬动）
    return readme.replace(new RegExp(`${start}[\\s\\S]*?${end}`), `${start}${sep}${block}${sep}${end}`);
  }
  if (!readme.includes(anchor)) throw new Error('README 缺少 <!--FUNC-MAP:ANCHOR--> 锚点，无法插入功能地图');
  const section = [
    '## 功能地图',
    '',
    '> 通用能力与组织特有能力以（通用）/（特有）文本标注区分；本块三章（能力地图 / 关键业务链路表 / 完整四章指针）由 `node docs/scripts/gen-function-mermaid.mjs --write` 从 docs/src/core/domain/function-catalog.js 与 mermaid-sources.js 生成，勿手改（完整四章含逐条 flowchart 用同脚本 stdout 打印）。',
    '',
    start,
    '',
    block,
    '',
    end,
  ].join(eol);
  return readme.replace(anchor, `${anchor}${sep}${section}`);
}

// CLI：--write 时只更新 README 标记块（独立 FUNCTION_MAP.md 已不随仓库维护，见头注释）；
// 直接运行时 stdout 打印完整四章（供按需查看/引用）。
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain && process.argv.includes('--write')) {
  writeFileSync(README_PATH, applyToReadme(readFileSync(README_PATH, 'utf8')), 'utf8');
  console.log('✓ 已更新 README 标记块（三章：能力地图 / 关键业务链路表 / 完整四章指针）');
} else if (isMain) {
  console.log(generateAll());
}
