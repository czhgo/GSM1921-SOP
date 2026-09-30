// role: [工程师]+[AI]
// search-entry.js — 资料查询独立入口（保持匿名可访：不强制登录，仅恢复数据源）
import { ReferencesModule } from '../../components/sections/references.js?v=20260930e';
import { renderSidebar } from '../../components/shell/sidebar.js?v=20260930e';
import { renderHeader } from '../../components/shell/header.js?v=20260930e';
import { BranchService } from '../../services/core/runtime.js?v=20260930e'; // 注册 mock/api 适配器 + BranchService 绑定（loadDB）
import { hydrateDataSource } from '../../data/data-adapter.js?v=20260930e';
import { ApiAdapter } from '../../data/api-adapter.js?v=20260930e';

renderSidebar('search');
renderHeader('search');

// 数据层初始化（P0-2 2026-09-23 收敛）：判定唯一源＝data/data-adapter.js::hydrateDataSource——
// 有 token 走 api、**失败即失败**（渲染「无法连接服务器」错误态 + 重试，不再静默回退可写 mock＝静默丢单）；
// 无 token（本页匿名可访）走本地 mock（支部文件 + 官方文件 + 网站群）。
// ⚠ 本地 mock 仍统一走 BranchService.loadDB()：不再直连 data-adapter.init() mock 分支（其 adapter.loadDB()
//   直连 MockAdapter.loadDB，绕过 init 档检测与演示种子剔除——?reset=init 后的空支部态在本页会回填演示数据，
//   2026-09-08 C2 收口）。
try {
  await hydrateDataSource({
    apiAdapter: ApiAdapter,
    loadMock: () => { try { BranchService.loadDB(); } catch (e) { console.warn('[search] mock 数据加载失败', e); } },
  });
} catch (e) {
  console.warn('[search] 数据层初始化异常', e);
}

ReferencesModule.init();
