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
// 2026-09-09 审计内核：历史上限/单键回滚白名单/回滚标记单一源同 import（与前端 branch.js 防止未同步的情况）
import { sanitizeConfigModules, sanitizeConfigBlocks, sanitizeConfigWorkforce, sanitizeConfigOrg, sanitizeConfigPolicyOverrides, CONFIG_HISTORY_MAX, CONFIG_ROLLBACK_WHAT, CONFIG_ROLLBACK_KEYS } from '../../docs/src/core/config-clean.js';
// 批4（2026-09-09 支书批「域参数」）：policyOverrides 顶层节白名单（server 写口与前端 branch.js 同源校验）
import { POLICY_OVERRIDE_SECTIONS } from '../../docs/src/core/policy-defaults.js';
// P2c（2026-09-03）：授权语义角色集单一源 = docs/src/core/constants.js（勿手写）
import { BRANCH_COMMISSION_ROLES, PARTY_STAFF_ROLE as PARTY_STAFF_KEYS, SECRETARY_AND_DEPUTY_ROLES, NOTICE_PUBLISH_ROLES, NOTICE_MANAGE_ROLES, MEMBER_FLOW_ROLES, hashSubmitterToken, isAnonymousForced } from '../../docs/src/core/constants.js';

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
  // 2026-09-14 批次 25：党小组一等实体（支书特批；写门 = secretary，见 RESOURCE_WRITE_GATE）
  partyGroups: 'party_groups',
  // 2026-09-14 批次 25：成员流动台账（写门 = 组织委员 + 支书/副支书，见 RESOURCE_WRITE_GATE）
  memberFlows: 'member_flows',
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
// 2026-09-14 批次 25：党小组管理角色集（支书含副支书）单一源 = constants.js::SECRETARY_AND_DEPUTY_ROLES（勿手写）
const SECRETARY_AND_DEPUTY_ROLE_SET = new Set(SECRETARY_AND_DEPUTY_ROLES);
// 2026-09-14 批次 25：成员流动登记角色集（组织委员 + 支书/副支书）单一源 = constants.js::MEMBER_FLOW_ROLES
const MEMBER_FLOW_ROLE_SET = new Set(MEMBER_FLOW_ROLES);
const RESOURCE_WRITE_GATE = {
  branches: 'party-staff',
  appointmentRecords: 'party-staff',
  users: 'party-staff',
  reviewRequests: { post: 'branch-committee', patch: 'party-staff', delete: 'party-staff' },
  // 通知（2026-09-13 dogfood 权限专项）：发布=支书/副支书/组织/宣传，管理（编辑/删除）=发布者+纪检；
  // 角色名单单一源 = constants.js::NOTICE_PUBLISH_ROLES / NOTICE_MANAGE_ROLES（与前端 NoticePermission 同源）
  notices: { post: 'notice-publish', patch: 'notice-manage', delete: 'notice-manage' },
  // 党小组（2026-09-14 批次 25 支书裁定）：管理（建/改组/解散/归组）仅限支书（含副支书）
  partyGroups: 'secretary',
  // 成员流动台账（2026-09-14 批次 25 支书裁定）：流入/流出登记 = 组织委员 + 支书/副支书
  memberFlows: 'member-flow',
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
  // 党小组管理：仅支书（含副支书）——角色名单单一源 constants.js::SECRETARY_AND_DEPUTY_ROLES
  if (need === 'secretary') return !!actor && SECRETARY_AND_DEPUTY_ROLE_SET.has(actor.role);
  // 成员流动登记：组织委员 + 支书/副支书——单一源 constants.js::MEMBER_FLOW_ROLES（勿手写）
  if (need === 'member-flow') return !!actor && MEMBER_FLOW_ROLE_SET.has(actor.role);
  return true;
}

