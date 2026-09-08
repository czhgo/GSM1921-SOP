# 光华党支部管理引擎 · 后端服务（server/）

Node ESM + Express + better-sqlite3 单进程服务：同时托管前端静态页面（`../docs`）与 REST API（`/api/v1/...`），浏览器访问 `http://127.0.0.1:3000/login.html` 即可全链路工作。

## 安装 / 启动 / 测试

```bash
cd server
npm install            # 安装依赖（含 devDependency playwright，用于 E2E）
npm start              # 启动服务，默认端口 3000（可用 PORT 环境变量覆盖）
npm test               # 全量测试（等价 npm run test:full）
npm run test:core      # 核心流程子集回归（议程/表决、成员变更、多端写入、模块加载、帮助 E2E 等，文件清单见 server/package.json）
npm run test:fast      # 快速回归子集（基础单元 + 目录/链接审计等，文件清单见 server/package.json）
npm run clean:tmp      # 清理测试残留目录 .tmp（脚本非正常中止时使用）
```

- 启动入口 `server/server.js`：数据库为空时自动从 `docs/src/mock/*.js` 导入种子数据（users/branches/activities/notices/taskforces/tasks/assignments/archive_records/signups）；`DISABLE_SEED=1` 时空库也不导入演示种子（真实支部全新建库直接录真实数据用）。
- 环境变量模板见 `server/.env.example`（均有缺省，未配置即可本地演示运行）：`DB_PATH` 指定数据库文件路径（默认 `server/data.db`）、`PORT` 指定监听端口、`LOGIN_PASSWORD` 为统一登录口令（缺省 '123456'，与前端演示账号一致）、`DISABLE_PASSWORD_CHECK=1` 跳过口令校验（内网演示/测试套件用，生产勿开；`npm test`/`test:core`/`test:fast`/`test:full` 脚本均默认注入）。
- **重置 / 初始化口径**：前端 `?reset=demo/preview/init` 仅本地演示形态（无 API token）生效，API 模式不执行、数据以服务器为权威；服务端重置 = 删除 `server/data.db` 后重启自动重种，或 `DISABLE_SEED=1` 空库起步。

## 数据与文件

| 项 | 位置 | 说明 |
|---|---|---|
| SQLite 数据库 | `server/data.db` | 单文件库，备份即复制该文件；未启动时不存在，首次 `npm start` 自动创建并导入种子 |
| 附件目录 | `server/uploads/` | 登录用户上传的附件（jpg/png/pdf/docx/xlsx，单文件 ≤10MB），首次启动自动创建 |
| 前端静态文件 | `docs/`（仓库根目录） | 由 Express 静态托管，与后端同源部署 |

## 部署对接

- 本地/演示：`docs/` 与 `server/` 在仓库内保持相对路径即可直接运行，前端 API 走同源相对路径 `/api/v1/...`。
- 对接北大计算中心时：将 `docs/` 与 `server/` 一并部署到同一 Web 根目录（保持 `docs` 为静态根、`server` 为 Node 服务），由统一反向代理把 `/api/v1/` 转发到 Node 服务，页面静态资源由 Web 服务器托管。
- 前端登录流程：账号密码表单 → 本地 Mock 校验 → `POST /api/v1/auth/login` 换取 token → 写入 `sessionStorage['gsm1921-api-token']` 并切换 API 数据源（失败静默降级本地模式）。E2E 验证见 `server/test/e2e-login.test.js`（Playwright 端到端：登录 → token → 首页渲染 → bootstrap 数据可达）。

## 测试说明

- **套件规模（动态口径）**：测试文件随 `server/test/` 目录增长（`.test.js` / `.test.mjs` 混合，含单元/集成、审计守护、E2E 等），本文件不维护固定计数，以 `server/test/` 实际目录为准。
- **全量跑**：`npm test`（等价 `npm run test:full`）——脚本注入 `DISABLE_PASSWORD_CHECK=1` 后执行 `node --test --test-concurrency=1`，自动发现 `server/test/` 下全部 `*.test.{js,mjs}`。纯 node 部分沙箱环境即可运行；浏览器类/E2E（Playwright）需在常规终端运行（依赖见下文 Playwright 条）。
- **子集回归**：`npm run test:core`（核心流程：议程/表决、成员变更、多端写入、模块加载、帮助 E2E 等）与 `npm run test:fast`（基础单元 + 目录/链接审计等快速项）按子集加速回归，文件清单见 `server/package.json` 的 scripts。
- **运行形态**：大多数测试自包含——测试内 `createApp({ dbPath: ':memory:' })` + 种子起真实服务并监听随机端口（如 `e2e-login.test.js`）；部分审计/E2E 需先 `npm start` 起外部 server 于 3000 端口（如 `click-cost` / `mock-integrity`，各自文件头注释有运行说明）。
- **版本戳**：`node docs/scripts/bump-version.mjs` 会同步 `server/test/*.mjs` 内的 `?v=` 版本戳；bump 后跑一次全量测试。
- **Playwright**：锁定 `1.60.0`（配套 chromium 二进制随本机缓存）；全新环境需先 `npx playwright install chromium` 下载浏览器。
