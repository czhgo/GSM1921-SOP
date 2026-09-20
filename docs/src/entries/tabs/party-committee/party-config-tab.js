// role: [工程师]+[AI]
// 党委工作台 Tab：支部配置 → 换组织向导（2026-09-06 支书 R3/R4：向导吸收合并原 party-config）
// 支书 2026-09-03 裁定：原「工作台配置」定位不对 + UI 过重 → 已移出支书日常台收拢党委台；本次再升级为
// 5 步引导式「换组织向导」（组织信息/模块块组合/角色分工/术语制度+工作单/验证与重置），
// 裸开关清单收进步骤②；主体渲染下沉共享组件 components/org-setup-wizard.js
// （party-config 内容区 与 wizard.html 独立页 同源，防止两处未同步的情况）。
// 权限：党委台仅 party-staff 进入（canSwitchBranch 任意支部）；现任支书走独立页 wizard.html?branch=
// 写口：branch 服务既有校验语义（config 写口 = party-staff / 本支部现任支书）+ 即时生效留痕。

import { AuthStore } from '../../../services/auth.js?v=20260921d';
import { mountOrgSetupWizard } from '../../../components/org-setup-wizard.js?v=20260921d';

export function renderContent() {
  const el = document.getElementById('party-committee-tab-content');
  if (!el) return;

  if (el.dataset.currentTab !== 'party-config') {
    el.innerHTML = `
      <div class="space-y-4">
        <div class="rounded-lg border border-gray-200 bg-white p-4">
          <p class="text-xs text-gray-500">党委侧 · 换组织向导（吸收合并原「支部配置」；部署期/调整期使用，不在支部日常台出现）</p>
          <p class="font-title-cn text-base font-bold text-gray-800 mt-0.5">换组织向导 · 支部配置</p>
          <p class="text-xs text-gray-500 mt-1">其中<b>第③步「角色分工」</b>即支部分工编排（与支部侧「支部分工」tab 同源、同一数据）：</p>
          <p class="text-xs text-gray-500">· <b>支部日常</b>：支书工作台「支部分工」——调整走支委会议题表决后生效，分工变更自动派生责任人履职待办；</p>
          <p class="text-xs text-gray-500">· <b>党委/部署期</b>：本向导第③步可直接编排（换壳/新建支部时定基线），日常内政仍由支部自行调整。</p>
        </div>
        <div id="pc-wizard-host"></div>
      </div>`;
    el.dataset.currentTab = 'party-config';
  }

  const host = el.querySelector('#pc-wizard-host');
  if (!host) return;
  // 党委台能力仅 party-staff 可见；组件内再按 actor 角色兜底（非 party-staff 渲染无权限卡）
  const me = (typeof AuthStore?.getCurrentUser === 'function') ? AuthStore.getCurrentUser() : null;
  mountOrgSetupWizard(host, {
    actor: { personId: me && (me.personId || me.id), role: me ? me.role : '' },
    canSwitchBranch: true,
    branchId: null, // 默认首支部
    embed: true,
  });
}
