# ════════════════════════════════════════════════════════════════
#  deploy/install.ps1 —— **Windows** 一键安装（部署到自己的电脑 / 办公机时用）
#
#    powershell -ExecutionPolicy Bypass -File deploy\install.ps1
#
#  它做：① 预检 Node → ② 装依赖 → ③ 生成 deploy\start-server.cmd（含生产环境变量）
#        → ④ 注册「开机启动」计划任务 → ⑤ 冒烟
#
#  ⚠ **诚实声明（2026-09-29 批次 269）**：本脚本**未在真机执行过**（只做静态审读）。
#  ⚠ 与 Linux 版的差别：Windows 没有 systemd，**优雅关闭靠 deploy\start-server.cmd 前台运行 +
#    `taskkill` 会发 WM_CLOSE/CTRL_C 的行为不保证** ⇒ 停止服务请用 `Ctrl+C`（会走 server.js 的 SIGINT 分支）。
# ════════════════════════════════════════════════════════════════
$ErrorActionPreference = 'Stop'
$Here = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$ServerDir = Join-Path $Here 'server'
$StartCmd = Join-Path $PSScriptRoot 'start-server.cmd'
$TaskName = 'gsm1921-sop'

function Say($m) { Write-Host "`n== $m" -ForegroundColor Cyan }
function Die($m) { Write-Host "✖ $m" -ForegroundColor Red; exit 1 }

Say '① 预检'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Die '未找到 node（要求 ≥ 22）' }
$major = [int](node -p 'process.versions.node.split(".")[0]')
if ($major -lt 22) { Die "Node 版本过低：$(node -v)（better-sqlite3@12 要求 20.x/22.x+）" }
if (-not (Test-Path (Join-Path $ServerDir 'server.js'))) { Die "未在仓库根执行（找不到 server\server.js）" }
Write-Host "  node $(node -v) · 仓库根 $Here"

Say '② 依赖安装（npm ci --omit=dev）'
Push-Location $ServerDir
try { npm ci --omit=dev; if ($LASTEXITCODE -ne 0) { Die '依赖安装失败' } } finally { Pop-Location }
Write-Host '  依赖就位'

Say '③ 生成 deploy\start-server.cmd'
if (Test-Path $StartCmd) {
  Write-Host '  已存在，**不改**（避免覆盖你填过的口令）'
} else {
  @"
@echo off
rem 光华党支部管理引擎 · 生产启动脚本（由 deploy/install.ps1 生成）
rem ⚠ 必改：LOGIN_PASSWORD（生产未设 ⇒ server.js 启动即拒）
set APP_ENV=production
set PORT=3000
set LOGIN_PASSWORD=
set DB_PATH=$ServerDir\data.db
set UPLOAD_DIR=$ServerDir\uploads
set SEED_FALLBACK=0
cd /d "$ServerDir"
node server.js
"@ | Set-Content -Path $StartCmd -Encoding ASCII
  Write-Host "  已生成（口令留空 ⇒ 现在启动会被拒绝，这是故意的）：$StartCmd"
}

Say '④ 注册开机启动（计划任务）'
$action = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument "/c `"$StartCmd`"" -WorkingDirectory $Here
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -Force | Out-Null
Write-Host "  已注册计划任务 $TaskName（✅ 首次请先手动双击 start-server.cmd 填好口令并试跑）"

Say '⑤ 冒烟'
$smoke = Join-Path $PSScriptRoot 'smoke.mjs'
if (& node $smoke) { Write-Host '  存活探针通过' -ForegroundColor Green }
else { Write-Host '  ⚠ 冒烟未通过——多半是 LOGIN_PASSWORD 尚未填（server.js 拒绝启动）' -ForegroundColor Yellow }

@"

════════════════════════════════════════════════════════════════
✅ 安装流程结束。接下来人工做的三件事：

 1. 编辑 $StartCmd 填 LOGIN_PASSWORD，然后手动跑一次确认能起
 2. 看启动日志里的「[server] 自检 · users 计数=…；演示种子账号=…」——
    真实库应当是 **演示种子账号=0**（>0 请按 A.2 第 1 条用空库起步）
    · 首启（空库）会自动建立**最小组织基线**：**党委账号 1 名 ＋ 支部「光华管理学院本科生党支部」(br-b1)**
      —— **零成员名单**（支书 2026-09-29 令）。名单请走「IAAA 登录 + 支部确认」（规划中）或党委台
      「支部管理 → 导入成员名册」。党委账号**学号**可用环境变量 `BASELINE_PARTY_STAFF_ID` 指定。
 3. 备份：双击运行 server\scripts\backup.ps1（或用任务计划每日跑一次）

 停止服务：在运行窗口按 Ctrl+C（走优雅关闭）；或在任务管理器结束该 node 进程
 排错：看 start-server.cmd 那个窗口的输出
════════════════════════════════════════════════════════════════
"@ | Write-Host
