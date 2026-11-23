// role: [工程师]+[AI]
// ════════════════════════════════════════════════════════════════
//  routes/committee-proposals.js — 支委提案（统一上会事项）与回执（D-869）
//
//  状态机单一源：docs/src/core/domain/committee-proposal.js
//  生成权 / 受众 / 落点：仍由服务端按 committee_proposals 行复算，不信客户端自述。
//  本 router 挂 /api/v1 下；表由 schema v16 建立，演示种子为空。
// ════════════════════════════════════════════════════════════════
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { requireAuth } from './auth.js';
import { BRANCH_COMMISSION_ROLES, SECRETARY_AND_DEPUTY_ROLES, isPartyGroupLeaderRole } from '../../docs/src/core/domain/constants.js';
import {
  PROPOSAL_SOURCE_TYPES, PROPOSAL_TYPES, normalizeProposal, proposalTransition,
} from '../../docs/src/core/domain/committee-proposal.js';
import { createActivityWorkgroup, createTaskforceWorkgroup } from './resources/workgroup-routes.js';
import { bumpCollectionVersion } from '../db.js';
import { SYSTEM_NOTICE_KINDS } from '../system-notice-kinds.js';
import { todayLocal } from '../../docs/src/core/base/utils.js';

const COMMITTEE = new Set(BRANCH_COMMISSION_ROLES);
const SECRETARY = new Set(SECRETARY_AND_DEPUTY_ROLES);
const SOURCE_TABLE = { activity: 'activities', taskforce: 'taskforces', member: 'users', institution: 'branch_docs' };

const rows = (db, table) => db.prepare(`SELECT data FROM ${table}`).all().map((r) => JSON.parse(r.data));
const row = (db, table, id) => {
  const found = db.prepare(`SELECT data FROM ${table} WHERE id = ?`).get(String(id));
  return found ? JSON.parse(found.data) : null;
};
const put = (db, table, value) => db.prepare('INSERT OR REPLACE INTO ' + table + ' (id, data) VALUES (?, ?)')
  .run(value.id, JSON.stringify(value));
const now = () => new Date().toISOString();

function appendEvent(db, proposal, action, from, to, actor, note = '') {
  const event = {
    id: `cpe-${randomUUID().slice(0, 8)}`,
    branchId: proposal.branchId,
    proposalId: proposal.id,
    from: from || '',
    to,
    action,
    by: actor?.id || '',
    at: now(),
    note: String(note || '').trim(),
  };
  put(db, 'committee_proposal_events', event);
  bumpCollectionVersion(db, 'committee_proposal_events');
  return event;
}

function notify(db, actor, kind, proposal, payload = {}) {
  const def = SYSTEM_NOTICE_KINDS[kind];
  if (!def?.build) return null;
  let built;
  try {
    built = def.build({ actor, sourceId: proposal.id, payload, db });
  } catch (_) {
    return null;
  }
  const notice = {
    ...built,
    id: `ntc-${randomUUID().slice(0, 8)}`,
    kind: 'system',
    systemKind: kind,
    branchId: proposal.branchId,
    publishDate: todayLocal(),
  };
  db.prepare('INSERT OR REPLACE INTO notices (id, data) VALUES (?, ?)').run(notice.id, JSON.stringify(notice));
  bumpCollectionVersion(db, 'notices');
  return notice;
}

function sourceRowOf(db, sourceType, sourceId) {
  const table = SOURCE_TABLE[sourceType];
  return table && sourceId ? row(db, table, sourceId) : null;
}

function affectedOf(db, proposal) {
  const ids = new Set(Array.isArray(proposal.affectedPersonIds) ? proposal.affectedPersonIds : []);
  if (proposal.sourceId) {
    const source = sourceRowOf(db, proposal.sourceType, proposal.sourceId) || {};
    const people = proposal.sourceType === 'activity'
      ? (source.assignments || []).filter((m) => m?.role === 'organizer').map((m) => m.personId)
      : proposal.sourceType === 'taskforce'
        ? [source.manager, source.initiator]
        : proposal.sourceType === 'member'
          ? [proposal.sourceId]
          : [source.createdBy || source.ownerId];
    for (const id of people) if (id) ids.add(String(id));
  }
  return [...ids].filter(Boolean);
}

