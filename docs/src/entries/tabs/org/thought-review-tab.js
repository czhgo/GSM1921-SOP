// role: [工程师]+[AI]
// 组织委员工作台 Tab：思想汇报例外清单（2026-10-20 第三轮 IA 判例②）
//
// 定位（支书判例）：**完整记录在个人档案，组织台只处理例外**。
//   · 个人档案 `person.html` 的「思想汇报」段＝按人归集的全部篇目（制度承诺的落地位）；
//   · 本页只回答「现在有谁需要我处理」：未交 / 待初阅 / 待补充三类例外，不再渲染全量色块矩阵。
//
// 为什么删掉人 × 期次矩阵：
//   矩阵回答的是「谁哪期交了」——那是查阅，不是组织委员的日常动作；全量色块把首屏让给一片只读格子，
//   而真正要办的（催交、看未读、跟踪打回）反而要自己从格子里找。判例②裁定收窄为例外清单。
//
// 「待初阅」口径（不改服务层状态机）：
//   2026-09-18 批次 86（`SOP-B-28` / `D-387`）已取消「初阅通过才归档」这道门，提交即 archived。
//   因此本页的「待初阅」**不是待归档的中间态**，而是「已入库、但组织委员还没有任何审阅留痕」——
//   判据复用既有 `reviewHistory`（打回是唯一留痕动作），不新增字段、不复活旧 `pending` 状态。
//   它只提示「还没看过」，不拦归档、不产生写动作。

import { listAllThoughtReports, comparePeriodDesc, periodOf } from '../../../services/governance/thought-report.js?v=20261022c';
import { getPersonName, liveMembers } from '../../../services/member/person.js?v=20261022c';
import { AuthStore } from '../../../services/core/auth.js?v=20261022c';
import { escHtml as esc, getBasePath } from '../../../core/base/utils.js?v=20261022c';
import { ROLE_LABELS } from '../../../core/domain/constants.js?v=20261022c';
import { listRowHtml } from '../../../components/ui/list-row.js?v=20261022c';
// 例外清单仍是按人表：接统一引擎只为**分页**（无关键词 / 无分面时引擎自动不渲染检索条）。
import { renderFilteredList } from '../../../components/ui/list-filter.js?v=20261022c';
import { renderTabHeader } from '../../../components/shell/page-frame.js?v=20261022c';

const STATUS_LABEL = {
  needs_revision: '已打回 · 待补充',
  archived: '已入库',
};

/** 例外分组（顺序＝处理优先级：未交 → 待初阅 → 待补充） */
const GROUPS = [
  { key: 'missing', title: '未交', hint: '本期没有记录' },
  { key: 'unreviewed', title: '待初阅', hint: '已入库、尚无审阅留痕（不拦归档）' },
  { key: 'revision', title: '待补充', hint: '已打回，等本人重交' },
];

function _personHref(personId) {
  return `${getBasePath()}person.html?id=${encodeURIComponent(personId)}`;
}

function _reportHref(reportId) {
  return `${getBasePath()}thought-report.html?id=${encodeURIComponent(reportId)}`;
}

/** 单行：姓名 + 期次/时间 + 状态 + 「查看 / 档案」两个出口（list-row 单一源） */
function _rowHtml({ personId, name, meta, statusText, reportId }) {
  const status = statusText
    ? `<span class="text-xs text-amber-700">${esc(statusText)}</span>`
    : '';
  return listRowHtml({
    rowType: 'action',
    title: name,
    meta: meta ? `${meta}${status ? ' · ' : ''}${status}` : '',
    trailing: `<div class="flex items-center gap-3">
      ${reportId ? `<a href="${_reportHref(reportId)}" class="text-xs text-sky-700 hover:underline">查看</a>` : ''}
      <a href="${_personHref(personId)}" class="text-xs text-gray-500 hover:underline">档案</a>
    </div>`,
  });
}

