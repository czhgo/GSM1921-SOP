// role: [人机]
// archive-entry.js — 归档库独立入口
import { renderSidebar } from './components/sidebar.js';
import { renderHeader } from './components/header.js';

renderSidebar('archive');
renderHeader('archive');

document.getElementById('archive-search')?.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll('#archive-list > div').forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(q) ? '' : 'none';
  });
});

document.getElementById('archive-filter')?.addEventListener('change', (e) => {
  const type = e.target.value;
  document.querySelectorAll('#archive-list > div').forEach(item => {
    if (type === 'all') { item.style.display = ''; return; }
    const text = item.textContent.toLowerCase();
    const match = (type === 'activity' && text.includes('党建活动')) ||
                  (type === 'taskforce' && text.includes('专班')) ||
                  (type === 'notice' && text.includes('通知'));
    item.style.display = match ? '' : 'none';
  });
});
