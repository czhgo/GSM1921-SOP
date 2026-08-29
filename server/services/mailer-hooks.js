// role: [工程师]+[AI]
// server/services/mailer-hooks.js — 邮件双通道触发钩子（部署文档 §五落地，2026-08-29）
//  设计依据：content/04_web_design/deploy/DEPLOYMENT_ROADMAP.md §5.1/§5.3
//  - 站内优先、邮件并行：hooks 全部 fire-and-forget，失败/未配置均不影响站内功能（降级不阻断）
//  - 收件人从成员档案 email 字段读取（字段预留：暂无 email → 整条静默跳过）
//  - 受众尽力解析：复杂受众规则与前端 services/notice.js 对齐，当前覆盖 activity/全体两种
//  触发点：notices（通知发布） / todos（待办提醒） / weeklyReports（反馈/汇报）
//  会议提醒（场景④）由 reporting.js checkMeetingReminders 定时扫描负责
import { sendMail, emailOf } from './mailer.js';

const base = () => process.env.REPORT_BASE_URL || '';
const entryLink = () => (base() ? `\n系统入口：${base()}/workspace/index.html` : '');

function personEmail(db, id) {
  const email = emailOf(db, id);
  return email || '';
}

// 通知受众解析：activity 定向 → 该活动参与人（分工+报名）；其余 → 全体成员
function noticeRecipients(db, notice) {
  if (notice.targetType === 'activity' && notice.targetId) {
    const ids = new Set();
    for (const act of db.prepare('SELECT data FROM activities').all()) {
      const a = JSON.parse(act.data);
      if (a.id === notice.targetId) {
        for (const asg of (a.assignments || [])) ids.add(asg.personId);
      }
    }
    for (const s of db.prepare('SELECT data FROM signups').all()) {
      const row = JSON.parse(s.data);
      if (row.sourceType === 'activity' && row.sourceId === notice.targetId) ids.add(row.personId);
    }
    return [...ids];
  }
  // 全体/党小组/角色定向：当前统一按全体处理（组/角色定向可在档案补 email 后按 notice.js 细化）
  return db.prepare('SELECT data FROM users').all().map(r => JSON.parse(r.data).id);
}

async function sendNoticeEmail(db, notice) {
  const to = noticeRecipients(db, notice).map(id => personEmail(db, id)).filter(Boolean);
  if (!to.length) return { skipped: true, reason: '收件人无邮箱（成员档案 email 字段预留）' };
  return sendMail({
    to,
    subject: `[支部通知] ${notice.title}`,
    text: `${notice.content || ''}\n\n——光华管理学院本科生党支部${entryLink()}`,
    html: `<div style="font-size:14px;line-height:1.7">${(notice.content || '').replace(/\n/g, '<br>')}</div>`,
  });
}

async function sendTodoEmail(db, todo) {
  const assignees = [todo.assigneeId, ...(todo.assigneeIds || [])].filter(Boolean);
  const to = [...new Set(assignees)].map(id => personEmail(db, id)).filter(Boolean);
  if (!to.length) return { skipped: true, reason: '待办责任人无邮箱' };
  return sendMail({
    to,
    subject: `[待办提醒] ${todo.title || '新待办'}`,
    text: `${todo.description || ''}\n\n请及时处理。${entryLink()}`,
  });
}

async function sendReportEmail(db, row) {
  const targets = row.targetIds || row.reportTo || row.submitTo || [];
  const to = [...new Set(Array.isArray(targets) ? targets : [targets])].map(id => personEmail(db, id)).filter(Boolean);
  if (!to.length) return { skipped: true, reason: '汇报对象无邮箱' };
  const submitter = row.submitterId ? db.prepare('SELECT data FROM users WHERE id = ?').get(row.submitterId) : null;
  const submitterName = submitter ? (JSON.parse(submitter.data).name || '') : '';
  return sendMail({
    to,
    subject: `[汇报] ${row.title || '新反馈/汇报'}`,
    text: `${row.content || ''}\n\n${submitterName ? `——${submitterName}` : ''}${entryLink()}`,
  });
}

/** 资源写入后的邮件钩子（resources.js POST 成功后调用，fire-and-forget） */
export async function afterResourceWrite(db, name, row) {
  try {
    if (name === 'notices') return await sendNoticeEmail(db, row);
    if (name === 'todos') return await sendTodoEmail(db, row);
    if (name === 'weeklyReports') return await sendReportEmail(db, row);
  } catch (e) {
    console.error(`[mailer-hooks] ${name} 邮件发送异常（站内功能不受影响）:`, e.message);
  }
  return { skipped: true };
}