function canRead(actor, proposal) {
  if (!actor) return false;
  if (COMMITTEE.has(actor.role)) return true;
  if (String(proposal.proposedBy) === String(actor.id)) return true;
  return Array.isArray(proposal.affectedPersonIds) && proposal.affectedPersonIds.includes(String(actor.id));
}

function validateCreate(db, actor, body) {
  if (!actor?.branchId) return '无权限：请先选择支部';
  if (!COMMITTEE.has(actor.role) && !isPartyGroupLeaderRole(actor.role)) {
    return '无权限：只有党小组组长或支委可以提交提案';
  }
  const title = String(body.title || '').trim();
  const reason = String(body.reason || '').trim();
  const sourceType = String(body.sourceType || '');
  if (!title) return '请填写提案标题';
  if (!reason) return '请填写提案事由';
  if (!PROPOSAL_SOURCE_TYPES.includes(sourceType)) return '提案来源类型无效';
  const sourceId = body.sourceId ? String(body.sourceId) : null;
  if (sourceId) {
    const source = sourceRowOf(db, sourceType, sourceId);
    if (!source) return '提案来源对象不存在';
    if ((source.branchId || actor.branchId) !== actor.branchId) return '无权限：不能引用其他支部的对象';
    return null;
  }
  if (!['activity', 'taskforce'].includes(sourceType)) return '新建事项提案只支持活动或专班';
  const draft = body.draft && typeof body.draft === 'object' ? body.draft : null;
  if (!draft || !(draft.title || draft.name)) return '新建事项提案须填写标题 / 名称';
  return null;
}

function scheduleDeny(db, actor, proposal, body) {
  if (!SECRETARY.has(actor.role)) return '无权限：只有支书 / 副支书可以排期';
  const meetingId = String(body.meetingActivityId || '');
  if (!meetingId) return '请选择要排入的支委会会议';
  const meeting = row(db, 'activities', meetingId);
  if (!meeting) return '会议不存在';
  if ((meeting.branchId || actor.branchId) !== proposal.branchId) return '无权限：不能跨支部排期';
  if (meeting.type !== '支委会') return '只能排入「支委会」会议';
  return null;
}

