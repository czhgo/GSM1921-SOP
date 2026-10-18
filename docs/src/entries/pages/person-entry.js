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
import { renderSidebar } from '../../components/shell/sidebar.js?v=20261018f';
import { renderHeader } from '../../components/shell/header.js?v=20261018f';
import { BranchService } from '../../services/core/runtime.js?v=20261018f';
import { AuthStore } from '../../services/core/auth.js?v=20261018f';
import { PersonStore, getPersonName } from '../../services/member/person.js?v=20261018f';
import { getDataSource } from '../../data/data-adapter.js?v=20261018f';
import { loadMemberProfile } from '../../services/member/profile.js?v=20261018f';
import { getBranchById } from '../../services/branch/branch.js?v=20261018f';
import { openPersonEditModal } from '../../components/governance/pickers.js?v=20261018f';
import {
  renderSelfDescriptionSection, countSelfProfileFilled, SELF_PROFILE_TOTAL,
} from '../../components/governance/person-profile-sections.js?v=20261018f';
// 待确认请求读口（单一源：服务层现有读口；api 形态由 init() 从服务端填充同一缓存）
import {
  listPendingConfirmations, MC_ACTION_LABEL,
} from '../../services/member/member-confirmation.js?v=20261018f';
// Q-21-3 收敛（2026-09-13）：在册状态枚举单一源 = core/domain/constants.js（原经 org-base-data-preview 转出）
import { ROLE_LABELS, RESIDENCE } from '../../core/domain/constants.js?v=20261018f';
import { canMaintainMemberProfileFields } from '../../core/domain/profile-access.js?v=20261018f';
import { getBasePath, escHtml as esc, fmtDt } from '../../core/base/utils.js?v=20261018f';
import { badgeHtml } from '../../components/ui/badges.js?v=20261018f';
// 批次 87：本页必须先 hydrate API 数据源再渲染（成员档案读 + 编辑写）——与 activity.html 标准形同款。
// 此前本页只调 BranchService.loadDB()（API 模式直接 return）⇒ api 形态下档案读的是本地备份，
// 且「编辑档案」按 mock 数据源落本机、服务端 users 表不更新。
import { hydrateDataSource, notifyDataLoaded } from '../../data/data-adapter.js?v=20261018f';
import { ApiAdapter } from '../../data/api-adapter.js?v=20261018f';

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
const personId = params.get('id') || (viewer?.personId || '');
const isSelf = !!personId && String(viewer?.personId || '') === String(personId);

/** 卡内状态提示（权限失败不会先显示缓存档案，再以遮罩隐藏）。 */
function renderMessage(html, role = 'status') {
  if (!cardEl) return;
  cardEl.setAttribute('aria-busy', 'false');
  cardEl.innerHTML = `<p role="${role}" aria-live="${role === 'alert' ? 'assertive' : 'polite'}" class="text-sm text-gray-600 text-center py-12">${html}</p>`;
}

/** 字段值：缺失/空白 → 未填写（全页一套词表） */
function textOrEmpty(value, empty = '未填写') {
  const text = String(value == null ? '' : value).trim();
  return text ? esc(text) : empty;
}

/** 党小组：空串＝未分组；字段缺失＝未填写（不回退混淆） */
function partyGroupHtml(value) {
  if (value === undefined || value === null) return '未填写';
  const text = String(value).trim();
  return text ? esc(text) : '未分组';
}

/** 在册状态：字段缺失 → 在校（默认），注明默认，不静默伪装成已采集 */
function residenceText(member) {
  const value = String(member?.residenceStatus == null ? '' : member.residenceStatus).trim();
  if (!value) return '在校（默认）';
  return value;
}

/** 届别：四位数年份显示为「YYYY 届」；其余原值展示（仅新增时采集，本页只读） */
function enrollYearHtml(value) {
  const text = String(value == null ? '' : value).trim();
  if (!text) return '未填写';
  return /^\d{4}$/.test(text) ? esc(`${text} 届`) : esc(text);
}

