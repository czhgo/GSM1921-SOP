// role: [工程师]+[AI]
// 参与者工作台 Tab：我的思想汇报（2026-08-30 书记决策启动数字化）
// 党员/发展对象在系统内提交思想汇报 → 算法自动归档归集至个人档案（无人工归档环节）
// 本人可查看自己的历史提交；组织委员在「发展数据」tab 调用查看。

import { AuthStore } from '../../../services/auth.js?v=20260901r';
import { addThoughtReport, listThoughtReportsByPerson } from '../../../services/thought-report.js?v=20260901r';
import { showToast } from '../../../core/utils.js?v=20260901r';

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
        <p class="text-xs text-gray-400 mt-0.5">已提交 ${reports.length} 篇 · 提交即入库归档，无需其他操作</p>
      </div>
      <div class="mb-3 p-3 rounded-lg bg-white border border-gray-100">
        <p class="text-xs font-medium text-gray-600 mb-2">提交思想汇报</p>
        <textarea id="tr-content" rows="5" class="w-full text-sm p-2.5 rounded-lg border border-gray-200 focus:outline-none focus:border-sky-300" placeholder="请书写本季度思想汇报（字数 1500 字以上；对积极分子不作硬性要求）"></textarea>
        <div class="flex items-center justify-between mt-2">
          <p class="text-[11px] text-gray-400">提交后系统自动归档至个人档案，供组织委员考察调用</p>
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
      listEl.innerHTML = reports.map(r => `
        <div class="p-3 rounded-lg bg-white">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-xs font-medium text-gray-600">${r.title || '思想汇报'}</span>
            <span class="text-[11px] text-gray-400">${(r.submittedAt || '').slice(0, 10)}</span>
          </div>
          <p class="text-[12px] text-gray-600 whitespace-pre-wrap">${r.content || ''}</p>
        </div>`).join('');
    }

    document.getElementById('tr-submit')?.addEventListener('click', () => {
      const content = document.getElementById('tr-content')?.value || '';
      if (!content.trim()) { showToast('warning', '请填写思想汇报内容'); return; }
      addThoughtReport({ personId, content });
      showToast('success', '思想汇报已提交，系统已自动归档');
      render();
    });
  }

  render();
}
