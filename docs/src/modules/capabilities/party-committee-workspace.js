// role: [工程师]+[AI]
// 党委工作台能力：tab 清单注册（P1 党委后台，2026-09-02）
// 自注册模式（M1 同款）：副作用导入即注册。薄壳入口经 getCapabilities({scope:'workspace:party-committee'}) 读取。
// 党委（party-staff）为组织级角色——监控全院各支部、管理支部实例（不参与任一支部内部闭环）
// 设计权威源：content/04_web_design/evolution/PARTY_COMMITTEE_DESIGN.md

import { registerCapability } from '../../core/registry.js?v=20260909e';
import { rolesForPage } from '../../core/constants.js?v=20260909e';

registerCapability({
  id: 'party-committee-workspace',
  name: '党委工作台',
  version: '20260901t',
  scope: ['workspace:party-committee'],
  requiredRoles: rolesForPage('party-committee.html'),
  tabs: () => [
    // 立项⑦ B波（2026-09-06）：「治理总览」= 党委治理首页/登录落点，置首。
    // 含支部概览列表（成员/党员/滞留实时统计 + 近期动态摘要）→ 支部卡「进入支部（演示）」。
    { id: 'governance-overview', label: '治理总览', groupLabel: '首页', render: (ctx) => import('../../entries/tabs/party-committee/governance-overview-tab.js?v=20260909e').then(m => m.renderContent(ctx)) },
    { id: 'monitor', label: '支部监控台账', groupLabel: '全院治理', render: (ctx) => import('../../entries/tabs/party-committee/monitor-tab.js?v=20260909e').then(m => m.renderContent(ctx)) },
    // P3 党委后台（2026-09-02）：支部上报审批（发展节点/活动报备逐项批驳，结论回传支部）
    // D8 裁决批二（2026-09-08）：上报审批为党委高频待批复队列 → 前移至支部管理之前（表 C 党委台调序裁定）
    { id: 'review', label: '上报审批', groupLabel: '全院治理', render: (ctx) => import('../../entries/tabs/party-committee/review-tab.js?v=20260909e').then(m => m.renderContent(ctx)) },
    { id: 'branches', label: '支部管理', groupLabel: '全院治理', render: (ctx) => import('../../entries/tabs/party-committee/branches-tab.js?v=20260909e').then(m => m.renderContent(ctx)) },
    // P3 党委后台（2026-09-02）：下发通知（复用通知实体，送达目标支部支委层，标「党委下发」来源）
    { id: 'dispatch', label: '下发通知', groupLabel: '全院治理', render: (ctx) => import('../../entries/tabs/party-committee/dispatch-tab.js?v=20260909e').then(m => m.renderContent(ctx)) },
    // 支部配置（工作流模块回炉 v2，2026-09-03 书记裁定）：配置属党委/部署期职责——
    // 从书记工作台移出，收拢到党委台；精简 UI（分组开关，无画布拖拽）
    { id: 'party-config', label: '支部配置', groupLabel: '支部治理', render: (ctx) => import('../../entries/tabs/party-committee/party-config-tab.js?v=20260909e').then(m => m.renderContent(ctx)) },
  ],
});
