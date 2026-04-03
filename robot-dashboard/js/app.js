/**
 * AirBot 机器人网页面板 - 主应用逻辑
 */

// 家庭成员配置数据
const familyMembers = {
    'adult': {
        name: '爸爸',
        type: '成年男性',
        thresholds: {
            'PM2.5': { value: '≤ 35 μg/m³', reason: '标准成人阈值' },
            'CO2': { value: '≤ 1000 ppm', reason: '正常通风标准' },
            '温度': { value: '18-26°C', reason: '舒适温度范围' },
            '湿度': { value: '40-60%', reason: '舒适湿度范围' }
        }
    },
    'adult-female': {
        name: '妈妈',
        type: '成年女性',
        thresholds: {
            'PM2.5': { value: '≤ 35 μg/m³', reason: '标准成人阈值' },
            'CO2': { value: '≤ 1000 ppm', reason: '正常通风标准' },
            '温度': { value: '20-25°C', reason: '女性适宜温度' },
            '湿度': { value: '45-55%', reason: '护肤保湿推荐' }
        }
    },
    'child': {
        name: '宝宝',
        type: '婴幼儿 (2岁)',
        thresholds: {
            'PM2.5': { value: '≤ 25 μg/m³', reason: '婴幼儿呼吸道更敏感', strict: true },
            'CO2': { value: '≤ 600 ppm', reason: '保证充足氧气供应', strict: true },
            '温度': { value: '20-24°C', reason: '婴幼儿适宜温度' },
            '湿度': { value: '45-55%', reason: '预防呼吸道疾病' }
        }
    },
    'elder': {
        name: '爷爷',
        type: '老年人 (68岁)',
        thresholds: {
            'PM2.5': { value: '≤ 25 μg/m³', reason: '老年人呼吸系统脆弱', strict: true },
            'CO2': { value: '≤ 800 ppm', reason: '老年人需更多氧气', strict: true },
            '温度': { value: '22-26°C', reason: '老年人怕冷' },
            '湿度': { value: '50-60%', reason: '呼吸道保健' }
        }
    }
};

// 房间数据
const roomData = {
    'living': { name: '客厅', aqi: 45, status: 'good' },
    'bedroom1': { name: '主卧', aqi: 38, status: 'good' },
    'bedroom2': { name: '儿童房', aqi: 85, status: 'warning' },
    'kitchen': { name: '厨房', aqi: 62, status: 'moderate' },
    'bathroom': { name: '卫生间', aqi: 42, status: 'good' },
    'study': { name: '书房', aqi: 35, status: 'good' }
};

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initFamilySelector();
    initThresholdTabs();
    initModal();
    initDataSimulation();
});

/**
 * 初始化底部导航
 */
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetPage = item.dataset.page;
            
            // 更新导航状态
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // 切换页面
            pages.forEach(page => {
                page.classList.remove('active');
                if (page.id === `page-${targetPage}`) {
                    page.classList.add('active');
                }
            });
        });
    });
}

/**
 * 初始化家庭成员选择器（热力图页面）
 */
function initFamilySelector() {
    const members = document.querySelectorAll('.family-member');
    
    members.forEach(member => {
        member.addEventListener('click', () => {
            members.forEach(m => m.classList.remove('active'));
            member.classList.add('active');
            
            const memberType = member.dataset.member;
            updateHeatmapForMember(memberType);
        });
    });
}

/**
 * 根据家庭成员更新热力图显示
 */
function updateHeatmapForMember(memberType) {
    const member = familyMembers[memberType];
    if (!member) return;
    
    // 更新房间状态显示
    const rooms = document.querySelectorAll('.room-real');
    rooms.forEach(room => {
        const roomKey = room.dataset.room;
        const roomInfo = roomData[roomKey];
        if (!roomInfo) return;
        
        // 根据家庭成员阈值调整显示
        const aqi = roomInfo.aqi;
        let status = 'good';
        let statusText = '优';
        
        // 针对不同人群调整阈值判断
        if (memberType === 'child' || memberType === 'elder') {
            // 对婴幼儿和老年人更严格
            if (aqi > 50) {
                status = 'warning';
                statusText = '需注意';
            } else if (aqi > 25) {
                status = 'moderate';
                statusText = '良';
            }
        } else {
            // 成年人标准
            if (aqi > 100) {
                status = 'bad';
                statusText = '差';
            } else if (aqi > 50) {
                status = 'warning';
                statusText = '注意';
            } else if (aqi > 25) {
                status = 'moderate';
                statusText = '良';
            }
        }
        
        // 只更新状态类，不覆盖基础样式
        room.classList.remove('good', 'moderate', 'warning', 'bad');
        room.classList.add(status);
        
        const statusTextEl = room.querySelector('.status-text');
        if (statusTextEl) {
            statusTextEl.textContent = statusText;
        }
    });
    
    // 更新房间详情建议
    updateRoomDetails(member);
}

