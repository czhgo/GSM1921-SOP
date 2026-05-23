// role: [人机]
// services/permission-manager.js — 统一权限管理服务
// 封装站位切换、角色选择、模式推导的完整流程，
// 消除 header.js / sidebar.js 中的重复逻辑

import { AuthStore, ViewModeStore } from './auth.js';

export const PermissionManager = {
  /**
   * 切换站位（header 站位选择器调用）
   * 完整流程：设置站位 → 重置视图 → 推导模式 → 触发事件
   * @param {string} newStance - 新站位
   * @param {string} module - 当前模块
   */
  switchStance(newStance, module) {
    if (!newStance || !module) return;

    AuthStore.setPrimaryRole(newStance);
    AuthStore.setActiveRole(module, newStance);

    const mode = AuthStore.deriveMode(newStance, newStance);
    ViewModeStore.setMode(module, mode === 'manage' ? 'manage' : 'observe');

    document.dispatchEvent(new CustomEvent('permission:stance-change', {
      detail: { stance: newStance, module, mode },
      bubbles: true,
    }));
  },

  /**
   * 选择角色视图（sidebar 角色卡片调用）
   * 完整流程：确保站位 → 设置角色 → 推导模式 → 触发事件
   * @param {string} role - 选择的角色
   * @param {string} module - 当前模块
   * @returns {{ stance: string, role: string, mode: string }}
   */
  selectRole(role, module) {
    if (!role || !module) return { stance: '', role, mode: 'observe' };

    const stance = AuthStore.getPrimaryRole() || AuthStore.getLoginStance();
    if (!AuthStore.getPrimaryRole()) {
      AuthStore.setPrimaryRole(stance);
    }

    AuthStore.setActiveRole(module, role);

    const mode = AuthStore.deriveMode(stance, role);
    ViewModeStore.setMode(module, mode === 'manage' ? 'manage' : 'observe');

    document.dispatchEvent(new CustomEvent('permission:role-select', {
      detail: { role, module, mode, stance: AuthStore.getPrimaryRole() },
      bubbles: true,
    }));

    return { stance, role, mode };
  },

  /**
   * 恢复角色视图（sidebar 初始化恢复已保存角色时调用）
   * 仅设置角色和模式，不触发 role-select 事件（避免导航跳转）
   * @param {string} role - 恢复的角色
   * @param {string} module - 当前模块
   */
  restoreRole(role, module) {
    if (!role || !module) return;

    const stance = AuthStore.getPrimaryRole() || AuthStore.getLoginStance();
    if (!AuthStore.getPrimaryRole()) {
      AuthStore.setPrimaryRole(stance);
    }

    AuthStore.setActiveRole(module, role);

    const mode = AuthStore.deriveMode(stance, role);
    ViewModeStore.setMode(module, mode === 'manage' ? 'manage' : 'observe');
  },
};
