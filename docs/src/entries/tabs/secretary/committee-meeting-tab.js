// role: [工程师]+[AI]
// entries/tabs/secretary/committee-meeting-tab.js — 支书工作台「支委会」tab（2026-10-18 密度重组）
//
// 职责：只呈现三块——支委构成表、支委会会议表、新建线上支委会入口。
//   讲解性长文不进本 tab：制度口径走 help.html 定点（#card-copy-pcm-scope），界面只留一行。
// 单一源关系：
//   · 支委身份读写 = services/branch/appointment.js（listBranchCommissioners / appointBranchCommissioner /
//     revokeBranchCommissioner）；可授予身份白名单 = core/domain/constants.js::BRANCH_COMMISSIONER_ASSIGNABLE_ROLES；
//     支书 / 副支书身份归党委配置，本 tab 只读。
//   · 会议实体 = mockDB.activities（type==='支委会' 或 scenarioId==='branch-committee'）；
//     会议状态 = `data/mock/derive.js::deriveMeetingStatus`（全站唯一判据，本页不得再写本地状态机）。
//     应到 = `attendanceRosters` 冻结名单优先，无冻结时回落 `services/activity/vote-config.js::resolveVoterIds('committee')`
//     并标注「实时」；两种口径不混算。
//   · 表格 = components/ui/data-table.js（.data-table 单一源）；行内选人 = components/governance/pickers.js::PersonPicker。
import { mockDB } from '../../../core/domain/domain.js?v=20261120a';
import { AuthStore } from '../../../services/core/auth.js?v=20261120a';
import { PersonStore, getPersonById } from '../../../services/member/person.js?v=20261120a';
import {
  listBranchCommissioners,
  appointBranchCommissioner,
  revokeBranchCommissioner,
} from '../../../services/branch/appointment.js?v=20261120a';
import { confirmDanger, openModal, closeModal } from '../../../components/ui/modal.js?v=20261120a';
import { DEFAULT_BRANCH_ID, ROLE_LABELS, BRANCH_COMMISSIONER_ASSIGNABLE_ROLES } from '../../../core/domain/constants.js?v=20261120a';
import { resolveVoterIds } from '../../../services/activity/vote-config.js?v=20261120a';
import { deriveMeetingStatus } from '../../../data/mock/derive.js?v=20261120a';
import { renderDataTable, tableHeadHtml } from '../../../components/ui/data-table.js?v=20261120a';
import { badgeHtml } from '../../../components/ui/badges.js?v=20261120a';
import { renderTabHeader } from '../../../components/shell/page-frame.js?v=20261120a';
import { PersonPicker } from '../../../components/governance/pickers.js?v=20261120a';
import { getAppliedAccentColors } from '../../../core/boot/theme.js?v=20261120a';
import { showToast, escHtml as esc } from '../../../core/base/utils.js?v=20261120a';
// 待议池（2026-11-10 批次 540 波次 2）：类型 / 文案 / 去重键 / 应到范围由服务端算（API 形态），
// 分类函数与 mock 形态本地归集共用 `core/domain/agenda-classify.js`（同一判据、同一文案）。
import { getAdapter, getDataSource } from '../../../data/data-adapter.js?v=20261120a';
import { emptyStateHtml } from '../../../components/ui/empty-state.js?v=20261120a';
import { buildAgendaPool } from './agenda-form.js?v=20261120a';
import { AGENDA_TYPES, AGENDA_TYPE_BADGE_VARIANT } from '../../../core/domain/agenda-classify.js?v=20261120a';
import { CommitteeProposalStore } from '../../../services/governance/committee-proposal.js?v=20261120a';
import {
  PROPOSAL_STATUS_LABELS, PROPOSAL_TYPE_LABELS, PROPOSAL_SOURCE_LABELS,
} from '../../../core/domain/committee-proposal.js?v=20261120a';
import { selectInput, textareaField } from '../../../components/ui/forms.js?v=20261120a';

