// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  person-entry.js — 成员档案独立查阅页入口（2026-09-13 支书裁定）
//  定案：① 只读查阅走**独立 HTML 页**；② 可操作走模态弹窗编辑。
//  路由：?id=<personId> → 该人授权投影（本人自我描述 + 组织维护字段）
//        无 id           → 自己（无 ?id= 即本人）
//        未登录          → 卡内提示登录
//        档案 id 查无    → 「成员不存在或已移出」
//  纪律：人名与字段一律现取 PersonStore / getPersonName；**不得**使用任何记录内姓名快照，
//        也不得在模块顶层做人员快照（跨表一致性守卫 S1/S2）。
//  2026-10-18 乱专项：按「L0 结论带 → 组织事实 → 在册与留痕 → 本人自述 → 系统说明」重排；
//        27 个档案字段各有且仅有一个 data-field 落点；同一事实不跨层重复。
// ════════════════════════════════════════════════════════════════
import { renderSidebar } from '../../components/shell/sidebar.js?v=20261028d';
import { renderHeader } from '../../components/shell/header.js?v=20261028d';
import { BranchService } from '../../services/core/runtime.js?v=20261028d';
import { AuthStore } from '../../services/core/auth.js?v=20261028d';
import { PersonStore, getPersonName, renameMemberAccount, deriveDevelopStageSince } from '../../services/member/person.js?v=20261028d';
import { getDataSource, migrateLegacyPersonId } from '../../data/data-adapter.js?v=20261028d';
import { loadMemberProfile } from '../../services/member/profile.js?v=20261028d';
import { getBranchById } from '../../services/branch/branch.js?v=20261028d';
import { openPersonEditModal } from '../../components/governance/pickers.js?v=20261028d';
import {
  renderSelfDescriptionSection, countSelfProfileFilled, SELF_PROFILE_TOTAL,
  renderThoughtReportsSection,
} from '../../components/governance/person-profile-sections.js?v=20261028d';
// 思想汇报按人归集（既有服务读口；制度承诺「提交即入库、算法归集至个人档案」的落地）
import {
  listThoughtReportsByPerson, canReadThoughtReport,
} from '../../services/governance/thought-report.js?v=20261028d';
// 待确认请求读口（单一源：服务层现有读口；api 形态由 init() 从服务端填充同一缓存）
import {
  listPendingConfirmations, MC_ACTION_LABEL,
} from '../../services/member/member-confirmation.js?v=20261028d';
// Q-21-3 收敛（2026-09-13）：在册状态枚举单一源 = core/domain/constants.js（原经 org-base-data-preview 转出）
import { ROLE_LABELS, RESIDENCE, EMPTY_TEXT, EMPTY_NOT_APPLICABLE } from '../../core/domain/constants.js?v=20261028d';
import { canMaintainMemberProfileFields } from '../../core/domain/profile-access.js?v=20261028d';
import { getBasePath, escHtml as esc, fmtDt } from '../../core/base/utils.js?v=20261028d';
import { badgeHtml } from '../../components/ui/badges.js?v=20261028d';
// 批次 87：本页必须先 hydrate API 数据源再渲染（成员档案读 + 编辑写）——与 activity.html 标准形同款。
// 此前本页只调 BranchService.loadDB()（API 模式直接 return）⇒ api 形态下档案读的是本地备份，
// 且「编辑档案」按 mock 数据源落本机、服务端 users 表不更新。
import { hydrateDataSource, notifyDataLoaded } from '../../data/data-adapter.js?v=20261028d';
import { ApiAdapter } from '../../data/api-adapter.js?v=20261028d';

import { emptyStateHtml } from '../../components/ui/empty-state.js?v=20261028d';
renderSidebar('dashboard');
renderHeader('dashboard');

/** 数据 hydrate（批次 87）：API 会话走 data-adapter init（服务端权威）；否则本地 loadDB。
 *  P0-2（2026-09-23）：判定收敛到 data/data-adapter.js::hydrateDataSource——有 token 时 init() 失败即
 *  **显式失败**（「无法连接服务器」错误态 + 重试），不再回退可写 mock（否则「编辑档案」落本机＝静默丢单）。 */
