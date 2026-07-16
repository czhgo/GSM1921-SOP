// role: [工程师]+[AI]
// issue-form.js — Issue 新建表单

import { IssueStore } from '../services/issues.js';
import { AuthStore } from '../services/auth.js';
import { showToast } from '../core/utils.js';
import { icon } from '../core/icons.js';

const SCOPE_OPTIONS = [
  { value: 'permanent', label: '底层架构与原则建议' },
  { value: 'global', label: '全局通用业务规则' },
  { value: 'role', label: '支委分工与权责调整' },
  { value: 'scenario', label: '特定业务场景专用' },
];

const TYPE_OPTIONS = [
  { value: 'bug', label: 'bug — 现有规则有缺陷', color: '#DC2626' },
  { value: 'enhancement', label: 'enhancement — 现有规则可优化', color: '#059669' },
  { value: 'proposal', label: 'proposal — 新规则提议', color: '#3B82F6' },
  { value: 'question', label: 'question — 规则疑问澄清', color: '#D97706' },
];

/** 获取当前登录用户 personId（plan 中为 AuthStore.getCurrentPersonId，修正为实际 API） */
function _currentPersonId() {
  return AuthStore.getCurrentUser()?.personId || '匿名';
}

export function renderIssueForm() {
  const container = document.getElementById('issue-form-container');
  if (!container) return;

  container.innerHTML = `
    <div class="mb-4">
      <a href="./feedback.html" class="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
        ${icon('chevronLeft', { size: 0, className: 'w-3 h-3' })} 返回列表
      </a>
    </div>

    <div class="card rounded-2xl p-6">
      <h2 class="font-title-cn text-lg font-bold text-gray-800 mb-4">新建 issue</h2>

      <div class="space-y-4">
        <div>
          <label class="text-xs text-gray-600 mb-1 block">标题 <span class="text-red-500">*</span></label>
          <input type="text" id="form-title" class="input-flat w-full text-sm rounded-lg p-2" placeholder="一句话说清 issue 的核心">
        </div>

        <div>
          <label class="text-xs text-gray-600 mb-1 block">正文 <span class="text-red-500">*</span></label>
          <textarea id="form-body" rows="6" class="input-flat w-full text-sm rounded-lg p-2" placeholder="详细描述：背景/痛点/期望/参考资料"></textarea>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-gray-600 mb-1 block">scope（单选）<span class="text-red-500">*</span></label>
            <select id="form-scope" class="input-flat w-full text-sm rounded-lg p-2">
              ${SCOPE_OPTIONS.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
            </select>
          </div>

          <div>
            <label class="text-xs text-gray-600 mb-1 block">type（多选）<span class="text-red-500">*</span></label>
            <div class="space-y-1">
              ${TYPE_OPTIONS.map(t => `
                <label class="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" name="form-type" value="${t.value}" class="rounded">
                  <span class="px-1.5 py-0.5 rounded-full font-medium" style="background:${t.color}15;color:${t.color}">${t.label}</span>
                </label>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <a href="./feedback.html" class="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">取消</a>
          <button id="btn-submit-issue" class="px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors">提交 issue</button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('btn-submit-issue')?.addEventListener('click', () => {
    const title = document.getElementById('form-title')?.value.trim();
    const body = document.getElementById('form-body')?.value.trim();
    const scope = document.getElementById('form-scope')?.value;
    const types = Array.from(document.querySelectorAll('input[name="form-type"]:checked')).map(cb => cb.value);

    if (!title) { showToast('error', '请输入标题'); return; }
    if (!body) { showToast('error', '请输入正文'); return; }
    if (!scope) { showToast('error', '请选择 scope'); return; }
    if (types.length === 0) { showToast('error', '请至少选择一个 type'); return; }

    const author = _currentPersonId();

    // 添加草稿（书记审核后真正合并）
    IssueStore.addDraft({
      type: 'new-issue',
      payload: {
        title, body, scope, types,
        submittedBy: author,
        submittedAt: new Date().toISOString().slice(0, 10),
      },
    });

    showToast('success', 'Issue 已提交，等待书记审核后公开');
    window.location.href = './feedback.html';
  });
}
