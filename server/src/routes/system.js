/**
 * TaroTora - Remote Control System
 * Copyright (C) 2026 OldYuTou
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * 系统监控路由
 * 提供 CPU、内存、磁盘等系统信息
 */

const express = require('express');
const router = express.Router();
const os = require('os');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

// 存储上次 CPU 数据用于计算使用率
let lastCpuData = null;

/**
 * GET /api/system/info
 * 获取系统信息
 */
router.get('/info', async (req, res) => {
  try {
    // 获取 CPU 使用率
    const cpuUsage = await getCPUUsage();
    
    // 获取内存信息
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    // 获取磁盘信息
    const diskInfo = await getDiskInfo();
    
    // 获取系统运行时间
    const uptime = os.uptime();
    
    // 获取 CPU 信息
    const cpus = os.cpus();
    
    res.json({
      // CPU
      cpuUsage: Math.round(cpuUsage),
      cpuModel: cpus[0]?.model || 'Unknown',
      cpuCores: cpus.length,
      
      // 内存
      memoryTotal: totalMem,
      memoryUsed: usedMem,
      memoryFree: freeMem,
      memoryUsage: Math.round((usedMem / totalMem) * 100),
      
      // 磁盘
      diskUsage: diskInfo.usage,
      
      // 系统
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      nodeVersion: process.version,
      uptimeSeconds: uptime,
      currentTime: new Date().toLocaleString('zh-CN')
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * 获取 CPU 使用率
 */
async function getCPUUsage() {
  return new Promise((resolve) => {
    const cpus = os.cpus();
    
    if (!lastCpuData) {
      lastCpuData = cpus;
      resolve(0);
      return;
    }
    
    let totalDiff = 0;
    let idleDiff = 0;
    
    for (let i = 0; i < cpus.length; i++) {
      const cpu = cpus[i];
      const lastCpu = lastCpuData[i];
      
      const times = cpu.times;
      const lastTimes = lastCpu.times;
      
      const userDiff = times.user - lastTimes.user;
      const niceDiff = times.nice - lastTimes.nice;
      const sysDiff = times.sys - lastTimes.sys;
      const idleDiffCore = times.idle - lastTimes.idle;
      const irqDiff = times.irq - lastTimes.irq;
      
      const total = userDiff + niceDiff + sysDiff + idleDiffCore + irqDiff;
      
      totalDiff += total;
      idleDiff += idleDiffCore;
    }
    
    lastCpuData = cpus;
    
    const usage = ((totalDiff - idleDiff) / totalDiff) * 100;
    resolve(usage || 0);
  });
}

/**
 * 获取磁盘信息
 */
async function getDiskInfo() {
  try {
    if (process.platform === 'win32') {
      const { stdout } = await execPromise('wmic logicaldisk get size,freespace /format:csv');
      const lines = stdout.trim().split('\n').slice(1);
      
      let totalSize = 0;
      let totalFree = 0;
      
      for (const line of lines) {
        const parts = line.trim().split(',');
        if (parts.length >= 3) {
          const free = parseInt(parts[1]) || 0;
          const size = parseInt(parts[2]) || 0;
          totalFree += free;
          totalSize += size;
        }
      }
      
      return {
        total: totalSize,
        free: totalFree,
        used: totalSize - totalFree,
        usage: totalSize > 0 ? Math.round(((totalSize - totalFree) / totalSize) * 100) : 0
      };
    } else {
      const { stdout } = await execPromise('df -k / | tail -1');
      const parts = stdout.trim().split(/\s+/);
      const total = parseInt(parts[1]) * 1024;
      const used = parseInt(parts[2]) * 1024;
      
      return {
        total,
        free: total - used,
        used,
        usage: Math.round((used / total) * 100)
      };
    }
  } catch (error) {
    return { total: 0, free: 0, used: 0, usage: 0 };
  }
}

module.exports = router;
