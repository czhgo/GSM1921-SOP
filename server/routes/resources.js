// server/routes/resources.js — 资源读写 API（list + bootstrap + 资源级 CRUD + snapshot 快照写穿）
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { requireAuth, requireCommissioner, requireRole } from './auth.js';
import { replaceCollectionsAtomic, readCollectionVersions } from '../db.js';
import { deleteUploadedFile } from './uploads.js';
import { afterResourceWrite } from '../services/mailer-hooks.js';
// P1a 单向权威（2026-09-03）：config（modules/blocks）净化唯一实现 = docs/src/core/config-clean.js（前端 branch.js 同源，勿在 server 另写 clean）
// 2026-09-06 换组织向导：config 组织档案字段（headerTitle/desc/themePreset）净化同源
// 2026-09-09 审计内核：历史上限/单键回滚白名单/回滚标记单一源同 import（与前端 branch.js 防止未同步的情况）
import { sanitizeConfigModules, sanitizeConfigBlocks, sanitizeConfigWorkforce, sanitizeConfigOrg, sanitizeConfigPolicyOverrides, CONFIG_HISTORY_MAX, CONFIG_ROLLBACK_WHAT, CONFIG_ROLLBACK_KEYS } from '../../docs/src/core/config-clean.js';
// 批4（2026-09-09 支书批「域参数」）：policyOverrides 顶层节白名单（server 写口与前端 branch.js 同源校验）
import { POLICY_OVERRIDE_SECTIONS } from '../../docs/src/core/policy-defaults.js';
// P2c（2026-09-03）：授权语义角色集单一源 = docs/src/core/constants.js（勿手写）
import { BRANCH_COMMISSION_ROLES, PARTY_STAFF_ROLE as PARTY_STAFF_KEYS, SECRETARY_AND_DEPUTY_ROLES, NOTICE_PUBLISH_ROLES, NOTICE_MANAGE_ROLES, MEMBER_FLOW_ROLES, branchCommissionerWriteDeny, hashSubmitterToken, isAnonymousForced } from '../../docs/src/core/constants.js';

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
  users: { post: 'party-staff', patch: 'branch-commissioner', delete: 'party-staff' },
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
function _assertResourceWrite(actor, name, method, body, targetId, db) {
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
  // 成员流动登记：组织委员 + 支书/副支书——单一源 constants.js::MEMBER_FLOW_ROLES（勿手写）；支委身份配置（users 的 patch 门）见文件末 _branchCommissionerGateDeny
  if (need === 'member-flow') return !!actor && MEMBER_FLOW_ROLE_SET.has(actor.role);
  return need === 'branch-commissioner' ? _branchCommissionerGateDeny(db, actor, targetId, body) === null : true;
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
        if (!_assertResourceWrite(req.actor, name, 'post', req.body, req.params.id, db)) {
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
      if (!_assertResourceWrite(req.actor, name, 'patch', req.body, req.params.id, db)) {
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
      if (!_assertResourceWrite(req.actor, name, 'delete', null, req.params.id, db)) {
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

  // 全量快照写穿透：认证后整表替换（data-adapter persist() 的落库目标）。**P0-1（2026-09-23）**：
  // ① 逐集合乐观锁——payload._versions（集合名→基线版本）与服务端 collection_versions 比对，不一致 ⇒ **409 + conflicts**（不覆盖）；**payload 里出现但 `_versions` 里没有的集合 ⇒ 整批 428（不再无条件写）**。② 全部集合替换 + 版本 +1 在**同一事务**内（要么全成、要么全不动）；带 `_versions` ⇒ 200 + `{versions}`，未带（且 payload 无集合）⇒ 204。
  // 2026-09-01：支持 gzip 压缩体（前端 CompressionStream 压缩，规避大 payload 传输限制）；兼容未压缩 JSON（server-base.test.mjs 等直连用例；批次 48 由 snapshot.test.js 等五件合并而来）。
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
    const baseVersions = _snapshotBaseVersions(payload);
    const missing = _snapshotMissingVersions(payload, baseVersions); if (missing.length) return res.status(428).json({ error: '快照被拒：payload 里的集合未随 `_versions` 给出基线版本（见本文件末「快照写穿的集合版本号协议」）', missingVersions: missing });
    if (baseVersions) { const conflicts = _snapshotVersionConflicts(db, payload, baseVersions); if (conflicts.length) return res.status(409).json({ error: '数据已被他人更新，本次写入未生效（版本冲突，请刷新后重试）', conflicts }); }
    const nextVersions = replaceCollectionsAtomic(db, _snapshotWrites(payload)); return baseVersions ? res.json({ versions: nextVersions }) : res.status(204).end();
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
  // ════════════════════════════════════════════════════════════════
  //  语义端点：三委数据交接 / 成员变更确认队列 / 批次里程碑（2026-09-23 批次 163）
  // ════════════════════════════════════════════════════════════════
  // 由来（支书 2026-09-23 逐字：「我们必须把网页升级成系统！！【浏览器缓存固然有用但不能什么都依靠浏览器缓存！！】」）：
  //   这三域此前**只有浏览器本地一份**——`handoffs` 有本地落盘却不在快照 payload / init 拉取 / 资源名映射里
  //   （api 形态下 `mockDB.handoffs` 恒空、刷新即丢）；成员变更确认队列只存 localStorage 键
  //   `gsm1921-member-confirmations`（清缓存 = 旧版 transferOut 存量请求死锁）；`milestones` 只读静态文件。
  //   现按**语义端点域**模板（同 `agenda_votes`）落服务端表：`server/db.js::SEMANTIC_TABLES` 建表，
  //   前端 `init()` 逐域拉取填充 mockDB 缓存（与 agendaVotes 同一取法）、写口改经本组端点 ⇒ 服务器为权威。
  // 纪律（三条）：① **故意不进快照 payload**——这三域的写口是本组语义端点，若走快照会被 800ms 防抖窗口里的
  //   陈旧缓存覆盖（与 agendaVotes 同理）；② 写门照既有 requireXxx 中间件，角色集一律取 constants.js 单一源；
  //   ③ 表在 `SEMANTIC_TABLES`（独立于 `RESOURCE_TABLES`）⇒ 无通用 CRUD、不参与快照事务。
  // ── 三委数据交接（T-304 C2 §E.2）──
  // 类型元数据单一源 = `docs/src/services/handoff.js::HANDOFF_TYPES`（from/to 由类型派生，**不采信客户端自述**）。
  router.get('/handoffs', requireAuth(db), (req, res) => {
    let rows = listTable(db, 'handoffs');
    if (req.query.to) rows = rows.filter((h) => h.to === req.query.to);
    if (req.query.status) rows = rows.filter((h) => h.status === req.query.status);
    res.json(rows);
  });
  router.post('/handoffs', requireAuth(db), (req, res) => {
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const meta = HANDOFF_TYPES_SRC[body.type];
    if (!meta) return res.status(400).json({ error: '未知交接类型' });
    if (req.actor.role !== meta.from) return res.status(403).json({ error: '无权限：本类数据交接须由发起方角色发起' });
    const id = body.id ? String(body.id) : `ho-${randomUUID().slice(0, 8)}`;
    if (db.prepare('SELECT id FROM handoffs WHERE id = ?').get(id)) return res.status(409).json({ error: '该交接 id 已存在' });
    const row = {
      id,
      type: body.type,
      from: meta.from,
      to: meta.to,
      refType: String(body.refType || ''),
      refLabel: String(body.refLabel || ''),
      refId: String(body.refId || ''),
      note: typeof body.note === 'string' ? body.note : '',
      status: 'pending',
      createdAt: body.createdAt || new Date().toISOString(),
      confirmedAt: null,
      confirmedBy: null,
    };
    writeRow(db, 'handoffs', row);
    res.status(201).json(row);
  });
  // 接收方确认（销项状态落库）：仅该行的 `to` 角色可确认；非 pending ⇒ 幂等原样返回
  router.post('/handoffs/:id/confirm', requireAuth(db), (req, res) => {
    const row = getRow(db, 'handoffs', req.params.id);
    if (!row) return res.status(404).json({ error: '交接记录不存在' });
    if (row.to !== req.actor.role) return res.status(403).json({ error: '无权限：仅接收方可确认该交接' });
    if (row.status !== 'pending') return res.json(row);
    const next = { ...row, status: 'done', confirmedAt: new Date().toISOString(), confirmedBy: req.actor.role };
    writeRow(db, 'handoffs', next);
    res.json(next);
  });
  // ── 名册成员变更确认请求队列（附录⑩ S4）──
  // 发起＝组织委员（与 services/member-confirmation.js::submitMemberChange 同口径：阶段/在册滞留下方写权）；
  // 决策＝支书/副支书（副书同权，单一源 constants.js::SECRETARY_AND_DEPUTY_ROLES，与本文件既有集合同源）。
  router.get('/member-confirmations', requireAuth(db), (req, res) => {
    let rows = listTable(db, 'member_confirmations');
    if (req.query.status) rows = rows.filter((r) => r.status === req.query.status);
    res.json(rows);
  });
  router.post('/member-confirmations', requireRole(db, ORG_COMMISSIONER_ROLE_SET), (req, res) => {
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const { id: rawId, personId, kind, action, to } = body;
    if (!personId || !action || !to) return res.status(400).json({ error: '缺少必要字段：personId/action/to' });
    const id = rawId ? String(rawId) : `mc-${randomUUID().slice(0, 8)}`;
    if (db.prepare('SELECT id FROM member_confirmations WHERE id = ?').get(id)) return res.status(409).json({ error: '该请求 id 已存在' });
    const row = {
      ...body,
      id,
      kind: kind || 'change',
      personId,
      action,
      to,
      status: 'pending',
      decidedBy: null,
      decidedAt: null,
      rejectNote: '',
    };
    writeRow(db, 'member_confirmations', row);
    res.status(201).json(row);
  });
  router.post('/member-confirmations/:id/decide', requireRole(db, SECRETARY_AND_DEPUTY_ROLE_SET), (req, res) => {
    const row = getRow(db, 'member_confirmations', req.params.id);
    if (!row) return res.status(404).json({ error: '待确认请求不存在' });
    const { decision, note } = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    if (decision !== 'approved' && decision !== 'rejected') return res.status(400).json({ error: 'decision 须为 approved 或 rejected' });
    if (row.status !== 'pending') return res.status(400).json({ error: `当前状态 ${row.status} 不可再决策` });
    const at = new Date().toISOString();
    const next = decision === 'rejected'
      ? { ...row, status: 'rejected', decidedBy: req.actor.id, decidedAt: at, rejectNote: (typeof note === 'string' && note.trim()) ? note.trim() : '支书未确认生效，请求已退回' }
      : { ...row, status: 'approved', decidedBy: req.actor.id, decidedAt: at };
    writeRow(db, 'member_confirmations', next);
    res.json(next);
  });
  // ── 批次里程碑（只读；内容单一源 = docs/data/milestones.json，由 seed.js 播种）──
  router.get('/milestones', requireAuth(db), (req, res) => res.json(listTable(db, 'milestones')));

  router.get('/snapshot/versions', requireAuth(db), (req, res) => res.json({ versions: _allCollectionVersions(db) })); registerExtraSemanticRoutes(router, db); // P0-1 集合版本基线查询（前端 init() 取基线；返回全集，未出现过的集合＝0）；2026-09-24 批次 169 追加申诉/未读/审计三组语义端点（函数体置文件末，保上文行号）
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

// ════════════════════════════════════════════════════════════════
//  `users` 写门的**靶向判据**：支书 / 副支书配置本支部支委身份（2026-09-23 支书裁定 · 情景①）
// ════════════════════════════════════════════════════════════════
// 由来（**放宽权限、须精确**）：`users` 的 patch 门原为「仅 party-staff」（见上方 RESOURCE_WRITE_GATE）。
//   支书 2026-09-23 裁定「最初的人员配置只有党委给支书配置，剩下的身份由书记来配置」⇒ 给支书开
//   **本支部、支委身份（组织 / 宣传 / 纪检委员）** 这一格写权；**2026-09-23 支书追裁「副支书也可配」**
//   ⇒ 同权扩到本支部现任副支书（`SECRETARY_AND_DEPUTY_ROLES` 同页同权，与本仓通例一致）；
//   **党委侧口径一字未收窄**（`party-staff` 仍全量可写）。
// 判据**单一源**＝`docs/src/core/constants.js::branchCommissionerWriteDeny`（本函数只把「靶行 / 靶支部 /
//   现任支书 / 现任副支书」从库里取出来喂给它，**不另写第二套**）。被拒的几类（该函数注释为权威，此处摘要）：
//   · 非本支部现任支书 / 副支书者（组织 / 宣传 / 纪检委员 / 普通成员等）→ 403；
//   · 靶标与操作人不同支部 → 403；靶标即支书本人 / 现任主席位（`secretary` / `deputy-secretary`）→ 403
//     （一把手层归党委，`D-585`：换届选举涉及支委班子身份赋权，由党委改变支部设置）；
//   · 写入角色键不在白名单（含 `secretary` / `deputy-secretary` / `party-staff` / `leader` / `organizer` / `deep` …）→ 403；
//     撤销位 `participant` 例外（降级，不是授予）。
// 前端同一判据的消费点＝`docs/src/services/appointment.js::appointBranchCommissioner`（角色双链写 + 审计留痕）。
// ⚠ 本块置于文件末尾、且上文对该门的三处改动均为**等行数替换**：不改动任何既有行号
//   （README-server.md 有大量 `文件:行号` 引用指向本文件，`doc-line-ref` 守卫逐条核）。

/**
 * `users` 写门的靶向判据：允许 → null；拦截 → 403 文案。
 * @param {Object} db better-sqlite3 实例
 * @param {{role?:string,id?:string,branchId?:string}} actor 写者（requireAuth 注入）
 * @param {string} targetId 靶行 id（`req.params.id`）
 * @param {Object} body 本次补丁
 * @returns {string|null}
 */
function _branchCommissionerGateDeny(db, actor, targetId, body) {
  const readRow = (table, id) => {
    if (!id) return null;
    const row = db.prepare(`SELECT data FROM ${table} WHERE id = ?`).get(String(id));
    return row ? JSON.parse(row.data) : null;
  };
  const myBranchId = (actor && actor.branchId) || 'br-b1';
  const target = readRow('users', targetId);
  const branch = readRow('branches', myBranchId);
  const patch = (body && typeof body === 'object' && !Array.isArray(body)) ? body : {};
  // 本支部现任副支书（副书同权，2026-09-23 支书追裁）：判据侧只认「本支部那一行 deputy-secretary」
  const deputyRow = db.prepare('SELECT data FROM users').all()
    .map(r => JSON.parse(r.data))
    .find(u => u.role === 'deputy-secretary' && ((u.branchId || 'br-b1') === myBranchId));
  return branchCommissionerWriteDeny({
    actorRole: actor && actor.role,
    actorId: actor && actor.id,
    actorBranchId: myBranchId,
    targetId: targetId ? String(targetId) : '',
    targetRole: target && target.role,
    targetBranchId: target && (target.branchId || 'br-b1'),
    secretaryId: branch && branch.secretaryId,
    deputySecretaryId: deputyRow ? deputyRow.id : null,
    role: patch.role,
  });
}

// ════════════════════════════════════════════════════════════════
//  快照写穿的**集合版本号（乐观锁）**协议（2026-09-23 P0-1 · 支书裁定「六项 P0 全做」）
// ════════════════════════════════════════════════════════════════
// 病灶（丢数据）：`POST /snapshot` 逐集合 `DELETE + INSERT`（无事务）+ 无并发保护 ⇒
//   ① 中途异常留下**半空集合**；② 两个在线会话**同集合**先后写，后写者以内存的落后快照**整表覆盖**
//   前写者刚落库的数据（前写者数据静默消失）。
// 协议（本段是判据单一源；前端消费点 = `docs/src/core/data-adapter.js` 的 `_flushSnapshot`）：
//   · 请求：payload 内带 `_versions`（对象：集合名 → 该集合**基线版本**，＝前端上次同步到该集合时的服务端版本）。
//   · 响应：带 `_versions` ⇒ 200 `{versions:{集合名:新版本}}`；payload 无集合（如 `{}`）⇒ 204（形状不变）。
//   · 冲突：某集合 `_versions[name] !== 服务端当前版本` ⇒ **整批 409**（不写任何集合），
//     body `{error, conflicts:[{collection, base, current}]}`。
//   · **缺版本 ⇒ 整批 428**（2026-09-23 批次 163 收紧）：payload 里出现（数组值）而 `_versions` 里**没有**该集合
//     ⇒ 拒绝，body `{error, missingVersions:[集合名…]}`。原「未带 `_versions` 的集合按无条件写」是一条
//     **绕过乐观锁的旁路**（任何直连调用可整表覆盖而不触发冲突检测），现封掉；直连调用须自带 `_versions`
//     （`GET /api/v1/snapshot/versions` 取基线，或首次上传带 0）。
//   边界一「首次上传」：服务端 collection_versions 无该行 ⇒ 服务端基线 = **0**；前端带 0 ⇒ 命中（放行）。
//   边界二「空数组」：合法清空（`[]` 是「本次要写的集合」）——同样走版本比对与版本 +1，不特殊放行。
// 并发安全：本文件 handler 全同步（better-sqlite3 同步 API），比对与写之间无 await 让出点
//   ⇒ 同进程内「比对 → 写」是原子的；跨进程竞态由 db.js 的 `replaceCollectionsAtomic` 事务兜底（要么全成、要么全不动）。
// ⚠ 本段置于文件末尾（同本文件既有的「末尾追加以保行号」纪律）：上下文的 `文件:行号` 引用由
//   `doc-line-ref.test.mjs` 逐条核，函数声明提升 ⇒ 置于尾部对上方 handler 无影响。

/** 快照 payload 的基线版本表；未携带（非对象/数组）⇒ null（＝所有集合都算「缺版本」，见 §缺版本 ⇒ 428） */
function _snapshotBaseVersions(payload) {
  const v = payload && payload._versions;
  return (v && typeof v === 'object' && !Array.isArray(v)) ? v : null;
}

/** 本次要写的集合清单（payload 里值为数组的资源名 → 表名）；数组(含空数组)才是「要写」，缺键/非数组不动该表 */
function _snapshotWrites(payload) {
  const out = [];
  for (const [name, table] of Object.entries(RESOURCE_TABLES)) {
    if (Array.isArray(payload[name])) out.push({ name, table, rows: payload[name] });
  }
  return out;
}

/**
 * 缺版本集合清单（2026-09-23 批次 163）：**payload 里要写、而 `_versions` 里没有基线**的集合名。
 * 非空 ⇒ 调用方整批 428（不写任何集合）。空 payload（无集合要写）恒返回 `[]` ⇒ 仍走 204。
 * @returns {string[]}
 */
function _snapshotMissingVersions(payload, baseVersions) {
  return _snapshotWrites(payload)
    .filter((w) => !baseVersions || !Object.prototype.hasOwnProperty.call(baseVersions, w.name))
    .map((w) => w.name);
}

/** 集合版本全集（未出现过的集合补 0）——前端 init() 取基线用，保证「每个集合都有基线」 */
function _allCollectionVersions(db) {
  const stored = readCollectionVersions(db);
  const out = {};
  for (const name of Object.keys(RESOURCE_TABLES)) out[name] = stored[name] || 0;
  return out;
}

/** 逐集合版本比对：返回冲突清单（空数组＝无冲突）。缺版本的集合由 `_snapshotMissingVersions` 先挡（428） */
function _snapshotVersionConflicts(db, payload, baseVersions) {
  const stored = readCollectionVersions(db);
  const conflicts = [];
  for (const w of _snapshotWrites(payload)) {
    if (!Object.prototype.hasOwnProperty.call(baseVersions, w.name)) continue;
    const base = Number(baseVersions[w.name]);
    const current = stored[w.name] || 0;
    if (!Number.isFinite(base) || base !== current) {
      conflicts.push({ collection: w.name, base: Number.isFinite(base) ? base : null, current });
    }
  }
  return conflicts;
}

// ════════════════════════════════════════════════════════════════
//  语义端点域（`SEMANTIC_TABLES` 三表）的读写原语与单一源常量（2026-09-23 批次 163）
// ════════════════════════════════════════════════════════════════
// 置于文件末尾：① 与上文「末尾追加以保行号」纪律一致（上文有大量 `文件:行号` 取证引用，本段未改动其行号）；
//   ② 函数声明提升 + import 声明提升 ⇒ 上方 `createResourcesRouter` 内的 handler 可安全引用。

/** 单行读（JSON 解码；不存在 ⇒ null）——三张语义表共用 */
function getRow(db, table, id) {
  const row = db.prepare(`SELECT data FROM ${table} WHERE id = ?`).get(String(id));
  return row ? JSON.parse(row.data) : null;
}

/** 单行写（整条 JSON 字符串；`id` 主键 upsert）——三张语义表共用 */
function writeRow(db, table, row) {
  db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`).run(row.id, JSON.stringify(row));
}

// 组织委员角色集（单一源 = constants.js::ORG_COMMISSIONER_ROLES；「成员变更确认」发起门的写权口径，
//   与 `routes/member.js` 的同名集合同源，勿手写角色字符串）
const ORG_COMMISSIONER_ROLE_SET = new Set(ORG_COMMISSIONER_ROLES);
// 三委数据交接类型元数据（单一源 = services/handoff.js::HANDOFF_TYPES，勿在本文件另写一份类型表）
import { HANDOFF_TYPES as HANDOFF_TYPES_SRC } from '../../docs/src/services/handoff.js';
import { ORG_COMMISSIONER_ROLES } from '../../docs/src/core/constants.js';

// ════════════════════════════════════════════════════════════════
//  语义端点：申诉队列 / 反馈未读标记 / 授权审计留痕（2026-09-24 批次 169）
// ════════════════════════════════════════════════════════════════
// 由来（支书 2026-09-24 逐字：「我们必须把网页升级成系统！！【浏览器缓存固然有用但不能什么都依靠浏览器缓存！！】」）：
//   四处原先**只有浏览器本地一份**——出勤/考察申诉队列各只存 localStorage 键
//   `gsm1921-attendance-appeals` / `gsm1921-inspection-appeals`；意见反馈未读标记按人分键
//   `gsm1921-issue-unread-<assigneeId>`；授权审计留痕只存 `sop_org_os_auth_audit`
//   ⇒ 清缓存即队列/标记/留痕灭失、换设备读不到。现按**语义端点域**模板（同 handoffs / member_confirmations）
//   落服务端表：`server/db.js::SEMANTIC_TABLES` 建表，前端 `init()` 拉取填缓存
//   （`docs/src/core/data-adapter.js::_loadAuxCollections`），写口改经本组端点 ⇒ 服务器为权威。
// 纪律（三条，同上批）：① **故意不进快照 payload**（写口是语义端点，走快照会被防抖窗口里的陈旧缓存覆盖）；
//   ② 写门照既有 requireXxx 中间件、角色集取 constants.js 单一源；③ 表在 `SEMANTIC_TABLES`
//   ⇒ 无通用 CRUD、不参与快照事务。
// ⚠ **本段整体置文件末**：`createResourcesRouter` 内只以一个**同行追加**的
//   `registerExtraSemanticRoutes(router, db)` 调用它——上文（`:919-1040` 等）行号是 README-server.md 的
//   取证靶点（doc-line-ref.test.mjs 逐条核），在 router 内插行会整体漂移 ⇒ 同 server/db.js「新增一律追加在尾部」纪律。
function registerExtraSemanticRoutes(router, db) {
  const APPEAL_STATUSES = ['pending', 'returned', 'closed'];
  const APPEAL_PATCH_KEYS = ['status', 'note'];
  // 申诉处置位＝支委层（纪检/支书/组织/宣传）+ 党小组组长（「交组织方重新确认」的重确认位）——
  //   角色集由 constants.js::BRANCH_COMMISSION_ROLES 单一源派生，勿手写角色字符串
  const APPEAL_DISPOSITION_ROLE_SET = new Set([...BRANCH_COMMISSION_ROLES, 'leader']);
  // 申诉读（可按支部 / 状态过滤）
  const readAppeals = (req, table) => {
    let rows = listTable(db, table);
    if (req.query.branchId) rows = rows.filter((r) => (r.branchId || 'br-b1') === req.query.branchId);
    if (req.query.status) rows = rows.filter((r) => r.status === req.query.status);
    return rows;
  };
  // 申诉提交（当事人本人；防冒名：personId 必须＝登录人）
  const submitAppeal = (req, res, table, idPrefix) => {
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const personId = body.personId ? String(body.personId) : '';
    const activityId = body.activityId ? String(body.activityId) : '';
    if (!personId || !activityId) return res.status(400).json({ error: '缺少必要字段：personId/activityId' });
    if (personId !== String(req.actor.id)) return res.status(403).json({ error: '无权限：申诉仅可由当事人本人提交' });
    const id = body.id ? String(body.id) : `${idPrefix}-${randomUUID().slice(0, 8)}`;
    if (db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(id)) return res.status(409).json({ error: '该申诉 id 已存在' });
    const row = {
      id,
      branchId: req.actor.branchId || 'br-b1',
      personId,
      activityId,
      note: typeof body.note === 'string' ? body.note.trim() : '',
      status: 'pending',
      createdAt: body.createdAt || new Date().toISOString(),
    };
    writeRow(db, table, row);
    res.status(201).json(row);
  };
  // 申诉处置（纪检核实后关闭 / 打回；组织方重新确认后关闭）——仅 pending 可处置、终态幂等拒绝
  const disposeAppeal = (req, res, table) => {
    const row = getRow(db, table, req.params.id);
    if (!row) return res.status(404).json({ error: '申诉不存在' });
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const bad = Object.keys(body).find((k) => !APPEAL_PATCH_KEYS.includes(k));
    if (bad) return res.status(400).json({ error: `字段 ${bad} 不在白名单（本端点仅可写 ${APPEAL_PATCH_KEYS.join(' / ')}）` });
    const status = body.status === undefined ? 'closed' : String(body.status);
    if (!APPEAL_STATUSES.includes(status)) return res.status(400).json({ error: `status 须为：${APPEAL_STATUSES.join(' / ')}` });
    if (row.status !== 'pending') return res.status(400).json({ error: `当前状态 ${row.status} 不可再处置` });
    const at = new Date().toISOString();
    const note = typeof body.note === 'string' ? body.note.trim() : '';
    const next = status === 'returned'
      ? { ...row, status, returnedBy: req.actor.id, returnedAt: at, returnNote: note }
      : { ...row, status, decidedBy: req.actor.id, decidedAt: at, ...(note ? { decisionNote: note } : {}) };
    writeRow(db, table, next);
    res.json(next);
  };
  // ── 出勤申诉队列（SOP-B-42 / D-456；前端 services/attendance.js）──
  router.get('/attendance-appeals', requireAuth(db), (req, res) => res.json(readAppeals(req, 'attendance_appeals')));
  router.post('/attendance-appeals', requireAuth(db), (req, res) => submitAppeal(req, res, 'attendance_appeals', 'appeal'));
  router.patch('/attendance-appeals/:id', requireRole(db, APPEAL_DISPOSITION_ROLE_SET), (req, res) => disposeAppeal(req, res, 'attendance_appeals'));
  // ── 考察申诉队列（SOP-B-10；前端 services/inspection.js）──
  router.get('/inspection-appeals', requireAuth(db), (req, res) => res.json(readAppeals(req, 'inspection_appeals')));
  router.post('/inspection-appeals', requireAuth(db), (req, res) => submitAppeal(req, res, 'inspection_appeals', 'inspAppeal'));
  router.patch('/inspection-appeals/:id', requireRole(db, APPEAL_DISPOSITION_ROLE_SET), (req, res) => disposeAppeal(req, res, 'inspection_appeals'));
  // ── 意见反馈「逐人未读标记」（前端 services/issues.js::IssueNotify）──
  // 行＝{ id: `${assigneeId}:${issueId}`, assigneeId, issueId, unread:true, at }；销项＝unread:false（保留行便于审计）
  // ⚠ 写门＝requireAuth（**与 mock 形态同口径**）：标记是「指派 / 答复」写链的副产品——**由派发方**替被指派人
  //   落未读（见 docs/src/services/issues.js:609,786 的 markUnread 调用点）。服务端只落不判定
  //   「该 actor 是否真派发过」；如需收严另裁（如实登记，未自创第二套口径）。
  const issueUnreadId = (assigneeId, issueId) => `${assigneeId}:${issueId}`;
  const UNREAD_WRITE_KEYS = ['assigneeId', 'issueId', 'unread'];
  router.get('/issue-unread', requireAuth(db), (req, res) => {
    let rows = listTable(db, 'issue_unread');
    if (req.query.assigneeId) rows = rows.filter((r) => r.assigneeId === req.query.assigneeId);
    if (req.query.open === '1') rows = rows.filter((r) => r.unread === true);
    res.json(rows);
  });
  router.post('/issue-unread', requireAuth(db), (req, res) => {
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const bad = Object.keys(body).find((k) => !UNREAD_WRITE_KEYS.includes(k));
    if (bad) return res.status(400).json({ error: `字段 ${bad} 不在白名单（本端点仅可写 ${UNREAD_WRITE_KEYS.join(' / ')}）` });
    const assigneeId = body.assigneeId ? String(body.assigneeId) : '';
    const issueId = body.issueId ? String(body.issueId) : '';
    if (!assigneeId || !issueId) return res.status(400).json({ error: '缺少必要字段：assigneeId/issueId' });
    const id = issueUnreadId(assigneeId, issueId);
    const prev = getRow(db, 'issue_unread', id) || {};
    const row = { ...prev, id, assigneeId, issueId, unread: body.unread !== false, at: new Date().toISOString() };
    writeRow(db, 'issue_unread', row);
    res.json(row);
  });
  // ── 授权审计留痕（T-190；前端 services/auth.js）──
  // 只增不改的治理档案：读＝支委层（赋权留痕是支委治理记录）；写＝登录用户（赋权动作内部调用，服务端只落不判定）
  const AUTH_AUDIT_KEYS = ['id', 'targetPersonId', 'role', 'scopeRef', 'authorizedBy', 'authorizedAt', 'action'];
  router.get('/auth-audit', requireRole(db, new Set(BRANCH_COMMISSION_ROLES)), (req, res) => res.json(listTable(db, 'auth_audit')));
  router.post('/auth-audit', requireAuth(db), (req, res) => {
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
    const bad = Object.keys(body).find((k) => !AUTH_AUDIT_KEYS.includes(k));
    if (bad) return res.status(400).json({ error: `字段 ${bad} 不在白名单（本端点仅可写 ${AUTH_AUDIT_KEYS.join(' / ')}）` });
    const id = body.id ? String(body.id) : `auth-${randomUUID().slice(0, 8)}`;
    if (db.prepare('SELECT id FROM auth_audit WHERE id = ?').get(id)) return res.json(getRow(db, 'auth_audit', id)); // 幂等：同 id 不重复落
    const row = {
      id,
      targetPersonId: body.targetPersonId ? String(body.targetPersonId) : null,
      role: body.role ? String(body.role) : null,
      scopeRef: body.scopeRef !== undefined && body.scopeRef !== null ? String(body.scopeRef) : '',
      authorizedBy: body.authorizedBy ? String(body.authorizedBy) : (req.actor ? req.actor.id : null),
      authorizedAt: body.authorizedAt || new Date().toISOString().slice(0, 10),
      action: body.action === 'revoke' ? 'revoke' : 'grant',
    };
    writeRow(db, 'auth_audit', row);
    res.status(201).json(row);
  });
}