/** 写门 403 文案（按资源给可懂原因，勿用一句万金油） */
function _writeDenyMsg(name) {
  if (name === 'notices') {
    return '无权限：通知发布仅限支书/副支书/组织委员/宣传委员，编辑与删除另含纪检委员';
  }
  if (name === 'partyGroups') {
    return '党小组管理仅限支书（含副支书）';
  }
  if (name === 'memberFlows') {
    return '无权限：成员流入/流出登记仅限组织委员或支书/副支书';
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
  externalDispatches: 'ed',
  actSubRecords: 'asr', tfSubRecords: 'tfs',
  branchDocs: 'bd',
  branches: 'br',
  appointmentRecords: 'appt',
  reviewRequests: 'rq',
  thoughtReports: 'tr',
  // 2026-09-14 批次 25：党小组（id 形态 pg-<uuid>，与前端 generateId('pg','-') 对齐）
  partyGroups: 'pg',
  // 2026-09-14 批次 25：成员流动台账（id 形态 mf-<uuid>，与前端 generateId('mf','-') 对齐）
  memberFlows: 'mf',
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

  // ── 读口收紧（2026-09-18 批次 81；支书 2026-09-18 裁定「授权收紧」）──────────────
  // 病灶（批次 80 实测）：未登录 GET 30 张资源表一律 200，`users`（含姓名/学号/角色/联系方式）
  //   可被全量列举。裁定：**默认要登录**，**只给「明写公开」的留白名单**（宁严勿松）。
  // 白名单口径＝「**有明确裁定公开的才公开**」：现**只有 `issues`** —— 它是本文件下游的语义端点
  //   （见本文件意见反馈一节注释原文「GET /api/v1/issues 公开读（处置结果公开可见，所有人可见）」），
  //   且**不走在下方循环里**，故本循环的白名单集合当前为空集也正确；保留该集合是为了让
  //   「哪几张放行」在代码里显式可见（改口径时只动这一处）。
  // **不放行 `branches`**：批次 80 对它的判断标注为「判断存疑」⇒ 本批按「不放行」处理。
  const PUBLIC_READ = new Set(['issues']);
  // 每个资源 GET list
  for (const [name, table] of Object.entries(RESOURCE_TABLES)) {
    const readAuth = PUBLIC_READ.has(name) ? [] : [requireAuth(db)];
    router.get(`/${name}`, ...readAuth, (req, res) => res.json(listTable(db, table)));
  }

  // 资源级 CRUD（2026-08-06 扎口修复 Z2：此前前端 ApiAdapter 暴露的
  // create/update/delete/archive/brand 接口在服务端全部 404，属「未扎口的假接口」。
  // 现补齐 POST/PATCH/DELETE，使 ApiAdapter 接口完整可用）
  // 需支委写权限的资源（写入/删除均需支委身份，如支部文件）
  // 2026-09-21 批次 120：`fileSpaceRecords` / `imageRecords` 一并纳入——这两张表是**上传口的元数据写口**
  // （写入方与 `POST /api/v1/uploads` 是同一批人：宣传委员，见 `archive-tab.js` 的上传材料链与本批照片墙）。
  // 原状是「仅 requireAuth」⇒ 任一登录成员可直连塞入图片/文件记录（`D-448` ④ 越权取用，批次 80 审计实测
  // **未登录即可列举**、任一登录成员可写；`SOP-B-40` 第 4 项登记项，本批随照片墙一并收口）。
  // 未登录/非支委层一律 403；读口仍按 `PUBLIC_READ` 之外的 requireAuth 口径（未改）。
  const COMMISSIONER_WRITE = new Set(['branchDocs', 'fileSpaceRecords', 'imageRecords']);
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
        // 活动写门：非支委层拒；组长限党小组会/主题党日（批准门开启档时直建的写入态见文件末 `_activityCreateGatePatch`）
        if (name === 'activities' && !_assertActivityWrite(req.actor, row.type)) {
          return res.status(403).json({ error: ACTIVITY_WRITE_DENY_MSG });
        }
        // 计票方式强制校验（仅活动）：正式表决不得写 named
        if (name === 'activities') {
          const ballotErr = _ballotModeReject(row.voteConfig);
          if (ballotErr) return res.status(400).json({ error: ballotErr });
        }
        const id = row.id || `${ID_PREFIX[name] || 'x'}-${randomUUID().slice(0, 8)}`;
        const data = { ...row, ...(name === 'activities' ? _activityCreateGatePatch(db, req.actor) : null), id };
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
      // 活动写门：按「本次改后的类型」判定（未携带 type 时取既有类型）；批准门状态转移门（批次 151）叠加其后
      if (name === 'activities') {
        const prevRow = JSON.parse(existing.data);
        const effType = (req.body && req.body.type) || prevRow.type;
        const gateDeny = _assertActivityWrite(req.actor, effType) ? _activityApprovalGateDeny(prevRow, req.body, req.actor) : ACTIVITY_WRITE_DENY_MSG;
        if (gateDeny) return res.status(403).json({ error: gateDeny });
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
  // 双形态一致性由 server/test/empty-template.test.mjs ⑤ 断言守护（防止两端未同步的情况）。
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

  // 活动归档特例（与前端 BranchService.archiveActivity 语义对齐）
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

  router.post('/activities/:id/brand', requireRole(db, BRANCH_COMMITTEE_ROLES), (req, res) => { // 品牌认定**取消**口（2026-09-21 批次 132 · 支书口径二）：**只能取消、不能认定**——认定唯一入口＝支委会议程项「记录结果 · 通过」（services/agenda-follow-up.js 的 brand-designation 分支）；原文「任一登录用户 POST 即翻转 isBrand」＝「点一下即认定」的后门，本批收掉（门收支委层 / 非品牌态 400 / 取消留痕）
    const existing = db.prepare('SELECT data FROM activities WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'not found' });
    const current = JSON.parse(existing.data);
    if (current.isBrand !== true) return res.status(400).json({ error: '该活动当前不是品牌活动——品牌认定须经支委会审议通过（提案 → 支委会通过后确定）' });
    const act = { ...current, id: req.params.id, isBrand: false, brandRevokedBy: (req.actor && req.actor.id) || null, brandRevokedAt: new Date().toISOString() };
    db.prepare('INSERT OR REPLACE INTO activities (id, data) VALUES (?, ?)').run(req.params.id, JSON.stringify(act));
    res.json(act);
  });

  // 全量引导：一次拉取全部资源（供外部对接/测试；前端 init() 实走逐表读口，不走本口）
  // 2026-09-18 批次 81：本口与逐表读等价（一次给全 30 张表）⇒ **与逐表同门 requireAuth**；
  //   否则「逐表收紧」形同虚设（未登录改调本口即可拿到同一份数据）。
  router.get('/bootstrap', requireAuth(db), (req, res) => {
    const out = {};
    for (const [name, table] of Object.entries(RESOURCE_TABLES)) {
      out[name] = listTable(db, table);
    }
    res.json(out);
  });

  // 全量快照写穿透：认证后整表替换（data-adapter persist() 的落库目标）
  // 2026-09-01：支持 gzip 压缩体（前端 CompressionStream 压缩，规避大 payload 传输限制）；
  // 兼容未压缩 JSON（server-base.test.mjs 等直连用例；批次 48 由 snapshot.test.js 等五件合并而来）。
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
    const snapshotDeny = _snapshotActivityApprovalGateDeny(db, payload, req.actor);
    if (snapshotDeny) return res.status(403).json({ error: snapshotDeny });
    for (const [name, table] of Object.entries(RESOURCE_TABLES)) {
      if (Array.isArray(payload[name])) replaceCollection(db, table, payload[name]);
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
  //  意见反馈语义端点（2026-09-12 首裁「真匿名」→ **2026-09-17 支书改裁**）
  //  · GET  /api/v1/issues          公开读（处置结果公开可见，所有人可见）——**一律脱敏，不含提交人**
  //  · POST /api/v1/issues          登录用户可提交；**匿名亦落库真实提交人**
  //  · PATCH /api/v1/issues/:id     处置/回复＝**支委会**（支委层；2026-09-21 批次 126 · `D-550` 由「仅支书」放开）——**处置人也看不到提交人**
  //  · GET  /api/v1/issues/reveal   **仅党委（party-staff）**：可看匿名反馈的真实提交人，**每次查看留痕**
  //  ── 口径变更依据（支书 2026-09-17 原话）：「**后台记录真实情况，匿名是前端的。但是我们也强调清楚，
  //     查看匿名的权限只有党委有。**」 ──
  //  · 匿名 = **前端展示层匿名**：后台记真实提交人（`_realPersonId`），前端与一切常规读出口都看不出是谁。
  //  · **可见范围＝仅党委**：支书**不可见**——「处置」与「查看真身」是**两项分开的权限**，
  //    不能因为支书有处置权就顺带把真身给他（这正是本次改裁与旧实现「仅支书可追溯」的关键差别）。
  //  · **适用范围（重要）**：本改裁**只落在意见反馈一处**。「正式表决无记名」**维持 2026-09-12 原裁定不变**
  //    （两段式：参与记录 + tally，**逐人选项不落库**）——支书同日就「无记名表决是否一并改」单独裁定为
  //    「**表决保持真无记名**」⇒ 那句「对所有匿名都成立」在**表决**这一处**由支书本人豁免**。
  //  · 防刷：仍**只按 tokenHash** 判重/限频（与 personId 无关），与「后台记真身」互不影响。
  //  · 支部归属（2026-09-15 裁定）：写入取 actor.branchId（缺省 'br-b1'）；读取过滤在前端 withinBranch。
  // ════════════════════════════════════════════════════════════════
  const ISSUE_DISPOSITION_SET = new Set(BRANCH_COMMISSION_ROLES); // 意见处置＝支委会（支委层；2026-09-21 批次 126 · D-550：原为 new Set(SECRETARY_ROLES) 仅支书）
  // 真身同族键：任何常规读出口都不得带出
  const ISSUE_IDENTITY_KEYS = ['_realPersonId', 'realPersonId', 'submitterId'];
  // **脱敏序列化（默认出口）**：拷贝后剥掉真身键。**一切常规读（公开 / 支书 / 提交回执 / 处置回执）都走它**。
  // ⚠ 2026-09-17 改裁前，本函数是「读取/回写时清理既有记录的 `_realPersonId`」（历史数据迁移，删了就没了）；
  //   改裁后改为**只剥不外泄、不回写**——库里要留真身，出口要脱敏，两者从此分开。
  const sanitizeIssue = (rec) => {
    if (!rec || typeof rec !== 'object') return rec;
    const out = { ...rec };
    for (const k of ISSUE_IDENTITY_KEYS) delete out[k];
    return out;
  };
  const listIssues = () => listTable(db, 'issues').map(sanitizeIssue);
  // **留痕序列化（唯一例外）**：只给党委出口用。**不得用于任何其他路由**。
  const revealIssue = (rec) => {
    const out = sanitizeIssue(rec);
    out.realPersonId = (rec && rec._realPersonId) || null;
    return out;
  };
  // 处置可写字段白名单（不可写 submittedBy/anonymous/tokenHash/id/number/title/body/scope/types 等身份与内容字段）
  const ISSUE_MUTABLE_KEYS = [
    'status', 'closedReason', 'closedAt', 'assignee', 'assigneeRole', 'dispatchHistory',
    'comments', 'commentCount', 'participants', 'hidden', 'mergedInto', 'resultPending', 'milestone',
  ];
  const RATE_WINDOW_MS = 10 * 60 * 1000; // 频率窗口
  const RATE_MAX = 20;                   // 窗口内同 tokenHash 最大提交数
  const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 判重窗口

  router.get('/issues', (req, res) => res.json(listIssues()));

  // **仅党委**：查看匿名反馈的真实提交人（2026-09-17 支书改裁）。**每次查看留痕**（AI 建议、无异议即执行）：
  //  留痕的意义＝「**只有党委能看**」这条承诺**可被事后核对**（否则「只有党委能看」只是一句声明，
  //  没有任何东西能证伪它）。留痕表见 server/db.js 的 RESOURCE_TABLES（issue_reveals）。
  router.get('/issues/reveal', requireAuth(db), (req, res) => {
    const actor = req.actor;
    if (!actor) return res.status(401).json({ error: '未登录' });
    if (!PARTY_STAFF_ROLE.has(actor.role)) {
      return res.status(403).json({ error: '仅党委可查看匿名反馈的真实提交人' });
    }
    const rows = listTable(db, 'issues').map(revealIssue);
    const at = new Date().toISOString();
    const traceId = 'reveal-' + randomUUID().slice(0, 8);
    db.prepare('INSERT OR REPLACE INTO issue_reveals (id, data) VALUES (?, ?)').run(
      traceId,
      JSON.stringify({
        id: traceId,
        by: actor.id,
        byRole: actor.role,
        at,
        // 留痕记「看了哪些**匿名**条目」——实名条目的真身本就公开，不计入
        revealedIds: rows.filter((r) => r.anonymous).map((r) => r.id),
      }),
    );
    res.json(rows);
  });

  router.post('/issues', requireAuth(db), (req, res) => {
    const actor = req.actor;
    if (!actor) return res.status(401).json({ error: '未登录' });
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const text = typeof body.body === 'string' ? body.body.trim() : '';
    const scope = typeof body.scope === 'string' ? body.scope.trim() : '';
    const types = Array.isArray(body.types) ? body.types.filter((t) => typeof t === 'string') : []; const domain = typeof body.domain === 'string' ? body.domain.trim() : ''; // 事项领域（SOP-B-32 甲档／2026-09-21 批次 126）：选填不设硬校验（兼容既有调用），表单侧必填
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
    // 支部归属（每个组织独立 issue 空间，2026-09-15 支书裁定）：服务端权威取登录人所属支部，
    // 不采信客户端自述（防伪造跨支部）；无支部/党委级人员 → 部署默认支部 'br-b1'
    //（与前端 services/issues.js 写入口径 getBranchIdOfPerson / 读过滤 withinBranch 同源）。
    const branchId = actor.branchId || 'br-b1';
    // 落库白名单：匿名 → submittedBy='匿名' 且 participants 为空，**但落真实提交人 `_realPersonId`**
    //（2026-09-17 支书改裁「后台记录真实情况」）；实名 → 按现口径记 actor.id（真身即 submittedBy，不重复存）
    const record = {
      id,
      number,
      branchId,
      title,
      body: text,
      scope,
      types, domain,
      status: 'open',
      closedReason: null,
      closedAt: null,
      submittedBy: anonymous ? '匿名' : actor.id,
      anonymous,
      ...(anonymous ? { _realPersonId: actor.id } : {}),
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
      // 仅判重/限频用（与 personId 无关、不可反推人）。⚠ 2026-09-17 后**不再等于「本条不含身份」**——
      // 真身在 `_realPersonId`（匿名时才落）；防刷仍只认 tokenHash，两条线互不影响。
      tokenHash,
    };
    db.prepare('INSERT OR REPLACE INTO issues (id, data) VALUES (?, ?)').run(id, JSON.stringify(record));
    res.status(201).json(sanitizeIssue(record));
  });

  // 处置/回复（支委会＝支委层；2026-09-21 批次 126 · D-550 由「仅支书」放开）：白名单字段局部合并；处置结果随公开 issue 一并可见
  // ⚠ 2026-09-17 批次 51 修一处**会抹掉匿名真身**的缺陷：本路由原先读记录时先过 `sanitizeIssue`
  //   （它剥掉 `_realPersonId`）再把整个对象 `INSERT OR REPLACE` 写回 ⇒ **支书每处置一次（指派 / 关闭 /
  //   评论 / 合并），库里那条匿名反馈的真实提交人就永久没了**，而该路由的注释还自称「只剥不外泄、不回写」。
  //   修法：**读原始记录 → 只合并白名单字段 → 原样写回**；脱敏**只发生在出口**（`res.json`）。
  //   ——这与本批 R-80 是同一族：「**有一个出口脱敏，就要有一个写口保证不顺手把库里的东西擦掉**」。
  router.patch('/issues/:id', requireRole(db, ISSUE_DISPOSITION_SET), (req, res) => {
    const row = db.prepare('SELECT data FROM issues WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'not found' });
    const issue = JSON.parse(row.data); // 原始记录（含真身键，不得在此脱敏）
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    for (const k of ISSUE_MUTABLE_KEYS) {
      if (Object.prototype.hasOwnProperty.call(body, k)) issue[k] = body[k];
    }
    db.prepare('INSERT OR REPLACE INTO issues (id, data) VALUES (?, ?)').run(issue.id, JSON.stringify(issue));
    res.json(sanitizeIssue(issue));
  });

  return router;
}

// ════════════════════════════════════════════════════════════════
//  活动批准门的**服务端**状态转移门（2026-09-22 批次 151 · 支书裁定「加一道」）
// ════════════════════════════════════════════════════════════════
// 支书裁定（2026-09-22，逐字）：「加一道（推荐）」——选项说明逐字：「现在"只在前端判状态"，直调 API 可以
//   绕过这道门（数据能对上，但不严谨）。」
// 为什么落在**既有 PATCH 上判状态转移**（而不另开专用审批端点）：前端写入链早已收敛到
//   `docs/src/services/activity.js::approveActivity / rejectActivity` 两枚写口（二者产出的补丁天然带
//   `status` ＋ `approval` 语义）⇒ 在 PATCH 上加一条**状态转移判据**即可一一对应、不必新增端点与适配器方法；
//   且门是**叠加**在既有角色门之后的第二道（角色门答「谁能写活动」，本门答「谁能把待批改成已发布/已取消」）。
// 判据（单一源＝`docs/src/services/activity.js::canApproveActivity` / `PENDING_APPROVAL_STATUS`，勿在此另写）：
//   · 既有行**不是** `pending-approval` ⇒ 不拦（本门只管批准门这道关）；
//   · 补丁仍把状态留在 `pending-approval` ⇒ 不拦（没改状态）；
//   · 离开待批态 ⇒ 必须**带批准语义**（发布＝`approval.state='approved'`；终止＝`'rejected'`）**且**写者角色
//     符合**该活动上固化的档位**（`prevRow.approval.mode`，不采信补丁自述的 `mode`——否则持支委身份者可
//     自选「支委会」档把自己那一票放行）——否则 403。
// ⚠ **批次 152 已收口**：`POST /api/v1/snapshot`（整表写穿）与 `POST /api/v1/activities`（直建）两条绕行路径
//   已按支书 2026-09-22 裁定「一并堵上」处置，见文末「活动批准门的两条绕行路径收口」段（快照口**只拦状态迁移**、
//   其余整表写入照旧放行）。
// ⚠ 本块（含 import）置于文件末尾：**不改动上文任何行号**——README-server.md 里有 380 处 `文件:行号` 引用
//   指向本文件（`doc-line-ref` 守卫逐条核），插入一行即整段漂移；ESM 的 import 声明在模块顶层任意位置均被提升，
//   置末尾不影响语义（本项目既有同法：`services/decision-tree.js` 用动态 import 保行号）。
import { canApproveActivity, PENDING_APPROVAL_STATUS, pendingApprovalPatchOnWrite } from '../../docs/src/services/activity.js';

/** 批准门状态转移拦截文案 */
const ACTIVITY_APPROVAL_TRANSITION_DENY_MSG = '无权限：该活动处于「待批」，不得直接改为发布/取消——须经批准（补丁须携带批准语义 approval.state）';
const ACTIVITY_APPROVAL_ROLE_DENY_MSG = '无权限：当前批准档位下你无权批准/驳回该活动';

/**
 * 批准门状态转移门（**纯判定**）：允许 → null；拦截 → 403 文案。
 * @param {Object} prevRow 既有活动行（未合并前的库内值）
 * @param {Object} body 本次 PATCH 补丁
 * @param {{role?:string}} actor 写者（requireAuth 注入）
 * @returns {string|null}
 */
function _activityApprovalGateDeny(prevRow, body, actor) {
  if (!prevRow || prevRow.status !== PENDING_APPROVAL_STATUS) return null;
  const patch = (body && typeof body === 'object' && !Array.isArray(body)) ? body : {};
  const nextStatus = patch.status !== undefined ? patch.status : prevRow.status;
  if (nextStatus === PENDING_APPROVAL_STATUS) return null;
  const appr = (patch.approval && typeof patch.approval === 'object') ? patch.approval : {};
  const hasSemantics = (nextStatus === 'published' && appr.state === 'approved')
    || (nextStatus === 'cancelled' && appr.state === 'rejected');
  if (!hasSemantics) return ACTIVITY_APPROVAL_TRANSITION_DENY_MSG;
  const rowMode = prevRow.approval && prevRow.approval.mode; // 档位以活动上固化的为准（不采信补丁自述）
  if (!canApproveActivity(actor && actor.role, rowMode)) return ACTIVITY_APPROVAL_ROLE_DENY_MSG;
  return null;
}

// ════════════════════════════════════════════════════════════════
//  活动批准门的两条绕行路径收口（2026-09-22 批次 152 · 支书裁定「一并堵上」）
// ════════════════════════════════════════════════════════════════
// 支书裁定（2026-09-22，逐字）：「一并堵上（推荐）」——选项说明逐字：「一并堵上，把这道理做严（现在要绕过还是能绕）。」
// 收口两条（批次 151 如实登记的两处未堵）：
//   ① `POST /api/v1/snapshot`（整表写穿通道）——**只拦「不该发生的状态迁移」**：库内行本是 `pending-approval`、
//      本次快照把它改成 `published`/`cancelled` 而**未携带批准语义**（或写者角色不符合该活动固化的档位）⇒ 403。
//      **其余整表写入一律照旧放行**——这张口是前端全部状态同步的落库目标（`data-adapter.js::persist` →
//      `_flushSnapshot` 的脏集合快照），堵过头会把正常同步打瘫；正常同步里不可能出现「待批→发布」而无批准语义的行。
//      判据**逐行复用上面那道 PATCH 门 `_activityApprovalGateDeny`**（喂「库内行 vs 快照行」），**不另写第二套判据**。
//   ② `POST /api/v1/activities`（直建通道）——**档位开启时**按写入链同一补丁落 `pending-approval`（不再由调用方
//      自定「已发布」）；**档位关闭（默认）时一字不改**（原样写入，零行为变化）。
// 档位／补丁怎么取（与写入链同源）：补丁形状单一源＝`docs/src/services/activity.js::pendingApprovalPatchOnWrite`；
//   档位取值＝该支部 `config.policyOverrides.activityApproval.mode`——与前端读侧注入 `applyBranchPolicyOverrides`
//   落进 `POLICY_DEFAULTS` 的是**同一个白名单键**（`core/policy-defaults.js::POLICY_OVERRIDABLE`），
//   **不在服务端另造档位映射 / 阈值**。
// ⚠ 本段（含上一行 import 的追加）置于文件末尾：不改动上文任何行号（理由同上一段）。

/**
 * 快照口的状态迁移门（**纯判定**）：允许 → null；拦截 → 403 文案。
 * 只管「库内已有且处于待批」的活动行；新建行（创建口见 `_activityCreateGatePatch`）/ 未变行 / 非待批行一律放行。
 * 判据逐行复用 `_activityApprovalGateDeny`（与 PATCH 门同一份，勿另写）。
 * @param {Object} db better-sqlite3 实例
 * @param {Object} payload 快照 payload
 * @param {{role?:string}} actor 写者（requireAuth 注入）
 * @returns {string|null}
 */
function _snapshotActivityApprovalGateDeny(db, payload, actor) {
  const rows = (payload && Array.isArray(payload.activities)) ? payload.activities : null;
  if (!rows) return null;
  const prevById = new Map(listTable(db, 'activities').map(r => [r.id, r]));
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const prevRow = prevById.get(row.id);
    if (!prevRow) continue;
    const deny = _activityApprovalGateDeny(prevRow, row, actor);
    if (deny) return deny;
  }
  return null;
}

/**
 * 直建口的写入态改写（**纯判定**）：档位开启 ⇒ 写入补丁（待批 ＋ 批准轨迹）；关闭 / 非法档 ⇒ null（原样写入）。
 * 档位读该支部 `config.policyOverrides.activityApproval.mode`（支部查不到 → 'off'）；补丁形状取自
 * `activity.js::pendingApprovalPatchOnWrite`（单一源，勿在此另写 `status` / `approval` 字面量）。
 * @param {Object} db better-sqlite3 实例
 * @param {{branchId?:string}} actor 写者
 * @returns {Object|null}
 */
function _activityCreateGatePatch(db, actor) {
  let mode = 'off';
  try {
    const row = db.prepare('SELECT data FROM branches WHERE id = ?').get((actor && actor.branchId) || 'br-b1');
    const cfg = row ? JSON.parse(row.data).config : null;
    mode = (cfg && cfg.policyOverrides && cfg.policyOverrides.activityApproval
      && cfg.policyOverrides.activityApproval.mode) || 'off';
  } catch { mode = 'off'; }
  return pendingApprovalPatchOnWrite(mode);
}
