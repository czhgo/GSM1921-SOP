// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  work-map.js — 支部工作地图模块目录（L4 v2.1 单一源，2026-09-03）
//  支书裁决：11 项平铺放行（只列既有工作形式；无分类筐、无自造项、无党建/党务二分）。
//  2026-09-22 批次 145：支书裁定「按『谁组织算谁』拆开（推荐）」——原「三会一课」单模块（含 4 子会、
//    缺省主责一律写支书）按**形式**拆为 4 个模块（支部党员大会 / 支委会 / 党小组会 / 党课），逐个
//    照母本《常见工作场景快速指南》`:157-160` 的「形式 → 负责人」表取齐（支书 / 支书 / 党小组组长 /
//    支书）；「主题党日」主责同批由支书改准为**党小组组长**（母本 `:109`/`:93`）。⇒ 模块数 11 → **14**。
//  2026-09-22 批次 149：支书对 `SOP-F-3` 四条待定项的裁定逐条落地——`joint-event` 缺省主责改准为
//    **本组组长**（「办活动 ⇒ 党小组承办」）；`rule-making` 主责维持支委会（对应委员＝支委会**指定**的
//    承办人）；`democratic-review` 承载改准为**党员大会 / 党小组会**（上传任务归支书）；`election` 主责
//    改准为 **党委**（新增组织型主体 `party-committee`）；`info-platform` 主责改准为**支委会**（它＝本
//    网页系统本身）。**未改任何批准门 / 权限门逻辑**。
//  模块归属与分工由支部自行建设（支书台「支部分工」），调整走支委会议题；
//  本文件的 defaultOwner 仅是「缺省建议」（源自 SOP/职责表），config.workforce=null 时兜底展示。
//  本文件纯 ESM 零依赖（浏览器 / node 测试双端可加载）。
// ════════════════════════════════════════════════════════════════

// ── 组织型主体（2026-09-21 批次 141 支书裁定：支委会类似法人，不是自然人）────────
// 语义：能作为「谁负责 / 承担方」的答案——**是组织主体，不是人，也不是角色键**。
// 硬判据（三条皆无 ⇒ 不是自然人、不能当登录身份；由 server/test/work-map.test.mjs 断言守住）：
//   · 不在 `constants.js::ROLE_KEYS` / `ROLE_LEGACY_KEYS` / 任何授权语义角色集里；
//   · 无 `ROLE_LABELS` / `ROLE_PAGE_MAP` 条（「身份 → 页面」映射里没有它）；
//   · 与角色键**取值不重叠**（`ORG_SUBJECT_IDS ∩ ROLE_KEYS = ∅`）。
// 承载形态（勿改）：支委会在系统里以「线上会议」形态出现（活动 `type='支委会'` ＋ `scenarioId='branch-committee'`）；
//   「支委层」＝`constants.js::BRANCH_COMMISSION_ROLES` 五个**个人**角色键的共同门——
//   本注册表只回答「承担方是谁」，不碰任何权限门、也不增删角色键。
// 落点：本注册表当前只服务**支部分工**（`WORK_MAP_MODULES[].defaultOwner` / `config.workforce`）这一个用途。
// 2026-09-22 批次 149 新增 `party-committee`（党委）：依支书 2026-09-22 裁定「换届选举涉及到支委班子
//   身份赋权的问题，应当由党委来改变支部设置」⇒ 模块 `election` 的承担方＝**党委**。
//   ⚠ 别与系统里既有的党委表达混：`constants.js` 的 **`party-staff`（党委组织员）是角色键**（有
//   `ROLE_LABELS` / `ROLE_PAGE_MAP` → 党委工作台 `party-committee.html`，可登录）；本注册表的
//   `party-committee` 是**组织型主体 id**，只作「谁负责」的答案——本批**未动 `party-staff` 那条链**。
export const ORG_SUBJECTS = {
  'branch-committee': { label: '支委会' },
  'party-committee': { label: '党委' },
};
export const ORG_SUBJECT_IDS = Object.keys(ORG_SUBJECTS);
export const ORG_SUBJECT_LABELS = Object.fromEntries(
  Object.entries(ORG_SUBJECTS).map(([id, s]) => [id, s.label]),
);

