// role: [工程师]+[AI]
// help-catalog.js — help 页目录树/搜索/章节卡片/功能地图渲染（功能目录驱动）
// 数据源：docs/src/core/function-catalog.js（单一事实源）
// 渲染三区：左侧目录树（#help-toc-slot）+ 顶部搜索框（#help-search-slot）+ 功能章节卡片（#help-catalog-slot）
// 功能地图 mindmap 与业务链路 flowchart 以 <pre class="mermaid"> 文本注入（源文本来自共享模块
// src/core/mermaid-sources.js，与 gen 脚本同实现），由 help-entry.js 懒加载 mermaid CDN 渲染
// （离线失败保留 .mermaid-fallback 降级文本）
import { FUNCTION_GROUPS, FUNCTION_CATALOG } from '../core/function-catalog.js?v=20260901u';
import { generateMindmapText, FLOW_LINKS } from '../core/mermaid-sources.js?v=20260901u';

// 目录树静态项（致谢第一）+ 章节顺序（与右侧内容面板顺序一致）
const STATIC_TOC = [
  { id: 'sec-ack', label: '致谢' },
  { id: 'sec-quickstart', label: '快速上手' },
];
const TOC_GROUPS = ['功能地图', ...FUNCTION_GROUPS, '业务链路', '权限体系', '技术架构', '免责声明'];
// 目录树项 → 页面目标 id 映射（静态章沿用现有 id：sec-tech/sec-disclaimer；组名章节自动 sec-<组名>）
const TOC_TARGET = { '技术架构': 'sec-tech', '免责声明': 'sec-disclaimer' };

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function genericBadge(generic) {
  return generic
    ? '<span class="help-badge generic">通用</span>'
    : '<span class="help-badge specific">特有</span>';
}

