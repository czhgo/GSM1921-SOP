// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  person-entry.js — 成员档案独立查阅页入口（2026-09-13 支书裁定）
//  定案：① 只读查阅走**独立 HTML 页**；② 可操作走模态弹窗编辑。
//  路由：?id=<personId> → 该人完整档案（只读为主 + 关联概览计数）
//        无 id           → 提示「未指定成员」+ 去成员名册
//        未登录          → 卡内提示登录
//        档案 id 查无    → 「成员不存在或已移出」
//  纪律：人名与字段一律现取 PersonStore / getPersonName；**不得**使用任何记录内姓名快照，
//        也不得在模块顶层做人员快照（跨表一致性守卫 S1/S2）。
// ════════════════════════════════════════════════════════════════
import { renderSidebar } from '../components/sidebar.js?v=20260914i';
import { renderHeader } from '../components/header.js?v=20260914i';
import { BranchService } from '../services/runtime.js?v=20260914i';
import { AuthStore } from '../services/auth.js?v=20260914i';
import { PersonStore, getPersonName } from '../services/person.js?v=20260914i';
import { getBranchById } from '../services/branch.js?v=20260914i';
import { openPersonEditModal } from '../components/person-edit-modal.js?v=20260914i';
// Q-21-3 收敛（2026-09-13）：在册状态枚举单一源 = core/constants.js（原经 org-base-data-preview 转出）
import { ROLE_LABELS, SECRETARY_AND_DEPUTY_ROLES, RESIDENCE } from '../core/constants.js?v=20260914i';
import { getBasePath, escHtml as esc, fmtDt } from '../core/utils.js?v=20260914i';
import { badgeHtml } from '../components/badges.js?v=20260914i';
import { countThoughtReportsByPerson } from '../services/thought-report.js?v=20260914i';
import { loadActivities } from '../services/activity.js?v=20260914i';
import { TaskForceRecordStore } from '../services/taskforce.js?v=20260914i';
import { loadAttendanceRecords } from '../services/attendance.js?v=20260914i';
import { loadInspectionRecords } from '../services/inspection.js?v=20260914i';

renderSidebar('dashboard');
renderHeader('dashboard');

BranchService.loadDB();
TaskForceRecordStore.init();

const cardEl = document.getElementById('person-archive-card');
const backBtn = document.getElementById('person-back-btn');
backBtn?.addEventListener('click', () => {
  if (window.history.length > 1) window.history.back();
  else window.location.href = getBasePath() + 'index.html';
});

const params = new URLSearchParams(window.location.search);
const personId = params.get('id') || '';
const viewer = AuthStore.getCurrentUser();

/** 可编辑档案的角色（支书 / 副支书 / 组织委员——与名册写口授权口径一致） */
const EDIT_ROLES = [...SECRETARY_AND_DEPUTY_ROLES, 'org-commissioner'];

/** 卡内提示（整块替换档案容器内容） */
function renderMessage(html) {
  if (cardEl) cardEl.innerHTML = `<p class="text-sm text-gray-500 text-center py-12">${html}</p>`;
}

/** 关联概览只读计数（各域按 personId 现取；取不到数据源则不显示该项，不编造数字） */
function relatedCounts(id) {
  const items = [];
  items.push({
    label: '思想汇报',
    count: countThoughtReportsByPerson(id),
    href: `thought-report.html?personId=${encodeURIComponent(id)}`,
  });
  items.push({
    label: '参与活动',
    count: loadActivities().filter(a =>
      a.organizer === id || (Array.isArray(a.assignments) && a.assignments.some(x => x && x.personId === id))).length,
  });
  items.push({
    label: '参与专班',
    count: TaskForceRecordStore.getAll().filter(t =>
      t.manager === id || t.initiator === id
      || (Array.isArray(t.members) && t.members.some(m => m && m.personId === id))).length,
  });
  items.push({
    label: '考勤记录',
    count: loadAttendanceRecords().filter(r => r.personId === id).length,
  });
  items.push({
    label: '考察记录',
    count: loadInspectionRecords().filter(r => r.personId === id).length,
  });
  return items;
}

/** 关联概览单元格（只读计数；仅思想汇报有真实链接，其余数字不做假按钮） */
function statCell(item) {
  const num = `<p class="text-lg font-semibold text-gray-800">${item.count}</p>`;
  const label = `<p class="text-xs text-gray-500 mb-0.5">${esc(item.label)}</p>`;
  if (!item.href) return `<div class="rounded-xl bg-gray-50 px-4 py-3">${label}${num}</div>`;
  return `<a href="${item.href}" class="rounded-xl bg-gray-50 px-4 py-3 block hover:bg-gray-100 transition-colors">
      ${label}${num}
      <span class="text-[11px] text-sky-600">查看其思想汇报 →</span>
    </a>`;
}

