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

- **套件**：`server/test/` 共 **17 个测试文件**（`npm test` 裸 `node --test` 自动发现 `*.test.{js,mjs}`）：
  - **单元/集成（9 个 `.test.js`）**：auth / db / resources / seed / skeleton / snapshot / uploads / report / e2e-login
  - **审计守护（8 个 `.test.mjs`）**：agenda-flow（三会一课议程回归）、b3-1-makeup-writeback（补课完成→考勤回写）、capability-registry（能力注册表原语）、click-cost（点击成本 ≤2 跳）、link-integrity（死链四层法 L1-L5）、mock-integrity（Mock 数据完整性 M1-M2）、module-load（全模块加载冒烟：语法/重复声明/未定义引用）、references-official-links（官方制度文件 12371 链接断言）
- **两类运行形态**：多数自包含（测试内 `createApp({ dbPath: ':memory:' })` + 种子起真实服务并监听随机端口）；`click-cost` / `mock-integrity` 需先 `npm start`（外部 server 在 3000 端口）。
- **版本戳**：`node docs/scripts/bump-version.mjs` 会同步 `server/test/*.mjs` 内的 `?v=` 版本戳；bump 后跑一次全量测试。
- **Playwright**：锁定 `1.60.0`（配套 chromium 二进制随本机缓存）；全新环境需先 `npx playwright install chromium` 下载浏览器。
