// 动态创建小屏提示层（无需手动加HTML）
(function () {
    // 创建提示层元素
    function createBlocker() {
        const blocker = document.createElement('div');
        blocker.className = 'small-screen-blocker';
        blocker.innerHTML = `
      <div class="icon bi bi-tablet-landscape"></div>
      <h2>请使用大屏设备访问</h2>
      <p>建议使用平板、电脑等大屏设备打开此页面，以获得最佳体验</p>
    `;
        document.body.insertBefore(blocker, document.body.firstChild);
        return blocker;
    }

    // 检测逻辑
    function checkScreenSize() {
        let blocker = document.querySelector('.small-screen-blocker');
        if (!blocker) blocker = createBlocker();

        const isSmallScreen = window.innerWidth < 768;
        blocker.style.display = isSmallScreen ? 'flex' : 'none';

        // 隐藏/显示主内容
        const pageContents = document.body.children;
        for (let el of pageContents) {
            if (!el.classList.contains('small-screen-blocker') && !el.classList.contains('orientation-overlay')) {
                el.style.display = isSmallScreen ? 'none' : '';
            }
        }
    }

    // 绑定事件
    document.addEventListener('DOMContentLoaded', checkScreenSize);
    window.addEventListener('resize', checkScreenSize);
    window.addEventListener('orientationchange', checkScreenSize);
})();