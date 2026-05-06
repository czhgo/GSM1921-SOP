// role: [人机]
// search-entry.js — 资料查询独立入口
import { ReferencesModule } from './references.js';
import { renderSidebar } from './components/sidebar.js';
import { renderHeader } from './components/header.js';

renderSidebar('search');
renderHeader('search');

ReferencesModule.init();
ReferencesModule.render();
