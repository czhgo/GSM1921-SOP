// role: [工程师]+[AI]
// 书记工作台 Tab：上报党委（P3 党委后台，2026-09-02）
// 支部侧发起点（双向通道支部半侧）：书记/副书记对本支部关键事项向院党委上报
//  （发展节点 develop-node / 活动报备 activity-report），党委批/驳结论在本页可见。
// 数据源：reviewRequests（services/review-request.js，mock 与 API 双引擎同源）
// 设计权威源：content/04_web_design/evolution/PARTY_COMMITTEE_DESIGN.md §5 P3

import { mockDB } from '../../../core/domain.js?v=20260909e';
import { AuthStore } from '../../../services/auth.js?v=20260909e';
import { getPersonName } from '../../../services/person.js?v=20260909e';
import { getBranchIdOfPerson } from '../../../services/branch.js?v=20260909e';
import { submitReviewRequest, listReviewRequests } from '../../../services/review-request.js?v=20260909e';
import { showToast, escHtml as esc, fmtDt } from '../../../core/utils.js?v=20260909e';

const TYPE_META = {
  'develop-node': { label: '发展节点', desc: '发展党员关键节点（确定积极分子/发展对象、接收预备党员、按期转正等）' },
  'activity-report': { label: '活动报备', desc: '重要活动/主题党日等需党委知悉的重大事项' },
};
const STATUS_META = {
  pending: { label: '待党委批复', cls: 'bg-amber-50 text-amber-600' },
  approved: { label: '已批准', cls: 'bg-green-50 text-green-600' },
  rejected: { label: '已驳回', cls: 'bg-gray-100 text-gray-500' },
};

// HTML 转义/日期格式化统一走 core/utils.js（escHtml/fmtDt，2026-09-03 去重收口）

export function renderContent() {
  const tc = document.getElementById('secretary-tab-content');
  if (!tc) return;
  const me = AuthStore.getCurrentUser();
  if (!me) return;
  const branchId = getBranchIdOfPerson(me.personId);

  if (tc.dataset.currentTab !== 'report-up') {
    tc.innerHTML = `
      <div class="space-y-4">
        <div class="rounded-lg border border-gray-200 bg-white p-4 flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="font-title-cn text-base font-bold text-gray-800">上报党委</p>
          </div>
          <button id="rq-submit-toggle" class="text-xs px-3 py-1.5 rounded-lg text-white font-medium shrink-0" style="background:#C8102E;">+ 发起上报</button>
        </div>
        <div id="rq-stats" class="grid grid-cols-3 gap-3"></div>
        <div id="rq-form-wrap" class="hidden rounded-lg border border-gray-200 bg-white p-4"></div>
        <div id="rq-list" class="space-y-3"></div>
      </div>`;
    tc.dataset.currentTab = 'report-up';
    tc.querySelector('#rq-submit-toggle')?.addEventListener('click', () => {
      tc.querySelector('#rq-form-wrap')?.classList.toggle('hidden');
      if (!tc.querySelector('#rq-form-wrap').classList.contains('hidden')) renderForm(branchId, me, tc);
    });
  }
  refreshStats(tc, branchId);
  renderList(tc, branchId);
}

/** 统计卡：待批复/已批准/已驳回 */
function refreshStats(tc, branchId) {
  const rows = listReviewRequests({ branchId });
  const n = s => rows.filter(r => r.status === s).length;
  const stats = tc.querySelector('#rq-stats');
  if (!stats) return;
  stats.innerHTML = [
    { v: n('pending'), l: '待党委批复', c: 'text-amber-600' },
    { v: n('approved'), l: '已批准', c: 'text-green-600' },
    { v: n('rejected'), l: '已驳回', c: 'text-gray-500' },
  ].map(x => `
    <div class="rounded-lg border border-gray-200 bg-white p-3 text-center">
      <p class="text-2xl font-bold ${x.c}">${x.v}</p>
      <p class="text-xs text-gray-400 mt-0.5">${x.l}</p>
    </div>`).join('');
}