function updateRoomDetails(member) {
    const detailCards = document.querySelector('.detail-cards');
    if (!detailCards) return;
    
    // 根据家庭成员生成个性化建议
    let warningRoom = '儿童房';
    let warningDesc = '湿度偏高(72%)，建议开启除湿模式。';
    let suggestion = '建议开启空气净化器并增加通风时间';
    
    if (member.thresholds) {
        const pm25Threshold = member.thresholds['PM2.5'];
        if (pm25Threshold && pm25Threshold.strict) {
            warningDesc = `PM2.5 浓度对该年龄段建议阈值(${pm25Threshold.value})接近临界，需持续关注。`;
            suggestion = '建议开启空气净化器并减少室外活动';
        }
    }
    
    detailCards.innerHTML = `
        <div class="detail-card highlight">
            <div class="detail-header">
                <span class="detail-room">${warningRoom}</span>
                <span class="detail-badge warning">需关注</span>
            </div>
            <p class="detail-desc">${warningDesc}</p>
            <div class="detail-suggestion">
                <span class="suggestion-icon">💡</span>
                <span>${suggestion}</span>
            </div>
        </div>
        <div class="detail-card">
            <div class="detail-header">
                <span class="detail-room">客厅</span>
                <span class="detail-badge good">良好</span>
            </div>
            <p class="detail-desc">各项指标均在正常范围内，空气质量优良，适合${member.name}活动。</p>
        </div>
    `;
}

/**
 * 初始化阈值标签页（设置页面）
 */
function initThresholdTabs() {
    const tabs = document.querySelectorAll('.threshold-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const memberType = tab.dataset.member;
            updateThresholdContent(memberType);
        });
    });
}

function updateThresholdContent(memberType) {
    const member = familyMembers[memberType];
    if (!member || !member.thresholds) return;
    
    const content = document.querySelector('.threshold-content');
    if (!content) return;
    
    const thresholds = member.thresholds;
    content.innerHTML = Object.entries(thresholds).map(([key, data]) => `
        <div class="threshold-item">
            <span class="threshold-name">${key}</span>
            <span class="threshold-value ${data.strict ? 'strict' : ''}">${data.value}</span>
            <span class="threshold-reason">${data.reason}</span>
        </div>
    `).join('');
}

/**
 * 初始化弹窗
 */
function initModal() {
    const modal = document.getElementById('add-member-modal');
    const addBtn = document.getElementById('add-member-btn');
    const closeBtn = modal.querySelector('.modal-close');
    const overlay = modal.querySelector('.modal-overlay');
    const cancelBtn = modal.querySelector('.btn-cancel');
    const confirmBtn = modal.querySelector('.btn-confirm');
    const avatarOptions = modal.querySelectorAll('.avatar-option');
    
    // 打开弹窗
    addBtn.addEventListener('click', () => {
        modal.classList.add('active');
    });
    
    // 关闭弹窗
    const closeModal = () => modal.classList.remove('active');
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    // 头像选择
    avatarOptions.forEach(option => {
        option.addEventListener('click', () => {
            avatarOptions.forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
        });
    });
    
    // 确认添加
    confirmBtn.addEventListener('click', () => {
        const nameInput = modal.querySelector('.form-input');
        const name = nameInput.value.trim();
        
        if (name) {
            // 这里可以添加实际的保存逻辑
            alert(`已添加家庭成员: ${name}`);
            nameInput.value = '';
            closeModal();
        } else {
            alert('请输入称呼');
        }
    });
}

/**
 * 数据模拟 - 模拟实时数据更新
 */
function initDataSimulation() {
    // 模拟电量变化
    simulateBattery();
    
    // 模拟空气质量数据变化
    simulateAirQuality();
    
    // 模拟机器人状态
    simulateRobotStatus();
}

