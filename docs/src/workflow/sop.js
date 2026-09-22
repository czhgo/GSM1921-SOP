// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  sop.js — SOP 推演引擎
// ════════════════════════════════════════════════════════════════

import { sopDatabase } from './sopData.js?v=20260922j';

/**
 * 根据场景 ID 数组与 T-0 日期，实例化 SOP 任务节点
 * @param {string[]} scenarioIdArray
 * @param {string} targetDateStr  YYYY-MM-DD
 * @returns {object[]}
 */
export function instantiateSOP(scenarioIdArray, targetDateStr) {
  const baseDate = new Date(targetDateStr + 'T00:00:00');
  const results  = [];
  sopDatabase.scenarios.forEach(sc => {
    if (!scenarioIdArray.includes(sc.scenarioId)) return;
    sc.tasks.forEach(task => {
      if (task.timeOffset === null) return;
      // 2026-09-22 批次 143（支书裁定「党课通知提前量不设固定值」）：`timeOffset` 非数字（'flexible'）
      // ＝不设固定提前量、由组织者自定——**仍进任务链**，但**不带日期锚点**（date: null）。
      const anchored = typeof task.timeOffset === 'number';
      const d = new Date(baseDate);
      if (anchored) d.setDate(d.getDate() + task.timeOffset);
      results.push({
        scenarioId:    sc.scenarioId,
        scenarioTitle: sc.title,
        taskId:        task.taskId,
        title:         task.title,
        executor:      task.executor,
        supervisor:    task.supervisor,
        timeOffset:    anchored ? task.timeOffset : null,
        desc:          task.desc || '',
        date:          anchored ? d : null,
      });
    });
  });
  // 无日期锚点的任务排最后（带锚点的仍按「日期由近及远」）
  results.sort((a, b) => (b.date ? b.date - 0 : 0) - (a.date ? a.date - 0 : 0));
  return results;
}
