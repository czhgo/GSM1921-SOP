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

import { IssueStore, IssueNotify, REPORT_CATEGORIES } from '../../services/governance/issues.js?v=20261004i';
import { AuthStore } from '../../services/core/auth.js?v=20261004i';
import { showToast } from '../../core/base/utils.js?v=20261004i';
import { getPersonName } from '../../services/member/person.js?v=20261004i';

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

/** 打开汇报弹窗（预加载 issues 权威源，避免覆盖本地缓存） */
async function openReportModal() {
  await IssueStore.loadAll();
  const existing = document.getElementById('report-modal-root');
  if (existing) existing.remove();

  const root = document.createElement('div');
  root.id = 'report-modal-root';
  root.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;';
  root.innerHTML = `
    <div class="card rounded-xl p-5 w-full" style="max-width:480px;margin:16px;">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">一键汇报</h3>
        <button type="button" class="btn-ghost report-modal-close text-xs">关闭</button>
      </div>
      <p class="text-xs text-gray-500 mb-3">汇报将发往支书，答复后发回给你。请选择分类并填写内容。</p>
      <div class="flex items-center gap-2 mb-3">
        ${Object.entries(REPORT_CATEGORIES).map(([key, label]) => `
          <button type="button" class="btn-tab report-cat-btn text-xs px-3 py-1.5 rounded-lg transition-all ${key === 'progress' ? 'report-cat-active' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}"
            data-category="${key}">${label}</button>
        `).join('')}
      </div>
      <textarea id="report-modal-body" class="input-flat w-full h-24 resize-none" placeholder="填写汇报内容（进度 / 难点卡点 / 请示事项）…"></textarea>
      <div class="flex justify-end gap-2 mt-3">
        <button type="button" class="btn-outline report-modal-close text-xs px-3 py-2">取消</button>
        <button id="report-modal-submit" class="btn-accent text-xs px-4 py-2">发出汇报</button>
      </div>
    </div>
  `;
  document.body.appendChild(root);

  // 分类选择
  let category = 'progress';
  root.querySelectorAll('.report-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      category = btn.dataset.category;
      root.querySelectorAll('.report-cat-btn').forEach(b => {
        const on = b === btn;
        b.className = `report-cat-btn text-xs px-3 py-1.5 rounded-lg transition-all ${on ? 'report-cat-active' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}`;
      });
    });
  });

  // 关闭
  const close = () => root.remove();
  root.querySelectorAll('.report-modal-close').forEach(b => b.addEventListener('click', close));
  root.addEventListener('click', e => { if (e.target === root) close(); });

  // 提交
  root.querySelector('#report-modal-submit').addEventListener('click', () => {
    const body = document.getElementById('report-modal-body')?.value?.trim();
    if (!body) { showToast('error', '请填写汇报内容'); return; }
    const issue = IssueStore.submitReport({ category, body });
    if (!issue) { showToast('error', '汇报发送失败'); return; }
    showToast('success', '汇报已发出，等待支书答复');
    close();
    refreshReportEntryBadge();
  });
}

// 供其他模块（如我的汇报追踪）复用的人员名解析
export { getPersonName };
