// role: [工程师]+[AI]
// core/domain/agenda-classify.js — 支委会议程来源分类**单一源**（2026-11-10 批次 540 波次 2）
// ════════════════════════════════════════════════════════════════
// 职责：把「该上会的事」按来源判类型（决策 / 讨论 / 同步），并给出议程文案、去重键与应到范围。
//   客户端（`entries/tabs/secretary/agenda-form.js`、`committee-meeting-tab.js`）与服务端
//   （`server/routes/committee.js` → `GET /api/v1/committee/agenda-candidates`）**共用本文件**
//   ⇒ 同一事项两端不得出现两种类型 / 两种文案。
// 契约：`content/04_web_design/contracts/AGENDA_DERIVATION_CONTRACT.md`（必须遵守什么）。
// 纯函数、无 DOM、无 IO、不 import services：服务端要直接 import，任何浏览器依赖都会把路由带崩。
//   因此本文件里的少数「镜像常量」（如 `workforce-proposal`）与写侧单一源的一致性，由
//   `server/test/agenda-classify.test.mjs` 逐字断言，不在运行期重复定义。
//
// 分工（H32）：去重 / 时效 / 类型 / 应到＝服务端算；客户端只做分组 / 排序 / 徽章。
// ════════════════════════════════════════════════════════════════

/** 议程类型三值（顺序＝界面上类型分组与呈现顺序） */
export const AGENDA_TYPES = [
  { value: 'decision', label: '决策', needDecision: true, expected: '形成决议', hint: '结果改变系统状态' },
  { value: 'discussion', label: '讨论', needDecision: false, expected: '形成意见', hint: '只形成意见' },
  { value: 'sync', label: '同步', needDecision: false, expected: '知悉备案', hint: '知悉备案' },
];

/**
 * 六类来源（顺序＝待议池呈现顺序）。
 * `refKind` 是议程项 `sourceRef.kind` 的唯一取值口径（勿在页面另写一份映射）。
 * `step` 是该事项**建议排入的议程步骤**：vote＝表决项 / discussion＝讨论项 / null＝无需表态。
 *   ⚠ 只作提示，写入议程时 `agendaStep` 仍由支书在写入面板决定（不得由本字段自动落库）。
 */
export const AGENDA_SOURCES = [
  { value: 'taskforce-pending', label: '专班事项（明确要求表决）', refKind: 'taskforce-proposal', type: 'decision', step: 'vote' },
  { value: 'issue-committee', label: '意见反馈（归口支委会）', refKind: 'issue', type: 'discussion', step: 'discussion' },
  { value: 'institution-draft', label: '制度草案（待支委会审议）', refKind: 'branch-doc', type: 'decision', step: 'vote' },
  { value: 'party-meeting-pending', label: '待报送党员大会的制度', refKind: 'branch-doc', type: 'sync', step: null, expected: '报送党员大会' },
  { value: 'activist-recommend', label: '积极分子推荐（发展对象）', refKind: 'member', type: 'decision', step: 'vote' },
  { value: 'brand-proposal', label: '品牌提案', refKind: 'activity', type: 'decision', step: 'vote' },
];

/** 另纳入的两类（同属支委会事项，但不进「拟上会」六类清单：它们是**活动实体自带的议题**） */
export const AGENDA_EXTRA_SOURCES = [
  { value: 'activity-approval', label: '活动批准（待支委会表决）', refKind: 'activity', type: 'decision', step: 'vote' },
  { value: 'assignment-adjust', label: '分工调整（待支委会表决）', refKind: 'activity', type: 'decision', step: 'vote' },
];

/** 全部来源（六类 ＋ 另纳入两类） */
export const ALL_AGENDA_SOURCES = [...AGENDA_SOURCES, ...AGENDA_EXTRA_SOURCES];

/** 类型 → 徽章档（`components/ui/badges.js::badgeHtml` 的 variant；两个界面共用本表，勿各写一份） */
export const AGENDA_TYPE_BADGE_VARIANT = { decision: 'brand', discussion: 'info', sync: 'neutral' };

