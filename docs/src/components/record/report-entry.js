// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  components/record/report-entry.js — 一键汇报入口（各工作台顶部常驻按钮）
//  支书 2026-08-10 裁定：
//  ① 复用 Issue 体系（kind='report'），三类分类（进度/卡点/请示）
//  ② 发往支书 → 支书答复 → 发回 → 汇报人确认闭环
//  ③ 界面措辞温和："了解进展"请求来自支书时直接展示，不使用"要求"字样
//  角标来源：IssueNotify.getUnreadCount(当前用户) = 支书请我汇报 + 支书答复发回
//  最小三成本：按钮常驻顶部（零搜寻），弹窗两步完成（选分类+填正文）
//
//  2026-09-30 批次 297-2 **改位**（支书裁「页头只留 1 枚本台主 CTA；**跨台通用动作收进全局固定位**」）：
//    「一键汇报」原**常驻 5 个台的页头**（各台 tab-bar 的 extraRight）——同一动作 5 个入口＝重复入口，
//    且各台页头因此常驻两枚彩色按钮（org 台更与「发布招募」并排）⇒ 收成**全站唯一固定位**＝
//    顶栏 `components/shell/header.js` 的 `.header-actions`（`id="btn-report-entry"` **不变**，
//    表单台账与真机守卫照旧命中原 id）。
//    外观＝既有**顶栏动作口径** `.header-action-btn`（白透底 / 细边 / 浅字，与铃铛、登录入口同源）
//    ＋族类 `.btn-ghost`（**族为基线、私有为身份**，见 `DESIGN_SYSTEM §4.1 rule H`）；
//    角标**底色随宿主背景**（顶栏＝深红底）⇒ **党徽金底 ＋ 深字**（同批次 294 对顶栏铃铛角标的裁定），
//    **不落 hex**。
// ════════════════════════════════════════════════════════════════

import { IssueStore, IssueNotify, REPORT_CATEGORIES } from '../../services/governance/issues.js?v=20261024c';
import { AuthStore } from '../../services/core/auth.js?v=20261024c';
import { showToast, getBasePath } from '../../core/base/utils.js?v=20261024c';
import { getPersonName } from '../../services/member/person.js?v=20261024c';
import { loadActivities } from '../../services/activity/activity.js?v=20261024c';
import { TaskForceRecordStore } from '../../services/activity/taskforce.js?v=20261024c';
import { SECRETARY_AND_DEPUTY_ROLES } from '../../core/domain/constants.js?v=20261024c';
import { isTaskforceTerminalStatus } from '../../core/domain/domain.js?v=20261024c';
import { openModal, closeModal } from '../ui/modal.js?v=20261024c';

/** 当前用户未读汇报数（「支书请我汇报」＋「支书答复发回」） */
function _unreadCount() {
  try {
    const me = AuthStore.getCurrentUser();
    if (me) return IssueNotify.getUnreadCount(me.personId) || 0;
  } catch {}
  return 0;
}

/** 角标 HTML（**深红底 ⇒ 党徽金底 ＋ 深字**，与顶栏铃铛角标同一口径；`≥10` 收敛 `9+`） */
function _badgeHtml(unread) {
  if (!(unread > 0)) return '';
  return `<span class="report-entry-badge text-amber-800" aria-label="待处理汇报 ${unread} 条">${unread > 9 ? '9+' : unread}</span>`;
}

/**
 * 一键汇报入口 HTML（**全站唯一位**＝顶栏 `.header-actions`）
 * @returns {string}
 */
export function renderReportEntryHtml() {
  return `
    <button id="btn-report-entry" type="button" class="btn-ghost header-action-btn report-entry-btn" aria-haspopup="dialog" aria-label="一键汇报">一键汇报${_badgeHtml(_unreadCount())}</button>`;
}

/** 刷新角标（数据变更 / 发出汇报后调用；与顶栏铃铛角标同一刷新路径） */
export function refreshReportEntryBadge() {
  const btn = document.getElementById('btn-report-entry');
  if (!btn) return;
  btn.querySelector('.report-entry-badge')?.remove();
  const unread = _unreadCount();
  if (unread > 0) btn.insertAdjacentHTML('beforeend', _badgeHtml(unread));
}

/**
 * 绑定一键汇报按钮（顶栏渲染后调用）
 * @param {ParentNode} [root=document]
 */
export function bindReportEntry(root = document) {
  root.querySelector('#btn-report-entry')?.addEventListener('click', () => openReportModal());
}

/** 可选父键候选：在办的活动 / 专班（各自带工作组 id；不新造工作组） */
function _reportTargets() {
  const acts = (loadActivities() || [])
    .filter(a => !a.archived)
    .map(a => ({
      workgroupId: a.workgroupId || `wg-activity-${a.id}`,
      sourceType: 'activity',
      sourceId: a.id,
      label: `活动：${a.title || a.id}`,
    }));
  const tfs = (TaskForceRecordStore.getAll() || [])
    .filter(t => !isTaskforceTerminalStatus(t.status))
    .map(t => ({
      workgroupId: t.workgroupId || `wg-taskforce-${t.id}`,
      sourceType: 'taskforce',
      sourceId: t.id,
      label: `专班：${t.name || t.id}`,
    }));
  return [...acts, ...tfs];
}

