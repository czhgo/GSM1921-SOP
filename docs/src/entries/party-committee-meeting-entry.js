// role: [工程师]+[AI]
// party-committee-meeting-entry.js — 支委会会议页入口（线上召开 · 最小可用闭环；2026-09-20 批次 105 / D-526）
//
// 做什么：把「线上召开支委会」这条链摆在一处——选/建一场支委会并标为线上召开 → 从**既有来源**
//   提取议程（专班报送 / 意见反馈）→ 委员在线表态 → 支书汇总并截止 → 留存、查阅讨论结果。
//
// 复用（不另造第二事实源、不新增表）：
//   · 会议实体 = 既有「活动」（type='支委会' / scenarioId='branch-committee'，voteConfig 表决配置）
//   · 表态 = `services/committee-vote.js` + `mockDB.agendaVotes`（既有异步表决机制，本页只挂既有组件）
//   · 汇总/截止 = `components/vote-summary-panel.js`（既有支书端汇总矩阵 + 截止）
//   · 讨论结果留存 = 议程项 result（`services/agenda-follow-up.js::recordAgendaResult`，与
//     inspector「记录会议结果」同一函数）；锁定态 = 活动 `votesLocked`（既有）
//
// 效力口径**已定**（支书 2026-09-20 定案，见 D-538）：线上支委会与线下支委会**完全同等效力**——
//   线上表决与线上记录的讨论结果即终局，不需线下追认。
// 其余三条（讨论结果对外可见范围 / 缺席处理 / 是否并行线下那 9 条任务）**由「完全同等效力」推导**、
//   支书未逐条明答（D-538）——本页**只如实呈现既有记录**，推导获确认前不写任何判定规则。
//
// 数据源装配：与 activity-entry.js / notice-entry.js 同款——有 API 会话时先切数据源并 init() 拉全量
//   再渲染（`module-load.test.mjs::E2` 独立页装配断言要求）。
import { renderSidebar } from '../components/sidebar.js?v=20260921g';
import { renderHeader } from '../components/header.js?v=20260921g';
import { registerApiAdapter, init as dataInit, setDataSource, notifyDataLoaded, getAdapter, persist } from '../core/data-adapter.js?v=20260921g';
import { ApiAdapter } from '../core/api-adapter.js?v=20260921g';
import { mockDB } from '../core/domain.js?v=20260921g';
import { AuthStore } from '../services/auth.js?v=20260921g';
import { PersonStore, getPersonName } from '../services/person.js?v=20260921g';
import { BranchService } from '../services/runtime.js?v=20260921g';
import { TaskForceRecordStore } from '../services/taskforce.js?v=20260921g';
import { IssueStore } from '../services/issues.js?v=20260921g';
import { resolveVoterIds, defaultVoteConfig, optionSetOf, isAnonymousActivity } from '../services/vote-config.js?v=20260921g';
import { fetchVotes, tallyForItem } from '../services/committee-vote.js?v=20260921g';
import { renderVoteWidget } from '../components/vote-widget.js?v=20260921g';
import { renderVoteSummary } from '../components/vote-summary-panel.js?v=20260921g';
import { recordAgendaResultForActivity } from '../services/agenda-follow-up.js?v=20260921g';
// 「拟上会」清单单一源（2026-09-21 批次 127 · `SOP-B-33` 取（乙）档）：本页的「提取议程」
// 与写入活动的议程区块共用**同一张清单**（agenda-form.js::buildAgendaCandidates）——
// 原按来源分两块的呈现（专班报送 / 意见反馈）已按乙档收为一张清单（不按来源各做导入口）。
import { buildAgendaCandidates, AGENDA_CANDIDATE_GROUPS } from '../entries/tabs/secretary/agenda-form.js?v=20260921g';
import { listDocs as listBranchDocs } from '../services/branch-doc.js?v=20260921g';
import { loadDevStageOverrides } from '../services/member-confirmation.js?v=20260921g';
import { showToast, escHtml as esc } from '../core/utils.js?v=20260921g';
import { generateId } from '../core/id.js?v=20260921g';

