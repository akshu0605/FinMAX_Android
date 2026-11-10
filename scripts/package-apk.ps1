$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$builtApk = Join-Path $repoRoot 'android\app\build\outputs\apk\debug\app-debug.apk'
$releaseDir = Join-Path $repoRoot 'release'
$namedApk = Join-Path $releaseDir 'Finmax-AKJ.apk'
$archive = Join-Path $releaseDir 'Finmax-AKJ.zip'

if (-not (Test-Path -LiteralPath $builtApk -PathType Leaf)) {
  throw "Debug APK was not found at $builtApk"
}

New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null
Copy-Item -LiteralPath $builtApk -Destination $namedApk -Force
Compress-Archive -LiteralPath $namedApk -DestinationPath $archive -CompressionLevel Optimal -Force

Write-Output "Created $namedApk"
Write-Output "Created $archive"
