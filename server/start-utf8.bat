@echo off
chcp 65001 >nul
echo ========================================
echo   TaroTora Server (UTF-8)
echo ========================================
echo.
set NODE_SKIP_PLATFORM_CHECK=1
node src/index.js
