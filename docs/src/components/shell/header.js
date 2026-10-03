// role: [工程师]+[AI]
// components/shell/header.js — 共享顶栏组件（重构版）
// 变化: 去掉 mode 标签与只读视角切换；2026-08-10 支书裁定（原则12 工作台集成制）：
// 「切换工作台」下拉为冗余要素（每个人就是每个人，任务集成在工作台，跨台经待办/通知直达）→ 删除

import { getAccentColors, ROLE_LABELS, relativeLuminance } from '../../core/domain/constants.js?v=20261003a';
// R1-A 点⑤（2026-09-09）：身份标签取色走 person-aware 解析（登录 person 覆盖 / 访客全局键 / 角色默认），
// 替代 constants resolveAccentRole（只读全局键=旧残留/默认）——支书改强调色后 header 角色标签同金。
import { resolveAppliedAccentRole } from '../../core/boot/theme.js?v=20261003a';
import { getBasePath } from '../../core/base/utils.js?v=20261003a';
import { icon } from '../../core/base/icons.js?v=20261003a';
import { DATA_CHANGED_EVENT, DATA_LOADED_EVENT } from '../../data/data-adapter.js?v=20261003a';
import { badgeHtml } from '../ui/badges.js?v=20261003a';
import { readLoginSnapshot } from '../../core/session/login-snapshot.js?v=20261003a';
// P1 党委后台（2026-09-02）：header 品牌软编码——标题随支部配置档案更换（person→branchId→branches.config.headerTitle）
import { getHeaderTitle } from '../../services/branch/branch.js?v=20261003a';

// ── 数据层按需加载（静态页隔离，2026-08-12）──
// about/help 等纯静态文档页以 staticShell 渲染 header：不加载 auth/notice 数据链
// （auth→runtime→mock→domain 全量约 50 模块），通知铃首次点击或 app 模式渲染后按需加载。
// 动态 import 沿用与原静态 import 相同的版本号 → 与全站其他引用共享同一模块实例，行为不变。
let _authModule = null;
let _noticeModule = null;
function loadAuth() {
  if (!_authModule) _authModule = import('../../services/core/auth.js?v=20261003a');
  return _authModule;
}
function loadNotice() {
  if (!_noticeModule) _noticeModule = import('../../services/governance/notice.js?v=20261003a');
  return _noticeModule;
}
// 2026-09-30 批次 297-2：跨台通用动作「一键汇报」收进顶栏唯一固定位 ⇒ 顶栏按需加载其入口模块
// （与 auth / notice 同一策略：静态壳页不加载，app 模式渲染后加载，模块缓存后即时）
let _reportEntryModule = null;
function loadReportEntry() {
  if (!_reportEntryModule) _reportEntryModule = import('../record/report-entry.js?v=20261003a');
  return _reportEntryModule;
}

// ── 本台主 CTA 槽位（2026-10-01 批次 317 · 支书 V-3「功能钮提台顶栏全局固定位」）──────────
//   支书原话：「不仅是 tab，还有一些单纯的功能 button，比如写入活动」。裁定取「甲：提到台顶栏
//   全局固定位」——与该台「一键汇报」同排（`.header-actions`），**任何 tab 下都够得着**，
//   不必先切到承载它的 tab、再在卡内找。
//   **为什么做成槽位＋挂载 API 而不是写死**：顶栏是壳级、工作台 CTA 是台级，两者渲染顺序
//   （`bootstrap.js` 先 import 入口、入口 await `createWorkspaceShell`，随后才 `renderHeader`）
//   不保证 ⇒ 未渲染时**暂存**、渲染后补挂，调用方不必关心次序。
let _pendingHeaderCta = null;

/** 填充槽位（内部） */
function _fillHeaderCta(slot, html, bind) {
  slot.innerHTML = html || '';
  if (typeof bind === 'function') bind(slot);
}

