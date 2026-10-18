import { mockDB } from '../../core/domain/domain.js?v=20261018h';
import { PersonStore } from '../../services/member/person.js?v=20261018h';
import { getRosterStats } from '../../services/member/roster.js?v=20261018h';
import { buildBranchRosterTemplate, sanitizeBranchRoster } from '../../services/member/branch-roster-import.js?v=20261018h';
import { escHtml as esc, showToast, downloadBlob } from '../../core/base/utils.js?v=20261018h';

const drafts = new Map();

function actorId() {
  try {
    const raw = localStorage.getItem('gsm1921-login-user');
    if (!raw) return null;
    const actor = JSON.parse(raw);
    return actor.personId || actor.userId || actor.id || null;
  } catch (_) { return null; }
}

function stat(label, value, note) {
  return `<div class="border border-gray-200 bg-white p-3"><p class="text-xs text-gray-500">${esc(label)}</p><p class="mt-1 text-base font-semibold text-gray-900">${value}</p>${note ? `<p class="mt-1 text-xs text-gray-500">${esc(note)}</p>` : ''}</div>`;
}

function draftHtml(branchId) {
  const draft = drafts.get(branchId);
  if (!draft) return '';
  const s = draft.stats;
  const groups = Object.entries(s.perGroup || {}).map(([name, value]) =>
    `<span class="whitespace-nowrap">${esc(name)} <b>${value.expected}</b> <span class="text-xs text-gray-500">/ 在册 ${value.partyTotal}</span></span>`).join(' · ');
  return `<div class="mt-3 border border-gray-200 bg-white p-3">
    <div class="flex flex-wrap items-center justify-between gap-2"><h3 class="text-sm font-semibold">导入预览</h3><span class="text-xs text-gray-500">${esc(draft.fileName)} · 有效 ${draft.people.length} 条${draft.dropped ? ` · 忽略 ${draft.dropped} 条` : ''}</span></div>
    <div class="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
      ${stat('在册党员', `${s.partyTotal} 人`, `正式 ${s.official} + 预备 ${s.probationary}`)}
      ${stat('滞留党员', `${s.detained} 人`, '组织关系保留、通知照发')}
      ${stat('支部党员大会应到', `${s.expected} 人`, `党员 ${s.partyTotal} − 滞留 ${s.detained}`)}
      ${stat('各党小组会应到', groups || '—', '组内党员 − 组内滞留')}
    </div>
    <div class="mt-3 flex flex-wrap items-center justify-between gap-2"><p class="max-w-2xl text-xs text-gray-600">确认后整表写入本支部；导入前不会修改名册。</p><div class="flex gap-2"><button type="button" class="btn-outline px-3 py-1.5 text-xs" data-roster-action="discard">放弃</button><button type="button" class="btn-accent px-3 py-1.5 text-xs font-medium" data-roster-action="confirm">确认导入保存</button></div></div>
  </div>`;
}

function render(host, branchId, onChange) {
  const members = PersonStore.getMembers().filter((person) => person.branchId === branchId);
  if (members.length) {
    host.innerHTML = '<p class="border-y border-gray-200 py-3 text-sm text-gray-600">本支部已有成员。名册调整由本支部组织委员在成员名册中逐人办理。</p>';
    return;
  }
  host.innerHTML = `<details class="border-y border-gray-200 py-3">
    <summary class="cursor-pointer text-sm font-medium text-gray-800">空支部名册导入</summary>
    <div class="mt-3 space-y-3">
      <p class="max-w-3xl text-sm text-gray-600">仅空支部可以整表导入。先下载现有成员档案模板，保留要迁入的成员行并删除其他行；核对预览后一次保存。</p>
      <input type="file" accept=".json,application/json" class="hidden" data-roster-file aria-label="选择成员名册 JSON 文件">
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" class="btn-outline px-3 py-2 text-sm" data-roster-action="download">下载名册模板</button>
        <button type="button" class="btn-outline px-3 py-2 text-sm" data-roster-action="pick">选择名册文件</button>
        <span class="text-xs text-gray-500">${drafts.has(branchId) ? `已载入 ${esc(drafts.get(branchId).fileName)}` : '尚未选择文件'}</span>
      </div>
      ${draftHtml(branchId)}
    </div>
  </details>`;

  host.querySelector('[data-roster-action="download"]')?.addEventListener('click', () => {
    try {
      const template = buildBranchRosterTemplate();
      if (!template.people?.length) return showToast('info', '当前成员档案为空，无法生成名册模板');
      downloadBlob(`${branchId}-成员名册模板.json`, new Blob([JSON.stringify(template, null, 2)], { type: 'application/json;charset=utf-8' }));
      showToast('success', `已下载 ${template.people.length} 条成员档案模板`);
    } catch (error) {
      showToast('error', `下载失败：${error?.message || error}`);
    }
  });
  host.querySelector('[data-roster-action="pick"]')?.addEventListener('click', () => host.querySelector('[data-roster-file]')?.click());
  host.querySelector('[data-roster-file]')?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = () => showToast('error', '读取名册文件失败，请重试');
    reader.onload = () => {
      let data;
      try { data = JSON.parse(String(reader.result || '')); }
      catch (_) { return showToast('error', '名册文件不是有效的 JSON'); }
      const result = sanitizeBranchRoster(data);
      if (!result.valid) return showToast('error', result.reason || '名单净化未通过');
      drafts.set(branchId, { people: result.people, stats: result.stats, dropped: result.dropped, fileName: file.name });
      render(host, branchId);
      showToast('success', `已读取 ${result.people.length} 条有效成员，请核对预览后确认`);
    };
    reader.readAsText(file);
  });
  host.querySelector('[data-roster-action="discard"]')?.addEventListener('click', () => {
    drafts.delete(branchId);
    render(host, branchId, onChange);
  });

  host.querySelector('[data-roster-action="confirm"]')?.addEventListener('click', async () => {
    const draft = drafts.get(branchId);
    if (!draft?.people?.length) return;
    const branch = (mockDB.branches || []).find((item) => item.id === branchId);
    const label = branch?.config?.headerTitle || branch?.name || branchId;
    if (PersonStore.getMembers().some((person) => person.branchId === branchId)) {
      drafts.delete(branchId);
      showToast('error', '该支部已有成员，不能整表替换；请逐人维护名册');
      render(host, branchId, onChange);
      return;
    }
    const result = await PersonStore.replaceBranchMembers(draft.people, { branchId, by: actorId() });
    if (!result?.ok) return showToast('error', `导入未保存：${result?.reason || '未知原因'}`);
    const stats = getRosterStats({ branchId });
    drafts.delete(branchId);
    showToast('success', `已导入 ${result.count} 名成员到「${label}」；在册党员 ${stats.partyTotal} 人，应到 ${stats.expected} 人`);
    onChange?.();
  });
}

export function mountBranchRosterImport(host, { branchId, onChange } = {}) {
  if (!host || !branchId) return;
  render(host, branchId, onChange);
}
