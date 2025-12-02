// 全局存儲作業數據
let homeworkData = [];

/****************************************
 * 工具函數
 ****************************************/
/**
 * 將日期對象格式化為YYYY-MM-DD字符串
 * @param {Date} date - 日期對象
 * @returns {string} 格式化後的日期字符串
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // 月份從0開始，補零至2位
    const day = String(date.getDate()).padStart(2, '0');        // 日期補零至2位
    return `${year}-${month}-${day}`;
}

/****************************************
 * 數據加載模塊
 ****************************************/
/**
 * 設置日期篩選器默認值為今天
 * 若元素未立即加載，將重試獲取
 */
function setTodayDate() {
    const issueDateFilter = document.getElementById('issueDateFilter');
    if (issueDateFilter) {
        const today = new Date();
        const formattedDate = formatDate(today);
        issueDateFilter.value = formattedDate;
    } else {
        // 延遲100ms重試（處理DOM加載時序問題）
        setTimeout(setTodayDate, 100);
    }
}

/**
 * 加載最後更新時間信息
 * 嘗試多種可能的文件路徑，確保兼容性
 */
function loadLastUpdateTime() {
    // 可能的文件路徑（適配不同部署環境）
    const possiblePaths = [
        'hw-list/last_update.json',
        './hw-list/last_update.json',
        '/hw-list/last_update.json'
    ];

    /**
     * 遞歸嘗試加載文件
     * @param {number} pathIndex - 當前嘗試的路徑索引
     */
    function tryLoad(pathIndex) {
        // 所有路徑嘗試失敗時，使用當前時間作為默認值
        if (pathIndex >= possiblePaths.length) {
            const lastUpdate = document.getElementById('lastUpdate');
            if (lastUpdate) {
                lastUpdate.textContent = new Date().toLocaleString('zh-Hant');
            }
            return;
        }

        const path = possiblePaths[pathIndex];

        // 禁用緩存，確保獲取最新數據
        fetch(path, { cache: 'no-store' })
            .then(response => {
                if (!response.ok) throw new Error(`HTTP錯誤: ${response.status}`);
                return response.json();
            })
            .then(data => updateLastUpdateDisplay(data)) // 成功則更新顯示
            .catch(() => tryLoad(pathIndex + 1));       // 失敗則嘗試下一個路徑
    }

    // 從第一個路徑開始嘗試
    tryLoad(0);
}

/**
 * 更新最後更新時間的顯示格式
 * @param {Object} updateData - 包含最後更新時間的對象
 */
function updateLastUpdateDisplay(updateData) {
    const lastUpdate = document.getElementById('lastUpdate');
    if (!lastUpdate) return;

    if (updateData && updateData.last_updated) {
        try {
            const updateDate = new Date(updateData.last_updated);
            // 格式化顯示為繁體中文 locale（年/月/日 時:分:秒）
            lastUpdate.textContent = updateDate.toLocaleString('zh-Hant', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false // 24小時制
            });
        } catch (e) {
            // 日期解析失敗時，直接顯示原始字符串
            lastUpdate.textContent = updateData.last_updated;
        }
    } else {
        // 無數據時顯示當前時間
        lastUpdate.textContent = new Date().toLocaleString('zh-Hant');
    }
}

/**
 * 加載作業數據主函數
 * 嘗試多種路徑，失敗時顯示上傳區域
 */
function loadHomeworkData() {
    const possiblePaths = [
        'hw-list/homework_data.json',
        './hw-list/homework_data.json',
        '/hw-list/homework_data.json'
    ];

    /**
     * 遞歸嘗試加載作業數據文件
     * @param {number} pathIndex - 當前嘗試的路徑索引
     */
    function tryLoad(pathIndex) {
        if (pathIndex >= possiblePaths.length) {
            showUploadArea(); // 所有路徑失敗，顯示文件上傳區域
            return;
        }

        const path = possiblePaths[pathIndex];

        fetch(path, { cache: 'no-store' })
            .then(response => {
                if (!response.ok) throw new Error(`HTTP錯誤: ${response.status}`);
                return response.json();
            })
            .then(data => processHomeworkData(data)) // 成功則處理數據
            .catch(() => tryLoad(pathIndex + 1));   // 失敗則嘗試下一個路徑
    }

    tryLoad(0);
}

/**
 * 顯示文件上傳區域（當數據加載失敗時）
 */
function showUploadArea() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const uploadArea = document.getElementById('uploadArea');

    if (loadingSpinner) loadingSpinner.style.display = 'none'; // 隱藏加載動畫
    if (uploadArea) uploadArea.style.display = 'block';       // 顯示上傳區域
}

/**
 * 處理用戶上傳的JSON文件
 */
