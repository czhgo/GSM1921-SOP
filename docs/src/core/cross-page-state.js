// role: [人机]
// cross-page-state.js — 跨页面状态管理
// 使用 sessionStorage 传递会话级状态，localStorage 传递持久数据

const SESSION_KEY = 'sop_org_os_session';
const DATA_VERSION_KEY = 'sop_org_os_data_version';

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

  buildURL(page, params) {
    const url = new URL(page, window.location.origin);
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
};
