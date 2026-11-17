// role: [工程师]+[AI]
// server/routes/report.js — 数据上报接口（部署文档 §六落地，2026-08-29）
//  - GET  /api/v1/report/:domain?from=&to=   → JSON 拉取（四域：member/activity/attendance/study）
//  - GET  /api/v1/report/export?domain=&from=&to= → CSV 导出（人工导入平台用）
//  - POST /api/v1/report/trigger?branchId=   → 手动触发所选支部的独立推送
//  认证：读取需会话 token；手动推送限党委组织员且必须选定单一支部，字段以平台侧映射表适配
import { Router } from 'express';
import { requireRole } from './auth.js';
import {
  REPORT_DOMAINS, extractDomain, resolveWindow, toCsv, pushReport,
} from '../services/reporting.js';
import { branchSelectionError, resolveBranchIdForActor, selectedBranchRequiredError } from './resources/branch-scope.js';
import { checkDate } from './resources/write-validation.js';
import { SECRETARY_AND_DEPUTY_ROLES } from '../../docs/src/core/domain/constants.js';

// 报表含 member / attendance / study 明细：读权取「支书 / 副支书 + 组织委员 + 党委」。
// 宣传 / 纪检委员不默认放开；如支书另有取向，只改这一处。
const REPORT_READ_ROLES = new Set([...SECRETARY_AND_DEPUTY_ROLES, 'org-commissioner', 'party-staff']);

/**
 * 上报窗口参数校验（Task 6）：`from` / `to` 显式传入时须 `YYYY-MM-DD` 且 `from ≤ to`。
 * 判据复用 `write-validation.js::checkDate`（不另造日期正则）；缺省值仍由 `resolveWindow` 补。
 * @returns {string|null} 字段级错误文案（多条用「；」连接）；合法返回 null
 */
function resolveWindowError(query = {}) {
  const errors = [];
  for (const field of ['from', 'to']) {
    const value = query?.[field];
    if (value === undefined || value === null || value === '') continue;
    const error = checkDate(field, value);
    if (error) errors.push(error);
  }
  if (!errors.length) {
    const { from, to } = resolveWindow(query);
    if (from > to) errors.push('from 不得晚于 to');
  }
  return errors.length ? errors.join('；') : null;
}

/** CSV 文件名里只放数字与连字符（校验已拦非法日期；这里再保证不可能进入引号 / CRLF） */
const safeFileToken = (value) => String(value || '').replace(/[^0-9A-Za-z-]/g, '');

export function createReportRouter(db) {
  const router = Router();

  // 手动触发推送（推送模式）：党委须先选定一个支部，推送仍只含该支部明细。
  // Express 4 不接管 async 拒绝（不 catch 会挂起请求）⇒ 统一 next(err) 交给错误中间件。
  router.post('/report/trigger', requireRole(db, new Set(['party-staff'])), async (req, res, next) => {
    try {
      const scopeDeny = branchSelectionError(req.actor, req.query.branchId);
      if (scopeDeny) return res.status(403).json({ error: scopeDeny });
      const selectionRequired = selectedBranchRequiredError(req.actor, req.query.branchId);
      if (selectionRequired) return res.status(400).json({ error: selectionRequired });
      const windowError = resolveWindowError(req.query);
      if (windowError) return res.status(422).json({ error: windowError });
      const { from, to } = resolveWindow(req.query);
      const result = await pushReport(db, { from, to, branchId: req.query.branchId });
      if (!result.pushed) {
        return res.status(409).json(result); // 409：未配置 webhook（拉取模式指引）
      }
      res.json({ pushed: true, from: result.from, to: result.to, attempt: result.attempt, counts: result.counts });
    } catch (e) {
      next(e);
    }
  });

  // CSV 导出——必须先于 /report/:domain 注册，避免 :domain 吞掉 'export'
  router.get('/report/export', requireRole(db, REPORT_READ_ROLES), (req, res) => {
    const scopeDeny = branchSelectionError(req.actor, req.query.branchId);
    if (scopeDeny) return res.status(403).json({ error: scopeDeny });
    const selectionRequired = selectedBranchRequiredError(req.actor, req.query.branchId);
    if (selectionRequired) return res.status(400).json({ error: selectionRequired });
    const { domain } = req.query;
    if (!domain || !REPORT_DOMAINS[domain]) {
      return res.status(400).json({ error: `未知数据域：${domain}（可选 ${Object.keys(REPORT_DOMAINS).join('/')}）` });
    }
    const windowError = resolveWindowError(req.query);
    if (windowError) return res.status(422).json({ error: windowError });
    const { from, to } = resolveWindow(req.query);
    const rows = extractDomain(db, domain, from, to, { branchId: resolveBranchIdForActor(req.actor, req.query.branchId) });
    const csv = `\uFEFF${toCsv(rows)}`; // UTF-8 BOM：Excel 中文兼容
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFileToken(domain)}-${safeFileToken(to)}.csv"`);
    res.send(csv);
  });

  // JSON 拉取
  router.get('/report/:domain', requireRole(db, REPORT_READ_ROLES), (req, res) => {
    const scopeDeny = branchSelectionError(req.actor, req.query.branchId);
    if (scopeDeny) return res.status(403).json({ error: scopeDeny });
    const selectionRequired = selectedBranchRequiredError(req.actor, req.query.branchId);
    if (selectionRequired) return res.status(400).json({ error: selectionRequired });
    const { domain } = req.params;
    if (!REPORT_DOMAINS[domain]) {
      return res.status(400).json({ error: `未知数据域：${domain}（可选 ${Object.keys(REPORT_DOMAINS).join('/')}）` });
    }
    const windowError = resolveWindowError(req.query);
    if (windowError) return res.status(422).json({ error: windowError });
    const { from, to } = resolveWindow(req.query);
    const items = extractDomain(db, domain, from, to, { branchId: resolveBranchIdForActor(req.actor, req.query.branchId) });
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