/** 上下文预选：从活动 / 专班详情页发起时，把当前对象带进汇报（父键不是必填，仍可改回「不关联」） */
function _contextReportTarget() {
  try {
    const q = new URLSearchParams(window.location.search);
    const path = window.location.pathname;
    if (/activity\.html$/.test(path)) return { sourceType: 'activity', sourceId: q.get('activityId') || q.get('id') };
    if (/taskforce\.html$/.test(path)) return { sourceType: 'taskforce', sourceId: q.get('taskforceId') || q.get('id') };
  } catch {}
  return null;
}

/** 打开汇报弹窗（预加载 issues 权威源，避免覆盖本地缓存） */
async function openReportModal() {
  await IssueStore.loadAll();
  const MODAL_ID = 'report-entry';
  const me = AuthStore.getCurrentUser();
  const targets = _reportTargets();
  const ctx = _contextReportTarget();
  const preselected = ctx
    ? targets.find(t => t.sourceType === ctx.sourceType && t.sourceId === ctx.sourceId)
    : null;
  const canReportUp = !!me && SECRETARY_AND_DEPUTY_ROLES.includes(me.role);
  const optionsHtml = [
    '<option value="">（不关联，个人汇报）</option>',
    targets.some(t => t.sourceType === 'activity')
      ? `<optgroup label="活动">${targets.filter(t => t.sourceType === 'activity')
          .map(t => `<option value="${t.workgroupId}"${preselected && preselected.workgroupId === t.workgroupId ? ' selected' : ''}>${t.label}</option>`).join('')}</optgroup>`
      : '',
    targets.some(t => t.sourceType === 'taskforce')
      ? `<optgroup label="专班">${targets.filter(t => t.sourceType === 'taskforce')
          .map(t => `<option value="${t.workgroupId}"${preselected && preselected.workgroupId === t.workgroupId ? ' selected' : ''}>${t.label}</option>`).join('')}</optgroup>`
      : '',
  ].join('');

  // 浮层统一体例（DESIGN_SYSTEM §4.27）：header 纯文本标题 / 动作固定在 footer / 取消走 onCancel
  const bodyHtml = `
    <p class="text-xs text-gray-500 mb-3">汇报将发往支书，答复后发回给你。请选择分类并填写内容。</p>
    <div class="mb-3">
      <label class="text-xs text-gray-500 mb-1.5 block font-medium" for="report-modal-target">关联事项（可选）</label>
      <select id="report-modal-target" class="input-flat w-full">${optionsHtml}</select>
    </div>
    <div class="flex items-center gap-2 mb-3">
      ${Object.entries(REPORT_CATEGORIES).map(([key, label]) => `
        <button type="button" class="btn-tab report-cat-btn text-xs px-3 py-1.5 rounded-lg transition-colors ${key === 'progress' ? 'report-cat-active' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}"
          data-category="${key}">${label}</button>
      `).join('')}
    </div>
    <textarea id="report-modal-body" class="input-flat w-full h-24 resize-none" placeholder="填写汇报内容（进度 / 难点卡点 / 请示事项）…"></textarea>
    ${canReportUp ? `<p class="text-xs text-gray-500 mt-3">需向党委上报（发展节点 / 活动报备）？<a class="underline" style="color:var(--app-accent-soft-text);" href="${getBasePath()}workspace/secretary.html?tab=report-up">去上报党委</a></p>` : ''}
  `;

  openModal({
    id: MODAL_ID,
    title: '一键汇报',
    bodyHtml,
    size: 'md',
    footerHtml: `
      <button type="button" data-modal-cancel="${MODAL_ID}" class="btn-outline text-xs px-3 py-2">取消</button>
      <button id="report-modal-submit" type="button" class="btn-accent text-xs px-4 py-2">发出汇报</button>`,
    onMount: (panel) => {
      // 分类选择
      let category = 'progress';
      panel.querySelectorAll('.report-cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          category = btn.dataset.category;
          panel.querySelectorAll('.report-cat-btn').forEach(b => {
            const on = b === btn;
            b.className = `report-cat-btn text-xs px-3 py-1.5 rounded-lg transition-colors ${on ? 'report-cat-active' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}`;
          });
        });
      });

      // 提交：校验失败不关窗、不丢正文（M-6）
      panel.querySelector('#report-modal-submit').addEventListener('click', async () => {
        const body = panel.querySelector('#report-modal-body')?.value?.trim();
        if (!body) { showToast('error', '请填写汇报内容'); return; }
        const workgroupId = panel.querySelector('#report-modal-target')?.value || '';
        const target = workgroupId ? targets.find(t => t.workgroupId === workgroupId) : null;
        const submitBtn = panel.querySelector('#report-modal-submit');
        submitBtn.disabled = true;
        try {
          const issue = await IssueStore.submitReport({
            category,
            body,
            workgroupId: workgroupId || null,
            sourceType: target?.sourceType || null,
            sourceId: target?.sourceId || null,
            sourceName: target?.label || '',
          });
          if (!issue) { showToast('error', '汇报发送失败'); return; }
          showToast('success', '汇报已发出，等待支书答复');
          closeModal(MODAL_ID);
          refreshReportEntryBadge();
        } finally {
          submitBtn.disabled = false;
        }
      });
    },
  });
}

// 供其他模块（如我的汇报追踪）复用的人员名解析
export { getPersonName };