/**
 * 挂载本台主 CTA（顶栏 `.header-actions` 首位）。
 * @param {string} html — 按钮 HTML（**族类须走按钮族**，顶栏用 `.header-action-btn` 同款外观）
 * @param {(slot:HTMLElement)=>void} [bind] — 绑定回调，入参＝槽位元素
 */
export function mountHeaderCta(html, bind) {
  const slot = (typeof document !== 'undefined' && document) ? document.getElementById('header-cta-slot') : null;
  if (!slot) { _pendingHeaderCta = { html, bind }; return; }  // 顶栏尚未渲染 ⇒ 暂存
  _fillHeaderCta(slot, html, bind);
}

/** 渲染收尾补挂（挂载早于渲染时用） */
function _applyPendingHeaderCta(header) {
  if (!_pendingHeaderCta || !header) return;
  const slot = header.querySelector('#header-cta-slot');
  if (slot) _fillHeaderCta(slot, _pendingHeaderCta.html, _pendingHeaderCta.bind);
  _pendingHeaderCta = null;
}

// ── 浏览器标签页标题（2026-09-23 支书批「判别依据可感」）────────────────────────
// 标签页标题随登录账号动态更新：`<页面名> — <当前组织名>`；组织名 = getHeaderTitle（与顶栏 h1 同一判定源，1–5 段）。
// 页面名 = 本模块加载时静态 <title> 里分隔符「 — 」之前的部分——静态 title 一律 `<页面名> — 中性串`
// （中性串 = 产品名 GSM1921-SOP：对任何部署实例都成立，不 claim 任何具体支部名）。
const DOC_TITLE_SEP = ' — ';
const _STATIC_PAGE_TITLE = (typeof document !== 'undefined' && document) ? String(document.title || '') : '';
const PAGE_NAME = _STATIC_PAGE_TITLE.split(DOC_TITLE_SEP)[0].trim();

/** 刷新浏览器标签页标题（组织名由调用方传入 = getHeaderTitle 结果；页面名取静态 <title> 快照） */
function _applyDocumentTitle(orgTitle) {
  if (typeof document === 'undefined' || !document) return;
  const next = PAGE_NAME ? `${PAGE_NAME}${DOC_TITLE_SEP}${orgTitle}` : orgTitle;
  if (document.title !== next) document.title = next;
}

// 数据变更订阅（2026-08-05，消除"确认已读后角标不更新"）：
// 模块顶层绑定一次；_renderNotificationBadge 在 #notification-bell 未渲染时静默返回。
// 2026-09-10 归属显示一致性修复：原来只重绘角标、不重绘 h1——header 在数据加载前渲染时
// getHeaderTitle 只能拿静态兜底名，数据到达后无人刷新 → 整会话停留错误标题。
// 故 DATA_LOADED / DATA_CHANGED 同时刷新品牌标题（只改 h1 文本，不重建 header DOM）。
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  document.addEventListener(DATA_CHANGED_EVENT, _renderNotificationBadge);
  document.addEventListener(DATA_LOADED_EVENT, _renderNotificationBadge);
  document.addEventListener(DATA_CHANGED_EVENT, _refreshHeaderTitle);
  document.addEventListener(DATA_LOADED_EVENT, _refreshHeaderTitle);
  // 2026-09-30 批次 297-2：顶栏「一键汇报」角标同刷（与铃铛角标同一路径）
  document.addEventListener(DATA_CHANGED_EVENT, _refreshReportEntryBadge);
  document.addEventListener(DATA_LOADED_EVENT, _refreshReportEntryBadge);
}

/** 刷新顶栏「一键汇报」角标（未挂载 / 未加载数据链时静默） */
async function _refreshReportEntryBadge() {
  const slot = document.getElementById('report-entry-slot');
  if (!slot || !slot.firstElementChild) return;
  try {
    const { refreshReportEntryBadge } = await loadReportEntry();
    refreshReportEntryBadge();
  } catch (e) { /* 静态壳页未加载数据链：静默 */ }
}

