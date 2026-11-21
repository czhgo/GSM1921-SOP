# 备份入口（Windows / PowerShell 版，P0-5 2026-09-23）
#   实际执行体 = scripts/backup.mjs（SQLite 在线备份 .backup + 附件目录打包 + 备份自检）
# 用法:
#   .\backup.ps1                          # 备份到 server\backups\<时间戳>\
#   .\backup.ps1 -Out D:\bak\20260923     # 指定备份目录
#   .\backup.ps1 -Db D:\x\data.db -Uploads D:\x\uploads -Out D:\bak
#   .\backup.ps1 -NoUploads               # 只备库（确认附件已另行归档时才用）
# 恢复：停服 → 用备份的 data.db 覆盖库文件（并删除同目录 data.db-wal / data.db-shm）
#       → 用备份的 uploads\ 覆盖附件目录 → 启动。详见 server\README.md「备份与恢复」。
param(
    [string]$Db,
    [string]$Uploads,
    [string]$Out,
    [switch]$NoUploads
)

$ErrorActionPreference = 'Stop'

$serverRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$nodeArgs = @((Join-Path $PSScriptRoot 'backup.mjs'))
if ($Db) { $nodeArgs += @('--db', $Db) }
if ($Uploads) { $nodeArgs += @('--uploads', $Uploads) }
if ($Out) { $nodeArgs += @('--out', $Out) }
if ($NoUploads) { $nodeArgs += '--no-uploads' }

Push-Location $serverRoot
try {
    Write-Host "[backup] node scripts/backup.mjs $($nodeArgs[1..($nodeArgs.Count-1)] -join ' ')" -ForegroundColor Cyan
    & node @nodeArgs
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
