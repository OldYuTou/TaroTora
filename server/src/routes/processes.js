/**
 * 进程管理路由
 * 提供进程列表、结束进程等功能
 */

const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

/**
 * GET /api/processes/list
 * 获取进程列表
 */
router.get('/list', async (req, res) => {
  try {
    // 使用 PowerShell 获取详细进程信息
    const psCommand = `
      Get-Process | Select-Object Id, ProcessName, MainWindowTitle, 
      @{Name='CPU';Expression={[math]::Round($_.CPU, 2)}},
      @{Name='MemoryMB';Expression={[math]::Round($_.WorkingSet64 / 1MB, 2)}},
      @{Name='Status';Expression={if($_.Responding){'Running'}else{'Not Responding'}}},
      StartTime | ConvertTo-Json -Compress
    `;
    
    const { stdout } = await execPromise(`powershell.exe -Command "${psCommand.replace(/"/g, '\\"')}"`, {
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer for large process lists
    });
    
    let processes = [];
    try {
      const parsed = JSON.parse(stdout);
      processes = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      // 如果解析失败，使用备用方案
      processes = await getProcessListFallback();
    }
    
    // 格式化进程数据
    const formattedProcesses = processes.map(proc => ({
      pid: proc.Id || proc.pid || 0,
      name: proc.ProcessName || proc.name || 'Unknown',
      title: proc.MainWindowTitle || '',
      cpu: proc.CPU || proc.cpu || 0,
      memory: proc.MemoryMB || proc.memory || 0,
      status: proc.Status || proc.status || 'Running',
      startTime: proc.StartTime || null
    }));
    
    // 按内存使用排序
    formattedProcesses.sort((a, b) => b.memory - a.memory);
    
    res.json({
      processes: formattedProcesses,
      count: formattedProcesses.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting process list:', error);
    // 使用备用方案
    try {
      const processes = await getProcessListFallback();
      res.json({ processes, count: processes.length, timestamp: new Date().toISOString() });
    } catch (fallbackError) {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * POST /api/processes/kill
 * 结束进程
 */
router.post('/kill', async (req, res) => {
  try {
    const { pid } = req.body;
    if (!pid) {
      return res.status(400).json({ error: 'PID is required' });
    }
    
    // 使用 taskkill 结束进程
    await execPromise(`taskkill /F /PID ${pid}`);
    
    res.json({ success: true, message: `Process ${pid} terminated` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/processes/:pid
 * 获取单个进程详情
 */
router.get('/:pid', async (req, res) => {
  try {
    const { pid } = req.params;
    
    const psCommand = `
      Get-Process -Id ${pid} | Select-Object Id, ProcessName, MainWindowTitle,
      Path, Company, Product, ProductVersion,
      @{Name='CPU';Expression={[math]::Round($_.CPU, 2)}},
      @{Name='MemoryMB';Expression={[math]::Round($_.WorkingSet64 / 1MB, 2)}},
      @{Name='Threads';Expression={$_.Threads.Count}},
      @{Name='Handles';Expression={$_.Handles}},
      StartTime | ConvertTo-Json -Compress
    `;
    
    const { stdout } = await execPromise(`powershell.exe -Command "${psCommand.replace(/"/g, '\\"')}"`);
    const process = JSON.parse(stdout);
    
    res.json({
      pid: process.Id,
      name: process.ProcessName,
      title: process.MainWindowTitle,
      path: process.Path,
      company: process.Company,
      product: process.Product,
      version: process.ProductVersion,
      cpu: process.CPU,
      memory: process.MemoryMB,
      threads: process.Threads,
      handles: process.Handles,
      startTime: process.StartTime
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 备用方案：使用 tasklist 获取进程列表
 */
async function getProcessListFallback() {
  const { stdout } = await execPromise('tasklist /FO CSV /NH');
  const lines = stdout.trim().split('\\n');
  
  return lines.map(line => {
    // 解析 CSV 格式
    const parts = line.match(/"([^"]*)"/g)?.map(s => s.replace(/"/g, '')) || [];
    if (parts.length >= 5) {
      return {
        pid: parseInt(parts[1]) || 0,
        name: parts[0],
        title: '',
        cpu: 0,
        memory: parseInt(parts[4]?.replace(/[^\\d]/g, '')) / 1024 || 0, // Convert KB to MB
        status: 'Running'
      };
    }
    return null;
  }).filter(Boolean);
}

module.exports = router;
