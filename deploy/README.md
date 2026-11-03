---
title: "部署与运维脚本索引（deploy/）"
type: index
role: "[工程师]+[运维执行人]"
last_updated: 2026-11-03
status: active
---

# 部署与运维脚本索引（deploy/）

> 目录定位见 [DOC_MAP.md §五 目录作用表](../content/03_doc_system/DOC_MAP.md#五目录作用表2026-10-24-立)。

## 作用

本目录是**部署动作的可执行实现**，回答「怎么打包、怎么首次安装、怎么换版本、怎么体检与冒烟」。

## 不负责什么

- 不写部署决策与对外对接叙事——去 [DEPLOYMENT_GUIDE.md](../content/04_web_design/deploy/DEPLOYMENT_GUIDE.md)。
- 不写逐键操作教学——去 [SERVER_DEPLOY_MANUAL.md](../content/04_web_design/deploy/SERVER_DEPLOY_MANUAL.md)。
- 不写视觉、数据模型与业务制度——归 `content/04_web_design/`、`content/02_institution/`。
- 不存运行数据——`data.db`、`uploads/`、`backups/` 由部署实例自己保管，且被打包白名单排除。

## 运行档：review / production（2026-11-03 固化）

判定单一源＝`server/env.js::isProductionEnv`（`APP_ENV=production` 或 `NODE_ENV=production`）。两档互斥，启动日志首行标明档位。

| 档位 | 用途 | 启动 | 数据与拦截 |
|---|---|---|---|
| **review**（缺省） | 视觉检验 | `cd server && npm start`（建议 `DB_PATH=data.review.db`） | 允许演示种子；多支部只打印分支数、不拦截。**必须用独立库，不得指向生产库** |
| **production** | 正式上线（一实例一支部） | `APP_ENV=production` ＋ `LOGIN_PASSWORD=…` 后 `cd server && npm start` | 默认不播种；迁移后若 `branches` >1 且未设 `ALLOW_MULTI_BRANCH=1`，**启动即退出（exit 1）** |

- 生产多支部口径：**一实例一支部；多支部需先完成服务端读过滤或显式设置 `ALLOW_MULTI_BRANCH=1`**。
- `doctor.mjs` 已按档位核 `APP_ENV` / `LOGIN_PASSWORD` 并直读 SQLite 打印支部数；`smoke.mjs` 打印预期档位并照旧检查 health 与登录。
- 逐项部署口径以 [DEPLOYMENT_GUIDE.md](../content/04_web_design/deploy/DEPLOYMENT_GUIDE.md) 为准。

## 文件清单

| 文件 | 一句话作用 | 何时用 | 失败看哪 | 权威源？（是/指针） |
|------|-----------|--------|---------|-------------------|
| [install.sh](install.sh) | Linux 一键安装：预检 → 建服务账号 → 装依赖 → 写生产环境变量 → systemd → 每日备份 cron → 冒烟 | **首次**在 Linux 服务器安装（仓库根执行 `sudo bash deploy/install.sh`） | 终端 ①–⑦ 哪一步 `✖`；起服失败看 `journalctl -u gsm1921 -n 50`；口令未填会使冒烟不过 | 指针 → `DEPLOYMENT_GUIDE` 附录 A.2 |
| [install.ps1](install.ps1) | Windows 一键安装：预检 → 装依赖 → 生成 `start-server.cmd` → 注册开机启动计划任务 → 冒烟 | **首次**在 Windows 电脑 / 办公机安装 | 终端 ①–⑤ 输出；停止服务用 `Ctrl+C`（不要依赖 taskkill） | 指针 → `DEPLOYMENT_GUIDE` 附录 A.2 的 Windows 等价步骤 |
| [update.sh](update.sh) | 换版本：预检新包 → **先备份** → 停服 → 替换 `docs/`+`server/` 代码 → 装依赖 → 起服 → 冒烟 | 已有实例**升级**到新发布包（`sudo bash deploy/update.sh <新包目录>`） | ② 备份是否生成（失败即中止）；⑦ 冒烟输出；回滚提示见脚本尾段；**库结构不回退** | 指针 → `DEPLOYMENT_GUIDE` 附录 A.2.1 |
| [package.mjs](package.mjs) | 白名单打包器：生成发布包，剥离名单与测试产物；默认不带依赖 | 发布前出包；目标机无外网时加 `--with-deps` | 打包器打印的白名单/黑名单断言（命中即拒绝出包，如包内出现成员姓名） | 指针 → 脚本头注的打包口径 |
| [smoke.mjs](smoke.mjs) | 上线/更新后的冒烟：探 `/api/v1/health`，可选 `--login` 再探登录与 `/auth/me` | 每次安装或更新后、以及排障时验证服务真的活着 | 每项 `✖` 的 HTTP 状态与响应体；退出码 1 表示有失败 | 指针 → 脚本头注的三条判据 |
| [doctor.mjs](doctor.mjs) | 只读自检：逐项印「已就绪 / 缺什么 / 下一步」，不改任何文件 | 安装前预检、排障、交接前体检 | 每项的 `👉 下一步`（通常是一条可复制命令或一个网址） | 指针 → 脚本头注；判据随 `DEPLOYMENT_GUIDE` 更新 |
| [nginx.sample.conf](nginx.sample.conf) | 反向代理样例：含上传体积与 `/src/config/deploy.js` 单独放行的两条硬要求 | 需要域名 / HTTPS 反代时复制改名 | 413 或「关于」页部署形态判错，先查这两条硬要求 | 指针 → `DEPLOYMENT_GUIDE` 附录 A.2 第 10 / 11 条 |
| [env.production.example](env.production.example) | 生产环境变量模板：APP_ENV / 口令 / 库与附件路径 / 播种开关 | 手写 systemd 或计划任务时对照 | 变量没生效先确认由进程管理器注入（`server/` 不读 `.env`） | 指针 → `README-server.md §5.3` |

> ⚠ `install.sh` / `update.sh` / `install.ps1` 的头注均声明「未在真机执行过」——**首次务必在测试机逐条核对输出**，再用于正式实例。

## 权威源与派生

- **权威源**：[DEPLOYMENT_GUIDE.md](../content/04_web_design/deploy/DEPLOYMENT_GUIDE.md) 的部署路径、认证门控与附录 A.2 / A.2.1 是部署口径的唯一权威；逐键操作由 [SERVER_DEPLOY_MANUAL.md](../content/04_web_design/deploy/SERVER_DEPLOY_MANUAL.md) 承接。
- **派生**：本目录脚本是上述步骤的自动化实现；`doctor.mjs` 与 `smoke.mjs` 的判据随权威源更新。
- **不在本目录的规范**：视觉规范归 `content/04_web_design/design-system/DESIGN_SYSTEM.md`，数据模型归 `content/04_web_design/data/DATA_MODEL.md`。

## 知识流向

部署决策与踩坑 → 写入 `DEPLOYMENT_GUIDE`（为什么、选哪条路径）→ 固化为本目录脚本与模板 → 实测读数与截图存 `.ctx/evidence/`，过程记 `.ctx/logs/` → 新问题再回写权威源与脚本。

## 是否保留原始材料

保留脚本与模板本身（运行资产，随包发布）。**不保留**运行数据：`data.db` / `uploads/` / `backups/` 由实例自行保管，打包与仓库均排除；真机证据在 `.ctx/evidence/`。

## 维护触发器

- 新增、删除或重命名本目录脚本 / 模板；
- `DEPLOYMENT_GUIDE` 的部署路径、环境变量、端口或服务名变更；
- 打包白名单、排除规则或名单断言变更；
- `server/` 的启动约束（如生产必设口令）变化。
