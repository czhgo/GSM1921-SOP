// role: [工程师]+[AI]
// services/permission-manager.js — 权限管理服务（重构后从 auth.js 导出）
// 原独立逻辑已合并到 auth.js 的 PermissionManager 中
// 此文件保留以确保现有 import 路径不中断

export { PermissionManager } from './auth.js';
