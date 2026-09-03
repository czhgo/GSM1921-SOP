// role: [工程师]+[AI]
// 党委工作台能力：tab 清单注册（P1 党委后台，2026-09-02）
// 自注册模式（M1 同款）：副作用导入即注册。薄壳入口经 getCapabilities({scope:'workspace:party-committee'}) 读取。
// 党委（party-staff）为组织级角色——监控全院各支部、管理支部实例（不参与任一支部内部闭环）
// 设计权威源：content/04_web_design/evolution/PARTY_COMMITTEE_DESIGN.md

import { registerCapability } from '../../core/registry.js?v=20260903a';
import { rolesForPage } from '../../core/constants.js?v=20260903a';

registerCapability({
  id: 'party-committee-workspace',
  name: '党委工作台',
  version: '20260901t',
  scope: ['workspace:party-committee'],
  requiredRoles: rolesForPage('party-committee.html'),
  tabs: () => [
    { id: 'monitor', label: '支部监控台账', groupLabel: '全院治理', render: (ctx) => import('../../entries/tabs/party-committee/monitor-tab.js?v=20260903a').then(m => m.renderContent(ctx)) },
    { id: 'branches', label: '支部管理', groupLabel: '全院治理', render: (ctx) => import('../../entries/tabs/party-committee/branches-tab.js?v=20260903a').then(m => m.renderContent(ctx)) },
    // P3 党委后台（2026-09-02）：支部上报审批（发展节点/活动报备逐项批驳，结论回传支部）
    { id: 'review', label: '上报审批', groupLabel: '全院治理', render: (ctx) => import('../../entries/tabs/party-committee/review-tab.js?v=20260903a').then(m => m.renderContent(ctx)) },
    // P3 党委后台（2026-09-02）：下发通知（复用通知实体，送达目标支部支委层，标「党委下发」来源）
    { id: 'dispatch', label: '下发通知', groupLabel: '全院治理', render: (ctx) => import('../../entries/tabs/party-committee/dispatch-tab.js?v=20260903a').then(m => m.renderContent(ctx)) },
  ],
});
