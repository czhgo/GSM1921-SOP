// role: [工程师]+[AI]
// about-entry.js — 帮助页入口（系统说明书）

import { renderSidebar } from '../components/sidebar.js';
import { renderHeader } from '../components/header.js';
import { renderCommissionerMatrix } from '../components/commissioner-matrix.js';
import { renderRoleHierarchy } from '../components/role-hierarchy.js';

renderSidebar('help');
renderHeader('help');
renderRoleHierarchy('role-hierarchy-container');
renderCommissionerMatrix('commissioner-matrix-container');

// TOC 高亮跟随滚动
const toc = document.getElementById('about-toc');
const links = toc.querySelectorAll('a');
const sections = [];
links.forEach(link => {
  const id = link.getAttribute('href').slice(1);
  const el = document.getElementById(id);
  if (el) sections.push({ id, el, link });
});

function updateActiveToc() {
  const scrollY = window.scrollY + 120;
  let current = sections[0];
  for (const s of sections) {
    if (s.el.offsetTop <= scrollY) current = s;
  }
  links.forEach(l => l.classList.remove('active'));
  if (current) current.link.classList.add('active');
}

window.addEventListener('scroll', updateActiveToc, { passive: true });
updateActiveToc();

// 平滑滚动点击
links.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const id = link.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});
