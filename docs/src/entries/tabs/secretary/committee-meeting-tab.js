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
//     应到人数 = services/activity/vote-config.js::resolveVoterIds('committee')（与本场应到名单同一口径）。
//   · 表格 = components/ui/data-table.js（.data-table 单一源）；行内选人 = components/governance/pickers.js::PersonPicker。
import { mockDB } from '../../../core/domain/domain.js?v=20261018h';
import { AuthStore } from '../../../services/core/auth.js?v=20261018h';
import { PersonStore, getPersonById } from '../../../services/member/person.js?v=20261018h';
import {
  listBranchCommissioners,
  appointBranchCommissioner,
  revokeBranchCommissioner,
} from '../../../services/branch/appointment.js?v=20261018h';
import { ROLE_LABELS, BRANCH_COMMISSIONER_ASSIGNABLE_ROLES } from '../../../core/domain/constants.js?v=20261018h';
import { resolveVoterIds } from '../../../services/activity/vote-config.js?v=20261018h';
import { renderDataTable, tableHeadHtml } from '../../../components/ui/data-table.js?v=20261018h';
import { PersonPicker } from '../../../components/governance/pickers.js?v=20261018h';
import { getAppliedAccentColors } from '../../../core/boot/theme.js?v=20261018h';
import { showToast, escHtml as esc } from '../../../core/base/utils.js?v=20261018h';

/** 本支部 id（登录人归属；缺省 br-b1，与全仓同口径） */
function branchId() {
  const me = getPersonById(AuthStore.getCurrentUser()?.personId);
  return (me && me.branchId) || 'br-b1';
}