function handleFileUpload() {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput) {
        alert('文件輸入元素未找到');
        return;
    }

    const file = fileInput.files[0];
    if (!file) {
        alert('請選擇一個JSON文件');
        return;
    }

    // 驗證文件類型
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        alert('請選擇一個有效的JSON文件');
        return;
    }

    const reader = new FileReader();

    // 文件讀取成功後的處理
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);
            processHomeworkData(data); // 處理上傳的數據

            // 隱藏上傳區域
            const uploadArea = document.getElementById('uploadArea');
            if (uploadArea) uploadArea.style.display = 'none';
        } catch (error) {
            alert('解析JSON文件時出錯: ' + error.message);
        }
    };

    // 讀取錯誤處理
    reader.onerror = function () {
        alert('讀取文件時出錯');
    };

    // 以文本形式讀取文件
    reader.readAsText(file);
}

/**
 * 處理作業數據（驗證格式並初始化後續流程）
 * @param {Array} data - 作業數據數組
 * @throws {Error} 當數據格式不正確時拋出錯誤
 */
function processHomeworkData(data) {
    if (!Array.isArray(data)) {
        throw new Error('數據格式錯誤: 應為數組');
    }

    // 存儲驗證後的作業數據
    homeworkData = data;

    // 隱藏加載動畫，顯示表格容器
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) loadingSpinner.style.display = 'none';

    const homeworkTableContainer = document.getElementById('homeworkTableContainer');
    if (homeworkTableContainer) homeworkTableContainer.style.display = 'block';

    // 初始化篩選器並應用篩選
    populateSubjectFilter();
    applyFilters();
}

/****************************************
 * 篩選功能模塊
 ****************************************/
/**
 * 填充科目篩選器
 */
function populateSubjectFilter() {
    const subjectFilter = document.getElementById('subjectFilter');
    if (!subjectFilter) return;

    const subjects = [...new Set(homeworkData.map(item => item.subject))].sort();

    while (subjectFilter.children.length > 1) {
        subjectFilter.removeChild(subjectFilter.lastChild);
    }

    subjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        subjectFilter.appendChild(option);
    });
}

/**
 * 應用篩選器
 */
