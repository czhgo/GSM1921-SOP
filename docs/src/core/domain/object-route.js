// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  object-route.js — 「对象详情」路由单一判定（Task 6 · 2026-10-26）
//
//  口径（支书 2026-10-26 裁定「按最小三成本的显式路由」）：
//    direct — 直达详情页：入口不在对象所属工作台内（通知/待办对象卡、首页、共享日历、
//             跨页分享/深链、归档库行）。这些入口没有可保留的筛选/列表上下文。
//    locate — 同页定位：入口已在对象所属工作台（支书「活动管理」、组织台「专班管理」、
//             成员「项目分工」、组长「本组活动」、工作概况预览、归档弹窗）。整页跳走会丢
//             筛选/列表上下文 ⇒ 同页预览 + 「打开完整页」。
//    none   — 不渲染可点入口：缺 id / 跨支部无权限 / 未知入口（每个入口必须显式声明）。
//
//  纯函数（无 DOM / 不读 Store）：viewer 与 obj 由调用方传入；调用方自行用 AuthStore 取值。
// ════════════════════════════════════════════════════════════════
import { isTaskforceTerminalStatus } from './domain.js?v=20261028a';

/** 对象类型 → 完整详情页（唯一两种承载面；不得在别处再拼第二套详情页） */
export const OBJECT_DETAIL_PAGES = Object.freeze({
  activity: 'activity.html',
  taskforce: 'taskforce.html',
});

/** 可查看对象详情的特权角色：党委（party-staff）/ 组织员（org-commissioner） */
const PRIVILEGED_DETAIL_ROLES = Object.freeze(['party-staff', 'org-commissioner']);

/**
 * 入口矩阵（单一源）：每个入口只声明一种 mode，并写清「为什么不是另一种」。
 * 新增入口必须在此登记；`resolveObjectRoute` 对未登记入口返回 none。
 */
export const OBJECT_ROUTE_ENTRIES = Object.freeze({
  // direct：入口不在对象所属工作台内
  notice: {
    mode: 'direct',
    reason: '通知不在对象所属工作台内，对象卡是唯一动作，直达详情页成本最低',
  },
  todo: {
    mode: 'direct',
    reason: '待办动作跨工作台聚合，入口没有活动/专班的筛选或列表上下文；不走 locate 以免多一次落台再定位',
  },
  home: {
    mode: 'direct',
    reason: '首页是跨对象聚合面，不是活动/专班的工作台；不走 locate 因为首页没有可保留的对象列表',
  },
  today: {
    mode: 'direct',
    reason: '「今天」是跨对象日程摘要，不是对象所属工作台；不走 locate 因为日程行没有所属列表',
  },
  'shared-calendar': {
    mode: 'direct',
    reason: '六台共享日历只读且不承载完整详情；同页只放第二套详情面会违反「同页只有一个完整详情落点」，故直达',
  },
  'cross-page-deeplink': {
    mode: 'direct',
    reason: '跨页分享/深链没有来源工作台上下文；不走 locate 因为落点工作台未知',
  },
  'archive-row': {
    mode: 'direct',
    reason: '归档库是跨对象聚合面，归档行本身不提供就地编辑；不走 locate 因为归档库不是对象所属工作台',
  },
  'workspace-aggregate': {
    mode: 'direct',
    reason: '工作台内的跨对象列表（如项目分工的活动卡）不承载完整活动详情；不走 locate 因为列表本身不是该活动的所属工作台',
  },

  // locate：入口已在对象所属工作台 / 预览面内
  'owner-workspace': {
    mode: 'locate',
    reason: '入口已在对象所属工作台，整页跳走会丢失筛选/列表上下文；同页预览 + 「打开完整页」',
  },
  'archive-modal': {
    mode: 'locate',
    reason: '归档弹窗是归档库列表内的预览面，跳走会丢列表与页码；保留预览并补「打开完整页」',
  },
  'overview-preview': {
    mode: 'locate',
    reason: '工作概况预览卡已经是同页只读详情面；保留预览再加「打开完整页」，不再整页跳走',
  },
});

/**
 * 对象是否处于终态（只读保留）。
 * 统一口径：活动＝archived；专班＝completed / archived / dissolved（与归档库同一 `isTaskforceTerminalStatus`）。
 * @param {'activity'|'taskforce'} type
 * @param {Object} obj
 * @returns {boolean}
 */
export function isTerminal(type, obj) {
  if (!obj) return false;
  if (type === 'activity') return obj.archived === true;
  if (type === 'taskforce') return isTaskforceTerminalStatus(obj.status);
  return false;
}

/**
 * 可否查看对象详情（门）：
 *   · 缺 id → 拒绝；
 *   · 党委/组织员 → 可看；
 *   · 同支部（或任一方未声明 branchId，无法判定）→ 可看；
 *   · 两方 branchId 都已知且不同 → 跨支部普通角色拒绝。
 * @param {{type?:string, obj?:Object, viewer?:Object}} args
 * @returns {boolean}
 */
export function canViewObjectDetail({ type = 'activity', obj, viewer } = {}) {
  if (!OBJECT_DETAIL_PAGES[type]) return false;
  const id = String(obj?.id ?? '').trim();
  if (!id) return false;
  if (!viewer) return true; // 未登录：公开详情页仍可打开，是否存在由详情页判定
  if (PRIVILEGED_DETAIL_ROLES.includes(viewer.role)) return true;
  const objBranch = String(obj.branchId || '').trim();
  const viewerBranch = String(viewer.branchId || '').trim();
  if (objBranch && viewerBranch && objBranch !== viewerBranch) return false;
  return true;
}

/**
 * 统一解析对象入口。
 * @param {{type?:'activity'|'taskforce', obj?:Object, viewer?:Object, entry?:string}} args
 * @returns {{mode:'direct'|'locate'|'none', href:string, readOnly:boolean, reason:string}}
 */
export function resolveObjectRoute({ type = 'activity', obj, viewer, entry } = {}) {
  const page = OBJECT_DETAIL_PAGES[type];
  if (!page) return _none('unsupported-type');
  const entryDef = OBJECT_ROUTE_ENTRIES[entry];
  if (!entryDef) return _none(`unknown-entry:${entry || 'missing'}`);
  const id = String(obj?.id ?? '').trim();
  if (!id) return _none('missing-id');
  if (!canViewObjectDetail({ type, obj, viewer })) return _none('forbidden');
  return {
    mode: entryDef.mode,
    href: `${page}?id=${encodeURIComponent(id)}`,
    readOnly: isTerminal(type, obj),
    reason: entryDef.reason,
  };
}

/**
 * 详情页 URL 单一出口（供渲染点使用）。缺 id / 无权限 → 返回空串（调用方不得渲染可点入口）。
 * @param {'activity'|'taskforce'} type
 * @param {string} id
 * @param {{entry?:string, obj?:Object, viewer?:Object}} [opts]
 * @returns {string}
 */
export function objectDetailHref(type, id, { entry = 'notice', obj = null, viewer = null } = {}) {
  const route = resolveObjectRoute({ type, obj: { ...(obj || {}), id }, viewer, entry });
  return route.mode === 'none' ? '' : route.href;
}

function _none(reason) {
  return { mode: 'none', href: '', readOnly: false, reason };
}
