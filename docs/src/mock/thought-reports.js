// thought-reports.js — 思想汇报 Mock 数据（2026-08-30 书记决策启动数字化，算法归档）
// 数据模型对齐 domain.js mockDB.thoughtReports
// 提交人：党员/发展对象（p6 发展对象 / p7 积极分子 / p16 预备党员）
// 算法归档原则：提交即入库即归档，按 personId 自动归集至个人档案，组织委员查看调用
// 2026-09-06 基线刷新：submittedAt 随全局时间函数 f 压缩至 7 月下旬（见 activities.js 头注规则）

import { getPersonName } from '../services/person.js?v=20260909e';

const _personName = (id) => getPersonName(id) || id;

export const THOUGHT_REPORTS = [
  {
    id: 'tr-1',
    personId: 'p6',
    personName: _personName('p6'),
    title: '第二季度思想汇报',
    content: '本季度我系统学习了党的二十大报告和《中国共产党章程》，对党员标准和权利义务有了更清晰的认识。在支部组织的各项活动中，我主动承担任务、积极参与讨论，努力在实践中学思践悟。今后我将继续加强理论学习，密切联系群众，以党员标准严格要求自己。',
    submittedAt: '2026-07-25T10:00:00',
  },
  {
    id: 'tr-2',
    personId: 'p7',
    personName: _personName('p7'),
    title: '季度思想汇报',
    content: '作为积极分子，我定期向组织汇报思想动态。通过学习习近平新时代中国特色社会主义思想，我认识到理论学习必须与具体实践相结合。在党小组活动中，我观察学习优秀党员的言行，对照查找自身差距，明确了下一步努力方向。',
    submittedAt: '2026-07-24T09:30:00',
  },
  {
    id: 'tr-3',
    personId: 'p16',
    personName: _personName('p16'),
    title: '预备期思想汇报',
    content: '预备期内我持续接受党组织的培养考察。本季度重点学习了党纪党规，进一步理解了民主集中制的组织原则。在参与支部工作中，我体会到程序性安排与探索创新之间的平衡，坚定了在实践中经受考验、争取按期转正的决心。',
    submittedAt: '2026-07-25T14:00:00',
  },
];