/**
 * 四反例：**不得判为决策**的情形（判成决策 = 让不改变系统状态的事占掉表决位）。
 * 前三条为「日常组织事务」，第四条为「支委会已审议通过、此处只报送党员大会」。
 */
export const AGENDA_COUNTEREXAMPLES = [
  { value: 'taskforce-create', label: '专班创建', type: 'sync', expected: '知悉备案', why: '创建专班工作组本身不要求表决' },
  { value: 'activity-create', label: '活动创建', type: 'sync', expected: '知悉备案', why: '日常活动创建属组织事务，不经支委会表决' },
  { value: 'attendance-handover', label: '考勤交接', type: 'sync', expected: '知悉备案', why: '考勤交接是台账移交，知悉备案即可' },
  { value: 'institution-pending-party-meeting', label: '制度已 pending-party-meeting', type: 'sync', expected: '报送党员大会', why: '支委会已审议通过，此处只报送党员大会，不再表决' },
];

/** 归口含「支委会」的意见反馈领域（**由母本《常见工作场景快速指南》「意见建议类型」表派生**）。
 *  权威表 `services/governance/issues.js::ISSUE_DOMAINS` 的 `suggest` 含「支委会」的两类
 *  ＝`institution`（制度建设建议 → 支委会讨论制度修改）/ `other`（其他建议 → 支委会研究）。
 *  本文件不 import 该服务（服务端复用本模块，services 带浏览器依赖），改由
 *  `server/test/agenda-classify.test.mjs` 逐字断言两侧集合相等。 */
export const COMMITTEE_ISSUE_DOMAIN_VALUES = ['institution', 'other'];

/** 分工调整议题的写侧单一源 = `services/branch/workforce.js::WORKFORCE_PROPOSAL_KIND`（镜像，测试锁定） */
export const AGENDA_ASSIGNMENT_PROPOSAL_KIND = 'workforce-proposal';
/** 待批活动状态值单一源 = `services/activity/activity.js::PENDING_APPROVAL_STATUS`（镜像，测试锁定） */
export const AGENDA_PENDING_APPROVAL_STATUS = 'pending-approval';

/** 制度「已审议通过、待党员大会表决」态（单一源 `services/branch/branch-doc.js::INSTITUTION_PENDING_PARTY_MEETING`） */
export const AGENDA_INSTITUTION_PENDING_PARTY_MEETING = 'pending-party-meeting';

/** 「拟上会」六类清单的显示分组 → 来源键（唯一映射；页面不得另写） */
export const AGENDA_GROUP_TO_SOURCE = {
  taskforce: 'taskforce-pending',
  issue: 'issue-committee',
  draftDoc: 'institution-draft',
  partyVote: 'party-meeting-pending',
  recommend: 'activist-recommend',
  brand: 'brand-proposal',
};

/** 兼容口径：旧调用方传 `group` 时按同一映射解析来源键 */
export const LEGACY_GROUP_TO_SOURCE = AGENDA_GROUP_TO_SOURCE;

const SOURCE_BY_KEY = new Map(
  [...ALL_AGENDA_SOURCES, ...AGENDA_COUNTEREXAMPLES].map((s) => [s.value, s]),
);
const TYPE_BY_KEY = new Map(AGENDA_TYPES.map((t) => [t.value, t]));

/** 类型元数据（未知值回落 sync） */
export function agendaTypeMeta(type) {
  return TYPE_BY_KEY.get(type) || TYPE_BY_KEY.get('sync');
}

/** 类型中文名 */
export function agendaTypeLabel(type) {
  return agendaTypeMeta(type).label;
}

/** 来源元数据（未知来源 → null） */
export function agendaSourceMeta(source) {
  return SOURCE_BY_KEY.get(String(source || '')) || null;
}

/** 来源中文名（未知来源原样回显，不吞） */
export function agendaSourceLabel(source) {
  const hit = agendaSourceMeta(source);
  return hit ? hit.label : String(source || '');
}

