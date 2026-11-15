# 每日自动备份巡跑（Windows 任务计划程序入口，T4 2026-11-15）
#   薄封装：调用 scripts/backup.mjs（SQLite 在线备份 + uploads/ + 自检）→ 保留最近 N 份 → 失败写错误日志。
#   失败结果同时落在 server\.backup-status.json（ok:false + error），与成功路径同一读口。
# 用法:
#   .\backup-daily.ps1                              # 备份到 server\backups\<时间戳>\，保留 14 份
#   .\backup-daily.ps1 -Keep 30                     # 保留 30 份
#   .\backup-daily.ps1 -Root D:\bak\gsm1921         # 备份根目录换盘（建议留一份异盘副本）
#   .\backup-daily.ps1 -Db D:\x\data.db -Uploads D:\x\uploads
# 计划任务示例（每日 03:30，用服务账号运行）:
#   schtasks /Create /SC DAILY /ST 03:30 /TN "GSM1921 Backup" /TR "powershell -NoProfile -ExecutionPolicy Bypass -File D:\GitHub\GSM1921-SOP\server\scripts\backup-daily.ps1"
# 退出码：0 = 成功（含「附件目录为空已跳过」）；1 = 失败（错误写入 server\.backup-errors.log）。
param(
    [int]$Keep = 14,
    [string]$Root,
    [string]$Db,
    [string]$Uploads
)

$ErrorActionPreference = 'Stop'

$serverRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$statusFile = Join-Path $serverRoot '.backup-status.json'
$errorLog = Join-Path $serverRoot '.backup-errors.log'
$localStamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'

if (-not $Root) { $Root = Join-Path $serverRoot 'backups' }
$Root = [System.IO.Path]::GetFullPath($Root)
$outDir = Join-Path $Root $localStamp

function Write-BackupStatus([bool]$ok, [string]$errorText) {
    $payload = [ordered]@{
        lastRunAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ss.fffZ')
        ok        = $ok
        error     = $errorText
        path      = $outDir
    }
    # 必须无 BOM（健康页 / 告警按 JSON.parse 读取，BOM 会让解析失败）
    try { [System.IO.File]::WriteAllText($statusFile, ($payload | ConvertTo-Json), (New-Object System.Text.UTF8Encoding($false))) }
    catch { Write-Warning "[backup-daily] 状态文件写入失败：$($_.Exception.Message)" }
}

$nodeArgs = @((Join-Path $PSScriptRoot 'backup.mjs'), '--out', $outDir)
if ($Db) { $nodeArgs += @('--db', $Db) }
if ($Uploads) { $nodeArgs += @('--uploads', $Uploads) }

Push-Location $serverRoot
try {
    Write-Host "[backup-daily] node scripts/backup.mjs --out $outDir" -ForegroundColor Cyan
    & node @nodeArgs
    $code = $LASTEXITCODE
} catch {
    $code = 1
    $failure = $_.Exception.Message
} finally {
    Pop-Location
}

if ($code -ne 0) {
    $reason = if ($failure) { $failure } else { "backup.mjs 退出码 $code" }
    $line = "{0} 备份失败（{1}）→ {2}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $reason, $outDir
    try { Add-Content -LiteralPath $errorLog -Value $line -Encoding UTF8 } catch { Write-Warning "[backup-daily] 错误日志写入失败：$($_.Exception.Message)" }
    Write-BackupStatus $false $reason
    Write-Host "[backup-daily] ✖ $line" -ForegroundColor Red
    exit 1
}

# 保留最近 N 份：只轮换「时间戳命名」的每日备份目录（pre-migration-* 等专项保留件不动）
$backups = Get-ChildItem -LiteralPath $Root -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$' } |
    Sort-Object LastWriteTime -Descending
$removed = 0
$backups | Select-Object -Skip $Keep | ForEach-Object {
    try { Remove-Item -LiteralPath $_.FullName -Recurse -Force; $removed++ }
    catch { Write-Warning "[backup-daily] 旧备份删除失败：$($_.FullName) — $($_.Exception.Message)" }
}
Write-Host "[backup-daily] ✔ 完成：$outDir（现存每日备份 $([Math]::Min($backups.Count, $Keep)) 份，本次清理 $removed 份）" -ForegroundColor Green
exit 0
