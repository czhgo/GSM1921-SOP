// role: [工程师]+[AI]
// 党委工作台 Tab：支部配置（工作流模块配置回炉 v2，2026-09-03 书记裁定）
// 书记反馈：原书记工作台「工作台配置」定位不对 + UI 过重——配置属党委/部署期职责，
// 移出书记日常工作台，收拢到党委台；UI 减负：去掉双画布拖拽，仅保留分组开关 + 恢复默认。
// 数据不变：config.modules（业务 tab 启停/顺序，null=全开）与 config.blocks（活动产出块）；
// 写口 PATCH /branches/:id/config（party-staff / 本支部现任书记均可）。核心组（groupLabel=工作台）固定。

import { mockDB } from '../../../core/domain.js?v=20260903c';
import { getCapabilities } from '../../../core/registry.js?v=20260903c';
import { OUTPUT_BLOCK_DEFS } from '../../../core/constants.js?v=20260903c';
// 副作用：注册支委层工作台能力（配置目录=其 tab 清单，单一源；党委页默认未加载该能力）
import '../../../modules/capabilities/secretary-workspace.js?v=20260903c';
import { getBranchTabPolicy, getCoreTabIds, getBranchOutputBlocks, getOutputBlockPolicy, updateBranchModules } from '../../../services/branch.js?v=20260903c';
import { showToast } from '../../../core/utils.js?v=20260903c';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// 支部工作台的业务 tab 目录（支委层工作台 = secretary-workspace 能力；支部 profile 默认全开）
function _branchTabs() {
  const cap = getCapabilities({ scope: 'workspace:secretary' }).find(c => c.id === 'secretary-workspace');
  return cap && typeof cap.tabs === 'function' ? cap.tabs() : [];
}

