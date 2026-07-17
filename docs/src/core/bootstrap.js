// role: [工程师]+[AI]
// bootstrap.js — 页面初始化统一入口（重构版）
// 变化: 去掉 ViewModeStore/CrossPageState/setActiveRole，改为基于 getCurrentUser() 的登录检查
// 第3轮 Task 9: dev 参数读取改用 CrossPageState.getParam（统一入口）
// 2026-07-18: dev 模式扩展支持 organizer / deep 项目角色（spec §3.5.1）

import { renderSidebar } from '../components/sidebar.js';
import { renderHeader } from '../components/header.js';
import { AuthStore } from '../services/auth.js';
import { getAccentColors } from './constants.js';
import { CrossPageState } from './cross-page-state.js';
import { getBasePath } from './utils.js';
import { getPersonById } from '../mock/index.js';
import { ACTIVITIES } from '../mock/activities.js';
import { MOCK_TASKFORCES } from '../mock/taskforces.js';

// ════════════════════════════════════════════════════════════════
// 安全最佳实践：开发绕过白名单（security-best-practices Skill 指导）
// ════════════════════════════════════════════════════════════════
// ?dev=ROLE 是本地开发便捷绕过登录的机制，生产环境必须拒绝。
// 防护两层：(1) hostname 必须是本地回环；(2) ROLE 必须在白名单内。
const DEV_HOSTNAME_WHITELIST = new Set(['localhost', '127.0.0.1', '::1']);
const DEV_ROLE_WHITELIST = new Set([
  'secretary', 'deputy-secretary',
  'org-commissioner', 'prop-commissioner', 'disc-commissioner',
  'leader', 'participant',
  'organizer', 'deep',  // 新增（项目角色，spec §3.5.1）
]);

/**
 * 项目角色 dev 登录特殊处理（spec §3.5.1）
 * organizer / deep 不是 standing role，不能直接 devLogin。
 * 策略：在 mock 数据中找到第一个持有该 project role 的用户，
 *       用其 standing role 登录，再跳转到对应 workspace 页面。
 * @param {string} role - 'organizer' | 'deep'
 */
function _devLoginProjectRole(role) {
  let standingPersonId = null;

  // 1. 先在 ACTIVITIES.assignments 里找
  for (const a of ACTIVITIES) {
    if (Array.isArray(a.assignments)) {
      const rec = a.assignments.find(r => r.role === role);
      if (rec) {
        standingPersonId = rec.personId;
        break;
      }
    }
  }

  // 2. 兜底在 MOCK_TASKFORCES.members 里找
  if (!standingPersonId) {
    for (const t of MOCK_TASKFORCES) {
      if (Array.isArray(t.members)) {
        const m = t.members.find(x => x.role === role);
        if (m) {
          standingPersonId = m.personId;
          break;
        }
      }
    }
  }

  if (standingPersonId) {
    const person = getPersonById(standingPersonId);
    if (person) {
      // 用其 standing role 登录，跳转到对应 project role 页面
      AuthStore.login(person.id);
      const targetPage = role === 'organizer' ? 'workspace/organizer.html' : 'workspace/deep.html';
      window.location.href = getBasePath() + targetPage;
      return;
    }
  }

  // 降级：找不到 mock 用户 → participant + visitor.html
  console.warn(`[bootstrap] dev mode 找不到持有 ${role} 角色的 mock 用户，降级到 participant`);
  AuthStore.devLogin('participant');
  window.location.href = getBasePath() + 'workspace/visitor.html';
}

/**
 * 页面初始化统一入口（重构版）
 *
 * @param {Object} opts
 * @param {string} opts.module          — 模块名：'workspace' | 'party' | 'dashboard' | 'members' | 'archive' | 'search' | 'feedback'
 * @param {string} [opts.accentRole]    — 强调色角色键名（省略则不获取 accent 三件套）
 * @param {number[]} [opts.accentAlpha] — 自定义透明度 [bgAlpha, borderAlpha]
 *
 * @returns {{
 *   user: { personId: string, role: string } | null,
 *   accent: string|undefined,
 *   accentRgba: string|undefined,
 *   accentBorder: string|undefined
 * }}
 */
export function bootstrapPage({ module, accentRole, accentAlpha }) {
  // 登录检查
  const user = AuthStore.getCurrentUser();
  if (!user) {
    // 开发绕过：?dev=ROLE 仅在本地 hostname + 白名单角色时生效
    const devRole = CrossPageState.getParam('dev');
    const isLocalHost = DEV_HOSTNAME_WHITELIST.has(window.location.hostname);
    if (devRole && isLocalHost && DEV_ROLE_WHITELIST.has(devRole)) {
      // 项目角色特殊处理：organizer / deep 不是 standing role
      if (devRole === 'organizer' || devRole === 'deep') {
        _devLoginProjectRole(devRole);
        return { user: null };
      }
      AuthStore.devLogin(devRole);
      window.location.reload();
      return { user: null };
    }
    const base = window.location.pathname.includes('/workspace/') || window.location.pathname.includes('/party/')
      ? '../' : './';
    window.location.href = base + 'login.html';
    return { user: null };
  }

  // 渲染侧边栏 + 顶栏
  renderSidebar(module);
  renderHeader(module);

  // 强调色
  let accent, accentRgba, accentBorder;
  if (accentRole) {
    if (accentAlpha) {
      ({ accent, accentRgba, accentBorder } = getAccentColors(accentRole, accentAlpha[0], accentAlpha[1]));
    } else {
      ({ accent, accentRgba, accentBorder } = getAccentColors(accentRole));
    }
  }

  return { user, accent, accentRgba, accentBorder };
}
