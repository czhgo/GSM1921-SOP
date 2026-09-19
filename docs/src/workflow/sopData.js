// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  sopData.js — SOP 数据库 v10.0 (JSON Schema-Driven)
//  字段说明：timeOffset 单位为天，null = 无时间锚点
//  S-3（2026-09-10）：desc 精简为一句话摘要（≤24字）；完整制度说明见
//  content/02_institution/ 对应文档，不在此复制长文
// ════════════════════════════════════════════════════════════════

export const sopDatabase = {
  scenarios: [
    {
      scenarioId: 'org-life', title: '组织生活会',
      domain: 'activity', description: '刚性考勤 · 仅限党员和预备党员',
      tasks: [
        { taskId: '1a-0', title: '时间统筹（三党小组组长协调）',  executor: 'leader',           supervisor: null,             timeOffset: -7, desc: '三组长统计本组可用时间，取重叠时段同步支委群。' },
        { taskId: '1a-1', title: '确定会议主题',        executor: 'leader',           supervisor: null,         timeOffset: -7, desc: '按支委会部署确定会议主题。' },
        { taskId: '1a-2', title: '会前谈心谈话',        executor: 'leader',           supervisor: null,         timeOffset: -7, desc: '与本组党员逐一谈心，掌握思想状况。' },
        { taskId: '1a-2b', title: '全员述职回顾',       executor: 'all',              supervisor: 'leader',     timeOffset: -5, desc: '会前5天全员回顾总结一年工作（述职）。' },
        { taskId: '1a-4', title: '通知到人',          executor: 'leader',           supervisor: null,         timeOffset: -3, desc: '提前至少3天群发通知（时间/地点/要求）。' },
        { taskId: '1a-4b', title: '发布考勤二维码',     executor: 'leader',           supervisor: null,         timeOffset:  0, desc: '现场发布考勤二维码，供党员扫码签到。' },
        { taskId: '1a-5', title: '签到考勤',            executor: 'disc-commissioner',supervisor: 'leader',     timeOffset:  0, desc: '纪检同步记录到场；请假/缺勤留档并跟进补课。' },
        { taskId: '1a-6a', title: '个人自评',            executor: 'all',              supervisor: null,         timeOffset:  0, desc: '结合述职做个人自我批评。' },
        { taskId: '1a-6c', title: '互相批评',            executor: 'all',              supervisor: null,         timeOffset:  0, desc: '开展互相批评，直指问题。' },
        { taskId: '1a-6d', title: '党小组组长总结',            executor: 'leader',           supervisor: null,         timeOffset:  0, desc: '组长做组织生活会总结发言。' },
        { taskId: '1a-6b', title: '摄影留存宣传底稿',   executor: 'leader',           supervisor: null,         timeOffset:  3, desc: '摄影留存，形成宣传底稿交宣传委员。' },
        { taskId: '1a-7b', title: '后台考勤汇总',       executor: 'disc-commissioner',supervisor: 'leader',     timeOffset:  3, desc: '后台汇总出勤数据，导出后交宣传委员归档。' },
        { taskId: '1a-7c', title: '活动参与三层记录',   executor: 'disc-commissioner',supervisor: 'leader',     timeOffset:  3, desc: '记录组织/深参/出勤三层角色，整理考察草稿。' },
        { taskId: '1a-8', title: '汇总组织生活会记录',  executor: 'leader',           supervisor: null,         timeOffset:  5, desc: '会后汇总述职摘要与检查材料成会议记录。' },
        { taskId: '1a-9', title: '档案归档',            executor: 'prop-commissioner',supervisor: 'leader',     timeOffset:  5, desc: '归档会议材料并上传智慧党建平台（T+5）。' },
        { taskId: '1a-10', title: '补课安排跟进',       executor: 'disc-commissioner',supervisor: 'leader',     timeOffset:  7, desc: 'T+7内安排缺勤人员补课并跟踪完成。' },
      ],
    },
    {
      scenarioId: 'theme-party', title: '党小组主题党日活动',
      domain: 'activity', description: '弹性考勤 · 全体支部成员可参与',
      tasks: [
        { taskId: '1b-1', title: '活动发起',              executor: 'organizer',        supervisor: 'leader',     timeOffset: -7, desc: '策划活动方案，选定路径a/b并启动招募。' },
        { taskId: '1b-2', title: '活动报备',              executor: 'expanded-committee', supervisor: null,         timeOffset: -7, desc: '把活动方案发到支委扩大群报备，报备通过后方才写入活动。' },
        { taskId: '1b-3', title: '联系条条委员',          executor: 'organizer',        supervisor: 'leader',     timeOffset: -7, desc: '按需联系组织/宣传/纪检委员对接需求。' },
        { taskId: '1b-4', title: '发布活动通知',          executor: 'organizer',        supervisor: null,         timeOffset: -2, desc: '群内发布活动通知；外出活动提前2天建群。' },
        { taskId: '1b-5', title: '对接考勤要求与复盘底线',   executor: 'disc-commissioner',supervisor: 'leader',     timeOffset: -2, desc: '与组织者对接考勤要求与复盘底线（T+7）。' },
        { taskId: '1b-6', title: '活动实施',              executor: 'organizer',        supervisor: 'leader',     timeOffset:  0, desc: '全程负责：签到/拍照/发言记录/材料收齐。' },
        { taskId: '1b-6a', title: '考勤确认',            executor: 'disc-commissioner',supervisor: 'leader',     timeOffset:  0, desc: '组织者上传党小组考勤，纪检确认后录入总表。' },
        { taskId: '1b-6b', title: '复盘提醒',            executor: 'disc-commissioner',supervisor: 'leader',     timeOffset:  1, desc: 'T+1提醒组织者本人按时提交复盘（T+7）。' },
        { taskId: '1b-7', title: '活动复盘',              executor: 'organizer',        supervisor: 'leader',     timeOffset:  7, desc: '完成活动复盘（积极分子可代，组长把关）。' },
        { taskId: '1b-8', title: '宣传产出（摘要+配图）', executor: 'deep',             supervisor: 'commissioner', timeOffset: 3, desc: '深度参与者产出摘要+配图，纳入月度推送。' },
        { taskId: '1b-7c', title: '考察确认',            executor: 'disc-commissioner',supervisor: 'leader',     timeOffset:  3, desc: '组织者上传活动考察，纪检确认后录入总表。' },
        { taskId: '1b-9', title: '材料归档',              executor: 'organizer',        supervisor: 'leader',     timeOffset:  7, desc: '打包考勤/宣传/考察材料交宣传委员归档。' },
        { taskId: '1b-7b', title: '复盘监督（批注/打回/确认）', executor: 'disc-commissioner',supervisor: 'leader',     timeOffset:  7, desc: '检查复盘是否本人完成/充实/按时，批注或打回。' },
      ],
    },
    {
      scenarioId: 'branch-party-meeting', title: '支部党员大会',
      domain: 'activity', description: '刚性考勤 · 仅限党员和预备党员',
      tasks: [
        // C-23/D-328：三会按同一套环节取齐（母本《常见工作场景快速指南》三会一课通用流程 9 步）——
        // 全支部会议由支书承担会前与会中主持环节。
        { taskId: '1c-1', title: '确定会议主题',      executor: 'secretary',        supervisor: null,      timeOffset: -7, desc: '根据支委会部署确定会议主题与议程。' },
        { taskId: '1c-2', title: '通知到人',          executor: 'secretary',        supervisor: null,      timeOffset: -5, desc: '提前至少5天发送正式会议通知，确认收到时即确认能否线上参会。' },
        { taskId: '1c-3', title: '二维码签到',        executor: 'disc-commissioner',supervisor: 'leader',  timeOffset:  0, desc: '现场组织扫码签到并汇总签到结果。' },
        { taskId: '1c-4', title: '签到考勤',          executor: 'disc-commissioner',supervisor: 'leader',  timeOffset:  0, desc: '刚性考勤；请假/缺勤留档并跟进补课。' },
        { taskId: '1c-5', title: '按议程开会',        executor: 'secretary',        supervisor: null,      timeOffset:  0, desc: '按会议性质推进议程，主持人作总结发言。' },
        { taskId: '1c-6', title: '摄影留存宣传底稿',  executor: 'leader',           supervisor: null,      timeOffset:  3, desc: '摄影留存，形成宣传底稿交宣传委员。' },
        { taskId: '1c-7', title: '后台考勤汇总',      executor: 'disc-commissioner',supervisor: 'leader',  timeOffset:  3, desc: '后台汇总出勤数据（汇总表第一列是人）。' },
        { taskId: '1c-8', title: '汇总会议记录',      executor: 'leader',           supervisor: null,      timeOffset:  5, desc: '整理会议记录（含照片与会议要点）。' },
        { taskId: '1c-9', title: '档案归档',          executor: 'prop-commissioner',supervisor: 'leader',  timeOffset:  5, desc: '归档会议材料（宣传推文+配图 / 党支部工作记录）并上传智慧党建平台。' },
      ],
    },
    {
      scenarioId: 'party-group-meeting', title: '党小组会',
      domain: 'activity', description: '刚性考勤 · 仅限党员和预备党员',
      tasks: [
        // C-23/D-328：三会按同一套环节取齐（母本《常见工作场景快速指南》三会一课通用流程 9 步）——
        // 党小组会由党小组组长承担会前、会中主持与会议记录环节。
        { taskId: '1d-1', title: '确定会议主题',      executor: 'leader',           supervisor: null,      timeOffset: -7, desc: '按支委会部署确定会议主题与议程。' },
        { taskId: '1d-2', title: '通知到人',          executor: 'leader',           supervisor: null,      timeOffset: -5, desc: '提前至少5天群发正式会议通知，确认收到时即确认能否线上参会。' },
        { taskId: '1d-3', title: '二维码签到',        executor: 'disc-commissioner',supervisor: 'leader',  timeOffset:  0, desc: '现场组织扫码签到并汇总签到结果。' },
        { taskId: '1d-4', title: '签到考勤',          executor: 'disc-commissioner',supervisor: 'leader',  timeOffset:  0, desc: '刚性考勤；请假/缺勤留档并跟进补课。' },
        { taskId: '1d-5', title: '按议程开会',        executor: 'leader',           supervisor: null,      timeOffset:  0, desc: '按会议性质推进议程，主持人作总结发言。' },
        { taskId: '1d-6', title: '摄影留存宣传底稿',  executor: 'leader',           supervisor: null,      timeOffset:  3, desc: '摄影留存，形成宣传底稿交宣传委员。' },
        { taskId: '1d-7', title: '后台考勤汇总',      executor: 'disc-commissioner',supervisor: 'leader',  timeOffset:  3, desc: '后台汇总出勤数据（汇总表第一列是人）。' },
        { taskId: '1d-8', title: '汇总会议记录',      executor: 'leader',           supervisor: null,      timeOffset:  5, desc: '整理会议记录（含照片与会议要点）。' },
        { taskId: '1d-9', title: '档案归档',          executor: 'prop-commissioner',supervisor: 'leader',  timeOffset:  5, desc: '归档会议材料并上传智慧党建平台。' },
      ],
    },
    {
      scenarioId: 'party-lecture', title: '党课',
      domain: 'activity', description: '刚性考勤 · 仅限党员和预备党员',
      tasks: [
        { title: '发布党课通知与学习材料', executor: 'secretary', supervisor: null, timeOffset: -3 },
        { title: '提醒缺席党员进行补课', executor: 'secretary', supervisor: null, timeOffset: 1 },
      ],
    },
    {
      scenarioId: 'branch-committee', title: '支委会',
      domain: 'activity', description: '刚性考勤 · 支委会委员参加 · 研究支部日常工作',
      tasks: [
        // C-23/D-328：三会按同一套环节取齐（母本《常见工作场景快速指南》三会一课通用流程 9 步）——
        // 支委会由支书承担会前、会中主持与会议记录环节（督办位＝支书）。
        { taskId: '1e-1', title: '确定会议主题',      executor: 'secretary',        supervisor: null,        timeOffset: -7, desc: '支书定议题与议程。' },
        { taskId: '1e-2', title: '通知到人',          executor: 'secretary',        supervisor: null,        timeOffset: -5, desc: '提前至少5天通知支委（时间/地点/议题）。' },
        { taskId: '1e-3', title: '二维码签到',        executor: 'disc-commissioner',supervisor: 'secretary', timeOffset:  0, desc: '现场组织扫码签到并汇总签到结果。' },
        { taskId: '1e-4', title: '签到考勤',          executor: 'disc-commissioner',supervisor: 'secretary', timeOffset:  0, desc: '纪检记录支委到场情况；请假/缺勤留档。' },
        { taskId: '1e-5', title: '按议程开会',        executor: 'secretary',        supervisor: null,        timeOffset:  0, desc: '支书主持，按议程研究支部日常工作并作总结。' },
        { taskId: '1e-6', title: '摄影留存宣传底稿',  executor: 'secretary',        supervisor: null,        timeOffset:  3, desc: '摄影留存，形成宣传底稿交宣传委员。' },
        { taskId: '1e-7', title: '后台考勤汇总',      executor: 'disc-commissioner',supervisor: 'secretary', timeOffset:  3, desc: '后台汇总出勤数据（汇总表第一列是人）。' },
        { taskId: '1e-8', title: '汇总会议记录',      executor: 'secretary',        supervisor: null,        timeOffset:  5, desc: '用工作记录模板记决议。' },
        { taskId: '1e-9', title: '档案归档',          executor: 'prop-commissioner',supervisor: 'secretary', timeOffset:  5, desc: '归档党支部工作记录并上传党建平台。' },
      ],
    },
    {
      scenarioId: 'attendance-check', title: '查考勤记录',
      domain: 'organization', description: '考勤与考察分离体系',
      tasks: [
        { taskId: '6-1', title: '查三会一课考勤',               executor: 'disc-commissioner',supervisor: 'leader', timeOffset: null },
        { taskId: '6-2', title: '查考察档案与活动参与统计',     executor: 'org-commissioner', supervisor: 'leader', timeOffset: null },
      ],
    },
    {
      scenarioId: 'feedback-handling', title: '处理意见建议反馈',
      domain: 'organization', description: '支部全体成员可提出',
      tasks: [
        { title: '广泛收集意见建议', executor: 'secretary', supervisor: null, timeOffset: null },
        { title: '组织召开座谈会或支委会讨论', executor: 'secretary', supervisor: null, timeOffset: null },
        { title: '牵头制度修改与定稿', executor: 'secretary', supervisor: null, timeOffset: null },
        { title: '向党员大会反馈处理结果', executor: 'secretary', supervisor: null, timeOffset: null },
      ],
    },
  ],
};
