@echo off
chcp 65001 >nul
title TaroTora Server Launcher
echo.
echo ========================================
echo   TaroTora Remote Control System
echo ========================================
echo.

REM 检查 Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Node.js，请先安装 Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

REM 检查依赖
if not exist "node_modules" (
    echo [信息] 首次运行，正在安装依赖...
    npm install
    if errorlevel 1 (
        echo [错误] 安装依赖失败
        pause
        exit /b 1
    )
)

REM 启动交互式配置器
node launcher.js

pause
