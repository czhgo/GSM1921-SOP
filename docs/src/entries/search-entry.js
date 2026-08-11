// role: [工程师]+[AI]
// search-entry.js — 资料查询独立入口
import { ReferencesModule } from '../modules/references.js?v=20260811a';
import { renderSidebar } from '../components/sidebar.js?v=20260811a';
import { renderHeader } from '../components/header.js?v=20260811a';

renderSidebar('search');
renderHeader('search');

ReferencesModule.init();
ReferencesModule.render();
