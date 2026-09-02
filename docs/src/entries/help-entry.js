﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿// role: [工程师]+[AI]
// help-entry.js — 帮助页入口（系统说明书）

import { renderSidebar } from '../components/sidebar.js?v=20260901n';
import { renderHeader } from '../components/header.js?v=20260901n';
import { renderHelpCatalog } from '../modules/help-catalog.js?v=20260901n';

// 静态壳模式（2026-08-12）：help 为纯静态文档，不加载 auth/notice 数据链（约 50 模块），
// 仅渲染共享侧边栏/顶栏壳；通知铃首次点击时才按需加载通知模块。
renderSidebar('help', { staticShell: true });
renderHeader('help', { staticShell: true });

// 目录树 + 搜索 + 功能章节卡片 + 功能地图/业务链路 mermaid 源（catalog 驱动，
// 搜索框由渲染器直接注入右内容面板顶部 #help-search-slot）
renderHelpCatalog(document.getElementById('help-toc-slot'));

// ── 右侧圆点目录（参考关于页 .help-toc-nav）──
// 2026-08-18：删重叠叙事（原「分工中的制度设计」「怎么理解具体的这个组织」两章），
// help 回归「系统说明书」定位——叙事归 about / DEVELOPMENT_PATH。
const TOC_ITEMS = [
  { id: 'sec-ack',        label: '致谢' },
  { id: 'sec-quickstart', label: '快速上手' },
  { id: 'sec-what',       label: '这个系统在干什么' },
  { id: 'sec-tech',       label: '技术架构' },
  { id: 'sec-disclaimer', label: '免责声明' },
];

function renderTOC() {
  const items = TOC_ITEMS.map(item => `
    <a href="#${item.id}" class="help-toc-dot-item" data-toc="${item.id}" aria-label="跳转到${item.label}">
      <span class="help-toc-dot-mark" aria-hidden="true"></span>
      <span class="help-toc-dot-tooltip">${item.label}</span>
    </a>
  `).join('');
  const nav = document.createElement('nav');
  nav.className = 'help-toc-nav';
  nav.setAttribute('aria-label', '页面目录');
  nav.innerHTML = `<div class="help-toc-nav-inner">${items}</div>`;
  document.body.appendChild(nav);
  return nav;
}

// 固定小目录：点击跳转 + 当前 section 高亮（复用关于页 bindTOC 逻辑）
function bindTOC() {
  const nav = renderTOC();
  const tocItems = nav.querySelectorAll('.help-toc-dot-item');
  const sections = document.querySelectorAll('.doc-card[data-toc-id]');
  if (!tocItems.length || !sections.length) return;

  tocItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const id = item.dataset.toc;
      const target = document.getElementById(id);
      if (target) {
        const headerOffset = 64;
        const top = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  nav.addEventListener('mouseenter', () => nav.classList.add('is-hovered'));
  nav.addEventListener('mouseleave', () => nav.classList.remove('is-hovered'));

  let currentId = null;
  const setActive = (id) => {
    if (id === currentId) return;
    currentId = id;
    tocItems.forEach(item => {
      item.classList.toggle('is-active', item.dataset.toc === id);
    });
  };

  // 滚动定位当前章节：取"顶部已越过标记线的最靠下章节"
  // （原 IntersectionObserver 阈值方案对高章节失效——相交比永远低于 15% 阈值；
  //   此方案只看章节顶部位置，与章节高度无关，快速上手等长章节也能正确切换）
  const MARKER_OFFSET = 120;
  const updateActive = () => {
    // 滚动到底部兜底激活最后一章（末章顶部可能永远无法越过标记线）
    const scrolledToBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1;
    if (scrolledToBottom) {
      setActive(TOC_ITEMS[TOC_ITEMS.length - 1].id);
      return;
    }
    let active = TOC_ITEMS[0].id;
    sections.forEach(s => {
      if (s.getBoundingClientRect().top <= MARKER_OFFSET) {
        active = s.dataset.tocId;
      }
    });
    setActive(active);
  };

  window.addEventListener('scroll', updateActive, { passive: true });
  window.addEventListener('resize', updateActive);
  updateActive();
}

bindTOC();

// ── 功能地图/业务链路 mermaid 懒加载 ──
// 滚动至功能地图章可见时注入 mermaid CDN；onload 后渲染 .mermaid 元素：
// 渲染成功以 SVG 替换宿主内内容（含 fallback 占位），失败保留 .mermaid-fallback 降级文本。
// 注：startOnLoad:false + 逐元素 render（避免 startOnLoad:true 自动 run 与手动 render 双重渲染竞态）
let mermaidLoaded = false;
function loadMermaid() {
  if (mermaidLoaded) return;
  mermaidLoaded = true;
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
  script.onload = () => {
    window.mermaid?.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: { primaryColor: '#FDF2F2', primaryBorderColor: '#CE1126', primaryTextColor: '#7A0010', lineColor: '#D1D5DB' },
    });
    document.querySelectorAll('.mermaid-host pre.mermaid').forEach((el) => {
      if (el.dataset.processed === '1') return;
      el.dataset.processed = '1';
      window.mermaid?.render('fm' + Math.random().toString(36).slice(2), el.textContent)
        .then((r) => {
          const host = el.closest('.mermaid-host');
          if (host && r.svg) host.innerHTML = r.svg;
        })
        .catch(() => {});
    });
  };
  document.head.appendChild(script);
}
const funcmapEl = document.getElementById('sec-功能地图');
if (funcmapEl) {
  const io = new IntersectionObserver((entries) => {
    if (entries.some((en) => en.isIntersecting)) { loadMermaid(); io.disconnect(); }
  }, { rootMargin: '200px' });
  io.observe(funcmapEl);
}
