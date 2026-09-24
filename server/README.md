# 光华党支部管理引擎 · 后端服务（server/）

Node ESM + Express + better-sqlite3 单进程服务：同时托管前端静态页面（`../docs`）与 REST API（`/api/v1/...`），浏览器访问 `http://127.0.0.1:3000/login.html` 即可全链路工作。

## 安装 / 启动 / 测试

```bash
cd server
npm install            # 安装依赖（含 devDependency playwright，用于 E2E）
npm start              # 启动服务，默认端口 3000（可用 PORT 环境变量覆盖）
npm test               # 全量（等价 npm run test:full / test:precommit，含两个真机普查；需先 npm start）；改代码时改跑 npm run test:daily（S 类 71 文件，约 2.3 分钟，见「测试说明」）
npm run test:core      # 核心流程子集回归（议程/表决、成员变更、多端写入、模块加载、帮助 E2E 等，文件清单见 server/package.json）
npm run test:fast      # 快速回归子集（基础单元 + 目录/链接审计等，文件清单见 server/package.json）
npm run clean:tmp      # 清理测试残留目录 .tmp（脚本非正常中止时使用）
```

- 启动入口 `server/server.js`：数据库为空时自动从 `docs/src/mock/*.js` 导入种子数据（users/branches/activities/notices/taskforces/tasks/assignments/archive_records/signups）；`DISABLE_SEED=1` 时空库也不导入演示种子（真实支部全新建库直接录真实数据用）。**2026-09-23 P0-4**：**生产形态（`APP_ENV=production` 或 `NODE_ENV=production`）默认不播种**（不必依赖「记得设 `DISABLE_SEED=1`」）；启动日志会打印 `users` 计数与「演示种子账号」计数，供核对「库内是否只有真人」。**前端侧另有构建期常量 `docs/src/config/deploy.js::SEED_FALLBACK`**（**2026-09-23 批次 163 起已接线、改它生效**）：置 `false` 时 `docs/src/core/data-adapter.js::init()` 不再为「考勤 / 考察 / 待办」三域注入演示种子（默认 `true`＝演示形态）。⚠ **Node 托管（本 server）形态下已接线**：`server/app.js` 对 `/src/config/deploy.js` 的动态注入串**已带上该常量**，其值由环境变量 `SEED_FALLBACK` 决定（置 `0` ⇒ 注入 `false`；缺省 / 其它值 ⇒ `true`）⇒ 本形态下发 `SEED_FALLBACK=0` 即可关断（见 `server/.env.example`）。它只覆盖那三处，**不替代**上面的 `DISABLE_SEED`／生产形态。
- 环境变量模板见 `server/.env.example`（均有缺省，未配置即可本地演示运行）：`DB_PATH` 指定数据库文件路径（默认 `server/data.db`）、`PORT` 指定监听端口、`LOGIN_PASSWORD` 为统一登录口令（缺省 '123456'，与前端演示账号一致）、`DISABLE_PASSWORD_CHECK=1` 跳过口令校验（内网演示/测试套件用；`npm test`/`test:core`/`test:fast`/`test:full` 脚本均默认注入）、`APP_ENV` 运行形态（**`production` ＝ 生产**，见下条）。**2026-09-23 P0-3（上线安全）**：生产形态下 ① 未设 `LOGIN_PASSWORD` ⇒ **启动即拒**（进程退出并打印可读原因）；② `DISABLE_PASSWORD_CHECK` **一律不认**（逃逸门只在本地/测试形态生效）；③ 口令比对不含 `'123456'` 兜底。**非生产形态（本地/测试）行为一字不变**。
- **重置 / 初始化口径**：前端 `?reset=demo/preview/init` 仅本地演示形态（无 API token）生效，API 模式不执行、数据以服务器为权威；服务端重置 = 删除 `server/data.db` 后重启自动重种，或 `DISABLE_SEED=1`（或生产形态）空库起步。

## 数据与文件

