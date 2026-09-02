// server/routes/committee.js — 线上表决：异步表态（agenda_votes）
// 闭环：书记创建表决活动+议题 → 通知应到成员 → 成员异步表态 → 书记汇总/截止 → 记录决议（复用 agenda）
// 表态可见性：先全量可见（信息同步开放），边界后续评议
// 泛化（AV3）：position 按活动 voteConfig.optionSet 枚举校验、应到按 voteConfig.voterIds 校验；
//   旧活动（无 voteConfig）回退 deliberative + 支委白名单（现状行为零变化）。
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { requireAuth, requireRole } from './auth.js';

// 支委白名单 = 旧活动回退白名单（保留不改行为；历史固定成员 p10-p14，与 member.js COMMITTEE_IDS 对齐），
// 供无 voteConfig 的旧活动/回退场景兜底校验。
// 权威名单 = 活动 voteConfig.voterIds（前端创建活动时经 vote-config 固化写入活动）；
// 前端唯一源 = docs/src/services/vote-config.js resolveVoterIds('committee')
//   （people.js role + AuthStore.isCommissioner，排除 u_*）。名单变更请改前端权威源，勿在此增删成员。
const COMMITTEE_IDS = new Set(['p10', 'p11', 'p12', 'p13', 'p14']);
// 书记角色（截止锁定仅书记可操作，与 member.js SECRETARY_ROLES 口径一致）
const SECRETARY_ROLES = new Set(['secretary']);

function listTable(db, table) {
  return db.prepare(`SELECT data FROM ${table}`).all().map((r) => JSON.parse(r.data));
}
function getRow(db, table, id) {
  const row = db.prepare(`SELECT data FROM ${table} WHERE id = ?`).get(id);
  return row ? JSON.parse(row.data) : null;
}
function writeRow(db, table, row) {
  db.prepare(`INSERT OR REPLACE INTO ${table} (id, data) VALUES (?, ?)`).run(row.id, JSON.stringify(row));
}

// 选项集枚举：position 按活动 voteConfig.optionSet 校验（与前端 vote-config.js OPTION_SETS 对齐）
//   deliberative（支委会交流式）：agree(同意)/object(异议)/comment(附言)
//   formal（支部党员大会正式表决）：approve(赞成)/oppose(反对)/abstain(弃权)
const OPTION_ENUMS = {
  deliberative: ['agree', 'object', 'comment'],
  formal: ['approve', 'oppose', 'abstain'],
};