/**
 * 即时刷新通知角标（只更新角标 DOM，不整页重渲染）
 * 数据变更（markRead/markAllRead/add/remove）或 loadDB 完成后调用，
 * 修复角标停留在 seed 快照/点击已读后不更新的问题。
 */
async function _renderNotificationBadge() {
  const bell = document.getElementById('notification-bell');
  if (!bell) return;
  let NoticeStore;
  try {
    ({ NoticeStore } = await loadNotice());
  } catch (e) {
    return; // 静态页未加载数据链时静默（无角标可渲染）
  }
  const old = bell.querySelector('#notif-badge');
  if (old) old.remove();
  // 只统计未过期的未读通知，与 index 首页通知栏数据一致
  const activeNotices = NoticeStore.list({ activeOnly: true });
  const unread = activeNotices.filter(n => !n.read).length;
  if (unread > 0) {
    const badge = document.createElement('span');
    badge.id = 'notif-badge';
    badge.textContent = unread > 9 ? '9+' : String(unread);
    // 2026-09-29 批次 285 立「红底数字小圆」（支书：「参考微信消息提醒的做法」）；
    //   **批次 294 支书复议**：「我更喜欢金色，因为背景是党建红了对比不明显」——顶栏是**深红底**
    //   （本文件 `_roleLabelHTML` 注：「整个 header（深红底白字）」）⇒ 红角标与底同色系、对比不足。
    //   ⇒ 改**党徽金底 + 深字**（金 `--party-gold` / 深字 `text-amber-800`，与 `badgeHtml(..., 'gold')` 同源字色）。
    //   口径升为「**计数小圆底色随宿主背景**」：**深红底 ⇒ 金**；**白 / 浅底（如首页卡片内那些） ⇒ 红**（沿用 `--party-red`）。
    //   仍走令牌与 Tailwind 工具类，**不落 hex 字面量**。
    badge.style.cssText = 'position:absolute;top:2px;right:2px;min-width:16px;height:16px;border-radius:9999px;background:var(--party-gold);font-weight:600;display:flex;align-items:center;justify-content:center;padding:0 4px;';
    badge.classList.add('text-xs', 'text-amber-800');
    bell.appendChild(badge);
  }
}

/**
 * 即时刷新 header 品牌标题（2026-09-10「归属显示不一致」修复）
 * 只改 h1 文本（textContent），不重建 header DOM——不触碰汉堡/铃铛/身份标签的事件绑定，无闪烁。
 * 数据未加载时 getHeaderTitle 返回静态兜底名，本函数在 loadDB 完成（DATA_LOADED）后归还真实支部名。
 * 2026-09-23：同批刷新浏览器标签页标题（同一标题值 + 页面名），DATA_LOADED / DATA_CHANGED / 登录后重绘三路共用。
 */
async function _refreshHeaderTitle() {
  const header = document.getElementById('app-header');
  const h1 = header?.querySelector('.header-title h1');
  if (!h1) return;
  let personId = '';
  try {
    const { AuthStore } = await loadAuth();
    personId = AuthStore.getCurrentUser()?.personId || '';
  } catch (e) {
    return; // 静态页未加载数据链时静默（无 h1 可判定）
  }
  const title = getHeaderTitle(personId || undefined);
  if (h1.textContent !== title) h1.textContent = title;
  _applyDocumentTitle(title);
}

function _roleLabelHTML(role) {
  if (!role) return '';
  // 普通参与者默认无标记：没有标记就是普通参与者的标记（支书 2026-08-01 决策）
  if (role === 'participant') return '';
  const { accent } = getAccentColors(resolveAppliedAccentRole(role));
  const label = ROLE_LABELS[role] || role;
  // 2026-08-11 四审纠正：header 身份显示 = 主题色实底（正常饱和度）+ 白字，
  // 与整个 header（深红底白字）一致；淡底深字/边框在 header 上突兀臃肿，日/夜一致。
  // R-9 ①（2026-09-11 对比度收口）：亮色 accent（感知亮度 > 0.18，如翠绿 0.41/天蓝 0.33）
  // 实底白字仅 2.28–2.77 → 底色压深一档（60% 原色 + 40% 黑），白字达 AA（≥ 5.0）；
  // 深色 accent（党建红/深橙/海蓝/金）对比已达标，保持正常饱和度不动。
  const chipBg = relativeLuminance(accent) > 0.18 ? `color-mix(in srgb, ${accent} 60%, #000)` : accent;
  return `
    <div class="role-label" id="role-label" style="display:flex;align-items:center;gap:4px;padding:5px 10px;border-radius:var(--radius-sm);background:${chipBg};color:#fff;">
      <span class="text-xs font-medium">${label}</span>
    </div>
  `;
}

