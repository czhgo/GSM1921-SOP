// role: [工程师]+[AI]
// 部署形态配置 — 构建/部署时注入，标记静态托管 vs 有后端
// 依据 content/04_web_design/deploy/DEPLOYMENT_AUTH_MODEL.md §六
//
// 'static' = GitHub Pages 静态托管（docs/ 直接部署，无后端，有 about）
// 'server' = Node 一体化后端（server/ 同源，有 /api/v1 + 登录 + 持久化，无 about）
//
// 部署时按形态改此常量（GitHub Pages 保持 'static'；Node server 部署改为 'server'）。
export const DEPLOY_MODE = 'static';
