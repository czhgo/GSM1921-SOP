export const MOCK_TASKFORCES = [
  // 2026-09-06 基线刷新：createdAt/deadline/progressList 由全局时间函数
  // f(d) = 07-01 + round((d−03-01)/121×24) 线性压缩至 2026-07-01~07-25；
  // 个别专班（tf-003/tf-007）成立日手调至其服务活动日之前（f 压缩会晚于活动日）；
  // 8 月截止（tf-005/006 deadline 8/20、8/15）与 signup（su-001~005，8 月）保留。
  {
    id: 'tf-001',
    name: '宣传专班（第二期）',
    task: '深度报道与专题视频制作 — 7月系列主题活动宣传任务',
    status: 'active',
    manager: 'p11',
    initiator: 'p12',
    members: [
      { personId: 'p8', role: 'deep', contributions: [] },
      { personId: 'p9', role: 'deep', contributions: [] },
      // 批次 47-X（2026-09-16，承 47-W 的 R-78 口径）：为「专班查看 · 我的产出填报」
      //   （`taskforce-view.js:290` 的「请填写产出说明」）补一名**演示账号成员**。
      // **为什么必须补**：该填报区**只在 `tf.status==='active' && isMember` 时渲染**（同文件 194 行），
      //   而原种子里两只 active 专班（tf-001 成员 p8+p9 / tf-002 成员 p4+p7）**成员全是非演示账号**
      //   ⇒ 任何演示账号登录后都不是「该专班成员」⇒ 该区**结构上恒不渲染**（批 47-L 真机实测
      //   `#tfv-contrib-add` 计数 0，已如实登记为不可达）。
      // **为什么挂在这里自洽**：p5（普通成员 · 演示账号 2400012349）本就是「深度参与者」口径的常见填写人；
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
      //   本批正是拿 **p5**（47-X 已加入本专班、且 47-X 那条成功路径就在他的填报口上）来产生，语义连贯。
      { personId: 'p5', role: 'deep', contributions: [{ id: 'c-tf1-1', desc: '撰写专班宣传稿（演示·待核）', by: 'p5', at: '2026-09-14T20:10:00+08:00' }] },
    ],
    capacity: 5,
    deadline: '2026-07-17',
    activityId: null,
    createdAt: '2026-07-09',
    // 立项③阶段a：专班中间进度（组织委员填报，纪检/组长只读可见）
    progressList: [
      { id: 'tp-demo-1', stage: '筹备中', note: '完成选题策划与成员分工排期，宣传物料清单已确定。', by: 'p11', at: '2026-07-14T10:00:00.000Z' },
      { id: 'tp-demo-2', stage: '执行中', note: '深度报道采写进行中，已完成 2 篇专题稿件初稿。', by: 'p11', at: '2026-07-15T15:30:00.000Z' },
    ],
  },
  {
    id: 'tf-002',
    name: 'SOP 系统维护专班',
    task: 'SOP 文档体系维护、系统同步更新、经验蒸馏记录',
    status: 'active',
    manager: 'p11',
    initiator: 'p13',
    members: [
      { personId: 'p4', role: 'organizer', contributions: ['更新7月活动归档', '同步术语表'] },
      { personId: 'p7', role: 'organizer', contributions: ['整理考勤数据'] },
    ],
    capacity: 3,
    deadline: '2026-07-25',
    activityId: null,
    createdAt: '2026-07-13',
  },
  {
    id: 'tf-003',
    name: '五四主题党日筹备专班',
    task: '7月13日五四精神传承主题党日活动全流程筹备',
    status: 'completed',
    manager: 'p11',
    initiator: 'p1',
    members: [
      { personId: 'p3', role: 'organizer', contributions: ['策划方案', '场地预约'] },
      { personId: 'p8', role: 'deep', contributions: ['视频制作'] },
      { personId: 'p9', role: 'deep', contributions: ['新闻稿撰写'] },
      { personId: 'p5', role: 'participant', contributions: ['物资准备'] },
    ],
    capacity: 6,
    deadline: '2026-07-13',
    activityId: null,
    createdAt: '2026-07-10',
  },
  {
    id: 'tf-004',
    name: '共建座谈对接专班',
    task: '校企共建座谈（光华 x 中信证券）对接与执行',
    status: 'completed',
    manager: 'p11',
    initiator: 'p13',
    members: [
      { personId: 'p11', role: 'organizer', contributions: ['嘉宾邀请', '议程设计'] },
      { personId: 'p10', role: 'deep', contributions: ['现场记录', '考勤统计'] },
    ],
    capacity: 4,
    deadline: '2026-07-17',
    activityId: null,
    createdAt: '2026-07-14',
  },
  {
    id: 'tf-005',
    name: '建党105周年筹备专班',
    task: '7月23日建党105周年主题党日大型活动筹备',
    status: 'recruiting',
    manager: 'p11',
    initiator: 'p13',
    members: [
      { personId: 'p1', role: 'organizer', contributions: [] },
      { personId: 'p26', role: 'organizer', contributions: [] },
      { personId: 'p7', role: 'participant', contributions: [] },
    ],
    capacity: 8,
    deadline: '2026-08-20',
    activityId: null,
    createdAt: '2026-07-15',
  },
  {
    id: 'tf-006',
    name: '参访活动保障专班',
    task: '7月参访活动后勤保障与安全',
    status: 'recruiting',
    manager: 'p11',
    initiator: 'p1',
    members: [
      { personId: 'p6', role: 'participant', contributions: [] },
    ],
    capacity: 4,
    deadline: '2026-08-15',
    activityId: null,
    createdAt: '2026-07-16',
  },
  {
    id: 'tf-007',
    name: '两会精神学习专班',
    task: '两会精神学习材料整理与分享',
    status: 'completed',
    manager: 'p11',
    initiator: 'p12',
    members: [
      { personId: 'p12', role: 'organizer', contributions: ['材料整理', '分享会主持'] },
      { personId: 'p6', role: 'deep', contributions: ['PPT制作'] },
    ],
    capacity: 3,
    deadline: '2026-07-03',
    activityId: null,
    createdAt: '2026-07-01',
  },
  {
    id: 'tf-008',
    name: '七月活动档案整理专班',
    task: '七月上旬活动归档整理、材料汇总与电子化',
    status: 'dissolved',
    manager: 'p11',
    initiator: 'p13',
    members: [
      { personId: 'p12', role: 'organizer', contributions: ['材料汇总', '归档清单'] },
      { personId: 'p6', role: 'deep', contributions: ['PPT制作', '电子档案'] },
    ],
    capacity: 3,
    deadline: '2026-07-09',
    activityId: null,
    createdAt: '2026-07-06',
    dissolvedAt: '2026-07-11',
    reviewSummary: '专班完成七月上旬 3 项活动的归档整理（act-1/act-2/act-3），形成电子档案 5 份、归档清单 1 份。组织者方文静完成材料汇总，深度参与者苏明哲完成 PPT 制作与电子化归档。工作量已记入考察总表，专班正式解散。',
  },
];
