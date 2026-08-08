// role: [工程师]+[AI]
// search-entry.js — 资料查询独立入口
import { ReferencesModule } from '../modules/references.js?v=20260808k';
import { renderSidebar } from '../components/sidebar.js?v=20260808k';
import { renderHeader } from '../components/header.js?v=20260808k';

renderSidebar('search');
renderHeader('search');

ReferencesModule.init();
ReferencesModule.render();