/** 阶段起始日：只读，显示为「YYYY-MM-DD 起」 */
function developStageSinceHtml(value) {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(value == null ? '' : value));
  return match ? `${match[1]} 起` : '未填写';
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
    renderMessage(`请先登录后查看成员档案 · <a class="text-sky-600 hover:underline" href="${getBasePath()}login.html">去登录</a>`);
    return;
  }
  if (!personId) {
    renderMessage(`未指定成员 · <a class="text-sky-600 hover:underline" href="${getBasePath()}workspace/org.html">去成员名册</a>`);
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
  const history = Array.isArray(member.residenceHistory) ? member.residenceHistory.slice() : [];
  // 留痕固定新→旧（页面可见标注「按时间倒序」）
  history.sort((a, b) => String(b?.updatedAt || '').localeCompare(String(a?.updatedAt || '')));
  const latest = history[0] || null;

  const canEdit = canMaintainMemberProfileFields({
    id: viewer.personId, role: viewer.role, branchId: viewer.branchId,
  }, member);
  const isPartyStaff = viewer.role === 'party-staff';
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
  const stageLabel = member.developStage || '阶段未填写';
  const roleLabel = ROLE_LABELS[member.role] || member.role || '无治理角色';
  const recentConclusion = latest
    ? `最近变更：${esc(fmtDt(latest.updatedAt) || '时间未记录')} ${esc(latest.from || '—')} → ${esc(latest.to || '—')}${latest.updatedBy ? `（记录：${esc(personLabel(latest.updatedBy))}）` : ''}`
    : '暂无在册变更';

  const historyItems = history.length === 0
    ? '<li class="text-sm text-gray-500">暂无在册变更</li>'
    : history.map((record) => `<li class="text-sm">
        <p class="text-xs text-gray-500">时间：<time datetime="${esc(record.updatedAt || '')}">${esc(fmtDt(record.updatedAt) || '时间未记录')}</time></p>
        <p class="mt-0.5 text-gray-800"><span class="text-gray-500">变更前</span> ${esc(record.from || '—')} <span class="text-gray-400" aria-hidden="true">→</span> <span class="text-gray-500">变更后</span> ${esc(record.to || '—')}</p>
        <p class="mt-0.5 text-xs text-gray-500">记录人：${esc(personLabel(record.updatedBy))}</p>
        ${record.note ? `<p class="mt-0.5 text-xs text-gray-600 break-words whitespace-pre-wrap">备注：${esc(record.note)}</p>` : ''}
      </li>`).join('');

  const selfReadOnlyReason = isPartyStaff
    ? '党委只读查看'
    : isSelf
      ? ''
      : '仅本人或本支部组织委员可填写';

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
          ${isSelf ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700" title="这是你自己的档案（无 ?id= 即本人）">本人</span>' : ''}
          ${isPartyStaff ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">党委只读</span>' : ''}
        </div>
      </div>
    </section>

    <!-- 分区一：组织事实（4 行紧凑 dl，不是 4 张同权灰卡） -->
    <section aria-labelledby="person-org-facts-heading" class="mb-6 border-b border-gray-100 pb-6">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div class="min-w-0">
          <h2 id="person-org-facts-heading" class="text-base font-semibold text-gray-700">组织事实</h2>
          <p class="mt-1 text-xs text-gray-500">组织关系已归属该支部；以下 4 项为档案细节，其中学号、党小组可在此补正。</p>
        </div>
        ${canEdit
          ? '<button type="button" id="person-org-facts-btn" class="btn-accent-soft text-sm px-4 py-2 rounded-lg">编辑组织事实</button>'
          : `<p class="text-xs text-gray-400">${esc(readOnlyReason)}</p>`}
      </div>
      <dl class="mt-2 border-y border-gray-100">
        <div class="flex gap-3 border-b border-gray-100 py-2 last:border-b-0">
          <dt class="w-20 flex-shrink-0 text-xs text-gray-500">学号</dt>
          <dd class="min-w-0 flex-1">
            <span data-field="studentId" class="text-sm text-gray-800 break-words">${textOrEmpty(member.studentId)}</span>
            <span class="mt-0.5 block text-[11px] text-gray-400">同时是登录账号</span>
          </dd>
        </div>
        <div class="flex gap-3 border-b border-gray-100 py-2 last:border-b-0">
          <dt class="w-20 flex-shrink-0 text-xs text-gray-500">届别</dt>
          <dd class="min-w-0 flex-1">
            <span data-field="enrollYear" class="text-sm text-gray-800 break-words">${enrollYearHtml(member.enrollYear)}</span>
            <span class="mt-0.5 block text-[11px] text-gray-400">仅新增时采集</span>
          </dd>
        </div>
        <div class="flex gap-3 border-b border-gray-100 py-2 last:border-b-0">
          <dt class="w-20 flex-shrink-0 text-xs text-gray-500">党小组</dt>
          <dd class="min-w-0 flex-1">
            <span data-field="partyGroup" class="text-sm text-gray-800 break-words">${partyGroupHtml(member.partyGroup)}</span>
          </dd>
        </div>
        <div class="flex gap-3 border-b border-gray-100 py-2 last:border-b-0">
          <dt class="w-20 flex-shrink-0 text-xs text-gray-500">进入当前阶段</dt>
          <dd class="min-w-0 flex-1">
            <span data-field="developStageSince" class="text-sm text-gray-800 break-words">${developStageSinceHtml(member.developStageSince)}</span>
            <span class="mt-0.5 block text-[11px] text-gray-400">系统随阶段变更落档，本页只读</span>
          </dd>
        </div>
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
            <div class="flex gap-3 py-1.5">
              <span class="w-20 flex-shrink-0 text-xs text-gray-500">当前备注</span>
              <p data-field="residenceNote" class="min-w-0 flex-1 text-sm text-gray-800 break-words whitespace-pre-wrap">${hasResidenceNote ? esc(String(member.residenceNote).trim()) : '—'}</p>
            </div>
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
          : `<p class="text-xs text-gray-400">${esc(readOnlyReason)}</p>`}
      </div>
    </section>

    ${renderSelfDescriptionSection(member.selfProfile, {
      isSelf,
      canDictate: canEdit && !isSelf,
      readOnlyReason: selfReadOnlyReason,
    })}

    <!-- L2 系统说明：id 唯一落点，标注系统生成、不参与业务判断 -->
    <details id="person-system-info" class="pt-1">
      <summary class="cursor-pointer text-xs font-medium text-gray-500">系统说明 · 档案编号与留痕来源</summary>
      <div class="mt-2 space-y-1 text-xs text-gray-500">
        <p>
          <span class="text-[11px] uppercase tracking-wide text-gray-400">档案编号</span>
          <span data-field="id" class="ml-2 font-mono text-gray-700 break-all">${textOrEmpty(member.id, '档案编号缺失')}</span>
        </p>
        <p>档案编号由系统生成，用于排障与对账，不参与业务判断。</p>
        <p>变更留痕由确认链追加，不可编辑；阶段起始日随阶段变更同笔落档。</p>
        <p>角色与所属支部为治理字段，不在本页修改。</p>
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
      focusFields: ['studentId', 'partyGroup'],
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
