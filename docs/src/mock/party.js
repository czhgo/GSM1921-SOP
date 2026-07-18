export const CANDIDATE_STAGES = ['入党申请人', '积极分子', '发展对象', '预备党员', '正式党员'];

export const COMPLIANCE_FILES = [
  { name: '中国共产党章程', path: '../content/references/合规文件/【附件11】中国共产党章程.pdf', note: 'T1 上级制度原文' },
  { name: '党支部工作规范（学生）', path: '../content/references/合规文件/【附件12】党支部工作规范（学生）.pdf', note: 'T1 上级制度原文' },
  { name: '党员教育管理工作条例', path: '../content/references/合规文件/【附件14】中国共产党党员教育管理工作条例（2019年5月21日）.docx', note: 'T1 上级制度原文' },
  { name: '发展党员工作细则', path: '../content/references/合规文件/【附件15】中国共产党发展党员工作细则（2014年）.docx', note: 'T1 上级制度原文' },
  { name: '高校基层组织工作条例', path: '../content/references/合规文件/【附件16】中国共产党普通高等学校基层组织工作条例（2010年8月13日）.docx', note: 'T1 上级制度原文' },
  { name: '支部工作条例（试行）', path: '../content/references/合规文件/【附件17】中国共产党支部工作条例（试行）（2018年10月28日）.docx', note: 'T1 上级制度原文' },
];

export const PUBLICITY_STANDARDS = [
  { category: '照片规范', items: ['活动照片不少于3张，含全景1张+特写2张', '照片分辨率不低于1920x1080', '横版优先，竖版不超过1/3', '禁止使用美颜滤镜'] },
  { category: '文字规范', items: ['新闻稿字数500-800字', '标题使用黑体二号加粗', '正文使用仿宋三号', '行间距28磅'] },
  { category: '排版规范', items: ['A4纸排版，页边距上下2.54cm、左右3.17cm', '页码居中，底部5cm处', '正文首行缩进2字符'] },
];

export const TEMPLATE_LIST = [
  { name: '活动复盘模板', desc: '活动复盘与经验总结（系统内表单·标准化工作流）', color: '#EF4444', bgColor: 'rgba(239,68,68,0.08)' },
];

// 最后更新：2026-07-16（T-2026-07-006 第 5 轮 mock 数据迭代）
// candidates: 补充 c1/c2 使 ID 连续为 c1~c5，使用新增人员确保 stage 与 developStage 一致
// makeupTasks: 以 attendance.js 考勤记录为准重写，attendanceRecordId 指向真实存在的记录
export const PARTY_MOCKS = {
  candidates: [
    { id: 'c1', personId: 'p21', name: '沈佳琪', stage: '入党申请人', materialsComplete: false, missingMaterials: 3 },
    { id: 'c2', personId: 'p18', name: '谢晓东', stage: '积极分子',   materialsComplete: true,  missingMaterials: 0 },
    { id: 'c3', personId: 'p6',  name: '孙八',   stage: '发展对象',   materialsComplete: true,  missingMaterials: 0 },
    { id: 'c4', personId: 'p7',  name: '周九',   stage: '积极分子',   materialsComplete: true,  missingMaterials: 0 },
    { id: 'c5', personId: 'p15', name: '吴十',   stage: '积极分子',   materialsComplete: false, missingMaterials: 2 },
  ],
  makeupTasks: [
    { id: 'mk1', personId: 'p2',  activityId: 'act-2',  attendanceRecordId: 'att3',  activityName: '3月支委会',                 personName: '李四', absentDate: '2026-03-18', deadline: '2026-03-25', status: 'pending',   isMandatory: true, proofContent: null,    completedAt: null,                   createdAt: '2026-03-19T08:00:00Z', overdue: true },
    { id: 'mk2', personId: 'p4',  activityId: 'act-2',  attendanceRecordId: 'att5',  activityName: '3月支委会',                 personName: '赵六', absentDate: '2026-03-18', deadline: '2026-03-25', status: 'pending',   isMandatory: true, proofContent: null,    completedAt: null,                   createdAt: '2026-03-19T08:00:00Z', overdue: true },
    { id: 'mk3', personId: 'p7',  activityId: 'act-9',  attendanceRecordId: 'att27', activityName: '5月党小组会',               personName: '周九', absentDate: '2026-05-14', deadline: '2026-05-21', status: 'completed', isMandatory: true, proofContent: '已补课', completedAt: '2026-05-18T10:00:00Z', createdAt: '2026-05-15T08:00:00Z' },
    { id: 'mk4', personId: 'p5',  activityId: 'act-11', attendanceRecordId: 'att38', activityName: '5月支委会',                 personName: '钱七', absentDate: '2026-05-20', deadline: '2026-05-27', status: 'pending',   isMandatory: true, proofContent: null,    completedAt: null,                   createdAt: '2026-05-21T08:00:00Z', overdue: true },
    { id: 'mk5', personId: 'p15', activityId: 'act-6',  attendanceRecordId: 'att14', activityName: '4月党课：新时代青年担当',   personName: '吴十', absentDate: '2026-04-25', deadline: '2026-05-02', status: 'completed', isMandatory: true, proofContent: '已补课', completedAt: '2026-04-29T14:00:00Z', createdAt: '2026-04-26T08:00:00Z' },
  ],
  feedbackItems: [
    { id: 'fb1', content: '建议增加线上学习渠道', status: 'pending', date: '2026-04-20' },
    { id: 'fb2', content: '活动时间冲突反馈', status: 'processing', date: '2026-04-18' },
    { id: 'fb3', content: '培训内容建议', status: 'pending', date: '2026-04-22' },
    { id: 'fb4', content: '会议效率改进建议', status: 'done', date: '2026-04-10' },
    { id: 'fb5', content: '材料模板更新需求', status: 'done', date: '2026-04-05' },
  ],
};
