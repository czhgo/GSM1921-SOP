// role: [工程师]+[AI]
// 数据源能力声明（T-279 M4 数据源注册化）
// 自注册模式：import 本模块即触发注册（副作用导入），消费点（bootstrap 等）经注册表
// getCapabilities({scope:'data-source', env: getRuntimeEnv()}) 发现可用数据源后按需 apply。
// 行为零变化：apply 内部仍调用 data-adapter.setDataSource（与 bootstrap 既有切换逻辑一致）。
// 设计权威源：content/04_web_design/evolution/ARCHITECTURE_EVOLUTION.md §四.3（数据源注册为能力，按部署环境启用）

import { registerCapability } from '../../core/registry.js?v=20260901k';
import { setDataSource } from '../../core/data-adapter.js?v=20260901k';

// mock 数据源：全环境可用（本地 dev 默认 / prod 服务器不可达回退）
registerCapability({
  id: 'mock-data-source',
  name: '本地 Mock 数据源',
  version: '20260823a',
  scope: ['data-source'],
  requiredRoles: null,
  env: null,
  deps: ['data-adapter'],
  apply: () => setDataSource('mock'),
});

// api 数据源：生产环境启用（有后端 + JWT 时；dev 下有 token 亦可显式启用）
registerCapability({
  id: 'api-data-source',
  name: '后端 API 数据源',
  version: '20260823b',
  scope: ['data-source'],
  requiredRoles: null,
  env: ['prod'],
  deps: ['data-adapter'],
  apply: (ctx) => setDataSource('api', { apiBaseUrl: ctx?.apiBaseUrl || '', authToken: ctx?.authToken }),
});
