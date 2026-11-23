---
title: "部署脚本实装演练读数（批次 607 · L-02）"
type: evidence
role: "[工程师]+[AI]"
last_updated: 2026-11-23
status: active
---

# `L-02` 部署脚本实装演练

## 一、Windows 本机（真机）

- 命令：`powershell -ExecutionPolicy Bypass -File deploy\install.ps1 -SkipTask`（在仓库的临时副本 `.tmp/l02-win` 执行，避免改动工作区）
- 读数：退出码 **0**；依赖安装成功；生成 `deploy/start-server.cmd`；`-SkipTask` 跳过计划任务注册；冒烟因服务未启动打印不可达（脚本按警告处理，不影响退出码）
- 起服核对（生产档，临时库）：`/login.html` → **200**；`uploads/` 可写（写入 `probe.txt` 成功）；启动日志 `users 计数=7；演示种子账号=0`
- 本批顺带修掉一处**只在真跑时暴露**的缺陷：`node -p 'process.versions.node.split(".")[0]'` 在 PowerShell 5 传给原生命令时会丢内层双引号（node 收到 `split(.)[0]`），已改为 `node -p "process.versions.node.split('.')[0]"`

## 二、Linux（CI runner，`install-linux` job）

- 命令（workflow 内）：`APP_DIR=$RUNNER_TEMP/gsm-install ENV_FILE=$RUNNER_TEMP/gsm-install/.env INSTALL_NO_SERVICE=1 INSTALL_LOGIN_PASSWORD=ci-pass bash deploy/install.sh`
- 装后：起服核对 `/login.html` 200、`uploads/` 可写；再 `UPDATE_NO_SERVICE=1 bash deploy/update.sh <新包>`，更新后再核 200
- **首次 run id：`45226568761`**（`release/2026-11-launch` @ `cc172f3c8`）：`daily` success · `install-linux` success · `deploy-verify` failure（见下）
- **修后 run id：`45232134920`**（@ `20176bd45`）：**daily / deploy-verify / install-linux 三个 job 全部 success**——Linux 侧 `install.sh → 起服 200 → uploads 可写 → update.sh → 再核 200` 全链通过
- **CI 暴露的存量回归**：`deploy/verify-linux.sh` 自 `D-882`（生产禁用共享口令）起一直红——smoke 用共享口令登录 ⇒ 401；preflight `--strict` 又拦「6/7 名未设个人密码」。本批修法：起服后先 `scripts/set-password.mjs` 给党委账号设个人密码再 smoke，停服后给 6 个最小角色账号批量设密码再 preflight；另把 EXIT trap 清理与结论解耦（`|| true` ＋ 显式 `exit 0`），避免 Windows 下文件句柄未释放改写结论。
- 修后本地复跑：**6/6 全绿**（shell 语法 · doctor · 起服务 · smoke · preflight · package），`preflight --strict` 警告 0。

## 三、边界

- CI runner 是真实 Linux 内核，但**不是**生产测试机；systemd / useradd / cron 三段被 `INSTALL_NO_SERVICE=1` 跳过，未取得真机读数
- 生产真机（含 systemd 与 nginx）仍需支书按 `deploy/CUTOVER_RUNBOOK.md` 走一次