/** 该 id 是否组织型主体（非自然人） */
export function isOrgSubject(id) {
  return Object.prototype.hasOwnProperty.call(ORG_SUBJECTS, id);
}

/** 主体引用（`defaultOwner` / `ownerId`）→ `ownerType`：组织型主体 → 'org'；其余按角色键 → 'role' */
export function ownerSubjectType(id) {
  return isOrgSubject(id) ? 'org' : 'role';
}

/**
 * 工作模块目录（顺序即平铺视图 A 的展示顺序；「三会一课」按形式拆为 4 个模块，见文件头）
 *
 * ⚠ 分层（tier，2026-09-13 支书裁定）：模块按「工作程序/规范」与「工作方法」分层——
 *   · `norm`  工作程序/党内统一规范：必办、须有人（不可停用），跨支部一致（三会一课/主题党日/
 *             发展党员/民主评议党员/换届选举/考勤考察/意见反馈处理/制度制定与迭代）；
 *   · `method` 工作方法：本支部自选（各支部最大差别所在），**可停用**（本支部不开展即留空），
 *             也可随时复用（专班/共建活动/信息平台支持）。
 *   面板按层分组呈现；停用以 `{ ownerType:'none', ownerId:'' }` 表示（仅方法类允许）。
 *
 * @typedef {Object} WorkMapModule
 * @property {string} id        模块 id（config.workforce 键，全局唯一）
 * @property {string} name      模块名（用户可见）
 * @property {'norm'|'method'} tier 分层：工作程序/规范（norm）｜工作方法（method，可停用）
 * @property {string[]} [sub]   子项（标签沿用 ACTIVITY_CLASSIFICATION.subtypes；现无模块使用——「三会一课」已于 2026-09-22 批次 145 按形式拆为 4 个模块，保留本属性供调用方兼容）
 * @property {string} defaultOwner 缺省主责**主体引用**（角色键 或 组织型主体 id，见 `ORG_SUBJECTS`；SOP/职责表草案，支委会可改）
 * @property {string} desc      一句话说明（卡面文案）
 * @property {string[]} [outputs] 产出交接标签（考勤/考察/宣传/材料，对应活动/专班运行产出）
 */
