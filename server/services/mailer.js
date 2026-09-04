// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  mailer.js — 邮件发送服务（通用 SMTP，T-304 部署文档 §3.8 落地，2026-08-29）
//  设计依据：content/04_web_design/deploy/DEPLOYMENT_GUIDE.md §3.8（邮件发送通道）
//  - 环境变量注入配置（不写进代码/仓库）：SMTP_HOST/PORT/USER/PASS/FROM/TLS/MAIL_ENABLED
//  - 站内优先、邮件并行：发送失败不影响站内功能（降级不阻断）
//  - 失败重试 3 次（1min/5min/30min），最终失败记入日志
//  - 未配置/未启用时全部静默跳过（返回 { skipped: true }）
// ════════════════════════════════════════════════════════════════

import nodemailer from 'nodemailer';

const RETRY_DELAYS_MS = [60_000, 300_000, 1_800_000]; // 1min / 5min / 30min

const config = {
  enabled: process.env.MAIL_ENABLED === 'true',
  host: process.env.SMTP_HOST || '',
  port: Number(process.env.SMTP_PORT || 465),
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
  from: process.env.SMTP_FROM || '',
  tls: process.env.SMTP_TLS !== 'false', // 默认 true（465 SSL）；587 用 STARTTLS 时保留 true 即可
};

let _transporter = null;
let _transporterError = null;

function getTransporter() {
  if (!config.enabled || !config.host || !config.user) return null;
  if (_transporter) return _transporter;
  try {
    _transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.tls,
      auth: { user: config.user, pass: config.pass },
    });
    return _transporter;
  } catch (e) {
    _transporterError = e;
    console.error('[mailer] 创建 SMTP transport 失败（站内功能不受影响）:', e.message);
    return null;
  }
}

/**
 * 发送一封邮件（异步，带失败重试队列）
 * @param {{ to: string|string[], subject: string, text?: string, html?: string }} msg
 * @returns {Promise<{ok: boolean, skipped?: boolean, error?: string}>}
 */
export async function sendMail(msg) {
  if (!config.enabled) {
    return { ok: false, skipped: true, error: 'MAIL_ENABLED 未开启' };
  }
  const transporter = getTransporter();
  if (!transporter) {
    return { ok: false, skipped: true, error: _transporterError?.message || 'SMTP 未配置' };
  }
  const to = Array.isArray(msg.to) ? msg.to : [msg.to];
  if (to.length === 0 || to.every(a => !a)) {
    return { ok: false, skipped: true, error: '收件人为空' };
  }
  const mail = {
    from: config.from || config.user,
    to: to.filter(Boolean).join(', '),
    subject: msg.subject,
    text: msg.text || '',
    html: msg.html || undefined,
  };

  // 重试 3 次（1/5/30min），最终失败记录日志（不抛出——站内功能不受影响）
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      await transporter.sendMail(mail);
      return { ok: true };
    } catch (e) {
      if (attempt < RETRY_DELAYS_MS.length) {
        await new Promise(r => setTimeout(r, RETRY_DELAYS_MS[attempt]));
      } else {
        console.error('[mailer] 邮件发送最终失败（已重试 3 次）:', e.message, '| to:', to.join(','), '| subject:', msg.subject);
        return { ok: false, error: e.message };
      }
    }
  }
  return { ok: false, error: '未知错误' };
}

/** 发送前判断邮件通道是否可用（供调用方展示状态） */
export function isMailEnabled() {
  return config.enabled && !!config.host && !!config.user;
}

/**
 * 从成员档案读取邮箱（部署文档 §5.3「收件人邮箱从成员档案读取，字段预留」）
 * 当前成员档案暂无 email 字段 → 返回空串，邮件整条静默跳过（站内功能不受影响）。
 * 计算中心/支部档案补充 email 字段后，邮件通道自动生效，无需改代码。
 */
export function emailOf(db, personId) {
  if (!personId) return '';
  try {
    const row = db.prepare('SELECT data FROM users WHERE id = ?').get(personId);
    return row ? (JSON.parse(row.data).email || '') : '';
  } catch (e) {
    console.error('[mailer] 读取成员邮箱失败:', e.message);
    return '';
  }
}