| 项 | 位置 | 说明 |
|---|---|---|
| SQLite 数据库 | `server/data.db` | 单文件库（**WAL 模式**，同目录还会有 `data.db-wal` / `data.db-shm`）；未启动时不存在，首次 `npm start` 自动创建并导入种子（生产形态不播种，见上）。**备份不要直接拷这个文件**——见下方「备份与恢复」 |
| 附件目录 | `server/uploads/`（可用 `UPLOAD_DIR` 改） | 支委层上传的附件（jpg/jpeg/png/pdf/doc/docx/xlsx/mp4，单文件 ≤10MB），首次启动自动创建；**下载需登录，并按上传人所属支部隔离**（党委跨支部可见） |
| 前端静态文件 | `docs/`（仓库根目录） | 由 Express 静态托管，与后端同源部署 |
| 备份产物 | `server/backups/<时间戳>/`（可用 `--out` 改） | 由 `scripts/backup.mjs` 生成：`data.db`（一致性快照）+ `uploads/`（附件整体） |

### 备份与恢复（2026-09-23 P0-5）

**为什么不能只 `copy data.db`**：库是 WAL 模式 ⇒ 最近写入可能还在 `data.db-wal` 里没并回主库，**只拷主文件会丢最近写入**；附件物理文件在 `uploads/`（库里只有元数据），**只备库＝附件全丢**。

```powershell
# Windows（推荐）：在 server\ 目录下
.\scripts\backup.ps1                                    # → server\backups\<时间戳>\
.\scripts\backup.ps1 -Out D:\bak\20260923 -Db D:\x\data.db -Uploads D:\x\uploads
.\scripts\backup.ps1 -NoUploads                         # 只备库（确认附件已另行归档时才用）
```

```bash
# 跨平台 / 直接调 node（脚本本体，服务器上也可用）
cd server
node scripts/backup.mjs                                 # 用 DB_PATH / UPLOAD_DIR 缺省值
node scripts/backup.mjs --out /srv/bak/20260923
```

- **安全手段**：数据库用 SQLite **在线备份 API**（better-sqlite3 `db.backup()`）⇒ 由 SQLite 自己保证「含 WAL 内容的一致性快照」，**不需要停服**；备份后当场校验（副本 `PRAGMA integrity_check` + `users` 行数），不通过即报错退出（退出码 1）。
- **附件目录不存在或为空 ⇒ 优雅跳过**（打印「跳过（目录不存在/为空）」），不报错。
- **恢复步骤**（务必停服，避免写入落在被替换的库上）：
  1. 停服（systemd / pm2 / 关闭 `npm start` 进程）；
  2. 用备份的 `data.db` 覆盖 `DB_PATH` 指向的库文件，并**删除同目录的 `data.db-wal` / `data.db-shm`**（残留旧 WAL 会与新库不一致）；
  3. 用备份的 `uploads/` 覆盖 `UPLOAD_DIR` 目录（保留原目录权限）；
  4. 启动服务，看启动日志的 `[server] 自检 · users 计数=…` 确认数据已回来。
- 定时备份建议：用系统计划任务（Windows 任务计划程序 / cron）每日调用 `scripts/backup.ps1`（或 `node scripts/backup.mjs`），并把 `server/backups/` 之外的副本另存到别的磁盘或对象存储。

## 部署对接

