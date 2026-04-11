@echo off
chcp 65001 >nul
echo ========================================
echo   TaroTora Server Restart
echo ========================================
echo.

echo [1/3] 正在停止现有 Node.js 进程...
taskkill /F /IM node.exe 2>nul
echo [OK] 进程已停止
echo.

echo [2/3] 等待端口释放...
timeout /t 2 /nobreak >nul
echo [OK] 端口已释放
echo.

echo [3/3] 启动服务器（含FRP内网穿透）...
set NODE_SKIP_PLATFORM_CHECK=1
node src/index.js
