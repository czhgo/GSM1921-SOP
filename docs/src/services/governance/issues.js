// role: [工程师]+[AI]
// issues.js — GitHub Issue 风格意见反馈数据服务
// 权威源 docs/data/issues.json（mock）/ 服务端 issues 表（api） + localStorage 个人草稿
// ⚠ 2026-09-24 批次 169：**逐人未读标记**（`IssueNotify`）原只存本机键 `gsm1921-issue-unread-<assigneeId>`
//   ⇒ 清缓存即清零、换设备读不到。现 api 形态落服务端表 `issue_unread`（端点 `GET/POST /api/v1/issue-unread`，
//   见 server/routes/resources.js 末「反馈未读标记」段），`init()` 拉取填 `mockDB.issueUnread` 供同步读；
//   mock 形态原路径（本机键）一字未改。

import { mockDB } from '../../core/domain/domain.js?v=20261018h';
import { AuthStore } from '../core/auth.js?v=20261018h';
import { PersonStore } from '../member/person.js?v=20261018h';
import { bumpToken } from '../../core/base/version-token.js?v=20261018h'; // P2 渲染守卫失效（spec §四.1）
import { getDataSource, getAdapter, isDemoReadOnly, demoReadOnlyMessage } from '../../data/data-adapter.js?v=20261018h';
import { hashSubmitterToken, BRANCH_COMMISSION_ROLES, PARTY_STAFF_ROLE } from '../../core/domain/constants.js?v=20261018h';
// 2026-09-17 批次 49：处置写链（REST 直连，不走 persist）须自登记进成功提示的统一等待点
import { trackWrite } from '../../core/session/pending-writes.js?v=20261018h';
import { withinBranch, getBranchIdOfPerson } from '../branch/branch.js?v=20261018h';
import { generateId, randomHex } from '../../core/base/id.js?v=20261018h';
// 批次 47-M（2026-09-16）：**补上缺失的 showToast 导入**——本文件有 11 处 `showToast(...)`，
//   却从未 import 它，页面也没有任何地方把它挂到 window 上 ⇒ 真机跑到这些行时**一律抛
//   `ReferenceError: showToast is not defined`**。后果（正是支书实报的那类「非闭环」）：
//     · 校验失败那几处（「请我汇报」行内 / 我发起汇报详情 / 待处置详情两处 / 我提交反馈详情）——
//       **抛在 `return` 之前**，于是「点提交后既无提示、也没反应」，用户看到的是一个死按钮，
//       而病灶（缺必填）连一句话都没说；
//     · 成功那几处（汇报已发出 / 评论已添加 / 已确认收到 / 处置结果已提交 / 说明已提交）——
//       **写已经落库，提示却抛在写之后**，于是「事情办成了，但界面一声不吭」，用户会以为没生效而重复提交。
//   之所以长期没被发现：这五处校验点的「载体不在位」旧理由（「需先有议题并进入评论态」等）把它们
//   一直挂在 machine:false 白名单里，**真机从未跑到这些行**（见批 47-M 台账注释）。
import { showToast, todayLocal } from '../../core/base/utils.js?v=20261018h';
// 统一检索引擎（2026-09-14 批次 37）：本 tab 三区各接一个实例（关键词 + 引擎内置分页）

/** 解析人员 ID → 姓名（反馈系统统一走 PersonStore 唯一解析源） */
function _displayName(id) {
  return id ? PersonStore.getName(id) : '';
}

/**
 * 显示名解析的**公开出口**（G1 第③项，2026-09-28）：视图层
 * `components/feedback/issue-dispatch-view.js` 由服务层搬出后，仍需同一实现——
 * 公开名在此，视图层以 `displayNameOf as _displayName` 别名导入，块内调用零改动。
 */
export function displayNameOf(id) {
  return _displayName(id);
}

const ISSUES_JSON_PATH = './data/issues.json';
const DRAFT_KEY = 'gsm1921-issue-drafts'; // 本机草稿（仅本机；匿名身份字段禁止持久化，旧草稿读取时清理；白名单见 DATA_CONSISTENCY_CHECKLIST.md）
// 2026-07-30 v2：新增 dispatchHistory/comments.kind/hidden/mergedInto 字段，需重新加载 mock 数据
// 2026-08-01 v3：反馈数据长 ID（u_org_commissioner 等）统一改短 ID（u_org），强制清旧缓存重拉
// 2026-09-13 v4：反馈指派/审计身份统一改真实成员 ID（u_org→p11 等），缓存版本号 +1 强制清旧缓存重拉
//   （键名保持 v3 不变，仅版本号递进——reset 清理清单与既有测试零改动）
const CACHE_KEY = 'gsm1921-issue-cache-v3';
export const ISSUE_CACHE_KEY = CACHE_KEY; // 供其它模块（issue-detail 等）写回同一缓存键，防止键名未同步的情况
const CACHE_VERSION_KEY = 'gsm1921-issue-cache-version';
const CACHE_VERSION = '4';
const MIGRATED_KEY = 'gsm1921-feedback-migrated';
// 匿名反馈防刷令牌：客户端首次提交生成随机 token 存本地，提交时只把其哈希（tokenHash）随记录落库，
// 仅用于判重/频率限制——不可反查提交人；API 服务端另按会话保存受保护身份，本机 mock 不留存身份。
const SUBMITTER_TOKEN_KEY = 'gsm1921-issue-submitter-token';

let _issuesCache = null;

/** 当前是否 API 形态（mock/api 双形态判定；data-adapter 不静态依赖业务服务） */
function _isApiMode() {
  return getDataSource() === 'api';
}

/** 读取（缺省则生成）本浏览器的随机提交令牌 */
function _getSubmitterToken() {
  try {
    let t = localStorage.getItem(SUBMITTER_TOKEN_KEY);
    if (!t) {
      t = randomHex();
      localStorage.setItem(SUBMITTER_TOKEN_KEY, t);
    }
    return t;
  } catch {
    return randomHex();
  }
}

/**
 * **只读**地取本浏览器提交令牌（无则返回 null）。
 * 读路径专用：不得因为「看一眼我的反馈」就给从未提交过的浏览器生成令牌（副作用）。
 */
