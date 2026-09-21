// role: [工程师]+[AI]
// agenda-form.js — 创建表单议程收集的纯数据处理（TDD 红测试 agenda-closure-core 目标）
// 支书 2026-09-01 裁决：议程类型不互斥（一条议程可同时标记「讨论文件」「待讨论名单」），
// 按自增列表思路写入，写入同时辅以高级选项。「待讨论名单」= 名单统一阶段转换 + 多选人员。
// 本模块只做数据规范化，UI 接线在 calendar-tab。
// 2026-09-21 批次 127（`SOP-B-33` 取乙档）：本文件**再加一处纯函数** `buildAgendaCandidates`——
// 「拟上会」清单的归集单一源（写议程时从这一张清单勾）；IO 仍由各处 UI 自己做（见下方该段注释）。

import { generateId } from '../../../core/id.js?v=20260921n';
// 事项领域单一源（services/issues.js 末尾的 ISSUE_DOMAINS；四类逐字照母本
// 《常见工作场景快速指南》「意见建议类型」表）——本模块只取「标签 / 建议归口」两个纯函数，
// 不读 IssueStore（IO 由调用方做）。
import { ISSUE_DOMAINS, issueDomainLabel, issueDomainSuggest } from '../../../services/issues.js?v=20260921n';

/**
 * 将创建/编辑表单的议程行收集为规范化议程数组。
 * 每条议程生成 id（供详情页「记录通过」按 id 匹配，recordAgendaResult 依赖）。
 * 「待讨论名单」：personIds 多选 + toStage（目标阶段，S-2 界面仅「预备党员/正式党员」两项）；
 * personStages = 逐人当前阶段快照（id→阶段，S-2 由写入面板按所选对象各自现值推导，
 * 供 agenda-follow-up 逐人写申请 fromStage）；fromStage 字段保留仅兼容历史数据（界面已不让人选「从什么」）。
 * @param {Array<{item?:string, host?:string, kinds?:string[], branchDocId?:string, personIds?:string[], personId?:string, fromStage?:string, toStage?:string, personStages?:Object<string,string>}>} rows
 * @returns {Array<{id:string, item:string, host:string, kinds:string[], branchDocId?:string, personIds?:string[], fromStage?:string, toStage?:string, personStages?:Object<string,string>}>}
 */
export function collectAgendaRows(rows = []) {
  return rows
    .map((row) => {
      const item = String(row.item || '').trim();
      if (!item) return null;
      const kinds = Array.isArray(row.kinds) ? [...row.kinds] : [];
      const out = {
        id: row.id || generateId('ag'),
        item,
        host: String(row.host || '').trim(),
        kinds,
      };
      if (kinds.includes('discussion-file') && row.branchDocId) {
        out.branchDocId = row.branchDocId;
      }
      // 品牌认定提案（2026-09-21 批次 132）：议程项带回指「被提案的那场活动」，记录结果时据此落认定
      if (kinds.includes('brand-designation') && row.brandActivityId) {
        out.brandActivityId = row.brandActivityId;
      }
      if (kinds.includes('attendee-list')) {
        // 待讨论名单：名单统一阶段转换 + 多选人员（兼容旧单值 personId）
        const personIds = Array.isArray(row.personIds) ? row.personIds : (row.personId ? [row.personId] : []);
        if (personIds.length > 0) out.personIds = personIds;
        if (row.fromStage) out.fromStage = row.fromStage; // 兼容历史数据（S-2 界面已隐藏）
        if (row.toStage) out.toStage = row.toStage;
        // S-2：逐人当前阶段快照（多对象阶段可各不相同，按人分别记录）
        if (row.personStages && typeof row.personStages === 'object' && !Array.isArray(row.personStages)) {
          const map = {};
          for (const [id, stage] of Object.entries(row.personStages)) {
            if (id && stage) map[id] = stage;
          }
          if (Object.keys(map).length > 0) out.personStages = map;
        }
      }
      return out;
    })
    .filter(Boolean);
}