function applyFilters() {
    const issueDateFilter = document.getElementById('issueDateFilter');
    const subjectFilter = document.getElementById('subjectFilter');
    const dueStatusFilter = document.getElementById('dueStatusFilter');

    if (!issueDateFilter || !subjectFilter || !dueStatusFilter) return;

    const issueDate = issueDateFilter.value;
    const subject = subjectFilter.value;
    const dueStatus = dueStatusFilter.value;

    const filteredData = homeworkData.filter(item => {
        if (issueDate && item.issue_date !== issueDate) {
            return false;
        }

        if (subject && item.subject !== subject) {
            return false;
        }

        if (dueStatus) {
            const dueDate = new Date(item.due_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (dueStatus === 'overdue') {
                if (dueDate >= today) return false;
            } else if (dueStatus === 'today') {
                if (dueDate.toDateString() !== today.toDateString()) return false;
            } else if (dueStatus === 'future') {
                if (dueDate <= today) return false;
            }
        }

        return true;
    });

    renderHomeworkTable(filteredData);
    updateStatistics(filteredData);
}

/**
 * 重置篩選器
 */
function resetFilters() {
    const subjectFilter = document.getElementById('subjectFilter');
    const dueStatusFilter = document.getElementById('dueStatusFilter');
    const issueDateFilter = document.getElementById('issueDateFilter');

    if (subjectFilter) subjectFilter.value = '';
    if (dueStatusFilter) dueStatusFilter.value = '';
    if (issueDateFilter) {
        const today = new Date();
        issueDateFilter.value = formatDate(today); // 使用已有的formatDate函數格式化日期
    }

    applyFilters();
}

/****************************************
 * 統計信息模塊
 ****************************************/
/**
 * 更新統計信息
 * @param {Array} data - 經過篩選的作業數據
 */
function updateStatistics(data) {
    const issuedTodayCountElement = document.getElementById('issuedTodayCount');
    const dueTodayCountElement = document.getElementById('dueTodayCount');

    if (!issuedTodayCountElement || !dueTodayCountElement) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const issuedTodayCount = data.filter(item => {
        const issueDate = new Date(item.issue_date);
        return issueDate.toDateString() === today.toDateString();
    }).length;

    const dueTodayCount = data.filter(item => {
        const dueDate = new Date(item.due_date);
        return dueDate.toDateString() === today.toDateString();
    }).length;

    issuedTodayCountElement.textContent = issuedTodayCount;
    dueTodayCountElement.textContent = dueTodayCount;
}

/****************************************
 * 表格渲染模塊
 ****************************************/
/**
 * 渲染作業表格函數
 * 根據作業數據動態生成表格內容，處理數據狀態展示
 * @param {Array} data - 作業數據數組，每項包含id、subject等字段
 */
function renderHomeworkTable(data) {
    // 緩存DOM元素（減少重覆查詢）
    const container = document.getElementById('homeworkTableBody');
    const noData = document.getElementById('noData');
    const filteredCount = document.getElementById('filteredCount');

    // 防錯處理
    if (!container || !noData || !filteredCount) return;

    // 處理空數據
    if (data.length === 0) {
        container.innerHTML = '';
        noData.style.display = 'block';
        filteredCount.textContent = '0 條記錄';
        return;
    }

    // 顯示表格並更新統計
    noData.style.display = 'none';
    filteredCount.textContent = `${data.length} 條記錄`;

    // 統一處理當前日期（避免重複創建對象）
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 生成表格行
    container.innerHTML = data.map(item => {
        const dueDate = new Date(item.due_date);
        const isOverdue = dueDate < today;
        const isToday = dueDate.toDateString() === today.toDateString();

        // 狀態信息（用三元表達式簡化判斷）
        const [statusClass, statusText, statusIcon] = isOverdue
            ? ['overdue', '已過期', 'exclamation-circle']
            : isToday
                ? ['today', '今天到期', 'clock']
                : ['normal', '進行中', 'arrow-right'];

        return `
            <tr class="${statusClass}">
                <td>${item.id}</td>
                <td>${item.subject}</td>
                <td>${item.homework_name}</td>
                <td>${item.issue_date}</td>
                <td>${item.due_date}</td>
                <td>${item.class_group}</td>
                <td>
                    <span class="status-badge ${statusClass}">
                        <i class="bi bi-${statusIcon} me-1"></i>${statusText}
                    </span>
                </td>
                <td>
                    <div class="homework-remarks">${item.remarks || '無備註'}</div>
                </td>
            </tr>
        `;
    }).join('');
}

/****************************************
 * 圖片導出功能
 ****************************************/
/**
 * 初始化下載按鈕事件
 */
function initDownloadButton() {
    const downloadBtn = document.getElementById('downloadTableBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadTableAsImage);
    } else {
        // 處理DOM加載時序問題
        setTimeout(initDownloadButton, 100);
    }
}

/**
 * 將作業表格轉換為圖片並下載
 */
async function downloadTableAsImage() {
    const tableWrapper = document.getElementById('homeworkTableContainer');
    const tableContainer = document.querySelector('.homework-table-container');
    const noDataElement = document.getElementById('noData');
    const downloadBtn = document.getElementById('downloadTableBtn');
    const originalText = downloadBtn.innerHTML;

    try {
        // 檢查數據狀態
        if (noDataElement && noDataElement.style.display !== 'none') {
            alert(document.body.classList.contains('english') ?
                'No data to download' : '沒有可下載的數據');
            return;
        }

        if (!tableContainer || !tableWrapper) {
            throw new Error(document.body.classList.contains('english') ?
                'Table container not found' : '未找到表格容器');
        }

        // ========== 關鍵修復：臨時展開所有容器 ==========
        const styleBackup = {
            wrapper: {
                overflow: tableWrapper.style.overflow,
                height: tableWrapper.style.height,
                maxHeight: tableWrapper.style.maxHeight
            },
            container: {
                overflow: tableContainer.style.overflow,
                height: tableContainer.style.height,
                maxHeight: tableContainer.style.maxHeight,
                width: tableContainer.style.width,
                maxWidth: tableContainer.style.maxWidth
            },
            body: {
                overflow: document.body.style.overflow
            },
            html: {
                overflow: document.documentElement.style.overflow
            }
        };

        // 臨時展開所有容器
        tableWrapper.style.overflow = 'visible';
        tableWrapper.style.height = 'auto';
        tableWrapper.style.maxHeight = 'none';

        tableContainer.style.overflow = 'visible';
        tableContainer.style.height = 'auto';
        tableContainer.style.maxHeight = 'none';
        tableContainer.style.width = 'auto';
        tableContainer.style.maxWidth = 'none';

        document.body.style.overflow = 'visible';
        document.documentElement.style.overflow = 'visible';

        // 強制重新計算布局
        await new Promise(resolve => setTimeout(resolve, 300));

        // ========== 優化html2canvas配置 ==========
        const canvas = await html2canvas(tableContainer, {
            scale: 3, // 高分辨率
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: tableContainer.scrollWidth,
            windowHeight: tableContainer.scrollHeight,
            x: 0,
            y: 0,
            scrollX: 0,
            scrollY: 0,
            allowTaint: true,
            removeContainer: false
        });

        // ========== 下載圖片 ==========
        const link = document.createElement('a');
        const today = new Date();
        const formattedDate = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}_${String(today.getHours()).padStart(2, '0')}${String(today.getMinutes()).padStart(2, '0')}`;
        const fileName = `作業表_${formattedDate}.png`;

        link.download = fileName;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();

    } catch (error) {
        console.error('下載圖片失敗:', error);
        alert(document.body.classList.contains('english') ?
            'Failed to download image: ' + error.message :
            '下載圖片失敗: ' + error.message);
    } finally {
        // 恢復所有樣式
        if (tableWrapper) {
            tableWrapper.style.overflow = styleBackup.wrapper.overflow;
            tableWrapper.style.height = styleBackup.wrapper.height;
            tableWrapper.style.maxHeight = styleBackup.wrapper.maxHeight;
        }
        if (tableContainer) {
            tableContainer.style.overflow = styleBackup.container.overflow;
            tableContainer.style.height = styleBackup.container.height;
            tableContainer.style.maxHeight = styleBackup.container.maxHeight;
            tableContainer.style.width = styleBackup.container.width;
            tableContainer.style.maxWidth = styleBackup.container.maxWidth;
        }
        document.body.style.overflow = styleBackup.body.overflow;
        document.documentElement.style.overflow = styleBackup.html.overflow;

        // 恢復按鈕原始狀態（無動畫）
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = originalText;
    }
}

// 初始化按鈕事件
function initDownloadButton() {
    const downloadBtn = document.getElementById('downloadTableBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadTableAsImage);
    } else {
        setTimeout(initDownloadButton, 100);
    }
}

// 頁面加載後初始化
window.addEventListener('load', initDownloadButton);

/****************************************
 * 主應用程序入口
 ****************************************/
// 等待DOM完全加載後執行初始化操作
document.addEventListener('DOMContentLoaded', function () {
    // 初始化日期選擇器（默認選中今天）
    setTodayDate();

    // 加載數據相關資源
    loadLastUpdateTime();  // 加載最後更新時間
    loadHomeworkData();    // 加載作業數據

    // 綁定篩選器事件監聽器
    document.getElementById('issueDateFilter').addEventListener('change', applyFilters);
    document.getElementById('subjectFilter').addEventListener('change', applyFilters);
    document.getElementById('dueStatusFilter').addEventListener('change', applyFilters);

    // 綁定重置和上傳按鈕事件
    document.getElementById('resetFilter').addEventListener('click', resetFilters);
    document.getElementById('uploadButton').addEventListener('click', handleFileUpload);

    // 初始化主題切換功能
    initializeThemeToggle();
});

/****************************************
 * 主題切換模塊
 ****************************************/
function initializeThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;

    // 添加ARIA屬性提升可訪問性
    themeToggle.setAttribute('aria-label', '切換深色/淺色模式');
    themeToggle.setAttribute('role', 'switch');

    // 初始化主題狀態
    function initTheme() {
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
        }
        updateToggleState(isDarkMode);
    }

    // 更新切換按鈕狀態（圖標+ARIA）
    function updateToggleState(isDark) {
        const icon = themeToggle.querySelector('i');
        // 移除所有圖標類並添加過渡效果
        icon.className = 'bi transition-all duration-300 ease-in-out';

        if (isDark) {
            icon.classList.add('bi-sun', 'text-yellow-300', 'scale-110');
            themeToggle.setAttribute('aria-checked', 'true');
        } else {
            icon.classList.add('bi-moon', 'text-blue-200');
            themeToggle.setAttribute('aria-checked', 'false');
        }
    }

    // 切換主題模式（添加平滑過渡）
    function toggleDarkMode() {
        const isDarkMode = document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', isDarkMode);
        // 添加主題切換時的頁面過渡效果
        document.body.classList.add('theme-transition');
        setTimeout(() => {
            document.body.classList.remove('theme-transition');
        }, 300);
        updateToggleState(isDarkMode);

        // 觸發表格重新渲染以適應主題
        if (typeof applyFilters === 'function') {
            applyFilters();
        }
    }

    // 綁定事件（添加點擊反饋）
    themeToggle.addEventListener('click', toggleDarkMode);
    themeToggle.addEventListener('mousedown', () => {
        themeToggle.classList.add('active');
    });
    themeToggle.addEventListener('mouseup', () => {
        themeToggle.classList.remove('active');
    });
    themeToggle.addEventListener('mouseleave', () => {
        themeToggle.classList.remove('active');
    });

    // 頁面加載時初始化
    document.addEventListener('DOMContentLoaded', initTheme);
}