function _peekSubmitterToken() {
  try {
    return localStorage.getItem(SUBMITTER_TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

// ── 匿名口径（2026-10-16 更新：支部内部闭环）──────────────────────────────
// 匿名反馈必须登录后在所属支部内提交、读取和处置；党委账号不能查看、揭名或代为提交。
// 服务端受保护记录保留真实提交人 `_realPersonId`；本机 mock 不具备受保护存储，因此不留真身。当前无系统揭名入口；
// 支部/党委的任何身份核查方式须另有明确授权，不得从角色习惯或旧版 UI 推定。
// 此规则仅涉及意见反馈，不改变正式表决「真无记名」的独立数据边界。

/** 真身同族键（与 server/routes/resources.js 的 ISSUE_IDENTITY_KEYS 同源同口径）：任何常规读出口都不得带出 */
const ISSUE_IDENTITY_KEYS = ['_realPersonId', 'realPersonId', 'submitterId'];

/** 本机 mock / 草稿没有服务端访问控制；从其持久化副本递归清除匿名身份字段。 */
function _stripStoredIdentity(value) {
  if (Array.isArray(value)) return value.map(_stripStoredIdentity);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [key, child] of Object.entries(value)) {
    if (!ISSUE_IDENTITY_KEYS.includes(key)) out[key] = _stripStoredIdentity(child);
  }
  return out;
}

/** 只有登录的支部账号能进入反馈域；党委无支部归属，不是反馈入口。 */
function _hasBranchFeedbackAccess() {
  const actor = AuthStore.getCurrentUser();
  return !!actor && !PARTY_STAFF_ROLE.includes(actor.role);
}

/**
 * **脱敏序列化（默认出口）**：拷贝后剥掉真身同族键——一切常规读都走它。
 * 只剥不外泄、不回写（与 server 同名同口径实现一致）。
 */
function _sanitizeIssue(rec) {
  if (!rec || typeof rec !== 'object') return rec;
  const out = { ...rec };
  for (const k of ISSUE_IDENTITY_KEYS) delete out[k];
  return out;
}

const _sanitizeIssues = (list) => (list || []).map(_sanitizeIssue);

/** 草稿脱敏（兼容旧草稿中的身份字段） */
function _sanitizeDraft(d) {
  if (!d || typeof d !== 'object') return d;
  return { ...d, payload: d.payload ? _sanitizeIssue(d.payload) : d.payload };
}

/** 原始草稿：写链与审核内部专用；加载时清理旧身份字段，对外出口一律经 _sanitizeDraft */
function _rawDrafts() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY) || '[]';
    const parsed = JSON.parse(raw);
    const cleaned = _stripStoredIdentity(parsed);
    if (JSON.stringify(cleaned) !== JSON.stringify(parsed)) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch { return []; }
}

/** 原始记录：写链内部专用；mock 中不保存真身，API 缓存来自服务端脱敏响应。 */
function _rawById(id) {
  return (_issuesCache || []).find(i => i.id === id);
}

// 旧版揭名审计键保留兼容读取；2026-10-16 起没有系统揭名入口，不再新增前端揭名留痕。
const ISSUE_REVEALS_KEY = 'issue_reveals';
export const ISSUE_REVEALS = ISSUE_REVEALS_KEY;

function _readRevealTraces() {
  try { return JSON.parse(localStorage.getItem(ISSUE_REVEALS_KEY) || '[]'); } catch { return []; }
}

/**
 * 处置写口双形态同步：API 形态下把变更后的 issue 处置字段 PATCH 回服务端（fire-and-forget）。
 * mock 形态为本地 localStorage，无需同步。
 *
 * 2026-09-17 批次 49：这条链**不走 persist()**（feedback 域是独立 localStorage 域，写链直连 REST），
 * 故必须**自己登记进 pending-writes** —— 否则紧随其后的成功提示在它上面看不见等待对象，
 * 仍会「先报成功、PATCH 还在飞」。登记后：PATCH 失败 ⇒ 成功提示改报失败（原实现只 console.warn）。
 */
function _syncIssueToApi(issue) {
  if (!_isApiMode() || !issue) return;
  try {
    trackWrite(getAdapter().issues.update(issue.id, {
      status: issue.status,
      closedReason: issue.closedReason ?? null,
      closedAt: issue.closedAt ?? null,
      assignee: issue.assignee ?? null,
      assigneeRole: issue.assigneeRole ?? null,
      dispatchHistory: issue.dispatchHistory || [],
      comments: issue.comments || [],
      commentCount: issue.commentCount || 0,
      participants: issue.participants || [],
      hidden: !!issue.hidden,
      mergedInto: issue.mergedInto ?? null,
      resultPending: !!issue.resultPending,
    }));
  } catch (e) {
    console.warn('[IssueStore] API 处置同步异常：', e);
    trackWrite(Promise.reject(e));
  }
}

/**
 * P2（2026-09-07 · spec §四.1）：汇报/反馈写版本戳 +1。
 * 支书待办页 extraTopHtml「待答复收件箱/汇报时间线」等渲染守卫 key 以 tokenOf('issue')
 * 为数据版本（IssueStore 走 localStorage，不在 mockDB length 指纹覆盖内 → 须写口显式 bump）：
 * 汇报被答复/状态变化后 → 键变 → 渲染守卫落重建，收件箱/时间线即时刷新。
 */
function _noteIssueChange() {
  bumpToken('issue');
}

/** 获取当前登录用户 personId（plan 中为 AuthStore.getCurrentPersonId，修正为实际 API） */
function _currentPersonId() {
  return AuthStore.getCurrentUser()?.personId || '匿名';
}

// ── 支部归属（支部内闭环）───────────────────────────────────────────────
// 未登录或党委账号没有支部反馈访问权；支部账号按所属支部过滤，服务端对读写再次执行范围校验。
function _viewerId() {
  return AuthStore.getCurrentUser()?.personId || null;
}

/** 新建 issue 的支部归属候选值；仅已登录的支部账号能调用，服务端会再次校验。 */
function _writeBranchId() {
  return getBranchIdOfPerson(_viewerId());
}

/** 按 viewer 所属支部过滤 issue 列表（唯一源 withinBranch；缺 branchId 存量按部署默认支部惰性兼容） */
function _withinViewerBranch(list) {
  if (!_hasBranchFeedbackAccess()) return [];
  return withinBranch(list || [], _viewerId());
}

/**
 * 处置审计落款角色（2026-09-13 dogfood 同类彻查）：原 assignIssue/closeIssue/mergeIssues 一律
 * 硬编码 authorRole='secretary'，副支书（副书同权）经手时审计被记成支书——与「催办签发人写死」
 * 同类的身份错位。改为取当前登录用户真实角色；无会话（node 单测）回退 'secretary' 保持既有行为。
 */
function _currentRole() {
  return AuthStore.getCurrentUser()?.role || 'secretary';
}

/** 是否意见处置侧（写回服务端的处置人；与 server PATCH /issues 的 ISSUE_DISPOSITION_SET 同源单一源＝支委层，2026-09-21 批次 126 · D-550） */
function _isDispositionRole(role) {
  return !!role && BRANCH_COMMISSION_ROLES.includes(role);
}

