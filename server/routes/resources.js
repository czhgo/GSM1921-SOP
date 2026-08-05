// server/routes/resources.js — 资源读取 API（list + bootstrap 全量引导）
import { Router } from 'express';
import { requireAuth } from './auth.js';
import { replaceCollection } from '../db.js';

// 资源名 → 表名映射（与 data-adapter 的分组名对齐）
// T-218：新增 4 张 niche 表（键名与前端快照 payload 键名完全一致）
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
  experienceDeposits: 'experience_deposits',
  complianceReferences: 'compliance_references',
  fileSpaceRecords: 'file_space_records',
  imageRecords: 'image_records',
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

  // 全量快照写穿透：认证后整表替换（data-adapter persist() 的落库目标）
  router.post('/snapshot', requireAuth(db), (req, res) => {
    const payload = req.body || {};
    for (const [name, table] of Object.entries(RESOURCE_TABLES)) {
      if (Array.isArray(payload[name])) {
        replaceCollection(db, table, payload[name]);
      }
    }
    res.status(204).end();
  });

  return router;
}
