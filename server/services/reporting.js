// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  reporting.js — 数据上报服务（智慧党建/党校系统协同，T-304 部署文档 §六落地，2026-08-29）
//  设计依据：content/04_web_design/deploy/DEPLOYMENT_ROADMAP.md §六
//  - 四类数据域：member(党员信息) / activity(活动记录) / attendance(考勤记录) / study(学习记录)
//  - 出口：GET /api/v1/report/:domain（JSON 拉取）、GET /api/v1/report/export（CSV 人工导入）
//  - 推送模式：REPORT_WEBHOOK_URL + REPORT_TOKEN 环境变量；失败重试 3 次，最终失败管理员告警
//  - 原则：仅上报已确认/已归档数据（源头审校+异常驱动——草稿/待确认不外发，§6.4）
//  - 会议提醒（§5.1 场景④）：活动当日扫描 + reminderSentAt 持久化防重复
// ════════════════════════════════════════════════════════════════

import { emailOf, sendMail } from './mailer.js';

export const REPORT_DOMAINS = {
  member: { table: 'users', dateField: null, label: '党员信息' },
  activity: { table: 'activities', dateField: 'date', label: '活动记录' },
  attendance: { table: 'attendances', dateField: 'recordedAt', label: '考勤记录' },
  study: { table: 'makeup_tasks', dateField: 'completedAt', label: '学习记录' },
};

function listTable(db, table) {
  return db.prepare(`SELECT data FROM ${table}`).all().map(r => JSON.parse(r.data));
}

function fmtLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function today() { return fmtLocal(new Date()); }
export function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return fmtLocal(d); }

// from/to 窗口（YYYY-MM-DD；from 缺省近 7 天，to 缺省今天）——部署文档 §6.5
export function resolveWindow(query = {}) {
  return { from: query.from || daysAgo(7), to: query.to || today() };
}

// 主日期字段落窗判断：member 无日期字段不过滤（全量）
function inWindow(value, from, to) {
  const d = String(value || '').slice(0, 10);
  if (!d) return true;
  return (!from || d >= from) && (!to || d <= to);
}

/**
 * 提取指定数据域的报表数据
 * 输出字段以部署文档 §6.2 关键字段为准；平台侧字段差异按「字段映射表」适配（§6.3）。
 */
export function extractDomain(db, domain, from, to) {
  const cfg = REPORT_DOMAINS[domain];
  if (!cfg) throw new Error(`未知数据域: ${domain}`);
  const users = listTable(db, 'users');
  const userById = new Map(users.map(u => [u.id, u]));
  const nameOf = id => (userById.get(id) || {}).name || id;

  if (domain === 'member') {
    // 党员信息：全量支部成员档案；排除组织级人员（party-staff 党委组织员不属于支部党员档案，P1 党委后台）
    // 联系方式默认不报（脱敏可配 REPORT_INCLUDE_CONTACT=true，§6.2）
    const withContact = process.env.REPORT_INCLUDE_CONTACT === 'true';
    return users.filter(u => u.role !== 'party-staff').map(u => ({
      name: u.name,
      studentId: u.studentId,
      partyGroup: u.partyGroup,
      developStage: u.developStage,
      role: u.role,
      ...(withContact && u.email ? { contact: u.email } : {}),
    }));
  }

  if (domain === 'activity') {
    // 活动记录：有效活动（排除 取消/草稿）；已完成/进行中/已发布均属有效
    const activities = listTable(db, 'activities').filter(a => !['cancelled', 'draft'].includes(a.status));
    const signups = listTable(db, 'signups');
    const signupCount = id => signups.filter(s => s.sourceType === 'activity' && s.sourceId === id).length;
    return activities
      .filter(a => inWindow(a[cfg.dateField], from, to))
      .map(a => ({
        id: a.id,
        title: a.title,
        type: a.type,
        date: a.date,
        location: a.location || '',
        organizer: nameOf(a.organizer),
        participantCount: (a.assignments || []).length + signupCount(a.id),
        status: a.status,
      }));
  }

  if (domain === 'attendance') {
    // 考勤记录：仅已确认/最终数据（状态非 pending；出席自动确认，异常已按源头审校落库）
    const activities = listTable(db, 'activities');
    const activityById = new Map(activities.map(a => [a.id, a]));
    return listTable(db, 'attendances')
      .filter(r => r.status && r.status !== 'pending')
      .filter(r => inWindow(r[cfg.dateField], from, to))
      .map(r => ({
        id: r.id,
        activityId: r.activityId,
        activityTitle: (activityById.get(r.activityId) || {}).title || r.activityId,
        member: nameOf(r.personId),
        attendanceStatus: r.status,
        recorder: r.recordedBy ? nameOf(r.recordedBy) : '',
        confirmed: '是',
      }));
  }

  // study：学习记录（补课任务完成态）
  const activities = listTable(db, 'activities');
  const activityById = new Map(activities.map(a => [a.id, a]));
  return listTable(db, 'makeup_tasks')
    .filter(t => t.status === 'completed')
    .filter(t => inWindow(t[cfg.dateField], from, to))
    .map(t => ({
      id: t.id,
      activityId: t.activityId,
      activityTitle: (activityById.get(t.activityId) || {}).title || t.activityId,
      member: nameOf(t.personId),
      studyContent: t.title || t.content || '',
      completionStatus: t.status,
      completedAt: t.completedAt || '',
    }));
}