export const IssueStore = {
  /**
   * 从权威源加载所有 issue（带 localStorage 缓存）
   * @returns {Promise<Array>} issues 列表
   */
  async loadAll() {
    // API 形态：以服务器为权威源（GET /api/v1/issues）；服务端出口已脱敏，真身只留在服务端受保护记录。
    if (_isApiMode()) {
      try {
        const rows = await getAdapter().issues.list();
        _issuesCache = Array.isArray(rows) ? rows : [];
        return _sanitizeIssues(_issuesCache);
      } catch (e) {
        console.warn('[IssueStore] API 形态加载反馈失败：', e);
        _issuesCache = [];
        return [];
      }
    }
    // 加载意见域时顺手迁除旧草稿中的身份字段；浏览器本地存储不是受保护后台。
    _rawDrafts();
    // 优先从内存缓存读
    if (_issuesCache) return _sanitizeIssues(_issuesCache);
    // 缓存版本检查：版本不匹配则丢弃旧缓存，强制从 issues.json 重新加载
    try {
      const cachedVer = localStorage.getItem(CACHE_VERSION_KEY);
      if (cachedVer !== CACHE_VERSION) {
        localStorage.removeItem(CACHE_KEY);
        localStorage.setItem(CACHE_VERSION_KEY, CACHE_VERSION);
      }
    } catch {}
    // 其次从 localStorage 缓存读。mock 浏览器存储不具备服务端访问控制，读取时清理历史身份字段并回写。
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        _issuesCache = _stripStoredIdentity(parsed);
        if (JSON.stringify(_issuesCache) !== JSON.stringify(parsed)) {
          localStorage.setItem(CACHE_KEY, JSON.stringify(_issuesCache));
        }
        return _sanitizeIssues(_issuesCache);
      }
    } catch {}
    // 最后从 issues.json 拉取
    try {
      const resp = await fetch(ISSUES_JSON_PATH);
      const data = await resp.json();
      _issuesCache = _stripStoredIdentity(data.issues || []);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(_issuesCache)); } catch {}
      return _sanitizeIssues(_issuesCache);
    } catch {
      _issuesCache = [];
      return [];
    }
  },

  /** 同步读取（需先调用 loadAll）——按 viewer 所属支部过滤（跨支部 issue 不可见）；出口脱敏 */
  getAll() {
    return _sanitizeIssues(_withinViewerBranch(_issuesCache || []));
  },

  /** 按 ID 获取（按 viewer 所属支部过滤：跨支部 issue 不可见）；出口脱敏 */
  getById(id) {
    return _sanitizeIssue(_withinViewerBranch(_issuesCache || []).find(i => i.id === id));
  },

  /** 按 number 获取（按 viewer 所属支部过滤：跨支部 issue 不可见）；出口脱敏 */
  getByNumber(num) {
    return _sanitizeIssue(_withinViewerBranch(_issuesCache || []).find(i => i.number === num));
  },

  /** 获取下一个可用 number（全库编号，不按支部过滤——支部间编号全局唯一） */
  nextNumber() {
    const list = _issuesCache || [];
    return list.reduce((max, i) => Math.max(max, i.number || 0), 0) + 1;
  },

  /** 过滤（按 viewer 所属支部过滤后再按维度筛选）；出口脱敏 */
  filter({ status, scope, type, milestone, keyword, kind } = {}) {
    let list = _withinViewerBranch(_issuesCache || []);
    if (status && status !== 'all') list = list.filter(i => i.status === status);
    if (scope && scope !== 'all') list = list.filter(i => i.scope === scope);
    if (type && type !== 'all') list = list.filter(i => (i.types || []).includes(type));
    if (milestone && milestone !== 'all') list = list.filter(i => i.milestone === milestone);
    // 批次 47-Q（2026-09-16，支书裁定「加过滤 + 种进同源」）：**按题种类过滤**。
    // 本域混装两类东西，语义判别字段就是 `kind`：
    //   · 匿名反馈（`docs/data/issues.json` 的 issue-001~004）——**无 `kind` 字段**（历史形态）；
    //   · 内部汇报（`kind: 'report'`，由「一键汇报 / 了解进展」生成）——**带名**（submittedBy/assignee 指向真人）。
    // 支部反馈入口**只显示前者**（内部汇报含真人归属与内部事项），故查询一律传 `kind: 'feedback'`
    // （`= 无 kind 或 kind!=='report'`）。入口须登录并由 `_withinViewerBranch` 按所属支部收口。
    if (kind) list = list.filter(i => (i.kind || 'feedback') === kind);
    if (keyword) {
      const kw = keyword.toLowerCase();
      list = list.filter(i =>
        (i.title || '').toLowerCase().includes(kw) ||
        (i.body || '').toLowerCase().includes(kw)
      );
    }
    return _sanitizeIssues(list);
  },

  /** 统计（按 viewer 所属支部过滤；`kind` 语义同 filter） */
  countByStatus({ kind } = {}) {
    let list = _withinViewerBranch(_issuesCache || []);
    if (kind) list = list.filter(i => (i.kind || 'feedback') === kind);
    return {
      total: list.length,
      open: list.filter(i => i.status === 'open').length,
      closed: list.filter(i => i.status === 'closed').length,
    };
  },

  // ── 草稿（localStorage）──

  /** 读取个人草稿；兼容清理旧浏览器草稿中的身份字段后再脱敏返回。 */
  getDrafts() {
    return _rawDrafts().map(_sanitizeDraft);
  },

  /**
   * 添加草稿（新建/评论/反应都先进草稿）
   * @param {Object} draft
   * @param {string} [authorOverride] 覆盖草稿作者（匿名提交时传「匿名」；身份不得落入浏览器草稿）
   */
  addDraft(draft, authorOverride) {
    // 2026-09-28 支书裁定「静态模式只保留侧边栏/about 等区别，所有数据都走服务器 API」：
    // 无 API 会话（mock 形态）= **只读演示**——反馈域是独立 localStorage 写链（不走 persist），
    // 故在此单独判。未登录访客可达的写口只有反馈提交一处，本判据即覆盖该面。
    if (isDemoReadOnly()) {
      throw Object.assign(new Error(demoReadOnlyMessage()), { type: 'DemoReadOnlyError' });
    }
    const list = _rawDrafts();
    const record = {
      draftId: generateId('dft', '-'),
      type: draft.type, // 'new-issue' | 'comment' | 'reaction'
      targetIssueId: draft.targetIssueId || null,
      payload: _stripStoredIdentity(draft.payload),
      author: authorOverride || _currentPersonId(),
      createdAt: todayLocal(),
      status: 'pending', // pending | approved | rejected
      reviewNote: null,
    };
    list.push(record);
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(list)); } catch {}
    return _sanitizeDraft(record);
  },

  /**
   * 提交意见反馈（匿名提交由服务端受保护记录留存身份；本机 mock 不留存）
   * 匿名：submittedBy='匿名' + anonymous:true；服务端从登录会话记录 `_realPersonId`，不采信客户端身份。
   * 实名：按现口径记真实 personId（展示层经 PersonStore 解析姓名）。
   * 防刷：客户端随机令牌 → 只落 tokenHash（API 形态由服务端哈希，mock 形态本地哈希），仅用于判重/限频。
   * @returns {Promise<Object>} API 形态返回落库记录（服务端已脱敏）；mock 形态返回新建草稿（出口亦已脱敏）
   */
  async submitIssue({ title, body, scope, types = [], domain = '', anonymous = true } = {}) {
    if (!_hasBranchFeedbackAccess()) throw new Error('意见反馈仅限登录的支部成员在本支部内使用');
    const now = todayLocal();
    const token = _getSubmitterToken();
    // 支部归属：登录账号的所属支部（服务端会再次核验）；不接受未登录或党委账号。
    const branchId = _writeBranchId();
    if (_isApiMode()) {
      const record = await getAdapter().issues.create({
        title, body, scope, types, domain,
        branchId,
        anonymous: !!anonymous,
        submitterToken: token, // 服务端仅存其哈希（tokenHash），不留原始 token
        submittedAt: now,
      });
      _issuesCache = _issuesCache || [];
      // 服务端已按其口径落真身（`_realPersonId`）并回传脱敏记录 ⇒ 本机缓存同样不含真身。
      _issuesCache.push(record);
      _noteIssueChange();
      return _sanitizeIssue(record);
    }
    return this.addDraft({
      type: 'new-issue',
      payload: {
        title, body, scope, types, domain,
        branchId,
        submittedBy: anonymous ? '匿名' : _currentPersonId(),
        anonymous: !!anonymous,
        // mock 没有受保护的服务端存储，不持久化匿名提交人的真实身份。
        tokenHash: hashSubmitterToken(token),
        submittedAt: now,
      },
    }, anonymous ? '匿名' : undefined);
  },

  /** 支书审核通过：合并到 issues.json（实际操作：本地更新+提示支书保存文件） */
  approveDraft(draftId) {
    // 审核是写链：读取已清理身份字段的本机草稿；mock 形态不把匿名身份并入本地 issue 记录。
    const drafts = _rawDrafts();
    const d = drafts.find(x => x.draftId === draftId);
    if (!d) return null;
    d.status = 'approved';
    d.reviewNote = 'approved by secretary';
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts)); } catch {}

    // 应用到本地缓存（模拟"合并到 issues.json"）
    if (d.type === 'new-issue') {
      const issue = {
        ...d.payload,
        id: generateId('issue', '-'),
        number: this.nextNumber(),
        // 支部归属：草稿携带优先（提交时已按写入口径落 branchId）；存量草稿缺省按当前口径补（部署默认支部）
        branchId: d.payload.branchId || _writeBranchId(),
        status: 'open',
        closedReason: null,
        closedAt: null,
        submittedAt: todayLocal(),
        reactions: { thumbsUp: [], thumbsDown: [], eyes: [], hooray: [] },
        mentions: [],
        references: [],
        comments: [],
        // 匿名反馈不记录任何参与者（防止经 participants 反查提交人）
        participants: d.payload.anonymous ? [] : [d.author],
        commentCount: 0,
      };
      _issuesCache = _issuesCache || [];
      // R-24（2026-09-13）：API 形态必须**落服务端**——原实现只写本地缓存，
      // 随后 loadAll() 用服务端数据覆盖 → 表现为「点通过提示成功但列表仍 0 条」。
      // 服务端不接受自述身份/编号字段（落库白名单），只提交内容字段，由服务端生成 id/number/时间。
      if (_isApiMode()) {
        getAdapter().issues.create({
          title: issue.title, body: issue.body, scope: issue.scope, types: issue.types,
          branchId: issue.branchId,
          anonymous: issue.anonymous !== false,
          submitterToken: (d.payload && d.payload.submitterToken) || undefined,
        }).then((row) => {
          if (row) _issuesCache = [row, ...(_issuesCache || []).filter(x => x.id !== issue.id)];
          _noteIssueChange();
        }).catch((e) => console.warn('[IssueStore] 草稿通过写入服务端失败：', e));
        return _sanitizeIssue(issue);
      }
      _issuesCache.push(issue);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(_issuesCache)); } catch {}
      return _sanitizeIssue(issue);
    }
    if (d.type === 'comment') {
      const issue = _rawById(d.targetIssueId);
      if (issue) {
        issue.comments.push({
          id: generateId('cmt', '-'),
          author: d.author,
          body: d.payload.body,
          createdAt: todayLocal(),
          hidden: false, hiddenBy: null, hiddenReason: null, hiddenAt: null,
        });
        if (!issue.participants.includes(d.author)) issue.participants.push(d.author);
        issue.commentCount = (issue.commentCount || 0) + 1;
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(_issuesCache)); } catch {}
      }
    }
    if (d.type === 'reaction') {
      const issue = _rawById(d.targetIssueId);
      if (issue) {
        const list = issue.reactions[d.payload.type] || [];
        if (!list.includes(d.author)) list.push(d.author);
        issue.reactions[d.payload.type] = list;
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(_issuesCache)); } catch {}
      }
    }
    _noteIssueChange(); // P2：草稿审核通过并入 issues → 写版本 +1
    return _sanitizeDraft(d);
  },

  /** 支书驳回 */
  rejectDraft(draftId, reason) {
    const drafts = _rawDrafts();
    const d = drafts.find(x => x.draftId === draftId);
    if (!d) return null;
    d.status = 'rejected';
    d.reviewNote = reason;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts)); } catch {}
    return _sanitizeDraft(d);
  },

  // ── 意见处置（支委层；2026-09-21 批次 126 · D-550 由「支书专属」放开）：直接修改缓存，API 形态经 _syncIssueToApi 写回服务端 ──
  // 写链经 `_rawById` 取原始记录并就地更新；API 缓存本身已脱敏，服务端 PATCH 合并白名单字段时保留受保护身份。

  /** 改状态（意见处置） */
  changeStatus(id, status, closedReason = null) {
    const issue = _rawById(id);
    if (!issue) return null;
    issue.status = status;
    if (status === 'closed') {
      issue.closedReason = closedReason || 'completed';
      issue.closedAt = todayLocal();
    } else {
      issue.closedReason = null;
      issue.closedAt = null;
    }
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(_issuesCache)); } catch {}
    _noteIssueChange(); // P2：状态变更（含关闭/重开）→ 写版本 +1
    _syncIssueToApi(issue); // API 形态：处置写回服务端（mock 形态 no-op）
    return _sanitizeIssue(issue);
  },

  /** 支书软隐藏评论 */
  hideComment(issueId, commentId, reason) {
    const issue = _rawById(issueId);
    if (!issue) return null;
    const c = (issue.comments || []).find(c => c.id === commentId);
    if (!c) return null;
    c.hidden = true;
    c.hiddenBy = _currentPersonId();
    c.hiddenReason = reason;
    c.hiddenAt = todayLocal();
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(_issuesCache)); } catch {}
    _noteIssueChange(); // P2：评论隐藏 → 写版本 +1
    _syncIssueToApi(issue); // API 形态：处置写回服务端
    return _sanitizeIssue(issue);
  },

  /** 支书编辑 issue */
  editIssue(id, updates) {
    const issue = _rawById(id);
    if (!issue) return null;
    Object.assign(issue, updates);
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(_issuesCache)); } catch {}
    _noteIssueChange(); // P2：编辑（隐藏/指派/隐藏/备注等汇聚点）→ 写版本 +1
    _syncIssueToApi(issue); // API 形态：处置写回服务端
    return _sanitizeIssue(issue);
  },

  /** 支书设置 assignee（旧接口，保留兼容；新代码用 assignIssue） */
  setAssignee(id, personId) {
    return this.editIssue(id, { assignee: personId });
  },

  // ── 2026-07-30 新增：反馈分发与处置（spec §3.1） ──────────────

  /**
   * 支书指派反馈给某人
   * @param {string} issueId
   * @param {string} assigneeId   被指派人 personId（如 'p11'）
   * @param {string} assigneeRole 被指派人角色键（'org-commissioner' | 'leader' | 'secretary' | ...）
   * @param {string} note         指派备注（可选）
   * @returns {Object|null} 更新后的 issue
   */
  assignIssue(issueId, assigneeId, assigneeRole, note = '') {
    const issue = _rawById(issueId);
    if (!issue) return null;
    const prevAssignee = issue.assignee || null;
    const by = _currentPersonId();
    const at = todayLocal();
    issue.assignee = assigneeId;
    issue.assigneeRole = assigneeRole || null;
    // 指派历史时间线
    if (!Array.isArray(issue.dispatchHistory)) issue.dispatchHistory = [];
    issue.dispatchHistory.push({ from: prevAssignee, to: assigneeId, by, at, note });
    // 同时作为评论时间线的一条 kind='dispatch' 事件
    if (!Array.isArray(issue.comments)) issue.comments = [];
    issue.comments.push({
      id: generateId('cmt', '-'),
      author: by,
      authorRole: _currentRole(),
      body: note ? `指派给 ${assigneeRole || assigneeId}：${note}` : `指派给 ${assigneeRole || assigneeId}`,
      createdAt: at,
      kind: 'dispatch',
      hidden: false, hiddenBy: null, hiddenReason: null, hiddenAt: null,
    });
    issue.commentCount = (issue.commentCount || 0) + 1;
    if (!issue.participants.includes(by)) issue.participants.push(by);
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(_issuesCache)); } catch {}
    _noteIssueChange(); // P2：指派 → 写版本 +1
    _syncIssueToApi(issue); // API 形态：处置写回服务端
    // 触发通知：被指派人工作台「我的处置」Tab 角标 +1
    if (assigneeId && assigneeId !== by) {
      IssueNotify.markUnread(assigneeId, issueId);
    }
    return _sanitizeIssue(issue);
  },

  /**
   * 添加评论 / 批复 / 处置结果
   * @param {string} issueId
   * @param {string} author       personId
   * @param {string} authorRole   角色键
   * @param {string} body         正文
   * @param {string} kind         'comment' | 'verdict' | 'dispatch' | 'result'
   * @returns {Object|null} 更新后的 issue
   */
  addComment(issueId, author, authorRole, body, kind = 'comment') {
    const issue = _rawById(issueId);
    if (!issue) return null;
    if (!Array.isArray(issue.comments)) issue.comments = [];
    const at = todayLocal();
    issue.comments.push({
      id: generateId('cmt', '-'),
      author,
      authorRole: authorRole || null,
      body,
      createdAt: at,
      kind,
      hidden: false, hiddenBy: null, hiddenReason: null, hiddenAt: null,
    });
    issue.commentCount = (issue.commentCount || 0) + 1;
    if (!issue.participants.includes(author)) issue.participants.push(author);
    // 处置结果提交后，标记 issue 为「待终审」（resultPending=true），等待支书关闭
    if (kind === 'result') {
      issue.resultPending = true;
      issue.resultSubmittedAt = at;
      // 触发支书工作台「待终审」高亮
      IssueNotify.markSecretaryReviewPending(issueId);
    }
    // 对外匿名（2026-09-12 裁定；2026-09-17 改裁更正措辞）：取消对提交人的定向通知/回推——答复一律公开在意见列表，
    // 若按 submittedBy 定向推送会泄露匿名提交人身份（支书追问只能公开留言）。
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(_issuesCache)); } catch {}
    _noteIssueChange(); // P2：评论/答复/处置结果 → 写版本 +1（支书收件箱时间线渲染守卫失效）
    // API 形态：处置侧（支委层）的评论/批复/正式答复写回服务端
    //（成员汇报评论 authorRole ∉ 支委层 → 不触发；与服务端 PATCH /issues 同源，单一源 BRANCH_COMMISSION_ROLES）
    if (_isDispositionRole(authorRole)) _syncIssueToApi(issue);
    return _sanitizeIssue(issue);
  },

  /**
   * 关闭反馈（意见处置）
   * @param {string} issueId
   * @param {string} reason  'completed' | 'duplicate' | 'wontfix' | 'not_planned'
   * @param {string} note    关闭备注（可选）
   */
  closeIssue(issueId, reason = 'completed', note = '') {
    const issue = _rawById(issueId);
    if (!issue) return null;
    issue.status = 'closed';
    issue.closedReason = reason;
    issue.closedAt = todayLocal();
    issue.resultPending = false;
    // 关闭后清除「待终审」未读标记
    IssueNotify.markSecretaryReviewRead(issueId);
    if (note) {
      // 关闭备注作为 verdict 评论记录
      this.addComment(issueId, _currentPersonId(), _currentRole(), `关闭反馈（${reason}）：${note}`, 'verdict');
    }
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(_issuesCache)); } catch {}
    _noteIssueChange(); // P2：关闭 → 写版本 +1
    _syncIssueToApi(issue); // API 形态：处置写回服务端
    return _sanitizeIssue(issue);
  },

  /** 重新开放（意见处置） */
  reopenIssue(issueId) {
    const issue = _rawById(issueId);
    if (!issue) return null;
    issue.status = 'open';
    issue.closedReason = null;
    issue.closedAt = null;
    issue.resultPending = false;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(_issuesCache)); } catch {}
    _noteIssueChange(); // P2：重开 → 写版本 +1
    _syncIssueToApi(issue); // API 形态：处置写回服务端
    return _sanitizeIssue(issue);
  },

  // ── 2026-08-10 新增：工作汇报闭环（kind='report'） ────────────

  /**
   * 成员主动发起工作汇报（发往支书；三类：进度/卡点/请示）
   * @param {{ category: 'progress'|'blocked'|'ask', body: string }} params
   * @returns {Object|null} 新建的汇报 issue
   */
  submitReport({ category = 'progress', body = '' } = {}) {
    if (!body.trim()) return null;
    const by = _currentPersonId();
    const now = todayLocal();
    const issue = {
      id: generateId('report', '-'),
      number: this.nextNumber(),
      branchId: _writeBranchId(),
      title: `【${REPORT_CATEGORIES[category] || '进度'}汇报】`,
      body: body.trim(),
      kind: 'report',
      reportCategory: category,
      scope: 'report',
      types: [category],
      status: 'open',
      closedReason: null,
      closedAt: null,
      submittedBy: by,
      submittedAt: now,
      assignee: null, // 未指派 → 默认发往支书待答复
      assigneeRole: null,
      dispatchHistory: [],
      comments: [],
      participants: [by],
      commentCount: 0,
      reactions: { thumbsUp: [], thumbsDown: [], eyes: [], hooray: [] },
      mentions: [],
      references: [],
      resultPending: false,
    };
    _issuesCache = _issuesCache || [];
    _issuesCache.push(issue);
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(_issuesCache)); } catch {}
    _noteIssueChange(); // P2：发起汇报 → 写版本 +1（支书收件箱新条）
    // 支书"待答复"高亮（复用 secretary-review 未读通道）
    IssueNotify.markSecretaryReviewPending(issue.id);
    return issue;
  },

  /**
   * 支书"了解进展"：请某人就某事项汇报（温和请求，界面措辞不用"要求"）
   * @param {string} targetPersonId — 被请汇报人 personId
   * @param {string} targetRole      — 被请汇报人角色键
   * @param {string} note            — 请汇报事项（选填）
   * @returns {Object|null} 新建的请求 issue
   */
  requestReport(targetPersonId, targetRole = null, note = '') {
    if (!targetPersonId) return null;
    const by = _currentPersonId();
    const now = todayLocal();
    const noteText = (note || '').trim();
    const issue = {
      id: generateId('report-req', '-'),
      number: this.nextNumber(),
      branchId: _writeBranchId(),
      title: noteText ? `了解进展：${noteText}` : '了解进展：请同步当前进度',
      body: noteText || '请同步当前进度',
      kind: 'report',
      reportCategory: 'progress',
      scope: 'report',
      types: ['request'],
      status: 'open',
      closedReason: null,
      closedAt: null,
      submittedBy: by,       // 支书发起
      requestedBy: by,       // 标记"了解进展"来源
      requestedAt: now,
      requestedNote: noteText,
      assignee: targetPersonId,
      assigneeRole: targetRole || null,
      dispatchHistory: [{ from: null, to: targetPersonId, by, at: now, note: noteText || '了解进展' }],
      comments: [],
      participants: [by, targetPersonId],
      commentCount: 0,
      reactions: { thumbsUp: [], thumbsDown: [], eyes: [], hooray: [] },
      mentions: [],
      references: [],
      resultPending: false,
    };
    _issuesCache = _issuesCache || [];
    _issuesCache.push(issue);
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(_issuesCache)); } catch {}
    _noteIssueChange(); // P2：请汇报请求 → 写版本 +1
    // 被请汇报人工作台「我的处置」角标 +1
    IssueNotify.markUnread(targetPersonId, issue.id);
    return issue;
  },

  /** 汇报人确认已收到答复 → 关闭闭环 */
  confirmReport(issueId) {
    const issue = _rawById(issueId);
    if (!issue) return null;
    if (!Array.isArray(issue.comments)) issue.comments = [];
    issue.comments.push({
      id: generateId('cmt', '-'),
      author: _currentPersonId(),
      authorRole: null,
      body: '已收到答复',
      createdAt: todayLocal(),
      kind: 'verdict',
      hidden: false, hiddenBy: null, hiddenReason: null, hiddenAt: null,
    });
    issue.status = 'closed';
    issue.closedReason = 'completed';
    issue.closedAt = todayLocal();
    issue.resultPending = false;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(_issuesCache)); } catch {}
    _noteIssueChange(); // P2：汇报闭环确认 → 写版本 +1
    return _sanitizeIssue(issue);
  },

  /** 我发起的汇报（全部状态；按 viewer 所属支部过滤）；出口脱敏 */
  getMyReports(userId) {
    return _sanitizeIssues(_withinViewerBranch(_issuesCache || []).filter(i =>
      i.kind === 'report' && i.submittedBy === userId && !i.hidden && !i.mergedInto
    ));
  },

  /** 支书请我汇报、尚未提交的请求（按 viewer 所属支部过滤）；出口脱敏 */
  getReportRequestsFor(userId) {
    return _sanitizeIssues(_withinViewerBranch(_issuesCache || []).filter(i =>
      i.kind === 'report' && i.requestedBy && i.assignee === userId &&
      i.status === 'open' && !i.hidden && !i.mergedInto
    ));
  },

  /** 支书待答复/待终审的汇报（开放中，含成员主动汇报与请求后的回应；按 viewer 所属支部过滤）；出口脱敏 */
  getSecretaryPendingReports() {
    return _sanitizeIssues(_withinViewerBranch(_issuesCache || []).filter(i =>
      i.kind === 'report' && i.status === 'open' && !i.hidden && !i.mergedInto
    ));
  },

  /** 某人发起的全部汇报（按 viewer 所属支部过滤）；出口脱敏 */
  getReportsBySubmitter(personId) {
    return _sanitizeIssues(_withinViewerBranch(_issuesCache || []).filter(i =>
      i.kind === 'report' && i.submittedBy === personId && !i.hidden && !i.mergedInto
    ));
  },

  /** 支书隐藏反馈（不在公开列表显示） */
  hideIssue(issueId) {
    return this.editIssue(issueId, { hidden: true });
  },

  /** 支书取消隐藏 */
  unhideIssue(issueId) {
    return this.editIssue(issueId, { hidden: false });
  },

  /**
   * 支书合并反馈：将 sourceId 合并到 targetId
   * - source 标记 mergedInto=targetId 并隐藏
   * - target 评论时间线追加一条 merge 事件
   */
  mergeIssue(sourceId, targetId) {
    const source = _rawById(sourceId);
    const target = _rawById(targetId);
    if (!source || !target) return null;
    source.mergedInto = targetId;
    source.hidden = true;
    source.status = 'closed';
    source.closedReason = 'duplicate';
    source.closedAt = todayLocal();
    if (!Array.isArray(target.comments)) target.comments = [];
    target.comments.push({
      id: generateId('cmt-merge', '-'),
      author: _currentPersonId(),
      authorRole: _currentRole(),
      body: `合并自 #${source.number || source.id}：${source.title || ''}`,
      createdAt: todayLocal(),
      kind: 'verdict',
      hidden: false, hiddenBy: null, hiddenReason: null, hiddenAt: null,
    });
    target.commentCount = (target.commentCount || 0) + 1;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(_issuesCache)); } catch {}
    _noteIssueChange(); // P2：合并 → 写版本 +1
    _syncIssueToApi(source); // API 形态：处置写回服务端
    _syncIssueToApi(target);
    return { source: _sanitizeIssue(source), target: _sanitizeIssue(target) };
  },

  /** 被指派给某人的反馈（开放中；按 viewer 所属支部过滤）；出口脱敏 */
  getAssignedTo(userId) {
    return _sanitizeIssues(_withinViewerBranch(_issuesCache || []).filter(i =>
      i.assignee === userId && i.status === 'open' && !i.hidden && !i.mergedInto
    ));
  },

  /** 被指派给某角色的反馈（开放中；按 viewer 所属支部过滤）；出口脱敏 */
  getAssignedToRole(role) {
    return _withinViewerBranch(_issuesCache || []).filter(i =>
      i.assigneeRole === role && i.status === 'open' && !i.hidden && !i.mergedInto
    ).map(_sanitizeIssue);
  },

  /**
   * 我提交 / 参与的反馈（成员台「我的处置」用，2026-09-15 支书裁定「每个人都可以参与答复」）：
   * 满足任一即算「我的」——① 本人提交（`submittedBy===userId`）② 列在参与者（`participants`）中
   * ③ **本浏览器提交过**（`tokenHash` 与本地随机令牌的哈希相符）。不含工作汇报（`kind='report'`）。
   *
   * 第 ③ 条是 2026-09-17（支书裁定「加不可反查的本人标识」）新增的 —— 补的正是
   * **正式部署下本区恒空**这个用户可见缺口：api 形态把 `submittedBy`/`participants` 一律按对外匿名
   * 脱敏（`server/seed.js::seedIssues`），①② 因此在正式部署下**结构上认不出人**。
   * 而提交时客户端本就带了一个**随机令牌**（`SUBMITTER_TOKEN_KEY`，与 personId 无关），
   * 服务端只存它的哈希 `tokenHash`（本就随 `GET /api/v1/issues` 返回）⇒ 浏览器拿本地令牌
   * 自算哈希、自己比对即可「认出我提交过哪几条」，而 **tokenHash 本身推不出提交人**
   * （含支书、含拿到常规读出口数据的人）——自认需求得到满足，且不额外扩大真身可见面。
   * ⚠ 身份口径（D-824）：API 服务端把真身另存 `_realPersonId`，不经常规出口暴露，也不经 tokenHash 泄露；
   * 本机 mock 不留存真身。tokenHash 只判重/限频，「防刷线」与「身份留存线」互不影响。
   *
   * ⚠ 如实登记的边界：令牌在本浏览器本地（localStorage）⇒ **换设备 / 清除浏览器数据后无法回认**
   * （这是「不可反查」的必然代价：没有身份就没有跨设备的找回依据）。同浏览器内换登录账号亦然——
   * 本判据认的是「这台浏览器提交过」，不认「这个账号提交过」。
   *
   * 按 viewer 所属支部过滤（跨支部 issue 不可见）。**出口脱敏**（不含真身；自认只认 tokenHash）。
   */
  getMyIssues(userId) {
    if (!userId) return [];
    const myToken = _peekSubmitterToken();
    const myHash = myToken ? hashSubmitterToken(myToken) : null;
    return _sanitizeIssues(_withinViewerBranch(_issuesCache || []).filter(i =>
      i.kind !== 'report' && !i.hidden && !i.mergedInto &&
      (i.submittedBy === userId || (i.participants || []).includes(userId) ||
        (!!myHash && i.tokenHash === myHash))
    ));
  },

  /** 支书设置 milestone */
  setMilestone(id, milestoneId) {
    return this.editIssue(id, { milestone: milestoneId });
  },

  /** 导出为 JSON（供支书手动同步到 issues.json）；出口脱敏，不导出匿名身份字段。 */
  exportJSON() {
    return JSON.stringify({
      version: 1,
      updatedAt: todayLocal(),
      issues: _sanitizeIssues(_issuesCache || []),
    }, null, 2);
  },

  // ── 写链回写（**内部写链专用**，非读出口）─────────────────────────────────
  // 背景：常规读出口（getById/getAll/filter…）一律脱敏，
  //   故「取记录 → 就地改 → 回写缓存」这类既有写链（components/feedback/issue-detail.js 的评论口）必须
  //   ① 取**原始记录**（否则改动落在副本上，静默丢失）；② 回写缓存并让服务端 PATCH 保留其受保护字段。

  /** 写链专用：取原始记录（live 对象；API 缓存已脱敏，mock 缓存也不持久化真身）。展示/出口一律走 getById */
  getRawById(id) {
    return _rawById(id);
  },

  /**
   * 写链专用：把内存缓存（递归剔除身份字段）序列化回 localStorage 缓存键（与 CACHE_KEY 同键）。
   * @returns {boolean} 是否写成功（失败由调用方告警并登记，不得静默吞掉）
   */
  persistCacheFromWrite() {
    try {
      _issuesCache = _stripStoredIdentity(_issuesCache || []);
      localStorage.setItem(CACHE_KEY, JSON.stringify(_issuesCache || []));
      return true;
    } catch { return false; }
  },

  // ── 受保护真实提交人：本轮不开放任何前端揭名出口 ───────────────────────

  /** 保留旧调用兼容，但不读取真身、不写揭名日志；服务端也会拒绝该端点。 */
  async getIssuesForPartyReview() {
    return { rows: [], traced: false, trace: null, forbidden: true };
  },

  /** 旧版前端留痕读取兼容；当前没有前端揭名操作会新增该类记录。 */
  getRevealTraces() {
    return _readRevealTraces();
  },

  // ── 旧数据迁移 ──

  /** 从 FeedbackStore 旧数据迁移 */
  migrateFromFeedbackStore() {
    if (localStorage.getItem(MIGRATED_KEY)) return 0;
    try {
      const raw = localStorage.getItem('gsm1921-feedback-submissions');
      if (!raw) { localStorage.setItem(MIGRATED_KEY, '1'); return 0; }
      const oldList = JSON.parse(raw);
      _issuesCache = _issuesCache || [];
      let added = 0;
      oldList.forEach((f, i) => {
        const newIssue = {
          id: f.id || ('issue-migrated-' + i),
          number: this.nextNumber(),
          branchId: _writeBranchId(), // 存量旧反馈无支部 → 按当前口径归部署默认支部
          title: f.painPointFile || f.scenarioName || '迁移的反馈 #' + (i + 1),
          body: [f.painPointDetail, f.proposedFix].filter(Boolean).join('\n\n'),
          scope: f.scope || 'scenario',
          types: ['bug'],
          status: f.status === 'done' ? 'closed' : 'open',
          closedReason: f.status === 'done' ? 'completed' : null,
          closedAt: f.status === 'done' ? f.submittedAt : null,
          submittedBy: f.submittedBy || '匿名',
          submittedAt: f.submittedAt || todayLocal(),
          assignee: null,
          milestone: null,
          reactions: { thumbsUp: [], thumbsDown: [], eyes: [], hooray: [] },
          mentions: [],
          references: [],
          comments: (f.comments || []).map((c, ci) => ({
            id: 'cmt-migrated-' + i + '-' + ci,
            author: c.author || '匿名',
            body: c.text || '',
            createdAt: c.date || f.submittedAt,
            hidden: false, hiddenBy: null, hiddenReason: null, hiddenAt: null,
          })),
          participants: [f.submittedBy, ...(f.comments || []).map(c => c.author)].filter(Boolean),
          commentCount: (f.comments || []).length,
        };
        _issuesCache.push(newIssue);
        added++;
      });
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(_issuesCache));
        localStorage.setItem(MIGRATED_KEY, '1');
        // 归一：迁移完成后清理旧键，避免历史提交数据残留污染（P2）
        localStorage.removeItem('gsm1921-feedback-submissions');
      } catch {}
      return added;
    } catch { return 0; }
  },

  /** 清除缓存（开发调试用） */
  clearCache() {
    _issuesCache = null;
    try {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
  },
};

