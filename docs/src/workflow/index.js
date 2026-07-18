// role: [工程师]+[AI]
// ── SOP 任务实例化（已有） ──
export { sopDatabase } from './sopData.js';
export { instantiateSOP } from './sop.js';

// ── 工作流可视化渲染器（C1.1.3） ──
export { renderWorkflow } from './renderer.js';

// ── 活动记录数据模型（C1.1.5 v2.0 — 宣传专班多维表格） ──
export { createStoreWithMockData } from './activityRecord.js';