import { renderCardHeader } from '../../../components/shell/page-frame.js?v=20261120a';
/** 本支部 id（登录人归属；缺省 br-b1，与全仓同口径） */
function branchId() {
  const me = getPersonById(AuthStore.getCurrentUser()?.personId);
  return (me && me.branchId) || DEFAULT_BRANCH_ID;
}

/** 支委构成五行：支书、副支书（党委配置，只读）＋ 组织委员、宣传委员、纪检委员（支部授予，可改派可撤销） */
function rosterRows() {
  const bid = branchId();
  const members = PersonStore.getMembers().filter((p) => (p.branchId || DEFAULT_BRANCH_ID) === bid);
  const granted = new Map(listBranchCommissioners(bid).map((r) => [r.role, r]));
  const branch = (mockDB.branches || []).find((b) => b.id === bid) || null;
  const secretary = members.find((p) => p.id === branch?.secretaryId)
    || members.find((p) => p.role === 'secretary');
  const deputy = members.find((p) => p.role === 'deputy-secretary');
  const rows = [
    {
      role: 'secretary', label: ROLE_LABELS.secretary, source: '党委配置', editable: false,
      personId: secretary?.id || '', name: secretary?.name || '',
    },
    {
      role: 'deputy-secretary', label: ROLE_LABELS['deputy-secretary'], source: '党委配置', editable: false,
      personId: deputy?.id || '', name: deputy?.name || '',
    },
  ];
  for (const role of BRANCH_COMMISSIONER_ASSIGNABLE_ROLES) {
    const hit = granted.get(role);
    rows.push({
      role,
      label: ROLE_LABELS[role] || role,
      source: '支部授予',
      editable: true,
      personId: hit?.personId || '',
      name: hit?.name || '',
    });
  }
  return rows;
}

/** 状态徽章（视觉口径 = components/ui/badge.js；状态不写裸文字） */
function statusBadge(label, variant) {
  return badgeHtml(esc(label), variant);
}

/** 支委构成行：末列 1 主（改派 / 补选）+「更多（撤销）」，只在本行内展开选人面板，
 *  不再出现全局「选人 → 选身份 → 确认」表单。
 *  2026-11-10 批次 541：来源并入身份注（「支书 · 党委配置」），操作列不再复述「党委配置」——
 *  只在有写口（支部授予）的行出按钮，党委配置行留「—」。 */
function rosterRowHtml(r, showStatus) {
  const vacant = !r.name;
  const personCell = vacant ? '<span class="text-gray-500">空缺</span>' : esc(r.name);
  const statusCell = vacant ? statusBadge('空缺', 'warning') : statusBadge('在任', 'neutral');
  let action = '<span class="text-gray-500">—</span>';
  if (r.editable && !vacant) {
    // 1 主（改派）＋ 1 个「更多」；撤销进菜单（2026-10-19 Task 7）
    action = `<button type="button" class="btn-accent-soft btn-sm" data-cm-replace="${esc(r.role)}">改派</button>
      <details class="row-more">
        <summary class="btn-outline btn-sm">更多</summary>
        <div class="row-more__menu" role="menu">
          <button type="button" role="menuitem" class="btn-danger btn-sm" data-cm-revoke="${esc(r.role)}" data-person-id="${esc(r.personId)}">撤销</button>
        </div>
      </details>`;
  } else if (r.editable) {
    action = `<button type="button" class="btn-accent-soft btn-sm" data-cm-replace="${esc(r.role)}">补选</button>`;
  }
  return `<tr>
    <td${vacant ? ' class="section-accent-left"' : ''} data-label="姓名">${personCell}</td>
    <td data-label="身份">${esc(r.label)}<span class="ml-1 text-xs text-gray-500">${esc(r.source)}</span></td>
    <td${showStatus ? '' : ' class="is-redundant"'} data-label="状态">${statusCell}</td>
    <td data-label="操作" data-cm-cell="${esc(r.role)}"><div class="flex items-center gap-2">${action}</div></td>
  </tr>`;
}

