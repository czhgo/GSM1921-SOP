// server/routes/resources.js — 资源读写 API（list + bootstrap + 资源级 CRUD + snapshot 快照写穿）
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { requireAuth, requireCommissioner } from './auth.js';
import { replaceCollection } from '../db.js';
import { deleteUploadedFile } from './uploads.js';

// 资源名 → 表名映射（与 data-adapter 的分组名对齐）
// T-218：新增 4 张 niche 表（键名与前端快照 payload 键名完全一致）
// T-209 全栈同步：补齐前端 mockDB 全部持久化域，使 API 模式全链路可用
const RESOURCE_TABLES = {
  activities: 'activities',
  tasks: 'tasks',
  attendances: 'attendances',
  inspections: 'inspections',
  taskforces: 'taskforces',
  notices: 'notices',
  todos: 'todos',
  assignments: 'assignments',
  makeupTasks: 'makeup_tasks',
  users: 'users',
  experienceDeposits: 'experience_deposits',
  complianceReferences: 'compliance_references',
  fileSpaceRecords: 'file_space_records',
  imageRecords: 'image_records',
  signups: 'signups',
  activityReviews: 'activity_reviews',
  taskforceReviews: 'taskforce_reviews',
  propTasks: 'prop_tasks',
  weeklyReports: 'weekly_reports',
  archiveRecords: 'archive_records',
  mailboxConfig: 'mailbox_config',
  mailboxHistory: 'mailbox_history',
  externalDispatches: 'external_dispatches',
  actSubRecords: 'act_sub_records',
  tfSubRecords: 'tf_sub_records',
  branchDocs: 'branch_docs',
};

function listTable(db, table) {
  return db.prepare(`SELECT data FROM ${table}`).all().map(r => JSON.parse(r.data));
}

// create 缺 id 时的前缀（与前端 mock 生成风格对齐：act-xxx / tsk-xxx ...）
const ID_PREFIX = {
  activities: 'act', tasks: 'tsk', attendances: 'att', inspections: 'ins',
  taskforces: 'tf', notices: 'ntc', todos: 'td', assignments: 'asg',
  makeupTasks: 'mk', experienceDeposits: 'xp',
  complianceReferences: 'cr', fileSpaceRecords: 'fs', imageRecords: 'img',
  signups: 'su', activityReviews: 'arw', taskforceReviews: 'tfr',
  propTasks: 'ppt', weeklyReports: 'wr', archiveRecords: 'ar',
  mailboxConfig: 'mbx', mailboxHistory: 'mbh', externalDispatches: 'ed',
  actSubRecords: 'asr', tfSubRecords: 'tfs',
  branchDocs: 'bd',
};

