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
| 附件目录 | `server/uploads/`（可用 `UPLOAD_DIR` 改） | 支委层上传的附件（jpg/jpeg/png/pdf/doc/docx/xlsx/mp4，单文件 ≤10MB），首次启动自动创建；**下载需登录，并按上传人所属支部隔离**（党委跨支部可见） |
| 前端静态文件 | `docs/`（仓库根目录） | 由 Express 静态托管，与后端同源部署 |

## 部署对接

- 本地/演示：`docs/` 与 `server/` 在仓库内保持相对路径即可直接运行，前端 API 走同源相对路径 `/api/v1/...`。
- 对接北大计算中心时：将 `docs/` 与 `server/` 一并部署到同一 Web 根目录（保持 `docs` 为静态根、`server` 为 Node 服务），由统一反向代理把 `/api/v1/` 转发到 Node 服务，页面静态资源由 Web 服务器托管。
- 前端登录流程：账号密码表单 → 本地 Mock 校验 → `POST /api/v1/auth/login` 换取 token → 写入 `sessionStorage['gsm1921-api-token']` 并切换 API 数据源（失败静默降级本地模式）。E2E 验证见 `server/test/e2e-login.test.js`（Playwright 端到端：登录 → token → 首页渲染 → bootstrap 数据可达）。

## 测试说明