// ════════════════════════════════════════════════════════════════
//  工作汇报（Report）——复用 Issue 结构，kind='report'
//  与意见反馈（kind 缺省/'feedback'）同源同库，UI 以 kind 分流。
//  分类（支书 2026-08-10 裁定）：进度 / 卡点 / 请示
//  "了解进展"请求：支书主动请人汇报（requestedBy/requestedAt/requestedNote），
//  界面措辞刻意避开"要求"二字（支书 2026-08-10 裁定），以温和请求语义呈现。
// ════════════════════════════════════════════════════════════════

export const REPORT_CATEGORIES = {
  progress: '进度',
  blocked:  '卡点',
  ask:      '请示',
};

// ════════════════════════════════════════════════════════════════
//  派生显示状态（UI 层使用，数据层不存储）
//  根据 status / assignee / resultPending 派生「开放中 / 已指派 / 处置中 / 待终审 / 已关闭」
// ════════════════════════════════════════════════════════════════

/**
 * 计算反馈的派生显示状态
 * @param {Object} issue
 * @returns {{ key: string, label: string, badgeClass: string }}
 */
export function deriveIssueDisplayState(issue) {
  if (!issue) return { key: 'unknown', label: '未知', badgeClass: 'bg-gray-100 text-gray-600' };
  if (issue.status === 'closed') {
    return { key: 'closed', label: '已关闭', badgeClass: 'bg-gray-100 text-gray-600' };
  }
  // 工作汇报分支（kind='report'）
  if (issue.kind === 'report') {
    // 支书"了解进展"请求、成员尚未回应 → 待汇报
    if (issue.requestedBy && !issue.resultPending) {
      return { key: 'to-report', label: '待汇报', badgeClass: 'bg-blue-100 text-blue-700' };
    }
    // 成员已提交汇报内容，等待支书答复 → 待答复
    if (issue.resultPending) {
      return { key: 'pending-review', label: '待答复', badgeClass: 'bg-amber-100 text-amber-700' };
    }
    return { key: 'open', label: '进行中', badgeClass: 'bg-green-100 text-green-700' };
  }
  // 开放中分支（意见反馈）
  if (issue.resultPending) {
    return { key: 'pending-review', label: '待终审', badgeClass: 'bg-amber-100 text-amber-700' };
  }
  if (issue.assignee) {
    // 有指派人，且评论时间线中存在 kind='result' 但 resultPending 还未触发（理论上不会）— 简化为「处置中」
    const hasResult = (issue.comments || []).some(c => c.kind === 'result');
    if (hasResult) {
      return { key: 'pending-review', label: '待终审', badgeClass: 'bg-amber-100 text-amber-700' };
    }
    return { key: 'assigned', label: '已指派', badgeClass: 'bg-blue-100 text-blue-700' };
  }
  return { key: 'open', label: '开放中', badgeClass: 'bg-green-100 text-green-700' };
}

