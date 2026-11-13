# 在当前进程选择可用的现代 Node，不修改 nvm 或系统默认版本。
$taskNodeCandidates = @(Get-Command node -All -ErrorAction SilentlyContinue | Where-Object { $_.CommandType -eq 'Application' } | Select-Object -ExpandProperty Source -Unique)
$taskNode = $null
foreach ($taskCandidate in $taskNodeCandidates) {
    $taskVersionText = & $taskCandidate --version
    if ($LASTEXITCODE -eq 0) {
        $taskVersion = [version]($taskVersionText.TrimStart('v'))
        if ($taskVersion -ge [version]'22.12.0') { $taskNode = $taskCandidate; break }
    }
}
if (-not $taskNode) { throw '请安装 Node.js 22.12+，然后重新运行。' }
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskVite = Join-Path $taskRoot 'node_modules/vite/bin/vite.js'
if (-not (Test-Path -LiteralPath $taskVite)) { throw '请先使用 Node.js 22.12+ 执行 npm install。' }
Write-Host "使用 $taskNode"
Push-Location -LiteralPath $taskRoot
try { & $taskNode $taskVite --host 0.0.0.0 @args } finally { Pop-Location }