- **套件规模（动态口径）**：测试文件随 `server/test/` 目录增长（`.test.js` / `.test.mjs` 混合，含单元/集成、审计守护、E2E 等），本文件不维护固定计数，以 `server/test/` 实际目录为准。
- **全量跑**：`npm test`（等价 `npm run test:full`）——脚本注入 `DISABLE_PASSWORD_CHECK=1` 后执行 `node --test --test-concurrency=1`，自动发现 `server/test/` 下全部 `*.test.{js,mjs}`。纯 node 部分沙箱环境即可运行；浏览器类/E2E（Playwright）需在常规终端运行（依赖见下文 Playwright 条）。
- **子集回归**：`npm run test:core`（核心流程：议程/表决、成员变更、多端写入、模块加载、帮助 E2E 等）与 `npm run test:fast`（基础单元 + 目录/链接审计等快速项）按子集加速回归，文件清单见 `server/package.json` 的 scripts。
- **运行形态**：大多数测试自包含——测试内 `createApp({ dbPath: ':memory:' })` + 种子起真实服务并监听随机端口（如 `e2e-login.test.js`）；部分审计/E2E 需先 `npm start` 起外部 server 于 3000 端口（**三个**：`click-cost` / `mock-integrity` / `b3-1-makeup-writeback`，各自文件头注释有运行说明）。
- **版本戳**：`node docs/scripts/bump-version.mjs` 会同步 `server/test/*.mjs` 内的 `?v=` 版本戳；bump 后跑一次全量测试。**注意**：该脚本按「字符串含 `/src/….js` 且以引号收尾」判定（宽是必要的——测试里有 `from '../../docs/src/…js'` 这类相对路径 import），因此会命中**数据字符串**：凡把 `docs/src/…js` 路径当**数据**存的文件，请写成 `SRC + '相对路径'`（见 `test/form-loop-registry.mjs`），否则补戳会把数据改坏（2026-09-15 批次 44 真实事故，见 `content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md` 范本第十四与 `REVIEW_QUEUE Q-23-33`）。
- **测试节奏（2026-09-15 支书定）**：**日常只跑与改动面相关的定向守卫**，例如 `node --test test/filter-row.test.mjs test/relation-matrix.test.mjs`、`node --test test/form-loop-sweep.test.mjs test/version-stamp.test.mjs`（真机项秒级到十余秒一项）；**全量只在交付/提交前跑**。真机普查（`page-sweep` 七台 × 全 tab、`form-loop-sweep` 54 条真机闭环 ＋ 17 条成功路径）耗时最长，且本机若开着大量浏览器进程会导致 e2e 超时——此时以**单独复跑**取证，区分「环境负载」与「真回归」。
- **测试耗时台账（2026-09-21 支书定）**：下表是**本机实测**（2026-09-21，开发机常规终端，`--test-concurrency=1` 串行），用来回答三件事——**改代码时跑什么、收尾跑什么、怎么跑最省时间**。**口径**：耗时给的是**量级与量程**，不是承诺（同一项两次取样可差一到七个百分点——`link-integrity` 9.5 / 10.6 秒；机器忙起来还会更长）；**「有多少文件、多少项」仍以上一句「套件规模（动态口径）」为准**（会随开发增长的计数不写死，相对稳定的耗时才值得记）。

  **① 过程中（每批改代码、落盘后即跑）：守卫子集 —— 一条命令约 21 秒（8 文件 / 63 项，四次取样实测 20.9–22.1 秒）**

  ```bash
  node --test --test-concurrency=1 test/doc-consistency.test.mjs test/link-integrity.test.mjs test/version-stamp.test.mjs test/module-load.test.mjs test/permission-gate.test.mjs test/server-base.test.mjs test/scene-write-sync.test.mjs test/doc-line-ref.test.mjs
  ```

  > ⚠ `permission-gate` / `server-base` 两项要求**跳过口令校验**：手跑这条命令前**先设 `DISABLE_PASSWORD_CHECK=1`**（`npm test` 的 scripts 已默认注入，手跑不设会红——实测不设时该两项 **7 pass / 13 fail**）。**无需先起服务**。

  | 守卫 | 两次取样（秒） | 项 | 它挡什么 |
  |---|---|---|---|
  | `link-integrity` | 9.5 / 10.6 | 5 | 全站死链——`docs/**/*.html` 的 href/src（含 base href 解析）与 `docs/src/**` 的跳转目标，逐个落到真实文件 / `#锚点` / HTTP 200 |
  | `module-load` | 4.8 / 5.0 | 2 | 浏览器内 import 全部 `docs/src` 模块：语法错 / 同作用域重复声明 / 顶层未定义引用（E1）＋ 每个顶层页真的装配了数据源（E2） |
  | `doc-consistency` | 1.9 / 1.9 | 13 | 文档口径与代码实况一致（各台 tab 数与名称 · 数据五数 · 页面数 · 旧界面名黑名单 · 单一源组件登记 · §0.2 索引与 README 清单齐备 · 授权声明带日期 · `TIMESTAMPS` 与 frontmatter 对齐） |
  | `permission-gate` | 1.8 / 1.8 | 9 | 资源级写角色门——branches / users / activities / notices 等越权须 403 |
  | `doc-line-ref` | 1.6 / 1.6 | 5 | `README-server.md` 的「`文件:行号`」引用逐条指向真实位置（行号失效＝后端照着找不到东西） |
  | `version-stamp` | 1.5 / 1.6 | 15 | `?v=` 版本戳单一源、只前进、补戳判据自洽（同页两个模块实例＝页面静默空白） |
  | `server-base` | 1.4 / 1.4 | 11 | 服务端基座——建表 / 种子 / 资源读口与 bootstrap / 附件上传 / 快照全量回写 |
  | `scene-write-sync` | 0.4 / 0.4 | 3 | 写活动的场景目录单一源（四子会名序 · 平铺 id 全集 · 归类有效） |

  **② 收尾（一批做完 / 提交前）：全量 —— 约 18 分钟（实测 712 项 / 712 通过 / 0 红，17.9 分钟）**：`cd server` → 先 `npm start`（**约 3 秒**起好，实测 2.7 秒）→ `npm test` → 停服。**为什么非跑不可**：见 `CLAUDE.md R-85`——**只跑守卫子集不算收尾**；批次 97 实测过，改造留下的陈旧断言「只跑守卫子集」永远跑不到、被绿着掩盖（那次首跑 11 红）。**必须起服务**的是三个文件：`click-cost` / `mock-integrity` / `b3-1-makeup-writeback`（都要连 `http://localhost:3000`，不起必红——那属**环境类红**，不是真回归）。

  **③ 时间效率：钱花在哪、怎么少花**
  - **最贵的一步就是全量本身，起服务可以忽略**：起服务约 3 秒；全量那 18 分钟里，**两个真机普查文件占掉约 10.5 分钟（近六成）**——`form-loop-sweep` ≈ 520 秒（78 项：54 条真机闭环 ＋ 17 条成功路径 ＋ S0–S6 台账守卫）、`page-sweep` ≈ 111 秒（11 项：七台 × 全部 tab）；**其余 623 项合计约 6.2 分钟**。单文件最慢的十来个（单跑实测）：`page-sweep` 111.5 秒 · `click-cost` 50.0 · `agenda-flow` 42.0 · `branch-doc` 37.0 · `multi-user-write` 27.1 · `async-vote` 26.4 · `party-committee` 19.4 · `relation-matrix` 16.6 · `agenda-closure` 15.6 · `branch-config-audit` 12.3（**第 11–20 位在 4–11 秒**〔按全量日志内该文件用例耗时求和〕：`inspection-loop-e2e` 11.4 · `party-committee-review` 10.2 · `module-config-e2e` 9.1 · `block-entry-guard-e2e` 8.1 · `block-canvas-e2e` 7.9 · `link-integrity` 7.0 · `party-committee-dispatch` 6.8 · `mock-integrity` 5.7 · `block-config-ui-e2e` 5.3 · `e2e-login` 5.2；**其余 70 余文件合计仅约 49 秒**）。
  - **推荐顺序**：① 改代码 → **只跑上面那条守卫子集**（约 21 秒）；② **若动过 `docs/src/**` 或 `server/**`，先 bump 版本戳再跑守卫**——改了文件不 bump 即版本链分裂，`version-stamp` 必红，白跑一轮；③ 一批做完 → **起一次服务** → 全量 → 停服：三个依赖外部服务的文件跟着全量一起跑，**不要为它们单独起停一轮**。
- **Playwright**：锁定 `1.60.0`（配套 chromium 二进制随本机缓存）；全新环境需先 `npx playwright install chromium` 下载浏览器。