export function createCommitteeRouter(db) {
  const router = Router();

  // 表态列表（按活动过滤；全量可见）
  router.get('/agenda-votes', requireAuth(db), (req, res) => {
    let rows = listTable(db, 'agenda_votes');
    if (req.query.activityId) rows = rows.filter((v) => v.activityId === req.query.activityId);
    res.json(rows);
  });

  // 提交/覆盖表态（活动应到名单内成员；截止锁定后 400；不在名单 403；非法 position 400）
  router.post('/agenda-votes', requireAuth(db), (req, res) => {
    const { activityId, agendaItemId, position, note = '' } = req.body || {};
    if (!activityId || !agendaItemId) {
      return res.status(400).json({ error: '缺少必要字段：activityId/agendaItemId' });
    }
    if (typeof note !== 'string') {
      return res.status(400).json({ error: 'note 须为字符串' });
    }
    if (note.length > 500) {
      return res.status(400).json({ error: 'note 长度不能超过 500 字符' });
    }
    // 活动存在性检查（活动数据在 activities 表；活动不存在一律 404，不静默放行）
    const actRow = getRow(db, 'activities', activityId);
    if (!actRow) return res.status(404).json({ error: '活动不存在' });
    // ===== 表决授权解析（AV3，fail-closed）=====
    // 信任模型：表决授权（optionSet 选项枚举 + voterIds 应到名单）存于活动 voteConfig，
    //   由前端创建活动时经 vote-config 固化写入（客户端写）。
    // 写侧约束（2026-09-02 收敛，T-2026-09-006）：voteConfig 配置 UI 仅在书记/副书记工作台
    //   （secretary.html calendar 写入面板）呈现——组长等其它角色写活动无表决配置入口；
    //   「服务端强制」（活动写 REST 化后按角色校验 voteConfig / 名单按 scope 从 users 推导）
    //   已登记架构 spec，与双 Mock 引擎合并同批排期。当前信任模型 = 书记/副书记操作 + 演示场景。
    // 旧活动兼容：仅当活动完全无 voteConfig 时回退 deliberative + 支委白名单（现状行为零变化）；
    //   活动带 voteConfig 即须完整合法 —— optionSet 缺失/不受支持、voterIds 缺失/非数组/空数组
    //   一律 400（fail-closed，不回退默认值）。
    const vc = actRow.voteConfig;
    const hasConfig = vc !== undefined && vc !== null;
    if (hasConfig && !OPTION_ENUMS[vc.optionSet]) {
      return res.status(400).json({ error: '活动表决配置无效：optionSet 缺失或不受支持' });
    }
    if (hasConfig && (!Array.isArray(vc.voterIds) || vc.voterIds.length === 0)) {
      return res.status(400).json({ error: '活动表决名单无效：voterIds 须为非空数组' });
    }
    const optionSet = hasConfig ? vc.optionSet : 'deliberative';
    const voterIds = hasConfig ? new Set(vc.voterIds) : COMMITTEE_IDS;
    if (!voterIds.has(req.actor.id)) {
      return res.status(403).json({ error: hasConfig ? '不在本次表决名单' : '仅支委可表态' });
    }
    if (!position || !OPTION_ENUMS[optionSet].includes(position)) {
      return res.status(400).json({ error: `表态无效：position(${OPTION_ENUMS[optionSet].join('|')})` });
    }
    // 「异议须附言」仅 deliberative（object）适用；formal（反对/弃权/附言选填）无必附言要求
    if (optionSet === 'deliberative' && position === 'object' && !note.trim()) {
      return res.status(400).json({ error: '异议须附言说明' });
    }
    // 锁定期检查（截止锁定后不可再提交）
    if (actRow.votesLocked) {
      return res.status(400).json({ error: '表态已截止锁定，不可再提交' });
    }
    const existing = listTable(db, 'agenda_votes').find((v) =>
      v.activityId === activityId && v.agendaItemId === agendaItemId && v.personId === req.actor.id);
    if (existing) {
      const updated = { ...existing, position, note, updatedAt: new Date().toISOString() };
      writeRow(db, 'agenda_votes', updated);
      return res.json(updated);
    }
    const row = {
      id: `av-${randomUUID().slice(0, 8)}`,
      activityId, agendaItemId,
      personId: req.actor.id,
      position, note,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    };
    writeRow(db, 'agenda_votes', row);
    res.status(201).json(row);
  });

  // 书记截止（不可逆）：置 votesLocked=true / voteDeadline；仅书记角色，截止后不可解锁
  router.post('/agenda-votes/lock', requireRole(db, SECRETARY_ROLES), (req, res) => {
    const { activityId, votesLocked, voteDeadline } = req.body || {};
    if (!activityId) return res.status(400).json({ error: '缺少 activityId' });
    if (voteDeadline !== undefined && (typeof voteDeadline !== 'string' || !voteDeadline.trim())) {
      return res.status(400).json({ error: 'voteDeadline 须为非空字符串' });
    }
    const act = getRow(db, 'activities', activityId);
    if (!act) return res.status(404).json({ error: '活动不存在' });
    const merged = {
      ...act,
      // 截止不可逆：仅允许置 true，禁止解锁（传 false 不写入）
      ...(votesLocked === true ? { votesLocked: true } : {}),
      ...(voteDeadline ? { voteDeadline } : {}),
    };
    writeRow(db, 'activities', merged);
    res.json(merged);
  });

  return router;
}