/** 通知未读计数（按被指派人 personId 维度；api 形态＝服务端表 issue_unread，mock 形态＝本机键） */
const UNREAD_KEY_PREFIX = 'gsm1921-issue-unread-';

/** api 形态的服务端未读表缓存（`init()` 自 `GET /api/v1/issue-unread` 拉取；mock 形态恒为 undefined） */
function _unreadServerRows() {
  return Array.isArray(mockDB.issueUnread) ? mockDB.issueUnread : null;
}

/** 读某人的未读 issueId 集合（api 形态取服务端缓存、mock 形态取本机键；顺序＝写入序） */
function _readUnreadIds(assigneeId) {
  const rows = _unreadServerRows();
  if (rows) return rows.filter(r => r.assigneeId === assigneeId && r.unread === true).map(r => r.issueId);
  try { return JSON.parse(localStorage.getItem(UNREAD_KEY_PREFIX + assigneeId) || '[]'); } catch { return []; }
}

/** api 形态：把一次未读标记同步到服务端（fire-and-forget；本地已乐观记，下次 init 以服务端为准） */
function _syncUnreadToServer(assigneeId, issueId, unread) {
  if (!_isApiMode()) return;
  try {
    const call = getAdapter().issueUnread.set({ assigneeId, issueId, unread: !!unread });
    if (call && typeof call.catch === 'function') {
      call.catch((e) => console.warn('[IssueNotify] api 形态未读标记落服务端失败（本地已记，下次 init 以服务端为准）：', e));
    }
  } catch (e) {
    console.warn('[IssueNotify] api 形态未读标记落服务端失败（本地已记，下次 init 以服务端为准）：', e);
  }
}

