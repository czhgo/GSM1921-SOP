// role: [工程师]+[AI]
// agenda-form.js — 创建表单议程收集的纯数据处理（TDD 红测试 agenda-closure-core 目标）
// 书记 2026-09-01 裁决：议程类型不互斥（一条议程可同时标记「讨论文件」「待讨论名单」），
// 按自增列表思路写入，写入同时辅以高级选项。「待讨论名单」= 名单统一阶段转换 + 多选人员。
// 本模块只做数据规范化，UI 接线在 calendar-tab。

import { generateId } from '../../../core/id.js?v=20260901t';

/**
 * 将创建/编辑表单的议程行收集为规范化议程数组。
 * 每条议程生成 id（供详情页「记录通过」按 id 匹配，recordAgendaResult 依赖）。
 * @param {Array<{item?:string, host?:string, kinds?:string[], branchDocId?:string, personIds?:string[], personId?:string, fromStage?:string, toStage?:string}>} rows
 * @returns {Array<{id:string, item:string, host:string, kinds:string[], branchDocId?:string, personIds?:string[], fromStage?:string, toStage?:string}>}
 */
export function collectAgendaRows(rows = []) {
  return rows
    .map((row) => {
      const item = String(row.item || '').trim();
      if (!item) return null;
      const kinds = Array.isArray(row.kinds) ? [...row.kinds] : [];
      const out = {
        id: row.id || generateId('ag'),
        item,
        host: String(row.host || '').trim(),
        kinds,
      };
      if (kinds.includes('discussion-file') && row.branchDocId) {
        out.branchDocId = row.branchDocId;
      }
      if (kinds.includes('attendee-list')) {
        // 待讨论名单：名单统一阶段转换 + 多选人员（兼容旧单值 personId）
        const personIds = Array.isArray(row.personIds) ? row.personIds : (row.personId ? [row.personId] : []);
        if (personIds.length > 0) out.personIds = personIds;
        if (row.fromStage) out.fromStage = row.fromStage;
        if (row.toStage) out.toStage = row.toStage;
      }
      return out;
    })
    .filter(Boolean);
}
