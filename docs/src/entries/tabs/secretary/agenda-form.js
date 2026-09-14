// role: [工程师]+[AI]
// agenda-form.js — 创建表单议程收集的纯数据处理（TDD 红测试 agenda-closure-core 目标）
// 支书 2026-09-01 裁决：议程类型不互斥（一条议程可同时标记「讨论文件」「待讨论名单」），
// 按自增列表思路写入，写入同时辅以高级选项。「待讨论名单」= 名单统一阶段转换 + 多选人员。
// 本模块只做数据规范化，UI 接线在 calendar-tab。

import { generateId } from '../../../core/id.js?v=20260914b';

/**
 * 将创建/编辑表单的议程行收集为规范化议程数组。
 * 每条议程生成 id（供详情页「记录通过」按 id 匹配，recordAgendaResult 依赖）。
 * 「待讨论名单」：personIds 多选 + toStage（目标阶段，S-2 界面仅「预备党员/正式党员」两项）；
 * personStages = 逐人当前阶段快照（id→阶段，S-2 由写入面板按所选对象各自现值推导，
 * 供 agenda-follow-up 逐人写申请 fromStage）；fromStage 字段保留仅兼容历史数据（界面已不让人选「从什么」）。
 * @param {Array<{item?:string, host?:string, kinds?:string[], branchDocId?:string, personIds?:string[], personId?:string, fromStage?:string, toStage?:string, personStages?:Object<string,string>}>} rows
 * @returns {Array<{id:string, item:string, host:string, kinds:string[], branchDocId?:string, personIds?:string[], fromStage?:string, toStage?:string, personStages?:Object<string,string>}>}
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
        if (row.fromStage) out.fromStage = row.fromStage; // 兼容历史数据（S-2 界面已隐藏）
        if (row.toStage) out.toStage = row.toStage;
        // S-2：逐人当前阶段快照（多对象阶段可各不相同，按人分别记录）
        if (row.personStages && typeof row.personStages === 'object' && !Array.isArray(row.personStages)) {
          const map = {};
          for (const [id, stage] of Object.entries(row.personStages)) {
            if (id && stage) map[id] = stage;
          }
          if (Object.keys(map).length > 0) out.personStages = map;
        }
      }
      return out;
    })
    .filter(Boolean);
}
