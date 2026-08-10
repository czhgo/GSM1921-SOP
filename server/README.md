# 光华党支部管理引擎 · 后端服务（server/）

Node ESM + Express + better-sqlite3 单进程服务：同时托管前端静态页面（`../docs`）与 REST API（`/api/v1/...`），浏览器访问 `http://127.0.0.1:3000/login.html` 即可全链路工作。

## 安装 / 启动 / 测试

```bash
cd server
npm install        # 安装依赖（含 devDependency playwright，用于 E2E）
npm start          # 启动服务，默认端口 3000（可用 PORT 环境变量覆盖）
npm test           # 运行全部测试（裸 node --test 自动发现 test/ 下的 *.test.js）
```

- 启动入口 `server/server.js`：数据库为空时自动从 `docs/src/mock/*.js` 导入种子数据（users/activities/notices/taskforces/tasks/assignments/archive_records/signups）。
- 可通过 `DB_PATH` 环境变量指定数据库文件路径（默认 `server/data.db`），`PORT` 指定监听端口。

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

- 15 个后端单测/集成测试 + 1 个 Playwright E2E（`test/e2e-login.test.js`），共 16 个用例。
- E2E 自包含：测试内用 `createApp({ dbPath: ':memory:' })` + 种子启动真实服务并监听随机端口，无需外部启动服务器。
- `playwright` 锁定精确版本 `1.60.0`（与其配套的 chromium 浏览器二进制已随本机缓存；若在全新环境安装依赖，需先执行一次 `npx playwright install chromium` 下载浏览器）。
