// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  server/services/metrics.js —— 最小运行指标集（T3 · 六维补齐 M1「坏了能查」）
//
//  为什么有这一份：
//   · 日志能按请求 id 串起一次请求，但回答不了「现在整体怎么样」；
//   · 支书 / 运维需要一个只读读数：请求总数、5xx 数、平均耗时、最近备份时间、深检查状态。
//   · **不引入 Prometheus**：只在进程内存里累加，重启即归零；需要长期留存的走日志。
//
//  口径：
//   · 只统计 `/api/` 请求（静态资源逐条计入会淹没平均耗时，与 `services/logger.js` 同口径）；
//   · `durationMs` 为中间件进入 → `finish` / `close` 的墙钟时间；
//   · 本文件不读磁盘、不写库；最近备份时间由 `routes/health.js::latestBackupAt` 现扫备份目录。
// ════════════════════════════════════════════════════════════════

/** 指标实例：进程内累加器（每个 app 一份，测试可各自隔离） */
export function createMetrics({ now = Date.now } = {}) {
  const startedAt = new Date(now()).toISOString();
  let total = 0;
  let serverErrors = 0;
  let durationTotal = 0;
  let lastBackupAt = null;
  let deepHealth = { status: 'unknown', checkedAt: null, failedChecks: [] };

  return {
    /** 记一次 API 请求（status / 耗时） */
    recordRequest({ status, durationMs } = {}) {
      total += 1;
      if (Number(status) >= 500) serverErrors += 1;
      durationTotal += Math.max(0, Number(durationMs) || 0);
    },
    /** 记一次深检查结果（供 `/health/metrics` 与告警共用） */
    recordDeepHealth(result) {
      if (!result) return;
      deepHealth = {
        status: result.status || (result.ok ? 'ok' : 'degraded'),
        checkedAt: result.checkedAt || new Date(now()).toISOString(),
        failedChecks: Array.isArray(result.checks)
          ? result.checks.filter((c) => !c.ok).map((c) => c.id)
          : [],
      };
    },
    /** 记最近一次备份时间（ISO；无备份传 null） */
    recordBackupAt(iso) {
      lastBackupAt = iso || null;
    },
    /** 只读快照（响应体即此对象） */
    snapshot() {
      return {
        ok: true,
        startedAt,
        checkedAt: new Date(now()).toISOString(),
        requests: {
          total,
          serverErrors,
          avgDurationMs: total ? Math.round(durationTotal / total) : 0,
        },
        deepHealth: { ...deepHealth, failedChecks: [...deepHealth.failedChecks] },
        lastBackupAt,
      };
    },
  };
}

/**
 * 请求计数中间件。
 * @param {() => ReturnType<typeof createMetrics>|undefined|null} getMetrics 懒取实例
 *   （`server/app.js` 的 `app.locals.metrics` 在中间件挂载之后才赋值，故用 getter）。
 */
export function createMetricsMiddleware(getMetrics = () => null, { now = Date.now } = {}) {
  return function metricsMiddleware(req, res, next) {
    if (!String(req.originalUrl || '').startsWith('/api/')) return next();
    const startedAt = now();
    let recorded = false;
    const emit = () => {
      if (recorded) return;
      recorded = true;
      try {
        getMetrics()?.recordRequest({ status: res.statusCode, durationMs: Math.max(0, now() - startedAt) });
      } catch (_) {
        // 指标累加失败不得影响请求（观测是旁路）
      }
    };
    res.once('finish', emit);
    res.once('close', emit);
    next();
  };
}