/** 最近 8 场支委会（日期倒序） */
function meetingRows() {
  return (mockDB.activities || [])
    .filter((a) => a && (a.type === '支委会' || a.scenarioId === 'branch-committee'))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .slice(0, 8);
}

/** 会议状态 → 徽章档（统一派生五态；状态判据单一源 = data/mock/derive.js::deriveMeetingStatus） */
const MEETING_STATUS_VARIANT = {
  '待召开': 'info',
  '进行中': 'accent',
  '已召开': 'success',
  '已归档': 'neutral',
  '已取消': 'neutral',
};

/** 本场会议相关事实（考勤 / 复盘）——只供 deriveMeetingStatus 判「已召开」 */
function meetingFacts(activityId) {
  return {
    attendances: (mockDB.attendances || []).filter((row) => row && row.activityId === activityId),
    reviews: (mockDB.activityReviews || []).filter((row) => row && row.activityId === activityId),
  };
}

/** 应到名单：冻结名单（attendanceRosters）优先；无冻结时回落 resolveVoterIds 现算并标注「实时」。 */
function attendeeOf(act) {
  const roster = (mockDB.attendanceRosters || [])
    .find((row) => row && row.activityId === act.id && row.frozen === true);
  if (roster && Array.isArray(roster.personIds)) {
    return { count: roster.personIds.length, live: false };
  }
  return { count: resolveVoterIds('committee').length, live: true };
}

function meetingRowHtml(act) {
  const status = deriveMeetingStatus(act, meetingFacts(act.id));
  const attendee = attendeeOf(act);
  return `<tr>
    <td data-label="日期" class="whitespace-nowrap">${esc(act.date || '—')}</td>
    <td data-label="议题">${esc(act.title || '未命名会议')}</td>
    <td data-label="状态">${statusBadge(status, MEETING_STATUS_VARIANT[status] || 'neutral')}</td>
    <td class="is-numeric" data-label="应到">${attendee.count}${attendee.live ? '<span class="text-gray-500 text-xs"> 实时</span>' : ''}</td>
    <td data-label="操作"><a href="./party-committee-meeting.html?id=${encodeURIComponent(act.id)}" class="btn-outline btn-sm" style="text-decoration:none;">进入 ›</a></td>
  </tr>`;
}

/** 行内选人实例（每次只保留一个；切 tab / 重渲染前先销毁，避免浮层残留） */
let _rowPicker = null;
function destroyRowPicker() {
  if (_rowPicker) _rowPicker.destroy();
  _rowPicker = null;
}

/** 在委员表当前行打开单选面板；选中即调用服务层写口，成功后局部重渲染 */
function openRowPicker(role) {
  const cell = document.querySelector(`[data-cm-cell="${role}"]`);
  if (!cell) return;
  destroyRowPicker();
  cell.innerHTML = `<div class="flex items-center gap-2">
    <div id="cm-row-picker" class="w-56"></div>
    <button type="button" class="btn-outline btn-sm" data-cm-cancel>取消</button>
  </div>`;
  _rowPicker = new PersonPicker({
    mode: 'single',
    placeholder: `选择${ROLE_LABELS[role] || role}人选`,
    filter: (p) => (p.branchId || DEFAULT_BRANCH_ID) === branchId()
      && p.role !== 'secretary' && p.role !== 'deputy-secretary',
    accentColor: getAppliedAccentColors('secretary').accent,
    onSelect: async (ids) => {
      const personId = ids[0] || '';
      if (!personId) return;
      const res = await appointBranchCommissioner({ branchId: branchId(), personId, role });
      if (!res || !res.ok) {
        showToast('error', (res && res.reason) || '改派失败');
        return;
      }
      showToast('success', `已配置为${ROLE_LABELS[role] || role}`);
      destroyRowPicker();
      renderContent();
    },
  });
  _rowPicker.render(document.getElementById('cm-row-picker'));
  // 行内「改派」的下一步就是选人：渲染后直接展开面板，避免用户再点一次看似输入框的触发器。
  document.querySelector('#cm-row-picker .person-picker-trigger')?.click();
}

