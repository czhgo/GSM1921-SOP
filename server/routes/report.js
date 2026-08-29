// role: [工程师]+[AI]
// server/routes/report.js — 数据上报接口（部署文档 §六落地，2026-08-29）
//  - GET  /api/v1/report/:domain?from=&to=   → JSON 拉取（四域：member/activity/attendance/study）
//  - GET  /api/v1/report/export?domain=&from=&to= → CSV 导出（人工导入平台用）
//  - POST /api/v1/report/trigger             → 手动触发推送（推送模式；未配置 webhook 提示拉取模式）
//  认证：requireAuth（计算中心拉取/触发需会话 token；字段以平台侧映射表适配）
import { Router } from 'express';
import { requireAuth } from './auth.js';
import {
  REPORT_DOMAINS, extractDomain, resolveWindow, toCsv, pushReport,
} from '../services/reporting.js';

export function createReportRouter(db) {
  const router = Router();

  // 手动触发推送（推送模式）
  router.post('/report/trigger', requireAuth(db), async (req, res) => {
    const { from, to } = resolveWindow(req.query);
    const result = await pushReport(db, { from, to });
    if (!result.pushed) {
      return res.status(409).json(result); // 409：未配置 webhook（拉取模式指引）
    }
    res.json({ pushed: true, from: result.from, to: result.to, attempt: result.attempt, counts: result.counts });
  });

  // CSV 导出——必须先于 /report/:domain 注册，避免 :domain 吞掉 'export'
  router.get('/report/export', requireAuth(db), (req, res) => {
    const { domain } = req.query;
    if (!domain || !REPORT_DOMAINS[domain]) {
      return res.status(400).json({ error: `未知数据域：${domain}（可选 ${Object.keys(REPORT_DOMAINS).join('/')}）` });
    }
    const { from, to } = resolveWindow(req.query);
    const rows = extractDomain(db, domain, from, to);
    const csv = `\uFEFF${toCsv(rows)}`; // UTF-8 BOM：Excel 中文兼容
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${domain}-${to}.csv"`);
    res.send(csv);
  });

  // JSON 拉取
  router.get('/report/:domain', requireAuth(db), (req, res) => {
    const { domain } = req.params;
    if (!REPORT_DOMAINS[domain]) {
      return res.status(400).json({ error: `未知数据域：${domain}（可选 ${Object.keys(REPORT_DOMAINS).join('/')}）` });
    }
    const { from, to } = resolveWindow(req.query);
    const items = extractDomain(db, domain, from, to);
    res.json({
      domain,
      label: REPORT_DOMAINS[domain].label,
      generatedAt: new Date().toISOString(),
      from,
      to,
      count: items.length,
      items,
    });
  });

  return router;
}