/** 写某人的未读标记（api 形态＝服务端缓存行 + 同发端点；mock 形态＝本机键原路径） */
function _writeUnread(assigneeId, issueId, unread) {
  const rows = _unreadServerRows();
  if (rows) {
    const id = `${assigneeId}:${issueId}`;
    const idx = rows.findIndex(r => r.id === id);
    const next = { id, assigneeId, issueId, unread: !!unread, at: new Date().toISOString() };
    mockDB.issueUnread = idx >= 0
      ? [...rows.slice(0, idx), { ...rows[idx], ...next }, ...rows.slice(idx + 1)]
      : [...rows, next];
    _syncUnreadToServer(assigneeId, issueId, unread);
    return;
  }
  try {
    const key = UNREAD_KEY_PREFIX + assigneeId;
    const set = new Set(JSON.parse(localStorage.getItem(key) || '[]'));
    if (unread) set.add(issueId); else set.delete(issueId);
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {}
}

export const IssueNotify = {
  /** 标记某条指派为未读（被指派人维度） */
  markUnread(assigneeId, issueId) {
    _writeUnread(assigneeId, issueId, true);
  },
  /** 标记已读 */
  markRead(assigneeId, issueId) {
    _writeUnread(assigneeId, issueId, false);
  },
  /** 获取未读反馈 ID 列表 */
  getUnread(assigneeId) {
    return _readUnreadIds(assigneeId);
  },
  /** 获取未读数 */
  getUnreadCount(assigneeId) {
    return this.getUnread(assigneeId).length;
  },
  /** 标记某 issue 为「待终审」未读（支书维度） */
  markSecretaryReviewPending(issueId) {
    _writeUnread('secretary-review', issueId, true);
  },
  markSecretaryReviewRead(issueId) {
    _writeUnread('secretary-review', issueId, false);
  },
  getSecretaryReviewUnread() {
    return _readUnreadIds('secretary-review');
  },
};

// ════════════════════════════════════════════════════════════════
//  事项领域（第二档字段）· 单一源 —— 2026-09-21 批次 126（`SOP-B-32` 取甲档 · `D-550`）
//  四类照母本《常见工作场景快速指南》「意见建议类型」表（content/02_institution/sop/
//  常见工作场景快速指南.md:439-444）：制度建设建议 / 活动组织建议 / 工作流程建议 / 其他建议；
//  「建议归口」逐条照该表「处理方式」列（支委会讨论制度修改 / 支书转相关党小组组长处理 /
//  支书提交相关条条委员研究 / 支书提交支委会研究）。
//  ⚠ 本批只做「**给出建议归口**」（呈现给填写人 / 处置人），**不自动改派单**——是否指派、指派给谁，
//    仍由处置人在既有「指派」动作里决定（既有承载＝人工指派五类目标，未改）。
//  消费点：components/feedback/issue-form.js（表单第三档 + 实时提示）· components/feedback/issue-detail.js（详情元信息）·
//    entries/tabs/secretary/feedback-tab.js（支书台详情元信息）。勿在业务层另写第二份四类名单。
//  2026-09-22 批次 155：补母本该表第三列「**反馈时间**」（`replyHint`）——母本《常见工作场景快速
//    指南》「意见建议类型」表（`:439-444`）逐条＝下次支委会后 / 1周内 / 2周内 / 1个月内；系统此前
//    只有「建议归口」（＝该表「处理方式」列），**反馈时间无对应物**（欠拟合）。落点同 `suggest`：
//    本单一源出值、同 3 个展示点呈现（**只呈现母本写的时限口径，不改任何流转 / 不设催办门**）。
// ════════════════════════════════════════════════════════════════
export const ISSUE_DOMAINS = [
  { value: 'institution', label: '制度建设建议', suggest: '支委会（讨论制度修改）', replyHint: '下次支委会后' },
  { value: 'activity', label: '活动组织建议', suggest: '相关党小组组长', replyHint: '1周内' },
  { value: 'workflow', label: '工作流程建议', suggest: '相关条条委员', replyHint: '2周内' },
  { value: 'other', label: '其他建议', suggest: '支委会（研究）', replyHint: '1个月内' },
];

/** 领域值 → 中文名（未知值原样回显，不吞） */
export function issueDomainLabel(value) {
  const hit = ISSUE_DOMAINS.find((d) => d.value === value);
  return hit ? hit.label : (value || '');
}

/** 领域值 → 建议归口（母本「处理方式」列；未选 / 未知 → 空串＝无可给的建议） */
export function issueDomainSuggest(value) {
  const hit = ISSUE_DOMAINS.find((d) => d.value === value);
  return hit ? hit.suggest : '';
}

/** 领域值 → 反馈时间（母本「反馈时间」列；未选 / 未知 → 空串＝无可给的时限口径） */
export function issueDomainReplyHint(value) {
  const hit = ISSUE_DOMAINS.find((d) => d.value === value);
  return hit ? (hit.replyHint || '') : '';
}