export const WORK_MAP_MODULES = [
  {
    id: 'branch-party-meeting', name: '支部党员大会', tier: 'norm', defaultOwner: 'secretary',
    // 2026-09-22 批次 145 支书裁定「按『谁组织算谁』拆开（推荐）」：原「三会一课」单模块（含 4 子会、
    //   缺省主责一律写『secretary』）按**形式**拆为 4 个模块，主责逐行照母本《常见工作场景快速指南》
    //   `:157-160`「形式 → 负责人」表取齐（支部党员大会＝支书 / 支委会＝支书 / 党小组会＝党小组组长 /
    //   党课＝支书）。本行＝支部党员大会（母本 `:157`）。
    desc: '支部全体党员大会：讨论表决重大事项（刚性考勤，缺席或请假未参会须补课）；议程-记录-考勤完整',
    outputs: ['考勤', '宣传', '材料'],
  },
  {
    id: 'branch-committee-meeting', name: '支委会', tier: 'norm', defaultOwner: 'secretary',
    // 同上：本行＝支委会（母本 `:158`「支委会 ｜ 支书」；召集人亦是支书，`定人定责:198`「召集支委会 ｜ 支书」）。
    //   ⚠ 这里的主责是「**开会**这件事归谁召集」，与**支委会作为审议主体**是两件事——后者是**组织型主体**
    //   （`ORG_SUBJECTS['branch-committee']`，模块「发展党员」「意见反馈处理」「制度制定与迭代」的
    //   `defaultOwner`）。本模块 id 刻意不取 `branch-committee`，正是免与那个组织型主体 id 混淆。
    desc: '支委会会议：研究支部日常工作（支委会不考勤）；议程-记录完整',
    outputs: ['宣传', '材料'],
  },
  {
    id: 'party-group-meeting', name: '党小组会', tier: 'norm', defaultOwner: 'leader',
    // 同上：本行＝党小组会（母本 `:159`「党小组会 ｜ 党小组组长」＋ `定人定责:228` §5.3「党小组会 ｜
    //   主导者＝党小组组长」）⇒ 缺省主责记角色键 `leader`（本支部 3 个党小组，各归本组组长；缺省位只能
    //   记一个主体引用，故记角色键、不记具体某组）。
    desc: '党小组会：本组内部学习与交流（刚性考勤，不默认补课）；由本组组长主导',
    outputs: ['考勤', '宣传', '材料'],
  },
  {
    id: 'party-lecture', name: '党课', tier: 'norm', defaultOwner: 'secretary',
    // 同上：本行＝党课（母本 `:160`「党课 …… 支书（通知/补课提醒）」）。党课从简——通知提前量不设
    //   固定值，由组织者把握（`D-575` ③）；**考勤上传位在纪检委员**（`D-558`）——此处只是「组织与通知」
    //   这一层的主责，不是考勤主责。
    desc: '党课：系统性政治理论学习（通常由上级统一安排；通知与补课提醒归支书，考勤上传位在纪检委员）',
    outputs: ['考勤', '宣传', '材料'],
  },
  {
    id: 'theme-party', name: '主题党日', tier: 'norm', defaultOwner: 'leader',
    // 2026-09-22 批次 145 改准 `defaultOwner`『secretary』→『leader』（同一条裁定「按谁组织算谁」）：
    //   主题党日的负责人＝**组织者**（母本 `:109`/`:112` 负责人栏；`D-575` ③ 系统内 `1b-1` 的
    //   `executor` 即 `'organizer'`），而『组织者』不是角色键、写不进主体引用；组织者按母本 `:93`
    //   「活动由党小组组长写入」缺省落到**本组组长**（`定人定责:200-202` 三行「第一/二/三党小组活动
    //   → 支书 / 副支书 / 代组长」＋ §5.3 `:230`「党小组活动 ｜ 主导者＝党小组组长」）⇒ 缺省主责记
    //   `leader`（各党小组主题党日归本组组长）。⚠ 支部级 / 跨组的主题党日由支书发起（`指南:112`
    //   「支书（跨组/全支部）」）——属**例外**，走支书台改派，不在此缺省。
    desc: '主题党日活动（含党小组主题党日；共建/外出/载体为正交维度），工作流块驱动；本组组长组织、组织者担纲',
    outputs: ['考勤', '宣传', '材料'],
  },
  {
    id: 'taskforce', name: '专班', tier: 'method', defaultOwner: 'org-commissioner',
    desc: '专班全生命周期：创建-招募-运行-解散（组织委员最高优先级），负责人制',
    outputs: ['考勤', '考察', '材料'],
  },
  {
    id: 'joint-event', name: '共建活动', tier: 'method', defaultOwner: 'leader',
    // 2026-09-22 批次 149 改准 `defaultOwner`『secretary』→『leader』（系按支书 2026-09-22 裁定：
    //   「我认为如果是办活动，那就是党小组承办。（团支部在我们的系统中只是一个字段『标记』。）」）
    //   ——与批次 145 给 `theme-party` 定的「谁组织算谁」同一条理：办活动即**党小组承办**，缺省落
    //   **本组组长**（母本 `指南:41`「团支部合办活动 ｜ 按主题党日规则执行」）。
    //   ⚠ 母本 `指南:245` 第 3 步（2026-09-22 批次 149 逐字核过）「支书批准（必须经支书同意后方可推进；不批准则终止）」是**线下批准门**；
    //   系统内**本就没有「活动级批准门」**（活动状态链 `draft→published→ongoing→completed→cancelled`，
    //   无审批态；系统里的批准类只有支委会表决 / 报名审批 / 成员变更审批 / 上级党委上报审批，均非活动
    //   批准）⇒ 依支书原话「沿着既有的系统框架来即可」，本批**一字未动任何批准门逻辑**（既有的就不改）。
    desc: '跨组织合办活动（团支部合办等）；按主题党日承载、由党小组承办（本组组长组织），「共建」为活动维度（isJoint），不单开场景',
    outputs: ['宣传', '材料'],
  },
  {
    id: 'develop-party-member', name: '发展党员', tier: 'norm', defaultOwner: 'branch-committee',
    // 2026-09-22 批次 144 改准 `defaultOwner`『org-commissioner』→『branch-committee』：母本
    //   `支委与党小组定人定责定岗说明.md` §5.1 定人表「发展党员 → 主责人＝支委会」＋其下注「发展党员
    //   的责任在支委会——必须集体决策，不落实到具体个人；组织委员承担其中的考察与材料准备」，
    //   依 `D-300`（支书 2026-09-17 原话）与批次 135 派单表（`SOP-B-25`）同行；批次 141 已使
    //   组织型主体可作 owner（`ownerSubjectType`）⇒ 本项由「个体」改归「组织」。原文「（组织委员主责）」
    //   与母本 §5.1 相左（组织委员承担的是其中的考察与材料准备，不是整件事的主责）。
    desc: '发展党员管线：申请→积极分子→考察→发展对象→接收→转正（责任在支委会，集体决策；考察与材料准备归组织委员）',
    outputs: ['材料'],
  },
  {
    id: 'democratic-review', name: '民主评议党员', tier: 'norm', defaultOwner: 'secretary',
    // 2026-09-22 批次 149（系按支书 2026-09-22 裁定「民主评议党员，压实到党员大会 / 党小组会上。
    //   上传任务压给支书」）——两件事分开表达：**承载**＝党员大会 / 党小组会（在哪开会），
    //   **上传动作**＝支书。缺省主责位只能记一个主体 ⇒ 记 **`secretary`（支书）**，与该裁定
    //   「上传任务压给支书」一致（主责＝这一件事实务的承担方）。
    // 欠拟合说明（2026-09-13 全局审计）：当前**承载＝以会议形式召开并在活动命名中表达**（沿用「组织
    //   生活会」同一裁定：内容是命名表达、不进子类 chips/写入表单）；「评议明细」（评议表/格次/汇总）
    //   尚未建，待按 L3 manifest 补齐。
    desc: '年度民主评议党员（以支部党员大会 / 党小组会形式召开、活动命名表达；上传任务归支书、评议明细待按 L3 补齐）',
  },
  {
    id: 'election', name: '换届选举', tier: 'norm', defaultOwner: 'party-committee',
    // 2026-09-22 批次 149 改准 `defaultOwner`『secretary』→『party-committee』（系按支书 2026-09-22
    //   裁定：「换届选举涉及到支委班子身份赋权的问题，应当由党委来改变支部设置！！」）——即
    //   **换届选举不是支部内部自主的事，主导在「党委」**。『党委』按批次 141 判据作**组织型主体**
    //   入 `ORG_SUBJECTS`（不在 `ROLE_KEYS` / 不在身份→页面映射 / 不能当登录身份；本模块 id 仍
    //   属支部工作地图、只把「承担方」这一格改准）。
    // 欠拟合说明（2026-09-13 全局审计）：当前**承载＝任命机制 + 支委会票决**（党委台「任命支书」+
    //   线上表决）；「换届完整流程」（酝酿提名/请示上级/选举大会/报批备案）尚未建，待按 L3 manifest 补齐。
    desc: '换届选举（涉及支委班子身份赋权，由党委改变支部设置；现由任命机制 + 票决承载；完整流程待按 L3 补齐）',
  },
  {
    id: 'attendance-inspection', name: '考勤考察', tier: 'norm', defaultOwner: 'disc-commissioner',
    desc: '考勤管理 + 考察记录（纪检委员主责；活动/专班运行中的产出环节）',
    outputs: ['考勤', '考察'],
  },
  {
    id: 'feedback-handling', name: '意见反馈处理', tier: 'norm', defaultOwner: 'branch-committee',
    // 2026-09-21 批次 135 改准 desc（原文写「纪检委员主责」与 `D-301` / `D-412` 相左）；批次 141 改准
    // `defaultOwner`『disc-commissioner』→『branch-committee』：处置主体＝**支委会**（支书主持支委会，
    // 见 `COMMISSIONER_DUTY_FRAMEWORK.md` §C.1b），依 `D-301` / `D-412` / `D-550` / `D-551`
    // 与批次 135 派单表草案（`SOP-B-25`，**草案 · 待支书改**——本批只改这两个模块的缺省主责，
    // 未据此改全套派单逻辑）。『支委会』是**组织型主体**（`ORG_SUBJECTS`，类似法人、不是自然人），
    // 不是角色键 ⇒ 由 `ownerSubjectType()` 判为 `ownerType:'org'`。
    desc: '意见建议反馈处理（处置归支委会，支书主持支委会；场景 feedback-handling + 反馈管理）',
  },
  {
    id: 'rule-making', name: '制度制定与迭代', tier: 'norm', defaultOwner: 'branch-committee',
    // 2026-09-21 批次 141 改准 `defaultOwner`『secretary』→『branch-committee』：制度的**定稿与生效**
    // 由支委会审议认定（`D-341` / `D-343` / `D-555`；批次 135 派单表草案「制度审议与认定 → 支委会」，
    // **草案 · 待支书改**）。
    // 2026-09-22 批次 149（系按支书 2026-09-22 裁定「支委会可以指定个人来 起草/修改，报送支委会审议。
    //   主语都是支委会（支委扩大会）」）——**主责维持 `branch-committee` 不变**：『对应委员』是支委会
    //   **指定**的具体承办人、**不是主责**（母本 `定人定责 §5.3` 的「主导者＝对应委员」同批按裁定改准为
    //   「支委会（可指定对应委员起草 / 修改）」）。系统里仍**没有**「制度内容 → 对应主体」的判据
    //   （`SOP-B-25` 第 ② 项那张映射表**仍在等支书给定、仍是草案**，本批不据它改任何派单逻辑）。
    desc: '制度/章程制定与迭代（支部自治事项；支委会主责，可指定个人起草 / 修改、报支委会审议；承载＝支部文件 + 相应会议议程，不单开场景）',
  },
  {
    id: 'info-platform', name: '信息平台支持', tier: 'method', defaultOwner: 'branch-committee',
    // 2026-09-22 批次 149 改准 `defaultOwner`『prop-commissioner』→『branch-committee』（系按支书
    //   2026-09-22 裁定：「信息平台支持其实指的就是这个网页系统。我认为是支委会维护，如果长期有功能
    //   更新……所以支委会收集需求后报给开发者（该系统从头到尾由其本人开发）」）——① 本模块＝**本网页
    //   系统本身**（**不是**党建平台、**不是**宣传档案 ⇒ 主责由宣传委员改归**支委会**）；② 真实运转
    //   方式＝**支委会收集需求 → 报给开发者**。『支委会』是组织型主体（`ORG_SUBJECTS`）。
    //   ⚠ 母本 `指南:363` / `:369-371` / `:463` 的「信息平台支持」是**组织委员**的信息与档案支持服务
    //   （考察档案管理 / 材料催缴与审核督办 / 资料查询）——**另一件事同名**；母本侧本批未动，另报。
    desc: '信息平台支持＝本网页系统本身（支部自选工作方法）；由支委会维护，长期有功能更新时支委会收集需求后报给开发者；不单开场景',
  },
];

