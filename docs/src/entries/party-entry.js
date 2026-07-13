// role: [工程师]+[AI]
// party-entry.js — 党务管理入口（重构版）
// 变化: 去掉角色选择面板，改为自动跳转到角色子页面
// 第3轮 Task 3: 加入 ROUTE_LOCK 防护 + 使用 getEffectiveRole

import { AuthStore } from '../services/auth.js';
import { getBasePath } from '../core/utils.js';

// ── 跳转循环防护 ──────────────────────────────────
const ROUTE_LOCK_KEY = 'gsm1921-route-lock';
const ROUTE_LOCK_TTL = 500;

function _acquireRouteLock(targetRole) {
  const now = Date.now();
  try {
    const raw = sessionStorage.getItem(ROUTE_LOCK_KEY);
    if (raw) {
      const lock = JSON.parse(raw);
      if (lock.targetRole === targetRole && (now - lock.timestamp) < ROUTE_LOCK_TTL) {
        return false;
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
  const effectiveRole = AuthStore.getEffectiveRole(user.userId);
  const page = AuthStore.getPageForRole('party', effectiveRole);
  if (page) {
    if (_acquireRouteLock(effectiveRole)) {
      window.location.replace(getBasePath() + 'party/' + page);
    }
  } else {
    // leader / participant 无 party 页面 → 跳转主页
    if (_acquireRouteLock('home')) {
      window.location.replace(getBasePath() + 'index.html');
    }
  }
}
