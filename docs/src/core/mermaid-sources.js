// role: [工程师]+[AI]
// mermaid-sources.js — 功能地图 mindmap 文本 + 业务链路 flowchart 步骤（浏览器 / node 共享单一实现）
// 消费方：
//   docs/scripts/gen-function-mermaid.mjs（node ESM：README/FUNCTION_MAP.md 图产物）
//   docs/src/modules/help-catalog.js（浏览器：help 页功能地图/业务链路 mermaid 源）
// 数据源：docs/src/core/function-catalog.js（单一事实源；纯数据表达式，node 可直接 import）
// 约定：本文件为纯 ESM，不依赖任何 node API / 浏览器 API，双端可加载
import { FUNCTION_GROUPS, FUNCTION_CATALOG } from './function-catalog.js';

function tag(it) {
  return it.generic ? '通用' : '特有';
}

// 功能地图 mindmap 文本（root((系统功能)) + 6 组 + 条目名（通用/特有），与 gen 脚本同逻辑）
// 注意：节点文本不含半角分号，冒号用全角（mermaid mindmap 语法兼容）
export function generateMindmapText() {
  const lines = ['mindmap', '  root((系统功能))'];
  for (const g of FUNCTION_GROUPS) {
    const its = FUNCTION_CATALOG.filter((i) => i.group === g);
    if (!its.length) continue;
    lines.push(`    ${g}`);
    for (const it of its) lines.push(`      ${it.name}（${tag(it)}）`);
  }
  return lines.join('\n');
}

// 业务链路 flowchart 步骤（5 条 flow；补课回写为「考勤回写 / 逾期清除」）
export const FLOW_STEPS = {
  'flow-activity': ['A[书记/组长创建活动] --> B[议程：讨论文件 / 待讨论名单]', 'B --> C[会后记录「通过」]', 'C --> D[草案自动归档]', 'D --> E[资料查询展示「经《活动》讨论通过」]'],
  'flow-member-change': ['A[议程「待讨论名单」记录通过] --> B[生成成员变更申请]', 'B --> C[组织委员审批通过]', 'C --> D[广播通知全体支委]', 'D --> E[书记确认]', 'E --> F[发展阶段更新]'],
  'flow-taskforce': ['A[发起专班] --> B[组织委员招募统筹]', 'B --> C[定人定责定岗]', 'C --> D[工作量记录]'],
  'flow-thought-report': ['A[成员提交思想汇报] --> B[自动入库归集]', 'B --> C[组织委员查看归档]'],
  'flow-makeup': ['A[缺勤记录] --> B[生成补课任务]', 'B --> C[完成补课]', 'C --> D[考勤回写 / 逾期清除]', 'D --> E[逾期清除]'],
};
