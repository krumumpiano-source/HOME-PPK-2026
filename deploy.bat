@echo off
echo ===================================================
echo   HOME PPK 2026 - Deployment Script
echo ===================================================

echo [1/3] Bumping cache version...
node bump-cache.js

echo [2/3] Staging files...
git add .

echo [3/3] Committing changes...
set TIMESTAMP=%date% %time%
git commit -m "Auto-deploy update: %TIMESTAMP%"

echo Pushing to GitHub (main branch)...
git push origin main

echo.
echo ===================================================
echo   Deployment completed!
echo ===================================================
pause
