// role: [工程师]+[AI]
// help-entry.js — 帮助页入口（系统说明书）

import { renderSidebar } from '../../components/shell/sidebar.js?v=20261028e';
import { renderHeader } from '../../components/shell/header.js?v=20261028e';
import { HELP_TOC_CHAPTERS } from '../../components/sections/help-navigation.js?v=20261028e';
import { BranchService } from '../../services/core/runtime.js?v=20261028e';
import { getBranchOrg } from '../../services/branch/branch.js?v=20261028e';
import { DEFAULT_BRANCH_ID } from '../../core/domain/constants.js?v=20261028e';
import { DEPLOY_MODE } from '../../config/deploy.js?v=20261028e';

// 静态壳模式（2026-08-12）：help 为纯静态文档，不加载 auth/notice 数据链（约 50 模块），
// 仅渲染共享侧边栏/顶栏壳；通知铃首次点击时才按需加载通知模块。
renderSidebar('help', { staticShell: true });
renderHeader('help', { staticShell: true });

// ── 支部名软编码（2026-10-28）────────────────────────────────────────────
// HTML 三处（页眉 / 正文实例说明 / 免责声明）只留中性兜底「本支部」，统一用 `data-org-name` 标记；
// 支部显示名按托管形态运行期填充：
//   · 本地演示形态（DEPLOY_MODE='static'）：加载本地演示库后读支部档案（getBranchOrg；
//     config.headerTitle → name）——静态逻辑保持不变。
//   · 服务端形态（api）：访客登录前读不到支部资源，改走**免登录最小读口**
//     `GET /api/v1/public/branch-name`（只回 `{ name }`）。失败 / 被拦截 / 空值保持中性兜底，
//     不报错、不阻塞其它内容渲染。
function applyOrgName(title) {
  const next = String(title || '').trim();
  if (!next) return;
  document.querySelectorAll('[data-org-name]').forEach((el) => {
    el.textContent = next;
  });
}

function applyLocalOrgName() {
  const org = getBranchOrg(DEFAULT_BRANCH_ID);
  applyOrgName(org && (org.headerTitle || org.name));
}

function applyServerOrgName() {
  fetch('./api/v1/public/branch-name', { cache: 'no-store', headers: { Accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : null))
    .then((body) => { if (body) applyOrgName(body.name); })
    .catch(() => { /* 保持中性兜底：不阻塞页面、不污染控制台 */ });
}

if (DEPLOY_MODE === 'static') {
  try {
    BranchService.loadDB();
    applyLocalOrgName();
  } catch (e) {
    console.warn('[help] 支部配置未就绪，支部名保持中性兜底', e);
  }
} else {
  applyServerOrgName();
}

// 目录树 + 搜索 + 功能章节卡片 + 功能地图/业务链路 mermaid 源（catalog 驱动，
// 搜索框由渲染器直接注入右内容面板顶部 #help-search-slot）
// E-5（2026-09-09）首屏优化：catalog 链（help-catalog → function-catalog/mermaid-sources
// 约 30KB 模块）改 DOMContentLoaded 后动态加载——0–7 章为 help.html 静态正文，首屏不等待
// 该模块图；目录/搜索/卡片在 DCL 后数毫秒内补齐，交互与功能不变。
import('../../components/sections/help-catalog.js?v=20261028e')
  .then(({ renderHelpCatalog }) => {
    renderHelpCatalog(document.getElementById('help-toc-slot'));
  })
  .catch((err) => console.warn('[help] catalog 渲染失败', err));

// ── 右侧圆点目录（参考关于页 .help-toc-nav）──
// 2026-09-07 起：help 重组为 0–8 章编号骨架（0 入口速查 / 1 快速上手 / 2 角色工作台导览 /
// 3 域手册 / 4 设置逐项 / 5 业务链路 / 6 党委与配置 / 7 这个系统在干什么 / 8 技术架构）；
// 2026-09-27：新增「4 设置逐项」（设置说明书自原第 5 章 5.4 独立成章，插在域手册与业务链路之间），
//   原 4 业务链路 → 5、原 5 党委与配置 → 6、原 6 → 7、原 7 → 8（章号与全仓引用同批改准）；
// 与 help.html 静态章节 id、help-catalog.js 左侧目录树保持同一序列。
function renderTOC() {
  const items = HELP_TOC_CHAPTERS.map(item => `
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

  // 2026-10-23 Task 7：目录提亮改由 `.help-toc-nav:focus-within` 触发（键盘等价），不再绑 mouseenter。

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
      setActive(HELP_TOC_CHAPTERS[HELP_TOC_CHAPTERS.length - 1].id);
      return;
    }
    let active = HELP_TOC_CHAPTERS[0].id;
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
