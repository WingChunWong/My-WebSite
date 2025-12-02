/****************************************
 * 全域變數
 ****************************************/
// 全域存儲作業數據
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

/**
 * 取得頁面上選擇的日期（兼容<input type="date">元件）
 * @returns {Object} 包含選擇的Date物件與格式化字串
 *   - dateObj: Date實例
 *   - ymdStr: YYYY-MM-DD格式字串
 *   - zhStr: 繁體中文日期字串（例：2025年12月2日 星期二）
 */
function getSelectedDate() {
    // 取得日期選擇器元素
    const datePicker = document.getElementById('issueDateFilter');
    let selectedDateObj, selectedYmdStr;

    // 若有選擇日期則使用，否則預設為今日
    if (datePicker && datePicker.value) {
        selectedYmdStr = datePicker.value;
        // 處理Date物件的時區問題（避免因時區偏移導致日期錯亂）
        const [year, month, day] = selectedYmdStr.split('-').map(Number);
        selectedDateObj = new Date(year, month - 1, day);
    } else {
        // 預設為今日
        selectedDateObj = new Date();
        // 格式化為YYYY-MM-DD
        selectedYmdStr = `${selectedDateObj.getFullYear()}-${String(selectedDateObj.getMonth() + 1).padStart(2, '0')}-${String(selectedDateObj.getDate()).padStart(2, '0')}`;
    }

    // 格式化為繁體中文日期字串
    const zhDateStr = selectedDateObj.toLocaleDateString('zh-Hant', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
    });

    return {
        dateObj: selectedDateObj,
        ymdStr: selectedYmdStr,
        zhStr: zhDateStr
    };
}

/**
 * 計算指定日期發出的功課數量
 * @param {string} targetDateStr - YYYY-MM-DD格式的目標日期
 * @returns {number} 該日期發出的功課數量
 */
function getHomeworkIssuedCountByDate(targetDateStr) {
    if (!homeworkData || homeworkData.length === 0) {
        return 0;
    }

    // 從全域作業資料中計算該日期發出的功課數量
    const count = homeworkData.filter(item => {
        // 比對發布日期是否等於目標日期
        const issueDateStr = item.issue_date;
        return issueDateStr === targetDateStr;
    }).length;

    return count;
}

/**
 * 計算指定日期截止的功課數量
 * @param {string} targetDateStr - YYYY-MM-DD格式的目標日期
 * @returns {number} 該日期截止的功課數量
 */
