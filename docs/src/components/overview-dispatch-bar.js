// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  components/overview-dispatch-bar.js — 工作概况外壳辅助（IA-C2 直达条 + U3 骨架占位，2026-09-07）
//  背景：spec 五——components/work-overview.js 为受保护/长期定稿组件，其内汇报区摘要化需书记特批；
//  未批则按「绕行方案」：不删内容、仅在各 overview-tab 外壳顶部加一条直达处理位的总览条。
//  行为：由各 overview-tab 外壳调用——count>0 且处理位 tab 存在时，在内容顶部渲染
//  「待答复 n · 去处理」条，点击切换本工作台处理位 tab（我的处置 / 组长=组员进展）。
//  书记台（secretary/overview-tab.js 受保护）不挂：其待办页/概况已有「待答复」收件箱既有入口（登记 2026-09-06）；
//  参与者台无「我的处置」tab（处理位=概况汇报区行内 + 顶栏一键汇报角标）同样不挂（登记）。
//  U3（2026-09-07）：「卡片先占位、不弹跳」——原实现等 renderWorkOverview 渲染完成后
//  afterbegin 插条，把下方卡片整体下推（布局跳动）。现改为外壳「渲染前预留位」：
//    ① beginOverviewShell(el)  外壳进入 overview 时调用：在内容容器上方预留 .overview-dispatch-slot
//      （count>0 时条落此槽；count=0 槽收起为 0）；容器仍为壳骨架/空时兜底写入等高骨架卡
//      （min-height + 轻 loading 文案，视觉沿用 dashboard/stats.js 骨架范式；styles.css 禁改不碰）。
//    ② 外壳 await 计数（countOwnPendingReports / 组长组员 open 计数，IssueStore 同一缓存）
//    ③ mountOverviewDispatchBar(el,{...})  原地填充/收起槽位——条不推挤内容，与正文零位移；
//       work-overview 内部 rerender（详情下钻返回/行内动作）只重建内容容器，槽在外层不受影响，
//       直达条保持在位（不再每次重建后消失需外壳重挂）。
//  本组件仅处理展示与跳转；计数语义由调用方（外壳）按角色注入。
// ════════════════════════════════════════════════════════════════

import { IssueStore } from '../services/issues.js?v=20260907a'; // 计数依赖（U3 前置计数须显式引用；勿裸依赖全局）

/** 等高骨架卡（内容容器为空/仍为壳骨架时的兜底占位；min-height 防 0 高弹跳） */
export function overviewSkeletonHtml(text = '工作概况加载中…') {
  const block = `
    <div class="h-4 w-24 rounded bg-gray-100 animate-pulse mb-3"></div>
    <div class="space-y-2.5">
      <div class="h-9 rounded-lg bg-gray-100 animate-pulse"></div>
      <div class="h-9 rounded-lg bg-gray-100 animate-pulse"></div>
      <div class="h-9 rounded-lg bg-gray-100 animate-pulse"></div>
    </div>`;
  return `
    <div data-ws-ov-skeleton class="space-y-4">
      <div class="card rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs" style="min-height:44px;color:var(--neutral-400);">
        <span class="inline-block w-3 h-3 rounded-full animate-spin" style="border:2px solid var(--neutral-200);border-top-color:var(--neutral-400);"></span>
        ${text}
      </div>
      <div class="card rounded-xl p-4" style="min-height:150px;">${block}</div>
      <div class="card rounded-xl p-4" style="min-height:150px;">${block}</div>
      <div class="card rounded-xl p-4" style="min-height:150px;">${block}</div>
    </div>`;
}

/**
 * 概况外壳渲染前占位：内容容器上方预留「待答复」槽位 + 容器兜底等高骨架。
 * 幂等：槽已存在/容器已有真实内容时不重建（切走切回/重渲染保留旧内容，由 tab-bar 置灰过渡）。
 * @param {HTMLElement} el — overview 内容容器（#xxx-tab-content）
 * @returns {{ el: HTMLElement, slot: HTMLElement }}
 */