export const WORK_MAP_IDS = WORK_MAP_MODULES.map((m) => m.id);

/** 分层标签（面板分组标题用） */
export const WORK_MAP_TIER_LABELS = {
  norm: '工作程序 · 规范（必办，须有人）',
  method: '工作方法 · 支部自选（可停用/可复用）',
};

/** 模块分层查询（未知 id 按规范层处理，保守不放停用） */
export function tierOfModule(moduleId) {
  return WORK_MAP_MODULES.find((m) => m.id === moduleId)?.tier || 'norm';
}

/** 是否允许停用（仅方法类） */
export function canDisableModule(moduleId) {
  return tierOfModule(moduleId) === 'method';
}

/** 停用标记（仅方法类可用；规范类一律拒绝） */
export function isDisabledAssign(assign) {
  return !!assign && assign.ownerType === 'none';
}

export const WORK_MAP_DISABLED = { ownerType: 'none', ownerId: '' };

/** 缺省分工：{ [moduleId]: 主体引用 }（角色键 或 组织型主体 id；workforce=null 时兜底展示；SOP/职责表草案） */
export const WORK_MAP_DEFAULT = Object.fromEntries(
  WORK_MAP_MODULES.map((m) => [m.id, m.defaultOwner]),
);

/**
 * 展开支部分工快照（纯）：config.workforce 覆盖项 + 缺省兜底其余模块
 * @param {Record<string,{ownerType:'role'|'person'|'org'|'none',ownerId:string}>|null} workforce
 * @returns {Record<string,{ownerType:'role'|'person'|'org'|'none',ownerId:string}>} 全 14 模块展开
 */
