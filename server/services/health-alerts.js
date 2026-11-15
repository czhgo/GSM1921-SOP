// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/services/health-alerts.js —— 深检查告警（T3 · 六维补齐 M1「坏了能查」）
//
//  为什么有这一份：
//   · 深检查只回答「此刻行不行」；坏了没人盯着，支书要等到有人报错才知道。
//   · 本文件把「ok → failed」这一次状态翻转变成两条可留痕的通知：
//       ① 故障告警：站内通知（受众＝支书 / 副支书）＋ 邮件（复用 `services/mailer.js`）；
//       ② 恢复通知：同一故障恢复时发一条，告诉支书「已恢复」。
//
//  节流口径（可布尔化）：
//   · 同一故障＝失败项 id 集合排序后拼成的签名（如 `backup-dir-writable`）；
//   · 同一签名 **30 分钟内只告警一次**（`ALERT_THROTTLE_MS`）。最近一次告警时间从 `notices` 表
//     的 `systemKind='ops-health-alert'` 行读 `createdAt`，故进程重启后仍然有效；
//   · 恢复通知只在「本进程见过 failed → 现在 ok」时发一条，不按签名节流（每次故障只恢复一次）。
//
//  写入口径：告警不新增 HTTP 写口——通知由服务端直接落 `notices` 表并推进集合版本
//  （与 `routes/system-notices.js` 同一手法），因此 `write-policy-matrix` 无需新增行。
//  邮件为 fire-and-forget：发不出去不阻断深检查响应（站内通知先落库）。
// ════════════════════════════════════════════════════════════════
import { randomUUID } from 'node:crypto';
import { deepHealth } from '../routes/health.js';
import { sendMail, emailOf } from './mailer.js';
import { today as todayLocal } from './reporting.js';
import { bumpCollectionVersion } from '../db.js';

/** 同一故障的告警间隔（30 分钟） */
export const ALERT_THROTTLE_MS = 30 * 60 * 1000;

/** 告警受众（角色键单一源＝`docs/src/core/domain/constants.js`；此处只用既有键） */
export const ALERT_AUDIENCE = Object.freeze(['secretary', 'deputy-secretary']);

/** 通知来源标记：读侧 / 排查靠它区分业务通知与运维通知 */
export const OPS_HEALTH_SOURCE = 'ops-health';

/** 落库 kind 取值（`notices.kind` 只有 announcement / system / message 三类，运维告警属公告型） */
const ALERT_KIND = 'ops-health-alert';
const RECOVERY_KIND = 'ops-health-recovery';

/** 失败项 id → 人话（未知 id 原样显示） */
const CHECK_LABELS = Object.freeze({
  'db-read': '数据库可读',
  'schema-version': '迁移版本',
  'backup-dir-writable': '备份目录可写',
});

/** 失败签名：失败项 id 排序拼接（无失败项时为 `unknown`） */
export function failureSignature(result) {
  const ids = Array.isArray(result?.checks)
    ? result.checks.filter((c) => !c.ok).map((c) => c.id).sort()
    : [];
  return ids.length ? ids.join(',') : 'unknown';
}

/** 读 `notices` 表中某 systemKind 的 `createdAt` 列表（表小，直接扫 JSON 列）；给了签名则只算同一故障 */
function noticeTimesOf(db, systemKind, signature = '') {
  try {
    return db.prepare('SELECT data FROM notices').all()
      .map((row) => {
        try { return JSON.parse(row.data); } catch (_) { return null; }
      })
      .filter((n) => n && n.systemKind === systemKind && (!signature || n.faultSignature === signature))
      .map((n) => Date.parse(n.createdAt || ''))
      .filter((t) => Number.isFinite(t));
  } catch (_) {
    return [];
  }
}

/**
 * 创建深检查监视器（每 app 一份；测试可注入时钟 / 邮件通道 / 临时备份目录）。
 * @param {{
 *   db: import('better-sqlite3').Database,
 *   backupDir?: string,
 *   metrics?: { recordDeepHealth?:Function, recordBackupAt?:Function },
 *   mailer?: { sendMail?:Function },
 *   now?: () => number,
 *   throttleMs?: number,
 * }} options
 */
