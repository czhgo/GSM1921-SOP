// role: [工程师]+[AI]
// search-entry.js — 资料查询独立入口
import { ReferencesModule } from '../modules/references.js';
import { renderSidebar } from '../components/sidebar.js';
import { renderHeader } from '../components/header.js';

renderSidebar('search');
renderHeader('search');

ReferencesModule.init();
ReferencesModule.render();
