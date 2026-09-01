// docs/scripts/gen-function-mermaid.mjs — 功能目录 → mermaid 图生成器
// 读 docs/src/core/function-catalog.js（文本求值，纯数据表达式），生成：
//   ① 功能地图（mindmap，含通用/特有文本标记）
//   ② 5 条业务链路（flowchart TD）
//   ③ 架构分层（flowchart TD）
//   ④ 服务依赖（flowchart LR）
// 写回 README 标记块（<!--FUNC-MAP:START/END-->）+ 输出 content/03_doc_system/FUNCTION_MAP.md
// 用法：node docs/scripts/gen-function-mermaid.mjs [--write]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url)); // docs/
const CATALOG_PATH = fileURLToPath(new URL('../src/core/function-catalog.js', import.meta.url));
const README_PATH = fileURLToPath(new URL('../../README.md', import.meta.url));
const MAP_PATH = fileURLToPath(new URL('../../content/03_doc_system/FUNCTION_MAP.md', import.meta.url));

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
  const { groups, items } = loadCatalog();
  const lines = ['```mermaid', 'mindmap', '  root((系统功能))'];
  for (const g of groups) {
    const its = items.filter((i) => i.group === g);
    if (!its.length) continue;
    lines.push(`    ${g}`);
    for (const it of its) {
      lines.push(`      ${it.name}（${tag(it)}）`);
    }
  }
  lines.push('```');
  return lines.join('\n');
}

function genFlow(id) {
  const map = {
    'flow-activity': ['A[书记/组长创建活动] --> B[议程：讨论文件 / 待讨论名单]', 'B --> C[会后记录「通过」]', 'C --> D[草案自动归档]', 'D --> E[资料查询展示「经《活动》讨论通过」]'],
    'flow-member-change': ['A[议程「待讨论名单」记录通过] --> B[生成成员变更申请]', 'B --> C[组织委员审批通过]', 'C --> D[广播通知全体支委]', 'D --> E[书记确认]', 'E --> F[发展阶段更新]'],
    'flow-taskforce': ['A[发起专班] --> B[组织委员招募统筹]', 'B --> C[定人定责定岗]', 'C --> D[工作量记录]'],
    'flow-thought-report': ['A[成员提交思想汇报] --> B[自动入库归集]', 'B --> C[组织委员查看归档]'],
    'flow-makeup': ['A[缺勤记录] --> B[生成补课任务]', 'B --> C[完成补课]', 'C --> D[考勤回写 / 逾期清除]', 'D --> E[逾期清除]'],
  };
  const flow = map[id];
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
    '  A[前台 · 14 页面] --> B[中台 · entries / components / core]',
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
    '通用能力（党建红）与支部特有（灰）在图例中说明。',
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
  const title = '### 功能地图';
  const section = `${title}\n\n${start}\n\n${block}\n\n${end}`;
  const hasStart = readme.includes(start);
  const hasEnd = readme.includes(end);
  if (hasStart && hasEnd) {
    const s = readme.indexOf(start);
    const e = readme.indexOf(end) + end.length;
    const before = readme.slice(0, s).replace(/\n### 功能地图\n*$/, '').replace(/\n+$/, '');
    const after = readme.slice(e);
    return `${before}\n\n${section}${after}`;
  }
  // 半损坏（只含 START 或缺 END 等）：先清理残留标记与紧邻标题，再按锚点重建
  const cleaned = (hasStart || hasEnd ? readme.replace(/### 功能地图\s*(?=<!--FUNC-MAP:)/g, '').replace(/<!--FUNC-MAP:START-->|<!--FUNC-MAP:END-->/g, '') : readme);
  const anchor = '\n## License\n';
  if (!cleaned.includes(anchor)) throw new Error('README 缺少 "## License" 锚点，无法插入功能地图');
  return cleaned.replace(anchor, `\n${section}\n\n## License\n`);
}

// CLI：--write 时写回 README + 输出 FUNCTION_MAP.md
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1] && process.argv.includes('--write')) {
  writeFileSync(README_PATH, applyToReadme(readFileSync(README_PATH, 'utf8')), 'utf8');
  writeFileSync(MAP_PATH, generateAll(), 'utf8');
  console.log('✓ 已生成 README 标记块 + FUNCTION_MAP.md');
}