/** 撤销支委身份（回落普通参与者；服务层判据不变） */
async function revokeSeat(role, personId) {
  const label = ROLE_LABELS[role] || role;
  if (!await confirmDanger({ id: 'committee-seat-revoke', title: `撤销「${label}」身份`, bodyHtml: `<p class="text-sm text-gray-700">撤销该同志的「${esc(label)}」支委身份。<br>影响：该同志回落为普通参与者，对应工作台与待办入口对其关闭。<br>可恢复：可重新任命（每次变更记入任期留痕）。</p>`, confirmLabel: '撤销身份' })) return;
  const res = await revokeBranchCommissioner({ branchId: branchId(), personId, role });
  if (!res || !res.ok) {
    showToast('error', (res && res.reason) || '撤销失败');
    return;
  }
  showToast('success', `已撤销「${label}」身份`);
  renderContent();
}

/** 事件委托只绑一次：表格由检索引擎重绘后动作仍可点 */
function bindEvents(tc) {
  if (tc.dataset.cmBound === '1') return;
  tc.dataset.cmBound = '1';
  tc.addEventListener('click', async (e) => {
    // 行尾「更多」（原生 details）：点击其它区域 / 菜单项时收起（2026-10-19 Task 7）
    const clickedMore = e.target.closest('.row-more');
    tc.querySelectorAll('.row-more[open]').forEach(d => {
      if (d !== clickedMore || e.target.closest('.row-more__menu')) d.removeAttribute('open');
    });
    const cancel = e.target.closest('[data-cm-cancel]');
    if (cancel) {
      destroyRowPicker();
      renderContent();
      return;
    }
    const replace = e.target.closest('[data-cm-replace]');
    if (replace) {
      openRowPicker(replace.dataset.cmReplace);
      return;
    }
    const revoke = e.target.closest('[data-cm-revoke]');
    if (revoke) {
      await revokeSeat(revoke.dataset.cmRevoke, revoke.dataset.personId);
    }
  });
  // Esc 收起行尾「更多」菜单（原生 details 不自行关闭）
  tc.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    tc.querySelectorAll('.row-more[open]').forEach(d => d.removeAttribute('open'));
  });
}

// ════════════════════════════════════════════════════════════════
//  待议池（2026-11-10 批次 540 波次 2）
// ════════════════════════════════════════════════════════════════
// 口径契约 = `content/04_web_design/contracts/AGENDA_DERIVATION_CONTRACT.md`：
//   · 服务端算去重 / 时效 / 类型 / 应到（`GET /api/v1/committee/agenda-candidates`）；
//   · 本 tab 只做分组（决策 → 讨论 → 同步）、组内排序（待议天数长 → 短）与类型徽章；
//   · mock 形态（未连服务端）用同一分类函数本地归集，并如实标注「应到未计算」——不伪造服务端读数。

/** 归集序号：重渲染 / 切 tab 后旧请求的写回一律丢弃（避免旧数据盖新数据） */
let _poolSeq = 0;

/** 每组先呈现几条（其余在会议页提取；同屏文案密度见 `DS_06`） */
const AGENDA_POOL_PREVIEW = 5;

function agendaPoolRowHtml(p, showAttendee = true) {
  const badge = badgeHtml(esc(p.typeLabel || ''), AGENDA_TYPE_BADGE_VARIANT[p.type] || 'neutral',
    { title: esc(`${p.sourceLabel || ''}${p.expected ? ` · ${p.expected}` : ''}`) });
  const attendee = p.attendees && typeof p.attendees === 'object' ? p.attendees.count : null;
  // 来源名 / 说明只进徽章 title（同屏 20 行逐行复述来源即「同一句话说三遍」，`DESIGN_SYSTEM §4.18 C3`）
  const bits = [
    showAttendee && attendee !== null && attendee !== undefined ? `应到 ${attendee} 人` : '',
    p.ageDays !== null && p.ageDays !== undefined ? `待议 ${p.ageDays} 天` : '',
  ].filter(Boolean).join(' · ');
  return `<li class="flex items-start gap-2 py-1">
    <span class="flex-shrink-0">${badge}</span>
    <span class="flex-1 min-w-0">
      <span class="block text-body-sm text-gray-700">${esc(p.item)}</span>
      ${bits ? `<span class="block text-body-sm text-gray-500">${esc(bits)}</span>` : ''}
    </span>
  </li>`;
}

