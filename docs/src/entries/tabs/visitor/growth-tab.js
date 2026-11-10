// role: [工程师]+[AI]
// entries/tabs/visitor/growth-tab.js — 成员台「我的成长」（2026-10-25 IA 62→45）
//
// 由来：原「思想汇报」「我的考察」「我的复盘」三个页签回答同一个问题（我在支部里如何成长 / 留下记录），
//   且渲染实现高度同构（都是「本人记录 + 提交口」）。本批合并为一页三子区（−2 页签），
//   **渲染函数一律复用原模块**（`thought-report-tab.js` / `inspection-tab.js` / `review-tab.js`
//   的 `renderContent(ctx, host)`），本文件只做容器与展开时机，不复制第二套列表 / 表单。
// 深链：`?tab=growth&section=thought|inspection|review` 直接展开对应子区（旧 `?tab=thought-report|inspection|review`
//   由工作台壳的 `_legacyTabAliases` 重定向到这里）。

import { renderTabHeader } from '../../../components/shell/page-frame.js?v=20261110b';
import { smoothScroll, flashHighlight } from '../../../core/base/utils.js?v=20261110b';
// 批次 540 波次 1：待办跳转的定位目标（visitor growth：考察 / 复盘 / 思想汇报子区）
import { PendingTarget } from '../../../core/session/pending-target.js?v=20261110b';

const SECTIONS = [
  {
    key: 'thought',
    aliases: ['thought-report', 'thought'],
    title: '思想汇报',
    meta: '按期次提交与回看；提交即入库归档。',
    load: () => import('./thought-report-tab.js?v=20261110b'),
  },
  {
    key: 'inspection',
    aliases: ['inspection'],
    title: '我的考察',
    meta: '本人历次活动参与考察记录与申诉入口。',
    load: () => import('./inspection-tab.js?v=20261110b'),
  },
  {
    key: 'review',
    aliases: ['review'],
    title: '我的复盘',
    meta: '组织者 / 深度参与者提交复盘 → 纪检批注确认。',
    load: () => import('./review-tab.js?v=20261110b'),
  },
];

/** 子区骨架：标题在 `<summary>` 外（aria-labelledby 关联），展开态在 `open` 上 */
function _sectionHtml(section, open) {
  const id = `growth-${section.key}`;
  return `
    <div class="card rounded-xl p-5 disclosure-host">
      <h3 class="disclosure__title" id="${id}-title">${section.title}<span class="disclosure__meta">${section.meta}</span></h3>
      <details class="disclosure" id="${id}"${open ? ' open' : ''} data-growth-section="${section.key}">
        <summary class="disclosure__summary" aria-labelledby="${id}-title"></summary>
        <div class="disclosure__body" id="${id}-body"></div>
      </details>
    </div>`;
}

export function renderContent(ctx = {}) {
  const container = document.getElementById('visitor-tab-content');
  if (!container) return null;

  // 批次 540：待办跳转目标只在本页消费；`section` / `kind` 决定展开哪个子区（缺 id 仍给显式提示）
  const pending = PendingTarget.peek();
  const pendingTarget = (pending && pending.tab === 'growth') ? PendingTarget.consume() : null;
  const pendingSection = pendingTarget
    ? (pendingTarget.section || SECTION_OF_KIND[pendingTarget.kind] || '')
    : '';

  const wanted = ctx?.navTarget?.section || pendingSection || '';
  const hit = SECTIONS.find((s) => s.aliases.includes(wanted));
  const firstKey = SECTIONS[0].key;
  // 深链命中 → 只展开该子区；否则默认展开第一区（「进入即见首条」，减一次点击）。
  const openKey = hit ? hit.key : firstKey;

  container.innerHTML = `
    ${renderTabHeader({ title: '我的成长', description: '思想汇报 / 我的考察 / 我的复盘：三类成长记录与提交口。' })}
    <div class="space-y-4">
      ${SECTIONS.map((s) => _sectionHtml(s, s.key === openKey)).join('')}
    </div>`;

  const mount = (section) => {
    const body = container.querySelector(`#growth-${section.key}-body`);
    if (!body || body.dataset.mounted === '1') return Promise.resolve();
    body.dataset.mounted = '1';
    return section.load().then((m) => {
      if (body.isConnected) m.renderContent(ctx, body);
    });
  };

  for (const section of SECTIONS) {
    const details = container.querySelector(`#growth-${section.key}`);
    if (!details) continue;
    if (details.open) mount(section);
    details.addEventListener('toggle', () => { if (details.open) mount(section); });
  }

  // 深链：展开后把目标子区滚到视野（可见说明 = 子区已展开，不额外弹 toast）。
  if (hit) {
    smoothScroll(container.querySelector(`#growth-${hit.key}`), { block: 'start' });
  }
  if (pendingTarget) _settlePendingTarget(container, pendingTarget, hit ? hit.key : '');
  return null;
}

/** PendingTarget.kind → 子区键（待办动作表只给业务语义，不写 tab 内的 section 字面量之外的第二套映射） */
const SECTION_OF_KIND = { inspection: 'inspection', review: 'review', thought: 'thought' };

/**
 * 消费后的定位（批次 540）：展开子区后等挂载完成，再滚动 / 高亮该条；
 * 缺 id 或未命中 → 页内显式提示（「未定位到具体条目」，不静默落顶部）。
 */
function _settlePendingTarget(container, target, sectionKey) {
  const key = sectionKey || SECTIONS.find((s) => s.aliases.includes(target.section || ''))?.key || '';
  const details = key ? container.querySelector(`#growth-${key}`) : null;
  const host = details || container;
  if (details && !details.open) details.open = true;
  const done = () => {
    const row = target.id
      ? (container.querySelector(`[data-person-id="${target.id}"]`)
        || container.querySelector(`[data-inspection-id="${target.id}"]`)
        || container.querySelector(`[data-id="${target.id}"]`))
      : null;
    if (row) {
      smoothScroll(row, { block: 'center' });
      flashHighlight(row);
      return;
    }
    container.querySelectorAll('[data-nav-target-missing]').forEach((el) => el.remove());
    const hint = document.createElement('div');
    hint.dataset.navTargetMissing = '1';
    hint.setAttribute('role', 'status');
    hint.className = 'card rounded-xl p-3 mb-4 text-xs text-amber-800 bg-amber-50 border border-amber-200';
    hint.textContent = target.id
      ? '未定位到具体条目（该记录可能已归档或已移出列表）。'
      : '未定位到具体条目（本次跳转未带对象编号），已落到「我的成长」顶部。';
    container.prepend(hint);
  };
  // 子区内容为懒加载：等一帧再定位（挂载未完成时按未命中处理，仍给显式提示）
  setTimeout(() => { smoothScroll(host, { block: 'start' }); done(); }, 0);
}
