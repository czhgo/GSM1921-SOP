// Party committee branch directory: create and select; maintenance is in branch-config.html.

import { mockDB } from '../../../core/domain/domain.js?v=20261018a';
// 数据域接线收口（2026-09-03）：支部成员名单经 services/member/person.js 获取（原直连 mock PEOPLE）；
// 每次渲染现读（members 覆盖层即时吃到），不缓存在模块顶层
import { PersonStore } from '../../../services/member/person.js?v=20261018a';
import { createBranch, getCommitteeName } from '../../../services/branch/branch.js?v=20261018a';
import { getRosterStats } from '../../../services/member/roster.js?v=20261018a';
import { showToast, escHtml as esc, getBasePath } from '../../../core/base/utils.js?v=20261018a';
import { bindBranchReadOnlyButtons } from '../../../services/core/branch-readonly-nav.js?v=20261018a';

export async function renderContent() {
  const el = document.getElementById('party-committee-tab-content');
  if (!el) return;
  el.dataset.currentTab = 'branches'; // 跨 tab 共享容器约定（同 today/group-progress/insight-view 体例）：登记当前 tab，防 party-config 守卫读到陈旧标记而残留
  const apiMode = document.documentElement.dataset.dataSource === 'api';
  const selectedBranchId = new URLSearchParams(window.location.search).get('branchId') || '';
  const summaryOnly = apiMode && !selectedBranchId;
  const allBranches = mockDB.branches || [];
  const branches = apiMode && selectedBranchId
    ? allBranches.filter((branch) => branch.id === selectedBranchId)
    : allBranches;
  const members = PersonStore.getMembers(); // 现读档案（种子 + members 覆盖层），导入落库后即时吃到

  el.innerHTML = `
    <div class="party-page party-page--wide">
      <header class="party-page__header">
        <div>
          <p class="text-xs font-medium text-gray-500">党委 · 全院范围</p>
          <h2 class="mt-1 font-title-cn text-xl font-bold text-gray-900">支部管理</h2>
          <p class="mt-1 text-sm text-gray-600">先从目录选择支部；详细配置和组织维护在支部上下文中完成。</p>
        </div>
        <button id="branch-add-toggle" type="button" class="btn-accent px-3 py-2 text-sm font-medium">新建支部</button>
      </header>
      <section id="branch-form-wrap" class="card p-5 hidden" aria-label="新建支部">
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div><label class="mb-1 block text-xs text-gray-600" for="branch-name-input">支部名称</label><input id="branch-name-input" type="text" class="input-flat w-full" placeholder="支部全称" /></div>
          <div><label class="mb-1 block text-xs text-gray-600" for="branch-type-input">类型（可选）</label><input id="branch-type-input" type="text" class="input-flat w-full" placeholder="如本科生、硕士生" /></div>
        </div>
        <div class="mt-3 flex justify-end gap-2"><button id="branch-form-cancel" type="button" class="btn-outline px-3 py-2 text-sm">取消</button><button id="branch-form-submit" type="button" class="btn-accent px-3 py-2 text-sm font-medium">创建支部</button></div>
      </section>
      <section class="card p-5" aria-label="支部目录">
      ${branches.length ? `<div class="pc-table-scroll pc-table-scroll--branches"><table class="data-table">
        <caption class="visually-hidden">支部目录：按支部比较运行状态、在册人数和维护入口</caption>
        <thead><tr><th scope="col">支部</th><th scope="col">状态</th><th scope="col">成员</th><th scope="col">在册党员</th><th scope="col">组织提醒</th><th scope="col">操作</th></tr></thead><tbody>
        ${branches.map((b) => {
          const bid = b.id;
          const isActive = (b.status || 'active') === 'active';
          const configureUrl = `${getBasePath()}branch-config.html?branchId=${encodeURIComponent(bid)}`;
          const summary = b.summary || {};
          const inBranch = summaryOnly ? null : members.filter((person) => person.branchId === bid);
          const memberCount = summaryOnly ? (summary.memberCount ?? '—') : inBranch.length;
          const partyCount = summaryOnly ? (summary.partyMemberCount ?? '—') : getRosterStats({ branchId: bid }).partyTotal;
          return `<tr data-branch-card="${esc(bid)}">
            <td><div class="font-semibold text-gray-900">${esc(b.config?.headerTitle || b.name)}</div><div class="mt-0.5 text-xs text-gray-500">${esc(b.type || '支部')}</div></td>
            <td><span class="text-sm ${isActive ? 'text-green-700' : 'text-gray-500'}">${isActive ? '运行中' : '已停用'}</span></td>
            <td class="tabular-nums">${memberCount}${memberCount === '—' ? '' : ' 人'}</td><td class="tabular-nums">${partyCount}${partyCount === '—' ? '' : ' 人'}</td>
            <td>${!summaryOnly && !b.secretaryId ? '<span class="text-sm text-amber-800">待任命支书</span>' : '<span class="text-sm text-gray-500">—</span>'}</td>
            <td><div class="flex flex-wrap gap-2"><a class="btn-outline inline-flex whitespace-nowrap px-3 py-2 text-sm" href="${configureUrl}">支部设置</a><button type="button" class="btn-outline branch-readonly-enter whitespace-nowrap px-3 py-2 text-sm" data-branch-id="${esc(bid)}">查看该支部</button></div></td>
          </tr>`;
        }).join('')}
        </tbody></table></div>` : `<p class="py-8 text-sm text-gray-600" role="status">尚无支部。创建支部后，再进入其配置页完成组织设置。</p>`}
        <p class="mt-4 text-sm text-gray-600">${esc(getCommitteeName())} · ${branches.length} 个支部</p>
      </section>
    </div>`;

  // 新建表单开关
  const toggle = el.querySelector('#branch-add-toggle');
  const formWrap = el.querySelector('#branch-form-wrap');
  toggle?.addEventListener('click', () => formWrap?.classList.toggle('hidden'));
  el.querySelector('#branch-form-cancel')?.addEventListener('click', () => formWrap?.classList.add('hidden'));

  // 创建支部（立项⑤ 阶段A：写口升级为 createBranch 空模板双形态——建出的支部为空：
  // config 默认全开、业务域为空、席位空缺待任命；返回 { ok, branch?, reason? }）
  el.querySelector('#branch-form-submit')?.addEventListener('click', async () => {
    const name = el.querySelector('#branch-name-input')?.value.trim();
    const type = el.querySelector('#branch-type-input')?.value.trim();
    if (!name) { showToast('error', '请填写支部名称'); return; }
    const res = await createBranch({ name, type });
    if (!res || !res.ok) {
      showToast('error', `创建失败：${(res && res.reason) || '未知原因'}`);
      return;
    }
    showToast('success', `支部「${name}」已创建。请从目录进入支部设置，继续补充组织信息和成员名册。`);
    renderContent();
  });

  // 从目录打开独立党委只读支部视图；支书工作台不再承担跨角色下钻。
  bindBranchReadOnlyButtons(el);
}