/** 池主体：按类型分组（空组不渲）；整池为空给一行空态，不报错 */
function agendaPoolHtml(pool, local) {
  if (!pool.length) {
    return emptyStateHtml({
      text: '暂无可上会事项：新事项出现后自动进池。',
      variant: 'inline',
    });
  }
  const blocks = AGENDA_TYPES
    .map((t) => ({
      ...t,
      list: pool.filter((p) => p.type === t.value).sort((a, b) => {
        const ageA = Number.isFinite(Number(a.ageDays)) ? Number(a.ageDays) : -1;
        const ageB = Number.isFinite(Number(b.ageDays)) ? Number(b.ageDays) : -1;
        return ageB - ageA || String(a.refId).localeCompare(String(b.refId));
      }),
    }))
    .filter((g) => g.list.length)
    .map((g) => {
      const shown = g.list.slice(0, AGENDA_POOL_PREVIEW);
      const rest = g.list.length - shown.length;
      // 同组应到一致 ⇒ 只在组头说一次（避免每行复述同一句）
      const counts = new Set(g.list.map((p) => (p.attendees && typeof p.attendees === 'object' ? p.attendees.count : null)));
      const uniform = counts.size === 1 ? [...counts][0] : null;
      return `<div class="mt-2 first:mt-0">
      <p class="text-body-sm text-gray-500">${esc(g.label)} · ${g.list.length}${uniform !== null ? `（应到 ${uniform} 人）` : ''}<span class="ml-1.5">${esc(g.hint)}</span></p>
      <ul class="mt-1 space-y-0.5">${shown.map((p) => agendaPoolRowHtml(p, uniform === null)).join('')}</ul>
      ${rest > 0 ? `<p class="text-body-sm text-gray-500 mt-1">另有 ${rest} 条，<a href="./party-committee-meeting.html" class="text-accent font-medium">去会议页提取</a>。</p>` : ''}
    </div>`;
    }).join('');
  return `${blocks}${local
    ? '<p class="text-body-sm text-gray-500 mt-2">本地预览（未连服务端）：类型与文案同一判据，应到名单未计算。</p>'
    : ''}`;
}

/** mock 形态本地归集：各来源取既有出口，归集与分类走同一纯函数（不新造判据） */
async function localAgendaPool() {
  const [{ TaskForceRecordStore }, { IssueStore }, { loadStageEntryDates }, { listDocs, isAgendaDraftDoc }, { listBrandProposals }] = await Promise.all([
    import('../../../services/activity/taskforce.js?v=20261120a'),
    import('../../../services/governance/issues.js?v=20261120a'),
    import('../../../services/member/member-confirmation.js?v=20261120a'),
    import('../../../services/branch/branch-doc.js?v=20261120a'),
    import('../../../services/activity/activity.js?v=20261120a'),
  ]);
  const src = { activities: mockDB.activities || [] };
  try { src.taskforceProposals = TaskForceRecordStore.listCommitteeRequests(); } catch (e) { /* 少一类不阻断 */ }
  try {
    await IssueStore.loadAll();
    src.issues = IssueStore.getAll().filter((i) => i.status === 'open' && !i.hidden && !i.mergedInto);
  } catch (e) { /* 少一类不阻断 */ }
  try { src.draftDocs = (await listDocs()).filter(isAgendaDraftDoc); } catch (e) { /* 少一类不阻断 */ }
  try { src.members = PersonStore.getMembers(); } catch (e) { /* 少一类不阻断 */ }
  try { src.stageEntries = loadStageEntryDates(); } catch (e) { /* 少一类不阻断 */ }
  try { src.brandProposals = listBrandProposals(); } catch (e) { /* 少一类不阻断 */ }
  return buildAgendaPool(src);
}

