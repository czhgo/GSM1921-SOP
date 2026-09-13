// server/routes/resources.js — 资源读写 API（list + bootstrap + 资源级 CRUD + snapshot 快照写穿）
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { requireAuth, requireCommissioner, requireRole } from './auth.js';
import { replaceCollection } from '../db.js';
import { deleteUploadedFile } from './uploads.js';
import { afterResourceWrite } from '../services/mailer-hooks.js';
// P1a 单向权威（2026-09-03）：config（modules/blocks）净化唯一实现 = docs/src/core/config-clean.js（前端 branch.js 同源，勿在 server 另写 clean）
// 2026-09-06 换组织向导：config 组织档案字段（headerTitle/desc/themePreset）净化同源
// 2026-09-09 审计内核：历史上限/单键回滚白名单/回滚标记单一源同 import（与前端 branch.js 防失同步）
import { sanitizeConfigModules, sanitizeConfigBlocks, sanitizeConfigWorkforce, sanitizeConfigOrg, sanitizeConfigPolicyOverrides, CONFIG_HISTORY_MAX, CONFIG_ROLLBACK_WHAT, CONFIG_ROLLBACK_KEYS } from '../../docs/src/core/config-clean.js';
// 批4（2026-09-09 支书批「域参数」）：policyOverrides 顶层节白名单（server 写口与前端 branch.js 同源校验）
import { POLICY_OVERRIDE_SECTIONS } from '../../docs/src/core/policy-defaults.js';
// P2c（2026-09-03）：授权语义角色集单一源 = docs/src/core/constants.js（勿手写）
import { BRANCH_COMMISSION_ROLES, PARTY_STAFF_ROLE as PARTY_STAFF_KEYS, SECRETARY_ROLES, NOTICE_PUBLISH_ROLES, NOTICE_MANAGE_ROLES, hashSubmitterToken, isAnonymousForced } from '../../docs/src/core/constants.js';

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
  // P1 党委后台（2026-09-02）：支部实例（党委工作台支部管理；写权限默认 requireAuth，收紧留 P2）
  branches: 'branches',
  // P2 党委后台（2026-09-02）：支书任期记录
  appointmentRecords: 'appointment_records',
  // P3 党委后台（2026-09-02）：支部上报审批（发展节点/活动报备 → 党委批驳）
  reviewRequests: 'review_requests',
  // R-23（2026-09-13）：思想汇报（建表后随快照同步；系统通知 authorize 据本表复算提交人）
  thoughtReports: 'thought_reports',
};

function listTable(db, table) {
  return db.prepare(`SELECT data FROM ${table}`).all().map(r => JSON.parse(r.data));
}

// ── P3 上线前收紧（2026-09-03，design §7 登记项落地）：资源级写角色门 ──────────
// 默认仍 requireAuth；以下资源写权限按角色收紧（防支部成员自批/篡改治理档案）：
//   branches / appointmentRecords / users → 仅 party-staff（党委组织员/党务老师）
//   reviewRequests → POST=本支部支委层（同支部校验）；PATCH/DELETE=party-staff（党委审批）
// P2c（2026-09-03）：角色集单一源 = constants.js（勿手写）
const PARTY_STAFF_ROLE = new Set(PARTY_STAFF_KEYS);
const BRANCH_COMMITTEE_ROLES = new Set(BRANCH_COMMISSION_ROLES);
const NOTICE_PUBLISH_ROLE_SET = new Set(NOTICE_PUBLISH_ROLES);
const NOTICE_MANAGE_ROLE_SET = new Set(NOTICE_MANAGE_ROLES);
const RESOURCE_WRITE_GATE = {
  branches: 'party-staff',
  appointmentRecords: 'party-staff',
  users: 'party-staff',
  reviewRequests: { post: 'branch-committee', patch: 'party-staff', delete: 'party-staff' },
  // 通知（2026-09-13 dogfood 权限专项）：发布=支书/副支书/组织/宣传，管理（编辑/删除）=发布者+纪检；
  // 角色名单单一源 = constants.js::NOTICE_PUBLISH_ROLES / NOTICE_MANAGE_ROLES（与前端 NoticePermission 同源）
  notices: { post: 'notice-publish', patch: 'notice-manage', delete: 'notice-manage' },
};

