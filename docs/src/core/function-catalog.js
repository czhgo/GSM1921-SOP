// role: [工程师]+[AI]
// 功能目录（FUNCTION_CATALOG）——系统全部功能与帮助内容的单一事实源
// 消费方：docs/scripts/gen-function-mermaid.mjs（生成 README/FUNCTION_MAP.md 图，已接入）+ docs/src/modules/help-catalog.js（help 页目录树/搜索/章节卡片，待 Task 3 接入）
// 约定：本文件为「纯数据表达式」——gen 脚本以文本求值方式读取，勿引入函数/模板字符串
// generic: true=通用能力（可复用到任何组织）| false=支部特有；kind: feature 功能 | flow 业务链路 | arch 架构
// 字段约定：feature 条目含 role（public 页无 tab）；flow/arch 条目无 role/tab/usage

// 「党建」组按 2026-09-03 书记裁定保留：T1 口径下工作皆属党建，故工作台功能统一归「党建」组（其余按页面/工作形式分组）
export const FUNCTION_GROUPS = [
  '党建',
  '宣传与档案',
  '活动与专班',
  '公共',
  '角色工作台',
];

export const FUNCTION_CATALOG = [
  // ══════════ 党建 ══════════
  { id: 'activity-create', name: '活动创建', group: '党建', role: 'secretary', tab: 'calendar', desc: '书记/党小组组长创建三会一课、主题党日等活动', usage: '工作台 → 活动管理 → 写入活动 → 选模板 → 创建', related: ['agenda', 'activity-signup'], generic: true, kind: 'feature' },
  { id: 'agenda', name: '会议议程', group: '党建', role: 'secretary', tab: 'calendar', desc: '活动议程含讨论文件/待讨论名单，会后记录通过并自动归档', usage: '创建活动时在「高级选项」添加议程 → 会后在议程下记录通过/未通过', related: ['flow-branch-committee', 'flow-general-meeting', 'branch-doc'], generic: true, kind: 'feature' },
  { id: 'three-meetings', name: '三会一课', group: '党建', role: 'secretary', tab: 'calendar', desc: '支部党员大会、支委会、党小组会、党课的统一归口', usage: '工作台 → 活动管理 → 模板「三会一课」', related: ['activity-create', 'theme-party'], generic: true, kind: 'feature' },
  { id: 'theme-party', name: '主题党日', group: '党建', role: 'secretary', tab: 'calendar', desc: '主题党日活动，支持共建/校外/载体维度，模板卡整卡可点（点击热区=全卡）', usage: '工作台 → 活动管理 → 模板「主题党日」', related: ['three-meetings', 'activity-create'], generic: true, kind: 'feature' },
  { id: 'activity-signup', name: '活动报名', group: '党建', role: 'member', tab: 'activities', desc: '成员报名参加活动，按阶段批量选择参与人', usage: '成员工作台 → 活动动态 → 报名', related: ['activity-create', 'attendance-personal'], generic: true, kind: 'feature' },
  { id: 'assign', name: '赋权管理', group: '党建', role: 'secretary', tab: 'assign', desc: '书记向下委托活动写入等权限，赋权链计算知情边界', usage: '书记工作台 → 赋权管理 → 添加/撤销赋权', related: ['activity-create', 'notification'], generic: true, kind: 'feature' },
  { id: 'notification', name: '通知发布', group: '党建', role: 'secretary', tab: 'notification', desc: '发布通知，自动派生成员待办；审批类变更同步广播', usage: '书记工作台 → 通知发布', related: ['todo', 'flow-development'], generic: true, kind: 'feature' },
  { id: 'online-vote', name: '线上异步表决', group: '党建', role: 'public', desc: '支委会/支部党员大会等决策活动的线上异步表决：选项集/参与范围可配，赞成过半数可记录通过', usage: '书记创建决策活动时会议形式选「线上异步表决」→ 配置参与范围 → 委员/党员在活动详情页表态 → 书记汇总并记录决议', related: ['three-meetings', 'agenda', 'activity-create', 'flow-online-committee', 'flow-general-meeting'], generic: true, kind: 'feature' },
  { id: 'development', name: '发展党员', group: '党建', role: 'org', tab: 'development', desc: '发展党员全流程管理与阶段推进', usage: '组织委员工作台 → 发展党员', related: ['talent', 'inspection'], generic: true, kind: 'feature' },
  { id: 'talent', name: '人才库', group: '党建', role: 'org', tab: 'talent', desc: '积极分子/发展对象档案与考察材料归集', usage: '组织委员工作台 → 人才库', related: ['development', 'inspection'], generic: true, kind: 'feature' },
  { id: 'inspection', name: '考察记录', group: '党建', role: 'org', tab: 'inspection', desc: '考察材料上传与归集', usage: '组织委员/党小组组长工作台 → 考察', related: ['talent', 'development'], generic: true, kind: 'feature' },
  { id: 'attendance-mgmt', name: '考勤管理', group: '党建', role: 'disc', tab: 'attendance', desc: '纪检委员管理全支部考勤，与组织委员同源共享', usage: '纪检委员工作台 → 考勤管理', related: ['attendance-personal', 'makeup'], generic: true, kind: 'feature' },
  { id: 'makeup', name: '补课制度', group: '党建', role: 'disc', tab: 'makeup', desc: '缺勤成员通过补课任务恢复考勤状态', usage: '纪检委员工作台 → 补课制度 → 提交补课任务 → 完成回写考勤', related: ['attendance-mgmt', 'flow-makeup'], generic: false, kind: 'feature' },
  { id: 'review', name: '复盘评议', group: '党建', role: 'disc', tab: 'review', desc: '活动监督复盘与评议记录', usage: '纪检委员工作台 → 活动监督复盘', related: ['attendance-mgmt', 'flow-theme-party'], generic: true, kind: 'feature' },
  { id: 'thought-report', name: '思想汇报', group: '党建', role: 'member', tab: 'thought-report', desc: '成员提交思想汇报，经组织委员把关式初阅：通过才正式归档，退回附意见可修改重交', usage: '成员工作台 → 思想汇报 → 提交 → 组织委员初阅（通过归档 / 退回附意见）', related: ['flow-thought-report', 'talent'], generic: true, kind: 'feature' },
  { id: 'member-change', name: '成员变更审批', group: '党建', role: 'org', tab: 'development', desc: '待讨论名单统一阶段转换，经组织委员审批、书记确认后更新', usage: '议程「待讨论名单」记录通过 → 组织委员审批 → 书记确认 → 阶段更新', related: ['agenda', 'flow-development'], generic: false, kind: 'feature' },
  // ══════════ 宣传与档案 ══════════
  { id: 'tasks', name: '宣传任务', group: '宣传与档案', role: 'prop', tab: 'tasks', desc: '宣传任务分配与推进', usage: '宣传委员工作台 → 宣传任务', related: ['kanban', 'weekly'], generic: true, kind: 'feature' },
  { id: 'kanban', name: '项目看板', group: '宣传与档案', role: 'prop', tab: 'kanban', desc: '宣传项目看板化管理', usage: '宣传委员工作台 → 项目看板', related: ['tasks'], generic: true, kind: 'feature' },
  { id: 'weekly', name: '周报报送', group: '宣传与档案', role: 'prop', tab: 'weekly', desc: '每周工作周报报送', usage: '宣传委员工作台 → 周报报送', related: ['tasks', 'archive'], generic: true, kind: 'feature' },
  { id: 'branch-doc', name: '支部文件', group: '宣传与档案', role: 'prop', tab: 'archive', desc: '草案上传、会前分发、讨论通过后归档并展示来源', usage: '宣传委员工作台 → 档案归档 → 草案 → 议程讨论通过 → 资料查询展示「经《活动》讨论通过」', related: ['agenda', 'archive', 'search'], generic: true, kind: 'feature' },
  { id: 'mailbox', name: '公邮管理', group: '宣传与档案', role: 'disc', tab: 'mailbox', desc: '支部公邮登录与邮件处理入口', usage: '纪检委员工作台 → 公邮管理', related: [], generic: false, kind: 'feature' },
  { id: 'archive', name: '归档库', group: '宣传与档案', role: 'public', tab: 'archive', desc: '历届档案的检索与归档', usage: '公共页面 → 归档库', related: ['branch-doc', 'search'], generic: true, kind: 'feature' },
  // ══════════ 活动与专班 ══════════
  { id: 'taskforce-create', name: '专班发起', group: '活动与专班', role: 'secretary', tab: 'taskforce', desc: '发起专班（跨小组跨职能集中推进）', usage: '书记/组长/三委员 → 专班发起', related: ['taskforce-recruit', 'flow-taskforce'], generic: true, kind: 'feature' },
  { id: 'taskforce-recruit', name: '招募统筹', group: '活动与专班', role: 'org', tab: 'taskforce', desc: '组织委员统筹专班招募与定人定责定岗', usage: '组织委员工作台 → 专班建设 → 招募统筹', related: ['taskforce-create', 'taskforce-assign'], generic: true, kind: 'feature' },
  { id: 'taskforce-assign', name: '定人定责定岗', group: '活动与专班', role: 'org', tab: 'taskforce', desc: '专班分工记录与工作量记录', usage: '组织委员工作台 → 专班建设 → 定人定责定岗', related: ['taskforce-recruit', 'external-dispatch'], generic: true, kind: 'feature' },
  { id: 'external-dispatch', name: '外派任务', group: '活动与专班', role: 'disc', tab: 'my-dispatch', desc: '接收外派/布置外派，送达确认后归档', usage: '工作台 → 我的派发', related: ['taskforce-assign'], generic: false, kind: 'feature' },
  // ══════════ 公共 ══════════
  { id: 'homepage', name: '首页', group: '公共', role: 'public', desc: '活动日历/近期活动/通知与招募一览', usage: '公共页面 → 首页', related: ['activity-create', 'notification', 'search'], generic: true, kind: 'feature' },
  { id: 'search', name: '资料查询', group: '公共', role: 'public', desc: '官方制度文件与支部文件检索，已归档支部文件标注讨论来源', usage: '公共页面 → 资料查询', related: ['branch-doc', 'archive'], generic: true, kind: 'feature' },
  { id: 'feedback', name: '意见反馈', group: '公共', role: 'public', desc: '提交建议与问题，书记反馈并跟进处理', usage: '公共页面 → 意见反馈', related: ['notification'], generic: true, kind: 'feature' },
  { id: 'todo', name: '个人待办', group: '公共', role: 'member', tab: 'todo', desc: '通知/活动/专班自动派生待办与收件箱', usage: '各工作台 → 待办', related: ['notification', 'activity-create'], generic: true, kind: 'feature' },
  { id: 'attendance-personal', name: '个人考勤', group: '公共', role: 'member', tab: 'attendance', desc: '查看个人考勤与补课状态', usage: '成员工作台 → 个人考勤', related: ['attendance-mgmt', 'makeup'], generic: true, kind: 'feature' },
  { id: 'help', name: '帮助（本页）', group: '公共', role: 'public', desc: '系统说明书：0–7 章（入口速查 / 快速上手 / 角色工作台导览 / 域手册 / 业务链路 / 党委与配置）+ 搜索 + 功能总览', usage: '侧边栏 → 帮助', related: ['about'], generic: true, kind: 'feature' },
  { id: 'about', name: '关于', group: '公共', role: 'public', desc: '项目介绍与叙事', usage: '侧边栏 → 关于（静态托管形态）', related: ['help'], generic: true, kind: 'feature' },
  // ══════════ 角色工作台 ══════════
  { id: 'ws-secretary', name: '书记工作台', group: '角色工作台', role: 'secretary', desc: '今天/待办/全局概况/活动管理/支部分工/赋权管理/支部配置/通知发布/专班查看/反馈管理/上报党委（11 tab，副书记共台）', usage: '登录 → 书记工作台（书记/副书记）', related: ['activity-create', 'assign', 'notification', 'todo'], generic: true, kind: 'feature' },
  { id: 'ws-org', name: '组织委员工作台', group: '角色工作台', role: 'org', desc: '今天/待办/工作概况/考察上传/专班管理/成员名册/人才库/发展数据/思想汇报初阅/活动查看/我的处置（11 tab）', usage: '登录 → 组织委员工作台', related: ['taskforce-recruit', 'development', 'talent', 'thought-report', 'todo'], generic: true, kind: 'feature' },
  { id: 'ws-prop', name: '宣传委员工作台', group: '角色工作台', role: 'prop', desc: '今天/待办/工作概况/宣传任务/项目看板/周报报送/档案归档/我的处置（8 tab）', usage: '登录 → 宣传委员工作台', related: ['tasks', 'branch-doc', 'weekly', 'archive', 'todo'], generic: true, kind: 'feature' },
  { id: 'ws-disc', name: '纪检委员工作台', group: '角色工作台', role: 'disc', desc: '今天/待办/工作概况/考勤管理/活动监督复盘/考察管理/补课制度/公邮管理/专班查看/我的处置（10 tab）', usage: '登录 → 纪检委员工作台', related: ['attendance-mgmt', 'makeup', 'mailbox', 'review', 'todo'], generic: true, kind: 'feature' },
  { id: 'ws-leader', name: '党小组组长工作台', group: '角色工作台', role: 'leader', desc: '今天/待办/工作概况/活动管理/考勤上传/考察上传/复盘状态/组员进展/专班查看/我的处置（10 tab；复盘状态只读——复盘提交已归组织者/深度参与者）', usage: '登录 → 党小组组长工作台', related: ['activity-create', 'attendance-personal', 'review', 'todo'], generic: true, kind: 'feature' },
  { id: 'ws-visitor', name: '成员工作台', group: '角色工作台', role: 'member', desc: '今天/待办/工作概况/项目分工/活动动态/考勤概况/我的考察/思想汇报/我的复盘（9 tab，含组织者/深度参与者承载面）', usage: '登录 → 成员工作台', related: ['homepage', 'thought-report', 'review', 'todo'], generic: true, kind: 'feature' },
  // ══════════ 业务链路（kind: flow · 节点=执行者:任务，图源 mermaid-sources.js FLOW_LINKS） ══════════
  // 活动型链路（党建）：
  { id: 'flow-branch-committee', name: '支委会链路', group: '党建', desc: '书记定议题通知 → 纪检考勤 → 书记记录决议 → 宣传归档 → 补课跟进', related: ['three-meetings', 'agenda', 'branch-doc'], generic: true, kind: 'flow' },
  { id: 'flow-online-committee', name: '线上支委会链路', group: '党建', desc: '书记定稿议程 → 委员异步表态（同意/异议/附言）→ 汇总截止 → 记录决议', related: ['three-meetings', 'online-vote', 'agenda'], generic: true, kind: 'flow' },
  { id: 'flow-group-meeting', name: '党小组会链路', group: '党建', desc: '组长统筹通知 → 组长发布二维码 → 纪检考勤 → 自评互评 → 组长总结汇总 → 宣传归档', related: ['three-meetings', 'activity-create'], generic: true, kind: 'flow' },
  { id: 'flow-party-lecture', name: '党课链路', group: '党建', desc: '书记发布党课通知与学习材料 → 提醒缺席党员补课', related: ['three-meetings'], generic: true, kind: 'flow' },
  { id: 'flow-theme-party', name: '主题党日链路', group: '党建', desc: '组织者发起策划 → 支委扩大会讨论 → 筹备对接 → 实施 → 纪检考勤复盘 → 组织者复盘 → 宣传归档', related: ['theme-party', 'activity-create', 'review'], generic: true, kind: 'flow' },
  { id: 'flow-general-meeting', name: '支部党员大会链路', group: '党建', desc: '组长统筹 → 书记发布 → 纪检考勤 → 议题讨论表决 → 记录决议 → 宣传归档', related: ['three-meetings', 'agenda', 'development'], generic: true, kind: 'flow' },
  // 事务型链路：
  { id: 'flow-taskforce', name: '专班链路', group: '活动与专班', desc: '发起 → 招募统筹 → 定人定责定岗 → 执行记录', related: ['taskforce-create', 'taskforce-recruit', 'taskforce-assign'], generic: true, kind: 'flow' },
  { id: 'flow-development', name: '发展党员链路', group: '党建', desc: '支委会推荐发展对象 → 党员大会表决 → 记录议程通过 → 组织委员审批 → 书记确认更新阶段', related: ['development', 'member-change', 'agenda', 'flow-inspection'], generic: true, kind: 'flow' },
  { id: 'flow-inspection', name: '考察积极分子链路', group: '党建', desc: '组长日常观察 → 组织委员建档归集 → 反馈书记 → 支委会/大会讨论', related: ['inspection', 'talent', 'thought-report', 'development'], generic: true, kind: 'flow' },
  { id: 'flow-institution', name: '制度制定与迭代链路', group: '党建', desc: '条条委员起草试点 → 各党小组征求意见 → 修改提交 → 支委会审议 → 党员大会表决 → 监督落实修订', related: [], generic: true, kind: 'flow' },
  { id: 'flow-makeup', name: '补课回写链路', group: '党建', desc: '纪检记录缺勤 → 生成补课任务 → 成员完成 → 考勤回写/逾期清除', related: ['makeup', 'attendance-mgmt'], generic: false, kind: 'flow' },
  { id: 'flow-thought-report', name: '思想汇报链路', group: '党建', desc: '党员提交 → 系统自动归集 → 组织委员查看调用', related: ['thought-report', 'talent'], generic: true, kind: 'flow' },
  // ══════════ 架构（kind: arch） ══════════
  { id: 'arch-layers', name: '架构分层', group: '公共', desc: '前台 14 页 → 中台 entries/components/core → 服务层 services/mock → 后端 server/API → 母本 sop', related: ['arch-service-deps', 'arch-data-flow'], generic: true, kind: 'arch' },
  { id: 'arch-service-deps', name: '服务依赖', group: '公共', desc: '服务模块调用关系（activity → attendance → review → todo）', related: ['arch-layers'], generic: true, kind: 'arch' },
  { id: 'arch-data-flow', name: '数据变更链路', group: '公共', desc: '制度母本 → 服务层 → 入口层 → 页面；UI 禁止直改数据源', related: ['arch-layers'], generic: true, kind: 'arch' },
];