function simulateBattery() {
    const batteryEl = document.querySelector('.battery-percentage');
    const batteryFill = document.querySelector('.battery-fill');
    const batteryStatus = document.querySelector('.battery-status');
    
    if (!batteryEl) return;
    
    let battery = 78;
    
    setInterval(() => {
        // 随机波动电量
        const change = Math.random() > 0.7 ? -1 : 0;
        battery = Math.max(10, Math.min(100, battery + change));
        
        batteryEl.textContent = `${battery}%`;
        
        // 更新电池图标
        if (batteryFill) {
            const width = (battery / 100) * 14;
            batteryFill.setAttribute('width', width);
            
            // 根据电量改变颜色
            let color = '#22c55e';
            if (battery < 20) color = '#ef4444';
            else if (battery < 50) color = '#f59e0b';
            batteryFill.setAttribute('fill', color);
        }
        
        // 计算剩余时间
        const hours = (battery / 100 * 6).toFixed(1);
        if (batteryStatus) {
            batteryStatus.textContent = `预计可运行 ${hours} 小时`;
        }
    }, 30000); // 每30秒更新一次
}

function simulateAirQuality() {
    const cards = document.querySelectorAll('.aqi-card');
    
    setInterval(() => {
        cards.forEach(card => {
            const valueEl = card.querySelector('.aqi-value');
            const statusEl = card.querySelector('.aqi-status');
            
            if (!valueEl) return;
            
            const name = card.querySelector('.aqi-name').textContent;
            let currentValue = parseFloat(valueEl.textContent);
            
            // 根据指标类型进行不同的随机波动
            let change = (Math.random() - 0.5) * 2;
            
            switch(name) {
                case 'CO₂':
                    change = (Math.random() - 0.5) * 10;
                    currentValue = Math.max(300, Math.min(2000, currentValue + change));
                    valueEl.textContent = Math.round(currentValue);
                    updateStatus(card, statusEl, currentValue, [
                        { max: 450, text: '优', class: 'good' },
                        { max: 1000, text: '良', class: 'moderate' },
                        { max: 1500, text: '轻度污染', class: 'warning' },
                        { max: Infinity, text: '重度污染', class: 'bad' }
                    ]);
                    break;
                case 'TVOC':
                    change = (Math.random() - 0.5) * 0.05;
                    currentValue = Math.max(0, Math.min(2, currentValue + change));
                    valueEl.textContent = currentValue.toFixed(2);
                    updateStatus(card, statusEl, currentValue, [
                        { max: 0.5, text: '优', class: 'good' },
                        { max: 1, text: '良', class: 'moderate' },
                        { max: Infinity, text: '超标', class: 'warning' }
                    ]);
                    break;
                case '温度':
                    change = (Math.random() - 0.5) * 0.5;
                    currentValue = Math.max(15, Math.min(35, currentValue + change));
                    valueEl.textContent = currentValue.toFixed(1);
                    updateStatus(card, statusEl, currentValue, [
                        { max: 18, text: '偏冷', class: 'warning' },
                        { max: 26, text: '舒适', class: 'good' },
                        { max: Infinity, text: '偏热', class: 'warning' }
                    ]);
                    break;
                case '湿度':
                    change = (Math.random() - 0.5) * 2;
                    currentValue = Math.max(20, Math.min(90, currentValue + change));
                    valueEl.textContent = Math.round(currentValue);
                    updateStatus(card, statusEl, currentValue, [
                        { max: 40, text: '干燥', class: 'warning' },
                        { max: 60, text: '舒适', class: 'good' },
                        { max: Infinity, text: '潮湿', class: 'warning' }
                    ]);
                    break;
                case 'PM2.5':
                    change = (Math.random() - 0.5) * 3;
                    currentValue = Math.max(0, Math.min(300, currentValue + change));
                    valueEl.textContent = Math.round(currentValue);
                    updateStatus(card, statusEl, currentValue, [
                        { max: 35, text: '优', class: 'good' },
                        { max: 75, text: '良', class: 'moderate' },
                        { max: 115, text: '轻度污染', class: 'warning' },
                        { max: Infinity, text: '中度污染', class: 'bad' }
                    ]);
                    break;
                case 'PM10':
                    change = (Math.random() - 0.5) * 4;
                    currentValue = Math.max(0, Math.min(300, currentValue + change));
                    valueEl.textContent = Math.round(currentValue);
                    updateStatus(card, statusEl, currentValue, [
                        { max: 50, text: '优', class: 'good' },
                        { max: 100, text: '良', class: 'moderate' },
                        { max: 150, text: '轻度污染', class: 'warning' },
                        { max: Infinity, text: '中度污染', class: 'bad' }
                    ]);
                    break;
            }
        });
    }, 10000); // 每10秒更新一次
}

