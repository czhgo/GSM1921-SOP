# 部署件容器验证 · 批次 539 波次 Deploy（74→76）

- 日期：2026-11-09
- 环境：Windows 10 · Git Bash（`C:\Program Files\Git\bin\bash.exe`，MSYS tar）· Node v24.16.0 · `server/node_modules` 已装（better-sqlite3 就绪）
- 命令：`VERIFY_TMPDIR=D:\GitHub\GSM1921-SOP\.tmp bash deploy/verify-linux.sh`
- 结论：**6/6 通过，退出码 0**（shell 语法 · doctor · 起服务 · smoke · preflight · package）

## 一、修复前的失败（先证伪）

在 Git Bash 下直接跑打包，`deploy/package.mjs` 的 `execFileSync('tar', …)` 报错退出：

```
Error: Command failed: tar -czf D:\GitHub\GSM1921-SOP\.tmp\pkg-repro\gsm1921-sop-v0.1.0-20261109.tar.gz
  -C D:\GitHub\GSM1921-SOP\.tmp\pkg-repro gsm1921-sop-v0.1.0-20261109
status: 2 · deploy/package.mjs:271
```

根因：MSYS tar 把 `D:\…` 的盘符冒号视为「远程主机 `D`」，按 `rsh` 处理。PowerShell 下（Windows 自带 bsdtar）不受影响，故此前只在 Git Bash / CI 前置本地复核中暴露。

## 二、修法（两处，均在部署件内）

| 文件 | 改动 | 判据 |
|---|---|---|
| `deploy/package.mjs:269-273` | 把 tar 的 `cwd` 切到 `OUT_DIR`，只传**相对文件名**（`-czf <name>.tar.gz <name>`），不再传任何含盘符的绝对路径 | Git Bash 与 PowerShell 各跑一次均退出 0 |
| `deploy/verify-linux.sh:42-48` | `VERIFY_TMPDIR` 若为 Windows 原生路径，先 `cygpath -u` 转 POSIX（无 cygpath 的 Linux 原样保留），避免后续 `tar -tzf "$TARBALL"` 再踩同一个冒号坑 | 用 `VERIFY_TMPDIR=D:\…\.tmp` 跑通 6/6 |

未新增依赖；未放宽任何断言（路径黑名单、姓名/口令泄露、包内无 `data.db`/`uploads`/`test` 全部保留）。

## 三、6/6 读数

| # | 项 | 读数 | 结果 |
|---|---|---|---|
| ① | shell 语法 | `bash -n deploy/install.sh` · `update.sh` · `verify-linux.sh` | 3/3 通过 |
| ② | 依赖 | `server/node_modules`（better-sqlite3 就绪） | 通过 |
| ③ | doctor（review 档，临时库 / 临时 uploads） | 「✅ 没有拦路项」；仅 2 条非阻断提示（`APP_ENV=review` 建议 production、`LOGIN_PASSWORD` 仍为缺省 `123456`） | 通过 |
| ④ | 起服务（production 档，随机端口）＋ smoke --login | `http://127.0.0.1:60438`；`/health` `{ok:true}` · 登录「党委组织员」· `/auth/me`「党委组织员」 | 通过 |
| ⑤ | preflight-cutover --strict | `schema v14 · users=7 · branches=1 · activities=0 · attendances=0 · attachments=0`；阻断 0 · 警告 0 | 通过 |
| ⑥ | package ＋ 包内断言 | `gsm1921-sop-v0.1.0-20261109.tar.gz` · 460 文件 / 解包 12.9 MB · 包内 521 条目 · 无 `data.db`/`uploads`/`test` · 路径黑名单 0 命中 · 姓名/口令泄露 0 命中 · sha256 `70a2fdbc7957f70c505198fadf5b05585032d8df077dc905b7882f0a0051a3aa` | 通过 |

脚本尾部结论行：`✔ 容器可验证项 6/6 通过`。

## 四、PowerShell 侧回归（防止修一处坏另一处）

```
node deploy/package.mjs --out .tmp/pkg-ps
```

退出码 0；460 文件 / 12.9 MB；断言 0/0；sha256 `b2589dca226ac8a2c8b0765099e408ef3e6714887dc2a7834b9a75f29a6a1540`（与 Git Bash 包体不同的原因：tar 元数据含时间戳，非内容差异）。

## 五、CI / 等价证据

- `git remote -v` 有 `origin git@github.com:czhgo/GSM1921-SOP.git`。
- 本机**没有 `gh`**（`where.exe gh` 无结果，`C:\Program Files\GitHub CLI\gh.exe` 与 `%LOCALAPPDATA%\GitHubCLI\gh.exe` 均不存在）。
- 本批按要求**不 commit、不推送**；即使触发 `workflow_dispatch`，跑的也是远端已有提交，不可能覆盖本轮未提交的修复。⇒ **无法取得 `deploy-verify` 的 run 链接**。
- 因此本轮口径：**本地 Git Bash 6/6（等价证据）**；**不声称 GitHub CI 已绿**。

## 六、仍无法验证（须测试机，不在容器）

1. `install.sh`：`useradd` 建系统账号、`rsync` 落 `/opt`、systemd 单元 `enable --now`、`/etc/cron.d` 每日备份。
2. `update.sh`：停服 → 备份 → 替换 `docs/`+`server/` → 装依赖 → 起服 → 冒烟整链切换与回滚。
3. `install.ps1`：Windows 计划任务注册与开机启动。
4. nginx 反代两条硬要求（`client_max_body_size 10m`、`/src/config/deploy.js` 单独放行到 Node）与 HTTPS 真实域名。
5. 目标机 `npm ci --omit=dev` 后的可启动性。

## 七、复现命令

```bash
# Git Bash（Windows）
VERIFY_TMPDIR=D:\GitHub\GSM1921-SOP\.tmp bash deploy/verify-linux.sh

# Linux / CI
bash deploy/verify-linux.sh

# 仅打包
node deploy/package.mjs --out .tmp/pkg
```