renderSidebar('dashboard');
renderHeader('dashboard');

const ROOT = document.getElementById('pcm-content');

// ── 数据 hydrate（同 activity-entry.js：有 API 会话先切数据源 + init() 拉全量）──────────
async function _hydrateData() {
  try {
    registerApiAdapter(ApiAdapter);
    let token = null;
    try { token = sessionStorage.getItem('gsm1921-api-token'); } catch (_) { /* 隐私模式无 sessionStorage */ }
    if (token) {
      setDataSource('api', { apiBaseUrl: '', authToken: token });
      try {
        await dataInit();
      } catch (e) {
        console.warn('[party-committee-meeting] API 数据加载失败，回退本地 mock', e);
        setDataSource('mock');
        BranchService.loadDB();
      }
    } else {
      BranchService.loadDB();
    }
  } catch (e) {
    console.warn('[party-committee-meeting] 数据加载异常（仍尝试内存兜底）', e);
  } finally {
    try { notifyDataLoaded(); } catch (_) { /* 静默 */ }
  }
}

// ── 基础读取（全部读既有数据源，不复制）────────────────────────────────
/** 支委名单（单一源 = services/vote-config.js::resolveVoterIds('committee')） */
function committeeIds() { return resolveVoterIds('committee'); }
/** 支委会场次（既有活动实体；按日期新→旧） */
function meetings() {
  return (mockDB.activities || [])
    .filter((a) => a && (a.type === '支委会' || a.scenarioId === 'branch-committee'))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
}
function findAct(id) { return (mockDB.activities || []).find((a) => a.id === id) || null; }
function isSecretaryOrDeputy() {
  const r = AuthStore.getCurrentUser()?.role;
  return r === 'secretary' || r === 'deputy-secretary';
}
function isAsync(act) { return !!act && !!act.voteConfig && act.voteConfig.mode === 'async'; }
function isOnlineMeeting(act) { return isAsync(act) && Array.isArray(act.agenda) && act.agenda.some((x) => x && x.id); }

// 页面状态
let currentId = null;

// ════════════════════════════════════════════════════════════════
//  渲染
// ════════════════════════════════════════════════════════════════

function renderShellDenied() {
  const role = AuthStore.getCurrentUser()?.role;
  const page = AuthStore.getPageForRole('workspace', role) || 'visitor.html';
  ROOT.innerHTML = `
    <div class="card rounded-xl p-8 text-center">
      <p class="font-title-cn text-base font-bold text-gray-800">本页仅支委可用</p>
      <p class="text-sm text-gray-500 mt-2">当前登录账号不在本支部支委名单（支书 / 副支书 / 组织委员 / 宣传委员 / 纪检委员）内，不能查看或操作支委会会议。</p>
      <p class="text-sm mt-4"><a href="./workspace/${esc(page)}" class="text-blue-600 hover:underline">← 返回我的工作台</a></p>
    </div>`;
}

/** 会议选择区（既有支委会场次 + 新建线上支委会） */
function selectSectionHtml() {
  const list = meetings();
  const opts = list.map((a) => {
    const tag = a.votesLocked === true ? '已截止' : (isAsync(a) ? '线上召开' : '线下/未开表决');
    return `<option value="${esc(a.id)}"${a.id === currentId ? ' selected' : ''}>${esc(a.date || '—')} · ${esc(a.title || '未命名')}（${tag}）</option>`;
  }).join('');
  return `
    <div class="card rounded-xl p-5">
      <p class="text-sm font-semibold text-gray-700 mb-3">① 选一场支委会（线上召开）</p>
      <div class="flex flex-wrap items-end gap-2">
        <label class="text-xs text-gray-500">现有支委会场次
          <select id="pcm-pick" class="input-flat text-xs mt-1 block" style="min-width:320px">
            ${opts || '<option value="">（暂无支委会场次）</option>'}
          </select>
        </label>
        <label class="text-xs text-gray-500">新建线上支委会名称（可留空）
          <input id="pcm-new-title" class="input-flat text-xs mt-1 block" style="min-width:240px" placeholder="如：9 月支委会（线上）">
        </label>
        <button id="pcm-create" type="button" class="text-xs px-3 py-1.5 rounded-lg text-white font-medium" style="background:#C8102E;">新建线上支委会</button>
      </div>
      <p class="text-[11px] text-gray-500 mt-2">「线上召开」＝沿用既有活动的异步表决配置（支委为应到名单，委员线上表态）。本页不改动活动本身的线下流程设置。</p>
    </div>`;
}

