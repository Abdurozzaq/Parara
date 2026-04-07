#Requires -Version 5.1
<#
.SYNOPSIS
  Jalankan MSIX Packaging Tool (CLI) dengan template yang dihasilkan generate-msix-conversion-template.cjs.

.DESCRIPTION
  - Butuh MSIX Packaging Tool dari Microsoft Store + biasanya jendela PowerShell "Run as administrator".
  - Alur: npm run desktop:unpack → npm run desktop:msix:template → npm run desktop:msix (skrip ini).

.NOTES
  https://learn.microsoft.com/en-us/windows/msix/packaging-tool/package-conversion-command-line
#>

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

$generated = Join-Path $root "dist\msix\conversion.generated.xml"
if (-not (Test-Path -LiteralPath $generated)) {
    Write-Error "Berkas tidak ada: $generated`nJalankan: npm run desktop:msix:template"
}

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Warning "MSIX Packaging Tool CLI biasanya membutuhkan administrator. Jika gagal, jalankan ulang PowerShell sebagai Admin."
}

$cmd = Get-Command "MsixPackagingTool.exe" -ErrorAction SilentlyContinue
if (-not $cmd) {
    Write-Error "MsixPackagingTool.exe tidak ada di PATH. Pasang 'MSIX Packaging Tool' dari Microsoft Store, lalu aktifkan alias eksekusi aplikasi (Pengaturan > Aplikasi > Pengaturan lanjutan > Alias eksekusi aplikasi)."
}

Write-Host "Memakai template: $generated"
& MsixPackagingTool.exe create-package --template $generated -v
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

Write-Host "Selesai. Periksa folder dist\msix untuk paket .msix."