- 本地/演示：`docs/` 与 `server/` 在仓库内保持相对路径即可直接运行，前端 API 走同源相对路径 `/api/v1/...`。
- 对接北大计算中心时：将 `docs/` 与 `server/` 一并部署到同一 Web 根目录（保持 `docs` 为静态根、`server` 为 Node 服务），由统一反向代理把 `/api/v1/` 转发到 Node 服务，页面静态资源由 Web 服务器托管。
- 前端登录流程：账号密码表单 → 本地 Mock 校验 → `POST /api/v1/auth/login` 换取 token → 写入 `sessionStorage['gsm1921-api-token']` 并切换 API 数据源。**2026-09-23 P0-2（不许静默降级）**：**有 token 时**若 `init()` 拉不到服务端数据，页面**显式报错**（「无法连接服务器」+ 重试），**不再**回退可写的本地 mock（旧行为＝用户以为在真系统里操作、实际只写浏览器，下次登录被服务端覆盖 ⇒ 静默丢单）；**无 token 的本地演示形态保持原样**。形态可用 `core/data-adapter.js::getRuntimeMode()` 断言（返回 `{source, hasToken, branchId, stage}`）。E2E 验证见 `server/test/e2e-login.test.js`（Playwright 端到端：登录 → token → 首页渲染 → bootstrap 数据可达）。
- **远端变更探测（P1-1，2026-09-24 批次 164，前端机制·后端只需提供既有读口）**：前端读的是内存缓存（`init()` 只在页面加载那一刻拉一次）⇒ 此前「别人刚写的」必须**整页重载**才可见（跨标签 / 跨设备同病）。现加**低频探测**（单一源 = `docs/src/core/data-adapter.js` 末尾「P1-1 远端变更探测」段，`probeRemoteChanges`）：触发＝① 页面**由隐藏转可见**（`docs/src/entries/main-entry.js` 既有 `visibilitychange` 监听器内调用，未另挂第二个）② **可见态低频定时器**（缺省 **60 秒**，隐藏态不探测）；动作＝取 **既有** `GET /api/v1/snapshot/versions` 与本机基线**逐集合比对**、**只重拉版本不一致的集合**（与 409 冲突恢复共用同一实现），拉到即经既有 `gsm1921:data-changed` 事件让页面重渲染。**同源多标签**另加 `BroadcastChannel`（频道 `gsm1921-data-changed`）**零网络**唤醒（只是「去探测一次」的信号，数据仍从服务端取）。**避让**：本机有未 flush 的在途写 / `init()` 未完成 ⇒ 整次跳过；该集合本机仍脏 ⇒ 逐个排除（防把本机未提交的改动当「远端更新」回滚）。**失败静默**：探测只读，断网 / 401 只 `console.warn`，**不弹错误、不影响使用**（**与写链的 fail-fast 是两件事**：写链行为一字未改）。**运维开关**：`localStorage['gsm1921-remote-probe'] = 'off'`（或页面内 `setRemoteProbeEnabled(false)`）关闭，**默认开**；**mock / 静态托管形态零网络、自动不启用**（无服务端可探）。**服务端侧无需新增任何路由或表**——它只消费既有的 `GET /api/v1/snapshot/versions`（`requireAuth`）。

## 测试说明

- **套件规模（动态口径）**：测试文件随 `server/test/` 目录增长（`.test.js` / `.test.mjs` 混合，含单元/集成、审计守护、E2E 等），本文件不维护固定计数，以 `server/test/` 实际目录为准。
- **全量跑**：`npm test`（等价 `npm run test:full`）——脚本注入 `DISABLE_PASSWORD_CHECK=1` 后执行 `node --test --test-concurrency=1`，自动发现 `server/test/` 下全部 `*.test.{js,mjs}`。纯 node 部分沙箱环境即可运行；浏览器类/E2E（Playwright）需在常规终端运行（依赖见下文 Playwright 条）。
- **子集回归**：`npm run test:core`（核心流程：议程/表决、成员变更、多端写入、模块加载、帮助 E2E 等）与 `npm run test:fast`（基础单元 + 目录/链接审计等快速项）按子集加速回归，文件清单见 `server/package.json` 的 scripts。
- **两条日常命令（2026-09-23 提速批·刀③ 拆档）**——回答「改代码时跑什么 / 提交前跑什么」：
  - **日常（改代码时）**：`npm run test:daily` —— **S 类 ＝ 不 `import 'playwright'` 的纯 node 文件，当前 71 个**（判据可复核：`node --test` 前不必起服务、不驱动浏览器）。**含全部守卫子集**（下节 8 文件）。实测 **567 项 / 567 通过 / 0 红 / 144.1 秒（2026-09-24 本机实测）**；**项数随测试增长、耗时随机器负载浮动，均以实跑输出为准**。
    - ⚠ **日常档不含「形态断言」那几项**：`getRuntimeMode()` 形态断言落在 **P 类真机文件**（`form-loop-sweep` / `page-sweep` / `multi-user-write`），都不在 test:daily 里。改到**真机交互 / 数据源形态 / 登录会话**时，别只跑日常档——用下面的**降频开关**定向跑真机，或直接跑提交前档。
  - **提交前（交付 / 收尾）**：`npm run test:precommit` —— 等价全量（自动发现 `server/test/` 全部 `*.test.{js,mjs}`）；**先 `npm start` 起服务**（`click-cost` / `mock-integrity` / `b3-1-makeup-writeback` 要连 3000），跑完停服。