export function beginOverviewShell(el) {
  if (!el) return { el, slot: null };
  // 槽 = 内容容器前兄弟（tab 栏与内容之间；不随任一 tab 的 innerHTML 重建消失）
  let slot = el.previousElementSibling;
  if (!(slot && slot.classList.contains('overview-dispatch-slot'))) {
    slot = document.createElement('div');
    slot.className = 'overview-dispatch-slot';
    slot.style.cssText = 'min-height:0;overflow:hidden;transition:min-height .15s ease;';
    el.insertAdjacentElement('beforebegin', slot);
  }
  // 首次进入且容器仍为壳骨架/空 → 等高骨架卡占位（await 计数/渲染期间防 0 高弹跳）
  if (!el.dataset.ovReady && (!el.innerHTML.trim() || el.querySelector('[data-ws-tab-loading-bar]'))) {
    el.innerHTML = overviewSkeletonHtml();
  }
  el.dataset.ovReady = '1';
  return { el, slot };
}

/**
 * 汇报待处理条数（个人视角：请我汇报 + 我发起的 open 汇报；与「我的处置」①/② 块同源）
 * @param {string} personId
 * @returns {Promise<number>}
 */
export async function countOwnPendingReports(personId) {
  if (!personId) return 0;
  await IssueStore.loadAll();
  const requests = IssueStore.getReportRequestsFor(personId);
  const openMine = IssueStore.getMyReports(personId).filter(r => r.status === 'open');
  return requests.length + openMine.length;
}

/**
 * 在 overview 内容上方的预留槽位中渲染/收起「待答复 n · 去处理」直达条（U3：原地填充、零位移）。
 * 调用方须先经 beginOverviewShell 建槽（无槽时静默跳过，兼容未改造调用）。
 * @param {HTMLElement} el — overview 内容容器（#xxx-tab-content，槽在其前兄弟位）
 * @param {Object} opts
 * @param {number} opts.count       — 待处理数（>0 才挂载）
 * @param {string} opts.prefix      — 工作台前缀（org/leader/disc/prop/visitor）
 * @param {string} opts.jumpTab     — 处理位 tab id（my-dispatch / members）
 * @param {string} [opts.accent]    — 主题强调色（hex）
 */
export function mountOverviewDispatchBar(el, { count, prefix, jumpTab, accent = '#B91C1C' }) {
  if (!el || !el.isConnected) return;
  const slot = el.previousElementSibling;
  if (!(slot && slot.classList.contains('overview-dispatch-slot'))) return; // 无槽：未经 beginOverviewShell，跳过
  // 竞态防护：仅当当前激活 tab 仍是本工作台 overview 时才填充
  const activeBtn = document.querySelector(`.${prefix}-tab-btn.tab-btn-active`);
  const activeTabId = activeBtn?.getAttribute(`data-${prefix}-tab`);
  const tabBtn = document.querySelector(`.${prefix}-tab-btn[data-${prefix}-tab="${jumpTab}"]`);
  const visible = activeTabId === 'overview' && count > 0 && !!tabBtn; // 处理位被支部配置隐藏 → 收起，避免死跳
  if (!visible) {
    if (slot.innerHTML) { slot.innerHTML = ''; slot.style.minHeight = '0px'; }
    return;
  }
  slot.style.minHeight = '';
  slot.innerHTML = `
    <button type="button" class="overview-dispatch-bar w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-left mb-3"
      style="background:${accent}1A;border:1px solid ${accent}40;color:${accent};cursor:pointer;transition:opacity .15s;"
      aria-label="待答复 ${count} 条，去处理">
      <span class="text-xs font-medium">待答复 <b class="tabular-nums">${count}</b></span><span class="text-xs font-semibold">去处理 →</span>
    </button>`;
  const bar = slot.querySelector('.overview-dispatch-bar');
  bar.addEventListener('mouseenter', () => { bar.style.opacity = '0.85'; });
  bar.addEventListener('mouseleave', () => { bar.style.opacity = ''; });
  bar.addEventListener('click', () => tabBtn.click());
}
