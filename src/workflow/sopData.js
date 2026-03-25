// ════════════════════════════════════════════════════════════════
//  sopData.js — SOP 数据库 v7.0 (JSON Schema-Driven)
//  字段说明：timeOffset 单位为天，null = 无时间锚点
// ════════════════════════════════════════════════════════════════

export const sopDatabase = {
  scenarios: [
    {
      scenarioId: 'org-life', title: '【活动建设】组织生活会',
      domain: 'activity', description: '刚性考勤 · 仅限党员和预备党员',
      tasks: [
        { taskId: '1a-0', title: '时间统筹（三组长协调）',  executor: 'leader',           supervisor: null,             timeOffset: -7, desc: '三位党小组长各自统计本组党员可用时间，取最大公因数（重叠时间段）；在支委群中同步结果；由支部书记在党支部大群统一发布，要求全员至少参与一场。' },
        { taskId: '1a-1', title: '确定会议主题',        executor: 'leader',           supervisor: null,         timeOffset: -7, desc: '块块组长根据支委会部署确定会议主题，确保与年度工作重点一致。' },
        { taskId: '1a-2', title: '会前谈心谈话',        executor: 'leader',           supervisor: null,         timeOffset: -7, desc: '组长与本组党员逐一谈心，了解思想状况，为会议提供信息基础。' },
        { taskId: '1a-2b', title: '全员述职回顾',       executor: 'all',              supervisor: 'leader',     timeOffset: -5, desc: '会前5天，全体参会党员回顾总结过去一年在党支部中承担的工作（述职），作为个人对照检查材料的基础素材。 - Source: knowledge/SOP/常见工作场景快速指南.md#活动建设组织生活会严肃政治会议' },
        { taskId: '1a-4', title: '通知到人',          executor: 'leader',           supervisor: null,         timeOffset: -3, desc: '块块组长通过党小组群发送正式会议通知，注明时间、地点、参会要求，必须提前至少3天；如需覆盖全支部，由支部书记通过党支部大群统一发布。' },
        { taskId: '1a-4b', title: '发布考勤二维码',     executor: 'leader',           supervisor: null,         timeOffset:  0, desc: '现场组织的党小组长负责在会议现场发布考勤二维码，供与会党员扫码签到。 - Source: knowledge/SOP/常见工作场景快速指南.md#活动建设组织生活会严肃政治会议' },
        { taskId: '1a-5', title: '签到考勤',            executor: 'disc-commissioner',supervisor: 'leader',     timeOffset:  0, desc: '执行刚性考勤（三会一课范畴）。组长发布二维码后，纪检委员同步记录到场情况。事假须提前1天申请；病假可事后补假。缺勤须记录留档。请假/缺勤人员的补课安排跟进见 §1.3 补课跟进机制（T+7 执行）。' },
        { taskId: '1a-6a', title: '个人自评',            executor: 'all',              supervisor: null,         timeOffset:  0, desc: '每位党员做个人自我批评，结合述职回顾内容展开。' },
        { taskId: '1a-6c', title: '互相批评',            executor: 'all',              supervisor: null,         timeOffset:  0, desc: '开展批评与自我批评，要有辣味，直指问题。' },
        { taskId: '1a-6d', title: '组长总结',            executor: 'leader',           supervisor: null,         timeOffset:  0, desc: '块块组长做总结发言，对本次组织生活会进行回顾与总结。' },
        { taskId: '1a-6b', title: '摄影留存宣传底稿',   executor: 'leader',           supervisor: null,         timeOffset:  3, desc: '现场主持的党小组长负责摄影留存，形成宣传底稿（照片+简要文字记录），提交宣传委员备用。 - Source: knowledge/SOP/常见工作场景快速指南.md#活动建设组织生活会严肃政治会议' },
        { taskId: '1a-7b', title: '后台考勤汇总',       executor: 'disc-commissioner',supervisor: 'leader',     timeOffset:  3, desc: '纪检委员在后台考勤小程序中统一汇总出勤数据，字段含：姓名、学号、发展阶段、所属党小组；导出后提交宣传委员归档。 - Source: knowledge/SOP/纪检委员工作流程指南.md#二考勤管理三会一课' },
        { taskId: '1a-7c', title: '活动参与三层记录',   executor: 'disc-commissioner',supervisor: 'leader',     timeOffset:  3, desc: '现场记录组织/深度参与/出勤三层角色；活动后在后台考勤汇总时（T+3）与组织者确认人员名单及分层，整理为参与记录草稿，供月底汇总使用。 - Source: 纪检委员工作流程指南 §1.3「活动参与三层记录规范」' },
        { taskId: '1a-8', title: '汇总组织生活会记录',  executor: 'leader',           supervisor: null,         timeOffset:  5, desc: '党小组组长会后收集过去一年承担较多工作的骨干同志的检查材料，与图片汇总整理形成完整的组织生活会记录（含述职摘要+对照检查材料精选）。 - Source: knowledge/SOP/常见工作场景快速指南.md#活动建设组织生活会严肃政治会议' },
        { taskId: '1a-9', title: '档案归档',            executor: 'prop-commissioner',supervisor: 'leader',     timeOffset:  5, desc: '宣传委员归档会议材料（组织生活会记录），上传智慧党建平台，T+5天完成。' },
        { taskId: '1a-10', title: '补课安排跟进',       executor: 'disc-commissioner',supervisor: 'leader',     timeOffset:  7, desc: '对请假/缺勤人员事后1周内（T+7）安排补课并跟踪完成；特殊情况可延至T+14，须在备注中标注。 - Source: 纪检委员工作流程指南 §1.3「补课跟进机制」' },
      ],
    },
    {
      scenarioId: 'theme-party', title: '【活动建设】党小组主题党日活动',
      domain: 'activity', description: '弹性考勤 · 全体支部成员可参与',
      tasks: [
        { taskId: '1b-1', title: '活动发起',              executor: 'organizer',        supervisor: 'leader',     timeOffset: -7, desc: '策划活动方案，确定路径 a（有品牌活动，块块组长主导招募）或路径 b（无现成活动，策划参与成本低且有组织效应的活动）。' },
        { taskId: '1b-2', title: '组长审批',              executor: 'leader',           supervisor: null,         timeOffset: -7, desc: '必须报块块组长审批同意后方可推进。组长评估活动是否符合党支部组织意图，以及资源与时间是否可行。' },
        { taskId: '1b-3', title: '联系条条委员',          executor: 'organizer',        supervisor: 'leader',     timeOffset: -7, desc: '按需联系组织委员（通知）、宣传委员（宣传指导）、纪检委员（考勤督办），说明活动计划与需求。' },
        { taskId: '1b-4', title: '发布活动通知',          executor: 'leader',           supervisor: null,         timeOffset: -2, desc: '块块组长通过党小组群发布本组活动通知；外出活动提前2天完成建群并确保所有人员到位。' },
        { taskId: '1b-5', title: '考勤督办（微信备忘录）',executor: 'disc-commissioner',supervisor: 'leader',     timeOffset: -2, desc: '邀请纪检委员加入活动小群，在群内发送标准化微信备忘录，说明考勤要求与复盘底线。' },
        { taskId: '1b-6', title: '活动实施',              executor: 'organizer',        supervisor: 'leader',     timeOffset:  0, desc: '组织者全程负责。核查清单：签到 · 现场拍照（全景/互动/细节各至少1张）· 关键发言记录 · 活动结束前确认材料收齐。' },
        { taskId: '1b-6b', title: '复盘提醒',            executor: 'disc-commissioner',supervisor: 'leader',     timeOffset:  1, desc: '活动后第1天，在活动小群内提醒组织者按时提交复盘；明确复盘须由组织者本人完成，截止时间为T+7。 - Source: 纪检委员工作流程指南 §1.3「复盘督办全链路①」' },
        { taskId: '1b-7', title: '活动复盘',              executor: 'organizer',        supervisor: 'leader',     timeOffset:  7, desc: '完成活动复盘（积极分子可代完成，但块块组长须起指导作用）。参考：《活动复盘模板》。' },
        { taskId: '1b-8', title: '宣传产出（摘要+配图）', executor: 'deep',             supervisor: 'commissioner', timeOffset: 3, desc: '活动摘要+配图，纳入月度推送；无需宣传预热。宣传委员角色是指导，深度参与者负责执行。' },
        { taskId: '1b-7c', title: '活动参与三层记录',   executor: 'disc-commissioner',supervisor: 'leader',     timeOffset:  3, desc: '整理确认活动参与三层记录（现场已开始记录）；T+3与组织者确认人员名单及分层，形成参与记录草稿，供月底汇总使用。 - Source: 纪检委员工作流程指南 §1.3「活动参与三层记录规范」' },
        { taskId: '1b-9', title: '材料归档',              executor: 'organizer',        supervisor: 'leader',     timeOffset:  7, desc: '将全部活动材料主动交给宣传委员归档。参考：《活动总结模板》。' },
        { taskId: '1b-7b', title: '复盘完成检查',        executor: 'disc-commissioner',supervisor: 'leader',     timeOffset:  7, desc: '检查活动复盘完成情况：①是否由组织者本人完成；②内容是否充实有反思；③是否按时提交（T+7）。未完成→二次催促；超期仍未完成→上报支委会。 - Source: 纪检委员工作流程指南 §1.3「复盘督办全链路②③④」' },
      ],
    },
    {
      scenarioId: 'joint-event', title: '【活动建设】团支部合办活动',
      domain: 'activity', description: '党小组主导 · 团班配合执行',
      tasks: [
        { taskId: '4-1', title: '评估契合度',           executor: 'leader',           supervisor: null,         timeOffset: null },
        { taskId: '4-2', title: '共同策划活动方案',     executor: 'leader',           supervisor: null,         timeOffset: null },
        { taskId: '4-3', title: '块块职能支持',         executor: 'org-commissioner', supervisor: 'leader',     timeOffset: null },
        { taskId: '4-4', title: '活动实施',             executor: 'organizer',        supervisor: 'leader',     timeOffset: null },
      ],
    },
    {
      scenarioId: 'brand-activity', title: '【活动建设】党小组品牌活动建设',
      domain: 'activity', description: '考察积极分子的重点场域',
      tasks: [
        { taskId: '8-1', title: '明确定位与设计方案',   executor: 'organizer',        supervisor: 'leader',     timeOffset: null },
        { taskId: '8-2', title: '锁定 Who/What/How',   executor: 'organizer',        supervisor: 'leader',     timeOffset: null },
        { taskId: '8-3', title: '试点实施与迭代优化',   executor: 'organizer',        supervisor: 'leader',     timeOffset: null },
        { taskId: '8-4', title: '总结与持续跟进',       executor: 'organizer',        supervisor: 'leader',     timeOffset: null },
      ],
    },
    {
      scenarioId: 'new-system', title: '【组织建设】制度制定与迭代',
      domain: 'organization', description: '主导角色：条条委员',
      tasks: [
        { taskId: '2-1', title: '起草制度初稿',                 executor: 'org-commissioner', supervisor: 'leader', timeOffset: null },
        { taskId: '2-2', title: '本组试点征求初步意见',         executor: 'org-commissioner', supervisor: 'leader', timeOffset: null },
        { taskId: '2-3', title: '块块组长征求各组意见',         executor: 'leader',           supervisor: null,     timeOffset: null },
        { taskId: '2-4', title: '修改完善并提交支委会审议',     executor: 'org-commissioner', supervisor: 'leader', timeOffset: null },
        { taskId: '2-5', title: '支部党员大会表决',             executor: 'all',              supervisor: null,     timeOffset: null },
        { taskId: '2-6', title: '监督落实与适时修订',           executor: 'org-commissioner', supervisor: 'leader', timeOffset: null },
      ],
    },
    {
      scenarioId: 'develop-activist', title: '【组织建设】考察积极分子',
      domain: 'organization', description: '培养考察期至少1年',
      tasks: [
        { taskId: '3-1', title: '日常观察（态度+能力）',        executor: 'leader',           supervisor: null,     timeOffset: null },
        { taskId: '3-2', title: '建立与维护考察档案',           executor: 'org-commissioner', supervisor: 'leader', timeOffset: null },
        { taskId: '3-3', title: '归档思想汇报',                 executor: 'org-commissioner', supervisor: 'leader', timeOffset: null, desc: '接收纪检委员转交的思想汇报并归档；字数标准统一为1500字以上。' },
        { taskId: '3-4', title: '向书记反馈考察意见',           executor: 'leader',           supervisor: null,     timeOffset: null },
        { taskId: '3-5', title: '支委会讨论与党员大会表决',     executor: 'all',              supervisor: null,     timeOffset: null },
      ],
    },
    {
      scenarioId: 'info-platform', title: '【组织建设】信息平台支持',
      domain: 'organization', description: '提前至少2天联系',
      tasks: [
        { taskId: '5-1', title: '提出信息平台支持需求',         executor: 'all',              supervisor: null,     timeOffset: -2 },
        { taskId: '5-2', title: '公邮定时查收与分发',           executor: 'disc-commissioner',supervisor: 'leader', timeOffset: null, desc: '纪检委员每周查看支部公邮1次；查收、汇总与必要转发/提醒，转交组织委员归档。' },
        { taskId: '5-2b', title: '每周一报送学工周报',         executor: 'prop-commissioner',supervisor: 'leader', timeOffset: null, desc: '每周一向学工周报负责人报送上一周活动信息，内容含：活动时间/地点/人员/内容概述；产出物为周报投稿截图（留档备查）。 - Source: 宣传委员工作流程指南 §1.1「每周一报送机制」' },
        { taskId: '5-3', title: '材料复核督办与档案维护',       executor: 'org-commissioner', supervisor: 'leader', timeOffset: null, desc: '实际材料审核工作由党办进行；组织委员负责提醒与协调进度。' },
      ],
    },
    {
      scenarioId: 'attendance-check', title: '【组织建设】查考勤记录',
      domain: 'organization', description: '考勤与考察分离体系',
      tasks: [
        { taskId: '6-1', title: '查三会一课考勤',               executor: 'disc-commissioner',supervisor: 'leader', timeOffset: null },
        { taskId: '6-2', title: '查考察档案与活动参与统计',     executor: 'org-commissioner', supervisor: 'leader', timeOffset: null },
      ],
    },
    {
      scenarioId: 'branch-discussion', title: '【组织建设】支部讨论重要事项',
      domain: 'organization', description: '支委会每月1次 · 党员大会每季度1次',
      tasks: [
        { taskId: '7-1', title: '党小组日常事务（组长负责制）', executor: 'leader',           supervisor: null,     timeOffset: null },
        { taskId: '7-2', title: '制度建设事项',                 executor: 'org-commissioner', supervisor: 'leader', timeOffset: null },
        { taskId: '7-3', title: '党员发展与重大事项',           executor: 'all',              supervisor: null,     timeOffset: null },
      ],
    },
    {
      scenarioId: 'feedback-handling', title: '【组织建设】处理意见建议反馈',
      domain: 'organization', description: '支部全体成员可提出',
      tasks: [
        { taskId: '9-1', title: '提出意见或建议',               executor: 'all',              supervisor: null,     timeOffset: null },
        { taskId: '9-2', title: '纪检委员统一收集意见',         executor: 'disc-commissioner',supervisor: 'leader', timeOffset: null },
        { taskId: '9-3', title: '支委会讨论处理',               executor: 'all',              supervisor: null,     timeOffset: null },
        { taskId: '9-4', title: '反馈处理结果',                 executor: 'org-commissioner', supervisor: 'leader', timeOffset: null },
      ],
    },
  ],
};
