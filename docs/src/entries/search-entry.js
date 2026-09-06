// role: [工程师]+[AI]
// search-entry.js — 资料查询独立入口（保持匿名可访：不强制登录，仅恢复数据源）
import { ReferencesModule } from '../modules/references.js?v=20260906g';
import { renderSidebar } from '../components/sidebar.js?v=20260903c';
import { renderHeader } from '../components/header.js?v=20260903c';
import '../services/runtime.js?v=20260812d'; // 注册 mock/api 适配器（模块顶层副作用）
import { registerApiAdapter, setDataSource, init } from '../core/data-adapter.js?v=20260903c';
import { ApiAdapter } from '../core/api-adapter.js?v=20260903c';

renderSidebar('search');
renderHeader('search');

// 数据层初始化：已登录且有 token 时切 API 数据源；否则恢复本地 mock（支部文件 + 官方文件 + 网站群）
registerApiAdapter(ApiAdapter);
const savedToken = sessionStorage.getItem('gsm1921-api-token');
if (savedToken) {
  setDataSource('api', { apiBaseUrl: '', authToken: savedToken });
  try {
    await init();
  } catch (e) {
    console.warn('[search] API 数据加载失败，回退本地 mock', e);
    setDataSource('mock');
  }
} else {
  try {
    await init();
  } catch (e) {
    console.warn('[search] mock 数据加载失败', e);
  }
}

ReferencesModule.init();
