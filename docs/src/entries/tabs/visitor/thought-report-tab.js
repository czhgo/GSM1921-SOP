// role: [工程师]+[AI]
// 参与者工作台 Tab：我的思想汇报（2026-08-30 书记决策启动数字化；2026-09-07 R6-2 把关式初阅）
// 党员/发展对象在系统内提交思想汇报 → 组织初阅：通过 → 自动归档归集至个人档案；
// 打回（needs_revision，附退回意见）→ 本人「修改并重新提交」→ 回待初阅队列。
// 本人可查看自己的历史提交（状态徽标 + 退回意见）；组织委员在「发展数据」tab 初阅调用。

import { AuthStore } from '../../../services/auth.js?v=20260908c';
import { addThoughtReport, listThoughtReportsByPerson, resubmitThoughtReport } from '../../../services/thought-report.js?v=20260908c';
import { showToast, escHtml as esc } from '../../../core/utils.js?v=20260908c';

// ── R6-2 初阅状态徽标（与 org 侧 thought-review-tab 同体系：琥珀待初阅 / 绿已归档 / 红已退回）──
// 读取侧与服务层 _effective 同语义：reviewStatus 缺省/非法（R6-2 前算法归档产物）→ 已归档
const STATUS_META = {
  pending:        { label: '待初阅', cls: 'bg-orange-100 text-orange-700' },
  needs_revision: { label: '已退回·需补充', cls: 'bg-red-100 text-red-700' },
  archived:       { label: '已归档', cls: 'bg-green-100 text-green-700' },
};

const _effStatus = (r) => (STATUS_META[r && r.reviewStatus] ? r.reviewStatus : 'archived');
const _date = (iso) => (iso || '').slice(0, 10);

const _statusBadgeHtml = (status) => {
  const m = STATUS_META[status];
  return `<span class="text-xs px-1.5 py-0.5 rounded-full font-medium ${m.cls}">${m.label}</span>`;
};

/** 最近一次退回意见：reviewHistory 自末往前第一条 decision==='reject' 的 note（可能为空数组 → ''） */
const _lastRejectNote = (r) => {
  const hist = Array.isArray(r && r.reviewHistory) ? r.reviewHistory : [];
  for (let i = hist.length - 1; i >= 0; i--) {
    const h = hist[i];
    if (h && h.decision === 'reject') return (h.note || '').trim();
  }
  return '';
};