// 未登录「登录」入口（支书 2026-09-07 U1 批准）：与身份徽章同位（铃铛左侧），
// 复用既有 .header-action-btn（styles.css 内 header 动作按钮风格：白透底/细边/浅字 + hover 提亮）
function _loginEntryHTML() {
  return `<a href="${getBasePath()}login.html" id="header-login-btn" class="header-action-btn" style="display:inline-flex;align-items:center;text-decoration:none;">登录</a>`;
}

function _notificationBellHTML() {
  // 角标由 _renderNotificationBadge() 在数据层加载后异步补充
  // （静态壳页不加载数据链 → 无角标；app 页渲染后即时补上，无感知延迟）
  return `
    <div id="notification-bell" style="position:relative;">
      <button id="notif-btn" aria-label="通知" aria-haspopup="true" aria-expanded="false" style="width:40px;height:40px;border-radius:var(--radius-sm);background:rgba(255,255,255,0.1);border:1.5px solid rgba(255,255,255,0.25);display:flex;align-items:center;justify-content:center;cursor:pointer;">
        ${icon('bell', { stroke: '#FFFFFF', className: 'w-4 h-4' })}
      </button>
      <div id="notif-dropdown" class="hidden" style="position:absolute;top:calc(100% + 4px);right:0;width:320px;background:var(--surface-card);border-radius:var(--radius-sm);box-shadow:var(--shadow-dropdown);z-index:100;overflow:hidden;border:1px solid var(--neutral-200);"></div>
    </div>
  `;
}

export async function renderHeader(activeModule, opts = {}) {
  const header = document.getElementById('app-header');
  if (!header) return;

  const staticShell = !!opts.staticShell;

  // 登录态感知壳：静态页轻量读快照（零依赖）——已登录才动态加载 auth 渲染身份标签；
  // 未登录访客 → 无身份标签；app 模式按需加载后渲染身份
  let role = '';
  let personId = '';
  if (staticShell ? readLoginSnapshot() : true) {
    try {
      const { AuthStore } = await loadAuth();
      const user = AuthStore.getCurrentUser();
      role = user?.role || '';
      personId = user?.personId || '';
    } catch (e) {
      console.warn('[header] auth 加载失败，降级为静态壳', e);
    }
  }
  // P1 软编码 + 2026-09-09 支部归属显式化：支部名随配置档案（getBoundBranch 有效归属 → config.headerTitle）；
  //   登录但无有效归属支部（branchId 空/查无）→ 中性占位「未绑定支部」（不再泄漏示例支部名）；
  //   分支数据尚未加载（时序）→ 静态兜底名（getHeaderTitle 内处理），数据到达后由 _refreshHeaderTitle 归还真实支部名；
  //   未登录静态壳（personId 缺省）→ 中性占位「示例组织（未登录）」。
  const headerTitle = getHeaderTitle(personId || undefined);
  // 2026-09-23：浏览器标签页标题同源刷新（渲染路径；未登录/登出后重绘即回到「示例组织（未登录）」）
  _applyDocumentTitle(headerTitle);

  header.innerHTML = `
    <div class="header-content">
      <button id="hamburger-btn" aria-label="打开导航菜单" class="btn-ghost hamburger-btn">
        <span></span><span></span><span></span>
      </button>
      <div class="party-emblem-wrapper">
        <img src="${getBasePath()}assets/images/party_emblem.png" alt="党徽" class="party-emblem" draggable="false" onerror="this.style.display='none';">
      </div>
      <div class="header-title">
        <!-- h1 无归属态即显示「未绑定支部」中性占位（getHeaderTitle 收敛）；不加点击引导（二期候选 b 登记：可考虑引导去党委确认归属） -->
        <h1 class="font-title-cn">${headerTitle}</h1>
      </div>
      <div class="header-actions" style="display:flex;align-items:center;gap:8px;">
        ${role ? _roleLabelHTML(role) : _loginEntryHTML()}
        <span id="header-cta-slot"></span>
        <span id="report-entry-slot"></span>
        ${_notificationBellHTML()}
      </div>
    </div>
  `;

  _bindHamburger(header);
  _bindNotificationBell(header);
  _applyPendingHeaderCta(header);

  // app 模式：渲染后立即按需加载通知模块 → 计算未读角标（模块缓存后即时、无感知）
  if (!staticShell) {
    loadNotice().then(() => _renderNotificationBadge()).catch(() => {});
    // 2026-09-30 批次 297-2（支书裁「页头只留 1 枚本台主 CTA；跨台通用动作收进全局固定位」）：
    //   「一键汇报」由「常驻 5 台页头」收成**全站唯一固定位**＝本顶栏；未登录（无 personId）不渲染。
    loadReportEntry()
      .then((m) => {
        const slot = header.querySelector('#report-entry-slot');
        if (!slot || !personId) return;
        slot.innerHTML = m.renderReportEntryHtml();
        m.bindReportEntry(slot);
      })
      .catch(() => {});
  }
}