export function renderHelpCatalog(root) {
  // ── 左侧目录树 ──
  const toc = document.createElement('nav');
  toc.className = 'help-toc';
  toc.setAttribute('aria-label', '帮助目录');
  let tocHtml = STATIC_TOC.map((s) => `<a class="help-toc-item" href="#${s.id}" data-target="${s.id}">${s.label}</a>`).join('');
  for (const g of TOC_GROUPS) {
    const id = TOC_TARGET[g] || `sec-${g}`;
    tocHtml += `<a class="help-toc-item" href="#${id}" data-target="${id}">${g}</a>`;
  }
  toc.innerHTML = tocHtml;
  root.appendChild(toc);

  // ── 搜索框（右内容面板顶部 #help-search-slot）──
  const searchSlot = document.getElementById('help-search-slot');
  const searchBox = document.createElement('div');
  searchBox.className = 'help-search';
  searchBox.innerHTML = `
    <input id="help-search-input" class="help-search-input" type="search" placeholder="搜索功能，如：补课 / 审批 / 归档" aria-label="搜索帮助功能" autocomplete="off">
    <div id="help-search-results" class="help-search-results" hidden></div>`;
  (searchSlot || root).appendChild(searchBox);

  // ── 功能章节卡片（#help-catalog-slot：6 组 feature 条目，位于功能地图之后/业务链路之前）──
  const catalogSlot = document.getElementById('help-catalog-slot');
  const content = document.createElement('div');
  content.className = 'help-catalog-cards';
  for (const g of FUNCTION_GROUPS) {
    const its = FUNCTION_CATALOG.filter((i) => i.group === g && i.kind === 'feature');
    if (!its.length) continue;
    let cardHtml = '';
    for (const it of its) {
      const related = (it.related || [])
        .map((r) => `<a class="help-card-rel" href="#card-${esc(r)}">${esc(r)}</a>`)
        .join('');
      cardHtml += `
        <article class="help-card" id="card-${it.id}" data-search="${esc(it.name + ' ' + it.desc + ' ' + (it.related || []).join(' ') + ' ' + g)}">
          <h3 class="help-card-title">${esc(it.name)} ${genericBadge(it.generic)}</h3>
          <p class="help-card-desc">${esc(it.desc)}</p>
          <p class="help-card-usage">用法：${esc(it.usage || '')}</p>
          ${related ? `<p class="help-card-rel-line">参见：${related}</p>` : ''}
        </article>`;
    }
    content.innerHTML += `<section class="help-card-group" id="sec-${g}"><h2 class="doc-h2"><span class="doc-num">${g}</span></h2><hr class="doc-divider">${cardHtml}</section>`;
  }
  (catalogSlot || root).appendChild(content);

  // ── 功能地图 mindmap 源（#mermaid-funcmap 内 <pre class="mermaid">，供 mermaid onload 渲染）──
  const funcmapHost = document.getElementById('mermaid-funcmap');
  if (funcmapHost) {
    const pre = document.createElement('pre');
    pre.className = 'mermaid';
    pre.textContent = generateMindmapText();
    funcmapHost.appendChild(pre);
  }

  // ── 业务链路（#mermaid-flows：flow 条目卡片 + 各自 mermaid flowchart 源）──
  const flowsSlot = document.getElementById('mermaid-flows');
  if (flowsSlot) {
    const flows = FUNCTION_CATALOG.filter((i) => i.kind === 'flow');
    flowsSlot.innerHTML = flows.map((f) => {
      const steps = FLOW_LINKS[f.id];
      return `
        <article class="help-card" id="card-${f.id}" data-search="${esc(f.name + ' ' + f.desc + ' 业务链路')}">
          <h3 class="help-card-title">${esc(f.name)} ${genericBadge(f.generic)}</h3>
          <p class="help-card-desc">${esc(f.desc)}</p>
          ${steps ? `<div class="mermaid-host"><p class="mermaid-fallback">离线或加载失败时以文字链路描述为准。</p><pre class="mermaid">flowchart TD
${steps.join('\n')}</pre></div>` : ''}
        </article>`;
    }).join('');
  }

  // ── 搜索逻辑（索引全页 .help-card，含业务链路 flow 卡片）──
  const input = searchBox.querySelector('#help-search-input');
  const resultsBox = searchBox.querySelector('#help-search-results');
  const cards = Array.from(document.querySelectorAll('.help-card'));
  const index = cards.map((c) => ({ el: c, text: c.dataset.search || '' }));
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { resultsBox.hidden = true; resultsBox.innerHTML = ''; return; }
    const hits = index.filter((c) => c.text.toLowerCase().includes(q)).slice(0, 8);
    if (!hits.length) {
      resultsBox.innerHTML = '<div class="help-search-none">无结果，试试：考勤 / 审批 / 归档</div>';
    } else {
      resultsBox.innerHTML = hits.map((h) => {
        const name = h.el.querySelector('.help-card-title').firstChild.textContent.trim();
        return `<button class="help-search-result" type="button" data-id="${h.el.id}">${esc(name)}</button>`;
      }).join('');
    }
    resultsBox.hidden = false;
  });
  resultsBox.addEventListener('click', (e) => {
    const btn = e.target.closest('.help-search-result');
    if (!btn) return;
    const card = document.getElementById(btn.dataset.id);
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('is-highlighted');
    setTimeout(() => card.classList.remove('is-highlighted'), 2600);
    input.value = '';
    resultsBox.hidden = true;
    resultsBox.innerHTML = '';
  });

  // ── 搜索面板关闭：ESC 清空并隐藏；点击面板/输入框外区域关闭 ──
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    input.value = '';
    resultsBox.hidden = true;
    resultsBox.innerHTML = '';
    input.blur();
  });
  document.addEventListener('pointerdown', (e) => {
    if (resultsBox.hidden) return;
    if (searchBox.contains(e.target)) return; // 输入框与结果面板自身不触发关闭
    resultsBox.hidden = true;
    resultsBox.innerHTML = '';
  });

  // ── 目录树点击平滑滚动 ──
  toc.addEventListener('click', (e) => {
    const item = e.target.closest('.help-toc-item');
    if (!item) return;
    e.preventDefault();
    const el = document.getElementById(item.dataset.target);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}