export function createHealthMonitor({
  db,
  backupDir,
  metrics = null,
  mailer = { sendMail },
  now = Date.now,
  throttleMs = ALERT_THROTTLE_MS,
} = {}) {
  /** 本进程见过的上一状态：null（未知）/ 'ok' / 'failed' */
  let lastStatus = null;

  function recipients() {
    try {
      return db.prepare('SELECT data FROM users').all()
        .map((row) => {
          try { return JSON.parse(row.data); } catch (_) { return null; }
        })
        .filter((u) => u && ALERT_AUDIENCE.includes(u.role))
        .map((u) => emailOf(db, u.id))
        .filter(Boolean);
    } catch (_) {
      return [];
    }
  }

  function writeNotice(systemKind, result, signature) {
    const failed = (result.checks || []).filter((c) => !c.ok)
      .map((c) => ({ id: c.id, label: CHECK_LABELS[c.id] || c.id, error: c.error || 'failed' }));
    const isAlert = systemKind === ALERT_KIND;
    const notice = {
      id: `ntc-${randomUUID().slice(0, 8)}`,
      kind: 'announcement',
      systemKind,
      source: OPS_HEALTH_SOURCE,
      title: isAlert
        ? `运行自检异常：${failed.map((f) => f.label).join('、')}`
        : '运行自检已恢复',
      content: isAlert
        ? `深检查于 ${result.checkedAt} 发现 ${failed.length} 项异常（${failed.map((f) => `${f.label}：${f.error}`).join('；')}）。请检查服务进程、数据库与备份目录；恢复后系统会再通知一次。`
        : `深检查于 ${result.checkedAt} 已恢复正常（数据库可读、迁移版本 v${result.schemaVersion}、备份目录可写）。`,
      priority: isAlert ? 'urgent' : 'normal',
      audience: [...ALERT_AUDIENCE],
      publishDate: todayLocal(),
      createdAt: new Date(now()).toISOString(),
      faultSignature: signature || '',
    };
    db.prepare('INSERT OR REPLACE INTO notices (id, data) VALUES (?, ?)').run(
      notice.id,
      JSON.stringify(notice),
    );
    // 语义写口必须推进集合版本，否则别的设备整表快照会删掉它（R10-D02）
    bumpCollectionVersion(db, 'notices');
    return notice;
  }

  function sendAlertMail(notice) {
    const to = recipients();
    if (!to.length) return; // 成员档案无邮箱时静默跳过（站内通知已落库）
    try {
      const result = mailer.sendMail({
        to,
        subject: `[支部运行自检] ${notice.title}`,
        text: `${notice.content}\n\n——系统自动告警（同一故障 30 分钟内只发一次）`,
      });
      if (result && typeof result.catch === 'function') result.catch(() => {});
    } catch (_) {
      // 邮件通道异常不得影响深检查响应
    }
  }

  return {
    /** 跑一次深检查；仅在状态翻转时落通知 / 发邮件 */
    evaluate() {
      const result = deepHealth(db, backupDir ? { backupDir } : {});
      metrics?.recordDeepHealth?.(result);
      metrics?.recordBackupAt?.(result.lastBackupAt ?? null);
      const current = result.ok ? 'ok' : 'failed';

      if (current === 'failed') {
        const signature = failureSignature(result);
        const previous = lastStatus;
        lastStatus = 'failed';
        if (previous !== 'failed') {
          const lastAlert = Math.max(0, ...noticeTimesOf(db, ALERT_KIND, signature));
          if (!lastAlert || now() - lastAlert >= throttleMs) {
            sendAlertMail(writeNotice(ALERT_KIND, result, signature));
          }
        }
      } else if (lastStatus === 'failed') {
        lastStatus = 'ok';
        sendAlertMail(writeNotice(RECOVERY_KIND, result, ''));
      } else {
        lastStatus = 'ok';
      }
      return result;
    },
    /** 当前进程视角的状态（测试 / 排查用） */
    status() {
      return lastStatus;
    },
  };
}