- **真机普查降频开关（2026-09-23 提速批·刀②，支书已放行「按 tab 降频」）**——只跑关心的 tab，不改任何判据、不缩任何台账基线：
  ```bash
  # 只跑「活动管理」「通知发布」两个 tab 的真机流程（阶段一 + 成功路径一起过滤）；不设＝全跑
  # PowerShell: $env:FORM_LOOP_TABS='活动管理,通知发布'; node --test --test-concurrency=1 test/form-loop-sweep.test.mjs
  FORM_LOOP_TABS=活动管理,通知发布 node --test --test-concurrency=1 test/form-loop-sweep.test.mjs
  ```
  口径：`FORM_LOOP_TABS` 按 **tab 名子串**匹配（与 `openTab` 定位 tab 的口径一致），逗号分隔；**S0–S6 台账守卫照跑、规模基线不缩水**（它断言的是台账数据，与「跑几条」无关）。另有 **S7** 专门守「tab 名打错 ⇒ 真机用例静默归零而全绿」——本次实测：`FORM_LOOP_TABS=支部管理` ⇒ 阶段一 3 条（跳过 53 条）· 成功路径 1 条（跳过 16 条），**12 项全绿 / 37.5 秒**（同 tab 全跑 4 条真机）。
- **运行形态**：大多数测试自包含——测试内 `createApp({ dbPath: ':memory:' })` + 种子起真实服务并监听随机端口（如 `e2e-login.test.js`）；部分审计/E2E 需先 `npm start` 起外部 server 于 3000 端口（**三个**：`click-cost` / `mock-integrity` / `b3-1-makeup-writeback`，各自文件头注释有运行说明）。**纯 node 但跑 api 形态**（自己起内存服务 + 真登录取 token，故**必须 `DISABLE_PASSWORD_CHECK=1`**，否则登录 401 ⇒ 该文件整体报错）：`test/member-persist.test.mjs`（api 段）、`test/branch-roster-import.test.mjs`（api 段）、`test/group-view.test.mjs`（2026-09-23 提速批由 mock 形态改造为 api 形态，并带 `getRuntimeMode()` 形态断言）、`test/roster.test.mjs`（2026-09-24 由「纯 node 静态种子」改造为 api 形态：内存服务 + 真登录 + `init()`，与 `group-view.test.mjs` 同形，并加 S0 形态断言 / S1 两形态同源）。这四项在 `npm test` / `test:daily` 的 scripts 里已自动注入该变量；**手跑记得先设**。
- **P1-1 判据 A–D 验收（2026-09-24 批次 164）**：`test/multi-tab-sync.test.mjs` —— **自包含**（测试内 `createApp({ dbPath: ':memory:' })` + 随机端口 + Playwright 真机，**不需要 3000 端口的常驻服务**，与 `page-sweep` 同款自起自停）。五条用例＝**判据 A**（跨标签：`visibilitychange` 骨架与低频定时器两条触发面各验一次，B 标签不重载即看到 A 的记录）· **判据 B**（跨设备：全新 context 重进即可见 ＋ `GET /api/v1/snapshot/versions` 上该集合版本**严格 +1**）· **判据 C-①**（防抖窗口内探测**整次跳过**、本机改动不被吞、随后仍正常落库）· **判据 C-②**（本机未 persist 的脏集合不重拉、其它集合照常刷新）· **判据 D**（停服后探测静默：无 `#data-source-error` 浮层、无 `pageerror`、页面仍可用）。
- **版本戳**：`node docs/scripts/bump-version.mjs` 会同步 `server/test/*.mjs` 内的 `?v=` 版本戳；bump 后跑一次全量测试。**注意**：该脚本按「字符串含 `/src/….js` 且以引号收尾」判定（宽是必要的——测试里有 `from '../../docs/src/…js'` 这类相对路径 import），因此会命中**数据字符串**：凡把 `docs/src/…js` 路径当**数据**存的文件，请写成 `SRC + '相对路径'`（见 `test/form-loop-registry.mjs`），否则补戳会把数据改坏（2026-09-15 批次 44 真实事故，见 `content/05_ai_coding/DATA_CONSISTENCY_CHECKLIST.md` 范本第十四与 `REVIEW_QUEUE Q-23-33`）。
- **测试节奏（2026-09-15 支书定；2026-09-23 提速批按支书「任务执行要提速」重排）**：**日常只跑与改动面相关的定向守卫**（或直接 `npm run test:daily`，实测约 2.3 分钟）；**全量只在交付/提交前跑**（`npm run test:precommit`）。真机普查（`page-sweep` 七台 × 全 tab、`form-loop-sweep` 56 条真机闭环 ＋ 17 条成功路径）耗时最长，且本机若开着大量浏览器进程会导致 e2e 超时——此时以**单独复跑**取证，区分「环境负载」与「真回归」；**只关心某几个 tab 时用上面的 `FORM_LOOP_TABS` 降频开关**（支书 2026-09-23 放行「按 tab 降频」，不必整份跑完）。
- **测试耗时台账（2026-09-21 支书定；2026-09-23 批次 159 按实测重数）**：下表是**本机实测**（2026-09-21，开发机常规终端，`--test-concurrency=1` 串行；项数与守卫子集耗时于 2026-09-23 复核），用来回答三件事——**改代码时跑什么、收尾跑什么、怎么跑最省时间**。**口径**：耗时给的是**量级与量程**，不是承诺（同一项两次取样可差一到七个百分点——`link-integrity` 9.5 / 10.6 秒；机器忙起来还会更长）；**「有多少文件、多少项」仍以上一句「套件规模（动态口径）」为准**（会随开发增长的计数不写死，相对稳定的耗时才值得记）。

  **① 过程中（每批改代码、落盘后即跑）：守卫子集 —— 一条命令约 30 秒（8 文件 / 66 项，2026-09-23 批次 161 实测 29.6 秒；批次 159 同一命令 64 项时四次取样 25.3–29.1 秒；2026-09-21 同一命令 63 项时实测 20.9–22.1 秒 ⇒ **项数随守卫增长，以实跑输出为准**）**
  > 2026-09-23 提速批：**日常更推荐直接 `npm run test:daily`**（约 2.3 分钟）——它**已包含本守卫子集全部 8 个文件**，并额外覆盖全部 S 类纯 node 测试（含 api 形态的 `permission-gate` / `server-base` / `group-view` 等）。本守卫子集仍是「只想跑最少的几条」时的最快选择。

  ```bash
  node --test --test-concurrency=1 test/doc-consistency.test.mjs test/link-integrity.test.mjs test/version-stamp.test.mjs test/module-load.test.mjs test/permission-gate.test.mjs test/server-base.test.mjs test/scene-write-sync.test.mjs test/doc-line-ref.test.mjs
  ```

  > ⚠ `permission-gate` / `server-base` 两项要求**跳过口令校验**：手跑这条命令前**先设 `DISABLE_PASSWORD_CHECK=1`**（`npm test` 的 scripts 已默认注入，手跑不设会红——实测不设时该两项 **7 pass / 13 fail**）。**无需先起服务**。

  | 守卫 | 两次取样（秒） | 项 | 它挡什么 |
  |---|---|---|---|
  | `link-integrity` | 9.5 / 10.6 | 5 | 全站死链——`docs/**/*.html` 的 href/src（含 base href 解析）与 `docs/src/**` 的跳转目标，逐个落到真实文件 / `#锚点` / HTTP 200 |
  | `module-load` | 4.8 / 5.0 | 2 | 浏览器内 import 全部 `docs/src` 模块：语法错 / 同作用域重复声明 / 顶层未定义引用（E1）＋ 每个顶层页真的装配了数据源（E2） |
  | `doc-consistency` | 1.9 / 1.9 | 15 | 文档口径与代码实况一致（各台 tab 数与名称 · 数据五数 · 页面数 · 旧界面名黑名单 · 单一源组件登记 · §0.2 索引与 README 清单齐备 · 授权声明带日期 · `TIMESTAMPS` 与 frontmatter 对齐 · **S14 可数事实对账**〔枚举 / 计数类数字须等于代码 / 数据实然值〕· **S15 弱清单**〔取不到权威值的只登记不判红、但带基线〕） |
  | `permission-gate` | 1.8 / 1.8 | 9 | 资源级写角色门——branches / users / activities / notices 等越权须 403 |
  | `doc-line-ref` | 1.6 / 1.6 | 6 | `README-server.md` 的「`文件:行号`」引用逐条指向真实位置（行号失效＝后端照着找不到东西） |
  | `version-stamp` | 1.5 / 1.6 | 15 | `?v=` 版本戳单一源、只前进、补戳判据自洽（同页两个模块实例＝页面静默空白） |
  | `server-base` | 1.4 / 1.4 | 11 | 服务端基座——建表 / 种子 / 资源读口与 bootstrap / 附件上传 / 快照全量回写 |
  | `scene-write-sync` | 0.4 / 0.4 | 3 | 写活动的场景目录单一源（四子会名序 · 平铺 id 全集 · 归类有效） |

  **② 收尾（一批做完 / 提交前）：全量 —— 约 19–28 分钟（2026-09-23 批次 165 实测 729 项 / 729 通过 / 0 红，19.1 分钟；批次 161 726 项 / 726 通过 / 0 红，19.4 分钟；批次 160 同一命令实测 724 项中 6 红、27.7 分钟 ⇒ **同一条命令两次读数可差 8 分钟以上**，多出来的部分是 e2e 与「需外部服务」类在本机负载下超时，**不是回归**——判据＝逐文件单独复跑能过）**：`cd server` → 先 `npm start`（**约 3 秒**起好，实测 2.7 秒）→ `npm test` → 停服。**为什么非跑不可**：见 `CLAUDE.md R-85`——**只跑守卫子集不算收尾**；批次 97 实测过，改造留下的陈旧断言「只跑守卫子集」永远跑不到、被绿着掩盖（那次首跑 11 红）。**必须起服务**的是三个文件：`click-cost` / `mock-integrity` / `b3-1-makeup-writeback`（都要连 `http://localhost:3000`，不起必红——那属**环境类红**，不是真回归）。

  **③ 时间效率：钱花在哪、怎么少花（2026-09-23 提速批：改前/改后实测已并入）**
  - **改前 / 改后对照（2026-09-23 提速批实测；同一命令、同一机器、相邻时段各跑一次，`--test-concurrency=1` 串行）**。命令原文：
    ```powershell
    cd server ; npm start        # 起 3000 服务（click-cost / page-sweep 要连它）
    $env:DISABLE_PASSWORD_CHECK=1
    node --test --test-concurrency=1 --test-reporter=spec test/form-loop-sweep.test.mjs test/page-sweep.test.mjs test/click-cost.test.mjs test/agenda-flow.test.mjs test/branch-doc.test.mjs test/multi-user-write.test.mjs
    ```
    | 文件 | 改前（项 / 秒） | 改后（项 / 秒） | 差 |
    |---|---|---|---|
    | `form-loop-sweep` | 80 / 571.7 | 81 / 506.3 | **−65.4**（刀① 会话复用 ＋ 条件等待；项数 +1 ＝ 新增 S7 降频守卫） |
    | `page-sweep` | 11 / 112.6 | 11 / 113.2 | +0.6（未改动，取样噪声） |
    | `click-cost` | 5 / 55.2 | 5 / 50.0 | **−5.2**（刀④ 浏览器只冷启一次；**断言一字未动**，含 C1 ≤6 次点击基线） |
    | `agenda-flow` | 4 / 39.9 | 4 / 42.9 | +3.0（同款改造；正差成因见下注，非回归） |
    | `branch-doc` | 17 / 36.5 | 17 / 36.4 | −0.1（未改动） |
    | `multi-user-write` | 3 / 36.5 | 3 / 36.4 | −0.1（未改动） |
    | **合计** | **120 / 852.5**（进程 861.6 秒） | **121 / 785.2**（进程 794.6 秒） | **−67.3 秒 ／ 两次都 0 红** |
    > 注 · `agenda-flow` 的正差：把浏览器冷启移进 `before` 后，node 把该钩子计入**首个用例**的耗时 ⇒ 收益被摊掉，加上取样噪声（原始读数：A1 5386→7080ms、A3 6994→7879ms，而同批 `click-cost` 的 C3/C4/C5 为 7199→4863 / 12799→11309 / 16593→14967ms —— 刀④ 的实际收益在那里可见）。
    > 注 · `branch-doc`（纯 node、36 秒）**慢的成因已实测定位**：`MockAdapter` 每个适配器调用（含 `list()`）固定 600ms 延迟（`docs/src/core/mock-adapter.js:442 _withDelay(fn, delayMs = 600)`）⇒ 本文件 30 余次读写 ≈ 18 秒起步；**不是**「每例重建现场」造成的（该假设本次未获证据支持，故未改该文件）。
  - **改到哪里省下了什么（归因）**：刀① 省的是**每条流程重复登录 + 两处固定 sleep**（78 条 × ≈0.85 秒）；**没省的是每条流程的固有底噪**——整页 `goto` + 应用首载（实测支书台：`activeModule=workspace 且 status=IDLE` 落在 **898ms**、tab 内容渲染完 **1105ms**）、`runStep` 逐步微等待（150–400ms/步）、`readToast`/`checkAssert` 的有界轮询。**再想大幅提速只有两条路**：① 日常用上面的 `FORM_LOOP_TABS` 降频（只跑相关 tab）；② 逐条把「只与终态有关」的断言从真机交互里拿出来（本批刀④ 只动了「起浏览器时机」这一步）。
  - **最贵的一步就是全量本身，起服务可以忽略**：起服务约 3 秒；提速批后全量里**两个真机普查仍占掉约 10 分钟**——改后实测：`form-loop-sweep` ≈ 506 秒（81 项：56 条真机闭环 ＋ 17 条成功路径 ＋ S0–S7 台账守卫）、`page-sweep` ≈ 113 秒（11 项：七台 × 全部 tab）；**其余文件合计约 4.5 分钟**。单文件最慢的十来个（**2026-09-21 批次 159 单跑实测**，提速批前的量级参考，未逐项重测）：`page-sweep` 111.5 秒 · `click-cost` 50.0 · `agenda-flow` 42.0 · `branch-doc` 37.0 · `multi-user-write` 27.1 · `async-vote` 26.4 · `party-committee` 19.4 · `relation-matrix` 16.6 · `agenda-closure` 15.6 · `branch-config-audit` 12.3（**第 11–20 位在 4–11 秒**〔按全量日志内该文件用例耗时求和〕：`inspection-loop-e2e` 11.4 · `party-committee-review` 10.2 · `module-config-e2e` 9.1 · `block-entry-guard-e2e` 8.1 · `block-canvas-e2e` 7.9 · `link-integrity` 7.0 · `party-committee-dispatch` 6.8 · `mock-integrity` 5.7 · `block-config-ui-e2e` 5.3 · `e2e-login` 5.2；**其余 70 余文件合计仅约 49 秒**）。
  - **推荐顺序（2026-09-23 提速批重排）**：① 改代码 → `npm run test:daily`（约 2.3 分钟，**已含**上面那条守卫子集）；② **若动过 `docs/src/**` 或 `server/**`，先 bump 版本戳再跑**——改了文件不 bump 即版本链分裂，`version-stamp` 必红，白跑一轮；③ **动过真机流程 / 数据源形态 / 登录会话时别只跑日常档** → 用 `FORM_LOOP_TABS=<相关 tab>` 定向跑一次 `form-loop-sweep`（单 tab 约 40 秒，见上文降频开关实测）；④ 一批做完 / 交付前 → **起一次服务** → `npm run test:precommit`（＝全量）→ 停服：三个依赖外部服务的文件跟着全量一起跑，**不要为它们单独起停一轮**。
- **Playwright**：锁定 `1.60.0`（配套 chromium 二进制随本机缓存）；全新环境需先 `npx playwright install chromium` 下载浏览器。
