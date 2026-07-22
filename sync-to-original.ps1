# sync-to-original.ps1
# This script copies the stable erp2 project back to the original erp folder.
# It safely excludes .env, node_modules, and target folders to avoid breaking the configuration.

Write-Host "Syncing erp2 (Duplicate) to erp (Original)..." -ForegroundColor Cyan

$source = "c:\Users\DELL\OneDrive\Desktop\erp2"
$dest = "c:\Users\DELL\OneDrive\Desktop\erp"

robocopy $source $dest /E /XD node_modules target .git __pycache__ .venv /XF .env .DS_Store /NFL /NDL /NJH /NJS

if ($LASTEXITCODE -lt 8) {
    Write-Host "Sync Successful!" -ForegroundColor Green
} else {
    Write-Host "Sync Failed with code $LASTEXITCODE" -ForegroundColor Red
}
