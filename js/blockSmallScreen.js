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

        // 更嚴格的檢測條件：寬度小於767或高度小於500（考慮橫屏情況）
        const isSmallScreen = window.innerWidth < 767 || window.innerHeight < 500;

        if (isSmallScreen) {
            blocker.style.display = 'flex';
            document.body.classList.add('blocked'); // 添加阻止滾動的類
        } else {
            blocker.style.display = 'none';
            document.body.classList.remove('blocked'); // 移除阻止滾動的類
        }
    }

    // 綁定事件
    document.addEventListener('DOMContentLoaded', checkScreenSize);
    window.addEventListener('resize', checkScreenSize);
    window.addEventListener('orientationchange', function () {
        // 方向變化時延遲檢查，確保尺寸已更新
        setTimeout(checkScreenSize, 100);
    });

    // 初始檢查
    checkScreenSize();
})();