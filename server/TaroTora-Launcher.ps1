#Requires -Version 5.1
<#
.SYNOPSIS
    TaroTora Remote Control System Launcher
    远程控制服务端启动器
.DESCRIPTION
    交互式配置并启动 TaroTora 服务端
#>

$ErrorActionPreference = "Stop"

# 设置窗口标题
$host.ui.RawUI.WindowTitle = "TaroTora Server Launcher"

# 清屏
Clear-Host

# 显示标题
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                        ║" -ForegroundColor Cyan
Write-Host "║        TaroTora Remote Control System                  ║" -ForegroundColor Cyan
Write-Host "║              远程控制服务端启动器                       ║" -ForegroundColor Cyan
Write-Host "║                                                        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 获取脚本目录
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# 检查 Node.js
try {
    $nodeVersion = node --version 2>$null
    if (-not $nodeVersion) {
        throw "Node.js not found"
    }
    Write-Host "  [信息] 检测到 Node.js $nodeVersion" -ForegroundColor Green
    Write-Host ""
}
catch {
    Write-Host "  [错误] 未检测到 Node.js！" -ForegroundColor Red
    Write-Host ""
    Write-Host "  请先安装 Node.js 运行时：" -ForegroundColor Yellow
    Write-Host "  https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  安装完成后重新运行此程序。" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "按回车键退出"
    exit 1
}

# 检查依赖
if (-not (Test-Path "node_modules")) {
    Write-Host "  [信息] 首次运行，正在安装依赖..." -ForegroundColor Yellow
    Write-Host ""
    try {
        npm install
        if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
        Write-Host ""
        Write-Host "  [信息] 依赖安装完成！" -ForegroundColor Green
        Write-Host ""
    }
    catch {
        Write-Host ""
        Write-Host "  [错误] 安装依赖失败！" -ForegroundColor Red
        Write-Host "  请检查网络连接或手动运行 npm install" -ForegroundColor Yellow
        Read-Host "按回车键退出"
        exit 1
    }
}

# 检查 frpc
if (Test-Path "frp\frpc.exe") {
    Write-Host "  [信息] FRP 客户端已就绪" -ForegroundColor Green
    Write-Host ""
}
else {
    Write-Host "  [提示] FRP 客户端未找到" -ForegroundColor Yellow
    Write-Host "         如需内网穿透请运行: node frp\download-frpc.js" -ForegroundColor Gray
    Write-Host ""
}

# 启动 Node.js 启动器
try {
    node launcher.js
}
catch {
    Write-Host ""
    Write-Host "  [错误] 启动失败: $_" -ForegroundColor Red
    Write-Host ""
    Read-Host "按回车键退出"
    exit 1
}
