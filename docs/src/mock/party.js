export const CANDIDATE_STAGES = ['入党申请人', '积极分子', '发展对象', '预备党员', '正式党员'];

export const COMPLIANCE_FILES = [
  { name: '中国共产党章程', path: '#search', note: '请通过「资料查询」模块获取' },
  { name: '党支部工作规范（学生）', path: '#search', note: '请通过「资料查询」模块获取' },
  { name: '党员教育管理工作条例', path: '#search', note: '请通过「资料查询」模块获取' },
  { name: '发展党员工作细则', path: '#search', note: '请通过「资料查询」模块获取' },
  { name: '高校基层组织工作条例', path: '#search', note: '请通过「资料查询」模块获取' },
  { name: '支部工作条例（试行）', path: '#search', note: '请通过「资料查询」模块获取' },
];

export const PUBLICITY_STANDARDS = [
  { category: '照片规范', items: ['活动照片不少于3张，含全景1张+特写2张', '照片分辨率不低于1920x1080', '横版优先，竖版不超过1/3', '禁止使用美颜滤镜'] },
  { category: '文字规范', items: ['新闻稿字数500-800字', '标题使用黑体二号加粗', '正文使用仿宋三号', '行间距28磅'] },
  { category: '排版规范', items: ['A4纸排版，页边距上下2.54cm、左右3.17cm', '页码居中，底部5cm处', '正文首行缩进2字符'] },
];

export const TEMPLATE_LIST = [
  { name: '活动总结模板', desc: '用于总结各类党支部活动', color: '#CE1126', bgColor: 'rgba(206,17,38,0.08)' },
  { name: '会议记录模板', desc: '规范记录党支部会议内容', color: '#3B82F6', bgColor: 'rgba(59,130,246,0.08)' },
  { name: '入党申请书模板', desc: '入党申请人撰写参考', color: '#10B981', bgColor: 'rgba(16,185,129,0.08)' },
  { name: '思想汇报模板', desc: '季度思想汇报撰写参考', color: '#8B5CF6', bgColor: 'rgba(139,92,246,0.08)' },
  { name: '转正申请书模板', desc: '预备党员转正申请参考', color: '#D97706', bgColor: 'rgba(217,119,6,0.08)' },
  { name: '活动复盘模板', desc: '活动复盘与经验总结', color: '#EF4444', bgColor: 'rgba(239,68,68,0.08)' },
];

export const PARTY_MOCKS = {
  candidates: [
    { id: 'c1', personId: 'p4', stage: '正式党员', materialsComplete: false, missingMaterials: 3 },
    { id: 'c3', personId: 'p6', stage: '发展对象', materialsComplete: true, missingMaterials: 0 },
    { id: 'c4', personId: 'p7', stage: '积极分子', materialsComplete: true, missingMaterials: 0 },
    { id: 'c5', personId: 'p15', stage: '积极分子', materialsComplete: false, missingMaterials: 2 },
  ],
  makeupTasks: [
    { id: 'mk1', personId: 'p1', activityId: 'act-7', attendanceRecordId: 'att_p1', activityName: '4月主题党日：红色基地参访', personName: '张三', absentDate: '2026-04-15', deadline: '2026-04-22', status: 'pending', isMandatory: true, proofContent: null, completedAt: null, createdAt: '2026-04-16T08:00:00Z', overdue: true },
    { id: 'mk2', personId: 'p2', activityId: 'act-5', attendanceRecordId: 'att_p2', activityName: '4月支委会', personName: '李四', absentDate: '2026-04-18', deadline: '2026-04-25', status: 'pending', isMandatory: true, proofContent: null, completedAt: null, createdAt: '2026-04-19T08:00:00Z', overdue: true },
    { id: 'mk3', personId: 'p3', activityId: 'act-4', attendanceRecordId: 'att_p3', activityName: '4月党小组会', personName: '王五', absentDate: '2026-03-20', deadline: '2026-03-27', status: 'completed', isMandatory: true, proofContent: '已补课', completedAt: '2026-03-25T10:00:00Z', createdAt: '2026-03-21T08:00:00Z' },
    { id: 'mk4', personId: 'p4', activityId: 'act-6', attendanceRecordId: 'att_p4', activityName: '4月党课：新时代青年担当', personName: '赵六', absentDate: '2026-04-25', deadline: '2026-05-02', status: 'pending', isMandatory: true, proofContent: null, completedAt: null, createdAt: '2026-04-26T08:00:00Z', overdue: true },
    { id: 'mk5', personId: 'p5', activityId: 'act-3', attendanceRecordId: 'att_p5', activityName: '3月主题党日：学习两会精神', personName: '钱七', absentDate: '2026-03-14', deadline: '2026-03-21', status: 'completed', isMandatory: true, proofContent: '已补课', completedAt: '2026-03-18T14:00:00Z', createdAt: '2026-03-15T08:00:00Z' },
  ],
  feedbackItems: [
    { id: 'fb1', content: '建议增加线上学习渠道', status: 'pending', date: '2026-04-20' },
    { id: 'fb2', content: '活动时间冲突反馈', status: 'processing', date: '2026-04-18' },
    { id: 'fb3', content: '培训内容建议', status: 'pending', date: '2026-04-22' },
    { id: 'fb4', content: '会议效率改进建议', status: 'done', date: '2026-04-10' },
    { id: 'fb5', content: '材料模板更新需求', status: 'done', date: '2026-04-05' },
  ],
};
