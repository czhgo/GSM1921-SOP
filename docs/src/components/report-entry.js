// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  components/report-entry.js — 一键汇报入口（各工作台顶部常驻按钮）
//  书记 2026-08-10 裁定：
//  ① 复用 Issue 体系（kind='report'），三类分类（进度/卡点/请示）
//  ② 发往书记 → 书记答复 → 发回 → 汇报人确认闭环
//  ③ 界面措辞温和："了解进展"请求来自书记时直接展示，不使用"要求"字样
//  角标来源：IssueNotify.getUnreadCount(当前用户) = 书记请我汇报 + 书记答复发回
//  最小三成本：按钮常驻顶部（零搜寻），弹窗两步完成（选分类+填正文）
// ════════════════════════════════════════════════════════════════

import { IssueStore, IssueNotify, REPORT_CATEGORIES } from '../services/issues.js?v=20260901u';
import { AuthStore } from '../services/auth.js?v=20260901u';
import { showToast } from '../core/utils.js?v=20260901u';
import { getPersonName } from '../mock/index.js?v=20260901u';
import { solidAccentStyle } from '../core/constants.js?v=20260901u';

/**
 * 一键汇报按钮 HTML（挂在 tab-bar extraRightHtml 右侧）
 * @param {{ accent?: string, accentRgba?: string }} opts
 * @returns {string}
 */
export function renderReportEntryHtml({ accent = '#B91C1C', accentRgba = 'rgba(185,28,28,0.1)' } = {}) {
  let unread = 0;
  try {
    const me = AuthStore.getCurrentUser();
    if (me) unread = IssueNotify.getUnreadCount(me.personId) || 0;
  } catch {}
  const badge = unread > 0
    ? `<span class="report-entry-badge" style="position:absolute;top:-5px;right:-6px;min-width:16px;height:16px;line-height:16px;padding:0 4px;border-radius:9999px;background:#EF4444;color:#fff;font-size:10px;text-align:center;">${unread > 9 ? '9+' : unread}</span>`
    : '';
  return `
    <button id="btn-report-entry" type="button"
      style="position:relative;display:inline-flex;align-items:center;gap:4px;${solidAccentStyle(accent)};border:none;padding:6px 16px;border-radius:var(--radius-sm);font-size:0.75rem;font-weight:500;cursor:pointer;transition:opacity 0.15s;"
      onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
      一键汇报${badge}
    </button>`;
}

/**
 * 绑定一键汇报按钮（在 tab-bar bindEvents 后调用）
 * @param {HTMLElement} container — 工作台根容器
 */
export function bindReportEntry(container) {
  container.querySelector('#btn-report-entry')?.addEventListener('click', () => openReportModal());
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
    <div class="card rounded-2xl p-5 w-full" style="max-width:480px;margin:16px;">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-title-cn text-base font-semibold text-gray-800">一键汇报</h3>
        <button type="button" class="report-modal-close text-xs text-gray-400 hover:text-gray-600 transition-colors">关闭</button>
      </div>
      <p class="text-xs text-gray-500 mb-3">汇报将发往书记，答复后发回给你。请选择分类并填写内容。</p>
      <div class="flex items-center gap-2 mb-3">
        ${Object.entries(REPORT_CATEGORIES).map(([key, label]) => `
          <button type="button" class="report-cat-btn text-xs px-3 py-1.5 rounded-lg transition-all ${key === 'progress' ? 'report-cat-active' : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}"
            data-category="${key}">${label}</button>
        `).join('')}
      </div>
      <textarea id="report-modal-body" class="input-flat text-xs w-full h-24 resize-none" placeholder="填写汇报内容（进度 / 难点卡点 / 请示事项）…"></textarea>
      <div class="flex justify-end gap-2 mt-3">
        <button type="button" class="report-modal-close text-xs px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50">取消</button>
        <button id="report-modal-submit" class="text-xs px-4 py-2 rounded-lg text-white" style="background:var(--app-accent,#B91C1C);">发出汇报</button>
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
    showToast('success', '汇报已发出，等待书记答复');
    close();
    try {
      const me = AuthStore.getCurrentUser();
      const btn = document.getElementById('btn-report-entry');
      if (me && btn) {
        const unread = IssueNotify.getUnreadCount(me.personId) || 0;
        btn.innerHTML = `一键汇报${unread > 0 ? `<span class="report-entry-badge" style="position:absolute;top:-5px;right:-6px;min-width:16px;height:16px;line-height:16px;padding:0 4px;border-radius:9999px;background:#EF4444;color:#fff;font-size:10px;text-align:center;">${unread > 9 ? '9+' : unread}</span>` : ''}`;
      }
    } catch {}
  });
}

// 供其他模块（如我的汇报追踪）复用的人员名解析
export { getPersonName };
