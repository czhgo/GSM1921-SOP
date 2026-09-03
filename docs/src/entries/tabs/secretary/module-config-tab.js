// role: [工程师]+[AI]
// 书记工作台 Tab：工作台配置（L2 支部工作流模块，2026-09-03 书记裁定）
// 支部自治：按本支部实际工作流，现任书记本人启停/排序业务模块（清单 chips + 画布 v0 拖拽，并用）。
// 核心组（待办/全局概况/本页）固定不可关；config.modules = { hiddenTabIds, tabOrder }，null=全开。
// 服务端权限：PATCH /branches/:id/config 仅本支部现任书记或党委组织员（副书记只读）。
// 设计权威源：content/04_web_design/evolution/PARTY_COMMITTEE_DESIGN.md §2.5 + ARCHITECTURE_EVOLUTION.md §八

import { AuthStore } from '../../../services/auth.js?v=20260903b';
import { getBranchById, getBranchIdOfPerson, getBranchTabPolicy, getBranchOutputBlocks, getCoreTabIds, getOutputBlockPolicy, updateBranchModules } from '../../../services/branch.js?v=20260903b';
import { getCapabilities } from '../../../core/registry.js?v=20260903b';
import { OUTPUT_BLOCK_DEFS } from '../../../core/constants.js?v=20260903b';
import { showToast } from '../../../core/utils.js?v=20260903b';

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// 本工作台全部 tab（含业务 tab 分组元数据）——模块级缓存避免反复 listCapabilities
function _allTabs() {
  const cap = getCapabilities({ scope: 'workspace:secretary' }).find(c => c.id === 'secretary-workspace');
  return cap && typeof cap.tabs === 'function' ? cap.tabs() : [];
}

