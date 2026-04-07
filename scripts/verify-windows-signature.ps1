# Verifies Authenticode signatures on Windows build outputs (PowerShell).
# Usage:
#   .\scripts\verify-windows-signature.ps1
#   .\scripts\verify-windows-signature.ps1 -Artifact "dist\Parara-Setup-1.0.0.exe"

param(
    [string]$Artifact = ""
)

$ErrorActionPreference = "Stop"

function Show-Signature {
    param([string]$FilePath)
    if (-not (Test-Path -LiteralPath $FilePath)) {
        Write-Warning "Skip (not found): $FilePath"
        return
    }
    Write-Host "`n--- $FilePath ---"
    $sig = Get-AuthenticodeSignature -FilePath $FilePath
    $sig | Format-List Status, StatusMessage, SignerCertificate
    if ($sig.Status -ne "Valid") {
        throw "Signature not Valid for: $FilePath"
    }
}

$root = Split-Path $PSScriptRoot -Parent
if (-not $Artifact) {
    $dist = Join-Path $root "dist"
    $setup = Get-ChildItem -Path $dist -Filter "*-Setup-*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    $unpacked = Join-Path $dist "win-unpacked\Parara.exe"
    if ($setup) {
        Show-Signature -FilePath $setup.FullName
    }
    if (Test-Path -LiteralPath $unpacked) {
        Show-Signature -FilePath $unpacked
    }
    if (-not $setup -and -not (Test-Path -LiteralPath $unpacked)) {
        throw "No dist artifacts found. Run npm run desktop:dist first, or pass -Artifact path to your .exe."
    }
}
else {
    $full = if ([System.IO.Path]::IsPathRooted($Artifact)) { $Artifact } else { Join-Path $root $Artifact }
    Show-Signature -FilePath $full
}

Write-Host "`nAll checked files have Valid Authenticode signatures."
