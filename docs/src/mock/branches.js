// role: [工程师]+[AI]+[书记]
// mock/branches.js — 支部多实例种子（P1 党委后台，2026-09-02）
// 单一事实源：前端 domain mockDB.branches 首启 seed + server/seed.js 两级导入均引用本文件
// 支部不预设名字——br-b1 是当前实例（本科生党支部），硕博等支部由党委在系统内动态创建/改名。

export const PARTY_COMMITTEE = {
  id: 'pc-gsm',
  name: '光华管理学院党委',   // 院系级党委（书记 2026-09-02 澄清：非全校）
  type: 'party-committee',
};

/**
 * 支部实例：config 为支部配置档案（开源通用性——支部从已注册能力中排列组合自己的工作流）
 * config.enabledModules: null=启用全部已注册能力（默认 profile，兼容现有演示）；数组=仅启用列出的模块/scenario id
 * config.headerTitle: header 品牌软编码（随支部更换显示）
 * config.fileSpaceIsolated: 支部文件（branchDocs）与附件一支部一独立存储空间
 */
export const BRANCHES = [
  {
    id: 'br-b1',
    name: '光华管理学院本科生党支部',
    type: '本科生',                 // 类别标签（自由文本，不预设枚举）
    config: {
      headerTitle: '光华管理学院本科生党支部',
      accent: null,                  // null=默认党建红
      enabledModules: null,          // 全开（现有 46 功能不变）
      fileSpaceIsolated: true,
    },
    secretaryId: 'p13',              // 现任书记（沈一）；P2 起由党委任命驱动
    status: 'active',
    createdAt: '2026-09-01T00:00:00.000Z',
  },
];