function updateStatus(card, statusEl, value, thresholds) {
    if (!statusEl) return;
    
    for (const threshold of thresholds) {
        if (value <= threshold.max) {
            statusEl.textContent = threshold.text;
            card.className = `aqi-card ${threshold.class}`;
            break;
        }
    }
}

function simulateRobotStatus() {
    const locationEl = document.querySelector('.status-value');
    const coverageEl = document.querySelectorAll('.status-value')[2];
    
    if (!locationEl || !coverageEl) return;
    
    const rooms = ['客厅', '主卧', '儿童房', '厨房', '卫生间', '书房'];
    let currentRoomIndex = 0;
    let coverage = 65;
    
    setInterval(() => {
        // 切换当前位置
        currentRoomIndex = (currentRoomIndex + 1) % rooms.length;
        locationEl.textContent = rooms[currentRoomIndex];
        
        // 增加覆盖范围
        coverage = Math.min(100, coverage + Math.random() * 2);
        coverageEl.textContent = `${Math.round(coverage)}%`;
    }, 15000); // 每15秒更新一次
}

// 导出函数供全局使用
window.AirBotApp = {
    updateHeatmapForMember,
    updateThresholdContent
};

/**
 * 房间小地图管理
 */
const roomMapManager = {
    currentRoom: null,
    detectionPoints: {},
    pointCounter: 0,

    init() {
        this.loadPoints();
        this.initRoomClick();
        this.initMiniMap();
    },

    // 初始化房间点击事件
    initRoomClick() {
        const rooms = document.querySelectorAll('.room-real');
        rooms.forEach(room => {
            room.addEventListener('click', (e) => {
                const roomKey = room.dataset.room;
                this.openRoomMap(roomKey);
            });
        });
    },

    // 打开房间小地图
    openRoomMap(roomKey) {
        const modal = document.getElementById('room-map-modal');
        const title = document.getElementById('room-map-title');
        const miniMap = document.getElementById('mini-map');

        this.currentRoom = roomKey;
        const roomInfo = roomData[roomKey];

        title.textContent = `${roomInfo.name} - 检测点设置`;
        miniMap.dataset.room = roomKey;

        // 显示对应房间的地形
        this.showRoomTerrain(roomKey);

        // 清空并重新渲染检测点
        this.renderPoints();
        this.updatePointsList();

        modal.classList.add('active');
    },

    // 显示房间地形
    showRoomTerrain(roomKey) {
        // 隐藏所有地形
        const allTerrains = document.querySelectorAll('.room-terrain');
        allTerrains.forEach(t => t.classList.remove('active'));

        // 显示对应房间的地形
        const terrainMap = {
            'living': 'terrain-living',
            'bedroom1': 'terrain-bedroom1',
            'bedroom2': 'terrain-bedroom2',
            'kitchen': 'terrain-kitchen',
            'bathroom': 'terrain-bathroom',
            'study': 'terrain-study'
        };

        const terrainId = terrainMap[roomKey];
        if (terrainId) {
            const terrain = document.getElementById(terrainId);
            if (terrain) {
                terrain.classList.add('active');
            }
        }
    },

    // 关闭房间小地图
    closeRoomMap() {
        const modal = document.getElementById('room-map-modal');
        modal.classList.remove('active');
        this.currentRoom = null;
    },

    // 初始化小地图点击事件
    initMiniMap() {
        const miniMap = document.getElementById('mini-map');
        const closeBtn = document.getElementById('room-map-close');
        const cancelBtn = document.getElementById('room-map-cancel');
        const saveBtn = document.getElementById('room-map-save');
        const overlay = document.querySelector('#room-map-modal .modal-overlay');

        // 点击地图添加检测点
        miniMap.addEventListener('click', (e) => {
            if (e.target.classList.contains('detection-point')) return;
            
            const rect = miniMap.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
            const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
            
            this.addPoint(parseFloat(x), parseFloat(y));
        });

        // 关闭按钮
        closeBtn.addEventListener('click', () => this.closeRoomMap());
        cancelBtn.addEventListener('click', () => this.closeRoomMap());
        overlay.addEventListener('click', () => this.closeRoomMap());

        // 保存按钮
        saveBtn.addEventListener('click', () => {
            this.savePoints();
            alert('检测点设置已保存！');
            this.closeRoomMap();
        });
    },

    // 添加检测点
    addPoint(x, y) {
        if (!this.currentRoom) return;
        
        if (!this.detectionPoints[this.currentRoom]) {
            this.detectionPoints[this.currentRoom] = [];
        }

        this.pointCounter++;
        const point = {
            id: `point_${Date.now()}`,
            number: this.detectionPoints[this.currentRoom].length + 1,
            x: x,
            y: y,
            name: `检测点 ${this.detectionPoints[this.currentRoom].length + 1}`
        };

        this.detectionPoints[this.currentRoom].push(point);
        this.renderPoint(point);
        this.updatePointsList();
    },

    // 删除检测点
    removePoint(pointId) {
        if (!this.currentRoom || !this.detectionPoints[this.currentRoom]) return;

        const pointEl = document.querySelector(`[data-point-id="${pointId}"]`);
        if (pointEl) {
            pointEl.classList.add('removing');
            setTimeout(() => {
                pointEl.remove();
            }, 300);
        }

        this.detectionPoints[this.currentRoom] = this.detectionPoints[this.currentRoom]
            .filter(p => p.id !== pointId);
        
        // 重新编号
        this.detectionPoints[this.currentRoom].forEach((p, i) => {
            p.number = i + 1;
            p.name = `检测点 ${i + 1}`;
        });

        setTimeout(() => this.updatePointsList(), 300);
    },

    // 渲染单个检测点
    renderPoint(point) {
        const miniMap = document.getElementById('mini-map');
        
        const pointEl = document.createElement('div');
        pointEl.className = 'detection-point adding';
        pointEl.dataset.pointId = point.id;
        pointEl.style.left = `calc(${point.x}% - 16px)`;
        pointEl.style.top = `calc(${point.y}% - 16px)`;
        
        const numberEl = document.createElement('span');
        numberEl.className = 'point-number';
        numberEl.textContent = point.number;
        pointEl.appendChild(numberEl);

        // 点击删除
        pointEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removePoint(point.id);
        });

        miniMap.appendChild(pointEl);
        
        setTimeout(() => pointEl.classList.remove('adding'), 300);
    },

    // 渲染所有检测点
    renderPoints() {
        // 只移除检测点，不移除地形
        const existingPoints = document.querySelectorAll('.detection-point');
        existingPoints.forEach(p => p.remove());

        // 渲染当前房间的检测点
        if (this.currentRoom && this.detectionPoints[this.currentRoom]) {
            this.detectionPoints[this.currentRoom].forEach(point => {
                this.renderPoint(point);
            });
        }
    },

    // 更新检测点列表
    updatePointsList() {
        const listEl = document.getElementById('points-list');
        
        if (!this.currentRoom || !this.detectionPoints[this.currentRoom] || 
            this.detectionPoints[this.currentRoom].length === 0) {
            listEl.innerHTML = `
                <div class="empty-points">
                    <div class="empty-points-icon">📍</div>
                    <div>点击地图添加检测点</div>
                </div>
            `;
            return;
        }

        listEl.innerHTML = this.detectionPoints[this.currentRoom].map(point => `
            <div class="point-item">
                <div class="point-info">
                    <div class="point-icon">📍</div>
                    <div class="point-details">
                        <div class="point-name">${point.name}</div>
                        <div class="point-coords">位置: ${point.x}%, ${point.y}%</div>
                    </div>
                </div>
                <button class="point-delete" onclick="roomMapManager.removePoint('${point.id}')">
                    删除
                </button>
            </div>
        `).join('');
    },

    // 保存检测点（使用 localStorage）
    savePoints() {
        localStorage.setItem('airbot_detection_points', JSON.stringify(this.detectionPoints));
    },

    // 加载检测点
    loadPoints() {
        const saved = localStorage.getItem('airbot_detection_points');
        if (saved) {
            this.detectionPoints = JSON.parse(saved);
        }
    }
};

// 初始化房间地图管理器
document.addEventListener('DOMContentLoaded', () => {
    roomMapManager.init();
});

// 导出供全局使用
window.roomMapManager = roomMapManager;