/** 填充待议池（API 形态读服务端汇总口；失败如实显示重试，不回退造数） */
async function hydrateAgendaPool() {
  const host = document.getElementById('cm-agenda-pool');
  if (!host) return;
  const seq = ++_poolSeq;
  try {
    const items = getDataSource() === 'api'
      ? await getAdapter().agendaCandidates.list()
      : await localAgendaPool();
    if (seq !== _poolSeq) return;
    host.innerHTML = agendaPoolHtml(Array.isArray(items) ? items : [], getDataSource() !== 'api');
  } catch (e) {
    console.warn('[committee-meeting-tab] 待议池加载失败：', e);
    if (seq !== _poolSeq) return;
    host.innerHTML = emptyStateHtml({
      text: '待议池加载失败',
      variant: 'inline',
      actionHtml: '<button type="button" class="btn-outline" data-cm-pool-retry>重新载入</button>',
    });
    host.querySelector('[data-cm-pool-retry]')?.addEventListener('click', () => hydrateAgendaPool());
  }
}

// ── 支部提案池（D-869）────────────────────────────────────────────
function proposalActionHtml(p) {
  const accentBtn = (act, label) =>
    `<button type="button" class="btn-accent-soft px-2 py-1" data-p-id="${esc(p.id)}" data-p-act="${act}">${label}</button>`;
  const outlineBtn = (act, label) =>
    `<button type="button" class="btn-outline px-2 py-1" data-p-id="${esc(p.id)}" data-p-act="${act}">${label}</button>`;
  if (p.status === 'pending') return `${accentBtn('accept', '受理')} ${outlineBtn('reject', '驳回')}`;
  if (p.status === 'queued') return `${accentBtn('schedule', '排期')} ${outlineBtn('reject', '驳回')}`;
  if (p.status === 'on-agenda') return accentBtn('decide', '记录决议');
  if (p.status === 'decided' || p.status === 'rejected') return outlineBtn('close', '归档');
  return '';
}

function proposalRowHtml(p) {
  return `<td data-label="事项"><span class="text-body-sm text-gray-800">${esc(p.title || '未命名')}</span></td>
    <td data-label="来源"><span class="text-body-sm text-gray-600">${esc(PROPOSAL_SOURCE_LABELS[p.sourceType] || p.sourceType)}</span></td>
    <td data-label="提案人"><span class="text-body-sm text-gray-600">${esc(p.proposedBy || '—')}</span></td>
    <td data-label="状态"><span class="text-body-sm text-gray-600">${esc(PROPOSAL_STATUS_LABELS[p.status] || p.status)} · ${esc(PROPOSAL_TYPE_LABELS[p.suggestedType] || p.suggestedType)}</span></td>
    <td data-label="操作"><div class="flex flex-wrap gap-1">${proposalActionHtml(p)}</div></td>`;
}

async function _proposalAction(id, payload) {
  try {
    const updated = await CommitteeProposalStore.update(id, payload);
    if (!updated) { showToast('error', '提案操作失败，请刷新后重试'); return; }
    showToast('success', '提案状态已更新');
    await hydrateProposalPool();
  } catch (e) {
    showToast('error', e?.message || '提案操作失败，请刷新后重试');
  }
}

