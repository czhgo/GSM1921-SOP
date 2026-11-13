// role: [工程师]+[AI]
// services/governance/committee-proposal.js — 支委提案前端门面（D-869）
//   API 形态：全部走 /api/v1/committee/proposals（服务端权威）；
//   mock 形态：落 mockDB.committeeProposals，字段与服务端同形，供演示与离线浏览。
import { mockDB } from '../../core/domain/domain.js?v=20261110b';
import { getAdapter, getDataSource } from '../../data/data-adapter.js?v=20261110b';
import { normalizeProposal, proposalTransition } from '../../core/domain/committee-proposal.js?v=20261110b';
import { generateId } from '../../core/base/id.js?v=20261110b';

const now = () => new Date().toISOString();

function _mockRows() {
  if (!Array.isArray(mockDB.committeeProposals)) mockDB.committeeProposals = [];
  return mockDB.committeeProposals;
}

function _canRead(role, personId, row) {
  return ['secretary', 'deputy-secretary', 'org-commissioner', 'prop-commissioner', 'disc-commissioner'].includes(role)
    || String(row.proposedBy) === String(personId);
}

export const CommitteeProposalStore = {
  async list({ role = '', personId = '', status = '' } = {}) {
    if (getDataSource() === 'api') return getAdapter().committeeProposals.list(status ? { status } : {});
    return _mockRows()
      .filter((row) => _canRead(role, personId, row))
      .filter((row) => !status || row.status === status)
      .sort((a, b) => String(b.proposedAt || '').localeCompare(String(a.proposedAt || '')));
  },

  async get(id) {
    if (getDataSource() === 'api') return getAdapter().committeeProposals.get(id);
    return _mockRows().find((row) => row.id === id) || null;
  },

  async events(id) {
    if (getDataSource() === 'api') return getAdapter().committeeProposals.events(id);
    return (mockDB.committeeProposalEvents || []).filter((e) => e.proposalId === id);
  },

  async create(input) {
    if (getDataSource() === 'api') return getAdapter().committeeProposals.create(input);
    const row = normalizeProposal({
      ...input,
      id: generateId('cp', '-'),
      status: 'pending',
      proposedAt: now(),
      createdAt: now(),
      updatedAt: now(),
    });
    _mockRows().push(row);
    return row;
  },

  async update(id, patch) {
    if (getDataSource() === 'api') return getAdapter().committeeProposals.update(id, patch);
    const rows = _mockRows();
    const idx = rows.findIndex((row) => row.id === id);
    if (idx < 0) return null;
    const current = rows[idx];
    const from = current.status;
    const to = proposalTransition(from, patch.action);
    if (!to) return null; // 非法流转 fail-closed：不改状态、不写事件
    const note = String(patch.note || '').trim();
    const next = normalizeProposal({
      ...current,
      ...patch,
      status: to,
      updatedAt: now(),
      decision: patch.action === 'decide'
        ? { result: patch.result === 'rejected' ? 'rejected' : 'passed', note, at: now() }
        : current.decision,
    });
    rows[idx] = next;
    // 与 API 同源：decide 回写 mockDB.activities 中该提案议程项的结果（会议记录与提案决议同值）。
    if (patch.action === 'decide' && next.meetingActivityId) {
      const meeting = (mockDB.activities || []).find((a) => a && a.id === next.meetingActivityId);
      if (meeting && Array.isArray(meeting.agenda)) {
        meeting.agenda = meeting.agenda.map((item) => (
          item.id === next.agendaItemId || item.proposalId === next.id
            ? { ...item, result: next.decision.result, note, recordedBy: patch.actorId || '', recordedAt: now() }
            : item
        ));
      }
    }
    if (!Array.isArray(mockDB.committeeProposalEvents)) mockDB.committeeProposalEvents = [];
    mockDB.committeeProposalEvents.push({
      id: generateId('cpe', '-'), branchId: next.branchId, proposalId: id,
      from, to, action: patch.action || '', by: patch.actorId || '', at: now(), note: patch.note || '',
    });
    return next;
  },
};
