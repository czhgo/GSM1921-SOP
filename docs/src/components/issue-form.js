// role: [工程师]+[AI]
// issue-form.js — 反馈新建表单

import { IssueStore } from '../services/issues.js?v=20260919i';
import { showToast } from '../core/utils.js?v=20260919i';
import { icon } from '../core/icons.js?v=20260919i';
import { badgeHtml } from './badges.js?v=20260919i';

const SCOPE_OPTIONS = [
  { value: 'permanent', label: '底层架构' },
  { value: 'global', label: '全局通用' },
  { value: 'role', label: '权责调整' },
  { value: 'scenario', label: '特定场景' },
];

const TYPE_OPTIONS = [
  { value: 'bug', label: '缺陷', color: '#CE1126', darkColor: '#F87171' },
  { value: 'enhancement', label: '增强', color: '#A16207', darkColor: '#FBBF24' },
  { value: 'proposal', label: '提案', color: '#2563EB', darkColor: '#60A5FA' },
  { value: 'question', label: '疑问', color: '#6B7280', darkColor: '#94A3B8' },
];

/** 渲染新建反馈表单（默认匿名；提交经 IssueStore.submitIssue 走双形态对外匿名写口——后台记真实提交人 `_realPersonId`，一切常规读出口脱敏） */
export function renderIssueForm() {
  const container = document.getElementById('issue-form-container');
  if (!container) return;

  container.innerHTML = `
    <div class="mb-4">
      <a href="./feedback.html" class="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
        ${icon('chevronLeft', { className: 'w-3 h-3' })} 返回列表
      </a>
    </div>

    <div class="card rounded-xl p-6">
      <h2 class="font-title-cn text-lg font-bold text-gray-800 mb-4">新建反馈</h2>

      <div class="space-y-4">
        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">标题 <span class="text-red-600">*</span></label>
          <input type="text" id="form-title" class="input-flat w-full font-sans" placeholder="一句话说清反馈的核心">
        </div>

        <div>
          <label class="text-xs text-gray-500 mb-1.5 block font-medium">正文 <span class="text-red-600">*</span></label>
          <textarea id="form-body" rows="6" class="input-flat w-full font-sans" placeholder="详细描述：背景/痛点/期望/参考资料"></textarea>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-gray-500 mb-1.5 block font-medium">范围（单选）<span class="text-red-600">*</span></label>
            <select id="form-scope" class="input-flat w-full font-sans">
              ${SCOPE_OPTIONS.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
            </select>
          </div>

          <div>
            <label class="text-xs text-gray-500 mb-1.5 block font-medium">类型（多选）<span class="text-red-600">*</span></label>
            <div class="space-y-1">
              ${TYPE_OPTIONS.map(t => `
                <label class="flex items-center gap-2 text-xs cursor-pointer font-sans">
                  <input type="checkbox" name="form-type" value="${t.value}" class="rounded">
                  <span class="badge" style="background:${t.color}15;color:color-mix(in srgb, ${t.color} 60%, #000);--acc-bg-dark:${t.darkColor}24;--acc-text-dark:${t.darkColor}">${t.label}</span>
                </label>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between gap-2 pt-3 border-t border-gray-100">
          <label class="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer font-sans select-none" title="勾选后以「匿名」公开——列表与详情一律显示匿名；真实提交人仅党委在必要时可查，且每次查看都会留痕">
            <input type="checkbox" id="form-anon" class="checkbox-accent" checked>
            匿名提交
          </label>
          <div class="flex gap-2">
            <a href="./feedback.html" class="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-sans">取消</a>
            <button id="btn-submit-issue" class="btn-accent text-sm px-4 py-[7px] font-sans">提交反馈</button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-submit-issue')?.addEventListener('click', async () => {
    const title = document.getElementById('form-title')?.value.trim();
    const body = document.getElementById('form-body')?.value.trim();
    const scope = document.getElementById('form-scope')?.value;
    const types = Array.from(document.querySelectorAll('input[name="form-type"]:checked')).map(cb => cb.value);

    if (!title) { showToast('error', '请输入标题'); return; }
    if (!body) { showToast('error', '请输入正文'); return; }
    if (!scope) { showToast('error', '请选择范围'); return; }
    if (types.length === 0) { showToast('error', '请至少选择一个类型'); return; }

    const anon = document.getElementById('form-anon')?.checked ?? true;

    // 对外匿名（后台记真身）：匿名时对外出口一律脱敏（支部内部含支书不可见），但库里留真实提交人
    // `_realPersonId`——真实提交人仅党委在必要时可查、每次查看留痕；实名按现口径记真实 personId
    try {
      await IssueStore.submitIssue({ title, body, scope, types, anonymous: anon });
    } catch (e) {
      showToast('error', '提交失败：' + (e?.message || '网络错误'));
      return;
    }

    showToast('success', anon ? '已匿名提交，待支书审核通过后公开' : '反馈已提交为草稿，待支书审核通过后公开');
    window.location.href = './feedback.html';
  });
}
