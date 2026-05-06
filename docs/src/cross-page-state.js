// role: [人机]
// cross-page-state.js — 跨页面状态管理
// 使用 sessionStorage 传递会话级状态，localStorage 传递持久数据

const SESSION_KEY = 'sop_org_os_session';

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
};
