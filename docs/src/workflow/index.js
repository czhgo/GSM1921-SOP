// role: [人机]
// ── SOP 任务实例化（已有） ──
export { sopDatabase } from './sopData.js';
export { instantiateSOP } from './sop.js';

// ── 状态机引擎（C1.1.1） ──
export {
  WorkflowEngine,
  createEngine,
  canTransition,
  calcTimeoutStatus,
  EVENT_TYPES,
} from './engine.js';

// ── 活动流程定义模板（C1.1.4 v2.0 短期/长期双轨） ──
export {
  THEME_PARTY_DAY_DEFINITION,
  SHORT_TERM_DEFINITION,
  LONG_TERM_DEFINITION,
  DIMENSION_DEFINITIONS,
  DEFINITION_INDEX,
  getDefinition,
  findDefinition,
  DEFINITION_META,
} from './definitions.js';

// ── 工作流可视化渲染器（C1.1.3） ──
export {
  WorkflowRenderer,
  renderWorkflow,
  createMockEngine,
  createMockBlockedEngine,
  TEMPLATE_REGISTRY,
} from './renderer.js';

// ── 活动记录数据模型（C1.1.5 v2.0 — 宣传专班多维表格） ──
export {
  ActivityRecord,
  ActivityRecordStore,
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_OPTIONS,
  ACTIVITY_CATEGORIES,
  createStoreWithMockData,
  filterRecordsByRole,
} from './activityRecord.js';
