// server/routes/resources.js — 资源读取 API（list + bootstrap 全量引导）
import { Router } from 'express';

// 资源名 → 表名映射（与 data-adapter 的分组名对齐）
const RESOURCE_TABLES = {
  activities: 'activities',
  tasks: 'tasks',
  attendances: 'attendances',
  inspections: 'inspections',
  taskforces: 'taskforces',
  notices: 'notices',
  todos: 'todos',
  assignments: 'assignments',
  handovers: 'handovers',
  makeupTasks: 'makeup_tasks',
  users: 'users',
};

function listTable(db, table) {
  return db.prepare(`SELECT data FROM ${table}`).all().map(r => JSON.parse(r.data));
}

export function createResourcesRouter(db) {
  const router = Router();

  // 每个资源 GET list
  for (const [name, table] of Object.entries(RESOURCE_TABLES)) {
    router.get(`/${name}`, (req, res) => res.json(listTable(db, table)));
  }

  // 全量引导：一次拉取全部资源（data-adapter init() 在 api 模式的填充来源）
  router.get('/bootstrap', (req, res) => {
    const out = {};
    for (const [name, table] of Object.entries(RESOURCE_TABLES)) {
      out[name] = listTable(db, table);
    }
    res.json(out);
  });

  return router;
}
