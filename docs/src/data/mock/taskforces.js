import { DEFAULT_BRANCH_ID } from '../../core/domain/constants.js?v=20261024b';
import { PEOPLE } from './people.js?v=20261024b';

// R7-35：统筹人从角色派生（演示快照仍指向现任组织委员，换人后自动跟随）
const ORG_COMMISSIONER_ID = PEOPLE.find((p) => p.role === 'org-commissioner')?.id || null;

export const MOCK_TASKFORCES = [
  // 2026-09-06 基线刷新：createdAt/deadline/progressList 由全局时间函数
  // f(d) = 07-01 + round((d−03-01)/121×24) 线性压缩至 2026-07-01~07-25；
  // 个别专班（tf-003/tf-007）成立日手调至其服务活动日之前（f 压缩会晚于活动日）；
  // 8 月截止（tf-005/006 deadline 8/20、8/15）与 signup（su-001~005，8 月）保留。
  // R2-32（2026-10-20）：过期未完结的 tf-001/005/006 已收口为 completed；tf-002 是唯一 active
  //   （常设维护，deadline 推到 2026-12-31）；不再存在「已截止仍招募」的 recruiting 种子。
  {
    id: 'tf-001',
    branchId: DEFAULT_BRANCH_ID,
    name: '宣传专班（第二期）',
    task: '深度报道与专题视频制作 — 7月系列主题活动宣传任务',
    // R2-32（2026-10-20）：任务对象是「7 月系列主题活动」，deadline 7/17 早已过；
    //   继续留在 active 会让「活跃专班」虚高，也违反「已截止仍招募」的读写矛盾 ⇒ 收口为 completed。
    status: 'completed',
    manager: ORG_COMMISSIONER_ID,
    initiator: '2400012356',
    members: [
      { personId: '2400012352', role: 'deep', contributions: [] },
      { personId: '2400012353', role: 'deep', contributions: [] },
      // 批次 47-X（2026-09-16，承 47-W 的 R-78 口径）：为「专班查看 · 我的产出填报」
      //   （`taskforce-view.js` 的结构化产出登记入口）补一名**演示账号成员**。
      //   ⚠ R2-32（2026-10-20）：本专班已按日期收口为 completed，这两条演示入口的 active 载体
      //     已迁到 tf-002（见其成员注释）；本行保留为历史产出只读，不再承担可达性。
      // **为什么必须补**：该填报区**只在 `tf.status==='active' && isMember` 时渲染**（同文件 194 行），
      //   而原种子里两只 active 专班（tf-001 成员 2400012352+2400012353 / tf-002 成员 2400012348+2400012351）**成员全是非演示账号**
      //   ⇒ 任何演示账号登录后都不是「该专班成员」⇒ 该区**结构上恒不渲染**（批 47-L 真机实测
      //   `#tfv-contrib-add` 计数 0，已如实登记为不可达）。
      // **为什么挂在这里自洽**：2400012349（普通成员 · 演示账号 2400012349）本就是「深度参与者」口径的常见填写人；
      //   挂进一只**已存在且 active** 的专班、只加成员不动状态，不新造任何不可能的状态；
      //   capacity 5 ⇒ 由 2/5 变 3/5，仍在容量内。
      // **为什么不改 tf-002**：tf-002 是「SOP 系统维护专班」（组织委员口径的示例），成员均为 organizer，
      //   而本区演示的是**成员本人**填报，挂在「宣传专班」的 deep 成员位上语义更贴。
      // 批次 47-Y（2026-09-16，承 R-78 口径）：再补**一条待核产出**，解锁组织委员台「逐条核验 → 退回补料」
      //   的必填判据（`org/taskforce-tab.js:626` 的「请填写退回原因」）。
      // **为什么必须补**：逐条核验区**只在 `tf.status==='active'` 时渲染**（`org/taskforce-tab.js:516`），
      //   而两条按钮**只在条目 `verifiedStatus` 为空（待核）时才挂**（同文件 598 行）——原种子里 active 专班
      //   的成员产出全为空数组 ⇒ 该区显「暂无待核条目」⇒ 退回按钮**计数恒 0**（批 47-X 真机实测，已如实登记）。
      // **为什么自洽（R-78 ②）**：这正是**成员本人**在专班详情「我的产出填报」（`#tfv-contrib-add`）提交后的形状
      //   ——`{ id, desc, by, at }` 且**无 `verifiedStatus`**（＝待核）。产品自己就会产出这个状态：成员填报 → 组织委员逐条核。
      //   本批正是拿 **2400012349**（47-X 已加入本专班、且 47-X 那条成功路径就在他的填报口上）来产生，语义连贯。
      { personId: '2400012349', role: 'deep', contributions: [{ id: 'c-tf1-1', desc: '撰写专班宣传稿（待核）', by: '2400012349', at: '2026-09-14T20:10:00+08:00' }] },
    ],
    capacity: 5,
    deadline: '2026-07-17',
    activityId: null,
    createdAt: '2026-07-09',
    // 立项③阶段a：专班中间进度（组织委员填报，纪检/组长只读可见）
    progressList: [
      { id: 'tp-demo-1', stage: '筹备中', note: '完成选题策划与成员分工排期，宣传物料清单已确定。', by: '2400012355', at: '2026-07-14T10:00:00.000Z' },
      { id: 'tp-demo-2', stage: '执行中', note: '深度报道采写进行中，已完成 2 篇专题稿件初稿。', by: '2400012355', at: '2026-07-15T15:30:00.000Z' },
    ],
  },
  {
    id: 'tf-002',
    branchId: DEFAULT_BRANCH_ID,
    name: 'SOP 系统维护专班',
    task: 'SOP 文档体系维护、系统同步更新、经验蒸馏记录',
    status: 'active',
    manager: ORG_COMMISSIONER_ID,
    initiator: '2300010001',
    members: [
      { personId: '2400012348', role: 'organizer', contributions: ['更新7月活动归档', '同步术语表'] },
      { personId: '2400012351', role: 'organizer', contributions: ['整理考勤数据'] },
      // R2-32（2026-10-20）：tf-001 按日期收口为 completed 后，原挂在它上面的「成员产出填报」与
      //   「组织委员逐条核验」两个演示入口会失去 **active 专班** 载体。这里把演示成员与待核产出
      //   迁到本常设专班（2400012349 是既有演示账号，不新造账号、不虚增人数；capacity 3 = 3/3 仍在容量内）。
      //   ⇒ tf-002 成为唯一 active 专班，两条入口继续可达；tf-001 的历史产出保留只读。
      { personId: '2400012349', role: 'deep', contributions: [{ id: 'c-tf2-1', desc: '整理并校对 SOP 术语表（待核）', by: '2400012349', at: '2026-10-18T20:10:00+08:00' }] },
    ],
    capacity: 3,
    // R2-32（2026-10-20）：SOP 维护是**常设**工作（无一次性活动对象），原 deadline 7/25 已过但与
    //   active 状态矛盾；按报告允许的第二种处置把截止推到当前学期末（滚动维护），状态保持 active。
    deadline: '2026-12-31',
    activityId: null,
    createdAt: '2026-07-13',
  },
  {
    id: 'tf-003',
    branchId: DEFAULT_BRANCH_ID,
    name: '五四主题党日筹备专班',
    task: '7月13日五四精神传承主题党日活动全流程筹备',
    status: 'completed',
    manager: ORG_COMMISSIONER_ID,
    initiator: '2400012345',
    members: [
      { personId: '2400012347', role: 'organizer', contributions: ['策划方案', '场地预约'] },
      { personId: '2400012352', role: 'deep', contributions: ['视频制作'] },
      { personId: '2400012353', role: 'deep', contributions: ['新闻稿撰写'] },
      { personId: '2400012349', role: 'participant', contributions: ['物资准备'] },
    ],
    capacity: 6,
    deadline: '2026-07-13',
    // R10（2026-10-23）：补齐真实关联活动（C19），不再全空。
    activityId: 'act-10',
    createdAt: '2026-07-10',
  },
  {
    id: 'tf-004',
    branchId: DEFAULT_BRANCH_ID,
    name: '共建座谈对接专班',
    task: '校企共建座谈（光华 x 中信证券）对接与执行',
    status: 'completed',
    manager: ORG_COMMISSIONER_ID,
    initiator: '2300010001',
    members: [
      { personId: '2400012355', role: 'organizer', contributions: ['嘉宾邀请', '议程设计'] },
      { personId: '2400012354', role: 'deep', contributions: ['现场记录', '考勤统计'] },
    ],
    capacity: 4,
    deadline: '2026-07-17',
    activityId: 'act-12',
    createdAt: '2026-07-14',
  },
  {
    id: 'tf-005',
    branchId: DEFAULT_BRANCH_ID,
    name: '建党105周年筹备专班',
    task: '7月23日建党105周年主题党日大型活动筹备',
    // R2-32：筹备对象 act-16 已于 7/23 举办，招募截止 8/20 也已过 ⇒ recruiting 不再成立，收口 completed。
    status: 'completed',
    manager: ORG_COMMISSIONER_ID,
    initiator: '2300010001',
    members: [
      { personId: '2400012345', role: 'organizer', contributions: [] },
      { personId: '2500010012', role: 'organizer', contributions: [] },
      { personId: '2400012351', role: 'participant', contributions: [] },
    ],
    capacity: 8,
    deadline: '2026-08-20',
    activityId: 'act-16',
    createdAt: '2026-07-15',
  },
  {
    id: 'tf-006',
    branchId: DEFAULT_BRANCH_ID,
    name: '参访活动保障专班',
    task: '7月参访活动后勤保障与安全',
    // R2-32：保障对象（7 月参访）已结束，截止 8/15 也已过 ⇒ recruiting 收口 completed。
    status: 'completed',
    manager: ORG_COMMISSIONER_ID,
    initiator: '2400012345',
    members: [
      { personId: '2400012350', role: 'participant', contributions: [] },
    ],
    capacity: 4,
    deadline: '2026-08-15',
    activityId: 'act-14',
    createdAt: '2026-07-16',
  },
  {
    id: 'tf-007',
    branchId: DEFAULT_BRANCH_ID,
    name: '两会精神学习专班',
    task: '两会精神学习材料整理与分享',
    status: 'completed',
    manager: ORG_COMMISSIONER_ID,
    initiator: '2400012356',
    members: [
      { personId: '2400012356', role: 'organizer', contributions: ['材料整理', '分享会主持'] },
      { personId: '2400012350', role: 'deep', contributions: ['PPT制作'] },
    ],
    capacity: 3,
    deadline: '2026-07-03',
    activityId: null,
    createdAt: '2026-07-01',
  },
  {
    id: 'tf-008',
    branchId: DEFAULT_BRANCH_ID,
    name: '七月活动档案整理专班',
    task: '七月上旬活动归档整理、材料汇总与电子化',
    status: 'dissolved',
    manager: ORG_COMMISSIONER_ID,
    initiator: '2300010001',
    members: [
      { personId: '2400012356', role: 'organizer', contributions: ['材料汇总', '归档清单'] },
      { personId: '2400012350', role: 'deep', contributions: ['PPT制作', '电子档案'] },
    ],
    capacity: 3,
    deadline: '2026-07-09',
    activityId: null,
    createdAt: '2026-07-06',
    dissolvedAt: '2026-07-11',
  },
];