async function _hydrateData() {
  try {
    const r = await hydrateDataSource({ apiAdapter: ApiAdapter, loadMock: () => BranchService.loadDB() });
    return r.ok;
  } catch (e) {
    console.warn('[person-entry] 数据加载异常，不回退到缓存档案', e);
    return false;
  } finally {
    try { notifyDataLoaded(); } catch (_) { /* 静默 */ }
  }
}

const cardEl = document.getElementById('person-archive-card');
const backBtn = document.getElementById('person-back-btn');
backBtn?.addEventListener('click', () => {
  if (window.history.length > 1) window.history.back();
  else window.location.href = getBasePath() + 'index.html';
});

const params = new URLSearchParams(window.location.search);
const viewer = AuthStore.getCurrentUser();
const selectedBranchId = params.get('branchId') || '';
// 2026-10-02 批次 347（支书 `#5`「我们是否落地一个 profile 界面【自己看自己】……和既有的 person 界面
//   可以共用一些代码脚手架」）：**无 `?id=` ⇒ 自己**——复用本页同一套脚手架与只读档案版式；
//   带 `?id=` 仍是「查阅他人档案」（名册 / 各处链接照旧，行为一字未改）。
// 2026-10-24 批次 508：兼容 `?personId=`（旧别名，思想汇报页等既有深链用它）——与 `?id=` 等义；
//   两者同时出现时 `id` 优先（新协议为准，避免两个参数指向不同人时行为不定）。
let personId = params.get('id') || params.get('personId') || (viewer?.personId || '');
// 迁移期（2026-10-20）：旧链接 `?id=p13` 按映射换学号并一次性改写地址栏（不 404）
const legacyMappedId = personId ? migrateLegacyPersonId(personId) : personId;
if (legacyMappedId && legacyMappedId !== personId) {
  personId = legacyMappedId;
  params.set('id', personId);
  const next = new URL(window.location.href);
  next.searchParams.set('id', personId);
  window.history.replaceState(null, '', next);
}

/** 卡内状态提示（权限失败不会先显示缓存档案，再以遮罩隐藏）。 */
function renderMessage(html, role = 'status') {
  if (!cardEl) return;
  cardEl.setAttribute('aria-busy', 'false');
  cardEl.innerHTML = `<p role="${role}" aria-live="${role === 'alert' ? 'assertive' : 'polite'}" class="text-sm text-gray-600 text-center py-12">${html}</p>`;
}

/** 字段值：缺失/空白 → EMPTY_TEXT（全页一套空值词表，见 constants.js::EMPTY_TEXT） */
function textOrEmpty(value, empty = EMPTY_TEXT) {
  const text = String(value == null ? '' : value).trim();
  return text ? esc(text) : empty;
}

/** 党小组：空串＝未分组（业务态，保留）；字段缺失＝空值词表；组织级角色＝不适用 */
function partyGroupHtml(value, role) {
  if (role === 'party-staff') return EMPTY_NOT_APPLICABLE;
  if (value === undefined || value === null) return EMPTY_TEXT;
  const text = String(value).trim();
  return text ? esc(text) : '未分组';
}

/** 在册状态：字段缺失 → 在校（默认），注明默认，不静默伪装成已采集 */
function residenceText(member) {
  const value = String(member?.residenceStatus == null ? '' : member.residenceStatus).trim();
  if (!value) return '在校（默认）';
  return value;
}

/** 届别：四位数年份显示为「YYYY 届」；其余原值展示 */
function enrollYearHtml(value, role) {
  if (role === 'party-staff') return EMPTY_NOT_APPLICABLE;
  const text = String(value == null ? '' : value).trim();
  if (!text) return EMPTY_TEXT;
  return /^\d{4}$/.test(text) ? esc(`${text} 届`) : esc(text);
}

/** 阶段起始日：只读，显示为「YYYY-MM-DD 起」；缺失返回空串（该行不渲染，R7-03） */
function developStageSinceHtml(value, derived = false) {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value == null ? '' : value));
  if (!match) return '';
  return `${match[1]} 起${derived ? '<span class="ml-1 text-xs text-gray-500">（据成员变更记录）</span>' : ''}`;
}

