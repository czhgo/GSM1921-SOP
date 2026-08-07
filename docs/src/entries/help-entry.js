// role: [工程师]+[AI]
// help-entry.js — 帮助页入口（系统说明书）

import { renderSidebar } from '../components/sidebar.js?v=20260807i';
import { renderHeader } from '../components/header.js?v=20260807i';
import { renderRoleHierarchy } from '../components/role-hierarchy.js?v=20260807i';

renderSidebar('help');
renderHeader('help');
renderRoleHierarchy('role-hierarchy-container');

// ── 右侧圆点目录（参考关于页 .help-toc-nav）──
const TOC_ITEMS = [
  { id: 'sec-ack',        label: '致谢' },
  { id: 'sec-quickstart', label: '快速上手' },
  { id: 'sec-what',       label: '这个系统在干什么' },
  { id: 'sec-design',     label: '分工中的制度设计' },
  { id: 'sec-why',        label: '怎么理解具体的这个组织' },
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
