@echo off
chcp 65001 >nul
title TaroTora Server Launcher

REM 获取脚本所在目录
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

REM 检查 PowerShell
powershell -Command "Get-Host" >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 PowerShell
    echo 请使用 Windows 7 或更高版本
    pause
    exit /b 1
)

REM 以交互模式运行 PowerShell 脚本
powershell -ExecutionPolicy Bypass -File "TaroTora-Launcher.ps1"

pause