/** 资源写角色门判定（在 requireAuth 之后、handler 内调用；未设门资源一律放行） */
function _assertResourceWrite(actor, name, method, body) {
  const gate = RESOURCE_WRITE_GATE[name];
  if (!gate) return true; // 未设门：由既有 writeAuth（requireAuth / requireCommissioner）把关
  const need = typeof gate === 'string' ? gate : gate[method];
  if (!need) return true;
  if (need === 'party-staff') {
    return !!actor && PARTY_STAFF_ROLE.has(actor.role);
  }
  if (need === 'branch-committee') {
    // 支部侧上报：仅本支部支委层成员（actor 归属支部与上报支部一致；老数据缺省视为 br-b1）
    if (!actor || !BRANCH_COMMITTEE_ROLES.has(actor.role)) return false;
    const myBranch = actor.branchId || 'br-b1';
    const targetBranch = (body && body.branchId) || 'br-b1';
    return myBranch === targetBranch;
  }
  if (need === 'notice-publish') {
    // 人工发布：白名单角色。
    // R-22（2026-09-13）：系统派生通知不再走本通道——原「客户端打标 systemDerived 即放行」因
    // 标记可伪造（任一登录成员可借此发任意广播通知）而移除，改由服务端注册表生成，
    // 见 server/system-notice-kinds.js 与 POST /api/v1/system-notices。
    return !!actor && NOTICE_PUBLISH_ROLE_SET.has(actor.role);
  }
  if (need === 'notice-manage') return !!actor && NOTICE_MANAGE_ROLE_SET.has(actor.role);
  return true;
}

/** 写门 403 文案（按资源给可懂原因，勿用一句万金油） */
function _writeDenyMsg(name) {
  if (name === 'notices') {
    return '无权限：通知发布仅限支书/副支书/组织委员/宣传委员，编辑与删除另含纪检委员';
  }
  return '无权限：该写操作仅限党委组织员/党务老师或本支部支委层';
}

// ── 活动写门（dogfood 权限专项 2026-09-13 实证缺口）──────────────────────────
// 缺口：POST/PATCH/DELETE /activities 此前仅 requireAuth → 任一登录成员可建「支委会」活动、
//   并可改 voteConfig.voterIds 篡改表决名单（真机 API 探针实测：普通成员 POST 201、PATCH 200）。
// 现行门：① 非支委层（普通成员/预备党员/积极分子等）一律拒；
//   ② 党小组组长仅限「党小组会 / 主题党日」（对齐 SYSTEM_ROLE_PERMISSION §9a 与组长手册）。
// 支委层既有功能位（宣传归档、议程/结果编辑、状态更新）保持放行，不在此收口——是否进一步收紧为
//   §9a 原文「仅支书/副支书/党小组组长」列入丙部待支书裁（避免误伤归档/议程链路）。
const ACTIVITY_WRITE_ROLES = new Set([...BRANCH_COMMISSION_ROLES, 'leader']);
const LEADER_ACTIVITY_TYPES = new Set(['党小组会', '主题党日']);
const ACTIVITY_WRITE_DENY_MSG = '无权限：活动写入仅限支委层与党小组组长（组长限党小组会/主题党日）';
function _assertActivityWrite(actor, effectiveType) {
  if (!actor || !ACTIVITY_WRITE_ROLES.has(actor.role)) return false;
  if (actor.role === 'leader') return LEADER_ACTIVITY_TYPES.has(effectiveType);
  return true;
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
  branches: 'br',
  appointmentRecords: 'appt',
  reviewRequests: 'rq',
  thoughtReports: 'tr',
};

