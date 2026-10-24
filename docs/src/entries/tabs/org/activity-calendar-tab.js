// role: [工程师]+[AI]
// entries/tabs/org/activity-calendar-tab.js — 组织台「活动日历」页（共享只读日历 + 本台「活动进展」分段）
//
// 2026-10-20 第三轮 IA 判例④：原「专班管理」页里的「活动工作组」（全部活动查询 + 材料出口 + 确认完成）
//   与「活动日历」回答同一个问题，且让 D-442 锁定的页签名覆盖了不归它管的对象。
//   裁定保留页签名「专班管理」，把活动这一面迁回「活动日历」——本文件就是那次迁移的承载面：
//   · 上半部仍是六台共用的只读日历（单一源 `entries/tabs/shared/activity-calendar-tab.js`，不改）；
//   · 下半部是本台专属的「活动进展」分段（组件单一源 `components/governance/activity-progress.js`）。
//   ⚠ 不新造页签、不改注册序；`?tab=calendar` / 旧 `?tab=tf-view` 别名均不受影响。

import { getAppState, setState } from '../../../core/base/state.js?v=20261024c';
import { renderContent as renderSharedCalendar } from '../shared/activity-calendar-tab.js?v=20261024c';
import { renderActivityProgress } from '../../../components/governance/activity-progress.js?v=20261024c';
import { mockDB } from '../../../core/domain/domain.js?v=20261024c';
import { getAdapter } from '../../../data/data-adapter.js?v=20261024c';
import { loadPartyGroups } from '../../../services/member/party-group.js?v=20261024c';
import { getPersonName } from '../../../services/member/person.js?v=20261024c';
import { AuthStore } from '../../../services/core/auth.js?v=20261024c';
import { escHtml as esc, showToast } from '../../../core/base/utils.js?v=20261024c';
// R10-B16：组织落点与招募范围单一源（禁止把 cross-group 当落点）
import { ACTIVITY_SCOPES, RECRUITMENT_SCOPES } from '../../../core/domain/constants.js?v=20261024c';

// ── 跨组招募协调 / 待补责任党小组（2026-10-21 批次 499 · 组织委员协调面）──────
// 口径：跨组只是参与/招募范围，活动仍有唯一责任党小组；跨党小组深度参与者由组织委员协调。
// 协调动作只留「已协调」状态，不授予活动写权（服务端 POST /workgroups/:id/coordinate 同口径）。
function _workgroupOfActivity(activity) {
  return (mockDB.workgroups || []).find((w) => w.kind === 'activity'
    && (w.id === activity.workgroupId || w.sourceId === activity.id)) || null;
}

function _crossMembersOf(workgroupId) {
  return (mockDB.workgroupMembers || []).filter((row) => row.workgroupId === workgroupId
    && row.status !== 'removed' && row.crossGroup);
}

function _fmtDate(iso) {
  return iso ? String(iso).slice(0, 10) : '';
}

