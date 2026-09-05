// role: [工程师]+[AI]
// components/workforce-duty-card.js — 支部安排·我的分工（L4 M2 生效消费端，2026-09-05）
// 常驻履职卡：读 config.workforce 快照（getBranchWorkforce 实时），列出当前用户
// （角色位 role 命中 / 到人位 personId 命中）名下负责的工作模块。
// 行内「去履职」= 切到本工作台对应 tab（映射见 DUTY_TAB，tab id 须真实存在于该台能力清单；
// 缺映射/被支部配置隐藏的模块仅展示，不硬跳）。
import { AuthStore } from '../services/auth.js?v=20260903c';
import { getBranchIdOfPerson, getBranchWorkforce } from '../services/branch.js?v=20260903c';
import { WORK_MAP_MODULES } from '../core/work-map.js?v=20260903c';
import { escHtml as esc } from '../core/utils.js?v=20260903c';

/** 模块 → 各工作台 tab 跳转（key = 页面 prefix：secretary/org/prop/disc/leader/visitor） */
const DUTY_TAB = {
  secretary: { 'three-meetings': 'calendar', 'theme-party': 'calendar', 'joint-event': 'calendar' },
  org: { taskforce: 'taskforce', 'develop-party-member': 'development', 'democratic-review': 'talent' },
  disc: { taskforce: 'tf-view', 'attendance-inspection': 'attendance', 'feedback-handling': 'mailbox' },
  prop: { 'info-platform': 'tasks', 'theme-party': 'kanban' },
  leader: { 'three-meetings': 'write', 'theme-party': 'write', taskforce: 'tf-view', 'attendance-inspection': 'attendance' },
  visitor: { 'three-meetings': 'activities', 'theme-party': 'activities', taskforce: 'projects' },
};

// 事件委托：点击 .wfd-duty（仅一次挂载，模块首次 import 时生效；node 环境无 document 跳过）
let _bound = false;
function _bind() {
  if (_bound || typeof document === 'undefined') return;
  _bound = true;
  document.addEventListener('click', (e) => {
    const btn = e.target && e.target.closest ? e.target.closest('.wfd-duty[data-tab]') : null;
    if (!btn || btn.hasAttribute('disabled')) return;
    const prefix = btn.getAttribute('data-prefix');
    const tab = btn.getAttribute('data-tab');
    if (!prefix || !tab) return;
    const tabBtn = document.querySelector(`[data-${prefix}-tab="${tab}"]`);
    if (tabBtn) tabBtn.click(); // 点击既有 tab 按钮，走原 tab-bar 绑定（含激活/记忆/渲染）
  });
}
_bind();

/**
 * 生成履职卡 HTML（无本人分工或非登录态返回空串；卡片仅在有分工时出现）
 * @param {'secretary'|'org'|'prop'|'disc'|'leader'|'visitor'} prefix 当前工作台页面前缀
 * @returns {string}
 */
export function dutyCardHtml(prefix) {
  const me = AuthStore.getCurrentUser && AuthStore.getCurrentUser();
  const personId = me && (me.personId || me.id);
  if (!personId) return '';
  const role = me.role;
  const branchId = getBranchIdOfPerson(personId);
  if (!branchId) return '';
  const wf = getBranchWorkforce(branchId);
  const landing = DUTY_TAB[prefix] || {};
  const items = WORK_MAP_MODULES.filter((m) => {
    const a = wf[m.id];
    return a && ((a.ownerType === 'role' && a.ownerId === role) || (a.ownerType === 'person' && a.ownerId === personId));
  });
  if (items.length === 0) return '';

  const chips = items.map((m) => {
    const tab = landing[m.id] || '';
    const sub = m.sub && m.sub.length ? `<span class="text-[10px] text-gray-400">（${esc(m.sub.join('·'))}）</span>` : '';
    return tab
      ? `<button type="button" class="wfd-duty inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-white border border-gray-200 text-gray-700 hover:border-red-300 hover:text-red-700" data-prefix="${esc(prefix)}" data-tab="${esc(tab)}" title="去履职">${esc(m.name)}${sub} · 去履职</button>`
      : `<span class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-neutral-50 border border-gray-100 text-gray-500" title="对应工作页入口待建">${esc(m.name)}${sub}</span>`;
  }).join('');

  return `
    <div class="card rounded-xl p-3.5">
      <div class="flex items-center gap-2 mb-2">
        <p class="font-title-cn text-sm font-bold text-gray-800">支部安排 · 我的分工</p>
        <span class="text-[11px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">经支委会议题生效</span>
      </div>
      <div class="flex flex-wrap gap-1.5">${chips}</div>
    </div>`;
}