/** 数组 → CSV（UTF-8 BOM，Excel 中文兼容） */
export function toCsv(rows) {
  if (!rows || rows.length === 0) return '';
  const keys = Object.keys(rows[0]);
  const esc = v => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = keys.join(',');
  const body = rows.map(r => keys.map(k => esc(r[k])).join(','));
  return [header, ...body].join('\r\n');
}

const PUSH_RETRY_DELAYS_MS = [2_000, 8_000, 30_000]; // 重试 3 次（手动/批量共用，§6.4）

/**
 * 推送模式：POST 四域数据至平台接收端
 * - REPORT_WEBHOOK_URL / REPORT_TOKEN 未配置 → 返回 { pushed:false, reason }（拉取模式）
 * - 失败重试 3 次，最终失败：console 告警 + 管理员邮件（REPORT_ADMIN_MAIL，若通道启用）
 */
export async function pushReport(db, { from, to } = {}) {
  const url = process.env.REPORT_WEBHOOK_URL;
  if (!url) return { pushed: false, reason: 'REPORT_WEBHOOK_URL 未配置（拉取模式请用 GET /api/v1/report/:domain）' };
  const payload = {
    type: 'gsm1921.report',
    generatedAt: new Date().toISOString(),
    from: from || daysAgo(7),
    to: to || today(),
    domains: {},
  };
  for (const domain of Object.keys(REPORT_DOMAINS)) {
    payload.domains[domain] = extractDomain(db, domain, payload.from, payload.to);
  }
  const headers = { 'Content-Type': 'application/json; charset=utf-8' };
  const token = process.env.REPORT_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  let lastErr = null;
  for (let attempt = 0; attempt <= PUSH_RETRY_DELAYS_MS.length; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) {
        const counts = {};
        for (const [k, rows] of Object.entries(payload.domains)) counts[k] = rows.length;
        return { pushed: true, from: payload.from, to: payload.to, attempt: attempt + 1, counts };
      }
      lastErr = new Error(`平台返回 HTTP ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    if (attempt < PUSH_RETRY_DELAYS_MS.length) {
      await new Promise(r => setTimeout(r, PUSH_RETRY_DELAYS_MS[attempt]));
    }
  }
  // 连续失败 → 管理员告警（不静默丢数据：站内日志 + 邮件通道若启用，§6.4）
  console.error(`[report] 上报最终失败（已重试 3 次）→ ${url}: ${lastErr.message}`);
  const admin = process.env.REPORT_ADMIN_MAIL;
  if (admin) {
    try {
      await sendMail({ to: admin, subject: '[系统] 数据上报连续失败', text: `上报至 ${url} 连续失败：${lastErr.message}` });
    } catch (e) {
      console.error('[report] 管理员告警邮件发送失败:', e.message);
    }
  }
  return { pushed: false, error: lastErr.message };
}

/** 会议提醒（部署文档 §5.1 场景④）：活动当日提醒参与人，reminderSentAt 持久化防重复发送 */
export function checkMeetingReminders(db) {
  const dateStr = fmtLocal(new Date());
  const base = process.env.REPORT_BASE_URL || '';
  const link = base ? `\n系统入口：${base}/workspace/index.html` : '';
  for (const act of listTable(db, 'activities')) {
    if (act.date !== dateStr) continue;
    if (!['published', 'ongoing'].includes(act.status)) continue;
    if (act.reminderSentAt) continue;
    const personIds = new Set((act.assignments || []).map(a => a.personId));
    for (const s of listTable(db, 'signups')) {
      if (s.sourceType === 'activity' && s.sourceId === act.id) personIds.add(s.personId);
    }
    // 成员档案邮箱字段预留：暂无邮箱则整条跳过（站内功能不受影响）
    const emails = [...personIds].map(id => emailOf(db, id)).filter(Boolean);
    if (!emails.length) continue;
    sendMail({
      to: emails,
      subject: `[会议提醒] ${act.title}（${act.date}）`,
      text: `活动：${act.title}\n日期：${act.date}\n地点：${act.location || '—'}\n请准时参加。${link}`,
    }).catch(e => console.error('[mailer] 会议提醒发送失败:', e.message));
    act.reminderSentAt = new Date().toISOString();
    db.prepare('INSERT OR REPLACE INTO activities (id, data) VALUES (?, ?)').run(act.id, JSON.stringify(act));
  }
}

/**
 * 启动定时任务（server.js 调用）：
 * - 每日 03:00 批量上报（§6.4；重启用 pushReport 内建逻辑）
 * - 每 10 分钟会议提醒扫描（§5.1 场景④）
 */
export function startScheduler(db) {
  let lastReportDay = null;
  const minuteTick = setInterval(() => {
    const now = new Date();
    const day = fmtLocal(now);
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (hhmm === '03:00' && lastReportDay !== day) {
      lastReportDay = day;
      pushReport(db)
        .then(r => console.log('[report] 每日批量上报:', r.pushed ? '成功' : (r.error ? `失败: ${r.error}` : `跳过: ${r.reason}`)))
        .catch(e => console.error('[report] 每日批量上报异常:', e.message));
    }
  }, 60_000);
  minuteTick.unref?.();

  const reminderTick = setInterval(() => {
    try { checkMeetingReminders(db); } catch (e) { console.error('[mailer] 会议提醒扫描异常:', e.message); }
  }, 10 * 60_000);
  reminderTick.unref?.();

  return [minuteTick, reminderTick];
}
