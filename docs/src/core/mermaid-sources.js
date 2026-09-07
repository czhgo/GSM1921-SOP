// role: [工程师]+[AI]
// mermaid-sources.js — 功能地图 mindmap 文本 + 业务链路 flowchart（角色化 FLOW_LINKS）（浏览器 / node 共享单一实现）
// 消费方：
//   docs/scripts/gen-function-mermaid.mjs（node ESM：README/FUNCTION_MAP.md 图产物）
//   docs/src/modules/help-catalog.js（浏览器：help 页功能地图/业务链路 mermaid 源）
// 数据源：docs/src/core/function-catalog.js（单一事实源；纯数据表达式，node 可直接 import）
// 约定：本文件为纯 ESM，不依赖任何 node API / 浏览器 API，双端可加载
import { FUNCTION_GROUPS, FUNCTION_CATALOG } from './function-catalog.js?v=20260908a';

function tag(it) {
  return it.generic ? '通用' : '特有';
}

// 功能地图 mindmap 文本（root((系统功能)) + 6 组 + 条目名（通用/特有），与 gen 脚本同逻辑）
// 口径：只列 kind === 'feature'（书记 2026-09-02 裁定：flow/arch 仅在各自章节成图，避免与 feature 语义重叠）
// 注意：节点文本不含半角分号，冒号用全角（mermaid mindmap 语法兼容）
export function generateMindmapText() {
  const lines = ['mindmap', '  root((系统功能))'];
  for (const g of FUNCTION_GROUPS) {
    const its = FUNCTION_CATALOG.filter((i) => i.group === g && i.kind === 'feature');
    if (!its.length) continue;
    lines.push(`    ${g}`);
    for (const it of its) lines.push(`      ${it.name}（${tag(it)}）`);
  }
  return lines.join('\n');
}

// 业务链路 flowchart 步骤（12 条角色化链路；节点 = 执行者: 任务）
// 权威来源：docs/src/workflow/sopData.js（executor/supervisor）+ 快速指南 + voteConfig 模型
// 与 function-catalog.js 的 flow 条目 id 一一对应（防漂移测试以 catalog 为准）
export const FLOW_LINKS = {
  // ── 活动型 ──
  'flow-branch-committee': [
    'A[书记: 确定议题并提前通知] --> B[纪检委员: 签到考勤]',
    'B --> C[书记: 主持并记录会议决议]',
    'C --> D[宣传委员: 归档会议材料]',
    'D --> E[纪检委员: 跟进请假缺勤补课]',
  ],
  'flow-online-committee': [
    'A[书记: 创建线上支委会并定稿议程] --> B[委员: 异步表态（同意/异议/附言）]',
    'B --> C[书记: 汇总表态并截止]',
    'C --> D[书记: 记录会议决议]',
  ],
  'flow-group-meeting': [
    'A[党小组组长: 统筹时间·确定主题·提前通知] --> B[党小组组长: 现场发布考勤二维码]',
    'B --> C[纪检委员: 签到考勤]',
    'C --> D[党员: 述职自评与互相批评]',
    'D --> E[党小组组长: 总结·汇总会议记录]',
    'E --> F[纪检委员: 考勤汇总·参与分层记录]',
    'F --> G[宣传委员: 归档党小组会记录]',
  ],
  'flow-party-lecture': [
    'A[书记: 发布党课通知与学习材料] --> B[书记: 提醒缺席党员补课]',
  ],
  'flow-theme-party': [
    'A[组织者: 策划并发起活动] --> B[支委扩大会: 讨论通过]',
    'B --> C[组织者: 建群·发布通知·联系委员]',
    'C --> D[纪检委员: 对接考勤要求与复盘底线]',
    'D --> E[组织者: 活动实施（签到/拍照/记录）]',
    'E --> F[纪检委员: 考勤确认·复盘监督]',
    'F --> G[组织者: 完成活动复盘]',
    'G --> H[宣传委员: 归档宣传与活动材料]',
  ],
  'flow-general-meeting': [
    'A[党小组组长: 统筹时间·确定会议主题] --> B[书记: 大群统一发布通知]',
    'B --> C[纪检委员: 签到考勤]',
    'C --> D[党员: 讨论议题并表决]',
    'D --> E[书记: 记录会议决议]',
    'E --> F[纪检委员: 考勤汇总·补课跟进]',
    'F --> G[宣传委员: 推文与工作记录归档]',
  ],
  // ── 事务型 ──
  'flow-taskforce': [
    'A[书记/组长/委员: 发起专班] --> B[组织委员: 招募统筹]',
    'B --> C[组织委员: 定人定责定岗]',
    'C --> D[专班成员: 执行分工并记录贡献]',
  ],
  'flow-development': [
    'A[支委会: 讨论推荐为发展对象] --> B[支部党员大会: 表决发展为预备党员]',
    'B --> C[书记: 记录议程「待讨论名单」通过]',
    'C --> D[组织委员: 审批成员变更申请]',
    'D --> E[书记: 确认并更新发展阶段]',
  ],
  'flow-inspection': [
    'A[党小组组长: 日常观察（态度与能力）] --> B[组织委员: 建立并维护考察档案]',
    'B --> C[组织委员: 归集并查看思想汇报]',
    'C --> D[党小组组长: 向书记反馈考察意见]',
    'D --> E[支委会/支部党员大会: 讨论是否发展]',
  ],
  'flow-institution': [
    'A[条条委员: 起草制度初稿] --> B[条条委员: 本组试点征求意见]',
    'B --> C[党小组组长: 在各党小组征求意见]',
    'C --> D[条条委员: 修改完善并提交]',
    'D --> E[支委会: 审议]',
    'E --> F[支部党员大会: 表决通过]',
    'F --> G[条条委员: 监督落实与适时修订]',
  ],
  'flow-makeup': [
    'A[纪检委员: 记录缺勤] --> B[纪检委员: 生成补课任务]',
    'B --> C[缺勤成员: 完成补课]',
    'C --> D[纪检委员: 考勤回写 / 逾期清除]',
  ],
  'flow-thought-report': [
    'A[党员: 提交思想汇报] --> B[系统: 自动归集至考察档案]',
    'B --> C[组织委员: 查看与调用]',
  ],
};