function _openScheduleModal(p) {
  const meetings = meetingRows().filter((m) => m.type === '支委会');
  if (!meetings.length) { showToast('error', '暂无支委会会议，请先新建'); return; }
  openModal({
    id: 'cm-proposal-schedule',
    title: '排期到支委会',
    width: '480px',
    bodyHtml: `
      <p class="text-sm text-gray-700 mb-3">提案「${esc(p.title)}」</p>
      <label for="cm-proposal-meeting" class="text-[11px] text-gray-500 mb-2 block font-medium">选择会议</label>
      ${selectInput({
        id: 'cm-proposal-meeting',
        options: meetings.map((m) => ({ value: m.id, label: `${m.date || ''} ${m.title || '支委会'}` })),
        className: 'w-full',
      })}
      <div class="form-actions justify-end mt-4">
        <button type="button" class="btn-outline" id="cm-proposal-schedule-cancel">取消</button>
        <button type="button" class="btn-accent-soft" id="cm-proposal-schedule-save">排期</button>
      </div>`,
  });
  document.getElementById('cm-proposal-schedule-cancel')?.addEventListener('click', () => closeModal('cm-proposal-schedule'));
  document.getElementById('cm-proposal-schedule-save')?.addEventListener('click', async () => {
    const meetingActivityId = document.getElementById('cm-proposal-meeting')?.value || '';
    if (!meetingActivityId) { showToast('error', '请选择会议'); return; }
    closeModal('cm-proposal-schedule');
    await _proposalAction(p.id, { action: 'schedule', meetingActivityId });
  });
}

function _openDecideModal(p) {
  openModal({
    id: 'cm-proposal-decide',
    title: '记录提案决议',
    width: '480px',
    bodyHtml: `
      <p class="text-sm text-gray-700 mb-3">提案「${esc(p.title)}」</p>
      <label for="cm-proposal-result" class="text-[11px] text-gray-500 mb-2 block font-medium">决议结果</label>
      ${selectInput({
        id: 'cm-proposal-result',
        options: [{ value: 'passed', label: '通过' }, { value: 'rejected', label: '未通过' }],
        className: 'w-full',
      })}
      <div class="mt-3">
        ${textareaField({ id: 'cm-proposal-note', label: '说明', rows: 2 })}
      </div>
      <div class="form-actions justify-end mt-4">
        <button type="button" class="btn-outline" id="cm-proposal-decide-cancel">取消</button>
        <button type="button" class="btn-accent-soft" id="cm-proposal-decide-save">保存决议</button>
      </div>`,
  });
  document.getElementById('cm-proposal-decide-cancel')?.addEventListener('click', () => closeModal('cm-proposal-decide'));
  document.getElementById('cm-proposal-decide-save')?.addEventListener('click', async () => {
    const result = document.getElementById('cm-proposal-result')?.value || 'passed';
    const note = document.getElementById('cm-proposal-note')?.value?.trim() || '';
    closeModal('cm-proposal-decide');
    await _proposalAction(p.id, { action: 'decide', result, note });
  });
}

async function hydrateProposalPool() {
  const host = document.getElementById('cm-proposal-pool');
  if (!host) return;
  try {
    const me = AuthStore.getCurrentUser();
    const rows = await CommitteeProposalStore.list({ role: me?.role || '', personId: me?.personId || '' });
    const visible = rows.filter((p) => ['pending', 'queued', 'on-agenda', 'decided', 'rejected'].includes(p.status));
    if (!visible.length) {
      host.innerHTML = emptyStateHtml({ text: '暂无支部提案。', variant: 'inline' });
      return;
    }
    renderDataTable(host, {
      stateKey: 'cm-proposal-pool',
      rows: visible,
      rowHtml: proposalRowHtml,
      headHtml: tableHeadHtml([
        { label: '事项' }, { label: '来源' }, { label: '提案人' }, { label: '状态' }, { label: '操作' },
      ]),
      colSpan: 5,
      pageSize: 8,
      responsive: true,
      emptyMessage: '暂无支部提案',
    });
    host.querySelectorAll('[data-p-act]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = visible.find((row) => row.id === btn.dataset.pId);
        if (!p) return;
        const act = btn.dataset.pAct;
        if (act === 'schedule') return _openScheduleModal(p);
        if (act === 'decide') return _openDecideModal(p);
        return _proposalAction(p.id, { action: act, note: act === 'reject' ? '支委会驳回' : '' });
      });
    });
  } catch (e) {
    console.warn('[committee-meeting-tab] 提案池加载失败：', e);
    host.innerHTML = emptyStateHtml({
      text: '提案池加载失败',
      variant: 'inline',
      actionHtml: '<button type="button" class="btn-outline" data-cm-proposal-retry>重新载入</button>',
    });
    host.querySelector('[data-cm-proposal-retry]')?.addEventListener('click', () => hydrateProposalPool());
  }
}