export function createResourcesRouter(db) {
  const router = Router();

  // 每个资源 GET list
  for (const [name, table] of Object.entries(RESOURCE_TABLES)) {
    router.get(`/${name}`, (req, res) => res.json(listTable(db, table)));
  }

  // 资源级 CRUD（2026-08-06 扎口修复 Z2：此前前端 ApiAdapter 暴露的
  // create/update/delete/archive/brand 接口在服务端全部 404，属「未扎口的假接口」。
  // 现补齐 POST/PATCH/DELETE，使 ApiAdapter 接口完整可用）
  // 需支委写权限的资源（写入/删除均需支委身份，如支部文件）
  const COMMISSIONER_WRITE = new Set(['branchDocs']);
  for (const [name, table] of Object.entries(RESOURCE_TABLES)) {
    const writeAuth = COMMISSIONER_WRITE.has(name) ? requireCommissioner(db) : requireAuth(db);

    // 创建：body 为单条数据对象；缺 id 时服务端生成（与前端 mock 生成风格对齐）
    router.post(`/${name}`, writeAuth, (req, res) => {
      const row = req.body;
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        return res.status(400).json({ error: 'body 须为单条数据对象' });
      }
      const id = row.id || `${ID_PREFIX[name] || 'x'}-${randomUUID().slice(0, 8)}`;
      const data = { ...row, id };
      db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`).run(id, JSON.stringify(data));
      res.status(201).json(data);
    });

    // 更新：局部合并 patch（与前端 update(id, patch) 语义一致）
    router.patch(`/${name}/:id`, writeAuth, (req, res) => {
      const id = req.params.id;
      const existing = db.prepare(`SELECT data FROM ${table} WHERE id = ?`).get(id);
      if (!existing) return res.status(404).json({ error: 'not found' });
      const merged = { ...JSON.parse(existing.data), ...(req.body || {}), id };
      db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`).run(id, JSON.stringify(merged));
      res.json(merged);
    });

    // 删除
    router.delete(`/${name}/:id`, writeAuth, (req, res) => {
      // 文件类资源（支部文件/文件空间记录/图片记录）：删除记录前联动删除已上传的物理文件
      // （书记 2026-08-18 裁决「连物理文件一起删」；T-304 D 档扩展至文件空间/图片记录，杜绝孤儿文件）
      if (name === 'branchDocs' || name === 'fileSpaceRecords' || name === 'imageRecords') {
        const existing = db.prepare(`SELECT data FROM ${table} WHERE id = ?`).get(req.params.id);
        if (existing) {
          const doc = JSON.parse(existing.data);
          if (doc.filePath) deleteUploadedFile(doc.filePath);
        }
      }
      const info = db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(req.params.id);
      if (info.changes === 0) return res.status(404).json({ error: 'not found' });
      // 2026-08-27 T-283 生命周期修复：彻底删除活动须联动清理全部子记录
      // （与前端 mock.js/mock-adapter.js deleteActivity 同构，防 API 直连路径产生孤儿数据）
      if (name === 'activities') {
        const id = req.params.id;
        const CHILD_TABLES = ['tasks', 'attendances', 'inspections', 'assignments', 'activity_reviews', 'makeup_tasks'];
        for (const t of CHILD_TABLES) {
          for (const r of db.prepare(`SELECT id, data FROM ${t}`).all()) {
            if (JSON.parse(r.data).activityId === id) db.prepare(`DELETE FROM ${t} WHERE id = ?`).run(r.id);
          }
        }
        for (const r of db.prepare('SELECT id, data FROM signups').all()) {
          const row = JSON.parse(r.data);
          if (row.sourceType === 'activity' && row.sourceId === id) db.prepare('DELETE FROM signups WHERE id = ?').run(r.id);
        }
        for (const r of db.prepare('SELECT id, data FROM notices').all()) {
          const row = JSON.parse(r.data);
          if (row.targetType === 'activity' && row.targetId === id) db.prepare('DELETE FROM notices WHERE id = ?').run(r.id);
        }
      }
      res.status(204).end();
    });
  }

  // 活动归档/品牌切换特例（与前端 BranchService.archiveActivity/toggleBrand 语义对齐）
  router.post('/activities/:id/archive', requireAuth(db), (req, res) => {
    const id = req.params.id;
    const existing = db.prepare('SELECT data FROM activities WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'not found' });
    const act = { ...JSON.parse(existing.data), id, archived: true };
    db.prepare('INSERT OR REPLACE INTO activities (id, data) VALUES (?, ?)').run(id, JSON.stringify(act));
    // 级联：归档后该活动相关任务全部完成（与前端 archiveActivity 行为一致）
    const tasks = db.prepare('SELECT data FROM tasks').all().map(r => JSON.parse(r.data));
    for (const t of tasks) {
      if (t.activityId === id && t.status !== 'completed') {
        db.prepare('INSERT OR REPLACE INTO tasks (id, data) VALUES (?, ?)')
          .run(t.id, JSON.stringify({ ...t, status: 'completed' }));
      }
    }
    res.json(act);
  });

  router.post('/activities/:id/brand', requireAuth(db), (req, res) => {
    const id = req.params.id;
    const existing = db.prepare('SELECT data FROM activities WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ error: 'not found' });
    const current = JSON.parse(existing.data);
    const act = { ...current, id, isBrand: !current.isBrand };
    db.prepare('INSERT OR REPLACE INTO activities (id, data) VALUES (?, ?)').run(id, JSON.stringify(act));
    res.json(act);
  });

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
