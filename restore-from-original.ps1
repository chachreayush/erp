# restore-from-original.ps1
# This script forcefully overwrites the erp2 project with the stable erp project.
# It safely excludes .env, node_modules, and target folders to avoid breaking the configuration.

Write-Host "Restoring erp2 (Duplicate) from erp (Original)..." -ForegroundColor Cyan

$source = "c:\Users\DELL\OneDrive\Desktop\erp"
$dest = "c:\Users\DELL\OneDrive\Desktop\erp2"

robocopy $source $dest /E /XD node_modules target .git __pycache__ .venv /XF .env .DS_Store /NFL /NDL /NJH /NJS

if ($LASTEXITCODE -lt 8) {
    Write-Host "Restore Successful!" -ForegroundColor Green
} else {
    Write-Host "Restore Failed with code $LASTEXITCODE" -ForegroundColor Red
}
