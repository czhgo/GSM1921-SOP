// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  components/overview-dispatch-bar.js — 工作概况「待答复 n · 去处理」直达条（IA-C2 绕行，2026-09-06）
//  背景：spec 五——components/work-overview.js 为受保护/长期定稿组件，其内汇报区摘要化需书记特批；
//  未批则按「绕行方案」：不删内容、仅在各 overview-tab 外壳顶部加一条直达处理位的总览条。
//  行为：由各 overview-tab 外壳在 renderWorkOverview 完成后调用——count>0 且处理位 tab 存在时，
//  在内容顶部插入「待答复 n · 去处理」条，点击切换本工作台处理位 tab（我的处置 / 组长=组员进展）。
//  仅活动态为当前工作台「overview」时插入（防快速切 tab 竞态误挂到其它 tab 内容上）。
//  书记台（secretary/overview-tab.js 受保护）不挂：其待办页/概况已有「待答复」收件箱既有入口（登记 2026-09-06）；
//  参与者台无「我的处置」tab（处理位=概况汇报区行内 + 顶栏一键汇报角标）同样不挂（登记）。
//  已知约束：work-overview 页内重渲染（详情返回/行内动作）会重建内容，本条随内容重建自然消失，
//  再次进入/重渲染 overview 时由外壳重新挂载（不触碰受保护组件）。
//  本组件仅处理展示与跳转；计数语义由调用方（外壳）按角色注入。
// ════════════════════════════════════════════════════════════════

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
 * 在 overview 内容顶部挂载「待答复 n · 去处理」直达条
 * @param {HTMLElement} el — overview 内容容器（#xxx-tab-content）
 * @param {Object} opts
 * @param {number} opts.count       — 待处理数（>0 才挂载）
 * @param {string} opts.prefix      — 工作台前缀（org/leader/disc/prop/visitor）
 * @param {string} opts.jumpTab     — 处理位 tab id（my-dispatch / members）
 * @param {string} [opts.accent]    — 主题强调色（hex）
 */
export function mountOverviewDispatchBar(el, { count, prefix, jumpTab, accent = '#B91C1C' }) {
  if (!el || !el.isConnected || !(count > 0)) return;
  // 竞态防护：仅当当前激活 tab 仍是本工作台 overview 时才插入
  const activeBtn = document.querySelector(`.${prefix}-tab-btn.tab-btn-active`);
  const activeTabId = activeBtn?.getAttribute(`data-${prefix}-tab`);
  if (activeTabId !== 'overview') return;
  const tabBtn = document.querySelector(`.${prefix}-tab-btn[data-${prefix}-tab="${jumpTab}"]`);
  if (!tabBtn) return; // 处理位 tab 被支部配置隐藏/不存在 → 不加条，避免死跳
  if (el.querySelector('.overview-dispatch-bar')) return; // 同次渲染防重复

  const bar = document.createElement('button');
  bar.type = 'button';
  bar.className = 'overview-dispatch-bar w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-left';
  bar.style.cssText = `background:${accent}1A;border:1px solid ${accent}40;color:${accent};cursor:pointer;transition:opacity .15s;`;
  bar.setAttribute('aria-label', `待答复 ${count} 条，去处理`);
  bar.innerHTML = `<span class="text-xs font-medium">待答复 <b class="tabular-nums">${count}</b></span><span class="text-xs font-semibold">去处理 →</span>`;
  bar.addEventListener('mouseenter', () => { bar.style.opacity = '0.85'; });
  bar.addEventListener('mouseleave', () => { bar.style.opacity = ''; });
  bar.addEventListener('click', () => tabBtn.click());
  el.insertAdjacentElement('afterbegin', bar);
}