function _renderOrgRecruitmentPanel(host, activities) {
  const active = activities.filter((a) => !['cancelled', 'archived'].includes(a.status) && a.archived !== true);
  const recruitRows = [];
  const legacyRows = [];
  for (const activity of active) {
    if (activity.legacyHostGroup && activity.organizingScope !== ACTIVITY_SCOPES.BRANCH) {
      legacyRows.push(activity);
    }
    const workgroup = _workgroupOfActivity(activity);
    if (!workgroup || workgroup.recruitmentScope !== RECRUITMENT_SCOPES.CROSS_GROUP || !workgroup.crossGroupCoordinatorId) continue;
    const crossMembers = _crossMembersOf(workgroup.id);
    recruitRows.push({ activity, workgroup, crossMembers });
  }

  const groups = loadPartyGroups().filter((g) => g.status === 'active');
  const recruitHtml = recruitRows.length ? recruitRows.map(({ activity, workgroup, crossMembers }) => {
    const coordinated = !!workgroup.crossGroupCoordinatedAt;
    const status = coordinated
      ? `已协调 · ${esc(getPersonName(workgroup.crossGroupCoordinatedBy) || workgroup.crossGroupCoordinatedBy || '—')} · ${esc(_fmtDate(workgroup.crossGroupCoordinatedAt))}`
      : (crossMembers.length ? '待协调' : '待招募（尚无可协调的跨组深参）');
    return `
      <div class="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-white border border-gray-100">
        <div class="flex-1 min-w-[220px]">
          <div class="text-sm font-medium text-gray-800">${esc(activity.title || '未命名')}</div>
          <div class="text-xs text-gray-500 mt-0.5">承办党小组：${esc(activity.hostGroup || '—')} · 跨组深参 ${crossMembers.length} 人 · ${status}</div>
          ${crossMembers.length ? `<div class="text-xs text-gray-500 mt-1">${crossMembers.map((m) => esc(getPersonName(m.personId) || m.personId)).join('、')}</div>` : ''}
        </div>
        <div class="flex items-center gap-2">
          ${coordinated
            ? `<button type="button" class="btn-outline text-xs px-3 py-1.5 org-coordinate-reset" data-wg-id="${esc(workgroup.id)}">撤销协调</button>`
            : `<button type="button" class="btn-accent-soft text-xs px-3 py-1.5 org-coordinate-complete${crossMembers.length ? '' : ' opacity-50 cursor-not-allowed'}" data-wg-id="${esc(workgroup.id)}" ${crossMembers.length ? '' : 'disabled'}>标记协调完成</button>`}
        </div>
      </div>`;
  }).join('') : '<p class="text-xs text-gray-500">— 暂无跨组招募待协调；标记为「跨组招募」的活动会出现在这里。</p>';

  const legacyHtml = legacyRows.length ? legacyRows.map((activity) => `
      <div class="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-white border border-amber-200">
        <div class="flex-1 min-w-[220px]">
          <div class="text-sm font-medium text-gray-800">${esc(activity.title || '未命名')}</div>
          <div class="text-xs text-gray-500 mt-0.5">${esc(activity.date || '')}${activity.type ? ' · ' + esc(activity.type) : ''} · 历史记录未落承办党小组</div>
        </div>
        <div class="flex items-center gap-2">
          <select class="input-flat text-xs org-legacy-group" data-act-id="${esc(activity.id)}" aria-label="补选责任党小组">
            <option value="">补选责任党小组…</option>
            ${groups.map((g) => `<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('')}
          </select>
          <button type="button" class="btn-accent-soft text-xs px-3 py-1.5 org-legacy-save" data-act-id="${esc(activity.id)}">补选</button>
        </div>
      </div>`).join('') : '<p class="text-xs text-gray-500">— 所有活动都已落到责任党小组。</p>';

  host.innerHTML = `
    <details class="card rounded-xl p-5 mb-4" id="org-recruitment-card">
      <summary class="cursor-pointer select-none flex flex-wrap items-baseline gap-x-2">
        <span class="font-title-cn text-base font-semibold text-gray-800">跨组招募待协调</span>
        <span class="text-xs text-gray-500 tabular-nums">${recruitRows.length} 项</span>
      </summary>
      <p class="text-xs text-gray-500 mt-3 mb-3">跨组只影响招募范围；活动始终落到承办党小组，跨党小组深度参与者由组织委员协调。此处只标记协调状态，不授予活动写权。</p>
      <div class="space-y-2">${recruitHtml}</div>
    </details>
    <details class="card rounded-xl p-5 mb-4" id="org-legacy-host-card"${legacyRows.length ? ' open' : ''}>
      <summary class="cursor-pointer select-none flex flex-wrap items-baseline gap-x-2">
        <span class="font-title-cn text-base font-semibold text-gray-800">待补承办党小组</span>
        <span class="text-xs text-gray-500 tabular-nums">${legacyRows.length} 项</span>
      </summary>
      <p class="text-xs text-gray-500 mt-3 mb-3">历史活动缺少承办党小组。系统不猜测归属，请按实际补选；补选后任务、考察与汇报可按党小组汇总。</p>
      <div class="space-y-2">${legacyHtml}</div>
    </details>
  `;

  host.querySelectorAll('.org-coordinate-complete, .org-coordinate-reset').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const action = btn.classList.contains('org-coordinate-reset') ? 'reset' : 'complete';
      btn.disabled = true;
      try {
        const result = await getAdapter().workgroups.coordinate(btn.dataset.wgId, { action });
        if (result?.workgroup) {
          mockDB.workgroups = mockDB.workgroups.map((row) => row.id === result.workgroup.id ? result.workgroup : row);
        }
        if (Array.isArray(result?.members)) {
          const ids = new Set(result.members.map((row) => row.id));
          mockDB.workgroupMembers = [
            ...mockDB.workgroupMembers.filter((row) => !ids.has(row.id)),
            ...result.members,
          ];
        }
        showToast('success', action === 'complete' ? '已标记跨组招募协调完成' : '已撤销协调标记');
        setState({});
      } catch (e) {
        btn.disabled = false;
        showToast('error', e?.message || '协调标记失败');
      }
    });
  });

  host.querySelectorAll('.org-legacy-save').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const activityId = btn.dataset.actId;
      const groupId = host.querySelector(`.org-legacy-group[data-act-id="${CSS.escape(activityId)}"]`)?.value || '';
      const group = groups.find((g) => g.id === groupId);
      if (!group) { showToast('error', '请选择责任党小组'); return; }
      btn.disabled = true;
      try {
        await getAdapter().activities.update(activityId, {
          hostGroupId: group.id, hostGroup: group.name, organizingScope: ACTIVITY_SCOPES.PARTY_GROUP,
        });
        mockDB.activities = mockDB.activities.map((row) => row.id === activityId
          ? { ...row, hostGroupId: group.id, hostGroup: group.name, organizingScope: ACTIVITY_SCOPES.PARTY_GROUP, legacyHostGroup: undefined }
          : row);
        showToast('success', `已补选承办党小组：${group.name}`);
        setState({});
      } catch (e) {
        btn.disabled = false;
        showToast('error', e?.message || '补选失败');
      }
    });
  });
}

/** API 形态下工作组不进快照：协调面所需的工作组/成员从语义接口补齐（mock 形态同样走一遍，口径一致） */
async function _hydrateWorkgroups() {
  try {
    const me = AuthStore.getCurrentUser() || {};
    const params = me.branchId ? { branchId: me.branchId } : {};
    const [groups, members] = await Promise.all([
      getAdapter().workgroups.list(params),
      getAdapter().workgroups.members.list(params),
    ]);
    if (Array.isArray(groups)) mockDB.workgroups = groups;
    if (Array.isArray(members)) mockDB.workgroupMembers = members;
  } catch (e) {
    console.warn('[org-recruitment] 工作组加载失败（协调面按已有数据展示）', e);
  }
}

export function renderContent(ctx = {}) {
  const container = document.getElementById('org-tab-content');
  if (!container) return;

  // 共享只读日历：六台同款「左日历 / 右详情」
  renderSharedCalendar(container);

  let recruitHost = container.querySelector('#org-recruitment');
  if (!recruitHost) {
    recruitHost = document.createElement('div');
    recruitHost.id = 'org-recruitment';
    recruitHost.className = 'mt-4';
    container.appendChild(recruitHost);
  }

  let host = container.querySelector('#org-activity-progress');
  if (!host) {
    host = document.createElement('div');
    host.id = 'org-activity-progress';
    host.className = 'mt-4';
    container.appendChild(host);
  }

  const activities = (getAppState() || {}).activities || [];
  _renderOrgRecruitmentPanel(recruitHost, activities);
  // 工作组成员关系不在整库快照里：异步补齐后就地重绘本块（不 setState，避免整页循环渲染）
  _hydrateWorkgroups().then(() => {
    if (recruitHost.isConnected) _renderOrgRecruitmentPanel(recruitHost, activities);
  });

  renderActivityProgress(host, {
    activities,
    accent: ctx.accent,
    // 标记完成后与旧行为一致：整块重渲染（日历与列表同源刷新）
    onChange: () => setState({}),
  });
}