// 表决计票方式写侧校验（2026-09-12 支书裁定）：正式表决（optionSet formal——发展党员/转正等）
// 制度强制无记名，显式写 ballotMode='named' 一律 400（规则单一源 constants.js::isAnonymousForced）。
// 仅在请求显式携带 voteConfig 时校验（不含则不动既有活动配置，防无关 patch 误拒）。
function _ballotModeReject(voteConfig) {
  if (!voteConfig || typeof voteConfig !== 'object') return null;
  if (isAnonymousForced(voteConfig.optionSet) && voteConfig.ballotMode === 'named') {
    return '正式表决须采用无记名投票（ballotMode=anonymous），不得设置为记名';
  }
  return null;
}

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
    // 2026-09-06 立项⑤：branches 的 POST 收口为下方语义化「POST /branches」
    // （空模板/复制双形态创建，party-staff 门控，见 L2 配置路由之前）；本通用 POST 跳过 branches。
    if (name !== 'branches') {
      router.post(`/${name}`, writeAuth, (req, res) => {
        if (!_assertResourceWrite(req.actor, name, 'post', req.body)) {
          return res.status(403).json({ error: _writeDenyMsg(name) });
        }
        const row = req.body;
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
          return res.status(400).json({ error: 'body 须为单条数据对象' });
        }
        // 活动写门：非支委层拒；组长限党小组会/主题党日
        if (name === 'activities' && !_assertActivityWrite(req.actor, row.type)) {
          return res.status(403).json({ error: ACTIVITY_WRITE_DENY_MSG });
        }
        // 计票方式强制校验（仅活动）：正式表决不得写 named
        if (name === 'activities') {
          const ballotErr = _ballotModeReject(row.voteConfig);
          if (ballotErr) return res.status(400).json({ error: ballotErr });
        }
        const id = row.id || `${ID_PREFIX[name] || 'x'}-${randomUUID().slice(0, 8)}`;
        const data = { ...row, id };
        db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`).run(id, JSON.stringify(data));
        // 邮件双通道（部署文档 §五）：通知发布/待办提醒/反馈汇报触发邮件，异步 fire-and-forget，
        // 失败/未配置均不影响站内功能（降级不阻断）
        afterResourceWrite(db, name, data).catch(() => {});
        res.status(201).json(data);
      });
    }

    // 更新：局部合并 patch（与前端 update(id, patch) 语义一致）
    router.patch(`/${name}/:id`, writeAuth, (req, res) => {
      if (!_assertResourceWrite(req.actor, name, 'patch', req.body)) {
        return res.status(403).json({ error: _writeDenyMsg(name) });
      }
      const id = req.params.id;
      const existing = db.prepare(`SELECT data FROM ${table} WHERE id = ?`).get(id);
      if (!existing) return res.status(404).json({ error: 'not found' });
      // 活动写门：按「本次改后的类型」判定（未携带 type 时取既有类型）
      if (name === 'activities') {
        const effectiveType = (req.body && req.body.type) || JSON.parse(existing.data).type;
        if (!_assertActivityWrite(req.actor, effectiveType)) {
          return res.status(403).json({ error: ACTIVITY_WRITE_DENY_MSG });
        }
      }
      // 计票方式强制校验（仅活动、且显式携带 voteConfig）：正式表决不得改为 named
      if (name === 'activities' && req.body && req.body.voteConfig !== undefined) {
        const ballotErr = _ballotModeReject(req.body.voteConfig);
        if (ballotErr) return res.status(400).json({ error: ballotErr });
      }
      const merged = { ...JSON.parse(existing.data), ...(req.body || {}), id };
      db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`).run(id, JSON.stringify(merged));
      res.json(merged);
    });

    // 删除
    router.delete(`/${name}/:id`, writeAuth, (req, res) => {
      if (!_assertResourceWrite(req.actor, name, 'delete', null)) {
        return res.status(403).json({ error: _writeDenyMsg(name) });
      }
      // 活动写门：删除同样受限（防普通成员清库）
      if (name === 'activities') {
        const actRow = db.prepare(`SELECT data FROM ${table} WHERE id = ?`).get(req.params.id);
        if (actRow && !_assertActivityWrite(req.actor, JSON.parse(actRow.data).type)) {
          return res.status(403).json({ error: ACTIVITY_WRITE_DENY_MSG });
        }
      }
      // 文件类资源（支部文件/文件空间记录/图片记录）：删除记录前联动删除已上传的物理文件
      // （支书 2026-08-18 裁决「连物理文件一起删」；T-304 D 档扩展至文件空间/图片记录，杜绝孤儿文件）
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

  // ── 立项⑤ 阶段A：支部语义创建 POST /branches（2026-09-06）────────────
  // 空模板初始化 / 复制现有支部为模板——双形态口径与前端 services/branch.js createBranch
  // （EMPTY_BRANCH_TEMPLATE + buildNewBranchRecord）一致：server 内联同语义，
  // 双形态一致性由 server/test/empty-template.test.mjs ⑤ 断言守护（防两端失同步）。
  // 门控：party-staff（与 PATCH /branches/:id/config 同风格 requireAuth + 角色判定）。
  // body：{ mode?: 'empty'|'copy', sourceId?, name?, type? }——
  //   name 缺省 = 占位名「新支部（待配置）」（名待填，向导步骤①可改）；
  //   显式空/超长（>80，与 config-clean ORG_MAX.name 对齐）→ 400 原因；type 仅 empty 模式透传。
  // 复制语义：config 域 modules/blocks/workforce 深拷贝（源缺省 → null 默认全开/缺省分工）；
  //   org 档案域复制 desc/themePreset；headerTitle 取新支部名（name→headerTitle 同步不变式，
  //   与前端 renameBranch/updateBranchOrg 一致）；secretaryId 不带走（席位待任命）。
  // 返回：201 { branch, ok:true }；门控/校验错误 → 400/401/403 { ok:false, reason }。
  // 兼容：原支部管理「+ 新建支部」的 { name, type }（无 mode）按 empty 形态处理（type 透传）。
  router.post('/branches', requireAuth(db), (req, res) => {
    const actor = req.actor;
    if (!actor) return res.status(401).json({ ok: false, reason: '未登录' });
    if (!PARTY_STAFF_ROLE.has(actor.role)) {
      return res.status(403).json({ ok: false, reason: '无权限：仅党委组织员/党务老师可创建支部' });
    }
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const isCopy = body.mode === 'copy';
    const nameRaw = body.name;
    let finalName;
    if (nameRaw === undefined || nameRaw === null) {
      finalName = '新支部（待配置）';
    } else {
      const t = String(nameRaw).trim();
      if (!t) return res.status(400).json({ ok: false, reason: '支部名不能为空' });
      if (t.length > 80) return res.status(400).json({ ok: false, reason: '支部名过长（不超过 80 字）' });
      finalName = t;
    }
    let sourceBranch = null;
    if (isCopy) {
      if (!body.sourceId) return res.status(400).json({ ok: false, reason: '复制模式须提供 sourceId' });
      const srcRow = db.prepare('SELECT data FROM branches WHERE id = ?').get(String(body.sourceId));
      if (!srcRow) return res.status(400).json({ ok: false, reason: '源支部不存在' });
      sourceBranch = JSON.parse(srcRow.data);
    }
    const at = new Date().toISOString();
    const cloneOrNull = (v) => (v === undefined || v === null ? null : JSON.parse(JSON.stringify(v)));
    const srcCfg = isCopy ? (sourceBranch.config || {}) : null;
    const config = {
      headerTitle: isCopy ? finalName : '',
      accent: null,
      modules: isCopy ? cloneOrNull(srcCfg.modules) : null,
      blocks: isCopy ? cloneOrNull(srcCfg.blocks) : null,
      workforce: isCopy ? cloneOrNull(srcCfg.workforce) : null,
      desc: isCopy ? (srcCfg.desc ?? '') : '',
      themePreset: isCopy ? (srcCfg.themePreset ?? null) : null,
      fileSpaceIsolated: isCopy ? (srcCfg.fileSpaceIsolated ?? true) : true,
      // 建支部留痕（与前端 configChangeHistory 同一审计口径 {by,at,what,from,to}）
      configChangeHistory: [{
        by: actor.id,
        at,
        what: 'branch-created',
        from: isCopy ? `branch:${sourceBranch.id}` : 'empty-template',
        to: null,
      }],
    };
    const id = `br-${randomUUID().slice(0, 8)}`;
    const branch = {
      id,
      name: finalName,
      type: isCopy ? (sourceBranch.type || '') : String(body.type || '').trim(),
      config,
      secretaryId: null, // 空支部席位空缺待任命（复制不带走源支书）
      status: 'active',
      createdAt: at,
    };
    db.prepare('INSERT OR REPLACE INTO branches (id, data) VALUES (?, ?)').run(id, JSON.stringify(branch));
    res.status(201).json({ branch, ok: true });
  });

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
  // 2026-09-01：支持 gzip 压缩体（前端 CompressionStream 压缩，规避大 payload 传输限制）；
  // 兼容未压缩 JSON（snapshot.test.js 等直连用例）。
  router.post('/snapshot', requireAuth(db), (req, res) => {
    let payload = req.body;
    try {
      if (req.headers['content-encoding'] === 'gzip') {
        try {
          payload = JSON.parse(gunzipSync(req.body).toString('utf8'));
        } catch (e) {
          // 沙箱代理（TRAE）会自动解压 gzip 请求体但保留 Content-Encoding 头：
          // 服务器收到的是已解压 JSON，gunzip 必然失败 → 回退直接 parse。
          payload = JSON.parse(req.body.toString('utf8'));
        }
      } else if (Buffer.isBuffer(req.body)) {
        payload = JSON.parse(req.body.toString('utf8'));
      }
    } catch (e) {
      return res.status(400).json({ error: '快照 payload 解析失败：' + e.message });
    }
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: '快照 payload 必须是 JSON 对象' });
    }
    for (const [name, table] of Object.entries(RESOURCE_TABLES)) {
      if (Array.isArray(payload[name])) {
        replaceCollection(db, table, payload[name]);
      }
    }
    res.status(204).end();
  });

  // ── L2 支部工作流模块配置（2026-09-03 支书裁定：支部自治/支书操作/核心固定）────────
  // 支书写自己支部 config.modules；党委组织员保留；body 白名单仅收 modules 两数组，
  // 不触碰治理字段（name/type/secretaryId/status）——与通用 branches PATCH（party-staff）互补。
  // 2026-09-06 换组织向导（支书 R4）：白名单扩 config.headerTitle/desc/themePreset（组织档案域，
  // 仍在 config 内、非治理字段）；配置变更统一追加 config.configChangeHistory（by/at/what/from/to）。
  // 2026-09-09 副书同权（支书批）：config 写权扩展本副支书（deputy-secretary 且归属该支部）——同现任支书。
  router.patch('/branches/:id/config', requireAuth(db), (req, res) => {
    const actor = req.actor;
    if (!actor) return res.status(401).json({ error: '未登录' });
    const row = db.prepare('SELECT data FROM branches WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: '支部不存在' });
    const branch = JSON.parse(row.data);

    const isStaff = actor.role === 'party-staff';
    const isSecretary = !!branch.secretaryId && actor.id === branch.secretaryId;
    const isDeputyHere = actor.role === 'deputy-secretary' && (actor.branchId || 'br-b1') === branch.id;
    // 批4（2026-09-09 支书批「域参数」）：域负责人（本支部纪检/组织/组长）仅可写自己域节
    // policyOverrides（inspection=纪检 · memberConfirmation=组织 · leader=组长），与前端 branch.js 同口径。
    const DOMAIN_SECTION_BY_ROLE = { 'disc-commissioner': 'inspection', 'org-commissioner': 'memberConfirmation', leader: 'leader' };
    let domainSection = null;
    if (!isStaff && !isSecretary && !isDeputyHere && (actor.branchId || 'br-b1') === branch.id) {
      domainSection = DOMAIN_SECTION_BY_ROLE[actor.role] || null;
    }
    const fullRights = isStaff || isSecretary || isDeputyHere;
    if (!fullRights && !domainSection) {
      return res.status(403).json({ error: '无权限：仅本支部现任支书/副支书或党委组织员可配置（域负责人仅可改本域参数）' });
    }

    const cfg = req.body?.config;
    if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) {
      return res.status(400).json({ error: 'body.config 须为对象' });
    }
    const hasModules = Object.prototype.hasOwnProperty.call(cfg, 'modules');
    const hasBlocks = Object.prototype.hasOwnProperty.call(cfg, 'blocks');
    const hasWorkforce = Object.prototype.hasOwnProperty.call(cfg, 'workforce');
    const hasOrg = ['headerTitle', 'desc', 'themePreset'].some(k => Object.prototype.hasOwnProperty.call(cfg, k));
    const hasPolicy = Object.prototype.hasOwnProperty.call(cfg, 'policyOverrides');
    if (!hasModules && !hasBlocks && !hasWorkforce && !hasOrg && !hasPolicy) {
      return res.status(400).json({ error: '至少提供 config.modules / config.blocks / config.workforce / 组织档案字段(headerTitle/desc/themePreset) / policyOverrides 之一' });
    }
    // 域负责人（无全量权）只允许 policyOverrides 且仅自己域节
    if (!fullRights && (hasModules || hasBlocks || hasWorkforce || hasOrg || !hasPolicy)) {
      return res.status(403).json({ error: '无权限：域负责人仅可配置本域参数（config.policyOverrides）' });
    }
    const prevConfig = { ...(branch.config || {}) };
    const nextConfig = { ...prevConfig };
    if (hasModules) {
      const m = cfg.modules;
      if (m === null) {
        nextConfig.modules = null; // 恢复默认（全开 + 注册顺序）
      } else if (!m || typeof m !== 'object' || Array.isArray(m)) {
        return res.status(400).json({ error: 'config.modules 须为对象 { hiddenTabIds, tabOrder } 或 null' });
      } else {
        nextConfig.modules = sanitizeConfigModules(m); // 净化唯一实现 = docs/src/core/config-clean.js（与前端 branch.js 同源）
      }
    }
    if (hasBlocks) {
      const b = cfg.blocks;
      if (b === null) {
        nextConfig.blocks = null; // 恢复默认（产出块/工作流块全开 + 注册顺序）
      } else if (!b || typeof b !== 'object' || Array.isArray(b) || (!b.outputBlocks && !b.workflowBlocks)) {
        return res.status(400).json({ error: 'config.blocks 须为对象 { outputBlocks?, workflowBlocks? }（至少其一）或 null' });
      } else {
        nextConfig.blocks = sanitizeConfigBlocks(b); // 净化唯一实现 = docs/src/core/config-clean.js（与前端 branch.js 同源）
      }
    }
    if (hasWorkforce) {
      const wf = cfg.workforce;
      if (wf === null) {
        nextConfig.workforce = null; // 恢复默认缺省分工（SOP 责任人列）
      } else if (!wf || typeof wf !== 'object' || Array.isArray(wf)) {
        return res.status(400).json({ error: 'config.workforce 须为对象 { moduleId: { ownerType, ownerId } } 或 null' });
      } else {
        nextConfig.workforce = sanitizeConfigWorkforce(wf); // 净化唯一实现 = docs/src/core/config-clean.js（与前端 branch.js 同源）
      }
    }
    if (hasOrg) {
      // 组织档案域（headerTitle/desc/themePreset）：净化单一实现 = config-clean sanitizeConfigOrg
      const orgClean = sanitizeConfigOrg(cfg);
      if (Object.prototype.hasOwnProperty.call(orgClean, 'headerTitle')) nextConfig.headerTitle = orgClean.headerTitle;
      if (Object.prototype.hasOwnProperty.call(orgClean, 'desc')) nextConfig.desc = orgClean.desc;
      if (Object.prototype.hasOwnProperty.call(orgClean, 'themePreset')) nextConfig.themePreset = orgClean.themePreset;
      // headerTitle 不允许清空（空串净化时被丢弃）→ 写空回退支部名
      if (nextConfig.headerTitle === undefined && cfg.headerTitle !== undefined) nextConfig.headerTitle = branch.name || '';
    }
    if (hasPolicy) {
      // 批4 域参数：与前端 branch.js savePolicyOverrides 同语义（节=null 删除该节覆盖；净化唯一实现 =
      // config-clean sanitizeConfigPolicyOverrides；白名单节校验 POLICY_OVERRIDE_SECTIONS）。
      const p = cfg.policyOverrides;
      const prevPo = (prevConfig.policyOverrides && typeof prevConfig.policyOverrides === 'object' && !Array.isArray(prevConfig.policyOverrides))
        ? JSON.parse(JSON.stringify(prevConfig.policyOverrides))
        : {};
      const nextPo = { ...prevPo };
      if (!fullRights) {
        // 域负责人：只允许声明自己域节（null=恢复该域默认）
        if (p === null || p === undefined || typeof p !== 'object' || Array.isArray(p)
          || !Object.prototype.hasOwnProperty.call(p, domainSection)
          || Object.keys(p).some(k => k !== domainSection)) {
          return res.status(400).json({ error: `域负责人仅可配置本域参数（policyOverrides.${domainSection}，或置 null 恢复该域默认）` });
        }
      }
      if (p === null) {
        nextConfig.policyOverrides = null; // 全量恢复默认（仅支书/副支书/党委）
      } else if (typeof p !== 'object' || Array.isArray(p)) {
        return res.status(400).json({ error: 'config.policyOverrides 须为对象（节 → 值/null）或 null' });
      } else {
        for (const sec of Object.keys(p)) {
          if (!POLICY_OVERRIDE_SECTIONS.includes(sec)) continue; // 白名单外节忽略
          if (!fullRights && sec !== domainSection) continue;     // 域负责人收窄（前述 400 已兜底）
          if (p[sec] === null) {
            if (Object.prototype.hasOwnProperty.call(nextPo, sec)) delete nextPo[sec];
            continue;
          }
          const clean = sanitizeConfigPolicyOverrides({ [sec]: p[sec] });
          if (!clean || !clean[sec]) continue; // 全非法/空 → 该节不写
          nextPo[sec] = clean[sec];
        }
        nextConfig.policyOverrides = Object.keys(nextPo).length ? nextPo : null;
      }
    }

    // 配置变更留痕（2026-09-06 支书 R4：即时生效 + 留痕；低频可回滚，不设审批闸）
    // 逐键 diff prevConfig → nextConfig，有实质变化才追加 {by,at,what,from,to,why?}；空变化不产生冗余条目。
    // 2026-09-09 审计内核：body.why=依据/出处（可选，来源页回填如 REVIEW_QUEUE 附录编号）落到留痕行；
    // 历史保留最近 CONFIG_HISTORY_MAX 条（追加即裁剪最早）。
    const whyRaw = req.body && req.body.why;
    const why = typeof whyRaw === 'string' && whyRaw.trim() ? whyRaw.trim() : undefined;
    const history = Array.isArray(prevConfig.configChangeHistory) ? [...prevConfig.configChangeHistory] : [];
    const at = new Date().toISOString();
    const jsonEq = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
    for (const k of CONFIG_ROLLBACK_KEYS) {
      if (!jsonEq(prevConfig[k], nextConfig[k])) {
        const row = { by: actor.id, at, what: k, from: prevConfig[k] ?? null, to: nextConfig[k] ?? null };
        if (why !== undefined) row.why = why;
        history.push(row);
      }
    }
    nextConfig.configChangeHistory = history.length > CONFIG_HISTORY_MAX ? history.slice(-CONFIG_HISTORY_MAX) : history;

    branch.config = nextConfig;
    db.prepare('UPDATE branches SET data = ? WHERE id = ?').run(JSON.stringify(branch), branch.id);
    res.json(branch);
  });

  // ── 配置单键回滚（2026-09-09 支书批「审计内核」B2：与前端 branch.js rollbackBranchConfig 同源）────────
  // PATCH /branches/:id/config/rollback —— body：{ targetEntryAt?, index?, why? }（定位二选一；
  // targetEntryAt=留痕条目 at；index=历史数组序号 0 起）。语义：定位一条单键变更 → 将其 to→from
  // 写回该配置键（跨键不动）→ 追加 { what:'rollback', from:回滚前该键现值, to:回滚值, by, why? } → 裁剪至上限。
  // 角色门（与 PATCH /branches/:id/config 同口径）：party-staff / 本支部现任支书 / 本副支书（同支部）。
  router.patch('/branches/:id/config/rollback', requireAuth(db), (req, res) => {
    const actor = req.actor;
    if (!actor) return res.status(401).json({ error: '未登录' });
    const row = db.prepare('SELECT data FROM branches WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: '支部不存在' });
    const branch = JSON.parse(row.data);
    const isStaff = actor.role === 'party-staff';
    const isSecretary = !!branch.secretaryId && actor.id === branch.secretaryId;
    const isDeputyHere = actor.role === 'deputy-secretary' && (actor.branchId || 'br-b1') === branch.id;
    if (!(isStaff || isSecretary || isDeputyHere)) {
      return res.status(403).json({ error: '无权限：仅本支部现任支书/副支书或党委组织员可回滚配置' });
    }
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const history = Array.isArray(branch.config && branch.config.configChangeHistory)
      ? [...branch.config.configChangeHistory]
      : [];
    let entry = null;
    if (typeof body.targetEntryAt === 'string' && body.targetEntryAt) {
      entry = history.find((e) => e && e.at === body.targetEntryAt) || null;
    } else if (Number.isInteger(body.index) && body.index >= 0 && body.index < history.length) {
      entry = history[body.index];
    }
    if (!entry) {
      return res.status(400).json({ error: '未找到该条变更记录（须提供 targetEntryAt 或 index）' });
    }
    if (!CONFIG_ROLLBACK_KEYS.includes(entry.what)) {
      return res.status(400).json({ error: `该条为「${entry.what}」留痕（跨键/聚合/回滚），不支持单键回滚` });
    }
    const revert = entry.from === undefined ? null : entry.from;
    const liveVal = (branch.config || {})[entry.what] ?? null; // 回滚前该键实际现值（留痕 from 口径）
    const at = new Date().toISOString();
    const whyRaw = body.why;
    const why = typeof whyRaw === 'string' && whyRaw.trim() ? whyRaw.trim() : undefined;
    const rbRow = { by: actor.id, at, what: CONFIG_ROLLBACK_WHAT, from: liveVal, to: revert ?? null };
    if (why !== undefined) rbRow.why = why;
    history.push(rbRow);
    const nextConfig = {
      ...(branch.config || {}),
      [entry.what]: revert,
      configChangeHistory: history.length > CONFIG_HISTORY_MAX ? history.slice(-CONFIG_HISTORY_MAX) : history,
    };
    branch.config = nextConfig;
    db.prepare('UPDATE branches SET data = ? WHERE id = ?').run(JSON.stringify(branch), branch.id);
    res.json(branch);
  });

  // ════════════════════════════════════════════════════════════════
  //  意见反馈（真匿名）语义端点（2026-09-12 支书裁定）
  //  · GET  /api/v1/issues      公开读（处置结果公开可见，所有人可见）
  //  · POST /api/v1/issues      登录用户可提交；落库字段白名单，绝不存可反查提交人的字段
  //  · PATCH /api/v1/issues/:id 处置/回复沿用既有口径（仅支书）
  //  防刷（真匿名下唯一手段）：客户端随机 token → 服务端仅存 tokenHash，仅用于判重/频率限制，
  //  不含 personId、不可反查人（哈希算法与前端同源 = constants.hashSubmitterToken）。
  // ════════════════════════════════════════════════════════════════
  const SECRETARY_SET = new Set(SECRETARY_ROLES);
  // 历史数据迁移：读取/回写时清理既有记录的 _realPersonId（保留其余内容）
  const sanitizeIssue = (rec) => {
    if (rec && typeof rec === 'object') delete rec._realPersonId;
    return rec;
  };
  const listIssues = () => listTable(db, 'issues').map(sanitizeIssue);
  // 处置可写字段白名单（不可写 submittedBy/anonymous/tokenHash/id/number/title/body/scope/types 等身份与内容字段）
  const ISSUE_MUTABLE_KEYS = [
    'status', 'closedReason', 'closedAt', 'assignee', 'assigneeRole', 'dispatchHistory',
    'comments', 'commentCount', 'participants', 'hidden', 'mergedInto', 'resultPending', 'milestone',
  ];
  const RATE_WINDOW_MS = 10 * 60 * 1000; // 频率窗口
  const RATE_MAX = 20;                   // 窗口内同 tokenHash 最大提交数
  const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 判重窗口

  router.get('/issues', (req, res) => res.json(listIssues()));

  router.post('/issues', requireAuth(db), (req, res) => {
    const actor = req.actor;
    if (!actor) return res.status(401).json({ error: '未登录' });
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const text = typeof body.body === 'string' ? body.body.trim() : '';
    const scope = typeof body.scope === 'string' ? body.scope.trim() : '';
    const types = Array.isArray(body.types) ? body.types.filter((t) => typeof t === 'string') : [];
    if (!title) return res.status(400).json({ error: '标题不能为空' });
    if (!text) return res.status(400).json({ error: '正文不能为空' });
    if (!scope) return res.status(400).json({ error: '范围不能为空' });
    if (types.length === 0) return res.status(400).json({ error: '至少选择一个类型' });
    const anonymous = body.anonymous !== false; // 缺省匿名（与前端开关默认一致）
    // 客户端随机 token（不可由 personId 推导）；缺省则服务端随机化（不与他人共享哈希）
    const rawToken = (typeof body.submitterToken === 'string' && body.submitterToken) ? body.submitterToken : randomUUID();
    const tokenHash = hashSubmitterToken(rawToken);
    const now = new Date();
    const nowMs = now.getTime();

    // 防刷：仅按 tokenHash 判重/限频（不含 personId，不可反查人）
    const all = listTable(db, 'issues');
    const recent = all.filter((r) => r.tokenHash === tokenHash && (nowMs - Date.parse(r.createdAt || r.submittedAt || 0)) < RATE_WINDOW_MS);
    if (recent.length >= RATE_MAX) return res.status(429).json({ error: '提交过于频繁，请稍后再试' });
    const isDup = recent.some((r) => r.title === title && r.body === text && (nowMs - Date.parse(r.createdAt || r.submittedAt || 0)) < DEDUP_WINDOW_MS);
    if (isDup) return res.status(409).json({ error: '重复提交（内容与近期提交相同）' });

    const number = all.reduce((m, r) => Math.max(m, r.number || 0), 0) + 1;
    const id = 'issue-' + randomUUID().slice(0, 8);
    // 落库白名单：匿名 → submittedBy='匿名' 且 participants 为空；实名 → 按现口径记 actor.id
    const record = {
      id,
      number,
      title,
      body: text,
      scope,
      types,
      status: 'open',
      closedReason: null,
      closedAt: null,
      submittedBy: anonymous ? '匿名' : actor.id,
      anonymous,
      submittedAt: now.toISOString().slice(0, 10),
      createdAt: now.toISOString(),
      assignee: null,
      assigneeRole: null,
      dispatchHistory: [],
      milestone: null,
      hidden: false,
      mergedInto: null,
      resultPending: false,
      reactions: { thumbsUp: [], thumbsDown: [], eyes: [], hooray: [] },
      mentions: [],
      references: [],
      comments: [],
      participants: anonymous ? [] : [actor.id],
      commentCount: 0,
      tokenHash, // 仅判重/限频用；不含 personId，不可反查提交人
    };
    db.prepare('INSERT OR REPLACE INTO issues (id, data) VALUES (?, ?)').run(id, JSON.stringify(record));
    res.status(201).json(sanitizeIssue(record));
  });

  // 处置/回复（仅支书，沿用既有口径）：白名单字段局部合并；处置结果随公开 issue 一并可见
  router.patch('/issues/:id', requireRole(db, SECRETARY_SET), (req, res) => {
    const row = db.prepare('SELECT data FROM issues WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'not found' });
    const issue = sanitizeIssue(JSON.parse(row.data));
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    for (const k of ISSUE_MUTABLE_KEYS) {
      if (Object.prototype.hasOwnProperty.call(body, k)) issue[k] = body[k];
    }
    db.prepare('INSERT OR REPLACE INTO issues (id, data) VALUES (?, ?)').run(issue.id, JSON.stringify(issue));
    res.json(sanitizeIssue(issue));
  });

  return router;
}
