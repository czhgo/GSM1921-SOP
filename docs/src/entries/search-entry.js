// role: [工程师]+[AI]
// search-entry.js — 资料查询独立入口（保持匿名可访：不强制登录，仅恢复数据源）
import { ReferencesModule } from '../modules/references.js?v=20260908d';
import { renderSidebar } from '../components/sidebar.js?v=20260908d';
import { renderHeader } from '../components/header.js?v=20260908d';
import { BranchService } from '../services/runtime.js?v=20260908d'; // 注册 mock/api 适配器 + BranchService 绑定（loadDB）
import { registerApiAdapter, setDataSource, init } from '../core/data-adapter.js?v=20260908d';
import { ApiAdapter } from '../core/api-adapter.js?v=20260908d';

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
  // 本地 mock：统一走 BranchService.loadDB()（可改 reset/init 触发链 + init 态种子过滤）。
  // 不再直连 data-adapter.init() mock 分支（其 adapter.loadDB() 直连 MockAdapter.loadDB，
  // 绕过 init 档检测与演示种子剔除——?reset=init 后的空支部态在本页会回填演示数据，2026-09-08 C2 收口）。
  try {
    BranchService.loadDB();
  } catch (e) {
    console.warn('[search] mock 数据加载失败', e);
  }
}

ReferencesModule.init();
