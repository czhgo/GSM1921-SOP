// role: [工程师]+[AI]
// login-snapshot.js — 登录快照轻量读取（零依赖，静态页登录态感知用）
// 2026-08-12 新增：about/help 等静态文档页需「登录态感知壳」——已登录用户从 app 页
// 跳转过来时，侧边栏/顶栏要显示工作台入口/退出登录/身份标签，与 app 页一致；
// 但静态页不得预加载数据层（auth→runtime→mock 全链）。本模块只读 localStorage/
// sessionStorage 快照判断登录态，零依赖零副作用；确需完整登录态时由调用方按需
// 动态 import services/auth.js。
// ⚠️ 键名与 services/auth.js 的 LOGIN_KEY/TAB_KEY/SESSION_KEY 保持一致，
//    修改时须两处同步（C-2 一改具改巡检项）。
const LOGIN_KEY = 'gsm1921-login-user';
const TAB_KEY = 'gsm1921-tab-id';
const SESSION_KEY = 'gsm1921-session-snap';

/**
 * 读取当前登录快照（纯读，无副作用）
 * 与 auth.js getCurrentUser 的判定口径一致（A-11 防串扰：tabId 校验 + 会话快照回退）：
 * - 未登录 → null
 * - 本标签页登录 → { personId, role }
 * - 其它标签页写入的登录（tabId 不匹配）→ 回退本标签页会话快照；无快照 → null
 * @returns {{ personId: string, role: string } | null}
 */
export function readLoginSnapshot() {
  try {
    const raw = localStorage.getItem(LOGIN_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const tabId = sessionStorage.getItem(TAB_KEY);
    if (data.tabId && data.tabId !== tabId) {
      const snapRaw = sessionStorage.getItem(SESSION_KEY);
      if (snapRaw) return JSON.parse(snapRaw);
      return null;
    }
    if (data.userId && !data.personId) data.personId = data.userId; // 旧格式迁移（只读态）
    return data;
  } catch {
    return null;
  }
}
