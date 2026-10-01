// role: [工程师]+[AI]
// bootstrap.js — 页面初始化统一入口（重构版）
// 变化: 去掉 ViewModeStore/CrossPageState/setActiveRole，改为基于 getCurrentUser() 的登录检查
// 第3轮 Task 9: dev 参数读取改用 CrossPageState.getParam（统一入口）
// 2026-07-30: 改为 async，统一预加载所有 Service（IssueStore/MilestoneStore），消除跨页面数据不同步

import { renderSidebar } from '../../components/shell/sidebar.js?v=20261001h';
import { renderHeader } from '../../components/shell/header.js?v=20261001h';
import { AuthStore } from '../../services/core/auth.js?v=20261001h';
import { IssueStore } from '../../services/governance/issues.js?v=20261001h';
import { MilestoneStore } from '../../services/governance/milestones.js?v=20261001h';
import { CrossPageState } from '../session/cross-page-state.js?v=20261001h';
import { getBasePath } from '../base/utils.js?v=20261001h';
import { enhanceSelects } from '../../components/ui/custom-select.js?v=20261001h';
// 立项⑦ B波 演示放行门（单一源，与「进入支部（演示）」按钮同口径）
import { isPartyStaffBranchDemoAllowed } from '../../services/core/branch-demo-nav.js?v=20261001h';
// A② 归档兜底放行门（2026-09-10）：支书/副支书 archive=Y 兜底权限——可进入宣传台归档兜底面
import { isArchiveFallbackPage, isBranchPendingUser } from '../domain/constants.js?v=20261001h';
// 组织者兜底放行门（2026-09-19 批次 91 · SOP-B-17）：判定需读活动数据，故单一源落在服务层
import { isOrganizerFallbackPage } from '../../services/activity/activity.js?v=20261001h';
// 强调色解析（R1-A 点⑤，2026-09-09）：person-aware 渲染时取色——替代只读全局键的
// constants resolveAccentRole（冻结读取点语义，仅服务访客与首帧兜底）；--app-accent 与
// 返回值（壳 ctx.accent → tab-bar/各 tab）统一取「当前作用域生效覆盖」，登录人改强调色后同源。
import { getAppliedAccentColors } from './theme.js?v=20261001h';
import { registerApiAdapter, init, renderDataSourceError, hydrateDataSource } from '../../data/data-adapter.js?v=20261001h';
import { ApiAdapter } from '../../data/api-adapter.js?v=20261001h';
import { getCapabilities } from './registry.js?v=20261001h';
// M4 数据源注册化：副作用导入触发 mock/api 数据源能力注册，bootstrap 经注册表选择数据源
import '../../capabilities/data-source.js?v=20261001h';
// M6（2026-08-30）：共享组件能力随全局引导注册（todo-list/calendar/custom-select），所有页面可发现组件清单
import '../../capabilities/components.js?v=20261001h';

// ════════════════════════════════════════════════════════════════
// S2 自定义圆角下拉：全局自动增强（MutationObserver 防抖扫描）
// 任何时刻动态渲染出的 .input-flat select 都会被增强为自定义圆角下拉，
// 无需在各渲染点逐处调用（组件内 data-cs-enhanced 标记防重）。
// ════════════════════════════════════════════════════════════════
let _csScanTimer = null;
function _scheduleEnhance() {
  if (_csScanTimer) return;
  _csScanTimer = setTimeout(() => {
    _csScanTimer = null;
    enhanceSelects(document);
  }, 60);
}
if (typeof MutationObserver !== 'undefined' && document.body) {
  new MutationObserver(_scheduleEnhance).observe(document.body, { childList: true, subtree: true });
} else if (document.body) {
  _scheduleEnhance();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _scheduleEnhance);
} else {
  _scheduleEnhance();
}

// ════════════════════════════════════════════════════════════════
// 安全最佳实践：开发绕过白名单（security-best-practices Skill 指导）
// ════════════════════════════════════════════════════════════════
// ?dev=ROLE 是本地开发便捷绕过登录的机制，生产环境必须拒绝。
// 防护两层：(1) hostname 必须是本地回环；(2) ROLE 必须在白名单内。
const DEV_HOSTNAME_WHITELIST = new Set(['localhost', '127.0.0.1', '::1']);
const DEV_ROLE_WHITELIST = new Set([
  'secretary', 'deputy-secretary',
  'org-commissioner', 'prop-commissioner', 'disc-commissioner',
  'leader', 'deputy-leader', 'participant',
]);

