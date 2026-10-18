// role: [工程师]+[AI]
// help-catalog.js — help 页目录树/搜索/章节卡片/功能地图渲染（功能目录驱动）
// 数据源：docs/src/core/domain/function-catalog.js（单一事实源）
// 渲染三区：左侧目录树（#help-toc-slot）+ 顶部搜索框（#help-search-slot）+ 功能章节卡片（#help-catalog-slot）
// 功能地图 mindmap 与业务链路 flowchart 以 <pre class="mermaid"> 文本注入（源文本来自共享模块
// src/core/mermaid-sources.js，与 gen 脚本同实现），由 help-entry.js 懒加载 mermaid CDN 渲染
// （离线失败保留 .mermaid-fallback 降级文本）
import { FUNCTION_GROUPS, FUNCTION_CATALOG } from '../../core/domain/function-catalog.js?v=20261018f';
import { generateMindmapText, FLOW_LINKS } from '../../core/domain/mermaid-sources.js?v=20261018f';
import { escHtml as esc } from '../../core/base/utils.js?v=20261018f';
import { HELP_BROWSE_ROLES, HELP_QUICK_TASKS, HELP_TOC_CHAPTERS } from './help-navigation.js?v=20261018f';

// HTML 转义统一走 core/base/utils.js escHtml（2026-09-03 去重收口）

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
  let tocHtml = HELP_TOC_CHAPTERS.map((s) => `<a class="help-toc-item" href="#${s.id}" data-target="${s.id}">${s.label}</a>`).join('');
  toc.innerHTML = tocHtml;
  root.appendChild(toc);

  // ── 搜索框（右内容面板顶部 #help-search-slot）──
  const searchSlot = document.getElementById('help-search-slot');
  const searchBox = document.createElement('div');
  searchBox.className = 'help-search';
  searchBox.innerHTML = `
    <label class="help-search-label" for="help-search-input">搜索系统使用说明</label>
    <input id="help-search-input" class="help-search-input" type="search" placeholder="试试：副支书、请假、议题表决、怎么归档" aria-label="搜索帮助说明、操作步骤和设置" aria-controls="help-search-results" autocomplete="off">
    <div id="help-search-results" class="help-search-results" role="region" aria-label="帮助搜索结果" aria-live="polite" hidden></div>
    <details class="help-browse">
      <summary>按角色或常见任务浏览</summary>
      <div class="help-browse-panel">
        <label class="help-role-label" for="help-role-filter">我以什么身份使用？
          <select id="help-role-filter" class="help-role-filter">
            <option value="">选择角色查看相关说明</option>
            ${HELP_BROWSE_ROLES.map((role) => `<option value="${esc(role.id)}">${esc(role.label)}</option>`).join('')}
          </select>
        </label>
        <nav class="help-quick-tasks" aria-label="常见任务">
          <span class="help-quick-tasks-label">常见任务</span>
          ${HELP_QUICK_TASKS.map((task) => `<a href="${esc(task.href)}">${esc(task.label)}</a>`).join('')}
        </nav>
      </div>
    </details>`;
  (searchSlot || root).appendChild(searchBox);

  // ── 功能章节卡片（#help-catalog-slot：5 组 feature 条目；位于功能地图之后、第 3 章「域手册」之前——
  //   一句话名册供快速检索；细则正文见第 3/4/5 章（C2/C3 后本区保留为检索总览））──
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

  // ── 搜索索引：卡片全文 + 未被卡片覆盖的章节正文/表格 ──
  const input = searchBox.querySelector('#help-search-input');
  const resultsBox = searchBox.querySelector('#help-search-results');
  const roleFilter = searchBox.querySelector('#help-role-filter');
  const normalize = (value) => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const sectionEntries = Array.from(document.querySelectorAll('.doc-card[data-toc-id]')).map((el) => {
    const copy = el.cloneNode(true);
    copy.querySelectorAll('.help-card, .mermaid-host, .mermaid-fallback').forEach((node) => node.remove());
    const title = el.querySelector('.doc-h2')?.textContent || el.id;
    const text = copy.textContent || '';
    return {
      el, id: el.id, title,
      text: normalize(text), displayText: normalize(text),
      sectionId: el.dataset.tocId, kind: 'section',
    };
  }).filter((entry) => entry.id && entry.text);
  const cardEntries = Array.from(document.querySelectorAll('.help-card')).map((el, index) => {
    const title = el.querySelector('.help-card-title, h2, h3, h4')?.textContent || `帮助条目 ${index + 1}`;
    const section = el.closest('.doc-card[data-toc-id]');
    const group = el.closest('.help-card-group');
    const groupTitle = group?.querySelector('h2')?.textContent || '';
    const sectionId = section?.dataset.tocId || group?.id || '';
    const sectionLabel = HELP_TOC_CHAPTERS.find((item) => item.id === sectionId)?.label || groupTitle || '功能总览';
    return {
      el, id: el.id, title, sectionLabel,
      sectionId,
      text: normalize(`${el.dataset.search || ''} ${el.textContent || ''}`),
      displayText: normalize(el.textContent || ''),
      kind: 'card',
    };
  }).filter((entry) => entry.id && entry.text);
  const searchIndex = [...cardEntries, ...sectionEntries];

  function makeSnippet(text, term) {
    const plain = text.replace(/\s+/g, ' ').trim();
    const at = term ? plain.toLowerCase().indexOf(term) : -1;
    if (at < 0) return plain.slice(0, 104) + (plain.length > 104 ? '…' : '');
    const start = Math.max(0, at - 32);
    const end = Math.min(plain.length, at + term.length + 72);
    return `${start ? '…' : ''}${plain.slice(start, end)}${end < plain.length ? '…' : ''}`;
  }

  function renderResults() {
    const query = normalize(input.value);
    const selectedRole = HELP_BROWSE_ROLES.find((role) => role.id === roleFilter.value);
    const roleTerms = selectedRole ? selectedRole.terms.map(normalize) : [];
    if (!query && !selectedRole) {
      resultsBox.hidden = true;
      resultsBox.innerHTML = '';
      return;
    }
    const hits = searchIndex.filter((entry) => {
      const matchesQuery = !query || entry.text.includes(query);
      const matchesRole = !selectedRole || roleTerms.some((term) => entry.text.includes(term));
      return matchesQuery && matchesRole;
    });
    const matchingCardSections = new Set(hits.filter((entry) => entry.kind === 'card').map((entry) => entry.sectionId));
    const uniqueHits = hits.filter((entry) => entry.kind !== 'section' || !matchingCardSections.has(entry.sectionId));
    uniqueHits.sort((a, b) => {
      const aTitle = query && normalize(a.title).includes(query) ? 1 : 0;
      const bTitle = query && normalize(b.title).includes(query) ? 1 : 0;
      return bTitle - aTitle || (a.kind === b.kind ? 0 : a.kind === 'card' ? -1 : 1);
    });
    const visibleHits = uniqueHits.slice(0, 10);
    if (!visibleHits.length) {
      resultsBox.innerHTML = '<div class="help-search-none">没有找到相关说明。试试换个关键词，或清除角色筛选。</div>';
    } else {
      const countLabel = query ? `找到 ${uniqueHits.length} 条相关说明` : `找到 ${uniqueHits.length} 条与「${esc(selectedRole.label)}」相关的说明`;
      resultsBox.innerHTML = `<div class="help-search-count">${countLabel}</div>${visibleHits.map((entry) => {
        const terms = [query, ...roleTerms].filter(Boolean);
        const matchedTerm = terms.find((term) => entry.text.includes(term)) || '';
        const chapter = entry.kind === 'section'
          ? '章节正文'
          : entry.sectionLabel;
        const snippet = makeSnippet(entry.displayText, matchedTerm);
        return `<a class="help-search-result" href="#${esc(entry.id)}" data-id="${esc(entry.id)}">
          <span class="help-search-result-heading"><strong>${esc(entry.title.trim())}</strong><small>${esc(chapter)}</small></span>
          <span class="help-search-snippet">${esc(snippet)}</span>
        </a>`;
      }).join('')}${uniqueHits.length > visibleHits.length ? `<div class="help-search-count">仅显示前 ${visibleHits.length} 条，请再加一个关键词缩小范围。</div>` : ''}`;
    }
    resultsBox.hidden = false;
  }

  input.addEventListener('input', renderResults);
  roleFilter.addEventListener('change', renderResults);
  resultsBox.addEventListener('click', (e) => {
    const link = e.target.closest('.help-search-result');
    if (!link) return;
    const target = document.getElementById(link.dataset.id);
    if (!target) return;
    e.preventDefault();
    window.history.pushState(null, '', `#${target.id}`);
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('is-highlighted');
    setTimeout(() => target.classList.remove('is-highlighted'), 2600);
    input.value = '';
    roleFilter.value = '';
    renderResults();
  });

  // ── 搜索面板关闭：ESC 清空并隐藏；点击面板/输入框外区域关闭 ──
  searchBox.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    input.value = '';
    roleFilter.value = '';
    renderResults();
    input.blur();
    if (e.target.closest('.help-search-result')) input.focus();
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
    if (el) {
      window.history.pushState(null, '', `#${el.id}`);
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}