// ── 来源判据（纯函数；服务端与客户端共用，勿在页面另写第二份）────────────────

/** 制度文本（用途字段缺省＝普通文件） */
export function isInstitutionDoc(doc) {
  return !!doc && doc.purpose === 'institution';
}

/** 是否「支委会已审议通过、待党员大会表决」的制度 */
export function isPartyMeetingPendingDoc(doc) {
  return isInstitutionDoc(doc) && doc.status === AGENDA_INSTITUTION_PENDING_PARTY_MEETING;
}

/** 「拟上会」草案判据：普通文件草案（无 status 或 draft）＋ 制度链上尚未成为现行版的两种态
 *  （与 `services/branch/branch-doc.js::isAgendaDraftDoc` 同口径） */
export function isAgendaDraftDocCandidate(doc) {
  if (!doc) return false;
  if (!doc.status || doc.status === 'draft') return true;
  return isPartyMeetingPendingDoc(doc);
}

/** 意见反馈是否归口支委会 */
export function isCommitteeIssue(issue) {
  return !!issue && COMMITTEE_ISSUE_DOMAIN_VALUES.includes(issue.domain);
}

/** 待审议的品牌认定提案（已提案、未认定、未归档） */
export function isBrandProposalCandidate(activity) {
  const proposal = activity && activity.brandProposal;
  return !!activity && !activity.archived && activity.isBrand !== true
    && !!proposal && typeof proposal === 'object' && !Array.isArray(proposal);
}

/** 待支委会表决的活动批准（档位＝支委会且尚未批完） */
export function isActivityApprovalCandidate(activity) {
  const approval = activity && activity.approval;
  if (!activity || !approval || typeof approval !== 'object') return false;
  if (approval.mode !== 'branch-committee') return false;
  return activity.status === AGENDA_PENDING_APPROVAL_STATUS && (approval.state || 'pending') === 'pending';
}

/** 待采纳的分工调整议题（未采纳前一直在池内） */
export function isAssignmentAdjustCandidate(activity) {
  const extras = activity && activity.extras;
  return !!extras && extras.kind === AGENDA_ASSIGNMENT_PROPOSAL_KIND && !extras.adoptedAt;
}

// ── 分类 ────────────────────────────────────────────────────────

/** 归一入参：`{ source|group, ref }`；未给 `ref` 时把入参自身当记录（便于单参数调用） */
function _inputOf(input) {
  if (!input || typeof input !== 'object') return { source: '', ref: {} };
  const ref = (input.ref && typeof input.ref === 'object') ? input.ref : input;
  const source = String(input.source || LEGACY_GROUP_TO_SOURCE[input.group] || '');
  return { source, ref };
}

/** 同一份「制度」按所处环节分流：草案 → institution-draft；已报送 → party-meeting-pending */
function _resolveSourceKey(source, ref) {
  if (source === 'institution-draft' && isPartyMeetingPendingDoc(ref)) return 'party-meeting-pending';
  return source;
}

function _titleOf(ref) {
  return String((ref && (ref.title || ref.name || ref.fileName || ref.id)) || '').trim();
}

/** 议程文案（两端共用；改文案只改这里） */
function _itemTextOf(source, ref) {
  const title = _titleOf(ref) || '未命名事项';
  switch (source) {
    case 'taskforce-pending': return `审议专班「${title}」（${ref.kind === 'dissolve' ? '解散' : '发起'}）`;
    case 'issue-committee': return `审议反馈「${title}」`;
    case 'institution-draft': return `讨论文件「${title}」`;
    case 'party-meeting-pending': return `报送党员大会「${title}」`;
    case 'activist-recommend': return `讨论推荐「${title}」为发展对象`;
    case 'brand-proposal': return `审议品牌认定「${title}」`;
    case 'activity-approval': return `审议活动「${title}」的批准`;
    case 'assignment-adjust': return `审议${title}`;
    default: return `知悉「${title}」`;
  }
}