export function renderContent(ctx) { // ctx 对齐 org 其它 tab（本 tab 不消费额外配置）
  const container = document.getElementById('org-tab-content');
  if (!container) return;

  const user = AuthStore.getCurrentUser();
  if (!user) {
    container.innerHTML = `${renderTabHeader({ title: '思想汇报' })}<div class="card rounded-xl p-5"><p class="text-xs text-gray-500 text-center py-6">— 请先登录后使用</p></div>`;
    return;
  }
  // 防御：非组织委员不渲染。角色键一律走 ROLE_LABELS（R3-04：不得把 `secretary` 原样抛给用户）。
  if (user.role !== 'org-commissioner') {
    const roleName = ROLE_LABELS[user.role] || '当前身份';
    container.innerHTML = `
      ${renderTabHeader({ title: '思想汇报' })}
      <div class="card rounded-xl p-5">
        <p class="text-xs text-gray-500 text-center py-6">— 无权限：仅组织委员可审阅思想汇报（当前身份：${esc(roleName)}）</p>
      </div>`;
    return;
  }

  const all = listAllThoughtReports();
  const periods = [...new Set(all.map((r) => r.period))].sort(comparePeriodDesc);
  const currentPeriod = periods[0] || periodOf(new Date().toISOString());
  const current = all.filter((r) => r.period === currentPeriod);

  // 未交：在册成员在本期没有任何记录（已移出的人不催交）
  const submitted = new Set(current.map((r) => r.personId));
  const missing = [...liveMembers()]
    .filter((p) => !submitted.has(p.id))
    .map((p) => ({
      personId: p.id,
      name: getPersonName(p.id) || p.name || p.id,
      meta: `${currentPeriod} 未交`,
    }));

  // 待初阅：本期已入库、且该人本期所有篇目都没有审阅留痕（人员级，避免同一人多篇重复出现）
  const byPerson = new Map();
  current.forEach((r) => {
    const key = r.personId;
    if (!byPerson.has(key)) byPerson.set(key, []);
    byPerson.get(key).push(r);
  });
  const unreviewed = [...byPerson.entries()]
    .filter(([, list]) => list.every((r) => r.reviewStatus !== 'needs_revision' && !(r.reviewHistory || []).length))
    .map(([personId, list]) => {
      const latest = [...list].sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''))[0];
      return {
        personId,
        name: getPersonName(personId) || latest.personName || personId,
        meta: `${currentPeriod} · 提交 ${String(latest.submittedAt || '').slice(0, 10)}${list.length > 1 ? ` · 共 ${list.length} 篇` : ''}`,
        reportId: list.length === 1 ? latest.id : '',
      };
    });

  // 待补充：所有期次的打回记录都算未闭环（跨期存在）
  const revision = all
    .filter((r) => r.reviewStatus === 'needs_revision')
    .map((r) => ({
      personId: r.personId,
      name: getPersonName(r.personId) || r.personName || r.personId,
      meta: `${r.period} · 提交 ${String(r.submittedAt || '').slice(0, 10)}`,
      statusText: STATUS_LABEL.needs_revision,
      reportId: r.id,
    }));

  const data = { missing, unreviewed, revision };
  const counts = GROUPS.map((g) => data[g.key].length);
  const total = counts.reduce((sum, n) => sum + n, 0);

  container.innerHTML = `
    ${renderTabHeader({ title: '思想汇报', description: '本期未交、待初阅与待补充的例外清单。' })}
    <div class="card rounded-xl p-5">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div class="min-w-0">
          <h3 class="font-title-cn text-base font-semibold text-gray-800">思想汇报例外</h3>
          <p class="mt-0.5 text-xs text-gray-500">${esc(currentPeriod)} · 需处理 ${total} 项</p>
        </div>
        <span class="text-xs text-gray-500">完整记录见各行「档案」</span>
      </div>
      <div class="mt-4 space-y-4">
        ${GROUPS.map((g) => {
          const rows = data[g.key];
          return `<section aria-label="${esc(g.title)}">
            <div class="flex items-baseline justify-between gap-2 mb-1.5">
              <h4 class="text-sm font-semibold text-gray-700">${esc(g.title)} <span class="tabular-nums text-gray-500">${rows.length}</span></h4>
              <span class="text-[11px] text-gray-500">${esc(g.hint)}</span>
            </div>
            ${rows.length
              ? `<div id="tr-group-${g.key}"></div>`
              : `<p class="text-sm text-gray-600">${g.key === 'revision' ? '暂无待补充' : `${esc(g.title)} 0 人`}</p>`}
          </section>`;
        }).join('')}
      </div>
    </div>
  `;

  // 每组接一个引擎实例：keyword null + facets [] ⇒ 不出检索条，只出分页（长名单不把页面撑成一片）。
  GROUPS.forEach((g) => {
    const host = container.querySelector(`#tr-group-${g.key}`);
    if (!host) return;
    renderFilteredList(host, {
      stateKey: `org-thought-${g.key}`,
      rows: data[g.key],
      keyword: null,
      facets: [],
      countUnit: '项',
      pageSize: 10,
      listClass: 'divide-y divide-gray-100',
      emptyMessage: g.key === 'revision' ? '暂无待补充' : `${g.title} 0 人`,
      rowHtml: (row) => _rowHtml(row),
    });
  });
}