export function renderContent() {
  const tc = document.getElementById('secretary-tab-content');
  if (!tc) throw new Error('[committee-meeting-tab] 缺少内容容器 #secretary-tab-content');
  destroyRowPicker();
  tc.dataset.currentTab = 'committee-meeting';
  tc.innerHTML = `
    <div class="stack-page">
      ${renderTabHeader({
        title: '支委会',
        description: '支委身份由支书配置；支书 / 副支书由党委配置。',
        actions: '<a href="./party-committee-meeting.html?action=new" class="btn-accent" style="text-decoration:none;">新建线上支委会 →</a>',
      })}
      <div class="card card--static rounded-xl card-standard stack-card">
        ${renderCardHeader({ title: `支委构成`, variant: 'panel' })}
        <div id="cm-roster-table" class="overflow-x-auto"></div>
      </div>
      <div class="card card--static rounded-xl card-standard stack-card">
        ${renderCardHeader({ title: `待议池`, variant: 'panel' })}
        <p class="text-body-sm text-gray-500 mt-1">该上支委会的事，按来源判定类型（决策 / 讨论 / 同步）。<a href="./party-committee-meeting.html" class="text-accent font-medium" title="到支委会会议页提取议程">去提取议程</a></p>
        <div id="cm-agenda-pool" class="mt-2"><p class="text-body-sm text-gray-500">正在归集…</p></div>
      </div>
      <div class="card card--static rounded-xl card-standard stack-card">
        ${renderCardHeader({ title: `支部提案`, variant: 'panel' })}
        <p class="text-body-sm text-gray-500 mt-1">组长的支部级事项在这里受理、排期与决议；回执自动发提案人。</p>
        <div id="cm-proposal-pool" class="mt-2"><p class="text-body-sm text-gray-500">正在加载…</p></div>
      </div>
      <div class="card card--static rounded-xl card-standard stack-card">
        ${renderCardHeader({ title: `支委会会议`, variant: 'panel' })}
        <div id="cm-meeting-table" class="overflow-x-auto"></div>
      </div>
      <p class="help-note">授予、改派与撤销的完整口径与权限边界，详见<a href="./help.html#card-copy-pcm-scope" class="help-note__link" title="见帮助：支委身份的授予、改派与撤销">帮助 · 支委身份</a>。</p>
    </div>`;
  bindEvents(tc);

  // 状态列去重（2026-10-19）：全部为「在任」时整列无信息量，隐藏；出现「空缺」才显示。
  const roster = rosterRows();
  const showStatus = roster.some((r) => !r.name);

  renderDataTable(tc.querySelector('#cm-roster-table'), {
    stateKey: 'secretary-committee-roster',
    rows: roster,
    rowHtml: (r) => rosterRowHtml(r, showStatus),
    headHtml: tableHeadHtml([
      { label: '姓名' }, { label: '身份' },
      { label: '状态', className: showStatus ? '' : 'is-redundant' },
      { label: '操作' },
    ]),
    colSpan: 4,
    pageSize: 0,
    responsive: true,
    emptyMessage: '暂无支委身份',
  });

  renderDataTable(tc.querySelector('#cm-meeting-table'), {
    stateKey: 'secretary-committee-meetings',
    rows: meetingRows(),
    rowHtml: meetingRowHtml,
    headHtml: tableHeadHtml([
      { label: '日期' }, { label: '议题' }, { label: '状态' },
      { label: '应到', className: 'is-numeric' },
      { label: '操作' },
    ]),
    colSpan: 5,
    pageSize: 8,
    responsive: true,
    emptyMessage: '暂无支委会会议',
  });

  // 待议池异步填充（API 形态读服务端汇总口；不阻塞表格渲染）
  hydrateAgendaPool();
  hydrateProposalPool();
}
