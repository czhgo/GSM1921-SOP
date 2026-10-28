// role: [工程师]+[AI]
// entries/tabs/visitor/growth-tab.js — 成员台「我的成长」（2026-10-25 IA 62→45）
//
// 由来：原「思想汇报」「我的考察」「我的复盘」三个页签回答同一个问题（我在支部里如何成长 / 留下记录），
//   且渲染实现高度同构（都是「本人记录 + 提交口」）。本批合并为一页三子区（−2 页签），
//   **渲染函数一律复用原模块**（`thought-report-tab.js` / `inspection-tab.js` / `review-tab.js`
//   的 `renderContent(ctx, host)`），本文件只做容器与展开时机，不复制第二套列表 / 表单。
// 深链：`?tab=growth&section=thought|inspection|review` 直接展开对应子区（旧 `?tab=thought-report|inspection|review`
//   由工作台壳的 `_legacyTabAliases` 重定向到这里）。

import { renderTabHeader } from '../../../components/shell/page-frame.js?v=20261028d';

const SECTIONS = [
  {
    key: 'thought',
    aliases: ['thought-report', 'thought'],
    title: '思想汇报',
    meta: '按期次提交与回看；提交即入库归档。',
    load: () => import('./thought-report-tab.js?v=20261028d'),
  },
  {
    key: 'inspection',
    aliases: ['inspection'],
    title: '我的考察',
    meta: '本人历次活动参与考察记录与申诉入口。',
    load: () => import('./inspection-tab.js?v=20261028d'),
  },
  {
    key: 'review',
    aliases: ['review'],
    title: '我的复盘',
    meta: '组织者 / 深度参与者提交复盘 → 纪检批注确认。',
    load: () => import('./review-tab.js?v=20261028d'),
  },
];

/** 子区骨架：标题在 `<summary>` 外（aria-labelledby 关联），展开态在 `open` 上 */
function _sectionHtml(section, open) {
  const id = `growth-${section.key}`;
  return `
    <div class="card rounded-xl p-5 disclosure-host">
      <h3 class="disclosure__title" id="${id}-title">${section.title}</h3>
      <details class="disclosure" id="${id}"${open ? ' open' : ''} data-growth-section="${section.key}">
        <summary class="disclosure__summary" aria-labelledby="${id}-title">${section.meta}</summary>
        <div class="disclosure__body" id="${id}-body"></div>
      </details>
    </div>`;
}

export function renderContent(ctx = {}) {
  const container = document.getElementById('visitor-tab-content');
  if (!container) return null;

  const wanted = ctx?.navTarget?.section || '';
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
    if (!body || body.dataset.mounted === '1') return;
    body.dataset.mounted = '1';
    section.load().then((m) => {
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
    container.querySelector(`#growth-${hit.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  return null;
}