export function createCommitteeProposalsRouter(db) {
  const router = Router();

  router.get('/committee/proposals', requireAuth(db), (req, res) => {
    const status = String(req.query.status || '');
    const sourceType = String(req.query.sourceType || '');
    const list = rows(db, 'committee_proposals')
      .filter((p) => p.branchId === req.actor.branchId)
      .filter((p) => canRead(req.actor, p))
      .filter((p) => !status || p.status === status)
      .filter((p) => !sourceType || p.sourceType === sourceType)
      .sort((a, b) => String(b.proposedAt || '').localeCompare(String(a.proposedAt || '')));
    res.json(list);
  });

  router.get('/committee/proposals/:id', requireAuth(db), (req, res) => {
    const proposal = row(db, 'committee_proposals', req.params.id);
    if (!proposal || proposal.branchId !== req.actor.branchId) return res.status(404).json({ error: '提案不存在' });
    if (!canRead(req.actor, proposal)) return res.status(403).json({ error: '无权限查看该提案' });
    const events = rows(db, 'committee_proposal_events')
      .filter((e) => e.proposalId === proposal.id)
      .sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')));
    res.json({ ...proposal, events });
  });

  router.post('/committee/proposals', requireAuth(db), (req, res) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const deny = validateCreate(db, req.actor, body);
    if (deny) return res.status(400).json({ error: deny });
    const id = `cp-${randomUUID().slice(0, 8)}`;
    const proposal = normalizeProposal({
      ...body,
      id,
      branchId: req.actor.branchId,
      proposedBy: req.actor.id,
      proposedAt: now(),
      createdAt: now(),
      updatedAt: now(),
      status: 'pending',
    });
    proposal.affectedPersonIds = affectedOf(db, proposal);
    put(db, 'committee_proposals', proposal);
    bumpCollectionVersion(db, 'committee_proposals');
    appendEvent(db, proposal, 'submit', '', 'pending', req.actor, '');
    notify(db, req.actor, 'committee-proposal-submitted', proposal);
    res.status(201).json(proposal);
  });

  router.patch('/committee/proposals/:id', requireAuth(db), (req, res) => {
    let proposal = row(db, 'committee_proposals', req.params.id);
    if (!proposal || proposal.branchId !== req.actor.branchId) return res.status(404).json({ error: '提案不存在' });
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const action = String(body.action || '');
    let to = null;
    let resultProposal = null;
    let skipped = false;

    const isCommitteeAction = action === 'accept' || action === 'reject';
    if (isCommitteeAction && !COMMITTEE.has(req.actor.role)) {
      return res.status(403).json({ error: '无权限：只有支委可以受理 / 驳回' });
    }
    if (!isCommitteeAction && !SECRETARY.has(req.actor.role)) {
      return res.status(403).json({ error: '无权限：只有支书 / 副支书可以排期 / 决议 / 归档' });
    }
    if (action === 'reject' && !String(body.note || '').trim()) return res.status(400).json({ error: '驳回必须填写理由' });
    if (action === 'schedule') {
      const deny = scheduleDeny(db, req.actor, proposal, body);
      if (deny) return res.status(400).json({ error: deny });
    }

    let createdSource = null;
    const run = db.transaction(() => {
      proposal = row(db, 'committee_proposals', req.params.id);
      if (!proposal) throw Object.assign(new Error('提案不存在'), { status: 404 });
      if (proposal.branchId !== req.actor.branchId) throw Object.assign(new Error('提案不存在'), { status: 404 });

      // 排期幂等：同一提案已排入同一会议且议程项仍在 ⇒ 返回现状，不重复追加。
      if (action === 'schedule') {
        const meeting = row(db, 'activities', body.meetingActivityId);
        const agenda = Array.isArray(meeting?.agenda) ? meeting.agenda : [];
        const already = agenda.find((item) => item.id === proposal.agendaItemId || item.proposalId === proposal.id);
        if (already && proposal.status === 'on-agenda') {
          skipped = true;
          resultProposal = { ...proposal, meetingActivityId: meeting.id, agendaItemId: already.id };
          return;
        }
      }

      to = proposalTransition(proposal.status, action);
      if (!to) throw Object.assign(new Error(`不允许的状态流转：${proposal.status} → ${action}`), { status: 400 });
      const from = proposal.status;
      let updated = { ...proposal, status: to, updatedAt: now() };
      if (action === 'schedule') {
        const meeting = row(db, 'activities', body.meetingActivityId);
        const agenda = Array.isArray(meeting.agenda) ? [...meeting.agenda] : [];
        const agendaItem = {
          id: `ag-${randomUUID().slice(0, 8)}`,
          item: proposal.title,
          kinds: ['proposal'],
          proposalId: proposal.id,
          agendaStep: proposal.suggestedType === 'decision' ? 'vote' : 'discussion',
        };
        agenda.push(agendaItem);
        put(db, 'activities', { ...meeting, agenda, updatedAt: now() });
        bumpCollectionVersion(db, 'activities');
        updated = { ...updated, meetingActivityId: meeting.id, agendaItemId: agendaItem.id };
      }
      if (action === 'decide') {
        const result = body.result === 'rejected' ? 'rejected' : 'passed';
        updated = {
          ...updated,
          decision: { result, note: String(body.note || '').trim(), at: now() },
          decidedBy: req.actor.id,
          decidedAt: now(),
        };
        if (result === 'passed' && !proposal.sourceId && ['activity', 'taskforce'].includes(proposal.sourceType)) {
          const draft = proposal.draft || {};
          if (proposal.sourceType === 'activity') {
            const id = `act-${randomUUID().slice(0, 8)}`;
            const created = createActivityWorkgroup(db, req.actor, {
              id,
              branchId: proposal.branchId,
              title: draft.title || proposal.title,
              type: draft.type || '主题党日',
              date: draft.date || todayLocal(),
              description: draft.description || proposal.reason,
              status: 'draft',
              organizingScope: 'branch',
              hostGroupId: null,
              assignments: [],
              createdAt: now(),
              sourceProposalId: proposal.id,
            });
            if (!created.ok) throw Object.assign(new Error(created.error), { status: created.status || 400 });
            createdSource = id;
            bumpCollectionVersion(db, 'activities');
            bumpCollectionVersion(db, 'workgroups');
          } else {
            const id = `tf-${randomUUID().slice(0, 8)}`;
            const created = createTaskforceWorkgroup(db, req.actor, {
              id,
              branchId: proposal.branchId,
              name: draft.name || proposal.title,
              type: draft.type || '专项',
              task: draft.task || proposal.reason,
              status: 'draft',
              organizingScope: 'branch',
              hostGroupId: null,
              members: [],
              createdAt: now(),
              sourceProposalId: proposal.id,
            });
            if (!created.ok) throw Object.assign(new Error(created.error), { status: created.status || 400 });
            createdSource = id;
            bumpCollectionVersion(db, 'taskforces');
            bumpCollectionVersion(db, 'workgroups');
          }
          updated = { ...updated, sourceId: createdSource };
        }
        // 单一事实：会议记录结果与提案决议同值——decide 同事务回写会议议程项。
        if (proposal.meetingActivityId) {
          const meeting = row(db, 'activities', proposal.meetingActivityId);
          if (meeting && Array.isArray(meeting.agenda)) {
            const agenda = meeting.agenda.map((item) => (
              item.id === proposal.agendaItemId || item.proposalId === proposal.id
                ? { ...item, result, note: String(body.note || '').trim(), recordedBy: req.actor.id, recordedAt: now() }
                : item
            ));
            put(db, 'activities', { ...meeting, agenda, updatedAt: now() });
            bumpCollectionVersion(db, 'activities');
          }
        }
      }
      put(db, 'committee_proposals', updated);
      bumpCollectionVersion(db, 'committee_proposals');
      appendEvent(db, updated, action, from, to, req.actor, body.note || '');
      resultProposal = updated;
    });
    try {
      run();
    } catch (err) {
      return res.status(err.status || 500).json({ error: err.message || '提案流转失败' });
    }
    const noticeKind = {
      accept: 'committee-proposal-accepted',
      reject: 'committee-proposal-rejected',
      schedule: 'committee-proposal-scheduled',
      decide: 'committee-proposal-decided',
      close: 'committee-proposal-closed',
    }[action];
    if (noticeKind && !skipped) notify(db, req.actor, noticeKind, resultProposal, { note: body.note || '' });
    res.json(resultProposal);
  });

  router.get('/committee/proposals/:id/events', requireAuth(db), (req, res) => {
    const proposal = row(db, 'committee_proposals', req.params.id);
    if (!proposal || proposal.branchId !== req.actor.branchId) return res.status(404).json({ error: '提案不存在' });
    if (!canRead(req.actor, proposal)) return res.status(403).json({ error: '无权限查看该提案' });
    res.json(rows(db, 'committee_proposal_events')
      .filter((e) => e.proposalId === proposal.id)
      .sort((a, b) => String(a.at || '').localeCompare(String(b.at || ''))));
  });

  return router;
}
