// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  system-notice-templates.js — 系统派生通知模板（单一源）
//  R-22（2026-09-13）：上一批给「不传 actorRole 的系统派生通知」打标 systemDerived
//  由服务端写门放行，但该标记是客户端自述、可伪造——任一登录成员可发任意广播通知。
//  本表把系统派生通知的**生成权收回服务端**：文案/受众/落点集中在本模板单一源，
//  服务端 kind 注册表（server/system-notice-kinds.js）与前端 mock/离线模式
//  （services/notice.js::addSystem）复用同一模板，杜绝「前端一套文案、后端一套文案」未同步。
//
//  约定：每个模板入参 vars = { sourceId, ...动态展示值 }；落点（targetUrl/targetType/targetId）
//  一律由 sourceId 派生，客户端同名传入字段会被服务端 build 覆盖（不可伪造）。
//  返回通知对象（不含 id/publishDate，由写入侧补齐）。
// ════════════════════════════════════════════════════════════════

// 期次标签单一源（core/period.js）——勿在本文件另写季度格式化
import { periodLabel } from './period.js?v=20260921j';

/** 组装返回对象（跳过 undefined，保持通知结构精简；与原前端 add() 落库形态一致） */
function pick(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

const TEMPLATES = {
  // ── 思想汇报已提交（thought-report.js 迁移） ──────────────────────
  // R-23（2026-09-13）：受众锁定组织委员（思想汇报归口）——原无 audience/actionRoles
  //   会经全站广播给所有成员（含提交人自己），与新提交的业务指向不符。
  //   2026-09-18 批次 86：**取消初阅门**后，这条通知不再是「待办提醒」而是**归口知会**
  //   （该篇已入库归档）——文案随 `SOP-B-28` 改准，受众与落点不变。
  // 2026-09-13 面板数据改造：正文带**期次**（组织委员需知哪一季度的汇报）。
  'thought-report-submitted': ({ sourceId, personName, period }) => pick({
    title: '思想汇报已提交',
    content: `${personName} 已提交${period ? `（${periodLabel(period)}）` : ''}思想汇报，系统已自动归档归集至其个人档案，可前往「思想汇报」台账查看调用。`,
    priority: 'normal',
    audience: ['org-commissioner'],
    targetUrl: `workspace/org.html?tab=thought-review&highlight=${sourceId}`,
  }),

  // ── 宣传周报已报送待支书审核（weekly-tab.js 迁移 · SOP-B-40 ②，2026-09-19 批次 94）──
  // 受众锁定支书/副支书（审核位在支书台「全局概况」的异常优先队列里）；落点带 highlight 供直达定位。
  'weekly-report-submitted': ({ sourceId, week, weekRange, submitterName }) => pick({
    title: '宣传周报待审核',
    content: `${submitterName} 已报送${week || '本周'}周报${weekRange ? `（${weekRange}）` : ''}，请审核（通过 / 退回）。`,
    priority: 'normal',
    audience: ['secretary', 'deputy-secretary'],
    targetUrl: `workspace/secretary.html?tab=overview&highlight=${sourceId}`,
  }),

  // ── 考勤已确认并归档（disc/attendance-tab.js 迁移） ────────────────
  'attendance-confirmed': ({ sourceId, activityTitle }) => pick({
    title: '考勤已确认并归档',
    content: `「${activityTitle}」考勤已由纪检确认，系统已自动归档至考察档案，组织委员可直接读取使用。`,
    priority: 'normal',
    targetType: 'activity',
    targetId: sourceId,
  }),

  // ── 议程已更新（inspector.js 迁移） ──────────────────────────────
  'activity-agenda-updated': ({ sourceId, activityTitle }) => pick({
    title: `「${activityTitle}」议程已更新`,
    content: '议程已更新，可查看最新议程',
    targetType: 'activity',
    targetId: sourceId,
  }),

  // ── 成员变更已审批通过（member-change-panel.js 迁移） ──────────────
  'member-change-approved': ({ sourceId, personName, fromStage, toStage, activityTitle }) => pick({
    title: '成员变更已审批通过',
    content: `${personName}：${fromStage}→${toStage} 已通过组织委员审批（${activityTitle}），待支书确认后更新发展阶段。`,
    priority: 'normal',
    targetUrl: `workspace/secretary.html?tab=todo&highlight=${sourceId}`,
  }),

  // ── 支部分工调整议题待表决（workforce.js 迁移） ────────────────────
  'workforce-proposal-created': ({ sourceId, activityTitle }) => pick({
    title: '支部分工调整议题待表决',
    content: `「${activityTitle}」已发起，请支委在本次支委会活动中参与线上表决（交流式表态）。`,
    priority: 'normal',
    targetType: 'activity',
    targetId: sourceId,
  }),

  // ── 支部分工调整已生效（workforce.js 迁移） ───────────────────────
  // 分工自动传递（2026-09-13 支书裁定）：受众与行动计划均由**服务端**按来源活动的
  //   extras.proposal 复算注入（见 server/system-notice-kinds.js 的 build），客户端不传：
  //   · audience='committee'（支部内政，支委层应知晓）；
  //   · audiencePersons=[到人负责人 personId]（角色数组表达不了「到人」，按人定向送达）；
  //   · actionRoles=[角色负责人] + actionable/actionTask（据此派生「履职」待办）。
  'workforce-proposal-adopted': ({ sourceId, activityTitle, audience, audiencePersons, actionRoles, actionable, actionTask }) => pick({
    title: '支部分工调整已生效',
    content: `「${activityTitle}」已按支委会表决采纳，分工已更新，相关责任人可前往「支部分工」查看并履职。`,
    priority: 'normal',
    audience,
    audiencePersons,
    targetType: 'activity',
    targetId: sourceId,
    actionRoles,
    actionable,
    actionTask,
    targetUrl: 'workspace/secretary.html?tab=work-map',
  }),

  // ── 线上支委会表态更新（committee-vote.js 迁移；计数由服务端复算） ──
  'committee-vote-progress': ({ sourceId, voted, total }) => pick({
    title: '线上支委会表态更新',
    content: `「线上支委会」已有 ${voted}/${total} 位委员表态`,
    priority: 'normal',
    targetUrl: `workspace/secretary.html?activityId=${sourceId}`,
    actionRoles: ['secretary'],
  }),

  // ── 线上支委会表决截止（committee-vote.js 迁移） ───────────────────
  'committee-vote-locked': ({ sourceId }) => pick({
    title: '线上支委会表决截止',
    content: '支委会议程已截止，请记录决议',
    priority: 'normal',
    targetUrl: `workspace/secretary.html?activityId=${sourceId}`,
    actionRoles: ['secretary'],
  }),

  // ── 赋权通知（auth.js 迁移） ────────────────────────────────────
  'project-auth-granted': ({ targetPage, authorizerName, projectName, roleLabel }) => pick({
    title: '赋权通知',
    content: `${authorizerName} 已将您赋权为「${projectName}」的${roleLabel}。点击前往工作台。`,
    priority: 'normal',
    targetUrl: targetPage,
  }),

  // ── 材料外发待确认（external-dispatch.js 迁移） ───────────────────
  'external-dispatch-created': ({ senderName, refLabel, receiverRole }) => pick({
    title: '材料外发待确认',
    content: `${senderName} 已标记通过微信外发「${refLabel}」${receiverRole ? '给' + receiverRole : ''}。请前往微信群完成交接，收到后回系统确认。`,
    priority: 'normal',
    targetUrl: 'workspace/visitor.html',
  }),

  // ── 支部上报待批复（review-request.js 迁移） ──────────────────────
  'review-request-submitted': ({ sourceId, branchLabel, subject, submitterName }) => pick({
    title: '支部上报待批复',
    content: `${branchLabel} 提交${subject}，由 ${submitterName} 发起，请党委审批。`,
    priority: 'normal',
    targetUrl: `workspace/party-committee.html?tab=review&highlight=${sourceId}`,
    actionRoles: ['party-staff'],
    read: false,
  }),

  // ── 上报审批结论（review-request.js 迁移） ────────────────────────
  'review-request-decided': ({ sourceId, branchLabel, subject, approved, decisionNote }) => pick({
    title: approved ? '上报已获党委批准' : '上报被党委驳回',
    content: `${branchLabel} 的${subject}已${approved ? '批准' : '驳回'}${approved ? '' : '，请按党委意见整改后重新上报'}${decisionNote ? '。党委意见：' + decisionNote : '。'}`,
    priority: 'normal',
    targetUrl: `workspace/secretary.html?tab=report-up&highlight=${sourceId}`,
    actionRoles: ['secretary', 'deputy-secretary'],
    read: false,
  }),

  // ── 活动已创建请建核心群（decision-tree.js 迁移） ──────────────────
  'activity-created-broadcast': ({ sourceId, activityTitle, date, location }) => pick({
    title: '活动已创建，请建核心群',
    content: `「${activityTitle}」${date}${location ? ' · ' + location : ' · 线上'}：请前往微信群建核心群。`,
    priority: 'normal',
    targetType: 'activity',
    targetId: sourceId,
    targetUrl: 'workspace/leader.html',
  }),

  // ── 专班议案排入线上支委会待表态（taskforce.js 迁移） ──────────────
  'taskforce-vote-requested': ({ sourceId, activityTitle, date, branchId, actionRoles }) => pick({
    title: '线上支委会表决待表态（专班议案）',
    content: `「${activityTitle}」已发起，请支委在本次线上支委会活动中表态：同意 / 异议 / 附言（点击通知直达活动页）。`,
    priority: 'normal',
    publishDate: date,
    targetType: 'activity',
    targetId: sourceId,
    audience: 'committee',
    branchId,
    actionable: true,
    actionRoles,
    actionTask: '线上支委会表决待表态（专班议案）',
    read: false,
  }),

  // ── 活动流程超时提醒（disc/review-tab.js 迁移） ────────────────────
  'review-overdue-reminder': ({ activity, targetModule, targetType, targetId, actionRoles }) => pick({
    title: '活动流程超时提醒',
    content: `「${activity}」时间流已超时，请及时更新进展并提交复盘总结（纪检委员提醒）。`,
    priority: 'urgent',
    targetModule: targetModule,
    targetType: targetType,
    targetId: targetId,
    actionable: true,
    actionRoles,
    actionTask: '活动流程超时提醒',
    read: false,
  }),

  // ── 复盘超期提醒（disc/review-tab.js 迁移） ───────────────────────
  'review-resubmit-reminder': ({ activity, targetModule, targetType, targetId, actionRoles }) => pick({
    title: '复盘超期提醒',
    content: `「${activity}」复盘尚未提交，请尽快提交复盘总结（纪检委员提醒）。`,
    priority: 'urgent',
    targetModule: targetModule,
    targetType: targetType,
    targetId: targetId,
    actionable: true,
    actionRoles,
    actionTask: '复盘超期提醒',
    read: false,
  }),

  // ── 活动预拟通知（secretary/calendar-tab.js 迁移；标题/正文由发布人填写） ──
  'activity-notice-draft': ({ sourceId, title, content, expireDate, activityTitle }) => pick({
    title,
    content: content || `请全体成员关注「${activityTitle}」，按时参加。`,
    priority: 'normal',
    expireDate,
    targetModule: 'activity',
    targetType: 'activity',
    targetId: sourceId,
    read: false,
  }),

  // ── 专班预拟通知（org/taskforce-tab.js 迁移；标题/正文由发布人填写） ──
  'taskforce-notice-draft': ({ sourceId, title, content, deadline, taskforceName }) => pick({
    title,
    content: content || `专班「${taskforceName}」已报送支委会表决，表决通过后将开放招募（截止 ${deadline}），欢迎届时报名参与。`,
    priority: 'normal',
    expireDate: deadline,
    targetModule: 'workspace',
    targetType: 'taskforce',
    targetId: sourceId,
    read: false,
  }),

  // ── 党委下发（party-committee/dispatch-tab.js 迁移；党委组织员人工下发） ──
  'committee-dispatch': ({ sourceId, title, content, priority, branchName }) => pick({
    source: 'committee',
    audience: 'committee',
    branchId: sourceId,
    branchName,
    title,
    content,
    priority,
    targetModule: '',
    read: false,
    publisher: '院党委（组织员）',
    recipients: '支部委员会（支委层）',
  }),
};

/**
 * 构建系统派生通知对象（单一口径）
 * @param {string} kind 注册表 kind
 * @param {Object} vars { sourceId, ...动态展示值 }
 * @returns {Object} 通知对象（不含 id/publishDate）
 */
export function buildSystemNotice(kind, vars = {}) {
  const t = TEMPLATES[kind];
  if (!t) throw new Error(`未知的系统通知类型：${kind}`);
  return t(vars);
}

/** 全部 kind 名（供守卫/调试） */
export const SYSTEM_NOTICE_KIND_NAMES = Object.keys(TEMPLATES);
