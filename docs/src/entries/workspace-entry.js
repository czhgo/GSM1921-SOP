// role: [工程师]+[AI]
// workspace-entry.js — 工作台入口（重构版）
// 变化: 去掉角色选择面板，改为自动跳转到角色子页面
// 第3轮 Task 3: 加入 ROUTE_LOCK 防护 + 使用 getEffectiveRole

import { AuthStore } from '../services/auth.js?v=20260810a';
import { getBasePath } from '../core/utils.js?v=20260810a';

// ── 跳转循环防护 ──────────────────────────────────
// 500ms 内同角色不重复跳转，防止快速点击导致反复跳转
const ROUTE_LOCK_KEY = 'gsm1921-route-lock';
const ROUTE_LOCK_TTL = 500;

function _acquireRouteLock(targetRole) {
  const now = Date.now();
  try {
    const raw = sessionStorage.getItem(ROUTE_LOCK_KEY);
    if (raw) {
      const lock = JSON.parse(raw);
      if (lock.targetRole === targetRole && (now - lock.timestamp) < ROUTE_LOCK_TTL) {
        return false;  // 锁未过期，不跳转
      }
    }
  } catch {}
  try {
    sessionStorage.setItem(ROUTE_LOCK_KEY, JSON.stringify({
      targetRole,
      timestamp: now,
    }));
  } catch {}
  return true;
}

// ── 跳转逻辑 ──────────────────────────────────────
const user = AuthStore.getCurrentUser();
if (!user) {
  window.location.href = getBasePath() + 'login.html';
} else {
  // 使用 getEffectiveRole 而非 user.role，保证切换视角后跳转到正确页面
  const effectiveRole = AuthStore.getEffectiveRole(user.personId);
  const page = AuthStore.getPageForRole('workspace', effectiveRole);
  if (page) {
    if (_acquireRouteLock(effectiveRole)) {
      window.location.replace(getBasePath() + 'workspace/' + page);
    }
  } else {
    // 无对应页面的角色（如 participant）→ 跳转 visitor
    if (_acquireRouteLock('visitor')) {
      window.location.replace(getBasePath() + 'workspace/visitor.html');
    }
  }
}