function getHomeworkDueCountByDate(targetDateStr) {
    if (!homeworkData || homeworkData.length === 0) {
        return 0;
    }

    // 從全域作業資料中計算該日期截止的功課數量
    const count = homeworkData.filter(item => {
        // 比對截止日期是否等於目標日期
        const dueDateStr = item.due_date;
        return dueDateStr === targetDateStr;
    }).length;

    return count;
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
    updateStatistics();
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
 更新統計信息
 * */
function updateStatistics() {
    const issuedTodayCountElement = document.getElementById('issuedTodayCount');
    const dueTodayCountElement = document.getElementById('dueTodayCount');

    if (!issuedTodayCountElement || !dueTodayCountElement) return;

    // 使用選擇的日期
    const issueDateFilter = document.getElementById('issueDateFilter');
    const selectedDate = issueDateFilter ? issueDateFilter.value : formatDate(new Date());

    // 分別計算發布和截止的功課數量
    const issuedCount = getHomeworkIssuedCountByDate(selectedDate);
    const dueCount = getHomeworkDueCountByDate(selectedDate);

    issuedTodayCountElement.textContent = issuedCount;
    dueTodayCountElement.textContent = dueCount;
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
                <td class="deadline-cell" data-deadline="${item.due_date}">${item.due_date}</td>
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

    // 綁定下載按鈕點擊事件
    const downloadBtn = document.getElementById('downloadTableBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', async function () {
            // 顯示載入指示器
            const originalBtnText = this.innerHTML;
            this.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>正在生成圖片...';
            this.disabled = true;

            try {
                // 1. 取得選擇的日期資訊
                const selectedDateInfo = getSelectedDate();
                const targetDateStr = selectedDateInfo.ymdStr;
                const targetZhDate = selectedDateInfo.zhStr;

                // 計算選擇日期的數據
                const issuedHomeworkCount = getHomeworkIssuedCountByDate(targetDateStr);
                const dueHomeworkCount = getHomeworkDueCountByDate(targetDateStr);

                // 2. 建立高質量的MD3風格標題區域
                const headerContainer = document.createElement('div');
                headerContainer.id = 'screenshot-header-temp';
                headerContainer.style.cssText = `
                background-color: ${getComputedStyle(document.body).getPropertyValue('--md-sys-color-surface-container-highest').trim() || '#ffffff'};
                border-radius: 16px;
                margin: 24px 0 32px;
                padding: 32px;
                text-align: center;
                font-family: 'Roboto', system-ui, sans-serif;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
                transition: all 0.3s ease;
                border: 1px solid ${getComputedStyle(document.body).getPropertyValue('--md-sys-color-outline-variant').trim() || '#e0e0e0'};
                color: ${getComputedStyle(document.body).getPropertyValue('--md-sys-color-on-surface').trim() || '#000000'};
                position: relative;
                z-index: 1000;
            `;

                // 主標題
                const mainTitle = document.createElement('h2');
                mainTitle.textContent = '功課表';
                mainTitle.style.cssText = `
                margin: 0 0 8px;
                font-size: 32px;
                font-weight: 500;
                color: ${getComputedStyle(document.body).getPropertyValue('--md-sys-color-primary').trim() || '#6750a4'};
                letter-spacing: -0.01em;
                line-height: 1.2;
                font-family: 'Roboto', sans-serif;
            `;

                // 日期標題
                const dateTitle = document.createElement('h3');
                dateTitle.textContent = targetZhDate;
                dateTitle.style.cssText = `
                margin: 0 0 24px;
                font-size: 20px;
                font-weight: 400;
                color: ${getComputedStyle(document.body).getPropertyValue('--md-sys-color-on-surface-variant').trim() || '#666666'};
                opacity: 0.9;
                line-height: 1.4;
                font-family: 'Roboto', sans-serif;
            `;

                // 統計信息容器
                const statsContainer = document.createElement('div');
                statsContainer.style.cssText = `
                display: flex;
                justify-content: center;
                gap: 24px;
                margin: 32px 0;
                flex-wrap: wrap;
            `;

                // 發布統計卡片
                const issuedCard = createStatCard({
                    label: '發布功課',
                    value: `${issuedHomeworkCount} 項`,
                    icon: 'bi-journal-plus',
                    color: getComputedStyle(document.body).getPropertyValue('--md-sys-color-secondary').trim() || '#625b71'
                });

                // 截止統計卡片
                const dueCard = createStatCard({
                    label: '截止功課',
                    value: `${dueHomeworkCount} 項`,
                    icon: 'bi-clock',
                    color: getComputedStyle(document.body).getPropertyValue('--md-sys-color-warning').trim() || '#ffb74d'
                });

                statsContainer.appendChild(issuedCard);
                statsContainer.appendChild(dueCard);

                // 輔助函數：創建統計卡片
                function createStatCard({ label, value, icon, color }) {
                    const card = document.createElement('div');
                    card.style.cssText = `
                    background: ${getComputedStyle(document.body).getPropertyValue('--md-sys-color-surface-container-low').trim() || '#f5f5f5'};
                    border-radius: 12px;
                    padding: 24px;
                    min-width: 160px;
                    text-align: center;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    border: 1px solid ${getComputedStyle(document.body).getPropertyValue('--md-sys-color-outline-variant').trim() || '#e0e0e0'};
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                `;

                    const iconContainer = document.createElement('div');
                    iconContainer.style.cssText = `
                    width: 48px;
                    height: 48px;
                    background-color: ${color}20;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 16px;
                `;

                    const iconEl = document.createElement('i');
                    iconEl.className = `bi ${icon}`;
                    iconEl.style.cssText = `
                    font-size: 24px;
                    color: ${color};
                `;

                    const valueEl = document.createElement('div');
                    valueEl.textContent = value;
                    valueEl.style.cssText = `
                    font-size: 28px;
                    font-weight: 700;
                    color: ${getComputedStyle(document.body).getPropertyValue('--md-sys-color-on-surface').trim() || '#000000'};
                    margin: 8px 0;
                    line-height: 1.2;
                `;

                    const labelEl = document.createElement('div');
                    labelEl.textContent = label;
                    labelEl.style.cssText = `
                    font-size: 14px;
                    color: ${getComputedStyle(document.body).getPropertyValue('--md-sys-color-on-surface-variant').trim() || '#666666'};
                    font-weight: 500;
                    opacity: 0.8;
                `;

                    iconContainer.appendChild(iconEl);
                    card.appendChild(iconContainer);
                    card.appendChild(valueEl);
                    card.appendChild(labelEl);

                    return card;
                }

                // 分割線
                const divider = document.createElement('div');
                divider.style.cssText = `
                height: 1px;
                background: ${getComputedStyle(document.body).getPropertyValue('--md-sys-color-outline').trim() || '#cccccc'};
                margin: 32px 0;
                opacity: 0.5;
            `;

                // 表格標題
                const tableTitle = document.createElement('div');
                tableTitle.textContent = '詳細功課列表';
                tableTitle.style.cssText = `
                font-size: 20px;
                font-weight: 500;
                color: ${getComputedStyle(document.body).getPropertyValue('--md-sys-color-on-surface').trim() || '#000000'};
                margin: 32px 0 16px;
                text-align: left;
                padding-left: 12px;
                border-left: 4px solid ${getComputedStyle(document.body).getPropertyValue('--md-sys-color-primary').trim() || '#6750a4'};
                font-family: 'Roboto', sans-serif;
            `;

                // 組合標題容器
                headerContainer.appendChild(mainTitle);
                headerContainer.appendChild(dateTitle);
                headerContainer.appendChild(statsContainer);
                headerContainer.appendChild(divider);
                headerContainer.appendChild(tableTitle);

                // 3. 創建臨時容器用於截圖
                const tempContainer = document.createElement('div');
                tempContainer.id = 'temp-screenshot-container';
                tempContainer.style.cssText = `
                position: fixed;
                top: -9999px;
                left: -9999px;
                width: 1000px;
                padding: 20px;
                background-color: ${getComputedStyle(document.body).getPropertyValue('--md-sys-color-surface').trim() || '#ffffff'};
                z-index: 10000;
                opacity: 1;
            `;

                // 複製表格到臨時容器
                const table = document.querySelector('.homework-table');
                if (!table) {
                    throw new Error('找不到功課表格');
                }

                const clonedTable = table.cloneNode(true);

                // 優化表格樣式
                clonedTable.style.cssText = `
                border-radius: 12px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                margin: 0 0 32px 0;
                border: 1px solid ${getComputedStyle(document.body).getPropertyValue('--md-sys-color-outline-variant').trim() || '#e0e0e0'};
                background-color: ${getComputedStyle(document.body).getPropertyValue('--md-sys-color-surface').trim() || '#ffffff'};
                width: 100%;
                border-collapse: collapse;
                font-family: 'Roboto', sans-serif;
            `;

                // 優化表格頭部
                const tableHeaders = clonedTable.querySelectorAll('th');
                tableHeaders.forEach(th => {
                    th.style.cssText = `
                    background-color: ${getComputedStyle(document.body).getPropertyValue('--md-sys-color-surface-container-high').trim() || '#f0f0f0'} !important;
                    color: ${getComputedStyle(document.body).getPropertyValue('--md-sys-color-on-surface').trim() || '#000000'} !important;
                    font-weight: 600 !important;
                    padding: 16px !important;
                    border-bottom: 2px solid ${getComputedStyle(document.body).getPropertyValue('--md-sys-color-outline').trim() || '#cccccc'} !important;
                    font-family: 'Roboto', sans-serif;
                `;
                });

                // 優化表格內容
                const tableCells = clonedTable.querySelectorAll('td');
                tableCells.forEach(td => {
                    td.style.cssText = `
                    padding: 14px 16px !important;
                    border-bottom: 1px solid ${getComputedStyle(document.body).getPropertyValue('--md-sys-color-outline-variant').trim() || '#e0e0e0'} !important;
                    color: ${getComputedStyle(document.body).getPropertyValue('--md-sys-color-on-surface').trim() || '#000000'} !important;
                    font-family: 'Roboto', sans-serif;
                `;
                });

                // 確保所有圖標都能顯示
                const icons = clonedTable.querySelectorAll('i');
                icons.forEach(icon => {
                    icon.style.cssText = `
                    display: inline-block !important;
                    font-family: 'bootstrap-icons' !important;
                    font-style: normal !important;
                `;
                });

                // 將標題和表格添加到臨時容器
                tempContainer.appendChild(headerContainer);
                tempContainer.appendChild(clonedTable);
                document.body.appendChild(tempContainer);

                // 4. 等待DOM更新
                await new Promise(resolve => setTimeout(resolve, 100));

                // 5. 執行高質量截圖
                const canvas = await html2canvas(tempContainer, {
                    scale: 6,
                    useCORS: true,
                    backgroundColor: getComputedStyle(document.body).getPropertyValue('--md-sys-color-surface').trim() || '#ffffff',
                    logging: true,
                    allowTaint: true,
                    removeContainer: true,
                    foreignObjectRendering: false, // 關閉foreignObjectRendering
                    imageTimeout: 0,
                    ignoreElements: (element) => {
                        return false;
                    },
                    onclone: null
                });

                // 6. 移除臨時容器
                if (tempContainer.parentNode) {
                    tempContainer.parentNode.removeChild(tempContainer);
                }

                // 檢查canvas是否為空
                if (canvas.width === 0 || canvas.height === 0) {
                    throw new Error('生成的圖片尺寸為0');
                }

                // 7. 創建高質量圖片並下載
                const link = document.createElement('a');
                const fileName = `功課表_${targetDateStr.replace(/-/g, '')}.png`;
                link.download = fileName;

                // 轉換為數據URL
                link.href = canvas.toDataURL('image/png', 1.0);

                // 模擬點擊下載
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                // 8. 顯示下載成功提示
                showDownloadToast(fileName, canvas.width, canvas.height);

            } catch (error) {
                console.error('功課表截圖失敗：', error);
                showErrorToast('生成圖片時發生錯誤：' + error.message);

                // 清理可能殘留的臨時元素
                const tempContainer = document.getElementById('temp-screenshot-container');
                if (tempContainer && tempContainer.parentNode) {
                    tempContainer.parentNode.removeChild(tempContainer);
                }
            } finally {
                // 恢復按鈕狀態
                this.innerHTML = originalBtnText;
                this.disabled = false;
            }
        });
    } else {
        console.warn('未找到下載按鈕（ID: downloadTableBtn），請檢查頁面元素');
    }

    // 確保載入Bootstrap Icons字體
    function ensureFontsLoaded() {
        if (!document.querySelector('link[href*="bootstrap-icons"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css';
            document.head.appendChild(link);
        }
    }

    // 確保Roboto字體載入
    function ensureRobotoFont() {
        if (!document.querySelector('link[href*="fonts.googleapis.com"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap';
            document.head.appendChild(link);
        }
    }

    // 優化下載成功提示函數
    function showDownloadToast(fileName, width, height) {
        const toast = document.createElement('div');
        toast.id = 'download-success-toast';
        toast.innerHTML = `
        <div style="
            position: fixed;
            top: 24px;
            right: 24px;
            background: ${getComputedStyle(document.body).getPropertyValue('--md-sys-color-surface-container-high').trim() || '#f5f5f5'};
            color: ${getComputedStyle(document.body).getPropertyValue('--md-sys-color-on-surface').trim() || '#000000'};
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1050;
            display: flex;
            align-items: center;
            gap: 16px;
            max-width: 480px;
            animation: slideIn 0.4s ease-out;
            border: 1px solid ${getComputedStyle(document.body).getPropertyValue('--md-sys-color-outline-variant').trim() || '#e0e0e0'};
            font-family: 'Roboto', sans-serif;
        ">
            <div style="
                width: 48px;
                height: 48px;
                background: ${getComputedStyle(document.body).getPropertyValue('--md-sys-color-primary').trim() || '#6750a4'};
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            ">
                <i class="bi bi-check-lg" style="color: white; font-size: 20px;"></i>
            </div>
            <div style="flex: 1;">
                <div style="font-size: 16px; font-weight: 600; margin-bottom: 4px; color: ${getComputedStyle(document.body).getPropertyValue('--md-sys-color-on-surface').trim() || '#000000'};">
                    圖片生成成功
                </div>
                <div style="font-size: 14px; color: ${getComputedStyle(document.body).getPropertyValue('--md-sys-color-on-surface-variant').trim() || '#666666'}; margin-bottom: 8px; opacity: 0.9;">
                    檔案：${fileName}
                </div>
                <div style="font-size: 12px; color: ${getComputedStyle(document.body).getPropertyValue('--md-sys-color-on-surface-variant').trim() || '#666666'}; opacity: 0.7;">
                    解析度：${width} × ${height} 像素
                </div>
            </div>
        </div>
    `;

        // 移除現有的提示
        const existingToast = document.getElementById('download-success-toast');
        if (existingToast) {
            existingToast.remove();
        }

        document.body.appendChild(toast);

        // 自動移除提示
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideOut 0.4s ease-in';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 400);
            }
        }, 3000);
    }

    // 優化錯誤提示函數
    function showErrorToast(message) {
        const toast = document.createElement('div');
        toast.id = 'download-error-toast';
        toast.innerHTML = `
        <div style="
            position: fixed;
            top: 24px;
            right: 24px;
            background: #f8d7da;
            color: #721c24;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1050;
            display: flex;
            align-items: center;
            gap: 16px;
            max-width: 480px;
            animation: slideIn 0.4s ease-out;
            border: 1px solid #f5c6cb;
            font-family: 'Roboto', sans-serif;
        ">
            <div style="
                width: 48px;
                height: 48px;
                background-color: #dc3545;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            ">
                <i class="bi bi-exclamation-triangle-fill" style="color: white; font-size: 20px;"></i>
            </div>
            <div style="flex: 1;">
                <div style="font-size: 16px; font-weight: 600; margin-bottom: 4px;">
                    操作失敗
                </div>
                <div style="font-size: 14px; opacity: 0.9;">
                    ${message}
                </div>
            </div>
        </div>
    `;

        // 移除現有的提示
        const existingToast = document.getElementById('download-error-toast');
        if (existingToast) {
            existingToast.remove();
        }

        document.body.appendChild(toast);

        // 自動移除提示
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideOut 0.4s ease-in';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 400);
            }
        }, 5000);
    }

    // 添加動畫樣式
    const style = document.createElement('style');
    style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%) translateY(-20px);
            opacity: 0;
        }
        to {
            transform: translateX(0) translateY(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0) translateY(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%) translateY(-20px);
            opacity: 0;
        }
    }
    
    /* 確保截圖時文字清晰 */
    #screenshot-header-temp * {
        -webkit-font-smoothing: antialiased !important;
        -moz-osx-font-smoothing: grayscale !important;
        text-rendering: optimizeLegibility !important;
        font-smooth: always !important;
    }
    
    /* 提高表格在截圖中的質量 */
    #temp-screenshot-container table {
        font-smooth: always !important;
        image-rendering: crisp-edges;
    }
    
    #temp-screenshot-container th,
    #temp-screenshot-container td {
        font-weight: 500 !important;
        font-family: 'Roboto', sans-serif !important;
    }
`;
    document.head.appendChild(style);

    // 在頁面載入時確保字體載入
    document.addEventListener('DOMContentLoaded', function () {
        ensureFontsLoaded();
        ensureRobotoFont();
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
});