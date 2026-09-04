// role: [工程师]+[AI]
// 部署形态配置 — 构建/部署时注入，标记静态托管 vs 有后端
// 依据 content/04_web_design/deploy/AUTHENTICATION_MODEL.md §六
//
// 'static' = GitHub Pages 静态托管（docs/ 直接部署，无后端，有 about）
// 'server' = Node 一体化后端（server/ 同源，有 /api/v1 + 登录 + 持久化，无 about）
//
// 部署时按形态改此常量（GitHub Pages 保持 'static'；Node server 部署改为 'server'）。
export const DEPLOY_MODE = 'static';

// 空域 seed 回退开关（2026-09-02 部署件）：服务层在对应数据域为空时是否回退注入演示种子。
// - true  = 演示形态（默认）：空表回退演示数据，体验不空窗
// - false = 真实部署（server 形态 + 真实账本）务必改 false：
//   否则用户任何一次写触发快照上传时，会把先前空表回退注入的演示种子一并写到服务端，污染真实账本。
//   切换后按 DEPLOYMENT_GUIDE 附录 A.2「真实部署 checklist」逐一关闭 services 层 9 处空表回退。
export const SEED_FALLBACK = true;
