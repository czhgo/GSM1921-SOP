// role: [工程师]+[AI]
// 党委工作台能力：tab 清单注册（P1 党委后台，2026-09-02）
// 自注册模式（M1 同款）：副作用导入即注册。薄壳入口经 getCapabilities({scope:'workspace:party-committee'}) 读取。
// 党委（party-staff）为组织级角色——监控全院各支部、管理支部实例（不参与任一支部内部闭环）
// 设计权威源：content/04_web_design/evolution/PARTY_COMMITTEE_DESIGN.md

import { registerCapability } from '../core/boot/registry.js?v=20261018a';
import { rolesForPage } from '../core/domain/constants.js?v=20261018a';

registerCapability({
  id: 'party-committee-workspace',
  name: '党委工作台',
  version: '20260901t',
  scope: ['workspace:party-committee'],
  requiredRoles: rolesForPage('party-committee.html'),
  tabs: () => [
    // 五个页签属于同一治理区；统一分组，避免导航中“首页 / 全院治理”重复插标。
    { id: 'governance-overview', label: '治理总览', groupLabel: '党委治理', render: (ctx) => import('../entries/tabs/party-committee/governance-overview-tab.js?v=20261018a').then(m => m.renderContent(ctx)) },
    { id: 'monitor', label: '支部监控台账', groupLabel: '党委治理', render: (ctx) => import('../entries/tabs/party-committee/monitor-tab.js?v=20261018a').then(m => m.renderContent(ctx)) },
    // P3 党委后台（2026-09-02）：支部上报接收与批复（发展节点/活动报备逐项批驳，结论回传支部）
    // D8 裁决批二（2026-09-08）：上报审批为党委高频待批复队列 → 前移至支部管理之前（表 C 党委台调序裁定）
    // **2026-10-04 批次 374（支书 `#10` 单一轴 · 支书圈丙）**：页签名「上报审批」→「**支部上报**」——
    //   党委侧**不上报、只接收 + 回复支部** ⇒ 名按对象（**支部上报事项台账**）、批/驳为页内动作。
    { id: 'review', label: '支部上报', groupLabel: '党委治理', render: (ctx) => import('../entries/tabs/party-committee/review-tab.js?v=20261018a').then(m => m.renderContent(ctx)) },
    { id: 'branches', label: '支部管理', groupLabel: '党委治理', render: (ctx) => import('../entries/tabs/party-committee/branches-tab.js?v=20261018a').then(m => m.renderContent(ctx)) },
    // D-824（2026-10-16）：党委不参与支部匿名反馈闭环；旧反馈核查入口已移除。
    // P3 党委后台（2026-09-02）：下发通知（复用通知实体，送达目标支部支委层，标「党委下发」来源）
    { id: 'dispatch', label: '下发通知', groupLabel: '党委治理', render: (ctx) => import('../entries/tabs/party-committee/dispatch-tab.js?v=20261018a').then(m => m.renderContent(ctx)) },
    // 支部能力配置通过“支部设置”独立页与可选的 wizard 模式承载，不另占党委治理页签。
  ],
});
