@echo off
chcp 65001 >nul
title TaroTora 服务端打包工具
cls

echo.
echo ========================================
echo   TaroTora 服务端发布包制作工具
echo ========================================
echo.

REM 检查 Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 未检测到 Node.js
    pause
    exit /b 1
)

echo [信息] 正在准备发布包...
echo.

REM 创建发布目录
set "RELEASE_DIR=TaroTora-Server-Release"
set "RELEASE_PATH=%~dp0%RELEASE_DIR%"

REM 清理旧目录
if exist "%RELEASE_PATH%" (
    echo [信息] 清理旧发布目录...
    rmdir /s /q "%RELEASE_PATH%"
)

mkdir "%RELEASE_PATH%"

REM 复制必要文件
echo [信息] 复制文件...
xcopy /s /e /i /y "%~dp0src" "%RELEASE_PATH%\src\" >nul
xcopy /s /e /i /y "%~dp0frp" "%RELEASE_PATH%\frp\" >nul
xcopy /s /e /i /y "%~dp0node_modules" "%RELEASE_PATH%\node_modules\" >nul 2>&1

REM 复制启动文件
copy /y "%~dp0launcher.js" "%RELEASE_PATH%\" >nul
copy /y "%~dp0启动服务端.bat" "%RELEASE_PATH%\" >nul
copy /y "%~dp0TaroTora-Launcher.ps1" "%RELEASE_PATH%\" >nul
copy /y "%~dp0package.json" "%RELEASE_PATH%\" >nul
copy /y "%~dp0快速启动说明.txt" "%RELEASE_PATH%\" >nul

REM 创建空的 .env 文件
echo # TaroTora 配置将在首次启动时自动生成 > "%RELEASE_PATH%\.env"

REM 创建启动快捷方式（可选）
echo [信息] 创建启动脚本...
(
echo @echo off
echo chcp 65001 ^>nul
echo cd /d "%%~dp0"
echo start 启动服务端.bat
echo exit
echo.
) > "%RELEASE_PATH%\双击启动.bat"

echo.
echo ========================================
echo   发布包制作完成！
echo ========================================
echo.
echo 发布目录: %RELEASE_PATH%
echo.
echo 内容清单:
echo   - src/              服务器程序
echo   - frp/              FRP 客户端
echo   - node_modules/     依赖包
echo   - launcher.js       启动器脚本
echo   - 启动服务端.bat    交互式启动器
echo   - 双击启动.bat      快速启动入口
echo.
echo 使用方法:
echo   1. 将整个 %RELEASE_DIR% 文件夹复制到目标电脑
echo   2. 确保目标电脑已安装 Node.js
echo   3. 双击 "双击启动.bat" 运行
echo.
echo ========================================
pause
