// role: [工程师]+[AI]
// mock/branches.js — 支部多实例种子（P1 党委后台，2026-09-02）
// 单一事实源：前端 domain mockDB.branches 首启 seed + server/seed.js 两级导入均引用本文件
// 支部不预设名字——br-b1 是当前实例（本科生党支部），硕博等支部由党委在系统内动态创建/改名。

export const PARTY_COMMITTEE = {
  id: 'pc-gsm',
  name: '光华管理学院党委',   // 院系级党委（支书 2026-09-02 澄清：非全校）
  type: 'party-committee',
};

/**
 * 支部实例：config 为支部配置档案（开源通用性——支部从已注册能力中排列组合自己的工作流）
 * config.modules: 工作流模块配置（L2，2026-09-03 支书裁定：支部自治/支书操作/清单+画布并用/tab 级/核心固定）
 *   { hiddenTabIds: string[], tabOrder: string[] }——null = 默认全开（现有 46 功能不变）；
 *   核心组 tab（待办/工作概况等 groupLabel='工作台'）固定显示，不可隐藏、不参与排序。
 * config.headerTitle: header 品牌软编码（**可改写项**——换组织向导里单独改「页眉显示名」时写本项；
 *   为空/缺省时 header 回退 branch.name，见 services/branch/branch.js::getHeaderTitle 段②）
 * config.fileSpaceIsolated: 支部文件（branchDocs）与附件一支部一独立存储空间
 */
export const BRANCHES = [
  {
    id: 'br-b1',
    name: '光华管理学院本科生党支部',   // 支部档案名（默认显示名；headerTitle 未单独设置时 header 用它）
    type: '本科生',                 // 类别标签（自由文本，不预设枚举）
    config: {
      // 页眉显示名（软编码·可改写项）：与 name 同值属**默认态**（本演示支部从未单独改过页眉名），非重复字段——
      // 改支部名只动 name，改页眉显示名只动本项；二者由向导/党委分开维护、各自独立留痕（config-clean 回滚键各一）
      headerTitle: '光华管理学院本科生党支部',
      accent: null,                  // null=默认党建红
      modules: null,                 // 全开（默认 profile，兼容现有演示）
      fileSpaceIsolated: true,
    },
    secretaryId: 'p13',              // 现任支书（储子禾）；P2 起由党委任命驱动
    status: 'active',
    createdAt: '2026-09-01T00:00:00.000Z',
  },
];

/**
 * 时序兜底显示名（分支数据尚未加载时 header 的兜底）——**单一源**：演示支部 br-b1 的档案名（上方 name）。
 * services/branch/branch.js::getHeaderTitle 段③ 引用本值；勿在别处再写同一字符串字面量。
 * ⚠ 段②（真实支部数据）与段③（本兜底）在本演示实例下会取到**同一个字面量**、来源不同；
 *   要分辨当前生效的是哪一段，看 services/branch/branch.js::getAffiliationShape().segment（1–5）。
 */
export const DEFAULT_BRANCH_DISPLAY_NAME = BRANCHES.find(b => b.id === 'br-b1')?.name || '示例组织';
