// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  work-map.js — 支部工作地图模块目录（L4 v2.1 单一源，2026-09-03）
//  书记裁决：11 项平铺放行（只列既有工作形式；无分类筐、无自造项、无党建/党务二分）。
//  模块归属与分工由支部自行建设（书记台「支部分工」），调整走支委会议题；
//  本文件的 defaultOwner 仅是「缺省建议」（源自 SOP/职责表），config.workforce=null 时兜底展示。
//  本文件纯 ESM 零依赖（浏览器 / node 测试双端可加载）。
// ════════════════════════════════════════════════════════════════

/**
 * 工作模块目录（顺序即平铺视图 A 的展示顺序；三会一课为单模块含 4 子会）
 * @typedef {Object} WorkMapModule
 * @property {string} id        模块 id（config.workforce 键，全局唯一）
 * @property {string} name      模块名（用户可见）
 * @property {string[]} [sub]   子项（三会一课 = 4 子会，标签沿用 ACTIVITY_CLASSIFICATION.subtypes）
 * @property {string} defaultOwner 缺省主责角色（role key；SOP/职责表草案，支委会可改）
 * @property {string} desc      一句话说明（卡面文案）
 * @property {string[]} [outputs] 产出交接标签（考勤/考察/宣传/材料，对应活动/专班运行产出）
 */
export const WORK_MAP_MODULES = [
  {
    id: 'three-meetings', name: '三会一课', defaultOwner: 'secretary',
    sub: ['支部党员大会', '支委会', '党小组会', '党课'],
    desc: '支部会议制度：党员大会/支委会/党小组会/党课按频次召开，议程-记录-考勤闭环',
    outputs: ['考勤', '宣传', '材料'],
  },
  {
    id: 'theme-party', name: '主题党日', defaultOwner: 'secretary',
    desc: '主题党日活动（含党小组主题党日；共建/外出/载体为正交维度），工作流块驱动',
    outputs: ['考勤', '宣传', '材料'],
  },
  {
    id: 'taskforce', name: '专班', defaultOwner: 'org-commissioner',
    desc: '专班全生命周期：创建-招募-运行-解散（组织委员最高优先级），负责人制',
    outputs: ['考勤', '考察', '材料'],
  },
  {
    id: 'joint-event', name: '共建活动', defaultOwner: 'secretary',
    desc: '跨组织合办活动（团支部合办等），场景 joint-event',
    outputs: ['宣传', '材料'],
  },
  {
    id: 'develop-party-member', name: '发展党员', defaultOwner: 'org-commissioner',
    desc: '发展党员管线：申请→积极分子→考察→发展对象→接收→转正（组织委员主责）',
    outputs: ['材料'],
  },
  {
    id: 'democratic-review', name: '民主评议党员', defaultOwner: 'secretary',
    desc: '年度民主评议党员（评议明细后续按 L3 manifest 补齐）',
  },
  {
    id: 'election', name: '换届选举', defaultOwner: 'secretary',
    desc: '换届选举（任命机制 + 票决；完整流程后续按 L3 manifest 补齐）',
  },
  {
    id: 'attendance-inspection', name: '考勤考察', defaultOwner: 'disc-commissioner',
    desc: '考勤管理 + 考察记录（纪检委员主责；活动/专班运行中的产出环节）',
    outputs: ['考勤', '考察'],
  },
  {
    id: 'feedback-handling', name: '意见反馈处理', defaultOwner: 'disc-commissioner',
    desc: '意见建议反馈处理（纪检委员主责；场景 feedback-handling + 反馈管理）',
  },
  {
    id: 'rule-making', name: '制度制定与迭代', defaultOwner: 'secretary',
    desc: '制度/章程制定与迭代（场景 new-system；支部自治事项）',
  },
  {
    id: 'info-platform', name: '信息平台支持', defaultOwner: 'prop-commissioner',
    desc: '信息平台/宣传档案支撑（宣传委员主责；场景 info-platform）',
  },
];

export const WORK_MAP_IDS = WORK_MAP_MODULES.map((m) => m.id);

/** 缺省分工：{ [moduleId]: role }（workforce=null 时兜底展示；SOP/职责表草案） */
export const WORK_MAP_DEFAULT = Object.fromEntries(
  WORK_MAP_MODULES.map((m) => [m.id, m.defaultOwner]),
);

/**
 * 展开支部分工快照（纯）：config.workforce 覆盖项 + 缺省兜底其余模块
 * @param {Record<string,{ownerType:'role'|'person',ownerId:string}>|null} workforce
 * @returns {Record<string,{ownerType:'role'|'person',ownerId:string}>} 全 11 模块展开
 */
export function expandWorkforce(workforce) {
  const out = {};
  for (const m of WORK_MAP_MODULES) {
    const hit = workforce && workforce[m.id];
    if (hit && hit.ownerType && hit.ownerId) {
      out[m.id] = { ownerType: hit.ownerType, ownerId: hit.ownerId };
    } else {
      out[m.id] = { ownerType: 'role', ownerId: m.defaultOwner };
    }
  }
  return out;
}

/**
 * 按改派清单合并分工快照（纯；M2 议题通过后落库前用）
 * @param {Record<string,{ownerType,ownerId}>} snapshot expandWorkforce 展开后的当前快照
 * @param {Array<{moduleId:string,to:{ownerType:'role'|'person',ownerId:string}}>} changes 改派清单
 * @returns {Record<string,{ownerType,ownerId}>} 合并后快照（未涉及的模块原样保留）
 */
export function mergeWorkforceSnapshot(snapshot, changes) {
  const next = { ...(snapshot || {}) };
  const idSet = new Set(WORK_MAP_IDS);
  for (const c of Array.isArray(changes) ? changes : []) {
    if (c && idSet.has(c.moduleId) &&
        c.to && (c.to.ownerType === 'role' || c.to.ownerType === 'person') && c.to.ownerId) {
      next[c.moduleId] = { ownerType: c.to.ownerType, ownerId: c.to.ownerId };
    }
  }
  return next;
}
