(function () {
    // 創建提示層元素
    function createBlocker() {
        const blocker = document.createElement('div');
        blocker.className = 'small-screen-overlay';
        blocker.innerHTML = `
            <i class="bi bi-tablet"></i>
            <h3>請使用大屏設備訪問</h3>
            <p>建議使用平板電腦或電腦獲得更佳體驗</p>
        `;
        document.body.insertBefore(blocker, document.body.firstChild);
        return blocker;
    }

    // 檢測邏輯
    function checkScreenSize() {
        let blocker = document.querySelector('.small-screen-overlay');
        if (!blocker) blocker = createBlocker();

        const isSmallScreen = window.innerWidth < 768;
        blocker.style.display = isSmallScreen ? 'flex' : 'none';

        // 隱藏/顯示主內容
        const selectors = [
            '.lang-switch',
            'h1',
            '.status-bar',
            '.progress-container',
            '.canvas-container',
            '.button-container',
            '.container',
            '.projects',
            '.navbar',
            '.card',
            '.homework-table-wrapper'
        ];

        selectors.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.style.display = isSmallScreen ? 'none' : '';
            }
        });
    }

    // 綁定事件
    document.addEventListener('DOMContentLoaded', checkScreenSize);
    window.addEventListener('resize', checkScreenSize);
    window.addEventListener('orientationchange', checkScreenSize);
})();