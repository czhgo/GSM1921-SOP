// role: [工程师]+[AI]
// bootstrap.js — 页面初始化统一入口（重构版）
// 变化: 去掉 ViewModeStore/CrossPageState/setActiveRole，改为基于 getCurrentUser() 的登录检查
// 第3轮 Task 9: dev 参数读取改用 CrossPageState.getParam（统一入口）
// 2026-07-30: 改为 async，统一预加载所有 Service（IssueStore/MilestoneStore），消除跨页面数据不同步

import { renderSidebar } from '../../components/shell/sidebar.js?v=20261025b';
import { renderHeader } from '../../components/shell/header.js?v=20261025b';
import { AuthStore } from '../../services/core/auth.js?v=20261025b';
import { IssueStore } from '../../services/governance/issues.js?v=20261025b';
import { MilestoneStore } from '../../services/governance/milestones.js?v=20261025b';
import { CrossPageState } from '../session/cross-page-state.js?v=20261025b';
import { getBasePath } from '../base/utils.js?v=20261025b';
import { resolveDocumentUrl } from '../base/page-url.js?v=20261025b';
import { enhanceSelects } from '../../components/ui/custom-select.js?v=20261025b';
import { isBranchPendingUser } from '../domain/constants.js?v=20261025b';
// 主题色解析（R1-A 点⑤，2026-09-09）：person-aware 渲染时取色——替代只读全局键的
// constants resolveAccentRole（冻结读取点语义，仅服务访客与首帧兜底）；返回值（壳 ctx.accent →
// tab-bar/各 tab）统一取「当前作用域生效主题」，与 styles.css 别名同源。
// 批次 505：注入改为 8 token × 亮/暗共 16 个原始变量（applyAccentThemeTokens），不再写 --app-accent 旧四件套。
import { getAppliedAccentColors, resolveAppliedAccentRole, applyAccentThemeTokens } from './theme.js?v=20261025b';
import { registerApiAdapter, init, renderDataSourceError, hydrateDataSource } from '../../data/data-adapter.js?v=20261025b';
import { ApiAdapter } from '../../data/api-adapter.js?v=20261025b';
import { getCapabilities } from './registry.js?v=20261025b';
// M4 数据源注册化：副作用导入触发 mock/api 数据源能力注册，bootstrap 经注册表选择数据源
import '../../capabilities/data-source.js?v=20261025b';
// M6（2026-08-30）：共享组件能力随全局引导注册（todo-list/calendar/custom-select），所有页面可发现组件清单
import '../../capabilities/components.js?v=20261025b';

// ════════════════════════════════════════════════════════════════
// S2 自定义圆角下拉：全局自动增强（增量扫描）
// 任何时刻动态渲染出的 .input-flat select 都会被增强为自定义圆角下拉，
// 无需在各渲染点逐处调用（组件内 data-cs-enhanced 标记防重）。
//
// 2026-10-26 Task 2.4：原实现 = `MutationObserver(body, childList+subtree)` 每次 DOM 变更
//   都排一次**全文档** `querySelectorAll('select')`（工作台一次整块重建上千节点即触发，
//   鼠标 hover 时被同步布局扫描打断）。现改为：
//     · 回调只收集**新增节点**（addedNodes），不在回调里做任何查询（不阻塞渲染帧）；
//     · 60ms 合并后只扫描这些新增子树，且先剪掉被父根包含的子根、无 select 的根直接跳过；
//     · 首次仍全量扫一次（DOMContentLoaded / 模块载入）。
// ════════════════════════════════════════════════════════════════
let _csScanTimer = null;
let _csRoots = new Set();

function _scheduleEnhance(node) {
  if (node && node.nodeType === 1) _csRoots.add(node);
  if (_csScanTimer) return;
  _csScanTimer = setTimeout(_flushEnhance, 60);
}

function _flushEnhance() {
  _csScanTimer = null;
  const roots = [..._csRoots].filter((n) => n && n.isConnected !== false);
  _csRoots = new Set();
  // 新增节点可能整棵大树都在同一批里：去掉被其它根包含的子根，只扫最外层
  const outer = roots.filter((n) => !roots.some((other) => other !== n && other.contains(n)));
  for (const root of outer) {
    if (root.tagName === 'SELECT') {
      enhanceSelects(root.parentElement || root);
    } else if (root.querySelector && root.querySelector('select.input-flat:not([data-cs-enhanced])')) {
      enhanceSelects(root);
    }
  }
}