export function renderContent(ctx) {
  const el = document.getElementById('party-committee-tab-content');
  if (!el) return;
  const branches = mockDB.branches || [];

  if (el.dataset.currentTab !== 'party-config') {
    el.innerHTML = `
      <div class="space-y-4">
        <div class="rounded-xl border border-gray-200 bg-white p-4">
          <p class="text-xs text-gray-400">党委侧 · 支部工作流配置（部署期/调整期使用，不在支部日常台出现）</p>
          <p class="font-title-cn text-base font-bold text-gray-800 mt-0.5">支部配置</p>
          <p class="text-xs text-gray-400 mt-0.5">选择支部 → 按需启停其业务模块与活动产出块（默认全开；核心待办/概况固定不可关）</p>
          <div class="mt-3 flex items-center gap-2">
            <label for="pc-branch-select" class="text-xs text-gray-500 shrink-0">目标支部</label>
            <select id="pc-branch-select" class="input-flat w-full max-w-xs">
              <option value="">— 请选择支部 —</option>
              ${branches.map(b => `<option value="${esc(b.id)}">${esc(b.name)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div id="pc-config-body" class="space-y-4"></div>
      </div>`;
    el.dataset.currentTab = 'party-config';
  }

  const body = el.querySelector('#pc-config-body');
  const sel = el.querySelector('#pc-branch-select');
  if (!sel || !body) return;
  // 容器级 change 委托：与 select 首次绑定时机解耦（tab 周期重绘/多入口渲染均可靠）
  if (!el.dataset.boundCfg) {
    el.dataset.boundCfg = '1';
    el.addEventListener('change', (e) => {
      if (e.target && e.target.id === 'pc-branch-select') {
        const v = e.target.value;
        if (v) { _renderBranchConfig(el, body, v); }
        else { body.dataset.branch = 'none'; body.innerHTML = ''; }
      }
    });
  }
  // 保持当前选择：重进/重绘时若已选支部则按需重建
  if (sel.value && body.dataset.branch !== sel.value) _renderBranchConfig(el, body, sel.value);
}

// 单支部配置渲染：业务模块开关（按组）+ 活动产出块开关（白卡，无画布拖拽）
function _renderBranchConfig(el, body, branchId) {
  const branch = (mockDB.branches || []).find(b => b.id === branchId);
  if (!branch) return;
  body.dataset.branch = branchId;

  const rawTabs = _branchTabs();
  const coreIds = new Set(getCoreTabIds(rawTabs));
  const coreTabs = rawTabs.filter(t => coreIds.has(t.id));
  const businessTabs = rawTabs.filter(t => !coreIds.has(t.id));

  // 编辑态
  const policy = getBranchTabPolicy(branchId);
  const hidden = new Set(policy.hidden);
  const order = policy.order || businessTabs.map(t => t.id);
  const bPolicy = getOutputBlockPolicy(getBranchOutputBlocks(branchId));
  const bHidden = new Set(bPolicy.hidden);

  const chip = (id, label, isOn, kind) =>
    `<button data-${kind}="${esc(id)}" class="text-xs px-3 py-1.5 rounded-lg border transition-all ${isOn ? '' : 'opacity-45'}" style="${isOn ? 'background:rgba(200,16,46,0.08);border-color:rgba(200,16,46,0.25);color:#C8102E;' : 'border:1px solid var(--neutral-200);color:var(--neutral-500);background:var(--neutral-100);'}">${esc(label)}</button>`;

  const groups = [];
  businessTabs.forEach(t => {
    let g = groups.find(x => x.label === t.groupLabel);
    if (!g) { g = { label: t.groupLabel, tabs: [] }; groups.push(g); }
    g.tabs.push(t);
  });

  body.innerHTML = `
    <div class="rounded-xl border border-gray-200 bg-white p-4">
      <p class="text-xs font-bold text-gray-700 mb-1">${esc(branch.name)}</p>
      <p class="text-[11px] text-gray-400 mb-3">配置立即对全支部生效（成员下次进入工作台可见）</p>
      <p class="text-xs font-bold text-gray-600 mb-2">业务模块</p>
      <div class="flex flex-wrap gap-2 mb-2">${coreTabs.map(t => `<span class="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-500">${esc(t.label)}<span class="text-[10px] text-gray-400">固定</span></span>`).join('')}</div>
      <div class="flex flex-wrap gap-2 mb-3">${businessTabs.map(t => chip(t.id, t.label, !hidden.has(t.id), 'pc-module')).join('')}</div>
      <p class="text-xs font-bold text-gray-600 mb-2">活动产出块 <span class="text-[10px] text-gray-400 font-normal">（活动详情「添加记录」按钮集）</span></p>
      <div class="flex flex-wrap gap-2 mb-3">${OUTPUT_BLOCK_DEFS.map(d => chip(d.id, d.label, !bHidden.has(d.id), 'pc-block')).join('')}</div>
      <div class="flex gap-2 justify-end pt-2 border-t border-gray-100">
        <button id="pc-reset" class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">恢复默认（全开）</button>
        <button id="pc-save" class="text-xs px-3 py-1.5 rounded-lg text-white font-medium transition-colors" style="background:#C8102E;">保存配置</button>
      </div>
    </div>`;

  // 绑定
  const on = (selId, fn) => { const b = body.querySelector(selId); if (b && !b.dataset.bound) { b.dataset.bound = '1'; b.addEventListener('click', fn); } };
  body.querySelectorAll('[data-pc-module]').forEach(btn => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      const id = btn.dataset.pcModule;
      if (hidden.has(id)) hidden.delete(id); else hidden.add(id);
      _paint(body, businessTabs, hidden, coreTabs, bHidden);
    });
  });
  body.querySelectorAll('[data-pc-block]').forEach(btn => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      const id = btn.dataset.pcBlock;
      if (bHidden.has(id)) bHidden.delete(id); else bHidden.add(id);
      _paint(body, businessTabs, hidden, coreTabs, bHidden);
    });
  });
  on('#pc-save', async () => {
    const blockPayload = { outputBlocks: { hiddenBlockIds: [...bHidden], blockOrder: [] } };
    await updateBranchModules(branchId, { hiddenTabIds: [...hidden], tabOrder: order }, rawTabs, blockPayload);
    showToast('已保存——该支部成员下次进入工作台/活动详情生效', 'success');
  });
  on('#pc-reset', async () => {
    await updateBranchModules(branchId, null, rawTabs, null);
    body.dataset.branch = '';
    _renderBranchConfig(el, body, branchId);
    showToast('已恢复默认（全开、注册顺序）', 'success');
  });
}

// 重绘 chips（仅更新开关按钮状态，不重建整卡以保住绑定）
function _paint(body, businessTabs, hidden, coreTabs, bHidden) {
  const refresh = (attr, isHidden) => {
    body.querySelectorAll(`[data-${attr}]`).forEach(btn => {
      const on = !isHidden(btn.dataset[attr]);
      btn.className = `text-xs px-3 py-1.5 rounded-lg border transition-all ${on ? '' : 'opacity-45'}`;
      btn.style.cssText = on ? 'background:rgba(200,16,46,0.08);border-color:rgba(200,16,46,0.25);color:#C8102E;' : 'border:1px solid var(--neutral-200);color:var(--neutral-500);background:var(--neutral-100);';
    });
  };
  refresh('pc-module', id => hidden.has(id));
  refresh('pc-block', id => bHidden.has(id));
}
