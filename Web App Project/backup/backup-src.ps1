$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$srcPath = Join-Path $projectRoot 'src'
$backupRoot = Join-Path $projectRoot 'backup'
$latestPath = Join-Path $backupRoot 'latest'
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$archivePath = Join-Path $backupRoot ("src_{0}" -f $stamp)

if (-not (Test-Path -LiteralPath $srcPath)) {
  throw "Source folder not found: $srcPath"
}

New-Item -ItemType Directory -Path $archivePath -Force | Out-Null
Copy-Item -Path (Join-Path $srcPath '*') -Destination $archivePath -Recurse -Force

if (Test-Path -LiteralPath $latestPath) {
  Remove-Item -LiteralPath $latestPath -Recurse -Force
}
New-Item -ItemType Directory -Path $latestPath -Force | Out-Null
Copy-Item -Path (Join-Path $srcPath '*') -Destination $latestPath -Recurse -Force

$archiveCount = (Get-ChildItem -Path $archivePath -Recurse -File | Measure-Object).Count
$latestCount = (Get-ChildItem -Path $latestPath -Recurse -File | Measure-Object).Count

Write-Output "Archive backup: $archivePath ($archiveCount files)"
Write-Output "Latest backup : $latestPath ($latestCount files)"
