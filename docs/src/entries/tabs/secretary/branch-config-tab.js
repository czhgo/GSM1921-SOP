// role: [工程师]+[AI]
// entries/tabs/secretary/branch-config-tab.js — 书记工作台·支部配置 tab（U2，2026-09-07）
// 背景：换组织向导（components/org-setup-wizard.js）原仅两处可达——党委台内嵌
// （party-config-tab）与独立页 wizard.html（需手改 URL 带 branch=，且仅 secretary）；
// 书记/副书记工作台（secretary.html，两角色共台）无配置入口 → 本 tab 以本人所属支部
// 内嵌向导（embed:true），纯点击可达。
// 权限轨（对齐 wizard-entry 独立页）：仅书记（secretary）/副书记（deputy-secretary）渲染；
// 共享组件内再按 actor 兜底（非 party-staff 时要求 branch.secretaryId===本人——副书记与
// 独立页一致落无权限卡，写口不越权）。org-setup-wizard.js 只读 import，勿改。

import { AuthStore } from '../../../services/auth.js?v=20260903c';
import { getBranchIdOfPerson, getBranchById } from '../../../services/branch.js?v=20260903c';

const TAB_ID = 'branch-config';
const ALLOWED_ROLES = ['secretary', 'deputy-secretary'];

/** 渲染书记台「支部配置」tab（secretary-tab-content 为各 tab 公共容器 → 独立子容器再 mount） */
export function renderContent() {
  const tc = document.getElementById('secretary-tab-content');
  if (!tc) return;

  // 公共容器由各 tab 共享且每次切换由目标 tab 重建（dataset.currentTab 为最近渲染方标记）；
  // 本 tab 首次渲染（或切走切回）才重建骨架，data setState 重渲染同 tab 时保留向导现场。
  if (tc.dataset.currentTab !== TAB_ID) {
    tc.innerHTML = '<div id="sec-branch-config-host"></div>';
    tc.dataset.currentTab = TAB_ID;
  }
  const host = tc.querySelector('#sec-branch-config-host');
  if (!host) return;

  // 权限门（角色判断放 tab 内部）：仅书记/副书记登录本台可见；其它访问（如党委演示视图）不渲染向导
  const me = (typeof AuthStore?.getCurrentUser === 'function') ? AuthStore.getCurrentUser() : null;
  if (!me || !ALLOWED_ROLES.includes(me.role)) {
    host.innerHTML = `<div class="rounded-xl border border-gray-200 bg-white p-6 text-center">
      <p class="text-sm text-gray-500">仅书记/副书记可在本工作台配置支部（党委组织员请至党委工作台「支部配置」）。</p></div>`;
    return;
  }

  // 人 → 所属支部（党员严格单支部；无 branchId 时 branch 服务兜底 br-b1——仍须有支部记录才可配置）
  const personId = me.personId || me.id;
  const branchId = personId ? getBranchIdOfPerson(personId) : null;
  const branch = branchId ? getBranchById(branchId) : null;
  if (!branchId || !branch) {
    host.innerHTML = `<div class="rounded-xl border border-gray-200 bg-white p-6 text-center">
      <p class="text-sm text-gray-500">未找到您所属支部——请先由党委在「支部管理」中确认归属。</p></div>`;
    return;
  }

  // mountOrgSetupWizard 自带 wzBound 守卫（已挂载直接返回）：同 tab 内后续重渲染不重复 mount
  if (host.dataset.wzBound === '1') return;
  import('../../../components/org-setup-wizard.js?v=20260908a')
    .then(({ mountOrgSetupWizard }) => {
      mountOrgSetupWizard(host, {
        actor: { personId, role: me.role }, // 现任书记可进本支部；副书记由组件内权限兜底（与 wizard.html 一致）
        branchId,
        embed: true,
      });
    })
    .catch((e) => console.error('[branch-config] 换组织向导加载失败', e));
}