if (typeof MutationObserver !== 'undefined' && document.body) {
  new MutationObserver((records) => {
    for (const m of records) {
      for (const n of m.addedNodes) _scheduleEnhance(n);
    }
  }).observe(document.body, { childList: true, subtree: true });
}
// 首次全量一次（静态 HTML 里已有的 select）；此后只扫新增子树（Task 2.4）。
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => enhanceSelects(document));
} else {
  enhanceSelects(document);
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
  // 2026-10-26 Task 2.3：判定收窄在 `isStaleCodeVersion()` 内部——首次访问只记基线不 reload，
  //   版本不一致时写回当前 CODE_VERSION 再 reload（reload 后即相等，不再每次新会话都双载）。
  if (CrossPageState.isStaleCodeVersion()) {
    window.location.reload();
    return { user: null };
  }

  // ── IAAA 待归属阻断层（前置）──────────────────────────────────────────────
  // 判据单一源仍是 `isBranchPendingUser`（下方登录检查处同一判据）。**必须在 init() 之前**：
  // 待归属账号访问支部资源会被服务端 `requireAssignedBranch` 403，init() 随即抛错并在这里 return
  // 「无法连接服务器」——永远走不到下方重定向（U4 回归）。前置判定只读本地会话，无网络依赖。
  if (module === 'workspace' && isBranchPendingUser(AuthStore.getCurrentUser())) {
    window.location.href = resolveDocumentUrl('login.html', { searchParams: { 'need-branch': '1' } });
    return { user: null, needBranch: true };
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
      window.location.href = resolveDocumentUrl('login.html');
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
    window.location.href = resolveDocumentUrl('login.html', { searchParams: { 'need-branch': '1' } });
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

    // A② 归档兜底放行门已撤（D-807④ 2026-10-06）：支书/副支书不再进入宣传台——
    // 代归档改由支书台待办「代归档」按钮本台浮窗直执（todo-tab.js::_openDelegateArchiveModal）。

    // 组织者兜底放行门已撤（D-808 · 2026-10-06 支书圈甲「组长和组织者是两个概念」）：
    // 组织者的考勤/考察上传位改挂【成员本人】页面（visitor 两 tab 顶部「由我组织的活动」区），
    // 组长台回归组长本人使用——不再按「人」放行非组长进 leader.html。

    if (!allowedPages.has(currentPage)) {
      // 跳转目标：以登录快照身份为准（与身份标签一致）；缺失时回退内存判定角色页面
      const target = snapPage || memPage || 'visitor.html';
      // 基于当前 pathname 计算目标目录，避免依赖 <base> 的解析差异
      const dir = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
      window.location.href = dir + target;
      return { user: null };
    }
  }

  // ── 首屏不阻塞（2026-10-26 Task 2.3）──
  // 反馈 / 里程碑首拉（mock 形态各是一次 fetch('./data/*.json')）原为「串行 await 后再进 tab 壳」，
  // 把页签栏与首屏内容整体推迟至少一次网络往返。现只**发起**、不等待：
  //   消费方（work-overview / overview-dispatch-bar / 各 tab）渲染前都会 await 同一 loadAll
  //   （幂等缓存：首次完成后直接命中），数据到达即在原位补齐，不会把空快照当终态。
  Promise.all([
    IssueStore.loadAll(),
    MilestoneStore.loadAll(),
  ]).catch((e) => {
    console.warn('[bootstrap] Service 预加载失败（不阻塞首屏）：', e);
  });

  // 渲染侧边栏 + 顶栏
  renderSidebar(module);
  renderHeader(module);

  // 主题色（批次 505：8 token × 亮/暗 = 16 个原始变量；R1-A 后按作用域解析——登录人 person 覆盖 /
  // 访客全局键 / 无覆盖回落默认金，渲染时取当前值；与 settings/theme.js 同源）。
  // 只注入原始变量，--app-accent / -soft-bg / -strong-bg 等**别名由 styles.css 按日夜选边**承接，
  // 故切换亮/暗无需重新注入（幂等）。
  let accent, accentRgba, accentBorder;
  if (accentRole) {
    const appliedKey = resolveAppliedAccentRole(accentRole);
    ({ accent, accentRgba, accentBorder } = getAppliedAccentColors(accentRole));
    applyAccentThemeTokens(document.documentElement, appliedKey);
  }

  // 统一预加载所有 Service（并行，不阻塞渲染但保证后续同步调用有数据）
  // 修复跨页面数据不同步：之前 ws-secretary-entry 同步调用 IssueStore.getAll() 拿到空数组
  // 2026-10-26 Task 2.3：改为在 renderHeader 之前**发起**且不 await（见上），此处不再串行等待。

  return { user, accent, accentRgba, accentBorder };
}
