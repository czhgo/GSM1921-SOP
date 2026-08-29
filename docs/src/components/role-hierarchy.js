// role: [工程师]+[AI]
// role-hierarchy.js — 8角色层级可视化组件
// 渲染：党支书(顶) → 纵线三委员+横线三党小组组长(中) → 成员+组织者+深度参与者平级(底)

import { ROLE_LABELS } from '../core/constants.js?v=20260829r';
import { getBasePath } from '../core/utils.js?v=20260829r';

const ROLE_DATA = {
  secretary: {
    name: '党支书',
    tag: '全局统筹',
    desc: '管理所有工作，是唯一的最终决策者',
    cssClass: 'role-secretary',
  },
  org: { name: '组织委员', tag: '发展数据 + 专班', cssClass: 'role-org' },
  prop: { name: '宣传委员', tag: '宣传档案', cssClass: 'role-prop' },
  disc: { name: '纪检委员', tag: '考勤 + 补课', cssClass: 'role-disc' },
  leader: { name: '党小组组长', tag: '学术组 / 就业组', cssClass: 'role-leader' },
  member: { name: '普通成员', tag: '参与 + 监督', cssClass: 'role-member' },
  organizer: { name: '组织者', tag: '牵头策划', cssClass: 'role-organizer' },
  deep: { name: '深度参与者', tag: '推进执行', cssClass: 'role-deep' },
};

function roleCard(data, extra = '') {
  return `
    <div class="rh-card ${data.cssClass}" ${extra}>
      <div class="rh-name">${data.name}</div>
      <div class="rh-tag">${data.tag}</div>
      ${data.desc ? `<div class="rh-desc">${data.desc}</div>` : ''}
    </div>`;
}

export function renderRoleHierarchy(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <div class="rh">
      <p class="rh-intro">
        这个系统里有 8 种身份。<strong>支委</strong>负责管理，<strong>党小组组长</strong>负责组织学习，<strong>组织者</strong>和<strong>深度参与者</strong>负责推进专项任务，<strong>成员</strong>参与和监督。
      </p>
      <p class="rh-term">
        支委是纵线（职能线），党小组组长是横线（小组线）——<em>条块双线管理</em>
      </p>

      <!-- 顶层：党支书 -->
      <div class="rh-tier">
        ${roleCard(ROLE_DATA.secretary, 'style="min-width:180px"')}
      </div>
      <div class="rh-connector">┃</div>

      <!-- 中层双线 -->
      <div class="rh-mid">
        <div class="rh-line-group">
          <span class="rh-line-label rh-line-v">纵线 · 职能线</span>
          <div class="rh-cards-row">
            ${roleCard(ROLE_DATA.org)}
            ${roleCard(ROLE_DATA.prop)}
            ${roleCard(ROLE_DATA.disc)}
          </div>
        </div>
        <div class="rh-line-group">
          <span class="rh-line-label rh-line-h">横线 · 小组线</span>
          <div class="rh-cards-row">
            ${roleCard(ROLE_DATA.leader, 'style="min-width:140px"')}
          </div>
        </div>
      </div>
      <div class="rh-connector">┃</div>

      <!-- 底层：平级角色 -->
      <div class="rh-bottom">
        ${roleCard(ROLE_DATA.member, 'style="min-width:130px"')}
        ${roleCard(ROLE_DATA.organizer, 'style="min-width:120px"')}
        ${roleCard(ROLE_DATA.deep, 'style="min-width:120px"')}
      </div>
    </div>
  `;
}