/** 发起上报表单（toggle 展开时构建，重绘不覆盖正在填写的表单） */
function renderForm(branchId, me, tc) {
  const wrap = tc.querySelector('#rq-form-wrap');
  if (!wrap || wrap.dataset.built) return;
  wrap.dataset.built = '1';
  const typeOptions = Object.entries(TYPE_META).map(([k, m], i) => `
    <label data-rq-type-label="${k}" class="flex-1 min-w-0 cursor-pointer rounded-lg border p-3 transition-colors ${i === 0 ? 'border-red-300 bg-red-50/40' : 'border-gray-200'}">
      <input type="radio" name="rq-type" value="${k}" class="hidden" ${i === 0 ? 'checked' : ''} />
      <p class="text-sm font-medium text-gray-700">${m.label}</p>
      <p class="text-xs text-gray-400 mt-0.5 leading-5">${m.desc}</p>
    </label>`).join('');
  wrap.innerHTML = `
    <p class="font-title-cn text-sm font-bold text-gray-800 mb-3">发起上报</p>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">${typeOptions}</div>
    <div class="mb-3">
      <label class="text-xs text-gray-500 block mb-1">事项标题 <span class="text-red-500">*</span></label>
      <input id="rq-title" type="text" class="input-flat w-full" placeholder="如：关于接收王同学为预备党员的请示 / 关于赴香山开展主题党日的报备" />
    </div>
    <div class="mb-4">
      <label class="text-xs text-gray-500 block mb-1">事项说明（时间、对象、依据等）<span class="text-red-500">*</span></label>
      <textarea id="rq-content" rows="4" class="input-flat w-full resize-none" placeholder="请说明关键信息，便于党委审批"></textarea>
    </div>
    <div class="flex justify-end gap-2">
      <button id="rq-form-cancel" class="text-xs px-3 py-1.5 rounded-lg text-gray-500 border border-gray-200">取消</button>
      <button id="rq-form-submit" class="text-xs px-3 py-1.5 rounded-lg text-white font-medium" style="background:#C8102E;">提交上报</button>
    </div>`;
  wrap.querySelector('#rq-form-cancel')?.addEventListener('click', () => {
    wrap.classList.add('hidden');
    delete wrap.dataset.built;
  });
  // 类型切换：高亮所选 label（不依赖 has- 变体，兼容 CDN Tailwind）
  const markType = () => {
    wrap.querySelectorAll('[data-rq-type-label]').forEach(l => {
      const active = l.querySelector('input[name="rq-type"]:checked');
      l.classList.toggle('border-red-300', !!active);
      l.classList.toggle('bg-red-50/40', !!active);
      l.classList.toggle('border-gray-200', !active);
    });
  };
  wrap.querySelectorAll('input[name="rq-type"]').forEach(r => r.addEventListener('change', markType));
  wrap.querySelector('#rq-form-submit')?.addEventListener('click', async () => {
    const type = wrap.querySelector('input[name="rq-type"]:checked')?.value;
    const title = wrap.querySelector('#rq-title')?.value.trim();
    const content = wrap.querySelector('#rq-content')?.value.trim();
    if (!type || !title || !content) { showToast('请填写事项类型、标题与说明'); return; }
    await submitReviewRequest({ branchId, type, title, content, submittedBy: me.personId });
    showToast(`已提交：${TYPE_META[type].label}——等待党委批复`);
    wrap.classList.add('hidden');
    delete wrap.dataset.built;
    renderContent();
  });
}

/** 上报记录列表（每次重绘，取最新数据） */
function renderList(tc, branchId) {
  const list = tc.querySelector('#rq-list');
  if (!list) return;
  const rows = listReviewRequests({ branchId });
  if (!rows.length) {
    list.innerHTML = `
      <div class="rounded-lg border border-gray-200 bg-white p-6 text-center">
        <p class="text-sm text-gray-500">暂无上报记录</p>
        <p class="text-xs text-gray-400 mt-1">支部关键事项（发展节点/重要活动）上报后，党委批/驳结论将显示在这里</p>
      </div>`;
    return;
  }
  list.innerHTML = rows.map(r => {
    const t = TYPE_META[r.type] || { label: r.type || '上报' };
    const s = STATUS_META[r.status] || { label: r.status, cls: 'bg-gray-100 text-gray-500' };
    return `
      <div class="rounded-lg border border-gray-200 bg-white p-4">
        <div class="flex items-center gap-2 flex-wrap mb-1.5">
          <span class="text-xs px-2 py-0.5 rounded-full ${r.type === 'develop-node' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}">${t.label}</span>
          <span class="text-xs px-2 py-0.5 rounded-full ${s.cls}">${s.label}</span>
          <span class="text-xs text-gray-400 ml-auto">${esc(getPersonName(r.submittedBy) || r.submittedBy)} · ${fmtDt(r.createdAt)}</span>
        </div>
        <p class="text-sm font-medium text-gray-800">${esc(r.title)}</p>
        <p class="text-xs text-gray-500 mt-1 leading-5 whitespace-pre-wrap">${esc(r.content)}</p>
        ${r.status !== 'pending' ? `
        <div class="mt-2.5 rounded-lg bg-gray-50 p-2.5">
          <p class="text-xs text-gray-500 leading-5">
            <span class="font-medium ${r.status === 'approved' ? 'text-green-600' : 'text-gray-600'}">党委${r.status === 'approved' ? '批准' : '驳回'}</span>
            · ${esc(getPersonName(r.decidedBy) || r.decidedBy || '党委')} · ${fmtDt(r.decidedAt)}
            ${r.decisionNote ? `<br/>${esc(r.decisionNote)}` : ''}
          </p>
        </div>` : ''}
      </div>`;
  }).join('');
}
