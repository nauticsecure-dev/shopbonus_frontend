$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$runtime = Join-Path (Split-Path $PSScriptRoot -Parent) '.consumer-acceptance'
New-Item -ItemType Directory -Path $runtime -Force | Out-Null
$archive = Join-Path $runtime 'mailpit-windows-amd64.zip'
$expected = '47122dd828ff80dcaef62b2952c478b178afadadf066c990489608e537121bfd'
Invoke-WebRequest -Uri 'https://github.com/axllent/mailpit/releases/download/v1.33.0/mailpit-windows-amd64.zip' -OutFile $archive
if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected) {
    throw 'Mailpit archive digest does not match the official release asset. Not extracting.'
}
Expand-Archive -LiteralPath $archive -DestinationPath $runtime -Force
Write-Output 'Mailpit v1.33.0 installed and SHA256 verified (local acceptance only).'