export function expandWorkforce(workforce) {
  const out = {};
  for (const m of WORK_MAP_MODULES) {
    const hit = workforce && workforce[m.id];
    if (hit && hit.ownerType === 'none') {
      // 方法类停用（本支部不开展）：不得回落缺省负责人（否则「停用」失效）
      out[m.id] = { ownerType: 'none', ownerId: '' };
    } else if (hit && hit.ownerType && hit.ownerId) {
      out[m.id] = { ownerType: hit.ownerType, ownerId: hit.ownerId };
    } else {
      // 缺省主责＝主体引用（角色键 → 'role'；组织型主体 id → 'org'，见 ownerSubjectType）
      out[m.id] = { ownerType: ownerSubjectType(m.defaultOwner), ownerId: m.defaultOwner };
    }
  }
  return out;
}

/**
 * 按改派清单合并分工快照（纯；M2 议题通过后落库前用）
 * @param {Record<string,{ownerType,ownerId}>} snapshot expandWorkforce 展开后的当前快照
 * @param {Array<{moduleId:string,to:{ownerType:'role'|'person'|'org'|'none',ownerId:string}}>} changes 改派清单
 * @returns {Record<string,{ownerType,ownerId}>} 合并后快照（未涉及的模块原样保留）
 */
export function mergeWorkforceSnapshot(snapshot, changes) {
  const next = { ...(snapshot || {}) };
  const idSet = new Set(WORK_MAP_IDS);
  for (const c of Array.isArray(changes) ? changes : []) {
    if (!c || !idSet.has(c.moduleId) || !c.to) continue;
    if (c.to.ownerType === 'none') {
      // 停用仅限方法类（规范类=必办，落库前在此拦掉，防脏配置）
      if (canDisableModule(c.moduleId)) next[c.moduleId] = { ownerType: 'none', ownerId: '' };
      continue;
    }
    // 主体三类：人（person）/ 角色位（role）/ 组织型主体（org，见 ORG_SUBJECTS）
    if ((c.to.ownerType === 'role' || c.to.ownerType === 'person' || c.to.ownerType === 'org') && c.to.ownerId) {
      next[c.moduleId] = { ownerType: c.to.ownerType, ownerId: c.to.ownerId };
    }
  }
  return next;
}