/**
 * 页面初始化统一入口（重构版）
 *
 * 2026-07-30 起改为 async：在登录检查通过后，统一预加载所有 Service（IssueStore/MilestoneStore），
 * 消除跨页面数据不同步问题（如支书工作台 issue 列表为空）。
 *
 * @param {Object} opts
 * @param {string} opts.module          — 模块名：'workspace' | 'dashboard' | 'members' | 'archive' | 'search' | 'feedback'
 * @param {string} [opts.accentRole]    — 强调色角色键名（省略则不获取 accent 三件套）
 * @param {number[]} [opts.accentAlpha] — 自定义透明度 [bgAlpha, borderAlpha]
 *
 * @returns {Promise<{
 *   user: { personId: string, role: string } | null,
 *   accent: string|undefined,
 *   accentRgba: string|undefined,
 *   accentBorder: string|undefined
 * }>}
 */
export async function bootstrapPage({ module, accentRole, accentAlpha }) {
  // 代码数据版本自检（2026-08-01 引入，配合 cross-page-state 的 CODE_VERSION）：
  // 旧 tab 持有旧 ES 模块时自动刷新一次加载新模块。必须放在最顶部（API 恢复/init 之前），
  // 否则部署后首次访问会 init 两遍（旧模块 + reload 后新模块各 10 个 fetch，P1 审查 M6）。
  if (CrossPageState.isStaleCodeVersion()) {
    CrossPageState.bumpDataVersion();
    window.location.reload();
    return { user: null };
  }

  // 恢复 API 数据源：已登录且存在 token 时切换到后端（认证由 api-adapter 读取 authToken）
  // M4 数据源注册化：经注册表读取数据源能力（getCapabilities 按 scope='data-source' 过滤）。
  // **P0-2（2026-09-23 支书裁定「形态必须可断言、不许静默降级」）**：有 token ⇒ 这是**真系统会话**，
  //   init() 失败**不得**回落 apply mock（原实现静默 `mockCap.apply()` ⇒ 用户以为在真系统里操作、
  //   实际只写浏览器，下次登录被服务端数据覆盖 ⇒ **静默丢单**）。现改为**显式失败**：
  //   页面渲染「无法连接服务器 + 重试」错误态（共享实现 = data/data-adapter.js::renderDataSourceError）。
  //   无 token（本地演示形态）不在此分支：保持原样（那条路是刻意保留的）。
  // registerApiAdapter 幂等（重复注册仅覆盖同一实例），与 runtime.js 的注册不冲突
  registerApiAdapter(ApiAdapter);
  const savedToken = sessionStorage.getItem('gsm1921-api-token');
  const dataSourceCaps = getCapabilities({ scope: 'data-source' });
  const apiCap = dataSourceCaps.find(c => c.id === 'api-data-source');
  if (savedToken && apiCap && typeof apiCap.apply === 'function') {
    apiCap.apply({ apiBaseUrl: '', authToken: savedToken });
    try {
      await init(); // 从后端拉取全量数据填充 mockDB（读路径）
    } catch (e) {
      console.error('[bootstrap] API 数据加载失败——显式失败（有 token 时不回落可写 mock，避免静默丢单）', e);
      renderDataSourceError(e && e.message);
      return { user: null, dataSourceError: e };
    }
  }

  // ── T4（2026-09-23 批次 163）：无 token 也**不得无条件**静默进可写 mock ──
  // 病灶同 P0-2 / T3：真系统用户会话失效（sessionStorage 被清 / 换标签）后，工作台与首页由本页
  //   `bootstrapPage` 装配、**不调** `hydrateDataSource`（那是 11 个独立页的收敛点）⇒ 原先照常进
  //   可写 mock、无任何提示，用户以为在真系统里操作、下次登录被服务端数据覆盖（静默丢单）。
  // 修法＝**复用（而非抄写）唯一收敛点** `data/data-adapter.js::hydrateDataSource`：其内
  //   `isStaleServerSession()`（三条件单一判据）+ `renderSessionExpiredError()`（同一浮层）已就位，
  //   本页只按返回值处置，**不另写第二份判定**。三种「正常本地演示」仍放行可写 mock（均由该判据内部排除）：
  //     · 无任何登录痕迹的访客（首次访问 / 纯本地演示）；
  //     · 本标签页刚用开发身份卡登录（`AuthStore.devLogin` 同写 localStorage + 会话快照）；
  //     · `DEPLOY_MODE !== 'server'`（GitHub Pages 静态托管）。
  if (!savedToken) {
    const hydrated = await hydrateDataSource({ apiAdapter: ApiAdapter });
    if (!hydrated.ok) return { user: null, sessionExpired: true };
  }

  // 登录检查
  const user = AuthStore.getCurrentUser();
  if (!user) {
    // 开发绕过：?dev=ROLE 仅在本地 hostname + 白名单角色时生效
    const devRole = CrossPageState.getParam('dev');
    const isLocalHost = DEV_HOSTNAME_WHITELIST.has(window.location.hostname);
    if (devRole && isLocalHost && DEV_ROLE_WHITELIST.has(devRole)) {
      AuthStore.devLogin(devRole);
      window.location.reload();
      return { user: null };
    }
    // L1 页面门控：仅工作台强制跳登录；首页等公开页匿名可访（AUTHENTICATION_MODEL.md §四）
    // 首页组件（活动/专班/日历）点击跳工作台，再由工作台门控触发登录（当前跳 login.html，IAAA 为后续目标）
    if (module === 'workspace') {
      const base = window.location.pathname.includes('/workspace/')
        ? '../' : './';
      window.location.href = base + 'login.html';
      return { user: null };
    }
  }

  // ── IAAA 入站「待归属」阻断层（2026-09-29 批次 277）──────────────────────────────
  // 支书 2026-09-29 原话：「如果没有这个人，那就要自动创建这个人的号，并且进入**选择支部**，
  //   然后由支部**予以确认**」⇒ **未归属支部者不得进入任何工作台**——他此刻看不到任何支部内容
  //   （服务端亦按支部隔离）；放行条件＝支部确认（`users.branchId` 落定）。
  // ⚠ 只在 `branchId` **显式为 `null`** 时生效（缺字段＝未知 ⇒ 不拦）；
  //   **组织级（党委组织员）排除**——党委本就不属于任何支部 ⇒ 不得被本层挡住。
  //   判据**单一源** ＝ `domain/constants.js::isBranchPendingUser`（登录页同一处消费，勿手写第二份）。
  if (module === 'workspace' && isBranchPendingUser(user)) {
    const base = window.location.pathname.includes('/workspace/') ? '../' : './';
    window.location.href = base + 'login.html?need-branch=1';
    return { user: null, needBranch: true };
  }

  // 字体二档调节：读取 localStorage 偏好并应用
  const savedFontSize = localStorage.getItem('workflowos_font_size') || 'medium';
  if (savedFontSize === 'large') {
    document.documentElement.classList.add('font-size-large');
  }

  // 页面身份校验（支书 2026-08-07 指令：右上角"身份"必须与当前工作台页面匹配）
  // 根因：header 直接读登录快照 user.role，未与当前页面做任何校验；同一服务器下跳转
  // workspace 时会出现"身份标签与页面错位"。修复：计算该用户"允许访问的工作台页面集合"
  // （登录快照角色页面 + 内存判定角色页面），当前页面不在集合内时自动跳转到身份对应页面。
  if (module === 'workspace' && user) {
    // T-304 遗留修复：剥后缀归一化——内嵌视图会把 workspace/xxx.html 剥成 workspace/xxx，
    // 两侧同时去掉 .html 后缀再比较，避免「恒不匹配 → 无限重定向循环」白屏。
    const norm = (p) => (p || '').replace(/\.html$/, '');
    const currentPage = norm(window.location.pathname.split('/').pop());
    const allowedPages = new Set();
    // 1. 登录快照身份对应工作台（header 身份标签同源：右上角显示什么身份，就该落在什么工作台）
    const snapPage = AuthStore.getPageForRole('workspace', user.role);
    if (snapPage) allowedPages.add(norm(snapPage));
    // 2. 内存判定角色对应工作台（赋权记录优先于 mock：如登录后被赋权为党小组组长，
    //    允许其合法访问组长工作台——header 切换工作台下拉的 1b 项同款场景）
    const memRole = AuthStore.getUserRole(user.personId);
    const memPage = AuthStore.getPageForRole('workspace', memRole);
    if (memPage) allowedPages.add(norm(memPage));

    // 立项⑦ B波：party-staff「进入支部（演示）」——身份门最小放行（A⑤ 2026-09-10 支书裁定：
    // 本地示例 / API 会话同口径放行，视图只读；不放宽任何写权限）。
    // 判定单一源 = services/core/branch-demo-nav.js::isPartyStaffBranchDemoAllowed（与「进入支部（演示）」
    // 按钮同一放行门，双端一致）；此前此处调用未定义函数 _partyStaffBranchDemoAllowed，
    // 致 party-staff 演示下钻（secretary.html?branch=<id>）抛 ReferenceError → 整页白屏。
    const demoBranchId = CrossPageState.getParam('branch');
    if (!allowedPages.has(currentPage) && isPartyStaffBranchDemoAllowed(user.role, currentPage, demoBranchId)) {
      allowedPages.add(currentPage);
    }

    // A② 归档兜底放行（2026-09-10 支书裁定）：支书/副支书持 archive=Y（§9b 矩阵）——
    // 允许进入宣传台 prop.html，但仅归档兜底面（宣传台壳只呈现归档 tab，见 prop-workspace tabs）。
    // 判定单一源 = constants.isArchiveFallbackPage（与支书台「代归档」入口同源），勿手写角色清单。
    if (!allowedPages.has(currentPage)
      && (isArchiveFallbackPage(user.role, currentPage) || isArchiveFallbackPage(memRole, currentPage))) {
      allowedPages.add(currentPage);
    }

    // 组织者兜底放行（2026-09-19 批次 91 · SOP-B-17 / D-308 · D-309）：
    // 「组织者是这场事上被指定的人」——被指定为某场活动的组织者，该场的上传位（考勤 / 考察，
    // 含纪检打回后的「待你确认」区）就在他手上；而那两个上传位现承载在组长台，故按「人」放行这一页。
    // 判定单一源 = services/activity/activity.js::isOrganizerFallbackPage（与界面侧的收窄同一处，勿手写角色清单）；
    // 放行面由 leader-workspace 能力收窄到「我的职责」里的那两个 tab，**不放宽任何写权限**。
    if (!allowedPages.has(currentPage) && isOrganizerFallbackPage(user.personId, currentPage)) {
      allowedPages.add(currentPage);
    }

    if (!allowedPages.has(currentPage)) {
      // 跳转目标：以登录快照身份为准（与身份标签一致）；缺失时回退内存判定角色页面
      const target = snapPage || memPage || 'visitor.html';
      // 基于当前 pathname 计算目标目录，避免依赖 <base> 的解析差异
      const dir = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
      window.location.href = dir + target;
      return { user: null };
    }
  }

  // 渲染侧边栏 + 顶栏
  renderSidebar(module);
  renderHeader(module);

  // 强调色（主题色个性化：R1-A 后按作用域解析——登录人 person 覆盖 / 访客全局键 /
  // 无覆盖回落角色默认，渲染时取当前值；与 settings/--app-accent 同源，
  // 替代原 constants resolveAccentRole 全局键读取（冻结读取点语义，服务访客与首帧兜底））
  let accent, accentRgba, accentBorder;
  if (accentRole) {
    ({ accent, accentRgba, accentBorder } = accentAlpha
      ? getAppliedAccentColors(accentRole, accentAlpha[0], accentAlpha[1])
      : getAppliedAccentColors(accentRole));
    // 全局主题色变量（--app-accent 三件套）：cs-menu 选中项 / chips 选中态等
    // 「统一主题色渲染」跟随当前用户主题色（支书 2026-08-08 三审定稿，弃用金实底）
    const root = document.documentElement;
    root.style.setProperty('--app-accent', accent);
    root.style.setProperty('--app-accent-bg', accentRgba);
    root.style.setProperty('--app-accent-border', accentBorder);
  }

  // 统一预加载所有 Service（并行，不阻塞渲染但保证后续同步调用有数据）
  // 修复跨页面数据不同步：之前 ws-secretary-entry 同步调用 IssueStore.getAll() 拿到空数组
  try {
    await Promise.all([
      IssueStore.loadAll(),
      MilestoneStore.loadAll(),
    ]);
  } catch (e) {
    console.warn('[bootstrap] Service 预加载失败：', e);
  }

  return { user, accent, accentRgba, accentBorder };
}
