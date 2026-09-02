// role: [工程师]+[AI]
// 党委工作台能力：tab 清单注册（P1 党委后台，2026-09-02）
// 自注册模式（M1 同款）：副作用导入即注册。薄壳入口经 getCapabilities({scope:'workspace:party-committee'}) 读取。
// 党委（party-staff）为组织级角色——监控全院各支部、管理支部实例（不参与任一支部内部闭环）
// 设计权威源：content/04_web_design/evolution/PARTY_COMMITTEE_DESIGN.md

import { registerCapability } from '../../core/registry.js?v=20260901y';
import { rolesForPage } from '../../core/constants.js?v=20260901y';

registerCapability({
  id: 'party-committee-workspace',
  name: '党委工作台',
  version: '20260901t',
  scope: ['workspace:party-committee'],
  requiredRoles: rolesForPage('party-committee.html'),
  tabs: () => [
    { id: 'monitor', label: '支部监控台账', groupLabel: '全院治理', render: (ctx) => import('../../entries/tabs/party-committee/monitor-tab.js?v=20260901y').then(m => m.renderContent(ctx)) },
    { id: 'branches', label: '支部管理', groupLabel: '全院治理', render: (ctx) => import('../../entries/tabs/party-committee/branches-tab.js?v=20260901y').then(m => m.renderContent(ctx)) },
  ],
});
