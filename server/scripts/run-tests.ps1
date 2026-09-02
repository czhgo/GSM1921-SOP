# 测试分层运行入口
#   fast : 纯 node 快速层（无浏览器，~30s）
#   core : 核心闭环（浏览器 E2E，5 组）
#   full : 全量（同 npm run test）
# 用法:
#   .\run-tests.ps1            # 等价 fast
#   .\run-tests.ps1 core
#   .\run-tests.ps1 full -Clean   # 跑前先用 cmd rmdir 清 .tmp
param(
    [string]$Level = 'fast',
    [switch]$Clean
)

$ErrorActionPreference = 'Stop'

$serverRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$tmpDir = Join-Path $serverRoot '.tmp'
$laDir = Join-Path $tmpDir 'la'

if ($Clean -and (Test-Path -LiteralPath $tmpDir)) {
    # cmd rmdir 删整棵目录树，比 PowerShell Remove-Item 快 10-100 倍（大量小文件场景）
    Write-Host "[run-tests] 清理 $tmpDir (cmd rmdir)" -ForegroundColor DarkYellow
    & cmd.exe /c "rmdir /s /q `"$tmpDir`""
}

# 浏览器二进制复用目录（.browsers 已在 .gitignore）
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $serverRoot '.browsers'

# 临时目录重定向至 .tmp：避免 Remove-Item 卡壳与 trae-sandbox 探测延迟
New-Item -ItemType Directory -Force -Path $tmpDir, $laDir | Out-Null
$env:TEMP = $tmpDir
$env:TMP = $tmpDir
$env:LOCALAPPDATA = $laDir

# 禁用 node 编译缓存（不写用户目录）
$env:NODE_DISABLE_COMPILE_CACHE = '1'

switch ($Level) {
    'fast' { $npmScript = 'test:fast' }
    'core' { $npmScript = 'test:core' }
    'full' { $npmScript = 'test:full' }
    default {
        Write-Host "未知 Level: $Level（应为 fast|core|full）" -ForegroundColor Red
        exit 1
    }
}

Push-Location $serverRoot
try {
    Write-Host "[run-tests] Level=$Level -> npm run $npmScript" -ForegroundColor Cyan
    & npm run $npmScript
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
