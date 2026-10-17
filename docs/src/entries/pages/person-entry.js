// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  person-entry.js — 成员档案独立查阅页入口（2026-09-13 支书裁定）
//  定案：① 只读查阅走**独立 HTML 页**；② 可操作走模态弹窗编辑。
//  路由：?id=<personId> → 该人授权投影（本人自我描述 + 组织维护字段）
//        无 id           → 提示「未指定成员」+ 去成员名册
//        未登录          → 卡内提示登录
//        档案 id 查无    → 「成员不存在或已移出」
//  纪律：人名与字段一律现取 PersonStore / getPersonName；**不得**使用任何记录内姓名快照，
//        也不得在模块顶层做人员快照（跨表一致性守卫 S1/S2）。
// ════════════════════════════════════════════════════════════════
import { renderSidebar } from '../../components/shell/sidebar.js?v=20261017h';
import { renderHeader } from '../../components/shell/header.js?v=20261017h';
import { BranchService } from '../../services/core/runtime.js?v=20261017h';
import { AuthStore } from '../../services/core/auth.js?v=20261017h';
import { PersonStore, getPersonName } from '../../services/member/person.js?v=20261017h';
import { getDataSource } from '../../data/data-adapter.js?v=20261017h';
import { loadMemberProfile } from '../../services/member/profile.js?v=20261017h';
import { getBranchById } from '../../services/branch/branch.js?v=20261017h';
import { openPersonEditModal } from '../../components/governance/pickers.js?v=20261017h';
import { renderSelfDescriptionSection } from '../../components/governance/person-profile-sections.js?v=20261017h';
// Q-21-3 收敛（2026-09-13）：在册状态枚举单一源 = core/domain/constants.js（原经 org-base-data-preview 转出）
import { ROLE_LABELS, RESIDENCE } from '../../core/domain/constants.js?v=20261017h';
import { canMaintainMemberProfileFields } from '../../core/domain/profile-access.js?v=20261017h';
import { getBasePath, escHtml as esc, fmtDt } from '../../core/base/utils.js?v=20261017h';
import { badgeHtml } from '../../components/ui/badges.js?v=20261017h';
// 批次 87：本页必须先 hydrate API 数据源再渲染（成员档案读 + 编辑写）——与 activity.html 标准形同款。
// 此前本页只调 BranchService.loadDB()（API 模式直接 return）⇒ api 形态下档案读的是本地备份，
// 且「编辑档案」按 mock 数据源落本机、服务端 users 表不更新。
import { hydrateDataSource, notifyDataLoaded } from '../../data/data-adapter.js?v=20261017h';
import { ApiAdapter } from '../../data/api-adapter.js?v=20261017h';

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
  let member;
  try {
    member = await loadMemberProfile({
      personId,
      actor: { id: viewer.personId, role: viewer.role, branchId: viewer.branchId },
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
  const branchLabel = branch?.name || member.branchId || '—';
  const isDetained = member.residenceStatus === RESIDENCE.DETAINED;
  const history = Array.isArray(member.residenceHistory) ? member.residenceHistory : [];
  const canEdit = canMaintainMemberProfileFields({
    id: viewer.personId, role: viewer.role, branchId: viewer.branchId,
  }, member);

  const historyHtml = history.length === 0
    ? '<p class="text-xs text-gray-500">暂无变更留痕</p>'
    : `<div class="space-y-1.5">${history.map(h => `
        <div class="text-xs text-gray-600">
          <span class="font-medium">${esc(fmtDt(h.updatedAt))}</span>
          · ${esc(h.from || '—')} → ${esc(h.to || '—')}
          ${h.note ? `· ${esc(h.note)}` : ''}
          ${h.updatedBy ? `<span class="text-gray-400">（记录：${esc(getPersonName(h.updatedBy))}）</span>` : ''}
        </div>`).join('')}</div>`;

  cardEl.innerHTML = `
    <!-- 标题区 -->
    <div class="mb-5 pb-5 border-b border-gray-100">
      <div class="flex items-center gap-2.5 mb-2 flex-wrap">
        ${badgeHtml(member.developStage || '—', 'info')}
        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">${esc(ROLE_LABELS[member.role] || member.role || '—')}</span>
        ${isSelf ? '<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700" title="这是你自己的档案（无 ?id= 即本人）">本人</span>' : ''}
        ${isDetained ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium text-amber-700 bg-amber-50">${esc(RESIDENCE.DETAINED)}</span>` : ''}
        <span class="ml-auto text-xs text-gray-400">${esc(member.id)}</span>
      </div>
      <h1 class="text-xl font-semibold text-gray-900">${esc(member.name || '—')}</h1>
      ${isDetained && member.residenceNote ? `<p class="text-xs text-amber-700 mt-1">${esc(member.residenceNote)}</p>` : ''}
    </div>

    ${renderSelfDescriptionSection(member.selfProfile, { isSelf })}

    <!-- 组织维护资料：字段来源和本人自述分区展示，保留现行字段编辑授权。 -->
    <section aria-labelledby="person-organization-profile-heading" class="mb-6">
      <div class="mb-3">
        <h2 id="person-organization-profile-heading" class="text-base font-semibold text-gray-700">组织维护档案</h2>
        <p class="text-xs text-gray-500 mt-1">由支部按组织职责维护，用于组织关系与在册管理。</p>
      </div>
      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="min-w-0 rounded-xl bg-gray-50 px-4 py-3">
          <dt class="text-xs text-gray-500 mb-1">学号</dt>
          <dd class="text-sm font-medium text-gray-800 break-words">${esc(member.studentId || '—')}</dd>
        </div>
        <div class="min-w-0 rounded-xl bg-gray-50 px-4 py-3">
          <dt class="text-xs text-gray-500 mb-1">届别</dt>
          <dd class="text-sm font-medium text-gray-800 break-words">${esc(member.enrollYear || '—')}</dd>
        </div>
        <div class="min-w-0 rounded-xl bg-gray-50 px-4 py-3">
          <dt class="text-xs text-gray-500 mb-1">党小组</dt>
          <dd class="text-sm font-medium text-gray-800 break-words">${esc(member.partyGroup || '—')}</dd>
        </div>
        <div class="min-w-0 rounded-xl bg-gray-50 px-4 py-3">
          <dt class="text-xs text-gray-500 mb-1">所属支部</dt>
          <dd class="text-sm font-medium text-gray-800 break-words">${esc(branchLabel)}</dd>
        </div>
      </dl>
      <div class="rounded-xl bg-gray-50 px-4 py-3 mt-3">
        <h3 class="text-xs font-semibold text-gray-600 mb-1">在册状态</h3>
        <p class="text-sm font-medium text-gray-800">${isDetained
          ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium text-amber-700 bg-amber-50">${esc(RESIDENCE.DETAINED)}</span>`
          : esc(member.residenceStatus || RESIDENCE.CAMPUS)}</p>
        <p class="text-xs text-gray-600 mt-1 break-words">${member.residenceNote ? esc(member.residenceNote) : '无在册备注'}</p>
      </div>
      <div class="mt-3">
        <h3 class="text-xs font-semibold text-gray-600 mb-2">在册变更留痕</h3>
        ${historyHtml}
      </div>
    </section>

    ${canEdit ? `
    <div class="pt-5 border-t border-gray-100 flex flex-wrap justify-end gap-2">
      ${canEdit ? '<button type="button" id="person-edit-btn" class="btn-accent-soft text-sm px-4 py-2 rounded-lg">编辑组织维护字段</button>' : ''}
    </div>` : ''}
  `;
  cardEl.setAttribute('aria-busy', 'false');

  cardEl.querySelector('#person-edit-btn')?.addEventListener('click', () => {
    openPersonEditModal({
      personId: member.id,
      sourceLabel: '成员档案页',
      onSaved: () => render(),
    });
  });
  // `D-788`（2026-10-05）：本人自助填「自我描述」（`selfOnly` ⇒ 模态只出该组、只写 `selfProfile`，其余档案字段归支委层）
  cardEl.querySelector('#person-self-profile-btn')?.addEventListener('click', () => {
    openPersonEditModal({
      personId: member.id,
      selfOnly: true,
      sourceLabel: '我的档案（本人自填）',
      onSaved: () => render(),
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