/** 渲染档案页（保存成功后重渲染本页） */
function render() {
  if (!cardEl) return;
  if (!viewer) {
    renderMessage(`请先登录后查看成员档案 · <a class="text-sky-600 hover:underline" href="${getBasePath()}login.html">去登录</a>`);
    return;
  }
  if (!personId) {
    renderMessage(`未指定成员 · <a class="text-sky-600 hover:underline" href="${getBasePath()}workspace/org.html">去成员名册</a>`);
    return;
  }
  const member = PersonStore.getById(personId);
  if (!member) {
    renderMessage('成员不存在或已移出');
    return;
  }

  const branch = getBranchById(member.branchId);
  const branchLabel = branch?.name || member.branchId || '—';
  const isDetained = member.residenceStatus === RESIDENCE.DETAINED;
  const history = Array.isArray(member.residenceHistory) ? member.residenceHistory : [];
  const canEdit = EDIT_ROLES.includes(viewer.role);

  const historyHtml = history.length === 0
    ? '<p class="text-xs text-gray-500">暂无变更留痕</p>'
    : `<div class="space-y-1.5">${history.map(h => `
        <div class="text-xs text-gray-600">
          <span class="font-medium">${esc(fmtDt(h.updatedAt))}</span>
          · ${esc(h.from || '—')} → ${esc(h.to || '—')}
          ${h.note ? `· ${esc(h.note)}` : ''}
          ${h.updatedBy ? `<span class="text-gray-400">（记录：${esc(getPersonName(h.updatedBy))}）</span>` : ''}
        </div>`).join('')}</div>`;

  const statsHtml = relatedCounts(member.id).map(statCell).join('');

  cardEl.innerHTML = `
    <!-- 标题区 -->
    <div class="mb-5 pb-5 border-b border-gray-100">
      <div class="flex items-center gap-2.5 mb-2 flex-wrap">
        ${badgeHtml(member.developStage || '—', 'info')}
        <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">${esc(ROLE_LABELS[member.role] || member.role || '—')}</span>
        ${isDetained ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium text-amber-700 bg-amber-50">${esc(RESIDENCE.DETAINED)}</span>` : ''}
        <span class="ml-auto text-xs text-gray-400">${esc(member.id)}</span>
      </div>
      <h2 class="text-xl font-semibold text-gray-900">${esc(member.name || '—')}</h2>
      ${isDetained && member.residenceNote ? `<p class="text-xs text-amber-700 mt-1">${esc(member.residenceNote)}</p>` : ''}
    </div>

    <!-- 基础档案 -->
    <div class="mb-6">
      <h3 class="text-sm font-semibold text-gray-700 mb-3">基础档案</h3>
      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-xl bg-gray-50 px-4 py-3">
          <p class="text-xs text-gray-500 mb-0.5">学号</p>
          <p class="text-sm font-medium text-gray-800">${esc(member.studentId || '—')}</p>
        </div>
        <div class="rounded-xl bg-gray-50 px-4 py-3">
          <p class="text-xs text-gray-500 mb-0.5">党小组</p>
          <p class="text-sm font-medium text-gray-800">${esc(member.partyGroup || '—')}</p>
        </div>
        <div class="rounded-xl bg-gray-50 px-4 py-3">
          <p class="text-xs text-gray-500 mb-0.5">角色</p>
          <p class="text-sm font-medium text-gray-800">${esc(ROLE_LABELS[member.role] || member.role || '—')}</p>
        </div>
        <div class="rounded-xl bg-gray-50 px-4 py-3">
          <p class="text-xs text-gray-500 mb-0.5">所属支部</p>
          <p class="text-sm font-medium text-gray-800">${esc(branchLabel)}</p>
        </div>
      </div>
    </div>

    <!-- 在册管理 -->
    <div class="mb-6">
      <h3 class="text-sm font-semibold text-gray-700 mb-3">在册管理</h3>
      <div class="rounded-xl bg-gray-50 px-4 py-3 mb-3">
        <p class="text-xs text-gray-500 mb-0.5">在册状态</p>
        <p class="text-sm font-medium text-gray-800">${isDetained
          ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium text-amber-700 bg-amber-50">${esc(RESIDENCE.DETAINED)}</span>`
          : esc(member.residenceStatus || RESIDENCE.CAMPUS)}</p>
        <p class="text-xs text-gray-600 mt-1">${member.residenceNote ? esc(member.residenceNote) : '无在册备注'}</p>
      </div>
      <h4 class="text-xs font-semibold text-gray-600 mb-2">在册变更留痕</h4>
      ${historyHtml}
    </div>

    <!-- 关联概览（只读计数） -->
    <div class="mb-6">
      <h3 class="text-sm font-semibold text-gray-700 mb-3">关联概览</h3>
      <div class="grid grid-cols-2 gap-3">${statsHtml}</div>
    </div>

    ${canEdit ? `
    <div class="pt-5 border-t border-gray-100 flex justify-end">
      <button type="button" id="person-edit-btn" class="btn-accent-soft text-sm px-4 py-2 rounded-lg">编辑档案</button>
    </div>` : ''}
  `;

  cardEl.querySelector('#person-edit-btn')?.addEventListener('click', () => {
    openPersonEditModal({
      personId: member.id,
      sourceLabel: '成员档案页',
      onSaved: () => render(),
    });
  });
}

render();