/** 「拟上会」清单的数据归集（各取既有出口；与写入活动的议程区块同一张清单、同一判据） */
async function loadCandidates() {
  const src = { taskforceProposals: [], issues: [], draftDocs: [], members: [], stageEntries: {} };
  try { src.taskforceProposals = TaskForceRecordStore.listCommitteeRequests(); }
  catch (e) { console.warn('[party-committee-meeting] 专班待议加载失败：', e); }
  try { src.issues = IssueStore.getAll().filter((i) => i.status === 'open' && !i.hidden && !i.mergedInto); }
  catch (e) { console.warn('[party-committee-meeting] 意见反馈读取失败：', e); }
  try {
    const docs = await listBranchDocs();
    src.draftDocs = docs.filter((d) => !d.status || d.status === 'draft');
  } catch (e) { console.warn('[party-committee-meeting] 制度草案加载失败：', e); }
  try { src.members = PersonStore.getMembers(); }
  catch (e) { console.warn('[party-committee-meeting] 成员档案读取失败：', e); }
  try { src.stageEntries = loadDevStageOverrides(); }
  catch (e) { console.warn('[party-committee-meeting] 发展推进档案读取失败：', e); }
  return buildAgendaCandidates(src);
}

/** 议程提取区（**一张「拟上会」清单**：按类目分组，勾谁上会；已在议程中的置灰） */
function extractSectionHtml(act, candidates = []) {
  const usedRefs = new Set((act.agenda || []).filter((x) => x && x.sourceRef).map((x) => `${x.sourceRef.kind}:${x.sourceRef.id}`));
  const refKindOf = { taskforce: 'taskforce-proposal', issue: 'issue', draftDoc: 'branch-doc', recommend: 'member' };
  const row = (c) => {
    const used = usedRefs.has(`${refKindOf[c.group]}:${c.refId}`);
    return `
    <label class="flex items-start gap-2 p-2.5 rounded-lg border border-gray-100 ${used ? 'opacity-60' : 'hover:bg-gray-50 cursor-pointer'}">
      <input type="checkbox" class="pcm-cand mt-0.5" value="${esc(c.refId)}" data-group="${esc(c.group)}"${used ? ' disabled' : ''}>
      <span class="flex-1 min-w-0">
        <span class="block text-xs font-medium text-gray-700">${esc(c.text)}</span>
        <span class="block text-[11px] text-gray-500 mt-0.5">${esc(c.meta)}${used ? ' · 已在议程中' : ''}</span>
      </span>
    </label>`;
  };
  const groupsHtml = candidates.length
    ? AGENDA_CANDIDATE_GROUPS.map((g) => {
      const list = candidates.filter((c) => c.group === g.key);
      if (!list.length) return '';
      return `<div>
          <p class="text-xs font-medium text-gray-600 mb-1.5">${esc(g.label)} · ${list.length}<span class="text-[11px] text-gray-500 font-normal ml-1.5">${esc(g.hint)}</span></p>
          <div class="space-y-1.5">${list.map(row).join('')}</div>
        </div>`;
    }).join('')
    : `<p class="text-xs text-gray-400">当前没有待上会的事项（专班报送 / 归口支委会的意见反馈 / 制度草案 / 待推荐的发展对象）。</p>`;
  return `
    <div class="card rounded-xl p-5">
      <p class="text-sm font-semibold text-gray-700 mb-1">② 提取支委会议程</p>
      <p class="text-[11px] text-gray-500 mb-3">一张「拟上会」清单（不按来源各做入口）：勾选后加入本场议程，只在议程项上留回指，不改动来源本身。</p>
      <div class="space-y-3">${groupsHtml}</div>
      <div class="mt-3 flex items-center gap-3">
        <button id="pcm-extract" type="button" class="text-xs px-3 py-1.5 rounded-lg text-white font-medium" style="background:#C8102E;">加入本场议程</button>
        <span class="text-[11px] text-gray-500">勾选后可一次加入多条</span>
      </div>
    </div>`;
}

