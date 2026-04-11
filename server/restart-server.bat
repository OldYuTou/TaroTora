@echo off
chcp 65001 >nul
echo ========================================
echo   TaroTora Server Restart
echo ========================================
echo.

echo [1/3] 正在停止现有 Node.js 进程...
taskkill /F /IM node.exe 2>nul
if %errorlevel% == 0 (
    echo [OK] 已停止现有进程
) else (
    echo [信息] 没有找到运行中的进程
)
echo.

echo [2/3] 等待端口释放...
timeout /t 2 /nobreak >nul
echo [OK] 端口已释放
echo.

echo [3/3] 启动服务器...
node src/index.js
