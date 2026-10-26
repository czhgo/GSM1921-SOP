import { DEFAULT_BRANCH_ID } from '../../core/domain/constants.js?v=20261026b';
import { PEOPLE } from './people.js?v=20261026b';

// R7-35：统筹人从角色派生（演示快照仍指向现任组织委员，换人后自动跟随）
const ORG_COMMISSIONER_ID = PEOPLE.find((p) => p.role === 'org-commissioner')?.id || null;

// v12：contributions 统一为对象数组（`{ id?, desc, by?, at? }`）。历史字符串只是描述，
// 这里归一为 `{ desc }` —— 不再让影子表把字符串展开成 `$."0"` 字符键。
const _contrib = (...descs) => descs.map((desc) => ({ desc }));

// Task 5（2026-10-26，演示窗口 2026-08-01~2026-11-30）：
//   createdAt/deadline/progressList/contributions 一律重排到窗口内，且不早于其服务活动日；
//   tf-002 为**跨期常设 active**（deadline 2026-12-31，守卫白名单登记）；
//   状态样本：tf-002 active / 其余 deadline 已过 → completed / tf-008 dissolvedAt → dissolved。
export const MOCK_TASKFORCES = [
  {
    id: 'tf-001',
    branchId: DEFAULT_BRANCH_ID,
    name: '宣传专班（第二期）',
    task: '深度报道与专题视频制作 — 秋季学期系列主题活动宣传任务',
    manager: ORG_COMMISSIONER_ID,
    initiator: '2400012356',
    members: [
      { personId: '2400012352', role: 'deep', contributions: [] },
      { personId: '2400012353', role: 'deep', contributions: [] },
      // 批次 47-X（2026-09-16，承 47-W 的 R-78 口径）：为「专班查看 · 我的产出填报」
      //   （`taskforce-view.js` 的结构化产出登记入口）补一名**演示账号成员**。
      //   ⚠ 本专班已按日期收口为 completed，这两条演示入口的 active 载体已迁到 tf-002（见其成员注释）；
      //     本行保留为历史产出只读，不再承担可达性。
      // 批次 47-Y（2026-09-16，承 R-78 口径）：再补**一条待核产出**（成员填报 → 组织委员逐条核的形状）。
      { personId: '2400012349', role: 'deep', contributions: [{ id: 'c-tf1-1', desc: '撰写专班宣传稿（待核）', by: '2400012349', at: '2026-09-14T20:10:00+08:00' }] },
    ],
    capacity: 5,
    deadline: '2026-09-18',
    activityId: null,
    createdAt: '2026-08-06',
    // 立项③阶段a：专班中间进度（组织委员填报，纪检/组长只读可见）
    progressList: [
      { id: 'tp-demo-1', stage: '筹备中', note: '完成选题策划与成员分工排期，宣传物料清单已确定。', by: '2400012355', at: '2026-08-10T10:00:00.000Z' },
      { id: 'tp-demo-2', stage: '执行中', note: '深度报道采写进行中，已完成 2 篇专题稿件初稿。', by: '2400012355', at: '2026-08-14T15:30:00.000Z' },
    ],
  },
  {
    id: 'tf-002',
    branchId: DEFAULT_BRANCH_ID,
    name: 'SOP 系统维护专班',
    task: 'SOP 文档体系维护、系统同步更新、经验蒸馏记录',
    manager: ORG_COMMISSIONER_ID,
    initiator: '2300010001',
    members: [
      { personId: '2400012348', role: 'organizer', contributions: _contrib('更新秋季活动归档', '同步术语表') },
      { personId: '2400012351', role: 'organizer', contributions: _contrib('整理考勤数据') },
      // tf-001 按日期收口为 completed 后，原挂在它上面的「成员产出填报」与「组织委员逐条核验」
      //   两个演示入口迁到本常设专班（2400012349 是既有演示账号，不新造账号、不虚增人数）。
      //   ⇒ tf-002 成为唯一 active 专班，两条入口继续可达；tf-001 的历史产出保留只读。
      { personId: '2400012349', role: 'deep', contributions: [{ id: 'c-tf2-1', desc: '整理并校对 SOP 术语表（待核）', by: '2400012349', at: '2026-10-18T20:10:00+08:00' }] },
    ],
    capacity: 3,
    // SOP 维护是**常设**工作（无一次性活动对象），deadline 推到学期末（滚动维护），状态保持 active。
    // 跨期实体：deadline 2026-12-31 在演示窗口之外，由 demo-window-guard 白名单显式登记。
    deadline: '2026-12-31',
    activityId: null,
    createdAt: '2026-08-03',
  },
  {
    id: 'tf-003',
    branchId: DEFAULT_BRANCH_ID,
    name: '五四主题党日筹备专班',
    task: '9月3日五四精神传承主题党日活动全流程筹备',
    manager: ORG_COMMISSIONER_ID,
    initiator: '2400012345',
    members: [
      { personId: '2400012347', role: 'organizer', contributions: _contrib('策划方案', '场地预约') },
      { personId: '2400012352', role: 'deep', contributions: _contrib('视频制作') },
      { personId: '2400012353', role: 'deep', contributions: _contrib('新闻稿撰写') },
      { personId: '2400012349', role: 'participant', contributions: _contrib('物资准备') },
    ],
    capacity: 6,
    deadline: '2026-09-03',
    activityId: 'act-10',
    createdAt: '2026-08-28',
  },
  {
    id: 'tf-004',
    branchId: DEFAULT_BRANCH_ID,
    name: '共建座谈对接专班',
    task: '校企共建座谈（光华 x 中信证券）对接与执行',
    manager: ORG_COMMISSIONER_ID,
    initiator: '2300010001',
    members: [
      { personId: '2400012355', role: 'organizer', contributions: _contrib('嘉宾邀请', '议程设计') },
      { personId: '2400012354', role: 'deep', contributions: _contrib('现场记录', '考勤统计') },
    ],
    capacity: 4,
    deadline: '2026-09-08',
    activityId: 'act-12',
    createdAt: '2026-08-31',
  },
  {
    id: 'tf-005',
    branchId: DEFAULT_BRANCH_ID,
    name: '建党105周年筹备专班',
    task: '10月3日建党105周年主题党日大型活动筹备',
    manager: ORG_COMMISSIONER_ID,
    initiator: '2300010001',
    members: [
      { personId: '2400012345', role: 'organizer', contributions: [] },
      { personId: '2500010012', role: 'organizer', contributions: [] },
      { personId: '2400012351', role: 'participant', contributions: [] },
    ],
    capacity: 8,
    deadline: '2026-10-02',
    activityId: 'act-16',
    createdAt: '2026-08-10',
  },
  {
    id: 'tf-006',
    branchId: DEFAULT_BRANCH_ID,
    name: '参访活动保障专班',
    task: '10月参访活动后勤保障与安全',
    manager: ORG_COMMISSIONER_ID,
    initiator: '2400012345',
    members: [
      { personId: '2400012350', role: 'participant', contributions: [] },
    ],
    capacity: 4,
    deadline: '2026-10-01',
    activityId: 'act-14',
    createdAt: '2026-08-05',
  },
  {
    id: 'tf-007',
    branchId: DEFAULT_BRANCH_ID,
    name: '两会精神学习专班',
    task: '两会精神学习材料整理与分享',
    manager: ORG_COMMISSIONER_ID,
    initiator: '2400012356',
    members: [
      { personId: '2400012356', role: 'organizer', contributions: _contrib('材料整理', '分享会主持') },
      { personId: '2400012350', role: 'deep', contributions: _contrib('PPT制作') },
    ],
    capacity: 3,
    deadline: '2026-08-20',
    activityId: null,
    createdAt: '2026-08-10',
  },
  {
    id: 'tf-008',
    branchId: DEFAULT_BRANCH_ID,
    name: '九月活动档案整理专班',
    task: '九月活动归档整理、材料汇总与电子化',
    manager: ORG_COMMISSIONER_ID,
    initiator: '2300010001',
    members: [
      { personId: '2400012356', role: 'organizer', contributions: _contrib('材料汇总', '归档清单') },
      { personId: '2400012350', role: 'deep', contributions: _contrib('PPT制作', '电子档案') },
    ],
    capacity: 3,
    deadline: '2026-09-30',
    activityId: null,
    createdAt: '2026-09-21',
    dissolvedAt: '2026-10-02',
  },
];
