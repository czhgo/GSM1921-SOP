// role: [工程师]+[AI]
// server/routes/report.js — 数据上报接口（部署文档 §六落地，2026-08-29）
//  - GET  /api/v1/report/:domain?from=&to=   → JSON 拉取（四域：member/activity/attendance/study）
//  - GET  /api/v1/report/export?domain=&from=&to= → CSV 导出（人工导入平台用）
//  - POST /api/v1/report/trigger?branchId=   → 手动触发所选支部的独立推送
//  认证：读取需会话 token；手动推送限党委组织员且必须选定单一支部，字段以平台侧映射表适配
import { Router } from 'express';
import { requireAuth, requireRole } from './auth.js';
import {
  REPORT_DOMAINS, extractDomain, resolveWindow, toCsv, pushReport,
} from '../services/reporting.js';
import { actorBranchId, branchSelectionError, selectedBranchRequiredError } from './resources/branch-scope.js';

export function createReportRouter(db) {
  const router = Router();

  // 手动触发推送（推送模式）：党委须先选定一个支部，推送仍只含该支部明细。
  router.post('/report/trigger', requireRole(db, new Set(['party-staff'])), async (req, res) => {
    const scopeDeny = branchSelectionError(req.actor, req.query.branchId);
    if (scopeDeny) return res.status(403).json({ error: scopeDeny });
    const selectionRequired = selectedBranchRequiredError(req.actor, req.query.branchId);
    if (selectionRequired) return res.status(400).json({ error: selectionRequired });
    const { from, to } = resolveWindow(req.query);
    const result = await pushReport(db, { from, to, branchId: req.query.branchId });
    if (!result.pushed) {
      return res.status(409).json(result); // 409：未配置 webhook（拉取模式指引）
    }
    res.json({ pushed: true, from: result.from, to: result.to, attempt: result.attempt, counts: result.counts });
  });

  // CSV 导出——必须先于 /report/:domain 注册，避免 :domain 吞掉 'export'
  router.get('/report/export', requireAuth(db), (req, res) => {
    const scopeDeny = branchSelectionError(req.actor, req.query.branchId);
    if (scopeDeny) return res.status(403).json({ error: scopeDeny });
    const selectionRequired = selectedBranchRequiredError(req.actor, req.query.branchId);
    if (selectionRequired) return res.status(400).json({ error: selectionRequired });
    const { domain } = req.query;
    if (!domain || !REPORT_DOMAINS[domain]) {
      return res.status(400).json({ error: `未知数据域：${domain}（可选 ${Object.keys(REPORT_DOMAINS).join('/')}）` });
    }
    const { from, to } = resolveWindow(req.query);
    const rows = extractDomain(db, domain, from, to, { branchId: actorBranchId(req.actor) || req.query.branchId || null });
    const csv = `\uFEFF${toCsv(rows)}`; // UTF-8 BOM：Excel 中文兼容
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${domain}-${to}.csv"`);
    res.send(csv);
  });

  // JSON 拉取
  router.get('/report/:domain', requireAuth(db), (req, res) => {
    const scopeDeny = branchSelectionError(req.actor, req.query.branchId);
    if (scopeDeny) return res.status(403).json({ error: scopeDeny });
    const selectionRequired = selectedBranchRequiredError(req.actor, req.query.branchId);
    if (selectionRequired) return res.status(400).json({ error: selectionRequired });
    const { domain } = req.params;
    if (!REPORT_DOMAINS[domain]) {
      return res.status(400).json({ error: `未知数据域：${domain}（可选 ${Object.keys(REPORT_DOMAINS).join('/')}）` });
    }
    const { from, to } = resolveWindow(req.query);
    const items = extractDomain(db, domain, from, to, { branchId: actorBranchId(req.actor) || req.query.branchId || null });
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
