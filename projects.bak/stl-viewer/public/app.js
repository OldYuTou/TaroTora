// STL Viewer 应用逻辑
let scene, camera, renderer, controls, currentMesh;
let filesList = [];

// DOM 元素
const fileSelect = document.getElementById('file-select');
const fileInfo = document.getElementById('file-info');
const loadingEl = document.getElementById('loading');
const emptyStateEl = document.getElementById('empty-state');
const errorStateEl = document.getElementById('error-state');
const errorMessageEl = document.getElementById('error-message');
const modelInfoEl = document.getElementById('model-info');
const canvasContainer = document.getElementById('canvas-container');

// 初始化 Three.js 场景
function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f0f23);
  
  // 添加网格辅助线
  const gridHelper = new THREE.GridHelper(100, 50, 0x1a1a3e, 0x0f3460);
  scene.add(gridHelper);
  
  // 相机
  camera = new THREE.PerspectiveCamera(
    45,
    canvasContainer.clientWidth / canvasContainer.clientHeight,
    0.1,
    1000
  );
  camera.position.set(50, 50, 50);
  
  // 渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  canvasContainer.appendChild(renderer.domElement);
  
  // 控制器
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  
  // 灯光
  const ambientLight = new THREE.AmbientLight(0x404040, 2);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(10, 20, 10);
  scene.add(directionalLight);
  
  const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight2.position.set(-10, -20, -10);
  scene.add(directionalLight2);
  
  // 窗口大小调整
  window.addEventListener('resize', onWindowResize);
  
  // 开始渲染循环
  animate();
}

// 窗口大小调整处理
function onWindowResize() {
  if (!camera || !renderer) return;
  
  camera.aspect = canvasContainer.clientWidth / canvasContainer.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
}

// 动画循环
function animate() {
  requestAnimationFrame(animate);
  if (controls) controls.update();
  if (renderer && scene && camera) {
    renderer.render(scene, camera);
  }
}

// 加载 STL 文件
function loadSTL(filePath, fileInfo) {
  showLoading();
  
  // 移除之前的模型
  if (currentMesh) {
    scene.remove(currentMesh);
    currentMesh.geometry.dispose();
    currentMesh.material.dispose();
    currentMesh = null;
  }
  
  const loader = new THREE.STLLoader();
  
  loader.load(
    filePath,
    function (geometry) {
      // 计算法向量
      geometry.computeVertexNormals();
      
      // 创建材质
      const material = new THREE.MeshPhongMaterial({
        color: 0x00d4ff,
        specular: 0x111111,
        shininess: 200
      });
      
      // 创建网格
      currentMesh = new THREE.Mesh(geometry, material);
      
      // 计算包围盒并居中
      geometry.computeBoundingBox();
      const center = new THREE.Vector3();
      geometry.boundingBox.getCenter(center);
      currentMesh.position.sub(center);
      
      // 计算合适的缩放和相机距离
      const size = new THREE.Vector3();
      geometry.boundingBox.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      const cameraDistance = maxDim / (2 * Math.tan(fov / 2)) * 2.5;
      
      camera.position.set(cameraDistance, cameraDistance, cameraDistance);
      camera.lookAt(0, 0, 0);
      controls.update();
      
      // 添加线框效果
      const edges = new THREE.EdgesGeometry(geometry);
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0088aa, linewidth: 1 });
      const wireframe = new THREE.LineSegments(edges, lineMaterial);
      wireframe.position.copy(currentMesh.position);
      currentMesh.add(wireframe);
      
      scene.add(currentMesh);
      
      // 更新 UI
      hideLoading();
      showModelInfo(fileInfo, geometry);
    },
    function (progress) {
      // 加载进度
      console.log('加载进度:', progress);
    },
    function (error) {
      console.error('加载 STL 失败:', error);
      showError('无法加载 STL 文件，请检查文件格式是否正确');
    }
  );
}

// 显示加载状态
function showLoading() {
  loadingEl.classList.remove('hidden');
  emptyStateEl.classList.add('hidden');
  errorStateEl.classList.add('hidden');
}

// 隐藏加载状态
function hideLoading() {
  loadingEl.classList.add('hidden');
}

// 显示错误
function showError(message) {
  hideLoading();
  errorStateEl.classList.remove('hidden');
  errorMessageEl.textContent = message;
}

// 显示空状态
function showEmptyState() {
  hideLoading();
  emptyStateEl.classList.remove('hidden');
  errorStateEl.classList.add('hidden');
}

// 显示模型信息
function showModelInfo(fileInfo, geometry) {
  modelInfoEl.classList.remove('hidden');
  
  document.getElementById('info-name').textContent = fileInfo.name;
  document.getElementById('info-size').textContent = formatFileSize(fileInfo.size);
  document.getElementById('info-time').textContent = new Date(fileInfo.modified).toLocaleString('zh-CN');
  document.getElementById('info-vertices').textContent = geometry.attributes.position.count.toLocaleString();
}

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 获取文件列表
async function fetchFiles() {
  try {
    const response = await fetch('/api/stl-files');
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || '获取文件列表失败');
    }
    
    filesList = data.files;
    populateFileSelect(filesList);
    
    if (filesList.length === 0) {
      showEmptyState();
      fileSelect.innerHTML = '<option value="">暂无 STL 文件</option>';
    } else {
      // 自动加载最新的文件
      const latestFile = filesList[0];
      fileSelect.value = latestFile.path;
      loadSTL(latestFile.path, latestFile);
      fileInfo.textContent = `共 ${filesList.length} 个文件`;
    }
  } catch (error) {
    console.error('获取文件列表失败:', error);
    fileSelect.innerHTML = '<option value="">加载失败</option>';
    showError('无法获取文件列表: ' + error.message);
  }
}

// 填充下拉框
function populateFileSelect(files) {
  fileSelect.innerHTML = '';
  
  files.forEach((file, index) => {
    const option = document.createElement('option');
    option.value = file.path;
    option.textContent = `${file.name} (${formatFileSize(file.size)})`;
    if (index === 0) {
      option.textContent += ' [最新]';
    }
    fileSelect.appendChild(option);
  });
}

// 文件选择事件
fileSelect.addEventListener('change', function() {
  const selectedPath = this.value;
  if (!selectedPath) return;
  
  const fileInfo = filesList.find(f => f.path === selectedPath);
  if (fileInfo) {
    loadSTL(selectedPath, fileInfo);
  }
});

// 初始化
function init() {
  initScene();
  fetchFiles();
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