/** 议程与「我的表态」（复用既有表决组件；委员端） */
function agendaSectionHtml(act) {
  const me = AuthStore.getCurrentUser();
  const voterIds = Array.isArray(act.voteConfig?.voterIds) ? act.voteConfig.voterIds : [];
  const canVote = !!me && voterIds.includes(me.personId);
  const items = (act.agenda || []).filter((a) => a && a.item);
  if (!items.length) {
    return `
      <div class="card rounded-xl p-5">
        <p class="text-sm font-semibold text-gray-700 mb-1">③ 议程与表态</p>
        <p class="text-sm text-gray-500">本场议程为空：先在上一步提取议程，或到「活动管理」手工补充议程。</p>
      </div>`;
  }
  const rows = items.map((a, i) => `
    <div class="rounded-xl border border-gray-100 p-3.5">
      <div class="flex items-start gap-2 text-sm">
        <span class="text-xs text-gray-500 flex-shrink-0 w-5 pt-0.5">${i + 1}.</span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-sm font-medium text-gray-700">${esc(a.item)}</span>
            ${a.result ? `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium ${a.result === 'passed' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}">${a.result === 'passed' ? '已通过' : (a.result === 'partial' ? '部分通过' : '未通过')}</span>` : ''}
          </div>
          ${a.host ? `<div class="text-xs text-gray-500 mt-0.5">（主持人：${esc(a.host)}）</div>` : ''}
        </div>
      </div>
      ${a.id ? `<div class="vote-widget-slot mt-2" data-vote-item-id="${esc(a.id)}"></div>` : '<div class="text-[11px] text-gray-500 mt-2">该条无表决编号，仅作议程记录。</div>'}
    </div>`).join('');
  return `
    <div class="card rounded-xl p-5">
      <p class="text-sm font-semibold text-gray-700 mb-1">③ 议程与表态</p>
      <p class="text-[11px] text-gray-500 mb-3">${canVote ? '你是本场应到表决人，可就每条议程表态（同意 / 异议 / 附言，可改票）。' : '你不在本场应到表决名单内，以下为只读议程。'}</p>
      <div class="space-y-3">${rows}</div>
    </div>`;
}

/** 汇总与截止（支书/副支书；复用既有汇总矩阵组件） */
function summarySectionHtml(act) {
  if (!isSecretaryOrDeputy()) return '';
  return `
    <div class="card rounded-xl p-5">
      <p class="text-sm font-semibold text-gray-700 mb-3">④ 汇总与截止（支书 / 副支书）</p>
      <div id="pcm-summary"></div>
    </div>`;
}

/** 讨论结果（留存 / 查阅位）——读既有留存：议程项 result + 表决记录 */
function resultSectionHtml(act, votes) {
  const os = optionSetOf(act);
  const anonymous = isAnonymousActivity(act);
  const labelOf = (pos) => (os.labels && os.labels[pos]) || pos;
  const items = (act.agenda || []).filter((a) => a && a.id);
  const canRecord = isSecretaryOrDeputy();
  const body = items.length ? items.map((a, i) => {
    const rows = (votes || []).filter((v) => v && v.agendaItemId === a.id);
    const ballots = rows.filter((v) => v.personId);
    let detail;
    if (anonymous) {
      const t = tallyForItem(votes, a.id);
      const parts = Object.entries(t).map(([k, n]) => `${labelOf(k)} ${n}`).join(' · ');
      detail = `${parts || '暂无人表态'}（无记名：${ballots.length} 人已表态，不展示个人选项）`;
    } else {
      detail = ballots.length
        ? ballots.map((v) => `${getPersonName(v.personId) || v.personId}：${labelOf(v.position)}${v.note ? '（' + v.note + '）' : ''}`).join('；')
        : '暂无人表态';
    }
    const resultLabel = a.result === 'passed' ? '已记录：通过'
      : a.result === 'rejected' ? '已记录：未通过'
        : a.result === 'partial' ? '已记录：部分通过' : '尚未记录结果';
    const recorder = a.recordedBy ? `${getPersonName(a.recordedBy) || a.recordedBy}${a.recordedAt ? ' · ' + String(a.recordedAt).slice(0, 16).replace('T', ' ') : ''}` : '';
    return `
      <div class="rounded-xl border border-gray-100 p-3.5">
        <div class="flex items-start gap-2">
          <span class="text-xs text-gray-500 flex-shrink-0 w-5 pt-0.5">${i + 1}.</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-700">${esc(a.item)}</p>
            <p class="text-xs text-gray-500 mt-1">表态记录：${esc(detail)}</p>
            <p class="text-xs text-gray-500 mt-0.5">讨论结果：${esc(resultLabel)}${recorder ? '（记录人 ' + esc(recorder) + '）' : ''}</p>
            ${canRecord ? `<div class="mt-2 flex items-center gap-2">
              <button type="button" class="pcm-record text-xs px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-50" data-item-id="${esc(a.id)}" data-result="passed">记录通过</button>
              <button type="button" class="pcm-record text-xs px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-50" data-item-id="${esc(a.id)}" data-result="rejected">记录未通过</button>
            </div>` : ''}
          </div>
        </div>
      </div>`;
  }).join('') : '<p class="text-sm text-gray-500">本场暂无带编号的议程，暂无可查阅的讨论结果。</p>';
  return `
    <div class="card rounded-xl p-5">
      <p class="text-sm font-semibold text-gray-700 mb-1">⑤ 讨论结果（留存 / 查阅）</p>
      <p class="text-[11px] text-gray-500 mb-3">留存口径＝议程项结果（与「活动详情」的记录会议结果同一处）+ 委员表态记录。效力（2026-09-20 定案）：线上与线下完全同等效力，这里记录的讨论结果即终局。</p>
      <div class="space-y-3" id="pcm-result">${body}</div>
      <p class="text-[11px] text-gray-500 mt-3">也可在 <a href="./activity.html?id=${encodeURIComponent(act.id)}" class="text-blue-600 hover:underline">活动详情</a> 查看该场会议的全部记录。</p>
    </div>`;
}

/** 效力口径（已定）＋ 由它推导、尚待确认的三条（D-538） */
function rulingNoticeHtml() {
  return `
    <div class="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
      <p class="text-xs font-semibold text-amber-800">① 线上与线下完全同等效力（2026-09-20 定案）：线上表决与线上记录的讨论结果即终局，不需线下追认。</p>
      <p class="text-[11px] text-amber-800 mt-1.5 leading-relaxed">
        以下三条是由上面这条口径推导出来的，尚未逐条明答，请支书确认或推翻：② 讨论结果的可见范围与线下一致（即支委会内部）；
        ③ 支委缺席按线下同一规则处理；④ 线上支委会也走线下会议的那套任务（两条线合流）。
        确认之前，本页不代作判定，只如实呈现已存记录（表态 / 锁定 / 结果）。
      </p>
    </div>`;
}

async function render() {
  const me = AuthStore.getCurrentUser();
  if (!me) {
    ROOT.innerHTML = '<div class="card rounded-xl p-8 text-center text-sm text-gray-500">未登录，请先登录。</div>';
    return;
  }
  if (!committeeIds().includes(me.personId)) { renderShellDenied(); return; }

  const list = meetings();
  if (!currentId || !findAct(currentId)) {
    const online = list.find((a) => isAsync(a));
    currentId = (online || list[0] || {}).id || null;
  }
  const act = currentId ? findAct(currentId) : null;
  const votes = act ? await fetchVotes(act.id) : [];
  const candidates = act ? await loadCandidates() : [];

  const currentBlock = !act
    ? `<div class="card rounded-xl p-5"><p class="text-sm text-gray-500">暂无支委会场次：可在上方新建一场线上支委会。</p></div>`
    : `<div class="card rounded-xl p-5">
         <div class="flex items-start justify-between gap-3 flex-wrap">
           <div class="min-w-0">
             <p class="font-title-cn text-base font-bold text-gray-800">${esc(act.title || '未命名会议')}</p>
             <p class="text-xs text-gray-500 mt-1">${esc(act.date || '—')}${act.location ? ' · ' + esc(act.location) : ''} · ${isAsync(act) ? '线上召开（异步表态）' : '未启用线上表决'}${act.votesLocked === true ? ' · 已截止' : ''}</p>
           </div>
           <a href="./activity.html?id=${encodeURIComponent(act.id)}" class="text-xs text-blue-600 hover:underline flex-shrink-0">活动详情 →</a>
         </div>
         ${isAsync(act) ? '' : '<p class="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-3">本场未启用线上表决配置：如需委员线上表态，可在「活动管理」写入线上异步表决，或上方新建一场线上支委会。</p>'}
       </div>
       ${extractSectionHtml(act, candidates)}
       ${agendaSectionHtml(act)}
       ${summarySectionHtml(act)}
       ${resultSectionHtml(act, votes)}`;

  ROOT.innerHTML = `
    <div class="space-y-5">
      <div class="card rounded-xl p-6">
        <h2 class="font-title-cn text-xl font-bold text-gray-800">支委会会议（线上召开）</h2>
        <p class="text-sm text-gray-500 mt-1.5">一条链：选线上召开 → 提取/整理议程 → 委员表态 → 汇总并截止 → 留存、查阅讨论结果。</p>
      </div>
      ${rulingNoticeHtml()}
      ${selectSectionHtml()}
      ${currentBlock}
    </div>`;

  bindSelectSection();
  if (act) {
    bindExtract(act, candidates);
    await bindAgenda(act);
    bindSummary(act);
    bindRecord(act);
  }
}

// ════════════════════════════════════════════════════════════════
//  交互
// ════════════════════════════════════════════════════════════════

function bindSelectSection() {
  const pick = document.getElementById('pcm-pick');
  pick?.addEventListener('change', () => {
    currentId = pick.value || null;
    window.history.replaceState(null, '', `${location.pathname}?id=${encodeURIComponent(currentId || '')}`);
    render();
  });
  document.getElementById('pcm-create')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (btn.dataset.processing === '1') return;
    btn.dataset.processing = '1';
    btn.disabled = true;
    btn.style.opacity = '0.5';
    try {
      await createOnlineMeeting(document.getElementById('pcm-new-title')?.value?.trim() || '');
    } catch (err) {
      console.warn('[party-committee-meeting] 新建线上支委会失败：', err);
      showToast('error', (err && err.message) || '新建失败');
      btn.dataset.processing = '';
      btn.disabled = false;
      btn.style.opacity = '';
    }
  });
}

/** 新建一场「线上召开」支委会：沿用既有活动实体 + 既有 voteConfig 默认（不新增表/字段） */
async function createOnlineMeeting(title) {
  const me = AuthStore.getCurrentUser();
  const ids = committeeIds();
  const today = new Date().toISOString().slice(0, 10);
  const data = {
    type: '支委会',
    scenarioId: 'branch-committee',
    title: title || `线上支委会（${today}）`,
    date: today,
    status: 'published',
    visibility: 'branch',
    domain: 'party-building',
    location: '线上（异步表态）',
    description: '线上召开：支委就议程异步表态（同意 / 异议 / 附言），支书汇总截止后记录讨论结果。',
    voteConfig: { ...defaultVoteConfig('branch-committee'), voterIds: ids },
    agenda: [],
    organizer: me.personId,
    assignments: [
      { personId: me.personId, role: 'organizer' },
      ...ids.filter((pid) => pid !== me.personId).map((pid) => ({ personId: pid, role: 'participant' })),
    ],
  };
  const act = await getAdapter().activities.create(data);
  if (!mockDB.activities.some((a) => a.id === act.id)) mockDB.activities = [...mockDB.activities, act];
  persist();
  currentId = act.id;
  window.history.replaceState(null, '', `${location.pathname}?id=${encodeURIComponent(act.id)}`);
  showToast('success', '已新建线上支委会，可开始提取议程');
  await render();
}

function bindExtract(act, candidates = []) {
  document.getElementById('pcm-extract')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (btn.dataset.processing === '1') return;
    const refKindOf = { taskforce: 'taskforce-proposal', issue: 'issue', draftDoc: 'branch-doc', recommend: 'member' };
    const picked = [];
    ROOT.querySelectorAll('.pcm-cand:checked').forEach((cb) => {
      const c = candidates.find((x) => x.group === cb.dataset.group && x.refId === cb.value);
      if (!c) return;
      const item = {
        id: generateId('ag'),
        kind: 'normal',
        item: c.item,
        host: c.host || '支书',
        kinds: c.kinds || [],
        sourceRef: { kind: refKindOf[c.group], id: c.refId },
      };
      // 类目自带的引用字段照搬（制度草案 → branchDocId；发展对象推荐 → 待讨论名单 + 目标阶段）：
      // 后者是「推荐为发展对象」那道门的议程侧（记录通过即为该人建成员变更申请，见 agenda-follow-up.js）
      if (c.branchDocId) item.branchDocId = c.branchDocId;
      if (Array.isArray(c.personIds) && c.personIds.length) item.personIds = c.personIds;
      if (c.toStage) item.toStage = c.toStage;
      picked.push(item);
    });
    if (!picked.length) { showToast('info', '请先勾选要加入议程的事项'); return; }
    btn.dataset.processing = '1';
    btn.disabled = true;
    btn.style.opacity = '0.5';
    try {
      await updateAgenda(act, [...(act.agenda || []), ...picked]);
      showToast('success', `已加入 ${picked.length} 条议程`);
      await render();
    } catch (err) {
      console.warn('[party-committee-meeting] 提取议程失败：', err);
      showToast('error', (err && err.message) || '加入议程失败');
      btn.dataset.processing = '';
      btn.disabled = false;
      btn.style.opacity = '';
    }
  });
}

/** 议程写回（沿用既有活动实体；API 形态走 PATCH，mock 形态写 adapter，本地同步 + persist） */
async function updateAgenda(act, agenda) {
  const updated = await getAdapter().activities.update(act.id, { agenda });
  const i = mockDB.activities.findIndex((x) => x.id === act.id);
  if (i >= 0) mockDB.activities[i] = { ...mockDB.activities[i], ...(updated || {}), agenda };
  persist();
}

// 表态提交事件（`vote-widget` 冒泡）→ 整页重绘；**只绑一次**（ROOT 在重绘间不换，重复绑定会叠加监听）
let _voteEventBound = false;
function bindVoteEventOnce() {
  if (_voteEventBound) return;
  _voteEventBound = true;
  ROOT.addEventListener('vote-submitted', () => {
    render().catch((e) => console.warn('[party-committee-meeting] 表态后重绘失败：', e));
  });
}

/** 委员端表态：复用既有表决组件（与活动详情页同源） */
async function bindAgenda(act) {
  const me = AuthStore.getCurrentUser();
  const voterIds = Array.isArray(act.voteConfig?.voterIds) ? act.voteConfig.voterIds : [];
  const canVote = !!me && voterIds.includes(me.personId);
  const slots = ROOT.querySelectorAll('.vote-widget-slot');
  if (!slots.length) return;
  const paint = async () => {
    const votes = await fetchVotes(act.id);
    slots.forEach((slot) => {
      const item = (act.agenda || []).find((x) => x.id === slot.dataset.voteItemId);
      if (item) renderVoteWidget(slot, { activity: act, agendaItem: item, votes, currentUserId: me.personId, canVote });
    });
  };
  try {
    await paint();
  } catch (e) {
    console.warn('[party-committee-meeting] 表态数据加载失败：', e);
  }
  bindVoteEventOnce();
}

/** 汇总与截止：复用既有支书端汇总组件（含截止按钮 → votesLocked 锁定） */
function bindSummary(act) {
  const host = document.getElementById('pcm-summary');
  if (!host) return;
  const cfgIds = (Array.isArray(act.voteConfig?.voterIds) && act.voteConfig.voterIds.length > 0)
    ? act.voteConfig.voterIds
    : committeeIds();
  const memberIds = new Set(cfgIds);
  const committeeMembers = PersonStore.getAll().filter((p) => memberIds.has(p.id));
  renderVoteSummary(host, { activity: act, committeeMembers, canLock: true })
    .catch((e) => console.warn('[party-committee-meeting] 表态汇总加载失败：', e));
  host.addEventListener('votes-locked', () => {
    showToast('success', '表态已截止，可查阅并记录讨论结果');
    render().catch((e) => console.warn('[party-committee-meeting] 截止后重绘失败：', e));
  });
}

/** 记录讨论结果：复用既有 recordAgendaResult（与活动详情页同一函数），写回活动议程 */
function bindRecord(act) {
  ROOT.querySelectorAll('.pcm-record').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (btn.dataset.processing === '1') return;
      btn.dataset.processing = '1';
      btn.disabled = true;
      btn.style.opacity = '0.5';
      try {
        const adapter = getAdapter();
        const db = {
          branchDocs: [...(mockDB.branchDocs || [])],
          memberChangeRequests: [...(mockDB.memberChangeRequests || [])],
        };
        const updated = await recordAgendaResultForActivity({
          activity: act,
          agendaItemId: btn.dataset.itemId,
          result: btn.dataset.result,
          adapter,
          db,
          actorId: AuthStore.getCurrentUser()?.personId || null,
        });
        if (Array.isArray(db.memberChangeRequests) && db.memberChangeRequests.length > 0) {
          mockDB.memberChangeRequests = db.memberChangeRequests;
        }
        await updateAgenda(act, updated.agenda);
        showToast('success', btn.dataset.result === 'passed' ? '已记录通过' : '已记录未通过');
        await render();
      } catch (e) {
        console.warn('[party-committee-meeting] 记录讨论结果失败：', e);
        showToast('error', (e && e.message) || '记录失败');
        btn.dataset.processing = '';
        btn.disabled = false;
        btn.style.opacity = '';
      }
    });
  });
}

// ════════════════════════════════════════════════════════════════
//  启动
// ════════════════════════════════════════════════════════════════
(async () => {
  await _hydrateData();
  TaskForceRecordStore.init();
  try { await IssueStore.loadAll(); } catch (e) { console.warn('[party-committee-meeting] 反馈数据加载失败：', e); }
  const params = new URLSearchParams(window.location.search);
  currentId = params.get('id') || null;
  await render();
})();
