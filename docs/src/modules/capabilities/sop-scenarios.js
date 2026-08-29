// role: [工程师]+[AI]
// SOP 场景能力声明（T-279 M4 场景注册化）
// 自注册模式：import 本模块即触发注册（副作用导入）。消费点（decision-tree 场景读取等）
// 经 getCapabilities({scope:'scenario'}) 发现场景能力后，用 list/get 读取场景清单——
// 新增场景 = sopData.js 追加数据即可（纯数据驱动），注册表侧无需改动。
// 行为零变化：list/get 返回的仍是 sopDatabase.scenarios 的同一数据源。
// 设计权威源：content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §四.3（场景作为能力注册）

import { registerCapability } from '../../core/registry.js?v=20260829m';
import { sopDatabase } from '../../workflow/sopData.js?v=20260829m';

registerCapability({
  id: 'sop-scenarios',
  name: 'SOP 工作流场景库',
  version: '20260823b',
  scope: ['scenario'],
  requiredRoles: null,
  env: null,
  deps: ['data-adapter'],
  list: () => sopDatabase.scenarios,
  get: (scenarioId) => sopDatabase.scenarios.find((s) => s.scenarioId === scenarioId),
});