export function renderContent(ctx) {
  const tc = document.getElementById('secretary-tab-content');
  if (!tc) return;
  const me = AuthStore.getCurrentUser();
  if (!me) return;

  const branchId = getBranchIdOfPerson(me.personId);
  const branch = getBranchById(branchId);
  if (!branch) return;
  const isSecretary = branch.secretaryId === me.personId; // 现任书记可改；副书记只读

  const rawTabs = _allTabs();
  const coreIds = new Set(getCoreTabIds(rawTabs));
  const policy = getBranchTabPolicy(branchId);
  const coreTabs = rawTabs.filter(t => coreIds.has(t.id));
  const businessTabs = rawTabs.filter(t => !coreIds.has(t.id));

  // 本地编辑态（每次进入重置为服务端最新）
  const hidden = new Set(policy.hidden);
  const isHidden = (id) => hidden.has(id);
  // order：显式配置用 tabOrder；否则=业务 tab 注册顺序
  const regOrder = businessTabs.map(t => t.id);
  let order = policy.order || regOrder;
  order = [...order.filter(id => businessTabs.some(t => t.id === id)), ...regOrder.filter(id => !order.includes(id))];

  // 活动产出块编辑态（块画布 v0，2026-09-03）
  const bPolicy = getOutputBlockPolicy(getBranchOutputBlocks(branchId));
  const bHidden = new Set(bPolicy.hidden);
  const bIsHidden = (id) => bHidden.has(id);
  const bReg = OUTPUT_BLOCK_DEFS.map(d => d.id);
  let bOrder = bPolicy.order || bReg;
  bOrder = [...bOrder.filter(id => bReg.includes(id)), ...bReg.filter(id => !bOrder.includes(id))];

  if (tc.dataset.currentTab !== 'module-config') {
    tc.innerHTML = `
      <div class="space-y-4">
        <div class="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs text-gray-400">支部自治 · 工作流模块配置</p>
            <p class="font-title-cn text-base font-bold text-gray-800 mt-0.5">工作台配置</p>
            <p class="text-xs text-gray-400 mt-0.5">按本支部实际工作流启停业务模块、拖拽调整顺序——${esc(branch.name)}${isSecretary ? '' : '（仅现任书记可修改，当前只读）'}</p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button id="mc-reset" class="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors ${isSecretary ? '' : 'opacity-40 cursor-not-allowed'}" ${isSecretary ? '' : 'disabled'}>恢复默认</button>
            <button id="mc-save" class="text-xs px-3 py-1.5 rounded-lg text-white font-medium transition-colors" style="${solidAccent(ctx)};" ${isSecretary ? '' : 'disabled'}>保存配置</button>
          </div>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-4">
          <p class="text-xs font-bold text-gray-600 mb-2">固定模块（全员必见，不可关闭）</p>
          <div class="flex flex-wrap gap-2">${coreTabs.map(t => `<span class="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-500">${esc(t.label)}<span class="text-[10px] text-gray-400">固定</span></span>`).join('')}</div>
        </div>
        <div class="rounded-xl border border-gray-200 bg-white p-4">
          <p class="text-xs font-bold text-gray-600 mb-1">活动产出块 <span class="text-[10px] text-gray-400 font-normal">（活动详情「添加记录」按钮集 · 块画布 v0）</span></p>
          <p class="text-[11px] text-gray-400 mb-3">按本支部工作流启停/排序——活动详情只出现启用的产出按钮</p>
          <div id="mc-blocks-chips" class="flex flex-wrap gap-2 mb-3"></div>
          <p class="text-[11px] text-gray-400 mb-1.5">启用顺序（拖拽调整）</p>
          <div id="mc-blocks-canvas" class="space-y-1.5"></div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="rounded-xl border border-gray-200 bg-white p-4">
            <p class="text-xs font-bold text-gray-600 mb-2">业务模块清单（点选开/关）</p>
            <div id="mc-chips" class="space-y-3"></div>
          </div>
          <div class="rounded-xl border border-gray-200 bg-white p-4">
            <p class="text-xs font-bold text-gray-600 mb-1">工作流顺序画布 <span class="text-[10px] text-gray-400 font-normal">（拖拽调整启用模块顺序）</span></p>
            <p id="mc-canvas-hint" class="text-[11px] text-gray-400 mb-2">拖起行右侧把手 ⇅ 上下移动；停用的模块不在此列</p>
            <div id="mc-canvas" class="space-y-1.5"></div>
          </div>
        </div>
        <div id="mc-off" class="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 p-4">
          <p class="text-xs font-bold text-gray-500 mb-2">已停用模块（点击恢复启用）</p>
          <div id="mc-off-chips" class="flex flex-wrap gap-2"></div>
        </div>
      </div>`;
    tc.dataset.currentTab = 'module-config';
  }

  // —— 分组渲染业务 chips ——
  const renderChips = () => {
    const chipsEl = tc.querySelector('#mc-chips');
    if (!chipsEl) return;
    const groups = [];
    businessTabs.forEach(t => {
      let g = groups.find(x => x.label === t.groupLabel);
      if (!g) { g = { label: t.groupLabel, tabs: [] }; groups.push(g); }
      g.tabs.push(t);
    });
    chipsEl.innerHTML = groups.map(g => `
      <div>
        <p class="text-[11px] text-gray-400 mb-1.5">${esc(g.label)}</p>
        <div class="flex flex-wrap gap-2">
          ${g.tabs.map(t => {
            const on = !isHidden(t.id);
            return `<button data-mc-chip="${esc(t.id)}" class="text-xs px-3 py-1.5 rounded-lg border transition-all ${on ? '' : 'opacity-45'}" style="${on ? `background:${ctx?.accentRgba || 'rgba(206,17,38,0.08)'};border-color:${ctx?.accentBorder || 'rgba(206,17,38,0.25)'};color:${ctx?.accent || '#CE1126'};` : 'border-gray-200;color:var(--neutral-500);background:var(--neutral-100);'}">${esc(t.label)}</button>`;
          }).join('')}
        </div>
      </div>`).join('');
  };

  // —— 画布 v0（启用业务模块拖拽排序）——
  const renderCanvas = () => {
    const cv = tc.querySelector('#mc-canvas');
    if (!cv) return;
    const list = order.filter(id => !hidden.has(id));
    cv.innerHTML = list.length ? list.map((id, i) => {
      const t = businessTabs.find(x => x.id === id);
      if (!t) return '';
      return `<div data-mc-slot="${esc(id)}" data-idx="${i}" draggable="true" class="mc-drag-row flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 cursor-grab active:cursor-grabbing">
        <span class="w-5 h-5 flex items-center justify-center rounded-md text-[11px] font-semibold" style="background:${ctx?.accentRgba || 'rgba(206,17,38,0.08)'};color:${ctx?.accent || '#CE1126'};">${i + 1}</span>
        <span class="text-xs font-medium text-gray-700 flex-1 min-w-0">${esc(t.label)}</span>
        <span class="text-[10px] text-gray-400">${esc(t.groupLabel)}</span>
      </div>`;
    }).join('') : '<p class="text-xs text-gray-400 text-center py-4">全部业务模块已停用——工作台只保留固定模块</p>';
  };

  const renderOff = () => {
    const off = tc.querySelector('#mc-off-chips');
    if (!off) return;
    const offList = businessTabs.filter(t => isHidden(t.id));
    off.innerHTML = offList.length ? offList.map(t => `<button data-mc-off="${esc(t.id)}" class="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 transition-colors">+ ${esc(t.label)}</button>`).join('')
      : '<p class="text-xs text-gray-400">无——全部业务模块启用中</p>';
  };

  // —— 活动产出块（块画布 v0，2026-09-03）：chips 启停 + 画布拖拽排序 ——
  const renderBlockChips = () => {
    const el = tc.querySelector('#mc-blocks-chips');
    if (!el) return;
    el.innerHTML = OUTPUT_BLOCK_DEFS.map(d => {
      const on = !bHidden.has(d.id);
      return `<button data-mc-block="${esc(d.id)}" title="${esc(d.desc)}" class="text-xs px-3 py-1.5 rounded-lg border transition-all ${on ? '' : 'opacity-45'}" style="${on ? `background:${ctx?.accentRgba || 'rgba(206,17,38,0.08)'};border-color:${ctx?.accentBorder || 'rgba(206,17,38,0.25)'};color:${ctx?.accent || '#CE1126'};` : 'border-gray-200;color:var(--neutral-500);background:var(--neutral-100);'}">${esc(d.label)}</button>`;
    }).join('');
  };
  const renderBlockCanvas = () => {
    const cv = tc.querySelector('#mc-blocks-canvas');
    if (!cv) return;
    const list = bOrder.filter(id => !bHidden.has(id));
    cv.innerHTML = list.length ? list.map((id, i) => {
      const d = OUTPUT_BLOCK_DEFS.find(x => x.id === id);
      if (!d) return '';
      return `<div data-mc-block-slot="${esc(id)}" draggable="true" class="mc-drag-row flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 cursor-grab active:cursor-grabbing">
        <span class="w-5 h-5 flex items-center justify-center rounded-md text-[11px] font-semibold" style="background:${ctx?.accentRgba || 'rgba(206,17,38,0.08)'};color:${ctx?.accent || '#CE1126'};">${i + 1}</span>
        <span class="text-xs font-medium text-gray-700 flex-1 min-w-0">${esc(d.label)}</span>
        <span class="text-[10px] text-gray-400">${esc(d.desc)}</span>
      </div>`;
    }).join('') : '<p class="text-xs text-gray-400 text-center py-4">全部产出块已停用——活动详情不再显示「添加」按钮</p>';
  };

  const paint = () => { renderChips(); renderCanvas(); renderOff(); renderBlockChips(); renderBlockCanvas(); };
  paint();

  // —— 绑定（元素级防重复）——
  const on = (sel, fn) => {
    const el = tc.querySelector(sel);
    if (el && !el.dataset.bound) { el.dataset.bound = '1'; el.addEventListener('click', fn); }
  };
  on('#mc-save', async () => {
    if (!isSecretary) return;
    const blockPayload = { outputBlocks: { hiddenBlockIds: [...bHidden], blockOrder: bOrder } };
    await updateBranchModules(branchId, { hiddenTabIds: [...hidden], tabOrder: order }, rawTabs, blockPayload);
    showToast('已保存——本支部成员下次进入工作台/活动详情生效', 'success');
  });
  on('#mc-reset', async () => {
    if (!isSecretary) return;
    hidden.clear();
    order = businessTabs.map(t => t.id);
    bHidden.clear();
    bOrder = bReg.slice();
    await updateBranchModules(branchId, null, rawTabs, null);
    paint();
    showToast('已恢复默认（业务模块与活动产出块全开、注册顺序）', 'success');
  });

  tc.querySelectorAll('[data-mc-chip]').forEach(btn => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      const id = btn.dataset.mcChip;
      if (hidden.has(id)) { hidden.delete(id); order.push(id); } else { hidden.add(id); }
      paint();
    });
  });
  tc.querySelectorAll('[data-mc-off]').forEach(btn => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      const id = btn.dataset.mcOff;
      hidden.delete(id);
      if (!order.includes(id)) order.push(id);
      paint();
    });
  });

  // 画布拖拽（HTML5 DnD：dragstart/dragover/drop）
  const cv = tc.querySelector('#mc-canvas');
  if (cv && !cv.dataset.bound) {
    cv.dataset.bound = '1';
    let from = null;
    cv.addEventListener('dragstart', (e) => {
      const row = e.target.closest('[data-mc-slot]');
      if (!row || !isSecretary) { e.preventDefault(); return; }
      from = row.dataset.mcSlot;
      row.style.opacity = '0.5';
    });
    cv.addEventListener('dragend', (e) => {
      const row = e.target.closest('[data-mc-slot]');
      if (row) row.style.opacity = '';
      from = null;
    });
    cv.addEventListener('dragover', (e) => e.preventDefault());
    cv.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!from) return;
      const target = e.target.closest('[data-mc-slot]');
      if (!target || target.dataset.mcSlot === from) return;
      const visibleIds = order.filter(id => !hidden.has(id));
      const to = visibleIds.indexOf(target.dataset.mcSlot);
      visibleIds.splice(visibleIds.indexOf(from), 1);
      visibleIds.splice(to, 0, from);
      // 重建 order：visibleIds（启用序）+ 停用 id（保持尾部相对注册序）
      const offIds = order.filter(id => hidden.has(id));
      order = [...visibleIds, ...offIds];
      from = null;
      paint();
    });
  }

  // 产出块 chips 启停
  tc.querySelectorAll('[data-mc-block]').forEach(btn => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      const id = btn.dataset.mcBlock;
      if (bHidden.has(id)) { bHidden.delete(id); if (!bOrder.includes(id)) bOrder.push(id); } else { bHidden.add(id); }
      paint();
    });
  });

  // 产出块画布拖拽（v0：启用块排序）
  const bcv = tc.querySelector('#mc-blocks-canvas');
  if (bcv && !bcv.dataset.bound) {
    bcv.dataset.bound = '1';
    let bFrom = null;
    bcv.addEventListener('dragstart', (e) => {
      const row = e.target.closest('[data-mc-block-slot]');
      if (!row || !isSecretary) { e.preventDefault(); return; }
      bFrom = row.dataset.mcBlockSlot;
      row.style.opacity = '0.5';
    });
    bcv.addEventListener('dragend', (e) => {
      const row = e.target.closest('[data-mc-block-slot]');
      if (row) row.style.opacity = '';
      bFrom = null;
    });
    bcv.addEventListener('dragover', (e) => e.preventDefault());
    bcv.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!bFrom) return;
      const target = e.target.closest('[data-mc-block-slot]');
      if (!target || target.dataset.mcBlockSlot === bFrom) return;
      const visible = bOrder.filter(id => !bHidden.has(id));
      const to = visible.indexOf(target.dataset.mcBlockSlot);
      visible.splice(visible.indexOf(bFrom), 1);
      visible.splice(to, 0, bFrom);
      const hiddenTail = bOrder.filter(id => bHidden.has(id));
      bOrder = [...visible, ...hiddenTail];
      bFrom = null;
      paint();
    });
  }

  // 拖拽行样式提示（hover 视觉）
  tc.querySelectorAll('.mc-drag-row').forEach(row => {
    if (row.dataset.hovBound) return;
    row.dataset.hovBound = '1';
    row.addEventListener('mouseenter', () => { row.style.borderColor = ctx?.accentBorder || 'rgba(206,17,38,0.3)'; });
    row.addEventListener('mouseleave', () => { row.style.borderColor = ''; });
  });
}

function solidAccent(ctx) {
  // 主 CTA 档：强调色实底按钮（对齐既有 btn-accent 风格；缺省党建红）
  return `background:${ctx?.accent || '#C8102E'};color:#fff`;
}