// ════════════════════════════════════════════════════════════════
//  「拟上会」清单（2026-09-21 批次 127 · `SOP-B-33` 取（乙）档 · `D-411` 建议档）
// ════════════════════════════════════════════════════════════════
// 口径（支书 2026-09-21 总口径「支委会就是 支部的领导管理机构」＋ 本批按推荐档执行）：
//   · **只做「待审议事项」一个统一入口**——先把「该上会的事」归集为**一张清单**，
//     写议程时从这一张清单里勾；**不按来源各做导入口**（专班 / 意见反馈 / 草案各一个入口＝甲档，
//     未被采纳）。清单的**单一源＝本函数**，两处消费：
//       ① 写入活动的议程区块（`calendar-tab.js`，主落点：写议程时勾）；
//       ② 支委会会议页的「提取议程」（`party-committee-meeting-entry.js`，同一张清单）。
//   · **不复用第二套事实源**：每一类都取该项的**既有出口**，勾选后只在议程项上留回指；
//     来源本身一字不改（与专班那条既有范式同法）。
//   · 归集的是「**待办 / 待议**」态，不是全量：办结 / 已排入的自会消失。
//
// 放哪几类、为什么（逐类给出处，勿凭印象增删）：
//   ① `taskforce` 专班报送 —— `TaskForceRecordStore.listCommitteeRequests()`（既有的唯一「一键」范式，
//      母本 `COMMISSIONER_DUTY_FRAMEWORK.md:418`：专班需求「支委会审议立项」）。
//   ② `issue` 意见反馈 —— 母本《常见工作场景快速指南》「意见建议类型」表（`:439`-`:444`）里
//      **归口含「支委会」的两类**（制度建设建议 → 支委会讨论制度修改 / 其他建议 → 支书提交支委会研究）
//      ——归口判据由该表**派生**（见下方 `COMMITTEE_ISSUE_DOMAINS`），不手写第二份四类名单。
//   ③ `draftDoc` 制度草案 —— 母本同表 + `:450`「制度修改由支委会讨论」；来源＝草案态支部文件
//      （与会前草案下拉**同一判据**：`!status || status==='draft'`）。
//   ④ `recommend` 发展对象推荐 —— 母本 `组织委员工作流程指南.md:181`「发展对象 | **支委会讨论确定**」；
//      「积极分子 → 发展对象」这道门见 `member-confirmation.js::hasPassedCommitteeDiscussion`
//      （批次 127 / `SOP-B-27`）：**先上会讨论通过，才可发起阶段变更**。
//   ⑤ `brand` 品牌认定提案 —— 支书 2026-09-21 口径二（逐字）：「**支委/党小组组长均可以提案，
//      支委会（如果有党小组组长则是支委扩大会）通过后确定。**」；候选＝**已提案、尚未认定**的活动
//      （判据单一源 `services/activity.js::listBrandProposals` / `brandProposalOf`）；
//      勾入后议程行带 `brandActivityId`，**记录「通过」才置 `isBrand`**（`applyBrandDesignationResult`）。
//   ⚠ **未放「上报事项」**（`reviewRequests`）：它走**支部 → 党委**通道（`secretary/report-up-tab.js:1`-`:6`），
//     且母本里「上报党委」是支委会决议**之后**的下游动作（`DEVELOPMENT_PATH.md:207`）——不是该上会的事。
//     本条与 `D-411` 取证第 5 条第 ② 款「上报事项……与支委会议程无关」一致。
// ════════════════════════════════════════════════════════════════

/** 归口含「支委会」的事项领域值集（**由 `ISSUE_DOMAINS` 派生**，勿另写四类名单） */
export const COMMITTEE_ISSUE_DOMAINS = ISSUE_DOMAINS
  .filter((d) => String(d.suggest || '').includes('支委会'))
  .map((d) => d.value);

/** 清单类目（顺序＝呈现顺序；`hint` 说明这一类「为什么在这张清单上」） */
export const AGENDA_CANDIDATE_GROUPS = [
  { key: 'taskforce', label: '专班报送（待支委会表决）', hint: '专班需求支委会审议立项' },
  { key: 'issue', label: '意见反馈（归口支委会）', hint: '制度建设建议 / 其他建议——支委会讨论或研究' },
  { key: 'draftDoc', label: '制度草案（草案态支部文件）', hint: '制度修改由支委会讨论' },
  { key: 'partyVote', label: '待报送党员大会表决的制度', hint: '支委会已审议通过并决定报送党员大会' },
  { key: 'recommend', label: '发展对象推荐（要先经支委会讨论）', hint: '推荐为发展对象须支委会讨论通过' },
  { key: 'brand', label: '品牌认定提案（待支委会审议）', hint: '品牌认定＝提案 → 支委会通过后确定' },
];

/**
 * 归集成一张「拟上会」清单（**纯函数**：只做归类与文案，不读任何 store）。
 *
 * @param {Object} input
 * @param {Array} [input.taskforceProposals] 专班报送（`TaskForceRecordStore.listCommitteeRequests()` 产物）
 * @param {Array} [input.issues] 意见反馈（调用方先 `IssueStore.loadAll()`，再取**未办结 / 未隐藏 / 未合并**）
 * @param {Array} [input.draftDocs] 支部文件（调用方按 `services/branch-doc.js::isAgendaDraftDoc` 取：普通文件草案 ＋ 制度链上尚未成为现行版的两种态）
 * @param {Array} [input.members] 成员档案（`PersonStore.getMembers()`；本函数只取「积极分子」作推荐候选）
 * @param {Object} [input.stageEntries] 发展推进覆盖档案（`loadDevStageOverrides()` 产物：{ personId: { stage, entryDate } }）
 * @param {Array} [input.brandProposals] 品牌认定提案（`services/activity.js::listBrandProposals()` 产物：
 *   `{ id, title, proposal }`；调用方可自行补齐 `proposedByName` 供展示）
 * @returns {Array<{group:string, refId:string, text:string, meta:string, item:string, host:string,
 *   kinds:string[], branchDocId?:string, brandActivityId?:string, personIds?:string[], toStage?:string}>}
 *   `item` / `host` / `kinds` / … 即议程行入参（可直接喂 `_addAgendaRow` / `collectAgendaRows`）。
 */