function _bindHamburger(header) {
  const hamburger = header.querySelector('#hamburger-btn');
  const sidebar = document.getElementById('app-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!hamburger || !sidebar) return;

  // 2026-09-24 无障碍：折叠态的侧栏只是 `transform: translateX(-100%)` 移出视口——元素仍在文档流里、
  // 8 条导航链接**全部留在 Tab 序列**（DOM 顺序 header → 侧栏 → main ⇒ 键盘用户前 8 个 Tab 停在看不见的控件上）。
  // 故折叠/展开时同步 `inert`（属性不是 CSS，必须在此切换）：折叠＝不可聚焦不可读，展开＝恢复。
  const syncSidebarInert = () => {
    sidebar.inert = sidebar.classList.contains('sidebar-collapsed');
  };
  syncSidebarInert(); // 首屏：模板里侧栏自带 `sidebar-collapsed` ⇒ 页面一进来即为 inert

  hamburger.addEventListener('click', () => {
    const collapsed = sidebar.classList.contains('sidebar-collapsed');
    if (collapsed) {
      sidebar.classList.remove('sidebar-collapsed');
      if (overlay) overlay.classList.add('visible');
    } else {
      sidebar.classList.add('sidebar-collapsed');
      if (overlay) overlay.classList.remove('visible');
    }
    syncSidebarInert();
  });

  if (overlay) {
    overlay.addEventListener('click', () => {
      overlay.classList.remove('visible');
      sidebar.classList.add('sidebar-collapsed');
      syncSidebarInert();
    });
  }
}

function _bindNotificationBell(header) {
  const btn = header.querySelector('#notif-btn');
  const dropdown = header.querySelector('#notif-dropdown');
  if (!btn || !dropdown) return;

  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');
    btn.setAttribute('aria-expanded', String(!dropdown.classList.contains('hidden')));
    if (!dropdown.classList.contains('hidden')) {
      // 首次点击时按需加载通知数据链（静态壳页点开铃铛才会加载，平时零依赖）
      let NoticeStore, resolveNoticeUrl;
      try {
        ({ NoticeStore, resolveNoticeUrl } = await loadNotice());
      } catch (err) {
        dropdown.innerHTML = '<div style="padding:16px;text-align:center;color:var(--neutral-500);" class="text-sm">通知数据不可用</div>';
        return;
      }
      // 保留策略（支书 2026-08-05）：紧急通知全部展示，重要通知仅展示未读
      const notices = NoticeStore.list({ activeOnly: true, sortBy: 'date', retention: 'visible' });
      if (notices.length === 0) {
        dropdown.innerHTML = '<div style="padding:16px;text-align:center;color:var(--neutral-500);" class="text-sm">暂无通知</div>';
        return;
      }

      const priorityBadge = {
        urgent: badgeHtml('紧急', 'gold'),
        normal: badgeHtml('重要', 'info'),
      };

      dropdown.innerHTML = notices.slice(0, 10).map(n => `
        <div class="notif-dropdown-item" data-notice-id="${n.id}" data-target="${n.targetModule || ''}" data-target-url="${n.targetUrl || ''}"
             role="button" tabindex="0" aria-label="查看通知：${n.title || n.content || ''}"
             style="padding:12px;border-bottom:1px solid var(--neutral-200);cursor:pointer;transition:background 0.15s;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
            ${priorityBadge[n.priority] || ''}
            ${n.source === 'committee' ? '<span style="display:inline-flex;align-items:center;padding:0 6px;border-radius:9999px;background:var(--party-red);color:#fff;font-size:10px;line-height:16px;flex-shrink:0;">党委下发</span>' : ''}
            <p style="color:var(--neutral-700);margin:0;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" class="text-body-sm">${n.title || n.content}</p>
            ${!n.read ? `<button class="btn-ghost notif-mark-read text-xs px-1.5 py-0.5" data-notice-id="${n.id}" style="color:var(--functional-info);flex-shrink:0;">已读</button>` : ''}
          </div>
          <p style="color:var(--neutral-500);margin:0;" class="text-[12px]">${n.publishDate || n.date || ''}</p>
        </div>
      `).join('');

      // 绑定"已读"按钮：stopPropagation 防止触发外层跳转
      dropdown.querySelectorAll('.notif-mark-read').forEach(btn => {
        btn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          const id = btn.dataset.noticeId;
          if (id) {
            NoticeStore.markRead(id);
            _renderNotificationBadge();
            // 视觉反馈：标题变浅 + 移除按钮
            const item = btn.closest('.notif-dropdown-item');
            const titleP = item?.querySelector('p[style*="color:var(--neutral-700)"]');
            if (titleP) titleP.style.color = 'var(--neutral-500)';
            btn.remove();
          }
        });
      });

      // 绑定点击：标记已读 + 统一跳转（resolveNoticeUrl 业务页直达优先，与全站一致）
      // C4（2026-09-12）：条目为不可聚焦 div → 语义化为可聚焦按钮，鼠标/键盘 Enter/Space 等效
      dropdown.querySelectorAll('.notif-dropdown-item').forEach(item => {
        item.addEventListener('mouseenter', () => {
          item.style.background = 'var(--surface-hover)';
        });
        item.addEventListener('mouseleave', () => {
          item.style.background = 'transparent';
        });
        const open = () => {
          const id = item.dataset.noticeId;
          const notice = NoticeStore._notices.find(n => n.id === id);
          if (id) NoticeStore.markRead(id);
          _renderNotificationBadge();
          // 视觉反馈：点击后标题颜色变浅
          const titleP = item.querySelector('p[style*="color:var(--neutral-700)"]');
          if (titleP) titleP.style.color = 'var(--neutral-500)';
          const dest = resolveNoticeUrl(notice);
          const finalUrl = dest.direct ? dest.url : `${getBasePath()}notice.html?id=${id}`;
          window.location.href = finalUrl;
        };
        item.addEventListener('click', (ev) => {
          ev.stopPropagation();
          open();
        });
        item.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') {
            ev.preventDefault();
            ev.stopPropagation();
            open();
          }
        });
      });
    }
  });

  // 点击外部关闭下拉
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });

  // ESC 关闭下拉
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !dropdown.classList.contains('hidden')) {
      dropdown.classList.add('hidden');
    }
  });
}