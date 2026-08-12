﻿﻿﻿// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  sop.js — SOP 推演引擎
// ════════════════════════════════════════════════════════════════

import { sopDatabase } from './sopData.js?v=20260812c';

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
      const d = new Date(baseDate);
      d.setDate(d.getDate() + task.timeOffset);
      results.push({
        scenarioId:    sc.scenarioId,
        scenarioTitle: sc.title,
        taskId:        task.taskId,
        title:         task.title,
        executor:      task.executor,
        supervisor:    task.supervisor,
        timeOffset:    task.timeOffset,
        desc:          task.desc || '',
        date:          d,
      });
    });
  });
  results.sort((a, b) => b.date - a.date);
  return results;
}