/** 人名现取（不得使用记录内姓名快照） */
function personLabel(id, empty = '未记录') {
  if (!id) return empty;
  try { return getPersonName(id) || String(id); } catch (_) { return String(id); }
}

/** 渲染档案页（保存成功后重渲染本页） */
async function render() {
  if (!cardEl) return;
  renderMessage('正在加载档案…');
  cardEl.setAttribute('aria-busy', 'true');
  if (!viewer) {
    cardEl.setAttribute('aria-busy', 'false');
    cardEl.innerHTML = emptyStateHtml({ variant: 'panel', text: '请先登录后使用', actionHtml: `<a class="btn-outline" href="${getBasePath()}login.html">去登录</a>` });
    return;
  }
  if (!personId) {
    renderMessage(`未指定成员 · <a class="text-accent" href="${getBasePath()}workspace/org.html">去成员名册</a>`);
    return;
  }
  if (viewer.role === 'party-staff' && !selectedBranchId) {
    renderMessage('党委查看个人档案前，必须先从支部只读视图选择一个支部。', 'alert');
    return;
  }
  let member;
  try {
    member = await loadMemberProfile({
      personId,
      actor: { id: viewer.personId, role: viewer.role, branchId: viewer.branchId },
      selectedBranchId,
      dataSource: getDataSource(),
      apiGet: (id) => ApiAdapter.members.getProfile(id),
      mockGet: (id) => PersonStore.getById(id),
    });
  } catch (error) {
    if (error?.status === 403) {
      renderMessage('无权限查看此成员档案。档案仅本人或本支部支委可查看。', 'alert');
    } else if (error?.status === 404) {
      renderMessage('成员不存在或已移出', 'alert');
    } else {
      console.warn('[person-entry] 档案读取失败', error);
      renderMessage('档案暂时无法加载，请检查连接后重试。', 'alert');
    }
    return;
  }
  if (!member) {
    renderMessage('成员不存在或已移出');
    return;
  }

  const branch = getBranchById(member.branchId);
  const branchLabel = branch?.name || member.branchId || '支部未归属';
  const isDetained = member.residenceStatus === RESIDENCE.DETAINED;
  const hasResidenceNote = String(member.residenceNote == null ? '' : member.residenceNote).trim() !== '';
  // R7-03：阶段起始日缺失 ⇒ 不渲染该行；有「进入当前阶段」的通过留痕 ⇒ 用其日期派生（只读，注明来源）
  const derivedStageSince = member.developStageSince ? '' : deriveDevelopStageSince(member.id, member.developStage);
  const stageSinceHtml = developStageSinceHtml(member.developStageSince || derivedStageSince, !member.developStageSince && !!derivedStageSince);
  const history = Array.isArray(member.residenceHistory) ? member.residenceHistory.slice() : [];
  // 留痕固定新→旧（页面可见标注「按时间倒序」）
  history.sort((a, b) => String(b?.updatedAt || '').localeCompare(String(a?.updatedAt || '')));
  const latest = history[0] || null;

  const canEdit = canMaintainMemberProfileFields({
    id: viewer.personId, role: viewer.role, branchId: viewer.branchId,
  }, member);
  const isPartyStaff = viewer.role === 'party-staff';
  const isSelf = !!personId && String(viewer?.personId || '') === String(personId);
  const readOnlyReason = isPartyStaff
    ? '党委只读查看'
    : isSelf
      ? '组织字段由本支部组织委员维护'
      : '你当前只读，仅组织委员可改';

  // 待支书确认（现有服务读口；取不到则显示「暂无待确认」，不伪造）
  let pending = [];
  try {
    pending = listPendingConfirmations().filter((request) => request && String(request.personId) === String(member.id));
  } catch (error) {
    console.warn('[person-entry] 待确认请求读取失败', error);
    pending = [];
  }
  const pendingCountText = pending.length ? `待支书确认 ${pending.length} 项` : '暂无待确认';
  const pendingLineHtml = pending.map((request) => {
    const label = MC_ACTION_LABEL[request.action] || '状态变更';
    return `<span class="block text-xs text-amber-700">${esc(label)}：${esc(request.from || '—')} → ${esc(request.to || '—')}</span>`;
  }).join('');

  const filledSelf = countSelfProfileFilled(member.selfProfile);
  const selfGap = SELF_PROFILE_TOTAL - filledSelf;
  const selfGapText = selfGap > 0 ? `自述缺 ${selfGap} 项` : '自述已填全';

  const residenceLabel = residenceText(member);
  const residenceVariant = !member.residenceStatus ? 'neutral' : isDetained ? 'warning' : 'success';
  const stageLabel = member.developStage || (member.role === 'party-staff' ? EMPTY_NOT_APPLICABLE : EMPTY_TEXT);
  const roleLabel = ROLE_LABELS[member.role] || member.role || '无治理角色';
  const recentConclusion = latest
    ? `最近变更：${esc(fmtDt(latest.updatedAt) || '时间未记录')} ${esc(latest.from || '—')} → ${esc(latest.to || '—')}${latest.updatedBy ? `（记录：${esc(personLabel(latest.updatedBy))}）` : ''}`
    : '暂无在册变更';

  const historyItems = history.length === 0
    ? `<li>${emptyStateHtml({ text: '暂无在册变更', variant: 'inline' })}</li>`
    : history.map((record) => `<li class="text-sm">
        <p class="text-xs text-gray-500">时间：<time datetime="${esc(record.updatedAt || '')}">${esc(fmtDt(record.updatedAt) || '时间未记录')}</time></p>
        <p class="mt-0.5 text-gray-800"><span class="text-gray-500">变更前</span> ${esc(record.from || '—')} <span class="text-gray-600" aria-hidden="true">→</span> <span class="text-gray-500">变更后</span> ${esc(record.to || '—')}</p>
        <p class="mt-0.5 text-xs text-gray-500">记录人：${esc(personLabel(record.updatedBy))}</p>
        ${record.note ? `<p class="mt-0.5 text-xs text-gray-600 break-words whitespace-pre-wrap">备注：${esc(record.note)}</p>` : ''}
      </li>`).join('');

  const selfReadOnlyReason = isPartyStaff
    ? '党委只读查看'
    : isSelf
      ? ''
      : '仅本人或本支部组织委员可填写';

  // 思想汇报：只取当前查阅人有权读的记录（服务层 canReadThoughtReport 同一判据；
  // 读不到就显示 0 篇，不把权限问题伪装成「没交」）。
  let thoughtReports = [];
  try {
    thoughtReports = listThoughtReportsByPerson(member.id)
      .filter((rec) => canReadThoughtReport(rec, { personId: viewer.personId, role: viewer.role }));
  } catch (error) {
    console.warn('[person-entry] 思想汇报读取失败', error);
    thoughtReports = [];
  }

  cardEl.innerHTML = `
    <!-- L0 结论带：这是谁 / 哪个组织什么身份 / 在册是否正常 / 有无待确认或缺口 -->
    <section id="person-summary" aria-labelledby="person-summary-heading" class="mb-6 border-b border-gray-100 pb-5">
      ${isPartyStaff ? `<p class="mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800" role="note">党委只读查看 · ${esc(branchLabel)} · 档案信息不可编辑</p>` : ''}
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <h1 id="person-summary-heading" data-field="name" class="text-xl font-semibold text-gray-900">${textOrEmpty(member.name)}</h1>
          <p class="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-gray-700">
            <span data-field="branchId">${esc(branchLabel)}</span>
            <span class="text-gray-300" aria-hidden="true">·</span>
            <span data-field="developStage">${badgeHtml(esc(stageLabel), 'info')}</span>
            ${canEdit ? '<button type="button" id="person-stage-btn" class="btn-outline text-xs px-3 py-1 rounded-lg">变更发展阶段（报支书确认）</button>' : ''}
            <span class="text-gray-300" aria-hidden="true">·</span>
            <span data-field="role">${esc(roleLabel)}</span>
          </p>
          <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
            <span data-field="residenceStatus">${badgeHtml(esc(residenceLabel), residenceVariant)}</span>
            ${isDetained ? `<span class="text-gray-500">${hasResidenceNote ? '有备注' : '无备注'}</span>` : ''}
            <span class="text-gray-500">${pendingCountText}</span>
            <span class="text-gray-500">${selfGapText}</span>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-1.5">
          ${isSelf ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700">本人</span>' : ''}
          ${isPartyStaff ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">党委只读</span>' : ''}
          ${isPartyStaff ? '<button type="button" id="person-rename-btn" class="btn-outline">重命名账号</button>' : ''}
        </div>
      </div>
    </section>

    <!-- 分区一：组织事实（一行小标签 + 两列 key-value；2026-10-20 支书裁定去掉独立标题与解释段） -->
    <section aria-labelledby="person-org-facts-heading" class="mb-6 border-b border-gray-100 pb-6">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p id="person-org-facts-heading" class="text-xs font-medium tracking-wide text-gray-500">组织事实</p>
        ${canEdit
          ? '<button type="button" id="person-org-facts-btn" class="btn-accent-soft text-sm px-4 py-2 rounded-lg">编辑组织事实</button>'
          : `<p class="text-xs text-gray-500">${esc(readOnlyReason)}</p>`}
      </div>
      <dl class="mt-2 grid grid-cols-2 gap-x-6 border-y border-gray-100">
        <div class="flex gap-3 border-b border-gray-100 py-2">
          <dt class="w-20 flex-shrink-0 text-xs text-gray-500">学号</dt>
          <dd class="min-w-0 flex-1">
            <span data-field="studentId" class="text-sm text-gray-800 break-words">${textOrEmpty(member.studentId)}</span>
            <span class="ml-1 text-xs text-gray-500">（登录账号）</span>
          </dd>
        </div>
        <div class="flex gap-3 border-b border-gray-100 py-2">
          <dt class="w-20 flex-shrink-0 text-xs text-gray-500">届别</dt>
          <dd class="min-w-0 flex-1">
            <span data-field="enrollYear" class="text-sm text-gray-800 break-words">${enrollYearHtml(member.enrollYear, member.role)}</span>
          </dd>
        </div>
        <div class="flex gap-3 py-2">
          <dt class="w-20 flex-shrink-0 text-xs text-gray-500">党小组</dt>
          <dd class="min-w-0 flex-1">
            <span data-field="partyGroup" class="text-sm text-gray-800 break-words">${partyGroupHtml(member.partyGroup, member.role)}</span>
          </dd>
        </div>
        ${stageSinceHtml ? `<div class="flex gap-3 py-2">
          <dt class="w-20 flex-shrink-0 text-xs text-gray-500">阶段起始日</dt>
          <dd class="min-w-0 flex-1">
            <span data-field="developStageSince" class="text-sm text-gray-800 break-words">${stageSinceHtml}</span>
          </dd>
        </div>` : ''}
      </dl>
    </section>

    <!-- 分区二：在册与留痕（合并；默认折叠；residenceStatus 只在 L0） -->
    <section aria-labelledby="person-residence-heading" class="mb-6 border-b border-gray-100 pb-6">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <details id="person-residence-details" class="min-w-0 flex-1">
          <summary class="flex cursor-pointer flex-wrap items-baseline gap-x-2 gap-y-1 py-1">
            <span id="person-residence-heading" class="text-base font-semibold text-gray-700">在册与留痕</span>
            <span class="text-xs text-gray-600">${recentConclusion}</span>
            ${pendingLineHtml}
          </summary>
          <div class="mt-2 border-t border-gray-100 pt-2">
            ${hasResidenceNote ? `<div class="flex gap-3 py-1.5">
              <span class="w-20 flex-shrink-0 text-xs text-gray-500">当前备注</span>
              <p data-field="residenceNote" class="min-w-0 flex-1 text-sm text-gray-800 break-words whitespace-pre-wrap">${esc(String(member.residenceNote).trim())}</p>
            </div>` : ''}
            <div class="mt-3">
              <p class="text-xs text-gray-500">变更留痕 · 按时间倒序</p>
              <ol data-field="residenceHistory" class="mt-1.5 space-y-3 border-l border-gray-200 pl-4">
                ${historyItems}
              </ol>
            </div>
          </div>
        </details>
        ${canEdit
          ? '<button type="button" id="person-residence-btn" class="btn-accent-soft text-sm px-4 py-2 rounded-lg">变更在册状态</button>'
          : `<p class="text-xs text-gray-500">${esc(readOnlyReason)}</p>`}
      </div>
    </section>

    ${renderThoughtReportsSection({
      reports: thoughtReports,
      total: thoughtReports.length,
      viewAllHref: `thought-report.html?personId=${encodeURIComponent(member.id)}`,
    })}

    ${renderSelfDescriptionSection(member.selfProfile, {
      isSelf,
      canDictate: canEdit && !isSelf,
      readOnlyReason: selfReadOnlyReason,
    })}

    <!-- L2 系统说明：档案编号即学号（2026-10-20 支书裁定；页面不再渲染 p* 内部 id） -->
    <details id="person-system-info" class="pt-1">
      <summary class="cursor-pointer text-xs font-medium text-gray-500">档案编号</summary>
      <div class="mt-2 space-y-1 text-xs text-gray-500">
        <p>
          <span class="text-xs uppercase tracking-wide text-gray-500">档案编号</span>
          <span data-field="id" class="ml-2 font-mono text-gray-700 break-all">${textOrEmpty(member.studentId, EMPTY_TEXT)}</span>
        </p>
      </div>
    </details>
  `;
  cardEl.setAttribute('aria-busy', 'false');

  const editOpts = {
    personId: member.id,
    onSaved: () => render(),
  };
  cardEl.querySelector('#person-stage-btn')?.addEventListener('click', () => {
    openPersonEditModal({
      ...editOpts,
      focusFields: ['developStage'],
      sourceLabel: '个人档案 · 变更发展阶段',
    });
  });
  cardEl.querySelector('#person-org-facts-btn')?.addEventListener('click', () => {
    openPersonEditModal({
      ...editOpts,
      // 学号已改为账号主键只读（R7-01），本入口负责届别 / 党小组
      focusFields: ['enrollYear', 'partyGroup'],
      sourceLabel: '个人档案 · 组织事实',
    });
  });
  cardEl.querySelector('#person-residence-btn')?.addEventListener('click', () => {
    openPersonEditModal({
      ...editOpts,
      focusFields: ['residenceStatus', 'residenceNote', 'residenceHistory'],
      sourceLabel: '个人档案 · 在册与留痕',
    });
  });
  // R7-01：党委组织员「重命名账号」受控入口（学号即人员主键，改号必须走语义端点）
  cardEl.querySelector('#person-rename-btn')?.addEventListener('click', async () => {
    const nextId = window.prompt(
      `将「${member.name || member.id}」的登录学号由 ${member.studentId || member.id} 改为：`,
      '',
    );
    if (nextId === null) return;
    const targetId = String(nextId).trim();
    if (!targetId) { window.alert('新学号不能为空'); return; }
    const r = await renameMemberAccount(member.id, targetId, { by: viewer.personId });
    if (!r.ok) { window.alert(r.reason || '重命名失败'); return; }
    // 就地刷新：地址栏同步新 id
    personId = r.to;
    params.set('id', r.to);
    const next = new URL(window.location.href);
    next.searchParams.set('id', r.to);
    window.history.replaceState(null, '', next);
    await render();
  });
  // 本人「填写/编辑我的自述」用 selfOnly；组织委员「代录自述」走同一模态（不复制表单）。
  const selfBtn = cardEl.querySelector('#person-self-profile-btn');
  selfBtn?.addEventListener('click', () => {
    const mode = selfBtn.getAttribute('data-mode');
    openPersonEditModal({
      ...editOpts,
      selfOnly: mode === 'self',
      focusFields: ['selfProfile'],
      sourceLabel: mode === 'self' ? '我的档案（本人自填）' : '个人档案 · 代录自述',
    });
  });
}

// 渲染前必须先 hydrate（数据源初始化 + Store init）：否则 api 形态下按本地备份渲染。
(async () => {
  const ready = await _hydrateData();
  if (!ready) {
    renderMessage('档案数据暂时无法加载，请检查连接后重试。', 'alert');
    return;
  }
  render();
})();