/** 议程行引用字段（勾入议程时照搬；不改变来源本身） */
function _agendaPatchOf(source, ref) {
  const id = ref && ref.id ? String(ref.id) : '';
  switch (source) {
    case 'institution-draft':
    case 'party-meeting-pending':
      return { kinds: ['discussion-file'], branchDocId: id };
    case 'activist-recommend':
      return { kinds: ['attendee-list'], personIds: [id], toStage: '发展对象' };
    case 'brand-proposal':
      return { kinds: ['brand-designation'], brandActivityId: id };
    case 'activity-approval':
      return { kinds: ['activity-approval'], approvalActivityId: id };
    default:
      return { kinds: [] };
  }
}

/** 去重键：同一来源同一记录只出现一次（不同来源指向同一活动算两件事，不合并） */
export function agendaDedupeKey(input) {
  const { source: rawSource, ref } = _inputOf(input);
  const source = _resolveSourceKey(rawSource, ref);
  const meta = agendaSourceMeta(source);
  const refKind = meta ? meta.refKind : (ref && ref.refKind) || '';
  const refId = ref && ref.id ? String(ref.id) : '';
  return `${source}:${refId || refKind}`;
}

/** 应到范围：制度报送党员大会 → 支部党员大会；其余 → 支委会 */
export function agendaAttendeeScope(source) {
  return _resolveSourceKey(String(source || ''), {}) === 'party-meeting-pending'
    ? 'branch-party-meeting'
    : 'committee';
}

/** 来源记录的时点（用于算「待议天数」；无可用时点 → null） */
export function agendaSourceDate(ref) {
  if (!ref || typeof ref !== 'object') return null;
  const raw = ref.createdAt || ref.submittedAt || ref.uploadedAt || ref.updatedAt
    || (ref.committeeRequest && ref.committeeRequest.at) || ref.date || ref.at || '';
  if (!raw) return null;
  const t = Date.parse(String(raw));
  return Number.isFinite(t) ? t : null;
}

/** 待议天数（整数；无时点 → null）——服务端算，客户端只呈现 */
export function agendaAgeDays(ref, now = Date.now()) {
  const t = agendaSourceDate(ref);
  if (t === null) return null;
  return Math.max(0, Math.floor((now - t) / 86400000));
}

/**
 * 分类一条来源记录。
 * @param {Object} input `{ source: string, ref: Object }`；兼容旧 `{ group: string }`
 * @param {string} [input.source] 六类来源 / 另纳入两类 / 四反例的 value
 * @param {Object} [input.ref] 该来源的原始记录（taskforce / issue / branch-doc / member / activity）
 * @returns {{source:string,sourceLabel:string,refKind:string,refId:string,item:string,type:string,
 *   typeLabel:string,step:string|null,needDecision:boolean,expected:string,status:string,
 *   dedupeKey:string,attendees:string,kinds:string[],branchDocId?:string,brandActivityId?:string,
 *   approvalActivityId?:string,personIds?:string[],toStage?:string,ageDays:number|null}}
 */
export function classifyAgendaItem(input, { now = Date.now() } = {}) {
  const { source: rawSource, ref } = _inputOf(input);
  const source = _resolveSourceKey(rawSource, ref);
  const meta = agendaSourceMeta(source);
  const type = meta ? meta.type : 'sync';
  const typeMeta = agendaTypeMeta(type);
  return {
    source,
    sourceLabel: agendaSourceLabel(source),
    refKind: meta ? meta.refKind : '',
    refId: ref && ref.id ? String(ref.id) : '',
    item: _itemTextOf(source, ref || {}),
    type,
    typeLabel: typeMeta.label,
    step: meta ? (meta.step || null) : null,
    needDecision: typeMeta.needDecision,
    expected: (meta && meta.expected) || typeMeta.expected,
    status: source === 'party-meeting-pending' ? 'reported' : 'pending',
    dedupeKey: agendaDedupeKey({ source: rawSource, ref }),
    attendees: agendaAttendeeScope(source),
    ageDays: agendaAgeDays(ref, now),
    ..._agendaPatchOf(source, ref || {}),
  };
}
