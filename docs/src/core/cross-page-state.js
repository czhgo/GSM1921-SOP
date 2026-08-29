// role: [工程师]+[AI]
// cross-page-state.js — 跨页面状态管理
// 使用 sessionStorage 传递会话级状态，localStorage 传递持久数据
// 第3轮 Task 8: 追加 setParam/getParam/clearParam 统一 URL params + sessionStorage 双轨

const SESSION_KEY = 'sop_org_os_session';
const DATA_VERSION_KEY = 'sop_org_os_data_version';
const CPS_PREFIX = 'cps-';  // 单值参数前缀，与 SESSION_KEY 区隔

/**
 * 代码数据版本（2026-08-01 引入）
 * 作用：防止"旧 tab 持有旧 ES 模块"导致页面显示旧数据（如 50 人扩容前的 27 人版 people.js）。
 * 每次更新 docs/src 下的 mock/服务代码时，将本常量 +1，所有页面首次打开会自动刷新一次加载新模块。
 * 自检逻辑见 bootstrapPage()。
 */
const CODE_VERSION = 57;

export const CrossPageState = {
  save(session) {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        selectedRole: session.selectedRole || 'participant',
        viewArchived: !!session.viewArchived,
        activeModule: session.activeModule || 'dashboard',
        selectedActivityId: session.selectedActivityId || null,
        displayMonth: session.displayMonth || null,
      }));
    } catch (_) {}
  },

  load() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return {
      selectedRole: 'participant',
      viewArchived: false,
      activeModule: 'dashboard',
      selectedActivityId: null,
      displayMonth: null,
    };
  },

  navigateTo(page, extraState) {
    if (extraState) this.save({ ...this.load(), ...extraState });
    window.location.href = page;
  },

  bumpDataVersion() {
    try {
      const v = parseInt(localStorage.getItem(DATA_VERSION_KEY) || '0', 10) + 1;
      localStorage.setItem(DATA_VERSION_KEY, String(v));
    } catch (_) {}
  },

  getDataVersion() {
    try {
      return parseInt(localStorage.getItem(DATA_VERSION_KEY) || '0', 10);
    } catch (_) {}
    return 0;
  },

  /**
   * 检测当前页面是否持有旧代码数据版本（需要自动刷新一次）
   * 防无限刷新：reload 后 sessionStorage 标记已处理，本会话内不再二次刷新
   * @returns {boolean}
   */
  isStaleCodeVersion() {
    try {
      if (sessionStorage.getItem(CPS_PREFIX + 'reloaded')) return false;
      if (this.getDataVersion() === CODE_VERSION) return false;
      sessionStorage.setItem(CPS_PREFIX + 'reloaded', '1');
      return true;
    } catch (_) {
      return false;  // localStorage/sessionStorage 不可用时不自检，退化为手动刷新
    }
  },

  buildURL(page, params) {
    const url = new URL(page, window.location.href);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v != null && v !== '') url.searchParams.set(k, v);
      });
    }
    return url.pathname + url.search;
  },

  getURLParams() {
    const params = {};
    try {
      const sp = new URLSearchParams(window.location.search);
      sp.forEach((v, k) => { params[k] = v; });
    } catch (_) {}
    return params;
  },

  // ── 单值参数 API（URL params + sessionStorage 双轨） ──────
  // 用途：替代散落的 URLSearchParams 直接调用
  // - URL params 作为跨页面传递的载体（书签/分享友好）
  // - sessionStorage 作为同源页面间快速读取的缓存
  // - 写入时同时更新 URL 和 sessionStorage
  // - 读取时优先 sessionStorage（同源快），回退 URL params

  /**
   * 设置单值参数（同步更新 URL 和 sessionStorage）
   * @param {string} key
   * @param {string} value
   */
  setParam(key, value) {
    // 更新 URL（history.replaceState，不触发跳转）
    try {
      const url = new URL(window.location.href);
      url.searchParams.set(key, value);
      window.history.replaceState({}, '', url);
    } catch (_) {}
    // 同步到 sessionStorage
    try {
      sessionStorage.setItem(CPS_PREFIX + key, value);
    } catch (_) {}
  },

  /**
   * 获取单值参数（优先 sessionStorage，回退 URL params）
   * @param {string} key
   * @returns {string|null}
   */
  getParam(key) {
    // 优先 sessionStorage
    try {
      const ssVal = sessionStorage.getItem(CPS_PREFIX + key);
      if (ssVal !== null) return ssVal;
    } catch (_) {}
    // 回退 URL params
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get(key);
    } catch (_) {
      return null;
    }
  },

  /**
   * 清除单值参数
   * @param {string} key
   */
  clearParam(key) {
    // 清 URL
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete(key);
      window.history.replaceState({}, '', url);
    } catch (_) {}
    // 清 sessionStorage
    try {
      sessionStorage.removeItem(CPS_PREFIX + key);
    } catch (_) {}
  },
};