export function buildAgendaCandidates({
  taskforceProposals = [],
  issues = [],
  draftDocs = [],
  members = [],
  stageEntries = {},
  brandProposals = [],
} = {}) {
  const rows = [];

  // ① 专班报送（既有范式：报送 → 归集为「待议」→ 排入 → 自动建议程项）
  for (const p of Array.isArray(taskforceProposals) ? taskforceProposals : []) {
    if (!p || !p.id) continue;
    const kindLabel = p.kind === 'dissolve' ? '解散' : '发起';
    const name = p.name || '未命名专班';
    rows.push({
      group: 'taskforce',
      refId: p.id,
      text: `审议专班「${name}」（${kindLabel}）`,
      meta: `专班报送${p.by ? ` · 报送人 ${p.by}` : ''}${p.note ? ` · ${p.note}` : ''}`,
      item: `审议专班「${name}」（${kindLabel}）`,
      host: '支书',
      kinds: [],
    });
  }

  // ② 意见反馈（只取**归口含支委会**的两类；领域标签与建议归口全照母本表）
  for (const it of Array.isArray(issues) ? issues : []) {
    if (!it || !it.id) continue;
    if (!COMMITTEE_ISSUE_DOMAINS.includes(it.domain)) continue;
    const title = it.title || '未命名';
    rows.push({
      group: 'issue',
      refId: it.id,
      text: `审议反馈「${title}」`,
      meta: `意见反馈 #${it.number || '—'} · ${issueDomainLabel(it.domain)} · 建议归口：${issueDomainSuggest(it.domain)}`,
      item: `审议反馈「${title}」`,
      host: '支书',
      kinds: [],
    });
  }

  // ③ 制度草案（会前草案下拉的同一判据与同一引用字段 branchDocId）
  //    2026-09-21 批次 129（制度链）：制度在「支委会已审议通过、决定报送党员大会」态时**另立一类**
  //    （`partyVote`）——那是给**支部党员大会**表决用的那一条腿（母本 `常见工作场景快速指南.md:310`
  //    「…/ 全体党员（报送后）」），与「待支委会审议」的制度草案分开列，免得支书把两类混着上会。
  for (const d of Array.isArray(draftDocs) ? draftDocs : []) {
    if (!d || !d.id) continue;
    const title = d.title || d.fileName || '未命名草案';
    const isInstitution = d.purpose === 'institution';
    const pendingPartyVote = isInstitution && d.status === 'pending-party-meeting';
    rows.push({
      group: pendingPartyVote ? 'partyVote' : 'draftDoc',
      refId: d.id,
      text: `讨论文件「${title}」`,
      meta: pendingPartyVote
        ? '制度（支委会已审议通过，待党员大会表决）'
        : (isInstitution ? '制度草案（待支委会审议）' : '制度草案（草案态支部文件）'),
      item: `讨论文件「${title}」`,
      host: '支书',
      kinds: ['discussion-file'],
      branchDocId: d.id,
    });
  }

  // ④ 发展对象推荐（候选＝现为「积极分子」的成员；讨论挂进既有支委会会议：
  //    议程行＝待讨论名单 + 目标阶段「发展对象」，记录通过即生成该人的成员变更申请＝门的留痕）
  for (const m of Array.isArray(members) ? members : []) {
    if (!m || !m.id || m.developStage !== '积极分子') continue;
    const name = m.name || m.id;
    const entryDate = stageEntries && stageEntries[m.id] ? (stageEntries[m.id].entryDate || '') : '';
    rows.push({
      group: 'recommend',
      refId: m.id,
      text: `推荐「${name}」为发展对象`,
      meta: `现为积极分子${entryDate ? ` · 进入阶段日期 ${entryDate}` : ' · 进入阶段日期未记载'}`,
      item: `讨论推荐「${name}」为发展对象`,
      host: '支书',
      kinds: ['attendee-list'],
      personIds: [m.id],
      toStage: '发展对象',
    });
  }

  // ⑤ 品牌认定提案（2026-09-21 批次 132 · 支书口径二）：候选＝已提案、尚未认定的活动；
  //    议程行带 `brandActivityId`（回指被提案的那场活动）——**记录「通过」才置 `isBrand`**
  //    （判据与状态迁移单一源 `services/activity.js::applyBrandDesignationResult`）。
  for (const bp of Array.isArray(brandProposals) ? brandProposals : []) {
    if (!bp || !bp.id) continue;
    const title = bp.title || bp.id;
    const proposer = (bp.proposal && bp.proposal.proposedByName) || bp.proposedByName || '';
    rows.push({
      group: 'brand',
      refId: bp.id,
      text: `审议品牌认定「${title}」`,
      meta: `品牌认定提案${proposer ? ` · 提案人 ${proposer}` : ''}${bp.proposal && bp.proposal.note ? ` · ${bp.proposal.note}` : ''}`,
      item: `审议品牌认定「${title}」`,
      host: '支书',
      kinds: ['brand-designation'],
      brandActivityId: bp.id,
    });
  }

  return rows;
}