/** 支委构成五行：支书、副支书（党委配置，只读）＋ 组织委员、宣传委员、纪检委员（支部授予，可改派可撤销） */
function rosterRows() {
  const bid = branchId();
  const members = PersonStore.getMembers().filter((p) => (p.branchId || 'br-b1') === bid);
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

/** 状态徽章（视觉口径 = styles.css::.state-badge；状态不写裸文字） */
function statusBadge(label, variant) {
  return `<span class="state-badge state-badge--${variant}">${esc(label)}</span>`;
}

/** 支委构成行：末列动作只在本行内展开选人面板，不再出现全局「选人 → 选身份 → 确认」表单 */
function rosterRowHtml(r) {
  const vacant = !r.name;
  const personCell = vacant ? '<span class="text-gray-400">空缺</span>' : esc(r.name);
  const statusCell = vacant ? statusBadge('空缺', 'warning') : statusBadge('在任', 'neutral');
  let action = '<span class="text-gray-400">党委配置</span>';
  if (r.editable && !vacant) {
    action = `<button type="button" class="btn-ghost text-accent" data-cm-replace="${esc(r.role)}">改派</button>
      <button type="button" class="btn-ghost text-red-600" data-cm-revoke="${esc(r.role)}" data-person-id="${esc(r.personId)}">撤销</button>`;
  } else if (r.editable) {
    action = `<button type="button" class="btn-ghost text-accent" data-cm-replace="${esc(r.role)}">补选</button>`;
  }
  return `<tr>
    <td${vacant ? ' class="section-accent-left"' : ''}>${personCell}</td>
    <td>${esc(r.label)}</td>
    <td>${esc(r.source)}</td>
    <td>${statusCell}</td>
    <td data-cm-cell="${esc(r.role)}"><div class="flex items-center gap-2">${action}</div></td>
  </tr>`;
}

/** 最近 8 场支委会（日期倒序） */
function meetingRows() {
  return (mockDB.activities || [])
    .filter((a) => a && (a.type === '支委会' || a.scenarioId === 'branch-committee'))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    .slice(0, 8);
}

/** 会议状态 → 徽章档（四选一：待召开 / 线上表态中 / 已截止 / 已留存） */
const MEETING_STATUS_VARIANT = {
  '待召开': 'info',
  '线上表态中': 'accent',
  '已截止': 'neutral',
  '已留存': 'success',
};

/** 会议状态四选一：待召开 / 线上表态中 / 已截止 / 已留存（判据只用既有字段） */
function meetingStatus(act) {
  if (act.votesLocked === true) {
    const items = (act.agenda || []).filter((x) => x && x.id);
    return items.length > 0 && items.every((x) => x.result) ? '已留存' : '已截止';
  }
  if (act.voteConfig && act.voteConfig.mode === 'async' && (act.agenda || []).some((x) => x && x.id)) {
    return '线上表态中';
  }
  return '待召开';
}

/** 应到人数（本场固化名单优先；未固化时回落支委名单同一口径） */
function attendeeCount(act) {
  const ids = Array.isArray(act.voteConfig?.voterIds) ? act.voteConfig.voterIds : [];
  return ids.length || resolveVoterIds('committee').length;
}

function meetingRowHtml(act) {
  const status = meetingStatus(act);
  return `<tr>
    <td class="whitespace-nowrap">${esc(act.date || '—')}</td>
    <td>${esc(act.title || '未命名会议')}</td>
    <td>${statusBadge(status, MEETING_STATUS_VARIANT[status] || 'neutral')}</td>
    <td>${attendeeCount(act)}</td>
    <td><a href="./party-committee-meeting.html?id=${encodeURIComponent(act.id)}" class="text-accent" style="text-decoration:none;">进入 ›</a></td>
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
    <button type="button" class="btn-ghost" data-cm-cancel>取消</button>
  </div>`;
  _rowPicker = new PersonPicker({
    mode: 'single',
    placeholder: `选择${ROLE_LABELS[role] || role}人选`,
    filter: (p) => (p.branchId || 'br-b1') === branchId()
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
  if (!window.confirm(`撤销「${label}」身份？该同志将回落为普通参与者。`)) return;
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
}

export function renderContent() {
  const tc = document.getElementById('secretary-tab-content');
  if (!tc) return;
  destroyRowPicker();
  tc.dataset.currentTab = 'committee-meeting';
  tc.innerHTML = `
    <div class="stack-page">
      <header class="flex items-start justify-between gap-3 flex-wrap">
        <div class="min-w-0">
          <h2 class="font-title-cn text-xl font-bold text-gray-800">支委会</h2>
          <p class="text-xs text-gray-500 mt-1">支委身份由支书配置；支书 / 副支书由党委配置。<a href="./help.html#card-copy-pcm-scope" class="text-gray-500 underline hover:text-gray-700">见帮助</a></p>
        </div>
        <a href="./party-committee-meeting.html?action=new" class="btn-accent" style="text-decoration:none;">新建线上支委会 →</a>
      </header>
      <section class="card rounded-xl card-standard stack-card">
        <h3 class="font-title-cn text-sm font-bold text-gray-700">支委构成</h3>
        <div id="cm-roster-table" class="overflow-x-auto"></div>
      </section>
      <section class="card card--static rounded-xl card-standard stack-card">
        <h3 class="font-title-cn text-sm font-bold text-gray-700">支委会会议</h3>
        <div id="cm-meeting-table" class="overflow-x-auto"></div>
      </section>
    </div>`;
  bindEvents(tc);

  renderDataTable(tc.querySelector('#cm-roster-table'), {
    stateKey: 'secretary-committee-roster',
    rows: rosterRows(),
    rowHtml: rosterRowHtml,
    headHtml: tableHeadHtml([
      { label: '姓名' }, { label: '身份' }, { label: '来源' }, { label: '状态' }, { label: '操作' },
    ]),
    colSpan: 5,
    pageSize: 0,
    emptyMessage: '暂无支委身份',
  });

  renderDataTable(tc.querySelector('#cm-meeting-table'), {
    stateKey: 'secretary-committee-meetings',
    rows: meetingRows(),
    rowHtml: meetingRowHtml,
    headHtml: tableHeadHtml([
      { label: '日期' }, { label: '议题' }, { label: '状态' }, { label: '应到' }, { label: '操作' },
    ]),
    colSpan: 5,
    pageSize: 8,
    emptyMessage: '暂无支委会会议',
  });
}