export function renderContent(ctx) {
  const tc = document.getElementById('visitor-tab-content');
  if (!tc) return;

  const user = AuthStore.getCurrentUser();
  if (!user) {
    tc.innerHTML = '<p class="text-sm text-gray-400 text-center py-6">请先登录</p>';
    return;
  }
  const personId = user.personId;

  function render() {
    const reports = listThoughtReportsByPerson(personId);
    tc.innerHTML = `
      <div class="mb-3 p-3 rounded-lg bg-white">
        <p class="text-sm font-semibold text-gray-800">我的思想汇报</p>
        <p class="text-xs text-gray-400 mt-0.5">已提交 ${reports.length} 篇 · 组织初阅通过后自动归档至个人档案</p>
      </div>
      <div class="mb-3 p-3 rounded-lg bg-white border border-gray-100">
        <p class="text-xs font-medium text-gray-600 mb-2">提交思想汇报</p>
        <textarea id="tr-content" rows="5" class="input-flat w-full resize-none" placeholder="请书写本季度思想汇报"></textarea>
        <div class="flex items-center justify-between mt-2">
          <p class="text-[11px] text-gray-400">提交后由组织初阅归档，通过后自动归档至个人档案</p>
          <button id="tr-submit" class="text-xs px-4 py-1.5 rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors">提交</button>
        </div>
      </div>
      <div id="tr-list" class="space-y-2"></div>
    `;

    const listEl = document.getElementById('tr-list');
    if (!listEl) return;
    if (reports.length === 0) {
      listEl.innerHTML = '<p class="text-xs text-gray-400 text-center py-6">暂无思想汇报记录</p>';
    } else {
      listEl.innerHTML = reports.map(r => {
        const status = _effStatus(r);
        const rejectNote = _lastRejectNote(r);
        const canRevise = status === 'needs_revision';
        return `
        <div class="p-3 rounded-lg bg-white border border-gray-50">
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div class="flex items-center gap-2 min-w-0 flex-1">
              <span class="text-xs font-medium text-gray-700 truncate">${esc(r.title || '思想汇报')}</span>
              <span class="text-[11px] text-gray-400 flex-shrink-0">${_date(r.submittedAt)}</span>
            </div>
            ${_statusBadgeHtml(status)}
          </div>
          <p class="text-[12px] text-gray-600 whitespace-pre-wrap mt-1.5">${esc(r.content || '')}</p>
          ${rejectNote ? `<div class="mt-2 rounded-lg bg-red-50 border border-red-100 px-2 py-1.5 text-[11px] text-red-600 whitespace-pre-wrap">退回意见：${esc(rejectNote)}</div>` : ''}
          ${canRevise ? `
          <div class="mt-2 flex flex-col items-end gap-1.5">
            <button type="button" class="tr-rev-toggle text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors" data-tr-id="${r.id}" style="cursor:pointer;">修改并重新提交</button>
            <div class="tr-rev-box hidden w-full" data-tr-box="${r.id}">
              <textarea rows="4" class="input-flat w-full resize-none" placeholder="请根据退回意见补充完善后重新提交">${esc(r.content || '')}</textarea>
              <div class="flex items-center justify-between mt-1.5 gap-2">
                <p class="text-[11px] text-gray-400">重新提交后回到待初阅队列，由组织委员再次初阅</p>
                <div class="flex items-center gap-1.5 flex-shrink-0">
                  <button type="button" class="tr-rev-cancel text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors" data-tr-id="${r.id}" style="cursor:pointer;">取消</button>
                  <button type="button" class="tr-resubmit text-xs px-4 py-1.5 rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors" data-tr-id="${r.id}" style="cursor:pointer;">重新提交</button>
                </div>
              </div>
            </div>
          </div>` : ''}
        </div>`;
      }).join('');
    }

    // ── 提交新汇报（R6-2：入库 pending，组织初阅通过后才归档）──
    document.getElementById('tr-submit')?.addEventListener('click', () => {
      const content = document.getElementById('tr-content')?.value || '';
      if (!content.trim()) { showToast('warning', '请填写思想汇报内容'); return; }
      addThoughtReport({ personId, content });
      showToast('success', '思想汇报已提交，待组织初阅');
      render();
    });

    // ── 已退回·需补充：展开/收起 修改重交编辑区 ──
    tc.querySelectorAll('.tr-rev-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const box = tc.querySelector(`.tr-rev-box[data-tr-box="${btn.dataset.trId}"]`);
        if (!box) return;
        box.classList.toggle('hidden');
        btn.textContent = box.classList.contains('hidden') ? '修改并重新提交' : '收起';
      });
    });
    tc.querySelectorAll('.tr-rev-cancel').forEach(btn => {
      btn.addEventListener('click', () => {
        const box = tc.querySelector(`.tr-rev-box[data-tr-box="${btn.dataset.trId}"]`);
        if (!box) return;
        box.classList.add('hidden');
        const toggle = tc.querySelector(`.tr-rev-toggle[data-tr-id="${btn.dataset.trId}"]`);
        if (toggle) toggle.textContent = '修改并重新提交';
      });
    });

    // ── 修改并重新提交（仅本人 needs_revision 记录；失败透出服务层 reason）──
    tc.querySelectorAll('.tr-resubmit').forEach(btn => {
      btn.addEventListener('click', () => {
        const box = btn.closest('.tr-rev-box');
        const content = (box?.querySelector('textarea')?.value || '').trim();
        if (!content) { showToast('warning', '请填写修改后的思想汇报内容'); return; }
        const res = resubmitThoughtReport({ id: btn.dataset.trId, content, by: personId });
        if (!res || !res.ok) { showToast('error', (res && res.reason) || '重新提交失败，请稍后重试'); return; }
        showToast('success', '已重新提交，待组织初阅');
        render();
      });
    });
  }

  render();
}
