// role: [工程师]+[AI]
// core/domain/material-links.js — 材料闭环「角色 × 材料行 → 本位落点」真值契约（2026-10-20 IA 修复 Task 2）
//
// 为什么要有这一层：
//   工作台身份门（core/boot/bootstrap.js）只放行本人角色台。材料闭环页此前对所有人硬编码
//   `workspace/disc.html?tab=attendance` 之类的跨台链接——组长点「考勤」会被弹回 leader.html，
//   且 `tab` 与活动对象全部丢失。落点必须按「该角色 + 该对象 + 该步骤」计算，不能一处写死给所有人。
//   无本位动作时返回 null（页面只渲染纯文本交接，不渲染假按钮）。
//
// 纪律：纯函数、不依赖 DOM / 不 import 任何浏览器模块 ⇒ Node 可直接 import
//   （守卫：server/test/material-link-truth.test.mjs）。role 取 AuthStore.getCurrentUser().role 的值。

import { SECRETARY_AND_DEPUTY_ROLES, rolesForPage } from './constants.js?v=20261023b';

export const MATERIAL_ROWS = ['photos', 'attendance', 'inspection', 'review'];

// 角色集单一源：支书/副支书引 constants；组长层（含副职）由 ROLE_PAGE_MAP 反查派生（同页同台同落点，D-571）。
const SECRETARY_ROLES = new Set(SECRETARY_AND_DEPUTY_ROLES);
const LEADER_ROLES = new Set(rolesForPage('leader.html'));

const _id = (actId) => (actId == null ? '' : String(actId));

/**
 * 解析某角色在某材料行上的本位落点（**不含 basePath** 的相对路径；null＝该角色无本位动作）。
 * @param {{ role?: string, isOrganizer?: boolean, actId?: string, row?: string }} args
 * @returns {string|null}
 */
export function resolveMaterialHref({ role, isOrganizer = false, actId, row } = {}) {
  if (!MATERIAL_ROWS.includes(row)) return null;
  const id = _id(actId);

  if (SECRETARY_ROLES.has(role)) {
    if (row === 'photos') return null; // 本页可直接归档，不跨台
    if (row === 'review') return 'workspace/secretary.html?tab=group-progress';
    return id ? `workspace/secretary.html?activityId=${encodeURIComponent(id)}` : null;
  }

  if (role === 'org-commissioner') {
    // 组织台没有考勤上传位；考察只在本台「人才库」建档汇总。
    return row === 'inspection' ? 'workspace/org.html?tab=talent' : null;
  }

  if (role === 'prop-commissioner') {
    if (row !== 'photos') return null;
    // 缺件 focus：宣传台档案归档按活动定位。
    return id
      ? `workspace/prop.html?tab=archive&focusActivityId=${encodeURIComponent(id)}`
      : 'workspace/prop.html?tab=archive';
  }

  if (role === 'disc-commissioner') {
    if (row === 'photos') return null;
    return id
      ? `workspace/disc.html?tab=${row}&focusActivityId=${encodeURIComponent(id)}`
      : null;
  }

  if (LEADER_ROLES.has(role)) {
    if (row === 'photos' || !id) return null;
    // 组长台的复盘状态落在「组员进展」内（只读），其余行与页签同 id。
    const tab = row === 'review' ? 'members' : row;
    return `workspace/leader.html?tab=${tab}&focusActivityId=${encodeURIComponent(id)}`;
  }

  if (role === 'participant') {
    if (!isOrganizer || row === 'photos') return null;
    // 成员组织者的考勤上传位长在本人页「由我组织的活动」区（#org-host 锚点）。
    if (row === 'attendance') return 'workspace/visitor.html?tab=attendance#org-host';
    return id
      ? `workspace/visitor.html?tab=${row}&focusActivityId=${encodeURIComponent(id)}`
      : null;
  }

  // 未知角色（如党委组织员）在本页无本位动作：只给纯文本交接，不造假入口。
  return null;
}

/**
 * 无本位落点时给一句「交给谁」的纯文本交接（与 resolveMaterialHref 同判据）。
 * @param {{ role?: string, isOrganizer?: boolean, row?: string }} args
 * @returns {string}
 */
export function resolveMaterialHandoff({ role, isOrganizer = false, row } = {}) {
  if (!MATERIAL_ROWS.includes(row)) return '';

  if (row === 'photos') {
    if (role === 'prop-commissioner') return '由宣传委员在本位归档';
    if (SECRETARY_ROLES.has(role)) return '宣传材料由宣传委员补交；本页可直接归档';
    return '由宣传委员补材料';
  }

  if (row === 'attendance') {
    if (SECRETARY_ROLES.has(role)) return '考勤由本场组织者 / 纪检委员上传（本页只读）';
    if (role === 'disc-commissioner') return '纪检委员确认会议考勤';
    if (LEADER_ROLES.has(role)) return '组长上传本组考勤';
    if (role === 'participant' && isOrganizer) return '在本台上传本场考勤';
    return '由组织者 / 纪检上传';
  }

  if (row === 'inspection') {
    if (SECRETARY_ROLES.has(role)) return '考察由该场组织者提交、纪检委员确认（本页只读）';
    if (role === 'org-commissioner') return '组织委员在「人才库」建档汇总';
    if (role === 'disc-commissioner') return '纪检委员确认 / 打回考察';
    if (LEADER_ROLES.has(role)) return '组长上传本组考察';
    if (role === 'participant' && isOrganizer) return '在本台提交本场考察';
    return '由组织者提交、纪检确认';
  }

  // review
  if (SECRETARY_ROLES.has(role)) return '复盘状态在「组员进展」只读查看';
  if (role === 'disc-commissioner') return '纪检委员监督 / 督办复盘';
  if (LEADER_ROLES.has(role)) return '复盘状态在「组员进展」只读查看';
  if (role === 'participant' && isOrganizer) return '在本台提交本场复盘';
  return '由组织者提交';
}

/**
 * 页内「上传仍走各本位」说明：只描述**当前角色**能做的动作（不再给所有人同一段全台说明）。
 * @param {{ role?: string, isOrganizer?: boolean }} args
 * @returns {string}
 */
export function resolveMaterialRoleNote({ role, isOrganizer = false } = {}) {
  if (SECRETARY_ROLES.has(role)) {
    return '本页集中核对材料并提交归档；上传仍走各本位：宣传材料→宣传委员，考勤 / 考察→本场组织者或纪检委员，复盘→组织者。';
  }
  if (role === 'prop-commissioner') {
    return '本页集中核对材料；宣传材料在宣传台「档案归档」上传，考勤 / 考察 / 复盘由对应本位补齐。';
  }
  if (role === 'org-commissioner') {
    return '本页集中核对材料；考察建档在本台「人才库」，考勤 / 考察上传由本场组织者或纪检委员办理，宣传材料由宣传委员补交。';
  }
  if (role === 'disc-commissioner') {
    return '本页集中核对材料；考勤 / 考察在本台「考勤管理 / 考察管理」确认，宣传材料由宣传委员补交，复盘由组织者提交。';
  }
  if (LEADER_ROLES.has(role)) {
    return '本页集中核对材料；本组考勤 / 考察在组长台上传，宣传材料由宣传委员补交，复盘由组织者提交。';
  }
  if (role === 'participant' && isOrganizer) {
    return '本页集中核对材料；本场考勤 / 考察在本台上传，复盘在「我的复盘」提交，宣传材料由宣传委员补交。';
  }
  return '本页只读核对；材料由本场组织者、纪检委员与宣传委员按本位补齐，你无需另行上传。';
}
